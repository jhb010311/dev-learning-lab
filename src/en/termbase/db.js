// DB 용어의 영어 대조표. ko는 설명집의 용어 이름과 글자 하나까지 같아야 한다.
// 확인한 날: 2026-10-10. src의 주소는 모두 이번 작업 중에 실제로 열어 본 페이지다.
// 줄임: "MySQL 8.4" = MySQL 8.4 Reference Manual, "MySQL Glossary" = 같은 매뉴얼의 MySQL Glossary.
module.exports = [
  { ko: '이진 탐색', en: 'Binary search', how: 'official',
    src: 'Java SE 21 API, java.util.Arrays의 binarySearch 요약("...using the binary search algorithm.") — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html',
    also: ['binary search algorithm'],
    note: 'MDN Glossary의 Binary_search 주소는 404여서 Java API 문서로 확인했다.' },

  { ko: 'readOnly 트랜잭션', en: 'Read-only transaction (readOnly)', how: 'official',
    src: 'Spring Framework Reference, "Using @Transactional"(속성 표의 readOnly: "Read-write versus read-only transaction.") — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html ; MySQL Glossary "read-only transaction" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['read-only transaction'],
    note: '개념의 이름은 하이픈이 있는 read-only transaction, 괄호 안의 readOnly는 @Transactional의 속성 이름 그대로다. 반대말은 read-write transaction(같은 표에서 확인).' },

  { ko: '트랜잭션 격리 수준', en: 'Transaction isolation level', how: 'official',
    src: 'MySQL 8.4, 17.7.2.1 Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html ; PostgreSQL 13.2 Transaction Isolation — https://www.postgresql.org/docs/current/transaction-iso.html',
    also: ['isolation level'],
    note: '네 단계의 이름은 READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE(대문자 그대로).' },

  { ko: 'Dirty Read', en: 'Dirty read', how: 'official',
    src: 'MySQL Glossary "dirty read" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; PostgreSQL 13.2 Transaction Isolation — https://www.postgresql.org/docs/current/transaction-iso.html',
    note: '' },

  { ko: 'Non-repeatable Read', en: 'Non-repeatable read', how: 'official',
    src: 'MySQL Glossary "non-repeatable read" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['nonrepeatable read'],
    note: 'MySQL은 하이픈을 넣어 non-repeatable read, PostgreSQL 13.2는 붙여서 nonrepeatable read로 쓴다(둘 다 확인). MySQL 표기를 골랐다.' },

  { ko: 'Phantom Read', en: 'Phantom read', how: 'official',
    src: 'MySQL Glossary "phantom"("This occurrence is known as a phantom read.") — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; PostgreSQL 13.2 Transaction Isolation — https://www.postgresql.org/docs/current/transaction-iso.html',
    also: ['phantom', 'phantom row'],
    note: 'MySQL Glossary의 표제어는 phantom(나타난 행 자체)이고 현상의 이름이 phantom read다. phantom row는 MySQL 8.4 17.7.2.1에서 봤다.' },

  { ko: 'MVCC(다중 버전 동시성 제어)', en: 'MVCC (multiversion concurrency control)', how: 'official',
    src: 'MySQL Glossary "MVCC"("Acronym for multiversion concurrency control.") — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; PostgreSQL 13.1 Introduction("Multiversion Concurrency Control, MVCC") — https://www.postgresql.org/docs/current/mvcc-intro.html',
    also: ['multi-versioning'],
    note: 'multiversion은 하이픈 없이 한 낱말이다. InnoDB 장의 제목은 "InnoDB Multi-Versioning"(17.3)으로 하이픈이 있다.' },

  { ko: '레코드 락, 갭 락, 넥스트 키 락', en: 'Record locks, gap locks, and next-key locks', how: 'composed',
    src: 'MySQL 8.4, 17.7.1 InnoDB Locking(소제목 Record Locks, Gap Locks, Next-Key Locks) — https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html',
    also: ['record lock', 'gap lock', 'next-key lock'],
    note: 'next-key는 하이픈으로 잇는다.' },

  { ko: '인덱스', en: 'Index', how: 'official',
    src: 'MySQL Glossary "index" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    note: '복수형은 MySQL 문서에서 indexes다.' },

  { ko: 'B-트리 인덱스', en: 'B-tree index', how: 'official',
    src: 'MySQL 8.4, 10.3.9 Comparison of B-Tree and Hash Indexes("A B-tree index can be used for...") — https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html ; MySQL Glossary "B-tree"',
    also: ['B-tree'],
    note: '본문 표기는 B-tree(소문자 t), 제목에서만 B-Tree다.' },

  { ko: '클러스터드 인덱스와 세컨더리 인덱스', en: 'Clustered index and secondary index', how: 'composed',
    src: 'MySQL 8.4, 17.6.2.1 Clustered and Secondary Indexes — https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html ; MySQL Glossary "clustered index", "secondary index"',
    also: ['clustered index', 'secondary index'],
    note: '' },

  { ko: '복합 인덱스와 Leftmost Prefix', en: 'Composite index and leftmost prefix', how: 'composed',
    src: 'MySQL 8.4, 10.3.6 Multiple-Column Indexes("composite indexes (that is, indexes on multiple columns)", "any leftmost prefix of the index") — https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html ; MySQL Glossary "composite index"',
    also: ['composite index', 'multiple-column index', 'leftmost prefix'],
    note: 'MySQL은 composite index와 multiple-column index를 같은 뜻으로 함께 쓴다. Glossary에는 "index prefix"(복합 인덱스의 앞쪽 컬럼들)라는 표제어도 있으나 다른 뜻(컬럼 값의 앞부분만 색인)과 헷갈려 also에 넣지 않았다. 설명의 Skip Scan은 10.2.1.2의 "Skip Scan Range Access Method"다.' },

  { ko: '커버링 인덱스', en: 'Covering index', how: 'official',
    src: 'MySQL Glossary "covering index" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; MySQL 8.4, 10.8.2 EXPLAIN Output Format',
    note: '' },

  { ko: '카디널리티와 선택도', en: 'Cardinality and selectivity', how: 'composed',
    src: 'MySQL Glossary "cardinality", "selectivity" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['cardinality', 'selectivity'],
    note: 'Glossary의 정의: selectivity = 서로 다른 값의 수(cardinality) ÷ 테이블의 행 수.' },

  { ko: '실행 계획(EXPLAIN)', en: 'Query execution plan (EXPLAIN)', how: 'official',
    src: 'MySQL 8.4, 10.8 Understanding the Query Execution Plan("...is called the query execution plan, also known as the EXPLAIN plan.") — https://dev.mysql.com/doc/refman/8.4/en/execution-plan-information.html ; MySQL Glossary "query execution plan"',
    also: ['execution plan', 'EXPLAIN plan'],
    note: '' },

  { ko: '옵티마이저', en: 'Optimizer', how: 'official',
    src: 'MySQL Glossary "optimizer" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['query optimizer'],
    note: 'query optimizer는 Glossary의 "selectivity" 항목에서 봤다.' },

  { ko: '풀 테이블 스캔', en: 'Full table scan', how: 'official',
    src: 'MySQL Glossary "full table scan" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; MySQL 8.4, 10.2.1.23 Avoiding Full Table Scans — https://dev.mysql.com/doc/refman/8.4/en/table-scan-avoidance.html',
    also: ['table scan'],
    note: '' },

  { ko: 'OFFSET 페이징과 키셋(커서) 페이징', en: 'Offset-based pagination and keyset (cursor-based) pagination', how: 'composed',
    src: 'Jakarta Data 1.0, 4.8.1 Offset-based Pagination, 4.8.2 Cursor-based Pagination("Cursor-based pagination, also known as seek method or keyset pagination, ...") — https://jakarta.ee/specifications/data/1.0/jakarta-data-1.0.html ; PostgreSQL 7.6 LIMIT and OFFSET — https://www.postgresql.org/docs/current/queries-limit.html',
    also: ['offset-based pagination', 'offset pagination', 'keyset pagination', 'cursor-based pagination', 'seek method', 'key-based pagination', 'Keyset-Filtering'],
    note: 'MySQL과 PostgreSQL 문서에는 이 두 방식의 이름이 없어(OFFSET 절의 설명만 있다) Jakarta Data 명세의 말을 썼다. key-based pagination은 Hibernate Data Repositories 문서(https://docs.hibernate.org/orm/7.0/repositories/html_single/), Keyset-Filtering은 Spring Data 문서의 "Scrolling using Keyset-Filtering"(https://docs.spring.io/spring-data/jpa/reference/data-commons/repositories/scrolling.html)에서 봤다.' },

  { ko: 'GROUP BY, WHERE, HAVING', en: 'GROUP BY, WHERE, HAVING', how: 'composed',
    src: 'MySQL 8.4, 15.2.13 SELECT Statement — https://dev.mysql.com/doc/refman/8.4/en/select.html',
    note: 'SQL 키워드라 글자 그대로 둔다. 문서에서는 "the WHERE clause", "the HAVING clause"처럼 clause를 붙여 부른다.' },

  { ko: '서브쿼리', en: 'Subquery', how: 'official',
    src: 'MySQL 8.4, 15.2.15 Subqueries("A subquery is a SELECT statement within another statement.") — https://dev.mysql.com/doc/refman/8.4/en/subqueries.html',
    note: '한 낱말로 붙여 쓴다(sub-query 아님). 바깥 쿼리는 outer query.' },

  { ko: '뷰(View)', en: 'View', how: 'official',
    src: 'MySQL 8.4, 27.5 Using Views — https://dev.mysql.com/doc/refman/8.4/en/views.html ; MySQL Glossary "view"',
    note: '' },

  { ko: '정규화와 반정규화', en: 'Normalization and denormalization', how: 'composed',
    src: 'MySQL Glossary "normalized"(본문에 "Normalization is not always recommended."), "denormalized" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; Google Cloud BigQuery 문서 "Use nested and repeated fields"("Denormalization is a common strategy for increasing read performance...") — https://docs.cloud.google.com/bigquery/docs/best-practices-performance-nested',
    also: ['normalized', 'denormalized'],
    note: 'MySQL Glossary의 표제어는 형용사 normalized, denormalized이고 명사 denormalization은 거기에 없어 Google Cloud 문서에서 확인했다. 정규형은 third normal form처럼 쓴다(MySQL 8.4 10.4.1에서 확인).' },

  { ko: '함수 종속', en: 'Functional dependency', how: 'official',
    src: 'MySQL 8.4, 14.19.4 Detection of Functional Dependence("MySQL is able to discover a functional dependency...", "Y is functionally dependent on X") — https://dev.mysql.com/doc/refman/8.4/en/group-by-functional-dependence.html',
    also: ['functional dependence'],
    note: '같은 페이지가 functional dependency(복수 functional dependencies)와 functional dependence를 함께 쓴다. 설명의 "부분 함수 종속", "이행적 함수 종속"에 해당하는 영어(partial/transitive dependency)는 이번에 공식 문서에서 확인하지 못했다.' },

  { ko: '레플리케이션(복제)', en: 'Replication', how: 'official',
    src: 'MySQL 8.4, Chapter 19 Replication — https://dev.mysql.com/doc/refman/8.4/en/replication.html ; MySQL Glossary "replication", "source", "replica"',
    note: 'MySQL 8.4는 원본 서버를 source, 복제본을 replica라고 부른다(예전의 master/slave를 대체). 한국어 설명은 원본을 primary라고 적었는데, MySQL 문서의 말로는 source다.' },

  { ko: '샤딩과 파티셔닝', en: 'Sharding and partitioning', how: 'composed',
    src: 'MongoDB Manual "Sharding"("Sharding is a method for distributing data across multiple machines.") — https://www.mongodb.com/docs/manual/sharding/ ; MySQL 8.4, 26.1 Overview of Partitioning in MySQL — https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html',
    also: ['sharding', 'partitioning'],
    note: 'MySQL Glossary와 파티셔닝 장에는 sharding이라는 낱말이 없어 MongoDB 문서로 확인했다. Redis 문서도 "data is automatically sharded across multiple Redis nodes"라고 쓴다.' },

  { ko: 'NoSQL', en: 'NoSQL', how: 'official',
    src: 'MySQL Glossary "NoSQL" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    note: '같은 항목에 key-value stores라는 표기가 나온다.' },

  { ko: 'CAP 정리', en: 'CAP theorem', how: 'official',
    src: 'AWS Whitepaper "Availability and Beyond", "CAP theorem" — https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/cap-theorem.html ; Apache Cassandra Documentation "Guarantees" — https://cassandra.apache.org/doc/latest/cassandra/architecture/guarantees.html',
    note: '세 성질의 이름은 consistency, availability, partition tolerance(두 자료가 같다).' },

  { ko: '최종 일관성(Eventual Consistency)', en: 'Eventual consistency', how: 'official',
    src: 'Apache Cassandra Documentation "Guarantees"("Eventual consistency is a tradeoff to achieve high availability...") — https://cassandra.apache.org/doc/latest/cassandra/architecture/guarantees.html ; AWS Whitepaper "CAP theorem" — https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/cap-theorem.html',
    also: ['eventually consistent'],
    note: '형용사꼴 eventually consistent는 Amazon DynamoDB Developer Guide의 "DynamoDB read consistency"에서도 봤다. 반대말은 거기서 strongly consistent다.' },

  { ko: 'Redis', en: 'Redis', how: 'official',
    src: 'Redis 문서 "Redis data types"("Redis is a data structure server.") — https://redis.io/docs/latest/develop/data-types/ ; "Open Source"("Redis is an in-memory data store ...") — https://redis.io/docs/latest/get-started/',
    note: '자료형 이름은 문서에서 strings, lists, sets, hashes, sorted sets다.' },

  { ko: '캐시 제거(Eviction) 정책', en: 'Eviction policy', how: 'official',
    src: 'Redis 문서 "Key eviction"("Redis lets you specify an eviction policy to evict keys automatically...") — https://redis.io/docs/latest/develop/reference/eviction/ ; MySQL Glossary "eviction", "LRU"',
    also: ['key eviction', 'eviction'],
    note: 'LRU는 least recently used, LFU는 least frequently used(Redis 문서에서 확인). 설정 이름 maxmemory-policy는 그대로 둔다.' },

  { ko: '스케일 업과 스케일 아웃', en: 'Scale up and scale out', how: 'composed',
    src: 'MySQL Glossary "scale up", "scale out" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html',
    also: ['scale up', 'scale out', 'vertical scaling', 'horizontal scaling'],
    note: 'vertical scaling, horizontal scaling은 MongoDB Manual "Sharding"에서 같은 뜻으로 쓰인 것을 봤다. MySQL Glossary는 동사구로 띄어 쓰고(scale up), 명사 앞에서 꾸밀 때는 Chapter 19에서 "Scale-out solutions"처럼 하이픈을 넣는다.' },

  { ko: '페이지(InnoDB)', en: 'Page (InnoDB)', how: 'official',
    src: 'MySQL Glossary "page", "page size" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; MySQL 8.4, 17.6.2.2 The Physical Structure of an InnoDB Index("The default size of an index page is 16KB.")',
    note: '' },

  { ko: '버퍼 풀', en: 'Buffer pool', how: 'official',
    src: 'MySQL 8.4, 17.5.1 Buffer Pool — https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html ; MySQL Glossary "buffer pool"',
    note: '' },

  { ko: '더티 페이지와 플러시', en: 'Dirty pages and flushing', how: 'composed',
    src: 'MySQL Glossary "dirty page", "flush" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; MySQL 8.4, 17.5.1 Buffer Pool("background flushing")',
    also: ['dirty page', 'flush'],
    note: 'Glossary의 표제어는 dirty page, flush(동사)다.' },

  { ko: '제약 조건', en: 'Constraint', how: 'official',
    src: 'MySQL Glossary "constraint" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; PostgreSQL 5.5 Constraints — https://www.postgresql.org/docs/current/ddl-constraints.html',
    note: '종류의 이름: PRIMARY KEY, UNIQUE(Glossary "unique constraint"), NOT NULL constraint, CHECK constraint, FOREIGN KEY constraint.' },

  { ko: 'NOT NULL과 CHECK', en: 'NOT NULL and CHECK', how: 'composed',
    src: 'MySQL Glossary "NOT NULL constraint" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; MySQL 8.4, 15.1.20.6 CHECK Constraints — https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html',
    also: ['NOT NULL constraint', 'not-null constraint'],
    note: 'PostgreSQL 5.5는 소문자로 not-null constraint, check constraint라고 쓴다. "CHECK constraint"는 따로 있는 용어(CHECK 제약)의 en이라 여기 also에는 넣지 않았다.' },

  { ko: '외래 키의 참조 동작(ON DELETE)', en: 'Foreign key referential actions (ON DELETE)', how: 'official',
    src: 'MySQL 8.4, 15.1.20.5 FOREIGN KEY Constraints의 "Referential Actions"("...the result depends on the referential action specified by ON UPDATE and ON DELETE subclauses...") — https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html',
    also: ['referential action'],
    note: '부모·자식 테이블은 parent table, child table. 같은 페이지에 따르면 생략했을 때의 기본값은 NO ACTION이고 InnoDB에서는 RESTRICT와 같다.' },

  { ko: '교착 감지와 희생 트랜잭션', en: 'Deadlock detection and the victim', how: 'composed',
    src: 'MySQL Glossary "deadlock detection", "victim"("The transaction that is automatically chosen to be rolled back when a deadlock is detected.") — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; MySQL 8.4, 17.7.5.2 Deadlock Detection — https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html',
    also: ['deadlock detection', 'victim'],
    note: 'MySQL 문서에서 롤백되는 쪽의 이름은 victim 한 낱말이다(17.7.5: "rolls back one of the transactions (the victim)"). "victim transaction", "deadlock victim"이라는 묶음은 연 페이지에서 보지 못해 쓰지 않았다.' },

  { ko: '락 대기 시간 초과', en: 'Lock wait timeout', how: 'official',
    src: 'MySQL 8.4, 17.20.5 InnoDB Error Handling("A lock wait timeout causes InnoDB to roll back the current statement...") — https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html ; 17.14 InnoDB Startup Options and System Variables의 innodb_lock_wait_timeout — https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html',
    note: '' },

  { ko: 'ER 모델(개체, 속성, 관계)', en: 'Entity-relationship model (entities, attributes, relationships)', how: 'composed',
    src: 'Microsoft Learn "Entity Data Model"("...the Entity-Relationship Model described by Peter Chen in 1976...") — https://learn.microsoft.com/en-us/dotnet/framework/data/adonet/entity-data-model ; Oracle SQL Developer Data Modeler User Guide 19.1 "Data Modeler Concepts and Usage"(entity, attribute, relation의 정의) — https://docs.oracle.com/en/database/oracle/sql-developer-data-modeler/19.1/dmdug/data-modeler-concepts-usage.html',
    also: ['entity-relationship diagram'],
    note: 'MySQL 8.4 매뉴얼과 PostgreSQL 문서에는 이 용어가 없다. 줄임말 "ER model"은 연 공식 페이지에서 그 철자로 보지 못해 풀어 쓴 이름을 골랐다. 그림은 entity-relationship diagram(Oracle 문서), MySQL Workbench Manual 9.1.1.3은 Enhanced Entity-Relationship (EER) diagram이라고 쓴다.' },

  { ko: '관계의 종류(일대일, 일대다, 다대다)', en: 'Types of relationships (one-to-one, one-to-many, many-to-many)', how: 'descriptive',
    src: 'Oracle SQL Developer Data Modeler User Guide 19.1("...with a cardinality of 1:1 (one-to-one), 1:N (one-to-many), or N:M (many-to-many).") — https://docs.oracle.com/en/database/oracle/sql-developer-data-modeler/19.1/dmdug/data-modeler-concepts-usage.html ; MySQL Glossary "relational"("relationships such as one-to-one, one-to-many, many-to-one")',
    also: ['one-to-one', 'one-to-many', 'many-to-many'],
    note: '"관계의 종류"는 정해진 용어가 아니라 풀어 쓴 말이다. 데이터 모델링에서는 이것을 relationship의 cardinality라고 부르지만(Oracle 문서), 이 사이트에서 cardinality는 컬럼의 서로 다른 값의 수를 뜻하는 용어로 이미 쓰여 이름에 넣지 않았다.' },

  { ko: '연결 테이블', en: 'Associative table', how: 'official',
    src: 'MySQL Workbench Manual, 9.1.4.1 Adding Foreign Key Relationships Using an EER Diagram("...creates an associative table with a many-to-many relationship.", "an intermediary table is created to resolve a many-to-many relationship") — https://dev.mysql.com/doc/workbench/en/wb-relationship-tools.html',
    also: ['intermediary table', 'junction table'],
    note: '영어에 이름이 여럿이다. MySQL 쪽 자료(Workbench Manual)가 쓰는 associative table을 골랐다. junction table은 Microsoft Learn의 Access 문서("...a third table that is called a junction table." — https://learn.microsoft.com/en-us/office/troubleshoot/access/define-table-relationships)에서 확인했고 널리 쓰인다. Oracle Data Modeler 문서는 reference table이라고 한다. JPA의 join table(@JoinTable)도 같은 것을 가리키지만 이번에 명세 페이지를 열어 확인하지는 않았다.' },

  { ko: 'EXPLAIN의 type', en: 'EXPLAIN join types (type column)', how: 'official',
    src: 'MySQL 8.4, 10.8.2 EXPLAIN Output Format의 "EXPLAIN Join Types"("The type column of EXPLAIN output describes how tables are joined.") — https://dev.mysql.com/doc/refman/8.4/en/explain-output.html',
    also: ['join type'],
    note: 'MySQL 문서는 이 칸의 값을 join type이라고 부른다(조인이 없는 쿼리에도). JSON 출력에서는 access_type이라는 속성 이름으로 나온다. 값 const, eq_ref, ref, range, index, ALL은 글자 그대로 둔다.' },

  { ko: 'EXPLAIN의 Extra', en: 'EXPLAIN Extra information (Extra column)', how: 'official',
    src: 'MySQL 8.4, 10.8.2 EXPLAIN Output Format의 "EXPLAIN Extra Information" — https://dev.mysql.com/doc/refman/8.4/en/explain-output.html',
    note: '값 Using where, Using index, Using filesort, Using temporary는 글자 그대로 둔다.' },

  { ko: '중첩 루프 조인', en: 'Nested-loop join', how: 'official',
    src: 'MySQL 8.4, 10.2.1.7 Nested-Loop Join Algorithms("A simple nested-loop join (NLJ) algorithm reads rows from the first table in a loop one at a time...") — https://dev.mysql.com/doc/refman/8.4/en/nested-loop-joins.html',
    also: ['NLJ'],
    note: 'MySQL은 nested-loop join(하이픈)으로 쓴다. 한국어 설명에 적힌 "Nested Loop Join"은 띄어쓰기가 다르다. Oracle은 nested loops join이라고 쓰는 것으로 알지만 그 문장은 이번에 직접 보지 못했다.' },

  { ko: '해시 조인', en: 'Hash join', how: 'official',
    src: 'MySQL 8.4, 10.2.1.4 Hash Join Optimization — https://dev.mysql.com/doc/refman/8.4/en/hash-joins.html',
    note: '같은 값끼리 잇는 조인 조건은 equi-join condition이라고 쓴다.' },

  { ko: '구동 테이블', en: 'Driving table', how: 'official',
    src: 'Oracle Database SQL Tuning Guide 21c, 9 Joins("The optimizer always tries to put the smallest row source first, making it the driving table.", "The outer table is sometimes called a driving table.") — https://docs.oracle.com/en/database/oracle/oracle-database/21/tgsql/joins.html',
    also: ['outer table'],
    note: 'MySQL 8.4 매뉴얼의 조인 관련 세 페이지(10.2.1.7, 10.2.1.4, 10.8.2)에는 driving table이라는 말이 없고 "the first table"이라고만 쓴다. driving table은 Oracle 문서의 용어이며 업계에서 두루 쓰인다. outer table은 OUTER JOIN의 outer와 헷갈릴 수 있다.' },

  { ko: '문서 모델(문서 데이터베이스)', en: 'Document model (document database)', how: 'official',
    src: 'MongoDB Manual "Data Modeling"("...the document model...", "...a document database like MongoDB...") — https://www.mongodb.com/docs/manual/data-modeling/ ; MongoDB Manual "Documents" — https://www.mongodb.com/docs/manual/core/document/',
    note: '문서 안에 넣은 문서는 embedded document(같은 문서에서 확인).' },

  { ko: '고정 스키마와 유연한 스키마', en: 'Fixed schema and flexible schema', how: 'composed',
    src: 'MongoDB Manual "Data Modeling"("MongoDB’s flexible schema lets you...", "...in a relational database, a fixed schema requires more planning upfront...") — https://www.mongodb.com/docs/manual/data-modeling/ ; MySQL Glossary "schema"',
    also: ['fixed schema', 'flexible schema'],
    note: '검사 기능은 같은 페이지에서 schema validation이라고 부른다.' },

  { ko: 'RANGE 파티션과 HASH 파티션', en: 'RANGE partitioning and HASH partitioning', how: 'composed',
    src: 'MySQL 8.4, 26.2 Partitioning Types — https://dev.mysql.com/doc/refman/8.4/en/partitioning-types.html',
    also: ['RANGE partitioning', 'HASH partitioning'],
    note: '방식의 이름은 partitioning, 나뉜 조각 하나는 partition이다. 설명의 "파티션 키"에 해당하는 말로 이 장에서 본 것은 partitioning expression, partitioning function이고, "partitioning key"는 연 페이지(26.1, 26.2, 26.4)에서 보지 못했다.' },

  { ko: '파티션 프루닝', en: 'Partition pruning', how: 'official',
    src: 'MySQL 8.4, 26.4 Partition Pruning — https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html',
    also: ['pruning'],
    note: '' },

  { ko: 'SELECT 문의 논리적 처리 순서', en: 'Logical processing order of the SELECT statement', how: 'official',
    src: 'Microsoft Learn, SELECT (Transact-SQL)의 "Logical processing order of the SELECT statement" — https://learn.microsoft.com/en-us/sql/t-sql/queries/select-transact-sql',
    also: ['logical processing order', 'binding order'],
    note: 'MySQL과 PostgreSQL 문서에는 이 순서에 붙인 이름이 없어, 같은 내용을 이 제목으로 다루는 SQL Server 문서의 표현을 썼다. 거기 적힌 순서는 FROM, ON, JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, TOP으로 한국어 설명과 맞는다(TOP은 MySQL의 LIMIT 자리).' },

  { ko: '컬럼 별칭(AS)', en: 'Column alias (AS)', how: 'official',
    src: 'MySQL 8.4, B.3.4.4 Problems with Column Aliases — https://dev.mysql.com/doc/refman/8.4/en/problems-with-alias.html ; 15.2.13 SELECT Statement — https://dev.mysql.com/doc/refman/8.4/en/select.html',
    also: ['alias'],
    note: 'SELECT 절의 목록은 select list라고 부른다.' },

  { ko: '집계 함수', en: 'Aggregate function', how: 'official',
    src: 'MySQL 8.4, 14.19.1 Aggregate Function Descriptions — https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html',
    note: '' },

  { ko: '스칼라 서브쿼리', en: 'Scalar subquery', how: 'official',
    src: 'MySQL 8.4, 15.2.15.1 The Subquery as Scalar Operand("...a subquery is a scalar subquery that returns a single value.") — https://dev.mysql.com/doc/refman/8.4/en/scalar-subqueries.html',
    note: '' },

  { ko: '상관 서브쿼리', en: 'Correlated subquery', how: 'official',
    src: 'MySQL 8.4, 15.2.15.7 Correlated Subqueries — https://dev.mysql.com/doc/refman/8.4/en/correlated-subqueries.html',
    note: '' },

  { ko: 'IN과 EXISTS', en: 'IN and EXISTS', how: 'composed',
    src: 'MySQL 8.4, 15.2.15 Subqueries의 하위 절 "Subqueries with ANY, IN, or SOME" — https://dev.mysql.com/doc/refman/8.4/en/subqueries.html ; 15.2.15.6 Subqueries with EXISTS or NOT EXISTS — https://dev.mysql.com/doc/refman/8.4/en/exists-and-not-exists-subqueries.html',
    note: 'SQL 키워드라 글자 그대로 둔다.' },

  { ko: 'NULL과 3값 논리', en: 'NULL and three-valued logic', how: 'composed',
    src: 'MySQL Glossary "NULL" — https://dev.mysql.com/doc/refman/8.4/en/glossary.html ; PostgreSQL 9.1 Logical Operators("SQL uses a three-valued logic system with true, false, and null, which represents unknown.") — https://www.postgresql.org/docs/current/functions-logical.html',
    also: ['three-valued logic'],
    note: 'three-valued는 하이픈으로 잇는다. MySQL 문서에는 three-valued logic이라는 말이 없고(5.3.4.6 Working with NULL Values에서 확인), CHECK 제약 절에서 TRUE, FALSE, UNKNOWN이라는 세 값의 이름을 쓴다.' },

  { ko: '저장 프로시저', en: 'Stored procedure', how: 'official',
    src: 'MySQL 8.4, 27.2 Using Stored Routines("MySQL supports stored routines (procedures and functions).") — https://dev.mysql.com/doc/refman/8.4/en/stored-routines.html ; MySQL Glossary "stored routine"("A stored procedure or function.")',
    note: 'stored routine은 stored procedure와 stored function을 아우르는 더 넓은 말이라 also에 넣지 않았다.' },

  { ko: '트리거', en: 'Trigger', how: 'official',
    src: 'MySQL 8.4, 27.3 Using Triggers("A trigger is a named database object that is associated with a table, and that activates when a particular event occurs for the table.") — https://dev.mysql.com/doc/refman/8.4/en/triggers.html',
    note: '트리거가 실행되는 것을 MySQL 문서는 activate라고 쓴다.' },

  { ko: 'CHECK 제약', en: 'CHECK constraint', how: 'official',
    src: 'MySQL 8.4, 15.1.20.6 CHECK Constraints — https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html',
    note: 'PostgreSQL 5.5.1은 소문자로 check constraint라고 쓴다.' },

  { ko: '윈도우 함수', en: 'Window function', how: 'official',
    src: 'MySQL 8.4, 14.20.2 Window Function Concepts and Syntax — https://dev.mysql.com/doc/refman/8.4/en/window-functions-usage.html ; PostgreSQL 3.5 Window Functions — https://www.postgresql.org/docs/current/tutorial-window.html',
    note: '계산 대상인 지금 행은 current row, OVER (...)는 OVER clause.' },

  { ko: 'ROW_NUMBER, RANK, DENSE_RANK', en: 'ROW_NUMBER, RANK, DENSE_RANK', how: 'composed',
    src: 'MySQL 8.4, 14.20.1 Window Function Descriptions — https://dev.mysql.com/doc/refman/8.4/en/window-function-descriptions.html',
    note: '함수 이름이라 글자 그대로 둔다. 동점인 행을 MySQL 문서는 peers라고 부르고("Peers are considered ties"), 순위가 건너뛰는 것을 gaps라고 한다.' },

  { ko: 'PARTITION BY', en: 'PARTITION BY', how: 'official',
    src: 'MySQL 8.4, 14.20.2 Window Function Concepts and Syntax("A PARTITION BY clause indicates how to divide the query rows into groups.") — https://dev.mysql.com/doc/refman/8.4/en/window-functions-usage.html',
    note: '나뉜 묶음 하나는 partition이다(테이블 파티셔닝의 partition과 낱말이 같다).' },

  { ko: 'LAG와 LEAD', en: 'LAG and LEAD', how: 'composed',
    src: 'MySQL 8.4, 14.20.1 Window Function Descriptions — https://dev.mysql.com/doc/refman/8.4/en/window-function-descriptions.html',
    note: '함수 이름이라 글자 그대로 둔다.' },
];
