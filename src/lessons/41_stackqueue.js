Lab.register({
  id: 'sqh', nav: '스택·큐·우선순위 큐', cat: '자료구조', mode: 'step',
  title: '넣은 순서와 꺼내는 순서',
  intro: '같은 숫자 다섯 개를 같은 순서로 넣어도, 자료구조에 따라 꺼내지는 순서가 다릅니다. 스택은 나중에 넣은 것부터, 큐는 먼저 넣은 것부터, 우선순위 큐는 가장 작은 것부터 나옵니다.',
  terms: ['스택, 큐, 덱', '힙과 우선순위 큐', '시간 복잡도(Big-O)'], ranks: ['ds', 'collection'],
  controls: [
    { id: 'ds', label: '자료구조', type: 'select', value: 'pq', options: [['stack', '스택 (ArrayDeque의 push / pop)'], ['queue', '큐 (ArrayDeque의 offer / poll)'], ['pq', '우선순위 큐 (PriorityQueue)']] },
    { id: 'inp', label: '넣는 순서', type: 'select', value: 'mixed', options: [['mixed', '5, 2, 8, 1, 9 (섞인 순서)'], ['asc', '1, 2, 5, 8, 9 (오름차순)'], ['desc', '9, 8, 5, 2, 1 (내림차순)']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '우선순위 큐. 넣은 순서와 상관없이 작은 것부터 나옵니다.', v: { ds: 'pq', inp: 'mixed' } },
    { t: '스택', d: '마지막에 넣은 9가 가장 먼저 나옵니다.', v: { ds: 'stack', inp: 'mixed' } },
    { t: '큐', d: '넣은 순서 그대로 나옵니다.', v: { ds: 'queue', inp: 'mixed' } },
    { t: '우선순위 큐에 내림차순으로', d: '넣을 때마다 새 값이 맨 위까지 올라갑니다.', v: { ds: 'pq', inp: 'desc' } },
  ],
  INPUTS: { mixed: [5, 2, 8, 1, 9], asc: [1, 2, 5, 8, 9], desc: [9, 8, 5, 2, 1] },
  code: function (c) {
    var a = this.INPUTS[c.inp].join(', ');
    if (c.ds === 'stack') return 'Deque<Integer> stack = new ArrayDeque<>();\nfor (int x : List.of(' + a + ')) stack.push(x);\n\nwhile (!stack.isEmpty()) System.out.print(stack.pop() + " ");';
    if (c.ds === 'queue') return 'Queue<Integer> queue = new ArrayDeque<>();\nfor (int x : List.of(' + a + ')) queue.offer(x);\n\nwhile (!queue.isEmpty()) System.out.print(queue.poll() + " ");';
    return 'PriorityQueue<Integer> pq = new PriorityQueue<>();   // 작은 값이 먼저\nfor (int x : List.of(' + a + ')) pq.offer(x);\n\nwhile (!pq.isEmpty()) System.out.print(pq.poll() + " ");';
  },
  label: function (c) { return { stack: '스택', queue: '큐', pq: '우선순위 큐' }[c.ds] + ' · ' + this.INPUTS[c.inp].join(', '); },
  columns: ['꺼낸 순서', '넣기 한 번', '꺼내기 한 번'],
  // 실제 실행 결과와 대조하는 데 쓰는 순수 계산
  run: function (c) {
    var inp = this.INPUTS[c.inp], a = [], out = [], heapIn = [], heapOut = [], steps = [];
    inp.forEach(function (x) {
      if (c.ds !== 'pq') { a.push(x); steps.push({ op: 'in', x: x, a: a.slice(), moves: 0 }); return; }
      var k = a.length, moves = 0; a.push(x);
      while (k > 0) { var p = (k - 1) >> 1; if (a[p] <= x) break; a[k] = a[p]; k = p; moves++; } a[k] = x;
      heapIn.push(a.slice()); steps.push({ op: 'in', x: x, a: a.slice(), moves: moves, at: k });
    });
    while (a.length) {
      if (c.ds === 'stack') { var s = a.pop(); out.push(s); steps.push({ op: 'out', x: s, a: a.slice(), moves: 0 }); continue; }
      if (c.ds === 'queue') { var q = a.shift(); out.push(q); steps.push({ op: 'out', x: q, a: a.slice(), moves: 0 }); continue; }
      var root = a[0], last = a.pop(), n = a.length, mv = 0;
      if (n > 0) { var i = 0, half = n >> 1; while (i < half) { var ch = 2 * i + 1, r = ch + 1, cv = a[ch]; if (r < n && cv > a[r]) { ch = r; cv = a[r]; } if (last <= cv) break; a[i] = cv; i = ch; mv++; } a[i] = last; }
      out.push(root); heapOut.push(a.slice()); steps.push({ op: 'out', x: root, a: a.slice(), moves: mv });
    }
    return { out: out, heapIn: heapIn, heapOut: heapOut, steps: steps };
  },
  simulate: function (c) {
    var r = this.run(c), ev = [], outs = [], sum = [];
    r.steps.forEach(function (st) {
      if (st.op === 'out') outs.push(st.x);
      var s;
      if (c.ds === 'stack') s = st.op === 'in' ? 'push(' + st.x + '): 맨 위에 올립니다.' : 'pop(): 맨 위에 있는 ' + st.x + ' 꺼냄. 가장 나중에 넣은 것입니다.';
      else if (c.ds === 'queue') s = st.op === 'in' ? 'offer(' + st.x + '): 줄의 맨 뒤에 세웁니다.' : 'poll(): 줄의 맨 앞에 있는 ' + st.x + ' 꺼냄. 가장 먼저 넣은 것입니다.';
      else s = st.op === 'in' ? 'offer(' + st.x + '): 배열 맨 끝에 넣은 뒤, 부모보다 작으면 자리를 바꾸며 위로 올라갑니다. ' + (st.moves ? st.moves + '번 올라가 ' + (st.at === 0 ? '맨 위(가장 작은 값의 자리)에 도착했습니다.' : '멈췄습니다.') : (st.at === 0 ? '첫 값이라 맨 위에 그대로 놓입니다.' : '부모보다 작지 않아 그 자리에 머뭅니다.')) : 'poll(): 맨 위의 가장 작은 값 ' + st.x + ' 꺼냄. 빈 맨 위에 배열의 마지막 값을 올린 뒤, 두 자식 중 작은 쪽과 자리를 바꾸며 내려갑니다(' + st.moves + '번 내려감).';
      ev.push({ s: s, k: st.op === 'out' ? 'good' : '', snap: { a: st.a, outs: outs.slice(), op: st.op, x: st.x } });
    });
    if (c.ds === 'stack') sum.push('스택은 후입선출(LIFO)입니다. 메서드 호출 스택, 되돌리기(undo), 괄호 짝 검사처럼 "가장 최근 것부터" 처리할 때 씁니다. 넣기와 꺼내기 모두 O(1)입니다. 자바에서는 오래된 Stack 클래스 대신 ArrayDeque를 씁니다.');
    if (c.ds === 'queue') sum.push('큐는 선입선출(FIFO)입니다. 작업 대기열, 메시지 큐, 너비 우선 탐색처럼 "먼저 온 것부터" 처리할 때 씁니다. 넣기와 꺼내기 모두 O(1)입니다.');
    if (c.ds === 'pq') { sum.push('우선순위 큐는 넣은 순서와 무관하게 가장 작은 값이 먼저 나옵니다. 내부 배열은 완전히 정렬돼 있지 않고, "부모는 자식보다 작거나 같다"는 조건만 지킵니다(힙). 그래서 맨 위가 항상 최솟값입니다.'); sum.push('넣기와 꺼내기는 트리의 높이만큼만 자리를 바꾸므로 O(log n)입니다. 전체를 매번 정렬하는 것보다 훨씬 쌉니다. 작업 스케줄링, 상위 N개 구하기, 최단 경로 알고리즘에 씁니다.'); }
    return { events: ev, summary: sum, row: [r.out.join(' '), c.ds === 'pq' ? 'O(log n)' : 'O(1)', c.ds === 'pq' ? 'O(log n)' : 'O(1)'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { a: [], outs: [] };
    H.title(v, c.ds === 'stack' ? '스택 (오른쪽이 맨 위)' : c.ds === 'queue' ? '큐 (왼쪽이 맨 앞, 오른쪽이 맨 뒤)' : '내부 배열 (0번 칸이 맨 위 = 가장 작은 값)');
    H.slots(v, s.a.map(function (x, i) { var hot = c.ds === 'stack' ? i === s.a.length - 1 : i === 0; return [String(x), hot ? 'b' : 'q']; }), '비어 있음');
  },
  // 그림: 스택은 위로 쌓고, 큐는 옆으로 줄 세우고, 우선순위 큐는 트리(힙)로 그린다. 꺼낸 값은 아래 줄로 옮겨 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { a: [], outs: [] }, a = s.a, n = a.length;
    P.size(680, 330);
    P.region('ds', 16, 16, 648, 220, c.ds === 'stack' ? '스택: 맨 위로 넣고 맨 위에서 꺼냄' : c.ds === 'queue' ? '큐: 뒤로 넣고 앞에서 꺼냄' : '우선순위 큐: 부모가 자식보다 작거나 같은 트리 (힙)');
    P.region('out', 16, 250, 648, 64, '꺼낸 순서');
    if (c.ds === 'stack') {
      a.forEach(function (x, i) { P.box('v' + x, 280, 226 - (i + 1) * 30, 120, 26, { cls: i === n - 1 ? 'hot now' : 'wait', sub: String(x), center: true }); });
      if (n) P.text('top', 270, 226 - n * 30 + 18, '맨 위', { anchor: 'end', cls: 'mut' });
    } else if (c.ds === 'queue') {
      a.forEach(function (x, i) { P.box('v' + x, 125 + i * 90, 110, 70, 34, { cls: i === 0 ? 'hot now' : 'wait', sub: String(x), center: true }); if (i) P.arrow('q' + i, 'v' + x + ':l', 'v' + a[i - 1] + ':r', { cls: 'mut' }); });
      if (n) { P.text('qh', 125, 100, '맨 앞 (다음에 나감)', { cls: 'mut' }); P.text('qt', 125 + (n - 1) * 90 + 70, 164, '맨 뒤 (방금 들어옴)', { cls: 'mut', anchor: 'end' }); }
    } else {
      var pos = [[340, 50], [220, 100], [460, 100], [160, 150], [280, 150], [400, 150], [520, 150]];
      a.forEach(function (x, i) { P.box('v' + x, pos[i][0] - 26, pos[i][1], 52, 28, { cls: i === 0 ? 'hot now' : 'wait', sub: String(x), center: true }); if (i) P.arrow('e' + i, 'v' + a[(i - 1) >> 1] + ':b', 'v' + x + ':t', { cls: 'mut' }); });
      if (n) P.text('arrl', 28, 219, '내부 배열', { cls: 'mut' });
      a.forEach(function (x, i) { P.box('a' + x, 110 + i * 46, 202, 42, 24, { cls: i === 0 ? 'hot' : 'plain', sub: String(x), center: true }); });
    }
    if (!n && !s.outs.length) P.text('hint', 340, 130, '실행을 누르면 값을 하나씩 넣습니다', { cls: 'mut', anchor: 'middle' });
    s.outs.forEach(function (x, k) { P.box('v' + x, 28 + k * 54, 280, 46, 26, { cls: 'good', sub: String(x), center: true }); });
    P.note(c.ds === 'pq' ? '노란 칸이 맨 위(가장 작은 값)입니다. 트리는 아래의 내부 배열을 다르게 본 모습이며, i번 칸의 자식은 2i+1번과 2i+2번 칸입니다.' : '노란 칸이 다음에 꺼낼 값입니다. 꺼낸 값은 아래 줄로 옮겨 갑니다.');
  },
  assume: '꺼낸 순서와 우선순위 큐 내부 배열의 변화는 이 PC의 JDK 21에서 실제 ArrayDeque와 PriorityQueue를 실행해 대조했습니다(내부 배열은 넣을 때마다, 꺼낼 때마다 모두 일치). PriorityQueue는 기본적으로 작은 값이 먼저 나오며, Comparator를 주면 기준을 바꿀 수 있습니다.',
});
