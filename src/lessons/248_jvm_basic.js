Lab.register({
  id: 'jvm_basic', nav: '컴파일과 JVM', cat: '기초개념', mode: 'step', basic: true, deep: ['classload', 'jit'],
  title: '자바 코드는 어떻게 실행되는가',
  intro: '우리가 쓰는 Hello.java 파일은 사람이 읽는 글입니다. 이 글이 그대로 실행되는 것이 아니라 두 단계를 거칩니다. 터미널(명령을 글자로 입력하는 창)에서 javac Hello.java 명령을 쓰면 javac라는 프로그램(컴파일러)이 이 글을 읽어 Hello.class 파일로 바꿉니다. 이 일을 컴파일이라고 합니다. Hello.class에는 JVM이 읽는 바이트코드가 들어 있습니다. 이어서 java Hello 명령을 쓰면 JVM(자바 가상 머신)이 뜨고, JVM이 Hello.class를 읽어 main을 실행합니다. 이 실습은 javac 줄을 지우고, 소스의 글을 틀리게 하거나 컴파일한 뒤에 고쳐 가며 실제 javac와 java 명령을 실행해, Hello.class가 만들어지는지와 java Hello가 무엇을 실행하는지를 봅니다.',
  terms: ['컴파일과 javac', '.class 파일', 'JVM(자바 가상 머신)', '바이트코드'],
  controls: [
    { id: 'compile', label: '터미널에 javac Hello.java 줄을 쓴다', type: 'check', value: true },
    { id: 'src', label: 'Hello.java의 글', type: 'select', value: 'ok', options: [['ok', '맞는 코드'], ['nosemi', '출력하는 줄 끝의 세미콜론(;)을 뺀 코드'], ['edited', '컴파일한 뒤 "안녕"을 "잘 가"로 고침']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'Hello.java 파일은 어떻게 생겼고, 터미널에 javac Hello.java 명령과 java Hello 명령을 차례로 쓰면 무슨 일이 일어나나', d: 'javac가 Hello.class를 만들고, JVM이 Hello.class를 읽어 안녕을 출력합니다.', v: { compile: true, src: 'ok' } },
    { t: 'javac 줄을 지우면', q: 'javac Hello.java 명령을 지우고 java Hello 명령만 쓰면', d: 'Hello.class가 만들어지지 않아 java Hello가 실행할 것을 찾지 못합니다.', v: { compile: false, src: 'ok' } },
    { t: '세미콜론을 빼면', q: '"안녕"을 출력하는 줄 끝의 세미콜론(;)을 빼고 컴파일하면', d: 'javac가 문법 오류를 알리고 Hello.class를 만들지 않습니다.', v: { compile: true, src: 'nosemi' } },
    { t: '컴파일한 뒤 소스만 고치면', q: '컴파일한 뒤 "안녕"을 "잘 가"로 고치고, javac 명령은 다시 쓰지 않고 java Hello 명령만 쓰면', d: '고치기 전에 만든 Hello.class가 실행되어 안녕이 출력됩니다.', v: { compile: true, src: 'edited' } },
    { t: 'javac 줄도 지우고 세미콜론도 빼면', q: 'javac Hello.java 명령을 지우고, 출력하는 줄 끝의 세미콜론(;)도 뺀 채로 java Hello 명령만 쓰면', d: 'javac가 읽은 적이 없어 문법 오류는 알려지지 않고, 같은 이유로 실행에 실패합니다.', v: { compile: false, src: 'nosemi' } },
  ],
  code: function (c) {
    var o = ['# Hello.java', 'public class Hello {', '    // main: java 명령이 가장 먼저 부르는 메서드', '    public static void main(String[] args) {',
      '        System.out.println("' + (c.src === 'edited' ? '잘 가' : '안녕') + '")' + (c.src === 'nosemi' ? '' : ';'), '    }', '}', '', '# 터미널'];
    if (c.compile) o.push('# 컴파일: javac가 Hello.java를 읽고 Hello.class를 만든다', 'javac Hello.java');
    if (c.src === 'edited') o.push('# 편집기에서 Hello.java의 "안녕"을 "잘 가"로 고친다');
    o.push('# 실행: java가 JVM을 띄워 Hello.class의 main을 실행한다', 'java Hello');
    return o.join('\n');
  },
  label: function (c) { return (c.compile ? 'javac 줄 있음' : 'javac 줄 없음') + ' · ' + { ok: '맞는 코드', nosemi: '세미콜론 없는 코드', edited: '컴파일 뒤 소스만 고침' }[c.src]; },
  columns: ['Hello.class', '실행 결과', '출력한 글과 소스의 글', '멈춘 곳'],
  simulate: function (c) {
    var ev = [], sum = [], noSemi = c.src === 'nosemi', edited = c.src === 'edited';
    var made = c.compile && !noSemi, run = made;
    var st = { hot: '', jc: '', cls: '', jvm: '', files: ['Hello.java'], srcSub: '"안녕"을 출력하는 코드', clsTxt: '', out: [], fail: false, checks: [], made: 0, lines: 0 };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. 소스 파일
    st.hot = 'src';
    push('Hello.java 파일에는 사람이 읽는 자바 코드가 적혀 있고, 이 코드는 "안녕"을 출력하라는 뜻입니다. 이 코드를 실행하려면 두 단계를 거칩니다. 먼저 javac 명령이 Hello.java 파일을 Hello.class라는 다른 파일로 바꾸고(컴파일), 그다음 java 명령이 Hello.class 파일을 읽어 실행합니다. java 명령이 찾는 것은 Hello.java 글이 아니라 Hello.class 파일입니다.', '');

    // 2. 컴파일
    if (c.compile) {
      st.hot = 'jc'; st.jc = 'run';
      if (noSemi) {
        st.srcSub = '세미콜론이 빠진 코드';
        push('터미널에서 javac Hello.java 명령을 실행합니다. javac 컴파일러가 Hello.java 파일을 처음부터 읽다가 4번째 줄, System.out.println("안녕") 끝에 세미콜론(;)이 없는 것을 발견합니다. 자바에서는 문장을 세미콜론으로 끝내야 하므로 문법 오류입니다(javac: \';\' expected).', 'bad');
        st.jc = 'err'; st.cls = 'err'; st.hot = 'cls';
        st.checks.push(['javac Hello.java', { v: '오류 1개 · 종료 코드 1', cls: 'bad' }]);
        push('javac 명령이 오류 1개를 알리고 끝났습니다(종료 코드 1). 이번에는 Hello.class 파일이 만들어지지 않았고, 폴더에는 Hello.java 파일만 있습니다. 문법이 틀린 것은 프로그램을 실행하기 전, 컴파일할 때 알게 됩니다.', 'bad');
      } else {
        push('터미널에서 javac Hello.java 명령을 실행합니다. javac 컴파일러가 Hello.java 파일을 처음부터 읽으며 자바 문법에 맞는지 확인하고, 맞으면 읽은 내용을 바이트코드로 바꿔 Hello.class 파일에 씁니다. 이 단계에서는 코드를 바꾸기만 하고 실행하지 않으므로 아무것도 출력되지 않습니다.', '');
        st.jc = 'ok'; st.cls = 'made'; st.clsTxt = '안녕'; st.made = 1; st.files = ['Hello.java', 'Hello.class']; st.hot = 'cls';
        st.checks.push(['javac Hello.java', { v: '오류 없음 · Hello.class 생김', cls: 'good' }]);
        push('javac 명령이 오류 없이 끝났습니다(종료 코드 0). 폴더에 Hello.class 파일이 생겼습니다. 이 파일에는 사람이 읽는 글이 아니라 JVM이 읽는 바이트코드가 들어 있습니다. Hello.java 파일은 그대로 남아 있습니다.', 'good');
      }
    } else {
      st.hot = 'jc'; st.jc = 'skip'; st.cls = 'none';
      st.checks.push(['javac Hello.java', { v: '실행하지 않음', cls: '' }]);
      push('이 터미널에는 javac Hello.java 명령을 쓰지 않았습니다. 그래서 컴파일이 일어나지 않았고, 폴더에는 Hello.java 파일 하나뿐이며 Hello.class 파일은 없습니다.' + (noSemi ? ' javac 컴파일러가 Hello.java 파일을 읽은 적이 없으므로, 4번째 줄 끝에 세미콜론이 빠져 있다는 것도 아직 아무도 확인하지 않았습니다.' : ''), '');
    }

    // 3. 컴파일한 뒤 소스를 고침
    if (edited) {
      st.hot = 'src'; st.srcSub = '"잘 가"로 고친 코드';
      st.checks.push(['Hello.java 고침', { v: c.compile ? '"안녕"을 "잘 가"로 · Hello.class는 그대로' : '"안녕"을 "잘 가"로', cls: '' }]);
      push(c.compile ? 'Hello.java 파일을 편집기에서 열어 "안녕"을 "잘 가"로 고치고 저장합니다. 고친 것은 Hello.java 파일뿐입니다. 방금 만든 Hello.class 파일은 한 글자도 바뀌지 않았습니다. Hello.class는 javac 컴파일러가 고치기 전의 Hello.java를 읽고 만든 파일이기 때문입니다.' : 'Hello.java 파일을 편집기에서 열어 "안녕"을 "잘 가"로 고치고 저장합니다. 컴파일한 적이 없으므로 폴더에는 여전히 Hello.class 파일이 없습니다.', '');
    }

    // 4. 실행
    st.hot = 'jvm';
    if (run) {
      st.jvm = 'run';
      push('터미널에서 java Hello 명령을 실행합니다. java 명령이 JVM을 띄우고, JVM이 현재 폴더에서 Hello.class 파일을 찾아 읽어 들입니다. JVM이 읽는 것은 Hello.class 파일이고 Hello.java 파일은 읽지 않습니다.', '');
      st.out = ['안녕']; st.lines = 1; st.hot = 'out';
      st.checks.push(['java Hello', { v: '안녕 출력', cls: 'good' }]);
      push('JVM이 Hello.class 안의 main을 실행하고, main의 println이 안녕을 출력합니다.' + (edited ? ' Hello.java 파일에는 "잘 가"로 적혀 있지만, Hello.class는 고치기 전의 "안녕"으로 만든 것이므로 안녕이 출력됩니다. "잘 가"가 출력되게 하려면 javac Hello.java 명령을 다시 실행해 새 Hello.class를 만들어야 합니다.' : ''), 'good');
    } else {
      st.jvm = 'fail'; st.fail = true;
      st.checks.push(['java Hello', { v: 'Hello 클래스를 찾을 수 없다는 오류 · 종료 코드 1', cls: 'bad' }]);
      push((noSemi && c.compile ? 'javac 명령이 실패했는데도 java Hello 명령을 실행해 보면, ' : '터미널에서 java Hello 명령을 실행합니다. ') + 'java 명령이 JVM을 띄우고, JVM이 현재 폴더에서 Hello.class 파일을 찾습니다. 폴더에 Hello.java 파일은 있지만 Hello.class 파일은 없어서 JVM은 Hello 클래스를 찾지 못하고, "Error: Could not find or load main class Hello" 오류를 낸 뒤 끝납니다(종료 코드 1). JVM은 Hello.java 파일을 대신 읽어 주지 않습니다.', 'bad');
    }
    st.hot = '';

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (made && !edited) {
      sum.push('Hello.java는 사람이 읽는 자바 코드이고, javac 명령이 이것을 JVM이 읽는 바이트코드 파일 Hello.class로 바꿉니다(컴파일). java 명령이 띄운 JVM이 Hello.class를 읽어 main을 실행하면 안녕이 출력됩니다. 실행된 것은 Hello.java가 아니라 Hello.class입니다.');
      sum.push('컴파일은 코드를 바꿀 뿐 실행하지 않습니다. javac Hello.java 명령을 쓸 때는 아무것도 출력되지 않았고, java Hello 명령을 쓸 때 안녕이 출력되었습니다.');
    } else if (made) {
      sum.push('컴파일한 뒤 Hello.java만 고치고 javac 명령을 다시 쓰지 않으면, java Hello 명령은 고치기 전에 만든 Hello.class를 실행해 안녕을 출력합니다. 소스를 고쳐도 다시 컴파일하기 전에는 옛 Hello.class가 실행됩니다.');
      sum.push('고친 글이 실행되게 하려면 javac Hello.java 명령을 다시 써서 새 Hello.class를 만들어야 하고, 그러면 잘 가가 출력됩니다.');
    } else if (!c.compile && noSemi) {
      sum.push('javac Hello.java 명령을 쓰지 않으면 Hello.class가 만들어지지 않아 java Hello 명령이 실행할 것을 찾지 못합니다. 세미콜론이 빠져 있어도 javac 컴파일러가 읽지 않았으므로 문법 오류는 알려지지 않았고, 실행은 Hello.class가 없다는 이유로 실패했습니다.');
      sum.push('문법이 맞는지 확인하는 곳은 javac입니다. 컴파일을 하지 않으면 틀린 곳도 보이지 않습니다.');
    } else if (!c.compile) {
      sum.push('javac Hello.java 명령을 쓰지 않으면 Hello.class가 만들어지지 않아 java Hello 명령이 실행할 것을 찾지 못합니다. 폴더에 Hello.java가 있어도 JVM은 그 글을 읽지 않고 Hello.class만 찾습니다.');
      sum.push(edited ? 'Hello.java를 고쳤는지는 상관이 없습니다. 이 방식(java Hello)으로 실행하려면 먼저 javac로 컴파일해야 합니다.' : '이 방식(java Hello)으로 실행하려면 먼저 javac로 컴파일해야 합니다.');
    } else {
      sum.push('출력하는 줄 끝의 세미콜론(;)을 빼면 javac 컴파일러가 컴파일하다가 문법 오류를 알리고 멈추며, Hello.class 파일이 만들어지지 않습니다. 이 상태에서 java Hello 명령을 써도 JVM이 읽을 Hello.class가 없어 실패합니다.');
      sum.push('문법이 틀린 코드는 실행하기 전에 컴파일 단계에서 걸러집니다. 오류가 난 줄은 javac가 알려 줍니다.');
    }
    var cmpTxt = edited ? '다름: 출력 안녕, 소스 잘 가' : '같음';
    return { events: ev, summary: sum, made: made, row: [made ? '만들어짐' : '없음', run ? '안녕 출력' : 'Hello 클래스를 찾을 수 없다는 오류', run ? cmpTxt : '출력 없음', run ? '멈추지 않음' : (c.compile ? 'javac Hello.java (컴파일)' : 'java Hello (실행)')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 Hello.java 파일에서 시작합니다.'); return; }
    H.table(v, ['한 일', '결과'], s.checks.length ? s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['아직 한 일 없음', ''] }], '터미널에서 한 일');
    H.counters(v, [[s.made, 'Hello.class 파일'], [s.lines, '출력된 줄']]);
  },
  // 그림: 윗줄에 Hello.java -> javac -> Hello.class, 아랫줄에 폴더의 파일, 화면 출력, JVM. Hello.class에서 JVM으로 가는 화살표가 끊기는지 보인다. 맨 아래에 Hello.class 파일 수와 출력된 줄을 세는 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 300);
    var hot = s ? s.hot : '';
    P.box('src', 20, 16, 176, 70, { cls: hot === 'src' ? 'hot now' : 'plain', title: 'Hello.java', sub: ['사람이 읽는 글', s ? s.srcSub : '"안녕"을 출력하는 코드'] });
    var jcSub = !s || !s.jc ? '컴파일러' : { run: '파일을 읽는 중', ok: '오류 없음', err: '오류 1개', skip: '실행하지 않음' }[s.jc];
    P.box('jc', 252, 16, 176, 70, { cls: s && s.jc === 'err' ? 'bad' : s && s.jc === 'skip' ? 'ghost' : hot === 'jc' ? 'hot now' : s && s.jc === 'ok' ? 'good' : 'plain', title: 'javac', sub: jcSub });
    var cs = s ? s.cls : '';
    P.box('cls', 484, 16, 176, 70, { cls: cs === 'made' ? (hot === 'cls' ? 'good now' : 'good') : cs === 'err' ? 'bad' : 'ghost', title: 'Hello.class', sub: cs === 'made' ? ['바이트코드', '담긴 글: ' + s.clsTxt] : cs === 'err' ? '만들어지지 않음' : cs === 'none' ? '없음' : '아직 없음' });
    if (s && s.jc && s.jc !== 'skip') P.arrow('a1', 'src:r', 'jc:l', { cls: s.jc === 'run' ? 'hot' : s.jc === 'err' ? 'bad' : 'mut' });
    if (s && (s.jc === 'ok')) P.arrow('a2', 'jc:r', 'cls:l', { cls: hot === 'cls' ? 'good' : 'mut' });
    if (s && s.jc === 'err') P.arrow('a2', 'jc:r', 'cls:l', { cls: 'bad' });
    P.box('fd', 20, 146, 176, 70, { cls: 'plain', title: '폴더의 파일', sub: s ? s.files : ['Hello.java'] });
    var os = s ? s.out : [];
    P.box('out', 252, 146, 176, 70, { cls: s && s.fail ? 'bad' : os.length ? 'good' : 'ghost', title: '화면 출력', sub: s && s.fail ? ['클래스를 찾을 수', '없다는 오류'] : os.length ? os : '아직 없음' });
    var js = s ? s.jvm : '';
    P.box('jvm', 484, 146, 176, 70, { cls: js === 'fail' ? 'bad' : hot === 'jvm' ? 'hot now' : js === 'run' ? 'good' : 'ghost', title: 'JVM', sub: js === 'run' ? 'Hello.class를 읽음' : js === 'fail' ? 'Hello.class를 못 찾음' : 'java Hello로 띄움' });
    if (s && js === 'run') P.arrow('a3', 'cls:b', 'jvm:t', { cls: hot === 'jvm' ? 'hot' : 'mut' });
    if (s && js === 'fail') P.arrow('a3', 'cls:b', 'jvm:t', { cls: 'bad' });
    if (s && os.length) P.arrow('a4', 'jvm:l', 'out:r', { cls: 'good' });
    P.box('n1', 20, 244, 316, 36, { cls: s && s.made ? 'wait' : 'ghost', title: 'Hello.class 파일', right: (s ? s.made : 0) + '개' });
    P.box('n2', 344, 244, 316, 36, { cls: s && s.lines ? 'good' : 'ghost', title: '출력된 줄', right: (s ? s.lines : 0) + '줄' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21, java 21)입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 글(# Hello.java 구역과 # 터미널 구역)을 조합마다 빈 폴더에 만들고, 그 글에서 소스 파일과 명령을 읽어 실제 javac 프로그램과 java 프로그램을 프로세스로 띄워 실행한 결과와 대조했습니다. 대조한 것은 폴더에 Hello.class가 생겼는지, javac의 종료 코드와 표준 출력, 첫 오류 메시지와 오류 개수와 오류가 난 줄, java의 종료 코드와 출력과 오류 메시지, 고치는 일이 Hello.class를 바꾸지 않는지, Hello.class 파일 맨 앞 네 바이트(CAFEBABE)와 버전(65, 자바 21)입니다. 고친 뒤 javac 명령을 다시 쓰면 "잘 가"가 출력되는 것도 따로 실행해 확인했습니다. 실행한 명령은 화면과 두 가지가 다릅니다. 출력 글자와 오류 메시지를 같은 방식으로 읽으려고 javac와 java에 출력 인코딩을 UTF-8로, 메시지 언어를 영어로 하는 옵션(-Dstdout.encoding=UTF-8, -Duser.language=en 등)을 더했습니다. 옵션 없이 이 PC(한국어 Windows)에서 java Hello 명령을 쓰면 같은 오류가 한국어 메시지로 나옵니다. 문서는 직접 열어 확인했습니다. Java 가상 머신 명세 Java SE 21 판 1.2절(JVM은 자바 언어를 모르고 class 파일 형식만 안다, class 파일에는 JVM 명령어인 바이트코드가 들어 있다), 같은 명세 4.1절(class 파일 맨 앞의 magic 값은 0xCAFEBABE, 자바 SE 21의 major 버전은 65, 이 장은 일부만 읽었습니다), JDK 21 javac 도구 문서(.java 소스 파일을 읽어 .class 파일로 컴파일한다, 따로 정하지 않으면 소스와 같은 폴더에 만든다, 오류가 없으면 class 파일을 출력 폴더에 놓는다), java 도구 문서(JVM을 띄워 지정한 클래스를 읽고 main을 부른다, 클래스 경로를 정하지 않으면 현재 폴더이다, 앞쪽 일부만 읽었고 종료 코드 절은 읽지 못했습니다)를 따랐습니다. 오류가 났을 때 Hello.class를 만들지 않는 것, 종료 코드가 0과 1이라는 것, 오류 메시지의 글은 문서가 정한 것이 아니라 이 JDK에서 관찰한 것입니다. 화면의 코드는 폴더에 Hello.java 하나만 있는 상황으로 줄였고, 패키지가 있는 클래스, 클래스 경로 설정, jar 파일, IDE나 빌드 도구가 대신 컴파일하는 것은 다루지 않았습니다. java Hello.java처럼 소스 파일을 바로 실행하는 방법(소스 파일 모드)도 화면에서 쓰지 않았습니다. 이 JDK에서 실행해 보니 Hello.class를 만들지 않고 안녕을 출력했고(java 문서도 소스를 메모리에 컴파일해 실행한다고 설명합니다), 세미콜론이 빠진 소스는 이 방식에서도 같은 컴파일 오류로 실패했습니다. 또 컴파일에 성공한 뒤 소스를 틀리게 고치고 javac 명령을 다시 쓰면 오류가 나지만 옛 Hello.class는 폴더에 그대로 남아 java Hello 명령이 옛 코드를 실행하는 것도 확인했으나, 화면에서는 다루지 않았습니다. JVM이 Hello.class를 읽어 들이는 방식은 "세부 동작 실습: 클래스 로딩과 초기화"에서, 바이트코드를 기계어로 다시 컴파일하는 JIT는 "세부 동작 실습: JIT 워밍업"에서 다룹니다.',
});
