Lab.register({
  id: 'realtime', nav: '폴링·SSE·WebSocket', cat: 'HTTP', mode: 'step',
  title: '서버에서 생긴 일을 브라우저에 알리는 네 가지 방법',
  intro: 'HTTP는 클라이언트가 물어야 서버가 답하는 구조라서, 서버에 새 알림이 생겨도 먼저 말을 걸 수 없습니다. 주기적으로 물어보거나(폴링), 대답을 미뤄 두거나(롱 폴링), 연결을 열어 두고 흘려보내거나(SSE), 아예 양방향 통로로 바꾸는(WebSocket) 방법이 있습니다.',
  terms: ['SSE(Server-Sent Events)와 폴링', 'WebSocket', 'HTTP와 무상태(Stateless)'], ranks: ['http', 'network', 'traffic'],
  controls: [
    { id: 'how', label: '방식', type: 'select', value: 'poll', options: [['poll', '폴링 (주기적으로 물어봄)'], ['long', '롱 폴링 (소식이 생길 때까지 응답을 미룸)'], ['sse', 'SSE (서버가 한 방향으로 계속 보냄)'], ['ws', 'WebSocket (양방향 통로)']] },
    { id: 'iv', label: '폴링 간격', type: 'select', value: '5', options: [['1', '1초'], ['5', '5초'], ['10', '10초']], show: function (c) { return c.how === 'poll'; } },
    { id: 'n', label: '30초 동안 생기는 알림 수', type: 'select', value: '3', options: [['1', '1건'], ['3', '3건'], ['12', '12건']] },
    { id: 'up', label: '클라이언트도 서버로 자주 보낸다 (채팅 입력 등)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: '5초 간격 폴링. 대부분의 요청이 "새 소식 없음"으로 끝납니다.', v: { how: 'poll', iv: '5', n: '3', up: false } },
    { t: '폴링 간격을 1초로', d: '지연은 줄지만 요청이 30번으로 늘어납니다.', v: { how: 'poll', iv: '1', n: '3', up: false } },
    { t: '롱 폴링', d: '소식이 생기는 순간 응답합니다. 요청 수는 알림 수와 비슷합니다.', v: { how: 'long', iv: '5', n: '3', up: false } },
    { t: 'SSE', d: '연결 하나로 서버가 생기는 대로 보냅니다.', v: { how: 'sse', iv: '5', n: '3', up: false } },
    { t: '양방향이 필요하면', d: '채팅처럼 클라이언트도 자주 보낸다면 WebSocket이 맞습니다.', v: { how: 'ws', iv: '5', n: '12', up: true } },
    { t: 'SSE인데 클라이언트도 자주 보내면', d: '보내는 쪽은 매번 별도의 HTTP 요청이 됩니다.', v: { how: 'sse', iv: '5', n: '12', up: true } },
  ],
  code: function (c) {
    if (c.how === 'poll') return '// 브라우저\nsetInterval(async () => {\n    const res = await fetch("/notifications?after=" + lastId);\n    show(await res.json());              // 없으면 빈 배열\n}, ' + (+c.iv * 1000) + ');';
    if (c.how === 'long') return '// 서버: 새 알림이 생길 때까지 응답을 미룬다 (최대 30초)\n@GetMapping("/notifications")\nDeferredResult<List<Notification>> wait(@RequestParam long after) {\n    var result = new DeferredResult<List<Notification>>(30_000L, List.of());\n    waiters.add(after, result);          // 알림이 생기면 result.setResult(...)\n    return result;\n}\n// 브라우저: 응답을 받으면 곧바로 다시 요청한다';
    if (c.how === 'sse') return '// 서버\n@GetMapping(value = "/notifications/stream", produces = TEXT_EVENT_STREAM_VALUE)\nSseEmitter stream() {\n    SseEmitter emitter = new SseEmitter(0L);\n    emitters.add(emitter);               // 알림이 생기면 emitter.send(...)\n    return emitter;\n}\n\n// 브라우저\nconst es = new EventSource("/notifications/stream");\nes.onmessage = e => show(JSON.parse(e.data));   // 끊기면 자동으로 다시 연결';
    return '// 서버\n@Component\nclass ChatHandler extends TextWebSocketHandler {\n    protected void handleTextMessage(WebSocketSession s, TextMessage m) {\n        broadcast(m);                    // 받은 메시지를 다른 사람들에게 전달\n    }\n}\n\n// 브라우저\nconst ws = new WebSocket("wss://shop.example/chat");\nws.onmessage = e => show(e.data);\nws.send("안녕하세요");                    // 같은 연결로 보내기도 한다';
  },
  label: function (c) { return { poll: '폴링 ' + c.iv + '초', long: '롱 폴링', sse: 'SSE', ws: 'WebSocket' }[c.how] + ' · 알림 ' + c.n + '건' + (c.up ? ' · 클라이언트도 전송' : ''); },
  columns: ['HTTP 요청 수', '빈손으로 끝난 요청', '평균 전달 지연', '열어 둔 연결'],
  simulate: function (c) {
    var D = 30, n = +c.n, ev = [], rows = [], sum = [], evT = [], i, reqs = 0, empty = 0, delay = 0, conn = '없음 (요청할 때만)', ups = c.up ? 10 : 0;
    for (i = 0; i < n; i++) evT.push(Math.round((D / n * (i + 0.37)) * 10) / 10);
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice(), reqs: reqs, empty: empty } }); }
    function row(t, what, res, cls) { rows.push({ cells: [t + '초', what, { v: res, cls: cls }] }); }
    var fmt = function (x) { return (Math.round(x * 10) / 10).toFixed(1); };
    function setLast(res, cls) { var p = rows[rows.length - 1]; rows[rows.length - 1] = { cells: [p.cells[0], p.cells[1], { v: res, cls: cls }] }; }
    if (c.how === 'poll') {
      var iv = +c.iv, last = 0, tot = 0;
      push('브라우저가 ' + iv + '초마다 "새 알림 있나요?"라고 요청합니다. 서버는 그 시점까지 쌓인 알림을 주거나, 없으면 빈 응답을 줍니다.', '');
      for (var t = iv; t <= D; t += iv) { reqs++; var got = evT.filter(function (x) { return x > last && x <= t; }); if (got.length) { got.forEach(function (x) { tot += t - x; }); row(t, '요청', '알림 ' + got.length + '건 (발생 ' + got.map(fmt).join(', ') + '초)', 'good'); } else { empty++; row(t, '요청', '새 소식 없음', ''); } last = t; if (iv >= 5 || got.length) push(t + '초: 요청을 보냈습니다. ' + (got.length ? '그 사이 생긴 알림 ' + got.length + '건을 받았습니다. 알림은 ' + got.map(fmt).join(', ') + '초에 생겼지만 다음 요청 때까지 기다려야 했습니다.' : '새 알림이 없어 빈 응답을 받았습니다.'), got.length ? 'good' : ''); }
      delay = n ? tot / n : 0; push('30초 동안 요청 ' + reqs + '번 중 ' + empty + '번이 빈손으로 끝났습니다.', empty > reqs / 2 ? 'bad' : '');
      sum.push('폴링은 구현이 가장 단순합니다. 하지만 간격이 길면 알림이 늦고, 짧으면 소득 없는 요청이 서버에 쌓입니다. 사용자가 많으면 그 요청만으로 부하가 됩니다.');
    }
    if (c.how === 'long') {
      conn = '응답을 기다리는 요청 1개가 항상 걸려 있음';
      reqs = 1; row('0.0', '요청 (응답 대기)', '서버가 응답을 미룸', 'hot'); push('브라우저가 요청을 보냅니다. 서버는 새 알림이 없으면 응답하지 않고 연결을 붙잡아 둡니다.', '');
      evT.forEach(function (x) { setLast(fmt(x) + '초에 알림 1건으로 응답', 'good'); reqs++; row(fmt(x), '곧바로 다시 요청 (응답 대기)', '서버가 응답을 미룸', 'hot'); push(fmt(x) + '초: 알림이 생기자 서버가 붙잡아 둔 요청에 즉시 응답합니다. 브라우저는 받자마자 다음 알림을 기다리는 요청을 다시 보냅니다.', 'good'); });
      setLast('30초까지 소식 없음 → 빈 응답', ''); empty = 1; delay = 0.05; push('마지막 요청은 제한 시간까지 소식이 없어 빈 응답으로 끝납니다. 브라우저는 다시 요청합니다.', '');
      sum.push('롱 폴링은 알림이 생기는 즉시 전달하면서도 평범한 HTTP 요청만 씁니다. 대신 사용자마다 요청 하나가 서버에 계속 걸려 있고, 알림이 잦으면 매번 요청을 새로 맺어야 합니다.');
    }
    if (c.how === 'sse' || c.how === 'ws') {
      reqs = 1; conn = c.how === 'sse' ? '1개 (서버 → 브라우저 방향)' : '1개 (양방향)';
      row('0.0', c.how === 'sse' ? 'GET /notifications/stream' : 'GET /chat (Upgrade: websocket)', c.how === 'sse' ? '200 OK, 응답을 끝내지 않고 열어 둠' : '101 Switching Protocols', 'good');
      push(c.how === 'sse' ? '브라우저가 요청을 한 번 보냅니다. 서버는 응답을 시작하되 끝내지 않고 연결을 열어 둡니다. 형식은 평범한 HTTP 응답이 계속 이어지는 것입니다.' : '브라우저가 HTTP 요청으로 "WebSocket으로 바꾸자"고 제안하고, 서버가 수락합니다. 이 순간부터 이 연결은 HTTP가 아니라 양쪽이 자유롭게 메시지를 보내는 통로가 됩니다.', '');
      evT.forEach(function (x) { row(fmt(x), '서버 → 브라우저', '알림 1건 (같은 연결로)', 'good'); });
      delay = 0.05; push('알림이 생길 때마다 서버가 열려 있는 연결로 바로 보냅니다. ' + n + '건 모두 새 요청 없이 전달됐습니다.', 'good');
      if (c.up) {
        if (c.how === 'sse') { reqs += ups; row('수시로', '브라우저 → 서버 (POST)', '별도의 HTTP 요청 ' + ups + '번', 'hot'); push('클라이언트가 보내는 메시지 ' + ups + '건은 SSE 연결로 보낼 수 없습니다. SSE는 서버에서 브라우저 방향만 됩니다. 보낼 때마다 일반 HTTP 요청을 따로 합니다.', 'bad'); }
        else { row('수시로', '브라우저 → 서버', '메시지 ' + ups + '건 (같은 연결로)', 'good'); push('클라이언트가 보내는 메시지 ' + ups + '건도 같은 연결로 갑니다. 요청과 응답이라는 구분 없이 양쪽이 필요할 때 보냅니다.', 'good'); }
      }
      sum.push(c.how === 'sse' ? 'SSE는 서버가 일방적으로 알리는 용도(알림, 진행률, 시세)에 맞습니다. 평범한 HTTP라서 기존 인증, 프록시, 로드밸런서와 잘 맞고 끊기면 브라우저가 알아서 다시 연결합니다.' : 'WebSocket은 양쪽이 자주 주고받는 용도(채팅, 공동 편집, 게임)에 맞습니다. HTTP가 아닌 별도의 프로토콜이라 프록시와 로드밸런서 설정을 따로 확인해야 하고, 재연결과 인증을 직접 처리해야 합니다.');
      sum.push('연결을 열어 두는 방식은 사용자 수만큼 연결이 유지됩니다. 서버가 여러 대면 "이 사용자의 연결이 어느 서버에 있는가"를 해결해야 하고, 보통 Redis의 발행·구독 같은 중간 통로를 둡니다.');
    }
    return { events: ev, summary: sum, row: [reqs + '번', empty + '번', delay < 0.1 ? '거의 0초' : fmt(delay) + '초', conn] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], reqs: 0, empty: 0 };
    if (s.rows.length) H.table(v, ['시각', '무엇을', '결과'], s.rows.slice(-14), '브라우저와 서버 사이' + (s.rows.length > 14 ? ' (최근 14줄)' : '')); else H.text(v, '아직 오간 것이 없습니다.');
  },
  // 그림: 브라우저와 서버 사이의 요청과 응답. 누가 먼저 말을 거는지, 빈손으로 돌아오는 요청이 얼마나 되는지가 보인다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], reqs: 0, empty: 0 }, msgs = [];
    s.rows.forEach(function (r) {
      var tm = P.v(r.cells[0]), kind = P.v(r.cells[1]), res = P.v(r.cells[2]), cls = P.c(r.cells[2]);
      if (kind.indexOf('서버 → 브라우저') === 0) msgs.push({ f: 's', t: 'b', s: tm + ' ' + res, cls: cls });
      else if (kind.indexOf('브라우저 → 서버') === 0) msgs.push({ f: 'b', t: 's', s: tm + ' ' + res, cls: cls });
      else { msgs.push({ f: 'b', t: 's', s: tm + ' ' + kind }); msgs.push({ f: 's', t: 'b', s: res, cls: cls === 'hot' ? '' : cls || 'mut' }); }
    });
    var end = P.seq([['b', '브라우저', 'wait'], ['s', '서버', 'wait']], msgs, { keep: 8 });
    P.box('rq', 16, end + 14, 318, 34, { cls: 'plain', title: '브라우저가 보낸 요청', right: s.reqs + '번' });
    P.box('em', 346, end + 14, 318, 34, { cls: s.empty ? 'bad' : 'good', title: '소식 없이 돌아온 응답', right: s.empty + '번' });
    P.size(680, end + 64);
    P.note('오른쪽으로 가는 화살표는 브라우저가 보낸 것, 왼쪽으로 오는 화살표는 서버가 보낸 것입니다. 회색 화살표는 새 소식 없이 돌아온 응답입니다. 서버가 먼저 보낼 수 있는 방식일수록 오른쪽으로 가는 화살표가 줄어듭니다.');
  },
  assume: '30초 구간에 알림이 고르게 생긴다고 가정했습니다. 전달 지연에서 네트워크 왕복 시간은 무시했습니다. 클라이언트가 보내는 메시지는 30초에 10건으로 고정했습니다. 롱 폴링의 제한 시간은 30초로 두었습니다. 네 방식의 동작은 HTML 표준(EventSource), WebSocket 표준(RFC 6455), 스프링 문서의 설명을 따랐습니다.',
});
