Lab.register({
  id: 'sorting', nav: '정렬과 Comparator', cat: '자료구조', mode: 'step',
  title: '정렬 순서는 누가 정하고, 빼서 비교하면 왜 틀리나',
  intro: '정렬은 "둘 가운데 어느 것이 앞인가"를 묻는 비교를 되풀이하는 일입니다. 그 답은 클래스가 스스로 정해 둘 수도 있고(Comparable), 정렬할 때 바깥에서 줄 수도 있습니다(Comparator). 정렬 기준을 바꿔 가며 결과가 어떻게 달라지는지, 그리고 두 수를 빼서 비교하는 흔한 코드가 큰 수에서 왜 틀린 순서를 내는지 확인해 보세요.',
  terms: ['Comparable과 Comparator', '안정 정렬', '정수 오버플로', '메서드 참조', '람다 표현식'],
  controls: [
    { id: 'by', label: '정렬 기준', type: 'select', value: 'sub', options: [['natural', 'Comparable: 클래스가 정해 둔 순서 (이름순)'], ['cmp', 'Comparator: 잔액순 (comparingInt)'], ['then', 'Comparator: 잔액순, 같으면 이름순 (thenComparing)'], ['sub', 'Comparator: 두 잔액을 빼서 비교 (a - b)']] },
    { id: 'data', label: '잔액의 크기', type: 'select', value: 'big', options: [['normal', '작은 수 (100 ~ 300)'], ['big', '큰 수 (-20억 ~ 20억)']], hint: '어느 쪽이든 park와 kim의 잔액이 같고, choi와 lee의 잔액이 같습니다.' },
    { id: 'rev', label: '거꾸로 정렬한다 (reversed)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: '빼서 비교하는 Comparator에 큰 수를 넣습니다. 예외 없이 틀린 순서가 나옵니다.', v: { by: 'sub', data: 'big', rev: false } },
    { t: '같은 코드에 작은 수', d: '맞게 정렬됩니다. 그래서 테스트에서는 드러나지 않습니다.', v: { by: 'sub', data: 'normal', rev: false } },
    { t: 'comparingInt로 고치면', d: '큰 수에서도 맞게 정렬됩니다.', v: { by: 'cmp', data: 'big', rev: false } },
    { t: 'Comparable이 정한 순서', d: '클래스의 compareTo대로 이름순이 됩니다. 잔액은 보지 않습니다.', v: { by: 'natural', data: 'normal', rev: false } },
    { t: '잔액이 같은 사람끼리', d: '잔액순으로 정렬해도 같은 잔액끼리는 원래 순서를 지킵니다.', v: { by: 'cmp', data: 'normal', rev: false } },
    { t: '같으면 이름순으로', d: 'thenComparing으로 두 번째 기준을 줍니다.', v: { by: 'then', data: 'normal', rev: false } },
    { t: '거꾸로 정렬', d: '잔액이 큰 것부터. 잔액이 같은 사람끼리는 여전히 원래 순서입니다.', v: { by: 'cmp', data: 'normal', rev: true } },
  ],
  DATA: {
    normal: [['park', 300], ['choi', 100], ['kim', 300], ['lee', 100], ['han', 200]],
    big: [['park', 2000000000], ['choi', -2000000000], ['kim', 2000000000], ['lee', -2000000000], ['han', 0]],
  },
  // 자바의 String.compareTo: 처음으로 다른 글자의 코드 차이, 없으면 길이 차이
  strCmp: function (a, b) { var n = Math.min(a.length, b.length); for (var i = 0; i < n; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) return a.charCodeAt(i) - b.charCodeAt(i); return a.length - b.length; },
  // 설정에 해당하는 Comparator. 빼기는 자바의 int처럼 32비트로 잘라 낸다(| 0)
  order: function (c) {
    var self = this, ic = function (a, b) { return a < b ? -1 : a > b ? 1 : 0; };
    var f = { natural: function (a, b) { return self.strCmp(a[0], b[0]); }, cmp: function (a, b) { return ic(a[1], b[1]); }, then: function (a, b) { return ic(a[1], b[1]) || self.strCmp(a[0], b[0]); }, sub: function (a, b) { return (a[1] - b[1]) | 0; } }[c.by];
    return c.rev ? function (a, b) { return f(b, a); } : f;
  },
  // List.sort가 원소 32개 미만일 때 쓰는 방법 그대로: 앞쪽의 이미 정렬된 구간을 찾고, 나머지를 이진 탐색으로 끼워 넣는다
  javaSort: function (arr, cmp) {
    var a = arr.slice(), n = a.length, hi = 1, t;
    if (n < 2) return a;
    if (cmp(a[hi++], a[0]) < 0) { while (hi < n && cmp(a[hi], a[hi - 1]) < 0) hi++; for (var i = 0, j = hi - 1; i < j; i++, j--) { t = a[i]; a[i] = a[j]; a[j] = t; } }
    else while (hi < n && cmp(a[hi], a[hi - 1]) >= 0) hi++;
    for (var s = hi; s < n; s++) { var p = a[s], l = 0, r = s; while (l < r) { var m = (l + r) >>> 1; if (cmp(p, a[m]) < 0) r = m; else l = m + 1; } for (var k = s; k > l; k--) a[k] = a[k - 1]; a[l] = p; }
    return a;
  },
  money: function (b) { return Math.abs(b) >= 100000000 ? (b / 100000000) + '억' : String(b); },
  code: function (c) {
    var D = this.DATA[c.data], lit = function (x) { return 'new Account("' + x[0] + '", ' + (c.data === 'big' ? String(x[1]).replace(/000000000$/, '_000_000_000') : x[1]) + ')'; };
    var ord = { natural: 'Comparator.naturalOrder();          // Account의 compareTo를 그대로 쓴다', cmp: 'Comparator.comparingInt(Account::balance);   // 바깥에서 준 순서: 잔액순', then: 'Comparator.comparingInt(Account::balance)\n                                     .thenComparing(Account::owner);   // 잔액이 같으면 이름순', sub: '(a, b) -> a.balance() - b.balance();   // 빼서 비교' }[c.by];
    return 'record Account(String owner, int balance) implements Comparable<Account> {\n    @Override\n    public int compareTo(Account other) {        // 클래스가 스스로 정한 순서: 이름순\n        return owner.compareTo(other.owner);\n    }\n}\n\nList<Account> list = new ArrayList<>(List.of(\n    ' + lit(D[0]) + ', ' + lit(D[1]) + ',\n    ' + lit(D[2]) + ', ' + lit(D[3]) + ',\n    ' + lit(D[4]) + '));\n\nComparator<Account> order = ' + ord + '\n' + (c.rev ? 'order = order.reversed();                         // 거꾸로\n' : '') + 'System.out.println(order.compare(list.get(0), list.get(1)));   // park와 choi\nSystem.out.println(order.compare(list.get(0), list.get(2)));   // park와 kim\n\nlist.sort(order);\nSystem.out.println(list);';
  },
  label: function (c) { return { natural: 'Comparable(이름순)', cmp: 'comparingInt', then: 'comparingInt + thenComparing', sub: '빼서 비교' }[c.by] + ' · ' + (c.data === 'big' ? '큰 수' : '작은 수') + (c.rev ? ' · 거꾸로' : ''); },
  columns: ['정렬 결과', 'compare(park, choi)', 'compare(park, kim)', '잔액 순서가 맞는가'],
  simulate: function (c) {
    var self = this, D = this.DATA[c.data], cmp = this.order(c), ev = [], sum = [], rev = !!c.rev, by = c.by;
    var st = { order: D.map(function (x) { return x[0]; }), has: false, rev: false, c1: null, c2: null, sorted: false, ok: '?' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function num(v) { return v < 0 ? '(' + v + ')' : String(v); }
    function mean(v, other) { return v < 0 ? '음수이므로 park가 ' + other + '보다 앞에 놓입니다.' : v > 0 ? '양수이므로 park가 ' + other + '보다 뒤에 놓입니다.' : '0은 "순서를 가릴 수 없다"는 뜻이고, 정렬은 이런 둘의 순서를 바꾸지 않습니다.'; }
    var park = D[0], choi = D[1], kim = D[2];
    push('List<Account> list = new ArrayList<>(List.of(...)): 계좌 다섯 개를 park, choi, kim, lee, han 순서로 담습니다. park와 kim의 잔액이 ' + this.money(park[1]) + '으로 같고, choi와 lee의 잔액이 ' + this.money(choi[1]) + '으로 같습니다.', '');
    st.has = true;
    push({ natural: 'Comparator<Account> order = Comparator.naturalOrder(): Account가 Comparable을 구현하면서 스스로 정해 둔 순서(compareTo, 이름순)를 그대로 쓰는 Comparator입니다. Collections.sort(list)처럼 Comparator를 주지 않고 정렬할 때 쓰이는 순서와 같습니다.',
      cmp: 'Comparator<Account> order = Comparator.comparingInt(Account::balance): 바깥에서 주는 순서입니다. 두 계좌에서 잔액을 꺼내 크기를 비교합니다. Account 클래스의 compareTo(이름순)는 쓰이지 않습니다.',
      then: 'Comparator<Account> order = Comparator.comparingInt(Account::balance).thenComparing(Account::owner): 먼저 잔액을 비교하고, 잔액이 같을 때만 이름을 비교하는 순서입니다.',
      sub: 'Comparator<Account> order = (a, b) -> a.balance() - b.balance(): 두 잔액을 뺀 값을 비교 결과로 씁니다. a가 작으면 음수, 같으면 0, 크면 양수가 나올 것이라고 생각하고 쓴 코드입니다.' }[by], '');
    if (rev) { st.rev = true; push('order = order.reversed(): 두 값의 자리를 바꿔서 비교하는 새 Comparator를 만듭니다. 원래 순서와 반대가 됩니다.', ''); }
    // 첫 번째 비교: park와 choi (잔액이 다른 둘)
    var c1 = cmp(park, choi), c2 = cmp(park, kim), exact = (rev ? choi[1] - park[1] : park[1] - choi[1]), over = by === 'sub' && exact !== c1, right = by === 'natural' ? true : (c1 > 0) === (rev ? park[1] < choi[1] : park[1] > choi[1]);
    st.c1 = c1;
    var d1 = by === 'natural' ? (rev ? '자리를 바꿔 이름 "choi"와 "park"를' : '이름 "park"와 "choi"를') + ' 사전 순서로 비교합니다. 결과는 ' + c1 + '입니다. '
      : by === 'sub' ? (rev ? '자리를 바꿔 ' + num(choi[1]) + ' - ' + num(park[1]) : num(park[1]) + ' - ' + num(choi[1])) + '을 계산합니다. ' + (over ? '수학으로는 ' + exact + '이지만, int는 -2147483648부터 2147483647까지만 담을 수 있어 범위를 넘칩니다(오버플로). 실제로 나오는 값은 ' + c1 + '입니다. ' : '결과는 ' + c1 + '입니다. ')
      : (rev ? '자리를 바꿔 잔액 ' + choi[1] + '과 ' + park[1] + '의' : '잔액 ' + park[1] + '과 ' + choi[1] + '의') + ' 크기를 비교합니다. 결과는 ' + c1 + '입니다. ';
    push('order.compare(park, choi): ' + d1 + mean(c1, 'choi') + (over ? ' 잔액이 ' + (park[1] > choi[1] ? '더 큰' : '더 작은') + ' park를 ' + (c1 < 0 ? '앞' : '뒤') + '에 놓으라는 틀린 답입니다.' : ''), over || !right ? 'bad' : '');
    st.c2 = c2;
    var d2 = by === 'natural' ? (rev ? '자리를 바꿔 이름 "kim"과 "park"를' : '이름 "park"와 "kim"을') + ' 사전 순서로 비교합니다. 결과는 ' + c2 + '입니다. '
      : by === 'then' ? '잔액이 같으므로 다음 기준인 이름을 비교합니다. ' + (rev ? '거꾸로이므로 "kim"과 "park"의 자리를 바꿔 비교한 ' : '"park"와 "kim"을 비교한 ') + '결과는 ' + c2 + '입니다. '
      : '두 잔액이 같으므로 결과는 0입니다. ';
    push('order.compare(park, kim): ' + d2 + mean(c2, 'kim'), '');
    var sorted = this.javaSort(D, cmp), names = sorted.map(function (x) { return x[0]; }), okBal = true;
    for (var i = 1; i < sorted.length; i++) if (rev ? sorted[i - 1][1] < sorted[i][1] : sorted[i - 1][1] > sorted[i][1]) okBal = false;
    var okText = by === 'natural' ? '(잔액을 보지 않음)' : okBal ? '맞음' : '틀림', show = sorted.map(function (x) { return x[0] + '(' + self.money(x[1]) + ')'; }).join(', ');
    st.order = names; st.sorted = true; st.ok = okText;
    push('list.sort(order): order.compare를 여러 번 불러 가며 자리를 정합니다. 정렬된 순서는 ' + show + '입니다.' + (by === 'natural' ? '' : okBal ? ' 잔액이 ' + (rev ? '큰' : '작은') + ' 것부터 놓였습니다.' : ' 잔액이 ' + (rev ? '큰' : '작은') + ' 것부터여야 하는데 그렇지 않습니다. 비교가 틀린 답을 냈기 때문입니다.'), by === 'natural' ? '' : okBal ? 'good' : 'bad');
    var pk = names.indexOf('park') < names.indexOf('kim'), cl = names.indexOf('choi') < names.indexOf('lee');
    var last = by === 'natural' ? '이름은 모두 다르므로 순서가 하나로 정해집니다. 잔액은 한 번도 보지 않았습니다.'
      : by === 'then' ? '잔액이 같은 park와 kim은 이름을 비교한 결과에 따라 ' + (pk ? 'park, kim' : 'kim, park') + ' 순서가 되었고, choi와 lee는 ' + (cl ? 'choi, lee' : 'lee, choi') + ' 순서가 되었습니다.' + (rev ? ' reversed가 잔액과 이름 두 기준을 모두 뒤집었습니다.' : '')
      : !okBal ? '예외는 나지 않았습니다. 틀린 순서가 아무 경고 없이 나온 것입니다.'
      : '잔액이 같은 park와 kim은 정렬 전의 순서 그대로 park가 앞이고, choi와 lee도 choi가 앞입니다. 비교 결과가 0인 둘의 순서를 바꾸지 않는 정렬을 안정 정렬이라고 합니다.' + (rev ? ' 거꾸로 정렬해도 0은 뒤집어도 0이므로 마찬가지입니다.' : '');
    push('System.out.println(list): 정렬된 목록을 출력합니다. ' + last, by !== 'natural' && !okBal ? 'bad' : '');
    sum.push('정렬 결과는 ' + names.join(', ') + '입니다.');
    if (by === 'natural') sum.push('Comparable은 클래스 안에 순서를 하나 정해 두는 방법입니다(compareTo). 이름순처럼 그 클래스에 당연한 순서가 있을 때 씁니다. 다른 기준으로 정렬하고 싶으면 클래스를 고치지 않고 Comparator를 바깥에서 줍니다.');
    if (by === 'cmp') sum.push('Comparator는 정렬할 때 바깥에서 주는 순서입니다. 같은 목록을 잔액순, 이름순처럼 그때그때 다른 기준으로 정렬할 수 있습니다. comparingInt는 빼지 않고 크기를 비교하므로 큰 수에서도 안전합니다.');
    if (by === 'cmp' || (by === 'sub' && okBal)) sum.push('잔액이 같은 것끼리는 정렬 전의 순서를 지켰습니다(안정 정렬). List.sort와 Collections.sort는 안정 정렬입니다.' + (rev ? ' 거꾸로 정렬해도 같은 것끼리의 순서는 뒤집히지 않습니다.' : ''));
    if (by === 'then') sum.push('thenComparing은 앞의 기준으로 순서를 가릴 수 없을 때(비교 결과 0)만 쓰이는 다음 기준입니다.' + (rev ? ' reversed를 맨 뒤에 붙이면 앞에 적은 기준 전체가 뒤집힙니다. 잔액은 큰 것부터, 이름도 뒤에서부터입니다.' : ''));
    if (by === 'sub' && !okBal) sum.push('빼서 비교하면 두 수의 차이가 int 범위(약 -21억 ~ 21억)를 넘을 때 부호가 뒤집힙니다. 예외가 나지 않고 틀린 순서가 조용히 나옵니다. Integer.compare(a, b)나 Comparator.comparingInt를 쓰면 빼지 않고 크기를 비교하므로 안전합니다.');
    if (by === 'sub' && okBal) sum.push('작은 수에서는 빼서 비교해도 맞는 결과가 나옵니다. 그래서 테스트는 통과하고, 값이 커진 뒤에야 틀린 정렬이 나타납니다. 잔액의 크기를 큰 수로 바꿔 보세요.');
    function cell(v, other) { return v + (v < 0 ? ' (음수: park가 앞)' : v > 0 ? ' (양수: park가 뒤)' : ' (순서를 가리지 않음)'); }
    return { events: ev, summary: sum, names: names, c1: c1, c2: c2, row: [names.join(', '), cell(c1), cell(c2), okText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, self = this, D = this.DATA[c.data], bal = {};
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    D.forEach(function (x) { bal[x[0]] = x[1]; });
    H.table(v, ['자리', '이름 (owner)', '잔액 (balance)'], s.order.map(function (o, i) { return { cells: [String(i + 1), o, { v: self.money(bal[o]), cls: o === 'park' || o === 'kim' ? 'hot' : '' }] }; }), s.sorted ? 'list (정렬한 뒤)' : 'list (정렬하기 전)');
    var ln = H.lanes(v), sign = function (x) { return x === null ? '아직 비교 전' : x + (x < 0 ? ' → park가 앞' : x > 0 ? ' → park가 뒤' : ' → 순서를 가리지 않음'); };
    H.lane(ln, 'order', !s.has ? '아직 없음' : { natural: '이름순 (compareTo)', cmp: '잔액순', then: '잔액순, 같으면 이름순', sub: '잔액을 뺀 값' }[c.by] + (s.rev ? '의 반대' : ''), s.has ? 'wait' : 'none');
    H.lane(ln, 'compare(park, choi)', sign(s.c1), s.c1 === null ? 'none' : 'hot');
    H.lane(ln, 'compare(park, kim)', sign(s.c2), s.c2 === null ? 'none' : 'hot');
    H.counters(v, [[s.ok, '잔액 순서가 맞는가']]);
  },
  // 그림: 위쪽에 list의 계좌 다섯 개(정렬하면 자리가 바뀐다), 가운데에 두 번의 비교 결과, 아래에 잔액 순서가 맞는지.
  draw: function (P, sim, shown) {
    var c = sim.c, self = this, D = this.DATA[c.data], last = shown[shown.length - 1], bal = {};
    var s = last ? last.snap : { order: D.map(function (x) { return x[0]; }), has: false, rev: false, c1: null, c2: null, sorted: false, ok: '?' };
    D.forEach(function (x) { bal[x[0]] = x[1]; });
    P.size(680, 316);
    P.region('ls', 16, 16, 648, 92, s.sorted ? 'list (정렬한 뒤)' : 'list (정렬하기 전)');
    s.order.forEach(function (o, i) { P.box('a_' + o, 28 + i * 126, 48, 118, 48, { cls: o === 'park' || o === 'kim' ? 'hot' : o === 'choi' || o === 'lee' ? 'wait' : 'plain', title: o, sub: '잔액 ' + self.money(bal[o]) }); });
    P.region('cp', 16, 124, 648, 104, s.has ? 'order.compare(앞, 뒤): 음수면 앞의 것이 먼저, 양수면 나중' : '아직 순서(order)를 정하지 않음');
    var what = function (v) { return v === null ? '아직 비교 전' : v < 0 ? '음수: park가 앞' : v > 0 ? '양수: park가 뒤' : '0: 순서를 가리지 않음'; };
    P.box('k1', 28, 156, 306, 58, { cls: s.c1 === null ? 'ghost' : sim.row[3] === '틀림' ? 'bad' : 'good', title: 'compare(park, choi)', sub: what(s.c1), right: s.c1 === null ? '?' : String(s.c1) });
    P.box('k2', 346, 156, 306, 58, { cls: s.c2 === null ? 'ghost' : 'good', title: 'compare(park, kim)', sub: what(s.c2), right: s.c2 === null ? '?' : String(s.c2) });
    P.box('r1', 16, 246, 648, 38, { cls: !s.sorted ? 'ghost' : s.ok === '틀림' ? 'bad' : s.ok === '맞음' ? 'good' : 'plain', title: c.by === 'natural' ? '이름순으로 정렬됨' : '잔액이 ' + (c.rev ? '큰' : '작은') + ' 것부터 놓였는가', right: s.sorted ? s.ok : '아직 정렬 전' });
    P.note('같은 색 상자는 잔액이 같은 계좌입니다. 정렬한 뒤에 같은 색끼리의 앞뒤가 정렬 전과 같은지 보세요. 정렬은 compare가 돌려주는 값의 부호만 보고 자리를 정하므로, compare가 틀린 부호를 내면 결과도 틀립니다.');
  },
  assume: '열여섯 가지 조합의 정렬 결과, 두 번의 compare가 돌려준 값, 잔액 순서가 맞는지를 이 PC의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. compare가 돌려주는 값 가운데 명세가 정한 것은 부호(음수, 0, 양수)뿐입니다. comparingInt의 1과 -1, 문자열 비교의 13과 5 같은 구체적인 숫자는 JDK 21에서 나온 값입니다. 빼서 비교하는 Comparator처럼 규칙을 어기는 비교를 주면 정렬 결과는 정렬 알고리즘의 내부 동작에 따라 달라집니다. 이 실습의 틀린 순서는 원소가 다섯 개일 때 JDK 21의 List.sort가 내는 결과이며, 원소가 더 많으면 다른 순서가 되거나 IllegalArgumentException이 날 수 있다고 문서에 적혀 있습니다(이 부분은 실행해 보지 않았습니다). 정렬 과정의 비교는 여러 번 일어나지만, 화면에는 그 가운데 두 번만 따로 실행해 보여 줍니다.',
});
