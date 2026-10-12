// 기초개념 "스프링 부트" 실습의 모형 결과를 실제 스프링 부트 실행 결과(boot_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 코드(Probe가 컴파일해 실행한 소스와 같은 글인지), 단계 문장이 기대는 사실을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('boot_basic');
const lines = fs.readFileSync(path.join(__dirname, 'boot_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
const head = lines.filter(l => l.startsWith('# ')), body = lines.filter(l => !l.startsWith('# '));
console.log(head[0]);
// Probe가 쓴 소스에서 package, import 줄을 빼고 앞뒤 빈 줄을 정리한다
const strip = src => src.replace(/\\n/g, '\n').split('\n').filter(l => !/^(package|import) /.test(l)).join('\n').trim();
let ok = 0, extraOk = 0, extraAll = 0;
// 머리글의 사실
const baseN = +/web=false의 클래스패스\((\d+)개\)/.exec(head[1])[1], webN = +/web=true의 클래스패스\((\d+)개\)/.exec(head[2])[1];
const removed = head.find(l => l.startsWith('# removed: ')).slice(11).split(', ');
const compileLine = head.find(l => l.startsWith('# HelloController를 web=false'));
const headChecks = {
  '웹 라이브러리를 빼면 클래스패스에서 빠지는 jar 수는 뺀 목록의 개수와 같다': removed.length === webN - baseN,
  '뺀 목록에 톰캣(tomcat-embed-core)과 스프링 MVC(spring-webmvc, spring-web)가 들어 있다': removed.some(j => /^tomcat-embed-core/.test(j)) && removed.some(j => /^spring-webmvc/.test(j)) && removed.some(j => /^spring-web-/.test(j)),
  '웹 라이브러리 없이는 HelloController가 컴파일되지 않는다(@RestController의 패키지가 없음)': /rc=1/.test(compileLine) && /org\.springframework\.web\.bind\.annotation does not exist/.test(compileLine),
};
for (const [name, pass] of Object.entries(headChecks)) { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + name); }
console.log('web=false에서 뺀 jar(' + removed.length + '개): ' + removed.join(', '));
for (const ln of body) {
  const i0 = ln.indexOf(' => '), k = ln.slice(0, i0), v = ln.slice(i0 + 4), [run, anno, web] = k.split('|').map(x => x === 'true'), f = {};
  if (v.startsWith('COMPILE_ERROR')) { console.log('컴파일 오류: ' + k + ' ' + v); continue; }
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const c = { run, anno, web };
  const sim = lesson.simulate(c);
  // 실제 값: 프로그램은 3초 뒤에도 살아 있는가와 종료 코드, 웹 서버는 자식이 연 대기 포트와 로그, 응답은 밖에서 보낸 HTTP
  const prog = f.alive3 === 'true' ? '계속 실행하며 요청을 기다림' : f.exit === '0' ? '할 일이 없어 바로 끝남' : '시작하다 실패함';
  const server = f.tomcatLog !== '-' && f.ports === '[' + f.chosen + ']' && f.tomcatLog === f.chosen ? '톰캣이 뜸' : '뜨지 않음';
  const resp = f.http.startsWith('200 ') ? f.http : f.http.startsWith('연결할 수 없음') ? '연결할 수 없음' : f.http;
  const real = [prog, server, resp];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  // 화면의 코드 = 의존성 한 줄 + Probe가 실행한 소스
  const want = lesson.code.call(lesson, c);
  const got = ['// build.gradle: 이 프로젝트에 넣을 라이브러리', "implementation 'org.springframework.boot:" + f.dep + "'", '', strip(f.app)].concat(f.ctl ? ['', strip(f.ctl)] : []).join('\n');
  if (want !== got) { good = false; console.log('화면의 코드가 Probe가 실행한 소스와 다름: ' + k + '\n--- 화면\n' + want + '\n--- 실행\n' + got); }
  if (good) ok++;
  // 단계 문장이 기대는 사실들
  const ins = {}; f.inspect.split('¦').forEach(p => { const j = p.indexOf('='); ins[p.slice(0, j)] = p.slice(j + 1); });
  const running = f.alive3 === 'true', kind = sim.kind;
  const checks = {
    '우리가 쓴 소스에 톰캣이나 서버를 띄우는 코드(Tomcat, ServerSocket, WebServer 등)가 없다': f.srcServer === 'false',
    '웹 라이브러리가 있으면 웹 애플리케이션(SERVLET)으로, 없으면 아님(NONE)으로 판단한다': ins.wat === (web ? 'SERVLET' : 'NONE'),
    'run 줄이 없으면 스프링이 시작되지 않고(로그에 Started App 없음) 종료 코드 0으로 바로 끝난다': run || (f.started === 'false' && f.exit === '0' && f.exitedEarly === 'true'),
    'run 줄이 없으면 @SpringBootApplication과 웹 라이브러리가 있어도 톰캣이 뜨지 않는다': run || (f.tomcatLog === '-' && f.ports === '[]'),
    '서버가 뜬 조합에서는 main 스레드가 끝났는데(main 없음, DestroyJavaVM 있음) 프로세스가 살아 있다': !running || (f.mainEnded === 'true' && f.alive3 === 'true'),
    '서버가 뜬 조합에서 프로세스를 붙잡고 있는 스레드는 톰캣의 것이다(daemon이 아닌 스레드에 container-0이 있다)': !running || /nonDaemon=[^,]*container-0/.test(f.threads),
    '서버가 뜬 조합에서 로그의 Tomcat started on port가 대기 포트이고, 그 포트로 보낸 요청이 200 안녕하세요다': !running || (f.tomcatLog === f.chosen && f.ports === '[' + f.chosen + ']' && f.http === '200 안녕하세요'),
    '서버가 뜬 조합에서 요청을 보낸 뒤에도 프로세스가 살아 있다': !running || f.aliveAfterRequest === 'true',
    '서버가 뜬 조합에서 스프링 컨텍스트는 웹 서버용이고 HelloController와 DispatcherServlet이 빈으로 있다': !running || (/ServletWebServer/.test(ins.ctx) && ins.helloBean === 'true' && ins.dispatcherBean === 'true'),
    '서버가 뜬 조합에서 톰캣에 서블릿으로 등록된 것은 DispatcherServlet이고 "/"를 맡는다': !running || /^dispatcherServlet:org\.springframework\.web\.servlet\.DispatcherServlet:\[\/\]$/.test(ins.servlets),
    '서버가 뜬 조합의 로그 순서: 톰캣이 만들어지고, 연결을 받기 시작하고, 스프링이 다 시작한 뒤, 첫 요청에서 DispatcherServlet이 초기화된다': !running || f.logOrder === 'tomcatInit>rootCtx>tomcatStarted>appStarted>dispatcherInit',
    '@SpringBootApplication이 없고 웹 라이브러리가 있으면 시작하다 실패한다(종료 코드 1, 웹 서버 팩토리 빈이 없다는 예외)': kind !== 'fail' || (f.exit === '1' && /Unable to start web server/.test(ins.fail.replace(/_/g, ' ')) && /MissingWebServerFactoryBeanException/.test(ins.root) && /ServletWebServerFactory/.test(f.fail)),
    '시작하다 실패한 조합에서 톰캣이 뜨지 않고 로그에 Started App이 없다': kind !== 'fail' || (f.tomcatLog === '-' && f.started === 'false'),
    '웹 라이브러리가 없으면 스프링은 시작되고(Started App) 웹 서버나 DispatcherServlet 없이 종료 코드 0으로 바로 끝난다': !run || web || (f.started === 'true' && f.exit === '0' && f.tomcatLog === '-' && ins.dispatcherBean === 'false' && ins.webServerCtx === 'false'),
    '웹 라이브러리가 없으면 스프링 컨텍스트는 웹 서버용이 아닌 보통의 컨텍스트이다': !run || web || ins.ctx === 'AnnotationConfigApplicationContext',
    '실패하거나 끝난 조합은 요청에 연결이 거부된다(ConnectException)': running || /ConnectException/.test(f.http),
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + k + ' / ' + name); }
}
// @SpringBootApplication이 있고 없고에 따른 빈 정의 수(web=false, run=true)
const bd = a => { const l = body.find(x => x.startsWith('true|' + a + '|false =>')); const m = /beanDefs=(\d+)/.exec(l); return m ? +m[1] : -1; };
extraAll++; if (bd(true) > bd(false) && bd(false) > 0) extraOk++; else console.log('사실 불일치: web=false에서 @SpringBootApplication이 있을 때 빈 정의 수(' + bd(true) + ')가 없을 때(' + bd(false) + ')보다 많아야 한다');
console.log('일치 ' + ok + ' / ' + body.length);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);
