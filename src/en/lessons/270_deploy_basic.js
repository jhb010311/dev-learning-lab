Lab.register({
  id: 'deploy_basic', nav: 'Deployment', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['deploy', 'cicd', 'k8s'],
  title: 'When does a running server change after you edit the code?',
  intro: 'A server is a program that reads in a source file (a file in which code is written) and answers requests with that code. When you start the server, the computer runs the server program and creates one process (a running program), and this process reads in the source file server.js when it starts. After that it runs only on the code it has read in, and this server does not read the file on the disk again. So even if you edit and save the file, a server that is already running keeps answering with the old code. To make it use the new code, you have to stop the server and start it again with the new code, and making a new version really run like this is called deployment. The code box is not Java code. It is a list of the things a person does, in order (lines that start with # are numbered to-do items). In this lab you remove or reorder line 2, which edits the source file, and line 3, which stops and starts the server, one at a time, and you see which version answers the request in line 4.',
  terms: ['Deployment', 'Server restart', 'Code loaded at startup', 'Connection refused error'],
  controls: [
    { id: 'edit', label: 'Include line 2, "Change "Version 1" to "Version 2" in the source file"', type: 'check', value: true },
    { id: 'restart', label: 'Include line 3, "Stop and start the server"', type: 'check', value: true },
    { id: 'when', label: 'When to send the request in line 4', type: 'select', value: 'after', show: function (c) { return c.restart; }, options: [['after', 'After the server is stopped and started'], ['during', 'After the server is stopped and before it is started again (line 3 stops, line 4 sends the request, line 5 starts)']] },
  ],
  // Without the line that starts the server again, you cannot choose when to send the request, so go back to the first value
  fix: function (c) { if (!c.restart && c.when !== 'after') return { when: 'after' }; },
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does deployment (putting the new version of the edited source file into the server) look like, and which version answers the request in line 4?', d: 'Edit the file, stop and start the server, and then send the request. The new version answers.', v: { edit: true, restart: true, when: 'after' } },
    { t: 'Removing line 3', q: 'What if you remove line 3 (stop and start the server)?', d: 'Only the file is edited and the server stays as it is. The old version keeps answering.', v: { edit: true, restart: false, when: 'after' } },
    { t: 'Requesting while the server is stopped', q: 'What if you send the request after the server is stopped and before it is started again (line 3 stops the server, line 4 sends the request, line 5 starts the server again)?', d: 'A request that arrives while the server is stopped gets no reply.', v: { edit: true, restart: true, when: 'during' } },
    { t: 'Removing line 2', q: 'What if you remove line 2 (edit the source file) and only stop and start the server?', d: 'If nothing was edited, the same version answers even after the restart.', v: { edit: false, restart: true, when: 'after' } },
    { t: 'Removing both line 2 and line 3', q: 'What if you remove both line 2 and line 3?', d: 'Nothing changes, so the first version answers.', v: { edit: false, restart: false, when: 'after' } },
  ],
  code: function (c) {
    var out = ['# 1. Start the server (its code answers "Version 1")'];
    if (c.edit) out.push('# 2. Change "Version 1" to "Version 2" in the source file');
    if (c.restart) {
      if (c.when === 'during') out.push('# 3. Stop the server', '# 4. Send a request', '# 5. Start the server again');
      else out.push('# 3. Stop and start the server', '# 4. Send a request');
    } else out.push('# 4. Send a request');
    return out.join('\n');
  },
  label: function (c) { return (c.edit ? 'Source file edited' : 'Source file not edited') + ' · ' + (!c.restart ? 'Server not started again' : c.when === 'during' ? 'Request while the server is stopped' : 'Request after the server is stopped and started'); },
  columns: ['Response', 'Code running', 'Source on disk'],
  simulate: function (c) {
    var edit = !!c.edit, rs = !!c.restart, during = rs && c.when === 'during';
    var V1 = 'Version 1', V2 = 'Version 2', dnow = edit ? V2 : V1;
    var ev = [], sum = [];
    var st = { proc: 'none', mem: '', disk: V1, starts: 0, req: '', ans: '', rd: false, ed: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function q(v) { return '"' + v + '"'; }
    function J(v) { return q(v); }
    var result = { response: '', running: '' };
    // Line 1: start the server
    st.proc = 'up'; st.mem = st.disk; st.starts = 1; st.rd = true;
    push('Line 1: start the server. The computer runs the server program and creates one process (a running program). When it starts, this process reads in the source file server.js on the disk. The code written in the file says to answer ' + J(V1) + ' when a request arrives, and the process waits for requests holding this code that it has read in.', '');
    st.rd = false;
    // Line 2: edit the source file
    if (edit) {
      st.disk = V2; st.ed = true;
      push('Line 2: a person opens the source file server.js, changes ' + J(V1) + ' to ' + J(V2) + ', and saves it. Now the file on the disk says ' + J(V2) + '. But the running server already read in the file when it started, and it does not pick up that the file changed afterward. Even when 0.5s had passed after the edit and the running server was asked directly, the code the server held was still ' + J(V1) + '. The file and the code inside the server are in different places.', '');
      st.ed = false;
    }
    // Line 3: stop the server (and start it again)
    if (rs) {
      st.proc = 'down'; st.mem = '';
      push('Line 3: stop the server. The server process ends, and the code it had read in and was holding disappears with it.' + (during ? ' It is before the server is started again, so no program is receiving requests at address 8080 right now.' : ''), '');
      if (!during) {
        st.proc = 'up'; st.mem = st.disk; st.starts++; st.rd = true;
        push('Line 3, continued: start the server again. The server program is run again and creates a new process, and the new process reads in the source file from the beginning when it starts. The file now says ' + J(st.disk) + ', so the new process holds code that answers ' + J(st.disk) + '.' + (edit ? ' The edited code has now come inside the server.' : ' You did not edit the file, so it is the same code as at first.'), edit ? 'good' : '');
        st.rd = false;
      }
    }
    // Line 4: send the request
    st.req = 'sent';
    push('Line 4: the client sends a GET /hello request to the server. It is the same as the request a browser sends when you type the address localhost:8080/hello in the address bar.', '');
    if (during) {
      st.req = 'fail'; st.ans = 'Connection refused error';
      push('The server was stopped, so no program accepts connections at address 8080. The client gets a connection refused error and receives no reply. The file on the disk says ' + J(dnow) + ', but that does not matter for this request.', 'bad');
      result.response = 'Connection refused error'; result.running = 'None (server stopped)';
    } else {
      var stale = st.mem !== st.disk;
      st.req = 'got'; st.ans = st.mem;
      if (stale) push('The code the server process holds answers ' + J(st.mem) + ', so the client receives ' + J(st.mem) + '. The file on the disk says ' + J(st.disk) + ', but the server did not read the file again, so it is not reflected in the answer.', 'bad');
      else push('The server answers ' + J(st.mem) + ' with the code its process holds, and the client receives ' + J(st.mem) + '. The text in the file on the disk is also still ' + q(st.disk) + ', so the file and the code inside the server are the same.' + (edit ? ' The edited new version answered the request.' : ' You never edited the file, so it is still the first version.'), edit ? 'good' : '');
      result.response = st.mem; result.running = st.mem;
    }
    // Line 5: start the server again (after the request)
    if (during) {
      st.proc = 'up'; st.mem = st.disk; st.starts++; st.rd = true; st.req = 'sent'; st.ans = '';
      push('Line 5: start the server again. The new process reads in the source file when it starts. The file now says ' + J(st.disk) + ', so the new process holds code that answers ' + J(st.disk) + '. The request in line 4, sent while the server was stopped, had already failed. A request sent after the server started again got the answer ' + J(st.disk) + '.' + (edit ? '' : ' You did not edit the file, so it is the same version as at first.'), 'good');
      st.rd = false; st.req = 'got'; st.ans = st.mem;
    }
    // Summary
    if (edit && rs && !during) {
      sum.push('A running server runs on the code it read in when it started. After you edit the source file, if you stop the server and start it again, the new process reads the edited file and answers ' + J(V2) + '. Making a new version really run like this is deployment. What is different from only editing the code is line 3 (stop and start the server).');
      sum.push('Editing (line 2) and starting again (line 3) are different jobs. You need both for the new code to answer requests.');
    } else if (edit && !rs) {
      sum.push('The source file changed to ' + J(V2) + ', but the server keeps answering ' + J(V1) + '. A running server runs on the code it read in when it started, so even if you edit the file, it does not change until you start the server again.');
      sum.push('The file on the disk and the code that is running are separate. A state where you only edited the file is not yet a deployment.');
    } else if (edit && during) {
      sum.push('A request sent while the server is stopped fails with a connection refused error, because there is no process to receive it. A request that arrived after the server started again got the answer ' + J(V2) + ', the edited code.');
      sum.push('If there is only one server, the service stops while it is stopped and started. How to remove this gap is covered in the in-depth lab "Deployment strategies".');
    } else if (!edit && rs && !during) {
      sum.push('If you stop and start the server without editing the source file, the new process reads the same file, so ' + J(V1) + ' answers. Stopping and starting does not change the code.');
      sum.push('For new code to run, you need both editing the file and starting the server again.');
    } else if (!edit && !rs) {
      sum.push('You changed nothing, so ' + J(V1) + ' answers. The server keeps running on the code it read in at first.');
      sum.push('The code inside the server changes only by starting the server again, and what it reads then is the source file at that moment. If either one is missing, the new version does not reach the requests.');
    } else {
      sum.push('A request sent while the server is stopped fails with a connection refused error. Even after the server started again, you had not edited the source file, so ' + J(V1) + ' answers.');
      sum.push('If you stop and start the server without changing the code, you gain nothing and only create a time when the service is cut off.');
    }
    return { events: ev, summary: sum, row: [result.response, result.running, dnow], later: during ? dnow : '', starts: st.starts, afterEdit: edit ? V1 : '', sameProc: during ? '(not applicable)' : String(!rs) };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from starting the server.'); return; }
    var mem = s.proc === 'up' ? s.mem : s.proc === 'down' ? 'None (server stopped)' : 'Not yet';
    H.table(v, ['Item', 'Now'], [
      { cls: '', cells: ['Source file on disk', s.disk] },
      { cls: s.proc === 'down' ? 'gone' : '', cells: ['Code running', s.proc === 'up' && s.mem !== s.disk ? { v: mem + ' (differs from the file)', cls: 'bad' } : mem] },
      { cls: s.ans ? '' : 'gone', cells: ['Response to the request', s.ans ? { v: s.ans, cls: s.req === 'fail' ? 'bad' : s.ans === s.disk ? 'good' : 'bad' } : 'Not yet'] },
    ], 'Current state');
    H.counters(v, [[s.starts, 'Times the server was started']]);
  },
  // Diagram: on the left the client, in the middle the server process (the code it has read in), on the right the source file on the disk. The file is read into the process only when it starts, and a request goes through the process only. If the server is stopped, the request is cut off.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    var up = s && s.proc === 'up', down = s && s.proc === 'down', stale = up && s.mem !== s.disk;
    P.size(680, 228);
    P.region('cl', 10, 16, 150, 146, 'Client');
    P.box('req', 20, 44, 130, 108, { cls: s && s.req === 'fail' ? 'bad' : s && s.req === 'sent' ? 'wait' : s && s.req === 'got' ? 'good' : 'plain', title: 'Request', sub: !s || !s.req ? ['Idle'] : s.req === 'sent' ? ['GET /hello', 'Awaiting reply'] : s.req === 'fail' ? ['GET /hello', 'Connection', 'refused'] : ['GET /hello', 'Reply received:', s.ans] });
    P.region('sv', 220, 16, 200, 146, 'Server');
    P.box('proc', 230, 44, 180, 108, { cls: down ? 'ghost' : stale && s.req === 'got' ? 'bad' : up ? (s.rd ? 'hot' : 'wait') : 'ghost', title: 'Server process', sub: up ? ['Running', 'Code read in:', s.mem] : down ? ['Stopped'] : ['Not started'] });
    P.region('dk', 480, 16, 190, 146, 'Disk');
    P.box('src', 490, 44, 170, 108, { cls: s && s.ed ? 'hot' : 'plain', title: 'server.js', sub: ['Contents:', s ? s.disk : 'Version 1'] });
    if (s && s.req) P.arrow('rq', 'req:r:0.3', 'proc:l:0.3', { cls: s.req === 'fail' ? 'bad' : 'hot' });
    if (s && s.req === 'got') P.arrow('rs', 'proc:l:0.75', 'req:r:0.75', { cls: stale ? 'bad' : 'good' });
    if (s && s.rd) P.arrow('rd', 'src:l:0.5', 'proc:r:0.5', { cls: 'hot' });
    P.box('n1', 14, 180, 322, 36, { cls: s && s.starts ? 'wait' : 'ghost', title: 'Times the server was started', right: String(s ? s.starts : 0) });
    P.box('n2', 344, 180, 322, 36, { cls: s && s.ans ? (s.req === 'fail' ? 'bad' : s.ans === s.disk ? 'good' : 'bad') : 'ghost', title: 'Response', right: s && s.ans ? s.ans : 'Not yet' });
  },
  assume: 'The server is an http server of Node.js 24.18.0. For each combination I really wrote the server.js file (a short program that reads in the line const answer = \'Version 1\' when it starts and answers that value when a request arrives) and really started node server.js as a child process. The code on the screen is not the program that was run but a list of what a person does, and the Probe ran this list line by line as it is. Starting means starting the child process, editing means really rewriting the server.js file, stopping means ending that process, and the request is GET /hello with the http module. I ran all six combinations (the different ones among the eight settings, since without the line that starts the server again you cannot choose when to send the request) and checked against the model the response to the request (or the connection refused error), the value the live process held at that time (asked with a separate request), the value written in the file on the disk at that time, whether the process after stopping and starting is a different process from the first, the number of times the server was started, whether the value held by the first process was still the same even after waiting 0.5s after editing the file, and, for the combination that sent the request while the server was stopped, the answer to one more request sent after it was started again. I also checked for each combination that the code on the screen is the same text as the list the Probe ran. Within one combination, the same port was used after stopping and starting, and localhost:8080 on the screen is an example address; in the real runs a free port was taken once. The server in this lab is a short program that reads the file only once, when it starts, so tools that read it in again by themselves when the file changes (such as automatic restart tools for development) and programs that read the file at every request were not covered. What I checked against documentation is the Caching section of Modules in the Node.js documentation (a module is cached after it is first loaded, and unless the require cache is changed, calling the same module several times does not run the module code several times) and Deployments in the Kubernetes documentation (the introduction that a Deployment manages declarative updates of Pods, and in the Strategy section that Recreate ends all the existing Pods before creating new Pods and RollingUpdate replaces them gradually). I only read the two documents, and that a server runs on the code it read in when it started was checked not by the documents but by the runs above. The Caching section of the Node.js documentation is about modules loaded with require, and the server.js of this lab is a start file run directly with the node command, so I do not write that the documentation decides the behavior of server.js. Not covered: how to remove the gap while a server is stopped and started (rolling several machines one after another, blue-green, which builds a whole new environment, and so on) is covered in the in-depth lab "Deployment strategies", the automation that builds, tests, and puts the edited code on a server is covered in "CI/CD pipelines", and the way that Kubernetes replaces servers packed in containers is covered in "Kubernetes self-healing". In a compiled language such as Java there is one more step, compiling again after you edit the source file, and this lab showed only a Node.js source file, which has no compile step.',
});
