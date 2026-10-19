Lab.register({
  id: 'vars', nav: 'Variables and types', cat: 'Java language', mode: 'step',
  title: 'What is copied when you assign one variable to another?',
  intro: 'A variable is a storage location that holds something. A variable of a primitive type such as int holds the value itself, and a variable of a reference type such as a class type holds a reference that points to where an object is. Whether you assign a variable or pass it to a method, what is copied is always "what the variable holds". So with a primitive type the original variable stays the same when you change the copy, and with a reference type the two variables end up looking at the same single object.',
  terms: ['Primitive types and reference types', 'Pass by value', 'Immutable object', 'Heap memory'],
  controls: [
    { id: 'what', label: 'Type of the variable and what is done with the copy', type: 'select', value: 'field', options: [['prim', 'int (primitive type): assign 99 to the copy'], ['field', 'Point (reference type): change the contents of the object through the copy'], ['renew', 'Point (reference type): assign a new object to the copy'], ['copy', 'Point (reference type): copy into a new object, then change the contents'], ['str', 'String (reference type): concatenate text onto the copy']] },
    { id: 'how', label: 'Where the copying happens', type: 'select', value: 'assign', options: [['assign', 'Assigning to another variable: b = a'], ['call', 'Passing to a method: change(a)'], ['ret', 'Passing to a method and getting the result back: a = change(a)']], hint: 'When you pass a variable to a method, the parameter p is the copy.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What is copied when you assign the Point variable a to another variable with b = a and change the contents of the object through b?', d: 'A Point variable is assigned to b, and the contents are changed through b. Reading through a also gives 99.', v: { what: 'field', how: 'assign' } },
    { t: 'With a primitive type', q: 'What if you change the type to int (primitive type) and assign 99 to the copy?', d: 'The value is copied, so a is still 1 after b is changed.', v: { what: 'prim', how: 'assign' } },
    { t: 'Passing an object to a method', q: 'What if you pass a to the method change(a) instead of using b = a, and change the contents of the object inside the method?', d: 'A change made inside the method is visible outside the method too.', v: { what: 'field', how: 'call' } },
    { t: 'Assigning a new object inside the method', q: 'What if you pass a to change(a) and assign a new object to the copy inside the method?', d: 'Only the parameter comes to refer to a different object, and a stays the same.', v: { what: 'renew', how: 'call' } },
    { t: 'Passing a primitive value to a method', q: 'What if you pass an int (primitive type) variable to change(a) and assign 99 to the copy?', d: 'a stays the same even when the method changes the parameter.', v: { what: 'prim', how: 'call' } },
    { t: 'Getting the result back and assigning it', q: 'What if you pass an int (primitive type) variable with a = change(a) and assign the returned result?', d: 'a changes only when the value received through return is stored back in a.', v: { what: 'prim', how: 'ret' } },
    { t: 'Concatenating onto a String', q: 'What if you concatenate text onto the copy of a String (reference type) variable?', d: 'String is a reference type, and yet a stays the same.', v: { what: 'str', how: 'assign' } },
  ],
  code: function (c) {
    var W = c.what, call = c.how !== 'assign', ret = c.how === 'ret', cv = call ? 'p' : 'b';
    var T = W === 'prim' ? 'int' : W === 'str' ? 'String' : 'Point', init = W === 'prim' ? '1' : W === 'str' ? '"hi"' : 'new Point(1)';
    var rd = function (n) { return T === 'Point' ? n + '.x' : n; };
    var cm = function (line, note) { return line + new Array(Math.max(2, 37 - line.length)).join(' ') + '// ' + note; };
    var act = { prim: cv + ' = 99;', field: cv + '.x = 99;', copy: cv + '.x = 99;', renew: cv + ' = new Point(99);', str: cv + ' = ' + cv + ' + "!";' }[W];
    var actNote = { prim: 'changes the value in the variable', field: 'changes the contents of the object it refers to', copy: 'changes the contents of the copied object', renew: 'stores a reference to a different object', str: 'a new String object is created' }[W];
    var cls = T === 'Point' ? 'class Point {\n    int x;\n    Point(int x) { this.x = x; }\n}\n\n' : '';
    var src = W === 'copy' ? 'new Point(a.x)' : 'a', srcNote = W === 'copy' ? 'creates a new object and copies the contents into it' : W === 'prim' ? 'the value in a is copied' : 'the reference in a is copied';
    cls = '// ' + (call ? (T === 'Point' ? 'The example class Point and the methods change and main are shown (the declaration of the class that holds the two methods omitted)' : 'Only the methods change and main are shown (the declaration of the class that holds them omitted)') : (T === 'Point' ? 'The example class Point and the lines inside main are shown (the class that holds main and the main declaration omitted)' : 'Only the lines inside main are shown (class and main declaration omitted)')) + '\n' + cls;
    if (!call) return cls + T + ' a = ' + init + ';\n' + cm(T + ' b = ' + src + ';', srcNote) + '\n' + cm(act, actNote) + '\n\nSystem.out.println(' + rd('b') + ');\nSystem.out.println(' + rd('a') + ');';
    return cls + 'static ' + (ret ? T : 'void') + ' change(' + T + ' p) {\n' + cm('    ' + act, actNote) + '\n    System.out.println(' + rd('p') + ');\n' + (ret ? '    return p;\n' : '') + '}\n\npublic static void main(String[] args) {\n    ' + T + ' a = ' + init + ';\n' + cm('    ' + (ret ? 'a = ' : '') + 'change(' + src + ');', W === 'copy' ? 'creates a new object and passes it' : srcNote.replace('is copied', 'is copied to p')) + '\n    System.out.println(' + rd('a') + ');\n}';
  },
  label: function (c) { return { prim: 'int · assign 99', field: 'Point · change the contents', renew: 'Point · assign a new object', copy: 'Point · copy into a new object', str: 'String · concatenate' }[c.what] + ' · ' + { assign: 'b = a', call: 'change(a)', ret: 'a = change(a)' }[c.how]; },
  columns: ['Value read from the copy', 'Value read from a', 'Did the value read from a change?'],
  simulate: function (c) {
    var W = c.what, call = c.how !== 'assign', ret = c.how === 'ret', cv = call ? 'p' : 'b', prim = W === 'prim', str = W === 'str', ev = [], sum = [];
    // What a variable holds: { v: value } (primitive type) or { ref: object number } (reference type). The v of an object is the x value for a Point and the text for a String.
    var st = { a: null, cp: null, gone: false, objs: [], out1: '?', out2: '?', hot: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function obj(v) { st.objs.push({ id: st.objs.length + 1, v: v }); return st.objs.length; }
    function read(cell) { return cell.ref ? st.objs[cell.ref - 1].v : cell.v; }
    var fld = function (n) { return prim || str ? n : n + '.x'; }, what = prim ? 'value' : 'reference';
    // 1. Create a
    if (prim) { st.a = { v: 1 }; st.hot = 'a'; push('int a = 1: The value 1 is stored directly in the variable a. A variable of a primitive type such as int holds the value itself.'); }
    else if (str) { st.a = { ref: obj('hi') }; st.hot = 'a'; push('String a = "hi": The text "hi" is held in a String object on the heap. The variable a holds a reference to that object, not the text.'); }
    else { st.a = { ref: obj(1) }; st.hot = 'a'; push('Point a = new Point(1): new creates one Point object on the heap (x is 1). The variable a holds a reference that points to where that object is, not the object itself.'); }
    var first = read(st.a);
    // 2. Copy what the variable holds
    st.hot = 'cp';
    if (W === 'copy') {
      st.cp = { ref: obj(read(st.a)) };
      push(call ? 'Calling change(new Point(a.x)): First, one more Point object is created, and the x value 1 of the object that a refers to is copied into it. The parameter p holds a reference to this new object. Its contents are the same as those of the object that a refers to, but the two are different objects.' : 'Point b = new Point(a.x): One more Point object is created, and the x value 1 of the object that a refers to is copied into it. b holds a reference to this new object. The contents are the same, but the two are different objects.');
    } else {
      st.cp = JSON.parse(JSON.stringify(st.a));
      var same = prim ? ' The two variables are not connected to each other.' : ' The object is not copied. There is still only one object, and a and ' + cv + ' refer to the same object.';
      push(call ? 'Calling change(a): The parameter p of the method is created, and the ' + (prim ? 'value 1' : 'reference') + ' that a holds is copied into p. This is the same as an assignment (p = a).' + same : (prim ? 'int' : str ? 'String' : 'Point') + ' b = a: The ' + (prim ? 'value 1' : 'reference') + ' that a holds is copied and stored in b.' + same);
    }
    // 3. Do something with the copy
    if (prim) { st.cp = { v: 99 }; push(cv + ' = 99: The value in ' + cv + ' is changed to 99. a was not touched, so it is still 1.'); }
    else if (W === 'field' || W === 'copy') { st.objs[st.cp.ref - 1].v = 99; push(cv + '.x = 99: Java follows the reference in ' + cv + ' and changes the x of that object to 99. What ' + cv + ' itself holds does not change.' + (W === 'field' ? ' a refers to this very object too.' : ' The object that a refers to is a different object, so it stays the same.'), W === 'field' ? 'bad' : ''); }
    else if (W === 'renew') { st.cp = { ref: obj(99) }; push(cv + ' = new Point(99): A new Point object (x is 99) is created, and a reference to it is stored in ' + cv + '. Only what ' + cv + ' holds has changed. The first object and a stay the same.'); }
    else { st.cp = { ref: obj(read(st.cp) + '!') }; push(cv + ' = ' + cv + ' + "!": The contents of a String object cannot be changed once it has been created. So + creates a new String object that holds "hi!", and a reference to it is stored in ' + cv + '. The original "hi" object and a stay the same.'); }
    // 4. Read through the copy
    st.out1 = String(read(st.cp));
    push('System.out.println(' + fld(cv) + '): ' + (prim ? cv + ' holds a value, and that value is read.' : str ? cv + ' refers to an object, and the text of that object is read.' : cv + ' refers to an object, and the x of that object is read.') + ' The output is ' + st.out1 + '.');
    // 5. Return from the method
    if (call) {
      var back = st.cp, orphan = !prim && back.ref !== st.a.ref;
      st.gone = true; st.hot = '';
      if (!ret) { st.cp = null; push('The change method has finished. The parameter p disappears together with the method.' + (orphan ? ' Only p referred to object ' + back.ref + ', so no variable refers to it any longer.' : '')); }
      else {
        st.cp = null; push('return p: The ' + (prim ? 'value 99' : 'reference') + ' that p holds is copied back to the caller. The parameter p disappears together with the method.');
        var old = st.a; st.a = JSON.parse(JSON.stringify(back)); st.hot = 'a';
        push('a = change(...): The returned ' + (prim ? 'value 99' : 'reference') + ' is stored in a. ' + (prim ? 'a changes from 1 to 99. It changed because a value was assigned to a.' : back.ref === old.ref ? 'What came back is a reference to the very object that a already referred to, so what a holds does not change.' : 'a now refers to object ' + back.ref + '. No variable refers any longer to object ' + old.ref + ', which a referred to at first.'), 'good');
      }
    }
    // 6. Read through a
    st.hot = 'a'; st.out2 = String(read(st.a));
    var changed = read(st.a) !== first, why;
    if (ret) why = prim || W !== 'field' ? 'That is because what came back was assigned to a.' : 'That is because the contents of the object that a refers to were changed inside the method.';
    else if (prim) why = 'What was copied was the value, and what a holds was never changed.';
    else if (W === 'field') why = cv + ' was used to change the very object that a refers to.';
    else if (W === 'copy') why = cv + ' was used to change a separate copy of the object.';
    else if (W === 'renew') why = cv + ' alone came to refer to the new object, and nothing changed the object that a refers to.';
    else why = 'A new String object was created, and the "hi" object that a refers to was not changed.';
    push('System.out.println(' + fld('a') + '): ' + (prim ? 'The value that a holds is read.' : str ? 'The text of the object that a refers to is read.' : 'The x of the object that a refers to is read.') + ' The output is ' + st.out2 + '. ' + why, changed ? (ret ? 'good' : 'bad') : '');
    if (prim) sum.push('A variable of a primitive type holds the value itself. Copying it only creates one more copy of the same value, so however much you change the copy, the original variable does not change.');
    if (W === 'field') sum.push('A variable of a reference type holds a reference, not an object. What is copied is the reference, so the two variables refer to the same single object, and a change made through one is visible through the other.');
    if (W === 'renew') sum.push('"Changing the contents of the object that a variable refers to" (' + cv + '.x = 99) and "making a variable refer to a different object" (' + cv + ' = new Point(99)) are different things. The second changes only what that variable holds, so it has no effect on another variable that referred to the same object.');
    if (W === 'copy') sum.push('To protect the original, copy the object, not the reference. If you create a new object and copy the contents into it, there are two objects, so changing one leaves the other as it was.');
    if (str) sum.push('String is a reference type too, so at first the two variables refer to the same object. But a String is an immutable object, whose contents cannot be changed in any way. Concatenation creates a new object and only makes the variable refer to it, so the two variables do not affect each other, just as with a primitive type.');
    if (c.how === 'call') sum.push('Passing a variable to a method is the same as an assignment. Java always copies what the variable holds (a value or a reference) and passes the copy. So assigning something else to the parameter inside the method does not change the variable of the caller, and only a change to the contents of the passed object is visible outside.');
    if (ret) sum.push('Only code that assigns to a can change what a holds. To apply the result that a method produced to the variable of the caller, return it and assign it yourself, as in a = change(a).');
    return { events: ev, summary: sum, cv: cv, row: [st.out1, st.out2, changed ? 'Changed' : 'Unchanged'] };
  },
  // What a variable holds, as text
  cell: function (cell, c) { return !cell ? '' : cell.ref ? 'reference to object ' + cell.ref : 'value ' + cell.v; },
  objText: function (o, c) { return c.what === 'str' ? '"' + o.v + '"' : 'x = ' + o.v; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, cv = sim.cv, self = this;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    H.table(v, ['Variable', 'What it holds'], [
      { cells: ['a', { v: self.cell(s.a, c), cls: s.hot === 'a' ? 'hot' : '' }] },
      { cls: s.cp ? '' : 'gone', cells: [cv === 'p' ? 'p (parameter of change)' : 'b', { v: s.cp ? self.cell(s.cp, c) : s.gone ? 'gone (the method has finished)' : 'not declared yet', cls: s.hot === 'cp' ? 'hot' : '' }] },
    ], 'Variables');
  },
  // Diagram: the variables on the left and the objects on the heap on the right. An arrow goes from a variable that holds a reference to the object. At the bottom are the two outputs.
  draw: function (P, sim, shown) {
    var c = sim.c, cv = sim.cv, self = this, last = shown[shown.length - 1], s = last ? last.snap : { a: null, cp: null, gone: false, objs: [], out1: '?', out2: '?', hot: '' }, call = c.how !== 'assign';
    P.size(680, 296);
    P.region('st', 16, 16, 252, 196, 'Variables');
    P.region('hp', 316, 16, 348, 196, 'Heap (where objects are placed)');
    P.text('fa', 30, 58, call ? 'Variable of the main method' : 'Variable', { cls: 'mut' });
    P.box('v_a', 30, 66, 224, 34, s.a ? { cls: 'wait' + (s.hot === 'a' ? ' now' : ''), title: 'a', right: self.cell(s.a, c) } : { cls: 'ghost', title: 'a', right: 'not declared yet' });
    P.text('fc', 30, 136, call ? 'Parameter of the change method' : 'Copy', { cls: 'mut' });
    P.box('v_c', 30, 144, 224, 34, s.cp ? { cls: 'hot' + (s.hot === 'cp' ? ' now' : ''), title: cv, right: self.cell(s.cp, c) } : { cls: 'ghost', title: cv, right: s.gone ? 'gone' : 'not declared yet' });
    if (c.what === 'prim') P.text('he', 490, 118, 'A primitive type does not create an object', { cls: 'mut', anchor: 'middle' });
    s.objs.forEach(function (o, i) {
      var by = []; if (s.a && s.a.ref === o.id) by.push('a'); if (s.cp && s.cp.ref === o.id) by.push('c');
      P.box('o' + o.id, 336, 62 + i * 78, 308, 42, { cls: by.length ? 'good' : 'ghost', title: 'Object ' + o.id + (c.what === 'str' ? ' (String)' : ' (Point)'), sub: by.length ? '' : 'no variable refers to it', right: self.objText(o, c) });
      by.forEach(function (n, j) { P.arrow('ar_' + n, 'v_' + n + ':r', 'o' + o.id + ':l:' + (by.length > 1 ? (j + 1) / 3 : 0.5), { cls: by.length > 1 ? 'hot' : '' }); });
    });
    P.box('r1', 16, 232, 320, 36, { cls: s.out1 === '?' ? 'ghost' : 'plain', title: cv + ': value read', right: s.out1 });
    P.box('r2', 344, 232, 320, 36, { cls: s.out2 === '?' ? 'ghost' : s.out2 === s.out1 && c.what === 'field' && c.how !== 'ret' ? 'bad' : 'plain', title: 'a: value read', right: s.out2 });
    P.note(c.what === 'prim' ? 'A variable of a primitive type holds the value directly. Copying it creates one more value, and the two variables are not connected to each other.' : 'An arrow shows the object that the reference in a variable refers to. When two arrows reach one object, a change made through one is visible through the other.');
  },
  assume: 'The output of the 15 combinations (the value read from the copy and the value read from a) was checked against the result of running code with the same structure on JDK 21 in our test environment. "Reference" is used here to mean a value that points to where an object is. In Java you cannot take this value out and look at it as a number, and whether it is actually a plain memory address differs from one JVM to another. The picture in which variables are placed on the stack and objects on the heap is the usual explanation for local variables, and when the JIT compiler optimizes the code, an object may not be created on the heap at all, but the result of the program is the same. In JDK 21 (the HotSpot JVM) used for the check, the String object for the literal "hi" is also on the heap. The JVM registers the literal in the string pool so that the same literal is shared, but that registration is not drawn here. The frame that is created when a variable is passed to a method is covered in the "Stack and heap" lab, and the difference between == and equals is covered in the "== and equals" lab.',
});
