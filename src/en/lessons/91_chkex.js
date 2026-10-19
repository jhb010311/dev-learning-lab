Lab.register({
  id: 'chkex', nav: 'Checked and unchecked exceptions', cat: 'Java language', mode: 'step',
  title: 'Why do some exceptions keep the code from even compiling unless you handle them?',
  intro: 'Java exceptions fall into two groups. With a checked exception (such as IOException), the compiler refuses to compile the code unless you catch the exception (try-catch) or declare that it is thrown (throws). An unchecked exception (typically RuntimeException or one of its subclasses) has no such requirement, so the code compiles with no handling at all.',
  terms: ['Checked and unchecked exceptions', 'Exception and Error', 'throws clause', 'Wrapped exception'],
  controls: [
    { id: 'ex', label: 'Exception that the read method throws', type: 'select', value: 'io', options: [['io', 'IOException (checked exception)'], ['rt', 'IllegalStateException (unchecked exception)']] },
    { id: 'how', label: 'How the exception is handled', type: 'select', value: 'none', options: [['none', 'Nothing is done'], ['catch', 'Caught with try-catch inside read'], ['throws', 'throws clause on read (main unchanged)'], ['throws2', 'throws clause on both read and main'], ['throwscatch', 'throws clause on read, try-catch in main'], ['wrap', 'Caught inside read, wrapped in a RuntimeException, and rethrown']] },
    { id: 'occur', label: 'The exception is actually thrown at run time (the file is missing)', type: 'check', value: true, hint: 'When this is off, the call is read(false), and no exception is thrown. See whether the compilation result changes.' },
  ],
  presets: [
    { t: 'Default settings', q: 'Does the code compile when read throws IOException (checked exception) and nothing is done to handle it?', d: 'A checked exception is thrown with no handling. The code does not compile.', v: { ex: 'io', how: 'none', occur: true } },
    { t: 'An unchecked exception just compiles', q: 'What if read throws IllegalStateException (unchecked exception) instead?', d: 'Only the exception changes in the same code. The code compiles, and the program stops at run time.', v: { ex: 'rt', how: 'none', occur: true } },
    { t: 'Even when no exception is thrown', q: 'What if you turn off the setting that the exception is actually thrown at run time (the file is missing)?', d: 'The code would not throw an exception if it ran, and yet it is a compile-time error.', v: { ex: 'io', how: 'none', occur: false } },
    { t: 'Adding only throws', q: 'What if you add a throws clause to read and leave main unchanged?', d: 'The error does not go away. It moves to main, which calls read.', v: { ex: 'io', how: 'throws', occur: true } },
    { t: 'throws all the way up to main', q: 'What if you add a throws clause to both read and main?', d: 'The code compiles, but nothing catches the exception, so the program stops.', v: { ex: 'io', how: 'throws2', occur: true } },
    { t: 'Catching in the caller', q: 'What if you add a throws clause to read and use try-catch in main?', d: 'read announces that it throws, and main catches the exception and handles it.', v: { ex: 'io', how: 'throwscatch', occur: true } },
    { t: 'Wrapping in a RuntimeException', q: 'What if you catch the exception inside read, wrap it in a RuntimeException, and rethrow it?', d: 'The code compiles without throws, but the exception has not gone away.', v: { ex: 'io', how: 'wrap', occur: true } },
  ],
  typeName: function (c) { return c.ex === 'io' ? 'IOException' : 'IllegalStateException'; },
  code: function (c) {
    var T = this.typeName(c), h = c.how, arg = c.occur ? 'true' : 'false', s = '';
    var readThrows = h === 'throws' || h === 'throws2' || h === 'throwscatch';
    if (c.ex === 'io') s += 'import java.io.IOException;\n\n';
    s += 'public class Main {\n';
    s += '    static String read(boolean missing)' + (readThrows ? ' throws ' + T : '') + ' {\n';
    if (h === 'catch' || h === 'wrap') {
      s += '        try {\n';
      s += '            if (missing) throw new ' + T + '("file not found");\n';
      s += '            return "content";\n';
      s += '        } catch (' + T + ' e) {\n';
      if (h === 'catch') {
        s += '            System.out.println("caught in read: " + e.getMessage());\n';
        s += '            return "default";\n';
      } else {
        s += '            throw new RuntimeException(e);\n';
      }
      s += '        }\n';
    } else {
      s += '        if (missing) throw new ' + T + '("file not found");\n';
      s += '        return "content";\n';
    }
    s += '    }\n\n';
    s += '    public static void main(String[] args)' + (h === 'throws2' ? ' throws ' + T : '') + ' {\n';
    if (h === 'throwscatch') {
      s += '        try {\n';
      s += '            String s = read(' + arg + ');\n';
      s += '            System.out.println("read: " + s);\n';
      s += '        } catch (' + T + ' e) {\n';
      s += '            System.out.println("caught in main: " + e.getMessage());\n';
      s += '        }\n';
    } else {
      s += '        String s = read(' + arg + ');\n';
      s += '        System.out.println("read: " + s);\n';
    }
    s += '        System.out.println("end of main");\n';
    s += '    }\n';
    s += '}';
    return s;
  },
  label: function (c) { return (c.ex === 'io' ? 'IOException' : 'IllegalStateException') + ' · ' + { none: 'no handling', catch: 'catch in read', throws: 'throws on read only', throws2: 'throws on read and main', throwscatch: 'read throws, main catch', wrap: 'wrapped and rethrown' }[c.how] + ' · ' + (c.occur ? 'exception thrown' : 'no exception'); },
  columns: ['Compilation', 'Line with the error', 'Output', 'How it ended'],
  simulate: function (c) {
    var T = this.typeName(c), io = c.ex === 'io', h = c.how, occur = !!c.occur, arg = occur ? 'true' : 'false', ev = [], sum = [];
    var full = (io ? 'java.io.' : 'java.lang.') + T;
    var HOW_READ = { none: 'no handling', catch: 'caught with try-catch', throws: 'declared with throws', throws2: 'declared with throws', throwscatch: 'declared with throws', wrap: 'wrapped and rethrown' };
    var HOW_MAIN = { none: 'no handling', catch: 'no handling', throws: 'no handling', throws2: 'declared with throws', throwscatch: 'caught with try-catch', wrap: 'no handling' };
    var st = { rh: HOW_READ[h], mh: HOW_MAIN[h], rv: 'not yet', mv: 'not yet', comp: '?', at: '', exc: '', caught: '', out: [], err: '', end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var MSG = 'unreported exception ' + T + '; must be caught or declared to be thrown';
    var failAt = io && h === 'none' ? 'read' : io && h === 'throws' ? 'main' : '';
    var errLine = failAt === 'read' ? 'if (missing) throw new ' + T + '("file not found");' : failAt === 'main' ? 'String s = read(' + arg + ');' : '';

    // ── Compilation phase
    if (io) {
      push('The compiler checks the read method: It contains throw new IOException(...). IOException is a checked exception. A line that can throw a checked exception compiles only if it is enclosed in a try-catch or the declaration of its method has a throws clause.');
      if (h === 'none') { st.rv = 'Error'; st.comp = 'Error'; push('read has neither a try-catch nor a throws clause: This is a compile-time error. The compiler reports "' + MSG + '". In other words, the code can throw an IOException without saying so, and the exception must be either caught or declared as thrown.', 'bad'); }
      if (h === 'catch') { st.rv = 'Passed'; push('The catch (IOException e) inside read catches this exception: The exception has no way to leave read, so the check passes.', 'good'); }
      if (h === 'wrap') { st.rv = 'Passed'; push('The catch (IOException e) inside read catches this exception: The check passes. The RuntimeException that is newly thrown inside the catch block is an unchecked exception, so it is not subject to the check.', 'good'); }
      if (h === 'throws' || h === 'throws2' || h === 'throwscatch') { st.rv = 'Passed'; push('The declaration of read has throws IOException: The method has announced that "this method can throw an IOException to its caller", so read passes the check. In return, the obligation to handle this exception moves to whoever calls read.', 'good'); }
      if (h === 'throws') { st.mv = 'Error'; st.comp = 'Error'; push('The compiler checks the line in main that calls read(' + arg + '): read is declared with throws IOException, so this line can throw an IOException. main has neither a try-catch nor a throws clause. This is a compile-time error, and the message is the same ("' + MSG + '"). The error has moved from inside read to the line that calls read.', 'bad'); }
      if (h === 'throws2') { st.mv = 'Passed'; push('The compiler checks the line in main that calls read(' + arg + '): main is also declared with throws IOException, so the check passes. main is the method where the program starts, so if main passes the exception on too, the only thing left to receive it is the JVM.', ''); }
      if (h === 'throwscatch') { st.mv = 'Passed'; push('The compiler checks the line in main that calls read(' + arg + '): The try that encloses this line has catch (IOException e), so the check passes.', 'good'); }
      if (h === 'catch' || h === 'wrap') { st.mv = 'Passed'; push('The compiler checks the line in main that calls read(' + arg + '): The declaration of read has no throws clause, so no checked exception can come out of this line. main passes without doing anything.', ''); }
    } else {
      st.rv = 'Not checked';
      push('The compiler checks the read method: It contains throw new IllegalStateException(...). IllegalStateException is a subclass of RuntimeException, that is, an unchecked exception. The compiler does not check whether an unchecked exception is caught or declared.' + { none: ' There is neither a try-catch nor a throws clause, but the method passes as it is.', catch: ' Here the exception is caught with catch, not because that is required but because the code chose to do so.', throws: ' Writing throws IllegalStateException is also allowed, but it is only a note for the reader.', throws2: ' Writing throws IllegalStateException is also allowed, but it is only a note for the reader.', throwscatch: ' Writing throws IllegalStateException is also allowed, but it is only a note for the reader.', wrap: ' It is already an unchecked exception, so there is no need to wrap it in a RuntimeException, but the code compiles.' }[h], '');
      st.mv = 'Not checked';
      push('The compiler checks the line in main that calls read(' + arg + '): An unchecked exception does not create an obligation for the caller either. ' + (h === 'throwscatch' ? 'The code compiles without the try-catch in main, but it is there because the code wants to catch the exception.' : h === 'throws' ? 'If this were a checked exception, this is where the compile-time error would be.' : 'main passes as it is too.'), '');
    }
    if (failAt) {
      st.end = 'Cannot run';
      push('Compilation failed: No class file is produced, so the program cannot run.' + (occur ? ' A problem that would occur at run time was stopped in advance, before the program ran.' : ' The call is read(false), so this code would not have thrown an exception if it had run. The result is the same anyway, because the compiler looks at whether the exception "can be thrown", not at whether it "is actually thrown".'), 'bad');
      if (failAt === 'read') sum.push('With a checked exception, the code compiles only if it does one of two things: "catch it, or declare that it is thrown". This mechanism keeps you from overlooking problems that arise from circumstances outside the program and that you can prepare for, such as a missing file or a dropped network connection.');
      else sum.push('throws does not handle the exception. It is a declaration that passes the exception on, saying "the caller must handle it". So the caller (main) must in turn catch it or declare it. The obligation keeps moving up to the caller until some method catches the exception.');
      if (!occur) sum.push('The compilation result is the same even when the exception is not actually thrown. The check is made before the program runs, by looking only at the form of the code.');
      return { events: ev, summary: sum, msg: MSG, row: ['Error', errLine, '(cannot run)', '(cannot run)'] };
    }
    st.comp = 'Success';
    push('Compilation succeeded: The class file has been produced, and the program now runs.', 'good');

    // ── Execution phase
    st.at = 'main';
    push('main starts running: It calls read(' + arg + ').', '');
    st.at = 'read';
    var crashed = '';
    if (!occur) {
      push('read runs: missing is false, so the throw line is skipped. No exception is thrown, and read returns "content".', '');
      st.at = 'main'; st.out.push('read: content');
      push('Control returns to main, and the next line runs: It prints "read: content".', '');
    } else {
      st.exc = T + '("file not found")';
      push('read runs: missing is true, so throw new ' + T + '("file not found") runs. An exception object is created and thrown, and the line below it (return "content") does not run.', 'bad');
      if (h === 'catch') {
        st.exc = ''; st.caught = 'read'; st.out.push('caught in read: file not found');
        push('The catch block in read catches the exception: It prints "caught in read: file not found" and returns "default". The handling of the exception ends here.', 'good');
        st.at = 'main'; st.out.push('read: default');
        push('Control returns to main, and the next line runs: It prints "read: default". main does not know that there was an exception.', '');
      } else {
        if (h === 'wrap') {
          st.exc = 'RuntimeException (cause: ' + T + ')';
          push('The catch block in read catches the exception and runs throw new RuntimeException(e): A new unchecked exception that holds the original exception as its cause is thrown. Only the kind of exception has changed. The problem has not been solved.', 'bad');
          crashed = 'java.lang.RuntimeException: ' + full + ': file not found';
        } else crashed = full + ': file not found';
        st.at = 'main';
        if (h === 'throwscatch') {
          st.exc = ''; st.caught = 'main'; st.out.push('caught in main: file not found'); crashed = '';
          push('Nothing in read catches the exception, so it propagates up to main, which called read: The catch block of the try that encloses the call catches it and prints "caught in main: file not found". The next line inside the try (the one that prints "read") is skipped.', 'good');
        } else {
          push((h === 'wrap' ? 'The new exception leaves read and propagates up to main' : 'Nothing in read catches the exception, so it propagates up to main, which called read') + ': The line in main that calls read is not enclosed in a try, so nothing catches the exception. The remaining lines of main (the ones that print "read" and "end of main") do not run, and the exception leaves main.', 'bad');
        }
      }
    }
    if (crashed) {
      st.at = 'jvm'; st.err = 'Exception in thread "main" ' + crashed; st.end = 'Stopped by exception';
      push('The exception that nothing caught has reached the JVM: The JVM writes the details of the exception (' + crashed + ') and the list of methods that it passed through to standard error, and ends the program. The exit status is 1, which means that the program did not end normally.', 'bad');
    } else {
      st.out.push('end of main'); st.end = 'Normal exit'; st.at = 'main';
      push('The last line of main runs: It prints "end of main", and the program ends normally (exit status 0).', 'good');
    }
    var outText = st.out.length ? st.out.join(' / ') : '(none)', endText = crashed ? 'Stopped by exception (exit status 1): ' + crashed : 'Normal exit (exit status 0)';
    if (!io && (h === 'none' || h === 'throws' || h === 'throws2')) sum.push('An unchecked exception compiles even when it is not handled. The compiler does not tell you about it, so' + (occur ? ' you learn of the problem only when the exception is thrown at run time.' : ' as long as the exception is not thrown, you cannot tell whether there is a problem.') + ' Unchecked exceptions usually indicate mistakes in the code, such as using null or passing an invalid value, so you remove them by fixing the code rather than by catching them.');
    if (!io && h === 'throws') sum.push('With IOException, code of the same form is a compile-time error in main.');
    if (!io && (h === 'catch' || h === 'throwscatch')) sum.push('Unchecked exceptions can be caught too. It is just not required. The developer decides where to catch them.');
    if (!io && h === 'wrap') sum.push('Wrapping something that is already an unchecked exception in a RuntimeException gains nothing. Wrapping is a technique for turning a checked exception into an unchecked exception.');
    if (!io) sum.push('Error (OutOfMemoryError, StackOverflowError, and so on) represents JVM-level problems that a program can hardly recover from by itself, such as running out of memory. The Java Language Specification groups RuntimeException and its subclasses together with Error and its subclasses as the unchecked exception classes. So the compiler does not force you to handle an Error either, and it is usually not caught.');
    if (io && h === 'catch') sum.push('When the exception is caught inside the method where it is thrown, the caller does not have to do anything. But do this only when the code can deal with the problem properly at the place where it catches the exception. If you catch an exception and then do nothing, the fact that there was a problem disappears.');
    if (io && h === 'throws2') sum.push('When every method passes the exception on with throws, the code compiles, but nothing catches the exception.' + (occur ? ' The exception propagates up to the JVM and ends the program.' : ' If the exception is actually thrown, it propagates up to the JVM and ends the program.') + ' What the compiler enforces goes only as far as "catch or declare". It does not check whether you dealt with the problem properly.');
    if (io && h === 'throwscatch') sum.push('read announces with throws what can go wrong, and the side that knows how to deal with it (main) catches it. This is the use that checked exceptions are intended for.');
    if (io && h === 'wrap') sum.push('When you wrap a checked exception in a RuntimeException, the code compiles without a throws clause on one method after another. But the exception has not gone away. It has only been left out of the check that the compiler makes.' + (occur ? ' If nothing catches it, the program stops like this.' : '') + ' When you wrap an exception, pass the original exception, as in new RuntimeException(e), so that the cause is kept.');
    if (!occur) sum.push('In a run where no exception is thrown, the result is the same whatever the handling is. The differences show up at compile time and when the exception is actually thrown.');
    return { events: ev, summary: sum, msg: '', row: ['Success', 'None', outText, endText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to see first the checks that the compiler makes and then the execution of the program, one step at a time.'); return; }
    var ln = H.lanes(v), WHERE = { main: 'running main', read: 'running read', jvm: 'JVM (outside the program)' };
    H.lane(ln, 'Execution point', s.comp === 'Error' ? 'Cannot run' : s.at ? (s.end === 'Normal exit' ? 'ended' : WHERE[s.at]) : 'not started yet', s.at ? 'wait' : 'none');
    H.title(v, 'Console output');
    var lines = s.out.slice(); if (s.err) lines.push(s.err + '  (standard error)');
    v.appendChild(H.el('pre', 'code', lines.length ? lines.join('\n') : '(none yet)'));
  },
  // Diagram: the path that the exception travels up is laid out from left to right as three boxes, read, main, and JVM, and each box shows how the exception is handled and the verdict of the compiler. During execution, the box where the exception is and the box that caught it are colored.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], c = sim.c;
    var s = last ? last.snap : { rh: '', mh: '', rv: 'not yet', mv: 'not yet', comp: '?', at: '', exc: '', caught: '', out: [], err: '', end: '?' };
    P.size(680, 272);
    P.region('road', 16, 16, 648, 136, 'Path that the exception travels (toward the caller)');
    function cls(name, verdict) { return verdict === 'Error' ? 'bad' : s.caught === name ? 'good' : s.at === name ? (s.exc ? 'bad now' : 'hot now') : 'plain'; }
    var HOW_READ = { none: 'no handling', catch: 'caught with try-catch', throws: 'declared with throws', throws2: 'declared with throws', throwscatch: 'declared with throws', wrap: 'wrapped and rethrown' };
    var HOW_MAIN = { none: 'no handling', catch: 'no handling', throws: 'no handling', throws2: 'declared with throws', throwscatch: 'caught with try-catch', wrap: 'no handling' };
    P.box('read', 30, 52, 176, 84, { cls: cls('read', s.rv), title: 'read()', sub: [HOW_READ[c.how], 'Compiler: ' + s.rv] });
    P.box('main', 252, 52, 176, 84, { cls: cls('main', s.mv), title: 'main()', sub: [HOW_MAIN[c.how], 'Compiler: ' + s.mv] });
    P.box('jvm', 474, 52, 176, 84, { cls: s.at === 'jvm' ? 'bad now' : 'ghost', title: 'JVM (outside main)', sub: s.at === 'jvm' ? ['prints the error and', 'ends the program'] : ['if it gets this far,', 'the program ends'] });
    var up1 = s.comp === 'Success' && sim.row[0] === 'Success' && (s.caught === 'main' || (s.at === 'main' && s.exc) || s.at === 'jvm');
    P.arrow('a1', 'read:r', 'main:l', { cls: up1 ? (s.caught === 'main' ? 'good' : 'bad') : 'mut dash' });
    P.arrow('a2', 'main:r', 'jvm:l', { cls: s.at === 'jvm' ? 'bad' : 'mut dash' });
    P.text('exc', 30, 176, s.comp === 'Error' ? 'Compile-time error: the program does not run, so no exception is thrown' : s.exc ? 'Exception thrown: ' + s.exc : s.caught ? 'The catch block in ' + s.caught + ' caught the exception' : s.comp === 'Success' ? 'Exception thrown: none' : 'The compiler is checking the code', { cls: s.exc || s.comp === 'Error' ? 'bad' : s.caught ? 'good' : 'mut' });
    P.box('r1', 16, 196, 320, 36, { cls: s.comp === 'Success' ? 'good' : s.comp === 'Error' ? 'bad' : 'ghost', title: 'Compilation', right: s.comp });
    P.box('r2', 344, 196, 320, 36, { cls: s.end === 'Normal exit' ? 'good' : s.end === '?' ? 'ghost' : 'bad', title: 'Program', right: s.end });
    P.note('A checked exception compiles only if some method on the path catches it or every method that it passes through declares it with throws. For unchecked exceptions, that is, RuntimeException and its subclasses and Error and its subclasses (JVM-level problems such as running out of memory), the compiler does not make this check.');
  },
  assume: 'All 24 combinations were actually compiled on JDK 21 in our test environment from the same source as the code on the screen, and those that compiled were run, and the compilation result, the line with the error, the compiler message, the output, the exit status, and the first line of standard error were checked against the results. The compiler messages are written in the form that the command-line javac shows (class names only). It was confirmed in the same way that throwing an Error with no handling also compiles and that throwing Exception itself is treated as a checked exception. The model covers only the case with two methods (read and main). The rule is the same when the calls go deeper: every method that a checked exception passes through must catch it or declare it. An uncaught exception ending the program applies to the case where main is the only thread.',
});
