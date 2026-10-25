// "웹 공격 세 가지" 실습의 CSRF 방어를 표준(스프링 시큐리티의 CSRF 토큰 검사) 중심으로 고치면서 추가한 용어
// 근거: 스프링 시큐리티 문서 Cross Site Request Forgery (https://docs.spring.io/spring-security/reference/features/exploits/csrf.html,
// https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html), OWASP CSRF Prevention Cheat Sheet
// (https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
// 403 거절과 Set-Cookie의 SameSite=Lax는 스프링 부트 4.1.1·스프링 시큐리티 7.1.1 서버에서 확인했다(verify/spring/webattack_probe.out.txt).
module.exports = [
  ['보안', '스프링 시큐리티의 CSRF 보호(CsrfFilter)', '스프링 시큐리티가 기본으로 켜 두는 CSRF 방어다. 서버가 세션마다 예측할 수 없는 값(CSRF 토큰)을 만들어 화면의 폼에 숨은 입력 _csrf로 심고, POST·PUT·DELETE처럼 상태를 바꾸는 요청에는 그 값을 요청 파라미터 _csrf나 X-CSRF-TOKEN 헤더로 함께 보내게 한다. 보안 필터 체인의 CsrfFilter가 기대한 값과 비교해, 없거나 틀리면 컨트롤러로 넘기지 않고 403으로 거절한다. 쿠키는 브라우저가 자동으로 붙이지만 이 값은 화면이 직접 넣어야 하므로, 다른 사이트의 페이지가 일으킨 요청에는 들어갈 수 없다. 기대한 값은 기본으로 HttpSession에 둔다(HttpSessionCsrfTokenRepository).', { why: '쿠키로 로그인을 유지하는 사이트는 다른 사이트에서 일으킨 요청에도 브라우저가 쿠키를 붙여 주기 때문에, 쿠키만 보고는 본인이 우리 화면에서 보낸 요청인지 알 수 없었다. 쿠키의 SameSite 속성은 브라우저가 지원하고 설정이 맞아야만 효과가 있고, 링크로 넘어가는 GET이나 같은 사이트로 치는 서브도메인의 요청에는 쿠키가 붙는다. 그래서 서버가 직접 확인할 수 있는 토큰을 기본 방어로 두고, SameSite는 함께 쓰는 보조 방어로 둔다.', use: '스프링 시큐리티를 쓰면 설정하지 않아도 켜져 있다. Thymeleaf처럼 RequestDataValueProcessor와 이어진 화면 기술은 POST 폼에 _csrf 숨은 입력을 자동으로 넣고, 자바스크립트로 요청하는 화면은 토큰을 헤더에 실어 보낸다. 브라우저가 아닌 클라이언트만 부르고 Authorization 헤더로 인증하는 API 서버는 http.csrf(csrf -> csrf.disable())로 끄기도 한다.' }],
];
