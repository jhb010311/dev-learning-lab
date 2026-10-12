Lab.register({
  id: 'deploy', nav: '배포 전략', cat: '배포와 운영', mode: 'step',
  title: '서비스를 끊지 않고 새 버전으로 바꾸려면',
  intro: '서버 4대가 v1으로 돌고 있습니다. 이것을 v2로 바꾸는 방법에 따라, 배포 중에 서비스가 끊기는지, 서버가 얼마나 더 필요한지, 새 버전에 문제가 있을 때 몇 명이 영향을 받는지가 달라집니다.',
  terms: ['롤링, 블루-그린, 카나리 배포', 'Graceful Shutdown', '헬스 체크(Liveness, Readiness)', '로드밸런서', 'CI/CD'], ranks: ['deploy', 'cloud'],
  controls: [
    { id: 'st', label: '배포 방식', type: 'select', value: 'rolling', options: [['recreate', '전부 내리고 새로 올리기'], ['rolling', '롤링 (한 대씩 교체)'], ['bluegreen', '블루-그린 (새 환경을 통째로 준비 후 전환)'], ['canary', '카나리 (일부에만 먼저 배포)']] },
    { id: 'bug', label: '새 버전(v2)에 버그가 있다', type: 'check', value: false },
    { id: 'grace', label: 'Graceful Shutdown을 설정했다', type: 'check', value: true },
  ],
  presets: [
    { t: '처음 설정으로', q: '새 버전 v2에 버그가 없고 Graceful Shutdown을 설정한 채 한 대씩 교체하는 롤링으로 배포하면 서비스는 어떻게 되나', d: '롤링 배포. 한 대씩 바꾸므로 서비스가 끊기지 않습니다.', v: { st: 'rolling', bug: false, grace: true } },
    { t: '전부 내리고 올리기', q: '전부 내렸다가 새로 올리는 방식으로 배포하면', d: '가장 단순하지만 그동안 서비스가 멈춥니다.', v: { st: 'recreate', bug: false, grace: true } },
    { t: '블루-그린', q: '새 환경을 통째로 준비한 뒤 전환하는 블루-그린으로 배포하면', d: '서버가 두 배 필요하지만 전환과 되돌리기가 한순간입니다.', v: { st: 'bluegreen', bug: false, grace: true } },
    { t: '버그가 있는 버전을 롤링으로', q: '롤링 배포 그대로 새 버전 v2에 버그가 있으면', d: '문제를 알아챌 때까지 영향 범위가 점점 커집니다.', v: { st: 'rolling', bug: true, grace: true } },
    { t: '버그가 있는 버전을 카나리로', q: '카나리로 일부에만 먼저 배포하는데 새 버전 v2에 버그가 있으면', d: '일부 사용자만 영향을 받고 되돌립니다.', v: { st: 'canary', bug: true, grace: true } },
    { t: 'Graceful Shutdown이 없으면', q: 'Graceful Shutdown을 설정하지 않으면', d: '서버를 내릴 때 처리 중이던 요청이 끊깁니다.', v: { st: 'rolling', bug: false, grace: false } },
  ],
  code: function (c) {
    var k = { recreate: 'strategy:\n  type: Recreate                # 기존 것을 모두 내린 뒤 새로 올림', rolling: 'strategy:\n  type: RollingUpdate\n  rollingUpdate:\n    maxUnavailable: 1           # 한 번에 1대까지만 내림\n    maxSurge: 0', bluegreen: '# 새 버전 Deployment(green)를 따로 띄운 뒤\n# Service의 selector를 version: v2로 바꿔 한 번에 전환', canary: '# v2를 1대만 띄워 전체 요청의 25%만 받게 한 뒤\n# 오류율과 응답 시간을 지켜보고 나머지를 교체' }[c.st];
    return '# Kubernetes Deployment (replicas: 4)\n' + k + '\n\nreadinessProbe:                 # 준비됐을 때만 요청을 받음\n  httpGet: { path: /actuator/health/readiness, port: 8080 }\n\n# application.yml\nserver.shutdown: ' + (c.grace ? 'graceful         # 처리 중인 요청을 끝내고 종료' : 'immediate        # 즉시 종료') + (c.grace ? '\nspring.lifecycle.timeout-per-shutdown-phase: 30s' : '');
  },
  label: function (c) { return { recreate: '전부 내리고 올리기', rolling: '롤링', bluegreen: '블루-그린', canary: '카나리' }[c.st] + (c.bug ? ' · v2에 버그' : '') + (c.grace ? '' : ' · Graceful 없음'); },
  columns: ['서비스 중단', '가장 많이 떠 있던 서버', '버그에 노출된 요청', '되돌리는 방법', '끊긴 요청'],
  simulate: function (c) {
    var ev = [], S = ['v1', 'v1', 'v1', 'v1'], G = [], lb = 'v1 서버 4대', down = '없음', maxUp = 4, exposed = '해당 없음', back = '해당 없음', cut = 0, sum = [];
    function push(s, k) { var up = S.filter(function (x) { return x === 'v1' || x === 'v2'; }).length + G.filter(function (x) { return x === 'v2'; }).length; if (up > maxUp) maxUp = up; ev.push({ s: s, k: k, snap: { S: S.slice(), G: G.slice(), lb: lb, cut: cut } }); }
    function stop(i) { S[i] = '내리는 중'; if (!c.grace) cut += 2; push('서버 ' + (i + 1) + ': 로드밸런서가 이 서버로 새 요청을 보내지 않게 한 뒤 종료 신호를 보냅니다. ' + (c.grace ? '처리 중이던 요청을 끝까지 마친 다음 종료합니다.' : '즉시 종료됩니다. 처리 중이던 요청 2건이 응답을 받지 못하고 끊겼습니다.'), c.grace ? '' : 'bad'); }
    push('현재 상태: 서버 4대가 모두 v1이고, 로드밸런서가 요청을 고르게 나눠 보냅니다.', '');
    if (c.st === 'recreate') {
      for (var i = 0; i < 4; i++) S[i] = '없음'; lb = '보낼 서버 없음'; if (!c.grace) cut += 8; down = '있음';
      push('v1 서버 4대를 모두 내렸습니다. 요청을 받을 서버가 없어 사용자는 오류 화면을 봅니다.' + (c.grace ? '' : ' 처리 중이던 요청 8건도 끊겼습니다.'), 'bad');
      for (var j = 0; j < 4; j++) S[j] = '기동 중'; push('v2 서버 4대를 올리는 중입니다. 애플리케이션이 뜨고 준비 상태 확인(readiness)을 통과할 때까지 서비스 중단이 이어집니다.', 'bad');
      for (var m = 0; m < 4; m++) S[m] = 'v2'; lb = 'v2 서버 4대'; push('v2 서버 4대가 준비됐습니다. 로드밸런서가 요청을 보내기 시작합니다.', 'good');
      if (c.bug) { exposed = '100%'; back = '다시 전부 내리고 v1 올리기 (또 중단)'; push('v2의 버그가 모든 사용자에게 드러납니다. 되돌리려면 같은 과정을 반복해야 해서 서비스가 한 번 더 멈춥니다.', 'bad'); }
      sum.push('절차는 가장 단순하지만 배포하는 동안 서비스가 멈춥니다. 두 버전이 동시에 뜨면 안 되는 경우나 점검 시간을 공지할 수 있는 서비스에서 씁니다.');
    }
    if (c.st === 'rolling') {
      var stopAt = c.bug ? 2 : 4;
      for (var r = 0; r < stopAt; r++) {
        stop(r); S[r] = '기동 중'; lb = '남은 서버 3대 (v1 ' + (3 - r) + ', v2 ' + r + ')'; push('서버 ' + (r + 1) + ': v2로 올리는 중입니다. 준비 상태 확인을 통과하기 전까지 요청을 받지 않습니다. 그동안 3대로 버팁니다.', '');
        S[r] = 'v2'; lb = 'v1 ' + (3 - r) + '대, v2 ' + (r + 1) + '대'; push('서버 ' + (r + 1) + ': 준비 완료. 다시 요청을 받습니다. ' + (r < 3 ? '지금은 v1과 v2가 함께 서비스 중이며 요청의 ' + (r + 1) * 25 + '%가 v2로 갑니다.' : '이제 모든 요청이 v2로 갑니다.'), c.bug ? 'bad' : '');
      }
      if (c.bug) { exposed = '최대 50%'; back = '바꾼 서버를 한 대씩 v1으로 다시 교체'; push('v2로 간 요청에서 오류가 늘어난 것을 발견했습니다. 배포를 멈춥니다. 이미 요청의 50%가 버그 있는 버전으로 가고 있었습니다.', 'bad'); S[0] = 'v1'; S[1] = 'v1'; lb = 'v1 서버 4대'; push('바꾼 2대를 다시 한 대씩 v1으로 되돌렸습니다. 되돌리는 데도 배포한 만큼 시간이 걸립니다.', ''); }
      else push('4대 모두 v2가 됐습니다. ' + (c.grace ? '배포하는 동안 서비스는 끊기지 않았습니다.' : '서비스 전체가 멈춘 적은 없지만, 서버를 내릴 때마다 처리 중이던 요청이 끊겼습니다.'), 'good');
      sum.push('추가 서버 없이 무중단으로 배포합니다. 배포 중에는 처리 용량이 줄고, v1과 v2가 동시에 요청을 받으므로 DB 스키마나 API가 두 버전 모두와 호환돼야 합니다.');
    }
    if (c.st === 'bluegreen') {
      G = ['기동 중', '기동 중', '기동 중', '기동 중']; push('기존 v1 환경(블루)은 그대로 두고, 똑같은 규모의 v2 환경(그린)을 새로 띄웁니다. 아직 사용자 요청은 받지 않습니다.', '');
      G = ['v2', 'v2', 'v2', 'v2']; push('그린 4대가 준비됐습니다. 지금은 서버 8대가 떠 있습니다. 사용자에게 노출하기 전에 그린 환경에서 점검할 수 있습니다.', '');
      lb = 'v2 서버 4대 (그린)'; if (!c.grace) cut += 8; push('로드밸런서의 대상을 블루에서 그린으로 한 번에 바꿉니다. 모든 요청이 v2로 갑니다.' + (c.grace ? ' 블루에서 처리 중이던 요청은 끝까지 처리됩니다.' : ' 블루로 가던 연결을 바로 끊어서 처리 중이던 요청 8건이 끊겼습니다.'), c.grace ? 'good' : 'bad');
      if (c.bug) { exposed = '100% (전환 직후부터 되돌릴 때까지)'; back = '로드밸런서를 블루로 다시 전환 (즉시)'; push('v2의 버그가 모든 사용자에게 드러납니다. 하지만 블루 환경이 그대로 살아 있습니다.', 'bad'); lb = 'v1 서버 4대 (블루)'; push('로드밸런서를 블루로 다시 돌립니다. 서버를 새로 띄울 필요가 없어 되돌리기가 즉시 끝납니다.', 'good'); G = ['없음', '없음', '없음', '없음']; }
      else { S = ['없음', '없음', '없음', '없음']; push('문제가 없음을 확인한 뒤 블루 환경을 내립니다.', ''); }
      sum.push('전환과 되돌리기가 한순간이고 두 버전이 섞여 서비스되는 시간이 없습니다. 대신 배포하는 동안 서버가 두 배로 필요하고, 전환 순간 전체 사용자가 새 버전을 쓰게 됩니다.');
    }
    if (c.st === 'canary') {
      stop(0); S[0] = '기동 중'; push('서버 1: v2로 올리는 중입니다.', ''); S[0] = 'v2'; lb = 'v1 3대 (75%), v2 1대 (25%)';
      push('서버 1대만 v2입니다. 전체 요청의 25%만 새 버전으로 갑니다. 이 상태로 두고 v2의 오류율과 응답 시간을 v1과 비교합니다.', '');
      if (c.bug) { exposed = '25%'; back = '카나리 1대만 v1으로 교체'; push('v2로 간 요청의 오류율이 v1보다 높습니다. 영향을 받은 것은 요청의 25%뿐입니다.', 'bad'); S[0] = 'v1'; lb = 'v1 서버 4대'; push('카나리 서버 1대를 v1으로 되돌립니다. 나머지 3대는 건드린 적이 없습니다.', 'good'); }
      else { push('지표에 이상이 없습니다. 나머지 3대도 차례로 v2로 바꿉니다.', 'good'); for (var q = 1; q < 4; q++) { stop(q); S[q] = 'v2'; } lb = 'v2 서버 4대'; push('4대 모두 v2가 됐습니다.', 'good'); }
      sum.push('실제 사용자 요청의 일부로 새 버전을 검증하므로, 문제가 있어도 영향 범위가 작습니다. 대신 지표를 비교하고 판단하는 체계(모니터링, 자동 롤백)가 갖춰져 있어야 의미가 있습니다.');
    }
    if (!c.grace) sum.push('Graceful Shutdown이 없으면 서버를 내리는 순간 처리 중이던 요청이 끊깁니다(' + cut + '건). 무중단 배포라도 사용자는 오류를 봅니다. 새 요청을 먼저 끊고, 받은 요청은 끝까지 처리한 뒤 종료해야 합니다.');
    return { events: ev, summary: sum, row: [down, maxUp + '대', exposed, back, cut + '건'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { S: ['v1', 'v1', 'v1', 'v1'], G: [], lb: 'v1 서버 4대', cut: 0 };
    var cls = function (x) { return x === 'v1' ? 'q' : x === 'v2' ? 'd' : x === '없음' ? '' : 'b'; };
    H.title(v, sim.c.st === 'bluegreen' ? '기존 환경 (블루)' : '서버'); H.slots(v, s.S.map(function (x, i) { return ['서버 ' + (i + 1) + ': ' + x, cls(x)]; }), '');
    if (s.G.length) { H.title(v, '새 환경 (그린)'); H.slots(v, s.G.map(function (x, i) { return ['서버 ' + (i + 5) + ': ' + x, cls(x)]; }), ''); }
  },
  // 그림: 로드밸런서와 서버들. 서버의 색이 버전이고, 화살표가 닿은 서버가 지금 요청을 받는 서버다.
  draw: function (P, sim, shown) {
    var bg = sim.c.st === 'bluegreen', last = shown[shown.length - 1], s = last ? last.snap : { S: ['v1', 'v1', 'v1', 'v1'], G: [], lb: 'v1 서버 4대', cut: 0 };
    var cls = function (x) { return x === 'v1' ? 'wait' : x === 'v2' ? 'good' : x === '없음' ? 'ghost' : 'hot'; }, none = s.lb.indexOf('없음') >= 0, toGreen = bg && s.lb.indexOf('v2') >= 0 && s.lb.indexOf('v1') < 0;
    P.size(680, s.G.length ? 350 : 262);
    P.box('lb', 120, 16, 440, 44, { cls: none ? 'bad' : 'plain', title: '로드밸런서', right: s.lb });
    P.text('ls', 16, 106, bg ? '기존 환경 (블루)' : '서버', { cls: 'mut' });
    s.S.forEach(function (x, i) { P.box('s' + i, 16 + i * 166, 116, 150, 56, { cls: cls(x), title: '서버 ' + (i + 1), sub: x }); if (!none && !toGreen && (x === 'v1' || x === 'v2')) P.arrow('to' + i, 'lb:b:' + (0.2 + i * 0.2), 's' + i + ':t'); });
    if (s.G.length) { P.text('lg', 16, 196, '새 환경 (그린)', { cls: 'mut' }); s.G.forEach(function (x, i) { P.box('g' + i, 16 + i * 166, 206, 150, 56, { cls: cls(x), title: '서버 ' + (i + 5), sub: x }); if (toGreen && x === 'v2') P.arrow('tg' + i, 'lb:b:' + (0.2 + i * 0.2), 'g' + i + ':t', { cls: 'good' }); }); }
    P.box('cut', 16, s.G.length ? 288 : 200, 648, 40, { cls: s.cut ? 'bad' : 'good', title: '처리 도중 끊긴 요청', right: s.cut + '건' });
    P.note('파랑은 기존 버전(v1), 초록은 새 버전(v2), 노랑은 내리거나 올리는 중인 서버입니다. 로드밸런서의 화살표가 닿은 서버만 요청을 받습니다.');
  },
  assume: '서버 4대, 한 번에 한 대씩 교체하는 단순한 구성입니다. 버그는 헬스 체크로는 걸러지지 않고 실제 요청을 받아 봐야 드러나는 종류라고 가정했고, 롤링에서는 2대를 바꾼 시점에 발견한다고 보았습니다. 서버를 내릴 때 처리 중인 요청은 서버당 2건으로 두었습니다. 각 방식의 정의는 Kubernetes와 스프링 부트 공식 문서의 설명을 따랐습니다.',
});
