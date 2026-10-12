Lab.register({
  id: 'boot_basic', nav: '스프링 부트', cat: '기초개념', mode: 'step', basic: true, deep: ['autoconf'],
  title: '스프링 부트는 무엇을 대신해 주는가',
  intro: '스프링 부트 애플리케이션은 main 메서드가 있는 평범한 자바 클래스(App)입니다. main 메서드가 SpringApplication.run(App.class, args) 한 줄을 부르는 것으로 시작하고, 이 한 줄이 스프링을 시작하고(클래스를 훑어 빈을 만들고), 웹 서버(톰캣)를 프로그램 안에서 띄우고, 요청을 받을 준비를 합니다. 톰캣을 따로 설치하거나 서버를 띄우는 코드를 우리가 쓰지 않습니다. App 위의 @SpringBootApplication은 이 클래스가 있는 패키지부터 훑고 필요한 것을 알아서 설정하라는 표시이고, 무엇을 설정할지는 프로젝트에 들어 있는 라이브러리를 보고 정합니다. 웹 라이브러리가 들어 있으면 톰캣을 띄우고, 없으면 띄우지 않습니다. 이 실습은 run 줄, @SpringBootApplication, 웹 라이브러리를 하나씩 지워 가며 java 명령으로 프로그램을 실행하고, 프로그램이 계속 실행되는지, 톰캣이 뜨는지, 브라우저의 요청에 응답하는지를 봅니다.',
  terms: ['스프링 부트', '@SpringBootApplication', '스타터(Starter)', '내장 서버'],
  controls: [
    { id: 'run', label: 'main에 SpringApplication.run(App.class, args)를 적는다', type: 'check', value: true },
    { id: 'anno', label: 'App 위에 @SpringBootApplication을 적는다', type: 'check', value: true },
    { id: 'web', label: '프로젝트에 웹 라이브러리가 들어 있다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '스프링 부트 애플리케이션은 어떻게 생겼고, 실행하면 무슨 일이 일어나나', d: '세 가지가 다 있는 스프링 부트 애플리케이션. main의 한 줄이 스프링을 시작하고 톰캣을 띄워, 프로그램이 요청을 기다립니다.', v: { run: true, anno: true, web: true } },
    { t: 'SpringApplication.run 줄을 지우면', q: 'SpringApplication.run 줄을 지우면', d: 'main이 비어 있어 프로그램이 바로 끝납니다. 스프링도 톰캣도 시작되지 않습니다.', v: { run: false, anno: true, web: true } },
    { t: '@SpringBootApplication을 지우면', q: '@SpringBootApplication을 지우면', d: '웹 서버가 필요하다고 판단했지만 만들 설정이 없어 시작하다 실패합니다.', v: { run: true, anno: false, web: true } },
    { t: '웹 라이브러리를 빼면', q: '웹 라이브러리를 빼면', d: '웹 애플리케이션이 아니라고 판단해 톰캣을 띄우지 않고, 할 일을 마치면 프로그램이 끝납니다.', v: { run: true, anno: true, web: false } },
  ],
  code: function (c) {
    var out = ['// build.gradle: 이 프로젝트에 넣을 라이브러리', "implementation 'org.springframework.boot:spring-boot-starter" + (c.web ? '-webmvc' : '') + "'", ''];
    if (c.anno) out.push('// 표시: 이 패키지부터 훑고, 필요한 것을 알아서 설정한다', '@SpringBootApplication');
    out.push('public class App {', '    public static void main(String[] args) {');
    if (c.run) out.push('        // 이 한 줄이 스프링을 시작하고 서버를 띄운다', '        SpringApplication.run(App.class, args);');
    out.push('    }', '}');
    if (c.web) out.push('', '@RestController', 'public class HelloController {', '    @GetMapping("/hello")', '    public String hello() {', '        return "안녕하세요";', '    }', '}');
    return out.join('\n');
  },
  label: function (c) { return (c.run ? 'run 줄 있음' : 'run 줄 없음') + ' · ' + (c.anno ? '@SpringBootApplication 있음' : '@SpringBootApplication 없음') + ' · ' + (c.web ? '웹 라이브러리 있음' : '웹 라이브러리 없음'); },
  columns: ['프로그램', '웹 서버', 'localhost:8080/hello 요청의 응답'],
  simulate: function (c) {
    var ev = [], sum = [], kind = !c.run ? 'norun' : c.web ? (c.anno ? 'serve' : 'fail') : (c.anno ? 'plainA' : 'plainB');
    // mn: main 메서드의 상태, sp: 스프링의 상태, tm: 톰캣이 떴는가, alive: 프로세스의 상태, ask: 브라우저가 요청을 보냈는가
    var st = { mn: '', sp: '', beans: [], tm: false, disp: false, alive: '', phase: '', ask: false, resp: null, refused: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var HELLO = 'localhost:8080/hello';
    st.mn = 'run'; st.phase = 'main';
    push('컴퓨터에서 java 명령으로 App 클래스를 실행하면, 자바가 App 클래스의 main 메서드를 부릅니다. main 메서드는 자바 프로그램이 시작하는 곳입니다.', '');
    if (kind === 'norun') {
      st.mn = 'done'; st.alive = 'end'; st.phase = 'end';
      push('main 메서드의 안이 비어 있습니다. 실행할 줄이 없으므로 main 메서드가 바로 끝나고, 남은 일이 없어 java 프로세스도 끝납니다(종료 코드 0). 스프링 부트는 시작되지 않았고 서버도 만들어지지 않았습니다.' + (c.anno ? ' App 위에 @SpringBootApplication이 있어도, 그 표시를 읽을 SpringApplication.run이 불리지 않으면 아무 일도 일어나지 않습니다.' : '') + (c.web ? ' 프로젝트에 웹 라이브러리가 들어 있어도 그것을 쓰는 곳이 없습니다.' : ''), 'bad');
    } else {
      st.phase = 'run';
      push('main 메서드의 SpringApplication.run(App.class, args) 줄이 실행됩니다. 이 한 줄이 스프링 부트를 시작합니다. App.class는 프로그램의 출발점이 되는 클래스를 넘기는 것이고, args는 main이 받은 인자를 그대로 넘기는 것입니다.', '');
      if (c.web) push('스프링 부트가 프로젝트에 들어 있는 라이브러리를 살펴봅니다. 웹 요청을 처리하는 스프링 MVC가 들어 있으므로 웹 애플리케이션이라고 판단하고, 웹 서버를 쓰는 스프링을 준비합니다.', '');
      else push('스프링 부트가 프로젝트에 들어 있는 라이브러리를 살펴봅니다. 웹 요청을 처리하는 스프링 MVC가 들어 있지 않으므로 웹 애플리케이션이 아니라고 판단하고, 웹 서버를 쓰지 않는 보통의 스프링을 준비합니다. 웹 라이브러리가 없으면 @RestController와 @GetMapping도 쓸 수 없어 HelloController 클래스는 컴파일되지 않으므로, 이 설정에서는 그 클래스도 지웠습니다.', '');
      if (kind === 'serve') {
        st.sp = 'web'; st.beans = ['HelloController', 'DispatcherServlet']; st.phase = 'spring';
        push('스프링을 시작합니다. App 위에 @SpringBootApplication이 있으므로 App 클래스가 있는 패키지부터 클래스를 훑어 @RestController가 붙은 HelloController를 찾고, 그 객체를 만들어 보관합니다. 또 라이브러리에 맞춰 필요한 것을 알아서 설정하는데, 웹 라이브러리가 있으므로 요청을 받아 컨트롤러에 나눠 주는 DispatcherServlet도 이때 만들어집니다. 우리가 쓴 코드에는 new HelloController()도 new DispatcherServlet()도 없습니다.', 'good');
        st.tm = true; st.disp = true; st.phase = 'tomcat';
        push('스프링 부트가 톰캣(웹 서버)을 이 java 프로세스 안에서 띄우고, 만들어 둔 DispatcherServlet을 톰캣에 등록합니다. 톰캣을 따로 설치하지 않았고, 우리가 쓴 코드에도 서버를 띄우는 줄이 없습니다. 톰캣이 요청을 받는 포트는 정하지 않으면 8080입니다.', 'good');
        st.mn = 'done'; st.alive = 'run'; st.phase = 'wait';
        push('SpringApplication.run 줄이 끝나고 main 메서드도 끝에 닿습니다. 그런데 java 프로세스는 끝나지 않습니다. 톰캣이 만들어 둔 스레드(따로 움직이는 실행 흐름)가 살아 있는 동안 java는 프로그램을 끝내지 않고, 톰캣은 그 스레드로 요청을 기다리기 때문입니다.', 'good');
      } else if (kind === 'fail') {
        st.sp = 'fail'; st.phase = 'spring';
        push('스프링을 시작하려 합니다. 그런데 App 위에 @SpringBootApplication이 없으므로 클래스를 훑는 일도, 필요한 것을 알아서 설정하는 일도 하지 않습니다. 앞에서 웹 애플리케이션이라고 판단했는데, 웹 서버(톰캣)를 만드는 설정이 하나도 없습니다.', 'bad');
        st.mn = 'done'; st.alive = 'fail'; st.phase = 'end';
        push('스프링 부트가 시작을 포기하고 예외를 일으킵니다. 웹 서버를 만드는 설정(ServletWebServerFactory)이 없어서 "Unable to start web server"라는 예외가 나옵니다. 이 예외를 받는 코드가 없어 main 메서드가 예외로 끝나고, java 프로세스가 오류 코드(1)로 끝납니다. 톰캣은 뜨지 않았습니다.', 'bad');
      } else {
        st.sp = 'plain'; st.phase = 'spring';
        push(c.anno
          ? '스프링을 시작합니다. App 위에 @SpringBootApplication이 있으므로 App 클래스가 있는 패키지부터 클래스를 훑고 필요한 설정을 합니다. 하지만 웹 애플리케이션이 아니라서 웹 서버와 DispatcherServlet에 관한 설정은 하나도 쓰이지 않습니다.'
          : '스프링을 시작합니다. App 위에 @SpringBootApplication이 없으므로 클래스를 훑는 일도, 필요한 것을 알아서 설정하는 일도 하지 않습니다. App 클래스와 스프링 내부의 것만 들어 있는 스프링이 만들어집니다.', '');
        st.mn = 'done'; st.alive = 'end'; st.phase = 'end';
        push('SpringApplication.run 줄이 끝나고 main 메서드도 끝에 닿습니다. 요청을 기다리게 만들 톰캣이 없으므로 java 프로세스가 그대로 끝납니다(종료 코드 0). 스프링은 시작되었지만 웹 서버가 없으니 기다릴 것이 없습니다.', 'bad');
      }
    }
    // 브라우저의 요청
    st.ask = true; st.phase = 'req';
    push('브라우저 주소창에 ' + HELLO + ' 주소를 입력하면, 브라우저가 서버에 GET /hello 요청을 보냅니다.', '');
    if (kind === 'serve') {
      st.phase = 'call';
      push('톰캣이 요청을 받아 DispatcherServlet에 넘기고, DispatcherServlet이 HelloController의 hello() 메서드를 불러 줍니다. 이 메서드가 돌려준 글은 "안녕하세요"입니다.', 'good');
      st.resp = { status: '200', body: '안녕하세요' }; st.phase = 'resp';
      push('브라우저가 200 응답을 받습니다. 본문은 "안녕하세요"입니다. java 프로세스는 끝나지 않고 다음 요청을 계속 기다립니다.', 'good');
    } else {
      st.refused = true; st.phase = 'refused';
      push(HELLO + ' 주소로 오는 연결을 받는 프로그램이 없습니다. 브라우저는 응답을 받지 못하고 "연결할 수 없음"을 보입니다. 404 같은 응답 코드도 없습니다. 요청을 받을 서버 자체가 없기 때문입니다.', 'bad');
    }
    // 요약: 첫 줄은 이 설정(물음)의 답
    if (kind === 'serve') {
      sum.push('스프링 부트 애플리케이션은 main 메서드에서 SpringApplication.run(App.class, args) 한 줄을 부르는 것으로 시작합니다. 이 한 줄이 스프링을 시작하고(클래스를 훑어 빈을 만들고), 톰캣을 프로그램 안에서 띄우고, 요청을 받을 준비를 합니다. 일반 자바 프로그램과 다른 곳은 이 줄, App 위의 @SpringBootApplication, 프로젝트에 들어 있는 웹 라이브러리입니다.');
      sum.push('톰캣을 설치하거나 서버를 띄우는 코드를 쓰지 않았습니다. @SpringBootApplication은 "이 패키지부터 훑고 필요한 것을 알아서 설정하라"는 표시이고, 무엇을 설정할지는 프로젝트에 들어 있는 라이브러리를 보고 정합니다. 웹 라이브러리가 있어서 톰캣이 떴습니다.');
    } else if (kind === 'norun') {
      sum.push('SpringApplication.run 줄이 없으면 main 메서드가 비어 있어서 java 프로세스가 바로 끝납니다. 스프링 부트는 시작되지 않았고 서버도 뜨지 않아, 요청은 연결할 수 없었습니다.');
      sum.push('@SpringBootApplication과 웹 라이브러리는 스스로 아무것도 시작하지 못합니다. 스프링 부트를 시작하는 것은 main이 부르는 SpringApplication.run 한 줄이고, 표시와 라이브러리는 그 줄이 읽어서 쓰는 정보입니다.');
    } else if (kind === 'fail') {
      sum.push('@SpringBootApplication을 지우면 알아서 설정해 주는 일이 없으므로, 웹 라이브러리가 있어도 톰캣을 만드는 설정이 없습니다. 웹 서버를 시작하지 못해 "Unable to start web server" 예외로 프로그램이 실패했고, 요청은 연결할 수 없었습니다.');
      sum.push('웹 라이브러리는 있어도 그것을 설정해 쓰게 해 주는 것이 @SpringBootApplication입니다. 웹 애플리케이션이라고 판단한 뒤에 서버를 만들 설정이 없으면, 조용히 끝나지 않고 시작하다 실패합니다.');
    } else if (kind === 'plainA') {
      sum.push('웹 라이브러리를 빼면 스프링 부트는 웹 애플리케이션이 아니라고 판단하고 톰캣을 띄우지 않습니다. 스프링은 시작되지만 기다릴 서버가 없어 프로그램이 할 일을 마치고 바로 끝났고, 요청은 연결할 수 없었습니다.');
      sum.push('스프링 부트가 무엇을 설정할지는 프로젝트에 들어 있는 라이브러리를 보고 정합니다. 같은 main 메서드와 @SpringBootApplication이라도 웹 라이브러리가 있으면 톰캣이 뜨고, 없으면 뜨지 않습니다.');
    } else {
      sum.push('웹 라이브러리를 빼고 @SpringBootApplication도 지우면, 스프링 부트는 웹 애플리케이션이 아니라고 판단하고 아무것도 알아서 설정하지 않습니다. 스프링은 시작되지만 기다릴 서버가 없어 프로그램이 바로 끝났고, 요청은 연결할 수 없었습니다.');
      sum.push('이 경우에는 웹 서버가 필요하다고 판단하지 않았으므로 오류 없이 끝났습니다. @SpringBootApplication만 지우고 웹 라이브러리가 있을 때는 서버를 만들 설정이 없다며 실패했던 것과 다릅니다.');
    }
    var prog = st.alive === 'run' ? '계속 실행하며 요청을 기다림' : st.alive === 'fail' ? '시작하다 실패함' : '할 일이 없어 바로 끝남';
    return { events: ev, summary: sum, kind: kind, row: [prog, st.tm ? '톰캣이 뜸' : '뜨지 않음', st.resp ? st.resp.status + ' ' + st.resp.body : '연결할 수 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 java가 main 메서드를 실행하는 것부터 시작합니다.'); return; }
    var spTxt = { '': '시작 전', web: '시작함 (웹 애플리케이션)', plain: '시작함 (웹 애플리케이션이 아님)', fail: '시작하지 못함' }[s.sp];
    var mnTxt = { '': '실행 전', run: '실행 중', done: '끝남' }[s.mn];
    var pTxt = { '': '시작 전', run: '계속 실행 중, 요청을 기다림', end: '끝남 (종료 코드 0)', fail: '오류로 끝남 (종료 코드 1)' }[s.alive];
    H.table(v, ['부분', '상태'], [
      { cls: '', cells: ['main 메서드', mnTxt] },
      { cls: s.sp ? '' : 'gone', cells: ['스프링', { v: spTxt, cls: s.sp === 'fail' ? 'bad' : s.sp ? 'good' : '' }] },
      { cls: s.tm ? '' : 'gone', cells: ['톰캣', { v: s.tm ? '떠 있음' : '뜨지 않음', cls: s.tm ? 'good' : '' }] },
      { cls: '', cells: ['java 프로세스', { v: pTxt, cls: s.alive === 'run' ? 'good' : s.alive ? 'bad' : '' }] },
    ], 'java 프로세스 안');
    if (s.ask) H.table(v, ['요청', '응답'], [{ cls: '', cells: ['GET /hello', s.resp ? { v: s.resp.status + ' ' + s.resp.body, cls: 'good' } : s.refused ? { v: '연결할 수 없음', cls: 'bad' } : '기다리는 중'] }], 'localhost:8080 요청');
  },
  // 그림: 왼쪽에 브라우저, 오른쪽에 java 프로세스 영역. 영역 위쪽에 main 메서드, 아래쪽에 톰캣(왼쪽)과 스프링(오른쪽) 상자. 스프링 부트가 스프링과 톰캣을 만들어 가는지, 지운 것에 따라 어느 상자가 생기지 않는지, 요청이 톰캣과 DispatcherServlet을 거쳐 컨트롤러에 닿는지를 화살표로 보인다. 맨 아래에 결과 칸 둘.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 292);
    var alive = s ? s.alive : '';
    var asked = s && s.ask;
    P.box('br', 14, 120, 108, 52, { cls: asked && !s.resp && !s.refused ? 'wait' : 'plain', title: '브라우저', sub: !asked ? '대기' : s.resp ? s.resp.status + ' 응답' : s.refused ? '연결할 수 없음' : 'GET /hello' });
    P.region('jp', 164, 16, 502, 208, 'java 프로세스' + (alive === 'end' ? ': 끝남' : alive === 'fail' ? ': 오류로 끝남' : alive === 'run' ? ': 실행 중' : ''));
    var mnSub = !s || !s.mn ? '아직 실행 전' : s.mn === 'run' ? (ph === 'run' || ph === 'spring' ? 'SpringApplication.run 실행 중' : 'main 실행 중') : '끝남';
    P.box('mn', 174, 44, 482, 46, { cls: s && s.mn === 'run' ? 'hot now' : s && s.mn === 'done' ? 'plain' : 'ghost', title: 'App의 main 메서드', sub: mnSub });
    P.box('tm', 174, 118, 210, 92, { cls: s && s.tm ? (ph === 'tomcat' || ph === 'req' || ph === 'call' ? 'good now' : 'good') : 'ghost', title: '톰캣(웹 서버)', sub: s && s.tm ? ['DispatcherServlet 등록됨', '요청을 기다림'] : [s && s.sp ? '뜨지 않음' : ' '] });
    var spSub = !s || !s.sp ? [' '] : s.sp === 'web' ? s.beans.map(function (b) { return b + ' 객체'; }) : s.sp === 'plain' ? ['시작함', '웹용이 아님'] : ['시작하지 못함'];
    P.box('sp', 440, 118, 216, 92, { cls: s && s.sp === 'fail' ? 'bad' : s && s.sp ? (ph === 'spring' || ph === 'call' ? 'good now' : 'good') : 'ghost', title: '스프링(빈 보관)', sub: spSub });
    if (s && ph === 'run') P.arrow('ru', 'mn:b:0.8', 'sp:t:0.5', { cls: 'hot' });
    if (s && ph === 'tomcat') P.arrow('tc', 'sp:l:0.35', 'tm:r:0.35', { cls: 'hot' });
    if (s && ph === 'req') P.arrow('rq', 'br:r:0.3', 'tm:l:0.2', {});
    if (s && ph === 'call') { P.arrow('rq', 'br:r:0.3', 'tm:l:0.2', {}); P.arrow('cl', 'tm:r:0.7', 'sp:l:0.7', { cls: 'hot' }); }
    if (s && ph === 'resp') P.arrow('rs', 'tm:l:0.7', 'br:r:0.8', { cls: 'good' });
    if (s && ph === 'refused') P.arrow('rq', 'br:r:0.3', 'tm:l:0.2', { cls: 'bad' });
    var prog = alive === 'run' ? '계속 실행하며 요청을 기다림' : alive === 'fail' ? '시작하다 실패함' : alive === 'end' ? '할 일이 없어 바로 끝남' : '아직 없음';
    P.box('n1', 14, 242, 322, 36, { cls: alive === 'run' ? 'good' : alive ? 'bad' : 'ghost', title: '프로그램', right: prog });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.tm ? 'good' : alive ? 'bad' : 'ghost', title: '웹 서버', right: s && s.tm ? '톰캣이 뜸' : alive ? '뜨지 않음' : '아직 없음' });
  },
  assume: '스프링 부트 4.1.1(스프링 프레임워크 7.0.9, 내장 톰캣 11.0.24)을 JDK 21.0.12.1에서 실행한 결과입니다. 여덟 가지 조합을 모두, 화면의 코드와 같은 구조의 소스(패키지 app의 App과 HelloController, 서버를 띄우거나 세는 줄은 없음)를 컴파일하고 java 명령으로 app.App의 main 메서드부터 새 프로세스로 실행한 뒤, 프로세스 밖에서 관찰해 대조했습니다. 판단 기준은 이렇습니다. 프로그램은 프로세스가 끝나거나 대기 포트가 열릴 때까지 기다린 뒤 3초가 더 지나도 살아 있으면 "계속 실행하며 요청을 기다림", 이미 끝났고 종료 코드가 0이면 "할 일이 없어 바로 끝남", 0이 아니면 "시작하다 실패함"입니다. 웹 서버는 그 프로세스가 연 TCP 대기 포트(netstat)가 있고 로그에 "Tomcat started on port"가 같은 포트로 찍혔는지로, 응답은 프로세스 밖에서 그 포트로 GET /hello를 보낸 실제 HTTP 결과로 정했습니다. 서버가 없는 조합에서도 미리 비어 있는 것을 확인한 임의의 포트를 server.port로 주고 그 포트로 요청을 보냈으며, 모두 연결이 거부되었습니다(포트를 0으로 주면 서버가 없을 때 연결할 곳이 없어서 이렇게 했습니다). 주소의 localhost:8080은 내 컴퓨터에서 스프링 부트를 기본 포트로 띄웠을 때의 예이며, 기본 포트가 8080이라는 것은 스프링 부트 문서의 Embedded Servlet Container Support 절을 따랐습니다. 클래스패스는 라이브러리 폴더 전체가 아니라, 화면의 의존성 한 줄이 들여오는 jar만 줬습니다. 웹 라이브러리가 있으면 spring-boot-starter-webmvc가 들여오는 39개를, 없으면 spring-boot-starter가 들여오는 21개를 썼고, 빼는 18개는 spring-boot-starter-webmvc, spring-boot-starter-jackson, spring-boot-starter-tomcat, spring-boot-starter-tomcat-runtime, spring-boot-tomcat, spring-boot-web-server, spring-boot-http-converter, spring-boot-webmvc, spring-boot-servlet, spring-boot-jackson, spring-web, spring-webmvc, tomcat-embed-core, tomcat-embed-el, tomcat-embed-websocket, jackson-databind, jackson-core, jackson-annotations입니다. 이 목록은 Gradle을 돌려 얻은 것이 아니라 Maven Central의 pom을 열어 의존 관계를 따라가 정한 것이고(스타터와 스프링 부트 모듈, spring-web, spring-webmvc, 톰캣, jackson-databind의 pom은 확인했고 jackson-core와 jackson-annotations는 열지 않았습니다), 스프링 시큐리티·JPA 같은 다른 라이브러리는 두 경우 모두 클래스패스에 없습니다. 스프링 부트 4에서 웹 스타터의 이름은 spring-boot-starter-webmvc이며(문서 Build Systems의 Starters 표에서 spring-boot-starter-web은 이것으로 대체된 것으로 표시됨), 웹 스타터가 들여오는 jar가 정확히 이 목록과 같다고는 Gradle 해석 결과로 확인하지 못했습니다. 웹 라이브러리를 뺀 조합에서는 HelloController가 컴파일되지 않아(org.springframework.web.bind.annotation 패키지가 없다는 오류를 실제로 확인) 그 클래스도 함께 지웠습니다. 대조한 것은 결과 표의 세 항목과, 단계 문장이 기대는 사실입니다. 웹 라이브러리가 있으면 SpringApplication이 웹 애플리케이션(서블릿)으로, 없으면 아님으로 판단한다는 것, 톰캣에 등록된 서블릿이 DispatcherServlet 하나이고 "/"를 맡는다는 것, HelloController와 DispatcherServlet이 스프링의 빈이라는 것, 우리 소스에 톰캣이나 서버를 띄우는 글이 없다는 것, 서버가 뜬 뒤 main 스레드는 끝났는데 톰캣의 스레드(container-0 등)가 남아 프로세스가 살아 있다는 것, 두 가지 실패 방식(run 줄이 없으면 스프링이 시작되지 않고 바로 끝나며, @SpringBootApplication이 없고 웹 라이브러리가 있으면 웹 서버를 만드는 ServletWebServerFactory 빈이 없다는 예외로 종료 코드 1로 실패함)도 실행으로 확인했습니다. 문서가 정한 것은 스프링 부트 문서 Using the @SpringBootApplication Annotation 절(@EnableAutoConfiguration, @ComponentScan, @SpringBootConfiguration을 합친 것), Auto-configuration 절(클래스패스의 jar를 보고 설정), SpringApplication의 Web Environment 절(스프링 MVC가 있으면 서블릿 웹 컨텍스트를 쓴다는 판단 규칙), Embedded Servlet Container Support 절(톰캣과 제티를 지원하고 기본 포트가 8080)입니다. 화면의 "클래스를 훑어 빈을 만든다"와 "톰캣을 띄우고 DispatcherServlet을 등록한다"를 두 단계로 나눈 것은 단순화입니다. 실제 로그에서는 스프링이 시작되는 도중에 톰캣이 만들어지고(Tomcat initialized), "Started App" 로그보다 먼저 톰캣이 연결을 받기 시작하며(Tomcat started), DispatcherServlet이 실제로 초기화되는 것은 첫 요청이 올 때였습니다. @SpringBootApplication이 없을 때 클래스를 훑지 않는다는 것은 문서가 정한 것이고, 빈 정의의 수가 @SpringBootApplication이 있을 때 더 많다는 것(웹 라이브러리가 없는 조합에서 7개와 50개)은 이 버전에서 관찰한 값입니다. 문서가 정한 것과 달리 "웹 서버가 필요한데 설정이 없으면 조용히 끝나지 않고 실패한다", "웹 라이브러리가 없으면 오류 없이 끝난다"는 이 버전에서 관찰한 동작입니다. 화면의 코드는 package와 import 줄을 줄였고, App과 HelloController가 같은 패키지에 있다고 가정했으며, build.gradle의 줄은 Gradle로 실행한 것이 아니라 그 줄이 뜻하는 jar를 클래스패스에 준 것입니다. Maven과 war 배포, 톰캣 대신 제티를 쓰는 경우, 포트나 웹 애플리케이션 종류를 설정으로 바꾸는 경우는 다루지 않았습니다. 무엇을 자동으로 설정하는지의 세부는 "세부 동작 실습: 스프링 부트 자동 설정"에서 다룹니다.',
});
