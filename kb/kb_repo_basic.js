// 기초개념 "리포지토리" 실습의 용어. 근거: 스프링 데이터 JPA 문서의 Core concepts 절, Defining Repository Interfaces 절, Query Methods 절(Query Creation, Property Expressions), 스프링 데이터 커먼즈 문서의 Creating Repository Instances 절.
module.exports = [
  ['JPA', '리포지토리',
   '리포지토리(Repository)는 스프링 데이터에서 엔티티를 저장하고 찾는 메서드를 모아 둔 인터페이스다. 스프링 데이터가 정한 중심 인터페이스는 Repository이고, 다루는 엔티티 클래스와 그 id의 타입을 타입 인자로 받는다. 개발자는 이 인터페이스를 상속한 인터페이스를 선언만 하고 구현 클래스는 쓰지 않는다. 스프링은 시작할 때 설정된 패키지 아래에서 이런 인터페이스를 모두 찾아, 각각에 대해 호출을 처리하는 프록시 객체를 만들어 빈으로 등록한다. 그래서 그 빈을 주입받아 save 같은 메서드를 바로 부를 수 있다. Repository를 상속하지 않은 평범한 인터페이스는 찾지 않으므로 구현 객체도 만들어지지 않는다.'],
  ['JPA', 'JpaRepository',
   'JpaRepository는 스프링 데이터 JPA가 제공하는 리포지토리 인터페이스로, 엔티티 클래스와 id 타입을 타입 인자로 받는다(예: JpaRepository<Member, Long>). 저장 기술에 맞춘 이 인터페이스는 CrudRepository 계열 인터페이스를 확장하므로, 이를 상속하면 save, findById, findAll, count, delete 같은 기본 메서드를 선언하지 않고도 물려받아 쓸 수 있다. 이 인터페이스를 상속해 선언하면 스프링 데이터 JPA의 대상이 되어, 스프링이 시작할 때 그 인터페이스의 구현 객체를 만들어 준다. 상속하지 않으면 이런 메서드가 없어 save를 부르는 코드는 컴파일되지 않는다. 메서드 이름을 findByName처럼 규칙에 맞게 선언하면 쿼리 메서드가 되어 쿼리까지 만들어 준다.'],
];
