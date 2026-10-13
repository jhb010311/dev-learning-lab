Lab.register({
  id: 'dep_basic', nav: 'Libraries and dependencies', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['supplychain', 'autoconf'],
  title: 'What is a library, and what happens when it is missing?',
  intro: 'A library is a set of classes that someone else has made. In this lab, one class, lib.Greeter, is packed into a jar file (a file that bundles class files) named greet.jar. My code, App.java, uses that class with import lib.Greeter;, but Greeter is not inside App.java. So both when compiling and when running, the compiler (javac) and the JVM (java) have to find Greeter on the class path (a list of places to look for class files), and in the command you write that list after -cp. The libraries that my project uses are called dependencies, and in the build tool Gradle, a dependency declared with implementation goes into the class path for both compiling and running. In this lab you take greet.jar out of the javac command and the java command one at a time, and the real compile and run happen, to show which error occurs at which step. (Gradle is not run in this lab.)',
  terms: ['Libraries and JAR files', 'Class path (-cp)', 'NoClassDefFoundError', 'Dependencies and implementation'],
  controls: [
    { id: 'compileCp', label: 'Write -cp greet.jar in the javac command', type: 'check', value: true },
    { id: 'runCp', label: 'Write greet.jar; in the -cp of the java command', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'How is code that uses a class from a library compiled and run?', d: 'Both the compile command and the run command have greet.jar. The compile succeeds and hello, kim is printed.', v: { compileCp: true, runCp: true } },
    { t: 'Removing -cp greet.jar when compiling', q: 'What if you remove -cp greet.jar from the javac command that compiles?', d: 'The compiler cannot find Greeter, so the compile fails.', v: { compileCp: false, runCp: true } },
    { t: 'Removing greet.jar when running', q: 'What if you leave the compile as it is and remove greet.jar; from the java command that runs?', d: 'The compile succeeds, but while running, Greeter cannot be found and an error occurs.', v: { compileCp: true, runCp: false } },
    { t: 'Removing it from both', q: 'What if you remove greet.jar from both commands?', d: 'It already fails at the compile step, so it cannot run.', v: { compileCp: false, runCp: false } },
  ],
  // Words used in the table on the right of the screen and in the diagram
  msgs: { pkg: 'No package lib', sym: 'Greeter cannot be found', ncdfe: 'NoClassDefFoundError at run time (lib/Greeter)' },
  code: function (c) {
    return ['# App.java', '// Import a class made by someone else, which is inside greet.jar', 'import lib.Greeter;', '', 'public class App {', '    public static void main(String[] args) {', '        System.out.println(Greeter.hello("kim"));', '    }', '}', '',
      '# greet.jar (Greeter.java compiled and packed into a jar)', 'package lib;', '', 'public class Greeter {', '    public static String hello(String name) {', '        return "hello, " + name;', '    }', '}', '',
      '# Terminal', 'javac ' + (c.compileCp ? '-cp greet.jar ' : '') + 'App.java', 'java -cp ' + (c.runCp ? 'greet.jar;.' : '.') + ' App'].join('\n');
  },
  label: function (c) { return (c.compileCp ? 'javac has -cp greet.jar' : 'javac has no -cp') + ' · ' + (c.runCp ? 'java has greet.jar' : 'java has no greet.jar'); },
  columns: ['Compile', 'Run', 'Error'],
  simulate: function (c) {
    var ev = [], sum = [], cc = c.compileCp, rc = c.runCp, M = this.msgs;
    var javac = 'javac ' + (cc ? '-cp greet.jar ' : '') + 'App.java', java = 'java -cp ' + (rc ? 'greet.jar;.' : '.') + ' App';
    var st = { hot: '', stage: '', phase: '', compile: '', cls: 0, errs: 0, run: '', out: '', printed: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // Compile
    st.hot = 'app';
    st.checks.push(['Compile command', javac]);
    push('When you type the command ' + javac + ' in the terminal, the compiler (javac) reads App.java. The import lib.Greeter; line at the top of the source means that it uses the class Greeter, which is not inside App.java. Greeter is a class that someone else made, and it is inside greet.jar as a file named lib/Greeter.class.', '');
    st.stage = 'compile'; st.phase = 'search'; st.hot = 'cp';
    st.checks.push(['Where javac looks (class path)', cc ? 'greet.jar' : 'Current folder only']);
    push(cc
      ? 'The compiler has to know what kind of class Greeter is before it can compile, so it looks for lib/Greeter.class on the class path. The class path is a list of places to look for class files, and you write it after -cp in the command. This command says -cp greet.jar, so the place to look is greet.jar.'
      : 'The compiler has to know what kind of class Greeter is before it can compile, so it looks for lib/Greeter.class on the class path. This command has no -cp, so the only place to look is the current folder (javac documentation: with neither -cp nor the CLASSPATH environment variable, the current folder. The environment variable was cleared for this check). The current folder has App.java and greet.jar, but greet.jar was not written in -cp, so it is not among the places to look. Being in the same folder does not put it on the class path.', '');
    if (cc) {
      st.phase = 'found'; st.hot = 'jar';
      st.checks.push(['Found lib/Greeter.class? (compile)', { v: 'Found', cls: 'good' }]);
      push('It found lib/Greeter.class inside greet.jar. The compiler now knows the class Greeter, so the Greeter.hello("kim") line passes too.', 'good');
      st.compile = 'ok'; st.cls = 1; st.hot = ''; st.phase = '';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('The compile succeeds and App.class is created. The only new class file in the folder is App.class, and Greeter.class was not copied. The contents of greet.jar did not come inside App.class.', 'good');
    } else {
      st.phase = 'miss'; st.hot = 'cp'; st.errs = 2;
      st.checks.push(['Found lib/Greeter.class? (compile)', { v: 'Not found', cls: 'bad' }]);
      push('There is no lib/Greeter.class in the place to look (the current folder), so the compiler cannot know Greeter. There are 2 errors. One is "package lib does not exist" (' + M.pkg + ') for the import lib.Greeter; line, and the other is "cannot find symbol" (' + M.sym + ') for the Greeter.hello("kim") line.', 'bad');
      st.compile = 'err'; st.hot = ''; st.phase = '';
      st.checks.push(['Compile', { v: '2 errors', cls: 'bad' }]);
      push('The compile failed. App.class was not created.', 'bad');
    }

    // Run
    st.stage = 'run'; st.hot = 'app'; st.checks.push(['Run command', java]);
    if (!cc) {
      st.phase = 'read'; st.run = 'none'; st.hot = 'cp';
      st.checks.push(['Where java looks (class path)', rc ? 'greet.jar, current folder (.)' : 'Current folder (.)']);
      st.checks.push(['Run', { v: 'Class App not found', cls: 'bad' }]);
      push('Even so, when you type the command ' + java + ', the JVM (java) looks for the class App on the class path. The places to look are ' + (rc ? 'greet.jar and the current folder (.)' : 'the current folder (.)') + ', but there is no App.class, so the error "Error: Could not find or load main class App" occurs and the program does not start. This error is the same whether or not you put greet.jar in the -cp of the java command.', 'bad');
      st.hot = ''; st.phase = '';
    } else {
      st.phase = 'read'; st.hot = 'cp';
      st.checks.push(['Where java looks (class path)', rc ? 'greet.jar, current folder (.)' : 'Current folder (.)']);
      push('When you type the command ' + java + ', the JVM (java) looks for the class App on the class path and starts main. ' + (rc
        ? 'The class path is "greet.jar;." The semicolon (;) is the character that separates several places on Windows (it is a colon, :, on macOS and Linux), and the dot (.) at the end is the current folder, that is, the place where App.class is. If you leave out the dot and write only -cp greet.jar, it does not look in the current folder and cannot find App.'
        : 'The class path is only the current folder (.), and App.class is in the current folder, so it finds App. greet.jar is not among the places to look.'), '');
      st.hot = 'app'; st.phase = 'search';
      push('To call Greeter.hello on the line System.out.println(Greeter.hello("kim")) inside main, the class Greeter is needed. The JVM looks for lib/Greeter.class on the class path.', '');
      if (rc) {
        st.phase = 'found'; st.hot = 'jar'; st.run = 'ok'; st.out = 'hello, kim'; st.printed = 1;
        st.checks.push(['Found lib/Greeter.class? (run)', { v: 'Found', cls: 'good' }]);
        st.checks.push(['Run', { v: 'Printed hello, kim', cls: 'good' }]);
        push('It finds lib/Greeter.class inside greet.jar and loads it. hello("kim") returns hello, kim, and println prints that text.', 'good');
      } else {
        st.phase = 'miss'; st.hot = 'cp'; st.run = 'fail'; st.out = 'NoClassDefFoundError';
        st.checks.push(['Found lib/Greeter.class? (run)', { v: 'Not found', cls: 'bad' }]);
        st.checks.push(['Run', { v: 'NoClassDefFoundError', cls: 'bad' }]);
        push('The only place to look is the current folder (.), and there is no lib/Greeter.class there. The JVM cannot load Greeter, so it raises the error NoClassDefFoundError (lib/Greeter), and the run ends with an error (exit code 1). The error occurred at App.java:6 in App.main, that is, the line that calls Greeter.hello, and nothing was printed. This is the error that occurs when Greeter existed at compile time but cannot be found at run time.', 'bad');
      }
      st.hot = '';
    }

    // Summary: the first line is the answer to this setting (the question)
    if (cc && rc) {
      sum.push('A library is a jar file that bundles classes that someone else has made. For my code to use a library class such as Greeter, the jar has to be on the class path both when compiling (javac -cp greet.jar) and when running (java -cp greet.jar;.). Both had it, so the compile succeeded and hello, kim was printed.');
      sum.push('The libraries that my project uses are called dependencies. In Gradle you write one line such as implementation("lib:greet:1.0") inside dependencies (this name is made up for explanation), and according to the Gradle documentation, a dependency declared with implementation goes into the class path for both compiling and running. This lab does not run Gradle, and shows by writing -cp by hand what Gradle does.');
    } else if (!cc) {
      sum.push('If the javac command that compiles does not have -cp greet.jar, the compiler cannot find Greeter and the compile fails (' + M.pkg + ', ' + M.sym + '). If the compile fails, there is no App.class, so it cannot run either.');
      sum.push(rc ? 'Having written greet.jar in the java command did not help. The jar is needed when compiling too, and being in the same folder does not put it on the class path.' : 'The java command that runs also had greet.jar removed, but that difference did not show. This is because it already stopped at the compile step. The problem of the jar missing at run time is met only after the compile passes.');
    } else {
      sum.push('If you compile with the jar but remove greet.jar from the java command that runs, the compile succeeds and the error NoClassDefFoundError occurs while running.');
      sum.push('A successful compile does not mean a successful run. The jar needed for compiling and the jar needed for running each have to be put on the class path, and what is missing at run time shows up only at the line where that class is first needed (App.java:6).');
    }
    var row = cc ? ['Success', rc ? 'Printed hello, kim' : 'Failed: nothing printed', rc ? 'None' : M.ncdfe] : ['2 errors', 'Cannot run (no App.class)', M.pkg + ', ' + M.sym];
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from compiling with the javac command.'); return; }
    H.table(v, ['What happened', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    H.counters(v, [[s.errs, 'Errors reported by the compiler'], [s.cls, 'App.class created'], [s.printed, 'Lines printed']]);
  },
  // Diagram: my code (App.java) on the left, the class path (a list of places to look) in the middle, and greet.jar on the right. If greet.jar is in the class path, the arrow reaches the jar, and if not, it cannot reach. Below are the compile result, the run result, and whether App.class exists.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    var stage = s ? s.stage : '', hot = s ? s.hot : '', ph = s ? s.phase : '';
    var inCp = stage === 'compile' ? c.compileCp : stage === 'run' ? c.runCp : false;
    P.box('app', 14, 16, 180, 110, { cls: hot === 'app' ? 'hot now' : 'plain', title: 'App.java', sub: ['My code', 'import lib.Greeter;', stage === 'compile' ? 'Compiling' : stage === 'run' ? (s.cls ? 'App.class running' : 'No App.class') : 'Before the run'] });
    var list = stage === 'compile' ? (c.compileCp ? ['greet.jar'] : ['Current folder (.) only']) : stage === 'run' ? (c.runCp ? ['greet.jar', 'Current folder (.)'] : ['Current folder (.) only']) : ['Set by the command'];
    P.box('cp', 244, 16, 190, 110, { cls: ph === 'miss' ? 'bad' : hot === 'cp' ? 'hot now' : stage ? 'plain' : 'ghost', title: 'Class path', sub: ['Where to look (-cp)'].concat(list) });
    P.box('jar', 484, 16, 182, 110, { cls: ph === 'found' ? 'good now' : stage && !inCp ? 'ghost' : 'plain', title: 'greet.jar', sub: ['lib/Greeter.class', !stage ? 'Made by someone else' : inCp ? 'In the class path' : 'Not in the class path'] });
    if (s && (ph === 'search' || ph === 'found' || ph === 'miss')) P.arrow('find', 'app:r:0.5', 'cp:l:0.5', { cls: ph === 'miss' ? 'bad' : 'hot' });
    if (s && ph === 'found') P.arrow('hit', 'cp:r:0.5', 'jar:l:0.5', { cls: 'good' });
    var cs = s ? s.compile : '', rs = s ? s.run : '';
    P.box('r1', 14, 144, 652, 40, { cls: cs === 'ok' ? 'good' : cs === 'err' ? 'bad' : 'ghost', title: 'Compile', right: cs === 'ok' ? 'Success' : cs === 'err' ? '2 errors' : '' });
    P.box('r2', 14, 192, 652, 40, { cls: rs === 'ok' ? 'good' : rs ? 'bad' : 'ghost', title: 'Run', right: rs === 'ok' ? 'hello, kim' : rs === 'fail' ? 'NoClassDefFoundError' : rs === 'none' ? 'Cannot run' : '' });
    P.box('r3', 14, 240, 652, 40, { cls: s && s.cls ? 'wait' : cs === 'err' ? 'bad' : 'ghost', title: 'App.class created', right: cs === 'err' ? 'None' : (s ? s.cls : 0) + '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21, java 21). All 4 combinations were checked. First, the class lib.Greeter (with one method, hello) was packed into greet.jar with javac and the jar tool (no external jar was downloaded), and for each combination, greet.jar and App.java were placed in a new folder and the terminal commands javac and java written on the screen were run exactly as written. The code on the screen is the same text that the probe made and kept from the actual file contents and the commands actually run. What was checked is whether the compile succeeded, the number of errors and the diagnostic codes (compiler.err.doesnt.exist and compiler.err.cant.resolve.location were rendered as the two error descriptions on the screen) and the lines where the errors occurred, whether App.class was created, the exit code and output of the java command, and the kind of the run error (NoClassDefFoundError) and its location (App.java:6). In the combinations where the compile failed, the java command was also actually run, and I confirmed that the error that the class App cannot be found occurs. The facts that the step sentences rely on were also checked by separate runs. These are that greet.jar contains lib/Greeter.class (jar tf), that the only class file created in the folder where the compile succeeded is App.class, that if you write only -cp greet.jar in the java command and leave out the dot (.), it cannot find App.class in the current folder, and that before the compile the folder had only App.java and greet.jar. The commands were run on Windows 11, and the semicolon (;) as the class path separator is for Windows (a colon on macOS and Linux). The screen shows only that one form. The CLASSPATH environment variable was cleared in the process that ran them, and in an environment where this variable is set, the result of a command without -cp can differ. The error sentence of the java launcher is shown in English; it was obtained by running the java command again with -Duser.language=en. On the PC used to write this lab (Korean Windows), without that option the sentence came out in Korean, and with other language settings the sentence is different. I opened the documentation and checked it. These are, in the javac tool documentation from Oracle (https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html), that --class-path (-cp) sets where to look for user class files, that the current folder is used if neither -cp nor the CLASSPATH environment variable is set, and that the separator is a semicolon on Windows; in the java tool documentation (https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html; I read only the first 100,000 characters, and the explanation of -cp was within them), that -cp is a list of directories, JAR files, and ZIP files in which to look for class files, and that if it is not specified, it is the current folder (.); in the NoClassDefFoundError API documentation (https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/NoClassDefFoundError.html), that it is thrown when a class definition is to be loaded and cannot be found, and that it is the case where a definition that existed at compile time can no longer be found; in the Gradle documentation Declaring dependencies (https://docs.gradle.org/current/userguide/declaring_dependencies_basics.html), that a module dependency is written as group:name:version coordinates, with an example of writing it with implementation inside dependencies; and in the Java Plugin documentation (https://docs.gradle.org/current/userguide/java_plugin.html), in the table of configurations, that implementation is a dependency needed both at compile time and at run time and is included in compileClasspath and runtimeClasspath. Gradle was not run, and the process of downloading jars from a repository could not be checked in the documentation either, so it is not described. The number and kinds of errors and the error sentences are not set by a specification but were observed on this JDK. Beyond that, a library pulling in other libraries (transitive dependencies), versions, the order when the same class is in several places on the class path, and the module system are not covered. Dependencies and the supply chain are covered in the in-depth lab "Dependencies and the supply chain", and Spring Boot, which looks at the dependencies and creates the configuration automatically, is covered in the in-depth lab "Spring Boot auto-configuration".',
});
