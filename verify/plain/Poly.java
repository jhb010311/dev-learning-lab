// 선언 타입과 실제 객체 타입의 조합별로 어느 메서드/필드가 선택되는지 실제로 실행해 본다.
public class Poly {
    static class Animal { String name = "동물"; void sound() { System.out.print("Animal.sound"); } static void info() { System.out.print("Animal.info"); } }
    static class Dog extends Animal { String name = "개"; @Override void sound() { System.out.print("Dog.sound"); } static void info() { System.out.print("Dog.info"); } }
    static class Printer { void print(Animal x) { System.out.print("print(Animal)"); } void print(Dog x) { System.out.print("print(Dog)"); } }

    @SuppressWarnings("static-access")
    public static void main(String[] args) {
        Animal aa = new Animal(); Animal ad = new Dog(); Dog dd = new Dog();
        Printer p = new Printer();
        System.out.print("Animal,Animal,override="); aa.sound(); System.out.println();
        System.out.print("Animal,Dog,override="); ad.sound(); System.out.println();
        System.out.print("Dog,Dog,override="); dd.sound(); System.out.println();
        System.out.print("Animal,Animal,overload="); p.print(aa); System.out.println();
        System.out.print("Animal,Dog,overload="); p.print(ad); System.out.println();
        System.out.print("Dog,Dog,overload="); p.print(dd); System.out.println();
        System.out.print("Animal,Animal,static="); aa.info(); System.out.println();
        System.out.print("Animal,Dog,static="); ad.info(); System.out.println();
        System.out.print("Dog,Dog,static="); dd.info(); System.out.println();
        System.out.println("Animal,Animal,field=" + aa.name);
        System.out.println("Animal,Dog,field=" + ad.name);
        System.out.println("Dog,Dog,field=" + dd.name);
    }
}
