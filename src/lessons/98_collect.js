Lab.register({
  id: 'collect', nav: '스트림으로 모으기', cat: '자바 언어', mode: 'step',
  title: '스트림의 결과를 어떤 모양으로 모으나',
  why: '스트림이 없을 때 목록을 고객별로 묶거나 개수를 세려면, 빈 Map을 만들고 for문을 돌며 키가 이미 있는지 확인해 가며 값을 넣는 코드를 매번 적어야 했다. collect와 Collectors는 "어떤 모양으로 모을지"를 groupingBy, toMap, joining 같은 이름으로 고르게 해서 그 반복 코드를 줄인다.',
  use: 'DB에서 읽은 목록을 카테고리별로 묶거나(groupingBy), id로 바로 찾을 수 있는 Map으로 바꾸거나(toMap), 이름들을 쉼표로 이어 한 줄로 만들 때(joining) 쓴다. 묶은 다음 합계나 평균이 필요하면 groupingBy에 summingInt, averagingInt 같은 Collector를 함께 넘긴다.',
  intro: '스트림에서 흘러나온 원소들은 마지막에 collect 같은 최종 연산으로 결과를 받아야 쓸 수 있습니다. 어떤 Collector를 주느냐에 따라 List가 되기도 하고, 키별로 묶인 Map이 되기도 하고, 문자열 하나가 되기도 합니다.',
  terms: ['Stream API', 'Collector와 collect', 'groupingBy와 partitioningBy', '메서드 참조', 'List, Set, Map'],
  controls: [
    { id: 'how', label: '모으는 방법 (Collector)', type: 'select', value: 'toMap', options: [['toList', 'toList() : 순서대로 List에 모으기'], ['group', 'groupingBy(고객) : 고객별로 묶기'], ['count', 'groupingBy(고객, counting()) : 고객별 개수'], ['sum', 'groupingBy(고객, summingInt(가격)) : 고객별 합계'], ['part', 'partitioningBy(가격 >= 300) : 둘로 나누기'], ['join', 'joining(", ") : 문자열 하나로 잇기'], ['toMap', 'toMap(고객, 가격) : 키와 값으로 모으기'], ['toMapMerge', 'toMap(고객, 가격, 병합 함수) : 겹치면 합치기']] },
    { id: 'data', label: '주문 목록', type: 'select', value: 'dup', options: [['dup', '같은 고객이 여러 번 주문 (kim 2건, han 2건, choi 1건)'], ['uniq', '고객이 모두 다름 (5명이 1건씩)'], ['empty', '주문이 하나도 없음']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'kim 2건, han 2건, choi 1건인 주문을 toMap(고객, 가격) 방식으로 모으면 어떻게 되나', d: 'toMap에 같은 고객이 두 번 나옵니다. IllegalStateException이 납니다.', v: { how: 'toMap', data: 'dup' } },
    { t: '병합 함수를 주면', q: 'toMap(고객, 가격, 병합 함수) 방식으로 모으면', d: '같은 키의 값을 더해서 하나로 만듭니다.', v: { how: 'toMapMerge', data: 'dup' } },
    { t: 'toList로 모으기', q: 'toList() 방식으로 모으면', d: '흘러나온 순서 그대로 List에 모읍니다.', v: { how: 'toList', data: 'dup' } },
    { t: 'groupingBy로 묶기', q: 'groupingBy(고객) 방식으로 모으면', d: '고객별로 주문 목록이 만들어집니다.', v: { how: 'group', data: 'dup' } },
    { t: '묶어서 개수 세기', q: 'groupingBy(고객, counting()) 방식으로 모으면', d: '목록 대신 개수만 남깁니다. 값의 타입이 Long입니다.', v: { how: 'count', data: 'dup' } },
    { t: 'partitioningBy로 둘로 나누기', q: 'partitioningBy(가격 >= 300) 방식으로 모으면', d: '조건이 true인 것과 false인 것으로 나눕니다.', v: { how: 'part', data: 'dup' } },
    { t: '주문이 없을 때 둘로 나누기', q: 'partitioningBy(가격 >= 300) 방식인데 주문 목록이 하나도 없으면', d: '원소가 없어도 false와 true 두 칸은 항상 있습니다.', v: { how: 'part', data: 'empty' } },
  ],
  DATA: {
    dup: [['kim', 300], ['han', 100], ['kim', 200], ['choi', 400], ['han', 500]],
    uniq: [['kim', 300], ['han', 100], ['jung', 200], ['choi', 400], ['kang', 500]],
    empty: [],
  },
  HOW: {
    toList: { type: 'List<String>', expr: '.map(Order::customer)\n    .collect(Collectors.toList());' },
    group: { type: 'Map<String, List<Order>>', expr: '.collect(Collectors.groupingBy(Order::customer));' },
    count: { type: 'Map<String, Long>', expr: '.collect(Collectors.groupingBy(Order::customer, Collectors.counting()));' },
    sum: { type: 'Map<String, Integer>', expr: '.collect(Collectors.groupingBy(Order::customer, Collectors.summingInt(Order::price)));' },
    part: { type: 'Map<Boolean, List<Order>>', expr: '.collect(Collectors.partitioningBy(o -> o.price() >= 300));' },
    join: { type: 'String', expr: '.map(Order::customer)\n    .collect(Collectors.joining(", "));' },
    toMap: { type: 'Map<String, Integer>', expr: '.collect(Collectors.toMap(Order::customer, Order::price));' },
    toMapMerge: { type: 'Map<String, Integer>', expr: '.collect(Collectors.toMap(Order::customer, Order::price, (a, b) -> a + b));' },
  },
  code: function (c) {
    var D = this.DATA[c.data], H = this.HOW[c.how], lit = function (x) { return 'new Order("' + x[0] + '", ' + x[1] + ')'; };
    var list = D.length ? 'List<Order> orders = List.of(\n    ' + lit(D[0]) + ', ' + lit(D[1]) + ', ' + lit(D[2]) + ',\n    ' + lit(D[3]) + ', ' + lit(D[4]) + ');' : 'List<Order> orders = List.of();                  // 주문이 하나도 없다';
    return 'record Order(String customer, int price) {\n    @Override\n    public String toString() { return customer + ":" + price; }   // 짧게 출력하려고\n}\n\npublic class Main {\n    public static void main(String[] args) {\n' + (list + '\n\n' + H.type + ' result = orders.stream()\n    ' + H.expr + '\nSystem.out.println(result);').split('\n').map(function (l) { return l ? '        ' + l : l; }).join('\n') + '\n    }\n}';
  },
  label: function (c) { return { toList: 'toList', group: 'groupingBy', count: 'groupingBy + counting', sum: 'groupingBy + summingInt', part: 'partitioningBy', join: 'joining', toMap: 'toMap', toMapMerge: 'toMap + 병합 함수' }[c.how] + ' · ' + { dup: '고객이 겹침', uniq: '고객이 모두 다름', empty: '주문 없음' }[c.data]; },
  columns: ['결과의 타입', '출력', '예외'],
  simulate: function (c) {
    var D = this.DATA[c.data], h = c.how, H = this.HOW[h], ev = [], sum = [], isMap = h !== 'toList' && h !== 'join';
    var list = [], map = {}, ex = '', msg = '', done = 0, out = null;
    if (h === 'part') { map['false'] = []; map['true'] = []; }
    function keys() { return Object.keys(map).sort(); }
    function val(k) { return h === 'group' || h === 'part' ? '[' + map[k].join(', ') + ']' : String(map[k]); }
    function printed() { return h === 'toList' ? '[' + list.join(', ') + ']' : h === 'join' ? list.join(', ') : '{' + keys().map(function (k) { return k + '=' + val(k); }).join(', ') + '}'; }
    function push(s, k, idx, hit) { ev.push({ s: s, k: k, snap: { idx: idx, hit: hit || '', done: done, list: list.slice(), ents: keys().map(function (key) { return [key, val(key)]; }), ex: ex, out: out } }); }
    push(D.length ? 'orders.stream(): 주문 다섯 개가 ' + D.map(function (x) { return x[0] + ':' + x[1]; }).join(', ') + ' 순서로 하나씩 흘러나오는 스트림을 만듭니다. 아직 아무것도 모으지 않았습니다.' : 'orders.stream(): orders가 비어 있으므로 원소가 하나도 흘러나오지 않는 스트림이 됩니다.', '', -1);
    var pre = 'collect는 흘러나오는 원소를 하나씩 받아 결과 객체에 모으는 최종 연산이고, 어떤 결과 객체에 어떻게 모을지는 괄호 안의 Collector가 정합니다. ';
    push({ toList: '.collect(Collectors.toList()): ' + pre + 'toList는 빈 List를 준비합니다. 앞의 map(Order::customer)가 주문에서 고객 이름만 꺼내 넘겨줍니다.',
      group: '.collect(Collectors.groupingBy(Order::customer)): ' + pre + 'groupingBy는 빈 Map을 준비합니다. 원소마다 customer를 키로 삼아 키가 같은 원소끼리 한 목록에 모읍니다.',
      count: '.collect(Collectors.groupingBy(Order::customer, Collectors.counting())): ' + pre + 'groupingBy는 빈 Map을 준비하고 customer가 같은 원소끼리 모읍니다. 두 번째 인자 counting() 때문에 목록 대신 개수만 셉니다.',
      sum: '.collect(Collectors.groupingBy(Order::customer, Collectors.summingInt(Order::price))): ' + pre + 'groupingBy는 빈 Map을 준비하고 customer가 같은 원소끼리 모읍니다. 두 번째 인자 summingInt 때문에 목록 대신 price의 합계만 구합니다.',
      part: '.collect(Collectors.partitioningBy(o -> o.price() >= 300)): ' + pre + 'partitioningBy는 false 칸과 true 칸이 미리 들어 있는 Map을 준비합니다. 원소마다 조건을 검사해 결과에 맞는 칸에 넣습니다.',
      join: '.collect(Collectors.joining(", ")): ' + pre + 'joining은 빈 문자열을 준비합니다. 앞의 map(Order::customer)가 넘겨주는 고객 이름을 ", "를 사이에 두고 차례로 이어 붙입니다.',
      toMap: '.collect(Collectors.toMap(Order::customer, Order::price)): ' + pre + 'toMap은 빈 Map을 준비합니다. 원소마다 customer를 키로, price를 값으로 넣습니다. 한 키에 값은 하나만 들어갑니다.',
      toMapMerge: '.collect(Collectors.toMap(Order::customer, Order::price, (a, b) -> a + b)): ' + pre + 'toMap은 빈 Map을 준비합니다. 원소마다 customer를 키로, price를 값으로 넣습니다. 세 번째 인자는 같은 키가 또 나왔을 때 두 값을 하나로 합치는 방법(병합 함수)입니다.' }[h], '', -1);
    for (var i = 0; i < D.length && !ex; i++) {
      var name = D[i][0], price = D[i][1], tag = name + ':' + price, has = map[name] !== undefined, s, k = '', hit = name;
      done = i + 1;
      if (h === 'toList') { list.push(name); hit = ''; s = '고객 이름(' + name + ')을 List의 맨 뒤에 붙입니다. 지금 List는 [' + list.join(', ') + ']입니다.'; }
      else if (h === 'join') { list.push(name); hit = ''; s = (i === 0 ? '고객 이름(' + name + ')으로 문자열을 시작합니다.' : '사이에 ", "를 넣고 고객 이름(' + name + ')을 이어 붙입니다.') + ' 지금 문자열은 "' + list.join(', ') + '"입니다.'; }
      else if (h === 'part') { hit = String(price >= 300); map[hit].push(tag); s = '조건을 검사합니다. ' + price + ' >= 300은 ' + hit + '이므로 ' + hit + ' 칸의 목록에 넣습니다.'; }
      else if (h === 'group') { if (!has) map[name] = []; map[name].push(tag); s = '키는 customer인 ' + name + '입니다. ' + (has ? '이미 있는 키이므로 그 목록의 뒤에 붙입니다. 지금 그 목록은 [' + map[name].join(', ') + ']입니다.' : 'Map에 아직 없는 키이므로 새 목록을 만들어 넣습니다.'); }
      else if (h === 'count') { map[name] = (map[name] || 0) + 1; s = '키는 customer인 ' + name + '입니다. ' + (has ? '이미 있는 키이므로 개수를 ' + (map[name] - 1) + '에서 ' + map[name] + '로 늘립니다.' : 'Map에 아직 없는 키이므로 개수 1로 시작합니다.'); }
      else if (h === 'sum') { var before = map[name] || 0; map[name] = before + price; s = '키는 customer인 ' + name + '입니다. ' + (has ? '이미 있는 키이므로 합계 ' + before + '에 ' + price + '을 더합니다. 합계는 ' + map[name] + '입니다.' : 'Map에 아직 없는 키이므로 합계는 ' + price + '에서 시작합니다.'); }
      else if (!has) { map[name] = price; s = '키 ' + name + ', 값 ' + price + '을 Map에 넣습니다.'; }
      else if (h === 'toMap') { ex = 'IllegalStateException'; msg = 'Duplicate key ' + name + ' (attempted merging values ' + map[name] + ' and ' + price + ')'; k = 'bad'; s = '같은 키(' + name + ')가 이미 Map에 있습니다. 이미 있는 값 ' + map[name] + '과 새 값 ' + price + ' 가운데 무엇을 남길지 정해 주지 않았으므로 IllegalStateException이 나고 프로그램이 여기서 멈춥니다. 예외 메시지는 "' + msg + '"입니다.'; }
      else { var old = map[name]; map[name] = old + price; k = 'good'; s = '같은 키(' + name + ')가 이미 Map에 있습니다. 병합 함수 (a, b) -> a + b에 이미 있던 값 ' + old + '과 새 값 ' + price + '을 넘기고, 돌려받은 ' + map[name] + '을 그 키의 값으로 둡니다.'; }
      push(tag + ' 주문: ' + s, k, i, hit);
    }
    var res = printed(), shown = h === 'join' && !res ? '(빈 문자열)' : res;
    if (!ex) {
      out = shown;
      var tail = h === 'toList' ? ' 흘러나온 순서 그대로이고, 같은 이름도 나온 만큼 들어 있습니다.' : h === 'join' ? (res ? ' 결과는 컬렉션이 아니라 문자열 하나입니다.' : ' 원소가 없어서 빈 문자열이 되었고, 빈 줄이 출력됩니다.') : h === 'part' ? ' false 칸이 먼저, true 칸이 나중에 나옵니다.' + (D.length ? '' : ' 원소가 하나도 없었지만 두 칸은 그대로 있습니다.') : D.length ? ' Map이 키를 내놓는 순서는 원소가 흘러나온 순서(' + D[0][0] + '이 먼저)와 상관이 없습니다. 이 순서에 기대는 코드를 쓰면 안 됩니다.' : ' 원소가 없어서 키가 하나도 없는 빈 Map입니다.';
      push('System.out.println(result): 출력은 ' + shown + '입니다.' + tail, 'good', -1);
    }
    if (h === 'toList') sum.push('collect(Collectors.toList())는 흘러나온 원소를 순서 그대로 List에 모읍니다. 중복도 그대로 들어갑니다. 자바 16부터는 스트림에 .toList()를 바로 붙여 짧게 쓸 수도 있습니다(다만 수정할 수 없는 리스트를 돌려줍니다).');
    if (h === 'group') sum.push('groupingBy는 키가 같은 원소끼리 묶어 Map<키, List<원소>>를 만듭니다. 고객별 주문, 분류별 상품처럼 "무엇별로" 나누는 일에 씁니다.');
    if (h === 'count') sum.push('groupingBy의 두 번째 인자는 묶인 원소들을 어떻게 정리할지 정합니다. counting()은 개수를 세며, 값의 타입은 Integer가 아니라 Long입니다. Map<String, Integer>로 받으면 컴파일 오류가 납니다.');
    if (h === 'sum') sum.push('summingInt는 묶인 원소들에서 int 값을 꺼내 더합니다. 고객별 합계, 분류별 합계처럼 자주 쓰는 모양입니다.');
    if (h === 'part') sum.push('partitioningBy는 조건 하나로 true 무리와 false 무리로 나눕니다. 해당하는 원소가 없어도 false와 true 두 키가 항상 들어 있습니다. groupingBy는 원소가 없는 키를 만들지 않습니다.');
    if (h === 'join') sum.push('joining은 문자열들을 구분자를 사이에 두고 하나의 String으로 이어 붙입니다. 문자열이 아닌 원소는 먼저 map으로 문자열로 바꿔야 합니다.');
    if (h === 'toMap') sum.push(ex ? 'toMap은 한 키에 값 하나만 짝짓습니다. 키가 겹칠 수 있는 데이터라면 세 번째 인자로 병합 함수를 주거나, 겹치는 것을 목록으로 모으는 groupingBy를 써야 합니다.' : D.length ? '키가 하나도 겹치지 않아 예외 없이 끝났습니다. 주문 목록을 "같은 고객이 여러 번 주문"으로 바꾸면 같은 코드에서 예외가 납니다. 테스트 데이터에는 겹치는 키가 없어 통과하다가 실제 데이터에서 예외가 나는 일이 흔합니다.' : '원소가 없으면 겹칠 키도 없으므로 빈 Map이 나옵니다.');
    if (h === 'toMapMerge') sum.push('병합 함수는 같은 키가 또 나왔을 때 이미 있던 값과 새 값을 받아 남길 값을 돌려줍니다. (a, b) -> a + b는 합계를, (a, b) -> a는 먼저 나온 값을, (a, b) -> b는 나중에 나온 값을 남깁니다.' + (c.data === 'uniq' ? ' 이번에는 겹치는 키가 없어서 병합 함수가 한 번도 불리지 않았습니다.' : ''));
    if (!D.length && h !== 'part' && h !== 'toMap') sum.push('주문이 하나도 없어도 예외는 나지 않고 빈 결과가 나옵니다.');
    return { events: ev, summary: sum, msg: msg, keysAll: keys(), row: [H.type, ex ? '(출력 전에 멈춤)' : shown, ex || '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, h = c.how;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    var ln = H.lanes(v);
    if (h === 'toList') { H.title(v, 'List가 가진 값 (순서대로)'); H.slots(v, s.list.map(function (x) { return [x, 'd']; }), '비어 있음'); }
    else if (h === 'join') H.lane(ln, '이어 붙인 문자열', s.list.length ? '"' + s.list.join(', ') + '"' : '비어 있음', s.list.length ? 'good' : 'none');
    else H.table(v, ['키', h === 'count' ? '값 (개수)' : h === 'sum' ? '값 (합계)' : h === 'group' || h === 'part' ? '값 (주문 목록)' : '값 (가격)'], s.ents.map(function (e) { return { cells: [e[0], { v: e[1], cls: e[0] === s.hit ? (s.ex ? 'bad' : 'hot') : '' }] }; }), 'Map이 가진 짝 (키 순서로 정리해 표시)');
  },
  // 그림: 위쪽에 스트림에서 흘러나오는 주문들, 아래쪽에 모은 결과(List, 문자열, 또는 키마다 한 칸인 Map). 원소 하나가 들어갈 때마다 화살표가 그 칸으로 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, h = c.how, D = this.DATA[c.data], last = shown[shown.length - 1];
    var s = last ? last.snap : { idx: -1, hit: '', done: 0, list: [], ents: h === 'part' ? [['false', '[]'], ['true', '[]']] : [], ex: '', out: null };
    P.size(680, 304);
    P.region('src', 16, 16, 648, 84, 'orders.stream()에서 흘러나오는 원소 (왼쪽부터)');
    D.forEach(function (x, i) {
      var sub = h === 'toList' || h === 'join' ? '이름 ' + x[0] : h === 'part' ? '조건 ' + (x[1] >= 300) : '키 ' + x[0];
      P.box('o' + i, 28 + i * 126, 46, 118, 44, { cls: i >= s.done ? 'ghost' : i === s.idx ? (s.ex ? 'bad now' : 'hot now') : 'wait', title: x[0] + ':' + x[1], sub: sub });
    });
    if (!D.length) P.text('none', 340, 66, '원소가 하나도 없음', { cls: 'mut', anchor: 'middle' });
    P.region('res', 16, 112, 648, 114, '모은 결과: ' + this.HOW[h].type);
    var word = { toList: '붙임', join: '이어 붙임', group: '넣음', count: '개수 +1', sum: '더함', part: '넣음', toMap: '넣음', toMapMerge: '넣음' }[h];
    if (h === 'toList' || h === 'join') {
      var txt = h === 'toList' ? '[' + s.list.join(', ') + ']' : '"' + s.list.join(', ') + '"';
      P.box('L', 28, 148, 624, 56, { cls: s.list.length ? (s.idx >= 0 ? 'good now' : 'good') : 'ghost', title: h === 'toList' ? 'List' : '문자열', sub: s.list.length ? txt : '비어 있음' });
      if (s.idx >= 0) P.arrow('ar', 'o' + s.idx + ':b', 'L:t:' + ((s.idx + 0.5) / 5), { cls: 'good', label: word });
    } else {
      var all = sim.keysAll, n = all.length, w = n ? Math.min(308, Math.floor((624 - (n - 1) * 8) / n)) : 0;
      s.ents.forEach(function (e) {
        var pos = all.indexOf(e[0]), hit = s.idx >= 0 && e[0] === s.hit, lab = h === 'part' ? e[0] + (e[0] === 'true' ? ' (300 이상)' : ' (300 미만)') : e[0];
        P.box('k_' + e[0], 28 + pos * (w + 8), 148, w, 56, { cls: hit ? (s.ex ? 'bad now' : 'good now') : e[1] === '[]' ? 'plain' : 'good', title: lab, sub: (h === 'count' ? '개수 ' : h === 'sum' ? '합계 ' : h === 'toMap' || h === 'toMapMerge' ? '값 ' : '') + e[1] });
        if (hit) P.arrow('ar', 'o' + s.idx + ':b', 'k_' + e[0] + ':t', { cls: s.ex ? 'bad' : 'good', label: s.ex ? '키가 겹침' : word });
      });
      if (!s.ents.length) P.text('emp', 340, 180, 'Map이 비어 있음', { cls: 'mut', anchor: 'middle' });
    }
    if (s.ex) P.box('r1', 16, 238, 648, 50, { cls: 'bad', title: '예외로 멈춤', sub: s.ex + ': ' + sim.msg });
    else P.box('r1', 16, 238, 648, 50, { cls: s.out === null ? 'ghost' : 'good', title: '출력', sub: s.out === null ? '아직 없음' : s.out });
    P.note(h === 'toList' || h === 'join' ? '원소는 흘러나온 순서대로 하나씩 결과에 더해집니다.' : h === 'part' ? 'partitioningBy가 만드는 Map에는 false 칸과 true 칸이 처음부터 있습니다. 원소는 조건의 결과에 맞는 칸으로 갑니다.' : 'Map은 키마다 칸이 하나입니다. 처음 보는 키가 나오면 칸이 새로 생기고, 이미 있는 키가 나오면 그 칸으로 갑니다. 칸은 키의 사전 순서로 정리해 그렸습니다.');
  },
  assume: '스물네 가지 조합의 출력과 예외(종류와 메시지)를 검증 환경의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. 결과의 타입은 그 타입으로 선언한 코드가 실제로 컴파일되는지로 확인했고, counting()의 결과를 Map<String, Integer>로 받으면 컴파일되지 않는 것도 확인했습니다. groupingBy와 toMap이 돌려주는 Map은 순서를 보장하지 않습니다(JDK 21에서는 HashMap). 이 실습은 Map을 키의 사전 순서로 정리해 보여 주며, 여기에 쓴 고객 이름들은 JDK 21의 실제 출력 순서도 그와 같았습니다. 다른 이름을 쓰면 실제 출력 순서는 달라질 수 있습니다. 예외 메시지의 글귀는 JDK 버전에 따라 다를 수 있습니다. 스트림은 원소를 하나씩 차례로 처리하는 경우(병렬이 아닌 스트림)만 다룹니다.',
});
