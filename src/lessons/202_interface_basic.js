Lab.register({
  id: 'interface_basic', nav: '인터페이스', cat: '기초개념', mode: 'step', basic: true, deep: ['absint'],
  title: '인터페이스는 코드에서 어떻게 생겼고 무엇을 정하는가',
  why: '어떤 기능을 쓰는 코드가 특정 클래스 이름에 묶여 있으면, 그 기능을 다른 방식으로 바꿀 때마다 쓰는 쪽 코드도 함께 고쳐야 한다. 인터페이스는 "이런 메서드가 있다"는 것만 타입으로 정해 두어서, 쓰는 쪽은 그 타입만 보고 메서드를 부르고 실제로 어느 클래스의 객체가 오든 같은 코드로 다룰 수 있게 한다.',
  use: '자바의 List와 Map이 인터페이스여서, List<String> names = new ArrayList<>();처럼 변수는 인터페이스 타입으로 적고 실제 객체는 ArrayList나 LinkedList 가운데 골라 만든다. 스프링 데이터 JPA에서는 JpaRepository를 이어받은 인터페이스만 선언하면 스프링이 그 구현 객체를 만들어 주고, 한 기능을 여러 방식으로 만들어 두고 골라 쓸 때도 인터페이스를 쓴다.',
  intro: '인터페이스는 interface로 선언하는 약속입니다. 이 실습은 예시로 지은 이름 Payable(인터페이스), Card(클래스), pay(메서드)를 씁니다. "Payable 타입이라면 pay 메서드를 갖춰야 한다"처럼 메서드의 이름만 적고 본문은 적지 않습니다. 클래스는 implements Payable로 그 약속을 지키겠다고 선언하고, 약속한 pay 메서드를 실제로 작성합니다. 그러면 Payable 타입 변수가 그 클래스의 객체를 가리킬 수 있습니다. 이 실습은 interface 선언, implements, pay 메서드를 하나씩 지워 가며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주고 무엇이 출력되는지를 봅니다.',
  terms: ['인터페이스', 'implements', '추상 메서드', '타입'],
  controls: [
    { id: 'decl', label: 'interface Payable 선언이 있다', type: 'check', value: true },
    { id: 'impl', label: 'Card 클래스에 implements Payable을 쓴다', type: 'check', value: true },
    { id: 'method', label: 'Card 클래스의 pay 메서드', type: 'select', value: 'body', options: [['body', 'pay 메서드를 작성한다 (본문 있음)'], ['empty', 'pay 메서드의 본문을 비워 둔다 { }'], ['none', 'pay 메서드를 작성하지 않는다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '인터페이스는 어떻게 생겼고, 무엇을 해 주나', d: '세 가지가 다 있습니다. 컴파일에 성공하고 카드로 결제가 출력됩니다.', v: { decl: true, impl: true, method: 'body' } },
    { t: 'implements를 지우면', q: 'Card에서 implements Payable을 지우면', d: 'pay 메서드가 있어도 Card는 Payable 타입이 아니어서 컴파일 오류가 납니다.', v: { decl: true, impl: false, method: 'body' } },
    { t: 'pay 메서드를 지우면', q: 'Card에서 pay 메서드를 지우면', d: '약속한 메서드를 작성하지 않아 컴파일 오류가 납니다.', v: { decl: true, impl: true, method: 'none' } },
    { t: 'pay 메서드의 본문을 비우면', q: 'pay 메서드의 본문을 비워 두면', d: '본문이 비어 있어도 작성한 것입니다. 컴파일에 성공하고 아무것도 출력되지 않습니다.', v: { decl: true, impl: true, method: 'empty' } },
    { t: 'interface 선언을 지우면', q: 'interface Payable 선언을 지우면', d: 'Payable이라는 타입이 없어 컴파일 오류가 납니다.', v: { decl: false, impl: true, method: 'body' } },
  ],
  // 컴파일러가 알려 주는 오류의 종류(실제 javac의 진단 코드를 옮긴 것)
  errType: 'Payable이라는 타입을 찾을 수 없음',
  errFit: 'Card는 Payable 타입이 아니어서 Payable 변수가 가리킬 수 없음',
  errMiss: 'Card가 pay 메서드를 작성하지 않았음',
  code: function (c) {
    var o = [];
    if (c.decl) o.push('// 약속: Payable이라면 pay 메서드를 갖춰야 한다 (이름만 적는다)', 'interface Payable {', '    void pay();', '}', '');
    if (c.impl) o.push('// 약속을 지키겠다는 선언');
    o.push('class Card' + (c.impl ? ' implements Payable' : '') + ' {');
    if (c.method === 'body') o.push('    // 약속한 메서드를 실제로 작성한 것', '    public void pay() {', '        System.out.println("카드로 결제");', '    }');
    else if (c.method === 'empty') o.push('    // 약속한 메서드를 실제로 작성한 것', '    public void pay() { }');
    o.push('}', '', 'public class Main {', '    public static void main(String[] args) {', '        // Payable 타입 변수 p가 Card 객체를 가리키게 한다', '        Payable p = new Card();', '        p.pay();', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.decl ? 'Payable 선언 있음' : 'Payable 선언 없음') + ' · ' + (c.impl ? 'implements 있음' : 'implements 없음') + ' · ' + { body: 'pay 본문 있음', empty: 'pay 본문 비어 있음', none: 'pay 없음' }[c.method]; },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력'],
  simulate: function (c) {
    var ev = [], sum = [], IMPL_LINE = 'class Card implements Payable {', FIT_LINE = 'Payable p = new Card();';
    var ok = c.decl && c.impl && c.method !== 'none';
    var first = ok ? '' : !c.decl ? this.errType : !c.impl ? this.errFit : this.errMiss;
    var nerr = ok ? 0 : !c.decl && c.impl ? 2 : 1;
    var errAt = ok ? [] : !c.decl ? (c.impl ? [IMPL_LINE, FIT_LINE] : [FIT_LINE]) : !c.impl ? [FIT_LINE] : [IMPL_LINE];
    var st = { hot: '', bad: {}, fit: '', obj: false, compile: '', errs: 0, errText: '', ran: false, out: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errType = this.errType, errFit = this.errFit, errMiss = this.errMiss;
    var pay = { body: 'public void pay() { ... }', empty: 'public void pay() { }', none: '' }[c.method];

    // 1. interface Payable 선언을 읽는다
    st.hot = 'pa';
    if (c.decl) {
      st.checks.push(['Payable 타입', { v: '알게 됨', cls: 'good' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. 먼저 interface Payable 선언을 읽고, 이 선언으로 Payable이라는 타입을 알게 됩니다. Payable 타입은 이 선언에서 만들어집니다. void pay(); 줄은 이름만 있고 본문이 없는데, 인터페이스에서 이 모양은 "Payable 타입이라면 pay 메서드를 갖춰야 한다"는 약속입니다(추상 메서드).', '');
    } else {
      st.checks.push(['Payable 타입', { v: '선언이 없음', cls: 'bad' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. interface Payable 선언이 코드 어디에도 없으므로, Payable이라는 타입은 아직 알려지지 않았습니다. 타입은 선언에서 만들어지므로, 이름을 코드에 쓴다고 생기지 않습니다.', '');
    }

    // 2. class Card 줄을 읽는다
    st.hot = 'cd';
    if (c.impl) {
      if (c.decl) {
        st.checks.push(['Card가 implements Payable', { v: '예', cls: 'good' }]);
        push('컴파일러가 class Card implements Payable 줄을 읽습니다. Card가 Payable의 약속을 지키겠다는 선언입니다. 그러므로 Card 안에 약속한 pay 메서드가 작성돼 있어야 합니다.', '');
      } else {
        st.bad.impl = true; fail(errType);
        st.checks.push(['Card가 implements Payable', { v: '오류: Payable 타입을 찾을 수 없음', cls: 'bad' }]);
        push('컴파일러가 class Card implements Payable 줄을 읽습니다. 그런데 Payable이라는 타입을 알지 못해 이 줄에서 오류가 납니다(javac: cannot find symbol). 지키겠다고 밝힌 약속이 어디에도 선언되어 있지 않기 때문입니다.', 'bad');
      }
    } else {
      st.checks.push(['Card가 implements Payable', { v: '아니요', cls: '' }]);
      push('컴파일러가 class Card 줄을 읽습니다. implements가 없으므로 Card는 Payable과 관계없는 클래스입니다. 이 줄에는 확인할 약속이 없어 오류가 나지 않습니다.' + (c.decl && c.method !== 'none' ? ' Card에 pay 메서드가 있어도, 이름이 같다고 컴파일러가 그것을 Payable의 약속과 이어 주지는 않습니다.' : ''), '');
    }

    // 3. 약속한 메서드가 있는지 확인한다 (약속이 있을 때만)
    if (c.decl && c.impl) {
      if (c.method === 'body') {
        st.checks.push(['Card의 pay 메서드', { v: '있음 (본문 있음)', cls: 'good' }]);
        push('컴파일러가 Card 안에서 약속한 pay 메서드를 찾습니다. ' + pay + ' 줄이 있고 본문도 있으므로, 약속을 지킨 것입니다.', 'good');
      } else if (c.method === 'empty') {
        st.checks.push(['Card의 pay 메서드', { v: '있음 (본문 비어 있음)', cls: 'good' }]);
        push('컴파일러가 Card 안에서 약속한 pay 메서드를 찾습니다. ' + pay + ' 줄이 있습니다. 본문이 비어 있어도 메서드를 작성한 것으로 칩니다. 약속은 "pay라는 메서드가 있어야 한다"까지이고, 그 안에서 무엇을 하는지는 약속에 없기 때문입니다. 약속을 지킨 것입니다.', 'good');
      } else {
        st.bad.cd = true; fail(errMiss);
        st.checks.push(['Card의 pay 메서드', { v: '없음: 오류', cls: 'bad' }]);
        push('컴파일러가 Card 안에서 약속한 pay 메서드를 찾습니다. Card에는 pay 메서드가 없습니다. implements Payable로 약속해 놓고 지키지 않았으므로 오류가 납니다(javac: Card is not abstract and does not override abstract method pay() in Payable).', 'bad');
      }
    }

    // 4. Payable p = new Card(); 줄을 확인한다
    st.hot = 'pv';
    if (ok) {
      st.fit = 'ok';
      st.checks.push(['Payable 변수가 Card 객체를 가리키게 하기', { v: '가리킬 수 있음', cls: 'good' }]);
      push('컴파일러가 Payable p = new Card(); 줄을 확인합니다. Card는 implements Payable로 약속했으므로 Payable 타입 변수 p가 Card의 객체를 가리켜도 됩니다. 이것은 실행이 아니라, 컴파일러가 그래도 되는지 미리 확인하는 일입니다.', 'good');
    } else if (c.decl && c.impl) {
      st.fit = 'ok';
      st.checks.push(['Payable 변수가 Card 객체를 가리키게 하기', { v: '오류 아님', cls: '' }]);
      push('컴파일러가 Payable p = new Card(); 줄을 확인합니다. Card가 implements Payable을 썼으므로 이 줄 자체는 오류가 아닙니다(javac가 알린 오류는 위의 1개뿐입니다). 하지만 앞의 오류 때문에 컴파일은 실패합니다.', '');
    } else if (c.decl) {
      st.fit = 'bad'; st.bad.pv = true; fail(errFit);
      st.checks.push(['Payable 변수가 Card 객체를 가리키게 하기', { v: '가리킬 수 없음: 오류', cls: 'bad' }]);
      push('컴파일러가 Payable p = new Card(); 줄을 확인합니다. Card에 implements Payable이 없어 Payable 타입이 아니므로, Payable 타입 변수 p가 Card의 객체를 가리킬 수 없습니다(javac: incompatible types: Card cannot be converted to Payable).' + (c.method !== 'none' ? ' Card에 pay 메서드가 똑같이 있어도 마찬가지입니다. 메서드가 있다고 그 타입이 되는 것은 아닙니다.' : ' pay 메서드가 없다는 오류는 따로 나지 않습니다. implements가 없으면 지킬 약속이 없기 때문입니다.'), 'bad');
    } else {
      st.bad.pv = true; fail(errType);
      st.checks.push(['Payable 변수가 Card 객체를 가리키게 하기', { v: '오류: Payable 타입을 찾을 수 없음', cls: 'bad' }]);
      push('컴파일러가 Payable p = new Card(); 줄을 확인합니다. 변수 p의 타입으로 적은 Payable을 찾을 수 없어 ' + (c.impl ? '같은 오류가 한 번 더 납니다. javac가 알린 오류는 모두 2개입니다.' : '오류가 납니다(javac: cannot find symbol). Card 클래스에는 문제가 없어도, 선언이 없는 이름은 타입으로 쓸 수 없습니다.'), 'bad');
    }

    // 5. 컴파일 결과
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다. 약속을 지켰는지는 실행할 때가 아니라, 지금 컴파일러가 컴파일하면서 확인했습니다.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + nerr + '개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 ' + nerr + '개이고, 첫 번째 오류는 "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없습니다.', 'bad');
    }

    // 6~7. 실행
    var out = '';
    if (ok) {
      st.hot = 'ob'; st.obj = true;
      push('java Main으로 실행합니다. main이 시작되고, new Card()가 Card 객체를 만들고, Payable 타입 변수 p가 그 객체를 가리킵니다.', '');
      st.hot = 'ob'; st.ran = true; out = c.method === 'body' ? '카드로 결제' : '';
      st.out = out;
      st.checks.push(['실행했을 때 출력', { v: out || '(아무것도 출력되지 않음)', cls: 'good' }]);
      push('p.pay()가 실행됩니다. p가 가리키는 객체는 Card의 객체이므로 Card에 작성한 pay 메서드가 실행됩니다.' + (c.method === 'body' ? ' 본문의 println이 "카드로 결제"를 출력합니다.' : ' 본문이 비어 있어 아무것도 출력하지 않고 끝납니다. 오류는 없습니다.'), 'good');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (ok && c.method === 'body') {
      sum.push('인터페이스는 interface로 선언하는, "이 타입이라면 이 메서드를 갖춰야 한다"는 약속입니다. 메서드의 이름만 적고 본문은 적지 않습니다. interface Payable 선언이 Payable이라는 타입을 만들고, Card는 implements Payable로 그 약속을 지키겠다고 선언한 뒤 pay 메서드를 실제로 작성합니다.');
      sum.push('그래서 Payable 타입 변수 p가 Card의 객체를 가리킬 수 있었고, p.pay()가 Card의 pay를 실행했습니다. 약속을 지켰는지는 실행할 때가 아니라 컴파일러가 컴파일할 때 확인했습니다.');
    } else if (ok) {
      sum.push('본문이 비어 있어도 pay 메서드를 작성한 것이므로 약속을 지킨 것입니다. 컴파일에 성공했고, 실행해도 아무것도 출력되지 않았습니다.');
      sum.push('약속은 "이런 이름의 메서드가 있어야 한다"까지이고, 안에서 무엇을 하는지는 약속에 없습니다. 컴파일러는 pay 메서드가 있는지를 확인했고, 비어 있다는 이유로 오류를 내지 않았습니다.');
    } else if (!c.decl) {
      sum.push('interface Payable 선언이 없으면 Payable이라는 타입이 없습니다. 컴파일러가 Payable이라는 타입을 찾을 수 없다고 알려 주었고, 컴파일에 실패해 실행할 수 없었습니다.');
      sum.push('Payable 타입은 interface 선언에서 만들어집니다. 오류가 난 곳은 ' + (c.impl ? 'implements Payable 줄과 Payable p 줄, 두 군데였습니다.' : 'Payable p 줄 한 군데였습니다. Card 클래스에는 문제가 없었습니다.'));
    } else if (!c.impl) {
      sum.push('implements Payable을 지우면 Card는 Payable 타입이 아니어서, Payable 타입 변수가 Card의 객체를 가리킬 수 없습니다. 컴파일에 실패해 실행할 수 없었습니다.' + (c.method !== 'none' ? ' pay 메서드가 똑같이 있어도 마찬가지였습니다.' : ''));
      sum.push('메서드를 갖췄다고 그 타입이 되는 것이 아닙니다. 약속을 지키겠다는 implements 선언이 있어야 컴파일러가 Card를 Payable 타입으로 인정합니다.');
    } else {
      sum.push('Card가 pay 메서드를 작성하지 않아 컴파일에 실패했습니다. implements Payable로 약속했으면 약속한 메서드를 실제로 작성해야 합니다.');
      sum.push('약속을 지켰는지는 프로그램을 실행할 때가 아니라 컴파일할 때 확인합니다. 그래서 약속을 어긴 프로그램은 실행해 볼 수도 없었습니다.');
    }
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? '성공' : '오류', ok ? '없음' : first, ok ? (out || '(아무것도 출력되지 않음)') : '실행할 수 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    H.counters(v, [[s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 왼쪽에 Payable(인터페이스), 오른쪽에 Card(클래스)와 둘을 잇는 implements 화살표. 아래에 Payable 변수 p와 Card 객체. 컴파일러가 확인 중인 곳이 노랗게 보이고, 맨 아래에 컴파일 결과와 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    var hot = s ? s.hot : '', bad = s ? s.bad : {};
    P.box('pa', 14, 20, 230, 76, { cls: !c.decl ? 'ghost' : hot === 'pa' ? 'hot now' : 'plain', title: 'Payable (인터페이스)', sub: c.decl ? 'pay() 이름만' : '선언 없음' });
    P.box('cd', 436, 20, 230, 76, { cls: bad.cd ? 'bad' : hot === 'cd' ? 'hot now' : 'plain', title: 'Card (클래스)', sub: { body: 'pay 본문 있음', empty: 'pay 본문 비어 있음', none: 'pay 없음' }[c.method] });
    if (c.impl) P.arrow('impl', 'cd:l', 'pa:r', { cls: bad.impl ? 'bad' : hot === 'cd' ? 'hot' : 'mut', label: 'implements' });
    P.box('pv', 14, 150, 230, 56, { cls: bad.pv ? 'bad' : hot === 'pv' ? 'hot now' : 'plain', title: 'Payable p', sub: s && s.obj ? 'Card 객체를 가리킴' : 'Payable 타입 변수' });
    P.box('ob', 436, 150, 230, 56, { cls: s && s.obj ? (hot === 'ob' ? 'good now' : 'good') : 'ghost', title: 'Card 객체', sub: s && s.obj ? 'new Card()로 만들어짐' : s && s.compile === 'err' ? '만들어지지 않음' : '아직 없음' });
    if (s && s.fit) P.arrow('fit', 'cd:b:0.25', 'pv:t:0.75', { cls: s.fit === 'bad' ? 'bad' : hot === 'pv' ? 'hot' : 'good' });
    if (s && s.obj) P.arrow('ref', 'pv:r', 'ob:l', { cls: 'good', label: '가리킴' });
    P.box('r1', 14, 232, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 292, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '실행했을 때 출력', right: s && s.ran ? (s.out || '(아무것도 출력되지 않음)') : s && s.compile === 'err' ? '실행할 수 없음' : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 열두 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드(compiler.err.cant.resolve, cant.resolve.location, prob.found.req, does.not.override.abstract를 화면의 세 가지 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력입니다. 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. 본문 없이 세미콜론으로 끝나는 인터페이스 메서드가 추상 메서드이고 public이라는 것은 9.4절, 추상 클래스가 아닌 클래스는 implements한 인터페이스의 추상 메서드를 모두 구현해야 한다는 것은 8.1.5절과 8.1.1.1절, 메서드 본문이 세미콜론이 아니라 블록이면 구현이고 블록이 비어 있어도 되는 것은 8.4.7절과 8.1.1.1절의 예(alert() { })를, 인터페이스와 클래스가 모두 참조 타입이고 implements한 인터페이스가 클래스의 상위 타입이라는 것은 4.3절과 4.10.2절, 상위 타입 변수가 하위 타입의 객체를 가리킬 수 있다는 것은 5.1.5절과 5.2절을 따랐습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 오류가 여럿이면 javac는 모두 알리는데, 표에는 첫 번째 것만 적었습니다. 컴파일에 실패해도 Card 같은 일부 클래스 파일은 만들어졌지만 Main 클래스 파일은 한 번도 만들어지지 않았고, 그래서 실행할 수 없다고 적었습니다. 인터페이스는 이 밖에도 default 메서드, static 메서드, 상수를 가질 수 있고 한 클래스가 여러 인터페이스를 implements할 수 있지만 이 실습은 다루지 않았습니다. 인터페이스의 쓰임과 추상 클래스와의 차이는 "세부 동작 실습: 인터페이스와 추상 클래스"에서 다룹니다.',
});
