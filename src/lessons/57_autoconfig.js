Lab.register({
  id: 'autoconf', nav: '스프링 부트 자동 설정', cat: '스프링', mode: 'step',
  title: '의존성만 추가했는데 왜 빈이 생기나',
  intro: '스프링 부트는 애플리케이션이 뜰 때 미리 준비된 설정 클래스들을 하나씩 살펴보며 "이 조건이 맞으면 이 빈을 등록한다"를 판단합니다. 조건은 주로 클래스패스에 어떤 라이브러리가 있는지와 개발자가 같은 빈을 직접 등록했는지입니다.',
  terms: ['Spring Boot 자동 설정(Auto-configuration)', '스타터(Starter)', '내장 서버', '@Configuration과 @Bean', '컴포넌트 스캔'], ranks: ['boot', 'bean', 'di'],
  controls: [
    { id: 'web', label: 'spring-boot-starter-webmvc 의존성', type: 'check', value: true },
    { id: 'myOm', label: 'JsonMapper 빈을 직접 등록했다', type: 'check', value: false, show: function (c) { return c.web; } },
    { id: 'jpa', label: 'spring-boot-starter-data-jpa 의존성', type: 'check', value: true },
    { id: 'db', label: 'DB 드라이버', type: 'select', value: 'mysql', options: [['h2', 'H2 (내장형 DB)'], ['mysql', 'MySQL 드라이버']], show: function (c) { return c.jpa; } },
    { id: 'url', label: 'spring.datasource.url을 설정했다', type: 'check', value: true, show: function (c) { return c.jpa; } },
    { id: 'myDs', label: 'DataSource 빈을 직접 등록했다', type: 'check', value: false, show: function (c) { return c.jpa; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '웹과 JPA 스타터에 MySQL 드라이버와 spring.datasource.url만 두고 기동하면 어떤 빈이 생기나', d: '웹과 JPA 스타터. 직접 등록한 빈 없이 필요한 빈이 모두 생깁니다.', v: { web: true, myOm: false, jpa: true, db: 'mysql', url: true, myDs: false } },
    { t: 'DB 주소를 빼먹으면', q: 'spring.datasource.url 설정을 빼면', d: 'MySQL 드라이버인데 접속 주소가 없습니다. 기동에 실패합니다.', v: { web: true, myOm: false, jpa: true, db: 'mysql', url: false, myDs: false } },
    { t: 'H2라면 주소가 없어도', q: 'DB 드라이버를 내장형 DB인 H2로 바꾸고 spring.datasource.url 설정을 빼면', d: '내장형 DB를 발견하면 메모리 DB를 알아서 만들어 줍니다.', v: { web: true, myOm: false, jpa: true, db: 'h2', url: false, myDs: false } },
    { t: 'DataSource를 직접 등록하면', q: 'DataSource 빈을 직접 등록하면', d: '자동 설정이 물러나고 내가 만든 것을 씁니다.', v: { web: true, myOm: false, jpa: true, db: 'mysql', url: true, myDs: true } },
    { t: 'JsonMapper를 직접 등록하면', q: 'JsonMapper 빈을 직접 등록하면', d: '부트가 만들어 주던 JsonMapper는 등록되지 않습니다.', v: { web: true, myOm: true, jpa: true, db: 'mysql', url: true, myDs: false } },
    { t: '웹 스타터를 빼면', q: 'spring-boot-starter-webmvc 의존성을 빼면', d: '톰캣도 DispatcherServlet도 생기지 않습니다.', v: { web: false, myOm: false, jpa: true, db: 'mysql', url: true, myDs: false } },
  ],
  code: function (c) {
    var dep = [];
    if (c.web) dep.push("    implementation 'org.springframework.boot:spring-boot-starter-webmvc'");
    if (c.jpa) { dep.push("    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'"); dep.push(c.db === 'h2' ? "    runtimeOnly 'com.h2database:h2'" : "    runtimeOnly 'com.mysql:mysql-connector-j'"); }
    var s = '// build.gradle\ndependencies {\n' + (dep.length ? dep.join('\n') : "    implementation 'org.springframework.boot:spring-boot-starter'") + '\n}\n';
    if (c.jpa && c.url) s += '\n# application.yml\nspring.datasource.url: jdbc:' + (c.db === 'h2' ? 'h2:mem:shop' : 'mysql://localhost:3306/shop') + '\n';
    if ((c.jpa && c.myDs) || (c.web && c.myOm)) s += '\n// MyConfig.java (예시로 만든 설정 클래스, import는 생략)\n@Configuration\nclass MyConfig {\n' + (c.jpa && c.myDs ? '    @Bean DataSource dataSource() {\n        HikariDataSource ds = new HikariDataSource();\n        ds.setJdbcUrl("jdbc:' + (c.db === 'h2' ? 'h2:mem:shop' : 'mysql://localhost:3306/shop') + '");\n        return ds;\n    }\n' : '') + (c.web && c.myOm ? '    @Bean JsonMapper jsonMapper() { return JsonMapper.builder().build(); }\n' : '') + '}\n';
    return s + '\n// DataSourceAutoConfiguration에 붙은 조건 (필요한 부분만 남김)\n// @ConditionalOnClass({DataSource.class, EmbeddedDatabaseType.class})\n//   DataSource는 JDK 표준이라 늘 있으므로, spring-jdbc가 있는지를 가름\n// @ConditionalOnMissingBean({DataSource.class, XADataSource.class})\n//   직접 등록한 DataSource가 없을 때만 풀을 만듦 (중첩 설정 클래스에 붙음)';
  },
  label: function (c) { return (c.web ? 'web' + (c.myOm ? '(JsonMapper 직접)' : '') : '') + (c.web && c.jpa ? ' + ' : '') + (c.jpa ? 'jpa·' + c.db + (c.url ? '' : '·주소 없음') + (c.myDs ? '(DataSource 직접)' : '') : '') || '스타터 없음'; },
  columns: ['기동 결과', '자동 등록된 빈', '내가 등록해서 대신 쓰인 빈', '적용되지 않은 설정'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], auto = 0, mine = 0, skip = 0, failed = false;
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice() } }); }
    function row(conf, cond, res, cls) { rows.push({ cells: [conf, cond, { v: res, cls: cls }] }); if (cls === 'good') auto++; if (cls === 'hot') mine++; if (cls === '') skip++; }
    push('애플리케이션이 시작됩니다. @SpringBootApplication에 붙어 있는 @EnableAutoConfiguration이, 클래스패스의 스프링 부트 jar마다 적혀 있는 자동 설정 클래스 목록을 모아 불러옵니다. 스프링 부트 4는 자동 설정을 기술마다 모듈(jar)로 나눠 두어서, 그 기술의 의존성을 추가해야 자동 설정이 목록에 들어옵니다. 내가 만든 @Configuration과 @Component가 먼저 등록되고, 그다음에 자동 설정들이 하나씩 조건을 평가받습니다.', '');
    if (c.web) { row('내장 서버 설정', '클래스패스에 Tomcat 있음', '내장 톰캣 등록 (8080 포트)', 'good'); push('내장 서버 자동 설정: web 스타터가 톰캣 라이브러리를 함께 가져왔습니다. 클래스패스에 톰캣이 있으므로 내장 톰캣을 띄우는 빈을 등록합니다. 그래서 별도의 WAS 설치 없이 jar 하나로 실행됩니다.', 'good');
      row('DispatcherServlet 설정', '클래스패스에 스프링 MVC 있음', 'DispatcherServlet 등록', 'good'); push('스프링 MVC 자동 설정: DispatcherServlet 클래스가 있으므로 DispatcherServlet과 MVC 기본 구성 요소(메시지 컨버터, 핸들러 매핑 등)를 등록합니다.', 'good');
      if (c.myOm) { row('Jackson 설정', '직접 등록한 JsonMapper 있음', '물러남 → 내가 만든 JsonMapper 사용', 'hot'); push('Jackson 자동 설정: JsonMapper를 등록하려 했지만 "JsonMapper 빈이 없을 때만"이라는 조건이 붙어 있습니다. 내가 직접 등록한 것이 이미 있으므로 물러납니다. 부트가 기본으로 해 주던 설정(날짜 형식 등)은 내 JsonMapper에 직접 넣어야 합니다.', ''); }
      else { row('Jackson 설정', '직접 등록한 JsonMapper 없음', 'JsonMapper 등록', 'good'); push('Jackson 자동 설정: 직접 등록한 JsonMapper가 없으므로 기본 설정의 JsonMapper를 등록합니다.', 'good'); }
    } else { row('내장 서버 / MVC 설정', '자동 설정 모듈이 클래스패스에 없음', '목록에 없음', ''); push('웹 관련 자동 설정: 내장 톰캣과 스프링 MVC의 자동 설정은 web 스타터가 가져오는 모듈(spring-boot-tomcat, spring-boot-webmvc)에 있습니다. 스타터를 빼면 이 자동 설정들은 목록에 아예 없어서 평가되지도 않습니다. 웹 서버 없이 뜨는 애플리케이션이 됩니다.', ''); }
    if (c.jpa) {
      if (c.myDs) { row('DataSource 설정', '직접 등록한 DataSource 있음', '물러남 → 내가 만든 DataSource 사용', 'hot'); push('DataSource 자동 설정: "DataSource 빈이 없을 때만" 조건에 걸려 물러납니다. 내가 등록한 DataSource가 쓰입니다. spring.datasource.* 설정값은 이 빈에 자동으로 적용되지 않습니다.', ''); }
      else if (c.url) { row('DataSource 설정', 'spring-jdbc 있음, 접속 주소 있음', 'HikariCP 커넥션 풀(DataSource) 등록', 'good'); push('DataSource 자동 설정: spring-jdbc의 클래스가 있고 직접 등록한 DataSource가 없습니다. 설정의 접속 주소로 HikariCP 커넥션 풀을 만들어 등록합니다.', 'good'); }
      else if (c.db === 'h2') { row('DataSource 설정', '접속 주소 없음, 내장형 DB(H2) 발견', '메모리 DB용 DataSource 등록', 'good'); push('DataSource 자동 설정: 접속 주소가 없지만 클래스패스에 내장형 DB인 H2가 있습니다. 메모리 안에 임시 DB를 만들어 연결하는 DataSource를 등록합니다. 테스트나 예제에서 설정 없이 DB를 쓸 수 있는 이유입니다.', 'good'); }
      else { failed = true; row('DataSource 설정', '접속 주소 없음, 내장형 DB도 없음', '실패: Failed to configure a DataSource', 'bad'); push('DataSource 자동 설정: DataSource를 만들어야 하는데 접속 주소가 없고, 대신 쓸 내장형 DB도 없습니다. "Failed to configure a DataSource: \'url\' attribute is not specified" 오류와 함께 기동이 실패합니다.', 'bad'); }
      if (!failed) { row('JPA(Hibernate) 설정', 'DataSource 빈 있음, Hibernate 있음', 'EntityManagerFactory, 트랜잭션 매니저 등록', 'good'); push('JPA 자동 설정: 앞에서 준비된 DataSource를 사용해 EntityManagerFactory와 JPA용 트랜잭션 매니저를 등록합니다. 자동 설정끼리도 순서가 있어서, DataSource가 먼저 준비된 뒤에 평가됩니다.', 'good');
        row('Spring Data JPA 설정', 'JpaRepository 클래스 있음, DataSource 빈 있음', '리포지토리 구현체 등록', 'good'); push('Spring Data JPA 자동 설정: JpaRepository를 상속한 인터페이스를 찾아 구현 객체를 만들어 빈으로 등록합니다.', 'good'); }
    } else { row('DataSource / JPA 설정', '자동 설정 모듈이 클래스패스에 없음', '목록에 없음', ''); push('DB 관련 자동 설정: DataSource와 JPA의 자동 설정은 JPA 스타터가 가져오는 모듈(spring-boot-jdbc, spring-boot-data-jpa 등)에 있습니다. 스타터를 빼면 목록에 없어서 평가되지 않습니다.', ''); }
    if (!failed) { row('목록의 나머지 자동 설정', '조건마다 다름 (설정값 등)', '조건이 안 맞은 것은 건너뜀', ''); push('나머지 자동 설정들: 목록에 있어도 조건이 맞지 않으면 건너뜁니다. 예를 들어 JMX 자동 설정은 spring.jmx.enabled를 켜야 적용되므로 기본 설정에서는 빠집니다. Redis나 Kafka처럼 의존성을 추가하지 않은 기술의 자동 설정은 스프링 부트 4에서는 목록에 아예 없습니다.', ''); }
    sum.push('자동 설정에 자주 붙는 조건은 두 가지입니다. 클래스패스에 그 라이브러리가 있는가(@ConditionalOnClass), 그리고 개발자가 같은 타입의 빈을 이미 등록했는가(@ConditionalOnMissingBean). 설정값을 보는 조건(@ConditionalOnBooleanProperty 등)도 있습니다. 스타터는 필요한 라이브러리 묶음을 한 번에 가져와 첫 번째 조건을 만족시키고, 스프링 부트 4에서는 그 기술의 자동 설정 모듈도 함께 가져옵니다.');
    sum.push('이런 조건(@ConditionalOnMissingBean)이 붙은 자동 설정은 내가 같은 타입의 빈을 직접 등록하면 물러납니다. 기본값으로 시작하고, 바꾸고 싶은 부분만 직접 등록하면 됩니다. 어떤 자동 설정이 왜 적용됐고 왜 빠졌는지는 --debug 옵션으로 실행하면 조건 평가 보고서로 볼 수 있습니다.');
    return { events: ev, summary: sum, row: [failed ? '실패' : '성공', auto + '묶음', mine + '개', skip + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [];
    if (rows.length) H.table(v, ['자동 설정', '조건 평가', '결과'], rows, '자동 설정 조건 평가'); else H.text(v, '애플리케이션이 시작되면 조건 평가 결과가 쌓입니다.');
    H.text(v, '초록은 자동으로 등록됨, 노랑은 내가 등록한 빈이 있어 자동 설정이 물러남, 빨강은 실패입니다.');
  },
  assume: '자동 설정 가운데 대표적인 몇 개만 골라 단순화했습니다. 실제 클래스 이름과 조건은 더 세분돼 있습니다(예: DataSourceAutoConfiguration, JacksonAutoConfiguration, HibernateJpaAutoConfiguration). 조건의 의미와 "직접 등록한 빈이 있으면 물러난다"는 원칙은 스프링 부트 공식 문서의 설명을 따랐습니다. 의존성 이름은 스프링 부트 4 기준입니다(3까지는 웹 스타터의 이름이 spring-boot-starter-web이었습니다). 검증 환경의 스프링 부트 4.1.1 jar를 열어 세어 보니, spring-boot-autoconfigure jar의 자동 설정 목록(AutoConfiguration.imports)에는 12개만 있고 나머지는 spring-boot-jdbc, spring-boot-webmvc처럼 기술마다 나뉜 모듈에 있었습니다. 웹 MVC, JPA, 시큐리티, AspectJ 스타터를 둔 클래스패스에서 모두 합치면 57개였습니다. 코드 칸의 DataSource 자동 설정 조건과 JMX 자동 설정의 조건(spring.jmx.enabled)도 해당 jar의 클래스 파일을 열어 확인했습니다. 스프링 부트를 실제로 띄워 대조한 결과는 아닙니다. Jackson 자동 설정이 JsonMapper 타입 빈을 @ConditionalOnMissingBean으로 등록하는 것은 검증 환경의 spring-boot-jackson 4.1.1 클래스 파일을 열어 확인했습니다.',
});
