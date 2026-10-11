Lab.register({
  id: 'deadlock', nav: 'Deadlock', cat: 'Concurrency', mode: 'step',
  title: 'Two threads wait for each other, and both stop',
  intro: 'Thread 1 transfers money from account A to B, and thread 2 transfers from B to A. To make a transfer, a thread must acquire the locks of both accounts. Depending on the order in which the locks are acquired and on the timing, the two threads can stop forever, each waiting for the lock that the other holds.',
  terms: ['Deadlock', 'Critical section and mutual exclusion', 'synchronized', 'Heap dump and thread dump'], ranks: ['concurrency', 'os', 'javasync'],
  controls: [
    { id: 'ord', label: 'Order in which thread 2 acquires the locks', type: 'select', value: 'BA', options: [['BA', 'B first, then A (the sending account first)'], ['AB', 'A first, then B (always in a fixed order)']] },
    { id: 'time', label: 'Timing of the two threads', type: 'select', value: 'overlap', options: [['overlap', 'Both start at the same time'], ['seq', 'Thread 2 starts after thread 1 has finished']] },
    { id: 'tryl', label: 'Limit the time spent waiting for a lock (tryLock)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', d: 'The threads acquire the locks in opposite orders and start at the same time. The result is a deadlock.', v: { ord: 'BA', time: 'overlap', tryl: false } },
    { t: 'Using the same lock order', d: 'Both threads acquire A first. One waits, and they finish one after the other.', v: { ord: 'AB', time: 'overlap', tryl: false } },
    { t: 'When the timing does not overlap', d: 'The orders are opposite, but both threads finish without a problem. That is why tests do not catch it.', v: { ord: 'BA', time: 'seq', tryl: false } },
    { t: 'Limiting the waiting time', d: 'A thread that cannot acquire a lock releases the lock it holds and tries again.', v: { ord: 'BA', time: 'overlap', tryl: true } },
  ],
  code: function (c) {
    if (c.tryl) { var x = c.ord === 'AB' ? 'first' : 'from', y = c.ord === 'AB' ? 'second' : 'to';
      return 'boolean transfer(Account from, Account to, long amount) throws InterruptedException {\n' + (c.ord === 'AB' ? '    Account first  = from.id < to.id ? from : to;   // the smaller number first\n    Account second = from.id < to.id ? to : from;\n' : '') + '    ' + x + '.lock.lock();\n    try {\n        if (!' + y + '.lock.tryLock(1, TimeUnit.SECONDS)) {\n            return false;                 // give up if not acquired -> the caller retries\n        }\n        try {\n            from.withdraw(amount);\n            to.deposit(amount);\n            return true;\n        } finally { ' + y + '.lock.unlock(); }\n    } finally { ' + x + '.lock.unlock(); }     // releases the lock it holds\n}\n\n// Thread 1: transfer(A, B, 100)\n// Thread 2: transfer(B, A, 50)'; }
    var sorted = c.ord === 'AB';
    return 'void transfer(Account from, Account to, long amount) {\n' + (sorted ? '    // always lock the account with the smaller number first\n    Account first  = from.id < to.id ? from : to;\n    Account second = from.id < to.id ? to : from;\n    synchronized (first) {\n        synchronized (second) {\n' : '    synchronized (from) {                 // lock the sending account first\n        synchronized (to) {\n') + '            from.withdraw(amount);\n            to.deposit(amount);\n        }\n    }\n}\n\n// Thread 1: transfer(A, B, 100)\n// Thread 2: transfer(B, A, 50)';
  },
  label: function (c) { return 'Thread 2: ' + (c.ord === 'BA' ? 'B → A' : 'A → B') + ' · ' + (c.time === 'overlap' ? 'start at the same time' : 'run one after the other') + (c.tryl ? ' · tryLock' : ''); },
  columns: ['Result', 'Transfers completed', 'Lock waits', 'Retries'],
  simulate: function (c) {
    var ev = [], own = { A: null, B: null }, st = { 1: 'Not started', 2: 'Not started' }, done = 0, waits = 0, retries = 0, dead = false, sum = [];
    var o1 = ['A', 'B'], o2 = c.ord === 'BA' ? ['B', 'A'] : ['A', 'B'];
    function push(s, k) { ev.push({ s: s, k: k, snap: { own: { A: own.A, B: own.B }, st: { 1: st[1], 2: st[2] }, done: done } }); }
    function take(t, l) { own[l] = t; st[t] = 'Holds the ' + l + ' lock'; }
    function finish(t, o) { st[t] = 'Transfer completed'; own[o[0]] = null; own[o[1]] = null; done++; push('Thread ' + t + ': It holds both locks, so it performs the withdrawal and the deposit and then releases both locks. The transfer is completed.', 'good'); }
    function runAlone(t, o) { take(t, o[0]); push('Thread ' + t + ': It acquired the lock of account ' + o[0] + '.', ''); own[o[1]] = t; st[t] = 'Holds the ' + o[0] + ' and ' + o[1] + ' locks'; push('Thread ' + t + ': It also acquired the lock of account ' + o[1] + '. There is no other thread to wait for.', ''); finish(t, o); }
    if (c.time === 'seq') { runAlone(1, o1); runAlone(2, o2); sum.push('The two transfers did not overlap, so there was no problem regardless of the lock order.' + (c.ord === 'BA' ? ' But the code is just as dangerous as before. A deadlock shows up only at the moment when the two threads interleave in exactly the wrong way, so it is not reproduced in tests under low load and then occurs in production.' : '')); }
    else if (c.ord === 'AB') {
      take(1, 'A'); push('Thread 1: It acquired the lock of account A.', '');
      st[2] = 'Waiting for the A lock'; waits++; push('Thread 2: Following the fixed order, it tries to acquire account A first. Thread 1 holds that lock, so thread 2 waits. Thread 2 does not hold any lock yet.', '');
      own.B = 1; st[1] = 'Holds the A and B locks'; push('Thread 1: It acquired the lock of account B. Thread 2 does not hold B, so thread 1 is not blocked.', '');
      finish(1, o1); runAlone(2, o2);
      sum.push('When every thread acquires the locks in the same order (A, then B), one thread only waits for a moment, and no cycle forms in which the threads wait for each other. This is the most basic way to prevent a deadlock.');
    } else {
      take(1, 'A'); push('Thread 1: It acquired the lock of the sending account, A.', '');
      take(2, 'B'); push('Thread 2: It acquired the lock of the sending account, B.', '');
      st[1] = 'Holds the A lock · Waiting for B'; waits++; push('Thread 1: It tries to acquire the lock of the receiving account, B. Thread 2 holds it, so thread 1 waits. It keeps holding the lock of A.', '');
      st[2] = 'Holds the B lock · Waiting for A'; waits++;
      if (!c.tryl) { dead = true; push('Thread 2: It tries to acquire the lock of the receiving account, A. Thread 1 holds it, so thread 2 waits. Thread 1 waits for thread 2, and thread 2 waits for thread 1. Neither releases its lock first, so the wait never ends. This is a deadlock.', 'bad');
        sum.push('A deadlock occurred. Neither transfer finishes, and the two threads are stopped without even an exception. If you take a thread dump, you can see them as threads in the BLOCKED state, each waiting for the lock that the other holds.'); sum.push('A deadlock occurs when four conditions all hold: a resource that only one thread can use at a time, holding one resource while waiting for another, no way to take a resource away from its holder, and waits that form a cycle. It is enough to break just one of them. Using the same lock order breaks the cycle, and tryLock breaks "holding while waiting".');
      } else {
        push('Thread 2: It tries to acquire the lock of the receiving account, A. Thread 1 holds it, so thread 2 waits. At this point each thread is waiting for the other.', 'bad');
        own.A = null; st[1] = 'Gave up, retries shortly'; retries++; push('Thread 1: It waited 1 second and still could not acquire the lock of B. tryLock returns false, and thread 1 releases the lock of A that it was holding.', '');
        own.A = 2; st[2] = 'Holds the B and A locks'; push('Thread 2: The lock of A was released, so thread 2 acquired it.', ''); finish(2, o2);
        st[1] = 'Retrying'; runAlone(1, o1);
        sum.push('When the waiting time is limited, the thread that could not acquire the lock releases the lock it holds, and the cycle is broken. In return, you need code that retries the failed operation, and the retry intervals are made slightly different so that the two threads do not keep giving up and retrying at the same time.');
      }
    }
    sum.unshift(dead ? 'Result: deadlock. Transfers completed: 0.' : 'Result: all ' + done + ' transfers were completed. Lock waits: ' + waits + ', retries: ' + retries + '.');
    return { events: ev, summary: sum, row: [dead ? 'Deadlock' : 'Completed normally', done + '', waits + '', retries + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { own: { A: null, B: null }, st: { 1: 'Not started', 2: 'Not started' }, done: 0 };
    var w1 = s.st[1].indexOf('Waiting') >= 0, w2 = s.st[2].indexOf('Waiting') >= 0, dead = w1 && w2 && s.own.A === 1 && s.own.B === 2;
    H.title(v, 'Threads'); var ln = H.lanes(v);
    [1, 2].forEach(function (t2) { var x = s.st[t2]; H.lane(ln, 'Thread ' + t2, x + (t2 === 1 ? '  (A → B, amount 100)' : '  (B → A, amount 50)'), x === 'Transfer completed' ? 'good' : x.indexOf('Waiting') >= 0 ? (dead ? 'bad' : 'wait') : x === 'Not started' ? 'none' : 'hot'); });
    H.table(v, ['Lock', 'Thread that holds it', 'Thread that waits for it'], ['A', 'B'].map(function (l) { var waiter = [1, 2].filter(function (t2) { return s.st[t2].indexOf('Waiting for ' + l) >= 0 || s.st[t2].indexOf('Waiting for the ' + l + ' lock') >= 0; }); return { cells: ['Account ' + l, { v: s.own[l] ? 'Thread ' + s.own[l] : 'None', cls: s.own[l] ? 'hot' : '' }, { v: waiter.length ? 'Thread ' + waiter[0] : 'None', cls: waiter.length ? (dead ? 'bad' : '') : '' }] }; }), 'State of the locks');
    if (dead) H.text(v, 'Thread 1 → (waits for B) → Thread 2 → (waits for A) → Thread 1. The waits form a cycle.');
    H.counters(v, [[s.done + ' / 2', 'Transfers completed']]);
  },
  // Diagram: the two threads and the two locks are placed in a diamond shape. An arrow from a lock to a thread means "holds", and an arrow from a thread to a lock means "waits".
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { own: { A: null, B: null }, st: { 1: 'Not started', 2: 'Not started' }, done: 0 };
    var waits = function (t, l) { return s.st[t].indexOf('Waiting for ' + l) >= 0 || s.st[t].indexOf('Waiting for the ' + l + ' lock') >= 0; }, dead = waits(1, 'B') && waits(2, 'A') && s.own.A === 1 && s.own.B === 2;
    P.size(680, 310);
    [1, 2].forEach(function (t) { var x = s.st[t], p = x.split(' · '); P.box('T' + t, t === 1 ? 24 : 456, 104, 200, 66, { cls: x === 'Transfer completed' ? 'good' : x.indexOf('Waiting') >= 0 ? (dead ? 'bad' : 'wait') : x === 'Not started' ? 'plain' : 'hot', title: 'Thread ' + t + (t === 1 ? ' (A → B)' : ' (B → A)'), sub: [p[0], p[1] || ' '] }); });
    ['A', 'B'].forEach(function (l) {
      P.box('L' + l, 250, l === 'A' ? 24 : 204, 180, 46, { cls: s.own[l] ? 'hot' : 'plain', title: 'Account ' + l + ' lock', sub: s.own[l] ? 'Thread ' + s.own[l] + ' holds it' : 'Free' });
      [1, 2].forEach(function (t) {
        var side = t === 1 ? 'l' : 'r', tside = l === 'A' ? 't' : 'b';
        if (s.own[l] === t) P.arrow('e' + t + l, 'L' + l + ':' + side, 'T' + t + ':' + tside, { cls: 'hot', label: 'holds' });
        else if (waits(t, l)) P.arrow('e' + t + l, 'T' + t + ':' + tside, 'L' + l + ':' + side, { cls: dead ? 'bad dash' : 'dash', label: 'waits' });
      });
    });
    P.box('done', 16, 266, 648, 34, { cls: dead ? 'bad' : s.done === 2 ? 'good' : 'plain', title: dead ? 'The waits form a cycle, and no thread can proceed (deadlock)' : 'Transfers completed', right: s.done + ' / 2' });
    P.note('A solid arrow means that the thread holds the lock, and a dashed arrow means that the thread is waiting for that lock. If following the arrows brings you back to where you started, there is a cycle, and that is a deadlock.');
  },
  assume: 'The model assumes the worst order, in which the two threads interleave exactly: each acquires its first lock and then requests its second lock. In reality, the timing more often lets the threads pass without a problem, and that is why a deadlock is hard to reproduce. synchronized cannot limit the waiting time, so when a limit is needed, use tryLock of ReentrantLock. In a database too, the same thing happens when two transactions lock rows in opposite orders, and the database detects it and forces one of them to roll back. This was checked by actually running it on JDK 21 on this PC. When the locks were acquired in opposite orders at the same time, the two threads stopped in the BLOCKED state and the JVM detected 2 deadlocked threads. When the locks were acquired in the same order, or the threads ran one after the other, both finished, and with tryLock both finished after 1 retry.',
});
