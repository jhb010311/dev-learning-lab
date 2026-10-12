Lab.register({
  id: 'stream', nav: '스트림 지연 평가', cat: '자바 언어', mode: 'step',
  title: '스트림은 적힌 순서대로 실행되지 않는다',
  intro: 'filter와 map 같은 중간 연산은 호출한 순간에는 아무 일도 하지 않고, 최종 연산이 호출될 때 비로소 실행됩니다. 그것도 연산별로 한꺼번에가 아니라 원소 하나씩 끝까지 흘려보내는 방식입니다.',
  terms: ['Stream API', '지연 평가(Lazy Evaluation)', '람다 표현식', 'Optional'], ranks: ['stream', 'javaver'],
  controls: [
    { id: 'term', label: '최종 연산', type: 'select', value: 'toList', options: [['none', '없음 (중간 연산까지만)'], ['toList', 'toList() : 전부 모으기'], ['findFirst', 'findFirst() : 첫 원소만']] },
    { id: 'sorted', label: 'filter와 map 사이에 sorted()를 넣는다', type: 'check', value: false },
    { id: 'limit', label: '끝에 limit(2)를 붙인다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '최종 연산 toList() 호출로 전부 모으는 스트림에서 filter와 map은 어떤 순서로 실행되나', d: '원소 하나가 filter와 map을 끝까지 지난 뒤 다음 원소로 넘어갑니다.', v: { term: 'toList', sorted: false, limit: false } },
    { t: '최종 연산을 빼면', q: '최종 연산을 빼고 중간 연산까지만 두면', d: 'filter도 map도 한 번도 실행되지 않습니다.', v: { term: 'none', sorted: false, limit: false } },
    { t: 'findFirst()', q: '최종 연산을 findFirst() 호출로 바꾸면', d: '첫 원소를 찾는 순간 멈춥니다. 나머지는 보지도 않습니다.', v: { term: 'findFirst', sorted: false, limit: false } },
    { t: 'limit(2)', q: '끝에 limit(2) 줄을 붙이면', d: '두 개가 채워지면 남은 원소는 처리하지 않습니다.', v: { term: 'toList', sorted: false, limit: true } },
    { t: 'sorted()를 넣으면', q: '최종 연산이 findFirst() 호출인데 filter와 map 사이에 sorted() 줄을 넣으면', d: '정렬하려면 전부 모아야 하므로 filter가 끝까지 먼저 돕니다.', v: { term: 'findFirst', sorted: true, limit: false } },
  ],
  DATA: [5, 2, 8, 1, 9, 4],
  code: function (c) {
    return 'List.of(5, 2, 8, 1, 9, 4).stream()\n    .filter(x -> x > 3)          // 3보다 큰 것만\n' + (c.sorted ? '    .sorted()                    // 오름차순 정렬\n' : '') + '    .map(x -> x * 10)            // 10배\n' + (c.limit ? '    .limit(2)                    // 2개까지만\n' : '') + (c.term === 'toList' ? '    .toList();' : c.term === 'findFirst' ? '    .findFirst();' : '    ;                            // 최종 연산 없음');
  },
  label: function (c) { return 'filter' + (c.sorted ? ' → sorted' : '') + ' → map' + (c.limit ? ' → limit(2)' : '') + ' → ' + (c.term === 'none' ? '(최종 연산 없음)' : c.term + '()'); },
  columns: ['filter 실행', 'map 실행', '결과'],
  // 실제 실행 결과와 대조하는 데 쓰는 순수 계산
  trace: function (c) {
    var log = [], res = [], D = this.DATA, max = c.term === 'findFirst' ? 1 : c.limit ? 2 : Infinity;
    if (c.term === 'none') return { log: log, out: '(실행 안 됨)', res: res };
    if (c.sorted) { var pass = []; D.forEach(function (x) { log.push('filter(' + x + ')'); if (x > 3) pass.push(x); }); pass.sort(function (a, b) { return a - b; }); for (var i = 0; i < pass.length && res.length < max; i++) { log.push('map(' + pass[i] + ')'); res.push(pass[i] * 10); } }
    else for (var j = 0; j < D.length && res.length < max; j++) { log.push('filter(' + D[j] + ')'); if (D[j] > 3) { log.push('map(' + D[j] + ')'); res.push(D[j] * 10); } }
    return { log: log, res: res, out: c.term === 'findFirst' ? 'Optional[' + res[0] + ']' : '[' + res.join(', ') + ']' };
  },
  simulate: function (c) {
    var tr = this.trace(c), ev = [], D = this.DATA, done = [], out = [], sum = [];
    function push(s, k, cur) { ev.push({ s: s, k: k, snap: { log: done.slice(), out: out.slice(), cur: cur } }); }
    push('stream(), filter(), ' + (c.sorted ? 'sorted(), ' : '') + 'map()' + (c.limit ? ', limit()' : '') + '을 차례로 호출했습니다. 이 호출들은 "무엇을 할지"를 연결해 둘 뿐, 원소를 하나도 꺼내지 않습니다. 람다는 아직 한 번도 실행되지 않았습니다.', '', -1);
    if (c.term === 'none') { push('최종 연산이 없습니다. 파이프라인은 만들어졌지만 실행을 시작하라는 신호가 없으므로 filter와 map은 끝까지 실행되지 않습니다.', 'bad', -1); sum.push('중간 연산만으로는 아무 일도 일어나지 않습니다. 스트림을 만들어 두고 최종 연산을 빼먹으면, 오류 없이 조용히 아무것도 하지 않는 코드가 됩니다.'); return { events: ev, summary: sum, tr: tr, row: ['0번', '0번', '(실행 안 됨)'] }; }
    push(c.term + '()가 호출됐습니다. 이제 실행이 시작됩니다. 최종 연산이 원소를 하나씩 끌어당깁니다.', '', -1);
    tr.log.forEach(function (l, i) {
      var x = +l.replace(/\D/g, ''), isF = l.indexOf('filter') === 0, next = tr.log[i + 1] || '';
      done.push(l);
      if (isF) { var pass = x > 3; push('filter(' + x + '): ' + (pass ? '3보다 큽니다. 통과.' + (c.sorted ? ' sorted()가 받아서 모아 둡니다. 전부 모일 때까지 다음 단계로 넘기지 않습니다.' : ' 곧바로 다음 연산인 map으로 넘어갑니다.') : '3보다 크지 않습니다. 버립니다. 이 원소는 map에 가지 않습니다.'), '', D.indexOf(x)); }
      else { out.push(x * 10); push('map(' + x + '): ' + x * 10 + '으로 바꿔서 ' + (c.term === 'findFirst' ? 'findFirst에 전달합니다.' : c.limit ? 'limit을 거쳐 결과에 담습니다.' : '결과에 담습니다.'), 'good', D.indexOf(x)); }
      if (isF && c.sorted && next.indexOf('map') === 0) push('원소가 다 떨어졌습니다. sorted()가 모아 둔 값을 정렬합니다. 정렬은 전체를 알아야 할 수 있어서, 앞의 filter가 모든 원소에 대해 먼저 실행됐습니다.', '', -1);
    });
    var fN = tr.log.filter(function (l) { return l.indexOf('filter') === 0; }).length, mN = tr.log.length - fN, early = fN < D.length;
    if (early) push((c.term === 'findFirst' ? 'findFirst가 원소 하나를 받았으므로' : 'limit(2)가 두 개를 채웠으므로') + ' 더 끌어당기지 않습니다. 남은 원소 ' + (D.length - fN) + '개는 filter조차 거치지 않았습니다.', 'good', -1);
    else if (mN < tr.log.filter(function (l) { return l.indexOf('filter') === 0 && +l.replace(/\D/g, '') > 3; }).length) push((c.term === 'findFirst' ? 'findFirst가 원소 하나를 받았으므로' : 'limit(2)가 두 개를 채웠으므로') + ' 멈춥니다. 정렬된 나머지 값은 map을 거치지 않았습니다.', 'good', -1);
    push('결과: ' + tr.out, 'good', -1);
    if (!c.sorted) sum.push('"filter를 전부 한 다음 map을 전부"가 아니라, 원소 하나가 filter → map을 끝까지 통과한 뒤 다음 원소가 출발합니다. 그래서 중간에 멈출 수 있습니다.');
    if (early) sum.push('필요한 만큼만 처리하고 멈췄습니다(쇼트 서킷). 원소가 많거나 연산이 비쌀 때 차이가 큽니다.');
    if (c.sorted) sum.push('sorted()처럼 전체를 알아야 하는 연산이 끼면 그 앞 단계는 모든 원소에 대해 실행됩니다. 뒤에 findFirst나 limit이 있어도 앞 단계의 일은 줄지 않습니다. 가능하면 걸러내는 연산을 앞에 두는 것이 좋습니다.');
    return { events: ev, summary: sum, tr: tr, row: [fN + '번', mN + '번', tr.out] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { log: [], out: [], cur: -1 }, D = this.DATA;
    H.title(v, '원본 데이터'); H.slots(v, D.map(function (x, i) { var seen = s.log.indexOf('filter(' + x + ')') >= 0; return [String(x), (i === s.cur ? 'b now' : seen ? (x > 3 ? 'd' : 'r') : '')]; }), null, true);
    H.text(v, '초록은 filter를 통과한 원소, 빨강은 걸러진 원소, 점선은 아직 건드리지 않은 원소입니다.');
    H.title(v, '람다가 실제로 실행된 순서'); H.slots(v, s.log.map(function (l, i) { return [l, (l.indexOf('map') === 0 ? 'q' : '') + (i === s.log.length - 1 ? ' now' : '')]; }), '아직 한 번도 실행되지 않았습니다.');
    H.title(v, '결과로 나온 값'); H.slots(v, s.out.map(function (x) { return [String(x), 'd']; }), '아직 없음');
  },
  assume: '12가지 조합 모두의 실행 순서와 결과를 이 PC의 JDK 21에서 같은 파이프라인을 실행한 결과와 대조했습니다. 순차 스트림 기준이며, 병렬 스트림에서는 원소가 처리되는 순서가 달라집니다.',
});
