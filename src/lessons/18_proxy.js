Lab.register({
  id: 'proxy', nav: '프록시와 자기 호출', cat: '스프링', mode: 'step',
  title: '애너테이션을 붙였는데 왜 동작하지 않나',
  intro: '@Transactional이나 @Async는 메서드 자체를 바꾸지 않습니다. 스프링이 빈을 프록시(대리 객체)로 감싸 두고, 프록시를 거쳐 들어오는 호출에만 부가 기능을 끼워 넣습니다. 그래서 어디서 어떻게 호출하느냐에 따라 같은 애너테이션이 적용되기도 하고 무시되기도 합니다.',
  terms: ['프록시(Proxy)', '자기 호출(Self-invocation)', 'AOP(관점 지향 프로그래밍)', 'JDK 동적 프록시와 CGLIB', '@Async', '@Transactional'], ranks: ['aop', 'txspring'],
  controls: [
    { id: 'feat', label: '메서드에 붙인 애너테이션', type: 'select', value: 'tx', options: [['tx', '@Transactional'], ['async', '@Async']] },
    { id: 'path', label: '그 메서드를 호출하는 방식', type: 'select', value: 'self', options: [['ext', '다른 빈(컨트롤러)에서 호출'], ['self', '같은 클래스의 다른 메서드에서 호출 (this)'], ['priv', '같은 클래스에서 호출 + 메서드가 private'], ['inject', '자기 자신을 주입받아 그 참조로 호출'], ['split', '메서드를 다른 빈으로 옮겨서 호출']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '같은 클래스의 다른 메서드에서 @Transactional 메서드를 this로 호출하면 어떻게 되나', d: '같은 클래스 안에서 @Transactional 메서드를 부릅니다. 트랜잭션이 걸리지 않습니다.', v: { feat: 'tx', path: 'self' } },
    { t: '다른 빈에서 호출하면', q: '@Transactional 메서드를 컨트롤러라는 다른 빈에서 호출하면', d: '프록시를 거치므로 트랜잭션이 적용됩니다.', v: { feat: 'tx', path: 'ext' } },
    { t: '메서드를 다른 빈으로 분리', q: '@Transactional 메서드를 다른 빈으로 옮겨서 호출하면', d: '내부 호출 문제를 푸는 가장 흔한 방법입니다.', v: { feat: 'tx', path: 'split' } },
    { t: 'private 메서드에 붙이면', q: '같은 클래스에서 호출하는데 @Transactional 메서드가 private이면', d: '프록시가 가로챌 수 없습니다.', v: { feat: 'tx', path: 'priv' } },
    { t: '@Async를 내부에서 호출', q: '@Async 메서드를 같은 클래스의 다른 메서드에서 호출하면', d: '비동기로 실행되지 않고 호출한 스레드가 끝까지 기다립니다.', v: { feat: 'async', path: 'self' } },
    { t: '@Async를 다른 빈에서 호출', q: '@Async 메서드를 컨트롤러라는 다른 빈에서 호출하면', d: '별도 스레드에서 실행되고 호출한 쪽은 바로 돌아갑니다.', v: { feat: 'async', path: 'ext' } },
  ],
  code: function (c) {
    var tx = c.feat === 'tx', ann = tx ? '@Transactional' : '@Async', m = tx ? 'saveAll' : 'sendMail', body = tx ? '        orderDao.insert(a);\n        orderDao.insert(b);\n        throw new IllegalStateException();   // 도중에 실패' : '        mailClient.send(mail);               // 3초 걸림';
    var acc = c.path === 'priv' ? 'private' : 'public';
    if (c.path === 'ext') return '@RestController class OrderController {\n    private final OrderService orderService;   // 주입된 것은 프록시\n\n    @PostMapping("/orders")\n    void order() {\n        orderService.' + m + '();              // 프록시를 거친다\n    }\n}\n\n@Service class OrderService {\n    ' + ann + '\n    public void ' + m + '() {\n' + body + '\n    }\n}';
    if (c.path === 'split') return '@Service class OrderService {\n    private final ' + (tx ? 'OrderWriter writer' : 'MailSender sender') + ';   // 다른 빈 (프록시)\n\n    public void placeOrder() {\n        ' + (tx ? 'writer' : 'sender') + '.' + m + '();                    // 프록시를 거친다\n    }\n}\n\n@Service class ' + (tx ? 'OrderWriter' : 'MailSender') + ' {\n    ' + ann + '\n    public void ' + m + '() {\n' + body + '\n    }\n}';
    return '@Service class OrderService {\n' + (c.path === 'inject' ? '    @Autowired @Lazy\n    private OrderService self;                 // 자기 자신의 프록시\n\n' : '') + '    public void placeOrder() {                 // 컨트롤러가 호출\n        ' + (c.path === 'inject' ? 'self.' + m + '();                        // 프록시를 거친다' : m + '();                             // this.' + m + '()과 같다') + '\n    }\n\n    ' + ann + '\n    ' + acc + ' void ' + m + '() {\n' + body + '\n    }\n}';
  },
  label: function (c) { return (c.feat === 'tx' ? '@Transactional' : '@Async') + ' · ' + { ext: '다른 빈에서 호출', self: '같은 클래스에서 호출', priv: '같은 클래스 + private', inject: '자기 주입 후 호출', split: '다른 빈으로 분리' }[c.path]; },
  columns: ['프록시를 거쳤나', '애너테이션 적용', '결과'],
  simulate: function (c) {
    var tx = c.feat === 'tx', m = tx ? 'saveAll()' : 'sendMail()', via = c.path === 'ext' || c.path === 'inject' || c.path === 'split', ev = [], sum = [], res;
    var target = c.path === 'split' ? (tx ? 'OrderWriter' : 'MailSender') : 'OrderService';
    function push(s, k, snap) { ev.push({ s: s, k: k, snap: snap }); }
    var S = { caller: '', proxy: '대기', target: '대기', rows: [], thread: '', wait: '' };
    function snap(o) { Object.keys(o).forEach(function (k) { S[k] = o[k]; }); return JSON.parse(JSON.stringify(S)); }
    push('애플리케이션이 뜰 때 스프링은 ' + (tx ? '@Transactional이' : '@Async가') + ' 붙은 메서드를 가진 빈을 발견하고, 원래 객체 대신 그것을 감싼 프록시를 빈으로 등록합니다. 다른 빈이 주입받는 것은 이 프록시입니다.', '', snap({ caller: '아직 호출 전' }));
    if (c.path === 'ext') push('컨트롤러가 orderService.' + m + '을 호출합니다. 컨트롤러가 들고 있는 참조는 프록시이므로 호출은 프록시에 먼저 도착합니다.', '', snap({ caller: '컨트롤러 → 프록시.' + m, proxy: '호출을 받음' }));
    else {
      push('컨트롤러가 orderService.placeOrder()를 호출합니다. 프록시가 받지만 placeOrder()에는 애너테이션이 없으므로 그대로 실제 객체에 넘깁니다.', '', snap({ caller: '컨트롤러 → 프록시.placeOrder()', proxy: '부가 기능 없이 통과시킴', target: 'OrderService.placeOrder() 실행 중' }));
      if (c.path === 'self' || c.path === 'priv') push('실제 객체 안에서 ' + m + '을 호출합니다. 이 호출은 this.' + m + '입니다. this는 프록시가 아니라 실제 객체 자신이므로 프록시를 거치지 않습니다.' + (c.path === 'priv' ? ' 게다가 private 메서드는 프록시가 재정의할 수 없어서, 밖에서 부를 방법도 가로챌 방법도 없습니다.' : ''), 'bad', snap({ caller: 'OrderService(this) → this.' + m, proxy: '이 호출을 보지 못함', target: m + ' 실행' }));
      if (c.path === 'inject') push('실제 객체가 주입받은 self.' + m + '을 호출합니다. self는 자기 자신의 프록시이므로 호출이 다시 프록시를 거칩니다.', '', snap({ caller: 'OrderService → self(프록시).' + m, proxy: '호출을 받음' }));
      if (c.path === 'split') push('실제 객체가 다른 빈인 ' + target + '의 ' + m + '을 호출합니다. 주입받은 ' + target + ' 참조는 프록시이므로 호출이 프록시를 거칩니다.', '', snap({ caller: 'OrderService → ' + target + ' 프록시.' + m, proxy: '호출을 받음' }));
    }
    if (tx) {
      if (via) {
        push('프록시가 메서드를 실행하기 전에 트랜잭션을 시작합니다. 그다음 실제 객체의 ' + m + '을 호출합니다.', '', snap({ proxy: '트랜잭션 시작', target: m + ' 실행 중' }));
        push('주문 A, 주문 B를 INSERT했습니다. 같은 트랜잭션 안이며 아직 커밋 전입니다.', '', snap({ rows: [['주문 A', 'INSERT함 (커밋 전)', 'hot'], ['주문 B', 'INSERT함 (커밋 전)', 'hot']] }));
        push('예외가 발생해 메서드 밖으로 나갑니다. 프록시가 예외를 보고 트랜잭션을 롤백합니다. 두 INSERT가 모두 취소됩니다.', 'good', snap({ proxy: '예외 감지 → 롤백', target: '예외 발생', rows: [['주문 A', '롤백됨', 'bad'], ['주문 B', '롤백됨', 'bad']] }));
        res = '둘 다 롤백 (DB에 남은 것 없음)';
      } else {
        push('트랜잭션을 시작해 줄 프록시가 없습니다. 주문 A를 INSERT합니다. 트랜잭션이 없으므로 이 INSERT는 실행되자마자 커밋됩니다(자동 커밋).', 'bad', snap({ rows: [['주문 A', '커밋됨', 'good']] }));
        push('주문 B를 INSERT합니다. 이것도 바로 커밋됩니다.', '', snap({ rows: [['주문 A', '커밋됨', 'good'], ['주문 B', '커밋됨', 'good']] }));
        push('예외가 발생했지만 롤백해 줄 트랜잭션이 없습니다. 이미 커밋된 주문 A와 B는 DB에 그대로 남습니다. 실패한 작업의 데이터가 반쯤 저장된 상태가 됩니다.', 'bad', snap({ target: '예외 발생', rows: [['주문 A', '커밋됨 (되돌릴 수 없음)', 'bad'], ['주문 B', '커밋됨 (되돌릴 수 없음)', 'bad']] }));
        res = '롤백 안 됨 (A, B가 DB에 남음)';
      }
    } else {
      if (via) {
        push('프록시가 메서드를 직접 실행하지 않고, 실행을 별도의 스레드 풀에 맡깁니다. 그리고 호출한 쪽에는 바로 돌아갑니다.', '', snap({ proxy: '작업을 스레드 풀에 넘김', thread: 'task-1 (별도 스레드)', wait: '0초' }));
        push('호출한 쪽은 기다리지 않고 다음 코드를 실행해 응답을 돌려줍니다. 메일 발송은 task-1 스레드에서 따로 진행됩니다(3초).', 'good', snap({ target: m + ' 실행 중 (task-1)', wait: '0초' }));
        res = '비동기 실행 (호출자 대기 0초)';
      } else {
        push('작업을 다른 스레드로 넘겨 줄 프록시가 없습니다. ' + m + '은 평범한 메서드 호출로, 호출한 스레드(http-nio-exec-1)에서 그대로 실행됩니다.', 'bad', snap({ thread: 'http-nio-exec-1 (요청 스레드)', wait: '진행 중' }));
        push('메일 발송 3초가 끝날 때까지 요청 스레드가 묶여 있습니다. 사용자는 응답을 3초 늦게 받습니다. 오류도 경고도 없이 그냥 동기로 실행됩니다.', 'bad', snap({ wait: '3초' }));
        res = '동기 실행 (호출자 대기 3초)';
      }
    }
    sum.push((via ? '프록시를 거쳤으므로 ' : '프록시를 거치지 않았으므로 ') + (tx ? '@Transactional이 ' : '@Async가 ') + (via ? '적용됐습니다.' : '무시됐습니다.') + ' 결과: ' + res + '.');
    if (!via) sum.push('같은 클래스 안에서의 호출은 프록시를 지나지 않습니다. 예외도 경고도 없이 조용히 무시되기 때문에 놓치기 쉽습니다. 해법은 그 메서드를 다른 빈으로 옮기는 것이 가장 일반적이고, 자기 자신의 프록시를 주입받아 호출하는 방법도 있습니다.');
    if (c.path === 'priv') sum.push('프록시는 원래 클래스를 상속하거나 같은 인터페이스를 구현해서 만들기 때문에 private 메서드는 가로챌 수 없습니다. 이런 애너테이션은 프록시를 통해 호출되는 메서드에 붙여야 의미가 있습니다.');
    if (c.path === 'inject') sum.push('동작은 하지만 자기 자신을 주입받는 구조는 어색하고 순환 참조처럼 보입니다. 보통은 메서드를 별도의 빈으로 분리하는 쪽을 택합니다.');
    return { events: ev, summary: sum, tx: tx, row: [via ? '거침' : '거치지 않음', via ? '적용됨' : '무시됨', res] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    H.title(v, '호출이 지나는 길'); var ln = H.lanes(v);
    H.lane(ln, '호출', s.caller, 'wait');
    H.lane(ln, '프록시', s.proxy, s.proxy.indexOf('보지 못함') >= 0 ? 'bad' : s.proxy === '대기' ? 'none' : 'hot');
    H.lane(ln, '실제 객체', s.target, s.target === '대기' ? 'none' : s.target.indexOf('예외') >= 0 ? 'bad' : '');
  },
  // 그림: 프록시는 실제 객체를 감싼 바깥 상자다. 밖에서 오는 호출은 바깥 상자를 지나고, 안에서 this로 부르는 호출은 지나지 않는다.
  draw: function (P, sim, shown) {
    var c = sim.c, tx = sim.tx, m = tx ? 'saveAll()' : 'sendMail()', last = shown[shown.length - 1], s = last ? last.snap : { caller: '', proxy: '대기', target: '대기', rows: [], thread: '', wait: '' };
    var split = c.path === 'split', other = split ? (tx ? 'OrderWriter' : 'MailSender') : '', called = s.caller && s.caller !== '아직 호출 전', at2 = split && s.caller.indexOf(other) >= 0, step = shown.length;
    var pcls = function (x) { return x.indexOf('보지 못함') >= 0 ? 'bad' : x === '대기' ? 'plain' : 'hot'; }, tcls = function (x) { return x.indexOf('예외') >= 0 ? 'bad' : x === '대기' ? 'plain' : 'wait'; }, short = function (x) { return x.replace('OrderService.', '').replace(' (task-1)', ''); };
    P.size(680, 300);
    P.box('ctrl', 16, 96, 124, 50, { cls: called ? 'wait' : 'plain', title: '컨트롤러', sub: '다른 빈' });
    P.box('px1', 170, 36, 230, 164, { cls: at2 ? 'plain' : pcls(s.proxy), title: 'OrderService 프록시', sub: at2 ? '부가 기능 없이 통과시킴' : s.proxy });
    P.box('tg1', 186, 112, 198, 74, { cls: at2 ? 'wait' : tcls(s.target), title: '실제 OrderService 객체', sub: at2 ? 'placeOrder() 실행 중' : short(s.target) });
    if (called) P.arrow('in', 'ctrl:r', 'px1:l:0.4', { label: '호출' });
    var entered = c.path === 'ext' ? step >= 3 && s.target !== '대기' : called && step >= 2;
    if (entered) P.arrow('pass', [285, 86], 'tg1:t');
    if ((c.path === 'self' || c.path === 'priv') && step >= 3) P.arrow('self', 'tg1:r:0.3', 'tg1:r:0.75', { cls: 'bad', label: 'this.' + m });
    if (c.path === 'inject' && step >= 3) P.arrow('self', 'tg1:l:0.6', 'px1:l:0.75', { cls: 'good', label: 'self.' + m });
    if (split) {
      P.box('px2', 430, 36, 234, 164, { cls: at2 ? pcls(s.proxy) : 'plain', title: other + ' 프록시', sub: at2 ? s.proxy : '대기' });
      P.box('tg2', 446, 112, 202, 74, { cls: at2 ? tcls(s.target) : 'plain', title: '실제 ' + other + ' 객체', sub: at2 && s.target.indexOf('placeOrder') < 0 ? short(s.target) : '대기' });
      if (at2) P.arrow('out', 'tg1:r', 'px2:l:0.6', { cls: 'good', label: m });
      if (at2 && step >= 4) P.arrow('pass2', [547, 86], 'tg2:t');
    }
    if (tx) [0, 1].forEach(function (i) { var r = s.rows[i]; P.box('row' + i, 16 + i * 330, 236, 318, 36, r ? { cls: r[2], title: r[0], right: r[1] } : { cls: 'ghost', title: i ? '주문 B' : '주문 A', right: '아직 없음' }); });
    else {
      P.box('th', 16, 232, 318, 48, { cls: s.thread ? (s.thread.indexOf('task') === 0 ? 'good' : 'bad') : 'ghost', title: '메일 발송이 실행되는 스레드', sub: s.thread || '아직 실행 전' });
      P.box('wt', 346, 232, 318, 48, { cls: !s.wait ? 'ghost' : s.wait === '0초' ? 'good' : 'bad', title: '호출한 쪽이 기다린 시간', sub: s.wait || '-' });
    }
    P.note('바깥 상자가 프록시, 안쪽 상자가 실제 객체입니다. 안쪽 객체가 자기 메서드를 this로 부르는 빨간 화살표는 바깥 상자를 지나지 않습니다.');
  },
  assume: '스프링의 기본 방식인 프록시 기반 AOP를 기준으로 했습니다(AspectJ 위빙을 쓰면 내부 호출에도 적용할 수 있지만 흔하지 않습니다). @Async는 @EnableAsync가 켜져 있다고 가정했습니다. 트랜잭션이 없을 때 INSERT가 각각 바로 커밋된다는 것은 JDBC 커넥션의 자동 커밋 기본값을 따른 것입니다. 열 가지 조합 모두를 실제 스프링(스프링 프레임워크 7.0.9)의 @Transactional, @Async 빈으로 실행해 확인했습니다. 프록시를 거친 호출에서만 메서드 안에 트랜잭션이 열려 있었고 예외 뒤에 남은 행이 없었으며, 내부 호출과 private 메서드에서는 두 행이 그대로 남았습니다. @Async도 프록시를 거친 호출만 별도 스레드(task-1)에서 실행됐고, 내부 호출은 호출한 스레드에서 끝까지 실행됐습니다(메일 발송 3초는 0.3초로 줄여 시험).',
});
