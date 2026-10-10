Lab.register({
  id: 'poly', nav: '다형성과 메서드 선택', cat: '자바 언어', mode: 'step',
  title: '어느 메서드가 실행될지는 누가, 언제 정하나',
  intro: '변수의 선언 타입과 실제 들어 있는 객체의 타입이 다를 수 있습니다. 오버라이딩한 메서드는 실행 시점에 실제 객체를 보고 고르지만, 오버로딩, static 메서드, 필드는 컴파일 시점에 선언 타입만 보고 정해집니다. 조합을 바꿔 가며 결과를 예상해 보세요.',
  terms: ['다형성', '오버라이딩', '오버로딩', 'static', '상속'], ranks: ['oop', 'absint'],
  controls: [
    { id: 'v', label: '변수의 선언 타입', type: 'select', value: 'Animal', options: [['Animal', 'Animal a'], ['Dog', 'Dog a']] },
    { id: 'o', label: '실제로 넣는 객체', type: 'select', value: 'Dog', options: [['Animal', 'new Animal()'], ['Dog', 'new Dog()']] },
    { id: 'w', label: '그 변수로 하는 일', type: 'select', value: 'override', options: [['override', '오버라이딩된 메서드 호출: a.sound()'], ['overload', '오버로딩된 메서드에 인자로 전달: printer.print(a)'], ['static', 'static 메서드 호출: a.info()'], ['field', '필드 읽기: a.name']] },
  ],
  presets: [
    { t: '처음 설정으로', d: 'Animal 변수에 Dog 객체. 오버라이딩된 메서드는 Dog 것이 실행됩니다.', v: { v: 'Animal', o: 'Dog', w: 'override' } },
    { t: '같은 변수를 오버로딩 메서드에 넘기면', d: '실제 객체가 Dog인데도 print(Animal)이 선택됩니다.', v: { v: 'Animal', o: 'Dog', w: 'overload' } },
    { t: 'static 메서드는', d: '오버라이딩되지 않습니다. 선언 타입의 것이 불립니다.', v: { v: 'Animal', o: 'Dog', w: 'static' } },
    { t: '필드는', d: '필드도 다형성이 적용되지 않습니다.', v: { v: 'Animal', o: 'Dog', w: 'field' } },
    { t: '선언 타입을 Dog로 바꾸면', d: '오버로딩에서 print(Dog)가 선택됩니다.', v: { v: 'Dog', o: 'Dog', w: 'overload' } },
    { t: 'Dog 변수에 Animal 객체', d: '컴파일되지 않습니다.', v: { v: 'Dog', o: 'Animal', w: 'override' } },
  ],
  code: function (c) {
    var use = { override: 'a.sound();', overload: 'new Printer().print(a);', static: 'a.info();          // 권장하지 않는 호출 방식', field: 'System.out.println(a.name);' }[c.w];
    return 'class Animal {\n    String name = "동물";\n    void sound()       { System.out.println("Animal.sound"); }\n    static void info() { System.out.println("Animal.info"); }\n}\nclass Dog extends Animal {\n    String name = "개";                 // 같은 이름의 필드\n    @Override\n    void sound()       { System.out.println("Dog.sound"); }\n    static void info() { System.out.println("Dog.info"); }\n}\nclass Printer {\n    void print(Animal x) { System.out.println("print(Animal)"); }\n    void print(Dog x)    { System.out.println("print(Dog)"); }\n}\n\n' + c.v + ' a = new ' + c.o + '();\n' + use;
  },
  label: function (c) { return c.v + ' a = new ' + c.o + '() · ' + { override: 'a.sound()', overload: 'print(a)', static: 'a.info()', field: 'a.name' }[c.w]; },
  columns: ['출력', '정해진 시점', '기준이 된 타입'],
  out: function (c) {
    if (c.v === 'Dog' && c.o === 'Animal') return '컴파일 오류';
    if (c.w === 'override') return c.o + '.sound';
    if (c.w === 'overload') return 'print(' + c.v + ')';
    if (c.w === 'static') return c.v + '.info';
    return c.v === 'Animal' ? '동물' : '개';
  },
  simulate: function (c) {
    var ev = [], out = this.out(c), sum = [], when, basis;
    function push(s, k, snap) { ev.push({ s: s, k: k, snap: snap }); }
    var base = { decl: c.v, obj: c.o, stage: '컴파일', pick: '', out: '' };
    if (out === '컴파일 오류') {
      push('컴파일 시점: Dog 타입 변수에 Animal 객체를 넣으려 합니다. 모든 Dog는 Animal이지만 모든 Animal이 Dog인 것은 아니므로, 컴파일러가 대입을 허용하지 않습니다.', 'bad', { decl: c.v, obj: '(대입 불가)', stage: '컴파일', pick: '컴파일 오류: incompatible types', out: '' });
      sum.push('부모 타입 변수에 자식 객체를 넣는 것(업캐스팅)은 되지만, 그 반대는 안 됩니다. 프로그램이 실행되지도 않습니다.');
      return { events: ev, summary: sum, row: ['컴파일 오류', '컴파일 시점', '선언 타입'] };
    }
    push('컴파일 시점: ' + c.v + ' a = new ' + c.o + '(). 변수 a의 선언 타입은 ' + c.v + '이고, 실행되면 힙에 ' + c.o + ' 객체가 만들어집니다.' + (c.v !== c.o ? ' 둘이 다릅니다.' : ''), '', base);
    if (c.w === 'override') {
      when = '실행 시점'; basis = '실제 객체 (' + c.o + ')';
      push('컴파일 시점: 컴파일러는 선언 타입 ' + c.v + '에 sound()가 있는지만 확인합니다. 어느 클래스의 sound()를 실행할지는 정하지 않고 "sound()를 호출하라"는 지시만 남깁니다.', '', { decl: c.v, obj: c.o, stage: '컴파일', pick: c.v + '에 sound() 있음 → 통과', out: '' });
      push('실행 시점: JVM이 a가 가리키는 실제 객체의 클래스(' + c.o + ')를 확인하고, 그 클래스의 sound()를 찾아 실행합니다(동적 바인딩).', 'good', { decl: c.v, obj: c.o, stage: '실행', pick: c.o + '.sound()', out: out });
      sum.push('오버라이딩된 인스턴스 메서드는 변수의 선언 타입이 아니라 실제 객체의 타입으로 정해집니다. 이것이 다형성이며, 스프링이 인터페이스 타입으로 주입받은 구현체를 실행할 수 있는 원리입니다.');
    } else {
      when = '컴파일 시점'; basis = '선언 타입 (' + c.v + ')';
      if (c.w === 'overload') { push('컴파일 시점: print 메서드가 두 개입니다. 컴파일러는 넘기는 인자 a의 선언 타입 ' + c.v + '만 보고 print(' + c.v + ')를 고릅니다. 이 선택은 바이트코드에 고정됩니다(정적 바인딩).', '', { decl: c.v, obj: c.o, stage: '컴파일', pick: 'print(' + c.v + ')', out: '' }); push('실행 시점: 이미 정해진 print(' + c.v + ')가 실행됩니다. a에 실제로 ' + c.o + ' 객체가 들어 있다는 사실은 메서드 선택에 쓰이지 않습니다.', c.v !== c.o ? 'bad' : 'good', { decl: c.v, obj: c.o, stage: '실행', pick: 'print(' + c.v + ')', out: out }); sum.push('오버로딩은 이름만 같은 서로 다른 메서드이고, 어느 것을 부를지는 컴파일할 때 인자의 선언 타입으로 정해집니다. 실제 객체 타입은 영향을 주지 않습니다.'); }
      if (c.w === 'static') { push('컴파일 시점: info()는 static 메서드입니다. static 메서드는 객체가 아니라 클래스에 속하므로, 컴파일러가 a.info()를 선언 타입에 따라 ' + c.v + '.info()로 바꿔 놓습니다.', '', { decl: c.v, obj: c.o, stage: '컴파일', pick: c.v + '.info()', out: '' }); push('실행 시점: ' + c.v + '.info()가 실행됩니다. Dog에도 info()가 있지만 이것은 오버라이딩이 아니라, 같은 이름의 별개 메서드로 부모 것을 가린 것(하이딩)입니다.', c.v !== c.o ? 'bad' : 'good', { decl: c.v, obj: c.o, stage: '실행', pick: c.v + '.info()', out: out }); sum.push('static 메서드는 오버라이딩되지 않습니다. 그래서 변수로 static 메서드를 부르는 것은 혼란을 주므로, 클래스 이름으로 호출하는 것이 원칙입니다.'); }
      if (c.w === 'field') { push('컴파일 시점: 필드 접근은 메서드 호출과 달리 선언 타입으로 정해집니다. 컴파일러가 a.name을 ' + c.v + ' 클래스의 name 필드로 확정합니다.', '', { decl: c.v, obj: c.o, stage: '컴파일', pick: c.v + '의 name 필드', out: '' }); push('실행 시점: ' + c.v + '의 name 값 "' + out + '"을 읽습니다.' + (c.o === 'Dog' ? ' Dog 객체 안에는 Animal의 name과 Dog의 name이 둘 다 들어 있고, 어느 쪽을 읽을지가 선언 타입으로 갈립니다.' : ''), c.v !== c.o ? 'bad' : 'good', { decl: c.v, obj: c.o, stage: '실행', pick: c.v + '의 name 필드', out: out }); sum.push('필드에는 다형성이 적용되지 않습니다. 필드를 직접 노출하지 않고 메서드(getter)로 접근하게 하는 이유 중 하나입니다.'); }
    }
    sum.unshift('출력: ' + out + '. ' + when + '에 ' + basis + '을 기준으로 정해졌습니다.');
    return { events: ev, summary: sum, row: [out, when, basis] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일 단계부터 시작합니다.'); return; }
    H.title(v, '변수와 객체'); var ln = H.lanes(v);
    H.lane(ln, '선언 타입', s.decl + ' (컴파일러가 아는 것)', 'wait');
    H.lane(ln, '실제 객체', s.obj + (s.obj.indexOf('(') < 0 ? ' (실행해 봐야 아는 것)' : ''), s.obj.indexOf('(') === 0 ? 'bad' : 'good');
    H.table(v, ['단계', '선택된 대상'], [{ cells: [s.stage + ' 시점', { v: s.pick || '아직 정하지 않음', cls: s.pick.indexOf('오류') >= 0 ? 'bad' : s.pick ? 'hot' : '' }] }], '지금 단계');
    H.counters(v, [[s.out || '(아직 실행 전)', '콘솔 출력']]);
  },
  // 그림: 위에 변수(선언 타입)와 객체(실제 타입), 아래에 후보 둘. 어느 쪽에서 출발한 화살표가 후보를 고르는지가 핵심.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { decl: c.v, obj: c.o, stage: '', pick: '', out: '' }, err = s.obj.charAt(0) === '(';
    P.size(680, 300);
    P.region('st', 16, 16, 250, 92, '스택');
    P.region('hp', 414, 16, 250, 92, '힙');
    P.box('var', 30, 50, 222, 44, { cls: 'wait', title: 'a', sub: '선언 타입: ' + s.decl });
    P.box('obj', 428, 50, 222, 44, err ? { cls: 'bad', title: 'Animal 객체', sub: 'Dog 변수에 넣을 수 없음' } : { cls: 'good', title: s.obj + ' 객체', sub: '실제 타입: ' + s.obj });
    if (!err) P.arrow('pt', 'var:r', 'obj:l', { label: '가리킴' });
    var names = { override: ['Animal의 sound()', 'Dog의 sound() (재정의)'], overload: ['print(Animal a)', 'print(Dog d)'], static: ['Animal.info() (static)', 'Dog.info() (static)'], field: ['Animal의 name 필드', 'Dog의 name 필드'] }[c.w];
    P.region('cand', 16, 132, 648, 100, { override: '실행될 수 있는 메서드', overload: 'Printer의 두 메서드', static: '두 클래스의 static 메서드', field: '객체 안의 두 필드' }[c.w]);
    var pick = err || !s.pick ? '' : /Dog/.test(s.pick) ? 'D' : /Animal/.test(s.pick) ? 'A' : '', late = c.w === 'override' && s.stage === '실행', chosen = late || c.w !== 'override';
    [['A', 30], ['D', 344]].forEach(function (m, i) { var on = pick === m[0]; P.box('m' + m[0], m[1], 168, 306, 48, { cls: on ? (chosen ? 'hot now' : 'wait') : 'plain', title: names[i], sub: on ? (chosen ? '이것이 선택됨' : '있는지만 확인함') : ' ' }); });
    if (pick) P.arrow('sel', (late ? 'obj' : 'var') + ':b', 'm' + pick + ':t', { cls: late ? 'good' : chosen ? 'hot' : 'dash mut', label: late ? '실제 객체의 타입으로 (실행 시점)' : chosen ? '선언 타입으로 (컴파일 시점)' : '선언 타입에 있는지 확인' });
    P.box('out', 16, 248, 648, 34, { cls: s.out ? 'plain' : 'ghost', title: '콘솔 출력', right: s.out || (err ? '컴파일 오류로 실행되지 않음' : '아직 실행 전') });
    P.note('아래 후보를 고르는 화살표가 왼쪽 변수(선언 타입)에서 출발하면 컴파일할 때 정해진 것이고, 오른쪽 객체(실제 타입)에서 출발하면 실행할 때 정해진 것입니다. 오버라이딩된 메서드만 객체에서 출발합니다.');
  },
  assume: '모든 조합의 출력은 이 PC의 JDK 21에서 같은 코드를 실제로 컴파일·실행한 결과와 대조했습니다. 변수를 통해 static 메서드를 호출하는 a.info()는 문법상 가능하지만 권장되지 않는 방식이며, 선언 타입 기준으로 정해진다는 점을 보이려고 넣었습니다.',
});
