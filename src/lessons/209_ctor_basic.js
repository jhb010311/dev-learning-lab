Lab.register({
  id: 'ctor_basic', nav: '생성자', cat: '기초개념', mode: 'step', basic: true, deep: ['ctor'],
  title: '생성자는 무엇이고, 언제 실행되는가',
  why: '생성자에서 값을 받지 않으면 객체를 new로 만든 뒤 필드를 한 줄씩 따로 채워야 하는데, 한 줄을 빠뜨려도 컴파일러는 알려 주지 않아서 이름이 null인 객체가 그대로 쓰인다. 생성자는 객체를 만드는 순간 꼭 필요한 값을 받아 필드를 채우게 하고, 값을 받는 생성자만 적어 두면 그 값 없이는 객체를 만들 수 없게 막는다.',
  use: 'new ArrayList<>()나 new StringBuilder("시작")처럼 자바가 주는 클래스도 생성자로 객체의 처음 상태를 정한다. 만든 뒤 바뀌면 안 되는 필드는 final로 선언하고 생성자에서 한 번만 채운다. 스프링에서는 클래스가 일에 필요한 다른 객체를 생성자의 매개변수로 받아 두는 방식을 흔히 쓴다.',
  intro: '생성자는 클래스 안에 적는 코드 묶음입니다. 이름이 클래스 이름과 같고 반환 타입을 적지 않는다는 점이 메서드와 다릅니다. 메서드는 우리가 이름으로 불러야 실행되지만, 생성자는 new Card("김철수")를 실행할 때마다 한 번씩 실행되어 새로 만든 객체의 필드를 채웁니다(Card는 이 실습에서 예시로 만든 클래스입니다). 생성자를 하나도 적지 않으면 컴파일러가 아무 일도 하지 않는 생성자를 대신 넣습니다. 이 실습은 Card(String owner) 생성자를 지우거나 객체를 만드는 줄을 new Card()로 바꿔 가며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주고 생성자가 몇 번 실행되는지를 봅니다.',
  terms: ['생성자', '기본 생성자', 'this', '필드의 기본값'],
  controls: [
    { id: 'ctor', label: 'Card(String owner) 생성자를 적는다', type: 'check', value: true },
    { id: 'arg', label: '객체를 만드는 줄', type: 'select', value: 'name', options: [['name', 'new Card("김철수")로 만든다'], ['empty', 'new Card()로 만든다']] },
    { id: 'two', label: '객체를 하나 더 만든다', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '생성자는 어떻게 생겼고, new Card("김철수")를 하면 무슨 일이 일어나나', d: '생성자가 있고 값을 넘겨 만듭니다. new가 생성자를 한 번 실행해 owner를 채우고, "김철수"가 출력됩니다.', v: { ctor: true, arg: 'name', two: false } },
    { t: '객체를 하나 더 만들면', q: '객체를 하나 더 만들면', d: 'new를 한 번 더 했으므로 생성자도 한 번 더 실행됩니다. 두 객체의 owner가 따로 채워집니다.', v: { ctor: true, arg: 'name', two: true } },
    { t: '생성자를 지우고 new Card()로 만들면', q: '생성자를 지우고 new Card()로 만들면', d: '컴파일러가 기본 생성자를 대신 넣어 컴파일됩니다. owner를 채우는 코드가 없어 null이 출력됩니다.', v: { ctor: false, arg: 'empty', two: false } },
    { t: '생성자를 지우고 값을 넘기면', q: '생성자를 지우고 new Card("김철수")는 그대로 두면', d: '값을 받는 생성자가 없어 컴파일 오류가 납니다.', v: { ctor: false, arg: 'name', two: false } },
    { t: '생성자를 둔 채 값 없이 만들면', q: '생성자를 둔 채 new Card()로 만들면', d: '값을 받는 생성자를 적었으므로 값 없이 만드는 것은 컴파일 오류가 납니다.', v: { ctor: true, arg: 'empty', two: false } },
  ],
  // 컴파일러가 알려 주는 오류의 종류(실제 javac의 진단 코드 compiler.err.cant.apply.symbol을 두 경우로 나누어 옮긴 것)
  errGiven: 'Card의 생성자는 값을 받지 않는데 값을 넘겼음',
  errNeed: 'Card의 생성자는 값을 받아야 하는데 값 없이 만들었음',
  code: function (c) {
    var o = ['class Card {', '    String owner;'];
    if (c.ctor) o.push('    // 생성자: 클래스와 이름이 같다. new Card(...)를 할 때 실행된다', '    Card(String owner) {', '        System.out.println("생성자 실행");', '        this.owner = owner;', '    }');
    o.push('}', '', 'public class Main {', '    public static void main(String[] args) {');
    o.push('        Card a = new Card(' + (c.arg === 'name' ? '"김철수"' : '') + ');', '        System.out.println(a.owner);');
    if (c.two) o.push('        Card b = new Card(' + (c.arg === 'name' ? '"이영희"' : '') + ');', '        System.out.println(b.owner);');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.ctor ? '생성자 있음' : '생성자 없음') + ' · ' + (c.arg === 'name' ? 'new Card("김철수")' : 'new Card()') + ' · ' + (c.two ? '객체 2개' : '객체 1개'); },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력', '"생성자 실행"이 출력된 횟수'],
  simulate: function (c) {
    var ev = [], sum = [], name = c.arg === 'name', two = !!c.two;
    var ok = c.ctor === name;
    var vars = two ? ['a', 'b'] : ['a'], vals = ['김철수', '이영희'];
    function call(i) { return 'new Card(' + (name ? '"' + vals[i] + '"' : '') + ')'; }
    function line(i) { return 'Card ' + vars[i] + ' = ' + call(i) + ';'; }
    var first = ok ? '' : c.ctor ? this.errNeed : this.errGiven;
    var nerr = ok ? 0 : vars.length;
    var errAt = ok ? [] : vars.map(function (v, i) { return line(i); });
    var st = { hot: [], bad: {}, cdef: false, cur: -1, phase: '', objs: [], param: '', runs: 0, compile: '', errs: 0, errText: '', outs: [], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }

    // 1. class Card를 읽는다
    st.hot = ['ct']; st.cdef = true;
    if (c.ctor) {
      st.checks.push(['Card의 생성자', { v: '작성함: Card(String owner)', cls: 'good' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. class Card 안에 Card(String owner)가 있습니다. 클래스와 이름이 같고 앞에 반환 타입이 없으므로 이것이 생성자입니다. String 값 하나를 받도록 적혀 있습니다.', '');
    } else {
      st.checks.push(['Card의 생성자', { v: '없음: 컴파일러가 Card()를 넣음', cls: '' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. class Card 안에는 생성자가 하나도 없습니다. 이럴 때는 컴파일러가 값을 받지 않고 필드에 아무 값도 넣지 않는 생성자 Card()를 대신 넣습니다(기본 생성자). 우리가 쓴 코드는 그대로이고, 컴파일된 Card 클래스 안에 이 생성자가 들어갑니다.', '');
    }

    // 2. new Card(...) 줄마다, 넘긴 값에 맞는 생성자가 있는지 확인한다
    vars.forEach(function (v, i) {
      st.hot = ['nw', 'ct']; st.cur = i; st.phase = 'chk';
      var head = i === 0, given = name ? 'String 값 하나를 넘겼고' : '값을 넘기지 않았고';
      if (ok) {
        st.checks.push([call(i) + ' 줄', { v: '맞는 생성자가 있음', cls: 'good' }]);
        if (head && c.ctor) push('컴파일러가 Main의 ' + line(i) + ' 줄을 확인합니다. new로 객체를 만들 때는 넘긴 값에 맞는 생성자가 Card에 있어야 합니다. ' + given + ', Card(String owner)가 String 값 하나를 받으므로 맞습니다.', 'good');
        else if (head) push('컴파일러가 Main의 ' + line(i) + ' 줄을 확인합니다. new로 객체를 만들 때는 넘긴 값에 맞는 생성자가 Card에 있어야 합니다. ' + given + ', 컴파일러가 넣은 Card()도 값을 받지 않으므로 맞습니다. 생성자를 하나도 적지 않은 덕분에 값 없이 만들 수 있습니다.', 'good');
        else push('컴파일러가 Main의 ' + line(i) + ' 줄을 확인합니다. 앞의 줄과 같은 생성자가 맞으므로 이 줄도 맞습니다.', 'good');
      } else {
        st.bad.nw = true; fail(first);
        st.checks.push([call(i) + ' 줄', { v: '오류: 맞는 생성자가 없음', cls: 'bad' }]);
        if (head && c.ctor) push('컴파일러가 Main의 ' + line(i) + ' 줄을 확인합니다. 값을 넘기지 않았는데 Card의 생성자는 String 값을 받는 Card(String owner) 하나뿐이어서, 맞는 것이 없습니다. 오류입니다(javac: constructor Card in class Card cannot be applied to given types). 생성자를 하나라도 적으면 컴파일러는 값을 받지 않는 Card()를 넣지 않습니다. 그래서 값 없이 만드는 길이 없습니다.', 'bad');
        else if (head) push('컴파일러가 Main의 ' + line(i) + ' 줄을 확인합니다. String 값을 넘겼는데 Card의 생성자는 값을 받지 않는, 컴파일러가 넣은 Card() 하나뿐이어서 맞는 것이 없습니다. 오류입니다(javac: constructor Card in class Card cannot be applied to given types). 값을 받아 쓰려면 그 값을 받는 생성자를 우리가 적어야 합니다.', 'bad');
        else push('컴파일러가 Main의 ' + line(i) + ' 줄을 확인합니다. 앞의 줄과 같은 이유로 이 줄도 오류입니다. javac는 오류를 2개 모두 알립니다.', 'bad');
      }
    });

    // 3. 컴파일 결과
    st.hot = []; st.phase = ''; st.cur = -1;
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다. 넘긴 값에 맞는 생성자가 있는지는 실행할 때가 아니라, 지금 컴파일러가 컴파일하면서 확인했습니다.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + nerr + '개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 ' + nerr + '개이고, 첫 번째 오류는 "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없습니다. 객체가 만들어지는 일도, 생성자가 실행되는 일도 없었습니다.', 'bad');
    }

    // 4. 실행: new를 만날 때마다 객체를 만들고 생성자를 실행한다
    if (ok) {
      vars.forEach(function (v, i) {
        var head = i === 0, val = '"' + vals[i] + '"';
        st.cur = i; st.hot = ['nw', 'o' + i]; st.phase = 'make'; st.objs.push({ owner: null });
        push(head ? 'java Main으로 실행합니다. main이 시작되고, ' + line(i) + ' 줄에서 new를 만나면 자바가 먼저 새 Card 객체를 만듭니다. 이 객체의 owner에는 아직 아무 값도 들어가지 않아 비어 있습니다(null).' : line(i) + ' 줄에서 new를 만나면, 자바가 또 새 Card 객체를 만듭니다. 앞의 a와는 다른 객체이고, 이 객체의 owner도 비어 있습니다(null).', '');
        st.hot = ['nw', 'ct']; st.phase = 'ctor';
        if (c.ctor) {
          st.param = vals[i];
          push(head ? '이어서 자바가 Card 생성자를 실행합니다. 우리가 쓴 코드에는 생성자를 부르는 줄이 없습니다. 생성자를 실행시킨 것은 new입니다. 매개변수 owner가 넘긴 ' + val + '를 가리킵니다.' : 'new ' + 'Card(' + val + ')가 이번에도 생성자를 실행합니다. 매개변수 owner가 ' + val + '를 가리킵니다.', '');
          st.hot = ['ct']; st.outs.push('생성자 실행'); st.runs++;
          push(head ? '생성자 안의 System.out.println("생성자 실행")이 실행되어 "생성자 실행"이 출력됩니다. 이 줄은 new를 할 때마다 생성자가 실행되는 것을 눈으로 보려고 넣었습니다.' : 'System.out.println("생성자 실행")이 또 실행되어 "생성자 실행"이 출력됩니다. 생성자는 new를 할 때마다 한 번씩 실행됩니다.', 'good');
          st.hot = ['ct', 'o' + i]; st.phase = 'fill'; st.objs[i].owner = vals[i];
          push(head ? 'this.owner = owner가 실행됩니다. this는 지금 만들어지는 그 객체입니다. 매개변수 owner가 가리키는 ' + val + '를 그 객체의 필드 owner도 가리키게 됩니다. 이름이 같은 필드와 매개변수를 this.owner(필드)와 owner(매개변수)로 구분합니다. 생성자가 끝나면 변수 a가 이 객체를 가리킵니다.' : 'this.owner = owner가 실행됩니다. 이번에는 두 번째 객체가 this이고, 그 객체의 owner가 ' + val + '를 가리키게 됩니다. 첫 번째 객체의 owner는 "' + vals[0] + '" 그대로입니다.', '');
          st.param = '';
        } else {
          push(head ? '이어서 자바가 생성자를 실행합니다. 우리는 생성자를 적지 않았으므로, 컴파일러가 대신 넣은 Card()가 실행됩니다. 이 생성자는 owner에 아무 값도 넣지 않아서 객체의 owner는 비어 있는 그대로입니다. "생성자 실행"을 출력하는 줄은 우리가 쓴 생성자 안에 있는데 그 생성자가 없으므로, 이번에는 아무것도 출력되지 않습니다. 그래서 "생성자 실행" 출력 칸은 0번 그대로입니다. 생성자가 실행되지 않은 것이 아니라, 실행된 Card()에 출력하는 줄이 없는 것입니다.' : 'new가 이번에도 컴파일러가 넣은 Card()를 실행합니다. 두 번째 객체의 owner도 비어 있는 그대로입니다.', '');
        }
        st.hot = ['o' + i]; st.phase = 'print'; st.outs.push(c.ctor ? vals[i] : 'null');
        push('System.out.println(' + v + '.owner)가 실행됩니다. ' + (c.ctor ? v + '가 가리키는 객체의 필드 owner를 읽어 "' + vals[i] + '"가 출력됩니다.' : 'owner에는 값이 들어간 적이 없어 null이 출력됩니다.'), 'good');
      });
      st.hot = []; st.phase = '';
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (ok && c.ctor && !two) {
      sum.push('생성자는 클래스 안에 적는, 클래스와 이름이 같고 반환 타입이 없는 코드 묶음입니다. 일반 메서드와 다른 곳은 우리가 이름으로 부르지 않는다는 점입니다. new Card("김철수")를 실행하자 자바가 새 객체를 만들고 이어서 생성자가 실행되어, 새 객체의 owner가 매개변수로 받은 "김철수"를 가리키게 했습니다.');
      sum.push('우리가 쓴 코드에는 생성자를 부르는 줄이 없었습니다. 생성자를 실행시킨 것은 new입니다. 넘긴 값에 맞는 생성자가 있는지는 실행할 때가 아니라 컴파일러가 컴파일할 때 확인했습니다.');
    } else if (ok && c.ctor) {
      sum.push('new Card(...)를 두 번 실행했으므로 생성자도 두 번 실행되었습니다. 출력에서 "생성자 실행"이 두 줄입니다. 생성자는 객체를 만들 때마다 한 번씩 실행됩니다.');
      sum.push('a와 b가 가리키는 것은 서로 다른 객체이고, 생성자가 각 객체의 owner를 따로 채웠습니다("김철수"와 "이영희"). 생성자를 한 번 적어 두면 객체를 몇 개 만들어도 같은 방식으로 필드가 채워집니다.');
    } else if (ok) {
      sum.push('생성자를 하나도 적지 않아도 new Card()는 컴파일됩니다. 컴파일러가 값을 받지 않고 아무 값도 넣지 않는 기본 생성자를 대신 넣기 때문입니다. 다만 owner를 채우는 코드가 없어서 owner는 비어 있는 그대로이고, 출력은 null이었습니다.');
      sum.push('우리가 적은 생성자가 없으므로 "생성자 실행"은 한 번도 출력되지 않았습니다(0번). 컴파일러가 넣은 Card()는 new를 할 때마다 실행되었지만 출력하는 줄이 없습니다.' + (two ? ' new를 두 번 했으므로 객체는 두 개 만들어졌고 둘 다 owner가 null이었습니다.' : '') + ' 객체는 생성자를 적었든 아니든 new가 만들고, 생성자는 그 객체의 필드를 채우는 일을 맡습니다.');
    } else if (!c.ctor) {
      sum.push('Card에 생성자를 적지 않았으므로 컴파일러가 넣은 것은 값을 받지 않는 Card() 하나뿐입니다. 그래서 new Card("김철수")는 컴파일 오류입니다. 컴파일에 실패해 실행할 수 없었습니다.' + (two ? ' 오류가 난 곳은 new 줄 두 군데였습니다.' : ''));
      sum.push('컴파일러가 기본 생성자를 넣는 것은 생성자를 하나도 적지 않았을 때뿐입니다. 값을 받아 필드를 채우려면 그 값을 받는 생성자를 우리가 적어야 합니다.');
    } else {
      sum.push('Card(String owner)를 적었으므로 값 없이 만드는 new Card()는 컴파일 오류입니다. 컴파일에 실패해 실행할 수 없었습니다.' + (two ? ' 오류가 난 곳은 new 줄 두 군데였습니다.' : ''));
      sum.push('생성자를 하나라도 적으면 컴파일러는 값을 받지 않는 기본 생성자를 넣지 않습니다. 값을 받는 생성자만 적으면, 그 클래스의 객체는 반드시 값을 넘겨서 만들게 됩니다.');
    }
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? '성공' : '오류', ok ? '없음' : first, ok ? st.outs.join(' / ') : '실행할 수 없음', ok ? st.runs + '번' : '실행할 수 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일');
    if (s.outs.length) H.table(v, ['실행했을 때 출력'], s.outs.map(function (o) { return { cls: '', cells: [o] }; }), '출력');
    if (s.compile === 'err') H.counters(v, [[s.errs, '컴파일러가 알린 오류']]);
    else H.counters(v, [[s.objs.length, '만들어진 객체'], [s.runs, '"생성자 실행" 출력']]);
  },
  // 그림: 왼쪽 위에 new 줄, 오른쪽에 새 Card 객체 상자(owner가 비어 있다가 채워짐), 왼쪽 가운데에 생성자 상자. new가 객체를 만들고 생성자를 실행시키는 것을 화살표로 보인다. 맨 아래에 컴파일 결과, 출력, 세는 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 380);
    var hot = s ? s.hot : [], bad = s ? s.bad : {}, phase = s ? s.phase : '', cur = s ? s.cur : -1;
    function on(id) { return hot.indexOf(id) >= 0; }
    var name = c.arg === 'name';
    var newText = 'new Card(' + (name ? '"' + (cur === 1 ? '이영희' : '김철수') + '"' : '') + ')';
    P.box('nw', 14, 20, 200, 56, { cls: bad.nw ? 'bad' : on('nw') ? 'hot now' : 'plain', title: newText, sub: phase === 'chk' ? '컴파일러가 확인 중' : phase === 'make' ? '객체를 만든다' : phase === 'ctor' ? '생성자를 실행시킨다' : 'Main에 적은 줄' });
    var csub = c.ctor ? ['Card(String owner)', '우리가 작성한 생성자'] : ['Card()', '컴파일러가 넣은 기본 생성자'];
    if (s && s.param && (phase === 'ctor' || phase === 'fill')) csub.push('매개변수 owner = "' + s.param + '"');
    if (!c.ctor && !(s && s.cdef)) csub = ['Card에 생성자를 적지 않음'];
    P.box('ct', 14, 130, 300, 96, { cls: on('ct') ? 'hot now' : !c.ctor && s && s.cdef ? 'wait' : !c.ctor ? 'ghost' : 'plain', title: '생성자', sub: csub });
    var n = c.two ? 2 : 1;
    for (var i = 0; i < n; i++) {
      var o = s && s.objs[i], vn = i === 0 ? 'a' : 'b';
      P.box('o' + i, 464, 20 + i * 76, 202, 56, { cls: o ? (on('o' + i) ? 'good now' : 'good') : s && s.compile === 'err' ? 'bad' : 'ghost', title: vn + '가 가리키는 Card 객체', sub: o ? 'owner: ' + (o.owner === null ? '비어 있음 (null)' : '"' + o.owner + '"') : s && s.compile === 'err' ? '만들어지지 않음' : '아직 없음' });
    }
    if (phase === 'chk') P.arrow('chk', 'nw:b:0.5', 'ct:t:0.33', { cls: s.compile === 'err' || bad.nw ? 'bad' : 'hot' });
    if (phase === 'ctor') P.arrow('chk', 'nw:b:0.5', 'ct:t:0.33', { cls: 'hot' });
    if (phase === 'make') P.arrow('mk', 'nw:r', 'o' + cur + ':l', { cls: 'hot', label: '객체를 만든다' });
    if (phase === 'fill') P.arrow('fill', 'ct:r:0.5', 'o' + cur + ':l', { cls: 'hot', label: '채운다' });
    P.box('r1', 14, 232, 652, 48, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 288, 652, 36, { cls: s && s.outs.length ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '실행했을 때 출력', right: s && s.outs.length ? s.outs.join(' / ') : s && s.compile === 'err' ? '실행할 수 없음' : '' });
    P.box('n1', 14, 332, 322, 36, { cls: s && s.runs ? 'good' : 'ghost', title: '"생성자 실행" 출력', right: (s ? s.runs : 0) + '번' });
    P.box('n2', 344, 332, 322, 36, { cls: s && s.objs.length ? 'wait' : 'ghost', title: '만들어진 객체', right: (s ? s.objs.length : 0) + '개' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 여덟 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드(compiler.err.cant.apply.symbol)와 메시지에 적힌 필요한 인자와 넘긴 인자(화면의 두 가지 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력, 그리고 출력에서 "생성자 실행" 줄을 센 횟수입니다. 생성자를 적지 않은 조합은 우리가 쓴 생성자가 없으므로 실행 횟수를 0번으로 적었습니다. 단계 문장이 기대는 사실도 따로 실행해 확인했습니다. 생성자를 적지 않은 Card의 클래스 파일에는 매개변수 없는 생성자가 하나 들어 있고, 값을 받는 생성자를 적은 Card에는 그 생성자 하나뿐이며, 생성자 본문이 시작될 때 새 객체의 owner는 이미 null이고 매개변수에는 넘긴 값이 들어 있으며, new가 끝나야 main의 다음 줄이 실행됩니다. 생성자를 a.Card("이영희")나 Card("이영희")처럼 이름으로 부르는 줄은 컴파일 오류(cannot find symbol)였습니다. 문서는 Java Language Specification(Java SE 21)을 WebFetch로 열어 확인했습니다. 생성자의 이름이 클래스의 단순 이름과 같아야 하고 메서드와 달리 반환 타입이 없으며 메서드 호출식으로 부를 수 없다는 것은 8.8절, 생성자를 하나도 적지 않은 클래스에만 매개변수 없는 기본 생성자가 암묵적으로 선언된다는 것은 8.8.9절, 컴파일할 때 넘긴 인자에 맞는 생성자를 고르며 맞는 것이 없으면 컴파일 오류라는 것은 15.9.3절, 실행할 때 객체를 만들고 필드를 기본값으로 채운 뒤 인자를 계산하고 생성자를 실행한다는 것은 15.9.4절, 생성자 안에서 this가 지금 만들어지는 객체를 뜻한다는 것은 15.8.3절을 따랐습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 오류가 여럿이면 javac는 모두 알리는데, 표에는 첫 번째 것만 적었습니다. 컴파일에 실패하면 Main 클래스 파일은 한 번도 만들어지지 않았고, 그래서 실행할 수 없다고 적었습니다. 화면의 코드는 Card 클래스를 package-private으로 두고 import 줄이 필요 없는 모양입니다. 생성자를 여러 개 두는 것(오버로딩), this(...)로 다른 생성자를 부르는 것, 상위 클래스 생성자 super(...), 필드 초기화식과 생성자의 실행 순서는 이 실습에서 다루지 않았고 "세부 동작 실습: 생성자"에서 다룹니다.',
});
