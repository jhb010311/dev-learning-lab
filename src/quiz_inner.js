// "내부 클래스와 익명 클래스" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'inner', q: 'static을 붙이지 않은 내부 클래스 Inner의 객체를 만들 때 반드시 먼저 있어야 하는 것은 무엇입니까?',
    a: ['바깥 클래스 Outer의 객체', 'Inner를 상속한 하위 클래스', 'Outer에 선언한 static 필드', 'Inner에 붙인 public 접근 제어자'],
    why: 'static이 없는 내부 클래스의 객체는 어느 한 바깥 객체에 딸려 만들어지고, 그 바깥 객체를 가리키는 참조를 갖습니다. 그래서 바깥 객체 o가 있어야 o.new Inner()로 만들 수 있고, 바깥 객체 없이 만들려고 하면 컴파일 오류가 납니다.',
    sim: { c: { kind: 'inner', use: 'alone', loc: 'keep' }, col: 0, has: 'an enclosing instance' } },
  { lv: 2, id: 'inner', q: '람다 안에서 쓰는 지역 변수의 값을 바꾸면 컴파일 오류가 납니다. 자바가 이렇게 막는 까닭으로 알맞은 것은 무엇입니까?',
    a: ['람다가 변수의 값을 복사해 가므로 원본이 바뀌면 복사본과 달라지기 때문이다', '람다가 지역 변수를 static 필드로 옮겨 모든 객체가 함께 쓰기 때문이다', '지역 변수는 원래 선언할 때 한 번만 값을 넣을 수 있기 때문이다', '람다가 실행될 때마다 지역 변수를 처음 값으로 새로 만들기 때문이다'],
    why: '람다와 익명 클래스는 지역 변수 자체가 아니라 그 값을 복사해 갖습니다. 지역 변수는 메서드가 끝나면 사라지기 때문입니다. 원본을 바꿀 수 있게 두면 복사본과 값이 달라져 혼란스러우므로, 값이 바뀌지 않는(사실상 final인) 변수만 쓰게 합니다.',
    sim: { c: { kind: 'lambda', use: 'alone', loc: 'change' }, col: 0, has: 'effectively final' } },
  { lv: 3, id: 'inner', q: 'Outer 클래스의 메서드 안에서 Runnable을 익명 클래스로 만들고, run() 안에서 this.getClass().getName()을 출력했습니다. 무엇이 출력됩니까?',
    a: ['Outer$1', 'Outer', 'Runnable', 'Object'],
    why: '익명 클래스 안의 this는 그 익명 클래스로 만든 객체 자신입니다. 이름이 없는 클래스라서 컴파일러가 Outer$1이라는 이름을 붙입니다. 같은 코드를 람다로 쓰면 this가 바깥 객체를 가리켜 Outer가 출력됩니다.',
    sim: { c: { kind: 'anon', use: 'alone', loc: 'keep' }, col: 1, has: 'this = Outer$1' } },
  { lv: 3, id: 'inner', q: 'static 중첩 클래스 Nested의 메서드에서 바깥 클래스 Outer의 인스턴스 필드 name을 그대로 읽으려고 합니다. 어떻게 됩니까?',
    a: ['컴파일 오류가 나서 실행되지 않는다', '값이 없는 것으로 보아 null이 읽힌다', '가장 최근에 만든 Outer 객체의 값이 읽힌다', '실행 중에 NullPointerException이 난다'],
    why: 'static 중첩 클래스의 객체는 바깥 객체를 가리키는 참조가 없습니다. name은 Outer 객체마다 따로 있는 필드라서 누구의 name인지 정할 수 없고, 컴파일러가 오류로 막습니다.',
    sim: { c: { kind: 'nested', use: 'field', loc: 'keep' }, col: 0, has: '오류' } },
]);
