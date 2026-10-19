Lab.register({
  id: 'sqh', nav: 'Stack, queue, priority queue', cat: 'Data structures', mode: 'step',
  title: 'Insertion order and removal order',
  intro: 'Even when you insert the same five numbers in the same order, the order in which they come out depends on the data structure. A stack returns the most recently inserted value first, a queue returns the earliest inserted value first, and a priority queue returns the smallest value first.',
  terms: ['Stack, queue, deque', 'Heap and priority queue', 'Time complexity (big-O notation)'], ranks: ['ds', 'collection'],
  controls: [
    { id: 'ds', label: 'Data structure', type: 'select', value: 'pq', options: [['stack', 'Stack (push / pop of ArrayDeque)'], ['queue', 'Queue (offer / poll of ArrayDeque)'], ['pq', 'Priority queue (PriorityQueue)']] },
    { id: 'inp', label: 'Insertion order', type: 'select', value: 'mixed', options: [['mixed', '5, 2, 8, 1, 9 (mixed order)'], ['asc', '1, 2, 5, 8, 9 (ascending order)'], ['desc', '9, 8, 5, 2, 1 (descending order)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'In what order do the values come out when you insert 5, 2, 8, 1, 9 into a priority queue (PriorityQueue) and remove them?', d: 'A priority queue. The smallest value comes out first, regardless of the insertion order.', v: { ds: 'pq', inp: 'mixed' } },
    { t: 'Stack', q: 'What if you insert the same values into a stack (push / pop of ArrayDeque) and remove them?', d: 'The 9, which was inserted last, comes out first.', v: { ds: 'stack', inp: 'mixed' } },
    { t: 'Queue', q: 'What if you insert the same values into a queue (offer / poll of ArrayDeque) and remove them?', d: 'The values come out in insertion order.', v: { ds: 'queue', inp: 'mixed' } },
    { t: 'Descending order into a priority queue', q: 'What if you insert 9, 8, 5, 2, 1 (descending order) into the PriorityQueue?', d: 'On every insertion, the new value moves all the way up to the top.', v: { ds: 'pq', inp: 'desc' } },
  ],
  INPUTS: { mixed: [5, 2, 8, 1, 9], asc: [1, 2, 5, 8, 9], desc: [9, 8, 5, 2, 1] },
  code: function (c) {
    var a = this.INPUTS[c.inp].join(', '), h = '// Only the lines inside main are shown (class, main declaration, and imports omitted)\n';
    if (c.ds === 'stack') return h + 'Deque<Integer> stack = new ArrayDeque<>();\nfor (int x : List.of(' + a + ')) stack.push(x);\n\nwhile (!stack.isEmpty()) System.out.print(stack.pop() + " ");';
    if (c.ds === 'queue') return h + 'Queue<Integer> queue = new ArrayDeque<>();\nfor (int x : List.of(' + a + ')) queue.offer(x);\n\nwhile (!queue.isEmpty()) System.out.print(queue.poll() + " ");';
    return h + 'PriorityQueue<Integer> pq = new PriorityQueue<>();   // smaller values first\nfor (int x : List.of(' + a + ')) pq.offer(x);\n\nwhile (!pq.isEmpty()) System.out.print(pq.poll() + " ");';
  },
  label: function (c) { return { stack: 'Stack', queue: 'Queue', pq: 'Priority queue' }[c.ds] + ' · ' + this.INPUTS[c.inp].join(', '); },
  columns: ['Removal order', 'One insertion', 'One removal'],
  // Pure computation used to check the model against the result of real execution
  run: function (c) {
    var inp = this.INPUTS[c.inp], a = [], out = [], heapIn = [], heapOut = [], steps = [];
    inp.forEach(function (x) {
      if (c.ds !== 'pq') { a.push(x); steps.push({ op: 'in', x: x, a: a.slice(), moves: 0 }); return; }
      var k = a.length, moves = 0; a.push(x);
      while (k > 0) { var p = (k - 1) >> 1; if (a[p] <= x) break; a[k] = a[p]; k = p; moves++; } a[k] = x;
      heapIn.push(a.slice()); steps.push({ op: 'in', x: x, a: a.slice(), moves: moves, at: k });
    });
    while (a.length) {
      if (c.ds === 'stack') { var s = a.pop(); out.push(s); steps.push({ op: 'out', x: s, a: a.slice(), moves: 0 }); continue; }
      if (c.ds === 'queue') { var q = a.shift(); out.push(q); steps.push({ op: 'out', x: q, a: a.slice(), moves: 0 }); continue; }
      var root = a[0], last = a.pop(), n = a.length, mv = 0;
      if (n > 0) { var i = 0, half = n >> 1; while (i < half) { var ch = 2 * i + 1, r = ch + 1, cv = a[ch]; if (r < n && cv > a[r]) { ch = r; cv = a[r]; } if (last <= cv) break; a[i] = cv; i = ch; mv++; } a[i] = last; }
      out.push(root); heapOut.push(a.slice()); steps.push({ op: 'out', x: root, a: a.slice(), moves: mv });
    }
    return { out: out, heapIn: heapIn, heapOut: heapOut, steps: steps };
  },
  simulate: function (c) {
    var r = this.run(c), ev = [], outs = [], sum = [];
    r.steps.forEach(function (st) {
      if (st.op === 'out') outs.push(st.x);
      var s;
      if (c.ds === 'stack') s = st.op === 'in' ? 'push(' + st.x + '): Pushes the value onto the top.' : 'pop(): Removes ' + st.x + ' from the top. It is the value that was inserted last.';
      else if (c.ds === 'queue') s = st.op === 'in' ? 'offer(' + st.x + '): Inserts the value at the tail of the queue.' : 'poll(): Removes ' + st.x + ' from the head of the queue. It is the value that was inserted first.';
      else s = st.op === 'in' ? 'offer(' + st.x + '): The value is placed at the end of the array and then moves up, swapping places with its parent while it is smaller than the parent. ' + (st.moves ? 'It moved up ' + st.moves + (st.moves === 1 ? ' level and ' : ' levels and ') + (st.at === 0 ? 'reached the top (the place of the smallest value).' : 'stopped.') : (st.at === 0 ? 'It is the first value, so it stays at the top.' : 'It is not smaller than its parent, so it stays where it is.')) : 'poll(): Removes the smallest value, ' + st.x + ', from the top. ' + (st.moves ? 'The last value in the array is moved to the empty top and then moves down, swapping places with the smaller of its two children (it moved down ' + st.moves + (st.moves === 1 ? ' level' : ' levels') + ').' : 'If any values remain, the last value in the array is moved to the empty top. This time no swap was needed.');
      ev.push({ s: s, k: st.op === 'out' ? 'good' : '', snap: { a: st.a, outs: outs.slice(), op: st.op, x: st.x } });
    });
    if (c.ds === 'stack') sum.push('A stack is last-in-first-out (LIFO). It is used when the most recent item must be handled first, as in a method call stack, undo, or checking that parentheses are matched. Insertion and removal are both O(1). In Java, use ArrayDeque in place of the old Stack class.');
    if (c.ds === 'queue') sum.push('A queue is first-in-first-out (FIFO). It is used when items must be handled in the order they arrived, as in a job queue, a message queue, or breadth-first search. Insertion and removal are both O(1).');
    if (c.ds === 'pq') { sum.push('A priority queue returns the smallest value first, regardless of the insertion order. The internal array is not fully sorted. It keeps only the condition that a parent is less than or equal to its children (a heap). That is why the top is always the minimum value.'); sum.push('Insertion and removal swap places only as many times as the height of the tree, so they are O(log n). This is much cheaper than sorting everything every time. A priority queue is used for task scheduling, finding the top N items, and shortest-path algorithms.'); }
    return { events: ev, summary: sum, row: [r.out.join(' '), c.ds === 'pq' ? 'O(log n)' : 'O(1)', c.ds === 'pq' ? 'O(log n)' : 'O(1)'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { a: [], outs: [] };
    H.title(v, c.ds === 'stack' ? 'Stack (the right end is the top)' : c.ds === 'queue' ? 'Queue (the left end is the head, the right end is the tail)' : 'Internal array (index 0 is the top = the smallest value)');
    H.slots(v, s.a.map(function (x, i) { var hot = c.ds === 'stack' ? i === s.a.length - 1 : i === 0; return [String(x), hot ? 'b' : 'q']; }), 'empty');
    if (c.ds === 'stack') H.text(v, 'The boxes above are drawn with the right end as the top. A real ArrayDeque\'s push puts the value at the front, so if you print it with System.out.println(stack), the top comes first on the left and the order looks reversed' + (s.a.length ? ' (right now, [' + s.a.slice().reverse().join(', ') + ']).' : '.'));
  },
  // Diagram: the stack is drawn piling upward, the queue as a line from side to side, and the priority queue as a tree (heap). A removed value moves to the row at the bottom.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { a: [], outs: [] }, a = s.a, n = a.length;
    P.size(680, 330);
    P.region('ds', 16, 16, 648, 220, c.ds === 'stack' ? 'Stack: insert at the top, remove from the top' : c.ds === 'queue' ? 'Queue: insert at the tail, remove from the head' : 'Priority queue: a tree in which a parent is less than or equal to its children (heap)');
    P.region('out', 16, 250, 648, 64, 'Removal order');
    if (c.ds === 'stack') {
      a.forEach(function (x, i) { P.box('v' + x, 280, 226 - (i + 1) * 30, 120, 26, { cls: i === n - 1 ? 'hot now' : 'wait', sub: String(x), center: true }); });
      if (n) P.text('top', 270, 226 - n * 30 + 18, 'top', { anchor: 'end', cls: 'mut' });
    } else if (c.ds === 'queue') {
      a.forEach(function (x, i) { P.box('v' + x, 125 + i * 90, 110, 70, 34, { cls: i === 0 ? 'hot now' : 'wait', sub: String(x), center: true }); if (i) P.arrow('q' + i, 'v' + x + ':l', 'v' + a[i - 1] + ':r', { cls: 'mut' }); });
      if (n) { P.text('qh', 125, 100, 'head (leaves next)', { cls: 'mut' }); P.text('qt', 125 + (n - 1) * 90 + 70, 164, 'tail (just inserted)', { cls: 'mut', anchor: 'end' }); }
    } else {
      var pos = [[340, 50], [220, 100], [460, 100], [160, 150], [280, 150], [400, 150], [520, 150]];
      a.forEach(function (x, i) { P.box('v' + x, pos[i][0] - 26, pos[i][1], 52, 28, { cls: i === 0 ? 'hot now' : 'wait', sub: String(x), center: true }); if (i) P.arrow('e' + i, 'v' + a[(i - 1) >> 1] + ':b', 'v' + x + ':t', { cls: 'mut' }); });
      if (n) P.text('arrl', 28, 219, 'internal array', { cls: 'mut' });
      a.forEach(function (x, i) { P.box('a' + x, 110 + i * 46, 202, 42, 24, { cls: i === 0 ? 'hot' : 'plain', sub: String(x), center: true }); });
    }
    if (!n && !s.outs.length) P.text('hint', 340, 130, 'Click Run to insert the values one at a time', { cls: 'mut', anchor: 'middle' });
    s.outs.forEach(function (x, k) { P.box('v' + x, 28 + k * 54, 280, 46, 26, { cls: 'good', sub: String(x), center: true }); });
    P.note(c.ds === 'pq' ? 'The yellow box is the top (the smallest value). The tree is another view of the internal array below it, and the children of index i are at indexes 2i+1 and 2i+2.' : 'The yellow box is the value that will be removed next. A removed value moves to the row at the bottom.');
  },
  assume: 'The removal order and the changes to the internal array of the priority queue were checked by running the real ArrayDeque and PriorityQueue on JDK 21 in our test environment (the internal array matched after every insertion and after every removal). By default, PriorityQueue returns the smallest value first, and you can change the ordering by supplying a Comparator.',
});
