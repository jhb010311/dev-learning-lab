# 용어 조사 중에 나온, 한국어 원문을 다시 볼 곳 (내가 확인하고 고칠 것)

## DB (db 용어표 보고)
- 레플리케이션(복제): 설명이 원본을 primary라 적음. MySQL 8.4 용어는 source / replica.
- 카디널리티와 선택도: 선택도를 정의하지 않음. MySQL Glossary: selectivity = cardinality / 행 수.
- 외래 키의 참조 동작: "아무것도 적지 않으면 RESTRICT와 같이 동작" → 기본값은 NO ACTION이고 InnoDB에서 RESTRICT와 같음.
- RANGE/HASH 파티션: "파티션 키" ↔ MySQL은 partitioning expression / partitioning function / (partitioning key 미확인).
- 컬럼 별칭: "GROUP BY에서 별칭 허용은 표준에 없는 확장"은 HAVING만 문서에서 확인.
- 용어 선택 검토: 연결 테이블(associative / junction / join table), 교착 희생(victim), 구동 테이블(driving table은 Oracle 용어).

## Spring 실습 보고에서
- 108_binding.js assume의 낡은 문장은 고침.
- tools/AUTHORING_ENV.md에 "없는 것: Bean Validation…" 옛 문구(이 파일은 쓰이는지 확인).

## Spring (spring 용어표 보고)
- @ModelAttribute와 @RequestBody: "객체를 먼저 만든 뒤 setter" → 문서는 생성자 바인딩과 프로퍼티 바인딩 둘 다, path variable과 헤더도 묶음. (좁음)
- 콘텐츠 협상(Accept와 Content-Type): RFC 9110 12장의 content negotiation은 응답 표현 고르기. 요청 Content-Type/415는 별개.
- 웹 서버와 WAS: 영어에서는 톰캣을 servlet container라 부름. WAS는 영어 일반 용어 아님.
- 액추에이터 엔드포인트의 노출과 접근: 접근이 기본으로 막힌 것은 shutdown과 heapdump (문서). kb는 shutdown만 적음 → 확인 후 고칠 것.
- 표기 맞출 것: HTTP 메서드(HTTP methods vs request method), OSIV 줄임말 미확인.

## 보안·아키텍처 (sec, arch 용어표 보고)
- X-Frame-Options와 frame-ancestors: "두 가지 응답 헤더" → frame-ancestors는 Content-Security-Policy 헤더의 directive.
- bcrypt: OWASP는 Argon2id 우선, bcrypt는 legacy에서. cost = work factor. (틀린 곳 없음, 참고)
- 부하 테스트: "한계까지"는 stress test. APM: 도구라기보다 활동.
- arch.js에 '헬스 체크(Liveness, Readiness)'가 있음(list_terms는 이제 spring으로 분류). 대조표는 파일과 무관하게 ko로 찾으므로 그대로 둠.
- spring.js는 79개(검증·액추에이터 용어 포함)라고 보고. 테스트 실습의 새 용어는 빠져 있음 → 따로 추가.

## JPA (jpa 용어표 보고)
- @Enumerated: "기본값은 ORDINAL" — 3.2는 EnumeratedValue가 있으면 예외(작음).
- 연관관계의 주인과 mappedBy: "보통 '다' 쪽" → 명세 2.11은 양방향 일대다/다대일에서 many side가 owning side여야 한다(must).
- save()와 merge: "@Version이 null인지로 판단" → non-primitive 타입일 때만.
- 병합(merge): "준영속 객체" → merge는 new 엔티티도 대상(new or detached).
- eager loading이라는 말은 문서에서 못 봄 → 영어판은 eager fetching.
- jpa.js 일부 근거는 GitHub의 Hibernate 6.6 .adoc 원본(렌더링 페이지가 잘려서). 핵심어는 렌더링된 입문서에서도 확인됐다고 보고.

