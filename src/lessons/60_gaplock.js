Lab.register({
  id: 'gaplock', nav: '갭 락과 넥스트 키 락', cat: '데이터베이스', mode: 'step',
  title: '없는 행을 조회했는데 왜 INSERT가 막히나',
  intro: '트랜잭션 A가 SELECT ... FOR UPDATE로 행을 잠급니다. MySQL InnoDB는 행만 잠그는 것이 아니라, 조건에 따라 행과 행 사이의 빈 구간까지 잠가서 다른 트랜잭션이 그 사이에 새 행을 끼워 넣지 못하게 합니다.',
  terms: ['레코드 락, 갭 락, 넥스트 키 락', '공유 락과 배타 락', '트랜잭션 격리 수준', 'Phantom Read', '비관적 락', '교착 상태(Deadlock)'], ranks: ['dbengine', 'isolation'],
  controls: [
    { id: 'q', label: '트랜잭션 A의 조회 조건', type: 'select', value: 'range', options: [['hit', 'id = 20 (있는 행 하나)'], ['miss', 'id = 25 (없는 행)'], ['range', 'id BETWEEN 20 AND 30 (범위)']] },
    { id: 'lv', label: '격리 수준', type: 'select', value: 'RR', options: [['RR', 'REPEATABLE READ (MySQL 기본값)'], ['RC', 'READ COMMITTED']] },
    { id: 'ins', label: '트랜잭션 B가 넣으려는 행', type: 'select', value: '25', options: [['25', 'id = 25 (20과 30 사이)'], ['45', 'id = 45 (40보다 뒤)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'REPEATABLE READ에서 A가 id BETWEEN 20 AND 30 범위를 조회할 때 B가 id = 25를 넣으면 어떻게 되나', d: '범위 조회. 20과 30 사이에 끼워 넣으려는 INSERT가 기다립니다.', v: { q: 'range', lv: 'RR', ins: '25' } },
    { t: '없는 행을 조회했을 때', q: 'A의 조회 조건을 없는 행 id = 25로 바꾸면', d: '잠글 행이 없는데도 그 자리의 빈 구간이 잠깁니다.', v: { q: 'miss', lv: 'RR', ins: '25' } },
    { t: '있는 행 하나를 정확히 조회', q: 'A의 조회 조건을 있는 행 하나인 id = 20으로 바꾸면', d: '그 행만 잠깁니다. 옆 구간은 자유롭습니다.', v: { q: 'hit', lv: 'RR', ins: '25' } },
    { t: 'READ COMMITTED로 낮추면', q: '격리 수준을 READ COMMITTED로 바꾸면', d: '빈 구간을 잠그지 않습니다. INSERT가 바로 됩니다.', v: { q: 'range', lv: 'RC', ins: '25' } },
    { t: '범위 밖에 넣으면', q: 'B가 넣으려는 행을 40보다 뒤인 id = 45로 바꾸면', d: '잠긴 구간이 아니므로 기다리지 않습니다.', v: { q: 'range', lv: 'RR', ins: '45' } },
  ],
  code: function (c) {
    var w = { hit: 'id = 20', miss: 'id = 25', range: 'id BETWEEN 20 AND 30' }[c.q];
    return '-- 테이블의 id(기본 키): 10, 20, 30, 40, 그리고 멀리 떨어진 행들\n-- (조회 범위가 테이블의 일부라서 그 범위만 훑는 경우)\n\n-- 트랜잭션 A\nSET TRANSACTION ISOLATION LEVEL ' + (c.lv === 'RR' ? 'REPEATABLE READ' : 'READ COMMITTED') + ';\nSTART TRANSACTION;\nSELECT * FROM coupon WHERE ' + w + ' FOR UPDATE;\n\n-- 트랜잭션 B (A가 아직 커밋하지 않은 상태)\nINSERT INTO coupon (id) VALUES (' + c.ins + ');';
  },
  label: function (c) { return { hit: 'id = 20', miss: 'id = 25 (없는 행)', range: 'id 20~30' }[c.q] + ' · ' + c.lv + ' · B가 ' + c.ins + ' 삽입'; },
  columns: ['잠긴 행', '잠긴 빈 구간', 'B의 INSERT', '새 행이 끼어들 수 있나'],
  simulate: function (c) {
    var RR = c.lv === 'RR', ev = [], sum = [], rec = [], gaps = [], ins = +c.ins;
    if (c.q === 'hit') rec = [20];
    if (c.q === 'range') rec = [20, 30];
    if (RR && (c.q === 'miss' || c.q === 'range')) gaps = [[20, 30]];
    var blocked = gaps.some(function (g) { return ins > g[0] && ins < g[1]; });
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('coupon 테이블에는 id가 10, 20, 30, 40인 행과 그보다 한참 큰 id의 행들이 있습니다. 인덱스에서 보면 행과 행 사이에 (10~20), (20~30), (30~40), (40 이후) 같은 빈 구간이 있습니다.', '', 0);
    if (c.q === 'hit') push('트랜잭션 A가 id = 20인 행을 FOR UPDATE로 조회합니다. 기본 키로 정확히 한 행을 찾았으므로 그 행에만 락을 겁니다(레코드 락). 조건에 맞는 행은 앞으로도 이것 하나뿐이라는 것이 보장되므로 빈 구간을 잠글 필요가 없습니다.', '', 1);
    else if (c.q === 'miss') push('트랜잭션 A가 id = 25를 FOR UPDATE로 조회합니다. 그런 행은 없습니다. ' + (RR ? '잠글 행이 없으므로, 대신 25가 들어갈 자리인 20과 30 사이의 빈 구간을 잠급니다(갭 락). "지금 없는 것이 내 트랜잭션이 끝날 때까지 계속 없도록" 지키기 위해서입니다.' : 'READ COMMITTED에서는 빈 구간을 잠그지 않습니다. 잠글 행도 없으므로 아무 락도 걸리지 않습니다.'), '', 1);
    else push('트랜잭션 A가 id 20부터 30까지를 FOR UPDATE로 조회합니다. 조건에 맞는 행 20과 30에 락을 겁니다. ' + (RR ? '그리고 그 사이의 빈 구간 (20~30)도 함께 잠급니다. 행에 건 락과 그 앞 구간에 건 락을 합쳐 넥스트 키 락이라고 부릅니다.' : 'READ COMMITTED에서는 빈 구간은 잠그지 않고 찾은 행만 잠급니다.'), '', 1);
    push('트랜잭션 B가 id = ' + ins + '인 행을 넣으려 합니다. INSERT는 새 행이 들어갈 자리의 빈 구간이 잠겨 있는지 확인합니다.', '', 2);
    if (blocked) push('id ' + ins + '가 들어갈 자리는 (20~30) 구간이고, A가 이 구간을 잠그고 있습니다. B의 INSERT는 A가 커밋하거나 롤백할 때까지 기다립니다. 너무 오래 기다리면 락 대기 시간 초과 오류가 납니다.', 'bad', 3);
    else push('id ' + ins + '가 들어갈 자리는 잠겨 있지 않습니다. B의 INSERT는 바로 실행됩니다.' + (!RR && ins > 20 && ins < 30 && c.q !== 'hit' ? ' A가 같은 조건으로 다시 조회하면, 처음에는 없던 id 25인 행이 나타납니다(Phantom Read).' : ''), !RR && ins === 25 && c.q !== 'hit' ? 'bad' : 'good', 3);
    if (blocked) push('A가 커밋하면 락이 풀리고, 기다리던 B의 INSERT가 그제야 실행됩니다.', '', 4);
    var phantom = !RR && c.q !== 'hit' && ins === 25;
    if (RR && gaps.length) sum.push('REPEATABLE READ에서 InnoDB는 범위 안에 새 행이 끼어드는 것(Phantom)을 막으려고 빈 구간을 잠급니다. 그 대가로 조회에 걸리지 않는 값을 넣으려는 INSERT도 잠긴 빈 구간 안이면 막힐 수 있습니다.');
    if (c.q === 'miss' && RR) sum.push('"없으면 INSERT" 패턴에서 자주 문제가 됩니다. 두 트랜잭션이 각각 없는 행을 FOR UPDATE로 조회하면 둘 다 같은 구간에 갭 락을 얻습니다(갭 락끼리는 서로 막지 않습니다). 그런 뒤 둘 다 INSERT하려 하면 서로의 갭 락에 막혀 교착 상태가 됩니다.');
    if (c.q === 'hit') sum.push('유니크 인덱스로 존재하는 한 행을 정확히 찾으면 레코드 락만 걸립니다. 락의 범위를 좁히려면 조건이 인덱스를 정확히 타는지가 중요합니다. 인덱스를 타지 못하면 훨씬 넓은 범위가 잠깁니다.');
    if (!RR) sum.push('READ COMMITTED에서는 조회에 갭 락을 쓰지 않아 INSERT가 덜 막히고 교착 상태도 줄어듭니다. 대신 Phantom Read를 허용합니다.' + (phantom ? ' 이번 실행에서 실제로 새 행이 끼어들었습니다.' : ''));
    return { events: ev, summary: sum, rec: rec, gaps: gaps, blocked: blocked, row: [rec.length ? rec.join(', ') : '없음', gaps.length ? '(20~30)' : '없음', blocked ? 'A가 끝날 때까지 대기' : '바로 실행', phantom ? '예 (Phantom 발생)' : blocked ? '아니오' : c.q === 'hit' || ins === 45 ? '조회 범위 밖' : '아니오'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], st = last ? last.snap.stage : -1, ins = +c.ins, items = [], ids = [10, 20, 30, 40];
    if (st < 0) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    function gapCell(a, b, label) { var locked = st >= 1 && sim.gaps.some(function (g) { return g[0] === a; }), here = st >= 2 && ins > a && ins < b; return [label + (here ? (st >= 3 ? (sim.blocked ? ' ← ' + ins + ' 대기' : ' ← ' + ins + ' 삽입됨') : ' ← ' + ins + ' 시도') : '') + (locked ? ' [잠김]' : ''), (locked ? 'r' : '') + (here ? ' now' : '')]; }
    items.push(gapCell(-1, 10, '(10 이전)'));
    ids.forEach(function (id, i) { var locked = st >= 1 && sim.rec.indexOf(id) >= 0; items.push(['행 ' + id + (locked ? ' [잠김]' : ''), locked ? 'b' : 'd']); var nx = ids[i + 1] || 999; items.push(gapCell(id, nx, nx === 999 ? '(40 이후)' : '(' + id + '~' + nx + ')')); });
    H.title(v, 'id 인덱스 (왼쪽이 작은 값)'); H.slots(v, items, '');
    H.text(v, '초록은 행, 노랑은 A가 잠근 행, 빨강은 A가 잠근 빈 구간, 점선은 잠기지 않은 빈 구간입니다.');
  },
  // 그림: id 인덱스를 수직선처럼 그린다. 행(상자)과 그 사이의 빈 구간(점선)이 번갈아 놓이고, A가 잠근 곳과 B가 넣으려는 곳이 표시된다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], st = last ? last.snap.stage : -1, ins = +c.ins, ids = [10, 20, 30, 40], x = 16, target = ins < 30 ? 2 : 4, waiting = sim.blocked && st === 3, done = st >= 3 && !waiting;
    P.size(680, 300);
    P.box('txa', 16, 16, 440, 46, { cls: st >= 1 ? 'hot' : 'plain', title: '트랜잭션 A', sub: st >= 4 ? '커밋함. 락이 풀림' : st >= 1 ? 'SELECT ... FOR UPDATE 실행, 아직 커밋 전' : '시작 전' });
    P.text('ixl', 16, 112, 'id 인덱스 (왼쪽이 작은 값)', { cls: 'mut' });
    for (var k = 0; k <= 4; k++) {
      var lo = k ? ids[k - 1] : 0, gLocked = st >= 1 && st < 4 && sim.gaps.some(function (g) { return g[0] === lo; }), here = k === target && st >= 2;
      P.box('g' + k, x, 124, 80, 52, { cls: gLocked ? 'bad' : here && done ? 'good' : 'ghost', center: true, sub: [k === 0 ? '10 이전' : k === 4 ? '40 이후' : lo + ' ~ ' + ids[k], gLocked ? '구간 잠김' : here && done ? ins + ' 들어감' : '빈 구간'] });
      if (gLocked) P.arrow('la' + k, 'txa:b:' + (0.2 + k * 0.15), 'g' + k + ':t', { cls: 'bad' });
      x += 83;
      if (k < 4) { var id = ids[k], rLocked = st >= 1 && st < 4 && sim.rec.indexOf(id) >= 0; P.box('r' + id, x, 124, 56, 52, { cls: rLocked ? 'hot' : 'wait', center: true, title: '행 ' + id, sub: rLocked ? '잠김' : ' ' }); if (rLocked) P.arrow('lr' + id, 'txa:b:' + (0.25 + k * 0.15), 'r' + id + ':t', { cls: 'hot' }); x += 59; }
    }
    P.box('txb', 224, 236, 440, 46, { cls: st >= 3 ? (waiting ? 'bad' : 'good') : st >= 2 ? 'wait' : 'plain', title: '트랜잭션 B', sub: st >= 3 ? (waiting ? 'INSERT id = ' + ins + ' 대기 중 (락을 기다림)' : 'INSERT id = ' + ins + ' 실행됨') : st >= 2 ? 'INSERT id = ' + ins + ' 시도' : '시작 전' });
    if (st >= 2) P.arrow('ib', 'txb:t:0.3', 'g' + target + ':b', { cls: waiting ? 'bad dash' : done ? 'good' : 'mut', label: waiting ? '막힘' : done ? '삽입' : '' });
    P.note('파란 상자는 행, 점선 상자는 행과 행 사이의 빈 구간입니다. 노란 행과 빨간 구간이 트랜잭션 A가 잠근 곳입니다. B가 넣으려는 값이 빨간 구간 안에 들어가면 A가 끝날 때까지 기다려야 합니다.');
  },
  assume: 'MySQL InnoDB에서 기본 키(유니크 인덱스)로 조회하는 경우를 기준으로 했습니다. 유니크 인덱스로 존재하는 한 행을 찾으면 레코드 락만, 없는 행이나 범위를 찾으면 갭 락이 함께 걸린다는 점, READ COMMITTED에서는 조회에 갭 락을 쓰지 않는다는 점은 MySQL 공식 문서(InnoDB Locking)의 설명을 따랐습니다. 범위 조회에서 실제로 잠기는 구간의 경계는 인덱스 종류와 MySQL 버전에 따라 이보다 넓을 수 있습니다(범위 끝 다음 구간까지 잠기기도 합니다). 열두 가지 조합 모두를 실제 MySQL 8.4.11에서 세션 두 개로 실행해, A가 잡은 락(performance_schema.data_locks에 기록된 레코드 락, 갭 락, 넥스트 키 락)과 B의 INSERT가 기다리는지가 화면과 일치하는 것을 확인했습니다. 단, 이 결과는 범위 조회가 인덱스의 그 범위만 훑는 경우의 것입니다. InnoDB는 조건에 맞는 행이 아니라 조회하면서 훑은 인덱스 레코드를 잠급니다. 실제로 행이 10, 20, 30, 40 네 개뿐인 테이블로 시험했을 때는 MySQL이 인덱스 전체를 훑는 계획을 골라 모든 행과 모든 빈 구간이 잠겼고, 범위 밖인 id = 45의 INSERT도 기다렸습니다. 화면과 같은 결과는 멀리 떨어진 행 500개를 더 넣어 조회 범위가 테이블의 일부가 되게 한 뒤에 나왔습니다.',
});
