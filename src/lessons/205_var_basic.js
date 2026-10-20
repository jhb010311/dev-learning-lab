Lab.register({
  id: 'var_basic', nav: '변수와 타입', cat: '기초개념', mode: 'step', basic: true, deep: ['vars'],
  title: '변수는 무엇이고, 타입은 무엇을 정하는가',
  why: '계산에 쓰는 값을 매번 숫자로 직접 적으면, 같은 값을 여러 곳에 쓸 때 고칠 곳도 여러 곳이 되고, 나이가 한 살 늘어나는 것처럼 실행하는 동안 바뀌는 값을 이어서 쓸 수 없다. 변수는 값에 이름을 붙여 저장해 두고 그 이름으로 다시 읽고 바꾸게 하며, 자바는 변수마다 타입을 정하게 해서 엉뚱한 종류의 값을 쓰는 실수를 실행하기 전에 컴파일러가 잡게 한다.',
  use: '자바 코드 어디서나 본다. 사용자가 입력한 이름, 장바구니에 고른 상품의 개수와 합계, 반복하면서 지금 몇 번째인지 세는 i 같은 값이 모두 변수로 다뤄진다. 한 번 정한 뒤 바뀌면 안 되는 값은 final을 붙여 선언해서 다시 대입하지 못하게 한다.',
  intro: '변수는 값을 담아 두는 이름입니다. int age = 20;이라는 한 줄은 세 부분으로 되어 있습니다. int는 타입으로, 이 변수에는 정수만 담는다는 뜻입니다. age는 이름이고, 20은 처음에 담을 값입니다. 이 줄을 선언이라고 하며, 선언을 읽은 컴파일러는 "age는 int 변수다"라고 기억해 두고 그 뒤의 줄들이 이 기억에 맞는지 실행하기 전에 확인합니다. 이 실습은 타입 int를 지우고, 담는 값을 바꾸고, 값을 아예 담지 않기도 하며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주고 무엇이 출력되는지를 봅니다.',
  terms: ['변수', '선언과 초기화', '타입', '기본형과 참조형'],
  controls: [
    { id: 'type', label: '변수 이름 앞에 타입 int를 적는다', type: 'check', value: true },
    { id: 'value', label: '변수에 담는 값', type: 'select', value: 'num', options: [['num', '20을 담는다'], ['text', '"스무 살"을 담는다'], ['none', '값을 담지 않는다 (int age;)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '변수는 어떻게 생겼고, 무엇을 해 주나', d: '이름 age에 타입 int를 붙여 선언하고 20을 담습니다. 컴파일에 성공하고 21이 출력됩니다.', v: { type: true, value: 'num' } },
    { t: '타입 int를 지우면', q: '타입 int를 지우면', d: '컴파일러가 age가 무엇인지 몰라 선언하지 않은 이름이라는 오류가 납니다.', v: { type: false, value: 'num' } },
    { t: '"스무 살"을 담으면', q: '20 대신 "스무 살"을 담으면', d: 'int 변수에 글자를 담을 수 없다는 컴파일 오류가 납니다.', v: { type: true, value: 'text' } },
    { t: '값을 담지 않으면', q: '값을 담지 않고 선언만 하면', d: '변수는 만들어지지만, 값을 담기 전에 읽어서 컴파일 오류가 납니다.', v: { type: true, value: 'none' } },
  ],
  // 컴파일러가 알려 주는 오류의 종류(실제 javac의 진단 코드를 옮긴 것)
  errName: '선언하지 않은 이름 age',
  errType: 'int 변수에 글자를 담을 수 없음',
  errInit: '값을 담지 않은 변수를 읽음',
  // 선언 줄 위의 주석과 선언 줄(타입이 없으면 주석 없이 값을 담는 줄만, 타입도 값도 없으면 줄이 없다)
  decl: function (c) {
    var lit = { num: '20', text: '"스무 살"', none: '' }[c.value];
    if (!c.type) return lit ? [null, 'age = ' + lit + ';'] : [null, null];
    return [{ num: '선언: int 타입의 변수 age를 만들고 20을 담는다', text: '선언: int 타입의 변수 age를 만들고 "스무 살"을 담는다', none: '선언: int 타입의 변수 age를 만들기만 하고 값은 담지 않는다' }[c.value], 'int age' + (lit ? ' = ' + lit : '') + ';'];
  },
  code: function (c) {
    var d = this.decl(c), o = ['public class Main {', '    public static void main(String[] args) {'];
    if (d[0]) o.push('        // ' + d[0]);
    if (d[1]) o.push('        ' + d[1]);
    o.push('        age = age + 1;', '        System.out.println(age);', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.type ? '타입 int 있음' : '타입 int 없음') + ' · ' + { num: '20을 담음', text: '"스무 살"을 담음', none: '값을 담지 않음' }[c.value]; },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력'],
  simulate: function (c) {
    var ev = [], sum = [], tp = c.type, v = c.value;
    var L = this.decl(c)[1];
    var ok = tp && v === 'num';
    var first = ok ? '' : !tp ? this.errName : v === 'text' ? this.errType : this.errInit;
    var nerr = ok ? 0 : !tp ? (v === 'none' ? 3 : 4) : 1;
    var AGE = 'age = age + 1;', PRN = 'System.out.println(age);';
    var errAt = ok ? [] : !tp ? (v === 'none' ? [AGE, AGE, PRN] : [L, AGE, AGE, PRN]) : v === 'text' ? [L] : [AGE];
    // k1 선언 줄, k2 담을 값, k3 age를 읽는 줄: 각각 [글, 색]
    var st = { hot: '', k: { k1: ['', ''], k2: ['', ''], k3: ['', ''] }, cell: false, val: '', compile: '', errs: 0, errText: '', ran: false, out: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errName = this.errName, errType = this.errType, errInit = this.errInit;

    // 1. 선언 줄을 읽는다
    st.hot = 'k1';
    if (tp) {
      st.k.k1 = ['age는 int 변수', 'good'];
      st.checks.push(['선언 줄', { v: 'age는 int 변수라고 기억함', cls: 'good' }]);
      if (v === 'none') push('컴파일러가 main 안을 위에서부터 읽습니다. 먼저 ' + L + ' 줄을 읽습니다. 이 줄은 두 부분입니다. int는 타입으로, 정수만 담는다는 뜻입니다. age는 이름입니다. 담을 값은 적지 않았지만 변수를 만드는 선언으로는 이것으로 충분합니다. 컴파일러는 "age라는 이름은 int 타입의 변수다"라고 기억합니다.', 'good');
      else push('컴파일러가 main 안을 위에서부터 읽습니다. 먼저 ' + L + ' 줄을 읽습니다. 이 줄은 세 부분입니다. int는 타입으로, 정수만 담는다는 뜻입니다. age는 이름입니다. ' + (v === 'num' ? '20' : '"스무 살"') + '은 담을 값입니다. 컴파일러는 "age라는 이름은 int 타입의 변수다"라고 기억합니다.', 'good');
    } else if (v !== 'none') {
      fail(errName);
      st.k.k1 = ['age를 찾을 수 없음', 'bad'];
      st.checks.push(['선언 줄', { v: '오류: 선언하지 않은 이름 age', cls: 'bad' }]);
      push('컴파일러가 main 안을 위에서부터 읽습니다. 먼저 ' + L + ' 줄을 읽습니다. 이 줄은 age에 ' + (v === 'num' ? '20' : '"스무 살"') + '을 담으라는 뜻인데, age라는 이름을 선언한 곳이 어디에도 없고 이 줄에도 타입이 없어서 컴파일러는 age가 무엇인지 알지 못합니다. 이 줄에서 오류가 납니다(javac: cannot find symbol).' + (v === 'text' ? ' 이 줄의 오류는 이름을 찾지 못한 것 하나이고, "스무 살"이 int에 맞는지는 따로 알리지 않았습니다. 담을 변수를 알지 못하기 때문입니다.' : ''), 'bad');
    } else {
      st.k.k1 = ['선언한 줄이 없음', 'bad'];
      st.checks.push(['선언 줄', { v: '없음', cls: 'bad' }]);
      push('컴파일러가 main 안을 위에서부터 읽습니다. 변수를 선언하는 줄이 하나도 없으므로, 컴파일러가 age라는 이름에 대해 기억해 둔 것이 없습니다. 선언은 타입, 이름을 적은 줄이고, 이름을 쓴다고 변수가 생기지 않습니다. 이 단계에서는 아직 오류가 나지 않습니다.', '');
    }

    // 2. 담을 값이 int에 맞는지 확인한다 (선언이 있을 때)
    if (tp) {
      st.hot = 'k2';
      if (v === 'num') {
        st.k.k2 = ['20은 정수: 담을 수 있음', 'good'];
        st.checks.push(['담을 값이 int에 맞는가', { v: '맞음: 20은 정수', cls: 'good' }]);
        push('컴파일러가 담으려는 값을 확인합니다. 20은 정수이므로 정수만 담는 int 변수 age에 담을 수 있습니다.', 'good');
      } else if (v === 'text') {
        fail(errType);
        st.k.k2 = ['"스무 살"은 글자: 담을 수 없음', 'bad'];
        st.checks.push(['담을 값이 int에 맞는가', { v: '오류: 글자는 int에 담을 수 없음', cls: 'bad' }]);
        push('컴파일러가 담으려는 값을 확인합니다. "스무 살"은 정수가 아니라 글자(String)이고, int 변수는 정수만 담으므로 담을 수 없습니다. 오류가 납니다(javac: incompatible types: java.lang.String cannot be converted to int). 이 확인은 프로그램을 실행하기 전에 컴파일러가 합니다.', 'bad');
      } else {
        st.k.k2 = ['담을 값이 없음', ''];
        st.checks.push(['담을 값이 int에 맞는가', { v: '담을 값이 없어 확인할 것이 없음', cls: '' }]);
        push('컴파일러가 담으려는 값을 확인합니다. 담을 값이 없으므로 확인할 것이 없고, 이 줄은 오류가 아닙니다. 다만 age에는 아직 아무 값도 담기지 않았습니다.', '');
      }
    } else {
      st.k.k2 = ['담을 변수가 없음', ''];
      st.checks.push(['담을 값이 int에 맞는가', { v: '확인할 변수가 없음', cls: '' }]);
    }

    // 3. age = age + 1; 줄을 확인한다
    st.hot = 'k3';
    if (!tp) {
      fail(errName); fail(errName);
      st.k.k3 = ['age를 찾을 수 없음', 'bad'];
      st.checks.push(['age를 읽는 줄', { v: '오류: 선언하지 않은 이름 age', cls: 'bad' }]);
      push('컴파일러가 age = age + 1; 줄을 확인합니다. 이 줄에는 age가 두 번 나오는데, 둘 다 선언한 곳을 찾을 수 없어 오류가 두 번 납니다(javac: cannot find symbol).', 'bad');
    } else if (v === 'num') {
      st.k.k3 = ['읽을 수 있음', 'good'];
      st.checks.push(['age를 읽는 줄', { v: '읽을 수 있음', cls: 'good' }]);
      push('컴파일러가 age = age + 1; 줄을 확인합니다. 오른쪽의 age + 1은 age에 담긴 값을 읽는 일입니다. age는 int로 선언돼 있고 앞 줄에서 값이 담겼으므로 읽을 수 있습니다. int에 1을 더한 결과도 정수이므로 다시 age에 담아도 됩니다.', 'good');
    } else if (v === 'text') {
      st.k.k3 = ['오류 아님', ''];
      st.checks.push(['age를 읽는 줄', { v: '오류 아님', cls: '' }]);
      push('컴파일러가 age = age + 1; 줄을 확인합니다. age는 int로 선언돼 있고 int에 1을 더한 결과도 정수이므로 이 줄 자체는 오류가 아닙니다(javac가 알린 오류는 위의 1개뿐입니다). 하지만 앞의 오류 때문에 컴파일은 실패합니다.', '');
    } else {
      fail(errInit);
      st.k.k3 = ['값이 담기기 전에 읽음', 'bad'];
      st.checks.push(['age를 읽는 줄', { v: '오류: 값을 담지 않은 변수를 읽음', cls: 'bad' }]);
      push('컴파일러가 age = age + 1; 줄을 확인합니다. 오른쪽의 age + 1은 age에 담긴 값을 읽는 일인데, 그 앞에 age에 값을 담은 줄이 없습니다. 값을 담지 않은 변수를 읽으려 해서 오류가 납니다(javac: variable age might not have been initialized). 왼쪽의 age = 는 값을 담는 쪽이라 괜찮고, 오류가 되는 것은 값을 읽는 오른쪽입니다.', 'bad');
    }

    // 4. System.out.println(age); 줄을 확인한다
    if (!tp) {
      fail(errName);
      push('컴파일러가 System.out.println(age); 줄을 확인합니다. 여기의 age도 찾을 수 없어 오류가 납니다. javac가 알린 오류는 모두 ' + nerr + '개입니다.', 'bad');
    } else if (ok) {
      push('컴파일러가 System.out.println(age); 줄을 확인합니다. age는 int 변수이고 값도 담겨 있으므로 읽어서 출력할 수 있습니다.', 'good');
    } else {
      push('컴파일러가 System.out.println(age); 줄을 확인합니다. 이 줄에서는 새 오류가 나지 않았습니다. javac가 알린 오류는 위의 1개뿐입니다.', '');
    }

    // 5. 컴파일 결과
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다. age가 int인지, 담는 값이 맞는지, 읽을 수 있는지는 실행할 때가 아니라 지금 컴파일러가 컴파일하면서 확인했습니다.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + nerr + '개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 ' + nerr + '개이고, 첫 번째 오류는 "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없습니다.', 'bad');
    }

    // 6~8. 실행
    var out = '';
    if (ok) {
      st.hot = 'cell'; st.cell = true; st.val = '20';
      push('java Main으로 실행합니다. main이 시작되고 int age = 20; 줄이 실행됩니다. age라는 이름표가 붙은 int 칸이 만들어지고, 그 칸에 20이 담깁니다.', '');
      st.val = '21';
      push('age = age + 1; 줄이 실행됩니다. 먼저 오른쪽의 age + 1을 계산합니다. age 칸에 든 20에 1을 더하면 21입니다. 이 값을 같은 age 칸에 담습니다. 칸은 그대로이고 안의 값만 20에서 21로 바뀝니다. 여기서 = 는 "같다"가 아니라 "오른쪽 계산 결과를 왼쪽 칸에 담는다"는 뜻입니다.', 'good');
      st.hot = ''; st.ran = true; out = '21'; st.out = out;
      st.checks.push(['실행했을 때 출력', { v: out, cls: 'good' }]);
      push('System.out.println(age);가 실행됩니다. age 칸에 든 값을 읽어 화면에 21을 출력합니다.', 'good');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (ok) {
      sum.push('변수는 값을 담아 두는 이름입니다. int age = 20;은 세 부분입니다. 타입 int(정수만 담는다는 뜻), 이름 age, 담을 값 20입니다. 컴파일러가 이 줄에서 "age는 int 변수"라고 기억하고, 그 뒤의 줄들이 이 기억에 맞는지 실행하기 전에 확인했습니다.');
      sum.push('실행하면 age 칸에 20이 담기고, age = age + 1;이 같은 칸의 값을 21로 바꾸고, 21이 출력됩니다. 변수는 이름과 칸이 그대로이고 안의 값만 바뀔 수 있습니다.');
    } else if (!tp) {
      sum.push('타입 int를 지우면 컴파일러는 age가 무엇인지 알지 못합니다. 선언하지 않은 이름 age를 ' + nerr + '곳에서 찾을 수 없다고 알려 주었고, 컴파일에 실패해 실행할 수 없었습니다.' + (v === 'none' ? ' 이 설정에서는 선언 줄 자체가 없습니다.' : ''));
      sum.push('처음 보는 이름은 타입을 붙인 선언으로 먼저 만들어야 쓸 수 있습니다.' + (v === 'none' ? '' : ' 타입이 없는 ' + L + '은 변수를 만드는 줄이 아니라, 이미 있는 변수에 값을 담으려는 줄이기 때문입니다.') + (v === 'text' ? ' "스무 살"이 int에 맞는지는 따로 알려 주지 않았습니다.' : ''));
    } else if (v === 'text') {
      sum.push('int 변수에는 글자를 담을 수 없습니다. int는 정수만 담는다는 타입이므로, "스무 살"을 담으려는 줄에서 컴파일러가 막았고 프로그램을 실행할 수 없었습니다.');
      sum.push('값이 타입에 맞는지는 실행해 보고 아는 것이 아니라, 컴파일러가 값을 담는 줄마다 미리 확인합니다. 글자를 담으려면 글자를 담는 타입(String)으로 선언해야 합니다.');
    } else {
      sum.push('값을 담지 않은 변수는 읽을 수 없습니다. int age;라고 선언은 했지만, 값이 담기기 전에 age + 1에서 읽으려 해서 컴파일러가 막았고 프로그램을 실행할 수 없었습니다.');
      sum.push('선언과 값 담기는 따로 할 수 있지만 읽기 전에는 반드시 값을 담아야 하고, 이것도 실행하기 전에 컴파일러가 확인합니다. 지역 변수에는 0 같은 값이 저절로 들어가지 않습니다.');
    }
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? '성공' : '오류', ok ? '없음' : first, ok ? out : '실행할 수 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    H.counters(v, [[s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 왼쪽 영역에 컴파일러가 확인하는 세 가지(선언 줄, 담을 값, age를 읽는 줄), 오른쪽 영역에 실행할 때 만들어지는 age 이름표와 int 칸(값이 20에서 21로 바뀜). 맨 아래에 컴파일 결과와 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    var hot = s ? s.hot : '', k = s ? s.k : { k1: ['', ''], k2: ['', ''], k3: ['', ''] };
    P.region('cp', 14, 12, 322, 208, '컴파일러가 확인하는 것');
    P.region('rt', 366, 12, 300, 208, '실행할 때');
    function kc(id) { var st = k[id]; return st[1] === 'bad' ? 'bad' : hot === id ? 'hot now' : st[1] === 'good' ? 'good' : st[0] ? 'plain' : 'ghost'; }
    P.box('k1', 24, 40, 302, 52, { cls: kc('k1'), title: '선언 줄: 이름과 타입', sub: k.k1[0] });
    P.box('k2', 24, 100, 302, 52, { cls: kc('k2'), title: '담을 값이 int에 맞는가', sub: k.k2[0] });
    P.box('k3', 24, 160, 302, 52, { cls: kc('k3'), title: 'age를 읽는 줄', sub: k.k3[0] });
    var made = s && s.cell;
    P.box('tag', 378, 80, 100, 74, { cls: made ? 'good' : 'ghost', title: 'age', sub: made ? '이름표' : '아직 없음' });
    P.box('cell', 528, 80, 126, 74, { cls: made ? (hot === 'cell' ? 'good now' : 'good') : 'ghost', title: 'int 칸', sub: made ? '값 ' + s.val : s && s.compile === 'err' ? '만들어지지 않음' : '아직 없음' });
    if (made) P.arrow('ref', 'tag:r', 'cell:l', { cls: 'good' });
    P.box('r1', 14, 232, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 292, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '실행했을 때 출력', right: s && s.ran ? s.out : s && s.compile === 'err' ? '실행할 수 없음' : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드(compiler.err.cant.resolve.location, prob.found.req, var.might.not.have.been.initialized를 화면의 세 가지 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력입니다. 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. 모든 변수와 식에 컴파일할 때 알려진 타입이 있다는 것은 4장 서두, 변수가 값을 담는 저장 공간이고 컴파일 시점의 타입을 가진다는 것은 4.12절, 기본형 변수는 그 타입의 값만 담는다는 것은 4.12.1절, int가 32비트 부호 있는 정수라는 것은 4.2절과 4.2.1절, 지역 변수 선언이 타입(또는 var)과 이름과 선택적인 초기화로 이루어진다는 것은 14.4절, 초기화 없이 선언한 변수는 읽기 전에 값을 담아야 하고 아니면 컴파일 오류라는 것은 14.4.2절과 4.12.5절과 16장 서두를 따랐습니다. 지역 변수에는 필드와 달리 기본값이 저절로 들어가지 않는다는 것도 4.12.5절입니다. 값을 읽는 것만 접근으로 치고 = 왼쪽의 이름은 접근이 아니라는 것은 16장 서두입니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 오류가 여럿이면 javac는 모두 알리는데, 표에는 첫 번째 것만 적었습니다. 컴파일에 실패한 모든 조합에서 Main 클래스 파일은 만들어지지 않았고, 그래서 실행할 수 없다고 적었습니다. 타입 int도 값도 없는 조합은 선언 줄을 아예 두지 않았습니다. 타입 없이 age;만 쓴 줄은 문법에 맞는 문장이 아니기 때문이며(14.8절: 문장으로 쓸 수 있는 식은 대입, 증감, 메서드 호출, 객체 생성뿐), 이 모양을 한 번 따로 컴파일해 보니 javac가 not a statement라는 문법 오류를 냈습니다(조합 대조에는 넣지 않았습니다). 이 실습은 지역 변수와 int 하나만 다뤘습니다. 다른 기본형, 참조형 변수, var, 변수의 이름 짓기와 범위, 상수(final)는 다루지 않았습니다. 기본형과 참조형 변수에 값이 어떻게 복사되는지는 "세부 동작 실습: 변수와 타입"에서 다룹니다.',
});
