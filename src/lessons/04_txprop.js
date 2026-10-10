Lab.register({
  id: 'txprop', nav: '트랜잭션 전파', cat: '스프링', mode: 'step',
  title: '예외가 나면 어디까지 롤백되나',
  intro: '주문을 저장하는 메서드가 로그를 저장하는 다른 빈의 메서드를 부릅니다. 둘 다 @Transactional입니다. 전파 속성, 예외가 나는 위치와 종류, 예외를 잡는지에 따라 주문과 로그 중 무엇이 DB에 남는지 달라집니다.',
  terms: ['@Transactional', '트랜잭션 전파(Propagation)', '롤백 규칙과 rollbackFor', '세이브포인트', 'Checked 예외와 Unchecked 예외'], ranks: ['txspring', 'exception'],
  controls: [
    { id: 'prop', label: '안쪽 메서드(saveLog)의 전파 속성', type: 'select', value: 'REQUIRED', options: [['REQUIRED', 'REQUIRED (기본값: 있으면 참여)'], ['REQUIRES_NEW', 'REQUIRES_NEW (항상 새로 시작)'], ['NESTED', 'NESTED (세이브포인트)']] },
    { id: 'ex', label: '예외가 나는 곳', type: 'select', value: 'inner', options: [['none', '예외 없음'], ['inner', '안쪽 메서드(saveLog) 안에서'], ['outer', '안쪽 호출이 끝난 뒤 바깥 메서드에서']] },
    { id: 'type', label: '예외 종류', type: 'select', value: 'rt', options: [['rt', '언체크 예외 (IllegalStateException)'], ['chk', '체크 예외 (IOException)']], show: function (c) { return c.ex !== 'none'; } },
    { id: 'catch', label: '바깥 메서드가 안쪽 호출을 try-catch로 감싼다', type: 'check', value: false, show: function (c) { return c.ex === 'inner'; } },
    { id: 'rf', label: 'rollbackFor = Exception.class를 지정한다', type: 'check', value: false, show: function (c) { return c.ex !== 'none' && c.type === 'chk'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: 'REQUIRED, 안쪽에서 언체크 예외. 주문과 로그가 함께 롤백됩니다.', v: { prop: 'REQUIRED', ex: 'inner', type: 'rt', catch: false, rf: false } },
    { t: '예외를 잡았는데도 롤백된다', d: 'REQUIRED에서 안쪽 예외를 catch로 잡아 봅니다.', v: { prop: 'REQUIRED', ex: 'inner', type: 'rt', catch: true, rf: false } },
    { t: '로그 실패가 주문을 망치지 않게', d: 'REQUIRES_NEW로 분리하고 예외를 잡습니다.', v: { prop: 'REQUIRES_NEW', ex: 'inner', type: 'rt', catch: true, rf: false } },
    { t: '주문이 실패해도 로그는 남기기', d: 'REQUIRES_NEW에서 바깥 메서드가 실패합니다.', v: { prop: 'REQUIRES_NEW', ex: 'outer', type: 'rt', catch: false, rf: false } },
    { t: 'NESTED는 무엇이 다른가', d: '바깥이 실패하면 안쪽도 함께 롤백됩니다. 바로 위와 비교해 보세요.', v: { prop: 'NESTED', ex: 'outer', type: 'rt', catch: false, rf: false } },
    { t: '체크 예외는 롤백되지 않는다', d: '예외가 밖으로 나갔는데도 주문과 로그가 커밋됩니다.', v: { prop: 'REQUIRED', ex: 'inner', type: 'chk', catch: false, rf: false } },
    { t: 'rollbackFor를 지정하면', d: '체크 예외에도 롤백됩니다.', v: { prop: 'REQUIRED', ex: 'inner', type: 'chk', catch: false, rf: true } },
  ],
  code: function (c) {
    var chk = c.ex !== 'none' && c.type === 'chk', rf = chk && c.rf, E = chk ? 'IOException' : 'IllegalStateException', ct = c.ex === 'inner' && c.catch;
    var call = ct ? '        try {\n            logService.saveLog();\n        } catch (Exception e) {\n            // 로그 저장 실패는 넘어간다\n        }\n' : '        logService.saveLog();\n';
    return '@Service class OrderService {\n    @Transactional' + (rf ? '(rollbackFor = Exception.class)' : '') + '\n    public void placeOrder()' + (chk && !ct ? ' throws IOException' : chk && c.ex === 'outer' ? ' throws IOException' : '') + ' {\n        orderDao.insert(order);            // 주문 저장\n' + call +
      (c.ex === 'outer' ? '        throw new ' + E + '();\n' : '') + '    }\n}\n\n@Service class LogService {\n    @Transactional(propagation = Propagation.' + c.prop + (rf ? ',\n                   rollbackFor = Exception.class' : '') + ')\n    public void saveLog()' + (chk && c.ex === 'inner' ? ' throws IOException' : '') + ' {\n        logDao.insert(log);                // 로그 저장\n' +
      (c.ex === 'inner' ? '        throw new ' + E + '();\n' : '') + '    }\n}';
  },
  label: function (c) { var s = c.prop + ' · ' + { none: '예외 없음', inner: '안쪽에서 ', outer: '바깥에서 ' }[c.ex]; if (c.ex !== 'none') s += (c.type === 'rt' ? '언체크 예외' : '체크 예외' + (c.rf ? '(rollbackFor)' : '')) + (c.ex === 'inner' ? (c.catch ? ' · 잡음' : ' · 안 잡음') : ''); return s; },
  columns: ['주문', '로그', '호출한 쪽이 받는 것', '동시에 쓴 커넥션'],
  simulate: function (c) {
    var chk = c.ex !== 'none' && c.type === 'chk', trig = c.ex !== 'none' && (!chk || c.rf), ct = c.ex === 'inner' && c.catch, E = chk ? 'IOException' : 'IllegalStateException';
    var A = '없음', ro = false, B = null, SP = null, order = '없음', log = '없음', caller = '아직 실행 중', ev = [], P = c.prop;
    function push(s, k) { ev.push({ s: s, k: k, snap: { A: A, ro: ro, B: B, SP: SP, order: order, log: log, caller: caller } }); }
    function endA(commit, why) {
      if (commit && ro) { A = '롤백됨'; if (order === '미커밋') order = '롤백됨'; if (log === '미커밋') log = '롤백됨'; caller = 'UnexpectedRollbackException'; push('placeOrder()가 정상적으로 끝나서 프록시가 트랜잭션 A를 커밋하려 합니다. 그런데 A에 "롤백만 가능" 표시가 붙어 있습니다. 커밋하지 않고 전부 롤백한 뒤 UnexpectedRollbackException을 던집니다. 예외를 잡았는데도 주문이 저장되지 않는 이유입니다.', 'bad'); return; }
      if (commit) { A = '커밋됨'; if (order === '미커밋') order = '커밋됨'; if (log === '미커밋') log = '커밋됨'; push(why + '프록시가 트랜잭션 A를 커밋합니다.', 'good'); }
      else { A = '롤백됨'; if (order === '미커밋') order = '롤백됨'; if (log === '미커밋') log = '롤백됨'; push(why + '프록시가 트랜잭션 A를 롤백합니다. A 안에서 한 작업이 모두 취소됩니다.', 'bad'); }
    }
    A = '진행 중'; push('placeOrder() 호출. 메서드를 실행하기 전에 프록시가 트랜잭션 A를 시작합니다(커넥션 1개 사용).', '');
    order = '미커밋'; push('주문을 INSERT했습니다. 아직 커밋 전이라 트랜잭션 A 안에서만 보입니다.', '');
    if (P === 'REQUIRED') push('saveLog() 호출. 전파 속성이 REQUIRED이고 이미 트랜잭션 A가 진행 중이므로, 새로 만들지 않고 A에 참여합니다.', '');
    if (P === 'REQUIRES_NEW') { A = '잠시 멈춤'; B = '진행 중'; push('saveLog() 호출. 전파 속성이 REQUIRES_NEW이므로 트랜잭션 A를 잠시 멈춰 두고, 커넥션을 하나 더 얻어 별개의 트랜잭션 B를 시작합니다.', ''); }
    if (P === 'NESTED') { SP = '만들어 둠'; push('saveLog() 호출. 전파 속성이 NESTED이므로 트랜잭션 A 안에 세이브포인트(되돌아올 지점)를 만듭니다. 트랜잭션과 커넥션은 그대로 A 하나입니다.', ''); }
    log = '미커밋'; push('로그를 INSERT했습니다. ' + (P === 'REQUIRES_NEW' ? '트랜잭션 B에 속합니다.' : '트랜잭션 A에 속합니다.'), '');
    if (c.ex === 'inner') {
      push('saveLog() 안에서 ' + E + '이 발생해 메서드 밖으로 나갑니다.', 'bad');
      var rule = trig ? (chk ? 'rollbackFor에 지정된 예외라 롤백 대상입니다. ' : '언체크 예외는 롤백 대상입니다. ') : '체크 예외는 기본 설정에서 롤백 대상이 아닙니다. ';
      if (P === 'REQUIRED') { if (trig) { ro = true; push('saveLog()의 프록시: ' + rule + '하지만 이 메서드는 A에 참여만 했기 때문에 직접 롤백하지 못합니다. 대신 A에 "롤백만 가능(rollback-only)" 표시를 남기고 예외를 그대로 던집니다.', 'bad'); } else push('saveLog()의 프록시: ' + rule + '아무 표시도 남기지 않고 예외만 그대로 던집니다.', ''); }
      if (P === 'REQUIRES_NEW') { if (trig) { B = '롤백됨'; log = '롤백됨'; A = '진행 중'; push('saveLog()의 프록시: ' + rule + '트랜잭션 B를 롤백합니다. 로그 INSERT가 취소됩니다. 멈춰 두었던 A는 영향을 받지 않고 다시 이어집니다.', 'bad'); } else { B = '커밋됨'; log = '커밋됨'; A = '진행 중'; push('saveLog()의 프록시: ' + rule + '예외가 났는데도 트랜잭션 B를 커밋합니다. 로그는 이제 확정됐습니다. A가 다시 이어집니다.', ''); } }
      if (P === 'NESTED') { if (trig) { SP = '여기로 되돌림'; log = '롤백됨'; push('saveLog()의 프록시: ' + rule + '세이브포인트까지만 되돌립니다. 로그 INSERT는 취소되고, 그 전에 한 주문 INSERT는 그대로입니다. A에는 롤백 표시가 붙지 않습니다.', 'bad'); } else { SP = '해제'; push('saveLog()의 프록시: ' + rule + '세이브포인트를 해제하고 예외만 던집니다. 로그 INSERT는 A의 일부로 남습니다.', ''); } }
      if (ct) { push('placeOrder()가 예외를 catch로 잡았습니다. 메서드는 끝까지 실행되어 정상 종료합니다.', ''); caller = '정상 반환'; endA(true, 'placeOrder()가 정상적으로 끝났습니다. '); }
      else { caller = E; endA(!trig, 'placeOrder()가 예외를 잡지 않아 ' + E + '이 그대로 밖으로 나갑니다. placeOrder()의 프록시: ' + rule); }
    } else {
      if (P === 'REQUIRED') push('saveLog() 정상 종료. 참여만 한 트랜잭션이라 여기서는 커밋하지 않습니다. 커밋은 A를 시작한 placeOrder()가 끝날 때 합니다.', '');
      if (P === 'REQUIRES_NEW') { B = '커밋됨'; log = '커밋됨'; A = '진행 중'; push('saveLog() 정상 종료. 트랜잭션 B를 커밋합니다. 로그는 이제 확정되어, 이후 A가 어떻게 되든 되돌릴 수 없습니다. 멈춰 두었던 A가 다시 이어집니다.', 'good'); }
      if (P === 'NESTED') { SP = '해제'; push('saveLog() 정상 종료. 세이브포인트를 해제합니다. 로그 INSERT는 A의 일부로 남고, 확정 여부는 A의 커밋에 달려 있습니다.', ''); }
      if (c.ex === 'outer') { push('placeOrder()에서 ' + E + '이 발생해 메서드 밖으로 나갑니다.', 'bad'); caller = E; endA(!trig, 'placeOrder()의 프록시: ' + (trig ? (chk ? 'rollbackFor에 지정된 예외라 롤백 대상입니다. ' : '언체크 예외는 롤백 대상입니다. ') : '체크 예외는 기본 설정에서 롤백 대상이 아닙니다. 예외는 호출한 쪽으로 나가지만, ')); }
      else { caller = '정상 반환'; endA(true, 'placeOrder()가 정상적으로 끝났습니다. '); }
    }
    var txt = function (x) { return x === '커밋됨' ? '저장됨' : '저장 안 됨'; }, sum = ['주문은 ' + txt(order) + ', 로그는 ' + txt(log) + '. 호출한 쪽은 ' + (caller === '정상 반환' ? '예외 없이 결과를 돌려받았습니다.' : caller + '을 받았습니다.')];
    if (caller === 'UnexpectedRollbackException') sum.push('REQUIRED로 참여한 안쪽 메서드에서 롤백 대상 예외가 나가면, 바깥에서 그 예외를 잡아도 트랜잭션 전체가 이미 "롤백만 가능" 상태입니다. 안쪽 실패를 바깥과 분리하려면 REQUIRES_NEW나 NESTED로 경계를 나누거나, 안쪽 메서드 안에서 예외를 처리해야 합니다.');
    if (c.ex !== 'none' && !trig) sum.push('체크 예외는 기본 설정에서 롤백을 일으키지 않습니다. 예외가 발생했는데도 그때까지의 작업이 커밋됐습니다. 체크 예외에도 롤백하려면 rollbackFor를 지정합니다.');
    if (P === 'REQUIRES_NEW') sum.push('REQUIRES_NEW는 완전히 별개의 트랜잭션이라 한쪽의 커밋과 롤백이 다른 쪽에 영향을 주지 않습니다. 대신 A가 멈춰 있는 동안에도 A의 커넥션을 쥐고 있어서 커넥션을 동시에 2개 씁니다. 요청이 몰리면 커넥션 풀이 먼저 바닥날 수 있습니다.');
    if (P === 'NESTED') sum.push('NESTED는 같은 트랜잭션 안의 부분 롤백입니다. 안쪽만 되돌릴 수는 있지만, 바깥이 롤백되면 안쪽도 함께 사라집니다. 이 점이 REQUIRES_NEW와 다릅니다.');
    if (P === 'REQUIRED' && c.ex !== 'none' && trig && caller !== 'UnexpectedRollbackException') sum.push('REQUIRED는 하나의 트랜잭션으로 묶이므로, 어느 쪽에서 실패하든 주문과 로그가 함께 롤백됩니다.');
    return { events: ev, summary: sum, row: [txt(order), txt(log), caller, P === 'REQUIRES_NEW' ? '2개' : '1개'], fin: { order: order, log: log, caller: caller } };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { A: '없음', ro: false, B: null, SP: null, order: '없음', log: '없음', caller: '아직 호출 전' };
    var cls = function (x) { return x === '커밋됨' ? 'good' : x === '롤백됨' ? 'bad' : x === '진행 중' ? 'hot' : x === '잠시 멈춤' ? 'wait' : 'none'; };
    H.title(v, '트랜잭션'); var ln = H.lanes(v);
    H.lane(ln, '트랜잭션 A', s.A + (s.ro ? ' · "롤백만 가능" 표시 붙음' : '') + ' (placeOrder가 시작)', s.ro && s.A === '진행 중' ? 'bad' : cls(s.A));
    if (c.prop === 'REQUIRES_NEW') H.lane(ln, '트랜잭션 B', s.B ? s.B + ' (saveLog가 시작, 별도 커넥션)' : '아직 없음', s.B ? cls(s.B) : 'none');
    if (c.prop === 'NESTED') H.lane(ln, '세이브포인트', s.SP ? s.SP + ' (A 안의 되돌아올 지점)' : '아직 없음', s.SP === '여기로 되돌림' ? 'bad' : s.SP === '만들어 둠' ? 'wait' : 'none');
    var st = function (x) { return x === '없음' ? '아직 없음' : x === '미커밋' ? 'INSERT함 (커밋 전)' : x === '커밋됨' ? '커밋됨 (DB에 남음)' : '롤백됨 (사라짐)'; };
    var cc = function (x) { return x === '커밋됨' ? 'good' : x === '롤백됨' ? 'bad' : x === '미커밋' ? 'hot' : ''; };
    H.table(v, ['데이터', '속한 트랜잭션', '상태'], [
      { cells: ['주문 1건', 'A', { v: st(s.order), cls: cc(s.order) }] },
      { cells: ['로그 1건', c.prop === 'REQUIRES_NEW' ? 'B' : c.prop === 'NESTED' ? 'A (세이브포인트 뒤)' : 'A', { v: st(s.log), cls: cc(s.log) }] },
    ], 'DB 테이블');
    H.counters(v, [[s.caller, 'placeOrder()를 호출한 쪽이 받는 것']]);
  },
  // 그림: 트랜잭션을 상자로 그리고 그 안에 그 트랜잭션에 속한 데이터를 놓는다. 상자의 색이 곧 그 안 데이터의 운명이다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { A: '없음', ro: false, B: null, SP: null, order: '없음', log: '없음', caller: '아직 호출 전' }, rn = c.prop === 'REQUIRES_NEW', ne = c.prop === 'NESTED';
    var tc = function (x) { return x === '커밋됨' ? 'good' : x === '롤백됨' ? 'bad' : x === '진행 중' ? 'hot' : x === '잠시 멈춤' ? 'wait' : 'ghost'; }, dc = function (x) { return x === '커밋됨' ? 'good' : x === '롤백됨' ? 'bad' : x === '미커밋' ? 'hot' : 'ghost'; };
    var st = function (x) { return x === '없음' ? '아직 없음' : x === '미커밋' ? 'INSERT함 (커밋 전)' : x === '커밋됨' ? '커밋됨 (DB에 남음)' : '롤백됨 (사라짐)'; };
    P.size(680, 300);
    P.box('A', 16, 30, rn ? 320 : 648, 180, { cls: s.ro && s.A === '진행 중' ? 'bad' : tc(s.A), title: '트랜잭션 A (placeOrder가 시작)', sub: s.A + (s.ro ? ' · "롤백만 가능" 표시가 붙음' : '') });
    P.box('ord', 32, 100, rn ? 288 : 290, 60, { cls: dc(s.order), title: '주문 1건', sub: st(s.order) });
    if (rn) P.box('B', 352, 30, 312, 180, { cls: s.B ? tc(s.B) : 'ghost', title: '트랜잭션 B (saveLog, 별도 커넥션)', sub: s.B || '아직 없음' });
    if (ne) P.box('SP', 340, 82, 310, 112, { cls: s.SP === '여기로 되돌림' ? 'bad' : s.SP ? 'wait' : 'ghost', title: '세이브포인트 뒤 (A 안의 한 구간)', sub: s.SP || '아직 없음' });
    P.box('log', rn ? 368 : ne ? 354 : 342, ne ? 128 : 100, rn ? 280 : ne ? 282 : 306, ne ? 54 : 60, { cls: dc(s.log), title: '로그 1건', sub: st(s.log) });
    P.box('caller', 16, 232, 648, 40, { cls: s.caller === '아직 호출 전' ? 'ghost' : s.caller.indexOf('Exception') >= 0 ? 'bad' : 'good', title: 'placeOrder()를 호출한 쪽이 받는 것', right: s.caller });
    P.note('큰 상자가 트랜잭션이고, 그 안의 작은 상자가 그 트랜잭션에 속한 데이터입니다. 트랜잭션이 롤백되면 안에 든 데이터가 함께 사라집니다. 로그가 어느 상자 안에 있는지가 전파 속성의 차이입니다.');
  },
  assume: 'saveLog()는 다른 빈의 메서드라서 프록시를 거쳐 호출됩니다(같은 클래스 안에서 부르면 안쪽 @Transactional이 적용되지 않습니다. 이 내용은 "프록시와 자기 호출" 실습에서 다룹니다). 규칙은 스프링 프레임워크의 기본 동작을 따랐습니다. 언체크 예외와 Error에만 롤백하고, 참여한 트랜잭션에서 롤백 대상 예외가 나가면 전체에 rollback-only 표시를 남깁니다. NESTED는 JDBC 세이브포인트로 구현되며 JdbcTemplate이나 MyBatis가 쓰는 DataSourceTransactionManager에서 동작합니다. JPA(JpaTransactionManager + Hibernate)에서는 NESTED를 쓰면 NestedTransactionNotSupportedException이 납니다. 세이브포인트가 JDBC 커넥션에만 적용되고 영속성 컨텍스트에는 적용되지 않기 때문입니다. 72가지 조합 모두를 실제 스프링(스프링 프레임워크 7.0.9, DataSourceTransactionManager, H2 데이터베이스)에서 실행해, 주문과 로그가 DB에 남는지, 호출한 쪽이 받는 것, 동시에 쓴 커넥션 수가 화면과 일치하는 것을 확인했습니다.',
});
