// "스프링 컨테이너와 빈" 실습과 함께 추가한 용어
module.exports = [
  ['Spring', '@Primary와 @Qualifier', '같은 타입의 빈이 둘 이상일 때 어느 것을 주입할지 정하는 두 애너테이션이다. 스프링 컨테이너는 주입할 빈을 타입으로 찾는데, 맞는 빈이 여럿이면 고르지 못하고 NoUniqueBeanDefinitionException을 던져 애플리케이션이 뜨지 않는다. @Primary는 빈을 등록하는 쪽(클래스나 @Bean 메서드)에 붙여 "여럿이면 이것을 먼저 쓴다"고 표시한다. @Qualifier는 주입받는 쪽(생성자 파라미터나 필드)에 붙여 쓸 빈의 이름을 직접 적는다. 둘이 함께 있으면 @Qualifier로 지정한 빈이 들어간다.'],
  ['Spring', 'NoSuchBeanDefinitionException과 NoUniqueBeanDefinitionException', '컨테이너가 주입할 빈을 정하지 못했을 때 던지는 두 예외다. NoSuchBeanDefinitionException은 필요한 타입의 빈이 하나도 등록돼 있지 않을 때, NoUniqueBeanDefinitionException은 같은 타입의 빈이 둘 이상이라 하나를 고를 수 없을 때 발생한다. 싱글톤 빈은 애플리케이션이 뜰 때 만들어지므로, 이 예외들은 요청을 처리하는 도중이 아니라 기동 시점에 나타나 애플리케이션이 뜨지 않는다. 앞의 것은 빈 등록(@Component나 @Bean)이 빠졌는지, 뒤의 것은 같은 타입의 빈이 늘지 않았는지 확인한다.'],
];
