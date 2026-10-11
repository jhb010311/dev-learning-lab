// Spring 용어의 영어 대조표. ko는 설명집의 용어 이름과 글자 하나까지 같아야 한다.
// 확인한 날: 2026-10-10. src의 주소는 모두 이 작업 중에 실제로 연 페이지다.
module.exports = [
  { ko: 'ThreadLocal', en: 'ThreadLocal', how: 'official',
    src: 'Java SE 21 API, java.lang.ThreadLocal — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ThreadLocal.html',
    also: ['thread-local variable'],
    note: '클래스 이름은 그대로. 풀어 쓸 때는 API 문서의 "This class provides thread-local variables."처럼 thread-local variable(하이픈).' },

  { ko: 'IoC(제어의 역전)', en: 'Inversion of Control (IoC)', how: 'official',
    src: 'Spring Framework Reference, "Introduction to the Spring IoC Container and Beans" — https://docs.spring.io/spring-framework/reference/core/beans/introduction.html',
    also: ['IoC'],
    note: '문서 표기: "the Inversion of Control (IoC) principle". 컨테이너는 "IoC container", "Spring IoC container".' },

  { ko: '생성자 주입, 세터 주입, 필드 주입', en: 'Constructor injection, setter injection, and field injection', how: 'composed',
    src: 'Spring Framework Reference, "Dependency Injection"(constructor injection, setter injection) — https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html ; "Dependency Injection of Test Fixtures"(field injection) — https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/fixture-di.html',
    also: ['Constructor-based dependency injection', 'Setter-based dependency injection'],
    note: '절 제목은 "Constructor-based Dependency Injection", "Setter-based Dependency Injection"이고 본문은 constructor injection, setter injection을 쓴다. field injection은 DI 장에는 없고 테스트 장에서 확인("Although field injection is discouraged in production code, ...").' },

  { ko: '스프링 빈(Bean)', en: 'Spring bean', how: 'official',
    src: 'Spring Framework Reference, "Introduction to the Spring IoC Container and Beans"(bean의 정의) — https://docs.spring.io/spring-framework/reference/core/beans/introduction.html ; "Controller Advice"("registered as a Spring bean") — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html',
    also: ['bean'],
    note: '정의 문장: "A bean is an object that is instantiated, assembled, and managed by a Spring IoC container."' },

  { ko: '빈 스코프', en: 'Bean scope', how: 'official',
    src: 'Spring Framework Reference, "Bean Scopes" — https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html',
    also: ['scope'],
    note: '페이지 제목 "Bean Scopes", 표 제목 "Table 1. Bean scopes". 스코프 이름은 singleton, prototype, request, session 그대로.' },

  { ko: '싱글톤 빈과 무상태(Stateless)', en: 'Stateless singleton beans', how: 'descriptive',
    src: 'Spring Framework Reference, "Bean Scopes"(singleton bean, stateless beans) — https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html',
    also: ['singleton bean', 'stateless bean'],
    note: '정해진 용어가 아니라 "싱글톤 빈은 무상태여야 한다"는 설명의 이름이다. 낱말은 문서의 "use the prototype scope for all stateful beans and the singleton scope for stateless beans"에서 확인. 명사형 statelessness는 문서에서 보지 못해 쓰지 않았다.' },

  { ko: '빈 생명주기', en: 'Bean lifecycle', how: 'official',
    src: 'Spring Framework Reference, "Customizing the Nature of a Bean" > "Lifecycle Callbacks" — https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html',
    also: ['lifecycle callbacks'],
    note: 'lifecycle은 한 낱말(life cycle, life-cycle 아님). 문서: "the container\'s management of the bean lifecycle". 초기화·소멸 콜백은 "Initialization Callbacks", "Destruction Callbacks".' },

  { ko: '컴포넌트 스캔', en: 'Component scanning', how: 'official',
    src: 'Spring Framework Reference, "Instantiating the Spring Container by Using AnnotationConfigApplicationContext"("To enable component scanning, ...") — https://docs.spring.io/spring-framework/reference/core/beans/java/instantiating-container.html',
    also: ['component scan', 'classpath scanning'],
    note: '참조 문서 본문은 component scanning. Spring Boot 문서에는 "component scan"도 나온다(https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html). 장 제목은 "Classpath Scanning and Managed Components". 애노테이션은 @ComponentScan.' },

  { ko: '@Configuration과 @Bean', en: '@Configuration and @Bean', how: 'composed',
    src: 'Spring Framework Reference, "Basic Concepts: @Bean and @Configuration" — https://docs.spring.io/spring-framework/reference/core/beans/java/basic-concepts.html',
    note: '' },

  { ko: '순환 참조', en: 'Circular dependency', how: 'official',
    src: 'Spring Framework Reference, "Dependency Injection" > "Circular dependencies" — https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html',
    also: ['circular reference'],
    note: '한국어를 직역하면 circular reference이고 문서에도 한 번 나오지만("detects this circular reference at runtime"), 절 제목과 본문 대부분은 circular dependency / circular dependencies다. 그때 던지는 예외는 BeanCurrentlyInCreationException.' },

  { ko: 'AOP(관점 지향 프로그래밍)', en: 'Aspect-oriented programming (AOP)', how: 'official',
    src: 'Spring Framework Reference, "Aspect Oriented Programming with Spring" — https://docs.spring.io/spring-framework/reference/core/aop.html',
    also: ['AOP', 'Aspect Oriented Programming'],
    note: '본문 첫 문장은 하이픈 있는 "Aspect-oriented Programming (AOP)", 장 제목은 하이픈 없는 "Aspect Oriented Programming with Spring". 횡단 관심사는 "crosscutting concern"(한 낱말, cross-cutting 아님).' },

  { ko: '프록시(Proxy)', en: 'Proxy', how: 'official',
    src: 'Spring Framework Reference, "AOP Concepts"(AOP proxy의 정의) — https://docs.spring.io/spring-framework/reference/core/aop/introduction-defn.html ; "Proxying Mechanisms" — https://docs.spring.io/spring-framework/reference/core/aop/proxying.html',
    also: ['AOP proxy'],
    note: '정의: "AOP proxy: An object created by the AOP framework in order to implement the aspect contracts". 감싸인 실제 객체는 "target object"(또는 "advised object").' },

  { ko: 'JDK 동적 프록시와 CGLIB', en: 'JDK dynamic proxy and CGLIB', how: 'composed',
    src: 'Spring Framework Reference, "Proxying Mechanisms" — https://docs.spring.io/spring-framework/reference/core/aop/proxying.html',
    also: ['JDK dynamic proxies', 'CGLIB proxy'],
    note: '문서: "Spring AOP uses either JDK dynamic proxies or CGLIB to create the proxy for a given target object." CGLIB는 모두 대문자.' },

  { ko: '자기 호출(Self-invocation)', en: 'Self-invocation', how: 'official',
    src: 'Spring Framework Reference, "Using @Transactional" — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html ; "Declarative Annotation-based Caching" — https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html',
    also: ['self invocation'],
    note: '트랜잭션·캐시 장은 하이픈 있는 self-invocation, AOP의 "Proxying Mechanisms" 장은 두 표기를 섞어 쓴다("self invocation is not going to result in the advice ...", "this self-invocation issue").' },

  { ko: '@Transactional', en: '@Transactional', how: 'official',
    src: 'Spring Framework Reference, "Using @Transactional" — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html',
    note: '선언적 트랜잭션은 "declarative transaction", "Declarative Transaction Management".' },

  { ko: '트랜잭션 전파(Propagation)', en: 'Transaction propagation', how: 'official',
    src: 'Spring Framework Reference, "Transaction Propagation" — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html',
    also: ['propagation'],
    note: '문서의 설정 이름은 PROPAGATION_REQUIRED, PROPAGATION_REQUIRES_NEW, PROPAGATION_NESTED. 롤백 전용 표시는 "rollback-only"(하이픈).' },

  { ko: '롤백 규칙과 rollbackFor', en: 'Rollback rules and rollbackFor', how: 'composed',
    src: 'Spring Framework Reference, "Rolling Back a Declarative Transaction" > "Rollback rules" — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html',
    also: ['rollback rule'],
    note: '문서: "Checked exceptions that are thrown from a transactional method do not result in a rollback in the default configuration." Checked 예외는 "checked exceptions", 그 반대는 "runtime, unchecked exceptions".' },

  { ko: '세이브포인트', en: 'Savepoint', how: 'official',
    src: 'Spring Framework Reference, "Transaction Propagation"("multiple savepoints that it can roll back to", "JDBC savepoints") — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html ; MySQL 8.4 Reference Manual Glossary, "savepoint" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    note: '한 낱말(save point 아님).' },

  { ko: 'DispatcherServlet과 프론트 컨트롤러', en: 'DispatcherServlet and the front controller pattern', how: 'composed',
    src: 'Spring Framework Reference, "DispatcherServlet" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html',
    also: ['front controller'],
    note: '문서: "Spring MVC, as many other web frameworks, is designed around the front controller pattern where a central Servlet, the DispatcherServlet, provides a shared algorithm for request processing". front controller는 소문자.' },

  { ko: 'HandlerMapping과 HandlerAdapter', en: 'HandlerMapping and HandlerAdapter', how: 'composed',
    src: 'Spring Framework Reference, "Special Bean Types" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/special-bean-types.html',
    note: '컨트롤러 메서드를 가리키는 일반 낱말은 "handler".' },

  { ko: 'ArgumentResolver', en: 'HandlerMethodArgumentResolver', how: 'official',
    src: 'Spring Framework API, HandlerMethodArgumentResolver — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/method/support/HandlerMethodArgumentResolver.html ; WebMvcConfigurer.addArgumentResolvers — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/config/annotation/WebMvcConfigurer.html',
    note: '한국어 이름 "ArgumentResolver"는 줄여 부르는 말이고 실제 인터페이스 이름은 HandlerMethodArgumentResolver다("Strategy interface for resolving method parameters into argument values in the context of a given request."). 띄어 쓴 "argument resolver"는 연 페이지들에서 보지 못했다(문서는 "resolvers", "argument resolution"을 쓴다). 그래서 also에 넣지 않았다.' },

  { ko: 'HttpMessageConverter', en: 'HttpMessageConverter', how: 'official',
    src: 'Spring Framework Reference, "@RequestBody" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestbody.html ; "Message Converters" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/message-converters.html',
    also: ['message converter'],
    note: '풀어 쓴 말은 REST Clients 장의 "configure message converters"와 MVC 설정 장 제목 "Message Converters"에서 확인. 변환 자체는 "message conversion", "HTTP Message Conversion".' },

  { ko: 'ViewResolver', en: 'ViewResolver', how: 'official',
    src: 'Spring Framework Reference, "Special Bean Types" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/special-bean-types.html',
    note: '문서: "Resolve logical String-based view names returned from a handler to an actual View with which to render to the response." 뷰 이름은 "view name", 그 절의 제목은 "View Resolution".' },

  { ko: '@Controller와 @RestController', en: '@Controller and @RestController', how: 'composed',
    src: 'Spring Framework Reference, "Annotated Controllers" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html',
    note: '' },

  { ko: '서블릿과 서블릿 컨테이너', en: 'Servlet and servlet container', how: 'composed',
    src: 'Jakarta Servlet Specification 6.1, "1.1. What is a Servlet?", "1.2. What is a Servlet Container?" — https://jakarta.ee/specifications/servlet/6.1/jakarta-servlet-spec-6.1.html ; Jakarta Servlet 6.1 API, jakarta.servlet.Servlet — https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/Servlet.html',
    also: ['Servlet container', 'servlet engine'],
    note: '명세는 본문에서 소문자 servlet, servlet container를 쓴다("A servlet is a Jakarta technology-based web component, managed by a container, that generates dynamic content."). Spring 문서는 "Servlet container"로 S를 대문자로 쓴다. 명세에는 "Containers, sometimes called servlet engines"라는 말도 있다.' },

  { ko: '필터(Filter)', en: 'Servlet filter', how: 'official',
    src: 'Spring Framework Reference, "Filters"("Servlet filters can be configured in web.xml or via Servlet annotations.") — https://docs.spring.io/spring-framework/reference/web/webmvc/filters.html ; Jakarta Servlet 6.1 API, jakarta.servlet.Filter — https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/Filter.html',
    also: ['Filter'],
    note: '서블릿 API의 이름은 그냥 Filter("A filter is an object that performs filtering tasks on either the request to a resource ... or on the response from a resource, or both.")지만, 다른 분야의 filter와 겹치지 않도록 Spring 문서가 쓰는 "Servlet filter"를 이름으로 골랐다. Spring Security 문서는 "Servlet Filters"로 쓴다.' },

  { ko: '인터셉터(HandlerInterceptor)', en: 'Interceptor (HandlerInterceptor)', how: 'official',
    src: 'Spring Framework Reference, "Interception" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/handlermapping-interceptor.html',
    also: ['HandlerInterceptor', 'interceptor'],
    note: '절 제목은 "Interception", 본문은 interceptors. 콜백 이름 preHandle, postHandle, afterCompletion은 그대로.' },

  { ko: '@ControllerAdvice와 @ExceptionHandler', en: '@ControllerAdvice and @ExceptionHandler', how: 'composed',
    src: 'Spring Framework Reference, "Controller Advice" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html',
    note: '부정관사는 문서 표기대로 "an @ControllerAdvice". @ControllerAdvice에 @ResponseBody를 더한 것은 @RestControllerAdvice.' },

  { ko: 'Spring Boot 자동 설정(Auto-configuration)', en: 'Spring Boot auto-configuration', how: 'official',
    src: 'Spring Boot Reference, "Auto-configuration" — https://docs.spring.io/spring-boot/reference/using/auto-configuration.html',
    also: ['auto-configuration'],
    note: '하이픈을 넣는다(autoconfiguration, auto configuration 아님). 문서: "Spring Boot auto-configuration attempts to automatically configure your Spring application based on the jar dependencies that you have added." 개발자가 빈을 직접 등록하면 물러나는 것은 "backs away".' },

  { ko: '스타터(Starter)', en: 'Starter', how: 'official',
    src: 'Spring Boot Reference, "Build Systems" > "Starters" — https://docs.spring.io/spring-boot/reference/using/build-systems.html',
    note: '문서: "Starters are a set of convenient dependency descriptors that you can include in your application." 같은 페이지의 표에 spring-boot-starter-web이 "deprecated in favor of spring-boot-starter-webmvc"로 적혀 있어 한국어 설명과 맞는다.' },

  { ko: '내장 서버', en: 'Embedded server', how: 'official',
    src: 'Spring Boot Reference, "Servlet Web Applications"("By default, the embedded server listens for HTTP requests on port 8080.") — https://docs.spring.io/spring-boot/reference/web/servlet.html ; Spring Boot How-to, "Embedded Web Servers" — https://docs.spring.io/spring-boot/how-to/webserver.html',
    also: ['embedded web server', 'embedded servlet container', 'embedded container'],
    note: 'Spring Boot 문서는 네 가지 말을 섞어 쓴다. 이번에 연 페이지들에는 built-in server라는 말이 없었으므로 embedded로 통일한다.' },

  { ko: '외부화 설정과 프로파일', en: 'Externalized configuration and profiles', how: 'composed',
    src: 'Spring Boot Reference, "Externalized Configuration" — https://docs.spring.io/spring-boot/reference/features/external-config.html ; "Profiles" — https://docs.spring.io/spring-boot/reference/features/profiles.html',
    also: ['Spring Profiles'],
    note: '문서: "Spring Boot lets you externalize your configuration so that you can work with the same application code in different environments." 설정 출처는 "Java properties files, YAML files, environment variables, and command-line arguments". 켜진 프로파일은 "active profiles".' },

  { ko: '@Async', en: '@Async', how: 'official',
    src: 'Spring Framework Reference, "Task Execution and Scheduling" > "The @Async annotation" — https://docs.spring.io/spring-framework/reference/integration/scheduling.html',
    note: '문서: "You can provide the @Async annotation on a method so that invocation of that method occurs asynchronously." 이 페이지는 self-invocation이라는 말 대신 "Local calls within the same class cannot get intercepted that way."라고 쓴다.' },

  { ko: '인증과 인가', en: 'Authentication and authorization', how: 'composed',
    src: 'Spring Security Reference, "Authentication" — https://docs.spring.io/spring-security/reference/features/authentication/index.html ; "Authorization" — https://docs.spring.io/spring-security/reference/servlet/authorization/index.html ; RFC 9110, 15.5.2 "401 Unauthorized", 15.5.4 "403 Forbidden" — https://www.rfc-editor.org/rfc/rfc9110.html',
    note: '문서: "Authentication is how we verify the identity of who is trying to access a particular resource." 401의 이름은 "Unauthorized"지만 RFC 9110의 뜻은 인증 정보가 없다는 것("lacks valid authentication credentials")이므로, 인가를 unauthorized로 옮기지 않는다.' },

  { ko: 'Spring Security와 SecurityFilterChain', en: 'Spring Security and SecurityFilterChain', how: 'composed',
    src: 'Spring Security Reference, "Architecture" — https://docs.spring.io/spring-security/reference/servlet/architecture.html ; 개요 — https://docs.spring.io/spring-security/reference/index.html',
    note: '문서: "SecurityFilterChain is used by FilterChainProxy to determine which Spring Security Filter instances should be invoked for the current request." 필터 묶음 안의 필터들은 "Security Filters".' },

  { ko: 'SecurityContext', en: 'SecurityContext', how: 'official',
    src: 'Spring Security Reference, "Servlet Authentication Architecture" — https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html',
    note: '문서: "SecurityContext - is obtained from the SecurityContextHolder and contains the Authentication of the currently authenticated user." 스레드별 보관은 "By default, SecurityContextHolder uses a ThreadLocal to store these details".' },

  { ko: '영속성 컨텍스트', en: 'Persistence context', how: 'official',
    src: 'Jakarta Persistence 3.2 API, jakarta.persistence.EntityManager — https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/EntityManager.html',
    note: '문서: "Each EntityManager instance is associated with a distinct persistence context. A persistence context is a set of entity instances in which for any given persistent entity identity ...". 명세 본문(7장 "Persistence Contexts")은 페이지가 길어 그 장까지 읽지 못했고 목차의 제목만 봤다.' },

  { ko: 'OSIV(Open Session In View)', en: 'Open Session in View', how: 'official',
    src: 'Spring Framework 6.2 API, OpenSessionInViewFilter — https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/orm/hibernate5/support/OpenSessionInViewFilter.html ; Spring Boot Reference, "SQL Databases" > "Open EntityManager in View" — https://docs.spring.io/spring-boot/reference/data/sql.html',
    also: ['Open EntityManager in View'],
    note: '표기는 in을 소문자로: the "Open Session in View" pattern. JPA 쪽 이름은 "Open EntityManager in View"이고 Spring Boot 문서는 이 이름과 속성 spring.jpa.open-in-view를 쓴다. 줄임말 OSIV는 흔히 쓰이지만 이번에 연 공식 페이지에서는 보지 못했으므로, 영어판에서는 처음에 풀어 쓴 이름을 함께 적는 것이 안전하다. Spring Framework 현재판(7.x) API에는 hibernate5 패키지의 이 클래스 페이지가 없어 6.2.x 문서에서 확인했다.' },

  { ko: '트랜잭션', en: 'Transaction', how: 'official',
    src: 'MySQL 8.4 Reference Manual Glossary, "transaction" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    note: '정의: "Transactions are atomic units of work that can be committed or rolled back." 커밋·롤백은 commit, rollback(동사로는 roll back, 두 낱말).' },

  { ko: 'ACID', en: 'ACID', how: 'official',
    src: 'MySQL 8.4 Reference Manual Glossary, "ACID" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    note: '정의: "An acronym standing for atomicity, consistency, isolation, and durability."' },

  { ko: 'Undo 로그와 Redo 로그', en: 'Undo log and redo log', how: 'composed',
    src: 'MySQL 8.4 Reference Manual Glossary, "undo log", "redo log" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    note: '둘 다 소문자, 두 낱말.' },

  { ko: '커넥션 풀', en: 'Connection pool', how: 'official',
    src: 'MySQL 8.4 Reference Manual Glossary, "connection pool" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; Spring Boot Reference, "SQL Databases" > "Supported Connection Pools" — https://docs.spring.io/spring-boot/reference/data/sql.html',
    also: ['pooling DataSource'],
    note: 'Spring Boot 문서: "We prefer HikariCP for its performance and concurrency. If HikariCP is available, we always choose it."' },

  { ko: '캐시', en: 'Cache', how: 'official',
    src: 'MySQL 8.4 Reference Manual Glossary, "cache" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; Spring Framework Reference, "Cache Abstraction" — https://docs.spring.io/spring-framework/reference/integration/cache.html',
    note: '정의: "The general term for any memory area that stores copies of data for frequent or high-speed retrieval." 오래된 값은 Spring 문서에서 "stale ... data"로 확인.' },

  { ko: 'HTTP 메서드', en: 'HTTP methods', how: 'official',
    src: 'RFC 9110 (HTTP Semantics), 9 "Methods" — https://www.rfc-editor.org/rfc/rfc9110.html ; Spring Framework Reference, "Mapping Requests"("matches to all HTTP methods") — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html',
    also: ['request methods', 'HTTP request methods', 'HTTP verbs'],
    note: 'RFC 9110의 장 제목은 "Methods", 본문의 말은 "request method"("The request method token is the primary source of request semantics"). MDN의 제목은 "HTTP request methods"이고 "sometimes referred to as HTTP verbs"라고 적는다(https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods). 성질은 "safe", "idempotent".' },

  { ko: 'HTTP 상태 코드', en: 'HTTP status codes', how: 'official',
    src: 'RFC 9110 (HTTP Semantics), 15 "Status Codes" — https://www.rfc-editor.org/rfc/rfc9110.html',
    also: ['status code'],
    note: '문서: "The status code of a response is a three-digit integer code that describes the result of the request", "HTTP status codes are extensible." 분류 이름은 1xx (Informational), 2xx (Successful), 3xx (Redirection), 4xx (Client Error), 5xx (Server Error). 개별 표기는 "200 (OK)", "404 (Not Found)"처럼 쓴다.' },

  { ko: '3-way handshake', en: 'Three-way handshake', how: 'official',
    src: 'RFC 9293 (Transmission Control Protocol), 3.5 "Establishing a Connection" — https://www.rfc-editor.org/rfc/rfc9293.html',
    note: '문서: "The "three-way handshake" is the procedure used to establish a connection." RFC 9293에서 읽은 범위에는 숫자로 쓴 "3-way handshake"가 없었다(낱말로 쓴 three-way만 나온다).' },

  { ko: '웹 서버와 WAS', en: 'Web server and application server', how: 'composed',
    src: 'MDN, "What is a web server?" — https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_web_server ; Jakarta Servlet Specification 6.1, "1.2. What is a Servlet Container?"("a part of a web server or application server") — https://jakarta.ee/specifications/servlet/6.1/jakarta-servlet-spec-6.1.html',
    note: '"WAS"라는 줄임말은 한국에서 굳은 말이라 영어 자료에서는 일반 용어로 쓰이지 않는다. 영어로는 application server라고 풀어 쓴다. 톰캣은 영어 자료에서 보통 servlet container라고 부른다(서블릿 명세: "The servlet container is a part of a web server or application server"). MDN은 "static web server", "dynamic web server"로도 가른다.' },

  { ko: '병목(Bottleneck)', en: 'Bottleneck', how: 'official',
    src: 'MySQL 8.4 Reference Manual Glossary, "bottleneck" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    note: '정의: "A portion of a system that is constrained in size or capacity, that has the effect of limiting overall throughput."' },

  { ko: 'CI/CD', en: 'CI/CD', how: 'official',
    src: 'AWS Whitepaper, "Practicing Continuous Integration and Continuous Delivery on AWS"("continuous integration and continuous delivery (CI/CD)") — https://docs.aws.amazon.com/whitepapers/latest/practicing-continuous-integration-continuous-delivery/welcome.html ; Martin Fowler, "ContinuousDelivery" — https://martinfowler.com/bliki/ContinuousDelivery.html',
    also: ['continuous integration and continuous delivery', 'Continuous Integration', 'Continuous Delivery', 'Continuous Deployment'],
    note: 'CD는 Continuous Delivery(전달)와 Continuous Deployment(배포) 둘 다를 가리킨다. Fowler: "Continuous Deployment means that every change goes through the pipeline and automatically gets put into production", "Continuous Delivery just means that you are able to do frequent deployments but may choose not to do it". Fowler의 글에는 CI/CD라는 줄임말이 없어 AWS 문서에서 확인했다. Docker 문서는 "Continuous Integration (CI)"(https://docs.docker.com/build/ci/).' },

  { ko: '템플릿 메서드 패턴', en: 'Template Method pattern', how: 'official',
    src: 'Spring Framework API, AbstractApplicationContext("Uses the Template Method design pattern, requiring concrete subclasses to implement abstract methods.") — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/support/AbstractApplicationContext.html',
    also: ['Template Method design pattern'],
    note: '패턴 이름 Template Method는 두 낱말 모두 대문자로 시작한다. 연 페이지의 글자 그대로는 "Template Method design pattern"이고, en은 거기서 design만 뺀 꼴이다. 이 패턴의 정의가 실린 1차 자료(GoF의 Design Patterns)는 웹으로 열 수 없어 정의 문장은 확인하지 못했다.' },

  { ko: '어드바이스(Advice)', en: 'Advice', how: 'official',
    src: 'Spring Framework Reference, "AOP Concepts" — https://docs.spring.io/spring-framework/reference/core/aop/introduction-defn.html ; "Declaring Advice" — https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html',
    note: '정의: "Advice: Action taken by an aspect at a particular join point." 여러 개를 말할 때 문서는 "types of advice"라고 쓴다. 종류 이름은 Before advice, After returning advice, After throwing advice, After (finally) advice, Around advice.' },

  { ko: '포인트컷(Pointcut)', en: 'Pointcut', how: 'official',
    src: 'Spring Framework Reference, "AOP Concepts" — https://docs.spring.io/spring-framework/reference/core/aop/introduction-defn.html',
    also: ['pointcut expression'],
    note: '정의: "Pointcut: A predicate that matches join points." 한 낱말(point cut 아님). 조건식은 "pointcut expression", 적용 지점은 "join point"(두 낱말).' },

  { ko: '애스펙트(Aspect)와 @Order', en: 'Aspect and @Order', how: 'composed',
    src: 'Spring Framework Reference, "AOP Concepts"(Aspect) — https://docs.spring.io/spring-framework/reference/core/aop/introduction-defn.html ; "Declaring Advice" > "Advice Ordering"(@Order) — https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html',
    note: '정의: "Aspect: A modularization of a concern that cuts across multiple classes." 순서는 precedence로 말한다: "the aspect returning the lower value from Ordered.getOrder() (or the annotation value) has the higher precedence."' },

  { ko: '@RequestParam과 @PathVariable', en: '@RequestParam and @PathVariable', how: 'composed',
    src: 'Spring Framework Reference, "@RequestParam" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestparam.html ; "Mapping Requests"(@PathVariable) — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html',
    note: '문서의 말: @RequestParam은 "Servlet request parameters (that is, query parameters or form data)", @PathVariable은 "URI variables"("Captured URI variables can be accessed with @PathVariable."). 타입 변환은 "type conversion".' },

  { ko: '@ModelAttribute와 @RequestBody', en: '@ModelAttribute and @RequestBody', how: 'composed',
    src: 'Spring Framework Reference, "@ModelAttribute" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/modelattrib-method-args.html ; "@RequestBody" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestbody.html',
    note: '문서: "The @ModelAttribute method parameter annotation binds request parameters, URI path variables, and request headers onto a model object.", "By default, both constructor and property data binding are applied." 한국어 설명은 setter로 넣는 방식만 적고 있어 문서보다 좁다(보고에 적음). 값을 객체에 넣는 일은 "data binding".' },

  { ko: '쿼리 스트링과 폼 본문', en: 'Query string and form data', how: 'composed',
    src: 'Jakarta Servlet 6.1 API, ServletRequest.getParameter("For HTTP servlets, parameters are contained in the query string or posted form data.") — https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/ServletRequest.html ; MDN, "POST request method"(form data, application/x-www-form-urlencoded) — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/POST',
    also: ['posted form data', 'query parameters', 'query component'],
    note: '"폼 본문"을 직역한 form body는 자료에 없다. 서블릿 API는 "posted form data", Spring과 MDN은 "form data"라고 쓴다. 둘을 합친 것은 "request parameters". URL의 ? 뒤 부분을 RFC 9110과 MDN은 "query component", 그 안의 이름=값을 Spring은 "query parameters"라고 부른다.' },

  { ko: '@Cacheable', en: '@Cacheable', how: 'official',
    src: 'Spring Framework Reference, "Declarative Annotation-based Caching" > "The @Cacheable Annotation" — https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html',
    note: '문서: "methods for which the result is stored in the cache so that, on subsequent invocations (with the same arguments), the value in the cache is returned without having to actually invoke the method". 속성 이름 cacheNames, key, unless, condition은 그대로.' },

  { ko: '@CacheEvict와 @CachePut', en: '@CacheEvict and @CachePut', how: 'composed',
    src: 'Spring Framework Reference, "Declarative Annotation-based Caching" > "The @CachePut Annotation", "The @CacheEvict Annotation" — https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html',
    note: '캐시에서 지우는 일은 "cache eviction", 동사 "evict"("@CacheEvict demarcates methods that perform cache eviction").' },

  { ko: '@Primary와 @Qualifier', en: '@Primary and @Qualifier', how: 'composed',
    src: 'Spring Framework Reference, "Fine-tuning Annotation-based Autowiring with @Primary or @Fallback" — https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-primary.html ; "Fine-tuning Annotation-based Autowiring with Qualifiers" — https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-qualifiers.html',
    note: '타입으로 찾는 주입은 "autowiring by type", 후보가 여럿인 것은 "multiple candidates". @Qualifier에 적는 값은 "qualifier value"이고 빈 이름은 그 기본값("the bean name is considered a default qualifier value").' },

  { ko: 'NoSuchBeanDefinitionException과 NoUniqueBeanDefinitionException', en: 'NoSuchBeanDefinitionException and NoUniqueBeanDefinitionException', how: 'composed',
    src: 'Spring Framework API, NoSuchBeanDefinitionException — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/NoSuchBeanDefinitionException.html ; NoUniqueBeanDefinitionException — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/NoUniqueBeanDefinitionException.html',
    note: 'NoUniqueBeanDefinitionException은 NoSuchBeanDefinitionException의 하위 클래스다.' },

  { ko: 'JdbcTemplate', en: 'JdbcTemplate', how: 'official',
    src: 'Spring Framework Reference, "Using the JDBC Core Classes to Control Basic JDBC Processing and Error Handling" — https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html',
    note: '문서: "JdbcTemplate is the central class in the JDBC core package. It handles the creation and release of resources". 넘겨주는 부분은 "callback interfaces".' },

  { ko: '예외 변환과 DataAccessException', en: 'Exception translation and DataAccessException', how: 'composed',
    src: 'Spring Framework Reference, "DAO Support" > "Consistent Exception Hierarchy" — https://docs.spring.io/spring-framework/reference/data-access/dao.html ; "Using the JDBC Core Classes ..."("This exception translation mechanism ...") — https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html',
    note: '문서의 말은 exception translation, 동사는 translate("can translate between SQLExceptions and Spring\'s own org.springframework.dao.DataAccessException"). 계층은 "exception hierarchy", 맨 위는 "root exception"("which has DataAccessException as the root exception").' },

  { ko: '@PostConstruct와 @PreDestroy', en: '@PostConstruct and @PreDestroy', how: 'composed',
    src: 'Spring Framework Reference, "Customizing the Nature of a Bean" > "Lifecycle Callbacks" — https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html',
    note: '문서: "The JSR-250 @PostConstruct and @PreDestroy annotations are generally considered best practice for receiving lifecycle callbacks in a modern Spring application."' },

  { ko: 'InitializingBean과 DisposableBean', en: 'InitializingBean and DisposableBean', how: 'composed',
    src: 'Spring Framework Reference, "Customizing the Nature of a Bean" > "Initialization Callbacks", "Destruction Callbacks", "Combining Lifecycle Mechanisms" — https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html',
    note: '부르는 순서(@PostConstruct, afterPropertiesSet(), 직접 지정한 init 메서드)가 같은 페이지에 있고 한국어 설명과 맞는다.' },

  { ko: '콘텐츠 협상(Accept와 Content-Type)', en: 'Content negotiation (Accept and Content-Type)', how: 'composed',
    src: 'RFC 9110 (HTTP Semantics), 12 "Content Negotiation", 12.5.1 "Accept", 8.3 "Content-Type", 8.3.1 "Media Type" — https://www.rfc-editor.org/rfc/rfc9110.html',
    note: 'RFC 9110의 content negotiation은 응답의 표현을 고르는 일(Accept 등)을 가리키고, 요청 본문의 Content-Type과 415는 그 장에 속하지 않는다(보고에 적음). 형식의 이름은 "media type". Spring MVC 설정 장의 제목은 "Content Types"다.' },

  { ko: 'ResponseEntity', en: 'ResponseEntity', how: 'official',
    src: 'Spring Framework Reference, "ResponseEntity" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responseentity.html',
    note: '문서: "ResponseEntity is like @ResponseBody but with status and headers."' },

  { ko: '연결 타임아웃과 읽기 타임아웃', en: 'Connect timeout and read timeout', how: 'composed',
    src: 'Spring Framework API, SimpleClientHttpRequestFactory.setConnectTimeout / setReadTimeout — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/client/SimpleClientHttpRequestFactory.html ; Spring Boot Reference, "Calling REST Services" — https://docs.spring.io/spring-boot/reference/io/rest-client.html',
    also: ['connection timeout'],
    note: 'API 문서와 Spring Boot 본문은 connect timeout("a one second connect timeout", "a two-second read timeout")을 쓴다. Spring Boot 문서의 목록에는 "Connection Timeouts", "Connection and read timeouts"라는 표기도 있다. 속성 이름은 connect-timeout, read-timeout.' },

  { ko: 'RestClient', en: 'RestClient', how: 'official',
    src: 'Spring Framework Reference, "REST Clients" — https://docs.spring.io/spring-framework/reference/integration/rest-clients.html',
    note: '문서: "RestClient is a synchronous HTTP client that provides a fluent API to perform requests." 요청 팩토리는 "request factory"(타입은 ClientHttpRequestFactory). 같은 페이지에 "As of Spring Framework 7.0, RestTemplate is deprecated in favor of RestClient"라고 적혀 있다.' },

  { ko: 'ObjectProvider', en: 'ObjectProvider', how: 'official',
    src: 'Spring Framework API, ObjectProvider — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/ObjectProvider.html ; Spring Framework Reference, "Bean Scopes" > "Scoped Beans as Dependencies" — https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html',
    note: '문서: "A variant of ObjectFactory designed specifically for injection points, allowing for programmatic optionality and lenient not-unique handling." 주입받는 자리는 "injection point".' },

  { ko: '스코프 프록시', en: 'Scoped proxy', how: 'official',
    src: 'Spring Framework API, @Scope의 proxyMode("Specifies whether a component should be configured as a scoped proxy ...") — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/annotation/Scope.html ; Spring Framework Reference, "Bean Scopes" > "Scoped Beans as Dependencies" — https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html',
    note: 'scope proxy가 아니라 scoped proxy다. 참조 문서 본문은 복수형 "scoped proxies"와 XML 요소 <aop:scoped-proxy/>를 쓴다. 설정 값은 ScopedProxyMode.TARGET_CLASS 그대로.' },

  { ko: 'Bean Validation과 @Valid', en: 'Bean Validation and @Valid', how: 'composed',
    src: 'Spring Framework Reference, "Java Bean Validation" — https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html ; Spring MVC "Validation" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html ; Jakarta Validation 3.1 API, jakarta.validation.Valid — https://jakarta.ee/specifications/bean-validation/3.1/apidocs/jakarta/validation/Valid.html',
    also: ['Java Bean Validation', 'Jakarta Validation'],
    note: 'Spring 문서는 "Java Bean Validation"과 "Bean Validation"을 쓴다("Bean Validation provides a common way of validation through constraint declaration and metadata for Java applications."). 명세의 지금 이름은 3.1부터 "Jakarta Validation"이다(https://jakarta.ee/specifications/bean-validation/3.1/ 의 제목). 제약은 "constraint", 구현 라이브러리는 "Bean Validation provider", 안쪽 객체까지 검사하는 것은 "validation cascading"(@Valid의 API 설명) 또는 "nested constraints"(Spring 문서).' },

  { ko: '@NotNull, @NotEmpty, @NotBlank', en: '@NotNull, @NotEmpty, and @NotBlank', how: 'composed',
    src: 'Jakarta Validation 3.1 API, jakarta.validation.constraints.NotNull — https://jakarta.ee/specifications/bean-validation/3.1/apidocs/jakarta/validation/constraints/NotNull.html ; NotEmpty — https://jakarta.ee/specifications/bean-validation/3.1/apidocs/jakarta/validation/constraints/NotEmpty.html ; NotBlank — https://jakarta.ee/specifications/bean-validation/3.1/apidocs/jakarta/validation/constraints/NotBlank.html',
    note: 'API 설명: @NotNull "The annotated element must not be null. Accepts any type.", @NotEmpty "The annotated element must not be null nor empty."(CharSequence, Collection, Map, 배열), @NotBlank "The annotated element must not be null and must contain at least one non-whitespace character. Accepts CharSequence." 빈칸은 "whitespace".' },

  { ko: 'BindingResult', en: 'BindingResult', how: 'official',
    src: 'Spring Framework API, BindingResult — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/validation/BindingResult.html ; Spring Framework Reference, Spring MVC "Validation" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html',
    note: 'API 설명: "General interface that represents binding results. Extends the Errors interface for error registration capabilities". 자리 규칙을 문서는 "Errors or BindingResult immediately after in the method signature"라고 쓴다.' },

  { ko: 'MethodArgumentNotValidException', en: 'MethodArgumentNotValidException', how: 'official',
    src: 'Spring Framework Reference, Spring MVC "Validation" — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html ; Spring Framework API, MethodArgumentNotValidException — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/MethodArgumentNotValidException.html',
    note: '문서: "MethodArgumentNotValidException is the exception raised when validating a method parameter individually." 파라미터에 직접 붙인 제약이 실패하는 쪽은 "method validation"이고 그때의 예외가 HandlerMethodValidationException이다. 400이라는 숫자는 이 두 페이지에 적혀 있지 않아 확인하지 못했다.' },

  { ko: 'Actuator', en: 'Actuator', how: 'official',
    src: 'Spring Boot Reference, "Enabling Production-ready Features" — https://docs.spring.io/spring-boot/reference/actuator/enabling.html ; "Endpoints" — https://docs.spring.io/spring-boot/reference/actuator/endpoints.html',
    also: ['spring-boot-actuator'],
    note: '문서: "The spring-boot-actuator module provides all of Spring Boot\'s production-ready features.", "Actuator endpoints let you monitor and interact with your application." 문장 안에서는 소문자 "the actuator"로도 쓴다. 기능 묶음을 가리키는 말은 "production-ready features".' },

  { ko: '헬스 체크(Liveness, Readiness)', en: 'Health check (liveness, readiness)', how: 'official',
    src: 'Kubernetes Documentation, "Liveness, Readiness, and Startup Probes" — https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/ ; Spring Boot Reference, "Endpoints" > "Kubernetes Probes" — https://docs.spring.io/spring-boot/reference/actuator/endpoints.html',
    also: ['liveness probe', 'readiness probe'],
    note: 'health check는 두 낱말(Spring Boot 문서: "should not depend on health checks for external systems"). 쿠버네티스가 쓰는 정식 이름은 probe다: "Liveness probes determine when to restart a container.", "Readiness probes determine when a container is ready to accept traffic."' },

  { ko: 'HealthIndicator와 상태 합치기', en: 'HealthIndicator and the overall health status', how: 'descriptive',
    src: 'Spring Boot Reference, "Endpoints"(Health Information) — https://docs.spring.io/spring-boot/reference/actuator/endpoints.html',
    also: ['StatusAggregator'],
    note: '"상태 합치기"는 정해진 용어가 아니라 설명이다. 문서는 이 일을 "the final system health is derived by a StatusAggregator, which sorts the statuses from each HealthIndicator based on an ordered list of statuses. The first status in the sorted list is used as the overall health status."라고 적는다. 그래서 문서의 "overall health status"를 썼고, 명사 "status aggregation"은 문서에서 보지 못해 쓰지 않았다(클래스 이름 StatusAggregator만 있다). 심각한 순서는 "severity order".' },

  { ko: '헬스 그룹', en: 'Health group', how: 'official',
    src: 'Spring Boot Reference, "Endpoints" > "Health Groups" — https://docs.spring.io/spring-boot/reference/actuator/endpoints.html',
    also: ['health indicator group'],
    note: '문서: "It is sometimes useful to organize health indicators into groups that you can use for different purposes.", "To create a health indicator group, you can use the management.endpoint.health.group.<name> property". liveness, readiness 그룹에 대해서는 "These health groups are automatically enabled."' },

  { ko: '액추에이터 엔드포인트의 노출과 접근', en: 'Exposing Actuator endpoints and controlling access', how: 'descriptive',
    src: 'Spring Boot Reference, "Endpoints" > "Controlling Access to Endpoints", "Exposing Endpoints" — https://docs.spring.io/spring-boot/reference/actuator/endpoints.html',
    note: '정해진 용어가 아니라 두 설정을 묶은 설명이라, 문서의 두 절 제목("Exposing Endpoints", "Controlling Access to Endpoints")의 말로 풀어 썼다. 문서: "An endpoint is considered to be available when access to it is permitted and it is exposed." 동사는 expose, 형용사는 exposed. 명사 exposure는 속성 이름(management.endpoints.web.exposure.include)에만 나온다.' },
  { ko: 'MVC(Model-View-Controller)', en: 'MVC (Model-View-Controller)', how: 'official',
    src: 'MDN Web Docs Glossary "MVC" ("MVC (Model-View-Controller) is a pattern in software design commonly used to implement user interfaces, data, and controlling logic.") — https://developer.mozilla.org/en-US/docs/Glossary/MVC ; Spring Framework Reference, Web MVC > DispatcherServlet ("Spring MVC, as many other web frameworks, is designed around the front controller pattern…") — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html',
    note: 'MDN: Model "Manages data and business logic", View "Handles layout and display", Controller "Routes commands to the model and view parts".' },
];
