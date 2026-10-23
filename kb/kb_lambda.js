// "람다와 함수형 인터페이스" 실습에 필요한 용어
module.exports = [
  ['Java 언어', '익명 클래스와 람다의 차이',
   '익명 클래스는 인터페이스나 클래스를 그 자리에서 구현하면서 이름 없이 객체를 만드는 문법으로, new 인터페이스이름() { 메서드 구현 } 형태로 쓴다. 람다는 추상 메서드가 하나뿐인 함수형 인터페이스에 한해 같은 일을 (매개변수) -> 실행문 형태로 짧게 쓰는 문법이다. 함수형 인터페이스를 구현할 때 this를 쓰지 않는 단순한 본문이면 둘 중 어느 것으로 써도 호출한 결과가 같다. 다만 익명 클래스는 메서드가 여러 개인 인터페이스도 구현할 수 있고 필드를 가질 수 있으며, 그 안의 this는 익명 클래스의 객체 자신을 가리킨다. 람다 안의 this는 람다를 적은 바깥 객체를 가리킨다.'],
  ['Java 언어', '람다를 받는 표준 메서드',
   '자바 표준 라이브러리에서 매개변수 타입이 함수형 인터페이스여서 람다나 메서드 참조를 넘길 수 있는 메서드들이다. ArrayList의 forEach는 Consumer를 받아 요소마다 accept를 부르고, removeIf는 Predicate를 받아 요소마다 test를 불러 true인 요소를 지운다. 스트림의 filter는 Predicate를, map은 Function을 받고, 최종 연산(toList 등)이 요소를 흘려보낼 때 그 람다를 부른다. Comparator.comparing은 키를 꺼내는 Function을 받아 Comparator를 만들고, sort가 비교할 때마다 그 Function이 불린다. Optional의 orElseGet은 Supplier를 받아 값이 없을 때만 get을 부른다. 람다를 언제, 몇 번 부를지는 넘겨받은 이 메서드들이 정한다.',
   { why: '반복, 걸러 내기, 정렬, 기본값 만들기처럼 자주 쓰는 일에서 바뀌는 부분은 "요소 하나로 무엇을 할지"뿐이다. 표준 라이브러리가 나머지(반복과 순서, 실행 시점)를 맡고 바뀌는 부분만 람다로 받게 해서, 같은 반복문을 매번 다시 쓰지 않게 했다.',
     use: 'list.forEach(System.out::println), list.removeIf(s -> s.isBlank()), list.sort(Comparator.comparing(String::length)), map.computeIfAbsent(key, k -> new ArrayList<>()), optional.orElseGet(() -> loadDefault()), new Thread(() -> …) 같은 모양으로 매일 쓴다(loadDefault는 예시로 지은 메서드 이름이다). 메서드의 매개변수 타입을 보면 어떤 모양의 람다를 넘겨야 하는지 알 수 있다.' }],
];
