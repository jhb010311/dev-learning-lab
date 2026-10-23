Lab.register({
  id: 'lb_basic', nav: '로드 밸런서', cat: '기초개념', mode: 'step', basic: true, deep: ['scale', 'deploy', 'k8s'],
  title: '서버를 여러 대 두면 요청은 어느 서버로 가는가',
  why: '서버가 한 대뿐이면 요청이 늘어도 그 한 대가 모두 받아야 하고, 그 서버가 꺼지면 서비스 전체가 멈춘다. 서버를 여러 대 띄우는 것만으로는 어느 요청을 어느 서버가 받을지, 꺼진 서버를 어떻게 피할지가 정해지지 않는다. 로드 밸런서는 요청이 들어오는 입구를 하나로 두고 살아 있는 서버들에 나눠 보내서, 서버를 늘리거나 한 대가 꺼져도 클라이언트가 같은 주소로 계속 쓰게 한다.',
  use: '사용자가 많은 웹 서비스는 같은 스프링 부트 서버를 여러 대 띄우고 그 앞에 로드 밸런서를 둔다. 가장 흔한 것은 nginx이고, nginx 설정의 upstream 블록에 서버 주소들을 적고 proxy_pass로 그 묶음에 넘기면 된다. 클라우드 회사가 주는 로드 밸런서도 같은 일을 하고, 새 버전으로 바꿀 때 서버를 한 대씩 빼고 넣는 데도 쓴다. 로그인 상태처럼 요청 사이에 이어져야 하는 값은 서버 한 대의 메모리에만 두지 않고, 흔히 Redis나 DB처럼 여러 서버가 함께 보는 곳에 둔다.',
  intro: '서버 한 대가 감당하지 못할 만큼 요청이 많으면 같은 서버 프로그램을 여러 대 띄웁니다. 그런데 클라이언트(요청을 보내는 쪽)가 서버 주소를 여러 개 알아야 한다면 불편합니다. 그래서 클라이언트는 주소 하나로만 접속하고, 그 주소에서 요청을 받는 로드 밸런서가 요청을 서버들에 나눠 보냅니다. 이 실습은 서버 한 대에 직접 접속하는 구성과, 서버 두 대 앞에 로드 밸런서를 두는 구성을 견줍니다. 로드 밸런서로는 가장 흔히 쓰는 nginx를 둡니다. 코드 칸에는 세 가지가 있습니다. nginx 설정(upstream 블록에 서버 A, 서버 B의 주소를 적고 proxy_pass로 그 묶음에 넘긴다), 서버를 켜는 명령(같은 app.jar를 포트만 바꿔 두 번 켠다), 그리고 각 서버의 스프링 부트 컨트롤러입니다. #으로 시작하는 줄은 설명입니다. 컨트롤러는 자기가 받은 요청 수를 자기 메모리에 세어 "나는 A, 받은 요청 1번째"처럼 답합니다. 로드 밸런서를 빼 보고, 요청 3번 뒤에 서버 A를 꺼 보면서 클라이언트가 받는 답이 어떻게 달라지는지 봅니다.',
  terms: ['로드밸런서', 'nginx upstream과 proxy_pass', '라운드 로빈', '실패한 서버 건너뛰기', '스프링 부트 실행 인자(--server.port)', '연결 거부 오류'],
  controls: [
    { id: 'servers', label: '서버 구성', type: 'select', value: 'lb', options: [['lb', '서버 A, 서버 B 두 대와 그 앞의 nginx'], ['one', '서버 A 한 대만 (nginx 없이 직접 접속)']] },
    { id: 'down', label: '요청 3번을 보낸 뒤 서버 A를 끈다', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'nginx를 로드 밸런서로 서버 A와 서버 B 앞에 두는 설정은 어떻게 생겼고, 요청 6번은 어디로 가나', d: 'upstream에 서버 두 대를 적고 proxy_pass로 넘깁니다. 요청이 A와 B에 번갈아 갑니다.', v: { servers: 'lb', down: false } },
    { t: '서버 A를 끄면', q: '요청 3번을 보낸 뒤 서버 A를 끄면 nginx는 요청을 어디로 보내나', d: 'nginx가 연결이 거부된 서버 A를 건너뛰어, 클라이언트는 실패 없이 답을 받습니다.', v: { servers: 'lb', down: true } },
    { t: '로드 밸런서 없이 서버 한 대만 두면', q: 'nginx를 빼고 서버 A 한 대에 직접 접속하면', d: '서버가 한 대뿐이라 모든 요청을 그 서버가 받습니다.', v: { servers: 'one', down: false } },
    { t: '서버 한 대뿐인데 그 서버를 끄면', q: '서버 A 한 대뿐인데 요청 3번을 보낸 뒤 서버 A를 끄면', d: '받아 줄 서버가 없어 그 뒤의 요청이 모두 실패합니다.', v: { servers: 'one', down: true } },
  ],
  // 화면의 코드는 대조 프로그램(verify/net/lb_basic_probe_boot.js)이 그대로 읽어 쓴다:
  // 자바 부분은 그대로 컴파일해 스프링 부트로 띄우고, java -jar 줄의 인자로 서버를 켜고, nginx 설정의 upstream·listen·proxy_pass를 읽어 nginx 역할 모형에 준다.
  code: function (c) {
    var o = [], lb = c.servers === 'lb';
    if (lb) {
      o.push('# nginx 설정 (nginx.conf의 http { } 블록에 둔다. 8080 포트로 받아 서버 A, 서버 B에 나눠 보낸다)',
        'upstream app {',
        '    server 127.0.0.1:8081;    # 서버 A',
        '    server 127.0.0.1:8082;    # 서버 B');
      if (c.down) o.push('    # 적지 않았지만 서버마다 max_fails=1 fail_timeout=10s가 기본값이다');
      o.push('}',
        '',
        'server {',
        '    listen 8080;',
        '',
        '    location / {',
        '        proxy_pass http://app;    # upstream app의 서버들에 나눠 넘긴다');
      if (c.down) o.push('        # 적지 않았지만 proxy_next_upstream error timeout;이 기본값이다');
      o.push('    }',
        '}',
        '',
        '# 서버 A, 서버 B 켜기: 같은 app.jar를 포트와 이름만 바꿔 두 번 켠다',
        '# --server.port는 스프링 부트가 정해 둔 설정(서버가 열 포트), --app.name은 예시로 정한 설정(서버 이름)',
        'java -jar app.jar --server.port=8081 --app.name=A',
        'java -jar app.jar --server.port=8082 --app.name=B');
    } else {
      o.push('# nginx 없음: 서버 A 한 대가 8080 포트로 직접 받는다',
        '# --server.port는 스프링 부트가 정해 둔 설정(서버가 열 포트), --app.name은 예시로 정한 설정(서버 이름)',
        'java -jar app.jar --server.port=8080 --app.name=A');
    }
    o.push('',
      '# 클라이언트: curl http://localhost:8080/ 요청을 6번 보낸다');
    if (c.down) o.push('# 요청 3번 뒤 서버 A를 끈다 (서버 A를 켠 창에서 Ctrl+C)');
    o.push('',
      '// HelloController.java  (HelloController는 예시로 만든 컨트롤러다. @RestController·@GetMapping·@Value는 스프링이,',
      '// AtomicInteger는 자바가 준다. @SpringBootApplication을 붙인 시작 클래스는 생략)',
      'import java.util.concurrent.atomic.AtomicInteger;',
      'import org.springframework.beans.factory.annotation.Value;',
      'import org.springframework.web.bind.annotation.GetMapping;',
      'import org.springframework.web.bind.annotation.RestController;',
      '',
      '@RestController',
      'public class HelloController {',
      '    @Value("${app.name}")',
      '    private String name;                                       // 켤 때 준 --app.name 값 (A 또는 B)',
      '',
      '    private final AtomicInteger count = new AtomicInteger();  // 이 서버가 받은 요청 수 (이 서버의 메모리에만 있다)',
      '',
      '    @GetMapping("/")',
      '    public String hello() {',
      '        return "나는 " + name + ", 받은 요청 " + count.incrementAndGet() + "번째";',
      '    }',
      '}');
    return o.join('\n');
  },
  label: function (c) { return (c.servers === 'lb' ? '서버 2대와 nginx' : '서버 1대, 직접 접속') + ' · ' + (c.down ? '요청 3번 뒤 서버 A 끔' : '서버 A 계속 켜 둠'); },
  columns: ['A가 답한 수', 'B가 답한 수', '실패한 요청'],
  simulate: function (c) {
    var lb = c.servers === 'lb', down = !!c.down, N = 6, K = 3;
    var ev = [], sum = [], trace = [];
    var st = { n: 0, aUp: true, cntA: 0, cntB: 0, ansA: 0, ansB: 0, fail: 0, to: '', ref: '', say: '', err: false, phase: 'up', rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // nginx 문서의 동작: 같은 가중치의 라운드 로빈(A, B, A, B...), 연결 오류면 다음 서버로(proxy_next_upstream error),
    // max_fails=1번 실패한 서버는 fail_timeout=10초 동안 쓰지 않는다(요청 6번은 10초 안에 끝난다)
    var up = { A: true, B: true }, marked = {}, rr = 0;
    // 1단계: 서버가 뜬다
    push(lb ? '서버가 뜹니다. 같은 app.jar를 java -jar로 두 번 켜서, 같은 스프링 부트 프로그램이 서버 A(8081 포트, --app.name=A)와 서버 B(8082 포트, --app.name=B)로 따로 뜹니다. 두 서버의 HelloController는 각자 받은 요청 수를 자기 count 필드에 셉니다. 그 앞에 nginx가 listen 8080 줄대로 8080 포트에서 요청을 기다립니다. 클라이언트는 서버가 몇 대인지 모르고 localhost:8080 주소 하나만 압니다. 이 주소에서 요청을 받는 것은 nginx입니다.'
      : '서버가 뜹니다. 서버 A 한 대가 --server.port=8080 인자대로 8080 포트에서 요청을 기다립니다. 서버 A의 HelloController는 받은 요청 수를 count 필드에 셉니다. 앞에 nginx가 없어서, 클라이언트는 localhost:8080 주소로 이 서버에 직접 접속합니다.', '');
    for (var i = 1; i <= N; i++) {
      if (down && i === K + 1) {
        up.A = false; st.aUp = false; st.phase = 'kill'; st.to = ''; st.ref = '';
        push(lb ? '요청 ' + K + '번을 보낸 뒤 서버 A를 끕니다(코드 칸의 Ctrl+C 줄). 서버 A는 더 이상 연결을 받지 않습니다. 서버 B는 그대로 켜져 있습니다. 이 설정에는 서버 상태를 미리 확인하는 장치가 없어서, nginx는 서버 A에 연결해 보기 전까지 서버 A가 꺼진 것을 모릅니다.'
          : '요청 ' + K + '번을 보낸 뒤 서버 A를 끕니다(코드 칸의 Ctrl+C 줄). 서버는 서버 A 한 대뿐입니다.', 'bad');
      }
      st.n = i; st.to = ''; st.ref = ''; st.say = ''; st.err = false;
      var ans = null, refused = [], skipped = [], turn = '';
      if (lb) {
        var order = (rr++ % 2 === 0) ? ['A', 'B'] : ['B', 'A']; turn = order[0];
        for (var j = 0; j < order.length; j++) {
          var nm = order[j];
          if (marked[nm]) { skipped.push(nm); continue; }
          if (!up[nm]) { refused.push(nm); marked[nm] = true; continue; }
          ans = nm; break;
        }
      } else if (up.A) ans = 'A';
      // 첫 요청은 "보냄"과 "답함"을 두 단계로 나눠 보이므로, 그때는 답하는 단계에서 센다
      var answer = function () {
        if (ans) { if (ans === 'A') { st.cntA++; st.ansA++; } else { st.cntB++; st.ansB++; } st.say = '나는 ' + ans + ', 받은 요청 ' + (ans === 'A' ? st.cntA : st.cntB) + '번째'; }
        else { st.fail++; st.err = true; }
        var rowWhere = lb ? 'nginx → ' + (refused.length ? '서버 ' + refused.join(', ') + ' 연결 거부 → ' : '') + (skipped.length ? '서버 ' + skipped.join(', ') + ' 건너뜀 → ' : '') + '서버 ' + ans : '서버 A (직접)';
        st.rows.push([i + '번째 요청', rowWhere, ans ? st.say : '연결 거부 오류']);
        trace.push(ans ? ans + '#' + (ans === 'A' ? st.cntA : st.cntB) + (refused.length ? '<' + refused.join(',') + '거부>' : '') : '오류ECONNREFUSED');
      };
      if (!(lb && i === 1)) answer();
      var hd = '클라이언트가 GET / 요청을 보냅니다(' + i + '번째). ';
      if (lb) {
        st.to = ans; st.ref = refused.length ? refused[0] : '';
        if (i === 1) {
          st.phase = 'sent'; st.to = turn; st.say = ''; var keepSay = '나는 ' + ans + ', 받은 요청 1번째';
          push(hd + '8080 포트에서 이 요청을 받는 것은 스프링 부트 서버가 아니라 nginx입니다. location / 의 proxy_pass http://app; 줄에 따라 nginx는 upstream app에 적힌 서버 가운데 하나에 요청을 넘깁니다. 나누는 방식을 따로 적지 않았으므로 기본 방식인 라운드 로빈(차례대로 돌아가며 한 대씩)을 쓰고, 첫 요청은 목록의 첫 서버인 서버 ' + turn + '(8081 포트)로 갑니다.', '');
          answer(); st.phase = 'answer'; st.say = keepSay; st.to = ans;
          push('서버 ' + ans + '의 hello() 메서드가 count를 1 올리고 "' + keepSay + '"를 돌려줍니다. nginx가 이 답을 그대로 클라이언트에 돌려줍니다. 클라이언트가 받은 글에는 어느 서버가 답했는지가 적혀 있습니다.', 'good');
        } else if (refused.length) {
          st.phase = 'req';
          push(hd + '라운드 로빈 차례로는 서버 ' + turn + '여서 nginx가 서버 ' + turn + '(8081 포트)에 연결하려고 하지만, 서버 ' + turn + '를 끈 뒤라 연결이 거부됩니다(연결 거부 오류). proxy_next_upstream의 기본값 error에 따라 nginx는 같은 요청을 다음 서버인 서버 ' + ans + '에 넘깁니다. 또 max_fails의 기본값이 1이라 이 한 번의 실패로 서버 ' + turn + '를 fail_timeout(기본 10초) 동안 쓰지 않는 서버로 둡니다. 서버 ' + ans + '가 count를 1 올리고 "' + st.say + '"를 돌려주고, nginx가 이 답을 돌려줍니다. 클라이언트는 거부된 일을 모르고 정상 답을 받습니다.', 'good');
        } else {
          st.phase = 'req';
          var extra = '';
          if (i === 2) extra = ' 서버 A가 이미 1번 답했지만 서버 B의 수는 "1번째"부터 시작합니다. count는 서버마다 자기 메모리에 따로 있기 때문입니다.';
          if (skipped.length) extra = ' 라운드 로빈 차례로는 서버 ' + skipped[0] + '지만, 앞에서 연결이 거부돼 10초 동안 쓰지 않는 서버라 연결해 보지도 않고 건너뜁니다.';
          var outs = Object.keys(marked).filter(function (x) { return x !== ans && skipped.indexOf(x) < 0; });
          if (outs.length) extra += ' 서버 ' + outs.join(', ') + '는 앞의 실패로 10초 동안 쓰지 않는 서버라, nginx가 고르는 후보에서 빠져 있습니다.';
          push(hd + (skipped.length ? 'nginx가 이 요청을 서버 ' + ans + '에 넘깁니다. ' : 'nginx는 차례대로 돌아가며 넘기므로 이번에는 서버 ' + ans + ' 차례입니다. ') + '서버 ' + ans + '가 count를 1 올리고 "' + st.say + '"를 돌려주고, nginx가 이 답을 돌려줍니다.' + extra, 'good');
        }
      } else {
        st.to = ans || ''; st.phase = 'req';
        if (ans) push(hd + (i === 1 ? '앞에 nginx가 없으므로 이 요청은 서버 A에 곧바로 닿습니다. ' : '이 요청도 서버 A에 곧바로 닿습니다. ') + '서버 A의 hello() 메서드가 count를 1 올리고 "' + st.say + '"를 돌려줍니다.', 'good');
        else if (i === K + 1) push(hd + '서버 A를 끈 뒤라 8080 포트에서 연결을 받는 프로그램이 없고, 클라이언트에 연결 거부 오류가 납니다. 요청은 서버에 닿지 못했고 답도 없습니다. 앞에 로드 밸런서가 없으니 대신 받아 줄 서버도 없습니다.', 'bad');
        else push(hd + '같은 이유로 연결 거부 오류가 납니다. 답이 없습니다.', 'bad');
      }
    }
    // 마지막 단계
    st.phase = 'end'; st.to = ''; st.ref = '';
    var tail = lb ? '서버 A가 ' + st.ansA + '번, 서버 B가 ' + st.ansB + '번 답했고' : '서버 A가 ' + st.ansA + '번 답했고';
    push('요청 ' + N + '번이 끝났습니다. ' + tail + ', 실패한 요청은 ' + st.fail + '번입니다. 서버 A의 count는 ' + st.cntA + (lb ? ', 서버 B의 count는 ' + st.cntB : '') + '입니다.', st.fail ? 'bad' : 'good');
    // 요약
    if (lb && !down) {
      sum.push('nginx 설정의 upstream app에 서버 두 대를 적고 proxy_pass http://app;으로 넘기면, nginx가 클라이언트가 접속하는 주소 하나(8080 포트)에서 요청을 받아 서버 A와 서버 B에 번갈아 보냅니다(기본 방식인 라운드 로빈). 요청 6번 가운데 서버 A가 3번, 서버 B가 3번 답했습니다.');
      sum.push('받은 요청 수는 서버마다 자기 메모리의 count에 따로 셉니다. 서버 B가 처음 받은 요청은 서버 A가 이미 답한 뒤였는데도 "1번째"였고, 두 서버의 count는 각각 3입니다. 서버 메모리에 적어 둔 값은 다른 서버가 모릅니다.');
    } else if (lb && down) {
      sum.push('요청 3번을 보낸 뒤 서버 A를 꺼도 요청 6번 모두 답을 받았고 실패한 요청은 0번입니다. nginx는 적지 않아도 정해져 있는 기본값(proxy_next_upstream error timeout, max_fails=1, fail_timeout=10s)대로, 연결이 거부된 서버 A를 건너뛰어 같은 요청을 서버 B에 넘기고, 서버 A를 10초 동안 쓰지 않는 서버로 두었습니다.');
      sum.push('서버가 한 대 꺼져도 남은 서버가 있으면 서비스는 이어집니다. 다만 서버 B 혼자 나머지를 받아, 서버 B의 답은 2번째, 3번째, 4번째로 이어졌습니다.');
    } else if (!down) {
      sum.push('nginx 없이 서버 A 한 대에 직접 접속하면 요청 6번 모두 서버 A가 답했습니다. 서버 A의 count도 1번째부터 6번째까지 한 서버에서 이어졌습니다.');
      sum.push('서버가 살아 있는 동안은 문제가 없습니다. 서버 두 대 앞에 nginx를 두었을 때는 요청이 두 서버에 나뉘고 count도 서버마다 따로 셌습니다.');
    } else {
      sum.push('서버 A 한 대뿐일 때 요청 3번 뒤에 서버 A를 끄면, 끄기 전의 요청 3번은 답을 받지만 끈 뒤의 요청 3번(4~6번째)은 모두 연결 거부 오류로 실패합니다. 끈 뒤로는 클라이언트가 한 번도 답을 받지 못했습니다.');
      sum.push('대신 받아 줄 서버가 없습니다. 로드 밸런서 없이 서버 한 대에 기대면 그 한 대가 꺼지는 순간 서비스 전체가 멈춥니다. 서버 두 대 앞에 nginx를 둔 구성에서는 같은 때 서버 A를 꺼도 실패한 요청이 0번이었습니다.');
    }
    return { events: ev, summary: sum, trace: trace, row: [st.ansA + '번', lb ? st.ansB + '번' : '서버 B 없음', st.fail + '번' + (st.fail ? ' (연결 거부 오류)' : '')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 뜨는 것부터 시작합니다.'); return; }
    if (s.rows.length) H.table(v, ['요청', '보낸 곳', '클라이언트가 받은 것'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1], { v: r[2], cls: r[2].indexOf('나는') === 0 ? 'good' : 'bad' }] }; }), '요청과 답');
    H.counters(v, [[s.ansA, 'A가 답한 수'], [sim.c.servers === 'lb' ? s.ansB : '-', 'B가 답한 수'], [s.fail, '실패한 요청']]);
  },
  // 그림: 왼쪽에 클라이언트, 가운데에 nginx(없으면 흐리게), 오른쪽에 서버 A와 B. 요청이 어느 서버에 닿는지, 연결이 거부되는 곳이 어디인지를 화살표로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, lb = c.servers === 'lb', last = shown[shown.length - 1], s = last ? last.snap : null;
    var sending = s && (s.phase === 'sent' || s.phase === 'answer' || s.phase === 'req');
    P.size(680, 292);
    P.region('cl', 10, 16, 150, 206, '클라이언트');
    var cs;
    if (!s || !s.n) cs = ['요청 0/6번째', '대기'];
    else if (s.phase === 'sent') cs = ['요청 ' + s.n + '/6번째', '답을 기다림'];
    else if (s.phase === 'kill') cs = ['요청 ' + s.n + '/6번째', '다음 요청 전'];
    else if (s.err) cs = ['요청 ' + s.n + '/6번째', '연결 거부', '오류'];
    else cs = ['요청 ' + s.n + '/6번째', '받은 답:'].concat(s.say.split(', '));
    P.box('c', 20, 44, 130, 162, { cls: s && s.err && sending ? 'bad' : sending ? 'wait' : 'plain', title: '요청 보내기', sub: cs });
    P.box('lb', 220, 88, 120, 76, { cls: lb ? (sending ? 'hot' : 'plain') : 'ghost', title: 'nginx', sub: lb ? ['로드 밸런서', '8080 포트'] : ['(없음)'] });
    P.region('sv', 440, 16, 230, 206, '스프링 부트 서버');
    var aOn = s && sending && s.to === 'A', bOn = s && sending && s.to === 'B';
    P.box('a', 450, 36, 210, 70, { cls: s && !s.aUp ? 'bad' : aOn ? (s.phase === 'sent' ? 'hot now' : 'good now') : 'plain', title: '서버 A (' + (lb ? '8081' : '8080') + ' 포트)', sub: ['count ' + (s ? s.cntA : 0), s && !s.aUp ? '꺼져 있음' : '켜져 있음'] });
    P.box('b', 450, 132, 210, 70, { cls: lb ? (bOn ? (s.phase === 'sent' ? 'hot now' : 'good now') : 'plain') : 'ghost', title: '서버 B' + (lb ? ' (8082 포트)' : ''), sub: lb ? ['count ' + (s ? s.cntB : 0), '켜져 있음'] : ['(없음)'] });
    if (sending) {
      if (lb) {
        P.arrow('rq', 'c:r:0.5', 'lb:l', {});
        if (s.to) P.arrow('fw', 'lb:r:' + (s.to === 'A' ? '0.25' : '0.75'), (s.to === 'A' ? 'a' : 'b') + ':l:0.5', { cls: 'good' });
        if (s.ref) P.arrow('rf', 'lb:r:' + (s.ref === 'A' ? '0.25' : '0.75'), (s.ref === 'A' ? 'a' : 'b') + ':l:0.5', { cls: 'bad' });
      } else {
        P.arrow('rq', 'c:r:0.2', 'a:l:0.5', { cls: s.err ? 'bad' : 'good' });
      }
    }
    P.box('n1', 14, 240, 214, 36, { cls: s && s.ansA ? 'good' : 'ghost', title: 'A가 답한 수', right: (s ? s.ansA : 0) + '번' });
    P.box('n2', 233, 240, 214, 36, { cls: lb && s && s.ansB ? 'good' : 'ghost', title: 'B가 답한 수', right: lb ? (s ? s.ansB : 0) + '번' : '없음' });
    P.box('n3', 452, 240, 214, 36, { cls: s && s.fail ? 'bad' : 'ghost', title: '실패한 요청', right: (s ? s.fail : 0) + '번' });
  },
  assume: '서버 A와 서버 B는 실제 스프링 부트 4.1.1(스프링 7.0.9, 내장 톰캣 11.0.24, JDK 21)입니다. 화면의 HelloController를 그대로 컴파일하고, 화면의 java -jar 줄에 적힌 --server.port와 --app.name 인자를 그대로 주어 켰습니다. 다만 jar로 묶는 대신 컴파일한 클래스로 켰고, 화면에서 생략한 시작 클래스는 시험용으로 따로 두었습니다. nginx는 이 컴퓨터에 없어서 실행하지 않았습니다. 대신 nginx 역할을 하는 실행용 모형(Node.js 24.18.0으로 짠 작은 프로그램)이 화면의 nginx 설정에서 upstream의 server 줄, listen, proxy_pass를 읽고, nginx 문서에 적힌 동작대로 요청을 넘겼습니다. 같은 가중치의 라운드 로빈으로 서버를 고르고, 연결 오류나 타임아웃이 나면 같은 요청을 다음 서버에 넘기고(proxy_next_upstream 기본값 error timeout), max_fails(기본 1)번 실패한 서버는 fail_timeout(기본 10초) 동안 고르지 않습니다. 첫 요청이 목록의 첫 서버(서버 A)로 간다는 것은 문서에 적혀 있지 않아서, nginx 소스(ngx_http_upstream_round_robin.c)가 서버를 고르는 방식(가중치가 같으면 목록 앞의 서버)을 옮겨 정했습니다. 클라이언트는 GET / 요청을 요청마다 새 연결로 6번 차례로 보냈습니다. 서버 A를 끄는 것은 Ctrl+C 대신 서버 A 프로세스를 끝내는 것으로 했고, 끈 뒤에 연결하면 ECONNREFUSED(연결 거부 오류)가 났습니다. 화면의 8080, 8081, 8082 포트는 실행에서 다른 빈 포트(18270~18272)로 바꿨습니다. 네 가지 조합을 모두 실행해 서버 A와 서버 B가 답한 수, 실패한 요청 수, 요청 6번 각각을 어느 서버가 몇 번째로 답했는지와 클라이언트가 받은 글, 서버의 count, 연결을 거부당한 요청을 모형과 대조했습니다. 그러니 스프링 부트 서버의 답은 실제 실행 결과이고, 요청을 나누고 꺼진 서버를 건너뛰는 부분은 문서대로 짠 모형의 결과이며 진짜 nginx로 확인한 것은 아닙니다. nginx 설정은 nginx.org 문서와 대조했습니다. ngx_http_upstream_module: upstream은 http 블록에 두고, 기본 분배는 가중치를 둔 라운드 로빈이며, max_fails 기본값은 1, fail_timeout 기본값은 10초입니다. ngx_http_proxy_module: proxy_pass에 서버 묶음(upstream) 이름을 쓸 수 있고, proxy_next_upstream 기본값은 error timeout이며, error는 서버와 연결을 맺거나 요청을 넘기거나 응답의 머리를 읽는 중에 난 오류입니다. 라운드 로빈 차례는 nginx 작업 프로세스마다 따로 셉니다(worker_processes 기본값은 1이고, upstream에 zone을 두면 작업 프로세스들이 함께 셉니다). 작업 프로세스가 여럿이면 A, B, A, B 순서가 이 실습과 다를 수 있습니다. 다루지 않은 것: nginx 자신이 꺼지는 경우, 꺼진 서버가 다시 켜져 10초 뒤 돌아오는 경우, 서버 상태를 주기적으로 확인하는 헬스 체크, weight로 서버마다 몫을 다르게 주는 것, least_conn이나 ip_hash 같은 다른 나누는 방식, 답을 보내는 도중에 서버가 꺼지는 경우, 요청이 아주 많을 때 서버가 버티는 한계입니다. 로드 밸런서를 직접 프로그램으로 짤 수도 있습니다. 이 실습의 실행용 모형이 그런 예로, 수십 줄로 라운드 로빈과 실패한 서버 건너뛰기를 해 볼 수 있습니다. 하지만 실제 서비스에서는 nginx나 클라우드 로드 밸런서를 씁니다. 서버를 늘려 처리량이 어디까지 느는지는 "세부 동작 실습: 로드밸런서와 스케일 아웃"에서, 서버를 하나씩 바꿔 배포하는 방법은 "배포 전략"에서, 죽은 서버를 자동으로 다시 띄우는 일은 "쿠버네티스 자가 치유"에서 다룹니다.',
});
