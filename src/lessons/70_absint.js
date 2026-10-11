Lab.register({
  id: 'absint', nav: '인터페이스와 추상 클래스', cat: '자바 언어', mode: 'step',
  title: '둘 다 new로 못 만드는데 무엇이 다른가',
  intro: '인터페이스와 추상 클래스는 둘 다 "이런 메서드가 있어야 한다"는 약속을 정하고, 실제 내용은 구현하는 클래스에 맡깁니다. 하지만 여러 개를 동시에 물려받을 수 있는지, 상태(필드)를 가질 수 있는지가 다릅니다.',
  terms: ['인터페이스', '추상 클래스', 'default 메서드', '추상화', '상속', '다형성'], ranks: ['absint', 'oop'],
  controls: [
    { id: 'kind', label: '종류', type: 'select', value: 'iface', options: [['iface', '인터페이스 (interface Payable)'], ['abs', '추상 클래스 (abstract class Payment)']] },
    { id: 'what', label: '해 보는 일', type: 'select', value: 'multi', options: [['new', '직접 new로 객체 만들기'], ['impl', '구현(상속)한 클래스를 만들어 쓰기'], ['missing', '추상 메서드를 구현하지 않고 두기'], ['multi', '두 개를 동시에 물려받기'], ['state', '필드(상태)와 생성자 두기'], ['default', '본문이 있는 메서드 물려받기']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '인터페이스는 여러 개를 동시에 구현할 수 있습니다.', v: { kind: 'iface', what: 'multi' } },
    { t: '추상 클래스 두 개를 상속하면', d: '클래스는 하나만 상속할 수 있어 컴파일되지 않습니다.', v: { kind: 'abs', what: 'multi' } },
    { t: '인터페이스에 필드와 생성자', d: '인터페이스는 객체의 상태를 가질 수 없습니다.', v: { kind: 'iface', what: 'state' } },
    { t: '추상 클래스에 필드와 생성자', d: '공통 상태와 초기화 코드를 물려줄 수 있습니다.', v: { kind: 'abs', what: 'state' } },
    { t: '직접 new 하기', d: '둘 다 그 자체로는 객체를 만들 수 없습니다.', v: { kind: 'iface', what: 'new' } },
    { t: '추상 메서드를 구현하지 않으면', d: '약속한 메서드가 빠지면 컴파일러가 막습니다.', v: { kind: 'iface', what: 'missing' } },
  ],
  SRC: {
    iface: 'interface Payable {\n    void pay();                              // 추상 메서드: 본문 없음\n    default String name() { return "기본 이름"; }\n}',
    abs: 'abstract class Payment {\n    protected int amount = 100;              // 필드(상태)\n    Payment() { }                            // 생성자\n    abstract void pay();                     // 추상 메서드: 본문 없음\n    String name() { return "기본 이름"; }\n}',
  },
  code: function (c) {
    var I = c.kind === 'iface', T = I ? 'Payable' : 'Payment', ext = I ? 'implements Payable' : 'extends Payment', pub = I ? 'public ' : '';
    var use = {
      new: T + ' p = new ' + T + '();',
      impl: 'class Card ' + ext + ' {\n    ' + pub + 'void pay() { System.out.println("Card.pay"); }\n}\n\n' + T + ' p = new Card();     // 타입은 ' + T + ', 실제 객체는 Card\np.pay();',
      missing: 'class Card ' + ext + ' {\n    // pay()를 구현하지 않음\n}',
      multi: I ? 'interface Refundable { void refund(); }\n\nclass Card implements Payable, Refundable {\n    public void pay() { }\n    public void refund() { }\n}' : 'abstract class Logger { abstract void log(); }\n\nclass Card extends Payment, Logger {     // 두 클래스를 상속\n    void pay() { }\n    void log() { }\n}',
      state: I ? '// 인터페이스 안에 필드와 생성자를 넣어 본다\ninterface Payable {\n    int amount;                              // 값이 없는 필드\n    Payable() { }                            // 생성자\n    void pay();\n}' : 'class Card extends Payment {\n    void pay() {\n        amount += 50;                        // 물려받은 필드를 사용\n        System.out.println("amount=" + amount);\n    }\n}\n\nnew Card().pay();',
      default: 'class Card ' + ext + ' {\n    ' + pub + 'void pay() { }\n    // name()은 구현하지 않음\n}\n\nSystem.out.println(new Card().name());',
    }[c.what];
    return (c.what === 'state' && I ? '' : this.SRC[c.kind] + '\n\n') + use;
  },
  label: function (c) { return (c.kind === 'iface' ? '인터페이스' : '추상 클래스') + ' · ' + { new: '직접 new', impl: '구현해서 사용', missing: '추상 메서드 미구현', multi: '두 개 동시에', state: '필드와 생성자', default: '본문 있는 메서드' }[c.what]; },
  columns: ['컴파일', '실행 결과 또는 오류', '인터페이스라면', '추상 클래스라면'],
  // 실제 컴파일·실행 결과와 대조하는 데 쓰는 순수 계산
  ok: function (kind, what) { if (what === 'new' || what === 'missing') return false; if (what === 'multi') return kind === 'iface'; if (what === 'state') return kind === 'abs'; return true; },
  simulate: function (c) {
    var I = c.kind === 'iface', T = I ? 'Payable' : 'Payment', ok = this.ok(c.kind, c.what), ev = [], sum = [], out;
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage, out: out || '' } }); }
    push(I ? 'Payable은 인터페이스입니다. "pay()라는 메서드가 있어야 한다"는 약속만 정해 두고, 어떻게 결제할지는 구현하는 클래스가 정합니다.' : 'Payment는 추상 클래스입니다. 추상 메서드 pay()는 내용이 비어 있고, 필드와 생성자와 일반 메서드는 보통 클래스처럼 가지고 있습니다.', '', 1);
    var W = c.what;
    if (W === 'new') { out = '컴파일 오류: ' + T + ' is abstract; cannot be instantiated'; push('new ' + T + '()로 객체를 직접 만들려 합니다. ' + T + '에는 내용이 없는 메서드가 있으므로, 이대로 객체가 만들어지면 pay()를 불렀을 때 실행할 코드가 없습니다. 컴파일러가 막습니다.', 'bad', 2); sum.push('인터페이스와 추상 클래스는 그 자체로 객체를 만들 수 없습니다. 반드시 빠진 부분을 채운 클래스를 통해서만 객체가 됩니다.'); }
    if (W === 'impl') { push('Card 클래스가 ' + T + (I ? '을 구현(implements)합니다' : '를 상속(extends)합니다') + '. 비어 있던 pay()의 내용을 채웁니다.', '', 2); out = 'Card.pay' + (I ? '' : ' (물려받은 amount = 100 사용 가능)'); push(T + ' 타입 변수에 Card 객체를 담아 pay()를 호출합니다. 변수의 타입은 ' + T + '이지만 실행되는 것은 Card의 pay()입니다. 호출하는 쪽은 구체적인 클래스를 몰라도 됩니다.', 'good', 3); sum.push('약속(타입)과 구현(클래스)을 나누면, 쓰는 쪽 코드를 고치지 않고 구현을 바꿔 끼울 수 있습니다. 스프링의 의존성 주입과 전략 패턴이 모두 이 구조에 기대고 있습니다.'); }
    if (W === 'missing') { out = '컴파일 오류: Card is not abstract and does not override abstract method pay() in ' + T; push('Card가 ' + T + (I ? '을 구현' : '를 상속') + '한다고 해 놓고 pay()를 채우지 않았습니다. 약속한 메서드가 빠졌으므로 컴파일러가 막습니다.', 'bad', 2); sum.push('추상 메서드는 "구현하는 쪽이 반드시 채워야 하는 빈칸"입니다. 채우지 않으려면 그 클래스도 abstract여야 하고, 그러면 그 클래스 역시 객체를 만들 수 없습니다.'); }
    if (W === 'multi') {
      if (I) { push('Card가 Payable과 Refundable 두 인터페이스를 동시에 구현합니다. 인터페이스는 약속만 있고 상태가 없으므로, 여러 개를 겹쳐도 충돌할 것이 없습니다.', '', 2); out = '컴파일 성공. Card는 Payable이기도 하고 Refundable이기도 함'; push('컴파일됩니다. Card 객체는 Payable 타입 변수에도, Refundable 타입 변수에도 담을 수 있습니다.', 'good', 3); }
      else { out = "컴파일 오류: '{' expected (extends 뒤에는 클래스 하나만 올 수 있음)"; push('Card가 Payment와 Logger 두 추상 클래스를 동시에 상속하려 합니다. 자바는 클래스를 하나만 상속할 수 있습니다. 두 부모가 같은 이름의 필드나 메서드 구현을 가지고 있으면 어느 것을 물려받을지 정할 수 없기 때문입니다.', 'bad', 2); }
      sum.push('클래스는 하나만 상속(extends)할 수 있고, 인터페이스는 여러 개를 구현(implements)할 수 있습니다. "~을 할 수 있다"는 능력을 여러 개 붙이려면 인터페이스를 씁니다.');
    }
    if (W === 'state') {
      if (I) { out = '컴파일 오류: = expected (인터페이스의 필드는 값이 정해진 상수여야 함)'; push('인터페이스 안에 값이 없는 필드와 생성자를 넣었습니다. 인터페이스의 필드는 자동으로 public static final, 즉 모든 곳에서 같은 값인 상수가 됩니다. 객체마다 다른 값을 담는 필드나 그것을 초기화하는 생성자는 둘 수 없습니다.', 'bad', 2); }
      else { push('추상 클래스 Payment에는 amount 필드와 생성자가 있습니다. Card는 amount 필드를 물려받고, Card 객체를 만들 때 Payment의 생성자도 실행됩니다(생성자 자체는 상속되지 않습니다).', '', 2); out = 'amount=150'; push('Card의 pay()가 물려받은 amount(100)에 50을 더해 출력합니다. 공통으로 쓰는 상태와 초기화 코드를 부모에 한 번만 두고 자식들이 나눠 씁니다.', 'good', 3); }
      sum.push('추상 클래스는 상태(필드)와 생성자를 가질 수 있고, 인터페이스는 상수만 가질 수 있습니다. 여러 구현이 같은 필드와 같은 코드를 공유해야 하면 추상 클래스가 맞습니다.');
    }
    if (W === 'default') { push('Card는 pay()만 채우고 name()은 구현하지 않았습니다. ' + (I ? 'Payable의 name()은 default 메서드라서 본문이 있습니다.' : 'Payment의 name()은 본문이 있는 일반 메서드입니다.'), '', 2); out = '기본 이름'; push('new Card().name()을 호출하면 ' + T + '에 적혀 있는 내용이 실행됩니다. ' + (I ? '자바 8부터 인터페이스도 default 메서드로 기본 구현을 줄 수 있게 됐습니다. 이미 여러 클래스가 구현한 인터페이스에 메서드를 추가해도 기존 클래스들이 깨지지 않게 하려고 생긴 기능입니다.' : '추상 클래스는 원래부터 일반 메서드를 가질 수 있습니다.'), 'good', 3); sum.push('둘 다 본문이 있는 메서드를 물려줄 수 있습니다. 차이는 그 메서드가 객체의 필드를 쓸 수 있느냐입니다. 인터페이스의 default 메서드는 상태가 없으므로 다른 메서드를 호출하는 식으로만 작성할 수 있습니다.'); }
    sum.push('고르는 기준: 서로 다른 종류의 클래스들에게 "이 기능을 제공한다"는 약속을 붙이려면 인터페이스, 가까운 종류의 클래스들이 필드와 코드를 공유해야 하면 추상 클래스입니다. 실무에서는 인터페이스를 기본으로 쓰는 경우가 많습니다.');
    var a = this.ok('iface', W), b = this.ok('abs', W);
    return { events: ev, summary: sum, row: [ok ? '성공' : '오류', out, a ? '가능' : '불가', b ? '가능' : '불가'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, out: '' }, W = sim.c.what, me = this;
    H.table(v, ['해 보는 일', '인터페이스', '추상 클래스'], [['new', '직접 new로 객체 만들기'], ['impl', '구현(상속)한 클래스로 사용'], ['missing', '추상 메서드를 구현하지 않기'], ['multi', '두 개를 동시에 물려받기'], ['state', '필드(상태)와 생성자 두기'], ['default', '본문이 있는 메서드 물려받기']].map(function (r) {
      var on = r[0] === W, cell = function (kind) { var o = me.ok(kind, r[0]), mine = on && sim.c.kind === kind; return { v: (o ? '가능' : '컴파일 오류') + (mine ? ' ← 지금' : ''), cls: mine ? (o ? 'good' : 'bad') : '' }; };
      return { cells: [{ v: r[1], cls: on ? 'hot' : '' }, cell('iface'), cell('abs')] };
    }), '여섯 가지를 양쪽에서 해 본 결과');
    H.title(v, '컴파일러와 실행 결과'); v.appendChild(H.el('pre', 'code', s.out || '(진행 중)'));
  },
  assume: '열두 가지 조합 모두, 화면의 코드와 같은 구조의 소스를 이 PC의 JDK 21에서 실제로 컴파일하고 실행한 결과와 대조했습니다(성공 여부와 오류 메시지). 인터페이스의 private 메서드와 static 메서드, sealed 타입 같은 이후 버전의 기능은 다루지 않았습니다.',
});