## 네트워크 (network 용어표 보고)
- 느린 시작과 혼잡 회피: "타임아웃이면 처음 크기로" → RFC 5681 §3.1: cwnd는 loss window(1 세그먼트). IW와 다를 수 있음. (실습 149_congestion.js의 모형도 확인)
- 재귀 리졸버와 권한 있는 네임 서버: "다음에 물어볼 서버를 알려 주는 것을 위임" → RFC 9499: 그 응답은 referral, delegation은 부모 존에 NS를 두는 일.
- 캐시 키: "CDN은 기본으로 쿼리 문자열까지" → CloudFront 기본 캐시 키는 도메인 + 경로. CDN마다 다름.
- NAT: 설명 내용은 NAPT. TCP/IP 4계층: RFC 1122 근거를 밝힐 것.
- 용어 선택 검토: OSI model(근거 AWS) vs OSI Reference Model(RFC 1983) / TCP/IP model(AWS는 5계층) / PRG 약어 미확인.

## Java 뒤 절반 (java_b 용어표 보고)
- 뚜렷한 오류 없음.
- start()와 run(): "run()을 직접 부르면 부른 스레드가 실행" — 플랫폼 스레드만. 가상 스레드에서는 아무 일도 안 함(SE 21 문서). 한 줄 보탤지 검토.
- 값에 의한 전달: "call by value"는 공식 자료 미확인.
- DI: 스프링 문서는 constructor-based, setter-based 두 가지만 듦(필드 주입은 용어로 없음).
- 번역 주의: annotation interface(SE 21), enum class, throws clause, static initializer, constant variable.
- 전략 패턴: unverified(GoF 원전 미열람). InformIT 차례의 장 제목 "Strategy"는 봤다고 함 → 'Strategy pattern'으로 내가 정리.
- 표기 통일: java_b 안에서 명세 말/튜토리얼 말을 고른 기준이 섞임(compile-time constant vs static initializer).

## Java 앞 절반 (java_a 용어표 보고)
- 사소한 표현 차이뿐.
- 클래스 로더: 로딩·링킹·초기화를 모두 클래스 로더가 하는 것처럼 읽힘 → JVMS 5.3: 클래스 로더는 바이너리 표현을 찾고, 생성·링킹·초기화는 JVM.
- JIT 컴파일러: "한 줄씩 해석" → 바이트코드를 하나씩 실행(소스 줄 단위 아님).
- 원자성과 CAS: 자바 API의 말은 compareAndSet(compare-and-set).
- 다형성: "동적 바인딩" ↔ 튜토리얼은 virtual method invocation.
- 경쟁 상태: 번역 때 race condition과 data race를 섞지 말 것.
- String Pool: unverified. Javadoc의 말은 "A pool of strings" / interned. 내가 정리(짧은 꼴 String pool + note).
- 목록 밖 근거: SOLID(Robert C. Martin 블로그), Amortized analysis(MIT OCW 제목), big-O(NIST DADS), critical section(Oracle Solaris 가이드).

## 기초 낱말·나머지 (gloss, none 용어표 보고)
- 세션 쿠키: "브라우저를 닫으면 지워집니다" — 세션 복원 기능이 있으면 남을 수 있음(MDN).
- 쿼리: MySQL Glossary의 query는 읽기만. 쓰기까지면 SQL statement. (번역 때 주의)
- 큐: FIFO가 보통이지만 반드시는 아님(사소).
- LTS: "8, 11, 17, 21, 25" 중 8, 11은 미확인. LTS는 벤더의 지원 개념.
- 내장 서버: 지금 Spring Boot 문서는 Tomcat과 Jetty만 적음(Undertow?) → 설명집 '내장 서버' 확인.
- 근거 약함: Builder pattern, Layered architecture(Microsoft Learn), Clean Architecture(Robert C. Martin 블로그), SQL mapper(GitHub README).
- 번역 때 확인: 하이퍼스레딩/논리 코어, header field / content(RFC 9110), tenuring, rollback(배포).

## kb1~3 영어 번역 보고
- 메서드 영역과 Metaspace: "Java 8에서 static 변수와 문자열 풀이 힙으로" → JDK 7에서 이미 옮겨졌다는 지적(확인 필요: JEP 122, JDK 7 릴리스 노트).
- 힙과 우선순위 큐: "항상 작거나 큰" → 작거나 같은/크거나 같은.
- JIT: "한 줄씩" → 바이트코드 명령 단위. (영어 kb2도 one line at a time으로 옮겨짐 → 함께 고칠 것)
- 영어 쪽 확인 안 된 표현: defensive copying(Effective Java), young GC(공식은 young collection), shallowly immutable(Record API 문서 기억).
- 동적 바인딩 → dynamic method lookup(JLS 15.12.4.4)으로 옮김.

