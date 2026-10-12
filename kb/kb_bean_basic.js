// 기초개념 "빈" 실습의 용어. 근거: 스프링 프레임워크 7.0 문서 Core의 Classpath Scanning and Managed Components 절(@Component와 스테레오타입 애너테이션, 기본 빈 이름), Introduction to the Spring IoC Container and Beans 절, 그리고 @Component의 API 문서.
module.exports = [
  ['Spring', '@Component', '@Component는 클래스 위에 붙여, 스프링이 그 클래스를 알고 객체를 만들어 관리하는 대상(빈)으로 삼게 하는 애너테이션이다. 스프링은 컴포넌트 스캔으로 지정한 패키지 아래의 클래스를 훑어 @Component가 붙은 클래스를 찾고, 그 클래스의 객체를 만들어 컨테이너에 보관한다. 빈의 이름을 따로 정하지 않으면 클래스 이름의 첫 글자를 소문자로 바꾼 것이 쓰인다(Greeter는 greeter). @Repository, @Service, @Controller는 @Component를 특수화한 것이어서 같은 방식으로 찾아진다. 이 애너테이션이 없는 클래스는 같은 패키지에 있어도 찾아지지 않으므로, 스프링에게 그 클래스의 객체를 달라고 하면 그런 빈이 없다는 예외가 난다.'],
];
