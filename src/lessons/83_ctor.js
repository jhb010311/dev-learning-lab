Lab.register({
  id: 'ctor', nav: '클래스, 객체, 생성자', cat: '자바 언어', mode: 'step',
  title: 'new를 하면 어떤 순서로 무슨 일이 일어나나',
  intro: '클래스는 설계도이고, new는 그 설계도로 객체를 하나 만듭니다. 이때 필드는 먼저 기본값으로 채워지고, 그다음 필드 초기화식과 초기화 블록이 적힌 순서대로 실행되고, 마지막에 생성자 본문이 실행됩니다. 어떤 생성자를 적었는지에 따라 new Order()가 아예 컴파일되지 않기도 합니다.',
  terms: ['클래스와 객체', '생성자', '기본 생성자', '필드의 기본값', 'this'],
  controls: [
    { id: 'ctors', label: 'Order 클래스에 적은 생성자', type: 'select', value: 'chain', options: [['none', '하나도 적지 않음'], ['arg', 'Order(int extra) 하나만'], ['both', 'Order()와 Order(int extra)'], ['chain', 'Order()가 this(1)로 Order(int extra)를 부름']] },
    { id: 'call', label: '객체를 만드는 코드', type: 'select', value: 'noarg', options: [['noarg', 'new Order()'], ['arg', 'new Order(3)']] },
    { id: 'first', label: '클래스에서 더 위에 적은 것', type: 'select', value: 'field', options: [['field', '필드 초기화식 int qty = 10'], ['block', '초기화 블록 { qty = 20; }']], hint: '둘은 위에 적힌 것부터 실행됩니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'Order() 생성자가 this(1) 호출로 Order(int extra) 생성자를 부를 때 new Order() 호출은 어떤 순서로 일어나나', d: 'Order()가 this(1)로 다른 생성자를 먼저 부릅니다. 출력은 21, 기본입니다.', v: { ctors: 'chain', call: 'noarg', first: 'field' } },
    { t: '생성자를 하나도 적지 않으면', q: 'Order 클래스에 생성자를 하나도 적지 않으면', d: '컴파일러가 기본 생성자를 넣어 줍니다. memo는 null로 남습니다.', v: { ctors: 'none', call: 'noarg', first: 'field' } },
    { t: '인자 있는 생성자만 적고 new Order()', q: '생성자를 Order(int extra) 하나만 적고 new Order() 호출을 하면', d: '기본 생성자가 생기지 않아 컴파일 오류입니다.', v: { ctors: 'arg', call: 'noarg', first: 'field' } },
    { t: '초기화 블록을 위에 적으면', q: '생성자를 Order()와 Order(int extra) 둘 다 적고 int qty = 10 대신 초기화 블록 { qty = 20; }을 위에 적으면', d: '초기화식이 나중에 실행되어 qty가 10이 됩니다.', v: { ctors: 'both', call: 'noarg', first: 'block' } },
    { t: 'new Order(3)', q: '생성자를 Order()와 Order(int extra) 둘 다 적고 new Order(3) 호출로 객체를 만들면', d: '인자에 맞는 생성자 Order(int extra)가 선택됩니다.', v: { ctors: 'both', call: 'arg', first: 'field' } },
    { t: '생성자가 없는데 new Order(3)', q: '생성자를 하나도 적지 않고 new Order(3) 호출로 객체를 만들면', d: '기본 생성자는 인자를 받지 않으므로 컴파일 오류입니다.', v: { ctors: 'none', call: 'arg', first: 'field' } },
  ],
  code: function (c) {
    var field = '    int qty = 10;                  // 필드 초기화식\n', memo = '    String memo;                   // 초기화식이 없는 필드\n', block = '    {                              // 초기화 블록\n        qty = 20;\n    }\n';
    var argCtor = '    Order(int extra) {\n        qty = qty + extra;\n        memo = "추가 " + extra;\n    }\n';
    var noArg = '    Order() {\n' + (c.ctors === 'chain' ? '        this(1);                   // 같은 클래스의 다른 생성자를 먼저 부른다\n' : '') + '        memo = "기본";\n    }\n';
    var body = c.first === 'field' ? field + memo + '\n' + block : block + '\n' + field + memo;
    if (c.ctors === 'none') body += '                                   // 생성자를 적지 않았다\n';
    if (c.ctors === 'arg') body += '\n' + argCtor;
    if (c.ctors === 'both' || c.ctors === 'chain') body += '\n' + noArg + '\n' + argCtor;
    var bad = this.bad(c);
    return 'class Order {\n' + body + '}\n\nOrder o = new Order(' + (c.call === 'arg' ? '3' : '') + ');' + (bad ? '             // 컴파일 오류: 맞는 생성자가 없다' : '') + '\nSystem.out.println(o.qty + ", " + o.memo);';
  },
  label: function (c) { return { none: '생성자 없음', arg: 'Order(int)만', both: 'Order(), Order(int)', chain: 'Order()가 this(1)' }[c.ctors] + ' · ' + (c.call === 'arg' ? 'new Order(3)' : 'new Order()') + ' · ' + (c.first === 'field' ? '초기화식이 위' : '블록이 위'); },
  columns: ['컴파일', '실행된 순서', '출력 (qty, memo)'],
  // new에 맞는 생성자가 없어 컴파일되지 않는 조합인가
  bad: function (c) { return (c.ctors === 'none' && c.call === 'arg') || (c.ctors === 'arg' && c.call === 'noarg'); },
  simulate: function (c) {
    var ev = [], sum = [], order = [], noarg = c.call === 'noarg', callTxt = noarg ? 'new Order()' : 'new Order(3)';
    var st = { made: false, qty: '', qtyBy: '', memo: '', memoBy: '', cur: '', tgt: '', done: [], stack: [], order: [], o: false, out: '', err: '' };
    function push(s, k) { st.order = order.slice(); ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function did(id, name) { if (st.done.indexOf(id) < 0) st.done.push(id); if (name) order.push(name); }
    var ERR = 'constructor Order in class Order cannot be applied to given types';
    if (c.ctors === 'none') push('컴파일: Order 클래스에 생성자를 하나도 적지 않았습니다. 이럴 때는 컴파일러가 인자도 없고 하는 일도 없는 기본 생성자 Order() { }를 자동으로 넣어 줍니다.');
    else if (c.ctors === 'arg') push('컴파일: Order 클래스에 생성자 Order(int extra)를 직접 적었습니다. 생성자를 하나라도 직접 적으면 컴파일러는 기본 생성자를 넣어 주지 않습니다. 이 클래스의 생성자는 Order(int extra) 하나뿐입니다.');
    else push('컴파일: Order 클래스에 생성자 Order()와 Order(int extra)를 직접 적었습니다. 생성자는 받는 인자가 다르면 여러 개 둘 수 있습니다.');
    if (this.bad(c)) {
      st.err = ERR;
      if (noarg) push('컴파일: new Order()에 맞는, 인자를 받지 않는 생성자를 찾습니다. 이 클래스에는 Order(int extra)밖에 없습니다. 맞는 생성자가 없어 컴파일 오류입니다. 프로그램은 실행되지 않습니다.', 'bad');
      else push('컴파일: new Order(3)에 맞는, int 하나를 받는 생성자를 찾습니다. 이 클래스에는 컴파일러가 넣어 준 Order()밖에 없습니다. 맞는 생성자가 없어 컴파일 오류입니다. 프로그램은 실행되지 않습니다.', 'bad');
      sum.push('컴파일 오류입니다. javac의 메시지는 "' + ERR + '"이고, "Order의 생성자를 이 인자들로는 부를 수 없다"는 뜻입니다.');
      if (noarg) { sum.push('기본 생성자는 생성자를 하나도 적지 않았을 때만 생깁니다. 인자 있는 생성자를 추가하는 순간, 그전까지 되던 new Order()가 컴파일되지 않습니다.'); sum.push('new Order()도 계속 쓰려면 인자 없는 생성자 Order() { }를 직접 적어 줍니다.'); }
      else sum.push('컴파일러가 넣어 주는 기본 생성자는 인자를 받지 않습니다. 값을 받아서 객체를 만들고 싶으면 그 인자를 받는 생성자를 직접 적어야 합니다.');
      return { events: ev, summary: sum, row: ['오류: ' + ERR, '실행되지 않음', '실행되지 않음'] };
    }
    push('컴파일: ' + callTxt + '에 맞는 생성자를 찾습니다. ' + (noarg ? '인자가 없으므로 ' + (c.ctors === 'none' ? '컴파일러가 넣어 준 기본 생성자 Order()' : 'Order()') + '가 선택됩니다.' : 'int 값 하나를 넘기므로 Order(int extra)가 선택됩니다.') + ' 이제 프로그램을 실행합니다.');
    st.made = true; st.qty = '0'; st.qtyBy = '기본값'; st.memo = 'null'; st.memoBy = '기본값';
    push(callTxt + ' 실행: 가장 먼저 힙에 Order 객체의 자리를 잡고 모든 필드를 기본값으로 채웁니다. int인 qty는 0, 참조 타입인 memo는 null입니다. 초기화식도 생성자 본문도 아직 실행되지 않았습니다.');
    var chained = noarg && c.ctors === 'chain';
    if (chained) {
      st.stack = ['Order()']; st.cur = 'c0';
      push('생성자 Order()의 첫 줄 this(1): 같은 클래스의 다른 생성자 Order(int extra)를 먼저 부릅니다. extra에는 1이 들어갑니다. Order()의 나머지 본문은 그 생성자가 끝난 뒤에 실행됩니다.');
      st.stack.push('Order(int extra)');
    } else st.stack = [noarg ? 'Order()' : 'Order(int extra)'];
    var why = ' 필드 초기화식과 초기화 블록은 어느 생성자가 불리든 생성자 본문보다 먼저, 클래스에 적힌 순서대로 실행됩니다.';
    function runField(second) {
      var before = st.qty; st.qty = '10'; st.qtyBy = '필드 초기화식'; st.cur = 'pf'; st.tgt = 'fq'; did('pf', '필드 초기화식');
      push('int qty = 10: 필드 초기화식이 실행되어 qty가 ' + before + '에서 10이 됩니다.' + (second ? ' 초기화식이 블록보다 아래에 적혀 있어 나중에 실행되었고, 블록이 넣었던 20을 덮어썼습니다.' : why), second ? 'bad' : '');
    }
    function runBlock(second) {
      var before = st.qty; st.qty = '20'; st.qtyBy = '초기화 블록'; st.cur = 'pb'; st.tgt = 'fq'; did('pb', '초기화 블록');
      push('초기화 블록의 qty = 20: qty가 ' + before + '에서 20이 됩니다.' + (second ? ' 블록이 초기화식보다 아래에 적혀 있어 나중에 실행되었습니다.' : why));
    }
    if (c.first === 'field') { runField(false); runBlock(true); } else { runBlock(false); runField(true); }
    var extra = chained ? 1 : 3;
    if (!noarg || chained) {
      var b = st.qty; st.qty = String(+b + extra); st.qtyBy = 'Order(int extra)'; st.cur = 'c1'; st.tgt = 'fq'; did('c1', 'Order(int) 본문');
      push('Order(int extra) 본문의 qty = qty + extra: 초기화가 끝난 뒤에야 생성자 본문이 실행됩니다. 지금 qty인 ' + b + '에 extra ' + extra + '을 더해 qty가 ' + st.qty + '이 됩니다.');
      st.memo = '"추가 ' + extra + '"'; st.memoBy = 'Order(int extra)'; st.tgt = 'fm';
      push('Order(int extra) 본문의 memo = "추가 " + extra: null이던 memo에 "추가 ' + extra + '"이 들어갑니다.');
    }
    if (noarg && c.ctors === 'none') {
      st.cur = 'c0'; st.tgt = ''; did('c0');
      push('기본 생성자 Order() { }의 본문: 컴파일러가 넣어 준 생성자는 본문이 비어 있어 아무것도 바꾸지 않습니다. memo에는 아무도 값을 넣지 않았으므로 기본값 null 그대로입니다.');
    } else if (noarg) {
      if (chained) st.stack.pop();
      var mb = st.memo; st.memo = '"기본"'; st.memoBy = 'Order()'; st.cur = 'c0'; st.tgt = 'fm'; did('c0', 'Order() 본문');
      push(chained ? 'Order()의 나머지 본문 memo = "기본": this(1)로 부른 생성자가 끝나 Order()로 돌아왔습니다. memo가 ' + mb + '에서 "기본"으로 바뀝니다. 초기화식과 블록은 다시 실행되지 않습니다.' : 'Order() 본문의 memo = "기본": 초기화가 끝난 뒤에야 생성자 본문이 실행됩니다. null이던 memo에 "기본"이 들어갑니다.');
    }
    st.stack = []; st.cur = ''; st.tgt = ''; st.o = true;
    push('Order o = ' + callTxt + ': 생성자가 끝났습니다. new는 완성된 객체를 가리키는 참조를 돌려주고, 변수 o가 그 참조를 담습니다.');
    var out = st.qty + ', ' + st.memo.replace(/"/g, ''); st.out = out;
    push('System.out.println(o.qty + ", " + o.memo): o가 가리키는 객체의 qty와 memo를 읽어 출력합니다. 출력은 ' + out + '입니다.', 'good');
    sum.push(c.first === 'field' ? '초기화식(10)이 먼저, 그 아래의 블록(20)이 나중에 실행되어 생성자 본문이 시작될 때 qty는 20이었습니다.' : '블록(20)이 먼저, 그 아래의 초기화식(10)이 나중에 실행되어 생성자 본문이 시작될 때 qty는 10이었습니다. 필드 초기화식과 초기화 블록은 위에 적힌 것부터 실행되므로, 둘이 같은 필드를 건드리면 적는 위치가 결과를 바꿉니다.');
    if (c.ctors === 'none') sum.push('생성자를 적지 않아도 new Order()가 되는 것은 컴파일러가 기본 생성자를 넣어 주기 때문입니다. 값을 넣지 않은 필드는 기본값(숫자는 0, 참조 타입은 null)으로 남습니다. 지역 변수와 달리 필드는(final이 붙지 않았다면) 초기화하지 않아도 컴파일 오류가 아닙니다.');
    if (chained) sum.push('this(...)는 생성자의 첫 문장으로만 쓸 수 있고, 같은 클래스의 다른 생성자를 먼저 실행합니다. 공통으로 할 일을 한 생성자에 모아 둘 때 씁니다. 초기화식과 블록은 한 번만 실행됩니다.');
    if (c.ctors === 'both' && noarg) sum.push('Order()와 Order(int extra)는 서로 다른 생성자입니다. new에 넘긴 인자에 맞는 것 하나만 실행됩니다.');
    if (!noarg) sum.push('new Order(3)은 넘긴 인자에 맞는 Order(int extra)를 실행합니다. Order() 생성자가 있든 없든 이 호출에서는 실행되지 않습니다.');
    return { events: ev, summary: sum, row: ['성공', order.join(' → '), out] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일 단계부터 한 단계씩 진행합니다.'); return; }
    if (s.err) { H.title(v, '컴파일 오류'); H.text(v, 'javac: ' + s.err); return; }
    H.table(v, ['필드', '타입', '지금 값', '이 값을 넣은 곳'], s.made ? [
      { cells: ['qty', 'int', { v: s.qty, cls: s.tgt === 'fq' ? 'hot' : '' }, s.qtyBy] },
      { cells: ['memo', 'String', { v: s.memo, cls: s.tgt === 'fm' ? 'hot' : '' }, s.memoBy] },
    ] : [], '힙의 Order 객체');
    if (!s.made) H.text(v, '아직 객체가 만들어지지 않았습니다.');
  },
  // 그림: 왼쪽에 클래스에 적힌 조각들(위에서 아래로 적힌 순서), 오른쪽에 힙의 객체와 필드 값. 지금 실행 중인 조각에서 그것이 바꾸는 필드로 화살표가 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { made: false, done: [], stack: [], order: [], cur: '', tgt: '', o: false, out: '', err: '' };
    var bad = this.bad(c), noarg = c.call === 'noarg';
    P.size(680, 318);
    P.region('cl', 16, 16, 330, 232, '클래스 Order에 적힌 것 (위에서 아래로)');
    var waiting = s.stack.length > 1 && s.cur !== 'c0';   // Order()가 this(1)로 다른 생성자를 부르고 기다리는 중
    function cls(id) { return s.cur === id ? 'hot now' : id === 'c0' && waiting ? 'wait' : s.done.indexOf(id) >= 0 ? 'good' : 'plain'; }
    function rank(id) { var names = { pf: '필드 초기화식', pb: '초기화 블록', c1: 'Order(int) 본문', c0: 'Order() 본문' }, i = s.order.indexOf(names[id]); return i >= 0 ? (i + 1) + '번째' : ''; }
    var yf = c.first === 'field' ? 50 : 98, yb = c.first === 'field' ? 98 : 50;
    P.box('pf', 30, yf, 302, 40, { cls: cls('pf'), title: '필드 초기화식', sub: 'int qty = 10;', right: rank('pf') });
    P.box('pb', 30, yb, 302, 40, { cls: cls('pb'), title: '초기화 블록', sub: '{ qty = 20; }', right: rank('pb') });
    if (c.ctors === 'none') P.box('c0', 30, 146, 302, 40, { cls: s.cur === 'c0' ? 'hot now' : 'ghost', title: '기본 생성자 Order() { }', sub: '적지 않아서 컴파일러가 넣어 줌' });
    else if (c.ctors === 'arg') P.box('c0', 30, 146, 302, 40, { cls: bad ? (s.err ? 'bad' : 'ghost') : 'ghost', title: 'Order() 없음', sub: '생성자를 직접 적어서 생기지 않음' });
    else P.box('c0', 30, 146, 302, 40, { cls: cls('c0'), title: '생성자 Order()', sub: c.ctors === 'chain' ? 'this(1); memo = "기본";' : 'memo = "기본";', right: waiting ? '기다리는 중' : rank('c0') });
    if (c.ctors === 'none') P.box('c1', 30, 194, 302, 40, { cls: bad && s.err ? 'bad' : 'ghost', title: 'Order(int) 없음', sub: '기본 생성자는 인자를 받지 않음' });
    else P.box('c1', 30, 194, 302, 40, { cls: cls('c1'), title: '생성자 Order(int extra)', sub: 'qty에 extra를 더하고 memo를 채움', right: rank('c1') });
    P.region('hp', 370, 16, 294, 152, '힙: Order 객체');
    function by(x) { return x === '기본값' ? '기본값 그대로' : x + '에서 넣음'; }
    if (s.made) {
      P.box('fq', 384, 50, 266, 44, { cls: s.tgt === 'fq' ? 'hot' : 'wait', title: 'qty', sub: by(s.qtyBy), right: s.qty });
      P.box('fm', 384, 106, 266, 44, { cls: s.tgt === 'fm' ? 'hot' : 'wait', title: 'memo', sub: by(s.memoBy), right: s.memo });
    } else {
      P.box('fq', 384, 50, 266, 44, { cls: 'ghost', title: 'qty', sub: s.err ? '실행되지 않음' : '아직 객체가 없음' });
      P.box('fm', 384, 106, 266, 44, { cls: 'ghost', title: 'memo', sub: s.err ? '실행되지 않음' : '아직 객체가 없음' });
    }
    P.box('vo', 384, 196, 266, 38, { cls: s.o ? 'wait' : 'ghost', title: '변수 o', right: s.o ? '객체를 가리킴' : s.err ? '없음' : '아직 비어 있음' });
    if (s.o) P.arrow('ao', 'vo:t', 'fm:b', {});
    if (s.cur && s.tgt) P.arrow('wr', s.cur + ':r', s.tgt + ':l', { cls: 'hot' });
    P.box('out', 16, 266, 648, 36, { cls: s.err ? 'bad' : s.out ? 'good' : 'ghost', title: s.err ? '컴파일 오류' : '콘솔 출력', right: s.err ? '맞는 생성자가 없음' : s.out || (s.made ? (noarg ? 'new Order()' : 'new Order(3)') + ' 진행 중' : '아직 실행 전') });
    P.note('왼쪽 상자의 "1번째, 2번째"는 실제로 실행된 순서입니다.');
  },
  assume: '열여섯 가지 조합을 이 PC의 JDK 21에서 같은 코드로 실제로 컴파일하고 실행해, 컴파일 결과와 오류 메시지, 초기화식과 블록과 생성자 본문이 실행된 순서, 출력을 대조했습니다. 실행된 순서는 같은 코드에 기록하는 줄만 끼워 넣어 확인했고, 필드가 초기화식보다 먼저 기본값(0, null)으로 채워져 있다는 것도 실행으로 확인했습니다. 단순화한 점: 모든 생성자는 본문보다 먼저 부모 클래스(여기서는 Object)의 생성자를 부르는데, 이 단계는 그림에서 뺐습니다("상속과 오버라이딩" 실습에서 다룹니다). 초기화 블록은 실무에서 자주 쓰지는 않으며, 순서를 보이려고 넣었습니다. 오류 메시지는 javac의 영어 메시지 첫 줄입니다. this(...)를 생성자의 첫 문장으로만 쓸 수 있다는 것은 JDK 21 기준이며 이 PC에서 컴파일로 확인했습니다. 더 새로운 JDK에서는 this(...) 앞에 일부 문장을 둘 수 있게 바뀌었다고 알려져 있으나 이 PC에서는 확인하지 못했습니다.',
});
