Lab.register({
  id: 'strategy', nav: '전략 패턴', cat: '설계', mode: 'step',
  title: '결제 수단이 하나 늘 때 고쳐야 하는 곳',
  why: '처리 방식이 여러 가지인 기능을 if-else로 나누면, 방식이 하나 늘 때마다 분기가 있는 메서드를 모두 찾아 고쳐야 하고 이미 잘 돌던 다른 방식까지 다시 확인해야 한다. 전략 패턴은 각 방식을 같은 인터페이스를 구현한 별도 클래스로 떼어 내서, 새 방식이 생기면 클래스를 하나 추가하는 일로 끝나게 한다.',
  use: '할인 정책(정액·정률), 알림 수단(이메일·문자·앱 푸시), 파일 저장 위치(로컬 디스크·클라우드)처럼 같은 일을 하는 방법이 여러 가지이고 늘어날 수 있는 곳에 쓴다. 자바에서 정렬 기준을 Comparator로 넘기는 것도 같은 구조이고, 스프링에서는 구현 클래스들을 빈으로 등록해 주입받는다. 경우가 두세 개로 고정되어 있으면 if-else나 switch가 더 단순하다.',
  intro: '결제 수단(카드, 계좌이체, 카카오페이)마다 처리 방식이 다릅니다. if-else로 나누는 코드와, 수단별 구현을 따로 두고 갈아 끼우는 코드(전략 패턴)가 있습니다.',
  terms: ['전략 패턴', '디자인 패턴', '다형성', 'SOLID', '인터페이스', 'DI(의존성 주입)'], ranks: ['pattern', 'oop', 'di'],
  controls: [
    { id: 'how', label: '구현 방식', type: 'select', value: 'ifelse', options: [['ifelse', 'if-else로 분기'], ['strategy', '전략 패턴 (인터페이스 + 구현 클래스)']] },
    { id: 'add', label: '결제 수단 "네이버페이"를 새로 추가한다', type: 'check', value: true },
    { id: 'pay', label: '실행해 볼 결제 수단', type: 'select', value: 'KAKAO', options: [['CARD', '카드'], ['KAKAO', '카카오페이'], ['NAVER', '네이버페이']] },
  ],
  fix: function (c) { return !c.add && c.pay === 'NAVER' ? { pay: 'KAKAO' } : null; },
  presets: [
    { t: '처음 설정으로', q: 'if-else로 분기한 구현에 네이버페이 결제 수단이 하나 늘면 어디를 고쳐야 하나', d: 'if-else 방식에 네이버페이 추가. 기존 메서드를 고쳐야 합니다.', v: { how: 'ifelse', add: true, pay: 'NAVER' } },
    { t: '전략 패턴에 네이버페이 추가', q: '인터페이스와 구현 클래스를 쓰는 전략 패턴으로 바꾸고 네이버페이로 결제하면', d: '클래스 하나를 새로 만들면 끝입니다. 기존 코드는 그대로입니다.', v: { how: 'strategy', add: true, pay: 'NAVER' } },
    { t: '전략 패턴의 실행 과정', q: '인터페이스와 구현 클래스를 쓰는 전략 패턴으로 바꾸고 네이버페이 결제 수단을 추가하지 않으면', d: '분기문 없이 맞는 구현이 선택됩니다.', v: { how: 'strategy', add: false, pay: 'KAKAO' } },
    { t: 'if-else의 실행 과정', q: 'if-else로 분기한 채 네이버페이 결제 수단을 추가하지 않으면', d: '조건을 위에서부터 차례로 비교합니다.', v: { how: 'ifelse', add: false, pay: 'KAKAO' } },
  ],
  code: function (c) {
    if (c.how === 'ifelse') return '// 필요한 부분만 남김 (import와 예시로 만든 Order 클래스의 선언은 생략)\n@Service\nclass PaymentService {\n    void pay(String type, Order order) {\n        if (type.equals("CARD")) {\n            // 카드사 승인 요청 ... (30줄)\n        } else if (type.equals("BANK")) {\n            // 계좌이체 ... (25줄)\n        } else if (type.equals("KAKAO")) {\n            // 카카오페이 ... (40줄)\n' + (c.add ? '        } else if (type.equals("NAVER")) {      // 추가: 기존 메서드를 수정\n            // 네이버페이 ... (35줄)\n' : '') + '        } else {\n            throw new IllegalArgumentException(type);\n        }\n    }\n    // refund(), cancel()에도 같은 분기가 반복된다\n}';
    return '// 필요한 부분만 남김 (import와 예시로 만든 Order 클래스의 선언은 생략)\ninterface PaymentStrategy {\n    String type();\n    void pay(Order order);\n}\n\n@Component class CardPayment  implements PaymentStrategy { /* 구현 생략 */ }\n@Component class BankPayment  implements PaymentStrategy { /* 구현 생략 */ }\n@Component class KakaoPayment implements PaymentStrategy { /* 구현 생략 */ }\n' + (c.add ? '@Component class NaverPayment implements PaymentStrategy { /* 구현 생략 */ }   // 추가: 새 파일 하나\n' : '') + '\n@Service\nclass PaymentService {\n    private final Map<String, PaymentStrategy> strategies;\n\n    PaymentService(List<PaymentStrategy> list) {          // 스프링이 구현체를 전부 주입\n        strategies = list.stream().collect(toMap(PaymentStrategy::type, s -> s));\n    }\n\n    void pay(String type, Order order) {\n        strategies.get(type).pay(order);                  // 분기문 없음\n    }\n}';
  },
  label: function (c) { return (c.how === 'ifelse' ? 'if-else' : '전략 패턴') + (c.add ? ' · 네이버페이 추가' : '') + ' · ' + { CARD: '카드', KAKAO: '카카오페이', NAVER: '네이버페이' }[c.pay] + ' 결제'; },
  columns: ['수단 추가 시 고친 기존 코드', '새로 만든 것', '실행 시 비교 횟수', '수단별 단위 테스트'],
  simulate: function (c) {
    var ev = [], sum = [], st = c.how === 'strategy', types = ['CARD', 'BANK', 'KAKAO'].concat(c.add ? ['NAVER'] : []), name = { CARD: '카드', BANK: '계좌이체', KAKAO: '카카오페이', NAVER: '네이버페이' }, files = [], cmp = 0;
    function push(s, k, hot) { ev.push({ s: s, k: k, snap: { files: files.slice(), hot: hot || '' } }); }
    files = st ? [['PaymentStrategy (인터페이스)', '그대로'], ['PaymentService', '그대로'], ['CardPayment', '그대로'], ['BankPayment', '그대로'], ['KakaoPayment', '그대로']] : [['PaymentService.pay()', '그대로'], ['PaymentService.refund()', '그대로'], ['PaymentService.cancel()', '그대로']];
    push(st ? '결제 수단마다 클래스가 하나씩 있고, 모두 PaymentStrategy 인터페이스를 구현합니다. PaymentService는 구체적인 클래스를 모르고 인터페이스만 압니다.' : '결제 수단별 처리가 PaymentService의 메서드 안에 if-else로 들어 있습니다. 환불과 취소 메서드에도 같은 모양의 분기가 있습니다.', '');
    if (c.add) {
      if (st) { files.push(['NaverPayment', '새로 만듦']); push('네이버페이 추가: NaverPayment 클래스 하나를 새로 만들어 인터페이스를 구현합니다. @Component만 붙이면 스프링이 찾아서 PaymentService에 주입되는 목록에 넣어 줍니다. 기존 파일은 한 줄도 고치지 않았습니다.', 'good', 'NaverPayment'); }
      else { files = [['PaymentService.pay()', '수정함 (분기 추가)'], ['PaymentService.refund()', '수정함 (분기 추가)'], ['PaymentService.cancel()', '수정함 (분기 추가)']]; push('네이버페이 추가: pay(), refund(), cancel() 세 메서드에 각각 else if를 하나씩 끼워 넣어야 합니다. 이미 잘 돌아가던 메서드를 고치는 것이므로 카드와 카카오페이까지 다시 테스트해야 합니다. 한 곳이라도 빠뜨리면 그 기능만 실행 중에 예외가 납니다.', 'bad', 'PaymentService'); }
    }
    push(name[c.pay] + '로 결제를 요청합니다: pay("' + c.pay + '", order).', '');
    if (st) { cmp = 1; push('PaymentService가 맵에서 "' + c.pay + '"에 해당하는 구현 객체를 꺼냅니다. 조건문으로 비교하지 않습니다.', '', c.pay); push('꺼낸 객체의 pay()를 호출합니다. 변수의 타입은 PaymentStrategy이지만, 실제로 실행되는 것은 그 객체의 클래스(' + { CARD: 'CardPayment', KAKAO: 'KakaoPayment', NAVER: 'NaverPayment' }[c.pay] + ')에 있는 pay()입니다. 다형성이 분기문의 역할을 대신합니다.', 'good', c.pay); }
    else { for (var i = 0; i < types.length; i++) { cmp++; var hit = types[i] === c.pay; push('type이 "' + types[i] + '"인지 비교합니다. ' + (hit ? '맞습니다. 이 블록 안의 ' + name[c.pay] + ' 처리 코드를 실행합니다.' : '아닙니다. 다음 조건으로 넘어갑니다.'), hit ? 'good' : '', 'PaymentService'); if (hit) break; } }
    var changed = c.add ? (st ? '없음' : '메서드 3개') : '-', made = c.add ? (st ? '클래스 1개' : '없음') : '-';
    if (st) sum.push('전략 패턴은 "바뀌는 부분(수단별 처리)"을 인터페이스 뒤로 숨기고 구현을 갈아 끼울 수 있게 합니다. 새 수단은 새 클래스로 추가되고 기존 코드는 닫혀 있습니다(개방-폐쇄 원칙). 수단마다 클래스가 따로라서 각각 테스트하고, 가짜 구현으로 바꿔 끼우기도 쉽습니다.');
    else sum.push('if-else 방식은 수단이 두세 개이고 늘어날 일이 없다면 가장 단순하고 읽기 쉽습니다. 문제는 수단이 늘 때마다 같은 분기가 여러 메서드에 복사되고, 메서드 하나가 계속 길어지며, 한 수단을 고치다 다른 수단을 건드릴 위험이 커진다는 점입니다.');
    sum.push('스프링의 의존성 주입은 전략을 갈아 끼우는 데 자주 쓰입니다. 인터페이스 타입으로 주입받고 실제 구현은 설정에 따라 바뀝니다(운영에서는 실제 결제사, 테스트에서는 가짜 구현).');
    return { events: ev, summary: sum, st: st, row: [changed, made, cmp + '번', st ? '수단별로 따로' : '메서드 하나에 전부'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, M = { CARD: 'CardPayment', KAKAO: 'KakaoPayment', NAVER: 'NaverPayment' };
    if (!s) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    H.table(v, [sim.st ? '클래스' : '메서드', '이번 변경에서'], s.files.map(function (f) { var on = f[0] === s.hot || f[0] === M[s.hot] || (s.hot === 'PaymentService' && f[0].indexOf('PaymentService') === 0); return { cells: [{ v: f[0], cls: on ? 'hot' : '' }, { v: f[1], cls: f[1].indexOf('수정') === 0 ? 'bad' : f[1].indexOf('새로') === 0 ? 'good' : '' }] }; }), '코드 구성');
  },
  assume: '결제 처리의 실제 내용은 생략하고 구조만 비교했습니다. if-else 방식에서 환불과 취소에도 같은 분기가 있다는 것은 흔한 상황을 가정한 것입니다. 전략 패턴의 정의는 GoF 디자인 패턴의 설명을 따랐고, 스프링이 같은 인터페이스의 구현체를 List로 한꺼번에 주입해 주는 것은 스프링의 표준 기능입니다. 맵에서 꺼낸 구현 객체의 메서드가 실제로 실행되는 것과 if-else의 비교 횟수는 검증 환경의 JDK 21에서 같은 구조의 코드로 확인했습니다. 스프링이 구현체를 주입하는 부분은 실행하지 않았습니다.',
});
