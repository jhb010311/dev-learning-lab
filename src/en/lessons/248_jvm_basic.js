Lab.register({
  id: 'jvm_basic', nav: 'Compilation and the JVM', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['classload', 'jit'],
  title: 'How does Java code run?',
  intro: 'The Hello.java file that we write is text for people to read. When you run it with java Hello, this text is not run as it is, but goes through two steps. When you use the command javac Hello.java in a terminal (a window where you type commands as text), a program called javac (the compiler) reads this text and turns it into a file named Hello.class. This job is called compiling. Hello.class contains bytecode, which the JVM reads. Next, when you use the command java Hello, the JVM (Java Virtual Machine) starts, reads Hello.class, and runs main. In this lab you remove the javac line, make the source text wrong, or edit it after compiling, and the real javac and java commands are run, to show whether Hello.class is created and what java Hello runs.',
  terms: ['Compilation and javac', 'Class file', 'Java Virtual Machine (JVM)', 'Bytecode'],
  controls: [
    { id: 'compile', label: 'Write the line javac Hello.java in the terminal', type: 'check', value: true },
    { id: 'src', label: 'Text of Hello.java', type: 'select', value: 'ok', options: [['ok', 'Correct code'], ['nosemi', 'Code without the semicolon (;) at the end of the printing line'], ['edited', 'After compiling, change "Hi" to "Bye"']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does the file Hello.java look like, and what happens when you write the commands javac Hello.java and java Hello in the terminal, one after the other?', d: 'javac creates Hello.class, and the JVM reads Hello.class and prints Hi.', v: { compile: true, src: 'ok' } },
    { t: 'Removing the javac line', q: 'What if you remove the javac Hello.java command and write only the java Hello command?', d: 'Hello.class is not created, so java Hello cannot find anything to run.', v: { compile: false, src: 'ok' } },
    { t: 'Removing the semicolon', q: 'What if you compile after removing the semicolon (;) at the end of the line that prints "Hi"?', d: 'javac reports a syntax error and does not create Hello.class.', v: { compile: true, src: 'nosemi' } },
    { t: 'Fixing only the source after compiling', q: 'What if you compile, then change "Hi" to "Bye", and write only the java Hello command without running javac again?', d: 'The Hello.class made before the change runs, and Hi is printed.', v: { compile: true, src: 'edited' } },
    { t: 'Removing the javac line and the semicolon', q: 'What if you remove the javac Hello.java command and also the semicolon (;) at the end of the printing line, and write only the java Hello command?', d: 'javac never read the file, so the syntax error is not reported, and the run fails for the same reason.', v: { compile: false, src: 'nosemi' } },
  ],
  code: function (c) {
    var o = ['# Hello.java', 'public class Hello {', '    // main: the method that the java command calls first', '    public static void main(String[] args) {',
      '        System.out.println("' + (c.src === 'edited' ? 'Bye' : 'Hi') + '")' + (c.src === 'nosemi' ? '' : ';'), '    }', '}', '', '# Terminal'];
    if (c.compile) o.push('# Compile: javac reads Hello.java and creates Hello.class', 'javac Hello.java');
    if (c.src === 'edited') o.push('# Edit Hello.java in an editor: change "Hi" to "Bye"');
    o.push('# Run: java starts the JVM, which runs main in Hello.class', 'java Hello');
    return o.join('\n');
  },
  label: function (c) { return (c.compile ? 'With the javac line' : 'Without the javac line') + ' · ' + { ok: 'Correct code', nosemi: 'Code without the semicolon', edited: 'Only the source edited after compiling' }[c.src]; },
  columns: ['Hello.class', 'Run result', 'Printed text and the text in the source', 'Where it stopped'],
  simulate: function (c) {
    var ev = [], sum = [], noSemi = c.src === 'nosemi', edited = c.src === 'edited';
    var made = c.compile && !noSemi, run = made;
    var st = { hot: '', jc: '', cls: '', jvm: '', files: ['Hello.java'], srcSub: 'Code that prints "Hi"', clsTxt: '', out: [], fail: false, checks: [], made: 0, lines: 0 };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. The source file
    st.hot = 'src';
    push('The file Hello.java contains Java code that people read, and this code means to print "Hi". Running this code takes two steps. First, the javac command turns the file Hello.java into another file named Hello.class (compiling), and then the java command reads the file Hello.class and runs it. What the java command looks for is not the text in Hello.java but the file Hello.class.', '');

    // 2. Compile
    if (c.compile) {
      st.hot = 'jc'; st.jc = 'run';
      if (noSemi) {
        st.srcSub = 'Missing semicolon';
        push('You run the command javac Hello.java in the terminal. The javac compiler reads the file Hello.java from the beginning and finds that there is no semicolon (;) at the end of line 4, System.out.println("Hi"). In Java a statement must end with a semicolon, so this is a syntax error (javac: \';\' expected).', 'bad');
        st.jc = 'err'; st.cls = 'err'; st.hot = 'cls';
        st.checks.push(['javac Hello.java', { v: '1 error · exit code 1', cls: 'bad' }]);
        push('The javac command reported 1 error and finished (exit code 1). This time the file Hello.class was not created, and the folder contains only the file Hello.java. A syntax mistake is found at compile time, before the program runs.', 'bad');
      } else {
        push('You run the command javac Hello.java in the terminal. The javac compiler reads the file Hello.java from the beginning and checks that it follows Java syntax, and if it does, it turns what it read into bytecode and writes it to the file Hello.class. This step only converts the code and does not run it, so nothing is printed.', '');
        st.jc = 'ok'; st.cls = 'made'; st.clsTxt = 'Hi'; st.made = 1; st.files = ['Hello.java', 'Hello.class']; st.hot = 'cls';
        st.checks.push(['javac Hello.java', { v: 'No errors · Hello.class created', cls: 'good' }]);
        push('The javac command finished without errors (exit code 0). The file Hello.class now exists in the folder. This file contains not text for people to read but bytecode for the JVM to read. The file Hello.java remains as it was.', 'good');
      }
    } else {
      st.hot = 'jc'; st.jc = 'skip'; st.cls = 'none';
      st.checks.push(['javac Hello.java', { v: 'Not run', cls: '' }]);
      push('This terminal did not use the command javac Hello.java. So no compiling happened, and the folder has only the one file Hello.java and no file Hello.class.' + (noSemi ? ' The javac compiler has never read the file Hello.java, so nobody has yet checked that the semicolon is missing at the end of line 4.' : ''), '');
    }

    // 3. Edit the source after compiling
    if (edited) {
      st.hot = 'src'; st.srcSub = 'Code changed to "Bye"';
      st.checks.push(['Edit Hello.java', { v: c.compile ? '"Hi" to "Bye" · Hello.class unchanged' : '"Hi" to "Bye"', cls: '' }]);
      push(c.compile ? 'You open the file Hello.java in an editor, change "Hi" to "Bye", and save it. The only thing you changed is the file Hello.java. The file Hello.class you just made has not changed by a single character. This is because Hello.class was made by the javac compiler reading Hello.java before the change.' : 'You open the file Hello.java in an editor, change "Hi" to "Bye", and save it. You have never compiled, so the folder still has no file Hello.class.', '');
    }

    // 4. Run
    st.hot = 'jvm';
    if (run) {
      st.jvm = 'run';
      push('You run the command java Hello in the terminal. The java command starts the JVM, and the JVM looks for the file Hello.class in the current folder and loads it. What the JVM reads is the file Hello.class, not the file Hello.java.', '');
      st.out = ['Hi']; st.lines = 1; st.hot = 'out';
      st.checks.push(['java Hello', { v: 'Printed Hi', cls: 'good' }]);
      push('The JVM runs main in Hello.class, and the println in main prints Hi.' + (edited ? ' The file Hello.java now says "Bye", but Hello.class was made from the "Hi" before the change, so Hi is printed. To have Bye printed, you have to run the command javac Hello.java again to make a new Hello.class.' : ''), 'good');
    } else {
      st.jvm = 'fail'; st.fail = true;
      st.checks.push(['java Hello', { v: 'Error: Could not find or load main class Hello · exit code 1', cls: 'bad' }]);
      push((noSemi && c.compile ? 'Even though the javac command failed, if you run the command java Hello, ' : 'You run the command java Hello in the terminal. ') + 'The java command starts the JVM, and the JVM looks for the file Hello.class in the current folder. The folder has the file Hello.java but not the file Hello.class, so the JVM cannot find the class Hello, prints the error "Error: Could not find or load main class Hello", and ends (exit code 1). The JVM does not read the file Hello.java in its place.', 'bad');
    }
    st.hot = '';

    // Summary: the first line is the answer to this setting (the question)
    if (made && !edited) {
      sum.push('Hello.java is Java code for people to read, and the javac command turns it into Hello.class, a bytecode file for the JVM to read (compiling). When the JVM started by the java command reads Hello.class and runs main, Hi is printed. What ran was Hello.class, not Hello.java.');
      sum.push('Compiling only converts the code and does not run it. Nothing was printed when you used the command javac Hello.java, and Hi was printed when you used the command java Hello.');
    } else if (made) {
      sum.push('If you edit only Hello.java after compiling and do not use the javac command again, the java Hello command runs the Hello.class made before the edit and prints Hi. Even if you edit the source, the old Hello.class runs until you compile again.');
      sum.push('To have the edited text run, you have to use the command javac Hello.java again to make a new Hello.class, and then Bye is printed.');
    } else if (!c.compile && noSemi) {
      sum.push('If you do not use the command javac Hello.java, Hello.class is not created, so the java Hello command finds nothing to run. Even though the semicolon is missing, the javac compiler never read the file, so the syntax error was not reported, and the run failed because there was no Hello.class.');
      sum.push('The place that checks whether the syntax is correct is javac. If you do not compile, you cannot see the mistake either.');
    } else if (!c.compile) {
      sum.push('If you do not use the command javac Hello.java, Hello.class is not created, so the java Hello command finds nothing to run. Even if Hello.java is in the folder, the JVM does not read that text and looks only for Hello.class.');
      sum.push(edited ? 'It does not matter whether you edited Hello.java. To run this way (java Hello), you have to compile with javac first.' : 'To run this way (java Hello), you have to compile with javac first.');
    } else {
      sum.push('If you remove the semicolon (;) at the end of the printing line, the javac compiler reports a syntax error and stops while compiling, and the file Hello.class is not created. Even if you use the java Hello command in this state, it fails because there is no Hello.class for the JVM to read.');
      sum.push('Code with a syntax mistake is filtered out at the compile step, before it runs. javac tells you which line has the error.');
    }
    var cmpTxt = edited ? 'Different: printed Hi, source says Bye' : 'Same';
    return { events: ev, summary: sum, made: made, row: [made ? 'Created' : 'None', run ? 'Printed Hi' : 'Error: Could not find or load main class Hello', run ? cmpTxt : 'No output', run ? 'Did not stop' : (c.compile ? 'javac Hello.java (compile)' : 'java Hello (run)')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the file Hello.java.'); return; }
    H.table(v, ['What was done', 'Result'], s.checks.length ? s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['Nothing done yet', ''] }], 'Done in the terminal');
    H.counters(v, [[s.made, 'Hello.class files'], [s.lines, 'Lines printed']]);
  },
  // Diagram: the top row is Hello.java -> javac -> Hello.class, and the bottom row is the files in the folder, the screen output, and the JVM. You can see whether the arrow from Hello.class to the JVM is broken. At the very bottom are boxes that count the Hello.class files and the lines printed.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 300);
    var hot = s ? s.hot : '';
    P.box('src', 20, 16, 176, 70, { cls: hot === 'src' ? 'hot now' : 'plain', title: 'Hello.java', sub: ['Text for people', s ? s.srcSub : 'Code that prints "Hi"'] });
    var jcSub = !s || !s.jc ? 'Compiler' : { run: 'Reading the file', ok: 'No errors', err: '1 error', skip: 'Not run' }[s.jc];
    P.box('jc', 252, 16, 176, 70, { cls: s && s.jc === 'err' ? 'bad' : s && s.jc === 'skip' ? 'ghost' : hot === 'jc' ? 'hot now' : s && s.jc === 'ok' ? 'good' : 'plain', title: 'javac', sub: jcSub });
    var cs = s ? s.cls : '';
    P.box('cls', 484, 16, 176, 70, { cls: cs === 'made' ? (hot === 'cls' ? 'good now' : 'good') : cs === 'err' ? 'bad' : 'ghost', title: 'Hello.class', sub: cs === 'made' ? ['Bytecode', 'Contains: ' + s.clsTxt] : cs === 'err' ? 'Not created' : cs === 'none' ? 'None' : 'Not yet' });
    if (s && s.jc && s.jc !== 'skip') P.arrow('a1', 'src:r', 'jc:l', { cls: s.jc === 'run' ? 'hot' : s.jc === 'err' ? 'bad' : 'mut' });
    if (s && (s.jc === 'ok')) P.arrow('a2', 'jc:r', 'cls:l', { cls: hot === 'cls' ? 'good' : 'mut' });
    if (s && s.jc === 'err') P.arrow('a2', 'jc:r', 'cls:l', { cls: 'bad' });
    P.box('fd', 20, 146, 176, 70, { cls: 'plain', title: 'Files in the folder', sub: s ? s.files : ['Hello.java'] });
    var os = s ? s.out : [];
    P.box('out', 252, 146, 176, 70, { cls: s && s.fail ? 'bad' : os.length ? 'good' : 'ghost', title: 'Screen output', sub: s && s.fail ? ['Error: class', 'not found'] : os.length ? os : 'Nothing yet' });
    var js = s ? s.jvm : '';
    P.box('jvm', 484, 146, 176, 70, { cls: js === 'fail' ? 'bad' : hot === 'jvm' ? 'hot now' : js === 'run' ? 'good' : 'ghost', title: 'JVM', sub: js === 'run' ? 'Reads Hello.class' : js === 'fail' ? 'No Hello.class' : 'Started by java Hello' });
    if (s && js === 'run') P.arrow('a3', 'cls:b', 'jvm:t', { cls: hot === 'jvm' ? 'hot' : 'mut' });
    if (s && js === 'fail') P.arrow('a3', 'cls:b', 'jvm:t', { cls: 'bad' });
    if (s && os.length) P.arrow('a4', 'jvm:l', 'out:r', { cls: 'good' });
    P.box('n1', 20, 244, 316, 36, { cls: s && s.made ? 'wait' : 'ghost', title: 'Hello.class files', right: (s ? s.made : 0) + '' });
    P.box('n2', 344, 244, 316, 36, { cls: s && s.lines ? 'good' : 'ghost', title: 'Lines printed', right: (s ? s.lines : 0) + '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21, java 21). All 6 combinations were checked against real runs: for each combination, the same text as the code on the screen (the # Hello.java section and the # Terminal section) was written in an empty folder, the source file and the commands were read from that text, and the real javac program and java program were started as processes and run. What was checked is whether Hello.class appeared in the folder, the exit code and standard output of javac, the first error message and the number of errors and the line of the error, the exit code, output, and error message of java, whether the edit leaves Hello.class unchanged, and the first four bytes of the Hello.class file (CAFEBABE) and its version (65, Java 21). That the "Bye" is printed when you use the javac command again after the edit was also checked by a separate run. The commands that were run differ from the screen in two ways. To read the output text and the error messages in the same way, options were added to javac and java that set the output encoding to UTF-8 and the message language to English (-Dstdout.encoding=UTF-8, -Duser.language=en, and so on). Without the options, on the PC used to write this lab (Korean Windows), the java Hello command gives the same error as a Korean message. I opened the documentation and checked it. I followed section 1.2 of the Java Virtual Machine Specification, Java SE 21 Edition (the JVM does not know the Java language and knows only the class file format, and a class file contains bytecode, which are JVM instructions), section 4.1 of the same specification (the magic value at the very beginning of a class file is 0xCAFEBABE, and the major version for Java SE 21 is 65; I read only part of this chapter), the JDK 21 documentation of the javac tool (it reads .java source files and compiles them into .class files, creates them in the same folder as the source if nothing else is set, and puts the class files in the output folder if there are no errors), and the documentation of the java tool (it starts a JVM, loads the specified class, and calls main, and if the class path is not set it is the current folder; I read only the first part and could not read the exit code section). That no Hello.class is created when there is an error, that the exit codes are 0 and 1, and the text of the error messages are not set by the documentation but were observed on this JDK. The code on the screen was cut down to the situation where the folder has only one file, Hello.java, and classes with a package, class path settings, jar files, and an IDE or build tool compiling for you are not covered. The way of running a source file directly, as in java Hello.java (source-file mode), is not used on the screen either. When I ran it on this JDK, it printed Hi without creating Hello.class (the java documentation also explains that it compiles the source in memory and runs it), and a source with a missing semicolon failed with the same compile error in this mode too. I also confirmed that if, after a successful compile, you change the source to something wrong and use the javac command again, you get an error but the old Hello.class stays in the folder and the java Hello command runs the old code, but the screen does not cover this. How the JVM loads Hello.class is covered in the in-depth lab "Class loading and initialization", and JIT, which recompiles bytecode into machine code, is covered in the in-depth lab "JIT warmup".',
});
