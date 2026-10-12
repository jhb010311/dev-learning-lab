// 기초개념 "의존성 주입" 실습의 용어. 근거: 스프링 프레임워크 7.0 문서 Core의 Dependency Injection(Constructor-based Dependency Injection 절), Using @Autowired(생성자가 하나뿐이면 @Autowired가 필요 없다는 문장). (@Component는 kb_bean_basic.js의 것을 쓴다)
module.exports = [
  ['Spring', '의존성', '의존성은 어떤 클래스가 일을 하려고 필요로 하는 다른 클래스의 객체다. 예를 들어 OrderService가 결제를 하려고 PayService 객체의 메서드를 부른다면, OrderService는 PayService에 의존한다고 말하고 PayService 객체가 OrderService의 의존성이다. 스프링 문서는 의존성을 객체가 함께 일하는 다른 객체로 설명한다. 필요한 객체를 new로 직접 만들 수도 있고 생성자의 매개변수로 받을 수도 있는데, 스프링이 만들어 넣어 주는 것을 의존성 주입이라고 한다.'],
];
