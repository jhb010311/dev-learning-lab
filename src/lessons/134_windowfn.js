Lab.register({
  id: 'windowfn', nav: '윈도우 함수', cat: '데이터베이스', mode: 'step',
  title: '행을 줄이지 않고 순위와 누계를 붙이려면',
  intro: 'GROUP BY는 여러 행을 한 행으로 합쳐서 합계를 냅니다. 윈도우 함수는 행을 그대로 둔 채, 행마다 순위나 누계 같은 값을 하나씩 옆에 붙입니다.',
  terms: ['윈도우 함수', 'ROW_NUMBER, RANK, DENSE_RANK', 'PARTITION BY', 'LAG와 LEAD', 'GROUP BY, WHERE, HAVING'],
  controls: [
    { id: 'fn', label: '계산 방법', type: 'select', value: 'rank', options: [['group', 'GROUP BY로 합계 (비교용)'], ['rownum', 'ROW_NUMBER() 줄 번호'], ['rank', 'RANK() 순위'], ['dense', 'DENSE_RANK() 순위'], ['sum', 'SUM(pts) OVER 누계'], ['lag', 'LAG(pts) 앞 행의 값']] },
    { id: 'part', label: '팀별로 따로 계산한다', type: 'check', value: false, hint: 'OVER 안에 PARTITION BY team을 넣습니다. GROUP BY를 골랐을 때는 GROUP BY team이 됩니다.' },
    { id: 'tie', label: '점수 데이터', type: 'select', value: 'yes', options: [['yes', '동점이 있음 (90점 둘, 70점 둘)'], ['no', '동점이 없음 (모두 다른 점수)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '90점 둘, 70점 둘로 동점이 있는 점수에 RANK() 순위를 붙이면 행이 어떻게 되나', d: 'RANK. 90점이 두 명이면 둘 다 1위이고 2위는 없습니다.', v: { fn: 'rank', part: false, tie: 'yes' } },
    { t: 'DENSE_RANK로 바꾸면', q: 'RANK() 대신 DENSE_RANK()로 순위를 붙이면', d: '동점 다음 순위를 건너뛰지 않습니다.', v: { fn: 'dense', part: false, tie: 'yes' } },
    { t: 'ROW_NUMBER로 바꾸면', q: 'RANK() 대신 ROW_NUMBER()로 줄 번호를 붙이면', d: '동점이어도 번호가 겹치지 않습니다.', v: { fn: 'rownum', part: false, tie: 'yes' } },
    { t: 'GROUP BY와 비교', q: 'RANK() 순위 대신 GROUP BY로 합계를 내고 팀별로 따로 계산하면', d: '6행이 팀별 2행으로 줄고 이름이 사라집니다.', v: { fn: 'group', part: true, tie: 'yes' } },
    { t: '팀별 순위', q: 'RANK() 순위를 팀별로 따로 계산하면', d: 'PARTITION BY team. 팀마다 1위부터 다시 매깁니다.', v: { fn: 'rank', part: true, tie: 'yes' } },
    { t: '누계인데 동점이 있으면', q: 'RANK() 대신 SUM(pts) OVER로 누계를 구하면', d: '동점인 두 행의 누계가 같게 나옵니다.', v: { fn: 'sum', part: false, tie: 'yes' } },
    { t: '앞 행의 값 가져오기', q: '동점이 없는 점수 데이터에서 LAG(pts)로 앞 행의 값을 팀별로 따로 가져오면', d: 'LAG. 팀의 첫 행은 앞 행이 없어 NULL입니다.', v: { fn: 'lag', part: true, tie: 'no' } },
  ],
  FN: { rownum: ['ROW_NUMBER()', 'num'], rank: ['RANK()', 'rnk'], dense: ['DENSE_RANK()', 'rnk'], sum: ['SUM(pts)', 'running'], lag: ['LAG(pts)', 'prev'] },
  rowsOf: function (c) {
    var t = c.tie === 'yes';
    return [[1, '가은', 'A', 90], [2, '나래', 'A', t ? 90 : 85], [3, '다솜', 'A', 70], [4, '라온', 'B', 80], [5, '마루', 'B', t ? 70 : 75], [6, '바다', 'B', 60]].map(function (r) { return { id: r[0], name: r[1], team: r[2], pts: r[3] }; });
  },
  code: function (c) {
    var head = '-- score 테이블 (6행)\n-- name  team  pts\n' + this.rowsOf(c).map(function (r) { return '-- ' + r.name + '   ' + r.team + '     ' + r.pts; }).join('\n') + '\n\n';
    if (c.fn === 'group') return head + (c.part ? 'SELECT team, SUM(pts) AS total\n  FROM score\n GROUP BY team\n ORDER BY team;' : 'SELECT SUM(pts) AS total\n  FROM score;');
    var f = this.FN[c.fn];
    return head + 'SELECT name, team, pts,\n       ' + f[0] + ' OVER (' + (c.part ? 'PARTITION BY team ' : '') + 'ORDER BY pts DESC) AS ' + f[1] + '\n  FROM score\n ORDER BY ' + (c.part ? 'team, ' : '') + 'pts DESC;';
  },
  label: function (c) { return (c.fn === 'group' ? 'GROUP BY' : this.FN[c.fn][0]) + (c.part ? ' · 팀별' : ' · 전체') + (c.tie === 'yes' ? ' · 동점 있음' : ' · 동점 없음'); },
  columns: ['결과 행 수', '계산된 값 (점수가 높은 순)', '동점인 두 행의 값'],
  // 실제 계산. 묶음(파티션)마다 점수가 높은 순으로 줄을 세우고 함수의 정의대로 값을 구한다.
  calc: function (c) {
    var rows = this.rowsOf(c), part = !!c.part, fn = c.fn, out = [];
    var parts = part ? ['A', 'B'].map(function (t) { return rows.filter(function (r) { return r.team === t; }); }) : [rows.slice()];
    parts.forEach(function (p) { p.sort(function (a, b) { return b.pts - a.pts || a.id - b.id; }); });
    function total(list) { return list.reduce(function (a, x) { return a + x.pts; }, 0); }
    if (fn === 'group') return { parts: parts, groups: parts.map(function (p) { return { team: part ? p[0].team : '', n: p.length, v: total(p) }; }), out: [] };
    parts.forEach(function (p, pi) {
      p.forEach(function (r, i) {
        var higher = p.filter(function (x) { return x.pts > r.pts; }), upto = p.filter(function (x) { return x.pts >= r.pts; }), kinds = {};
        higher.forEach(function (x) { kinds[x.pts] = 1; });
        var v = fn === 'rownum' ? i + 1 : fn === 'rank' ? higher.length + 1 : fn === 'dense' ? Object.keys(kinds).length + 1 : fn === 'sum' ? total(upto) : i > 0 ? p[i - 1].pts : null;
        out.push({ id: r.id, name: r.name, team: r.team, pts: r.pts, v: v, i: i, pi: pi, higher: higher.length, kinds: Object.keys(kinds).length, add: upto.map(function (x) { return x.pts; }),
          rowsFrame: fn === 'sum' ? total(p.slice(0, i + 1)) : null, prev: i > 0 ? p[i - 1] : null, tiePrev: i > 0 && p[i - 1].pts === r.pts, tieNext: i < p.length - 1 && p[i + 1].pts === r.pts });
      });
    });
    return { parts: parts, groups: [], out: out };
  },
  show1: function (c, v) { return v === null ? 'NULL' : c.fn === 'rank' || c.fn === 'dense' ? v + '위' : c.fn === 'rownum' ? v + '번' : String(v); },
  simulate: function (c) {
    var k = this.calc(c), part = !!c.part, fn = c.fn, ev = [], sum = [], st = { stage: 'read', done: 0 };
    function push(s, kind) { ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    push('FROM score: score 테이블에서 6행을 읽습니다. 한 행이 한 사람의 점수입니다.' + (c.tie === 'yes' ? ' 90점이 두 명(가은, 나래), 70점이 두 명(다솜, 마루) 있습니다.' : ' 점수는 모두 다릅니다.'));
    if (fn === 'group') {
      st.stage = 'over';
      push(part ? 'GROUP BY team: team 값이 같은 행끼리 묶습니다. A팀 3행과 B팀 3행, 두 묶음이 생깁니다.' : 'GROUP BY 없이 SUM(pts)만 썼습니다. 이때는 테이블 전체가 한 묶음입니다.');
      st.stage = 'end'; st.done = k.groups.length;
      push('SUM(pts): 묶음마다 합계를 하나씩 구합니다. ' + k.groups.map(function (g) { return (g.team ? g.team + '팀 ' : '전체 ') + g.v + '점'; }).join(', ') + '입니다. 묶음 하나가 결과 한 행이 되므로 6행이 ' + k.groups.length + '행으로 줄었습니다. 누가 몇 점이었는지는 결과에 남지 않습니다.', '');
      sum.push('GROUP BY는 묶음 하나를 결과 한 행으로 만듭니다. 합계는 얻지만 각 행의 이름과 점수는 사라집니다. "각 사람의 점수 옆에 순위나 누계를 함께 보고 싶다"면 행을 줄이지 않는 윈도우 함수가 필요합니다.');
      return { events: ev, summary: sum, k: k, row: [k.groups.length + '행', k.groups.map(function (g) { return (g.team ? g.team + '팀 ' : '') + g.v; }).join(' / '), '해당 없음'] };
    }
    var f = this.FN[fn], show1 = this.show1;
    st.stage = 'over';
    push('OVER (' + (part ? 'PARTITION BY team ' : '') + 'ORDER BY pts DESC): 값을 계산할 때 행들을 어떻게 놓고 볼지 정합니다. ' + (part ? '먼저 팀별로 나누고, 팀 안에서 점수가 높은 순으로 줄을 세웁니다.' : '전체 6행을 점수가 높은 순으로 줄을 세웁니다.') + ' 줄만 세울 뿐 행을 합치지 않습니다.');
    k.out.forEach(function (r, n) {
      var who = (part ? r.team + '팀 ' : '') + r.name + '(' + r.pts + '점): ', s = '', restart = part && r.i === 0 && r.pi > 0;
      if (fn === 'rownum') s = r.i === 0 ? (restart ? '팀이 바뀌었으므로 번호를 1부터 다시 붙입니다.' : 'ROW_NUMBER()는 줄 선 순서대로 1부터 번호를 붙입니다. 첫 행이므로 1입니다.') : (r.i + 1) + '번째 행이므로 ' + (r.i + 1) + '입니다.' + (r.tiePrev ? ' 앞 행과 점수가 같지만 번호는 겹치지 않습니다. 동점인 행 가운데 누가 앞 번호를 받는지는 정해져 있지 않습니다.' : '');
      else if (fn === 'rank') s = (r.higher === 0 ? (r.i > 0 ? '자기보다 점수가 높은 행이 없으므로 1입니다.' : restart ? '팀이 바뀌었으므로 이 팀 안에서만 비교합니다. 자기보다 점수가 높은 행이 없으므로 1입니다.' : 'RANK()는 자기보다 점수가 높은 행의 수에 1을 더합니다. 자기보다 높은 행이 없으므로 1입니다.') : '자기보다 점수가 높은 행이 ' + r.higher + '개이므로 ' + r.v + '입니다.') + (r.tiePrev ? ' 앞 행과 동점이라 순위가 같습니다.' : r.i > 0 && k.out[n - 1].v !== r.v - 1 ? ' 앞의 동점 두 행이 자리를 둘 차지했으므로 ' + (r.v - 1) + '위는 건너뜁니다.' : '');
      else if (fn === 'dense') s = (r.kinds === 0 ? (r.i > 0 ? '더 높은 점수가 없으므로 1입니다.' : restart ? '팀이 바뀌었으므로 이 팀 안에서만 비교합니다. 더 높은 점수가 없으므로 1입니다.' : 'DENSE_RANK()는 자기보다 높은 점수가 몇 가지인지 세어 1을 더합니다. 더 높은 점수가 없으므로 1입니다.') : '자기보다 높은 점수가 ' + r.kinds + '가지이므로 ' + r.v + '입니다.') + (r.tiePrev ? ' 앞 행과 동점이라 순위가 같습니다.' : r.i > 0 && k.out[n - 1].tiePrev ? ' 앞에 동점이 있었지만 순위를 건너뛰지 않습니다.' : '');
      else if (fn === 'sum') s = (r.i === 0 ? (restart ? '팀이 바뀌었으므로 누계를 처음부터 다시 셉니다. ' : 'ORDER BY가 있는 SUM은 줄의 첫 행부터 지금 행까지를 더합니다. ') : '') + (r.add.length === 1 ? '첫 행이므로 자기 점수 그대로 ' + r.v + '입니다.' : r.add.join(' + ') + ' = ' + r.v + '입니다.') + (r.tieNext ? ' 정렬 기준인 점수가 같은 다음 행까지 같은 자리로 보고 함께 더했습니다.' : r.tiePrev ? ' 앞 행과 동점이라 더하는 범위가 같고, 누계도 같습니다.' : '');
      else s = r.i === 0 ? (restart ? '팀이 바뀌어 이 팀의 첫 행입니다. 앞 행이 없으므로 NULL입니다.' : 'LAG(pts)는 줄에서 바로 앞에 있는 행의 pts를 가져옵니다. 첫 행은 앞 행이 없으므로 NULL입니다.') : '바로 앞 행 ' + r.prev.name + '의 점수인 ' + r.prev.pts + '점을 가져옵니다.';
      st.stage = 'row'; st.done = n + 1;
      push(who + s, '');   // 동점인 행도 SQL 정의대로 값이 붙은 정상 결과다(오류가 아니다)
    });
    st.stage = 'end';
    push('ORDER BY ' + (part ? 'team, ' : '') + 'pts DESC: 결과를 내보냅니다. 6행이 그대로 6행이고, 행마다 ' + f[1] + ' 컬럼의 값이 하나씩 붙었습니다.', 'good');
    var vals = k.parts.map(function (p, pi) { return (part ? p[0].team + '팀 ' : '') + k.out.filter(function (r) { return r.pi === pi; }).map(function (r) { return r.v === null ? 'NULL' : r.v; }).join(', '); }).join(' / ');
    var tied = k.out.filter(function (r) { return r.tiePrev; }), tieCol = !tied.length ? '동점 없음' : tied.every(function (r) { return r.v === k.out[k.out.indexOf(r) - 1].v; }) ? '서로 같음' : '서로 다름';
    if (fn === 'rownum' || fn === 'rank' || fn === 'dense') sum.push(c.tie === 'yes' ? '동점을 다루는 방법이 세 함수의 차이입니다. 90, 90, 80점에 ROW_NUMBER는 1, 2, 3(동점이어도 다른 번호), RANK는 1, 1, 3(같은 순위를 주고 다음 순위를 건너뜀), DENSE_RANK는 1, 1, 2(같은 순위를 주고 건너뛰지 않음)를 붙입니다.' : '동점이 없으면 ROW_NUMBER, RANK, DENSE_RANK의 결과가 똑같습니다. 차이는 동점이 있을 때만 드러납니다.');
    if (fn === 'rownum' && c.tie === 'yes') sum.push('ROW_NUMBER는 "한 묶음에서 한 행만 고르기"(예: 팀별 최고 점수 한 명)에 자주 씁니다. 다만 동점인 행의 순서는 정해져 있지 않으므로, 항상 같은 결과가 필요하면 ORDER BY에 겹치지 않는 컬럼을 덧붙입니다.');
    if (fn === 'sum') sum.push(c.tie === 'yes' ? '누계에서 동점인 행은 값이 같게 나옵니다. ORDER BY만 적으면 "정렬 값이 같은 행까지 함께" 더하는 것이 기본 범위이기 때문입니다. 행 하나씩 차례로 쌓으려면 OVER 안에 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW를 적습니다. 그러면 이 데이터의 누계는 ' + k.parts.map(function (p, pi) { return (part ? p[0].team + '팀 ' : '') + k.out.filter(function (r) { return r.pi === pi; }).map(function (r) { return r.rowsFrame; }).join(', '); }).join(' / ') + '이 됩니다.' : 'SUM에 OVER (ORDER BY ...)를 붙이면 전체 합계가 아니라 첫 행부터 지금 행까지의 합계, 곧 누계가 됩니다. 날짜순 매출 누계 같은 계산에 씁니다.');
    if (fn === 'lag') sum.push('LAG는 다른 행의 값을 지금 행 옆으로 가져옵니다. "어제 값과 오늘 값의 차이"처럼 앞뒤 행을 비교하는 계산을, 같은 테이블을 다시 조인하지 않고 쓸 수 있습니다. 앞 행이 없는 첫 행은 NULL이 됩니다.');
    if (part) sum.push('PARTITION BY team은 계산 범위를 팀별로 나눌 뿐 행을 합치지 않습니다. 팀이 바뀌면 번호, 순위, 누계, 앞 행이 모두 처음부터 다시 시작합니다.');
    return { events: ev, summary: sum, k: k, row: ['6행', vals, tieCol] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, k = sim.k, last = shown[shown.length - 1], s = last ? last.snap : null, show1 = this.show1;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    if (c.fn === 'group') {
      H.table(v, ['name', 'team', 'pts'], this.rowsOf(c).map(function (r) { return { cls: s.stage === 'end' ? 'gone' : '', cells: [r.name, r.team, String(r.pts)] }; }), 'score 테이블 (읽은 6행)');
      return;
    }
    var list = s.stage === 'read' ? this.rowsOf(c).map(function (r) { return { name: r.name, team: r.team, pts: r.pts, v: undefined }; }) : k.out;
    H.table(v, ['name', 'team', 'pts', this.FN[c.fn][1]], list.map(function (r, n) {
      var done = s.stage !== 'read' && n < s.done, cur = s.stage === 'row' && n === s.done - 1;
      return { cells: [r.name, r.team, String(r.pts), { v: done ? (r.v === null ? 'NULL' : String(r.v)) : '?', cls: cur ? 'hot' : done ? 'good' : '' }] };
    }), s.stage === 'read' ? 'score 테이블 (읽은 6행)' : '줄 세운 6행과 붙은 값');
  },
  // 그림: 왼쪽에 score 테이블의 6행, 오른쪽에 결과. GROUP BY는 여러 행이 한 상자로 모이고, 윈도우 함수는 행마다 값이 붙은 상자가 하나씩 생긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, k = sim.k, last = shown[shown.length - 1], s = last ? last.snap : { stage: 'none', done: 0 }, show1 = this.show1, part = !!c.part;
    var sorted = s.stage !== 'none' && s.stage !== 'read', order = sorted ? [].concat.apply([], k.parts) : this.rowsOf(c);
    P.size(680, 300);
    P.region('src', 16, 16, 250, 268, 'score 테이블');
    P.region('dst', 414, 16, 250, 268, c.fn === 'group' ? '결과 (묶음마다 한 행)' : '결과 (행마다 값이 붙음)');
    function y(n, r) { return 48 + n * 36 + (sorted && part && r.team === 'B' ? 10 : 0); }
    order.forEach(function (r, n) {
      var cur = s.stage === 'row' && n === s.done - 1;
      P.box('s' + r.id, 30, y(n, r), 222, 30, { cls: (r.team === 'A' ? 'wait' : 'hot') + (cur ? ' now' : ''), title: r.name + ' · ' + r.team + '팀', right: r.pts + '점' });
    });
    if (c.fn === 'group') {
      k.groups.forEach(function (g, gi) {
        var on = s.stage === 'end', mid = part ? 48 + (gi * 3 + 1) * 36 + (gi ? 10 : 0) : 48 + 2.5 * 36;
        P.box('g' + gi, 428, mid, 222, 30, on ? { cls: 'good', title: (g.team ? g.team + '팀 ' : '전체 ') + '합계', right: String(g.v) } : { cls: 'ghost', title: s.stage === 'over' ? (g.team ? g.team + '팀 묶음' : '전체 한 묶음') : '?' });
        if (sorted) k.parts[gi].forEach(function (r) { P.arrow('a' + r.id, 's' + r.id + ':r', 'g' + gi + ':l', { cls: on ? 'good' : 'mut' }); });
      });
      P.text('fn', 340, 36, part ? 'GROUP BY team' : 'SUM(pts)', { anchor: 'middle', bold: true });
      P.note('왼쪽의 6행이 오른쪽에서 ' + k.groups.length + '행으로 줄어듭니다. 파란 상자는 A팀, 노란 상자는 B팀입니다.');
      return;
    }
    order.forEach(function (r, n) {
      var o = k.out.filter(function (x) { return x.id === r.id; })[0], done = sorted && k.out.indexOf(o) < s.done, cur = s.stage === 'row' && k.out.indexOf(o) === s.done - 1;
      P.box('d' + r.id, 428, y(n, r), 222, 30, done ? { cls: 'good' + (cur ? ' now' : ''), title: r.name + ' ' + r.pts + '점', right: show1(c, o.v) } : { cls: 'ghost', title: sorted ? r.name + ' ' + r.pts + '점' : '?', right: sorted ? '?' : '' });
      if (done) P.arrow('a' + r.id, 's' + r.id + ':r', 'd' + r.id + ':l', { cls: cur ? 'hot' : 'mut' });
    });
    P.text('fn', 340, 36, this.FN[c.fn][0], { anchor: 'middle', bold: true });
    P.note('왼쪽의 한 행이 오른쪽의 한 행으로 그대로 이어집니다. 파란 상자는 A팀, 노란 상자는 B팀이며' + (part ? ', 팀 사이의 빈 줄이 PARTITION BY로 나눈 경계입니다.' : ' 팀을 나누지 않아 모든 행이 한 줄로 이어집니다.'));
  },
  assume: '스물네 가지 조합 모두, 화면의 SQL과 같은 문장을 MySQL 8.4에서 실행해 결과 행 수와 행마다 붙은 값을 대조했습니다. 누계에 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW를 적었을 때의 값도 같은 방법으로 확인했습니다. 동점인 행 가운데 어느 행이 먼저 놓이는지는 SQL이 정하지 않으므로(MySQL 문서의 ROW_NUMBER 설명), 화면에서 동점인 두 사람의 순서는 한 가지 예이며 대조는 이름이 아니라 팀, 점수, 붙은 값으로 했습니다. 윈도우 함수는 MySQL 8.0부터 쓸 수 있습니다. 단계 문장의 계산 방법(자기보다 높은 행의 수에 1을 더함 등)은 함수의 정의를 풀어 쓴 것이고, 실제 DB는 정렬한 뒤 한 번 훑으며 값을 구합니다.',
});
