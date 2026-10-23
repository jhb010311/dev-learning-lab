Lab.register({
  id: 'dep_basic', nav: 'Libraries and dependencies', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['supplychain', 'autoconf'],
  title: 'What is a library, and what happens when it is missing?',
  why: 'Writing common tasks such as turning JSON text into objects or running tests from scratch in every project takes time and also causes mistakes. A library provides the classes that do these tasks as a jar file, which you take in and use with import. The troublesome work of downloading jars by hand and writing them in -cp, and of also taking care of the jars that the library itself uses, is handled by a build tool such as Gradle or Maven.',
  use: 'You see this when you write the coordinates of a library (group:name:version) with one implementation line in the dependencies section of build.gradle in a Spring Boot project. Gradle also downloads the libraries that the library itself uses and puts them on the class path. What is needed only for tests is written as testImplementation, so that it does not go onto the class path used when the program runs. If a NoClassDefFoundError occurs while the program runs, first check whether the jar that has that class is on the class path used when running.',
  intro: 'A library is a set of classes that someone else has made, and you usually take it as a jar file (a file that bundles compiled class files into one). In this lab, App.java turns a Map into JSON text with the ObjectMapper class of a real library called Jackson. ObjectMapper is not a class that I made and not a class provided by Java (the JDK); it is a class that a jar file called jackson-databind has. So the javac that compiles and the java that runs have to find that jar on the class path (a list of places to look for class files, written after -cp in the command). Also, jackson-databind uses other jars called jackson-core and jackson-annotations, so those two jars, which do not appear in my code, have to be there too. In this lab you take the Jackson jars out of the -cp of the two commands one at a time, and the real compile and run happen, to show which error occurs at which step. In a real project, when you write one implementation line in build.gradle, Gradle downloads these jars and puts them on the class path (Gradle is not run in this lab; it was checked against the documentation).',
  terms: ['Libraries and JAR files', 'Jackson and ObjectMapper', 'Class path (-cp)', 'NoClassDefFoundError', 'Dependencies and implementation', 'Transitive dependency'],
  controls: [
    { id: 'compileCp', label: 'The jars written in the -cp of the javac command that compiles', type: 'select', value: 'all', options: [['all', 'All three Jackson jars'], ['nocore', 'Two jars, without jackson-core'], ['none', 'None written (no -cp)']] },
    { id: 'runCp', label: 'The jars written in the -cp of the java command that runs', type: 'select', value: 'all', options: [['all', 'All three Jackson jars'], ['nocore', 'Two jars, without jackson-core'], ['none', 'None written (current folder only)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'How is code that uses ObjectMapper of the Jackson library compiled and run?', d: 'The -cp of both the compile command and the run command has all three Jackson jars. The compile succeeds and {"name":"kim"} is printed.', v: { compileCp: 'all', runCp: 'all' } },
    { t: 'Removing all jars when compiling', q: 'What if you remove -cp from the javac command that compiles?', d: 'The compiler cannot find the package tools.jackson.databind or ObjectMapper, and the compile fails with 3 errors.', v: { compileCp: 'none', runCp: 'all' } },
    { t: 'Removing all jars when running', q: 'What if you leave the compile as it is and remove all the Jackson jars from the -cp of the java command that runs?', d: 'The compile succeeds, but while running, a NoClassDefFoundError occurs at the line new ObjectMapper().', v: { compileCp: 'all', runCp: 'none' } },
    { t: 'Removing only jackson-core when running', q: 'What if you remove only jackson-core, which does not appear in my code, and only when running?', d: 'ObjectMapper uses TreeCodec of jackson-core, so a NoClassDefFoundError (tools/jackson/core/TreeCodec) occurs while running.', v: { compileCp: 'all', runCp: 'nocore' } },
    { t: 'Removing only jackson-core when compiling', q: 'What if you remove only jackson-core from the -cp of the javac command that compiles?', d: 'The compiler cannot find TreeCodec either, and the compile fails with 1 error at the writeValueAsString line.', v: { compileCp: 'nocore', runCp: 'all' } },
  ],
  // Words used in the table on the right of the screen and in the diagram. The comparison script (verify/plain/cmp_dep_basic.js) converts the javac diagnostic codes into these words.
  msgs: { pkg: 'No package tools.jackson.databind', sym: 'ObjectMapper cannot be found', access: 'TreeCodec cannot be accessed (no jackson-core)', ncdfeCore: 'NoClassDefFoundError(tools/jackson/core/TreeCodec)', ncdfeMapper: 'NoClassDefFoundError(tools/jackson/databind/ObjectMapper)' },
  jarNames: { all: 'jackson-databind-3.1.5.jar;jackson-core-3.1.5.jar;jackson-annotations-2.21.jar', nocore: 'jackson-databind-3.1.5.jar;jackson-annotations-2.21.jar' },
  // The code on the screen is the same text as the files that the comparison program (verify/plain/DepBasicProbe.java) actually used and the commands it ran (the comparison script compares them down to the letter).
  code: function (c) {
    var J = this.jarNames;
    var javac = 'javac ' + (c.compileCp === 'none' ? '' : '-cp ' + J[c.compileCp] + ' ') + 'App.java';
    var java = 'java -cp ' + (c.runCp === 'none' ? '.' : J[c.runCp] + ';.') + ' App';
    return ['# App.java',
      'import java.util.Map;',
      'import tools.jackson.databind.ObjectMapper; // A class provided by the Jackson library (jackson-databind)',
      '',
      'public class App {',
      '    public static void main(String[] args) {',
      '        ObjectMapper mapper = new ObjectMapper();',
      '        String json = mapper.writeValueAsString(Map.of("name", "kim")); // Turns the Map into JSON text',
      '        System.out.println(json);',
      '    }',
      '}',
      '',
      '# Terminal (in the folder where the three Jackson jars were downloaded)', javac, java,
      '',
      '# build.gradle (if you use Gradle, this one line does the job of downloading the jars and writing them in -cp)',
      'dependencies {',
      "    implementation 'tools.jackson.core:jackson-databind:3.1.5'",
      '}'].join('\n');
  },
  label: function (c) { var n = { all: '3 jars', nocore: 'jackson-core left out', none: 'no jars' }; return 'javac: ' + n[c.compileCp] + ' · java: ' + n[c.runCp]; },
  columns: ['Compile', 'Run', 'Error'],
  simulate: function (c) {
    var ev = [], sum = [], cc = c.compileCp, rc = c.runCp, M = this.msgs, J = this.jarNames;
    var javac = 'javac ' + (cc === 'none' ? '' : '-cp ' + J[cc] + ' ') + 'App.java', java = 'java -cp ' + (rc === 'none' ? '.' : J[rc] + ';.') + ' App';
    var st = { hot: '', stage: '', phase: '', need: '', found: [], compile: '', cls: 0, errs: 0, run: '', out: '', printed: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function cpWords(k) { return k === 'all' ? 'jackson-databind, jackson-core, jackson-annotations' : k === 'nocore' ? 'jackson-databind, jackson-annotations' : ''; }

    // Compile
    st.hot = 'app';
    st.checks.push(['Compile command', javac]);
    push('When you type the javac command in the terminal, the compiler (javac) reads App.java. java.util.Map on the first line is a class provided by Java (the JDK), so it is found without writing anything more. The second line, import tools.jackson.databind.ObjectMapper;, is different. ObjectMapper is not a class of the JDK but a class provided by a library called Jackson, and a jar file called jackson-databind-3.1.5.jar has tools/jackson/databind/ObjectMapper.class.', '');
    st.stage = 'compile'; st.phase = 'search'; st.need = 'mapper'; st.hot = 'cp';
    st.checks.push(['Where javac looks (class path)', cc === 'none' ? 'Current folder only' : cpWords(cc)]);
    var intro = 'The compiler has to know what kind of class ObjectMapper is before it can compile, so it looks for ObjectMapper.class on the class path. The class path is a list of places to look for class files, and you write it after -cp in the command (on Windows, the places are separated by a semicolon (;)). ';
    push(intro + (cc === 'all'
      ? 'This command wrote three Jackson jars, so the places to look are jackson-databind, jackson-core, and jackson-annotations.'
      : cc === 'nocore'
        ? 'This command wrote only jackson-databind and jackson-annotations, and left out jackson-core. The name jackson-core does not appear anywhere in my code.'
        : 'This command has no -cp, so the only place to look is the current folder (when there is no CLASSPATH environment variable either). The three Jackson jars are in the current folder, but a jar that is not written in -cp is not among the places to look.'), '');
    if (cc === 'none') {
      st.phase = 'miss'; st.errs = 3;
      st.checks.push(['Found ObjectMapper.class? (compile)', { v: 'Not found', cls: 'bad' }]);
      push('There is no ObjectMapper.class in the place to look (the current folder), so the compiler cannot know ObjectMapper. There are 3 errors. One is "package tools.jackson.databind does not exist" (' + M.pkg + ') for the import statement on the second line, and the other two are "cannot find symbol" (' + M.sym + '), one for each of the two places where ObjectMapper appears on the line ObjectMapper mapper = new ObjectMapper();.', 'bad');
    } else {
      st.phase = 'found'; st.found = ['d']; st.hot = 'd';
      st.checks.push(['Found ObjectMapper.class? (compile)', { v: 'Found in jackson-databind', cls: 'good' }]);
      push('It found ObjectMapper.class in the jackson-databind jar. But the declaration of ObjectMapper has the name TreeCodec of jackson-core written in it (public class ObjectMapper implements TreeCodec<JsonNode>, …). So to check the line mapper.writeValueAsString(…), the compiler has to find TreeCodec.class too.', 'good');
      st.need = 'core'; st.hot = 'c';
      if (cc === 'all') {
        st.found = ['d', 'c'];
        st.checks.push(['Found TreeCodec.class? (compile)', { v: 'Found in jackson-core', cls: 'good' }]);
        push('It found TreeCodec.class in the jackson-core jar. The compiler now knows all the classes it needs.', 'good');
      } else {
        st.phase = 'miss'; st.errs = 1;
        st.checks.push(['Found TreeCodec.class? (compile)', { v: 'Not found', cls: 'bad' }]);
        push('There is no jackson-core in the places to look, so it cannot find TreeCodec.class. One "cannot access TreeCodec" (' + M.access + ') error occurs at the writeValueAsString line, and javac adds "class file for tools.jackson.core.TreeCodec not found". Even though jackson-core does not appear in my code, it is needed because the jackson-databind that I use uses it.', 'bad');
      }
    }
    if (cc === 'all') {
      st.compile = 'ok'; st.cls = 1; st.hot = ''; st.phase = ''; st.need = '';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('The compile succeeds and App.class is created. The only new class file in the folder is App.class. The class files of Jackson were not copied into App.class, so when running, the JVM has to find them again in the jars.', 'good');
    } else {
      st.compile = 'err'; st.hot = ''; st.phase = ''; st.need = '';
      st.checks.push(['Compile', { v: st.errs + (st.errs === 1 ? ' error' : ' errors'), cls: 'bad' }]);
      push('The compile failed. App.class was not created.', 'bad');
    }

    // Run
    st.stage = 'run'; st.hot = 'app'; st.found = []; st.checks.push(['Run command', java]);
    st.checks.push(['Where java looks (class path)', rc === 'none' ? 'Current folder (.)' : cpWords(rc) + ', current folder (.)']);
    if (cc !== 'all') {
      st.phase = 'read'; st.run = 'none'; st.hot = 'cp';
      st.checks.push(['Run', { v: 'Class App not found', cls: 'bad' }]);
      push('Even so, when you type the java command, the JVM (java) looks for the class App on the class path. There is no App.class, so the error that the main class App cannot be found or loaded occurs, and the program does not start. This error is the same whatever you wrote in the -cp of the java command.', 'bad');
      st.hot = ''; st.phase = '';
    } else {
      st.phase = 'read'; st.hot = 'cp';
      push('When you type the java command, the JVM (java) looks for the class App on the class path and starts main. The dot (.) at the end is the current folder, that is, the place where App.class is. The -cp that you wrote for javac does not carry over to the java command, so the jars to use when running have to be written again in this command. ' + (rc === 'all'
        ? 'This command wrote three Jackson jars and the dot (.).'
        : rc === 'nocore' ? 'This command left out jackson-core and wrote jackson-databind, jackson-annotations, and the dot (.).' : 'This command wrote only the dot (.), so the Jackson jars are not among the places to look.'), '');
      st.hot = 'app'; st.phase = 'search'; st.need = 'mapper';
      push('The class ObjectMapper is first needed at the first line of main, new ObjectMapper(). The JVM looks for ObjectMapper.class on the class path.', '');
      if (rc === 'none') {
        st.phase = 'miss'; st.hot = 'cp'; st.run = 'fail';
        st.checks.push(['Found ObjectMapper.class? (run)', { v: 'Not found', cls: 'bad' }]);
        st.checks.push(['Run', { v: 'NoClassDefFoundError', cls: 'bad' }]);
        push('The only place to look is the current folder (.), and there is no ObjectMapper.class there. The JVM cannot load ObjectMapper, so it raises the error ' + M.ncdfeMapper + ', and the run ends with an error (exit code 1). The error occurred at App.java:6, that is, the line new ObjectMapper(), and nothing was printed. This is the error that occurs when a class existed at compile time but cannot be found at run time.', 'bad');
      } else {
        st.phase = 'found'; st.found = ['d']; st.hot = 'd';
        push('It found ObjectMapper.class in the jackson-databind jar. To load this class, TreeCodec of jackson-core, which is written in its declaration, is needed too, so the JVM looks for TreeCodec.class.', 'good');
        st.need = 'core'; st.hot = 'c';
        if (rc === 'nocore') {
          st.phase = 'miss'; st.run = 'fail';
          st.checks.push(['Found TreeCodec.class? (run)', { v: 'Not found', cls: 'bad' }]);
          st.checks.push(['Run', { v: 'NoClassDefFoundError', cls: 'bad' }]);
          push('There is no jackson-core in the places to look, so it cannot find TreeCodec.class. The JVM raises the error ' + M.ncdfeCore + ', and the run ends with an error (exit code 1). The error occurred again at the line new ObjectMapper() of App.java:6, and nothing was printed. A jar that my code does not use directly must also be there at run time if a library that I use uses it.', 'bad');
        } else {
          st.found = ['d', 'c', 'a']; st.hot = ''; st.run = 'ok'; st.out = '{"name":"kim"}'; st.printed = 1; st.phase = 'found';
          st.checks.push(['Found the classes that ObjectMapper uses? (run)', { v: 'Found in jackson-core and jackson-annotations', cls: 'good' }]);
          st.checks.push(['Run', { v: 'Printed {"name":"kim"}', cls: 'good' }]);
          push('It finds TreeCodec.class in jackson-core, and the annotation classes that ObjectMapper uses in jackson-annotations, and loads them. writeValueAsString turns Map.of("name", "kim") into the JSON text {"name":"kim"} and returns it, and println prints that text.', 'good');
          st.hot = 'gradle'; st.phase = ''; st.need = '';
          push('The one line implementation \'tools.jackson.core:jackson-databind:3.1.5\' in build.gradle at the bottom of the screen is a way to hand the work done by hand so far to Gradle, a build tool. These coordinates (group:name:version) are the same as those written in the pom.xml bundled in the jackson-databind jar, and that pom.xml lists jackson-core and jackson-annotations as the libraries that jackson-databind uses. According to the Gradle documentation, a dependency declared with implementation goes into both the class path for compiling (compileClasspath) and the class path for running (runtimeClasspath), and Gradle reads such information files and also finds the libraries that a library uses (transitive dependencies) and puts them in together. This lab did not run Gradle with Jackson.', '');
        }
      }
      st.hot = '';
    }

    // Summary: the first line is the answer to this setting (the question)
    if (cc === 'all' && rc === 'all') {
      sum.push('A library such as Jackson is a set of classes that someone else has made, handed out as jar files. For my code to use ObjectMapper, those jars have to be on the class path both when compiling (javac -cp) and when running (java -cp). Both had them, so the compile succeeded and {"name":"kim"} was printed.');
      sum.push('The only thing my code uses directly is ObjectMapper of jackson-databind, but jackson-databind uses jackson-core and jackson-annotations, so all three jars were needed (transitive dependencies). In a real project, when you write one implementation line in build.gradle, Gradle downloads these jars and puts them on the class path, so you rarely write -cp by hand.');
      sum.push('A library is, in the end, a jar file like these. A class that we made as an example, such as lib.Greeter, can be used in the same way if you compile it with javac, bundle it with the jar tool like greet.jar, and write it in -cp.');
    } else if (cc === 'none') {
      sum.push('If the javac command that compiles does not have the Jackson jars, the compiler cannot find ObjectMapper and the compile fails (' + M.pkg + ', ' + M.sym + '). If the compile fails, there is no App.class, so it cannot run either.');
      sum.push(rc === 'none' ? 'The java command that runs also had the jars removed, but that difference did not show. This is because it already stopped at the compile step.' : 'Having written the jars in the java command did not help. The jars are needed when compiling too, and being in the same folder does not put them on the class path.');
    } else if (cc === 'nocore') {
      sum.push('If you leave out only jackson-core from the javac command that compiles, the compile fails (' + M.access + '). The declaration of ObjectMapper has TreeCodec of jackson-core written in it, so the compiler has to find that too in order to check the writeValueAsString line.');
      sum.push('A jar that does not appear in my code is needed if a library that I use uses it (transitive dependency). If you write only implementation \'tools.jackson.core:jackson-databind:3.1.5\' in Gradle, Gradle also downloads and puts in the jackson-core and jackson-annotations that are written in the pom.xml of jackson-databind (Gradle documentation).');
    } else if (rc === 'none') {
      sum.push('If you compile with the Jackson jars but remove the jars from the java command that runs, the compile succeeds and the error ' + M.ncdfeMapper + ' occurs while running.');
      sum.push('A successful compile does not mean a successful run. javac and java receive the class path separately, so the jars needed for running have to be written separately too, and what is missing shows up only at the line where that class is first needed (App.java:6).');
    } else {
      sum.push('If you leave out only jackson-core from the java command that runs, then even though the compile succeeded, the error ' + M.ncdfeCore + ' occurs while running. This is because TreeCodec of jackson-core is needed to load ObjectMapper.');
      sum.push('jackson-core, which my code does not use directly, must also be there at run time (transitive dependency). If you write one implementation line in Gradle, Gradle reads the pom.xml of jackson-databind and also puts in jackson-core and jackson-annotations, so this kind of omission does not happen (Gradle documentation).');
    }
    var row;
    if (cc === 'all') row = ['Success', rc === 'all' ? 'Printed {"name":"kim"}' : 'Failed: nothing printed', rc === 'all' ? 'None' : rc === 'nocore' ? M.ncdfeCore : M.ncdfeMapper];
    else if (cc === 'nocore') row = ['1 error', 'Cannot run (no App.class)', M.access];
    else row = ['3 errors', 'Cannot run (no App.class)', M.pkg + ', ' + M.sym + ' (2 places)'];
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from compiling with the javac command.'); return; }
    H.table(v, ['What happened', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    H.counters(v, [[s.errs, 'Errors reported by the compiler'], [s.cls, 'App.class created'], [s.printed, 'Lines printed']]);
  },
  // Diagram: my code (App.java) on the left, the class path (a list of places to look) in the middle, and the three Jackson jars (jackson-databind, jackson-core, jackson-annotations) on the right. When it finds the jar that has the class it is looking for, an arrow goes from the class path to that jar, and a jar that is not in the class path stays faded. Below are one line of build.gradle, the compile result, the run result, and whether App.class exists.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    var stage = s ? s.stage : '', hot = s ? s.hot : '', ph = s ? s.phase : '', need = s ? s.need : '', found = s ? s.found : [];
    var k = stage === 'compile' ? c.compileCp : stage === 'run' ? c.runCp : '';
    function inCp(j) { return k === 'all' || (k === 'nocore' && j !== 'c'); }
    P.box('app', 14, 16, 180, 150, { cls: hot === 'app' ? 'hot now' : 'plain', title: 'App.java', sub: ['My code', 'Uses ObjectMapper', need === 'mapper' ? 'Needs: ObjectMapper' : need === 'core' ? 'Needs: TreeCodec' : '', stage === 'compile' ? 'Compiling' : stage === 'run' ? (s.cls ? 'Running App.class' : 'No App.class') : 'Before the run'] });
    var list = !stage ? ['Set by the command'] : k === 'none' ? (stage === 'run' ? ['Current folder (.)'] : ['Current folder only']) : (k === 'all' ? ['jackson-databind', 'jackson-core', 'jackson-annotations'] : ['jackson-databind', 'jackson-annotations']).concat(stage === 'run' ? ['Current folder (.)'] : []);
    P.box('cp', 224, 16, 190, 150, { cls: ph === 'miss' ? 'bad' : hot === 'cp' ? 'hot now' : stage ? 'plain' : 'ghost', title: 'Class path', sub: ['Where to look (-cp)'].concat(list) });
    var jars = [['d', 'jackson-databind', 'ObjectMapper.class', 16], ['c', 'jackson-core', 'TreeCodec.class', 66], ['a', 'jackson-annotations', 'Annotation classes', 116]];
    jars.forEach(function (j) {
      var on = found.indexOf(j[0]) >= 0, missing = ph === 'miss' && ((need === 'mapper' && j[0] === 'd') || (need === 'core' && j[0] === 'c'));
      P.box(j[0], 444, j[3], 222, 44, { cls: on ? (hot === j[0] ? 'good now' : 'good') : missing ? 'bad' : stage && !inCp(j[0]) ? 'ghost' : 'plain', title: j[1], sub: [!stage ? j[2] : inCp(j[0]) ? j[2] : 'Not in the class path'] });
    });
    if (s && (ph === 'search' || ph === 'found' || ph === 'miss')) P.arrow('find', 'app:r:0.5', 'cp:l:0.5', { cls: ph === 'miss' ? 'bad' : 'hot' });
    found.forEach(function (j) { P.arrow('hit' + j, 'cp:r:0.5', j + ':l:0.5', { cls: 'good' }); });
    P.box('gradle', 14, 176, 652, 30, { cls: hot === 'gradle' ? 'hot now' : 'ghost', title: 'build.gradle', right: "implementation 'tools.jackson.core:jackson-databind:3.1.5'" });
    var cs = s ? s.compile : '', rs = s ? s.run : '';
    P.box('r1', 14, 214, 652, 36, { cls: cs === 'ok' ? 'good' : cs === 'err' ? 'bad' : 'ghost', title: 'Compile', right: cs === 'ok' ? 'Success' : cs === 'err' ? s.errs + (s.errs === 1 ? ' error' : ' errors') : '' });
    P.box('r2', 14, 256, 652, 36, { cls: rs === 'ok' ? 'good' : rs ? 'bad' : 'ghost', title: 'Run', right: rs === 'ok' ? s.out : rs === 'fail' ? 'NoClassDefFoundError' : rs === 'none' ? 'Cannot run' : '' });
    P.box('r3', 14, 298, 652, 36, { cls: s && s.cls ? 'wait' : cs === 'err' ? 'bad' : 'ghost', title: 'App.class created', right: cs === 'err' ? 'None' : (s ? s.cls : 0) + '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21, java 21), and the library was the three Jackson jars that had already been downloaded (jackson-databind 3.1.5, jackson-core 3.1.5, jackson-annotations 2.21) (nothing was newly downloaded). From Jackson 3 on, the package names start with tools.jackson (Jackson 2 used com.fasterxml.jackson), and only jackson-annotations keeps using the package com.fasterxml.jackson.annotation. The coordinates tools.jackson.core:jackson-databind:3.1.5 on the screen were read from the pom.xml bundled in the jackson-databind jar. All 9 combinations (3 kinds of -cp for javac and 3 kinds of -cp for java) were checked. For each combination, the three jars and App.java were placed in a new folder and the terminal commands javac and java written on the screen were run exactly as written, and the code on the screen is the same, down to the letter, as the text that the comparison program made and kept from the actual file contents and the commands actually run. What was checked is whether the compile succeeded, the number of errors and the diagnostic codes (compiler.err.doesnt.exist, compiler.err.cant.resolve.location, and compiler.err.cant.access were rendered as the error descriptions on the screen) and the lines where the errors occurred, whether App.class was created, the exit code and output of the java command, the kind of the run error and the class it concerns, and its location (App.java:6). In the combinations where the compile failed, the java command was also actually run, and I confirmed that the error that the class App cannot be found occurs. The facts that the step sentences rely on were also checked by separate runs. These are that each jar has ObjectMapper.class, TreeCodec.class, and JsonSerializeAs.class (jar tf), that the declaration of ObjectMapper implements tools.jackson.core.TreeCodec (javap), that the pom.xml of jackson-databind lists jackson-annotations and jackson-core as dependencies that are not in the test scope, that the only class file created in the folder where the compile succeeded is App.class, and that if you write only the jars when running and leave out the dot (.), it cannot find App. I also checked separately that when only jackson-annotations is removed at run time, a NoClassDefFoundError (com/fasterxml/jackson/annotation/JsonSerializeAs) occurs at App.java:6, and the sentence "the annotation classes are loaded from jackson-annotations" on the screen relies on this result. For the greet.jar in the last sentence of the summary, I bundled lib.Greeter, a class made as an example, with javac and the jar tool, compiled with -cp greet.jar and ran with -cp greet.jar;., and confirmed that hello, kim is printed. The commands were run on Windows 11, and the semicolon (;) as the class path separator is for Windows (a colon on macOS and Linux). The CLASSPATH environment variable was cleared in the process that ran them, and in an environment where this variable is set, the result of a command without -cp can differ. The error sentences of the java launcher followed the language setting of Windows used for the check run (Korean), and the number and kinds of errors and the error sentences are not set by a specification but were observed on this JDK and this Jackson version. I opened the documentation and checked it. These are, in the javac tool documentation from Oracle (https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html) and the java tool documentation (https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html), that -cp is a list of directories and JAR files in which to look for class files and that if it is not specified, it is the current folder; and in the NoClassDefFoundError API documentation (https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/NoClassDefFoundError.html), that it is thrown when a class definition that existed at compile time cannot be found at run time. For Gradle, I followed the Java Plugin documentation (https://docs.gradle.org/current/userguide/java_plugin.html) for that implementation is a dependency needed both for compiling and for running, and that compileClasspath and runtimeClasspath include implementation; the Graph Resolution documentation (https://docs.gradle.org/current/userguide/graph_resolution.html) for that Gradle reads the metadata of a module (such as the POM), adds its dependencies to the graph, and that this process puts the correct transitive dependencies into the build; and the Dependency Management basics documentation (https://docs.gradle.org/current/userguide/dependency_management_basics.html) for that Gradle downloads, caches, and unpacks dependencies. Gradle was not run with Jackson. This is because Jackson is not in the Gradle cache of this computer and nothing was downloaded. Instead, I ran Gradle 8.14.3 offline with Gson 2.11.0, which was in the cache, and confirmed that although only one implementation line was written, error_prone_annotations, which Gson uses, also appears in the dependency lists of compileClasspath and runtimeClasspath (that jar file was not in the cache, so I could not unpack it as far as the actual jar list). So which Gradle class paths jackson-core and jackson-annotations go into was not directly confirmed with Jackson but relies on the documentation and this check. Version conflicts, the order when the same class is in several places on the class path, and the module system are not covered. Dependencies and the supply chain are covered in the in-depth lab "Dependencies and the supply chain", and Spring Boot, which looks at the dependencies and creates the configuration automatically, is covered in the in-depth lab "Spring Boot auto-configuration".',
});
