Lab.register({
  id: 'journey', nav: '주소 입력부터 응답까지', cat: '네트워크', mode: 'step',
  title: '주소창에 입력하고 엔터를 누르면',
  intro: '브라우저가 주소 하나를 여는 동안 DNS 조회, TCP 연결, TLS 핸드셰이크, HTTP 요청, 리버스 프록시, 애플리케이션 서버, DB가 차례로 관여합니다. 어떤 단계는 캐시나 연결 재사용으로 건너뛸 수 있습니다. 조건을 바꿔 가며 거치는 단계와 걸리는 시간을 비교하세요.',
  terms: ['DNS', '웹 서버와 WAS', '리버스 프록시', 'CDN', 'HTTPS와 TLS', '3-way handshake'], ranks: ['network', 'was', 'http'],
  controls: [
    { id: 'what', label: '요청하는 것', type: 'select', value: 'api', options: [['api', '동적 페이지 (/orders, DB 조회 필요)'], ['static', '정적 파일 (/logo.png)']] },
    { id: 'dns', label: '도메인의 IP 주소를 이미 알고 있다 (DNS 캐시)', type: 'check', value: false },
    { id: 'conn', label: '이 서버와 맺어 둔 연결이 남아 있다 (연결 재사용)', type: 'check', value: false },
    { id: 'cdn', label: '정적 파일을 CDN에서 받는다', type: 'check', value: false, show: function (c) { return c.what === 'static'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '처음 방문. 모든 단계를 거칩니다.', v: { what: 'api', dns: false, conn: false, cdn: false } },
    { t: '같은 사이트의 두 번째 요청', d: 'DNS와 연결 수립을 건너뜁니다.', v: { what: 'api', dns: true, conn: true, cdn: false } },
    { t: '정적 파일', d: '웹 서버(nginx)가 직접 응답합니다. 애플리케이션 서버까지 가지 않습니다.', v: { what: 'static', dns: true, conn: true, cdn: false } },
    { t: '정적 파일을 CDN에서', d: '사용자와 가까운 서버가 응답합니다.', v: { what: 'static', dns: true, conn: true, cdn: true } },
  ],
  code: function (c) {
    return '# nginx (리버스 프록시)\nserver {\n    listen 443 ssl;\n    server_name shop.example;\n\n    location /static/ {                  # 정적 파일은 직접 응답\n        root /var/www;\n    }\n    location / {                         # 나머지는 애플리케이션 서버로 전달\n        proxy_pass http://127.0.0.1:8080;\n        proxy_set_header X-Forwarded-For $remote_addr;\n    }\n}';
  },
  label: function (c) { return (c.what === 'api' ? '동적 페이지' : '정적 파일' + (c.cdn ? ' (CDN)' : '')) + ' · DNS 캐시 ' + (c.dns ? '있음' : '없음') + ' · 연결 재사용 ' + (c.conn ? '함' : '안 함'); },
  columns: ['전체 시간', '거친 단계', '건너뛴 단계', '응답을 만든 곳'],
  simulate: function (c) {
    var ev = [], rows = [], total = 0, skipped = 0, sum = [], cdn = c.what === 'static' && c.cdn, rtt = cdn ? 5 : 30, maker;
    function step(name, ms, s, k, skip) { if (skip) skipped++; else total += ms; rows.push({ cls: skip ? 'gone' : '', cells: [name, skip ? '건너뜀' : ms + 'ms', { v: skip ? '-' : total + 'ms', cls: k === 'good' ? 'good' : '' }] }); ev.push({ s: s, k: k, snap: { rows: rows.slice(), total: total } }); }
    step('주소 해석', 0, '브라우저가 주소 https://shop.example' + (c.what === 'api' ? '/orders' : '/static/logo.png') + ' 를 프로토콜(https), 호스트(shop.example), 경로로 나눕니다. https이므로 443번 포트로 접속할 것입니다.', '');
    if (c.dns) step('DNS 조회', 0, '도메인의 IP 주소가 브라우저나 운영체제의 캐시에 남아 있습니다. DNS 서버에 묻지 않습니다.', 'good', true);
    else step('DNS 조회', 40, 'shop.example의 IP 주소를 모릅니다. DNS 서버에 물어 IP 주소를 받아 옵니다' + (cdn ? '. CDN을 쓰는 도메인이라 사용자와 가까운 CDN 서버의 주소가 돌아옵니다.' : '.') + ' 결과는 정해진 시간(TTL) 동안 캐시에 보관됩니다.', '');
    if (c.conn) { step('TCP 연결', 0, '이 서버와 맺어 둔 연결이 아직 살아 있습니다(keep-alive). 새로 연결하지 않고 그대로 씁니다.', 'good', true); step('TLS 핸드셰이크', 0, '기존 연결은 이미 암호화돼 있습니다. 핸드셰이크도 다시 하지 않습니다.', 'good', true); }
    else { step('TCP 연결', rtt, '그 IP의 443번 포트로 TCP 연결을 맺습니다(3-way handshake). 서버까지 한 번 왕복하는 시간이 듭니다.', ''); step('TLS 핸드셰이크', rtt, 'TLS 핸드셰이크로 서버의 인증서를 확인하고 암호화 키를 합의합니다. 한 번 더 왕복합니다.', ''); }
    step('HTTP 요청 전송', rtt, '암호화된 연결 위로 HTTP 요청을 보냅니다. 요청 줄, 헤더(Host, 쿠키, User-Agent 등)가 서버로 갑니다.', '');
    if (cdn) { maker = 'CDN 서버'; step('CDN 서버', 2, '사용자와 가까운 곳에 있는 CDN 서버가 요청을 받습니다. 보관하고 있던 logo.png 사본을 바로 돌려줍니다. 원래 서버(오리진)에는 요청이 가지 않습니다.', 'good'); }
    else {
      step('리버스 프록시 (nginx)', 1, '가장 먼저 요청을 받는 것은 nginx입니다. TLS를 풀고, 경로를 보고 어디서 처리할지 정합니다.', '');
      if (c.what === 'static') { maker = '웹 서버 (nginx)'; step('정적 파일 응답', 2, '/static/ 경로이므로 nginx가 디스크의 파일을 직접 읽어 응답합니다. 애플리케이션 서버를 거치지 않습니다.', 'good'); }
      else { maker = '애플리케이션 서버 (스프링)';
        step('애플리케이션 서버 (톰캣)', 2, 'nginx가 요청을 뒤쪽의 톰캣(8080 포트)으로 넘깁니다. 톰캣이 스레드 풀에서 스레드 하나를 배정하고, 필터를 거쳐 스프링의 DispatcherServlet으로 전달합니다.', '');
        step('스프링 (컨트롤러 → 서비스)', 5, 'DispatcherServlet이 /orders를 처리할 컨트롤러를 찾아 실행합니다. 컨트롤러는 서비스를, 서비스는 리포지토리를 호출합니다.', '');
        step('DB 조회', 20, '커넥션 풀에서 커넥션을 빌려 SQL을 실행하고 결과를 받습니다. 이 요청에서 시간이 가장 많이 드는 구간입니다.', '');
        step('응답 생성', 3, '조회 결과를 JSON이나 HTML로 바꿔 응답을 만듭니다. 응답은 톰캣, nginx를 거쳐 되돌아갑니다.', '');
      }
    }
    step('응답 수신과 화면 표시', rtt, '응답이 브라우저에 도착합니다. HTML이라면 브라우저가 해석하면서 그 안의 CSS, 스크립트, 이미지 주소를 발견하고, 그것들에 대해 같은 과정을 반복합니다.', 'good');
    sum.push('전체 약 ' + total + 'ms. ' + (skipped ? skipped + '개 단계를 건너뛰었습니다.' : '모든 단계를 거쳤습니다.') + ' 응답을 만든 곳: ' + maker + '.');
    if (!c.dns || !c.conn) sum.push('첫 요청에서는 DNS 조회, TCP 연결, TLS 핸드셰이크가 실제 요청보다 먼저 일어납니다. 서버가 아무리 빨라도 이 왕복들은 줄지 않으므로, 연결을 유지해 재사용하는 것(keep-alive, HTTP/2)이 체감 속도에 큰 영향을 줍니다.');
    if (c.what === 'static' && !cdn) sum.push('정적 파일은 웹 서버가 직접 내어 줍니다. 애플리케이션 서버(WAS)는 실행해야 결과가 나오는 요청만 맡습니다. 리버스 프록시를 앞에 두면 TLS 처리, 정적 파일, 부하 분산, 내부 서버 숨기기를 한곳에서 할 수 있습니다.');
    if (cdn) sum.push('CDN은 정적 파일의 사본을 세계 여러 곳에 두고 가까운 곳에서 응답합니다. 왕복 시간이 짧아지고, 원래 서버로 오는 요청이 줄어듭니다.');
    if (c.what === 'api') sum.push('동적 요청에서는 DB 조회가 대부분의 시간을 차지합니다. 성능 문제를 볼 때 어느 구간에서 시간이 드는지부터 나눠 보는 이유입니다.');
    return { events: ev, summary: sum, row: [total + 'ms', (rows.length - skipped) + '개', skipped + '개', maker] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], total: 0 };
    H.counters(v, [[s.total + 'ms', '지금까지 걸린 시간']]);
    if (s.rows.length) H.table(v, ['단계', '걸린 시간', '누적'], s.rows, '거친 단계'); else H.text(v, '실행을 누르면 시작합니다.');
  },
  // 그림: 브라우저에서 출발한 요청이 DNS, 프록시, 애플리케이션 서버, DB를 차례로 거치는 순서.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { rows: [], total: 0 }, stat = c.what === 'static', cdn = stat && c.cdn, edge = cdn ? 'cdn' : 'px';
    var actors = [['b', '브라우저', 'wait'], ['dns', 'DNS']].concat(cdn ? [['cdn', 'CDN 서버']] : [['px', 'nginx (프록시)']]).concat(stat ? [] : [['app', '톰캣 + 스프링'], ['db', 'DB']]);
    var map = { '주소 해석': ['b'], 'DNS 조회': ['b', 'dns'], 'TCP 연결': ['b', edge], 'TLS 핸드셰이크': ['b', edge], 'HTTP 요청 전송': ['b', edge], '리버스 프록시 (nginx)': ['px'], '애플리케이션 서버 (톰캣)': ['px', 'app'], '스프링 (컨트롤러 → 서비스)': ['app'], 'DB 조회': ['app', 'db'], '응답 생성': ['app', 'px'], '응답 수신과 화면 표시': [edge, 'b'], '정적 파일 응답': [edge], 'CDN 서버': ['cdn'] };
    var msgs = s.rows.map(function (r) { var name = P.v(r.cells[0]), m = map[name] || ['b']; return { f: m[0], t: m[1], s: name.replace(/ \(.*\)$/, '') + ' ' + P.v(r.cells[1]), cls: P.c(r.cells[2]) }; });
    var end = P.seq(actors, msgs, { keep: 11 });
    P.box('tot', 16, end + 14, 648, 34, { cls: 'plain', title: '지금까지 걸린 시간', right: s.total + 'ms' });
    P.size(680, end + 64);
    P.note('화살표는 그 단계에서 누가 누구에게 갔는지를, 숫자는 걸린 시간을 나타냅니다. 설정에서 DNS 캐시나 연결 재사용을 켜면 앞쪽 화살표가 사라집니다.');
  },
  assume: '시간은 상대적인 크기를 보이기 위한 예시입니다(서버까지 한 번 가는 데 30ms, CDN은 5ms, DNS 조회 40ms, DB 조회 20ms). 실제 값은 거리와 네트워크, 쿼리에 따라 크게 다릅니다. 구성은 nginx가 앞에서 TLS를 처리하고 뒤의 스프링 부트(내장 톰캣)로 넘기는 흔한 형태를 가정했습니다. 단계가 실제로 이 순서로 일어나고 연결을 재사용하면 앞의 세 단계가 사라진다는 점은 curl로 공개 사이트에 연달아 두 번 요청해 확인했습니다. 첫 요청은 DNS 조회 27ms, TCP 연결 완료 60ms, TLS 완료 156ms, 첫 바이트 194ms였고, 같은 연결로 보낸 두 번째 요청은 DNS·TCP·TLS가 0이고 전체 40ms였습니다. 리버스 프록시 뒤의 구간은 직접 확인하지 못했습니다.',
});
