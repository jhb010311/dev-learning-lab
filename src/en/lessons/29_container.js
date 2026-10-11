Lab.register({
  id: 'container', nav: 'Containers and virtual machines', cat: 'Deployment and operations', mode: 'step',
  title: 'Why are containers lightweight and quick to start?',
  intro: 'When you start several copies of the same application, a virtual machine loads a whole operating system for every instance, while containers share the kernel of the host. Change the type and the number, and compare what gets loaded and how much memory is used. Also see what happens when you put a memory limit on a container.',
  terms: ['Containers and images', 'Containers versus virtual machines', 'Namespaces and cgroups'], ranks: ['container', 'cloud', 'deploy'],
  controls: [
    { id: 'kind', label: 'Isolation type', type: 'select', value: 'container', options: [['vm', 'Virtual machine'], ['container', 'Container']] },
    { id: 'n', label: 'Number of instances to start', type: 'range', min: 1, max: 6, value: 3, fmt: function (v) { return v + ''; } },
    { id: 'limit', label: 'Container memory limit', type: 'select', value: '1024', options: [['256', '256MB'], ['512', '512MB'], ['1024', '1GB']], show: function (c) { return c.kind === 'container'; }, hint: 'The application uses about 400MB while running.' },
  ],
  presets: [
    { t: 'Default settings', d: '3 containers. They share the kernel of the host.', v: { kind: 'container', n: 3, limit: '1024' } },
    { t: 'The same thing as virtual machines', d: 'One more operating system is loaded for each instance.', v: { kind: 'vm', n: 3, limit: '1024' } },
    { t: 'Increase to 6', d: 'Virtual machines. The share taken by operating systems becomes 6 times as large.', v: { kind: 'vm', n: 6, limit: '1024' } },
    { t: '6 containers', d: 'It grows only by as much as the application uses.', v: { kind: 'container', n: 6, limit: '1024' } },
    { t: 'Memory limit of 256MB', d: 'The application tries to use 400MB and is killed.', v: { kind: 'container', n: 1, limit: '256' } },
  ],
  code: function (c) {
    if (c.kind === 'vm') return '# Virtual machines: ' + c.n + '\n# Each VM: virtual hardware + guest OS (including a kernel) + JDK + app.jar\n\n$ ssh vm-1\n$ java -jar app.jar';
    return '# Dockerfile\nFROM eclipse-temurin:21-jre           # a base image that includes a JRE\nCOPY build/libs/app.jar app.jar\nENTRYPOINT ["java", "-jar", "app.jar"]\n\n# Run (containers: ' + c.n + ')\n$ docker run -d --memory=' + c.limit + 'm my-app:1.0';
  },
  label: function (c) { return (c.kind === 'vm' ? 'Virtual machines: ' : 'Containers: ') + c.n + (c.kind === 'container' ? ' · limit ' + c.limit + 'MB' : ''); },
  columns: ['Operating systems (kernels) loaded', 'Memory used', 'What it takes to start one instance', 'Result'],
  simulate: function (c) {
    var vm = c.kind === 'vm', APP = 400, OS = 1024, ev = [], layers = [], inst = [], mem = 0, killed = false, sum = [];
    function push(s, k) { ev.push({ s: s, k: k, snap: { layers: layers.slice(), inst: inst.slice(), mem: mem } }); }
    layers.push(['Hardware (CPU, memory, disk)', '']); layers.push(['Host operating system (kernel)', '']); mem = OS;
    push('The host operating system is running on one physical server. You want to start ' + c.n + (c.n === 1 ? ' application instance' : ' application instances') + ' on it, isolated from each other.', '');
    if (vm) {
      layers.push(['Hypervisor (creates the virtual hardware)', 'hot']); push('The hypervisor divides the physical resources and creates virtual computers (virtual hardware).', '');
      for (var i = 1; i <= c.n; i++) { inst.push(['VM ' + i, 'Booting guest OS', 'b']); mem += OS; push('VM ' + i + ': The guest operating system is booted from scratch on the virtual hardware. Loading the kernel and starting the system services takes tens of seconds, and the operating system alone uses about 1GB of memory.', ''); inst[i - 1] = ['VM ' + i, 'Guest OS (kernel) + JDK + app', 'd']; mem += APP; push('VM ' + i + ': After the boot finishes, the application runs inside it. This VM has its own kernel, so it is completely separated from the other VMs.', ''); }
      sum.push('Operating systems (kernels) loaded: 1 for the host, plus ' + c.n + ' for the guests. Of the total memory of about ' + mem + 'MB, the guest operating systems account for ' + c.n * OS + 'MB.');
      sum.push('A virtual machine holds a whole operating system for each instance, so it is heavy and slow to start, but even the kernel is separated, so the isolation is strong. It can also run a different kind of operating system.');
    } else {
      layers.push(['Container runtime (such as Docker)', 'hot']); push('The container runtime does not create virtual hardware. It only runs processes in isolation, using features of the host kernel.', '');
      for (var j = 1; j <= c.n; j++) {
        inst.push(['Container ' + j, 'Preparing image', 'b']); push('Container ' + j + ': The image (a bundle of the application and the files it needs to run) is set up read-only, and a process is started on top of it. No operating system is booted, so it takes only as long as starting one process. Containers share the same image.', '');
        if (+c.limit < APP) { inst[j - 1] = ['Container ' + j, 'OOMKilled (memory limit exceeded)', 'r']; killed = true; push('Container ' + j + ': The application tried to use 400MB, but the limit is ' + c.limit + 'MB. The kernel (cgroups) kills a process that goes over its limit. It is not a Java OutOfMemoryError; the whole process disappears.', 'bad'); }
        else { inst[j - 1] = ['Container ' + j, 'Process (JDK + app) · limit ' + c.limit + 'MB', 'd']; mem += APP; push('Container ' + j + ': Running. Thanks to namespaces, this process appears to have its own file system, network, and process list, but in reality it is an ordinary process on the host kernel.', 'good'); }
      }
      sum.push('There is only one operating system (kernel), the host\'s. The total memory is about ' + mem + 'MB, and for each container only the amount that the application uses was added.');
      sum.push('Containers share the kernel, so they are lightweight and start quickly. In return, the isolation is weaker than that of a virtual machine, and they work only with the same kind of kernel as the host. Namespaces divide "what you can see," and cgroups divide "how many resources you can use."');
      if (killed) sum.push('If a container uses more than its memory limit, it is killed (OOMKilled). The heap size of the JVM has to be set to fit within the container limit. Recent JVMs recognize the container limit and set the default heap size from it, but some memory is also used outside the heap, so you need to leave some room.');
    }
    return { events: ev, summary: sum, row: [(vm ? 1 + c.n : 1) + '', 'About ' + mem + 'MB', vm ? 'Boot the operating system + start the app' : 'Start a process', killed ? 'Killed (OOMKilled)' : 'Runs normally'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { layers: [], inst: [], mem: 0 };
    H.counters(v, [[s.inst.length, 'Instances started'], ['About ' + s.mem + 'MB', 'Memory used']]);
    H.title(v, 'Instances (upper layer)'); H.slots(v, s.inst.map(function (x) { return [x[0] + ': ' + x[1], x[2]]; }), 'None yet');
    H.title(v, 'Lower layers (the reverse of the order they were stacked)'); var ln = H.lanes(v);
    s.layers.slice().reverse().forEach(function (l, i) { H.lane(ln, 'Layer ' + (s.layers.length - i), l[0], l[1] || ''); });
  },
  // Diagram: layers stacked from the bottom to the top. A virtual machine has one more operating system layer for each instance, and a container has only the process.
  draw: function (P, sim, shown) {
    var c = sim.c, vm = c.kind === 'vm', last = shown[shown.length - 1], s = last ? last.snap : { layers: [], inst: [], mem: 0 }, n = c.n, w = (648 - (n - 1) * 8) / n;
    P.size(680, 330);
    P.text('kc', 16, 60, 'Operating systems (kernels): ' + (s.layers.length >= 2 ? 1 + (vm ? s.inst.length : 0) : 0), { bold: true });
    P.text('mem', 664, 60, 'Memory used: about ' + s.mem + 'MB', { anchor: 'end', cls: 'mut' });
    s.layers.forEach(function (l, i) { P.box('layer' + i, 16, 280 - i * 38, 648, 34, { cls: l[1] === 'hot' ? 'hot' : 'plain', title: l[0], center: true }); });
    s.inst.forEach(function (x, j) {
      var ix = 16 + j * (w + 8), state = x[1];
      P.region('ins' + j, ix, 80, w, 118, x[0]);
      if (vm) {
        P.box('os' + j, ix + 7, 154, w - 14, 34, { cls: state.indexOf('Booting') >= 0 ? 'hot' : 'wait', title: 'Guest OS', center: true });
        if (state.indexOf('app') >= 0) P.box('app' + j, ix + 7, 114, w - 14, 34, { cls: 'good', title: 'JDK + app', center: true });
      } else P.box('app' + j, ix + 7, 138, w - 14, 50, state.indexOf('OOM') >= 0 ? { cls: 'bad', title: 'OOMKilled', sub: 'Over limit', center: true } : state.indexOf('image') >= 0 ? { cls: 'hot', title: 'Preparing', sub: ' ', center: true } : { cls: 'good', title: 'JDK + app', sub: 'Max ' + c.limit + 'MB', center: true });
    });
    if (!s.layers.length) P.text('hint', 340, 180, 'Click Run to stack the layers from the bottom', { cls: 'mut', anchor: 'middle' });
    P.note(vm ? 'These are layers stacked from the bottom to the top. A virtual machine has its own blue "Guest OS" layer for each instance. It is that much heavier and slower to start, but the instances are completely separated from each other.' : 'These are layers stacked from the bottom to the top. A container has no Guest OS layer, and all the containers share the one host kernel at the very bottom. The dotted boxes are the scopes isolated from each other.');
  },
  assume: 'The memory figures (about 1GB for a guest operating system, about 400MB for the application) and the boot times are rough examples to show the direction of the difference, and the real values vary a great deal depending on the setup. That containers share the host kernel and are isolated with namespaces and cgroups, and that the kernel kills a process when it goes over its limit, follow the explanations in the Docker and Linux kernel documentation. Docker Desktop on Windows or Mac keeps one Linux virtual machine inside and runs the containers in it.',
});
