Lab.register({
  id: 'iso', nav: '격리 수준', cat: '데이터베이스', mode: 'step',
  title: '다른 트랜잭션이 바꾸는 중인 데이터가 내게 어떻게 보이나',
  intro: '트랜잭션 A가 조회하는 사이에 트랜잭션 B가 같은 데이터를 바꿉니다. 격리 수준에 따라 A가 B의 변경을 보기도 하고 못 보기도 합니다. 상황 세 가지와 격리 수준 네 가지를 바꿔 가며 A의 눈에 보이는 값을 확인하세요.',
  terms: ['트랜잭션 격리 수준', 'Dirty Read', 'Non-repeatable Read', 'Phantom Read', 'MVCC(다중 버전 동시성 제어)', 'Undo 로그와 Redo 로그', '공유 락과 배타 락'], ranks: ['isolation', 'dbengine'],
  controls: [
    { id: 'sc', label: '상황', type: 'select', value: 'nonrep', options: [['dirty', 'B가 수정하고 아직 커밋하지 않은 값을 A가 조회'], ['nonrep', 'A가 두 번 조회하는 사이에 B가 수정하고 커밋'], ['phantom', 'A가 두 번 조회하는 사이에 B가 새 행을 추가하고 커밋']] },
    { id: 'lv', label: '트랜잭션 A의 격리 수준', type: 'select', value: 'RC', options: [['RU', 'READ UNCOMMITTED'], ['RC', 'READ COMMITTED'], ['RR', 'REPEATABLE READ (MySQL 기본값)'], ['SER', 'SERIALIZABLE']] },
  ],
  presets: [
    { t: '처음 설정으로', d: 'READ COMMITTED. 같은 조회를 두 번 했는데 값이 달라집니다.', v: { sc: 'nonrep', lv: 'RC' } },
    { t: 'REPEATABLE READ로 올리면', d: '두 번째 조회도 처음과 같은 값을 봅니다.', v: { sc: 'nonrep', lv: 'RR' } },
    { t: '커밋 안 된 값을 읽는 경우', d: 'READ UNCOMMITTED. 롤백되어 사라질 값을 읽습니다.', v: { sc: 'dirty', lv: 'RU' } },
    { t: '같은 상황, READ COMMITTED', d: '커밋 전의 값은 보이지 않습니다.', v: { sc: 'dirty', lv: 'RC' } },
    { t: '없던 행이 나타나는 경우', d: 'READ COMMITTED. 두 번째 조회에서 건수가 늘어납니다.', v: { sc: 'phantom', lv: 'RC' } },
    { t: 'SERIALIZABLE', d: '이상 현상은 없지만 B가 A를 기다립니다.', v: { sc: 'nonrep', lv: 'SER' } },
  ],
  NAMES: { RU: 'READ UNCOMMITTED', RC: 'READ COMMITTED', RR: 'REPEATABLE READ', SER: 'SERIALIZABLE' },
  code: function (c) {
    var q = c.sc === 'phantom' ? 'SELECT COUNT(*) FROM orders WHERE amount >= 100;' : 'SELECT balance FROM account WHERE id = 1;', w = c.sc === 'phantom' ? 'INSERT INTO orders (amount) VALUES (200);' : 'UPDATE account SET balance = 500 WHERE id = 1;';
    var head = '-- 세션 A\nSET TRANSACTION ISOLATION LEVEL ' + this.NAMES[c.lv] + ';\nSTART TRANSACTION;\n';
    if (c.sc === 'dirty') return head + '\n-- 세션 B\nSTART TRANSACTION;\n' + w + '\n\n-- 세션 A\n' + q + '\n\n-- 세션 B\nROLLBACK;\n\n-- 세션 A\nCOMMIT;';
    return head + q + '   -- 첫 번째 조회\n\n-- 세션 B\nSTART TRANSACTION;\n' + w + '\nCOMMIT;\n\n-- 세션 A\n' + q + '   -- 두 번째 조회\nCOMMIT;';
  },
  label: function (c) { return { dirty: '커밋 전 값 조회', nonrep: '조회 사이에 수정', phantom: '조회 사이에 추가' }[c.sc] + ' · ' + this.NAMES[c.lv]; },
  columns: ['A의 첫 조회', 'A의 두 번째 조회', '이상 현상', '락 대기'],
  simulate: function (c) {
    var L = c.lv, ev = [], tl = [], ver = [], first = '-', second = '-', anomaly = '없음', waited = '없음', sum = [], ph = c.sc === 'phantom';
    function push(a, b, s, k) { tl.push({ a: a, b: b, k: k }); ev.push({ s: s, k: k, snap: { tl: tl.slice(), ver: ver.slice(), first: first, second: second } }); }
    var committed = ph ? '3건' : '1000', changed = ph ? '4건' : '500';
    ver = ph ? [['커밋된 행', 'amount ≥ 100인 주문 3건', '']] : [['현재 값', '1000 (커밋됨)', '']];
    if (c.sc === 'dirty') {
      push('START TRANSACTION', 'START TRANSACTION', '두 트랜잭션이 시작됩니다. 계좌 1의 잔액은 1000입니다.', '');
      ver = [['최신 버전', '500 (B가 수정, 아직 커밋 안 함)', 'hot'], ['이전 버전 (Undo 로그)', '1000 (마지막으로 커밋된 값)', '']];
      push('', 'UPDATE ... balance = 500', 'B가 잔액을 500으로 바꿨습니다. 아직 커밋하지 않았습니다. DB는 바꾸기 전 값 1000을 Undo 로그에 남겨 둡니다. 행에는 B의 배타 락이 걸려 있습니다.', '');
      if (L === 'RU') { first = '500'; push('SELECT → 500', '', 'A가 조회합니다. READ UNCOMMITTED는 커밋 여부를 따지지 않고 최신 버전을 그대로 읽습니다. A는 500을 봅니다.', 'bad'); }
      else if (L === 'SER') { waited = 'A가 기다림'; push('SELECT → (대기)', '', 'A가 조회합니다. SERIALIZABLE에서는 조회도 공유 락을 겁니다. 그런데 B가 그 행에 배타 락을 쥐고 있어 A는 B가 끝날 때까지 기다립니다.', ''); }
      else { first = '1000'; push('SELECT → 1000', '', 'A가 조회합니다. 최신 버전은 커밋되지 않은 값이므로, Undo 로그에 있는 마지막 커밋 버전 1000을 읽습니다. 락을 기다리지 않습니다(MVCC).', 'good'); }
      ver = [['현재 값', '1000 (B의 수정이 취소됨)', '']];
      push('', 'ROLLBACK', 'B가 롤백합니다. 잔액은 1000으로 돌아갑니다. 500이라는 값은 DB에 확정된 적이 한 번도 없습니다.', '');
      if (L === 'RU') { anomaly = 'Dirty Read'; push('(500을 가지고 계속 처리)', '', 'A는 존재한 적 없는 값 500을 읽었습니다. 이 값으로 계산이나 판단을 했다면 틀린 결과가 됩니다. 이것이 Dirty Read입니다.', 'bad'); }
      if (L === 'SER') { first = '1000'; push('SELECT → 1000', '', 'B가 끝나 락이 풀렸습니다. 기다리던 A의 조회가 실행되어 1000을 읽습니다.', 'good'); }
      push('COMMIT', '', 'A가 커밋합니다.', '');
    } else {
      first = committed;
      push('START TRANSACTION', '', 'A가 트랜잭션을 시작합니다.', '');
      push('SELECT → ' + committed, '', 'A의 첫 번째 조회입니다. ' + (ph ? '금액 100 이상인 주문은 3건입니다.' : '잔액은 1000입니다.') + (L === 'RR' ? ' REPEATABLE READ는 이 시점의 데이터 상태(스냅샷)를 기억해 두고 트랜잭션이 끝날 때까지 그 기준으로 읽습니다.' : L === 'SER' ? ' SERIALIZABLE에서는 조회한 ' + (ph ? '범위' : '행') + '에 공유 락이 걸립니다.' : ''), '');
      if (L === 'SER') {
        waited = 'B가 기다림';
        push('', (ph ? 'INSERT' : 'UPDATE') + ' → (대기)', 'B가 ' + (ph ? '그 범위에 새 행을 넣으려' : '그 행을 수정하려') + ' 합니다. A가 걸어 둔 락 때문에 B는 A가 끝날 때까지 기다립니다.', '');
        second = committed; push('SELECT → ' + committed, '(대기 중)', 'A의 두 번째 조회입니다. B가 아직 아무것도 바꾸지 못했으므로 처음과 같은 결과입니다.', 'good');
        push('COMMIT', '(대기 중)', 'A가 커밋하면서 락을 풉니다.', '');
        ver = ph ? [['커밋된 행', 'amount ≥ 100인 주문 4건', 'hot']] : [['현재 값', '500 (커밋됨)', 'hot']];
        push('', (ph ? 'INSERT' : 'UPDATE') + ' 실행, COMMIT', '기다리던 B가 이제 실행되고 커밋합니다. 두 트랜잭션이 차례로 하나씩 실행된 것과 같은 결과입니다.', '');
      } else {
        ver = ph ? [['커밋된 행', 'amount ≥ 100인 주문 3건', ''], ['B가 추가한 행', '주문 1건 (amount 200, 커밋 전)', 'hot']] : [['최신 버전', '500 (B가 수정, 커밋 전)', 'hot'], ['이전 버전 (Undo 로그)', '1000', '']];
        push('', ph ? 'INSERT ... amount = 200' : 'UPDATE ... balance = 500', 'B가 ' + (ph ? '금액 200짜리 주문을 새로 넣습니다.' : '잔액을 500으로 바꿉니다.') + ' A의 조회는 락을 걸지 않았으므로 B는 기다리지 않습니다.', '');
        ver = ph ? [['커밋된 행', 'amount ≥ 100인 주문 4건', 'hot']] : [['최신 버전', '500 (커밋됨)', 'hot'], ['이전 버전 (Undo 로그)', '1000 (A의 스냅샷 시점 값)', '']];
        push('', 'COMMIT', 'B가 커밋합니다. 이제 DB의 확정된 ' + (ph ? '건수는 4건' : '잔액은 500') + '입니다.', '');
        if (L === 'RR') { second = committed; push('SELECT → ' + committed, '', 'A의 두 번째 조회입니다. A는 첫 조회 때의 스냅샷을 기준으로 읽으므로, 그 뒤에 커밋된 B의 변경은 보이지 않습니다. ' + (ph ? '여전히 3건입니다.' : 'Undo 로그의 이전 버전을 따라가 1000을 읽습니다.'), 'good'); }
        else { second = changed; anomaly = ph ? 'Phantom Read' : 'Non-repeatable Read'; push('SELECT → ' + changed, '', 'A의 두 번째 조회입니다. ' + (L === 'RC' ? 'READ COMMITTED는 조회할 때마다 그 시점에 커밋된 최신 데이터를 읽습니다.' : 'READ UNCOMMITTED는 최신 버전을 그대로 읽습니다.') + ' 같은 트랜잭션 안에서 같은 조회를 했는데 ' + (ph ? '없던 행이 나타나 3건이 4건이 됐습니다. 이것이 Phantom Read입니다.' : '1000이 500으로 달라졌습니다. 이것이 Non-repeatable Read입니다.'), 'bad'); }
        push('COMMIT', '', 'A가 커밋합니다.', '');
      }
    }
    sum.push('격리 수준 ' + this.NAMES[L] + ': A의 첫 조회 ' + first + (second !== '-' ? ', 두 번째 조회 ' + second : '') + '. 이상 현상: ' + anomaly + '.');
    if (anomaly !== '없음') sum.push(anomaly === 'Dirty Read' ? '커밋되지 않은 데이터를 읽는 것은 거의 모든 업무에서 허용되지 않아, READ UNCOMMITTED는 실무에서 쓰지 않습니다.' : anomaly === 'Non-repeatable Read' ? '한 트랜잭션 안에서 "조회 → 계산 → 다시 조회" 같은 흐름이 있으면 값이 중간에 바뀌어 계산이 어긋날 수 있습니다. REPEATABLE READ 이상에서 막힙니다.' : '조건에 맞는 행의 집합이 중간에 바뀌었습니다. 건수를 세고 그 결과로 처리하는 로직에서 문제가 됩니다.');
    if (L === 'RR' && ph) sum.push('SQL 표준은 REPEATABLE READ에서 Phantom Read가 생길 수 있다고 정의합니다. 하지만 MySQL InnoDB의 일반 SELECT는 스냅샷을 읽기 때문에 새 행이 보이지 않습니다. 이 실습은 InnoDB의 동작을 따랐습니다.');
    if (L === 'RR' && !ph && c.sc !== 'dirty') sum.push('락을 걸지 않고도 일관된 값을 읽을 수 있는 것은, 수정 전 값을 Undo 로그에 남겨 여러 버전을 유지하기 때문입니다(MVCC). 읽기와 쓰기가 서로를 막지 않습니다.');
    if (L === 'SER') sum.push('SERIALIZABLE은 모든 이상 현상을 막지만 조회에도 락을 걸어 다른 트랜잭션을 기다리게 합니다. 동시 처리량이 크게 떨어지고 교착 상태도 늘어나서 일반 서비스에서는 잘 쓰지 않습니다.');
    if (L === 'RC' && c.sc === 'dirty') sum.push('READ COMMITTED 이상에서는 커밋된 값만 읽습니다. 수정 중인 행을 읽을 때도 락을 기다리지 않고 Undo 로그의 이전 버전을 읽습니다.');
    return { events: ev, summary: sum, row: [first, second, anomaly, waited] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { tl: [], ver: [], first: '-', second: '-' };
    H.counters(v, [[s.first, 'A의 첫 번째 조회 결과'], [s.second, 'A의 두 번째 조회 결과']]);
    H.table(v, ['순서', '트랜잭션 A', '트랜잭션 B'], s.tl.map(function (r, i) { var on = i === s.tl.length - 1; return { cells: [String(i + 1), { v: r.a, cls: r.a && (r.k === 'bad' ? 'bad' : r.k === 'good' ? 'good' : on ? 'hot' : '') }, { v: r.b, cls: r.b && on ? 'hot' : '' }] }; }), '시간 순서 (위에서 아래로)');
    if (s.ver.length) H.table(v, ['DB 안의 데이터', '값'], s.ver.map(function (r) { return { cells: [r[0], { v: r[1], cls: r[2] }] }; }), sim.c.sc === 'phantom' ? 'orders 테이블' : 'account 테이블의 id = 1 행');
  },
  // 그림: 트랜잭션 A와 B가 가운데의 DB에 번갈아 명령을 보내는 순서. A가 읽은 값이 어떻게 달라지는지가 핵심.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { tl: [], ver: [], first: '-', second: '-' }, msgs = [];
    s.tl.forEach(function (r) { if (r.a) msgs.push({ f: 'A', t: 'D', s: r.a, cls: r.k === 'bad' ? 'bad' : r.k === 'good' ? 'good' : '' }); if (r.b) msgs.push({ f: 'B', t: 'D', s: r.b }); });
    var end = P.seq([['A', '트랜잭션 A', 'wait'], ['D', 'DB', 'plain'], ['B', '트랜잭션 B', 'wait']], msgs, { keep: 7 }), y = end + 14, diff = s.first !== '-' && s.second !== '-' && s.first !== s.second;
    P.box('r1', 16, y, 318, 40, { cls: s.first === '-' ? 'ghost' : 'plain', title: 'A의 첫 번째 조회', right: s.first });
    P.box('r2', 346, y, 318, 40, { cls: s.second === '-' ? 'ghost' : diff ? 'bad' : 'good', title: 'A의 두 번째 조회', right: s.second });
    s.ver.slice(0, 3).forEach(function (v, i) { P.box('v' + i, 16, y + 50 + i * 34, 648, 28, { cls: v[2] || 'plain', title: v[0], right: v[1] }); });
    P.size(680, y + 50 + Math.max(1, Math.min(3, s.ver.length)) * 34 + 10);
    P.note('양쪽 트랜잭션이 가운데의 DB에 명령을 보내는 순서입니다. 아래 두 칸은 A가 같은 조회를 두 번 했을 때 본 값이고, 그 아래는 DB 안에 실제로 들어 있는 값(버전)입니다.');
  },
  assume: 'MySQL InnoDB의 동작을 기준으로 했습니다. 격리 수준별로 허용되는 현상은 SQL 표준과 MySQL 공식 문서의 정의를 따랐습니다. REPEATABLE READ에서 Phantom Read가 보이지 않는 것은 락을 걸지 않는 일반 SELECT에 한한 이야기이며, SELECT ... FOR UPDATE나 UPDATE처럼 최신 데이터를 대상으로 하는 문장에서는 다른 결과가 나올 수 있습니다. SERIALIZABLE에서 조회가 공유 락을 거는 것은 InnoDB의 구현 방식이고, PostgreSQL 등 다른 DB는 방식이 다릅니다. 열두 가지 조합(장면 세 가지 × 격리 수준 네 가지) 모두를 실제 MySQL 8.4.11에서 세션 두 개로 실행해, A가 읽은 값과 락 대기가 화면과 일치하는 것을 확인했습니다.',
});
