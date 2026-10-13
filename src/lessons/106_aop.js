Lab.register({
  id: 'aop', nav: 'AOP: 어드바이스와 포인트컷', cat: '스프링', mode: 'step',
  title: '어드바이스는 어느 메서드에, 어떤 순서로 끼어드나',
  intro: '로그 남기기처럼 여러 메서드에 똑같이 필요한 일을 한 클래스(애스펙트)에 적어 두면, 스프링이 메서드 호출의 앞뒤에 그 코드를 끼워 넣습니다. 끼워 넣는 코드를 어드바이스, 어느 메서드에 끼울지 고르는 식을 포인트컷이라고 합니다.',
  terms: ['AOP(관점 지향 프로그래밍)', '어드바이스(Advice)', '포인트컷(Pointcut)', '애스펙트(Aspect)와 @Order', '프록시(Proxy)'],
  controls: [
    { id: 'pc', label: '포인트컷 (어느 메서드에 끼어들지 고르는 식)', type: 'select', value: 'cls', options: [['cls', 'execution(* shop.OrderService.*(..))'], ['arg', 'execution(* shop.*.*(String))'], ['noarg', 'execution(* shop.OrderService.cancel())'], ['ann', '@annotation(shop.Audit)']] },
    { id: 'm', label: '다른 빈에서 부르는 메서드', type: 'select', value: 'order', options: [['order', 'OrderService의 order(String)'], ['cancel', 'OrderService의 cancel(Long) · @Audit 붙음'], ['join', 'MemberService의 join(String) · @Audit 붙음']] },
    { id: 'out', label: '그 메서드의 결과', type: 'select', value: 'ex', options: [['ok', '정상적으로 값을 돌려준다'], ['ex', '예외를 던진다 (IllegalStateException)']] },
    { id: 'second', label: '애스펙트의 수와 @Order', type: 'select', value: 'none', options: [['none', 'LogAspect 하나만'], ['log1', '둘: LogAspect @Order(1), TimeAspect @Order(2)'], ['time1', '둘: TimeAspect @Order(1), LogAspect @Order(2)']], hint: 'TimeAspect는 @Around 하나만 가진 두 번째 애스펙트입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'LogAspect 하나만 둔 채 order 메서드가 IllegalStateException을 던지면 어드바이스는 어떻게 실행되나', d: '메서드가 예외를 던집니다. @Around의 뒷부분은 실행되지 않고 @After는 실행됩니다.', v: { pc: 'cls', m: 'order', out: 'ex', second: 'none' } },
    { t: '정상적으로 끝나면', q: 'order 메서드가 예외 대신 값을 정상적으로 돌려주면', d: '어드바이스 다섯 가지 가운데 네 가지가 정해진 순서로 실행됩니다.', v: { pc: 'cls', m: 'order', out: 'ok', second: 'none' } },
    { t: '괄호 안을 비운 포인트컷', q: '포인트컷을 cancel() 형태로 바꾸고 인자가 Long인 cancel 메서드를 정상적으로 부르면', d: 'cancel()이라고 썼는데 cancel(Long)에는 끼어들지 않습니다.', v: { pc: 'noarg', m: 'cancel', out: 'ok', second: 'none' } },
    { t: '애너테이션으로 고르기', q: '포인트컷을 @annotation(shop.Audit) 식으로 바꾸고 @Audit이 붙은 MemberService의 join을 정상적으로 부르면', d: '@Audit이 붙은 메서드라면 다른 클래스의 메서드에도 끼어듭니다.', v: { pc: 'ann', m: 'join', out: 'ok', second: 'none' } },
    { t: '같은 클래스인데 끼어들지 않는 메서드', q: '포인트컷을 @annotation(shop.Audit) 식으로 바꾸고 @Audit이 없는 order 메서드를 정상적으로 부르면', d: '@Audit이 없는 order에는 아무것도 실행되지 않습니다.', v: { pc: 'ann', m: 'order', out: 'ok', second: 'none' } },
    { t: '애스펙트가 둘일 때', q: 'order 메서드가 정상적으로 값을 돌려주는데 LogAspect @Order(1), TimeAspect @Order(2) 둘을 두면', d: '@Order의 숫자가 작은 LogAspect가 바깥쪽에서 감쌉니다.', v: { pc: 'cls', m: 'order', out: 'ok', second: 'log1' } },
    { t: '@Order를 서로 바꾸면', q: '예외를 던지는 order 메서드에 애스펙트 둘을 TimeAspect @Order(1), LogAspect @Order(2) 순서로 두면', d: 'TimeAspect가 바깥쪽이 됩니다. 예외가 나도 "Time 끝"은 찍힙니다.', v: { pc: 'cls', m: 'order', out: 'ex', second: 'time1' } },
  ],
  exprs: { cls: 'execution(* shop.OrderService.*(..))', arg: 'execution(* shop.*.*(String))', noarg: 'execution(* shop.OrderService.cancel())', ann: '@annotation(shop.Audit)' },
  code: function (c) {
    var E = this.exprs[c.pc], lo = c.second === 'log1' ? '@Order(1)\n' : c.second === 'time1' ? '@Order(2)\n' : '', to = c.second === 'log1' ? '@Order(2)' : '@Order(1)';
    var call = { order: 'orderService.order("키보드");', cancel: 'orderService.cancel(7L);', join: 'memberService.join("kim");' }[c.m];
    function body(name, ret) { return '        System.out.println("' + name + ' 본문");\n        ' + (c.out === 'ex' && c.m === name ? 'throw new IllegalStateException("실패");' : 'return "' + ret + '";') + '\n'; }
    var log = '@Aspect\n@Component\n' + lo + 'class LogAspect {\n    @Pointcut("' + E + '")\n    void pick() { }                          // 어느 메서드에 끼어들지 고른다\n\n' +
      '    @Around("pick()")\n    Object around(ProceedingJoinPoint pjp) throws Throwable {\n        System.out.println("Log @Around 앞");\n        Object result = pjp.proceed();       // 안쪽으로 넘긴다\n        System.out.println("Log @Around 뒤");\n        return result;\n    }\n\n' +
      '    @Before("pick()")\n    void before() { System.out.println("Log @Before"); }\n\n' +
      '    @AfterReturning("pick()")\n    void afterReturning() { System.out.println("Log @AfterReturning"); }\n\n' +
      '    @AfterThrowing("pick()")\n    void afterThrowing() { System.out.println("Log @AfterThrowing"); }\n\n' +
      '    @After("pick()")\n    void after() { System.out.println("Log @After"); }\n}\n\n';
    var time = c.second === 'none' ? '' : '@Aspect\n@Component\n' + to + '\nclass TimeAspect {\n    @Around("' + E + '")\n    Object time(ProceedingJoinPoint pjp) throws Throwable {\n        System.out.println("Time 시작");\n        try {\n            return pjp.proceed();\n        } finally {\n            System.out.println("Time 끝");    // 예외가 나도 실행된다\n        }\n    }\n}\n\n';
    var svc = '@Service\nclass OrderService {\n    public String order(String item) {\n' + body('order', '주문 완료') + '    }\n\n    @Audit\n    public String cancel(Long id) {\n' + body('cancel', '취소 완료') + '    }\n}\n\n' +
      '@Service\nclass MemberService {\n    @Audit\n    public String join(String name) {\n' + body('join', '가입 완료') + '    }\n}';
    return '// 아래 클래스는 모두 shop 패키지에 있다\n// @Audit은 이 예제에서 직접 만든 애너테이션이다 (메서드에 붙이는 표시)\n// 다른 빈에서 부르는 코드: ' + call + '\n\n' + log + time + svc;
  },
  label: function (c) { return { cls: 'OrderService.*(..)', arg: 'shop.*.*(String)', noarg: 'cancel()', ann: '@annotation(Audit)' }[c.pc] + ' · ' + { order: 'order(String)', cancel: 'cancel(Long)', join: 'join(String)' }[c.m] + ' · ' + (c.out === 'ok' ? '정상' : '예외') + ' · ' + { none: 'Log만', log1: 'Log 바깥, Time 안', time1: 'Time 바깥, Log 안' }[c.second]; },
  columns: ['포인트컷이 이 메서드를 고르나', '찍힌 순서', '호출한 쪽이 받는 것'],
  // 포인트컷이 세 메서드 가운데 무엇을 고르는지, 부른 메서드가 들어 있는 빈이 프록시가 되는지
  match: function (c) {
    var T = { cls: { order: 1, cancel: 1, join: 0 }, arg: { order: 1, cancel: 0, join: 1 }, noarg: { order: 0, cancel: 0, join: 0 }, ann: { order: 0, cancel: 1, join: 1 } }[c.pc];
    var bean = c.m === 'join' ? 'MemberService' : 'OrderService', inBean = bean === 'MemberService' ? ['join'] : ['order', 'cancel'], picked = inBean.filter(function (x) { return T[x]; });
    return { hit: !!T[c.m], proxy: picked.length > 0, bean: bean, picked: picked };
  },
  simulate: function (c) {
    var M = this.match(c), ex = c.out === 'ex', ev = [], sum = [], m = c.m;
    var layers = c.second === 'none' ? ['log'] : c.second === 'log1' ? ['log', 'time'] : ['time', 'log'], two = layers.length > 1;
    var sig = { order: 'order(String)', cancel: 'cancel(Long)', join: 'join(String)' }[m], call = { order: 'orderService.order("키보드")', cancel: 'orderService.cancel(7L)', join: 'memberService.join("kim")' }[m], ret = { order: '"주문 완료"', cancel: '"취소 완료"', join: '"가입 완료"' }[m];
    var st = { pc: '', bean: '', run: [], cur: '', skip: [], body: '', caller: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function print(line, s, k) { st.run.push(line); st.cur = line; push(s, k || ''); }
    var desc = {
      cls: 'execution(* shop.OrderService.*(..))은 shop.OrderService 클래스의 모든 메서드를 고릅니다. 맨 앞의 *는 반환 타입이 무엇이든, 메서드 이름 자리의 *는 이름이 무엇이든, (..)는 매개변수가 몇 개든 좋다는 뜻입니다.',
      arg: 'execution(* shop.*.*(String))은 shop 패키지의 어느 클래스든, 이름이 무엇이든, String 하나만 받는 메서드를 고릅니다.',
      noarg: 'execution(* shop.OrderService.cancel())은 OrderService의 cancel 가운데 매개변수가 없는 것만 고릅니다. 괄호 안을 비우면 "매개변수가 무엇이든"이 아니라 "매개변수 없음"이라는 뜻입니다.',
      ann: '@annotation(shop.Audit)은 @Audit이 붙은 메서드를 고릅니다. 클래스 이름과 메서드 이름은 보지 않습니다.' }[c.pc];
    var why = {
      cls: { order: 'order는 OrderService의 메서드이므로 고른 메서드입니다.', cancel: 'cancel은 OrderService의 메서드이므로 고른 메서드입니다.', join: 'join은 MemberService의 메서드라서 고르지 않습니다.' },
      arg: { order: 'order(String)은 String 하나를 받으므로 고른 메서드입니다.', cancel: 'cancel(Long)은 매개변수가 Long이라서 고르지 않습니다.', join: 'join(String)은 String 하나를 받으므로 고른 메서드입니다. 클래스가 달라도 shop 패키지 안이면 됩니다.' },
      noarg: { order: 'order는 이름이 cancel이 아니므로 고르지 않습니다.', cancel: '실제 메서드는 cancel(Long)으로 매개변수가 하나 있으므로 고르지 않습니다. 이름이 같아도 소용이 없습니다.', join: 'join은 OrderService의 메서드가 아니므로 고르지 않습니다.' },
      ann: { order: 'order에는 @Audit이 없으므로 고르지 않습니다.', cancel: 'cancel에는 @Audit이 붙어 있으므로 고른 메서드입니다.', join: 'join에도 @Audit이 붙어 있으므로 고른 메서드입니다. 어느 클래스의 메서드인지는 따지지 않습니다.' } }[c.pc][m];
    push('애플리케이션이 뜰 때: 스프링이 포인트컷을 빈의 메서드 하나하나와 맞춰 봅니다. ' + desc, '');
    st.pc = M.hit ? '고름' : '고르지 않음'; st.bean = M.proxy ? '프록시' : '원래 객체';
    push(sig + ' 메서드와 맞춰 본 결과: ' + why + ' ' + (M.hit ? M.bean + ' 빈 대신 프록시(대리 객체)가 등록됩니다(원래 객체와 프록시는 서로 다른 객체).' : M.proxy ? '다만 같은 클래스의 ' + M.picked.join(', ') + ' 메서드가 고른 메서드라서 ' + M.bean + ' 빈 대신 프록시가 등록됩니다(원래 객체와 프록시는 서로 다른 객체).' : M.bean + '에는 고른 메서드가 하나도 없으므로 프록시를 만들지 않고 원래 객체를 그대로 빈으로 둡니다. 오류나 경고는 없습니다.'), M.hit ? 'good' : 'bad');
    push(call + ': 다른 빈이 메서드를 부릅니다. ' + (M.hit ? '호출은 프록시에 먼저 도착합니다. 프록시는 이 메서드에 걸린 어드바이스를 바깥쪽부터 차례로 실행합니다.' : M.proxy ? '호출은 프록시에 도착하지만 고른 메서드가 아니므로, 프록시는 아무것도 끼워 넣지 않고 실제 객체에 넘깁니다.' : '프록시가 없으므로 호출이 실제 객체의 메서드로 바로 갑니다.'), '');
    if (M.hit) layers.forEach(function (a, i) {
      if (a === 'time') print('Time 시작', 'TimeAspect의 @Around: ' + (i === 0 ? '@Order의 숫자가 작은 TimeAspect가 바깥쪽이라 가장 먼저 시작합니다. ' : '@Order의 숫자가 큰 TimeAspect는 안쪽이라 LogAspect의 앞부분이 끝난 뒤에 시작합니다. ') + '"Time 시작"을 찍고 pjp.proceed()로 안쪽에 넘깁니다.');
      else {
        print('Log @Around 앞', 'LogAspect의 @Around 앞부분: ' + (two ? (i === 0 ? '@Order의 숫자가 작은 LogAspect가 바깥쪽이라 가장 먼저 시작합니다. ' : '@Order의 숫자가 큰 LogAspect는 안쪽이라 TimeAspect 다음에 시작합니다. ') : '') + '한 애스펙트 안에서는 @Around가 가장 먼저 시작합니다. pjp.proceed()보다 위에 적은 줄이 실행됩니다.');
        print('Log @Before', 'pjp.proceed() 호출 → LogAspect의 @Before: @Around가 안쪽으로 넘기면 같은 애스펙트의 @Before가 실행됩니다. ' + (two && i === 0 ? '그다음에 안쪽 애스펙트로 넘어갑니다.' : '그다음이 메서드 본문입니다.'));
      }
    });
    st.run.push(m + ' 본문'); st.cur = m + ' 본문'; st.body = ex ? 'ex' : 'ok';
    push(sig + ' 본문 실행: "' + m + ' 본문"을 찍고 ' + (ex ? 'IllegalStateException을 던집니다.' + (M.hit ? ' 예외는 안쪽에서 바깥쪽으로, 들어온 길을 거꾸로 지나가며 나갑니다.' : '') : ret + '를 돌려줍니다.' + (M.hit ? ' 돌려준 값은 들어온 길을 거꾸로 지나가며 나갑니다.' : '')), ex ? 'bad' : '');
    if (M.hit) layers.slice().reverse().forEach(function (a) {
      if (a === 'time') print('Time 끝', 'TimeAspect의 finally: ' + (ex ? 'pjp.proceed()에서 예외가 올라왔지만 finally 안의 줄은 예외에도 실행됩니다. "Time 끝"을 찍고, 예외는 그대로 바깥으로 나갑니다.' : 'pjp.proceed()가 값을 돌려줬습니다. finally 안의 "Time 끝"을 찍고, 받은 값을 그대로 바깥으로 돌려줍니다.'));
      else if (!ex) {
        print('Log @AfterReturning', 'LogAspect의 @AfterReturning: 안쪽이 정상적으로 값을 돌려줬을 때만 실행됩니다. 예외가 없었으므로 @AfterThrowing은 실행되지 않습니다.', 'good');
        print('Log @After', 'LogAspect의 @After: 정상적으로 끝났든 예외가 났든 항상 실행됩니다. 같은 애스펙트 안에서는 @AfterReturning보다 나중입니다.');
        print('Log @Around 뒤', 'LogAspect의 @Around 뒷부분: pjp.proceed()가 값을 돌려줬으므로 그 아래에 적은 줄이 실행됩니다. 한 애스펙트에서 가장 먼저 시작한 @Around가 가장 나중에 끝납니다.');
      } else {
        print('Log @AfterThrowing', 'LogAspect의 @AfterThrowing: 안쪽에서 예외가 나왔을 때만 실행됩니다. 예외를 잡아서 없애는 것이 아니라 지나가는 예외를 보기만 하므로, 예외는 계속 밖으로 나갑니다. @AfterReturning은 실행되지 않습니다.', 'bad');
        print('Log @After', 'LogAspect의 @After: 예외가 났어도 실행됩니다. 자바의 finally와 비슷합니다. 같은 애스펙트 안에서는 @AfterThrowing보다 나중입니다.');
        st.skip.push('Log @Around 뒤'); st.cur = '';
        push('LogAspect의 @Around 뒷부분: pjp.proceed()가 예외를 던졌으므로, 그 아래에 적은 "Log @Around 뒤" 줄은 실행되지 않고 예외가 그대로 나갑니다. 예외가 나도 실행하려면 try-finally로 감싸야 합니다.', 'bad');
      }
    });
    st.cur = ''; st.caller = ex ? 'IllegalStateException' : ret;
    push('호출한 쪽: ' + (ex ? 'IllegalStateException을 받습니다.' + (M.hit ? ' 어느 어드바이스도 예외를 잡지 않았으므로 예외가 그대로 전달됩니다.' : '') : ret + '를 받습니다.' + (M.hit ? ' 어드바이스가 끼어들었지만 돌려받는 값은 그대로입니다.' : '')), ex ? 'bad' : 'good');
    var seq = st.run.slice();
    if (!M.hit && c.pc === 'noarg' && m === 'cancel') sum.push('괄호 안을 비운 cancel()은 "매개변수가 없는 cancel"만 고릅니다. 매개변수와 상관없이 고르려면 cancel(..)이라고 씁니다.');
    if (!M.hit) sum.push('포인트컷이 고르지 않은 메서드는 평범한 메서드 호출과 똑같이 실행됩니다. 식을 잘못 써서 아무것도 고르지 못해도 오류가 나지 않으므로, 어드바이스가 실제로 실행되는지 확인해야 합니다.');
    if (M.hit && ex) sum.push('예외가 나면 @AfterThrowing과 @After가 실행되고, @AfterReturning과 @Around에서 pjp.proceed() 아래에 적은 줄은 실행되지 않습니다. 어느 경우에나 해야 하는 일은 @After에 두거나, @Around 안에서 try-finally로 감쌉니다.');
    if (M.hit && !ex) sum.push('한 애스펙트 안의 순서는 @Around 앞부분 → @Before → 메서드 본문 → @AfterReturning → @After → @Around 뒷부분입니다. 클래스 안에 메서드를 적은 순서와는 관계가 없습니다.');
    if (M.hit && two) sum.push('@Order의 숫자가 작은 애스펙트가 바깥쪽입니다. 바깥쪽 애스펙트는 들어갈 때 먼저, 나올 때 나중에 실행됩니다. 지금은 ' + (layers[0] === 'log' ? 'LogAspect' : 'TimeAspect') + '가 바깥쪽입니다.');
    return { events: ev, summary: sum, hit: M.hit, proxy: M.proxy, bean: M.bean, layers: layers, seq: seq, row: [M.hit ? '고름' : '고르지 않음', seq.join(' → '), st.caller] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '포인트컷', s.pc ? '부른 메서드를 ' + s.pc : '맞춰 보는 중', s.pc === '고름' ? 'good' : s.pc ? 'bad' : 'none');
    H.lane(ln, sim.bean + ' 빈', s.bean ? (s.bean === '프록시' ? '프록시가 대신 등록됨' : '프록시 없음 (원래 객체 그대로)') : '아직 정해지지 않음', s.bean === '프록시' ? 'hot' : s.bean ? 'wait' : 'none');
    H.table(v, ['순서', '콘솔에 찍힌 줄', '찍은 곳'], s.run.map(function (x, i) {
      var who = x.indexOf('Log ') === 0 ? 'LogAspect' : x.indexOf('Time ') === 0 ? 'TimeAspect' : '메서드 본문';
      return { cells: [String(i + 1), { v: x, cls: x === s.cur ? 'hot' : '' }, who] };
    }).concat(s.skip.map(function (x) { return { cls: 'gone', cells: ['-', { v: x + ' (실행되지 않음)', cls: 'bad' }, 'LogAspect'] }; })), '콘솔 출력');  },
  // 그림: 애스펙트를 겹겹의 상자로 그린다. 바깥 상자부터 들어가 가운데의 메서드 본문에 닿고, 나올 때는 안쪽부터 나온다. 왼쪽 칸은 들어갈 때, 오른쪽 칸은 나올 때 실행되는 어드바이스다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { pc: '', bean: '', run: [], cur: '', skip: [], body: '', caller: '' };
    var layers = sim.layers, two = layers.length > 1, L = 8, R = 672, body = c.m + ' 본문';
    P.size(680, 316);
    function chip(id, x, y, w, line, name) {
      var i = s.run.indexOf(line), cls = i >= 0 ? (s.cur === line ? 'hot now' : 'good') : s.skip.indexOf(line) >= 0 ? 'bad' : 'ghost';
      P.box(id, x, y, w, 30, { cls: cls, title: (i >= 0 ? (i + 1) + '. ' : '') + name, center: true });
    }
    P.text('top', 340, 22, s.pc === '고르지 않음' ? '포인트컷이 이 메서드를 고르지 않습니다. 어드바이스는 실행되지 않습니다.' : '왼쪽은 들어갈 때, 오른쪽은 나올 때 실행됩니다. 숫자는 실행된 순서입니다.', { cls: s.pc === '고르지 않음' ? 'bad' : 'mut', anchor: 'middle' });
    layers.forEach(function (a, i) {
      var top = 34 + i * 28, h = 228 - i * 36, ord = c.second === 'none' ? '' : (c.second === 'log1') === (a === 'log') ? ' @Order(1) · 바깥쪽' : ' @Order(2) · 안쪽';
      P.region('lay_' + a, L, top, R - L, h, (a === 'log' ? 'LogAspect' : 'TimeAspect') + ord);
      if (a === 'log') {
        chip('la1', L + 8, 120, 112, 'Log @Around 앞', '@Around 앞'); chip('lb', L + 8, 156, 112, 'Log @Before', '@Before');
        chip('lr', R - 160, 84, 152, 'Log @AfterReturning', '@AfterReturning'); chip('lt', R - 160, 120, 152, 'Log @AfterThrowing', '@AfterThrowing');
        chip('lf', R - 160, 156, 152, 'Log @After', '@After'); chip('la2', R - 160, 192, 152, 'Log @Around 뒤', '@Around 뒤');
        L += 128; R -= 168;
      } else {
        chip('t1', L + 8, 138, 96, 'Time 시작', 'Time 시작'); chip('t2', R - 104, 138, 96, 'Time 끝', 'Time 끝');
        L += 112; R -= 112;
      }
    });
    var bi = s.run.indexOf(body);
    P.box('body', L + 8, 112, R - L - 16, 82, { cls: bi < 0 ? 'ghost' : s.cur === body ? (s.body === 'ex' ? 'bad now' : 'hot now') : s.body === 'ex' ? 'bad' : 'good', title: (bi >= 0 ? (bi + 1) + '. ' : '') + body, sub: bi < 0 ? '아직 실행 전' : s.body === 'ex' ? '예외를 던짐' : '값을 돌려줌', center: true });
    P.box('res', 8, 274, 664, 34, { cls: !s.caller ? 'ghost' : s.caller.indexOf('Exception') >= 0 ? 'bad' : 'good', title: '호출한 쪽이 받는 것', right: s.caller || '아직 실행 중' });
    P.note('점선 상자 하나가 애스펙트 하나입니다. 호출은 바깥 상자의 왼쪽 칸부터 지나 가운데의 메서드 본문에 닿고, 결과(값이나 예외)는 안쪽 상자의 오른쪽 칸부터 지나 밖으로 나옵니다. 빨간 칸은 예외 때문에 실행되지 못한 줄, 끝까지 흐린 칸은 이번 경우에 해당하지 않아 실행되지 않은 어드바이스입니다.');
  },
  assume: '72가지 조합 모두를 이 PC의 스프링 프레임워크 7.0.9(스프링 부트 4.1.1에 들어 있는 버전, AspectJ weaver 1.9.25.1, JDK 21)에서 화면과 같은 구조의 코드로 실행해, 포인트컷이 메서드를 고르는지, 콘솔에 찍힌 줄의 순서, 호출한 쪽이 받는 것, 빈이 프록시인지를 대조했습니다. 어드바이스 메서드를 클래스 안에 적는 순서를 거꾸로 해도 72가지 결과가 모두 같다는 것, @Around에서 pjp.proceed()를 부르지 않으면 메서드 본문이 실행되지 않는다는 것도 실행으로 확인했습니다. 실행으로 확인하지 못하고 스프링 문서를 따른 것은 두 가지입니다. 첫째, 한 애스펙트 안의 실행 순서는 스프링 프레임워크 5.2.7부터 지금과 같이 정해졌고 그보다 오래된 버전에서는 @After가 @AfterReturning보다 먼저 실행되기도 했다는 것입니다(이 PC에는 옛 버전이 없습니다). 둘째, @Order를 붙이지 않은 애스펙트끼리의 순서는 정해져 있지 않다는 것입니다. 화면의 코드는 @EnableAspectJAutoProxy가 켜져 있다고 가정합니다(실행할 때는 설정 클래스에 직접 붙였습니다. 스프링 부트에서는 AOP 스타터를 넣으면 자동으로 켜진다고 문서에 나와 있으나 이 부분은 실행으로 확인하지 않았습니다). 메서드는 다른 빈에서 부른다고 가정했습니다. 같은 클래스 안에서 부르면 프록시를 지나지 않아 어드바이스가 실행되지 않는데, 이 내용은 "프록시와 자기 호출" 실습에서 다룹니다. 포인트컷 메서드의 이름은 pick으로 지었습니다. 이 PC에서 이름을 target으로 지었을 때는 오류 없이 LogAspect의 어드바이스가 하나도 실행되지 않았습니다(target은 포인트컷 식에서 따로 쓰이는 낱말입니다).',
});
