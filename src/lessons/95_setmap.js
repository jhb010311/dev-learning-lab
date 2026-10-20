Lab.register({
  id: 'setmap', nav: 'Set과 Map의 종류', cat: '자료구조', mode: 'step',
  title: '같은 값을 넣었는데 꺼내는 순서가 왜 다른가',
  why: 'HashSet과 HashMap은 해시값으로 자리를 정해 빨리 찾는 대신, 꺼내는 순서가 넣은 순서와도 정렬 순서와도 상관없다. 순서가 필요할 때마다 따로 정렬하거나 순서를 기록할 List를 함께 관리하면 번거롭다. 그래서 자바는 넣은 순서를 기억하는 LinkedHashSet·LinkedHashMap과, 늘 정렬된 상태를 유지하는 TreeSet·TreeMap을 함께 제공한다.',
  use: '순서와 상관없이 중복을 없애거나 키로 찾기만 하면 HashSet·HashMap을 쓴다. 넣은 순서대로 보여 줘야 하는 목록이나 오래 안 쓴 것부터 지우는 캐시(LinkedHashMap의 접근 순서 모드)에는 Linked 계열을, 이름순 목록이나 ceilingKey·subMap 같은 범위 검색에는 Tree 계열을 쓴다.',
  intro: 'Set은 같은 값을 한 번만 담는 컬렉션이고, Map은 키와 값을 짝지어 담는 컬렉션입니다. 둘 다 Hash, LinkedHash, Tree로 시작하는 세 가지 종류가 있고, 무엇을 고르느냐에 따라 꺼낼 때의 순서와 넣을 수 있는 값이 달라집니다.',
  terms: ['List, Set, Map', '해시 테이블과 HashMap', 'LinkedHashSet과 LinkedHashMap', 'TreeSet과 TreeMap', '시간 복잡도(Big-O)'],
  controls: [
    { id: 'kind', label: '컬렉션의 종류', type: 'select', value: 'hash', options: [['hash', 'HashSet / HashMap'], ['linked', 'LinkedHashSet / LinkedHashMap'], ['tree', 'TreeSet / TreeMap']] },
    { id: 'data', label: '넣는 값 (적힌 순서대로 넣습니다)', type: 'select', value: 'words', options: [['words', '문자열: grape, apple, date, apple, fig'], ['small', '작은 정수: 3, 1, 2, 1, 5'], ['big', '정수: 40, 5, 17, 5, 100'], ['null', 'null이 섞인 문자열: grape, apple, null, apple, fig'], ['obj', '직접 만든 Task 객체: id가 40, 5, 17, 5, 100']], hint: '어느 것이든 네 번째에 이미 넣은 값을 한 번 더 넣습니다.' },
    { id: 'shape', label: 'Set인가 Map인가', type: 'select', value: 'set', options: [['set', 'Set (값만 담는다)'], ['map', 'Map (키와 값을 담는다. 값은 넣은 차례 번호)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'HashSet에 문자열 grape, apple, date, apple, fig를 차례로 넣으면 어떤 순서로 나오나', d: 'HashSet에 문자열을 넣습니다. 넣은 순서도 정렬된 순서도 아닌 순서로 나옵니다.', v: { kind: 'hash', data: 'words', shape: 'set' } },
    { t: 'LinkedHashSet', q: 'HashSet 대신 LinkedHashSet을 쓰면', d: '넣은 순서 그대로 나옵니다.', v: { kind: 'linked', data: 'words', shape: 'set' } },
    { t: 'TreeSet', q: 'HashSet 대신 TreeSet을 쓰면', d: '정렬된 순서로 나옵니다.', v: { kind: 'tree', data: 'words', shape: 'set' } },
    { t: 'HashSet에 작은 정수', q: 'HashSet인데 넣는 값을 작은 정수 3, 1, 2, 1, 5로 바꾸면', d: '정렬해 준 것처럼 보입니다. 넣는 값을 40, 5, 17, 5, 100으로 바꿔 비교해 보세요.', v: { kind: 'hash', data: 'small', shape: 'set' } },
    { t: 'TreeSet에 null', q: 'TreeSet인데 넣는 값을 null이 섞인 문자열 grape, apple, null, apple, fig로 바꾸면', d: '비교할 수 없어 NullPointerException이 납니다.', v: { kind: 'tree', data: 'null', shape: 'set' } },
    { t: 'TreeSet에 직접 만든 객체', q: 'TreeSet인데 넣는 값을 직접 만든 Task 객체(id가 40, 5, 17, 5, 100)로 바꾸면', d: 'Comparable을 구현하지 않은 객체는 ClassCastException이 납니다.', v: { kind: 'tree', data: 'obj', shape: 'set' } },
    { t: 'LinkedHashMap에 같은 키를 다시', q: '넣은 차례 번호를 값으로 담는 LinkedHashMap에 apple을 두 번 넣으면', d: '값만 바뀌고 자리는 처음 넣은 그대로입니다.', v: { kind: 'linked', data: 'words', shape: 'map' } },
  ],
  DATA: {
    words: [['s', 'grape'], ['s', 'apple'], ['s', 'date'], ['s', 'apple'], ['s', 'fig']],
    small: [['i', 3], ['i', 1], ['i', 2], ['i', 1], ['i', 5]],
    big: [['i', 40], ['i', 5], ['i', 17], ['i', 5], ['i', 100]],
    'null': [['s', 'grape'], ['s', 'apple'], ['n', 0], ['s', 'apple'], ['s', 'fig']],
    obj: [['o', 40], ['o', 5], ['o', 17], ['o', 5], ['o', 100]],
  },
  // 자바 코드에 적는 모양, println이 찍는 모양
  lit: function (x) { return x[0] === 's' ? '"' + x[1] + '"' : x[0] === 'n' ? 'null' : x[0] === 'o' ? 'new Task(' + x[1] + ')' : String(x[1]); },
  str: function (x) { return x[0] === 'n' ? 'null' : x[0] === 'o' ? 'Task[id=' + x[1] + ']' : String(x[1]); },
  // hashCode: String은 글자마다 31을 곱해 더한 값, Integer와 record Task(int id)는 숫자 자신, null은 0으로 다룬다
  hash: function (x) { if (x[0] === 's') { var h = 0; for (var i = 0; i < x[1].length; i++) h = (Math.imul(31, h) + x[1].charCodeAt(i)) | 0; return h; } return x[0] === 'n' ? 0 : x[1]; },
  // HashMap이 칸 16개일 때 쓰는 칸 번호: hashCode의 위쪽 절반을 아래쪽에 섞은 뒤 아래 4비트만 쓴다
  cell: function (x) { var h = this.hash(x); return (h ^ (h >>> 16)) & 15; },
  names: function (c) { var m = c.shape === 'map', k = { hash: 'Hash', linked: 'LinkedHash', tree: 'Tree' }[c.kind]; return { cls: k + (m ? 'Map' : 'Set'), v: m ? 'map' : 'set', el: c.data === 'obj' ? 'Task' : c.data === 'small' || c.data === 'big' ? 'Integer' : 'String' }; },
  code: function (c) {
    var D = this.DATA[c.data], n = this.names(c), m = c.shape === 'map', self = this;
    var call = function (i) { return m ? 'map.put(' + self.lit(D[i]) + ', ' + (i + 1) + ')' : 'set.add(' + self.lit(D[i]) + ')'; };
    var head = c.data === 'obj' ? 'record Task(int id) { }                    // Comparable을 구현하지 않았다\n\n' : '';
    var decl = m ? 'Map<' + n.el + ', Integer> map = new ' + n.cls + '<>();' : 'Set<' + n.el + '> set = new ' + n.cls + '<>();';
    return '// main 메서드 안의 줄만 보임 (클래스·main 선언과 import는 생략)\n' + head + decl + '\n' + call(0) + ';\n' + call(1) + ';\n' + call(2) + ';\nSystem.out.println(' + call(3) + ');   // ' + (m ? '이미 넣은 키로 또 넣는다' : '이미 넣은 값을 또 넣는다') + '\n' + call(4) + ';\n\nSystem.out.println(' + n.v + ');                   // 처음부터 차례로 꺼내 출력\nSystem.out.println(' + n.v + '.size());';
  },
  label: function (c) { return this.names(c).cls + ' · ' + { words: '문자열', small: '작은 정수', big: '정수', 'null': 'null 섞임', obj: 'Task 객체' }[c.data]; },
  columns: ['출력', '크기', '이미 넣은 것을 또 넣으면', '예외'],
  simulate: function (c) {
    var self = this, D = this.DATA[c.data], n = this.names(c), m = c.shape === 'map', kind = c.kind, cls = n.cls, what = m ? '키' : '값', whatObj = m ? '키를' : '값을';
    var items = [], ev = [], out = [], ex = '', dup = '-', done = 0, sum = [];
    var sortable = c.data === 'words' || c.data === 'small' || c.data === 'big';
    function less(a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0; }
    function ordered() { var a = items.slice(); if (kind === 'hash') a.sort(function (p, q) { return p.cell - q.cell || p.seq - q.seq; }); if (kind === 'tree') a.sort(function (p, q) { return less(p.x, q.x); }); return a; }
    function listStr() { return ordered().map(function (it) { return self.str(it.x); }).join(', '); }
    function printed() { var a = ordered().map(function (it) { return self.str(it.x) + (m ? '=' + it.val : ''); }).join(', '); return m ? '{' + a + '}' : '[' + a + ']'; }
    function push(s, k, cur, did) { ev.push({ s: s, k: k, snap: { items: ordered().map(function (it) { return { id: it.x[0] + it.x[1], s: self.str(it.x), val: it.val, cell: it.cell, seq: it.seq }; }), cur: cur, did: did || '', out: out.slice(), ex: ex, dup: dup, done: done } }); }
    function call(i) { return m ? 'map.put(' + self.lit(D[i]) + ', ' + (i + 1) + ')' : 'set.add(' + self.lit(D[i]) + ')'; }
    var how = { hash: cls + '은 ' + what + '의 hashCode로 칸 번호를 계산해 그 칸에 넣어 둡니다. 넣은 순서는 따로 기억하지 않습니다.', linked: cls + '은 hashCode로 칸을 정해 넣는 것은 같지만, 넣은 순서대로 이어지는 연결을 따로 유지합니다.', tree: cls + '은 넣을 때마다 이미 있는 ' + what + '들과 compareTo로 비교해 정렬된 자리에 둡니다.' }[kind];
    push((m ? 'Map<' + n.el + ', Integer> map' : 'Set<' + n.el + '> set') + ' = new ' + cls + '<>(): 빈 ' + cls + '을 만듭니다. ' + how, '', -1);
    for (var i = 0; i < D.length; i++) {
      var x = D[i], id = x[0] + x[1], old = null;
      items.forEach(function (it) { if (it.x[0] + it.x[1] === id) old = it; });
      done = i + 1;
      if (kind === 'tree' && x[0] === 'n') { ex = 'NullPointerException'; push(call(i) + ': ' + cls + '은 넣을 때마다 ' + what + '끼리 compareTo로 비교해야 하는데, null로는 비교할 수 없습니다. NullPointerException이 나고 프로그램이 여기서 멈춥니다.', 'bad', i, 'ex'); break; }
      if (kind === 'tree' && x[0] === 'o') { ex = 'ClassCastException'; push(call(i) + ': ' + cls + '은 ' + whatObj + ' Comparable로 바꿔 compareTo를 부르려 합니다. Task는 Comparable을 구현하지 않았으므로 바꿀 수 없어 ClassCastException이 납니다. 첫 번째로 넣는 순간에 바로 멈춥니다.', 'bad', i, 'ex'); break; }
      if (old) {
        if (m) { var prev = old.val; old.val = i + 1; dup = 'put이 예전 값(' + prev + ')을 돌려줌'; out.push(String(prev)); push(call(i) + ': 같은 키가 이미 들어 있습니다. Map은 같은 키를 두 번 담지 않으므로 키는 그대로 두고 값만 ' + prev + '에서 ' + (i + 1) + '로 바꿉니다. put이 돌려준 예전 값 ' + prev + '가 출력됩니다.' + (kind === 'linked' ? ' 자리는 처음 넣었던 ' + old.seq + '번째 그대로입니다.' : ''), '', i, 'dup'); }
        else { dup = 'add가 false를 돌려줌'; out.push('false'); push(call(i) + ': 같은 값이 이미 들어 있습니다. Set은 같은 값을 두 번 담지 않으므로 넣지 않고 false를 돌려주며, 그 false가 출력됩니다. 크기는 그대로 ' + items.length + '개입니다.', '', i, 'dup'); }
        continue;
      }
      var it = { x: x, val: i + 1, cell: this.cell(x), seq: i + 1 }; items.push(it);
      var s;
      if (kind === 'hash') s = (x[0] === 's' ? self.lit(x) + '의 hashCode로 계산한 칸 번호는 ' + it.cell + '번입니다.' : x[0] === 'n' ? 'null에는 hashCode를 부를 수 없어서 ' + cls + '은 null을 0번 칸에 넣기로 정해 두었습니다. ' + (m ? 'null인 키도' : 'null도') + ' 하나는 담을 수 있습니다.' : x[0] === 'o' ? 'record가 만들어 준 hashCode로 계산한 칸 번호는 ' + it.cell + '번입니다.' : 'Integer의 hashCode는 그 숫자 자신이고 칸이 16개이므로, ' + x[1] + ' ÷ 16의 나머지인 ' + it.cell + '번 칸에 들어갑니다.') + ' 꺼낼 때는 칸 번호가 작은 것부터이므로 지금 순서는 ' + listStr() + '입니다.';
      else if (kind === 'linked') s = '맨 뒤에 이어 붙입니다. 꺼내는 순서는 넣은 순서와 같은 ' + listStr() + '입니다.';
      else s = items.length === 1 ? '처음 넣는 ' + what + '이므로 그대로 넣습니다.' : '이미 있는 ' + what + '들과 compareTo로 ' + (x[0] === 's' ? '사전 순서' : '크기') + '를 비교해 정렬된 자리에 넣습니다. 꺼내는 순서는 ' + listStr() + '입니다.';
      push(call(i) + ': ' + s, '', i, 'new');
    }
    var res = printed(), ins = items.slice().sort(function (p, q) { return p.seq - q.seq; }).map(function (it) { return self.str(it.x); }).join(', '), sorted = sortable ? items.slice().sort(function (p, q) { return less(p.x, q.x); }).map(function (it) { return self.str(it.x); }).join(', ') : null;
    var looksSorted = kind === 'hash' && sortable && listStr() === sorted, sameIns = listStr() === ins;
    if (!ex) {
      out.push(res);
      var why = kind === 'hash' ? cls + '은 칸 번호가 작은 칸부터 꺼냅니다. ' + (looksSorted ? '정렬된 것처럼 보이지만, 16보다 작은 정수는 칸 번호가 숫자와 같아서 생긴 우연입니다.' : sameIns ? '이번에는 넣은 순서와 같게 나왔지만 우연입니다.' : sortable ? '넣은 순서(' + ins + ')도, 정렬된 순서(' + sorted + ')도 아닙니다.' : '넣은 순서(' + ins + ')와 다릅니다.') : kind === 'linked' ? cls + '은 넣은 순서대로 꺼냅니다.' : cls + '은 ' + (m ? '키가' : '값이') + ' 작은 것부터 정렬된 순서로 꺼냅니다.';
      push('System.out.println(' + n.v + '): 들어 있는 ' + (m ? '키와 값을' : '값을') + ' 처음부터 차례로 꺼내(순회) 출력합니다. ' + why + ' 출력은 ' + res + '입니다.', looksSorted ? 'bad' : kind === 'hash' ? '' : 'good', -1);
      out.push(String(items.length));
      push('System.out.println(' + n.v + '.size()): 다섯 번 넣었지만 같은 ' + what + ' 하나는 다시 들어가지 않았으므로 크기는 ' + items.length + '입니다.', '', -1);
      if (kind === 'hash') sum.push(looksSorted ? 'HashSet과 HashMap은 정렬해 주지 않습니다. 작은 정수가 정렬된 것처럼 나온 것은 칸 번호가 숫자와 같아서입니다. 넣는 값을 40, 5, 17, 5, 100으로 바꾸면 17, 100, 5, 40 순서로 나옵니다.' : 'HashSet과 HashMap의 순회 순서는 hashCode가 정한 칸 번호 순서입니다. 사람이 보기에는 뒤섞인 순서이고, 자바 버전이나 들어 있는 개수에 따라 달라질 수 있으므로 이 순서에 기대는 코드를 쓰면 안 됩니다.');
      if (kind === 'linked') sum.push('넣은 순서를 지켜야 할 때는 LinkedHashSet과 LinkedHashMap을 씁니다. 화면에 보여 줄 목록의 순서, 설정 항목의 순서처럼 "넣은 대로 나와야 하는" 경우입니다.' + (m ? ' 이미 있는 키에 다시 put을 해도 그 키의 자리는 바뀌지 않습니다.' : ''));
      if (kind === 'tree') sum.push('정렬된 순서가 필요하거나 가장 작은 값, 어떤 값 이상인 것들을 찾아야 할 때는 TreeSet과 TreeMap을 씁니다. 그 대신 넣고 찾을 때마다 비교를 여러 번 하므로 Hash 종류보다 느립니다.');
      if (kind !== 'tree' && c.data === 'null') sum.push('Hash 종류와 LinkedHash 종류는 null을 하나 담을 수 있습니다. 컬렉션의 종류를 Tree로 바꾸면 같은 코드에서 예외가 납니다.');
      if (kind !== 'tree' && c.data === 'obj') sum.push('Hash 종류와 LinkedHash 종류는 equals와 hashCode만 있으면 어떤 객체든 담습니다. Tree 종류는 크기를 비교할 방법이 더 필요합니다.');
    } else {
      sum.push(ex === 'NullPointerException' ? 'TreeSet의 원소와 TreeMap의 키는 서로 비교해 자리를 정하므로 (기본 정렬에서) null을 담을 수 없습니다. HashSet, LinkedHashSet은 null을 하나 담을 수 있습니다.' : 'TreeSet과 TreeMap에 넣을 객체는 Comparable을 구현하거나, new TreeSet<>(Comparator.comparingInt(Task::id))처럼 비교 방법(Comparator)을 따로 주어야 합니다. 컴파일할 때는 걸러지지 않고 실행 중에 예외가 납니다.');
    }
    sum.push('고르는 기준: 순서가 필요 없으면 Hash 종류(가장 빠름), 넣은 순서가 필요하면 LinkedHash 종류, 정렬된 순서가 필요하면 Tree 종류입니다.');
    var cells = kind === 'hash' ? ordered().map(function (it) { return it.cell; }).join(',') : '-';
    return { events: ev, summary: sum, cells: cells, stopAt: ex ? done : 0, row: [ex ? '(출력 전에 멈춤)' : res, ex ? '-' : items.length + '개', dup, ex || '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    H.counters(v, [[s.done + ' / 5', '넣기를 시도한 횟수'], [s.items.length + '개', '들어 있는 개수']]);
  },
  // 그림: 위쪽에 코드에 적힌 순서대로 넣는 값 다섯 개, 아래쪽에 컬렉션이 꺼내 주는 순서대로 놓인 값. 넣을 때마다 아래쪽 자리가 정해진다.
  draw: function (P, sim, shown) {
    var c = sim.c, self = this, D = this.DATA[c.data], n = this.names(c), m = c.shape === 'map', last = shown[shown.length - 1];
    var s = last ? last.snap : { items: [], cur: -1, did: '', out: [], ex: '', dup: '-', done: 0 };
    P.size(680, 300);
    P.region('in', 16, 16, 648, 92, '넣는 순서 (코드에 적힌 순서)');
    D.forEach(function (x, i) {
      var isDup = i === 3, st = i >= s.done ? 'ghost' : s.ex && i === s.done - 1 ? 'bad' : isDup ? 'plain' : 'wait';
      var short = x[0] === 's' ? '"' + x[1] + '"' : x[0] === 'n' ? 'null' : x[0] === 'o' ? 'Task(' + x[1] + ')' : String(x[1]);
      P.box('i' + i, 28 + i * 126, 48, 118, 48, { cls: st + (i === s.cur ? ' now' : ''), title: short + (m ? ', ' + (i + 1) : ''), sub: (i + 1) + '번째' + (i < s.done && s.ex && i === s.done - 1 ? ' · 예외' : i < s.done && isDup ? ' · 중복' : '') });
    });
    P.region('st', 16, 124, 648, 104, n.cls + '에서 꺼내는 순서 (왼쪽부터)');
    var curId = s.cur >= 0 ? D[s.cur][0] + D[s.cur][1] : '';
    s.items.forEach(function (it, k) {
      var hit = it.id === curId && (s.did === 'new' || s.did === 'dup');
      P.box('e_' + it.id, 28 + k * 158, 158, 150, 54, { cls: (hit ? (s.did === 'dup' ? 'hot' : 'good') + ' now' : 'wait'), title: it.s + (m ? '=' + it.val : ''), sub: c.kind === 'hash' ? it.cell + '번 칸' : c.kind === 'linked' ? it.seq + '번째로 넣음' : '비교해서 정한 자리', from: 'i' + (it.seq - 1) });
      if (hit) P.arrow('ar', 'i' + s.cur + ':b', 'e_' + it.id + ':t', { cls: s.did === 'dup' ? 'dash' : 'good', label: s.did === 'dup' ? '이미 있음' : '넣음' });
    });
    if (!s.items.length) P.text('empty', 340, 190, s.ex ? '아무것도 넣지 못했습니다' : '비어 있음', { cls: s.ex ? 'bad' : 'mut', anchor: 'middle' });
    if (s.ex) P.box('r1', 16, 246, 648, 38, { cls: 'bad', title: '예외로 멈춤', right: s.ex });
    else P.box('r1', 16, 246, 648, 38, { cls: s.out.length ? 'good' : 'ghost', title: '출력', right: s.out.length ? s.out.join('   /   ') : '아직 없음' });
    P.note(c.kind === 'hash' ? 'Hash 종류는 hashCode로 계산한 칸 번호가 작은 것부터 꺼냅니다. 칸은 처음에 16개이고, 이 실습은 그 상태에서의 순서를 보여 줍니다.' : c.kind === 'linked' ? 'LinkedHash 종류는 넣은 순서대로 이어 둔 연결을 따라 꺼냅니다. 이미 있는 것을 다시 넣어도 자리는 바뀌지 않습니다.' : 'Tree 종류는 넣을 때마다 compareTo로 비교해 정렬된 자리에 둡니다.');
  },
  assume: '서른 가지 조합의 출력, 크기, 중복을 넣었을 때 돌려주는 값, 예외의 종류를 검증 환경의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. HashSet과 HashMap의 칸 번호도 실제 객체의 내부 배열을 들여다본 값과 대조했습니다. 다만 Hash 종류의 순회 순서는 자바 명세가 보장하지 않습니다. 여기에 보이는 순서는 JDK 21에서 칸이 16개(원소 12개 이하)일 때의 것이며, 버전이나 원소 개수가 달라지면 바뀔 수 있습니다. record의 hashCode가 내는 구체적인 값도 명세가 정하지 않으며, JDK 21에서는 Task(int id)의 hashCode가 id와 같았습니다. TreeSet이 같은 값인지 판단하는 기준은 equals가 아니라 compareTo의 결과가 0인지입니다. 성능 차이(Hash 종류가 Tree 종류보다 빠름)는 측정하지 않았고 문서에 적힌 시간 복잡도를 따랐습니다.',
});
