Lab.register({
  id: 'deploy', nav: 'Deployment strategies', cat: 'Deployment and operations', mode: 'step',
  title: 'How to switch to a new version without interrupting the service',
  intro: 'Four servers are running v1. Depending on how you switch them to v2, it changes whether the service is interrupted during the deployment, how many more servers you need, and how many users are affected if the new version has a problem.',
  terms: ['Rolling, blue-green, and canary deployments', 'Graceful shutdown', 'Health check (liveness, readiness)', 'Load balancer', 'CI/CD'], ranks: ['deploy', 'cloud'],
  controls: [
    { id: 'st', label: 'Deployment strategy', type: 'select', value: 'rolling', options: [['recreate', 'Take everything down, then bring up the new version'], ['rolling', 'Rolling (replace one server at a time)'], ['bluegreen', 'Blue-green (prepare a whole new environment, then switch)'], ['canary', 'Canary (deploy to only some servers first)']] },
    { id: 'bug', label: 'The new version (v2) has a bug', type: 'check', value: false },
    { id: 'grace', label: 'Graceful shutdown is configured', type: 'check', value: true },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens to the service when you deploy a v2 without a bug by rolling, with graceful shutdown configured?', d: 'Rolling deployment. Servers are replaced one at a time, so the service is not interrupted.', v: { st: 'rolling', bug: false, grace: true } },
    { t: 'Take everything down first', q: 'What if you change the deployment strategy to take everything down, then bring up the new version?', d: 'The simplest way, but the service stops in the meantime.', v: { st: 'recreate', bug: false, grace: true } },
    { t: 'Blue-green', q: 'What if you change the deployment strategy to blue-green?', d: 'You need twice the servers, but switching and rolling back are instant.', v: { st: 'bluegreen', bug: false, grace: true } },
    { t: 'A version with a bug, deployed by rolling', q: 'What if v2 has a bug and you deploy by rolling as before?', d: 'Until you notice the problem, the range of impact keeps growing.', v: { st: 'rolling', bug: true, grace: true } },
    { t: 'A version with a bug, deployed as a canary', q: 'What if you deploy as a canary and v2 has a bug?', d: 'Only some requests are affected, and then you roll back.', v: { st: 'canary', bug: true, grace: true } },
    { t: 'Without graceful shutdown', q: 'What if you turn off graceful shutdown?', d: 'Requests in progress are cut off when a server is taken down.', v: { st: 'rolling', bug: false, grace: false } },
  ],
  code: function (c) {
    var k = { recreate: 'strategy:\n  type: Recreate                # takes all the existing ones down, then brings up the new ones', rolling: 'strategy:\n  type: RollingUpdate\n  rollingUpdate:\n    maxUnavailable: 1           # takes down at most 1 server at a time\n    maxSurge: 0', bluegreen: '# Bring up the Deployment of the new version (green) separately,\n# then change the selector of the Service to version: v2 to switch all at once', canary: '# Bring up just 1 server of v2 so that it receives only 25% of all requests,\n# watch the error rate and the response time, then replace the rest' }[c.st];
    return '# Kubernetes Deployment (replicas: 4)\n' + k + '\n\nreadinessProbe:                 # receives requests only when ready\n  httpGet: { path: /actuator/health/readiness, port: 8080 }\n\n# application.yml\nserver.shutdown: ' + (c.grace ? 'graceful         # finishes the requests in progress, then exits' : 'immediate        # exits immediately') + (c.grace ? '\nspring.lifecycle.timeout-per-shutdown-phase: 30s' : '');
  },
  label: function (c) { return { recreate: 'Take everything down first', rolling: 'Rolling', bluegreen: 'Blue-green', canary: 'Canary' }[c.st] + (c.bug ? ' · bug in v2' : '') + (c.grace ? '' : ' · No graceful shutdown'); },
  columns: ['Service interruption', 'Most servers running at once', 'Requests exposed to the bug', 'How to roll back', 'Requests cut off'],
  simulate: function (c) {
    var ev = [], S = ['v1', 'v1', 'v1', 'v1'], G = [], lb = 'v1 servers: 4', down = 'None', maxUp = 4, exposed = 'Not applicable', back = 'Not applicable', cut = 0, sum = [];
    function push(s, k) { var up = S.filter(function (x) { return x === 'v1' || x === 'v2'; }).length + G.filter(function (x) { return x === 'v2'; }).length; if (up > maxUp) maxUp = up; ev.push({ s: s, k: k, snap: { S: S.slice(), G: G.slice(), lb: lb, cut: cut } }); }
    function stop(i) { S[i] = 'Stopping'; var a = S.filter(function (x) { return x === 'v1'; }).length, b = S.filter(function (x) { return x === 'v2'; }).length; lb = 'Servers left: ' + (a + b) + ' (v1: ' + a + ', v2: ' + b + ')'; if (!c.grace) cut += 2; push('Server ' + (i + 1) + ': The load balancer stops sending new requests to this server, and a termination signal is sent to the server. ' + (c.grace ? 'The server finishes the requests in progress and then exits.' : 'It exits immediately. 2 requests in progress got no response and were cut off.'), c.grace ? '' : 'bad'); }
    push('Current state: all 4 servers are v1, and the load balancer spreads the requests evenly.', '');
    if (c.st === 'recreate') {
      for (var i = 0; i < 4; i++) S[i] = 'None'; lb = 'No server to send to'; if (!c.grace) cut += 8; down = 'Yes';
      push('All 4 v1 servers are taken down. There is no server to receive requests, so users see an error page.' + (c.grace ? '' : ' The 8 requests in progress were also cut off.'), 'bad');
      for (var j = 0; j < 4; j++) S[j] = 'Starting'; push('The 4 v2 servers are being brought up. The service stays interrupted until the application is up and passes the readiness check.', 'bad');
      for (var m = 0; m < 4; m++) S[m] = 'v2'; lb = 'v2 servers: 4'; push('The 4 v2 servers are ready. The load balancer starts sending requests.', 'good');
      if (c.bug) { exposed = '100%'; back = 'Take everything down again and bring up v1 (another interruption)'; push('The bug in v2 shows up for all users. To roll back you have to repeat the same process, so the service stops one more time.', 'bad'); }
      sum.push('The procedure is the simplest, but the service stops while you deploy. Use it when two versions must not run at the same time, or for a service that can announce a maintenance window.');
    }
    if (c.st === 'rolling') {
      var stopAt = c.bug ? 2 : 4;
      for (var r = 0; r < stopAt; r++) {
        stop(r); S[r] = 'Starting'; lb = 'Servers left: 3 (v1: ' + (3 - r) + ', v2: ' + r + ')'; push('Server ' + (r + 1) + ': Bringing it up as v2. It receives no requests until it passes the readiness check. In the meantime the other 3 servers carry the load.', '');
        S[r] = 'v2'; lb = 'v1 servers: ' + (3 - r) + ', v2 servers: ' + (r + 1); push('Server ' + (r + 1) + ': Ready. It receives requests again. Now v1 and v2 are serving together, and ' + (r + 1) * 25 + '% of requests go to v2.', c.bug ? 'bad' : '');
      }
      if (c.bug) { exposed = 'Up to 50%'; back = 'Replace the swapped servers back to v1, one at a time'; push('An increase in errors in the requests that went to v2 is found. The deployment is stopped. 50% of requests were already going to the version with the bug.', 'bad'); S[0] = 'v1'; S[1] = 'v1'; lb = 'v1 servers: 4'; push('The 2 swapped servers were put back to v1, one at a time. Rolling back also takes as much time as the deployment did.', ''); }
      else push('All 4 servers are now v2. The service was not interrupted during the deployment.', 'good');
      sum.push('This deploys with no downtime and no extra servers. During the deployment the processing capacity drops, and since v1 and v2 receive requests at the same time, the database schema and the API must be compatible with both versions.');
    }
    if (c.st === 'bluegreen') {
      G = ['Starting', 'Starting', 'Starting', 'Starting']; push('The existing v1 environment (blue) is left as it is, and a new v2 environment (green) of the same size is brought up. It does not receive user requests yet.', '');
      G = ['v2', 'v2', 'v2', 'v2']; push('The 4 green servers are ready. There are 8 servers running now. You can test the green environment before exposing it to users.', '');
      lb = 'v2 servers: 4 (green)'; if (!c.grace) cut += 8; push('The target of the load balancer is switched from blue to green all at once. All requests go to v2.' + (c.grace ? ' The requests in progress on blue are processed to the end.' : ' The connections to blue were cut without waiting for the requests in progress to finish, so 8 requests were cut off.'), c.grace ? 'good' : 'bad');
      if (c.bug) { exposed = '100% (from right after the switch until the rollback)'; back = 'Switch the load balancer back to blue (instant)'; push('The bug in v2 shows up for all users. But the blue environment is still alive.', 'bad'); lb = 'v1 servers: 4 (blue)'; push('The load balancer is turned back to blue. No new servers need to be brought up, so the rollback finishes instantly.', 'good'); G = ['None', 'None', 'None', 'None']; }
      else { S = ['None', 'None', 'None', 'None']; push('After confirming that there is no problem, the blue environment is taken down.', ''); }
      sum.push('Switching and rolling back are done by changing the target of the load balancer, so they finish almost instantly, and there is no stretch where v1 and v2 take requests together for a while as in rolling. Still, at the moment of the switch, new requests go to v2 while the requests in progress on blue finish on v1, so for a very short time both versions answer. Also, you need twice the servers during the deployment, and all users move to the new version at once when you switch.');
    }
    if (c.st === 'canary') {
      stop(0); S[0] = 'Starting'; push('Server 1: Bringing it up as v2.', ''); S[0] = 'v2'; lb = 'v1 servers: 3 (75%), v2 servers: 1 (25%)';
      push('Only one server is v2. Only 25% of all requests go to the new version. Leave it like this and compare the error rate and the response time of v2 with those of v1.', '');
      if (c.bug) { exposed = '25%'; back = 'Replace only the 1 canary server with v1'; push('The error rate of the requests that went to v2 is higher than for v1. Only 25% of the requests were affected.', 'bad'); S[0] = 'v1'; lb = 'v1 servers: 4'; push('The 1 canary server is put back to v1. The other 3 servers were never touched.', 'good'); }
      else { push('The metrics show nothing unusual. The other 3 servers are also replaced with v2, one after another.', 'good'); for (var q = 1; q < 4; q++) { stop(q); S[q] = 'v2'; } lb = 'v2 servers: 4'; push('All 4 servers are now v2.', 'good'); }
      sum.push('Because the new version is verified on a part of the real user requests, the range of impact is small even when there is a problem. But it makes sense only if you have a system to compare the metrics and make decisions (monitoring, automatic rollback).');
    }
    if (!c.grace) sum.push('Without graceful shutdown, requests in progress are cut off the moment a server is taken down (requests cut off: ' + cut + '). Even with a zero-downtime deployment, users see errors. You need to stop new requests first, finish the requests you already accepted, and only then exit.');
    return { events: ev, summary: sum, row: [down, maxUp + '', exposed, back, cut + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { S: ['v1', 'v1', 'v1', 'v1'], G: [], lb: 'v1 servers: 4', cut: 0 };
    var cls = function (x) { return x === 'v1' ? 'q' : x === 'v2' ? 'd' : x === 'None' ? '' : 'b'; };
    H.title(v, sim.c.st === 'bluegreen' ? 'Existing environment (blue)' : 'Servers'); H.slots(v, s.S.map(function (x, i) { return ['Server ' + (i + 1) + ': ' + x, cls(x)]; }), '');
    if (s.G.length) { H.title(v, 'New environment (green)'); H.slots(v, s.G.map(function (x, i) { return ['Server ' + (i + 5) + ': ' + x, cls(x)]; }), ''); }
  },
  // Diagram: the load balancer and the servers. The color of a server is its version, and the server an arrow reaches is the one that receives requests now.
  draw: function (P, sim, shown) {
    var bg = sim.c.st === 'bluegreen', last = shown[shown.length - 1], s = last ? last.snap : { S: ['v1', 'v1', 'v1', 'v1'], G: [], lb: 'v1 servers: 4', cut: 0 };
    var cls = function (x) { return x === 'v1' ? 'wait' : x === 'v2' ? 'good' : x === 'None' ? 'ghost' : 'hot'; }, none = s.lb.indexOf('No server') >= 0, toGreen = bg && s.lb.indexOf('v2') >= 0 && s.lb.indexOf('v1') < 0;
    P.size(680, s.G.length ? 350 : 262);
    P.box('lb', 120, 16, 440, 44, { cls: none ? 'bad' : 'plain', title: 'Load balancer', right: s.lb });
    P.text('ls', 16, 106, bg ? 'Existing environment (blue)' : 'Servers', { cls: 'mut' });
    s.S.forEach(function (x, i) { P.box('s' + i, 16 + i * 166, 116, 150, 56, { cls: cls(x), title: 'Server ' + (i + 1), sub: x }); if (!none && !toGreen && (x === 'v1' || x === 'v2')) P.arrow('to' + i, 'lb:b:' + (0.2 + i * 0.2), 's' + i + ':t'); });
    if (s.G.length) { P.text('lg', 16, 196, 'New environment (green)', { cls: 'mut' }); s.G.forEach(function (x, i) { P.box('g' + i, 16 + i * 166, 206, 150, 56, { cls: cls(x), title: 'Server ' + (i + 5), sub: x }); if (toGreen && x === 'v2') P.arrow('tg' + i, 'lb:b:' + (0.2 + i * 0.2), 'g' + i + ':t', { cls: 'good' }); }); }
    P.box('cut', 16, s.G.length ? 288 : 200, 648, 40, { cls: s.cut ? 'bad' : 'good', title: 'Requests cut off in progress', right: s.cut + '' });
    P.note('Blue is the existing version (v1), green is the new version (v2), and yellow is a server that is being taken down or brought up. Only the servers that the arrows from the load balancer reach receive requests.');
  },
  assume: 'This is a simple setup with 4 servers, replaced one at a time. The bug is assumed to be of a kind that the health check does not filter out and that shows up only after the server receives real requests, and in the rolling deployment it is assumed to be found at the point when 2 servers have been replaced. The requests in progress when a server is taken down are set to 2 per server. The definition of each strategy follows the explanations in the official Kubernetes and Spring Boot documentation.',
});
