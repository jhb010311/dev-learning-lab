Lab.register({
  id: 'static', nav: 'static and instance', cat: 'Java language', mode: 'step',
  title: 'Why does the value of a change when only b was touched?',
  intro: 'When you put static in front of a field, the field exists only once, in the class and not in an object, and all objects share that one field. An instance variable, which is a field without static, is created separately for each object. A static method is called without an object, so you cannot use instance variables or this inside it.',
  terms: ['static', 'Classes and objects', 'Instance members and static members', 'this'],
  controls: [
    { id: 'decl', label: 'Declaration of the count field', type: 'select', value: 'static', options: [['inst', 'int count (instance variable)'], ['static', 'static int count (static field)']] },
    { id: 'extra', label: 'Additional code', type: 'select', value: 'none', options: [['none', 'None'], ['sm', 'return count in the static method report()'], ['smThis', 'return this.count in the static method report()'], ['cls0', 'Print Counter.count before creating any object'], ['clsHit', 'Call Counter.hit() without an object']] },
    { id: 'nb', label: 'Number of calls to b.hit()', type: 'select', value: '1', options: [['0', 'None'], ['1', 'Once'], ['2', 'Twice']], hint: 'a.hit() is always called twice.' },
  ],
  presets: [
    { t: 'Default settings', d: 'count is static. a.hit() is called twice and b.hit() once, yet both print 3.', v: { decl: 'static', extra: 'none', nb: '1' } },
    { t: 'Without static', d: 'Each object has its own count. The output is 2 and 1.', v: { decl: 'inst', extra: 'none', nb: '1' } },
    { t: 'An instance variable used in a static method', d: 'It cannot be determined which object the count belongs to, so the result is a compile-time error.', v: { decl: 'inst', extra: 'sm', nb: '1' } },
    { t: 'A static field used in a static method', d: 'The value is read with Counter.report(), without an object.', v: { decl: 'static', extra: 'sm', nb: '1' } },
    { t: 'this used in a static method', d: 'Even though count is static, this cannot be used.', v: { decl: 'static', extra: 'smThis', nb: '1' } },
    { t: 'Counter.count before any object is created', d: 'A static field exists even when there are no objects at all.', v: { decl: 'static', extra: 'cls0', nb: '1' } },
    { t: 'Counter.hit() without an object', d: 'An instance method cannot be called with the class name.', v: { decl: 'static', extra: 'clsHit', nb: '1' } },
  ],
  code: function (c) {
    var e = this.error(c), isS = c.decl === 'static', nb = +c.nb, i;
    var s = 'class Counter {\n    ' + (isS ? 'static int count;              // static field: one in the class' : 'int count;                     // instance variable: one in each object') + '\n\n    void hit() {                   // instance method\n        count++;\n    }\n';
    if (c.extra === 'sm') s += '\n    static int report() {          // static method\n        return count;' + (e ? '              // compile-time error' : '') + '\n    }\n';
    if (c.extra === 'smThis') s += '\n    static int report() {          // static method\n        return this.count;         // compile-time error\n    }\n';
    s += '}\n\n';
    if (c.extra === 'cls0') s += 'System.out.println(Counter.count);' + (e ? '   // compile-time error' : '   // there are no objects yet') + '\n';
    if (c.extra === 'clsHit') s += 'Counter.hit();                        // compile-time error\n';
    s += 'Counter a = new Counter();\nCounter b = new Counter();\na.hit();\na.hit();\n';
    for (i = 0; i < nb; i++) s += 'b.hit();\n';
    s += 'System.out.println(a.count + " " + b.count);';
    if (c.extra === 'sm' || c.extra === 'smThis') s += '\nSystem.out.println(Counter.report());';
    return s;
  },
  label: function (c) { return (c.decl === 'static' ? 'static int count' : 'int count') + ' · ' + { none: 'nothing added', sm: 'count in report()', smThis: 'this.count in report()', cls0: 'Counter.count first', clsHit: 'Counter.hit()' }[c.extra] + ' · b.hit() ' + c.nb + '×'; },
  columns: ['Compilation', 'a.count and b.count', 'Output of the added line'],
  // If this combination is a compile-time error, { msg: the javac message, at: where the error occurs }; otherwise null
  error: function (c) {
    var V = 'non-static variable count cannot be referenced from a static context';
    if (c.extra === 'smThis') return { msg: 'non-static variable this cannot be referenced from a static context', at: 'mt' };
    if (c.extra === 'clsHit') return { msg: 'non-static method hit() cannot be referenced from a static context', at: 'mt' };
    if (c.decl === 'inst' && c.extra === 'sm') return { msg: V, at: 'mt' };
    if (c.decl === 'inst' && c.extra === 'cls0') return { msg: V, at: 'sf' };
    return null;
  },
  simulate: function (c) {
    var isS = c.decl === 'static', nb = +c.nb, x = c.extra, hasM = x === 'sm' || x === 'smThis', e = this.error(c), ev = [], sum = [], i;
    var st = { cls: false, sv: '', a: false, av: '', b: false, bv: '', hot: '', by: '', ab: '', ex: '', err: '', errAt: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    push('Compilation: The compiler reads the declaration of Counter. count is ' + (isS ? 'a static field, so there is only one, in the class' : 'an instance variable, so there is one in each object') + ', and hit() is an instance method, declared without static, so it is called on an object, as in a.hit().' + (hasM ? ' report() is a static method, so it is called without an object, as Counter.report().' : ''));
    if (e) {
      st.err = e.msg; st.errAt = e.at;
      if (x === 'smThis') push('Compilation: The compiler checks this.count inside the static method report(). The keyword this means "the object that the method is working on now", but a static method is called without an object, so it has no this. ' + (isS ? 'Even though count is a static field, the word this itself cannot be used,' : 'With no object to refer to, this.count cannot be read either,') + ' and the result is a compile-time error.', 'bad');
      else if (x === 'sm') push('Compilation: The compiler checks count inside the static method report(). count is an instance variable, which each object has separately. A static method is called without an object, so it cannot be determined which object the count belongs to. The result is a compile-time error.', 'bad');
      else if (x === 'cls0') push('Compilation: The compiler checks Counter.count. With the class name, you can use only the static members, which belong to the class. count is an instance variable, which each object has separately, so there is no telling which object it belongs to. The result is a compile-time error.', 'bad');
      else push('Compilation: The compiler checks Counter.hit(). hit() is an instance method, so there must be an object for it to run on. ' + (isS ? 'Even though the count that hit() touches is a static field, an object is needed as long as hit() itself is not static. ' : '') + 'With the class name alone there is no target object, so the result is a compile-time error.', 'bad');
      sum.push('This is a compile-time error. The javac message is "' + e.msg + '", which means "something that is not static cannot be used in a place that is static". The program does not run.');
      if (x === 'smThis') { sum.push('A static method has no this, because it is called with the class name, without an object.'); sum.push(isS ? 'count is static, so you can remove this and write return count. Select "return count in the static method report()" in the settings and compare.' : 'To read a value of some object in a static method, the method must receive that object as an argument. Written as static int report(Counter c) { return c.count; }, it compiles.'); }
      if (x === 'sm') { sum.push('Inside a static method, only static members can be used by name alone. An instance variable exists only when there is an object.'); sum.push('There are two ways to fix this. If count is a value that needs to exist only once for the whole class, add static to count. If it is a value that must differ for each object, receive the object as an argument, as in static int report(Counter c) { return c.count; }.'); }
      if (x === 'cls0') sum.push('An instance variable can be read only through an object, as in a.count. To read a field with the class name, the field must be static. Change the declaration of count to static and compare.');
      if (x === 'clsHit') sum.push('An instance method is called on an object, as in a.hit(). You often run into this error when you try to call an instance method directly inside a static method such as main. In that case, first create an object with new and call the method on that object.');
      return { events: ev, summary: sum, row: ['Error: ' + e.msg, 'Not run', 'Not run'] };
    }
    st.cls = true; if (isS) st.sv = '0';
    push('Execution starts: The Counter class is made ready when it is first used. ' + (isS ? 'One static field count is created in the class and set to its default value, 0. There are no objects yet.' : 'This class has no static fields, so no value is placed on the class side. count is created inside an object when the object is created.'));
    if (x === 'cls0') { st.ex = '0'; st.hot = 'sf'; push('System.out.println(Counter.count): No object has been created, but a static field is in the class, so it can be read with the class name. The output is 0.', 'good'); }
    st.a = true; st.av = '0'; st.hot = 'oa';
    push('Counter a = new Counter(): An object is created on the heap, and a refers to it. ' + (isS ? 'count is static, so it does not go inside the object. This object has no count of its own.' : 'A count of its own is created inside this object and set to its default value, 0.'));
    st.b = true; st.bv = '0'; st.hot = 'ob';
    push('Counter b = new Counter(): A second object is created, and b refers to it. ' + (isS ? 'b has no count of its own either. There is still only one count, in the class.' : 'A count is created inside b as well. It is a separate variable from the count of a.'));
    function hit(who, n) {
      st.by = who;
      if (isS) { st.sv = String(+st.sv + 1); st.hot = 'sf'; push(who + '.hit(): count++ inside hit() runs. ' + (who === 'b' ? 'The method is called on b, but count is a static field, so the very same count that a.hit() incremented goes up further.' : 'count is a static field, so the single count in the class increases by 1.') + ' The value is now ' + st.sv + '.'); }
      else { var k = who === 'a' ? 'av' : 'bv'; st[k] = String(+st[k] + 1); st.hot = 'o' + who; push(who + '.hit(): count++ inside hit() runs. Inside an instance method, count is the count of the object that the method is called on, here ' + who + '. Only the count of ' + who + ' increases by 1, to ' + st[k] + '. The count of ' + (who === 'a' ? 'b' : 'a') + ' stays at ' + st[who === 'a' ? 'bv' : 'av'] + '.'); }
    }
    hit('a'); hit('a'); for (i = 0; i < nb; i++) hit('b');
    st.by = ''; st.hot = 'read'; st.ab = isS ? st.sv + ' ' + st.sv : st.av + ' ' + st.bv;
    push('System.out.println(a.count + " " + b.count): ' + (isS ? 'a.count and b.count differ only in how they are written. Both read the single count in the class. When a static field is read through an object variable, the static field of Counter, the type of the variable, is read.' : 'The count of a and the count of b are different variables. Each holds only the number of times hit() was called on its own object.') + ' The output is ' + st.ab + '.', x === 'sm' ? '' : 'good');
    if (x === 'sm') { st.hot = 'mt'; st.ex = st.sv; push('System.out.println(Counter.report()): report() is a static method, so it is called with the class name, without an object. The count inside it is a static field, so it can be read without an object. The output is ' + st.ex + '.', 'good'); }
    sum.push('The output of a.count and b.count is ' + st.ab + '.' + (st.ex ? ' The output of the added line is ' + st.ex + '.' : ''));
    if (isS) {
      sum.push('There is only one static field, in the class, so all objects see the same value. The calls to a.hit() (2 of them) and to b.hit() (' + nb + ' of them) increment the same count, so whichever object you read it through, the value is the total, ' + st.sv + '.' + (nb === 0 ? ' b.count is not 0 even though b.hit() was never called.' : ''));
      sum.push('Using a static field through an object variable, as in a.count, is confusing because it looks like a value that each object has separately. As a rule, use static members with the class name, as in Counter.count.');
      if (x === 'none') sum.push('Make a value that must differ for each object (a name, a quantity) an instance variable, and make a value that needs to exist only once for the whole class (a constant, the number of objects created) a static field. Remove static from the declaration and compare the results.');
      if (x === 'sm') sum.push('A static method is called without an object, as Counter.report(). Inside it, you can use static fields and other static methods by name alone. If you remove static from count, the same report() does not compile.');
      if (x === 'cls0') sum.push('A static field exists together with the class even when there are no objects at all. That is why Counter.count was read as 0 before any object was created. An instance variable is created only when an object is created, so it cannot be read this way.');
    } else {
      sum.push('Each object has its own instance variable. a.hit() increments only the count of a, and b.hit() increments only the count of b.');
      sum.push('If you add static to the declaration, the output of the same code is ' + (2 + nb) + ' ' + (2 + nb) + '. Change the setting and compare.');
    }
    return { events: ev, summary: sum, row: ['Success', st.ab, st.ex || 'No line added'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, isS = c.decl === 'static';
    if (!s) { H.text(v, 'Click Run to go one step at a time, starting from compilation.'); return; }
    if (s.err) { H.title(v, 'Compile-time error'); H.text(v, 'javac: ' + s.err); H.text(v, 'No program is produced, so there is no object and no output.'); return; }
    var rows = [];
    if (isS) rows.push({ cells: ['Class Counter', { v: s.sv === '' ? 'none yet' : s.sv, cls: s.hot === 'sf' ? 'hot' : '' }, 'Shared by a and b'] });
    else { if (s.a) rows.push({ cells: ['Object that a refers to', { v: s.av, cls: s.hot === 'oa' ? 'hot' : '' }, 'Used only by a'] }); if (s.b) rows.push({ cells: ['Object that b refers to', { v: s.bv, cls: s.hot === 'ob' ? 'hot' : '' }, 'Used only by b'] }); }
    H.table(v, ['Where count is', 'Value', 'Used by'], rows, isS ? 'The count variable: 1 in the class' : 'The count variable: 1 in each object');
    if (!rows.length) H.text(v, 'There are no objects yet, so there is no count either.');
    var ln = H.lanes(v);
    H.lane(ln, 'a', s.a ? (isS ? 'object exists · no count of its own' : 'object exists · count ' + s.av) : 'none yet', s.a ? (s.by === 'a' ? 'hot' : 'wait') : 'none');
    H.lane(ln, 'b', s.b ? (isS ? 'object exists · no count of its own' : 'object exists · count ' + s.bv) : 'none yet', s.b ? (s.by === 'b' ? 'hot' : 'wait') : 'none');
    var cs = [[s.ab || '?', 'a.count and b.count']];
    if (c.extra === 'sm') cs.push([s.ex || '?', 'Counter.report()']);
    if (c.extra === 'cls0') cs.push([s.ex || '?', 'Counter.count before any object']);
    H.counters(v, cs);
  },
  // Diagram: the class (only one) on the left, and two objects on the heap on the right. The key point is whether there is one count box on the left or one in each object on the right. An arrow shows which count hit() increments.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { cls: false, sv: '', a: false, av: '', b: false, bv: '', hot: '', by: '', ab: '', ex: '', err: '', errAt: '' };
    var isS = c.decl === 'static', x = c.extra, hasM = x === 'sm' || x === 'smThis';
    P.size(680, 264);
    P.region('cl', 16, 16, 300, 168, 'Class Counter (one in the program)');
    P.region('hp', 364, 16, 300, 168, 'Heap (separate for each object)');
    if (isS) P.box('sf', 30, 52, 272, 46, { cls: s.sv === '' ? 'ghost' : s.hot === 'sf' ? 'hot now' : 'good', title: 'static field count', sub: 'The one that all objects share', right: s.sv === '' ? '' : s.sv });
    else P.box('sf', 30, 52, 272, 46, { cls: s.errAt === 'sf' ? 'bad' : 'ghost', title: 'No static field', sub: 'Each object has its own count' });
    if (hasM) P.box('mt', 30, 114, 272, 46, { cls: s.errAt === 'mt' ? 'bad' : s.hot === 'mt' ? 'hot now' : 'plain', title: 'static method report()', sub: 'Called without an object. No this' });
    else P.box('mt', 30, 114, 272, 46, { cls: s.errAt === 'mt' ? 'bad' : s.by ? 'hot' : 'plain', title: 'Instance method hit()', sub: s.by ? 'Target object now: ' + s.by : 'Must be called on an object' });
    function obj(id, name, on, val) {
      if (!on) { P.box(id, 378, id === 'oa' ? 52 : 114, 272, 46, { cls: 'ghost', title: name, sub: s.err ? 'not run' : 'no object yet' }); return; }
      P.box(id, 378, id === 'oa' ? 52 : 114, 272, 46, { cls: s.hot === id ? 'hot now' : 'wait', title: name + '\'s object', sub: isS ? 'No count of its own' : 'Its own count', right: isS ? '' : val });
    }
    obj('oa', 'a', s.a, s.av); obj('ob', 'b', s.b, s.bv);
    if (isS && s.by) P.arrow('wr', 'o' + s.by + ':l', 'sf:r', { cls: 'hot', label: 'count++' });
    if (isS && s.hot === 'read') { P.arrow('ra', 'oa:l', 'sf:r:0.35', { cls: 'good' }); P.arrow('rb', 'ob:l', 'sf:r:0.7', { cls: 'good' }); }
    var exT = { none: 'No line added', sm: 'Counter.report()', smThis: 'Counter.report()', cls0: 'Counter.count before any object', clsHit: 'Counter.hit()' }[x];
    P.box('o1', 16, 204, 320, 38, { cls: s.err ? 'bad' : s.ab ? 'good' : 'ghost', title: s.err ? 'Compile-time error' : 'a.count and b.count', right: s.err ? 'not run' : s.ab || '?' });
    P.box('o2', 344, 204, 320, 38, { cls: s.err ? 'bad' : s.ex ? 'good' : 'ghost', title: exT, right: s.err ? 'error' : x === 'none' ? '' : s.ex || '?' });
    P.note(isS ? 'There is only one count box, in the class on the left. Whether it is called on a or on b, hit() increments this one count, and a.count and b.count also read this one count.' : 'There is one count in each object on the right. a.hit() increments only the count of a, and b.hit() increments only the count of b. The code of the method itself exists only once, in the class, and an instance method is passed its target object when it is called.');
  },
  assume: 'All 30 combinations were actually compiled and run with the same code on JDK 21 on this PC, and the compilation result, the error message, and the output were checked against the results. It was also confirmed by execution that the "static method that receives an object as an argument", which the summary gives as a fix, compiles and runs, and that the object is not used when a static field is read through an object variable (no exception is thrown even when it is read through a variable that is null). Simplifications: the "class" area in the diagram lumps together the place where the JVM keeps class information, and exactly where in memory a static field is placed depends on the JVM implementation. The exact moment when the class is made ready (when an object is first created or a static member is first used) is reduced to the single step "Execution starts". Code that uses a static field through an object variable, as in a.count, compiles but is not recommended, and it is included here to show that the field is shared. The error message is the first line of the English message from javac.',
});
