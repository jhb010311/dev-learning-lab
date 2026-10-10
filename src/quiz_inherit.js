// "상속과 오버라이딩" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'inherit', q: 'Dog가 Animal을 상속합니다. new Dog()를 하면 실행이 끝나는 순서는 어떻게 됩니까?',
    a: ['Animal 생성자 → Dog의 필드 초기화식 → Dog 생성자의 본문', 'Dog의 필드 초기화식 → Dog 생성자의 본문 → Animal 생성자', 'Dog의 필드 초기화식 → Animal 생성자 → Dog 생성자의 본문', 'Dog 생성자의 본문 → Dog의 필드 초기화식 → Animal 생성자'],
    why: '자식 생성자는 첫 줄에서 부모 생성자를 먼저 부릅니다. 부모 생성자가 끝난 뒤에야 자식의 필드 초기화식이 실행되고, 자식 생성자의 본문은 가장 마지막입니다. 물려받은 부분이 먼저 준비되어야 자식이 그것을 쓸 수 있기 때문입니다.',
    sim: { c: { pctor: 'arg', sup: 'arg', pcall: false, sm: false }, col: 1, has: 'Animal(String) 실행 / Dog() 실행' } },
  { lv: 2, id: 'inherit', q: '부모 클래스에 Animal(String name) 생성자만 있습니다. 자식의 생성자 Dog()에 super(...)를 쓰지 않으면 컴파일 오류가 나는 이유는 무엇입니까?',
    a: ['컴파일러가 넣어 주는 super()가 부를 인자 없는 부모 생성자가 없기 때문이다', '자식 클래스는 부모와 똑같은 인자를 받는 생성자만 가질 수 있기 때문이다', 'super(...)는 어떤 경우든 생략할 수 없고 반드시 직접 적어야 하기 때문이다', '부모의 생성자는 상속되지 않아서 자식에서는 부를 방법이 없기 때문이다'],
    why: 'super(...)를 쓰지 않으면 컴파일러가 첫 줄에 인자 없는 super()를 넣습니다. 부모에 생성자를 직접 적었으므로 인자 없는 기본 생성자는 생기지 않았고, super()가 부를 대상이 없습니다. super("바둑이")처럼 인자를 넘겨 직접 부르면 해결됩니다.',
    sim: { c: { pctor: 'arg', sup: 'omit', pcall: false, sm: false }, col: 0, has: '오류' } },
  { lv: 3, id: 'inherit', q: 'Animal의 생성자가 describe()를 부릅니다. Dog는 필드 String sound = "멍멍"을 선언하고 describe()를 오버라이딩해 sound를 출력합니다. new Dog()를 하는 동안 describe()는 무엇을 출력합니까?',
    a: ['sound=null을 출력한다', 'sound=멍멍을 출력한다', 'Animal의 describe()가 대신 실행된다', '컴파일 오류가 나서 실행되지 않는다'],
    why: '부모 생성자 안에서 불러도 실제 객체가 Dog이므로 Dog의 describe()가 실행됩니다. 그런데 Dog의 필드 초기화식은 부모 생성자가 끝난 뒤에 실행되므로, 그 시점의 sound는 기본값 null입니다. 그래서 생성자에서는 오버라이딩될 수 있는 메서드를 부르지 않는 것이 좋습니다.',
    sim: { c: { pctor: 'arg', sup: 'arg', pcall: true, sm: false }, col: 1, has: 'sound=null' } },
  { lv: 2, id: 'inherit', q: 'Dog가 오버라이딩한 describe() 안에서 super.describe()를 부르면 어떻게 됩니까?',
    a: ['Animal에 적힌 원래의 describe()가 실행된다', 'Dog의 describe()가 자기 자신을 다시 부른다', 'Animal 객체가 새로 하나 더 만들어진다', '오버라이딩이 취소되어 컴파일 오류가 난다'],
    why: 'super.메서드()는 오버라이딩으로 가려진 부모의 메서드를 부릅니다. 객체는 여전히 하나이고, 그 객체를 대상으로 부모에 적힌 코드가 실행됩니다. 부모의 동작을 그대로 쓰면서 자식의 동작을 덧붙일 때 씁니다.',
    sim: { c: { pctor: 'arg', sup: 'arg', pcall: false, sm: true }, col: 2, has: 'name=바둑이 / sound=멍멍' } },
]);
