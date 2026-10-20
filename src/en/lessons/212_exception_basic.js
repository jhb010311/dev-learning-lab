Lab.register({
  id: 'exception_basic', nav: 'Exceptions', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['exflow'],
  title: 'What is an exception, and what does try-catch do?',
  why: 'Without exceptions, a method often returns a special value such as -1 to report a problem, and if the caller does not check that value, the problem passes silently and leads to a wrong result. A Java exception stops execution right where the problem occurred and jumps to the place that caught it with try-catch, so the problem does not pass unnoticed, and the code that handles it can be written separately from the usual code.',
  use: 'Java throws an exception when you try to convert text that is not a number with Integer.parseInt, when the file you want to open does not exist, and when the network connection drops. If there is something to do on the spot, such as telling the user "invalid input", you handle it with catch, and if not, you do not catch it and pass it on to the caller. On a Spring server, an exception that was not handled is often turned into an error response in a method marked with @ExceptionHandler.',
  intro: 'An exception is an object that Java throws when something happens while the program is running and it cannot continue. For example, when you divide an integer by 0, Java throws an exception called ArithmeticException, and at the moment it is thrown, the program stops what it was doing right there. If nobody catches it, the program ends there and the lines after it do not run. You write the code that might fail between the braces of try { }. The catch (kind of exception e) { } after it is the place where execution jumps when that kind of exception occurs, and handles it. When the handling is done, the program keeps running the lines below the try-catch. In this lab you compile and run the same code while you remove the try-catch, change the value of b, and change the kind that catch catches, and you see what is printed and how the program ends.',
  terms: ['Exception and Error', 'try-catch', 'Throwing an exception (throw)', 'NullPointerException'],
  controls: [
    { id: 'tc', label: 'Wrap in try-catch', type: 'check', value: true },
    { id: 'b', label: 'Value stored in variable b', type: 'select', value: 'zero', options: [['zero', 'Store 0 in b (divide by zero)'], ['two', 'Store 2 in b']] },
    { id: 'kind', label: 'Exception that catch catches', type: 'select', value: 'arith', options: [['arith', 'catch (ArithmeticException e)'], ['npe', 'catch (NullPointerException e): catches a different kind']], show: function (c) { return c.tc; } },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only body
  presets: [
    { t: 'Default settings', q: 'What is an exception, and what happens when code wrapped in try-catch divides by zero?', d: 'The moment you divide by 0, an exception is thrown, catch receives and handles it, and the program runs on to "Done".', v: { tc: true, b: 'zero', kind: 'arith' } },
    { t: 'Remove try-catch', q: 'What if you remove try-catch?', d: 'Nothing catches the exception, so the program stops at that line and "Done" is not printed.', v: { tc: false, b: 'zero', kind: 'arith' } },
    { t: 'Store 2 in b', q: 'What if you store 2 in b instead of 0?', d: 'No exception occurs, so 5 and "Done" are printed, and the code inside catch does not run.', v: { tc: true, b: 'two', kind: 'arith' } },
    { t: 'Catch a different kind', q: 'What if catch catches a different kind of exception (NullPointerException)?', d: 'catch cannot catch ArithmeticException, so the program stops.', v: { tc: true, b: 'zero', kind: 'npe' } },
  ],
  code: function (c) {
    var o = ['public class Main {', '    public static void main(String[] args) {', '        int a = 10;', '        int b = ' + (c.b === 'zero' ? '0' : '2') + ';'];
    if (c.tc) o.push('        // try block: write the code that might fail here', '        try {', '            System.out.println(a / b);', '        // catch: if an exception occurs, execution jumps here', '        } catch (' + (c.kind === 'arith' ? 'ArithmeticException' : 'NullPointerException') + ' e) {', '            System.out.println("Cannot divide by zero");', '        }');
    else o.push('        System.out.println(a / b);');
    o.push('        System.out.println("Done");', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.tc ? 'With try-catch' : 'No try-catch') + ' · b is ' + (c.b === 'zero' ? '0' : '2') + (c.tc ? ' · ' + (c.kind === 'arith' ? 'catches ArithmeticException' : 'catches NullPointerException') : ''); },
  columns: ['Output', 'How the program ended', 'Code inside catch'],
  simulate: function (c) {
    var ev = [], sum = [], Z = c.b === 'zero', K = c.kind === 'arith' ? 'ArithmeticException' : 'NullPointerException';
    var caught = c.tc && Z && c.kind === 'arith', stops = Z && !caught;
    var st = { hot: '', ln: { calc: '', pr: '', ct: '', end: '' }, exc: '', thrown: 0, out: [], ended: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var bv = Z ? '0' : '2', SHOW = 'System.out.println("Done");';

    // 1. main starts and values are stored in a and b
    push('You run it with java Main. The main method starts and the lines int a = 10; and int b = ' + bv + '; run in order, so the value stored in variable a is 10 and the value stored in variable b is ' + bv + '.', '');

    // 2. execution reaches try
    if (c.tc) {
      st.hot = 'pr';
      push('Execution reaches the try { line. The lines inside try run from the top as usual. try tells Java in advance, "if an exception occurs in here, pass it to the catch below." If no exception occurs, the code runs the same as if try were not there.', '');
    }

    // 3. the moment a / b is calculated
    st.hot = 'calc'; st.ln.calc = 'now';
    if (Z) {
      st.ln.calc = 'bad'; st.ln.pr = 'skip'; st.exc = 'ArithmeticException'; st.thrown = 1;
      st.checks.push(['Calculate a / b', { v: '10 / 0: throws ArithmeticException', cls: 'bad' }]);
      push('The line System.out.println(a / b); runs. To print, println must first calculate a / b inside the parentheses. At the moment it tries to calculate 10 / 0, Java (the JVM) sees that an integer cannot be divided by 0, creates an exception object called ArithmeticException, and throws it. When an exception is thrown, Java stops what it was doing right there, so println, which has no value to print, does not run.', 'bad');
    } else {
      st.ln.calc = 'ok'; st.ln.pr = 'ok'; st.out.push('5');
      st.checks.push(['Calculate a / b', { v: '10 / 2 = 5: no exception', cls: 'good' }]);
      st.checks.push(['println(a / b)', { v: 'Prints 5', cls: 'good' }]);
      push('The line System.out.println(a / b); runs. First it calculates a / b inside the parentheses: 10 / 2 is 5, and there is no problem, so no exception occurs. println prints 5.', 'good');
    }

    // 4-6. look for a place that catches the exception / what comes after
    if (Z) {
      if (c.tc) {
        st.hot = 'ct'; st.ln.ct = 'now';
        if (c.kind === 'arith') {
          st.checks.push(['catch (ArithmeticException e)', { v: 'Kind matches', cls: 'good' }]);
          push('Java looks for a place that catches this exception. The exception occurred inside try, so it looks at the catch attached to this try. catch (ArithmeticException e) says it catches the ArithmeticException kind, and the exception that was thrown is an ArithmeticException, so the kind matches.', 'good');
          st.ln.ct = 'ok'; st.out.push('Cannot divide by zero');
          st.checks.push(['println inside catch', { v: 'Ran', cls: 'good' }]);
          push('Execution jumps into catch. Variable e now refers to the thrown exception object, and the line System.out.println("Cannot divide by zero"); inside catch runs and prints that text.', 'good');
          st.hot = 'end'; st.ln.end = 'ok'; st.out.push('Done'); st.ended = 'ok';
          st.checks.push([SHOW, { v: 'Ran', cls: 'good' }]);
          push('When the lines inside catch finish, the exception counts as handled. The program does not stop. It continues with the lines below the try-catch, and the line ' + SHOW + ' prints "Done". The last line of main has run, so the program ends.', 'good');
        } else {
          st.ln.ct = 'skip';
          st.checks.push(['catch (NullPointerException e)', { v: 'Kind does not match', cls: 'bad' }]);
          push('Java looks for a place that catches this exception. The exception occurred inside try, so it looks at the catch attached to this try. catch (NullPointerException e) says it catches only the NullPointerException kind. The exception that was thrown is an ArithmeticException, so the kind does not match, and this try has no other catch.', 'bad');
        }
      } else {
        st.hot = 'ct';
        st.checks.push(['Place that catches the exception', { v: 'None (no try-catch)', cls: 'bad' }]);
        push('Java looks for a place that catches this exception. This code has no try-catch, so nothing catches it.', 'bad');
      }
      if (stops) {
        st.hot = 'end'; st.ln.end = 'skip'; st.ended = 'exc';
        st.checks.push([SHOW, { v: 'Did not run', cls: 'bad' }]);
        push('Nothing catches the exception, so the main method ends right there. ' + (c.tc ? 'The line inside catch does not run, and the line below it, ' : 'The line below it, ') + SHOW + ', does not run either. Java reports the kind and message of the exception as an error (Exception in thread "main" java.lang.ArithmeticException: / by zero) and ends the program. The exit code was 1, not the 0 of a normal finish.', 'bad');
      }
    } else {
      if (c.tc) {
        st.hot = 'ct'; st.ln.ct = 'skip';
        st.checks.push(['println inside catch', { v: 'Did not run', cls: '' }]);
        push('No exception occurred in try, so there is no need to look for a matching catch. Java does not jump into catch and continues with the lines below the try-catch. The line inside catch does not run.' + (c.kind === 'npe' ? ' This is true even though catch says it catches NullPointerException. If no exception occurs, the kind in catch is not used.' : ''), '');
      }
      st.hot = 'end'; st.ln.end = 'ok'; st.out.push('Done'); st.ended = 'ok';
      st.checks.push([SHOW, { v: 'Ran', cls: 'good' }]);
      push('The line ' + SHOW + ' prints "Done". The last line of main has run, so the program ends (exit code 0).', 'good');
    }

    // Summary: the first line is the answer to this setting (question)
    if (caught) {
      sum.push('An exception is an object that Java throws when something happens at run time and it cannot continue. ArithmeticException was thrown at 10 / 0, so println(a / b) did not run, but the code was wrapped in try-catch, so execution jumped into catch and handled it, and then ran on to "Done" below the try-catch.');
      sum.push('An exception does not end the program right away. If there is a catch with a matching kind, it receives the exception, handles it, and execution continues. The code does not go back to the place where the exception was thrown, so the rest of the line where the exception occurred does not run.');
    } else if (!c.tc && Z) {
      sum.push('When you remove try-catch, nothing catches the exception, so the ArithmeticException thrown at 10 / 0 stopped the program at that line. Nothing was printed, and the line that prints "Done" did not run.');
      sum.push('When an exception is thrown, it stops what was happening, so if nobody catches it, the lines after it do not run. Java reports the kind and message of the exception as an error and ends the program.');
    } else if (Z) {
      sum.push('When catch is written for NullPointerException, it cannot catch the ArithmeticException that was thrown, and the program stopped. Even though the code is wrapped in try-catch, the line inside catch did not run, and "Done" was not printed either.');
      sum.push('catch catches only the kind of exception written in its parentheses. If the kind does not match, it is the same as having no place to catch the exception, even with a try-catch.');
    } else if (c.tc) {
      sum.push('When you store 2 in b, 10 / 2 is 5 and no exception occurs, so 5 and "Done" were printed. The line inside catch did not run.');
      sum.push('catch runs only when an exception occurs. If no exception occurs, the code runs the same as if the try-catch were not there' + (c.kind === 'npe' ? ', and which kind catch catches is not used either.' : ', and the code that was wrapped in case it might fail passes by unused.'));
    } else {
      sum.push('When you store 2 in b, 10 / 2 is 5 and no exception occurs, so 5 and "Done" were printed even without a try-catch.');
      sum.push('Code that does not throw an exception gives the same result with or without try-catch. What try-catch does matters only when an exception occurs.');
    }
    var out = st.out.length ? st.out.join(' / ') : '(nothing printed)';
    return { events: ev, summary: sum, row: [out, st.ended === 'ok' ? 'Ran to the end' : 'Stopped by ArithmeticException', !c.tc ? 'No catch' : st.ln.ct === 'ok' ? 'Ran' : 'Did not run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to execute the main method line by line, starting from its first line.'); return; }
    H.table(v, ['Line that ran', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Run');
    if (s.out.length) H.table(v, ['Output'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), 'Standard output');
    H.counters(v, [[s.thrown, 'Exceptions thrown'], [s.out.length, 'Lines printed']]);
  },
  // Diagram: on the left, the lines of code from top to bottom (calculate a / b, the println inside try, catch, print "Done") as boxes; a line that was run is green, the line where the exception occurred is red, and a skipped line is dashed. On the right, the thrown exception object, and an arrow showing it jumping to catch (or not being caught). Below, how the program ended and the output.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 360);
    var hot = s ? s.hot : '', ln = s ? s.ln : { calc: '', pr: '', ct: '', end: '' }, Z = c.b === 'zero';
    var cls = function (id, st) { return st === 'bad' ? 'bad' : st === 'ok' ? (hot === id ? 'good now' : 'good') : st === 'skip' ? 'ghost' : hot === id ? 'hot now' : 'plain'; };
    P.box('calc', 14, 14, 330, 48, { cls: cls('calc', ln.calc), title: 'Calculate a / b', sub: ln.calc === 'ok' ? '10 / 2 = 5' : ln.calc === 'bad' ? '10 / 0: cannot calculate' : '10 / ' + (Z ? '0' : '2') + (ln.calc === 'now' ? ' calculating' : ' (not run yet)') });
    P.box('pr', 14, 76, 330, 48, { cls: cls('pr', ln.pr), title: c.tc ? 'println(a / b) inside try' : 'println(a / b)', sub: ln.pr === 'ok' ? 'Printed 5' : ln.pr === 'skip' ? 'Did not run' : 'Not run yet' });
    if (c.tc) P.box('ct', 14, 138, 330, 48, { cls: cls('ct', ln.ct), title: 'catch (' + (c.kind === 'arith' ? 'ArithmeticException' : 'NullPointerException') + ' e)', sub: ln.ct === 'ok' ? 'Printed "Cannot divide by zero"' : ln.ct === 'skip' ? (Z ? 'Did not run: kind does not match' : 'Did not run: no exception') : ln.ct === 'now' ? 'Checking the kind' : 'Not run yet' });
    else P.box('ct', 14, 138, 330, 48, { cls: 'ghost', title: 'catch', sub: 'No catch' });
    P.box('end', 14, 200, 330, 48, { cls: cls('end', ln.end), title: 'Print "Done"', sub: ln.end === 'ok' ? 'Printed' : ln.end === 'skip' ? 'Did not run' : 'Not run yet' });
    P.box('exc', 410, 14, 256, 62, { cls: s && s.exc ? 'bad' : 'ghost', title: 'ArithmeticException object', sub: s && s.exc ? 'Message: / by zero' : 'Does not exist yet' });
    if (s && s.exc) P.arrow('thr', 'calc:r:0.5', 'exc:l:0.5', { cls: 'bad' });
    if (s && s.exc && c.tc && ln.ct) P.arrow('jump', 'exc:b:0.2', 'ct:r:0.5', { cls: ln.ct === 'skip' && c.kind === 'npe' ? 'bad dash' : ln.ct === 'now' ? 'hot' : 'good' });
    if (s && s.ended === 'exc') P.arrow('lost', 'exc:b:0.8', 'r1:t:0.8', { cls: 'bad' });
    P.box('r1', 14, 262, 652, 44, { cls: s && s.ended === 'ok' ? 'good' : s && s.ended === 'exc' ? 'bad' : 'ghost', title: 'How the program ended', right: s && s.ended === 'ok' ? 'Ran to the end' : s && s.ended === 'exc' ? 'Stopped by ArithmeticException' : '', sub: s && s.ended === 'exc' ? 'Reported as an error: ArithmeticException: / by zero' : '' });
    P.box('r2', 14, 316, 652, 36, { cls: s && s.out.length ? 'good' : s && s.ended ? 'bad' : 'ghost', title: 'Output', right: s ? (s.out.length ? s.out.join(' / ') : s.ended ? '(nothing printed)' : '(no output yet)') : '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all eight combinations, the source that is the same as the code on the screen (identical text, line by line) was compiled with javax.tools, and all of them compiled. The compiled Main was then run by starting this JDK\'s java as a child process, and the results were checked against the standard output, standard error, and exit code that were captured. What was checked is whether compilation succeeded, the lines of standard output (the Output column of the result table), the exit code and the first line of standard error (the How the program ended column: when it ended normally, the exit code was 0 and standard error was empty; when it stopped, the exit code was 1, the first line was Exception in thread "main" java.lang.ArithmeticException: / by zero, and a stack trace containing Main.main followed in standard error), and whether the code inside catch ran (whether the text printed by the println inside catch is in standard output). Every combination that stopped had empty standard output, so "Done" was not printed. In the combinations without try-catch, the setting for the kind that catch catches is not used, so the two combinations give the same result. The documentation was checked by opening the Java Language Specification (Java SE 21) directly. That the Java virtual machine signals a violation of the rules as an exception and control is transferred to a point specified by the program is from the introduction of Chapter 11; that when an exception is thrown, control is transferred to a catch that can handle it in the nearest enclosing try, the code that caused the exception is not executed again, and the thread ends if there is no catch to handle it is from Section 11.3; that throw transfers control immediately and the thread ends if there is no matching try is from Section 14.18; that a catch has exactly one parameter and its type must be Throwable or a subclass of it is from Section 14.20; that if the kind of the thrown value can be assigned to the kind written in a catch, the leftmost matching catch is selected and its block runs, that the try statement also completes normally if that block completes normally, and that the try statement ends with the same exception if there is no matching catch is from Section 14.20.1; and that an ArithmeticException is thrown when the divisor of an integer division is 0 is from Section 15.17.2. The matching kinds in Section 14.20.1 also include subkinds of the written kind, but the catch clauses in this lab are only ArithmeticException and NullPointerException, and the two are not in a superclass-subclass relationship, so the case of catching a subkind is not covered. The text in standard error and the exit code 1 are not defined by the specification; they were observed on this java. The code on the screen has the same form as running with java Main, and there is no package. The 10 / 0 and 10 / 2 in the diagram spell out the values stored in a and b. Exceptions also involve using several catch clauses, finally, throwing directly with throw, looking for a place to catch by going back up through the methods that were called, and checked exceptions, but this lab does not cover them. They are covered in the in-depth lab "Exceptions and finally".',
});
