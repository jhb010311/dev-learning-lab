// "빈 생명주기 콜백" 실습과 함께 추가한 용어
module.exports = [
  ['Spring', '@PostConstruct와 @PreDestroy', '빈의 초기화 시점과 소멸 시점에 불릴 메서드를 표시하는 애너테이션이다. 컨테이너는 객체를 만들고 의존성 주입을 끝낸 뒤에 @PostConstruct가 붙은 메서드를 부르고, 컨테이너가 닫힐 때 @PreDestroy가 붙은 메서드를 부른다. 그래서 주입받은 객체를 써야 하는 준비 작업은 생성자가 아니라 @PostConstruct 메서드에 둔다. 스프링의 것이 아니라 jakarta.annotation 패키지의 애너테이션이다. 프로토타입 스코프의 빈에서는 @PreDestroy가 불리지 않는다.'],
  ['Spring', 'InitializingBean과 DisposableBean', '빈의 초기화와 소멸 시점에 불릴 메서드를 정하는 스프링의 두 인터페이스다. InitializingBean을 구현하면 의존성 주입이 끝난 뒤에 afterPropertiesSet()이 불리고, DisposableBean을 구현하면 컨테이너가 닫힐 때 destroy()가 불린다. 클래스가 스프링의 인터페이스를 구현해야 하므로 코드가 스프링에 묶인다. 같은 일을 @PostConstruct와 @PreDestroy로, 또는 @Bean의 initMethod와 destroyMethod로도 할 수 있다. 세 가지를 함께 쓰면 애너테이션, 인터페이스, @Bean에 지정한 메서드의 순서로 불린다.'],
];
