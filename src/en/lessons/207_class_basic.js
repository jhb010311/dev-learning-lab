Lab.register({
  id: 'class_basic', nav: 'Classes and objects', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['stack'],
  title: 'How is a class different from an object?',
  why: 'If you keep one member\'s name, age, and email as separate variables, the variables grow every time members are added, and the code cannot tell which name and which age belong to the same person. A class fixes the values that go together, and the methods that handle those values, as one shape, and makes as many objects of that shape as needed, so that one person\'s values are handled bundled into one object.',
  use: 'Most of what Java provides, such as String for text and LocalDate for dates, is made as classes, so you use them by creating an object, or receiving one, and calling its methods. When you build a Spring server, you write a class for each thing you handle, such as member, order, and product, and you handle one member read from the DB as one object of that class.',
  intro: 'A class is a blueprint that you write with class. It only states which values (fields) and methods something has, and declaring a class does not create anything. An object is the real thing that new creates from that blueprint. Each time new runs, one object is created, and each object has its own values for the fields. A variable is not the object itself but something that refers to an object, so if it refers to no object, you cannot call a method of that object. In this lab you remove the class declaration and new, or replace new with null. Each time, the same code is compiled and run, so you can see what the compiler reports and how many Card objects are created.',
  terms: ['Classes and objects', 'Field', 'new', 'Default values of fields', 'NullPointerException'],
  controls: [
    { id: 'decl', label: 'The class Card declaration is present', type: 'check', value: true },
    { id: 'make', label: 'What is assigned to variable a', type: 'select', value: 'new', options: [['new', 'Card a = new Card(); create an object'], ['none', 'Card a; only declare the variable'], ['null', 'Card a = null; make it refer to nothing']] },
    { id: 'two', label: 'Create one more object (Card b)', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only version
  presets: [
    { t: 'Default settings', q: 'What do a class and an object look like, and what happens when you run the code?', d: 'The class is declared and one object is created with new. Compiling succeeds and Alice\'s card is printed.', v: { decl: true, make: 'new', two: false } },
    { t: 'Remove new Card()', q: 'What if you remove new Card() and only declare the variable?', d: 'If you only declare the variable and use it without storing a value, you get a compile error.', v: { decl: true, make: 'none', two: false } },
    { t: 'Store null', q: 'What if you store null instead of new Card()?', d: 'Compiling succeeds, but the program stops at run time with a NullPointerException.', v: { decl: true, make: 'null', two: false } },
    { t: 'Create one more object', q: 'What if you create one more object?', d: 'new runs twice, so 2 objects are created, and each object has its own owner.', v: { decl: true, make: 'new', two: true } },
    { t: 'Remove the class Card declaration', q: 'What if you remove the class Card declaration?', d: 'There is no class named Card, so you get a compile error.', v: { decl: false, make: 'new', two: false } },
  ],
  // The kinds of errors the compiler reports (taken from the diagnostic codes of the real javac)
  errClass: 'No class named Card can be found',
  errInit: 'Variable a is used without a stored value',
  aLine: function (c) { return { new: 'Card a = new Card();', none: 'Card a;', null: 'Card a = null;' }[c.make]; },
  code: function (c) {
    var o = [];
    if (c.decl) o.push('// Blueprint: Card has a value (field) named owner and a method named show', 'class Card {', '    String owner;', '    void show() {', '        System.out.println(owner + "\'s card");', '    }', '}', '');
    o.push('public class Main {', '    public static void main(String[] args) {');
    if (c.make === 'new') o.push('        // Object: create a real card from the blueprint and make variable a refer to it');
    else if (c.make === 'none') o.push('        // Only declare variable a that will refer to a card');
    else o.push('        // Store null in variable a. It refers to no object');
    o.push('        ' + this.aLine(c), '        a.owner = "Alice";', '        a.show();');
    if (c.two) o.push('', '        // Create one more object and make variable b refer to it', '        Card b = new Card();', '        b.owner = "Bob";', '        b.show();', '', '        // Call show again to see whether the owner of the object a refers to is unchanged', '        a.show();');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.decl ? 'class Card declared' : 'class Card not declared') + ' · ' + { new: 'object created with new', none: 'variable only declared', null: 'null stored' }[c.make] + ' · ' + (c.two ? 'one more object created' : 'one object'); },
  columns: ['Compile', 'What the compiler reports', 'Run result', 'Card objects created'],
  simulate: function (c) {
    var ev = [], sum = [], mk = c.make, A = this.aLine(c), B = 'Card b = new Card();';
    var ok = c.decl && mk !== 'none';
    var nerr, errAt = [], first;
    if (!c.decl) {
      first = this.errClass;
      for (var i = 0; i < (mk === 'new' ? 2 : 1); i++) errAt.push(A);
      if (c.two) errAt.push(B, B);
      nerr = errAt.length;
    } else if (mk === 'none') {
      first = this.errInit; errAt = ['a.owner = "Alice";']; nerr = 1;
    } else { first = ''; nerr = 0; }
    var st = { hot: '', cls: '', va: '', vb: '', objs: [], bad: {}, compile: '', errs: 0, errText: '', ran: false, out: [], exc: '', made: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errClass = this.errClass, errInit = this.errInit;

    // 1. Read the class Card declaration
    st.hot = 'cl';
    if (c.decl) {
      st.cls = 'known';
      st.checks.push(['class Card declaration', { v: 'Read', cls: 'good' }]);
      push('The compiler reads the source from the top. First it reads the class Card declaration, and learns about the class Card, which has a value (field) named owner and a method named show. A class is a blueprint. It only states the blueprint, so this declaration alone does not create even one Card object.', '');
    } else {
      st.cls = 'missing';
      st.checks.push(['class Card declaration', { v: 'None', cls: 'bad' }]);
      push('The compiler reads the source from the top. There is no class Card declaration anywhere in the code, so nothing is known about a class named Card. Without a blueprint, you cannot even think about the objects that would be made from it.', '');
    }

    // 2. Check the line for variable a
    st.hot = 'va';
    if (!c.decl) {
      st.bad.va = true; fail(errClass);
      if (mk === 'new') { fail(errClass); st.checks.push(['Line: ' + A, { v: '2 errors: Card cannot be found', cls: 'bad' }]); }
      else st.checks.push(['Line: ' + A, { v: 'Error: Card cannot be found', cls: 'bad' }]);
      push('The compiler checks the line ' + A + ' It does not know what Card is, so an error occurs (javac: cannot find symbol). ' + (mk === 'new' ? 'This line uses Card twice, once as the type of variable a and once after new, so the same error occurs 2 times.' : 'This line uses Card only once, as the type of variable a, so there is 1 error.') + '', 'bad');
    } else if (mk === 'new') {
      st.checks.push(['Line: ' + A, { v: 'Passed', cls: 'good' }]);
      push('The compiler checks the line ' + A + ' The class Card exists, so new Card() can be used. The compiler does not run this line. It only checks it. The object is created at this line when the program runs.', 'good');
    } else if (mk === 'none') {
      st.va = 'none';
      st.checks.push(['Line: ' + A, { v: 'Passed: variable only declared', cls: '' }]);
      push('The compiler checks the line ' + A + ' This line declares variable a, which will refer to a Card object. It is not a line that assigns a value, only a declaration of the variable, so this line itself is not an error.', '');
    } else {
      st.checks.push(['Line: ' + A, { v: 'Passed', cls: 'good' }]);
      push('The compiler checks the line ' + A + ' null is a value that means there is no object to refer to. This line stores a value (null) in variable a and the class Card exists, so the compiler lets this line pass.', 'good');
    }

    // 3. The a.owner and a.show() lines (when there is a declaration)
    if (!c.decl) {
      st.checks.push(['Lines a.owner and a.show()', { v: 'Not an error', cls: '' }]);
      push('The compiler checks the lines a.owner = "Alice"; and a.show();. The name Card is not in these lines, and javac does not report more errors on lines that use a variable a whose type it could not find. Errors occur only on the lines that use Card.', '');
    } else {
      if (mk === 'none') {
        st.bad.va = true; fail(errInit);
        st.checks.push(['Line a.owner', { v: 'Error: variable with no stored value', cls: 'bad' }]);
        push('The compiler checks the line a.owner = "Alice";. It uses variable a, in which no value has ever been stored, so an error occurs (javac: variable a might not have been initialized). It does not report the same error again on the a.show() line, which uses the same variable, so the number of errors reported is 1.', 'bad');
      } else {
        st.checks.push(['Lines a.owner and a.show()', { v: 'Passed', cls: 'good' }]);
        push('The compiler checks the lines a.owner = "Alice"; and a.show();. Card has an owner field and a show method, and variable a has a value stored in it, so there is no error.' + (mk === 'null' ? ' The compiler does not report as an error that what was stored in a is null. Whether there is an object to refer to shows up only when the program runs.' : ''), 'good');
      }
    }

    // 4. The lines for b
    if (c.two && (mk !== 'none' || !c.decl)) {
      st.hot = 'vb';
      if (!c.decl) {
        st.bad.vb = true; fail(errClass); fail(errClass);
        st.checks.push(['Line: ' + B, { v: '2 errors: Card cannot be found', cls: 'bad' }]);
        push('The compiler checks the line ' + B + ' This line also uses Card once as the type of variable b and once after new, so the same error occurs 2 times. The total number of errors reported is ' + nerr + '.', 'bad');
      } else {
        st.checks.push(['Lines for b and the last a.show()', { v: 'Passed', cls: 'good' }]);
        push('The compiler checks the line ' + B + ' and the lines below it. They use new Card() one more time with the same class Card, so there is no error.', 'good');
      }
    }

    // 5. The result of compiling
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compiling succeeds, and the Main class file to run is created. So far, 0 Card objects have been created. Compiling only checks the source and does not run new.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: ' + nerr, cls: 'bad' }]);
      push('Compiling fails. The compiler reported ' + nerr + ' errors, and the first one is "' + first + '". The Main class file to run was not created, so the program cannot run, and 0 Card objects were created.', 'bad');
    }

    // 6. Run
    if (ok) {
      st.ran = true;
      push('You run it with java Main. Running starts at the main method. The class Card, the blueprint, is in the code, but 0 Card objects have been created so far.', '');
      if (mk === 'new') {
        st.hot = 'o0'; st.objs.push(null); st.made = 1;
        push('The line Card a = new Card(); runs. new Card() creates one object from the Card blueprint. Nothing has been assigned to the owner of this object yet, so it is null, that is, it refers to no object.', 'good');
        st.hot = 'va'; st.va = 'ref';
        push('In the same line, = stores a value in variable a. What is stored in variable a is not the object itself but a reference, which points to where the object is, so a now refers to that object.', '');
        st.hot = 'o0'; st.objs[0] = 'Alice';
        push('The line a.owner = "Alice"; runs. It assigns "Alice" to the owner of the object that a refers to.', '');
        st.out.push('Alice\'s card');
        push('The line a.show(); runs. The show method of the object that a refers to runs, reads the owner of that object, and prints "Alice\'s card". show is a method written in the blueprint, and the owner it reads is a field of that object.', 'good');
        if (c.two) {
          st.hot = 'o1'; st.objs.push(null); st.made = 2; st.vb = 'ref';
          push('The line Card b = new Card(); runs. new Card() creates one more object from the Card blueprint, and variable b refers to it. The owner of this object is empty too, and it is a separate object from the one that a refers to. Each time new runs, one object is created.', 'good');
          st.objs[1] = 'Bob';
          push('The line b.owner = "Bob"; runs. It assigns "Bob" to the owner of the object that b refers to. The owner of the object that a refers to does not change.', '');
          st.out.push('Bob\'s card');
          push('The line b.show(); runs. It reads the owner of the object that b refers to and prints "Bob\'s card". Even for the same show method, the owner that is read depends on which object it is called on.', 'good');
          st.hot = 'o0'; st.out.push('Alice\'s card');
          push('The line a.show(); runs once more. The owner of the object that a refers to is still "Alice", so it prints "Alice\'s card". That is because each object has its own owner.', 'good');
        }
      } else {
        st.hot = 'va'; st.va = 'null';
        push('The line Card a = null; runs. null is stored in variable a. new has not run, so 0 Card objects have been created, and a refers to nothing.', '');
        st.exc = 'NullPointerException'; st.bad.va = true;
        push('The line a.owner = "Alice"; runs. There is no object that a refers to, but the code tries to assign a value to the owner of that object, so a NullPointerException occurs. There is no code that handles the exception, so the program stops here. The compiler let this line pass, but the fact that there is no object showed up only while the program was running.', 'bad');
        if (c.two) {
          st.hot = '';
          push('The program has stopped, so the lines below it do not run. The line Card b = new Card(); does not run either, so the number of Card objects created stays at 0 to the end.', 'bad');
        }
      }
    }

    // Summary: the first line answers the question for this setting
    if (!c.decl) {
      sum.push('Without the class Card declaration, there is no Card blueprint. The compiler reported that it could not find a class named Card, so compiling failed, and you could neither create an object with new Card() nor run the program.');
      sum.push('The errors occurred on the lines that use Card (' + nerr + ' errors reported). To create an object, you must first declare a blueprint with a class.');
    } else if (mk === 'none') {
      sum.push('If you only declare the variable and do not create an object with new, no value is assigned to the variable. The compiler reported that variable a is used without a stored value, so compiling failed and the program could not run. 0 Card objects were created.');
      sum.push('Even if the class Card declaration is there, objects are not created by themselves. An object is created only when new runs.' + (c.two ? ' The lines for b had no problem, but compiling failed, so they did not run.' : ''));
    } else if (mk === 'null') {
      sum.push('If you store null, compiling succeeds, but there is no object that a refers to, so the program stopped with a NullPointerException at the a.owner line. 0 Card objects were created.');
      sum.push('Having a variable and having an object are different things. Without an object, you cannot use the fields or methods of that object, and the compiler does not tell you this ahead of time, so it shows up while the program is running.' + (c.two ? ' The lines after the stop did not run, so the object for b was not created either.' : ''));
    } else if (c.two) {
      sum.push('Each time new Card() ran, one object was created, so 2 objects were created from the same class Card. Each object has its own owner: the object that a refers to had Alice, and the object that b refers to had Bob.');
      sum.push('Assigning a value to the owner of b did not change the owner of the object that a refers to. Even with one blueprint, the objects are separate, and the show method reads the owner of the object it is called on.');
    } else {
      sum.push('A class is a blueprint that you write with class, and an object is the real thing that new creates from that blueprint. The class Card only stated that it has owner and show and did not create an object, and when new Card() ran, one Card object was created.');
      sum.push('Variable a only refers to that object, and owner is a field of that object. a.show() asked the object that a refers to to run a method written in the blueprint, so it read the owner of that object and printed it.');
    }
    var run = !ok ? 'Cannot run' : st.exc ? 'Stopped by NullPointerException' : st.out.join(' / ');
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? 'Success' : 'Error', ok ? 'None' : first, run, String(st.made)] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile');
    if (s.out.length || s.exc) H.table(v, ['Run result'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }).concat(s.exc ? [{ cls: '', cells: [{ v: 'Stopped by ' + s.exc, cls: 'bad' }] }] : []), 'Output');
    H.counters(v, [[s.made, 'Card objects created'], [s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: the class Card (the blueprint) on the left, variables a and b in the middle, and the Card objects created by new on the right (showing the value of owner). An arrow from a variable to an object appears only when the variable refers to an object. Below are the compile result, the run result, and the number of objects created.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 306);
    var hot = s ? s.hot : '', bad = s ? s.bad : {}, err = s && s.compile === 'err', objs = s ? s.objs : [];
    P.box('cl', 14, 20, 190, 120, { cls: !c.decl ? 'ghost' : hot === 'cl' ? 'hot now' : 'plain', title: 'Card (class)', sub: c.decl ? ['owner (field)', 'show() (method)'] : 'no declaration' });
    var vsub = function (st) { return { '': 'not yet', none: 'no value', 'null': 'null', ref: 'a reference' }[st || '']; };
    P.box('va', 262, 20, 120, 56, { cls: bad.va ? 'bad' : hot === 'va' ? 'hot now' : s && s.va === 'ref' ? 'good' : s && s.va ? 'plain' : 'ghost', title: 'Card a', sub: vsub(s && s.va) });
    if (c.two) P.box('vb', 262, 88, 120, 56, { cls: bad.vb ? 'bad' : hot === 'vb' ? 'hot now' : s && s.vb === 'ref' ? 'good' : 'ghost', title: 'Card b', sub: vsub(s && s.vb) });
    var osub = function (i) { return objs.length > i ? (objs[i] ? 'owner: ' + objs[i] : 'owner: empty (null)') : err || (s && s.exc) ? 'not created' : 'not yet'; };
    P.box('o0', 440, 20, 226, 56, { cls: objs.length > 0 ? (hot === 'o0' ? 'good now' : 'good') : 'ghost', title: 'Card object', sub: osub(0) });
    if (c.two) P.box('o1', 440, 88, 226, 56, { cls: objs.length > 1 ? (hot === 'o1' ? 'good now' : 'good') : 'ghost', title: 'Card object', sub: osub(1) });
    if (s && s.va === 'ref') P.arrow('ra', 'va:r', 'o0:l', { cls: 'good' });
    if (s && s.vb === 'ref') P.arrow('rb', 'vb:r', 'o1:l', { cls: 'good' });
    P.box('r1', 14, 160, 652, 44, { cls: s && s.compile === 'ok' ? 'good' : err ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 212, 652, 36, { cls: s && s.exc ? 'bad' : s && s.ran ? 'good' : err ? 'bad' : 'ghost', title: 'Run result', right: s && s.exc ? 'Stopped by ' + s.exc : s && s.ran ? (s.out.length ? s.out.join(' / ') : '(no output yet)') : err ? 'Cannot run' : '' });
    P.box('n1', 14, 256, 652, 36, { cls: s && s.made ? 'good' : 'ghost', title: 'Card objects created', right: String(s ? s.made : 0) });
  },
  assume: 'The compiler and the runtime environment are JDK 21.0.12.1 (javac 21). All twelve combinations were compiled with javax.tools from the same source as the code on the screen. The ones that compiled successfully were loaded with a new class loader and Main.main was run, and the results were checked against the captured standard output and exceptions. What was checked is whether compiling succeeded, the diagnostic code of the first error (compiler.err.cant.resolve.location and var.might.not.have.been.initialized, which are shown on the screen as the two error descriptions), the number of errors and the lines they occurred on, whether the Main class file was created, the output when run, and the kind of exception thrown during the run. The number of Card objects created was measured, not guessed. Only in the source used for checking, a line that increases a number each time an object is created (an instance initializer block) was added inside Card and the number was read after the run, and the checking script removes that one line when it compares with the code on the screen. The combinations that failed to compile were not run, so their count is 0. In the combination that stores null, the exception is a NullPointerException, and its message said that the variable was null when the code tried to assign a value to a.owner. This exception occurs at the a.owner line, so the b lines below it did not run, and the number of objects was 0. The explanation in a step sentence that the owner of a newly created object is null before a value is assigned was also confirmed by a separate run (new Card().show() printed the card of null). The documentation was checked by opening the Java Language Specification (Java SE 21) directly. That a class declaration defines a class follows section 8.1; that a field, and a field that is not static, is created anew for each instance whenever an instance is created, follows sections 8.3 and 8.3.1.1; that an object is a class instance or an array, that a reference is a pointer to an object, and that there is a null reference that points to nothing follows section 4.3.1; that a new object is created each time new is evaluated and its fields are filled with default values follows section 15.9.4; that the default value of a reference type is null follows section 4.12.5; that accessing an instance field, or calling an instance method, without an object (with null) throws a NullPointerException follows sections 15.11.1 and 15.12.4.4; and that reading a local variable in which no value was stored is a compile-time error follows the beginning of chapter 16. Section 15.26.1 (the order of evaluation of an expression that assigns to a field) could not be opened, and this lab does not rely on that order. The kinds of errors, the number of errors, and the lines they occur on are not set by the specification but were observed with this javac. When the class Card declaration was missing, one error occurred at each place where Card was used (two for a line with new, one for the type of the variable and one after new), and no separate error occurred on the lines that use the fields or methods of Card. For a variable in which no value was stored, an error occurred only on the line where it was first used. The code on the screen has the classes together in one file, with the package and the access modifiers left out. A class can have more than fields and methods, such as constructors, and there is also the matter of where in memory an object is placed, but this lab does not cover them. Where variables and objects are placed is covered in "In-depth lab: Stack and heap".',
});
