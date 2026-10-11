Lab.register({
  id: 'actuator', nav: '액추에이터와 헬스 체크', cat: '스프링', mode: 'step',
  title: '결제사 연결이 끊겼을 때 헬스 체크는 무엇이라고 답하나',
  intro: '액추에이터는 떠 있는 스프링 부트 애플리케이션의 상태를 밖에서 물어볼 수 있게 주소를 만들어 주는 라이브러리입니다. 그 가운데 /actuator/health는 "이 서버가 정상인가"에 답합니다. 답은 애플리케이션 안의 여러 구성 요소가 각자 보고한 상태를 합쳐서 정해지고, 어느 주소로 묻느냐에 따라 살펴보는 구성 요소가 달라집니다.',
  terms: ['Actuator', 'HealthIndicator와 상태 합치기', '헬스 그룹', '헬스 체크(Liveness, Readiness)', '액추에이터 엔드포인트의 노출과 접근'],
  controls: [
    { id: 'pay', label: 'pay 구성 요소가 답하는 상태', type: 'select', value: 'DOWN', hint: '직접 만든 PayHealthIndicator가 돌려주는 값입니다.', options: [['UP', 'UP (결제사에 정상으로 연결됨)'], ['DOWN', 'DOWN (결제사에 연결할 수 없음)'], ['OUT_OF_SERVICE', 'OUT_OF_SERVICE (결제 기능을 일부러 내려 둠)'], ['UNKNOWN', 'UNKNOWN (알 수 없음)']] },
    { id: 'path', label: '요청하는 주소', type: 'select', value: 'health', options: [['health', 'GET /actuator/health'], ['liveness', 'GET /actuator/health/liveness'], ['readiness', 'GET /actuator/health/readiness']] },
    { id: 'details', label: 'show-details 설정과 요청한 사람', type: 'select', value: 'never', hint: '구성 요소별 내용을 본문에 보여 줄지 정하는 설정입니다.', options: [['never', 'never (적지 않았을 때의 기본값)'], ['auth_anon', 'when-authorized, 로그인하지 않은 요청'], ['auth_user', 'when-authorized, 로그인한 사용자의 요청'], ['always', 'always']] },
    { id: 'ready', label: 'readiness 그룹에 pay를 넣는다', type: 'check', value: false, hint: 'management.endpoint.health.group.readiness.include=readinessState,pay' },
  ],
  presets: [
    { t: '처음 설정으로', d: 'pay가 DOWN입니다. 503이 되지만 본문에는 DOWN 한마디뿐이라 무엇이 문제인지 보이지 않습니다.', v: { pay: 'DOWN', path: 'health', details: 'never', ready: false } },
    { t: 'show-details를 always로', d: '구성 요소별 상태와 세부 정보가 본문에 나옵니다.', v: { pay: 'DOWN', path: 'health', details: 'always', ready: false } },
    { t: 'when-authorized인데 로그인하지 않으면', d: '로그인 정보가 없는 요청에는 never와 똑같이 숨깁니다.', v: { pay: 'DOWN', path: 'health', details: 'auth_anon', ready: false } },
    { t: 'liveness로 물으면', d: 'pay가 DOWN이어도 200 UP입니다. liveness 그룹은 pay를 묻지 않습니다.', v: { pay: 'DOWN', path: 'liveness', details: 'never', ready: false } },
    { t: 'readiness로 물으면', d: 'readiness 그룹도 기본으로는 pay를 묻지 않습니다. 역시 200 UP입니다.', v: { pay: 'DOWN', path: 'readiness', details: 'never', ready: false } },
    { t: 'readiness 그룹에 pay를 넣으면', d: '이제 pay가 DOWN이면 readiness도 503이 됩니다.', v: { pay: 'DOWN', path: 'readiness', details: 'never', ready: true } },
    { t: 'UNKNOWN은 UP에 밀린다', d: 'pay가 "알 수 없음"을 답해도 전체 상태는 UP이고 200입니다.', v: { pay: 'UNKNOWN', path: 'health', details: 'always', ready: false } },
  ],
  PATHS: { health: '/actuator/health', liveness: '/actuator/health/liveness', readiness: '/actuator/health/readiness' },
  COMPS: [['livenessState', '고장 없이 돌고 있는가'], ['readinessState', '요청을 받을 준비가 됐는가'], ['pay', '결제사에 연결되는가']],
  // 심각한 순서. 앞에 있을수록 전체 상태로 뽑힌다
  ORDER: ['DOWN', 'OUT_OF_SERVICE', 'UP', 'UNKNOWN'],
  METHOD: { UP: 'up', DOWN: 'down', OUT_OF_SERVICE: 'outOfService', UNKNOWN: 'unknown' },
  cls: function (status) { return status === 'UP' ? 'good' : status === 'UNKNOWN' ? 'hot' : 'bad'; },
  // 이 설정에서 요청이 묻는 구성 요소 (묻는 순서대로)
  members: function (c) { return c.path === 'health' ? ['livenessState', 'readinessState', 'pay'] : c.path === 'liveness' ? ['livenessState'] : c.ready ? ['readinessState', 'pay'] : ['readinessState']; },
  code: function (c) {
    var show = c.details === 'never' ? '' : c.details === 'always' ? 'always' : 'when-authorized';
    var props = '# application.properties\n# 자동으로 붙는 구성 요소(diskSpace, ping, ssl, db)를 끈다. 실습을 단순하게 하려는 설정\nmanagement.health.defaults.enabled=false\n' +
      (show ? 'management.endpoint.health.show-details=' + show + '\n' : '# show-details는 적지 않았다 (기본값 never)\n') +
      (c.ready ? 'management.endpoint.health.group.readiness.include=readinessState,pay\n' : '');
    var java = '// 직접 만든 구성 요소. 빈 이름 payHealthIndicator에서\n// HealthIndicator를 뗀 "pay"가 구성 요소의 이름이 된다\n@Component\nclass PayHealthIndicator implements HealthIndicator {\n\n    @Override\n    public Health health() {\n        // 결제사 서버에 연결해 본 결과를 상태로 답한다. 여기서는 ' + c.pay + '\n        return Health.' + this.METHOD[c.pay] + '().withDetail("target", "pay.example").build();\n    }\n}';
    return '// 보내는 요청 (' + (c.details === 'auth_user' ? '로그인한 사용자' : '로그인하지 않음') + ')\n// GET ' + this.PATHS[c.path] + '\n\n' + props + '\n' + java;
  },
  label: function (c) { return 'pay ' + c.pay + ' · ' + this.PATHS[c.path] + ' · show-details ' + { never: 'never', auth_anon: 'when-authorized(로그인 안 함)', auth_user: 'when-authorized(로그인함)', always: 'always' }[c.details] + (c.ready ? ' · readiness에 pay 넣음' : ''); },
  columns: ['HTTP 상태 코드', '본문의 status', '상태를 물어본 구성 요소', '본문에 보이는 범위'],
  simulate: function (c) {
    var self = this, url = this.PATHS[c.path], mem = this.members(c), ev = [], sum = [];
    var st = { stage: 0, members: [], asked: {}, overall: '', code: '', vis: '', body: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var login = c.details === 'auth_user', hasPay = mem.indexOf('pay') >= 0, grouped = c.path !== 'health';
    // 스프링 부트가 만들어 둔 그대로인 그룹(설정으로 손대지 않은 liveness, readiness)은 상태만 답한다
    var builtin = c.path === 'liveness' || (c.path === 'readiness' && !c.ready);
    var visible = !builtin && (c.details === 'always' || c.details === 'auth_user');
    var MEAN = { UP: '결제사 서버에 정상으로 연결된다는 뜻입니다.', DOWN: '결제사 서버에 연결할 수 없다는 뜻입니다.', OUT_OF_SERVICE: '결제 기능을 일부러 내려 두었다는 뜻입니다.', UNKNOWN: '연결되는지 아닌지 알 수 없다는 뜻입니다.' };

    st.stage = 1;
    push('GET ' + url + ': ' + (login ? '로그인한 사용자의' : '로그인하지 않은') + ' 요청이 도착합니다. /actuator로 시작하는 주소는 액추에이터가 만들어 둔 것입니다. 따로 설정하지 않으면 웹으로는 health 하나만 열려 있습니다.');

    st.stage = 2; st.members = mem.slice();
    if (!grouped) push(url + ': 주소가 health에서 끝나므로 등록된 구성 요소를 모두 묻습니다. 이 애플리케이션에는 livenessState, readinessState, pay 세 개가 등록돼 있습니다. 앞의 둘은 스프링 부트가 넣어 둔 것이고, pay는 직접 만든 PayHealthIndicator입니다.');
    else if (builtin) push(url + ': health 뒤에 붙은 ' + c.path + '는 그룹의 이름입니다. 그룹은 구성 요소 가운데 일부만 골라 묶은 것입니다. 스프링 부트가 만들어 둔 ' + c.path + ' 그룹에는 ' + mem[0] + ' 하나만 들어 있습니다.');
    else push(url + ': health 뒤에 붙은 readiness는 그룹의 이름입니다. 그룹은 구성 요소 가운데 일부만 골라 묶은 것입니다. management.endpoint.health.group.readiness.include에 readinessState,pay라고 적었으므로 이 그룹에는 두 개가 들어 있습니다.');

    st.stage = 3;
    var got = {};
    mem.forEach(function (name) {
      if (name === 'pay') { got.pay = c.pay; st.asked.pay = c.pay; push('PayHealthIndicator.health() 실행: 답은 ' + c.pay + '입니다. ' + MEAN[c.pay], c.pay === 'UP' ? 'good' : c.pay === 'UNKNOWN' ? '' : 'bad'); }
      else { got[name] = 'UP'; st.asked[name] = 'UP'; push(name + '에 묻기: 답은 UP입니다. ' + (name === 'livenessState' ? '애플리케이션이 고장 나지 않고 돌아가고 있다는 뜻입니다. 애플리케이션 자신만 보고 바깥 서버는 보지 않습니다.' : '애플리케이션이 시작을 마치고 요청을 받을 준비가 됐다는 뜻입니다.'), 'good'); }
    });
    if (!hasPay) push('pay는 묻지 않음: pay는 이 그룹에 들어 있지 않으므로 PayHealthIndicator.health()가 실행되지 않습니다. pay의 상태가 ' + c.pay + '인 것은 이 응답에 반영되지 않습니다.');

    st.stage = 4;
    var overall = mem.map(function (n) { return got[n]; }).sort(function (a, b) { return self.ORDER.indexOf(a) - self.ORDER.indexOf(b); })[0];
    st.overall = overall;
    if (mem.length === 1) push('상태 합치기: 모은 상태가 ' + mem[0] + ' UP 하나뿐입니다. 전체 상태는 그대로 UP입니다.');
    else push('상태 합치기: 모은 상태는 ' + mem.map(function (n) { return n + ' ' + got[n]; }).join(', ') + '입니다. 이 가운데 가장 심각한 것 하나가 전체 상태가 됩니다. 심각한 순서는 DOWN, OUT_OF_SERVICE, UP, UNKNOWN입니다. ' + { UP: '모두 UP이므로 전체 상태도 UP입니다.', DOWN: 'DOWN이 하나 있으므로 전체 상태는 DOWN입니다.', OUT_OF_SERVICE: 'OUT_OF_SERVICE가 UP보다 앞이므로 전체 상태는 OUT_OF_SERVICE입니다.', UNKNOWN: 'UNKNOWN은 UP보다 뒤이므로 UP에 밀립니다. 전체 상태는 UP입니다.' }[c.pay]);

    st.stage = 5;
    var bad = overall === 'DOWN' || overall === 'OUT_OF_SERVICE', code = bad ? '503 Service Unavailable' : '200 OK';
    st.code = code;
    push('HTTP 상태 코드 정하기: 전체 상태 ' + overall + '에 맞는 코드는 ' + code + '입니다. DOWN과 OUT_OF_SERVICE는 503, UP과 UNKNOWN은 200으로 응답합니다. 상태를 확인하는 쪽은 본문을 읽지 않고 이 숫자만 봐도 정상인지 알 수 있습니다.', bad ? 'bad' : 'good');

    st.stage = 6;
    // 본문의 글자는 실제 응답 그대로다. 항목은 이름의 알파벳 순으로 나온다 (components, groups, status)
    function comp(n) { return '"' + n + '":' + (n === 'pay' ? '{"details":{"target":"pay.example"},"status":"' + c.pay + '"}' : '{"status":"UP"}'); }
    var body = '{' + (visible ? '"components":{' + mem.slice().sort().map(comp).join(',') + '},' : '') + (grouped ? '' : '"groups":["liveness","readiness"],') + '"status":"' + overall + '"}';
    var vis = visible ? '구성 요소별 상태와 세부 정보' : '전체 상태만';
    st.body = body; st.vis = vis;
    var showName = c.details === 'always' ? 'always' : 'when-authorized';
    if (builtin) push('응답 본문 만들기: 본문은 ' + body + '입니다. 스프링 부트가 만들어 둔 ' + c.path + ' 그룹은 전체 상태만 답합니다.' + (c.details === 'always' || login ? ' show-details를 ' + showName + '로 두었어도 이 그룹의 본문은 달라지지 않습니다.' : ''));
    else push('응답 본문 만들기: ' + { never: 'show-details를 적지 않았으므로 기본값 never가 적용됩니다. 구성 요소별 내용은 숨기고 전체 상태만 보냅니다.', auth_anon: 'show-details가 when-authorized인데 이 요청에는 로그인 정보가 없습니다. never일 때와 똑같이 구성 요소별 내용을 숨기고 전체 상태만 보냅니다.', auth_user: 'show-details가 when-authorized이고 로그인한 사용자의 요청입니다. 구성 요소별 상태와 세부 정보(details)를 함께 보냅니다.', always: 'show-details가 always이므로 누가 요청했든 구성 요소별 상태와 세부 정보(details)를 함께 보냅니다.' }[c.details] + ' 본문은 ' + body + '입니다.' + (grouped ? '' : ' groups는 이 애플리케이션에 있는 그룹의 이름입니다.'));

    if (c.path === 'liveness') {
      sum.push('liveness 그룹은 livenessState 하나만 묻습니다. pay가 무엇을 답하든 결과가 같습니다.');
      sum.push('liveness는 "이 프로세스를 다시 시작해야 하는가"를 묻는 용도입니다. 결제사 연결이 끊긴 것은 내 서버를 다시 시작해도 낫지 않으므로, 바깥 서버의 상태는 liveness에 넣지 않습니다.');
    } else if (c.path === 'readiness' && !c.ready) {
      sum.push('readiness 그룹도 기본으로는 readinessState 하나만 묻습니다. ' + (c.pay === 'UP' ? 'pay가 다른 상태를 답해도 이 응답은 달라지지 않습니다.' : 'pay가 ' + c.pay + ' 상태인데도 readiness는 UP으로 답합니다.') + ' pay의 상태를 반영하려면 그룹에 직접 넣어야 합니다.');
    } else if (c.path === 'readiness') {
      sum.push('readiness 그룹에 pay를 넣었으므로 pay의 상태가 readiness의 응답에 반영됩니다.' + (bad ? ' readiness가 503이면 이 서버는 "요청을 받을 준비가 안 됐다"고 답한 것이 됩니다.' : ''));
      sum.push('바깥 서버를 readiness에 넣을지는 신중히 정합니다. 모든 서버가 같은 결제사를 보고 있다면, 결제사에 문제가 생겼을 때 모든 서버가 한꺼번에 준비 안 됨이 됩니다.');
    } else {
      sum.push({ UP: '물어본 구성 요소가 모두 UP이므로 전체도 UP이고 200으로 응답합니다.', DOWN: '구성 요소 하나만 DOWN이어도 전체가 DOWN이 되고 503으로 응답합니다. 이 주소로 상태를 확인하는 쪽은 이 서버를 비정상으로 봅니다.', OUT_OF_SERVICE: 'OUT_OF_SERVICE는 DOWN 다음으로 심각한 상태입니다. UP보다 앞이므로 전체 상태가 되고, DOWN과 마찬가지로 503으로 응답합니다.', UNKNOWN: 'UNKNOWN은 순서의 맨 뒤입니다. 다른 구성 요소가 UP이면 전체는 UP이고 200으로 응답합니다. "알 수 없음"은 고장으로 치지 않습니다.' }[c.pay]);
    }
    if (builtin && (c.details === 'always' || login)) sum.push('show-details는 /actuator/health와, 설정에 직접 적은 그룹의 본문에 적용됩니다. 스프링 부트가 만들어 둔 그대로인 liveness, readiness 그룹은 전체 상태만 답합니다.');
    else if (!builtin) sum.push({ never: 'show-details의 기본값은 never입니다. 본문만 봐서는 어느 구성 요소가 문제인지 알 수 없습니다.', auth_anon: 'when-authorized는 로그인한 요청에만 구성 요소별 내용을 보여 줍니다. 상태 확인용 요청은 대개 로그인 없이 오므로 전체 상태만 받습니다. HTTP 상태 코드는 로그인과 관계없이 같습니다.', auth_user: 'when-authorized는 로그인한 요청에만 구성 요소별 내용을 보여 줍니다. 같은 주소를 로그인하지 않고 부르면 전체 상태만 보입니다.', always: 'always는 누구에게나 구성 요소별 내용을 보여 줍니다. 세부 정보에는 내부 서버의 주소 같은 것이 들어갈 수 있으므로, 밖에서 누구나 부를 수 있는 서버에서는 조심해서 씁니다.' }[c.details]);
    if (c.ready && c.path !== 'readiness') sum.push('readiness 그룹에 pay를 넣은 설정은 readiness 주소의 응답만 바꿉니다. 이 주소의 결과에는 영향을 주지 않습니다.');
    return { events: ev, summary: sum, body: body, members: mem.slice().sort(), payCalled: hasPay, row: [code, overall, mem.join(', '), vis] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 요청 하나가 응답이 되기까지를 한 단계씩 보여 줍니다.'); return; }
    if (s.body) H.text(v, '응답 본문: ' + s.body);
  },
  // 그림: 맨 위에 요청, 가운데에 등록된 구성 요소 세 칸(이 요청이 묻는 것에만 화살표), 그 아래에 합친 전체 상태와 HTTP 상태 코드, 본문에 보이는 범위.
  draw: function (P, sim, shown) {
    var c = sim.c, self = this, last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, members: [], asked: {}, overall: '', code: '', vis: '', body: '' };
    P.size(680, 290);
    P.box('req', 16, 14, 648, 30, { cls: s.stage >= 1 ? 'wait' : 'ghost', title: 'GET ' + this.PATHS[c.path], right: c.details === 'auth_user' ? '로그인한 사용자의 요청' : '로그인하지 않은 요청' });
    P.region('ep', 16, 62, 648, 112, s.stage < 2 ? '등록된 구성 요소' : c.path === 'health' ? '등록된 구성 요소 (전부 묻는다)' : '등록된 구성 요소 (' + c.path + ' 그룹에 든 것만 묻는다)');
    this.COMPS.forEach(function (x, i) {
      var name = x[0], mem = s.members.indexOf(name) >= 0, got = s.asked[name], f = [0.173, 0.5, 0.827][i];
      P.box('c_' + name, 28 + i * 212, 98, 200, 62, { cls: s.stage < 2 ? 'plain' : !mem ? 'ghost' : got ? self.cls(got) : 'wait', title: name, sub: [x[1], got ? '답: ' + got : s.stage < 2 ? '아직' : mem ? '곧 묻는다' : '묻지 않음'] });
      if (s.stage >= 2 && mem) P.arrow('q_' + name, 'req:b:' + f, 'c_' + name + ':t', { cls: got ? 'mut' : 'hot' });
      if (s.stage >= 4 && mem) P.arrow('r_' + name, 'c_' + name + ':b', 'agg:t:' + f, { cls: got === 'UP' ? 'good' : got === 'UNKNOWN' ? 'hot' : 'bad' });
    });
    P.box('agg', 16, 196, 648, 30, { cls: s.overall ? this.cls(s.overall) : 'ghost', title: '전체 상태 (물어본 것 가운데 가장 심각한 것)', right: s.overall });
    P.box('http', 16, 240, 316, 30, { cls: !s.code ? 'ghost' : s.code.indexOf('503') === 0 ? 'bad now' : 'good now', title: 'HTTP 상태 코드', right: s.code });
    P.box('bodyb', 348, 240, 316, 30, { cls: s.vis ? 'wait' : 'ghost', title: '본문', right: s.vis });
    P.note('점선 칸은 이 요청이 묻지 않는 구성 요소입니다.');
  },
  assume: 'pay의 상태 네 가지, 주소 세 가지, show-details와 요청한 사람 네 가지, readiness 그룹에 pay를 넣었는지 두 가지를 곱한 아흔여섯 조합을 모두 실제 스프링 부트 4.1.1 서버(스프링 프레임워크 7.0.9, 내장 톰캣 11, 127.0.0.1)에 HTTP 요청으로 보내, HTTP 상태 코드와 본문의 글자 전체, 그 주소가 묻는 구성 요소의 목록, PayHealthIndicator가 실행됐는지가 화면과 일치하는 것을 확인했습니다. 본문에서 항목이 components, groups, status 순서로 나오는 것도 이 버전의 실제 응답 그대로이며, 버전에 따라 순서는 다를 수 있습니다. 구성 요소를 통제한 방법: 대조에 쓴 환경에는 H2와 DataSource 자동 설정이 함께 있어, 아무 설정 없이 띄우면 db, diskSpace, ping, ssl이 자동으로 붙습니다(실행으로 확인). 이것들을 management.health.defaults.enabled=false로 꺼서 livenessState, readinessState, pay 세 개만 남겼습니다. 실제 애플리케이션에서는 이 구성 요소들도 함께 합쳐집니다. 스프링 시큐리티는 모든 요청을 허용하도록 두었습니다. 시큐리티가 /actuator 주소를 막아 둔 애플리케이션에서는 로그인하지 않은 요청이 헬스 엔드포인트에 닿기 전에 거절될 수 있고, 그 경우는 다루지 않았습니다. "로그인한 사용자의 요청"은 비밀번호 로그인 대신, 요청에 스프링 시큐리티의 인증 정보를 채워 주는 시험용 필터로 만들었습니다. management.endpoint.health.roles를 비워 두면 로그인한 사용자 모두에게 보여 준다는 것은 라이브러리에 든 설정 설명과 이 실행 결과가 일치합니다. 화면의 PayHealthIndicator는 @Component 클래스이지만 대조에서는 같은 빈 이름(payHealthIndicator)의 @Bean으로 등록했고, 답할 상태를 실행 중에 바꿨습니다. 스프링 부트 3과 달라진 점: 4.1.1에서는 management.endpoint.health.probes.enabled의 기본값이 true여서 아무 설정 없이도 liveness와 readiness 그룹이 있습니다(실행으로 확인. 스프링 부트 3에서는 쿠버네티스 같은 환경에서만 자동으로 켜진다고 알려져 있으나 그 버전은 실행해 보지 않았습니다). HealthIndicator와 Health는 spring-boot-health 모듈의 org.springframework.boot.health.contributor 패키지에 있습니다. 화면에 없는 경우도 같은 방법으로 확인했습니다. 아무 설정이 없으면 /actuator의 목록에는 health만 있고 /actuator/env, /actuator/beans, /actuator/info는 404입니다. management.endpoints.web.exposure.include=*로 열면 env와 beans가 200이 되지만 shutdown은 여전히 404입니다. 노출(exposure)과 별개로 접근(access)이 막혀 있기 때문이며, 반대로 management.endpoint.shutdown.access=unrestricted만 주고 노출하지 않아도 404입니다(둘 다 주면 주소가 생깁니다. 실제로 종료시키는 POST 요청은 보내지 않았습니다). exposure.include=*에 management.endpoint.env.access=none을 더하면 env만 404가 됩니다. exposure.include=env처럼 적으면 기본값을 대신하므로 health가 404가 됩니다. probes.enabled=false로 끄면 liveness와 readiness 주소가 404가 되고 본문의 groups도 사라집니다. liveness 그룹에 pay를 넣으면 pay가 DOWN일 때 liveness도 503이 됩니다. 상태의 순서는 구성 요소 둘의 상태 열여섯 쌍으로 확인했고, 모든 구성 요소가 UNKNOWN이면 전체 상태도 UNKNOWN이지만 응답은 200입니다. /actuator/health/pay처럼 구성 요소 하나만 묻는 주소는 구성 요소별 내용이 보이는 설정에서만 응답하고, 숨기는 설정에서는 404입니다. 확인하지 않은 것: 애플리케이션이 시작하는 중이거나 종료하는 중일 때 livenessState와 readinessState가 바뀌는 것, 로드밸런서나 쿠버네티스가 이 응답을 받아 하는 일(널리 알려진 설명을 따랐습니다), 관리용 포트를 따로 두는 management.server.port, 상태의 순서와 HTTP 상태 코드 대응을 바꾸는 설정, show-components 설정, 헬스 응답의 캐시.',
});
