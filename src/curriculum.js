// 목차: 분야 → 묶음 → 항목.
//   { id: '실습 id', t: '목록에 보일 이름(없으면 실습의 이름)' }   이미 실습이 있는 항목
//   { t: '주제 이름', d: '한 줄 설명' }                           아직 실습이 없는 항목 (화면에 "준비 중"으로 보인다)
// 어떤 주제를 어떤 순서로 둘지는 refs에 적은 책과 자료의 차례를 참고해 정했다(주제 이름만 참고했고 내용을 옮기지 않았다).
// 같은 실습을 여러 분야에 둘 수 있다. 실습 화면의 "앞·다음 실습"은 들어온 분야의 순서를 따른다.
Lab.site({
  name: '개발 학습 실습실',
  desc: '자바, 스프링, JPA, 데이터베이스, 네트워크, 보안의 개념을 설정을 바꿔 실행해 보며 익히는 무료 실습실',
  feedback: 'https://github.com/jhb010311/dev-learning-lab/issues',
  // 처음 화면의 "처음이라면"에 보일 실습: 배경 지식이 적어도 따라갈 수 있는 것
  start: ['journey', 'stack', 'eq'],
});
Lab.curriculum([
  { id: 'java', name: 'Java', desc: '문법부터 객체 지향, 컬렉션, 스레드, JVM까지. 코드가 실행될 때 안에서 무슨 일이 일어나는지를 봅니다.',
    refs: ['자바의 정석 3판(남궁성)', '이펙티브 자바 3판(조슈아 블로크)', '모던 자바 인 액션', 'JVM 밑바닥까지 파헤치기(저우즈밍)'],
    groups: [
      { name: '기본 문법', items: [
        { id: 'vars' },
        { id: 'casting' },
        { id: 'loops' },
        { id: 'array' },
      ] },
      { name: '클래스와 객체', items: [
        { id: 'ctor' },
        { id: 'static' },
        { id: 'inherit' },
        { id: 'poly' }, { id: 'absint' },
        { id: 'access' },
        { id: 'inner' },
        { id: 'immut' }, { id: 'strategy' },
      ] },
      { name: '자주 쓰는 클래스', items: [
        { id: 'eq' },
        { id: 'eqhash' },
        { id: 'strbuild' },
        { id: 'datetime' },
        { id: 'optional' },
      ] },
      { name: '예외', items: [
        { id: 'exflow' },
        { id: 'chkex' },
      ] },
      { name: '제네릭, 열거형, 애너테이션', items: [
        { id: 'generic' },
        { id: 'enumtype' },
        { id: 'annot' },
      ] },
      { name: '컬렉션', items: [
        { id: 'list' }, { id: 'hashmap' },
        { id: 'setmap' },
        { id: 'sqh' }, { id: 'cme' },
        { id: 'sorting' },
      ] },
      { name: '람다와 스트림', items: [
        { id: 'lambda' },
        { id: 'stream' },
        { id: 'collect' },
        { id: 'parstream' },
      ] },
      { name: '스레드와 동시성', items: [
        { id: 'process' },
        { id: 'thread' },
        { id: 'race' }, { id: 'deadlock' }, { id: 'threadpool' }, { id: 'ctx' }, { id: 'parallel' }, { id: 'blocking' },
      ] },
      { name: 'JVM', items: [
        { id: 'stack' }, { id: 'gc' }, { id: 'jit' },
        { id: 'classload' },
      ] },
      { name: '입출력', items: [
        { id: 'iobuf' },
        { id: 'serial' },
      ] },
    ] },
  { id: 'spring', name: 'Spring', desc: '컨테이너와 의존성 주입, AOP와 트랜잭션, 웹 요청이 처리되는 길, 스프링 부트가 대신 해 주는 일을 봅니다.',
    refs: ['토비의 스프링 3.1(이일민)', '스프링 부트 핵심 가이드(장정우)', '김영한의 스프링 로드맵(강의 차례)'],
    groups: [
      { name: 'IoC 컨테이너와 DI', items: [
        { t: '스프링 컨테이너와 빈', d: '객체를 직접 만들지 않고 컨테이너에 맡긴다는 것' },
        { id: 'di' }, { id: 'singleton' },
        { t: '빈 스코프', d: '싱글톤, 프로토타입, 요청 스코프의 차이' },
        { t: '빈 생명주기 콜백', d: '초기화와 소멸 시점에 끼어들기' },
      ] },
      { name: 'AOP와 프록시', items: [
        { id: 'proxy' },
        { t: 'AOP: 어드바이스와 포인트컷', d: '어떤 메서드에 무엇을 끼워 넣을지 정하기, 적용 순서' },
      ] },
      { name: '데이터 접근과 트랜잭션', items: [
        { id: 'tx' }, { id: 'txprop' },
        { t: 'JdbcTemplate과 예외 변환', d: '반복되는 JDBC 코드와 DB 예외를 스프링이 정리하는 방식' },
        { id: 'connpool' },
      ] },
      { name: '웹 MVC', items: [
        { id: 'servlet' }, { id: 'mvc' },
        { t: '요청 매핑과 파라미터 바인딩', d: 'URL과 메서드, 요청 값이 메서드 파라미터가 되는 과정' },
        { t: '검증', d: '입력값 검증과 오류 응답' },
        { t: 'REST API와 메시지 컨버터', d: '객체가 JSON이 되고 JSON이 객체가 되는 자리' },
      ] },
      { name: '스프링 부트', items: [
        { id: 'autoconf' }, { id: 'config' },
        { t: '액추에이터와 헬스 체크', d: '애플리케이션의 상태를 밖에서 들여다보기' },
      ] },
      { name: '그 밖의 기능', items: [
        { t: '테스트', d: '단위 테스트와 스프링 컨텍스트를 띄우는 테스트' },
        { t: '외부 API 호출과 타임아웃', d: 'RestClient, 연결·읽기 타임아웃, 재시도' },
        { t: '캐시 추상화', d: '@Cacheable이 메서드 호출을 건너뛰는 방식' },
        { id: 'security' },
      ] },
    ] },
  { id: 'jpa', name: 'JPA', desc: '객체를 테이블에 저장한다는 것이 무엇인지, 영속성 컨텍스트와 연관관계, 지연 로딩, 쿼리가 언제 몇 번 나가는지를 봅니다.',
    refs: ['자바 ORM 표준 JPA 프로그래밍(김영한)', '김영한의 JPA 로드맵(강의 차례)', 'Hibernate ORM 사용자 가이드'],
    groups: [
      { name: '시작', items: [
        { t: 'JPA가 푸는 문제', d: '객체와 테이블의 모양이 달라서 생기는 일' },
      ] },
      { name: '영속성 관리', items: [
        { id: 'pc' },
        { t: '엔티티의 생명주기', d: '비영속, 영속, 준영속, 삭제 상태' },
        { t: '준영속과 병합', d: '변경 감지가 되지 않는 객체와 merge' },
      ] },
      { name: '엔티티 매핑', items: [
        { t: '엔티티 매핑과 기본 키', d: '컬럼 매핑, 기본 키 생성 전략, 스키마 자동 생성' },
        { t: '값 타입과 임베디드 타입', d: '식별자가 없는 값 객체를 테이블에 담기' },
      ] },
      { name: '연관관계', items: [
        { t: '연관관계의 주인', d: '단방향과 양방향, 외래 키를 누가 관리하는가' },
        { t: '다대일, 일대다, 일대일, 다대다', d: '관계의 종류에 따라 테이블이 달라지는 모습' },
        { t: '상속 관계 매핑', d: '조인 전략, 단일 테이블 전략' },
        { t: '영속성 전이와 고아 객체', d: 'cascade와 orphanRemoval' },
      ] },
      { name: '프록시와 로딩', items: [
        { t: '프록시와 지연 로딩', d: '진짜 객체 대신 들어오는 가짜 객체와 초기화 시점' },
        { id: 'nplus1' },
      ] },
      { name: '쿼리', items: [
        { t: 'JPQL과 페치 조인', d: '엔티티를 대상으로 하는 쿼리, 컬렉션 페치 조인의 한계' },
        { t: '벌크 연산', d: '영속성 컨텍스트를 거치지 않는 UPDATE와 DELETE' },
        { t: '스프링 데이터 JPA', d: '메서드 이름으로 만들어지는 쿼리, 페이징' },
        { t: '동적 쿼리와 Querydsl', d: '조건에 따라 달라지는 쿼리를 코드로 조립하기' },
      ] },
      { name: '웹 애플리케이션과 성능', items: [
        { id: 'connpool' },
        { id: 'stock', t: '낙관적 락과 비관적 락' },
        { t: 'DTO로 바로 조회하기', d: '엔티티 대신 필요한 값만 가져오기' },
      ] },
    ] },
  { id: 'db', name: 'DB', desc: '테이블 설계와 SQL, 인덱스와 실행 계획, 트랜잭션과 잠금, 복제와 분산까지. 데이터가 저장되고 조회되는 과정을 봅니다.',
    refs: ['Real MySQL 8.0(백은빈, 이성욱)', 'SQL 레벨업(미크)', '데이터베이스 개론(김연희)', '데이터 중심 애플리케이션 설계(마틴 클레프만)'],
    groups: [
      { name: '관계형 모델과 설계', items: [
        { t: '테이블, 키, 제약 조건', d: '기본 키, 외래 키, 유니크, NOT NULL이 막아 주는 것' },
        { t: 'ER 모델링', d: '개체와 관계를 테이블로 옮기기' },
        { id: 'normal' },
      ] },
      { name: 'SQL', items: [
        { t: 'SELECT가 처리되는 순서', d: 'FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY' },
        { id: 'join' },
        { t: '서브쿼리', d: '쿼리 안의 쿼리, 상관 서브쿼리가 느린 이유' },
        { t: '윈도우 함수', d: '행을 줄이지 않고 순위와 누계 구하기' },
        { id: 'paging' },
        { t: '뷰, 프로시저, 트리거', d: 'DB 안에 저장해 두는 쿼리와 로직' },
      ] },
      { name: '인덱스와 실행 계획', items: [
        { id: 'btree' }, { id: 'index' }, { id: 'compidx' },
        { t: '실행 계획 읽기', d: 'EXPLAIN의 type, key, rows, Extra' },
        { t: '조인 알고리즘', d: '중첩 루프 조인과 해시 조인' },
      ] },
      { name: '트랜잭션과 잠금', items: [
        { id: 'tx' }, { id: 'iso' }, { id: 'gaplock' }, { id: 'stock' },
        { t: 'DB의 교착 상태', d: '두 트랜잭션이 서로의 락을 기다릴 때 DB가 하는 일' },
      ] },
      { name: '저장과 복구', items: [
        { id: 'undoredo' },
        { t: '버퍼 풀과 페이지', d: '디스크의 데이터가 메모리에 올라오는 단위' },
      ] },
      { name: '확장과 분산', items: [
        { id: 'replica' }, { id: 'shard' },
        { t: '파티셔닝', d: '한 테이블을 범위나 해시로 나누어 저장하기' },
        { id: 'redis', t: '키-값 저장소 Redis' },
        { t: 'NoSQL과 문서 모델', d: '관계형과 다른 저장 방식을 고르는 기준' },
      ] },
    ] },
  { id: 'network', name: '네트워크', desc: '주소를 입력한 뒤 응답이 오기까지. DNS, TCP, HTTP, TLS와 그 사이에 놓인 장비들을 봅니다.',
    refs: ['성공과 실패를 결정하는 1%의 네트워크 원리(Tsutomu Tone)', 'HTTP 완벽 가이드', '모두의 네트워크 기초(서지영)', 'Computer Networking: A Top-Down Approach(Kurose, Ross)'],
    groups: [
      { name: '큰 그림', items: [
        { id: 'journey' },
        { t: '계층 구조와 캡슐화', d: 'OSI 7계층과 TCP/IP 4계층, 데이터에 머리말이 붙는 과정' },
      ] },
      { name: '주소와 이름', items: [
        { t: 'URL의 구조', d: '스킴, 호스트, 포트, 경로, 쿼리' },
        { t: 'DNS', d: '도메인 이름이 IP 주소가 되기까지' },
        { t: 'IP 주소와 서브넷', d: '네트워크 부분과 호스트 부분, 사설 IP와 NAT' },
        { t: '스위치와 라우터', d: 'MAC 주소로 보내는 구간과 IP 주소로 보내는 구간' },
      ] },
      { name: '전송 계층', items: [
        { t: '소켓과 포트', d: '한 컴퓨터의 여러 프로그램을 구분하는 방법' },
        { id: 'tcp' },
        { t: 'TCP와 UDP', d: '순서와 도착을 보장하는 것과 하지 않는 것' },
        { t: '흐름 제어와 혼잡 제어', d: '받는 쪽과 네트워크의 사정에 맞춰 보내는 양 조절하기' },
      ] },
      { name: 'HTTP', items: [
        { id: 'httpmsg' }, { id: 'httpver' }, { id: 'cookie' }, { id: 'etag' }, { id: 'idem' },
        { t: '리다이렉션', d: '301, 302, 307, 308의 차이' },
        { t: '내용 협상과 압축', d: 'Accept 헤더, gzip, 인코딩' },
        { id: 'cors' }, { id: 'realtime' },
      ] },
      { name: '보안 연결', items: [ { id: 'tls' } ] },
      { name: '웹 서버 앞의 장비', items: [
        { id: 'scale' },
        { t: '프록시와 리버스 프록시', d: '클라이언트 쪽 대리와 서버 쪽 대리' },
        { t: 'CDN', d: '사용자 가까이에 복사본을 두는 방식' },
      ] },
    ] },
  { id: 'sec', name: '보안', desc: '누구인지 확인하는 인증, 무엇을 할 수 있는지 정하는 인가, 웹 공격과 방어, 암호 기술을 봅니다.',
    refs: ['OWASP Top 10:2025', '스프링 시큐리티 인 액션(로렌티우 스필카)', '웹 개발자를 위한 웹 보안(말콤 맥도널드)', 'RFC 6749(OAuth 2.0)', 'RFC 7519(JWT)'],
    groups: [
      { name: '인증', items: [
        { id: 'auth' }, { id: 'cookie' }, { id: 'pwhash' },
        { t: 'JWT의 구조와 검증', d: '헤더, 클레임, 서명과 만료 확인' },
        { id: 'oauth' },
        { t: '세션 하이재킹과 세션 고정', d: '남의 세션을 훔치거나 미리 심어 두는 공격' },
      ] },
      { name: '인가', items: [
        { id: 'security' },
        { t: '접근 제어', d: '역할과 권한, 남의 자원을 id만 바꿔 조회하는 문제' },
        { t: '메서드 보안', d: '@PreAuthorize로 메서드 단위에서 막기' },
      ] },
      { name: '웹 공격과 방어', items: [
        { id: 'webattack' }, { id: 'cors' },
        { t: '클릭재킹과 오픈 리다이렉트', d: '보이지 않는 화면 겹치기와 믿을 수 없는 이동' },
        { t: '정보 누출', d: '오류 메시지와 응답에 담기면 안 되는 것' },
        { id: 'ratelimit' },
        { t: '의존성과 공급망', d: '가져다 쓰는 라이브러리가 취약할 때' },
      ] },
      { name: '암호 기술', items: [ { id: 'crypto' }, { id: 'tls' } ] },
    ] },
  { id: 'arch', name: '아키텍처와 운영', extra: true, desc: '트래픽이 늘 때, 서비스를 나눌 때, 배포하고 지켜볼 때의 주제입니다.',
    groups: [
      { name: '대용량 트래픽', items: [ { id: 'scale' }, { id: 'cache' }, { id: 'redis' }, { id: 'ratelimit' } ] },
      { name: '메시지와 비동기', items: [ { id: 'mq' }, { id: 'kafka' } ] },
      { name: '서비스 분리', items: [ { id: 'circuit' }, { id: 'saga' }, { id: 'gateway' } ] },
      { name: '배포와 운영', items: [ { id: 'cicd' }, { id: 'deploy' }, { id: 'container' }, { id: 'k8s' } ] },
      { name: '관측', items: [ { id: 'pct' }, { id: 'trace' } ] },
      { name: '협업', items: [ { id: 'git' } ] },
    ] },
]);
