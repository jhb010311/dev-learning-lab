Lab.register({
  id: 'cme', nav: '순회 중 삭제', cat: '자료구조', mode: 'step',
  title: '반복문 안에서 원소를 지우면',
  why: '순회하는 도중에 리스트의 구조가 바뀌면 반복자가 가리키는 위치와 실제 원소가 어긋나, 원소를 건너뛰거나 같은 원소를 두 번 보는 오류가 아무 표시 없이 생길 수 있다. ArrayList 같은 컬렉션의 fail-fast 반복자는 순회 중 구조가 바뀐 것을 알아차리면 ConcurrentModificationException을 던져, 문제가 생긴 자리에서 바로 드러나게 한다.',
  use: '향상된 for문도 반복자로 돌기 때문에, 그 본문에서 list.remove나 add를 부르면 대개 이 예외를 만난다. 장바구니에서 품절 상품 빼기처럼 순회하며 일부를 지울 때는 Iterator의 remove나 removeIf를 쓴다. 여러 스레드가 순회하며 고치는 컬렉션에는 CopyOnWriteArrayList나 ConcurrentHashMap처럼 순회 중 변경에 예외를 던지지 않는 것을 쓴다.',
  intro: '리스트 [1, 2, 2, 3, 4]를 돌면서 값이 2인 원소를 지우려 합니다. 지우는 방법에 따라 예외가 나기도 하고, 예외 없이 원소 하나를 건너뛰어 버리기도 합니다.',
  terms: ['fail-fast 반복자', 'ArrayList', 'ConcurrentHashMap', '스레드 안전(Thread-safe)'], ranks: ['collection', 'exception'],
  controls: [
    { id: 'how', label: '지우는 방법', type: 'select', value: 'foreach', options: [['foreach', '향상된 for문 안에서 list.remove()'], ['indexfwd', '인덱스 for문 (앞에서 뒤로)'], ['indexback', '인덱스 for문 (뒤에서 앞으로)'], ['iterator', 'Iterator의 remove()'], ['removeIf', 'removeIf()']] },
    { id: 'coll', label: '컬렉션', type: 'select', value: 'array', options: [['array', 'ArrayList'], ['cow', 'CopyOnWriteArrayList']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '향상된 for문 안에서 list.remove() 호출로 2를 지우면 어떻게 되나', d: '향상된 for문 안에서 삭제. 예외가 납니다.', v: { how: 'foreach', coll: 'array' } },
    { t: '인덱스 for문으로 앞에서부터', q: '인덱스 for문을 앞에서 뒤로 돌며 2를 지우면', d: '예외는 없지만 2 하나가 남습니다.', v: { how: 'indexfwd', coll: 'array' } },
    { t: '뒤에서부터 지우면', q: '인덱스 for문을 뒤에서 앞으로 돌며 2를 지우면', d: '당겨지는 원소가 이미 지나온 쪽이라 문제없습니다.', v: { how: 'indexback', coll: 'array' } },
    { t: 'Iterator.remove()', q: 'Iterator의 remove 호출로 2를 지우면', d: '반복자를 통해 지우면 안전합니다.', v: { how: 'iterator', coll: 'array' } },
    { t: 'removeIf()', q: 'list.removeIf에 x == 2 조건을 넘겨 지우면', d: '가장 간단하고 안전한 방법입니다.', v: { how: 'removeIf', coll: 'array' } },
    { t: 'CopyOnWriteArrayList에서 for문 삭제', q: '컬렉션을 CopyOnWriteArrayList로 바꾸고 향상된 for문 안에서 list.remove() 호출로 2를 지우면', d: '예외가 나지 않습니다. 반복은 만들어질 때의 예전 배열을 돕니다.', v: { how: 'foreach', coll: 'cow' } },
  ],
  code: function (c) {
    var decl = 'List<Integer> list = new ' + (c.coll === 'array' ? 'ArrayList' : 'CopyOnWriteArrayList') + '<>(List.of(1, 2, 2, 3, 4));\n\n';
    return '// main 메서드 안의 줄만 보임 (클래스·main 선언과 import는 생략)\n' + decl + { foreach: 'for (Integer x : list) {\n    if (x == 2) list.remove(x);          // 순회 중에 리스트를 직접 수정\n}', indexfwd: 'for (int i = 0; i < list.size(); i++) {\n    if (list.get(i) == 2) list.remove(i);\n}', indexback: 'for (int i = list.size() - 1; i >= 0; i--) {\n    if (list.get(i) == 2) list.remove(i);\n}', iterator: 'for (Iterator<Integer> it = list.iterator(); it.hasNext(); ) {\n    if (it.next() == 2) it.remove();     // 반복자를 통해 삭제\n}', removeIf: 'list.removeIf(x -> x == 2);' }[c.how];
  },
  label: function (c) { return (c.coll === 'array' ? 'ArrayList' : 'CopyOnWriteArrayList') + ' · ' + { foreach: '향상된 for문', indexfwd: '인덱스 앞→뒤', indexback: '인덱스 뒤→앞', iterator: 'Iterator.remove', removeIf: 'removeIf' }[c.how]; },
  columns: ['결과 리스트', '예외', '2가 모두 지워졌나'],
  simulate: function (c) {
    var list = [1, 2, 2, 3, 4], ev = [], ex = '', cow = c.coll === 'cow', sum = [];
    function push(s, k, cur, note) { ev.push({ s: s, k: k, snap: { list: list.slice(), cur: cur, note: note || '' } }); }
    push('리스트는 [1, 2, 2, 3, 4]입니다. 값이 2인 원소 두 개를 지우려 합니다.', '', -1);
    if (c.how === 'foreach' || c.how === 'iterator') {
      var snapArr = list.slice(), cursor = 0, mod = 0, expected = 0;
      push(cow ? '반복자를 만듭니다. CopyOnWriteArrayList의 반복자는 만들어진 순간의 배열 [1, 2, 2, 3, 4]를 그대로 붙들고 돕니다. 이후 리스트가 바뀌어도 반복자는 영향을 받지 않습니다.' : '반복자를 만듭니다(향상된 for문도 내부적으로 반복자를 씁니다). 반복자는 이 시점의 리스트 수정 횟수(' + mod + ')를 기억해 둡니다.', '', -1);
      for (;;) {
        var src = cow ? snapArr : list;
        if (cursor === src.length) { push('반복자가 더 읽을 원소가 없다고 판단해 반복이 끝납니다.', '', -1); break; }
        if (!cow && mod !== expected) { ex = 'ConcurrentModificationException'; push('다음 원소를 읽으려는데, 리스트의 수정 횟수(' + mod + ')가 반복자가 기억한 값(' + expected + ')과 다릅니다. 반복자가 모르는 사이에 리스트가 바뀌었다는 뜻이므로, 잘못된 결과를 내느니 즉시 ConcurrentModificationException을 던집니다(fail-fast).', 'bad', cursor); break; }
        var x = src[cursor], at = cursor; cursor++;
        if (x !== 2) { push('원소 ' + x + ' 확인: 2가 아니므로 넘어갑니다.', '', cow ? list.indexOf(x) : at); continue; }
        if (c.how === 'foreach') {
          list.splice(list.indexOf(2), 1); mod++;
          push('원소 2를 읽었습니다. list.remove()로 리스트에서 직접 지웁니다. 리스트는 ' + JSON.stringify(list).replace(/,/g, ', ') + '가 됐습니다.' + (cow ? ' 원본은 새 배열로 교체됐지만 반복자는 예전 배열을 계속 돕니다.' : ' 리스트의 수정 횟수가 ' + mod + '로 올라갔지만 반복자는 이를 모릅니다.'), cow ? '' : 'bad', -1);
        } else if (cow) { ex = 'UnsupportedOperationException'; push('원소 2를 읽고 it.remove()를 호출합니다. CopyOnWriteArrayList의 반복자는 복사본을 도는 읽기 전용이라 삭제를 지원하지 않습니다. UnsupportedOperationException이 발생합니다.', 'bad', at); break; }
        else { list.splice(at, 1); cursor = at; mod++; expected = mod; push('원소 2를 읽고 it.remove()로 지웁니다. 반복자가 직접 지웠으므로 자기 위치를 한 칸 당기고, 기억해 둔 수정 횟수도 ' + mod + '로 맞춥니다. 리스트는 ' + JSON.stringify(list).replace(/,/g, ', ') + '가 됩니다.', 'good', -1); }
      }
    }
    if (c.how === 'indexfwd') for (var i = 0; i < list.length; i++) {
      if (list[i] === 2) { list.splice(i, 1); push('i = ' + i + ': 값이 2입니다. 지웁니다. 뒤의 원소들이 한 칸씩 앞으로 당겨져 리스트는 ' + JSON.stringify(list).replace(/,/g, ', ') + '가 됩니다. 방금 ' + i + '번 칸으로 당겨져 온 원소는 ' + list[i] + '인데, 반복문은 i를 ' + (i + 1) + '로 올리므로 이 원소를 검사하지 않고 지나칩니다.', list[i] === 2 ? 'bad' : '', i); }
      else push('i = ' + i + ': 값이 ' + list[i] + '입니다. 넘어갑니다.', '', i);
    }
    if (c.how === 'indexback') for (var j = list.length - 1; j >= 0; j--) {
      if (list[j] === 2) { list.splice(j, 1); push('i = ' + j + ': 값이 2입니다. 지웁니다. 당겨지는 것은 이미 검사를 마친 뒤쪽 원소들뿐이라, 앞으로 볼 원소의 위치는 변하지 않습니다. 리스트는 ' + JSON.stringify(list).replace(/,/g, ', ') + '가 됩니다.', 'good', -1); }
      else push('i = ' + j + ': 값이 ' + list[j] + '입니다. 넘어갑니다.', '', j);
    }
    if (c.how === 'removeIf') { list = list.filter(function (x2) { return x2 !== 2; }); push('removeIf가 조건에 맞는 원소를 내부에서 한 번에 걸러 냅니다. 반복을 직접 돌리지 않으므로 순회 중 수정 문제가 생기지 않습니다. 리스트는 ' + JSON.stringify(list).replace(/,/g, ', ') + '가 됩니다.', 'good', -1); }
    var res = '[' + list.join(', ') + ']', clean = list.indexOf(2) < 0;
    push('최종 리스트: ' + res + (ex ? ' (예외로 중단됨)' : '') + '.', clean && !ex ? 'good' : 'bad', -1);
    if (ex === 'ConcurrentModificationException') sum.push('이 예외는 이름과 달리 스레드가 하나여도 납니다. 순회 중에 반복자를 거치지 않고 컬렉션을 바꾸면 발생합니다. 반복자는 수정 횟수를 비교해 변화를 감지하는 즉시 실패합니다.');
    if (c.how === 'indexfwd') sum.push('예외는 없지만 결과가 틀렸습니다. 지운 자리로 당겨져 온 원소를 건너뛰기 때문입니다. 조용히 틀리는 쪽이 예외보다 더 위험합니다.');
    if (cow && c.how === 'foreach') sum.push('CopyOnWriteArrayList는 수정할 때마다 배열을 통째로 복사해 새로 만들고, 반복자는 예전 배열을 돕니다. 그래서 순회 중 수정이 안전하지만 수정 비용이 큽니다. 읽기가 압도적으로 많고 수정이 드문 경우(리스너 목록 등)에 맞습니다. ConcurrentHashMap도 순회 중 수정에 예외를 던지지 않도록 설계돼 있습니다.');
    if (!ex && clean && c.how !== 'foreach') sum.push('순회하며 지울 때는 removeIf()나 Iterator.remove()를 씁니다.');
    if (!sum.length) sum.push('결과: ' + res + '. 예외: ' + (ex || '없음') + '. 2가 ' + (clean ? '모두 지워졌습니다.' : '남아 있습니다.'));
    return { events: ev, summary: sum, res: res + (ex ? '|' + ex : ''), row: [res, ex || '없음', clean ? '예' : '아니오'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { list: [1, 2, 2, 3, 4], cur: -1 };
    H.title(v, '리스트 (칸 위치 = 인덱스)'); H.slots(v, s.list.map(function (x, i) { return [String(x), (x === 2 ? 'r' : 'd') + (i === s.cur ? ' now' : '')]; }), '비어 있음');
    H.text(v, '빨강은 지워야 할 값 2, 굵은 테두리는 지금 보고 있는 칸입니다.');
  },
  assume: '열 가지 조합의 최종 리스트와 예외를 검증 환경의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. 향상된 for문에서의 삭제는 지우는 위치에 따라 예외 없이 끝나는 경우도 있는데(끝에서 두 번째 원소를 지울 때), 운에 기대는 코드이므로 쓰면 안 됩니다.',
});
