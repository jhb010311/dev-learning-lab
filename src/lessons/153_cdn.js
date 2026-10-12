Lab.register({
  id: 'cdn', nav: 'CDN', cat: '네트워크', mode: 'step',
  title: '원본을 바꿨는데 왜 사용자는 아직 옛 파일을 받나',
  intro: 'CDN은 원본 서버(오리진)가 가진 파일의 사본을 사용자와 가까운 서버(엣지)에 보관해 두고, 엣지가 대신 답하게 하는 방식입니다. 처음 요청은 엣지에 사본이 없어 오리진까지 다녀오지만(MISS), 그 뒤로는 엣지가 바로 답합니다(HIT). 대신 엣지는 정해진 유효 시간 동안 오리진에 다시 묻지 않으므로, 그사이 오리진의 파일을 바꿔도 사용자는 옛 사본을 받습니다.',
  terms: ['CDN', '오리진과 엣지', '캐시 키', '캐시 무효화(Purge)', 'TTL(Time To Live)'],
  controls: [
    { id: 'ttl', label: '엣지가 사본을 써도 되는 시간 (오리진이 응답에 적음)', type: 'select', value: '300', options: [['60', 'Cache-Control: public, s-maxage=60 (60초)'], ['300', 'Cache-Control: public, s-maxage=300 (300초)']] },
    { id: 'q2', label: '10초에 들어오는 요청의 주소', type: 'select', value: 'same', options: [['same', '/app.css?v=1 (처음과 같은 주소)'], ['ref', '/app.css?v=1&ref=mail (쿼리 문자열이 더 붙음)']] },
    { id: 'chg', label: '30초에 오리진의 app.css를 새 내용으로 바꾼다', type: 'check', value: true },
    { id: 'after', label: '바꾼 뒤에 하는 일', type: 'select', value: 'none', options: [['none', '아무것도 하지 않는다'], ['purge', '엣지에 /app.css?v=1의 무효화(purge)를 요청한다'], ['ver', '요청하는 주소를 /app.css?v=2로 바꾼다']], show: function (c) { return c.chg; } },
  ],
  presets: [
    { t: '처음 설정으로', q: 's-maxage=300인 app.css를 0초, 10초, 40초, 80초에 요청하는 중 30초에 오리진이 바뀌면 각 요청은 무엇을 받나', d: '유효 시간 300초. 오리진을 바꿨는데 40초와 80초의 사용자 모두 옛 내용을 받습니다.', v: { ttl: '300', q2: 'same', chg: true, after: 'none' } },
    { t: '유효 시간이 60초라면', q: '엣지가 사본을 써도 되는 시간을 s-maxage=60으로 바꾸면', d: '40초에는 옛 내용, 80초에는 엣지가 다시 물어 새 내용을 받습니다.', v: { ttl: '60', q2: 'same', chg: true, after: 'none' } },
    { t: '무효화(purge)를 하면', q: '오리진의 app.css를 바꾼 뒤 엣지에 /app.css?v=1의 무효화(purge)를 요청하면', d: '엣지의 사본을 지워, 다음 요청이 오리진에서 새 내용을 받아 옵니다.', v: { ttl: '300', q2: 'same', chg: true, after: 'purge' } },
    { t: '주소를 바꾸면', q: '오리진의 app.css를 바꾼 뒤 요청하는 주소를 /app.css?v=2로 바꾸면', d: '?v=2는 다른 주소라서 엣지에 사본이 없고, 새 내용을 받아 옵니다.', v: { ttl: '300', q2: 'same', chg: true, after: 'ver' } },
    { t: '쿼리 문자열이 더 붙으면', q: '10초에 /app.css?v=1&ref=mail로 요청하고 30초에 오리진의 app.css를 바꾸지 않으면', d: '같은 파일인데도 다른 사본으로 취급되어 오리진에 한 번 더 갑니다.', v: { ttl: '300', q2: 'ref', chg: false, after: 'none' } },
    { t: '파일을 바꾸지 않을 때', q: '30초에 오리진의 app.css를 바꾸지 않으면', d: '오리진에는 한 번만 가고 나머지는 모두 엣지가 답합니다.', v: { ttl: '300', q2: 'same', chg: false, after: 'none' } },
  ],
  // 파일을 바꾸지 않으면 "바꾼 뒤에 하는 일"은 쓰이지 않으므로 하나로 고정한다
  fix: function (c) { return c.chg ? null : { after: 'none' }; },
  U1: '/app.css?v=1', UREF: '/app.css?v=1&ref=mail', U2: '/app.css?v=2',
  NEAR: 20, FAR: 200,   // 예시 지연: 사용자와 엣지 사이 왕복 20ms, 엣지와 오리진 사이 왕복 200ms
  code: function (c) {
    var u3 = c.chg && c.after === 'ver' ? this.U2 : this.U1;
    return '# 오리진이 app.css를 줄 때 붙이는 응답 헤더\nCache-Control: public, s-maxage=' + c.ttl + '     # 공유 캐시(엣지)는 ' + c.ttl + '초 동안 사본을 그대로 써도 된다\n\n// 엣지: 사본을 보관했다가 대신 답하는 서버 (Node.js로 줄여 쓴 모습)\nconst store = new Map();                              // 주소(경로 + 쿼리 문자열) → 보관한 사본\nhttp.createServer(async (req, res) => {\n    if (req.method === \'PURGE\') {                     // 무효화: 그 주소의 사본을 지운다\n        store.delete(req.url);\n        return res.end(\'purged\');\n    }\n    const copy = store.get(req.url);\n    if (copy && age(copy) < copy.ttl) {               // 사본이 있고 유효 시간 안\n        res.setHeader(\'X-Cache\', \'HIT\');\n        return res.end(copy.body);                    // 오리진에 묻지 않고 바로 답한다\n    }\n    const fresh = await fetchFromOrigin(req.url);     // 없거나 유효 시간이 지났으면 오리진으로\n    store.set(req.url, fresh);\n    res.setHeader(\'X-Cache\', copy ? \'EXPIRED\' : \'MISS\');\n    res.end(fresh.body);\n});\n\n// 요청 순서\n//  0초  curl https://cdn.shop.example' + this.U1 + '\n// 10초  curl https://cdn.shop.example' + (c.q2 === 'ref' ? this.UREF : this.U1) + (c.chg ? '\n// 30초  오리진의 app.css를 새 내용으로 배포' + (c.after === 'purge' ? '\n//       curl -X PURGE https://cdn.shop.example' + this.U1 : '') : '') + '\n// 40초  curl https://cdn.shop.example' + u3 + '\n// 80초  curl https://cdn.shop.example' + u3;
  },
  label: function (c) { return '유효 ' + c.ttl + '초' + (c.q2 === 'ref' ? ' · 10초에 ?v=1&ref=mail' : '') + (c.chg ? ' · 30초에 내용 변경' + { none: '', purge: ' + 무효화', ver: ' + 주소를 ?v=2로' }[c.after] : ' · 변경 없음'); },
  columns: ['0초의 요청', '10초의 요청', '40초의 요청', '80초의 요청', '오리진에 간 요청'],
  simulate: function (c) {
    var ttl = +c.ttl, U1 = this.U1, U3 = c.chg && c.after === 'ver' ? this.U2 : U1, NEAR = this.NEAR, FAR = this.FAR, ev = [], sum = [];
    var st = { t: -1, reqs: [], entries: [], origin: 'old', oc: 0, cur: null, changed: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function find(url) { return st.entries.filter(function (e) { return e.url === url; })[0]; }
    function name(v) { return !c.chg ? '' : v === 'old' ? '옛 내용' : '새 내용'; }
    // 요청 하나를 엣지가 처리한다. 사본이 없으면 MISS, 있고 유효 시간 안이면 HIT, 있지만 지났으면 EXPIRED
    function request(t, url) {
      var e = find(url), status = !e ? 'MISS' : t - e.at < ttl ? 'HIT' : 'EXPIRED', age = e ? t - e.at : 0, ver;
      if (status === 'HIT') ver = e.ver;
      else { st.oc++; ver = st.origin; if (e) { e.ver = ver; e.at = t; } else st.entries.push({ url: url, ver: ver, at: t }); }
      var ms = status === 'HIT' ? NEAR : NEAR + FAR, stale = status === 'HIT' && ver !== st.origin;
      st.t = t; st.cur = { t: t, url: url, status: status, ver: ver, ms: ms, stale: stale, age: age };
      st.reqs.push(st.cur);
      return st.cur;
    }
    var cell = function (r) { return r.status + (c.chg && r.t >= 30 ? ' · ' + name(r.ver) : ''); };
    var r1 = request(0, U1);
    push('0초: 사용자가 GET ' + U1 + ' 요청을 보냅니다. 요청은 오리진이 아니라 사용자와 가까운 엣지 서버에 도착합니다. 엣지에는 이 주소의 사본이 없습니다(MISS). 엣지가 멀리 있는 오리진에서 파일을 받아 와 사용자에게 주고, 사본을 보관합니다. 오리진이 응답에 적은 s-maxage=' + ttl + '에 따라 이 사본은 ' + ttl + '초 동안 그대로 써도 됩니다.', '');
    var r2 = request(10, c.q2 === 'ref' ? this.UREF : U1);
    if (c.q2 === 'same') push('10초: 다른 사용자가 같은 주소를 요청합니다. 엣지에 사본이 있고 받아 온 지 10초라 유효 시간 안입니다(HIT). 엣지가 오리진에 묻지 않고 바로 답합니다. 오리진은 이 요청이 있었는지도 모릅니다. 여러 사용자가 한 사본을 함께 쓰기 때문에 공유 캐시라고 부릅니다.', 'good');
    else push('10초: 다른 사용자가 메일에 있던 링크로 ' + this.UREF + ' 주소를 요청합니다. 같은 파일이지만 쿼리 문자열이 달라 주소가 다릅니다. 엣지는 주소 전체를 이름표로 삼아 사본을 찾으므로 맞는 사본이 없습니다(MISS). 오리진에 한 번 더 다녀오고, 같은 내용의 사본을 이 주소로 하나 더 보관합니다.', 'bad');
    if (c.chg) {
      st.t = 30; st.origin = 'new'; st.changed = true; st.cur = null;
      push('30초: 개발자가 오리진의 app.css를 새 내용으로 바꿔 배포합니다. 오리진은 이 사실을 엣지에 알리지 않습니다. 엣지가 보관한 사본은 옛 내용 그대로입니다.', '');
      if (c.after === 'purge') {
        st.entries = st.entries.filter(function (e) { return e.url !== U1; });
        push('이어서 엣지에 ' + U1 + ' 주소의 무효화(purge)를 요청합니다. 엣지가 그 주소의 사본을 지웁니다.' + (c.q2 === 'ref' ? ' 주소가 다른 ' + this.UREF + ' 쪽 사본은 지워지지 않고 옛 내용으로 남습니다.' : ''), 'good');
      }
      if (c.after === 'ver') push('이어서 웹 페이지가 가리키는 주소를 ' + this.U2 + '로 바꿉니다. 엣지의 사본은 건드리지 않습니다. 사용자는 이제 새 주소로 요청하게 됩니다.', 'good');
    }
    var r3 = request(40, U3);
    if (r3.status === 'HIT') push('40초: 사용자가 ' + U3 + ' 주소를 요청합니다. 엣지의 사본은 받아 온 지 40초라 유효 시간(' + ttl + '초) 안입니다(HIT). 엣지가 보관한 사본을 그대로 줍니다.' + (r3.stale ? ' 오리진의 파일은 10초 전에 바뀌었지만 엣지는 알지 못합니다. 사용자는 옛 내용을 받습니다.' : ''), r3.stale ? 'bad' : 'good');
    else push('40초: 사용자가 ' + U3 + ' 주소를 요청합니다. ' + (c.after === 'purge' ? '사본이 지워졌으므로' : '?v=2는 엣지가 처음 보는 주소이므로') + ' 엣지에 맞는 사본이 없습니다(MISS). 엣지가 오리진에서 받아 온 것은 새 내용이고, 이것을 사본으로 보관합니다.', 'good');
    var r4 = request(80, U3);
    if (r4.status === 'EXPIRED') push('80초: 사용자가 ' + U3 + ' 주소를 요청합니다. 사본이 있지만 받아 온 지 ' + r4.age + '초가 지나 유효 시간(' + ttl + '초)을 넘겼습니다(EXPIRED). 엣지는 이 사본을 그대로 쓰지 않고 오리진에 다시 요청합니다.' + (c.chg ? ' 이번에 받아 온 것은 새 내용입니다. 이제야 사용자에게 바뀐 파일이 전달됩니다.' : ' 내용은 그대로지만 사본의 유효 시간이 다시 시작됩니다.'), c.chg ? 'good' : '');
    else push('80초: 사용자가 ' + U3 + ' 주소를 요청합니다. 사본은 받아 온 지 ' + r4.age + '초라 유효 시간(' + ttl + '초) 안입니다(HIT). 엣지가 바로 답합니다.' + (r4.stale ? ' 오리진의 파일이 바뀐 지 50초가 지났는데도 사용자는 여전히 옛 내용을 받습니다. 유효 시간이 끝나는 ' + ttl + '초까지 계속 이렇게 됩니다.' : ''), r4.stale ? 'bad' : 'good');
    var stales = st.reqs.filter(function (r) { return r.stale; }).length;
    sum.push('엣지가 바로 답하면 가까운 거리만 오가므로 빠르고(예시 ' + NEAR + 'ms), 오리진까지 가면 먼 거리가 더해집니다(예시 ' + (NEAR + FAR) + 'ms). 오리진이 받는 요청도 줄어듭니다. 이 시간은 차이를 보이기 위한 예시입니다.');
    if (stales) sum.push('엣지는 유효 시간 동안 오리진에 다시 묻지 않습니다. 그래서 오리진의 파일을 바꿔도 유효 시간이 남은 사본이 계속 나갑니다. 유효 시간을 길게 잡을수록 빠르지만 바뀐 내용이 늦게 퍼집니다.' + (c.ttl === '60' ? ' 60초로 잡은 이 설정에서는 80초의 요청부터 새 내용이 나갔습니다.' : ''));
    if (c.chg && c.after === 'purge') sum.push('무효화(purge)는 유효 시간이 남은 사본을 강제로 지우는 기능입니다. 지운 뒤의 첫 요청은 MISS가 되어 오리진에서 새 내용을 받아 옵니다. 지우는 것은 지정한 주소의 사본뿐이고, 사용자의 브라우저가 따로 보관한 사본까지 지우지는 못합니다.');
    if (c.chg && c.after === 'ver') sum.push('쿼리 문자열이 다르면 엣지는 다른 사본으로 봅니다. 이것을 이용해 파일을 바꿀 때마다 주소의 버전을 올리면(?v=2, 또는 파일 이름에 해시를 붙임) 무효화 없이도 새 내용이 곧바로 나갑니다. 주소가 내용과 함께 바뀌므로 유효 시간을 아주 길게 잡아도 됩니다. 옛 주소 ' + U1 + '의 사본은 옛 내용 그대로 남습니다.');
    if (c.q2 === 'ref') sum.push('엣지는 경로와 쿼리 문자열을 합친 주소 전체로 사본을 찾습니다. 광고나 메일의 링크에 붙는 추적용 값처럼 내용과 무관한 쿼리 문자열이 붙어도 다른 사본이 되어, 오리진에 가는 요청이 늘어납니다. 그래서 CDN에는 사본을 찾을 때 일부 쿼리 문자열을 무시하는 설정이 있습니다.');
    if (!c.chg && c.q2 === 'same') sum.push(c.ttl === '300' ? '파일이 바뀌지 않는 동안에는 유효 시간이 길수록 좋습니다. 오리진에는 처음 한 번만 갔습니다.' : '유효 시간이 지나면 내용이 그대로여도 엣지가 오리진에 다시 갑니다. 유효 시간이 짧으면 바뀐 내용이 빨리 퍼지는 대신 오리진에 가는 일이 잦아집니다.');
    return { events: ev, summary: sum, row: [cell(r1), cell(r2), cell(r3), cell(r4), st.oc + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 0초의 첫 요청부터 시작합니다.'); return; }
    var name = function (x) { return !c.chg ? '사본' : x === 'old' ? '옛 내용' : '새 내용'; };
    H.counters(v, [[s.reqs.filter(function (r) { return r.status === 'HIT'; }).length + '번', '엣지가 바로 답함'], [s.oc + '번', '오리진에 간 요청']]);
    H.table(v, ['시각', '요청한 주소', '엣지의 판단', '사용자가 받은 것', '걸린 시간 (예시)'], s.reqs.map(function (r) { return { cells: [r.t + '초', r.url, { v: r.status, cls: r.status === 'HIT' ? 'good' : 'hot' }, { v: name(r.ver) + (r.stale ? ' (오리진은 이미 바뀜)' : ''), cls: r.stale ? 'bad' : '' }, r.ms + 'ms'] }; }), '사용자의 요청');
  },
  // 그림: 사용자 → 엣지 → 오리진. 엣지 안에 보관한 사본을 주소별로 쌓는다. 엣지에서 오리진으로 가는 화살표는 MISS나 EXPIRED일 때만 생긴다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], c = sim.c, ttl = +c.ttl, s = last ? last.snap : { t: 0, reqs: [], entries: [], origin: 'old', oc: 0, cur: null, changed: false }, cur = s.cur;
    var name = function (x) { return !c.chg ? '사본' : x === 'old' ? '옛 내용' : '새 내용'; };
    P.size(680, 300);
    P.box('u', 16, 62, 124, 60, { cls: cur ? 'wait' : 'plain', title: '사용자', sub: '엣지와 가깝다' });
    P.region('eg', 172, 16, 300, 210, '엣지 서버: 사용자 가까이에 둔 사본 보관소');
    P.box('ed', 184, 44, 276, 32, { cls: !cur ? 'plain' : cur.status === 'HIT' ? 'good' : 'hot', title: '엣지의 판단', right: cur ? cur.status : '-' });
    [this.U1, this.UREF, this.U2].forEach(function (u, i) {
      var e = s.entries.filter(function (x) { return x.url === u; })[0]; if (!e) return;
      var fresh = s.t - e.at < ttl;
      P.box('e' + i, 184, 84 + i * 46, 276, 40, { cls: (!fresh ? 'ghost' : e.ver !== s.origin ? 'bad' : 'good') + (cur && cur.url === u ? ' now' : ''), title: u, right: name(e.ver), sub: e.at + '초에 받음 · ' + (fresh ? (e.at + ttl) + '초까지 유효' : '유효 시간 지남') });
    });
    P.box('o', 504, 62, 160, 60, { cls: s.changed && s.t === 30 ? 'hot' : 'plain', title: '오리진 (원본 서버)', sub: ['멀리 있다', 'app.css: ' + (c.chg ? (s.origin === 'old' ? '옛 내용' : '새 내용') : '그대로')] });
    if (cur) { P.arrow('ue', 'u:r', 'ed:l', { label: '요청' }); if (cur.status !== 'HIT') P.arrow('eo', 'ed:r', 'o:l', { cls: 'hot', label: '받으러 감' }); }
    P.box('now', 16, 240, 648, 36, { cls: !cur ? 'ghost' : cur.stale ? 'bad' : cur.status === 'HIT' ? 'good' : 'hot', title: cur ? cur.t + '초: GET ' + cur.url : s.t === 30 ? '30초: 오리진의 파일을 바꿈' : '아직 요청 전', right: cur ? cur.status + (c.chg ? ' · ' + name(cur.ver) : '') + ' · ' + cur.ms + 'ms (예시)' : '' });
    P.note('엣지에서 오리진으로 가는 화살표가 없는 단계는 엣지가 보관한 사본으로 바로 답한 것입니다. 빨간 사본은 오리진의 지금 내용과 다른 옛 사본입니다. 걸린 시간은 거리 차이를 보이기 위한 예시입니다.');
  },
  assume: '열여섯 가지 조합(파일을 바꾸지 않으면 "바꾼 뒤에 하는 일"은 쓰이지 않음)을 127.0.0.1에 띄운 오리진 서버와 엣지 역할의 작은 캐싱 프록시로 실행해, 네 번의 요청이 각각 MISS, HIT, EXPIRED 가운데 무엇이었는지와 받은 내용, 오리진에 도착한 요청 수가 모형과 같은 것을 확인했습니다. 엣지는 Node.js 24로 직접 만든 시험용이며, 사본을 보관해도 되는지와 유효 시간이 남았는지는 HTTP 캐시 규칙 구현인 http-cache-semantics 4.2(공유 캐시 모드)에 맡겼습니다. 80초를 기다리지 않도록 엣지의 시계를 빠르게 돌려(모형의 1초를 실제 30ms로) 시험했고, 사용자 역할은 Node의 fetch와 curl 8.21이 번갈아 맡았습니다. 실제 CDN 서비스에서 확인한 것은 아닙니다. 걸린 시간(20ms, 220ms)과 "가깝다, 멀다"는 측정값이 아니라 차이를 보이기 위한 예시입니다. s-maxage가 공유 캐시의 유효 시간을 정한다는 것과 유효 시간이 지난 사본을 그대로 쓰지 않는다는 것은 RFC 9111 4.2절과 5.2.2.10절, 사본을 요청 메서드와 주소로 찾는다는 것은 2절을 따랐습니다. HIT, MISS, EXPIRED라는 이름과 X-Cache 헤더는 표준이 아니라 여러 CDN과 프록시가 쓰는 관례이고 제품마다 표기가 다릅니다. 무효화(purge)도 표준에 없는 제품별 기능이며, 여기서는 PURGE 메서드로 한 주소의 사본을 지우는 흔한 방식을 따랐습니다. 유효 시간이 지났을 때 이 모형의 엣지는 파일 전체를 다시 받지만, 실제 CDN은 대개 조건부 요청으로 "바뀌었는지"만 먼저 묻습니다(HTTP 캐시와 ETag 실습 참고). 엣지가 여러 지역에 여러 대 있고 저마다 사본을 따로 보관한다는 것, 브라우저가 따로 보관하는 사본, 사본을 미리 채워 두는 기능은 다루지 않았습니다.',
});
