Lab.register({
  id: 'ctor_basic', nav: 'Constructors', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['ctor'],
  title: 'What is a constructor, and when does it run?',
  intro: 'A constructor is a block of code that you write inside a class. It differs from a method in two ways: its name is the same as the class name, and you do not write a return type. You have to call a method by name to run it, but a constructor runs once every time new Card("Alice") is executed, and it fills in the fields of the object that was just created. If you write no constructor at all, the compiler adds one that does nothing. In this lab you remove the Card(String owner) constructor or change the line that creates the object to new Card(), and the same code is compiled and run each time. You see what the compiler reports and how many times the constructor runs.',
  terms: ['Constructor', 'Default constructor', 'this', 'Default values of fields'],
  controls: [
    { id: 'ctor', label: 'Write the Card(String owner) constructor', type: 'check', value: true },
    { id: 'arg', label: 'The line that creates the object', type: 'select', value: 'name', options: [['name', 'Create it with new Card("Alice")'], ['empty', 'Create it with new Card()']] },
    { id: 'two', label: 'Create one more object', type: 'check', value: false },
  ],
  // q is the question shown in the question-style screen; t and d are the name and description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a constructor look like, and what happens when new Card("Alice") runs?', d: 'The constructor is there, and the object is created with a value. new runs the constructor once, it fills in owner, and "Alice" is printed.', v: { ctor: true, arg: 'name', two: false } },
    { t: 'Create one more object', q: 'What if you create one more object?', d: 'new runs once more, so the constructor runs once more. The owner of each of the two objects is filled in separately.', v: { ctor: true, arg: 'name', two: true } },
    { t: 'Remove the constructor and create with new Card()', q: 'What if you remove the constructor and create the object with new Card()?', d: 'The compiler adds a default constructor, so the code compiles. Nothing fills in owner, so null is printed.', v: { ctor: false, arg: 'empty', two: false } },
    { t: 'Remove the constructor and pass a value', q: 'What if you remove the constructor but keep new Card("Alice")?', d: 'No constructor takes a value, so there is a compile-time error.', v: { ctor: false, arg: 'name', two: false } },
    { t: 'Keep the constructor and create without a value', q: 'What if you keep the constructor but create the object with new Card()?', d: 'You wrote a constructor that takes a value, so creating an object without a value is a compile-time error.', v: { ctor: true, arg: 'empty', two: false } },
  ],
  // The kinds of error the compiler reports (the real javac diagnostic code compiler.err.cant.apply.symbol, split into two cases)
  errGiven: 'The Card constructor takes no arguments, but an argument was passed',
  errNeed: 'The Card constructor needs an argument, but none was passed',
  code: function (c) {
    var o = ['class Card {', '    String owner;'];
    if (c.ctor) o.push('    // Constructor: has the same name as the class. It runs when new Card(...) is executed', '    Card(String owner) {', '        System.out.println("constructor ran");', '        this.owner = owner;', '    }');
    o.push('}', '', 'public class Main {', '    public static void main(String[] args) {');
    o.push('        Card a = new Card(' + (c.arg === 'name' ? '"Alice"' : '') + ');', '        System.out.println(a.owner);');
    if (c.two) o.push('        Card b = new Card(' + (c.arg === 'name' ? '"Bob"' : '') + ');', '        System.out.println(b.owner);');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.ctor ? 'Constructor written' : 'No constructor') + ' · ' + (c.arg === 'name' ? 'new Card("Alice")' : 'new Card()') + ' · ' + (c.two ? '2 objects' : '1 object'); },
  columns: ['Compile', 'What the compiler reports', 'Output when run', 'Times the constructor ran'],
  simulate: function (c) {
    var ev = [], sum = [], name = c.arg === 'name', two = !!c.two;
    var ok = c.ctor === name;
    var vars = two ? ['a', 'b'] : ['a'], vals = ['Alice', 'Bob'];
    function call(i) { return 'new Card(' + (name ? '"' + vals[i] + '"' : '') + ')'; }
    function line(i) { return 'Card ' + vars[i] + ' = ' + call(i) + ';'; }
    var first = ok ? '' : c.ctor ? this.errNeed : this.errGiven;
    var nerr = ok ? 0 : vars.length;
    var errAt = ok ? [] : vars.map(function (v, i) { return line(i); });
    var st = { hot: [], bad: {}, cdef: false, cur: -1, phase: '', objs: [], param: '', runs: 0, compile: '', errs: 0, errText: '', outs: [], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }

    // 1. Read class Card
    st.hot = ['ct']; st.cdef = true;
    if (c.ctor) {
      st.checks.push(['Constructor of Card', { v: 'Written: Card(String owner)', cls: 'good' }]);
      push('The compiler reads the source from the top. Inside class Card there is Card(String owner). Its name is the same as the class and it has no return type in front of it, so it is a constructor. It is written to take one String value.', '');
    } else {
      st.checks.push(['Constructor of Card', { v: 'None: the compiler adds Card()', cls: '' }]);
      push('The compiler reads the source from the top. Inside class Card there is no constructor at all. In that case the compiler adds a constructor Card() that takes no value and puts no value into the fields (the default constructor). The code we wrote stays as it is, and this constructor is put inside the compiled Card class.', '');
    }

    // 2. For each new Card(...) line, check that a constructor fits the value passed
    vars.forEach(function (v, i) {
      st.hot = ['nw', 'ct']; st.cur = i; st.phase = 'chk';
      var head = i === 0, given = name ? 'you passed one String value' : 'you passed no value';
      if (ok) {
        st.checks.push([call(i) + ' line', { v: 'A matching constructor exists', cls: 'good' }]);
        if (head && c.ctor) push('The compiler checks the line ' + line(i) + ' in Main. When you create an object with new, Card must have a constructor that fits the value you pass. Here ' + given + ', and Card(String owner) takes one String value, so it fits.', 'good');
        else if (head) push('The compiler checks the line ' + line(i) + ' in Main. When you create an object with new, Card must have a constructor that fits the value you pass. Here ' + given + ', and the Card() that the compiler added also takes no value, so it fits. Because you wrote no constructor at all, you can create the object without a value.', 'good');
        else push('The compiler checks the line ' + line(i) + ' in Main. It fits the same constructor as the line before, so this line is fine too.', 'good');
      } else {
        st.bad.nw = true; fail(first);
        st.checks.push([call(i) + ' line', { v: 'Error: no matching constructor', cls: 'bad' }]);
        if (head && c.ctor) push('The compiler checks the line ' + line(i) + ' in Main. You passed no value, but the only constructor of Card is Card(String owner), which takes a String value, so nothing fits. This is an error (javac: constructor Card in class Card cannot be applied to given types). Once you write even one constructor, the compiler does not add a Card() that takes no value. So there is no way to create the object without a value.', 'bad');
        else if (head) push('The compiler checks the line ' + line(i) + ' in Main. You passed a String value, but the only constructor of Card is the Card() that the compiler added, which takes no value, so nothing fits. This is an error (javac: constructor Card in class Card cannot be applied to given types). To use a value, you have to write a constructor that takes it.', 'bad');
        else push('The compiler checks the line ' + line(i) + ' in Main. It is an error for the same reason as the line before. javac reports both of the 2 errors.', 'bad');
      }
    });

    // 3. Compile result
    st.hot = []; st.phase = ''; st.cur = -1;
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compilation succeeds and the Main class file that will run is created. Whether a constructor fits the value you passed is not checked at run time. The compiler checked it just now, while compiling.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: ' + nerr, cls: 'bad' }]);
      push('Compilation fails. The compiler reported ' + nerr + (nerr === 1 ? ' error' : ' errors') + ', and the first one is "' + first + '". The Main class file was not created, so the program cannot run. No object was created and no constructor ran.', 'bad');
    }

    // 4. Run: at each new, create an object and run the constructor
    if (ok) {
      vars.forEach(function (v, i) {
        var head = i === 0, val = '"' + vals[i] + '"';
        st.cur = i; st.hot = ['nw', 'o' + i]; st.phase = 'make'; st.objs.push({ owner: null });
        push(head ? 'You run it with java Main. main starts, and at the line ' + line(i) + ' Java meets new and first creates a new Card object. Nothing has been put into the owner of this object yet, so it is empty (null).' : 'At the line ' + line(i) + ' Java meets new and creates another new Card object. It is a different object from a, and its owner is empty (null) too.', '');
        st.hot = ['nw', 'ct']; st.phase = 'ctor';
        if (c.ctor) {
          st.param = vals[i];
          push(head ? 'Next, Java runs the Card constructor. Nothing in the code we wrote has a line that calls the constructor. It is new that makes it run. The ' + val + ' that you passed is put into the parameter owner.' : 'new Card(' + val + ') runs the constructor this time too. ' + val + ' is put into the parameter owner.', '');
          st.hot = ['ct']; st.outs.push('constructor ran'); st.runs++;
          push(head ? 'System.out.println("constructor ran") inside the constructor runs, and "constructor ran" is printed. This line is there so that you can see the constructor run every time new is used.' : 'System.out.println("constructor ran") runs again, and "constructor ran" is printed. The constructor runs once every time new is used.', 'good');
          st.hot = ['ct', 'o' + i]; st.phase = 'fill'; st.objs[i].owner = vals[i];
          push(head ? 'this.owner = owner runs. this is the object that is being created right now. The ' + val + ' held in the parameter owner is copied into the field owner of that object. The field and the parameter have the same name, so this.owner (the field) and owner (the parameter) tell them apart. When the constructor ends, the variable a refers to this object.' : 'this.owner = owner runs. This time the second object is this, and ' + val + ' is copied into the owner of that object. The owner of the first object is still "' + vals[0] + '".', '');
          st.param = '';
        } else {
          push(head ? 'Next, Java runs a constructor. We wrote no constructor, so the Card() that the compiler added runs. This constructor puts no value into owner, so the owner of the object stays empty. The line that prints "constructor ran" is inside the constructor we would have written, and that constructor does not exist, so nothing is printed this time.' : 'new runs the Card() that the compiler added this time too. The owner of the second object stays empty as well.', '');
        }
        st.hot = ['o' + i]; st.phase = 'print'; st.outs.push(c.ctor ? vals[i] : 'null');
        push('System.out.println(' + v + '.owner) runs. ' + (c.ctor ? 'The "' + vals[i] + '" held in the owner of the object that ' + v + ' refers to is printed.' : 'No value was ever put into owner, so null is printed.'), 'good');
      });
      st.hot = []; st.phase = '';
    }

    // Summary: the first line is the answer to this setting (question)
    if (ok && c.ctor && !two) {
      sum.push('A constructor is a block of code that you write inside a class, with the same name as the class and no return type. It differs from an ordinary method in that we do not call it by name. When new Card("Alice") ran, Java created a new object, then the constructor ran and copied the "Alice" it received as a parameter into the owner of the new object.');
      sum.push('Nothing in the code we wrote had a line that calls the constructor. It is new that made it run. Whether a constructor fits the value you passed was not checked at run time. The compiler checked it while compiling.');
    } else if (ok && c.ctor) {
      sum.push('new Card(...) ran twice, so the constructor ran twice. The output has two lines of "constructor ran". The constructor runs once every time an object is created.');
      sum.push('a and b point to different objects, and the constructor filled in the owner of each one separately ("Alice" and "Bob"). Once you write a constructor, the fields are filled in the same way however many objects you create.');
    } else if (ok) {
      sum.push('Even if you write no constructor at all, new Card() compiles. The compiler adds a default constructor that takes no value and puts no value into the fields. But no code fills in owner, so owner stays empty, and the output was null.');
      sum.push('We wrote no constructor, so "constructor ran" was never printed (0 times).' + (two ? ' new was used twice, so two objects were created, and the owner of both was null.' : '') + ' Whether or not you write a constructor, it is new that creates the object, and the constructor is in charge of filling in the fields of that object.');
    } else if (!c.ctor) {
      sum.push('We wrote no constructor in Card, so the only one the compiler added is a Card() that takes no value. That is why new Card("Alice") is a compile-time error. Compilation failed, so the program could not run.' + (two ? ' The errors were on two new lines.' : ''));
      sum.push('The compiler adds a default constructor only when you wrote no constructor at all. To receive a value and fill in a field, you have to write a constructor that takes that value.');
    } else {
      sum.push('You wrote Card(String owner), so new Card(), which passes no value, is a compile-time error. Compilation failed, so the program could not run.' + (two ? ' The errors were on two new lines.' : ''));
      sum.push('Once you write even one constructor, the compiler does not add a default constructor that takes no value. If you write only a constructor that takes a value, objects of that class must always be created with a value.');
    }
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? 'Success' : 'Error', ok ? 'None' : first, ok ? st.outs.join(' / ') : 'Cannot run', ok ? String(st.runs) : 'Cannot run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile');
    if (s.outs.length) H.table(v, ['Output when run'], s.outs.map(function (o) { return { cls: '', cells: [o] }; }), 'Output');
    if (s.compile === 'err') H.counters(v, [[s.errs, 'Errors reported by the compiler']]);
    else H.counters(v, [[s.objs.length, 'Objects created'], [s.runs, 'Constructor runs']]);
  },
  // Diagram: the new line at the top left, the new Card object boxes on the right (owner is empty and then filled in), and the constructor box at the middle left. Arrows show new creating the object and running the constructor. The compile result, the output, and the counters are at the bottom.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 380);
    var hot = s ? s.hot : [], bad = s ? s.bad : {}, phase = s ? s.phase : '', cur = s ? s.cur : -1;
    function on(id) { return hot.indexOf(id) >= 0; }
    var name = c.arg === 'name';
    var newText = 'new Card(' + (name ? '"' + (cur === 1 ? 'Bob' : 'Alice') + '"' : '') + ')';
    P.box('nw', 14, 20, 200, 56, { cls: bad.nw ? 'bad' : on('nw') ? 'hot now' : 'plain', title: newText, sub: phase === 'chk' ? 'Compiler is checking' : phase === 'make' ? 'Creates the object' : phase === 'ctor' ? 'Runs the constructor' : 'Line written in Main' });
    var csub = c.ctor ? ['Card(String owner)', 'Constructor we wrote'] : ['Card()', 'Default constructor the compiler added'];
    if (s && s.param && (phase === 'ctor' || phase === 'fill')) csub.push('Parameter owner = "' + s.param + '"');
    if (!c.ctor && !(s && s.cdef)) csub = ['No constructor written in Card'];
    P.box('ct', 14, 130, 300, 96, { cls: on('ct') ? 'hot now' : !c.ctor && s && s.cdef ? 'wait' : !c.ctor ? 'ghost' : 'plain', title: 'Constructor', sub: csub });
    var n = c.two ? 2 : 1;
    for (var i = 0; i < n; i++) {
      var o = s && s.objs[i], vn = i === 0 ? 'a' : 'b';
      P.box('o' + i, 464, 20 + i * 76, 202, 56, { cls: o ? (on('o' + i) ? 'good now' : 'good') : s && s.compile === 'err' ? 'bad' : 'ghost', title: vn + ' → Card object', sub: o ? 'owner: ' + (o.owner === null ? 'empty (null)' : '"' + o.owner + '"') : s && s.compile === 'err' ? 'Not created' : 'Does not exist yet' });
    }
    if (phase === 'chk') P.arrow('chk', 'nw:b:0.5', 'ct:t:0.33', { cls: s.compile === 'err' || bad.nw ? 'bad' : 'hot' });
    if (phase === 'ctor') P.arrow('chk', 'nw:b:0.5', 'ct:t:0.33', { cls: 'hot' });
    if (phase === 'make') P.arrow('mk', 'nw:r', 'o' + cur + ':l', { cls: 'hot', label: 'Creates the object' });
    if (phase === 'fill') P.arrow('fill', 'ct:r:0.5', 'o' + cur + ':l', { cls: 'hot', label: 'Fills in' });
    P.box('r1', 14, 232, 652, 48, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 288, 652, 36, { cls: s && s.outs.length ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Output when run', right: s && s.outs.length ? s.outs.join(' / ') : s && s.compile === 'err' ? 'Cannot run' : '' });
    P.box('n1', 14, 332, 322, 36, { cls: s && s.runs ? 'good' : 'ghost', title: 'Constructor runs', right: String(s ? s.runs : 0) });
    P.box('n2', 344, 332, 322, 36, { cls: s && s.objs.length ? 'wait' : 'ghost', title: 'Objects created', right: String(s ? s.objs.length : 0) });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all eight combinations, the same source as the code on the screen (identical line by line) was compiled with javax.tools. The ones that compiled had their class files loaded by a new class loader and Main.main was run, and the results were checked against the standard output that was captured. What was checked is whether compilation succeeded, the diagnostic code of the first error (compiler.err.cant.apply.symbol), the required arguments and the passed arguments named in its message (shown on the screen as the two error descriptions), the number of errors and the lines where they occurred, whether the Main class file was created, the output when run, and the number of "constructor ran" lines counted in that output. For the combinations without a constructor, there is no constructor we wrote, so the number of runs is recorded as 0. The facts that the step sentences rely on were also checked by separate runs. The class file of a Card with no constructor contains one constructor with no parameters. A Card with a constructor that takes a value contains only that constructor. When the constructor body starts, the owner of the new object is already null and the parameter holds the value that was passed. The next line of main runs only after new has finished. A line that calls the constructor by name, such as a.Card("Bob") or Card("Bob"), was a compile-time error (cannot find symbol). The documentation checked was the Java Language Specification (Java SE 21), opened with WebFetch. The rule that the name of a constructor must be the same as the simple name of the class, that it has no return type unlike a method, and that it cannot be called by a method invocation expression follows section 8.8. The rule that a default constructor with no parameters is implicitly declared only for a class that declares no constructor follows section 8.8.9. The rule that the constructor matching the passed arguments is chosen at compile time, and that it is a compile-time error if none matches, follows section 15.9.3. The rule that at run time the object is created, its fields are set to their default values, the arguments are evaluated, and then the constructor is run follows section 15.9.4. The rule that this inside a constructor means the object being created follows section 15.8.3. The kind of error, the number of errors, and the line where each occurs are not set by the specification. They were observed with this javac. When there are several errors, javac reports all of them, but the table shows only the first. When compilation fails, the Main class file was never created, so the table says it cannot run. The code on the screen has the Card class as package-private and has the shape that needs no import line. Having several constructors (overloading), calling another constructor with this(...), the superclass constructor super(...), and the order in which field initializers and the constructor run are not covered in this lab. They are covered in "In-depth lab: Classes, objects, and constructors".',
});
