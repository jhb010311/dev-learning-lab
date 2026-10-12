Lab.register({
  id: 'method_basic', nav: 'Methods', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['stack'],
  title: 'What is a method, and how is declaring it different from calling it?',
  intro: 'A method is a block of code that has a name. In the code, the part written with a name, parentheses, and braces, such as static int add(int a, int b) { ... }, is the declaration of the method. A declaration only states that "there is a block of code named add," so the code inside does not run just because it is declared. The code runs when you call the method by putting parentheses after its name, as in add(2, 3). The values 2 and 3 that you pass in the parentheses are stored in the variables a and b (the parameters) in the parentheses of the declaration, and return gives the calculated value back to the place that called the method. In this lab you delete the declaration and the calling line one at a time, and change how many times you call and how many values you pass. Each time, the same code is compiled and run, so you can see what the compiler reports and how many times add runs. (static is added so that main can call add without creating an object. This lab does not cover it.)',
  terms: ['Method', 'Method invocation', 'Parameters and arguments', 'Return value (return)'],
  controls: [
    { id: 'decl', label: 'The declaration of the add method is present', type: 'check', value: true },
    { id: 'call', label: 'The line in main that calls add', type: 'select', value: 'once', options: [['once', 'Call add(2, 3) once'], ['twice', 'Call add(2, 3) twice'], ['none', 'Delete the calling line']] },
    { id: 'args', label: 'Values passed to add', type: 'select', value: 'two', options: [['two', 'Pass two values: add(2, 3)'], ['one', 'Pass only one value: add(2)']], show: function (c) { return c.call !== 'none'; }, hint: 'Used only when there is a calling line.' },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only version
  presets: [
    { t: 'Default settings', q: 'What does a method look like, and what happens when you call it?', d: 'The declaration is present and add(2, 3) is called once. add runs once and 5 comes back.', v: { decl: true, call: 'once', args: 'two' } },
    { t: 'Delete the calling line', q: 'What if you delete the calling line?', d: 'Even if the declaration stays, the code in add does not run unless it is called.', v: { decl: true, call: 'none', args: 'two' } },
    { t: 'Call add(2, 3) twice', q: 'What if you call add(2, 3) twice?', d: 'Each call runs the code in add again.', v: { decl: true, call: 'twice', args: 'two' } },
    { t: 'Delete the declaration of add and only call it', q: 'What if you delete the declaration of add and only call it?', d: 'There is nothing to call, so you get a compile error.', v: { decl: false, call: 'once', args: 'two' } },
    { t: 'Pass only one value', q: 'What if you pass only one value: add(2)?', d: 'The number of values passed does not match the number of parameters, so you get a compile error.', v: { decl: true, call: 'once', args: 'one' } },
  ],
  // The kinds of errors the compiler reports (taken from the diagnostic codes of the real javac)
  errName: 'No method named add can be found',
  errCount: 'The number of values passed to add does not match the number of parameters',
  code: function (c) {
    var two = c.args === 'two', a = two ? '2, 3' : '2', o = ['public class Main {'];
    if (c.decl) o.push('    // Declaration: a block of code named add. It does not run until it is called', '    static int add(int a, int b) {', '        System.out.println("add is running");', '        return a + b;', '    }', '');
    o.push('    public static void main(String[] args) {');
    if (c.call !== 'none') {
      o.push('        // Call: ' + (two ? 'pass 2 and 3' : 'pass 2') + ' to run add, and store the returned value in sum', '        int sum = add(' + a + ');', '        System.out.println(sum);');
      if (c.call === 'twice') o.push('        int sum2 = add(' + a + ');', '        System.out.println(sum2);');
    }
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.decl ? 'add declared' : 'add not declared') + ' · ' + { once: 'called once', twice: 'called twice', none: 'no calling line' }[c.call] + (c.call === 'none' ? '' : ' · ' + (c.args === 'two' ? 'two values' : 'one value')); },
  columns: ['Compile', 'What the compiler reports', 'Output when run', 'Times add ran'],
  simulate: function (c) {
    var ev = [], sum = [], two = c.args === 'two', a = two ? '2, 3' : '2', n = { once: 1, twice: 2, none: 0 }[c.call];
    var calls = []; if (n >= 1) calls.push('int sum = add(' + a + ');'); if (n === 2) calls.push('int sum2 = add(' + a + ');');
    var hasCall = n > 0, nameErr = hasCall && !c.decl, argErr = hasCall && c.decl && !two, ok = !nameErr && !argErr;
    var first = ok ? '' : nameErr ? this.errName : this.errCount;
    var nerr = ok ? 0 : n, errAt = ok ? [] : calls;
    var st = { hot: '', bad: false, badSend: '', phase: '', started: false, compile: '', errs: 0, errText: '', ran: false, params: '', send: '', ret: '', vals: [], out: [], count: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var callTxt = 'the call add(' + a + ')';

    // 1. Read the declaration
    st.hot = 'ad';
    if (c.decl) {
      st.checks.push(['Declaration of the add method', { v: 'Learned', cls: 'good' }]);
      push('You compile with javac. The compiler reads the source from the top and comes to the declaration of the add method. The declaration states that "there is a block of code named add that takes two int values and gives back one int value." The int a and int b in the parentheses are variables that hold the values passed in when add is called, and they are called parameters. The compiler only remembers this name. Compiling is not running, so the code inside add does not run.', '');
    } else {
      st.checks.push(['Declaration of the add method', { v: 'No declaration', cls: 'bad' }]);
      push('You compile with javac. The compiler reads the source from the top. There is no declaration of a method named add anywhere in this source, so the compiler does not know the name add.', '');
    }

    // 2. Check the calling line
    st.hot = 'mn';
    if (!hasCall) {
      st.checks.push(['Line that calls add', { v: 'None', cls: '' }]);
      push('The compiler reads the inside of main. main has no line that calls add.' + (c.decl ? ' A method that is declared but never called is not an error either, so it passes.' : ' There is no declaration of add and no calling line, so there is nothing to check about add.'), '');
    } else if (nameErr) {
      st.bad = true; st.badSend = a; st.errs = n; st.errText = this.errName;
      st.checks.push(['Line that calls add', { v: 'Error: add cannot be found', cls: 'bad' }]);
      push('The compiler reads ' + callTxt + ' in main. ' + (n === 1 ? '' : 'There are two calling lines, and both are the same. ') + 'It tries to find the name add in a declaration, but there is no declaration, so it cannot find it (javac: cannot find symbol). There is nothing to call, so this is an error.' + (n === 1 ? '' : ' There is one error for each calling line, so there are 2 errors in all.'), 'bad');
    } else if (argErr) {
      st.bad = true; st.badSend = a; st.errs = n; st.errText = this.errCount;
      st.checks.push(['Line that calls add', { v: 'Error: 1 value passed, 2 parameters', cls: 'bad' }]);
      push('The compiler reads ' + callTxt + ' in main. It found the name add in the declaration. But the call passes one value (2), and add has two parameters (int a, int b). The numbers do not match, so add cannot be called this way, and it is an error (javac: method add in class Main cannot be applied to given types).' + (n === 1 ? '' : ' The second calling line is an error for the same reason, so there are 2 errors in all.') + ' The compiler makes this check when it compiles, not when the program runs.', 'bad');
    } else {
      st.checks.push(['Line that calls add', { v: 'The name and the number of values match', cls: 'good' }]);
      push('The compiler reads ' + callTxt + ' in main.' + (n === 1 ? '' : ' There are two calling lines, and both are the same.') + ' It found the name add in the declaration, and the two values passed (2, 3) match the two parameters (a, b) in number. It passes.', 'good');
    }

    // 3. The result of compiling
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compiling succeeds, and the Main class file to run is created.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: ' + nerr, cls: 'bad' }]);
      push('Compiling fails. The compiler reported ' + nerr + ' errors, and the first one is "' + first + '". The Main class file to run was not created, so the program cannot run, and the code in add did not run either.', 'bad');
    }

    // 4 onward. Run
    if (ok) {
      st.hot = 'mn'; st.started = true; st.ran = true;
      push('You run it with java Main. Running starts at the first line of main.' + (c.decl ? ' In the source, the declaration of add is written above main, but the code does not run in the order in which it is written. A declaration is not part of the running order, and up to this point the code in add has not run even once.' : ''), '');
      if (!hasCall) {
        st.checks.push(['Times add ran', { v: '0', cls: '' }]);
        push('main has no line to run, so main ends.' + (c.decl ? ' Even though the declaration of add is there, there is no calling line, so the code in add never ran, and nothing is printed.' : ' Nothing is printed.'), 'good');
      }
      for (var i = 0; i < n; i++) {
        var nm = i === 0 ? 'sum' : 'sum2', head = i === 0;
        st.hot = 'mn'; st.phase = 'call'; st.send = '2, 3'; st.params = 'a = 2, b = 3';
        push(head ? 'In the line int sum = add(2, 3);, you meet the call add(2, 3). This form, with parentheses after the name, is what calls add, and the 2 and the 3 in the parentheses are the values passed. The values passed are stored in the parameters of add in order. 2 is stored in a and 3 is stored in b, and running moves from main into the code in add.' : 'In the line int sum2 = add(2, 3);, you meet the call add(2, 3) again. Just as before, 2 is stored in a and 3 is stored in b as new values, and the code in add runs again from the beginning. Even though the declaration was written only once, it runs every time it is called.', '');
        st.hot = 'ad'; st.phase = 'run'; st.count++; st.out.push('add is running');
        push(head ? 'The first line in add, System.out.println("add is running"), runs and prints add is running. The number of times add has run is 1.' : 'The first line in add runs again and prints add is running once more. The number of times add has run becomes 2.', 'good');
        st.phase = 'ret'; st.ret = '5';
        push(head ? 'return a + b calculates a + b (2 + 3 is 5) and gives that value, 5, back to the place that called add. The running of add ends here, and running returns to main.' : 'return a + b gives 5 back to the place that called add this time too, and running returns to main.', 'good');
        st.hot = 'mn'; st.phase = 'recv'; st.params = ''; st.send = ''; st.vals.push([nm, '5']);
        push('The place where the call add(2, 3) was becomes the value that came back, 5, and 5 is stored in ' + nm + '.', '');
        st.out.push('5'); st.phase = '';
        push('System.out.println(' + nm + ') prints the 5 stored in ' + nm + '.' + (head || n === 1 ? '' : ' You can see that each time, the add is running line comes first, and then the returned value is printed.'), 'good');
        st.ret = '';
      }
      st.hot = '';
    }

    // Summary: the first line answers the question for this setting
    if (ok && c.decl && n === 1) {
      sum.push('A method is a block of code that has a name. The declaration of add only states that "there is a block of code named add," and the real running happened when add was called by putting parentheses after its name, as in add(2, 3). The 2 and the 3 passed in the call were stored in the parameters a and b, and return gave the sum, 5, back to the caller and it was stored in sum.');
      sum.push('The declaration was above main, but it did not run first. Running starts at the first line of main, and the code in add ran once, at the moment add(2, 3) was reached.');
    } else if (ok && c.decl && n === 0) {
      sum.push('If you delete the calling line, the code in add does not run. The declaration of add was still there, but add is running was never printed, and the number of times add ran was 0. A declaration alone does not run the code inside it.');
      sum.push('The compiler passed it with no error. Having a method that is never called is not an error. It is just not used.');
    } else if (ok && c.decl) {
      sum.push('When add(2, 3) is called twice, the code in add runs twice, and add is running is printed twice. A method is declared once, and it runs again from the beginning every time it is called.');
      sum.push('The code of add was not written twice. Only the calling line was written twice. In the second call too, 2 and 3 were stored in a and b as new values, and return gave back 5 and it was stored in sum2.');
    } else if (ok) {
      sum.push('The declaration of add was deleted, but there is no calling line either, so compiling succeeded and nothing was printed. For a missing declaration to cause an error, there must be a place that calls that name.');
      sum.push('Deleting the declaration alone did not cause an error. The compiler looks for the name add when the code calls add.');
    } else if (nameErr) {
      sum.push('When you delete the declaration of add and only call it, the compiler cannot find the name add and compiling fails. A call goes to a declared name and runs it, so without a declaration there is nothing to call.');
      sum.push(n === 1 ? 'There is one calling line, so there was 1 error. The error is reported not where the declaration should have been, but at the line that calls the name without a declaration.' : 'There are two calling lines, so there were 2 errors, one for each line. The errors are reported not where the declaration should have been, but at the lines that call the name without a declaration.');
    } else {
      sum.push('When you pass only one value, the compiler reports that the number of values passed (1) does not match the number of parameters of add (2). Compiling failed, so add did not run.');
      sum.push('A parameter is a variable that receives a value passed in a call. You must pass as many values as the declaration states before you can make the call, and this is checked when compiling, not when running.' + (n === 2 ? ' There are two calling lines, so there were 2 errors.' : ''));
    }
    var out = st.out.join(' / ');
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? 'Success' : 'Error', ok ? 'None' : first, ok ? (out || '(Nothing is printed)') : 'Cannot run', ok ? String(st.count) : 'Cannot run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What happened', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    H.counters(v, [[s.count, 'Times add ran'], [s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: main on the left and add on the right. An arrow crosses over when add is called and shows the values passed, and when return comes back it shows the value given back. Below are the compile result, the output, and a box that counts how many times add ran.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 304);
    var hot = s ? s.hot : '', ph = s ? s.phase : '';
    var mainSub = !s || !s.started ? 'before running' : s.vals.length ? s.vals.map(function (r) { return r[0] + ' = ' + r[1]; }) : 'no value stored yet';
    P.box('mn', 14, 16, 250, 118, { cls: s && s.bad ? 'bad' : hot === 'mn' ? 'hot now' : 'plain', title: 'main', sub: mainSub });
    var addSub = !c.decl ? 'no declaration' : s && s.params ? s.params : s && s.count ? 'declared · runs when called' : 'declared · not called yet';
    P.box('ad', 416, 16, 250, 118, { cls: !c.decl ? 'ghost' : hot === 'ad' ? 'hot now' : 'plain', title: 'add (method)', sub: addSub });
    if (s && s.bad) P.arrow('call', 'mn:r:0.3', 'ad:l:0.3', { cls: 'bad', label: s.badSend });
    else if (s && (ph === 'call' || ph === 'run')) P.arrow('call', 'mn:r:0.3', 'ad:l:0.3', { cls: ph === 'call' ? 'hot' : 'mut', label: s.send });
    if (s && ph === 'ret') P.arrow('ret', 'ad:l:0.7', 'mn:r:0.7', { cls: 'good', label: s.ret });
    P.box('r1', 14, 150, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 210, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Output when run', right: s && s.ran ? (s.out.length ? s.out.join(' / ') : '(Nothing is printed)') : s && s.compile === 'err' ? 'Cannot run' : '' });
    P.box('r3', 14, 254, 652, 36, { cls: s && s.count ? 'wait' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Times add ran', right: s && s.compile === 'err' ? 'Cannot run' : String(s ? s.count : 0) });
  },
  assume: 'The compiler and the runtime environment are JDK 21.0.12.1 (javac 21). All twelve combinations were compiled with javax.tools from the same source as the code on the screen (identical line by line). The ones that compiled successfully were loaded with a new class loader and Main.main was run, and the results were checked against the captured standard output. What was checked is whether compiling succeeded, the diagnostic code of the first error (compiler.err.cant.resolve.location.args and compiler.err.cant.apply.symbol, which are shown on the screen as the two error descriptions), the number of errors and the lines they occurred on, whether the Main class file was created, the output when run, and the number of times "add is running" appeared in that output. The fact that the step sentences rely on, that "running starts at the first line of main, and even if the declaration of add is above main it does not run first," was confirmed by running, in the same way, a separate source with one more output line added as the first line of main, and the output came in the order main started, add is running, 5. The documentation was checked by opening the Java Language Specification (Java SE 21) directly. That a method declaration declares executable code that can be invoked follows section 8.4; that the values passed in a call initialize newly created parameter variables before the body runs follows section 8.4.1; that a method body that is a block is an implementation follows section 8.4.7; that the argument expressions are evaluated in order from the left when a call is made follows section 15.12.4.2; that control passes to the method body after the argument values are stored in newly created parameter variables follows section 15.12.4.5; that a return with a value evaluates the expression, makes that value the value of the call, and passes control back to the caller follows section 14.17; and that only methods with the same number of arguments become candidates for the call (in the case of fixed-arity methods), and that it is a compile-time error if there is no candidate at all, follows section 15.12.2.1. Only part of section 15.12.2.1 could be read, and section 8.4.5 (the return type) could not be opened. The kinds of errors, the number of errors, and the lines they occur on are not set by the specification but were observed with this javac. This lab does not cover methods whose return type is void, creating several methods with the same name (overloading), methods that belong to an object, or variable arguments. How information is stacked up and removed each time a method is called is covered in "In-depth lab: Stack and heap".',
});
