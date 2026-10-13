Lab.register({
  id: 'origin_basic', nav: '출처(origin)', cat: '기초개념', mode: 'step', basic: true, deep: ['cors', 'webattack', 'clickjack'],
  title: '출처는 무엇이고, 브라우저는 왜 다른 출처를 가르는가',
  intro: '출처(origin)는 주소(URL)의 앞부분 세 가지, 스킴(https나 http), 호스트(사이트 이름), 포트(번호)를 합친 것입니다. 셋 가운데 하나라도 다르면 다른 출처이고, 뒤쪽의 경로와 쿼리는 출처에 들어가지 않습니다. 브라우저는 페이지 안에서 도는 스크립트가 다른 출처에 보낸 요청의 응답을 읽지 못하게 막습니다. 이 규칙이 동일 출처 정책입니다. 이 실습은 코드 칸에 열려 있는 페이지의 주소와, 그 페이지의 스크립트가 요청하는 주소를 적어 두고, 요청하는 주소를 한 부분씩 바꿔 가며 브라우저가 출처를 같다고 보는지, 요청이 서버에 도착하는지, 스크립트가 응답을 읽는지를 봅니다. 코드 칸은 프로그램이 아니라 주소 두 개를 적은 것입니다. 서버가 읽기를 허락하는 방법(CORS)은 이 실습에서 다루지 않습니다.',
  terms: ['출처(origin)', '웹 페이지의 스크립트', '스킴과 기본 포트', 'CORS와 동일 출처 정책'],
  controls: [
    { id: 'target', label: '스크립트가 요청하는 주소', type: 'select', value: 'same', options: [['same', 'https://shop.example/api/items (경로만 있음)'], ['path', 'https://shop.example/other?x=1 (경로와 쿼리만 다름)'], ['host', 'https://api.shop.example/items (호스트가 다름)'], ['port', 'https://shop.example:8443/items (포트가 다름)'], ['scheme', 'http://shop.example/items (스킴이 다름)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '출처는 주소의 어느 부분이고, 같은 출처에 보낸 요청의 응답은 읽을 수 있나', d: '페이지와 요청 주소의 스킴, 호스트, 포트가 모두 같습니다. 스크립트가 응답을 읽습니다.', v: { target: 'same' } },
    { t: '경로와 쿼리만 바꾸면', q: '요청하는 주소의 경로와 쿼리를 /other?x=1 로 바꾸면', d: '경로와 쿼리는 출처에 들어가지 않아 여전히 같은 출처입니다. 응답을 읽습니다.', v: { target: 'path' } },
    { t: '호스트를 바꾸면', q: '요청하는 주소의 호스트를 api.shop.example 로 바꾸면', d: '호스트가 달라 다른 출처입니다. 요청은 서버에 도착하지만 스크립트는 응답을 읽지 못합니다.', v: { target: 'host' } },
    { t: '포트를 바꾸면', q: '요청하는 주소에 :8443 포트를 붙이면', d: '포트가 달라 다른 출처입니다. 스크립트는 응답을 읽지 못합니다.', v: { target: 'port' } },
    { t: '스킴을 바꾸면', q: '요청하는 주소를 https 대신 http 로 시작하게 바꾸면', d: '스킴이 달라 다른 출처입니다. 스크립트는 응답을 읽지 못합니다.', v: { target: 'scheme' } },
  ],
  PAGE: { url: 'https://shop.example/cart', origin: 'https://shop.example', scheme: 'https', host: 'shop.example', port: '443' },
  // 요청 주소별: 주소, 출처, 스킴, 호스트, 포트, 포트를 주소에 적었는지, 주소 뒤쪽(경로와 쿼리)
  T: {
    same: { url: 'https://shop.example/api/items', origin: 'https://shop.example', scheme: 'https', host: 'shop.example', port: '443', written: false, rest: '/api/items(경로)' },
    path: { url: 'https://shop.example/other?x=1', origin: 'https://shop.example', scheme: 'https', host: 'shop.example', port: '443', written: false, rest: '/other(경로)와 ?x=1(쿼리)' },
    host: { url: 'https://api.shop.example/items', origin: 'https://api.shop.example', scheme: 'https', host: 'api.shop.example', port: '443', written: false, rest: '/items(경로)' },
    port: { url: 'https://shop.example:8443/items', origin: 'https://shop.example:8443', scheme: 'https', host: 'shop.example', port: '8443', written: true, rest: '/items(경로)' },
    scheme: { url: 'http://shop.example/items', origin: 'http://shop.example', scheme: 'http', host: 'shop.example', port: '80', written: false, rest: '/items(경로)' },
  },
  code: function (c) {
    return ['# 지금 열려 있는 페이지', this.PAGE.url, '# 그 페이지의 스크립트가 요청하는 주소', this.T[c.target].url].join('\n');
  },
  label: function (c) { return { same: '같은 출처 · 경로만 있음', path: '경로와 쿼리만 다름', host: '호스트가 다름', port: '포트가 다름', scheme: '스킴이 다름' }[c.target]; },
  columns: ['요청 주소의 출처', '페이지의 출처와 같은가', '요청이 서버에 도착', '스크립트가 응답을 읽음'],
  simulate: function (c) {
    var t = this.T[c.target], pg = this.PAGE, ev = [], sum = [], B = '상품 3개';
    var parts = [t.scheme === pg.scheme, t.host === pg.host, t.port === pg.port], same = parts[0] && parts[1] && parts[2];
    var names = ['스킴', '호스트', '포트'], pv = [pg.scheme, pg.host, pg.port], tv = [t.scheme, t.host, t.port];
    var diffs = names.filter(function (n, i) { return !parts[i]; });
    var st = { pg: false, tg: false, cmp: false, pgTxt: '대기', bwTxt: '대기', svTxt: '대기', bwCls: 'plain', pgCls: 'plain', svCls: 'plain', rq: false, rs: false, pass: false, arrived: '아직', read: '아직' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 1단계: 페이지를 연다
    st.pg = true; st.pgTxt = '페이지를 열어 둠'; st.pgCls = 'wait';
    push('브라우저 주소창에 ' + pg.url + ' 주소를 입력하면, 브라우저가 서버에서 이 페이지를 받아 보여 줍니다. 이 페이지에는 스크립트(브라우저가 페이지 안에서 실행하는 프로그램)가 들어 있습니다. 브라우저는 주소의 앞부분 세 가지로 페이지의 출처를 정합니다. 스킴(' + pg.scheme + ')은 어떤 규칙으로 통신하는지, 호스트(' + pg.host + ')는 어느 사이트인지, 포트는 한 컴퓨터 안에서 프로그램을 가리키는 번호입니다. 포트는 주소에 적지 않았으므로 ' + pg.scheme + '의 기본 포트인 ' + pg.port + '이 쓰입니다. 이 세 가지를 합친 것이 출처(origin)이고, 이 페이지의 출처는 ' + pg.origin + '입니다(기본 포트는 적지 않습니다).', '');
    // 2단계: 스크립트가 요청하려 한다
    st.tg = true; st.pgTxt = '요청하려는 중'; st.svTxt = '아직 모름';
    var portSay = t.written ? '포트는 주소에 ' + t.port + '이라고 적혀 있습니다' : '포트는 주소에 적지 않았으므로 ' + t.scheme + '의 기본 포트인 ' + t.port + '이 쓰입니다';
    push('페이지의 스크립트가 ' + t.url + ' 주소로 요청을 보내려 합니다. 브라우저는 이 주소의 출처도 같은 방식으로 정합니다. 스킴은 ' + t.scheme + ', 호스트는 ' + t.host + ', ' + portSay + '. 주소 뒤쪽의 ' + t.rest + '는 출처에 들어가지 않으므로 따지지 않습니다. 이 요청 주소의 출처는 ' + t.origin + '입니다.', '');
    // 3단계: 견준다
    st.cmp = true; st.pgCls = 'hot'; st.svCls = 'hot';
    push('브라우저가 페이지의 출처와 요청 주소의 출처를 세 가지씩 견줍니다. ' + names.map(function (n, i) { return n + ': 페이지 ' + pv[i] + ', 요청 ' + tv[i] + ' → ' + (parts[i] ? '같음' : '다름'); }).join('. ') + '.', same ? '' : 'bad');
    // 4단계: 결론
    if (same) push('세 가지가 모두 같으므로 같은 출처입니다. 주소의 경로와 쿼리가 달라도 출처에는 영향이 없습니다.', 'good');
    else push('다른 곳이 있습니다: ' + diffs.join(', ') + '. 셋 가운데 하나라도 다르면 다른 출처이므로, 이 요청은 다른 출처에 보내는 요청입니다.', 'bad');
    // 5단계: 요청이 나간다
    st.rq = true; st.bwTxt = '요청 전달'; st.svTxt = '요청을 받음'; st.arrived = '예'; st.pgCls = 'wait'; st.svCls = 'wait'; st.bwCls = 'hot';
    push('브라우저가 이 요청을 서버로 보냅니다. 이 실습의 요청은 스크립트가 내용을 가져오는 평범한 요청(GET)이고, ' + (same ? '같은 출처로 가는 요청입니다.' : '다른 출처로 가더라도 브라우저는 이 요청을 막지 않고 서버로 보냅니다.') + ' 서버에 요청이 도착했습니다.', '');
    // 6단계: 서버가 답한다
    st.rs = true; st.svTxt = '200 응답을 보냄'; st.svCls = 'good';
    push('서버는 요청을 평소처럼 처리해 200 응답과 본문 "' + B + '"를 돌려줍니다.' + (same ? '' : ' 이 서버는 응답에 다른 출처의 페이지가 읽어도 좋다는 표시를 달지 않았습니다.'), '');
    // 7단계: 브라우저가 응답을 확인한다
    if (same) {
      st.pass = true; st.bwTxt = '응답 넘김'; st.bwCls = 'good';
      push('브라우저가 응답을 확인합니다. 요청한 주소가 페이지와 같은 출처이므로, 브라우저는 응답을 스크립트에 넘겨줍니다.', 'good');
      st.pgTxt = '본문을 읽음'; st.pgCls = 'good'; st.read = '예';
      push('스크립트가 응답을 받아 상태 200과 본문 "' + B + '"를 읽습니다.', 'good');
    } else {
      st.bwTxt = '응답 막음'; st.bwCls = 'bad';
      push('브라우저가 응답을 확인합니다. 요청한 주소가 페이지와 다른 출처이고 응답에 읽어도 좋다는 표시도 없으므로, 브라우저는 응답을 스크립트에 넘겨주지 않습니다. 다른 출처의 응답을 스크립트가 읽지 못하게 하는 이 규칙이 동일 출처 정책입니다.', 'bad');
      st.pgTxt = '오류를 받음'; st.pgCls = 'bad'; st.read = '아니요';
      push('스크립트는 응답 대신 오류를 받습니다(이 PC의 Chrome에서는 TypeError: Failed to fetch). 상태도 본문도 읽지 못합니다. 이 오류만으로는 서버에 요청이 도착했는지 알 수 없습니다. 서버가 꺼져 있어서 연결하지 못했을 때도 같은 오류를 받았기 때문입니다.', 'bad');
      push('다른 출처의 응답을 스크립트가 읽게 하려면, 서버가 응답에 읽어도 좋다는 표시를 달아야 합니다. 그 방법이 CORS이고, 세부 동작은 "CORS" 실습에서 다룹니다.', '');
    }
    // 요약
    if (c.target === 'same') {
      sum.push('출처는 주소의 스킴, 호스트, 포트 세 가지를 합친 것입니다. 이 요청은 페이지와 세 가지가 모두 같아 같은 출처이므로, 스크립트가 응답을 읽을 수 있었습니다.');
      sum.push('브라우저가 막는 것은 스크립트가 다른 출처의 응답을 읽는 일입니다. 이 규칙은 내가 로그인해 둔 다른 사이트의 내용을, 아무 페이지의 스크립트나 읽어 가지 못하게 하려는 것입니다.');
    } else if (c.target === 'path') {
      sum.push('경로와 쿼리(/other?x=1)만 바뀌었고 스킴, 호스트, 포트는 그대로이므로 같은 출처입니다. 스크립트가 응답을 읽을 수 있었습니다.');
      sum.push('출처를 가르는 것은 스킴, 호스트, 포트 세 가지뿐입니다. 주소의 뒤쪽이 많이 달라도 출처는 달라지지 않습니다.');
    } else if (c.target === 'host') {
      sum.push('호스트가 api.shop.example로 달라서 다른 출처입니다. 서버는 요청을 받아 처리했지만, 브라우저가 응답을 스크립트에 넘겨주지 않았습니다.');
      sum.push('호스트 이름이 조금이라도 다르면 다른 출처입니다. shop.example 앞에 api.가 붙은 사이트도 다른 출처로 봅니다.');
    } else if (c.target === 'port') {
      sum.push('포트가 8443으로 달라서 다른 출처입니다. 서버는 요청을 받아 처리했지만, 브라우저가 응답을 스크립트에 넘겨주지 않았습니다.');
      sum.push('호스트가 같아도 포트가 다르면 다른 출처입니다. 포트를 적지 않은 주소는 https의 기본 포트 443으로 보고 견줍니다.');
    } else {
      sum.push('스킴이 http로 달라서 다른 출처입니다. 이 실습(127.0.0.1)에서는 서버가 요청을 받아 처리했지만, 브라우저가 응답을 스크립트에 넘겨주지 않았습니다.');
      sum.push('https와 http는 호스트가 같아도 다른 출처입니다. 이 주소는 포트를 적지 않아 http의 기본 포트 80이 쓰이므로, 포트도 443과 다릅니다.');
    }
    return { events: ev, summary: sum, tg: t, parts: parts, same: same, row: [t.origin, same ? '같은 출처' : '다른 출처', '예', same ? '예' : '아니요'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 브라우저가 페이지의 출처를 정하는 것부터 시작합니다.'); return; }
    var pg = this.PAGE, tg = sim.tg, pv = [pg.scheme, pg.host, pg.port], tv = [tg.scheme, tg.host, tg.port], names = ['스킴', '호스트', '포트'];
    H.table(v, ['출처의 부분', '페이지', '요청 주소', '견줘 본 결과'], names.map(function (n, i) {
      return { cls: s.tg ? '' : 'gone', cells: [n, s.pg ? pv[i] : '아직', s.tg ? tv[i] : '아직', s.cmp ? { v: sim.parts[i] ? '같음' : '다름', cls: sim.parts[i] ? 'good' : 'bad' } : '아직'] };
    }), '출처 견주기');
    H.table(v, ['항목', '값'], [
      { cls: s.arrived === '아직' ? 'gone' : '', cells: ['요청이 서버에 도착', s.arrived] },
      { cls: s.read === '아직' ? 'gone' : '', cells: ['스크립트가 응답을 읽음', s.read === '아직' ? '아직' : { v: s.read, cls: s.read === '예' ? 'good' : 'bad' }] },
    ], '결과');
  },
  // 그림: 위쪽에 출처를 이루는 세 가지(스킴, 호스트, 포트)를 페이지와 요청 주소로 나란히 견주고(같으면 초록, 다르면 빨강), 아래쪽에 페이지의 스크립트, 브라우저, 요청 주소의 서버를 놓는다. 요청은 서버까지 가고, 응답은 브라우저에서 스크립트로 넘어가거나 막힌다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, pg = this.PAGE, tg = sim.tg;
    var pv = [pg.scheme, pg.host, pg.port], tv = [tg.scheme, tg.host, tg.port], names = ['스킴', '호스트', '포트'];
    P.size(680, 316);
    P.region('cmp', 10, 8, 660, 122, '출처를 이루는 세 가지');
    names.forEach(function (n, i) {
      P.box('c' + i, 20 + i * 218, 36, 204, 82, { cls: s && s.cmp ? (sim.parts[i] ? 'good' : 'bad') : 'plain', title: n + (s && s.cmp ? (sim.parts[i] ? ': 같음' : ': 다름') : ''), sub: ['페이지 ' + (s && s.pg ? pv[i] : '...'), '요청 ' + (s && s.tg ? tv[i] : '...')] });
    });
    P.box('pg', 20, 152, 190, 76, { cls: s ? s.pgCls : 'plain', title: '페이지의 스크립트', sub: [s && s.pg ? pg.origin : '...', s ? s.pgTxt : '대기'] });
    P.box('bw', 270, 152, 110, 76, { cls: s ? s.bwCls : 'plain', title: '브라우저', sub: s ? s.bwTxt : '대기' });
    P.box('sv', 450, 152, 210, 76, { cls: s ? s.svCls : 'plain', title: '요청 주소의 서버', sub: [s && s.tg ? tg.origin : '...', s ? s.svTxt : '대기'] });
    if (s && s.rq) { P.arrow('a1', 'pg:r:0.3', 'bw:l:0.3', { cls: 'hot' }); P.arrow('a2', 'bw:r:0.3', 'sv:l:0.3', { cls: 'hot' }); }
    if (s && s.rs) P.arrow('a3', 'sv:l:0.75', 'bw:r:0.75', { cls: 'good' });
    if (s && s.rs && s.pass) P.arrow('a4', 'bw:l:0.75', 'pg:r:0.75', { cls: 'good' });
    P.box('n1', 14, 262, 322, 36, { cls: s && s.arrived === '예' ? 'wait' : 'ghost', title: '요청이 서버에 도착', right: s ? s.arrived : '아직' });
    P.box('n2', 344, 262, 322, 36, { cls: s && s.read !== '아직' ? (s.read === '예' ? 'good' : 'bad') : 'ghost', title: '스크립트가 응답을 읽음', right: s ? s.read : '아직' });
  },
  assume: '코드 칸은 실행한 프로그램이 아니라 열려 있는 페이지의 주소와 스크립트가 요청하는 주소를 적은 것이고, shop.example은 예약된 예시 도메인이라 실제 서버가 없습니다. 그래서 두 층으로 확인했습니다. 첫째, 화면의 주소 여섯 개(페이지 하나와 요청 주소 다섯 개)의 출처를 Node.js 24.18.0의 URL 표준 구현(new URL(...).origin)으로 계산해, 같은 출처인지와 스킴·호스트·포트 가운데 어느 것이 다른지를 모형과 대조했습니다. 같은 계산에서 https://shop.example:443/x의 출처가 포트를 적지 않은 주소와 같은 https://shop.example로 나오는 것(기본 포트는 생략), 경로와 쿼리가 다른 주소의 출처가 같은 것도 확인했습니다. 둘째, 브라우저가 응답을 스크립트에 넘기는지는 이 PC의 Chrome 155(HeadlessChrome)를 창 없이 실행(--headless=new --dump-dom)해 확인했습니다. 127.0.0.1에 CORS 헤더를 달지 않는 시험 서버를 띄우고(포트는 빈 포트), 서버가 보낸 페이지의 스크립트가 fetch로 아래 주소를 요청해 그 결과를 페이지에 적게 했습니다. 같은 출처는 같은 서버의 /api/items, 경로와 쿼리만 다른 것은 같은 서버의 /other?x=1, 호스트가 다른 것은 같은 컴퓨터 같은 포트에 localhost라는 이름으로(페이지는 127.0.0.1), 포트가 다른 것은 다른 포트의 서버, 스킴이 다른 것은 같은 포트에서 http와 https를 나눠 받는 서버에 https로(자체 서명 인증서) 요청했습니다. 다섯 조합 모두 요청은 서버에 도착했고, 같은 출처 둘은 스크립트가 상태 200과 본문을 읽었고, 나머지 셋은 스크립트가 TypeError(Failed to fetch)를 받아 읽지 못했습니다. 이 실험의 주소는 화면의 주소와 같은 차이를 만든 것이지 화면의 주소 자체는 아닙니다. 스킴 실험은 http 페이지에서 https 주소를 요청하는 방향이라 화면의 예(https 페이지에서 http 주소)와 반대이므로, 화면과 같은 방향(https 페이지에서 http 주소)도 따로 실행해 스크립트가 읽지 못하고 요청은 서버에 도착하는 것을 확인했습니다. 화면의 스킴 예는 스킴과 함께 포트도(http 80, https 443) 다르지만 Chrome 실험은 스킴만 다르게 만들었습니다. 같은 출처에 보낸 요청에는 Origin 헤더가 없었고 다른 출처로 보낸 요청에는 Origin 헤더가 있었는데, 화면은 이를 다루지 않습니다. 서버를 꺼 둔 포트에 요청해도 스크립트가 받는 오류는 막힌 경우와 같은 TypeError(Failed to fetch)였고, 다른 출처 서버가 응답에 Access-Control-Allow-Origin으로 페이지의 출처를 적어 주면 스크립트가 본문을 읽었습니다. 이것들은 이 Chrome 버전에서 관찰한 동작이고, 다른 브라우저와 다른 버전은 실행하지 않았습니다. 문서로 확인한 것은 RFC 6454의 3.2절·4절·5절·6절(출처는 스킴·호스트·포트의 세 값이고, 포트가 없으면 스킴의 기본 포트를 쓰며, 세 값이 모두 같을 때만 같은 출처이고, 적을 때 기본 포트는 생략), WHATWG URL 표준의 4.2절·4.4절·4.7절(http와 https의 기본 포트 80과 443, 기본 포트는 URL에서 null로 저장, http·https URL의 출처는 스킴·호스트·포트로 이루어진 값), MDN의 Same-origin policy(경로만 다른 주소는 같은 출처, 다른 출처로의 읽기는 대체로 막힘, 읽기를 허락하는 방법이 CORS, 악성 페이지의 스크립트가 로그인해 둔 웹메일의 내용을 읽어 가지 못하게 하려는 목적), MDN의 Using the Fetch API(다른 출처 서버가 허락 헤더를 보내지 않으면 브라우저가 응답을 호출한 쪽에 공유하지 않음)입니다. 브라우저가 서버의 응답을 받은 뒤에 허락 표시를 확인한다는 순서와 "로그인해 둔 다른 사이트의 내용을 지킨다"는 목적은 문서의 설명을 따른 것이고, 쿠키가 실제로 함께 가는지는 실행하지 않았습니다. 화면에서 줄인 것은 페이지를 받는 과정, 요청과 응답의 헤더, 응답의 본문 해석입니다. 요청은 특별한 헤더가 없는 평범한 GET 하나만 다뤘습니다. 요청을 보내기 전에 서버에 먼저 묻는 경우(사전 요청), 쿠키를 함께 보내는 요청, 서버가 읽기를 허락하는 방법(CORS)은 "세부 동작 실습: CORS"에서, 출처를 노린 공격은 "세부 동작 실습: 웹 공격 세 가지"에서, 다른 사이트의 페이지를 프레임에 끼워 넣는 일은 "세부 동작 실습: 클릭재킹과 오픈 리다이렉트"에서 다룹니다. 이미지나 스크립트 파일을 다른 출처에서 불러 오는 것(임베딩)은 보통 허용된다는 것과 나머지 출처 규칙(쿠키, 저장소 등)도 이 실습에서 다루지 않았습니다.',
});
