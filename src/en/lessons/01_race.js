Lab.register({
  id: 'race', nav: 'Race condition', cat: 'Concurrency', mode: 'step',
  title: 'Why does count++ lose increments?',
  intro: 'Several threads increment the same variable at the same time. count++ consists of three steps (read, add, and write), so when the steps of different threads are interleaved, increments are lost. A situation like this, where the result depends on the order in which the threads run, is called a race condition.',
  terms: ['Race condition', 'Critical section and mutual exclusion', 'synchronized', 'volatile', 'Visibility', 'Atomicity and CAS (compare-and-swap)', 'Thread safety'], ranks: ['javasync', 'concurrency'],
  controls: [
    { id: 'threads', label: 'Number of threads', type: 'range', min: 2, max: 4, value: 2, fmt: function (v) { return v + ' threads'; } },
    { id: 'loops', label: 'Increments per thread', type: 'range', min: 1, max: 5, value: 3, fmt: function (v) { return v + ''; } },
    { id: 'sync', label: 'Synchronization method', type: 'select', value: 'none', options: [['none', 'None (count++)'], ['volatile', 'volatile only'], ['sync', 'synchronized block'], ['atomic', 'AtomicInteger']] },
    { id: 'order', label: 'Order in which the threads run', type: 'select', value: 'alt', options: [['alt', 'Alternating, one step at a time (most overlap)'], ['rand', 'Interleaved at random'], ['seq', 'One thread finishes before the next starts (no overlap)']], hint: 'In reality the operating system decides the order, and it differs on every run.' },
    { id: 'seed', label: 'Interleaving pattern', type: 'range', min: 1, max: 20, value: 7, fmt: function (v) { return 'Pattern #' + v; }, show: function (c) { return c.order === 'rand'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when 2 threads each run count++ 3 times with no synchronization, alternating one step at a time?', d: 'Alternating execution with no synchronization. Increments are lost.', v: { threads: 2, loops: 3, sync: 'none', order: 'alt', seed: 7 } },
    { t: 'Adding only volatile', q: 'What if you change the synchronization method to volatile only?', d: 'The latest value is visible, but volatile cannot keep the steps from being interleaved.', v: { threads: 2, loops: 3, sync: 'volatile', order: 'alt', seed: 7 } },
    { t: 'Guarding with synchronized', q: 'What if you change the synchronization method to a synchronized block?', d: 'The other threads wait until one thread finishes count++.', v: { threads: 2, loops: 3, sync: 'sync', order: 'alt', seed: 7 } },
    { t: 'Using AtomicInteger', q: 'What if you change the synchronization method to AtomicInteger?', d: 'Without a lock, a thread writes only if the value it read is unchanged (CAS). Otherwise it tries again.', v: { threads: 2, loops: 3, sync: 'atomic', order: 'alt', seed: 7 } },
    { t: 'A lucky run with no overlap', q: 'What if you keep no synchronization but run each thread to completion before the next one starts?', d: 'The result is correct even though there is no synchronization. This is why tests do not catch the bug.', v: { threads: 2, loops: 3, sync: 'none', order: 'seq', seed: 7 } },
    { t: '4 threads at random', q: 'What if you increase the number of threads to 4 and run them interleaved at random?', d: 'Run it several times with different pattern numbers. The result is different each time.', v: { threads: 4, loops: 3, sync: 'none', order: 'rand', seed: 7 } },
  ],
  code: function (c) {
    var decl = { none: 'static int count = 0;', volatile: 'static volatile int count = 0;', sync: 'static int count = 0;\nstatic final Object lock = new Object();', atomic: 'static final AtomicInteger count = new AtomicInteger();' }[c.sync];
    var body = { none: '        count++;                    // read -> add -> write', volatile: '        count++;                    // still three steps with volatile', sync: '        synchronized (lock) {       // only one thread at a time\n            count++;\n        }', atomic: '        count.incrementAndGet();    // inside: read -> CAS, retry on failure' }[c.sync];
    return '// Only the field declarations and the lines inside main are shown (class, main declaration, and imports omitted)\n' + decl + '\n\nRunnable task = () -> {\n    for (int i = 0; i < ' + c.loops + '; i++) {\n' + body + '\n    }\n};\n\n// ' + c.threads + ' threads run the same task at the same time\nfor (int t = 0; t < ' + c.threads + '; t++) {\n    new Thread(task).start();\n}';
  },
  label: function (c) { return { none: 'No synchronization', volatile: 'volatile', sync: 'synchronized', atomic: 'AtomicInteger' }[c.sync] + ' · ' + c.threads + ' threads × ' + c.loops + ' · ' + { alt: 'alternating', rand: 'random (pattern #' + c.seed + ')', seq: 'one after another' }[c.order]; },
  columns: ['Expected value', 'Final value', 'Lost increments', 'Waits and retries'],
  simulate: function (c) {
    var names = 'ABCD', ths = [], count = 0, lost = 0, done = 0, waits = 0, retries = 0, lock = null, ev = [], seed = c.seed * 7919 + 13, rr = 0;
    for (var i = 0; i < c.threads; i++) ths.push({ id: names[i], left: c.loops, phase: 0, local: null, note: 'Not started' });
    function rnd(n) { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); }
    function alive() { return ths.filter(function (t) { return t.left > 0; }); }
    function snap(actor, waiter) { return { count: count, lost: lost, lock: lock, actor: actor, waiter: waiter, ths: ths.map(function (t) { return { id: t.id, left: t.left, local: t.local, phase: t.phase, note: t.note, blocked: !!t.blocked }; }) }; }
    function push(s, k, actor, waiter) { ev.push({ s: s, k: k, snap: snap(actor, waiter) }); }
    function pick() {
      var a = alive();
      if (c.order === 'seq') return a[0];
      if (c.order === 'rand') return a[rnd(a.length)];
      for (var n = 0; n < ths.length; n++) { var t = ths[(rr + n) % ths.length]; if (t.left > 0) { rr = (rr + n + 1) % ths.length; return t; } }
    }
    var guard = 0;
    while (alive().length && guard++ < 2000) {
      var t = pick();
      if (c.sync === 'sync' && lock && lock !== t.id) {
        if (!t.blocked) { t.blocked = true; waits++; t.note = 'Waiting for the lock'; push('Thread ' + t.id + ': It tried to enter the block, but thread ' + lock + ' holds the lock. It waits until the lock is released.', '', null, t.id); }
        t = ths.filter(function (x) { return x.id === lock; })[0];
      }
      if (c.sync === 'atomic') {
        if (t.phase === 0) {
          t.local = count; t.phase = 1; t.note = 'Value read: ' + t.local;
          push('Thread ' + t.id + ': It read the current value, ' + t.local + '. It will change the value to ' + (t.local + 1) + ' only if the value is still the same.', '', t.id);
        } else if (count === t.local) {
          count = t.local + 1; t.left--; t.phase = 0; t.local = null; t.note = t.left ? 'Has ' + t.left + ' more to do' : 'Done';
          push('Thread ' + t.id + ': CAS succeeded. count was still ' + (count - 1) + ', the value that was read, so the thread changed it to ' + count + '. The comparison and the write are done by a single CPU instruction, so no other thread can cut in between them.', 'good', t.id);
        } else {
          retries++; push('Thread ' + t.id + ': CAS failed. The value that was read is ' + t.local + ', but count has changed to ' + count + ' in the meantime. The thread does not overwrite it and reads again from the start.', '', t.id);
          t.phase = 0; t.local = null; t.note = 'Retrying';
        }
        continue;
      }
      if (t.phase === 0) {
        if (c.sync === 'sync' && lock !== t.id) { lock = t.id; t.blocked = false; }
        t.local = count; t.phase = 1; t.note = 'Value read: ' + t.local;
        push('Thread ' + t.id + ': ' + (c.sync === 'sync' ? 'It acquired the lock and ' : 'It ') + 'read count. The value read is ' + t.local + '.', '', t.id);
      } else if (t.phase === 1) {
        t.phase = 2; t.note = 'Computed value: ' + (t.local + 1) + ' (not written yet)';
        push('Thread ' + t.id + ': It added 1 to ' + t.local + ', the value it read, and got ' + (t.local + 1) + '. It has not written the result to count yet.', '', t.id);
      } else {
        var over = count - t.local, nv = t.local + 1; count = nv; done++; lost = done - count; t.left--; t.phase = 0; t.local = null;
        t.note = t.left ? 'Has ' + t.left + ' more to do' : 'Done';
        if (over > 0) { push('Thread ' + t.id + ': It wrote ' + nv + ' to count. But since this thread read the value, other threads had raised count to ' + (nv - 1 + over) + '. The thread overwrote that value with ' + nv + '. Increments lost by this write: ' + over + '.', 'bad', t.id); }
        else if (over < 0) push('Thread ' + t.id + ': It wrote ' + nv + ' to count. After this thread read the value, another thread used a stale value and set count back to ' + (nv - 1 + over) + ', but this thread overwrote that with ' + nv + ' again. Increments finished so far: ' + done + ', but count is ' + count + '.', lost > 0 ? 'bad' : '', t.id);
        else push('Thread ' + t.id + ': It wrote ' + nv + ' to count.' + (c.sync === 'sync' ? ' It releases the lock as it leaves the block.' : ''), '', t.id);
        if (c.sync === 'sync') lock = null;
      }
    }
    var expect = c.threads * c.loops, sum = [];
    if (lost > 0) sum.push('Increments lost: ' + lost + '. Another thread cut in between the read and the write of one thread, so a result computed from a stale value overwrote the newer one. This is a race condition: the result depends on the order in which the threads happen to run.');
    if (c.sync === 'volatile') sum.push('volatile only makes a value written by another thread visible. It does not combine the three steps of read, add, and write into one, so the result is the same as with no synchronization.');
    if (c.sync === 'sync') sum.push('Only one thread at a time can be inside the synchronized block, so the three steps were never broken up. In return, other threads had to wait. Number of waits: ' + waits + '.');
    if (c.sync === 'atomic') sum.push('AtomicInteger does not acquire a lock. Instead, it follows the rule "write only if the value is still the one I read" (CAS), so if another thread changed the value first, it does not overwrite it and tries again.');
    if ((c.sync === 'none' || c.sync === 'volatile') && lost === 0) sum.push('This time the steps did not overlap, so the value is correct. This is not because the code is safe. The order just happened to be favorable. It is why this bug does not show up in tests under light load.');
    return { events: ev, summary: sum, expect: expect, row: [expect, count, lost + '', c.sync === 'sync' ? 'Waits: ' + waits : c.sync === 'atomic' ? 'Retries: ' + retries : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { count: 0, lost: 0, lock: null, ths: [] };
    H.title(v, 'Threads');
    var ln = H.lanes(v), ph = c.sync === 'atomic' ? ['next: read', 'next: CAS'] : ['next: read', 'next: add', 'next: write'];
    for (var i = 0; i < c.threads; i++) {
      var th = s.ths[i], name = 'Thread ' + 'ABCD'[i];
      if (!th) { H.lane(ln, name, 'Not started', 'none'); continue; }
      var txt = th.left === 0 ? 'Done' : th.blocked ? 'Waiting for the lock' : th.note + ' · ' + ph[th.phase];
      H.lane(ln, name, txt, th.left === 0 ? 'good' : th.blocked ? 'wait' : s.actor === th.id ? 'hot' : '');
    }
    H.text(v, 'Yellow marks the thread that just moved, and blue marks a thread that is waiting for the lock.');
  },
  // Diagram: the variable that all threads share at the top center, and the threads below. A thread reads the value, adds to it at its own place, and then writes it back.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { count: 0, lost: 0, lock: null, actor: null, ths: [] }, n = c.threads, w = (648 - (n - 1) * 8) / n, atomic = c.sync === 'atomic', ph = atomic ? ['Next: read', 'Next: CAS'] : ['Next: read', 'Next: add', 'Next: write'];
    P.size(680, 300);
    P.box('cnt', 230, 16, 220, 56, { cls: 'wait', title: 'Shared variable count', sub: 'Current value: ' + s.count });
    if (c.sync === 'sync') P.box('lock', 474, 20, 190, 48, { cls: s.lock ? 'hot' : 'ghost', title: 'Lock', sub: s.lock ? 'Thread ' + s.lock + ' holds it' : 'Free' });
    for (var i = 0; i < n; i++) {
      var th = s.ths[i], id = 'ABCD'.charAt(i), x = 16 + i * (w + 8);
      if (!th) { P.box('th' + id, x, 140, w, 72, { cls: 'plain', title: 'Thread ' + id, sub: ['Not started', ' '] }); continue; }
      var active = s.actor === th.id && th.left !== 0;
      P.box('th' + id, x, 140, w, 72, { cls: th.left === 0 ? 'good' : th.blocked ? 'bad' : active ? 'hot now' : 'plain', title: 'Thread ' + id, sub: [th.left === 0 ? 'Done' : th.blocked ? 'Waiting for lock' : ph[th.phase], 'Value read: ' + (th.local === null ? 'none' : th.local)] });
      if (s.actor === th.id) { if (th.phase === 1) P.arrow('rw', 'cnt:b', 'th' + id + ':t', { label: 'reads' }); else if (th.phase === 0) P.arrow('rw', 'th' + id + ':t', 'cnt:b', { cls: 'hot', label: 'writes' }); }
    }
    P.box('exp', 16, 240, 208, 40, { cls: 'plain', title: 'Expected value', right: String(sim.expect) });
    P.box('now', 236, 240, 208, 40, { cls: 'plain', title: 'Current count', right: String(s.count) });
    P.box('lost', 456, 240, 208, 40, { cls: s.lost ? 'bad' : 'good', title: 'Lost increments', right: s.lost + '' });
    P.note('A thread reads count (the downward arrow), adds 1 at its own place, and then writes the result back (the upward arrow).');
  },
  assume: 'The model is simplified so that only one step of one thread runs at a time. On a real machine with multiple cores, several threads truly run at the same time. The model also assumes that a read always sees the latest value, but with a real ordinary variable, a value written by another thread may not be visible (a visibility problem). In our test run (JDK 21), when real code in which 2 threads each increment 1 million times was run, count++ without synchronization gave a different result every time, from 1,017,250 to 1,892,129, the result still fell short with volatile, and synchronized and AtomicInteger always gave 2,000,000. AtomicInteger is drawn in the order read → CAS → retry on failure, but depending on the CPU, a real JVM sometimes completes this increment with a single instruction, so retries may not be noticeable.',
});
