// English names for the table of contents. The structure (which labs are in which group, and in what order) is taken
// from src/curriculum.js, so only names are given here: per category a name, a description, the reference list,
// the group names in the same order as in src/curriculum.js, and `items` for labs that have their own list title there.
// Titles of books that have no English edition are left in their original language.
Lab.site({
  name: 'Dev Learning Lab',
  desc: 'A free lab for learning Java, Spring, JPA, database, networking, and security concepts by picking a question and running it',
  other: ['한국어', '../'],
});
Lab.names({
  java: { name: 'Java', desc: 'From syntax to object-oriented programming, collections, threads, and the JVM. See what happens inside when code runs.',
    refs: ['자바의 정석 3판 (in Korean)', 'Effective Java, 3rd Edition', 'Modern Java in Action', 'JVM 밑바닥까지 파헤치기 (Korean edition of a Chinese book)'],
    groups: ['Basic syntax', 'Classes and objects', 'Commonly used classes', 'Exceptions', 'Generics, enums, and annotations', 'Collections', 'Lambdas and streams', 'Threads and concurrency', 'JVM', 'I/O'] },
  spring: { name: 'Spring', desc: 'The container and dependency injection, AOP and transactions, the path a web request takes, and what Spring Boot does for you.',
    refs: ['토비의 스프링 3.1 (in Korean)', '스프링 부트 핵심 가이드 (in Korean)', 'Inflearn Spring roadmap (order of a Korean online course)'],
    groups: ['IoC container and DI', 'AOP and proxies', 'Data access and transactions', 'Web MVC', 'Spring Boot', 'Other features'] },
  jpa: { name: 'JPA', desc: 'What it means to store objects in tables: the persistence context, relationships, lazy loading, and when and how many queries are sent.',
    refs: ['자바 ORM 표준 JPA 프로그래밍 (in Korean)', 'Inflearn JPA roadmap (order of a Korean online course)', 'Hibernate ORM User Guide'],
    groups: ['Getting started', 'Persistence context', 'Entity mapping', 'Relationships', 'Proxies and fetching', 'Queries', 'Web applications and performance'],
    items: { stock: 'Optimistic and pessimistic locking' } },
  db: { name: 'Database', desc: 'Table design and SQL, indexes and execution plans, transactions and locking, replication and distribution. See how data is stored and read.',
    refs: ['Real MySQL 8.0 (in Korean)', 'SQL 레벨업 (Korean edition of a Japanese book)', '데이터베이스 개론 (in Korean)', 'Designing Data-Intensive Applications'],
    groups: ['Relational model and design', 'SQL', 'Indexes and execution plans', 'Transactions and locking', 'Storage and recovery', 'Scaling and distribution'],
    items: { redis: 'Redis, a key-value store' } },
  network: { name: 'Networking', desc: 'From typing an address to receiving the response: DNS, TCP, HTTP, TLS, and the machines in between.',
    refs: ['성공과 실패를 결정하는 1%의 네트워크 원리 (Korean edition of a Japanese book)', 'HTTP: The Definitive Guide', '모두의 네트워크 기초 (in Korean)', 'Computer Networking: A Top-Down Approach'],
    groups: ['The big picture', 'Addresses and names', 'Transport layer', 'HTTP', 'Secure connections', 'In front of the web server'] },
  sec: { name: 'Security', desc: 'Authentication (who you are), authorization (what you are allowed to do), web attacks and defenses, and cryptography.',
    refs: ['OWASP Top 10:2025', 'Spring Security in Action', 'Web Security for Developers', 'RFC 6749 (OAuth 2.0)', 'RFC 7519 (JWT)'],
    groups: ['Authentication', 'Authorization', 'Web attacks and defenses', 'Cryptography'] },
  arch: { name: 'Architecture and operations', desc: 'Topics for when traffic grows, when a system is split into services, and when you deploy and monitor it.',
    groups: ['High traffic', 'Messaging and asynchronous processing', 'Splitting into services', 'Deployment and operations', 'Observability', 'Collaboration'] },
});
