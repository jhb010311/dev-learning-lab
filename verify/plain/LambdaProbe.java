import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

// "람다와 함수형 인터페이스" 실습의 서른여섯 가지 조합(인터페이스 4 × 쓰는 방식 3 × 부르는 횟수 3)을 실제로 실행한다.
// 출력: 인터페이스|방식|횟수 => 추상 메서드 이름|매개변수 개수|돌려주는 타입|본문 실행 횟수|출력된 줄들( / 로 이음)
public class LambdaProbe {
    static int count;

    // 넘길 동작이 하는 일
    static int length(String s) { count++; System.out.println("본문 실행: length(" + s + ")"); return s.length(); }
    static boolean isLong(String s) { count++; System.out.println("본문 실행: isLong(" + s + ")"); return s.length() > 3; }
    static String make() { count++; System.out.println("본문 실행: make()"); return "hello"; }
    static void show(String s) { count++; System.out.println("본문 실행: show(" + s + ")"); }

    // 동작을 받아서 부르는 쪽
    static void run(Function<String, Integer> f, int times) {
        System.out.println("run 시작");
        if (times >= 1) System.out.println("결과 " + f.apply("hello"));
        if (times >= 2) System.out.println("결과 " + f.apply("hi"));
        System.out.println("run 끝");
    }
    static void runP(Predicate<String> p, int times) {
        System.out.println("run 시작");
        if (times >= 1) System.out.println("결과 " + p.test("hello"));
        if (times >= 2) System.out.println("결과 " + p.test("hi"));
        System.out.println("run 끝");
    }
    static void runS(Supplier<String> s, int times) {
        System.out.println("run 시작");
        if (times >= 1) System.out.println("결과 " + s.get());
        if (times >= 2) System.out.println("결과 " + s.get());
        System.out.println("run 끝");
    }
    static void runC(Consumer<String> c, int times) {
        System.out.println("run 시작");
        if (times >= 1) c.accept("hello");
        if (times >= 2) c.accept("hi");
        System.out.println("run 끝");
    }

    static void function(String form, int times) {
        Function<String, Integer> f;
        if (form.equals("anon")) f = new Function<String, Integer>() {
            @Override
            public Integer apply(String s) {
                return length(s);
            }
        };
        else if (form.equals("lambda")) f = s -> length(s);
        else f = LambdaProbe::length;
        System.out.println("만든 뒤");
        run(f, times);
    }
    static void predicate(String form, int times) {
        Predicate<String> p;
        if (form.equals("anon")) p = new Predicate<String>() {
            @Override
            public boolean test(String s) {
                return isLong(s);
            }
        };
        else if (form.equals("lambda")) p = s -> isLong(s);
        else p = LambdaProbe::isLong;
        System.out.println("만든 뒤");
        runP(p, times);
    }
    static void supplier(String form, int times) {
        Supplier<String> s;
        if (form.equals("anon")) s = new Supplier<String>() {
            @Override
            public String get() {
                return make();
            }
        };
        else if (form.equals("lambda")) s = () -> make();
        else s = LambdaProbe::make;
        System.out.println("만든 뒤");
        runS(s, times);
    }
    static void consumer(String form, int times) {
        Consumer<String> c;
        if (form.equals("anon")) c = new Consumer<String>() {
            @Override
            public void accept(String s) {
                show(s);
            }
        };
        else if (form.equals("lambda")) c = s -> show(s);
        else c = LambdaProbe::show;
        System.out.println("만든 뒤");
        runC(c, times);
    }

    // 인터페이스에 하나뿐인 추상 메서드의 이름, 매개변수 개수, 돌려주는 타입
    static String shape(Class<?> k) {
        String out = "";
        for (Method m : k.getMethods()) if (Modifier.isAbstract(m.getModifiers())) out += (out.isEmpty() ? "" : "+") + m.getName() + "|" + m.getParameterCount() + "|" + m.getGenericReturnType().getTypeName();
        return out;
    }

    public static void main(String[] args) throws Exception {
        PrintStream real = System.out;
        Class<?>[] types = { Function.class, Predicate.class, Supplier.class, Consumer.class };
        String[] fis = { "function", "predicate", "supplier", "consumer" };
        for (int i = 0; i < fis.length; i++)
            for (String form : new String[] { "anon", "lambda", "ref" })
                for (int times = 0; times <= 2; times++) {
                    ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                    count = 0;
                    switch (fis[i]) {
                        case "function": function(form, times); break;
                        case "predicate": predicate(form, times); break;
                        case "supplier": supplier(form, times); break;
                        default: consumer(form, times);
                    }
                    System.out.flush();
                    System.setOut(real);
                    String lines = String.join(" / ", buf.toString(StandardCharsets.UTF_8).trim().split("\\R"));
                    System.out.println(fis[i] + "|" + form + "|" + times + " => " + shape(types[i]) + "|" + count + "|" + lines);
                }
    }
}
