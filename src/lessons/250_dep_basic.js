Lab.register({
  id: 'dep_basic', nav: '라이브러리와 의존성', cat: '기초개념', mode: 'step', basic: true, deep: ['supplychain', 'autoconf'],
  title: '라이브러리는 무엇이고, 없으면 어떻게 되는가',
  intro: '라이브러리는 남이 만들어 둔 클래스들입니다. 이 실습에서는 lib.Greeter 클래스 하나를 jar 파일(클래스 파일을 묶어 둔 파일) greet.jar에 담아 두었습니다. 내 코드 App.java는 import lib.Greeter;로 그 클래스를 가져다 쓰는데, Greeter는 App.java 안에 없습니다. 그래서 컴파일할 때도, 실행할 때도 컴파일러(javac)와 JVM(java)은 클래스패스(클래스 파일을 찾아볼 곳의 목록)에서 Greeter를 찾아야 하고, 명령에서는 -cp 뒤에 그 목록을 적습니다. 내 프로젝트가 쓰는 라이브러리를 의존성이라고 부르며, 빌드 도구 Gradle에서는 implementation으로 적은 의존성이 컴파일할 때와 실행할 때의 클래스패스에 모두 들어갑니다. 이 실습은 javac 명령과 java 명령에서 greet.jar를 하나씩 빼 가며 실제로 컴파일하고 실행해, 어느 단계에서 어떤 오류가 나는지를 봅니다. (Gradle은 이 실습에서 실행하지 않습니다.)',
  terms: ['라이브러리와 jar 파일', '클래스패스(-cp)', 'NoClassDefFoundError', '빌드 의존성과 implementation'],
  controls: [
    { id: 'compileCp', label: 'javac 명령에 -cp greet.jar를 적는다', type: 'check', value: true },
    { id: 'runCp', label: 'java 명령의 -cp에 greet.jar;를 적는다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '라이브러리의 클래스를 쓰는 코드는 어떻게 컴파일되고 실행되나', d: '컴파일과 실행 명령에 모두 greet.jar가 있습니다. 컴파일에 성공하고 hello, kim이 출력됩니다.', v: { compileCp: true, runCp: true } },
    { t: '컴파일할 때 -cp greet.jar를 빼면', q: '컴파일하는 javac 명령에서 -cp greet.jar를 빼면', d: '컴파일러가 Greeter를 찾지 못해 컴파일이 실패합니다.', v: { compileCp: false, runCp: true } },
    { t: '실행할 때 greet.jar를 빼면', q: '컴파일은 그대로 두고, 실행하는 java 명령에서 greet.jar;를 빼면', d: '컴파일에는 성공하지만, 실행하는 중에 Greeter를 찾지 못해 오류가 납니다.', v: { compileCp: true, runCp: false } },
    { t: '둘 다 빼면', q: '두 명령에서 모두 greet.jar를 빼면', d: '컴파일 단계에서 이미 실패해 실행할 수 없습니다.', v: { compileCp: false, runCp: false } },
  ],
  // 화면 오른쪽 표와 그림에 쓰는 말
  msgs: { pkg: 'lib 패키지가 없음', sym: 'Greeter를 찾을 수 없음', ncdfe: '실행 중 NoClassDefFoundError(lib/Greeter)' },
  code: function (c) {
    return ['# App.java', '// greet.jar 안에 있는, 남이 만든 클래스를 가져온다', 'import lib.Greeter;', '', 'public class App {', '    public static void main(String[] args) {', '        System.out.println(Greeter.hello("kim"));', '    }', '}', '',
      '# greet.jar (Greeter.java를 컴파일해 jar로 묶은 것)', 'package lib;', '', 'public class Greeter {', '    public static String hello(String name) {', '        return "hello, " + name;', '    }', '}', '',
      '# 터미널', 'javac ' + (c.compileCp ? '-cp greet.jar ' : '') + 'App.java', 'java -cp ' + (c.runCp ? 'greet.jar;.' : '.') + ' App'].join('\n');
  },
  label: function (c) { return (c.compileCp ? 'javac에 -cp greet.jar 있음' : 'javac에 -cp 없음') + ' · ' + (c.runCp ? 'java에 greet.jar 있음' : 'java에 greet.jar 없음'); },
  columns: ['컴파일', '실행', '오류'],
  simulate: function (c) {
    var ev = [], sum = [], cc = c.compileCp, rc = c.runCp, M = this.msgs;
    var javac = 'javac ' + (cc ? '-cp greet.jar ' : '') + 'App.java', java = 'java -cp ' + (rc ? 'greet.jar;.' : '.') + ' App';
    var st = { hot: '', stage: '', phase: '', compile: '', cls: 0, errs: 0, run: '', out: '', printed: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 컴파일
    st.hot = 'app';
    st.checks.push(['컴파일 명령', javac]);
    push('터미널에 ' + javac + ' 명령을 입력하면 컴파일러(javac)가 App.java를 읽습니다. 소스 맨 위의 import lib.Greeter; 줄은 App.java 안에 없는 Greeter 클래스를 가져다 쓰겠다는 뜻입니다. Greeter는 남이 만들어 둔 클래스이고, greet.jar 안에 lib/Greeter.class라는 파일로 들어 있습니다.', '');
    st.stage = 'compile'; st.phase = 'search'; st.hot = 'cp';
    st.checks.push(['javac가 찾아볼 곳(클래스패스)', cc ? 'greet.jar' : '현재 폴더뿐']);
    push(cc
      ? '컴파일러는 Greeter가 어떤 클래스인지 알아야 컴파일할 수 있으므로, 클래스패스에서 lib/Greeter.class를 찾습니다. 클래스패스는 클래스 파일을 찾아볼 곳의 목록이고, 명령의 -cp 뒤에 적습니다. 이 명령은 -cp greet.jar라고 적었으므로 찾아볼 곳은 greet.jar입니다.'
      : '컴파일러는 Greeter가 어떤 클래스인지 알아야 컴파일할 수 있으므로, 클래스패스에서 lib/Greeter.class를 찾습니다. 이 명령에는 -cp가 없으므로 찾아볼 곳은 현재 폴더뿐입니다(javac 문서: -cp도 CLASSPATH 환경 변수도 없으면 현재 폴더. 이 대조에서는 환경 변수를 지웠습니다). 현재 폴더에는 App.java와 greet.jar가 있지만, greet.jar는 -cp에 적지 않았으므로 찾아볼 곳에 들어 있지 않습니다. 같은 폴더에 있다고 해서 클래스패스에 들어가는 것이 아닙니다.', '');
    if (cc) {
      st.phase = 'found'; st.hot = 'jar';
      st.checks.push(['lib/Greeter.class를 찾았나(컴파일)', { v: '찾음', cls: 'good' }]);
      push('greet.jar 안에서 lib/Greeter.class를 찾았습니다. 컴파일러가 Greeter 클래스를 알게 되었으므로 Greeter.hello("kim") 줄도 통과합니다.', 'good');
      st.compile = 'ok'; st.cls = 1; st.hot = ''; st.phase = '';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일에 성공해 App.class가 만들어집니다. 폴더에 새로 생긴 클래스 파일은 App.class 하나뿐이고, Greeter.class는 복사되지 않았습니다. greet.jar의 내용이 App.class 안으로 들어온 것이 아닙니다.', 'good');
    } else {
      st.phase = 'miss'; st.hot = 'cp'; st.errs = 2;
      st.checks.push(['lib/Greeter.class를 찾았나(컴파일)', { v: '찾지 못함', cls: 'bad' }]);
      push('찾아볼 곳(현재 폴더)에 lib/Greeter.class가 없어서, 컴파일러는 Greeter를 알 수 없습니다. 오류가 2개 납니다. 하나는 import lib.Greeter; 줄의 "package lib does not exist"(' + M.pkg + '), 다른 하나는 Greeter.hello("kim") 줄의 "cannot find symbol"(' + M.sym + ')입니다.', 'bad');
      st.compile = 'err'; st.hot = ''; st.phase = '';
      st.checks.push(['컴파일', { v: '오류 2개', cls: 'bad' }]);
      push('컴파일이 실패했습니다. App.class는 만들어지지 않았습니다.', 'bad');
    }

    // 실행
    st.stage = 'run'; st.hot = 'app'; st.checks.push(['실행 명령', java]);
    if (!cc) {
      st.phase = 'read'; st.run = 'none'; st.hot = 'cp';
      st.checks.push(['java가 찾아볼 곳(클래스패스)', rc ? 'greet.jar, 현재 폴더(.)' : '현재 폴더(.)']);
      st.checks.push(['실행', { v: 'App 클래스를 찾을 수 없음', cls: 'bad' }]);
      push('그래도 ' + java + ' 명령을 입력하면 JVM(java)이 클래스패스에서 App 클래스를 찾습니다. 찾아볼 곳은 ' + (rc ? 'greet.jar와 현재 폴더(.)' : '현재 폴더(.)') + '이지만 App.class가 없어서 "기본 클래스 App을(를) 찾거나 로드할 수 없습니다"라는 오류가 나고 프로그램은 시작되지 않습니다. 이 오류는 java 명령의 -cp에 greet.jar를 넣었는지와 상관없이 같습니다.', 'bad');
      st.hot = ''; st.phase = '';
    } else {
      st.phase = 'read'; st.hot = 'cp';
      st.checks.push(['java가 찾아볼 곳(클래스패스)', rc ? 'greet.jar, 현재 폴더(.)' : '현재 폴더(.)']);
      push(java + ' 명령을 입력하면 JVM(java)이 클래스패스에서 App 클래스를 찾아 main을 시작합니다. ' + (rc
        ? '클래스패스는 greet.jar;.입니다. 세미콜론(;)은 Windows에서 여러 곳을 구분하는 글자이고(macOS와 Linux는 :), 맨 뒤의 점(.)은 현재 폴더, 곧 App.class가 있는 곳입니다. 점을 빼고 -cp greet.jar만 적으면 현재 폴더를 찾아보지 않아 App을 찾지 못합니다.'
        : '클래스패스는 현재 폴더(.)뿐이고, App.class가 현재 폴더에 있으므로 App은 찾습니다. greet.jar는 찾아볼 곳에 들어 있지 않습니다.'), '');
      st.hot = 'app'; st.phase = 'search';
      push('main 안의 System.out.println(Greeter.hello("kim")) 줄에서 Greeter.hello를 부르려면 Greeter 클래스가 필요합니다. JVM이 클래스패스에서 lib/Greeter.class를 찾습니다.', '');
      if (rc) {
        st.phase = 'found'; st.hot = 'jar'; st.run = 'ok'; st.out = 'hello, kim'; st.printed = 1;
        st.checks.push(['lib/Greeter.class를 찾았나(실행)', { v: '찾음', cls: 'good' }]);
        st.checks.push(['실행', { v: 'hello, kim 출력', cls: 'good' }]);
        push('greet.jar 안에서 lib/Greeter.class를 찾아 불러옵니다. hello("kim")이 hello, kim을 돌려주고, println이 그 글을 출력합니다.', 'good');
      } else {
        st.phase = 'miss'; st.hot = 'cp'; st.run = 'fail'; st.out = 'NoClassDefFoundError';
        st.checks.push(['lib/Greeter.class를 찾았나(실행)', { v: '찾지 못함', cls: 'bad' }]);
        st.checks.push(['실행', { v: 'NoClassDefFoundError', cls: 'bad' }]);
        push('찾아볼 곳은 현재 폴더(.)뿐이고, 거기에는 lib/Greeter.class가 없습니다. JVM이 Greeter를 불러오지 못해 NoClassDefFoundError(lib/Greeter) 오류를 내고, 실행은 오류로 끝납니다(종료 코드 1). 오류가 난 곳은 App.main의 App.java:6, 곧 Greeter.hello를 부르는 줄이고, 아무것도 출력되지 않았습니다. 컴파일할 때는 Greeter가 있었는데 실행할 때는 찾을 수 없는 경우에 나는 오류입니다.', 'bad');
      }
      st.hot = '';
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (cc && rc) {
      sum.push('라이브러리는 남이 만들어 둔 클래스를 묶은 jar 파일입니다. 내 코드가 Greeter 같은 라이브러리의 클래스를 쓰려면 컴파일할 때(javac -cp greet.jar)와 실행할 때(java -cp greet.jar;.) 모두 그 jar가 클래스패스에 있어야 합니다. 둘 다 있었으므로 컴파일에 성공하고 hello, kim이 출력됐습니다.');
      sum.push('내 프로젝트가 쓰는 라이브러리를 의존성이라고 부릅니다. Gradle에서는 dependencies 안에 implementation("lib:greet:1.0")처럼 한 줄을 적고(이 이름은 설명을 위한 가짜입니다), Gradle 문서에 따르면 implementation으로 적은 의존성은 컴파일할 때와 실행할 때의 클래스패스에 모두 들어갑니다. 이 실습은 Gradle을 실행하지 않고, 그 일을 -cp로 손수 적어 보인 것입니다.');
    } else if (!cc) {
      sum.push('컴파일하는 javac 명령에 -cp greet.jar가 없으면 컴파일러가 Greeter를 찾지 못해 컴파일이 실패합니다(' + M.pkg + ', ' + M.sym + '). 컴파일에 실패하면 App.class가 없어서 실행도 할 수 없습니다.');
      sum.push(rc ? 'java 명령에 greet.jar를 적어 두었어도 소용이 없었습니다. jar는 컴파일할 때도 필요하고, 같은 폴더에 있다는 것만으로는 클래스패스에 들어가지 않습니다.' : '실행하는 java 명령에서도 greet.jar를 뺐지만, 그 차이는 드러나지 않았습니다. 컴파일 단계에서 이미 멈췄기 때문입니다. 실행할 때 jar가 없는 문제는 컴파일을 통과한 뒤에야 만납니다.');
    } else {
      sum.push('컴파일은 jar와 함께 했지만 실행하는 java 명령에서 greet.jar를 빼면, 컴파일에는 성공하고 실행하는 중에 NoClassDefFoundError 오류가 납니다.');
      sum.push('컴파일이 성공했다고 실행도 성공하는 것은 아닙니다. 컴파일할 때 필요한 jar와 실행할 때 필요한 jar는 각각 클래스패스에 넣어야 하고, 실행할 때 빠진 것은 그 클래스가 처음 필요해진 줄(App.java:6)에서야 드러납니다.');
    }
    var row = cc ? ['성공', rc ? 'hello, kim 출력' : '실패: 아무것도 출력되지 않음', rc ? '없음' : M.ncdfe] : ['오류 2개', '실행할 수 없음(App.class가 없음)', M.pkg + ', ' + M.sym];
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 javac 명령으로 컴파일하는 것부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    H.counters(v, [[s.errs, '컴파일러가 알린 오류'], [s.cls, '만들어진 App.class'], [s.printed, '출력된 줄']]);
  },
  // 그림: 왼쪽에 내 코드(App.java), 가운데에 클래스패스(찾아볼 곳의 목록), 오른쪽에 greet.jar. 클래스패스에 greet.jar가 있으면 화살표가 jar에 닿고, 없으면 닿지 못한다. 아래에 컴파일 결과, 실행 결과, App.class가 있는지.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    var stage = s ? s.stage : '', hot = s ? s.hot : '', ph = s ? s.phase : '';
    var inCp = stage === 'compile' ? c.compileCp : stage === 'run' ? c.runCp : false;
    P.box('app', 14, 16, 180, 110, { cls: hot === 'app' ? 'hot now' : 'plain', title: 'App.java', sub: ['내 코드', 'import lib.Greeter;', stage === 'compile' ? '컴파일 중' : stage === 'run' ? (s.cls ? 'App.class 실행 중' : 'App.class 없음') : '실행 전'] });
    var list = stage === 'compile' ? (c.compileCp ? ['greet.jar'] : ['현재 폴더(.)뿐']) : stage === 'run' ? (c.runCp ? ['greet.jar', '현재 폴더(.)'] : ['현재 폴더(.)뿐']) : ['명령을 입력하면 정해짐'];
    P.box('cp', 244, 16, 190, 110, { cls: ph === 'miss' ? 'bad' : hot === 'cp' ? 'hot now' : stage ? 'plain' : 'ghost', title: '클래스패스', sub: ['찾아볼 곳 (-cp)'].concat(list) });
    P.box('jar', 484, 16, 182, 110, { cls: ph === 'found' ? 'good now' : stage && !inCp ? 'ghost' : 'plain', title: 'greet.jar', sub: ['lib/Greeter.class', !stage ? '남이 만든 클래스' : inCp ? '클래스패스에 있음' : '클래스패스에 없음'] });
    if (s && (ph === 'search' || ph === 'found' || ph === 'miss')) P.arrow('find', 'app:r:0.5', 'cp:l:0.5', { cls: ph === 'miss' ? 'bad' : 'hot' });
    if (s && ph === 'found') P.arrow('hit', 'cp:r:0.5', 'jar:l:0.5', { cls: 'good' });
    var cs = s ? s.compile : '', rs = s ? s.run : '';
    P.box('r1', 14, 144, 652, 40, { cls: cs === 'ok' ? 'good' : cs === 'err' ? 'bad' : 'ghost', title: '컴파일', right: cs === 'ok' ? '성공' : cs === 'err' ? '오류 2개' : '' });
    P.box('r2', 14, 192, 652, 40, { cls: rs === 'ok' ? 'good' : rs ? 'bad' : 'ghost', title: '실행', right: rs === 'ok' ? 'hello, kim' : rs === 'fail' ? 'NoClassDefFoundError' : rs === 'none' ? '실행할 수 없음' : '' });
    P.box('r3', 14, 240, 652, 40, { cls: s && s.cls ? 'wait' : cs === 'err' ? 'bad' : 'ghost', title: '만들어진 App.class', right: cs === 'err' ? '없음' : (s ? s.cls : 0) + '개' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21, java 21)입니다. 네 가지 조합을 모두 대조했습니다. 먼저 lib.Greeter 클래스(hello 메서드 하나)를 javac와 jar 도구로 greet.jar에 묶었고(외부 jar는 받지 않았습니다), 조합마다 새 폴더에 greet.jar와 App.java를 놓고 화면에 적힌 터미널 명령 javac와 java를 그대로 실행했습니다. 화면의 코드는 Probe가 실제 파일 내용과 실제 실행한 명령으로 만들어 남긴 글과 같습니다. 대조한 것은 컴파일 성공 여부, 오류의 개수와 진단 코드(compiler.err.doesnt.exist와 compiler.err.cant.resolve.location를 화면의 두 가지 오류 설명으로 옮겼습니다)와 오류가 난 줄, App.class가 만들어졌는지, java 명령의 종료 코드와 출력, 실행 오류의 종류(NoClassDefFoundError)와 그 위치(App.java:6)입니다. 컴파일에 실패한 조합에서도 java 명령을 실제로 실행해, App 클래스를 찾을 수 없다는 오류가 나는 것을 확인했습니다. 단계 문장이 기대는 사실도 따로 실행해 확인했습니다. greet.jar에는 lib/Greeter.class가 들어 있다는 것(jar tf), 컴파일에 성공한 폴더에 생긴 클래스 파일은 App.class 하나뿐이라는 것, java 명령에서 -cp greet.jar만 적고 점(.)을 빼면 현재 폴더의 App.class를 찾지 못한다는 것, 컴파일 전 폴더에는 App.java와 greet.jar만 있었다는 것입니다. 명령은 Windows 11에서 실행했고, 클래스패스의 구분자 세미콜론(;)은 Windows 기준입니다(macOS와 Linux는 콜론). 화면에는 한 가지로만 적었습니다. CLASSPATH 환경 변수는 실행하는 프로세스에서 지웠고, 이 변수가 설정된 환경에서는 -cp를 적지 않은 명령의 결과가 달라질 수 있습니다. java 실행기의 오류 문장은 검증 실행에 쓴 Windows의 언어 설정(한국어)을 따라 한국어로 나왔고, 다른 언어 설정에서는 문장이 다릅니다. 문서는 직접 열어 확인했습니다. Oracle의 javac 도구 문서(https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html)에서 --class-path(-cp)가 사용자 클래스 파일을 찾을 곳을 정하고, -cp도 CLASSPATH 환경 변수도 없으면 현재 폴더가 쓰이며, 구분자가 Windows에서 세미콜론이라는 것을, java 도구 문서(https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html, 앞부분 10만 자만 읽었고 -cp 설명은 그 안에 있었습니다)에서 -cp가 클래스 파일을 찾을 디렉터리, JAR 파일, ZIP 파일의 목록이고 지정하지 않으면 현재 폴더(.)라는 것을, NoClassDefFoundError API 문서(https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/NoClassDefFoundError.html)에서 클래스를 불러오려는데 정의를 찾을 수 없을 때 던져지며 컴파일할 때는 있었던 정의를 지금은 찾을 수 없는 경우라는 것을, Gradle 문서의 Declaring dependencies(https://docs.gradle.org/current/userguide/declaring_dependencies_basics.html)에서 모듈 의존성을 group:name:version 좌표로 적는다는 것과 dependencies 안에 implementation으로 적는 예를, Java Plugin 문서(https://docs.gradle.org/current/userguide/java_plugin.html)의 설정 표에서 implementation이 컴파일할 때와 실행할 때 모두 필요한 의존성이고 compileClasspath와 runtimeClasspath에 포함된다는 것을 따랐습니다. Gradle은 실행하지 않았고, 저장소에서 jar를 내려받는 과정은 문서로도 확인하지 못해 적지 않았습니다. 오류의 개수와 종류, 오류 문장은 명세가 정한 것이 아니라 이 JDK에서 관찰한 것입니다. 이 밖에 라이브러리가 다시 다른 라이브러리를 끌어오는 것(전이 의존성), 버전, 클래스패스 여러 곳에 같은 클래스가 있을 때의 순서, 모듈 시스템은 다루지 않았고, 의존성과 공급망은 "세부 동작 실습: 의존성과 공급망"에서, 의존성을 보고 설정을 자동으로 만들어 주는 스프링 부트는 "세부 동작 실습: 스프링 부트 자동 설정"에서 다룹니다.',
});
