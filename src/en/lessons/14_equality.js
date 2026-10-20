Lab.register({
  id: 'eq', nav: '== and equals', cat: 'Java language', mode: 'step',
  title: 'Why is == false when the values are the same?',
  why: 'If the equality of objects is judged only by whether they are the same object, as with ==, there is no way to treat as the same the same string or the same member number created at different times. equals is the method that lets a class decide for itself "what counts as the same," and standard classes such as String and Integer have already overridden it to compare by content.',
  use: 'Use equals to compare values that are objects, such as a string or an id received as a Long, and use == for primitive values, enums, and when you really want to check whether it is the same object. To use a class you made yourself as a key of a HashMap or an element of a HashSet, override equals and hashCode together, and compare values that may be null with Objects.equals.',
  intro: '== compares whether two variables refer to the same object, and equals compares whether the contents are the same. Depending on how they are created, strings and Integer objects are sometimes reused and sometimes created anew, so the result of == can differ even when the values are the same.',
  terms: ['Identity and equality', 'String pool', 'Boxing and unboxing', 'Immutable object'], ranks: ['string', 'equals'],
  controls: [
    { id: 'kind', label: 'Type to compare', type: 'select', value: 'str', options: [['str', 'String'], ['int', 'Integer']] },
    { id: 'sb', label: 'How the second string is created', type: 'select', value: 'new', options: [['lit', 'Literal "hello"'], ['new', 'new String("hello")'], ['intern', 'new String("hello").intern()'], ['const', 'Concatenation of literals "hel" + "lo"'], ['concat', 'Concatenation with a variable part + "lo"']], show: function (c) { return c.kind === 'str'; } },
    { id: 'iv', label: 'Value', type: 'select', value: '127', options: [['127', '127'], ['128', '128']], show: function (c) { return c.kind === 'int'; } },
    { id: 'ib', label: 'Type of the second variable', type: 'select', value: 'box', options: [['box', 'Integer (object)'], ['prim', 'int (primitive type)']], show: function (c) { return c.kind === 'int'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What do a == b and a.equals(b) return when the second String is created with new String("hello")?', d: 'A literal and new String. The contents are the same, but == is false.', v: { kind: 'str', sb: 'new', iv: '127', ib: 'box' } },
    { t: 'Two literals', q: 'What if the second string is the literal "hello" instead of new String?', d: 'Identical literals use the same object in the string pool.', v: { kind: 'str', sb: 'lit', iv: '127', ib: 'box' } },
    { t: 'A string concatenated with a variable', q: 'What if the second string is created by concatenation with a variable, part + "lo"?', d: 'A string created at run time is a different object from the one in the pool.', v: { kind: 'str', sb: 'concat', iv: '127', ib: 'box' } },
    { t: 'Calling intern()', q: 'What if you call intern() on new String("hello") when you create the second string?', d: 'You get back the object in the pool, so == becomes true.', v: { kind: 'str', sb: 'intern', iv: '127', ib: 'box' } },
    { t: 'Integer 127', q: 'What if you change the type to compare to Integer and compare 127?', d: '== is true.', v: { kind: 'int', sb: 'new', iv: '127', ib: 'box' } },
    { t: 'Integer 128', q: 'What if you change the type to compare to Integer and the value to 128?', d: 'The value is only 1 larger, but == becomes false.', v: { kind: 'int', sb: 'new', iv: '128', ib: 'box' } },
    { t: 'Comparing an Integer with an int', q: 'What if the type is Integer, the value is 128, and the second variable is an int?', d: 'When one side is a primitive type, the values are compared.', v: { kind: 'int', sb: 'new', iv: '128', ib: 'prim' } },
  ],
  code: function (c) {
    var H = '// Only the lines inside main are shown (class and main declaration omitted)\n';
    if (c.kind === 'str') {
      var b = { lit: 'String b = "hello";', new: 'String b = new String("hello");', intern: 'String b = new String("hello").intern();', const: 'String b = "hel" + "lo";            // combined into "hello" at compile time', concat: 'String part = "hel";\nString b = part + "lo";             // concatenated at run time' }[c.sb];
      return H + 'String a = "hello";\n' + b + '\n\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));';
    }
    return H + 'Integer a = ' + c.iv + ';                 // Integer.valueOf(' + c.iv + ')\n' + (c.ib === 'box' ? 'Integer b = ' + c.iv + ';' : 'int b = ' + c.iv + ';') + '\n\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));';
  },
  label: function (c) { return c.kind === 'str' ? 'String · "hello" and ' + { lit: '"hello"', new: 'new String', intern: 'intern()', const: '"hel" + "lo"', concat: 'part + "lo"' }[c.sb] : 'Integer ' + c.iv + ' and ' + (c.ib === 'box' ? 'Integer ' : 'int ') + c.iv; },
  columns: ['a == b', 'a.equals(b)', 'Same object?'],
  same: function (c) { return c.kind === 'str' ? (c.sb === 'lit' || c.sb === 'intern' || c.sb === 'const') : (c.ib === 'prim' || c.iv === '127'); },
  simulate: function (c) {
    var ev = [], same = this.same(c), sum = [], objs = [], A, B;
    function push(s, k, cmp) { ev.push({ s: s, k: k, snap: { objs: objs.map(function (o) { return { id: o.id, where: o.where, val: o.val, by: o.by.slice() }; }), a: A, b: B, cmp: cmp || {} } }); }
    function obj(where, val) { var o = { id: objs.length + 1, where: where, val: val, by: [] }; objs.push(o); return o; }
    if (c.kind === 'str') {
      var pool = obj('String Pool', '"hello"'); pool.by.push('a'); A = 'object ' + pool.id;
      push('String a = "hello": Only one copy of a string literal is created, and it is kept in the string pool. a refers to the "hello" object in the pool.', '');
      if (c.sb === 'lit') { pool.by.push('b'); B = A; push('String b = "hello": A literal with the same contents is already in the pool. No new object is created, and that object is used again. a and b refer to the same object.', ''); }
      if (c.sb === 'const') { pool.by.push('b'); B = A; push('String b = "hel" + "lo": The compiler evaluates a concatenation of literals in advance and replaces it with the literal "hello". So b refers to the same object in the pool.', ''); }
      if (c.sb === 'new') { var n1 = obj('Heap (outside the pool)', '"hello"'); n1.by.push('b'); B = 'object ' + n1.id; push('String b = new String("hello"): new always creates a new object. Its contents are the same as the "hello" in the pool, but it is a separate object at a different place on the heap.', ''); }
      if (c.sb === 'concat') { var p = obj('String Pool', '"hel"'); p.by.push('part'); var n2 = obj('Heap (outside the pool)', '"hello"'); n2.by.push('b'); B = 'object ' + n2.id; push('String b = part + "lo": The compiler cannot evaluate a concatenation that involves a variable in advance. A new string object is created at run time, and this object does not go into the pool.', ''); }
      if (c.sb === 'intern') { var n3 = obj('Heap (outside the pool)', '"hello"'); push('new String("hello"): First, a new object is created on the heap.', ''); pool.by.push('b'); B = A; push('.intern(): If a string with the same contents is in the pool, intern returns the object in the pool. b ends up referring to the object in the pool, not to the object that was just created. Nothing refers to the object created with new, so it is discarded.', ''); }
    } else {
      var cached = c.iv === '127', ia = obj(cached ? 'Integer cache (-128 to 127)' : 'Heap', c.iv); ia.by.push('a'); A = 'object ' + ia.id;
      push('Integer a = ' + c.iv + ': The primitive value is converted automatically with Integer.valueOf(' + c.iv + ') (autoboxing). ' + (cached ? 'For values from -128 to 127, valueOf returns an object that was created in advance.' : '128 is outside the cache range, so a new Integer object is created.'), '');
      if (c.ib === 'prim') { B = 'primitive value ' + c.iv; push('int b = ' + c.iv + ': A variable of a primitive type does not refer to an object. It holds the value itself.', ''); }
      else if (cached) { ia.by.push('b'); B = A; push('Integer b = 127: Integer.valueOf(127) is called again and returns the same object from the cache. a and b refer to the same object.', ''); }
      else { var ib = obj('Heap', c.iv); ib.by.push('b'); B = 'object ' + ib.id; push('Integer b = 128: The value is outside the cache range, so yet another Integer object is created. The value is the same, but this is a different object from a.', ''); }
    }
    var prim = c.kind === 'int' && c.ib === 'prim';
    push(prim ? 'a == b: One side is the primitive type int, so the value is taken out of the Integer a (unboxing) and the two numbers are compared. ' + c.iv + ' == ' + c.iv + ', so the result is true.' : 'a == b: This compares whether the two variables refer to the same object. a refers to ' + A + ' and b refers to ' + B + ', so the result is ' + same + '.', same ? 'good' : 'bad', { eq: String(same) });
    push(c.kind === 'str' ? 'a.equals(b): The equals method of String checks whether the two strings have the same characters in the same order. Both are hello, so the result is true.' : prim ? 'a.equals(b): equals takes an object, so int b is automatically converted to an Integer (autoboxing) and passed in. The equals method of Integer compares the numbers that the two objects represent. Both are ' + c.iv + ', so the result is true.' : 'a.equals(b): The equals method of Integer checks that b is also an Integer and compares the numbers that the two objects represent. Both are ' + c.iv + ', so the result is true.', 'good', { eq: String(same), equals: 'true' });
    if (c.kind === 'str') { sum.push(same ? 'Both variables refer to the same object in the string pool, so == is true as well. But this is close to a coincidence that depends on how the strings were created.' : 'The contents are the same, but the two are different objects, so == is false.'); sum.push('Always use equals to compare the contents of strings. A string read from a database or from a request is not a literal, so comparing it with == gives false in most cases.'); }
    else { sum.push(prim ? 'When you compare an Integer and an int with ==, the Integer is unboxed and the values are compared. However, if the Integer is null, unboxing throws a NullPointerException.' : c.iv === '127' ? 'Integer.valueOf caches the objects for -128 through 127 and reuses them. That is why == is true in this range.' : '128 is outside the cache range, so a new object is created every time. This causes bugs in which tests pass because they use only small numbers, and then comparisons go wrong in production once the IDs grow large.'); sum.push('To compare the values of two wrapper class objects (Integer, Long), use equals.'); }
    return { events: ev, summary: sum, row: [String(same), 'true', prim ? '(compared with a primitive)' : same ? 'Same object' : 'Different objects'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    H.table(v, ['Object', 'Location', 'Value', 'Referenced by'], s.objs.map(function (o) { return { cls: o.by.length ? '' : 'gone', cells: ['Object ' + o.id, o.where, o.val, { v: o.by.length ? o.by.join(', ') : 'none (discarded)', cls: o.by.length > 1 ? 'good' : '' }] }; }), 'Objects in memory');
  },
  // Diagram: the variables on the left, and on the right two places, one above the other, where objects are placed. Arrows go from the variables to the objects.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { objs: [], cmp: {} }, str = c.kind === 'str';
    P.size(680, 290);
    P.region('st', 16, 16, 220, 200, 'Stack (variables)');
    P.region('r1', 300, 16, 364, 94, str ? 'String pool (where literals are kept)' : 'Integer cache (-128 to 127)');
    P.region('r2', 300, 122, 364, 94, str ? 'Heap (outside the pool)' : 'Heap (outside the cache)');
    var vars = [['a', s.a], ['b', s.b]]; if (s.objs.some(function (o) { return o.by.indexOf('part') >= 0; })) vars.push(['part', 'object']);
    vars.forEach(function (v, i) { P.box('v_' + v[0], 30, 52 + i * 48, 192, 34, v[1] ? { cls: 'wait', title: v[0], right: v[1].indexOf('primitive') === 0 ? 'int value ' + c.iv : 'reference' } : { cls: 'ghost', title: v[0], right: 'not declared yet' }); });
    var n1 = 0, n2 = 0;
    s.objs.forEach(function (o) {
      var up = o.where === 'String Pool' || o.where.indexOf('Integer cache') === 0, k = up ? n1++ : n2++;
      P.box('o' + o.id, 316 + k * 174, (up ? 16 : 122) + 40, 166, 38, { cls: o.by.length ? 'good' : 'ghost', title: 'Object ' + o.id, right: o.by.length ? o.val : 'discarded' });
      o.by.forEach(function (name, j) { P.arrow('ar_' + name, 'v_' + name + ':r', 'o' + o.id + ':l:' + (o.by.length > 1 ? (j + 1) / (o.by.length + 1) : 0.5), { cls: o.by.length > 1 ? 'good' : '' }); });
    });
    var res = function (x) { return x === 'true' ? 'good' : x === 'false' ? 'bad' : 'ghost'; };
    P.box('c1', 16, 236, 320, 34, { cls: res(s.cmp.eq), title: c.kind === 'int' && c.ib === 'prim' ? 'a == b  (same value?)' : 'a == b  (same object?)', right: s.cmp.eq || '?' });
    P.box('c2', 344, 236, 320, 34, { cls: res(s.cmp.equals), title: 'a.equals(b)  (same contents?)', right: s.cmp.equals || '?' });
    P.note(str ? 'An arrow shows the object that a variable refers to. When two arrows reach the same object, == is true. The string pool is actually inside the heap, but it is drawn separately to set it apart.' : 'An arrow shows the object that a variable refers to. When two arrows reach the same object, == is true. A variable of the primitive type int does not refer to an object. It holds the value directly.');
  },
  assume: 'The == result of every combination was checked against the result of running the same code in our test run (JDK 21). The Integer cache range of -128 to 127 is the minimum range that the Java Language Specification guarantees, and the upper bound can be raised with a JVM option. The string pool has been located inside the heap since JDK 7, but the diagram shows it separately to set it apart.',
});
