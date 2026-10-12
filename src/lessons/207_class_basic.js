Lab.register({
  id: 'class_basic', nav: '클래스와 객체', cat: '기초개념', mode: 'step', basic: true, deep: ['stack'],
  title: '클래스와 객체는 어떻게 다른가',
  intro: '클래스는 class로 적는 설계도입니다. 어떤 값(필드)과 메서드를 갖는지를 적어 둘 뿐이고, 클래스를 선언했다고 무엇이 만들어지지는 않습니다. 객체는 new로 그 설계도대로 만든 실제 것입니다. new를 실행할 때마다 객체가 하나씩 생기고, 객체마다 필드의 값을 따로 가집니다. 변수는 객체 자체가 아니라 객체를 가리키는 것이어서, 가리키는 객체가 없으면 그 객체의 메서드를 부를 수 없습니다. 이 실습은 class 선언과 new를 지우거나 null로 바꿔 가며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주는지와 만들어진 Card 객체가 몇 개인지를 봅니다.',
  terms: ['클래스와 객체', '필드', 'new', '필드의 기본값', 'NullPointerException'],
  controls: [
    { id: 'decl', label: 'class Card 선언이 있다', type: 'check', value: true },
    { id: 'make', label: '변수 a에 담는 것', type: 'select', value: 'new', options: [['new', 'Card a = new Card(); 객체를 만든다'], ['none', 'Card a; 변수만 선언한다'], ['null', 'Card a = null; 아무것도 가리키지 않게 한다']] },
    { id: 'two', label: '객체를 하나 더 만든다 (Card b)', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '클래스와 객체는 어떻게 생겼고, 실행하면 무슨 일이 일어나나', d: '클래스를 선언하고 new로 객체를 하나 만듭니다. 컴파일에 성공하고 김철수의 카드가 출력됩니다.', v: { decl: true, make: 'new', two: false } },
    { t: 'new Card()를 지우면', q: 'new Card()를 지우고 변수만 선언하면', d: '변수만 선언하고 값을 담지 않은 채 쓰면 컴파일 오류가 납니다.', v: { decl: true, make: 'none', two: false } },
    { t: 'null을 담으면', q: 'new Card() 대신 null을 담으면', d: '컴파일은 성공하지만 실행 중에 NullPointerException으로 멈춥니다.', v: { decl: true, make: 'null', two: false } },
    { t: '객체를 하나 더 만들면', q: '객체를 하나 더 만들면', d: 'new를 두 번 실행해 객체가 2개 생기고, 객체마다 owner를 따로 가집니다.', v: { decl: true, make: 'new', two: true } },
    { t: 'class Card 선언을 지우면', q: 'class Card 선언을 지우면', d: 'Card라는 클래스가 없어 컴파일 오류가 납니다.', v: { decl: false, make: 'new', two: false } },
  ],
  // 컴파일러가 알려 주는 오류의 종류(실제 javac의 진단 코드를 옮긴 것)
  errClass: 'Card라는 클래스를 찾을 수 없음',
  errInit: '값을 담지 않은 변수 a를 썼음',
  aLine: function (c) { return { new: 'Card a = new Card();', none: 'Card a;', null: 'Card a = null;' }[c.make]; },
  code: function (c) {
    var o = [];
    if (c.decl) o.push('// 설계도: Card는 owner라는 값(필드)과 show라는 메서드를 가진다', 'class Card {', '    String owner;', '    void show() {', '        System.out.println(owner + "의 카드");', '    }', '}', '');
    o.push('public class Main {', '    public static void main(String[] args) {');
    if (c.make === 'new') o.push('        // 객체: 설계도대로 실제 카드를 하나 만들어 변수 a에 담는다');
    else if (c.make === 'none') o.push('        // 카드를 담을 변수 a만 선언한다');
    else o.push('        // 변수 a에 null을 담는다. 가리키는 객체가 없다');
    o.push('        ' + this.aLine(c), '        a.owner = "김철수";', '        a.show();');
    if (c.two) o.push('', '        // 객체를 하나 더 만들어 변수 b에 담는다', '        Card b = new Card();', '        b.owner = "이영희";', '        b.show();', '', '        // a가 가리키는 객체의 owner가 그대로인지 다시 불러 본다', '        a.show();');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.decl ? 'class Card 선언 있음' : 'class Card 선언 없음') + ' · ' + { new: 'new로 객체를 만듦', none: '변수만 선언', null: 'null을 담음' }[c.make] + ' · ' + (c.two ? '객체를 하나 더 만듦' : '객체 하나'); },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행 결과', '만들어진 Card 객체'],
  simulate: function (c) {
    var ev = [], sum = [], mk = c.make, A = this.aLine(c), B = 'Card b = new Card();';
    var ok = c.decl && mk !== 'none';
    var nerr, errAt = [], first;
    if (!c.decl) {
      first = this.errClass;
      for (var i = 0; i < (mk === 'new' ? 2 : 1); i++) errAt.push(A);
      if (c.two) errAt.push(B, B);
      nerr = errAt.length;
    } else if (mk === 'none') {
      first = this.errInit; errAt = ['a.owner = "김철수";']; nerr = 1;
    } else { first = ''; nerr = 0; }
    var st = { hot: '', cls: '', va: '', vb: '', objs: [], bad: {}, compile: '', errs: 0, errText: '', ran: false, out: [], exc: '', made: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errClass = this.errClass, errInit = this.errInit;

    // 1. class Card 선언을 읽는다
    st.hot = 'cl';
    if (c.decl) {
      st.cls = 'known';
      st.checks.push(['class Card 선언', { v: '읽음', cls: 'good' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. 먼저 class Card 선언을 읽고, owner라는 값(필드)과 show라는 메서드를 가진 Card 클래스를 알게 됩니다. 클래스는 설계도입니다. 설계도를 적어 두었을 뿐이어서, 이 선언만으로는 Card 객체가 하나도 만들어지지 않습니다.', '');
    } else {
      st.cls = 'missing';
      st.checks.push(['class Card 선언', { v: '없음', cls: 'bad' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. class Card 선언이 코드 어디에도 없으므로, Card라는 클래스는 알려진 것이 없습니다. 설계도가 없으면 그 설계도로 만들 객체도 생각할 수 없습니다.', '');
    }

    // 2. 변수 a의 줄을 확인한다
    st.hot = 'va';
    if (!c.decl) {
      st.bad.va = true; fail(errClass);
      if (mk === 'new') { fail(errClass); st.checks.push([A + ' 줄', { v: '오류 2개: Card를 찾을 수 없음', cls: 'bad' }]); }
      else st.checks.push([A + ' 줄', { v: '오류: Card를 찾을 수 없음', cls: 'bad' }]);
      push('컴파일러가 ' + A + ' 줄을 확인합니다. Card가 무엇인지 알지 못해 오류가 납니다(javac: cannot find symbol). ' + (mk === 'new' ? '이 줄에는 Card를 변수 a의 타입으로 한 번, new 뒤에 한 번 써서 같은 오류가 2개 납니다.' : '이 줄에는 Card를 변수 a의 타입으로 쓴 한 번뿐이라 오류가 1개입니다.') + '', 'bad');
    } else if (mk === 'new') {
      st.checks.push([A + ' 줄', { v: '통과', cls: 'good' }]);
      push('컴파일러가 ' + A + ' 줄을 확인합니다. Card 클래스가 있으므로 new Card()를 쓸 수 있습니다. 컴파일러는 이 줄을 실행하지 않고 확인만 합니다. 객체는 프로그램을 실행할 때 이 줄에서 만들어집니다.', 'good');
    } else if (mk === 'none') {
      st.va = 'none';
      st.checks.push([A + ' 줄', { v: '통과: 변수만 선언', cls: '' }]);
      push('컴파일러가 ' + A + ' 줄을 확인합니다. Card 객체를 담을 변수 a를 선언하는 줄입니다. 값을 담는 줄이 아니라 변수만 선언한 것이므로, 이 줄 자체는 오류가 아닙니다.', '');
    } else {
      st.checks.push([A + ' 줄', { v: '통과', cls: 'good' }]);
      push('컴파일러가 ' + A + ' 줄을 확인합니다. null은 가리키는 객체가 없다는 값입니다. 변수 a에 값(null)을 담는 줄이고 Card 클래스도 있으므로, 컴파일러는 이 줄을 통과시킵니다.', 'good');
    }

    // 3. a.owner, a.show() 줄 (선언이 있을 때)
    if (!c.decl) {
      st.checks.push(['a.owner, a.show() 줄', { v: '오류 아님', cls: '' }]);
      push('컴파일러가 a.owner = "김철수"; 와 a.show(); 줄을 확인합니다. 이 줄들에는 Card라는 이름이 없고, javac는 타입을 찾지 못한 변수 a를 쓰는 줄에 오류를 더 알리지 않습니다. 오류는 Card를 쓴 줄에서만 납니다.', '');
    } else {
      if (mk === 'none') {
        st.bad.va = true; fail(errInit);
        st.checks.push(['a.owner 줄', { v: '오류: 값을 담지 않은 변수', cls: 'bad' }]);
        push('컴파일러가 a.owner = "김철수"; 줄을 확인합니다. 값을 담은 적이 없는 변수 a를 쓰고 있어 오류가 납니다(javac: variable a might not have been initialized). 같은 변수를 쓰는 a.show() 줄에서는 같은 오류를 또 알리지 않아, 알린 오류는 1개입니다.', 'bad');
      } else {
        st.checks.push(['a.owner, a.show() 줄', { v: '통과', cls: 'good' }]);
        push('컴파일러가 a.owner = "김철수"; 와 a.show(); 줄을 확인합니다. Card에 owner 필드와 show 메서드가 있고 변수 a에 값이 담겨 있으므로 오류가 없습니다.' + (mk === 'null' ? ' a에 담은 것이 null이라는 점은 컴파일러가 오류로 알리지 않습니다. 가리키는 객체가 있는지는 실행해 봐야 드러납니다.' : ''), 'good');
      }
    }

    // 4. b 줄들
    if (c.two && (mk !== 'none' || !c.decl)) {
      st.hot = 'vb';
      if (!c.decl) {
        st.bad.vb = true; fail(errClass); fail(errClass);
        st.checks.push([B + ' 줄', { v: '오류 2개: Card를 찾을 수 없음', cls: 'bad' }]);
        push('컴파일러가 ' + B + ' 줄을 확인합니다. 이 줄에서도 Card를 변수 b의 타입으로, new 뒤에 한 번씩 써서 같은 오류가 2개 납니다. 알린 오류는 모두 ' + nerr + '개입니다.', 'bad');
      } else {
        st.checks.push(['b 줄들과 마지막 a.show()', { v: '통과', cls: 'good' }]);
        push('컴파일러가 ' + B + ' 줄과 그 아래 줄들을 확인합니다. 같은 Card 클래스로 new Card()를 한 번 더 쓰는 것이어서 오류가 없습니다.', 'good');
      }
    }

    // 5. 컴파일 결과
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다. 지금까지 만들어진 Card 객체는 0개입니다. 컴파일은 소스를 확인할 뿐 new를 실행하지 않습니다.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + nerr + '개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 ' + nerr + '개이고, 첫 번째 오류는 "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없고, 만들어진 Card 객체는 0개입니다.', 'bad');
    }

    // 6. 실행
    if (ok) {
      st.ran = true;
      push('java Main으로 실행합니다. 실행은 main 메서드부터 시작합니다. 설계도인 Card 클래스는 코드에 있지만, 만들어진 Card 객체는 아직 0개입니다.', '');
      if (mk === 'new') {
        st.hot = 'o0'; st.objs.push(null); st.made = 1;
        push('Card a = new Card(); 줄이 실행됩니다. new Card()가 Card 설계도대로 객체를 하나 만듭니다. 이 객체의 owner에는 아직 값을 담지 않아서 null, 즉 비어 있습니다.', 'good');
        st.hot = 'va'; st.va = 'ref';
        push('같은 줄에서 = 가 만들어진 객체를 변수 a에 담습니다. 변수 a에 담기는 것은 객체 자체가 아니라 객체가 있는 곳을 가리키는 참조여서, a가 그 객체를 가리키게 됩니다.', '');
        st.hot = 'o0'; st.objs[0] = '김철수';
        push('a.owner = "김철수"; 줄이 실행됩니다. a가 가리키는 객체의 owner에 "김철수"를 담습니다.', '');
        st.out.push('김철수의 카드');
        push('a.show(); 줄이 실행됩니다. a가 가리키는 객체의 show 메서드가 실행되어, 그 객체의 owner를 읽고 "김철수의 카드"를 출력합니다. show는 설계도에 적힌 메서드이고, 읽는 owner는 객체에 담긴 값입니다.', 'good');
        if (c.two) {
          st.hot = 'o1'; st.objs.push(null); st.made = 2; st.vb = 'ref';
          push('Card b = new Card(); 줄이 실행됩니다. new Card()가 Card 설계도대로 객체를 하나 더 만들어 변수 b가 가리키게 합니다. 이 객체의 owner도 비어 있고, a가 가리키는 객체와는 별개입니다. new를 실행할 때마다 객체가 하나씩 생깁니다.', 'good');
          st.objs[1] = '이영희';
          push('b.owner = "이영희"; 줄이 실행됩니다. b가 가리키는 객체의 owner에 "이영희"를 담습니다. a가 가리키는 객체의 owner는 바뀌지 않습니다.', '');
          st.out.push('이영희의 카드');
          push('b.show(); 줄이 실행됩니다. b가 가리키는 객체의 owner를 읽어 "이영희의 카드"를 출력합니다. 같은 show 메서드라도 어느 객체에게 시켰는지에 따라 읽는 owner가 다릅니다.', 'good');
          st.hot = 'o0'; st.out.push('김철수의 카드');
          push('a.show(); 줄이 한 번 더 실행됩니다. a가 가리키는 객체의 owner는 그대로 "김철수"이므로 "김철수의 카드"를 출력합니다. 객체마다 owner를 따로 가지기 때문입니다.', 'good');
        }
      } else {
        st.hot = 'va'; st.va = 'null';
        push('Card a = null; 줄이 실행됩니다. 변수 a에 null이 담깁니다. new를 실행하지 않았으므로 만들어진 Card 객체는 0개이고, a는 아무것도 가리키지 않습니다.', '');
        st.exc = 'NullPointerException'; st.bad.va = true;
        push('a.owner = "김철수"; 줄이 실행됩니다. a가 가리키는 객체가 없는데 그 객체의 owner에 값을 담으려 해서 NullPointerException이 일어납니다. 예외를 처리하는 코드가 없으므로 프로그램은 여기서 멈춥니다. 컴파일러는 이 줄을 통과시켰지만, 객체가 없다는 것은 실행하는 중에야 드러났습니다.', 'bad');
        if (c.two) {
          st.hot = '';
          push('프로그램이 멈췄으므로 그 아래 줄들은 실행되지 않습니다. Card b = new Card(); 줄도 실행되지 않아서, 만들어진 Card 객체는 끝까지 0개입니다.', 'bad');
        }
      }
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (!c.decl) {
      sum.push('class Card 선언이 없으면 Card라는 설계도가 없습니다. 컴파일러가 Card라는 클래스를 찾을 수 없다고 알려 주어 컴파일에 실패했고, new Card()로 객체를 만들 수도, 실행할 수도 없었습니다.');
      sum.push('오류가 난 곳은 Card를 쓴 줄입니다(알린 오류 ' + nerr + '개). 객체를 만들려면 먼저 클래스로 설계도를 선언해야 합니다.');
    } else if (mk === 'none') {
      sum.push('변수만 선언하고 new로 객체를 만들지 않으면 변수에 담긴 것이 없습니다. 컴파일러가 값을 담지 않은 변수 a를 썼다고 알려 주어 컴파일에 실패했고, 실행할 수 없었습니다. 만들어진 Card 객체는 0개입니다.');
      sum.push('class Card 선언이 있어도 객체는 저절로 생기지 않습니다. 객체는 new를 실행해야 생깁니다.' + (c.two ? ' b 줄에는 문제가 없었지만 컴파일이 실패해 실행되지 않았습니다.' : ''));
    } else if (mk === 'null') {
      sum.push('null을 담으면 컴파일은 성공하지만, a가 가리키는 객체가 없어서 a.owner 줄에서 NullPointerException으로 멈췄습니다. 만들어진 Card 객체는 0개입니다.');
      sum.push('변수가 있는 것과 객체가 있는 것은 다릅니다. 객체 없이는 그 객체의 필드나 메서드를 쓸 수 없고, 컴파일러는 이를 미리 알려 주지 않아 실행하는 중에 드러납니다.' + (c.two ? ' 멈춘 뒤의 줄은 실행되지 않아 b의 객체도 만들어지지 않았습니다.' : ''));
    } else if (c.two) {
      sum.push('new Card()를 실행할 때마다 객체가 하나씩 생겨, 같은 Card 클래스로 객체 2개가 만들어졌습니다. 객체마다 owner를 따로 가져서 a가 가리키는 객체는 김철수, b가 가리키는 객체는 이영희였습니다.');
      sum.push('b의 owner에 값을 담아도 a가 가리키는 객체의 owner는 바뀌지 않았습니다. 설계도는 하나여도 객체는 서로 별개이고, show 메서드는 부른 객체의 owner를 읽습니다.');
    } else {
      sum.push('클래스는 class로 적는 설계도이고, 객체는 new로 그 설계도대로 만든 실제 것입니다. class Card는 owner와 show를 갖는다고 적어 둘 뿐 객체를 만들지 않았고, new Card()를 실행하자 Card 객체가 하나 생겼습니다.');
      sum.push('변수 a는 그 객체를 가리킬 뿐이고, owner의 값은 객체에 담겼습니다. a.show()는 설계도에 적힌 메서드를 a가 가리키는 객체에게 시킨 것이어서, 그 객체의 owner를 읽어 출력했습니다.');
    }
    var run = !ok ? '실행할 수 없음' : st.exc ? 'NullPointerException으로 멈춤' : st.out.join(' / ');
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? '성공' : '오류', ok ? '없음' : first, run, st.made + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일');
    if (s.out.length || s.exc) H.table(v, ['실행 결과'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }).concat(s.exc ? [{ cls: '', cells: [{ v: s.exc + '으로 멈춤', cls: 'bad' }] }] : []), '출력');
    H.counters(v, [[s.made, '만들어진 Card 객체'], [s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 왼쪽에 Card 클래스(설계도), 가운데에 변수 a와 b, 오른쪽에 new로 만들어진 Card 객체(owner 값 표시). 변수에서 객체로 가는 화살표는 변수가 객체를 가리킬 때만 있다. 아래에 컴파일 결과, 실행 결과, 만들어진 객체 수.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 306);
    var hot = s ? s.hot : '', bad = s ? s.bad : {}, err = s && s.compile === 'err', objs = s ? s.objs : [];
    P.box('cl', 14, 20, 190, 120, { cls: !c.decl ? 'ghost' : hot === 'cl' ? 'hot now' : 'plain', title: 'Card (클래스, 설계도)', sub: c.decl ? ['owner (필드)', 'show() (메서드)'] : '선언 없음' });
    var vsub = function (st) { return { '': '아직 없음', none: '값이 담기지 않음', 'null': 'null', ref: '객체를 가리킴' }[st || '']; };
    P.box('va', 262, 20, 120, 56, { cls: bad.va ? 'bad' : hot === 'va' ? 'hot now' : s && s.va === 'ref' ? 'good' : s && s.va ? 'plain' : 'ghost', title: 'Card a', sub: vsub(s && s.va) });
    if (c.two) P.box('vb', 262, 88, 120, 56, { cls: bad.vb ? 'bad' : hot === 'vb' ? 'hot now' : s && s.vb === 'ref' ? 'good' : 'ghost', title: 'Card b', sub: vsub(s && s.vb) });
    var osub = function (i) { return objs.length > i ? (objs[i] ? 'owner: ' + objs[i] : 'owner: 비어 있음 (null)') : err || (s && s.exc) ? '만들어지지 않음' : '아직 없음'; };
    P.box('o0', 440, 20, 226, 56, { cls: objs.length > 0 ? (hot === 'o0' ? 'good now' : 'good') : 'ghost', title: 'Card 객체', sub: osub(0) });
    if (c.two) P.box('o1', 440, 88, 226, 56, { cls: objs.length > 1 ? (hot === 'o1' ? 'good now' : 'good') : 'ghost', title: 'Card 객체', sub: osub(1) });
    if (s && s.va === 'ref') P.arrow('ra', 'va:r', 'o0:l', { cls: 'good' });
    if (s && s.vb === 'ref') P.arrow('rb', 'vb:r', 'o1:l', { cls: 'good' });
    P.box('r1', 14, 160, 652, 44, { cls: s && s.compile === 'ok' ? 'good' : err ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 212, 652, 36, { cls: s && s.exc ? 'bad' : s && s.ran ? 'good' : err ? 'bad' : 'ghost', title: '실행 결과', right: s && s.exc ? s.exc + '으로 멈춤' : s && s.ran ? (s.out.length ? s.out.join(' / ') : '(아직 출력 없음)') : err ? '실행할 수 없음' : '' });
    P.box('n1', 14, 256, 652, 36, { cls: s && s.made ? 'good' : 'ghost', title: '만들어진 Card 객체', right: (s ? s.made : 0) + '개' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 열두 가지 조합을 모두, 화면의 코드와 같은 소스를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력과 예외를 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드(compiler.err.cant.resolve.location, var.might.not.have.been.initialized를 화면의 두 가지 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력, 실행 중 예외의 종류입니다. 만들어진 Card 객체의 수는 짐작이 아니라 실측했습니다. 대조용 소스에만 Card 안에 객체가 만들어질 때마다 숫자를 올리는 줄(인스턴스 초기화 블록)을 더해 실행 뒤에 읽었고, 대조 스크립트는 화면의 코드와 견줄 때 그 한 줄을 뺍니다. 컴파일에 실패한 조합은 실행하지 않았으므로 0개입니다. null을 담은 조합의 예외는 NullPointerException이고 메시지는 a.owner에 값을 담으려다 변수가 null이었다는 내용이었으며, 이 예외가 a.owner 줄에서 나므로 그 아래의 b 줄은 실행되지 않아 객체는 0개였습니다. 새로 만든 객체의 owner가 값을 담기 전에는 null이라는 단계 문장의 설명도 따로 실행해(new Card().show()가 null의 카드를 출력) 확인했습니다. 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. 클래스 선언이 클래스를 정하는 것은 8.1절, 필드와, static이 아닌 필드는 인스턴스가 만들어질 때마다 인스턴스마다 새로 생긴다는 것은 8.3절과 8.3.1.1절, 객체가 클래스 인스턴스 또는 배열이고 참조는 객체를 가리키는 포인터이며 아무것도 가리키지 않는 null 참조가 있다는 것은 4.3.1절, new를 평가할 때마다 새 객체가 만들어지고 필드는 기본값으로 채워진다는 것은 15.9.4절, 참조 타입의 기본값이 null이라는 것은 4.12.5절, 객체 없이(null로) 인스턴스 필드에 접근하거나 인스턴스 메서드를 부르면 NullPointerException이라는 것은 15.11.1절과 15.12.4.4절, 값을 담지 않은 지역 변수를 읽으면 컴파일 오류라는 것은 16장 서두를 따랐습니다. 명세 15.26.1절(필드에 값을 담는 식의 평가 순서)은 열어 확인하지 못했고, 이 실습은 그 순서에 기대지 않습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. class Card 선언이 없을 때는 Card를 쓴 자리마다 오류가 하나씩 났고(new가 있는 줄은 변수의 타입과 new 뒤, 두 개), Card의 필드나 메서드를 쓰는 줄은 따로 오류가 나지 않았습니다. 값을 담지 않은 변수는 처음 쓴 줄에서만 오류가 났습니다. 화면의 코드는 클래스가 한 파일에 같이 있는 모양이고 패키지와 접근 제어자는 줄였습니다. 클래스는 필드와 메서드 말고도 생성자 등을 가질 수 있고 객체가 메모리의 어디에 놓이는지도 있지만 이 실습은 다루지 않았습니다. 변수와 객체가 놓이는 곳은 "세부 동작 실습: 스택과 힙"에서 다룹니다.',
});
