// "Optional" 실습에 필요한 용어
module.exports = [
  ['Java 언어', 'orElse와 orElseGet', 'Optional이 비어 있을 때 대신 쓸 기본값을 정하는 두 메서드다. orElse(값)은 기본값 자체를 인자로 받고, orElseGet(함수)는 기본값을 만들어 내는 함수(람다)를 받는다. 자바는 메서드를 호출하기 전에 인자를 먼저 계산하므로, orElse(makeDefault())라고 쓰면 Optional에 값이 있어도 makeDefault()가 실행된다. orElseGet은 비어 있을 때에만 넘겨받은 함수를 실행한다. 그래서 기본값을 만드는 데 시간이 걸리거나 저장, 기록 같은 다른 일이 함께 일어난다면 orElseGet을 쓴다.'],
  ['Java 언어', 'NullPointerException', 'null인 참조로 메서드를 부르거나 필드를 읽으려고 할 때 발생하는 예외다. null은 가리키는 객체가 없다는 뜻이므로, 없는 객체에게 일을 시킬 수 없어서 예외가 난다. null인지 아닌지는 실행 중의 값에 달려 있어서 컴파일러가 미리 잡아 주지 못하고, 실행해 봐야 드러난다(Unchecked 예외라 처리를 강제하지도 않는다). null을 받지 않도록 만든 메서드(Optional.of, Objects.requireNonNull 등)에 null을 넘겨도 이 예외가 발생한다. 값이 없을 수 있는 곳에서는 먼저 null인지 검사하거나, Optional로 값이 없을 수 있음을 타입에 드러내어 줄인다.'],
];
