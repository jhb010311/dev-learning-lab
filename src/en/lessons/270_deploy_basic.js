Lab.register({
  id: 'deploy_basic', nav: 'Deployment', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['deploy', 'cicd', 'k8s'],
  title: 'When does a running server change after you edit the code?',
  why: 'A Java server does not run source files as they are. It compiles the source files into a jar file, and the process that ran that jar with java -jar answers requests. So even after you edit the code, building a new jar and stopping and starting the server are still left to do. If you do these by hand each time, it is easy to forget one or for the order to differ from person to person, and it also becomes unclear which version is running on the server now. If the deployment steps are decided in advance and followed exactly, the new version is put on the server in the same order every time, so forgotten steps decrease, and you can tell which version has been running since when.',
  use: 'Deployment happens each time a new feature is released or a bug is fixed. A Spring Boot project usually builds a jar file with ./gradlew bootJar (./mvnw package for Maven) and runs it on the server with java -jar. These days it is common to set things up so that when code is pushed to a repository, a tool such as GitHub Actions or Jenkins goes on through the build and the tests to putting it on the server. If there are several servers, they are replaced one at a time, so that other servers keep receiving requests while one is restarted.',
  intro: 'A Spring Boot server does not run source files (.java) as they are. It compiles the source files into .class files, bundles them into one jar file, and runs that jar file with the java -jar command. When it runs, one process (a running program) is created, and when this process starts, it reads in the classes from the jar file and answers requests with that code. So the code is in three separate places: the source file that a person edits, the jar file made by the build, and the running server process. Even if you edit the source file, the jar file does not change by itself, and even if you build a new jar file, the process that is already running does not change. Compiling and building the jar file is done by the ./gradlew bootJar command (the bootJar task provided by the Spring Boot Gradle plugin), and only after you stop the running server and start it again with java -jar does the new code answer requests. Making a new version really run like this is called deployment. The first part of the code box is two Java files, and the second part is what is done in the terminal (lines that start with # are numbered to-do items, and the lines under them are the commands you type in the terminal). In this lab you change "Version 1" to "Version 2" in HelloController, a class we made as an example, then remove or reorder building a new jar file and stopping and starting the server, and you see which version answers the request.',
  terms: ['Deployment', 'Server restart', 'Executable JAR', './gradlew bootJar', 'Programs and processes', 'Connection refused error'],
  controls: [
    { id: 'edit', label: 'Change "Version 1" to "Version 2" in HelloController.java', type: 'check', value: true },
    { id: 'build', label: 'After editing, build a new jar file with ./gradlew bootJar', type: 'check', value: true },
    { id: 'restart', label: 'Stop the running server and start it again with java -jar', type: 'check', value: true },
    { id: 'when', label: 'When to send the request', type: 'select', value: 'after', show: function (c) { return c.restart; }, options: [['after', 'After the server is started again'], ['during', 'After the server is stopped and before it is started again']] },
  ],
  // Without the step that starts the server again, you cannot choose when to send the request, so go back to the first value
  fix: function (c) { if (!c.restart && c.when !== 'after') return { when: 'after' }; },
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'If you edit the source, build a new jar with ./gradlew bootJar, and then stop the server and start it again with java -jar, which version answers the request?', d: 'A new jar file is built from the edited source, the running server is stopped, and it is started again with the new jar. The new process answers "Version 2".', v: { edit: true, build: true, restart: true, when: 'after' } },
    { t: 'Only the source file is edited', q: 'What if you only edit and save HelloController.java, without building a new jar and leaving the server as it is?', d: 'Only the source file says "Version 2", and the jar file and the running server stay as they are. The server answers "Version 1".', v: { edit: true, build: false, restart: false, when: 'after' } },
    { t: 'Only the jar is built and the server is not stopped', q: 'What if you build a new jar file with ./gradlew bootJar but do not stop the running server?', d: 'The jar file becomes "Version 2", but the running process keeps answering "Version 1" with the code it read in when it started.', v: { edit: true, build: true, restart: false, when: 'after' } },
    { t: 'Starting again without building a new jar', q: 'What if you edit the source and stop and start the server, but skip ./gradlew bootJar?', d: 'The process that was started again reads the old jar file. The source file says "Version 2", but "Version 1" answers.', v: { edit: true, build: false, restart: true, when: 'after' } },
    { t: 'Requesting between stopping and starting', q: 'What if a request arrives after the server is stopped and before it is started again?', d: 'No process accepts connections at that port, so the request fails with a connection refused error. A request that arrives after the server is started again gets "Version 2".', v: { edit: true, build: true, restart: true, when: 'during' } },
    { t: 'Building and starting without editing', q: 'What if you do not edit the source, and only build the jar again and start the server again?', d: 'It only builds the same jar from the same source and starts again with the same code, so "Version 1" answers.', v: { edit: false, build: true, restart: true, when: 'after' } },
  ],
  // The code on the screen. The comparison program (verify/net/deploy_basic_probe_jdk.js) uses the text that this function makes as it is.
  // The two Java files are written out as files and compiled as they are, and the to-do items and commands under the line "# What you do in the terminal" are really done line by line.
  code: function (c) {
    var o = [
      '// File: src/main/java/com/example/demo/DemoApplication.java',
      '// DemoApplication and HelloController are classes made as examples for this lab',
      '// @SpringBootApplication, SpringApplication, @RestController, and @GetMapping are provided by Spring Boot and Spring',
      'package com.example.demo;',
      '',
      'import org.springframework.boot.SpringApplication;',
      'import org.springframework.boot.autoconfigure.SpringBootApplication;',
      '',
      '@SpringBootApplication',
      'public class DemoApplication {',
      '    // When the jar file is run with java -jar, this main is called, and Spring Boot starts the web server',
      '    public static void main(String[] args) {',
      '        SpringApplication.run(DemoApplication.class, args);',
      '    }',
      '}',
      '',
      '// File: src/main/java/com/example/demo/HelloController.java',
      'package com.example.demo;',
      '',
      'import org.springframework.web.bind.annotation.GetMapping;',
      'import org.springframework.web.bind.annotation.RestController;',
      '',
      '@RestController',
      'public class HelloController {',
      '    // When a GET /hello request arrives, Spring calls this method, and the text it returns becomes the response',
      '    @GetMapping("/hello")',
      '    public String hello() {',
      c.edit ? '        return "Version 1"; // Changed to "Version 2" in step 2 below' : '        return "Version 1";',
      '    }',
      '}',
      '',
      '# What you do in the terminal (in the project folder; the jar name is shortened to app.jar)',
    ];
    var n = 0;
    function step(s) { n++; o.push('# ' + n + '. ' + s); }
    step('Build the jar file and start the server with that jar');
    o.push('./gradlew bootJar', 'java -jar build/libs/app.jar');
    if (c.edit) step('Change "Version 1" to "Version 2" in HelloController.java and save it');
    if (c.build) { step('Build the jar file again (with the server left running)'); o.push('./gradlew bootJar'); }
    var req = function () { step('Send a request from another terminal'); o.push('curl http://localhost:8080/hello'); };
    if (c.restart) {
      step('Stop the running server (Ctrl+C in the terminal where you started it)');
      if (c.when === 'during') req();
      step(c.build ? 'Start it again with the newly built jar' : 'Start it again, leaving the jar file as it is');
      o.push('java -jar build/libs/app.jar');
      if (c.when !== 'during') req();
    } else req();
    return o.join('\n');
  },
  label: function (c) {
    return (c.edit ? 'Source edited' : 'Source not edited') + ' · ' + (c.build ? 'New jar built' : 'No new jar built') + ' · ' + (!c.restart ? 'Server not started again' : c.when === 'during' ? 'Request while the server is stopped' : 'Request after the server is stopped and started');
  },
  columns: ['Response', 'Code in the running server', 'Code in the jar file', 'Code in the source file'],
  simulate: function (c) {
    var edit = !!c.edit, build = !!c.build, rs = !!c.restart, during = rs && c.when === 'during';
    var V1 = 'Version 1', V2 = 'Version 2';
    var ev = [], sum = [], n = 0;
    var st = { proc: 'none', mem: '', jar: '', src: V1, starts: 0, builds: 0, req: '', ans: '', rd: false, bd: false, ed: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function q(v) { return '"' + v + '"'; }
    function J(v) { return q(v); }
    function clear() { st.rd = false; st.bd = false; st.ed = false; }
    var result = { response: '', running: '' }, beforeStop = '';
    // Step 1: build the jar and start the server
    n++;
    st.jar = st.src; st.builds = 1; st.bd = true;
    push('Step ' + n + ': ./gradlew bootJar compiles the source files into .class files and bundles them into the jar file build/libs/app.jar. The HelloController in this jar file is code that returns ' + J(V1) + '.', '');
    clear();
    st.proc = 'up'; st.mem = st.jar; st.starts = 1; st.rd = true;
    push('Step ' + n + ': java -jar build/libs/app.jar runs the jar file and creates one process. When it starts, this process reads in the classes from the jar file, and Spring Boot starts the web server, which waits for requests on port 8080. Now it answers GET /hello with ' + J(V1) + '.', '');
    clear();
    // Edit the source
    if (edit) {
      n++;
      st.src = V2; st.ed = true;
      push('Step ' + n + ': a person opens HelloController.java, changes ' + J(V1) + ' to ' + J(V2) + ', and saves it. The only thing that changed is the one source file on the disk. The jar file is still ' + J(V1) + ', and the running server still answers ' + J(V1) + '. Saving the source file does not make compiling and building the jar happen by itself.', '');
      clear();
    }
    // Build the jar again
    if (build) {
      n++;
      st.jar = st.src; st.builds++; st.bd = true;
      push('Step ' + n + ': ./gradlew bootJar builds the jar file again from the current source file. Now the code in the jar file returns ' + J(st.jar) + '.' + (edit ? ' But the server was left running, so even when a request was sent at this point, the running process answered ' + J(V1) + '. A process only runs on the classes it read in when it started, and it does not pick up that the jar file on the disk changed.' : ' You did not edit the source file, so it is the same code as at first.'), '');
      clear();
    }
    function request() {
      n++;
      st.req = 'sent'; st.ans = '';
      push('Step ' + n + ': in another terminal, curl sends a GET /hello request. It is the same as the request a browser sends when you type localhost:8080/hello in the address bar.', '');
      if (st.proc !== 'up') {
        st.req = 'fail'; st.ans = 'Connection refused error';
        push('The server was stopped, so no process accepts connections at port 8080. curl gets a connection refused error and receives no answer. Whatever the source file and the jar file say, it does not matter for this request.', 'bad');
        result.response = 'Connection refused error'; result.running = 'None (server stopped)';
      } else {
        st.req = 'got'; st.ans = st.mem;
        if (st.mem !== st.src) push('The code of the running process returns ' + J(st.mem) + ', so curl receives ' + J(st.mem) + '. The source file says ' + J(st.src) + ', but ' + (st.jar !== st.src ? 'a new jar file was not built, so the jar file the process read in was the old code.' : 'the process was not started again, so it did not read the new jar file.'), 'bad');
        else push('The running process answers ' + J(st.mem) + ' with its own code, and curl receives ' + J(st.mem) + '. The source file, the jar file, and the code of the running server are all the same, ' + q(st.mem) + '.' + (edit ? ' The edited new version answered the request.' : ' Nothing was edited, so it is still the first version.'), edit ? 'good' : '');
        result.response = st.mem; result.running = st.mem;
      }
    }
    if (rs) {
      beforeStop = st.mem;
      n++;
      st.proc = 'down'; st.mem = ''; st.req = ''; st.ans = '';
      push('Step ' + n + ': press Ctrl+C in the terminal where you started the server to stop it. When the process ends, the code it had read in disappears with it. The source file and the jar file on the disk stay as they are.' + (during ? ' It is before the server is started again, so no process is receiving requests at port 8080 right now.' : ''), '');
      if (during) request();
      n++;
      st.proc = 'up'; st.mem = st.jar; st.starts++; st.rd = true;
      if (during) { st.req = ''; st.ans = ''; }
      push('Step ' + n + ': java -jar build/libs/app.jar starts it again. A new process is created, and when it starts, it reads in the classes from the beginning from the jar file that is on the disk now. The code in that jar file returns ' + J(st.jar) + '.' + (build && edit ? ' The edited code has now become the code of the running server.' : edit ? ' A new jar file was not built, so the edit to the source file did not get this far.' : ' You did not edit the source, so it is the same code as at first.') + (during ? ' The request sent while the server was stopped had already failed, and if you send one more request after finishing the steps, it receives ' + J(st.jar) + '.' : ''), build && edit ? 'good' : edit ? 'bad' : '');
      clear();
      if (during) { st.req = 'got'; st.ans = st.mem; }
      else request();
    } else request();
    // Summary
    if (during) {
      sum.push('A request that arrives after the server is stopped and before it is started again fails with a connection refused error, because there is no process to receive it. A request that arrived after the server was started again received ' + J(st.jar) + ' from the new jar file.');
      sum.push('If there is only one server, the service stops while it is stopped and started. How to remove this gap is covered in the in-depth lab "Deployment strategies".');
    } else if (edit && build && rs) {
      sum.push('You edit the source (step 2), build the jar file again (step 3), and stop the running server and start it again (steps 4 and 5), and only then does the new process answer ' + J(V2) + ' with the edited code. Making a new version really run like this is deployment.');
      sum.push('The code is in three separate places: the source file, the jar file, and the running process. ./gradlew bootJar makes the jar file from the code in the source file, and starting again makes the process read in the code in the jar file.');
    } else if (edit && !build && !rs) {
      sum.push('The source file changed to ' + J(V2) + ', but the jar file and the running server stay as they are, so ' + J(V1) + ' answers. A state where you only edited the file is not yet a deployment.');
      sum.push('For the new code to answer, you have to build the jar file again (./gradlew bootJar) and stop and start the server (java -jar).');
    } else if (edit && build && !rs) {
      sum.push('The jar file was built again as ' + J(V2) + ', but the server that was left running keeps answering ' + J(V1) + ' with the code it read in when it started. Changing the jar file and changing the running process are different jobs.');
      sum.push('To make the new jar answer, you have to stop the running server and start it again with java -jar.');
    } else if (edit && !build && rs) {
      sum.push('The server was started again, but a new jar file was not built, so the new process reads the old jar file and answers ' + J(V1) + '. This is because a Java server runs the jar file, not the source file.');
      sum.push('For the edited source to reach the server, it has to go through both building the jar file again (./gradlew bootJar) and starting again (java -jar).');
    } else if (!edit && !rs) {
      sum.push('You did not edit the source, so ' + J(V1) + ' answers. ' + (build ? 'Even if you build the jar file again, it is the same code made from the same source.' : 'The server keeps running on the code it read in at first.'));
      sum.push('For the code of the running server to change, you have to build the jar file again from the edited source and start the server again.');
    } else {
      sum.push('If you ' + (build ? 'build the jar again and ' : '') + 'start the server again without editing the source, the new process reads the same code and ' + J(V1) + ' answers. Stopping and starting does not change the code.');
      sum.push('If you stop and start the server without changing the code, you gain nothing and only create a time when it cannot receive requests.');
    }
    return { events: ev, summary: sum, row: [result.response, result.running, st.jar, st.src], later: during ? st.mem : '', starts: st.starts, builds: st.builds, beforeStop: beforeStop, sameProc: during ? '(not applicable)' : String(!rs) };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from building the jar file and starting the server.'); return; }
    var mem = s.proc === 'up' ? s.mem : s.proc === 'down' ? 'None (server stopped)' : 'Not yet';
    H.table(v, ['Place', 'Text the code returns'], [
      { cls: '', cells: ['Source file HelloController.java', s.src] },
      { cls: '', cells: ['Jar file build/libs/app.jar', s.jar ? (s.jar !== s.src ? { v: s.jar + ' (differs from source)', cls: 'bad' } : s.jar) : 'Not yet'] },
      { cls: s.proc === 'down' ? 'gone' : '', cells: ['Running server process', s.proc === 'up' && s.mem !== s.src ? { v: mem + ' (differs from source)', cls: 'bad' } : mem] },
      { cls: s.ans ? '' : 'gone', cells: ['Response to the request', s.ans ? { v: s.ans, cls: s.req === 'fail' ? 'bad' : s.ans === s.src ? 'good' : 'bad' } : 'Not yet'] },
    ], 'Current state');
    H.counters(v, [[s.builds, 'Times the jar was built'], [s.starts, 'Times the server was started']]);
  },
  // Diagram: on the left the client (curl), in the middle the server process, and on the right the source file and the jar file on the disk. A build makes the jar file from the source file, and classes are read from the jar file into the process only when it starts. A request goes through the process only.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    var up = s && s.proc === 'up', down = s && s.proc === 'down', stale = up && s.mem !== s.src;
    P.size(680, 262);
    P.region('cl', 10, 16, 150, 182, 'Client');
    P.box('req', 20, 50, 130, 112, { cls: s && s.req === 'fail' ? 'bad' : s && s.req === 'sent' ? 'wait' : s && s.req === 'got' ? 'good' : 'plain', title: 'curl', sub: !s || !s.req ? ['Idle'] : s.req === 'sent' ? ['GET /hello', 'Awaiting reply'] : s.req === 'fail' ? ['GET /hello', 'Refused'] : ['GET /hello', 'Reply received:', s.ans] });
    P.region('sv', 210, 16, 190, 182, 'Server');
    P.box('proc', 220, 50, 170, 112, { cls: down ? 'ghost' : stale && s.req === 'got' ? 'bad' : up ? (s.rd ? 'hot' : 'wait') : 'ghost', title: 'java process', sub: up ? ['Running', 'Code read in:', s.mem] : down ? ['Stopped'] : ['Not started'] });
    P.region('dk', 450, 16, 220, 182, 'Disk');
    P.box('src', 460, 44, 200, 64, { cls: s && s.ed ? 'hot' : 'plain', title: 'HelloController.java', sub: [s ? s.src : 'Version 1'] });
    P.box('jar', 460, 124, 200, 64, { cls: s && s.bd ? 'hot' : s && s.jar ? 'plain' : 'ghost', title: 'app.jar', sub: [s && s.jar ? s.jar : 'Not yet built'] });
    if (s && s.bd) P.arrow('bd', 'src:b:0.5', 'jar:t:0.5', { cls: 'hot' });
    if (s && s.req) P.arrow('rq', 'req:r:0.3', 'proc:l:0.3', { cls: s.req === 'fail' ? 'bad' : 'hot' });
    if (s && s.req === 'got') P.arrow('rs', 'proc:l:0.75', 'req:r:0.75', { cls: stale ? 'bad' : 'good' });
    if (s && s.rd) P.arrow('rd', 'jar:l:0.5', 'proc:r:0.7', { cls: 'hot' });
    P.box('n1', 14, 214, 322, 36, { cls: s && s.starts ? 'wait' : 'ghost', title: 'Times the server was started', right: String(s ? s.starts : 0) });
    P.box('n2', 344, 214, 322, 36, { cls: s && s.ans ? (s.req === 'fail' ? 'bad' : s.ans === s.src ? 'good' : 'bad') : 'ghost', title: 'Response', right: s && s.ans ? s.ans : 'Not yet' });
  },
  assume: 'The environment was JDK 21.0.12.1, Spring Boot 4.1.1 (Spring Framework 7.0.9, embedded Tomcat 11.0.24), curl 8.21.0, and Windows 11. For each of the 12 combinations, I took the code on the screen as it is from the code function of this lab, wrote the two Java files in the first part out as files, and really did the to-do items and commands in the second part line by line. java -jar build/libs/app.jar and curl http://localhost:8080/hello were run exactly as the commands on the screen, and the server started on the default port 8080. I did not run ./gradlew bootJar, because it needs to download the Gradle plugin, and I did the same job with JDK commands. I compiled src/main/java with javac and made build/libs/app.jar with the jar command; unlike bootJar, which puts the dependency libraries into BOOT-INF/lib of the jar file, this jar pointed to the library jar files with the Class-Path of the manifest. On Windows, the jar command could not newly write the app.jar that the running java process had open (an error that another process is using the file), so in the six combinations that build the jar while the server is left running, I made the new jar under another name and then overwrote the contents of app.jar in place. Stopping the server was done by forcibly ending the process, not by Ctrl+C. At each request I recorded the output of curl, the process ID that had port 8080 open at that time (netstat), the text returned by the HelloController in app.jar read with javap, and the text written in the source file on the disk, and checked them against the result table. I also checked the answer of the running server right after the jar was built again, the answer of the server just before it was stopped, the number of times it was started, the number of times the jar was built, and, for the combination that requested while the server was stopped, the answer after it was started again, and all 12 combinations matched (verify/net/cmp_deploy_basic.js). The connection refused error is what curl reported with exit code 7 (Failed to connect … Could not connect to server). What I checked against documentation is Packaging Executable Archives in the Spring Boot Gradle plugin documentation (the description that the bootJar task builds an executable jar, puts the classes and dependency libraries into BOOT-INF/classes and BOOT-INF/lib, and that the jar can be run with java -jar), Running Your Application in the Spring Boot reference (the description that an executable jar is run with java -jar), the Java Plugin in the Gradle documentation (the description that the jar task depends on classes, and classes depends on compileJava), and the Base Plugin (the description that the jar is created in build/libs by default and its name is decided by the project name and the version). The app.jar on the screen is a shortened name. Not covered: the behavior when you overwrite the jar of a running server on a Linux server, the cleanup work Spring Boot does when you stop it with Ctrl+C, and Spring Boot DevTools, which restarts the application by itself when a file changes, were not run in this lab. How to remove the gap while a server is stopped and started (rolling several machines one after another, blue-green, which builds a whole new environment, and so on) is covered in the in-depth lab "Deployment strategies", the automation that builds, tests, and puts the edited code on a server is covered in "CI/CD pipelines", and the way that Kubernetes replaces servers packed in containers is covered in "Kubernetes self-healing".',
});
