Lab.register({
  id: 'ratelimit', nav: '요청 수 제한', cat: '대용량 트래픽', mode: 'step',
  title: '초당 5건까지만 받는다는 것의 세 가지 의미',
  why: '요청 수를 제한하지 않으면 처리 능력을 넘는 요청이 몰릴 때 스레드와 DB 커넥션이 바닥나, 모든 요청이 함께 느려지거나 실패한다. 요청 수 제한은 들어오는 입구에서 요청을 세어 기준을 넘는 것을 일을 시작하기 전에 429로 돌려보내, 받아들인 요청만큼은 제대로 처리되게 한다.',
  use: '공개 API에서 API 키나 사용자별로 분당 호출 수를 정할 때, 로그인이나 인증 문자 발송처럼 반복 시도를 막아야 하는 곳에 쓴다. 서버가 여러 대면 각자 센 수가 합쳐지지 않으므로 Redis 같은 공유 저장소나 API 게이트웨이에서 함께 센다(Spring Cloud Gateway의 RequestRateLimiter 필터는 Redis로 세는 토큰 버킷 구현을 제공한다).',
  intro: '요청이 한꺼번에 몰리면 서버를 지키기 위해 일부를 거절합니다(429 Too Many Requests). "초당 5건"이라는 같은 제한도 세는 방법에 따라 통과하는 요청이 달라집니다.',
  terms: ['Rate Limiting', 'HTTP 상태 코드', 'API 게이트웨이'], ranks: ['traffic', 'msa'],
  controls: [
    { id: 'algo', label: '세는 방법', type: 'select', value: 'fixed', options: [['fixed', '고정 윈도 (매 초 정각에 카운터 초기화)'], ['sliding', '슬라이딩 윈도 (최근 1초 동안의 요청 수)'], ['bucket', '토큰 버킷 (토큰 5개, 초당 5개씩 채움)']] },
    { id: 'pat', label: '요청이 들어오는 모양', type: 'select', value: 'edge', options: [['even', '고르게 (초당 8건)'], ['edge', '윈도 경계에 몰림 (0.8~1.2초 사이에 10건)'], ['burst', '한순간에 몰림 (2초에 12건이 동시에)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '매 초 정각에 카운터를 초기화하는 고정 윈도로 초당 5건을 받는데 0.8~1.2초 사이에 10건이 들어오면 어떻게 처리되나', d: '고정 윈도. 경계를 사이에 두고 0.4초 안에 10건이 전부 통과합니다.', v: { algo: 'fixed', pat: 'edge' } },
    { t: '같은 요청을 슬라이딩 윈도로', q: '같은 요청을 슬라이딩 윈도로 세면', d: '어느 1초 구간을 잡아도 5건을 넘지 않습니다.', v: { algo: 'sliding', pat: 'edge' } },
    { t: '토큰 버킷에 순간 몰림', q: '토큰 버킷으로 바꾸고 2초에 12건이 동시에 들어오면', d: '모아 둔 토큰만큼은 한 번에 통과시킵니다.', v: { algo: 'bucket', pat: 'burst' } },
    { t: '고르게 초당 8건', q: '고정 윈도인데 요청이 고르게 초당 8건 들어오면', d: '초과분 3건씩이 거절됩니다.', v: { algo: 'fixed', pat: 'even' } },
    { t: '토큰 버킷에 고른 요청', q: '토큰 버킷으로 바꾸고 요청이 고르게 초당 8건 들어오면', d: '채워지는 속도만큼 꾸준히 통과합니다.', v: { algo: 'bucket', pat: 'even' } },
  ],
  code: function (c) {
    return '// 메서드 안의 줄만 보임 (선언과 import는 생략. tooManyRequests는 예시로 만든 메서드)\n' + this.codeBody(c);
  },
  codeBody: function (c) {
    if (c.algo === 'fixed') return '// redis는 Redis 서버에 명령을 보내는 Jedis 클라이언트 객체 (메서드 이름이 Redis 명령 INCR·EXPIRE와 같다)\n// 고정 윈도: 키 = 사용자 + 현재 초\nString key = "rate:" + userId + ":" + (now / 1000);\nlong count = redis.incr(key);            // 이번 초의 요청 수 +1\nif (count == 1) redis.expire(key, 1);    // 1초 뒤 사라짐\nif (count > 5) return tooManyRequests(); // 429';
    if (c.algo === 'sliding') return '// redis는 Redis 서버에 명령을 보내는 Jedis 클라이언트 객체 (메서드 이름이 Redis 명령 ZREMRANGEBYSCORE·ZCARD·ZADD와 같다)\n// 슬라이딩 윈도: 최근 1초 안의 요청 시각을 모두 기록\nString key = "rate:" + userId;\nredis.zremrangeByScore(key, 0, now - 1000);   // 1초보다 오래된 기록 삭제\nif (redis.zcard(key) >= 5) return tooManyRequests();   // 429\nredis.zadd(key, now, requestId);';
    return '// 토큰 버킷: 용량 5, 초당 5개 보충\nBucket bucket = Bucket.builder()\n    .addLimit(limit -> limit.capacity(5)\n        .refillGreedy(5, Duration.ofSeconds(1)))\n    .build();\n\nif (!bucket.tryConsume(1)) return tooManyRequests();   // 토큰이 없으면 429';
  },
  label: function (c) { return { fixed: '고정 윈도', sliding: '슬라이딩 윈도', bucket: '토큰 버킷' }[c.algo] + ' · ' + { even: '고르게 초당 8건', edge: '경계에 몰림', burst: '한순간에 몰림' }[c.pat]; },
  columns: ['통과', '거절 (429)', '어느 1초 구간에서 통과한 최대 건수'],
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
      if (c.algo === 'fixed') { var w = Math.floor(t); win[w] = (win[w] || 0) + 1; ok = win[w] <= L; why = w + '초대 카운터가 ' + win[w] + (ok ? '입니다. 5 이하이므로 통과.' : ('013678'.indexOf(String(win[w]).slice(-1)) >= 0 ? '이' : '가') + ' 되어 5를 넘었습니다. 거절.'); }
      if (c.algo === 'sliding') { log = log.filter(function (x) { return x > t - 1 + 1e-9; }); ok = log.length < L; why = '직전 1초 동안 통과한 요청이 ' + log.length + '건입니다. ' + (ok ? '5건 미만이므로 통과.' : '이미 5건이므로 거절.'); if (ok) log.push(t); }
      if (c.algo === 'bucket') { tokens = Math.min(L, tokens + (t - lastT) * L); lastT = t; ok = tokens >= 1 - 1e-9; why = '버킷에 토큰이 ' + (Math.floor(tokens * 10 + 1e-6) / 10) + '개 있습니다. ' + (ok ? '하나를 쓰고 통과.' : '1개가 안 되므로 거절.'); if (ok) tokens -= 1; }
      res.push({ t: t, ok: ok });
      push(fmt(t) + '초에 요청 ' + (i + 1) + ': ' + why, ok ? '' : 'bad');
    });
    var pass = res.filter(function (r) { return r.ok; }), rej = res.length - pass.length, peak = 0;
    pass.forEach(function (p) { var n = pass.filter(function (q) { return q.t >= p.t - 1e-9 && q.t < p.t + 1 - 1e-9; }).length; if (n > peak) peak = n; });
    if (c.algo === 'fixed') sum.push(peak > L ? '고정 윈도는 정각마다 카운터가 0으로 돌아가므로, 경계 직전과 직후에 몰리면 짧은 시간에 제한의 두 배까지 통과합니다. 구현이 가장 단순하고 메모리도 적게 쓰는 대신 이런 틈이 있습니다.' : '고정 윈도는 구현이 단순합니다. 요청이 윈도 경계에 몰리면 순간적으로 제한의 두 배까지 통과할 수 있습니다.');
    if (c.algo === 'sliding') sum.push('슬라이딩 윈도는 어느 1초 구간을 잡아도 5건을 넘지 않아 가장 정확합니다. 대신 요청마다 시각을 기록해야 해서 메모리와 연산이 더 듭니다.');
    if (c.algo === 'bucket') sum.push('토큰 버킷은 평소에 쓰지 않은 토큰을 용량만큼 모아 두었다가, 요청이 몰리면 그만큼은 한꺼번에 통과시킵니다. 그 뒤로는 토큰이 채워지는 속도(초당 5건)로만 통과합니다. 순간적인 몰림을 어느 정도 허용하면서 평균 속도를 지키고 싶을 때 씁니다.');
    sum.push('거절할 때는 429 상태 코드와 함께 언제 다시 시도하면 되는지(Retry-After 헤더)를 알려 주는 것이 좋습니다. 서버가 여러 대면 카운터를 Redis 같은 공용 저장소에 둬야 제한이 서버 수만큼 늘어나지 않습니다.');
    return { events: ev, summary: sum, n: res.length, row: [pass.length + '건', rej + '건', peak + '건'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], res = last ? last.snap.res : [], ok = res.filter(function (r) { return r.ok; }).length;
    H.counters(v, [[res.length + ' / ' + sim.n, '도착한 요청 / 보낼 요청 전체'], [ok, '통과'], [res.length - ok, '거절 (429)']]);
    [0, 1, 2].forEach(function (sec) { var it = res.filter(function (r) { return Math.floor(r.t) === sec; }); H.title(v, sec + '초 ~ ' + (sec + 1) + '초 사이에 도착한 요청'); H.slots(v, it.map(function (r, i) { return [r.t.toFixed(2), (r.ok ? 'd' : 'r') + (r === res[res.length - 1] ? ' now' : '')]; }), '없음', true); });
    H.text(v, '칸의 숫자는 도착 시각(초)입니다. 초록은 통과, 빨강은 거절.');
  },
  // 그림: 시간 축 위에 도착한 요청을 점으로 찍는다. 같은 시각에 몰린 요청은 위로 쌓인다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], res = last ? last.snap.res : [], ok = res.filter(function (r) { return r.ok; }).length, count = {}, algo = sim.c.algo;
    P.size(680, 300);
    [0, 1, 2].forEach(function (sec) { P.region('w' + sec, 16 + sec * 218, 16, 212, 220, sec + '초 ~ ' + (sec + 1) + '초'); });
    res.forEach(function (r, i) { var slot = Math.round(r.t * 20), kth = count[slot] = (count[slot] || 0) + 1, x = 20 + Math.min(r.t, 2.99) / 3 * 640 - 5; P.box('rq' + i, Math.max(18, Math.min(652, x)), 226 - kth * 14, 11, 11, { cls: (r.ok ? 'good' : 'bad') + (i === res.length - 1 ? ' now' : '') }); });
    P.box('ok', 16, 250, 318, 34, { cls: 'good', title: '통과', right: ok + '건' });
    P.box('no', 346, 250, 318, 34, { cls: res.length - ok ? 'bad' : 'ghost', title: '거절 (429)', right: (res.length - ok) + '건' });
    P.note('점 하나가 요청 하나이고, 왼쪽에서 오른쪽으로 시간이 흐릅니다. 초록은 통과, 빨강은 거절입니다. ' + (algo === 'fixed' ? '고정 윈도는 점선 경계에서 카운터를 0으로 되돌리므로, 경계 양쪽에 몰린 요청이 한도의 두 배까지 통과할 수 있습니다.' : algo === 'sliding' ? '슬라이딩 윈도는 점선 경계와 관계없이 "지금부터 1초 전까지"를 셉니다.' : ''));
  },
  assume: '제한은 초당 5건으로 고정했습니다. 세 알고리즘의 동작은 널리 쓰이는 정의를 따랐습니다. 슬라이딩 윈도는 요청 시각을 모두 기록하는 방식(슬라이딩 윈도 로그)으로 구현했고, 토큰 버킷은 시간이 흐른 만큼 연속적으로 토큰이 채워진다고 보았습니다. 실제 서비스에서는 사용자나 IP, API 키 단위로 따로 셉니다. 고정 윈도와 슬라이딩 윈도는 자바나 스프링이 따로 주는 API가 없어 Redis 명령으로 직접 짠 모습을 보였습니다. 코드의 redis는 Jedis 클라이언트 객체이고, 메서드 이름과 인자는 Jedis 문서와 대조했을 뿐 Redis 서버로 실행하지는 않았습니다.',
});
