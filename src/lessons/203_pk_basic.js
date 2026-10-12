Lab.register({
  id: 'pk_basic', nav: '기본 키', cat: '기초개념', mode: 'step', basic: true, deep: ['constraints'],
  title: '기본 키는 무엇이고, 없으면 무엇이 달라지는가',
  intro: '기본 키는 테이블을 만들 때 열 하나에 PRIMARY KEY라고 적는 것입니다. 이렇게 적으면 그 열의 값은 행마다 달라야 하고 비어 있을(NULL) 수 없다고 DB에 약속하는 것이 되어, 약속을 어기는 INSERT는 DB가 거부합니다. 그래서 "id가 1인 행"이라고 하면 언제나 한 행만 가리킵니다. 이 실습은 PRIMARY KEY를 지우거나 두 번째로 넣는 행의 id를 바꿔 가며 같은 SQL을 실행해, DB가 INSERT를 받아들이는지와 UPDATE가 몇 행을 바꾸는지를 봅니다.',
  terms: ['기본 키, 유니크 키, 외래 키', '제약 조건', 'NULL과 3값 논리', '행과 열'],
  controls: [
    { id: 'pk', label: 'id 열에 PRIMARY KEY를 적는다', type: 'check', value: true },
    { id: 'second', label: '두 번째 INSERT에 넣는 id', type: 'select', value: 'same', options: [['same', '두 번째 행의 id를 1로 (첫 행과 같음)'], ['diff', '두 번째 행의 id를 2로'], ['null', '두 번째 행의 id를 비워서 (NULL)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '기본 키는 어떻게 생겼고, 같은 id로 한 번 더 넣으면 무슨 일이 일어나나', d: 'PRIMARY KEY가 있는 테이블. 같은 id로 한 번 더 넣는 INSERT를 DB가 거부합니다.', v: { pk: true, second: 'same' } },
    { t: 'PRIMARY KEY를 지우면', q: 'PRIMARY KEY를 지우면', d: '같은 id의 행이 둘 들어가고, UPDATE가 두 행을 다 고칩니다.', v: { pk: false, second: 'same' } },
    { t: '두 번째 행의 id를 2로 바꾸면', q: '두 번째 행의 id를 2로 바꾸면', d: 'id가 서로 다르면 PRIMARY KEY가 있어도 두 행이 다 들어갑니다.', v: { pk: true, second: 'diff' } },
    { t: 'id를 비워서 넣으면', q: '두 번째 행의 id를 비워서(NULL) 넣으면', d: 'id가 비어 있는 INSERT도 DB가 거부합니다. 같은 id일 때와는 다른 이유입니다.', v: { pk: true, second: 'null' } },
    { t: 'PRIMARY KEY를 지우고 id를 비우면', q: 'PRIMARY KEY를 지우고 id를 비워서 넣으면', d: 'id가 비어 있는 행이 들어가고, id로는 그 행을 가리킬 수 없습니다.', v: { pk: false, second: 'null' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/PkBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  idOf: { same: '1', diff: '2', 'null': 'NULL' },
  code: function (c) {
    var l = ['CREATE TABLE member ('];
    if (c.pk) l.push('    -- 기본 키: 이 열의 값은 행마다 달라야 하고 비어 있을 수 없다');
    l.push('    id   INT' + (c.pk ? ' PRIMARY KEY' : '') + ',', '    name VARCHAR(20)', ');', '',
      "INSERT INTO member VALUES (1, '김철수');",
      "INSERT INTO member VALUES (" + this.idOf[c.second] + ", '이영희');", '',
      "UPDATE member SET name = '박민수' WHERE id = 1;",
      'SELECT * FROM member ORDER BY id;');
    return l.join('\n');
  },
  label: function (c) { return (c.pk ? 'PRIMARY KEY 있음' : 'PRIMARY KEY 없음') + ' · 두 번째 행의 id ' + { same: '1', diff: '2', 'null': 'NULL' }[c.second]; },
  columns: ['두 번째 INSERT', '테이블의 행 수', 'UPDATE로 바뀐 행', '마지막에 남은 행'],
  simulate: function (c) {
    var pk = !!c.pk, sec = c.second, id2 = this.idOf[sec], ev = [], sum = [];
    var verdict = !pk ? 'ok' : sec === 'same' ? 'dup' : sec === 'null' ? 'empty' : 'ok';
    var q2 = "INSERT INTO member VALUES (" + id2 + ", '이영희')";
    // 상태: 들어오려는 문장(inc), DB의 확인 상자(chk), 화살표(flow: in은 문장이 DB에 닿음, pass는 행에 닿음, block은 확인에서 끊김), 표의 행
    var st = { rows: [], log: [], upd: null, inc: null, chk: { cls: 'ghost', sub: [' '] }, flow: '', to: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function cool() { st.rows.forEach(function (r) { r.hot = false; }); st.to = []; }

    // 1. CREATE TABLE
    st.inc = { title: 'CREATE TABLE', sub: ['member (id, name)'] };
    st.chk = pk ? { cls: 'plain', sub: ['같은 id가 있는가', '비어 있는가'] } : { cls: 'ghost', sub: ['확인할 약속 없음'] };
    st.log.push(['CREATE TABLE member', '테이블이 만들어짐', '']);
    push('CREATE TABLE: DB가 member라는 테이블을 만듭니다. 테이블은 표처럼 열(id와 name)과 행(한 사람의 정보 한 줄)으로 이루어지고, 지금은 행이 하나도 없습니다. ' + (pk ? 'id 열에 PRIMARY KEY가 적혀 있으므로, DB는 "이 열의 값은 행마다 달라야 하고 비어 있을 수 없다"는 약속을 기억해 둡니다.' : 'id 열에는 INT(정수)라는 타입만 적었으므로, DB가 기억해 둘 약속이 없습니다.'), '');

    // 2. 첫 번째 INSERT
    cool();
    st.inc = { title: 'INSERT', sub: ["(1, 김철수)"] };
    st.rows.push({ id: '1', name: '김철수', hot: true, bad: false });
    st.chk = pk ? { cls: 'good', sub: ['같은 id가 있는가', '비어 있는가'] } : { cls: 'ghost', sub: ['확인할 약속 없음'] };
    st.flow = 'pass'; st.to = [0];
    st.log.push(["INSERT (1, 김철수)", '들어감', 'good']);
    push("INSERT INTO member VALUES (1, '김철수'): " + (pk ? 'DB가 행을 넣기 전에 약속을 확인합니다. 테이블이 비어 있어 같은 id가 없고 id도 비어 있지 않으므로 통과하고, 김철수 행이 들어갑니다.' : 'DB가 id 1, 김철수 행을 테이블에 넣습니다. 확인할 약속이 없으므로 그대로 들어갑니다.'), '');

    // 3. 두 번째 INSERT
    cool();
    st.inc = { title: 'INSERT', sub: ["(" + id2 + ", 이영희)"] };
    var res2 = verdict === 'ok' ? '들어감' : verdict === 'dup' ? '거부됨: 같은 id가 이미 있음' : '거부됨: id를 비울 수 없음';
    if (pk) {
      st.chk = { cls: 'hot now', sub: ['같은 id가 있는가', '비어 있는가'] }; st.flow = 'in';
      push(q2 + ': 두 번째 행을 넣으려 합니다. DB는 행을 넣기 전에 기본 키의 약속을 확인합니다. ' + (sec === 'null' ? 'id가 비어 있지 않은지, 같은 id의 행이 이미 있는지를 봅니다.' : '테이블에 id가 ' + id2 + '인 행이 이미 있는지, id가 비어 있지 않은지를 봅니다.') + ' 이 확인을 하는 코드를 우리는 쓰지 않았습니다. DB가 INSERT가 올 때마다 스스로 합니다.', '');
      if (verdict === 'ok') {
        st.rows.push({ id: id2, name: '이영희', hot: true, bad: false }); st.chk = { cls: 'good', sub: ['같은 id가 있는가', '비어 있는가'] }; st.flow = 'pass'; st.to = [1];
        st.log.push([q2.replace('INSERT INTO member VALUES ', 'INSERT '), res2, 'good']);
        push('DB의 확인 결과: id가 2인 행은 아직 없고 id도 비어 있지 않아 약속을 지키므로 통과합니다. 이영희 행이 들어갔고, 테이블의 행은 2개가 되었습니다.', 'good');
      } else {
        st.chk = { cls: 'bad', sub: ['같은 id가 있는가', '비어 있는가'] }; st.flow = 'block';
        st.log.push([q2.replace('INSERT INTO member VALUES ', 'INSERT '), res2, 'bad']);
        push(verdict === 'dup'
          ? 'DB의 확인 결과: 테이블에 id가 1인 행(김철수)이 이미 있습니다. 약속을 어기므로 DB는 이 INSERT를 거부하고, "같은 값이 이미 있다"는 종류의 오류를 돌려줍니다. 이영희 행은 테이블에 들어가지 않았고, 테이블은 INSERT 전 그대로입니다.'
          : 'DB의 확인 결과: id가 비어 있습니다(NULL). 기본 키 열은 비어 있을 수 없으므로 DB는 이 INSERT를 거부하고, "이 열은 비울 수 없다"는 종류의 오류를 돌려줍니다. 같은 id일 때와는 다른 종류의 오류입니다. 이영희 행은 들어가지 않았고, 테이블은 INSERT 전 그대로입니다.', 'good');
      }
    } else {
      st.rows.push({ id: id2, name: '이영희', hot: true, bad: false }); st.flow = 'pass'; st.to = [1];
      st.log.push([q2.replace('INSERT INTO member VALUES ', 'INSERT '), res2, 'good']);
      push(q2 + ': DB가 확인할 약속이 없으므로 그대로 이영희 행을 넣습니다. ' + (sec === 'same' ? 'id가 1인 행이 이제 둘(김철수, 이영희)입니다.' : sec === 'diff' ? 'id가 서로 다른 두 행이 되었습니다.' : 'id가 비어 있는(NULL) 행이 들어갔습니다.'), '');
    }
    var count = st.rows.length;

    // 4. UPDATE
    cool();
    var hit = []; st.rows.forEach(function (r, i) { if (r.id === '1') hit.push(i); });
    hit.forEach(function (i) { st.rows[i].name = '박민수'; st.rows[i].hot = true; });
    st.to = hit.slice(); st.flow = 'pass'; st.upd = hit.length;
    st.inc = { title: 'UPDATE', sub: ['name = 박민수', 'WHERE id = 1'] };
    st.chk = { cls: 'hot now', sub: ['id가 1인 행을', '모두 찾는다'] };
    st.log.push(['UPDATE ... WHERE id = 1', hit.length + '행이 바뀜', hit.length > 1 ? 'bad' : 'good']);
    push("UPDATE member SET name = '박민수' WHERE id = 1: 우리가 하려는 일은 id가 1인 한 사람의 이름을 고치는 것입니다. DB는 WHERE 조건에 맞는 행을 모두 찾아 고칩니다. " + (hit.length === 1 ? 'id가 1인 행은 하나뿐이므로 그 행의 이름이 박민수로 바뀝니다. 바뀐 행은 1행입니다.' + (count > 1 ? ' 이영희 행은 조건에 맞지 않아 그대로입니다.' : '') : 'id가 1인 행이 김철수와 이영희 둘이므로 DB는 두 행을 다 고칩니다. 바뀐 행은 2행입니다. 한 사람만 고치려 했지만 id가 같은 두 행은 id로 구별할 수 없어서 둘 다 바뀌었습니다.'), hit.length > 1 ? 'bad' : 'good');

    // 5. SELECT
    cool();
    var sorted = st.rows.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) { var x = a.r.id === 'NULL' ? -1 : +a.r.id, y = b.r.id === 'NULL' ? -1 : +b.r.id; return x - y || a.i - b.i; }).map(function (o) { return o.r; });
    var finalText = sorted.map(function (r) { return '(' + r.id + ', ' + r.name + ')'; }).join(', ');
    var ids = {}; st.rows.forEach(function (r) { ids[r.id] = (ids[r.id] || 0) + 1; });
    var anyBad = false;
    st.rows.forEach(function (r) { r.bad = r.id === 'NULL' || ids[r.id] > 1; if (r.bad) anyBad = true; });
    st.inc = { title: 'SELECT', sub: ['ORDER BY id'] };
    st.chk = { cls: 'plain', sub: ['남은 행을', 'id 순으로 읽는다'] }; st.flow = 'in';
    st.log.push(['SELECT * ... ORDER BY id', finalText, anyBad ? 'bad' : 'good']);
    var after = pk
      ? (sec === 'diff' ? 'id 1과 2는 각각 한 행만 가리킵니다. UPDATE는 id가 1인 행만 고쳤고 이영희 행은 그대로입니다.' : '남은 것은 id가 1인 한 행입니다. 이영희 행은 거부되어 들어가지 않았고, 김철수 행의 이름이 박민수로 바뀌었습니다. "id가 1인 행"은 언제나 이 한 행입니다.')
      : (sec === 'same' ? 'id가 1이고 이름이 박민수인 행이 둘입니다. 이영희라는 이름은 사라졌고, id로는 두 행을 구별할 수 없습니다.' : sec === 'diff' ? 'PRIMARY KEY가 있을 때와 같은 결과입니다. 다만 id가 다른 것은 DB가 지켜 준 것이 아니라 우리가 다르게 넣었기 때문입니다. 같은 id를 넣었다면 DB는 그대로 받아들였을 것입니다.' : 'id가 비어 있는 행(이영희)이 맨 앞에 나옵니다. ORDER BY id에서는 비어 있는 값이 가장 앞에 옵니다. 이 행은 id가 없어서 WHERE id = 1에 맞지 않았고, 그래서 UPDATE가 건드리지 않았습니다.');
    push('SELECT * FROM member ORDER BY id: 테이블에 남은 행을 id 순으로 읽습니다. 결과는 ' + finalText + '입니다. ' + after, anyBad ? 'bad' : 'good');

    // 6. (PRIMARY KEY 없음, id 비움) 비어 있는 id는 찾을 수도 없다. 이 코드에는 없는 문장을 따로 실행한 결과
    if (!pk && sec === 'null') {
      cool();
      st.inc = { title: 'SELECT', sub: ['COUNT(*) WHERE', 'id = NULL'] };
      st.chk = { cls: 'plain', sub: ['결과는 0'] }; st.flow = 'in';
      push('참고로 이 코드에는 없는 문장을 따로 실행해 봅니다. SELECT COUNT(*) FROM member WHERE id = NULL은 0을 돌려줍니다. NULL은 "값이 없음"이라서 = 로 비교해서는 찾을 수 없습니다. id가 비어 있는 행은 WHERE id IS NULL이라고 따로 써야 고를 수 있는데, 이 조건은 id가 비어 있는 행을 모두 고릅니다. id가 비어 있는 행을 하나 더 넣어도 DB가 막지 않으므로, 이 방법으로도 한 행만 가리킬 수는 없습니다.', 'bad');
    }

    // 요약: 첫 줄은 물음의 답
    var S = {
      'true|same': ['기본 키는 테이블을 만들 때 열 하나에 PRIMARY KEY라고 적는 것입니다. 그 열의 값은 행마다 달라야 하고 비어 있을 수 없다고 DB에 약속하는 것이고, 같은 id로 한 번 더 넣는 INSERT는 DB가 거부했습니다.', '확인하는 코드는 우리가 쓰지 않았고 DB가 INSERT마다 스스로 확인했습니다. 그래서 "id가 1인 행"은 언제나 한 행이고, 그 id로 하는 UPDATE는 한 사람만 고칩니다.'],
      'false|same': ['PRIMARY KEY를 지우면 DB는 같은 id의 두 번째 INSERT를 거부하지 않습니다. id가 1인 행이 둘이 되어, WHERE id = 1인 UPDATE가 두 행을 다 고쳤습니다.', 'id가 같은 행은 id로 구별할 수 없어서, 한 사람만 고치려 해도 id로는 한 행만 골라 고칠 수 없습니다. 약속을 적어 두지 않으면 DB는 지켜 주지 않습니다.'],
      'true|diff': ['두 번째 행의 id를 2로 바꾸면 PRIMARY KEY가 있어도 INSERT가 들어갑니다. 기본 키는 id를 서로 다르게 하라는 약속이지 INSERT를 막는 것이 아닙니다.', '두 행의 id가 다르므로 id가 1인 행은 하나뿐이었고, UPDATE는 그 한 행만 고쳤습니다.'],
      'false|diff': ['PRIMARY KEY가 없어도 id를 서로 다르게 넣으면 결과는 있을 때와 같습니다.', '다른 점은 id가 다른 것을 DB가 지켜 준 것이 아니라 우리가 다르게 넣었을 뿐이라는 것입니다. 같은 id를 넣으면 PRIMARY KEY가 없는 테이블은 그대로 받아들입니다.'],
      'true|null': ['id를 비워서(NULL) 넣는 INSERT도 DB가 거부했습니다. 기본 키 열은 비어 있을 수 없기 때문이고, 같은 id일 때와는 다른 종류의 오류였습니다.', '기본 키는 id가 겹치는 것과 비어 있는 것을 둘 다 막습니다. 그래서 테이블에 남는 행은 모두 id가 있고, id로 행 하나를 가리킬 수 있습니다.'],
      'false|null': ['PRIMARY KEY를 지우면 id를 비운 행도 들어갑니다. 이 행은 WHERE id = 1로도, id = NULL로도 찾을 수 없습니다.', 'id가 비어 있는 행은 IS NULL이라고 따로 써야 고를 수 있고, 그런 행이 여럿 들어와도 DB가 막지 않아 id로 한 행만 가리킬 수 없습니다.']
    };
    S[pk + '|' + sec].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, row: [res2, count + '행', hit.length + '행', finalText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 CREATE TABLE부터 한 문장씩 진행합니다.'); return; }
    H.table(v, ['id', 'name'], s.rows.length ? s.rows.map(function (r) { var k = r.bad ? 'bad' : r.hot ? 'hot' : ''; return { cls: '', cells: [{ v: r.id, cls: k }, { v: r.name, cls: k }] }; }) : [{ cls: 'gone', cells: ['행 없음', ''] }], 'member 테이블');
    H.table(v, ['실행한 문장', '결과'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), '문장과 결과');
    H.counters(v, [[s.rows.length, '테이블의 행 수'], [s.upd === null ? '-' : s.upd, 'UPDATE로 바뀐 행']]);
  },
  // 그림: 왼쪽에 들어오려는 문장, 가운데에 DB의 확인, 오른쪽에 member 테이블의 행. 확인을 통과해야 행에 닿고, 거부되면 화살표가 확인에서 끊긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.text('lb', 89, 62, '들어오는 SQL 문장', { cls: 'mut', anchor: 'middle' });
    P.box('in', 14, 73, 150, 70, { cls: !s || !s.inc ? 'ghost' : s.flow === 'block' ? 'wait' : 'hot', title: s && s.inc ? s.inc.title : '대기', sub: s && s.inc ? s.inc.sub : [' '] });
    P.box('chk', 214, 60, 200, 96, { cls: s ? s.chk.cls : 'ghost', title: 'DB의 확인', sub: s ? s.chk.sub : [' '] });
    P.region('tb', 464, 16, 202, 208, 'member 테이블');
    if (s && s.flow) P.arrow('rq', 'in:r', 'chk:l', { cls: s.flow === 'block' ? 'bad' : 'hot' });
    if (s && s.rows.length === 0) P.text('emp', 565, 126, '행이 없습니다', { cls: 'mut', anchor: 'middle' });
    (s ? s.rows : []).forEach(function (r, i) {
      P.box('r' + i, 476, 50 + i * 56, 178, 40, { cls: r.bad ? 'bad' : r.hot ? 'hot' : 'wait', title: 'id ' + r.id + ' · ' + r.name });
      if (s.flow === 'pass' && s.to.indexOf(i) >= 0) P.arrow('ar' + i, 'chk:r', 'r' + i + ':l', { cls: 'good' });
    });
    if (s && s.flow === 'block') { P.arrow('stop', 'chk:r', [442, 108], { cls: 'bad' }); P.text('x', 452, 113, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    P.box('n1', 14, 242, 322, 36, { cls: s && s.rows.length ? 'wait' : 'ghost', title: '테이블의 행 수', right: (s ? s.rows.length : 0) + '행' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.upd !== null ? (s.upd > 1 ? 'bad' : 'good') : 'ghost', title: 'UPDATE로 바뀐 행', right: s && s.upd !== null ? s.upd + '행' : '-' });
    if (s && s.rows.some(function (r) { return r.bad; })) P.note('빨간 상자는 id가 같거나 비어 있어서, id로는 한 행만 가리킬 수 없는 행입니다.');
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했습니다. 여섯 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 글자 그대로 한 문장씩 실행해서, 두 번째 INSERT가 들어갔는지 거부됐는지와 오류의 종류(H2의 SQLSTATE 23505 중복, 23502 NULL 불가), INSERT 두 번 뒤의 행 수, UPDATE가 돌려준 바뀐 행 수, 마지막 SELECT 결과를 모형과 대조했습니다. 마지막에 id를 비운 행을 찾는 단계의 값(id = NULL은 0행, id IS NULL은 비어 있는 행 전부)은 화면 코드에 없는 문장을 H2에서 따로 실행해 확인했습니다. 기본 키가 같은 값과 NULL을 받지 않는다는 규칙은 MySQL도 같으며, MySQL 8.4 문서의 CREATE TABLE 문(PRIMARY KEY는 모든 키 열이 NOT NULL인 고유 인덱스), 1.7.3.1절 PRIMARY KEY and UNIQUE Index Constraints(기본 키나 유니크 키를 어기는 INSERT와 UPDATE는 오류), 5.3.4.6절 Working with NULL Values(NULL은 =로 비교할 수 없고 IS NULL을 쓰며, ORDER BY의 ASC에서는 NULL이 맨 앞)를 직접 열어 확인했습니다. 오류의 번호와 메시지의 글자는 DB마다 다르므로 화면에는 종류만 적었습니다. MySQL에서의 실행 대조는 아직 하지 않았습니다. 그래서 위 규칙은 문서와 H2 실행이 일치한다는 근거이고, MySQL이 같은 SQL에서 같은 결과를 내는지는 실행으로 확인하지 않았습니다. PRIMARY KEY가 없는 테이블이 같은 id나 NULL을 받아들이는 것은 H2에서 관찰한 동작입니다. 이 실습은 PRIMARY KEY 하나만 다루며, 유니크 키, 외래 키, 자동 증가(AUTO_INCREMENT)는 다루지 않습니다.',
});
