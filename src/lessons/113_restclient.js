Lab.register({
  id: 'restclient', nav: '외부 API 호출과 타임아웃', cat: '스프링', mode: 'step',
  title: '다른 서버를 호출했는데 답이 오지 않으면 언제까지 기다리나',
  why: '호출한 쪽은 네트워크 너머의 서버가 느린 것인지, 꺼진 것인지, 패킷이 사라진 것인지 알 수 없다. 한도를 정하지 않은 HTTP 호출은 연결 단계에서는 운영체제가 포기할 때까지, 응답을 읽는 단계에서는 끝없이 기다릴 수 있다. 타임아웃은 이 기다림에 "여기까지"라는 끝을 정해, 답이 없는 호출을 실패로 마무리하고 스레드를 다른 요청에 돌려주게 한다.',
  use: '결제, 문자 발송, 지도 검색처럼 다른 회사의 API를 부르는 곳과 서비스끼리 HTTP로 서로 부르는 곳에는 연결 타임아웃과 읽기 타임아웃을 둘 다 정해 둔다. 값은 상대가 평소 답하는 시간보다 넉넉하게, 사용자가 기다릴 수 있는 시간보다는 짧게 잡는다. 실패가 이어지면 한동안 호출 자체를 멈추는 서킷 브레이커(Resilience4j 등)와 함께 쓰는 경우도 많다.',
  intro: '주문 서버가 결제 서버의 API를 호출합니다. 호출한 스레드는 결과가 올 때까지 멈춰 서서 기다리는데, 얼마나 기다리다 포기할지를 정하는 것이 타임아웃입니다. 타임아웃은 두 가지입니다. 연결 타임아웃은 연결이 맺어지기까지, 읽기 타임아웃은 연결된 뒤 데이터가 오지 않은 채 기다리는 시간의 한도입니다. 정하지 않으면 클라이언트는 스스로 포기하지 않습니다. 상대 서버의 상태와 타임아웃을 바꿔 가며 어느 타임아웃이 언제 걸리는지 보세요. 화면에 나오는 2초, 3초, 10초는 예시 값입니다.',
  terms: ['연결 타임아웃과 읽기 타임아웃', 'RestClient', '톰캣의 스레드 모델', '3-way handshake', 'HTTP 상태 코드'],
  controls: [
    { id: 'server', label: '상대 서버(결제 서버)의 상태', type: 'select', value: 'slow', options: [['ok', '정상: 곧바로 200으로 응답'], ['slow', '느림: 연결은 받지만 10초 뒤에 응답'], ['noanswer', '연결 요청에 답이 없음 (장비가 꺼졌거나 방화벽이 버림)'], ['refused', '연결 거절 (서버 프로그램이 꺼져 있음)'], ['e404', '곧바로 404로 응답'], ['e500', '곧바로 500으로 응답']] },
    { id: 'ct', label: '연결 타임아웃을 정한다 (2초)', type: 'check', value: true },
    { id: 'rt', label: '읽기 타임아웃을 정한다 (3초)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '연결 타임아웃 2초만 정하고 연결은 받지만 10초 뒤에 응답하는 서버를 호출하면 어떻게 되나', d: '연결 타임아웃만 정했습니다. 느린 응답에는 걸리지 않아 10초를 기다립니다.', v: { server: 'slow', ct: true, rt: false } },
    { t: '읽기 타임아웃도 정하면', q: '읽기 타임아웃도 3초로 정하면', d: '응답이 3초 안에 오지 않으면 기다림을 끊습니다.', v: { server: 'slow', ct: true, rt: true } },
    { t: '답이 없는 서버, 타임아웃 없음', q: '연결 요청에 답이 없는 서버인데 연결 타임아웃을 정하지 않으면', d: '운영체제가 포기할 때까지 스레드가 묶입니다.', v: { server: 'noanswer', ct: false, rt: false } },
    { t: '답이 없는 서버, 읽기 타임아웃만', q: '연결 요청에 답이 없는 서버인데 연결 타임아웃은 없이 읽기 타임아웃 3초만 정하면', d: '읽기 타임아웃은 연결 단계에서는 소용이 없습니다.', v: { server: 'noanswer', ct: false, rt: true } },
    { t: '답이 없는 서버, 연결 타임아웃', q: '연결 요청에 답이 없는 서버인데 연결 타임아웃 2초에 읽기 타임아웃 3초도 정하면', d: '2초 만에 포기하고 스레드를 풀어 줍니다.', v: { server: 'noanswer', ct: true, rt: true } },
    { t: '서버 프로그램이 꺼져 있으면', q: '서버 프로그램이 꺼져 연결을 거절하는데 읽기 타임아웃 3초도 정하면', d: '거절은 곧바로 돌아오므로 타임아웃을 기다리지 않습니다.', v: { server: 'refused', ct: true, rt: true } },
    { t: '404나 500이 오면', q: '읽기 타임아웃 3초를 정한 채 서버가 곧바로 404로 응답하면', d: '응답은 왔지만 호출한 코드에서는 예외로 나타납니다.', v: { server: 'e404', ct: true, rt: true } },
  ],
  code: function (c) {
    return '// main 메서드 안의 줄만 보임 (클래스·main 선언과 import는 생략)\nSimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();\n'
      + (c.ct ? 'factory.setConnectTimeout(Duration.ofSeconds(2));   // 연결 타임아웃\n' : '// 연결 타임아웃을 정하지 않음 (운영체제가 포기할 때까지 기다림)\n')
      + (c.rt ? 'factory.setReadTimeout(Duration.ofSeconds(3));      // 읽기 타임아웃\n' : '// 읽기 타임아웃을 정하지 않음 (제한 없이 기다림)\n')
      + '\nRestClient client = RestClient.builder()\n        .requestFactory(factory)\n        .build();\n\ntry {\n    String body = client.get()\n            .uri("http://pay-server/payments/1")\n            .retrieve()\n            .body(String.class);            // 결과가 올 때까지 이 스레드는 여기서 기다린다\n} catch (HttpClientErrorException e) {      // 4xx 응답\n} catch (HttpServerErrorException e) {      // 5xx 응답\n} catch (ResourceAccessException e) {       // 연결 실패, 타임아웃\n}';
  },
  label: function (c) { return { ok: '정상 서버', slow: '느린 서버(10초)', noanswer: '답이 없는 서버', refused: '연결 거절', e404: '404 응답', e500: '500 응답' }[c.server] + ' · 연결 타임아웃 ' + (c.ct ? '2초' : '없음') + ' · 읽기 타임아웃 ' + (c.rt ? '3초' : '없음'); },
  columns: ['결과', '호출한 코드가 받은 예외', '호출한 스레드가 기다린 시간', '상대 서버의 처리'],
  simulate: function (c) {
    var S = c.server, ct = !!c.ct, rt = !!c.rt, ev = [], sum = [];
    var st = { thread: '호출 전', waited: '0초', conn: '', req: false, resp: '', ctS: ct ? '연결을 시도할 때부터 잼' : '정하지 않음: 운영체제가 포기할 때까지', ctK: ct ? 'plain' : 'ghost', rtS: rt ? '연결이 맺어진 뒤부터 잼' : '정하지 않음: 제한 없이 기다림', rtK: rt ? 'plain' : 'ghost', srv: S === 'refused' ? '프로그램이 꺼져 있음' : S === 'noanswer' ? '답이 없음' : '요청을 기다리는 중', result: '', ex: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var result = '', ex = '없음', wait = '곧바로', served = '처리함', cause = '-', ms = 0, status = '-';
    function finish(r, e) { result = r; ex = e; st.result = r; st.ex = e; st.thread = '풀려남'; if (st.waited === '0초') st.waited = '거의 없음'; }

    st.thread = '호출을 시작함';
    push('client.get() ... body(String.class) 호출: 주문 서버의 스레드 하나가 결제 서버를 호출하기 시작합니다. RestClient는 결과가 올 때까지 이 스레드를 붙잡아 두므로, 그동안 이 스레드는 다른 요청을 처리하지 못합니다.');

    st.thread = '연결을 기다리는 중'; st.conn = 'try'; if (ct) { st.ctS = '재는 중'; st.ctK = 'hot now'; }
    push('연결 시도: HTTP 요청을 보내려면 먼저 결제 서버와 TCP 연결을 맺어야 합니다. 연결 요청을 보냅니다.' + (ct ? ' 연결 타임아웃 2초를 이때부터 잽니다.' : ' 연결 타임아웃은 정하지 않았습니다.'));

    if (S === 'refused') {
      st.conn = 'refused'; served = '요청이 닿지 않음'; cause = 'ConnectException'; if (ct) { st.ctS = '거절이 먼저 와서 쓰이지 않음'; st.ctK = 'plain'; } if (rt) st.rtS = '연결이 안 돼 시작하지 못함';
      finish('연결하지 못함 (상대가 거절)', 'ResourceAccessException');
      push('연결 거절: 결제 서버 장비는 켜져 있지만, 그 포트에서 듣고 있는 프로그램이 없습니다. 상대 운영체제가 곧바로 "거절"을 돌려주므로 기다릴 것이 없습니다. 타임아웃 설정과 관계없이 바로 ResourceAccessException이 던져집니다(원인은 ConnectException).');
    } else if (S === 'noanswer') {
      st.conn = 'silent'; served = '요청이 닿지 않음';
      push('답이 없음: 연결 요청에 수락도 거절도 돌아오지 않습니다. 상대 장비가 꺼져 있거나 중간의 방화벽이 요청을 말없이 버릴 때 이렇게 됩니다. 스레드는 답을 기다리며 멈춰 있습니다.');
      if (rt) st.rtS = '연결이 안 돼 시작하지 못함';
      if (ct) {
        st.conn = 'timeout'; st.waited = '2초'; st.ctS = '2초가 지나 기다림을 끊음'; st.ctK = 'bad'; wait = '2초'; ms = 200; cause = 'SocketTimeoutException';
        finish('연결하지 못함 (연결 타임아웃)', 'ResourceAccessException');
        push('연결 타임아웃(2초): 2초가 지나도록 연결이 맺어지지 않았습니다. 기다림을 끊고 ResourceAccessException을 던집니다(원인은 SocketTimeoutException). 스레드는 2초 만에 풀려납니다.' + (rt ? ' 읽기 타임아웃은 연결이 맺어진 뒤에야 재기 시작하므로 이번에는 쓰이지 않았습니다.' : ''));
      } else {
        st.conn = 'osfail'; st.waited = '운영체제가 포기할 때까지'; wait = '운영체제가 포기할 때까지'; ms = -1; cause = 'ConnectException';
        finish('연결하지 못함 (운영체제가 포기)', 'ResourceAccessException');
        push('연결 타임아웃 없음: 기다림을 끊어 줄 것이 없습니다.' + (rt ? ' 읽기 타임아웃(3초)은 연결이 맺어진 뒤 응답을 기다릴 때만 재므로 여기서는 소용이 없습니다.' : '') + ' 스레드는 운영체제가 연결을 포기할 때까지 묶여 있다가, 그제야 ResourceAccessException을 받습니다(원인은 ConnectException). 대조한 PC(윈도우 11)에서는 약 21초가 걸렸고, 이 시간은 운영체제와 그 설정에 따라 다릅니다.', 'bad');
      }
    } else {
      st.conn = 'ok'; if (ct) { st.ctS = '연결이 맺어져 역할이 끝남'; st.ctK = 'plain'; }
      push('연결 성공: 결제 서버가 곧바로 연결을 받아 줍니다.' + (ct ? ' 연결 타임아웃의 역할은 여기서 끝납니다. 이 뒤로 아무리 오래 걸려도 연결 타임아웃은 걸리지 않습니다.' : ''));

      st.req = true; st.thread = '응답을 기다리는 중'; st.srv = S === 'slow' ? '요청을 처리하는 중 (10초 걸림)' : '요청을 처리하는 중'; if (rt) { st.rtS = '재는 중'; st.rtK = 'hot now'; }
      push('GET /payments/1 전송: 맺어진 연결로 요청을 보내고 응답을 기다립니다.' + (rt ? ' 읽기 타임아웃 3초를 이때부터 잽니다.' : ' 읽기 타임아웃은 정하지 않았습니다.'));

      if (S === 'slow' && rt) {
        st.waited = '3초'; st.rtS = '3초가 지나 기다림을 끊음'; st.rtK = 'bad'; st.resp = 'none'; wait = '3초'; ms = 300; cause = 'SocketTimeoutException';
        finish('응답을 받지 못함 (읽기 타임아웃)', 'ResourceAccessException');
        push('읽기 타임아웃(3초): 3초가 지나도록 응답이 오지 않았습니다. 기다림을 끊고 ResourceAccessException을 던집니다(원인은 SocketTimeoutException). 스레드는 3초 만에 풀려납니다.');
        st.srv = '요청을 끝까지 처리함 (10초 뒤)';
        push('결제 서버 쪽: 호출한 쪽이 포기한 것을 모르고 요청을 계속 처리해 10초 뒤에 끝냅니다. 타임아웃은 "응답을 받지 못했다"는 뜻이지 "처리되지 않았다"는 뜻이 아닙니다.');
      } else if (S === 'slow') {
        st.waited = '10초'; wait = '10초'; ms = 1000; status = '200';
        push('읽기 타임아웃 없음: 기다림을 끊어 줄 것이 없습니다.' + (ct ? ' 연결 타임아웃(2초)은 연결이 맺어질 때 역할이 끝났으므로 여기서는 소용이 없습니다.' : '') + ' 스레드는 응답이 올 때까지 10초 동안 묶여 있습니다.', 'bad');
        st.resp = '200'; st.srv = '처리를 끝내고 응답함';
        finish('200 응답을 받음', '없음');
        push('응답 도착: 10초 뒤에 결제 서버가 200 응답을 보냅니다. RestClient가 본문을 문자열로 바꿔 돌려줍니다. 결과는 성공이지만, 스레드 하나가 10초 동안 다른 일을 하지 못했습니다.');
      } else {
        var code = S === 'ok' ? '200' : S === 'e404' ? '404' : '500'; status = code;
        st.resp = code; st.srv = '처리를 끝내고 응답함'; if (rt) { st.rtS = '응답이 먼저 와서 쓰이지 않음'; st.rtK = 'plain'; }
        if (S === 'ok') {
          finish('200 응답을 받음', '없음');
          push('응답 도착: 결제 서버가 곧바로 200 응답을 보냅니다. RestClient가 본문을 문자열로 바꿔 돌려주고, 스레드는 풀려납니다.', 'good');
        } else {
          push('응답 도착: 결제 서버가 곧바로 ' + code + ' 응답을 보냅니다. 응답이 제때 왔으므로 타임아웃과는 관계가 없습니다.');
          finish(code + ' 응답을 받음', S === 'e404' ? 'HttpClientErrorException' : 'HttpServerErrorException');
          push('상태 코드 확인: RestClient는 ' + (S === 'e404' ? '4xx 응답을 받으면 본문을 돌려주는 대신 HttpClientErrorException을' : '5xx 응답을 받으면 본문을 돌려주는 대신 HttpServerErrorException을') + ' 던집니다. 응답은 정상적으로 도착했지만, 호출한 코드에서는 예외로 나타납니다. 받은 상태 코드는 예외의 getStatusCode()로 알 수 있습니다.');
        }
      }
    }
    if (S === 'slow' && !rt) sum.push('읽기 타임아웃을 정하지 않으면 제한 없이 기다립니다. 결제 서버가 느려지면 주문 서버의 스레드가 그만큼 묶이고, 요청이 몰리면 스레드 풀의 스레드가 모두 묶여 주문 서버까지 응답하지 못하게 됩니다.' + (ct ? ' 연결 타임아웃만으로는 느린 응답을 막지 못합니다. 두 타임아웃은 재는 구간이 다르므로 둘 다 정해야 합니다.' : ''));
    if (S === 'slow' && rt) sum.push('읽기 타임아웃이 스레드를 3초 만에 풀어 줬습니다. 다만 결제 서버는 그 요청을 끝까지 처리했습니다. 타임아웃이 났다고 같은 요청을 다시 보내면 두 번 처리될 수 있습니다("재시도와 멱등성" 실습에서 다룹니다).');
    if (S === 'noanswer' && ct) sum.push('연결 타임아웃은 연결이 맺어지지 않을 때 걸립니다. 정상이라면 연결은 아주 빨리 맺어지므로, 연결 타임아웃은 읽기 타임아웃보다 짧게 잡는 것이 보통입니다.');
    if (S === 'noanswer' && !ct) sum.push('연결 타임아웃을 정하지 않으면 운영체제가 포기할 때까지 스레드가 묶입니다.' + (rt ? ' 읽기 타임아웃을 정해 두었어도 연결 단계에서는 쓰이지 않습니다.' : '') + ' 답이 없는 서버 하나 때문에, 호출할 때마다 그 시간만큼 스레드를 쓰지 못하게 됩니다.');
    if (S === 'refused') sum.push('서버 프로그램이 꺼져 있을 때는 거절이 곧바로 돌아오므로 타임아웃을 기다리지 않고 바로 실패합니다. 타임아웃이 걸리는 것은 답이 아예 없거나(연결 타임아웃) 응답이 늦을 때(읽기 타임아웃)입니다.');
    if (S === 'e404' || S === 'e500') sum.push('4xx와 5xx는 응답이 온 것이므로 타임아웃과 관계가 없습니다. RestClient는 이런 응답을 예외로 바꿔 던지므로, 호출한 코드는 try-catch로 받아서 처리합니다. 4xx는 HttpClientErrorException(보낸 요청의 문제), 5xx는 HttpServerErrorException(상대 서버의 문제)입니다.');
    if (S === 'ok') sum.push('상대 서버가 정상일 때는 타임아웃을 정했든 정하지 않았든 결과가 같습니다. 타임아웃은 상대가 느리거나 답이 없을 때를 위한 안전장치입니다.');
    return { events: ev, summary: sum, cause: cause, ms: ms, status: status, row: [result, ex, wait, served] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 주문 서버의 스레드가 결제 서버를 호출하고 결과를 받기까지를 한 단계씩 보여 줍니다.'); return; }
    var ln = H.lanes(v), connText = { '': '아직', try: '연결 요청을 보냄', ok: '연결됨', refused: '상대가 거절함', silent: '답이 없음', timeout: '연결 타임아웃으로 포기', osfail: '운영체제가 포기' }[s.conn];
    H.lane(ln, '연결', connText, s.conn === 'ok' ? 'good' : s.conn === 'try' || s.conn === 'silent' ? 'wait' : s.conn ? 'bad' : 'none');
    H.lane(ln, '응답', !s.req ? (s.result ? '요청을 보내지 못함' : '아직') : s.resp === 'none' ? '받지 못함' : s.resp ? s.resp + ' 응답을 받음' : '기다리는 중', !s.req ? 'none' : s.resp === 'none' ? 'bad' : s.resp === '200' ? 'good' : s.resp ? 'bad' : 'wait');
  },
  // 그림: 왼쪽에 호출하는 주문 서버의 스레드, 오른쪽에 결제 서버. 그 사이에 연결, 요청, 응답 화살표. 아래에 두 타임아웃이 각각 언제 시간을 재는지와 결과.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { thread: '호출 전', waited: '0초', conn: '', req: false, resp: '', ctS: c.ct ? '연결을 시도할 때부터 잼' : '정하지 않음: 운영체제가 포기할 때까지', ctK: c.ct ? 'plain' : 'ghost', rtS: c.rt ? '연결이 맺어진 뒤부터 잼' : '정하지 않음: 제한 없이 기다림', rtK: c.rt ? 'plain' : 'ghost', srv: c.server === 'refused' ? '프로그램이 꺼져 있음' : c.server === 'noanswer' ? '답이 없음' : '요청을 기다리는 중', result: '', ex: '' };
    var waiting = s.thread === '연결을 기다리는 중' || s.thread === '응답을 기다리는 중', dead = c.server === 'refused' || c.server === 'noanswer';
    P.size(680, 268);
    P.box('me', 16, 16, 240, 92, { cls: s.thread === '풀려남' ? 'good' : waiting ? 'hot now' : 'plain', title: '주문 서버 (호출하는 쪽)', sub: ['스레드: ' + s.thread, '기다림: ' + s.waited] });
    P.box('srv', 424, 16, 240, 92, { cls: dead ? 'ghost' : s.req && !s.resp ? 'hot' : s.resp && s.resp !== 'none' ? 'wait' : 'plain', title: '결제 서버 (상대)', sub: [{ ok: '곧바로 응답하는 서버', slow: '10초 뒤에 응답하는 서버', noanswer: '연결 요청에 답이 없는 서버', refused: '프로그램이 꺼진 서버', e404: '404로 응답하는 서버', e500: '500으로 응답하는 서버' }[c.server], s.srv] });
    if (s.conn) P.arrow('a_conn', 'me:r:0.2', 'srv:l:0.2', { cls: s.conn === 'ok' ? 'good' : s.conn === 'try' ? 'hot' : s.conn === 'silent' ? 'dash' : 'bad', label: { try: '1. 연결 요청', ok: '1. 연결됨', refused: '1. 연결 거절', silent: '1. 연결 요청, 답 없음', timeout: '1. 연결 포기', osfail: '1. 연결 포기' }[s.conn] });
    if (s.req) P.arrow('a_req', 'me:r:0.55', 'srv:l:0.55', { cls: s.resp ? 'mut' : 'hot', label: '2. 요청' });
    if (s.resp && s.resp !== 'none') P.arrow('a_res', 'srv:l:0.9', 'me:r:0.9', { cls: s.resp === '200' ? 'good' : 'bad', label: '3. 응답 ' + s.resp });
    P.box('tc', 16, 122, 320, 46, { cls: s.ctK, title: '연결 타임아웃', right: c.ct ? '2초' : '없음', sub: s.ctS });
    P.box('tr', 344, 122, 320, 46, { cls: s.rtK, title: '읽기 타임아웃', right: c.rt ? '3초' : '없음', sub: s.rtS });
    P.box('out', 16, 182, 648, 58, { cls: !s.result ? 'ghost' : s.ex === '없음' ? 'good' : 'bad', title: '호출한 코드가 받은 것', sub: s.result ? [s.result, '예외: ' + s.ex] : ['아직 결과가 없음', ' '], right: s.result ? '기다림: ' + s.waited : '' });
    P.note('연결 타임아웃은 "1. 연결"이 맺어질 때까지만, 읽기 타임아웃은 "2. 요청"을 보낸 뒤 응답을 기다리는 동안만 시간을 잽니다.');
  },
  assume: '스물네 가지 조합을 모두 스프링 프레임워크 7.0.9의 RestClient(요청 팩토리는 SimpleClientHttpRequestFactory, JDK 21)로 실제 호출해, 결과와 예외의 종류, 예외의 원인, 기다린 시간, 상대 서버가 요청을 처리했는지가 화면과 일치하는 것을 확인했습니다. 상대 서버는 같은 PC의 127.0.0.1에 띄운 스프링 부트 4.1.1 서버(내장 톰캣)이고, 일부러 늦게 응답하는 주소를 두었습니다. 화면의 시간은 예시입니다. 실제 대조는 100분의 1로 줄여(연결 타임아웃 200ms, 읽기 타임아웃 300ms, 느린 응답 1000ms) 실행했고, 기다린 시간이 그 비율대로 나오는지 보았습니다. "연결 거절"은 아무 프로그램도 듣지 않는 127.0.0.1의 포트로 확인했습니다. "연결 요청에 답이 없음"은 127.0.0.1로는 만들 수 없어서, 문서용으로 예약되어 어느 장비에도 배정되지 않는 주소 192.0.2.1(RFC 5737)로 확인했습니다. 이 네 조합은 PC가 놓인 네트워크에 따라 결과가 다를 수 있습니다(네트워크가 끊겨 있으면 곧바로 실패합니다). 연결 타임아웃이 없을 때 운영체제가 포기하기까지 걸린 약 21초는 윈도우 11에서 본 값이며, 운영체제와 설정에 따라 다릅니다. 타임아웃을 정하지 않으면 제한 없이 기다린다는 것은 java.net.URLConnection 문서(타임아웃 0은 무한)에 따른 것이고, 실행으로는 응답이 올 때까지 기다리는 것까지만 확인했습니다. 읽기 타임아웃은 응답 전체에 걸리는 시간이 아니라 데이터가 오지 않는 채로 기다리는 시간의 한도라서, 조금씩 계속 오는 응답에는 걸리지 않을 수 있습니다(같은 문서 기준이며 실행으로 확인하지 않았습니다). 타임아웃을 정하는 방법과 기본값은 요청 팩토리의 종류에 따라 다릅니다. 대조는 호출 하나씩으로 했으므로, 요청이 몰려 스레드 풀이 바닥나는 상황은 실행으로 확인하지 않았습니다. 호출할 때마다 연결을 새로 맺는 경우로 단순화했고, 연결을 재사용하는 커넥션 풀과 그 대기 시간, 재시도, 서킷 브레이커는 다루지 않았습니다.',
});
