Lab.register({
  id: 'btree', nav: '이진 탐색과 B-트리', cat: '자료구조', mode: 'step',
  title: '정렬돼 있으면 절반씩 버릴 수 있다',
  intro: '값 27개 중에서 하나를 찾습니다. 처음부터 하나씩 볼 수도 있고, 정렬돼 있다면 가운데를 보고 절반을 버릴 수도 있고, 한 번에 여러 갈래로 나누는 B-트리를 쓸 수도 있습니다.',
  terms: ['이진 탐색', '시간 복잡도(Big-O)', 'B-트리 인덱스', '풀 테이블 스캔', '인덱스'], ranks: ['ds', 'index'],
  controls: [
    { id: 'how', label: '찾는 방식', type: 'select', value: 'scan', options: [['scan', '처음부터 하나씩 (정렬 안 된 데이터)'], ['binary', '이진 탐색 (정렬된 배열)'], ['btree', 'B-트리 (노드 하나에 여러 값)']] },
    { id: 'target', label: '찾는 값', type: 'select', value: 230, options: [[10, '10 (맨 앞)'], [140, '140 (가운데)'], [230, '230 (뒤쪽)'], [270, '270 (맨 끝)'], [145, '145 (없는 값)']] },
    { id: 'n', label: '실제 테이블이 이만큼 크다면', type: 'select', value: 1000000, options: [[1000, '1천 건'], [1000000, '100만 건'], [1000000000, '10억 건']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '정렬 안 된 데이터에서 처음부터 하나씩 찾는 방식으로 뒤쪽의 230을 찾으면 몇 번 확인하나', d: '처음부터 하나씩. 뒤쪽 값까지 23번 봅니다.', v: { how: 'scan', target: 230, n: 1000000 } },
    { t: '이진 탐색으로', q: '정렬된 배열에서 이진 탐색으로 찾으면', d: '같은 값을 5번 만에 찾습니다.', v: { how: 'binary', target: 230, n: 1000000 } },
    { t: 'B-트리로', q: '노드 하나에 여러 값을 담는 B-트리로 찾으면', d: '노드 3개만 읽으면 어떤 값이든 찾습니다.', v: { how: 'btree', target: 230, n: 1000000 } },
    { t: '없는 값을 하나씩 찾으면', q: '없는 값 145를 처음부터 하나씩 찾으면', d: '끝까지 다 봐야 없다는 것을 압니다.', v: { how: 'scan', target: 145, n: 1000000 } },
    { t: '없는 값을 B-트리로', q: 'B-트리로 없는 값 145를 찾으면', d: '없다는 것도 노드 3개로 확인합니다.', v: { how: 'btree', target: 145, n: 1000000 } },
    { t: '10억 건이라면', q: 'B-트리로 찾는데 실제 테이블이 10억 건이라면', d: '아래 표에서 방식별 횟수 차이를 보세요.', v: { how: 'btree', target: 230, n: 1000000000 } },
  ],
  keys: function () { var a = []; for (var i = 1; i <= 27; i++) a.push(i * 10); return a; },
  // 정렬 안 된 순서: 실제 테이블에 쌓인 순서라고 가정한 고정 배열 (각 값의 위치는 정렬 순서와 같게 두어 비교를 쉽게 함)
  // 깊이 계산: 한 번에 f갈래로 나눌 때 n건을 가려내는 데 필요한 단계 수
  depth: function (n, f) { var h = 0, cap = 1; while (cap < n) { cap *= f; h++; } return h; },
  // 실제 계산: 방식별 탐색 과정
  trace: function (how, target) {
    var a = this.keys(), steps = [], i;
    if (how === 'scan') { for (i = 0; i < a.length; i++) { steps.push({ at: [i], cmp: a[i] }); if (a[i] === target) return { steps: steps, found: true, count: steps.length }; } return { steps: steps, found: false, count: steps.length }; }
    if (how === 'binary') {
      var lo = 0, hi = a.length - 1;
      while (lo <= hi) { var mid = (lo + hi) >> 1; steps.push({ at: [mid], cmp: a[mid], lo: lo, hi: hi }); if (a[mid] === target) return { steps: steps, found: true, count: steps.length }; if (a[mid] < target) lo = mid + 1; else hi = mid - 1; }
      return { steps: steps, found: false, count: steps.length };
    }
    // B-트리(B+트리): 뿌리 [100,190] → 가지 3개(구분값 2개씩) → 잎 9개(값 3개씩)
    var pick = function (seps) { return target < seps[0] ? 0 : target < seps[1] ? 1 : 2; };
    var r = pick([100, 190]); steps.push({ node: '뿌리', seps: [100, 190], child: r });
    var bs = [a[r * 9 + 3], a[r * 9 + 6]], b = pick(bs); steps.push({ node: '가지 ' + (r + 1), seps: bs, child: b, branch: r });
    var leaf = r * 3 + b, lk = a.slice(leaf * 3, leaf * 3 + 3); steps.push({ node: '잎 ' + (leaf + 1), keys: lk, leaf: leaf, branch: r });
    return { steps: steps, found: lk.indexOf(target) >= 0, count: 3, leaf: leaf, branch: r };
  },
  code: function (c) {
    if (c.how === 'scan') return '// 정렬돼 있지 않으면 앞에서부터 전부 확인하는 수밖에 없다\nfor (int i = 0; i < rows.length; i++) {\n    if (rows[i] == target) return i;\n}\nreturn -1;                              // 끝까지 봐야 "없다"를 안다\n\n-- DB에서는 인덱스가 없는 컬럼으로 찾는 것과 같다 (풀 테이블 스캔)\nSELECT * FROM orders WHERE amount = ' + c.target + ';';
    if (c.how === 'binary') return '// 정렬된 배열: 가운데를 보고 절반을 버린다\nint lo = 0, hi = sorted.length - 1;\nwhile (lo <= hi) {\n    int mid = (lo + hi) >>> 1;\n    if (sorted[mid] == target) return mid;\n    if (sorted[mid] < target) lo = mid + 1;   // 왼쪽 절반을 버림\n    else hi = mid - 1;                        // 오른쪽 절반을 버림\n}\nreturn -1;\n\n// 자바: Arrays.binarySearch(sorted, target)';
    return '-- 인덱스를 만들면 DB가 B-트리를 만들어 둔다\nCREATE INDEX idx_amount ON orders (amount);\n\nSELECT * FROM orders WHERE amount = ' + c.target + ';\n\n-- 뿌리 노드를 읽어 어느 가지로 갈지 정하고\n-- 가지 노드를 읽어 어느 잎으로 갈지 정하고\n-- 잎 노드에서 값을 찾는다\n-- 노드 하나는 디스크의 한 페이지(InnoDB 기본 16KB)';
  },
  label: function (c) { return { scan: '하나씩', binary: '이진 탐색', btree: 'B-트리' }[c.how] + ' · ' + c.target + ' 찾기'; },
  columns: ['27건에서 확인한 횟수', '결과', '선택한 건수에서 (가장 오래 걸릴 때)'],
  simulate: function (c) {
    var tg = +c.target, a = this.keys(), T = this.trace(c.how, tg), ev = [], sum = [], self = this;
    var base = { how: c.how, target: tg, seen: [], cur: -1, lo: 0, hi: 26, path: [], done: false, found: false };
    function push(s, k, o) { var x = JSON.parse(JSON.stringify(base)); for (var p in o) x[p] = o[p]; ev.push({ s: s, k: k, snap: x }); }
    if (c.how === 'scan') {
      push('값 27개가 정렬되지 않은 채 쌓여 있다고 봅니다(화면에는 보기 쉽게 크기 순으로 놓았습니다). 어디에 있는지 알 단서가 없으므로 앞에서부터 하나씩 확인합니다.', '', {});
      var seen = [];
      T.steps.forEach(function (st, i) {
        seen.push(st.at[0]); var hit = st.cmp === tg, lastOne = i === T.steps.length - 1;
        if (hit || lastOne || i < 2 || i % 6 === 5) push((i + 1) + '번째 확인: ' + st.cmp + (hit ? ' → 찾았습니다.' : lastOne ? ' → 아닙니다. 끝까지 봤지만 없습니다.' : ' → 아닙니다. 다음 칸으로 갑니다.'), hit ? 'good' : lastOne ? 'bad' : '', { seen: seen.slice(), cur: st.at[0], done: hit || lastOne, found: hit });
      });
    } else if (c.how === 'binary') {
      push('값 27개가 크기 순으로 정렬돼 있습니다. 가운데 값을 보고, 찾는 값이 그보다 작으면 오른쪽 절반을, 크면 왼쪽 절반을 통째로 버립니다.', '', {});
      var seenB = [];
      T.steps.forEach(function (st, i) {
        seenB.push(st.at[0]); var hit = st.cmp === tg, lastOne = i === T.steps.length - 1, left = st.hi - st.lo + 1;
        push((i + 1) + '번째 확인: 남은 ' + left + '칸의 가운데 값 ' + st.cmp + (hit ? ' → 찾았습니다.' : st.cmp < tg ? ' → 찾는 값(' + tg + ')보다 작습니다. 이 칸과 왼쪽을 모두 버립니다.' : ' → 찾는 값(' + tg + ')보다 큽니다. 이 칸과 오른쪽을 모두 버립니다.') + (!hit && lastOne ? ' 남은 칸이 없으므로 없는 값입니다.' : ''), hit ? 'good' : lastOne ? 'bad' : '', { seen: seenB.slice(), cur: st.at[0], lo: hit ? st.lo : st.cmp < tg ? st.at[0] + 1 : st.lo, hi: hit ? st.hi : st.cmp < tg ? st.hi : st.at[0] - 1, done: hit || lastOne, found: hit });
      });
    } else {
      push('같은 27개를 B-트리로 저장했습니다. 맨 아래 잎 노드 9개에 값이 세 개씩 정렬돼 들어 있고, 위쪽 노드에는 "어느 쪽으로 내려갈지"를 알려 주는 구분값만 있습니다. 노드 하나를 읽는 것이 디스크를 한 번 읽는 것입니다.', '', {});
      var path = [];
      T.steps.forEach(function (st, i) {
        path.push(st);
        if (st.seps) push((i + 1) + '번째 읽기: ' + st.node + ' 노드 [' + st.seps.join(', ') + ']. ' + '찾는 값(' + tg + ')은 ' + (st.child === 0 ? st.seps[0] + '보다 작으므로 첫째' : st.child === 1 ? st.seps[0] + ' 이상 ' + st.seps[1] + ' 미만이므로 둘째' : st.seps[1] + ' 이상이므로 셋째') + ' 갈래로 내려갑니다. 나머지 두 갈래 아래의 값들은 보지 않습니다.', '', { path: path.slice() });
        else push('3번째 읽기: ' + st.node + ' 노드 [' + st.keys.join(', ') + ']. ' + (T.found ? '찾는 값(' + tg + ')이 여기 있습니다.' : '찾는 값(' + tg + ')이 들어갈 자리인데 없습니다. 없는 값입니다.'), T.found ? 'good' : 'bad', { path: path.slice(), done: true, found: T.found });
      });
    }
    var N = +c.n, worst = { scan: N, binary: self.depth(N + 1, 2), b3: self.depth(N, 3), b500: self.depth(N, 500) };
    var fmtN = function (x) { return x >= 100000000 ? (x / 100000000) + '억' : x >= 10000 ? (x / 10000) + '만' : String(x); };
    var unit = c.how === 'btree' ? '노드 ' + T.count + '개 읽음' : T.count + '번 확인';
    if (c.how === 'scan') sum.push('하나씩 찾는 방식은 데이터가 10배가 되면 확인 횟수도 10배가 됩니다(O(n)). 없는 값은 끝까지 봐야 합니다. 인덱스가 없는 컬럼으로 조회하면 DB가 하는 일이 이것입니다.');
    if (c.how === 'binary') sum.push('한 번 확인할 때마다 후보가 절반으로 줄어듭니다(O(log n)). 데이터가 1천 배가 되어도 확인은 10번쯤만 늘어납니다. 단, 데이터가 정렬돼 있어야 하고, 정렬된 배열은 중간에 값을 끼워 넣기가 비쌉니다.');
    if (c.how === 'btree') sum.push('B-트리는 한 번에 둘이 아니라 여러 갈래로 나눕니다. 갈래가 많을수록 트리가 낮아지고, 읽어야 할 노드(디스크 페이지)가 줄어듭니다. 실제 DB 인덱스는 노드 하나에 수백 개의 값을 담아 수억 건도 서너 단계로 찾습니다.');
    sum.push('세 방식의 차이는 "정렬해 두었는가"와 "한 번에 얼마나 많이 버리는가"입니다. DB 인덱스는 값을 정렬해 B-트리로 저장해 두는 것이고, 그 대가로 넣고 고칠 때마다 트리도 함께 고쳐야 합니다.');
    return { events: ev, summary: sum, row: [unit, T.found ? '찾음' : '없음', { scan: fmtN(worst.scan) + '번', binary: worst.binary + '번', btree: '500갈래 기준 ' + worst.b500 + '단계' }[c.how]], worst: worst, big: fmtN(N) };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 탐색을 한 단계씩 보여 줍니다.'); return; }
    if (s.how !== 'btree') {
      H.counters(v, [[s.how === 'binary' ? (s.found ? '-' : Math.max(0, s.hi - s.lo + 1) + '칸') : (27 - s.seen.length) + '칸', s.how === 'binary' ? '아직 후보로 남은 칸' : '아직 안 본 칸']]);
    } else {
      var p = s.path;
      H.counters(v, [[p.length + '개', '읽은 노드 (디스크 읽기 횟수)'], [(13 - p.length) + '개', '읽지 않은 노드']]);
    }
    if (s.done) { var w = sim.worst; H.table(v, ['방식', sim.big + ' 건에서 가장 오래 걸릴 때', '늘어나는 모양'], [['처음부터 하나씩', sim.big + '번 확인', 'O(n): 데이터에 비례'], ['이진 탐색', w.binary + '번 확인', 'O(log n): 절반씩 줄임'], ['B-트리 (노드당 3갈래)', w.b3 + '단계', 'O(log n): 3분의 1씩 줄임'], ['B-트리 (노드당 500갈래)', w.b500 + '단계', 'O(log n): 500분의 1씩 줄임']].map(function (r, i) { var on = (s.how === 'scan' && i === 0) || (s.how === 'binary' && i === 1) || (s.how === 'btree' && i >= 2); return { cells: [{ v: r[0], cls: on ? 'hot' : '' }, r[1], r[2]] }; }), '데이터가 많아지면'); }
  },
  // 그림: 하나씩 찾기와 이진 탐색은 칸 27개, B-트리는 뿌리, 가지, 잎을 실제 트리 모양으로 그린다.
  draw: function (P, sim, shown) {
    var a = this.keys(), last = shown[shown.length - 1], s = last ? last.snap : { how: sim.c.how, seen: [], cur: -1, lo: 0, hi: 26, path: [], done: false, found: false };
    if (s.how !== 'btree') {
      P.size(680, 190);
      P.region('arr', 16, 16, 648, 158, s.how === 'scan' ? '값 27개 (순서를 모르므로 앞에서부터 하나씩 확인)' : '정렬된 값 27개 (가운데를 보고 절반을 버림)');
      a.forEach(function (k, i) {
        var cand = s.how === 'binary' ? (i >= s.lo && i <= s.hi && s.seen.indexOf(i) < 0) : s.seen.indexOf(i) < 0;
        P.box('c' + i, 28 + (i % 14) * 44.5, 56 + Math.floor(i / 14) * 40, 40, 28, { cls: i === s.cur ? (s.done ? (s.found ? 'good now' : 'bad now') : 'hot now') : cand ? 'wait' : 'ghost', sub: String(k), center: true });
      });
      P.text('cnt', 28, 160, '확인한 횟수 ' + s.seen.length + '번', { cls: s.done ? (s.found ? 'good' : 'bad') : 'mut' });
      P.note('파란 칸은 아직 후보, 점선 칸은 후보에서 빠진 칸, 굵은 테두리는 지금 확인하는 칸입니다.');
      return;
    }
    var p = s.path, br = p.length > 1 ? p[1].branch : -1, lf = p.length > 2 ? p[2].leaf : -1;
    P.size(680, 278);
    P.region('tree', 16, 16, 648, 246, 'B-트리: 노드 하나를 읽는 것이 디스크를 한 번 읽는 것');
    P.box('root', 290, 46, 100, 28, { cls: p.length ? 'hot' + (p.length === 1 ? ' now' : '') : 'plain', sub: '100 | 190', center: true });
    for (var i = 0; i < 3; i++) {
      P.box('br' + i, 70 + i * 220, 112, 100, 28, { cls: i === br ? 'hot' + (p.length === 2 ? ' now' : '') : 'plain', sub: a[i * 9 + 3] + ' | ' + a[i * 9 + 6], center: true });
      P.arrow('rb' + i, 'root:b:' + (0.25 + i * 0.25), 'br' + i + ':t', { cls: i === br ? 'hot' : 'mut' });
    }
    for (var j = 0; j < 9; j++) {
      P.box('lf' + j, 20 + j * 71.5, 184, 67, 58, { cls: j === lf ? (s.found ? 'good now' : 'bad now') : 'plain', sub: a.slice(j * 3, j * 3 + 3).map(String), center: true });
      P.arrow('bl' + j, 'br' + Math.floor(j / 3) + ':b:' + (0.25 + (j % 3) * 0.25), 'lf' + j + ':t', { cls: j === lf ? 'hot' : 'mut' });
    }
    P.note('노란 노드는 읽은 노드이고, 나머지 노드는 읽지 않고 건너뛰었습니다. 위쪽 노드의 숫자는 어느 쪽으로 내려갈지 알려 주는 구분값이고, 실제 값은 맨 아래 잎 노드에 있습니다.');
  },
  assume: '27건에서의 탐색 과정과 횟수는 이 페이지가 알고리즘을 실제로 실행한 결과입니다. 큰 건수의 횟수는 "한 번에 몇 갈래로 나누는가"로 계산한 최대 단계 수입니다. 화면의 B-트리는 값이 잎 노드에만 있는 B+트리 모양으로, MySQL InnoDB의 인덱스가 이 구조입니다. 실제 인덱스에서 노드 하나에 몇 개의 값이 들어가는지는 키의 크기에 따라 달라지며 500은 예시로 든 값입니다. 뿌리와 가지 노드는 보통 메모리에 올라와 있어 실제 디스크 읽기는 더 적습니다.',
});
