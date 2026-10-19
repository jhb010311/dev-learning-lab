Lab.register({
  id: 'exception_basic', nav: '예외', cat: '기초개념', mode: 'step', basic: true, deep: ['exflow'],
  title: '예외는 무엇이고, try-catch는 무엇을 해 주는가',
  intro: '예외는 프로그램을 실행하는 중에 계속할 수 없는 일이 생겼을 때 자바가 던지는 객체입니다. 예를 들어 정수를 0으로 나누면 자바가 ArithmeticException이라는 예외를 던지고, 던지는 순간 하던 일을 그 자리에서 멈춥니다. 아무도 잡지 않으면 프로그램은 거기서 끝나고 그 뒤의 줄은 실행되지 않습니다. try { }는 문제가 날 수 있는 코드를 감싸는 것이고, 뒤에 붙인 catch (예외의 종류 e) { }는 그 종류의 예외가 났을 때 실행이 건너와 처리하는 곳입니다. 처리가 끝나면 try-catch 아래의 줄을 계속 실행합니다. 이 실습은 try-catch를 지우고, b의 값을 바꾸고, catch가 잡는 종류를 바꿔 가며 같은 코드를 컴파일하고 실행해, 무엇이 출력되고 프로그램이 어떻게 끝나는지를 봅니다.',
  terms: ['예외(Exception)와 Error', 'try-catch', '예외를 던진다(throw)', 'NullPointerException'],
  controls: [
    { id: 'tc', label: 'try-catch로 감싼다', type: 'check', value: true },
    { id: 'b', label: '변수 b에 담는 값', type: 'select', value: 'zero', options: [['zero', 'b에 0을 담는다 (0으로 나눈다)'], ['two', 'b에 2를 담는다']] },
    { id: 'kind', label: 'catch가 잡는 예외', type: 'select', value: 'arith', options: [['arith', 'catch (ArithmeticException e)'], ['npe', 'catch (NullPointerException e): 다른 종류를 잡는다']], show: function (c) { return c.tc; } },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '예외는 무엇이고, try-catch로 감싼 코드에서 0으로 나누면 무슨 일이 일어나나', d: '0으로 나누는 순간 예외가 던져지고, catch가 받아 처리한 뒤 "끝"까지 실행됩니다.', v: { tc: true, b: 'zero', kind: 'arith' } },
    { t: 'try-catch를 지우면', q: 'try-catch를 지우면', d: '예외를 잡는 곳이 없어 프로그램이 그 줄에서 멈추고 "끝"은 출력되지 않습니다.', v: { tc: false, b: 'zero', kind: 'arith' } },
    { t: 'b에 2를 담으면', q: 'b에 0 대신 2를 담으면', d: '예외가 나지 않아 5와 "끝"이 출력되고, catch 안은 실행되지 않습니다.', v: { tc: true, b: 'two', kind: 'arith' } },
    { t: '다른 종류를 잡게 하면', q: 'catch가 다른 종류의 예외(NullPointerException)를 잡게 하면', d: 'catch가 ArithmeticException을 잡지 못해 프로그램이 멈춥니다.', v: { tc: true, b: 'zero', kind: 'npe' } },
  ],
  code: function (c) {
    var o = ['public class Main {', '    public static void main(String[] args) {', '        int a = 10;', '        int b = ' + (c.b === 'zero' ? '0' : '2') + ';'];
    if (c.tc) o.push('        // try: 문제가 날 수 있는 코드를 감싼다', '        try {', '            System.out.println(a / b);', '        // catch: 예외가 나면 여기로 건너온다', '        } catch (' + (c.kind === 'arith' ? 'ArithmeticException' : 'NullPointerException') + ' e) {', '            System.out.println("0으로 나눌 수 없습니다");', '        }');
    else o.push('        System.out.println(a / b);');
    o.push('        System.out.println("끝");', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.tc ? 'try-catch 있음' : 'try-catch 없음') + ' · b는 ' + (c.b === 'zero' ? '0' : '2') + (c.tc ? ' · ' + (c.kind === 'arith' ? 'ArithmeticException을 잡음' : 'NullPointerException을 잡음') : ''); },
  columns: ['출력', '프로그램이 끝난 방식', 'catch 안의 코드'],
  simulate: function (c) {
    var ev = [], sum = [], Z = c.b === 'zero', K = c.kind === 'arith' ? 'ArithmeticException' : 'NullPointerException';
    var caught = c.tc && Z && c.kind === 'arith', stops = Z && !caught;
    var st = { hot: '', ln: { calc: '', pr: '', ct: '', end: '' }, exc: '', thrown: 0, out: [], ended: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var bv = Z ? '0' : '2', SHOW = 'System.out.println("끝");';

    // 1. main이 시작되고 a, b에 값이 담긴다
    push('java Main으로 실행합니다. main 메서드가 시작되고 int a = 10; 줄과 int b = ' + bv + '; 줄이 차례로 실행되어, 변수 a에 담은 값은 10, 변수 b에 담은 값은 ' + bv + '입니다.', '');

    // 2. try에 닿는다
    if (c.tc) {
      st.hot = 'pr';
      push('try { 줄에 닿습니다. try 안의 줄은 평소처럼 위에서부터 차례로 실행됩니다. try는 "이 안에서 예외가 나면 아래의 catch로 넘기겠다"고 미리 알려 두는 것이고, 예외가 나지 않으면 try를 쓰지 않은 것과 같게 실행됩니다.', '');
    }

    // 3. a / b를 계산하려는 순간
    st.hot = 'calc'; st.ln.calc = 'now';
    if (Z) {
      st.ln.calc = 'bad'; st.ln.pr = 'skip'; st.exc = 'ArithmeticException'; st.thrown = 1;
      st.checks.push(['a / b 계산', { v: '10 / 0: ArithmeticException을 던짐', cls: 'bad' }]);
      push('System.out.println(a / b); 줄을 실행합니다. println이 출력하려면 먼저 괄호 안의 a / b를 계산해야 합니다. 10 / 0을 계산하려는 순간, 자바(JVM)가 정수를 0으로 나눌 수 없다는 것을 알고 ArithmeticException이라는 예외 객체를 만들어 던집니다(throw). 예외가 던져지면 자바는 그 자리에서 하던 일을 멈추므로, 출력할 값이 없는 println은 실행되지 않습니다.', 'bad');
    } else {
      st.ln.calc = 'ok'; st.ln.pr = 'ok'; st.out.push('5');
      st.checks.push(['a / b 계산', { v: '10 / 2 = 5: 예외 없음', cls: 'good' }]);
      st.checks.push(['println(a / b)', { v: '5를 출력', cls: 'good' }]);
      push('System.out.println(a / b); 줄을 실행합니다. 괄호 안의 a / b를 먼저 계산하면 10 / 2는 5이고, 문제가 없어 예외는 나지 않습니다. println이 5를 출력합니다.', 'good');
    }

    // 4~6. 예외가 났을 때 잡는 곳을 찾는다 / 났다면 그 뒤
    if (Z) {
      if (c.tc) {
        st.hot = 'ct'; st.ln.ct = 'now';
        if (c.kind === 'arith') {
          st.checks.push(['catch (ArithmeticException e)', { v: '종류가 맞음', cls: 'good' }]);
          push('자바가 이 예외를 잡는 곳이 있는지 찾습니다. 예외가 난 곳은 try 안이므로 이 try에 붙은 catch를 봅니다. catch (ArithmeticException e)는 ArithmeticException 종류를 잡겠다고 적혀 있고, 던져진 것도 ArithmeticException이므로 종류가 맞습니다.', 'good');
          st.ln.ct = 'ok'; st.out.push('0으로 나눌 수 없습니다');
          st.checks.push(['catch 안의 println', { v: '실행됨', cls: 'good' }]);
          push('실행이 catch 안으로 건너갑니다. 변수 e가 던져진 예외 객체를 가리키게 되고, catch 안의 System.out.println("0으로 나눌 수 없습니다"); 줄이 실행되어 그 글을 출력합니다.', 'good');
          st.hot = 'end'; st.ln.end = 'ok'; st.out.push('끝'); st.ended = 'ok';
          st.checks.push([SHOW, { v: '실행됨', cls: 'good' }]);
          push('catch 안의 줄이 끝나면 예외는 처리된 것으로 칩니다. 프로그램은 멈추지 않고 try-catch 아래의 줄로 이어 가서, ' + SHOW + ' 줄이 "끝"을 출력합니다. main의 마지막 줄까지 실행되어 프로그램이 끝납니다.', 'good');
        } else {
          st.ln.ct = 'skip';
          st.checks.push(['catch (NullPointerException e)', { v: '종류가 맞지 않음', cls: 'bad' }]);
          push('자바가 이 예외를 잡는 곳이 있는지 찾습니다. 예외가 난 곳은 try 안이므로 이 try에 붙은 catch를 봅니다. catch (NullPointerException e)는 NullPointerException 종류만 잡겠다고 적혀 있습니다. 던져진 것은 ArithmeticException이어서 종류가 맞지 않고, 이 try에 붙은 다른 catch는 없습니다.', 'bad');
        }
      } else {
        st.hot = 'ct';
        st.checks.push(['예외를 잡는 곳', { v: '없음 (try-catch가 없음)', cls: 'bad' }]);
        push('자바가 이 예외를 잡는 곳이 있는지 찾습니다. 이 코드에는 try-catch가 없으므로 잡는 곳이 없습니다.', 'bad');
      }
      if (stops) {
        st.hot = 'end'; st.ln.end = 'skip'; st.ended = 'exc';
        st.checks.push([SHOW, { v: '실행되지 않음', cls: 'bad' }]);
        push('잡는 곳이 없으므로 main 메서드가 거기서 끝납니다. ' + (c.tc ? 'catch 안의 줄은 실행되지 않고, 그 아래 ' : '그 아래 ') + SHOW + ' 줄도 실행되지 않습니다. 자바가 예외의 종류와 메시지를 오류로 알리고(Exception in thread "main" java.lang.ArithmeticException: / by zero) 프로그램을 끝냅니다. 종료 코드는 정상일 때의 0이 아니라 1이었습니다.', 'bad');
      }
    } else {
      if (c.tc) {
        st.hot = 'ct'; st.ln.ct = 'skip';
        st.checks.push(['catch 안의 println', { v: '실행되지 않음', cls: '' }]);
        push('try 안에서 예외가 나지 않았으므로 맞는 catch를 찾을 일이 없습니다. 자바는 catch 안으로 건너가지 않고 try-catch 아래의 줄로 이어 갑니다. catch 안의 줄은 실행되지 않습니다.' + (c.kind === 'npe' ? ' catch가 NullPointerException을 잡는다고 적혀 있어도 마찬가지입니다. 예외가 나지 않으면 catch의 종류는 쓰이지 않습니다.' : ''), '');
      }
      st.hot = 'end'; st.ln.end = 'ok'; st.out.push('끝'); st.ended = 'ok';
      st.checks.push([SHOW, { v: '실행됨', cls: 'good' }]);
      push(SHOW + ' 줄이 "끝"을 출력합니다. main의 마지막 줄까지 실행되어 프로그램이 끝납니다(종료 코드 0).', 'good');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (caught) {
      sum.push('예외는 실행 중에 계속할 수 없는 일이 생겼을 때 자바가 던지는 객체입니다. 10 / 0에서 ArithmeticException이 던져져 println(a / b)는 실행되지 않았지만, try-catch로 감싸 두었으므로 실행이 catch 안으로 건너가 처리한 뒤 try-catch 아래의 "끝"까지 실행됐습니다.');
      sum.push('예외가 났다고 프로그램이 곧바로 끝나는 것은 아닙니다. 종류가 맞는 catch가 있으면 거기서 받아 처리하고 이어 갑니다. 코드는 던져진 그 자리로 돌아가지 않아서, 예외가 난 줄의 나머지는 실행되지 않습니다.');
    } else if (!c.tc && Z) {
      sum.push('try-catch를 지우면 예외를 잡는 곳이 없어, 10 / 0에서 던져진 ArithmeticException 때문에 프로그램이 그 줄에서 멈췄습니다. 아무것도 출력되지 않았고 "끝"을 출력하는 줄도 실행되지 않았습니다.');
      sum.push('예외는 던져지면 하던 일을 멈추는 것이어서, 아무도 잡지 않으면 그 뒤의 줄은 실행되지 않습니다. 자바가 예외의 종류와 메시지를 오류로 알리고 프로그램을 끝냅니다.');
    } else if (Z) {
      sum.push('catch를 NullPointerException으로 쓰면 던져진 ArithmeticException을 잡지 못해, 프로그램이 멈췄습니다. try-catch로 감쌌는데도 catch 안의 줄은 실행되지 않았고, "끝"도 출력되지 않았습니다.');
      sum.push('catch는 괄호에 적은 종류의 예외만 잡습니다. 종류가 맞지 않으면 try-catch가 있어도 잡는 곳이 없는 것과 같습니다.');
    } else if (c.tc) {
      sum.push('b에 2를 담으면 10 / 2는 5이고 예외가 나지 않아, 5와 "끝"이 출력됐습니다. catch 안의 줄은 실행되지 않았습니다.');
      sum.push('catch는 예외가 났을 때만 실행됩니다. 예외가 나지 않으면 try-catch가 있어도 없는 것과 같게 실행되고' + (c.kind === 'npe' ? ', catch가 어느 종류를 잡는지도 쓰이지 않습니다.' : ', 문제가 날 수 있는 코드를 감싸 둔 것이 쓰이지 않은 채 지나갑니다.'));
    } else {
      sum.push('b에 2를 담으면 10 / 2는 5이고 예외가 나지 않아, try-catch가 없어도 5와 "끝"이 출력됐습니다.');
      sum.push('예외가 나지 않는 코드는 try-catch가 있든 없든 결과가 같습니다. try-catch가 하는 일은 예외가 났을 때에 필요합니다.');
    }
    var out = st.out.length ? st.out.join(' / ') : '(아무것도 출력되지 않음)';
    return { events: ev, summary: sum, row: [out, st.ended === 'ok' ? '끝까지 실행됨' : 'ArithmeticException으로 멈춤', !c.tc ? 'catch 없음' : st.ln.ct === 'ok' ? '실행됨' : '실행되지 않음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 main 메서드의 첫 줄부터 한 줄씩 실행합니다.'); return; }
    H.table(v, ['실행한 줄', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '실행');
    if (s.out.length) H.table(v, ['출력'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), '표준 출력');
    H.counters(v, [[s.thrown, '던져진 예외'], [s.out.length, '출력된 줄']]);
  },
  // 그림: 왼쪽에 코드의 줄들을 위에서 아래로(a / b 계산, try 안의 출력, catch, "끝" 출력) 상자로 두고, 실행이 지나간 줄은 초록, 예외가 난 줄은 빨강, 건너뛴 줄은 점선. 오른쪽에 던져진 예외 객체와, 그것이 catch로 건너가는(또는 잡히지 못하는) 화살표. 아래에 프로그램이 끝난 방식과 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 360);
    var hot = s ? s.hot : '', ln = s ? s.ln : { calc: '', pr: '', ct: '', end: '' }, Z = c.b === 'zero';
    var cls = function (id, st) { return st === 'bad' ? 'bad' : st === 'ok' ? (hot === id ? 'good now' : 'good') : st === 'skip' ? 'ghost' : hot === id ? 'hot now' : 'plain'; };
    P.box('calc', 14, 14, 330, 48, { cls: cls('calc', ln.calc), title: 'a / b 계산', sub: ln.calc === 'ok' ? '10 / 2 = 5' : ln.calc === 'bad' ? '10 / 0: 계산할 수 없음' : '10 / ' + (Z ? '0' : '2') + (ln.calc === 'now' ? ' 계산하는 중' : ' (실행 전)') });
    P.box('pr', 14, 76, 330, 48, { cls: cls('pr', ln.pr), title: c.tc ? 'try 안의 println(a / b)' : 'println(a / b)', sub: ln.pr === 'ok' ? '5를 출력함' : ln.pr === 'skip' ? '실행되지 않음' : '실행 전' });
    if (c.tc) P.box('ct', 14, 138, 330, 48, { cls: cls('ct', ln.ct), title: 'catch (' + (c.kind === 'arith' ? 'ArithmeticException' : 'NullPointerException') + ' e)', sub: ln.ct === 'ok' ? '"0으로 나눌 수 없습니다" 출력함' : ln.ct === 'skip' ? (Z ? '종류가 맞지 않아 실행되지 않음' : '예외가 나지 않아 실행되지 않음') : ln.ct === 'now' ? '종류를 확인하는 중' : '실행 전' });
    else P.box('ct', 14, 138, 330, 48, { cls: 'ghost', title: 'catch', sub: 'catch 없음' });
    P.box('end', 14, 200, 330, 48, { cls: cls('end', ln.end), title: '"끝" 출력', sub: ln.end === 'ok' ? '출력함' : ln.end === 'skip' ? '실행되지 않음' : '실행 전' });
    P.box('exc', 410, 14, 256, 62, { cls: s && s.exc ? 'bad' : 'ghost', title: 'ArithmeticException 객체', sub: s && s.exc ? '메시지: / by zero' : '아직 없음' });
    if (s && s.exc) P.arrow('thr', 'calc:r:0.5', 'exc:l:0.5', { cls: 'bad' });
    if (s && s.exc && c.tc && ln.ct) P.arrow('jump', 'exc:b:0.2', 'ct:r:0.5', { cls: ln.ct === 'skip' && c.kind === 'npe' ? 'bad dash' : ln.ct === 'now' ? 'hot' : 'good' });
    if (s && s.ended === 'exc') P.arrow('lost', 'exc:b:0.8', 'r1:t:0.8', { cls: 'bad' });
    P.box('r1', 14, 262, 652, 44, { cls: s && s.ended === 'ok' ? 'good' : s && s.ended === 'exc' ? 'bad' : 'ghost', title: '프로그램이 끝난 방식', right: s && s.ended === 'ok' ? '끝까지 실행됨' : s && s.ended === 'exc' ? 'ArithmeticException으로 멈춤' : '', sub: s && s.ended === 'exc' ? '오류로 알림: ArithmeticException: / by zero' : '' });
    P.box('r2', 14, 316, 652, 36, { cls: s && s.out.length ? 'good' : s && s.ended ? 'bad' : 'ghost', title: '출력', right: s ? (s.out.length ? s.out.join(' / ') : s.ended ? '(아무것도 출력되지 않음)' : '(아직 출력 없음)') : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 여덟 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일해 모두 컴파일되는 것을 확인했고, 컴파일된 Main을 이 JDK의 java를 자식 프로세스로 띄워 실제로 실행해 표준 출력, 표준 오류, 종료 코드를 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 표준 출력의 줄들(결과 표의 출력 열), 종료 코드와 표준 오류의 첫 줄(프로그램이 끝난 방식 열: 정상이면 종료 코드 0에 표준 오류가 비어 있었고, 멈추면 종료 코드 1에 첫 줄이 Exception in thread "main" java.lang.ArithmeticException: / by zero였으며 표준 오류에 Main.main이 있는 스택 추적이 이어졌습니다), catch 안의 코드가 실행됐는지(catch 안의 println이 출력한 글이 표준 출력에 있는지)입니다. 멈춘 조합은 모두 표준 출력이 비어 있어 "끝"이 출력되지 않았습니다. try-catch가 없는 조합은 catch가 잡는 종류 설정이 쓰이지 않아 두 조합의 결과가 같습니다. 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. 규칙을 어기면 자바 가상 머신이 예외로 알리고 프로그램이 정한 곳으로 제어가 옮겨진다는 것은 11장 서두, 예외가 던져지면 가장 가까이 둘러싼 try의 그 예외를 처리할 수 있는 catch로 제어가 옮겨지고 예외를 일으킨 코드는 다시 실행되지 않으며 처리할 catch가 없으면 그 스레드가 끝난다는 것은 11.3절, throw가 즉시 제어를 옮기고 맞는 try가 없으면 그 스레드가 끝난다는 것은 14.18절, catch의 매개변수는 하나이고 그 종류는 Throwable이거나 그 하위 클래스여야 한다는 것은 14.20절, 던져진 값의 종류가 catch에 적은 종류에 대입할 수 있으면 가장 왼쪽의 맞는 catch가 선택되어 그 블록이 실행되고 그 블록이 정상으로 끝나면 try 문도 정상으로 끝나며 맞는 catch가 없으면 try 문이 같은 예외로 끝난다는 것은 14.20.1절, 정수 나눗셈에서 나누는 수가 0이면 ArithmeticException이 던져진다는 것은 15.17.2절을 따랐습니다. 14.20.1절의 맞는 종류에는 적은 종류의 하위 종류도 들어가지만, 이 실습의 catch는 ArithmeticException과 NullPointerException뿐이고 둘은 서로 상하 관계가 아니어서 하위 종류를 잡는 경우는 다루지 않았습니다. 표준 오류에 나온 글과 종료 코드 1은 명세가 정한 것이 아니라 이 java에서 관찰한 것입니다. 화면의 코드는 java Main으로 실행하는 모양 그대로이고 패키지는 없습니다. 그림의 10 / 0과 10 / 2는 a와 b에 담은 값을 풀어 쓴 것입니다. 예외에는 이 밖에도 catch를 여러 개 쓰는 것, finally, throw로 직접 던지기, 호출한 메서드를 거슬러 올라가며 잡는 곳을 찾는 것, 체크 예외가 있지만 이 실습은 다루지 않았습니다. 이것들은 "세부 동작 실습: 예외와 finally"에서 다룹니다.',
});
