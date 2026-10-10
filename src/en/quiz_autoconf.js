// Quiz questions for the autoconf lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 2, id: 'autoconf', q: 'How does Spring Boot auto-configuration work?', a: ['It looks at the libraries on the classpath and at conditions and registers the beans that are needed, and it backs away when the user registers the same bean', 'It always registers every possible bean', 'It registers only the beans that the user wrote in XML', 'It downloads the configuration from the internet on every run'], why: 'Auto-configuration classes carry conditions such as @ConditionalOnClass and @ConditionalOnMissingBean.' },
]);
