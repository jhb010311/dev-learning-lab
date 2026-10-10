Lab.register({
  id: 'config', nav: '설정 우선순위', cat: '스프링', mode: 'step',
  title: '같은 설정이 여러 곳에 있으면 어느 값이 이기나',
  intro: '스프링 부트는 설정값을 파일, 환경 변수, 실행 옵션 등 여러 곳에서 읽습니다. 같은 키가 여러 곳에 있으면 우선순위가 높은 쪽이 이깁니다. app.timeout이라는 설정을 여러 곳에 넣었다 뺐다 하며 최종 값을 확인하세요.',
  terms: ['외부화 설정과 프로파일', 'Spring Boot 자동 설정(Auto-configuration)', 'CI/CD'], ranks: ['boot', 'deploy'],
  controls: [
    { id: 'yml', label: 'application.yml에 app.timeout: 3000', type: 'check', value: true },
    { id: 'prof', label: 'prod 프로파일을 켜고 application-prod.yml에 app.timeout: 5000', type: 'check', value: true },
    { id: 'env', label: '환경 변수 APP_TIMEOUT=7000', type: 'check', value: false },
    { id: 'sys', label: 'JVM 옵션 -Dapp.timeout=8000', type: 'check', value: false },
    { id: 'cli', label: '실행 인자 --app.timeout=9000', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: '기본 파일과 prod 파일에 둘 다 있습니다. prod 쪽이 이깁니다.', v: { yml: true, prof: true, env: false, sys: false, cli: false } },
    { t: '환경 변수를 추가하면', d: '파일보다 환경 변수가 우선합니다. 컨테이너 배포에서 흔히 쓰는 방식입니다.', v: { yml: true, prof: true, env: true, sys: false, cli: false } },
    { t: '실행 인자까지 주면', d: '실행 인자가 가장 우선합니다.', v: { yml: true, prof: true, env: true, sys: true, cli: true } },
    { t: '기본 파일만', d: '다른 곳에 없으면 기본 파일의 값을 씁니다.', v: { yml: true, prof: false, env: false, sys: false, cli: false } },
    { t: '어디에도 없으면', d: '코드에 적어 둔 기본값을 씁니다.', v: { yml: false, prof: false, env: false, sys: false, cli: false } },
  ],
  SRC: [['cli', '실행 인자 (--app.timeout=9000)', '9000'], ['sys', 'JVM 시스템 프로퍼티 (-Dapp.timeout=8000)', '8000'], ['env', '운영체제 환경 변수 (APP_TIMEOUT=7000)', '7000'], ['prof', 'application-prod.yml (프로파일 전용 파일)', '5000'], ['yml', 'application.yml (기본 파일)', '3000']],
  code: function (c) {
    var run = (c.env ? 'APP_TIMEOUT=7000 ' : '') + 'java ' + (c.sys ? '-Dapp.timeout=8000 ' : '') + '-jar app.jar' + (c.prof ? ' --spring.profiles.active=prod' : '') + (c.cli ? ' --app.timeout=9000' : '');
    return '@Value("${app.timeout:1000}")          // 어디에도 없으면 1000\nprivate int timeout;\n' + (c.yml ? '\n# application.yml\napp.timeout: 3000\n' : '') + (c.prof ? '\n# application-prod.yml\napp.timeout: 5000\n' : '') + '\n# 실행\n' + run;
  },
  label: function (c) { var on = this.SRC.filter(function (s) { return c[s[0]]; }).map(function (s) { return s[2]; }); return on.length ? '설정된 값: ' + on.join(', ') : '어디에도 설정 안 함'; },
  columns: ['최종 값', '값을 준 곳', '가려진 값'],
  simulate: function (c) {
    var ev = [], sum = [], SRC = this.SRC, win = null, hidden = [], seen = [];
    function push(s, k) { ev.push({ s: s, k: k, snap: { seen: seen.slice(), win: win } }); }
    push('애플리케이션이 뜨면서 app.timeout의 값을 찾습니다. 스프링 부트는 정해진 순서로 여러 곳을 살피고, 우선순위가 높은 곳에서 찾은 값을 씁니다. 우선순위가 높은 곳부터 봅니다.', '');
    SRC.forEach(function (s, i) {
      seen.push(s[0]);
      if (!c[s[0]]) { push((i + 1) + '순위 ' + s[1].split(' (')[0] + ': 이 키가 없습니다. 다음으로 넘어갑니다.', ''); return; }
      if (!win) { win = s[0]; push((i + 1) + '순위 ' + s[1].split(' (')[0] + ': 값 ' + s[2] + '을 찾았습니다. 더 높은 우선순위에 값이 없었으므로 이 값이 최종 값입니다.' + (s[0] === 'env' ? ' 환경 변수 이름 APP_TIMEOUT은 대문자와 밑줄로 적지만, 스프링 부트가 app.timeout과 같은 키로 맞춰 줍니다.' : ''), 'good'); }
      else { hidden.push(s[2]); push((i + 1) + '순위 ' + s[1].split(' (')[0] + ': 값 ' + s[2] + '이 있지만, 더 높은 우선순위에서 이미 값이 정해졌습니다. 이 값은 쓰이지 않습니다.', ''); }
    });
    var val = win ? SRC.filter(function (s) { return s[0] === win; })[0][2] : '1000', from = win ? SRC.filter(function (s) { return s[0] === win; })[0][1].split(' (')[0] : '코드의 기본값 (@Value의 : 뒤)';
    if (!win) { seen.push('def'); push('어디에도 값이 없습니다. @Value에 적어 둔 기본값 1000을 씁니다. 기본값도 없었다면 애플리케이션이 뜨다가 실패합니다.', ''); }
    sum.push('app.timeout의 최종 값은 ' + val + '입니다. 값을 준 곳: ' + from + '.' + (hidden.length ? ' 가려진 값: ' + hidden.join(', ') + '.' : ''));
    sum.push('우선순위는 높은 쪽부터 실행 인자 → JVM 시스템 프로퍼티 → 환경 변수 → 프로파일 전용 파일 → 기본 파일입니다. 실행하는 쪽에 가까울수록 우선합니다.');
    sum.push('이 순서 덕분에 같은 빌드 결과물(jar, 이미지)을 고치지 않고 환경마다 다른 값으로 실행할 수 있습니다. DB 주소나 비밀번호처럼 환경마다 다르거나 코드 저장소에 넣으면 안 되는 값은 환경 변수나 실행 시 주입으로 넘깁니다.');
    if (c.env && c.prof && win === 'env') sum.push('"파일을 고쳤는데 값이 안 바뀐다"면 더 우선하는 곳(환경 변수 등)에 같은 키가 있는지 먼저 확인합니다.');
    return { events: ev, summary: sum, row: [val, from, hidden.length ? hidden.join(', ') : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { seen: [], win: null };
    H.table(v, ['우선순위', '설정을 읽는 곳', '들어 있는 값', '판정'], this.SRC.map(function (x, i) { var on = s.seen.indexOf(x[0]) >= 0, has = c[x[0]]; return { cls: has ? '' : 'gone', cells: [(i + 1) + '순위', x[1], has ? x[2] : '(없음)', { v: !on ? '' : !has ? '없음' : s.win === x[0] ? '이 값 사용' : '가려짐', cls: on && has ? (s.win === x[0] ? 'good' : 'hot') : '' }] }; }).concat([{ cells: ['마지막', '코드의 기본값 (@Value의 : 뒤)', '1000', { v: s.seen.indexOf('def') >= 0 ? '이 값 사용' : '', cls: s.seen.indexOf('def') >= 0 ? 'good' : '' }] }]), '우선순위가 높은 곳부터');
    var win = s.win ? this.SRC.filter(function (x) { return x[0] === s.win; })[0][2] : s.seen.indexOf('def') >= 0 ? '1000' : '?';
    H.counters(v, [[win, 'app.timeout의 최종 값']]);
  },
  assume: '스프링 부트 공식 문서의 외부화 설정 우선순위 가운데 자주 쓰는 다섯 곳만 골랐습니다. 실제 목록에는 SPRING_APPLICATION_JSON, jar 바깥의 설정 파일(jar 안의 파일보다 우선) 등이 더 있습니다. 프로파일 전용 파일은 해당 프로파일이 켜져 있을 때만 읽습니다. 32가지 조합 모두를 실제 스프링 부트 4.1.1로 조합마다 프로세스를 새로 띄워, 최종 값과 그 값을 준 곳이 화면과 일치하는 것을 확인했습니다.',
});
