Lab.register({
  id: 'redis', nav: 'Redis의 한 줄 처리', cat: '대용량 트래픽', mode: 'step',
  title: '명령 하나가 느리면 모두가 기다린다',
  why: '자주 읽는 값을 매번 DB에서 가져오면 디스크와 쿼리 비용이 쌓이고, 애플리케이션 서버 각자의 메모리에 두면 서버가 여러 대일 때 서로 다른 값을 보게 된다. Redis는 여러 서버가 네트워크로 함께 접속하는 메모리 저장소로, 키 하나로 값을 바로 꺼내 DB 조회보다 가볍고 모든 서버가 같은 값을 보게 한다.',
  use: '상품 정보나 조회 결과를 몇 분 동안 보관해 DB 조회를 줄이는 캐시, 서버 여러 대가 같은 로그인 정보를 보는 세션 저장소, 조회수나 좋아요 수를 INCR로 세는 카운터에 흔히 쓴다. 잃으면 안 되는 원본 데이터나 여러 조건을 섞은 검색은 관계형 DB에 두고, Redis에는 다시 만들 수 있는 값을 두는 것이 보통이다.',
  intro: 'Redis는 명령을 스레드 하나가 한 번에 하나씩 차례로 실행합니다. 그래서 락 없이도 명령 하나하나가 끼어들 틈 없이 실행되지만, 오래 걸리는 명령이 하나 끼면 그 뒤의 모든 명령이 줄을 섭니다.',
  terms: ['Redis', '캐시', '원자성(Atomicity)과 CAS', '이벤트 루프'], ranks: ['nosql', 'cache'],
  controls: [
    { id: 'slow', label: '중간에 끼어드는 명령', type: 'select', value: 'keys', options: [['none', '없음 (빠른 명령만)'], ['keys', 'KEYS user:* (키 100만 개를 전부 훑음)'], ['scan', 'SCAN으로 나눠서 훑음 (COUNT 1000)'], ['big', '원소 50만 개짜리 리스트 통째로 조회 (LRANGE 0 -1)']] },
    { id: 'incr', label: '두 클라이언트가 같은 키에 동시에 INCR을 보낸다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '중간에 KEYS user:* 명령이 끼어들면 다른 클라이언트는 어떻게 되나', d: 'KEYS 한 번에 다른 클라이언트들이 0.5초씩 멈춥니다.', v: { slow: 'keys', incr: false } },
    { t: '빠른 명령만 있을 때', q: '끼어드는 명령 없이 빠른 명령만 있으면', d: '모든 명령이 1ms 안에 끝납니다.', v: { slow: 'none', incr: false } },
    { t: 'SCAN으로 바꾸면', q: 'KEYS 대신 SCAN으로 조금씩(COUNT 1000) 나눠서 훑으면', d: '조금씩 나눠 실행해서 사이사이에 다른 명령이 끼어들 수 있습니다.', v: { slow: 'scan', incr: false } },
    { t: '큰 컬렉션을 통째로 읽으면', q: 'KEYS 대신 원소 50만 개짜리 리스트를 LRANGE 0 -1로 통째로 조회하면', d: 'KEYS가 아니어도 값이 크면 같은 일이 생깁니다.', v: { slow: 'big', incr: false } },
    { t: '동시에 INCR', q: '끼어드는 명령 없이 두 클라이언트가 같은 키에 동시에 INCR을 보내면', d: '한 줄로 실행되므로 증가가 사라지지 않습니다.', v: { slow: 'none', incr: true } },
  ],
  code: function (c) {
    var s = { none: '', keys: '\n// 관리자 스크립트\nSet<String> keys = redis.keys("user:*");          // 전체 키를 한 번에 훑는다', scan: '\n// 관리자 스크립트\nScanOptions opt = ScanOptions.scanOptions().match("user:*").count(1000).build();\ntry (Cursor<String> cur = redis.scan(opt)) {       // 조금씩 나눠 훑는다. count(1000)은 한 번에 훑을 양의 힌트\n    cur.forEachRemaining(this::handle);            // handle은 예시로 만든 메서드\n}', big: '\n// 배치 작업\nList<String> all = redis.opsForList().range("events", 0, -1);   // 50만 개 전부' }[c.slow];
    return '// 필요한 부분만 남김. redis는 스프링의 StringRedisTemplate\n\n// 서비스 A, B: 평범한 캐시 조회\nString v = redis.opsForValue().get("product:1");   // 0.1ms\n' + (c.incr ? '\n// 서비스 A, B가 동시에\nredis.opsForValue().increment("view:1");           // 읽기+더하기+쓰기가 명령 하나\n' : '') + s;
  },
  label: function (c) { return { none: '빠른 명령만', keys: 'KEYS 포함', scan: 'SCAN 포함', big: '큰 리스트 조회 포함' }[c.slow] + (c.incr ? ' · 동시 INCR' : ''); },
  columns: ['가장 오래 기다린 명령', '전체 처리 시간', '다른 클라이언트가 멈춘 시간'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], t = 0, maxWait = 0, stall = 0, q = [], val = 10;
    function add(who, cmd, dur, at) { q.push({ who: who, cmd: cmd, dur: dur, at: at }); }
    add('서비스 A', 'GET product:1', 0.1, 0); add('서비스 B', 'GET product:2', 0.1, 0);
    if (c.incr) { add('서비스 A', 'INCR view:1', 0.1, 0.1); add('서비스 B', 'INCR view:1', 0.1, 0.1); }
    if (c.slow === 'keys') add('관리자', 'KEYS user:*', 500, 0.2);
    if (c.slow === 'big') add('배치', 'LRANGE events 0 -1', 300, 0.2);
    if (c.slow === 'scan') add('관리자', 'SCAN 0 MATCH user:* COUNT 1000', 0.5, 0.2);
    add('서비스 A', 'GET product:3', 0.1, 1); add('서비스 B', 'SET cart:9 ...', 0.1, 1);
    if (c.slow === 'scan') add('관리자', 'SCAN <받은 커서> ... (다음 묶음)', 0.5, 1.2);
    add('서비스 A', 'GET product:4', 0.1, 2);
    if (c.slow === 'scan') add('관리자', 'SCAN <받은 커서> ... (커서 0이 올 때까지 반복)', 0.5, 2.2);
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice(), val: val } }); }
    var f = function (x) { return (Math.round(x * 10) / 10) + 'ms'; };
    push('Redis는 여러 클라이언트의 명령을 받아 한 줄로 세운 뒤, 스레드 하나가 앞에서부터 하나씩 실행합니다. 명령 하나가 끝나야 다음 명령을 시작합니다.', '');
    q.forEach(function (x) {
      var start = Math.max(t, x.at), wait = start - x.at; t = start + x.dur; if (wait > maxWait) maxWait = wait; if (wait > 1 && x.who.indexOf('서비스') === 0) stall = Math.max(stall, wait);
      var note = '';
      if (x.cmd.indexOf('INCR') === 0) { val++; note = ' 값은 이제 ' + val + '입니다. 읽고 더하고 쓰는 과정 전체가 명령 하나라서 중간에 다른 명령이 끼어들 수 없습니다.'; }
      rows.push({ cells: [x.who, x.cmd, { v: f(wait), cls: wait > 1 ? 'bad' : '' }, { v: f(x.dur), cls: x.dur > 10 ? 'bad' : '' }] });
      push(x.who + '의 ' + x.cmd + ': ' + (wait > 1 ? '앞의 명령이 끝나기를 ' + f(wait) + ' 기다린 뒤 ' : '') + f(x.dur) + ' 동안 실행됐습니다.' + (x.dur > 10 ? ' 이 명령이 실행되는 동안 Redis는 다른 어떤 명령도 처리하지 못합니다.' : '') + note, x.dur > 10 || wait > 1 ? 'bad' : '');
    });
    if (c.slow === 'keys' || c.slow === 'big') sum.push('평소 0.1ms에 끝나던 조회가 ' + f(stall) + '를 기다렸습니다. Redis에 연결된 모든 서비스가 동시에 느려지고, 타임아웃이 걸려 있으면 캐시 조회가 줄줄이 실패합니다. 운영 중인 Redis에서 KEYS, 큰 컬렉션 통째 조회, 큰 키 삭제(DEL) 같은 명령을 피해야 하는 이유입니다.');
    if (c.slow === 'scan') sum.push('SCAN은 전체를 한 번에 훑지 않고 조금씩 나눠 실행합니다. 한 번의 실행이 짧아서 그 사이에 다른 명령이 끼어들 수 있습니다. 전체를 다 훑는 데는 더 오래 걸리지만 다른 클라이언트를 멈추게 하지 않습니다. COUNT 1000은 한 번에 훑을 양의 힌트일 뿐 돌려줄 키 수가 아닙니다. MATCH를 함께 쓰면 거르고 남은 키만 돌아오므로 한 번에 받는 키가 그보다 적거나 0개일 수도 있습니다. 응답의 커서를 다음 SCAN에 넘기고, 커서가 0으로 돌아오면 끝입니다.');
    if (c.slow === 'none') sum.push('명령 하나하나가 메모리에서 아주 빠르게 끝나기 때문에, 스레드 하나로도 초당 수만 건 이상을 처리합니다. 스레드가 하나라서 락 경쟁과 교대 비용이 없는 것도 빠른 이유입니다.');
    if (c.incr) sum.push('두 클라이언트가 동시에 INCR을 보내도 Redis 안에서는 차례로 실행되므로 값이 정확히 2 올랐습니다. 애플리케이션에서 "GET으로 읽고, 더해서, SET으로 쓰기"를 하면 그 사이에 다른 클라이언트가 끼어들 수 있지만, 명령 하나로 끝내면 안전합니다. 여러 명령을 묶어야 하면 Lua 스크립트나 트랜잭션(MULTI)을 씁니다.');
    return { events: ev, summary: sum, row: [f(maxWait), f(t), stall ? f(stall) : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], val: 10 };
    if (s.rows.length) H.table(v, ['보낸 곳', '명령', '기다린 시간', '실행 시간'], s.rows, 'Redis가 실행한 순서'); else H.text(v, '아직 실행된 명령이 없습니다.');
  },
  // 그림: 여러 클라이언트가 보낸 명령이 한 줄로 서서 스레드 하나에 의해 차례로 실행된다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], val: 10 }, rows = s.rows, n = rows.length;
    P.size(680, 122 + Math.max(1, n) * 32 + (sim.c.incr ? 50 : 0) + 16);
    P.box('th', 16, 16, 648, 38, { cls: 'hot', title: '명령을 실행하는 스레드는 하나뿐', right: '한 번에 명령 하나만 실행' });
    P.region('ord', 16, 68, 648, 48 + Math.max(1, n) * 32, '실행된 순서 (위에서 아래로)');
    rows.forEach(function (r, i) { var run = P.c(r.cells[3]), waitc = P.c(r.cells[2]); P.box('cmd' + i, 28, 102 + i * 32, 624, 27, { cls: (run === 'bad' ? 'bad' : waitc === 'bad' ? 'hot' : 'good') + (i === n - 1 ? ' now' : ''), title: P.v(r.cells[0]) + ': ' + P.v(r.cells[1]), right: '대기 ' + P.v(r.cells[2]) + ' · 실행 ' + P.v(r.cells[3]) }); });
    if (!n) P.text('none', 340, 124, '아직 실행된 명령이 없습니다', { cls: 'mut', anchor: 'middle' });
    if (sim.c.incr) P.box('val', 16, 128 + Math.max(1, n) * 32, 648, 34, { cls: 'plain', title: 'view:1의 값 (처음 10)', right: String(s.val) });
    P.note('빨간 줄은 오래 걸린 명령, 노란 줄은 그 명령이 끝나기를 기다리느라 늦어진 명령, 굵은 테두리는 방금 실행된 명령입니다.');
  },
  assume: '명령의 실행 시간(GET 0.1ms, KEYS 500ms, 큰 리스트 조회 300ms, SCAN 한 번 0.5ms)은 크기의 차이를 보이기 위한 예시입니다. Redis가 명령을 한 스레드에서 차례로 실행한다는 점과 KEYS 대신 SCAN을 쓰라는 권고는 Redis 공식 문서를 따랐습니다. Redis 6부터 네트워크 입출력에는 여러 스레드를 쓸 수 있지만 명령 실행은 여전히 한 스레드입니다. 원리는 실제 Redis 8.10.2에서 확인했습니다(키 100만 개, 원소 50만 개짜리 리스트). KEYS가 도는 동안 다른 클라이언트의 GET이 최대 186ms, 큰 리스트 조회 동안 22ms를 기다렸고(평소에는 3ms 이하), SCAN(COUNT 1000)으로 나눠 훑는 동안에는 1.5ms를 넘지 않았습니다. 두 클라이언트가 같은 키에 20,000번씩 동시에 보낸 INCR의 최종 값은 정확히 40,000이었습니다. 화면의 시간 값은 이 측정값이 아니라 예시이며, 실제 시간은 데이터 크기와 장비에 따라 달라집니다.',
});
