Lab.register({
  id: 'join_basic', nav: '조인', cat: '기초개념', mode: 'step', basic: true, deep: ['join'],
  title: '조인은 무엇을 이어 붙이고, ON은 무엇을 정하는가',
  intro: '조인은 두 테이블의 행을 옆으로 이어 붙이는 SELECT입니다. 이 실습의 orders 테이블에는 주문한 회원의 번호(member_id)만 적혀 있고 이름은 member 테이블에 있어서, 주문한 물건과 주문한 사람의 이름을 함께 보려면 두 테이블을 이어야 합니다. JOIN member m은 이어 붙일 테이블을 정하고, ON o.member_id = m.id는 "어떤 행끼리 짝인지"를 정합니다. DB는 주문 행마다 ON 조건이 맞는 회원 행을 찾아 한 줄로 붙입니다. 이 실습은 JOIN을 지우거나 ON 조건을 없애고, 짝이 없는 주문을 넣어 가며 같은 SQL을 실행해, 결과가 몇 줄이고 어떤 모양인지를 봅니다.',
  terms: ['JOIN (INNER, OUTER)', 'ON 조건', '테이블 별칭', '카테시안 곱'],
  controls: [
    { id: 'how', label: 'orders를 읽는 방법', type: 'select', value: 'join', options: [['join', 'JOIN member m ON o.member_id = m.id'], ['none', 'JOIN을 쓰지 않는다 (orders만 읽는다)'], ['cross', 'ON 조건 없이 잇는다: CROSS JOIN member m']] },
    { id: 'orphan', label: '회원이 없는 주문을 하나 더 넣는다: (13, 9, 헤드셋)', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '조인은 어떻게 생겼고, 주문과 회원을 이으면 무엇이 나오나', d: '주문 행마다 ON 조건에 맞는 회원 행이 붙어, 물건과 회원의 이름이 한 줄에 나옵니다.', v: { how: 'join', orphan: false } },
    { t: 'JOIN을 지우고 orders만 읽으면', q: 'JOIN을 지우고 orders만 읽으면', d: '이름이 아니라 member_id 번호만 읽힙니다.', v: { how: 'none', orphan: false } },
    { t: 'ON 조건 없이 이으면', q: 'ON 조건 없이 이으면', d: '짝을 가리지 않고 모든 주문에 모든 회원이 붙습니다.', v: { how: 'cross', orphan: false } },
    { t: '짝이 되는 회원이 없는 주문이 있으면', q: '짝이 되는 회원이 없는 주문이 있으면', d: '회원이 없는 주문은 JOIN의 결과에 나오지 않습니다.', v: { how: 'join', orphan: true } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/JoinBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  members: [{ id: 1, name: '김철수' }, { id: 2, name: '이영희' }],
  ordersOf: function (c) {
    var o = [{ id: 10, mid: 1, item: '키보드' }, { id: 11, mid: 1, item: '마우스' }, { id: 12, mid: 2, item: '모니터' }];
    if (c.orphan) o.push({ id: 13, mid: 9, item: '헤드셋' });
    return o;
  },
  code: function (c) {
    var l = ['CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20));',
      'CREATE TABLE orders (id INT PRIMARY KEY, member_id INT, item VARCHAR(20));',
      "INSERT INTO member VALUES (1, '김철수'), (2, '이영희');",
      "INSERT INTO orders VALUES (10, 1, '키보드'), (11, 1, '마우스'),",
      "    (12, 2, '모니터')" + (c.orphan ? ", (13, 9, '헤드셋');" : ';'), ''];
    if (c.how === 'none') l.push('SELECT o.item, o.member_id', 'FROM orders o', 'ORDER BY o.id;');
    else {
      l.push('-- 조인: orders의 행에 member의 행을 옆으로 붙인다', 'SELECT o.item, m.name', 'FROM orders o');
      if (c.how === 'join') l.push('-- ON: member_id가 회원의 id와 같은 행끼리 짝이다', 'JOIN member m ON o.member_id = m.id', 'ORDER BY o.id;');
      else l.push('CROSS JOIN member m', 'ORDER BY o.id, m.id;');
    }
    return l.join('\n');
  },
  label: function (c) { return { join: 'JOIN ... ON', none: 'JOIN 없음', cross: 'ON 없이 CROSS JOIN' }[c.how] + ' · ' + (c.orphan ? '회원이 없는 주문 있음' : '모든 주문에 회원 있음'); },
  columns: ['결과의 행 수', '읽힌 결과'],
  // 결과가 길면 앞의 네 행과 모두 몇 행인지로 줄인다. 대조 스크립트도 같은 규칙을 쓴다.
  shorten: function (rows) {
    var t = rows.slice(0, 4).join(', ');
    return rows.length > 4 ? t + ', … (모두 ' + rows.length + '행)' : t;
  },
  simulate: function (c) {
    var how = c.how, orph = !!c.orphan, ms = this.members, os = this.ordersOf(c), ev = [], sum = [];
    // 상태: cur는 지금 보고 있는 주문, links는 처리한 주문에 붙은 회원(위치), miss는 지금 주문에 짝이 없음, res는 만들어진 결과 줄, fresh는 방금 늘어난 줄 수
    var st = { cur: -1, links: [], res: [], fresh: 0, miss: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function memIdx(mid) { for (var i = 0; i < ms.length; i++) if (ms[i].id === mid) return i; return -1; }
    function line(o, mi) { return [o.item, how === 'none' ? String(o.mid) : ms[mi].name]; }
    function ot(o) { return '주문 ' + o.id + ' 행(member_id ' + o.mid + ', ' + o.item + ')'; }
    function q(a) { return '"' + a[0] + ', ' + a[1] + '"'; }
    var sel = how === 'none' ? 'SELECT o.item, o.member_id FROM orders o' : how === 'join' ? 'SELECT o.item, m.name FROM orders o JOIN member m ON o.member_id = m.id' : 'SELECT o.item, m.name FROM orders o CROSS JOIN member m';

    // 1. 테이블과 행 준비
    push('CREATE TABLE과 INSERT: DB가 member와 orders 두 테이블을 만들고 행을 넣습니다. member에는 회원 2명(id 1 김철수, id 2 이영희)이 있고, orders에는 주문 ' + os.length + '개(' + os.map(function (o) { return o.id + '번 ' + o.item; }).join(', ') + ')가 있습니다. orders에는 누가 주문했는지가 member_id 열의 번호로만 적혀 있습니다(주문 10의 member_id는 1). 그 번호에 해당하는 이름은 member 테이블에만 있습니다.', '');

    // 2. SELECT가 하는 일
    if (how === 'join') push(sel + ': 주문한 물건과 회원의 이름을 함께 읽는 SELECT입니다. FROM orders o는 orders 테이블을 읽는다는 뜻(o는 orders의 짧은 이름)이고, JOIN member m은 member 테이블(m은 member의 짧은 이름)을 이어 붙인다는 뜻이며, ON o.member_id = m.id는 주문 행의 member_id와 회원 행의 id가 같은 행끼리 짝이라는 뜻입니다. 결과가 만들어지는 원리를 순서대로 풀어 쓰면, DB가 orders의 행마다 ON 조건에 맞는 member의 행을 찾아 옆으로 붙입니다. 실제로 DB가 어느 테이블부터 어떤 방법으로 찾는지는 DB가 정합니다.', '');
    else if (how === 'none') push(sel + ': FROM에 orders 하나만 적었고 JOIN이 없습니다. 그래서 DB가 읽는 테이블은 orders뿐이고, member 테이블은 읽지 않습니다. DB가 orders의 행을 하나씩 읽어 SELECT에 적은 item과 member_id 두 열의 값을 꺼냅니다.', '');
    else push(sel + ': orders와 member를 CROSS JOIN으로 잇습니다. 이 SELECT에는 ON 조건이 없습니다. 어떤 행끼리 짝인지를 정하는 조건이 없으므로, 결과가 만들어지는 원리를 풀어 쓰면 DB는 orders의 행마다 member의 모든 행을 하나씩 붙입니다.', '');

    // 3. 주문 행마다
    os.forEach(function (o, i) {
      var head = i === 0, mi = memIdx(o.mid);
      st.cur = i; st.fresh = 0; st.miss = false;
      if (how === 'none') {
        st.links[i] = []; st.res.push(line(o, 0)); st.fresh = 1;
        var prior = os.slice(0, i).some(function (p) { return p.mid === o.mid; });
        push(head ? 'DB가 orders에서 먼저 ' + ot(o) + '을 읽어 item과 member_id를 꺼내 ' + q(line(o, 0)) + ' 한 줄을 결과에 넣습니다. member_id 1은 회원의 번호일 뿐입니다. 그 번호의 이름은 member 테이블에 있는데 이 SELECT는 member를 읽지 않으므로, 결과에서는 이름을 알 수 없습니다.'
          : mi < 0 ? 'DB가 ' + ot(o) + '을 읽어 ' + q(line(o, 0)) + ' 한 줄을 결과에 넣습니다. JOIN이 없으면 짝을 찾지 않으므로, member에 id가 ' + o.mid + '인 회원이 없어도 이 주문은 결과에 나옵니다.'
          : 'DB가 ' + ot(o) + '을 읽어 ' + q(line(o, 0)) + ' 한 줄을 결과에 넣습니다.' + (prior ? ' member_id 번호만 읽히므로 앞의 주문과 같은 회원인지는 번호를 직접 봐야 압니다.' : ''), mi < 0 ? 'bad' : '');
      } else if (how === 'join') {
        if (mi < 0) {
          st.links[i] = []; st.miss = true;
          push('DB가 ' + ot(o) + '을 봅니다. ON 조건에 맞는 member의 행을 찾지만, member_id ' + o.mid + '와 같은 id를 가진 회원이 없으므로 붙일 행이 없습니다. 이 주문은 결과에 나오지 않습니다.', 'bad');
        } else if (head) {
          st.links[i] = [mi];
          push('DB가 orders에서 먼저 ' + ot(o) + '을 봅니다. ON 조건 o.member_id = m.id에 맞는 member의 행을 찾습니다. 이 주문의 member_id가 ' + o.mid + '이므로 id가 ' + o.mid + '인 행, ' + ms[mi].name + ' 행이 짝입니다.', '');
          st.res.push(line(o, mi)); st.fresh = 1;
          push('DB가 주문 ' + o.id + ' 행과 ' + ms[mi].name + ' 행을 옆으로 붙입니다. 붙인 행에서 SELECT에 적은 o.item(' + o.item + ')과 m.name(' + ms[mi].name + ')을 꺼내 ' + q(line(o, mi)) + ' 한 줄을 결과에 넣습니다. orders에는 없던 이름이 같은 줄에 나왔습니다. 이것이 조인입니다.', 'good');
        } else {
          st.links[i] = [mi]; st.res.push(line(o, mi)); st.fresh = 1;
          var again = os.slice(0, i).some(function (p) { return p.mid === o.mid; });
          push('DB가 ' + ot(o) + '의 짝으로 id가 ' + o.mid + '인 ' + ms[mi].name + ' 행을 찾아 붙이고, ' + q(line(o, mi)) + ' 한 줄을 결과에 넣습니다.' + (again ? ' 앞의 주문에도 같은 ' + ms[mi].name + ' 행이 붙었습니다. 회원 한 행이 여러 주문에 붙을 수 있습니다.' : ''), 'good');
        }
      } else {
        st.links[i] = ms.map(function (m, j) { return j; });
        ms.forEach(function (m, j) { st.res.push(line(o, j)); }); st.fresh = ms.length;
        var pair = ms.map(function (m, j) { return q(line(o, j)); }).join('와 ');
        push(head ? 'DB가 orders에서 먼저 ' + ot(o) + '을 봅니다. 조건이 없으므로 member_id는 보지 않고, member의 두 행(김철수, 이영희)을 모두 붙입니다. ' + pair + ' 두 줄이 결과에 들어갑니다. 이 주문을 한 사람은 김철수인데, 이영희 행도 붙었습니다.'
          : mi < 0 ? 'DB가 ' + ot(o) + '을 봅니다. 조건이 없으므로 member_id ' + o.mid + '에 맞는 회원이 없어도 상관없이 member의 두 행을 모두 붙이고, ' + pair + ' 두 줄을 결과에 넣습니다.'
          : 'DB가 ' + ot(o) + '에도 member의 두 행을 모두 붙이고, ' + pair + ' 두 줄을 결과에 넣습니다.', head || mi < 0 ? 'bad' : '');
      }
    });

    // 4. 결과
    st.cur = -1; st.fresh = 0; st.miss = false;
    var n = st.res.length, texts = st.res.map(function (r) { return r[0] + '·' + r[1]; });
    var fin = how === 'none' ? 'orders의 행을 모두 읽었습니다. 결과는 ' + n + '행이고, 회원은 이름이 아니라 번호로만 보입니다.'
      : how === 'join' ? 'orders의 행을 모두 보았습니다. 결과는 ' + n + '행입니다.' + (orph ? ' 주문은 4개이지만 짝이 없는 주문 13이 빠졌습니다.' : ' 주문 3개마다 한 줄씩 만들어졌습니다.')
      : 'orders의 행을 모두 보았습니다. 결과는 ' + n + '행입니다. 주문 ' + os.length + '개에 회원 2명을 곱한 수만큼 줄이 만들어졌습니다.';
    push('SELECT의 결과: ' + fin, how === 'cross' ? 'bad' : how === 'join' ? 'good' : '');

    // 요약: 첫 줄은 물음의 답
    var S = {
      'join|false': ['조인은 두 테이블의 행을 옆으로 이어 붙이는 것입니다. JOIN은 이어 붙일 테이블을, ON은 어떤 행끼리 짝인지를 정하고, DB는 주문 행마다 ON 조건이 맞는 회원 행을 찾아 한 줄로 붙였습니다. 그래서 주문한 물건과 회원의 이름이 한 줄에 나왔습니다.', '주문 3개가 결과 3행이 되었습니다. 김철수 행은 주문 두 개에 붙었는데, ON 조건에 맞는 행이 여러 주문에 붙을 수 있기 때문입니다.'],
      'join|true': ['짝이 되는 회원이 없는 주문 13은 JOIN의 결과에 나오지 않았습니다. member_id 9와 같은 id를 가진 회원이 없어서 ON 조건에 맞는 행이 없었기 때문입니다.', 'orders에는 4행이 있지만 결과는 3행입니다. 이 JOIN은 짝이 있는 행만 남깁니다. 짝이 없는 주문까지 남기는 조인(LEFT JOIN)은 이 실습에서 다루지 않습니다.'],
      'none|false': ['JOIN을 쓰지 않으면 orders 테이블에 적힌 것만 읽힙니다. 회원은 이름이 아니라 member_id 번호(1, 1, 2)로만 보입니다.', '이름은 member 테이블에 있고 orders에는 번호만 있습니다. 주문한 사람의 이름을 함께 보려면 두 테이블을 JOIN으로 이어야 합니다.'],
      'none|true': ['JOIN이 없으면 짝을 찾지 않으므로, 회원이 없는 주문 13도 결과에 나옵니다. 읽힌 줄은 orders의 4행 그대로입니다.', 'member_id 9라는 번호는 읽히지만 그 번호의 회원이 있는지는 이 SELECT가 확인하지 않습니다. JOIN을 쓰면 짝이 없는 주문은 결과에서 빠집니다.'],
      'cross|false': ['ON 조건 없이 이으면 DB는 짝을 가리지 않고 모든 주문에 모든 회원을 하나씩 붙입니다. 주문 3개와 회원 2명이 6행이 되었습니다.', '키보드를 주문한 사람은 김철수뿐인데 이영희와 짝이 된 줄도 나왔습니다. 어떤 행끼리 짝인지를 정하는 것이 ON이고, ON이 없으면 두 테이블의 행 수를 곱한 만큼 줄이 늘어납니다.'],
      'cross|true': ['ON 조건 없이 이으면 회원이 없는 주문 13에도 모든 회원이 붙습니다. 주문 4개와 회원 2명이 8행이 되었습니다.', 'ON이 없으면 member_id를 보지 않으므로 짝이 없는 주문도 빠지지 않고, 맞지 않는 짝의 줄이 함께 나옵니다. 짝을 가리는 일은 ON이 합니다.'],
    };
    S[how + '|' + orph].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, row: [n + '행', this.shorten(texts)], ords: os, ms: ms };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, os = sim.ords, ms = sim.ms;
    if (!s) { H.text(v, '실행을 누르면 테이블을 만드는 것부터 시작합니다.'); return; }
    H.table(v, ['id', 'member_id', 'item'], os.map(function (o, i) { var k = i === s.cur ? (s.miss ? 'bad' : 'hot') : ''; return { cls: '', cells: [{ v: String(o.id), cls: k }, { v: String(o.mid), cls: k }, { v: o.item, cls: k }] }; }), 'orders 테이블');
    H.table(v, ['id', 'name'], ms.map(function (m, j) { var k = s.cur >= 0 && (s.links[s.cur] || []).indexOf(j) >= 0 ? 'hot' : ''; return { cls: '', cells: [{ v: String(m.id), cls: k }, { v: m.name, cls: k }] }; }), 'member 테이블' + (c.how === 'none' ? ' (읽지 않음)' : ''));
    H.table(v, ['item', c.how === 'none' ? 'member_id' : 'name'], s.res.length ? s.res.map(function (r, k) { var f = k >= s.res.length - s.fresh ? 'good' : ''; return { cls: '', cells: [{ v: r[0], cls: f }, { v: r[1], cls: f }] }; }) : [{ cls: 'gone', cells: ['결과 없음', ''] }], 'SELECT의 결과');
    H.counters(v, [[s.res.length, '결과의 행 수']]);
  },
  // 그림: 왼쪽에 orders 표, 오른쪽에 member 표, 지금 보는 주문 행에서 짝인 회원 행으로 가는 선(짝이 없으면 끊김), 아래에 만들어진 결과 줄과 행 수. JOIN이 있을 때는 앞서 본 주문의 선도 흐리게 남긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, os = sim.ords, ms = sim.ms, last = shown[shown.length - 1], s = last ? last.snap : null, none = c.how === 'none';
    P.size(680, 424);
    P.region('ro', 14, 16, 252, 218, 'orders 테이블');
    P.region('rm', 414, 16, 252, 218, 'member 테이블' + (none ? ': 읽지 않음' : ''));
    os.forEach(function (o, i) {
      var cur = s && i === s.cur, cls = cur ? (s.miss ? 'bad now' : 'hot now') : s && s.links[i] ? 'wait' : 'plain';
      P.box('o' + i, 26, 46 + i * 46, 228, 42, { cls: cls, title: '주문 ' + o.id + ' · ' + o.item, sub: 'member_id ' + o.mid });
    });
    ms.forEach(function (m, j) {
      var on = s && s.cur >= 0 && (s.links[s.cur] || []).indexOf(j) >= 0;
      P.box('m' + j, 426, 70 + j * 70, 228, 42, { cls: none ? 'ghost' : on ? 'hot' : 'plain', title: 'id ' + m.id + ' · ' + m.name, sub: none ? '이 SELECT는 읽지 않음' : ' ' });
    });
    if (s) os.forEach(function (o, i) {
      var cur = i === s.cur, ls = s.links[i];
      if (!ls) return;
      if (cur && s.miss) { var y = 46 + i * 46 + 21; P.arrow('stop', 'o' + i + ':r', [340, y], { cls: 'bad' }); P.text('x', 352, y + 6, '×', { cls: 'bad', anchor: 'middle', bold: true }); return; }
      if (!cur && c.how !== 'join') return;
      ls.forEach(function (j) { P.arrow('a' + i + '_' + j, 'o' + i + ':r', 'm' + j + ':l', { cls: cur ? 'hot' : 'mut' }); });
    });
    P.region('rr', 14, 246, 652, 114, '만들어진 결과');
    var res = s ? s.res : [];
    if (!res.length) P.text('re', 340, 306, s ? '아직 결과가 없습니다' : '대기', { cls: 'mut', anchor: 'middle' });
    res.forEach(function (r, k) {
      var o = { anchor: 'start' };
      if (k >= res.length - s.fresh) o.cls = 'good';
      P.text('t' + k, 30 + Math.floor(k / 4) * 320, 284 + (k % 4) * 20, r[0] + ' · ' + r[1], o);
    });
    P.box('n1', 14, 374, 652, 36, { cls: res.length ? 'wait' : 'ghost', title: '결과의 행 수', right: res.length + '행' });
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했습니다. 여섯 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 글자 그대로 문장 하나씩 실행해서, SELECT가 돌려준 행 수와 모든 행의 값(item과 name 또는 member_id)을 모형과 대조했습니다. 결과가 네 행을 넘으면 앞의 네 행과 모두 몇 행인지로 줄여 적었고, 대조할 때도 같은 규칙을 썼습니다. 이 밖에 단계 문장이 기대는 값도 H2에서 따로 확인했습니다: orders의 행 수, member에 id가 9인 회원이 없다는 것, 짝이 되는 회원의 id, 그리고 ON 없는 CROSS JOIN의 행 수가 두 테이블의 행 수를 곱한 수라는 것입니다. 정의와 규칙은 MySQL 8.4 문서를 열어 확인했습니다. 15.2.13.2절 JOIN Clause에서 MySQL은 JOIN, CROSS JOIN, INNER JOIN을 서로 바꿔 쓸 수 있는 같은 것으로 보고(표준 SQL은 ON이 있으면 INNER JOIN, 없으면 CROSS JOIN), 조건이 없으면 두 테이블의 카테시안 곱이 만들어지며, ON 조건은 WHERE에 쓸 수 있는 조건식이고 보통 테이블을 어떻게 이을지를 정하는 데 쓴다고 합니다. 테이블 별칭은 같은 절과 15.2.13절 SELECT 문의 FROM 설명(tbl_name AS alias_name 또는 tbl_name alias_name)을 따랐습니다. 다만 두 문서는 짝이 없는 행이 INNER JOIN 결과에 나오지 않는다고 따로 적어 두지는 않아서, 이 동작은 H2의 실행으로 확인한 것입니다. 문서는 웹 페이지를 요약해 주는 도구로 열었고 원문을 한 글자씩 확인한 것은 아닙니다. MySQL에서의 실행 대조는 하지 않았습니다. 단계 문장은 결과가 만들어지는 원리를 순서대로 풀어 쓴 것입니다. 실제로 DB가 어느 테이블부터 읽고 어떤 방법으로 짝을 찾는지는 DB가 정하며, 결과의 줄 순서는 화면의 ORDER BY가 정합니다. 짝이 없는 행도 남기는 LEFT JOIN은 다루지 않으며, 공부 쪽 실습 "JOIN과 GROUP BY"에서 다룹니다.',
});
