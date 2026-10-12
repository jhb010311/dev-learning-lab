Lab.register({
  id: 'partition', nav: '파티셔닝', cat: '데이터베이스', mode: 'step',
  title: '테이블을 조각내면 조회는 어느 조각을 읽나',
  intro: '파티셔닝은 큰 테이블 하나를 같은 서버 안에서 여러 조각(파티션)으로 나눠 저장하는 것입니다. 주문 날짜의 연도처럼 범위로 나누거나(RANGE), 회원 번호를 나눈 나머지처럼 계산으로 나눕니다(HASH). 조건을 어떻게 쓰느냐에 따라 필요한 파티션만 읽기도 하고 전부 읽기도 합니다.',
  terms: ['샤딩과 파티셔닝', 'RANGE 파티션과 HASH 파티션', '파티션 프루닝', '실행 계획(EXPLAIN)', '기본 키, 유니크 키, 외래 키'],
  controls: [
    { id: 'how', label: '나누는 방법', type: 'select', value: 'range', options: [['range', 'RANGE: 주문 날짜의 연도별로'], ['hash', 'HASH: 회원 번호를 4로 나눈 나머지로']] },
    { id: 'pk', label: '기본 키', type: 'select', value: 'with', options: [['with', '(id, 파티션 키 컬럼)'], ['only', '(id) 하나뿐']] },
    { id: 'ins', label: '새로 넣는 행', type: 'select', value: 'in', options: [['in', '2025년 6월 주문, 회원 7번'], ['out', '2026년 1월 주문, 회원 9번']] },
    { id: 'q', label: '조회 조건', type: 'select', value: 'func', options: [['key', '파티션 키 컬럼 = 값'], ['range', '파티션 키 컬럼의 범위'], ['func', '파티션 키 컬럼에 함수나 계산을 씌움'], ['other', '파티션 키가 없는 조건 (id = 100)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '연도별 RANGE 파티션에서 YEAR(ordered_at) = 2024로 조회하면 어느 파티션을 읽나', d: '연도로 나눴는데 YEAR(ordered_at) = 2024로 찾으면 세 파티션을 모두 읽습니다.', v: { how: 'range', pk: 'with', ins: 'in', q: 'func' } },
    { t: '컬럼을 그대로 비교하면', q: '파티션 키 컬럼을 그대로 값과 비교해 조회하면', d: '그 날짜가 들어 있을 파티션 하나만 읽습니다.', v: { how: 'range', pk: 'with', ins: 'in', q: 'key' } },
    { t: '두 해에 걸친 범위', q: '파티션 키 컬럼의 범위로 조회하면', d: '걸쳐 있는 두 파티션만 읽고 나머지는 건너뜁니다.', v: { how: 'range', pk: 'with', ins: 'in', q: 'range' } },
    { t: '파티션 키가 없는 조건', q: '파티션 키 없이 id = 100으로 조회하면', d: '기본 키의 첫 컬럼으로 찾는데도 모든 파티션을 읽습니다.', v: { how: 'range', pk: 'with', ins: 'in', q: 'other' } },
    { t: '범위 밖의 날짜를 넣으면', q: '회원 9번의 2026년 1월 주문을 넣고 파티션 키 컬럼을 그대로 값과 비교해 조회하면', d: '받아 줄 파티션이 없어 INSERT가 오류 1526으로 실패합니다.', v: { how: 'range', pk: 'with', ins: 'out', q: 'key' } },
    { t: '기본 키에 파티션 키가 없으면', q: '기본 키를 (id) 하나로만 두고 파티션 키 컬럼을 그대로 값과 비교해 조회하면', d: '테이블을 만들 때 오류 1503이 납니다.', v: { how: 'range', pk: 'only', ins: 'in', q: 'key' } },
    { t: '해시로 나누면', q: '회원 번호를 4로 나눈 나머지로 나누는 HASH 파티션에 회원 9번의 2026년 1월 주문을 넣고 파티션 키 컬럼의 범위로 조회하면', d: '어떤 값이든 들어갈 곳이 있지만, 범위 조회는 모든 파티션을 읽습니다.', v: { how: 'hash', pk: 'with', ins: 'out', q: 'range' } },
  ],
  where: function (c) {
    if (c.q === 'other') return 'id = 100';
    if (c.how === 'range') return { key: "ordered_at = '2024-03-05'", range: "ordered_at BETWEEN '2024-11-01' AND '2025-02-28'", func: 'YEAR(ordered_at) = 2024' }[c.q];
    return { key: 'member_id = 7', range: 'member_id BETWEEN 1 AND 100', func: 'member_id % 4 = 3' }[c.q];
  },
  values: function (c) { return c.ins === 'in' ? "(1001, 7, '2025-06-01', 5000)" : "(1002, 9, '2026-01-10', 5000)"; },
  code: function (c) {
    var R = c.how === 'range';
    return 'CREATE TABLE orders (\n  id BIGINT NOT NULL,\n  member_id INT NOT NULL,\n  ordered_at DATE NOT NULL,\n  amount INT NOT NULL,\n  PRIMARY KEY (' + (c.pk === 'with' ? 'id, ' + (R ? 'ordered_at' : 'member_id') : 'id') + ')\n)\n'
      + (R ? 'PARTITION BY RANGE (YEAR(ordered_at)) (\n  PARTITION p2023 VALUES LESS THAN (2024),\n  PARTITION p2024 VALUES LESS THAN (2025),\n  PARTITION p2025 VALUES LESS THAN (2026)\n);' : 'PARTITION BY HASH (member_id) PARTITIONS 4;')
      + '\n\n-- 주문 300건이 들어 있는 상태에서 한 건을 더 넣는다\n-- 컬럼 순서: id, member_id, ordered_at, amount\nINSERT INTO orders VALUES ' + this.values(c) + ';\n\n-- 이 조회가 어느 파티션을 읽는지는 EXPLAIN의 partitions 칸에 나온다\nEXPLAIN SELECT * FROM orders WHERE ' + this.where(c) + ';';
  },
  label: function (c) { return (c.how === 'range' ? 'RANGE(연도)' : 'HASH(회원 번호)') + ' · 기본 키 ' + (c.pk === 'with' ? '(id, 파티션 키)' : '(id)') + ' · ' + (c.ins === 'in' ? '2025년 주문 삽입' : '2026년 주문 삽입') + ' · ' + { key: '키 = 값', range: '키의 범위', func: '키에 함수', other: 'id로 조회' }[c.q]; },
  columns: ['CREATE TABLE', 'INSERT', '조회가 읽는 파티션', '읽는 파티션 수'],
  // 주문 300건이 파티션마다 몇 건씩 들어가는지: n번째 주문의 회원 번호는 n % 40 + 1, 주문 날짜는 2023-01-01에서 3n일 뒤
  spread: function (how) {
    var d = how === 'range' ? [0, 0, 0] : [0, 0, 0, 0];
    for (var n = 1; n <= 300; n++) { if (how === 'range') d[new Date(Date.UTC(2023, 0, 1) + n * 3 * 86400000).getUTCFullYear() - 2023]++; else d[(n % 40 + 1) % 4]++; }
    return d;
  },
  simulate: function (c) {
    var R = c.how === 'range', names = R ? ['p2023', 'p2024', 'p2025'] : ['p0', 'p1', 'p2', 'p3'], N = names.length, ev = [], sum = [], keycol = R ? 'ordered_at' : 'member_id', W = this.where(c);
    var st = { made: 0, rows: names.map(function () { return 0; }), ins: -1, insErr: false, read: null, stage: '', res: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    if (c.pk === 'only') {
      st.made = -1; st.stage = 'create'; st.res = '오류 1503: 테이블이 만들어지지 않음';
      push('CREATE TABLE … PRIMARY KEY (id) … PARTITION BY ' + (R ? 'RANGE (YEAR(ordered_at))' : 'HASH (member_id)') + ': 오류 1503이 나고 테이블이 만들어지지 않습니다. 메시지는 "A PRIMARY KEY must include all columns in the table\'s partitioning function"입니다. 기본 키 (id)에 파티션을 나누는 기준인 ' + keycol + ' 컬럼이 들어 있지 않기 때문입니다.', 'bad');
      st.stage = 'why';
      push('이런 제약이 있는 까닭: MySQL에서는 파티션마다 인덱스를 따로 가집니다. 기본 키와 유니크 키는 같은 값이 또 있는지 검사해야 하는데, 키에 ' + keycol + ' 컬럼이 들어 있으면 그 행이 갈 파티션 하나만 보고 판단할 수 있습니다. 들어 있지 않으면 같은 id가 다른 파티션에 있는지 알 수 없습니다. 그래서 기본 키와 모든 유니크 키에 파티션 키 컬럼을 넣어야 합니다. 여기서는 PRIMARY KEY (id, ' + keycol + ')로 바꾸면 됩니다.', '');
      sum.push('파티션을 나눈 테이블에서는 기본 키와 모든 유니크 키에 파티션 키 컬럼이 들어 있어야 합니다. 이미 운영 중인 테이블을 나중에 파티셔닝하려면 기본 키부터 바꿔야 할 수 있으므로, 설계할 때 함께 정합니다.');
      sum.push('이 제약 때문에 "id만으로는 유일하다"를 DB가 보장해 주지 못하게 됩니다. 기본 키가 (id, ' + keycol + ')이면 id가 같고 ' + keycol + '만 다른 두 행이 들어갈 수 있습니다.');
      return { events: ev, summary: sum, names: names, w: W, vals: this.values(c), row: ['오류 1503', '-', '-', '-'] };
    }
    st.made = 1; st.stage = 'create'; st.res = '파티션 ' + N + '개가 만들어짐';
    push(R ? 'CREATE TABLE … PARTITION BY RANGE (YEAR(ordered_at)): orders 테이블을 주문 날짜의 연도에 따라 세 조각(p2023, p2024, p2025)으로 나눠 만듭니다. 이 조각 하나하나가 파티션입니다. 쿼리를 쓰는 쪽에서는 여전히 orders 테이블 하나로 보이고, 세 파티션은 모두 같은 MySQL 서버 안에 있습니다.' : 'CREATE TABLE … PARTITION BY HASH (member_id) PARTITIONS 4: orders 테이블을 네 조각(p0, p1, p2, p3)으로 나눠 만듭니다. 이 조각 하나하나가 파티션입니다. 행이 어느 파티션으로 갈지는 회원 번호를 4로 나눈 나머지로 정해집니다. 쿼리를 쓰는 쪽에서는 여전히 orders 테이블 하나로 보이고, 네 파티션은 모두 같은 MySQL 서버 안에 있습니다.', '');
    st.rows = this.spread(c.how); st.stage = 'data'; st.res = '주문 300건이 나뉘어 들어감';
    push('주문 300건을 넣어 둡니다. 넣는 쪽은 파티션을 지정하지 않습니다. MySQL이 행마다 ' + (R ? '주문 날짜의 연도를 보고' : '회원 번호를 4로 나눈 나머지를 계산해') + ' 들어갈 파티션을 고릅니다. 파티션별 행 수는 ' + st.rows.map(function (x, i) { return names[i] + ' ' + x + '건'; }).join(', ') + '입니다.', '');
    var to = R ? (c.ins === 'in' ? 2 : -1) : (c.ins === 'in' ? 3 : 1), V = this.values(c);
    st.stage = 'ins';
    if (to < 0) {
      st.insErr = true; st.res = '오류 1526: 2026년을 받을 파티션이 없음';
      push('INSERT … VALUES ' + V + ': 오류 1526 (Table has no partition for value 2026)이 나고 행이 들어가지 않습니다. 주문 날짜의 연도가 2026인데, 만들어 둔 파티션은 2026 미만까지만 받습니다. RANGE 파티션에서는 어느 범위에도 속하지 않는 값을 넣을 수 없습니다.', 'bad');
    } else {
      st.ins = to; st.rows[to]++; st.res = names[to] + ' 파티션에 저장됨';
      push('INSERT … VALUES ' + V + ': ' + (R ? '주문 날짜의 연도가 2025이므로 "2026 미만"을 받는 p2025 파티션에 들어갑니다.' : '회원 번호(' + (c.ins === 'in' ? 7 : 9) + ')를 4로 나눈 나머지가 ' + to + '이므로 p' + to + ' 파티션에 들어갑니다. HASH 파티션에는 범위 밖이라는 것이 없습니다. 어떤 값이든 나머지 계산으로 갈 곳이 정해집니다.'), 'good');
    }
    var read, why, k;
    if (c.q === 'other') { read = names.map(function (x, i) { return i; }); why = '조건에 파티션 키인 ' + keycol + ' 컬럼이 없습니다. id가 100인 행이 어느 파티션에 있는지 미리 알 수 없으므로 모든 파티션을 읽습니다. id는 기본 키의 첫 컬럼이라 파티션 안에서는 인덱스로 바로 찾지만, 그 탐색을 파티션 수만큼 되풀이합니다.'; k = 'bad'; }
    else if (R) {
      if (c.q === 'key') { read = [1]; why = '조건에 파티션 키인 ordered_at 컬럼이 있고 값이 2024-03-05입니다. MySQL은 이 날짜의 행이 있을 수 있는 곳이 p2024 파티션뿐임을 알고, 나머지 두 파티션은 열어 보지도 않습니다. 이것을 파티션 프루닝(가지치기)이라고 합니다.'; k = 'good'; }
      else if (c.q === 'range') { read = [1, 2]; why = '2024-11-01부터 2025-02-28까지는 2024년과 2025년에 걸쳐 있습니다. p2024와 p2025 두 파티션만 읽고 p2023 파티션은 건너뜁니다. RANGE 파티션은 이렇게 이어진 범위를 찾는 조회에 잘 맞습니다.'; k = 'good'; }
      else { read = [0, 1, 2]; why = '조건이 ordered_at 컬럼 자체가 아니라 YEAR(ordered_at)에 걸려 있습니다. 파티션을 나눈 식과 똑같은데도, MySQL은 컬럼에 함수를 씌운 조건으로는 파티션을 골라내지 못해 세 파티션을 모두 읽습니다. ordered_at >= \'2024-01-01\' AND ordered_at < \'2025-01-01\'처럼 컬럼을 그대로 두고 범위로 쓰면 p2024 파티션만 읽습니다.'; k = 'bad'; }
    } else {
      if (c.q === 'key') { read = [3]; why = '조건에 파티션 키인 member_id 컬럼이 있고 값이 7입니다. 7을 4로 나눈 나머지가 3이므로 p3 파티션만 읽고, 나머지 세 파티션은 열어 보지도 않습니다. 이것을 파티션 프루닝(가지치기)이라고 합니다.'; k = 'good'; }
      else if (c.q === 'range') { read = [0, 1, 2, 3]; why = '회원 번호 1부터 100까지에는 나머지가 0, 1, 2, 3인 값이 모두 섞여 있어 네 파티션을 모두 읽어야 합니다. HASH 파티션은 값을 일부러 흩어 놓기 때문에 범위 조건으로는 읽을 파티션을 줄이기 어렵습니다. 예외로 BETWEEN 5 AND 6처럼 값이 몇 개뿐인 아주 짧은 범위는 값마다 계산해 p1, p2 파티션만 읽습니다.'; k = 'bad'; }
      else { read = [0, 1, 2, 3]; why = '조건이 member_id 컬럼 자체가 아니라 member_id % 4에 걸려 있습니다. 파티션을 정하는 계산과 같은 식인데도, MySQL은 컬럼에 계산을 씌운 조건으로는 파티션을 골라내지 못해 네 파티션을 모두 읽습니다.'; k = 'bad'; }
    }
    st.read = read; st.stage = 'sel'; st.ins = -1; st.res = '읽는 파티션: ' + N + '개 중 ' + read.length + '개';
    var list = read.map(function (i) { return names[i]; }).join(',');
    push('EXPLAIN SELECT * FROM orders WHERE ' + W + ': ' + why + ' EXPLAIN의 partitions 칸: ' + list + '.', k);
    var cnt = N + '개 중 ' + read.length + '개' + (read.length === N ? ' (전부)' : '');
    sum.push('파티셔닝은 서버 한 대 안에서 테이블 하나를 나눠 저장하는 것입니다. 데이터를 여러 서버에 나누는 샤딩과 달리 조인과 트랜잭션, 쿼리는 그대로 쓸 수 있습니다. 대신 서버 한 대의 한계를 넘게 해 주지는 않습니다. 한 번에 읽고 지울 범위를 줄이는 것이 목적입니다.');
    if (read.length < N) sum.push('조건에 파티션 키 컬럼이 그대로 들어 있으면 MySQL이 필요한 파티션만 골라 읽습니다. 테이블이 아무리 커도 읽는 범위는 그 파티션으로 줄어듭니다.');
    else sum.push(c.q === 'other' ? '파티션 키가 없는 조회는 모든 파티션을 읽으므로 파티션을 나누기 전보다 오히려 일이 늘 수 있습니다. 가장 자주 쓰는 조회 조건에 들어가는 컬럼을 파티션 키로 골라야 합니다.' : c.q === 'func' ? '파티션 키 컬럼에 함수나 계산을 씌우면 프루닝이 되지 않습니다. 인덱스가 걸린 컬럼에 함수를 씌우면 인덱스를 못 쓰는 것과 같은 이치입니다. 컬럼은 그대로 두고 비교할 값 쪽을 바꿉니다.' : 'HASH 파티션은 행을 고르게 흩어 놓는 데 쓰고, 값 하나를 찾는 조회에 맞습니다. 날짜처럼 범위로 찾는 일이 많으면 RANGE 파티션이 맞습니다.');
    if (R) sum.push(to < 0 ? 'RANGE 파티션은 다음 기간의 파티션을 미리 추가해 두어야 합니다(ALTER TABLE … ADD PARTITION). 추가한 뒤에는 같은 INSERT가 들어갑니다. 깜빡하면 해가 바뀌는 날부터 INSERT가 실패합니다.' : 'RANGE 파티션의 큰 장점은 오래된 데이터를 통째로 지울 수 있다는 것입니다. ALTER TABLE orders DROP PARTITION p2023은 그 파티션의 행을 하나씩 지우지 않고 조각째로 없앱니다.');
    return { events: ev, summary: sum, names: names, w: W, vals: V, row: ['성공', to < 0 ? '오류 1526' : names[to] + '에 저장', list, cnt] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, names = sim.names;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    if (s.made < 0) { H.text(v, 'orders 테이블이 만들어지지 않았습니다 (오류 1503).'); H.counters(v, [['실패', 'CREATE TABLE']]); return; }
    H.counters(v, [[s.insErr ? '오류 1526' : s.stage === 'ins' || s.stage === 'sel' ? '성공' : '-', 'INSERT'], [s.read ? names.length + '개 중 ' + s.read.length + '개' : '-', '조회가 읽는 파티션']]);
  },
  // 그림: 위에 지금 실행하는 문장, 아래에 서버 한 대 안의 orders 테이블과 그 파티션들. 조회가 읽는 파티션은 노랗게, 건너뛰는 파티션은 점선으로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], R = c.how === 'range', names = sim.names, N = names.length, s = last ? last.snap : { made: 0, rows: names.map(function () { return 0; }), ins: -1, insErr: false, read: null, stage: '', res: '실행 전' };
    var w = N === 3 ? 200 : 147, step = w + 10, st = s.stage, sel = st === 'sel';
    P.size(680, 312);
    P.box('q', 100, 14, 480, 46, { cls: st === 'create' && s.made < 0 || s.insErr && st === 'ins' ? 'bad' : st ? 'wait' : 'plain', title: st === 'create' || st === 'why' ? 'CREATE TABLE orders … PARTITION BY ' + (R ? 'RANGE' : 'HASH') : st === 'data' ? 'INSERT (주문 300건)' : st === 'ins' ? 'INSERT INTO orders VALUES' : sel ? 'SELECT * FROM orders' : '실행할 문장', sub: st === 'ins' ? sim.vals : sel ? 'WHERE ' + sim.w : st === 'create' || st === 'why' ? 'PRIMARY KEY (' + (c.pk === 'with' ? 'id, ' + (R ? 'ordered_at' : 'member_id') : 'id') + ')' : ' ' });
    P.region('srv', 16, 84, 648, 160, 'MySQL 서버 한 대 · orders 테이블 하나');
    for (var i = 0; i < N; i++) {
      var on = sel && s.read.indexOf(i) >= 0, got = st === 'ins' && s.ins === i;
      P.box('p' + i, 30 + i * step, 116, w, 114, { cls: s.made <= 0 ? 'ghost' : got ? 'good now' : sel ? (on ? 'hot now' : 'ghost') : 'wait', title: names[i], sub: [R ? (2023 + i) + '년 주문' : '회원 번호 % 4 = ' + i, s.made < 0 ? '만들어지지 않음' : s.made === 0 ? '아직 없음' : s.rows[i] + '건', got ? '새 행이 들어옴' : sel ? (on ? '읽음' : '건너뜀') : ' '] });
      if (on) P.arrow('a' + i, 'q:b:' + ((i + 0.5) / N), 'p' + i + ':t', { cls: 'hot' });
      if (got) P.arrow('a' + i, 'q:b:' + ((i + 0.5) / N), 'p' + i + ':t', { cls: 'good', label: '저장' });
    }
    P.box('res', 16, 258, 648, 38, { cls: s.made < 0 || (s.insErr && st === 'ins') ? 'bad' : sel ? (s.read.length < N ? 'good' : 'hot') : 'plain', title: '결과', right: s.res });
    P.note('조회 단계에서 노란 파티션은 실제로 읽는 곳이고, 점선 파티션은 열어 보지 않고 건너뛴 곳입니다.');
  },
  assume: '서른두 가지 조합 모두를 이 PC의 MySQL 8.4.11(InnoDB)에서 화면과 같은 문장으로 실행해 대조했습니다. 조합마다 테이블을 새로 만들어 CREATE TABLE의 성공 여부와 오류 코드, 주문 300건이 파티션마다 들어간 건수(SELECT COUNT(*) … PARTITION (이름)), 새 행이 들어간 파티션 또는 INSERT의 오류 코드, EXPLAIN의 partitions 칸이 화면과 일치하는 것을 확인했습니다. 화면에 적은 오류 메시지도 실제 메시지입니다. 설명에 쓴 다음 사실도 실행으로 확인했습니다. 유니크 키에 파티션 키가 없어도 오류 1503이 납니다. 기본 키와 유니크 키가 모두 없는 테이블은 제약에 걸리지 않습니다. 날짜 조건을 컬럼의 범위(>= 와 <)로 쓰면 p2024만 읽습니다. HASH에서 BETWEEN 5 AND 6은 p1, p2만 읽습니다. ADD PARTITION으로 2026년 파티션을 추가한 뒤에는 같은 INSERT가 성공합니다. DROP PARTITION p2023은 그 파티션의 121행을 없앱니다. 기본 키가 (id, ordered_at)일 때 id가 같고 날짜만 다른 두 행이 들어갑니다. 어느 파티션을 읽는지는 조건에서 정해지며 행 수나 통계와 무관하지만, 파티션 안에서 인덱스를 쓰는지와 예상 행 수는 데이터에 따라 달라지므로 결과로 삼지 않았습니다. 파티션 키와 기본 키의 제약, 프루닝이 되는 조건의 형태는 MySQL 8.4 참조 설명서 26.6.1 Partitioning Keys, Primary Keys, and Unique Keys와 26.4 Partition Pruning의 설명과도 맞습니다. 파티션마다 인덱스를 따로 가진다는 것은, 파티션 셋이 InnoDB 안에서 별도의 테이블과 데이터 파일로 저장되고 인덱스 통계(mysql.innodb_index_stats)에도 파티션마다 PRIMARY 인덱스가 따로 올라 있는 것을 보고 확인했습니다. LIST와 KEY 파티션, 서브파티션, 파티션 수가 아주 많을 때의 비용은 다루지 않았습니다. 다른 DB 제품은 파티션 키가 없는 유니크 인덱스를 허용하기도 하므로, 이 제약은 MySQL 기준입니다.',
});
