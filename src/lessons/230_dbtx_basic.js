Lab.register({
  id: 'dbtx_basic', nav: '트랜잭션', cat: '기초개념', mode: 'step', basic: true, deep: ['tx'],
  title: '트랜잭션은 무엇을 묶고, COMMIT과 ROLLBACK은 무엇을 하는가',
  intro: '계좌 1에서 300을 빼고 계좌 2에 300을 더하는 일은 UPDATE 두 문장입니다. 하나만 반영되면 돈이 사라지거나 생깁니다. 트랜잭션은 이런 여러 문장을 "모두 반영되거나 모두 없던 일이 되는" 한 묶음으로 만드는 것입니다. 코드에서는 BEGIN이라는 문장으로 묶음을 시작하고, COMMIT이나 ROLLBACK으로 끝냅니다. COMMIT은 묶음에서 한 일을 전부 확정해 다른 연결에서도 보이게 하고, ROLLBACK은 묶음에서 한 일을 전부 취소합니다. 확정하기 전의 변경은 다른 연결에서 보이지 않습니다. (MySQL에서는 BEGIN 대신 START TRANSACTION이라고 쓰는 것이 표준이며 같은 뜻입니다. 이 실습을 대조한 H2는 START TRANSACTION을 받지 않아서 BEGIN으로 적었습니다.) 이 실습은 BEGIN을 지우거나 COMMIT을 ROLLBACK으로 바꾸거나 끝내는 문장을 지워 가며 같은 UPDATE 두 개를 실행하고, 다른 연결에서 읽은 잔액이 어떻게 달라지는지를 봅니다.',
  terms: ['트랜잭션', '커밋과 롤백', '자동 커밋(autocommit)', 'BEGIN, COMMIT, ROLLBACK 문'],
  controls: [
    { id: 'begin', label: 'BEGIN을 적는다', type: 'check', value: true },
    { id: 'end', label: '묶음을 끝내는 방법', type: 'select', value: 'commit', options: [['commit', 'COMMIT으로 끝낸다'], ['rollback', 'ROLLBACK으로 끝낸다'], ['none', '끝내지 않는다 (COMMIT도 ROLLBACK도 없이 연결이 끊긴다)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '트랜잭션은 어떻게 생겼고, 두 UPDATE를 묶어 COMMIT하면 무슨 일이 일어나나', d: 'BEGIN으로 시작해 COMMIT으로 끝나는 묶음. 두 변경이 COMMIT에서 한꺼번에 확정되고, 그 전에는 다른 연결에서 보이지 않습니다.', v: { begin: true, end: 'commit' } },
    { t: 'ROLLBACK으로 끝내면', q: 'COMMIT 대신 ROLLBACK하면', d: '묶음에서 한 일이 전부 취소되어 두 계좌가 처음 값으로 돌아갑니다.', v: { begin: true, end: 'rollback' } },
    { t: 'BEGIN을 지우면', q: 'BEGIN을 지우면', d: '묶음이 없어서 UPDATE가 실행되자마자 확정됩니다. 첫 UPDATE 직후 다른 연결에서 이미 바뀐 값이 보입니다.', v: { begin: false, end: 'commit' } },
    { t: 'BEGIN을 지우고 ROLLBACK하면', q: 'BEGIN을 지우고 ROLLBACK하면', d: '이미 확정된 UPDATE는 ROLLBACK으로 되돌릴 수 없습니다.', v: { begin: false, end: 'rollback' } },
    { t: 'COMMIT도 ROLLBACK도 없이 연결이 끊기면', q: 'COMMIT도 ROLLBACK도 하지 않고 연결이 끊기면', d: '끝내지 않은 묶음은 확정되지 않습니다. H2에서는 연결이 끊길 때 취소되었습니다.', v: { begin: true, end: 'none' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/DbTxBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  code: function (c) {
    var l = ['CREATE TABLE account (id INT PRIMARY KEY, balance INT);', 'INSERT INTO account VALUES (1, 1000), (2, 0);', ''];
    if (c.begin) l.push('-- 시작: 여기서부터의 문장을 한 묶음으로 다룬다', 'BEGIN;');
    l.push('UPDATE account SET balance = balance - 300 WHERE id = 1;', 'UPDATE account SET balance = balance + 300 WHERE id = 2;');
    if (c.end === 'commit') l.push('-- 끝: 묶음 전체를 확정한다', 'COMMIT;');
    else if (c.end === 'rollback') l.push('-- 끝: 묶음에서 한 일을 전부 취소한다', 'ROLLBACK;');
    l.push('', 'SELECT * FROM account ORDER BY id;');
    return l.join('\n');
  },
  label: function (c) { return (c.begin ? 'BEGIN 있음' : 'BEGIN 없음') + ' · ' + { commit: 'COMMIT으로 끝냄', rollback: 'ROLLBACK으로 끝냄', none: '끝내지 않음' }[c.end]; },
  columns: ['첫 UPDATE 직후 다른 연결에서 본 계좌 1', '끝난 뒤 계좌 1', '끝난 뒤 계좌 2'],
  simulate: function (c) {
    var begin = !!c.begin, end = c.end, ev = [], sum = [];
    // 상태: a는 화면의 SQL을 실행하는 연결이 읽는 잔액, t는 확정된 값(다른 연결이 읽는 값), u는 두 UPDATE의 상태(none 실행 전, pending 묶음 안, done 확정됨, gone 취소됨),
    //       bs는 묶음의 상태, tx는 묶음이 진행 중인가, chg는 이번 단계에서 t가 바뀐 계좌, mv는 이번 단계에서 확정된 UPDATE
    var st = { a: [1000, 0], t: [1000, 0], u: ['none', 'none'], bs: '', tx: false, chg: [false, false], mv: [false, false], log: [] };
    var facts = {};
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function calm() { st.chg = [false, false]; st.mv = [false, false]; }
    function both(x) { return x[0] + ',' + x[1]; }
    function pair(x) { return '계좌 1은 ' + x[0] + ', 계좌 2는 ' + x[1]; }

    // 1. 테이블 준비: 트랜잭션을 시작하기 전이라 문장마다 바로 확정된다
    facts.bSetup = both(st.t);
    st.log.push(['CREATE TABLE, INSERT', '바로 확정됨', '']);
    push('CREATE TABLE과 INSERT: DB가 account 테이블을 만들고 계좌 1(잔액 1000)과 계좌 2(잔액 0)를 넣습니다. 화면의 SQL은 DB에 접속한 연결 하나(이 연결)에서 실행합니다. 코드에는 없지만 확인을 위해 같은 DB에 연결을 하나 더(다른 연결) 열어 두고, 이 연결이 문장을 실행할 때마다 다른 연결로 계좌 잔액을 읽어 봅니다. ' +
      (begin ? '아직 트랜잭션을 시작하지 않았으므로 이 두 문장은 실행되자마자 확정되어, 다른 연결에서 읽어도 계좌 1은 1000, 계좌 2는 0입니다.' : '트랜잭션을 시작하는 문장이 없으므로 문장 하나하나가 실행되자마자 확정됩니다(자동 커밋). 다른 연결에서 읽어도 계좌 1은 1000, 계좌 2는 0입니다.'), '');

    // 2. BEGIN
    if (begin) {
      calm(); st.tx = true; st.bs = 'open'; facts.autoBegin = !st.tx;
      st.log.push(['BEGIN', '묶음 시작', '']);
      push('BEGIN: DB가 이 연결에서 보내는 문장들을 한 묶음으로 다루기 시작합니다. 문장마다 바로 확정하던 방식(자동 커밋)을 이 묶음이 끝날 때까지 멈추므로, 지금부터 하는 일은 COMMIT이나 ROLLBACK을 만날 때까지 확정되지 않습니다.', '');
    }

    // 3. 첫 UPDATE
    calm(); st.a[0] = 700; st.u[0] = begin ? 'pending' : 'done';
    if (!begin) { st.t[0] = 700; st.chg[0] = true; st.mv[0] = true; }
    facts.aUpd1 = both(st.a); facts.bUpd1 = both(st.t);
    st.log.push(['UPDATE 계좌 1에서 300 빼기', '이 연결 ' + st.a[0] + ' · 다른 연결 ' + st.t[0], begin ? '' : 'bad']);
    push('UPDATE account SET balance = balance - 300 WHERE id = 1: DB가 계좌 1의 잔액을 1000에서 700으로 바꿉니다. ' + (begin
      ? '묶음 안의 일이라 아직 확정되지 않았습니다. 이 연결에서 읽으면 700이지만, 다른 연결에서 읽으면 여전히 1000입니다. 확정된 값만 보면 두 계좌의 합은 1000 그대로입니다.'
      : '묶음이 없으므로 DB는 이 문장이 실행되자마자 확정합니다(자동 커밋). 다른 연결에서 읽어도 700입니다. 계좌 2에는 아직 300이 더해지지 않았으므로, 다른 연결이 보는 두 계좌의 합은 700으로 줄어든 상태입니다.'), begin ? '' : 'bad');

    // 4. 둘째 UPDATE
    calm(); st.a[1] = 300; st.u[1] = begin ? 'pending' : 'done';
    if (!begin) { st.t[1] = 300; st.chg[1] = true; st.mv[1] = true; }
    facts.aUpd2 = both(st.a); facts.bUpd2 = both(st.t);
    st.log.push(['UPDATE 계좌 2에 300 더하기', '이 연결 ' + st.a[1] + ' · 다른 연결 ' + st.t[1], '']);
    push('UPDATE account SET balance = balance + 300 WHERE id = 2: DB가 계좌 2의 잔액을 0에서 300으로 바꿉니다. ' + (begin
      ? '이것도 묶음 안이라 확정되지 않았습니다. 이 연결에서는 700과 300이지만 다른 연결에서는 1000과 0 그대로입니다. 두 변경이 한 묶음에 쌓여 있습니다.'
      : '묶음이 없으므로 이것도 바로 확정합니다. 다른 연결에서 읽으면 이제 700과 300이고 합은 다시 1000입니다. 두 문장 사이에는 합이 700인 상태가 확정된 채 있었고, 그때 다른 연결이 읽으면 그 값이 보였습니다.'), '');

    // 5. 끝내는 문장
    if (end === 'commit') {
      calm();
      if (begin) {
        st.t = st.a.slice(); st.chg = [true, true]; st.mv = [true, true]; st.u = ['done', 'done']; st.bs = 'committed'; st.tx = false; facts.autoEnd = !st.tx;
        st.log.push(['COMMIT', '두 변경이 한꺼번에 확정됨', 'good']);
        push('COMMIT: DB가 묶음에 쌓인 두 변경을 한꺼번에 확정합니다. 이제 다른 연결에서 읽어도 계좌 1은 700, 계좌 2는 300입니다. 확정은 묶음 전체에 대해 한 번 일어나므로, 이 실습에서 다른 연결이 읽은 값은 1000과 0, 또는 700과 300뿐이었고 한쪽만 바뀐 값은 없었습니다. 묶음이 끝났으므로 이 연결은 문장마다 바로 확정하는 방식으로 돌아옵니다.', 'good');
      } else {
        st.log.push(['COMMIT', '확정할 묶음이 없음', '']);
        push('COMMIT: 확정할 묶음이 없습니다. 두 UPDATE는 실행되자마자 이미 확정되었으므로 COMMIT이 바꾸는 것은 없고, 다른 연결에서 읽는 값은 700과 300 그대로입니다.', '');
      }
      facts.aEnd = both(st.a); facts.bEnd = both(st.t);
    } else if (end === 'rollback') {
      calm();
      if (begin) {
        st.a = st.t.slice(); st.u = ['gone', 'gone']; st.bs = 'rolled'; st.tx = false; facts.autoEnd = !st.tx;
        st.log.push(['ROLLBACK', '묶음에서 한 일이 전부 취소됨', 'good']);
        push('ROLLBACK: DB가 묶음에서 한 일을 전부 취소합니다. 계좌 1의 700과 계좌 2의 300이 모두 없던 일이 되어, 이 연결에서도 다른 연결에서도 1000과 0입니다. 확정된 적이 없는 변경이라서 다른 연결은 처음부터 끝까지 바뀐 값을 본 적이 없습니다. 묶음이 끝났으므로 이 연결은 문장마다 바로 확정하는 방식으로 돌아옵니다.', 'good');
      } else {
        st.log.push(['ROLLBACK', '취소할 묶음이 없음', 'bad']);
        push('ROLLBACK: 취소할 묶음이 없습니다. 두 UPDATE는 실행되자마자 이미 확정되었으므로 취소되지 않고, 오류도 나지 않습니다. 다른 연결에서 읽는 값은 700과 300 그대로입니다.', 'bad');
      }
      facts.aEnd = both(st.a); facts.bEnd = both(st.t);
    }

    // 6. SELECT
    calm();
    var rows = '(1, ' + st.a[0] + '), (2, ' + st.a[1] + ')';
    facts.aSelect = rows; facts.bSelect = both(st.t); facts.autoLast = !st.tx;
    var open = begin && end === 'none';
    st.log.push(['SELECT * FROM account', rows, open ? 'hot' : '']);
    var tail = open
      ? '묶음이 아직 끝나지 않았지만 이 연결은 자기가 한 변경을 읽을 수 있어서 700과 300이 보입니다. 다른 연결에서 읽으면 아직 1000과 0입니다.'
      : begin && end === 'rollback' ? '묶음을 취소했으므로 처음 값 그대로입니다.'
      : begin ? '확정된 값과 같습니다.'
      : end === 'none' ? '끝내는 문장이 없지만 묶음도 없었으므로 모두 이미 확정된 값입니다.'
      : '이미 확정된 값입니다.';
    push('SELECT * FROM account ORDER BY id: 이 연결에서 계좌를 읽습니다. 결과는 ' + rows + '입니다. ' + tail, '');

    // 7. (끝내지 않았을 때) 연결이 끊긴다. 이 코드에는 없는 일
    if (end === 'none') {
      calm();
      if (begin) {
        st.a = st.t.slice(); st.u = ['gone', 'gone']; st.bs = 'dropped'; st.tx = false;
        st.log.push(['연결이 끊김', '확정되지 않은 묶음이 취소됨', 'bad']);
        push('이 코드에는 없는 일입니다. COMMIT도 ROLLBACK도 하지 않은 채 이 연결이 끊깁니다. 끝나지 않은 묶음을 가진 연결이 끊기자, H2는 그 묶음을 취소했습니다. 두 변경이 없던 일이 됩니다. (H2에서 JDBC 연결을 닫았을 때 관찰한 동작입니다.)', 'bad');
      } else {
        st.log.push(['연결이 끊김', '취소할 묶음이 없음', '']);
        push('이 코드에는 없는 일입니다. 이 연결이 끊깁니다. 묶음이 없었으므로 취소할 것이 없고, 두 UPDATE는 이미 확정된 채 남습니다.', '');
      }
    }

    // 8. 새 연결에서 읽는다
    calm();
    facts.final = both(st.t);
    var total = st.t[0] + st.t[1];
    var why = begin && end === 'commit' ? '묶음 전체가 반영되었습니다.'
      : begin && end === 'rollback' ? '묶음 전체가 없던 일이 되었습니다.'
      : begin ? '끝내지 않은 묶음은 반영되지 않았습니다.'
      : '문장마다 이미 확정되어 있어서 ' + (end === 'commit' ? 'COMMIT을 적었어도' : end === 'rollback' ? 'ROLLBACK을 적었어도' : '끝내는 문장이 없어도') + ' 결과가 같습니다.';
    st.log.push(['새 연결에서 읽기', pair(st.t), '']);
    push('모든 것이 끝난 뒤, 새 연결에서 계좌를 읽어 봅니다. ' + pair(st.t) + '이고 합은 ' + total + '입니다. ' + why, '');

    // 요약: 첫 줄은 물음의 답
    var key = begin + '|' + end;
    var S = {
      'true|commit': ['트랜잭션은 BEGIN으로 시작해 COMMIT으로 끝나는 문장들의 묶음입니다. 두 UPDATE는 COMMIT에서 한꺼번에 확정되었고, 그 전에는 다른 연결에서 계좌 1이 1000으로 보였습니다.', '묶음을 시작하고 확정하는 일은 우리가 쓴 BEGIN과 COMMIT이 합니다. 두 변경이 함께 보이거나 함께 보이지 않으므로, 돈이 사라지거나 생긴 순간이 다른 연결에는 보이지 않았습니다.'],
      'true|rollback': ['COMMIT 대신 ROLLBACK을 쓰면 묶음에서 한 일이 전부 취소됩니다. 계좌 1은 1000, 계좌 2는 0으로 두 UPDATE가 없던 일이 되었습니다.', '취소는 확정하기 전이라서 가능합니다. 다른 연결은 한 번도 바뀐 값을 보지 못했으므로 중간 상태가 밖으로 드러나지 않았습니다.'],
      'false|commit': ['BEGIN을 지우면 묶음이 없어 UPDATE가 실행되자마자 확정됩니다. 첫 UPDATE 직후 다른 연결에서 계좌 1이 이미 700으로 보였고, COMMIT은 바꿀 것이 없었습니다.', '두 UPDATE 사이에는 합이 700인 상태가 확정된 채 있었습니다. 문장들을 묶는 것은 BEGIN이고, COMMIT만 적는다고 묶이지 않습니다.'],
      'false|rollback': ['BEGIN 없이 ROLLBACK을 해도 취소되는 것이 없습니다. 두 UPDATE는 이미 확정되어 계좌 1은 700, 계좌 2는 300으로 남았습니다.', 'ROLLBACK은 진행 중인 묶음을 취소하는 문장입니다. 묶음을 시작하지 않았다면 되돌릴 것이 없고, 자동 커밋으로 이미 확정된 문장은 되돌릴 수 없습니다.'],
      'true|none': ['COMMIT도 ROLLBACK도 없이 연결이 끊기면 H2에서는 확정되지 않은 묶음이 취소되어, 계좌 1은 1000, 계좌 2는 0으로 남았습니다.', '묶음은 COMMIT을 만나야 확정되므로 끝내지 않은 변경은 확정되지 않습니다. 이 연결의 SELECT에는 700과 300이 보였지만 다른 연결은 한 번도 보지 못했습니다. (H2에서 JDBC 연결을 닫았을 때 관찰한 동작입니다.)'],
      'false|none': ['BEGIN도 끝내는 문장도 없으면 두 UPDATE는 각각 실행되자마자 확정되어 계좌 1은 700, 계좌 2는 300이 남습니다.', '연결이 끊겨도 묶음이 없었으므로 취소될 것이 없습니다. 트랜잭션을 시작하지 않은 문장은 하나하나가 곧바로 확정되어, COMMIT을 적지 않아도 확정됩니다.']
    };
    S[key].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, facts: facts, row: [String(facts.bUpd1.split(',')[0]), String(st.t[0]), String(st.t[1])] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 CREATE TABLE부터 한 문장씩 진행합니다.'); return; }
    H.table(v, ['계좌', '이 연결이 읽으면', '다른 연결이 읽으면'], [0, 1].map(function (i) {
      var k = s.a[i] !== s.t[i] ? 'hot' : '';
      return { cls: '', cells: ['계좌 ' + (i + 1), { v: String(s.a[i]), cls: k }, { v: String(s.t[i]), cls: s.chg[i] ? 'good' : '' }] };
    }), 'account 테이블의 잔액');
    H.table(v, ['실행한 문장', '결과'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), '문장과 결과');
    H.counters(v, [[s.t[0] + s.t[1], '다른 연결이 보는 두 계좌의 합'], [s.t[0], '다른 연결이 보는 계좌 1']]);
  },
  // 그림: 왼쪽에 이 연결의 두 UPDATE(BEGIN이 있으면 그 둘레에 묶음 영역), 오른쪽에 확정된 account 테이블(다른 연결이 보는 것). 확정되면 화살표로 오른쪽 값이 바뀌고, 취소되면 왼쪽 상자가 비워진다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 252);
    var bt = '이 연결의 묶음' + (s && s.bs === 'open' ? ' · 진행 중' : s && s.bs === 'committed' ? ' · 확정됨' : s && s.bs === 'rolled' ? ' · 취소됨' : s && s.bs === 'dropped' ? ' · 끊겨서 취소됨' : '');
    if (c.begin) P.region('bd', 14, 12, 330, 160, bt);
    else P.text('hd', 26, 28, '이 연결이 보낸 UPDATE (묶음 없음)', { cls: 'mut', anchor: 'start' });
    P.region('tb', 380, 12, 286, 160, '확정된 account 테이블');
    var lab = [['첫 UPDATE', '계좌 1: 1000 → 700'], ['둘째 UPDATE', '계좌 2: 0 → 300']];
    var cls = { none: 'ghost', pending: 'wait', done: 'good', gone: 'ghost' };
    var st = { none: '실행 전', pending: '확정 전', done: '확정됨', gone: '취소됨' };
    [0, 1].forEach(function (i) {
      var u = s ? s.u[i] : 'none';
      P.box('u' + i, 26, 44 + i * 60, 306, 52, { cls: cls[u], title: lab[i][0], sub: lab[i][1] + ' (' + st[u] + ')' });
      var chg = s && s.chg[i];
      P.box('a' + (i + 1), 392, 44 + i * 60, 262, 52, { cls: chg ? 'hot' : 'plain', title: '계좌 ' + (i + 1) + ' · 잔액 ' + (s ? s.t[i] : (i ? 0 : 1000)), sub: chg ? '방금 확정된 값' : '다른 연결이 읽는 값' });
      if (s && s.mv[i]) P.arrow('ar' + i, 'u' + i + ':r', 'a' + (i + 1) + ':l', { cls: 'good' });
    });
    var total = s ? s.t[0] + s.t[1] : 1000;
    P.box('n1', 14, 192, 322, 36, { cls: total === 1000 ? 'good' : 'bad', title: '다른 연결이 보는 두 계좌의 합', right: String(total) });
    P.box('n2', 344, 192, 322, 36, { cls: s && s.a[0] !== s.t[0] ? 'wait' : 'plain', title: '이 연결이 읽는 계좌 1', right: String(s ? s.a[0] : 1000) });
    if (s && total !== 1000) P.note('빨간 칸은 한쪽만 확정되어 두 계좌의 합이 맞지 않는 상태입니다.');
    else if (s && (s.u[0] === 'pending' || s.u[1] === 'pending')) P.note('파란 상자는 이 연결의 묶음 안에만 있는 변경입니다. 오른쪽 테이블에는 아직 없습니다.');
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했고 MySQL에서의 실행 대조는 하지 않았습니다. 여섯 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 글자 그대로 연결 하나(이 연결)에서 한 문장씩 실행했습니다. 두 연결이 같은 DB를 보도록 이름을 준 메모리 DB(DB_CLOSE_DELAY=-1)를 조합마다 새로 만들었고, 격리 수준은 H2 기본값인 READ COMMITTED 그대로 두었습니다. 대조한 것은 결과 표의 세 항목, 곧 첫 UPDATE 직후 따로 열어 둔 다른 연결이 SELECT balance FROM account WHERE id = 1로 읽은 값, 그리고 모든 것이 끝난 뒤(끝내지 않은 조합은 이 연결을 닫은 뒤) 새 연결로 읽은 두 계좌의 값입니다. 이 확인용 조회는 화면의 코드에 없는 것이고, 다른 연결의 조회가 기다리거나 실패한 경우는 없었습니다(시간 제한 3초를 두고 실행). 단계 문장이 기대는 사실로 문장마다 이 연결과 다른 연결이 읽은 두 계좌의 값, BEGIN 뒤 자동 커밋이 꺼지고 COMMIT이나 ROLLBACK 뒤 다시 켜지는 것(JDBC의 getAutoCommit), 마지막 SELECT가 이 연결에 보여 준 값도 실행으로 확인했습니다. 끝내지 않고 연결을 닫으면 확정되지 않은 변경이 취소된다는 것은 H2에서 JDBC 연결을 닫았을 때 관찰한 동작이고, 연결이 끊기는 다른 방식(네트워크 단절, 서버 종료)은 실행하지 않았습니다. 격리 수준에 따라 달라지는 세부(다른 연결이 어떤 값을 볼 수 있는지, 기다리는지)는 다루지 않았으며 H2 기본값에서 본 결과일 뿐입니다. 트랜잭션을 시작하는 문장은 H2 2.4.240이 START TRANSACTION을 받지 않아(구문 오류) BEGIN으로 적었습니다. BEGIN은 H2 2.4.240에서 실행되었으나 H2 문서의 Commands 페이지에서는 찾지 못했습니다. COMMIT, ROLLBACK, SET AUTOCOMMIT은 그 페이지에 있습니다. MySQL 8.4 문서의 15.3.1절 START TRANSACTION, COMMIT, and ROLLBACK Statements에는 BEGIN과 BEGIN WORK가 START TRANSACTION의 다른 이름이라는 것(START TRANSACTION이 표준 SQL이며 권장된다는 것), 저장 프로그램 안에서는 BEGIN이 BEGIN ... END 블록의 시작으로 해석되므로 START TRANSACTION을 써야 한다는 것, START TRANSACTION 동안 자동 커밋이 꺼지고 COMMIT이나 ROLLBACK 뒤 이전 상태로 돌아온다는 것, 기본으로 자동 커밋이 켜져 있어 문장마다 확정되고 ROLLBACK으로 되돌릴 수 없다는 것, COMMIT은 변경을 영구하게 하고 ROLLBACK은 변경을 취소한다는 것이 적혀 있습니다. 17.7.2.2절 autocommit, Commit, and Rollback(InnoDB)에는 새 연결이 자동 커밋을 켠 채 시작한다는 것, 자동 커밋을 끈 세션이 마지막 트랜잭션을 확정하지 않고 끝나면 MySQL이 그 트랜잭션을 롤백한다는 것이 적혀 있습니다. 위 두 절은 직접 열어 확인했지만 MySQL이 같은 SQL에서 같은 값을 내는지는 실행으로 확인하지 않았습니다. 화면의 코드는 CREATE TABLE과 INSERT를 포함한 전체이고, 다른 연결의 조회와 연결을 닫는 일은 보이지 않습니다. 이 실습은 한 묶음의 시작과 끝만 다루며, 격리 수준, 락, 중첩 트랜잭션, 스프링의 @Transactional은 다루지 않습니다.',
});
