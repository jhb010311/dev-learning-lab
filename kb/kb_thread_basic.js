// 기초개념 "스레드" 실습의 용어. 근거: Java SE 21 API 문서의 java.lang.Thread(클래스 설명, 생성자의 자동 이름, currentThread(), getName()), Java Language Specification(Java SE 21) 12.1절.
module.exports = [
  ['동시성', 'main 스레드와 스레드의 이름', '자바 프로그램을 java Main으로 실행하면 가상 머신이 그 클래스의 main 메서드를 불러 실행을 시작하고, 이 main 메서드를 위에서부터 실행하는 스레드를 보통 main 스레드라고 부른다. 스레드의 이름은 getName()으로 읽고, Thread.currentThread()는 지금 이 코드를 실행하고 있는 스레드의 Thread 객체를 돌려주므로 Thread.currentThread().getName()은 "누가 이 줄을 실행하고 있는가"를 알려 준다. 이름을 주지 않고 new Thread(...)로 만든 스레드에는 Thread-0, Thread-1처럼 "Thread-" 뒤에 정수를 붙인 이름이 자동으로 붙는다. main 스레드의 이름이 main이라는 것은 명세가 정한 것이 아니라 JDK 21에서 실행해 확인되는 값이다.'],
];
