Lab.register({
  id: 'jit', nav: 'JIT warmup', cat: 'JVM', mode: 'step',
  title: 'Why are the first requests right after a deployment slow?',
  why: 'If bytecode is only interpreted one instruction at a time, the same file runs on any operating system but runs slowly, and if it is compiled to machine code from the start, it is fast but must be built separately for each operating system and CPU. The JIT compiler picks only the frequently used code while the program runs and turns it into machine code for that machine, so the same bytecode runs much faster than with interpretation alone.',
  use: 'A typical JVM such as HotSpot always does this without being turned on, so developers mostly think about it right after a deployment and when measuring performance. Examples are calling the main APIs in advance before passing requests to a new server, and discarding the first stretch when measuring performance. For short-lived programs where startup speed matters, a method that compiles to machine code in advance, such as a GraalVM native image, is sometimes used.',
  intro: 'Java code is compiled to bytecode, and the JVM runs it by interpreting it one bytecode instruction at a time. The JVM finds the methods that run often and compiles them again, this time to machine code (JIT), and from then on they run much faster.',
  terms: ['JIT compiler', 'Bytecode', 'Java Virtual Machine (JVM)', 'Class loader'], ranks: ['jvm', 'tuning', 'deploy'],
  controls: [
    { id: 'mode', label: 'How the code is run', type: 'select', value: 'jit', options: [['jit', 'Default settings (interpreted, then JIT-compiled)'], ['int', 'JIT turned off (-Xint, interpreted only)'], ['warm', 'Called in advance before requests arrive (warmup)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Why are the first requests right after a deployment slow with the default settings (interpreted, then JIT-compiled)?', d: 'The first batch takes 5.3ms, and the batches after it take about 1.4ms.', v: { mode: 'jit' } },
    { t: 'With JIT turned off', q: 'What if you turn JIT off (-Xint, interpreted only)?', d: 'It never gets faster. About 28ms per batch.', v: { mode: 'int' } },
    { t: 'With a warmup in advance', q: 'What if you call the code in advance before requests arrive (warmup)?', d: 'It is fast from the first user request.', v: { mode: 'warm' } },
  ],
  DATA: { jit: [5349, 1460, 1370, 1371, 1372, 1393, 1371, 1375, 1372, 1380, 1393, 1381], int: [25484, 25396, 29668, 30099, 27911, 29874, 33272, 27138, 26748, 29504, 26585, 27520], warm: [1379, 1573, 1714, 1627, 1423, 1452, 1395, 1443, 1464, 1374, 1377, 1390] },
  code: function (c) {
    return 'public class JitWarmup {                       // a class made up for this example\n    static long work(int n) {                  // the method that was measured (a name made up for this example)\n        long s = 0;\n        for (int i = 0; i < n; i++) s += (i * 31L) ^ (s >>> 3);\n        return s;\n    }\n\n    public static void main(String[] args) {\n        long sink = 0;                         // uses the results so that the calculation is not removed\n' + (c.mode === 'warm' ? '        // right after startup, before requests arrive: call it in advance so that JIT compilation gets under way\n        for (int k = 0; k < 2000; k++) sink += work(1000);\n        // a real server would report "ready" (readiness) here\n\n' : '') + '        for (int batch = 1; batch <= 12; batch++) {\n            long t = System.nanoTime();\n            for (int k = 0; k < 2000; k++) sink += work(1000);   // one batch = 2,000 calls\n            System.out.println("Batch " + batch + ": " + (System.nanoTime() - t) / 1000 + " microseconds");\n        }\n        System.out.println(sink);\n    }\n}\n\n// Run: java ' + (c.mode === 'int' ? '-Xint ' : '') + 'JitWarmup.java';
  },
  label: function (c) { return { jit: 'Default settings', int: 'JIT off (-Xint)', warm: 'Warmed up in advance' }[c.mode]; },
  columns: ['First batch', 'Last batch', 'Slowest batch ÷ fastest batch'],
  simulate: function (c) {
    var D = c.mode === 'int' ? this.DATA.int : c.mode === 'warm' ? this.DATA.warm : this.DATA.jit, ev = [], sum = [], f = function (us) { return (Math.round(us / 100) / 10) + 'ms'; };
    function push(s, k, n) { ev.push({ s: s, k: k, snap: { n: n } }); }
    push('The Java compiler (javac) turns source code into bytecode, not machine code. When the program starts, the interpreter of the JVM interprets and runs this bytecode one instruction at a time. The bytecode runs on any CPU, but this is much slower than running machine code directly.', '', 0);
    if (c.mode === 'warm') push('Before requests arrive, work() was called 2,000 times in advance. During these calls the JVM judges this method to be "code that runs often" and compiles it to machine code. Users do not experience this slow period.', 'good', 0);
    D.forEach(function (us, i) {
      var s = 'Batch #' + (i + 1) + ': ' + f(us) + '.';
      if (c.mode === 'jit' && i === 0) s += ' At first the code is run by the interpreter. The JVM counts how many times the method has been called and how many times the loop has run, and when the counts pass a threshold, it compiles this method to machine code. This batch ran as interpreted execution until the compiled code was ready (the compilation itself runs on another thread).';
      if (c.mode === 'jit' && i === 1) s += ' The code has started to run as compiled machine code. It is 3 to 4 times faster than the first batch. Using the information it gathered while running (such as which branches are taken often), the JVM optimizes the code once more, this time more heavily.';
      if (c.mode === 'int' && i === 0) s += ' The -Xint option turned off the JIT compiler. The interpreter interprets every call.';
      if (c.mode === 'int' && i === 3) s += ' No matter how many times the code repeats, it does not get faster.';
      if (c.mode === 'warm' && i === 0) s += ' From the first batch that the user sees, the code runs with compilation already under way.';
      push(s, c.mode === 'int' ? 'bad' : c.mode === 'jit' && i === 0 ? 'bad' : 'good', i + 1);
    });
    var mx = Math.max.apply(null, D), mn = Math.min.apply(null, D);
    if (c.mode === 'jit') sum.push('The code is the same, but its speed at the start and later is different. The JVM does not compile all the code in advance. It picks only the parts that actually run often and compiles them while the program is running (just-in-time). Because it optimizes based on information from the actual execution, once the code is fully warmed up it runs at a speed close to that of a language compiled in advance.');
    if (c.mode === 'int') sum.push('With interpretation only and no JIT, the code is about 20 times slower (about 28ms) than after compilation (about 1.4ms). The real performance of Java comes from the JIT compiler.');
    if (c.mode === 'warm') sum.push('A warmup means going through the slow period in advance, before user requests arrive. You apply it by calling the main APIs internally a few times right after a deployment, or by sending the ready signal (readiness) only after the warmup.');
    sum.push('Right after a deployment, the code has not been JIT-compiled yet, and on top of that, classes are still being loaded, the connection pool is still being filled, and the caches are empty, so the first requests are especially slow. This is also why traffic is moved to a new server a little at a time and not all at once. When you measure performance, too, discard the first period and look at the values after the code is fully warmed up.');
    return { events: ev, summary: sum, D: D, row: [f(D[0]), f(D[11]), (Math.round(mx / mn * 10) / 10) + '×'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.n : 0, D = sim.D, mx = 37000;
    H.title(v, 'Time taken per batch (one batch = 2,000 calls, bars are scaled to 37ms)'); var ln = H.lanes(v);
    D.forEach(function (us, i) { if (i < n) H.lane(ln, '#' + (i + 1), (Math.round(us / 100) / 10) + 'ms', us > 20000 ? 'bad' : us > 3000 ? 'hot' : 'good', Math.max(0.01, us / mx)); else H.lane(ln, '#' + (i + 1), '', 'none'); });
  },
  assume: 'The numbers were measured by running the code above on JDK 21 in our test environment five times in each of the three ways, and the values shown are from the first run of each. In all five runs, with the default settings the first batch took 5.1 to 5.4ms and the batches after it 1.4 to 1.7ms; when warmed up in advance, the first batch took 1.4 to 1.9ms; and with -Xint each batch took 23 to 36ms. The numbers vary with the CPU and with when the code is run, but the shape is the same: the first period is slow, and the code gets faster after that. A JVM with the default settings applies a light compilation (C1) and a strongly optimizing compilation (C2) in stages.',
});
