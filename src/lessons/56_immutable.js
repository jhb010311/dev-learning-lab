Lab.register({
  id: 'immut', nav: '불변과 방어적 복사', cat: '자바 언어', mode: 'step',
  title: 'final을 붙였는데 값이 바뀌었다',
  intro: 'Order 객체가 상품 목록을 final 필드로 가지고 있습니다. final은 "다른 리스트로 바꿔 끼울 수 없다"는 뜻일 뿐, 그 리스트의 내용이 바뀌는 것은 막지 않습니다.',
  terms: ['불변 객체', 'final', '캡슐화', 'record'], ranks: ['string', 'oop', 'javaver'],
  controls: [
    { id: 'in', label: '생성자에서 받은 리스트를', type: 'select', value: 'ref', options: [['ref', '그대로 필드에 저장'], ['copy', '복사해서 저장']] },
    { id: 'out', label: 'getter가 돌려주는 것', type: 'select', value: 'none', options: [['none', '내부 리스트 그대로'], ['copy', '내부 리스트의 복사본'], ['unmod', '수정할 수 없는 뷰']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '아무 방어도 없음. 밖에서 두 가지 경로로 내부가 바뀝니다.', v: { in: 'ref', out: 'none' } },
    { t: '생성자에서만 복사', d: '원본을 바꿔도 영향이 없지만 getter로는 여전히 바뀝니다.', v: { in: 'copy', out: 'none' } },
    { t: '양쪽 모두 복사', d: '밖에서 내부를 바꿀 방법이 없습니다.', v: { in: 'copy', out: 'copy' } },
    { t: 'getter는 수정 불가 뷰', d: '바꾸려 하면 예외가 납니다.', v: { in: 'copy', out: 'unmod' } },
    { t: '뷰만 주고 생성자에서 복사 안 하면', d: '원본 리스트를 통해서는 여전히 바뀝니다.', v: { in: 'ref', out: 'unmod' } },
  ],
  code: function (c) {
    return 'class Order {\n    private final List<String> items;          // final: 다른 리스트로 교체 불가\n\n    Order(List<String> items) {\n        this.items = ' + (c.in === 'copy' ? 'new ArrayList<>(items);   // 복사본을 저장' : 'items;                    // 받은 리스트를 그대로 저장') + '\n    }\n\n    List<String> getItems() {\n        return ' + { none: 'items;                            // 내부 리스트를 그대로 노출', copy: 'new ArrayList<>(items);           // 복사본을 돌려줌', unmod: 'Collections.unmodifiableList(items);  // 수정 불가 뷰' }[c.out] + '\n    }\n}\n\nList<String> src = new ArrayList<>(List.of("키보드", "마우스"));\nOrder order = new Order(src);\nsrc.add("모니터");                 // (1) 원본 리스트를 수정\norder.getItems().add("의자");      // (2) getter로 받은 리스트를 수정';
  },
  label: function (c) { return '생성자: ' + (c.in === 'copy' ? '복사' : '그대로') + ' · getter: ' + { none: '그대로', copy: '복사본', unmod: '수정 불가 뷰' }[c.out]; },
  columns: ['(1) 뒤 내부 상품 수', '(2)의 결과', '최종 내부 상품 수', '밖에서 내부를 바꿀 수 있었나'],
  // 실제 실행 결과와 대조하는 데 쓰는 순수 계산
  calc: function (c) { var copyIn = c.in === 'copy', a = copyIn ? 2 : 3, via = c.out === 'unmod' ? 'UnsupportedOperationException' : 'ok', fin = a + (c.out === 'none' ? 1 : 0); return { a: a, via: via, fin: fin }; },
  simulate: function (c) {
    var r = this.calc(c), ev = [], sum = [], src = ['키보드', '마우스'], inner = c.in === 'copy' ? src.slice() : src, shared = c.in !== 'copy';
    function push(s, k, note) { ev.push({ s: s, k: k, snap: { src: src.slice(), inner: inner.slice(), shared: shared, note: note || '' } }); }
    push('src 리스트 ["키보드", "마우스"]로 Order를 만듭니다. ' + (shared ? '생성자가 받은 리스트를 그대로 필드에 저장했습니다. 변수 src와 order.items는 힙에 있는 같은 리스트 객체 하나를 가리킵니다.' : '생성자가 받은 리스트의 복사본을 만들어 필드에 저장했습니다. src와 order.items는 서로 다른 리스트 객체입니다.'), shared ? 'bad' : 'good');
    src.push('모니터');
    push('(1) src.add("모니터"): 밖에서 원본 리스트에 원소를 추가합니다. ' + (shared ? '같은 객체이므로 order 내부의 상품도 3개가 됐습니다. Order의 메서드를 하나도 호출하지 않았는데 Order의 상태가 바뀌었습니다. items가 final이어도 막지 못합니다.' : 'order는 복사본을 가지고 있어서 영향을 받지 않습니다. 내부 상품은 그대로 2개입니다.'), shared ? 'bad' : 'good');
    if (c.out === 'none') { inner.push('의자'); push('(2) order.getItems().add("의자"): getter가 내부 리스트를 그대로 돌려줬습니다. 그 리스트에 추가하면 곧 order 내부에 추가하는 것입니다. 내부 상품이 ' + inner.length + '개가 됐습니다.', 'bad'); }
    if (c.out === 'copy') push('(2) order.getItems().add("의자"): getter가 복사본을 돌려줬습니다. "의자"는 그 복사본에 추가됐을 뿐 order 내부는 그대로 ' + inner.length + '개입니다.', 'good');
    if (c.out === 'unmod') push('(2) order.getItems().add("의자"): getter가 수정할 수 없는 뷰를 돌려줬습니다. add를 호출하는 순간 UnsupportedOperationException이 발생합니다. 내부는 그대로 ' + inner.length + '개입니다.', 'good', 'UnsupportedOperationException');
    var leak = r.fin !== 2;
    sum.push('final은 변수가 가리키는 대상을 바꾸지 못하게 할 뿐, 대상 객체의 내용 변경은 막지 않습니다. 객체를 불변으로 만들려면 필드가 가리키는 가변 객체(리스트, 배열, Date 등)가 밖과 공유되지 않도록 해야 합니다.');
    if (leak) sum.push('밖에서 내부 상태가 바뀌었습니다. 받을 때 복사하고(생성자), 내줄 때도 복사하거나 수정 불가로 감싸야(getter) 합니다. 이렇게 복사해 두는 것을 방어적 복사라고 합니다.');
    else sum.push('들어올 때와 나갈 때 모두 막아서 밖에서 내부를 바꿀 수 없습니다. 생성자에서 List.copyOf(items)를 쓰면 복사와 수정 불가를 한 번에 얻습니다.');
    if (c.in === 'ref' && c.out === 'unmod') sum.push('수정 불가 뷰는 "이 뷰를 통해서는" 바꿀 수 없다는 뜻입니다. 원본 리스트를 쥔 쪽이 바꾸면 뷰에도 그대로 보입니다.');
    sum.push('record도 마찬가지입니다. 필드는 final이지만 리스트 같은 가변 객체를 담으면 그 내용은 바뀔 수 있습니다.');
    return { events: ev, summary: sum, res: r, row: [r.a + '개', r.via === 'ok' ? '추가됨(예외 없음)' : r.via, r.fin + '개', leak ? '예' : '아니오'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    H.title(v, '변수 src가 가리키는 리스트'); H.slots(v, s.src.map(function (x) { return [x, 'q']; }), '');
    H.title(v, 'order.items가 가리키는 리스트' + (s.shared ? ' (위와 같은 객체)' : ' (별개의 객체)')); H.slots(v, s.inner.map(function (x, i) { return [x, i >= 2 ? 'r' : 'd']; }), '');
  },
  // 그림: 왼쪽에 변수 src와 필드 order.items, 오른쪽 힙에 리스트 객체. 둘이 같은 리스트를 가리키는지가 핵심.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { src: ['키보드', '마우스'], inner: ['키보드', '마우스'], shared: c.in !== 'copy', note: '' };
    P.size(680, 300);
    P.region('vars', 16, 16, 210, 268, '변수와 필드 (참조)');
    P.region('heap', 280, 16, 384, 268, '힙');
    P.box('v_src', 30, 70, 182, 34, { cls: 'wait', title: 'src', right: '참조' });
    P.box('v_items', 30, 160, 182, 34, { cls: 'wait', title: 'order.items', right: 'final' });
    function list(id, y, title, arr, extra) {
      P.box(id, 296, y, 352, 74, { cls: 'plain', title: title });
      arr.forEach(function (x, i) { P.box(id + '_' + x, 306 + i * 85, y + 34, 79, 28, { cls: i >= 2 ? extra : 'good', sub: x, center: true }); });
    }
    if (s.shared) { list('L', 92, '리스트 객체 (하나를 둘이 함께 가리킴)', s.inner, 'bad'); P.arrow('a_src', 'v_src:r', 'L:l:0.35', { cls: 'bad' }); P.arrow('a_items', 'v_items:r', 'L:l:0.65', { cls: 'bad' }); }
    else { list('L', 46, 'src가 가리키는 리스트 객체', s.src, 'wait'); list('M', 138, 'order가 가진 리스트 객체 (복사본)', s.inner, 'bad'); P.arrow('a_src', 'v_src:r', 'L:l'); P.arrow('a_items', 'v_items:r', 'M:l'); }
    if (s.note) P.box('ex', 296, 232, 352, 34, { cls: 'bad', title: 'add() 호출', right: s.note });
    else if (c.out === 'copy' && shown.length >= 3) P.box('tmp', 296, 232, 352, 34, { cls: 'ghost', title: 'getter가 돌려준 복사본', right: '"의자"는 여기에만 추가됨' });
    P.text('cnt', 30, 256, 'Order 내부의 상품 ' + s.inner.length + '개', { cls: s.inner.length > 2 ? 'bad' : 'good' });
    P.note('초록 칸은 처음부터 있던 상품, 빨간 칸은 Order 밖에서 넣었는데 Order 내부에 들어온 상품입니다. 두 화살표가 같은 리스트에 닿아 있으면 한쪽에서 바꾼 것이 다른 쪽에도 보입니다.');
  },
  assume: '여섯 가지 조합의 결과(내부 상품 수와 예외)를 이 PC의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. 리스트의 원소(String)가 불변이라 얕은 복사로 충분한 경우입니다. 원소 자체가 가변 객체라면 원소까지 복사해야 완전히 분리됩니다.',
});
