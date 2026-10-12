Lab.register({
  id: 'eqhash', nav: 'equals와 hashCode', cat: '자바 언어', mode: 'step',
  title: 'equals만 고치면 왜 HashMap에서 못 찾나',
  intro: '내용이 같은 두 객체를 같다고 취급하려면 equals를 재정의합니다. 그런데 HashMap과 HashSet은 equals를 부르기 전에 먼저 hashCode로 찾을 자리를 정합니다. 그래서 equals와 hashCode 가운데 하나만 재정의하면, 같다고 만든 객체를 컬렉션에서 찾지 못합니다.',
  terms: ['equals와 hashCode 규약', '동일성과 동등성', '해시 테이블과 HashMap', '해시 충돌', 'record'],
  controls: [
    { id: 'how', label: 'Order 클래스가 재정의한 메서드', type: 'select', value: 'eq', options: [['none', '아무것도 재정의하지 않음'], ['eq', 'equals만 재정의'], ['hash', 'hashCode만 재정의'], ['both', 'equals와 hashCode 둘 다'], ['const', 'equals 재정의 + hashCode가 항상 42'], ['record', 'record로 선언 (둘 다 자동 생성)']] },
    { id: 'same', label: '두 객체의 id', type: 'select', value: 'same', options: [['same', '둘 다 1 (내용이 같음)'], ['diff', '1과 2 (내용이 다름)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'equals만 재정의한 Order 클래스에서 id가 둘 다 1인 객체를 HashMap에서 왜 못 찾나', d: 'equals만 재정의. equals는 true인데 map에서 꺼내면 null입니다.', v: { how: 'eq', same: 'same' } },
    { t: '둘 다 재정의', q: 'Order 클래스가 재정의한 메서드를 equals와 hashCode 둘 다로 바꾸면', d: '내용이 같은 객체로 꺼낼 수 있습니다.', v: { how: 'both', same: 'same' } },
    { t: '아무것도 재정의하지 않으면', q: 'Order 클래스가 재정의한 메서드를 아무것도 재정의하지 않음 쪽으로 바꾸면', d: '내용이 같아도 서로 다른 객체로 취급됩니다.', v: { how: 'none', same: 'same' } },
    { t: 'hashCode만 재정의', q: 'Order 클래스가 재정의한 메서드를 hashCode만 재정의 쪽으로 바꾸면', d: '같은 자리까지는 찾아가지만 equals가 false라서 못 찾습니다.', v: { how: 'hash', same: 'same' } },
    { t: 'record로 선언', q: 'Order를 record로 선언 (둘 다 자동 생성) 쪽으로 바꾸면', d: '둘 다 자동으로 만들어 줍니다.', v: { how: 'record', same: 'same' } },
    { t: 'hashCode가 항상 같은 값', q: 'equals 재정의 + hashCode가 항상 42 쪽으로 바꾸고 두 객체의 id를 1과 2 (내용이 다름) 쪽으로 바꾸면', d: '규약은 지키지만 모든 객체가 한 자리에 몰립니다.', v: { how: 'const', same: 'diff' } },
  ],
  code: function (c) {
    var b = c.same === 'same' ? 1 : 2;
    var use = '\n\nOrder a = new Order(1);\nOrder b = new Order(' + b + ');\n\nSystem.out.println(a.equals(b));\nSystem.out.println(a.hashCode() == b.hashCode());\n\nMap<Order, String> map = new HashMap<>();\nmap.put(a, "주문 내역");\nSystem.out.println(map.get(b));\n\nSet<Order> set = new HashSet<>();\nset.add(a);\nset.add(b);\nSystem.out.println(set.size());';
    if (c.how === 'record') return 'record Order(int id) { }               // equals와 hashCode가 자동으로 만들어진다' + use;
    var eq = '\n    @Override\n    public boolean equals(Object o) {\n        return o instanceof Order other && id == other.id;\n    }\n';
    var hc = c.how === 'const' ? '\n    @Override\n    public int hashCode() {\n        return 42;                       // 어떤 객체든 같은 값\n    }\n' : '\n    @Override\n    public int hashCode() {\n        return Objects.hash(id);\n    }\n';
    return 'class Order {\n    final int id;\n    Order(int id) { this.id = id; }\n' + (c.how === 'eq' || c.how === 'both' || c.how === 'const' ? eq : '') + (c.how === 'hash' || c.how === 'both' || c.how === 'const' ? hc : '') + '}' + use;
  },
  label: function (c) { return { none: '재정의 없음', eq: 'equals만', hash: 'hashCode만', both: '둘 다', const: 'equals + hashCode 42', record: 'record' }[c.how] + ' · id ' + (c.same === 'same' ? '1과 1' : '1과 2'); },
  columns: ['a.equals(b)', 'hashCode가 같은가', 'map.get(b)', 'set의 크기'],
  // 두 객체가 equals로 같은지, hashCode가 같은지
  facts: function (c) {
    var same = c.same === 'same', eqOver = c.how === 'eq' || c.how === 'both' || c.how === 'const' || c.how === 'record', hashOver = c.how === 'hash' || c.how === 'both' || c.how === 'record';
    return { eq: eqOver && same, hs: c.how === 'const' ? true : hashOver && same, eqOver: eqOver, hashOver: hashOver || c.how === 'const' };
  },
  simulate: function (c) {
    var f = this.facts(c), same = c.same === 'same', bid = same ? 1 : 2, ev = [], sum = [];
    var st = { a: false, b: false, eq: '?', hs: '?', put: false, look: '', got: '?', set: '?' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var found = f.eq && f.hs;
    st.a = true; st.b = true;
    push('Order 객체 두 개를 만듭니다. a의 id는 1, b의 id는 ' + bid + '입니다. ' + (same ? '내용은 같지만 ' : '') + '메모리에서는 서로 다른 객체입니다.', '');
    st.eq = String(f.eq);
    if (!f.eqOver) push('a.equals(b): equals를 재정의하지 않았으므로 Object의 equals가 쓰입니다. 이것은 ==와 같아서 "같은 객체인가"를 봅니다. 서로 다른 객체이므로 false입니다.', same ? 'bad' : '');
    else push('a.equals(b): ' + (c.how === 'record' ? 'record가 만들어 준' : '재정의한') + ' equals가 id를 비교합니다. ' + (same ? '1과 1이므로 true입니다.' : '1과 2이므로 false입니다.'), f.eq ? 'good' : '');
    st.hs = String(f.hs);
    if (c.how === 'const') push('hashCode 비교: 이 hashCode는 어떤 객체에서든 42를 돌려줍니다. 두 값이 같습니다.', '');
    else if (!f.hashOver) push('hashCode 비교: hashCode를 재정의하지 않았으므로 Object의 hashCode가 쓰입니다. 이 값은 객체마다 따로 정해지므로, 서로 다른 객체인 a와 b의 값은 (거의 항상) 다릅니다.' + (f.eq ? ' equals가 true인 두 객체의 hashCode가 다른 상태입니다. "equals가 같으면 hashCode도 같아야 한다"는 규약을 어겼습니다.' : ''), f.eq ? 'bad' : '');
    else push('hashCode 비교: ' + (c.how === 'record' ? 'record가 만들어 준' : '재정의한') + ' hashCode는 id로 값을 계산합니다. ' + (same ? 'id가 같으므로 값도 같습니다.' : 'id가 다르므로 값도 다릅니다.'), f.hs ? 'good' : '');
    st.put = true;
    push('map.put(a, "주문 내역"): HashMap은 먼저 a.hashCode()로 넣을 자리(버킷)를 정하고, 그 자리에 키 a와 값을 함께 넣어 둡니다.', '');
    st.look = f.hs ? 'same' : 'other';
    if (f.hs) {
      push('map.get(b): 먼저 b.hashCode()로 찾을 자리를 정합니다. a와 hashCode가 같으므로 a를 넣어 둔 바로 그 자리로 갑니다.', '');
      st.got = found ? '주문 내역' : 'null';
      push('그 자리에 있는 키 a와 b를 equals로 비교합니다. ' + (f.eq ? 'true이므로 같은 키로 보고 값을 돌려줍니다.' : (f.eqOver ? 'id가 달라 false입니다.' : 'equals를 재정의하지 않아 false입니다.') + ' 같은 자리에 있어도 다른 키로 보고 null을 돌려줍니다.'), found ? 'good' : same ? 'bad' : '');
    } else {
      st.got = 'null';
      push('map.get(b): 먼저 b.hashCode()로 찾을 자리를 정합니다. a와 hashCode가 다르므로 a가 들어 있는 자리를 보지 않습니다. equals는 불러 보지도 못하고 null을 돌려줍니다.' + (f.eq ? ' equals로는 같은 객체인데도 꺼내지 못합니다.' : ''), f.eq ? 'bad' : '');
    }
    st.set = found ? '1' : '2';
    push('set.add(a), set.add(b): HashSet도 안에서 HashMap을 쓰므로 같은 순서로 판단합니다. ' + (found ? 'b는 이미 들어 있는 a와 같은 원소로 보아 넣지 않습니다. 크기는 1입니다.' : 'b를 a와 다른 원소로 보아 둘 다 넣습니다. 크기는 2입니다.' + (same ? ' 내용이 같은 객체가 중복으로 들어갔습니다.' : '')), found ? 'good' : same ? 'bad' : '');
    if (same && f.eq && !f.hs) sum.push('equals만 재정의하면 equals로는 같은 두 객체가 서로 다른 자리로 갑니다. HashMap, HashSet, HashMap을 쓰는 캐시에서 "넣었는데 못 찾는" 버그가 됩니다. equals를 재정의할 때는 hashCode도 같은 필드로 함께 재정의합니다.');
    if (same && !f.eq && f.hs) sum.push('hashCode만 재정의하면 같은 자리까지는 가지만 마지막 확인인 equals가 false입니다. 둘은 짝이라서 하나만으로는 소용이 없습니다.');
    if (same && !f.eqOver && !f.hashOver) sum.push('아무것도 재정의하지 않으면 객체는 자기 자신과만 같습니다. 주문 번호나 좌표처럼 "값이 같으면 같은 것"으로 다뤄야 하는 객체는 둘 다 재정의하거나 record로 선언합니다.');
    if (found) sum.push(c.how === 'record' ? 'record는 모든 구성 요소를 비교하는 equals와 그에 맞는 hashCode를 자동으로 만들어 줍니다. 값을 담는 객체에 잘 맞습니다.' : c.how === 'const' ? '모든 객체의 hashCode가 같아도 규약에는 어긋나지 않고 결과도 맞습니다. 하지만 모든 키가 한 자리에 몰려, 찾을 때마다 그 자리의 키를 하나씩 equals로 비교해야 합니다. 키가 많아지면 HashMap이 느려집니다.' : 'equals가 같은 두 객체가 같은 hashCode를 돌려주므로 HashMap과 HashSet이 둘을 같은 키로 다룹니다.');
    if (!same && c.how === 'const') sum.push('내용이 다른 두 객체가 같은 hashCode를 가져도 됩니다(해시 충돌). 같은 자리에 들어간 뒤 equals로 구분됩니다. 다만 충돌이 많을수록 느려지므로, hashCode는 값이 고르게 퍼지도록 만드는 것이 좋습니다.');
    if (!same && c.how !== 'const') sum.push('내용이 다른 두 객체는 어떤 방식에서든 다른 키로 다뤄집니다.');
    return { events: ev, summary: sum, hs: f.hs, row: [String(f.eq), f.hs ? '같음' : '다름', st.got, st.set + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'equals', s.eq === '?' ? '아직 비교 전' : 'a.equals(b) = ' + s.eq, s.eq === 'true' ? 'good' : s.eq === 'false' ? 'wait' : 'none');
  },
  // 그림: 왼쪽에 키 객체 둘, 오른쪽에 HashMap의 자리(버킷). hashCode가 자리를 정하고, 그 자리에서 equals로 확인한다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { a: false, b: false, eq: '?', hs: '?', put: false, look: '', got: '?', set: '?' }, hs = sim.hs;
    P.size(680, 300);
    P.region('ob', 16, 16, 236, 196, '키로 쓸 객체');
    P.box('a', 30, 52, 208, 54, s.a ? { cls: 'wait', title: 'a = new Order(1)', sub: s.hs === '?' ? 'hashCode ?' : c.how === 'const' ? 'hashCode 42' : hs ? 'hashCode: b와 같은 값' : 'hashCode: b와 다른 값' } : { cls: 'ghost', title: 'a', sub: '아직 없음' });
    P.box('b', 30, 130, 208, 54, s.b ? { cls: 'wait', title: 'b = new Order(' + (c.same === 'same' ? 1 : 2) + ')', sub: s.hs === '?' ? 'hashCode ?' : c.how === 'const' ? 'hashCode 42' : hs ? 'hashCode: a와 같은 값' : 'hashCode: a와 다른 값' } : { cls: 'ghost', title: 'b', sub: '아직 없음' });
    P.region('mp', 300, 16, 364, 196, 'HashMap의 자리 (버킷)');
    P.box('k1', 316, 52, 332, 54, { cls: s.put ? (s.got === '주문 내역' ? 'good' : 'hot') : 'ghost', title: 'a의 hashCode가 정한 자리', sub: s.put ? '키 a → "주문 내역"' : '비어 있음' });
    if (!hs) P.box('k2', 316, 130, 332, 54, { cls: s.look === 'other' ? 'bad' : 'ghost', title: 'b의 hashCode가 정한 자리', sub: '비어 있음' });
    if (s.put) P.arrow('pa', 'a:r', 'k1:l', { label: 'put' });
    if (s.look) P.arrow('gb', 'b:r', (s.look === 'same' ? 'k1' : 'k2') + ':l' + (s.look === 'same' ? ':0.75' : ''), { cls: s.got === '주문 내역' ? 'good' : 'bad', label: 'get' });
    var res = function (x, good) { return x === '?' ? 'ghost' : x === good ? 'good' : 'bad'; };
    P.box('r1', 16, 232, 320, 36, { cls: res(s.got, '주문 내역'), title: 'map.get(b)', right: s.got });
    P.box('r2', 344, 232, 320, 36, { cls: s.set === '?' ? 'ghost' : s.set === '1' ? 'good' : c.same === 'same' ? 'bad' : 'plain', title: 'set의 크기', right: s.set === '?' ? '?' : s.set + '개' });
    P.note('자리(버킷)는 실제로는 번호가 붙은 배열의 칸입니다.');
  },
  assume: '열두 가지 조합의 결과(equals, hashCode가 같은지, map.get, set의 크기)를 이 PC의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. hashCode를 재정의하지 않은 두 객체의 값이 "다르다"는 것은 거의 항상 그렇다는 뜻입니다. Object의 hashCode는 서로 다른 객체에 같은 값을 줄 수도 있으며(그래도 규약에 어긋나지 않습니다), 그 경우에는 equals의 결과에 따라 찾을 수도 있습니다. HashMap은 같은 자리에 있더라도 hashCode 값이 다른 키와는 equals를 부르지 않고 넘어갑니다. record의 hashCode가 내는 구체적인 값은 명세가 정하지 않지만, equals가 같은 두 record의 hashCode가 같다는 것은 보장됩니다.',
});
