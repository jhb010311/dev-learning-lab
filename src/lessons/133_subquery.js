Lab.register({
  id: 'subquery', nav: '서브쿼리', cat: '데이터베이스', mode: 'step',
  title: 'NOT IN의 결과가 왜 한 행도 없나',
  intro: 'SELECT 문 안에 괄호로 넣은 또 하나의 SELECT를 서브쿼리라고 합니다. 값 하나를 돌려주는 것, 목록을 돌려주는 것(IN), 행이 있는지만 보는 것(EXISTS), 바깥 행마다 다시 실행되는 것(상관 서브쿼리)이 있습니다. 종류마다 결과가 어떻게 나오는지, 그리고 서브쿼리 결과에 NULL이 섞였을 때 NOT IN과 NOT EXISTS가 어떻게 달라지는지 봅니다.',
  terms: ['서브쿼리', '스칼라 서브쿼리', '상관 서브쿼리', 'IN과 EXISTS', 'NULL과 3값 논리'],
  controls: [
    { id: 'kind', label: '서브쿼리의 모양', type: 'select', value: 'notin', options: [['scalar', '값 하나: WHERE id = (SELECT ...)'], ['corr', '상관 서브쿼리: 회원마다 주문 수 세기'], ['in', 'IN (SELECT ...): 주문이 있는 회원'], ['exists', 'EXISTS (SELECT ...): 주문이 있는 회원'], ['notin', 'NOT IN (SELECT ...): 주문이 없는 회원'], ['notexists', 'NOT EXISTS (SELECT ...): 주문이 없는 회원']] },
    { id: 'nul', label: 'member_id가 NULL인 주문(비회원 주문)을 한 건 넣는다', type: 'check', value: true },
    { id: 'pick', label: '서브쿼리가 찾는 상품', type: 'select', value: 'one', options: [['one', "모니터 (주문 1건 → 서브쿼리 결과 1행)"], ['two', "키보드 (주문 2건 → 서브쿼리 결과 2행)"], ['zero', "책상 (주문 없음 → 서브쿼리 결과 0행)"]], show: function (c) { return c.kind === 'scalar'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: 'member_id가 NULL인 주문이 섞인 채 NOT IN 서브쿼리로 주문이 없는 회원을 찾으면 결과가 어떻게 나오나', d: 'NOT IN의 목록에 NULL이 섞여 있습니다. 결과가 0행입니다.', v: { kind: 'notin', nul: true, pick: 'one' } },
    { t: '같은 일을 NOT EXISTS로', q: 'NOT IN 서브쿼리 대신 NOT EXISTS 서브쿼리로 바꾸면', d: 'NULL이 있어도 주문 없는 회원이 제대로 나옵니다.', v: { kind: 'notexists', nul: true, pick: 'one' } },
    { t: 'NULL이 없을 때의 NOT IN', q: 'member_id가 NULL인 주문을 넣지 않고 NOT IN 서브쿼리로 찾으면', d: '기대한 대로 주문 없는 회원 1명이 나옵니다.', v: { kind: 'notin', nul: false, pick: 'one' } },
    { t: '값 하나 자리에 두 행', q: 'member_id가 NULL인 주문을 넣지 않고 값 하나 자리에 서브쿼리를 쓰는 WHERE id = 비교로 키보드를 찾으면', d: '서브쿼리가 2행을 돌려줘 오류 1242가 납니다.', v: { kind: 'scalar', nul: false, pick: 'two' } },
    { t: '값 하나 자리에 0행', q: 'member_id가 NULL인 주문을 넣지 않고 값 하나 자리에 서브쿼리를 쓰는 WHERE id = 비교로 책상을 찾으면', d: '오류 없이 NULL이 되어 결과가 0행입니다.', v: { kind: 'scalar', nul: false, pick: 'zero' } },
    { t: '상관 서브쿼리', q: 'member_id가 NULL인 주문을 넣지 않고 회원마다 주문 수를 세는 상관 서브쿼리로 바꾸면', d: '바깥 행 4개마다 서브쿼리가 다시 실행됩니다.', v: { kind: 'corr', nul: false, pick: 'one' } },
    { t: 'IN과 NULL', q: 'member_id가 NULL인 주문이 있는 채로 NOT IN 서브쿼리를 IN 서브쿼리로 바꿔 주문이 있는 회원을 찾으면', d: 'IN은 목록에 NULL이 있어도 결과가 같습니다.', v: { kind: 'in', nul: true, pick: 'one' } },
  ],
  M: [[1, '김철수'], [2, '이영희'], [3, '박민수'], [4, '최지우']],
  orders: function (c) { var o = [[101, 1, '키보드'], [102, 1, '마우스'], [103, 2, '키보드'], [104, 3, '모니터']]; if (c.nul) o.push([105, null, '의자']); return o; },
  PICK: { one: '모니터', two: '키보드', zero: '책상' },
  CORR: { scalar: false, corr: true, in: false, exists: true, notin: false, notexists: true },
  // 괄호 안의 서브쿼리만 떼어 낸 문장
  inner: function (c) {
    if (c.kind === 'scalar') return "SELECT member_id FROM orders WHERE item = '" + this.PICK[c.pick] + "'";
    if (c.kind === 'corr') return 'SELECT COUNT(*) FROM orders o WHERE o.member_id = m.id';
    if (c.kind === 'in' || c.kind === 'notin') return 'SELECT member_id FROM orders';
    return 'SELECT 1 FROM orders o WHERE o.member_id = m.id';
  },
  sql: function (c) {
    if (c.kind === 'scalar') return "SELECT name\n  FROM member\n WHERE id = (SELECT member_id\n               FROM orders\n              WHERE item = '" + this.PICK[c.pick] + "')\n ORDER BY id";
    if (c.kind === 'corr') return 'SELECT name,\n       (SELECT COUNT(*)\n          FROM orders o\n         WHERE o.member_id = m.id) AS cnt\n  FROM member m\n ORDER BY m.id';
    if (c.kind === 'in' || c.kind === 'notin') { var k = c.kind === 'in' ? 'IN' : 'NOT IN'; return 'SELECT name\n  FROM member\n WHERE id ' + k + ' (SELECT member_id\n' + (c.kind === 'in' ? '                FROM orders)' : '                    FROM orders)') + '\n ORDER BY id'; }
    var e = c.kind === 'exists' ? 'EXISTS' : 'NOT EXISTS', pad = c.kind === 'exists' ? '' : '    ';
    return 'SELECT name\n  FROM member m\n WHERE ' + e + ' (SELECT 1\n' + pad + '                 FROM orders o\n' + pad + '                WHERE o.member_id = m.id)\n ORDER BY m.id';
  },
  // 화면의 코드와 대조 프로그램(verify/mysql/subquery_probe.js)이 함께 쓰는 SQL
  plan: function (c) {
    function lit(x) { return x === null ? 'NULL' : typeof x === 'number' ? String(x) : "'" + x + "'"; }
    function ins(t, cols, rows) { return 'INSERT INTO ' + t + ' (' + cols + ') VALUES\n' + rows.map(function (r) { return '  (' + r.map(lit).join(', ') + ')'; }).join(',\n'); }
    return { ddl: ['CREATE TABLE member (\n  id   INT PRIMARY KEY,\n  name VARCHAR(20) NOT NULL\n)', 'CREATE TABLE orders (\n  id        INT PRIMARY KEY,\n  member_id INT,\n  item      VARCHAR(30) NOT NULL\n)'],
      seed: [ins('member', 'id, name', this.M), ins('orders', 'id, member_id, item', this.orders(c))], query: this.sql(c), inner: this.inner(c) };
  },
  code: function (c) { var p = this.plan(c); return p.ddl.join(';\n') + ';\n\n' + p.seed.join(';\n') + ';\n\n' + p.query + ';'; },
  label: function (c) { return { scalar: '값 하나 (' + this.PICK[c.pick] + ')', corr: '상관 서브쿼리', in: 'IN', exists: 'EXISTS', notin: 'NOT IN', notexists: 'NOT EXISTS' }[c.kind] + ' · ' + (c.nul ? 'NULL 주문 있음' : 'NULL 주문 없음'); },
  columns: ['결과', '결과 행', '서브쿼리만 따로 실행하면', 'EXPLAIN의 select_type'],
  simulate: function (c) {
    var self = this, M = this.M, O = this.orders(c), kind = c.kind, corr = this.CORR[kind], ev = [], sum = [], err = null, out = [], loops = null;
    var st = { sub: '', verdict: {}, cur: 0, hit: [], res: '', exp: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function nul(x) { return x === null ? 'NULL' : String(x); }
    // 숫자 뒤에 붙는 조사를 고른다 (1, 3처럼 받침이 있는 숫자는 앞의 것)
    function jo(n, a, b) { return n + ([0, 1, 3, 6, 7, 8].indexOf(n % 10) >= 0 ? a : b); }
    var innerSql = this.inner(c), innerText, type;
    push('CREATE TABLE, INSERT: 회원 4명과 주문 ' + O.length + '건이 있습니다. 김철수는 2건, 이영희와 박민수는 1건씩 주문했고 최지우는 주문이 없습니다.' + (c.nul ? ' 주문 105는 비회원 주문이라 member_id가 NULL입니다.' : ''), '');
    if (kind === 'scalar') {
      var item = this.PICK[c.pick], got = O.filter(function (o) { return o[2] === item; });
      innerText = got.length ? got.length + '행: ' + got.map(function (o) { return nul(o[1]); }).join(', ') : '0행';
      st.sub = innerText; st.hit = got.map(function (o) { return o[0]; });
      push('(' + innerSql + '): 괄호 안의 서브쿼리는 바깥 쿼리의 값을 쓰지 않으므로 혼자서 실행할 수 있습니다. item이 ' + item + '인 주문은 ' + (got.length ? got.length + '건이고 member_id는 ' + got.map(function (o) { return o[1]; }).join('과 ') + '입니다.' : '없습니다. 서브쿼리의 결과는 0행입니다.'), '');
      if (got.length > 1) { err = { no: 1242, msg: 'Subquery returns more than 1 row' }; st.res = '오류 1242'; push('WHERE id = (...): =의 오른쪽에는 값이 하나만 올 수 있습니다. 서브쿼리가 ' + got.length + '행을 돌려줬으므로 MySQL은 오류 1242(Subquery returns more than 1 row)로 문장을 거부합니다.', 'bad'); }
      else if (!got.length) { M.forEach(function (m) { st.verdict[m[0]] = ['알 수 없음', 'unk']; }); st.res = '0행'; push('WHERE id = (...): 서브쿼리가 0행이면 그 자리의 값은 NULL이 됩니다. id = NULL은 어느 행에서도 참이 되지 않으므로("알 수 없음") 결과는 0행입니다. 오류는 나지 않습니다.', 'bad'); }
      else { M.forEach(function (m) { var ok = m[0] === got[0][1]; st.verdict[m[0]] = [ok ? '참' : '거짓', ok ? 'in' : 'out']; if (ok) out.push(m[1]); }); st.res = out.length + '행'; push('WHERE id = (...): 서브쿼리가 값 하나 ' + got[0][1] + '을 돌려줬으므로 조건은 WHERE id = ' + got[0][1] + '과 같습니다. ' + out.join(', ') + ' ' + out.length + '행이 나옵니다.', 'good'); }
      type = err ? '-' : 'SUBQUERY'; st.exp = type;
      push(err ? 'EXPLAIN: 이 문장은 실행 계획을 보려고 EXPLAIN을 붙여도 같은 오류 1242가 납니다.' : 'EXPLAIN: 서브쿼리 줄의 select_type이 SUBQUERY입니다. 바깥 행의 값에 기대지 않고 실행되는 서브쿼리라는 뜻입니다.', '');
    } else if (kind === 'corr') {
      innerText = '오류 1054 (바깥의 m.id가 필요)'; st.sub = '바깥 행마다 다시 실행';
      push('(' + innerSql + '): 서브쿼리 안에 바깥 쿼리의 컬럼 m.id가 들어 있습니다. m.id의 값은 바깥 행마다 다르므로 이 서브쿼리는 혼자서는 실행할 수 없고, 바깥 행 하나가 정해질 때마다 그 값을 넣어 다시 실행됩니다. 이런 서브쿼리를 상관 서브쿼리라고 합니다.', '');
      M.forEach(function (m) {
        var mine = O.filter(function (o) { return o[1] === m[0]; });
        st.cur = m[0]; st.hit = mine.map(function (o) { return o[0]; }); st.verdict[m[0]] = ['cnt ' + mine.length, 'in']; out.push(m[1] + ' ' + mine.length);
        push('바깥 행 ' + m[1] + ' (id ' + m[0] + '): m.id 자리에 ' + jo(m[0], '을', '를') + ' 넣어 서브쿼리를 실행합니다. member_id가 ' + m[0] + '인 주문은 ' + mine.length + '건이므로 cnt는 ' + mine.length + '입니다.', '');
      });
      st.cur = 0; st.hit = []; st.res = out.length + '행'; type = 'DEPENDENT SUBQUERY'; st.exp = type; loops = M.length;
      push('EXPLAIN: 서브쿼리 줄의 select_type이 DEPENDENT SUBQUERY입니다. 바깥 행의 값에 기대는 서브쿼리라는 뜻입니다. EXPLAIN ANALYZE로 실제 실행을 보면 서브쿼리 부분의 loops가 ' + M.length + '로, 바깥 행 ' + M.length + '개마다 한 번씩 실행됐습니다.', 'good');
    } else if (kind === 'in' || kind === 'notin') {
      var list = O.map(function (o) { return o[1]; }), hasNull = list.indexOf(null) >= 0, shown = list.map(nul).join(', '), not = kind === 'notin';
      innerText = list.length + '행: ' + shown; st.sub = '목록 ' + shown;
      push('(' + innerSql + '): 괄호 안의 서브쿼리는 바깥 쿼리의 값을 쓰지 않으므로 혼자서 실행할 수 있습니다. 주문들의 member_id를 모은 목록 ' + shown + '을 돌려줍니다.' + (hasNull ? ' 비회원 주문 때문에 목록에 NULL이 들어 있습니다.' : ''), '');
      M.forEach(function (m) {
        var found = list.indexOf(m[0]) >= 0, v = found ? 'T' : hasNull ? 'U' : 'F';   // IN의 값: 참, 알 수 없음, 거짓
        if (not) v = v === 'T' ? 'F' : v === 'F' ? 'T' : 'U';
        st.cur = m[0]; st.hit = O.filter(function (o) { return o[1] === m[0] || (!found && o[1] === null); }).map(function (o) { return o[0]; });
        st.verdict[m[0]] = [v === 'T' ? '참' : v === 'F' ? '거짓' : '알 수 없음', v === 'T' ? 'in' : v === 'F' ? 'out' : 'unk'];
        if (v === 'T') out.push(m[1]);
        var head = m[1] + ' (id ' + m[0] + ') ' + (not ? 'NOT IN' : 'IN') + ' (' + shown + '): ';
        if (!not) push(head + (found ? '목록에 ' + jo(m[0], '이', '가') + ' 있으므로 참입니다. 결과에 들어갑니다.' : hasNull ? '목록에 ' + jo(m[0], '과', '와') + ' 같은 값이 없습니다. 다만 NULL과는 같은지 알 수 없어서 결과는 거짓이 아니라 "알 수 없음"입니다. WHERE는 참인 행만 남기므로 어느 쪽이든 빠집니다.' : '목록에 ' + jo(m[0], '이', '가') + ' 없으므로 거짓입니다. 빠집니다.'), found ? 'good' : '');
        else push(head + (found ? '목록에 ' + jo(m[0], '이', '가') + ' 있으므로 IN이 참이고, NOT IN은 거짓입니다. 빠집니다.' : hasNull ? 'NOT IN은 "목록의 모든 값과 다르다"는 뜻입니다. ' + jo(m[0], '은', '는') + ' 1, 2, 3과는 다르지만, NULL과 다른지는 알 수 없습니다. 하나라도 알 수 없으면 전체가 "알 수 없음"이 되고, WHERE는 참인 행만 남기므로 주문이 없는 ' + m[1] + '도 빠집니다.' : jo(m[0], '은', '는') + ' 목록의 어느 값과도 다르므로 참입니다. 결과에 들어갑니다.'), found ? '' : hasNull ? 'bad' : 'good');
      });
      st.cur = 0; st.hit = []; st.res = out.length + '행';
      type = not ? 'SUBQUERY' : 'SIMPLE (조인으로 바꿔 실행)'; st.exp = type;
      push(not ? 'EXPLAIN: 서브쿼리 줄의 select_type이 SUBQUERY입니다. 바깥 행의 값에 기대지 않으므로 목록을 한 번만 만들어 두고 바깥 행마다 그 목록과 비교합니다.' : 'EXPLAIN: member를 읽는 줄의 select_type이 SIMPLE이고, SUBQUERY나 DEPENDENT SUBQUERY 줄이 없습니다. MySQL 8.4는 이 IN 서브쿼리를 서브쿼리 그대로 실행하지 않고 member와 orders의 조인(세미조인)으로 바꿔 실행합니다. 결과는 위에서 따져 본 것과 같습니다.', '');
    } else {
      var notE = kind === 'notexists';
      innerText = '오류 1054 (바깥의 m.id가 필요)'; st.sub = '바깥 행마다 행이 있는지 확인';
      push('(' + innerSql + '): 서브쿼리 안에 바깥 쿼리의 컬럼 m.id가 들어 있는 상관 서브쿼리입니다. EXISTS는 서브쿼리가 한 행이라도 돌려주면 참, 0행이면 거짓입니다. 돌려주는 값이 무엇인지는 보지 않으므로 SELECT 1이라고 적었습니다.', '');
      M.forEach(function (m) {
        var mine = O.filter(function (o) { return o[1] === m[0]; }), ex = mine.length > 0, v = notE ? !ex : ex;
        st.cur = m[0]; st.hit = mine.map(function (o) { return o[0]; }); st.verdict[m[0]] = [v ? '참' : '거짓', v ? 'in' : 'out'];
        if (v) out.push(m[1]);
        push('바깥 행 ' + m[1] + ' (id ' + m[0] + '): member_id가 ' + m[0] + '인 주문이 ' + (ex ? mine.length + '건 있습니다. 서브쿼리가 행을 돌려주므로 EXISTS는 참' + (notE ? ', NOT EXISTS는 거짓입니다. 빠집니다.' : '입니다. 결과에 들어갑니다.') : '없습니다. 서브쿼리가 0행이므로 EXISTS는 거짓' + (notE ? ', NOT EXISTS는 참입니다. 결과에 들어갑니다.' : '입니다. 빠집니다.') + (c.nul ? ' member_id가 NULL인 주문은 조건 o.member_id = ' + jo(m[0], '을', '를') + ' 통과하지 못해 서브쿼리의 결과에 들어오지 않을 뿐입니다. EXISTS의 값은 참 아니면 거짓이고 "알 수 없음"이 되지 않습니다.' : '')), v ? 'good' : '');
      });
      st.cur = 0; st.hit = []; st.res = out.length + '행';
      type = 'SIMPLE (조인으로 바꿔 실행)'; st.exp = type;
      push('EXPLAIN: member를 읽는 줄의 select_type이 SIMPLE이고, SUBQUERY나 DEPENDENT SUBQUERY 줄이 없습니다. 문장의 모양은 상관 서브쿼리지만, MySQL 8.4는 이것을 member와 orders의 조인(' + (notE ? '안티조인' : '세미조인') + ')으로 바꿔 실행하므로 DEPENDENT SUBQUERY로 나오지 않습니다. 결과는 위에서 따져 본 것과 같습니다.', '');
    }
    var resText = err ? '-' : out.length ? out.length + '행: ' + out.join(', ') : '0행';
    if (kind === 'scalar') sum.push({ one: '값 하나를 돌려주는 서브쿼리(스칼라 서브쿼리)는 =, <, > 같은 비교의 한쪽에 값처럼 쓸 수 있습니다. 반드시 한 컬럼, 많아야 한 행만 돌려줘야 합니다.', two: '서브쿼리가 두 행을 돌려줘서 오류가 났습니다. 처음에는 한 행만 나오던 쿼리도 데이터가 늘어 두 행이 되는 순간 이렇게 됩니다. 여러 행이 나올 수 있는 자리라면 = 대신 IN을 쓰고(이 예에서는 김철수와 이영희가 나옵니다), 값 하나가 필요하다면 서브쿼리가 반드시 한 행만 돌려주게 조건을 적습니다.', zero: '서브쿼리가 0행이면 오류가 아니라 NULL이 됩니다. NULL과의 비교는 참이 되지 않으므로 결과가 조용히 0행이 됩니다. 두 행일 때는 오류로 알려 주지만 0행일 때는 알려 주지 않습니다.' }[c.pick]);
    if (kind === 'corr') sum.push('상관 서브쿼리는 바깥 행의 수만큼 다시 실행될 수 있습니다. 바깥 행이 4개면 4번이지만 10만 개면 10만 번입니다. 이 예와 같은 결과는 LEFT JOIN과 GROUP BY로도 구할 수 있습니다.');
    if (kind === 'in') sum.push('IN은 "목록에 같은 값이 하나라도 있는가"입니다. 목록에 NULL이 섞여 있어도 같은 값을 찾으면 참이고, 못 찾은 행은 거짓이든 알 수 없음이든 어차피 빠지므로 결과가 달라지지 않습니다. 문제는 NOT IN에서 생깁니다.');
    if (kind === 'exists') sum.push('EXISTS는 값을 비교하지 않고 "조건에 맞는 행이 있는가"만 봅니다. 이 예에서 IN과 EXISTS는 같은 결과를 냈고 MySQL 8.4는 둘 다 조인으로 바꿔 실행했습니다. 어느 쪽이 빠른지는 문장의 모양이 아니라 실행 계획을 보고 판단합니다.');
    if (kind === 'notin') sum.push(c.nul ? 'NOT IN의 목록에 NULL이 하나라도 있으면 결과는 언제나 0행입니다. 오류도 경고도 없이 빈 결과가 나오므로 알아채기 어렵습니다. 서브쿼리에 WHERE member_id IS NOT NULL을 넣거나(그러면 최지우가 나옵니다) NOT EXISTS로 바꿔 씁니다.' : '목록에 NULL이 없으면 NOT IN은 기대한 대로 동작합니다.');
    if (kind === 'notexists') sum.push('NOT EXISTS는 바깥 행마다 "짝이 되는 행이 있는가"만 따지므로 NULL이 섞여 있어도 결과가 달라지지 않습니다. "없는 것 찾기"에는 NOT EXISTS가 안전합니다.');
    if (kind === 'in' || kind === 'exists' || kind === 'notexists') sum.push('select_type이 SIMPLE로 나온 것은 MySQL의 옵티마이저가 서브쿼리를 조인으로 바꿨기 때문입니다. 데이터의 양에 따라 EXPLAIN에 MATERIALIZED 줄이 더 나오기도 합니다.');
    return { events: ev, summary: sum, err: err, out: out, innerText: innerText, type: type, loops: loops, row: [err ? '오류 ' + err.no : '성공', resText, innerText, type] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    H.table(v, ['id', 'name', c.kind === 'corr' ? '서브쿼리의 값' : 'WHERE 조건의 값'], this.M.map(function (m) { var vd = s.verdict[m[0]]; return { cells: [String(m[0]), m[1], vd ? { v: vd[0], cls: vd[1] === 'in' ? 'good' : vd[1] === 'unk' ? 'bad' : '' } : (s.cur === m[0] ? { v: '확인 중', cls: 'hot' } : '')] }; }), 'member 테이블 (바깥 쿼리)');
  },
  // 그림: 왼쪽이 바깥 쿼리의 행(회원), 오른쪽이 서브쿼리가 읽는 행(주문). 회원마다 조건의 값(참, 거짓, 알 수 없음)이 붙는다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, O = this.orders(c), corr = this.CORR[c.kind];
    P.size(680, 306);
    P.region('rm', 16, 14, 300, 176, 'member (바깥 쿼리)');
    P.region('ro', 364, 14, 300, 196, 'orders (서브쿼리)');
    this.M.forEach(function (m, i) {
      var vd = s ? s.verdict[m[0]] : null, now = s && s.cur === m[0];
      P.box('m' + m[0], 28, 46 + i * 34, 276, 28, { cls: (vd ? (vd[1] === 'in' ? 'good' : vd[1] === 'unk' ? 'bad' : 'plain') : 'wait') + (now ? ' now' : ''), title: 'id ' + m[0] + ' ' + m[1], right: vd ? vd[0] : '' });
    });
    O.forEach(function (o, i) {
      var hit = s && s.hit.indexOf(o[0]) >= 0;
      P.box('o' + o[0], 376, 46 + i * 31, 276, 26, { cls: hit ? (o[1] === null ? 'bad' : 'hot') : o[1] === null ? 'plain now' : 'plain', title: o[0] + ' ' + o[2], right: 'member_id ' + (o[1] === null ? 'NULL' : o[1]) });
      if (hit && s.cur && corr) P.arrow('h' + o[0], 'm' + s.cur + ':r', 'o' + o[0] + ':l', { cls: 'hot' });
    });
    P.box('sub', 16, 218, 648, 32, { cls: s && s.sub ? 'hot' : 'ghost', title: corr ? '서브쿼리' : '서브쿼리의 결과', right: s && s.sub ? s.sub : '?' });
    if (s && s.cur && !corr) P.arrow('cmp', 'm' + s.cur + ':b', 'sub:t:0.25', { cls: 'hot', label: '비교' });
    P.box('res', 16, 260, 250, 34, { cls: !s || !s.res ? 'ghost' : /오류|^0행/.test(s.res) ? 'bad' : 'good', title: '결과', right: s && s.res ? s.res : '?' });
    P.box('exp', 278, 260, 386, 34, { cls: s && s.exp ? 'wait' : 'ghost', title: 'select_type', right: s && s.exp ? s.exp : '?' });
    var nulNote = !c.nul ? '' : ' 굵은 테두리의 주문은 member_id가 NULL인 행입니다.' + (c.kind === 'in' || c.kind === 'notin' ? ' 이 NULL 때문에 지금 보는 회원의 값이 "알 수 없음"이 될 때는 빨간 상자로 바뀝니다.' : '');
    P.note((corr ? '노란 화살표가 지금 보고 있는 바깥 행에서 짝이 되는 주문으로 갑니다.' : '회원 오른쪽의 글자가 WHERE 조건의 값입니다. WHERE는 "참"인 행만 남기며 "알 수 없음"도 빠집니다.') + nulNote);
  },
  assume: '회원 4명, 주문 4~5건의 작은 예입니다. 서른여섯 가지 조합(모양 여섯 가지 × NULL 주문 유무 × 찾는 상품 세 가지, 찾는 상품은 "값 하나" 모양에서만 문장이 달라집니다) 모두, 화면의 SQL을 실제 MySQL 8.4.11에서 그대로 실행해 오류 번호와 메시지, 결과의 모든 행, 괄호 안의 서브쿼리만 따로 실행한 결과, EXPLAIN의 select_type이 모형과 같은 것을 대조했습니다. 상관 서브쿼리가 바깥 행마다 실행된다는 것은 EXPLAIN ANALYZE의 서브쿼리 부분 loops가 바깥 행 수(4)와 같은 것으로, NOT IN의 서브쿼리가 한 번만 실행된다는 것은 EXPLAIN ANALYZE에 "run only once"로 표시되는 것으로 확인했습니다. 화면의 단계는 조건의 뜻을 따라가는 논리적인 설명이며 MySQL이 실제로 실행하는 방법과는 다를 수 있습니다. MySQL 8.4의 옵티마이저는 IN과 EXISTS 서브쿼리를 세미조인으로, NOT EXISTS를 안티조인으로 바꿔 실행했고 그래서 select_type이 SIMPLE로 나왔습니다. 이 변환은 버전과 설정(optimizer_switch), 데이터의 양에 따라 달라지며, 같은 문장의 EXPLAIN에 MATERIALIZED 줄이 함께 나오기도 했습니다. 회원과 주문을 1,000행씩으로 늘려 실행했을 때도 select_type의 분류는 같았습니다. MySQL 8.0.16보다 앞선 버전은 EXISTS 서브쿼리를 세미조인으로 바꾸지 않으므로 DEPENDENT SUBQUERY로 나올 수 있습니다(이 부분은 실행이 아니라 MySQL 문서를 따랐습니다). NOT IN이 조인으로 바뀌지 않고 SUBQUERY로 나온 것은 member_id가 NULL을 허용하는 컬럼이기 때문이며, member_id를 NOT NULL로 선언한 테이블에서는 같은 NOT IN 문장이 SIMPLE(안티조인)로 나오는 것을 실행해 확인했습니다. select_type을 뺀 결과 행과 오류는 SQL의 정의에 따른 것이라 다른 DB에서도 같습니다. 요약에 적은 내용 가운데 "= 대신 IN을 쓰면 김철수와 이영희가 나온다", "LEFT JOIN과 GROUP BY로 같은 결과가 나온다", "서브쿼리에 IS NOT NULL을 넣으면 최지우가 나온다"도 같은 MySQL에서 따로 실행해 확인했습니다. 값 하나 자리의 서브쿼리가 0행일 때 NULL이 되는 것은 MySQL 문서의 설명과 실행 결과(0행, 오류 없음)가 일치합니다.',
});
