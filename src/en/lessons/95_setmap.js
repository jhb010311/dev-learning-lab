Lab.register({
  id: 'setmap', nav: 'Kinds of Set and Map', cat: 'Data structures', mode: 'step',
  title: 'Why do the same values come out in a different order?',
  intro: 'A Set is a collection that holds each value only once, and a Map is a collection that holds keys paired with values. Each comes in three kinds, whose names start with Hash, LinkedHash, and Tree, and the kind you choose determines the order in which things come out and which values can go in. Add the same values to all three kinds and see which one to choose in which situation.',
  terms: ['List, Set, Map', 'Hash table and HashMap', 'LinkedHashSet and LinkedHashMap', 'TreeSet and TreeMap', 'Time complexity (big-O notation)'],
  controls: [
    { id: 'kind', label: 'Kind of collection', type: 'select', value: 'hash', options: [['hash', 'HashSet / HashMap'], ['linked', 'LinkedHashSet / LinkedHashMap'], ['tree', 'TreeSet / TreeMap']] },
    { id: 'data', label: 'Values to add (added in the order listed)', type: 'select', value: 'words', options: [['words', 'Strings: grape, apple, date, apple, fig'], ['small', 'Small integers: 3, 1, 2, 1, 5'], ['big', 'Integers: 40, 5, 17, 5, 100'], ['null', 'Strings with a null: grape, apple, null, apple, fig'], ['obj', 'Objects of your own Task class: id 40, 5, 17, 5, 100']], hint: 'In every case, the fourth addition repeats a value that was already added.' },
    { id: 'shape', label: 'Set or Map', type: 'select', value: 'set', options: [['set', 'Set (holds values only)'], ['map', 'Map (holds keys and values; each value is the sequence number of the addition)']] },
  ],
  presets: [
    { t: 'Default settings', d: 'Strings are added to a HashSet. They come out in an order that is neither the insertion order nor the sorted order.', v: { kind: 'hash', data: 'words', shape: 'set' } },
    { t: 'LinkedHashSet', d: 'The values come out in insertion order.', v: { kind: 'linked', data: 'words', shape: 'set' } },
    { t: 'TreeSet', d: 'The values come out in sorted order.', v: { kind: 'tree', data: 'words', shape: 'set' } },
    { t: 'Small integers in a HashSet', d: 'It looks as if the set sorted them. Change the values to 40, 5, 17, 5, 100 and compare.', v: { kind: 'hash', data: 'small', shape: 'set' } },
    { t: 'null in a TreeSet', d: 'null cannot be compared, so a NullPointerException is thrown.', v: { kind: 'tree', data: 'null', shape: 'set' } },
    { t: 'Objects of your own class in a TreeSet', d: 'An object that does not implement Comparable causes a ClassCastException.', v: { kind: 'tree', data: 'obj', shape: 'set' } },
    { t: 'The same key again in a LinkedHashMap', d: 'Only the value changes, and the position stays where the key was first inserted.', v: { kind: 'linked', data: 'words', shape: 'map' } },
  ],
  DATA: {
    words: [['s', 'grape'], ['s', 'apple'], ['s', 'date'], ['s', 'apple'], ['s', 'fig']],
    small: [['i', 3], ['i', 1], ['i', 2], ['i', 1], ['i', 5]],
    big: [['i', 40], ['i', 5], ['i', 17], ['i', 5], ['i', 100]],
    'null': [['s', 'grape'], ['s', 'apple'], ['n', 0], ['s', 'apple'], ['s', 'fig']],
    obj: [['o', 40], ['o', 5], ['o', 17], ['o', 5], ['o', 100]],
  },
  // How a value is written in Java code, and how println prints it
  lit: function (x) { return x[0] === 's' ? '"' + x[1] + '"' : x[0] === 'n' ? 'null' : x[0] === 'o' ? 'new Task(' + x[1] + ')' : String(x[1]); },
  str: function (x) { return x[0] === 'n' ? 'null' : x[0] === 'o' ? 'Task[id=' + x[1] + ']' : String(x[1]); },
  // hashCode: for a String, each character is added after the running value is multiplied by 31; for an Integer and for record Task(int id), it is the number itself; null is treated as 0
  hash: function (x) { if (x[0] === 's') { var h = 0; for (var i = 0; i < x[1].length; i++) h = (Math.imul(31, h) + x[1].charCodeAt(i)) | 0; return h; } return x[0] === 'n' ? 0 : x[1]; },
  // The bucket number that HashMap uses with 16 buckets: the upper half of the hashCode is mixed into the lower half, and then only the lowest 4 bits are used
  cell: function (x) { var h = this.hash(x); return (h ^ (h >>> 16)) & 15; },
  names: function (c) { var m = c.shape === 'map', k = { hash: 'Hash', linked: 'LinkedHash', tree: 'Tree' }[c.kind]; return { cls: k + (m ? 'Map' : 'Set'), v: m ? 'map' : 'set', el: c.data === 'obj' ? 'Task' : c.data === 'small' || c.data === 'big' ? 'Integer' : 'String' }; },
  code: function (c) {
    var D = this.DATA[c.data], n = this.names(c), m = c.shape === 'map', self = this;
    var call = function (i) { return m ? 'map.put(' + self.lit(D[i]) + ', ' + (i + 1) + ')' : 'set.add(' + self.lit(D[i]) + ')'; };
    var head = c.data === 'obj' ? 'record Task(int id) { }                    // does not implement Comparable\n\n' : '';
    var decl = m ? 'Map<' + n.el + ', Integer> map = new ' + n.cls + '<>();' : 'Set<' + n.el + '> set = new ' + n.cls + '<>();';
    return head + decl + '\n' + call(0) + ';\n' + call(1) + ';\n' + call(2) + ';\nSystem.out.println(' + call(3) + ');   // ' + (m ? 'puts a key that is already present' : 'adds a value that is already present') + '\n' + call(4) + ';\n\nSystem.out.println(' + n.v + ');                   // iterates from the start and prints\nSystem.out.println(' + n.v + '.size());';
  },
  label: function (c) { return this.names(c).cls + ' · ' + { words: 'strings', small: 'small integers', big: 'integers', 'null': 'with null', obj: 'Task objects' }[c.data]; },
  columns: ['Output', 'Size', 'Adding a duplicate', 'Exception'],
  simulate: function (c) {
    var self = this, D = this.DATA[c.data], n = this.names(c), m = c.shape === 'map', kind = c.kind, cls = n.cls, what = m ? 'key' : 'element', whatObj = m ? 'the key' : 'the element';
    var items = [], ev = [], out = [], ex = '', dup = '-', done = 0, sum = [];
    var sortable = c.data === 'words' || c.data === 'small' || c.data === 'big';
    function less(a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0; }
    function ordered() { var a = items.slice(); if (kind === 'hash') a.sort(function (p, q) { return p.cell - q.cell || p.seq - q.seq; }); if (kind === 'tree') a.sort(function (p, q) { return less(p.x, q.x); }); return a; }
    function listStr() { return ordered().map(function (it) { return self.str(it.x); }).join(', '); }
    function printed() { var a = ordered().map(function (it) { return self.str(it.x) + (m ? '=' + it.val : ''); }).join(', '); return m ? '{' + a + '}' : '[' + a + ']'; }
    function push(s, k, cur, did) { ev.push({ s: s, k: k, snap: { items: ordered().map(function (it) { return { id: it.x[0] + it.x[1], s: self.str(it.x), val: it.val, cell: it.cell, seq: it.seq }; }), cur: cur, did: did || '', out: out.slice(), ex: ex, dup: dup, done: done } }); }
    function call(i) { return m ? 'map.put(' + self.lit(D[i]) + ', ' + (i + 1) + ')' : 'set.add(' + self.lit(D[i]) + ')'; }
    var how = { hash: cls + ' uses hashCode to compute a bucket number for each ' + what + ' and stores it in that bucket. It does not keep track of insertion order.', linked: cls + ' also picks a bucket by hashCode, but in addition it maintains a linked list that connects the entries in insertion order.', tree: cls + ' compares each new entry with the ' + what + 's that are already in it by calling compareTo and puts it in its sorted position.' }[kind];
    push((m ? 'Map<' + n.el + ', Integer> map' : 'Set<' + n.el + '> set') + ' = new ' + cls + '<>(): Creates an empty ' + cls + '. ' + how, '', -1);
    for (var i = 0; i < D.length; i++) {
      var x = D[i], id = x[0] + x[1], old = null;
      items.forEach(function (it) { if (it.x[0] + it.x[1] === id) old = it; });
      done = i + 1;
      if (kind === 'tree' && x[0] === 'n') { ex = 'NullPointerException'; push(call(i) + ': ' + cls + ' must compare ' + what + 's with compareTo on every addition, but null cannot be compared. A NullPointerException is thrown and the program stops here.', 'bad', i, 'ex'); break; }
      if (kind === 'tree' && x[0] === 'o') { ex = 'ClassCastException'; push(call(i) + ': ' + cls + ' tries to cast ' + whatObj + ' to Comparable in order to call compareTo. Task does not implement Comparable, so the cast fails and a ClassCastException is thrown. The program stops at the very first addition.', 'bad', i, 'ex'); break; }
      if (old) {
        if (m) { var prev = old.val; old.val = i + 1; dup = 'put returns the previous value (' + prev + ')'; out.push(String(prev)); push(call(i) + ': The same key is already in the map. A Map cannot contain duplicate keys, so the key stays as it is and only the value changes from ' + prev + ' to ' + (i + 1) + '. put returns the previous value, ' + prev + ', and that value is printed.' + (kind === 'linked' ? ' The key keeps position #' + old.seq + ', where it was first inserted.' : ''), '', i, 'dup'); }
        else { dup = 'add returns false'; out.push('false'); push(call(i) + ': The same element is already in the set. A Set cannot contain duplicate elements, so add does not add it and returns false, and that false is printed. The size stays at ' + items.length + '.', '', i, 'dup'); }
        continue;
      }
      var it = { x: x, val: i + 1, cell: this.cell(x), seq: i + 1 }; items.push(it);
      var s;
      if (kind === 'hash') s = (x[0] === 's' ? self.lit(x) + ' gets bucket number ' + it.cell + ', which is computed from its hashCode.' : x[0] === 'n' ? 'hashCode cannot be called on null, so ' + cls + ' is defined to put null in bucket 0. ' + (m ? 'One null key' : 'One null element') + ' is permitted.' : x[0] === 'o' ? 'The bucket number computed from the hashCode that the record provides is ' + it.cell + '.' : 'The hashCode of an Integer is the number itself and there are 16 buckets, so the bucket number is the remainder of ' + x[1] + ' ÷ 16, which is ' + it.cell + '.') + ' Iteration starts from the lowest bucket number, so the order is now ' + listStr() + '.';
      else if (kind === 'linked') s = 'It is linked at the end. The iteration order is the same as the insertion order: ' + listStr() + '.';
      else s = items.length === 1 ? 'This is the first ' + what + ', so it is simply added.' : 'It is compared with the ' + what + 's already present by compareTo, in ' + (x[0] === 's' ? 'lexicographic order' : 'numeric order') + ', and put in its sorted position. The iteration order is ' + listStr() + '.';
      push(call(i) + ': ' + s, '', i, 'new');
    }
    var res = printed(), ins = items.slice().sort(function (p, q) { return p.seq - q.seq; }).map(function (it) { return self.str(it.x); }).join(', '), sorted = sortable ? items.slice().sort(function (p, q) { return less(p.x, q.x); }).map(function (it) { return self.str(it.x); }).join(', ') : null;
    var looksSorted = kind === 'hash' && sortable && listStr() === sorted, sameIns = listStr() === ins;
    if (!ex) {
      out.push(res);
      var why = kind === 'hash' ? cls + ' iterates starting from the bucket with the lowest number. ' + (looksSorted ? 'The result looks sorted, but that is a coincidence: for an integer less than 16, the bucket number is the same as the number.' : sameIns ? 'This time the order is the same as the insertion order, but that is a coincidence.' : sortable ? 'This is neither the insertion order (' + ins + ') nor the sorted order (' + sorted + ').' : 'This differs from the insertion order (' + ins + ').') : kind === 'linked' ? cls + ' iterates in insertion order.' : cls + ' iterates over its ' + (m ? 'keys' : 'elements') + ' in sorted order, smallest first.';
      push('System.out.println(' + n.v + '): Prints the ' + (m ? 'keys and values' : 'elements') + ' by going through them one after another from the start (iteration). ' + why + ' The output is ' + res + '.', looksSorted ? 'bad' : kind === 'hash' ? '' : 'good', -1);
      out.push(String(items.length));
      push('System.out.println(' + n.v + '.size()): The code adds five times, but one ' + what + ' was a duplicate and did not go in again, so the size is ' + items.length + '.', '', -1);
      sum.push(cls + ' prints ' + res + ', and its size is ' + items.length + '.');
      if (kind === 'hash') sum.push(looksSorted ? 'HashSet and HashMap do not sort. The small integers came out looking sorted because their bucket numbers are the same as the numbers. If you change the values to 40, 5, 17, 5, 100, they come out in the order 17, 100, 5, 40.' : 'The iteration order of HashSet and HashMap is the order of the bucket numbers that hashCode determines. To a person it looks scrambled, and it can change with the Java version or with the number of entries, so do not write code that relies on this order.');
      if (kind === 'linked') sum.push('Use LinkedHashSet and LinkedHashMap when insertion order must be kept. These are the cases where things must come out the way they went in, such as the order of a list shown on the screen or the order of configuration entries.' + (m ? ' Calling put again for a key that is already present does not change the position of that key.' : ''));
      if (kind === 'tree') sum.push('Use TreeSet and TreeMap when you need sorted order, or when you need to find the smallest value or the values greater than or equal to some value. In exchange, every addition and every lookup takes several comparisons, so they are slower than the Hash kind.');
      if (kind !== 'tree' && c.data === 'null') sum.push('The Hash kind and the LinkedHash kind can hold one null. If you change the kind of collection to Tree, the same code throws an exception.');
      if (kind !== 'tree' && c.data === 'obj') sum.push('The Hash kind and the LinkedHash kind can hold any object, as long as it has equals and hashCode. The Tree kind also needs a way to compare the objects for order.');
    } else {
      sum.push(cls + ': addition #' + done + ' threw a ' + ex + ', so the program never reached the output.');
      sum.push(ex === 'NullPointerException' ? 'TreeSet and TreeMap decide positions by comparing values with each other, so they cannot hold null. HashSet and LinkedHashSet can hold one null.' : 'An object that goes into a TreeSet or a TreeMap must implement Comparable, or you must supply a way to compare (a Comparator) separately, as in new TreeSet<>(Comparator.comparingInt(Task::id)). The compiler does not catch this, and the exception is thrown at run time.');
    }
    sum.push('How to choose: the Hash kind if you do not need any order (the fastest), the LinkedHash kind if you need insertion order, and the Tree kind if you need sorted order.');
    var cells = kind === 'hash' ? ordered().map(function (it) { return it.cell; }).join(',') : '-';
    return { events: ev, summary: sum, cells: cells, stopAt: ex ? done : 0, row: [ex ? '(stopped before printing)' : res, ex ? '-' : items.length + '', dup, ex || 'none'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, n = this.names(c), m = c.shape === 'map';
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var third = c.kind === 'hash' ? 'Bucket number' : c.kind === 'linked' ? 'Inserted' : 'How the position was decided';
    H.table(v, ['Iteration order', m ? 'Key' : 'Element'].concat(m ? ['Value'] : [], [third]), s.items.map(function (it, i) { return { cells: [String(i + 1), it.s].concat(m ? [String(it.val)] : [], [c.kind === 'hash' ? 'bucket ' + it.cell : c.kind === 'linked' ? '#' + it.seq : 'compared with compareTo']) }; }), n.cls + ' contents');
    var ln = H.lanes(v);
    H.lane(ln, 'Output', s.out.length ? s.out.join('  /  ') : 'nothing yet', s.out.length ? 'good' : 'none');
    H.lane(ln, 'Exception', s.ex ? s.ex + ' (the program stops)' : 'none', s.ex ? 'bad' : 'none');
    H.counters(v, [[s.done + ' / 5', 'Additions attempted'], [s.items.length + '', 'Entries in the collection']]);
  },
  // Diagram: at the top, the five values in the order they are added in the code; at the bottom, the values in the order the collection returns them. Each addition fixes a position at the bottom.
  draw: function (P, sim, shown) {
    var c = sim.c, self = this, D = this.DATA[c.data], n = this.names(c), m = c.shape === 'map', last = shown[shown.length - 1];
    var s = last ? last.snap : { items: [], cur: -1, did: '', out: [], ex: '', dup: '-', done: 0 };
    P.size(680, 300);
    P.region('in', 16, 16, 648, 92, 'Insertion order (the order written in the code)');
    D.forEach(function (x, i) {
      var isDup = i === 3, st = i >= s.done ? 'ghost' : s.ex && i === s.done - 1 ? 'bad' : isDup ? 'plain' : 'wait';
      var short = x[0] === 's' ? '"' + x[1] + '"' : x[0] === 'n' ? 'null' : x[0] === 'o' ? 'Task(' + x[1] + ')' : String(x[1]);
      P.box('i' + i, 28 + i * 126, 48, 118, 48, { cls: st + (i === s.cur ? ' now' : ''), title: short + (m ? ', ' + (i + 1) : ''), sub: '#' + (i + 1) + (i < s.done && s.ex && i === s.done - 1 ? ': exception' : i < s.done && isDup ? ': duplicate' : '') });
    });
    P.region('st', 16, 124, 648, 104, n.cls + ' iteration order (from the left)');
    var curId = s.cur >= 0 ? D[s.cur][0] + D[s.cur][1] : '';
    s.items.forEach(function (it, k) {
      var hit = it.id === curId && (s.did === 'new' || s.did === 'dup');
      P.box('e_' + it.id, 28 + k * 158, 158, 150, 54, { cls: (hit ? (s.did === 'dup' ? 'hot' : 'good') + ' now' : 'wait'), title: it.s + (m ? '=' + it.val : ''), sub: c.kind === 'hash' ? 'bucket ' + it.cell : c.kind === 'linked' ? 'inserted #' + it.seq : 'set by comparison', from: 'i' + (it.seq - 1) });
      if (hit) P.arrow('ar', 'i' + s.cur + ':b', 'e_' + it.id + ':t', { cls: s.did === 'dup' ? 'dash' : 'good', label: s.did === 'dup' ? 'already present' : 'added' });
    });
    if (!s.items.length) P.text('empty', 340, 190, s.ex ? 'Nothing could be added' : 'empty', { cls: s.ex ? 'bad' : 'mut', anchor: 'middle' });
    if (s.ex) P.box('r1', 16, 246, 648, 38, { cls: 'bad', title: 'Stopped by an exception', right: s.ex });
    else P.box('r1', 16, 246, 648, 38, { cls: s.out.length ? 'good' : 'ghost', title: 'Output', right: s.out.length ? s.out.join('   /   ') : 'nothing yet' });
    P.note(c.kind === 'hash' ? 'The Hash kind iterates starting from the lowest bucket number computed from hashCode. So the order has nothing to do with the insertion order or with the order of the values. There are 16 buckets at first, and this lab shows the order in that state.' : c.kind === 'linked' ? 'The LinkedHash kind iterates by following the linked list that connects the entries in insertion order. Adding something that is already present does not change its position.' : 'The Tree kind compares with compareTo on every addition and puts the new entry in its sorted position. That is why null, which cannot be compared, or an object that is not Comparable causes an exception at the moment it is added.');
  },
  assume: 'The output, the size, the value returned when a duplicate is added, and the type of exception were checked for all 30 combinations against the result of running the same code on JDK 21 on this PC. The bucket numbers of HashSet and HashMap were also checked against values read from the internal array of real objects. However, the Java specification does not guarantee the iteration order of the Hash kind. The order shown here is the one on JDK 21 with 16 buckets (12 elements or fewer), and it can change with a different version or a different number of elements. The specific value that the hashCode of a record returns is not specified either, and on JDK 21 the hashCode of Task(int id) was equal to id. A TreeSet decides whether two values are the same by whether the result of compareTo is 0, not by equals. The difference in performance (the Hash kind is faster than the Tree kind) was not measured, and the lab follows the time complexity stated in the documentation.',
});
