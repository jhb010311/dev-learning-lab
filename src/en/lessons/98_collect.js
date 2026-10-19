Lab.register({
  id: 'collect', nav: 'Collecting a stream', cat: 'Java language', mode: 'step',
  title: 'Into what shape do you collect the result of a stream?',
  intro: 'The elements that come out of a stream must be received at the end by a terminal operation such as collect before you can use them. Depending on which Collector you give it, the result is a List, a Map grouped by key, or a single string.',
  terms: ['Stream API', 'Collector and collect', 'groupingBy and partitioningBy', 'Method reference', 'List, Set, Map'],
  controls: [
    { id: 'how', label: 'How to collect (Collector)', type: 'select', value: 'toMap', options: [['toList', 'toList(): put into a List in order'], ['group', 'groupingBy(customer): group by customer'], ['count', 'groupingBy(customer, counting()): count per customer'], ['sum', 'groupingBy(customer, summingInt(price)): sum per customer'], ['part', 'partitioningBy(price >= 300): split into two'], ['join', 'joining(", "): join into a single string'], ['toMap', 'toMap(customer, price): put in as keys and values'], ['toMapMerge', 'toMap(customer, price, merge function): merge duplicates']] },
    { id: 'data', label: 'List of orders', type: 'select', value: 'dup', options: [['dup', 'The same customers order several times (kim 2 orders, han 2 orders, choi 1 order)'], ['uniq', 'All the customers are different (5 customers, 1 order each)'], ['empty', 'No orders at all']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you collect the orders (kim 2 orders, han 2 orders, choi 1 order) with toMap(customer, price)?', d: 'The same customer appears twice in toMap. An IllegalStateException is thrown.', v: { how: 'toMap', data: 'dup' } },
    { t: 'Supplying a merge function', q: 'What if you collect with toMap(customer, price, merge function)?', d: 'The values of the same key are added up into one.', v: { how: 'toMapMerge', data: 'dup' } },
    { t: 'Collecting with toList', q: 'What if you collect with toList()?', d: 'The elements go into a List in the order in which they came out.', v: { how: 'toList', data: 'dup' } },
    { t: 'Grouping with groupingBy', q: 'What if you collect with groupingBy(customer)?', d: 'A list of orders is built for each customer.', v: { how: 'group', data: 'dup' } },
    { t: 'Grouping and counting', q: 'What if you collect with groupingBy(customer, counting())?', d: 'Only the count is kept instead of the list. The type of the values is Long.', v: { how: 'count', data: 'dup' } },
    { t: 'Splitting into two with partitioningBy', q: 'What if you collect with partitioningBy(price >= 300)?', d: 'The elements are split into those for which the condition is true and those for which it is false.', v: { how: 'part', data: 'dup' } },
    { t: 'Splitting into two when there are no orders', q: 'What if you collect with partitioningBy(price >= 300) and there are no orders at all?', d: 'Even with no elements, the two entries, false and true, are always present.', v: { how: 'part', data: 'empty' } },
  ],
  DATA: {
    dup: [['kim', 300], ['han', 100], ['kim', 200], ['choi', 400], ['han', 500]],
    uniq: [['kim', 300], ['han', 100], ['jung', 200], ['choi', 400], ['kang', 500]],
    empty: [],
  },
  HOW: {
    toList: { type: 'List<String>', expr: '.map(Order::customer)\n    .collect(Collectors.toList());' },
    group: { type: 'Map<String, List<Order>>', expr: '.collect(Collectors.groupingBy(Order::customer));' },
    count: { type: 'Map<String, Long>', expr: '.collect(Collectors.groupingBy(Order::customer, Collectors.counting()));' },
    sum: { type: 'Map<String, Integer>', expr: '.collect(Collectors.groupingBy(Order::customer, Collectors.summingInt(Order::price)));' },
    part: { type: 'Map<Boolean, List<Order>>', expr: '.collect(Collectors.partitioningBy(o -> o.price() >= 300));' },
    join: { type: 'String', expr: '.map(Order::customer)\n    .collect(Collectors.joining(", "));' },
    toMap: { type: 'Map<String, Integer>', expr: '.collect(Collectors.toMap(Order::customer, Order::price));' },
    toMapMerge: { type: 'Map<String, Integer>', expr: '.collect(Collectors.toMap(Order::customer, Order::price, (a, b) -> a + b));' },
  },
  code: function (c) {
    var D = this.DATA[c.data], H = this.HOW[c.how], lit = function (x) { return 'new Order("' + x[0] + '", ' + x[1] + ')'; };
    var list = D.length ? 'List<Order> orders = List.of(\n    ' + lit(D[0]) + ', ' + lit(D[1]) + ', ' + lit(D[2]) + ',\n    ' + lit(D[3]) + ', ' + lit(D[4]) + ');' : 'List<Order> orders = List.of();                  // no orders at all';
    return 'record Order(String customer, int price) {\n    @Override\n    public String toString() { return customer + ":" + price; }   // to keep the output short\n}\n\n' + list + '\n\n' + H.type + ' result = orders.stream()\n    ' + H.expr + '\nSystem.out.println(result);';
  },
  label: function (c) { return { toList: 'toList', group: 'groupingBy', count: 'groupingBy + counting', sum: 'groupingBy + summingInt', part: 'partitioningBy', join: 'joining', toMap: 'toMap', toMapMerge: 'toMap + merge function' }[c.how] + ' · ' + { dup: 'duplicate customers', uniq: 'all customers different', empty: 'no orders' }[c.data]; },
  columns: ['Type of the result', 'Output', 'Exception'],
  simulate: function (c) {
    var D = this.DATA[c.data], h = c.how, H = this.HOW[h], ev = [], sum = [], isMap = h !== 'toList' && h !== 'join';
    var list = [], map = {}, ex = '', msg = '', done = 0, out = null;
    if (h === 'part') { map['false'] = []; map['true'] = []; }
    function keys() { return Object.keys(map).sort(); }
    function val(k) { return h === 'group' || h === 'part' ? '[' + map[k].join(', ') + ']' : String(map[k]); }
    function printed() { return h === 'toList' ? '[' + list.join(', ') + ']' : h === 'join' ? list.join(', ') : '{' + keys().map(function (k) { return k + '=' + val(k); }).join(', ') + '}'; }
    function push(s, k, idx, hit) { ev.push({ s: s, k: k, snap: { idx: idx, hit: hit || '', done: done, list: list.slice(), ents: keys().map(function (key) { return [key, val(key)]; }), ex: ex, out: out } }); }
    push(D.length ? 'orders.stream(): This creates a stream from which the 5 orders come out one at a time, in the order ' + D.map(function (x) { return x[0] + ':' + x[1]; }).join(', ') + '. Nothing has been collected yet.' : 'orders.stream(): orders is empty, so this is a stream from which no element comes out.', '', -1);
    var pre = 'collect is a terminal operation that receives the elements one at a time as they come out and puts them into a container, and the Collector in the parentheses decides which container is used and how the elements are put in. ';
    push({ toList: '.collect(Collectors.toList()): ' + pre + 'toList prepares an empty List. The map(Order::customer) before it takes only the customer name out of each order and passes it on.',
      group: '.collect(Collectors.groupingBy(Order::customer)): ' + pre + 'groupingBy prepares an empty Map. For each element, it uses customer as the key and collects the elements that have the same key into one list.',
      count: '.collect(Collectors.groupingBy(Order::customer, Collectors.counting())): ' + pre + 'groupingBy prepares an empty Map and collects the elements that have the same customer together. Because of the second argument, counting(), it only counts the elements instead of keeping a list.',
      sum: '.collect(Collectors.groupingBy(Order::customer, Collectors.summingInt(Order::price))): ' + pre + 'groupingBy prepares an empty Map and collects the elements that have the same customer together. Because of the second argument, summingInt, it only computes the sum of price instead of keeping a list.',
      part: '.collect(Collectors.partitioningBy(o -> o.price() >= 300)): ' + pre + 'partitioningBy prepares a Map that already contains a false entry and a true entry. For each element, it tests the condition and puts the element into the entry that matches the result.',
      join: '.collect(Collectors.joining(", ")): ' + pre + 'joining prepares an empty string. It appends the customer names that the map(Order::customer) before it passes on, one after another, with ", " between them.',
      toMap: '.collect(Collectors.toMap(Order::customer, Order::price)): ' + pre + 'toMap prepares an empty Map. For each element, it puts in customer as the key and price as the value. A key can have only one value.',
      toMapMerge: '.collect(Collectors.toMap(Order::customer, Order::price, (a, b) -> a + b)): ' + pre + 'toMap prepares an empty Map. For each element, it puts in customer as the key and price as the value. The third argument is the way to combine the two values into one when the same key appears again (the merge function).' }[h], '', -1);
    for (var i = 0; i < D.length && !ex; i++) {
      var name = D[i][0], price = D[i][1], tag = name + ':' + price, has = map[name] !== undefined, s, k = '', hit = name;
      done = i + 1;
      if (h === 'toList') { list.push(name); hit = ''; s = 'The customer name (' + name + ') is added to the end of the List. The List is now [' + list.join(', ') + '].'; }
      else if (h === 'join') { list.push(name); hit = ''; s = (i === 0 ? 'The string starts with the customer name (' + name + ').' : '", " is put in between, and the customer name (' + name + ') is appended.') + ' The string is now "' + list.join(', ') + '".'; }
      else if (h === 'part') { hit = String(price >= 300); map[hit].push(tag); s = 'The condition is tested. ' + price + ' >= 300 is ' + hit + ', so the order goes into the list of the ' + hit + ' entry.'; }
      else if (h === 'group') { if (!has) map[name] = []; map[name].push(tag); s = 'The key is the customer, ' + name + '. ' + (has ? 'The key is already present, so the order is added to the end of its list. That list is now [' + map[name].join(', ') + '].' : 'The key is not in the Map yet, so a new list is created and the order is put into it.'); }
      else if (h === 'count') { map[name] = (map[name] || 0) + 1; s = 'The key is the customer, ' + name + '. ' + (has ? 'The key is already present, so the count goes up from ' + (map[name] - 1) + ' to ' + map[name] + '.' : 'The key is not in the Map yet, so the count starts at 1.'); }
      else if (h === 'sum') { var before = map[name] || 0; map[name] = before + price; s = 'The key is the customer, ' + name + '. ' + (has ? 'The key is already present, so the sum ' + before + ' is increased by ' + price + '. The sum is now ' + map[name] + '.' : 'The key is not in the Map yet, so the sum starts at ' + price + '.'); }
      else if (!has) { map[name] = price; s = 'The key ' + name + ' and the value ' + price + ' are put into the Map.'; }
      else if (h === 'toMap') { ex = 'IllegalStateException'; msg = 'Duplicate key ' + name + ' (attempted merging values ' + map[name] + ' and ' + price + ')'; k = 'bad'; s = 'The same key (' + name + ') is already in the Map. The code does not say which to keep, the existing value ' + map[name] + ' or the new value ' + price + ', so an IllegalStateException is thrown and the program stops here. The exception message is "' + msg + '".'; }
      else { var old = map[name]; map[name] = old + price; k = 'good'; s = 'The same key (' + name + ') is already in the Map. The merge function (a, b) -> a + b receives the existing value ' + old + ' and the new value ' + price + ', and the returned ' + map[name] + ' becomes the value of that key.'; }
      push('Order ' + tag + ': ' + s, k, i, hit);
    }
    var res = printed(), shown = h === 'join' && !res ? '(empty string)' : res;
    if (!ex) {
      out = shown;
      var tail = h === 'toList' ? ' The names are in the order in which they came out, and a name that appears more than once is included as many times as it appears.' : h === 'join' ? (res ? ' The result is not a collection but a single string.' : ' There were no elements, so the result is an empty string, and an empty line is printed.') : h === 'part' ? ' The false entry comes first and the true entry comes second.' + (D.length ? '' : ' There was not a single element, but the two entries are still there.') : D.length ? ' The order of the entries in the Map has nothing to do with the order in which the elements came out (' + D[0][0] + ' first). Do not write code that relies on this order.' : ' There were no elements, so this is an empty Map with no keys.';
      push('System.out.println(result): The output is ' + shown + '.' + tail, 'good', -1);
    }
    if (h === 'toList') sum.push('collect(Collectors.toList()) puts the elements into a List in the order in which they came out. Duplicates go in as they are. Since Java 16, you can also write it more briefly by adding .toList() directly to the stream (but it returns an unmodifiable list).');
    if (h === 'group') sum.push('groupingBy groups the elements that have the same key and builds a Map<key, List<element>>. It is used to divide things "by something", such as orders by customer or products by category.');
    if (h === 'count') sum.push('The second argument of groupingBy decides what to do with the grouped elements. counting() counts them, and the type of the values is Long, not Integer. Assigning the result to a Map<String, Integer> is a compile-time error.');
    if (h === 'sum') sum.push('summingInt takes an int value out of each of the grouped elements and adds the values up. This shape is used often, as in a sum per customer or a sum per category.');
    if (h === 'part') sum.push('partitioningBy splits the elements into a true group and a false group by a single condition. Even when no element belongs to a group, the two keys, false and true, are always present. groupingBy does not create a key that has no elements.');
    if (h === 'join') sum.push('joining concatenates strings into a single String with a delimiter between them. Elements that are not strings must first be converted to strings with map.');
    if (h === 'toMap') sum.push(ex ? 'toMap holds only one value per key. If the data can have duplicate keys, you must either supply a merge function as the third argument or use groupingBy, which collects the duplicates into a list.' : D.length ? 'No key was duplicated, so the code finished without an exception. If you change the list of orders to "The same customers order several times", the same code throws an exception. It is common for code to pass because the test data has no duplicate keys and then to throw an exception on real data.' : 'With no elements, there are no keys that can be duplicated, so the result is an empty Map.');
    if (h === 'toMapMerge') sum.push('When the same key appears again, the merge function receives the existing value and the new value and returns the value to keep. (a, b) -> a + b keeps the sum, (a, b) -> a keeps the value that came first, and (a, b) -> b keeps the value that came later.' + (c.data === 'uniq' ? ' This time no key was duplicated, so the merge function was never called.' : ''));
    if (!D.length && h !== 'part' && h !== 'toMap') sum.push('Even when there are no orders at all, no exception is thrown and the result is empty.');
    return { events: ev, summary: sum, msg: msg, keysAll: keys(), row: [H.type, ex ? '(stopped before the output)' : shown, ex || 'none'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, h = c.how;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var ln = H.lanes(v);
    if (h === 'toList') { H.title(v, 'Contents of the List (in order)'); H.slots(v, s.list.map(function (x) { return [x, 'd']; }), 'empty'); }
    else if (h === 'join') H.lane(ln, 'Joined string', s.list.length ? '"' + s.list.join(', ') + '"' : 'empty', s.list.length ? 'good' : 'none');
    else H.table(v, ['Key', h === 'count' ? 'Value (count)' : h === 'sum' ? 'Value (sum)' : h === 'group' || h === 'part' ? 'Value (list of orders)' : 'Value (price)'], s.ents.map(function (e) { return { cells: [e[0], { v: e[1], cls: e[0] === s.hit ? (s.ex ? 'bad' : 'hot') : '' }] }; }), 'Contents of the Map (shown sorted by key)');
  },
  // Diagram: at the top, the orders that come out of the stream; at the bottom, the container that they are collected into (a List, a string, or a Map with one box per key). Each time an element goes in, an arrow goes to its box.
  draw: function (P, sim, shown) {
    var c = sim.c, h = c.how, D = this.DATA[c.data], last = shown[shown.length - 1];
    var s = last ? last.snap : { idx: -1, hit: '', done: 0, list: [], ents: h === 'part' ? [['false', '[]'], ['true', '[]']] : [], ex: '', out: null };
    P.size(680, 304);
    P.region('src', 16, 16, 648, 84, 'Elements that come out of orders.stream() (from the left)');
    D.forEach(function (x, i) {
      var sub = h === 'toList' || h === 'join' ? 'name ' + x[0] : h === 'part' ? 'test: ' + (x[1] >= 300) : 'key ' + x[0];
      P.box('o' + i, 28 + i * 126, 46, 118, 44, { cls: i >= s.done ? 'ghost' : i === s.idx ? (s.ex ? 'bad now' : 'hot now') : 'wait', title: x[0] + ':' + x[1], sub: sub });
    });
    if (!D.length) P.text('none', 340, 66, 'no elements at all', { cls: 'mut', anchor: 'middle' });
    P.region('res', 16, 112, 648, 114, 'Result container: ' + this.HOW[h].type);
    var word = { toList: 'added', join: 'appended', group: 'put in', count: 'count +1', sum: 'added', part: 'put in', toMap: 'put in', toMapMerge: 'put in' }[h];
    if (h === 'toList' || h === 'join') {
      var txt = h === 'toList' ? '[' + s.list.join(', ') + ']' : '"' + s.list.join(', ') + '"';
      P.box('L', 28, 148, 624, 56, { cls: s.list.length ? (s.idx >= 0 ? 'good now' : 'good') : 'ghost', title: h === 'toList' ? 'List' : 'String', sub: s.list.length ? txt : 'empty' });
      if (s.idx >= 0) P.arrow('ar', 'o' + s.idx + ':b', 'L:t:' + ((s.idx + 0.5) / 5), { cls: 'good', label: word });
    } else {
      var all = sim.keysAll, n = all.length, w = n ? Math.min(308, Math.floor((624 - (n - 1) * 8) / n)) : 0;
      s.ents.forEach(function (e) {
        var pos = all.indexOf(e[0]), hit = s.idx >= 0 && e[0] === s.hit, lab = h === 'part' ? e[0] + (e[0] === 'true' ? ' (300 or more)' : ' (less than 300)') : e[0];
        P.box('k_' + e[0], 28 + pos * (w + 8), 148, w, 56, { cls: hit ? (s.ex ? 'bad now' : 'good now') : e[1] === '[]' ? 'plain' : 'good', title: lab, sub: (h === 'count' ? 'count ' : h === 'sum' ? 'sum ' : h === 'toMap' || h === 'toMapMerge' ? 'value ' : '') + e[1] });
        if (hit) P.arrow('ar', 'o' + s.idx + ':b', 'k_' + e[0] + ':t', { cls: s.ex ? 'bad' : 'good', label: s.ex ? 'duplicate key' : word });
      });
      if (!s.ents.length) P.text('emp', 340, 180, 'The Map is empty', { cls: 'mut', anchor: 'middle' });
    }
    if (s.ex) P.box('r1', 16, 238, 648, 50, { cls: 'bad', title: 'Stopped by an exception', sub: s.ex + ': ' + sim.msg });
    else P.box('r1', 16, 238, 648, 50, { cls: s.out === null ? 'ghost' : 'good', title: 'Output', sub: s.out === null ? 'none yet' : s.out });
    P.note(h === 'toList' || h === 'join' ? 'The elements go into the container one at a time, in the order in which they came out.' : h === 'part' ? 'The container of partitioningBy has a false entry and a true entry from the start. Each element goes to the entry that matches the result of the condition.' : 'A Map has one entry for each key. When a key appears for the first time, a new entry is created, and when a key that is already present appears, the element goes to that entry. The entries are drawn sorted in lexicographic order of the keys.');
  },
  assume: 'The output and the exceptions (kind and message) of the 24 combinations were checked against the result of running the same code on JDK 21 in our test environment. The type of the result was confirmed by whether code that declares the result with that type actually compiles, and it was also confirmed that assigning the result of counting() to a Map<String, Integer> does not compile. The Map that groupingBy and toMap return does not guarantee an order (on JDK 21 it is a HashMap). This lab shows a Map sorted in lexicographic order of the keys, and for the customer names used here, the actual output order on JDK 21 was the same as that. With other names, the actual output order can differ. The wording of the exception message can differ between JDK versions. The lab covers only the case in which a stream handles its elements one at a time in order (a stream that is not parallel).',
});
