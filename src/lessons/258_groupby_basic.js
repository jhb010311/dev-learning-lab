Lab.register({
  id: 'groupby_basic', nav: 'GROUP BY와 집계', cat: '기초개념', mode: 'step', basic: true, deep: ['join', 'windowfn', 'selectorder'],
  title: 'GROUP BY는 무엇을 묶고, COUNT와 SUM은 무엇을 세는가',
  intro: 'COUNT(*)와 SUM(price)는 여러 행을 값 하나로 줄이는 집계 함수입니다. COUNT(*)는 행이 몇 개인지, SUM(price)는 price를 모두 더하면 얼마인지를 돌려줍니다. GROUP BY member는 SELECT 문 뒤에 붙여서, member 값이 같은 행끼리 한 묶음으로 만들고 묶음마다 집계를 한 번씩 하게 합니다. 묶음 하나는 결과의 한 줄이 됩니다. 이 실습은 주문 5건이 든 orders 테이블에 같은 집계를 하면서, GROUP BY member를 지우고, 묶지 않은 열 id를 SELECT에 더 적고, WHERE 조건을 넣어 가며 결과가 몇 줄이고 어떤 모양인지를 봅니다.',
  terms: ['GROUP BY 절', '집계 함수', 'COUNT와 SUM', '묶지 않은 열과 ONLY_FULL_GROUP_BY'],
  controls: [
    { id: 'group', label: 'GROUP BY member를 쓴다', type: 'check', value: true },
    { id: 'extra', label: 'SELECT와 WHERE에 더하는 것', type: 'select', value: 'none', options: [['none', '더하는 것 없음'], ['col', 'SELECT에 묶지 않은 열 id를 적는다'], ['where', 'WHERE price >= 1000 조건을 넣는다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'GROUP BY member는 어떻게 생겼고, 주문 5행에 COUNT(*)와 SUM(price)를 구하면 무슨 일이 일어나나', d: 'member가 같은 행끼리 세 묶음이 되고, 묶음마다 한 줄씩 3행이 나옵니다.', v: { group: true, extra: 'none' } },
    { t: 'GROUP BY를 지우면', q: 'GROUP BY member를 지우고 SELECT의 member도 지우면', d: '묶음이 테이블 전체 하나뿐이어서 결과가 한 행입니다.', v: { group: false, extra: 'none' } },
    { t: 'id를 SELECT에 더 적으면', q: 'SELECT에 GROUP BY에 적지 않은 열 id를 더 적으면', d: '묶은 열도 집계도 아닌 id는 적을 수 없고 오류가 납니다.', v: { group: true, extra: 'col' } },
    { t: 'WHERE 조건을 넣으면', q: 'WHERE price >= 1000 조건을 넣으면', d: '묶기 전에 행이 걸러져서 lee 묶음의 개수와 합계가 달라집니다.', v: { group: true, extra: 'where' } },
    { t: 'GROUP BY 없이 id를 적으면', q: 'GROUP BY를 지운 채 SELECT에 id를 더 적으면', d: '집계와 함께 id를 적으면, 묶음이 하나뿐이어도 오류가 납니다.', v: { group: false, extra: 'col' } },
    { t: 'GROUP BY 없이 WHERE만 넣으면', q: 'GROUP BY를 지운 채 WHERE price >= 1000 조건을 넣으면', d: '걸러진 4행이 한 묶음이 되어 결과가 한 행입니다.', v: { group: false, extra: 'where' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/GroupByBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  base: [{ id: 1, m: 'kim', p: 1000 }, { id: 2, m: 'kim', p: 2000 }, { id: 3, m: 'lee', p: 500 }, { id: 4, m: 'lee', p: 1500 }, { id: 5, m: 'park', p: 3000 }],
  cols: function (c) { return (c.group ? 'member, ' : '') + (c.extra === 'col' ? 'id, ' : '') + 'COUNT(*), SUM(price)'; },
  code: function (c) {
    var g = !!c.group, ex = c.extra;
    var l = ['CREATE TABLE orders (id INT PRIMARY KEY, member VARCHAR(20), price INT);',
      "INSERT INTO orders VALUES (1, 'kim', 1000), (2, 'kim', 2000),",
      "    (3, 'lee', 500), (4, 'lee', 1500), (5, 'park', 3000);", '',
      'SELECT ' + this.cols(c), 'FROM orders' + (ex === 'where' || g ? '' : ';')];
    if (ex === 'where') l.push('-- WHERE: 조건에 맞는 행만 남긴다', 'WHERE price >= 1000' + (g ? '' : ';'));
    if (g) l.push('-- GROUP BY: member 값이 같은 행끼리 한 묶음으로 만든다', 'GROUP BY member', 'ORDER BY member;');
    return l.join('\n');
  },
  label: function (c) { return (c.group ? 'GROUP BY member' : 'GROUP BY 없음') + ' · ' + { none: '더한 것 없음', col: 'SELECT에 id 추가', where: 'WHERE price >= 1000' }[c.extra]; },
  columns: ['결과 행 수', '결과', '오류'],
  simulate: function (c) {
    var grp = !!c.group, ex = c.extra, col = ex === 'col', wh = ex === 'where', ev = [], sum = [];
    var base = this.base, kept = wh ? base.filter(function (r) { return r.p >= 1000; }) : base.slice();
    var st = { rows: base.map(function (r) { return { id: r.id, m: r.m, p: r.p, s: '', g: -1, k: 0, cur: false }; }), gs: [], res: [], err: '', n: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function ids(rs) { return rs.map(function (r) { return r.id; }).join(', '); }
    function total(rs) { return rs.reduce(function (a, r) { return a + r.p; }, 0); }
    function plus(rs) { return rs.length > 1 ? rs.map(function (r) { return r.p; }).join(' + ') + ' = ' + total(rs) : String(total(rs)); }
    function line(g) { return '(' + (grp ? g.key + ', ' : '') + g.rs.length + ', ' + total(g.rs) + ')'; }
    // 묶음: GROUP BY가 있으면 member마다 하나, 없으면 조건에 맞는 모든 행이 하나
    var keys = []; kept.forEach(function (r) { if (keys.indexOf(r.m) < 0) keys.push(r.m); });
    var G = grp ? keys.map(function (k) { return { key: k, rs: kept.filter(function (r) { return r.m === k; }) }; }) : [{ key: '', rs: kept }];
    function addGroup(i) {
      var g = G[i];
      st.gs.push({ key: g.key, ids: g.rs.map(function (r) { return r.id; }), n: null, sum: null, hot: false, amb: false });
      st.rows.forEach(function (r) { if (g.rs.some(function (x) { return x.id === r.id; })) { r.g = i; r.k = g.rs.indexOf(g.rs.filter(function (x) { return x.id === r.id; })[0]); } });
    }
    var sel = 'SELECT ' + this.cols(c) + ' FROM orders' + (wh ? ' WHERE price >= 1000' : '') + (grp ? ' GROUP BY member' : '');
    var cond = wh ? 'orders의 행 가운데 price가 1000 이상인 행만 골라 ' : '';

    // 1. 준비
    push('CREATE TABLE과 INSERT: DB가 orders 테이블을 만들고 행 5개를 넣습니다. 열은 id(주문 번호), member(주문한 사람), price(금액)입니다. kim이 2건, lee가 2건, park이 1건 주문했습니다. 아래 문장은 이 5행을 읽습니다.', '');

    // 2. 문장이 하는 일
    if (grp) {
      push(sel + ': ' + (wh ? cond + '그 행들을 ' : 'orders의 행을 ') + 'member 값이 같은 것끼리 묶고, 묶음마다 ' + (col ? 'member, id, COUNT(*), SUM(price) 네 가지를 ' : 'COUNT(*)와 SUM(price) 두 가지 집계를 한 번씩 계산해 ') + (col ? '한 줄에 보여 달라는 문장입니다. 다만 id는 GROUP BY에 적은 열도 아니고 COUNT나 SUM 같은 집계도 아닙니다.' : '한 줄씩 보여 달라는 문장입니다. COUNT(*)는 묶음 안의 행 수이고 SUM(price)는 묶음 안의 price를 모두 더한 값입니다. 묶고 세는 코드를 우리는 쓰지 않았습니다. DB가 이 문장을 받아 합니다.'), '');
    } else {
      push(sel + ': ' + (wh ? cond + '그 행들에 ' : 'orders의 행에 ') + (col ? 'id, COUNT(*), SUM(price) 세 가지를 구하는 문장입니다. 이 문장에는 GROUP BY가 없습니다. COUNT(*)와 SUM(price)는 집계 함수이고, 집계 함수를 쓰면서 GROUP BY를 적지 않으면 DB는 모든 행을 한 묶음으로 보고 한 번만 계산합니다. 다만 id는 집계 함수가 아닙니다.' : 'COUNT(*)와 SUM(price) 두 가지를 구하는 문장입니다. 이 문장에는 GROUP BY가 없습니다. 집계 함수를 쓰면서 GROUP BY를 적지 않으면 DB는 모든 행을 한 묶음으로 보고 한 번만 계산합니다. COUNT(*)는 묶음 안의 행 수이고 SUM(price)는 묶음 안의 price를 모두 더한 값입니다.'), '');
    }

    // 3. WHERE
    if (wh) {
      st.rows.forEach(function (r) { r.s = r.p >= 1000 ? 'keep' : 'drop'; });
      push('WHERE price >= 1000: DB가 행을 하나씩 보며 price가 1000 이상인지 확인합니다. id 3 행(lee, 500)은 1000보다 작아서 빠지고, id ' + ids(kept) + ' 행 ' + kept.length + '개가 남습니다. WHERE는 ' + (grp ? '묶기 전에 어느 행을 묶을지' : '집계하기 전에 어느 행을 집계할지') + ' 정합니다.', '');
    }

    // 4. 오류인 경우: id는 묶은 열도 집계도 아니다
    if (col) {
      G.forEach(function (g, i) { addGroup(i); });
      st.gs.forEach(function (g) { g.amb = true; });
      var kimIds = G[0].rs;
      var first = grp
        ? 'DB가 SELECT에 적은 열을 하나씩 따져 봅니다. member는 GROUP BY에 적은 열이고, COUNT(*)와 SUM(price)는 묶음마다 값 하나가 나오는 집계입니다. id는 둘 중 어느 것도 아닙니다. 묶음 하나는 결과의 한 줄이 되는데, kim 묶음 안에는 id가 ' + ids(kimIds).replace(', ', '과 ') + '로 둘이어서 그 한 줄의 id 칸에 무엇을 적어야 할지 정할 수 없습니다. lee 묶음도 마찬가지입니다. park 묶음은 id가 5 하나뿐입니다.'
        : 'DB가 SELECT에 적은 열을 하나씩 따져 봅니다. COUNT(*)와 SUM(price)는 모든 행을 한 묶음으로 보고 값 하나를 냅니다. 그래서 결과는 한 줄인데, id는 집계가 아니라 행마다 값이 다른 열이어서 한 묶음 안에 값이 다섯 개(' + ids(kept) + ')입니다. 그 한 줄의 id 칸에 무엇을 적어야 할지 정할 수 없습니다.';
      push(first, 'bad');
      st.err = grp ? 'id는 묶은 열도 집계도 아님' : 'id는 집계가 아닌 열'; st.n = '오류';
      push('DB가 결과를 만들지 못하고 오류를 돌려줍니다. H2가 돌려준 오류는 id 열이 GROUP BY 목록에 있어야 한다는 뜻입니다. 결과 행은 하나도 만들어지지 않았습니다.' + (grp ? ' H2는 묶음 안에 서로 다른 id가 있을 때 오류를 냈습니다. 같은 문장이라도 묶음마다 id가 하나씩뿐이면 오류 없이 실행되었습니다.' : ''), 'bad');
      sum.push(grp
        ? 'GROUP BY에 적지 않았고 집계도 아닌 열 id는 SELECT에 적을 수 없습니다. 묶음 하나가 결과의 한 줄이 되는데, kim 묶음 안에는 id가 1과 2로 둘이어서 한 줄에 무엇을 적을지 정할 수 없고, DB가 오류를 냈습니다.'
        : 'GROUP BY가 없어도, 집계와 함께 집계가 아닌 열 id를 적으면 오류가 납니다. 모든 행이 한 묶음이어서 결과는 한 줄인데, 그 줄의 id 칸에 id 1부터 5까지 가운데 무엇을 적을지 정할 수 없기 때문입니다.');
      sum.push('묶음 안에 값이 여럿인 열을 SELECT에 적으려면 MAX(id)처럼 집계 함수 안에 넣어 값 하나로 줄여야 합니다. H2에서 MAX(id)를 적은 문장은 오류 없이 실행되었습니다.');
      return { events: ev, summary: sum, G: G, kept: kept, row: ['-', '-', st.err] };
    }

    // 5. 묶기
    if (grp) {
      G.forEach(function (g, i) { addGroup(i); });
      st.rows.forEach(function (r) { r.cur = false; });
      push('GROUP BY member: DB가 ' + (wh ? '남은 ' + kept.length + '개 행' : '5개 행') + '을 member 값이 같은 것끼리 묶습니다. ' + G.map(function (g) { return 'member가 ' + g.key + '인 행(id ' + ids(g.rs) + ')'; }).join(', ') + '이 각각 한 묶음이 되어, 묶음은 ' + G.length + '개입니다. 묶음 안의 행 순서나 묶는 방법은 DB가 정합니다.', '');
    } else {
      addGroup(0);
      push('GROUP BY가 없으므로 ' + (wh ? '남은 ' + kept.length + '개 행' : '5개 행') + '(id ' + ids(kept) + ')이 모두 한 묶음입니다. 묶음은 1개입니다.', '');
    }

    // 6. 묶음마다 집계
    G.forEach(function (g, i) {
      var s = st.gs[i];
      s.n = g.rs.length; s.sum = total(g.rs);
      st.gs.forEach(function (x) { x.hot = false; }); s.hot = true;
      st.rows.forEach(function (r) { r.cur = r.g === i; });
      st.res.push(line(g));
      var head = i === 0;
      var name = grp ? g.key + ' 묶음' : '묶음';
      push(head
        ? name + (grp ? '(id ' + ids(g.rs) + ')' : '') + '에서 COUNT(*)는 묶음 안의 행 수라 ' + g.rs.length + '이고, SUM(price)는 price를 모두 더한 ' + plus(g.rs) + '입니다. ' + (grp ? '묶음마다 한 줄이 나오므로 ' + line(g) + ' 한 줄을 결과에 넣습니다.' : '묶음이 하나뿐이므로 ' + line(g) + ' 한 줄이 결과의 전부입니다.')
        : name + '(id ' + ids(g.rs) + '): COUNT(*)는 ' + g.rs.length + '이고 SUM(price)는 ' + plus(g.rs) + '입니다. ' + line(g) + ' 한 줄을 결과에 넣습니다.', 'good');
    });

    // 7. 결과
    st.gs.forEach(function (x) { x.hot = false; }); st.rows.forEach(function (r) { r.cur = false; });
    st.n = st.res.length;
    var fin = grp
      ? '결과는 ' + st.n + '행입니다. ' + (wh ? '조건에 맞은 행은 ' + kept.length + '개' : '주문은 5건') + (wh ? '였지만' : '이었지만') + ' 결과의 행 수는 행의 수가 아니라 묶음의 수입니다. ORDER BY member 때문에 member 순서로 나옵니다.'
      : '결과는 1행입니다. ' + (wh ? '조건에 맞은 행은 ' + kept.length + '개' : '주문은 5건') + (wh ? '였지만' : '이었지만') + ' 묶음이 하나뿐이어서 결과는 한 줄입니다. kim, lee, park별 값은 이 결과에서 알 수 없습니다.';
    push('SELECT의 결과: ' + fin, 'good');

    // 요약: 첫 줄은 물음의 답
    if (grp && !wh) {
      sum.push('GROUP BY member는 member 값이 같은 행끼리 한 묶음으로 만들고, 묶음마다 COUNT(*)와 SUM(price)를 한 번씩 계산해 한 줄씩 냅니다. 주문 5행이 kim, lee, park 세 묶음이 되어 결과는 3행입니다.');
      sum.push('결과의 행 수는 원래 행의 수가 아니라 묶음의 수입니다. 묶음마다 한 줄이 나오므로 SELECT에는 묶은 열(member)과 묶음마다 값 하나가 나오는 집계(COUNT, SUM)를 적습니다.');
    } else if (grp) {
      sum.push('WHERE price >= 1000은 묶기 전에 행을 거릅니다. price가 500인 id 3 행이 빠져서 lee 묶음은 id 4 하나만 남았고, COUNT(*)는 2에서 1로, SUM(price)는 2000에서 1500으로 바뀌었습니다.');
      sum.push('WHERE는 어느 행을 묶을지 정하고, GROUP BY는 남은 행을 묶습니다. 이 데이터에서는 세 사람 모두 1000 이상인 주문이 있어 묶음은 3개 그대로입니다.');
    } else if (!wh) {
      sum.push('GROUP BY를 지우면 테이블 전체가 한 묶음이 되어, COUNT(*)와 SUM(price)가 5행 전체에 대해 한 번만 계산됩니다. 결과는 한 행 (5, 8000)입니다.');
      sum.push('집계 함수는 여러 행을 값 하나로 줄입니다. GROUP BY는 그 줄이는 범위를 테이블 전체가 아니라 member 값이 같은 행끼리로 나누는 것입니다.');
    } else {
      sum.push('GROUP BY가 없으면 WHERE로 남은 4개 행이 한 묶음이 되어, 결과는 한 행 (4, 7500)입니다. 합계 8000에서 id 3 행의 500이 빠진 값입니다.');
      sum.push('WHERE는 집계할 행을 고르고, GROUP BY는 집계하는 범위를 나눕니다. 둘은 서로 다른 일을 합니다.');
    }
    return { events: ev, summary: sum, G: G, kept: kept, row: [st.n + '행', st.res.join(', '), '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, grp = !!sim.c.group;
    if (!s) { H.text(v, '실행을 누르면 테이블을 만드는 것부터 시작합니다.'); return; }
    function gname(i) { var g = s.gs[i]; return g.key ? g.key + ' 묶음' : '전체 한 묶음'; }
    H.table(v, ['id', 'member', 'price', '상태'], s.rows.map(function (r) { return { cls: r.s === 'drop' ? 'gone' : '', cells: [String(r.id), r.m, String(r.p), r.s === 'drop' ? 'WHERE에 맞지 않아 빠짐' : r.g >= 0 ? gname(r.g) : r.s === 'keep' ? 'WHERE에 맞음' : ''] }; }), 'orders 테이블');
    if (s.gs.length) H.table(v, ['묶음', '행의 id', 'COUNT(*)', 'SUM(price)'], s.gs.map(function (g) { return { cls: '', cells: [{ v: g.key ? g.key : '전체', cls: g.hot ? 'hot' : '' }, g.ids.join(', '), g.n === null ? '' : String(g.n), g.sum === null ? '' : String(g.sum)] }; }), '묶음');
    if (s.err) H.text(v, '오류: ' + s.err);
    else if (s.res.length) H.table(v, [(grp ? 'member, ' : '') + 'COUNT(*), SUM(price)'], s.res.map(function (r) { return { cls: '', cells: [r] }; }), 'SELECT의 결과');
    H.counters(v, [[s.gs.length, '묶음의 수'], [s.n === null ? '-' : s.n, '결과 행 수']]);
  },
  // 그림: 왼쪽에 orders의 5행(WHERE에 걸러진 행은 흐리게), 오른쪽에 묶음 상자(행에서 묶음으로 가는 화살표), 아래에 만들어진 결과 줄과 묶음·결과 행 수. id를 적었을 때는 묶음 안에 id가 여럿인 상자를 빨갛게 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, grp = !!c.group, G = sim.G, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 440);
    P.region('ro', 14, 16, 300, 262, 'orders 테이블 (id, member, price)');
    P.region('rg', 364, 16, 302, 262, grp ? '묶음 (member 값이 같은 행끼리)' : '묶음 (GROUP BY가 없으면 전체가 하나)');
    var rowsAll = s ? s.rows : [{ id: 1, m: 'kim', p: 1000 }, { id: 2, m: 'kim', p: 2000 }, { id: 3, m: 'lee', p: 500 }, { id: 4, m: 'lee', p: 1500 }, { id: 5, m: 'park', p: 3000 }];
    rowsAll.forEach(function (r, i) {
      var cls = r.s === 'drop' ? 'ghost' : r.cur ? 'hot now' : r.g >= 0 ? 'wait' : r.s === 'keep' ? 'hot' : 'plain';
      P.box('r' + i, 26, 44 + i * 42, 276, 34, { cls: cls, title: 'id ' + r.id + ' · ' + r.m + ' · ' + r.p, right: r.s === 'drop' ? '빠짐' : ' ' });
    });
    var gs = s ? s.gs : [];
    gs.forEach(function (g, i) {
      var y = grp ? 44 + i * 78 : 44, h = grp ? 68 : 224;
      var sub1 = 'id ' + g.ids.join(', ');
      var sub2 = g.amb ? (g.ids.length > 1 ? 'id 칸에 ' + g.ids.join(' 또는 ') + '?' : 'id 칸: ' + g.ids[0]) : g.n === null ? ' ' : 'COUNT(*) = ' + g.n + ' · SUM(price) = ' + g.sum;
      var cls = g.amb ? (g.ids.length > 1 ? 'bad' : 'wait') : g.hot ? 'hot now' : g.n !== null ? 'good' : 'wait';
      P.box('g' + i, 376, y, 278, h, { cls: cls, title: g.key ? g.key + ' 묶음' : '테이블 전체가 한 묶음', sub: [sub1, sub2] });
    });
    rowsAll.forEach(function (r, i) {
      if (r.g < 0 || !s) return;
      var n = s.rows.filter(function (x) { return x.g === r.g; }).length;
      P.arrow('a' + i, 'r' + i + ':r', 'g' + r.g + ':l:' + ((r.k + 1) / (n + 1)).toFixed(2), { cls: r.cur ? 'hot' : 'mut' });
    });
    P.region('rr', 14, 290, 652, 92, '만들어진 결과' + (grp ? ' (member, COUNT(*), SUM(price))' : ' (COUNT(*), SUM(price))'));
    var res = s ? s.res : [];
    if (s && s.err) P.text('te', 30, 330, '오류: ' + s.err, { cls: 'bad', anchor: 'start', bold: true });
    else if (!res.length) P.text('re', 340, 340, s ? '아직 결과가 없습니다' : '대기', { cls: 'mut', anchor: 'middle' });
    res.forEach(function (r, k) { P.text('t' + k, 30, 330 + k * 20, r, k === res.length - 1 && last && last.k === 'good' ? { cls: 'good', anchor: 'start' } : { anchor: 'start' }); });
    P.box('n1', 14, 394, 322, 36, { cls: gs.length ? 'wait' : 'ghost', title: '묶음의 수', right: gs.length + '개' });
    P.box('n2', 344, 394, 322, 36, { cls: s && s.err ? 'bad' : s && s.n !== null ? 'good' : 'ghost', title: '결과 행 수', right: s && s.n !== null ? (s.err ? '오류' : s.n + '행') : '-' });
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했습니다. 여섯 가지 조합을 모두, 화면의 SQL 전체(CREATE TABLE, INSERT, SELECT와 주석 줄)를 글자 그대로 문장 하나씩 실행해서, SELECT가 돌려준 행 수와 모든 행의 값, 오류가 났는지와 그 오류의 종류를 모형과 대조했습니다. 오류가 난 두 조합은 H2의 오류 코드 90016(id 열이 GROUP BY 목록에 있어야 한다는 메시지)이었고, 화면에는 그 종류만 한국어로 적었습니다. 단계 문장이 기대는 값도 H2에서 따로 확인했습니다: 행 수 5와 전체 합계 8000, price가 1000 이상인 행의 id(1, 2, 4, 5), 이름별 id 목록(kim은 1과 2, lee는 3과 4, park은 5)과 WHERE를 넣었을 때의 목록(lee는 4만), 이름별 서로 다른 id 수, 묶음이 3개라는 것, MAX(id)를 적은 문장이 오류 없이 실행된다는 것입니다. 예상과 달랐던 것: H2는 id를 적은 문장을 해석하는 단계(prepareStatement)에서는 오류를 내지 않았고, 실행하면서 한 묶음 안에 서로 다른 id가 있을 때 오류를 냈습니다. 그래서 park 행만 남기거나 묶음마다 id가 하나씩뿐이게(id 1, 3, 5) 행을 남기면 같은 모양의 문장이 오류 없이 실행되었습니다. 화면의 오류 단계 문장은 이 관찰을 따라 쓴 것입니다. 정의와 규칙은 문서를 열어 확인했습니다. MySQL 8.4 문서 14.19.1절 Aggregate Function Descriptions에서 집계 함수는 값의 집합에 대해 동작하고, GROUP BY 없이 쓰면 모든 행을 한 그룹으로 묶은 것과 같으며, COUNT(*)는 NULL이 있어도 행 수를 센다고 합니다. 14.19.3절 MySQL Handling of GROUP BY에서는 SQL 모드 ONLY_FULL_GROUP_BY가 기본으로 켜져 있고, GROUP BY에 적지 않았고 함수적으로 종속되지도 않은 열을 SELECT에 쓴 문장을 거부하며, GROUP BY 없이 집계 함수를 쓴 문장에서도 같다고 합니다. 15.2.13절 SELECT 문에서는 WHERE 조건에 맞는 행이 선택되고 WHERE에는 집계 함수를 쓸 수 없다고 합니다. H2는 문법 페이지(grammar.html)에 SELECT 설명이 없어 Commands 페이지의 SELECT를 열었습니다. GROUP BY는 식으로 결과를 묶고, GROUP BY 없이 집계 함수를 쓰면 모든 행이 함께 묶이며, 논리적인 실행 순서에서 WHERE가 GROUP BY보다 앞이라고 합니다. 네 문서 모두 웹 페이지를 요약해 주는 도구로 열었고 원문을 한 글자씩 확인한 것은 아닙니다. MySQL에서의 실행 대조는 하지 않았습니다. 따라서 MySQL이 같은 문장에서 같은 결과와 오류를 내는지는 실행으로 확인하지 않았고, 문서에 따르면 MySQL은 id의 값이 몇 개인지 보지 않고 문장에 적힌 열의 종류만 보고 거부하므로 H2와 오류를 내는 조건이 다릅니다. 화면의 INSERT는 5행 모두 그대로 보입니다. SELECT 끝에 ORDER BY member를 붙인 것은 묶음을 member 순서로 보이게 하려는 것이고, GROUP BY member를 지우면 결과에 member가 없으므로 ORDER BY member도 함께 지웠습니다. 단계 문장은 결과가 만들어지는 원리를 순서대로 풀어 쓴 것입니다. 실제로 DB가 행을 어떤 방법으로 묶는지는 DB가 정하며, 실행으로 확인한 것은 결과입니다. 이 실습은 HAVING, 둘 이상의 열로 묶기, NULL이 든 열, COUNT(열)과 AVG, 조인과 함께 쓰는 집계, ANY_VALUE를 다루지 않습니다. 집계한 뒤 조건을 거는 HAVING과 SELECT가 처리되는 순서는 "SELECT가 처리되는 순서"에서, 행을 합치지 않고 순위를 붙이는 방법은 "윈도우 함수"에서, 조인한 결과를 집계하는 것은 "JOIN과 GROUP BY"에서 다룹니다.',
});
