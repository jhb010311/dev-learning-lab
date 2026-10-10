// 아키텍처·운영(arch) 용어의 영어 대조표. ko는 설명집의 용어 이름과 글자 하나까지 같아야 한다.
module.exports = [
  { ko: 'Cache-Aside 패턴', en: 'Cache-aside pattern', how: 'official',
    src: 'Azure Architecture Center, "Cache-Aside Pattern" — https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside ; AWS Whitepaper "Database Caching Strategies Using Redis", "Caching patterns" — https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html',
    also: ['lazy loading'],
    note: 'Microsoft는 "the Cache-Aside pattern", AWS는 문장 안에서 "cache-aside"(소문자)와 제목 "Cache-Aside (Lazy Loading)"를 쓴다. 하이픈을 넣는다. AWS: "Two common approaches are cache-aside or lazy loading (a reactive approach) and write-through (a proactive approach)."' },

  { ko: '캐시 스탬피드', en: 'Cache stampede', how: 'official',
    src: 'Microsoft Learn, "Overview of caching in ASP.NET Core" — https://learn.microsoft.com/en-us/aspnet/core/performance/caching/overview',
    note: '"Cache stampede happens when a frequently used cache entry is revoked, and too many requests try to repopulate the same cache entry at the same time." TERMBASE.md의 목록에 있는 자료(AWS ElastiCache 문서, AWS 백서, Redis 문서)에서는 이 말을 찾지 못해 Microsoft의 공식 문서로 확인했다. 같은 문서는 thundering herd를 "similar"하다고만 하므로 같은 말로 묶지 않았다.' },

  { ko: '메시지 큐', en: 'Message queue', how: 'official',
    src: 'AWS, "What is a Message Queue?" — https://aws.amazon.com/message-queue/',
    note: '"A message queue is a form of asynchronous service-to-service communication". 보내는 쪽은 producer, 받는 쪽은 consumer.' },

  { ko: 'Kafka의 토픽, 파티션, 오프셋', en: 'Kafka topics, partitions, and offsets', how: 'composed',
    src: 'Apache Kafka 4.3 문서, "Introduction" — https://kafka.apache.org/43/getting-started/introduction/ ; KafkaConsumer Javadoc, "Offsets and Consumer Position" — https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html',
    note: '"Events are organized and durably stored in topics." "Topics are partitioned". "Kafka maintains a numerical offset for each record in a partition." Kafka 문서는 메시지를 event라고 부르고 record, message도 같은 뜻으로 쓴다("It is also called record or message in the documentation").' },

  { ko: '컨슈머 그룹과 리밸런싱', en: 'Consumer groups and rebalancing', how: 'composed',
    src: 'KafkaConsumer Javadoc, "Consumer Groups and Topic Subscriptions" — https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html ; Apache Kafka 4.3 문서, "Design" — https://kafka.apache.org/43/design/design/',
    also: ['rebalance', 'group rebalance'],
    note: '"Kafka uses the concept of consumer groups to allow a pool of processes to divide the work of consuming ..." "This is known as rebalancing the group". Design 문서와 지표 이름은 명사로 rebalance를 쓴다("no rebalance will be triggered", "The total number of group rebalances participated").' },

  { ko: 'Consumer Lag', en: 'Consumer lag', how: 'official',
    src: 'Apache Kafka 4.3 문서, "Basic Kafka Operations" — https://kafka.apache.org/43/operations/basic-kafka-operations/ ; "Monitoring" — https://kafka.apache.org/43/operations/monitoring/',
    also: ['lag'],
    note: '문서에는 "consumer lag"(소문자)로 나오고, kafka-consumer-groups 출력의 열 이름은 LAG, 지표 이름은 records-lag, records-lag-max("The maximum lag in terms of number of records for any partition in this window")다.' },

  { ko: '메시지 전달 보장', en: 'Message delivery guarantees', how: 'official',
    src: 'Apache Kafka 4.3 문서, "Design"의 "Message Delivery Semantics" 절 — https://kafka.apache.org/43/design/design/',
    also: ['message delivery semantics', 'delivery semantics'],
    note: '"Clearly there are multiple possible message delivery guarantees that could be provided:" 절의 제목은 Message Delivery Semantics다. 세 수준은 목록에서 "At most once", "At least once", "Exactly once"로, 문장 안에서 꾸미는 말로 쓸 때는 at-most-once, at-least-once, exactly-once delivery로 하이픈을 넣는다.' },

  { ko: 'Pub/Sub', en: 'Pub/Sub', how: 'official',
    src: 'Redis 문서, "Redis Pub/sub" — https://redis.io/docs/latest/develop/pubsub/',
    also: ['publish/subscribe'],
    note: '본문 표기는 Pub/Sub("Redis\' Pub/Sub exhibits at-most-once message delivery semantics."), 풀어 쓴 이름은 "Publish/Subscribe messaging paradigm". 보내는 쪽은 publisher, 받는 쪽은 subscriber, 주제는 channel.' },

  { ko: '부하 테스트', en: 'Load testing', how: 'official',
    src: 'Grafana k6 문서, "Load test types" — https://grafana.com/docs/k6/latest/testing-guides/test-types/ ; Apache JMeter — https://jmeter.apache.org/',
    also: ['load test'],
    note: 'k6: "To prepare for these performance risks, teams use load testing." JMeter: "designed to load test functional behavior and measure performance". k6는 load test의 갈래로 average-load test, stress test, spike test 등을 나누고, 평소보다 큰 부하로 한계를 보는 것을 stress test라고 부른다("assess how a system performs at its limits when load exceeds the expected average"). 한국어 설명은 이 갈래들을 아우르는 넓은 뜻의 load testing이다.' },

  { ko: '모놀리식과 MSA(마이크로서비스)', en: 'Monolithic architecture and microservice architecture', how: 'composed',
    src: 'microservices.io "Pattern: Monolithic Architecture" — https://microservices.io/patterns/monolithic.html ; Martin Fowler, "Microservices" — https://martinfowler.com/articles/microservices.html',
    also: ['microservices', 'monolith', 'monolithic application', 'microservices architecture'],
    note: '약어 MSA는 영어권 자료에서 보지 못했다(한국에서 굳은 줄임말). microservices.io는 "microservice architecture"(단수), Fowler는 "Microservice Architecture"와 "microservices architectural style", AWS는 "microservices architecture"를 쓴다. Fowler: "This server-side application is a monolith - a single logical executable".' },

  { ko: '분산 트랜잭션과 Saga 패턴', en: 'Distributed transactions and the saga pattern', how: 'composed',
    src: 'microservices.io "Pattern: Saga" — https://microservices.io/patterns/data/saga.html ; AWS Prescriptive Guidance, "Saga choreography pattern" — https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-choreography.html',
    also: ['saga'],
    note: '두 자료 모두 문장 안에서 saga를 소문자로 쓴다("Implement each business transaction that spans multiple services as a saga. A saga is a sequence of local transactions.", "The saga pattern lacks transaction isolation"). 2단계 커밋은 two-phase commit (2PC), 두 방식의 이름은 choreography와 orchestration.' },

  { ko: '보상 트랜잭션', en: 'Compensating transaction', how: 'official',
    src: 'microservices.io "Pattern: Saga" — https://microservices.io/patterns/data/saga.html',
    also: ['compensatory transaction'],
    note: '"If a local transaction fails because it violates a business rule then the saga executes a series of compensating transactions ...". AWS Prescriptive Guidance는 compensatory transaction이라고 쓴다.' },

  { ko: 'Transactional Outbox 패턴', en: 'Transactional outbox pattern', how: 'official',
    src: 'microservices.io "Pattern: Transactional outbox" — https://microservices.io/patterns/data/transactional-outbox.html ; AWS Prescriptive Guidance, "Transactional outbox pattern" — https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html',
    note: 'outbox는 소문자로 쓴다. 메시지를 담는 테이블은 outbox table(AWS) 또는 message outbox(microservices.io), 읽어서 보내는 쪽은 message relay, 보내는 곳은 message broker.' },

  { ko: '서킷 브레이커', en: 'Circuit breaker', how: 'official',
    src: 'Martin Fowler, "Circuit Breaker" — https://martinfowler.com/bliki/CircuitBreaker.html ; Resilience4j 문서, "CircuitBreaker" — https://resilience4j.readme.io/docs/circuitbreaker',
    also: ['Circuit Breaker pattern', 'CircuitBreaker'],
    note: '"You wrap a protected function call in a circuit breaker object, which monitors for failures." 세 상태는 closed, open, half-open(Resilience4j의 상수 이름은 CLOSED, OPEN, HALF_OPEN). Resilience4j는 모듈 이름으로 붙여 쓴 CircuitBreaker를 쓴다.' },

  { ko: 'Strangler Fig 패턴', en: 'Strangler fig pattern', how: 'official',
    src: 'AWS Prescriptive Guidance, "Strangler fig pattern" — https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html ; Martin Fowler, "Strangler Fig" — https://martinfowler.com/bliki/StranglerFigApplication.html',
    also: ['Strangler Fig', 'Strangler Fig Application', 'Strangler Application'],
    note: 'Fowler의 글 제목은 "Strangler Fig"이고 글 안에 pattern이라는 말을 붙인 꼴은 없다(전에는 "Strangler Application", "Strangler Fig Application"). "pattern"을 붙인 이름은 AWS 문서에서 확인했다: "The strangler fig pattern helps migrate a monolithic application to a microservices architecture incrementally, with reduced transformation risk and business disruption."' },

  { ko: '컨테이너와 이미지', en: 'Containers and images', how: 'composed',
    src: 'Docker 문서, "What is Docker?"(Docker overview) — https://docs.docker.com/get-started/docker-overview/',
    note: '"An image is a read-only template with instructions for creating a Docker container." "A container is a runnable instance of an image."' },

  { ko: '컨테이너와 가상 머신의 차이', en: 'Containers versus virtual machines', how: 'descriptive',
    src: 'Docker 문서, "What is a container?"의 "Containers versus virtual machines (VMs)" 절 — https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/',
    note: '정해진 용어가 아니라 비교를 가리키는 풀어 쓴 이름이어서 Docker 문서의 절 제목을 따랐다. "a VM is an entire operating system with its own kernel, hardware drivers, programs, and applications." "A container is simply an isolated process with all of the files it needs to run."' },

  { ko: '네임스페이스와 cgroups', en: 'Namespaces and cgroups', how: 'composed',
    src: 'Docker 문서, "Docker Engine security"의 "Kernel namespaces", "Control groups" 절 — https://docs.docker.com/engine/security/ ; "Resource constraints" — https://docs.docker.com/engine/containers/resource_constraints/',
    also: ['control groups', 'kernel namespaces'],
    note: '"Namespaces provide the first and most straightforward form of isolation." Control groups: "They implement resource accounting and limiting." 줄임말 cgroups는 Resource constraints 페이지에서 확인했다. 쿠버네티스의 Namespace와는 다른 것이다.' },

  { ko: 'Kubernetes', en: 'Kubernetes', how: 'official',
    src: 'Kubernetes 문서, "Overview" — https://kubernetes.io/docs/concepts/overview/',
    note: '"Kubernetes is a portable, extensible, open source platform for managing containerized workloads and services that facilitate both declarative configuration and automation." 설명의 "원하는 상태"는 desired state, "죽으면 다시 띄우고"는 Self-healing.' },

  { ko: 'Pod, Deployment, Service', en: 'Pod, Deployment, and Service', how: 'composed',
    src: 'Kubernetes 문서, "Pods" — https://kubernetes.io/docs/concepts/workloads/pods/ ; "Deployments" — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ ; "Service" — https://kubernetes.io/docs/concepts/services-networking/service/',
    note: '쿠버네티스 문서는 API 객체의 이름을 문장 안에서도 대문자로 시작한다(Pod, Deployment, Service, ReplicaSet). "Pods are the smallest deployable units of computing that you can create and manage in Kubernetes." "A Deployment provides declarative updates for Pods and ReplicaSets." "a Service is a method for exposing a network application that is running as one or more Pods in your cluster."' },

  { ko: '롤링, 블루-그린, 카나리 배포', en: 'Rolling, blue-green, and canary deployments', how: 'composed',
    src: 'AWS Whitepaper "Overview of Deployment Options on AWS", "Rolling deployments" — https://docs.aws.amazon.com/whitepapers/latest/overview-deployment-options/rolling-deployments.html ; Martin Fowler, "Blue Green Deployment" — https://martinfowler.com/bliki/BlueGreenDeployment.html ; Kubernetes 문서, "Deployments"의 "Canary deployments" 절 — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
    also: ['rolling update', 'blue/green deployment', 'canary release'],
    note: '쿠버네티스는 rolling update("The Deployment updates Pods in a rolling update fashion"), AWS는 rolling deployment와 blue/green deployment(빗금), Fowler는 blue-green deployment(하이픈)와 canary release("Sometimes it is referred to as a phased rollout or an incremental rollout")를 쓴다.' },

  { ko: 'Graceful Shutdown', en: 'Graceful shutdown', how: 'official',
    src: 'Spring Boot Reference, "Graceful Shutdown" — https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html',
    note: '"This stop processing uses a timeout which provides a grace period during which existing requests will be allowed to complete but no new requests will be permitted."' },

  { ko: '헬스 체크(Liveness, Readiness)', en: 'Health check (liveness, readiness)', how: 'composed',
    src: 'Kubernetes 문서, "Liveness, Readiness, and Startup Probes" — https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/ ; "Overview" — https://kubernetes.io/docs/concepts/overview/',
    also: ['liveness probe', 'readiness probe'],
    note: '쿠버네티스의 정식 이름은 probe다: "Liveness probes determine when to restart a container." "Readiness probes determine when a container is ready to accept traffic." health check라는 말은 Overview의 Self-healing 설명("kills containers that don\'t respond to your user-defined health check")에서 확인했다.' },

  { ko: '관측성(로그, 지표, 추적)', en: 'Observability (logs, metrics, traces)', how: 'composed',
    src: 'OpenTelemetry 문서, "Observability primer" — https://opentelemetry.io/docs/concepts/observability-primer/',
    note: '"Observability lets you understand a system from the outside by letting you ask questions about that system ..." "the application code must emit signals such as traces, metrics, and logs". OpenTelemetry는 셋을 signals라고 부르며 "three pillars"라는 말은 이 페이지에 없다. "지표"는 metrics, "추적"은 traces.' },

  { ko: '분산 추적(Trace ID, Span)', en: 'Distributed tracing (trace ID, span)', how: 'composed',
    src: 'OpenTelemetry 문서, "Traces" — https://opentelemetry.io/docs/concepts/signals/traces/ ; "Observability primer" — https://opentelemetry.io/docs/concepts/observability-primer/',
    note: '추적 하나를 가리키는 말은 distributed trace 또는 줄여서 trace다. "Distributed tracing lets you observe requests as they propagate through complex, distributed systems." "A span represents a unit of work or operation." OpenTelemetry의 표기는 Trace ID, Span ID(Span Context의 항목). 추적 ID를 서비스 사이에 전달하는 일은 Context Propagation.' },

  { ko: 'APM', en: 'APM', how: 'official',
    src: 'OpenTelemetry 문서, "Glossary"의 APM 항목 — https://opentelemetry.io/docs/concepts/glossary/',
    also: ['Application Performance Monitoring'],
    note: '"Application Performance Monitoring is about monitoring software applications, their performance ...". 본문에서 처음 나올 때는 풀어 쓴 이름을 함께 적는 것이 좋다.' },

  { ko: 'MDC', en: 'MDC', how: 'official',
    src: 'Logback Manual, "Chapter 8: Mapped Diagnostic Context" — https://logback.qos.ch/manual/mdc.html',
    also: ['Mapped Diagnostic Context'],
    note: '"The MDC manages contextual information on a per thread basis." 로그 형식에서 값을 찍는 자리는 %X conversion specifier.' },

  { ko: '단위 테스트와 통합 테스트', en: 'Unit tests and integration tests', how: 'composed',
    src: 'Spring Framework Reference, "Unit Testing" — https://docs.spring.io/spring-framework/reference/testing/unit.html ; "Integration Testing" — https://docs.spring.io/spring-framework/reference/testing/integration.html',
    also: ['unit testing', 'integration testing'],
    note: '"True unit tests typically run extremely quickly, as there is no runtime infrastructure to set up." 통합 테스트에 대해: "Such tests are slower to run than unit tests".' },

  { ko: 'Git의 fetch, pull, push', en: 'Git fetch, pull, and push', how: 'composed',
    src: 'Git 문서, git-fetch — https://git-scm.com/docs/git-fetch ; git-pull — https://git-scm.com/docs/git-pull ; git-push — https://git-scm.com/docs/git-push',
    also: ['git fetch', 'git pull', 'git push'],
    note: '명령어 이름은 소문자 그대로 쓴다. "git-fetch - Download objects and refs from another repository", "git-pull - Fetch from and integrate with another repository or a local branch", "git-push - Update remote refs along with associated objects". fetch가 갱신하는 것은 remote-tracking branches.' },

  { ko: 'merge와 rebase', en: 'Merge and rebase', how: 'composed',
    src: 'Git 문서, git-merge — https://git-scm.com/docs/git-merge ; git-rebase — https://git-scm.com/docs/git-rebase',
    also: ['git merge', 'git rebase', 'rebasing'],
    note: '이름의 첫 글자만 대문자로 했고, 본문에서 명령어로 쓸 때는 소문자 git merge, git rebase다. "git-merge - Join two or more development histories together", "git-rebase - Reapply commits on top of another base tip". 병합 커밋은 merge commit, 포인터만 옮기는 경우는 fast-forward(하이픈).' },

  { ko: 'Git 충돌(Conflict)', en: 'Merge conflict', how: 'official',
    src: 'Pro Git(git-scm.com), "Basic Branching and Merging"의 "Basic Merge Conflicts" 절 — https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging ; Git 문서, git-merge — https://git-scm.com/docs/git-merge',
    also: ['conflict'],
    note: 'Git 문서는 rebase 중의 충돌도 merge conflict라고 부른다("If there is a merge conflict during this process, git rebase will stop at the first problematic commit and leave conflict markers."). git-merge 문서는 줄여서 conflict라고만 쓴다. 충돌 표시는 conflict markers(Pro Git은 conflict-resolution markers).' },

  { ko: 'Git Flow와 GitHub Flow', en: 'Git-flow and GitHub Flow', how: 'composed',
    src: 'Martin Fowler, "Patterns for Managing Source Code Branches"의 "Git-flow", "GitHub Flow" 절 — https://martinfowler.com/articles/branching-patterns.html ; GitHub Docs, "GitHub flow" — https://docs.github.com/en/get-started/using-github/github-flow',
    also: ['GitHub flow', 'git-flow'],
    note: '표기가 자료마다 다르다. Fowler는 "Git-flow"(문장 안에서 git-flow)와 "GitHub Flow", GitHub 문서는 "GitHub flow"(소문자 f)로 쓴다. 한 글에서 둘을 함께 다루는 Fowler의 표기를 따랐다. "Git Flow"처럼 띄어 쓴 꼴은 이번에 연 자료에서는 보지 못했다.' },

  { ko: '코드 리뷰와 Pull Request', en: 'Code review and pull requests', how: 'composed',
    src: 'GitHub Docs, "About pull requests" — https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests ; Google Engineering Practices, "Code Review Developer Guide" — https://google.github.io/eng-practices/review/',
    also: ['pull request review'],
    note: 'pull request는 문장 안에서 소문자로 쓴다: "Pull requests are proposals to merge code changes into a project." Google: "A code review is a process where someone other than the author(s) of a piece of code examines that code." GitHub는 PR 안의 검토를 pull request review라고 부른다. 줄임말 PR은 한국어 설명에 나오는 것이며 이번에 연 영어 자료에서 따로 확인하지는 않았다.' },
];
