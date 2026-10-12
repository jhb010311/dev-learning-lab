// 기초개념 "스트림" 실습의 용어. 근거(Java SE 21 API, 직접 열어 확인): https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html , https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html (마지막 약 2천 자는 읽지 못함), https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html
module.exports = [
  ['Java 언어', 'filter와 map', 'filter와 map은 스트림에 이어 붙이는 두 가지 중간 연산이다. filter(조건)는 조건이 true인 값만 남긴 스트림을 돌려주고, 조건을 담은 n -> n % 2 == 0 같은 람다는 값 하나를 받아 true나 false를 돌려준다. map(함수)은 스트림의 값마다 함수를 적용한 결과로 이루어진 스트림을 돌려주므로, 값을 바꾸지만 값의 개수는 그대로이다. 둘 다 원본 컬렉션에서 값을 지우거나 고치지 않고 새 스트림을 돌려주며, 결과를 얻으려면 끝에 toList 같은 최종 연산이 필요하다.'],
  ['Java 언어', 'toList()와 스트림의 결과', 'toList()는 스트림이 흘려보낸 값을 스트림에서 만난 순서대로 List에 모으는 최종 연산이다. 중간 연산인 filter와 map은 새 스트림을 돌려줄 뿐이어서, 값을 담은 리스트는 toList() 같은 최종 연산을 거쳐야 얻는다. toList()가 돌려주는 List는 수정할 수 없어서 add 같은 메서드를 부르면 UnsupportedOperationException이 난다. 스트림은 값을 저장하는 자료구조가 아니라 원본에서 값을 전달하는 통로이고, 연산은 원본을 바꾸지 않는다.'],
];
