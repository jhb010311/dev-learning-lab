// 보안(sec) 용어의 영어 대조표. ko는 설명집의 용어 이름과 글자 하나까지 같아야 한다.
module.exports = [
  { ko: 'JWT(JSON Web Token)', en: 'JSON Web Token (JWT)', how: 'official',
    src: 'RFC 7519 "JSON Web Token (JWT)", Abstract — https://www.rfc-editor.org/rfc/rfc7519.html',
    also: ['JWT'],
    note: 'RFC의 표기 순서(풀어 쓴 이름 뒤에 약어)를 따랐다. Abstract: "JSON Web Token (JWT) is a compact, URL-safe means of representing claims to be transferred between two parties."' },

  { ko: '액세스 토큰과 리프레시 토큰', en: 'Access token and refresh token', how: 'composed',
    src: 'RFC 6749 "The OAuth 2.0 Authorization Framework", Section 1.4 (Access Token), Section 1.5 (Refresh Token) — https://www.rfc-editor.org/rfc/rfc6749.html',
    note: '1.4: "Access tokens are credentials used to access protected resources." 1.5: "Refresh tokens are credentials used to obtain access tokens." 둘 다 두 낱말로 띄어 쓴다.' },

  { ko: 'OAuth 2.0', en: 'OAuth 2.0', how: 'official',
    src: 'RFC 6749 "The OAuth 2.0 Authorization Framework" — https://www.rfc-editor.org/rfc/rfc6749.html',
    note: '"인가 프레임워크"는 RFC의 authorization framework다. 역할 이름은 resource owner, resource server, client, authorization server(Section 1.1).' },

  { ko: '해시 함수와 솔트', en: 'Hash function and salt', how: 'composed',
    src: 'OWASP Password Storage Cheat Sheet, "Salting" 절 등 — https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
    also: ['hashing algorithm'],
    note: '"A salt is a unique, randomly generated string that is added to each password as part of the hashing process." OWASP는 hash function보다 hashing algorithm, password hashing algorithm이라는 말을 더 자주 쓴다. 미리 계산해 둔 해시 목록은 rainbow tables.' },

  { ko: 'bcrypt', en: 'bcrypt', how: 'official',
    src: 'OWASP Password Storage Cheat Sheet, "bcrypt" 절 — https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
    note: '모두 소문자로 쓴다. 한국어 설명의 "연산 비용(cost)"을 OWASP는 work factor라고 부른다.' },

  { ko: 'XSS(크로스 사이트 스크립팅)', en: 'Cross-site scripting (XSS)', how: 'official',
    src: 'MDN "Attacks" — https://developer.mozilla.org/en-US/docs/Web/Security/Attacks ; OWASP "Cross Site Scripting (XSS)" — https://community.owasp.org/attacks/xss',
    also: ['XSS', 'Cross Site Scripting'],
    note: 'OWASP는 본문에서 "Cross-Site Scripting (XSS)", 제목에서 하이픈 없이 "Cross Site Scripting (XSS)"로 쓰고, MDN은 "cross-site scripting (XSS)"로 쓴다. 하이픈을 넣고 첫 글자만 대문자로 했다. 기본 방어의 이름은 output encoding(OWASP Cross Site Scripting Prevention Cheat Sheet).' },

  { ko: 'CSRF(사이트 간 요청 위조)', en: 'Cross-site request forgery (CSRF)', how: 'official',
    src: 'RFC 6749 Section 10.12 — https://www.rfc-editor.org/rfc/rfc6749.html ; MDN "Attacks" — https://developer.mozilla.org/en-US/docs/Web/Security/Attacks ; OWASP — https://community.owasp.org/attacks/csrf',
    also: ['CSRF', 'XSRF', 'Session Riding'],
    note: 'RFC 6749 10.12: "Cross-site request forgery (CSRF) is an exploit in which an attacker causes the user-agent of a victim end-user ..." OWASP는 "Cross-Site Request Forgery (CSRF)"로 대문자를 쓴다. 방어에 쓰는 말은 CSRF token, SameSite(OWASP Cross-Site Request Forgery Prevention Cheat Sheet).' },

  { ko: 'Rate Limiting', en: 'Rate limiting', how: 'official',
    src: 'MDN Glossary "Rate limit" — https://developer.mozilla.org/en-US/docs/Glossary/Rate_limit ; MDN "429 Too Many Requests" — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429',
    also: ['rate limit', 'throttling'],
    note: '두 낱말로 띄어 쓴다(꾸미는 말로 쓸 때만 rate-limiting). MDN: "Rate limiting is typically synonymous with throttling".' },

  { ko: 'API 게이트웨이', en: 'API gateway', how: 'official',
    src: 'microservices.io "Pattern: API Gateway / Backends for Frontends" — https://microservices.io/patterns/apigateway.html',
    note: '"Implement an API gateway that is the single entry point for all clients." 제목에서는 API Gateway, 문장 안에서는 API gateway.' },

  { ko: '접근 제어와 소유자 확인', en: 'Access control and ownership checks', how: 'descriptive',
    src: 'OWASP Authorization Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html ; OWASP Insecure Direct Object Reference Prevention Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html',
    also: ['access control checks', 'object-level authorization check'],
    note: '"소유자 확인"에 해당하는 정해진 용어는 없다. OWASP는 access control checks, object-level authorization check라고 하고, 코드 예에서 "verify ownership explicitly after fetching the object"라고 쓴다. 설명에 나오는 IDOR는 Insecure Direct Object Reference (IDOR). OWASP는 authorization과 access control을 같은 뜻으로 섞어 쓴다.' },

  { ko: '역할 기반 접근 제어(RBAC)', en: 'Role-based access control (RBAC)', how: 'official',
    src: 'OWASP Authorization Cheat Sheet, "Prefer Attribute and Relationship Based Access Control over RBAC" 절 — https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html',
    also: ['RBAC'],
    note: 'OWASP의 표기는 "Role-Based Access Control (RBAC)". "RBAC is a model of access control in which access is granted or denied based upon the roles assigned to a user." 첫 글자만 대문자로 했다.' },

  { ko: '클릭재킹', en: 'Clickjacking', how: 'official',
    src: 'OWASP Clickjacking Defense Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html ; MDN "Attacks" — https://developer.mozilla.org/en-US/docs/Web/Security/Attacks',
    also: ['UI redress attack'],
    note: '한 낱말로 붙여 쓴다. OWASP: "also known as UI redress attacks".' },

  { ko: 'X-Frame-Options와 frame-ancestors', en: 'X-Frame-Options and frame-ancestors', how: 'composed',
    src: 'MDN "X-Frame-Options" — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options ; MDN "Content-Security-Policy: frame-ancestors" — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors',
    note: 'X-Frame-Options는 response header, frame-ancestors는 Content-Security-Policy 헤더의 directive다(헤더가 아니다). 값의 이름 DENY, SAMEORIGIN은 그대로 둔다.' },

  { ko: '오픈 리다이렉트', en: 'Open redirect', how: 'official',
    src: 'CWE-601 "URL Redirection to Untrusted Site (\'Open Redirect\')" — https://cwe.mitre.org/data/definitions/601.html ; OWASP Unvalidated Redirects and Forwards Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html',
    also: ['unvalidated redirect', 'open redirection'],
    note: 'OWASP 치트 시트의 제목은 "Unvalidated Redirects and Forwards"이고 본문에는 "open redirection attacks"로 나온다. "Open Redirect"라는 이름은 CWE-601의 이름과 Alternate Terms(Open Redirect, Unvalidated Redirect)에서 확인했다. RFC 6749 Section 10.15의 제목은 "Open Redirectors".' },

  { ko: '오류 응답과 정보 누출', en: 'Error responses and information leakage', how: 'descriptive',
    src: 'OWASP Error Handling Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html',
    note: '정해진 용어 하나가 아니라 풀어 쓴 이름이다. information leakage는 치트 시트의 문장에서 확인했다: "Using error messages that do not provide implementation details is important to avoid information leakage." 응답에 담는 "정해 둔 글귀"는 generic response.' },

  { ko: '스택 트레이스', en: 'Stack trace', how: 'official',
    src: 'Java SE 21 API, java.lang.Throwable — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html',
    note: '두 낱말로 띄어 쓴다. "This method prints a stack trace for this Throwable object on the error output stream". 한 줄 한 줄은 stack trace element, 가리키는 것은 stack frame.' },

  { ko: '계정 열거', en: 'Account enumeration', how: 'official',
    src: 'OWASP Web Security Testing Guide, "Account Enumeration and Guessable User Account" — https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/03-Identity_Management/04-Account_Enumeration_and_Guessable_User_Account ; OWASP Authentication Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
    also: ['user enumeration'],
    note: 'WSTG는 항목 제목에서 Account Enumeration, 본문에서 "enumerate users"라고 쓰고, Authentication Cheat Sheet는 user enumeration이라고 쓴다. 두 말이 같은 뜻으로 함께 쓰인다.' },

  { ko: 'Base64URL 인코딩', en: 'Base64url encoding', how: 'official',
    src: 'RFC 7515 "JSON Web Signature (JWS)", Section 2 (Terminology) — https://www.rfc-editor.org/rfc/rfc7515.html',
    also: ['base64url'],
    note: 'RFC의 표기는 "Base64url Encoding", 문장 안에서는 base64url-encoded. URL을 대문자로 쓴 "Base64URL"은 RFC에 없다. 정의의 앞부분: "Base64 encoding using the URL- and filename-safe character set defined in Section 5 of RFC 4648" ... "with all trailing \'=\' characters omitted".' },

  { ko: '클레임(Claim)', en: 'Claim', how: 'official',
    src: 'RFC 7519, Section 2 (Terminology) — https://www.rfc-editor.org/rfc/rfc7519.html',
    note: '"A piece of information asserted about a subject. A claim is represented as a name/value pair consisting of a Claim Name and a Claim Value." 이름의 갈래는 Registered Claim Names, Public Claim Names, Private Claim Names(Section 4). 클레임 전체를 담은 JSON 객체는 JWT Claims Set.' },

  { ko: '알고리즘 고정(alg 검증)', en: 'Algorithm verification', how: 'official',
    src: 'RFC 8725 "JSON Web Token Best Current Practices", Section 3.1 "Perform Algorithm Verification" — https://www.rfc-editor.org/rfc/rfc8725.html',
    note: '3.1: "Libraries MUST enable the caller to specify a supported set of algorithms and MUST NOT use any other algorithms when ..." "알고리즘 고정"을 직역한 말(algorithm pinning 등)은 RFC에 없어 쓰지 않았다. Spring Security 문서는 같은 일을 "Configuring Trusted Algorithms"라는 절에서 다룬다(https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html). alg는 "alg" Header Parameter이고, 값 none으로 만든 토큰은 Unsecured JWT(RFC 7519 Section 6).' },

  { ko: '메서드 보안(@PreAuthorize, @PostAuthorize)', en: 'Method security (@PreAuthorize, @PostAuthorize)', how: 'official',
    src: 'Spring Security Reference, "Method Security" — https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html',
    note: '문서의 표기는 고유 기능 이름처럼 "Method Security"(대문자 S)다. 첫 문장은 "modeling at the method level", 다른 곳에서는 method-level authorization이라고도 한다.' },

  { ko: '세션 하이재킹', en: 'Session hijacking', how: 'official',
    src: 'OWASP "Session hijacking attack" — https://community.owasp.org/attacks/Session_hijacking_attack ; OWASP Session Management Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html',
    note: '"The disclosure, capture, prediction, brute force, or fixation of the session ID will lead to session hijacking ...". 쿠키 속성 이름 HttpOnly, Secure는 그대로 둔다.' },

  { ko: '세션 고정(Session Fixation)', en: 'Session fixation', how: 'official',
    src: 'OWASP "Session fixation" — https://community.owasp.org/attacks/Session_fixation ; Spring Security Reference, "Understanding Session Fixation Attack Protection" — https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html',
    note: '"Session Fixation is an attack that permits an attacker to hijack a valid user session." Spring Security의 막는 기능 이름은 session fixation protection.' },

  { ko: '전이 의존성', en: 'Transitive dependency', how: 'official',
    src: 'Apache Maven, "Introduction to the Dependency Mechanism", "Transitive Dependencies" 절 — https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html',
    note: '"Maven avoids the need to discover and specify the libraries that your own dependencies require by including transitive dependencies automatically." 설명의 "의존성 나무"는 dependency tree(mvn dependency:tree). "직접 의존성"은 이 Maven 페이지에 direct dependency라는 꼴로는 나오지 않는다(OWASP Software Supply Chain Security Cheat Sheet에는 "direct and transitive software dependencies"로 나온다).' },

  { ko: '버전 범위와 잠금 파일', en: 'Version ranges and lock files', how: 'composed',
    src: 'Gradle User Manual, "Declaring Versions and Ranges" — https://docs.gradle.org/current/userguide/dependency_versions.html ; "Locking Versions" — https://docs.gradle.org/current/userguide/dependency_locking.html',
    also: ['lockfile'],
    note: '버전을 잠그는 일 자체는 dependency locking이라 한다. Gradle은 lock file과 lockfile을 둘 다 쓰고, npm 문서(package-lock.json)와 OWASP는 lockfile 한 낱말로 쓴다. Gradle은 범위로 적은 버전을 dynamic version이라 부른다: "A dynamic version can be either a version range (e.g., 2.+) ...".' },

  { ko: '공급망 공격과 타이포스쿼팅', en: 'Supply chain attacks and typosquatting', how: 'composed',
    src: 'MDN "Attacks", "Supply chain attacks" — https://developer.mozilla.org/en-US/docs/Web/Security/Attacks ; OWASP NPM Security Cheat Sheet, "Understanding typosquatting and slopsquatting attacks" — https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html',
    note: 'typosquatting은 한 낱말이다: "Typosquatting is an attack that relies on mistakes made by users, such as typos." OWASP NPM 치트 시트는 supply chain attacks와 하이픈을 넣은 supply-chain attacks를 섞어 쓴다. OWASP Software Supply Chain Security Cheat Sheet에는 supply chain attack, typosquatting이라는 말이 나오지 않는다.' },
  { ko: "JwtDecoder와 NimbusJwtDecoder", en: "JwtDecoder and NimbusJwtDecoder", how: "composed",
    src: "Spring Security Reference, OAuth 2.0 Resource Server JWT — https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html",
    note: "인터페이스·클래스 이름 그대로(jwt)." },
  { ko: "시계 오차 여유(clock skew)", en: "Clock skew", how: "official",
    src: "Spring Security Reference, OAuth 2.0 Resource Server JWT — https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html (Customizing Timestamp Validation)",
    note: "\"By default, Resource Server configures a clock skew of 60 seconds.\" (jwt)" },
  { ko: "OAuth2 리소스 서버(oauth2ResourceServer)", en: "OAuth 2.0 resource server (oauth2ResourceServer)", how: "composed",
    src: "RFC 6749 1.1 Roles — https://www.rfc-editor.org/rfc/rfc6749#section-1.1 ; Spring Security Reference, OAuth 2.0 Resource Server — https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html",
    note: "문서 제목 \"OAuth 2.0 Resource Server\"와 설정 메서드 이름(security)." },
  { ko: "AuthenticationEntryPoint와 AccessDeniedHandler", en: "AuthenticationEntryPoint and AccessDeniedHandler", how: "composed",
    src: "Spring Security Reference, Handling Security Exceptions — https://docs.spring.io/spring-security/reference/servlet/architecture.html",
    note: "인터페이스 이름 그대로(security)." },
  { ko: "JwtEncoder와 NimbusJwtEncoder", en: "JwtEncoder and NimbusJwtEncoder", how: "composed",
    src: "Spring Security source 7.1.1, oauth2-jose JwtEncoder.java, NimbusJwtEncoder.java — https://github.com/spring-projects/spring-security/tree/7.1.1/oauth2/oauth2-jose/src/main/java/org/springframework/security/oauth2/jwt",
    note: "인터페이스·클래스 이름 그대로(auth). JwtDecoder와 NimbusJwtDecoder와 같은 짜임." },
  { ko: "스프링 시큐리티의 CSRF 보호(CsrfFilter)", en: "Spring Security CSRF protection (CsrfFilter)", how: "composed",
    src: "Spring Security Reference, Cross Site Request Forgery (CSRF) — https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html",
    note: "문서의 \"CSRF protection\"(\"Spring Security protects against CSRF attacks by default for unsafe HTTP methods\")과 필터 클래스 이름 CsrfFilter(webattack)." },
];
