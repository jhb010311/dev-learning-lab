// "String, StringBuilder" 실습에 필요한 용어
module.exports = [
  ['Java 언어', 'String의 불변성', 'String 객체는 한번 만들어지면 그 안의 글자를 바꿀 수 없다는 성질이다. concat, replace, toUpperCase, trim 같은 메서드는 원본을 고치지 않고 결과를 담은 String을 돌려준다. 그래서 s.toUpperCase()처럼 호출만 하고 돌려준 값을 받지 않으면 s는 그대로이며, s = s.toUpperCase()처럼 다시 받아야 결과를 쓸 수 있다. 이때 바뀌는 것은 문자열 객체가 아니라 변수 s가 가리키는 대상이다. 내용이 바뀌지 않으므로 여러 곳에서 같은 문자열을 함께 가리켜도 안전하고, HashMap의 키로 쓰기에도 알맞다.'],
];
