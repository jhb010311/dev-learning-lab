Lab.register({
  id: 'bufferpool', nav: 'Buffer pool and pages', cat: 'Database', mode: 'step',
  title: 'Why does reading one row read a whole 16KB page?',
  intro: 'InnoDB reads and writes data on disk in blocks called pages (16KB by default), not row by row. A page that has been read is kept in memory in the buffer pool, and later reads come from memory instead of going to disk. When a row is changed, only the page in memory is changed, and it is written to disk later.',
  terms: ['Buffer pool', 'Page (InnoDB)', 'Dirty pages and flushing', 'Eviction policy', 'Undo log and redo log'],
  controls: [
    { id: 'seq', label: 'Order of the rows to query', type: 'select', value: 'same', options: [['same', 'Row 1 → row 2 → row 1 (all on the same page)'], ['spread', 'Row 1 → 5 → 9 → 13 → 1 (the four pages in turn)'], ['hot', 'Row 1 → 5 → 1 → 9 → 13 → 1 (row 1 often)']] },
    { id: 'size', label: 'Number of slots in the buffer pool', type: 'range', min: 2, max: 4, value: 3, step: 1, fmt: function (v) { return v + ' slots'; }, show: function (c) { return c.seq !== 'same'; }, hint: 'A real buffer pool has thousands of slots or more. It is kept small here so you can see what happens when it is full.' },
    { id: 'upd', label: 'After the first query, change row 1 and commit', type: 'check', value: true },
  ],
  // When only one page is read, the number of slots does not affect the result, so it is left at the default value
  fix: function (c) { return c.seq === 'same' && +c.size !== 3 ? { size: 3 } : null; },
  presets: [
    { t: 'Default settings', q: 'How many disk reads happen when you query row 1, row 2, row 1 with 3 buffer pool slots, then change row 1 and commit?', d: 'Row 2 is read for the first time, but the disk is not accessed. A commit does not write to the data file right away.', v: { seq: 'same', size: 3, upd: true } },
    { t: 'Four pages in three slots', q: 'What if you query rows 1 → 5 → 9 → 13 → 1 and do not change row 1?', d: 'There is not enough room, so the page of row 1 is evicted, and the disk is accessed again when that page is read again.', v: { seq: 'spread', size: 3, upd: false } },
    { t: 'With plenty of slots', q: 'What if you query the four pages in turn, increase the buffer pool to 4 slots, and do not change row 1?', d: 'Every page that was read stays, so the last query is answered from memory.', v: { seq: 'spread', size: 4, upd: false } },
    { t: 'Frequently read pages stay', q: 'What if you query row 1 often (1 → 5 → 1 → 9 → 13 → 1) and do not change row 1?', d: 'The page that is evicted is the one that has gone unused the longest.', v: { seq: 'hot', size: 3, upd: false } },
    { t: 'When a changed page is evicted', q: 'What if you change row 1 and commit, then query rows 1 → 5 → 9 → 13 → 1?', d: 'It must be written to disk first, and only then can it be removed from the buffer pool.', v: { seq: 'spread', size: 3, upd: true } },
    { t: 'With only two slots', q: 'What if you query row 1 often, reduce the buffer pool to 2 slots, and do not change row 1?', d: 'Almost every query goes to disk.', v: { seq: 'hot', size: 2, upd: false } },
  ],
  ids: function (c) { return { same: [1, 2, 1], spread: [1, 5, 9, 13, 1], hot: [1, 5, 1, 9, 13, 1] }[c.seq]; },
  code: function (c) {
    var ids = this.ids(c), s = '-- item table: 16 rows. One row is about 3.5KB, so 4 rows fit in one 16KB page\n--   Page A: rows 1-4    Page B: rows 5-8\n--   Page C: rows 9-12   Page D: rows 13-16\n-- At the start, the buffer pool holds no pages of this table\n';
    ids.forEach(function (id, i) { s += '\nSELECT name FROM item WHERE id = ' + id + ';'; if (i === 0 && c.upd) s += "\n\nSTART TRANSACTION;\nUPDATE item SET name = 'changed' WHERE id = 1;\nCOMMIT;\n"; });
    return s;
  },
  label: function (c) { return { same: '1 → 2 → 1', spread: '1 → 5 → 9 → 13 → 1', hot: '1 → 5 → 1 → 9 → 13 → 1' }[c.seq] + (c.seq === 'same' ? '' : ' · ' + c.size + ' slots') + (c.upd ? ' · row 1 modified' : ''); },
  columns: ['Disk reads', 'Lookups that did not go to disk', 'Evicted pages', 'When the modified page was written to the data file'],
  simulate: function (c) {
    var N = c.seq === 'same' ? 3 : +c.size, ids = this.ids(c), ev = [], sum = [], L = ['A', 'B', 'C', 'D'], tick = 0, trace = '', evicted = [], when = c.upd ? '' : 'Not modified', seenRow = {}, wasOut = {}, dirtyOut = false;
    var st = { slots: [], reads: 0, hits: 0, writes: 0, cur: '', at: -1, act: '', diskNew: false };
    for (var i = 0; i < N; i++) st.slots.push(null);
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function pageOf(id) { return L[Math.floor((id - 1) / 4)]; }
    function find(p) { for (var j = 0; j < N; j++) if (st.slots[j] && st.slots[j].p === p) return j; return -1; }
    function others(id) { var b = Math.floor((id - 1) / 4) * 4, r = []; for (var x = b + 1; x <= b + 4; x++) if (x !== id) r.push(x); return r.join(', '); }
    st.act = 'start';
    push('The 16 rows of the item table are stored in the data file on disk in four pages (A, B, C, and D). A page is 16KB and holds 4 rows. The buffer pool (memory) does not hold any page of this table yet.', '');
    ids.forEach(function (id, n) {
      var p = pageOf(id), j = find(p), head = 'SELECT … WHERE id = ' + id + ': row ' + id + ' is in page ' + p + '. ';
      if (j >= 0) {
        st.hits++; trace += 'H'; st.slots[j].last = ++tick; st.cur = p; st.at = j; st.act = 'hit';
        push(head + 'Page ' + p + ' is already in the buffer pool, so it is read directly from memory without going to disk.' + (!seenRow[id] ? ' This is the first time row ' + id + ' is read, but it was loaded along with the page when another row on the same page was read.' : '') + (st.slots[j].dirty && id === 1 ? ' The modified value changed is read. The data file on disk still has the old value item1.' : ''), 'good');
      } else {
        trace += 'M';
        j = st.slots.indexOf(null);
        if (j < 0) {
          for (var k = 0; k < N; k++) if (j < 0 || st.slots[k].last < st.slots[j].last) j = k;
          var out = st.slots[j]; evicted.push(out.p); wasOut[out.p] = true; st.cur = out.p; st.at = j;
          if (out.dirty) { st.writes++; st.diskNew = true; when = 'Just before eviction'; dirtyOut = true; st.act = 'evictw'; st.slots[j] = null;
            push(head + 'Page ' + p + ' has to be read from disk, but the buffer pool has no free slot. The page that has gone unused the longest, page ' + out.p + ', must be evicted. But page ' + out.p + ' is a dirty page, which holds changes that are not on disk yet. If it were simply discarded, the changes would be lost, so it is written to the data file first and then evicted.', 'bad');
          } else { st.act = 'evict'; st.slots[j] = null;
            push(head + 'Page ' + p + ' has to be read from disk, but the buffer pool has no free slot. The page that has gone unused the longest, page ' + out.p + ', is evicted. It has the same content as on disk, so it can simply be removed from memory.', '');
          }
          head = '';
        }
        st.reads++; st.slots[j] = { p: p, dirty: false, last: ++tick }; st.cur = p; st.at = j; st.act = 'miss';
        push((head || 'Next, ') + (head ? 'Page ' + p + ' is not in the buffer pool, so ' : '') + 'the whole page ' + p + ' (16KB) is read from disk and placed in a free slot. Rows ' + others(id) + ' on the same page are loaded into memory with it.' + (wasOut[p] ? ' Page ' + p + ' was read earlier, but it was evicted, so it has to be read from disk again.' : ''), wasOut[p] ? 'bad' : '');
      }
      seenRow[id] = true;
      if (n === 0 && c.upd) {
        j = find('A'); st.slots[j].dirty = true; st.slots[j].last = ++tick; st.cur = 'A'; st.at = j; st.act = 'dirty';
        push("UPDATE item SET name = 'changed' WHERE id = 1: Row 1 is modified in page A, which is in the buffer pool. The disk is neither read nor written. A page whose content in memory now differs from the disk is called a dirty page.", '');
        st.act = 'commit';
        push('COMMIT: The record of what was changed (the redo log) is written to disk, and the commit is complete (with the default settings of MySQL 8, the binary log used for replication is also written at this point). Page A stays in the buffer pool in the dirty state, and it has not been written to the data file. Writing to the data file is postponed until later.', '');
      }
    });
    var dj = -1; for (var m = 0; m < N; m++) if (st.slots[m] && st.slots[m].dirty) dj = m;
    if (dj >= 0) {
      st.slots[dj].dirty = false; st.writes++; st.diskNew = true; when = 'Later, after the commit (in the background)'; st.cur = 'A'; st.at = dj; st.act = 'flush';
      push('A little later: a background thread writes dirty page A to the data file. The page stays in the buffer pool, and only its dirty mark is cleared. InnoDB decides when to write, and the commit does not wait for it.', 'good');
    }
    if (c.seq === 'same') sum.push('InnoDB reads from disk in units of pages, not rows. Reading row 1 also loads rows 2, 3, and 4 of the same page into memory, so reading rows that are stored close together does not go back to disk.');
    else if (evicted.length) sum.push('When the buffer pool is full, the page that has gone unused the longest is evicted first. Reading an evicted page again requires another trip to disk.' + (c.seq === 'hot' && find('A') >= 0 && evicted.indexOf('A') < 0 ? ' Page A, which was read often, stayed to the end, and pages that had not been used in the meantime were evicted.' : ' If the buffer pool is too small for the data, this keeps happening and everything slows down.'));
    else sum.push('With enough slots, a page that has been read stays in memory. That is why a database server gives a large part of its memory to the buffer pool.');
    if (c.upd) sum.push(dirtyOut ? 'A dirty page can be evicted only after it is written to disk. In practice, background threads write pages a little at a time in advance so that this kind of urgent write rarely happens.' : 'Even when a row is changed, only the page in memory changes, and the data file is written later. It is the redo log that keeps committed changes from being lost if the server goes down in the meantime (see the "Undo and redo logs" lab).');
    return { events: ev, summary: sum, trace: trace, row: [String(st.reads), String(st.hits), evicted.length ? evicted.map(function (x) { return 'Page ' + x; }).join(', ') : 'None', when] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, R = { A: 'Rows 1-4', B: 'Rows 5-8', C: 'Rows 9-12', D: 'Rows 13-16' };
    if (!s) { H.text(v, 'Click Run to go one step at a time.'); return; }
    var oldest = -1; if (s.slots.indexOf(null) < 0) s.slots.forEach(function (x, j) { if (oldest < 0 || x.last < s.slots[oldest].last) oldest = j; });
    H.table(v, ['Slot', 'Page loaded', 'Rows held', 'State'], s.slots.map(function (x, j) { return { cells: ['Slot ' + (j + 1), x ? { v: 'Page ' + x.p, cls: s.at === j && s.act === 'hit' ? 'good' : s.at === j ? 'hot' : '' } : 'Empty', x ? R[x.p] : '-', x ? { v: (x.dirty ? 'Dirty (differs from disk)' : 'Same as disk') + (j === oldest ? ' · Unused the longest' : ''), cls: x.dirty ? 'hot' : '' } : '-'] }; }), 'Buffer pool (memory)');
  },
  // Diagram: on the left, the slots of the buffer pool (memory). On the right, the four pages in the data file on disk. Arrows appear when a page is read or written, and a dirty page is shown in yellow.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], N = c.seq === 'same' ? 3 : +c.size, s = last ? last.snap : null, L = ['A', 'B', 'C', 'D'], R = { A: 'Rows 1-4', B: 'Rows 5-8', C: 'Rows 9-12', D: 'Rows 13-16' }, j;
    if (!s) { s = { slots: [], reads: 0, hits: 0, writes: 0, cur: '', at: -1, act: '', diskNew: false }; for (j = 0; j < N; j++) s.slots.push(null); }
    var oldest = -1; if (s.slots.indexOf(null) < 0) s.slots.forEach(function (x, k) { if (oldest < 0 || x.last < s.slots[oldest].last) oldest = k; });
    P.size(680, 316);
    P.region('bp', 16, 12, 316, 236, 'Buffer pool (memory)');
    for (j = 0; j < N; j++) {
      var x = s.slots[j], on = s.at === j;
      P.box('s' + j, 30, 44 + j * 50, 288, 42, x ? { cls: (x.dirty ? 'hot' : on && s.act === 'hit' ? 'good' : 'wait') + (on ? ' now' : ''), title: 'Page ' + x.p + ' (' + R[x.p] + ')', sub: (x.dirty ? 'Dirty' : 'Same as disk') + (j === oldest ? ' · Unused longest' : '') } : { cls: 'ghost' + (on ? ' now' : ''), title: 'Empty slot', sub: on && s.act.indexOf('evict') === 0 ? 'Page ' + s.cur + ' evicted' : ' ' });
    }
    P.region('dk', 380, 12, 284, 236, 'Data file on disk');
    L.forEach(function (p, k) { P.box('d' + p, 394, 44 + k * 50, 256, 42, { cls: 'plain' + (s.cur === p && (s.act === 'miss' || s.act === 'flush' || s.act === 'evictw') ? ' now' : ''), title: 'Page ' + p, right: R[p], sub: p === 'A' ? 'Row 1 name = ' + (s.diskNew ? 'changed' : 'item1') : '16KB' }); });
    if (s.act === 'miss') P.arrow('io', 'd' + s.cur + ':l', 's' + s.at + ':r', { cls: 'hot', label: 'Read' });
    if (s.act === 'flush' || s.act === 'evictw') P.arrow('io', 's' + s.at + ':r', 'd' + s.cur + ':l', { cls: 'good', label: 'Write' });
    P.box('c1', 16, 262, 210, 38, { cls: s.act === 'miss' ? 'hot' : 'plain', title: 'Disk reads', right: String(s.reads) });
    P.box('c2', 235, 262, 210, 38, { cls: s.act === 'hit' ? 'good' : 'plain', title: 'Reads without disk', right: String(s.hits) });
    P.box('c3', 454, 262, 210, 38, { cls: s.act === 'flush' || s.act === 'evictw' ? 'good' : 'plain', title: 'Data file writes', right: String(s.writes) });
    P.note('On the left is the buffer pool in memory, and on the right is the data file on disk. A blue slot is a page whose content is the same as on disk, and a yellow slot is a dirty page that was changed but has not been written to disk yet. A real buffer pool has thousands of slots or more (the MySQL used for the check had 8192), and the way it chooses the page to evict is more sophisticated. The number of slots and the order in this diagram are a model to show the concept.');
  },
  assume: 'This is a conceptual model built from a buffer pool with only 2 to 4 slots and the simple rule "evict the page that has gone unused the longest". The real InnoDB uses a variation of LRU that divides the list into a new sublist and an old sublist and inserts a newly read page into the middle of the list, and dirty pages are written in advance by the background page cleaner threads, which scan the tail end of the list (MySQL 8.4 Reference Manual, 17.5.1 Buffer Pool and 17.8.3.5 Configuring Buffer Pool Flushing). A real query also reads the upper pages of the index in addition to the page that holds the row. The number of slots and the order shown on screen are not the same as in a real system. What was actually checked is as follows (MySQL 8.4.11 in our test run). The page size was 16384 bytes, and the buffer pool of 134217728 bytes held 8192 pages. I created a table of 16 rows with about 3.5KB per row and confirmed that each leaf page held 4 rows. Then I ran the six combinations in which nothing is evicted (two same-page orders and four cases with 4 slots) in the same order as on the screen, and compared, for each query, whether the data file of that table was read. File reads and Innodb_buffer_pool_reads increased only on a page read for the first time (3 for the first query, because it also reads the upper pages of the index, and then 1 for each new page), and were 0 when another row of an already loaded page, or the same row, was read. Right after UPDATE and COMMIT there were 0 file reads and writes and 1 dirty page, and the data file was written later (in some cases it was written automatically after about 5 seconds, and in another case it had still not been written after 20 seconds, so writing was forced for that table only). The behavior when the buffer pool is full was checked by inserting tens of MB into another table. The free pages of the buffer pool dropped to around 20, and the 24 pages of the six tables that had not been touched in the meantime had all disappeared from the buffer pool and were read from disk when read again, while the 4 pages of the table that kept being read stayed. The eight combinations in which pages are evicted because of too few slots could not be run as they are, since the number of slots of the real buffer pool cannot be changed, so only the reads before eviction were checked. The order in which the page that has gone unused the longest is evicted follows the description in section 17.5.1 of the documentation. That a dirty page can be evicted only after it is written to disk is known as InnoDB behavior, but this time it was not directly confirmed, either by execution or by a sentence in the documentation. Because the server is shared with other people, the global status values may include activity from other sessions.',
});
