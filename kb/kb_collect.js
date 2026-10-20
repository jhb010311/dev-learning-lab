// "스트림으로 모으기" 실습에 필요한 용어
module.exports = [
  ['Java 언어', 'Collector와 collect',
   'collect는 스트림에서 흘러나온 원소들을 하나의 결과로 모으는 최종 연산이고, Collector는 그 모으는 방법(어떤 그릇에 어떻게 담을지)을 나타내는 객체다. Collectors 클래스에 자주 쓰는 Collector가 준비되어 있다. toList와 toSet은 컬렉션에 담고, joining은 문자열 하나로 잇고, toMap은 키와 값을 정해 Map에 담는다. toMap은 같은 키가 두 번 나오면 IllegalStateException을 던지므로, 키가 겹칠 수 있으면 두 값을 합치는 병합 함수를 세 번째 인자로 준다.', { why: 'reduce는 두 값을 합쳐 새 값을 돌려주는 방식이어서, 규칙대로 List나 Map을 만들면 원소마다 새 컬렉션을 만들어 앞의 것을 옮겨 적게 된다. collect는 컬렉션 하나를 만들어 두고 원소를 차례로 더해 가는 방식이라, 스트림의 결과를 컬렉션이나 문자열로 만들 때 이런 낭비가 없다.', use: '거르고 바꾼 결과를 다시 List나 Set으로 받거나(toList, toSet), 이름들을 쉼표로 이어 한 줄로 만들 때(joining) 쓴다. List만 필요하면 collect 없이 Stream의 toList()로도 받으며, 이때 받은 List는 고칠 수 없다.' }],
  ['Java 언어', 'groupingBy와 partitioningBy',
   '스트림의 원소를 무리로 나누어 Map으로 모으는 Collector다. groupingBy는 원소마다 키를 계산해 키가 같은 원소끼리 묶으며, 기본 결과는 Map<키, List<원소>>이다. 두 번째 인자로 counting, summingInt 같은 Collector를 주면 목록 대신 무리별 개수나 합계를 얻는다. partitioningBy는 조건 하나로 true 무리와 false 무리 둘로 나누며, 해당하는 원소가 없어도 두 키가 항상 들어 있다. groupingBy가 돌려주는 Map은 순서를 보장하지 않으므로, 순서가 필요하면 TreeMap 같은 Map을 쓰도록 따로 지정한다.', { why: 'filter는 조건에 맞지 않는 원소를 버리므로, 맞는 쪽과 맞지 않는 쪽이 모두 필요하면 스트림을 두 번 만들어 돌려야 한다. partitioningBy는 한 번 돌면서 참과 거짓 두 무리로 나누고, groupingBy는 원소마다 키를 계산해 무리를 여럿으로 나눈다.', use: '주문을 날짜별로 묶어 하루 주문 수를 세거나(groupingBy와 counting), 회원을 성인과 미성년으로 나눌 때(partitioningBy) 쓴다.' }],
];
