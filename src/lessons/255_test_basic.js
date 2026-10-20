Lab.register({
  id: 'test_basic', nav: '테스트 코드', cat: '기초개념', mode: 'step', basic: true, deep: ['testing', 'cicd'],
  title: '테스트 코드는 무엇이고, 통과와 실패는 누가 정하는가',
  why: '코드를 고친 뒤 맞게 동작하는지 보려면 프로그램을 띄워 손으로 값을 넣고 눈으로 결과를 확인해야 하고, 고칠 때마다 같은 확인을 되풀이하기는 어렵다. 테스트 코드는 그 확인을 코드로 남겨서, JUnit 같은 도구가 많은 확인을 한 번에 다시 돌리고 어긋난 곳을 알려 주게 한다.',
  use: '스프링 부트 프로젝트를 새로 만들면 src/test/java 폴더와 JUnit이 처음부터 준비되어 있고, ./gradlew test 명령이나 IDE의 실행 단추로 테스트를 돌린다. 코드를 고친 뒤 예전 기능이 깨지지 않았는지 보거나, 코드를 올릴 때마다 자동으로 돌게 설정해 실패한 코드가 합쳐지지 않게 막는 데 쓴다.',
  intro: '테스트 코드는 "이 메서드에 이것을 넣으면 이것이 나와야 한다"를 코드로 적어 둔 것입니다. 이 실습에서 예시로 만든 CalcTest 클래스가 그 예입니다. 그 안의 adds() 메서드가 역시 예시로 만든 Calc 클래스의 add(2, 3)을 부르고, assertEquals(5, ...)가 add가 돌려준 값을 기대한 값 5와 견줍니다. 두 값이 다르면 그 줄에서 오류가 납니다. adds() 위의 @Test는 "이 메서드가 테스트"라는 표시입니다. 이 코드를 실행하는 것은 우리가 아니라 테스트 도구 JUnit입니다. JUnit이 @Test가 붙은 메서드를 찾아 부르고, 오류 없이 끝나면 통과, assertEquals가 낸 오류로 끝나면 실패로 셉니다. 이 실습은 add를 틀리게 고치거나, 기대한 값을 틀리게 적거나, @Test를 지워 가며 같은 코드를 실제 JUnit으로 실행해, 찾은 테스트 수와 통과와 실패 판정, 실패 메시지가 어떻게 달라지는지 봅니다. (화면의 코드는 import 줄을 줄였습니다.)',
  terms: ['테스트 코드', 'JUnit', '@Test', 'assertEquals'],
  controls: [
    { id: 'impl', label: 'add 메서드가 돌려주는 식', type: 'select', value: 'plus', options: [['plus', 'return a + b;  (더한다)'], ['minus', 'return a - b;  (실수로 뺀다)']] },
    { id: 'expect', label: 'assertEquals에 적은 기대한 값', type: 'select', value: 'five', options: [['five', '5'], ['six', '6  (잘못 적음)']] },
    { id: 'anno', label: 'adds() 위에 @Test를 적는다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '테스트 코드는 어떻게 생겼고, 통과는 무엇을 뜻하나', d: '@Test가 붙은 adds()가 add(2, 3)의 결과를 기대한 값 5와 견주고, 같아서 통과합니다.', v: { impl: 'plus', expect: 'five', anno: true } },
    { t: 'add를 a - b로 잘못 고치면', q: 'add를 return a - b; 로 잘못 고치면', d: 'add(2, 3)의 결과가 -1이 되어 기대한 값 5와 달라지고, JUnit이 실패로 셉니다.', v: { impl: 'minus', expect: 'five', anno: true } },
    { t: '기대한 값을 6으로 잘못 적으면', q: 'add는 맞는데 assertEquals에 기대한 값을 6으로 잘못 적으면', d: '코드는 맞아도 적어 둔 기대와 달라서 실패합니다.', v: { impl: 'plus', expect: 'six', anno: true } },
    { t: '@Test를 지우면', q: 'adds() 위의 @Test를 지우면', d: 'JUnit이 adds()를 테스트로 세지 않아 한 번도 실행하지 않습니다.', v: { impl: 'plus', expect: 'five', anno: false } },
    { t: 'a - b로 고치고 @Test도 지우면', q: 'add를 return a - b; 로 잘못 고치고 @Test도 지우면', d: '틀린 코드가 있어도 테스트가 실행되지 않아 아무 알림이 없습니다.', v: { impl: 'minus', expect: 'five', anno: false } },
    { t: 'a - b이고 기대한 값도 6이면', q: 'add를 return a - b; 로 고치고 기대한 값도 6으로 적으면', d: '둘 다 틀려도 JUnit은 두 값이 다르다는 것만 알려 줍니다.', v: { impl: 'minus', expect: 'six', anno: true } },
  ],
  code: function (c) {
    var o = ['// 검사받는 코드', 'class Calc {', '    int add(int a, int b) {', '        return ' + (c.impl === 'plus' ? 'a + b' : 'a - b') + ';', '    }', '}', '', '// 테스트 코드: Calc가 맞게 동작하는지 확인하는 코드', 'class CalcTest {'];
    if (c.anno) o.push('    // 표시: JUnit은 @Test가 붙은 메서드를 찾아 테스트로 실행한다', '    @Test');
    o.push('    void adds() {', '        // 판정: 앞의 값(기대한 값)과 뒤의 값(실제 값)이 다르면 실패', '        assertEquals(' + (c.expect === 'five' ? '5' : '6') + ', new Calc().add(2, 3));', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.impl === 'plus' ? 'a + b' : 'a - b') + ' · 기대한 값 ' + (c.expect === 'five' ? '5' : '6') + ' · ' + (c.anno ? '@Test 있음' : '@Test 없음'); },
  columns: ['실행된 테스트', '결과', '실패 메시지'],
  simulate: function (c) {
    var ev = [], sum = [], plus = c.impl === 'plus', A = plus ? 5 : -1, E = c.expect === 'five' ? 5 : 6, eq = A === E;
    var expr = plus ? 'a + b' : 'a - b', calc = plus ? '2 + 3' : '2 - 3', msg = 'expected: <' + E + '> but was: <' + A + '>';
    var wrong = !plus || E !== 5;
    var st = { hot: '', phase: '', found: 0, passed: 0, failed: 0, ran: false, actual: '', verdict: '', msg: '', started: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    st.hot = 'ju'; st.started = true;
    push('테스트 도구 JUnit이 CalcTest 클래스를 실행합니다. JUnit은 테스트를 찾아 부르고 통과인지 실패인지 판정해 주는 프로그램입니다. 우리가 쓴 코드에는 main 메서드도, adds() 메서드를 부르는 줄도 없습니다. 코드를 움직이는 것은 JUnit입니다.', '');
    st.phase = 'find';
    if (c.anno) {
      st.found = 1;
      push('JUnit이 CalcTest 클래스의 메서드를 살펴 @Test가 붙은 것을 찾습니다. adds()에 @Test가 붙어 있으므로 JUnit이 이 메서드를 테스트로 셉니다. 찾은 테스트는 1개입니다.', '');
      st.hot = 'ts'; st.phase = 'call'; st.ran = true;
      push('JUnit이 adds() 메서드를 부릅니다. 이 줄도 우리가 쓰지 않았습니다. 테스트 메서드를 부르는 것은 우리 코드가 아니라 JUnit입니다.', '');
      st.hot = 'ca'; st.phase = 'add';
      push('adds() 안의 new Calc().add(2, 3)이 실행됩니다. Calc 객체를 만들어 add에 2와 3을 넘기면, return ' + expr + '; 줄이 계산합니다(' + calc + ').', '');
      st.actual = String(A); st.phase = 'back'; st.hot = 'ts';
      push('add가 계산한 결과는 ' + A + '입니다. add가 이 값을 adds()로 돌려주고, 이것이 실제 값입니다.', '');
      st.phase = 'cmp';
      if (eq) {
        push('assertEquals(' + E + ', ...)가 두 값을 견줍니다. 기대한 값은 ' + E + ', 실제 값은 ' + A + '입니다. 두 값이 같으므로 assertEquals는 아무 일 없이 끝나고, adds()도 오류 없이 끝까지 갑니다.', 'good');
        st.hot = 'ju'; st.phase = 'judge'; st.passed = 1; st.verdict = 'pass';
        push('JUnit이 adds()가 오류 없이 끝난 것을 보고 통과로 셉니다. 통과인지는 사람이 출력을 눈으로 읽어서가 아니라 JUnit이 판정했습니다.', 'good');
      } else {
        push('assertEquals(' + E + ', ...)가 두 값을 견줍니다. 기대한 값은 ' + E + ', 실제 값은 ' + A + '입니다. 두 값이 다르므로 assertEquals가 AssertionFailedError라는 오류를 던지고, adds()는 이 줄에서 오류로 끝납니다.', 'bad');
        st.hot = 'ju'; st.phase = 'judge'; st.failed = 1; st.verdict = 'fail'; st.msg = msg;
        push('JUnit이 adds()가 오류로 끝난 것을 보고 실패로 세고, 오류의 메시지 "' + msg + '"를 기록합니다. 실패인지는 사람이 출력을 읽어서가 아니라 JUnit이 판정했습니다.', 'bad');
      }
      st.phase = 'end'; st.verdict = eq ? 'pass' : 'fail';
      push('JUnit이 끝납니다. 찾은 테스트는 1개, 통과는 ' + st.passed + '개, 실패는 ' + st.failed + '개입니다.', eq ? 'good' : 'bad');
    } else {
      push('JUnit이 CalcTest 클래스의 메서드를 살펴 @Test가 붙은 것을 찾습니다. adds()라는 메서드는 있지만 @Test가 붙어 있지 않아, JUnit은 이 메서드를 테스트로 세지 않습니다. 찾은 테스트는 0개입니다.', '');
      st.hot = 'ts'; st.phase = 'skip';
      push('테스트로 세지 않은 adds()는 JUnit이 부르지 않습니다. 우리 코드에도 부르는 줄이 없으므로 adds()는 한 번도 실행되지 않고, Calc의 add도 실행되지 않습니다.', 'bad');
      st.hot = 'ju'; st.phase = 'end'; st.verdict = 'none';
      push('JUnit이 끝납니다. 찾은 테스트는 0개, 통과는 0개, 실패는 0개입니다.' + (wrong ? ' 이 코드에는 틀린 곳이 있지만, 실행된 것이 없으니 JUnit은 아무것도 알려 주지 않습니다.' : ' 실패가 0개라고 해서 확인된 것은 아닙니다. 아무것도 실행하지 않았기 때문입니다.'), 'bad');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (c.anno && eq) {
      sum.push('테스트 코드는 Calc를 부르는 메서드 adds()와, 결과를 assertEquals(기대한 값, 실제 값)으로 견주는 줄로 이루어진 코드입니다. 일반 코드와 다른 곳은 메서드 위의 @Test(JUnit이 찾는 표시)와 assertEquals(JUnit이 판정하는 줄)입니다. 두 값이 같아서 adds()가 오류 없이 끝났고, JUnit이 통과로 셌습니다.');
      sum.push('adds()를 부르는 줄은 우리가 쓰지 않았습니다. 테스트를 찾아 부르고 통과인지 판정하는 일은 JUnit이 합니다. 통과는 "오류 없이 끝났다"는 뜻입니다.');
    } else if (c.anno && plus) {
      sum.push('add는 맞게 쓰였는데 assertEquals에 기대한 값을 6으로 잘못 적으면, add(2, 3)이 5를 돌려줘도 두 값이 달라서 실패합니다. 실패 메시지는 "' + msg + '"입니다.');
      sum.push('JUnit은 두 값이 다르다는 것만 압니다. 틀린 쪽이 add인지 적어 둔 기대인지는 모르고, 그것은 실패 메시지를 읽은 사람이 판단합니다.');
    } else if (c.anno && E === 5) {
      sum.push('add를 return a - b; 로 잘못 고치면 돌려준 값이 ' + A + '이 되어 기대한 값 5와 달라지고, assertEquals가 오류를 던져 JUnit이 실패로 셌습니다. 실패 메시지는 "' + msg + '"입니다.');
      sum.push('add를 잘못 고친 것을 사람이 출력을 읽지 않아도 JUnit이 알려 주었습니다. 코드를 고칠 때마다 테스트를 실행하면 잘못 고친 것을 바로 알 수 있습니다.');
    } else if (c.anno) {
      sum.push('add도 틀리고 기대한 값도 틀리게 적어도 결과는 실패입니다. 실제 값은 ' + A + ', 적어 둔 기대한 값은 6이라서 "' + msg + '"라는 메시지가 남았습니다.');
      sum.push('JUnit은 두 값을 견줄 뿐, 둘 중 무엇이 틀렸는지는 알려 주지 않습니다. 실패 메시지의 두 값을 보고 사람이 원인을 찾아야 합니다.');
    } else {
      sum.push('@Test를 지우면 JUnit이 adds()를 테스트로 세지 않아 찾은 테스트가 0개이고, adds()와 add는 한 번도 실행되지 않았습니다. 실패도 0개였습니다.' + (wrong ? ' 틀린 곳이 있는데도 아무 알림이 없었습니다.' : ''));
      sum.push('@Test가 없는 메서드는 오류 없이 조용히 실행되지 않습니다. 테스트를 썼는데 실행된 테스트가 0개라면 먼저 @Test가 붙어 있는지 확인해야 합니다.');
    }
    var row = c.anno ? ['1개 (adds)', eq ? '통과' : '실패', eq ? '없음' : msg] : ['0개', '판정할 테스트가 없음 (통과도 실패도 아님)', '없음'];
    return { events: ev, summary: sum, A: A, E: E, msg: msg, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 JUnit이 테스트를 찾는 것부터 시작합니다.'); return; }
    var rows = [{ cls: '', cells: ['찾은 테스트', s.phase === 'find' || s.found || s.phase === 'skip' || s.phase === 'end' ? s.found + '개' : '아직 찾지 않음'] }];
    if (s.ran) rows.push({ cls: '', cells: ['adds() 실행', '1번'] });
    else if (s.phase === 'skip' || s.verdict === 'none') rows.push({ cls: '', cells: ['adds() 실행', { v: '0번', cls: 'bad' }] });
    if (s.actual) rows.push({ cls: '', cells: ['add(2, 3)이 돌려준 값', s.actual] });
    if (s.verdict === 'pass') rows.push({ cls: '', cells: ['JUnit의 판정', { v: '통과', cls: 'good' }] });
    else if (s.verdict === 'fail') rows.push({ cls: '', cells: ['JUnit의 판정', { v: '실패', cls: 'bad' }] }, { cls: '', cells: ['실패 메시지', { v: s.msg, cls: 'bad' }] });
    else if (s.verdict === 'none') rows.push({ cls: '', cells: ['JUnit의 판정', { v: '판정할 테스트가 없음', cls: 'bad' }] });
    H.table(v, ['일어난 일', '결과'], rows, 'JUnit의 실행');
    H.counters(v, [[s.found, '찾은 테스트'], [s.passed, '통과'], [s.failed, '실패']]);
  },
  // 그림: 왼쪽에 JUnit, 가운데에 테스트 메서드 adds(), 오른쪽에 검사받는 Calc.add. JUnit이 adds()를 부르고 adds()가 add를 부르는 화살표가 @Test가 없으면 생기지 않는다. 아래에 JUnit의 판정과 찾은 테스트, 통과, 실패를 세는 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '', ph = s ? s.phase : '';
    P.size(680, 268);
    var juSub = !s ? '실행 전' : ph === 'find' ? '@Test를 찾는 중' : s.verdict === 'pass' ? '통과로 판정' : s.verdict === 'fail' ? '실패로 판정' : s.verdict === 'none' ? '부를 테스트가 없음' : ph === 'call' ? 'adds()를 부르는 중' : '실행 중';
    P.box('ju', 14, 16, 180, 118, { cls: s && s.verdict === 'fail' ? 'bad' : s && s.verdict === 'pass' ? 'good' : hot === 'ju' ? 'hot now' : 'plain', title: 'JUnit', sub: juSub });
    var tsSub = !s ? (c.anno ? '@Test 있음' : '@Test 없음') : [c.anno ? '@Test 있음' : '@Test 없음', s.ran ? 'JUnit이 불러서 실행' : ph === 'skip' || s.verdict === 'none' ? '불리지 않음' : '아직 안 불림'];
    P.box('ts', 250, 16, 180, 118, { cls: !c.anno && s && (ph === 'skip' || s.verdict === 'none') ? 'bad' : hot === 'ts' ? 'hot now' : c.anno ? 'plain' : 'ghost', title: 'CalcTest.adds()', sub: tsSub });
    var caSub = !s || !s.actual && ph !== 'add' ? (c.impl === 'plus' ? 'return a + b;' : 'return a - b;') : [c.impl === 'plus' ? 'return a + b;' : 'return a - b;', s.actual ? '돌려준 값 ' + s.actual : '계산하는 중'];
    P.box('ca', 486, 16, 180, 118, { cls: hot === 'ca' ? 'hot now' : s && s.ran ? 'plain' : 'ghost', title: 'Calc.add', sub: caSub });
    if (s && ph === 'call') P.arrow('c1', 'ju:r:0.3', 'ts:l:0.3', { cls: 'hot' });
    if (s && (ph === 'add')) P.arrow('c2', 'ts:r:0.3', 'ca:l:0.3', { cls: 'hot' });
    if (s && ph === 'back') P.arrow('c3', 'ca:l:0.7', 'ts:r:0.7', { cls: 'good' });
    if (s && ph === 'cmp') P.arrow('c4', 'ts:l:0.7', 'ju:r:0.7', { cls: s.failed || sim.A !== sim.E ? 'bad' : 'good' });
    if (s && ph === 'skip') P.arrow('c5', 'ju:r:0.3', 'ts:l:0.3', { cls: 'bad' });
    var jr = !s || !s.verdict ? '' : s.verdict === 'pass' ? '통과' : s.verdict === 'fail' ? '실패' : '판정할 테스트 없음';
    P.box('jd', 14, 150, 652, 52, { cls: s && s.verdict === 'pass' ? 'good' : s && (s.verdict === 'fail' || s.verdict === 'none') ? 'bad' : 'ghost', title: 'JUnit의 판정', right: jr, sub: s && s.msg ? s.msg : '' });
    P.box('n1', 14, 218, 208, 36, { cls: s && s.found ? 'wait' : 'ghost', title: '찾은 테스트', right: (s ? s.found : 0) + '개' });
    P.box('n2', 236, 218, 208, 36, { cls: s && s.passed ? 'good' : 'ghost', title: '통과', right: (s ? s.passed : 0) + '개' });
    P.box('n3', 458, 218, 208, 36, { cls: s && s.failed ? 'bad' : 'ghost', title: '실패', right: (s ? s.failed : 0) + '개' });
  },
  assume: '실행한 것은 JDK 21.0.12.1(javac 21)과 JUnit Jupiter 6.0.3, JUnit Platform Launcher 6.0.3입니다. 여덟 가지 조합을 모두, 화면의 코드 맨 위에 import 두 줄(org.junit.jupiter.api.Test, Assertions.assertEquals)만 더한 같은 소스를 javax.tools로 컴파일하고, JUnit Platform Launcher를 코드로 불러 CalcTest 클래스를 실행해 요약을 얻은 결과와 대조했습니다. 터미널에서 ConsoleLauncher를 쓴 것이 아니라 같은 도구의 Launcher API를 직접 썼습니다. 대조한 것은 찾은 테스트 수, 시작한 수, 성공과 실패의 수, 실패한 예외의 종류(org.opentest4j.AssertionFailedError)와 메시지의 첫 줄입니다. 메시지 글자 expected: <5> but was: <-1>은 이 JUnit이 실제로 낸 글 그대로입니다. 단계 문장이 기대는 사실로, 호출 횟수를 세는 필드를 더한 별도의 소스를 같은 방식으로 실행해, @Test가 있으면 우리 코드가 부르는 줄 없이 adds()와 add가 한 번씩 실행되고 @Test를 지우면 둘 다 0번인 것을 확인했습니다. 문서는 JUnit User Guide(docs.junit.org, 6.1.3판)의 Definitions 절에서 테스트 메서드가 @Test 등이 붙은 인스턴스 메서드이고 테스트 클래스는 테스트 메서드를 가진 클래스라는 것, Test Classes and Methods 절에서 테스트 클래스와 메서드가 public일 필요는 없지만 private이면 안 되고 값을 돌려주면 안 된다는 것, Assertions 절에서 JUnit Jupiter의 단언이 org.junit.jupiter.api.Assertions의 static 메서드이고 예제가 assertEquals(2, calculator.add(1, 1))처럼 기대한 값을 앞에 적는다는 것을, API 문서에서 @Test가 메서드가 테스트 메서드임을 알리는 표시이고 private이거나 static이면 안 된다는 것, Assertions의 설명(실패한 단언은 따로 정한 것이 없으면 AssertionFailedError나 그 하위 타입을 던진다)과 assertEquals(int expected, int actual)의 요약(expected와 actual이 같다고 단언한다)을 열어 확인했습니다. 문서는 6.1.3판이고 실행한 JUnit은 6.0.3판입니다. 문서가 정한 것과 이 실행에서 관찰한 것은 다릅니다. 오류 없이 끝나면 통과이고 오류로 끝나면 실패로 세는 것, @Test가 없는 메서드를 찾지 않아 찾은 테스트가 0개이고 실패도 0개로 세는 것은 이 JUnit에서 관찰한 동작입니다(ConsoleLauncher의 종료 코드나 빌드 도구가 테스트 0개를 어떻게 다루는지는 실행하지 않았습니다). assertEquals의 앞뒤 값 중 앞이 기대한 값이라는 것은 메서드 이름과 인자 이름(expected, actual)으로 확인했고, 문서가 순서를 규칙으로 따로 적어 두지는 않았습니다. 화면은 테스트 한 개만 다루고, 테스트 이름 붙이기, 여러 개의 단언, 준비와 정리 메서드, 스프링 컨텍스트를 띄우는 테스트, @MockitoBean 같은 가짜 객체, 테스트를 자동으로 돌리는 빌드 과정은 다루지 않습니다. 스프링 컨텍스트를 띄우는 테스트는 "세부 동작 실습: 테스트", 테스트를 올릴 때마다 자동으로 돌리는 것은 "세부 동작 실습: CI/CD 파이프라인"에서 다룹니다.',
});
