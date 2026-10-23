Lab.register({
  id: 'deploy_basic', nav: '배포', cat: '기초개념', mode: 'step', basic: true, deep: ['deploy', 'cicd', 'k8s'],
  title: '코드를 고치면 실행 중인 서버는 언제 바뀌는가',
  why: '자바 서버는 소스 파일을 그대로 실행하지 않는다. 소스 파일을 컴파일해 jar 파일로 만들고, java -jar로 그 jar를 실행한 프로세스가 요청에 답한다. 그래서 코드를 고친 뒤에도 jar를 새로 만드는 일과 서버를 끄고 다시 켜는 일이 남는데, 이것을 그때그때 손으로 하면 하나를 빠뜨리거나 사람마다 순서가 달라지기 쉽고, 지금 서버에서 어느 버전이 도는지도 헷갈린다. 배포 단계를 미리 정해 두고 그대로 따르면 매번 같은 순서로 새 버전을 돌리게 되어 빠뜨리는 것이 줄고, 언제부터 어느 버전이 도는지 알 수 있다.',
  use: '새 기능을 내놓거나 버그를 고칠 때마다 배포한다. 스프링 부트 프로젝트는 보통 ./gradlew bootJar(Maven이면 ./mvnw package)로 jar 파일을 만들고, 서버에서 java -jar로 실행한다. 요즘은 코드를 저장소에 올리면 GitHub Actions나 Jenkins 같은 도구가 빌드와 테스트를 거쳐 서버에 올리는 일까지 이어서 하게 해 두는 경우가 많다. 서버가 여러 대이면 한 대씩 차례로 바꾸어, 한 대를 다시 켜는 동안에도 다른 서버가 요청을 받게 한다.',
  intro: '스프링 부트 서버는 소스 파일(.java)을 그대로 실행하지 않습니다. 소스 파일을 컴파일해 .class 파일을 만들고, 그것을 jar 파일 하나로 묶은 뒤, java -jar 명령으로 그 jar 파일을 실행합니다. 실행하면 프로세스(실행 중인 프로그램)가 하나 생기고, 이 프로세스는 켜질 때 jar 파일에서 클래스를 읽어 들여 그 코드대로 요청에 답합니다. 그래서 코드는 세 곳에 따로 있습니다. 사람이 고치는 소스 파일, 빌드로 만든 jar 파일, 그리고 돌고 있는 서버 프로세스입니다. 소스 파일을 고쳐도 jar 파일은 저절로 바뀌지 않고, jar 파일을 새로 만들어도 이미 돌고 있는 프로세스는 바뀌지 않습니다. 컴파일과 jar 만들기는 ./gradlew bootJar 명령(스프링 부트의 Gradle 플러그인이 주는 bootJar 작업)이 하고, 돌던 서버를 끈 뒤 java -jar로 다시 켜야 새 코드가 요청에 답합니다. 이렇게 새 버전을 실제로 돌아가게 하는 일을 배포라고 합니다. 코드 칸의 앞부분은 자바 파일 두 개이고, 뒷부분은 터미널에서 하는 일입니다(#으로 시작하는 줄은 번호가 붙은 할 일이고, 그 밑의 줄이 터미널에 치는 명령입니다). 이 실습은 예시로 만든 HelloController의 "버전 1"을 "버전 2"로 고친 뒤, jar 파일을 새로 만드는 일과 서버를 끄고 다시 켜는 일을 빼거나 순서를 바꿔 가며, 요청에 어느 버전이 답하는지를 봅니다.',
  terms: ['배포', '서버 재시작', '실행 가능한 jar', './gradlew bootJar', '프로그램과 프로세스', '연결 거부 오류'],
  controls: [
    { id: 'edit', label: 'HelloController.java의 "버전 1"을 "버전 2"로 고친다', type: 'check', value: true },
    { id: 'build', label: '고친 뒤 ./gradlew bootJar로 jar 파일을 새로 만든다', type: 'check', value: true },
    { id: 'restart', label: '켜 둔 서버를 끄고 java -jar로 다시 켠다', type: 'check', value: true },
    { id: 'when', label: '요청을 보내는 때', type: 'select', value: 'after', show: function (c) { return c.restart; }, options: [['after', '서버를 다시 켠 뒤'], ['during', '서버를 끈 뒤, 다시 켜기 전']] },
  ],
  // 다시 켜는 일이 없으면 요청 때를 고를 수 없으므로 처음 값으로 되돌린다
  fix: function (c) { if (!c.restart && c.when !== 'after') return { when: 'after' }; },
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '소스를 고치고 ./gradlew bootJar로 jar를 새로 만든 뒤, 서버를 끄고 java -jar로 다시 켜면 요청에 어느 버전이 답하나', d: '고친 소스로 새 jar 파일을 만들고, 돌던 서버를 끈 뒤 새 jar로 다시 켭니다. 새 프로세스가 "버전 2"로 답합니다.', v: { edit: true, build: true, restart: true, when: 'after' } },
    { t: '소스 파일만 고치면', q: 'HelloController.java만 고쳐 저장하고, jar도 새로 만들지 않고 서버도 그대로 두면', d: '소스 파일만 "버전 2"이고 jar 파일과 돌고 있는 서버는 그대로입니다. 서버는 "버전 1"로 답합니다.', v: { edit: true, build: false, restart: false, when: 'after' } },
    { t: 'jar만 새로 만들고 서버를 끄지 않으면', q: './gradlew bootJar로 jar 파일을 새로 만들었지만 켜 둔 서버를 끄지 않으면', d: 'jar 파일은 "버전 2"가 되었지만, 돌고 있는 프로세스는 켜질 때 읽어 들인 코드로 계속 "버전 1"을 답합니다.', v: { edit: true, build: true, restart: false, when: 'after' } },
    { t: 'jar를 새로 만들지 않고 다시 켜면', q: '소스를 고치고 서버를 끄고 다시 켜되, ./gradlew bootJar를 빼먹으면', d: '다시 켠 프로세스는 옛 jar 파일을 읽습니다. 소스 파일은 "버전 2"이지만 "버전 1"이 답합니다.', v: { edit: true, build: false, restart: true, when: 'after' } },
    { t: '끄고 다시 켜는 사이에 요청하면', q: '서버를 끈 뒤 다시 켜기 전에 요청이 오면', d: '그 포트에서 연결을 받는 프로세스가 없어 요청은 연결 거부 오류로 실패합니다. 다시 켠 뒤에 온 요청은 "버전 2"를 받습니다.', v: { edit: true, build: true, restart: true, when: 'during' } },
    { t: '고치지 않고 다시 만들고 켜면', q: '소스를 고치지 않고 jar만 다시 만들고 서버를 다시 켜면', d: '같은 소스로 같은 jar를 만들고 같은 코드로 다시 켰을 뿐이어서 "버전 1"이 답합니다.', v: { edit: false, build: true, restart: true, when: 'after' } },
  ],
  // 화면의 코드. 대조 프로그램(verify/net/deploy_basic_probe_jdk.js)은 이 함수가 만든 글을 그대로 쓴다.
  // 자바 파일 두 개는 그대로 파일로 써서 컴파일하고, "# 터미널에서" 줄 밑의 할 일과 명령은 줄마다 실제로 한다.
  code: function (c) {
    var o = [
      '// 파일: src/main/java/com/example/demo/DemoApplication.java',
      '// DemoApplication과 HelloController는 이 실습에서 예시로 만든 클래스',
      '// @SpringBootApplication, SpringApplication, @RestController, @GetMapping은 스프링 부트와 스프링이 주는 것',
      'package com.example.demo;',
      '',
      'import org.springframework.boot.SpringApplication;',
      'import org.springframework.boot.autoconfigure.SpringBootApplication;',
      '',
      '@SpringBootApplication',
      'public class DemoApplication {',
      '    // java -jar로 jar 파일을 실행하면 이 main이 불리고, 스프링 부트가 웹 서버를 켠다',
      '    public static void main(String[] args) {',
      '        SpringApplication.run(DemoApplication.class, args);',
      '    }',
      '}',
      '',
      '// 파일: src/main/java/com/example/demo/HelloController.java',
      'package com.example.demo;',
      '',
      'import org.springframework.web.bind.annotation.GetMapping;',
      'import org.springframework.web.bind.annotation.RestController;',
      '',
      '@RestController',
      'public class HelloController {',
      '    // GET /hello 요청이 오면 스프링이 이 메서드를 부르고, 돌려준 글자가 응답이 된다',
      '    @GetMapping("/hello")',
      '    public String hello() {',
      c.edit ? '        return "버전 1"; // 아래 2번에서 "버전 2"로 고친다' : '        return "버전 1";',
      '    }',
      '}',
      '',
      '# 터미널에서 하는 일 (프로젝트 폴더에서, jar 이름은 짧게 app.jar로 적었다)',
    ];
    var n = 0;
    function step(s) { n++; o.push('# ' + n + '. ' + s); }
    step('jar 파일을 만들고, 그 jar로 서버를 켠다');
    o.push('./gradlew bootJar', 'java -jar build/libs/app.jar');
    if (c.edit) step('HelloController.java의 "버전 1"을 "버전 2"로 고쳐 저장한다');
    if (c.build) { step('jar 파일을 새로 만든다 (서버는 켜 둔 채)'); o.push('./gradlew bootJar'); }
    var req = function () { step('다른 터미널에서 요청을 보낸다'); o.push('curl http://localhost:8080/hello'); };
    if (c.restart) {
      step('켜 둔 서버를 끈다 (서버를 켠 터미널에서 Ctrl+C)');
      if (c.when === 'during') req();
      step(c.build ? '새로 만든 jar로 다시 켠다' : 'jar 파일은 그대로 두고 다시 켠다');
      o.push('java -jar build/libs/app.jar');
      if (c.when !== 'during') req();
    } else req();
    return o.join('\n');
  },
  label: function (c) {
    return (c.edit ? '소스를 고침' : '소스를 고치지 않음') + ' · ' + (c.build ? 'jar를 새로 만듦' : 'jar를 새로 만들지 않음') + ' · ' + (!c.restart ? '서버를 다시 켜지 않음' : c.when === 'during' ? '서버를 끈 사이에 요청' : '서버를 끄고 다시 켠 뒤 요청');
  },
  columns: ['응답', '돌고 있는 서버의 코드', 'jar 파일의 코드', '소스 파일의 코드'],
  simulate: function (c) {
    var edit = !!c.edit, build = !!c.build, rs = !!c.restart, during = rs && c.when === 'during';
    var V1 = '버전 1', V2 = '버전 2';
    var ev = [], sum = [], n = 0;
    var st = { proc: 'none', mem: '', jar: '', src: V1, starts: 0, builds: 0, req: '', ans: '', rd: false, bd: false, ed: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function q(v) { return '"' + v + '"'; }
    function J(v, t) { var p = { '을': ['을', '를'], '이': ['이', '가'], '로': ['로', '로'] }[t]; return q(v) + (v === V1 ? p[0] : p[1]); }
    function clear() { st.rd = false; st.bd = false; st.ed = false; }
    var result = { response: '', running: '' }, beforeStop = '';
    // 1번: jar를 만들고 켠다
    n++;
    st.jar = st.src; st.builds = 1; st.bd = true;
    push(n + '번: ./gradlew bootJar가 소스 파일을 컴파일해 .class 파일을 만들고, 그것을 jar 파일 build/libs/app.jar로 묶습니다. 이 jar 파일의 HelloController는 ' + J(V1, '을') + ' 돌려주는 코드입니다.', '');
    clear();
    st.proc = 'up'; st.mem = st.jar; st.starts = 1; st.rd = true;
    push(n + '번: java -jar build/libs/app.jar가 jar 파일을 실행해 프로세스를 하나 만듭니다. 이 프로세스는 켜질 때 jar 파일에서 클래스를 읽어 들이고, 스프링 부트가 웹 서버를 켜서 8080 포트에서 요청을 기다립니다. 이제 GET /hello에는 ' + J(V1, '로') + ' 답합니다.', '');
    clear();
    // 소스를 고친다
    if (edit) {
      n++;
      st.src = V2; st.ed = true;
      push(n + '번: 사람이 HelloController.java를 열어 ' + J(V1, '을') + ' ' + J(V2, '로') + ' 고쳐 저장합니다. 바뀐 것은 디스크의 소스 파일 하나뿐입니다. jar 파일은 여전히 ' + J(V1, '이') + '고, 돌고 있는 서버도 ' + J(V1, '로') + ' 답합니다. 소스 파일을 저장해도 컴파일과 jar 만들기는 저절로 일어나지 않습니다.', '');
      clear();
    }
    // jar를 새로 만든다
    if (build) {
      n++;
      st.jar = st.src; st.builds++; st.bd = true;
      push(n + '번: ./gradlew bootJar가 지금의 소스 파일로 jar 파일을 새로 만듭니다. 이제 jar 파일의 코드는 ' + J(st.jar, '을') + ' 돌려줍니다.' + (edit ? ' 하지만 서버를 켜 둔 채라서, 이때 요청을 보내 보아도 돌고 있는 프로세스는 ' + J(V1, '로') + ' 답했습니다. 프로세스는 켜질 때 읽어 들인 클래스로 돌 뿐, 디스크의 jar 파일이 바뀐 것을 가져오지 않습니다.' : ' 소스 파일을 고치지 않았으니 처음과 같은 코드입니다.'), '');
      clear();
    }
    function request() {
      n++;
      st.req = 'sent'; st.ans = '';
      push(n + '번: 다른 터미널에서 curl이 GET /hello 요청을 보냅니다. 브라우저 주소창에 localhost:8080/hello를 입력하면 브라우저가 보내는 요청과 같은 것입니다.', '');
      if (st.proc !== 'up') {
        st.req = 'fail'; st.ans = '연결 거부 오류';
        push('서버를 끈 뒤라서 8080 포트에서 연결을 받는 프로세스가 없습니다. curl은 연결 거부 오류로 답을 받지 못합니다. 소스 파일과 jar 파일이 무엇이든 이 요청에는 상관이 없습니다.', 'bad');
        result.response = '연결 거부 오류'; result.running = '없음 (서버가 꺼져 있음)';
      } else {
        st.req = 'got'; st.ans = st.mem;
        if (st.mem !== st.src) push('돌고 있는 프로세스의 코드는 ' + J(st.mem, '을') + ' 돌려주는 것이어서 curl은 ' + J(st.mem, '을') + ' 받습니다. 소스 파일에는 ' + J(st.src, '이') + ' 적혀 있지만, ' + (st.jar !== st.src ? 'jar 파일을 새로 만들지 않아 프로세스가 읽은 jar 파일은 옛 코드였습니다.' : '프로세스를 다시 켜지 않아 새 jar 파일을 읽지 않았습니다.'), 'bad');
        else push('돌고 있는 프로세스가 자기 코드대로 ' + J(st.mem, '로') + ' 답하고, curl은 ' + J(st.mem, '을') + ' 받습니다. 소스 파일, jar 파일, 돌고 있는 서버의 코드가 모두 ' + q(st.mem) + '로 같습니다.' + (edit ? ' 고친 새 버전이 요청에 답했습니다.' : ' 고친 것이 없으므로 처음 버전 그대로입니다.'), edit ? 'good' : '');
        result.response = st.mem; result.running = st.mem;
      }
    }
    if (rs) {
      beforeStop = st.mem;
      n++;
      st.proc = 'down'; st.mem = ''; st.req = ''; st.ans = '';
      push(n + '번: 서버를 켠 터미널에서 Ctrl+C를 눌러 서버를 끕니다. 프로세스가 끝나면서 그 프로세스가 읽어 들였던 코드도 함께 사라집니다. 디스크의 소스 파일과 jar 파일은 그대로 남습니다.' + (during ? ' 다시 켜기 전이어서 지금은 8080 포트에서 요청을 받는 프로세스가 없습니다.' : ''), '');
      if (during) request();
      n++;
      st.proc = 'up'; st.mem = st.jar; st.starts++; st.rd = true;
      if (during) { st.req = ''; st.ans = ''; }
      push(n + '번: java -jar build/libs/app.jar로 다시 켭니다. 새 프로세스가 생기고, 켜질 때 지금 디스크에 있는 jar 파일에서 클래스를 처음부터 읽어 들입니다. 그 jar 파일의 코드는 ' + J(st.jar, '을') + ' 돌려주는 것입니다.' + (build && edit ? ' 고친 코드가 이제 돌고 있는 서버의 코드가 되었습니다.' : edit ? ' jar 파일을 새로 만들지 않았으므로, 소스 파일을 고친 것은 여기까지 오지 못했습니다.' : ' 소스를 고치지 않았으니 처음과 같은 코드입니다.') + (during ? ' 꺼져 있는 사이에 보낸 요청은 이미 실패했고, 할 일을 마친 뒤 한 번 더 요청을 보내 보면 ' + J(st.jar, '을') + ' 받습니다.' : ''), build && edit ? 'good' : edit ? 'bad' : '');
      clear();
      if (during) { st.req = 'got'; st.ans = st.mem; }
      else request();
    } else request();
    // 요약
    if (during) {
      sum.push('서버를 끈 뒤 다시 켜기 전에 온 요청은 연결 거부 오류로 실패합니다. 받아 줄 프로세스가 없기 때문입니다. 다시 켠 뒤에 온 요청은 새 jar 파일의 ' + J(st.jar, '을') + ' 받았습니다.');
      sum.push('서버가 한 대뿐이면 끄고 다시 켜는 동안 서비스가 멈춥니다. 이 틈을 없애는 방법은 "세부 동작 실습: 배포 전략"에서 다룹니다.');
    } else if (edit && build && rs) {
      sum.push('소스를 고치고(2번), jar 파일을 새로 만들고(3번), 돌던 서버를 끄고 다시 켜야(4~5번) 새 프로세스가 고친 코드로 ' + J(V2, '을') + ' 답합니다. 이렇게 새 버전을 실제로 돌아가게 하는 일이 배포입니다.');
      sum.push('코드는 소스 파일, jar 파일, 돌고 있는 프로세스의 세 곳에 따로 있습니다. 소스 파일의 코드로 jar 파일을 만드는 것이 ./gradlew bootJar이고, jar 파일의 코드를 프로세스로 읽어 들이게 하는 것이 다시 켜는 일입니다.');
    } else if (edit && !build && !rs) {
      sum.push('소스 파일은 ' + J(V2, '로') + ' 바뀌었지만 jar 파일도, 돌고 있는 서버도 그대로라서 ' + J(V1, '이') + ' 답합니다. 파일만 고쳐 둔 상태는 아직 배포가 아닙니다.');
      sum.push('새 코드가 답하려면 jar 파일을 새로 만들고(./gradlew bootJar), 서버를 끄고 다시 켜야(java -jar) 합니다.');
    } else if (edit && build && !rs) {
      sum.push('jar 파일은 ' + J(V2, '로') + ' 새로 만들었지만, 켜 둔 서버는 켜질 때 읽어 들인 코드로 계속 ' + J(V1, '을') + ' 답합니다. jar 파일을 바꾸는 것과 돌고 있는 프로세스를 바꾸는 것은 다른 일입니다.');
      sum.push('새 jar가 답하게 하려면 돌던 서버를 끄고 java -jar로 다시 켜야 합니다.');
    } else if (edit && !build && rs) {
      sum.push('서버를 다시 켰지만 jar 파일을 새로 만들지 않아서, 새 프로세스는 옛 jar 파일을 읽고 ' + J(V1, '을') + ' 답합니다. 자바 서버는 소스 파일이 아니라 jar 파일을 실행하기 때문입니다.');
      sum.push('고친 소스가 서버에 닿으려면 jar 파일 새로 만들기(./gradlew bootJar)와 다시 켜기(java -jar)를 모두 거쳐야 합니다.');
    } else if (!edit && !rs) {
      sum.push('소스를 고치지 않았으므로 ' + J(V1, '이') + ' 답합니다. ' + (build ? 'jar 파일을 다시 만들어도 같은 소스로 만든 같은 코드입니다.' : '서버는 처음 읽어 들인 코드 그대로 돌고 있습니다.'));
      sum.push('돌고 있는 서버의 코드가 바뀌려면 고친 소스로 jar 파일을 새로 만들고, 서버를 다시 켜야 합니다.');
    } else {
      sum.push('소스를 고치지 않고 ' + (build ? 'jar를 다시 만들고 ' : '') + '서버를 다시 켜면, 새 프로세스도 같은 코드를 읽어 ' + J(V1, '이') + ' 답합니다. 끄고 다시 켠다고 코드가 바뀌지는 않습니다.');
      sum.push('코드를 바꾸지도 않고 서버를 끄고 다시 켜면, 얻는 것 없이 요청을 받지 못하는 시간만 생깁니다.');
    }
    return { events: ev, summary: sum, row: [result.response, result.running, st.jar, st.src], later: during ? st.mem : '', starts: st.starts, builds: st.builds, beforeStop: beforeStop, sameProc: during ? '(해당 없음)' : String(!rs) };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 jar 파일을 만들고 서버를 켜는 것부터 시작합니다.'); return; }
    var mem = s.proc === 'up' ? s.mem : s.proc === 'down' ? '없음 (서버가 꺼져 있음)' : '아직';
    H.table(v, ['곳', '코드가 돌려주는 글자'], [
      { cls: '', cells: ['소스 파일 HelloController.java', s.src] },
      { cls: '', cells: ['jar 파일 build/libs/app.jar', s.jar ? (s.jar !== s.src ? { v: s.jar + ' (소스와 다름)', cls: 'bad' } : s.jar) : '아직'] },
      { cls: s.proc === 'down' ? 'gone' : '', cells: ['돌고 있는 서버 프로세스', s.proc === 'up' && s.mem !== s.src ? { v: mem + ' (소스와 다름)', cls: 'bad' } : mem] },
      { cls: s.ans ? '' : 'gone', cells: ['요청에 온 응답', s.ans ? { v: s.ans, cls: s.req === 'fail' ? 'bad' : s.ans === s.src ? 'good' : 'bad' } : '아직'] },
    ], '지금 상태');
    H.counters(v, [[s.builds, 'jar를 만든 횟수'], [s.starts, '서버를 켠 횟수']]);
  },
  // 그림: 왼쪽에 클라이언트(curl), 가운데에 서버 프로세스, 오른쪽 디스크에 소스 파일과 jar 파일. 빌드하면 소스 파일로 jar 파일을 만들고, 켤 때만 jar 파일에서 프로세스로 클래스를 읽어 들인다. 요청은 프로세스만 거친다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    var up = s && s.proc === 'up', down = s && s.proc === 'down', stale = up && s.mem !== s.src;
    P.size(680, 262);
    P.region('cl', 10, 16, 150, 182, '클라이언트');
    P.box('req', 20, 50, 130, 112, { cls: s && s.req === 'fail' ? 'bad' : s && s.req === 'sent' ? 'wait' : s && s.req === 'got' ? 'good' : 'plain', title: 'curl', sub: !s || !s.req ? ['대기'] : s.req === 'sent' ? ['GET /hello', '답을 기다림'] : s.req === 'fail' ? ['GET /hello', '연결 거부 오류'] : ['GET /hello', '받은 답:', s.ans] });
    P.region('sv', 210, 16, 190, 182, '서버');
    P.box('proc', 220, 50, 170, 112, { cls: down ? 'ghost' : stale && s.req === 'got' ? 'bad' : up ? (s.rd ? 'hot' : 'wait') : 'ghost', title: 'java 프로세스', sub: up ? ['켜져 있음', '읽어 들인 코드:', s.mem] : down ? ['꺼져 있음'] : ['켜기 전'] });
    P.region('dk', 450, 16, 220, 182, '디스크');
    P.box('src', 460, 44, 200, 64, { cls: s && s.ed ? 'hot' : 'plain', title: 'HelloController.java', sub: [s ? s.src : '버전 1'] });
    P.box('jar', 460, 124, 200, 64, { cls: s && s.bd ? 'hot' : s && s.jar ? 'plain' : 'ghost', title: 'app.jar', sub: [s && s.jar ? s.jar : '아직 없음'] });
    if (s && s.bd) P.arrow('bd', 'src:b:0.5', 'jar:t:0.5', { cls: 'hot' });
    if (s && s.req) P.arrow('rq', 'req:r:0.3', 'proc:l:0.3', { cls: s.req === 'fail' ? 'bad' : 'hot' });
    if (s && s.req === 'got') P.arrow('rs', 'proc:l:0.75', 'req:r:0.75', { cls: stale ? 'bad' : 'good' });
    if (s && s.rd) P.arrow('rd', 'jar:l:0.5', 'proc:r:0.7', { cls: 'hot' });
    P.box('n1', 14, 214, 322, 36, { cls: s && s.starts ? 'wait' : 'ghost', title: '서버를 켠 횟수', right: (s ? s.starts : 0) + '번' });
    P.box('n2', 344, 214, 322, 36, { cls: s && s.ans ? (s.req === 'fail' ? 'bad' : s.ans === s.src ? 'good' : 'bad') : 'ghost', title: '요청에 온 응답', right: s && s.ans ? s.ans : '아직' });
  },
  assume: '실행 환경은 JDK 21.0.12.1, 스프링 부트 4.1.1(스프링 프레임워크 7.0.9, 내장 톰캣 11.0.24), curl 8.21.0, Windows 11입니다. 열두 가지 조합마다 화면의 코드를 이 실습의 code 함수에서 그대로 꺼내, 앞부분의 자바 파일 두 개를 파일로 쓰고 뒷부분의 할 일과 명령을 줄마다 실제로 했습니다. java -jar build/libs/app.jar와 curl http://localhost:8080/hello는 화면의 명령 그대로 실행했고, 서버는 기본 포트 8080에서 켜졌습니다. ./gradlew bootJar는 Gradle 플러그인을 내려받아야 해서 실행하지 않았고, 같은 일을 JDK 명령으로 했습니다. javac로 src/main/java를 컴파일하고 jar 명령으로 build/libs/app.jar를 만들었는데, bootJar가 의존 라이브러리를 jar 파일의 BOOT-INF/lib에 넣는 것과 달리 이 jar는 매니페스트의 Class-Path로 라이브러리 jar 파일을 가리켰습니다. Windows에서는 켜 둔 java 프로세스가 연 app.jar를 jar 명령이 새로 쓰지 못해(파일을 다른 프로세스가 쓰고 있다는 오류), 서버를 켜 둔 채 jar를 새로 만드는 여섯 조합에서는 새 jar를 다른 이름으로 만든 뒤 그 내용을 app.jar에 그 자리에서 덮어썼습니다. 서버를 끄는 일은 Ctrl+C가 아니라 프로세스 강제 종료로 했습니다. 요청 때마다 curl의 출력, 그때 8080 포트를 열고 있던 프로세스 번호(netstat), javap로 읽은 app.jar의 HelloController가 돌려주는 글자, 디스크의 소스 파일에 적힌 글자를 기록해 결과 표와 대조했고, jar를 새로 만든 직후 켜 둔 서버의 답, 끄기 직전 서버의 답, 켠 횟수, jar를 만든 횟수, 끈 사이에 요청한 조합에서 다시 켠 뒤의 답도 대조해 열두 조합이 모두 맞았습니다(verify/net/cmp_deploy_basic.js). 연결 거부 오류는 curl이 종료 코드 7(Failed to connect … Could not connect to server)로 알린 것입니다. 문서로 확인한 것은 스프링 부트 Gradle 플러그인 문서의 Packaging Executable Archives(bootJar 작업이 실행 가능한 jar를 만들고 클래스와 의존 라이브러리를 BOOT-INF/classes와 BOOT-INF/lib에 넣으며 그 jar를 java -jar로 실행할 수 있다는 서술), 스프링 부트 레퍼런스의 Running Your Application(실행 가능한 jar를 java -jar로 실행한다는 서술), Gradle 문서의 Java Plugin(jar 작업이 classes에, classes가 compileJava에 기댄다는 서술)과 Base Plugin(jar가 기본으로 build/libs에 생기고 이름이 프로젝트 이름과 버전으로 정해진다는 서술)입니다. 화면의 app.jar는 짧게 적은 이름입니다. 다루지 않은 것: 리눅스 서버에서 켜 둔 서버의 jar를 덮어쓸 때의 동작, Ctrl+C로 끌 때 스프링 부트가 하는 정리 작업, 파일이 바뀌면 애플리케이션을 저절로 다시 시작하는 Spring Boot DevTools는 이 실습에서 실행하지 않았습니다. 서버를 끄고 다시 켜는 틈을 없애는 방법(여러 대를 차례로 바꾸는 롤링, 새 환경을 통째로 만드는 블루-그린 등)은 "세부 동작 실습: 배포 전략"에서, 코드를 고친 뒤 빌드와 테스트를 거쳐 서버에 올리는 자동화는 "세부 동작 실습: CI/CD 파이프라인"에서, 컨테이너로 포장해 쿠버네티스가 서버를 바꾸는 방식은 "세부 동작 실습: 쿠버네티스 자가 치유"에서 다룹니다.',
});
