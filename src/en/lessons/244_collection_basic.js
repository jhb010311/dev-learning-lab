Lab.register({
  id: 'collection_basic', nav: 'List and Map', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['list', 'hashmap', 'setmap'],
  title: 'What do List and Map hold, and how do you get things out?',
  intro: 'A container that holds several values is called a collection. A List holds values in a line, in the order you put them in, and you get them out by an index that starts at 0. A Map holds keys paired with values, and you get a value out by its key. In code, as in List<String> names = new ArrayList<>();, you write the kind of container on the left (the part in angle brackets is the kind of value it holds), and the new on the right creates an empty container. You do not write a size in the parentheses. The number of stored items grows as you put things in with add or put. In this lab you switch between List and Map, and the same shape of code is compiled and run, and you see what is printed when you get something that is stored, when you get something that is not stored, and when you put the same thing in once more. (The number of stored items is printed first so that you can see it even when the program stops while getting.)',
  terms: ['List, Set, Map', 'List add() and get()', 'Map put() and get()', 'IndexOutOfBoundsException'],
  controls: [
    { id: 'kind', label: 'Container', type: 'select', value: 'list', options: [['list', 'List<String> names'], ['map', 'Map<String, Integer> ages']] },
    { id: 'ask', label: 'What you get or put in', type: 'select', value: 'has', options: [['has', 'Get something that is stored: index 0 or key "kim"'], ['none', 'Get something that is not stored: index 5 or key "park"'], ['dup', 'Put "kim" in one more time']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a List look like, and what happens when you store "kim" and "lee" and then get one with the names.get(0) line?', d: '"kim" is stored at index 0 and "lee" at index 1, and get(0) gets "kim".', v: { kind: 'list', ask: 'has' } },
    { t: 'Getting an index that is not in the List', q: 'What if you get an index that is not stored, as in the names.get(5) line?', d: 'The only stored indexes are 0 and 1, so an exception is thrown and the program stops.', v: { kind: 'list', ask: 'none' } },
    { t: 'Putting the same value in the List again', q: 'What if you write one more names.add("kim") line and put "kim" in once more?', d: 'It does not stop you. It stores one more, and the number of stored values becomes 3.', v: { kind: 'list', ask: 'dup' } },
    { t: 'Switching to Map and getting by key', q: 'What if you switch from List to Map and get the value of the key "kim" with the ages.get("kim") line?', d: 'It gets the value 20 that was paired with the key "kim".', v: { kind: 'map', ask: 'has' } },
    { t: 'Getting a key that is not in the Map', q: 'What if you get a key that was not stored from the Map with the ages.get("park") line?', d: 'No exception is thrown, and null comes out.', v: { kind: 'map', ask: 'none' } },
    { t: 'Putting the same key in the Map again', q: 'What if you write the ages.put("kim", 25) line once more with the same key "kim" in the Map?', d: 'No new pair is created. Only the value changes to 25.', v: { kind: 'map', ask: 'dup' } },
  ],
  code: function (c) {
    var L = c.kind === 'list', D = c.ask === 'dup', N = c.ask === 'none';
    var o = ['// Import java.util, which contains the collection classes', 'import java.util.*;', '', 'public class Main {', '    public static void main(String[] args) {'];
    if (L) {
      o.push('        // List: a container that holds values in a line, in the order you put them in. It starts out empty', '        List<String> names = new ArrayList<>();',
        '        // Put in: add attaches the value to the end. Indexes are numbered from 0', '        names.add("kim");', '        names.add("lee");');
      if (D) o.push('        // Put the same value, "kim", in once more', '        names.add("kim");');
      o.push('        // Count: size returns the number of stored values', '        System.out.println(names.size());',
        '        // Get: get returns the value at that index', '        System.out.println(names.get(' + (N ? '5' : '0') + '));');
    } else {
      o.push('        // Map: a container that holds keys paired with values. It starts out empty', '        Map<String, Integer> ages = new HashMap<>();',
        '        // Put in: put pairs a key with a value', '        ages.put("kim", 20);', '        ages.put("lee", 30);');
      if (D) o.push('        // Put in once more with the same key, "kim"', '        ages.put("kim", 25);');
      o.push('        // Count: size returns the number of stored pairs', '        System.out.println(ages.size());',
        '        // Get: get returns the value paired with that key', '        System.out.println(ages.get("' + (N ? 'park' : 'kim') + '"));');
    }
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.kind === 'list' ? 'List' : 'Map') + ' · ' + { has: 'Gets something stored', none: 'Gets something not stored', dup: 'Puts the same thing in once more' }[c.ask]; },
  columns: ['Value retrieved', 'Number stored', 'Exception'],
  simulate: function (c) {
    var L = c.kind === 'list', D = c.ask === 'dup', N = c.ask === 'none', ev = [], sum = [];
    var v = L ? 'names' : 'ages', cnt = D && L ? 3 : 2;
    var st = { hotIdx: -1, items: [], count: 0, out: [], cur: '', res: '', fetch: null, exc: '', stopped: false, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. Create an empty container
    st.cur = L ? 'List<String> names = new ArrayList<>();' : 'Map<String, Integer> ages = new HashMap<>();'; st.res = 'Empty container';
    st.checks.push([st.cur, { v: 'Created an empty ' + (L ? 'List' : 'Map'), cls: '' }]);
    if (L) push('You run it with java Main. The first line of main, List<String> names = new ArrayList<>();, runs. The List<String> on the left means "a List that holds strings (String)," and it decides what kind of container the variable names refers to. The new ArrayList<>() on the right creates an empty List with nothing in it, and names refers to that List. List is the name of the rules for holding values, and ArrayList is a real class built by those rules. No size is written in the parentheses. The number of stored values is 0.', '');
    else push('You run it with java Main. The first line of main, Map<String, Integer> ages = new HashMap<>();, runs. The Map<String, Integer> on the left means "keys are strings (String) and values are integers (Integer)," and it decides what kind of container the variable ages refers to. The new HashMap<>() on the right creates an empty Map with nothing in it, and ages refers to that Map. Map is the name of the rules for holding values, and HashMap is a real class built by those rules. The number of stored pairs is 0.', '');

    // 2-3. Put things in
    var adds = L ? [['kim', 'names.add("kim");'], ['lee', 'names.add("lee");']] : [['kim', 'ages.put("kim", 20);', '20'], ['lee', 'ages.put("lee", 30);', '30']];
    adds.forEach(function (a, i) {
      st.items.push(L ? [String(i), a[0]] : [a[0], a[2]]); st.count++; st.hotIdx = i; st.cur = a[1]; st.res = 'Count: ' + st.count;
      st.checks.push([a[1], { v: L ? 'Stored at index ' + i : 'Stored key (' + a[0] + ') paired with value (' + a[2] + ')', cls: 'good' }]);
      if (L) push('The line ' + a[1] + ' runs. add attaches a value to the end of the List. ' + (i === 0 ? 'It was empty, so "kim" goes in at index 0. Indexes start at 0 and are numbered in the order you put values in.' : '"lee" goes in at index 1, right after "kim".') + ' The number of stored values is ' + st.count + '.', 'good');
      else push('The line ' + a[1] + ' runs. put pairs a key with a value. ' + (i === 0 ? 'The key "kim" is paired with the value 20. The label you use later to get a value out is the key, not the value.' : 'The key "lee" is paired with the value 30.') + ' The number of stored pairs is ' + st.count + '.', 'good');
    });

    // 4. Put one more in
    if (D) {
      var line = L ? 'names.add("kim");' : 'ages.put("kim", 25);';
      st.cur = line;
      if (L) {
        st.items.push(['2', 'kim']); st.count++; st.hotIdx = 2; st.res = 'Count: 3';
        st.checks.push([line, { v: 'Stored again at index 2', cls: 'good' }]);
        push('The line ' + line + ' runs once more. "kim" is already stored, but a List can hold the same value several times. add attaches one more "kim" at the end, index 2, and the number of stored values becomes 3.', 'good');
      } else {
        st.items[0] = ['kim', '25']; st.hotIdx = 0; st.res = 'Still 2 pairs';
        st.checks.push([line, { v: 'Changed the value of key kim from 20 to 25', cls: 'good' }]);
        push('The line ' + line + ' runs. The key "kim" is already stored. A Map cannot have two of the same key, so it does not create a new pair. It changes the value 20 paired with "kim" to 25. The number of stored pairs stays at 2.', 'good');
      }
    }

    // 5. Print the count
    st.hotIdx = -1; st.cur = v + '.size()'; st.res = String(st.count); st.out.push(String(st.count));
    st.checks.push(['Print ' + v + '.size()', { v: String(st.count), cls: 'good' }]);
    push('The line System.out.println(' + v + '.size()); prints the number of ' + (L ? 'stored values' : 'stored pairs') + '. The number printed is ' + st.count + '.' + (!L && D ? ' Even though the key "kim" was put in twice, there is one pair for it, so the number is 2, not 3.' : ''), 'good');

    // 6. Get
    if (L && N) {
      st.fetch = { idx: 2, kind: 'bad' }; st.cur = 'names.get(5)'; st.res = 'IndexOutOfBoundsException'; st.exc = 'IndexOutOfBoundsException'; st.stopped = true;
      st.checks.push(['names.get(5)', { v: 'No such index: throws an exception and stops', cls: 'bad' }]);
      push('At the line System.out.println(names.get(5));, the call get(5) tries to get the value at index 5. The only stored indexes are 0 and 1, so there is no index 5. In this case get throws an IndexOutOfBoundsException (an exception that says the index is out of range) instead of returning a value. Nothing catches this exception, so the program stops at that line, and println prints nothing.', 'bad');
    } else if (L) {
      st.fetch = { idx: 0, kind: 'good' }; st.cur = 'names.get(0)'; st.res = 'kim'; st.out.push('kim');
      st.checks.push(['Print names.get(0)', { v: 'kim', cls: 'good' }]);
      push('At the line System.out.println(names.get(0));, the call get(0) returns the value at index 0, and println prints "kim". The index to get is the 0 written in the parentheses. Getting a value does not remove it from the List, so the number of stored values stays ' + st.count + '.', 'good');
    } else if (N) {
      st.fetch = { idx: 2, kind: 'none' }; st.cur = 'ages.get("park")'; st.res = 'null'; st.out.push('null');
      st.checks.push(['Print ages.get("park")', { v: 'null', cls: 'good' }]);
      push('At the line System.out.println(ages.get("park"));, the call get("park") looks for the value paired with the key park. The only keys stored are "kim" and "lee", so there is no value paired with park. In this case get does not throw an exception and returns null. null is the value returned to mean "there is no paired value," and println prints null as it is.', 'good');
    } else {
      var val = D ? '25' : '20';
      st.fetch = { idx: 0, kind: 'good' }; st.cur = 'ages.get("kim")'; st.res = val; st.out.push(val);
      st.checks.push(['Print ages.get("kim")', { v: val, cls: 'good' }]);
      push('At the line System.out.println(ages.get("kim"));, the call get("kim") returns the value paired with the key kim, and println prints that value. The value printed is ' + val + '. The key to get is the "kim" written in the parentheses.' + (D ? ' It is not the 20 that was put in first but the 25 that was put in later with the same key.' : ' Getting a value does not remove the pair from the Map, so the number of stored pairs stays ' + st.count + '.'), 'good');
    }

    // 7. The end
    if (!st.stopped) {
      st.cur = 'End of main'; st.res = '';
      push('The last line of main runs and the program ends.', 'good');
    }

    // Summary: the first line is the answer to this setting (the question)
    if (L && !N && !D) {
      sum.push('A List holds values in a line, in the order you put them in, and you get them out by an index that starts at 0. add stored "kim" and "lee" at indexes 0 and 1, and the call get(0) got "kim".');
      sum.push('No size was written in the parentheses of new ArrayList<>(), yet the number of stored values grew as much as you put in. An array has its length decided when it is created and never changes after that (section 10.2 of the Java Language Specification), but a List grows as you put values in. The values stay in the List after you get them.');
    } else if (L && N) {
      sum.push('If you get an index that is not stored from a List, you get an exception, not a value. The only stored indexes are 0 and 1, and the call get(5) threw an IndexOutOfBoundsException. Nobody caught it, so the program stopped there.');
      sum.push('The indexes you can use in a List are 0 up to (the number of stored values - 1). Even with a wrong index the code compiles, and you find out only when the run reaches that line. The count 2 was already printed by the line before it.');
    } else if (L) {
      sum.push('If you put "kim" in a List once more, it does not stop you. It stores one more, and the number of stored values becomes 3. A List can hold the same value several times, and a different index is a different slot.');
      sum.push('The call get(0) still got the "kim" that was stored first. The same value put in later is stored separately at index 2.');
    } else if (!N && !D) {
      sum.push('A Map holds keys paired with values, and you get a value out by its key. The put line paired the key kim with the value 20, and the call get("kim") got that value, so 20 was printed.');
      sum.push('A List finds things by the index in the order they were put in, and a Map finds them by key. The count 2 is the number of pairs, not the number of values.');
    } else if (N) {
      sum.push('If you get a key that was not stored from a Map, you get null, not an exception. get returned null to mean there is no paired value, and the program ran to the end without stopping.');
      sum.push('For an index that does not exist in a List, you get an exception, and for a key that does not exist in a Map, you get null. It is the same "getting something that is not there," but the results differ.');
    } else {
      sum.push('If you put in the same key "kim" once more in a Map, no new pair is created. Only the value changes. The number of stored items stays at 2, and the call get("kim") got 25, not 20.');
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
    H.counters(v, [[s.count, sim.c.kind === 'list' ? 'Values stored' : 'Pairs stored'], [s.out.length, 'Lines printed']]);
  },
  // Diagram: on the left the variable (names or ages), on the right inside a dotted frame the stored slots (a List shows indexes 0, 1, 2, a Map shows pairs of a key and a value). An arrow goes from the line being run below to the slot being read. An index or key that is not stored is shown as a dashed slot. At the bottom are the number stored and the output.
  draw: function (P, sim, shown) {
    var c = sim.c, L = c.kind === 'list', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 310);
    P.box('var', 14, 52, 184, 76, { cls: 'plain', title: L ? 'names' : 'ages', sub: L ? 'List<String>' : 'Map<String, Integer>' });
    P.region('bx', 214, 14, 452, 138, (L ? 'List' : 'Map') + ': ' + (L ? 'values' : 'pairs') + ' stored: ' + (s ? s.count : 0));
    P.arrow('ref', 'var:r', [214, 90], { cls: 'mut' });
    var extra = c.ask === 'none' || (L && c.ask === 'dup');
    for (var i = 0; i < 3; i++) {
      if (i === 2 && !extra) continue;
      var it = s ? s.items[i] : null, f = s ? s.fetch : null, x = 224 + i * 150, id = 's' + i;
      if (it) {
        var cls = s.hotIdx === i ? 'hot now' : f && f.idx === i ? 'good now' : 'plain';
        P.box(id, x, 44, 140, 84, { cls: cls, title: L ? 'Index ' + it[0] : 'Key "' + it[0] + '"', sub: L ? '"' + it[1] + '"' : 'Value ' + it[1] });
      } else if (i === 2 && c.ask === 'none') {
        var asked = f && f.idx === 2;
        P.box(id, x, 44, 140, 84, { cls: asked ? (f.kind === 'bad' ? 'bad dash' : 'wait dash') : 'ghost', title: L ? 'Index 5' : 'Key "park"', sub: asked ? (L ? 'No such index' : 'No such pair') : 'Not fetched yet' });
      } else {
        P.box(id, x, 44, 140, 84, { cls: 'ghost', title: L ? 'Index ' + i : 'Empty', sub: L ? 'Empty' : '' });
      }
    }
    var bad = s && s.exc;
    P.box('op', 14, 168, 652, 44, { cls: bad ? 'bad' : s && s.cur ? 'hot now' : 'ghost', title: s && s.cur ? s.cur : 'Line being run', right: s ? s.res : '' });
    if (s && s.fetch) { var k = s.fetch.idx; P.arrow('pt', 'op:t:' + ((224 + k * 150 + 70 - 14) / 652).toFixed(3), 's' + k + ':b:0.5', { cls: s.fetch.kind === 'good' ? 'good' : s.fetch.kind === 'bad' ? 'bad' : 'mut' }); }
    P.box('r1', 14, 224, 652, 36, { cls: s && s.count ? 'wait' : 'ghost', title: L ? 'Number of values stored' : 'Number of pairs stored', right: (s ? s.count : 0) + '' });
    P.box('r2', 14, 268, 652, 36, { cls: bad ? 'bad' : s && s.out.length ? 'good' : 'ghost', title: 'Output', right: s ? (s.out.length ? s.out.join(' / ') : '(no output yet)') + (bad ? ' / stopped by an exception' : '') : '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). All 6 combinations were checked against real runs: the same source as the code on the screen (identical line by line) was compiled with javax.tools and all of them compiled, and the compiled Main was run by starting the java of this JDK as a child process, and the standard output, the standard error, and the exit code were captured. What was checked is whether compilation succeeded, the lines of the standard output (the number stored and the value retrieved), and the exit code and the first line of the standard error (the combination that throws an exception had exit code 1 and the first line Exception in thread "main" java.lang.IndexOutOfBoundsException: Index 5 out of bounds for length 2, followed by a stack trace with Main.main in the standard error, and the others had exit code 0 and an empty standard error). The facts that the step sentences rely on were checked by running separate source in the same way. In the List, "kim" and "lee" are stored at indexes 0 and 1 (the indexOf results were 0 and 1), the number stored stays 2 after a get, and putting the same "kim" in again stores it separately at index 2 (get(2) was kim, and the count was 3). In the Map, calling put with the same key returns the old value 20 and the value becomes 25 with the pairs staying at 2, and for the key park, which was not stored, get is null and containsKey is false. For the documentation, I opened the Java SE 21 API documentation myself. That indexes in a List start at 0 and that a List can hold the same value several times, that add attaches to the end, and that get throws an IndexOutOfBoundsException for an index out of range follow java.util.List and java.util.ArrayList; that an ArrayList grows its capacity by itself as you add follows java.util.ArrayList; that a Map cannot have two of the same key, that get returns null when there is no pair, and that put replaces the old value and returns it follow java.util.Map and java.util.HashMap; that IndexOutOfBoundsException is a subclass of RuntimeException follows java.lang.IndexOutOfBoundsException; and that the length of an array does not change after it is created follows section 10.2 of the Java Language Specification (Java SE 21). I opened these documents in a way that returned summaries of their content, so I did not read every word of the original text myself. That the code compiles even with a wrong index and that the exception is thrown at run time, and the exit code 1 and the text in the standard error, were not taken from the documentation but observed with this java. The code on the screen has exactly the shape that is run with java Main, and there is no package. The number stored is printed first and the line that gets comes after it so that, even in the combination that stops while getting, the number stored can be checked in the output. The dashed slots in the diagram (index 5, key park) are drawn to point to a position where nothing is stored, and they do not mean that a real List or Map has such a slot. Other methods of List and Map (remove, contains, and so on), ways to go through all the items, Set, how the order of retrieval is decided, and storing null as a value are not covered. The difference between ArrayList and LinkedList is covered in the in-depth lab "ArrayList and LinkedList", how HashMap finds a key in "Inside HashMap", and the order of the kinds of Set and Map in "Kinds of Set and Map".',
});
