Lab.register({
  id: 'selectorder', nav: 'SELECT가 처리되는 순서', cat: '데이터베이스', mode: 'step',
  title: 'WHERE에서는 왜 별칭과 집계 함수를 쓸 수 없나',
  intro: 'SELECT 문은 적힌 순서가 아니라 FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT 순서로 처리된다고 보면 됩니다. 어떤 이름을 쓸 수 있는지는 그 절이 몇 번째로 처리되는지에 달려 있습니다.',
  terms: ['SELECT 문의 논리적 처리 순서', 'GROUP BY, WHERE, HAVING', '컬럼 별칭(AS)', '집계 함수'],
  controls: [
    { id: 'cond', label: '거르는 조건', type: 'select', value: 'alias', options: [['grpcol', "member <> '박민수' (묶는 기준 컬럼)"], ['rowcol', 'amount >= 300 (주문 한 건의 금액)'], ['agg', 'SUM(amount) >= 300 (집계 함수)'], ['alias', 'total >= 300 (SELECT에서 붙인 별칭)']] },
    { id: 'at', label: '조건을 적는 곳', type: 'select', value: 'where', options: [['where', 'WHERE 절'], ['having', 'HAVING 절']] },
    { id: 'galias', label: 'GROUP BY에 SELECT의 별칭(name)을 쓴다', type: 'check', value: false },
    { id: 'tail', label: '정렬과 자르기', type: 'select', value: 'none', options: [['none', '없음'], ['limit', 'ORDER BY total DESC LIMIT 1 (합계가 가장 큰 한 행)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'WHERE 절에 SELECT에서 붙인 별칭으로 total >= 300 조건을 걸면 어떻게 되나', d: 'WHERE에 별칭 total을 썼습니다. 오류 1054가 납니다.', v: { cond: 'alias', at: 'where', galias: false, tail: 'none' } },
    { t: '같은 별칭을 HAVING에', q: '같은 total >= 300 조건을 HAVING 절에 적으면', d: 'MySQL에서는 실행됩니다. 표준 SQL에는 없는 확장입니다.', v: { cond: 'alias', at: 'having', galias: false, tail: 'none' } },
    { t: 'WHERE에 집계 함수', q: '집계 함수 SUM(amount) >= 300 조건을 WHERE 절에 적으면', d: '아직 그룹이 없어서 오류 1111이 납니다.', v: { cond: 'agg', at: 'where', galias: false, tail: 'none' } },
    { t: 'HAVING에 집계 함수', q: '집계 함수 SUM(amount) >= 300 조건을 HAVING 절에 적으면', d: '합계가 300 이상인 회원 2명이 나옵니다.', v: { cond: 'agg', at: 'having', galias: false, tail: 'none' } },
    { t: '"300 이상"을 WHERE에', q: '주문 한 건의 금액 amount >= 300 조건을 WHERE 절에 적으면', d: '주문 한 건씩 거르므로 김철수의 합계가 300으로 바뀝니다.', v: { cond: 'rowcol', at: 'where', galias: false, tail: 'none' } },
    { t: '행의 컬럼을 HAVING에', q: '주문 한 건의 금액 amount >= 300 조건을 HAVING 절에 적으면', d: '묶은 뒤에는 amount가 없어 오류 1054가 납니다.', v: { cond: 'rowcol', at: 'having', galias: false, tail: 'none' } },
    { t: '별칭으로 묶고 정렬하고 자르기', q: 'member <> \'박민수\' 조건으로 거르고 GROUP BY에 별칭 name을 쓰고 ORDER BY total DESC LIMIT 1로 자르면', d: 'GROUP BY와 ORDER BY의 별칭, 맨 마지막의 LIMIT.', v: { cond: 'grpcol', at: 'where', galias: true, tail: 'limit' } },
  ],
  O: [[1, '김철수', 300], [2, '김철수', 150], [3, '이영희', 120], [4, '이영희', 200], [5, '박민수', 250], [6, '최지우', 80]],
  COND: { grpcol: "member <> '박민수'", rowcol: 'amount >= 300', agg: 'SUM(amount) >= 300', alias: 'total >= 300' },
  STAGES: ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'],
  // 화면의 코드와 대조 프로그램(verify/mysql/selectorder_probe.js)이 함께 쓰는 SQL
  plan: function (c) {
    var cond = this.COND[c.cond];
    var q = 'SELECT member' + (c.galias ? ' AS name' : '') + ', SUM(amount) AS total\n  FROM orders' + (c.at === 'where' ? '\n WHERE ' + cond : '') + '\n GROUP BY ' + (c.galias ? 'name' : 'member') + (c.at === 'having' ? '\nHAVING ' + cond : '') + (c.tail === 'limit' ? '\n ORDER BY total DESC\n LIMIT 1' : '');
    return { ddl: ['CREATE TABLE orders (\n  id     INT PRIMARY KEY,\n  member VARCHAR(20) NOT NULL,\n  amount INT NOT NULL\n)'],
      seed: ['INSERT INTO orders (id, member, amount) VALUES\n' + this.O.map(function (o) { return '  (' + o[0] + ", '" + o[1] + "', " + o[2] + ')'; }).join(',\n')],
      query: q, count: 'SELECT COUNT(*) FROM orders' + (c.at === 'where' ? ' WHERE ' + cond : '') };
  },
  code: function (c) { var p = this.plan(c); return p.ddl[0] + ';\n\n' + p.seed[0] + ';\n\n-- 처리되는 순서: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT\n' + p.query + ';'; },
  label: function (c) { return this.COND[c.cond] + ' · ' + (c.at === 'where' ? 'WHERE' : 'HAVING') + (c.galias ? ' · GROUP BY 별칭' : '') + (c.tail === 'limit' ? ' · 정렬 후 LIMIT 1' : ''); },
  columns: ['결과', 'WHERE를 지난 행', '최종 결과', 'MySQL이 표준과 달리 받아 준 것'],
  simulate: function (c) {
    var self = this, O = this.O, cond = this.COND[c.cond], W = c.at === 'where', ga = !!c.galias, lim = c.tail === 'limit', gname = ga ? 'name' : 'member', ev = [], sum = [];
    var used = { FROM: true, WHERE: W, 'GROUP BY': true, HAVING: !W, SELECT: true, 'ORDER BY': lim, LIMIT: lim };
    var stat = this.STAGES.map(function (n) { return { name: n, k: used[n] ? 'wait' : 'none', n: used[n] ? '' : '없음' }; }), view = { title: '', head: [], rows: [] }, names = '', err = null;
    function at(name, k, n) { stat.forEach(function (s) { if (s.k === 'now') s.k = 'done'; }); var s = stat[self.STAGES.indexOf(name)]; s.k = k; s.n = n; }
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify({ stat: stat, view: view, names: names, err: err })) }); }
    function rowView(list, drop) { return list.map(function (o) { return { id: 'r' + o[0], t: o[0] + '번 ' + o[1], right: 'amount ' + o[2], cells: [String(o[0]), o[1], String(o[2])], cls: drop && drop(o) ? 'gone' : '' }; }); }
    function grpView(gs, drop, done) { return gs.map(function (g) { return { id: 'g' + g.i, t: g.member, right: done ? 'total ' + g.total : 'amount ' + g.amounts.join(', '), cells: done ? [g.member, String(g.total)] : [g.member, g.amounts.join(', '), String(g.total)], cls: drop && drop(g) ? 'gone' : '' }; }); }
    function fail(no, msg) { err = { no: no, msg: msg }; }
    var rows = O.slice(), whereN = null, groups = [], final = null;
    // 1. FROM
    names = '테이블의 컬럼 id, member, amount';
    at('FROM', 'now', '6행'); view = { title: 'FROM을 지난 행', head: ['id', 'member', 'amount'], rows: rowView(rows) };
    push('FROM orders: 가장 먼저 처리됩니다. orders 테이블의 6행을 모두 가져옵니다. 이 시점에 쓸 수 있는 이름은 테이블의 컬럼인 id, member, amount뿐입니다.', '');
    // 2. WHERE
    if (W) {
      if (c.cond === 'agg') { fail(1111, 'Invalid use of group function'); at('WHERE', 'err', '오류 1111'); push('WHERE SUM(amount) >= 300: WHERE는 행을 묶기 전에, 행을 하나씩 보며 처리됩니다. 아직 그룹이 없으므로 "그룹의 합계"인 SUM(amount)는 구할 수 없습니다. MySQL은 오류 1111(Invalid use of group function)로 문장을 거부합니다.', 'bad'); }
      else if (c.cond === 'alias') { fail(1054, "Unknown column 'total' in 'where clause'"); at('WHERE', 'err', '오류 1054'); push("WHERE total >= 300: total은 SELECT에서 SUM(amount)에 붙이는 별칭인데, SELECT는 WHERE보다 나중에 처리됩니다. 이 시점에는 total이라는 이름이 아직 없으므로 MySQL은 오류 1054(Unknown column 'total' in 'where clause')로 문장을 거부합니다.", 'bad'); }
      else {
        var keep = c.cond === 'grpcol' ? function (o) { return o[1] !== '박민수'; } : function (o) { return o[2] >= 300; }, kept = rows.filter(keep);
        at('WHERE', 'now', kept.length + '행'); view = { title: 'WHERE를 지난 행 (줄이 그어진 행은 빠짐)', head: ['id', 'member', 'amount'], rows: rowView(rows, function (o) { return !keep(o); }) };
        push(c.cond === 'grpcol' ? "WHERE member <> '박민수': 묶기 전의 행을 하나씩 검사합니다. member는 테이블의 컬럼이므로 쓸 수 있습니다. 박민수의 주문 1행이 빠지고 5행이 남습니다." : 'WHERE amount >= 300: 묶기 전의 행을 하나씩 검사합니다. 주문 한 건의 amount가 300 이상인 행만 남깁니다. 1번 주문(300) 1행만 남고 5행이 빠집니다. 김철수의 150짜리 주문도 합계를 내기 전에 여기서 빠졌습니다.', '');
        rows = kept; whereN = kept.length;
      }
    }
    // 3. GROUP BY
    if (!err) {
      rows.forEach(function (o) { var g = groups.filter(function (x) { return x.member === o[1]; })[0]; if (!g) { g = { i: groups.length, member: o[1], amounts: [], total: 0 }; groups.push(g); } g.amounts.push(o[2]); g.total += o[2]; });
      names = '묶는 기준 member, 집계 함수(SUM, COUNT 등)';
      at('GROUP BY', 'now', '그룹 ' + groups.length + '개'); view = { title: 'GROUP BY로 묶은 그룹', head: ['member', '그룹에 든 amount', 'SUM(amount)'], rows: grpView(groups) };
      push((ga ? 'GROUP BY name: name은 SELECT에서 member에 붙이는 별칭입니다. SELECT는 아직 처리 전이지만, MySQL은 GROUP BY에서 SELECT 목록의 별칭을 찾아 member로 읽어 줍니다(표준 SQL에는 없는 MySQL의 확장입니다). ' : 'GROUP BY member: ') + '남은 ' + rows.length + '행을 member가 같은 행끼리 묶어 그룹 ' + groups.length + '개를 만듭니다. 이제부터는 행이 아니라 그룹을 다룹니다. 그룹마다 값이 하나로 정해지는 것, 곧 묶는 기준인 member와 SUM(amount) 같은 집계 함수만 쓸 수 있습니다.', '');
    }
    // 4. HAVING
    if (!err && !W) {
      if (c.cond === 'rowcol') { fail(1054, "Unknown column 'amount' in 'having clause'"); at('HAVING', 'err', '오류 1054'); push("HAVING amount >= 300: HAVING은 묶은 뒤의 그룹을 검사합니다. 그룹 하나에는 amount가 여러 개 들어 있어서(김철수 그룹에는 300과 150) 어느 값과 비교할지 정할 수 없습니다. MySQL은 오류 1054(Unknown column 'amount' in 'having clause')로 문장을 거부합니다.", 'bad'); }
      else {
        var keepG = c.cond === 'grpcol' ? function (g) { return g.member !== '박민수'; } : function (g) { return g.total >= 300; }, keptG = groups.filter(keepG);
        at('HAVING', 'now', '그룹 ' + keptG.length + '개'); view = { title: 'HAVING을 지난 그룹 (줄이 그어진 그룹은 빠짐)', head: ['member', '그룹에 든 amount', 'SUM(amount)'], rows: grpView(groups, function (g) { return !keepG(g); }) };
        push(c.cond === 'grpcol' ? "HAVING member <> '박민수': 묶은 뒤의 그룹을 하나씩 검사합니다. member는 묶는 기준이라 그룹마다 값이 하나이므로 쓸 수 있습니다. 박민수 그룹이 빠지고 3개가 남습니다." : c.cond === 'agg' ? 'HAVING SUM(amount) >= 300: 묶은 뒤의 그룹을 하나씩 검사합니다. 그룹마다 amount의 합계를 구해 300 이상인 그룹만 남깁니다. 김철수(450)와 이영희(320) 2개가 남습니다.' : 'HAVING total >= 300: total은 SELECT에서 SUM(amount)에 붙이는 별칭입니다. SELECT는 아직 처리 전이고 표준 SQL은 HAVING에서 별칭을 허용하지 않지만, MySQL은 total을 SUM(amount)로 읽어 줍니다. 합계가 300 이상인 김철수(450)와 이영희(320) 2개가 남습니다.', '');
        groups = keptG;
      }
    }
    if (err) {
      push('오류가 난 문장은 한 행도 돌려주지 않습니다: 뒤의 단계는 처리되지 않습니다. MySQL은 실행을 시작하기 전에 문장을 분석하다가 이 오류를 내므로, 실제로는 테이블을 읽기도 전에 멈춥니다.', 'bad');
    } else {
      // 5. SELECT
      final = groups.map(function (g) { return { i: g.i, member: g.member, total: g.total, amounts: g.amounts }; });
      names = '결과의 컬럼과 별칭 ' + gname + ', total';
      at('SELECT', 'now', final.length + '행'); view = { title: 'SELECT가 만든 행', head: [gname, 'total'], rows: grpView(final, null, true) };
      push('SELECT member' + (ga ? ' AS name' : '') + ', SUM(amount) AS total: 남은 그룹마다 결과 한 행을 만듭니다. 그룹의 합계를 구하고 별칭 total' + (ga ? '과 name' : '') + '을 붙입니다. 별칭은 이 단계에서 비로소 생기므로, 이보다 뒤에 처리되는 ORDER BY에서는 별칭을 쓸 수 있습니다.', lim ? '' : 'good');
      if (lim) {
        final.sort(function (a, b) { return b.total - a.total; });
        at('ORDER BY', 'now', final.length + '행'); view = { title: 'ORDER BY로 정렬한 행', head: [gname, 'total'], rows: grpView(final, null, true) };
        push('ORDER BY total DESC: SELECT가 만든 행을 total이 큰 순서로 정렬합니다. ORDER BY는 SELECT보다 뒤에 처리되므로 별칭 total을 쓸 수 있습니다. 이것은 표준 SQL에서도 허용됩니다.', '');
        var cut = final.slice(0, 1);
        at('LIMIT', 'now', cut.length + '행'); view = { title: 'LIMIT이 남긴 행 (줄이 그어진 행은 빠짐)', head: [gname, 'total'], rows: grpView(final, function (g) { return g !== final[0]; }, true) };
        push('LIMIT 1: 맨 마지막에 처리됩니다. 정렬이 끝난 결과의 맨 앞 1행만 남깁니다. ' + (final.length > 1 ? '나머지 ' + (final.length - 1) + '행이 빠집니다.' : '결과가 이미 1행이라 빠지는 행은 없습니다.'), 'good');
        final = cut;
      }
    }
    var list = final ? final.map(function (g) { return g.member + ' ' + g.total; }) : null, ext = [];
    if (!err && ga) ext.push('GROUP BY');
    if (!err && !W && c.cond === 'alias') ext.push('HAVING');
    var extText = err ? '-' : ext.length ? ext.join('와 ') + '의 별칭' : '없음';
    if (!err && !lim) sum.push('ORDER BY가 없으므로 행이 나오는 순서는 정해져 있지 않습니다.');
    sum.push({ grpcol: '묶는 기준 컬럼에 대한 조건은 WHERE와 HAVING 어디에 적어도 결과가 같습니다. 다만 WHERE는 묶기 전에 행을 줄이고 HAVING은 다 묶은 뒤에 그룹을 버립니다. 그룹과 상관없이 거를 수 있는 조건은 WHERE에 적는 것이 원칙입니다.',
      rowcol: W ? 'WHERE는 합계를 내기 전에 행을 버립니다. 그래서 김철수의 합계가 450이 아니라 300으로 나왔습니다. 이 결과는 "300 이상인 주문만 골라 회원별로 더한 것"입니다. "합계가 300 이상인 회원"을 원했다면 HAVING SUM(amount) >= 300으로 적어야 하고, 그때는 김철수 450과 이영희 320이 나옵니다.' : '묶은 뒤에는 묶는 기준 컬럼과 집계 함수만 쓸 수 있습니다. 행 하나하나의 값으로 거르는 조건은 묶기 전에 처리되는 WHERE에 적어야 합니다.',
      agg: W ? '집계 함수로 거르는 조건은 묶은 뒤에 처리되는 HAVING에 적습니다. WHERE가 처리되는 시점에는 아직 그룹이 없습니다.' : '"300 이상"이라는 같은 말도 WHERE amount >= 300은 주문 한 건씩을, HAVING SUM(amount) >= 300은 회원별 합계를 거릅니다.',
      alias: W ? '별칭은 SELECT 단계에서 붙으므로, 그보다 먼저 처리되는 WHERE에서는 쓸 수 없습니다. MySQL만이 아니라 표준 SQL에서도 그렇습니다. 집계에 붙인 별칭으로 거르려면 조건을 HAVING으로 옮깁니다.' : 'MySQL은 HAVING에서 SELECT의 별칭을 받아 줍니다. 표준 SQL에는 없는 확장이라 다른 DB에서는 오류가 날 수 있습니다. 어디서나 통하게 적으려면 HAVING SUM(amount) >= 300처럼 식을 그대로 적습니다.' }[c.cond]);
    if (!err && ga) sum.push('GROUP BY에 별칭을 쓰는 것도 MySQL의 확장입니다. 처리 순서로 보면 GROUP BY는 SELECT보다 먼저이므로 표준 SQL에서는 별칭 대신 원래 컬럼이나 식을 적습니다.');
    if (!err && lim) sum.push('ORDER BY와 LIMIT은 맨 뒤에 처리됩니다. 그래서 LIMIT 1은 "거르고 묶은 결과 가운데 합계가 가장 큰 한 행"을 뜻합니다. ORDER BY 없이 LIMIT만 쓰면 어느 행이 남을지 정해져 있지 않습니다.');
    return { events: ev, summary: sum, err: err, list: list, ordered: lim, whereN: whereN,
      row: [err ? '오류 ' + err.no : '성공', err ? '-' : W ? '6행 중 ' + whereN + '행' : 'WHERE 없음', err ? '-' : list.length + '행: ' + list.join(', '), extText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 처리되는 순서대로 한 단계씩 진행합니다.'); return; }
    H.table(v, s.view.head, s.view.rows.map(function (r) { return { cls: r.cls, cells: r.cells }; }), s.view.title);
  },
  // 그림: 일곱 단계를 처리되는 순서대로 왼쪽에서 오른쪽으로 놓고, 아래에 지금 단계를 지난 행(또는 그룹)을 보여 준다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, self = this;
    P.size(680, 332);
    this.STAGES.forEach(function (n, i) {
      var x = 16 + i * 94, st = s ? s.stat[i] : null, usedNow = { WHERE: c.at === 'where', HAVING: c.at === 'having', 'ORDER BY': c.tail === 'limit', LIMIT: c.tail === 'limit' }[n];
      var k = st ? st.k : usedNow === false ? 'none' : 'wait';
      P.text('n' + i, x + 42, 26, (i + 1) + '번째', { cls: 'mut', anchor: 'middle' });
      P.box('s' + i, x, 34, 84, 48, { cls: k === 'now' ? 'hot now' : k === 'done' ? 'good' : k === 'err' ? 'bad now' : k === 'none' ? 'ghost' : 'plain', title: n, sub: st && st.n ? st.n : k === 'none' ? '없음' : '', center: true });
      if (i) P.arrow('a' + i, 's' + (i - 1) + ':r', 's' + i + ':l', { cls: 'mut' });
    });
    P.box('names', 16, 96, 648, 34, { cls: !s ? 'ghost' : s.err ? 'bad' : 'wait', title: '지금 쓸 수 있는 이름', right: s ? s.names : '?' });
    P.region('data', 16, 142, 648, 178, s ? s.view.title : '지금 단계를 지난 행');
    if (!s) { P.text('hint', 340, 230, '실행을 누르면 시작합니다', { cls: 'mut', anchor: 'middle' }); return; }
    s.view.rows.forEach(function (r, i) { P.box(r.id, 28 + (i % 2) * 318, 172 + Math.floor(i / 2) * 42, 306, 34, { cls: r.cls === 'gone' ? 'ghost' : r.id.charAt(0) === 'g' ? 'wait' : 'plain', title: r.t + (r.cls === 'gone' ? ' (빠짐)' : ''), right: r.right }); });
    if (s.err) P.text('errt', 340, 311, '오류 ' + s.err.no + ': ' + s.err.msg, { cls: 'bad', anchor: 'middle' });
    P.note('위의 일곱 칸은 SELECT 문의 절을 처리되는 순서대로 놓은 것입니다. 문장에 적는 순서(SELECT가 맨 앞)와 다릅니다. 점선 칸은 이 문장에 없는 절이고, 빨간 칸은 오류가 난 단계입니다. 아래는 그 단계를 지난 행이며, GROUP BY부터는 행이 아니라 그룹을 다룹니다.');
  },
  assume: '주문 6건의 작은 예입니다. 서른두 가지 조합(조건 네 가지 × 적는 곳 두 가지 × GROUP BY의 별칭 × 정렬과 자르기) 모두, 화면의 SQL을 실제 MySQL 8.4.11(기본 sql_mode, ONLY_FULL_GROUP_BY 포함)에서 그대로 실행해 오류 번호와 메시지, 최종 결과의 모든 행, WHERE 조건만으로 센 행 수가 모형과 같은 것을 대조했습니다. ORDER BY가 없는 조합은 행이 나오는 순서가 보장되지 않으므로 순서를 빼고 행의 내용만 비교했습니다. 일곱 단계는 "이 순서로 처리한 것과 같은 결과가 나온다"는 논리적 순서입니다. 실제 MySQL은 문장을 실행하기 전에 분석하는 단계에서 이름을 찾지 못하면 오류를 내므로, 오류가 나는 문장은 앞 단계도 실행되지 않습니다. 또 옵티마이저가 실제 실행 순서를 바꾸기도 하지만 결과는 논리적 순서대로 처리한 것과 같습니다. GROUP BY와 HAVING에서 SELECT의 별칭을 쓸 수 있다는 것은 MySQL에서 실행해 확인했고, 그것이 표준 SQL에 없는 확장이라는 설명은 실행이 아니라 MySQL 8.4 참조 설명서의 "MySQL Handling of GROUP BY" 절과 "Problems with Column Aliases" 절을 따랐습니다. 다른 DB에서 어떻게 되는지는 이 PC에서 실행해 보지 않았습니다. SELECT 절 안의 DISTINCT와 윈도 함수, JOIN이 처리되는 자리는 이 실습에서 다루지 않습니다(JOIN과 GROUP BY의 결과는 "JOIN과 GROUP BY" 실습에서 다룹니다).',
});
