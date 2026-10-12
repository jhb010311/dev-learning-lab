Lab.register({
  id: 'table_basic', nav: '테이블, 행, 열', cat: '기초개념', mode: 'step', basic: true, deep: ['constraints'],
  title: '테이블은 어떻게 생겼고, 행과 열은 무엇인가',
  intro: '관계형 데이터베이스는 데이터를 테이블(표)에 담습니다. CREATE TABLE은 표를 만들면서 열(세로 칸)을 정하는 문장이고, 열마다 이름과 타입이 있어서 "id 칸에는 정수, name 칸에는 글자"처럼 무엇을 담을지가 정해집니다. INSERT는 행(가로 한 줄, 한 사람의 정보)을 하나 넣는 문장이고, 행은 열의 개수와 타입에 맞아야 합니다. SELECT는 행들에서 고른 열의 값을 읽어 오는 문장입니다. 이 실습은 CREATE TABLE을 지우거나 둘째 행의 모양, 읽는 열을 바꿔 가며 같은 SQL을 실행해, DB가 어느 문장을 받아들이고 어느 문장을 거부하는지를 봅니다.',
  terms: ['테이블', '행과 열', '열의 데이터 타입', 'CREATE TABLE, INSERT, SELECT'],
  controls: [
    { id: 'create', label: 'CREATE TABLE 문이 있다', type: 'check', value: true },
    { id: 'second', label: '둘째 INSERT에 넣는 행', type: 'select', value: 'ok', options: [['ok', "둘째 행: (2, '이영희')"], ['text', "둘째 행: ('둘', '이영희') id 칸에 글자"], ['more', "둘째 행: (2, '이영희', 30) 값이 세 개"], ['less', '둘째 행: (2) 값이 하나']] },
    { id: 'col', label: 'SELECT가 읽는 열', type: 'select', value: 'name', options: [['name', 'SELECT name FROM member'], ['age', 'SELECT age FROM member (없는 열)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '테이블은 어떻게 생겼고, 행을 넣고 읽으면 무슨 일이 일어나나', d: '열 두 개짜리 member 테이블에 행 두 개를 넣고 name 열을 읽습니다. 두 INSERT가 모두 열에 맞아 들어갑니다.', v: { create: true, second: 'ok', col: 'name' } },
    { t: 'CREATE TABLE을 지우면', q: 'CREATE TABLE을 지우면', d: 'member 테이블이 없어서 INSERT도 SELECT도 오류가 납니다.', v: { create: false, second: 'ok', col: 'name' } },
    { t: "id 칸에 글자 '둘'을 넣으면", q: "id 칸에 글자 '둘'을 넣으면", d: 'id 칸의 타입은 정수라서 DB가 둘째 INSERT를 거부합니다.', v: { create: true, second: 'text', col: 'name' } },
    { t: '값을 세 개 넣으면', q: '열이 둘인데 값을 세 개 넣으면', d: '값의 개수가 열의 개수와 달라서 DB가 둘째 INSERT를 거부합니다.', v: { create: true, second: 'more', col: 'name' } },
    { t: '없는 열 age를 읽으면', q: '없는 열 age를 읽으면', d: '행은 둘 다 들어가지만, member 테이블에 없는 열을 읽으려 해서 SELECT가 오류를 냅니다.', v: { create: true, second: 'ok', col: 'age' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/TableBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  row2: { ok: "(2, '이영희')", text: "('둘', '이영희')", more: "(2, '이영희', 30)", less: '(2)' },
  sub2: { ok: '(2, 이영희)', text: '(둘, 이영희)', more: '(2, 이영희, 30)', less: '(2)' },
  code: function (c) {
    var l = [];
    if (c.create) l.push('-- 테이블: member라는 표를 만들고, 열 두 개(id, name)를 정한다', 'CREATE TABLE member (', '    id   INT,', '    name VARCHAR(20)', ');', '');
    l.push('-- 행: 한 사람의 정보 한 줄을 넣는다', "INSERT INTO member VALUES (1, '김철수');", 'INSERT INTO member VALUES ' + this.row2[c.second] + ';', '', 'SELECT ' + c.col + ' FROM member;');
    return l.join('\n');
  },
  label: function (c) { return (c.create ? 'CREATE TABLE 있음' : 'CREATE TABLE 없음') + ' · 둘째 행 ' + this.sub2[c.second] + ' · SELECT ' + c.col; },
  columns: ['둘째 INSERT', '테이블의 행 수', 'SELECT 결과'],
  simulate: function (c) {
    var cr = !!c.create, sec = c.second, col = c.col, ev = [], sum = [], sub2 = this.sub2[sec];
    var q2 = 'INSERT INTO member VALUES ' + this.row2[sec];
    var okIns = cr && sec === 'ok';
    var res2 = !cr ? '거부됨: member 테이블이 없음' : sec === 'ok' ? '들어감' : sec === 'text' ? '거부됨: id 칸에는 정수만 담을 수 있음' : '거부됨: 값의 개수가 열의 개수와 다름';
    var CH = ['개수와 타입이', '열에 맞는가'];
    // 상태: 들어오려는 문장(inc), DB의 확인 상자(chk), 화살표(flow: in은 문장이 DB에 닿음, pass는 행에 닿음, block은 확인에서 끊김, read는 열을 읽음), 표의 행
    var st = { made: false, rows: [], log: [], inc: null, chk: { cls: 'ghost', title: 'DB', sub: [' '] }, flow: '', to: [], hotCol: '', rd: null, miss: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function cool() { st.rows.forEach(function (r) { r.hot = false; }); st.to = []; st.hotCol = ''; }

    if (cr) {
      // 1. CREATE TABLE
      st.made = true;
      st.inc = { title: 'CREATE TABLE', sub: ['member', '(id, name)'] };
      st.chk = { cls: 'plain', title: 'DB가 기억', sub: ['열의 이름과', '타입'] }; st.flow = 'in';
      st.log.push(['CREATE TABLE member', '표가 만들어짐', 'good']);
      push('CREATE TABLE: DB가 member라는 빈 표를 만들고, 열의 이름과 타입을 기억합니다. 열은 id(INT, 정수를 담는 칸)와 name(VARCHAR(20), 글자를 담는 칸) 두 개이고, 행은 아직 하나도 없습니다.', '');

      // 2. 첫 번째 INSERT
      cool();
      st.inc = { title: 'INSERT', sub: ['(1, 김철수)'] };
      st.rows.push({ id: '1', name: '김철수', hot: true });
      st.chk = { cls: 'good', title: 'DB의 확인', sub: CH }; st.flow = 'pass'; st.to = [0];
      st.log.push(['INSERT (1, 김철수)', '들어감', 'good']);
      push("INSERT INTO member VALUES (1, '김철수'): 값 두 개가 열 두 개에 차례로 들어갑니다. 첫째 값 1은 id 열에, 둘째 값 '김철수'는 name 열에 들어가고, 이렇게 채워진 한 줄이 행 하나입니다. 지금 테이블의 행은 1개입니다.", '');

      // 3. 두 번째 INSERT: 확인
      cool();
      st.inc = { title: 'INSERT', sub: [sub2] };
      st.chk = { cls: 'hot now', title: 'DB의 확인', sub: CH }; st.flow = 'in';
      var look = sec === 'ok' ? '값은 두 개이고 2는 정수, \'이영희\'는 글자이므로 열 두 개와 타입이 모두 맞습니다.'
        : sec === 'text' ? "값은 두 개이지만, id 칸에 들어갈 첫째 값은 정수가 아니라 글자 '둘'입니다."
        : sec === 'more' ? '값이 세 개인데 열은 두 개뿐입니다.' : '값이 하나뿐인데 열은 두 개입니다.';
      push(q2 + ': 두 번째 행을 넣으려 합니다. DB는 행을 넣기 전에 값의 개수가 열의 개수와 같은지, 각 값이 그 열의 타입(id 칸에는 정수, name 칸에는 글자)에 맞는지 확인합니다. 이 확인을 하는 코드를 우리는 쓰지 않았습니다. DB가 INSERT가 올 때마다 스스로 합니다. ' + look, '');

      // 4. 두 번째 INSERT: 결과
      if (okIns) {
        st.rows.push({ id: '2', name: '이영희', hot: true });
        st.chk = { cls: 'good', title: 'DB의 확인', sub: CH }; st.flow = 'pass'; st.to = [1];
        st.log.push(['INSERT ' + sub2, res2, 'good']);
        push('DB의 확인 결과: 통과입니다. 이영희 행이 들어갔고, 테이블의 행은 2개가 되었습니다.', 'good');
      } else {
        st.chk = { cls: 'bad', title: 'DB의 확인', sub: CH }; st.flow = 'block';
        st.log.push(['INSERT ' + sub2, res2, 'bad']);
        push(sec === 'text'
          ? "DB의 확인 결과: 글자 '둘'은 id 열의 타입인 INT(정수)로 바꿀 수 없습니다. DB는 이 INSERT를 거부하고, \"값을 열의 타입으로 바꿀 수 없다\"는 종류의 오류를 돌려줍니다. 이영희 행은 들어가지 않았고, 테이블은 INSERT 전 그대로 행 1개입니다."
          : sec === 'more'
            ? 'DB의 확인 결과: 값은 세 개인데 열은 두 개라서 개수가 맞지 않습니다. 30을 넣을 열이 없습니다. DB는 이 INSERT를 거부하고, "값의 개수가 열의 개수와 맞지 않다"는 종류의 오류를 돌려줍니다. 이영희 행은 들어가지 않았고, 테이블은 INSERT 전 그대로 행 1개입니다.'
            : 'DB의 확인 결과: 값은 하나뿐인데 열은 두 개라서 개수가 맞지 않습니다. DB는 모자라는 열을 비워 두고 받아 주지 않고, 이 INSERT를 거부하며 "값의 개수가 열의 개수와 맞지 않다"는 종류의 오류를 돌려줍니다. 이영희 행은 들어가지 않았고, 테이블은 INSERT 전 그대로 행 1개입니다.', 'good');
      }
    } else {
      // 1. CREATE TABLE이 없다
      push('이 코드에는 CREATE TABLE 문이 없습니다. DB는 member라는 표를 만든 적이 없어서, 표도 열의 이름과 타입도 기억하고 있지 않습니다.', 'bad');

      // 2. 첫 번째 INSERT
      st.inc = { title: 'INSERT', sub: ['(1, 김철수)'] };
      st.chk = { cls: 'bad', title: 'DB의 확인', sub: ['member 표가', '있는가'] }; st.flow = 'block';
      st.log.push(['INSERT (1, 김철수)', '거부됨: member 테이블이 없음', 'bad']);
      push("INSERT INTO member VALUES (1, '김철수'): DB가 값을 넣을 member 표를 찾지만 없습니다. 값 두 개를 놓을 열도 없으므로 DB는 이 INSERT를 거부하고, \"그런 테이블이 없다\"는 종류의 오류를 돌려줍니다. 한 문장이 실패해도 다음 문장은 계속 실행합니다.", 'bad');

      // 3. 두 번째 INSERT
      st.inc = { title: 'INSERT', sub: [sub2] };
      st.log.push(['INSERT ' + sub2, res2, 'bad']);
      push(q2 + ': DB는 이번에도 member 표를 찾지 못해 거부합니다. ' + (sec === 'ok' ? '값 (2, \'이영희\')는 열에 맞는 모양이지만, 표가 없어서 넣을 곳이 없습니다.'
        : sec === 'text' ? "id 칸에 글자를 넣는 INSERT이지만, 타입을 따질 id 칸이 없어서 타입 오류가 아니라 \"그런 테이블이 없다\"는 오류가 납니다."
        : '값의 개수가 열의 개수와 맞는지 따지려 해도 열이 없어서, 개수 오류가 아니라 "그런 테이블이 없다"는 오류가 납니다.') + ' 값이 열에 맞는지는 표가 있어야 확인할 수 있습니다.', 'bad');
    }

    // 마지막. SELECT
    cool();
    var names = st.rows.map(function (r) { return r.name; }).join(', ');
    var selText;
    st.inc = { title: 'SELECT', sub: [col] };
    if (!cr) {
      st.chk = { cls: 'bad', title: 'DB의 확인', sub: ['member 표가', '있는가'] }; st.flow = 'block'; st.rd = 'err';
      selText = '오류: member 테이블이 없음';
      st.log.push(['SELECT ' + col, selText, 'bad']);
      push('SELECT ' + col + ' FROM member: DB가 member 표를 찾지만 없어서 오류를 돌려줍니다. ' + (col === 'name' ? 'name은 CREATE TABLE이 있었다면 읽을 수 있는 열 이름이지만, 표가 없으면 읽을 곳이 없습니다.' : '표가 없으면 age라는 열이 있는지 따지기도 전에 막혀서, "그런 열이 없다"가 아니라 "그런 테이블이 없다"는 오류가 납니다.'), 'bad');
    } else if (col === 'age') {
      st.chk = { cls: 'bad', title: 'DB의 확인', sub: ['age 열이', '있는가'] }; st.flow = 'block'; st.rd = 'err'; st.miss = true;
      selText = '오류: age라는 열이 없음';
      st.log.push(['SELECT age', selText, 'bad']);
      push('SELECT age FROM member: DB가 member 표의 열 중에서 age를 찾습니다. CREATE TABLE에서 정한 열은 id와 name뿐이므로 age를 찾지 못하고, "그런 열이 없다"는 종류의 오류를 돌려줍니다. 테이블의 행 ' + st.rows.length + '개는 그대로입니다.', 'bad');
    } else {
      st.rows.forEach(function (r) { r.hot = true; });
      st.hotCol = 'name'; st.chk = { cls: 'good', title: 'DB가 읽기', sub: ['모든 행에서', 'name 열만'] }; st.flow = 'read'; st.rd = st.rows.length;
      selText = names;
      st.log.push(['SELECT name', selText, 'good']);
      push('SELECT name FROM member: DB가 테이블의 모든 행에서 name 열의 값만 읽어 돌려줍니다. id 열은 읽지 않습니다. 읽은 행은 ' + st.rows.length + '개이고 결과는 ' + names + '입니다.' + (okIns ? '' : ' 거부된 INSERT의 행은 테이블에 없으므로 읽히지 않았습니다.'), 'good');
    }

    // 요약: 첫 줄은 물음의 답
    if (!cr) {
      sum.push('CREATE TABLE이 없으면 DB에는 member라는 테이블이 없어서 INSERT도 SELECT도 오류가 납니다. 테이블은 CREATE TABLE로 먼저 만들어야 쓸 수 있습니다.');
      sum.push(sec === 'ok' ? '둘째 INSERT의 값은 열에 맞는 모양이었지만 넣을 표가 없어 거부되었습니다.' + (col === 'age' ? '' : ' SELECT name의 name도 알맞은 열 이름이지만 표가 없으면 읽을 수 없습니다.')
        : '둘째 INSERT의 값은 ' + (sec === 'text' ? '타입이 맞지 않는 모양' : '개수가 맞지 않는 모양') + '이었지만, 그 오류가 아니라 표가 없다는 오류가 났습니다. 값이 열에 맞는지는 표가 있어야 확인할 수 있습니다.');
      if (col === 'age') sum[1] += ' SELECT age도 열이 없다는 오류가 아니라 표가 없다는 오류가 났습니다.';
    } else {
      if (sec === 'ok' && col === 'name') {
        sum.push('테이블은 열(세로 칸)과 행(가로 한 줄)으로 이루어진 표입니다. CREATE TABLE이 열의 이름과 타입(id는 정수, name은 글자)을 정하고, INSERT가 행을 하나씩 넣고, SELECT가 행들에서 고른 열의 값을 읽어 옵니다.');
        sum.push('INSERT마다 값의 개수와 타입이 열에 맞는지 확인하는 코드를 우리는 쓰지 않았고 DB가 스스로 했습니다. 두 INSERT가 모두 맞아 행이 2개가 되었고, SELECT name은 두 행의 name 값만 읽었습니다.');
      } else if (sec === 'ok') {
        sum.push('SELECT age는 오류입니다. member 테이블의 열은 CREATE TABLE에서 정한 id와 name뿐이고 age라는 열이 없기 때문입니다.');
        sum.push('두 INSERT는 모두 들어가 행은 2개 그대로입니다. 읽기가 실패했을 뿐 테이블의 내용은 바뀌지 않았습니다. 테이블에 없는 열은 읽을 수 없습니다.');
      } else {
        sum.push(sec === 'text' ? "id 칸에 글자 '둘'을 넣는 INSERT는 DB가 거부합니다. id 열의 타입이 INT(정수)라서 글자는 담을 수 없기 때문입니다."
          : sec === 'more' ? '열이 둘인데 값을 세 개 넣는 INSERT는 DB가 거부합니다. 값은 열에 하나씩 들어가야 하는데 셋째 값을 넣을 열이 없기 때문입니다.'
            : '열이 둘인데 값을 하나만 넣는 INSERT는 DB가 거부합니다. 값의 개수가 열의 개수와 같아야 하고, 모자라는 열을 비워 두고 받아 주지는 않았습니다.');
        sum.push(col === 'name' ? '거부된 INSERT는 행을 만들지 않아 테이블에는 김철수 행 하나만 남았고, SELECT name도 그 한 행의 값만 읽었습니다. 열의 개수와 타입은 CREATE TABLE에서 정해지고, 행은 거기에 맞아야 합니다.'
          : '거부된 INSERT는 행을 만들지 않아 테이블에는 김철수 행 하나만 남았습니다. 이 설정의 SELECT age는 age라는 열이 테이블에 없어서 따로 오류가 납니다.');
      }
    }
    var cnt = !cr ? '테이블 없음' : st.rows.length + '행';
    return { events: ev, summary: sum, row: [res2, cnt, selText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 첫 문장부터 한 문장씩 진행합니다.'); return; }
    H.table(v, ['id', 'name'], s.made ? (s.rows.length ? s.rows.map(function (r) { var k = r.hot ? 'hot' : ''; return { cls: '', cells: [{ v: r.id, cls: s.hotCol === 'name' ? '' : k }, { v: r.name, cls: k }] }; }) : [{ cls: 'gone', cells: ['행 없음', ''] }]) : [{ cls: 'gone', cells: ['테이블 없음', ''] }], 'member 테이블');
    H.table(v, ['실행한 문장', '결과'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), '문장과 결과');
    H.counters(v, [[s.made ? s.rows.length : '표 없음', '테이블의 행 수'], [s.rd === null ? '-' : s.rd === 'err' ? '오류' : s.rd, 'SELECT로 읽은 행']]);
  },
  // 그림: 왼쪽에 들어오려는 문장, 가운데에 DB의 확인, 오른쪽에 member 테이블(위에 열 이름과 타입, 아래에 행들). 확인을 통과해야 행에 닿고, 거부되면 화살표가 확인에서 끊긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.text('lb', 79, 62, '들어오는 SQL 문장', { cls: 'mut', anchor: 'middle' });
    P.box('in', 14, 73, 130, 70, { cls: !s || !s.inc ? 'ghost' : s.flow === 'block' ? 'wait' : 'hot', title: s && s.inc ? s.inc.title : '대기', sub: s && s.inc ? s.inc.sub : [' '] });
    P.box('chk', 194, 60, 110, 96, { cls: s ? s.chk.cls : 'ghost', title: s ? s.chk.title : 'DB', sub: s ? s.chk.sub : [' '] });
    P.region('tb', 354, 16, 312, 208, s && !s.made ? 'member 테이블: 없음' : 'member 테이블');
    if (s && s.made) {
      P.box('h0', 364, 46, 88, 44, { cls: 'plain', title: 'id', sub: 'INT' });
      P.box('h1', 458, 46, 198, 44, { cls: s.hotCol === 'name' ? 'hot' : 'plain', title: 'name', sub: 'VARCHAR(20)' });
      if (s.rows.length === 0) P.text('emp', 510, 128, '행이 없습니다', { cls: 'mut', anchor: 'middle' });
    } else if (s) {
      P.text('em1', 510, 112, 'CREATE TABLE이 없어', { cls: 'mut', anchor: 'middle' });
      P.text('em2', 510, 134, 'member 표가 없습니다', { cls: 'mut', anchor: 'middle' });
    }
    if (s && s.flow) P.arrow('rq', 'in:r', 'chk:l', { cls: s.flow === 'block' ? 'bad' : 'hot' });
    (s ? s.rows : []).forEach(function (r, i) {
      P.box('c' + i + '_0', 364, 98 + i * 44, 88, 38, { cls: r.hot && s.hotCol !== 'name' ? 'hot' : 'wait', title: r.id });
      P.box('c' + i + '_1', 458, 98 + i * 44, 198, 38, { cls: r.hot ? 'hot' : 'wait', title: r.name });
      if (s.flow === 'pass' && s.to.indexOf(i) >= 0) P.arrow('ar' + i, 'chk:r', 'c' + i + '_0:l', { cls: 'good' });
    });
    if (s && s.flow === 'read') P.arrow('rd', 'chk:r', 'h0:l', { cls: 'hot' });
    if (s && s.flow === 'block') { P.arrow('stop', 'chk:r', [334, 108], { cls: 'bad' }); P.text('x', 344, 113, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    P.box('n1', 14, 242, 322, 36, { cls: s && s.made && s.rows.length ? 'wait' : 'ghost', title: '테이블의 행 수', right: !s ? '0행' : s.made ? s.rows.length + '행' : '표 없음' });
    P.box('n2', 344, 242, 322, 36, { cls: s && typeof s.rd === 'number' ? 'good' : s && s.rd === 'err' ? 'bad' : 'ghost', title: 'SELECT로 읽은 행', right: !s || s.rd === null ? '-' : s.rd === 'err' ? '오류' : s.rd + '행' });
    if (s && s.miss) P.note('member 테이블의 열은 id와 name뿐입니다. age라는 열은 없어서 읽을 수 없습니다.');
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했습니다. 열여섯 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 글자 그대로 문장 하나씩 따로 실행했고, 한 문장이 실패해도 다음 문장은 계속 실행했습니다. 대조한 것은 둘째 INSERT가 들어갔는지 거부됐는지와 오류의 종류(H2의 SQLSTATE 22018 값을 타입으로 바꿀 수 없음, 21S02 값의 개수가 열의 개수와 다름, 42S04 테이블 없음, 42S22 열 없음), INSERT 두 번 뒤의 행 수, 마지막 SELECT가 읽은 값입니다. CREATE TABLE 직후의 행 수가 0이고 DB가 열의 이름과 타입(id 정수, name 글자 20자)을 기억한다는 것은 메타데이터를 읽어 확인했습니다. 열이 둘인데 값이 하나뿐인 INSERT를 H2는 거부했고, 이것은 문서가 아니라 H2에서 관찰한 동작입니다. MySQL 8.4 문서의 튜토리얼 Creating a Table(CREATE TABLE로 열의 이름과 타입을 정함, VARCHAR는 길이가 달라지는 글자), Loading Data into a Table(INSERT의 값은 CREATE TABLE에서 열을 적은 순서대로 들어감, NULL을 직접 넣을 수 있음), Selecting All Data와 Selecting Particular Columns(SELECT *는 모든 행과 열, 열 이름을 적으면 그 열만), Chapter 13 Data Types의 서두(타입은 숫자, 날짜와 시간, 문자열, 공간, JSON의 다섯 종류)를 직접 열어 확인했습니다. 다만 타입이나 개수가 맞지 않는 INSERT를 거부한다는 규칙은 이 문서들이 정한 것이 아니라 H2의 실행으로 확인한 것입니다. MySQL에서의 실행 대조는 하지 않았습니다. 오류 메시지의 글자와, 맞지 않는 값을 얼마나 엄격하게 거부하는지는 DB와 설정에 따라 다를 수 있습니다. 화면에는 오류의 종류만 적었고 오류 번호와 메시지 원문은 대조 프로그램의 출력에만 있습니다. 이 실습은 INT와 VARCHAR 두 타입만 다루며, 기본 키 같은 제약 조건, 여러 테이블, WHERE 조건은 다루지 않습니다.',
});
