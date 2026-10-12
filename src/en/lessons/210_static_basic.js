Lab.register({
  id: 'static_basic', nav: 'static', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['static'],
  title: 'What is static, and what changes when you add it?',
  intro: 'static is a keyword that you put in front of a field (a variable declared inside a class). A field without static is created separately inside each object, every time you create an object. If you add static, there is only one in the class instead of one per object, and all the objects of that class share that one. So you can use a static field without any object, by the class name, as in Counter.count. A field without static must belong to some object, so you cannot use it by the class name alone. In this lab you add and remove static in front of count and change how it is read, and the same code is compiled and run each time. You see what the compiler reports, what is printed, and where count lives.',
  terms: ['static', 'Field', 'Instance variables and static fields', 'Classes and objects'],
  controls: [
    { id: 'st', label: 'Write static in front of count', type: 'check', value: true },
    { id: 'read', label: 'How count is read when printing', type: 'select', value: 'cls', options: [['cls', 'Read it as Counter.count (by the class name)'], ['obj', 'Read it as a.count (through the object a)']] },
  ],
  // q is the question shown in the question-style screen; t and d are the name and description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does static look like, and what is count after two objects add one each?', d: 'static is in front of count, and it is read by the class name. Compilation succeeds and 2 is printed.', v: { st: true, read: 'cls' } },
    { t: 'Remove static and read a.count', q: 'What if you remove static and read a.count?', d: 'Each object has its own count, so only the count of a is 1. Compilation succeeds and 1 is printed.', v: { st: false, read: 'obj' } },
    { t: 'Remove static and read Counter.count', q: 'What if you remove static and read Counter.count?', d: 'The class name alone cannot say which object the count belongs to, so there is a compile-time error.', v: { st: false, read: 'cls' } },
    { t: 'Keep static and read a.count', q: 'What if you keep static and read a.count?', d: 'Even if you read it through the object a, what is read is the one count in the class. Compilation succeeds and 2 is printed.', v: { st: true, read: 'obj' } },
  ],
  // The kind of error the compiler reports (from the real javac diagnostic code)
  errNonStatic: 'The non-static count cannot be read by the class name',
  code: function (c) {
    var o = ['class Counter {'];
    if (c.st) o.push('    // static: there is only one in the Counter class, not one per object');
    o.push('    ' + (c.st ? 'static ' : '') + 'int count = 0;', '    void up() {', '        count = count + 1;', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) {', '        Counter a = new Counter();', '        Counter b = new Counter();', '        a.up();', '        b.up();', '        System.out.println(' + (c.read === 'cls' ? 'Counter.count' : 'a.count') + ');', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.st ? 'With static' : 'Without static') + ' · ' + (c.read === 'cls' ? 'Read as Counter.count' : 'Read as a.count'); },
  columns: ['Compile', 'What the compiler reports', 'Output', 'Where count lives'],
  simulate: function (c) {
    var ev = [], sum = [], READ = c.read === 'cls' ? 'Counter.count' : 'a.count', READ_LINE = 'System.out.println(' + READ + ');';
    var fail = !c.st && c.read === 'cls';
    var where = c.st ? 'One in the class' : 'One in each object';
    var st = { hot: '', by: '', objs: 0, cells: 0, cls: null, a: null, b: null, bad: {}, compile: '', errText: '', ran: false, out: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var errNonStatic = this.errNonStatic;

    // 1. Read the declaration of count in the Counter class
    st.hot = 'cl';
    st.checks.push(['Where count lives', { v: where, cls: '' }]);
    push('The compiler reads the source from the top. First it reads the declaration of count in the Counter class.' + (c.st ? ' static is in front of count, so count is decided to be a variable that exists once in the Counter class, not one that is created for each object.' : ' There is no static in front of count, so count is decided to be a variable that is created separately inside each Counter object, every time you create one.'), '');

    // 2. Check the line that reads it
    st.hot = 'rd';
    if (fail) {
      st.bad.cl = true; st.errText = errNonStatic;
      st.checks.push([READ_LINE + ' line', { v: 'Error: ' + errNonStatic, cls: 'bad' }]);
      push('The compiler checks the line ' + READ_LINE + ' in main. Counter.count has only the class name and no object. But count is not static, so each object has its own, and it is not decided which object\'s count is meant. So there is an error (javac: non-static variable count cannot be referenced from a static context).', 'bad');
    } else if (c.st && c.read === 'cls') {
      st.checks.push([READ_LINE + ' line', { v: 'Not an error', cls: 'good' }]);
      push('The compiler checks the line ' + READ_LINE + ' in main. Counter.count refers to count by the class name. count is static, so there is one in the Counter class, and you can refer to it without any object. This is not an error.', 'good');
    } else if (c.st) {
      st.checks.push([READ_LINE + ' line', { v: 'Not an error (no warning)', cls: 'good' }]);
      push('The compiler checks the line ' + READ_LINE + ' in main. a.count looks like it refers to count through the object a. But count is static, so what it refers to is not a variable inside a but the one count in the Counter class. It compiles. javac with the default settings reported nothing, and with the -Xlint:all option it gave the warning "static variable should be qualified by type name, Counter, instead of by an expression".', 'good');
    } else {
      st.checks.push([READ_LINE + ' line', { v: 'Not an error', cls: 'good' }]);
      push('The compiler checks the line ' + READ_LINE + ' in main. a.count refers to count through the object a. count is not static, so each object has its own, but which object is meant (a) is decided, so this is not an error.', 'good');
    }

    // 3. Compile result
    st.hot = '';
    if (fail) {
      st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: 1', cls: 'bad' }]);
      push('Compilation fails. The compiler reported 1 error, "' + errNonStatic + '". The Main class file that would run was not created, so the program cannot run, and not even one new Counter() is executed.', 'bad');
    } else {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compilation succeeds and the Main class file that will run is created.', 'good');
    }

    var out = '';
    if (!fail) {
      // 4. new Counter() twice
      st.hot = 'oa'; st.objs = 1;
      if (c.st) { st.cls = 0; st.cells = 1; } else { st.a = 0; st.cells = 1; }
      push('You run it with java Main. main starts, and the first new Counter() creates a Counter object and puts it in the variable a.' + (c.st ? ' count is static, so no count variable is created inside this object. The Counter class has one count variable, and its value is 0.' : ' count is not static, so a count variable is created inside this object, and its value is 0.'), '');
      st.hot = 'ob'; st.objs = 2;
      if (!c.st) { st.b = 0; st.cells = 2; }
      push('The second new Counter() creates one more Counter object and puts it in the variable b.' + (c.st ? ' There are two objects now, but no new count variable was created. There is still only one in the Counter class.' : ' This object also gets its own count variable, with the value 0. Now there are two count variables, the one of a and the one of b.'), '');

      // 5. a.up()
      if (c.st) { st.cls = 1; st.hot = 'cl'; st.by = 'a'; } else { st.a = 1; st.hot = 'oa'; }
      push('The call a.up() runs. count = count + 1; in the up method reads count, adds 1, and stores it again.' + (c.st ? ' This count is the one variable in the Counter class, so its value goes from 0 to 1. If you read it through the object b, its value is 1 right now too.' : ' The call was made on the object a, so this count is the count variable of a. The count of a goes from 0 to 1, and the count of b stays 0.'), '');

      // 6. b.up()
      if (c.st) { st.cls = 2; st.hot = 'cl'; st.by = 'b'; } else { st.b = 1; st.hot = 'ob'; }
      push('The call b.up() runs. It is the same count = count + 1; .' + (c.st ? ' The up of b also adds to the same one variable, so the value goes from 1 to 2. What b adds is on top of what a added.' : ' This time the call was made on the object b, so the count variable of b goes from 0 to 1. The count of a stays 1. The two are different variables.'), '');

      // 7. Read it
      st.by = c.st && c.read === 'obj' ? 'a' : '';
      st.hot = c.st ? 'cl' : 'oa';
      out = c.st ? '2' : '1';
      st.ran = true; st.out = out;
      st.checks.push(['Output', { v: out, cls: 'good' }]);
      if (c.st && c.read === 'cls') push('The line ' + READ_LINE + ' runs. Counter.count is the one count in the Counter class, and its value ' + out + ' is printed.', 'good');
      else if (c.st) push('The line ' + READ_LINE + ' runs. a.count looks like it goes through the object a, but count is static, so what is read is the one count in the Counter class. Its value ' + out + ' is printed. a and b added to the same variable, so reading b.count gives the same value.', 'good');
      else push('The line ' + READ_LINE + ' runs. a.count is the count variable of a, and its value ' + out + ' is printed. The count variable of b is also 1, and they are different variables, so the 2 that you get by adding what both of them added is nowhere.', 'good');
    }

    // Summary: the first line is the answer to this setting (question)
    if (c.st && c.read === 'cls') {
      sum.push('A static field is a field with static in front of it. It differs from an ordinary field in that there is only one in the class instead of one per object, and all the objects of that class share that one. a and b each called up() once and count became 2, because both of them added to the same count.');
      sum.push('Because it is static, you could read it by the class name without any object, as in Counter.count. A field without static is separate for each object, so the class name alone cannot say which object it belongs to.');
    } else if (c.st) {
      sum.push('Even when you keep static and read a.count, compilation succeeded and 2 was printed. It is written through the object a, but what was read is not a variable inside a but the one count in the Counter class.');
      sum.push('A static field belongs to the class, not to an object, so whichever object you read it through, you read the same one. That is why javac with the default settings reported nothing, and with the -Xlint:all option it gave a warning telling you to use the class name.');
    } else if (c.read === 'obj') {
      sum.push('Without static, each object has its own count. a.up() added only to the count of a, and b.up() added only to the count of b, so a.count was 1, and compilation succeeded and 1 was printed.');
      sum.push('The count of b was also 1 (I checked by changing only the reading line to print b.count as well and running it), so the counts of the two objects are different variables. When there are more objects, there are that many more count variables.');
    } else {
      sum.push('A count without static is separate for each object, so the class name Counter alone cannot say which object\'s count is meant. The compiler reported an error, and compilation failed, so it could not run.');
      sum.push('If you change only the reading line to a.count and b.count in the same source and run it, 1 and 1 are printed. There is a count in a and another in b. To read it by the class name, count must exist once in the class, and that is what static does.');
    }
    return { events: ev, summary: sum, nerr: fail ? 1 : 0, errAt: fail ? [READ_LINE] : [], row: [fail ? 'Error' : 'Success', fail ? errNonStatic : 'None', fail ? 'Cannot run' : out, where] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    if (s.cells) {
      var rows = c.st ? [['count of the Counter class', s.cls]] : [['count of a', s.a], ['count of b', s.b]].filter(function (r) { return r[1] !== null; });
      H.table(v, ['count variable', 'Value'], rows.map(function (r) { return { cls: '', cells: [r[0], { v: String(r[1]), cls: 'hot' }] }; }), 'count variables and values');
    }
    H.counters(v, [[s.objs, 'Counter objects created'], [s.cells, 'count variables']]);
  },
  // Diagram: the Counter (class) box on the left and the boxes for objects a and b on the right. With static, one count variable is inside the class box. Without it, one is in each object box. The variable being added to or read is shown in yellow, and the compile result and output are below.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 300);
    var hot = s ? s.hot : '', bad = s ? s.bad : {}, failed = s && s.compile === 'err';
    var clSub = c.st ? ['static int count', !s || s.cls === null ? 'Value: before the run' : 'count: ' + s.cls] : ['No count variable here', 'One is created in each object'];
    P.box('cl', 14, 20, 270, 140, { cls: bad.cl ? 'bad' : hot === 'cl' ? 'hot now' : 'plain', title: 'Counter (class)', sub: clSub });
    function obj(id, y, name, made, n) {
      var sub = made ? (c.st ? 'No count variable' : 'count: ' + n) : failed ? 'Not created' : 'Does not exist yet';
      P.box(id, 394, y, 272, 62, { cls: made ? (hot === id ? 'hot now' : 'plain') : 'ghost', title: name + ' (Counter object)', sub: sub });
    }
    obj('oa', 20, 'a', s && s.objs >= 1, s ? s.a : null);
    obj('ob', 98, 'b', s && s.objs >= 2, s ? s.b : null);
    if (c.st && s && s.by === 'a') P.arrow('ua', 'oa:l', 'cl:r:0.3', { cls: 'hot' });
    if (c.st && s && s.by === 'b') P.arrow('ub', 'ob:l', 'cl:r:0.7', { cls: 'hot' });
    P.box('r1', 14, 184, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : failed ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 246, 652, 36, { cls: s && s.ran ? 'good' : failed ? 'bad' : 'ghost', title: 'Output', right: s && s.ran ? s.out : failed ? 'Cannot run' : '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all four combinations, the same source as the code on the screen (identical line by line) was compiled with javax.tools. The ones that compiled had their class files loaded by a new class loader and Main.main was run, and the results were checked against the standard output that was captured. What was checked is whether compilation succeeded, the diagnostic code of the first error (compiler.err.non-static.cant.be.ref, shown on the screen as the error description), the number of errors and the lines where they occurred, whether the Main class file was created, and the output when run. The "Where count lives" column was checked with values from a separately compiled and run source in which, with the same declaration, only the reading line was changed to print a.count and b.count (2 and 2 with static, 1 and 1 without). Even in the combination that gets a compile-time error, the source with only the reading line changed compiles and runs. The values right after a.up(), which the step sentences rely on (a.count and b.count are 1 and 1 with static, and 1 and 0 without), were also checked by a separate run. The documentation checked was the Java Language Specification (Java SE 21), opened directly. The rule that a static field has exactly one variable however many objects are created, and that a field that is not static gets a variable in each object every time one is created, follows section 8.3.1.1. The rule that when a static field is read through an object the expression is evaluated, the result is discarded, and the value of the field is used follows section 15.11.1. The rule that using a field that is not static by the class name is a compile-time error follows section 6.5.6.2. The kind of error, the number of errors, and the line where each occurs are not set by the specification. They were observed with this javac. When a static field is read through an object as in a.count, this javac gave no warning with the default settings, and with the -Xlint:all option it gave one warning on that line, "static variable should be qualified by type name, Counter, instead of by an expression". The warning is not set by the specification. It is the behavior of this javac. static can also be put on methods and initializer blocks. Inside a static method there is no target object, so you cannot use a field that is not static by its name alone, but this lab covered only static fields. It also did not cover when the value of a static field is set, or the problems when several threads change it together. The relation between static methods and members that are not static is covered in "In-depth lab: static and instance".',
});
