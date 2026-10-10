Lab.register({
  id: 'revproxy', nav: '프록시와 리버스 프록시', cat: '네트워크', mode: 'step',
  title: '프록시 뒤의 서버는 누가 요청했는지 어떻게 아나',
  intro: '프록시는 요청을 대신 받아 다른 곳으로 넘겨 주는 중간 서버입니다. 클라이언트 쪽에 서서 클라이언트를 대신하면 포워드 프록시, 서버 쪽에 서서 서버를 대신하면 리버스 프록시입니다. 어느 쪽이든 서버와 실제로 연결을 맺는 것은 프록시라서, 서버가 보는 상대 주소는 클라이언트가 아니라 프록시의 주소가 됩니다. 그래서 프록시가 X-Forwarded-For 같은 헤더로 원래 정보를 전해 주는데, 이 헤더는 클라이언트도 마음대로 써넣을 수 있습니다. 설정을 바꿔 가며 서버가 누구를 클라이언트로 판단하는지 보세요.',
  terms: ['포워드 프록시', '리버스 프록시', 'X-Forwarded-For', 'X-Forwarded-Proto와 TLS 종료', 'HTTPS와 TLS'],
  controls: [
    { id: 'path', label: '요청이 지나는 길', type: 'select', value: 'reverse', options: [['direct', '직접 연결 (프록시 없음)'], ['forward', '포워드 프록시를 거침 (클라이언트 쪽)'], ['reverse', '리버스 프록시를 거침 (서버 쪽)']] },
    { id: 'xff', label: '프록시가 X-Forwarded-For를', type: 'select', value: 'append', options: [['none', '붙이지 않는다 (받은 헤더를 그대로 넘김)'], ['append', '받은 값 뒤에 연결 상대의 주소를 덧붙인다'], ['set', '받은 값을 버리고 연결 상대의 주소만 새로 쓴다']], show: function (c) { return c.path !== 'direct'; } },
    { id: 'spoof', label: '클라이언트가 X-Forwarded-For: 198.51.100.99를 직접 써넣는다', type: 'check', value: true },
    { id: 'read', label: '서버가 클라이언트 주소로 삼는 것', type: 'select', value: 'first', options: [['remote', '연결 상대 주소 (TCP 연결의 상대)'], ['first', 'X-Forwarded-For의 맨 앞 값'], ['last', 'X-Forwarded-For의 맨 뒤 값']], hint: 'X-Forwarded-For 헤더가 없으면 연결 상대 주소를 씁니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '클라이언트가 써넣은 가짜 주소가 맨 앞에 남고, 서버가 그것을 믿습니다.', v: { path: 'reverse', xff: 'append', spoof: true, read: 'first' } },
    { t: '맨 뒤 값을 읽으면', d: '프록시가 직접 붙인 값이라 위조에 속지 않습니다.', v: { path: 'reverse', xff: 'append', spoof: true, read: 'last' } },
    { t: '프록시가 새로 쓰면', d: '클라이언트가 써넣은 값이 서버까지 가지 못합니다.', v: { path: 'reverse', xff: 'set', spoof: true, read: 'first' } },
    { t: '연결 상대 주소만 보면', d: '모든 사용자가 프록시 한 대의 주소로 보입니다.', v: { path: 'reverse', xff: 'append', spoof: false, read: 'remote' } },
    { t: '프록시가 아무것도 안 붙이면', d: '서버는 원래 주소도, 원래 HTTPS였다는 것도 알 수 없습니다.', v: { path: 'reverse', xff: 'none', spoof: false, read: 'first' } },
    { t: '포워드 프록시', d: '클라이언트가 일부러 거치는 프록시. 서버는 프록시만 봅니다.', v: { path: 'forward', xff: 'none', spoof: false, read: 'remote' } },
    { t: '프록시 없는 서버가 헤더를 믿으면', d: '직접 연결인데도 가짜 주소에 속습니다.', v: { path: 'direct', xff: 'none', spoof: true, read: 'first' } },
  ],
  // 직접 연결에는 프록시가 없으므로 프록시 설정을 하나로 고정한다
  fix: function (c) { return c.path === 'direct' ? { xff: 'none' } : null; },
  CL: '203.0.113.7', FG: '198.51.100.99', PX: { forward: '192.0.2.50', reverse: '10.0.0.5' },
  judge: function (c) {
    var CL = this.CL, FG = this.FG, direct = c.path === 'direct', px = direct ? '' : this.PX[c.path], remote = direct ? CL : px;
    var list = c.spoof ? [FG] : [];                                   // 클라이언트가 보낸 X-Forwarded-For
    if (!direct && c.xff === 'append') list.push(CL);                 // 프록시가 연결 상대(클라이언트)의 주소를 뒤에 덧붙임
    if (!direct && c.xff === 'set') list = [CL];                      // 프록시가 받은 값을 버리고 새로 씀
    var client = c.read === 'remote' || !list.length ? remote : c.read === 'first' ? list[0] : list[list.length - 1];
    var xfp = c.path !== 'reverse' ? 'na' : c.xff === 'none' ? 'none' : 'https';
    return { direct: direct, px: px, remote: remote, list: list, client: client, verdict: client === CL ? 'ok' : client === FG ? 'forged' : 'proxy', xfp: xfp };
  },
  code: function (c) {
    var read = { remote: 'const client = req.socket.remoteAddress;                 // 연결 상대 주소', first: 'const xff = req.headers[\'x-forwarded-for\'];\n    const client = xff ? xff.split(\',\')[0].trim()             // 맨 앞 값\n                       : req.socket.remoteAddress;', last: 'const xff = req.headers[\'x-forwarded-for\'];\n    const client = xff ? xff.split(\',\').pop().trim()          // 맨 뒤 값\n                       : req.socket.remoteAddress;' }[c.read];
    var srv = '// 서버: 누가 요청했는지 판단한다\nhttp.createServer((req, res) => {\n    ' + read + '\n    res.end(client);\n});';
    var cl = '\n\n// 클라이언트\n// curl ' + (c.spoof ? '-H \'X-Forwarded-For: 198.51.100.99\' ' : '') + (c.path === 'forward' ? '-x http://192.0.2.50:3128 http://shop.example/whoami' : c.path === 'reverse' ? 'https://shop.example/whoami' : 'http://shop.example/whoami');
    if (c.path === 'direct') return srv + cl;
    var x = { none: '    // X-Forwarded-For에 손대지 않는다', append: '    const peer = req.socket.remoteAddress;               // 이 프록시에 연결한 상대의 주소\n    const old = headers[\'x-forwarded-for\'];\n    headers[\'x-forwarded-for\'] = old ? old + \', \' + peer : peer;   // 받은 값 뒤에 덧붙인다', set: '    headers[\'x-forwarded-for\'] = req.socket.remoteAddress;       // 받은 값을 버리고 새로 쓴다' }[c.xff];
    var rev = c.path === 'reverse';
    var px = '// ' + (rev ? '리버스 프록시: HTTPS로 받아 뒤의 서버(10.0.0.9)로 넘긴다' : '포워드 프록시: 요청 줄에 적힌 주소로 대신 요청한다') + '\n' + (rev ? 'https.createServer(tls, ' : 'http.createServer(') + '(req, res) => {\n    const headers = { ...req.headers };\n' + x + (rev && c.xff !== 'none' ? '\n    headers[\'x-forwarded-proto\'] = \'https\';                  // 클라이언트가 쓴 원래 프로토콜' : '') + '\n    ' + (rev ? 'const to = { host: \'10.0.0.9\', port: 8080, path: req.url };' : 'const u = new URL(req.url);                           // 예: http://shop.example/whoami\n    const to = { host: u.hostname, port: u.port || 80, path: u.pathname };') + '\n    http.request({ ...to, method: req.method, headers }, up => {\n        res.writeHead(up.statusCode, up.headers);\n        up.pipe(res);                                      // 서버의 응답을 클라이언트에 그대로 돌려준다\n    }).end();\n});';
    return px + '\n\n' + srv + cl;
  },
  label: function (c) { return { direct: '직접 연결', forward: '포워드 프록시', reverse: '리버스 프록시' }[c.path] + (c.path === 'direct' ? '' : ' · XFF ' + { none: '안 붙임', append: '덧붙임', set: '새로 씀' }[c.xff]) + (c.spoof ? ' · 위조 헤더 있음' : '') + ' · 서버는 ' + { remote: '연결 상대 주소', first: '맨 앞 값', last: '맨 뒤 값' }[c.read] + ' 사용'; },
  columns: ['클라이언트가 연결한 상대', '서버가 본 연결 상대 주소', '서버가 받은 X-Forwarded-For', '서버가 판단한 클라이언트 주소', 'X-Forwarded-Proto'],
  simulate: function (c) {
    var j = this.judge(c), CL = this.CL, FG = this.FG, ev = [], sum = [], rev = c.path === 'reverse', fwd = c.path === 'forward';
    var st = { hop: 0, remote: '', xff: '', client: '', verdict: '', xfp: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var spoofTxt = c.spoof ? ' 이 클라이언트는 요청에 X-Forwarded-For: ' + FG + ' 헤더를 직접 써넣었습니다. 요청 헤더는 보내는 쪽이 마음대로 적을 수 있는 글자입니다.' : '';
    var xffStr = j.list.length ? j.list.join(', ') : '없음';
    st.hop = 1;
    if (j.direct) push('클라이언트(' + CL + ')가 shop.example 서버에 직접 TCP 연결을 맺고 GET /whoami 요청을 보냅니다. 중간에 아무것도 없습니다.' + spoofTxt, c.spoof ? 'bad' : '');
    else if (fwd) push('클라이언트(' + CL + ')는 포워드 프록시를 거치도록 설정돼 있습니다. 회사나 학교에서 밖으로 나가는 요청을 한곳으로 모을 때 쓰는 방식입니다. 클라이언트는 서버가 아니라 프록시(' + j.px + ')에 연결하고, 요청 줄에 전체 주소를 적어 "http://shop.example/whoami를 대신 가져와 달라"고 요청합니다.' + spoofTxt, c.spoof ? 'bad' : '');
    else push('클라이언트(' + CL + ')가 https://shop.example/whoami를 요청합니다. shop.example이라는 이름이 가리키는 곳은 실제로는 리버스 프록시입니다. 클라이언트는 따로 설정한 것이 없고, 지금 연결한 상대를 서버라고 여깁니다. 그 뒤에 진짜 서버가 따로 있다는 것을 알지 못합니다.' + spoofTxt, c.spoof ? 'bad' : '');
    if (!j.direct) {
      st.hop = 2;
      var how = { none: '이 프록시는 X-Forwarded-For를 붙이지 않고, 받은 헤더를 그대로 넘깁니다.' + (c.spoof ? ' 클라이언트가 써넣은 값도 그대로 넘어갑니다.' : ''), append: '이 프록시는 자신에게 연결한 상대의 주소(' + CL + ')를 X-Forwarded-For에 적어 넘깁니다.' + (c.spoof ? ' 이미 값이 들어 있으므로 그 뒤에 쉼표로 이어 덧붙입니다.' : ''), set: '이 프록시는 받은 X-Forwarded-For를 버리고, 자신에게 연결한 상대의 주소(' + CL + ')만 새로 적어 넘깁니다.' + (c.spoof ? ' 클라이언트가 써넣은 값은 여기서 사라집니다.' : '') }[c.xff];
      push((rev ? '리버스 프록시가 HTTPS 암호화를 풀고, 내부망의 진짜 서버(10.0.0.9)에 새 TCP 연결을 맺어 요청을 HTTP로 넘깁니다. ' : '포워드 프록시가 shop.example 서버에 새 TCP 연결을 맺고 요청을 대신 보냅니다. ') + how + (rev && c.xff !== 'none' ? ' 클라이언트가 원래 쓴 프로토콜도 X-Forwarded-Proto: https로 함께 적습니다.' : ''), c.xff === 'none' ? '' : 'good');
    }
    st.remote = j.remote;
    if (j.direct) push('서버가 연결 상대 주소를 확인합니다. ' + CL + ', 클라이언트의 주소입니다. 이 값은 요청에 적힌 글자가 아니라 TCP 연결에서 나오는 것이라, 클라이언트가 헤더를 어떻게 적어도 바뀌지 않습니다.', 'good');
    else push('서버가 연결 상대 주소를 확인합니다. ' + j.px + ', 프록시의 주소입니다. 서버와 TCP 연결을 맺은 것은 프록시이기 때문입니다. 연결만 봐서는 실제 클라이언트가 누구인지 알 수 없습니다.' + (rev ? ' 받은 연결도 암호화되지 않은 HTTP입니다.' : ''), 'hot');
    st.xff = xffStr; st.xfp = j.xfp;
    var got = j.list.length ? '서버가 받은 요청의 X-Forwarded-For는 "' + xffStr + '"입니다.' : '서버가 받은 요청에 X-Forwarded-For 헤더는 없습니다.';
    var who = !j.list.length ? '' : j.direct ? ' 중간에 프록시가 없으므로 이 값을 쓴 것은 클라이언트 자신입니다.' : c.xff === 'none' ? ' 프록시는 이 헤더에 손대지 않았으므로 이 값을 쓴 것은 클라이언트입니다.' : c.xff === 'append' && c.spoof ? ' 앞의 값은 클라이언트가 써넣은 것이고, 뒤의 값은 프록시가 덧붙인 것입니다. 헤더만 봐서는 둘을 구별할 수 없고, 위치로만 알 수 있습니다.' : ' 프록시가 적은 값입니다.';
    var pro = j.xfp === 'https' ? ' X-Forwarded-Proto: https도 함께 왔습니다.' : j.xfp === 'none' ? (j.list.length ? ' X-Forwarded-Proto 헤더는 없습니다.' : ' X-Forwarded-Proto 헤더도 없습니다.') + ' 서버는 사용자가 원래 HTTPS로 접속했다는 것을 알 방법이 없습니다.' : '';
    push(got + who + pro, '');
    st.client = j.client; st.verdict = j.verdict;
    var rule = c.read === 'remote' ? '서버는 연결 상대 주소를 클라이언트의 주소로 삼습니다.' : !j.list.length ? '서버는 X-Forwarded-For의 ' + (c.read === 'first' ? '맨 앞' : '맨 뒤') + ' 값을 쓰려고 하지만 헤더가 없습니다. 연결 상대 주소를 대신 씁니다.' : c.read === 'first' ? '서버는 X-Forwarded-For의 맨 앞 값을 클라이언트의 주소로 삼습니다.' : '서버는 X-Forwarded-For의 맨 뒤 값을 클라이언트의 주소로 삼습니다.';
    var res = j.verdict === 'ok' ? ' 결과는 ' + j.client + ', 실제 클라이언트의 주소입니다.' : j.verdict === 'forged' ? ' 결과는 ' + j.client + '입니다. 클라이언트가 직접 써넣은 가짜 주소입니다. 서버는 위조된 주소를 믿었습니다.' : ' 결과는 ' + j.client + ', 프록시의 주소입니다. 이 프록시를 거쳐 오는 모든 사용자가 같은 주소로 기록됩니다.';
    push(rule + res, j.verdict === 'ok' ? 'good' : 'bad');
    var vTxt = { ok: '맞음', forged: '위조된 주소에 속음', proxy: '프록시의 주소' }[j.verdict];
    sum.push('서버가 본 연결 상대는 ' + j.remote + (j.direct ? '(클라이언트)' : '(프록시)') + ', 받은 X-Forwarded-For는 ' + xffStr + ', 서버가 판단한 클라이언트 주소는 ' + j.client + '입니다(' + vTxt + ').');
    if (fwd) sum.push('포워드 프록시는 클라이언트 쪽에 서서 클라이언트를 대신합니다. 클라이언트는 프록시가 있다는 것을 알고 일부러 거치며, 서버는 프록시만 보고 실제 클라이언트를 모릅니다.' + (c.xff === 'none' ? ' 프록시가 아무것도 붙이지 않으면 클라이언트의 주소는 서버에 전해지지 않습니다.' : ' 다만 프록시가 X-Forwarded-For를 붙이면 클라이언트의 주소가 서버에 전해집니다.'));
    if (rev) sum.push('리버스 프록시는 서버 쪽에 서서 서버를 대신합니다. 클라이언트는 프록시를 서버로 알고, 뒤에 있는 진짜 서버는 모릅니다. HTTPS 처리, 여러 서버로 나누기, 응답 보관 같은 일을 서버 앞에서 맡습니다.');
    if (j.direct) sum.push('프록시가 없으면 연결 상대 주소가 곧 클라이언트의 주소입니다. 길을 포워드 프록시나 리버스 프록시로 바꿔 무엇이 달라지는지 비교해 보세요.');
    if (j.verdict === 'forged') sum.push(j.direct ? '프록시 뒤에 있지 않은 서버가 X-Forwarded-For를 믿으면 누구나 자기 주소를 속일 수 있습니다. 이 헤더는 믿을 수 있는 프록시가 앞에 있을 때에만 읽어야 합니다.' : c.xff === 'none' ? 'X-Forwarded-For는 클라이언트도 써넣을 수 있는 헤더입니다. 프록시가 이 헤더에 손대지 않고 넘기면 서버에 도착한 값은 전부 클라이언트가 쓴 것입니다. 주소로 접속을 제한하거나 요청 수를 세는 서버라면 이 틈으로 우회당합니다.' : 'X-Forwarded-For는 클라이언트도 써넣을 수 있는 헤더입니다. 프록시가 덧붙이는 방식에서 맨 앞 값은 클라이언트가 쓴 것일 수 있습니다. 믿을 수 있는 것은 내가 관리하는 프록시가 붙인 맨 뒤 값입니다.');
    if (j.verdict === 'proxy') sum.push(fwd ? '서버는 프록시의 주소만 알게 됩니다. 포워드 프록시를 쓰는 쪽에서 보면 클라이언트의 주소가 가려진 것입니다.' : '모든 사용자가 프록시 한 대의 주소로 보이면 접속 기록, 주소별 요청 수 제한, 지역 판단이 모두 어긋납니다. 프록시가 원래 주소를 헤더로 전하고, 서버는 그 헤더를 읽어야 합니다.');
    if (j.verdict === 'ok' && !j.direct) sum.push(c.xff === 'set' ? '프록시가 받은 값을 버리고 새로 쓰면 클라이언트가 써넣은 값이 서버까지 가지 못합니다. 바깥에서 오는 요청을 가장 먼저 받는 프록시에 맞는 설정입니다.' : c.read === 'last' ? '프록시가 한 대일 때 믿을 수 있는 값은 그 프록시가 직접 붙인 맨 뒤 값입니다. 프록시가 여러 대 이어져 있으면, 믿을 수 있는 프록시의 수만큼 뒤에서부터 세어 읽습니다.' : '이번에는 맞았지만 맨 앞 값은 클라이언트가 써넣을 수 있는 자리입니다. "클라이언트가 X-Forwarded-For를 직접 써넣는다"를 켜고 다시 실행해 보세요.');
    if (j.xfp === 'none') sum.push('프록시가 X-Forwarded-Proto를 주지 않으면 서버는 자신이 받은 HTTP 연결만 보고 사용자가 http로 접속했다고 여깁니다. 그래서 리다이렉트할 주소를 http://로 만들거나 "HTTPS로 온 요청만 허용" 같은 조건을 잘못 판단하게 됩니다.');
    if (j.xfp === 'https') sum.push('서버가 받은 연결은 HTTP지만, X-Forwarded-Proto: https 덕분에 사용자가 원래 HTTPS로 접속했다는 것을 압니다. 이 헤더도 X-Forwarded-For처럼 믿을 수 있는 프록시가 붙인 것만 써야 합니다.');
    var col0 = j.direct ? '서버 (직접 연결)' : fwd ? '포워드 프록시 (클라이언트가 설정함)' : '리버스 프록시 (서버인 줄 앎)';
    return { events: ev, summary: sum, j: j, row: [col0, j.remote + (j.direct ? ' (클라이언트)' : ' (프록시)'), xffStr, j.client + ' (' + vTxt + ')', j.xfp === 'na' ? '-' : j.xfp === 'https' ? 'https' : '없음 (원래 https였는지 모름)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, j = sim.j;
    if (!s) { H.text(v, '실행을 누르면 요청이 클라이언트에서 서버까지 한 구간씩 갑니다.'); return; }
    var vTxt = { ok: '맞음', forged: '위조된 주소에 속음', proxy: '프록시의 주소', '': '' }[s.verdict];
    H.counters(v, [[s.remote || '?', '서버가 본 연결 상대 주소'], [s.client ? s.client : '?', '서버가 판단한 클라이언트 주소'], [s.client ? vTxt : '?', '판단 결과']]);
    var ln = H.lanes(v);
    H.lane(ln, '클라이언트', this.CL + (c.spoof ? ' · X-Forwarded-For: ' + this.FG + '를 써넣어 보냄' : ' · 헤더를 써넣지 않음'), c.spoof ? 'bad' : 'wait');
    if (!j.direct) H.lane(ln, c.path === 'forward' ? '포워드 프록시' : '리버스 프록시', s.hop >= 2 ? j.px + ' · X-Forwarded-For를 ' + { none: '붙이지 않고 그대로 넘김', append: '뒤에 덧붙여 넘김', set: '새로 써서 넘김' }[c.xff] : j.px + ' · 요청을 받는 중', s.hop >= 2 ? (c.xff === 'none' ? 'hot' : 'good') : 'none');
    H.lane(ln, '서버', !s.remote ? '아직 요청이 도착하지 않음' : '연결 상대 ' + s.remote + (s.xff ? ' · X-Forwarded-For ' + s.xff : ''), !s.client ? (s.remote ? 'wait' : 'none') : s.verdict === 'ok' ? 'good' : 'bad');
    H.table(v, ['서버가 받은 것', '값', '누가 정한 값인가'], [
      { cells: ['연결 상대 주소', s.remote || '?', 'TCP 연결 (요청으로 바꿀 수 없음)'] },
      { cells: ['X-Forwarded-For', s.xff || '?', !s.xff ? '?' : s.xff === '없음' ? '-' : '요청 헤더 (보내는 쪽이 적은 글자)'] },
      { cells: ['X-Forwarded-Proto', !s.xfp ? '?' : s.xfp === 'https' ? 'https' : s.xfp === 'none' ? '없음' : '(프록시가 HTTPS를 푸는 경우에만 쓰임)', !s.xfp ? '?' : s.xfp === 'https' ? '요청 헤더 (프록시가 적음)' : '-'] },
    ], '서버가 클라이언트에 대해 알 수 있는 것');
  },
  // 그림: 클라이언트, 프록시, 서버를 가로로 놓는다. 점선 영역이 프록시가 어느 쪽 편인지(클라이언트 쪽인지 서버 쪽인지)를 나타낸다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], c = sim.c, j = sim.j, s = last ? last.snap : { hop: 0, remote: '', xff: '', client: '', verdict: '', xfp: '' }, rev = c.path === 'reverse', fwd = c.path === 'forward';
    P.size(680, 318);
    if (fwd) P.region('side', 16, 16, 424, 118, '클라이언트 쪽: 프록시가 클라이언트를 대신한다');
    if (rev) P.region('side', 240, 16, 424, 118, '서버 쪽: 프록시가 서버 앞에 선다');
    P.box('cl', 30, 50, 170, 66, { cls: c.spoof ? 'bad' : 'wait', title: '클라이언트', sub: c.spoof ? [this.CL, '가짜 헤더를 써넣음'] : [this.CL] });
    if (!j.direct) P.box('px', 255, 50, 170, 66, { cls: s.hop >= 2 ? 'hot' : 'plain', title: fwd ? '포워드 프록시' : '리버스 프록시', sub: [j.px, rev ? '밖에서는 shop.example' : '클라이언트가 설정함'] });
    P.box('sv', 480, 50, 170, 66, { cls: !s.client ? (s.remote ? 'wait' : 'plain') : s.verdict === 'ok' ? 'good' : 'bad', title: '서버', sub: rev ? ['10.0.0.9', '내부망에만 있음'] : ['shop.example'] });
    if (j.direct) { if (s.hop >= 1) P.arrow('a1', 'cl:r', 'sv:l', { label: 'HTTP 연결' }); }
    else { if (s.hop >= 1) P.arrow('a1', 'cl:r', 'px:l', { label: rev ? 'HTTPS' : 'HTTP' }); if (s.hop >= 2) P.arrow('a2', 'px:r', 'sv:l', { cls: 'hot', label: 'HTTP' }); }
    P.box('v1', 16, 150, 648, 34, { cls: !s.remote ? 'ghost' : j.direct ? 'good' : 'hot', title: '서버가 본 연결 상대 주소', right: s.remote ? s.remote + (j.direct ? ' (클라이언트)' : ' (프록시)') : '?' });
    P.box('v2', 16, 192, 648, 34, { cls: !s.xff ? 'ghost' : 'plain', title: '서버가 받은 X-Forwarded-For', right: s.xff || '?' });
    P.box('v3', 16, 234, 648, 34, { cls: !s.client ? 'ghost' : s.verdict === 'ok' ? 'good' : 'bad', title: '서버가 판단한 클라이언트 주소', right: s.client ? s.client + ' (' + { ok: '맞음', forged: '위조된 주소에 속음', proxy: '프록시의 주소' }[s.verdict] + ')' : '?' });
    P.box('v4', 16, 276, 648, 34, { cls: !s.xfp || s.xfp === 'na' ? 'ghost' : s.xfp === 'https' ? 'good' : 'bad', title: '서버가 받은 X-Forwarded-Proto', right: !s.xfp ? '?' : s.xfp === 'https' ? 'https' : s.xfp === 'none' ? '없음 (원래 https였는지 모름)' : '쓰이지 않음' });
    P.note('서버와 직접 연결을 맺은 쪽의 주소만이 "연결 상대 주소"가 됩니다. 프록시가 끼면 그 자리에 프록시의 주소가 들어가고, 원래 클라이언트의 주소는 프록시가 헤더에 적어 줘야 전해집니다. 예시의 주소는 문서용으로 정해진 주소입니다.');
  },
  assume: '서로 다른 42가지 조합(직접 연결에는 프록시 설정이 쓰이지 않음)을 이 PC 안에서 실행해 다섯 열이 모두 모형과 같은 것을 확인했습니다. 클라이언트, 프록시, 서버를 이 PC의 루프백 주소 셋(127.0.0.10, 127.0.0.20, 127.0.0.30)에 나눠 띄우고, Node.js 24로 만든 작은 프록시와 서버에 두 가지 클라이언트(Node의 http·https 모듈, curl 8.21)로 요청해 서버가 실제로 본 연결 상대 주소와 헤더를 기록했습니다. 두 클라이언트의 결과는 모든 조합에서 같았습니다. 리버스 프록시는 시험용 인증서로 HTTPS를 받아 서버에는 HTTP로 넘겼고, 포워드 프록시에는 curl의 -x 옵션으로 요청해 요청 줄에 전체 주소가 실려 오는 것을 확인했습니다. 화면의 주소(203.0.113.7, 198.51.100.99, 192.0.2.50)는 문서 예시용으로 정해진 주소이고 10.0.0.x는 사설망 주소이며, 시험에 쓴 루프백 주소를 바꿔 적은 것입니다. 프록시는 시험용으로 직접 만든 것이라 실제 제품의 기본 동작과는 다를 수 있습니다. 예를 들어 nginx는 따로 설정하지 않으면 받은 헤더를 그대로 넘기고, proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for가 "덧붙이기", $remote_addr가 "새로 쓰기"에 해당합니다(nginx 문서 기준이며 실행으로 확인하지 않았습니다). X-Forwarded-For와 X-Forwarded-Proto는 표준이 아니라 널리 쓰이는 관례이고, 같은 정보를 담는 표준 헤더로 Forwarded(RFC 7239)가 있습니다. HTTPS 요청을 포워드 프록시로 보낼 때는 프록시가 내용을 볼 수 없는 통로(CONNECT)만 이어 주므로 헤더를 덧붙일 수 없는데, 이 실습의 포워드 프록시는 HTTP 요청만 다뤘습니다. 서버가 헤더가 없을 때 연결 상대 주소를 대신 쓰는 것은 이 모형에서 정한 규칙입니다. 프록시가 여러 대 이어진 경우와 로드밸런서의 분산은 다루지 않았습니다.',
});
