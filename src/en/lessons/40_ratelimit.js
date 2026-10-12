Lab.register({
  id: 'ratelimit', nav: 'Rate limiting', cat: 'High traffic', mode: 'step',
  title: 'Three meanings of "accept only 5 requests per second"',
  intro: 'When requests arrive all at once, the server rejects some of them to protect itself (429 Too Many Requests). Even the same limit of "5 requests per second" lets different requests through, depending on how you count.',
  terms: ['Rate limiting', 'HTTP status codes', 'API gateway'], ranks: ['traffic', 'msa'],
  controls: [
    { id: 'algo', label: 'How requests are counted', type: 'select', value: 'fixed', options: [['fixed', 'Fixed window (the counter resets exactly on every second)'], ['sliding', 'Sliding window (the number of requests in the last 1 second)'], ['bucket', 'Token bucket (5 tokens, refilled at 5 per second)']] },
    { id: 'pat', label: 'Shape of the incoming requests', type: 'select', value: 'edge', options: [['even', 'Evenly (8 per second)'], ['edge', 'Piled up at a window boundary (10 requests between 0.8 and 1.2 seconds)'], ['burst', 'All at one instant (12 requests at the same time, at 2 seconds)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when 10 requests arrive between 0.8 and 1.2 seconds at a fixed window that accepts 5 requests per second?', d: 'A fixed window. All 10 requests pass within 0.4 seconds, on both sides of the boundary.', v: { algo: 'fixed', pat: 'edge' } },
    { t: 'The same requests with a sliding window', q: 'What if you count the same requests with a sliding window?', d: 'No 1-second span lets through more than 5 requests.', v: { algo: 'sliding', pat: 'edge' } },
    { t: 'A sudden burst with a token bucket', q: 'What if you switch to a token bucket and 12 requests arrive at the same time, at 2 seconds?', d: 'As many requests as there are saved tokens pass at once.', v: { algo: 'bucket', pat: 'burst' } },
    { t: 'Evenly, 8 per second', q: 'What if a fixed window receives requests evenly, 8 per second?', d: '3 requests over the limit are rejected every second.', v: { algo: 'fixed', pat: 'even' } },
    { t: 'Even requests with a token bucket', q: 'What if you switch to a token bucket and requests arrive evenly, 8 per second?', d: 'Requests keep passing at the speed at which tokens are refilled.', v: { algo: 'bucket', pat: 'even' } },
  ],
  code: function (c) {
    if (c.algo === 'fixed') return '// Fixed window: key = user + the current second\nString key = "rate:" + userId + ":" + (now / 1000);\nlong count = redis.incr(key);            // add 1 to the request count of this second\nif (count == 1) redis.expire(key, 1);    // disappears after 1 second\nif (count > 5) return tooManyRequests(); // 429';
    if (c.algo === 'sliding') return '// Sliding window: record the time of every request in the last 1 second\nString key = "rate:" + userId;\nredis.zremrangeByScore(key, 0, now - 1000);   // delete records older than 1 second\nif (redis.zcard(key) >= 5) return tooManyRequests();   // 429\nredis.zadd(key, now, requestId);';
    return '// Token bucket: capacity 5, refilled at 5 per second\nBucket bucket = Bucket.builder()\n    .addLimit(limit -> limit.capacity(5)\n        .refillGreedy(5, Duration.ofSeconds(1)))\n    .build();\n\nif (!bucket.tryConsume(1)) return tooManyRequests();   // 429 if there is no token';
  },
  label: function (c) { return { fixed: 'Fixed window', sliding: 'Sliding window', bucket: 'Token bucket' }[c.algo] + ' · ' + { even: 'evenly, 8 per second', edge: 'piled up at the boundary', burst: 'all at one instant' }[c.pat]; },
  columns: ['Passed', 'Rejected (429)', 'Most requests passed in any 1-second span'],
  times: function (pat) {
    var t = [], i;
    if (pat === 'even') for (i = 0; i < 24; i++) t.push(Math.round(i * 125) / 1000);
    if (pat === 'edge') { for (i = 0; i < 5; i++) t.push(0.8 + i * 0.04); for (i = 0; i < 5; i++) t.push(1.02 + i * 0.04); for (i = 0; i < 4; i++) t.push(2.2 + i * 0.2); }
    if (pat === 'burst') { for (i = 0; i < 3; i++) t.push(0.3 + i * 0.5); for (i = 0; i < 12; i++) t.push(2); t.push(2.3, 2.6, 2.9); }
    return t.map(function (x) { return Math.round(x * 1000) / 1000; });
  },
  simulate: function (c) {
    var L = 5, ts = this.times(c.pat), ev = [], res = [], sum = [], win = {}, log = [], tokens = L, lastT = 0, fmt = function (x) { return (Math.round(x * 100) / 100).toFixed(2); };
    function push(s, k) { ev.push({ s: s, k: k, snap: { res: res.slice() } }); }
    ts.forEach(function (t, i) {
      var ok, why;
      if (c.algo === 'fixed') { var w = Math.floor(t); win[w] = (win[w] || 0) + 1; ok = win[w] <= L; why = 'The counter for the window starting at ' + w + 's is ' + win[w] + (ok ? '. That is 5 or less, so it passes.' : '. That is over 5, so it is rejected.'); }
      if (c.algo === 'sliding') { log = log.filter(function (x) { return x > t - 1 + 1e-9; }); ok = log.length < L; why = 'Requests that passed in the previous second: ' + log.length + '. ' + (ok ? 'That is fewer than 5, so it passes.' : 'That is already 5, so it is rejected.'); if (ok) log.push(t); }
      if (c.algo === 'bucket') { tokens = Math.min(L, tokens + (t - lastT) * L); lastT = t; ok = tokens >= 1 - 1e-9; why = 'Tokens in the bucket: ' + (Math.floor(tokens * 10 + 1e-6) / 10) + '. ' + (ok ? 'One is used and the request passes.' : 'There is less than 1 token, so it is rejected.'); if (ok) tokens -= 1; }
      res.push({ t: t, ok: ok });
      push('Request #' + (i + 1) + ' at ' + fmt(t) + 's: ' + why, ok ? '' : 'bad');
    });
    var pass = res.filter(function (r) { return r.ok; }), rej = res.length - pass.length, peak = 0;
    pass.forEach(function (p) { var n = pass.filter(function (q) { return q.t >= p.t - 1e-9 && q.t < p.t + 1 - 1e-9; }).length; if (n > peak) peak = n; });
    if (c.algo === 'fixed') sum.push(peak > L ? 'A fixed window resets its counter to 0 at every whole second, so if requests pile up just before and just after a boundary, up to twice the limit passes in a short time. It is the simplest to implement and uses little memory, but it has this gap.' : 'A fixed window is simple to implement. If requests pile up at a window boundary, up to twice the limit can pass for a moment.');
    if (c.algo === 'sliding') sum.push('A sliding window never lets through more than 5 requests in any 1-second span, so it is the most accurate. In exchange, it has to record the time of every request, which takes more memory and more computation.');
    if (c.algo === 'bucket') sum.push('A token bucket saves up the tokens that were not used, up to its capacity, and when requests pile up it lets that many through at once. After that, requests pass only at the speed at which tokens are refilled (5 per second). Use it when you want to allow some bursts while keeping the average rate.');
    sum.push('When you reject a request, it is good to send the 429 status code together with when the client may try again (the Retry-After header). If there are several servers, keep the counter in a shared store such as Redis so that the limit does not grow with the number of servers.');
    return { events: ev, summary: sum, n: res.length, row: ['' + pass.length, '' + rej, '' + peak] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], res = last ? last.snap.res : [], ok = res.filter(function (r) { return r.ok; }).length;
    H.counters(v, [[res.length + ' / ' + sim.n, 'Requests arrived'], [ok, 'Passed'], [res.length - ok, 'Rejected (429)']]);
    [0, 1, 2].forEach(function (sec) { var it = res.filter(function (r) { return Math.floor(r.t) === sec; }); H.title(v, 'Requests that arrived between ' + sec + 's and ' + (sec + 1) + 's'); H.slots(v, it.map(function (r, i) { return [r.t.toFixed(2), (r.ok ? 'd' : 'r') + (r === res[res.length - 1] ? ' now' : '')]; }), 'None', true); });
    H.text(v, 'The number in each cell is the arrival time (in seconds). Green passed and red was rejected.');
  },
  // Diagram: the arrived requests are drawn as dots on a time axis. Requests that arrive at the same time stack upward.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], res = last ? last.snap.res : [], ok = res.filter(function (r) { return r.ok; }).length, count = {}, algo = sim.c.algo;
    P.size(680, 300);
    [0, 1, 2].forEach(function (sec) { P.region('w' + sec, 16 + sec * 218, 16, 212, 220, sec + 's to ' + (sec + 1) + 's'); });
    res.forEach(function (r, i) { var slot = Math.round(r.t * 20), kth = count[slot] = (count[slot] || 0) + 1, x = 20 + Math.min(r.t, 2.99) / 3 * 640 - 5; P.box('rq' + i, Math.max(18, Math.min(652, x)), 226 - kth * 14, 11, 11, { cls: (r.ok ? 'good' : 'bad') + (i === res.length - 1 ? ' now' : '') }); });
    P.box('ok', 16, 250, 318, 34, { cls: 'good', title: 'Passed', right: ok + (ok === 1 ? ' request' : ' requests') });
    P.box('no', 346, 250, 318, 34, { cls: res.length - ok ? 'bad' : 'ghost', title: 'Rejected (429)', right: (res.length - ok) + (res.length - ok === 1 ? ' request' : ' requests') });
    P.note('Each dot is one request, and time flows from left to right. Green passed and red was rejected. ' + (algo === 'fixed' ? 'A fixed window resets its counter to 0 at the dotted boundary, so requests piled up on both sides of the boundary can pass up to twice the limit.' : algo === 'sliding' ? 'A sliding window counts "from now back to 1 second ago", regardless of the dotted boundary.' : ''));
  },
  assume: 'The limit is fixed at 5 requests per second. The behavior of the three algorithms follows widely used definitions. The sliding window is implemented by recording the time of every request (a sliding window log), and the token bucket assumes that tokens are refilled continuously as time passes. A real service counts separately for each user, IP address, or API key.',
});
