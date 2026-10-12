Lab.register({
  id: 'method_basic', nav: '메서드', cat: '기초개념', mode: 'step', basic: true, deep: ['stack'],
  title: '메서드는 무엇이고, 선언하는 것과 부르는 것은 어떻게 다른가',
  intro: '메서드는 이름을 붙여 둔 코드 묶음입니다. 코드에서 static int add(int a, int b) { ... }처럼 이름과 괄호, 중괄호로 적은 부분이 메서드의 선언입니다. 선언은 "add라는 이름의 코드 묶음이 있다"고 적어 둔 것일 뿐이어서, 선언만으로는 그 안의 코드가 실행되지 않습니다. 실행은 add(2, 3)처럼 이름 뒤에 괄호를 붙여 부를 때 일어납니다. 부를 때 괄호 안에 넘긴 값 2와 3이 선언의 괄호 안 변수 a와 b(매개변수)에 담기고, return이 계산한 값을 부른 곳으로 돌려줍니다. 이 실습은 선언과 부르는 줄을 하나씩 지우고 부르는 횟수와 넘기는 값의 개수를 바꿔 가며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주고 add가 몇 번 실행되는지를 봅니다. (static은 main이 객체를 만들지 않고 바로 부를 수 있게 붙인 것으로 보고, 이 실습에서는 다루지 않습니다.)',
  terms: ['메서드', '메서드 호출', '매개변수와 인자', '반환값(return)'],
  controls: [
    { id: 'decl', label: 'add 메서드의 선언이 있다', type: 'check', value: true },
    { id: 'call', label: 'main에서 add를 부르는 줄', type: 'select', value: 'once', options: [['once', 'add(2, 3)을 한 번 부른다'], ['twice', 'add(2, 3)을 두 번 부른다'], ['none', '부르는 줄을 지운다']] },
    { id: 'args', label: 'add에 넘기는 값', type: 'select', value: 'two', options: [['two', '값을 두 개 넘긴다: add(2, 3)'], ['one', '값을 하나만 넘긴다: add(2)']], show: function (c) { return c.call !== 'none'; }, hint: '부르는 줄이 있을 때만 쓰입니다.' },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '메서드는 어떻게 생겼고, 부르면 무슨 일이 일어나나', d: '선언이 있고 add(2, 3)을 한 번 부릅니다. add가 한 번 실행되고 5가 돌아옵니다.', v: { decl: true, call: 'once', args: 'two' } },
    { t: '부르는 줄을 지우면', q: '부르는 줄을 지우면', d: '선언은 그대로여도 부르지 않으면 add의 코드는 실행되지 않습니다.', v: { decl: true, call: 'none', args: 'two' } },
    { t: 'add(2, 3)을 두 번 부르면', q: 'add(2, 3)을 두 번 부르면', d: '부를 때마다 add의 코드가 다시 실행됩니다.', v: { decl: true, call: 'twice', args: 'two' } },
    { t: 'add의 선언을 지우고 부르기만 하면', q: 'add의 선언을 지우고 부르기만 하면', d: '부를 대상이 없어 컴파일 오류가 납니다.', v: { decl: false, call: 'once', args: 'two' } },
    { t: '값을 하나만 넘기면', q: '값을 하나만 넘기면: add(2)', d: '넘긴 값의 개수가 매개변수의 개수와 맞지 않아 컴파일 오류가 납니다.', v: { decl: true, call: 'once', args: 'one' } },
  ],
  // 컴파일러가 알려 주는 오류의 종류(실제 javac의 진단 코드를 옮긴 것)
  errName: 'add라는 메서드를 찾을 수 없음',
  errCount: 'add에 넘긴 값의 개수가 매개변수의 개수와 맞지 않음',
  code: function (c) {
    var two = c.args === 'two', a = two ? '2, 3' : '2', o = ['public class Main {'];
    if (c.decl) o.push('    // 선언: add라는 이름의 코드 묶음. 부르기 전에는 실행되지 않는다', '    static int add(int a, int b) {', '        System.out.println("add 실행");', '        return a + b;', '    }', '');
    o.push('    public static void main(String[] args) {');
    if (c.call !== 'none') {
      o.push('        // 호출: ' + (two ? '2와 3을 넘겨' : '2를 넘겨') + ' add를 실행하고, 돌려받은 값을 sum에 담는다', '        int sum = add(' + a + ');', '        System.out.println(sum);');
      if (c.call === 'twice') o.push('        int sum2 = add(' + a + ');', '        System.out.println(sum2);');
    }
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.decl ? 'add 선언 있음' : 'add 선언 없음') + ' · ' + { once: '한 번 부름', twice: '두 번 부름', none: '부르는 줄 없음' }[c.call] + (c.call === 'none' ? '' : ' · ' + (c.args === 'two' ? '값 두 개' : '값 하나')); },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력', 'add가 실행된 횟수'],
  simulate: function (c) {
    var ev = [], sum = [], two = c.args === 'two', a = two ? '2, 3' : '2', n = { once: 1, twice: 2, none: 0 }[c.call];
    var calls = []; if (n >= 1) calls.push('int sum = add(' + a + ');'); if (n === 2) calls.push('int sum2 = add(' + a + ');');
    var hasCall = n > 0, nameErr = hasCall && !c.decl, argErr = hasCall && c.decl && !two, ok = !nameErr && !argErr;
    var first = ok ? '' : nameErr ? this.errName : this.errCount;
    var nerr = ok ? 0 : n, errAt = ok ? [] : calls;
    var st = { hot: '', bad: false, badSend: '', phase: '', started: false, compile: '', errs: 0, errText: '', ran: false, params: '', send: '', ret: '', vals: [], out: [], count: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var callTxt = 'add(' + a + ') 호출';

    // 1. 선언을 읽는다
    st.hot = 'ad';
    if (c.decl) {
      st.checks.push(['add 메서드의 선언', { v: '알게 됨', cls: 'good' }]);
      push('javac로 컴파일합니다. 컴파일러가 소스를 위에서부터 읽으면서 add 메서드의 선언을 만납니다. 선언은 "add라는 이름의 코드 묶음이 있고, int 값 두 개를 받아 int 값 하나를 돌려준다"고 적어 둔 것입니다. 괄호 안의 int a, int b는 부를 때 넘겨받을 값을 담는 변수로, 매개변수라고 합니다. 컴파일러는 이 이름을 기억해 둘 뿐이고, 컴파일은 실행이 아니므로 add 안의 코드는 실행되지 않습니다.', '');
    } else {
      st.checks.push(['add 메서드의 선언', { v: '선언이 없음', cls: 'bad' }]);
      push('javac로 컴파일합니다. 컴파일러가 소스를 위에서부터 읽습니다. 이 소스 어디에도 add라는 이름의 메서드 선언이 없으므로, 컴파일러는 add라는 이름을 알지 못합니다.', '');
    }

    // 2. 부르는 줄을 확인한다
    st.hot = 'mn';
    if (!hasCall) {
      st.checks.push(['add를 부르는 줄', { v: '없음', cls: '' }]);
      push('컴파일러가 main 안을 읽습니다. main에는 add를 부르는 줄이 없습니다.' + (c.decl ? ' 선언해 놓고 부르지 않는 메서드도 오류가 아니므로, 그대로 통과합니다.' : ' add 선언도 부르는 줄도 없으므로 add에 대해 확인할 것이 없습니다.'), '');
    } else if (nameErr) {
      st.bad = true; st.badSend = a; st.errs = n; st.errText = this.errName;
      st.checks.push(['add를 부르는 줄', { v: '오류: add를 찾을 수 없음', cls: 'bad' }]);
      push('컴파일러가 main 안의 ' + callTxt + '을 읽습니다. ' + (n === 1 ? '' : '부르는 줄이 두 개이고, 두 줄 모두 같습니다. ') + '이름 add를 선언에서 찾으려 하지만 선언이 없어 찾지 못합니다(javac: cannot find symbol). 부를 대상이 없으므로 오류입니다.' + (n === 1 ? '' : ' 오류는 부르는 줄마다 하나씩 모두 2개입니다.'), 'bad');
    } else if (argErr) {
      st.bad = true; st.badSend = a; st.errs = n; st.errText = this.errCount;
      st.checks.push(['add를 부르는 줄', { v: '오류: 넘긴 값 1개, 매개변수 2개', cls: 'bad' }]);
      push('컴파일러가 main 안의 ' + callTxt + '을 읽습니다. add라는 이름은 선언에서 찾았습니다. 그런데 호출은 값을 하나(2) 넘기고, add의 매개변수는 두 개(int a, int b)입니다. 개수가 맞지 않아 이 호출로는 add를 부를 수 없으므로 오류입니다(javac: method add in class Main cannot be applied to given types).' + (n === 1 ? '' : ' 두 번째 부르는 줄도 같은 이유로 오류여서 오류는 모두 2개입니다.') + ' 이 확인은 실행할 때가 아니라 컴파일할 때 합니다.', 'bad');
    } else {
      st.checks.push(['add를 부르는 줄', { v: '이름과 값의 개수가 맞음', cls: 'good' }]);
      push('컴파일러가 main 안의 ' + callTxt + '을 읽습니다.' + (n === 1 ? '' : ' 부르는 줄은 두 개이고, 두 줄 모두 같습니다.') + ' 이름 add를 선언에서 찾았고, 넘기는 값이 두 개(2, 3)로 매개변수 두 개(a, b)와 개수가 맞습니다. 통과입니다.', 'good');
    }

    // 3. 컴파일 결과
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + nerr + '개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 ' + nerr + '개이고, 첫 번째 오류는 "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없고, add의 코드도 실행되지 않았습니다.', 'bad');
    }

    // 4~. 실행
    if (ok) {
      st.hot = 'mn'; st.started = true; st.ran = true;
      push('java Main으로 실행합니다. 실행은 main의 첫 줄부터 시작합니다.' + (c.decl ? ' 소스에는 add 선언이 main보다 위에 적혀 있지만, 소스에 적힌 순서대로 실행되는 것이 아닙니다. 선언은 실행 순서에 들어가지 않고, 이 시점까지 add의 코드는 한 번도 실행되지 않았습니다.' : ''), '');
      if (!hasCall) {
        st.checks.push(['add가 실행된 횟수', { v: '0번', cls: '' }]);
        push('main에 실행할 줄이 없어 main이 끝납니다.' + (c.decl ? ' add 선언이 있어도 부르는 줄이 없으므로 add의 코드는 한 번도 실행되지 않았고, 아무것도 출력되지 않습니다.' : ' 아무것도 출력되지 않습니다.'), 'good');
      }
      for (var i = 0; i < n; i++) {
        var nm = i === 0 ? 'sum' : 'sum2', head = i === 0;
        st.hot = 'mn'; st.phase = 'call'; st.send = '2, 3'; st.params = 'a = 2, b = 3';
        push(head ? 'int sum = add(2, 3); 줄에서 add(2, 3) 호출을 만납니다. 이름 뒤에 괄호를 붙인 이 모양이 add를 부르는 것이고, 괄호 안의 2와 3이 넘기는 값입니다. 넘긴 값이 add의 매개변수에 차례로 담깁니다. 2는 a에, 3은 b에 담기고, 실행이 main에서 add 안의 코드로 옮겨 갑니다.' : 'int sum2 = add(2, 3); 줄에서 다시 add(2, 3) 호출을 만납니다. 처음과 똑같이 2는 a에, 3은 b에 새로 담기고, add 안의 코드가 처음부터 다시 실행됩니다. 선언은 한 번만 적었어도, 부를 때마다 실행됩니다.', '');
        st.hot = 'ad'; st.phase = 'run'; st.count++; st.out.push('add 실행');
        push(head ? 'add 안의 첫 줄 System.out.println("add 실행")이 실행되어 add 실행을 출력합니다. add가 실행된 횟수는 1번입니다.' : 'add 안의 첫 줄이 다시 실행되어 add 실행을 또 출력합니다. add가 실행된 횟수는 2번이 됩니다.', 'good');
        st.phase = 'ret'; st.ret = '5';
        push(head ? 'return a + b가 a + b를 계산하고(2 + 3은 5), 그 값 5를 add를 부른 곳으로 돌려줍니다. add의 실행은 여기서 끝나고, 실행은 main으로 돌아옵니다.' : 'return a + b가 이번에도 5를 add를 부른 곳으로 돌려주고, 실행은 main으로 돌아옵니다.', 'good');
        st.hot = 'mn'; st.phase = 'recv'; st.params = ''; st.send = ''; st.vals.push([nm, '5']);
        push('add(2, 3) 호출이 있던 자리가 돌려받은 값 5가 되어, 5가 ' + nm + '에 담깁니다.', '');
        st.out.push('5'); st.phase = '';
        push('System.out.println(' + nm + ')이 ' + nm + '에 담긴 5를 출력합니다.' + (head || n === 1 ? '' : ' 부를 때마다 add 실행이 먼저 나온 뒤 돌려받은 값이 출력되는 것을 볼 수 있습니다.'), 'good');
        st.ret = '';
      }
      st.hot = '';
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (ok && c.decl && n === 1) {
      sum.push('메서드는 이름을 붙여 둔 코드 묶음입니다. add 선언은 "add라는 코드 묶음이 있다"고 적어 둔 것이고, 실제 실행은 add(2, 3)처럼 이름 뒤에 괄호를 붙여 부를 때 일어났습니다. 부를 때 넘긴 2와 3이 매개변수 a와 b에 담기고, return이 합 5를 부른 곳으로 돌려주어 sum에 담겼습니다.');
      sum.push('선언은 main보다 위에 있었지만 먼저 실행되지 않았습니다. 실행은 main의 첫 줄부터 시작하고, add의 코드는 add(2, 3)을 만난 그 순간에 한 번 실행됐습니다.');
    } else if (ok && c.decl && n === 0) {
      sum.push('부르는 줄을 지우면 add의 코드는 실행되지 않습니다. add 선언은 그대로 있었지만 add 실행이 한 번도 출력되지 않았고, 실행 횟수는 0번이었습니다. 선언만으로는 그 안의 코드가 실행되지 않습니다.');
      sum.push('컴파일러는 오류 없이 통과시켰습니다. 부르지 않는 메서드가 있는 것은 오류가 아니고, 그저 쓰이지 않을 뿐입니다.');
    } else if (ok && c.decl) {
      sum.push('add(2, 3)을 두 번 부르면 add의 코드가 두 번 실행되어 add 실행이 두 번 출력됐습니다. 메서드는 한 번 선언해 두고, 부를 때마다 처음부터 다시 실행됩니다.');
      sum.push('add의 코드를 두 번 쓴 것이 아니라 부르는 줄만 두 번 썼습니다. 두 번째 호출에서도 2와 3이 a와 b에 새로 담겼고, return이 5를 돌려주어 sum2에 담겼습니다.');
    } else if (ok) {
      sum.push('add의 선언을 지웠지만 부르는 줄도 없어서, 컴파일에 성공했고 아무것도 출력되지 않았습니다. 선언이 없어도 오류가 나려면, 그 이름을 부르는 곳이 있어야 합니다.');
      sum.push('선언을 지우는 것만으로는 오류가 나지 않았습니다. 컴파일러가 add라는 이름을 찾는 때는 코드에서 add를 부를 때입니다.');
    } else if (nameErr) {
      sum.push('add의 선언을 지우고 부르기만 하면 컴파일러가 add라는 이름을 찾지 못해 컴파일에 실패했습니다. 호출은 선언된 이름을 찾아가서 실행하는 것이므로, 선언이 없으면 부를 대상이 없습니다.');
      sum.push(n === 1 ? '부르는 줄이 한 군데여서 오류도 1개였습니다. 오류는 선언이 있어야 할 곳이 아니라, 선언 없이 이름을 부른 줄에서 알려 줍니다.' : '부르는 줄이 두 군데여서 오류도 줄마다 하나씩 모두 2개였습니다. 오류는 선언이 있어야 할 곳이 아니라, 선언 없이 이름을 부른 줄에서 알려 줍니다.');
    } else {
      sum.push('값을 하나만 넘기면 컴파일러가 넘긴 값의 개수(1개)와 add의 매개변수 개수(2개)가 맞지 않는다고 알려 주었고, 컴파일에 실패해 add가 실행되지 않았습니다.');
      sum.push('매개변수는 부를 때 넘긴 값을 받는 변수입니다. 선언이 정한 개수만큼 값을 넘겨야 부를 수 있고, 이것은 실행할 때가 아니라 컴파일할 때 확인합니다.' + (n === 2 ? ' 부르는 줄이 두 군데여서 오류도 2개였습니다.' : ''));
    }
    var out = st.out.join(' / ');
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? '성공' : '오류', ok ? '없음' : first, ok ? (out || '(아무것도 출력되지 않음)') : '실행할 수 없음', ok ? st.count + '번' : '실행할 수 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    H.counters(v, [[s.count, 'add가 실행된 횟수'], [s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 왼쪽에 main, 오른쪽에 add 상자. 부를 때 화살표가 건너가며 넘긴 값을 보이고, return으로 돌아올 때 돌려주는 값을 보인다. 아래에 컴파일 결과, 출력, add가 실행된 횟수를 세는 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 304);
    var hot = s ? s.hot : '', ph = s ? s.phase : '';
    var mainSub = !s || !s.started ? '실행 전' : s.vals.length ? s.vals.map(function (r) { return r[0] + ' = ' + r[1]; }) : '아직 담은 값 없음';
    P.box('mn', 14, 16, 250, 118, { cls: s && s.bad ? 'bad' : hot === 'mn' ? 'hot now' : 'plain', title: 'main', sub: mainSub });
    var addSub = !c.decl ? '선언 없음' : s && s.params ? s.params : s && s.count ? '선언만 있음 · 부르면 실행' : '선언만 있음 · 부르기 전';
    P.box('ad', 416, 16, 250, 118, { cls: !c.decl ? 'ghost' : hot === 'ad' ? 'hot now' : 'plain', title: 'add (메서드)', sub: addSub });
    if (s && s.bad) P.arrow('call', 'mn:r:0.3', 'ad:l:0.3', { cls: 'bad', label: s.badSend });
    else if (s && (ph === 'call' || ph === 'run')) P.arrow('call', 'mn:r:0.3', 'ad:l:0.3', { cls: ph === 'call' ? 'hot' : 'mut', label: s.send });
    if (s && ph === 'ret') P.arrow('ret', 'ad:l:0.7', 'mn:r:0.7', { cls: 'good', label: s.ret });
    P.box('r1', 14, 150, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 210, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '실행했을 때 출력', right: s && s.ran ? (s.out.length ? s.out.join(' / ') : '(아무것도 출력되지 않음)') : s && s.compile === 'err' ? '실행할 수 없음' : '' });
    P.box('r3', 14, 254, 652, 36, { cls: s && s.count ? 'wait' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'add가 실행된 횟수', right: s && s.compile === 'err' ? '실행할 수 없음' : (s ? s.count : 0) + '번' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 열두 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드(compiler.err.cant.resolve.location.args와 compiler.err.cant.apply.symbol을 화면의 두 가지 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력과 그 출력에 "add 실행"이 나온 횟수입니다. 단계 문장이 기대는 "실행은 main의 첫 줄부터 시작하고, add 선언이 main보다 위에 있어도 먼저 실행되지 않는다"는 사실은, main의 첫 줄에 출력 줄을 하나 더한 별도의 소스를 같은 방식으로 실행해 main 시작, add 실행, 5의 순서로 출력되는 것을 확인했습니다. 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. 메서드 선언이 호출할 수 있는 실행 코드를 선언한다는 것은 8.4절, 호출할 때 넘긴 값이 본문을 실행하기 전에 새로 만들어진 매개변수 변수를 초기화한다는 것은 8.4.1절, 메서드 본문이 블록이면 구현이라는 것은 8.4.7절, 호출할 때 인자 식을 왼쪽부터 차례로 계산한다는 것은 15.12.4.2절, 인자 값이 새로 만들어진 매개변수 변수에 담긴 뒤 메서드 본문으로 제어가 넘어간다는 것은 15.12.4.5절, 값이 있는 return이 식을 계산하고 그 값이 호출의 값이 되며 제어를 호출한 곳으로 넘긴다는 것은 14.17절, 인자 개수가 같은 메서드만 호출 후보가 된다는 것(고정 인자 메서드의 경우)과 후보가 하나도 없으면 컴파일 오류라는 것은 15.12.2.1절을 따랐습니다. 15.12.2.1절은 문서의 일부만 읽을 수 있었고 8.4.5절(반환 타입)은 열어 보지 못했습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 이 밖에 반환 타입이 void인 메서드, 같은 이름의 메서드를 여러 개 만드는 것(오버로딩), 객체에 속한 메서드, 가변 인자는 다루지 않았고, 메서드를 부를 때마다 실행 정보가 쌓였다 사라지는 방식은 "세부 동작 실습: 스택과 힙"에서 다룹니다.',
});
