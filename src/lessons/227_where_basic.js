Lab.register({
  id: 'where_basic', nav: 'WHERE', cat: '기초개념', mode: 'step', basic: true, deep: ['selectorder'],
  title: 'WHERE는 무엇을 정하고, 없으면 어떻게 되는가',
  why: '테이블에는 행이 수천, 수만 개 쌓이지만 한 번에 필요한 것은 대개 그중 몇 행이다. WHERE가 없다면 모든 행을 프로그램으로 읽어 와서 필요한 행을 직접 골라야 하고, 한 사람의 정보만 고칠 방법도 없다. WHERE는 고르는 일을 DB에 맡겨, 필요한 행만 골라 다루게 한다.',
  use: '로그인할 때 아이디로 회원 한 명을 찾거나, 한 사람의 비밀번호만 바꾸거나, 30일이 지난 기록만 지울 때처럼 특정 행만 다룰 때 붙인다. 실수로 WHERE를 빠뜨려 테이블 전체가 바뀌는 일을 막으려고, 먼저 같은 조건의 SELECT로 대상 행을 확인한 뒤 UPDATE나 DELETE를 실행하는 습관을 들이기도 한다.',
  intro: 'WHERE는 SQL 문장 뒤에 붙이는 "WHERE 조건"입니다. UPDATE나 DELETE, SELECT를 테이블의 행 가운데 어느 행에 적용할지를 정합니다. DB는 행을 하나씩 보며 조건이 맞는지 확인하고, 맞는 행에만 문장을 적용하거나 읽어 옵니다. 이 실습은 문장의 종류와 WHERE의 조건을 바꿔 가며 같은 테이블에서 같은 SQL을 실행해, 몇 행에 문장이 적용되고 마지막에 어떤 행이 남는지를 봅니다. WHERE를 지우면 어떻게 되는지도 봅니다.',
  terms: ['WHERE 절', 'UPDATE와 DELETE', '행과 열'],
  controls: [
    { id: 'stmt', label: 'WHERE를 붙이는 문장', type: 'select', value: 'update', options: [['update', "UPDATE member SET name = '탈퇴'"], ['delete', 'DELETE FROM member'], ['select', 'SELECT * FROM member (읽기만)']] },
    { id: 'cond', label: 'WHERE 조건', type: 'select', value: 'one', options: [['one', 'WHERE id = 2'], ['many', 'WHERE age = 30'], ['zero', 'WHERE id = 9 (맞는 행이 없는 조건)'], ['none', 'WHERE를 적지 않는다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'WHERE는 어떻게 생겼고, UPDATE에 붙이면 어느 행이 바뀌나', d: 'WHERE id = 2가 붙은 UPDATE. 조건에 맞는 id 2의 행만 바뀝니다.', v: { stmt: 'update', cond: 'one' } },
    { t: 'WHERE를 지우면', q: 'WHERE를 지우면', d: '조건이 없으면 모든 행이 대상이 되어, UPDATE가 세 행을 다 고칩니다.', v: { stmt: 'update', cond: 'none' } },
    { t: '조건을 age = 30으로 바꾸면', q: '조건을 age = 30으로 바꾸면', d: '맞는 행이 둘이면 둘 모두에 적용됩니다.', v: { stmt: 'update', cond: 'many' } },
    { t: '맞는 행이 없는 조건이면', q: '조건을 id = 9로 바꿔 맞는 행이 없으면', d: '맞는 행이 없으면 아무 행도 바뀌지 않고, 오류도 아닙니다.', v: { stmt: 'update', cond: 'zero' } },
    { t: 'DELETE에서 WHERE를 지우면', q: '문장을 DELETE로 바꾸고 WHERE를 지우면', d: 'WHERE 없는 DELETE는 테이블의 모든 행을 지웁니다.', v: { stmt: 'delete', cond: 'none' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/WhereBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  head: { update: "UPDATE member SET name = '탈퇴'", 'delete': 'DELETE FROM member', select: 'SELECT * FROM member' },
  whereOf: { one: 'WHERE id = 2', many: 'WHERE age = 30', zero: 'WHERE id = 9', none: '' },
  stmtLine: function (c) { return this.head[c.stmt] + (c.cond === 'none' ? '' : ' ' + this.whereOf[c.cond]) + ';'; },
  code: function (c) {
    var l = ['CREATE TABLE member (', '    id   INT PRIMARY KEY,', '    name VARCHAR(20),', '    age  INT', ');',
      "INSERT INTO member VALUES (1, '김철수', 20);", "INSERT INTO member VALUES (2, '이영희', 30);", "INSERT INTO member VALUES (3, '박민수', 30);", ''];
    if (c.cond !== 'none') l.push('-- WHERE: 조건에 맞는 행에만 이 문장을 적용한다');
    l.push(this.stmtLine(c), 'SELECT * FROM member ORDER BY id;');
    return l.join('\n');
  },
  label: function (c) { return { update: 'UPDATE', 'delete': 'DELETE', select: 'SELECT' }[c.stmt] + ' · ' + (c.cond === 'none' ? 'WHERE 없음' : this.whereOf[c.cond]); },
  columns: ['문장이 적용된 행', '마지막에 남은 행'],
  simulate: function (c) {
    var stmt = c.stmt, cond = c.cond, ev = [], sum = [];
    var base = [{ id: 1, name: '김철수', age: 20 }, { id: 2, name: '이영희', age: 30 }, { id: 3, name: '박민수', age: 30 }];
    var test = { one: function (r) { return r.id === 2; }, many: function (r) { return r.age === 30; }, zero: function (r) { return r.id === 9; }, none: function () { return true; } }[cond];
    var qtext = { one: 'id가 2인가', many: 'age가 30인가', zero: 'id가 9인가' }[cond];
    var field = { one: 'id', many: 'age', zero: 'id' }[cond], wantSub = { one: '2가', many: '30이', zero: '9가' }[cond];
    var ord = ['첫 번째', '두 번째', '세 번째'];
    var sline = this.stmtLine(c).replace(/;$/, '');
    function ids(a) { return a.map(function (r) { return r.id; }); }
    function idList(a) { return 'id ' + ids(a).join(', '); }
    function rowText(r) { return '(' + r.id + ', ' + r.name + ', ' + r.age + ')'; }
    var st = { rows: base.map(function (r) { return { id: r.id, name: r.name, age: r.age, m: 'wait', cur: false, vt: '', vr: '', del: false }; }), stmt: 'CREATE TABLE, INSERT 세 번', cnt: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var hit = base.filter(test), miss = base.filter(function (r) { return !test(r); });
    var all = cond === 'none';
    var verbDo = { update: '바꿉니다', 'delete': '지웁니다', select: '읽어 옵니다' }[stmt];

    // 1. 준비
    push('CREATE TABLE과 INSERT: DB가 member 테이블을 만들고 행 세 개(김철수, 이영희, 박민수)를 넣습니다. 테이블은 열(id, name, age)과 행(한 사람의 정보 한 줄)으로 이루어집니다. 아래 문장이 적용될 수 있는 행은 이 세 행이 전부입니다.', '');

    // 2. 문장 실행
    st.stmt = sline;
    if (all) {
      st.rows.forEach(function (r) { r.m = 'yes'; r.vt = '조건 없음'; r.vr = '대상'; });
      push(sline + ': 이 문장에는 WHERE가 없습니다. 확인할 조건이 없으므로 DB는 테이블의 모든 행을 대상으로 삼습니다. 이 세 행이 모두 ' + (stmt === 'select' ? '읽을 행' : '문장을 적용할 행') + '이 됩니다.', stmt === 'select' ? '' : 'bad');
    } else {
      push(sline + ': 이 문장에는 WHERE 조건이 붙어 있습니다(' + this.whereOf[cond] + '). WHERE 뒤의 조건은 "' + (stmt === 'select' ? '어느 행을 읽어 올지' : '어느 행에 이 문장을 적용할지') + '"를 정합니다. DB는 member 테이블의 행을 하나씩 보며 ' + qtext.replace(/인가$/, '인지') + ' 확인합니다. 이 확인을 하는 코드를 우리는 쓰지 않았습니다. DB가 문장마다 스스로 합니다.', '');
      base.forEach(function (r, i) {
        var yes = test(r), s = st.rows[i], v = r[field];
        st.rows.forEach(function (x) { x.cur = false; });
        s.cur = true; s.m = yes ? 'yes' : 'no'; s.vt = qtext; s.vr = yes ? '예' : '아니요';
        var lead = i === 0 ? 'DB가 ' + ord[i] + ' 행(' + rowText(r).slice(1, -1) + ')을 봅니다: ' : ord[i] + ' 행(' + rowText(r).slice(1, -1) + '): ';
        var ans = yes
          ? '이 행의 ' + field + '는 ' + v + '이므로 "예"입니다. 조건에 맞는 행입니다.'
          : '이 행의 ' + field + '는 ' + v + '이고 ' + wantSub + ' 아니므로 "아니요"입니다. 조건에 맞지 않는 행이라' + (i === 0 ? ' 이 행에는 문장을 적용하지 않습니다.' : ' 문장을 적용하지 않습니다.');
        push(lead + qtext + '? ' + ans, '');
      });
      st.rows.forEach(function (x) { x.cur = false; });
    }

    // 3. 적용
    var n = hit.length, hitText = n ? idList(hit) : '', missText = miss.length ? idList(miss) : '';
    st.cnt = n;
    st.rows.forEach(function (r, i) {
      if (!test(base[i])) return;
      r.cur = false;
      if (stmt === 'update') { r.name = '탈퇴'; r.m = 'done'; r.vr = '예 · 바뀜'; if (all) r.vr = '바뀜'; }
      else if (stmt === 'delete') { r.del = true; r.vr = all ? '지워짐' : '예 · 지워짐'; }
      else { r.m = 'done'; r.vr = all ? '읽힘' : '예 · 읽힘'; }
    });
    var ap;
    if (n === 0) {
      ap = '맞은 행이 하나도 없습니다. ' + (stmt === 'select' ? '읽어 올 행이 없으므로 DB는 빈 결과(0행)를 돌려줍니다.' : '적용할 행이 없으므로 DB는 아무 행도 ' + (stmt === 'update' ? '바꾸지' : '지우지') + ' 않고, 돌려주는 값(' + (stmt === 'update' ? '바뀐' : '지운') + ' 행 수)은 0입니다.') + ' 맞는 행이 없어도 오류가 아닙니다. 문장은 정상으로 끝납니다.';
    } else if (all) {
      ap = stmt === 'update' ? '대상이 모든 행이므로 DB는 3행의 name을 모두 탈퇴로 ' + verbDo + '. 돌려주는 값(바뀐 행 수)은 3입니다. WHERE가 없으면 DB는 행을 거르지 않습니다.'
        : stmt === 'delete' ? '대상이 모든 행이므로 DB는 3행을 모두 ' + verbDo + '. 돌려주는 값(지운 행 수)은 3입니다. 테이블은 남아 있지만 행이 하나도 없게 됩니다.'
        : '대상이 모든 행이므로 DB는 3행을 모두 ' + verbDo + '. 읽어 온 행은 3행이고, 읽기만 하므로 데이터는 바뀌지 않습니다.';
    } else {
      ap = '조건에 맞은 행(' + hitText + ')에만 문장을 적용합니다. ' + (stmt === 'update' ? 'DB가 ' + (n > 1 ? '그 ' + n + '행의' : '그 행의') + ' name을 탈퇴로 바꿉니다. 돌려주는 값(바뀐 행 수)은 ' + n + '입니다. ' : stmt === 'delete' ? 'DB가 ' + (n > 1 ? '그 ' + n + '행을' : '그 행을') + ' 지웁니다. 돌려주는 값(지운 행 수)은 ' + n + '입니다. ' : 'DB가 그 행만 읽어 옵니다. 읽어 온 행은 ' + n + '행이고, 읽기만 하므로 데이터는 바뀌지 않습니다. ') + '맞지 않은 행(' + missText + ')은 그대로입니다.' + (n > 1 ? ' 맞는 행이 여럿이면 여럿 모두에 적용됩니다.' : '');
    }
    push(sline + ': ' + ap, n === 0 ? '' : (all && stmt !== 'select') ? 'bad' : n > 1 && stmt !== 'select' ? 'bad' : 'good');

    // 4. 마지막 SELECT
    var left = st.rows.filter(function (r) { return !r.del; });
    var finalText = left.length ? left.map(function (r) { return rowText(r); }).join(', ') : '(행이 없음)';
    st.stmt = 'SELECT * FROM member ORDER BY id';
    st.rows.forEach(function (r) { r.cur = false; if (r.m === 'done' && stmt !== 'update') r.m = 'plain'; });
    st.cnt = n;
    var remark = stmt === 'select' ? 'SELECT는 읽기만 했으므로 세 행이 처음 그대로입니다.'
      : n === 0 ? '아무 행도 ' + (stmt === 'update' ? '바뀌지' : '지워지지') + ' 않아 세 행이 처음 그대로입니다.'
      : all ? (stmt === 'update' ? '세 행의 name이 모두 탈퇴로 바뀌어 있습니다.' : '행이 모두 지워져 읽을 행이 없습니다. 테이블은 남아 있고 오류도 나지 않습니다.')
      : stmt === 'update' ? hitText + '인 행의 name만 탈퇴로 바뀌었고 나머지는 그대로입니다.'
      : hitText + '인 행이 지워지고 나머지가 남았습니다.';
    push('SELECT * FROM member ORDER BY id: 이 SELECT에는 WHERE가 없으므로 테이블에 남은 행을 모두 읽습니다. 결과는 ' + finalText + '입니다. ' + remark, all && stmt !== 'select' ? 'bad' : n > 1 && stmt !== 'select' ? 'bad' : 'good');

    // 요약: 첫 줄은 물음의 답
    var S1, S2, S = stmt, nm = { update: 'UPDATE', 'delete': 'DELETE', select: 'SELECT' }[S];
    var did = { update: 'name을 탈퇴로 바꿨습니다', 'delete': '지웠습니다', select: '읽어 왔습니다' }[S];
    if (cond === 'one') {
      S1 = 'WHERE는 문장 뒤에 붙여 "어느 행에 이 문장을 적용할지" 정하는 조건입니다. "WHERE id = 2"를 붙인 ' + nm + '는 조건에 맞는 id 2의 행만 ' + (S === 'update' ? '바꿨습니다.' : S === 'delete' ? '지웠습니다.' : '읽어 왔습니다.');
      S2 = 'DB는 행마다 조건이 맞는지 보고, 맞는 행에만 문장을 적용합니다. 나머지 두 행은 조건에 맞지 않아 ' + (S === 'select' ? '읽히지 않았습니다.' : '그대로입니다.');
    } else if (cond === 'many') {
      S1 = '조건에 맞는 행이 둘(id 2, 3)이면 둘 모두에 적용됩니다. WHERE age = 30인 ' + nm + '는 두 행을 모두 ' + (S === 'update' ? '고쳤습니다.' : S === 'delete' ? '지웠습니다.' : '읽어 왔습니다.');
      S2 = 'WHERE는 행 하나를 고르는 장치가 아니라 조건에 맞는 행을 모두 고르는 장치입니다. 한 행만 고르려면 id처럼 행마다 값이 다른 열로 조건을 씁니다.';
    } else if (cond === 'zero') {
      S1 = '맞는 행이 하나도 없으면 아무 행도 ' + (S === 'update' ? '바뀌지' : S === 'delete' ? '지워지지' : '읽히지') + ' 않고, 오류도 아닙니다. id가 9인 행이 없어 ' + nm + '는 0행에 적용되었습니다.';
      S2 = S === 'select' ? 'SELECT도 오류 없이 빈 결과(0행)를 돌려줍니다. "없다"는 것은 오류가 아니라 0행이라는 결과입니다.' : '문장이 오류 없이 끝났다고 해서 행이 바뀐 것은 아닙니다. ' + (S === 'update' ? '바뀐' : '지운') + ' 행 수가 0이었다는 것으로 알 수 있습니다.';
    } else {
      S1 = 'WHERE를 지우면 확인할 조건이 없으므로 모든 행이 대상이 됩니다. ' + (S === 'update' ? 'UPDATE가 세 행의 name을 모두 탈퇴로 바꿨습니다.' : S === 'delete' ? 'DELETE가 테이블의 모든 행을 지웠습니다.' : 'SELECT가 세 행을 모두 읽어 왔습니다.');
      S2 = S === 'update' ? '한 사람만 고치려던 UPDATE라도 WHERE가 없으면 전원을 고칩니다. 문장은 오류 없이 끝나므로 DB가 알려 주지 않습니다.'
        : S === 'delete' ? 'WHERE가 없는 DELETE는 테이블을 비웁니다. 문장은 오류 없이 끝나므로 DB가 알려 주지 않습니다.'
        : 'SELECT는 읽기만 하므로 데이터는 그대로입니다. 같은 일이 UPDATE에서는 전원을 고치고 DELETE에서는 테이블을 비웁니다.';
    }
    sum.push(S1, S2);
    var appliedText = n === 0 ? '0행' : all ? '3행 (모든 행)' : n + '행 (' + hitText + ')';
    return { events: ev, summary: sum, matched: ids(hit), row: [appliedText, finalText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 테이블을 만드는 것부터 한 문장씩 진행합니다.'); return; }
    var live = s.rows.filter(function (r) { return !r.del; });
    H.table(v, ['id', 'name', 'age', '조건'], live.length ? live.map(function (r) { var k = r.m === 'done' ? 'good' : r.m === 'yes' ? 'hot' : ''; return { cls: r.m === 'no' ? 'gone' : '', cells: [{ v: String(r.id), cls: k }, { v: r.name, cls: k }, { v: String(r.age), cls: k }, r.vr ? r.vt + (r.vt ? ': ' : '') + r.vr : ''] }; }) : [{ cls: 'gone', cells: ['행 없음', '', '', ''] }], 'member 테이블');
    H.counters(v, [[live.length, '테이블의 행 수'], [s.cnt === null ? '-' : s.cnt, '문장이 적용된 행']]);
  },
  // 그림: 위에 지금 실행하는 문장, 가운데에 member 테이블의 세 행과 행마다의 조건 확인(맞은 행은 노랑, 바뀐 뒤 초록, 지워진 행은 사라짐), 아래에 문장이 적용된 행 수.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 300);
    P.box('st', 14, 10, 652, 54, { cls: s ? 'hot' : 'ghost', title: '지금 실행하는 문장', sub: s ? [s.stmt] : [' '] });
    P.region('tb', 14, 76, 652, 166, 'member 테이블 (id, name, age)');
    [0, 1, 2].forEach(function (i) {
      var r = s ? s.rows[i] : null, y = 114 + i * 42;
      if (r && !r.del) {
        var cls = r.m === 'done' ? 'good' : r.m === 'yes' ? 'hot' : r.m === 'no' ? 'ghost' : r.m === 'wait' ? 'wait' : 'plain';
        P.box('r' + i, 26, y, 380, 34, { cls: cls + (r.cur ? ' now' : ''), title: 'id ' + r.id + ' · ' + r.name + ' · ' + r.age });
      }
      if (r && r.vt) P.box('v' + i, 422, y, 232, 34, { cls: r.m === 'no' ? 'ghost' : 'hot', title: r.vt, right: r.vr });
    });
    P.box('n1', 14, 254, 652, 36, { cls: s && s.cnt !== null ? (s.cnt === 0 ? 'wait' : 'good') : 'ghost', title: '문장이 적용된 행', right: s && s.cnt !== null ? s.cnt + '행' : '-' });
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했습니다. 열두 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 글자 그대로 한 문장씩 실행해서, 문장이 적용된 행의 수와 어느 행인지(UPDATE는 이름이 바뀐 행, DELETE는 사라진 행, SELECT는 읽힌 행), 오류가 났는지, 마지막 SELECT의 결과를 모형과 대조했습니다. 맞는 행이 없는 조건(WHERE id = 9)과 WHERE가 없는 UPDATE·DELETE가 H2에서 오류 없이 끝난다는 것, WHERE 없는 DELETE 뒤에도 테이블이 남아 마지막 SELECT가 빈 결과를 돌려준다는 것은 이 실행에서 확인했습니다. 규칙은 MySQL 8.4 문서의 UPDATE 문(15.2.17절: WHERE가 있으면 조건에 맞는 행만 고치고 없으면 모든 행을 고친다), DELETE 문(15.2.2절: WHERE가 없으면 모든 행을 지운다), SELECT 문(15.2.13절: WHERE가 없으면 모든 행을 선택한다)을 직접 열어 확인했습니다. 또 MySQL에는 WHERE를 잊은 UPDATE와 DELETE를 막는 safe-updates 모드가 있다는 것을 MySQL 문서(mysql 클라이언트 팁의 Using Safe-Updates Mode)에서 확인했습니다. 이 모드를 켜면 WHERE에 키 조건이 없는 UPDATE와 DELETE는 오류가 나는데, 이 실습은 그 모드를 다루지 않습니다. MySQL에서의 실행 대조는 하지 않았습니다. 그래서 위 규칙은 문서와 H2 실행이 일치한다는 근거이고, MySQL이 같은 SQL에서 같은 결과를 내는지는 실행으로 확인하지 않았습니다. 화면은 DB가 행을 하나씩 보며 조건을 확인하는 모습으로 그렸습니다. 실제 DB는 인덱스를 쓰는 등 구현에 따라 다른 방법으로 맞는 행을 찾을 수 있으며, 실행으로 확인한 것은 어느 행에 문장이 적용되었는가이지 확인 순서가 아닙니다. 문장이 돌려주는 "적용된 행 수"는 이 실습의 UPDATE에서 맞은 행의 이름이 모두 이전과 달라 맞은 행 수와 바뀐 행 수가 같았습니다. 새 값이 이미 같은 행을 DB가 어떻게 세는지는 DB와 드라이버 설정에 따라 다를 수 있어 다루지 않았습니다. 조건은 같음(=) 비교 하나만 다루며, AND·OR, 범위, LIKE, NULL 비교는 다루지 않습니다.',
});
