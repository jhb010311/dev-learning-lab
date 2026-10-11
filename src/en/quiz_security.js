// Quiz questions for the "Security filter chain" lab. The first entry of a is the correct answer, and when sim is present the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'security', q: 'A request is sent without a token to a path that requires login (GET /orders). What response does Spring Security send?',
    a: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '200 OK'],
    why: 'When a request from an unidentified user reaches a path that requires authentication, AuthenticationEntryPoint responds with 401. 403 is the response when the user is identified but lacks the required authority.',
    sim: { c: { who: 'none', path: 'orders' }, col: 0, has: '401' } },
  { lv: 2, id: 'security', q: 'A request with a valid token that has the USER authority is sent to a path that requires the ADMIN authority. What is the response, and where is it created?',
    a: ['403 Forbidden, created by AccessDeniedHandler', '401 Unauthorized, created by AuthenticationEntryPoint', '403 Forbidden, created by the controller itself', '401 Unauthorized, created by AccessDeniedHandler'],
    why: 'The token is valid, so the user is identified. What is missing is the authority, so ExceptionTranslationFilter calls AccessDeniedHandler, which responds with 403. The controller does not run.',
    sim: { c: { who: 'user', path: 'admin' }, col: 2, has: 'AccessDeniedHandler' } },
  { lv: 2, id: 'security', q: 'A request without a token to a path that requires the ADMIN authority gets 401, not 403. Why?',
    a: ['The user is anonymous, so the response asks who the user is before authority is considered', 'Admin paths are defined to respond with 401 to every request, whatever the request carries', 'A request without a token gets its response right away, without going through the filter chain', '403 is a status code that is used only when an error has occurred inside the server itself'],
    why: 'When access is denied, ExceptionTranslationFilter looks at whether the current user is anonymous. For an anonymous user it calls AuthenticationEntryPoint and responds with 401, and for an authenticated user it calls AccessDeniedHandler and responds with 403.',
    sim: { c: { who: 'none', path: 'admin' }, col: 0, has: '401' } },
  { lv: 3, id: 'security', q: 'To change the body format of the 401 and 403 responses created by the security filters, you added exception handler methods to a @ControllerAdvice class, but they are not applied. Which is the correct reason and fix?',
    a: ['The responses are created in the filters, so register your own AuthenticationEntryPoint and AccessDeniedHandler', '@ControllerAdvice is not applied to GET requests, so the requests have to be changed and sent as POST instead', 'Security exceptions are checked exceptions, so the controller methods have to declare them with a throws clause', 'The precedence of the @ControllerAdvice class is too low, so add @Order(1) to it to move it up in the order'],
    why: 'These responses are created in the filters before the request reaches DispatcherServlet. @ControllerAdvice handles only exceptions that occur while DispatcherServlet is calling a controller, so it does not reach them.' },
]);
