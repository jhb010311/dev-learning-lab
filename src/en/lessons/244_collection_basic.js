Lab.register({
  id: 'collection_basic', nav: 'List and Map', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['list', 'hashmap', 'setmap'],
  title: 'How do you put values into a List and a Map, and get them out?',
  why: 'An array needs its size decided when it is made, so when more values come, you must write code yourself that makes a bigger array and copies the values over, and to find a value by name you must compare from the start one by one. The List and Map that Java provides (ArrayList, HashMap, and so on) do this work for you: a List appends a value at the end with one line of add, and a Map takes out the paired value directly with one key.',
  use: 'Values to be lined up in order, such as several members read from a database or the products in a shopping cart, are handled as a List. Values for which what to search by is fixed, such as finding a member by member number or a setting value by setting name, are handled as a Map. Something that must not have the same value twice (a list of IDs already used, and so on) uses a Set.',
  intro: 'An object that gathers several values so that you can work with them together is called a collection. A collection object does not hold the values themselves inside it. It has references that point to the values (objects), one after another. A List keeps values in a line, in the order you put them in, and you get them out by an index that starts at 0. A Map keeps keys paired with values, and you get a value out by its key. In code, as in List<String> names = new ArrayList<>();, you write on the left the kind of collection that the variable can refer to (the part in angle brackets is the kind of value you put in), and the new on the right creates an empty list object. You do not write a size in the parentheses. The count (size) grows as you put things in with add or put. In this lab you switch between List and Map, and the same shape of code is compiled and run, and you see what is printed when you get something you put in, when you get something you did not put in, and when you put the same thing in once more. (The count is printed first so that you can see it even when the program stops while getting.)',
  terms: ['List, Set, Map', 'List add() and get()', 'Map put() and get()', 'IndexOutOfBoundsException'],
  controls: [
    { id: 'kind', label: 'Collection type', type: 'select', value: 'list', options: [['list', 'List<String> names'], ['map', 'Map<String, Integer> ages']] },
    { id: 'ask', label: 'What you get or put in', type: 'select', value: 'has', options: [['has', 'Get something you put in: index 0 or key "kim"'], ['none', 'Get something you did not put in: index 5 or key "park"'], ['dup', 'Put "kim" in one more time']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a List look like, and what happens when you put in "kim" and "lee" and then get one with the names.get(0) line?', d: 'Index 0 refers to "kim" and index 1 to "lee", and get(0) gets "kim".', v: { kind: 'list', ask: 'has' } },
    { t: 'Getting an index that is not in the List', q: 'What if you get an index that does not exist, as in the names.get(5) line?', d: 'The only indexes are 0 and 1, so an exception is thrown and the program stops.', v: { kind: 'list', ask: 'none' } },
    { t: 'Putting the same value in the List again', q: 'What if you write one more names.add("kim") line and put "kim" in once more?', d: 'It does not stop you. It puts in one more, and the count becomes 3.', v: { kind: 'list', ask: 'dup' } },
    { t: 'Switching to Map and getting by key', q: 'What if you switch from List to Map and get the value of the key "kim" with the ages.get("kim") line?', d: 'It gets the value 20 that was paired with the key "kim".', v: { kind: 'map', ask: 'has' } },
    { t: 'Getting a key that is not in the Map', q: 'What if you get a key that you did not put into the Map with the ages.get("park") line?', d: 'No exception is thrown, and null comes out.', v: { kind: 'map', ask: 'none' } },
    { t: 'Putting the same key in the Map again', q: 'What if you write the ages.put("kim", 25) line once more with the same key "kim" in the Map?', d: 'No new pair is created. Only the value changes to 25.', v: { kind: 'map', ask: 'dup' } },
  ],
  code: function (c) {
    var L = c.kind === 'list', D = c.ask === 'dup', N = c.ask === 'none';
    var o = ['// Import java.util, which contains the collection classes', 'import java.util.*;', '', 'public class Main {', '    public static void main(String[] args) {'];
    if (L) {
      o.push('        // List: a collection that keeps values in a line, in the order you put them in. It starts out empty', '        List<String> names = new ArrayList<>();',
        '        // Put in: add attaches the value to the end. Indexes are numbered from 0', '        names.add("kim");', '        names.add("lee");');
      if (D) o.push('        // Put the same value, "kim", in once more', '        names.add("kim");');
      o.push('        // Count: size returns the number of values the list has', '        System.out.println(names.size());',
        '        // Get: get returns the value at that index', '        System.out.println(names.get(' + (N ? '5' : '0') + '));');
    } else {
      o.push('        // Map: a collection that pairs keys with values. It starts out empty', '        Map<String, Integer> ages = new HashMap<>();',
        '        // Put in: put pairs a key with a value', '        ages.put("kim", 20);', '        ages.put("lee", 30);');
      if (D) o.push('        // Put in once more with the same key, "kim"', '        ages.put("kim", 25);');
      o.push('        // Count: size returns the number of pairs the map has', '        System.out.println(ages.size());',
        '        // Get: get returns the value paired with that key', '        System.out.println(ages.get("' + (N ? 'park' : 'kim') + '"));');
    }
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.kind === 'list' ? 'List' : 'Map') + ' · ' + { has: 'Gets something put in', none: 'Gets something not put in', dup: 'Puts the same thing in once more' }[c.ask]; },
  columns: ['Value retrieved', 'Count (size)', 'Exception'],
  simulate: function (c) {
    var L = c.kind === 'list', D = c.ask === 'dup', N = c.ask === 'none', ev = [], sum = [];
    var v = L ? 'names' : 'ages', cnt = D && L ? 3 : 2;
    var st = { hotIdx: -1, items: [], count: 0, out: [], cur: '', res: '', fetch: null, exc: '', stopped: false, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. Create an empty collection object
    st.cur = L ? 'List<String> names = new ArrayList<>();' : 'Map<String, Integer> ages = new HashMap<>();'; st.res = L ? 'Empty List' : 'Empty Map';
    st.checks.push([st.cur, { v: 'Created an empty ' + (L ? 'List' : 'Map'), cls: '' }]);
    if (L) push('You run it with java Main. The first line of main, List<String> names = new ArrayList<>();, runs. The List<String> on the left means "a List that has references to String objects," and it decides what kind of object the variable names can refer to. The new ArrayList<>() on the right creates an empty List object with nothing put in it, and names refers to that object (what names stores is a reference that points to the object, not the object itself). List is the name of the rules for putting values in and getting them out, and ArrayList is a real class built by those rules. No size is written in the parentheses. The number of values it has is 0.', '');
    else push('You run it with java Main. The first line of main, Map<String, Integer> ages = new HashMap<>();, runs. The Map<String, Integer> on the left means "keys are strings (String) and values are integers (Integer)," and it decides what kind of object the variable ages can refer to. The new HashMap<>() on the right creates an empty Map with no pairs, and ages refers to that Map. Map is the name of the rules for pairing keys with values and getting them out, and HashMap is a real class built by those rules. The number of pairs it has is 0.', '');

    // 2-3. Put things in
    var adds = L ? [['kim', 'names.add("kim");'], ['lee', 'names.add("lee");']] : [['kim', 'ages.put("kim", 20);', '20'], ['lee', 'ages.put("lee", 30);', '30']];
    adds.forEach(function (a, i) {
      st.items.push(L ? [String(i), a[0]] : [a[0], a[2]]); st.count++; st.hotIdx = i; st.cur = a[1]; st.res = 'Count: ' + st.count;
      st.checks.push([a[1], { v: L ? 'Put in at index ' + i : 'Paired key (' + a[0] + ') with value (' + a[2] + ')', cls: 'good' }]);
      if (L) push('The line ' + a[1] + ' runs. add attaches a value to the end of the List. ' + (i === 0 ? 'It was empty, so "kim" goes in at index 0. Indexes start at 0 and are numbered in the order you put values in.' : '"lee" goes in at index 1, right after "kim".') + ' The number of values it has is ' + st.count + '.', 'good');
      else push('The line ' + a[1] + ' runs. put pairs a key with a value. ' + (i === 0 ? 'The key "kim" is paired with the value 20. The label you use later to get a value out is the key, not the value.' : 'The key "lee" is paired with the value 30.') + ' The number of pairs it has is ' + st.count + '.', 'good');
    });

    // 4. Put one more in
    if (D) {
      var line = L ? 'names.add("kim");' : 'ages.put("kim", 25);';
      st.cur = line;
      if (L) {
        st.items.push(['2', 'kim']); st.count++; st.hotIdx = 2; st.res = 'Count: 3';
        st.checks.push([line, { v: 'Put in again at index 2', cls: 'good' }]);
        push('The line ' + line + ' runs once more. "kim" was already put in, but you can put the same value into a List several times. add attaches one more "kim" at the end, index 2, and the number of values it has becomes 3.', 'good');
      } else {
        st.items[0] = ['kim', '25']; st.hotIdx = 0; st.res = 'Still 2 pairs';
        st.checks.push([line, { v: 'Changed the value of key kim from 20 to 25', cls: 'good' }]);
        push('The line ' + line + ' runs. The key "kim" is already there. A Map cannot have two of the same key, so it does not create a new pair. It changes the value 20 paired with "kim" to 25. The number of pairs it has stays at 2.', 'good');
      }
    }

    // 5. Print the count
    st.hotIdx = -1; st.cur = v + '.size()'; st.res = String(st.count); st.out.push(String(st.count));
    st.checks.push(['Print ' + v + '.size()', { v: String(st.count), cls: 'good' }]);
    push('The line System.out.println(' + v + '.size()); prints the number of ' + (L ? 'values the List has' : 'pairs the Map has') + '. The number printed is ' + st.count + '.' + (!L && D ? ' Even though the key "kim" was put in twice, there is one pair for it, so the number is 2, not 3.' : ''), 'good');

    // 6. Get
    if (L && N) {
      st.fetch = { idx: 2, kind: 'bad' }; st.cur = 'names.get(5)'; st.res = 'IndexOutOfBoundsException'; st.exc = 'IndexOutOfBoundsException'; st.stopped = true;
      st.checks.push(['names.get(5)', { v: 'No such index: throws an exception and stops', cls: 'bad' }]);
      push('At the line System.out.println(names.get(5));, the call get(5) tries to get the value at index 5. The only indexes are 0 and 1, so there is no index 5. In this case get throws an IndexOutOfBoundsException (an exception that says the index is out of range) instead of returning a value. Nothing catches this exception, so the program stops at that line, and println prints nothing.', 'bad');
    } else if (L) {
      st.fetch = { idx: 0, kind: 'good' }; st.cur = 'names.get(0)'; st.res = 'kim'; st.out.push('kim');
      st.checks.push(['Print names.get(0)', { v: 'kim', cls: 'good' }]);
      push('At the line System.out.println(names.get(0));, the call get(0) returns the value at index 0, and println prints "kim". The index to get is the 0 written in the parentheses. Getting a value does not remove it from the List, so the number of values it has stays ' + st.count + '.', 'good');
    } else if (N) {
      st.fetch = { idx: 2, kind: 'none' }; st.cur = 'ages.get("park")'; st.res = 'null'; st.out.push('null');
      st.checks.push(['Print ages.get("park")', { v: 'null', cls: 'good' }]);
      push('At the line System.out.println(ages.get("park"));, the call get("park") looks for the value paired with the key park. The only keys put in are "kim" and "lee", so there is no value paired with park. In this case get does not throw an exception and returns null. null is the value returned to mean "there is no paired value," and println prints null as it is.', 'good');
    } else {
      var val = D ? '25' : '20';
      st.fetch = { idx: 0, kind: 'good' }; st.cur = 'ages.get("kim")'; st.res = val; st.out.push(val);
      st.checks.push(['Print ages.get("kim")', { v: val, cls: 'good' }]);
      push('At the line System.out.println(ages.get("kim"));, the call get("kim") returns the value paired with the key kim, and println prints that value. The value printed is ' + val + '. The key to get is the "kim" written in the parentheses.' + (D ? ' It is not the 20 that was put in first but the 25 that was put in later with the same key.' : ' Getting a value does not remove the pair from the Map, so the number of pairs it has stays ' + st.count + '.'), 'good');
    }

    // 7. The end
    if (!st.stopped) {
      st.cur = 'End of main'; st.res = '';
      push('The last line of main runs and the program ends.', 'good');
    }

    // Summary: the first line is the answer to this setting (the question)
    if (L && !N && !D) {
      sum.push('A List keeps values in a line, in the order you put them in, and you get them out by an index that starts at 0. add put "kim" and "lee" at indexes 0 and 1, and the call get(0) got "kim".');
      sum.push('No size was written in the parentheses of new ArrayList<>(), yet the count grew as much as you put in. An array has its length decided when it is created and never changes after that (section 10.2 of the Java Language Specification), but a List grows as you put values in. The values stay in the List after you get them.');
    } else if (L && N) {
      sum.push('If you get an index that does not exist from a List, you get an exception, not a value. The only indexes are 0 and 1, and the call get(5) threw an IndexOutOfBoundsException. Nobody caught it, so the program stopped there.');
      sum.push('The indexes you can use in a List are 0 up to (the count - 1). Even with a wrong index the code compiles, and you find out only when the run reaches that line. The count 2 was already printed by the line before it.');
    } else if (L) {
      sum.push('If you put "kim" in a List once more, it does not stop you. It puts in one more, and the count becomes 3. You can put the same value into a List several times, and a different index is a different slot.');
      sum.push('The call get(0) still got the "kim" that was put in first. The same value put in later is referred to by a different slot, index 2.');
    } else if (!N && !D) {
      sum.push('A Map keeps keys paired with values, and you get a value out by its key. The put line paired the key kim with the value 20, and the call get("kim") got that value, so 20 was printed.');
      sum.push('A List finds things by the index in the order they were put in, and a Map finds them by key. The count 2 is the number of pairs, not the number of values.');
    } else if (N) {
      sum.push('If you get a key that you did not put into a Map, you get null, not an exception. get returned null to mean there is no paired value, and the program ran to the end without stopping.');
      sum.push('For an index that does not exist in a List, you get an exception, and for a key that does not exist in a Map, you get null. It is the same "getting something that is not there," but the results differ.');
    } else {
      sum.push('If you put in the same key "kim" once more in a Map, no new pair is created. Only the value changes. The count stays at 2, and the call get("kim") got 25, not 20.');
      sum.push('If you put the same value in a List again, the count grows, but if you put the same key in a Map again, only the value changes. A Map can have only one of each key.');
    }
    var got2 = st.stopped ? 'Not retrieved' : st.out[1];
    return { events: ev, summary: sum, row: [got2, String(st.count), st.stopped ? 'Stopped by IndexOutOfBoundsException' : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to run main one line at a time, from the first line.'); return; }
    H.table(v, ['Line run', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Run');
    if (s.out.length) H.table(v, ['Output'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), 'Standard output');
    H.counters(v, [[s.count, sim.c.kind === 'list' ? 'Values it has' : 'Pairs it has'], [s.out.length, 'Lines printed']]);
  },
  // Diagram: on the left the variable (names or ages); the dotted frame on the right is the collection object that variable refers to. Inside the frame goes only what that object has (a List has one reference per index slot, a Map has a key reference and a value reference per pair). The values (String and Integer objects) are drawn separately outside the frame and joined by "refers" arrows.
  // Adding the same "kim" twice makes index 0 and index 2 refer to the same String object (the same string literal is the same object, JLS 3.10.5; on JDK 21 get(0) == get(2) was true). Map values are Integer objects boxed from int (JLS 5.1.7; when run, get returned a java.lang.Integer), and putting with the same key again makes the pair's value reference point to a different Integer object (the get results before and after put differ under ==).
  // An index or key that does not exist is shown as a dashed slot outside the frame, on the left. An arrow goes from the line being run below to the value read (or to the missing slot). At the bottom are the count and the output.
  draw: function (P, sim, shown) {
    var c = sim.c, L = c.kind === 'list', D = c.ask === 'dup', N = c.ask === 'none', last = shown[shown.length - 1], s = last ? last.snap : null;
    var items = s ? s.items : [], f = s ? s.fetch : null, two = !L || D, top = two ? 294 : 222, cx = { gh: 97 };
    P.size(680, top + 142);
    P.box('var', 14, 40, 166, 52, { cls: 'plain', title: L ? 'names' : 'ages', sub: L ? 'List<String>' : 'Map<String, Integer>' });
    P.region('bx', 226, 14, 440, 84, (L ? 'ArrayList object, size ' : 'HashMap object, size ') + items.length + '');
    P.arrow('ref', 'var:r', [226, 66], { cls: 'mut', label: 'refers' });
    if (!items.length) P.text('emp', 446, 70, L ? 'No values referenced yet' : 'No pairs yet', { cls: 'mut', anchor: 'middle' });
    function st(i) { return s.hotIdx === i ? 'hot' : f && f.kind === 'good' && f.idx === i ? 'good' : ''; }
    if (L) {
      // List: slot i is at x = 238 + i * 142. One box per distinct value. In the combination where index 0 and 2 refer to the same "kim" (D), "kim" goes in the middle of the lower row so the arrows do not overlap.
      var objs = [];
      items.forEach(function (it, i) {
        var k = st(i), v = it[1];
        P.box('s' + i, 238 + i * 142, 40, 130, 46, { cls: k ? k + (k === 'hot' ? ' now' : '') : 'plain', title: 'Index ' + it[0], sub: 'reference' });
        if (objs.indexOf(v) < 0) {
          // Color of a value box: light it up together with any slot referring to it that is lit now
          var ox = D ? 380 : 238 + objs.length * 142, oc = items.reduce(function (a, b, n) { return b[1] === v && st(n) ? st(n) : a; }, '');
          objs.push(v); cx['o_' + v] = ox + 65;
          P.box('o_' + v, ox, D && v === 'kim' ? 222 : 150, 130, 48, { cls: oc === 'good' ? 'good now' : oc || 'plain', title: 'String object', sub: '"' + v + '"' });
        }
        P.arrow('rf' + i, 's' + i + ':b', 'o_' + v + (D && v === 'kim' ? (i === 0 ? ':l' : ':r') : ':t'), { cls: k || 'mut', label: 'refers' });
      });
    } else {
      // Map: the column of pair i is at x0 = 238 + i * 210. Under the pair, the key (String object) goes on the upper row to the left and the value (Integer object) on the lower row to the right, so the value arrow passes beside the key box.
      items.forEach(function (it, i) {
        var k = st(i), x0 = 238 + i * 210, vid = 'v' + i + '_' + it[1];
        cx[vid] = x0 + 141;
        P.box('e' + i, x0 + 20, 40, 166, 46, { cls: k ? k + (k === 'hot' ? ' now' : '') : 'plain', title: 'Pair', sub: 'key and value refs' });
        P.box('k' + i, x0, 150, 122, 48, { cls: k === 'good' ? 'good' : k || 'plain', title: 'String object', sub: '"' + it[0] + '"' });
        P.box(vid, x0 + 76, 222, 130, 48, { cls: k === 'good' ? 'good now' : k || 'plain', title: 'Integer object', sub: it[1] });
        P.arrow('ek' + i, 'e' + i + ':b:0.18', 'k' + i + ':t', { cls: k || 'mut', label: 'refers' });
        P.arrow('ev' + i, 'e' + i + ':b:0.85', vid + ':t', { cls: k || 'mut', label: 'refers' });
      });
    }
    if (N) {
      var asked = f && f.idx === 2;
      P.box('gh', 14, 150, 166, 48, { cls: asked ? (f.kind === 'bad' ? 'bad dash' : 'wait dash') : 'ghost', title: L ? 'Index 5' : 'Pair for key "park"', sub: asked ? (L ? 'No such index' : 'No such pair') : 'Not fetched yet' });
    }
    var bad = s && s.exc;
    P.box('op', 14, top, 652, 44, { cls: bad ? 'bad' : s && s.cur ? 'hot now' : 'ghost', title: s && s.cur ? s.cur : 'Line being run', right: s ? s.res : '' });
    if (f) { var to = N ? 'gh' : L ? 'o_kim' : 'v0_' + items[0][1]; P.arrow('pt', 'op:t:' + ((cx[to] - 14) / 652).toFixed(3), to + ':b', { cls: f.kind === 'good' ? 'good' : f.kind === 'bad' ? 'bad' : 'mut' }); }
    P.box('r1', 14, top + 56, 652, 36, { cls: s && s.count ? 'wait' : 'ghost', title: L ? 'Number of values it has' : 'Number of pairs it has', right: (s ? s.count : 0) + '' });
    P.box('r2', 14, top + 100, 652, 36, { cls: bad ? 'bad' : s && s.out.length ? 'good' : 'ghost', title: 'Output', right: s ? (s.out.length ? s.out.join(' / ') : '(no output yet)') + (bad ? ' / stopped by an exception' : '') : '' });
    if (L) P.note(items.length === 3 ? 'The "kim" added twice is the same string literal, so both are the same String object. Index 0 and index 2 both refer to that one object.' : 'The ArrayList object has one reference per slot, each referring to a value (a String object). The values are objects separate from the ArrayList.');
    else P.note(D && items.length && items[0][1] === '25' ? 'Putting with the same key again keeps the pair, and the value reference of that pair now points to a different Integer object (25).' : 'The HashMap object has, for each pair, a reference to the key (a String object) and one to the value (an Integer object). The int values passed to put, such as 20 and 30, are converted to Integer objects (boxing).');
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). All 6 combinations were checked against real runs: the same source as the code on the screen (identical line by line) was compiled with javax.tools and all of them compiled, and the compiled Main was run by starting the java of this JDK as a child process, and the standard output, the standard error, and the exit code were captured. What was checked is whether compilation succeeded, the lines of the standard output (the count and the value retrieved), and the exit code and the first line of the standard error (the combination that throws an exception had exit code 1 and the first line Exception in thread "main" java.lang.IndexOutOfBoundsException: Index 5 out of bounds for length 2, followed by a stack trace with Main.main in the standard error, and the others had exit code 0 and an empty standard error). The facts that the step sentences rely on were checked by running separate source in the same way. In the List, "kim" and "lee" go in at indexes 0 and 1 (the indexOf results were 0 and 1), the count stays 2 after a get, and putting the same "kim" in again makes a separate slot at index 2 (get(2) was kim, and the count was 3). In the Map, calling put with the same key returns the old value 20 and the value becomes 25 with the pairs staying at 2, and for the key park, which was not put in, get is null and containsKey is false. For the documentation, I opened the Java SE 21 API documentation myself. That indexes in a List start at 0 and that the same value can be put into a List several times, that add attaches to the end, and that get throws an IndexOutOfBoundsException for an index out of range follow java.util.List and java.util.ArrayList; that an ArrayList grows its capacity by itself as you add follows java.util.ArrayList; that a Map cannot have two of the same key, that get returns null when there is no pair, and that put replaces the old value and returns it follow java.util.Map and java.util.HashMap; that IndexOutOfBoundsException is a subclass of RuntimeException follows java.lang.IndexOutOfBoundsException; and that the length of an array does not change after it is created follows section 10.2 of the Java Language Specification (Java SE 21). I opened these documents in a way that returned summaries of their content, so I did not read every word of the original text myself. That the code compiles even with a wrong index and that the exception is thrown at run time, and the exit code 1 and the text in the standard error, were not taken from the documentation but observed with this java. The code on the screen has exactly the shape that is run with java Main, and there is no package. The count is printed first and the line that gets comes after it so that, even in the combination that stops while getting, the count can be checked in the output. The dashed slots in the diagram (index 5, key park) are drawn to point to a position that does not exist, and they do not mean that a real List or Map has such a slot. Other methods of List and Map (remove, contains, and so on), ways to go through all the items, Set, how the order of retrieval is decided, and putting null in as a value are not covered. The difference between ArrayList and LinkedList is covered in the in-depth lab "ArrayList and LinkedList", how HashMap finds a key in "Inside HashMap", and the order of the kinds of Set and Map in "Kinds of Set and Map".',
});
