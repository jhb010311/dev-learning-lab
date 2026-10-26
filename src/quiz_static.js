// "static과 인스턴스" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'static', q: 'static 필드와 인스턴스 필드의 차이로 맞는 것은 무엇입니까?',
    a: ['static 필드는 클래스에 하나만 있고, 인스턴스 필드는 객체마다 따로 있다', 'static 필드는 값을 바꿀 수 없고, 인스턴스 필드는 값을 바꿀 수 있다', 'static 필드는 객체마다 따로 있고, 인스턴스 필드는 클래스에 하나만 있다', 'static 필드는 같은 클래스 안에서만 쓰고, 인스턴스 필드는 어디서나 쓴다'],
    why: 'static 필드는 클래스에 속해 하나만 만들어지고 모든 객체가 그 하나를 함께 씁니다. 인스턴스 필드는 객체를 만들 때마다 그 객체 안에 새로 생깁니다. 값을 못 바꾸게 하는 것은 final이고, 쓸 수 있는 범위를 정하는 것은 접근 제어자입니다.' },
  { lv: 2, id: 'static', q: 'static 메서드 안에서 인스턴스 필드를 이름만 적어서 쓰면 컴파일 오류가 나는 이유는 무엇입니까?',
    a: ['static 메서드는 객체 없이 불리므로 어느 객체의 필드인지 정할 수 없기 때문이다', 'static 메서드는 클래스가 준비되기 전에 실행되어 필드가 아직 없기 때문이다', 'static 메서드에서는 private 필드에 접근하는 것이 금지되어 있기 때문이다', 'static 메서드는 값을 읽기만 할 수 있고 필드를 바꿀 수 없기 때문이다'],
    why: '인스턴스 필드는 객체마다 따로 있어서 "어느 객체의 것인가"가 정해져야 읽을 수 있습니다. static 메서드는 Counter.report()처럼 객체 없이 불리므로 그 대상(this)이 없습니다. 객체를 인자로 받아 c.count처럼 쓰는 것은 됩니다.',
    sim: { c: { decl: 'inst', extra: 'sm', nb: '1' }, col: 0, has: 'non-static variable count' } },
  { lv: 3, id: 'static', q: '아래 코드를 실행하면 무엇이 출력됩니까?',
    code: 'class Counter {                      // 예시로 만든 클래스\n    static int count;\n\n    void hit() {\n        count++;\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Counter a = new Counter();\n        Counter b = new Counter();\n        a.hit();\n        a.hit();\n        b.hit();\n        System.out.println(a.count + " " + b.count);\n    }\n}',
    a: ['3 3', '2 1', '3 1', '2 3'],
    why: 'count에 static이 붙어 있으므로 count는 객체마다 따로 생기지 않고 Counter 클래스에 하나뿐입니다. a.hit()과 b.hit()은 모두 그 하나를 올리므로 세 번 올라가 3이 되고, a.count와 b.count는 둘 다 같은 count를 읽습니다. static을 떼면 count가 객체마다 따로 생겨 2 1이 나옵니다.',
    sim: { c: { decl: 'static', extra: 'none', nb: '1' }, col: 1, has: '3 3' } },
  { lv: 3, id: 'static', q: 'Counter의 count는 static 필드이고 hit()은 static이 붙지 않은 메서드입니다. 객체를 만들지 않고 Counter.hit()이라고 쓰면 어떻게 됩니까?',
    a: ['hit()이 인스턴스 메서드라서 컴파일 오류가 난다', 'count가 static이므로 정상적으로 1이 늘어난다', '컴파일은 되고 실행 중에 예외가 발생한다', '컴파일러가 객체를 하나 만들어서 불러 준다'],
    why: '클래스 이름으로 부를 수 있는 것은 static 메서드뿐입니다. hit()이 건드리는 필드가 static이어도 hit() 자체에 static이 없으면 대상 객체가 있어야 합니다. 이 검사는 컴파일할 때 이루어지므로 실행되기 전에 오류로 걸립니다.',
    sim: { c: { decl: 'static', extra: 'clsHit', nb: '1' }, col: 0, has: 'non-static method hit()' } },
]);
