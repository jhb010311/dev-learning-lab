Lab.register({
  id: 'dep_basic', nav: '라이브러리와 의존성', cat: '기초개념', mode: 'step', basic: true, deep: ['supplychain', 'autoconf'],
  title: '라이브러리는 무엇이고, 없으면 어떻게 되는가',
  why: 'JSON 글을 객체로 바꾸기, 테스트 실행하기 같은 흔한 일을 프로젝트마다 처음부터 짜면 시간이 들고 실수도 생긴다. 라이브러리는 이런 일을 하는 클래스를 jar 파일로 받아 import로 가져다 쓰게 한다. jar를 손으로 받아 -cp에 적는 번거로운 일, 그 라이브러리가 다시 쓰는 jar까지 챙기는 일은 Gradle이나 Maven 같은 빌드 도구가 대신 맡는다.',
  use: '스프링 부트 프로젝트의 build.gradle에서 dependencies 부분에 라이브러리의 좌표(그룹:이름:버전)를 implementation 한 줄로 적을 때 본다. Gradle은 그 라이브러리가 다시 쓰는 라이브러리까지 받아 와 클래스패스에 넣는다. 테스트에만 필요한 것은 testImplementation으로 적어, 프로그램을 실행할 때의 클래스패스에는 들어가지 않게 한다. 실행 중에 NoClassDefFoundError가 나면, 그 클래스를 가진 jar가 실행할 때의 클래스패스에 있는지부터 본다.',
  intro: '라이브러리는 남이 만들어 둔 클래스들이고, 보통 jar 파일(컴파일된 클래스 파일을 하나로 묶은 파일)로 받아 씁니다. 이 실습의 App.java는 잭슨(Jackson)이라는 실제 라이브러리의 ObjectMapper 클래스로 Map을 JSON 글로 바꿉니다. ObjectMapper는 내가 만든 클래스도 아니고 자바(JDK)가 주는 클래스도 아니며, jackson-databind라는 jar 파일이 가진 클래스입니다. 그래서 컴파일하는 javac와 실행하는 java는 클래스패스(클래스 파일을 찾아볼 곳의 목록, 명령에서는 -cp 뒤에 적음)에서 그 jar를 찾아야 합니다. 또 jackson-databind는 jackson-core와 jackson-annotations라는 다른 jar를 쓰기 때문에, 내 코드에 나오지 않는 그 두 jar도 있어야 합니다. 이 실습은 두 명령의 -cp에서 잭슨 jar를 빼 가며 실제로 컴파일하고 실행해, 어느 단계에서 어떤 오류가 나는지 봅니다. 실제 프로젝트에서는 build.gradle의 implementation 한 줄을 적으면 Gradle이 이 jar들을 받아 클래스패스에 넣어 줍니다(Gradle은 이 실습에서 실행하지 않고, 문서로 대조했습니다).',
  terms: ['라이브러리와 jar 파일', '잭슨(Jackson)과 ObjectMapper', '클래스패스(-cp)', 'NoClassDefFoundError', '빌드 의존성과 implementation', '전이 의존성'],
  controls: [
    { id: 'compileCp', label: '컴파일하는 javac 명령의 -cp에 적는 jar', type: 'select', value: 'all', options: [['all', '잭슨 jar 세 개 모두'], ['nocore', 'jackson-core만 빼고 두 개'], ['none', '하나도 적지 않음(-cp 없음)']] },
    { id: 'runCp', label: '실행하는 java 명령의 -cp에 적는 jar', type: 'select', value: 'all', options: [['all', '잭슨 jar 세 개 모두'], ['nocore', 'jackson-core만 빼고 두 개'], ['none', '하나도 적지 않음(현재 폴더만)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '라이브러리 잭슨의 ObjectMapper를 쓰는 코드는 어떻게 컴파일되고 실행되나', d: '컴파일과 실행 명령의 -cp에 잭슨 jar 세 개가 모두 있습니다. 컴파일에 성공하고 {"name":"kim"}이 출력됩니다.', v: { compileCp: 'all', runCp: 'all' } },
    { t: '컴파일할 때 jar를 모두 빼면', q: '컴파일하는 javac 명령에서 -cp를 빼면', d: '컴파일러가 tools.jackson.databind 패키지와 ObjectMapper를 찾지 못해 오류 3개로 컴파일이 실패합니다.', v: { compileCp: 'none', runCp: 'all' } },
    { t: '실행할 때 jar를 모두 빼면', q: '컴파일은 그대로 두고, 실행하는 java 명령의 -cp에서 잭슨 jar를 모두 빼면', d: '컴파일에는 성공하지만, 실행하는 중에 new ObjectMapper() 줄에서 NoClassDefFoundError가 납니다.', v: { compileCp: 'all', runCp: 'none' } },
    { t: '실행할 때 jackson-core만 빼면', q: '내 코드에는 나오지 않는 jackson-core를 실행할 때만 빼면', d: 'ObjectMapper가 jackson-core의 TreeCodec을 쓰기 때문에, 실행 중에 NoClassDefFoundError(tools/jackson/core/TreeCodec)가 납니다.', v: { compileCp: 'all', runCp: 'nocore' } },
    { t: '컴파일할 때 jackson-core만 빼면', q: '컴파일하는 javac 명령의 -cp에서 jackson-core만 빼면', d: '컴파일러도 TreeCodec을 찾지 못해 writeValueAsString 줄에서 오류 1개로 컴파일이 실패합니다.', v: { compileCp: 'nocore', runCp: 'all' } },
  ],
  // 화면 오른쪽 표와 그림에 쓰는 말. 대조 스크립트(verify/plain/cmp_dep_basic.js)가 javac 진단 코드를 이 말로 옮긴다.
  msgs: { pkg: 'tools.jackson.databind 패키지가 없음', sym: 'ObjectMapper를 찾을 수 없음', access: 'TreeCodec에 접근할 수 없음(jackson-core가 없음)', ncdfeCore: 'NoClassDefFoundError(tools/jackson/core/TreeCodec)', ncdfeMapper: 'NoClassDefFoundError(tools/jackson/databind/ObjectMapper)' },
  jarNames: { all: 'jackson-databind-3.1.5.jar;jackson-core-3.1.5.jar;jackson-annotations-2.21.jar', nocore: 'jackson-databind-3.1.5.jar;jackson-annotations-2.21.jar' },
  // 화면의 코드와 대조 프로그램(verify/plain/DepBasicProbe.java)이 실제로 쓴 파일과 실행한 명령은 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var J = this.jarNames;
    var javac = 'javac ' + (c.compileCp === 'none' ? '' : '-cp ' + J[c.compileCp] + ' ') + 'App.java';
    var java = 'java -cp ' + (c.runCp === 'none' ? '.' : J[c.runCp] + ';.') + ' App';
    return ['# App.java',
      'import java.util.Map;',
      'import tools.jackson.databind.ObjectMapper; // 잭슨 라이브러리(jackson-databind)가 주는 클래스',
      '',
      'public class App {',
      '    public static void main(String[] args) {',
      '        ObjectMapper mapper = new ObjectMapper();',
      '        String json = mapper.writeValueAsString(Map.of("name", "kim")); // Map을 JSON 글로 바꾼다',
      '        System.out.println(json);',
      '    }',
      '}',
      '',
      '# 터미널 (잭슨 jar 세 개를 받아 둔 폴더에서)', javac, java,
      '',
      '# build.gradle (Gradle을 쓰면 jar를 받아 -cp에 적는 일을 이 한 줄이 대신한다)',
      'dependencies {',
      "    implementation 'tools.jackson.core:jackson-databind:3.1.5'",
      '}'].join('\n');
  },
  label: function (c) { var n = { all: 'jar 세 개', nocore: 'jackson-core 뺌', none: 'jar 없음' }; return 'javac: ' + n[c.compileCp] + ' · java: ' + n[c.runCp]; },
  columns: ['컴파일', '실행', '오류'],
  simulate: function (c) {
    var ev = [], sum = [], cc = c.compileCp, rc = c.runCp, M = this.msgs, J = this.jarNames;
    var javac = 'javac ' + (cc === 'none' ? '' : '-cp ' + J[cc] + ' ') + 'App.java', java = 'java -cp ' + (rc === 'none' ? '.' : J[rc] + ';.') + ' App';
    var st = { hot: '', stage: '', phase: '', need: '', found: [], compile: '', cls: 0, errs: 0, run: '', out: '', printed: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function cpWords(k) { return k === 'all' ? 'jackson-databind, jackson-core, jackson-annotations' : k === 'nocore' ? 'jackson-databind, jackson-annotations' : ''; }

    // 컴파일
    st.hot = 'app';
    st.checks.push(['컴파일 명령', javac]);
    push('터미널에 javac 명령을 입력하면 컴파일러(javac)가 App.java를 읽습니다. 첫 줄의 java.util.Map은 자바(JDK)가 주는 클래스라서 따로 적지 않아도 찾습니다. 둘째 줄의 import tools.jackson.databind.ObjectMapper;는 다릅니다. ObjectMapper는 JDK의 클래스가 아니라 잭슨이라는 라이브러리가 주는 클래스이고, jackson-databind-3.1.5.jar라는 jar 파일이 tools/jackson/databind/ObjectMapper.class를 가지고 있습니다.', '');
    st.stage = 'compile'; st.phase = 'search'; st.need = 'mapper'; st.hot = 'cp';
    st.checks.push(['javac가 찾아볼 곳(클래스패스)', cc === 'none' ? '현재 폴더뿐' : cpWords(cc)]);
    var intro = '컴파일러는 ObjectMapper가 어떤 클래스인지 알아야 컴파일할 수 있으므로, 클래스패스에서 ObjectMapper.class를 찾습니다. 클래스패스는 클래스 파일을 찾아볼 곳의 목록이고, 명령의 -cp 뒤에 적습니다(Windows에서는 세미콜론(;)으로 구분). ';
    push(intro + (cc === 'all'
      ? '이 명령은 잭슨 jar 세 개를 적었으므로 찾아볼 곳은 jackson-databind, jackson-core, jackson-annotations입니다.'
      : cc === 'nocore'
        ? '이 명령은 jackson-databind와 jackson-annotations만 적었고 jackson-core는 뺐습니다. 내 코드 어디에도 jackson-core라는 이름은 나오지 않습니다.'
        : '이 명령에는 -cp가 없으므로 찾아볼 곳은 현재 폴더뿐입니다(CLASSPATH 환경 변수도 없을 때). 현재 폴더에 잭슨 jar 세 개가 놓여 있지만, -cp에 적지 않은 jar는 찾아볼 곳이 아닙니다.'), '');
    if (cc === 'none') {
      st.phase = 'miss'; st.errs = 3;
      st.checks.push(['ObjectMapper.class를 찾았나(컴파일)', { v: '찾지 못함', cls: 'bad' }]);
      push('찾아볼 곳(현재 폴더)에 ObjectMapper.class가 없어서 컴파일러는 ObjectMapper를 알 수 없습니다. 오류가 3개 납니다. 둘째 줄 import 문의 "package tools.jackson.databind does not exist"(' + M.pkg + '), 그리고 ObjectMapper mapper = new ObjectMapper(); 줄에서 ObjectMapper가 나오는 두 자리마다 "cannot find symbol"(' + M.sym + ')입니다.', 'bad');
    } else {
      st.phase = 'found'; st.found = ['d']; st.hot = 'd';
      st.checks.push(['ObjectMapper.class를 찾았나(컴파일)', { v: 'jackson-databind에서 찾음', cls: 'good' }]);
      push('jackson-databind jar에서 ObjectMapper.class를 찾았습니다. 그런데 ObjectMapper의 선언에는 jackson-core의 TreeCodec이라는 이름이 적혀 있습니다(public class ObjectMapper implements TreeCodec<JsonNode>, …). 그래서 mapper.writeValueAsString(…) 줄을 확인하려면 컴파일러는 TreeCodec.class도 찾아야 합니다.', 'good');
      st.need = 'core'; st.hot = 'c';
      if (cc === 'all') {
        st.found = ['d', 'c'];
        st.checks.push(['TreeCodec.class를 찾았나(컴파일)', { v: 'jackson-core에서 찾음', cls: 'good' }]);
        push('jackson-core jar에서 TreeCodec.class를 찾았습니다. 컴파일러가 필요한 클래스를 모두 알게 되었습니다.', 'good');
      } else {
        st.phase = 'miss'; st.errs = 1;
        st.checks.push(['TreeCodec.class를 찾았나(컴파일)', { v: '찾지 못함', cls: 'bad' }]);
        push('찾아볼 곳에 jackson-core가 없어서 TreeCodec.class를 찾지 못합니다. writeValueAsString 줄에서 "cannot access TreeCodec"(' + M.access + ') 오류가 1개 나고, javac는 "class file for tools.jackson.core.TreeCodec not found"라고 덧붙입니다. 내 코드에 jackson-core가 나오지 않아도, 내가 쓰는 jackson-databind가 그것을 쓰기 때문에 필요합니다.', 'bad');
      }
    }
    if (cc === 'all') {
      st.compile = 'ok'; st.cls = 1; st.hot = ''; st.phase = ''; st.need = '';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일에 성공해 App.class가 만들어집니다. 폴더에 새로 생긴 클래스 파일은 App.class 하나뿐입니다. 잭슨의 클래스 파일이 App.class로 복사된 것이 아니므로, 실행할 때 JVM이 jar에서 다시 찾아야 합니다.', 'good');
    } else {
      st.compile = 'err'; st.hot = ''; st.phase = ''; st.need = '';
      st.checks.push(['컴파일', { v: '오류 ' + st.errs + '개', cls: 'bad' }]);
      push('컴파일이 실패했습니다. App.class는 만들어지지 않았습니다.', 'bad');
    }

    // 실행
    st.stage = 'run'; st.hot = 'app'; st.found = []; st.checks.push(['실행 명령', java]);
    st.checks.push(['java가 찾아볼 곳(클래스패스)', rc === 'none' ? '현재 폴더(.)' : cpWords(rc) + ', 현재 폴더(.)']);
    if (cc !== 'all') {
      st.phase = 'read'; st.run = 'none'; st.hot = 'cp';
      st.checks.push(['실행', { v: 'App 클래스를 찾을 수 없음', cls: 'bad' }]);
      push('그래도 java 명령을 입력하면 JVM(java)이 클래스패스에서 App 클래스를 찾습니다. App.class가 없어서 기본 클래스 App을 찾거나 불러올 수 없다는 오류가 나고, 프로그램은 시작되지 않습니다. 이 오류는 java 명령의 -cp에 무엇을 적었는지와 상관없이 같습니다.', 'bad');
      st.hot = ''; st.phase = '';
    } else {
      st.phase = 'read'; st.hot = 'cp';
      push('java 명령을 입력하면 JVM(java)이 클래스패스에서 App 클래스를 찾아 main을 시작합니다. 맨 뒤의 점(.)은 현재 폴더, 곧 App.class가 있는 곳입니다. javac에 적은 -cp는 java 명령으로 이어지지 않으므로, 실행할 때 쓸 jar는 이 명령에 다시 적어야 합니다. ' + (rc === 'all'
        ? '이 명령은 잭슨 jar 세 개와 점(.)을 적었습니다.'
        : rc === 'nocore' ? '이 명령은 jackson-core를 빼고 jackson-databind와 jackson-annotations, 점(.)을 적었습니다.' : '이 명령은 점(.)만 적었으므로 잭슨 jar는 찾아볼 곳이 아닙니다.'), '');
      st.hot = 'app'; st.phase = 'search'; st.need = 'mapper';
      push('main의 첫 줄 new ObjectMapper()에서 ObjectMapper 클래스가 처음 필요해집니다. JVM이 클래스패스에서 ObjectMapper.class를 찾습니다.', '');
      if (rc === 'none') {
        st.phase = 'miss'; st.hot = 'cp'; st.run = 'fail';
        st.checks.push(['ObjectMapper.class를 찾았나(실행)', { v: '찾지 못함', cls: 'bad' }]);
        st.checks.push(['실행', { v: 'NoClassDefFoundError', cls: 'bad' }]);
        push('찾아볼 곳은 현재 폴더(.)뿐이고, 거기에는 ObjectMapper.class가 없습니다. JVM이 ObjectMapper를 불러오지 못해 ' + M.ncdfeMapper + ' 오류를 내고, 실행은 오류로 끝납니다(종료 코드 1). 오류가 난 곳은 App.java:6, 곧 new ObjectMapper() 줄이고 아무것도 출력되지 않았습니다. 컴파일할 때는 있었던 클래스를 실행할 때는 찾을 수 없을 때 나는 오류입니다.', 'bad');
      } else {
        st.phase = 'found'; st.found = ['d']; st.hot = 'd';
        push('jackson-databind jar에서 ObjectMapper.class를 찾았습니다. 이 클래스를 불러오려면 그 선언에 적힌 jackson-core의 TreeCodec도 있어야 하므로, JVM이 TreeCodec.class를 찾습니다.', 'good');
        st.need = 'core'; st.hot = 'c';
        if (rc === 'nocore') {
          st.phase = 'miss'; st.run = 'fail';
          st.checks.push(['TreeCodec.class를 찾았나(실행)', { v: '찾지 못함', cls: 'bad' }]);
          st.checks.push(['실행', { v: 'NoClassDefFoundError', cls: 'bad' }]);
          push('찾아볼 곳에 jackson-core가 없어서 TreeCodec.class를 찾지 못합니다. JVM이 ' + M.ncdfeCore + ' 오류를 내고, 실행은 오류로 끝납니다(종료 코드 1). 오류가 난 곳은 이번에도 App.java:6의 new ObjectMapper() 줄이고, 아무것도 출력되지 않았습니다. 내 코드가 직접 쓰지 않는 jar도, 내가 쓰는 라이브러리가 쓰면 실행할 때 있어야 합니다.', 'bad');
        } else {
          st.found = ['d', 'c', 'a']; st.hot = ''; st.run = 'ok'; st.out = '{"name":"kim"}'; st.printed = 1; st.phase = 'found';
          st.checks.push(['ObjectMapper가 쓰는 클래스를 찾았나(실행)', { v: 'jackson-core, jackson-annotations에서 찾음', cls: 'good' }]);
          st.checks.push(['실행', { v: '{"name":"kim"} 출력', cls: 'good' }]);
          push('TreeCodec.class는 jackson-core에서, ObjectMapper가 쓰는 애너테이션 클래스는 jackson-annotations에서 찾아 불러옵니다. writeValueAsString이 Map.of("name", "kim")을 JSON 글 {"name":"kim"}으로 바꿔 돌려주고, println이 그 글을 출력합니다.', 'good');
          st.hot = 'gradle'; st.phase = ''; st.need = '';
          push('화면 아래 build.gradle의 implementation \'tools.jackson.core:jackson-databind:3.1.5\' 한 줄은 지금까지 손으로 한 일을 빌드 도구 Gradle에 맡기는 방법입니다. 이 좌표(그룹:이름:버전)는 jackson-databind jar에 함께 묶여 있는 pom.xml에 적힌 것과 같고, 그 pom.xml에는 jackson-databind가 쓰는 라이브러리로 jackson-core와 jackson-annotations가 적혀 있습니다. Gradle 문서에 따르면 implementation으로 적은 의존성은 컴파일할 때의 클래스패스(compileClasspath)와 실행할 때의 클래스패스(runtimeClasspath)에 모두 들어가고, Gradle은 이런 정보 파일을 읽어 라이브러리가 쓰는 라이브러리(전이 의존성)도 찾아 함께 넣습니다. 이 실습은 잭슨으로 Gradle을 실행하지 않았습니다.', '');
        }
      }
      st.hot = '';
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (cc === 'all' && rc === 'all') {
      sum.push('잭슨 같은 라이브러리는 남이 만들어 둔 클래스를 jar 파일로 나누어 준 것입니다. 내 코드가 ObjectMapper를 쓰려면 컴파일할 때(javac -cp)와 실행할 때(java -cp) 모두 그 jar가 클래스패스에 있어야 하고, 둘 다 있었으므로 컴파일에 성공하고 {"name":"kim"}이 출력됐습니다.');
      sum.push('내 코드가 직접 쓰는 것은 jackson-databind의 ObjectMapper뿐이지만, jackson-databind가 jackson-core와 jackson-annotations를 쓰므로 jar 세 개가 모두 필요했습니다(전이 의존성). 실제 프로젝트에서는 build.gradle에 implementation 한 줄을 적으면 Gradle이 이 jar들을 받아 클래스패스에 넣어 주므로, -cp를 손으로 적을 일은 드뭅니다.');
      sum.push('라이브러리는 결국 이런 jar 파일입니다. 예시로 만든 lib.Greeter 같은 클래스도 javac로 컴파일해 jar 도구로 greet.jar처럼 묶으면, 같은 방법으로 -cp에 적어 쓸 수 있습니다.');
    } else if (cc === 'none') {
      sum.push('컴파일하는 javac 명령에 잭슨 jar를 적지 않으면 컴파일러가 ObjectMapper를 찾지 못해 컴파일이 실패합니다(' + M.pkg + ', ' + M.sym + '). 컴파일에 실패하면 App.class가 없어서 실행도 할 수 없습니다.');
      sum.push(rc === 'none' ? '실행하는 java 명령에서도 jar를 뺐지만, 그 차이는 드러나지 않았습니다. 컴파일 단계에서 이미 멈췄기 때문입니다.' : 'java 명령에 jar를 적어 두었어도 소용이 없었습니다. jar는 컴파일할 때도 필요하고, 같은 폴더에 놓여 있다는 것만으로는 클래스패스에 들어가지 않습니다.');
    } else if (cc === 'nocore') {
      sum.push('컴파일하는 javac 명령에서 jackson-core만 빼도 컴파일이 실패합니다(' + M.access + '). ObjectMapper의 선언에 jackson-core의 TreeCodec이 적혀 있어서, 컴파일러가 writeValueAsString 줄을 확인하려면 그것도 찾아야 하기 때문입니다.');
      sum.push('내 코드에 나오지 않는 jar라도 내가 쓰는 라이브러리가 쓰면 필요합니다(전이 의존성). Gradle로 implementation \'tools.jackson.core:jackson-databind:3.1.5\'만 적으면, jackson-databind의 pom.xml에 적힌 jackson-core와 jackson-annotations를 Gradle이 함께 받아 넣습니다(Gradle 문서).');
    } else if (rc === 'none') {
      sum.push('컴파일은 잭슨 jar와 함께 했지만 실행하는 java 명령에서 jar를 빼면, 컴파일에는 성공하고 실행하는 중에 ' + M.ncdfeMapper + ' 오류가 납니다.');
      sum.push('컴파일이 성공했다고 실행도 성공하는 것은 아닙니다. javac와 java는 클래스패스를 따로 받으므로 실행할 때 쓸 jar도 따로 적어야 하고, 빠진 것은 그 클래스가 처음 필요해진 줄(App.java:6)에서야 드러납니다.');
    } else {
      sum.push('실행하는 java 명령에서 jackson-core만 빼면, 컴파일에는 성공했어도 실행하는 중에 ' + M.ncdfeCore + ' 오류가 납니다. ObjectMapper를 불러오려면 jackson-core의 TreeCodec이 있어야 하기 때문입니다.');
      sum.push('내 코드가 직접 쓰지 않는 jackson-core도 실행할 때 있어야 합니다(전이 의존성). Gradle로 implementation 한 줄을 적으면 Gradle이 jackson-databind의 pom.xml을 읽어 jackson-core와 jackson-annotations도 함께 넣으므로, 이런 빠짐이 생기지 않습니다(Gradle 문서).');
    }
    var row;
    if (cc === 'all') row = ['성공', rc === 'all' ? '{"name":"kim"} 출력' : '실패: 아무것도 출력되지 않음', rc === 'all' ? '없음' : rc === 'nocore' ? M.ncdfeCore : M.ncdfeMapper];
    else if (cc === 'nocore') row = ['오류 1개', '실행할 수 없음(App.class가 없음)', M.access];
    else row = ['오류 3개', '실행할 수 없음(App.class가 없음)', M.pkg + ', ' + M.sym + '(2곳)'];
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 javac 명령으로 컴파일하는 것부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    H.counters(v, [[s.errs, '컴파일러가 알린 오류'], [s.cls, '만들어진 App.class'], [s.printed, '출력된 줄']]);
  },
  // 그림: 왼쪽에 내 코드(App.java), 가운데에 클래스패스(찾아볼 곳의 목록), 오른쪽에 잭슨 jar 세 개(jackson-databind, jackson-core, jackson-annotations). 찾는 클래스를 가진 jar를 찾으면 클래스패스에서 그 jar로 화살표가 가고, 클래스패스에 없는 jar는 흐리게 남는다. 그 아래에 build.gradle 한 줄, 컴파일 결과, 실행 결과, App.class가 있는지.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    var stage = s ? s.stage : '', hot = s ? s.hot : '', ph = s ? s.phase : '', need = s ? s.need : '', found = s ? s.found : [];
    var k = stage === 'compile' ? c.compileCp : stage === 'run' ? c.runCp : '';
    function inCp(j) { return k === 'all' || (k === 'nocore' && j !== 'c'); }
    P.box('app', 14, 16, 180, 150, { cls: hot === 'app' ? 'hot now' : 'plain', title: 'App.java', sub: ['내 코드', 'ObjectMapper를 씀', need === 'mapper' ? '찾는 것: ObjectMapper' : need === 'core' ? '찾는 것: TreeCodec' : '', stage === 'compile' ? '컴파일 중' : stage === 'run' ? (s.cls ? 'App.class 실행 중' : 'App.class 없음') : '실행 전'] });
    var list = !stage ? ['명령을 입력하면 정해짐'] : k === 'none' ? (stage === 'run' ? ['현재 폴더(.)'] : ['현재 폴더뿐']) : (k === 'all' ? ['jackson-databind', 'jackson-core', 'jackson-annotations'] : ['jackson-databind', 'jackson-annotations']).concat(stage === 'run' ? ['현재 폴더(.)'] : []);
    P.box('cp', 224, 16, 190, 150, { cls: ph === 'miss' ? 'bad' : hot === 'cp' ? 'hot now' : stage ? 'plain' : 'ghost', title: '클래스패스', sub: ['찾아볼 곳 (-cp)'].concat(list) });
    var jars = [['d', 'jackson-databind', 'ObjectMapper.class', 16], ['c', 'jackson-core', 'TreeCodec.class', 66], ['a', 'jackson-annotations', '애너테이션 클래스', 116]];
    jars.forEach(function (j) {
      var on = found.indexOf(j[0]) >= 0, missing = ph === 'miss' && ((need === 'mapper' && j[0] === 'd') || (need === 'core' && j[0] === 'c'));
      P.box(j[0], 444, j[3], 222, 44, { cls: on ? (hot === j[0] ? 'good now' : 'good') : missing ? 'bad' : stage && !inCp(j[0]) ? 'ghost' : 'plain', title: j[1], sub: [!stage ? j[2] : inCp(j[0]) ? j[2] : '클래스패스에 없음'] });
    });
    if (s && (ph === 'search' || ph === 'found' || ph === 'miss')) P.arrow('find', 'app:r:0.5', 'cp:l:0.5', { cls: ph === 'miss' ? 'bad' : 'hot' });
    found.forEach(function (j) { P.arrow('hit' + j, 'cp:r:0.5', j + ':l:0.5', { cls: 'good' }); });
    P.box('gradle', 14, 176, 652, 30, { cls: hot === 'gradle' ? 'hot now' : 'ghost', title: 'build.gradle', right: "implementation 'tools.jackson.core:jackson-databind:3.1.5'" });
    var cs = s ? s.compile : '', rs = s ? s.run : '';
    P.box('r1', 14, 214, 652, 36, { cls: cs === 'ok' ? 'good' : cs === 'err' ? 'bad' : 'ghost', title: '컴파일', right: cs === 'ok' ? '성공' : cs === 'err' ? '오류 ' + s.errs + '개' : '' });
    P.box('r2', 14, 256, 652, 36, { cls: rs === 'ok' ? 'good' : rs ? 'bad' : 'ghost', title: '실행', right: rs === 'ok' ? s.out : rs === 'fail' ? 'NoClassDefFoundError' : rs === 'none' ? '실행할 수 없음' : '' });
    P.box('r3', 14, 298, 652, 36, { cls: s && s.cls ? 'wait' : cs === 'err' ? 'bad' : 'ghost', title: '만들어진 App.class', right: cs === 'err' ? '없음' : (s ? s.cls : 0) + '개' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21, java 21)이고, 라이브러리는 이미 받아 둔 잭슨 jar 세 개(jackson-databind 3.1.5, jackson-core 3.1.5, jackson-annotations 2.21)를 썼습니다(새로 내려받지 않았습니다). 잭슨 3부터 패키지 이름은 tools.jackson으로 시작하고(잭슨 2는 com.fasterxml.jackson), jackson-annotations만 com.fasterxml.jackson.annotation 패키지를 그대로 씁니다. 화면의 좌표 tools.jackson.core:jackson-databind:3.1.5는 jackson-databind jar에 함께 묶여 있는 pom.xml에서 읽었습니다. 아홉 가지 조합(javac의 -cp 3가지와 java의 -cp 3가지)을 모두 대조했습니다. 조합마다 새 폴더에 jar 세 개와 App.java를 놓고 화면에 적힌 터미널 명령 javac와 java를 그대로 실행했고, 화면의 코드는 대조 프로그램이 실제 파일 내용과 실행한 명령으로 만들어 남긴 글과 글자까지 같습니다. 대조한 것은 컴파일 성공 여부, 오류의 개수와 진단 코드(compiler.err.doesnt.exist, compiler.err.cant.resolve.location, compiler.err.cant.access를 화면의 오류 설명으로 옮겼습니다)와 오류가 난 줄, App.class가 만들어졌는지, java 명령의 종료 코드와 출력, 실행 오류의 종류와 대상 클래스, 그 위치(App.java:6)입니다. 컴파일에 실패한 조합에서도 java 명령을 실제로 실행해, App 클래스를 찾을 수 없다는 오류가 나는 것을 확인했습니다. 단계 문장이 기대는 사실도 따로 실행해 확인했습니다. jar마다 ObjectMapper.class, TreeCodec.class, JsonSerializeAs.class가 있다는 것(jar tf), ObjectMapper의 선언이 tools.jackson.core.TreeCodec을 구현한다는 것(javap), jackson-databind의 pom.xml에 test 범위가 아닌 의존성으로 jackson-annotations와 jackson-core가 적혀 있다는 것, 컴파일에 성공한 폴더에 생긴 클래스 파일은 App.class 하나뿐이라는 것, 실행할 때 jar만 적고 점(.)을 빼면 App을 찾지 못한다는 것입니다. 실행할 때 jackson-annotations만 빼도 App.java:6에서 NoClassDefFoundError(com/fasterxml/jackson/annotation/JsonSerializeAs)가 나는 것을 따로 확인했고, 화면의 "애너테이션 클래스는 jackson-annotations에서 불러온다"는 문장은 이 결과에 기댑니다. 요약 끝 문장의 greet.jar는 예시로 만든 lib.Greeter를 javac와 jar 도구로 묶어 -cp greet.jar로 컴파일하고 -cp greet.jar;.로 실행해 hello, kim이 출력되는 것을 확인했습니다. 명령은 Windows 11에서 실행했고, 클래스패스의 구분자 세미콜론(;)은 Windows 기준입니다(macOS와 Linux는 콜론). CLASSPATH 환경 변수는 실행하는 프로세스에서 지웠고, 이 변수가 설정된 환경에서는 -cp를 적지 않은 명령의 결과가 달라질 수 있습니다. java 실행기의 오류 문장은 검증 실행에 쓴 Windows의 언어 설정(한국어)을 따랐고, 오류의 개수와 종류, 오류 문장은 명세가 정한 것이 아니라 이 JDK와 이 잭슨 버전에서 관찰한 것입니다. 문서는 직접 열어 확인했습니다. Oracle의 javac 도구 문서(https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html)와 java 도구 문서(https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html)에서 -cp가 클래스 파일을 찾을 디렉터리와 JAR 파일의 목록이고 지정하지 않으면 현재 폴더라는 것을, NoClassDefFoundError API 문서(https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/NoClassDefFoundError.html)에서 컴파일할 때는 있었던 클래스 정의를 실행할 때 찾을 수 없으면 던져진다는 것을 따랐습니다. Gradle은 Java Plugin 문서(https://docs.gradle.org/current/userguide/java_plugin.html)에서 implementation이 컴파일과 실행에 모두 필요한 의존성이고 compileClasspath와 runtimeClasspath가 implementation을 포함한다는 것을, Graph Resolution 문서(https://docs.gradle.org/current/userguide/graph_resolution.html)에서 Gradle이 모듈의 메타데이터(POM 등)를 읽어 그 의존성을 그래프에 더하며 이 과정이 올바른 전이 의존성을 빌드에 넣는다는 것을, Dependency Management 기초 문서(https://docs.gradle.org/current/userguide/dependency_management_basics.html)에서 Gradle이 의존성을 내려받고 캐시하고 풀어 준다는 것을 따랐습니다. 잭슨으로는 Gradle을 실행하지 않았습니다. 이 컴퓨터의 Gradle 캐시에 잭슨이 없고 내려받지 않았기 때문입니다. 대신 캐시에 있던 Gson 2.11.0으로 Gradle 8.14.3을 오프라인 실행해, implementation 한 줄만 적었는데 Gson이 쓰는 error_prone_annotations가 compileClasspath와 runtimeClasspath의 의존성 목록에 함께 올라오는 것을 확인했습니다(그 jar 파일은 캐시에 없어 실제 jar 목록까지는 풀지 못했습니다). 따라서 jackson-core와 jackson-annotations가 Gradle의 어느 클래스패스에 들어가는지는 잭슨으로 직접 확인한 것이 아니라 문서와 이 확인에 기댄 것입니다. 버전 충돌, 클래스패스 여러 곳에 같은 클래스가 있을 때의 순서, 모듈 시스템은 다루지 않았고, 의존성과 공급망은 "세부 동작 실습: 의존성과 공급망"에서, 의존성을 보고 설정을 자동으로 만들어 주는 스프링 부트는 "세부 동작 실습: 스프링 부트 자동 설정"에서 다룹니다.',
});
