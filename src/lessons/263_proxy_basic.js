Lab.register({
  id: 'proxy_basic', nav: '프록시 서버', cat: '기초개념', mode: 'step', basic: true, deep: ['revproxy', 'scale', 'cdn'],
  title: '서버를 직접 부르기와 nginx(프록시)를 거쳐 부르기는 무엇이 다른가',
  why: '서버 프로그램을 인터넷에 바로 내놓으면, 서버를 여러 대로 늘리거나 바꿀 때 사용자가 접속하는 주소도 바뀌고, HTTPS 처리나 나쁜 접속 막기 같은 일도 서버 프로그램마다 따로 해야 한다. 리버스 프록시는 서버들 앞에 한 주소로 서서 요청을 받아 넘겨 주므로, 뒤의 서버가 바뀌어도 사용자는 같은 주소로 접속한다.',
  use: '스프링 부트 서버 앞에 nginx를 두고, nginx 설정의 proxy_pass로 80번과 443번 포트에서 받은 요청을 8080번의 스프링 부트에 넘기는 구성이 흔하다. 이때 스프링 부트가 보는 연결 상대는 nginx이므로, 진짜 사용자의 IP 주소는 nginx가 proxy_set_header로 X-Forwarded-For 헤더에 적어 넘기게 해서 전해 받는다. 회사 안에서 바깥 사이트로 나가는 요청을 한곳에 모아 거르는 프록시(포워드 프록시)도 있다.',
  intro: '프록시 서버는 요청을 보내는 쪽(사용자)과 진짜 서버 사이에 서서 요청을 대신 넘겨 주는 서버입니다. 이 실습은 가장 흔한 구성인 nginx와 스프링 부트로, 서버를 직접 부를 때와 nginx를 거쳐 부를 때를 견줍니다. 코드 칸은 네 부분입니다. 첫째는 사용자가 부르는 주소입니다. 사용자는 다른 컴퓨터(203.0.113.7)에 있고, 192.0.2.10은 서버 컴퓨터의 주소입니다. 주소에 포트 번호를 적지 않으면 80번, :8080을 적으면 8080번으로 갑니다. 포트 번호는 한 컴퓨터에서 프로그램마다 나뉜 문의 번호입니다. 둘째는 nginx 설정입니다. listen 80은 80번에서 요청을 받는다는 줄이고, proxy_pass는 받은 요청을 같은 컴퓨터의 8080번(127.0.0.1:8080)에 넘긴다는 줄이며, proxy_set_header는 넘길 때 요청에 헤더를 적어 붙이는 줄입니다. 셋째는 스프링 부트의 설정 파일 application.properties이고, 넷째는 요청을 받는 컨트롤러입니다. 컨트롤러는 자신에게 연결한 상대의 주소(request.getRemoteAddr())와 X-Forwarded-For 헤더를 글로 돌려줍니다. 이 실습은 부르는 주소, server.address 줄, 켜 둔 프로그램을 바꿔 가며 사용자가 무엇을 받는지와 스프링 부트가 누구를 연결 상대로 보는지를 봅니다. nginx는 이 실습을 만든 컴퓨터에 없어서, 실행에서는 nginx 문서에 적힌 대로 움직이게 만든 작은 프로그램(Node.js)이 nginx 역할을 대신했고, 스프링 부트 쪽은 화면의 코드를 그대로 실행했습니다.',
  terms: ['프록시 서버', '리버스 프록시', 'nginx의 proxy_pass와 proxy_set_header', 'X-Forwarded-For', '502 Bad Gateway', 'server.address', '진짜 서버(원 서버)'],
  controls: [
    { id: 'via', label: '사용자가 부르는 주소', type: 'select', value: 'proxy', options: [['proxy', 'http://192.0.2.10/hello (80번: nginx)'], ['direct', 'http://192.0.2.10:8080/hello (8080번: 스프링 부트)']] },
    { id: 'bind', label: 'application.properties에 server.address=127.0.0.1 줄이 있다', type: 'check', value: true },
    { id: 'up', label: '켜 둔 프로그램', type: 'select', value: 'both', options: [['both', 'nginx와 스프링 부트를 둘 다 켰다'], ['noserver', '스프링 부트를 껐다 (nginx만 켬)'], ['noproxy', 'nginx를 껐다 (스프링 부트만 켬)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'nginx(80번)를 거쳐 부르면, 스프링 부트는 누구를 연결 상대로 보고 사용자의 주소는 어디서 알 수 있나', d: '스프링 부트에 연결한 것은 nginx(127.0.0.1)이고, 사용자의 주소 203.0.113.7은 nginx가 적어 넘긴 X-Forwarded-For 헤더로 옵니다.', v: { via: 'proxy', bind: true, up: 'both' } },
    { t: '8080번으로 직접 부르면', q: 'server.address=127.0.0.1을 둔 채, 사용자가 8080번으로 스프링 부트를 직접 부르면', d: '스프링 부트가 켜져 있어도 사용자는 연결 거부 오류를 받습니다. 스프링 부트는 127.0.0.1로 오는 연결만 받기 때문입니다.', v: { via: 'direct', bind: true, up: 'both' } },
    { t: 'server.address 줄을 지우고 직접 부르면', q: 'server.address 줄을 지우고 8080번으로 직접 부르면, 스프링 부트가 보는 연결 상대와 X-Forwarded-For는', d: '연결 상대는 사용자 자신(203.0.113.7)이고, 사이에서 헤더를 적어 줄 nginx가 없으니 X-Forwarded-For는 null입니다.', v: { via: 'direct', bind: false, up: 'both' } },
    { t: '스프링 부트를 끄면', q: '스프링 부트를 끄고 nginx(80번)를 거쳐 부르면 사용자는 무엇을 받나', d: 'nginx가 8080번에 연결하지 못하고, 사용자에게 502 Bad Gateway를 돌려줍니다. 이 응답은 nginx가 만든 것입니다.', v: { via: 'proxy', bind: true, up: 'noserver' } },
    { t: '스프링 부트를 끈 채 직접 부르면', q: 'server.address 줄 없이 스프링 부트를 끄고 8080번으로 직접 부르면, 502를 받나', d: '대신 답해 줄 nginx를 지나지 않으므로 502가 아니라 연결 거부 오류를 받습니다.', v: { via: 'direct', bind: false, up: 'noserver' } },
    { t: 'nginx를 끄면', q: '스프링 부트는 켜 두고 nginx를 끈 채 80번으로 부르면', d: '스프링 부트가 멀쩡해도 사용자는 연결 거부 오류를 받습니다. 사용자가 쓰는 문은 nginx의 80번 하나입니다.', v: { via: 'proxy', bind: true, up: 'noproxy' } },
  ],
  CL: '203.0.113.7', HOST: '192.0.2.10',
  GOT: { ok: '200 응답 (스프링 부트가 만든 것)', bad: '502 Bad Gateway (nginx가 만든 응답)', refuse: '연결 거부 오류 (그 주소와 포트에서 기다리는 프로그램이 없음)' },
  NONE: '없음 (요청이 오지 않음)',
  // 결과의 갈래를 정한다. 실행(verify/net/proxy_basic_probe_boot.js)에서 잰 것과 verify/net/cmp_proxy_basic.js로 대조한다.
  judge: function (c) {
    var viaP = c.via === 'proxy', pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver', r = { viaP: viaP, pOn: pOn, sOn: sOn, bind: !!c.bind };
    if (viaP && !pOn) r.k = 'refuseProxy';
    else if (viaP && !sOn) r.k = 'bad';
    else if (viaP) r.k = 'okProxy';
    else if (!sOn) r.k = 'refuseDown';
    else if (c.bind) r.k = 'refuseBind';
    else r.k = 'okDirect';
    return r;
  },
  code: function (c) {
    var o = [], pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver';
    o.push('# 사용자(다른 컴퓨터 203.0.113.7)가 부르는 주소');
    if (c.via === 'proxy') o.push('# 포트 번호를 적지 않으면 http는 80번으로 간다', 'http://192.0.2.10/hello');
    else o.push('# :8080을 적었으므로 8080번으로 간다', 'http://192.0.2.10:8080/hello');
    o.push('',
      '# nginx 설정 (서버 컴퓨터 192.0.2.10에서 실행)' + (pOn ? '' : ' · 지금은 nginx를 껐다'),
      'server {',
      '    listen 80;',
      '    location / {',
      '        proxy_pass http://127.0.0.1:8080;',
      '        proxy_set_header Host $host;',
      '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
      '    }',
      '}',
      '',
      '# application.properties (스프링 부트, 같은 컴퓨터에서 실행)' + (sOn ? '' : ' · 지금은 껐다'),
      'server.port=8080');
    if (c.bind) o.push('# 127.0.0.1(이 컴퓨터 자신의 주소)로 오는 연결만 받는다', 'server.address=127.0.0.1');
    else o.push('# server.address 줄 없음: 이 컴퓨터의 어느 주소로 와도 받는다');
    o.push('',
      '// HelloController.java',
      '// HelloController는 예시로 지은 이름이다. @RestController와 @GetMapping은',
      '// 스프링이, HttpServletRequest는 서블릿 API(jakarta.servlet)가 준다.',
      'import jakarta.servlet.http.HttpServletRequest;',
      'import org.springframework.web.bind.annotation.GetMapping;',
      'import org.springframework.web.bind.annotation.RestController;',
      '',
      '@RestController',
      'public class HelloController {',
      '    @GetMapping("/hello")',
      '    public String hello(HttpServletRequest request) {',
      '        // 이 서버에 연결을 맺은 상대의 주소',
      '        String peer = request.getRemoteAddr();',
      '        // 요청에 붙어 온 X-Forwarded-For 헤더 (없으면 null)',
      '        String xff = request.getHeader("X-Forwarded-For");',
      '        return "연결한 상대: " + peer + ", X-Forwarded-For: " + xff;',
      '    }',
      '}');
    return o.join('\n');
  },
  label: function (c) { return { proxy: '80번(nginx)으로 부름', direct: '8080번(스프링 부트)으로 직접 부름' }[c.via] + ' · ' + (c.bind ? 'server.address=127.0.0.1' : 'server.address 없음') + ' · ' + { both: '둘 다 켬', noserver: '스프링 부트 꺼짐', noproxy: 'nginx 꺼짐' }[c.up]; },
  columns: ['사용자가 받은 것', 'getRemoteAddr() (스프링 부트가 본 연결 상대)', 'X-Forwarded-For 헤더', '요청이 지나간 길'],
  simulate: function (c) {
    var j = this.judge(c), G = this.GOT, NONE = this.NONE, CL = this.CL, HOST = this.HOST, ev = [], sum = [], row;
    var spSub = j.sOn ? (j.bind ? ['127.0.0.1:8080에서', '기다림'] : ['8080에서 기다림', '(모든 주소)']) : ['꺼짐'];
    var st = { cl: 'plain', clt: [CL], px: j.pOn ? 'plain' : 'ghost', pxt: j.pOn ? ['80에서 기다림'] : ['꺼짐'], sv: j.sOn ? 'plain' : 'ghost', svt: spSub, aq1: '', aq2: '', ar2: '', ar1: '', dq: '', dr: '', got: '', gotc: '', peer: '', peerc: '', xff: '', xffc: '', way: '', wayc: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 1단계: 사용자가 부른다
    if (j.viaP) st.aq1 = 'plain'; else st.dq = 'plain';
    st.cl = 'hot'; st.clt = [CL, (j.viaP ? '80' : '8080') + '번으로 연결'];
    push('사용자(' + CL + ')가 코드 칸의 주소로 GET /hello 요청을 보냅니다. ' + (j.viaP ? '주소에 포트 번호가 없으므로 서버 컴퓨터 ' + HOST + '의 80번에 연결합니다. 80번에서 기다리는 것은 nginx입니다(listen 80). 사용자가 쓰는 주소에는 스프링 부트의 번호 8080이 없습니다.' : '주소에 :8080을 적었으므로 서버 컴퓨터 ' + HOST + '의 8080번에 바로 연결합니다. 요청은 nginx를 지나지 않습니다.') + (j.pOn ? '' : ' 지금 nginx는 꺼져 있습니다.') + (j.sOn ? '' : ' 지금 스프링 부트는 꺼져 있습니다.'), '');
    if (j.k === 'refuseProxy') {
      st.cl = 'bad'; st.clt = ['연결 거부 오류']; st.aq1 = 'bad'; st.got = G.refuse; st.gotc = 'bad'; st.way = '사용자 → nginx(80) (연결 거부)'; st.wayc = 'bad';
      push(HOST + '의 80번에서 기다리는 프로그램이 없어서 연결이 맺어지지 않고, 사용자는 연결 거부 오류를 받습니다. 요청은 nginx에도 스프링 부트에도 가지 못했습니다.', 'bad');
      st.peer = NONE; st.peerc = 'bad'; st.xff = NONE; st.xffc = 'bad';
      push('스프링 부트는 켜져 있고 ' + (j.bind ? '127.0.0.1의 ' : '') + '8080번에서 기다리고 있었지만 요청을 받은 일이 없습니다. 사용자는 80번으로만 부르기 때문입니다. 그래서 컨트롤러는 한 번도 실행되지 않았습니다.', 'bad');
      sum.push('nginx가 꺼지면 사용자는 연결 거부 오류를 받습니다. 스프링 부트가 멀쩡해도, 사용자가 부르는 80번에서 기다리는 프로그램이 없으니 요청이 서버에 닿지 못합니다.');
      sum.push('사용자가 nginx의 주소로만 부르는 구성에서는 nginx가 스프링 부트로 가는 유일한 문입니다. 그래서 nginx가 멈추면 뒤의 서버가 살아 있어도 서비스가 멈춥니다.');
      row = [G.refuse, NONE, NONE, st.way];
    } else if (j.k === 'bad') {
      st.aq1 = 'hot'; st.px = 'hot'; st.pxt = ['요청을 받음']; st.cl = 'plain'; st.clt = [CL, '응답 기다림'];
      push('nginx가 요청을 받습니다. location / 블록의 proxy_pass http://127.0.0.1:8080 줄에 따라, 같은 컴퓨터의 8080번에 새로 연결해 요청을 넘기려고 합니다.', '');
      st.aq2 = 'bad'; st.px = 'bad'; st.pxt = ['8080 연결 실패']; st.way = '사용자 → nginx(80) → 스프링 부트(8080) (연결 거부)'; st.wayc = 'bad';
      push('스프링 부트가 꺼져 있어 127.0.0.1의 8080번에서 기다리는 프로그램이 없습니다. nginx가 연결 거부 오류를 받고, 요청은 스프링 부트에 닿지 못했습니다.', 'bad');
      st.ar1 = 'bad'; st.got = G.bad; st.gotc = 'bad'; st.cl = 'bad'; st.clt = ['502 응답을 받음'];
      push('nginx가 사용자에게 502 Bad Gateway 응답을 돌려줍니다. 본문은 제목이 "502 Bad Gateway"인 짧은 HTML 페이지이고, 이것은 스프링 부트가 아니라 nginx가 만든 것입니다. 502는 프록시로 일하는 서버가 뒤쪽 서버에게서 제대로 된 응답을 받지 못했다는 상태 코드입니다.', 'bad');
      st.peer = NONE; st.peerc = 'bad'; st.xff = NONE; st.xffc = 'bad';
      push('사용자는 연결 거부 오류가 아니라 응답을 받았습니다. 사용자가 연결한 상대인 nginx는 켜져 있기 때문입니다. 스프링 부트는 요청을 받은 일이 없어서 컨트롤러가 실행되지 않았습니다.', 'bad');
      sum.push('스프링 부트가 꺼져 있으면, nginx를 거쳐 부른 사용자는 연결 거부 오류가 아니라 nginx가 만든 502 Bad Gateway를 받습니다. "nginx까지는 닿았지만 nginx가 뒤쪽 서버에 넘기지 못했다"는 뜻입니다.');
      sum.push('그래서 브라우저에 nginx의 502 페이지가 보이면, 먼저 스프링 부트가 떠 있는지와 proxy_pass에 적은 포트(8080)가 server.port와 맞는지를 확인합니다.');
      row = [G.bad, NONE, NONE, st.way];
    } else if (j.k === 'okProxy') {
      st.aq1 = 'hot'; st.px = 'hot'; st.pxt = ['요청을 받아', '8080에 넘김']; st.aq2 = 'hot'; st.sv = 'hot'; st.svt = ['요청을 받음']; st.way = '사용자 → nginx(80) → 스프링 부트(8080)';
      push('nginx가 요청을 받고, proxy_pass http://127.0.0.1:8080 줄에 따라 같은 컴퓨터의 8080번에 새로 연결해 같은 GET /hello를 넘깁니다. 이 연결은 사용자가 맺은 연결과 따로이고, 맺은 쪽은 nginx입니다. 넘길 때 proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for 줄에 따라, 자신에게 연결한 상대의 주소(' + CL + ')를 X-Forwarded-For 헤더에 적어 붙입니다. Host $host 줄은 사용자가 요청에 적은 이름(' + HOST + ')을 Host 헤더로 넘기는 줄이고, 이 실습의 결과에는 쓰지 않습니다.' + (j.bind ? ' nginx가 연결한 곳은 127.0.0.1이므로, server.address=127.0.0.1인 스프링 부트도 이 연결을 받습니다.' : ''), '');
      st.peer = '127.0.0.1 (nginx)'; st.peerc = 'hot'; st.xff = CL; st.xffc = 'good'; st.svt = ['상대: 127.0.0.1'];
      push('스프링 부트의 컨트롤러가 실행됩니다. request.getRemoteAddr()는 127.0.0.1입니다. 이 서버에 연결을 맺은 것은 사용자가 아니라 같은 컴퓨터의 nginx이기 때문입니다. 사용자의 주소 ' + CL + '은 request.getHeader("X-Forwarded-For")로 얻습니다. nginx가 적어 붙인 값입니다.', 'hot');
      st.ar2 = 'good'; st.ar1 = 'good'; st.got = G.ok; st.gotc = 'good'; st.cl = 'good'; st.clt = ['200 응답을 받음']; st.px = 'plain'; st.pxt = ['응답을 돌려줌']; st.sv = 'plain'; st.svt = ['응답을 보냄'];
      push('nginx가 스프링 부트의 응답을 받아 사용자에게 돌려줍니다. 사용자가 받은 것은 상태 코드 200과 본문 "연결한 상대: 127.0.0.1, X-Forwarded-For: ' + CL + '"입니다. 사용자는 자신이 연결한 nginx하고만 주고받았습니다.', 'good');
      sum.push('nginx를 거치면 연결이 둘로 나뉩니다. 사용자는 nginx(80번)에 연결하고, nginx가 스프링 부트(8080번)에 따로 연결해 요청을 넘깁니다. 그래서 스프링 부트의 getRemoteAddr()는 사용자가 아니라 nginx의 주소(127.0.0.1)입니다.');
      sum.push('진짜 사용자의 주소는 nginx가 proxy_set_header로 적어 넘긴 X-Forwarded-For 헤더로 전해 받습니다. 스프링 부트가 이 헤더를 읽어 getRemoteAddr()에 반영하게 하는 설정(server.forward-headers-strategy)은 세부 동작 실습 "프록시와 리버스 프록시"에서 다룹니다.');
      row = [G.ok, '127.0.0.1 (nginx)', CL, st.way];
    } else if (j.k === 'refuseDown' || j.k === 'refuseBind') {
      st.cl = 'bad'; st.clt = ['연결 거부 오류']; st.dq = 'bad'; st.got = G.refuse; st.gotc = 'bad'; st.way = '사용자 → 스프링 부트(8080) (연결 거부)'; st.wayc = 'bad';
      if (j.k === 'refuseBind') {
        push('스프링 부트는 켜져 있고 8080번에서 기다리지만, server.address=127.0.0.1 줄 때문에 127.0.0.1로 오는 연결만 받습니다. 사용자의 연결은 ' + HOST + '의 8080번으로 왔고, 그 주소의 8080번에서 기다리는 프로그램은 없습니다. 그래서 연결이 맺어지지 않고 사용자는 연결 거부 오류를 받습니다.', 'bad');
        st.peer = NONE; st.peerc = 'bad'; st.xff = NONE; st.xffc = 'bad';
        push('컨트롤러는 실행되지 않았습니다. 127.0.0.1은 컴퓨터가 자기 자신을 가리키는 주소라서, 다른 컴퓨터의 사용자는 이 주소로 서버 컴퓨터에 연결할 수 없습니다. 127.0.0.1:8080에는 같은 컴퓨터의 프로그램(여기서는 nginx)만 연결할 수 있습니다.', 'bad');
        sum.push('server.address=127.0.0.1을 두면 스프링 부트는 같은 컴퓨터에서 오는 연결만 받습니다. 그래서 바깥의 사용자는 8080번으로 직접 부를 수 없고, nginx의 80번을 거쳐서만 들어옵니다.');
        sum.push('이렇게 진짜 서버의 포트는 바깥에서 부를 수 없게 두고 프록시만 내놓을 수 있습니다. 방화벽으로 8080번을 막는 방법도 있습니다.');
      } else {
        push(HOST + '의 8080번에서 기다리는 프로그램이 없어서 연결이 맺어지지 않고, 사용자는 연결 거부 오류를 받습니다.' + (j.pOn ? ' nginx는 켜져 있지만 이 요청은 80번으로 가지 않았으므로 nginx를 지나지 않습니다.' : ''), 'bad');
        st.peer = NONE; st.peerc = 'bad'; st.xff = NONE; st.xffc = 'bad';
        push('스프링 부트가 꺼져 있어 컨트롤러는 실행되지 않았습니다. 사이에서 대신 답해 줄 nginx를 지나지 않았기 때문에, 사용자는 502 같은 응답도 받지 못하고 연결 거부 오류를 받았습니다.', 'bad');
        sum.push('직접 부르는 상태에서 스프링 부트가 꺼지면 사용자는 연결 거부 오류를 받습니다. 대신 답해 줄 프록시가 없으니 502 같은 응답도 없습니다.');
        sum.push('같은 상황에서 nginx를 거쳐 부르면 nginx가 만든 502 Bad Gateway를 받았습니다(물음 "스프링 부트를 끄면"). 서버가 꺼졌을 때 사용자가 받는 것은 사이에 프록시가 있느냐에 따라 다릅니다.');
      }
      row = [G.refuse, NONE, NONE, st.way];
    } else {
      st.dq = 'hot'; st.sv = 'hot'; st.svt = ['요청을 받음']; st.way = '사용자 → 스프링 부트(8080)';
      push('server.address 줄이 없으므로 스프링 부트는 이 컴퓨터의 어느 주소로 온 연결도 8080번에서 받습니다. 사용자의 연결이 맺어지고 요청이 바로 도착합니다.' + (j.pOn ? ' nginx는 켜져 있지만 이 요청을 받은 일이 없습니다.' : ' nginx는 꺼져 있지만 이 요청은 원래 nginx를 지나지 않으므로 상관이 없습니다.'), '');
      st.peer = CL + ' (사용자)'; st.peerc = 'good'; st.xff = 'null (헤더 없음)'; st.xffc = 'hot'; st.svt = ['상대: ' + CL];
      push('컨트롤러가 실행됩니다. request.getRemoteAddr()는 ' + CL + ', 사용자 자신의 주소입니다. 이 서버에 연결을 맺은 것이 사용자이기 때문입니다. request.getHeader("X-Forwarded-For")는 null입니다. 사이에서 헤더를 적어 붙일 nginx를 지나지 않았고, 사용자도 그 헤더를 보내지 않았습니다.', 'good');
      st.dr = 'good'; st.got = G.ok; st.gotc = 'good'; st.cl = 'good'; st.clt = ['200 응답을 받음']; st.sv = 'plain'; st.svt = ['응답을 보냄'];
      push('사용자가 스프링 부트의 응답을 직접 받습니다. 받은 것은 상태 코드 200과 본문 "연결한 상대: ' + CL + ', X-Forwarded-For: null"입니다.', 'good');
      sum.push('직접 부르면 연결은 하나뿐입니다. 사용자가 스프링 부트에 바로 연결하므로 getRemoteAddr()가 곧 사용자의 주소이고, X-Forwarded-For는 없습니다.');
      sum.push('nginx를 거칠 때(처음 설정)와 견주면, 같은 컨트롤러라도 getRemoteAddr()가 127.0.0.1(nginx)에서 ' + CL + '(사용자)로 바뀝니다. 다만 server.address 줄을 지워 8080번을 바깥에 연 상태라서, 사용자가 nginx를 건너뛰고 들어올 수 있습니다.');
      row = [G.ok, CL + ' (사용자)', 'null (헤더 없음)', st.way];
    }
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 사용자가 코드 칸의 주소로 요청을 보내는 것부터 시작합니다.'); return; }
    H.table(v, ['항목', '값'], [
      { cls: s.got ? '' : 'gone', cells: ['사용자가 받은 것', s.got ? { v: s.got, cls: s.gotc } : '아직'] },
      { cls: s.peer ? '' : 'gone', cells: ['getRemoteAddr() (스프링 부트가 본 연결 상대)', s.peer ? { v: s.peer, cls: s.peerc } : '아직'] },
      { cls: s.xff ? '' : 'gone', cells: ['X-Forwarded-For 헤더', s.xff ? { v: s.xff, cls: s.xffc } : '아직'] },
      { cls: s.way ? '' : 'gone', cells: ['요청이 지나간 길', s.way ? { v: s.way, cls: s.wayc || 'good' } : '아직'] },
    ], '결과');
  },
  // 그림: 왼쪽에 사용자(다른 컴퓨터), 오른쪽 테두리는 서버 컴퓨터 192.0.2.10이고 그 위쪽에 nginx, 아래쪽에 스프링 부트가 있다(둘 다 그 컴퓨터에서 실행되는 프로그램).
  // nginx를 거치면 사용자 -> nginx -> 스프링 부트로 꺾이는 화살표, 직접 부르면 nginx 아래를 지나 곧바로 가는 화살표다. 꺼진 프로그램은 점선 상자이고 거부된 곳은 빨강이다. 아래에 결과 네 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver';
    P.size(680, 392);
    P.region('host', 216, 10, 456, 204, '서버 컴퓨터 192.0.2.10');
    P.box('cl', 14, 118, 150, 72, { cls: s ? s.cl : 'plain', title: '사용자', sub: s ? s.clt : ['203.0.113.7'] });
    P.box('px', 236, 38, 170, 72, { cls: s ? s.px : (pOn ? 'plain' : 'ghost'), title: 'nginx', sub: s ? s.pxt : (pOn ? ['80에서 기다림'] : ['꺼짐']) });
    P.box('sv', 488, 118, 170, 72, { cls: s ? s.sv : (sOn ? 'plain' : 'ghost'), title: '스프링 부트', sub: s ? s.svt : (sOn ? (c.bind ? ['127.0.0.1:8080에서', '기다림'] : ['8080에서 기다림', '(모든 주소)']) : ['꺼짐']) });
    function ac(x) { return x === 'plain' ? '' : x; }
    if (s && s.aq1) P.arrow('aq1', [164, 130], [236, 86], { cls: ac(s.aq1) });
    if (s && s.aq2) P.arrow('aq2', [406, 86], [488, 130], { cls: ac(s.aq2) });
    if (s && s.ar2) P.arrow('ar2', [488, 146], [406, 100], { cls: ac(s.ar2) });
    if (s && s.ar1) P.arrow('ar1', [236, 100], [164, 146], { cls: ac(s.ar1) });
    if (s && s.dq) P.arrow('dq', [164, 162], [488, 162], { cls: ac(s.dq) });
    if (s && s.dr) P.arrow('dr', [488, 180], [164, 180], { cls: ac(s.dr) });
    P.box('n1', 14, 226, 652, 36, { cls: s && s.got ? s.gotc || 'wait' : 'ghost', title: '사용자가 받은 것', right: s && s.got ? s.got : '아직' });
    P.box('n2', 14, 268, 652, 36, { cls: s && s.peer ? s.peerc || 'wait' : 'ghost', title: 'getRemoteAddr()', right: s && s.peer ? s.peer : '아직' });
    P.box('n3', 14, 310, 652, 36, { cls: s && s.xff ? s.xffc || 'wait' : 'ghost', title: 'X-Forwarded-For 헤더', right: s && s.xff ? s.xff : '아직' });
    P.box('n4', 14, 352, 652, 36, { cls: s && s.way ? s.wayc || 'wait' : 'ghost', title: '요청이 지나간 길', right: s && s.way ? s.way : '아직' });
  },
  assume: '검증 실행(verify/net/proxy_basic_probe_boot.js)은 열두 가지 조합을 모두 이 PC 안에서만 실행했고, 외부 네트워크는 쓰지 않았습니다. 스프링 부트 쪽은 실제로 실행했습니다. 화면의 HelloController에 package 줄 하나만 붙여 JDK 21로 컴파일하고, 화면의 application.properties 줄을 그대로 파일로 써서 스프링 부트 4.1.1(스프링 7.0.9, 내장 톰캣 11.0.24)로 띄웠습니다. 바꾼 것은 server.port의 8080을 빈 포트 번호로 바꾼 것뿐이고, 띄우는 Main 클래스와 /hello 요청 수를 세는 필터는 실행을 위해 덧붙였습니다(화면에는 없음). netstat으로 보니 server.address=127.0.0.1이면 127.0.0.1에서만, 그 줄이 없으면 0.0.0.0(모든 주소)에서 기다렸습니다. nginx는 이 컴퓨터에 없어 내려받지 않았고, 화면의 nginx 설정을 읽어 nginx 문서대로 움직이게 만든 Node.js 24.18.0 프로그램이 nginx 역할을 대신했습니다. 이 프로그램은 받은 요청의 Host와 Connection은 넘기지 않고 나머지 헤더는 그대로 넘기며, proxy_set_header 줄의 $host(요청의 Host에 적힌 이름)와 $proxy_add_x_forwarded_for(받은 X-Forwarded-For 뒤에 쉼표와 $remote_addr를 붙인 값, 받은 것이 없으면 $remote_addr)를 적용하고, 기본값 Connection: close를 붙여 HTTP/1.1로 뒤쪽에 넘깁니다. 뒤쪽에 연결하지 못하면 502와 nginx 소스에 적힌 502 페이지를 돌려줍니다. 그러니 nginx 쪽 동작은 실제 nginx로 실행한 것이 아니라 문서와 소스를 대조해 옮긴 것입니다. 문서로 확인한 것은 nginx.org의 ngx_http_core_module(listen의 기본값, server와 location, $host, $remote_addr), ngx_http_proxy_module(proxy_pass, proxy_set_header의 기본값 Host $proxy_host와 Connection close, 원래 요청의 Host와 Connection은 넘기지 않는다는 것, $proxy_add_x_forwarded_for의 정의, proxy_http_version이 1.29.7부터 기본 1.1이라는 것), nginx 소스 ngx_http_upstream.c(뒤쪽 연결 실패는 오류 갈래로 처리되고, 넘길 다음 서버가 없으면 502로 끝남)와 ngx_http_special_response.c(502 페이지 글), 스프링 부트 4.1.1 jar의 설정 설명(server.address는 서버가 묶일 네트워크 주소, server.port는 기본값 8080), RFC 9110 15.6.3절(502)입니다. nginx 문서에는 "뒤쪽 연결에 실패하면 502"라는 문장이 따로 없어서 소스로 확인했습니다. 502 페이지의 마지막 줄은 server_tokens 설정에 따라 nginx 뒤에 버전 번호가 붙을 수 있습니다. 화면의 사용자 주소 203.0.113.7과 서버 컴퓨터 주소 192.0.2.10은 문서용 예시 주소이고, 실행에서는 사용자를 127.0.0.10, 서버 컴퓨터의 바깥 주소를 127.0.0.2로 대신했습니다(둘 다 이 PC의 루프백 주소). 그래서 "다른 컴퓨터에서 8080번으로 부르면 거부된다"는 것은 127.0.0.1에서만 기다리는 스프링 부트에 127.0.0.2로 연결하면 거부되는 것으로 확인했고, 실제 다른 컴퓨터에서 실행하지는 않았습니다. 화면의 80과 8080도 실제로는 빈 포트 번호를 썼고, 꺼진 프로그램은 띄우지 않고 그 번호를 방금 닫은 빈 포트로 대신했습니다. 대조한 것(verify/net/cmp_proxy_basic.js, 13가지 모두 일치)은 사용자가 받은 것(상태 코드, 본문, 연결 거부), 컨트롤러가 돌려준 getRemoteAddr()와 X-Forwarded-For, nginx 역할 프로그램이 받은 요청 수와 붙인 헤더, 스프링 부트가 받은 /hello 요청 수, 화면의 코드가 실행이 읽은 글과 같은지입니다. 톰캣은 상태 줄에 OK 같은 글을 붙이지 않아서 표에는 상태 코드 200만 적었습니다. 이 실습은 HTTPS(443번)와 인증서, 스프링 부트가 X-Forwarded-For를 읽어 getRemoteAddr()에 반영하게 하는 server.forward-headers-strategy와 위조된 헤더, 응답이 늦을 때의 504는 다루지 않았습니다. 앞의 것들은 세부 동작 실습 "프록시와 리버스 프록시"에서, 서버를 여러 대로 나누는 것은 "로드밸런서와 스케일 아웃"에서, 응답 보관은 "CDN"에서 다룹니다.',
});
