Lab.register({
  id: 'list', nav: 'ArrayList and LinkedList', cat: 'Data structures', mode: 'step',
  title: 'The same operation takes a different amount of work',
  why: 'A Java array has a fixed length when it is created, so if you do not know the number of elements in advance, you have to write the code that creates a larger array and moves the elements yourself. ArrayList takes care of this length management. You can get elements directly by index as with an array and still keep adding elements. LinkedList links nodes together, so adding and removing at either end is fast regardless of the number of elements.',
  use: 'ArrayList is the most commonly used list when you collect items and go through them in order or get them by index, such as a list of query results or items to show on a screen. When you need a queue or a stack that adds and removes at both ends, the ArrayDeque class is more commonly used than LinkedList.',
  intro: 'An ArrayList stores its elements next to each other in a single array, and a LinkedList creates a node for each element and links each node to the ones before and after it. Try getting, inserting, and removing at different positions, and you see that one does its work shifting elements and the other does its work following nodes.',
  terms: ['ArrayList', 'LinkedList', 'Time complexity (big-O notation)', 'Amortized analysis'], ranks: ['collection', 'ds'],
  controls: [
    { id: 'ds', label: 'Data structure', type: 'select', value: 'array', options: [['array', 'ArrayList'], ['linked', 'LinkedList']] },
    { id: 'op', label: 'Operation', type: 'select', value: 'add', options: [['get', 'Get by index: get(i)'], ['add', 'Insert: add(i, x)'], ['remove', 'Remove: remove(i)'], ['append', 'Keep appending to an empty list: add(x)']] },
    { id: 'pos', label: 'Position', type: 'select', value: 'front', options: [['front', 'Beginning'], ['mid', 'Middle'], ['back', 'End']], show: function (c) { return c.op !== 'append'; } },
    { id: 'n', label: 'Number of elements', type: 'range', min: 5, max: 40, value: 10, fmt: function (v) { return v + ' elements'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'How much work does it take to insert a value at the beginning of an ArrayList with 10 elements?', d: 'Insert at the beginning of an ArrayList. Every element is shifted one position to the right.', v: { ds: 'array', op: 'add', pos: 'front', n: 10 } },
    { t: 'The same insertion into a LinkedList', q: 'What if you make the same insertion at the beginning of a LinkedList?', d: 'Only the links have to be changed. No element is shifted.', v: { ds: 'linked', op: 'add', pos: 'front', n: 10 } },
    { t: 'Insert in the middle of a LinkedList', q: 'What if you insert in the middle of a LinkedList instead of at the beginning?', d: 'The insertion itself is fast, but the nodes have to be followed up to that position.', v: { ds: 'linked', op: 'add', pos: 'mid', n: 10 } },
    { t: 'Get from the middle of a LinkedList', q: 'What if you get the middle element of a LinkedList with 20 elements by index with get(i)?', d: 'It cannot go directly to an index, so it follows the nodes one by one.', v: { ds: 'linked', op: 'get', pos: 'mid', n: 20 } },
    { t: 'Get from the middle of an ArrayList', q: 'What if you get the middle element of an ArrayList with 20 elements by index with get(i)?', d: 'The element is accessed in one step, however many elements there are.', v: { ds: 'array', op: 'get', pos: 'mid', n: 20 } },
    { t: 'Append 40 elements to an ArrayList', q: 'What if you keep appending 40 elements to an empty ArrayList with add(x)?', d: 'The elements are moved to a larger array only when the array is full. Look at the average cost.', v: { ds: 'array', op: 'append', pos: 'back', n: 40 } },
  ],
  idx: function (c) { return c.pos === 'front' ? 0 : c.pos === 'mid' ? c.n >> 1 : c.op === 'add' ? c.n : c.n - 1; },
  code: function (c) {
    var H = '// Only the lines inside main are shown (class, main declaration, and imports omitted)\n';
    var T = c.ds === 'array' ? 'ArrayList' : 'LinkedList', i = this.idx(c);
    if (c.op === 'append') return H + 'List<Integer> list = new ' + T + '<>();   // empty list\nfor (int x = 1; x <= ' + c.n + '; x++) {\n    list.add(x);                     // append to the end\n}';
    var call = c.op === 'get' ? 'list.get(' + i + ');' : c.op === 'add' ? 'list.add(' + i + ', 99);' : 'list.remove(' + i + ');';
    return H + 'List<Integer> list = new ' + T + '<>();\n// ... the list now holds ' + c.n + ' elements (values 1 to ' + c.n + ', indexes 0 to ' + (c.n - 1) + ')\n\n' + call + '        // ' + { front: 'beginning', mid: 'middle', back: 'end' }[c.pos];
  },
  label: function (c) { return (c.ds === 'array' ? 'ArrayList' : 'LinkedList') + ' · ' + (c.op === 'append' ? 'repeated append' : { get: 'get', add: 'insert', remove: 'remove' }[c.op] + ' ' + { front: 'at the beginning', mid: 'in the middle', back: 'at the end' }[c.pos]) + ' · ' + c.n + ' elements'; },
  columns: ['Nodes traversed', 'Elements shifted or copied', 'Time complexity'],
  simulate: function (c) {
    var arr = c.ds === 'array', n = c.n, ev = [], hops = 0, moved = 0, big = '', sum = [];
    function push(s, k, snap) { ev.push({ s: s, k: k, snap: snap }); }
    function cells(count, mark, val) { var a = []; for (var j = 0; j < count; j++) a.push([String(val ? val(j) : j + 1), mark(j) || 'd']); return a; }   // the text of a position is the value of the element (1 to n at first)
    if (c.op === 'append') {
      var cap = 0, size = 0, copies = 0;
      for (var x = 1; x <= n; x++) {
        if (arr && size === cap) {
          var nc = cap === 0 ? 10 : cap + Math.max(1, cap >> 1), cp = size; copies += cp;
          push(cap === 0 ? 'add(' + x + '): This is the first add, so an array of length 10 is created.' : 'add(' + x + '): The array of length ' + cap + ' is full. A new array of length ' + nc + ', which is 1.5 times as long, is created, all ' + cp + ' existing elements are copied into it, and then the new element is stored.', cap === 0 ? '' : 'bad', { size: size + 1, cap: nc, copies: copies, last: size });
          cap = nc; size++;
        } else { size++; push('add(' + x + '): ' + (arr ? 'The array has an empty position, so the element is stored right away. Nothing is copied.' : 'A new node is created and linked after the last node. The list keeps a separate reference to the last node, so no nodes have to be followed.'), '', { size: size, cap: arr ? cap : size, copies: copies, last: size - 1 }); }
      }
      moved = copies; big = arr ? 'O(1) (amortized)' : 'O(1)';
      if (arr) { sum.push('Even though there is an expensive copy now and then, most adds finish without copying, so on average the cost of one add is constant. This is called amortized O(1). If you know the number of elements in advance, you can set the capacity, as in new ArrayList<>(' + n + '), and avoid the copying.'); }
      else sum.push('A LinkedList does no copying. Instead, it creates one node object for each element (' + n + ' of them) and stores two more references in each node, to the previous node and the next node, so it uses more memory.');
      return { events: ev, summary: sum, row: ['0', copies + '', big], kind: 'append' };
    }
    var i = this.idx(c), where = { front: 'at the beginning', mid: 'in the middle', back: 'at the end' }[c.pos], last;
    if (arr) {
      if (c.op === 'get') { push('get(' + i + '): An array is laid out contiguously in memory, so the location of index ' + i + ' can be computed directly by adding the index to the start address. The element is read in one step.', 'good', { cells: cells(n, function (j) { return j === i ? 'b now' : ''; }) }); big = 'O(1)'; sum.push('Getting an element of an ArrayList by index finishes in one step, regardless of the number of elements.'); }
      if (c.op === 'add') { moved = n - i;
        push('add(' + i + ', 99): To store the element at index ' + i + ', that position has to be freed.' + (moved ? ' From index ' + i + ' to the end, ' + moved + ' elements have to be shifted.' : ' This is the end of the list, so there are no elements to shift.'), '', { cells: cells(n, function (j) { return j >= i ? 'q' : ''; }) });
        last = cells(n + 1, function (j) { return j === i ? 'b now' : j > i ? 'q' : ''; }, function (j) { return j < i ? j + 1 : j > i ? j : 99; });
        push(moved ? 'The ' + moved + ' elements were each copied one position to the right, and then 99 was stored at index ' + i + ', which is now empty.' : '99 was stored right away in the empty position at the end.', moved > 1 ? 'bad' : 'good', { cells: last });
        big = moved ? 'O(n)' : 'O(1) (amortized)'; sum.push(moved ? 'Inserting an element ' + where + ' of the ArrayList required shifting the ' + moved + ' elements from that position on. The closer to the beginning and the more elements there are, the more there is to shift.' : 'Inserting at the end of an ArrayList is fast because there is nothing to shift (the elements are copied to a new array only when the array is full).'); }
      if (c.op === 'remove') { moved = n - i - 1;
        push('remove(' + i + '): The element at index ' + i + ' is removed.' + (moved ? ' To close the gap, the ' + moved + ' elements after it have to be shifted to the left.' : ' This is the end of the list, so there are no elements to shift.'), '', { cells: cells(n, function (j) { return j === i ? 'r now' : j > i ? 'q' : ''; }) });
        push(moved ? 'The ' + moved + ' elements after it were each copied one position to the left.' : 'Only the last position was cleared, and nothing else was needed.', moved > 1 ? 'bad' : 'good', { cells: cells(n - 1, function (j) { return j >= i ? 'q' : ''; }, function (j) { return j < i ? j + 1 : j + 2; }) });
        big = moved ? 'O(n)' : 'O(1)'; sum.push(moved ? 'Removing an element ' + where + ' of the ArrayList required shifting the ' + moved + ' elements after it to the left.' : 'Removing the element at the end of an ArrayList leaves nothing to shift.'); }
    } else {
      var target = c.op === 'add' && i === n ? -1 : i, fromHead = target < (n >> 1), path = [];
      if (target >= 0) { if (fromHead) for (var a = 0; a <= target; a++) path.push(a); else for (var b = n - 1; b >= target; b--) path.push(b); hops = path.length - 1; }
      var inPath = function (j) { return path.indexOf(j) >= 0; };
      var walk = target < 0 ? 'The element is appended at the end, so the last node is used directly. There are no nodes to follow.' : (fromHead ? 'The index is in the first half, so the list started from the first node and' : 'The index is in the second half, so the list started from the last node and') + ' followed ' + hops + ' links to reach the node at index ' + i + '.';
      var name = c.op === 'get' ? 'get(' + i + ')' : c.op === 'add' ? 'add(' + i + ', 99)' : 'remove(' + i + ')';
      push(name + ': A LinkedList cannot compute a location from an index. ' + walk, hops > 2 ? 'bad' : '', { cells: cells(n, function (j) { return j === target ? 'b now' : inPath(j) ? 'q' : ''; }), linked: true });
      if (c.op === 'get') { big = hops ? 'O(n)' : 'O(1)'; sum.push(hops ? 'Getting an element of a LinkedList by index requires following the nodes one by one up to that position (' + hops + ' links). The list starts from whichever end is closer, but the closer the position is to the middle, the longer it takes.' : 'A LinkedList also accesses the elements at both ends directly.'); }
      if (c.op === 'add') { last = cells(n + 1, function (j) { return j === i ? 'b now' : ''; }, function (j) { return j < i ? j + 1 : j > i ? j : 99; }); push('A new node was created and inserted by changing only the links of the nodes before and after it. Not a single other element was moved.', 'good', { cells: last, linked: true }); big = hops ? 'O(n) (traversal) + O(1) (linking)' : 'O(1)'; sum.push(hops ? 'The insertion itself in a LinkedList only requires changing links, but ' + hops + ' links had to be followed to find the position. The saying "insertion into a LinkedList is fast" is true only when the position is already known (at either end, or where an iterator is pointing).' : 'Inserting an element ' + where + ' of a LinkedList requires neither following nodes nor shifting elements.'); }
      if (c.op === 'remove') { push('The node before it and the node after it were linked directly to each other, which took the node at index ' + i + ' out of the list. No other element was moved.', 'good', { cells: cells(n - 1, function () { return ''; }, function (j) { return j < i ? j + 1 : j + 2; }), linked: true }); big = hops ? 'O(n) (traversal) + O(1) (linking)' : 'O(1)'; sum.push(hops ? 'Removal from a LinkedList also only requires changing links, but ' + hops + ' links had to be followed to find the node to remove.' : 'Removing an element ' + where + ' of a LinkedList requires neither following nodes nor shifting elements.'); }
    }
    return { events: ev, summary: sum, row: [hops + '', moved + '', big], kind: 'one' };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, arr = c.ds === 'array';
    if (!s) { H.text(v, 'Click Run to start.'); return; }
    if (sim.kind === 'append') {
      H.counters(v, arr ? [[s.size, 'Elements stored'], [s.cap, 'Capacity (array length)'], [s.copies, 'Elements copied so far'], [(Math.round(s.copies / s.size * 100) / 100), 'Average copies per add']] : [[s.size, 'Nodes'], [0, 'Elements copied']]);
      H.title(v, arr ? 'Internal array (green is a filled position, a dashed outline is an empty position)' : 'Nodes (each linked to the ones before and after it)');
      var items = []; for (var j = 0; j < s.cap; j++) items.push([j < s.size ? String(j + 1) : '', (j < s.size ? 'd' : '') + (j === s.last ? ' now' : '')]);
      H.slots(v, items, null, true);
    } else {
      H.title(v, arr ? 'Internal array (the numbers are element values; indexes are 0, 1, 2… from the left)' : 'Nodes (the numbers are element values; the first node is on the left, the last node on the right)');
      H.slots(v, s.cells, 'Empty', true);
    }
  },
  // Diagram: in an array the positions sit side by side with no gaps, and in a linked list the separate nodes are connected by arrows.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, arr = c.ds === 'array', cells = [];
    if (s && sim.kind === 'append') { for (var j = 0; j < s.cap; j++) cells.push([j < s.size ? String(j + 1) : '', j < s.size ? (j === s.last ? 'hot now' : 'good') : 'ghost']); }
    else if (s) cells = s.cells.map(function (x) { return [x[0], { d: 'good', q: 'wait', 'b now': 'hot now', 'r now': 'bad now' }[x[1]] || 'ghost']; });
    var per = arr ? 20 : 10, rows = Math.max(1, Math.ceil(cells.length / per)), pitch = arr ? 38 : 46, rh = 44 + rows * pitch;
    P.size(680, rh + 32);
    P.region('box', 16, 16, 648, rh, arr ? 'Internal array (contiguous in memory, so a location is computed directly)' : 'Nodes (apart from each other, each remembering where its neighbor is)');
    if (!s) { P.text('hint', 340, 16 + rh / 2 + 8, 'Click Run to start', { cls: 'mut', anchor: 'middle' }); return; }
    cells.forEach(function (x, j) {
      var col = j % per, row = Math.floor(j / per);
      if (arr) P.box('c' + j, 28 + col * 31, 52 + row * pitch, 31, 28, { cls: x[1], sub: x[0], center: true });
      else { var back = row % 2 === 1, cx = back ? per - 1 - col : col; P.box('c' + j, 28 + cx * 62, 52 + row * pitch, 42, 28, { cls: x[1], sub: x[0], center: true }); if (j) P.arrow('l' + j, 'c' + (j - 1) + (!col ? ':b' : back ? ':l' : ':r'), 'c' + j + (!col ? ':t' : back ? ':r' : ':l'), { cls: 'mut' }); }
    });
    P.note(arr ? (sim.kind === 'append' ? 'The number in each position is the value added with add(x). Yellow is the position just filled, and a dashed outline is a position that is still empty.' : 'The number in each position is the value of the element (the list starts with the values 1 to ' + c.n + ' in order). Indexes are 0, 1, 2… from the left. Yellow is the target position, blue marks the elements that are shifted by one position, and a dashed outline is an empty position.') :'The number in each node is the value of the element (1 to ' + c.n + ' at first). The yellow node is the target, and the blue nodes are the ones passed on the way to it. A real LinkedList is linked in both directions, and because a location cannot be computed from an index, the arrows have to be followed.');
  },
  assume: 'For a single insertion, the model assumes that the internal array of the ArrayList still has an empty position. The case in which the array is full is shown separately under "Keep appending to an empty list". The capacity of an ArrayList starting at 10 and growing to 1.5 times each time (10 → 15 → 22 → 33 → 49), and a LinkedList starting from the beginning or the end, whichever is closer to the index, are the same as in the JDK implementation. The points at which the capacity grows and the number of elements copied match the values that were checked by taking out the internal array of a real ArrayList in our test run (JDK 21) (adding 40 elements grows the array 4 times and copies 80 elements). Actual speed is not determined by the number of positions alone. An array keeps its references to the elements next to each other in memory, which favors the CPU cache, so an ArrayList is often faster than a LinkedList even when it has many elements to shift.',
});
