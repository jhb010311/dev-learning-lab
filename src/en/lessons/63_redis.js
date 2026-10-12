Lab.register({
  id: 'redis', nav: 'Redis single-threaded execution', cat: 'High traffic', mode: 'step',
  title: 'If one command is slow, everyone waits',
  intro: 'Redis runs commands one at a time, in order, on a single thread. That is why each command runs without anything cutting in, even without locks, but if one command takes a long time, every command behind it has to wait in line.',
  terms: ['Redis', 'Cache', 'Atomicity and CAS (compare-and-swap)', 'Event loop'], ranks: ['nosql', 'cache'],
  controls: [
    { id: 'slow', label: 'Command that cuts in partway', type: 'select', value: 'keys', options: [['none', 'None (fast commands only)'], ['keys', 'KEYS user:* (scans all 1 million keys)'], ['scan', 'Scanning in pieces with SCAN (1,000 at a time)'], ['big', 'Reading a whole list of 500,000 elements (LRANGE 0 -1)']] },
    { id: 'incr', label: 'Two clients send INCR to the same key at the same time', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens to the other clients when a KEYS user:* command cuts in partway?', d: 'One KEYS command stops the other clients for 0.5s each.', v: { slow: 'keys', incr: false } },
    { t: 'With fast commands only', q: 'What if only fast commands run and no other command cuts in?', d: 'Every command finishes within 1ms.', v: { slow: 'none', incr: false } },
    { t: 'Switching to SCAN', q: 'What if you scan with SCAN, 1,000 keys at a time, instead of KEYS?', d: 'It runs in small pieces, so other commands can cut in between them.', v: { slow: 'scan', incr: false } },
    { t: 'Reading a large collection whole', q: 'What if you read a whole list of 500,000 elements with LRANGE 0 -1 instead of KEYS?', d: 'Even without KEYS, the same thing happens when a value is large.', v: { slow: 'big', incr: false } },
    { t: 'INCR at the same time', q: 'What if no command cuts in and two clients send INCR to the same key at the same time?', d: 'The commands run one at a time, so no increment is lost.', v: { slow: 'none', incr: true } },
  ],
  code: function (c) {
    var s = { none: '', keys: '\n// Admin script\nSet<String> keys = redis.keys("user:*");          // scans all the keys at once', scan: '\n// Admin script\nScanOptions opt = ScanOptions.scanOptions().match("user:*").count(1000).build();\ntry (Cursor<String> cur = redis.scan(opt)) {       // in pieces of 1,000\n    cur.forEachRemaining(this::handle);\n}', big: '\n// Batch job\nList<String> all = redis.opsForList().range("events", 0, -1);   // all 500,000' }[c.slow];
    return '// Services A and B: ordinary cache lookups\nString v = redis.opsForValue().get("product:1");   // 0.1ms\n' + (c.incr ? '\n// Services A and B at the same time\nredis.opsForValue().increment("view:1");           // reading + adding + writing is a single command\n' : '') + s;
  },
  label: function (c) { return { none: 'Fast commands only', keys: 'With KEYS', scan: 'With SCAN', big: 'With a large list query' }[c.slow] + (c.incr ? ' · concurrent INCR' : ''); },
  columns: ['Longest wait of a command', 'Total processing time', 'Time the other clients were stalled'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], t = 0, maxWait = 0, stall = 0, q = [], val = 10;
    function add(who, cmd, dur, at) { q.push({ who: who, cmd: cmd, dur: dur, at: at }); }
    add('Service A', 'GET product:1', 0.1, 0); add('Service B', 'GET product:2', 0.1, 0);
    if (c.incr) { add('Service A', 'INCR view:1', 0.1, 0.1); add('Service B', 'INCR view:1', 0.1, 0.1); }
    if (c.slow === 'keys') add('Admin', 'KEYS user:*', 500, 0.2);
    if (c.slow === 'big') add('Batch', 'LRANGE events 0 -1', 300, 0.2);
    if (c.slow === 'scan') add('Admin', 'SCAN 0 MATCH user:* COUNT 1000', 0.5, 0.2);
    add('Service A', 'GET product:3', 0.1, 1); add('Service B', 'SET cart:9 ...', 0.1, 1);
    if (c.slow === 'scan') add('Admin', 'SCAN 1000 ... (next batch)', 0.5, 1.2);
    add('Service A', 'GET product:4', 0.1, 2);
    if (c.slow === 'scan') add('Admin', 'SCAN 2000 ... (next batch, then repeats)', 0.5, 2.2);
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice(), val: val } }); }
    var f = function (x) { return (Math.round(x * 10) / 10) + 'ms'; };
    push('Redis receives the commands of several clients, puts them in a single line, and one thread runs them one by one from the front. The next command starts only after the current one has finished.', '');
    q.forEach(function (x) {
      var start = Math.max(t, x.at), wait = start - x.at; t = start + x.dur; if (wait > maxWait) maxWait = wait; if (wait > 1 && x.who.indexOf('Service') === 0) stall = Math.max(stall, wait);
      var note = '';
      if (x.cmd.indexOf('INCR') === 0) { val++; note = ' The value is now ' + val + '. The whole process of reading, adding, and writing is a single command, so no other command can cut in the middle.'; }
      rows.push({ cells: [x.who, x.cmd, { v: f(wait), cls: wait > 1 ? 'bad' : '' }, { v: f(x.dur), cls: x.dur > 10 ? 'bad' : '' }] });
      push(x.who + ' ' + x.cmd + ': ' + (wait > 1 ? 'After waiting ' + f(wait) + ' for the preceding command to finish, it ran for ' : 'It ran for ') + f(x.dur) + '.' + (x.dur > 10 ? ' While this command runs, Redis cannot process any other command.' : '') + note, x.dur > 10 || wait > 1 ? 'bad' : '');
    });
    if (c.slow === 'keys' || c.slow === 'big') sum.push('A lookup that usually finishes in 0.1ms waited ' + f(stall) + '. All the services connected to Redis slow down at the same time, and if a timeout is set, cache lookups fail one after another. This is why you should avoid commands such as KEYS, reading a large collection whole, and deleting a large key (DEL) on a Redis that is in operation.');
    if (c.slow === 'scan') sum.push('SCAN does not walk through everything at once, but runs in small pieces. Each run is short, so other commands can cut in between. Walking through everything takes longer, but it does not stop the other clients.');
    if (c.slow === 'none') sum.push('Each command finishes very quickly in memory, so even one thread handles tens of thousands of commands per second or more. Having a single thread, with no lock contention and no switching cost, is another reason it is fast.');
    if (c.incr) sum.push('Even when two clients send INCR at the same time, they run one after the other inside Redis, so the value went up by exactly 2. If the application does "read with GET, add, and write with SET," another client can cut in between, but finishing in a single command is safe. When you need to group several commands, use a Lua script or a transaction (MULTI).');
    return { events: ev, summary: sum, row: [f(maxWait), f(t), stall ? f(stall) : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], val: 10 };
    if (s.rows.length) H.table(v, ['Sent by', 'Command', 'Wait time', 'Run time'], s.rows, 'Order in which Redis ran them'); else H.text(v, 'No command has run yet.');
  },
  // Diagram: the commands sent by several clients line up in a single line and are run one after another by one thread.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], val: 10 }, rows = s.rows, n = rows.length;
    P.size(680, 122 + Math.max(1, n) * 32 + (sim.c.incr ? 50 : 0) + 16);
    P.box('th', 16, 16, 648, 38, { cls: 'hot', title: 'Only one thread runs commands', right: 'Runs one command at a time' });
    P.region('ord', 16, 68, 648, 48 + Math.max(1, n) * 32, 'Order of execution (top to bottom)');
    rows.forEach(function (r, i) { var run = P.c(r.cells[3]), waitc = P.c(r.cells[2]); P.box('cmd' + i, 28, 102 + i * 32, 624, 27, { cls: (run === 'bad' ? 'bad' : waitc === 'bad' ? 'hot' : 'good') + (i === n - 1 ? ' now' : ''), title: P.v(r.cells[0]) + ': ' + P.v(r.cells[1]), right: 'Wait ' + P.v(r.cells[2]) + ' · Run ' + P.v(r.cells[3]) }); });
    if (!n) P.text('none', 340, 124, 'No command has run yet', { cls: 'mut', anchor: 'middle' });
    if (sim.c.incr) P.box('val', 16, 128 + Math.max(1, n) * 32, 648, 34, { cls: 'plain', title: 'Value of view:1 (10 at first)', right: String(s.val) });
    P.note('A red row is a command that took long, a yellow row is a command that was delayed because it was waiting for such a command to finish, and a bold border marks the command that just ran.');
  },
  assume: 'The run times of the commands (GET 0.1ms, KEYS 500ms, reading a large list 300ms, one SCAN 0.5ms) are examples to show the difference in size. That Redis runs commands one after another in a single thread, and the recommendation to use SCAN instead of KEYS, follow the official Redis documentation. Since Redis 6, several threads can be used for network I/O, but running commands is still done by one thread. The principle was checked on a real Redis 8.10.2 (1 million keys, a list of 500,000 elements). While KEYS was running, a GET from another client waited up to 186ms, and during the large list query it waited 22ms (usually 3ms or less), and while SCAN walked through in pieces of 1,000, it never exceeded 1.5ms. The final value of INCR sent by two clients at the same time, 20,000 times each, was exactly 40,000. The time values on the screen are examples, not these measured values, and the real times vary with the data size and the hardware.',
});
