// "메서드 보안" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'methodsec', q: '@PreAuthorize와 @PostAuthorize의 차이로 맞는 것은 무엇입니까?',
    a: ['@PreAuthorize는 메서드 실행 전에, @PostAuthorize는 메서드가 값을 돌려준 뒤에 검사한다', '@PreAuthorize는 컨트롤러에만, @PostAuthorize는 서비스에만 붙일 수 있다', '@PreAuthorize는 역할을 검사하고, @PostAuthorize는 로그인 여부만 검사한다', '@PreAuthorize는 컴파일할 때, @PostAuthorize는 실행할 때 검사한다'],
    why: '@PreAuthorize는 본문을 실행하기 전에 식을 계산해 거짓이면 본문을 실행하지 않습니다. @PostAuthorize는 본문을 먼저 실행하고, 돌려줄 값(returnObject)을 보고 식을 계산해 거짓이면 그 값을 돌려주지 않습니다.' },
  { lv: 2, id: 'methodsec', q: '같은 클래스 안의 다른 메서드에서 @PreAuthorize가 붙은 메서드를 부르면 검사가 실행되지 않는 이유는 무엇입니까?',
    a: ['검사는 빈을 감싼 프록시가 하는데, 같은 클래스 안의 호출은 프록시를 거치지 않기 때문이다', '같은 클래스 안의 메서드끼리는 권한이 같다고 스프링 시큐리티가 판단하기 때문이다', '@PreAuthorize는 public 메서드에서 부를 때에만 검사하도록 정해져 있기 때문이다', '같은 클래스 안의 호출은 로그인 정보가 전달되지 않아 검사할 수 없기 때문이다'],
    why: '메서드 보안은 빈을 감싼 프록시가 호출을 가로채 식을 계산하는 방식입니다. 같은 클래스 안에서 부르는 것은 this를 통한 호출이라 프록시를 지나지 않고 실제 객체의 메서드로 바로 갑니다. @Transactional이 자기 호출에서 동작하지 않는 것과 같은 원리입니다.' },
  { lv: 3, id: 'methodsec', q: 'deleteAll()에 @PreAuthorize("hasRole(\'ADMIN\')")를 붙였지만 설정 클래스에 @EnableMethodSecurity가 없습니다. 역할이 USER인 사용자가 컨트롤러를 통해 이 메서드를 부르면 어떻게 됩니까?',
    a: ['검사 없이 본문이 실행되고 값이 정상적으로 돌아온다', '본문이 실행되기 전에 접근 거부 예외가 발생한다', '애플리케이션이 시작할 때 설정 오류로 멈춘다', '본문은 실행되지만 돌려준 값이 버려지고 예외가 발생한다'],
    why: '@EnableMethodSecurity가 없으면 애너테이션을 읽어 검사하는 프록시가 만들어지지 않습니다. 애너테이션은 오류 없이 무시되고 메서드는 평범하게 실행됩니다.',
    sim: { c: { enable: false, m: 'role', who: 'kim', call: 'ext' }, col: 1, has: '실행됨' } },
  { lv: 3, id: 'methodsec', q: '주문 1번의 주인은 kim입니다. findOrder(1)에 @PostAuthorize("returnObject.owner == authentication.name")를 붙이고 메서드 보안을 켰습니다. lee가 컨트롤러를 통해 이 메서드를 부르면 어떻게 됩니까?',
    a: ['본문은 실행되지만 주문은 전달되지 않고 예외가 발생한다', '본문이 실행되기 전에 거부되어 조회 자체가 일어나지 않는다', '본문이 실행되고 kim의 주문이 lee에게 그대로 전달된다', '본문이 실행되고 주인 이름만 지워진 주문이 전달된다'],
    why: '@PostAuthorize는 돌려줄 값을 봐야 하므로 본문을 먼저 실행합니다. 돌려준 주문의 주인(kim)과 로그인한 사용자(lee)가 달라 식이 거짓이 되고, 프록시가 값을 버리고 예외를 던집니다. 무언가를 바꾸는 메서드에 쓰면 거부되기 전에 이미 바뀐다는 점에 주의합니다.',
    sim: { c: { enable: true, m: 'post', who: 'lee', call: 'ext' }, col: 1, has: '실행됨' } },
]);
