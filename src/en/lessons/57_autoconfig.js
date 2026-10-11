Lab.register({
  id: 'autoconf', nav: 'Spring Boot auto-configuration', cat: 'Spring', mode: 'step',
  title: 'Why do beans appear when all you did was add a dependency?',
  intro: 'When an application starts, Spring Boot goes through a set of configuration classes prepared in advance, one by one, and decides "if this condition is met, register this bean". The conditions are mainly which libraries are on the classpath and whether the developer has registered the same bean. Change the dependencies and whether you register a bean yourself, and watch the final list of beans.',
  terms: ['Spring Boot auto-configuration', 'Starter', 'Embedded server', '@Configuration and @Bean', 'Component scanning'], ranks: ['boot', 'bean', 'di'],
  controls: [
    { id: 'web', label: 'spring-boot-starter-webmvc dependency', type: 'check', value: true },
    { id: 'myOm', label: 'You registered your own ObjectMapper bean', type: 'check', value: false, show: function (c) { return c.web; } },
    { id: 'jpa', label: 'spring-boot-starter-data-jpa dependency', type: 'check', value: true },
    { id: 'db', label: 'Database driver', type: 'select', value: 'mysql', options: [['h2', 'H2 (embedded database)'], ['mysql', 'MySQL driver']], show: function (c) { return c.jpa; } },
    { id: 'url', label: 'spring.datasource.url is set', type: 'check', value: true, show: function (c) { return c.jpa; } },
    { id: 'myDs', label: 'You registered your own DataSource bean', type: 'check', value: false, show: function (c) { return c.jpa; } },
  ],
  presets: [
    { t: 'Default settings', d: 'The web and JPA starters. All the beans that are needed are created, and you register none yourself.', v: { web: true, myOm: false, jpa: true, db: 'mysql', url: true, myDs: false } },
    { t: 'Leaving out the database URL', d: 'The driver is MySQL, but there is no connection URL. Startup fails.', v: { web: true, myOm: false, jpa: true, db: 'mysql', url: false, myDs: false } },
    { t: 'With H2, even without a URL', d: 'When Spring Boot finds an embedded database, it creates an in-memory database for you.', v: { web: true, myOm: false, jpa: true, db: 'h2', url: false, myDs: false } },
    { t: 'Registering your own DataSource', d: 'The auto-configuration backs away, and the one you created is used.', v: { web: true, myOm: false, jpa: true, db: 'mysql', url: true, myDs: true } },
    { t: 'Registering your own ObjectMapper', d: 'The ObjectMapper that Spring Boot would have created is not registered.', v: { web: true, myOm: true, jpa: true, db: 'mysql', url: true, myDs: false } },
    { t: 'Removing the web starter', d: 'Neither Tomcat nor DispatcherServlet is created.', v: { web: false, myOm: false, jpa: true, db: 'mysql', url: true, myDs: false } },
  ],
  code: function (c) {
    var dep = [];
    if (c.web) dep.push("    implementation 'org.springframework.boot:spring-boot-starter-webmvc'");
    if (c.jpa) { dep.push("    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'"); dep.push(c.db === 'h2' ? "    runtimeOnly 'com.h2database:h2'" : "    runtimeOnly 'com.mysql:mysql-connector-j'"); }
    var s = '// build.gradle\ndependencies {\n' + (dep.length ? dep.join('\n') : "    implementation 'org.springframework.boot:spring-boot-starter'") + '\n}\n';
    if (c.jpa && c.url) s += '\n# application.yml\nspring.datasource.url: jdbc:' + (c.db === 'h2' ? 'h2:mem:shop' : 'mysql://localhost:3306/shop') + '\n';
    if ((c.jpa && c.myDs) || (c.web && c.myOm)) s += '\n@Configuration\nclass MyConfig {\n' + (c.jpa && c.myDs ? '    @Bean DataSource dataSource() { return new HikariDataSource(myConfig()); }\n' : '') + (c.web && c.myOm ? '    @Bean ObjectMapper objectMapper() { return new ObjectMapper().registerModule(new JavaTimeModule()); }\n' : '') + '}\n';
    return s + '\n// An auto-configuration class looks like this inside\n// @ConditionalOnClass(DataSource.class)       only when the class is on the classpath\n// @ConditionalOnMissingBean(DataSource.class) only when you have not registered the bean yourself';
  },
  label: function (c) { return (c.web ? 'web' + (c.myOm ? '(own ObjectMapper)' : '') : '') + (c.web && c.jpa ? ' + ' : '') + (c.jpa ? 'jpa·' + c.db + (c.url ? '' : '·no URL') + (c.myDs ? '(own DataSource)' : '') : '') || 'No starters'; },
  columns: ['Startup result', 'Bean groups registered by auto-configuration', 'Your own beans used instead', 'Configurations skipped (conditions not met)'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], auto = 0, mine = 0, skip = 0, failed = false;
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice() } }); }
    function row(conf, cond, res, cls) { rows.push({ cells: [conf, cond, { v: res, cls: cls }] }); if (cls === 'good') auto++; if (cls === 'hot') mine++; if (cls === '') skip++; }
    push('The application starts. The @EnableAutoConfiguration inside @SpringBootApplication loads the list of auto-configuration classes that ship with Spring Boot (a little over 100). Your own @Configuration and @Component classes are registered first, and then the conditions of the auto-configurations are evaluated one by one.', '');
    if (c.web) { row('Embedded server', 'Tomcat is on the classpath', 'Embedded Tomcat registered (port 8080)', 'good'); push('Embedded server auto-configuration: The web starter brought in the Tomcat library with it. Tomcat is on the classpath, so Spring Boot registers the bean that starts an embedded Tomcat. That is why the application runs from a single jar, with no separate application server to install.', 'good');
      row('DispatcherServlet', 'Spring MVC is on the classpath', 'DispatcherServlet registered', 'good'); push('Spring MVC auto-configuration: The DispatcherServlet class is present, so Spring Boot registers DispatcherServlet and the default MVC components (message converters, handler mappings, and so on).', 'good');
      if (c.myOm) { row('Jackson', 'You registered your own ObjectMapper', 'Backs away → your ObjectMapper is used', 'hot'); push('Jackson auto-configuration: It was going to register an ObjectMapper, but it carries the condition "only when there is no ObjectMapper bean". The one you registered yourself already exists, so the auto-configuration backs away. The settings that Spring Boot applied by default (the date format and so on) must now be added to your ObjectMapper by you.', ''); }
      else { row('Jackson', 'You registered no ObjectMapper', 'ObjectMapper registered', 'good'); push('Jackson auto-configuration: You have not registered an ObjectMapper yourself, so an ObjectMapper with the default settings is registered.', 'good'); }
    } else { row('Embedded server / MVC', 'Tomcat and Spring MVC are not on the classpath', 'Skipped', ''); push('Web auto-configuration: The Tomcat and Spring MVC classes are not on the classpath. The conditions are not met, so all of it is skipped. The application starts without a web server.', ''); }
    if (c.jpa) {
      if (c.myDs) { row('DataSource', 'You registered your own DataSource', 'Backs away → your DataSource is used', 'hot'); push('DataSource auto-configuration: It backs away because of the condition "only when there is no DataSource bean". The DataSource that you registered is used. The spring.datasource.* settings are not applied to this bean automatically.', ''); }
      else if (c.url) { row('DataSource', 'JDBC is present, connection URL is set', 'HikariCP connection pool (DataSource) registered', 'good'); push('DataSource auto-configuration: The JDBC classes are present, and you have not registered a DataSource yourself. Spring Boot creates a HikariCP connection pool with the connection URL from the settings and registers it.', 'good'); }
      else if (c.db === 'h2') { row('DataSource', 'No connection URL, embedded database (H2) found', 'DataSource for an in-memory database registered', 'good'); push('DataSource auto-configuration: There is no connection URL, but H2, an embedded database, is on the classpath. Spring Boot registers a DataSource that creates a temporary database in memory and connects to it. This is why a database works without any configuration in tests and examples.', 'good'); }
      else { failed = true; row('DataSource', 'No connection URL, and no embedded database', 'Failed: Failed to configure a DataSource', 'bad'); push('DataSource auto-configuration: A DataSource has to be created, but there is no connection URL and no embedded database to use instead. Startup fails with the error "Failed to configure a DataSource: \'url\' attribute is not specified".', 'bad'); }
      if (!failed) { row('JPA (Hibernate)', 'DataSource bean exists, Hibernate is present', 'EntityManagerFactory and transaction manager registered', 'good'); push('JPA auto-configuration: It uses the DataSource prepared earlier to register an EntityManagerFactory and a transaction manager for JPA. Auto-configurations also have an order among themselves, so this one is evaluated after the DataSource is ready.', 'good');
        row('Spring Data JPA', 'JpaRepository interface found', 'Repository implementation registered', 'good'); push('Spring Data JPA auto-configuration: It finds the interfaces that extend JpaRepository, creates an implementation object for each of them, and registers it as a bean.', 'good'); }
    } else { row('DataSource / JPA', 'JDBC and Hibernate are not on the classpath', 'Skipped', ''); push('Database auto-configuration: The related classes are not on the classpath, so it is skipped.', ''); }
    if (!failed) { row('The rest (Redis, Kafka, Security, and so on)', 'The library is not on the classpath', 'Skipped', ''); push('The remaining auto-configurations: Their libraries are not on the classpath, so most of them fail their conditions. Many configurations are prepared, but the only ones actually applied are those that match the dependencies you added.', ''); }
    sum.push(failed ? 'Startup failed. There is not enough information to configure a DataSource.' : 'Startup succeeded. Bean groups registered by auto-configuration: ' + auto + '. Your own beans used instead: ' + mine + '.');
    sum.push('Auto-configuration decides on two criteria: whether the library is on the classpath (@ConditionalOnClass), and whether the developer has already registered a bean of the same type (@ConditionalOnMissingBean). The role of a starter is to bring in the set of libraries that are needed all at once, which satisfies the first condition.');
    sum.push('A bean that you register yourself always wins. Start with the defaults, and register yourself only the parts that you want to change. To see which auto-configurations were applied or left out, and why, run the application with the --debug option, which prints a conditions report.');
    return { events: ev, summary: sum, row: [failed ? 'Failed' : 'Succeeded', auto + '', mine + '', skip + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [];
    if (rows.length) H.table(v, ['Auto-configuration', 'Condition evaluation', 'Result'], rows, 'Evaluation of auto-configuration conditions'); else H.text(v, 'When the application starts, the results of the condition evaluation build up here.');
    H.text(v, 'Green means registered automatically, yellow means the auto-configuration backed away because you registered your own bean, and red means failure.');
  },
  assume: 'This lab picks only a few representative auto-configurations and simplifies them. The real class names and conditions are more fine-grained (for example, DataSourceAutoConfiguration, JacksonAutoConfiguration, HibernateJpaAutoConfiguration). The meaning of the conditions and the principle that "auto-configuration backs away when you have registered the bean yourself" follow the explanation in the official Spring Boot documentation. The dependency names are those of Spring Boot 4 (up to Spring Boot 3, the web starter was named spring-boot-starter-web). These results were not checked against a running Spring Boot application.',
});
