Lab.register({
  id: 'boot_basic', nav: 'Spring Boot', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['autoconf'],
  title: 'What does Spring Boot do for you?',
  intro: 'A Spring Boot application is an ordinary Java class (named App in this example) that has a main method. It starts when the main method calls one line, SpringApplication.run(App.class, args). This one line starts Spring (it scans the classes and makes beans), starts a web server (Tomcat) inside the program, and gets ready to receive requests. We do not install Tomcat separately, and we do not write code that starts a server. @SpringBootApplication above App is a marker that tells Spring Boot to scan from the package of this class and configure what is needed automatically, and it decides what to configure by looking at the libraries in the project. If a web library is there, it starts Tomcat, and if not, it does not. In this lab, you remove the run line, @SpringBootApplication, and the web library one at a time and run the program with the java command, to see whether the program keeps running, whether Tomcat starts, and whether it answers a request from the browser.',
  terms: ['Spring Boot', '@SpringBootApplication', 'Starter', 'Embedded server'],
  controls: [
    { id: 'run', label: 'Write SpringApplication.run(App.class, args) in main', type: 'check', value: true },
    { id: 'anno', label: 'Put @SpringBootApplication above App', type: 'check', value: true },
    { id: 'web', label: 'The project has a web library', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a Spring Boot application look like, and what happens when you run it?', d: 'A Spring Boot application that has all three. One line in main starts Spring and starts Tomcat, and the program waits for requests.', v: { run: true, anno: true, web: true } },
    { t: 'Removing the SpringApplication.run line', q: 'What if you remove the SpringApplication.run line?', d: 'main is empty, so the program ends right away. Neither Spring nor Tomcat starts.', v: { run: false, anno: true, web: true } },
    { t: 'Removing @SpringBootApplication', q: 'What if you remove @SpringBootApplication?', d: 'It decides that a web server is needed, but there is no configuration to make one, so it fails while starting.', v: { run: true, anno: false, web: true } },
    { t: 'Removing the web library', q: 'What if you remove the web library?', d: 'It decides that this is not a web application and does not start Tomcat, and the program ends when its work is done.', v: { run: true, anno: true, web: false } },
  ],
  code: function (c) {
    var out = ['// build.gradle: the library to put in this project', "implementation 'org.springframework.boot:spring-boot-starter" + (c.web ? '-webmvc' : '') + "'", ''];
    if (c.anno) out.push('// Marker: scan from this package and configure what is needed automatically', '@SpringBootApplication');
    out.push('public class App {', '    public static void main(String[] args) {');
    if (c.run) out.push('        // This one line starts Spring and starts the server', '        SpringApplication.run(App.class, args);');
    out.push('    }', '}');
    if (c.web) out.push('', '@RestController', 'public class HelloController {', '    @GetMapping("/hello")', '    public String hello() {', '        return "Hello";', '    }', '}');
    return out.join('\n');
  },
  label: function (c) { return (c.run ? 'has run line' : 'no run line') + ' · ' + (c.anno ? 'has @SpringBootApplication' : 'no @SpringBootApplication') + ' · ' + (c.web ? 'has web library' : 'no web library'); },
  columns: ['Program', 'Web server', 'Response to a request for localhost:8080/hello'],
  simulate: function (c) {
    var ev = [], sum = [], kind = !c.run ? 'norun' : c.web ? (c.anno ? 'serve' : 'fail') : (c.anno ? 'plainA' : 'plainB');
    // mn: state of the main method, sp: state of Spring, tm: whether Tomcat is up, alive: state of the process, ask: whether the browser sent a request
    var st = { mn: '', sp: '', beans: [], tm: false, disp: false, alive: '', phase: '', ask: false, resp: null, refused: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var HELLO = 'localhost:8080/hello';
    st.mn = 'run'; st.phase = 'main';
    push('When you run the App class with the java command on the computer, Java calls the main method of the App class. The main method is where a Java program starts.', '');
    if (kind === 'norun') {
      st.mn = 'done'; st.alive = 'end'; st.phase = 'end';
      push('The main method is empty. There is no line to run, so the main method ends right away, and with nothing left to do, the java process ends too (exit code 0). Spring Boot did not start and no server was made.' + (c.anno ? ' Even with @SpringBootApplication above App, nothing happens if SpringApplication.run, which would read that marker, is not called.' : '') + (c.web ? ' Even though the project has a web library, nothing uses it.' : ''), '');
    } else {
      st.phase = 'run';
      push('The line SpringApplication.run(App.class, args) in the main method runs. This one line starts Spring Boot. App.class passes the class that is the starting point of the program, and args passes the arguments that main received as they are.', '');
      st.phase = 'detect';
      if (c.web) push('Spring Boot looks at the libraries in the project. Spring MVC, which handles web requests, is there, so it decides that this is a web application and prepares a Spring that uses a web server.', '');
      else push('Spring Boot looks at the libraries in the project. Spring MVC, which handles web requests, is not there, so it decides that this is not a web application and prepares an ordinary Spring that does not use a web server. Without a web library, @RestController and @GetMapping cannot be used either and the HelloController class (a controller made up as an example) would not compile, so in this setting that class was removed too.', '');
      if (kind === 'serve') {
        st.sp = 'web'; st.beans = ['HelloController', 'DispatcherServlet']; st.phase = 'spring';
        push('Spring starts. @SpringBootApplication is above App, so Spring scans classes from the package that holds the App class, finds HelloController (a controller class made up as an example), which has @RestController, and creates its object and keeps it. It also configures what is needed automatically to match the libraries. Because there is a web library, DispatcherServlet, which receives requests and distributes them to controllers, is also created at this time. The code we wrote has neither new HelloController() nor new DispatcherServlet().', 'good');
        st.tm = true; st.disp = true; st.phase = 'tomcat';
        push('Spring Boot starts Tomcat (the web server) inside this java process and registers the DispatcherServlet it made with Tomcat. We did not install Tomcat, and the code we wrote has no line that starts a server. If you do not set it, the port on which Tomcat receives requests is 8080.', 'good');
        st.mn = 'done'; st.alive = 'run'; st.phase = 'wait';
        push('The SpringApplication.run line ends, and the main method reaches its end too. But the java process does not end. Tomcat made threads (separate flows of execution) and they are alive, so Java does not end the program while they are alive, and Tomcat waits for requests on those threads.', 'good');
      } else if (kind === 'fail') {
        st.sp = 'fail'; st.phase = 'spring';
        push('Spring tries to start. But @SpringBootApplication is not above App, so it neither scans classes nor configures what is needed automatically. It decided earlier that this is a web application, yet there is no configuration at all that creates a web server (Tomcat).', 'bad');
        st.mn = 'done'; st.alive = 'fail'; st.phase = 'end';
        push('Spring Boot gives up on starting and throws an exception. There is no configuration that creates a web server (ServletWebServerFactory), so the exception "Unable to start web server" comes out. No code catches this exception, so the main method ends with the exception, and the java process ends with an error code (1). Tomcat did not start.', 'bad');
      } else {
        st.sp = 'plain'; st.phase = 'spring';
        push(c.anno
          ? 'Spring starts. @SpringBootApplication is above App, so Spring scans classes from the package that holds the App class and does the configuration that is needed. But this is not a web application, so none of the configuration about a web server and DispatcherServlet is used.'
          : 'Spring starts. @SpringBootApplication is not above App, so it neither scans classes nor configures what is needed automatically. The Spring that is made holds only the App class and the things inside Spring.', '');
        st.mn = 'done'; st.alive = 'end'; st.phase = 'end';
        push('The SpringApplication.run line ends, and the main method reaches its end too. There is no Tomcat to make it wait for requests, so the java process just ends (exit code 0). Spring started, but there is no web server, so there is nothing to wait for.', '');
      }
    }
    // The request from the browser
    st.ask = true; st.phase = 'req';
    push('You type ' + HELLO + ' in the address bar of the browser, and the browser sends a GET /hello request to the server.', '');
    if (kind === 'serve') {
      st.phase = 'call';
      push('Tomcat receives the request and passes it to DispatcherServlet, and DispatcherServlet calls the hello() method of HelloController. The text this method returned is "Hello".', 'good');
      st.resp = { status: '200', body: 'Hello' }; st.phase = 'resp';
      push('The browser receives a 200 response. The body is "Hello". The java process does not end and keeps waiting for the next request.', 'good');
    } else {
      st.refused = true; st.phase = 'refused';
      push('No program receives connections that come to ' + HELLO + '. The browser gets no response and shows "cannot connect". There is no response code like 404 either, because there is no server to receive the request.', 'bad');
    }
    // Summary: the first line is the answer for this setting (the question)
    if (kind === 'serve') {
      sum.push('A Spring Boot application starts when the main method calls one line, SpringApplication.run(App.class, args). This one line starts Spring (it scans the classes and makes beans), starts Tomcat inside the program, and gets ready to receive requests. What differs from an ordinary Java program is this line, @SpringBootApplication above App, and the web library in the project.');
      sum.push('We did not install Tomcat or write code that starts a server. @SpringBootApplication is a marker that tells Spring Boot to scan from this package and configure what is needed automatically, and it decides what to configure by looking at the libraries in the project. A web library was there, so Tomcat started.');
    } else if (kind === 'norun') {
      sum.push('Without the SpringApplication.run line, the main method is empty, so the java process ends right away. Spring Boot did not start and no server came up, so the request could not connect.');
      sum.push('@SpringBootApplication and the web library cannot start anything by themselves. What starts Spring Boot is the one line SpringApplication.run that main calls, and the marker and the library are information that this line reads and uses.');
    } else if (kind === 'fail') {
      sum.push('If you remove @SpringBootApplication, nothing is configured automatically, so even with a web library there is no configuration that creates Tomcat. The web server could not start, the program failed with the exception "Unable to start web server", and the request could not connect.');
      sum.push('Even with a web library, it is @SpringBootApplication that configures it and makes it usable. If, after deciding that this is a web application, there is no configuration to create a server, it does not end quietly. It fails while starting.');
    } else if (kind === 'plainA') {
      sum.push('If you remove the web library, Spring Boot decides that this is not a web application and does not start Tomcat. Spring starts, but there is no server to wait for, so the program finished its work and ended right away, and the request could not connect.');
      sum.push('What Spring Boot configures is decided by looking at the libraries in the project. With the same main method and @SpringBootApplication, Tomcat starts if there is a web library and does not if there is not.');
    } else {
      sum.push('If you remove the web library and also remove @SpringBootApplication, Spring Boot decides that this is not a web application and configures nothing automatically. Spring starts, but there is no server to wait for, so the program ended right away, and the request could not connect.');
      sum.push('In this case it did not decide that a web server was needed, so it ended without an error. This differs from the case where only @SpringBootApplication is removed and a web library is present, which failed because there was no configuration to create a server.');
    }
    var prog = st.alive === 'run' ? 'Keeps running and waits for requests' : st.alive === 'fail' ? 'Failed while starting' : 'Ends right away, nothing to do';
    return { events: ev, summary: sum, kind: kind, row: [prog, st.tm ? 'Tomcat is up' : 'Not up', st.resp ? st.resp.status + ' ' + st.resp.body : 'Cannot connect'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from java running the main method.'); return; }
    var spTxt = { '': 'Not started', web: 'Started (web application)', plain: 'Started (not a web application)', fail: 'Could not start' }[s.sp];
    var mnTxt = { '': 'Not run yet', run: 'Running', done: 'Ended' }[s.mn];
    var pTxt = { '': 'Not started', run: 'Keeps running, waits for requests', end: 'Ended (exit code 0)', fail: 'Ended with an error (exit code 1)' }[s.alive];
    H.table(v, ['Part', 'State'], [
      { cls: '', cells: ['main method', mnTxt] },
      { cls: s.sp ? '' : 'gone', cells: ['Spring', { v: spTxt, cls: s.sp === 'fail' ? 'bad' : s.sp ? 'good' : '' }] },
      { cls: s.tm ? '' : 'gone', cells: ['Tomcat', { v: s.tm ? 'Up' : 'Not up', cls: s.tm ? 'good' : '' }] },
      { cls: '', cells: ['java process', { v: pTxt, cls: s.alive === 'run' ? 'good' : s.alive === 'fail' ? 'bad' : '' }] },
    ], 'Inside the java process');
    if (s.ask) H.table(v, ['Request', 'Response'], [{ cls: '', cells: ['GET /hello', s.resp ? { v: s.resp.status + ' ' + s.resp.body, cls: 'good' } : s.refused ? { v: 'Cannot connect', cls: 'bad' } : 'Waiting'] }], 'Request to localhost:8080');
  },
  // Diagram: the browser on the left, the java process area on the right. In the area, the main method at the top, and Tomcat (left) and Spring (right) boxes below. Arrows show whether Spring Boot makes Spring and Tomcat, which box is not made depending on what you removed, and whether the request goes through Tomcat and DispatcherServlet and reaches the controller. Two result boxes at the bottom.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 292);
    var alive = s ? s.alive : '';
    var asked = s && s.ask;
    P.box('br', 14, 120, 108, 52, { cls: asked && !s.resp && !s.refused ? 'wait' : 'plain', title: 'Browser', sub: !asked ? 'Waiting' : s.resp ? s.resp.status + ' response' : s.refused ? 'Refused' : 'GET /hello' });
    P.region('jp', 164, 16, 502, 208, 'java process' + (alive === 'end' ? ': ended' : alive === 'fail' ? ': ended with an error' : alive === 'run' ? ': running' : ''));
    var mnSub = !s || !s.mn ? 'Not run yet' : s.mn === 'run' ? (ph === 'detect' ? 'SpringApplication.run running: looks at the libraries' : ph === 'run' || ph === 'spring' ? 'SpringApplication.run running' : 'main running') : 'Ended';
    P.box('mn', 174, 44, 482, 46, { cls: s && s.mn === 'run' ? 'hot now' : s && s.mn === 'done' ? 'plain' : 'ghost', title: 'main method of App', sub: mnSub });
    P.box('tm', 174, 118, 210, 92, { cls: s && s.tm ? (ph === 'tomcat' || ph === 'req' || ph === 'call' ? 'good now' : 'good') : 'ghost', title: 'Tomcat (web server)', sub: s && s.tm ? ['Has DispatcherServlet', 'Waiting for requests'] : [s && s.sp ? 'Not up' : ' '] });
    var spSub = s && ph === 'detect' ? ['Not started yet', c.web ? 'Decided: web application' : 'Decided: not for web'] : !s || !s.sp ? [' '] : s.sp === 'web' ? s.beans.map(function (b) { return b + ' object'; }) : s.sp === 'plain' ? ['Started', 'Not for web'] : ['Could not start'];
    P.box('sp', 440, 118, 216, 92, { cls: s && s.sp === 'fail' ? 'bad' : s && s.sp ? (ph === 'spring' || ph === 'call' ? 'good now' : 'good') : 'ghost', title: 'Spring (holds beans)', sub: spSub });
    if (s && ph === 'run') P.arrow('ru', 'mn:b:0.8', 'sp:t:0.5', { cls: 'hot' });
    if (s && ph === 'tomcat') P.arrow('tc', 'sp:l:0.35', 'tm:r:0.35', { cls: 'hot' });
    if (s && ph === 'req') P.arrow('rq', 'br:r:0.3', 'tm:l:0.2', {});
    if (s && ph === 'call') { P.arrow('rq', 'br:r:0.3', 'tm:l:0.2', {}); P.arrow('cl', 'tm:r:0.7', 'sp:l:0.7', { cls: 'hot' }); }
    if (s && ph === 'resp') P.arrow('rs', 'tm:l:0.7', 'br:r:0.8', { cls: 'good' });
    if (s && ph === 'refused') P.arrow('rq', 'br:r:0.3', 'tm:l:0.2', { cls: 'bad' });
    var prog = alive === 'run' ? 'Keeps running, waits' : alive === 'fail' ? 'Failed while starting' : alive === 'end' ? 'Ends right away' : 'Not yet';
    P.box('n1', 14, 242, 322, 36, { cls: alive === 'run' ? 'good' : alive === 'fail' ? 'bad' : alive ? 'plain' : 'ghost', title: 'Program', right: prog });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.tm ? 'good' : alive === 'fail' ? 'bad' : alive ? 'plain' : 'ghost', title: 'Web server', right: s && s.tm ? 'Tomcat is up' : alive ? 'Not up' : 'Not yet' });
  },
  assume: 'This is the result of running Spring Boot 4.1.1 (Spring Framework 7.0.9, embedded Tomcat 11.0.24) on JDK 21.0.12.1. For all 8 combinations, a source with the same structure as the code on the screen (App and HelloController in the package app, with no lines that start a server or count anything) was compiled, a new process was run with the java command starting from the main method of app.App, and the result was checked by observing from outside the process. The criteria are as follows. For the program, it waits until the process ends or a listening port opens, and if it is still alive 3 seconds later, it is "keeps running and waits for requests"; if it already ended with exit code 0, it is "ends right away, nothing to do"; and if the exit code is not 0, it is "failed while starting". The web server was decided by whether that process had a listening TCP port (netstat) and whether the log printed "Tomcat started on port" for the same port, and the response was decided by the real HTTP result of sending GET /hello to that port from outside the process. Even for combinations with no server, a request was sent to an arbitrary port that was confirmed beforehand to be empty and was given as server.port, and every one was refused (giving the port as 0 leaves nowhere to connect when there is no server, so this was done instead). The localhost:8080 in the address is an example of starting Spring Boot on its default port on my own computer, and that the default port is 8080 follows the Embedded Servlet Container Support section of the Spring Boot documentation. The classpath was not the whole library folder but only the jars that the one dependency line on the screen brings in. With a web library, the 39 jars that spring-boot-starter-webmvc brings in were used, and without one, the 21 jars that spring-boot-starter brings in were used, and the 18 that are removed are spring-boot-starter-webmvc, spring-boot-starter-jackson, spring-boot-starter-tomcat, spring-boot-starter-tomcat-runtime, spring-boot-tomcat, spring-boot-web-server, spring-boot-http-converter, spring-boot-webmvc, spring-boot-servlet, spring-boot-jackson, spring-web, spring-webmvc, tomcat-embed-core, tomcat-embed-el, tomcat-embed-websocket, jackson-databind, jackson-core, and jackson-annotations. This list was not obtained by running Gradle but decided by opening the pom files on Maven Central and following the dependencies (the poms of the starters and the Spring Boot modules, spring-web, spring-webmvc, Tomcat, and jackson-databind were checked, and jackson-core and jackson-annotations were not opened), and other libraries such as Spring Security and JPA are on the classpath in neither case. In Spring Boot 4 the name of the web starter is spring-boot-starter-webmvc (in the Starters table of the Build Systems section of the documentation, spring-boot-starter-web is marked as replaced by it), and it was not checked from a Gradle resolution result that the jars the web starter brings in are exactly this list. In the combination without a web library, HelloController does not compile (the error that the package org.springframework.web.bind.annotation does not exist was actually seen), so that class was removed too. What was checked is the three items of the result table and the facts that the step sentences rely on. These were also checked by execution: that SpringApplication decides it is a web application (servlet) if there is a web library and not if there is not, that the only servlet registered with Tomcat is DispatcherServlet and it handles "/", that HelloController and DispatcherServlet are beans of Spring, that our source has no text that starts Tomcat or a server, that after the server is up the main thread has ended but the threads of Tomcat (such as container-0) remain so the process stays alive, and the two ways of failing (without the run line, Spring does not start and the program ends right away, and without @SpringBootApplication but with a web library, it fails with exit code 1 with the exception that there is no ServletWebServerFactory bean that makes a web server). What the documentation defines is the section Using the @SpringBootApplication Annotation of the Spring Boot documentation (that it combines @EnableAutoConfiguration, @ComponentScan, and @SpringBootConfiguration), the Auto-configuration section (that it configures by looking at the jars on the classpath), the Web Environment section of SpringApplication (the rule that if Spring MVC is present it decides to use a servlet web context), and the Embedded Servlet Container Support section (that it supports Tomcat and Jetty and the default port is 8080). Splitting "scan the classes and make beans" and "start Tomcat and register DispatcherServlet" into two steps on the screen is a simplification. In the actual log, Tomcat is made while Spring is starting (Tomcat initialized), Tomcat starts accepting connections before the "Started App" log (Tomcat started), and DispatcherServlet was actually initialized when the first request arrived. That classes are not scanned when there is no @SpringBootApplication is defined by the documentation, and that the number of bean definitions is larger with @SpringBootApplication (7 and 50 in the combination without a web library) is a value observed on this version. Unlike what the documentation defines, "if a web server is needed but there is no configuration, it fails instead of ending quietly" and "if there is no web library, it ends without an error" are behaviors observed on this version. The code on the screen leaves out the package and import lines, assumes that App and HelloController are in the same package, and the line in build.gradle was not run with Gradle but the jars that the line means were put on the classpath. Maven and war deployment, using Jetty instead of Tomcat, and changing the port or the kind of web application by settings were not covered. The details of what is configured automatically are covered in the in-depth lab "Spring Boot auto-configuration".',
});
