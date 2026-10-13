Lab.register({
  id: 'dblock_basic', nav: '행 잠금', cat: '기초개념', mode: 'step', basic: true, deep: ['iso', 'stock', 'dbdeadlock', 'gaplock'],
  title: '두 트랜잭션이 같은 행을 고치려 하면 무슨 일이 생기는가',
  intro: 'DB에는 연결이 여러 개 동시에 붙어 일합니다. 한 연결이 UPDATE로 행을 고치면, DB는 그 행에 잠금(락)을 걸어 둡니다. 잠금은 "이 행은 내가 고치는 중이니 다른 연결은 고치지 말라"는 표시이고, 우리가 쓰는 SQL에는 없이 DB가 UPDATE를 받으면 스스로 겁니다. 잠금은 그 연결의 묶음(트랜잭션)이 COMMIT이나 ROLLBACK으로 끝날 때까지 풀리지 않습니다. 다른 연결이 같은 행을 고치려 하면 DB는 잠금이 풀릴 때까지 그 UPDATE를 기다리게 하고, 너무 오래 기다리면 오류로 끝냅니다. 이 실습은 연결 B가 고치는 행을 바꾸고 연결 A의 COMMIT을 지워 가며 같은 SQL을 실행해, B의 UPDATE가 언제 실행되는지와 마지막 잔액을 봅니다.',
  terms: ['행 잠금', '트랜잭션', '공유 락과 배타 락', '락 대기 시간 초과'],
  controls: [
    { id: 'row', label: 'B가 UPDATE하는 행', type: 'select', value: 'same', options: [['same', 'id 1인 행 (A가 고치는 행과 같음)'], ['other', 'id 2인 행 (A가 고치는 행과 다름)']] },
    { id: 'end', label: 'A가 묶음을 끝내는 방법', type: 'select', value: 'commit', options: [['commit', 'COMMIT으로 끝낸다'], ['hold', 'COMMIT을 적지 않고 계속 붙잡고 있다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '두 연결이 같은 행을 고치는 코드는 어떻게 생겼고, A가 UPDATE로 고친 id 1인 행을 COMMIT 전에 B도 UPDATE하면 무슨 일이 일어나나', d: '같은 행. B의 UPDATE는 A가 COMMIT할 때까지 기다렸다가 그 뒤에 실행됩니다.', v: { row: 'same', end: 'commit' } },
    { t: 'B가 다른 행을 고치면', q: 'B가 id 1 대신 id 2인 행을 UPDATE하면', d: '다른 행에는 잠금이 없어, B의 UPDATE가 A의 COMMIT 전에 바로 실행됩니다.', v: { row: 'other', end: 'commit' } },
    { t: 'A의 COMMIT을 지우면', q: 'A의 COMMIT을 지우면', d: 'A가 잠금을 풀지 않아, B의 UPDATE는 기다리다 시간 초과 오류로 끝납니다.', v: { row: 'same', end: 'hold' } },
    { t: 'A의 COMMIT을 지우고 B가 다른 행을 고치면', q: 'A의 COMMIT을 지우고 B가 id 2인 행을 UPDATE하면', d: 'A가 id 1인 행을 붙잡고 있어도 B는 다른 행이라 기다리지 않습니다.', v: { row: 'other', end: 'hold' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/DbLockBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  code: function (c) {
    var l = ['CREATE TABLE account (id INT PRIMARY KEY, balance INT);', 'INSERT INTO account VALUES (1, 1000), (2, 1000);', '',
      '-- 연결 A (먼저 실행)', 'BEGIN;', '-- 고치는 행에 잠금이 걸리고, 이 묶음이 끝날 때까지 유지된다',
      'UPDATE account SET balance = balance - 100 WHERE id = 1;'];
    if (c.end === 'commit') l.push('-- 끝: 묶음을 확정하고 잠금을 푼다', 'COMMIT;');
    l.push('', '-- 연결 B (A의 UPDATE 다음에 실행)', 'BEGIN;', '-- 고치려는 행에 다른 연결의 잠금이 있는지 DB가 먼저 본다',
      'UPDATE account SET balance = balance + 50 WHERE id = ' + (c.row === 'same' ? '1' : '2') + ';', 'COMMIT;');
    return l.join('\n');
  },
  label: function (c) { return 'B는 id ' + (c.row === 'same' ? '1' : '2') + ' 행 · ' + (c.end === 'commit' ? 'A가 COMMIT으로 끝냄' : 'A가 끝내지 않음'); },
  columns: ['B의 UPDATE', '마지막 잔액', '기다린 까닭'],
  simulate: function (c) {
    var same = c.row === 'same', commit = c.end === 'commit', tgt = same ? 1 : 2, ti = tgt - 1, ev = [], sum = [];
    // 상태: r는 account의 두 행(bal 확정된 잔액, lock 잠근 연결, pend 확정 전 값, wait B가 기다리는 중, hot 방금 확정됨),
    //       a와 b는 두 연결의 상자, fl.b는 B의 UPDATE 화살표(wait 기다림, stop 오류로 끝남, pass 실행됨), log는 실행한 문장
    var st = { r: [{ bal: 1000, lock: '', pend: null, wait: false, hot: false }, { bal: 1000, lock: '', pend: null, wait: false, hot: false }],
      a: { cls: 'ghost', sub: ['시작 전'] }, b: { cls: 'ghost', sub: ['시작 전'] }, fl: { b: '' }, log: [], waiting: 0 };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function calm() { st.r.forEach(function (r) { r.hot = false; }); st.fl.b = ''; }
    function locked() { return st.r.filter(function (r) { return r.lock; }).length; }
    function rowsText() { return '(1, ' + st.r[0].bal + '), (2, ' + st.r[1].bal + ')'; }
    var idTxt = 'id ' + tgt + '인 행';

    // 1. 테이블 준비
    st.log.push(['CREATE TABLE, INSERT', '계좌 1, 2의 잔액 1000', '']);
    push('CREATE TABLE과 INSERT: DB가 account 테이블을 만들고 계좌 1과 계좌 2에 잔액 1000씩을 넣습니다. 프로그램이 DB에 접속하는 통로를 연결이라고 하고, DB에는 연결이 여러 개 동시에 붙을 수 있습니다. 화면의 코드에서 "연결 A"와 "연결 B" 구역은 각각 연결 하나가 보내는 SQL이고, 두 연결이 같은 테이블을 동시에 씁니다. 구역의 순서가 아니라 시간 순서대로, 다음 단계부터 한 문장씩 따라갑니다.', '');

    // 2. A: BEGIN
    calm(); st.a = { cls: 'plain', sub: ['묶음 진행 중'] };
    st.log.push(['A: BEGIN', '묶음 시작', '']);
    push('BEGIN (연결 A): 연결 A가 묶음(트랜잭션)을 시작합니다. 이 묶음은 COMMIT이나 ROLLBACK을 만날 때까지 이어집니다.', '');

    // 3. A: UPDATE 계좌 1
    calm(); st.r[0].lock = 'A'; st.r[0].pend = 900; st.a = { cls: 'hot', sub: ['id 1인 행을 고침', '확정 전 잔액 900'] };
    st.log.push(['A: UPDATE id 1', '900으로 바꿈 · 잠금 걸림', '']);
    push('UPDATE account SET balance = balance - 100 WHERE id = 1 (연결 A): DB가 id 1인 행의 잔액을 1000에서 900으로 바꿉니다. 이때 DB는 이 행에 잠금을 겁니다. 우리가 쓴 SQL에는 잠금을 거는 문장이 없고, DB가 UPDATE를 받으면 스스로 합니다. 잠금은 이 묶음이 COMMIT이나 ROLLBACK으로 끝날 때까지 풀리지 않습니다. 900은 아직 확정되지 않아서, 다른 연결이 이 행을 읽으면 1000이 보입니다.', '');

    // 4. B: BEGIN
    calm(); st.b = { cls: 'plain', sub: ['묶음 진행 중'] };
    st.log.push(['B: BEGIN', '묶음 시작', '']);
    push('BEGIN (연결 B): 연결 B도 자기 묶음을 시작합니다. A와 B는 서로 다른 연결이므로 묶음도 따로입니다.', '');

    // 5. B: UPDATE
    calm();
    var q5 = 'UPDATE account SET balance = balance + 50 WHERE id = ' + tgt + ' (연결 B): ';
    if (same) {
      st.r[0].wait = true; st.waiting = 1; st.fl.b = 'wait'; st.b = { cls: 'wait now', sub: ['UPDATE가 기다리는 중', 'id 1인 행의 잠금 때문'] };
      st.log.push(['B: UPDATE id 1', '기다리는 중', 'bad']);
      push(q5 + 'B가 A와 같은 id 1인 행을 고치려 합니다. DB는 먼저 이 행에 다른 연결의 잠금이 있는지 봅니다. A의 잠금이 걸려 있으므로 B의 UPDATE는 실행되지 못하고 기다립니다. B는 이 문장에서 멈춰 다음 문장으로 가지 못합니다. (기다리는 것은 고치는 문장뿐입니다. 같은 때 다른 연결로 이 행을 SELECT로 읽어 보면 기다리지 않고 바로 1000이 읽혔습니다. H2에서 확인했습니다.)', 'bad');
    } else {
      st.r[1].lock = 'B'; st.r[1].pend = 1050; st.fl.b = 'pass'; st.b = { cls: 'hot', sub: ['id 2인 행을 고침', '확정 전 잔액 1050'] };
      st.log.push(['B: UPDATE id 2', '1050으로 바꿈 · 잠금 걸림', 'good']);
      push(q5 + 'B가 A와 다른 id 2인 행을 고치려 합니다. DB는 먼저 이 행에 다른 연결의 잠금이 있는지 봅니다. A가 잠근 것은 id 1인 행뿐이고 id 2인 행에는 잠금이 없으므로, B의 UPDATE는 기다리지 않고 바로 실행되어 잔액이 1000에서 1050이 됩니다. DB는 이 행에 B의 잠금을 겁니다.', 'good');
    }

    // 6. A가 끝낸다(또는 끝내지 않는다)
    var bRan = 'none';
    if (commit) {
      calm(); st.r[0].bal = 900; st.r[0].pend = null; st.r[0].lock = ''; st.r[0].hot = true; st.a = { cls: 'good', sub: ['COMMIT으로 확정', '잠금이 풀림'] };
      st.log.push(['A: COMMIT', '900 확정 · 잠금 풀림', 'good']);
      if (same) {
        push('COMMIT (연결 A): A가 묶음을 확정합니다. id 1인 행의 900이 확정되어 다른 연결에서도 읽히고, A가 건 잠금이 풀립니다. 기다리던 B가 있으므로 DB는 곧바로 B의 UPDATE를 이어서 실행합니다.', 'good');
        // 7. B의 UPDATE가 이어서 실행된다
        calm(); st.r[0].wait = false; st.waiting = 0; st.r[0].lock = 'B'; st.r[0].pend = 950; st.fl.b = 'pass'; st.b = { cls: 'hot', sub: ['id 1인 행을 고침', '확정 전 잔액 950'] };
        st.log.push(['B: UPDATE id 1', 'A의 COMMIT 뒤에 실행됨 · 950', 'good']);
        push('B의 UPDATE가 이어서 실행됩니다. DB가 id 1인 행의 지금 잔액을 읽어 50을 더합니다. A가 확정한 900에 더하므로 950이 되고, A의 변경은 지워지지 않았습니다. 이제 이 행에는 B의 잠금이 걸립니다.', 'good');
        bRan = 'after';
      } else {
        push('COMMIT (연결 A): A가 묶음을 확정합니다. id 1인 행의 900이 확정되어 다른 연결에서도 읽히고, A가 건 잠금이 풀립니다. 기다리던 연결은 없었습니다. B는 이미 자기 UPDATE를 끝낸 뒤입니다.', 'good');
        bRan = 'before';
      }
    } else if (same) {
      calm(); st.r[0].wait = false; st.waiting = 0; st.fl.b = 'stop'; st.a = { cls: 'hot', sub: ['끝내지 않고 붙잡음', '잠금이 풀리지 않음'] }; st.b = { cls: 'bad', sub: ['UPDATE가 오류로 끝남', '기다리다 시간 초과'] };
      st.log.push(['B: UPDATE id 1', '기다리다 시간 초과 오류', 'bad']);
      push('시간이 흘러도 A는 COMMIT도 ROLLBACK도 하지 않습니다. 코드에 COMMIT이 없기 때문입니다. A의 잠금은 풀리지 않고, B는 DB가 정해 둔 시간까지 기다려도 잠금을 얻지 못합니다. 그러자 DB가 B의 UPDATE를 오류로 끝냅니다. 잠금을 기다리다 시간이 초과된 오류입니다. B는 id 1인 행을 고치지 못했습니다. 오류가 난 것은 이 UPDATE 문장뿐이고, B의 묶음은 열린 채 남아 있습니다.', 'bad');
      bRan = 'timeout';
    } else {
      calm(); st.a = { cls: 'hot', sub: ['끝내지 않고 붙잡음', '잠금이 풀리지 않음'] };
      st.log.push(['A: (COMMIT 없음)', '잠금을 계속 쥐고 있음', 'hot']);
      push('A는 COMMIT도 ROLLBACK도 하지 않습니다. 코드에 COMMIT이 없기 때문에 A는 id 1인 행의 잠금을 계속 쥐고 있습니다. 그래도 B는 다른 행을 고쳤으므로 영향을 받지 않았습니다.', '');
      bRan = 'before';
    }

    // 8. B: COMMIT
    calm();
    var bFixed = (same && bRan === 'timeout') ? false : true;
    if (bFixed) {
      st.r[ti].bal = st.r[ti].pend; st.r[ti].pend = null; st.r[ti].lock = ''; st.r[ti].hot = true;
      st.b = { cls: 'good', sub: ['COMMIT으로 확정', '잠금이 풀림'] };
      st.log.push(['B: COMMIT', 'id ' + tgt + ' 행 ' + st.r[ti].bal + ' 확정', 'good']);
      var tail = same ? ' 이제 id 1인 행에는 A의 -100과 B의 +50이 모두 반영되어 950이 되었고, B의 잠금도 풀립니다.'
        : ' B의 잠금이 풀립니다.' + (commit ? ' A와 B는 서로 다른 행을 고쳤으므로 어느 쪽도 상대를 기다리지 않았습니다.' : ' A는 여전히 끝나지 않았고 id 1인 행의 잠금을 쥐고 있습니다.');
      push('COMMIT (연결 B): B가 묶음을 확정합니다. id ' + tgt + '인 행의 ' + st.r[ti].bal + '이 확정되어 다른 연결에서도 읽힙니다.' + tail, 'good');
    } else {
      st.b = { cls: 'plain', sub: ['COMMIT으로 끝냄', '고친 것이 없음'] };
      st.log.push(['B: COMMIT', '확정할 변경이 없음', '']);
      push('COMMIT (연결 B): B가 묶음을 끝냅니다. B는 아무것도 고치지 못했으므로 확정되는 변경도 없습니다.', '');
    }

    // 9. 새 연결에서 읽는다
    calm();
    var fin = rowsText();
    st.log.push(['새 연결에서 읽기', fin, '']);
    var after = same && commit ? 'A의 -100과 B의 +50이 순서대로 반영되었습니다.'
      : !same && commit ? 'A가 고친 id 1인 행과 B가 고친 id 2인 행이 각각 반영되었습니다.'
      : same ? 'A의 변경은 확정되지 않아 읽히지 않고, B의 변경은 실행되지 못했으므로 처음 값 그대로입니다. A가 잠금을 쥔 채여도 이 읽기는 기다리지 않고 바로 끝났습니다. A의 연결을 닫은 뒤에 읽어도 같았습니다(H2에서 확인).'
      : 'B가 고친 id 2인 행은 확정되어 1050이고, A가 고친 id 1인 행은 확정되지 않아 1000입니다. A의 변경은 읽히지 않고, 이 읽기도 기다리지 않았습니다.';
    push('모든 문장이 끝난 뒤, 새 연결에서 계좌를 읽어 봅니다. 결과는 ' + fin + '입니다. ' + after, same && !commit ? 'bad' : '');

    // 요약: 첫 줄은 물음의 답
    var key = c.row + '|' + c.end;
    var S = {
      'same|commit': ['행 잠금은 UPDATE로 행을 고칠 때 DB가 그 행에 거는 표시입니다. 묶음이 끝날 때까지 풀리지 않아서, 같은 행을 고치려는 B의 UPDATE는 A가 COMMIT할 때까지 기다렸다가 그 뒤에 실행되었습니다.', '잠금은 우리가 쓴 SQL이 아니라 UPDATE를 받은 DB가 겁니다. B는 A가 확정한 900에 50을 더해 950이 되었으므로, 두 변경이 서로를 덮어쓰지 않았습니다.'],
      'other|commit': ['B가 다른 행(id 2)을 고치면 기다리지 않습니다. 기본 키로 한 행을 찾아 고칠 때는 잠금이 그 행에만 걸리므로, B의 UPDATE는 A의 COMMIT 전에 바로 실행되었습니다.', '두 연결이 같은 테이블을 고쳐도 행이 다르면 서로를 막지 않았습니다. 이 실습에서 기다림이 생긴 것은 같은 행을 동시에 고칠 때였습니다.'],
      'same|hold': ['A가 COMMIT도 ROLLBACK도 하지 않고 계속 붙잡고 있으면 잠금이 풀리지 않아, 같은 행을 고치려는 B의 UPDATE는 기다리다 시간 초과 오류로 끝납니다.', 'B는 아무것도 고치지 못했고 잔액은 처음 그대로입니다. 묶음을 끝내지 않고 열어 두면, 그 행을 고치려는 다른 연결은 기다리다 같은 오류를 받을 수 있습니다.'],
      'other|hold': ['A가 잠금을 쥔 채 끝내지 않아도, B가 다른 행(id 2)을 고치면 영향이 없습니다. B의 UPDATE는 바로 실행되고 COMMIT까지 마쳐 id 2인 행의 1050이 확정되었습니다.', '붙잡힌 것은 A가 고친 id 1인 행뿐입니다. 이 행을 고치려는 연결만 기다리게 됩니다.']
    };
    S[key].forEach(function (x) { sum.push(x); });

    var upd = bRan === 'timeout' ? '기다리다 시간 초과' : bRan === 'after' ? 'A의 COMMIT 뒤에 실행됨' : '바로 실행됨';
    var why = same ? (commit ? '같은 행에 A의 잠금이 걸려 있었음' : '같은 행의 잠금을 A가 풀지 않음') : '기다리지 않음: 다른 행이라 잠금이 없음';
    return { events: ev, summary: sum, row: [upd, fin, why] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 CREATE TABLE부터 한 문장씩 진행합니다.'); return; }
    H.table(v, ['계좌', '확정된 잔액 (다른 연결이 읽는 값)', '잠금'], s.r.map(function (r, i) {
      var lk = r.lock ? (r.lock + '가 잠금' + (r.wait ? ' · B가 기다리는 중' : '')) : '없음';
      return { cls: '', cells: ['계좌 ' + (i + 1), { v: String(r.bal), cls: r.hot ? 'good' : '' }, { v: lk, cls: r.wait ? 'bad' : r.lock ? 'hot' : '' }] };
    }), 'account 테이블');
    H.table(v, ['실행한 문장', '결과'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), '문장과 결과');
    var n = s.r.filter(function (r) { return r.lock; }).length;
    H.counters(v, [[n, '잠금이 걸린 행'], [s.waiting, '기다리는 연결']]);
  },
  // 그림: 왼쪽에 연결 A와 연결 B, 오른쪽에 account 테이블의 두 행. 잠금이 걸린 행은 노랑(A) 또는 파랑(B)이고, B의 UPDATE 화살표는 기다리거나 오류로 끝나면 행에 닿기 전에 끊긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, ti = c.row === 'same' ? 0 : 1;
    P.size(680, 322);
    P.box('ca', 14, 20, 200, 96, { cls: s ? s.a.cls : 'ghost', title: '연결 A', sub: s ? s.a.sub : ['시작 전'] });
    P.box('cb', 14, 150, 200, 96, { cls: s ? s.b.cls : 'ghost', title: '연결 B', sub: s ? s.b.sub : ['시작 전'] });
    P.region('tb', 380, 10, 286, 236, 'account 테이블');
    [0, 1].forEach(function (i) {
      var r = s ? s.r[i] : { bal: 1000, lock: '', pend: null, wait: false, hot: false };
      var sub = r.lock ? r.lock + '가 잠금' + (r.pend !== null ? ' · 확정 전 ' + r.pend : '') : '잠금 없음';
      P.box('r' + i, 392, 36 + i * 100, 262, 80, { cls: r.hot ? 'good' : r.lock === 'A' ? 'hot' : r.lock === 'B' ? 'wait' : 'plain', title: '계좌 ' + (i + 1) + ' · 확정된 잔액 ' + r.bal, sub: r.wait ? [sub, 'B가 기다리는 중'] : [sub] });
    });
    if (s && s.r[0].lock === 'A') P.arrow('aa', 'ca:r', 'r0:l:0.3', { cls: 'hot' });
    if (s && (s.fl.b || s.r[ti].lock === 'B')) {
      if (s.fl.b === 'wait' || s.fl.b === 'stop') {
        P.arrow('ab', 'cb:r', [368, 100], { cls: s.fl.b === 'stop' ? 'bad' : 'dash' });
        P.text('x', 374, 104, '×', { cls: 'bad', anchor: 'middle', bold: true });
      } else P.arrow('ab', 'cb:r', 'r' + ti + ':l:0.7', { cls: s.fl.b === 'pass' ? 'good' : 'hot' });
    }
    var n = s ? s.r.filter(function (r) { return r.lock; }).length : 0, w = s ? s.waiting : 0;
    P.box('n1', 14, 266, 322, 36, { cls: n ? 'hot' : 'ghost', title: '잠금이 걸린 행', right: String(n) });
    P.box('n2', 344, 266, 322, 36, { cls: w ? 'bad' : 'ghost', title: '기다리는 연결', right: String(w) });
    if (s && s.fl.b === 'wait') P.note('점선 화살표가 ×에서 끊긴 것은 B의 UPDATE가 A의 잠금 때문에 행에 닿지 못하고 기다리는 상태입니다.');
    else if (s && s.fl.b === 'stop') P.note('빨간 화살표는 B의 UPDATE가 기다리다 오류로 끝난 것입니다.');
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했고 MySQL에서의 실행 대조는 하지 않았습니다. 네 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 만든 뒤 "연결 A"와 "연결 B" 구역으로 나눠 연결 A(메인 스레드)와 연결 B(스레드)가 각자의 구역을 글자 그대로 실행했습니다. 실행 차례는 A의 BEGIN과 UPDATE, B의 BEGIN, B의 UPDATE 시도, (있으면) A의 COMMIT, B의 COMMIT입니다. 두 연결이 같은 DB를 보도록 이름을 준 메모리 DB(DB_CLOSE_DELAY=-1)를 조합마다 새로 만들었고, 격리 수준은 H2 기본값인 READ COMMITTED 그대로 두었습니다. 대조한 것은 결과 표의 세 항목입니다. B의 UPDATE가 0.4초가 지난 뒤에도 끝나지 않았는지와 A의 COMMIT 시각보다 늦게 끝났는지(시각을 기록해 비교), 오류가 났다면 그 종류(H2의 SQLSTATE HYT00, 오류 코드 50200, 메시지 첫 줄은 Timeout trying to lock table "ACCOUNT"이며 H2는 행 잠금이어도 메시지에 테이블 이름을 적습니다), 모든 문장이 끝난 뒤 새 연결로 읽은 잔액입니다. 끝내지 않은 조합은 A가 잠금을 쥔 채로 읽었고, A의 연결을 닫은 뒤에 읽은 값도 같았습니다. 잠금을 기다리는 시간은 연결 B에서 SET LOCK_TIMEOUT 1000(1초)으로 줄여 두었습니다(H2 기본값은 2초이며, 이 설정은 화면의 코드에 없습니다). 화면에는 시간 숫자를 적지 않았고, MySQL InnoDB의 기본값은 innodb_lock_wait_timeout 50초입니다. 단계 문장이 기대는 사실로 A가 UPDATE한 직후 다른 연결이 읽은 값(확정 전이라 1000), B가 기다리는 동안 다른 연결의 SELECT가 기다리지 않고 1000을 바로 읽은 것(H2에서 읽기가 기다리지 않는 것을 따로 재었고, 화면에서는 한 문장으로만 언급했습니다), B가 기다리다 오류로 끝난 뒤에도 B의 자동 커밋이 꺼진 채라 묶음이 열려 있는 것, 이어서 실행된 B의 UPDATE가 A가 확정한 900에 50을 더해 950이 된 것도 실행으로 확인했습니다. MySQL 8.4 문서는 17.7.1절 InnoDB Locking(배타 락은 그 행을 고치거나 지울 수 있게 하고, 한 트랜잭션이 행에 배타 락을 쥐면 다른 트랜잭션의 같은 행 락 요청은 곧바로 얻지 못하고 기다려야 한다), 17.7.3절 Locks Set by Different SQL Statements in InnoDB(UPDATE ... WHERE는 검색에서 만난 레코드에 배타 락을 걸고, 유일한 인덱스로 한 행을 찾으면 인덱스 레코드 락이면 된다. InnoDB 락은 트랜잭션이 커밋되거나 중단될 때 풀린다), InnoDB 시작 옵션과 시스템 변수 페이지(innodb-parameters)의 innodb_lock_wait_timeout(기본 50초, 기다리다 오류 1205, 이때 문장만 롤백되고 트랜잭션 전체는 롤백되지 않음)을 직접 열어 확인했습니다. H2 문서는 Advanced 페이지의 Multi-Version Concurrency Control(연결은 확정된 데이터와 자기 변경만 보며, 같은 행을 동시에 잠그거나 고치려 하면 잠금 대기 시간까지 기다린다)과 Lock Timeout(잠금을 얻지 못하면 오류, 연결마다 설정 가능)을 확인했습니다. 17.7.3절이 UPDATE 락의 해제 시점을 문장으로 직접 적은 것은 아니고, 같은 절의 일반 문장(InnoDB 락은 트랜잭션이 커밋되거나 중단될 때 풀린다)에서 읽은 것입니다. MySQL이 같은 SQL에서 같은 결과를 내는지는 실행으로 확인하지 않았습니다. 이 실습은 한 행에 대한 배타적 잠금과 기다림만 다루며, 읽기 잠금(SELECT ... FOR UPDATE), 격리 수준에 따른 차이(iso), 재고 차감에서의 사용(stock), 서로를 기다리는 교착 상태(dbdeadlock), 행 사이의 빈 구간 잠금(gaplock)은 다루지 않습니다.',
});
