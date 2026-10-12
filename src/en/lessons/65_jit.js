Lab.register({
  id: 'jit', nav: 'JIT warmup', cat: 'JVM', mode: 'step',
  title: 'Why are the first requests right after a deployment slow?',
  intro: 'Java code is compiled to bytecode, and the JVM runs it by interpreting it one bytecode instruction at a time. The JVM finds the methods that run often and compiles them again, this time to machine code (JIT), and from then on they run much faster.',
  terms: ['JIT compiler', 'Bytecode', 'Java Virtual Machine (JVM)', 'Class loader'], ranks: ['jvm', 'tuning', 'deploy'],
  controls: [
    { id: 'mode', label: 'How the code is run', type: 'select', value: 'jit', options: [['jit', 'Default settings (interpreted, then JIT-compiled)'], ['int', 'JIT turned off (-Xint, interpreted only)'], ['warm', 'Called in advance before requests arrive (warmup)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Why are the first requests right after a deployment slow with the default settings (interpreted, then JIT-compiled)?', d: 'The first batch takes 5.8ms, and the batches after it take about 1.4ms.', v: { mode: 'jit' } },
    { t: 'With JIT turned off', q: 'What if you turn JIT off (-Xint, interpreted only)?', d: 'It never gets faster. About 29ms per batch.', v: { mode: 'int' } },
    { t: 'With a warmup in advance', q: 'What if you call the code in advance before requests arrive (warmup)?', d: 'It is fast from the first user request.', v: { mode: 'warm' } },
  ],
  DATA: { jit: [5765, 1694, 1369, 1651, 1484, 1368, 1535, 1403, 1373, 1436, 1609, 1725], int: [28000, 31416, 28925, 25281, 36973, 28376, 28920, 29169, 26738, 31654, 28077, 32120] },
  code: function (c) {
    return 'static long work(int n) {                  // the method that was measured\n    long s = 0;\n    for (int i = 0; i < n; i++) s += (i * 31L) ^ (s >>> 3);\n    return s;\n}\n\n' + (c.mode === 'warm' ? '// right after startup, before requests arrive\nfor (int k = 0; k < 2000; k++) work(1000);   // call it in advance so that JIT compilation is already done\nreadiness.set(true);                        // only then report "ready"\n\n' : '') + 'for (int batch = 1; batch <= 12; batch++) {\n    long t = System.nanoTime();\n    for (int k = 0; k < 2000; k++) work(1000);          // one batch = 2,000 calls\n    print((System.nanoTime() - t) / 1000 + " microseconds");\n}\n\n// Run: java ' + (c.mode === 'int' ? '-Xint ' : '') + 'JitWarmup.java';
  },
  label: function (c) { return { jit: 'Default settings', int: 'JIT off (-Xint)', warm: 'Warmed up in advance' }[c.mode]; },
  columns: ['First batch', 'Last batch', 'Slowest batch ÷ fastest batch'],
  simulate: function (c) {
    var D = c.mode === 'int' ? this.DATA.int : c.mode === 'warm' ? this.DATA.jit.slice(1).concat([1377]) : this.DATA.jit, ev = [], sum = [], f = function (us) { return (Math.round(us / 100) / 10) + 'ms'; };
    function push(s, k, n) { ev.push({ s: s, k: k, snap: { n: n } }); }
    push('The Java compiler (javac) turns source code into bytecode, not machine code. When the program starts, the interpreter of the JVM interprets and runs this bytecode one instruction at a time. The bytecode runs on any CPU, but this is much slower than running machine code directly.', '', 0);
    if (c.mode === 'warm') push('Before requests arrive, work() was called 2,000 times in advance. During these calls the JVM judges this method to be "code that runs often" and compiles it to machine code. Users do not experience this slow period.', 'good', 0);
    D.forEach(function (us, i) {
      var s = 'Batch #' + (i + 1) + ': ' + f(us) + '.';
      if (c.mode === 'jit' && i === 0) s += ' At first the code is run by the interpreter. The JVM counts how many times the method has been called and how many times the loop has run, and when the counts pass a threshold, it compiles this method to machine code. This batch includes both the interpreted execution and the compilation time.';
      if (c.mode === 'jit' && i === 1) s += ' The code has started to run as compiled machine code. It is 3 to 4 times faster than the first batch. Using the information it gathered while running (such as which branches are taken often), the JVM optimizes the code once more, this time more heavily.';
      if (c.mode === 'int' && i === 0) s += ' The -Xint option turned off the JIT compiler. The interpreter interprets every call.';
      if (c.mode === 'int' && i === 3) s += ' No matter how many times the code repeats, it does not get faster.';
      if (c.mode === 'warm' && i === 0) s += ' From the first batch that the user sees, the code already runs as compiled code.';
      push(s, c.mode === 'int' ? 'bad' : c.mode === 'jit' && i === 0 ? 'bad' : 'good', i + 1);
    });
    var mx = Math.max.apply(null, D), mn = Math.min.apply(null, D);
    if (c.mode === 'jit') sum.push('The code is the same, but its speed at the start and later is different. The JVM does not compile all the code in advance. It picks only the parts that actually run often and compiles them while the program is running (just-in-time). Because it optimizes based on information from the actual execution, once the code is fully warmed up it runs at a speed close to that of a language compiled in advance.');
    if (c.mode === 'int') sum.push('With interpretation only and no JIT, the code is about 20 times slower (about 29ms) than after compilation (about 1.4ms). The real performance of Java comes from the JIT compiler.');
    if (c.mode === 'warm') sum.push('A warmup means going through the slow period in advance, before user requests arrive. You apply it by calling the main APIs internally a few times right after a deployment, or by sending the ready signal (readiness) only after the warmup.');
    sum.push('Right after a deployment, the code has not been JIT-compiled yet, and on top of that, classes are still being loaded, the connection pool is still being filled, and the caches are empty, so the first requests are especially slow. This is also why traffic is moved to a new server a little at a time and not all at once. When you measure performance, too, discard the first period and look at the values after the code is fully warmed up.');
    return { events: ev, summary: sum, D: D, row: [f(D[0]), f(D[11]), (Math.round(mx / mn * 10) / 10) + '×'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.n : 0, D = sim.D, mx = 37000;
    H.title(v, 'Time taken per batch (one batch = 2,000 calls, bars are scaled to 37ms)'); var ln = H.lanes(v);
    D.forEach(function (us, i) { if (i < n) H.lane(ln, '#' + (i + 1), (Math.round(us / 100) / 10) + 'ms', us > 20000 ? 'bad' : us > 3000 ? 'hot' : 'good', Math.max(0.01, us / mx)); else H.lane(ln, '#' + (i + 1), '', 'none'); });
  },
  assume: 'All the numbers are values measured by actually running the code above on JDK 21 on this PC (the first of two runs with the default settings, and one run with -Xint). The "Warmed up in advance" setting treats the first batch of the default-settings measurement as the warmup and shows the values after it. The numbers vary with the CPU and with when the code is run, but the shape is the same: the first period is slow, and the code gets faster after that. A JVM with the default settings applies a light compilation (C1) and a strongly optimizing compilation (C2) in stages.',
});