## 번역 묶음 보고에서 (아직 안 고친 것)
- chkex(91) 148줄, 그림 주석 191줄, 처음 설명: "언체크 예외"를 RuntimeException 계열로만 쓰고 Error를 따로 둠. JLS 11.1.1: unchecked = run-time exception classes + error classes. 한국어·영어 함께 고칠 것.
- poly: "(정적 바인딩)"이 오버로딩에 붙어 있음(JLS의 static binding은 필드 접근 예제 제목뿐).
- kb_casting: "넓은 타입으로(… long에서 double)"는 값을 잃지 않는 것처럼 읽힘(JLS 5.1.2: loss of precision 가능).
- kb/en/kb1.js Interface 항목의 "instance field" → instance variable로 통일 검토.
- 업캐스팅 = implicit casting(튜토리얼) vs upcasting(책): 사용자에게 알림.
- sqh(41) 50줄: 우선순위 큐에 첫 값을 넣을 때도 "부모보다 작지 않아 그 자리에 머뭅니다"가 나옴(첫 값은 부모가 없음).
- sorting(96) assume 122줄: "원소가 더 많으면 다른 순서가 되거나 IllegalArgumentException" — 문서에는 IllegalArgumentException(optional)만 확인됨.
- kb_setmap TreeSet null: Comparator가 null을 허용하지 않을 때도 NPE.
- 영어 용어 풀이: 'method'가 "payment method"에, 'type'이 코드 변수 이름에 걸림(전체 번역 뒤 정리).
- quiz1.js list 초급 문제 해설: 'LinkedList는 앞에서부터 따라가야 해서 O(n)' → 앞이나 뒤 중 가까운 쪽에서 출발(결론 O(n)은 맞음).
- blocking(34): 모두 끝난 뒤 스레드 상태가 글자 화면(59줄) "쉬는 중", 그림(75줄) "대기"로 다름. 38줄: 요청 수가 스레드 수보다 적어도 "스레드 N개가 요청을 하나씩 맡습니다".
- process(69): 스레드 1개 + 예외일 때 그림은 counter "사라짐", 결과 표는 "1"로 어긋남. 41줄 삼항식 양쪽이 같은 값. 요약 "다른 스레드가 남아 있는 한" → 데몬이 아닌 스레드. 
- deadlock(21) 66줄 주석 "네 귀퉁이"(실제는 마름모 배치). thread(99) 그림의 "run() 끝" 글자가 세로 화살표에 겹침.
- race: 영어판에서 CAS 표기 유지(대조표 note는 compare-and-set). "lost update", "take a thread dump" 공식 문장 미확인.
- scope(104): st.result = '기동 성공'이 마지막 push 뒤에 있어 스냅숏에 안 들어감 → 마지막 단계의 "상태" 칸이 "요청 2 응답 완료"로 끝나고 r2 상자의 good 색이 안 쓰임. (모형 수정 필요: 한국어·영어 같이)
- di(11): "세터가 null인 상태" 표현(세터 자체는 null일 수 없음).
- 영어 표기 통일: injection style(실습) vs injection method(kb/en/kb3.js).
- txprop(04) 그림: 처음 설정을 본 뒤 예시로 REQUIRES_NEW나 NESTED로 바꾸면 "로그" 상자가 나중에 생긴 B 상자·세이브포인트 상자에 가려 안 보임(틀이 만든 순서대로 쌓음). 한국어판에서 확인하고 고칠 것.
- mvc 문제: "모든 요청을 가장 먼저 받아"(필터가 먼저 받음. 느슨한 표현).
- 영어 표기 통일 검토: autocommit(MySQL) vs auto-commit(JDBC), Stage(lifecycle) vs step, 다른 실습을 가리키는 이름("Isolation levels" ← iso 번역 때 nav를 이 이름으로).
- check_en의 뼈대 검사: 문자열 안의 // 를 주석으로 잘못 자름(aop 32줄). 주의일 뿐이라 그대로 둠.
- autoconf(57): spring-boot-starter-web을 씀. Boot 4에서는 spring-boot-starter-webmvc(이 PC의 libs에도 webmvc만 있음). 실습이 버전을 말하지 않음(doc 수준). 클래스 이름 DataSourceAutoConfiguration, JacksonAutoConfiguration, HibernateJpaAutoConfiguration은 4.1.1 jar에 있음(패키지는 모듈별로 옮겨짐) — 확인함.
- security(30): 한국어판에 id 'security'인 문제가 하나도 없음(401/403 문제는 httpmsg에 있음) → 문제를 몇 개 써야 함.
- cacheabs(114): evict + 상품 없음 + unless 켬 조합에서 evict 단계는 "지울 것이 없습니다", 다음 조회 단계는 "방금 @CacheEvict가 지웠습니다"로 어긋남(모형 문장 수정 필요). assume: "ConcurrentMapCacheManager는 가장 단순한 캐시" → 캐시 매니저.
- 다른 실습을 가리키는 영어 이름(임시): "Retries and idempotency"(idem), "Caching and TTL"(cache), "Isolation levels"(iso) → 그 실습을 옮길 때 nav를 이 이름으로 맞출 것.
- 영어 다듬기: lazyproxy 요약 'Queries on the member table: 1 (When getName is called).'의 대문자 When(표 값을 문장에 끼워 넣어 생김). 전체 번역 뒤 이런 꼴을 모아 손봄.
- gaplock(60): 한국어판에 문제가 없음 → 문제를 써야 함(security와 함께).
- undoredo(61): "체크포인트"를 "메모리의 바뀐 데이터를 데이터 파일에 옮겨 쓰는 일"로 씀. MySQL Glossary의 checkpoint는 "데이터 파일에 쓰인 최신 변경을 가리키는 기록". 표현 확인. 영어 "committed note"(커밋 표시)는 어색 → 'a record that the transaction committed' 꼴로 다듬기.
- iso(20): 결과 표의 이상 현상 이름이 'Dirty Read'(대문자 R, 한글 없는 값이라 그대로) ↔ 대조표는 Dirty read. 한국어·영어 같이 소문자로 맞출지 검토.
- 정규화: update/insertion/deletion anomaly는 공식 문서 미확인(교과서 용어).
- paging(32) assume: "OFFSET이 앞의 행을 읽고 버린다는 것은 MySQL과 PostgreSQL 공식 문서가 모두 설명" → PostgreSQL만 확인됨(queries-limit). MySQL 8.4 select/limit-optimization에는 그런 문장 없음. 표현 수정.
- paging 문제: 질문은 "OFFSET이 느린 이유"인데 해설은 키셋 방식을 설명(어긋남).
- btree: 한국어 "가지" = internal node(문서는 MySQL nonleaf node, PostgreSQL internal page). "B+tree"는 MySQL 문서에 없음.
- datajpa assume의 절 제목 'Entity State Detection Strategies' → 실제 문서는 'Entity State-detection Strategies'(한국어판 표기 수정).
- dtoquery: "N+1 문제"라 부르지만 추가 쿼리는 서로 다른 팀의 수만큼 나감(표현 확인).
- lost update: 공식 문서에서 문구 미확인(quiz_race.js에는 "(a lost update)"가 있음).
- httpver(54): 첫 예시 설명 "다섯 번 줄을 섭니다" ↔ 모형의 "줄 선 횟수"는 묶음 수 - 1 = 4. 마지막 묶음이 6개보다 적은데도 "연결 6개가 파일 cnt개를 하나씩 맡아". 삼항 두 갈래가 같은 값(total 계산).
- 다른 실습을 가리키는 영어 이름: cookie가 auth를 "Sessions and JWT"로 부름 → auth 영어 nav와 맞출 것.
- pct(43) 이벤트 5: p99를 "100건 중 가장 느린 1건이 겪는 시간"이라 함 → 가장 느린 1%의 경계값.
- trace(59) 그림: 영역 제목 "서비스마다 다른 번호가 찍힘" ↔ 실제 값은 모두 '-'.
- 영어 확인 안 된 말: nearest-rank method(pct), Horizontal Pod Autoscaler(공식 이름, 문서 미열람), k8s의 Dead.
