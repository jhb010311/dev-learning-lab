// "Set과 Map의 종류" 실습에 필요한 용어
module.exports = [
  ['컬렉션·자료구조', 'LinkedHashSet과 LinkedHashMap',
   '넣은 순서를 기억하는 HashSet과 HashMap이다. 해시 테이블에 넣는 방식은 같지만, 항목들을 넣은 순서대로 잇는 연결을 함께 유지해서 순회하면 넣은 순서대로 나온다. 이미 있는 값이나 키를 다시 넣어도 처음 넣은 자리는 바뀌지 않는다. 넣고 찾는 속도는 HashMap과 같이 평균 O(1)이고, 연결을 유지하는 만큼 메모리를 조금 더 쓴다. 넣은 순서대로 보여 줘야 하는 목록에 쓴다.'],
  ['컬렉션·자료구조', 'TreeSet과 TreeMap',
   '값(TreeMap은 키)을 항상 정렬된 상태로 유지하는 Set과 Map이다. 내부는 레드-블랙 트리이며, 넣을 때마다 compareTo(또는 생성자에 준 Comparator)로 비교해 자리를 정하므로 순회하면 작은 것부터 나온다. 넣기, 찾기, 지우기가 모두 O(log n)이라 HashMap보다 느리지만, 가장 작은 값이나 어떤 값 이상인 범위를 바로 구할 수 있다. Comparator를 주지 않았다면 null을 넣을 때 NullPointerException이 나고, Comparable을 구현하지 않은 객체를 넣을 때 ClassCastException이 난다. 두 값이 같은지는 equals가 아니라 비교 결과가 0인지로 판단한다.'],
];
