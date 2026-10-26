// 공개 사이트를 만든 뒤에 추가한 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 빌드할 때 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'eqhash', q: 'equals를 재정의할 때 hashCode도 함께 재정의해야 하는 이유는 무엇입니까?',
    a: ['HashMap과 HashSet이 hashCode로 찾을 자리를 먼저 정한 뒤에 그 자리에서 equals로 비교하기 때문이다', 'equals가 내부에서 항상 hashCode를 호출해 비교하기 때문이다', 'hashCode를 재정의하지 않으면 컴파일 오류가 나기 때문이다', 'hashCode가 객체의 메모리 주소라서 equals보다 정확하기 때문이다'],
    why: 'HashMap과 HashSet은 hashCode로 자리(버킷)를 정하고, 그 자리에 있는 키와만 equals로 비교합니다. equals로 같은 두 객체의 hashCode가 다르면 서로 다른 자리를 보게 되어 찾지 못합니다. 컴파일러는 이것을 막아 주지 않습니다.' },
  { lv: 2, id: 'eqhash', q: 'equals는 id를 비교하도록 재정의하고, hashCode는 어떤 객체든 42를 돌려주도록 만들었습니다. 이 클래스를 HashMap의 키로 쓰면 어떻게 됩니까?',
    a: ['결과는 맞지만 모든 키가 한 자리에 몰려 키가 많아질수록 느려진다', '규약을 어겼으므로 내용이 같은 키로 값을 꺼낼 수 없다', '키가 하나만 저장되고 나머지는 덮어써진다', 'HashMap이 실행 중에 예외를 던진다'],
    why: 'equals가 같은 객체는 hashCode도 같아야 한다는 규약은 지켰으므로 결과는 맞습니다. 하지만 모든 키의 hashCode가 같아 한 자리에 몰리고, 찾을 때마다 그 자리의 키를 하나씩 equals로 비교해야 합니다.' },
  { lv: 3, id: 'eqhash', q: '아래 코드를 실행하면 무엇이 출력됩니까?',
    code: 'import java.util.HashMap;\nimport java.util.Map;\n\nclass Order {                            // 예시로 만든 클래스\n    final int id;\n    Order(int id) { this.id = id; }\n\n    @Override\n    public boolean equals(Object o) {    // id가 같으면 같다고 본다\n        return o instanceof Order other && id == other.id;\n    }\n    // hashCode는 재정의하지 않았다\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Map<Order, String> map = new HashMap<>();\n        map.put(new Order(1), "주문 내역");\n        System.out.println(map.get(new Order(1)));\n    }\n}',
    a: ['null', '넣어 둔 값', 'ClassCastException', '실행할 때마다 값이 나오기도 하고 null이 나오기도 하며, 대체로 값이 나온다'],
    why: 'map.put과 map.get에 넘긴 new Order(1)은 id가 같은 서로 다른 객체입니다. hashCode를 재정의하지 않았으므로 두 객체는 Object가 주는 hashCode를 쓰고, 그 값은 (거의 항상) 서로 다릅니다. HashMap은 hashCode로 찾을 자리를 먼저 정하므로 다른 자리를 찾아보고, 재정의한 equals는 불러 보지도 않은 채 null을 돌려줍니다.',
    sim: { c: { how: 'eq', same: 'same' }, col: 2, has: 'null' } },
]);
