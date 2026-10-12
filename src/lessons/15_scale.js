Lab.register({
  id: 'scale', nav: '로드밸런서와 스케일 아웃', cat: '대용량 트래픽', mode: 'step',
  title: '서버를 늘리면 어디까지 버티나',
  intro: '서버를 더 크게 바꾸는 대신 서버 수를 늘려 부하를 나누는 것이 스케일 아웃입니다. 로드밸런서가 요청을 여러 서버에 나눠 주고, 서버는 요청마다 DB를 한 번씩 씁니다. 서버를 늘려 갈 때 처리량이 어디까지 늘고 어디가 먼저 막히는지 봅니다.',
  terms: ['스케일 업과 스케일 아웃', '로드밸런서', '병목(Bottleneck)', '오토스케일링', 'TPS와 응답 시간 백분위'], ranks: ['traffic', 'cloud'],
  controls: [
    { id: 'rps', label: '초당 들어오는 요청', type: 'range', min: 100, max: 4000, step: 100, value: 1000, fmt: function (v) { return v + '건'; } },
    { id: 'n', label: '애플리케이션 서버 수', type: 'range', min: 1, max: 8, value: 2, fmt: function (v) { return v + '대'; } },
    { id: 'spec', label: '서버 1대의 처리 능력', type: 'select', value: '400', options: [['400', '기본 사양 (초당 400건)'], ['800', '두 배 사양 (초당 800건)']] },
    { id: 'db', label: 'DB의 처리 능력', type: 'select', value: '2000', options: [['1000', '초당 1,000건'], ['2000', '초당 2,000건'], ['4000', '초당 4,000건']] },
    { id: 'down', label: '서버 1대가 죽는다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '초당 1000건 요청을 초당 400건 처리하는 서버 2대와 초당 2,000건 DB가 받으면 어떻게 되나', d: '초당 1,000건에 서버 2대. 서버가 감당하지 못합니다.', v: { rps: 1000, n: 2, spec: '400', db: '2000', down: false } },
    { t: '서버를 3대로 (스케일 아웃)', q: '애플리케이션 서버를 3대로 늘리면', d: '같은 사양의 서버를 한 대 더 붙입니다.', v: { rps: 1000, n: 3, spec: '400', db: '2000', down: false } },
    { t: '서버 사양을 두 배로 (스케일 업)', q: '서버 수는 2대 그대로 두고 서버마다 처리 능력을 초당 800건인 두 배 사양으로 바꾸면', d: '대수는 그대로 2대, 한 대의 성능을 올립니다.', v: { rps: 1000, n: 2, spec: '800', db: '2000', down: false } },
    { t: '서버를 계속 늘리면', q: '초당 요청이 3000건인데 애플리케이션 서버를 8대로 늘리면', d: '초당 3,000건에 서버 8대. 이번에는 DB가 막힙니다.', v: { rps: 3000, n: 8, spec: '400', db: '2000', down: false } },
    { t: '3대 중 1대 장애', q: '애플리케이션 서버를 3대 두었는데 1대가 죽으면', d: '남은 2대가 나눠 받습니다. 여유가 없으면 함께 넘칩니다.', v: { rps: 1000, n: 3, spec: '400', db: '2000', down: true } },
    { t: '서버가 1대뿐일 때 장애', q: '초당 300건 요청에 서버가 1대뿐인데 그 서버가 죽으면', d: '받아 줄 서버가 없어 서비스 전체가 멈춥니다.', v: { rps: 300, n: 1, spec: '400', db: '2000', down: true } },
  ],
  code: function (c) {
    var s = '# 로드밸런서 설정 (nginx 예)\nupstream app {\n';
    for (var i = 1; i <= c.n; i++) s += '    server 10.0.0.' + i + ':8080;' + (c.down && i === c.n ? '   # 응답 없음 -> 제외됨' : '') + '\n';
    return s + '}\nserver {\n    listen 80;\n    location / { proxy_pass http://app; }   # 차례로 돌아가며 전달\n}\n\n# 서버 1대: 초당 ' + c.spec + '건 처리\n# DB: 초당 ' + c.db + '건 처리 (요청 1건에 쿼리 1번)';
  },
  label: function (c) { return '초당 ' + c.rps + '건 · 서버 ' + c.n + '대 × ' + c.spec + (c.down ? ' (1대 장애)' : '') + ' · DB ' + c.db; },
  columns: ['초당 처리량', '처리 못 한 요청', '살아 있는 서버 1대의 부하', '병목'],
  simulate: function (c) {
    var cap = +c.spec, dbCap = +c.db, alive = c.n - (c.down ? 1 : 0), ev = [], sum = [];
    var per = alive ? c.rps / alive : 0, appOut = Math.min(c.rps, alive * cap), out = Math.min(appOut, dbCap), lost = c.rps - out;
    var load = alive ? Math.round(per / cap * 100) : 0, dbLoad = Math.round(appOut / dbCap * 100);
    var neck = alive === 0 ? '서버 없음' : appOut < c.rps && appOut <= dbCap ? '애플리케이션 서버' : out < appOut ? 'DB' : appOut < c.rps ? '애플리케이션 서버' : '없음';
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('초당 ' + c.rps + '건의 요청이 로드밸런서에 도착합니다. 사용자는 서버가 몇 대인지 모르고 로드밸런서의 주소 하나만 압니다.', '', 1);
    if (c.down) push(alive ? '로드밸런서가 주기적으로 서버 상태를 확인(헬스 체크)하다가 서버 ' + c.n + '번이 응답하지 않는 것을 발견하고 대상에서 뺍니다. 남은 ' + alive + '대에만 요청을 보냅니다.' : '헬스 체크 결과 하나뿐인 서버가 응답하지 않습니다. 요청을 보낼 곳이 없습니다.', 'bad', 2);
    if (!alive) { push('모든 요청이 실패합니다. 서버가 한 대뿐이면 그 한 대의 장애가 곧 서비스 전체의 장애입니다(단일 장애 지점).', 'bad', 4); sum.push('처리량 0건. 서버를 2대 이상 두어야 한 대가 죽어도 서비스가 유지됩니다.'); return { events: ev, summary: sum, calc: { alive: 0, per: 0, cap: cap, appOut: 0, out: 0, lost: c.rps, load: 0, dbLoad: 0, dbCap: dbCap, neck: neck }, row: ['0건', c.rps + '건', '-', neck] }; }
    push('로드밸런서가 요청을 살아 있는 서버 ' + alive + '대에 고르게 나눕니다. 서버 한 대가 초당 ' + Math.round(per) + '건을 받습니다. 한 대의 처리 능력은 초당 ' + cap + '건이므로 부하는 ' + load + '%입니다.' + (per > cap ? ' 처리 능력을 넘었습니다. 넘친 요청은 대기하다 시간 초과되거나 거절됩니다.' : ''), per > cap ? 'bad' : '', 3);
    push('서버들이 처리한 초당 ' + appOut + '건이 DB로 갑니다. DB의 처리 능력은 초당 ' + dbCap + '건이므로 부하는 ' + dbLoad + '%입니다.' + (appOut > dbCap ? ' DB가 감당하지 못합니다. 서버는 여유가 있어도 DB 응답을 기다리느라 요청이 밀립니다.' : ''), appOut > dbCap ? 'bad' : '', 4);
    push('결과: 초당 ' + out + '건을 처리하고 ' + lost + '건은 처리하지 못했습니다. ' + (neck === '없음' ? '모든 구간에 여유가 있습니다.' : '병목은 ' + neck + '입니다.'), lost ? 'bad' : 'good', 5);
    sum.push('초당 ' + c.rps + '건 중 ' + out + '건을 처리했습니다(' + (lost ? lost + '건 초과' : '전부 처리') + '). 서버 한 대의 부하는 ' + load + '%, DB 부하는 ' + dbLoad + '%입니다.');
    if (neck === '애플리케이션 서버') sum.push('서버가 병목입니다. 서버를 더 붙이거나(스케일 아웃) 사양을 올리면(스케일 업) 풀립니다. 스케일 아웃은 한 대가 죽어도 버티고 계속 늘릴 수 있지만, 서버가 로그인 상태 같은 것을 자기 메모리에 들고 있지 않아야 합니다. 스케일 업은 구조 변경이 없지만 한계에 빨리 닿고 비용도 가파르게 오릅니다.');
    if (neck === 'DB') sum.push('DB가 병목입니다. 이 상태에서는 애플리케이션 서버를 아무리 늘려도 처리량이 늘지 않습니다. 병목은 한 곳을 풀면 다음으로 약한 곳으로 옮겨 갑니다. DB 쪽은 인덱스와 쿼리 개선, 캐시, 읽기 전용 복제본 순으로 검토합니다.');
    if (neck === '없음' && c.down) sum.push('한 대가 죽었지만 남은 서버로 감당했습니다. 평소 부하를 한 대가 빠져도 버틸 수준으로 유지해야 장애가 전체로 번지지 않습니다.');
    if (neck === '없음' && !c.down && load < 50 && alive > 1) sum.push('서버가 남습니다. 부하에 맞춰 서버 수를 자동으로 늘리고 줄이는 것이 오토스케일링입니다.');
    return { events: ev, summary: sum, calc: { alive: alive, per: per, cap: cap, appOut: appOut, out: out, lost: lost, load: load, dbLoad: dbLoad, dbCap: dbCap, neck: neck }, row: [out + '건', lost + '건', load + '%', neck] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, k = sim.calc, last = shown[shown.length - 1], stage = last ? last.snap.stage : 0;
    var ln = H.lanes(v);
    H.lane(ln, '로드밸런서', stage >= 1 ? '초당 ' + c.rps + '건 수신' : '대기', stage >= 1 ? 'wait' : 'none');
    for (var i = 1; i <= c.n; i++) {
      var dead = c.down && i === c.n;
      if (dead) H.lane(ln, '서버 ' + i, stage >= 2 ? '응답 없음 · 로드밸런서가 제외함' : '장애 발생', 'bad');
      else if (stage >= 3) H.lane(ln, '서버 ' + i, '초당 ' + Math.round(k.per) + '건 받음 / ' + k.cap + '건 처리 가능 · 부하 ' + k.load + '%', k.per > k.cap ? 'bad' : '', Math.min(1, k.per / k.cap));
      else H.lane(ln, '서버 ' + i, '초당 ' + k.cap + '건 처리 가능', '');
    }
    H.lane(ln, 'DB', stage >= 4 && k.alive ? '초당 ' + k.appOut + '건 받음 / ' + k.dbCap + '건 처리 가능 · 부하 ' + k.dbLoad + '%' : '초당 ' + k.dbCap + '건 처리 가능', stage >= 4 && k.appOut > k.dbCap ? 'bad' : '', stage >= 4 && k.alive ? Math.min(1, k.appOut / k.dbCap) : undefined);
  },
  // 그림: 로드밸런서가 요청을 서버들에 나눠 주고, 서버들은 모두 DB 하나로 간다. 어디가 넘치는지가 병목이다.
  draw: function (P, sim, shown) {
    var c = sim.c, k = sim.calc, last = shown[shown.length - 1], stage = last ? last.snap.stage : 0, n = c.n, w = (648 - (n - 1) * 6) / n, fin = stage >= 5 || (!k.alive && stage >= 4), dbOver = stage >= 4 && k.appOut > k.dbCap;
    P.size(680, 316);
    P.box('lb', 190, 16, 300, 44, { cls: stage >= 1 ? 'wait' : 'plain', title: '로드밸런서', right: '초당 ' + c.rps + '건' });
    for (var i = 1; i <= n; i++) {
      var dead = c.down && i === n, over = stage >= 3 && k.per > k.cap, x = 16 + (i - 1) * (w + 6);
      P.box('s' + i, x, 110, w, 62, { cls: dead ? 'bad' : over ? 'bad' : stage >= 3 ? 'good' : 'plain', center: true, title: '서버 ' + i, sub: dead ? ['죽음', '제외됨'] : stage >= 3 ? ['부하', k.load + '%'] : ['처리 능력', k.cap + '건'] });
      if (!(dead && stage >= 2)) { P.arrow('in' + i, 'lb:b:' + (i / (n + 1)), 's' + i + ':t', { cls: stage >= 1 ? '' : 'mut' }); P.arrow('out' + i, 's' + i + ':b', 'db:t:' + (i / (n + 1)), { cls: stage >= 4 ? (dbOver ? 'bad' : '') : 'mut' }); }
    }
    P.box('db', 190, 222, 300, 44, { cls: dbOver ? 'bad' : stage >= 4 ? 'good' : 'plain', title: 'DB (하나뿐)', right: stage >= 4 && k.alive ? '부하 ' + k.dbLoad + '%' : '초당 ' + k.dbCap + '건 가능' });
    P.text('neck', 340, 296, fin ? '병목: ' + k.neck + ' · 초당 처리 ' + k.out + '건, 처리 못 함 ' + k.lost + '건' : '실행을 진행하면 병목이 표시됩니다', { anchor: 'middle', bold: fin, cls: fin ? (k.lost ? 'bad' : 'good') : 'mut' });
    P.note('빨간 상자가 들어오는 양을 감당하지 못하는 곳입니다.');
  },
  assume: '모든 요청의 무게가 같고, 요청 1건이 DB 쿼리 1번을 쓴다고 단순화했습니다. 로드밸런서는 요청을 고르게 나누며 자체 한계는 없다고 가정했습니다(실제로는 로드밸런서도 이중화합니다). 처리 능력을 넘은 요청은 "처리 못 함"으로만 셌는데, 실제로는 한계에 가까워질수록 대기 시간이 먼저 급격히 늘어납니다. 숫자는 관계를 보이기 위한 예시이며 실측값이 아닙니다.',
});
