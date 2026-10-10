// "접근 제어자와 캡슐화" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'access', q: '필드 앞에 접근 제어자를 아무것도 쓰지 않으면 그 필드는 어디에서 쓸 수 있습니까?',
    a: ['같은 패키지에 있는 클래스에서만 쓸 수 있다', '선언한 그 클래스 안에서만 쓸 수 있다', '같은 패키지와 다른 패키지의 자식 클래스에서 쓸 수 있다', '어느 패키지의 어느 클래스에서나 쓸 수 있다'],
    why: '접근 제어자를 쓰지 않으면 패키지 전용이 되어 같은 패키지 안에서만 쓸 수 있습니다. 같은 클래스 안으로 좁히는 것은 private, 다른 패키지의 자식까지 넓히는 것은 protected, 어디서나 쓰게 하는 것은 public입니다.',
    sim: { c: { mod: 'package', from: 'pkg' }, col: 0, has: '성공' } },
  { lv: 2, id: 'access', q: '필드를 private으로 두고 값을 바꾸는 일은 public 메서드로만 하게 만드는 이유로 가장 알맞은 것은 무엇입니까?',
    a: ['바깥 코드가 값을 마음대로 바꾸지 못하게 하고, 바꿀 때 거치는 검사를 한곳에 둘 수 있어서', 'private 필드는 메모리를 적게 쓰고 public 필드보다 읽는 속도가 훨씬 빨라서', 'private 필드는 실행 중에 값이 절대로 바뀌지 않는 상수가 되어서', '컴파일러가 public 필드를 가진 클래스는 객체로 만들지 못하게 막아서'],
    why: '필드를 숨기면 값을 바꾸는 길이 그 클래스의 메서드로 좁혀집니다. 메서드 안에서 잘못된 값을 걸러 낼 수 있고, 내부 구조를 바꿔도 바깥 코드를 고칠 필요가 없습니다. 이것이 캡슐화입니다. private은 속도나 상수 여부와는 관계가 없습니다.' },
  { lv: 2, id: 'access', q: 'bank 패키지의 Account에 protected int balance가 있습니다. 같은 bank 패키지에 있지만 Account를 상속하지 않은 Teller 클래스에서 acc.balance를 읽으면 어떻게 됩니까?',
    a: ['같은 패키지이므로 컴파일된다', '자식 클래스가 아니므로 컴파일 오류가 난다', '컴파일은 되지만 실행 중에 예외가 난다', '읽기는 되지만 값을 바꾸는 것은 안 된다'],
    why: 'protected는 자식 클래스뿐 아니라 같은 패키지의 모든 클래스에도 열려 있습니다. 패키지 전용보다 넓은 범위이기 때문입니다. 접근 검사는 컴파일할 때 이루어지며, 읽기와 쓰기를 따로 구분하지 않습니다.',
    sim: { c: { mod: 'protected', from: 'pkg' }, col: 0, has: '성공' } },
  { lv: 3, id: 'access', q: 'bank.Account에 protected int balance가 있고, 다른 패키지의 SavingAccount가 Account를 상속합니다. SavingAccount의 메서드 int read(Account other) 안에서 other.balance를 읽으면 어떻게 됩니까?',
    a: ['부모 타입 변수로 접근했으므로 컴파일 오류가 난다', '자식 클래스 안의 코드이므로 문제없이 컴파일된다', '컴파일은 되고 other가 SavingAccount가 아닐 때만 예외가 난다', 'other가 null이 아닌 것이 확인되면 컴파일된다'],
    why: '다른 패키지의 자식 클래스는 protected 멤버를 자기 타입을 통해서만 쓸 수 있습니다. this.balance나 SavingAccount 타입 변수의 balance는 되지만, Account 타입 변수로는 안 됩니다. 컴파일러는 실제 객체가 아니라 변수의 선언 타입을 보고 판단합니다.',
    sim: { c: { mod: 'protected', from: 'subParent' }, col: 2, has: 'balance has protected access' } },
]);
