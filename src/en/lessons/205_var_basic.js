Lab.register({
  id: 'var_basic', nav: 'Variables and types', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['vars'],
  title: 'What is a variable, and what does a type decide?',
  why: 'If you write the values used in a calculation directly as numbers every time, then when the same value is used in several places, there are several places to fix, and a value that changes while the program runs, such as an age that goes up by one, cannot be carried on. A variable stores a value under a name and lets you read and change it again by that name. Java has you decide a type for each variable, so the compiler catches the mistake of using the wrong kind of value before you run the program.',
  use: 'You see variables everywhere in Java code. The name a user typed, the number of items and the total in a shopping cart, and i, which counts which pass of a loop you are on, are all handled as variables. A value that must not change after you decide it is declared with final so that it cannot be assigned again.',
  intro: 'A variable is a name under which a value is stored. The single line int age = 20; has three parts. int is the type, which means that this variable holds only integers. age is the name. 20 is the value to store first. This line is called a declaration. When the compiler reads a declaration, it remembers that "age is an int variable," and before the program runs it checks that the lines after it fit what it remembered. In this lab you remove the type int, change the value that is stored, and store no value at all. Each time, the same code is compiled and run, so you can see what the compiler reports and what is printed.',
  terms: ['Variable', 'Declaration and initialization', 'Type', 'Primitive types and reference types'],
  controls: [
    { id: 'type', label: 'Write the type int before the variable name', type: 'check', value: true },
    { id: 'value', label: 'Value stored in the variable', type: 'select', value: 'num', options: [['num', 'Store 20'], ['text', 'Store "twenty"'], ['none', 'Store no value (int age;)']] },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only version
  presets: [
    { t: 'Default settings', q: 'What does a variable look like, and what does it do?', d: 'The variable is declared with the name age and the type int, and 20 is stored in it. Compiling succeeds and 21 is printed.', v: { type: true, value: 'num' } },
    { t: 'Remove the type int', q: 'What if you remove the type int?', d: 'The compiler does not know what age is, so it reports an error that the name is not declared.', v: { type: false, value: 'num' } },
    { t: 'Store "twenty"', q: 'What if you store "twenty" instead of 20?', d: 'You get a compile error saying that text cannot be stored in an int variable.', v: { type: true, value: 'text' } },
    { t: 'Store no value', q: 'What if you only declare the variable and store no value?', d: 'The variable is created, but the code reads it before a value is stored, which is a compile error.', v: { type: true, value: 'none' } },
  ],
  // The kinds of errors the compiler reports (taken from the diagnostic codes of the real javac)
  errName: 'The name age is not declared',
  errType: 'Text cannot be stored in an int variable',
  errInit: 'A variable with no stored value is read',
  // The comment above the declaration line and the declaration line (without the type there is no comment, only the line that stores the value; with neither type nor value there is no line)
  decl: function (c) {
    var lit = { num: '20', text: '"twenty"', none: '' }[c.value];
    if (!c.type) return lit ? [null, 'age = ' + lit + ';'] : [null, null];
    return [{ num: 'Declaration: create a variable age of type int and store 20 in it', text: 'Declaration: create a variable age of type int and store "twenty" in it', none: 'Declaration: only create a variable age of type int, and store no value' }[c.value], 'int age' + (lit ? ' = ' + lit : '') + ';'];
  },
  code: function (c) {
    var d = this.decl(c), o = ['public class Main {', '    public static void main(String[] args) {'];
    if (d[0]) o.push('        // ' + d[0]);
    if (d[1]) o.push('        ' + d[1]);
    o.push('        age = age + 1;', '        System.out.println(age);', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.type ? 'Type int present' : 'Type int absent') + ' · ' + { num: '20 stored', text: '"twenty" stored', none: 'No value stored' }[c.value]; },
  columns: ['Compile', 'What the compiler reports', 'Output when run'],
  simulate: function (c) {
    var ev = [], sum = [], tp = c.type, v = c.value;
    var L = this.decl(c)[1];
    var ok = tp && v === 'num';
    var first = ok ? '' : !tp ? this.errName : v === 'text' ? this.errType : this.errInit;
    var nerr = ok ? 0 : !tp ? (v === 'none' ? 3 : 4) : 1;
    var AGE = 'age = age + 1;', PRN = 'System.out.println(age);';
    var errAt = ok ? [] : !tp ? (v === 'none' ? [AGE, AGE, PRN] : [L, AGE, AGE, PRN]) : v === 'text' ? [L] : [AGE];
    // k1 the declaration line, k2 the value to store, k3 the line that reads age: each is [text, color]
    var st = { hot: '', k: { k1: ['', ''], k2: ['', ''], k3: ['', ''] }, cell: false, val: '', compile: '', errs: 0, errText: '', ran: false, out: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errName = this.errName, errType = this.errType, errInit = this.errInit;

    // 1. Read the declaration line
    st.hot = 'k1';
    if (tp) {
      st.k.k1 = ['age is an int variable', 'good'];
      st.checks.push(['Declaration line', { v: 'Remembered that age is an int variable', cls: 'good' }]);
      if (v === 'none') push('The compiler reads main from the top. First it reads the line ' + L + '. This line has two parts. int is the type, which means that only integers are stored. age is the name. No value to store is written, but that is enough for a declaration that creates a variable. The compiler remembers that "the name age is a variable of type int."', 'good');
      else push('The compiler reads main from the top. First it reads the line ' + L + '. This line has three parts. int is the type, which means that only integers are stored. age is the name. ' + (v === 'num' ? '20' : '"twenty"') + ' is the value to store. The compiler remembers that "the name age is a variable of type int."', 'good');
    } else if (v !== 'none') {
      fail(errName);
      st.k.k1 = ['Cannot find age', 'bad'];
      st.checks.push(['Declaration line', { v: 'Error: the name age is not declared', cls: 'bad' }]);
      push('The compiler reads main from the top. First it reads the line ' + L + '. This line says to store ' + (v === 'num' ? '20' : '"twenty"') + ' in age, but the name age is declared nowhere, and this line has no type either, so the compiler does not know what age is. An error occurs on this line (javac: cannot find symbol).' + (v === 'text' ? ' The error on this line is only one, that the name was not found. The compiler does not separately report whether "twenty" fits int, because it does not know which variable the value goes into.' : ''), 'bad');
    } else {
      st.k.k1 = ['No declaration line', 'bad'];
      st.checks.push(['Declaration line', { v: 'None', cls: 'bad' }]);
      push('The compiler reads main from the top. There is no line that declares a variable, so the compiler has remembered nothing about the name age. A declaration is a line that gives a type and a name, and writing a name does not create a variable. No error occurs at this step yet.', '');
    }

    // 2. Check that the value to store fits int (when there is a declaration)
    if (tp) {
      st.hot = 'k2';
      if (v === 'num') {
        st.k.k2 = ['20 is an integer: can be stored', 'good'];
        st.checks.push(['Does the value fit int?', { v: 'Yes: 20 is an integer', cls: 'good' }]);
        push('The compiler checks the value to store. 20 is an integer, so it can be stored in the int variable age, which holds only integers.', 'good');
      } else if (v === 'text') {
        fail(errType);
        st.k.k2 = ['"twenty" is text: cannot be stored', 'bad'];
        st.checks.push(['Does the value fit int?', { v: 'Error: text cannot be stored in an int', cls: 'bad' }]);
        push('The compiler checks the value to store. "twenty" is not an integer but text (a String), and an int variable holds only integers, so it cannot be stored. An error occurs (javac: incompatible types: java.lang.String cannot be converted to int). The compiler makes this check before the program runs.', 'bad');
      } else {
        st.k.k2 = ['No value to store', ''];
        st.checks.push(['Does the value fit int?', { v: 'No value to store, so nothing to check', cls: '' }]);
        push('The compiler checks the value to store. There is no value to store, so there is nothing to check, and this line is not an error. But no value has been stored in age yet.', '');
      }
    } else {
      st.k.k2 = ['No variable to store into', ''];
      st.checks.push(['Does the value fit int?', { v: 'No variable to check against', cls: '' }]);
    }

    // 3. Check the line age = age + 1;
    st.hot = 'k3';
    if (!tp) {
      fail(errName); fail(errName);
      st.k.k3 = ['Cannot find age', 'bad'];
      st.checks.push(['Line that reads age', { v: 'Error: the name age is not declared', cls: 'bad' }]);
      push('The compiler checks the line age = age + 1;. The name age appears twice in this line, and the compiler cannot find a declaration for either one, so it reports two errors (javac: cannot find symbol).', 'bad');
    } else if (v === 'num') {
      st.k.k3 = ['Can be read', 'good'];
      st.checks.push(['Line that reads age', { v: 'Can be read', cls: 'good' }]);
      push('The compiler checks the line age = age + 1;. The age + 1 on the right reads the value stored in age. age is declared as an int and a value was stored in it on the previous line, so it can be read. The result of adding 1 to an int is also an integer, so it may be stored in age again.', 'good');
    } else if (v === 'text') {
      st.k.k3 = ['Not an error', ''];
      st.checks.push(['Line that reads age', { v: 'Not an error', cls: '' }]);
      push('The compiler checks the line age = age + 1;. age is declared as an int, and the result of adding 1 to an int is also an integer, so this line itself is not an error (the only error javac reported is the 1 above). But compiling still fails because of the earlier error.', '');
    } else {
      fail(errInit);
      st.k.k3 = ['Read before a value is stored', 'bad'];
      st.checks.push(['Line that reads age', { v: 'Error: a variable with no stored value is read', cls: 'bad' }]);
      push('The compiler checks the line age = age + 1;. The age + 1 on the right reads the value stored in age, but no earlier line stores a value in age. It tries to read a variable that has no stored value, so an error occurs (javac: variable age might not have been initialized). The age = on the left is the side that stores a value, so it is fine. The error comes from the right side, where the value is read.', 'bad');
    }

    // 4. Check the line System.out.println(age);
    if (!tp) {
      fail(errName);
      push('The compiler checks the line System.out.println(age);. The age here cannot be found either, so an error occurs. The total number of errors javac reported is ' + nerr + '.', 'bad');
    } else if (ok) {
      push('The compiler checks the line System.out.println(age);. age is an int variable and has a value stored in it, so it can be read and printed.', 'good');
    } else {
      push('The compiler checks the line System.out.println(age);. No new error occurs on this line. The only error javac reported is the 1 above.', '');
    }

    // 5. The result of compiling
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compiling succeeds, and the Main class file to run is created. Whether age is an int, whether the stored value fits, and whether age can be read were all checked now, while compiling, and not when the program runs.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: ' + nerr, cls: 'bad' }]);
      push('Compiling fails. The compiler reported ' + nerr + ' errors, and the first one is "' + first + '". The Main class file to run was not created, so the program cannot run.', 'bad');
    }

    // 6-8. Run
    var out = '';
    if (ok) {
      st.hot = 'cell'; st.cell = true; st.val = '20';
      push('You run it with java Main. main starts, and the line int age = 20; runs. An int slot with the name tag age is created, and 20 is stored in that slot.', '');
      st.val = '21';
      push('The line age = age + 1; runs. First it calculates the age + 1 on the right. Adding 1 to the 20 in the age slot gives 21. This value is stored in the same age slot. The slot stays the same, and only the value inside changes from 20 to 21. Here = does not mean "equals." It means "store the result on the right in the slot on the left."', 'good');
      st.hot = ''; st.ran = true; out = '21'; st.out = out;
      st.checks.push(['Output when run', { v: out, cls: 'good' }]);
      push('System.out.println(age); runs. It reads the value in the age slot and prints 21 on the screen.', 'good');
    }

    // Summary: the first line answers the question for this setting
    if (ok) {
      sum.push('A variable is a name under which a value is stored. int age = 20; has three parts: the type int (which means only integers are stored), the name age, and the value to store, 20. At this line the compiler remembered that "age is an int variable," and it checked that the lines after it fit what it remembered before the program ran.');
      sum.push('When run, 20 was stored in the age slot, age = age + 1; changed the value in the same slot to 21, and 21 was printed. The name and the slot of a variable stay the same, and only the value inside can change.');
    } else if (!tp) {
      sum.push('Without the type int, the compiler does not know what age is. It reported that it could not find the undeclared name age in ' + nerr + ' places, and compiling failed, so the program could not run.' + (v === 'none' ? ' In this setting there is no declaration line at all.' : ''));
      sum.push('A name you have not seen before must first be created by a declaration that includes a type before you can use it.' + (v === 'none' ? '' : ' That is because ' + L + ' without a type is not a line that creates a variable, but a line that tries to store a value in a variable that already exists.') + (v === 'text' ? ' The compiler did not report whether "twenty" fits int.' : ''));
    } else if (v === 'text') {
      sum.push('An int variable cannot hold text. int is a type that holds only integers, so the compiler stopped the line that tries to store "twenty," and the program could not run.');
      sum.push('Whether a value fits the type is not learned by running the program. The compiler checks it ahead of time on every line that stores a value. To store text, declare the variable with a type that holds text (String).');
    } else {
      sum.push('A variable that has no stored value cannot be read. int age; declared the variable, but age + 1 tried to read it before a value was stored, so the compiler stopped it and the program could not run.');
      sum.push('You can declare a variable and store a value separately, but a value must be stored before the variable is read, and this is also checked by the compiler before the program runs. A local variable does not get a value such as 0 automatically.');
    }
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? 'Success' : 'Error', ok ? 'None' : first, ok ? out : 'Cannot run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    H.counters(v, [[s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: the left region shows the three things the compiler checks (the declaration line, the value to store, the line that reads age); the right region shows the age name tag and the int slot created at run time (the value changes from 20 to 21). At the bottom are the compile result and the output.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    var hot = s ? s.hot : '', k = s ? s.k : { k1: ['', ''], k2: ['', ''], k3: ['', ''] };
    P.region('cp', 14, 12, 322, 208, 'What the compiler checks');
    P.region('rt', 366, 12, 300, 208, 'At run time');
    function kc(id) { var st = k[id]; return st[1] === 'bad' ? 'bad' : hot === id ? 'hot now' : st[1] === 'good' ? 'good' : st[0] ? 'plain' : 'ghost'; }
    P.box('k1', 24, 40, 302, 52, { cls: kc('k1'), title: 'Declaration line: name and type', sub: k.k1[0] });
    P.box('k2', 24, 100, 302, 52, { cls: kc('k2'), title: 'Does the value fit int?', sub: k.k2[0] });
    P.box('k3', 24, 160, 302, 52, { cls: kc('k3'), title: 'Line that reads age', sub: k.k3[0] });
    var made = s && s.cell;
    P.box('tag', 378, 80, 100, 74, { cls: made ? 'good' : 'ghost', title: 'age', sub: made ? 'name tag' : 'not yet' });
    P.box('cell', 528, 80, 126, 74, { cls: made ? (hot === 'cell' ? 'good now' : 'good') : 'ghost', title: 'int slot', sub: made ? 'value ' + s.val : s && s.compile === 'err' ? 'not created' : 'not yet' });
    if (made) P.arrow('ref', 'tag:r', 'cell:l', { cls: 'good' });
    P.box('r1', 14, 232, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 292, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Output when run', right: s && s.ran ? s.out : s && s.compile === 'err' ? 'Cannot run' : '' });
  },
  assume: 'The compiler and the runtime environment are JDK 21.0.12.1 (javac 21). All six combinations were compiled with javax.tools from the same source as the code on the screen (identical line by line). The ones that compiled successfully were loaded with a new class loader and Main.main was run, and the results were checked against the captured standard output. What was checked is whether compiling succeeded, the diagnostic code of the first error (compiler.err.cant.resolve.location, prob.found.req, and var.might.not.have.been.initialized, which are shown on the screen as the three error descriptions), the number of errors and the lines they occurred on, whether the Main class file was created, and the output when run. The documentation was checked by opening the Java Language Specification (Java SE 21) directly. That every variable and expression has a type known at compile time follows the beginning of chapter 4; that a variable is a storage location with a compile-time type follows section 4.12; that a variable of a primitive type holds only values of that type follows section 4.12.1; that int is a 32-bit signed integer follows sections 4.2 and 4.2.1; that a local variable declaration consists of a type (or var), a name, and an optional initializer follows section 14.4; that a variable declared without an initializer must be assigned before it is read, or else it is a compile-time error, follows sections 14.4.2 and 4.12.5 and the beginning of chapter 16. That a local variable, unlike a field, does not automatically get a default value is also in section 4.12.5. That only reading a value counts as access, and the name on the left of = does not, is in the beginning of chapter 16. The kinds of errors, the number of errors, and the lines they occur on are not set by the specification but were observed with this javac. When there are several errors javac reports all of them, but the table shows only the first. In every combination that failed to compile, the Main class file was not created, which is why the screen says it cannot run. In the combination with neither the type int nor a value, the declaration line was left out entirely. A line with only age; and no type is not a statement allowed by the grammar (section 14.8: the only expressions that can be used as statements are assignments, increments and decrements, method invocations, and object creations), and when this form was compiled once separately, javac gave a syntax error saying not a statement (it was not included in the check of the combinations). This lab covers only a local variable and a single int. It does not cover other primitive types, variables of reference types, var, naming and scope of variables, or constants (final). How values are copied for variables of primitive and reference types is covered in "In-depth lab: Variables and types".',
});
