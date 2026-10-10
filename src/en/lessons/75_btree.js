Lab.register({
  id: 'btree', nav: 'Binary search and B-trees', cat: 'Data structures', mode: 'step',
  title: 'If the data is sorted, you can discard half at a time',
  intro: 'You look for one value among 27 values. You can check them one by one from the start. If they are sorted, you can look at the middle and discard half. Or you can use a B-tree, which splits the search into many branches at once. Change the search method and the value you look for, see how many steps it takes, and then see how the gap widens when there is much more data.',
  terms: ['Binary search', 'Time complexity (big-O notation)', 'B-tree index', 'Full table scan', 'Index'], ranks: ['ds', 'index'],
  controls: [
    { id: 'how', label: 'Search method', type: 'select', value: 'scan', options: [['scan', 'One by one from the start (unsorted data)'], ['binary', 'Binary search (sorted array)'], ['btree', 'B-tree (several values in one node)']] },
    { id: 'target', label: 'Value to find', type: 'select', value: 230, options: [[10, '10 (first)'], [140, '140 (middle)'], [230, '230 (toward the end)'], [270, '270 (last)'], [145, '145 (not in the data)']] },
    { id: 'n', label: 'If the real table were this large', type: 'select', value: 1000000, options: [[1000, '1,000 rows'], [1000000, '1 million rows'], [1000000000, '1 billion rows']] },
  ],
  presets: [
    { t: 'Default settings', d: 'One by one from the start. It checks 23 times to reach a value near the end.', v: { how: 'scan', target: 230, n: 1000000 } },
    { t: 'With binary search', d: 'It finds the same value in 5 checks.', v: { how: 'binary', target: 230, n: 1000000 } },
    { t: 'With a B-tree', d: 'It reads only 3 nodes to find any value.', v: { how: 'btree', target: 230, n: 1000000 } },
    { t: 'Looking for a missing value one by one', d: 'It has to check to the very end to know the value is not there.', v: { how: 'scan', target: 145, n: 1000000 } },
    { t: 'A missing value with a B-tree', d: 'It confirms the value is not there with 3 nodes too.', v: { how: 'btree', target: 145, n: 1000000 } },
    { t: 'With 1 billion rows', d: 'See the difference in the number of steps by method in the table below.', v: { how: 'btree', target: 230, n: 1000000000 } },
  ],
  keys: function () { var a = []; for (var i = 1; i <= 27; i++) a.push(i * 10); return a; },
  // Unsorted order: a fixed array that is assumed to be the order in which rows piled up in the real table (each value's position is kept the same as its sorted position to make comparison easy)
  // Depth calculation: the number of levels needed to tell n rows apart when each node splits into f branches
  depth: function (n, f) { var h = 0, cap = 1; while (cap < n) { cap *= f; h++; } return h; },
  // The actual calculation: the search steps of each method
  trace: function (how, target) {
    var a = this.keys(), steps = [], i;
    if (how === 'scan') { for (i = 0; i < a.length; i++) { steps.push({ at: [i], cmp: a[i] }); if (a[i] === target) return { steps: steps, found: true, count: steps.length }; } return { steps: steps, found: false, count: steps.length }; }
    if (how === 'binary') {
      var lo = 0, hi = a.length - 1;
      while (lo <= hi) { var mid = (lo + hi) >> 1; steps.push({ at: [mid], cmp: a[mid], lo: lo, hi: hi }); if (a[mid] === target) return { steps: steps, found: true, count: steps.length }; if (a[mid] < target) lo = mid + 1; else hi = mid - 1; }
      return { steps: steps, found: false, count: steps.length };
    }
    // B-tree (B+tree): root [100,190] → 3 internal nodes (2 keys each) → 9 leaf nodes (3 values each)
    var pick = function (seps) { return target < seps[0] ? 0 : target < seps[1] ? 1 : 2; };
    var r = pick([100, 190]); steps.push({ node: 'Root node', seps: [100, 190], child: r });
    var bs = [a[r * 9 + 3], a[r * 9 + 6]], b = pick(bs); steps.push({ node: 'Internal node ' + (r + 1), seps: bs, child: b, branch: r });
    var leaf = r * 3 + b, lk = a.slice(leaf * 3, leaf * 3 + 3); steps.push({ node: 'Leaf node ' + (leaf + 1), keys: lk, leaf: leaf, branch: r });
    return { steps: steps, found: lk.indexOf(target) >= 0, count: 3, leaf: leaf, branch: r };
  },
  code: function (c) {
    if (c.how === 'scan') return '// If the data is not sorted, the only way is to check everything from the start\nfor (int i = 0; i < rows.length; i++) {\n    if (rows[i] == target) return i;\n}\nreturn -1;                              // you know it is missing only after checking to the end\n\n-- In a database, this is the same as searching by a column that has no index (full table scan)\nSELECT * FROM orders WHERE amount = ' + c.target + ';';
    if (c.how === 'binary') return '// Sorted array: look at the middle and discard half\nint lo = 0, hi = sorted.length - 1;\nwhile (lo <= hi) {\n    int mid = (lo + hi) >>> 1;\n    if (sorted[mid] == target) return mid;\n    if (sorted[mid] < target) lo = mid + 1;   // discard the left half\n    else hi = mid - 1;                        // discard the right half\n}\nreturn -1;\n\n// In Java: Arrays.binarySearch(sorted, target)';
    return '-- When you create an index, the database builds a B-tree\nCREATE INDEX idx_amount ON orders (amount);\n\nSELECT * FROM orders WHERE amount = ' + c.target + ';\n\n-- Read the root node and decide which internal node to go to,\n-- read the internal node and decide which leaf node to go to,\n-- and find the value in the leaf node\n-- One node is one page on disk (16KB by default in InnoDB)';
  },
  label: function (c) { return { scan: 'One by one', binary: 'Binary search', btree: 'B-tree' }[c.how] + ' · finding ' + c.target; },
  columns: ['Checks among 27 values', 'Result', 'For the selected number of rows (worst case)'],
  simulate: function (c) {
    var tg = +c.target, a = this.keys(), T = this.trace(c.how, tg), ev = [], sum = [], self = this;
    var base = { how: c.how, target: tg, seen: [], cur: -1, lo: 0, hi: 26, path: [], done: false, found: false };
    function push(s, k, o) { var x = JSON.parse(JSON.stringify(base)); for (var p in o) x[p] = o[p]; ev.push({ s: s, k: k, snap: x }); }
    if (c.how === 'scan') {
      push('The 27 values are piled up unsorted (on the screen they are shown in order of size to make them easier to read). There is nothing to tell where the value is, so you check the values one by one from the start.', '', {});
      var seen = [];
      T.steps.forEach(function (st, i) {
        seen.push(st.at[0]); var hit = st.cmp === tg, lastOne = i === T.steps.length - 1;
        if (hit || lastOne || i < 2 || i % 6 === 5) push('Check #' + (i + 1) + ': ' + st.cmp + (hit ? ' → Found.' : lastOne ? ' → No. You looked at all of them, and the value is not there.' : ' → No. Move to the next slot.'), hit ? 'good' : lastOne ? 'bad' : '', { seen: seen.slice(), cur: st.at[0], done: hit || lastOne, found: hit });
      });
    } else if (c.how === 'binary') {
      push('The 27 values are sorted by size. You look at the middle value. If the value you look for is smaller, you discard the whole right half, and if it is larger, you discard the whole left half.', '', {});
      var seenB = [];
      T.steps.forEach(function (st, i) {
        seenB.push(st.at[0]); var hit = st.cmp === tg, lastOne = i === T.steps.length - 1, left = st.hi - st.lo + 1;
        push('Check #' + (i + 1) + ' (slots left: ' + left + '): the middle value is ' + st.cmp + (hit ? ' → Found.' : st.cmp < tg ? ' → It is smaller than the value you look for (' + tg + '). Discard this slot and everything to its left.' : ' → It is larger than the value you look for (' + tg + '). Discard this slot and everything to its right.') + (!hit && lastOne ? ' No slots are left, so the value is not in the data.' : ''), hit ? 'good' : lastOne ? 'bad' : '', { seen: seenB.slice(), cur: st.at[0], lo: hit ? st.lo : st.cmp < tg ? st.at[0] + 1 : st.lo, hi: hit ? st.hi : st.cmp < tg ? st.hi : st.at[0] - 1, done: hit || lastOne, found: hit });
      });
    } else {
      push('The same 27 values are stored in a B-tree. The 9 leaf nodes at the bottom hold three sorted values each, and the nodes above hold only keys that tell you which way to go down. Reading one node is one disk read.', '', {});
      var path = [];
      T.steps.forEach(function (st, i) {
        path.push(st);
        if (st.seps) push('Read #' + (i + 1) + ': ' + st.node + ' [' + st.seps.join(', ') + ']. ' + 'The value you look for (' + tg + ') ' + (st.child === 0 ? 'is smaller than ' + st.seps[0] + ', so you go down to the first child' : st.child === 1 ? 'is ' + st.seps[0] + ' or more and less than ' + st.seps[1] + ', so you go down to the second child' : 'is ' + st.seps[1] + ' or more, so you go down to the third child') + '. You do not look at the values under the other two children.', '', { path: path.slice() });
        else push('Read #3: ' + st.node + ' [' + st.keys.join(', ') + ']. ' + (T.found ? 'The value you look for (' + tg + ') is here.' : 'This is where the value you look for (' + tg + ') would be, but it is not here. The value is not in the data.'), T.found ? 'good' : 'bad', { path: path.slice(), done: true, found: T.found });
      });
    }
    var N = +c.n, worst = { scan: N, binary: self.depth(N + 1, 2), b3: self.depth(N, 3), b500: self.depth(N, 500) };
    var fmtN = function (x) { return x >= 1000000000 ? (x / 1000000000) + ' billion' : x >= 1000000 ? (x / 1000000) + ' million' : String(x); };
    var unit = c.how === 'btree' ? 'Nodes read: ' + T.count : 'Checks: ' + T.count;
    sum.push('Finding ' + tg + ' among 27 values. ' + unit + '. ' + (T.found ? 'Found.' : 'Confirmed that it is not there.'));
    sum.push('With ' + fmtN(N) + ' rows, in the worst case: one by one, ' + fmtN(worst.scan) + ' checks; binary search, ' + worst.binary + ' checks; a B-tree with 3 children per node, ' + worst.b3 + ' levels; a B-tree with 500 children per node, ' + worst.b500 + ' levels.');
    if (c.how === 'scan') sum.push('Checking one by one takes 10 times as many checks when the data is 10 times as large (O(n)). To find out that a value is missing, you have to look at all of them. This is what the database does when you query by a column that has no index.');
    if (c.how === 'binary') sum.push('Each check cuts the candidates in half (O(log n)). Even if the data becomes 1,000 times larger, the number of checks grows by only about 10. But the data must be sorted, and inserting a value into the middle of a sorted array is expensive.');
    if (c.how === 'btree') sum.push('A B-tree splits the search not in two but into many branches at a time. The more children each node has, the lower the tree is and the fewer nodes (disk pages) you have to read. In a real database index, one node holds hundreds of values, so even hundreds of millions of rows can be found in three or four levels.');
    sum.push('The difference among the three methods is "whether the data is kept sorted" and "how much is discarded at a time". A database index keeps the values sorted and stored in a B-tree, and the price is that the tree must be updated every time you insert or change a value.');
    return { events: ev, summary: sum, row: [unit, T.found ? 'Found' : 'Not found', { scan: 'Checks: ' + fmtN(worst.scan), binary: 'Checks: ' + worst.binary, btree: 'Levels: ' + worst.b500 + ' (500 children per node)' }[c.how]], worst: worst, big: fmtN(N) };
  },
  render: function (v, sim, t, H, shown) {
    var a = this.keys(), last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to see the search one step at a time.'); return; }
    if (s.how !== 'btree') {
      H.title(v, s.how === 'scan' ? '27 values (assumed to be in unsorted order in reality)' : '27 sorted values');
      H.slots(v, a.map(function (k, i) { var cand = s.how === 'binary' ? (i >= s.lo && i <= s.hi && s.seen.indexOf(i) < 0) : s.seen.indexOf(i) < 0, cls = i === s.cur ? (s.done ? (s.found ? 'd now' : 'r now') : 'b now') : cand ? 'q' : ''; return [String(k), cls]; }), '', true);
      H.text(v, 'Blue slots are still candidates, faded slots are no longer candidates, and the thick border is the slot being checked now.'); H.counters(v, [[String(s.seen.length), 'Checks so far'], [s.how === 'binary' ? (s.found ? '-' : String(Math.max(0, s.hi - s.lo + 1))) : String(27 - s.seen.length), s.how === 'binary' ? 'Slots still candidates' : 'Slots not yet checked']]);
    } else {
      var p = s.path, br = p.length > 1 ? p[1].branch : -1, lf = p.length > 2 ? p[2].leaf : -1;
      H.title(v, 'Root node'); H.slots(v, [['100', p.length ? 'b' + (p.length === 1 ? ' now' : '') : 'q'], ['190', p.length ? 'b' + (p.length === 1 ? ' now' : '') : 'q']], '', true);
      H.title(v, 'Internal nodes (3): keys that show the way down'); H.slots(v, [0, 1, 2].map(function (i) { return ['Internal ' + (i + 1) + ': ' + a[i * 9 + 3] + ', ' + a[i * 9 + 6], i === br ? 'b' + (p.length === 2 ? ' now' : '') : p.length > 1 ? '' : 'q']; }), '', true);
      H.title(v, 'Leaf nodes (9): the actual values'); H.slots(v, [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return [a.slice(i * 3, i * 3 + 3).join(' '), i === lf ? (s.found ? 'd now' : 'r now') : p.length > 2 ? '' : 'q']; }), '', true);
      H.text(v, 'Yellow slots are nodes that were read, and faded slots are nodes that were skipped without being read.'); H.counters(v, [[String(p.length), 'Nodes read (disk reads)'], [String(13 - p.length), 'Nodes not read']]);
    }
    if (s.done) { var w = sim.worst; H.table(v, ['Method', 'Worst case with ' + sim.big + ' rows', 'How it grows'], [['One by one from the start', sim.big + ' checks', 'O(n): in proportion to the data'], ['Binary search', w.binary + ' checks', 'O(log n): halved each time'], ['B-tree (3 children per node)', w.b3 + ' levels', 'O(log n): cut to 1/3 at each level'], ['B-tree (500 children per node)', w.b500 + ' levels', 'O(log n): cut to 1/500 at each level']].map(function (r, i) { var on = (s.how === 'scan' && i === 0) || (s.how === 'binary' && i === 1) || (s.how === 'btree' && i >= 2); return { cells: [{ v: r[0], cls: on ? 'hot' : '' }, r[1], r[2]] }; }), 'As the data grows'); }
  },
  // Diagram: One-by-one search and binary search use 27 slots, and the B-tree is drawn as an actual tree with a root, internal nodes, and leaves.
  draw: function (P, sim, shown) {
    var a = this.keys(), last = shown[shown.length - 1], s = last ? last.snap : { how: sim.c.how, seen: [], cur: -1, lo: 0, hi: 26, path: [], done: false, found: false };
    if (s.how !== 'btree') {
      P.size(680, 190);
      P.region('arr', 16, 16, 648, 158, s.how === 'scan' ? '27 values (the order is unknown, so check one by one from the start)' : '27 sorted values (look at the middle and discard half)');
      a.forEach(function (k, i) {
        var cand = s.how === 'binary' ? (i >= s.lo && i <= s.hi && s.seen.indexOf(i) < 0) : s.seen.indexOf(i) < 0;
        P.box('c' + i, 28 + (i % 14) * 44.5, 56 + Math.floor(i / 14) * 40, 40, 28, { cls: i === s.cur ? (s.done ? (s.found ? 'good now' : 'bad now') : 'hot now') : cand ? 'wait' : 'ghost', sub: String(k), center: true });
      });
      P.text('cnt', 28, 160, 'Checks so far: ' + s.seen.length, { cls: s.done ? (s.found ? 'good' : 'bad') : 'mut' });
      P.note('Blue slots are still candidates, dotted slots are no longer candidates, and the thick border is the slot being checked now.');
      return;
    }
    var p = s.path, br = p.length > 1 ? p[1].branch : -1, lf = p.length > 2 ? p[2].leaf : -1;
    P.size(680, 278);
    P.region('tree', 16, 16, 648, 246, 'B-tree: reading one node is one disk read');
    P.box('root', 290, 46, 100, 28, { cls: p.length ? 'hot' + (p.length === 1 ? ' now' : '') : 'plain', sub: '100 | 190', center: true });
    for (var i = 0; i < 3; i++) {
      P.box('br' + i, 70 + i * 220, 112, 100, 28, { cls: i === br ? 'hot' + (p.length === 2 ? ' now' : '') : 'plain', sub: a[i * 9 + 3] + ' | ' + a[i * 9 + 6], center: true });
      P.arrow('rb' + i, 'root:b:' + (0.25 + i * 0.25), 'br' + i + ':t', { cls: i === br ? 'hot' : 'mut' });
    }
    for (var j = 0; j < 9; j++) {
      P.box('lf' + j, 20 + j * 71.5, 184, 67, 58, { cls: j === lf ? (s.found ? 'good now' : 'bad now') : 'plain', sub: a.slice(j * 3, j * 3 + 3).map(String), center: true });
      P.arrow('bl' + j, 'br' + Math.floor(j / 3) + ':b:' + (0.25 + (j % 3) * 0.25), 'lf' + j + ':t', { cls: j === lf ? 'hot' : 'mut' });
    }
    P.note('Yellow nodes are the nodes that were read, and the other nodes were skipped without being read. The numbers in the upper nodes are keys that tell you which way to go down, and the actual values are in the leaf nodes at the bottom.');
  },
  assume: 'The search steps and counts for 27 rows are the result of this page actually running the algorithms. The counts for large numbers of rows are the maximum number of steps, calculated from "how many branches the search splits into at a time". The B-tree on the screen has the shape in which the values are only in the leaf nodes (a B+tree), and the index of MySQL InnoDB has this structure. How many values fit in one node of a real index depends on the size of the key, and 500 is just an example value. The root and internal nodes are usually already in memory, so the number of real disk reads is smaller.',
});
