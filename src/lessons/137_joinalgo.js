Lab.register({
  id: 'joinalgo', nav: '조인 알고리즘', cat: '데이터베이스', mode: 'step',
  title: '조인 컬럼에 인덱스가 없으면 DB는 어떻게 짝을 찾나',
  intro: '조인은 한 테이블을 먼저 읽고, 그 행마다 다른 테이블에서 짝이 되는 행을 찾는 일입니다. 짝을 찾을 때 인덱스를 쓸 수 있으면 필요한 행만 읽지만, 없으면 전체를 읽어야 합니다. MySQL 8은 그런 경우에 해시 조인이라는 다른 방법을 씁니다.',
  terms: ['중첩 루프 조인', '해시 조인', '구동 테이블', '옵티마이저', '실행 계획(EXPLAIN)'],
  controls: [
    { id: 'idx', label: 'orders.member_id에 인덱스가 있다', type: 'check', value: false },
    { id: 'drive', label: '먼저 읽을 테이블 (구동 테이블)', type: 'select', value: 'm', options: [['m', 'member 먼저 (STRAIGHT_JOIN으로 고정)'], ['o', 'orders 먼저 (STRAIGHT_JOIN으로 고정)'], ['auto', '옵티마이저에게 맡김 (JOIN)']] },
    { id: 'hash', label: '해시 조인을 쓸 수 있다', type: 'check', value: true, show: function (c) { return !c.idx && c.drive === 'm'; }, hint: '끄면 NO_BNL 힌트를 붙여 해시 조인을 못 쓰게 합니다. 인덱스 없는 중첩 루프가 얼마나 많이 읽는지 보기 위한 설정입니다.' },
  ],
  // 해시 조인 설정은 해시 조인이 선택되는 경우(인덱스 없음, member 먼저)에만 뜻이 있다
  fix: function (c) { return !(!c.idx && c.drive === 'm') && !c.hash ? { hash: true } : null; },
  presets: [
    { t: '처음 설정으로', d: '조인 컬럼에 인덱스가 없습니다. 중첩 루프가 아니라 해시 조인이 선택됩니다.', v: { idx: false, drive: 'm', hash: true } },
    { t: '조인 컬럼에 인덱스를 만들면', d: '중첩 루프 조인으로, 행마다 인덱스로 찾아갑니다.', v: { idx: true, drive: 'm', hash: true } },
    { t: '인덱스도 해시 조인도 없으면', d: 'member의 행마다 orders 전체를 읽습니다. 1,000만 행입니다.', v: { idx: false, drive: 'm', hash: false } },
    { t: 'orders를 먼저 읽으면', d: 'member는 기본 키로 한 행씩 찾습니다.', v: { idx: false, drive: 'o', hash: true } },
    { t: '옵티마이저에게 맡기면 (인덱스 없음)', d: '인덱스로 찾아갈 수 있는 쪽을 나중에 읽도록 순서를 정합니다.', v: { idx: false, drive: 'auto', hash: true } },
    { t: '옵티마이저에게 맡기면 (인덱스 있음)', d: '행이 적은 member를 먼저 읽습니다.', v: { idx: true, drive: 'auto', hash: true } },
  ],
  num: function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  code: function (c) {
    var from = c.drive === 'm' ? '  FROM member m\n  STRAIGHT_JOIN orders o ON o.member_id = m.id;   -- 적은 순서대로 읽게 한다' : c.drive === 'o' ? '  FROM orders o\n  STRAIGHT_JOIN member m ON m.id = o.member_id;   -- 적은 순서대로 읽게 한다' : '  FROM member m\n  JOIN orders o ON o.member_id = m.id;            -- 읽는 순서는 옵티마이저가 정한다';
    return '-- member: 1,000행 (기본 키 id)\n-- orders: 10,000행 (회원 한 명에 주문 10건)\n' + (c.idx ? 'CREATE INDEX idx_member ON orders (member_id);' : '-- orders.member_id에 인덱스 없음') + '\n\nEXPLAIN FORMAT=TREE\nSELECT ' + (c.hash ? '' : '/*+ NO_BNL() */ ') + 'm.name, o.amount\n' + from;
  },
  label: function (c) { return 'member_id 인덱스 ' + (c.idx ? '있음' : '없음') + ' · ' + { m: 'member 먼저', o: 'orders 먼저', auto: '옵티마이저에게 맡김' }[c.drive] + (c.hash ? '' : ' · 해시 조인 끔'); },
  columns: ['먼저 읽는 테이블', '조인 방식', '나중 테이블을 찾는 방법 (type / key)', '나중 테이블을 읽은 횟수 × 한 번에 읽은 행', '두 테이블에서 읽은 행'],
  NAME: { m: 'member', o: 'orders' },
  // MySQL이 고르는 계획. 나중에 읽는 테이블의 조인 컬럼에 인덱스가 있으면 중첩 루프로 인덱스를 찾아가고, 없으면 해시 조인(막아 두면 전체를 읽는 중첩 루프)이다.
  plan: function (c) {
    var idx = !!c.idx, hashOk = !!c.hash, ROWS = { m: 1000, o: 10000 };
    var first = c.drive === 'auto' ? (idx ? 'm' : 'o') : c.drive, second = first === 'm' ? 'o' : 'm';
    var hasIdx = second === 'm' ? true : idx;          // member.id는 기본 키라 인덱스가 항상 있다
    var algo = hasIdx ? 'nl' : hashOk ? 'hash' : 'scan';
    var type = second === 'm' ? 'eq_ref' : idx ? 'ref' : 'ALL', key = second === 'm' ? 'PRIMARY' : idx ? 'idx_member' : 'NULL';
    var loops = algo === 'hash' ? 1 : ROWS[first], each = second === 'm' ? 1 : idx ? 10 : 10000;
    var extra2 = algo === 'hash' ? 'Using where; Using join buffer (hash join)' : algo === 'scan' ? 'Using where' : '';
    return { first: first, second: second, algo: algo, type: type, key: key, loops: loops, each: each, firstRows: ROWS[first], total: ROWS[first] + loops * each, extra2: extra2,
      tree: algo === 'hash' ? 'Inner hash join (o.member_id = m.id)' : 'Nested loop inner join' };
  },
  simulate: function (c) {
    var p = this.plan(c), num = this.num, N = this.NAME, ev = [], sum = [], F = N[p.first], S = N[p.second];
    var st = { stage: 0, cur: -1, all: false, loops: 0, phase: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    st.stage = 1;
    push('쿼리: member와 orders를 회원 번호로 짝지어 회원 이름과 주문 금액을 조회합니다. member는 1,000행, orders는 10,000행이고 회원 한 명에 주문이 10건씩 있습니다. 결과는 10,000행입니다.');
    st.stage = 2;
    if (c.drive === 'auto') push('먼저 읽을 테이블 정하기: 옵티마이저에게 맡겼습니다. ' + (c.idx ? '어느 순서로 읽어도 나중 테이블을 인덱스로 찾아갈 수 있습니다(member.id는 기본 키, orders.member_id에는 idx_member). 옵티마이저는 행이 적은 member를 먼저 읽는 쪽의 비용이 낮다고 계산했습니다.' : 'orders.member_id에는 인덱스가 없지만 member.id는 기본 키입니다. 옵티마이저는 인덱스로 찾아갈 수 있는 member를 나중에 읽도록, orders를 먼저 읽기로 했습니다. FROM에 적은 순서와 반대입니다.'));
    else push('먼저 읽을 테이블 정하기: STRAIGHT_JOIN으로 적은 순서대로 읽게 했으므로 ' + F + '를 먼저 읽습니다. 먼저 읽는 테이블을 구동 테이블이라고 부릅니다.');
    st.stage = 3;
    if (p.algo === 'nl') push('짝을 찾는 방법 정하기: 나중에 읽는 ' + S + '의 조인 컬럼 ' + (p.second === 'm' ? 'id는 기본 키입니다.' : 'member_id에 인덱스 idx_member가 있습니다.') + ' 그래서 중첩 루프 조인을 씁니다. ' + F + '의 행을 하나 읽을 때마다 ' + S + '에서 짝이 되는 행을 인덱스로 찾아가는 방식입니다. EXPLAIN의 type은 ' + p.type + '입니다.', 'good');
    else if (p.algo === 'hash') push('짝을 찾는 방법 정하기: 나중에 읽는 orders의 조인 컬럼 member_id에 인덱스가 없습니다. 중첩 루프로 하면 member의 행마다 orders 10,000행을 모두 읽어야 합니다. MySQL 8은 이런 경우에 해시 조인을 고릅니다. EXPLAIN FORMAT=TREE의 첫 줄이 Inner hash join으로 나옵니다.', '');
    else push('짝을 찾는 방법 정하기: 나중에 읽는 orders의 조인 컬럼 member_id에 인덱스가 없고, NO_BNL 힌트로 해시 조인도 막았습니다. 남은 방법은 인덱스 없는 중첩 루프 조인뿐입니다. member의 행을 하나 읽을 때마다 orders 전체를 읽습니다.', 'bad');
    if (p.algo === 'hash') {
      st.stage = 4; st.phase = 'build';
      push('해시 조인 1단계, 해시 테이블 만들기: member 1,000행을 한 번 읽어, id를 열쇠로 하는 해시 테이블을 메모리에 만듭니다. 해시 테이블은 열쇠 값으로 계산한 자리에 바로 넣고 바로 찾는 구조입니다.');
      st.stage = 5; st.phase = 'probe'; st.loops = 1; st.all = true;
      push('해시 조인 2단계, 짝 찾기: orders 10,000행을 처음부터 끝까지 한 번 읽으면서, 행마다 member_id를 해시 테이블에서 찾습니다. 찾을 때마다 테이블을 훑지 않고 계산한 자리만 확인합니다. orders를 읽은 횟수는 1번입니다.', 'good');
    } else {
      var one = p.second === 'm' ? '기본 키 인덱스에서 id가 같은 한 행을 바로 찾습니다.' : p.algo === 'nl' ? 'idx_member 인덱스에서 member_id가 같은 곳을 찾아 주문 ' + p.each + '건을 읽습니다.' : 'orders 10,000행을 처음부터 끝까지 읽으며 member_id가 같은 10건을 골라내고, 나머지 9,990행은 읽고 버립니다.';
      st.stage = 4; st.cur = 0; st.loops = 1;
      push(F + '의 첫 행을 읽습니다(' + (p.first === 'm' ? '회원 1번' : '주문 1번, 회원 번호 1') + '): ' + one, p.algo === 'scan' ? 'bad' : '');
      st.stage = 5; st.cur = 1; st.loops = 2;
      push(F + '의 둘째 행을 읽습니다(' + (p.first === 'm' ? '회원 2번' : '주문 2번, 회원 번호 2') + '): 같은 일을 되풀이합니다. ' + (p.algo === 'scan' ? 'orders 10,000행을 처음부터 다시 읽습니다. 앞에서 읽은 것을 기억해 두지 않습니다.' : S + '에서 짝이 되는 ' + p.each + '행만 읽습니다.'), p.algo === 'scan' ? 'bad' : '');
      st.stage = 6; st.cur = -1; st.all = true; st.loops = p.loops;
      push(F + '의 나머지 행에도 되풀이합니다: ' + F + '가 ' + num(p.firstRows) + '행이므로 ' + S + '를 ' + num(p.loops) + '번 ' + (p.algo === 'scan' ? '읽습니다' : '찾아갑니다') + '. 한 번에 ' + num(p.each) + '행씩, ' + S + '에서 모두 ' + num(p.loops * p.each) + '행을 읽습니다.', p.algo === 'scan' ? 'bad' : 'good');
    }
    st.stage = 7; st.cur = -1; st.all = true; st.loops = p.loops;
    push('결과 10,000행이 나옵니다. 두 테이블에서 읽은 행은 ' + F + ' ' + num(p.firstRows) + '행과 ' + S + ' ' + num(p.loops * p.each) + '행, 합쳐서 ' + num(p.total) + '행입니다.', p.algo === 'scan' ? 'bad' : 'good');
    if (p.algo === 'nl' && p.second === 'o') sum.push('중첩 루프 조인이 읽는 양은 "먼저 읽는 테이블의 행 수 × 한 번 찾을 때 읽는 행 수"입니다. 나중 테이블의 조인 컬럼에 인덱스가 있으면 한 번에 필요한 행만 읽습니다. 다른 테이블의 기본 키를 가리키는 컬럼(여기서는 orders.member_id)에 인덱스를 만들어 두라는 이유입니다.');
    if (p.algo === 'nl' && p.second === 'm') sum.push('orders를 먼저 읽으면 member는 기본 키로 한 행씩 찾습니다(type eq_ref). 조인 컬럼의 인덱스는 "나중에 읽는 테이블" 쪽에 있어야 쓰입니다.' + (c.drive === 'auto' ? ' 옵티마이저는 이렇게 인덱스로 찾아갈 수 있는 순서를 스스로 고릅니다. 다만 읽은 행은 20,000행으로, orders.member_id에 인덱스가 있어 member를 먼저 읽을 때의 11,000행보다 많습니다.' : ' 이 순서에서는 orders.member_id에 인덱스가 있든 없든 계획이 같습니다.'));
    if (c.drive === 'auto' && c.idx) sum.push('옵티마이저에게 맡기면 통계를 보고 비용이 낮은 순서를 고릅니다. 여기서는 행이 적은 member를 먼저 읽었습니다. 데이터의 양과 분포가 달라지면 선택도 달라질 수 있습니다.');
    if (p.algo === 'hash') sum.push('해시 조인은 한 테이블로 해시 테이블을 만들고 다른 테이블을 한 번만 읽습니다. 인덱스 없는 중첩 루프라면 1,000 × 10,000 = 1,000만 행을 읽었을 것을 11,000행으로 끝냅니다. EXPLAIN의 Extra에는 Using join buffer (hash join)이라고 나옵니다.');
    if (p.algo === 'hash') sum.push('그래도 인덱스가 필요 없어지는 것은 아닙니다. 해시 조인은 orders를 통째로 읽으므로, 회원 10명의 주문만 찾을 때에도 orders 10,000행을 다 읽습니다. 인덱스가 있으면 10번 찾아가 100행만 읽습니다.');
    if (p.algo === 'scan') sum.push('인덱스도 해시 조인도 없으면 먼저 읽는 테이블의 행마다 나중 테이블 전체를 읽습니다. 1,000 × 10,000 = 1,000만 행입니다. 두 테이블이 각각 10배가 되면 읽는 양은 100배가 됩니다.');
    return { events: ev, summary: sum, p: p, row: [F, p.algo === 'hash' ? '해시 조인' : '중첩 루프 조인', p.type + ' / ' + (p.key === 'NULL' ? '인덱스 없음' : p.key), num(p.loops) + '번 × ' + num(p.each) + '행', num(p.total) + '행'] };
  },
  render: function (v, sim, t, H, shown) {
    var p = sim.p, num = this.num, N = this.NAME, last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 MySQL이 조인을 처리하는 순서를 따라갑니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '구동 테이블', s.stage >= 2 ? N[p.first] + ' (' + num(p.firstRows) + '행)' : '아직 정하지 않음', s.stage >= 2 ? 'hot' : 'none');
    H.lane(ln, '조인 방식', s.stage >= 3 ? (p.algo === 'hash' ? '해시 조인' : p.algo === 'nl' ? '중첩 루프 조인 + 인덱스 ' + p.key : '중첩 루프 조인 + 매번 전체 읽기') : '아직 정하지 않음', s.stage >= 3 ? (p.algo === 'scan' ? 'bad' : 'good') : 'none');
    if (s.stage >= 3) {
      H.table(v, ['table', 'type', 'key', 'Extra'], [
        { cells: [p.first, 'ALL', 'NULL', ''] },
        { cells: [p.second, { v: p.type, cls: p.type === 'ALL' ? 'bad' : 'good' }, p.key, p.extra2] },
      ], 'EXPLAIN으로 보면 (주요 칸만, 위 줄을 먼저 읽음)');
      H.text(v, 'EXPLAIN FORMAT=TREE의 첫 줄: -> ' + p.tree);
    }
    if (s.stage >= 4) {
      var innerRead = p.algo === 'hash' ? (s.phase === 'probe' ? p.each : 0) : s.loops * p.each, firstRead = p.algo === 'hash' ? p.firstRows : s.all ? p.firstRows : s.loops;
      H.counters(v, [[num(firstRead), N[p.first] + '에서 읽은 행'], [num(s.loops), N[p.second] + '를 읽은 횟수'], [num(innerRead), N[p.second] + '에서 읽은 행']]);
    }
  },
  // 그림: 왼쪽에 먼저 읽는 테이블, 오른쪽에 나중에 읽는 테이블, 가운데에 짝을 찾는 수단(인덱스나 해시 테이블). 회원 3명과 주문 6건으로 줄여 그린다.
  draw: function (P, sim, shown) {
    var p = sim.p, num = this.num, N = this.NAME, last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, cur: -1, all: false, loops: 0, phase: '' };
    var M = [1, 2, 3], O = [[101, 1], [102, 2], [103, 3], [104, 1], [105, 2], [106, 3]], mFirst = p.first === 'm';
    P.size(680, 340);
    P.region('L', 16, 16, 200, 256, (s.stage >= 2 ? '먼저 읽음: ' : '') + N[p.first]);
    P.region('R', 464, 16, 200, 256, (s.stage >= 2 ? '나중에 읽음: ' : '') + N[p.second]);
    function mBox(i, x, cls) { P.box('m' + M[i], x, 64 + i * 62, 172, 40, { cls: cls, title: '회원 ' + M[i] + '번' }); }
    function oBox(i, x, cls) { P.box('o' + O[i][0], x, 44 + i * 37, 172, 30, { cls: cls, title: '주문 ' + O[i][0], right: '회원 ' + O[i][1] }); }
    var lx = 30, rx = 478, on = s.stage >= 4;
    // 지금 처리 중인 먼저 테이블의 행(들)
    function active(i) { return on && (s.all || s.cur === i); }
    if (p.algo === 'hash') {
      M.forEach(function (m, i) { mBox(i, lx, s.stage >= 4 ? 'good' : 'wait'); });
      O.forEach(function (o, i) { oBox(i, rx, s.phase === 'probe' ? 'good' : 'plain'); });
      P.box('mid', 252, 114, 176, 60, { cls: s.stage >= 4 ? 'hot' : 'ghost', title: '해시 테이블 (메모리)', sub: s.stage >= 4 ? '열쇠: 회원 1, 2, 3' : '아직 없음' });
      if (s.stage >= 4) M.forEach(function (m, i) { P.arrow('b' + m, 'm' + m + ':r', 'mid:l:' + (0.25 + i * 0.25), { cls: s.phase === 'build' ? 'hot' : 'mut' }); });
      if (s.phase === 'probe') O.forEach(function (o, i) { P.arrow('q' + o[0], 'o' + o[0] + ':l', 'mid:r:' + (0.1 + i * 0.16), { cls: 'good' }); });
    } else if (mFirst) {
      M.forEach(function (m, i) { mBox(i, lx, active(i) ? 'hot' + (s.cur === i ? ' now' : '') : 'wait'); });
      O.forEach(function (o, i) {
        var match = on && (s.all || M[s.cur] === o[1]), touched = on && p.algo === 'scan';
        oBox(i, rx, match ? 'good' : touched ? 'bad' : 'plain');
      });
      if (p.algo === 'nl') {
        P.box('mid', 252, 114, 176, 60, { cls: on ? 'hot' : 'plain', title: '인덱스 idx_member', sub: 'member_id 순서로 정렬' });
        M.forEach(function (m, i) { if (active(i)) P.arrow('b' + m, 'm' + m + ':r', 'mid:l:' + (0.25 + i * 0.25), { cls: s.cur === i ? 'hot' : 'mut' }); });
        O.forEach(function (o, i) { if (on && (s.all || M[s.cur] === o[1])) P.arrow('q' + o[0], 'mid:r:' + (0.1 + i * 0.16), 'o' + o[0] + ':l', { cls: 'good' }); });
      } else {
        P.text('noix', 340, 36, '인덱스 없음', { cls: 'bad', anchor: 'middle', bold: true });
        P.text('noix2', 340, 54, '행마다 전체를 읽음', { cls: 'bad', anchor: 'middle' });
        if (on && !s.all) O.forEach(function (o, i) { P.arrow('q' + o[0], 'm' + M[s.cur] + ':r', 'o' + o[0] + ':l', { cls: M[s.cur] === o[1] ? 'good' : 'bad' }); });
        if (on && s.all) M.forEach(function (m, i) { P.arrow('b' + m, 'm' + m + ':r', [460, 82 + i * 62], { cls: 'bad', label: '전체 읽기' }); });
      }
    } else {
      O.forEach(function (o, i) { oBox(i, lx, active(i) ? 'hot' + (s.cur === i ? ' now' : '') : 'wait'); });
      M.forEach(function (m, i) { var match = on && (s.all || O[s.cur][1] === m); mBox(i, rx, match ? 'good' : 'plain'); });
      P.box('mid', 252, 114, 176, 60, { cls: on ? 'hot' : 'plain', title: '기본 키 인덱스', sub: 'id로 한 행을 바로 찾음' });
      O.forEach(function (o, i) { if (active(i)) P.arrow('q' + o[0], 'o' + o[0] + ':r', 'mid:l:' + (0.1 + i * 0.16), { cls: s.cur === i ? 'hot' : 'mut' }); });
      M.forEach(function (m, i) { if (on && (s.all || O[s.cur][1] === m)) P.arrow('b' + m, 'mid:r:' + (0.25 + i * 0.25), 'm' + m + ':l', { cls: 'good' }); });
    }
    var done = s.stage >= 6 || (p.algo === 'hash' && s.stage >= 5);
    P.box('r1', 16, 288, 320, 36, { cls: s.stage >= 3 ? (p.algo === 'scan' ? 'bad' : 'good') : 'ghost', title: '조인 방식', right: s.stage >= 3 ? (p.algo === 'hash' ? '해시 조인' : '중첩 루프 조인') : '?' });
    P.box('r2', 344, 288, 320, 36, { cls: done ? (p.algo === 'scan' ? 'bad' : 'good') : 'ghost', title: '두 테이블에서 읽은 행', right: done ? num(p.total) + '행' : '?' });
    P.note('회원 3명과 주문 6건으로 줄여 그렸습니다(실제 수치는 member 1,000행, orders 10,000행 기준). 초록은 읽어서 짝이 된 행, 빨강은 읽고 나서 버린 행, 흰색은 읽지 않은 행입니다. 주문은 회원 번호 순서로 놓여 있지 않아서, 인덱스가 없으면 어디에 짝이 있는지 알 수 없습니다.');
  },
  assume: '화면에서 고를 수 있는 일곱 가지 조합 모두, 같은 테이블(member 1,000행, orders 10,000행)을 이 PC의 MySQL 8.4에 만들고 ANALYZE TABLE을 한 뒤 대조했습니다. 먼저 읽는 테이블과 나중 테이블의 type, key, Extra는 EXPLAIN으로, 조인 방식은 EXPLAIN FORMAT=TREE의 첫 줄로, 나중 테이블을 읽은 횟수와 한 번에 읽은 행 수는 실제로 실행하며 세어 주는 EXPLAIN ANALYZE의 loops와 rows로 확인했습니다. 해시 조인 설정이 숨겨지는 다섯 가지 경우에는 NO_BNL 힌트를 붙여도 계획이 바뀌지 않는 것도 확인했습니다. 옵티마이저에게 맡겼을 때의 순서는 비용 계산의 결과라서 데이터의 양과 분포에 따라 달라질 수 있습니다. "읽은 행"은 테이블이나 인덱스에서 꺼낸 행의 수이며, 인덱스를 타고 내려가는 비용, 해시 테이블을 만들고 찾는 비용, 걸린 시간은 넣지 않았습니다. 해시 조인은 MySQL 8.0.18에 들어왔고 8.0.20부터 인덱스 없는 조인에 쓰이던 블록 중첩 루프를 대신합니다. 해시 테이블이 메모리(join_buffer_size)에 다 들어가지 않으면 디스크를 함께 씁니다. 이 두 가지는 실행으로 확인한 것이 아니라 MySQL 문서의 해시 조인 최적화 설명을 따른 것입니다. 그림은 회원 3명, 주문 6건으로 줄인 것입니다.',
});
