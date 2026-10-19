Lab.register({
  id: 'tx_basic', nav: '@Transactional', cat: '기초개념', mode: 'step', basic: true, deep: ['tx', 'txprop'],
  title: '@Transactional은 무엇을 묶어 주는가',
  intro: '@Transactional은 메서드 위에 적는 표시(애너테이션)입니다. 이 실습에서 예시로 만든 OrderService 클래스의 order() 메서드는 jdbc.update로 DB에 저장을 두 번 합니다(orders 테이블에 주문, payment 테이블에 결제). 두 저장 사이에는 stock 확인이 있고, stock이 0이면 예외를 던집니다. 아무 표시가 없으면 DB는 저장을 받는 대로 반영하므로, 예외가 나도 앞의 저장은 그대로 남습니다. order() 위에 @Transactional을 적으면 스프링이 그 메서드 안의 저장을 한 묶음(트랜잭션)으로 다루어, 메서드가 정상으로 끝나면 모두 반영(커밋)하고 런타임 예외로 끝나면 모두 취소(롤백)합니다. 묶음을 시작하고 반영하거나 취소하는 코드는 우리가 쓰지 않고, 스프링이 order()를 부르는 앞뒤에서 합니다. 이 실습은 @Transactional을 지우거나 stock에 담는 값을 바꿔 가며 같은 order()를 부르고, 호출이 끝난 뒤 두 테이블에 남은 행을 봅니다.',
  terms: ['@Transactional', '트랜잭션', '커밋과 롤백', '프록시(Proxy)'],
  controls: [
    { id: 'tx', label: 'order() 위에 @Transactional을 적는다', type: 'check', value: true },
    { id: 'stock', label: 'stock에 담는 값', type: 'select', value: 'zero', options: [['zero', 'stock에 0을 담는다 (두 저장 사이에서 예외가 난다)'], ['five', 'stock에 5를 담는다 (예외가 나지 않는다)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '@Transactional은 어떻게 생겼고, 저장 두 번 사이에서 예외가 나면 무슨 일이 일어나나', d: '@Transactional이 있는 order(). 두 저장 사이에서 예외가 나자 스프링이 묶음 전체를 취소해 두 테이블 모두 0행입니다.', v: { tx: true, stock: 'zero' } },
    { t: '@Transactional을 지우면', q: '@Transactional을 지우면', d: '앞의 저장이 이미 반영되어 있어서, 주문은 있고 결제는 없는 반쪽 상태가 남습니다.', v: { tx: false, stock: 'zero' } },
    { t: 'stock에 5를 담으면', q: 'stock에 5를 담아 예외가 나지 않게 하면', d: '예외가 나지 않으면 스프링이 묶음 전체를 반영해 두 테이블에 1행씩 남습니다.', v: { tx: true, stock: 'five' } },
    { t: '지우고 stock에 5를 담으면', q: '@Transactional을 지우고 예외도 나지 않게 하면', d: '예외가 없으면 @Transactional이 없어도 테이블의 결과는 같습니다. 저장마다 곧바로 반영됩니다.', v: { tx: false, stock: 'five' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/TxBasicProbe.java)이 실행한 소스는 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var o = ['@Service', 'public class OrderService {', '    private final JdbcTemplate jdbc;', '', '    public OrderService(JdbcTemplate jdbc) {', '        this.jdbc = jdbc;', '    }', ''];
    if (c.tx) o.push('    // 묶음: 이 메서드 안의 저장은 모두 반영되거나 모두 취소된다', '    @Transactional');
    o.push('    public void order() {',
      "        jdbc.update(\"INSERT INTO orders VALUES (1, '키보드')\");",
      '        int stock = ' + (c.stock === 'zero' ? '0' : '5') + ';',
      '        if (stock == 0) {',
      '            throw new IllegalStateException("재고 없음");',
      '        }',
      '        jdbc.update("INSERT INTO payment VALUES (1, 30000)");',
      '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.tx ? '@Transactional 있음' : '@Transactional 없음') + ' · stock에 ' + (c.stock === 'zero' ? '0' : '5'); },
  columns: ['order()가 끝난 방식', 'orders 테이블의 행', 'payment 테이블의 행'],
  simulate: function (c) {
    var tx = !!c.tx, zero = c.stock === 'zero', ev = [], sum = [];
    // 상태: od와 pm은 두 테이블의 행('' 없음, pending 묶음 안에서 확정 전, saved DB에 반영됨, gone 취소되어 사라짐), txs는 묶음의 상태, cur는 지금 실행 중인 줄
    var st = { tx: tx, od: '', pm: '', txs: '', cur: '', done: { l1: false, l2: false, l3: false }, fail: false, half: false, log: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. main이 order()를 부른다
    push('프로그램의 main이 스프링이 만들어 둔 OrderService 객체의 order() 메서드를 부릅니다. ' + (tx
      ? '이 객체는 우리가 쓴 클래스 그대로가 아니라 스프링이 만든 다른 클래스의 객체(프록시)라서, 호출은 order()의 첫 줄에 닿기 전에 스프링의 코드를 먼저 지납니다.'
      : '이 객체는 우리가 쓴 OrderService 클래스 그대로여서, 호출이 곧바로 order()의 첫 줄로 들어갑니다.') + ' 두 테이블 orders와 payment에는 아직 행이 없습니다.', '');

    // 2. (@Transactional이 있으면) 스프링이 묶음을 시작한다
    if (tx) {
      st.txs = 'open'; st.log.push(['묶음 시작', '스프링이 order() 앞에서 시작', '']);
      push('스프링이 order() 메서드에 들어가기 전에 묶음(트랜잭션)을 시작합니다. order() 위에 @Transactional이 있기 때문입니다. 이제 order() 안에서 하는 저장은 한 묶음에 속하고, 묶음이 끝나기 전에는 DB에 확정되지 않습니다. 묶음을 시작하는 줄은 우리가 쓴 코드에 없습니다.', '');
    }

    // 3. 첫 INSERT: 주문 저장
    st.cur = 'l1'; st.done.l1 = true; st.od = tx ? 'pending' : 'saved';
    st.log.push(['INSERT orders', tx ? '묶음 안: 확정 전' : '곧바로 반영', tx ? 'wait' : 'good']);
    push('jdbc.update로 orders 테이블에 주문 한 행(1, 키보드)을 저장합니다. ' + (tx
      ? '이 저장은 묶음 안에 있어서 아직 확정되지 않았습니다. 같은 DB에 따로 연결해 orders를 세어 보면 0행입니다.'
      : '묶음이 없으므로 이 저장은 DB에 곧바로 반영됩니다. 같은 DB에 따로 연결해 orders를 세어 보면 1행입니다.'), '');

    // 4. stock 확인
    st.cur = 'l2'; st.done.l2 = true;
    if (zero) {
      st.fail = true; st.log.push(['stock 확인', '예외를 던짐 (재고 없음)', 'bad']);
      push('int stock = 0이고 다음 줄의 if (stock == 0) 조건이 맞으므로, IllegalStateException("재고 없음")이 던져집니다. order() 메서드는 결제 저장 줄을 실행하지 않은 채 예외로 끝납니다.', 'bad');
    } else {
      st.log.push(['stock 확인', '통과', '']);
      push('stock에 5가 들어 있어 if (stock == 0) 조건이 맞지 않으므로, 예외 없이 다음 줄로 넘어갑니다.', '');
    }

    // 5. 둘째 INSERT: 결제 저장 (예외가 없을 때만)
    if (!zero) {
      st.cur = 'l3'; st.done.l3 = true; st.pm = tx ? 'pending' : 'saved';
      st.log.push(['INSERT payment', tx ? '묶음 안: 확정 전' : '곧바로 반영', tx ? 'wait' : 'good']);
      push('jdbc.update로 payment 테이블에 결제 한 행(1, 30000)을 저장합니다. ' + (tx ? '이 저장도 묶음 안에 있어서, 묶음이 끝나기 전에는 확정되지 않습니다.' : '묶음이 없으므로 이 저장도 보내는 대로 DB에 반영됩니다.'), '');
    }

    // 6. order()가 끝난다: 스프링이 묶음을 취소하거나 반영한다
    st.cur = '';
    if (tx && zero) {
      st.txs = 'rolled'; st.od = 'gone';
      st.log.push(['묶음 끝', '취소(롤백)', 'good']);
      push('스프링이 order()가 예외로 끝난 것을 보고 묶음 전체를 취소(롤백)합니다. 앞에서 저장한 주문 행도 없던 일이 되어 orders에서 사라집니다. IllegalStateException은 RuntimeException이라서 스프링의 기본 규칙대로 취소했습니다. 취소하는 줄도 우리가 쓴 코드에 없고, 예외는 그대로 order()를 부른 main까지 전달됩니다.', 'good');
    } else if (tx) {
      st.txs = 'committed'; st.od = 'saved'; st.pm = 'saved';
      st.log.push(['묶음 끝', '반영(커밋)', 'good']);
      push('스프링이 order()가 정상으로 끝난 것을 보고 묶음 전체를 반영(커밋)합니다. 쌓아 둔 주문 행과 결제 행이 이제 DB에 확정됩니다. 반영하는 줄도 우리가 쓴 코드에 없습니다.', 'good');
    } else if (zero) {
      st.half = true;
      push('예외가 order()를 부른 main까지 그대로 전달됩니다. 스프링이 취소할 묶음이 없으므로, 앞에서 이미 반영된 주문 행은 그대로 남습니다.', 'bad');
    } else {
      push('order()가 정상으로 끝납니다. 두 저장은 각각 보낼 때 이미 반영되었으므로 끝에서 따로 할 일이 없고, 스프링이 묶음을 시작하거나 반영한 일도 없습니다.', '');
    }

    // 7. 테이블을 조회해 행 수를 본다
    var no = st.od === 'saved' ? 1 : 0, np = st.pm === 'saved' ? 1 : 0;
    var tail = tx && zero ? ' 주문도 결제도 남지 않았습니다.' : zero ? ' 주문은 있는데 결제는 없는 반쪽 상태가 DB에 남았습니다.' : ' 주문과 결제가 모두 남았습니다.';
    push('main이 order()가 끝난 뒤 두 테이블을 조회합니다. orders는 ' + no + '행, payment는 ' + np + '행입니다.' + tail, st.half ? 'bad' : '');

    // 요약: 첫 줄은 물음의 답
    if (tx && zero) {
      sum.push('@Transactional은 메서드 위에 적는 표시이고, 적으면 스프링이 그 메서드 안의 저장을 한 묶음(트랜잭션)으로 다룹니다. 두 저장 사이에서 예외가 나자 앞의 주문 저장까지 취소(롤백)되어 orders와 payment가 모두 0행입니다.');
      sum.push('묶음을 시작하는 코드도 취소하는 코드도 우리가 쓰지 않았습니다. 스프링이 order()를 부르는 앞뒤에서 했습니다. 그래서 "주문은 있는데 결제는 없는" 상태가 남지 않습니다.');
    } else if (zero) {
      sum.push('@Transactional을 지우면 앞의 저장이 DB에 그대로 남습니다. 예외가 난 뒤 orders는 1행이고 payment는 0행인, 주문은 있는데 결제는 없는 반쪽 상태가 되었습니다.');
      sum.push('묶음이 없으면 저장은 보내는 즉시 DB에 반영되어 나중에 취소할 수 없습니다. 메서드가 예외로 끝났다는 것만으로는 앞의 저장이 되돌려지지 않습니다.');
    } else if (tx) {
      sum.push('예외가 나지 않으면 스프링이 묶음 전체를 반영(커밋)해서 orders와 payment가 각각 1행입니다. 두 저장은 묶음 안에서 쌓였다가 order()가 정상으로 끝나자 확정되었습니다.');
      sum.push('@Transactional은 정상으로 끝나는 길에서는 눈에 띄는 차이를 만들지 않고, 예외가 났을 때 결과를 가릅니다. @Transactional을 지우고 stock에 5를 담아도 테이블의 결과는 같습니다.');
    } else {
      sum.push('@Transactional이 없어도 예외가 나지 않으면 두 저장이 각각 곧바로 반영되어 orders와 payment가 각각 1행입니다. @Transactional이 있을 때와 테이블의 결과가 같습니다.');
      sum.push('결과가 같아도 과정은 다릅니다. 여기서는 저장마다 그 자리에서 반영되었고 스프링이 묶음을 시작하거나 반영한 일이 없습니다. 둘을 가르는 것은 두 저장 사이에서 예외가 났을 때입니다.');
    }
    return { events: ev, summary: sum, row: [zero ? '예외로 끝남 (재고 없음)' : '정상으로 끝남', no + '행', np + '행'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 main이 order()를 부르는 것부터 시작합니다.'); return; }
    H.table(v, ['order() 안에서 일어난 일', '결과'], s.log.length ? s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }) : [{ cls: 'gone', cells: ['아직 없음', ''] }], 'order()를 부른 뒤');
    H.counters(v, [[s.od === 'saved' ? 1 : 0, 'orders에 반영된 행'], [s.pm === 'saved' ? 1 : 0, 'payment에 반영된 행']]);
  },
  // 그림: 왼쪽에 order()의 줄 세 개(주문 저장, 재고 확인, 결제 저장)를 위에서 아래로, @Transactional이 있으면 그 둘레에 묶음 영역. 오른쪽에 orders와 payment 테이블의 행이 생겼다가 취소되면 사라진다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    var tt = '묶음(트랜잭션)' + (s && s.txs === 'open' ? ' · 진행 중' : s && s.txs === 'rolled' ? ' · 취소(롤백)됨' : s && s.txs === 'committed' ? ' · 반영(커밋)됨' : '');
    if (c.tx) P.region('tx', 14, 12, 330, 214, tt);
    else P.text('hd', 26, 28, 'order() 메서드의 줄', { cls: 'mut', anchor: 'start' });
    P.region('db', 380, 12, 286, 214, 'DB의 테이블');
    function line(id, y, title, sub, k, failed) {
      // 롤백되면 1번 줄의 저장은 없던 일이 되므로 초록으로 두지 않고 점선으로 바꾼다
      var cur = s && s.cur === id, done = s && s.done[id], undone = id === 'l1' && s && s.txs === 'rolled';
      P.box(id, 26, y, 306, 52, { cls: cur ? (failed ? 'bad now' : 'hot now') : failed && done ? 'bad' : undone ? 'ghost' : done ? 'good' : 'plain', title: title, sub: undone ? sub + ' · 롤백으로 취소됨' : sub });
    }
    line('l1', 40, '1. 주문 저장', 'INSERT INTO orders', 0, false);
    line('l2', 98, '2. 재고 확인', 'stock이 0이면 예외', 0, !!(s && s.fail));
    line('l3', 156, '3. 결제 저장', 'INSERT INTO payment', 0, false);
    function tbl(id, y, name, row, state, bad) {
      var sub = state === 'pending' ? row + ' (묶음 안, 확정 전)' : state === 'saved' ? row + (bad ? ' (반영된 채 남음)' : ' (DB에 반영됨)') : state === 'gone' ? '취소되어 행 없음' : '행 없음';
      P.box(id, 392, y, 262, 52, { cls: state === 'pending' ? 'wait' : state === 'saved' ? (bad ? 'bad' : 'good') : 'ghost', title: name, sub: sub });
    }
    tbl('od', 40, 'orders 테이블', '1 · 키보드', s ? s.od : '', !!(s && s.half));
    tbl('pm', 156, 'payment 테이블', '1 · 30000', s ? s.pm : '', false);
    if (s && s.cur === 'l1') P.arrow('a1', 'l1:r', 'od:l', { cls: 'hot' });
    if (s && s.cur === 'l3') P.arrow('a3', 'l3:r', 'pm:l', { cls: 'hot' });
    var n1 = s && s.od === 'saved' ? 1 : 0, n2 = s && s.pm === 'saved' ? 1 : 0;
    P.box('n1', 14, 242, 322, 36, { cls: n1 ? (s.half ? 'bad' : 'good') : 'ghost', title: 'orders에 반영된 행', right: n1 + '행' });
    P.box('n2', 344, 242, 322, 36, { cls: n2 ? 'good' : 'ghost', title: 'payment에 반영된 행', right: n2 + '행' });
    if (s && s.half) P.note('빨간 상자는 주문 저장만 반영되고 결제 저장은 하지 못한 채 남은 반쪽 상태를 나타냅니다.');
  },
  assume: 'Spring Framework 7.0.9를 JDK 21에서, H2 2.4.240(메모리 DB)에 JDBC로 연결해 실행해 대조했고 MySQL에서의 실행 대조는 하지 않았습니다. 네 가지 조합을 모두, 화면의 OrderService와 같은 소스(package와 import 줄, 그리고 끝에 PROBE 표시를 붙인 측정 줄 두 개만 더함)를 컴파일하고 자바 프로세스를 조합마다 새로 띄워 확인했습니다. 설정 클래스에는 AnnotationConfigApplicationContext가 읽는 @EnableTransactionManagement, H2의 DataSource(HikariCP), JdbcTemplate, DataSourceTransactionManager(시작, 반영, 취소 횟수를 세는 줄만 더한 하위 클래스)를 두었고, OrderService는 @Service로 스프링이 컴포넌트 스캔으로 찾게 했습니다. 자동 커밋은 JDBC 기본값(켜짐) 그대로이고 조합마다 DB와 두 테이블(orders, payment)을 새로 만들었습니다. 대조한 것은 order()가 끝난 방식(IllegalStateException과 그 메시지, 또는 정상)과, 호출이 끝난 뒤 별도의 조회로 센 orders와 payment의 행 수입니다. 단계 문장이 기대는 사실로 order() 안에서 트랜잭션이 활성인지(@Transactional이 있을 때만 활성), main이 받은 OrderService 빈의 클래스(@Transactional이 있으면 스프링이 만든 CGLIB 프록시 클래스, 없으면 우리가 쓴 클래스 그대로), 첫 저장 직후 따로 연결한 DB 연결에서 센 orders의 행 수(@Transactional이 있으면 0행, 없으면 1행), 트랜잭션 매니저가 묶음을 시작하고 반영하고 취소한 횟수(예외로 끝나면 시작 1번과 취소 1번, 정상으로 끝나면 시작 1번과 반영 1번, @Transactional이 없으면 모두 0번)도 실행으로 확인했습니다. 둘째 저장이 묶음 안에서 확정되지 않는다는 것과 없을 때 곧바로 반영된다는 것은 첫 저장으로 잰 값과 최종 행 수에서 이끌어 낸 것이고, 둘째 저장 직후를 따로 재지는 않았습니다. 문서가 정한 것은 스프링 프레임워크 7.0 문서 Data Access의 Declarative Transaction Management 절(선언적 트랜잭션이 AOP로 이루어진다는 것), Understanding the Spring Framework\'s Declarative Transaction Implementation 절(TransactionInterceptor와 트랜잭션 매니저가 메서드 호출 둘레에서 트랜잭션을 이끈다는 것), Using @Transactional 절(@EnableTransactionManagement로 켜야 하고 기본은 프록시 방식이라는 것, 기본으로 RuntimeException과 Error는 롤백하고 체크 예외는 롤백하지 않는다는 것), Rolling Back a Declarative Transaction 절(기본 설정에서 런타임 예외에만 롤백 표시를 한다는 것)입니다. 다만 메서드 앞에서 시작하고 정상이면 반영하며 예외면 취소하는 순서를 문서가 한 문단으로 풀어 쓰고 있지는 않아서, 그 순서는 Probe가 센 횟수와 행 수로 확인한 관찰입니다. 화면의 코드는 package와 import 줄을 줄였고, order()를 부르는 main, 테이블을 만드는 CREATE TABLE, DB 연결과 스프링 설정은 보이지 않습니다. 이 실습은 RuntimeException이 던져지는 한 가지 예외만 다루며, 체크 예외, 같은 클래스 안에서 부르는 경우, readOnly는 다루지 않습니다. 체크 예외와 rollbackFor, 전파 방식은 "트랜잭션 전파" 실습에서, 트랜잭션 자체(격리 수준 포함)는 "트랜잭션 기본" 실습에서 다룹니다.',
});
