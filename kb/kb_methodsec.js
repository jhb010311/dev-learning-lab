// "메서드 보안" 실습과 함께 추가한 용어
module.exports = [
  ['보안', '메서드 보안(@PreAuthorize, @PostAuthorize)', '주소(URL)가 아니라 메서드에 권한 조건을 적어 두는 스프링 시큐리티의 기능이다. @PreAuthorize는 메서드를 실행하기 전에 식을 계산해 거짓이면 본문을 실행하지 않고, @PostAuthorize는 본문을 실행한 뒤 돌려줄 값을 보고 식을 계산해 거짓이면 값을 돌려주지 않는다. 식에는 hasRole(\'ADMIN\') 같은 역할 확인뿐 아니라 메서드의 인자(#이름), 돌려줄 값(returnObject), 로그인한 사용자(authentication)를 쓸 수 있다. 설정 클래스에 @EnableMethodSecurity가 있어야 동작하며, 없으면 애너테이션은 오류 없이 무시된다. 빈을 감싼 프록시가 검사를 하므로 같은 클래스 안에서 부른 호출에는 적용되지 않는다.'],
];
