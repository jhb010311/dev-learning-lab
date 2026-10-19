Lab.register({
  id: 'deadlock', nav: '교착 상태', cat: '동시성', mode: 'step',
  title: '서로 기다리다 둘 다 멈춘다',
  intro: '스레드 1은 계좌 A에서 B로, 스레드 2는 B에서 A로 이체합니다. 이체하려면 두 계좌의 락을 모두 잡아야 합니다. 락을 잡는 순서와 타이밍에 따라 두 스레드가 서로의 락을 기다리며 영원히 멈출 수 있습니다.',
  terms: ['교착 상태(Deadlock)', '임계 영역과 상호 배제', 'synchronized', '힙 덤프와 스레드 덤프'], ranks: ['concurrency', 'os', 'javasync'],
  controls: [
    { id: 'ord', label: '스레드 2가 락을 잡는 순서', type: 'select', value: 'BA', options: [['BA', 'B 먼저, 그다음 A (보내는 계좌부터)'], ['AB', 'A 먼저, 그다음 B (항상 정해진 순서로)']] },
    { id: 'time', label: '두 스레드의 실행 타이밍', type: 'select', value: 'overlap', options: [['overlap', '동시에 시작'], ['seq', '스레드 1이 끝난 뒤 스레드 2 시작']] },
    { id: 'tryl', label: '락을 기다리는 시간에 제한을 둔다 (tryLock)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '스레드 2가 B 먼저, 그다음 A 순서로 락을 잡고 두 스레드가 동시에 시작하면 어떻게 되나', d: '서로 반대 순서로 락을 잡고 동시에 시작합니다. 교착 상태가 됩니다.', v: { ord: 'BA', time: 'overlap', tryl: false } },
    { t: '락 순서를 통일하면', q: '스레드 2가 A 먼저, 그다음 B 순서로 락을 잡게 바꾸면', d: '둘 다 A부터 잡습니다. 한쪽이 기다렸다가 차례로 끝납니다.', v: { ord: 'AB', time: 'overlap', tryl: false } },
    { t: '타이밍이 어긋나면', q: '두 스레드를 동시에 시작하지 않고 스레드 1이 끝난 뒤 스레드 2를 시작하면', d: '반대 순서인데도 문제없이 끝납니다. 그래서 테스트에서 안 잡힙니다.', v: { ord: 'BA', time: 'seq', tryl: false } },
    { t: '기다리는 시간에 제한을 두면', q: '락을 기다리는 시간에 tryLock으로 제한을 두면', d: '못 잡으면 가진 락을 내려놓고 다시 시도합니다.', v: { ord: 'BA', time: 'overlap', tryl: true } },
  ],
  code: function (c) {
    if (c.tryl) { var x = c.ord === 'AB' ? 'first' : 'from', y = c.ord === 'AB' ? 'second' : 'to';
      return 'boolean transfer(Account from, Account to, long amount) throws InterruptedException {\n' + (c.ord === 'AB' ? '    Account first  = from.id < to.id ? from : to;   // 번호가 작은 쪽부터\n    Account second = from.id < to.id ? to : from;\n' : '') + '    ' + x + '.lock.lock();\n    try {\n        if (!' + y + '.lock.tryLock(1, TimeUnit.SECONDS)) {\n            return false;                 // 못 잡으면 포기 -> 호출한 쪽에서 재시도\n        }\n        try {\n            from.withdraw(amount);\n            to.deposit(amount);\n            return true;\n        } finally { ' + y + '.lock.unlock(); }\n    } finally { ' + x + '.lock.unlock(); }     // 가진 락을 내려놓는다\n}\n\n// 스레드 1: transfer(A, B, 100)\n// 스레드 2: transfer(B, A, 50)'; }
    var sorted = c.ord === 'AB';
    return 'void transfer(Account from, Account to, long amount) {\n' + (sorted ? '    // 계좌 번호가 작은 쪽을 항상 먼저 잠근다\n    Account first  = from.id < to.id ? from : to;\n    Account second = from.id < to.id ? to : from;\n    synchronized (first) {\n        synchronized (second) {\n' : '    synchronized (from) {                 // 보내는 계좌부터 잠근다\n        synchronized (to) {\n') + '            from.withdraw(amount);\n            to.deposit(amount);\n        }\n    }\n}\n\n// 스레드 1: transfer(A, B, 100)\n// 스레드 2: transfer(B, A, 50)';
  },
  label: function (c) { return '스레드 2는 ' + (c.ord === 'BA' ? 'B → A' : 'A → B') + ' · ' + (c.time === 'overlap' ? '동시에 시작' : '차례로 실행') + (c.tryl ? ' · tryLock' : ''); },
  columns: ['결과', '완료된 이체', '락 대기', '재시도'],
  simulate: function (c) {
    var ev = [], own = { A: null, B: null }, st = { 1: '시작 전', 2: '시작 전' }, done = 0, waits = 0, retries = 0, dead = false, sum = [];
    var o1 = ['A', 'B'], o2 = c.ord === 'BA' ? ['B', 'A'] : ['A', 'B'];
    function push(s, k) { ev.push({ s: s, k: k, snap: { own: { A: own.A, B: own.B }, st: { 1: st[1], 2: st[2] }, done: done } }); }
    function take(t, l) { own[l] = t; st[t] = '계좌 ' + l + ' 락 보유'; }
    function finish(t, o) { st[t] = '이체 완료'; own[o[0]] = null; own[o[1]] = null; done++; push('스레드 ' + t + ': 두 락을 모두 잡았으므로 출금과 입금을 수행하고, 락을 둘 다 풀었습니다. 이체 완료.', 'good'); }
    function runAlone(t, o) { take(t, o[0]); push('스레드 ' + t + ': 계좌 ' + o[0] + '의 락을 잡았습니다.', ''); own[o[1]] = t; st[t] = '계좌 ' + o[0] + ', ' + o[1] + ' 락 보유'; push('스레드 ' + t + ': 계좌 ' + o[1] + '의 락도 잡았습니다. 기다릴 상대가 없습니다.', ''); finish(t, o); }
    if (c.time === 'seq') { runAlone(1, o1); runAlone(2, o2); sum.push('두 이체가 겹치지 않아서 락 순서와 관계없이 문제가 없었습니다.' + (c.ord === 'BA' ? ' 하지만 코드는 그대로 위험합니다. 교착 상태는 두 스레드가 정확히 엇갈리는 순간에만 드러나므로, 부하가 낮은 테스트에서는 재현되지 않다가 운영에서 터집니다.' : '')); }
    else if (c.ord === 'AB') {
      take(1, 'A'); push('스레드 1: 계좌 A의 락을 잡았습니다.', '');
      st[2] = '계좌 A 락을 기다리는 중'; waits++; push('스레드 2: 정해진 순서대로 계좌 A부터 잡으려 합니다. 스레드 1이 쥐고 있어 기다립니다. 스레드 2는 아직 아무 락도 갖고 있지 않습니다.', '');
      own.B = 1; st[1] = '계좌 A, B 락 보유'; push('스레드 1: 계좌 B의 락을 잡았습니다. 스레드 2가 B를 쥐고 있지 않으므로 막히지 않습니다.', '');
      finish(1, o1); runAlone(2, o2);
      sum.push('모든 스레드가 같은 순서(A 다음 B)로 락을 잡으면, 한쪽이 잠깐 기다릴 뿐 서로가 서로를 기다리는 고리가 만들어지지 않습니다. 교착 상태를 막는 가장 기본적인 방법입니다.');
    } else {
      take(1, 'A'); push('스레드 1: 보내는 계좌 A의 락을 잡았습니다.', '');
      take(2, 'B'); push('스레드 2: 보내는 계좌 B의 락을 잡았습니다.', '');
      st[1] = '계좌 A 락 보유 · B를 기다리는 중'; waits++; push('스레드 1: 받는 계좌 B의 락을 잡으려 합니다. 스레드 2가 쥐고 있어 기다립니다. A의 락은 쥔 채입니다.', '');
      st[2] = '계좌 B 락 보유 · A를 기다리는 중'; waits++;
      if (!c.tryl) { dead = true; push('스레드 2: 받는 계좌 A의 락을 잡으려 합니다. 스레드 1이 쥐고 있어 기다립니다. 스레드 1은 스레드 2를, 스레드 2는 스레드 1을 기다립니다. 어느 쪽도 먼저 락을 내려놓지 않으므로 영원히 풀리지 않습니다. 교착 상태입니다.', 'bad');
        sum.push('교착 상태가 됐습니다. 두 이체 모두 끝나지 않고, 두 스레드는 예외도 없이 멈춰 있습니다. 스레드 덤프를 뜨면 서로의 락을 기다리는 BLOCKED 상태의 스레드로 확인할 수 있습니다.'); sum.push('교착 상태는 네 조건이 모두 맞을 때 생깁니다: 한 번에 하나만 쓸 수 있는 자원, 가진 채로 다른 것을 기다림, 남의 것을 뺏을 수 없음, 기다림이 고리를 이룸. 이 중 하나만 깨면 됩니다. 락 순서 통일은 고리를 깹니다. tryLock은 끝없이 기다리지 않게 해서, 제한 시간이 지나면 포기하고 쥐고 있던 락을 내려놓게 합니다.');
      } else {
        push('스레드 2: 받는 계좌 A의 락을 잡으려 합니다. 스레드 1이 쥐고 있어 기다립니다. 지금은 서로가 서로를 기다리는 상태입니다.', 'bad');
        own.A = null; st[1] = '포기하고 잠시 뒤 재시도'; retries++; push('스레드 1: 1초를 기다려도 B의 락을 얻지 못했습니다. tryLock이 false를 돌려주고, 쥐고 있던 A의 락을 내려놓습니다.', '');
        own.A = 2; st[2] = '계좌 B, A 락 보유'; push('스레드 2: A의 락이 풀려서 잡았습니다.', ''); finish(2, o2);
        st[1] = '재시도'; runAlone(1, o1);
        sum.push('기다리는 시간에 제한을 두면, 못 얻은 쪽이 가진 락을 내려놓아 고리가 풀립니다. 대신 실패한 작업을 다시 시도하는 코드가 필요하고, 두 스레드가 동시에 포기와 재시도를 반복하지 않도록 재시도 간격을 조금씩 다르게 줍니다.');
      }
    }
    return { events: ev, summary: sum, row: [dead ? '교착 상태' : '정상 완료', done + '건', waits + '번', retries + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { own: { A: null, B: null }, st: { 1: '시작 전', 2: '시작 전' }, done: 0 };
    var w1 = s.st[1].indexOf('기다리는') >= 0, w2 = s.st[2].indexOf('기다리는') >= 0, dead = w1 && w2 && s.own.A === 1 && s.own.B === 2;
    H.title(v, '스레드'); var ln = H.lanes(v);
    [1, 2].forEach(function (t2) { var x = s.st[t2]; H.lane(ln, '스레드 ' + t2, x + (t2 === 1 ? '  (A → B로 100원)' : '  (B → A로 50원)'), x === '이체 완료' ? 'good' : x.indexOf('기다리는') >= 0 ? (dead ? 'bad' : 'wait') : x === '시작 전' ? 'none' : 'hot'); });
    if (dead) H.text(v, '스레드 1 → (B를 기다림) → 스레드 2 → (A를 기다림) → 스레드 1. 기다림이 고리를 이뤘습니다.');
  },
  // 그림: 스레드 둘과 락 둘을 마름모꼴로 놓는다. 락에서 스레드로 가는 화살표는 "쥐고 있음", 스레드에서 락으로 가는 화살표는 "기다림"이다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { own: { A: null, B: null }, st: { 1: '시작 전', 2: '시작 전' }, done: 0 };
    var waits = function (t, l) { return s.st[t].indexOf(l + '를 기다리는') >= 0 || s.st[t].indexOf('계좌 ' + l + ' 락을 기다리는') >= 0; }, dead = waits(1, 'B') && waits(2, 'A') && s.own.A === 1 && s.own.B === 2;
    P.size(680, 310);
    [1, 2].forEach(function (t) { var x = s.st[t], p = x.split(' · '); P.box('T' + t, t === 1 ? 24 : 456, 104, 200, 66, { cls: x === '이체 완료' ? 'good' : x.indexOf('기다리는') >= 0 ? (dead ? 'bad' : 'wait') : x === '시작 전' ? 'plain' : 'hot', title: '스레드 ' + t + (t === 1 ? ' (A → B 이체)' : ' (B → A 이체)'), sub: [p[0], p[1] || ' '] }); });
    ['A', 'B'].forEach(function (l) {
      P.box('L' + l, 250, l === 'A' ? 24 : 204, 180, 46, { cls: s.own[l] ? 'hot' : 'plain', title: '계좌 ' + l + '의 락', sub: s.own[l] ? '스레드 ' + s.own[l] + (String(s.own[l]) === '1' ? '이' : '가') + ' 쥐고 있음' : '비어 있음' });
      [1, 2].forEach(function (t) {
        var side = t === 1 ? 'l' : 'r', tside = l === 'A' ? 't' : 'b';
        if (s.own[l] === t) P.arrow('e' + t + l, 'L' + l + ':' + side, 'T' + t + ':' + tside, { cls: 'hot', label: '쥐고 있음' });
        else if (waits(t, l)) P.arrow('e' + t + l, 'T' + t + ':' + tside, 'L' + l + ':' + side, { cls: dead ? 'bad dash' : 'dash', label: '기다림' });
      });
    });
    P.box('done', 16, 266, 648, 34, { cls: dead ? 'bad' : s.done === 2 ? 'good' : 'plain', title: dead ? '기다림이 고리를 이뤄 아무도 진행하지 못함 (교착 상태)' : '완료된 이체', right: s.done + ' / 2' });
    P.note('실선 화살표는 락을 쥐고 있다는 뜻이고, 점선 화살표는 그 락을 기다린다는 뜻입니다. 화살표를 따라가서 처음 자리로 돌아오는 고리가 생기면 교착 상태입니다.');
  },
  assume: '두 스레드가 정확히 엇갈리는 가장 나쁜 순서(각자 첫 번째 락을 잡은 뒤 두 번째 락을 요청)를 가정했습니다. 실제로는 타이밍에 따라 문제없이 지나가는 경우가 더 많고, 그래서 재현이 어렵습니다. synchronized는 기다리는 시간에 제한을 둘 수 없어서, 제한이 필요하면 ReentrantLock의 tryLock을 씁니다. DB에서도 두 트랜잭션이 행을 서로 반대 순서로 잠그면 같은 일이 생기며, MySQL(InnoDB)이나 PostgreSQL 같은 DB는 이를 감지해 한쪽 트랜잭션을 강제로 롤백시킵니다. 자바 쪽 결과는 검증 실행(JDK 21)에서 실제로 실행해 확인했습니다. 반대 순서로 동시에 잡으면 두 스레드가 BLOCKED 상태로 멈췄고 JVM이 교착 스레드 2개를 감지했습니다. 같은 순서로 잡거나 차례로 실행하면 끝났고, tryLock을 쓰면 재시도 1번 뒤에 둘 다 끝났습니다.',
});
