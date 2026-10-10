Lab.register({
  id: 'array', nav: 'Arrays', cat: 'Java language', mode: 'step',
  title: 'Does assigning an array variable copy the array?',
  intro: 'An array is a fixed number of elements of the same type placed side by side. The number of an element (its index) starts at 0, the length is set when the array is created and does not change, and every element is filled with a default value as soon as the array is created. An array is an object too, so a variable holds a reference to the array. That is why b = a does not copy the array, and why a two-dimensional array is "an array whose elements hold arrays".',
  terms: ['Array', 'Shallow copy and deep copy', 'Primitive types and reference types', 'ArrayList'],
  controls: [
    { id: 'shape', label: 'Shape of the array', type: 'select', value: '1', options: [['1', 'One-dimensional: 3 elements'], ['2', 'Two-dimensional: 2 rows, 3 columns']] },
    { id: 'type', label: 'Element type', type: 'select', value: 'int', options: [['int', 'int'], ['boolean', 'boolean'], ['String', 'String']], hint: 'What an element holds before a value is stored in it depends on the type.' },
    { id: 'copy', label: 'How the second variable b is created', type: 'select', value: 'ref', options: [['ref', 'b = a'], ['clone', 'b = a.clone()'], ['copyOf', 'b = Arrays.copyOf(a, a.length)']] },
    { id: 'idx', label: 'Index of the element to store a value in through b', type: 'select', value: '2', options: [['0', '0 (the first element)'], ['2', '2 (the last element)'], ['3', '3 (the same number as the length)'], ['-1', '-1']], hint: 'For a two-dimensional array, this is the index within row 0 (b[0]).' },
  ],
  presets: [
    { t: 'Default settings', d: 'After the assignment b = a, a value is stored in an element through b. Printing a shows that value too.', v: { shape: '1', type: 'int', copy: 'ref', idx: '2' } },
    { t: 'Copying with clone', d: 'There are now two arrays, so a stays the same.', v: { shape: '1', type: 'int', copy: 'clone', idx: '2' } },
    { t: 'Storing at an index equal to the length', d: 'Three elements have only the indexes 0, 1, and 2. Storing at index 3 throws an exception.', v: { shape: '1', type: 'int', copy: 'clone', idx: '3' } },
    { t: 'Initial state of a String array', d: 'An element in which no value has been stored holds null.', v: { shape: '1', type: 'String', copy: 'clone', idx: '0' } },
    { t: 'A two-dimensional array is an array of arrays', d: 'One outer array and two row arrays, three in all, are created.', v: { shape: '2', type: 'int', copy: 'ref', idx: '2' } },
    { t: 'Cloning a two-dimensional array', d: 'The value in a changes even though a copy was made. That is because the row arrays are shared.', v: { shape: '2', type: 'int', copy: 'clone', idx: '2' } },
  ],
  lit: function (c) { return { int: '7', boolean: 'true', String: '"A"' }[c.type]; },
  code: function (c) {
    var two = c.shape === '2', T = c.type, AT = T + (two ? '[][]' : '[]'), pr = two ? 'Arrays.deepToString' : 'Arrays.toString';
    var pad = function (x) { return x + new Array(Math.max(2, 41 - x.length)).join(' ') + '// '; };
    var cp = c.copy === 'ref' ? 'a' : c.copy === 'clone' ? 'a.clone()' : 'Arrays.copyOf(a, a.length)';
    return 'import java.util.Arrays;\n\n' +
      pad(AT + ' a = new ' + T + (two ? '[2][3]' : '[3]') + ';') + (two ? 'two arrays of length 3, and an array that holds the two' : '3 elements, filled with the default value') + '\n' +
      pad(AT + ' b = ' + cp + ';') + (c.copy === 'ref' ? 'only the reference is copied' : two ? 'only the outer array is newly created' : 'creates a new array and copies the values') + '\n\n' +
      'System.out.println(a == b);\n' + (two ? 'System.out.println(a[0] == b[0]);\n' : '') +
      pad((two ? 'b[0][' : 'b[') + c.idx + '] = ' + this.lit(c) + ';') + (two ? 'stores in row 0 at index ' : 'stores at index ') + c.idx + '\n' +
      'System.out.println(' + pr + '(a));\nSystem.out.println(' + pr + '(b));';
  },
  label: function (c) { return c.type + (c.shape === '2' ? '[2][3]' : '[3]') + ' · b = ' + (c.copy === 'ref' ? 'a' : c.copy === 'clone' ? 'a.clone()' : 'Arrays.copyOf') + ' · ' + (c.shape === '2' ? 'store in b[0][' : 'store in b[') + c.idx + ']'; },
  columns: ['a == b', 'Storing the value', 'Output of a', 'Output of b'],
  simulate: function (c) {
    var two = c.shape === '2', T = c.type, idx = +c.idx, ev = [], sum = [], AT = T + (two ? '[][]' : '[]'), lit = this.lit(c);
    var def = { int: 0, boolean: false, String: null }[T], val = { int: 7, boolean: true, String: 'A' }[T];
    var defWord = { int: 'the default value of int is 0', boolean: 'the default value of boolean is false', String: 'the default value of a reference type such as String is null' }[T];
    var st = { arrs: [], a: null, b: null, eq: null, eq0: null, hit: null, oob: null, outA: null, outB: null, err: null };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function mk(type, cells) { st.arrs.push({ id: st.arrs.length + 1, type: type, cells: cells }); return st.arrs.length; }
    function arr(id) { return st.arrs[id - 1]; }
    function fill(n) { var x = []; for (var i = 0; i < n; i++) x.push(def); return x; }
    // The text that Arrays.toString and Arrays.deepToString produce
    function show(id) { return '[' + arr(id).cells.map(function (x) { return x !== null && typeof x === 'object' ? show(x.ref) : String(x); }).join(', ') + ']'; }
    // 1. Create the array
    if (!two) { st.a = mk(T + '[]', fill(3)); push(AT + ' a = new ' + T + '[3]: An array of 3 ' + T + ' elements placed side by side is created on the heap. The elements are numbered 0, 1, 2 from the front (the index). No value has been stored yet, but every element is filled with the default value (' + defWord + '). The variable a holds a reference to this array.'); }
    else {
      st.a = mk(T + '[][]', []); var r0 = mk(T + '[]', fill(3)), r1 = mk(T + '[]', fill(3)); arr(st.a).cells = [{ ref: r0 }, { ref: r1 }];
      push(AT + ' a = new ' + T + '[2][3]: Three arrays in all are created. They are 2 ' + T + ' arrays of length 3 (the rows) and an outer array of length 2 whose elements hold references to those two. A two-dimensional array is not a single table but "an array whose elements hold arrays". The variable a holds a reference to the outer array. Every element of the rows has the default value (' + defWord + ').');
    }
    // 2. The second variable
    var shallow = two && c.copy !== 'ref';
    if (c.copy === 'ref') { st.b = st.a; push(AT + ' b = a: The reference that a holds is copied to b. No new array is created. a and b refer to the same single array.'); }
    else {
      st.b = mk(arr(st.a).type, JSON.parse(JSON.stringify(arr(st.a).cells)));
      var head = AT + ' b = ' + (c.copy === 'clone' ? 'a.clone()' : 'Arrays.copyOf(a, a.length)') + ': ';
      if (!two) push(head + (c.copy === 'clone' ? 'A new array of the same length is created, and the values in the elements of the array that a refers to are copied into it in order.' : 'A new array of the length given as the second argument (here a.length, that is, 3) is created, and the values of the array that a refers to are copied into it from the front.') + ' b holds a reference to the new array. There are now two arrays.', 'good');
      else push(head + 'Only one array, the outer array, is newly created (length 2). Its elements receive copies of what the elements of the original outer array hold, and what those hold is references to the row arrays. No new row arrays are created, so the two outer arrays refer to the same two row arrays.', 'bad');
    }
    // 3. Whether they are the same array
    st.eq = String(st.a === st.b);
    push('System.out.println(a == b): This compares whether the two variables refer to the same array. The output is ' + st.eq + '.');
    if (two) { st.eq0 = String(arr(st.a).cells[0].ref === arr(st.b).cells[0].ref); push('System.out.println(a[0] == b[0]): This compares whether element 0 of the outer array on the a side and element 0 of the outer array on the b side refer to the same row array. The output is ' + st.eq0 + '.' + (shallow ? ' The outer arrays are different, but the row array is the same.' : ''), shallow ? 'bad' : ''); }
    // 4. Store a value through b
    var target = two ? arr(arr(st.b).cells[0].ref) : arr(st.b), w = (two ? 'b[0][' : 'b[') + idx + '] = ' + lit, len = target.cells.length;
    if (idx < 0 || idx >= len) {
      st.oob = { arr: target.id, idx: idx }; st.err = 'ArrayIndexOutOfBoundsException: Index ' + idx + ' out of bounds for length ' + len;
      push(w + ': The length of ' + (two ? 'the row array that b[0] refers to' : 'the array that b refers to') + ' is ' + len + ', and the only indexes that can be used are 0, 1, and 2. ' + (idx < 0 ? 'An index cannot be less than 0.' : idx + ' is not the index of any element. The length of an array does not grow after the array is created.') + ' An ArrayIndexOutOfBoundsException is thrown, and the program stops at this line. The message is "Index ' + idx + ' out of bounds for length ' + len + '".', 'bad');
    } else {
      target.cells[idx] = val; st.hit = { arr: target.id, idx: idx };
      push(w + ': ' + (two ? 'Java follows element 0 of the outer array that b refers to, finds the row array, and stores the value in that array at index ' : 'The value is stored in the array that b refers to, at index ') + idx + '. ' + (idx === 0 ? 'Indexes are counted from 0, so index 0 is the first element.' : 'With a length of 3, the indexes go from 0 through 2, so index 2 is the last element.'));
      var seen = two ? arr(st.a).cells[0].ref === target.id : st.a === target.id, pr = two ? 'Arrays.deepToString' : 'Arrays.toString';
      st.outA = show(st.a);
      push('System.out.println(' + pr + '(a)): The contents of the array that a refers to are printed. The output is ' + st.outA + '. ' + (!seen ? 'The value stored through b is not visible. That is because the array of a and the array of b are separate.' : shallow ? 'The value stored through b is visible through a too. That is because the outer array was created separately, but the row 0 array is shared.' : 'The value stored through b is visible through a too. That is because a and b refer to the same array.'), seen ? 'bad' : 'good');
      st.outB = show(st.b);
      push('System.out.println(' + pr + '(b)): The contents of the array that b refers to are printed. The output is ' + st.outB + '.');
    }
    if (st.err) {
      sum.push('The line that stores the value threw ' + st.err.split(':')[0] + ', and the program stopped. The two output lines below it were not executed.');
      sum.push('The length of an array is set when the array is created and does not change after that. If the length is n, the indexes go from 0 through n - 1. An index outside this range shows up as an exception at run time, not at compile time.');
      sum.push(idx < 0 ? 'Java has no syntax for counting from the end with a negative index. Write the last element as a[a.length - 1].' : 'If you write the condition of a loop as i <= a.length, you run into exactly this exception at the end. Write i < a.length. If you need more elements, create a longer array and move the values into it (Arrays.copyOf(a, 5)), or use an ArrayList, whose size grows automatically.');
    } else {
      sum.push('a == b is ' + st.eq + (two ? ', and a[0] == b[0] is ' + st.eq0 : '') + '. The output of a is ' + st.outA + ', and the output of b is ' + st.outB + '.');
      if (c.copy === 'ref') sum.push('Assigning an array variable does not copy the array. It gives you one more variable that refers to the same array. So a value stored through one is visible through the other too. The same is true when you pass an array to a method.');
      else if (!two) sum.push('To copy an array, create a new array with a.clone() or Arrays.copyOf(a, a.length). The two arrays are separate, so changing one leaves the other as it was.' + (c.copy === 'copyOf' ? ' The second argument of Arrays.copyOf is the length of the new array. If you give a number larger than the original length, you get a longer array whose extra elements are filled with the default value.' : ''));
      else sum.push('When clone or Arrays.copyOf is used on a two-dimensional array, only the outer array is newly created, and the row arrays are shared. This is called a shallow copy. So changing an element of b[0] changes it in a[0] too. To have separate rows as well, you must clone each row (a deep copy).');
      if (two && c.copy === 'ref') sum.push('new ' + T + '[2][3] creates three arrays. a.length is 2, the length of the outer array, and a[0].length is 3, the length of a row array. a[0] is itself an array of type ' + T + '[].');
      sum.push(T === 'int' ? 'When an array is created, every element is filled with a default value. It is 0 for numeric types, false for boolean, and null for reference types.' : T === 'boolean' ? 'An element of a boolean array is false before a value is stored in it. The default value is determined by the type (0 for numbers, null for reference types).' : 'An element of a String array is null before a value is stored in it. It is not the empty string "". Calling a method on a null element, as in a[1].length(), throws a NullPointerException.');
    }
    return { events: ev, summary: sum, row: [two ? st.eq + ' (a[0] == b[0] is ' + st.eq0 + ')' : st.eq, st.err || 'Success', st.err ? 'stopped before the output' : st.outA, st.err ? 'stopped before the output' : st.outB] };
  },
  cellText: function (x) { return x === null ? 'null' : typeof x === 'string' ? '"' + x + '"' : typeof x === 'object' ? 'reference to array ' + x.ref : String(x); },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, self = this, two = sim.c.shape === '2';
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'a', s.a ? '→ array ' + s.a : 'not declared yet', s.a ? 'wait' : 'none');
    H.lane(ln, 'b', s.b ? '→ array ' + s.b + (s.b === s.a ? ' (the same array as a)' : '') : 'not declared yet', s.b ? (s.b === s.a ? 'hot' : 'wait') : 'none');
    H.table(v, ['Array', 'Type', 'Length', 'Contents of the elements (from index 0)'], s.arrs.map(function (A) { return { cells: ['Array ' + A.id, A.type, String(A.cells.length), { v: A.cells.map(function (x) { return self.cellText(x); }).join(' | '), cls: s.hit && s.hit.arr === A.id ? 'hot' : '' }] }; }), 'Arrays on the heap');
    if (s.err) H.text(v, s.err);
    H.counters(v, [[s.eq === null ? '?' : s.eq, 'a == b']].concat(two ? [[s.eq0 === null ? '?' : s.eq0, 'a[0] == b[0]']] : []));
  },
  // Diagram: each array has a border around it, and its elements are placed inside side by side in index order. Arrows go to the arrays from the variables and from the elements that hold references. For a two-dimensional array, the row arrays are in the middle and the outer arrays are on either side.
  draw: function (P, sim, shown) {
    var c = sim.c, two = c.shape === '2', self = this, last = shown[shown.length - 1], s = last ? last.snap : { arrs: [], a: null, b: null, eq: null, eq0: null, hit: null, oob: null, outA: null, outB: null, err: null };
    P.size(680, 318);
    var cell = function (A, i, x, y, w, o) { var hit = s.hit && s.hit.arr === A.id && s.hit.idx === i; P.box('c' + A.id + '_' + i, x, y, w, 30, o || { cls: hit ? 'hot now' : 'plain', title: self.cellText(A.cells[i]), center: true }); };
    var off = c.idx === '-1' ? 1 : 0;   // With the setting that chooses index -1, one place is left empty to the left of element 0 for the 'no such element' box
    var oobBox = function (x, y, w) { P.box('oob', x, y, w, 30, { cls: 'bad now', title: 'none', center: true }); P.text('oobix', x + w / 2, y + 46, '[' + s.oob.idx + ']', { cls: 'bad', anchor: 'middle' }); };
    var sameAB = s.a && s.b === s.a;
    if (!two) {
      P.box('v_a', 16, 48, 96, 32, s.a ? { cls: 'wait', title: 'a', right: 'ref' } : { cls: 'ghost', title: 'a', right: 'none' });
      P.box('v_b', 16, 138, 96, 32, s.b ? { cls: 'wait', title: 'b', right: 'ref' } : { cls: 'ghost', title: 'b', right: 'none' });
      s.arrs.forEach(function (A, k) {
        var y0 = 24 + k * 90, x0 = 250;
        P.region('A' + A.id, x0, y0, 264, 82, 'Array ' + A.id + ' · ' + A.type + ' · length ' + A.cells.length);
        A.cells.forEach(function (x, i) { cell(A, i, x0 + 10 + (i + off) * 62, y0 + 28, 58); P.text('ix' + A.id + '_' + i, x0 + 39 + (i + off) * 62, y0 + 74, '[' + i + ']', { cls: 'mut', anchor: 'middle' }); });
        if (s.oob && s.oob.arr === A.id) oobBox(x0 + 10 + (off ? 0 : 3) * 62, y0 + 28, 58);
      });
      if (!s.arrs.length) P.text('empty', 400, 110, 'No array yet', { cls: 'mut', anchor: 'middle' });
      if (s.a) P.arrow('ar_a', 'v_a:r', 'A' + s.a + ':l' + (sameAB ? ':0.3' : ''), { cls: sameAB ? 'hot' : '' });
      if (s.b) P.arrow('ar_b', 'v_b:r', 'A' + s.b + ':l' + (sameAB ? ':0.7' : ''), { cls: sameAB ? 'hot' : '' });
    } else {
      var right = c.copy !== 'ref';
      P.box('v_a', 16, 52, 44, 30, s.a ? { cls: 'wait', title: 'a', center: true } : { cls: 'ghost', title: 'a', center: true });
      P.box('v_b', right ? 624 : 16, right ? 52 : 142, right ? 40 : 44, 30, s.b ? { cls: 'wait', title: 'b', center: true } : { cls: 'ghost', title: 'b', center: true });
      s.arrs.forEach(function (A) {
        if (A.type.indexOf('[][]') > 0) {
          var x0 = A.id === 1 ? 92 : 506, side = A.id === 1 ? 'r' : 'l';
          P.region('A' + A.id, x0, 24, 90, 172, 'Array ' + A.id);
          A.cells.forEach(function (x, i) { cell(A, i, x0 + 8, 52 + i * 90, 74, { cls: 'wait', title: '[' + i + ']', right: 'ref' }); P.arrow('ro' + A.id + '_' + i, 'c' + A.id + '_' + i + ':' + side, 'A' + x.ref + ':' + (side === 'r' ? 'l' : 'r'), { cls: s.arrs.length > 3 ? 'hot' : '' }); });
        } else {
          var y0 = A.id === 2 ? 24 : 114;
          P.region('A' + A.id, 214, y0, 260, 82, 'Array ' + A.id + ' · ' + A.type + ' · length ' + A.cells.length);
          A.cells.forEach(function (x, i) { cell(A, i, 224 + (i + off) * 58, y0 + 28, 54); P.text('ix' + A.id + '_' + i, 251 + (i + off) * 58, y0 + 74, '[' + i + ']', { cls: 'mut', anchor: 'middle' }); });
          if (s.oob && s.oob.arr === A.id) oobBox(224 + (off ? 0 : 3) * 58, y0 + 28, 54);
        }
      });
      if (!s.arrs.length) P.text('empty', 340, 110, 'No array yet', { cls: 'mut', anchor: 'middle' });
      if (s.a) P.arrow('ar_a', 'v_a:r', 'A1:l:0.2');
      if (s.b) P.arrow('ar_b', right ? 'v_b:l' : 'v_b:r', right ? 'A' + s.b + ':r:0.2' : 'A1:l:0.75', { cls: sameAB ? 'hot' : '' });
    }
    P.box('eq', 16, 206, 648, 28, { cls: s.eq === null ? 'ghost' : 'plain', title: two ? 'a == b ,  a[0] == b[0]' : 'a == b', right: s.eq === null ? '?' : two ? s.eq + ' ,  ' + (s.eq0 === null ? '?' : s.eq0) : s.eq });
    P.box('ra', 16, 240, 648, 28, s.err ? { cls: 'bad', title: 'Exception', right: s.err } : { cls: s.outA === null ? 'ghost' : 'plain', title: 'Output of a', right: s.outA === null ? '?' : s.outA });
    P.box('rb', 16, 274, 648, 28, s.err ? { cls: 'ghost', title: 'Output', right: 'not executed' } : { cls: s.outB === null ? 'ghost' : 'plain', title: 'Output of b', right: s.outB === null ? '?' : s.outB });
    P.note(two ? 'In a two-dimensional array, the elements of the outer array (on either side) refer to the row arrays (in the middle). clone and Arrays.copyOf create only a new outer array, so the arrows of the two outer arrays reach the same row arrays. All the arrays are placed on the heap.' : 'One border is one array, and its elements are placed side by side in index order. An arrow shows the array that the reference in a variable refers to. When two arrows reach one array, the same element changes whichever variable you use to change it. All the arrays are placed on the heap.');
  },
  assume: 'The results of the 72 combinations (a == b, the exception and its message, and the two outputs) were checked against the result of running code with the same structure on JDK 21 on this PC. Of the points made in the summary, the following were also confirmed by running them: getting a longer array with Arrays.copyOf, rows not being shared when each row is cloned, a change made inside a method to an array passed to it being visible outside, an exception being thrown when a loop runs with i <= a.length, a NullPointerException being thrown when a method is called on a null element, and the values of a.length and a[0].length. The wording of the exception message can differ from one JDK version to another, and the one given here is that of JDK 21. Whether the elements of an array are actually placed side by side in memory was not confirmed by execution. It is an explanation that follows the way a JVM is generally implemented. In the diagram, the String value "A" is written directly in the element, but the element actually holds a reference to a String object. Creating an array by writing out its values, as in { 1, 2, 3 }, two-dimensional arrays whose rows have different lengths, and the enhanced for statement are not covered.',
});
