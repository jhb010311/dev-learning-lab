// "시큐리티 필터 체인" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'security', q: '토큰 없이 로그인이 필요한 경로(GET /orders)를 요청했습니다. 스프링 시큐리티는 어떤 응답을 보냅니까?',
    a: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '200 OK'],
    why: '이 실습의 설정에서는 누구인지 확인되지 않은 요청이 인증이 필요한 경로에 오면 AuthenticationEntryPoint가 401로 응답합니다. 403은 누구인지는 확인됐지만 권한이 모자랄 때의 응답입니다.',
    sim: { c: { who: 'none', path: 'orders' }, col: 0, has: '401' } },
  { lv: 2, id: 'security', q: 'USER 권한의 유효한 토큰으로 ADMIN 권한이 필요한 경로를 요청했습니다. 어떤 응답이 나오고, 그 응답은 어디에서 만들어집니까?',
    a: ['403 Forbidden이고 AccessDeniedHandler가 만든다', '401 Unauthorized이고 AuthenticationEntryPoint가 만든다', '403 Forbidden이고 컨트롤러가 직접 만든다', '401 Unauthorized이고 AccessDeniedHandler가 만든다'],
    why: '토큰이 유효하므로 누구인지는 확인됐습니다. 권한이 모자란 것이므로 ExceptionTranslationFilter가 AccessDeniedHandler를 호출해 403으로 응답합니다. 컨트롤러는 실행되지 않습니다.',
    sim: { c: { who: 'user', path: 'admin' }, col: 2, has: 'AccessDeniedHandler' } },
  { lv: 2, id: 'security', q: '토큰 없이 ADMIN 권한이 필요한 경로를 요청하면 403이 아니라 401이 나옵니다. 이유는 무엇입니까?',
    a: ['익명 사용자라서 권한을 따지기 전에 누구인지부터 밝히라고 응답하기 때문이다', '관리자 경로는 어떤 요청에든 401로 응답하도록 정해져 있기 때문이다', '토큰이 없는 요청은 필터 체인을 거치지 않고 바로 응답하기 때문이다', '403은 서버 안에서 오류가 났을 때만 쓰는 상태 코드이기 때문이다'],
    why: '접근이 거부됐을 때 ExceptionTranslationFilter는 현재 사용자가 익명인지를 봅니다. 익명이면 AuthenticationEntryPoint를 호출해 401로, 인증된 사용자면 AccessDeniedHandler를 호출해 403으로 응답합니다.',
    sim: { c: { who: 'none', path: 'admin' }, col: 0, has: '401' } },
  { lv: 3, id: 'security', q: '시큐리티 필터가 만든 401과 403 응답의 본문 형식을 바꾸려고 @ControllerAdvice에 예외 처리 메서드를 추가했지만 적용되지 않습니다. 이유와 해결 방법으로 옳은 것은 무엇입니까?',
    a: ['필터에서 만들어지는 응답이라 AuthenticationEntryPoint와 AccessDeniedHandler를 직접 등록해야 한다', '@ControllerAdvice는 GET 요청에는 적용되지 않으므로 요청을 POST로 바꿔 보내야 한다', '시큐리티의 예외는 체크 예외라서 컨트롤러 메서드에 throws로 선언해 주어야 한다', '@ControllerAdvice의 우선순위가 낮아서이므로 @Order(1)을 붙여 순서를 올려야 한다'],
    why: '이 응답은 요청이 DispatcherServlet에 닿기 전에 필터에서 만들어집니다. @ControllerAdvice는 DispatcherServlet이 컨트롤러를 호출하는 과정에서 난 예외만 처리하므로 여기에는 닿지 않습니다.' },
]);
