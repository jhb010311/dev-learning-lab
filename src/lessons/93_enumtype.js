Lab.register({
  id: 'enumtype', nav: '열거형(enum)', cat: '자바 언어', mode: 'step',
  title: '@Enumerated(EnumType.ORDINAL)로 저장한 enum은 왜 다른 상수가 되어 돌아오나',
  why: 'enum이 없을 때는 주문 상태 같은 값을 int 상수나 문자열로 나타냈다. 그러면 정해 두지 않은 숫자나 오타 난 문자열을 넘겨도 컴파일러가 막지 못했고, 같은 숫자를 쓰는 다른 종류의 상수와 섞여도 알아채기 어려웠다. enum은 가능한 값을 하나의 타입으로 묶어서, 그 밖의 값이나 다른 종류의 상수를 넘기는 코드를 컴파일 단계에서 막는다. 다만 DB의 컬럼에는 enum 객체를 그대로 넣을 수 없어서, JPA는 저장할 때 숫자나 글자로 바꾸고 읽을 때 되돌리는 방법을 @Enumerated와 AttributeConverter로 정하게 한다.',
  use: '주문 상태, 결제 수단, 회원 등급처럼 종류가 미리 정해진 값을 나타낼 때 쓴다. JPA 엔티티의 enum 필드에는 @Enumerated(EnumType.STRING)을 붙여 상수의 이름을 저장하는 것이 보통이다. @Enumerated를 붙이지 않으면 기본값인 ORDINAL(선언 순서 번호)로 저장된다. DB에 P, S 같은 짧은 코드로 저장해야 하면 AttributeConverter를 만들어 @Convert로 지정한다.',
  intro: 'enum은 주문 상태처럼 정해진 몇 가지 값만 가질 수 있는 타입입니다. JPA 엔티티의 enum 필드를 DB에 저장할 때는 @Enumerated로 저장 방식을 고릅니다. EnumType.ORDINAL은 상수의 선언 순서 번호를, EnumType.STRING은 상수의 이름을 저장합니다. 번호로 저장한 뒤 enum 선언의 순서를 고치면, DB의 숫자는 그대로인데 그 숫자가 가리키는 상수가 달라집니다. 이 실습은 Hibernate가 실제로 저장하고 다시 읽은 결과를 따라갑니다.',
  terms: ['열거형(enum)', '@Enumerated', 'AttributeConverter', 'ordinal()과 name()', 'enum의 valueOf'],
  controls: [
    { id: 'store', label: 'status 필드의 저장 방식', type: 'select', value: 'ORDINAL', options: [['ORDINAL', '@Enumerated(EnumType.ORDINAL): 선언 순서 번호'], ['STRING', '@Enumerated(EnumType.STRING): 상수의 이름'], ['code', '@Convert + AttributeConverter: 정해 둔 코드 값']] },
    { id: 'change', label: '저장한 뒤 enum 선언을 어떻게 고쳤나', type: 'select', value: 'insert', options: [['same', '고치지 않음'], ['append', '새 상수 CANCELED를 맨 끝에 추가'], ['insert', '새 상수 CANCELED를 중간에 끼워 넣음'], ['swap', 'ORDERED와 PAID의 순서를 바꿈'], ['rename', 'PAID의 이름을 PAYMENT_DONE으로 바꿈']] },
    { id: 'saved', label: '저장해 둔 주문의 상태', type: 'select', value: 'PAID', options: [['ORDERED', 'ORDERED (주문 접수)'], ['PAID', 'PAID (결제 완료)'], ['SHIPPED', 'SHIPPED (배송 시작)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '@Enumerated(EnumType.ORDINAL)로 저장한 PAID 주문을, enum 중간에 CANCELED를 끼워 넣고 다시 배포한 뒤 읽으면 어떤 상수가 되나', d: 'DB에는 숫자 1이 남아 있고, 지금 선언에서 1번은 CANCELED입니다. 결제 완료 주문이 취소 주문으로 읽힙니다.', v: { store: 'ORDINAL', change: 'insert', saved: 'PAID' } },
    { t: '순서만 바꿔도', q: '새 상수를 끼워 넣는 대신 ORDERED와 PAID의 순서를 바꾸면', d: '상수를 추가하지 않고 순서만 바꿔도 번호가 가리키는 상수가 달라집니다.', v: { store: 'ORDINAL', change: 'swap', saved: 'PAID' } },
    { t: '맨 끝에 추가하면', q: '새 상수 CANCELED를 중간이 아니라 맨 끝에 추가하면', d: '기존 상수의 번호가 그대로라서 같은 상수가 읽힙니다.', v: { store: 'ORDINAL', change: 'append', saved: 'PAID' } },
    { t: '운 좋게 무사한 상수', q: '저장해 둔 주문이 ORDERED이고 새 상수 CANCELED는 중간에 끼워 넣은 채로 두면', d: '같은 변경인데 맨 앞의 상수는 번호가 바뀌지 않습니다.', v: { store: 'ORDINAL', change: 'insert', saved: 'ORDERED' } },
    { t: 'STRING으로 저장', q: '저장 방식을 @Enumerated(EnumType.STRING)으로 바꾸고 CANCELED를 중간에 끼워 넣으면', d: 'DB에 이름이 저장되므로 순서가 달라져도 같은 상수가 읽힙니다.', v: { store: 'STRING', change: 'insert', saved: 'PAID' } },
    { t: 'STRING인데 이름을 바꾸면', q: '@Enumerated(EnumType.STRING)으로 저장한 뒤 PAID의 이름을 PAYMENT_DONE으로 바꾸면', d: 'DB의 "PAID"에 맞는 상수가 없어 em.find가 예외를 던집니다.', v: { store: 'STRING', change: 'rename', saved: 'PAID' } },
    { t: 'AttributeConverter로 코드 저장', q: '@Enumerated 대신 AttributeConverter로 코드 값 P를 저장하고 PAID의 이름을 PAYMENT_DONE으로 바꾸면', d: '저장된 것이 이름도 번호도 아닌 코드라서, 이름을 바꿔도 같은 상수가 읽힙니다.', v: { store: 'code', change: 'rename', saved: 'PAID' } },
  ],
  OLD: [['ORDERED', 'O', '주문 접수'], ['PAID', 'P', '결제 완료'], ['SHIPPED', 'S', '배송 시작']],
  // 처음 배포할 때 Hibernate 7.4.5가 H2에 만든 status 컬럼 (EnumTypeProbe로 확인)
  DDL: { ORDINAL: 'status tinyint check ((status between 0 and 2))', STRING: "status enum ('ORDERED','PAID','SHIPPED')", code: "status varchar(255) check ((status in ('P','S','O')))" },
  // 이름을 바꾼 뒤 STRING으로 저장된 행을 읽을 때 em.find가 던지는 예외 (EnumTypeProbe로 확인)
  RENAME_ERR: 'java.lang.IllegalArgumentException: No enum constant OrderStatus.PAID',
  // 고친 뒤의 선언: [이름, code, 뜻]
  consts: function (change) {
    var o = this.OLD[0], p = this.OLD[1], s = this.OLD[2], x = ['CANCELED', 'C', '주문 취소'];
    return { same: [o, p, s], append: [o, p, s, x], insert: [o, x, p, s], swap: [p, o, s], rename: [o, ['PAYMENT_DONE', 'P', '결제 완료'], s] }[change];
  },
  // 화면 코드의 enum 선언 위에 적는, 저장한 뒤에 고친 내용
  CHNOTE: { same: '저장한 뒤에 고치지 않았다', append: '저장한 뒤에 CANCELED를 맨 끝에 추가했다', insert: '저장한 뒤에 CANCELED를 ORDERED와 PAID 사이에 끼워 넣었다', swap: '저장한 뒤에 ORDERED와 PAID의 순서를 바꿨다', rename: '저장한 뒤에 PAID의 이름을 PAYMENT_DONE으로 바꿨다' },
  // DB에 저장된 값, 지금 선언에서 읽어 온 상수(없으면 null), 저장한 상수의 지금 이름
  facts: function (c) {
    var cs = this.consts(c.change), oi = this.OLD.map(function (r) { return r[0]; }).indexOf(c.saved), old = this.OLD[oi];
    var value = c.store === 'ORDINAL' ? String(oi) : c.store === 'STRING' ? old[0] : old[1], read = null;
    if (c.store === 'ORDINAL') read = cs[oi] || null;
    if (c.store === 'STRING') read = cs.filter(function (r) { return r[0] === value; })[0] || null;
    if (c.store === 'code') read = cs.filter(function (r) { return r[1] === value; })[0] || null;
    var now = c.change === 'rename' && c.saved === 'PAID' ? 'PAYMENT_DONE' : c.saved;
    return { cs: cs, oi: oi, old: old, value: value, shown: c.store === 'ORDINAL' ? value : "'" + value + "'", read: read, now: now, eq: !!read && read[0] === now };
  },
  code: function (c) {
    var f = this.facts(c), code = c.store === 'code', s = '// 파일: OrderStatus.java\n// 주문 상태를 나타내려고 예시로 만든 enum. 저장할 때의 선언은 ORDERED, PAID, SHIPPED 순서였고, ' + this.CHNOTE[c.change] + '\n';
    if (!code) s += 'public enum OrderStatus { ' + f.cs.map(function (r) { return r[0]; }).join(', ') + ' }\n\n';
    else {
      s += 'public enum OrderStatus {\n';
      f.cs.forEach(function (r, i) { s += '    ' + r[0] + '("' + r[1] + '")' + (i < f.cs.length - 1 ? ',' : ';') + '\n'; });
      s += '\n    private final String code;\n\n    OrderStatus(String code) {\n        this.code = code;\n    }\n\n    public String getCode() {\n        return code;\n    }\n\n' +
        '    public static OrderStatus fromCode(String code) {\n        for (OrderStatus s : values()) {\n            if (s.code.equals(code)) {\n                return s;\n            }\n        }\n        throw new IllegalArgumentException("없는 코드: " + code);\n    }\n}\n\n';
    }
    if (code) {
      s += '// 파일: OrderStatusConverter.java\n// 예시로 만든 변환기. AttributeConverter와 @Converter는 JPA가 주는 것\nimport jakarta.persistence.AttributeConverter;\nimport jakarta.persistence.Converter;\n\n@Converter\npublic class OrderStatusConverter implements AttributeConverter<OrderStatus, String> {\n' +
        '    @Override\n    public String convertToDatabaseColumn(OrderStatus status) {\n        return status == null ? null : status.getCode();\n    }\n\n' +
        '    @Override\n    public OrderStatus convertToEntityAttribute(String code) {\n        return code == null ? null : OrderStatus.fromCode(code);\n    }\n}\n\n';
    }
    s += '// 파일: Order.java\n// 예시로 만든 엔티티. @Entity, @Table, @Id, ' + (code ? '@Convert는' : '@Enumerated, EnumType은') + ' JPA가 주는 것\nimport jakarta.persistence.*;\n\n@Entity\n@Table(name = "orders")\npublic class Order {\n    @Id\n    private Long id;\n\n' +
      (code ? '    @Convert(converter = OrderStatusConverter.class)\n' : '    @Enumerated(EnumType.' + c.store + ')\n') + '    private OrderStatus status;\n\n' +
      '    protected Order() {\n    }\n\n    public Order(Long id, OrderStatus status) {\n        this.id = id;\n        this.status = status;\n    }\n\n    public OrderStatus getStatus() {\n        return status;\n    }\n}\n\n';
    s += '// 파일: OrderReader.java\n// 다시 배포한 뒤 주문을 읽는 예시 클래스. EntityManager는 JPA가 주는 것\nimport jakarta.persistence.EntityManager;\n\npublic class OrderReader {\n' +
      '    // 예전 선언일 때 em.persist(new Order(1L, OrderStatus.' + c.saved + '))로 저장해 둔 주문을 읽는다\n    static void print(EntityManager em) {\n        Order order = em.find(Order.class, 1L);\n' +
      '        System.out.println(order.getStatus());\n        System.out.println(order.getStatus() == OrderStatus.' + f.now + ');\n    }\n}\n';
    return s;
  },
  label: function (c) { return { ORDINAL: 'ORDINAL', STRING: 'STRING', code: 'AttributeConverter' }[c.store] + ' · ' + { same: '선언 그대로', append: '끝에 추가', insert: '중간에 끼움', swap: '순서 바꿈', rename: '이름 바꿈' }[c.change] + ' · ' + c.saved; },
  columns: ['DB의 status 값', '읽어 온 상수', '저장한 상수와 ==', '끝난 모습'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], store = c.store, ch = c.change;
    var st = { built: false, savedOn: false, changed: false, read: '', failed: false, out: [], err: '', eq: '?', end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    // DB 값 뒤의 조사: 숫자 0(영)·1(일)은 받침이 있고 2(이)와 따옴표 글자('PAID' 등)는 받침이 없다
    var bat = store === 'ORDINAL' && f.value !== '2';
    var order = function (cs) { return cs.map(function (r, i) { return r[0] + '(' + i + ')'; }).join(', '); };

    st.built = true;
    var DDLWHY = {
      ORDINAL: 'EnumType.ORDINAL은 상수의 선언 순서 번호를 저장하는 방식이라 숫자 컬럼이 됩니다. 0부터 2까지만 받는 조건(check)은 Hibernate가 H2용으로 붙인 것입니다.',
      STRING: 'EnumType.STRING은 상수의 이름을 저장하는 방식이라 글자를 받는 컬럼이 됩니다. Hibernate는 H2에서 세 이름만 받는 enum 타입 컬럼으로 만들었습니다.',
      code: '@Convert로 변환기를 지정했으므로, Hibernate는 enum이 아니라 변환기가 돌려주는 String을 저장한다고 보고 글자 컬럼을 만듭니다. 세 상수의 code 값(O, P, S)만 받는 조건(check)도 Hibernate가 H2용으로 붙였습니다.',
    }[store];
    push('처음 배포: enum 선언은 ORDERED, PAID, SHIPPED 순서입니다. Hibernate가 Order 엔티티를 보고 orders 테이블을 만들었고, status 컬럼은 "' + this.DDL[store] + '"입니다. ' + DDLWHY);

    st.savedOn = true;
    var HOW = {
      ORDINAL: 'Hibernate가 ' + c.saved + '.ordinal()의 값을 적은 것입니다. ordinal()은 모든 enum이 java.lang.Enum에서 물려받는 메서드로, 그 상수가 선언에서 몇 번째인지를 0부터 센 번호를 돌려줍니다.',
      STRING: 'Hibernate가 ' + c.saved + '.name()의 값을 적은 것입니다. name()은 모든 enum이 java.lang.Enum에서 물려받는 메서드로, 선언에 적은 상수의 이름을 문자열로 돌려줍니다.',
      code: 'Hibernate가 변환기의 convertToDatabaseColumn(' + c.saved + ')을 불러 받은 값입니다. 이 변환기는 enum에 직접 정해 둔 code 필드의 값을 돌려줍니다.',
    }[store];
    push('em.persist(new Order(1L, OrderStatus.' + c.saved + '))와 커밋: INSERT가 나가 status 컬럼에 ' + f.shown + (bat ? '이' : '가') + ' 저장됩니다. ' + HOW);

    st.changed = true;
    var CH = { append: '새 상수 CANCELED를 맨 끝에 추가했습니다', insert: '새 상수 CANCELED를 ORDERED와 PAID 사이에 끼워 넣었습니다', swap: '맨 앞의 두 상수 ORDERED와 PAID의 순서를 서로 바꿨습니다', rename: 'PAID의 이름을 PAYMENT_DONE으로 바꿨습니다' }[ch];
    if (ch === 'same') push('그 뒤에도 enum 선언은 고치지 않고 다시 배포했습니다: 순서 번호는 ' + order(f.cs) + ' 그대로입니다.');
    else push('그 뒤 enum 선언을 고쳐 다시 배포했습니다: ' + CH + '. 지금의 순서 번호는 ' + order(f.cs) + '입니다. 테이블은 다시 만들지 않았으므로 status 컬럼의 ' + f.shown + (bat ? '은' : '는') + ' 그대로 남아 있습니다.', ch === 'append' || ch === 'rename' ? '' : 'hot');

    var shifted = (ch === 'insert' || ch === 'swap'), find = 'em.find(Order.class, 1L) 실행: SELECT로 행을 읽고 status 컬럼의 ' + f.shown + (bat ? '을' : '를') + ' 상수로 바꿉니다. ';
    if (store === 'ORDINAL') {
      st.read = f.read[0];
      push(find + 'ORDINAL이므로 Hibernate는 지금 선언에서 ' + f.value + '번째 상수를 고릅니다. OrderStatus.values()[' + f.value + ']와 같은 결과입니다(values()는 모든 enum에 자동으로 만들어지는 메서드로, 상수를 지금 선언의 순서대로 늘어놓은 배열을 돌려줍니다). ' + f.value + '번 자리에 있는 것은 ' + f.read[0] + '입니다. ' + (f.eq ? (shifted ? '저장한 상수와 같습니다. 이 상수의 번호가 이번 변경에서 바뀌지 않았기 때문입니다.' : '저장한 상수와 같습니다.') : '저장한 것은 ' + c.saved + '인데 다른 상수가 나왔습니다. 예외도 경고도 없습니다.'), f.eq ? 'good' : 'bad');
    } else if (store === 'STRING') {
      if (f.read) { st.read = f.read[0]; push(find + 'STRING이므로 Hibernate는 이름이 정확히 "' + f.value + '"인 상수를 찾습니다. OrderStatus.valueOf("' + f.value + '")와 같은 결과입니다(valueOf도 모든 enum에 자동으로 만들어지는 메서드입니다). 번호가 아니라 이름으로 찾으므로 상수의 순서나 개수가 달라져도 영향이 없습니다.', 'good'); }
      else {
        st.failed = true; st.err = this.RENAME_ERR; st.end = '예외로 중단';
        push(find + 'STRING이므로 이름이 정확히 "' + f.value + '"인 상수를 찾는데, 지금 선언에는 그런 이름이 없습니다. em.find는 order를 돌려주지 못하고 ' + this.RENAME_ERR + '을 던집니다. OrderStatus.valueOf("' + f.value + '")가 없는 이름을 받았을 때와 같은 예외입니다. 잡는 곳이 없으면 그 요청은 여기서 실패합니다.', 'bad');
      }
    } else {
      st.read = f.read[0];
      push(find + 'Hibernate가 변환기의 convertToEntityAttribute("' + f.value + '")를 부르고, 변환기는 fromCode로 code가 "' + f.value + '"인 상수를 찾습니다. 찾은 상수는 ' + f.read[0] + '입니다. 순서나 이름을 고쳐도 code 값을 그대로 두면 영향이 없습니다.', 'good');
    }
    if (f.read) {
      st.out.push(f.read[0]);
      push('System.out.println(order.getStatus()) 실행: 출력은 "' + f.read[0] + '"입니다. enum의 toString()은 따로 고치지 않으면 name()과 같은 이름을 돌려줍니다.');
      st.eq = String(f.eq); st.out.push(String(f.eq)); st.end = '정상 종료';
      push('order.getStatus() == OrderStatus.' + f.now + ' 실행: ' + f.eq + '입니다. enum 상수는 상수마다 객체가 하나뿐이어서, Hibernate가 읽어 온 것이든 코드에 적은 것이든 같은 상수면 같은 객체입니다. 그래서 equals 없이 ==로 비교해도 됩니다.' + (f.eq ? '' : ' false가 나온 것은 비교 방법 때문이 아니라, 읽어 온 상수가 정말로 다른 상수(' + f.read[0] + ')이기 때문입니다.'), f.eq ? 'good' : 'bad');
    }
    var endText = f.read ? '정상 종료' : '예외로 중단: ' + this.RENAME_ERR;
    var row = [f.shown, f.read ? f.read[0] : '(읽지 못함)', f.read ? String(f.eq) : '(읽지 못함)', endText];
    if (store === 'ORDINAL' && !f.eq) sum.push('EnumType.ORDINAL은 선언 순서 번호를 저장할 뿐이어서, 상수를 중간에 끼워 넣거나 순서를 바꾸면 이미 저장된 숫자가 다른 상수를 가리키게 됩니다. 예외가 나지 않으므로 "' + f.old[2] + '" 주문이 "' + f.read[2] + '" 주문으로 보이는 잘못된 데이터가 조용히 쓰입니다. @Enumerated를 붙이지 않았을 때의 기본값도 ORDINAL이므로, enum 필드에는 @Enumerated(EnumType.STRING)을 적어 둡니다.');
    if (store === 'ORDINAL' && f.eq && shifted) sum.push('이 상수는 번호가 바뀌지 않아 무사했습니다. 같은 변경에서도 다른 상수로 저장된 주문은 틀어집니다.');
    if (store === 'ORDINAL' && ch === 'append') sum.push('맨 끝에 추가하면 기존 상수의 번호는 바뀌지 않습니다. 하지만 "언제나 끝에만 추가한다"는 약속을 enum을 고치는 사람 모두가 계속 지켜야 하므로, ORDINAL로 저장하는 방식 자체를 피합니다.');
    if (store === 'ORDINAL' && ch === 'rename') sum.push('이름을 바꾸는 것은 번호에 영향을 주지 않습니다. ORDINAL로 저장한 데이터는 순서를 건드릴 때 틀어집니다.');
    if (store === 'ORDINAL' && ch === 'same') sum.push('선언을 고치지 않는 동안에는 ORDINAL로 저장해도 문제가 드러나지 않습니다.');
    if (store === 'STRING' && f.read) sum.push('EnumType.STRING으로 저장하면 상수를 추가하거나 순서를 바꿔도 같은 상수가 읽힙니다.' + (ch === 'rename' ? ' 이번에 이름을 바꾼 것은 PAID뿐이라 ' + c.saved + '에는 영향이 없었습니다.' : ' 대신 상수의 이름을 바꾸면 이미 저장된 행을 읽지 못합니다.'));
    if (store === 'STRING' && !f.read) sum.push('STRING으로 저장했다면 상수의 이름을 바꾸는 일이 곧 저장된 행을 못 읽게 만드는 일입니다. 이름을 꼭 바꿔야 하면 DB의 값도 함께 고치는 UPDATE 문을 배포에 넣습니다. 그래도 조용히 다른 상수가 나오는 ORDINAL보다는 예외로 바로 드러나는 쪽이 낫습니다.');
    if (store === 'code') sum.push('AttributeConverter는 JPA가 주는 인터페이스로, 필드 값과 DB 값을 서로 바꾸는 두 메서드를 직접 채워 쓰게 합니다. 저장할 값을 enum의 code 필드로 따로 정해 두면 상수의 순서도 이름도 고칠 수 있습니다. 대신 한번 정한 code 값은 바꾸지 않습니다. code 필드와 fromCode 메서드는 이 실습에서 예시로 만든 것이고, enum이 필드와 메서드를 가질 수 있어서 가능한 방법입니다.');
    if (f.read) sum.push('enum 상수의 비교에는 ==를 씁니다. 상수마다 객체가 하나뿐이라 결과가 equals와 같고, 한쪽이 null이어도 예외가 나지 않습니다.');
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, f = this.facts(c), code = c.store === 'code';
    if (!s) { H.text(v, '실행을 누르면 처음 배포해 저장할 때부터 다시 배포해 읽어 올 때까지를 한 단계씩 보여 줍니다.'); return; }
    var cs = s.changed ? f.cs : this.OLD;
    H.table(v, ['ordinal()', 'name()'].concat(code ? ['code'] : []), cs.map(function (r, i) {
      var hit = s.read === r[0] && s.changed;
      return { cells: [String(i), { v: r[0], cls: hit ? (f.eq ? 'good' : 'bad') : '' }].concat(code ? [r[1]] : []) };
    }), s.changed ? '지금의 enum 선언' : '예전의 enum 선언');
    H.table(v, ['id', 'status'], s.savedOn ? [{ cells: ['1', f.shown] }] : [], 'orders 테이블 (' + this.DDL[c.store] + ')');
    var ln = H.lanes(v);
    H.lane(ln, '읽을 때 Hibernate가 하는 일', { ORDINAL: 'OrderStatus.values()[' + f.value + ']와 같은 결과', STRING: 'OrderStatus.valueOf("' + f.value + '")와 같은 결과', code: 'converter.convertToEntityAttribute("' + f.value + '")' }[c.store], 'none');
    H.title(v, '콘솔 출력');
    var lines = s.out.slice(); if (s.err) lines.push(s.err + '  (em.find가 던진 예외)');
    v.appendChild(H.el('pre', 'code', lines.length ? lines.join('\n') : '(아직 없음)'));
    H.counters(v, [[s.end, '읽기']]);
  },
  // 그림: 위에 예전 선언의 상수들, 아래에 지금 선언의 상수들을 순서대로 놓고, 가운데에 DB의 status 값을 둔다. 저장한 상수에서 값으로, 값에서 읽어 온 상수로 화살표를 긋는다.
  draw: function (P, sim, shown) {
    var c = sim.c, f = this.facts(c), last = shown[shown.length - 1], s = last ? last.snap : { built: false, savedOn: false, changed: false, read: '', failed: false, out: [], err: '', eq: '?', end: '?' };
    var attr = function (r, i) { return c.store === 'ORDINAL' ? 'ordinal ' + i : c.store === 'STRING' ? '이름 ' + r[0] : 'code ' + r[1]; };
    P.size(680, 334);
    P.region('old', 16, 16, 648, 98, '예전 선언 (저장할 때)');
    this.OLD.forEach(function (r, i) { P.box('o_' + r[0], 30 + i * 156, 46, 152, 56, { cls: s.savedOn && r[0] === c.saved ? 'hot' : 'plain', title: r[0], sub: [attr(r, i), r[2]] }); });
    P.box('saved', 194, 126, 292, 34, { cls: s.savedOn ? (s.failed ? 'bad' : 'hot') : 'ghost', title: 'orders.status 컬럼', right: s.savedOn ? f.shown : '아직 없음' });
    P.region('new', 16, 172, 648, 98, s.changed ? '지금 선언 (다시 배포한 뒤 읽을 때)' : '지금 선언 (아직 고치기 전)');
    f.cs.forEach(function (r, i) {
      var hit = s.read === r[0];
      P.box('n_' + r[0], 30 + i * 156, 202, 152, 56, { cls: !s.changed ? 'ghost' : hit ? (f.eq ? 'good now' : 'bad now') : r[0] === 'CANCELED' || r[0] === 'PAYMENT_DONE' ? 'wait' : 'plain', title: r[0], sub: [attr(r, i), r[2]] });
    });
    if (s.savedOn) P.arrow('a_save', 'o_' + c.saved + ':b', 'saved:t', { cls: 'hot', label: 'persist' });
    if (s.read) P.arrow('a_read', 'saved:b', 'n_' + s.read + ':t', { cls: f.eq ? 'good' : 'bad', label: 'find' });
    P.box('r1', 16, 284, 320, 34, { cls: s.failed ? 'bad' : s.read ? (f.eq ? 'good' : 'bad') : 'ghost', title: '읽어 온 상수', right: s.failed ? '예외 발생' : s.read || '?' });
    P.box('r2', 344, 284, 320, 34, { cls: s.eq === 'true' ? 'good' : s.eq === 'false' ? 'bad' : s.failed ? 'bad' : 'ghost', title: '저장한 상수와 ==', right: s.failed ? '비교하지 못함' : s.eq });
    P.note('상자 하나가 enum 상수 하나(객체 하나)입니다. ORDINAL은 위에서 아래로 같은 자리를 따라 내려오는 방식이고, STRING이나 AttributeConverter는 이름이나 code로 찾으므로 그 상수가 어느 자리로 옮겨 갔든 따라갑니다.');
  },
  assume: '마흔다섯 가지 조합 모두를 실제 Hibernate 7.4.5와 H2 데이터베이스(2.4.240)에서 실행해 대조했습니다. 조합마다 화면의 코드를 그대로 컴파일해서, 예전 선언(ORDERED, PAID, SHIPPED)의 Order로 테이블을 만들고 주문 한 건을 persist한 뒤, 테이블은 그대로 두고 지금 선언의 클래스로 화면의 OrderReader.print를 실행했습니다. 대조한 것은 Hibernate가 만든 status 컬럼 정의, DB에 저장된 값(JDBC로 직접 읽음), 콘솔 출력 두 줄, 예외의 종류와 메시지입니다. 예외 메시지에 붙는 패키지 이름은 화면의 코드에 없으므로 빼고 적었습니다. Hibernate가 읽은 상수가 values()[번호], valueOf(이름)를 직접 부른 결과와 같다는 것도 조합마다 확인했습니다. 다음 사실도 같은 방법으로 실행해 확인했습니다: @Enumerated를 붙이지 않은 enum 필드는 ORDINAL과 똑같은 컬럼이 되고 숫자가 저장된다는 것, ORDINAL로 저장한 뒤 그 상수를 지워 번호가 범위를 벗어나면 em.find가 ArrayIndexOutOfBoundsException을 던진다는 것, 변환기가 모르는 코드를 받으면 PersistenceException(원인은 fromCode가 던진 IllegalArgumentException)이 난다는 것, 같은 상수는 어떻게 얻어도 같은 객체라는 것. 컬럼 정의는 DB 종류(방언)와 Hibernate 버전에 따라 다르며, 여기 적힌 tinyint와 check 조건, enum 타입 컬럼은 Hibernate 7.4.5가 H2용으로 만든 것입니다. 이 조건 때문에 Hibernate가 만든 테이블을 그대로 쓰면, CANCELED를 끼워 넣은 뒤 ORDINAL로 SHIPPED(이제 번호 3)를 저장하거나 STRING으로 CANCELED를 저장하는 일도 실패합니다(이것도 실행해 확인). 이 실습은 이미 저장된 행을 읽는 일만 다룹니다. 실제 서비스에서는 테이블을 Flyway 같은 도구로 따로 만드는 경우가 많아 이런 조건이 없을 수 있지만, 다시 배포할 때 저장된 값이 그대로라는 점은 같습니다. 스프링 부트 없이 Hibernate만으로 실행했으며, 스프링 데이터 JPA를 써도 저장과 읽기는 같은 Hibernate가 합니다.',
});
