// "직렬화" 실습에 필요한 용어
module.exports = [
  ['Java 언어', 'Serializable', '자바의 기본 직렬화로 저장할 수 있는 클래스임을 표시하는 인터페이스다. 구현할 메서드가 하나도 없고, 클래스 선언에 implements Serializable을 붙이는 것만으로 표시가 된다. 이 표시가 없는 객체를 ObjectOutputStream으로 쓰려고 하면 NotSerializableException이 발생한다. 객체를 저장할 때는 그 객체가 필드로 가리키는 객체들도 함께 저장되므로, 그 객체들의 클래스도 모두 Serializable이어야 한다.'],
  ['Java 언어', 'transient', '직렬화할 때 이 필드는 저장하지 말라고 표시하는 키워드다. transient를 붙인 필드는 파일이나 네트워크로 나가는 바이트에 들어가지 않고, 되살린 객체에서는 그 타입의 기본값(숫자는 0, 참조형은 null)이 된다. 비밀번호처럼 밖에 남기면 안 되는 값, 다시 계산하면 되는 값, Serializable이 아니어서 저장할 수 없는 객체를 가리키는 필드에 쓴다. 되살린 뒤에 그 필드가 비어 있다는 점을 코드에서 고려해야 한다.'],
  ['Java 언어', 'serialVersionUID', '직렬화된 데이터가 어떤 버전의 클래스로 만들어졌는지를 나타내는 번호다. 객체를 저장할 때 이 번호가 함께 기록되고, 되살릴 때 지금 클래스의 번호와 다르면 InvalidClassException이 발생한다. 클래스에 private static final long serialVersionUID = 1L;처럼 직접 적지 않으면 자바가 클래스의 이름, 필드, 메서드 등으로부터 값을 계산하는데, 클래스를 조금만 고쳐도 이 값이 달라질 수 있다. 그래서 Serializable 클래스에는 이 번호를 직접 적어 두는 것이 권장된다.'],
];
