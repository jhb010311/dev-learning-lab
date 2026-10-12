Lab.register({
  id: 'conneg', nav: '내용 협상과 압축', cat: 'HTTP', mode: 'step',
  title: '같은 주소인데 왜 사람마다 다른 응답을 받나',
  intro: '같은 주소라도 서버는 형식, 언어, 압축 방식이 다른 여러 모습의 응답을 줄 수 있습니다. 클라이언트가 Accept, Accept-Language, Accept-Encoding 헤더로 원하는 것을 알리면 서버가 그중에서 고릅니다. 이것을 내용 협상이라고 합니다.',
  terms: ['콘텐츠 협상(Accept와 Content-Type)', 'q 값(선호도)', 'HTTP 압축과 Content-Encoding', 'Vary 헤더', '캐시'],
  controls: [
    { id: 'fmt', label: 'A의 Accept (원하는 형식)', type: 'select', value: 'html', options: [['html', 'text/html → 긴 HTML 문서'], ['json', 'application/json → 짧은 JSON'], ['png', 'image/png → 이미 압축된 PNG 그림']] },
    { id: 'lang', label: 'A의 Accept-Language (원하는 언어)', type: 'select', value: 'ko', options: [['ko', 'ko'], ['en', 'en'], ['en;q=0.5, ko;q=0.9', 'en;q=0.5, ko;q=0.9'], ['ja, en;q=0.7', 'ja, en;q=0.7'], ['fr', 'fr']], show: function (c) { return c.fmt !== 'png'; }, hint: '서버는 한국어판(ko)과 영어판(en)만 가지고 있습니다. q는 0부터 1까지의 선호도이고, 적지 않으면 1입니다.' },
    { id: 'enc', label: 'A의 Accept-Encoding (풀 수 있는 압축)', type: 'select', value: 'gzip, br', options: [['none', '(헤더를 보내지 않음)'], ['gzip', 'gzip'], ['gzip, br', 'gzip, br'], ['br;q=0.1, gzip', 'br;q=0.1, gzip']] },
    { id: 'vary', label: '서버가 응답에 Vary 헤더를 붙인다', type: 'check', value: false, hint: 'A 다음에 다른 클라이언트 B가 공유 캐시를 거쳐 같은 주소를 요청합니다. B는 영어를 원하고 압축을 풀 줄 모릅니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'Vary 헤더 없이 A가 text/html, ko, gzip과 br로 요청한 뒤 다른 클라이언트 B가 같은 주소를 요청하면 무엇을 받나', d: 'Vary가 없습니다. 공유 캐시가 A에게 맞춘 응답(br 압축, 한국어)을 B에게 그대로 줍니다.', v: { fmt: 'html', lang: 'ko', enc: 'gzip, br', vary: false } },
    { t: 'Vary를 붙이면', q: '서버가 응답에 Vary 헤더를 붙이면', d: '캐시가 요청 헤더를 비교해, B의 요청은 서버에 다시 묻습니다.', v: { fmt: 'html', lang: 'ko', enc: 'gzip, br', vary: true } },
    { t: 'q 값이 적힌 순서를 이긴다', q: '언어를 en;q=0.5, ko;q=0.9로, 압축을 br;q=0.1, gzip으로 바꾸고 Vary를 붙이면', d: 'en이 먼저 적혀 있어도 q가 높은 ko를, br보다 q가 높은 gzip을 고릅니다.', v: { fmt: 'html', lang: 'en;q=0.5, ko;q=0.9', enc: 'br;q=0.1, gzip', vary: true } },
    { t: '서버에 없는 언어를 원하면', q: 'Accept-Language를 ja, en;q=0.7로, Accept-Encoding을 gzip으로 바꾸고 Vary를 붙이면', d: '일본어판이 없어 다음 후보인 영어판을 줍니다.', v: { fmt: 'html', lang: 'ja, en;q=0.7', enc: 'gzip', vary: true } },
    { t: '작은 본문을 압축하면', q: 'Accept를 application/json으로, Accept-Encoding을 gzip으로 바꾸고 Vary를 붙이면', d: '37바이트짜리 JSON은 압축하면 오히려 커집니다.', v: { fmt: 'json', lang: 'ko', enc: 'gzip', vary: true } },
    { t: '이미 압축된 그림을 압축하면', q: 'Accept를 image/png로, Accept-Encoding을 gzip으로 바꾸고 Vary를 붙이면', d: 'PNG는 한 번 더 압축해도 줄지 않습니다.', v: { fmt: 'png', lang: 'ko', enc: 'gzip', vary: true } },
    { t: '압축을 요청하지 않으면', q: 'Accept-Language를 en으로 바꾸고 Accept-Encoding 헤더를 보내지 않으면', d: 'Accept-Encoding이 없으면 서버는 본문을 그대로 보냅니다.', v: { fmt: 'html', lang: 'en', enc: 'none', vary: false } },
  ],
  // 그림(PNG)에는 언어판이 없으므로 언어 설정을 하나로 고정한다
  fix: function (c) { return c.fmt === 'png' ? { lang: 'ko' } : null; },
  TYPE: { html: 'text/html', json: 'application/json', png: 'image/png' },
  WHAT: { html: '긴 HTML 문서', json: '짧은 JSON', png: 'PNG 그림' },
  // 표현마다 [원래 크기, gzip으로 압축한 크기, br로 압축한 크기] (바이트). 시험 서버의 실제 본문을 Node 24의 zlib 기본 설정으로 압축한 값이다.
  SIZES: { 'html-ko': [12542, 809, 425], 'html-en': [12422, 774, 399], 'json-ko': [37, 58, 41], 'json-en': [38, 58, 40], 'png': [12270, 12293, 12274] },
  num: function (n) { return String(n).replace(/\B(?=(\d{3})+$)/g, ','); },
  // 헤더 값을 쉼표로 나눠 [{ v: 이름, q: 선호도 }]로 만든다. q를 적지 않은 것은 1이다.
  parse: function (h) { return h.split(',').map(function (p) { var x = p.split(';'), q = 1; x.slice(1).forEach(function (a) { var kv = a.trim().split('='); if (kv[0] === 'q') q = parseFloat(kv[1]); }); return { v: x[0].trim(), q: q }; }); },
  // 언어: 서버가 가진 것(ko, en) 가운데 q가 가장 높은 것. 하나도 없으면 null
  pickLang: function (h) { var best = null; this.parse(h).forEach(function (a) { if ((a.v === 'ko' || a.v === 'en') && a.q > 0 && (!best || a.q > best.q)) best = a; }); return best ? best.v : null; },
  // 압축: q가 가장 높은 것. q가 같으면 서버가 선호하는 순서(br, gzip). 헤더가 없으면 압축하지 않는다(identity)
  pickEnc: function (h) { if (h === 'none') return 'identity'; var qs = {}, best = 'identity', bq = 0; this.parse(h).forEach(function (a) { qs[a.v] = a.q; }); ['br', 'gzip'].forEach(function (e) { if ((qs[e] || 0) > bq) { best = e; bq = qs[e]; } }); return best; },
  judge: function (c) {
    var png = c.fmt === 'png', got = png ? null : this.pickLang(c.lang), lang = png ? '' : got || 'ko', enc = this.pickEnc(c.enc);
    var sz = this.SIZES[png ? 'png' : c.fmt + '-' + lang], orig = sz[0], wire = enc === 'gzip' ? sz[1] : enc === 'br' ? sz[2] : sz[0];
    var varyVal = c.vary ? (png ? 'Accept, Accept-Encoding' : 'Accept, Accept-Language, Accept-Encoding') : '';
    // B: 같은 Accept, Accept-Language: en, Accept-Encoding 없음
    var diff = []; if (!png && c.lang !== 'en') diff.push('Accept-Language'); if (c.enc !== 'none') diff.push('Accept-Encoding');
    var hit = !c.vary || !diff.length, wrong = [];
    if (hit) { if (enc !== 'identity') wrong.push(enc + ' 압축'); if (!png && lang !== 'en') wrong.push('한국어'); }
    return { png: png, langMatched: !!got, lang: lang, enc: enc, orig: orig, wire: wire, vary: varyVal, diff: diff, hit: hit, wrong: wrong };
  },
  sizeText: function (j) {
    if (j.enc === 'identity') return this.num(j.orig) + '바이트 (그대로)';
    return this.num(j.orig) + ' → ' + this.num(j.wire) + '바이트 (' + (j.wire < j.orig ? Math.round((1 - j.wire / j.orig) * 100) + '% 줄어듦' : (j.wire - j.orig) + '바이트 늘어남') + ')';
  },
  code: function (c) {
    var png = c.fmt === 'png', vary = c.vary ? '\n        \'Vary\': \'' + (png ? 'Accept, Accept-Encoding' : 'Accept, Accept-Language, Accept-Encoding') + '\',       // 이 응답을 고를 때 본 요청 헤더' : '';
    return '// 서버 (Node.js). Negotiator는 Accept 계열 헤더를 해석해 주는 라이브러리\nhttp.createServer((req, res) => {\n    const want = new Negotiator(req);\n    const type = want.mediaType([\'text/html\', \'application/json\', \'image/png\']);        // Accept\n    const lang = want.language([\'ko\', \'en\']) || \'ko\';                                    // Accept-Language, 맞는 것이 없으면 ko\n    const enc  = want.encoding([\'br\', \'gzip\', \'identity\'], { preferred: [\'br\', \'gzip\'] });  // Accept-Encoding\n\n    let body = load(type, lang);                       // 고른 형식과 언어의 본문\n    if (enc === \'gzip\') body = zlib.gzipSync(body);\n    if (enc === \'br\')   body = zlib.brotliCompressSync(body);\n\n    res.writeHead(200, {\n        \'Content-Type\': type,\n        \'Content-Language\': lang,                      // 그림에는 붙이지 않는다\n        \'Content-Encoding\': enc,                       // 압축하지 않았으면 붙이지 않는다' + vary + '\n        \'Cache-Control\': \'public, max-age=60\',         // 공유 캐시가 60초 동안 보관해도 된다\n    });\n    res.end(body);\n});\n\n// 클라이언트 A의 요청\n// curl -H \'Accept: ' + this.TYPE[c.fmt] + '\'' + (png ? '' : ' -H \'Accept-Language: ' + c.lang + '\'') + (c.enc === 'none' ? '' : ' -H \'Accept-Encoding: ' + c.enc + '\'') + ' http://shop.example/guide';
  },
  label: function (c) { return this.TYPE[c.fmt] + (c.fmt === 'png' ? '' : ' · ' + c.lang) + ' · ' + (c.enc === 'none' ? '압축 요청 없음' : c.enc) + (c.vary ? ' · Vary 있음' : ' · Vary 없음'); },
  columns: ['서버가 고른 표현', 'Content-Encoding', '본문 크기 (원래 → 전송)', 'Vary', '다른 클라이언트 B가 받은 것'],
  simulate: function (c) {
    var j = this.judge(c), T = this.TYPE[c.fmt], num = this.num, ev = [], sum = [];
    var st = { step: 0, type: '', lang: '', enc: '', wire: 0, sent: false, b: '', bres: '', bcls: '' };
    function push(s, k) { st.step++; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var size = this.sizeText(j);
    push('클라이언트 A가 GET /guide 요청을 보냅니다. 요청 헤더로 원하는 것을 알립니다. Accept는 받고 싶은 형식, Accept-Language는 언어, Accept-Encoding은 자신이 풀 수 있는 압축 방식입니다. 중간의 공유 캐시에는 아직 저장된 것이 없어 요청이 서버까지 갑니다.', '');
    st.type = T;
    push('서버가 Accept 헤더(' + T + ')를 보고 형식을 고릅니다. 이 서버는 /guide를 HTML, JSON, PNG 세 가지 형식으로 줄 수 있습니다. 그중 ' + this.WHAT[c.fmt] + ' 쪽을 고르고, 응답의 Content-Type 헤더에 고른 형식(' + T + ')을 적습니다.', '');
    if (j.png) { st.lang = '(해당 없음)'; push('그림에는 언어판이 따로 없습니다. 서버는 이 응답을 고를 때 Accept-Language를 보지 않습니다.', ''); }
    else {
      st.lang = j.lang;
      var lw = { 'ko': '한국어판을 원한다는 뜻입니다. 서버에 한국어판이 있으므로 그것을 고릅니다.', 'en': '영어판을 원한다는 뜻입니다. 서버에 영어판이 있으므로 그것을 고릅니다.', 'en;q=0.5, ko;q=0.9': 'q는 0부터 1까지의 선호도입니다. 적힌 순서는 en이 먼저지만 q는 ko(0.9)가 en(0.5)보다 높습니다. 서버는 순서가 아니라 q를 보고 한국어판을 고릅니다.', 'ja, en;q=0.7': 'q를 적지 않은 ja는 선호도가 1이라 가장 원하는 언어입니다. 하지만 서버에는 일본어판이 없습니다. 그다음 후보인 en(q=0.7)이 서버에 있으므로 영어판을 고릅니다.', 'fr': '프랑스어판을 원하는데 서버에는 한국어판과 영어판뿐이고, 다른 후보도 적혀 있지 않습니다. 이 서버는 요구를 무시하고 기본 언어인 한국어판을 줍니다. 맞는 것이 없을 때 406 Not Acceptable로 거절하는 서버도 있습니다.' }[c.lang];
      push('서버가 Accept-Language 헤더(' + c.lang + ')를 보고 언어를 고릅니다. ' + lw + ' 고른 언어는 응답의 Content-Language 헤더에 적습니다.', j.langMatched ? '' : 'bad');
    }
    st.enc = j.enc === 'identity' ? '없음' : j.enc;
    var ew = { 'none': '요청에 Accept-Encoding 헤더가 없습니다. 서버는 압축하지 않고 본문을 그대로 보내기로 합니다.', 'gzip': 'Accept-Encoding: gzip은 gzip으로 압축한 것을 풀 수 있다는 뜻입니다. 서버는 gzip으로 압축하기로 합니다.', 'gzip, br': 'Accept-Encoding: gzip, br은 둘 다 풀 수 있다는 뜻이고, q를 적지 않아 선호도가 둘 다 1로 같습니다. 선호도가 같으면 서버가 정합니다. 이 서버는 br(Brotli)을 먼저 고르도록 설정돼 있습니다.', 'br;q=0.1, gzip': 'Accept-Encoding: br;q=0.1, gzip에서 br의 선호도는 0.1이고, q를 적지 않은 gzip은 1입니다. 서버는 br을 먼저 고르도록 설정돼 있지만, 클라이언트의 선호도가 더 높은 gzip을 고릅니다.' }[c.enc];
    push(ew, '');
    st.wire = j.wire;
    if (j.enc === 'identity') push('압축하지 않으므로 본문 ' + num(j.orig) + '바이트가 그대로 전송됩니다. 응답에 Content-Encoding 헤더는 붙지 않습니다.', '');
    else if (j.wire < j.orig) push('본문 ' + num(j.orig) + '바이트를 ' + j.enc + ' 방식으로 압축하니 ' + num(j.wire) + '바이트가 됐습니다. 응답에 Content-Encoding: ' + j.enc + ' 헤더를 붙여, 받는 쪽이 어떤 방식으로 풀어야 하는지 알립니다. Content-Type은 그대로 ' + T + '입니다. 압축은 내용을 바꾸지 않고 전송할 때의 포장만 바꿉니다.', 'good');
    else if (j.png) push('본문 ' + num(j.orig) + '바이트를 ' + j.enc + ' 방식으로 압축했는데 ' + num(j.wire) + '바이트로 오히려 조금 늘었습니다. PNG는 파일 안의 그림 데이터가 이미 압축돼 있어, 더 줄일 수 있는 되풀이가 남아 있지 않습니다. 압축을 풀 때 필요한 정보만 덧붙었습니다.', 'bad');
    else push('본문이 ' + num(j.orig) + '바이트뿐입니다. ' + j.enc + ' 방식으로 압축했는데 ' + num(j.wire) + '바이트로 오히려 늘었습니다. 압축한 결과에는 압축을 풀 때 필요한 정보가 덧붙는데, 본문이 너무 작으면 줄어드는 양보다 덧붙는 양이 더 큽니다.', 'bad');
    st.sent = true;
    push('서버가 200 OK로 응답합니다. ' + (c.vary ? '응답에 Vary 헤더(' + j.vary + ')를 붙였습니다. "이 응답은 요청의 이 헤더들에 따라 달라진다"는 표시입니다.' : '응답에 Vary 헤더는 붙이지 않았습니다.') + ' 공유 캐시는 이 응답을 /guide의 응답으로 보관하고 A에게 전달합니다.', '');
    st.b = 'ask';
    push('이어서 다른 클라이언트 B가 같은 주소 /guide를 요청합니다. B는 영어를 원하고(Accept-Language: en), Accept-Encoding을 보내지 않습니다. 압축을 풀 줄 모르는 단순한 프로그램입니다. 이 요청은 먼저 공유 캐시에 도착합니다.', '');
    var bres;
    if (!j.hit) {
      st.b = 'miss'; bres = '캐시가 서버에 다시 물어 B에게 맞는 응답을 받음'; st.bres = bres; st.bcls = 'good';
      push('캐시가 저장된 응답의 Vary에 적힌 헤더들을 A의 요청과 B의 요청에서 비교합니다. ' + j.diff.join('와 ') + ' 값이 서로 다릅니다. 캐시는 저장된 응답을 쓰지 않고 서버에 다시 요청합니다. B는 압축되지 않은 ' + (j.png ? '그림' : '영어판') + '을 받습니다.' + (j.enc === 'identity' && j.lang === 'en' ? ' 서버가 고른 결과는 A 때와 같지만, 캐시는 헤더의 글자가 다르면 다른 요청으로 봅니다.' : ''), 'good');
    } else if (c.vary) {
      st.b = 'hit'; bres = 'A의 응답을 그대로 받음 (요청 헤더가 같아 B에게도 맞음)'; st.bres = bres; st.bcls = 'good';
      push('캐시가 저장된 응답의 Vary에 적힌 헤더들을 A의 요청과 B의 요청에서 비교합니다. 값이 모두 같습니다. 캐시는 서버에 묻지 않고 저장된 응답을 B에게 줍니다. 같은 것을 원한 요청이므로 B에게도 맞는 응답입니다.', 'good');
    } else if (!j.wrong.length) {
      st.b = 'hit'; bres = 'A의 응답을 그대로 받음 (우연히 B에게도 맞음)'; st.bres = bres; st.bcls = 'hot';
      push('캐시에 /guide의 응답이 있고 Vary 헤더가 없습니다. 캐시는 요청 헤더를 비교하지 않고 저장된 응답을 B에게 줍니다. 마침 A가 받은 것이 압축되지 않은 ' + (j.png ? '그림' : '영어판') + '이라 B에게도 맞았습니다. A의 요청이 달랐다면 맞지 않았을 것입니다.', '');
    } else {
      st.b = 'hit'; bres = 'A의 응답을 그대로 받음: ' + j.wrong.join(', ') + ' (B에게 맞지 않음)'; st.bres = bres; st.bcls = 'bad';
      push('캐시에 /guide의 응답이 있고 Vary 헤더가 없습니다. 캐시는 "이 주소의 응답은 누구에게나 같다"고 보고, A에게 맞춘 응답을 B에게 그대로 줍니다.' + (j.enc !== 'identity' ? ' B는 ' + j.enc + ' 압축을 풀 줄 몰라 본문을 읽지 못합니다.' : '') + (!j.png && j.lang !== 'en' ? ' B는 영어를 원했는데 한국어판을 받았습니다.' : ''), 'bad');
    }
    if (c.lang.indexOf('q=') >= 0 || c.enc.indexOf('q=') >= 0) sum.push('q 값은 0부터 1까지의 선호도이고, 적지 않으면 1입니다. 서버는 자신이 줄 수 있는 것 가운데 q가 가장 높은 것을 고릅니다. 헤더에 적힌 순서는 q가 같을 때에만 참고될 수 있습니다.');
    if (!j.png && !j.langMatched) sum.push('맞는 언어가 하나도 없을 때 서버는 기본 언어로 응답할 수도 있고 406 Not Acceptable로 거절할 수도 있습니다. 표준은 둘 다 허용합니다. 사용자에게는 무언가라도 보이는 편이 나아 기본 언어로 응답하는 쪽이 흔합니다.');
    if (j.enc !== 'identity' && j.wire < j.orig) sum.push('HTML, CSS, 자바스크립트, JSON 같은 글자로 된 본문은 되풀이되는 부분이 많아 압축이 잘 됩니다. 이 예시의 HTML은 같은 모양의 표가 120줄 되풀이되어 특히 많이 줄었습니다. 줄어드는 정도는 내용에 따라 다릅니다. br은 gzip보다 더 작게 줄이는 편이지만 압축에 시간이 더 걸립니다.');
    if (j.enc !== 'identity' && j.wire >= j.orig) sum.push('작은 본문과 이미 압축된 데이터(PNG, JPEG, 동영상, zip)는 압축해도 줄지 않고 CPU 시간만 씁니다. 그래서 실제 서버는 일정 크기보다 작은 응답과 이런 형식은 압축하지 않도록 설정합니다. 이 시험 서버는 차이를 보이려고 가리지 않고 압축했습니다.');
    if (j.enc === 'identity') sum.push('Accept-Encoding을 보내지 않으면 서버는 압축하지 않은 본문을 보냅니다. 브라우저는 이 헤더를 자동으로 붙여 보내고, curl은 --compressed 옵션을 줘야 보냅니다.');
    if (!c.vary) sum.push(j.wrong.length ? '응답이 요청 헤더에 따라 달라지는데 Vary가 없으면, 공유 캐시는 한 사람에게 맞춘 응답을 다른 사람에게 그대로 내줍니다. 서버는 응답을 고를 때 본 요청 헤더의 이름을 Vary에 적어야 합니다.' : '이번에는 문제가 없었지만 우연입니다. Vary가 없으면 공유 캐시는 A의 요청 헤더가 무엇이었든 같은 응답을 B에게 줍니다.');
    else sum.push(j.hit ? 'Vary에 적힌 헤더의 값이 A와 B의 요청에서 모두 같아 캐시가 저장된 응답을 다시 썼습니다.' : 'Vary가 있으면 공유 캐시는 같은 주소라도 요청 헤더가 다른 응답을 따로 다룹니다. 대신 헤더의 글자가 조금만 달라도 다른 것으로 보므로, 캐시에서 바로 답하는 일이 줄어듭니다. 그래서 Vary에는 응답을 고를 때 실제로 본 헤더만 적습니다.');
    return { events: ev, summary: sum, j: j, size: size, row: [T + (j.png ? '' : ' · ' + j.lang), j.enc === 'identity' ? '없음' : j.enc, size, j.vary || '없음', bres] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 요청 헤더를 하나씩 보고 응답을 고릅니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '클라이언트 B', !s.b ? '아직 요청 전' : s.b === 'ask' ? '같은 주소를 요청함 (영어, 압축 못 풂)' : s.bres, !s.b || s.b === 'ask' ? 'none' : s.bcls === 'hot' ? 'hot' : s.bcls);
  },
  // 그림: 왼쪽에 A의 요청 헤더 셋, 오른쪽에 서버가 고른 응답 헤더 셋. 아래에 본문 크기와, 공유 캐시를 거친 B가 무엇을 받는지를 둔다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], c = sim.c, j = sim.j, num = this.num, s = last ? last.snap : { step: 0, type: '', lang: '', enc: '', wire: 0, sent: false, b: '', bres: '', bcls: '' };
    P.size(680, 338);
    P.region('rq', 16, 16, 316, 150, '클라이언트 A의 요청 헤더');
    P.region('rs', 348, 16, 316, 150, '서버가 고른 응답 헤더');
    P.box('qa', 30, 46, 288, 30, { cls: 'wait', title: 'Accept', right: this.TYPE[c.fmt] });
    P.box('ql', 30, 82, 288, 30, { cls: j.png ? 'ghost' : 'wait', title: 'Accept-Language', right: j.png ? '쓰이지 않음' : c.lang });
    P.box('qe', 30, 118, 288, 30, { cls: c.enc === 'none' ? 'ghost' : 'wait', title: 'Accept-Encoding', right: c.enc === 'none' ? '(없음)' : c.enc });
    P.box('ra', 362, 46, 288, 30, { cls: s.type ? 'good' : 'ghost', title: 'Content-Type', right: s.type || '?' });
    P.box('rl', 362, 82, 288, 30, { cls: !s.lang || j.png ? 'ghost' : j.langMatched ? 'good' : 'hot', title: 'Content-Language', right: s.lang ? (j.png ? '없음' : s.lang) : '?' });
    P.box('re', 362, 118, 288, 30, { cls: !s.enc || s.enc === '없음' ? 'ghost' : 'good', title: 'Content-Encoding', right: s.enc || '?' });
    if (s.type) P.arrow('aa', 'qa:r', 'ra:l');
    if (s.lang && !j.png) P.arrow('al', 'ql:r', 'rl:l');
    if (s.enc) P.arrow('ae', 'qe:r', 're:l', { cls: s.enc === '없음' ? 'mut' : '' });
    P.box('so', 16, 180, 316, 36, { cls: 'plain', title: '원래 본문', right: num(j.orig) + '바이트' });
    P.box('sw', 348, 180, 316, 36, { cls: !s.wire ? 'ghost' : j.enc === 'identity' ? 'plain' : j.wire < j.orig ? 'good' : 'bad', title: '전송된 본문', right: s.wire ? num(s.wire) + '바이트' : '?' });
    P.box('ca', 16, 230, 316, 50, { cls: s.sent ? 'wait' : 'ghost', title: !s.sent ? '공유 캐시' : j.vary ? '공유 캐시: Vary에 적힌 헤더를 비교' : '공유 캐시: 주소만 보고 판단', sub: s.sent ? (j.vary || '/guide의 응답 보관 (Vary 없음)') : '비어 있음' });
    P.box('b', 348, 230, 316, 50, { cls: !s.b ? 'ghost' : s.b === 'ask' ? 'wait' : s.bcls, title: '클라이언트 B (영어, 압축 못 풂)', sub: !s.b ? '아직 요청 전' : s.b === 'ask' ? '같은 주소 /guide를 요청' : s.b === 'miss' ? '서버에서 맞는 응답을 새로 받음' : j.wrong.length ? 'A의 응답을 받음: ' + j.wrong.join(', ') : 'A의 응답을 받음: B에게도 맞음' });
    if (s.b) P.arrow('bc', 'b:l', 'ca:r', { cls: s.b === 'ask' ? '' : s.bcls === 'hot' ? 'hot' : s.bcls, label: s.b === 'ask' ? '요청' : s.b === 'miss' ? '서버에 다시 물음' : '보관한 것을 줌' });
    P.text('sz', 340, 310, s.wire ? '본문 크기: ' + sim.size : '실행을 진행하면 압축 결과가 표시됩니다', { anchor: 'middle', cls: !s.wire ? 'mut' : j.enc === 'identity' ? 'mut' : j.wire < j.orig ? 'good' : 'bad', bold: !!s.wire });
    P.note('요청 헤더 하나가 응답 헤더 하나를 정합니다. 공유 캐시는 여러 사용자의 요청이 함께 거쳐 가는 보관소입니다.');
  },
  assume: '본문 세 가지(긴 HTML, 짧은 JSON, PNG 그림)는 시험용으로 만든 예시이며, 크기는 그 본문을 이 PC의 Node.js 24에 든 zlib 1.3.1(gzip)과 brotli 1.2.0의 기본 설정으로 압축한 실제 값입니다. 압축 수준이나 라이브러리 버전이 다르면 몇 바이트씩 달라질 수 있습니다. 예시의 HTML은 같은 모양의 표가 되풀이되어 보통의 문서보다 훨씬 많이 줄어든 편입니다. 서로 다른 88가지 조합(그림에는 언어 설정이 쓰이지 않음)을 127.0.0.1에 띄운 시험 서버로 실행해 서버가 고른 형식, 언어, 압축, 전송된 크기, Vary, B가 받은 응답이 모형과 같은 것을 확인했습니다. 시험 서버는 Node의 http에 헤더 해석 라이브러리 negotiator 1.0(Express가 쓰는 것)과 zlib을 붙여 만들었고, 공유 캐시는 HTTP 캐시 규칙 구현인 http-cache-semantics 4.2로 판단하는 작은 캐싱 프록시를 직접 만들어 썼습니다. 실제 CDN이나 프록시 제품으로 확인한 것은 아닙니다. 추가로 fetch(기본값으로 Accept-Encoding: gzip, deflate를 보냄)와 curl --compressed가 압축된 응답을 스스로 풀어 돌려주는 것, 옵션 없는 curl은 Accept-Encoding을 보내지 않는 것, Vary 없는 캐시 뒤에서 옵션 없는 curl이 br로 압축된 한국어 응답을 그대로 받는 것을 실행으로 확인했습니다. q 값의 뜻과 생략하면 1이라는 것, 맞는 언어가 없을 때 무시하거나 406으로 응답할 수 있다는 것은 RFC 9110 12.4.2절과 12.5.4절, Vary의 뜻은 12.5.5절, 캐시가 Vary에 적힌 요청 헤더를 비교한다는 것은 RFC 9111 4.1절을 따랐습니다. 선호도가 같은 압축 방식 가운데 무엇을 고를지는 표준이 정하지 않아 서버마다 다릅니다(이 시험 서버는 br 우선). 표준(RFC 9110 12.5.3절)에 따르면 Accept-Encoding이 없는 요청에는 서버가 어떤 압축이든 써도 되지만, 이 시험 서버를 포함해 대부분의 서버는 압축하지 않고 보냅니다. B가 압축을 "풀지 못한다"는 것은 B를 압축을 지원하지 않는 프로그램으로 가정한 것입니다. 브라우저처럼 Content-Encoding을 보고 스스로 푸는 클라이언트라면 내용은 읽을 수 있지만, 원하지 않은 언어를 받는 문제는 그대로입니다.',
});
