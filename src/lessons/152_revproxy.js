Lab.register({
  id: 'revproxy', nav: '프록시와 리버스 프록시', cat: '네트워크', mode: 'step',
  title: 'nginx 뒤의 스프링 부트는 누가 요청했는지 어떻게 아나',
  why: '애플리케이션 서버가 인터넷에 바로 나서면 서버마다 인증서를 두고 HTTPS를 처리해야 하고, 여러 대로 늘렸을 때 요청을 나눠 줄 곳도 따로 없다. 리버스 프록시는 바깥 연결을 한곳에서 받아 HTTPS 암호화를 풀고 뒤의 서버들로 나눠 넘겨서, 인증서 관리와 요청 나누기를 서버들 앞의 한 자리로 모은다.',
  use: '스프링 부트 서버 앞에 nginx나 클라우드 로드 밸런서를 두어 HTTPS 처리와 요청 나누기를 맡기는 구성이 흔하다. nginx는 proxy_set_header로 X-Forwarded-For와 X-Forwarded-Proto를 붙이고, 스프링 부트는 application.properties의 server.forward-headers-strategy로 그 헤더를 읽게 한다. 그러면 접속 기록, 주소별 요청 수 제한, https:// 리다이렉트 주소를 만드는 코드가 request.getRemoteAddr()와 request.getScheme()만 불러도 원래 클라이언트의 값을 얻는다.',
  intro: '프록시는 요청을 대신 받아 다른 곳으로 넘겨 주는 중간 서버입니다. 클라이언트 쪽에 서서 클라이언트를 대신하면 포워드 프록시, 서버 쪽에 서서 서버를 대신하면 리버스 프록시입니다. 이 실습은 리버스 프록시로 가장 흔히 쓰는 nginx를 스프링 부트 서버 앞에 둡니다. 서버와 실제로 TCP 연결을 맺는 것은 nginx라서 톰캣이 보는 연결 상대는 nginx의 주소입니다. 그래서 nginx가 원래 주소와 프로토콜을 X-Forwarded-For, X-Forwarded-Proto 헤더로 전하고, 스프링 부트는 server.forward-headers-strategy 설정에 따라 그 헤더를 읽어 request.getRemoteAddr()와 request.getScheme()의 값을 바꿉니다. 이 헤더는 클라이언트도 마음대로 써넣을 수 있다는 점이 함정입니다.',
  terms: ['리버스 프록시', '포워드 프록시', 'X-Forwarded-For', 'X-Forwarded-Proto와 TLS 종료', 'server.forward-headers-strategy', 'RemoteIpValve와 internal-proxies', 'ForwardedHeaderFilter', 'HTTPS와 TLS'],
  controls: [
    { id: 'path', label: '요청이 지나는 길', type: 'select', value: 'reverse', options: [['reverse', 'nginx(리버스 프록시)를 거쳐 스프링 부트로'], ['direct', '스프링 부트에 바로 연결 (앞에 프록시 없음)']] },
    { id: 'ngx', label: 'nginx의 location 설정', type: 'select', value: 'append', options: [['append', 'X-Forwarded-For $proxy_add_x_forwarded_for (받은 값 뒤에 덧붙임)'], ['set', 'X-Forwarded-For $remote_addr (받은 값을 버리고 새로 씀)'], ['none', 'proxy_set_header 줄 없음 (받은 헤더를 그대로 넘김)']], show: function (c) { return c.path !== 'direct'; } },
    { id: 'spoof', label: '클라이언트가 X-Forwarded-For: 198.51.100.99를 직접 써넣는다', type: 'check', value: true },
    { id: 'fhs', label: '스프링 부트 server.forward-headers-strategy', type: 'select', value: 'native', options: [['native', 'native (톰캣의 RemoteIpValve가 읽음)'], ['framework', 'framework (스프링의 ForwardedHeaderFilter가 읽음)'], ['none', 'none (읽지 않음, 클라우드가 아닐 때의 기본값)'], ['manual', 'none으로 두고 컨트롤러가 헤더를 직접 split해 맨 앞 값을 씀']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'nginx가 $proxy_add_x_forwarded_for로 주소를 덧붙이고 스프링 부트가 native로 읽을 때, 클라이언트가 가짜 X-Forwarded-For를 써넣으면 getRemoteAddr()는 누구의 주소인가', d: '톰캣이 X-Forwarded-For를 뒤에서부터 읽어 nginx가 붙인 값을 고릅니다.', v: { path: 'reverse', ngx: 'append', spoof: true, fhs: 'native' } },
    { t: '설정하지 않으면', q: 'server.forward-headers-strategy를 정하지 않으면(none) getRemoteAddr()와 getScheme()은 무엇을 돌려주나', d: '모든 요청이 nginx 한 대의 주소에서, http로 온 것으로 보입니다.', v: { path: 'reverse', ngx: 'append', spoof: false, fhs: 'none' } },
    { t: 'framework로 읽으면', q: '같은 nginx 설정에서 스프링 부트를 framework로 바꾸면 가짜 X-Forwarded-For에 속는가', d: 'ForwardedHeaderFilter는 X-Forwarded-For의 맨 앞 값을 씁니다.', v: { path: 'reverse', ngx: 'append', spoof: true, fhs: 'framework' } },
    { t: 'nginx가 새로 쓰면', q: 'nginx가 X-Forwarded-For를 $remote_addr로 새로 쓰면 framework도 속지 않는가', d: '클라이언트가 써넣은 값이 nginx에서 사라집니다.', v: { path: 'reverse', ngx: 'set', spoof: true, fhs: 'framework' } },
    { t: 'nginx에 헤더 줄이 없으면', q: 'nginx에 proxy_set_header 줄이 없는데 클라이언트가 가짜 X-Forwarded-For를 써넣으면 native는 어떻게 되나', d: 'nginx가 받은 헤더를 그대로 넘겨서, 톰캣은 클라이언트가 쓴 값만 받습니다.', v: { path: 'reverse', ngx: 'none', spoof: true, fhs: 'native' } },
    { t: '프록시 없이 framework를 켜면', q: '앞에 프록시가 없는 서버에서 framework를 켜고 클라이언트가 가짜 X-Forwarded-For를 써넣으면', d: 'ForwardedHeaderFilter는 연결 상대가 누구인지 따지지 않습니다.', v: { path: 'direct', spoof: true, fhs: 'framework' } },
    { t: '직접 split해서 읽으면', q: '설정은 none으로 두고 컨트롤러가 X-Forwarded-For를 직접 split해 맨 앞 값을 쓰면', d: '속에서 하는 일을 손으로 하면 위조된 앞쪽 값을 믿기 쉽습니다.', v: { path: 'reverse', ngx: 'append', spoof: true, fhs: 'manual' } },
  ],
  // 직접 연결에는 nginx가 없으므로 nginx 설정을 하나로 고정한다
  fix: function (c) { return c.path === 'direct' ? { ngx: 'none' } : null; },
  CL: '203.0.113.7', FG: '198.51.100.99', PX: '10.0.0.5',
  judge: function (c) {
    var CL = this.CL, FG = this.FG, PX = this.PX, direct = c.path === 'direct', remote = direct ? CL : PX;
    var list = c.spoof ? [FG] : [];                                       // 톰캣에 도착한 X-Forwarded-For
    if (!direct && c.ngx === 'append') list = list.concat([CL]);          // $proxy_add_x_forwarded_for: 받은 값 뒤에 $remote_addr를 덧붙임
    if (!direct && c.ngx === 'set') list = [CL];                          // $remote_addr: 받은 값을 버리고 새로 씀
    var xfp = !direct && c.ngx !== 'none' ? 'https' : '';                 // proxy_set_header X-Forwarded-Proto $scheme
    var addr = remote, scheme = 'http', valve = '';
    if ((c.fhs === 'framework' || c.fhs === 'manual') && list.length) addr = list[0];   // 맨 앞 값
    if (c.fhs === 'framework' && xfp) scheme = xfp;
    if (c.fhs === 'native') {
      if (remote !== PX) valve = 'skip';                                  // 연결 상대가 internal-proxies에 맞지 않으면 헤더를 읽지 않음
      else { valve = 'read'; for (var i = list.length - 1; i >= 0; i--) { if (list[i] !== PX) { addr = list[i]; break; } } if (xfp) scheme = xfp; }
    }
    return { direct: direct, remote: remote, list: list, xfp: xfp, addr: addr, scheme: scheme, valve: valve, verdict: addr === CL ? 'ok' : addr === FG ? 'forged' : 'proxy', want: direct ? 'http' : 'https' };
  },
  code: function (c) {
    var s = '';
    if (c.path === 'direct') s += '# 앞에 nginx 없음: 클라이언트가 스프링 부트의 8080 포트에 바로 연결한다\n\n';
    else {
      var ln = { append: '        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n', set: '        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-For $remote_addr;\n        proxy_set_header X-Forwarded-Proto $scheme;\n', none: '        # proxy_set_header 줄 없음: 클라이언트가 보낸 헤더를 그대로 넘긴다\n' }[c.ngx];
      s += '# nginx 설정 (shop.example의 443 포트에서 HTTPS를 받아 app 서버로 넘긴다)\nserver {\n    listen 443 ssl;\n    server_name shop.example;\n    # … 인증서(ssl_certificate) 설정 생략\n\n    location / {\n        proxy_pass http://app:8080;\n' + ln + '    }\n}\n\n';
    }
    s += '# application.properties (스프링 부트)\n';
    s += { native: '# 톰캣의 RemoteIpValve가 X-Forwarded-* 헤더를 읽는다\n# 믿는 프록시 주소는 server.tomcat.remoteip.internal-proxies (기본값에 10.0.0.0/8 같은 사설 주소 범위가 있다)\nserver.forward-headers-strategy=native\n', framework: '# 스프링의 ForwardedHeaderFilter가 X-Forwarded-* 헤더를 읽는다\nserver.forward-headers-strategy=framework\n', none: '# 아무도 X-Forwarded-* 헤더를 읽지 않는다 (클라우드 플랫폼이 아니면 정하지 않은 것과 같다)\nserver.forward-headers-strategy=none\n', manual: '# 아무도 X-Forwarded-* 헤더를 읽지 않는다 (클라우드 플랫폼이 아니면 정하지 않은 것과 같다)\nserver.forward-headers-strategy=none\n' }[c.fhs];
    var body = c.fhs === 'manual'
      ? '        // 헤더를 직접 나눠 맨 앞 값을 쓴다\n        String xff = request.getHeader("X-Forwarded-For");\n        String client = xff != null ? xff.split(",")[0].trim() : request.getRemoteAddr();\n        return client + " " + request.getScheme();\n'
      : '        return request.getRemoteAddr() + " " + request.getScheme();\n';
    s += '\n// WhoAmIController.java  (WhoAmIController는 예시로 만든 컨트롤러다. HttpServletRequest와 getRemoteAddr()·getScheme()은 서블릿 API가 준다)\nimport jakarta.servlet.http.HttpServletRequest;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\npublic class WhoAmIController {\n    @GetMapping("/whoami")\n    public String whoami(HttpServletRequest request) {\n' + body + '    }\n}';
    return s;
  },
  label: function (c) { return (c.path === 'direct' ? '프록시 없음' : 'nginx ' + { append: '$proxy_add_x_forwarded_for', set: '$remote_addr', none: '헤더 줄 없음' }[c.ngx]) + (c.spoof ? ' · 위조 헤더 있음' : '') + ' · ' + { native: 'native', framework: 'framework', none: 'none', manual: 'none + 직접 split' }[c.fhs]; },
  columns: ['톰캣에 연결한 상대', '도착한 X-Forwarded-For', '도착한 X-Forwarded-Proto', '컨트롤러가 얻은 클라이언트 주소', 'request.getScheme()'],
  simulate: function (c) {
    var j = this.judge(c), CL = this.CL, FG = this.FG, PX = this.PX, ev = [], sum = [], rev = !j.direct;
    var st = { hop: 0, remote: '', xff: '', xfp: '', addr: '', scheme: '', verdict: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var spoofTxt = c.spoof ? ' 이 클라이언트는 요청에 X-Forwarded-For: ' + FG + ' 헤더를 직접 써넣었습니다. 요청 헤더는 보내는 쪽이 마음대로 적을 수 있는 글자입니다.' : '';
    var xffStr = j.list.length ? j.list.join(', ') : '없음';
    st.hop = 1;
    if (rev) push('클라이언트(' + CL + ')가 https://shop.example/whoami를 요청합니다. shop.example이 가리키는 곳은 nginx(' + PX + ')입니다. 클라이언트는 nginx를 서버로 알고, 그 뒤에 스프링 부트 서버(app)가 따로 있다는 것을 모릅니다.' + spoofTxt, c.spoof ? 'bad' : '');
    else push('클라이언트(' + CL + ')가 스프링 부트 서버의 8080 포트에 바로 HTTP로 연결해 GET /whoami를 보냅니다. 앞에 nginx가 없습니다.' + spoofTxt, c.spoof ? 'bad' : '');
    if (rev) {
      st.hop = 2;
      var how = { append: 'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for 줄에 따라, 받은 X-Forwarded-For 뒤에 자신에게 연결한 상대의 주소($remote_addr, ' + CL + ')를 쉼표로 이어 붙입니다.' + (c.spoof ? ' 그래서 클라이언트가 써넣은 값이 앞에, nginx가 붙인 값이 뒤에 놓입니다.' : ' 받은 값이 없으므로 ' + CL + '만 적힙니다.'), set: 'proxy_set_header X-Forwarded-For $remote_addr 줄에 따라, 받은 X-Forwarded-For를 버리고 자신에게 연결한 상대의 주소(' + CL + ')만 적습니다.' + (c.spoof ? ' 클라이언트가 써넣은 값은 여기서 사라집니다.' : ''), none: 'location에 proxy_set_header 줄이 없으므로 X-Forwarded-For를 붙이지 않고, 클라이언트가 보낸 헤더를 그대로 넘깁니다.' + (c.spoof ? ' 클라이언트가 써넣은 값도 그대로 넘어갑니다.' : '') }[c.ngx];
      push('nginx가 HTTPS 암호화를 풀고, proxy_pass http://app:8080에 따라 내부망의 스프링 부트 서버에 새 TCP 연결을 맺어 요청을 HTTP로 넘깁니다. ' + how + (c.ngx !== 'none' ? ' X-Forwarded-Proto $scheme 줄로 클라이언트가 쓴 프로토콜(https)도 적고, Host $host 줄로 클라이언트가 요청한 이름(shop.example)을 그대로 넘깁니다.' : ''), c.ngx === 'none' ? 'hot' : 'good');
    }
    st.remote = j.remote; st.xff = xffStr; st.xfp = j.xfp || '없음';
    var got = j.list.length ? '도착한 X-Forwarded-For는 "' + xffStr + '"' + (j.xfp ? ', X-Forwarded-Proto는 https입니다.' : '이고, X-Forwarded-Proto는 없습니다.') : '도착한 요청에 X-Forwarded-For' + (j.xfp ? '는 없고 X-Forwarded-Proto는 https입니다.' : '와 X-Forwarded-Proto 헤더가 없습니다.');
    if (rev) push('톰캣이 요청을 받습니다. TCP 연결 상대는 ' + PX + ', nginx의 주소입니다. 톰캣과 연결을 맺은 것은 nginx이기 때문이고, 받은 연결도 암호화되지 않은 HTTP입니다. ' + got, 'hot');
    else push('톰캣이 요청을 받습니다. TCP 연결 상대는 ' + CL + ', 클라이언트의 주소입니다. 이 값은 요청에 적힌 글자가 아니라 TCP 연결에서 나오므로 헤더를 어떻게 적어도 바뀌지 않습니다. ' + got, 'good');
    var proc;
    if (c.fhs === 'none') proc = 'server.forward-headers-strategy가 none이라 톰캣도 스프링도 X-Forwarded-* 헤더를 읽지 않습니다. getRemoteAddr()는 TCP 연결 상대를, getScheme()은 톰캣이 받은 연결의 프로토콜을 그대로 돌려줍니다.';
    else if (c.fhs === 'manual') proc = 'server.forward-headers-strategy가 none이라 getRemoteAddr()는 TCP 연결 상대를 그대로 돌려줍니다. 대신 컨트롤러가 request.getHeader("X-Forwarded-For")를 쉼표로 나눠 맨 앞 값을 클라이언트 주소로 씁니다.' + (j.list.length ? '' : ' 헤더가 없으므로 getRemoteAddr()의 값을 씁니다.');
    else if (c.fhs === 'framework') proc = '스프링의 ForwardedHeaderFilter가 컨트롤러보다 먼저 요청을 받아, X-Forwarded-* 헤더의 값을 돌려주는 요청 객체로 바꿔 넘깁니다. 이 필터는 연결 상대가 누구인지 따지지 않고, X-Forwarded-For가 있으면 그 맨 앞 값을 getRemoteAddr()의 값으로 씁니다.' + (j.list.length ? '' : ' 지금은 X-Forwarded-For가 없으므로 연결 상대가 그대로 남습니다.') + (j.xfp ? ' X-Forwarded-Proto: https로 getScheme()은 https가 됩니다.' : '');
    else if (j.valve === 'skip') proc = '톰캣의 RemoteIpValve가 요청을 컨트롤러에 넘기기 전에 연결 상대(' + CL + ')를 server.tomcat.remoteip.internal-proxies와 맞춰 봅니다. 사설 주소 범위에 들지 않아 믿는 프록시가 아니므로 X-Forwarded-* 헤더를 읽지 않고 그대로 둡니다.';
    else proc = '톰캣의 RemoteIpValve가 요청을 컨트롤러에 넘기기 전에 연결 상대(' + PX + ')를 server.tomcat.remoteip.internal-proxies와 맞춰 봅니다. 기본값(10.0.0.0/8 같은 사설 주소 범위)에 드는 주소라 믿는 프록시로 보고 헤더를 읽습니다.' + (j.list.length ? ' X-Forwarded-For를 뒤에서부터 읽어, 믿는 프록시가 아닌 첫 주소(' + j.addr + ')를 getRemoteAddr()의 값으로 정합니다.' + (j.list.length > 1 ? ' 그보다 앞의 값은 보지 않습니다.' : '') : ' X-Forwarded-For가 없으므로 주소는 그대로입니다.') + (j.xfp ? ' X-Forwarded-Proto: https로 getScheme()은 https가 됩니다.' : ' X-Forwarded-Proto가 없으므로 getScheme()은 http로 남습니다.');
    push(proc, '');
    st.addr = j.addr; st.scheme = j.scheme; st.verdict = j.verdict;
    var who = c.fhs === 'manual' ? '컨트롤러가 정한 클라이언트 주소는 ' : 'request.getRemoteAddr()는 ';
    var res = j.verdict === 'ok' ? j.addr + ', 실제 클라이언트의 주소입니다.' : j.verdict === 'forged' ? j.addr + '입니다. 클라이언트가 직접 써넣은 가짜 주소를 믿었습니다.' : j.addr + ', nginx의 주소입니다. nginx를 거쳐 오는 모든 사용자가 같은 주소로 기록됩니다.';
    var sch = ' request.getScheme()은 ' + j.scheme + (j.scheme === j.want ? (rev ? '로, 사용자가 쓴 프로토콜과 같습니다.' : '입니다.') : '입니다. 사용자는 https로 접속했는데 서버는 http로 압니다.');
    push(who + res + sch, j.verdict === 'ok' && j.scheme === j.want ? 'good' : 'bad');
    // 요약
    if (j.verdict === 'ok' && c.fhs === 'native' && rev) sum.push('native는 톰캣의 RemoteIpValve가 헤더를 읽습니다. 연결 상대가 믿는 프록시(internal-proxies)일 때만 헤더를 보고, X-Forwarded-For를 뒤에서부터 읽어 믿는 프록시가 아닌 첫 주소를 고릅니다. 맨 뒤 값은 nginx가 직접 붙인 것이라 클라이언트가 앞에 무엇을 써넣어도 속지 않습니다.');
    if (j.verdict === 'ok' && c.fhs === 'native' && !rev) sum.push('native는 연결 상대가 믿는 프록시가 아니면 X-Forwarded-* 헤더를 무시합니다. 프록시 없이 직접 받는 서버에서도 클라이언트가 써넣은 값에 속지 않습니다.');
    if (c.fhs === 'none' && rev) sum.push('스프링 부트는 클라우드 플랫폼(Kubernetes 등)을 알아본 경우가 아니면 server.forward-headers-strategy의 기본값이 none입니다. nginx가 헤더를 붙여도 아무도 읽지 않으므로, 접속 기록과 주소별 요청 수 제한은 nginx 한 대의 주소로 모이고 https:// 리다이렉트 주소도 http://로 만들어집니다.');
    if (c.fhs === 'framework' && j.verdict === 'forged') sum.push('framework는 스프링의 ForwardedHeaderFilter가 X-Forwarded-For의 맨 앞 값을 씁니다. 연결 상대가 믿는 프록시인지 따지지 않으므로, 맨 앞에 남은 클라이언트의 값을 믿습니다. 스프링 문서는 바깥과 맞닿은 프록시가 이 헤더들을 지우거나 새로 써야 한다고 말합니다. framework를 쓰려면 nginx를 $remote_addr로 새로 쓰게 합니다.');
    if (c.fhs === 'framework' && j.verdict === 'ok' && rev) sum.push(c.ngx === 'set' ? 'nginx가 X-Forwarded-For를 $remote_addr로 새로 쓰면 톰캣에 도착하는 값은 nginx가 본 연결 상대 하나뿐입니다. 맨 앞 값을 쓰는 framework도 이 값만 보게 되어 속지 않습니다.' : '이번에는 맞았지만 framework는 맨 앞 값을 쓰므로, 클라이언트가 X-Forwarded-For를 써넣으면 그 값을 믿습니다. nginx를 $remote_addr로 새로 쓰게 해 두는 편이 안전합니다.');
    if (c.fhs === 'native' && j.verdict === 'forged') sum.push('nginx가 X-Forwarded-For에 손대지 않으면 톰캣에 도착한 값은 모두 클라이언트가 쓴 것입니다. 연결 상대가 믿는 프록시(nginx)이므로 RemoteIpValve는 그 값을 받아들입니다. 설정 한쪽만으로는 안 되고, nginx가 헤더를 붙이거나 새로 쓰고 스프링 부트가 그것을 읽는 두 설정이 짝을 이뤄야 합니다.');
    if (j.direct && c.fhs === 'framework' && c.spoof) sum.push('앞에 프록시가 없는 서버에서 framework를 켜면 누구나 X-Forwarded-For로 자기 주소를 속일 수 있습니다. 이 설정은 믿을 수 있는 프록시 뒤에서만 켭니다.');
    if (c.fhs === 'manual') sum.push('X-Forwarded-For를 쉼표로 나눠 맨 앞 값을 쓰는 것은 ForwardedHeaderFilter가 속에서 하는 일과 같은 모양입니다. 직접 하면 이처럼 클라이언트가 써넣은 앞쪽 값을 믿는 실수가 생기기 쉽고, getScheme()도 따로 고쳐야 합니다. 뒤에서부터 믿는 프록시를 건너뛰며 읽는 일은 native(톰캣의 RemoteIpValve)가 이미 해 주므로, 직접 짜기보다 설정으로 맡기는 편이 낫습니다.');
    if (rev && !j.xfp) sum.push('nginx가 X-Forwarded-Proto를 주지 않으면 서버는 자신이 받은 HTTP 연결만 보고 사용자가 http로 접속했다고 여깁니다. 리다이렉트 주소를 http://로 만들거나 "HTTPS로 온 요청만 허용" 같은 조건을 잘못 판단하게 됩니다.');
    if (sum.length === 0) sum.push(j.direct ? '프록시가 없으면 TCP 연결 상대가 곧 클라이언트의 주소입니다. X-Forwarded-For는 믿을 수 있는 프록시가 앞에 있을 때에만 읽어야 합니다.' : '리버스 프록시는 서버 쪽에 서서 서버를 대신합니다. 클라이언트는 nginx를 서버로 알고, 뒤에 있는 스프링 부트 서버는 모릅니다.');
    var vTxt = { ok: '맞음', forged: '위조된 주소에 속음', proxy: 'nginx의 주소' }[j.verdict];
    return { events: ev, summary: sum, j: j, row: [j.remote + (j.direct ? ' (클라이언트)' : ' (nginx)'), xffStr, j.xfp || '없음', j.addr + ' (' + vTxt + ')', j.scheme + (j.scheme === j.want ? '' : ' (사용자는 https로 접속)')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, j = sim.j;
    if (!s) { H.text(v, '실행을 누르면 요청이 클라이언트에서 컨트롤러까지 한 구간씩 갑니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '클라이언트', this.CL + (c.spoof ? ' · X-Forwarded-For: ' + this.FG + '를 써넣어 보냄' : ' · 헤더를 써넣지 않음'), c.spoof ? 'bad' : 'wait');
    if (!j.direct) H.lane(ln, 'nginx', s.hop >= 2 ? this.PX + ' · X-Forwarded-For를 ' + { none: '붙이지 않고 그대로 넘김', append: '뒤에 덧붙여 넘김', set: '새로 써서 넘김' }[c.ngx] : this.PX + ' · 요청을 받는 중', s.hop >= 2 ? (c.ngx === 'none' ? 'hot' : 'good') : 'none');
    H.table(v, ['톰캣이 받은 것', '값', '누가 정한 값인가'], [
      { cells: ['TCP 연결 상대', s.remote || '?', 'TCP 연결 (요청으로 바꿀 수 없음)'] },
      { cells: ['X-Forwarded-For', s.xff || '?', !s.xff ? '?' : s.xff === '없음' ? '-' : '요청 헤더 (보내는 쪽이 적은 글자)'] },
      { cells: ['X-Forwarded-Proto', s.xfp || '?', !s.xfp ? '?' : s.xfp === '없음' ? '-' : '요청 헤더 (nginx가 적음)'] },
      { cells: [c.fhs === 'manual' ? '컨트롤러가 정한 주소' : 'getRemoteAddr()', s.addr || '?', { native: 'RemoteIpValve (native)', framework: 'ForwardedHeaderFilter (framework)', none: 'TCP 연결 그대로 (none)', manual: '컨트롤러의 split 코드' }[c.fhs]] },
      { cells: ['getScheme()', s.scheme || '?', !s.scheme ? '?' : s.scheme === 'https' ? 'X-Forwarded-Proto를 읽음' : '톰캣이 받은 연결'] },
    ], '스프링 부트가 클라이언트에 대해 알게 된 것');
  },
  // 그림: 클라이언트, nginx, 스프링 부트(톰캣)를 가로로 놓고, 아래에 톰캣이 받은 값과 컨트롤러가 얻은 값을 한 줄씩 보인다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], c = sim.c, j = sim.j, s = last ? last.snap : { hop: 0, remote: '', xff: '', xfp: '', addr: '', scheme: '', verdict: '' }, rev = !j.direct;
    P.size(680, 318);
    P.box('cl', 30, 30, 170, 66, { cls: c.spoof ? 'bad' : 'wait', title: '클라이언트', sub: c.spoof ? [this.CL, '가짜 헤더를 써넣음'] : [this.CL] });
    if (rev) P.box('px', 255, 30, 170, 66, { cls: s.hop >= 2 ? 'hot' : 'plain', title: 'nginx', sub: [this.PX, '밖에서는 shop.example'] });
    P.box('sv', 480, 30, 170, 66, { cls: !s.addr ? (s.remote ? 'wait' : 'plain') : s.verdict === 'ok' && s.scheme === j.want ? 'good' : 'bad', title: '스프링 부트 (톰캣)', sub: [rev ? 'app:8080 · 내부망' : '8080 포트', 'strategy=' + (c.fhs === 'manual' ? 'none' : c.fhs)] });
    if (!rev) { if (s.hop >= 1) P.arrow('a1', 'cl:r', 'sv:l', { label: 'HTTP 연결' }); }
    else { if (s.hop >= 1) P.arrow('a1', 'cl:r', 'px:l', { label: 'HTTPS' }); if (s.hop >= 2) P.arrow('a2', 'px:r', 'sv:l', { cls: 'hot', label: 'HTTP' }); }
    P.box('v1', 16, 120, 648, 34, { cls: !s.remote ? 'ghost' : rev ? 'hot' : 'good', title: '톰캣에 연결한 상대', right: s.remote ? s.remote + (rev ? ' (nginx)' : ' (클라이언트)') : '?' });
    P.box('v2', 16, 162, 648, 34, { cls: !s.xff ? 'ghost' : 'plain', title: '도착한 X-Forwarded-For', right: s.xff || '?' });
    P.box('v3', 16, 204, 648, 34, { cls: !s.addr ? 'ghost' : s.verdict === 'ok' ? 'good' : 'bad', title: c.fhs === 'manual' ? '컨트롤러가 정한 클라이언트 주소' : 'request.getRemoteAddr()', right: s.addr ? s.addr + ' (' + { ok: '맞음', forged: '위조된 주소에 속음', proxy: 'nginx의 주소' }[s.verdict] + ')' : '?' });
    P.box('v4', 16, 246, 648, 34, { cls: !s.scheme ? 'ghost' : s.scheme === j.want ? 'good' : 'bad', title: 'request.getScheme()', right: s.scheme ? s.scheme + (s.scheme === j.want ? '' : ' (사용자는 https로 접속)') : '?' });
    P.note('톰캣과 직접 연결을 맺은 쪽의 주소만이 "연결 상대"가 됩니다. 예시의 주소는 문서용으로 정해진 주소이고 10.0.0.x는 사설망 주소입니다.');
  },
  assume: '뒤쪽은 실제 스프링 부트 4.1.1(내장 톰캣 11.0.24, 스프링 프레임워크 7.0.9)로 실행했습니다. 화면의 WhoAmIController 글을 그대로 컴파일해 server.forward-headers-strategy를 none, native, framework로 바꿔 띄우고(직접 split하는 컨트롤러는 none으로), 32가지 조합에서 톰캣에 도착한 헤더와 컨트롤러가 돌려준 값을 기록해 다섯 열이 모두 모형과 같은 것을 확인했습니다. 설정을 아예 적지 않은 서버도 none과 같은 값을 돌려줬고, native일 때만 톰캣에 RemoteIpValve가, framework일 때만 ForwardedHeaderFilter가 등록된 것도 확인했습니다. 앞단의 nginx는 이 컴퓨터에 없어 실행하지 않았습니다. 대신 Node.js 24로 만든 작은 프록시가 nginx 문서(ngx_http_proxy_module)에 적힌 대로 헤더를 붙이게 해서 nginx 역할을 대신했습니다. $proxy_add_x_forwarded_for는 받은 X-Forwarded-For 뒤에 $remote_addr를 쉼표로 덧붙인 값이고 받은 헤더가 없으면 $remote_addr와 같다는 것, proxy_set_header 줄이 없으면 Host와 Connection만 바꾸고 나머지 요청 헤더는 그대로 넘긴다는 것은 문서 기준입니다. 실행은 한 컴퓨터의 루프백 주소(클라이언트 127.0.0.10, 프록시 127.0.0.20, 서버 127.0.0.30)로 했고, 화면의 주소(203.0.113.7과 198.51.100.99는 문서 예시용, 10.0.0.x는 사설망)는 그것을 바꿔 적은 것입니다. 스프링 부트 4.1.1의 internal-proxies 기본값은 10.0.0.0/8, 192.168.0.0/16, 127.0.0.0/8 같은 사설·루프백 주소 범위의 목록이라 루프백인 클라이언트도 믿습니다. 그래서 실행에서는 internal-proxies를 프록시 주소(127.0.0.20) 하나로 좁혀 "nginx(10.0.0.5)는 믿고 클라이언트(203.0.113.7)는 믿지 않는" 화면의 상황을 만들었고, 기본값이 10.0.0.5는 믿고 203.0.113.7과 198.51.100.99는 믿지 않는 것을 같은 실행에서 확인했습니다. 스프링 부트는 Kubernetes 같은 클라우드 플랫폼을 알아보면 이 설정의 기본값을 native로 바꾸는데, 이 실습은 그렇지 않은 경우만 다룹니다. X-Forwarded-For와 X-Forwarded-Proto는 표준이 아니라 널리 쓰이는 관례이고, 같은 정보를 전하는 표준 헤더로 Forwarded(RFC 7239)가 있습니다. 포워드 프록시, 프록시가 여러 대 이어진 경우, 로드밸런서의 분산은 다루지 않았습니다.',
});
