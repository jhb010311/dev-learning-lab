Lab.register({
  id: 'k8s', nav: 'Kubernetes self-healing', cat: 'Deployment and operations', mode: 'step',
  title: 'When a container dies, what starts it again?',
  intro: 'In Kubernetes, you write down the state you want, such as "run 3 copies of this application". Kubernetes keeps watching the actual state, and when it differs from the desired state, it corrects it by itself. Replacing a dead Pod with a new one without anyone stepping in, as happens here, is called self-healing.',
  terms: ['Kubernetes', 'Pod, Deployment, and Service', 'Health check (liveness, readiness)', 'Autoscaling', 'Containers and images'], ranks: ['container', 'deploy', 'cloud'],
  controls: [
    { id: 'what', label: 'What happens', type: 'select', value: 'kill', options: [['kill', 'One Pod suddenly dies'], ['node', 'One node (server) dies completely'], ['scale', 'The number of replicas is changed from 3 to 5'], ['hang', 'The application hangs (the process is still alive)'], ['notready', 'The application cannot take requests for a while (database connection lost)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'With 3 replicas, what starts a new Pod when one Pod suddenly dies?', d: 'One Pod dies. A new Pod is created automatically.', v: { what: 'kill' } },
    { t: 'When a node dies', q: 'What if one node (server) dies completely?', d: 'The Pods that were on that node are created again on other nodes.', v: { what: 'node' } },
    { t: 'When you increase the replicas', q: 'What if the number of replicas is changed from 3 to 5?', d: 'You change only the number, and Kubernetes creates as many Pods as are missing.', v: { what: 'scale' } },
    { t: 'The process is alive but hung', q: 'What if the application hangs while the process is still alive?', d: 'The liveness probe fails, so the container is restarted.', v: { what: 'hang' } },
    { t: 'It cannot take requests for a while', q: 'What if the application cannot take requests for a while because the database connection is lost?', d: 'The readiness probe fails, so only the requests are cut off. The container is not restarted.', v: { what: 'notready' } },
  ],
  code: function (c) {
    return 'apiVersion: apps/v1\nkind: Deployment\nmetadata: { name: shop }\nspec:\n  replicas: ' + (c.what === 'scale' ? '5                 # changed from 3 to 5' : '3                 # desired state: always 3') + '\n  template:\n    spec:\n      containers:\n        - name: app\n          image: shop:1.0\n          livenessProbe:        # if it fails, restart the container\n            httpGet: { path: /actuator/health/liveness, port: 8080 }\n          readinessProbe:       # if it fails, only exclude it from request targets\n            httpGet: { path: /actuator/health/readiness, port: 8080 }';
  },
  label: function (c) { return { kill: 'One Pod dies', node: 'One node dies', scale: 'Replicas 3 → 5', hang: 'Application hangs', notready: 'Cannot take requests for a while' }[c.what]; },
  columns: ['What Kubernetes did', 'What a person did', 'Pods after recovery'],
  simulate: function (c) {
    var ev = [], sum = [], want = 3, pods = [{ n: 'shop-a', node: 'Node 1', st: 'Running', svc: true }, { n: 'shop-b', node: 'Node 2', st: 'Running', svc: true }, { n: 'shop-c', node: 'Node 2', st: 'Running', svc: true }], did, human = 'None';
    function push(s, k) { ev.push({ s: s, k: k, snap: { want: want, pods: pods.map(function (p) { return { n: p.n, node: p.node, st: p.st, svc: p.svc }; }) } }); }
    push('This is the normal state. The Deployment says "3 replicas", and 3 Pods are actually running, spread across two of the three nodes (Node 1 and Node 2). The Service divides requests among the three Pods.', '');
    if (c.what === 'kill') {
      pods[1].st = 'Dead'; pods[1].svc = false; push('The shop-b Pod is gone (for example, it was evicted because the node ran short of resources). The Service stops sending requests to this Pod. The actual number of Pods is now 2.', 'bad');
      push('The controller compares the states. Desired: 3, actual: 2. One Pod is missing. No one has to tell it, because this comparison keeps repeating.', '');
      pods[1] = { n: 'shop-d', node: 'Node 1', st: 'Starting', svc: false }; push('A new Pod, shop-d, is created. The scheduler picks a node with room and places the Pod there, and the kubelet on that node starts the container. The Pod that disappeared is not revived. It is replaced with a new one.', '');
      pods[1].st = 'Running'; pods[1].svc = true; push('shop-d passed its readiness probe. The Service starts sending requests to it. There are 3 Pods again.', 'good');
      did = 'Created 1 new Pod'; sum.push('The number of Pods is back to 3 although nobody stepped in. This is self-healing. Treat a Pod as disposable: it can die and be replaced at any time. So keep state in external storage (a volume, a DB, Redis), because files and sessions inside a container are lost when a Pod is replaced, and reach Pods through the fixed name of a Service, not through a Pod\'s IP.');
    }
    if (c.what === 'node') {
      pods[1].st = 'Dead'; pods[1].svc = false; pods[2].st = 'Dead'; pods[2].svc = false; push('Node 2 shut down completely. Contact with shop-b and shop-c, which ran on it, is lost. Only shop-a on Node 1 is left.', 'bad');
      push('The control plane notices that Node 2 is not responding, and after some time it decides that the Pods on that node are gone. Desired: 3, actual: 1.', '');
      pods[1] = { n: 'shop-d', node: 'Node 1', st: 'Starting', svc: false }; pods[2] = { n: 'shop-e', node: 'Node 3', st: 'Starting', svc: false }; push('The 2 missing Pods are created on nodes that are still alive.', '');
      pods[1].st = 'Running'; pods[1].svc = true; pods[2].st = 'Running'; pods[2].svc = true; push('The new Pods become ready and receive requests. In the meantime, shop-a handled all the requests alone.', 'good');
      did = 'Created 2 new Pods on other nodes'; sum.push('To survive a node failure, Pods must be spread across several nodes. If all three had been on one node, the service would have stopped completely for a while.');
    }
    if (c.what === 'scale') {
      want = 5; human = 'Edited the replicas number'; push('An operator changed replicas in the Deployment to 5. All they did was change the number in the "desired state". They did not give any command to create Pods directly.', '');
      push('The controller compares the states. Desired: 5, actual: 3. Two Pods are missing.', '');
      pods.push({ n: 'shop-d', node: 'Node 1', st: 'Starting', svc: false }); pods.push({ n: 'shop-e', node: 'Node 3', st: 'Starting', svc: false }); push('Two new Pods are created.', '');
      pods[3].st = 'Running'; pods[3].svc = true; pods[4].st = 'Running'; pods[4].svc = true; push('They become ready and are added to the Service\'s targets. Requests are now divided among 5 Pods.', 'good');
      did = 'Created 2 new Pods'; sum.push('With Kubernetes, you do not say "what to do" but "what state it should be in" (declarative). The component that changes this number automatically based on CPU usage is the Horizontal Pod Autoscaler (HPA).');
    }
    if (c.what === 'hang') {
      pods[1].st = 'Hung (process alive)'; push('The application in shop-b is deadlocked and does not respond. The process is still alive, so to Kubernetes the container looks "running". If it is left alone, requests sent to this Pod keep failing.', 'bad');
      pods[1].st = 'Liveness probe failed'; pods[1].svc = false; push('The liveness probes that the kubelet sends periodically fail several times in a row. The kubelet decides that "this container is in a state it cannot recover from by itself".', '');
      pods[1].st = 'Restarting container'; push('The kubelet forcibly stops that container and starts it again inside the same Pod.', '');
      pods[1].st = 'Running'; pods[1].svc = true; push('The application comes back up, passes the probe, and receives requests.', 'good');
      did = 'Restarted the container'; sum.push('A liveness probe is meant to catch "problems that a restart fixes". If you put an external dependency such as the database connection into the liveness probe, every Pod would restart endlessly during a database outage, so make it check only the state of the application itself.');
    }
    if (c.what === 'notready') {
      pods[1].st = 'Readiness probe failed'; pods[1].svc = false; push('shop-b lost its database connection and cannot handle requests right now. Its readiness probe fails. Kubernetes removes this Pod from the Service\'s request targets. It leaves the container as it is.', 'bad');
      push('Requests go only to the other two Pods. shop-b is not restarted. It waits to recover on its own. The number of Pods is still 3, so no new Pod is created either.', '');
      pods[1].st = 'Running'; pods[1].svc = true; push('shop-b connected to the database again. When it passes the readiness probe, the Service starts sending requests to it again.', 'good');
      did = 'Removed the Pod from the request targets, then added it back'; sum.push('A readiness probe handles the state of "cannot take requests for a moment but will be fine soon". The same principle holds requests back right after startup, when the application is not fully ready, and during a deployment. The key difference is that a liveness failure means a restart, and a readiness failure means requests are blocked.');
    }
    sum.push('The controller keeps comparing the desired state with the actual state and closes the gap. This loop is the basic principle of how Kubernetes works.');
    return { events: ev, summary: sum, row: [did, human, pods.length + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start.'); return; }
    H.table(v, ['Pod', 'Node', 'Status', 'Does the Service send requests to it?'], s.pods.map(function (p) { return { cls: p.st === 'Dead' ? 'gone' : '', cells: [p.n, p.node, { v: p.st, cls: p.st === 'Running' ? 'good' : p.st === 'Dead' || p.st.indexOf('failed') >= 0 || p.st.indexOf('Hung') >= 0 ? 'bad' : 'hot' }, { v: p.svc ? 'Yes' : 'No', cls: p.svc ? '' : 'bad' }] }; }), 'Pod list');
  },
  // Diagram: the Deployment (desired state) and the Service on top, three nodes and their Pods below. The arrows from the Service point to the Pods that receive requests.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { want: 3, pods: [] }, alive = s.pods.filter(function (p) { return p.st === 'Running'; }).length, to = s.pods.filter(function (p) { return p.svc; }).length, nodeDown = c.what === 'node' && shown.length >= 2;
    P.size(680, 330);
    P.box('dep', 16, 16, 300, 44, { cls: 'plain', title: 'Deployment (desired state)', right: 'Pods: ' + s.want });
    P.box('svc', 364, 16, 300, 44, { cls: 'wait', title: 'Service (divides requests)', right: 'To ' + to });
    P.text('cmp', 16, 84, 'Pods actually running: ' + alive + (alive < s.want ? '. Fewer than desired' : '. Same as desired'), { cls: alive < s.want ? 'bad' : 'good' });
    ['Node 1', 'Node 2', 'Node 3'].forEach(function (name, i) {
      var x = 16 + i * 222, k = 0;
      P.region('node' + i, x, 100, 204, 214, name + (nodeDown && i === 1 ? ' (shut down)' : ''));
      s.pods.forEach(function (p) {
        if (p.node !== name) return; var id = 'pod_' + p.n, st = p.st;
        P.box(id, x + 12, 136 + k * 56, 180, 48, { cls: st === 'Running' ? 'good' : st === 'Dead' || st.indexOf('failed') >= 0 || st.indexOf('Hung') >= 0 ? 'bad' : 'hot', title: p.n, sub: st });
        if (p.svc) P.arrow('rq_' + p.n, 'svc:b:' + (0.2 + i * 0.3), id + (k ? ':r' : ':t'), { cls: 'good' });
        k++;
      });
    });
    P.note('A green arrow points to a Pod that the Service sends requests to. A new Pod gets an arrow only after it is ready.');
  },
  assume: 'This is a simple setup with 3 replicas and three nodes. The time it takes to detect a failure and recover is not shown (after a node failure is detected, it takes several minutes with the default settings before the Pods are moved). The behavior of the Deployment, the controller, and the two kinds of probes follows the explanations in the official Kubernetes documentation. It is not the result of running on a real cluster.',
});
