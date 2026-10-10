// Dog 변수에 Animal 객체를 넣으면 컴파일되지 않는다는 것을 확인하는 파일 (일부러 오류를 낸다).
class A {}
class D extends A {}
public class PolyBad { public static void main(String[] a) { D d = new A(); } }
