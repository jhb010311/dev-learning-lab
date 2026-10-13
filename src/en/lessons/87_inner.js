Lab.register({
  id: 'inner', nav: 'Inner classes and anonymous classes', cat: 'Java language', mode: 'step',
  title: 'How is a class declared inside a class connected to the outer object?',
  intro: 'You can declare a class inside another class. An object of an inner class, which is declared without static, holds a reference to the outer object that created it, so it cannot be created without an outer object. An anonymous class, which is created on the spot without a name, and a lambda expression can both use the local variables around them, but changing the value of such a variable is a compile-time error, and what this refers to inside them is different for the two.',
  terms: ['Inner classes and nested classes', 'Anonymous class', 'Effectively final', 'Lambda expression', 'static'],
  controls: [
    { id: 'kind', label: 'What to create inside', type: 'select', value: 'inner', options: [['inner', 'Inner class (no static)'], ['nested', 'static nested class'], ['anon', 'Anonymous class'], ['lambda', 'Lambda expression']] },
    { id: 'use', label: 'What to try', type: 'select', value: 'alone', options: [['field', 'Create an outer object and read the outer field name from inside'], ['alone', 'Create only the nested class object, without an outer object']], show: function (c) { return c.kind === 'inner' || c.kind === 'nested'; } },
    { id: 'loc', label: 'The local variable count used inside', type: 'select', value: 'keep', options: [['keep', 'Its value is not changed'], ['change', 'Changed with count = 2 after creation'], ['arr', 'Stored in an array, and only the element value is changed']], show: function (c) { return c.kind === 'anon' || c.kind === 'lambda'; }, hint: 'An anonymous class and a lambda expression can use, inside their bodies, the local variables of the method that created them.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you create only the object of an inner class (no static) without an outer object?', d: 'Creating an inner class object without an outer object. This is a compile-time error.', v: { kind: 'inner', use: 'alone', loc: 'keep' } },
    { t: 'Creating it with an outer object', q: 'What if you create an outer object and read the outer field name from inside?', d: 'The inner object follows its reference to the outer object and reads the field.', v: { kind: 'inner', use: 'field', loc: 'keep' } },
    { t: 'A static nested class', q: 'What if you create a static nested class instead?', d: 'It can be created without an outer object.', v: { kind: 'nested', use: 'alone', loc: 'keep' } },
    { t: 'Reading an outer field from a static nested class', q: 'What if a static nested class reads the outer field name?', d: 'There is no outer object that it refers to, so this is a compile-time error.', v: { kind: 'nested', use: 'field', loc: 'keep' } },
    { t: 'this in an anonymous class', q: 'What if you create an anonymous class instead?', d: 'this is the object created from the anonymous class itself.', v: { kind: 'anon', use: 'alone', loc: 'keep' } },
    { t: 'this in a lambda expression', q: 'What if you create a lambda expression instead?', d: 'this is the outer object in which the lambda expression is written.', v: { kind: 'lambda', use: 'alone', loc: 'keep' } },
    { t: 'Changing the value of a local variable', q: 'What if you create a lambda expression and change the local variable count with count = 2 after creating it?', d: 'Changing a local variable that is used inside a lambda expression is a compile-time error.', v: { kind: 'lambda', use: 'alone', loc: 'change' } },
  ],
  code: function (c) {
    var main = function (body) { return '\n\npublic class Main {\n    public static void main(String[] args) {\n' + body + '    }\n}'; };
    if (c.kind === 'inner' || c.kind === 'nested') {
      var st = c.kind === 'nested', cn = st ? 'Nested' : 'Inner', field = c.use === 'field';
      var cls = 'class Outer {\n    String name = "A";\n\n    '
        + (st ? 'static class Nested {              // static nested class' : 'class Inner {                      // inner class (no static)')
        + '\n        String who() { return ' + (field ? 'name; }      // field of the outer object' : '"inside"; }') + '\n    }\n}';
      var body = field
        ? '        Outer o = new Outer();\n        Outer.' + cn + ' in = ' + (st ? 'new Outer.Nested();' : 'o.new Inner();          // created with the outer object o')
          + '\n        o.name = "B";                          // changes the field of the outer object after creation\n        System.out.println(in.who());\n'
        : '        Outer.' + cn + ' in = new Outer.' + cn + '();   // created without an outer object\n        System.out.println(in.who());\n';
      return cls + main(body);
    }
    var arr = c.loc === 'arr', cv = arr ? 'count[0]' : 'count';
    var decl = arr ? '        int[] count = { 1 };                 // local variable (refers to an array)\n' : '        int count = 1;                       // local variable\n';
    var p1 = 'System.out.println("count = " + ' + cv + ');\n', p2 = 'System.out.println("this = " + this.getClass().getName());\n';
    var obj = c.kind === 'anon'
      ? '        Runnable r = new Runnable() {        // anonymous class\n            @Override\n            public void run() {\n                ' + p1 + '                ' + p2 + '            }\n        };\n'
      : '        Runnable r = () -> {                 // lambda expression\n            ' + p1 + '            ' + p2 + '        };\n';
    var chg = c.loc === 'change' ? '        count = 2;                           // changes the value after creation\n'
      : arr ? '        count[0] = 2;                        // the variable stays the same; only the array element changes\n' : '';
    return 'class Outer {\n    Runnable make() {\n' + decl + obj + chg + '        return r;\n    }\n}' + main('        Runnable r = new Outer().make();\n        r.run();\n');
  },
  label: function (c) {
    var k = { inner: 'Inner class', nested: 'static nested class', anon: 'Anonymous class', lambda: 'Lambda expression' }[c.kind];
    if (c.kind === 'inner' || c.kind === 'nested') return k + ' · ' + (c.use === 'field' ? 'read an outer field' : 'create without an outer object');
    return k + ' · count ' + { keep: 'not changed', change: 'changed to 2', arr: 'only the array element changed' }[c.loc];
  },
  columns: ['Compilation', 'Output', 'Relationship to the outer object'],
  simulate: function (c) {
    var member = c.kind === 'inner' || c.kind === 'nested', nested = c.kind === 'nested', anon = c.kind === 'anon', arr = c.loc === 'arr';
    var ev = [], sum = [], err = '', rel = '-';
    var st = { cmp: '?', o: '', inn: false, ref: false, cnt: '', live: false, r: false, cap: '', th: '', out: [] };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(msg, meaning) { err = msg; push('Error message: "' + msg + '". ' + meaning + ' Compilation failed, so not a single line of the program runs.', 'bad'); }
    var passed = 'Compilation: The code passed with no errors. Execution now starts from the first line of main.';
    if (member && c.use === 'alone' && !nested) {
      push('The compiler reads the Outer class: Inner has no static. An object of an inner class without static is always created in association with one particular Outer object.');
      st.cmp = 'err';
      push('new Outer.Inner(): This is a compile-time error. main is a static method, so there is no Outer object at this point, and the code does not specify one either. The compiler rejects the code because it cannot determine which outer object the inner object belongs to.', 'bad');
      fail('an enclosing instance that contains Outer.Inner is required', 'It means that there must be an outer object that contains Outer.Inner.');
      sum.push('An object of an inner class without static is created so that it holds a reference to an outer object. So the outer object must exist first, and when you have an outer object o, you create the inner object with o.new Inner().');
      sum.push('If the class inside does not use the fields or methods of the outer object, it is better to add static and make it a static nested class.');
    } else if (member && c.use === 'field' && nested) {
      push('The compiler reads the Outer class: Nested is declared static. An object of a static nested class is not connected to any Outer object.');
      st.cmp = 'err';
      push('return name: This is a compile-time error. name is a field that each Outer object has separately. A Nested object has no Outer object that it refers to, so there is no way to determine whose name to read.', 'bad');
      fail('non-static variable name cannot be referenced from a static context', 'It means that the non-static variable name cannot be used from a static context. Even if main creates an Outer object o, the Nested object does not know about that o.');
      sum.push('A static nested class is an independent class that only borrows a place inside the outer class. It has no reference to an outer object, so it cannot simply use the fields of an outer object.');
      sum.push('If you need a field of the outer object, remove static to make the class an inner class, or pass the value you need to the constructor.');
    } else if (member && !nested) {
      st.cmp = 'ok'; push(passed);
      st.o = 'A';
      push('Outer o = new Outer(): The outer object is created. The value of its name field is "A".');
      st.inn = true; st.ref = true;
      push('o.new Inner(): The inner object is created with o as its outer object. The inner object gets a hidden field that holds a reference to o, the outer object that created it.');
      st.o = 'B';
      push('o.name = "B": The field of the outer object is changed to "B". Nothing is done to the inner object.');
      st.out.push('B'); rel = 'The inner object refers to the outer object o';
      push('in.who(): Inside Inner, name means "the name of the outer object that I refer to". The value was not copied in advance. It is read now by following the reference, so B is printed.', 'good');
      sum.push('An object of an inner class without static holds a reference to the outer object, so it can use the fields and methods of the outer object as if they were its own.');
      sum.push('In return, as long as an inner class object that uses members of the outer object is alive, the outer object is not removed by garbage collection either. This is why static is added to a class inside that does not use the outer object.');
    } else if (member) {
      st.cmp = 'ok'; push(passed);
      st.inn = true;
      push('new Outer.Nested(): The Nested object is created. A static nested class can be created even without an outer object. In this program, not a single Outer object was created.', 'good');
      st.out.push('inside'); rel = 'Does not refer to an outer object';
      push('in.who(): It runs only its own code and returns "inside", which is printed. This object has no reference to an outer object.');
      sum.push('A static nested class merely has the name Outer.Nested. It is created and used in the same way as a separately declared class. It has no reference to an outer object.');
    } else if (c.loc === 'change') {
      push('The compiler reads make(): 1 is assigned to count, and 2 is assigned to it again below. A local variable whose value changes even once is not "effectively final".');
      st.cmp = 'err';
      push('count inside the ' + (anon ? 'anonymous class' : 'lambda expression') + ': This is a compile-time error. ' + (anon ? 'An anonymous class' : 'A lambda expression') + ' does not take the local variable itself. It takes a copy of its value. If the original changed later, it would differ from the copy, so Java allows only local variables whose values do not change to be used inside.', 'bad');
      fail('local variables referenced from ' + (anon ? 'an inner class' : 'a lambda expression') + ' must be final or effectively final', 'It means that local variables used in ' + (anon ? 'an inner class' : 'a lambda expression') + ' must be final or effectively final.' + (anon ? ' An anonymous class is also a kind of inner class, so the message says inner class.' : ''));
      sum.push('"Effectively final" describes a variable whose initial value never changes, even though final is not written. Whether the change comes after the ' + (anon ? 'anonymous class' : 'lambda expression') + ' is created or before it, even one line that assigns to the variable again is an error.');
      sum.push('Anonymous classes and lambda expressions both follow the same rule. If you need to change the value, keep it in a field, or put it in an array or an object and change the value inside, as in "Stored in an array, and only the element value is changed" in the local variable setting.');
    } else {
      st.cmp = 'ok'; push(passed);
      st.o = 'run';
      push('new Outer().make(): An Outer object is created, and make() is called on that object.');
      st.cnt = '1'; st.live = true;
      push(arr ? 'int[] count = { 1 }: An array with one element is created, and the local variable count refers to that array.' : 'int count = 1: This is a local variable inside make(). A local variable disappears when the method ends.');
      st.r = true; st.cap = arr ? 'ref' : '1';
      push((anon ? 'new Runnable() { ... }: A class with no name is declared on the spot, and one object of it is created.' : '() -> { ... }: A lambda expression that holds code to run later is created.') + ' count is used inside, so ' + (arr ? 'it copies and keeps the reference to the array that count refers to. It does not copy the whole array.' : 'it copies and keeps the current value of count, 1.'));
      if (arr) { st.cnt = '2'; push('count[0] = 2: This does not assign something else to the variable count. It changes the element of the array that count refers to. count still refers to the same array, so it is "effectively final", and the compiler does not reject the code.'); }
      st.live = false; st.o = 'done';
      push('return r: As make() ends, the local variable count disappears. ' + (arr ? 'The array remains, because the reference that r copied still refers to it.' : 'The value 1 that r copied remains as it is.'));
      st.out.push('count = ' + (arr ? '2' : '1'));
      push('First line of r.run(): ' + (arr ? 'It follows the copied reference to the array and reads the value of the element. The value that was changed after r was created is visible, so count = 2 is printed.' : 'It reads the copied value and prints count = 1.'), 'good');
      st.th = anon ? 'self' : 'outer'; st.out.push('this = ' + (anon ? 'Outer$1' : 'Outer')); rel = anon ? 'this is the anonymous object itself' : 'this is the outer Outer object';
      push(anon ? 'this.getClass().getName(): Inside an anonymous class, this is the object created from that anonymous class itself. Because the class has no name, the compiler gave it the name Outer$1, and that is what is printed.' : 'this.getClass().getName(): A lambda expression does not have a this of its own. Inside a lambda expression, this is the this of make(), the method in which the lambda expression is written, that is, the outer Outer object. Outer is printed.', anon ? '' : 'good');
      sum.push(anon ? 'An anonymous class declares a new class, so this inside it is the newly created object. To refer to the outer object, you must write Outer.this.' : 'A lambda expression is not a declaration of a new class but a piece of code, so this inside it is the same as this outside the lambda expression. When you convert an anonymous class to a lambda expression, any code that uses this changes its meaning.');
      sum.push(arr ? 'When the value is stored in an array, the variable count does not change and only the value inside the array changes, so the code passes the rule. However, in code that several threads use together, the value can become inconsistent, so use this with care.' : 'Even after make() ends and the local variable disappears, the code runs with the copied value. Because the value is copied, changing that variable elsewhere is not allowed.');
    }
    return { events: ev, summary: sum, err: err, row: [err ? 'Error: ' + err : 'Success', err ? '(not run)' : st.out.join(' / '), rel] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, member = c.kind === 'inner' || c.kind === 'nested', arr = c.loc === 'arr';
    if (!s) { H.text(v, 'Click Run to go one step at a time, starting with compilation.'); return; }
    if (s.cmp === 'err') { H.text(v, 'When there is a compile-time error, no class file is produced, so the program cannot run.'); return; }
    var rows = [];
    if (member) {
      if (s.o) rows.push({ cells: ['o', 'Outer object', 'name = "' + s.o + '"', '-'] });
      if (s.inn) rows.push({ cells: ['in', (c.kind === 'nested' ? 'Nested' : 'Inner') + ' object', '-', { v: s.ref ? 'refers to o' : 'none', cls: s.ref ? 'hot' : '' }] });
      H.table(v, ['Variable', 'Object it refers to', 'Field', 'Reference to the outer object'], rows, 'Objects created');
    } else {
      if (s.cnt) rows.push({ cls: s.live ? '' : 'gone', cells: ['count', 'Local variable of make()', s.live ? (arr ? 'refers to the array { ' + s.cnt + ' }' : s.cnt) : 'gone (the method ended)'] });
      if (s.r) rows.push({ cells: ['r', c.kind === 'anon' ? 'Object of the anonymous class' : 'Lambda expression', arr ? 'copied reference → array { ' + s.cnt + ' }' : 'copied value ' + s.cap] });
      H.table(v, ['Name', 'What it is', 'What it holds'], rows, 'Created inside make()');
    }
  },
  // Diagram: on the left, the outer object (and the local variable); on the right, the object created inside. Arrows show what that object refers to or keeps a copy of.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { cmp: '?', o: '', inn: false, ref: false, cnt: '', live: false, r: false, cap: '', th: '', out: [] };
    var member = c.kind === 'inner' || c.kind === 'nested', nested = c.kind === 'nested', anon = c.kind === 'anon', arr = c.loc === 'arr', bad = s.cmp === 'err';
    P.size(680, 300);
    if (member) {
      P.region('L', 16, 16, 300, 150, 'Outer object');
      P.region('R', 364, 16, 300, 150, 'Nested class object');
      P.box('o', 30, 62, 272, 56, s.o ? { cls: 'wait', title: 'o : Outer object', sub: 'name = "' + s.o + '"' } : { cls: 'ghost', title: 'Outer object', sub: bad ? 'not run' : c.use === 'alone' ? 'not created' : 'not created yet' });
      P.box('in', 378, 62, 272, 56, s.inn ? { cls: s.ref ? 'hot' : 'good', title: 'in : ' + (nested ? 'Nested' : 'Inner') + ' object', sub: s.ref ? 'hidden field refers to o' : 'no reference to an outer object' } : { cls: bad ? 'bad' : 'ghost', title: (nested ? 'Nested' : 'Inner') + ' object', sub: bad ? 'not created (compile-time error)' : 'not created yet' });
      if (s.ref) P.arrow('ref', 'in:l', 'o:r', { cls: 'hot', label: 'reference' });
    } else {
      P.region('L', 16, 16, 300, 180, 'Outer, local variable, array');
      P.region('R', 364, 16, 300, 180, 'What r refers to');
      P.box('o', 30, 50, 272, 34, s.o ? { cls: s.th === 'outer' ? 'good' : 'wait', title: 'Outer object', right: s.o === 'run' ? 'make() running' : 'make() ended' } : { cls: 'ghost', title: 'Outer object', right: bad ? 'not run' : 'not created yet' });
      P.box('cnt', 30, 100, 272, 34, s.cnt && s.live ? { cls: 'wait', title: 'count (local variable)', right: arr ? '→ array' : s.cnt } : { cls: 'ghost', title: 'count (local variable)', right: s.cnt ? 'gone' : bad ? 'set twice' : 'not yet' });
      if (arr) P.box('arr', 30, 150, 272, 34, s.cnt ? { cls: 'hot', title: 'Array object', right: '{ ' + s.cnt + ' }' } : { cls: 'ghost', title: 'Array object', right: 'not created yet' });
      P.box('r', 378, 74, 272, 74, s.r ? { cls: s.th === 'self' ? 'good' : 'wait', title: anon ? 'Anonymous object (class Outer$1)' : 'Lambda expression', sub: [arr ? 'Copied: reference to the array' : 'Copied value: count = ' + s.cap, s.th === 'self' ? 'this = this object itself' : s.th === 'outer' ? 'this = the outer Outer object' : 'this = ?'] } : { cls: bad ? 'bad' : 'ghost', title: anon ? 'Anonymous object' : 'Lambda expression', sub: bad ? 'not created (compile-time error)' : 'not created yet' });
      if (s.r && s.live && !arr) P.arrow('cap', 'cnt:r', 'r:l', { cls: 'hot', label: 'value copied' });
      if (arr && s.cnt && s.live) P.arrow('ca', 'cnt:b', 'arr:t', {});
      if (arr && s.r) P.arrow('ra', 'r:l:0.8', 'arr:r', { cls: 'hot', label: 'reference' });
      if (s.th === 'outer') P.arrow('th', 'r:l:0.2', 'o:r', { cls: 'good', label: 'this' });
    }
    var y = member ? 186 : 212;
    P.box('c1', 16, y, 200, 36, { cls: s.cmp === '?' ? 'ghost' : bad ? 'bad' : 'good', title: 'Compilation', right: s.cmp === '?' ? '?' : bad ? 'Error' : 'Success' });
    P.box('c2', 224, y, 440, 36, { cls: bad ? 'ghost' : s.out.length ? 'good' : 'ghost', title: 'Output', right: bad ? 'not run' : s.out.length ? s.out.join(' / ') : 'none yet' });
    if (bad && sim.err && shown.length >= 3) P.text('em', 16, y + 62, sim.err, { cls: 'bad' });
    P.note(member ? 'An object of an inner class without static refers to the outer object that created it. An object of a static nested class is not connected to an outer object.' : 'An anonymous class and a lambda expression keep a copy of the value of a local variable. A local variable disappears when the method ends, but the copied value remains. What this refers to is different for the two.');
  },
  assume: 'The code of the 24 combinations (10 distinct cases when the hidden settings are excluded) was compiled and run as it is on JDK 21 on this PC, and whether compilation succeeded, the error messages, and the output were checked against the results. That an object of an inner class refers to the outer object, and that a static nested class has no such reference, was confirmed by looking at the hidden field with reflection. That an object of an anonymous class and a lambda expression keep a copy of the value of a local variable (the reference, for an array) was also confirmed through hidden fields on this JDK. However, the form in which a lambda expression keeps the value can differ depending on the JVM implementation. The wording of the error messages is that of javac in JDK 21 and can differ slightly by version. javac in JDK 21 does not create the hidden reference field when the class inside does not use the outer object at all (the anonymous class in this lab is such a case). Even so, the rule that an outer object is required to create an inner class without static is the same.',
});
