Lab.register({
  id: 'httpver', nav: 'HTTP/1.1, 2, 3', cat: 'HTTP', mode: 'step',
  title: '파일 30개를 받을 때 버전마다 무엇이 다른가',
  why: '페이지 하나가 파일 수십 개로 늘면서, 응답을 하나씩 차례로 받는 HTTP/1.1에서는 이미지를 한 장으로 합치거나 도메인을 여러 개로 나누는 편법까지 써야 했다. HTTP/2는 요청마다 번호 붙은 스트림을 두어 앞의 응답을 기다리지 않게 했고, HTTP/3는 스트림을 전송 단계에서도 따로 다루도록 UDP 위의 QUIC으로 옮겼다.',
  use: '주요 브라우저와 CDN, nginx는 HTTP/2를 지원하고, HTTP/3도 큰 사이트와 CDN에서 쓰인다. 스프링 부트는 server.http2.enabled로 HTTP/2를 켜지만, 앞단에 nginx나 로드밸런서가 있으면 브라우저와의 HTTP/2·3은 거기서 처리하고 뒤쪽 서버는 HTTP/1.1로 받는 구성이 흔하다. 서버끼리 호출하는 gRPC도 HTTP/2 위에서 동작한다.',
  intro: '웹 페이지 하나는 수십 개의 파일(스크립트, 스타일, 이미지)로 이뤄집니다. HTTP/1.1은 연결 하나로 한 번에 하나씩만 받아서 줄을 서야 하고, HTTP/2는 연결 하나에 여러 요청을 섞어 보냅니다. HTTP/3는 그 밑의 전송 계층까지 바꿨습니다.',
  terms: ['HTTP/1.1, HTTP/2, HTTP/3', 'TCP와 UDP', '3-way handshake'], ranks: ['http', 'network'],
  controls: [
    { id: 'ver', label: 'HTTP 버전', type: 'select', value: '1.1', options: [['1.1', 'HTTP/1.1'], ['2', 'HTTP/2'], ['3', 'HTTP/3']] },
    { id: 'n', label: '받을 파일 수', type: 'range', min: 6, max: 60, step: 6, value: 30, fmt: function (v) { return v + '개'; } },
    { id: 'loss', label: '전송 중 패킷 하나가 유실된다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: 'HTTP/1.1로 파일 30개를 받으면 어떻게 진행되나', d: 'HTTP/1.1. 연결 6개로 6개씩 다섯 묶음으로 나눠 받느라 네 번 줄을 섭니다.', v: { ver: '1.1', n: 30, loss: false } },
    { t: 'HTTP/2로', q: 'HTTP 버전을 HTTP/2로 바꾸면', d: '연결 하나로 30개를 동시에 받습니다.', v: { ver: '2', n: 30, loss: false } },
    { t: 'HTTP/2에서 패킷 유실', q: 'HTTP/2로 바꾸고 전송 중 패킷 하나가 유실되면', d: '패킷 하나가 사라지면 모든 파일이 함께 멈춥니다.', v: { ver: '2', n: 30, loss: true } },
    { t: 'HTTP/3에서 패킷 유실', q: 'HTTP/3로 바꾸고 전송 중 패킷 하나가 유실되면', d: '그 패킷이 속한 파일 하나만 기다립니다.', v: { ver: '3', n: 30, loss: true } },
    { t: 'HTTP/1.1, 파일 60개', q: 'HTTP/1.1인데 받을 파일 수를 60개로 늘리면', d: '파일이 늘수록 줄 서는 횟수가 늘어납니다.', v: { ver: '1.1', n: 60, loss: false } },
  ],
  code: function (c) {
    return '# application.yml\nserver.http2.enabled: ' + (c.ver === '1.1' ? 'false' : 'true') + '        # 브라우저는 TLS(https)에서만 HTTP/2를 씀\n\n# nginx\nserver {\n    listen 443 ssl' + (c.ver === '2' ? ';\n    http2 on' : c.ver === '3' ? ';\n    listen 443 quic;                 # HTTP/3는 UDP 위의 QUIC\n    http2 on' : '') + ';\n    ...\n}\n\n<!-- 페이지 하나가 요청하는 파일: ' + c.n + '개 -->';
  },
  label: function (c) { return 'HTTP/' + c.ver + ' · 파일 ' + c.n + '개' + (c.loss ? ' · 패킷 유실' : ''); },
  columns: ['전체 소요', '연결 수', '줄 선 횟수', '유실로 멈춘 파일'],
  simulate: function (c) {
    var n = c.n, T = 100, RT = 200, ev = [], sum = [], conns, waves, total, stalled = 0, setup;
    function push(s, k, snap) { ev.push({ s: s, k: k, snap: snap }); }
    if (c.ver === '1.1') {
      conns = 6; waves = Math.ceil(n / 6); setup = 60; total = setup + waves * T + (c.loss ? RT : 0);
      push('HTTP/1.1에서는 연결 하나가 요청 하나를 보내고 응답을 다 받아야 다음 요청을 보낼 수 있습니다. 브라우저는 속도를 내려고 같은 서버에 연결을 최대 6개까지 맺습니다. 연결마다 TCP와 TLS 핸드셰이크가 따로 듭니다.', '', { done: 0, wave: 0 });
      for (var w = 1; w <= waves; w++) { var cnt = Math.min(6, n - (w - 1) * 6), lossNow = c.loss && w === 1; push(w + '번째 묶음: 연결 ' + cnt + '개가 파일을 하나씩 맡아 받습니다.' + (n > w * 6 ? ' 나머지 ' + (n - w * 6) + '개는 연결이 빌 때까지 기다립니다.' : w > 1 ? ' 기다리는 파일은 이제 없습니다.' : '') + (lossNow ? ' 연결 하나에서 패킷이 유실돼 그 연결의 파일과, 그 연결을 기다리던 파일들이 재전송 시간만큼 늦어집니다. 다른 연결 5개는 영향을 받지 않습니다.' : ''), lossNow ? 'bad' : '', { done: (w - 1) * 6, wave: w, loss: lossNow }); }
      stalled = c.loss ? waves : 0;
      sum.push((waves > 1 ? '연결 6개로 ' + waves + '번에 나눠 받았습니다.' : '연결 6개로 한 번에 받았습니다.') + ' 앞의 응답이 끝나야 다음 요청을 보낼 수 있어서 파일이 많을수록 줄 서는 시간이 깁니다. 그래서 예전에는 파일을 하나로 합치거나 도메인을 여러 개로 나누는 편법을 썼습니다.');
    } else {
      conns = 1; waves = 1; setup = c.ver === '3' ? 20 : 30;
      push(c.ver === '2' ? 'HTTP/2는 연결 하나 안에 여러 개의 독립된 흐름(스트림)을 만듭니다. 요청과 응답을 작은 조각으로 나눠 번호를 붙이고 섞어서 보내므로, 순서를 기다릴 필요가 없습니다.' : 'HTTP/3도 연결 하나에 여러 스트림을 싣습니다. 차이는 그 아래입니다. TCP 대신 UDP 위에서 동작하는 QUIC을 써서, 연결 수립과 암호화 협상을 한 번에 끝냅니다.', '', { done: 0, wave: 0 });
      push('파일 ' + n + '개의 요청을 한꺼번에 보냅니다. 응답 조각들이 뒤섞여 도착하고, 브라우저가 스트림 번호로 다시 조립합니다. 헤더도 압축해서 보내므로 반복되는 쿠키나 User-Agent를 매번 통째로 보내지 않습니다.', 'good', { done: 0, wave: 1, partial: c.loss });
      if (c.loss) {
        if (c.ver === '2') { stalled = n; push('패킷 하나가 유실됐습니다. HTTP/2의 스트림들은 서로 독립적이지만, 모두 TCP 연결 하나 위에 실려 있습니다. TCP는 빠진 조각이 다시 올 때까지 그 뒤에 도착한 데이터를 애플리케이션에 넘기지 않습니다. 유실된 패킷이 속한 파일 1개뿐 아니라 유실과 무관한 나머지 ' + (n - 1) + '개 파일의 데이터까지 멈춰, ' + n + '개 모두 기다립니다.', 'bad', { done: 0, wave: 1, stall: n }); }
        else { stalled = 1; push('패킷 하나가 유실됐습니다. QUIC은 스트림마다 따로 순서를 관리합니다. 유실된 패킷이 속한 파일 1개만 재전송을 기다리고, 나머지 ' + (n - 1) + '개는 그대로 받습니다.', 'good', { done: n - 1, wave: 1, stall: 1 }); }
        push('재전송된 패킷이 도착해 남은 파일도 완료됩니다.', '', { done: n, wave: 1 });
      }
      total = setup + T + (c.loss ? RT : 0);
      sum.push(c.ver === '2' ? '연결 하나로 모든 파일을 동시에 받았습니다. HTTP/1.1의 "요청 수준의 줄 서기"가 사라졌습니다.' : '연결 하나로 모든 파일을 동시에 받았고, 연결을 맺는 왕복도 줄었습니다.');
      if (c.loss) sum.push(c.ver === '2' ? 'HTTP/2는 TCP 위에 있기 때문에, 패킷이 하나만 빠져도 그 연결의 모든 스트림이 함께 기다립니다. 이 모형은 유실을 한 번만 넣어서 HTTP/2가 여전히 빠르게 나오지만, 유실이 잦은 네트워크에서는 연결 6개로 유실의 영향을 나눠 받는 HTTP/1.1보다 불리해질 수도 있습니다.' : 'HTTP/3는 이 문제를 풀려고 TCP를 떠나 QUIC을 택했습니다. 유실의 영향이 그 스트림 하나로 한정됩니다. 네트워크가 바뀌어도(와이파이에서 이동통신으로) 연결을 유지할 수 있다는 장점도 있습니다.');
    }
    if (c.loss && c.ver === '3') sum.push('전체 소요 시간은 마지막 파일이 끝나는 시점이라 HTTP/2와 비슷해 보이지만, 나머지 ' + (n - 1) + '개는 약 ' + (setup + T) + 'ms에 이미 다 받았습니다. HTTP/2에서는 ' + n + '개 모두가 약 ' + (30 + T + RT) + 'ms까지 기다렸습니다.');
    push('모든 파일을 받았습니다. 전체 약 ' + total + 'ms.', 'good', { done: n, wave: waves, fin: true });
    return { events: ev, summary: sum, row: [total + 'ms', conns + '개', (waves - 1) + '번', c.loss ? stalled + '개' : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { done: 0, wave: 0 };
    H.counters(v, [[s.done + ' / ' + c.n, '받은 파일']]);
  },
  // 그림: 브라우저와 서버 사이의 연결을 통로로 그린다. HTTP/1.1은 통로 여섯 개에 하나씩, HTTP/2와 3은 통로 하나에 여러 개를 섞어 보낸다.
  draw: function (P, sim, shown) {
    var c = sim.c, v1 = c.ver === '1.1', last = shown[shown.length - 1], s = last ? last.snap : { done: 0, wave: 0 }, rows = Math.ceil(c.n / 30), flying = s.wave && s.done < c.n;
    P.size(680, 250 + rows * 22 + 24);
    P.box('br', 16, 50, 96, 150, { cls: 'wait', title: '브라우저', center: true });
    P.box('sv', 568, 50, 96, 150, { cls: 'wait', title: '서버', center: true });
    if (v1) for (var k = 0; k < 6; k++) { var fno = (Math.max(1, s.wave) - 1) * 6 + k + 1, busy = flying && fno <= c.n, lost = s.loss && k === 0 && s.wave === 1; P.box('cn' + k, 128, 44 + k * 27, 424, 23, { cls: lost ? 'bad' : busy ? 'hot' : 'plain', title: 'TCP 연결 ' + (k + 1), right: lost ? '유실: 이 연결만 다시 보냄' : busy ? '파일 ' + fno + ' 전송 중' : '대기' }); }
    else P.box('cn0', 128, 60, 424, 130, { cls: s.stall ? (c.ver === '2' ? 'bad' : 'hot') : flying ? 'hot' : 'plain', title: c.ver === '2' ? 'TCP 연결 1개 (그 안에 스트림 여러 개)' : 'QUIC 연결 1개 (UDP 위, 스트림이 서로 독립)', sub: [flying ? '파일 ' + c.n + '개를 한 연결에 섞어 동시에 보냄' : s.done ? '전송 끝' : '대기', s.stall ? (c.ver === '2' ? '패킷 하나가 사라져 뒤의 모든 스트림이 멈춤' : '패킷이 사라진 스트림 하나만 멈춤') : ' '] });
    P.region('files', 16, 214, 648, 36 + rows * 22 + 6, '파일 ' + c.n + '개');
    for (var i = 0; i < c.n; i++) {
      var cls = i < s.done ? 'good' : 'ghost';
      if (i >= s.done && v1 && s.wave && i < s.wave * 6) cls = 'hot';
      if (i >= s.done && !v1 && s.wave) cls = s.stall && (c.ver === '2' || i === c.n - 1) ? 'bad' : 'hot';
      if (v1 && s.loss && i % 6 === 0 && i < 6) cls = 'bad';
      P.box('f' + i, 28 + (i % 30) * 20.8, 248 + Math.floor(i / 30) * 22, 18, 18, { cls: cls });
    }
    P.note('가운데 상자가 연결입니다. 아래 칸은 파일로, 초록은 받은 것, 노랑은 받는 중, 빨강은 유실 때문에 멈춘 것, 점선은 차례를 기다리는 것입니다.');
  },
  assume: '파일 하나를 받는 데 100ms, 유실된 패킷의 재전송에 200ms, 연결 수립에 HTTP/1.1은 60ms(연결 6개가 동시에), HTTP/2는 30ms, HTTP/3는 20ms가 든다고 가정한 모형입니다. 실제 숫자는 네트워크와 파일 크기에 따라 다르며, 브라우저가 같은 서버에 맺는 HTTP/1.1 연결 수 6개는 주요 브라우저의 기본값입니다. 버전별 특징은 각 표준(RFC 9112, 9113, 9114)의 설명을 따랐습니다. 연결 수에 관한 부분은 실제로 확인했습니다. 실제 브라우저(크로미움 기반)에서 0.3초씩 걸리는 요청 18개를 HTTP/1.1 서버에 동시에 보내니 연결 6개로 최대 6개씩 처리되어 931ms가 걸렸고, HTTP/2(Node 내장 구현)로는 요청 30개가 TCP 연결 1개에서 동시에 처리되어 324ms에 끝났습니다. 패킷 유실 시의 차이와 HTTP/3는 검증 환경에서 재현하지 못했습니다.',
});
