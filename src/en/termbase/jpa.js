// JPA 용어의 영어 대조표. ko는 설명집의 용어 이름과 글자 하나까지 같아야 한다.
// 확인한 날: 2026-10-10. src의 주소는 모두 이 작업 중에 실제로 연 페이지다.
// 줄임: [명세] = Jakarta Persistence 3.2 명세 https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2.html
//       [API]  = Jakarta Persistence 3.2 API 문서 https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/<이름>.html
//       [H-입문] = Hibernate ORM 6.6 입문 안내서(Introduction to Hibernate) https://docs.hibernate.org/orm/6.6/introduction/html_single/Hibernate_Introduction.html
//       [H-가이드] = Hibernate ORM 6.6 User Guide https://docs.hibernate.org/orm/6.6/userguide/html_single/Hibernate_User_Guide.html
//         (이 한 장짜리 페이지는 3.14절까지만 읽혔다. 그 뒤의 Flushing, Persistence Context 장은 같은 문서의 원본인
//          https://raw.githubusercontent.com/hibernate/hibernate-orm/6.6/documentation/src/main/asciidoc/userguide/chapters/ 아래 .adoc 파일로 읽었다.)
// 절 번호는 페이지에서 본 것만 적었다.
module.exports = [
  { ko: 'SQL Injection', en: 'SQL injection', how: 'official',
    src: 'OWASP Community, "SQL Injection" — https://community.owasp.org/attacks/SQL_Injection (owasp.org/www-community/attacks/SQL_Injection에서 넘어감) ; MySQL 8.4 Reference Manual Glossary, "prepared statement" 항목 — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['SQL injection attack'],
    note: 'OWASP 제목은 "SQL Injection", 본문은 소문자 "A SQL injection attack consists of insertion or “injection” of a SQL query via the input data from the client ...". SQLi는 본문에는 없고 참고 자료 제목에만 있어 쓰지 않는다. 막는 방법은 OWASP 본문이 "parameterized SQL statements", MySQL Glossary가 prepared statement("protecting against some kinds of SQL injection attacks").' },

  { ko: 'ORM', en: 'ORM', how: 'official',
    src: '[H-입문] 머리 부분 ; [H-가이드] Preface ; Jakarta Persistence 3.2 소개 페이지 — https://jakarta.ee/specifications/persistence/3.2/',
    also: ['object/relational mapping'],
    note: '풀어 쓸 때는 빗금을 넣는다. Hibernate: "The goal of object/relational mapping (ORM) is to eliminate fragile and untypesafe code", "The term Object/Relational Mapping refers to the technique of mapping data ...". Jakarta: "Jakarta Persistence defines a standard for management of persistence and object/relational mapping in Java(R) environments." 하이픈 표기 object-relational mapping은 연 페이지에서 보지 못했다.' },

  { ko: 'JPA, Hibernate, Spring Data JPA', en: 'JPA, Hibernate, Spring Data JPA', how: 'composed',
    src: 'Spring Data JPA Reference, 첫 페이지 — https://docs.spring.io/spring-data/jpa/reference/index.html ; [H-입문] 머리 부분 ; Jakarta Persistence 3.2 소개 페이지 — https://jakarta.ee/specifications/persistence/3.2/',
    also: ['Jakarta Persistence', 'Jakarta Persistence API', 'Hibernate ORM'],
    note: '명세의 지금 이름은 Jakarta Persistence이고 명세 페이지는 JPA라는 줄임말을 쓰지 않는다. JPA는 Spring과 Hibernate 문서가 쓴다: "Spring Data JPA provides repository support for the Jakarta Persistence API (JPA).", "Hibernate was the inspiration behind the Java (now Jakarta) Persistence API, or JPA". 영어판 본문에서 처음 나올 때 "JPA (Jakarta Persistence)"로 한 번 풀어 주면 명세를 찾아보는 독자와 어긋나지 않는다.' },

  { ko: '엔티티', en: 'Entity', how: 'official',
    src: '[명세] 2. Entities ; [H-입문] 앞부분(엔티티 소개)',
    also: ['entity class', 'entity instance'],
    note: '명세: "An entity is a lightweight persistent domain object." Hibernate: "An entity is a Java class which represents data in a relational database table." 클래스를 가리킬 때는 entity class, 객체를 가리킬 때는 entity instance로 갈라 쓴다(명세 3.3 "A managed entity instance is ...").' },

  { ko: '1차 캐시', en: 'First-level cache', how: 'official',
    src: '[H-입문] 5.1. Persistence Contexts, 7.12, 7.14 ; [H-가이드] 2.1. Overview ; Hibernate User Guide 원본 pc/PersistenceContext.adoc',
    also: ['first level cache'],
    note: 'Hibernate의 말이며 명세에는 없다(명세는 persistence context만 쓴다). [H-입문]: persistence context를 두고 "we sometimes call it the "first-level cache"", "doesn’t have a first-level cache (persistence context)". User Guide 2.1은 하이픈 없이 "persistence context (first level cache)". 영어 문서에서는 1차 캐시와 영속성 컨텍스트를 같은 것의 두 이름으로 다루므로, 본문에서 둘을 서로 다른 저장소처럼 옮기지 않는다.' },

  { ko: '변경 감지(Dirty Checking)', en: 'Dirty checking', how: 'official',
    src: '[H-입문] 5.1. Persistence Contexts, 7.14 ; [H-가이드] 3장(3.2.6–3.3.8 사이, "Hibernate’s dirty checking mechanism is going to propagate the change to the database:") ; Hibernate User Guide 원본 flushing/Flushing.adoc',
    also: ['automatic dirty checking', 'dirty checking mechanism'],
    note: 'Flushing 장: "The dirty checking mechanism is responsible for determining if a managed entity has been modified since it was first loaded." [H-입문]은 "automatic dirty checking". 명세에는 이 이름이 없다(명세는 "The state of persistent entities is synchronized to the database at transaction commit."처럼 동작만 적는다).' },

  { ko: '쓰기 지연과 flush', en: 'Transactional write-behind and flush', how: 'composed',
    src: 'Hibernate User Guide 원본 flushing/Flushing.adoc — https://raw.githubusercontent.com/hibernate/hibernate-orm/6.6/documentation/src/main/asciidoc/userguide/chapters/flushing/Flushing.adoc ; [H-입문] 5.8. Flushing the session, 7.14. Stateless sessions ; [명세] 3.3.4. Synchronization to the Database ; [API] EntityManager',
    also: ['write-behind', 'flushing', 'flush operation'],
    note: '"쓰기 지연"을 직역한 write delay, delayed write, lazy write는 문서에 없다. Hibernate의 말은 transactional write-behind: "The persistence context acts as a transactional write-behind cache, queuing any entity state change.", "doesn’t implement transactional write-behind or automatic dirty checking". flush는 명세와 Hibernate가 같이 쓴다: "The flush method can be used by the application to force synchronization."(명세 3.3.4), "Flushing is the process of synchronizing the state of the persistence context with the underlying database.", EntityManager.flush() "Synchronize changes held in the persistence context to the underlying database."' },

  { ko: '지연 로딩과 즉시 로딩', en: 'Lazy fetching and eager fetching', how: 'composed',
    src: '[H-입문] 5.6. Proxies and lazy fetching, 5.7. Entity graphs and eager fetching ; [명세] 3.3.7.2, 4.4.5.3. Fetch Joins ; [API] FetchType, OneToMany',
    also: ['lazy loading', 'FetchType.LAZY', 'FetchType.EAGER'],
    note: '고르기 어려웠던 용어. 문서들은 fetch를 기본으로 쓴다: FetchType "Defines strategies for fetching data from the database.", LAZY "Data may be lazily fetched.", EAGER "Data must be eagerly fetched."; [H-입문] "Hibernate solves this problem using proxies and lazy fetching.", "you must explicitly specify eager fetching for associations"; 명세 4.4.5.3 "A FETCH JOIN clause in a query results in eager fetching of an association or element collection ...". lazy loading도 공식 문서에 있다(명세 3.3.7.2 "the application must not use lazy loading", User Guide 3.2.1 "Hibernate supports lazy loading of basic values"). 반면 eager loading은 이번에 연 명세·Hibernate 문서 어디에서도 보지 못해 쓰지 않는다. 명세에서 LAZY는 요구가 아니라 힌트다("The LAZY strategy is a hint to the persistence provider runtime").' },

  { ko: 'N+1 문제', en: 'N+1 selects problem', how: 'official',
    src: '[H-입문] 5.6. Proxies and lazy fetching, 7.3. Association fetching, 7.4. Batch fetching and subselect fetching ; [H-가이드] 3장(3.7.12–3.9.11 사이)',
    also: ['N+1 selects', 'N+1 query issues'],
    note: 'Hibernate 문서의 이름은 selects를 넣은 "N+1 selects problem"이다: "It almost inevitably leads to the infamous N+1 selects problem", "resulting, by default, in the execution of N+1 select statements, where N is the number of Books". User Guide에는 "Because this can lead to N+1 query issues"도 있다. 명세에는 이 말이 없다.' },

  { ko: 'fetch join', en: 'Fetch join', how: 'official',
    src: '[명세] 4.4.5.3. Fetch Joins, 3.3.7 ; [H-입문] 5.6, 7.5. Join fetching',
    also: ['FETCH JOIN', 'join fetch', 'join fetching'],
    note: '명세: "A FETCH JOIN clause in a query results in eager fetching of an association or element collection as a side effect of execution of the query.", "The syntax for a fetch join is given by:". Hibernate 문서는 쿼리 문법(join fetch)의 순서대로 "join fetch", 절 제목 "Join fetching"을 쓴다("usually, using join fetch in HQL or an EntityGraph").' },

  { ko: '@EntityGraph', en: '@EntityGraph', how: 'official',
    src: 'Spring Data JPA Reference, "JPA Query Methods"의 "Configuring Fetch- and LoadGraphs" — https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html ; [명세] 3.8',
    also: ['entity graph'],
    note: '애너테이션 이름 그대로. Spring Data: "... support for specifying Fetch- and LoadGraphs that we also support with the @EntityGraph annotation, which lets you reference a @NamedEntityGraph definition." 개념 이름은 entity graph(명세 3.8: "An entity graph is a template that captures the path and boundaries for an operation or query.").' },

  { ko: '배치 페치(Batch Size)', en: 'Batch fetching (batch size)', how: 'official',
    src: 'Hibernate ORM 6.6 Javadoc, org.hibernate.annotations.BatchSize — https://docs.hibernate.org/orm/6.6/javadocs/org/hibernate/annotations/BatchSize.html ; [H-입문] 7.4. Batch fetching and subselect fetching',
    also: ['@BatchSize'],
    note: '"Specifies a maximum batch size for batch fetching of the annotated entity or collection." "When batch fetching is enabled, Hibernate is able to fetch multiple instances of an entity or collection in a single round trip to the database." JDBC의 문장 묶어 보내기(batching)와는 다른 것이므로 batch fetching으로 적는다. [H-입문]은 "While batch fetching might mitigate problems involving N+1 selects, it won’t solve them."이라고 적는다.' },

  { ko: 'JPQL', en: 'JPQL', how: 'official',
    src: '[명세] 4장(4.1, 4.4.5. Joins) ; Spring Data JPA Reference, "Projections" — https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html',
    also: ['Jakarta Persistence query language'],
    note: '명세의 정식 이름은 "Jakarta Persistence query language"(query language는 소문자)이고, 명세 안에서도 줄임말을 쓴다: "JPQL defines the following varieties of join:". Hibernate와 Spring 문서는 JPQL을 쓴다.' },

  { ko: '카테시안 곱', en: 'Cartesian product', how: 'official',
    src: 'MySQL 8.4 Reference Manual, 15.2.13.2 JOIN Clause — https://dev.mysql.com/doc/refman/8.4/en/join.html ; [명세] 4.4절 ; [H-입문] 5.6, 7.5. Join fetching',
    also: ['cartesian product'],
    note: 'MySQL: "both produce a Cartesian product between the specified tables (that is, each and every row in the first table is joined to each and every row in the second table)". 명세와 Hibernate 입문서는 소문자 cartesian으로 쓴다("In the absence of a join condition, this reduces to the cartesian product.", "Joining both collections in a single query would result in a cartesian product of tables, and a large SQL result set."). 사람 이름에서 온 말이라 영어판은 대문자 Cartesian으로 통일한다.' },

  { ko: '낙관적 락(@Version)', en: 'Optimistic locking (@Version)', how: 'official',
    src: '[명세] 3.5.1. Optimistic Locking, 3.5.2. Entity Versions and Optimistic Locking ; [API] Version ; [H-입문] 7.15. Optimistic and pessimistic locking',
    also: ['optimistic lock', 'optimistic lock failure'],
    note: '방식의 이름은 optimistic locking, 실패는 optimistic lock failure, 예외는 OptimisticLockException. Version: "Declares the version field or property of an entity class, which is used to detect optimistic lock failures, ensuring the integrity of optimistic transactions." 명세 3.12: "The OptimisticLockException is thrown by the persistence provider when an optimistic locking conflict occurs."' },

  { ko: '공유 락과 배타 락', en: 'Shared locks and exclusive locks', how: 'composed',
    src: 'MySQL 8.4 Reference Manual, 17.7.1 InnoDB Locking의 "Shared and Exclusive Locks" — https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html ; MySQL Glossary의 "shared lock", "exclusive lock" 항목 — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['shared lock', 'exclusive lock', 'shared (S) lock', 'exclusive (X) lock'],
    note: '"InnoDB implements standard row-level locking where there are two types of locks, shared (S) locks and exclusive (X) locks." Glossary: shared lock "A kind of lock that allows other transactions to read the locked object, and to also acquire other shared locks on it, but not to write to it."' },

  { ko: '비관적 락', en: 'Pessimistic locking', how: 'official',
    src: '[명세] 3.5.3. Pessimistic Locking ; [H-입문] 7.15. Optimistic and pessimistic locking ; MySQL Glossary의 "pessimistic", "locking read" 항목 — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['pessimistic lock'],
    note: '명세: "Pessimistic locking guarantees that once a transaction has obtained a pessimistic lock on an entity instance:". Hibernate: "database-level pessimistic locking using the SQL for update syntax (or equivalent)". MySQL Glossary에는 "pessimistic locking"이라는 항목은 없고 방법론으로서의 "pessimistic" 항목과, SELECT ... FOR UPDATE를 가리키는 "locking read" 항목이 있다("A SELECT statement that also performs a locking operation on an InnoDB table.").' },

  { ko: 'JOIN (INNER, OUTER)', en: 'JOIN (INNER, OUTER)', how: 'official',
    src: 'MySQL 8.4 Reference Manual, 15.2.13.2 JOIN Clause — https://dev.mysql.com/doc/refman/8.4/en/join.html ; MySQL Glossary의 "join" 항목 ; [명세] 4.4.5.1. Inner Joins, 4.4.5.2. Outer Joins',
    also: ['inner join', 'outer join', 'INNER JOIN', 'LEFT JOIN', 'LEFT OUTER JOIN'],
    note: 'SQL 키워드는 대문자 그대로, 풀어 쓸 때는 소문자 inner join, outer join. MySQL: "With an inner join, ...", "With an outer join (such as LEFT JOIN), one of the two columns can be NULL.", "If there is no matching row for the right table in the ON or USING part in a LEFT JOIN, a row with all columns set to NULL is used for the right table." MySQL에서는 JOIN, CROSS JOIN, INNER JOIN이 같은 뜻이다("syntactic equivalents").' },

  { ko: '기본 키, 유니크 키, 외래 키', en: 'Primary key, unique key, foreign key', how: 'composed',
    src: 'MySQL 8.4 Reference Manual Glossary의 "primary key", "unique key", "unique constraint", "foreign key", "FOREIGN KEY constraint" 항목 — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['unique constraint', 'unique index', 'FOREIGN KEY constraint'],
    note: 'primary key: "A set of columns—and by implication, the index based on this set of columns—that can uniquely identify every row in a table." unique key: "The set of columns (one or more) comprising a unique index." 한국어 설명이 말하는 "중복을 막는 제약"에 딱 맞는 Glossary 항목은 unique constraint("A kind of constraint that asserts that a column cannot contain any duplicate values.")이므로 본문에서는 unique constraint를 함께 쓴다. PK, FK라는 줄임말은 이번에 연 페이지에서 확인하지 못해 also에 넣지 않았다.' },

  { ko: '분산 락', en: 'Distributed lock', how: 'official',
    src: 'Redis 문서, "Distributed Locks with Redis" — https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/',
    also: ['distributed locks', 'DLM (Distributed Lock Manager)'],
    note: '"Distributed locks are a very useful primitive in many environments where different processes must operate with shared resources in a mutually exclusive way." 만료 시간은 이 문서에서 "lock validity time", 키의 time to live로 부른다. 여러 Redis 인스턴스를 쓰는 알고리즘의 이름은 Redlock.' },

  { ko: '벌크 연산', en: 'Bulk update and delete operations', how: 'official',
    src: '[명세] 4.11. Bulk Update and Delete Operations',
    also: ['bulk update', 'bulk update or delete'],
    note: '명세의 절 제목 그대로. "Bulk update and delete operations apply to entities of a single entity class (together with its subclasses, if any).", "Bulk update maps directly to a database update operation, bypassing optimistic locking checks.", "The persistence context is not synchronized with the result of the bulk update or delete." 짧게 줄인 "bulk operation"은 명세에서 이 뜻으로 쓰인 것을 보지 못했다([H-입문]의 "bulk operations on huge datasets"는 대량 처리 일반을 가리킨다).' },

  { ko: 'em.clear와 em.refresh', en: 'em.clear and em.refresh', how: 'composed',
    src: '[API] EntityManager — https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/EntityManager.html ; [명세] 3.3.5',
    also: ['EntityManager.clear()', 'EntityManager.refresh()', 'refresh operation'],
    note: '메서드 이름 그대로(em은 EntityManager 변수의 관례적인 이름). clear(): "Clear the persistence context, causing all managed entities to become detached." refresh(Object): "Refresh the state of the given managed entity instance from the database, overwriting unflushed changes ...".' },

  { ko: '영속성 전이(cascade)', en: 'Cascade', how: 'official',
    src: '[명세] 3.3 ; [API] CascadeType, OneToMany ; [H-입문] 5.5. Cascading persistence operations ; Hibernate User Guide 원본 pc/PersistenceContext.adoc("Cascading entity state transitions")',
    also: ['cascading', 'cascading persistence operations', 'cascading entity state transitions', 'CascadeType'],
    note: '"영속성 전이"를 직역한 persistence propagation, persistence transition 같은 말은 문서에 없다. 명세: "Use of the cascade annotation element may be used to propagate the effect of an operation to associated entities." CascadeType: "Defines the set of cascadable operations that are propagated to the associated entity." 동사로는 "The operations that must be cascaded to the target of the association.", 종류는 "Cascade the persist operation"처럼 적는다. DB 외래 키의 ON DELETE CASCADE와는 다른 것이다.' },

  { ko: '고아 객체 제거(orphanRemoval)', en: 'Orphan removal (orphanRemoval)', how: 'official',
    src: '[H-입문] 5.5. Cascading persistence operations ; [H-가이드] 3장의 예제 제목 "Example 260. Bidirectional bag with orphan removal" ; [명세] 2.11. Entity Relationships ; [API] OneToMany',
    also: ['orphan removal', 'orphaned entity'],
    note: '"고아 객체"를 orphan object로 옮기지 않는다. Hibernate: "Orphan removal indicates that an Item should be automatically deleted if it is removed from the set of items belonging to its parent Order". 명세: "Associations that are specified as OneToOne or OneToMany support use of the orphanRemoval option.", "If the entity being orphaned is a detached, new, or removed entity ...". orphanRemoval 요소: "(Optional) Whether to apply the remove operation to entities that have been removed from the relationship and to cascade the remove operation to those entities." 삭제 시점은 명세에서 "The remove operation is applied at the time of the flush operation."' },

  { ko: '쿼리 메서드', en: 'Query method', how: 'official',
    src: 'Spring Data JPA Reference, "Defining Query Methods" — https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html ; "JPA Query Methods" — https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html',
    also: ['query methods', 'derived query', 'derived repository method'],
    note: '"Parsing query method names is divided into subject and predicate." 이름에서 쿼리를 만들어 내는 일은 derive로 적는다: "Although getting a query derived from the method name is quite convenient, ...". Spring 문서에서 query method는 @Query를 붙인 메서드까지 포함하는 넓은 말이므로, 이름으로 만드는 경우만 가리킬 때는 derived query를 쓴다.' },

  { ko: 'Pageable과 Page', en: 'Pageable and Page', how: 'composed',
    src: 'Spring Data JPA Reference, "Defining Query Methods"의 "Paging, Iterating Large Results, Sorting & Limiting" — https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html ; "Spring Data Extensions" — https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html',
    also: ['Slice', 'PageRequest', 'count query', 'paging', 'pagination'],
    note: '타입 이름 그대로. "A Page knows about the total number of elements and pages available.", "A Slice knows only about whether a next Slice is available, ...", "To find out how many pages you get for an entire query, you have to trigger an additional count query." "The default Pageable passed into the method is equivalent to a PageRequest.of(0, 20) ...". 이 문서는 paging과 pagination을 섞어 쓴다.' },

  { ko: 'save()와 merge', en: 'save() and merge', how: 'composed',
    src: 'Spring Data JPA Reference, "Persisting Entities" — https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html ; [API] EntityManager',
    also: ['CrudRepository.save(…)', 'entityManager.persist(…)', 'entityManager.merge(…)', 'Persistable'],
    note: '"Saving an entity can be performed with the CrudRepository.save(…) method. It persists or merges the given entity by using the underlying JPA EntityManager." "If the entity has not yet been persisted, Spring Data JPA saves the entity with a call to the entityManager.persist(…) method. Otherwise, it calls the entityManager.merge(…) method." 새것인지 판단하는 절의 제목은 "Entity State-detection Strategies".' },

  { ko: 'DTO', en: 'DTO', how: 'official',
    src: 'Martin Fowler, P of EAA Catalog, "Data Transfer Object" — https://martinfowler.com/eaaCatalog/dataTransferObject.html ; Spring Data JPA Reference, "Projections"의 "Class-based Projections (DTOs)" — https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html',
    also: ['Data Transfer Object', 'DTO projection'],
    note: 'Fowler의 정의: "An object that carries data between processes in order to reduce the number of method calls." Spring Data: "Another way of defining projections is by using value type DTOs (Data Transfer Objects) that hold properties for the fields that are supposed to be retrieved." 명세와 Hibernate 입문서에는 DTO라는 말이 없다(Hibernate 입문서는 같은 용도에 Java record를 권한다).' },

  { ko: 'JPQL 생성자 표현식', en: 'JPQL constructor expression', how: 'official',
    src: '[명세] 4.9.2. Constructor Expressions in the SELECT Clause ; Spring Data JPA Reference, "Projections" — https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html',
    also: ['constructor expression', 'constructor expressions in the SELECT clause'],
    note: '명세: "A constructor may be used in the SELECT list to return an instance of a Java class. The specified class is not required to be an entity or to be mapped to the database." Spring Data: "JPQL constructor expressions must not contain aliases for selected columns ...", "Therefore, your query must define a constructor expression such as SELECT new com.example.NamesOnly(u.firstname, u.lastname) from User u."' },

  { ko: '동적 쿼리', en: 'Dynamic query', how: 'official',
    src: '[명세] 3.11, 4장 머리말, 4.1, 4.2, 6.2',
    also: ['dynamic queries', 'static query'],
    note: '명세: "The Query and TypedQuery APIs are used for the execution of both static queries and dynamic queries.", 4.1 "a query specification language for string-based dynamic queries and static queries", 4.2 "Any Jakarta Persistence query language statement may be constructed dynamically ...". 명세에서 dynamic query의 짝은 메타데이터에 미리 적어 두는 static query(named query: "Named queries are static queries expressed in metadata")이다. 한국어 설명("입력에 따라 문장의 모양이 달라지는 쿼리")은 실행 중에 조립한다는 같은 뜻이지만 범위가 조금 좁으므로, 본문에서는 "a query built at run time from whichever conditions were supplied"처럼 풀어 주는 것이 안전하다. Spring Data JPA 문서에서 dynamic은 dynamic sorting, dynamic projection에만 쓰이고 dynamic query라는 말은 보지 못했다. MyBatis 쪽 용어인 dynamic SQL과 섞지 않는다.' },

  { ko: 'Criteria API', en: 'Criteria API', how: 'official',
    src: '[명세] 6. Criteria API, 6.3, 6.3.6 ; Spring Data JPA Reference, "Specifications" — https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html',
    also: ['criteria query', 'CriteriaBuilder', 'Predicate'],
    note: '명세 6장 제목 "Criteria API". "The CriteriaBuilder interface found in Section C.1 is used to construct CriteriaQuery, CriteriaUpdate, and CriteriaDelete objects.", "The argument to the where method can be either an Expression<Boolean> instance or zero or more Predicate instances." Spring Data: "JPA’s Criteria API lets you build queries programmatically." Hibernate 입문서는 소문자로 "criteria query API", "the criteria API"라고 쓴다.' },

  { ko: 'Querydsl', en: 'Querydsl', how: 'official',
    src: 'Spring Data JPA Reference, "Spring Data Extensions"의 "Querydsl Extension" — https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html',
    also: ['Q classes', 'QuerydslPredicateExecutor'],
    note: '표기는 Q만 대문자인 Querydsl(QueryDSL 아님). "Querydsl is a framework that enables the construction of statically typed SQL-like queries through its fluent API." Q클래스는 "annotation processing in your build system that generates the Q classes". 같은 문서에 프로젝트 유지보수가 느려져 OpenFeign 쪽 포크(groupId io.github.openfeign.querydsl)가 생겼다는 안내가 있다. querydsl.com 자체는 이번에 열지 않았다.' },

  { ko: '값 타입', en: 'Value type', how: 'official',
    src: '[H-가이드] 3.1.1. Value types, 3.1.2. Entity types',
    also: ['value types'],
    note: 'Hibernate의 분류이며 명세에는 없는 말이다(명세는 basic type, embeddable class로 따로 부른다). "A value type is a piece of data that does not define its own lifecycle.", "Entities, by nature of their unique identifier, exist independently of other objects whereas values do not." 짝이 되는 말은 entity type. Java의 value-based class, Project Valhalla의 value class와는 다른 말이다.' },

  { ko: '임베디드 타입(@Embeddable)', en: 'Embeddable type (@Embeddable)', how: 'official',
    src: '[H-가이드] 3.1.1. Value types, 3장 ; [API] Embeddable ; [명세] 2.7. Embeddable Classes ; [H-입문] 3.14. Embeddable objects',
    also: ['embeddable class', 'embeddable object', '@Embedded'],
    note: '한국어는 "임베디드(embedded)"이지만 타입의 이름은 embeddable이다. embedded type이라고 쓰지 않는다. Hibernate: "An embeddable type is another form of a value type, and its lifecycle is bound to a parent entity type". Embeddable Javadoc: "Declares a type whose instances are stored as an intrinsic part of an owning entity, sharing the identity of the entity.", "An embeddable class does not have its own table." 명세는 embeddable class, Hibernate 입문서 3.14절 제목은 "Embeddable objects". @Embedded는 그 타입을 쓰는 필드에 붙이는 애너테이션.' },

  { ko: '값 타입 컬렉션(@ElementCollection)', en: 'Element collection (@ElementCollection)', how: 'official',
    src: '[명세] 2.8. Collections of Embeddable Classes and Basic Types ; [API] ElementCollection ; [H-가이드] 3.9.7. @ElementCollection',
    also: ['collections of value types', 'value type collection', 'collection table'],
    note: '고르기 어려웠던 용어. 명세의 이름은 element collection이다: 2.8 "a collection of a basic type or embeddable class (“element collection”)", ElementCollection "Declares a collection of instances of a basic type or embeddable class." Hibernate User Guide는 두 가지를 다 쓴다("Element collections may contain values of either basic or embeddable types.", "Unidirectional associations are very similar to value type collections", 절 제목 "Collections of value types"). 애너테이션 이름과 맞고 명세의 말인 element collection을 이름으로 삼았다. 값을 담는 별도 테이블은 collection table(@CollectionTable).' },

  { ko: '엔티티의 네 가지 상태', en: 'The four entity states', how: 'descriptive',
    src: '[명세] 3.3. Entity Instance’s Life Cycle ; [API] EntityManager ; Hibernate User Guide 원본 pc/PersistenceContext.adoc ; [H-입문] 5.1. Persistence Contexts',
    also: ['entity state', 'entity lifecycle'],
    note: '이름 자체는 정해진 용어가 아니라 묶어 부른 말이다. 네 상태의 이름은 명세가 정한다: "An entity instance can be characterized as being new, managed, detached, or removed." 비영속 = new, 영속 = managed, 준영속 = detached, 삭제 = removed. Hibernate는 앞의 둘을 다르게도 부른다: "transient: the entity has just been instantiated and is not associated with a persistence context.", "managed or persistent: ...". 그래서 영어판은 명세의 new / managed / detached / removed를 쓰고 처음 나올 때 "new (Hibernate calls it transient)"처럼 한 번 밝힌다. "비영속"을 non-persistent로, "영속"을 persistent state로 직역하지 않는다. Hibernate 입문서 5.1은 transient, persistent, detached 셋만 든다. 명세의 절 제목은 Life Cycle을 두 낱말로 쓴다.' },

  { ko: '컬렉션 페치 조인과 페이징', en: 'Collection fetch joins and pagination', how: 'descriptive',
    src: '[명세] 3.11.1, 4.4.5.3. Fetch Joins ; [H-입문] 5.14. Limits, pagination, and ordering',
    also: ['fetch joins over collections', 'setFirstResult', 'setMaxResults'],
    note: '정해진 용어가 아니라 두 기능을 함께 쓸 때의 문제를 가리키는 이름이다. 낱말은 모두 확인했다: fetch join(명세 4.4.5.3), pagination([H-입문] "The approach to pagination we’ve just seen is sometimes called offset-based pagination."). 명세의 문장은 "The effect of applying setMaxResults or setFirstResult to a query involving fetch joins over collections is undefined."이므로 영어 본문에서는 이 문장의 표현(fetch joins over collections)을 그대로 쓸 수 있다. "in-memory pagination"이라는 말은 이번에 연 문서에서 보지 못했다.' },

  { ko: 'MultipleBagFetchException', en: 'MultipleBagFetchException', how: 'official',
    src: 'Hibernate ORM 6.6 Javadoc, org.hibernate.loader.MultipleBagFetchException — https://docs.hibernate.org/orm/6.6/javadocs/org/hibernate/loader/MultipleBagFetchException.html ; [H-가이드] 3.9.11. Bags',
    also: ['bag'],
    note: '"Exception used to indicate that a query is attempting to simultaneously fetch multiple bags". bag은 User Guide 3.9.11 "Although they use the List interface on the Java side, bags don’t retain element order."' },

  { ko: '상속 관계 매핑', en: 'Inheritance mapping', how: 'official',
    src: '[명세] 2.13, 2.14. Inheritance Mapping Strategies ; [API] InheritanceType ; [H-가이드] 3.14. Inheritance',
    also: ['inheritance mapping strategy', 'entity inheritance', '@Inheritance'],
    note: '명세 2.14 제목 "Inheritance Mapping Strategies", 2.13 "Entities support inheritance, polymorphic associations, and polymorphic queries." InheritanceType: "Enumerated the options for mapping entity inheritance."' },

  { ko: '조인 전략(JOINED)', en: 'Joined subclass strategy (JOINED)', how: 'official',
    src: '[명세] 2.14.2. Joined Subclass Strategy ; [API] InheritanceType ; [H-가이드] 3.14.3. Joined table',
    also: ['joined table', 'joined inheritance'],
    note: '"join strategy"가 아니다. 명세: "In the joined subclass strategy, the root of the class hierarchy is represented by a single table." InheritanceType.JOINED: "A table for each abstract or concrete entity class, with only the columns mapped to persistent fields and properties declared by the entity class. ... A join is used to retrieve the state of such entities." Hibernate User Guide의 절 제목은 "Joined table", 본문에는 "When using joined inheritance, all subtype tables will need to be left joined to determine the concrete type."' },

  { ko: '단일 테이블 전략(SINGLE_TABLE)', en: 'Single table per class hierarchy strategy (SINGLE_TABLE)', how: 'official',
    src: '[명세] 2.14.1. Single Table per Class Hierarchy Strategy ; [API] InheritanceType ; [H-가이드] 3.14.2. Single table',
    also: ['single table', 'discriminator column'],
    note: '명세의 절 제목이 길지만 그대로 따랐다. "In this strategy, all the classes in a hierarchy are mapped to a single table." InheritanceType.SINGLE_TABLE: "A single table for each entity class hierarchy. ... The concrete subclass represented by a row is determined by the value held by a discriminator column." Hibernate User Guide의 절 제목은 짧게 "Single table". 구분 컬럼은 discriminator column(@DiscriminatorColumn). "single table strategy"라는 짧은 꼴은 이번에 연 페이지에서 보지 못했다.' },

  { ko: '구현 클래스마다 테이블 전략(TABLE_PER_CLASS)', en: 'Table per concrete class strategy (TABLE_PER_CLASS)', how: 'official',
    src: '[명세] 2.14.3. Table per Concrete Class Strategy ; [API] InheritanceType ; [H-가이드] 3.14. Inheritance',
    also: ['table per class', 'table-per-class'],
    note: '명세: "In this mapping strategy, each class is mapped to a separate table." InheritanceType.TABLE_PER_CLASS: "A table for each concrete entity class. Each concrete class in the hierarchy has its own table, and each entity instance is stored as a single table row. No discriminator column is necessary." Hibernate User Guide는 "table-per-class"로도 쓰고, 설명은 "Each subclass has its own table containing both the subclass and the base class properties."' },

  { ko: '엔티티 프록시', en: 'Entity proxy', how: 'official',
    src: '[H-가이드] 3.4.9. Define a custom entity proxy ; [H-입문] 5.6. Proxies and lazy fetching ; Hibernate ORM 6.6 Javadoc, BatchSize ; [API] EntityManager(getReference)',
    also: ['proxy', 'uninitialized proxy'],
    note: '[H-입문]: "A proxy is an object that masquerades as a real entity or collection ...". BatchSize Javadoc: "the identifiers of unfetched entity proxies". 초기화되지 않은 것은 uninitialized proxy(User Guide: "an uninitialized proxy is generated and returned", LazyInitializationException Javadoc: "an uninitialized proxy or collection"). 명세는 proxy라는 말 없이 getReference를 "whose state may be lazily fetched"로 적는다. Spring의 AOP proxy(용어 "프록시(Proxy)")와 구분하려고 entity를 붙인다.' },

  { ko: 'LazyInitializationException', en: 'LazyInitializationException', how: 'official',
    src: 'Hibernate ORM 6.6 Javadoc, org.hibernate.LazyInitializationException — https://docs.hibernate.org/orm/6.6/javadocs/org/hibernate/LazyInitializationException.html ; [H-입문] 5.6',
    note: '"Indicates an attempt to access unfetched data outside the context of an open stateful Session. For example, this exception occurs when an uninitialized proxy or collection is accessed after the session was closed."' },

  { ko: '@Column', en: '@Column', how: 'official',
    src: '[API] Column — https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/Column.html',
    note: '"Specifies the column mapped by the annotated persistent property or field. If no Column annotation is explicitly specified, the default values apply." unique: "(Optional) Whether the column is a unique key." nullable: "(Optional) Whether the database column is nullable." length 기본값 255. 이 Javadoc에는 nullable·unique·length가 테이블 생성(DDL)에만 쓰인다는 문장이 없다(한국어 설명의 그 부분은 이 페이지로는 확인되지 않음).' },

  { ko: '@Enumerated', en: '@Enumerated', how: 'official',
    src: '[API] Enumerated — https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/Enumerated.html',
    also: ['EnumType.ORDINAL', 'EnumType.STRING'],
    note: '"Specifies that a persistent property or field should be persisted as an enumerated type." "An enum can be mapped as either a string or an integer, where EnumType enumerates the available options." 3.2 Javadoc의 기본값 규칙: 애너테이션이 없고 converter도 없을 때, enum에 EnumeratedValue를 붙인 final String 필드가 있으면 EnumType.STRING, 없으면 EnumType.ORDINAL.' },

  { ko: '@Transient', en: '@Transient', how: 'official',
    src: '[API] Transient — https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/Transient.html ; [API] Embeddable',
    also: ['transient keyword'],
    note: '"Specifies that the annotated property or field is not persistent." Embeddable Javadoc은 Java 키워드도 같은 효과를 낸다고 적는다: "The Transient annotation or the Java transient keyword must be used to explicitly declare any field or property of an embeddable class which is not persistent." Hibernate가 엔티티 상태 이름으로 쓰는 transient(= 명세의 new)와 낱말이 같으니 문맥을 밝혀 쓴다.' },

  { ko: '기본 키 생성 전략(@GeneratedValue)', en: 'Primary key generation strategy (@GeneratedValue)', how: 'official',
    src: '[API] GeneratedValue, GenerationType — https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/GenerationType.html ; [H-입문] 3.5. Generated identifiers',
    also: ['generation strategy', 'generated identifier', 'GenerationType'],
    note: 'GeneratedValue: "Specifies a generation strategy for generated primary keys.", strategy 요소: "(Optional) The primary key generation strategy that the persistence provider must use to generate the annotated entity primary key." GenerationType: "Enumerates the defined primary key generation strategies." IDENTITY: "... using a database identity column.", SEQUENCE: "... using a database sequence." Hibernate는 primary key 대신 identifier를 써서 "Generated identifiers"라고 한다.' },

  { ko: '준영속 상태', en: 'Detached entity', how: 'official',
    src: '[명세] 3.3, 3.3.6, 3.3.7. Detached Entities ; [API] EntityManager ; Hibernate User Guide 원본 pc/PersistenceContext.adoc',
    also: ['detached', 'detached state', 'detached entity instance', 'detached object'],
    note: '"준영속"을 semi-persistent, quasi-persistent로 옮기지 않는다. 명세의 말은 detached다: "A detached entity instance is an instance with a persistent identity that is not (or no longer) associated with a persistence context.", "A detached entity results from transaction commit if a transaction-scoped persistence context is used ...". 상태로 말할 때는 Hibernate User Guide의 "in detached state"("Hibernate itself can handle deleting entities in detached state.")를 쓴다. 주의: 명세 3.3.7.1의 제목 "Merging Detached Entity State"에서 state는 "상태(단계)"가 아니라 준영속 엔티티가 가진 값을 뜻한다.' },

  { ko: '병합(merge)', en: 'Merge operation', how: 'official',
    src: '[명세] 3.3.7.1. Merging Detached Entity State ; [API] EntityManager, CascadeType ; Hibernate User Guide 원본 pc/PersistenceContext.adoc("Merging detached data")',
    also: ['merge', 'merging', 'merging detached entity state', 'EntityManager.merge()'],
    note: '명세: "The merge operation allows for the propagation of state from detached entities onto persistent entities ...". EntityManager.merge: "Merge the state of the given new or detached entity instance into the current persistence context ...". [H-입문]: "Copy the state of a given detached object to a corresponding managed persistent instance and return the persistent object". Git의 merge(용어 "merge와 rebase")와 겹치지 않게 operation을 붙였다.' },

  { ko: 'JDBC', en: 'JDBC', how: 'official',
    src: 'The Java Tutorials, "Lesson: JDBC Introduction" — https://docs.oracle.com/javase/tutorial/jdbc/overview/index.html ; MySQL 8.4 Reference Manual Glossary의 "JDBC" 항목 — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; [H-입문] 1. Introduction',
    also: ['JDBC API', 'Java Database Connectivity'],
    note: 'Oracle: "The JDBC API is a Java API that can access any kind of tabular data, especially data stored in a relational database." 이 Oracle 페이지는 JDBC를 풀어 쓰지 않는다. 풀어 쓴 것은 MySQL Glossary에서 확인: "Abbreviation for "Java Database Connectivity", an API for database access from Java applications."' },

  { ko: '객체와 테이블의 불일치', en: 'Object/relational impedance mismatch', how: 'official',
    src: 'hibernate.org, "What is object/relational mapping?" — https://hibernate.org/orm/what-is-an-orm/ ; [H-가이드] Preface',
    also: ['object/relational mismatch', 'paradigm mismatch', 'impedance mismatch'],
    note: '"객체와 테이블의 불일치"를 object-table mismatch로 직역하지 않는다. hibernate.org: "The object/relational impedance mismatch refers to differences in how entities are represented in the relational data model, compared to how they’re represented in an object-oriented programming language.", "You might have heard talk about the "object/relational mismatch"." User Guide 머리말: "Development costs are significantly higher due to a paradigm mismatch ...". 같은 페이지가 드는 다섯 가지는 Granularity, Subtypes (inheritance), Identity, Associations, Data navigation. 빗금 표기(object/relational)는 Hibernate의 것이고, 하이픈 표기는 이번에 연 페이지에서 보지 못했다.' },

  { ko: '단방향과 양방향 연관관계', en: 'Unidirectional and bidirectional relationships', how: 'composed',
    src: '[명세] 2.11. Entity Relationships, 2.12.2, 2.12.3 ; [API] OneToMany ; [H-가이드] 3장(3.7.12–3.9.11 사이)',
    also: ['unidirectional relationship', 'bidirectional relationship', 'unidirectional association', 'bidirectional association'],
    note: '명세는 relationship을 쓴다: "Relationships may be bidirectional or unidirectional." Hibernate는 association을 쓴다: "Every bidirectional association must have one owning side only (the child side)", "a bidirectional @OneToMany association is much more efficient". 영어판은 명세를 따라 relationship을 기본으로 하고, Hibernate의 동작을 말할 때는 association도 같은 뜻으로 쓴다(Javadoc도 섞어 쓴다: "Specifies a many-valued association with one-to-many multiplicity.").' },

  { ko: '연관관계의 주인과 mappedBy', en: 'Owning side and mappedBy', how: 'composed',
    src: '[명세] 2.11. Entity Relationships ; [API] OneToMany ; [H-입문] 3.16–3.19 ; [H-가이드] 3장(3.7.12–3.9.12 사이)',
    also: ['owning side', 'inverse side', 'owner of the relationship', 'unowned side'],
    note: '"연관관계의 주인"을 relationship owner, master of the association 따위로 지어내지 않는다. 명세: "The inverse side of a bidirectional relationship must refer to its owning side by use of the mappedBy element ...", "The mappedBy element designates the property or field in the entity that is the owner of the relationship." 주인이 아닌 쪽은 명세와 User Guide에서 inverse side, Hibernate 입문서에서 unowned side("Changes made to the unowned side of an association are never synchronized to the database.", "To modify a bidirectional association, we must change the owning side."). mappedBy는 요소 이름 그대로.' },

  { ko: '다대일과 일대다 연관관계', en: 'Many-to-one and one-to-many relationships', how: 'composed',
    src: '[명세] 2.11. Entity Relationships, 2.12.2. Bidirectional ManyToOne / OneToMany Relationships ; [API] OneToMany ; [H-입문] 3.16. Many-to-one',
    also: ['many-to-one', 'one-to-many', '@ManyToOne', '@OneToMany', 'many-to-one association', 'one-to-many association'],
    note: '하이픈을 넣는다. 명세: "The many side of one-to-many / many-to-one bidirectional relationships must be the owning side, ...". Javadoc: "Specifies a many-valued association with one-to-many multiplicity."' },

  { ko: '일대일 연관관계', en: 'One-to-one relationship', how: 'official',
    src: '[명세] 2.11. Entity Relationships ; [H-입문] 3.17. One-to-one (first way), 3.18. One-to-one (second way)',
    also: ['one-to-one', '@OneToOne', 'one-to-one association'],
    note: '명세 2.11: "For one-to-one bidirectional relationships, the owning side corresponds to the side that contains ..."(도구가 문장을 여기까지만 보여 주었다. 이어지는 내용은 외래 키를 가진 쪽이라는 것으로, 한국어 설명과 같은 방향이다). Hibernate 입문서는 일대일을 외래 키로 매핑하는 방법과 기본 키를 함께 쓰는 방법 두 절로 나눈다.' },

  { ko: '다대다와 연결 테이블', en: 'Many-to-many relationships and join tables', how: 'composed',
    src: '[명세] 2.9.2, 2.11. Entity Relationships ; [API] OneToMany ; [H-입문] 3.19. Many-to-many, 4.4 ; [H-가이드] 3장(3.7.12–3.9.12 사이)',
    also: ['many-to-many', '@ManyToMany', 'join table', '@JoinTable', 'association table', 'link table', 'link entity'],
    note: '"연결 테이블"의 명세 용어는 join table이다(@JoinTable): "a join table is used to map the map for a many-to-many relationship", "a unidirectional OneToMany association is sometimes mapped to a join table using the JoinTable annotation." Hibernate는 다른 이름도 쓴다: 입문서 "It always maps to a separate association table in the database.", User Guide "requires a link table that joins two entities". 연결 테이블을 엔티티로 올린 것은 User Guide의 제목 "Bidirectional many-to-many with a link entity"에서 link entity. 명세: "For many-to-many bidirectional relationships either side may be the owning side." connection table, mapping table 같은 직역은 쓰지 않는다.' },
  { ko: 'AttributeConverter', en: 'AttributeConverter', how: 'official',
    src: 'Jakarta Persistence 3.2 API, jakarta.persistence.AttributeConverter — https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/attributeconverter',
    note: '인터페이스 이름 그대로(enumtype).' },
  { ko: 'Specification', en: 'Specification', how: 'official',
    src: 'Spring Data JPA Reference, Specifications — https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html',
    note: '인터페이스 이름 그대로(dynquery). 문서: "Spring Data JPA Specification provides a small, focused API to express predicates over entities".' },
];
