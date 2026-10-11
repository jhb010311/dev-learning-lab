Lab.register({
  id: 'inherit', nav: '상속과 오버라이딩', cat: '자바 언어', mode: 'step',
  title: '자식 객체를 만들 때 부모 생성자는 언제 실행되나',
  intro: '자식 클래스의 객체 하나에는 부모에게서 물려받은 필드와 자식이 선언한 필드가 함께 들어 있습니다. new를 하면 부모 생성자가 먼저 끝나고, 그다음에야 자식의 필드 초기화식과 생성자 본문이 실행됩니다. 이 순서 때문에 super(...)를 꼭 써야 하는 경우가 생기고, 부모 생성자가 오버라이딩된 메서드를 부르면 아직 비어 있는 자식 필드가 보입니다.',
  terms: ['상속', '오버라이딩', '생성자', 'super', '필드의 기본값'],
  controls: [
    { id: 'pctor', label: '부모 Animal에 적은 생성자', type: 'select', value: 'arg', options: [['noarg', 'Animal() 하나만'], ['arg', 'Animal(String name) 하나만'], ['both', 'Animal()과 Animal(String name)']] },
    { id: 'sup', label: '자식 생성자 Dog()의 첫 줄', type: 'select', value: 'arg', options: [['omit', 'super를 쓰지 않음'], ['noarg', 'super();'], ['arg', 'super("바둑이");']] },
    { id: 'pcall', label: 'Animal 생성자가 describe()를 부름', type: 'check', value: true, hint: 'describe()는 Dog가 오버라이딩한 메서드입니다.' },
    { id: 'sm', label: 'Dog의 describe()가 super.describe()를 부름', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: '부모 생성자가 describe()를 부릅니다. sound에 "멍멍"을 넣었는데 sound=null이 찍힙니다.', v: { pctor: 'arg', sup: 'arg', pcall: true, sm: false } },
    { t: '실행 순서만 보기', d: '부모 생성자, 자식의 필드 초기화식, 자식 생성자 본문 순서입니다.', v: { pctor: 'arg', sup: 'arg', pcall: false, sm: false } },
    { t: 'super를 쓰지 않으면', d: '컴파일러가 super()를 넣어 부모의 Animal()을 부릅니다.', v: { pctor: 'noarg', sup: 'omit', pcall: false, sm: false } },
    { t: '부모에 Animal()이 없는데 super를 쓰지 않으면', d: '자동으로 들어간 super()가 부를 생성자가 없어 컴파일 오류입니다.', v: { pctor: 'arg', sup: 'omit', pcall: false, sm: false } },
    { t: 'super.describe()로 부모 것도 부르기', d: '오버라이딩한 메서드 안에서 부모의 원래 동작을 먼저 실행합니다.', v: { pctor: 'arg', sup: 'arg', pcall: false, sm: true } },
    { t: '부모 생성자가 둘일 때', d: 'super에 넘긴 인자에 맞는 부모 생성자가 선택됩니다.', v: { pctor: 'both', sup: 'omit', pcall: false, sm: true } },
  ],
  code: function (c) {
    var bad = this.bad(c), call = c.pcall ? '        describe();                // 오버라이딩된 메서드를 생성자에서 부른다\n' : '';
    var noArg = '    Animal() {\n        name = "이름 없음";\n        System.out.println("Animal() 실행");\n' + call + '    }\n';
    var withArg = '    Animal(String name) {\n        this.name = name;\n        System.out.println("Animal(String) 실행");\n' + call + '    }\n';
    var animal = 'class Animal {\n    String name;\n\n' + (c.pctor === 'noarg' ? noArg : c.pctor === 'arg' ? withArg : noArg + '\n' + withArg) + '\n    void describe() {\n        System.out.println("name=" + name);\n    }\n}\n';
    var first = c.sup === 'noarg' ? '        super();' + (bad ? '                   // 컴파일 오류: Animal()이 없다' : '                   // 부모의 Animal()을 부른다') + '\n' : c.sup === 'arg' ? '        super("바둑이");' + (bad ? '           // 컴파일 오류: Animal(String)이 없다' : '           // 부모의 Animal(String)을 부른다') + '\n' : '';
    var dog = 'class Dog extends Animal {\n    String sound = "멍멍";\n\n    Dog() {' + (c.sup === 'omit' ? (bad ? '                        // 컴파일 오류: 자동으로 들어간 super()가 부를 Animal()이 없다' : '                        // 첫 줄에 super()가 자동으로 들어간다') : '') + '\n' + first + '        System.out.println("Dog() 실행");\n    }\n\n    @Override\n    void describe() {\n' + (c.sm ? '        super.describe();          // 부모의 describe()를 먼저 실행\n' : '') + '        System.out.println("sound=" + sound);\n    }\n}\n';
    return animal + '\n' + dog + '\nDog d = new Dog();\nd.describe();';
  },
  label: function (c) { return { noarg: 'Animal()', arg: 'Animal(String)', both: '생성자 둘' }[c.pctor] + ' · ' + { omit: 'super 없음', noarg: 'super()', arg: 'super("바둑이")' }[c.sup] + (c.pcall ? ' · 부모 생성자가 describe()' : '') + (c.sm ? ' · super.describe()' : ''); },
  columns: ['컴파일', 'new Dog() 동안의 출력', 'd.describe()의 출력'],
  // Dog()가 부르려는 부모 생성자가 Animal에 없어 컴파일되지 않는 조합인가
  bad: function (c) { return c.sup === 'arg' ? c.pctor === 'noarg' : c.pctor === 'arg'; },
  simulate: function (c) {
    var ev = [], sum = [], wantArg = c.sup === 'arg', pName = wantArg ? 'Animal(String name)' : 'Animal()', pShort = wantArg ? 'Animal(String)' : 'Animal()', nameVal = wantArg ? '바둑이' : '이름 없음';
    var st = { made: false, name: '', sound: '', stack: [], cur: '', done: [], out1: [], out2: [], phase: '', err: '', d: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function out(line) { (st.phase === 'call' ? st.out2 : st.out1).push(line); }
    function did(id) { if (st.done.indexOf(id) < 0) st.done.push(id); }
    var ERR = 'constructor Animal in class Animal cannot be applied to given types', supTxt = c.sup === 'arg' ? 'super("바둑이")' : 'super()';
    var e1 = '컴파일: Dog() 생성자의 첫 줄을 봅니다. ' + (c.sup === 'omit' ? 'super(...)를 쓰지 않았으므로 컴파일러가 맨 앞에 super()를 넣습니다. 인자 없는 부모 생성자 Animal()을 부르겠다는 뜻입니다.' : c.sup === 'noarg' ? 'super()는 인자 없는 부모 생성자 Animal()을 부르겠다는 뜻입니다. 쓰지 않았을 때 컴파일러가 넣어 주는 것과 같은 코드입니다.' : 'super("바둑이")는 문자열 하나를 받는 부모 생성자 Animal(String name)을 부르겠다는 뜻입니다.');
    if (this.bad(c)) {
      push(e1);
      st.err = ERR;
      push('컴파일: Animal 클래스에서 ' + pName + ' 생성자를 찾습니다. Animal에는 ' + (c.pctor === 'arg' ? 'Animal(String name)' : 'Animal()') + '만 있습니다. ' + (c.pctor === 'arg' ? '생성자를 직접 적은 클래스에는 기본 생성자가 생기지 않기 때문입니다. ' : '') + '부를 부모 생성자가 없어 컴파일 오류입니다. 프로그램은 실행되지 않습니다.', 'bad');
      sum.push('컴파일 오류입니다. javac의 메시지는 "' + ERR + '"이고, "Animal의 생성자를 이 인자들로는 부를 수 없다"는 뜻입니다.');
      if (c.pctor === 'arg') { sum.push('자식 생성자는 반드시 부모 생성자 하나를 먼저 부릅니다. ' + (c.sup === 'omit' ? 'super(...)를 쓰지 않으면 super()가 자동으로 들어가는데' : 'super()는 인자 없는 생성자를 찾는데') + ', 부모에 인자 없는 생성자가 없으면 부를 것이 없습니다.'); sum.push('부모에 Animal(String name)만 있을 때는 자식 생성자의 첫 줄에 super("바둑이")처럼 인자를 넘겨 직접 불러야 합니다. Dog에 생성자를 하나도 적지 않아도 같은 오류가 납니다. 자동으로 생기는 기본 생성자도 super()를 부르기 때문입니다.'); }
      else sum.push('super(...)에 넘긴 인자에 맞는 생성자가 부모에 있어야 합니다. Animal에는 문자열을 받는 생성자가 없습니다.');
      return { events: ev, summary: sum, row: ['오류: ' + ERR, '실행되지 않음', '실행되지 않음'] };
    }
    push(e1 + ' Animal에 이 생성자가 있으므로 컴파일됩니다.');
    st.made = true; st.name = 'null'; st.sound = 'null'; st.phase = 'new';
    push('new Dog() 실행: 힙에 Dog 객체 하나의 자리를 잡습니다. 이 객체 안에는 Animal에게서 물려받은 name과 Dog가 선언한 sound가 함께 들어 있고, 둘 다 기본값 null로 채워집니다.');
    st.stack = ['Dog()']; st.cur = 'cc';
    push('Dog() 생성자의 첫 줄 ' + supTxt + (c.sup === 'omit' ? '(컴파일러가 넣은 것)' : '') + ': Dog의 필드 초기화식과 생성자 본문을 실행하기 전에 부모 생성자인 ' + pName + ' 쪽으로 먼저 넘어갑니다. 물려받은 부분이 먼저 준비되어야 자식이 그것을 쓸 수 있기 때문입니다.');
    st.stack.push(pShort); st.cur = 'pc'; st.name = '"' + nameVal + '"';
    push(wantArg ? 'Animal(String name) 본문의 this.name = name: 넘겨받은 "바둑이"가 name에 들어갑니다. sound는 아직 null입니다.' : 'Animal() 본문의 name = "이름 없음": name에 "이름 없음"이 들어갑니다. sound는 아직 null입니다.');
    out(pShort + ' 실행');
    push('System.out.println("' + pShort + ' 실행"): 부모 생성자의 본문이 실행 중입니다. Dog() 생성자의 본문은 아직 한 줄도 실행되지 않았습니다.');
    function describe() {
      var pre = st.phase === 'call' ? 'd.describe()로 부른 ' : '';
      st.stack.push('Dog.describe()'); st.cur = 'cd';
      if (c.sm) {
        st.stack.push('Animal.describe()'); st.cur = 'pd'; out('name=' + nameVal);
        push(pre + 'Dog의 describe() 첫 줄 super.describe(): super.은 오버라이딩으로 가려진 부모의 메서드를 부르는 말입니다. Animal의 describe()가 실행되어 name=' + nameVal + ' 줄을 출력합니다.');
        st.stack.pop(); st.cur = 'cd'; pre = '';
      }
      var isNull = st.sound === 'null';
      out('sound=' + st.sound.replace(/"/g, ''));
      push(isNull ? 'Dog의 describe() 안의 println("sound=" + sound): Dog의 필드 초기화식 sound = "멍멍"은 부모 생성자가 끝난 뒤에야 실행됩니다. 지금 sound는 기본값 null이어서 출력은 sound=null입니다.' : pre + 'Dog의 describe() 안의 println("sound=" + sound): 객체가 다 만들어진 뒤이므로 sound에는 "멍멍"이 들어 있습니다. 출력은 sound=멍멍입니다.', isNull ? 'bad' : 'good');
      st.stack.pop();
    }
    if (c.pcall) {
      st.stack.push('Dog.describe()'); st.cur = 'cd';
      push(pName + ' 본문의 describe(): 어느 describe()를 실행할지는 지금 만들고 있는 실제 객체의 타입으로 정해집니다. 실제 객체가 Dog이므로, 부모 생성자 안에서 불렀는데도 Dog가 오버라이딩한 describe()가 실행됩니다.');
      st.stack.pop();
      describe(); st.cur = 'pc';
    }
    st.stack.pop(); did('pc'); st.cur = 'cf'; st.sound = '"멍멍"';
    push('Dog의 필드 초기화식 String sound = "멍멍": 부모 생성자가 끝나 Dog()로 돌아왔습니다. 이제야 Dog의 필드 초기화식이 실행되어 sound에 "멍멍"이 들어갑니다.');
    did('cf'); st.cur = 'cc'; out('Dog() 실행');
    push('System.out.println("Dog() 실행"): Dog() 생성자의 본문이 실행됩니다. 자식 생성자의 본문이 가장 마지막입니다.');
    st.stack = []; did('cc'); st.cur = ''; st.d = true; st.phase = 'call';
    push('Dog d = new Dog(): 생성자가 모두 끝났습니다. 완성된 객체의 참조가 변수 d에 담깁니다.');
    describe(); st.cur = ''; st.stack = [];
    var o1 = st.out1.join(' / '), o2 = st.out2.join(' / ');
    sum.push('실행 순서는 부모 생성자 ' + pName + ' → Dog의 필드 초기화식 → Dog() 생성자의 본문입니다. 자식 생성자가 먼저 시작되지만, 첫 줄에서 부모 생성자로 넘어가 부모 쪽이 먼저 끝납니다.');
    if (c.sup === 'omit') sum.push('super(...)를 쓰지 않아도 부모 생성자는 실행됩니다. 컴파일러가 Dog()의 첫 줄에 super()를 넣기 때문입니다.' + (c.pctor === 'both' ? ' Animal에 생성자가 둘 있지만 super()에 맞는 것은 인자 없는 Animal()입니다.' : ''));
    if (c.sup !== 'omit' && c.pctor === 'both') sum.push('부모에 생성자가 여럿이면 super(...)에 넘긴 인자에 맞는 것이 선택됩니다. ' + supTxt + '이므로 ' + pName + ' 생성자가 실행되었습니다.');
    if (c.pcall) { sum.push('함정: 부모 생성자가 부른 describe()는 Dog가 오버라이딩한 것이고, 그 시점에 Dog의 sound는 아직 초기화 전이라 null입니다. 코드에는 sound = "멍멍"이라고 적혀 있는데도 sound=null이 찍혔습니다. null인 필드의 메서드를 불렀다면 NullPointerException이 났을 것입니다.'); sum.push('그래서 생성자 안에서는 자식이 오버라이딩할 수 있는 메서드를 부르지 않는 것이 원칙입니다. 객체가 다 만들어진 뒤에 부른 d.describe()의 출력은 sound=멍멍으로 정상입니다.'); }
    if (c.sm) sum.push('super.describe()는 부모의 원래 동작을 그대로 실행합니다. 오버라이딩은 부모 것을 완전히 바꿔 쓰는 것이지만, 이렇게 부모 것을 먼저 부르면 거기에 자식의 동작을 덧붙이는 모양이 됩니다.');
    else sum.push('Dog가 describe()를 오버라이딩했으므로 Animal의 describe()는 실행되지 않습니다. name은 출력되지 않았습니다. 부모 것도 실행하려면 Dog의 describe() 안에서 super.describe()를 부릅니다.');
    return { events: ev, summary: sum, row: ['성공', o1, o2] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일 단계부터 한 단계씩 진행합니다.'); return; }
    if (s.err) { H.title(v, '컴파일 오류'); H.text(v, 'javac: ' + s.err); return; }
    H.table(v, ['필드', '선언한 클래스', '지금 값'], s.made ? [
      { cells: ['name', 'Animal (물려받음)', { v: s.name, cls: s.name === 'null' ? '' : 'good' }] },
      { cells: ['sound', 'Dog', { v: s.sound, cls: s.sound === 'null' ? (String(s.stack[s.stack.length - 1]).indexOf('describe') >= 0 ? 'bad' : '') : 'good' }] },
    ] : [], '힙의 Dog 객체 (하나)');
    if (!s.made) H.text(v, '아직 객체가 만들어지지 않았습니다.');
  },
  // 그림: 왼쪽에 자식 Dog의 코드 조각, 가운데에 부모 Animal의 코드 조각, 오른쪽에 힙의 객체 하나(물려받은 name과 자기 sound). 호출이 Dog에서 Animal로, 다시 Dog의 describe()로 넘어가는 것을 화살표로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { made: false, name: '', sound: '', stack: [], cur: '', done: [], out1: [], out2: [], phase: '', err: '', d: false };
    var bad = this.bad(c), wantArg = c.sup === 'arg', top = s.stack[s.stack.length - 1] || '';
    P.size(680, 314);
    P.region('rd', 16, 16, 190, 190, '자식 클래스 Dog');
    P.region('ra', 250, 16, 190, 190, '부모 클래스 Animal');
    P.region('hp', 462, 16, 202, 190, '힙: Dog 객체 하나');
    function cls(id) { return s.cur === id ? 'hot now' : (id === 'cc' && s.stack[0] === 'Dog()') || (id === 'pc' && s.stack.length > 1 && /^Animal\(/.test(s.stack[1])) ? 'wait' : s.done.indexOf(id) >= 0 ? 'good' : 'plain'; }
    P.box('cc', 24, 50, 174, 40, { cls: cls('cc'), title: '생성자 Dog()', sub: c.sup === 'omit' ? 'super()가 자동으로' : c.sup === 'noarg' ? 'super();' : 'super("바둑이");' });
    P.box('cf', 24, 100, 174, 40, { cls: cls('cf'), title: '필드 초기화식', sub: 'sound = "멍멍"' });
    P.box('cd', 24, 150, 174, 40, { cls: s.cur === 'cd' ? 'hot now' : 'plain', title: 'describe() 재정의', sub: c.sm ? 'super.describe() 부름' : 'sound만 출력' });
    var have = c.pctor === 'both' ? (wantArg ? 'arg' : 'noarg') : c.pctor, tA = 'Animal(String name)', t0 = 'Animal()';
    P.box('pc', 258, 50, 174, 40, { cls: s.err ? 'plain' : cls('pc'), title: have === 'arg' ? tA : t0, sub: c.pcall ? 'describe()도 부름' : 'name을 채움' });
    if (bad) P.box('p2', 258, 100, 174, 40, { cls: s.err ? 'bad' : 'ghost', title: (wantArg ? 'Animal(String)' : t0) + ' 없음', sub: 'Dog()가 부르려는 것' });
    else if (c.pctor === 'both') P.box('p2', 258, 100, 174, 40, { cls: 'ghost', title: wantArg ? t0 : tA, sub: '이번에는 불리지 않음' });
    P.box('pd', 258, 150, 174, 40, { cls: s.cur === 'pd' ? 'hot now' : 'plain', title: 'describe()', sub: 'name을 출력' });
    if (s.made) {
      P.box('fn', 470, 50, 186, 40, { cls: s.name === 'null' ? 'wait' : 'good', title: 'name', sub: 'Animal 부분', right: s.name });
      P.box('fs', 470, 100, 186, 40, { cls: s.sound === 'null' ? (top.indexOf('describe') >= 0 ? 'bad' : 'wait') : 'good', title: 'sound', sub: 'Dog 부분', right: s.sound });
    } else {
      P.box('fn', 470, 50, 186, 40, { cls: 'ghost', title: 'name', sub: s.err ? '실행되지 않음' : '아직 객체가 없음' });
      P.box('fs', 470, 100, 186, 40, { cls: 'ghost', title: 'sound', sub: s.err ? '실행되지 않음' : '아직 객체가 없음' });
    }
    P.box('vd', 470, 150, 186, 40, { cls: s.d ? 'wait' : 'ghost', title: '변수 d', right: s.d ? '객체를 가리킴' : s.err ? '없음' : '아직 비어 있음' });
    if (s.stack.length > 1 && /^Animal\(/.test(s.stack[1])) P.arrow('a1', 'cc:r:0.35', 'pc:l:0.35', { cls: 'hot', label: 'super' });
    if (s.phase === 'new' && s.stack.indexOf('Dog.describe()') >= 0) P.arrow('a2', 'pc:l:0.8', 'cd:r:0.3', { cls: 'bad' });
    if (top === 'Animal.describe()') P.arrow('a3', 'cd:r:0.7', 'pd:l:0.7', { cls: 'hot', label: 'super.' });
    var o1 = s.out1.join(' / '), o2 = s.out2.join(' / ');
    P.box('o1', 16, 222, 648, 34, { cls: s.err ? 'bad' : !o1 ? 'ghost' : s.out1.indexOf('sound=null') >= 0 ? 'bad' : 'plain', title: s.err ? '컴파일 오류' : 'new Dog() 동안의 출력', right: s.err ? '부를 부모 생성자가 없음' : o1 || '아직 없음' });
    P.box('o2', 16, 264, 648, 34, { cls: s.err ? 'ghost' : o2 ? 'good' : 'ghost', title: 'd.describe()의 출력', right: s.err ? '실행되지 않음' : o2 || '아직 없음' });
    P.note('객체는 하나이고, 그 안에 부모에게서 물려받은 name과 자식의 sound가 함께 있습니다. 노란 상자가 지금 실행 중인 코드, 파란 상자는 부른 쪽에서 기다리는 코드입니다. 빨간 화살표는 부모 생성자가 부른 describe()가 자식 Dog의 것으로 넘어가는 것을 나타냅니다.');
  },
  assume: '서른여섯 가지 조합을 이 PC의 JDK 21에서 같은 코드로 실제로 컴파일하고 실행해, 컴파일 결과와 오류 메시지, 객체를 만드는 동안의 출력과 d.describe()의 출력을 대조했습니다. 자식에 생성자를 적지 않아도 부모에 인자 없는 생성자가 없으면 같은 오류가 난다는 것과, super(...)가 생성자의 첫 문장이어야 한다는 것(JDK 21 기준)도 컴파일로 확인했습니다. 더 새로운 JDK에서는 super(...) 앞에 일부 문장을 둘 수 있게 바뀌었다고 알려져 있으나 이 PC에서는 확인하지 못했습니다. 단순화한 점: Animal의 생성자도 맨 먼저 자기 부모인 Object의 생성자를 부르는데 이 단계는 뺐습니다. 어느 메서드가 선택되는지에 대한 자세한 규칙은 "다형성과 메서드 선택" 실습에서 다룹니다. 오류 메시지는 javac의 영어 메시지 첫 줄입니다.',
});
