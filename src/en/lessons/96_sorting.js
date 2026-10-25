Lab.register({
  id: 'sorting', nav: 'Sorting and Comparator', cat: 'Data structures', mode: 'step',
  title: 'Who decides the sort order, and why is comparing by subtraction wrong?',
  why: 'If sorting code is written anew for each element type or sort order, then every time you sort members by age or products by price, you have to write similar sorting code again. Comparable and Comparator are interfaces that separate out only the comparison rule. Sorting methods such as List.sort and Arrays.sort keep a single copy of the sorting procedure and ask only which of two elements comes first, through compareTo or compare, so you can swap in a different rule without changing the sorting code.',
  use: 'To show a list in order of amount or date, you pass a rule made with Comparator.comparing to list.sort or to sorted of a stream. If there is more than one rule, you chain them with thenComparing, and you make a descending order with reversed. You also pass a Comparator when you give an order to a TreeMap, a TreeSet, or a PriorityQueue.',
  intro: 'Sorting means asking "which of these two comes first?" over and over. The class can define the answer itself (Comparable), or the answer can be supplied from outside at the time of sorting (Comparator).',
  terms: ['Comparable and Comparator', 'Stable sort', 'Integer overflow', 'Method reference', 'Lambda expression'],
  controls: [
    { id: 'by', label: 'Sort order', type: 'select', value: 'sub', options: [['natural', 'Comparable: the order the class defines (by name)'], ['cmp', 'Comparator: by balance (comparingInt)'], ['then', 'Comparator: by balance, then by name when equal (thenComparing)'], ['sub', 'Comparator: subtracts the two balances (a - b)']] },
    { id: 'data', label: 'Size of the balances', type: 'select', value: 'big', options: [['normal', 'Small numbers (100 to 300)'], ['big', 'Large numbers (-2 billion to 2 billion)']], hint: 'In both cases, park and kim have the same balance, and choi and lee have the same balance.' },
    { id: 'rev', label: 'Sort in reverse (reversed)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'In what order does the list come out when large balances (-2 billion to 2 billion) are sorted by subtracting them (a - b)?', d: 'Large numbers are given to a Comparator that compares by subtraction. A wrong order comes out with no exception.', v: { by: 'sub', data: 'big', rev: false } },
    { t: 'The same code with small numbers', q: 'What if the same a - b comparison is used with small balances (100 to 300)?', d: 'The list is sorted correctly. That is why the problem does not show up in tests.', v: { by: 'sub', data: 'normal', rev: false } },
    { t: 'Fixed with comparingInt', q: 'What if you change the sort order to Comparator: by balance (comparingInt)?', d: 'The list is sorted correctly even with large numbers.', v: { by: 'cmp', data: 'big', rev: false } },
    { t: 'The order that Comparable defines', q: 'What if the sort order is Comparable, the order the class defines (by name), and the balances are small (100 to 300)?', d: 'The list is sorted by name, as the compareTo of the class says. The balances are not looked at.', v: { by: 'natural', data: 'normal', rev: false } },
    { t: 'People with the same balance', q: 'With small balances (100 to 300) sorted by comparingInt, in what order do accounts with the same balance come out?', d: 'Even when the list is sorted by balance, accounts with the same balance keep their original order.', v: { by: 'cmp', data: 'normal', rev: false } },
    { t: 'By name when equal', q: 'What if you sort by balance and then by name when equal (thenComparing), with small balances (100 to 300)?', d: 'thenComparing supplies a second sort key.', v: { by: 'then', data: 'normal', rev: false } },
    { t: 'Sorting in reverse', q: 'What if you sort by balance with comparingInt, with small balances (100 to 300), and turn on reversed?', d: 'Largest balance first. Accounts with the same balance still keep their original order.', v: { by: 'cmp', data: 'normal', rev: true } },
  ],
  DATA: {
    normal: [['park', 300], ['choi', 100], ['kim', 300], ['lee', 100], ['han', 200]],
    big: [['park', 2000000000], ['choi', -2000000000], ['kim', 2000000000], ['lee', -2000000000], ['han', 0]],
  },
  // String.compareTo in Java: the difference between the codes of the first characters that differ, or the difference between the lengths if there are none
  strCmp: function (a, b) { var n = Math.min(a.length, b.length); for (var i = 0; i < n; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) return a.charCodeAt(i) - b.charCodeAt(i); return a.length - b.length; },
  // The Comparator for the settings. The subtraction is cut down to 32 bits like a Java int (| 0)
  order: function (c) {
    var self = this, ic = function (a, b) { return a < b ? -1 : a > b ? 1 : 0; };
    var f = { natural: function (a, b) { return self.strCmp(a[0], b[0]); }, cmp: function (a, b) { return ic(a[1], b[1]); }, then: function (a, b) { return ic(a[1], b[1]) || self.strCmp(a[0], b[0]); }, sub: function (a, b) { return (a[1] - b[1]) | 0; } }[c.by];
    return c.rev ? function (a, b) { return f(b, a); } : f;
  },
  // Exactly what List.sort does for fewer than 32 elements: it finds the run at the front that is already sorted, and inserts the rest by binary search
  javaSort: function (arr, cmp) {
    var a = arr.slice(), n = a.length, hi = 1, t;
    if (n < 2) return a;
    if (cmp(a[hi++], a[0]) < 0) { while (hi < n && cmp(a[hi], a[hi - 1]) < 0) hi++; for (var i = 0, j = hi - 1; i < j; i++, j--) { t = a[i]; a[i] = a[j]; a[j] = t; } }
    else while (hi < n && cmp(a[hi], a[hi - 1]) >= 0) hi++;
    for (var s = hi; s < n; s++) { var p = a[s], l = 0, r = s; while (l < r) { var m = (l + r) >>> 1; if (cmp(p, a[m]) < 0) r = m; else l = m + 1; } for (var k = s; k > l; k--) a[k] = a[k - 1]; a[l] = p; }
    return a;
  },
  money: function (b) { return Math.abs(b) >= 100000000 ? (b / 1000000000) + ' billion' : String(b); },
  code: function (c) {
    var D = this.DATA[c.data], lit = function (x) { return 'new Account("' + x[0] + '", ' + (c.data === 'big' ? String(x[1]).replace(/000000000$/, '_000_000_000') : x[1]) + ')'; };
    var ord = { natural: 'Comparator.naturalOrder();          // uses the compareTo of Account as it is', cmp: 'Comparator.comparingInt(Account::balance);   // an order supplied from outside: by balance', then: 'Comparator.comparingInt(Account::balance)\n                                     .thenComparing(Account::owner);   // by name when the balances are equal', sub: '(a, b) -> a.balance() - b.balance();   // compares by subtraction' }[c.by];
    return 'record Account(String owner, int balance) implements Comparable<Account> {\n    @Override\n    public int compareTo(Account other) {        // the order the class defines itself: by name\n        return owner.compareTo(other.owner);\n    }\n}\n\n// From here on, the lines inside main (class, main declaration, and imports omitted)\nList<Account> list = new ArrayList<>(List.of(\n    ' + lit(D[0]) + ', ' + lit(D[1]) + ',\n    ' + lit(D[2]) + ', ' + lit(D[3]) + ',\n    ' + lit(D[4]) + '));\n\nComparator<Account> order = ' + ord + '\n' + (c.rev ? 'order = order.reversed();                         // reverse\n' : '') + 'System.out.println(order.compare(list.get(0), list.get(1)));   // park and choi\nSystem.out.println(order.compare(list.get(0), list.get(2)));   // park and kim\n\nlist.sort(order);\nSystem.out.println(list);';
  },
  label: function (c) { return { natural: 'Comparable (by name)', cmp: 'comparingInt', then: 'comparingInt + thenComparing', sub: 'subtraction' }[c.by] + ' · ' + (c.data === 'big' ? 'large numbers' : 'small numbers') + (c.rev ? ' · reversed' : ''); },
  columns: ['Sorted result', 'compare(park, choi)', 'compare(park, kim)', 'Balance order correct?'],
  simulate: function (c) {
    var self = this, D = this.DATA[c.data], cmp = this.order(c), ev = [], sum = [], rev = !!c.rev, by = c.by;
    var st = { order: D.map(function (x) { return x[0]; }), has: false, rev: false, c1: null, c2: null, sorted: false, ok: '?' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function num(v) { return v < 0 ? '(' + v + ')' : String(v); }
    function mean(v, other) { return v < 0 ? 'It is negative, so park goes before ' + other + '.' : v > 0 ? 'It is positive, so park goes after ' + other + '.' : 'Zero means that the order of the two cannot be decided, and the sort does not reorder such a pair.'; }
    var park = D[0], choi = D[1], kim = D[2];
    push('List<Account> list = new ArrayList<>(List.of(...)): A new list is created with five accounts in the order park, choi, kim, lee, han, and list refers to it. park and kim have the same balance, ' + this.money(park[1]) + ', and choi and lee have the same balance, ' + this.money(choi[1]) + '.', '');
    st.has = true;
    push({ natural: 'Comparator<Account> order = Comparator.naturalOrder(): This Comparator uses the order that Account defines for itself by implementing Comparable (compareTo, by name). It is the same order that is used when you sort without supplying a Comparator, as in Collections.sort(list).',
      cmp: 'Comparator<Account> order = Comparator.comparingInt(Account::balance): This is an order supplied from outside. It takes the balance out of each of the two accounts and compares the two numbers. The compareTo of the Account class (by name) is not used.',
      then: 'Comparator<Account> order = Comparator.comparingInt(Account::balance).thenComparing(Account::owner): This order compares the balances first and compares the names only when the balances are equal.',
      sub: 'Comparator<Account> order = (a, b) -> a.balance() - b.balance(): This uses the difference of the two balances as the result of the comparison. The code was written on the assumption that the result is negative when a is smaller, 0 when the two are equal, and positive when a is larger.' }[by], '');
    if (rev) { st.rev = true; push('order = order.reversed(): This creates a new Comparator that compares the two values with their positions swapped. The order becomes the reverse of the original one.', ''); }
    // First comparison: park and choi (two accounts with different balances)
    var c1 = cmp(park, choi), c2 = cmp(park, kim), exact = (rev ? choi[1] - park[1] : park[1] - choi[1]), over = by === 'sub' && exact !== c1, right = by === 'natural' ? true : (c1 > 0) === (rev ? park[1] < choi[1] : park[1] > choi[1]);
    st.c1 = c1;
    var d1 = by === 'natural' ? (rev ? 'With the positions swapped, the names "choi" and "park"' : 'The names "park" and "choi"') + ' are compared lexicographically. The result is ' + c1 + '. '
      : by === 'sub' ? (rev ? 'With the positions swapped, ' + num(choi[1]) + ' - ' + num(park[1]) : num(park[1]) + ' - ' + num(choi[1])) + ' is computed. ' + (over ? 'Mathematically it is ' + exact + ', but an int can hold only -2147483648 through 2147483647, so the result is out of range (overflow). The value that actually comes out is ' + c1 + '. ' : 'The result is ' + c1 + '. ')
      : (rev ? 'With the positions swapped, the balances ' + choi[1] + ' and ' + park[1] + '' : 'The balances ' + park[1] + ' and ' + choi[1] + '') + ' are compared numerically. The result is ' + c1 + '. ';
    push('order.compare(park, choi): ' + d1 + mean(c1, 'choi') + (over ? ' This answer is wrong: it says that park, which has the ' + (park[1] > choi[1] ? 'larger' : 'smaller') + ' balance, comes ' + (c1 < 0 ? 'first' : 'second') + '.' : ''), over || !right ? 'bad' : '');
    st.c2 = c2;
    var d2 = by === 'natural' ? (rev ? 'With the positions swapped, the names "kim" and "park"' : 'The names "park" and "kim"') + ' are compared lexicographically. The result is ' + c2 + '. '
      : by === 'then' ? 'The balances are equal, so the next sort key, the name, is compared. ' + (rev ? 'Because the order is reversed, "kim" and "park" are compared with their positions swapped, and the ' : '"park" and "kim" are compared, and the ') + 'result is ' + c2 + '. '
      : 'The two balances are equal, so the result is 0. ';
    push('order.compare(park, kim): ' + d2 + mean(c2, 'kim'), '');
    var sorted = this.javaSort(D, cmp), names = sorted.map(function (x) { return x[0]; }), okBal = true;
    for (var i = 1; i < sorted.length; i++) if (rev ? sorted[i - 1][1] < sorted[i][1] : sorted[i - 1][1] > sorted[i][1]) okBal = false;
    var okText = by === 'natural' ? '(balances not compared)' : okBal ? 'Correct' : 'Wrong', show = sorted.map(function (x) { return x[0] + '(' + self.money(x[1]) + ')'; }).join(', ');
    st.order = names; st.sorted = true; st.ok = okText;
    push('list.sort(order): The sort calls order.compare many times to decide the positions. The sorted order is ' + show + '.' + (by === 'natural' ? '' : okBal ? ' The accounts run from the ' + (rev ? 'largest' : 'smallest') + ' balance.' : ' The accounts should run from the ' + (rev ? 'largest' : 'smallest') + ' balance, but they do not. That is because the comparison gave a wrong answer.'), by === 'natural' ? '' : okBal ? 'good' : 'bad');
    var pk = names.indexOf('park') < names.indexOf('kim'), cl = names.indexOf('choi') < names.indexOf('lee');
    var last = by === 'natural' ? 'The names are all different, so only one order is possible. The balances were never looked at.'
      : by === 'then' ? 'park and kim, which have the same balance, ended up in the order ' + (pk ? 'park, kim' : 'kim, park') + ' according to the comparison of their names, and choi and lee ended up in the order ' + (cl ? 'choi, lee' : 'lee, choi') + '.' + (rev ? ' reversed has reversed both sort keys, the balance and the name.' : '')
      : !okBal ? 'No exception was thrown. The wrong order came out without any warning.'
      : 'park and kim, which have the same balance, keep the order they had before the sort, with park first, and choi also stays before lee. A sort that does not reorder two elements whose comparison result is 0 is called a stable sort.' + (rev ? ' The same holds when sorting in reverse, because reversing 0 still gives 0.' : '');
    push('System.out.println(list): Prints the sorted list. ' + last, by !== 'natural' && !okBal ? 'bad' : '');
    if (by === 'natural') sum.push('Comparable is a way to define one order inside the class (compareTo). Use it when the class has a natural order, such as by name. To sort by something else, supply a Comparator from outside without changing the class.');
    if (by === 'cmp') sum.push('A Comparator is an order supplied from outside at the time of sorting. It lets you sort the same list by a different sort key each time, such as by balance or by name. comparingInt compares the two numbers without subtracting, so it is safe for large numbers too.');
    if (by === 'cmp' || (by === 'sub' && okBal)) sum.push('Accounts with the same balance kept the order they had before the sort (stable sort). List.sort and Collections.sort are stable sorts.' + (rev ? ' Even when sorting in reverse, the order among equal elements is not reversed.' : ''));
    if (by === 'then') sum.push('thenComparing supplies the next sort key, which is used only when the previous one cannot decide the order (comparison result 0).' + (rev ? ' When reversed is added at the very end, everything written before it is reversed. The balances run from the largest, and the names run backward too.' : ''));
    if (by === 'sub' && !okBal) sum.push('Comparing by subtraction flips the sign when the difference of the two numbers is outside the int range (about -2.1 billion to 2.1 billion). A wrong order can come out silently without any exception, and in some cases an IllegalArgumentException is thrown. Integer.compare(a, b) and Comparator.comparingInt compare the two numbers without subtracting, so they are safe.');
    if (by === 'sub' && okBal) sum.push('With small numbers, comparing by subtraction gives the correct result. So the tests pass, and the wrong sort appears only after the values have grown large.');
    function cell(v, other) { return v + (v < 0 ? ' (negative: park first)' : v > 0 ? ' (positive: park after)' : ' (order not decided)'); }
    return { events: ev, summary: sum, names: names, c1: c1, c2: c2, row: [names.join(', '), cell(c1), cell(c2), okText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'order', !s.has ? 'not set yet' : { natural: 'by name (compareTo)', cmp: 'by balance', then: 'by balance, then by name when equal', sub: 'difference of the balances' }[c.by] + (s.rev ? ', reversed' : ''), s.has ? 'wait' : 'none');
  },
  // Diagram: at the top, the five accounts in list (their positions change when the list is sorted); in the middle, the results of the two comparisons; at the bottom, whether the balance order is correct.
  draw: function (P, sim, shown) {
    var c = sim.c, self = this, D = this.DATA[c.data], last = shown[shown.length - 1], bal = {};
    var s = last ? last.snap : { order: D.map(function (x) { return x[0]; }), has: false, rev: false, c1: null, c2: null, sorted: false, ok: '?' };
    D.forEach(function (x) { bal[x[0]] = x[1]; });
    P.size(680, 316);
    P.region('ls', 16, 16, 648, 92, s.sorted ? 'list (after sorting)' : 'list (before sorting)');
    s.order.forEach(function (o, i) { P.box('a_' + o, 28 + i * 126, 48, 118, 48, { cls: o === 'park' || o === 'kim' ? 'hot' : o === 'choi' || o === 'lee' ? 'wait' : 'plain', title: o, sub: '' + self.money(bal[o]) }); });
    P.region('cp', 16, 124, 648, 104, s.has ? 'order.compare(a, b): if negative, a comes first; if positive, a comes later' : 'The order is not set yet');
    var what = function (v) { return v === null ? 'not compared yet' : v < 0 ? 'negative: park first' : v > 0 ? 'positive: park after' : '0: order not decided'; };
    P.box('k1', 28, 156, 306, 58, { cls: s.c1 === null ? 'ghost' : sim.row[3] === 'Wrong' ? 'bad' : 'good', title: 'compare(park, choi)', sub: what(s.c1), right: s.c1 === null ? '?' : String(s.c1) });
    P.box('k2', 346, 156, 306, 58, { cls: s.c2 === null ? 'ghost' : 'good', title: 'compare(park, kim)', sub: what(s.c2), right: s.c2 === null ? '?' : String(s.c2) });
    P.box('r1', 16, 246, 648, 38, { cls: !s.sorted ? 'ghost' : s.ok === 'Wrong' ? 'bad' : s.ok === 'Correct' ? 'good' : 'plain', title: c.by === 'natural' ? 'Sorted by name' : 'Ordered from the ' + (c.rev ? 'largest' : 'smallest') + ' balance?', right: s.sorted ? s.ok : 'not sorted yet' });
    P.note('Boxes of the same color are accounts with the same balance. After the sort, check whether boxes of the same color are in the same relative order as before the sort.');
  },
  assume: 'The sorted result, the values returned by the two calls to compare, and whether the balance order is correct were checked for all 16 combinations against the result of running the same code on JDK 21 in our test environment. Of the value that compare returns, the specification defines only the sign (negative, zero, or positive). Specific numbers such as the 1 and -1 of comparingInt and the 13 and 5 of the string comparison are the values that came out on JDK 21. When you supply a comparison that breaks the rules, such as a Comparator that compares by subtraction, the sorted result depends on the internal behavior of the sorting algorithm. The wrong order in this lab is the result that List.sort on JDK 21 produces with five elements. The documentation of List.sort says that an IllegalArgumentException may be thrown if the comparator is found to violate the Comparator contract (this case was not run). The sort makes many comparisons, but the screen shows only two of them, run separately.',
});
