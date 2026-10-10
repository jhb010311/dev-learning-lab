Lab.register({
  id: 'paging', nav: 'Offset and keyset pagination', cat: 'Database', mode: 'step',
  title: 'Why later pages get slower',
  intro: 'A list of posts is shown page by page, newest first. The OFFSET method reads and discards all the rows of the earlier pages before it reaches the page you want. The keyset (cursor) method uses the index to go straight to "right after the last post you saw". Increase the page number and compare the number of rows read.',
  terms: ['Offset-based pagination and keyset (cursor-based) pagination', 'Index', 'B-tree index'], ranks: ['tuning', 'index'],
  controls: [
    { id: 'how', label: 'Pagination method', type: 'select', value: 'offset', options: [['offset', 'OFFSET (page number)'], ['keyset', 'Keyset (based on the id of the last post seen)']] },
    { id: 'page', label: 'Page to view', type: 'select', value: '1000', options: [['1', 'Page 1'], ['10', 'Page 10'], ['100', 'Page 100'], ['1000', 'Page 1,000'], ['10000', 'Page 10,000']] },
    { id: 'size', label: 'Posts per page', type: 'select', value: '20', options: [['10', '10 posts'], ['20', '20 posts'], ['50', '50 posts']] },
    { id: 'ins', label: 'One new post is added while moving to the next page', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', d: 'OFFSET on page 1,000. It reads 20,000 rows and uses only 20.', v: { how: 'offset', page: '1000', size: '20', ins: false } },
    { t: 'The same position with keyset', d: 'It reads only the 20 rows it needs.', v: { how: 'keyset', page: '1000', size: '20', ins: false } },
    { t: 'OFFSET, page 1', d: 'Early pages are fast with OFFSET too.', v: { how: 'offset', page: '1', size: '20', ins: false } },
    { t: 'OFFSET, page 10,000', d: 'The number of discarded rows becomes 200,000.', v: { how: 'offset', page: '10000', size: '20', ins: false } },
    { t: 'A new post is added in between (OFFSET)', d: 'A post you just saw appears again on the next page.', v: { how: 'offset', page: '10', size: '20', ins: true } },
    { t: 'A new post is added in between (keyset)', d: 'The reference is the post id, so nothing shifts.', v: { how: 'keyset', page: '10', size: '20', ins: true } },
  ],
  num: function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  code: function (c) {
    var p = +c.page, s = +c.size, last = 1000000 - (p - 1) * s + 1;
    if (c.how === 'offset') return '-- Page ' + this.num(p) + ' (id descending = newest first)\nSELECT id, title, created_at\n  FROM post\n ORDER BY id DESC\n LIMIT ' + s + ' OFFSET ' + (p - 1) * s + ';';
    return '-- The id of the last post seen on the previous page = ' + last + '\nSELECT id, title, created_at\n  FROM post\n' + (p > 1 ? ' WHERE id < ' + last + '             -- starting with the posts older than that one\n' : '') + ' ORDER BY id DESC\n LIMIT ' + s + ';';
  },
  label: function (c) { return (c.how === 'offset' ? 'OFFSET' : 'Keyset') + ' · Page ' + this.num(+c.page) + ' · ' + c.size + ' per page' + (c.ins ? ' · new post added' : ''); },
  columns: ['Rows read', 'Rows discarded', 'Rows returned', 'When a new post is added in between'],
  simulate: function (c) {
    var p = +c.page, s = +c.size, off = (p - 1) * s, num = this.num, ev = [], sum = [], N = 1000000, firstId = N - off, effect = 'Not applicable';
    function push(x, k, snap) { ev.push({ s: x, k: k, snap: snap }); }
    var read, skip;
    if (c.how === 'offset') {
      read = off + s; skip = off;
      push('The post table has 1,000,000 posts, and a larger id means a newer post. Page ' + num(p) + ' is requested with OFFSET ' + num(off) + '.', '', { read: 0, skip: 0, out: 0 });
      push('The database cannot know in advance where the row after the first ' + num(off) + ' rows is. It starts from the newest post and counts one by one along the index while it reads. It reads ' + num(off) + ' rows and throws them away.', off > 1000 ? 'bad' : '', { read: off, skip: off, out: 0 });
      push('Then it reads the next ' + s + ' rows and returns them as the result. The ids run from ' + num(firstId) + ' down to ' + num(firstId - s + 1) + '.', '', { read: read, skip: skip, out: s });
      sum.push('To return ' + s + ' rows, it read ' + num(read) + ' rows and discarded ' + num(skip) + '. The number of discarded rows grows in proportion to the page number. Every time you open a later page, it effectively reads all the earlier rows again.');
    } else {
      read = s; skip = 0;
      push('The post table has 1,000,000 posts, and a larger id means a newer post. The id of the last post seen on the previous page is remembered and used as the condition of the request.', '', { read: 0, skip: 0, out: 0 });
      push(p > 1 ? 'The database goes straight to the first position where id < ' + num(firstId + 1) + ' in the id index (a B-tree), in a few steps. It does not read a single one of the earlier rows.' : 'The first page has no condition and reads from the newest post.', 'good', { read: 0, skip: 0, out: 0 });
      push('From that position it reads ' + s + ' rows and returns them. The ids run from ' + num(firstId) + ' down to ' + num(firstId - s + 1) + '.', 'good', { read: s, skip: 0, out: s });
      sum.push('Whatever the page number, it reads only ' + s + ' rows. But you cannot jump straight to an arbitrary page such as "page 1,000". You can only move to the next or previous page. It is the method that suits infinite scroll or a "Load more" button.');
    }
    if (c.ins) {
      if (c.how === 'offset') { effect = '1 post shown twice'; push('A new post was added before the user clicked the next page. The new post goes to the front of the newest-first list, and all the existing posts shift back by one place.', '', { read: read, skip: skip, out: s, shift: 1 }); push('The next page is requested with OFFSET ' + num(off + s) + '. Because everything shifted by one place, the last post of the page you just saw (id ' + num(firstId - s + 1) + ') appears again as the first line of the next page. Conversely, if a post is deleted, one post is skipped.', 'bad', { read: read, skip: skip, out: s, dup: firstId - s + 1 }); sum.push('OFFSET is based on a position ("the Nth from the front"), so if data is added or deleted in between, the same post is seen twice or a post is missed.'); }
      else { effect = 'No effect'; push('A new post was added before the user clicked the next page.', '', { read: read, skip: 0, out: s, shift: 1 }); push('The next page is requested with the condition "id < ' + num(firstId - s + 1) + '". The reference is the id of a post, not a position, so even if a new post is inserted at the front, the posts to read next stay the same. There is no duplicate and nothing is missed.', 'good', { read: read, skip: 0, out: s }); sum.push('Keyset is based on a value ("after this post"), so the list does not shift even if the data changes in between.'); }
    }
    return { events: ev, summary: sum, firstId: firstId, row: [num(read), num(skip), String(s), effect] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, num = this.num, last = shown[shown.length - 1], s = last ? last.snap : { read: 0, skip: 0, out: 0 }, size = +c.size, mx = Math.max(1, (+c.page - 1) * size + size);
    H.counters(v, [[num(s.read), 'Rows read'], [num(s.skip), 'Rows read and discarded'], [num(s.out), 'Rows returned']]);
    var ln = H.lanes(v);
    H.lane(ln, 'Discarded rows', 'Rows: ' + num(s.skip), s.skip ? 'bad' : 'none', s.skip ? s.skip / mx : undefined);
    H.lane(ln, 'Used rows', 'Rows: ' + num(s.out), s.out ? 'good' : 'none', s.out ? Math.max(0.01, s.out / mx) : undefined);
    if (s.out) H.text(v, 'Posts on this page: id ' + num(sim.firstId) + ' to ' + num(sim.firstId - size + 1) + (s.dup ? ' · the post with id ' + num(s.dup) + ' appears again as the first line of the next page' : ''));
    if (s.shift) H.text(v, 'A new post (id 1,000,001) was added at the front of the list');
  },
  assume: 'It assumes that 1,000,000 posts are sorted by id and that id has an index (the primary key). That OFFSET reads and discards the earlier rows is behavior that both the MySQL and PostgreSQL documentation describe. If the sort key is not id but a column whose values can repeat, such as the creation time, the keyset condition must also include a column whose values do not repeat, as in (creation time, id). The numbers of rows are calculated values and were not measured on a real database. The content of the results was checked on a real SQL engine (SQLite). Both methods returned the same posts for the same page; after one new post was inserted, the first line of the next page with OFFSET was the last post of the previous page again, and with keyset the next post came.',
});
