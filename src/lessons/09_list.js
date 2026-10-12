Lab.register({
  id: 'list', nav: 'ArrayList와 LinkedList', cat: '자료구조', mode: 'step',
  title: '같은 연산인데 드는 일의 양이 다르다',
  intro: 'ArrayList는 배열 한 덩어리에 원소를 붙여 저장하고, LinkedList는 원소마다 노드를 만들어 앞뒤로 연결합니다. 조회, 삽입, 삭제를 위치를 바꿔 가며 해 보면 한쪽은 원소를 옮기느라, 다른 쪽은 노드를 따라가느라 일을 합니다.',
  terms: ['ArrayList', 'LinkedList', '시간 복잡도(Big-O)', '분할 상환 분석'], ranks: ['collection', 'ds'],
  controls: [
    { id: 'ds', label: '자료구조', type: 'select', value: 'array', options: [['array', 'ArrayList'], ['linked', 'LinkedList']] },
    { id: 'op', label: '연산', type: 'select', value: 'add', options: [['get', '인덱스로 조회 get(i)'], ['add', '삽입 add(i, x)'], ['remove', '삭제 remove(i)'], ['append', '빈 리스트에 맨 뒤로 계속 추가 add(x)']] },
    { id: 'pos', label: '위치', type: 'select', value: 'front', options: [['front', '맨 앞'], ['mid', '가운데'], ['back', '맨 뒤']], show: function (c) { return c.op !== 'append'; } },
    { id: 'n', label: '원소 개수', type: 'range', min: 5, max: 40, value: 10, fmt: function (v) { return v + '개'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '원소 10개인 ArrayList의 맨 앞에 값을 삽입하면 일이 얼마나 드나', d: 'ArrayList 맨 앞에 삽입. 원소 전부를 한 칸씩 뒤로 밉니다.', v: { ds: 'array', op: 'add', pos: 'front', n: 10 } },
    { t: '같은 삽입을 LinkedList에', q: '자료구조를 LinkedList로 바꿔 같은 맨 앞 삽입을 하면', d: '연결만 바꾸면 됩니다. 옮기는 원소가 없습니다.', v: { ds: 'linked', op: 'add', pos: 'front', n: 10 } },
    { t: 'LinkedList 가운데 삽입', q: 'LinkedList인데 삽입 위치를 맨 앞에서 가운데로 바꾸면', d: '삽입 자체는 빠르지만 그 자리까지 노드를 따라가야 합니다.', v: { ds: 'linked', op: 'add', pos: 'mid', n: 10 } },
    { t: 'LinkedList 가운데 조회', q: 'LinkedList에 원소 20개를 두고 가운데를 인덱스로 조회하면', d: '인덱스로 바로 갈 수 없어 하나씩 따라갑니다.', v: { ds: 'linked', op: 'get', pos: 'mid', n: 20 } },
    { t: 'ArrayList 가운데 조회', q: 'ArrayList에 원소 20개를 두고 가운데를 인덱스로 조회하면', d: '원소가 몇 개든 한 번에 접근합니다.', v: { ds: 'array', op: 'get', pos: 'mid', n: 20 } },
    { t: 'ArrayList에 40개 연속 추가', q: '빈 ArrayList에 맨 뒤로 원소 40개를 계속 추가하면', d: '배열이 꽉 찰 때만 큰 배열로 옮깁니다. 평균 비용을 보세요.', v: { ds: 'array', op: 'append', pos: 'back', n: 40 } },
  ],
  idx: function (c) { return c.pos === 'front' ? 0 : c.pos === 'mid' ? c.n >> 1 : c.op === 'add' ? c.n : c.n - 1; },
  code: function (c) {
    var T = c.ds === 'array' ? 'ArrayList' : 'LinkedList', i = this.idx(c);
    if (c.op === 'append') return 'List<Integer> list = new ' + T + '<>();   // 빈 리스트\nfor (int x = 1; x <= ' + c.n + '; x++) {\n    list.add(x);                     // 맨 뒤에 추가\n}';
    var call = c.op === 'get' ? 'list.get(' + i + ');' : c.op === 'add' ? 'list.add(' + i + ', 99);' : 'list.remove(' + i + ');';
    return 'List<Integer> list = new ' + T + '<>();\n// ... 원소 ' + c.n + '개가 들어 있는 상태 (인덱스 0 ~ ' + (c.n - 1) + ')\n\n' + call + '        // ' + { front: '맨 앞', mid: '가운데', back: '맨 뒤' }[c.pos];
  },
  label: function (c) { return (c.ds === 'array' ? 'ArrayList' : 'LinkedList') + ' · ' + (c.op === 'append' ? '연속 추가' : { get: '조회', add: '삽입', remove: '삭제' }[c.op] + ' ' + { front: '맨 앞', mid: '가운데', back: '맨 뒤' }[c.pos]) + ' · ' + c.n + '개'; },
  columns: ['따라간 노드', '옮기거나 복사한 원소', '시간 복잡도'],
  simulate: function (c) {
    var arr = c.ds === 'array', n = c.n, ev = [], hops = 0, moved = 0, big = '', sum = [];
    function push(s, k, snap) { ev.push({ s: s, k: k, snap: snap }); }
    function cells(count, mark) { var a = []; for (var j = 0; j < count; j++) a.push([String(j), mark(j) || 'd']); return a; }
    if (c.op === 'append') {
      var cap = 0, size = 0, copies = 0;
      for (var x = 1; x <= n; x++) {
        if (arr && size === cap) {
          var nc = cap === 0 ? 10 : cap + Math.max(1, cap >> 1), cp = size; copies += cp;
          push(cap === 0 ? 'add(' + x + '): 첫 추가라서 10칸짜리 배열을 만듭니다.' : 'add(' + x + '): 배열 ' + cap + '칸이 꽉 찼습니다. 1.5배인 ' + nc + '칸짜리 새 배열을 만들고 기존 원소 ' + cp + '개를 전부 복사한 뒤 넣습니다.', cap === 0 ? '' : 'bad', { size: size + 1, cap: nc, copies: copies, last: size });
          cap = nc; size++;
        } else { size++; push('add(' + x + '): ' + (arr ? '빈 칸이 있어 바로 넣습니다. 복사 없음.' : '새 노드를 만들어 마지막 노드 뒤에 연결합니다. 마지막 노드의 위치를 따로 기억하고 있어서 따라갈 필요가 없습니다.'), '', { size: size, cap: arr ? cap : size, copies: copies, last: size - 1 }); }
      }
      moved = copies; big = arr ? 'O(1) (분할 상환)' : 'O(1)';
      if (arr) { sum.push('가끔 비싼 복사가 있어도 대부분의 추가는 복사 없이 끝나므로, 평균으로 보면 추가 한 번의 비용은 일정합니다. 이것을 분할 상환 O(1)이라고 합니다. 개수를 미리 알면 new ArrayList<>(' + n + ')처럼 용량을 정해 복사를 없앨 수 있습니다.'); }
      else sum.push('LinkedList는 복사가 없습니다. 대신 원소마다 노드 객체를 하나씩 만들고(' + n + '개), 노드마다 앞뒤 참조 두 개를 더 저장하므로 메모리를 더 씁니다.');
      return { events: ev, summary: sum, row: ['0개', copies + '개', big], kind: 'append' };
    }
    var i = this.idx(c), where = { front: '맨 앞', mid: '가운데', back: '맨 뒤' }[c.pos], last;
    if (arr) {
      if (c.op === 'get') { push('get(' + i + '): 배열은 메모리에 연속으로 놓여 있어서, 시작 주소에 인덱스만큼 더하면 ' + i + '번 칸의 위치를 바로 계산할 수 있습니다. 한 번에 읽습니다.', 'good', { cells: cells(n, function (j) { return j === i ? 'b now' : ''; }) }); big = 'O(1)'; sum.push('ArrayList의 인덱스 조회는 원소 개수와 관계없이 한 번에 끝납니다.'); }
      if (c.op === 'add') { moved = n - i;
        push('add(' + i + ', 99): ' + i + '번 칸에 넣으려면 자리를 비워야 합니다.' + (moved ? ' ' + i + '번부터 끝까지 원소 ' + moved + '개가 옮겨질 대상입니다.' : ' 맨 뒤라서 옮길 원소가 없습니다.'), '', { cells: cells(n, function (j) { return j >= i ? 'q' : ''; }) });
        last = cells(n + 1, function (j) { return j === i ? 'b now' : j > i ? 'q' : ''; }); last[i][0] = '99';
        push(moved ? '원소 ' + moved + '개를 한 칸씩 뒤로 복사해 옮긴 뒤, 빈 ' + i + '번 칸에 99를 넣었습니다.' : '끝의 빈 칸에 99를 바로 넣었습니다.', moved > 1 ? 'bad' : 'good', { cells: last });
        big = moved ? 'O(n)' : 'O(1) (분할 상환)'; sum.push(moved ? 'ArrayList의 ' + where + ' 삽입은 뒤에 있는 원소 ' + moved + '개를 옮겨야 했습니다. 앞쪽일수록, 원소가 많을수록 옮길 것이 많아집니다.' : 'ArrayList의 맨 뒤 삽입은 옮길 것이 없어 빠릅니다(배열이 꽉 찼을 때만 새 배열로 복사합니다).'); }
      if (c.op === 'remove') { moved = n - i - 1;
        push('remove(' + i + '): ' + i + '번 칸의 원소를 지웁니다.' + (moved ? ' 빈자리를 메우려면 그 뒤의 원소 ' + moved + '개를 당겨야 합니다.' : ' 맨 뒤라서 당길 원소가 없습니다.'), '', { cells: cells(n, function (j) { return j === i ? 'r now' : j > i ? 'q' : ''; }) });
        push(moved ? '뒤의 원소 ' + moved + '개를 한 칸씩 앞으로 복사해 당겼습니다.' : '마지막 칸만 비우고 끝났습니다.', moved > 1 ? 'bad' : 'good', { cells: cells(n - 1, function (j) { return j >= i ? 'q' : ''; }) });
        big = moved ? 'O(n)' : 'O(1)'; sum.push(moved ? 'ArrayList의 ' + where + ' 삭제는 뒤의 원소 ' + moved + '개를 당겨야 했습니다.' : 'ArrayList의 맨 뒤 삭제는 옮길 것이 없습니다.'); }
    } else {
      var target = c.op === 'add' && i === n ? -1 : i, fromHead = target < (n >> 1), path = [];
      if (target >= 0) { if (fromHead) for (var a = 0; a <= target; a++) path.push(a); else for (var b = n - 1; b >= target; b--) path.push(b); hops = path.length - 1; }
      var inPath = function (j) { return path.indexOf(j) >= 0; };
      var walk = target < 0 ? '맨 뒤에 붙이는 경우라 마지막 노드를 바로 씁니다. 따라갈 노드가 없습니다.' : (fromHead ? '앞쪽 절반에 있으므로 첫 노드에서 출발해' : '뒤쪽 절반에 있으므로 마지막 노드에서 출발해') + ' 연결을 ' + hops + '번 따라가 ' + i + '번 노드에 도착했습니다.';
      var name = c.op === 'get' ? 'get(' + i + ')' : c.op === 'add' ? 'add(' + i + ', 99)' : 'remove(' + i + ')';
      push(name + ': LinkedList는 인덱스로 위치를 계산할 수 없습니다. ' + walk, hops > 2 ? 'bad' : '', { cells: cells(n, function (j) { return j === target ? 'b now' : inPath(j) ? 'q' : ''; }), linked: true });
      if (c.op === 'get') { big = hops ? 'O(n)' : 'O(1)'; sum.push(hops ? 'LinkedList의 인덱스 조회는 그 위치까지 노드를 하나씩 따라가야 합니다(' + hops + '번). 양 끝에서 가까운 쪽으로 출발하지만, 가운데일수록 오래 걸립니다.' : 'LinkedList도 양 끝 원소는 바로 접근합니다.'); }
      if (c.op === 'add') { last = cells(n + 1, function (j) { return j === i ? 'b now' : ''; }); last[i][0] = '99'; push('새 노드를 만들고 앞뒤 노드의 연결만 바꿔 끼워 넣었습니다. 다른 원소는 하나도 옮기지 않았습니다.', 'good', { cells: last, linked: true }); big = hops ? 'O(n) (탐색) + O(1) (연결)' : 'O(1)'; sum.push(hops ? 'LinkedList의 삽입 자체는 연결만 바꾸면 되지만, 그 자리를 찾는 데 ' + hops + '번을 따라갔습니다. "LinkedList는 삽입이 빠르다"는 말은 위치를 이미 알고 있을 때(양 끝, 또는 반복자가 가리키는 곳)에만 맞습니다.' : 'LinkedList의 ' + where + ' 삽입은 따라갈 것도 옮길 것도 없습니다.'); }
      if (c.op === 'remove') { push('앞 노드와 뒤 노드를 서로 직접 연결해 ' + i + '번 노드를 빼냈습니다. 다른 원소는 옮기지 않았습니다.', 'good', { cells: cells(n - 1, function () { return ''; }), linked: true }); big = hops ? 'O(n) (탐색) + O(1) (연결)' : 'O(1)'; sum.push(hops ? 'LinkedList의 삭제도 연결만 바꾸면 되지만, 지울 노드를 찾는 데 ' + hops + '번을 따라갔습니다.' : 'LinkedList의 ' + where + ' 삭제는 따라갈 것도 옮길 것도 없습니다.'); }
    }
    return { events: ev, summary: sum, row: [hops + '개', moved + '개', big], kind: 'one' };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, arr = c.ds === 'array';
    if (!s) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    if (sim.kind === 'append') {
      H.counters(v, arr ? [[s.size, '들어 있는 원소'], [s.cap, '배열 칸 수'], [s.copies, '지금까지 복사한 원소'], [(Math.round(s.copies / s.size * 100) / 100), '추가 한 번당 평균 복사']] : [[s.size, '노드 수'], [0, '복사한 원소']]);
      H.title(v, arr ? '내부 배열 (초록은 채워진 칸, 점선은 빈 칸)' : '노드 (앞뒤로 연결됨)');
      var items = []; for (var j = 0; j < s.cap; j++) items.push([j < s.size ? String(j + 1) : '', (j < s.size ? 'd' : '') + (j === s.last ? ' now' : '')]);
      H.slots(v, items, null, true);
    } else {
      H.title(v, arr ? '내부 배열 (칸 번호 = 인덱스)' : '노드 (왼쪽이 첫 노드, 오른쪽이 마지막 노드)');
      H.slots(v, s.cells, '비어 있음', true);
    }
  },
  // 그림: 배열은 칸이 나란히 붙어 있고, 연결 리스트는 떨어진 노드가 화살표로 이어진다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, arr = c.ds === 'array', cells = [];
    if (s && sim.kind === 'append') { for (var j = 0; j < s.cap; j++) cells.push([j < s.size ? String(j + 1) : '', j < s.size ? (j === s.last ? 'hot now' : 'good') : 'ghost']); }
    else if (s) cells = s.cells.map(function (x) { return [x[0], { d: 'good', q: 'wait', 'b now': 'hot now', 'r now': 'bad now' }[x[1]] || 'ghost']; });
    var per = arr ? 20 : 10, rows = Math.max(1, Math.ceil(cells.length / per)), pitch = arr ? 38 : 46, rh = 44 + rows * pitch;
    P.size(680, rh + 32);
    P.region('box', 16, 16, 648, rh, arr ? '내부 배열 (메모리에 나란히 붙어 있어 위치를 바로 계산함)' : '노드 (각자 떨어져 있고, 옆 노드의 위치를 기억해 이어짐)');
    if (!s) { P.text('hint', 340, 16 + rh / 2 + 8, '실행을 누르면 시작합니다', { cls: 'mut', anchor: 'middle' }); return; }
    cells.forEach(function (x, j) {
      var col = j % per, row = Math.floor(j / per);
      if (arr) P.box('c' + j, 28 + col * 31, 52 + row * pitch, 31, 28, { cls: x[1], sub: x[0], center: true });
      else { var back = row % 2 === 1, cx = back ? per - 1 - col : col; P.box('c' + j, 28 + cx * 62, 52 + row * pitch, 42, 28, { cls: x[1], sub: x[0], center: true }); if (j) P.arrow('l' + j, 'c' + (j - 1) + (!col ? ':b' : back ? ':l' : ':r'), 'c' + j + (!col ? ':t' : back ? ':r' : ':l'), { cls: 'mut' }); }
    });
    P.note(arr ? '칸 안의 숫자는 인덱스입니다. 노란 칸은 대상 위치, 파란 칸은 한 칸씩 옮겨진 원소, 점선은 빈 칸입니다.' :'노란 노드는 대상, 파란 노드는 그 자리까지 가느라 지나친 노드입니다. 실제 LinkedList는 앞뒤 양쪽으로 이어져 있고, 인덱스로 위치를 계산할 수 없어 화살표를 따라가야 합니다.');
  },
  assume: '삽입 한 번을 볼 때는 ArrayList 내부 배열에 빈 칸이 남아 있다고 가정했습니다. 꽉 찬 경우는 "맨 뒤로 계속 추가"에서 따로 보여 줍니다. ArrayList의 용량이 10에서 시작해 1.5배씩(10 → 15 → 22 → 33 → 49) 늘어나는 것과, LinkedList가 인덱스 위치에 따라 앞이나 뒤 중 가까운 쪽에서 출발하는 것은 JDK 구현과 같습니다. 용량이 늘어나는 시점과 복사량은 이 PC의 JDK 21에서 실제 ArrayList 내부 배열을 꺼내 확인한 값과 일치합니다(40개 추가 시 4번 늘리고 80개 복사). 실제 속도는 칸 수만으로 정해지지 않습니다. 배열은 메모리에 연속으로 있어 CPU 캐시에 유리하므로, 옮기는 양이 많아도 LinkedList보다 빠른 경우가 흔합니다.',
});
