Lab.register({
  id: 'generic', nav: 'Generics', cat: 'Java language', mode: 'step',
  title: 'What does the <Integer> in List<Integer> protect you from?',
  intro: 'Generics are the syntax for writing "what type the elements of this list are" in the type, as in List<Integer>. When you write it, the compiler rejects code that adds a value of the wrong type, before the program runs. When you do not write it, that code compiles as it is, and a ClassCastException is thrown much later, at the place where the value is taken out.',
  terms: ['Generics', 'Raw type', 'Type erasure', 'Wildcard (? extends and ? super)'],
  controls: [
    { id: 'decl', label: 'Declaration of the variable list (it refers to the same list as ints)', type: 'select', value: 'raw', options: [['raw', 'List (no generics, a raw type)'], ['int', 'List<Integer>'], ['num', 'List<Number>'], ['ext', 'List<? extends Number>'], ['sup', 'List<? super Integer>']] },
    { id: 'op', label: 'What the code does with list', type: 'select', value: 'addStr', options: [['addInt', 'list.add(3): add an integer'], ['addDbl', 'list.add(3.5): add a floating-point number'], ['addStr', 'list.add("three"): add a string'], ['get', 'Number n = list.get(0): get a value']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you add a string with list.add("three") to the raw type List (no generics)?', d: 'A string is added without generics. The code compiles, and an exception is thrown later, when the value is taken out.', v: { decl: 'raw', op: 'addStr' } },
    { t: 'With generics', q: 'What if you declare the variable list as List<Integer>?', d: 'The same mistake is caught in advance as a compile-time error.', v: { decl: 'int', op: 'addStr' } },
    { t: 'Assigning to List<Number>', q: 'What if you declare list as List<Number> and add a floating-point number with list.add(3.5)?', d: 'Integer is a subtype of Number, and yet the assignment itself does not compile.', v: { decl: 'num', op: 'addDbl' } },
    { t: 'Adding to ? extends', q: 'What if you declare list as List<? extends Number> and add an integer with list.add(3)?', d: 'You can get values, but you cannot add even an Integer.', v: { decl: 'ext', op: 'addInt' } },
    { t: 'Getting from ? extends', q: 'What if you declare list as List<? extends Number> and get a value with Number n = list.get(0)?', d: 'Getting a value as a Number works.', v: { decl: 'ext', op: 'get' } },
    { t: 'Adding to ? super', q: 'What if you declare list as List<? super Integer> and add an integer with list.add(3)?', d: 'You can add an Integer.', v: { decl: 'sup', op: 'addInt' } },
    { t: 'Getting from ? super', q: 'What if you declare list as List<? super Integer> and get a value with Number n = list.get(0)?', d: 'The value cannot be received as a Number. It can be received only as an Object.', v: { decl: 'sup', op: 'get' } },
  ],
  declLine: function (c) { return { raw: 'List list = ints;', int: 'List<Integer> list = ints;', num: 'List<Number> list = ints;', ext: 'List<? extends Number> list = ints;', sup: 'List<? super Integer> list = ints;' }[c.decl]; },
  opLine: function (c) { return { addInt: 'list.add(3);', addDbl: 'list.add(3.5);', addStr: 'list.add("three");', get: 'Number n = list.get(0);' }[c.op]; },
  code: function (c) {
    return '// Only the lines inside main are shown (class, main declaration, and imports omitted)\nList<Integer> ints = new ArrayList<>();\nints.add(1);\nints.add(2);\n\n' + this.declLine(c) + '\n' + this.opLine(c) + '\n' + (c.op === 'get' ? 'System.out.println("value: " + n);\n' : '') + '\nSystem.out.println(ints);\nList<String> strs = new ArrayList<>();\nSystem.out.println(ints.getClass() == strs.getClass());\nInteger last = ints.get(ints.size() - 1);\nSystem.out.println("last value: " + last);';
  },
  label: function (c) { return { raw: 'List', int: 'List<Integer>', num: 'List<Number>', ext: 'List<? extends Number>', sup: 'List<? super Integer>' }[c.decl] + ' · ' + { addInt: 'add(3)', addDbl: 'add(3.5)', addStr: 'add("three")', get: 'get(0)' }[c.op]; },
  columns: ['Compilation', 'Line with the error', 'Output', 'How it ended'],
  // The verdict of the compiler: whether the declaration line is an error, whether the operation on list passes, gets a warning, or is an error, and the message
  judge: function (c) {
    var d = c.decl, o = c.op, V = { addInt: ['3', 'int', 'Integer'], addDbl: ['3.5', 'double', 'Double'], addStr: ['"three"', 'String', 'String'] }[o];
    var declMsg = d === 'num' ? 'incompatible types: List<Integer> cannot be converted to List<Number>' : '', res = 'pass', msg = '';
    if (o === 'get') {
      if (d === 'raw') { res = 'err'; msg = 'incompatible types: Object cannot be converted to Number'; }
      if (d === 'sup') { res = 'err'; msg = 'incompatible types: CAP#1 cannot be converted to Number'; }
    } else if (d === 'raw') { res = 'warn'; msg = 'unchecked call to add(E) as a member of the raw type List'; }
    else if (d === 'ext') { res = 'err'; msg = 'incompatible types: ' + V[1] + ' cannot be converted to CAP#1'; }
    else if (d === 'int' && o !== 'addInt') { res = 'err'; msg = 'incompatible types: ' + V[1] + ' cannot be converted to Integer'; }
    else if (d === 'sup' && o !== 'addInt') { res = 'err'; msg = 'incompatible types: ' + V[1] + ' cannot be converted to CAP#1'; }
    else if (d === 'num' && o === 'addStr') { res = 'err'; msg = 'incompatible types: String cannot be converted to Number'; }
    return { declMsg: declMsg, res: res, msg: msg, val: V ? V[0] : '', prim: V ? V[1] : '', box: V ? V[2] : '' };
  },
  simulate: function (c) {
    var j = this.judge(c), d = c.decl, o = c.op, ev = [], sum = [], declLine = this.declLine(c), opLine = this.opLine(c), opCode = opLine.slice(0, -1);
    var st = { link: '', chk: '', comp: '?', added: '', addedType: '', out: [], err: '', end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var shown = j.val.replace(/"/g, '');   // how the value looks inside the list: 3, 3.5, three

    // ── Compilation phase
    push('List<Integer> ints is created, and 1 and 2 are added: <Integer> is a type argument that says "only Integer values go into this list". The compiler reads this type argument and checks the code that adds values to ints and gets values from it.');
    if (d === 'raw') { st.link = 'ok'; push('List list = ints is checked: The same list is now also referred to by the variable list, which is declared without a type argument (<...>). A generic type used this way, without type arguments, is called a raw type. It is a form that was kept so that code from the time before generics can still be used, so the assignment compiles. In return, the compiler cannot check what is added to list.'); }
    if (d === 'int') { st.link = 'ok'; push('List<Integer> list = ints is checked: The declared types are the same, so the assignment is allowed. list and ints refer to the same list object.'); }
    if (d === 'num') { st.link = 'err'; st.comp = 'Error'; push('List<Number> list = ints is checked: This is a compile-time error. Integer is a subtype of Number, but List<Integer> is not a subtype of List<Number>. The compiler reports "' + j.declMsg + '". If this assignment were allowed, list.add(3.5) could add a floating-point number (Double), and that value would become an element of ints, whose elements are meant to be only Integer.', 'bad'); }
    if (d === 'ext') { st.link = 'ok'; push('List<? extends Number> list = ints is checked: ? extends Number means "some type that is Number or a subtype of Number". A List<Integer> and a List<Double> can both be assigned to this variable, so the check passes. As a result, the compiler knows only that the elements of list are some kind of Number, and it treats their exact type as unknown.'); }
    if (d === 'sup') { st.link = 'ok'; push('List<? super Integer> list = ints is checked: ? super Integer means "some type that is Integer or a supertype of Integer (Number, Object)". A List<Integer>, a List<Number>, and a List<Object> can all be assigned, so the check passes. As a result, the compiler knows only that an Integer can be put into this list.'); }

    st.chk = j.res === 'err' ? 'Error' : j.res === 'warn' ? 'Warning' : 'Passed';
    var CAP = ' CAP#1 is the name that the compiler gives to "the unknown type that ? stands for".';
    if (o !== 'get') {
      if (d === 'raw') push(opCode + ' is checked: list is a raw type, so the compiler cannot check the type of the value that is added. It gives only a warning, not an error ("' + j.msg + '"). ' + (o === 'addInt' ? 'This time the value that is added is an integer, so there is no problem, but that is not something the compiler checked for you.' : 'This code adds a ' + j.box + ' to a list of Integer, and yet it compiles.'), o === 'addInt' ? '' : 'bad');
      if (d === 'int' && o === 'addInt') push(opCode + ' is checked: 3 is converted to an Integer (autoboxing) and can be added. The check passes.', 'good');
      if (d === 'int' && o !== 'addInt') { st.comp = 'Error'; push(opCode + ' is checked: This is a compile-time error. list accepts only Integer, but the code tries to add a ' + j.prim + ' value. The compiler reports "' + j.msg + '". The mistake of adding a value of the wrong type was caught before the program ran.', 'good'); }
      if (d === 'num' && o !== 'addStr') push(opCode + ' is checked: If list were a List<Number>, there would be nothing wrong with this line (' + (o === 'addInt' ? 'Integer is' : 'Double is') + ' a subtype of Number). It is exactly because this line compiles that the assignment on the previous line is rejected. There is one error, on the previous line.');
      if (d === 'num' && o === 'addStr') push(opCode + ' is checked: This line is a compile-time error too. String is not a Number ("' + j.msg + '"). There are two errors, on the previous line and on this line.', 'bad');
      if (d === 'ext') { st.comp = 'Error'; push(opCode + ' is checked: This is a compile-time error ("' + j.msg + '").' + CAP + ' list might actually refer to a List<Double>, so the compiler does not allow adding ' + (o === 'addInt' ? 'even an Integer' : j.box + ' values either') + '. You cannot add any value other than null to a list declared with ? extends.', 'bad'); }
      if (d === 'sup' && o === 'addInt') push(opCode + ' is checked: The check passes. Whether the actual list is a List<Integer>, a List<Number>, or a List<Object>, an Integer can be added to any of them.', 'good');
      if (d === 'sup' && o !== 'addInt') { st.comp = 'Error'; push(opCode + ' is checked: This is a compile-time error ("' + j.msg + '").' + CAP + ' The actual list might be a List<Integer>, so adding a ' + j.box + ' cannot be allowed. What you can add to a ? super Integer list is an Integer.', 'good'); }
    } else {
      if (d === 'raw') { st.comp = 'Error'; push(opCode + ' is checked: This is a compile-time error ("' + j.msg + '"). There is no telling what a value taken out of a raw type is, so it is treated only as an Object. To use it as a Number, you have to write the cast yourself, as in (Number) list.get(0), and whether that cast is correct is known only when the code runs.', 'bad'); }
      if (d === 'int') push(opCode + ' is checked: A value taken out of list is an Integer, and Integer is a subtype of Number, so it can be assigned to a Number variable. The check passes. There is no need to write a cast either.', 'good');
      if (d === 'num') push(opCode + ' is checked: If list were a List<Number>, there would be nothing wrong with this line. There is one error, on the previous line.');
      if (d === 'ext') push(opCode + ' is checked: The check passes. Whatever the actual element type is, it is a subtype of Number, so receiving the value as a Number is always safe.', 'good');
      if (d === 'sup') { st.comp = 'Error'; push(opCode + ' is checked: This is a compile-time error ("' + j.msg + '").' + CAP + ' The actual list might be a List<Object>, so there is no guarantee that the value taken out is a Number. A value taken out of a list declared with ? super can be received only as an Object.', 'bad'); }
    }
    var errLines = [], msgs = [];
    if (j.declMsg) { errLines.push(declLine); msgs.push(j.declMsg); }
    if (j.res === 'err') { errLines.push(opLine); msgs.push(j.msg); }
    if (errLines.length) {
      st.comp = 'Error'; st.end = 'Cannot run';
      push('Compilation failed: No class file is produced, so the program cannot run. Code that could go wrong was filtered out before it ran.', 'bad');
      if (d === 'num') sum.push('A List<Integer> cannot be assigned to a List<Number> variable. Even when the element types are subtype and supertype, lists of those element types are not related at all. If it were allowed, a Double could be added through that variable and break the list of Integer. When you want to accept lists of several kinds of numbers, use List<? extends Number>.');
      if (d === 'int') sum.push('With generics, code that adds a value of the wrong type becomes a compile-time error. Change the declaration to the raw type (List) and run the same code, and you can see the same mistake show up late, as an exception at run time.');
      if (d === 'ext') sum.push('A list declared with ? extends Number allows only "getting a value and using it as a Number". The actual element type is unknown, so adding is rejected. Use it for a parameter whose values are only read (for example, a method that computes a sum).');
      if (d === 'sup' && o !== 'get') sum.push('You can add an Integer to a list declared with ? super Integer, and you cannot add any other type.');
      if (d === 'sup' && o === 'get') sum.push('A list declared with ? super Integer is meant for "adding an Integer". A value taken out of it can be received only as an Object. Use it for a parameter that only has values put into it.');
      if (d === 'raw') sum.push('With a raw type, a value that is taken out is an Object. In the time before generics, you had to write a cast yourself every time you took a value out, and when the cast was wrong, a ClassCastException was thrown at run time.');
      return { events: ev, summary: sum, msgs: msgs, warn: '', crashLine: '', row: ['Error', errLines.join(' / '), '(cannot run)', '(cannot run)'] };
    }
    st.comp = j.res === 'warn' ? 'Success (with a warning)' : 'Success';
    push(j.res === 'warn' ? 'Compilation succeeded: A warning does not stop compilation. The program now runs.' : 'Compilation succeeded: The program now runs.', j.res === 'warn' ? '' : 'good');

    // ── Execution phase
    var bad = o === 'addDbl' || o === 'addStr', content;
    if (o === 'get') {
      st.out.push('value: 1'); content = '[1, 2]';
      push('Number n = list.get(0) runs: It takes out the first element, 1, assigns it to n, and prints "value: 1".', '');
    } else {
      st.added = shown; st.addedType = j.box; content = '[1, 2, ' + shown + ']';
      push(opCode + ' runs: ' + (d === 'raw' ? 'The list object at run time does not remember that it is meant for Integer. Nothing is checked when a value is added, so the ' + j.box + ' value (' + shown + ') goes in as it is.' + (bad ? ' list and ints are the same object, so ints, whose elements are meant to be only Integer, now has a ' + j.box + ' element.' : '') : '3 is added as the third element. list and ints are the same object, so the value is visible through ints too.'), bad ? 'bad' : '');
    }
    st.out.push(content);
    push('System.out.println(ints) runs: It prints the contents of the list. The output is ' + content + '.' + (bad ? ' Printing does not care what type the elements are, so nothing happens yet.' : ''), '');
    st.out.push('true');
    push('ints.getClass() == strs.getClass() runs: It prints true. At run time, a List<Integer> and a List<String> are objects of the very same ArrayList class. <Integer> and <String> are used only for the checks at compile time and do not remain in the code that runs (type erasure).', '');
    var crash = '', lastLine = 'Integer last = ints.get(ints.size() - 1);';
    if (bad) {
      crash = 'java.lang.ClassCastException';
      st.err = 'Exception in thread "main" java.lang.ClassCastException: class java.lang.' + j.box + ' cannot be cast to class java.lang.Integer ...'; st.end = 'Stopped by exception';
      push('Integer last = ints.get(ints.size() - 1) runs: A ClassCastException is thrown. ints is a List<Integer>, so the compiler inserted a cast on this line that "converts the value taken out to an Integer". But the value that actually comes out is a ' + j.box + '. The failure happens not on the line that added the wrong value but much later, on the line that takes it out, so the cause is hard to find.', 'bad');
    } else {
      var lastVal = o === 'get' ? '2' : '3';
      st.out.push('last value: ' + lastVal); st.end = 'Normal exit';
      push('Integer last = ints.get(ints.size() - 1) runs: It takes out the last element (' + lastVal + ') as an Integer and prints it. The output is "last value: ' + lastVal + '". The program ends normally.', 'good');
    }
    var endText = crash ? 'Stopped by exception: ClassCastException (' + j.box + ' cannot be cast to Integer)' : 'Normal exit';
    if (d === 'raw' && bad) sum.push('Without generics (a raw type), code that adds a value of the wrong type compiles, nothing happens at the moment the value is added, and then a ClassCastException is thrown on a different line, the one that takes the value out. Change the declaration to List<Integer>, and the same code becomes a compile-time error.');
    if (d === 'raw' && !bad) sum.push('This time the value that was added is an integer, so there was no problem. But the compiler did not check it for you. It was luck. The warning (unchecked) is the compiler telling you "I could not check this line".');
    if (d === 'int') sum.push('With generics, the compiler checks the type when you add a value, and you do not have to write a cast when you take one out.');
    if (d === 'ext') sum.push('From a list declared with ? extends Number, you can take a value out and use it as a Number.');
    if (d === 'sup') sum.push('You can add an Integer to a list declared with ? super Integer.');
    sum.push('The true in the output shows type erasure. A list at run time does not remember its element type, so all the protection that generics give happens at compile time. If you bypass that check with a raw type, nothing is left to stop the mistake.');
    return { events: ev, summary: sum, msgs: [], warn: j.res === 'warn' ? j.msg : '', crashLine: crash ? lastLine : '', row: [st.comp, 'None', st.out.join(' / '), endText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to see first the checks that the compiler makes and then the execution of the program, one step at a time.'); return; }
    var ALLOW = { raw: 'add anything (no check, a warning) · get gives Object', int: 'add Integer · get gives Integer', num: '(the assignment does not compile)', ext: 'cannot add · get gives Number', sup: 'add Integer · get gives Object' };
    var TYPE = { raw: 'List', int: 'List<Integer>', num: 'List<Number>', ext: 'List<? extends Number>', sup: 'List<? super Integer>' };
    H.table(v, ['Variable', 'Declared type', 'What the compiler allows'], [
      { cells: ['ints', 'List<Integer>', 'add Integer · get gives Integer'] },
      { cls: s.link ? '' : 'gone', cells: ['list', TYPE[c.decl], { v: ALLOW[c.decl], cls: s.link === 'err' ? 'bad' : '' }] },
    ], 'Two variables that refer to the same list');
    H.title(v, 'Console output');
    var lines = s.out.slice(); if (s.err) lines.push(s.err + '  (standard error)');
    v.appendChild(H.el('pre', 'code', lines.length ? lines.join('\n') : '(none yet)'));
  },
  // Diagram: on the left, the variables ints and list; on the right, the list object that both refer to and its elements. Below, it shows whether the compiler let the operation on list pass, and the result.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { link: '', chk: '', comp: '?', added: '', addedType: '', out: [], err: '', end: '?' };
    var TYPE = { raw: 'List (no type argument)', int: 'List<Integer>', num: 'List<Number>', ext: 'List<? extends Number>', sup: 'List<? super Integer>' };
    P.size(680, 280);
    P.region('vr', 16, 16, 236, 152, 'Variables (types the compiler sees)');
    P.region('hp', 300, 16, 364, 152, 'List object at run time');
    P.box('v_ints', 30, 50, 208, 46, { cls: 'wait', title: 'ints', sub: 'List<Integer>' });
    P.box('v_list', 30, 108, 208, 46, { cls: s.link === 'ok' ? (c.decl === 'raw' ? 'hot' : 'wait') : s.link === 'err' ? 'bad' : 'ghost', title: 'list', sub: TYPE[c.decl] });
    P.box('obj', 316, 50, 332, 32, { cls: 'plain', title: 'ArrayList', right: 'no element type recorded' });
    P.box('e0', 316, 94, 100, 58, { cls: 'good', title: '1', sub: 'Integer', center: true });
    P.box('e1', 432, 94, 100, 58, { cls: 'good', title: '2', sub: 'Integer', center: true });
    if (s.added) P.box('e2', 548, 94, 100, 58, { cls: s.addedType === 'Integer' ? 'good' : 'bad now', title: s.added, sub: s.addedType, center: true });
    else P.box('e2', 548, 94, 100, 58, { cls: 'ghost', title: '', sub: 'empty', center: true });
    P.arrow('a_ints', 'v_ints:r', 'obj:l:0.35', {});
    if (s.link === 'ok') P.arrow('a_list', 'v_list:r', 'obj:l:0.75', { cls: c.decl === 'raw' ? 'hot' : '' });
    P.box('chk', 16, 186, 648, 34, { cls: s.chk === 'Error' || s.link === 'err' ? 'bad' : s.chk === 'Warning' ? 'hot' : s.chk === 'Passed' ? 'good' : 'ghost', title: 'Compiler check:  ' + this.opLine(c), right: s.link === 'err' && !s.chk ? 'error on the previous line' : s.chk || 'not yet' });
    P.box('r1', 16, 230, 320, 34, { cls: s.comp === '?' ? 'ghost' : s.comp === 'Error' ? 'bad' : 'good', title: 'Compilation', right: s.comp });
    P.box('r2', 344, 230, 320, 34, { cls: s.end === 'Normal exit' ? 'good' : s.end === '?' ? 'ghost' : 'bad', title: 'Program', right: s.end });
    P.note('A type argument such as <Integer> exists only on the variable side (the side that the compiler sees). The list object at run time has no such information, so it cannot filter out values by itself when they are added.');
  },
  assume: 'All 20 combinations were actually compiled on JDK 21 in our test environment (javac -Xlint:unchecked) from a source file that places the code on the screen inside a main method, and those that compiled were run, and the compilation result, the line and the message of each error, the warning message, the output, the kind of exception, and the line where the exception was thrown were checked against the results. The compiler messages are written in the form that the command-line javac shows (class names only, and CAP#1 for an unknown type). The code on the screen omits import java.util.ArrayList, import java.util.List, and the declaration of the main method. When you compile without -Xlint:unchecked, you get only the note "uses unchecked or unsafe operations" in place of the details of the warning. null can be added even to a list declared with ? extends, but the model does not cover this. Even though type erasure happens, the generic information written in the declarations of fields and methods remains in the class file and can be read through reflection. What is erased is the information that an object has at run time.',
});
