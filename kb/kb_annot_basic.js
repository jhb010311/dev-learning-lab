// 기초개념 "애너테이션" 실습의 용어. 근거: Java Language Specification(Java SE 21) 9.6절, 9.6.4.2절, 9.7절, 9.7.2절과 java.lang.annotation.Retention, RetentionPolicy의 API 문서.
module.exports = [
  ['Java 언어', '@interface', '@interface는 애너테이션(@로 시작하는 표시)을 새로 만드는 선언이다. 일반 인터페이스 선언의 interface 앞에 @를 붙여 @interface Run { }처럼 쓰면 Run이라는 애너테이션이 생기고, 그 뒤로 클래스나 메서드 위에 @Run으로 붙일 수 있다. 중괄호 안이 비어 있으면 값을 담지 않는 표시(마커 애너테이션)이고, 메서드 모양의 선언을 두면 @Name(값)처럼 값을 담는 요소가 된다. 선언만으로는 실행되는 코드가 생기지 않으며, 표시를 읽고 일하는 쪽은 따로 있어야 한다. 직접 만든 애너테이션에 @Retention을 적지 않으면 실행 중에는 남지 않는다.'],
];
