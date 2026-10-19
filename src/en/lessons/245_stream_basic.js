Lab.register({
  id: 'stream_basic', nav: 'Streams', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['stream', 'collect'],
  title: 'What is a stream, and how is it different from a for loop?',
  intro: 'A stream is a way to pass the values in a collection (something like a list that holds several values) along one at a time, filtering and transforming them. In code, you start with nums.stream() and chain steps one after another with a dot (.). .filter(n -> n % 2 == 0) is the filtering step. The n -> ... is a short function (a lambda expression) that takes a value n and returns a computed answer. Here it checks whether the remainder of n divided by 2 is 0 (whether n is even), and lets only the values for which it is true pass. .map(n -> n * 10) is the transforming step, and it turns each value that passed into 10 times its size. .toList() is the last step, and it collects the values that came out into a list. To do the same task with a for loop, you have to write all of this yourself: create a new list to hold the result, take values out one at a time, check the condition with if, and store with add. In this lab you put the stream and the for loop side by side and remove the filter line and the map line one at a time. The same code is compiled and run, and you see what is stored in result and whether the original list nums changes. (The import line and the main method are shortened on the screen.)',
  terms: ['Stream API', 'Lambda expression', 'filter() and map()', 'toList() and the result of a stream'],
  controls: [
    { id: 'style', label: 'How to write the same task', type: 'select', value: 'stream', options: [['stream', 'Stream: chain steps after nums.stream()'], ['for', 'for loop: create a new list, then take values out and store them one at a time']] },
    { id: 'filter', label: '.filter(n -> n % 2 == 0) line (if in the for loop)', type: 'check', value: true },
    { id: 'map', label: '.map(n -> n * 10) line (* 10 in the for loop)', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a stream look like, and what is stored in result?', d: 'A stream with filter and map. Only the even numbers remain and become 10 times larger, and nums is unchanged.', v: { style: 'stream', filter: true, map: true } },
    { t: 'Writing the same task as a for loop', q: 'What if you write the same task as a for loop?', d: 'The result is the same, and you write everything yourself, from creating a new list to storing in it.', v: { style: 'for', filter: true, map: true } },
    { t: 'Removing the .filter line', q: 'What if you remove the .filter(n -> n % 2 == 0) line?', d: 'There is no filtering step, so every value becomes 10 times larger and is stored.', v: { style: 'stream', filter: false, map: true } },
    { t: 'Removing the .map line', q: 'What if you remove the .map(n -> n * 10) line?', d: 'There is no transforming step, so the values that pass are stored as they are.', v: { style: 'stream', filter: true, map: false } },
    { t: 'Removing both', q: 'What if you remove both the .filter line and the .map line?', d: 'Nothing is filtered or transformed, so the same values as nums are stored.', v: { style: 'stream', filter: false, map: false } },
  ],
  nums: [1, 2, 3, 4, 5, 6],
  // The code on the screen. In a stream each line is one step; in a for loop the new list, the loop, the if, and the add do the same work
  code: function (c) {
    var o = ['// Only the lines inside main are shown (class, main declaration, and imports omitted)', 'List<Integer> nums = List.of(1, 2, 3, 4, 5, 6);'];
    if (c.style === 'stream') {
      o.push('// Stream: create a flow that passes the values of nums along one at a time', 'List<Integer> result = nums.stream()');
      if (c.filter) o.push('    // Filter: let only the even values pass', '    .filter(n -> n % 2 == 0)');
      if (c.map) o.push('    // Transform: turn each value that passed into 10 times its size', '    .map(n -> n * 10)');
      o.push('    // Collect: put the values that came out into a new list', '    .toList();');
    } else {
      var ind = c.filter ? '        ' : '    ';
      o.push('// New list: create the empty list that will hold the result yourself', 'List<Integer> result = new ArrayList<>();', '// Loop: take values out of nums one at a time and put each in n', 'for (int n : nums) {');
      if (c.filter) o.push('    // Filter: let only the even values pass', '    if (n % 2 == 0) {');
      o.push(ind + (c.map ? '// Transform and store: make it 10 times larger and add it to result' : '// Store: add it to result as it is'), ind + (c.map ? 'result.add(n * 10);' : 'result.add(n);'));
      if (c.filter) o.push('    }');
      o.push('}');
    }
    o.push('System.out.println(result);', 'System.out.println(nums);');
    return o.join('\n');
  },
  label: function (c) { return (c.style === 'stream' ? 'Stream' : 'for loop') + ' · ' + (c.filter ? (c.style === 'stream' ? 'with filter' : 'with if') : (c.style === 'stream' ? 'no filter' : 'no if')) + ' · ' + (c.map ? 'with * 10' : 'no * 10'); },
  columns: ['result', 'Original list nums', 'Steps written in the code'],
  simulate: function (c) {
    var ev = [], sum = [], st0 = c.style === 'stream', fOn = !!c.filter, mOn = !!c.map, V = this.nums.slice();
    var F = st0 ? 'filter' : 'if', M = st0 ? 'map' : 'add';
    var st = { numsMade: false, made: false, cur: null, note: '', stage: '', dropped: [], got: [], hist: [], checked: 0, out: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function list(a) { return '[' + a.join(', ') + ']'; }
    var trace = [], result = [];
    V.forEach(function (v) {
      var pass = !fOn || v % 2 === 0;
      if (fOn) trace.push(F + '(' + v + ')');
      if (pass) { var x = mOn ? v * 10 : v; result.push(x); trace.push(st0 ? (mOn ? 'map(' + v + ')' : null) : 'add(' + x + ')'); }
    });
    trace = trace.filter(function (t) { return t; });
    var res = list(result), numsTxt = list(V);

    // 1. Create nums
    st.numsMade = true; st.stage = 'nm';
    push('The line List<Integer> nums = List.of(1, 2, 3, 4, 5, 6); creates a list nums that holds 6 values in this order. This list is the source of the values to be filtered and transformed from here on.', '');
    // 2. Create the stream, or create a new list
    if (st0) {
      st.stage = 'nm';
      push('The line nums.stream() creates a flow that passes the values in nums along one at a time, that is, a stream. A stream is not a place that stores values. It is a pipeline that takes values from nums one at a time and passes them to the next step. What is chained below (' + [fOn ? '.filter' : null, mOn ? '.map' : null, '.toList'].filter(function (t) { return t; }).join(', ') + ') adds steps to that pipeline. When the .toList() line at the end runs, the values start to flow.', '');
    } else {
      st.made = true; st.stage = 'rs';
      push('The line List<Integer> result = new ArrayList<>(); creates a new empty list result. When you write it with a for loop, you have to create the container for the result yourself.', '');
      st.stage = 'nm';
      push('The line for (int n : nums) takes values out of nums one at a time from the front. Each time it takes a value, it puts it in n and runs the lines inside the braces. This is also a loop that you wrote yourself.', '');
    }
    // 3. One value at a time
    V.forEach(function (v, i) {
      var pass = !fOn || v % 2 === 0, x = mOn ? v * 10 : v, pre = st0 ? 'Value ' + v + ': ' : 'n = ' + v + ': ';
      st.cur = v; st.note = '';
      if (fOn) {
        st.stage = 'fl'; st.checked++;
        var rem = v % 2;
        if (pass) {
          st.note = 'Passed';
          push(pre + (st0 ? 'filter evaluates the expression n % 2 == 0. ' : 'The line if (n % 2 == 0) checks the condition. ') + v + ' % 2 leaves a remainder of ' + rem + ', so the result is true, and ' + (st0 ? 'this value passes to the next step.' : 'the program goes inside the braces.'), '');
        } else {
          st.dropped.push(v); st.note = 'Dropped'; st.hist.push([String(v), 'Dropped', 'gone']);
          push(pre + (st0 ? 'filter evaluates the expression n % 2 == 0. ' : 'The line if (n % 2 == 0) checks the condition. ') + v + ' % 2 leaves a remainder of ' + rem + ', so the result is false, and ' + (st0 ? 'this value is dropped. A dropped value ' + (mOn ? 'does not reach map and ' : '') + 'is not stored in result.' : 'the program skips the inside of the braces. Nothing is stored in result.'), '');
          return;
        }
      }
      if (mOn) {
        st.stage = 'mp'; st.got.push(x); st.hist.push([String(v), x + ' stored', 'good']); st.note = v + ' → ' + x;
        if (st0) push(pre + 'map evaluates the expression n * 10 and transforms the value. n * 10 is ' + x + ', and the transformed value flows toward toList and is collected.', 'good');
        else push(pre + 'The line result.add(n * 10) runs. n * 10 is ' + x + ', and this value is added to the end of result.', 'good');
      } else {
        st.stage = st0 ? 'rs' : 'mp'; st.got.push(x); st.hist.push([String(v), x + ' stored', 'good']); st.note = 'As is';
        if (st0) push(pre + (fOn ? 'The' : 'There is no step to pass through, so the') + ' value is not changed. It flows to toList as it is and is collected.', 'good');
        else push(pre + 'The line result.add(n) runs. The value added is ' + v + ' as it is, and it goes to the end of result.', 'good');
      }
    });
    // 4. The end
    st.cur = null; st.note = ''; st.stage = 'rs';
    if (st0) {
      st.made = true;
      push('All 6 values in nums have flowed through. The .toList() line makes a list from the collected values and stores it in result. result is ' + res + '.', 'good');
    } else {
      push('The for loop takes out all 6 values of nums and ends. result is ' + res + '.', 'good');
    }
    st.stage = ''; st.out.push(res);
    push('The output of the System.out.println(result) line is ' + res + '.', 'good');
    st.out.push(numsTxt);
    push('The output of the System.out.println(nums) line is ' + numsTxt + '. ' + (st0 ? 'The stream only passed values along from nums and did not change nums.' : 'The for loop only took values out of nums and stored them in the new list result, so nums is unchanged.'), 'good');

    // Summary: the first line is the answer to this setting (the question)
    var both = fOn && mOn;
    if (st0 && both) {
      sum.push('A stream is a way to pass the values of a collection along one at a time, filtering (filter) and transforming (map) them. The values of nums flowed one at a time, only the even ones remained and became 10 times larger, and the values stored in result are ' + res + '. What differs from a for loop is that you wrote only "what to filter and what to transform into."');
      sum.push('You did not write in the code the work of creating a new list, taking values out one at a time, and storing them. nums is still ' + numsTxt + '. What happens when you leave out the line that collects is covered in the in-depth lab "Lazy evaluation in streams".');
    } else if (!st0 && both) {
      sum.push('Writing the same task as a for loop gives the same result. The values stored in result are ' + res + ', and nums is unchanged. What a stream wrote in the two lines .filter and .map, the for loop made you write entirely yourself: creating a new list, taking values out one at a time, checking the condition with if, and storing with add.');
      sum.push('The two ways differ only in the shape of the code, and the result is the same. In the for loop too, nums was not changed, and values were stored only in the new list result.');
    } else if (!fOn && mOn) {
      sum.push((st0 ? 'If you remove the .filter line' : 'If you remove the if') + ', there is no filtering step, so all 6 values become 10 times larger and are stored. The values stored in result are ' + res + '.');
      sum.push('What decides how many values are stored is ' + (st0 ? 'filter' : 'if') + '. ' + (st0 ? 'map' : 'The * 10 part') + ' only transforms values and does not reduce their number. nums is still ' + numsTxt + '.');
    } else if (fOn && !mOn) {
      sum.push((st0 ? 'If you remove the .map line' : 'If you remove the * 10 part') + ', there is no transforming step, so the values that passed are stored as they are. The values stored in result are ' + res + '.');
      sum.push((st0 ? 'filter' : 'if') + ' picks values, and ' + (st0 ? 'map' : 'the * 10 part') + ' transforms them. The picking is unchanged, so only the 3 even numbers were stored, and nums is still ' + numsTxt + '.');
    } else {
      sum.push((st0 ? 'If you remove both the .filter line and the .map line' : 'If you remove both the if and the * 10 part') + ', nothing is filtered or transformed, and the values stored in result are ' + res + '. They are the same values as nums.');
      sum.push('Even though the values are the same, result is ' + (st0 ? 'the list that the .toList() line made by collecting values' : 'a list that you created yourself with new') + ' and nums is the list that existed from the start, so they are different lists.');
    }
    var steps = st0 ? [fOn ? 'filter' : null, mOn ? 'map' : null, 'toList'] : ['for', fOn ? 'if' : null, 'add'];
    steps = steps.filter(function (t) { return t; });
    return { events: ev, summary: sum, trace: trace, fOn: fOn, mOn: mOn, row: [res, numsTxt, steps.join(' → ')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, st0 = sim.c.style === 'stream';
    if (!s) { H.text(v, 'Click Run to start from creating nums.'); return; }
    H.table(v, ['Value in nums', 'Result'], s.hist.length ? s.hist.map(function (r) { return { cls: r[2], cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['No value handled yet', ''] }], 'What happened to each value');
    H.counters(v, [[s.checked, st0 ? 'Values checked by filter' : 'Values checked by if'], [s.got.length, 'Values stored in result']]);
  },
  // Diagram: from the left, nums, the filtering step (filter or if), the transforming step (map or add), and the result box. The arrow lights up at the step the value is passing. A step you removed is a dotted box. Below are the value being handled now, the dropped values, and the original list nums.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, st0 = c.style === 'stream', stg = s ? s.stage : '';
    P.size(680, 292);
    function rows(a) { var o = []; for (var i = 0; i < a.length; i += 3) o.push(a.slice(i, i + 3).join(' ')); return o; }
    P.box('nm', 14, 16, 120, 84, { cls: stg === 'nm' ? 'hot now' : 'plain', title: 'nums', sub: s && s.numsMade ? ['1 2 3', '4 5 6'] : 'None yet' });
    P.box('fl', 190, 16, 120, 84, { cls: !c.filter ? 'ghost' : stg === 'fl' ? 'hot now' : 'plain', title: st0 ? 'filter' : 'if', sub: c.filter ? ['n % 2 == 0', 'Evens pass'] : 'No filtering' });
    P.box('mp', 366, 16, 120, 84, { cls: !c.map ? 'ghost' : stg === 'mp' ? 'hot now' : 'plain', title: st0 ? 'map' : 'add', sub: c.map ? ['n * 10', 'Times 10'] : 'No change' });
    var made = s && s.made, got = s ? s.got : [], rsub = got.length ? (made ? rows(got) : ['Collecting'].concat(rows(got))) : made ? 'Empty' : 'None yet';
    P.box('rs', 542, 16, 120, 84, { cls: stg === 'rs' ? 'hot now' : made ? 'good' : 'ghost', title: 'result', sub: rsub });
    P.arrow('a1', 'nm:r', 'fl:l', { cls: stg === 'fl' ? 'hot' : 'mut' });
    P.arrow('a2', 'fl:r', 'mp:l', { cls: stg === 'mp' ? 'hot' : 'mut' });
    P.arrow('a3', 'mp:r', 'rs:l', { cls: stg === 'rs' || (stg === 'mp' && !st0) ? 'hot' : 'mut' });
    P.box('r1', 14, 120, 652, 40, { cls: s && s.cur !== null ? 'wait' : 'ghost', title: 'Value being handled', right: s && s.cur !== null ? 'n = ' + s.cur + (s.note ? ' · ' + s.note : '') : '' });
    P.box('r2', 14, 168, 652, 40, { cls: s && s.dropped.length ? 'plain' : 'ghost', title: 'Dropped values', right: !c.filter ? 'No filtering' : s && s.dropped.length ? s.dropped.join(', ') : '' });
    P.box('r3', 14, 216, 652, 40, { cls: s && s.numsMade ? 'good' : 'ghost', title: 'Original list nums', right: s && s.numsMade ? '[1, 2, 3, 4, 5, 6]' : '' });
    P.note('The values of nums pass through the steps one at a time, and nums itself is not changed in any step.');
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1. All 8 combinations (2 styles x 2 filter settings x 2 map settings) were checked against real runs: the code on the screen, wrapped in import java.util.*; and class Main and a main method, was compiled with javax.tools, loaded with a new class loader, and run, and the standard output was compared. The screen shows these wrapping lines (import, class, main) in shortened form. What was checked is the output of result, the output of nums, the steps written in the code (read from the lines of the source), and whether the code on the screen is the same text as the source that the probe compiled. The facts that the step sentences rely on were measured separately. For each combination, I ran the same source with only lines added that leave a record when filter, map, if, and add are called. I confirmed that one value passes through both filter and map before the next value is handled (the stream has the same order as the for loop), and that map is not called for a dropped value. I also ran on this JDK and confirmed that the result of a stream with neither filtering nor transforming has the same values as nums but is not the same object (result == nums is false, and equals is true). For the documentation, I opened the Java SE 21 API myself. From the package description of java.util.stream, I followed that a stream is not a data structure that stores elements but conveys elements from a source through a pipeline of operations, that operations do not change the source and filter does not remove elements from the source but creates a new stream, and that intermediate operations are lazy and traversal of the source starts only when a terminal operation runs. From the Stream documentation, I followed that filter is an intermediate operation that returns a stream of the elements that match the condition, that map is an intermediate operation that returns a stream of the results of applying a function, and that toList() accumulates the elements into a List and that List cannot be modified. From the List.of documentation, I followed that List.of creates a list that cannot be modified. I could not read the last 2,000 or so characters of the Stream documentation. The sentence that the list returned by toList() is newly created is not stated in the documentation, and I followed the implementation requirements of the documentation (the elements are copied into a new ArrayList) and the observation on this JDK. One point to note is that nums is a list that cannot be modified because it was made with List.of, so nums being unchanged in this lab is not only thanks to the stream. That a stream does not change its source follows the sentence of the package description above, and it is not something that the runs of this lab proved separately. Beyond that, sorting (sorted), limiting the count (limit), sums, parallel streams, and the fact that a stream can be used only once are not covered. What happens when there is no collecting line (toList), and the order of processing, are covered in the in-depth lab "Lazy evaluation in streams", and how to collect into something other than toList, such as a Map, is covered in "Collecting a stream".',
});
