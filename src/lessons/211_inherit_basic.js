Lab.register({
  id: 'inherit_basic', nav: '상속', cat: '기초개념', mode: 'step', basic: true, deep: ['inherit'],
  title: 'extends는 무엇을 물려주는가',
  intro: '상속은 class Dog extends Animal처럼 클래스 이름 뒤에 extends와 다른 클래스를 적어서 쓰는 문법입니다. extends 뒤의 Animal이 부모 클래스, Dog가 자식 클래스이고, Dog는 Animal에 적힌 메서드와 필드를 물려받습니다. 그래서 Dog에 적지 않은 eat()을 Dog 객체로 부를 수 있습니다. 물려받은 메서드를 Dog에 같은 이름으로 다시 적으면 Dog 객체에서는 Dog의 것이 실행되는데, 이것이 재정의(오버라이딩)입니다. 그리고 extends를 썼기 때문에 Dog 객체를 Animal 타입 변수에 담을 수 있습니다. 이 실습은 extends를 지우거나 eat()을 다시 적고 변수의 타입을 바꿔 가며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주는지와 어느 eat이 실행되는지를 봅니다.',
  terms: ['상속', 'extends', '부모 클래스와 자식 클래스', '오버라이딩'],
  controls: [
    { id: 'ext', label: 'Dog에 extends Animal을 쓴다', type: 'check', value: true },
    { id: 'over', label: 'Dog에 eat()을 다시 적는다', type: 'check', value: false },
    { id: 'var', label: '변수 d에 담는 것', type: 'select', value: 'dog', options: [['dog', 'Dog d = new Dog(); 로 담는다'], ['animal', 'Animal d = new Dog(); 로 담는다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'extends는 어떻게 생겼고, Dog에 적지 않은 eat()을 부르면 무슨 일이 일어나나', d: 'Dog는 Animal을 물려받습니다. 컴파일에 성공하고 Animal에 적힌 eat이 실행됩니다.', v: { ext: true, over: false, var: 'dog' } },
    { t: 'extends Animal을 지우면', q: 'extends Animal을 지우면', d: 'Dog에는 자기가 적은 것만 있어서 eat()을 부를 수 없고, 컴파일 오류가 납니다.', v: { ext: false, over: false, var: 'dog' } },
    { t: 'Dog에 eat()을 다시 적으면', q: 'Dog에 eat()을 다시 적으면', d: 'Dog 객체에서는 Dog에 적힌 eat이 실행됩니다.', v: { ext: true, over: true, var: 'dog' } },
    { t: 'Animal 타입 변수에 담으면', q: 'Dog 객체를 Animal 타입 변수에 담으면', d: 'extends가 있어서 담을 수 있고, 이 변수로 Animal에 적힌 eat을 부릅니다.', v: { ext: true, over: false, var: 'animal' } },
    { t: 'extends를 지우고 Animal 변수에 담으면', q: 'extends Animal을 지우고 Animal 변수에 담으면', d: 'Dog는 Animal 타입이 아니어서 담을 수 없고, 컴파일 오류가 납니다.', v: { ext: false, over: false, var: 'animal' } },
    { t: '다시 적고 Animal 변수에 담으면', q: 'Dog에 eat()을 다시 적고 Animal 변수에 담으면', d: '변수의 타입이 Animal이어도 객체가 Dog이므로 Dog에 적힌 eat이 실행됩니다.', v: { ext: true, over: true, var: 'animal' } },
  ],
  // 컴파일러가 알려 주는 오류의 종류(실제 javac의 진단 코드를 옮긴 것)
  errNoEat: 'Dog에는 eat 메서드가 없음',
  errFit: 'Dog는 Animal 타입이 아니어서 담을 수 없음',
  eatName: { animal: 'Animal에 적힌 eat', dog: 'Dog에 적힌 eat' },
  code: function (c) {
    var o = ['class Animal {', '    void eat() {', '        System.out.println("먹는다");', '    }', '}', ''];
    if (c.ext) o.push('// 상속: Dog는 Animal에 적힌 것을 물려받는다');
    o.push('class Dog' + (c.ext ? ' extends Animal' : '') + ' {', '    void bark() {', '        System.out.println("멍멍");', '    }');
    if (c.over) o.push('', '    // Animal에도 있는 eat()을 Dog에 같은 이름으로 다시 적는다', '    void eat() {', '        System.out.println("개가 먹는다");', '    }');
    o.push('}', '', 'public class Main {', '    public static void main(String[] args) {');
    if (c.var === 'dog') o.push('        Dog d = new Dog();', '        d.eat();', '        d.bark();');
    else o.push('        Animal d = new Dog();', '        d.eat();');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.ext ? 'extends 있음' : 'extends 없음') + ' · ' + (c.over ? 'Dog에 eat 다시 적음' : 'Dog에 eat 없음') + ' · ' + (c.var === 'dog' ? 'Dog 변수' : 'Animal 변수'); },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력', '실행된 eat'],
  simulate: function (c) {
    var ev = [], sum = [], dogVar = c.var === 'dog';
    var ok = c.ext || (dogVar && c.over);
    var first = ok ? '' : dogVar ? this.errNoEat : this.errFit;
    var nerr = ok ? 0 : 1;
    var errAt = ok ? [] : [dogVar ? 'd.eat();' : 'Animal d = new Dog();'];
    var st = { hot: '', bad: {}, obj: false, eat: '', compile: '', errs: 0, errText: '', ran: false, out: [], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errNoEat = this.errNoEat, errFit = this.errFit, eatName = this.eatName;
    var dogOwn = c.over ? 'bark와 eat' : 'bark';

    // 1. class Dog 줄을 읽는다
    st.hot = 'ex';
    if (c.ext) {
      st.checks.push(['class Dog extends Animal 줄', { v: 'Dog는 Animal을 물려받음', cls: 'good' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. 먼저 class Animal을 읽고, Animal에 eat 메서드가 있다는 것을 알게 됩니다. 다음에 class Dog extends Animal 줄을 읽고, Dog가 Animal의 자식이며 Animal에 적힌 것을 물려받는다고 기억해 둡니다. extends 뒤에 적은 Animal이 부모 클래스입니다. Dog 안에는 ' + dogOwn + ' 메서드를 직접 적었습니다.', '');
    } else {
      st.checks.push(['class Dog 줄', { v: 'extends 없음: Animal과 관계없음', cls: '' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. 먼저 class Animal을 읽고, Animal에 eat 메서드가 있다는 것을 알게 됩니다. 다음에 class Dog 줄을 읽는데 extends가 없으므로, Dog는 Animal과 관계없는 클래스입니다. Dog 안에는 ' + dogOwn + ' 메서드를 직접 적었고, Animal에 적힌 것이 Dog로 오는 일은 없습니다. Animal에 eat이 있다는 것은 Dog와 아무 상관이 없습니다.', '');
    }

    // 2. 변수 d의 줄을 확인한다
    st.hot = 'vd';
    if (dogVar) {
      st.checks.push(['Dog d = new Dog(); 줄', { v: '통과', cls: 'good' }]);
      push('컴파일러가 Dog d = new Dog(); 줄을 확인합니다. Dog 객체를 Dog 타입 변수에 담는 줄이므로 문제가 없습니다. 변수 d의 타입이 Dog이므로, d로 부르는 메서드는 Dog 타입에서 찾습니다.', 'good');
    } else if (c.ext) {
      st.checks.push(['Animal d = new Dog(); 줄', { v: '통과: 자식 객체를 부모 타입에 담음', cls: 'good' }]);
      push('컴파일러가 Animal d = new Dog(); 줄을 확인합니다. Dog는 extends Animal로 Animal의 자식이므로, Dog 객체를 Animal 타입 변수 d에 담을 수 있습니다. 변수 d의 타입은 Animal이 되어, d로 부르는 메서드는 Animal 타입에서 찾습니다.', 'good');
    } else {
      st.bad.vd = true; fail(errFit);
      st.checks.push(['Animal d = new Dog(); 줄', { v: '오류: Dog는 Animal 타입이 아님', cls: 'bad' }]);
      push('컴파일러가 Animal d = new Dog(); 줄을 확인합니다. Dog에 extends Animal이 없어 Dog는 Animal 타입이 아니므로, Dog 객체를 Animal 타입 변수 d에 담을 수 없습니다(javac: incompatible types: Dog cannot be converted to Animal).' + (c.over ? ' Dog에 eat이 같은 이름으로 있어도 마찬가지입니다. 메서드 이름이 같다고 그 타입이 되는 것은 아닙니다.' : ''), 'bad');
    }

    // 3. d.eat(); 줄을 확인한다
    if (dogVar) {
      if (c.over) {
        st.hot = 'de';
        st.checks.push(['d.eat(); 줄', { v: '통과: Dog에 eat이 있음', cls: 'good' }]);
        push('컴파일러가 d.eat(); 줄을 확인합니다. d의 타입이 Dog이므로 Dog에서 eat 메서드를 찾습니다. Dog 안에 eat이 적혀 있으므로 통과합니다.' + (c.ext ? ' Animal에도 같은 이름의 eat이 있지만, Dog에 적힌 것이 있으면 Dog의 것을 씁니다.' : ' extends가 없어도 Dog가 직접 적은 메서드이므로 쓸 수 있습니다.'), 'good');
      } else if (c.ext) {
        st.hot = 'ae';
        st.checks.push(['d.eat(); 줄', { v: '통과: Animal에서 물려받은 eat', cls: 'good' }]);
        push('컴파일러가 d.eat(); 줄을 확인합니다. d의 타입이 Dog이므로 Dog에서 eat 메서드를 찾는데, Dog 안에는 eat이 없습니다. Dog는 Animal을 물려받으므로 Animal에서 이어서 찾고, Animal에 적힌 eat을 찾아 통과합니다. Dog에 적지 않은 eat을 Dog 객체로 부를 수 있는 이유가 이것입니다.', 'good');
      } else {
        st.hot = 'de'; st.bad.de = true; fail(errNoEat);
        st.checks.push(['d.eat(); 줄', { v: '오류: Dog에는 eat이 없음', cls: 'bad' }]);
        push('컴파일러가 d.eat(); 줄을 확인합니다. d의 타입이 Dog이므로 Dog에서 eat 메서드를 찾는데, Dog 안에는 eat이 없습니다. extends가 없어 Animal로 이어 찾을 수도 없으므로 오류가 납니다(javac: cannot find symbol). Animal 안에 eat이 있어도 소용없습니다. 알린 오류는 이 줄 하나이고, d.bark(); 줄은 Dog에 bark가 있어 오류가 아닙니다.', 'bad');
      }
    } else {
      st.hot = 'ae';
      if (c.ext) {
        st.checks.push(['d.eat(); 줄', { v: '통과: Animal에 eat이 있음', cls: 'good' }]);
        push('컴파일러가 d.eat(); 줄을 확인합니다. d의 타입이 Animal이므로 Animal에서 eat 메서드를 찾고, Animal 안에 eat이 적혀 있으므로 통과합니다.' + (c.over ? ' 컴파일러가 확인하는 것은 여기까지입니다. 실행할 때 어느 클래스의 eat이 실행되는지는 변수의 타입이 아니라 담긴 객체를 보고 정해집니다.' : ''), 'good');
      } else {
        st.checks.push(['d.eat(); 줄', { v: '오류 아님', cls: '' }]);
        push('컴파일러가 d.eat(); 줄을 확인합니다. d의 타입이 Animal이고 Animal 안에 eat이 있으므로, 이 줄 자체는 오류가 아닙니다(javac가 알린 오류는 위의 1개뿐입니다). 하지만 앞의 오류 때문에 컴파일은 실패합니다.', '');
      }
    }

    // 4. 컴파일 결과
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다. 여기까지는 컴파일러가 줄마다 쓸 수 있는지 확인한 것이고, 아직 eat은 한 번도 실행되지 않았습니다.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + nerr + '개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 ' + nerr + '개이고, 첫 번째 오류는 "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없습니다.', 'bad');
    }

    // 5~7. 실행
    var eat = '';
    if (ok) {
      st.hot = 'ob'; st.obj = true;
      push('java Main으로 실행합니다. main이 시작되고, new Dog()가 Dog 객체를 만들어 변수 d에 담습니다.' + (dogVar ? '' : ' 변수 d의 타입은 Animal이지만, 만들어진 객체는 Dog 객체입니다.'), '');
      eat = c.over ? 'dog' : 'animal';
      st.hot = c.over ? 'de' : 'ae'; st.eat = eat;
      st.out.push(c.over ? '개가 먹는다' : '먹는다');
      st.checks.push(['d.eat()으로 실행된 것', { v: eatName[eat], cls: 'good' }]);
      if (c.over) {
        push('d.eat(); 줄이 실행됩니다. d가 가리키는 객체는 Dog 객체이므로, 실행할 eat을 그 객체의 클래스인 Dog에서 먼저 찾습니다. Dog에 적힌 eat이 있으므로 그것이 실행되어 "개가 먹는다"를 출력합니다. Animal에 적힌 eat은 실행되지 않습니다.' + (dogVar ? '' : ' 변수의 타입이 Animal이어도 마찬가지입니다. 어느 eat을 실행할지는 객체의 클래스를 보고 정합니다.') + (c.ext ? '' : ' Dog는 Animal과 관계없으므로, 이 eat은 물려받은 것이 아니라 Dog가 직접 적은 것입니다.'), 'good');
      } else {
        push('d.eat(); 줄이 실행됩니다. d가 가리키는 객체는 Dog 객체이므로, 실행할 eat을 그 객체의 클래스인 Dog에서 먼저 찾습니다. Dog에는 eat이 없으므로 Animal에서 찾아, Animal에 적힌 eat이 실행되어 "먹는다"를 출력합니다.', 'good');
      }
      if (dogVar) {
        st.hot = 'db'; st.out.push('멍멍');
        push('d.bark(); 줄이 실행됩니다. Dog 객체의 bark는 Dog에 직접 적은 메서드이므로 그대로 실행되어 "멍멍"을 출력합니다.', 'good');
      }
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (ok && c.ext && !c.over && dogVar) {
      sum.push('extends Animal을 쓰면 Dog는 Animal에 적힌 메서드를 물려받습니다. Dog에 적지 않은 eat()을 Dog 객체로 불렀는데 컴파일에 성공했고, Dog에 없으니 Animal에 적힌 eat이 실행되어 "먹는다"가 출력됐습니다.');
      sum.push('같은 Dog 객체로 d.bark()와 d.eat()을 불렀습니다. bark는 Dog에 직접 적은 메서드이고 eat은 Animal에서 물려받은 메서드인데, 부르는 쪽에서는 구별이 없습니다.');
    } else if (ok && c.ext && c.over && dogVar) {
      sum.push('물려받은 eat을 Dog에 같은 이름으로 다시 적으면(재정의), Dog 객체에서는 Dog에 적힌 eat이 실행됩니다. "개가 먹는다"가 출력되고 Animal에 적힌 eat은 실행되지 않았습니다.');
      sum.push('Dog 객체로 eat을 부르면 객체의 클래스인 Dog부터 찾기 때문입니다. Animal 안의 eat이 바뀐 것은 아니어서, Animal 객체로 eat을 부르면 여전히 "먹는다"가 출력됩니다.');
    } else if (ok && c.ext && !c.over) {
      sum.push('extends Animal이 있어서 Dog 객체를 Animal 타입 변수 d에 담을 수 있었습니다. 컴파일에 성공했고, 객체가 Dog인데 Dog에 eat이 없어 Animal에 적힌 eat이 실행됐습니다.');
      sum.push('Animal 타입 변수로 부를 수 있는 것은 Animal에 적힌 메서드뿐이어서, 이 코드에는 d.bark(); 줄이 없습니다. Animal 변수로 bark를 부르면 컴파일러가 bark를 찾을 수 없다고 알립니다.');
    } else if (ok && c.ext) {
      sum.push('변수 d의 타입은 Animal이지만 담긴 객체가 Dog 객체이므로, 실행된 것은 Dog에 적힌 eat이고 "개가 먹는다"가 출력됐습니다. Animal에도 eat이 있지만 실행되지 않았습니다.');
      sum.push('컴파일러는 변수의 타입(Animal)을 보고 eat을 부를 수 있는지만 확인합니다. 실제로 어느 eat이 실행될지는 실행할 때 객체의 클래스(Dog)를 보고 정해집니다. Dog가 eat을 재정의했으므로 Dog의 eat이 실행됩니다.');
    } else if (ok) {
      sum.push('extends Animal을 지웠어도 Dog에 eat을 직접 적었으므로 컴파일에 성공했고, Dog에 적힌 eat이 실행되어 "개가 먹는다"가 출력됐습니다. 이 eat은 물려받은 것이 아니라 Dog가 직접 적은 것입니다.');
      sum.push('extends가 없으면 Dog에는 자기가 적은 것만 있습니다. Animal의 eat과 이름이 같아도 둘은 이어지지 않으므로 이것은 재정의가 아닙니다. 이어 주는 것은 extends입니다.');
    } else if (dogVar) {
      sum.push('extends Animal을 지우면 Dog에는 자기가 적은 것만 있어서, Dog에 적지 않은 eat()을 부를 수 없습니다. 컴파일러가 Dog에는 eat 메서드가 없다고 알려 주어 컴파일에 실패했고, 실행할 수 없었습니다.');
      sum.push('Animal 안에 eat이 있어도, extends로 이어 놓지 않으면 Dog는 그것을 쓸 수 없습니다. 오류가 난 곳은 d.eat(); 줄 한 군데이고, Dog에 직접 적은 bark는 문제가 없었습니다.');
    } else {
      sum.push('extends Animal을 지우면 Dog는 Animal 타입이 아니어서, Dog 객체를 Animal 타입 변수에 담을 수 없습니다. 컴파일러가 이 줄에서 오류를 알려 주었고, 컴파일에 실패해 실행할 수 없었습니다.' + (c.over ? ' Dog에 eat을 같은 이름으로 다시 적었어도 마찬가지였습니다.' : ''));
      sum.push('메서드 이름이 같다고 그 타입이 되는 것이 아닙니다. 자식 객체를 부모 타입 변수에 담을 수 있는 것은 extends로 Dog가 Animal의 자식이라고 선언했기 때문입니다.');
    }
    var run = ok ? st.out.join(' / ') : '실행할 수 없음';
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, eatName: eatName, row: [ok ? '성공' : '오류', ok ? '없음' : first, run, ok ? eatName[eat] : '실행할 수 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    if (s.out.length) H.table(v, ['출력'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), '실행했을 때 출력');
    H.counters(v, [[s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 왼쪽 위에 Animal(eat), 아래에 Dog(bark, 다시 적은 eat)와 둘을 잇는 extends 화살표. 오른쪽에 변수 d와 Dog 객체. 객체에서 실제로 실행된 eat으로 가는 화살표. 맨 아래에 컴파일 결과, 출력, 실행된 eat.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 440);
    var hot = s ? s.hot : '', bad = s ? s.bad : {}, dogVar = c.var === 'dog', err = s && s.compile === 'err';
    P.region('ra', 14, 12, 286, 86, 'Animal');
    P.box('ae', 28, 38, 258, 50, { cls: hot === 'ae' ? 'hot now' : s && s.eat === 'animal' ? 'good' : 'plain', title: 'eat()', sub: '"먹는다" 출력' });
    P.region('rd', 14, 160, 286, 126, 'Dog');
    P.box('db', 28, 184, 258, 40, { cls: hot === 'db' ? 'hot now' : 'plain', title: 'bark()', sub: '"멍멍" 출력' });
    P.box('de', 28, 234, 258, 44, { cls: bad.de ? 'bad' : hot === 'de' ? 'hot now' : s && s.eat === 'dog' ? 'good' : c.over ? 'plain' : 'ghost', title: 'eat()', sub: c.over ? '"개가 먹는다" 출력' : 'Dog에 적지 않음' });
    if (c.ext) P.arrow('ex', [157, 160], [157, 98], { cls: hot === 'ex' ? 'hot' : 'mut', label: 'extends' });
    P.box('vd', 380, 20, 286, 56, { cls: bad.vd ? 'bad' : hot === 'vd' ? 'hot now' : 'plain', title: dogVar ? 'Dog d' : 'Animal d', sub: s && s.obj ? 'Dog 객체를 가리킴' : dogVar ? 'Dog 타입 변수' : 'Animal 타입 변수' });
    P.box('ob', 380, 130, 286, 70, { cls: s && s.obj ? (hot === 'ob' ? 'good now' : 'good') : 'ghost', title: 'Dog 객체', sub: s && s.obj ? 'new Dog()로 만들어짐' : err ? '만들어지지 않음' : '아직 없음' });
    if (s && s.obj) P.arrow('ref', 'vd:b', 'ob:t', { cls: 'good' });
    if (s && s.eat) P.arrow('run', 'ob:l', s.eat === 'dog' ? 'de:r' : 'ae:r', { cls: 'good', label: '실행' });
    P.box('r1', 14, 298, 652, 44, { cls: s && s.compile === 'ok' ? 'good' : err ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 350, 652, 36, { cls: s && s.out.length ? 'good' : err ? 'bad' : 'ghost', title: '실행했을 때 출력', right: s && s.out.length ? s.out.join(' / ') : err ? '실행할 수 없음' : '' });
    P.box('r3', 14, 394, 652, 36, { cls: s && s.eat ? 'good' : err ? 'bad' : 'ghost', title: '실행된 eat', right: s && s.eat ? sim.eatName[s.eat] : err ? '실행할 수 없음' : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 여덟 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드(compiler.err.cant.resolve.location.args와 compiler.err.prob.found.req를 화면의 두 가지 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력입니다. "실행된 eat"은 짐작이 아니라 출력으로 가렸습니다. Animal의 eat은 "먹는다"를, Dog의 eat은 "개가 먹는다"를 출력하게 써 두고, 실제 출력이 어느 쪽인지 읽었습니다. 단계 문장이 기대는 사실도 따로 실행해 확인했습니다. Animal 타입 변수로 Dog에만 적은 bark()를 부르면 컴파일 오류가 나는 것(그래서 Animal 변수 코드에는 d.bark() 줄이 없습니다), Dog에 eat을 다시 적어도 Animal 객체로 부르는 eat은 여전히 "먹는다"를 출력하는 것, extends가 없을 때도 Dog에 직접 적은 bark는 문제없이 쓸 수 있는 것입니다. 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. extends 절이 직접 부모 클래스를 정하고 자식 클래스(subclass)라 부른다는 것은 8.1.4절, 클래스가 부모 클래스의 접근할 수 있는 메서드 가운데 자기가 같은 시그니처로 다시 적지 않은 것을 물려받는다는 것은 8.4.8절, 자식 클래스가 부모의 메서드를 같은 시그니처로 다시 적은 것이 재정의(overrides)라는 것은 8.4.8.1절, 부모 클래스가 자식 클래스의 상위 타입이라는 것은 4.10.2절(그래서 자식 객체를 부모 타입 변수에 담을 수 있습니다), 실행할 때는 변수의 타입이 아니라 대상 객체의 실제 클래스에서 시작해 위로 올라가며 재정의한 메서드를 찾는다는 것은 15.12.4.4절을 따랐습니다. 명세 5.1.5절과 5.2절(대입 문맥에서 자식 타입의 값을 부모 타입 변수에 담는 변환)은 이 실습에서 열어 확인하지 못했습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. extends 없이 Animal 변수에 담을 때는 Dog에 eat을 다시 적었는지와 상관없이 같은 줄에서 같은 오류가 하나 났습니다. 화면의 코드는 클래스가 한 파일에 같이 있는 모양이고 접근 제어자는 줄였으며, @Override는 쓰지 않았습니다. 모든 클래스는 extends를 쓰지 않아도 Object를 물려받지만 이 실습은 다루지 않았고, "extends가 없으면 Dog에는 자기가 적은 것만 있다"는 Animal에 적힌 것에 대해서 한 말입니다. 클래스가 부모의 접근할 수 있는 필드도 물려받는다는 것은 8.3절에서 확인했지만 이 실습은 메서드만 실행으로 보였습니다. 부모의 필드 쓰기, 생성자, super 키워드, private 멤버가 물려지지 않는 것, 자식이 부모 생성자를 부르는 순서도 이 실습은 다루지 않았습니다. 부모 생성자가 실행되는 순서와 super는 "세부 동작 실습: 상속과 오버라이딩"에서 다룹니다.',
});
