Lab.register({
  id: 'url', nav: 'URL의 구조', cat: '네트워크', mode: 'step',
  title: '검색어 "A&B"를 주소에 붙였더니 서버에는 "A"만 도착했다',
  intro: 'URL은 정해진 기호(://, :, /, ?, #, &, =)를 기준으로 스킴, 호스트, 포트, 경로, 쿼리, 프래그먼트로 나뉩니다. 이 기호들은 주소 안에서 구분하는 역할을 맡고 있어서, 값 안에 같은 글자를 그대로 넣으면 주소가 엉뚱한 곳에서 잘립니다.',
  terms: ['URI와 URL', 'URL의 구성 요소', '퍼센트 인코딩', '쿼리 스트링과 폼 본문', '상대 URL'],
  controls: [
    { id: 'origin', label: '주소의 앞부분 (스킴, 호스트, 포트)', type: 'select', value: 'https://shop.example', options: [['https://shop.example', 'https://shop.example (포트를 적지 않음)'], ['https://shop.example:443', 'https://shop.example:443'], ['https://shop.example:8443', 'https://shop.example:8443'], ['http://shop.example', 'http://shop.example (포트를 적지 않음)'], ['http://shop.example:8080', 'http://shop.example:8080']] },
    { id: 'q', label: '쿼리에 넣을 검색어', type: 'select', value: 'A&B', options: [['A&B', 'A&B'], ['C#', 'C#'], ['C++', 'C++'], ['겨울 옷', '겨울 옷 (한글과 공백)'], ['keyboard', 'keyboard']] },
    { id: 'enc', label: '검색어를 인코딩해서 넣는다', type: 'check', value: false, hint: '끄면 글자를 그대로 이어 붙이고, 켜면 searchParams.set으로 넣습니다.' },
    { id: 'rel', label: '이 페이지 안의 링크 (상대 주소)', type: 'select', value: 'detail', options: [['detail', 'detail'], ['../cart', '../cart'], ['/help', '/help'], ['?page=2', '?page=2'], ['#top', '#top'], ['//cdn.example/app.js', '//cdn.example/app.js']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '검색어 A&B를 인코딩 없이 주소에 이어 붙여 보내면 서버는 q를 어떻게 받나', d: '검색어 A&B를 그대로 이어 붙입니다. 서버는 q의 값으로 A만 받습니다.', v: { origin: 'https://shop.example', q: 'A&B', enc: false, rel: 'detail' } },
    { t: '인코딩해서 넣으면', q: '검색어 A&B를 인코딩해서 넣으면', d: '&가 %26으로 바뀌어 값이 온전히 도착합니다.', v: { origin: 'https://shop.example', q: 'A&B', enc: true, rel: 'detail' } },
    { t: '검색어에 #이 있으면', q: '검색어를 C#으로, 페이지 안의 링크를 #top으로 바꾸면', d: '# 뒤가 모두 프래그먼트가 되어 서버로 가지 않습니다.', v: { origin: 'https://shop.example', q: 'C#', enc: false, rel: '#top' } },
    { t: '검색어에 +가 있으면', q: '검색어를 C++로 바꾸면', d: '서버는 +를 공백으로 읽습니다.', v: { origin: 'https://shop.example', q: 'C++', enc: false, rel: 'detail' } },
    { t: '한글과 공백', q: '검색어를 겨울 옷으로 바꾸고 인코딩해서 넣으면', d: '브라우저가 대신 바꿔 주는 글자와 그 모양을 봅니다.', v: { origin: 'https://shop.example', q: '겨울 옷', enc: true, rel: '?page=2' } },
    { t: '포트를 적은 주소', q: '주소의 앞부분을 https://shop.example:8443으로, 검색어를 keyboard로 바꾸고 인코딩해서 넣으면', d: '기본 포트가 아닌 8443번으로 접속하고, Host 헤더에도 포트가 붙습니다.', v: { origin: 'https://shop.example:8443', q: 'keyboard', enc: true, rel: '/help' } },
    { t: '기본 포트를 굳이 적으면', q: '주소의 앞부분에 :443을 적어 https://shop.example:443으로 바꾸고 keyboard를 인코딩해서 넣으면', d: ':443은 적지 않은 것과 같아서 정리된 주소에서 사라집니다.', v: { origin: 'https://shop.example:443', q: 'keyboard', enc: true, rel: '../cart' } },
  ],
  code: function (c) {
    var head = '// 자바스크립트입니다. 브라우저 개발자 도구의 콘솔에 붙여 넣으면 실행됩니다.\nconst keyword = \'' + c.q + '\';\n\n';
    var make = c.enc ? '// 검색어를 인코딩해서 넣는다\nconst url = new URL(\'' + c.origin + '/shop/list\');\nurl.searchParams.set(\'q\', keyword);\nurl.searchParams.set(\'sort\', \'price\');\nurl.hash = \'review\';\n' : '// 검색어를 글자 그대로 이어 붙인다\nconst url = new URL(\'' + c.origin + '/shop/list?q=\' + keyword + \'&sort=price#review\');\n';
    return head + make + '\nconsole.log(url.href);                                   // 브라우저가 정리한 주소\nconsole.log(url.protocol, url.hostname, url.port, url.pathname, url.search, url.hash);\nconsole.log([...url.searchParams]);                      // 쿼리를 이름과 값으로 풀이한 결과 (서버가 하는 풀이와 같은 규칙)\nconsole.log(new URL(\'' + c.rel + '\', url).href);' + ' '.repeat(Math.max(1, 22 - c.rel.length)) + '// 링크(href="' + c.rel + '")가 가리키는 주소';
  },
  label: function (c) { return c.origin + ' · 검색어 ' + c.q + (c.enc ? ' (인코딩함)' : ' (그대로)') + ' · 링크 ' + c.rel; },
  columns: ['접속하는 포트', '서버로 가는 요청 줄', '서버가 받은 q', '서버가 받은 모든 파라미터', '링크가 가리키는 주소'],
  PORTS: { http: '80', https: '443' },
  // 글자 하나(코드 포인트)를 UTF-8 바이트로 바꿔 %XX 모양으로 적는다
  pct: function (cp) {
    var b = cp < 0x80 ? [cp] : cp < 0x800 ? [0xC0 | (cp >> 6), 0x80 | (cp & 63)] : cp < 0x10000 ? [0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)] : [0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
    return b.map(function (x) { return '%' + (x < 16 ? '0' : '') + x.toString(16).toUpperCase(); }).join('');
  },
  // 글자를 코드 포인트의 배열로 (보조 문자는 두 칸을 하나로 합친다)
  cps: function (s) { var out = [], i, a, b; for (i = 0; i < s.length; i++) { a = s.charCodeAt(i); b = s.charCodeAt(i + 1); if (a >= 0xD800 && a <= 0xDBFF && b >= 0xDC00 && b <= 0xDFFF) { out.push((a - 0xD800) * 0x400 + (b - 0xDC00) + 0x10000); i++; } else out.push(a); } return out; },
  // 값을 쿼리에 넣을 때의 인코딩(searchParams.set이 하는 일): 영문자, 숫자, * - . _ 는 그대로, 공백은 +, 나머지는 %XX
  formEncode: function (s) {
    var self = this;
    return this.cps(s).map(function (cp) { var ch = String.fromCharCode(cp); return cp < 0x80 && /[A-Za-z0-9*\-._]/.test(ch) ? ch : cp === 0x20 ? '+' : self.pct(cp); }).join('');
  },
  // 이미 만들어진 주소 글자를 브라우저가 정리할 때 하는 인코딩. set에 든 글자와 공백, 제어 문자, 아스키 밖의 글자만 바꾼다. &, =, +, % 는 건드리지 않는다
  looseEncode: function (s, set) {
    var self = this;
    return this.cps(s).map(function (cp) { return cp <= 0x20 || cp > 0x7E || (cp < 0x80 && set.indexOf(String.fromCharCode(cp)) >= 0) ? self.pct(cp) : String.fromCharCode(cp); }).join('');
  },
  // 주소 글자를 부분으로 나눈다: 스킴 :// 호스트 :포트 /경로 ?쿼리 #프래그먼트
  parse: function (str) {
    var u = { scheme: '', host: '', port: '', typedPort: '', path: '/', query: null, frag: null }, i = str.indexOf('://'), rest, h, a;
    u.scheme = str.slice(0, i).toLowerCase(); rest = str.slice(i + 3);
    h = rest.indexOf('#'); if (h >= 0) { u.frag = this.looseEncode(rest.slice(h + 1), '"<>`'); rest = rest.slice(0, h); }
    h = rest.indexOf('?'); if (h >= 0) { u.query = this.looseEncode(rest.slice(h + 1), '"#<>\''); rest = rest.slice(0, h); }
    h = rest.indexOf('/'); a = h >= 0 ? rest.slice(0, h) : rest; if (h >= 0) u.path = this.dots(rest.slice(h));
    h = a.lastIndexOf(':'); if (h >= 0) { u.typedPort = a.slice(h + 1); a = a.slice(0, h); }
    u.host = a.toLowerCase(); u.port = u.typedPort === this.PORTS[u.scheme] ? '' : u.typedPort;
    return u;
  },
  // 경로에서 . 과 .. 을 풀어낸다
  dots: function (path) {
    var segs = path.split('/'), out = [], i, s, end; segs.shift();
    for (i = 0; i < segs.length; i++) { s = segs[i]; end = i === segs.length - 1; if (s === '..') { if (out.length) out.pop(); if (end) out.push(''); } else if (s === '.') { if (end) out.push(''); } else out.push(s); }
    return '/' + out.join('/');
  },
  href: function (u) { return u.scheme + '://' + u.host + (u.port ? ':' + u.port : '') + u.path + (u.query !== null ? '?' + u.query : '') + (u.frag !== null ? '#' + u.frag : ''); },
  // 상대 주소 rel을 기준 주소 b에 비추어 풀이한다
  resolve: function (rel, b) {
    var r = { scheme: b.scheme, host: b.host, port: b.port, typedPort: b.port, path: b.path, query: null, frag: null }, h, rq = null;
    if (/^[A-Za-z][A-Za-z0-9+.\-]*:\/\//.test(rel)) return this.parse(rel);
    if (rel.slice(0, 2) === '//') return this.parse(b.scheme + ':' + rel);
    h = rel.indexOf('#'); if (h >= 0) { r.frag = this.looseEncode(rel.slice(h + 1), '"<>`'); rel = rel.slice(0, h); }
    h = rel.indexOf('?'); if (h >= 0) { rq = this.looseEncode(rel.slice(h + 1), '"#<>\''); rel = rel.slice(0, h); }
    if (rel === '') { r.query = rq !== null ? rq : b.query; return r; }
    r.query = rq;
    r.path = this.dots(rel.charAt(0) === '/' ? rel : b.path.slice(0, b.path.lastIndexOf('/') + 1) + rel);
    return r;
  },
  // %XX와 +를 원래 글자로 되돌린다
  formDecode: function (s) {
    var bytes = [], i, out = '', cp, n, k;
    for (i = 0; i < s.length; i++) {
      if (s.charAt(i) === '+') bytes.push(0x20);
      else if (s.charAt(i) === '%' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else this.cps(s.charAt(i)).forEach(function (c) { if (c < 0x80) bytes.push(c); else bytes.push(-c); });
    }
    for (i = 0; i < bytes.length; i++) {
      cp = bytes[i];
      if (cp < 0) { out += String.fromCharCode(-cp); continue; }
      n = cp < 0x80 ? 0 : cp >= 0xC2 && cp < 0xE0 ? 1 : cp >= 0xE0 && cp < 0xF0 ? 2 : cp >= 0xF0 && cp < 0xF5 ? 3 : -1;
      if (n < 0) { out += '�'; continue; }
      if (n) { cp = cp & (0x3F >> n); for (k = 1; k <= n; k++) { if (i + k >= bytes.length || bytes[i + k] < 0x80 || bytes[i + k] > 0xBF) { cp = -1; break; } cp = cp * 64 + (bytes[i + k] & 63); } if (cp < 0) { out += '�'; continue; } i += n; }
      out += cp >= 0x10000 ? String.fromCharCode(0xD800 + ((cp - 0x10000) >> 10), 0xDC00 + ((cp - 0x10000) & 0x3FF)) : String.fromCharCode(cp);
    }
    return out;
  },
  // 서버가 쿼리를 풀이하는 규칙: &에서 나누고, 첫 번째 =에서 이름과 값으로 나누고, 인코딩을 되돌린다
  parseForm: function (query) {
    var self = this;
    return (query || '').split('&').filter(function (p) { return p !== ''; }).map(function (p) { var e = p.indexOf('='); return e < 0 ? [self.formDecode(p), ''] : [self.formDecode(p.slice(0, e)), self.formDecode(p.slice(e + 1))]; });
  },
  simulate: function (c) {
    var ev = [], sum = [], st = { stage: 0 }, q = c.q, u, typed;
    function push(s, kind) { st.stage++; ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    if (c.enc) { u = this.parse(c.origin + '/shop/list'); u.query = 'q=' + this.formEncode(q) + '&sort=price'; u.frag = 'review'; typed = this.href(u); }
    else { typed = c.origin + '/shop/list?q=' + q + '&sort=price#review'; u = this.parse(typed); }
    var href = this.href(u), def = this.PORTS[u.scheme], eff = u.port || def, params = this.parseForm(u.query), got = null, target = u.path + (u.query !== null ? '?' + u.query : ''), hostHeader = u.host + (u.port ? ':' + u.port : '');
    params.forEach(function (p) { if (got === null && p[0] === 'q') got = p[1]; });
    var link = this.resolve(c.rel, u), linkHref = this.href(link), ok = got === q, sortOk = params.some(function (p) { return p[0] === 'sort' && p[1] === 'price'; });
    var portWhy = u.typedPort === '' ? u.scheme + '의 기본 포트' : u.typedPort === def ? '적은 포트가 기본 포트와 같음' : '주소에 적은 포트';
    var plist = params.map(function (p) { return p[0] + '="' + p[1] + '"'; }).join(', ');
    var encQ = this.formEncode(q), rawQ = u.query;
    if (c.enc) push('주소 만들기: searchParams.set이 검색어("' + q + '")를 인코딩해서 쿼리에 넣었습니다. 영문자, 숫자와 몇몇 기호(* - . _)를 뺀 글자는 그 글자의 바이트를 %와 16진수 두 자리로 적은 모양으로 바뀝니다. ' + { 'A&B': '&는 %26이 됐습니다.', 'C#': '#은 %23이 됐습니다.', 'C++': '+는 %2B가 됐습니다.', '겨울 옷': '한글은 한 글자가 3바이트(UTF-8)라서 %XX 세 개가 되고, 공백은 +가 됐습니다.', 'keyboard': '이 검색어에는 바꿀 글자가 없어 그대로입니다.' }[q] + ' 넣은 결과는 q=' + encQ + '입니다.', 'good');
    else push('주소 만들기: 검색어("' + q + '")를 글자 그대로 주소 뒤에 이어 붙였습니다. 만들어진 글자는 ' + typed + ' 입니다.', '');
    push('스킴: 맨 앞에서 :// 앞까지인 ' + u.scheme + '입니다. 어떤 프로토콜로 접속할지를 정합니다.');
    push('호스트와 포트: :// 다음부터 첫 번째 / 앞까지가 접속할 곳입니다. 호스트는 ' + u.host + '입니다. ' + (u.typedPort === '' ? '포트는 적지 않았으므로 ' + u.scheme + '의 기본 포트인 ' + def + '번으로 접속합니다.' : u.typedPort === def ? ':' + def + '을 적었지만 ' + u.scheme + '의 기본 포트와 같은 번호라서 적지 않은 것과 같습니다. 브라우저는 주소를 정리하면서 이 부분을 지웁니다.' : '포트를 적었으므로 기본 포트(' + def + '번) 대신 ' + u.typedPort + '번으로 접속합니다.'));
    push('경로: 호스트와 포트 다음의 ' + u.path + '입니다. 서버 안에서 무엇을 달라는 것인지를 가리키며, 첫 번째 ? 앞에서 끝납니다.');
    var cutHash = !c.enc && q.indexOf('#') >= 0, auto = !c.enc && rawQ !== 'q=' + q + '&sort=price' && !cutHash;
    push('쿼리: ? 다음부터 첫 번째 # 앞까지인 ' + rawQ + '입니다. 서버에 넘길 이름=값 쌍을 &로 이어 적는 자리입니다.' + (cutHash ? ' 검색어 안의 #이 프래그먼트가 시작하는 표시로 읽혀서, 쿼리가 거기서 끝나 버렸습니다.' : auto ? ' 주소에 그대로 쓸 수 없는 한글과 공백은 브라우저가 주소를 정리하면서 %XX 모양으로 바꿔 놓았습니다(공백은 %20).' : ''), cutHash ? 'bad' : '');
    push('프래그먼트: 첫 번째 # 뒤 전부인 ' + u.frag + '입니다. 받은 문서 안의 어느 위치인지를 가리키는 표시이고 브라우저만 씁니다. 서버로는 보내지 않습니다.' + (cutHash ? ' 쿼리에 있어야 할 &sort=price까지 여기에 들어가 버렸습니다.' : ''), cutHash ? 'bad' : '');
    push('서버로 가는 것: 브라우저는 ' + u.host + '의 ' + eff + '번 포트에 연결해, 요청 줄(GET ' + target + ' HTTP/1.1)과 Host 헤더(Host: ' + hostHeader + ')를 보냅니다. 요청 줄에는 경로와 쿼리만 들어가고, 프래그먼트는 어디에도 실리지 않습니다.');
    var why = ok && sortOk ? (c.enc ? '검색어가 보낸 그대로 도착했습니다. 인코딩된 %XX와 +는 구분 기호로 읽히지 않고, 나눈 뒤에야 원래 글자로 돌아오기 때문입니다.' : auto ? '검색어가 온전히 도착했습니다. 한글과 공백은 브라우저가 대신 인코딩해 주기 때문입니다. 하지만 &, #, +처럼 주소에서 특별한 뜻이 있는 글자는 브라우저가 바꿔 주지 않습니다.' : '이 검색어에는 주소에서 특별한 뜻을 가진 글자가 없어서 그대로 붙여도 온전히 도착했습니다.') : q === 'A&B' ? '검색어 안의 &가 쌍을 나누는 기호로 읽혔습니다. q의 값은 "A"에서 잘렸고, B라는 엉뚱한 이름이 하나 더 생겼습니다.' : q === 'C#' ? '# 뒤는 서버에 오지 않았습니다. q의 값은 "C"에서 잘렸고, 뒤에 있던 sort도 함께 사라졌습니다.' : '쿼리에서 +는 공백을 뜻하는 기호입니다. q의 값이 "C" 뒤에 공백 두 칸이 붙은 글자가 됐습니다.';
    push('서버의 쿼리 풀이: 쿼리를 &에서 나누고, 조각마다 첫 번째 =에서 이름과 값으로 나눈 다음, +는 공백으로 %XX는 원래 글자로 되돌립니다. 결과는 ' + plist + '입니다. ' + why, ok && sortOk ? 'good' : 'bad');
    var relWhy = { 'detail': '/로 시작하지 않으므로, 지금 경로(' + u.path + ')의 마지막 조각을 detail로 바꿉니다. 쿼리와 프래그먼트는 물려받지 않습니다.', '../cart': '..은 한 단계 위를 뜻합니다. 지금 경로(' + u.path + ')에서 마지막 조각을 떼면 /shop/이고, 거기서 한 단계 올라가 cart를 붙이면 /cart입니다.', '/help': '/로 시작하므로 경로 전체를 /help로 바꿉니다. 스킴, 호스트, 포트는 지금 주소의 것을 그대로 씁니다.', '?page=2': '?로 시작하므로 경로는 그대로 두고 쿼리만 page=2로 바꿉니다. 지금 주소의 쿼리는 이어받지 않고 통째로 바뀝니다.', '#top': '#으로 시작하므로 경로와 쿼리는 그대로 두고 프래그먼트만 top으로 바꿉니다. 같은 문서 안에서 위치만 옮기는 것이라 서버에 새 요청을 보내지 않습니다.', '//cdn.example/app.js': '//로 시작하므로 스킴(' + u.scheme + ')만 물려받고 호스트부터 새로 정합니다. 포트도 물려받지 않습니다.' }[c.rel];
    push('상대 주소 풀이: 이 페이지 안의 링크(href="' + c.rel + '")는 주소의 일부만 적은 것이라서, 브라우저가 지금 주소를 기준으로 빠진 부분을 채웁니다. ' + relWhy + ' 결과는 ' + linkHref + ' 입니다.');
    if (!ok) sum.push('&, =, #, +, %, ?는 주소 안에서 구분하는 일을 맡은 글자입니다. 값에 이런 글자가 들어갈 수 있으면 반드시 인코딩해서 넣어야 합니다. 자바스크립트에서는 URLSearchParams나 encodeURIComponent, 자바에서는 URLEncoder.encode가 이 일을 합니다. 글자를 직접 이어 붙여 주소를 만드는 코드는 평소에는 잘 돌다가 이런 값이 들어오는 날 틀립니다.');
    else if (c.enc) sum.push('인코딩은 값 안의 글자가 구분 기호로 읽히지 않게 %XX 모양으로 바꿔 두는 일입니다. 서버는 구분 기호로 먼저 나눈 다음에 되돌리므로 값이 온전합니다.');
    else sum.push('이 검색어는 그대로 붙여도 문제가 없었지만, 사용자가 입력하는 값에는 어떤 글자든 들어올 수 있습니다.');
    sum.push('프래그먼트(# 뒤)는 서버로 가지 않습니다. 서버 로그에도 남지 않으며, 서버 코드에서 읽을 수도 없습니다. 반대로 쿼리는 서버로 가고 서버의 접속 기록에도 남을 수 있으므로, 비밀번호 같은 값을 쿼리에 넣지 않습니다.');
    if (u.typedPort !== '') sum.push(u.port === '' ? '기본 포트(http는 80, https는 443)는 적어도 적지 않은 것과 같습니다. 그래서 정리된 주소와 Host 헤더에는 포트가 나타나지 않습니다.' : '기본 포트가 아닌 번호는 주소에 반드시 적어야 하고, Host 헤더에도 함께 실립니다.');
    return { events: ev, summary: sum, u: u, typed: typed, href: href, eff: eff, def: def, target: target, hostHeader: hostHeader, params: params, got: got, ok: ok && sortOk, link: linkHref, portWhy: portWhy,
      row: [eff + ' (' + portWhy + ')', 'GET ' + target + ' HTTP/1.1', got === null ? '없음' : '"' + got + '"' + (ok ? '' : ' (보낸 값은 "' + q + '")'), plist, linkHref] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.stage : 0, u = sim.u, c = sim.c;
    if (!n) { H.text(v, '실행을 누르면 주소를 만들고, 앞에서부터 한 부분씩 나눕니다.'); return; }
    H.table(v, ['무엇', '글자'], [{ cells: [c.enc ? '만들어진 주소' : '이어 붙인 글자', { v: sim.typed, cls: 'hot' }] }].concat(n >= 6 && sim.href !== sim.typed ? [{ cells: ['브라우저가 정리한 주소', sim.href] }] : []), '주소');
    var rows = [];
    if (n >= 2) rows.push({ cells: ['스킴', u.scheme, '접속에 쓸 프로토콜', '아니요'] });
    if (n >= 3) rows.push({ cells: ['호스트', u.host, '접속할 컴퓨터의 이름', 'Host 헤더로'] }, { cells: ['포트', u.typedPort === '' ? '(적지 않음)' : u.typedPort, sim.eff + '번으로 접속 (' + sim.portWhy + ')', u.port ? 'Host 헤더로' : '아니요'] });
    if (n >= 4) rows.push({ cells: ['경로', u.path, '서버 안의 어느 자원인지', { v: '요청 줄로', cls: 'good' }] });
    if (n >= 5) rows.push({ cells: ['쿼리', u.query, '서버에 넘기는 이름=값', { v: '요청 줄로', cls: 'good' }] });
    if (n >= 6) rows.push({ cells: ['프래그먼트', u.frag, '문서 안의 위치 (브라우저만 사용)', { v: '보내지 않음', cls: 'bad' }] });
    if (rows.length) H.table(v, ['부분', '값', '하는 일', '서버로 가는가'], rows, '주소를 나눈 결과');
    var ln = H.lanes(v);
    H.lane(ln, 'Host 헤더', n >= 7 ? 'Host: ' + sim.hostHeader : '아직 보내기 전', n >= 7 ? 'hot' : 'none');
  },
  // 그림: 주소를 여섯 부분으로 나눠 위에서 아래로 한 줄씩 놓고, 그 아래에 서버로 가는 요청 줄, 서버가 풀어낸 값, 링크가 가리키는 주소를 차례로 놓는다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.stage : 0, u = sim.u, c = sim.c, i;
    var parts = [['스킴', u.scheme, 2, ''], ['호스트', u.host, 3, ''], ['포트', u.typedPort === '' ? '(적지 않음) → ' + sim.eff : u.port === '' ? u.typedPort + ' (기본 포트와 같음)' : u.typedPort, 3, ''], ['경로', u.path, 4, '서버로 감'], ['쿼리', u.query, 5, '서버로 감'], ['프래그먼트', u.frag, 6, '서버로 가지 않음']];
    P.size(680, 346);
    for (i = 0; i < 6; i++) {
      var on = n >= parts[i][2], cur = n === parts[i][2], sent = n >= 7 && parts[i][3];
      P.text('pt' + i, 16, 31 + i * 28, parts[i][0], { cls: on ? '' : 'mut', bold: cur });
      P.box('pv' + i, 104, 14 + i * 28, 560, 24, { cls: !on ? 'ghost' : cur ? 'hot now' : sent ? (i === 5 ? 'bad' : 'good') : 'wait', sub: on ? parts[i][1] : '', right: sent ? parts[i][3] : '', mono: true });
    }
    P.box('req', 16, 190, 648, 44, { cls: n >= 7 ? (n === 7 ? 'hot now' : 'plain') : 'ghost', title: n >= 7 ? '서버로 가는 요청 줄 (' + u.host + '의 ' + sim.eff + '번 포트에 연결)' : '서버로 가는 요청 줄', sub: n >= 7 ? 'GET ' + sim.target + ' HTTP/1.1' : '', mono: true });
    P.box('srv', 16, 240, 648, 44, { cls: n >= 8 ? (sim.ok ? 'good' : 'bad') + (n === 8 ? ' now' : '') : 'ghost', title: '서버가 쿼리에서 풀어낸 값 (보낸 검색어: "' + c.q + '")', sub: n >= 8 ? sim.row[3] : '' });
    P.box('lnk', 16, 290, 648, 44, { cls: n >= 9 ? 'hot now' : 'ghost', title: '링크(href="' + c.rel + '")가 가리키는 주소', sub: n >= 9 ? sim.link : '', mono: true });
    P.note('위의 여섯 줄이 주소를 나눈 부분입니다. 초록 줄(경로와 쿼리)만 요청 줄에 실려 서버로 가고, 빨간 줄(프래그먼트)은 브라우저에 남습니다.');
  },
  assume: '삼백 가지 조합을 모두 Node.js 24에서 실행해 대조했습니다. 주소를 나눈 결과와 정리된 주소, 상대 주소의 풀이는 Node.js의 URL(브라우저와 같은 WHATWG URL 표준의 구현)이 낸 값과 대조했습니다. 접속 포트, 요청 줄, Host 헤더는 Node.js의 HTTP 클라이언트로 그 주소에 요청을 보내고, 연결만 127.0.0.1의 시험 서버로 돌려 실제로 나간 글자를 받아 대조했습니다(shop.example에 대한 DNS 조회나 외부 접속은 하지 않았고, https 주소도 암호화하지 않은 채 받았습니다). 서버가 받은 값은 그 요청 줄의 쿼리를 URLSearchParams로 풀이한 것입니다. 톰캣 같은 다른 서버도 &와 =로 나누고 +와 %XX를 되돌리는 같은 규칙(application/x-www-form-urlencoded)을 쓰지만, 이 실습에서 따로 실행해 보지는 않았습니다. 잘못된 %XX가 왔을 때 오류로 처리하는지처럼 서버마다 다른 부분은 다루지 않았습니다. encodeURIComponent는 공백을 +가 아닌 %20으로 바꾸며, 쿼리에서는 둘 다 공백으로 풀립니다(이 차이도 실행으로 확인했습니다). 주소가 나뉘는 규칙은 RFC 3986 3절, 프래그먼트를 떼어 내고 요청한다는 것은 3.5절, 상대 주소의 풀이는 5.2절, 요청 줄과 Host 헤더는 RFC 9112 3.2절과 RFC 9110 7.2절에 있습니다. #으로 시작하는 링크를 눌렀을 때 서버에 새 요청이 가지 않는다는 것은 브라우저의 동작(HTML 표준의 프래그먼트 이동)을 따라 적은 것이고 실행해 보지는 않았습니다. 사용자 이름이 든 주소, IPv6 주소, 한글 도메인은 다루지 않았습니다.',
});
