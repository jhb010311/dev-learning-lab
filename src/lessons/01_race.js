Lab.register({
  id: 'race', nav: '경쟁 상태', cat: '동시성', mode: 'step',
  title: 'count++는 왜 숫자를 잃어버리나',
  intro: '여러 스레드가 같은 변수를 동시에 올립니다. count++는 읽기, 더하기, 쓰기의 세 단계라서 단계가 섞이면 증가가 사라집니다. 이렇게 스레드들이 실행되는 순서에 따라 결과가 달라지는 상황을 경쟁 상태라고 합니다.',
  terms: ['경쟁 상태(Race Condition)', '임계 영역과 상호 배제', 'synchronized', 'volatile', '가시성(Visibility)', '원자성(Atomicity)과 CAS', '스레드 안전(Thread-safe)'], ranks: ['javasync', 'concurrency'],
  controls: [
    { id: 'threads', label: '스레드 수', type: 'range', min: 2, max: 4, value: 2, fmt: function (v) { return v + '개'; } },
    { id: 'loops', label: '스레드마다 올리는 횟수', type: 'range', min: 1, max: 5, value: 3, fmt: function (v) { return v + '번'; } },
    { id: 'sync', label: '동기화 방식', type: 'select', value: 'none', options: [['none', '없음 (count++)'], ['volatile', 'volatile만 붙임'], ['sync', 'synchronized 블록'], ['atomic', 'AtomicInteger']] },
    { id: 'order', label: '스레드가 실행되는 순서', type: 'select', value: 'alt', options: [['alt', '한 단계씩 번갈아 (가장 많이 겹침)'], ['rand', '무작위로 섞임'], ['seq', '한 스레드가 다 끝낸 뒤 다음 (안 겹침)']], hint: '실제로는 운영체제가 정하며 실행할 때마다 달라집니다.' },
    { id: 'seed', label: '섞는 패턴', type: 'range', min: 1, max: 20, value: 7, fmt: function (v) { return v + '번 패턴'; }, show: function (c) { return c.order === 'rand'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '스레드 2개가 각각 count++를 3번씩 하는데 동기화 없이 한 단계씩 번갈아 실행되면 어떻게 되나', d: '동기화 없이 번갈아 실행. 증가가 사라집니다.', v: { threads: 2, loops: 3, sync: 'none', order: 'alt', seed: 7 } },
    { t: 'volatile만 붙여 보기', q: 'count에 volatile만 붙이면', d: '값은 최신으로 보이지만 단계가 섞이는 것은 막지 못합니다.', v: { threads: 2, loops: 3, sync: 'volatile', order: 'alt', seed: 7 } },
    { t: 'synchronized로 묶기', q: 'count++를 synchronized 블록으로 묶으면', d: '한 스레드가 count++를 마칠 때까지 다른 스레드가 기다립니다.', v: { threads: 2, loops: 3, sync: 'sync', order: 'alt', seed: 7 } },
    { t: 'AtomicInteger 쓰기', q: 'count를 AtomicInteger로 바꾸면', d: '락 없이, 읽은 값이 그대로일 때만 씁니다(CAS). 아니면 다시 합니다.', v: { threads: 2, loops: 3, sync: 'atomic', order: 'alt', seed: 7 } },
    { t: '운 좋게 안 겹친 경우', q: '동기화 없이 한 스레드가 다 끝난 뒤에 다음 스레드가 실행되면', d: '동기화가 없는데도 결과가 맞습니다. 테스트에서 버그가 안 잡히는 이유입니다.', v: { threads: 2, loops: 3, sync: 'none', order: 'seq', seed: 7 } },
    { t: '스레드 4개가 무작위로', q: '스레드를 4개로 늘리고 실행 순서를 무작위로 섞으면', d: '패턴 번호를 바꿔 가며 여러 번 실행해 보세요. 결과가 매번 다릅니다.', v: { threads: 4, loops: 3, sync: 'none', order: 'rand', seed: 7 } },
  ],
  code: function (c) {
    var decl = { none: 'static int count = 0;', volatile: 'static volatile int count = 0;', sync: 'static int count = 0;\nstatic final Object lock = new Object();', atomic: 'static final AtomicInteger count = new AtomicInteger();' }[c.sync];
    var body = { none: '        count++;                    // 읽기 -> 더하기 -> 쓰기', volatile: '        count++;                    // volatile이어도 세 단계', sync: '        synchronized (lock) {       // 한 번에 한 스레드만\n            count++;\n        }', atomic: '        count.incrementAndGet();    // 안에서: 읽기 -> CAS, 실패하면 다시' }[c.sync];
    return decl + '\n\nRunnable task = () -> {\n    for (int i = 0; i < ' + c.loops + '; i++) {\n' + body + '\n    }\n};\n\n// 스레드 ' + c.threads + '개가 같은 task를 동시에 실행\nfor (int t = 0; t < ' + c.threads + '; t++) {\n    new Thread(task).start();\n}';
  },
  label: function (c) { return { none: '동기화 없음', volatile: 'volatile', sync: 'synchronized', atomic: 'AtomicInteger' }[c.sync] + ' · 스레드 ' + c.threads + '개 × ' + c.loops + '번 · ' + { alt: '번갈아', rand: '무작위 ' + c.seed + '번', seq: '차례로' }[c.order]; },
  columns: ['기대값', '최종 값', '사라진 증가', '기다림·재시도'],
  simulate: function (c) {
    var names = 'ABCD', ths = [], count = 0, lost = 0, done = 0, waits = 0, retries = 0, lock = null, ev = [], seed = c.seed * 7919 + 13, rr = 0; var J = function (v, a, b) { var s = String(v), ch = s.charCodeAt(s.length - 1), k = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : [1, 8, 0, 1, 0, 0, 1, 8, 8, 0]['0123456789'.indexOf(s.slice(-1))] || 0; return s + (a === '으로' ? (k && k !== 8 ? a : b) : k ? a : b); };   // 값 뒤에 붙일 조사를 고른다
    for (var i = 0; i < c.threads; i++) ths.push({ id: names[i], left: c.loops, phase: 0, local: null, note: '시작 전' });
    function rnd(n) { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); }
    function alive() { return ths.filter(function (t) { return t.left > 0; }); }
    function snap(actor, waiter) { return { count: count, lost: lost, lock: lock, actor: actor, waiter: waiter, ths: ths.map(function (t) { return { id: t.id, left: t.left, local: t.local, phase: t.phase, note: t.note, blocked: !!t.blocked }; }) }; }
    function push(s, k, actor, waiter) { ev.push({ s: s, k: k, snap: snap(actor, waiter) }); }
    function pick() {
      var a = alive();
      if (c.order === 'seq') return a[0];
      if (c.order === 'rand') return a[rnd(a.length)];
      for (var n = 0; n < ths.length; n++) { var t = ths[(rr + n) % ths.length]; if (t.left > 0) { rr = (rr + n + 1) % ths.length; return t; } }
    }
    var guard = 0;
    while (alive().length && guard++ < 2000) {
      var t = pick();
      if (c.sync === 'sync' && lock && lock !== t.id) {
        if (!t.blocked) { t.blocked = true; waits++; t.note = '락을 기다리는 중'; push('스레드 ' + t.id + ': 블록에 들어가려 했지만 스레드 ' + lock + '가 락을 잡고 있습니다. 풀릴 때까지 기다립니다.', '', null, t.id); }
        t = ths.filter(function (x) { return x.id === lock; })[0];
      }
      if (c.sync === 'atomic') {
        if (t.phase === 0) {
          t.local = count; t.phase = 1; t.note = '읽은 값 ' + t.local;
          push('스레드 ' + t.id + ': 현재 값 ' + J(t.local, '을', '를') + ' 읽었습니다. 이 값이 그대로일 때만 ' + J(t.local + 1, '으로', '로') + ' 바꾸려고 합니다.', '', t.id);
        } else if (count === t.local) {
          count = t.local + 1; t.left--; t.phase = 0; t.local = null; t.note = t.left ? '남은 횟수 ' + t.left + '번' : '끝';
          push('스레드 ' + t.id + ': CAS 성공. count가 읽었던 값 ' + (count - 1) + ' 그대로여서 ' + J(count, '으로', '로') + ' 바꿨습니다. 비교와 쓰기는 CPU 명령 하나로 처리되어 그 사이에 다른 스레드가 끼어들 수 없습니다.', 'good', t.id);
        } else {
          retries++; push('스레드 ' + t.id + ': CAS 실패. 읽었던 값은 ' + t.local + '인데 그사이 count가 ' + J(count, '으로', '로') + ' 바뀌어 있습니다. 덮어쓰지 않고 처음부터 다시 읽습니다.', '', t.id);
          t.phase = 0; t.local = null; t.note = '다시 시도';
        }
        continue;
      }
      if (t.phase === 0) {
        if (c.sync === 'sync' && lock !== t.id) { lock = t.id; t.blocked = false; }
        t.local = count; t.phase = 1; t.note = '읽은 값 ' + t.local;
        push('스레드 ' + t.id + ': ' + (c.sync === 'sync' ? '락을 잡고 ' : '') + 'count를 읽었습니다. 읽은 값은 ' + t.local + '입니다.', '', t.id);
      } else if (t.phase === 1) {
        t.phase = 2; t.note = '계산한 값 ' + (t.local + 1) + ' (아직 안 씀)';
        push('스레드 ' + t.id + ': 읽은 값 ' + t.local + '에 1을 더해 ' + J(t.local + 1, '을', '를') + ' 만들었습니다. 아직 count에 쓰지는 않았습니다.', '', t.id);
      } else {
        var over = count - t.local, nv = t.local + 1; count = nv; done++; lost = done - count; t.left--; t.phase = 0; t.local = null;
        t.note = t.left ? '남은 횟수 ' + t.left + '번' : '끝';
        if (over > 0) { push('스레드 ' + t.id + ': count에 ' + J(nv, '을', '를') + ' 썼습니다. 그런데 이 스레드가 읽은 뒤로 다른 스레드가 count를 ' + (nv - 1 + over) + '까지 올려 놓았습니다. 그 위에 ' + J(nv, '을', '를') + ' 덮어써서 증가 ' + over + '번이 사라졌습니다.', 'bad', t.id); }
        else if (over < 0) push('스레드 ' + t.id + ': count에 ' + J(nv, '을', '를') + ' 썼습니다. 이 스레드가 읽은 뒤에 다른 스레드가 오래된 값으로 count를 ' + (nv - 1 + over) + '까지 되돌려 놓았지만, 그 위에 다시 ' + J(nv, '을', '를') + ' 덮어썼습니다. 지금까지 끝난 증가는 ' + done + '번인데 count는 ' + count + '입니다.', lost > 0 ? 'bad' : '', t.id);
        else push('스레드 ' + t.id + ': count에 ' + J(nv, '을', '를') + ' 썼습니다.' + (c.sync === 'sync' ? ' 블록을 나오면서 락을 풉니다.' : ''), '', t.id);
        if (c.sync === 'sync') lock = null;
      }
    }
    var expect = c.threads * c.loops, sum = [];
    if (lost > 0) sum.push('증가 ' + lost + '번이 사라졌습니다. 한 스레드가 읽고 쓰는 사이에 다른 스레드가 끼어들어, 오래된 값을 기준으로 계산한 결과가 덮어써졌기 때문입니다. 끼어드는 순서에 따라 결과가 달라지는 경쟁 상태입니다.');
    if (c.sync === 'volatile') sum.push('volatile은 다른 스레드가 쓴 값이 보이도록 해 줄 뿐입니다. 읽기-더하기-쓰기 세 단계를 하나로 묶어 주지 않아서 결과는 동기화가 없을 때와 같습니다.');
    if (c.sync === 'sync') sum.push('synchronized 블록 안에는 한 번에 한 스레드만 들어갈 수 있어서 세 단계가 끊기지 않았습니다. 대신 다른 스레드가 ' + waits + '번 기다렸습니다.');
    if (c.sync === 'atomic') sum.push('AtomicInteger는 락을 잡지 않습니다. 대신 "내가 읽은 값 그대로일 때만 쓴다"(CAS)를 지켜서, 다른 스레드가 먼저 바꿨으면 덮어쓰지 않고 다시 시도합니다.');
    if ((c.sync === 'none' || c.sync === 'volatile') && lost === 0) sum.push('이번에는 단계가 겹치지 않아 값이 맞았습니다. 코드가 안전해서가 아니라 순서가 우연히 좋았던 것입니다. 부하가 작은 테스트에서 이 버그가 드러나지 않는 이유입니다.');
    return { events: ev, summary: sum, expect: expect, row: [expect, count, lost + '번', c.sync === 'sync' ? '대기 ' + waits + '번' : c.sync === 'atomic' ? '재시도 ' + retries + '번' : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { count: 0, lost: 0, lock: null, ths: [] };
    H.title(v, '스레드');
    var ln = H.lanes(v), ph = c.sync === 'atomic' ? ['읽을 차례', 'CAS 할 차례'] : ['읽을 차례', '더할 차례', '쓸 차례'];
    for (var i = 0; i < c.threads; i++) {
      var th = s.ths[i], name = '스레드 ' + 'ABCD'[i];
      if (!th) { H.lane(ln, name, '시작 전', 'none'); continue; }
      var txt = th.left === 0 ? '끝' : th.blocked ? '락을 기다리는 중' : th.note + ' · ' + ph[th.phase];
      H.lane(ln, name, txt, th.left === 0 ? 'good' : th.blocked ? 'wait' : s.actor === th.id ? 'hot' : '');
    }
    H.text(v, '노란색은 방금 움직인 스레드, 파란색은 락을 기다리는 스레드입니다.');
  },
  // 그림: 가운데 위에 모두가 함께 쓰는 변수, 아래에 스레드들. 스레드는 값을 읽어 가서 자기 자리에서 더한 뒤 다시 쓴다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { count: 0, lost: 0, lock: null, actor: null, ths: [] }, n = c.threads, w = (648 - (n - 1) * 8) / n, atomic = c.sync === 'atomic', ph = atomic ? ['읽을 차례', 'CAS 할 차례'] : ['읽을 차례', '더할 차례', '쓸 차례'];
    P.size(680, 300);
    P.box('cnt', 230, 16, 220, 56, { cls: 'wait', title: '함께 쓰는 변수 count', sub: '지금 값: ' + s.count });
    if (c.sync === 'sync') P.box('lock', 474, 20, 190, 48, { cls: s.lock ? 'hot' : 'ghost', title: '락', sub: s.lock ? '스레드 ' + s.lock + '가 잡고 있음' : '비어 있음' });
    for (var i = 0; i < n; i++) {
      var th = s.ths[i], id = 'ABCD'.charAt(i), x = 16 + i * (w + 8);
      if (!th) { P.box('th' + id, x, 140, w, 72, { cls: 'plain', title: '스레드 ' + id, sub: ['시작 전', ' '] }); continue; }
      var active = s.actor === th.id && th.left !== 0;
      P.box('th' + id, x, 140, w, 72, { cls: th.left === 0 ? 'good' : th.blocked ? 'bad' : active ? 'hot now' : 'plain', title: '스레드 ' + id, sub: [th.left === 0 ? '끝' : th.blocked ? '락을 기다리는 중' : ph[th.phase], '읽어 둔 값: ' + (th.local === null ? '없음' : th.local)] });
      if (s.actor === th.id) { if (th.phase === 1) P.arrow('rw', 'cnt:b', 'th' + id + ':t', { label: '읽어 감' }); else if (th.phase === 0) P.arrow('rw', 'th' + id + ':t', 'cnt:b', { cls: 'hot', label: '씀' }); }
    }
    P.box('exp', 16, 240, 208, 40, { cls: 'plain', title: '기대값', right: String(sim.expect) });
    P.box('now', 236, 240, 208, 40, { cls: 'plain', title: '지금 count', right: String(s.count) });
    P.box('lost', 456, 240, 208, 40, { cls: s.lost ? 'bad' : 'good', title: '사라진 증가', right: s.lost + '번' });
    P.note('스레드는 count를 읽어 가서(아래로 가는 화살표) 자기 자리에서 1을 더한 뒤 다시 씁니다(위로 가는 화살표).');
  },
  assume: '한 번에 한 스레드의 한 단계만 실행하는 것으로 단순화했습니다. 실제 멀티코어에서는 여러 스레드가 진짜로 동시에 실행됩니다. 또 읽을 때는 항상 최신 값이 보인다고 가정했는데, 실제 일반 변수는 다른 스레드가 쓴 값이 보이지 않을 수도 있습니다(가시성 문제). 검증 실행(JDK 21)에서 스레드 2개가 100만 번씩 올리는 실제 코드를 돌렸을 때 동기화 없는 count++는 1,017,250 ~ 1,892,129로 매번 달랐고, volatile을 붙여도 모자랐으며, synchronized와 AtomicInteger는 항상 2,000,000이었습니다. AtomicInteger는 읽기 → CAS → 실패하면 재시도의 순서로 그렸는데, 실제 JVM은 CPU에 따라 이 증가를 명령 하나로 끝내기도 해서 재시도가 눈에 띄지 않을 수 있습니다.',
});
