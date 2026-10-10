import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.StringWriter;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import javax.tools.FileObject;
import javax.tools.ForwardingJavaFileManager;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// "스트림으로 모으기" 실습의 스물네 가지 조합(모으는 방법 8 × 주문 목록 3)을 실제로 실행한다.
// 출력: 방법|목록 => println 결과|키 순서로 정리한 결과(Map일 때)|예외 이름|예외 메시지|값의 실제 클래스|결과 객체의 실제 클래스
public class CollectProbe {
    record Order(String customer, int price) {
        @Override
        public String toString() { return customer + ":" + price; }   // 짧게 출력하려고
    }

    static List<Order> data(String d) {
        if (d.equals("dup")) return List.of(
            new Order("kim", 300), new Order("han", 100), new Order("kim", 200),
            new Order("choi", 400), new Order("han", 500));
        if (d.equals("uniq")) return List.of(
            new Order("kim", 300), new Order("han", 100), new Order("jung", 200),
            new Order("choi", 400), new Order("kang", 500));
        return List.of();
    }

    static String sorted(Map<?, ?> m) { return new TreeMap<Object, Object>(m).toString(); }
    static String cls(Map<?, ?> m) { return m.isEmpty() ? "-" : m.values().iterator().next().getClass().getSimpleName(); }

    static String run(String how, List<Order> orders) {
        try {
            switch (how) {
                case "toList": {
                    List<String> result = orders.stream()
                        .map(Order::customer)
                        .collect(Collectors.toList());
                    return result + "|-|없음||-" + "|" + result.getClass().getSimpleName();
                }
                case "group": {
                    Map<String, List<Order>> result = orders.stream()
                        .collect(Collectors.groupingBy(Order::customer));
                    return result + "|" + sorted(result) + "|없음||" + (result.isEmpty() ? "-" : "List") + "|" + result.getClass().getSimpleName();
                }
                case "count": {
                    Map<String, Long> result = orders.stream()
                        .collect(Collectors.groupingBy(Order::customer, Collectors.counting()));
                    return result + "|" + sorted(result) + "|없음||" + cls(result) + "|" + result.getClass().getSimpleName();
                }
                case "sum": {
                    Map<String, Integer> result = orders.stream()
                        .collect(Collectors.groupingBy(Order::customer, Collectors.summingInt(Order::price)));
                    return result + "|" + sorted(result) + "|없음||" + cls(result) + "|" + result.getClass().getSimpleName();
                }
                case "part": {
                    Map<Boolean, List<Order>> result = orders.stream()
                        .collect(Collectors.partitioningBy(o -> o.price() >= 300));
                    return result + "|" + sorted(result) + "|없음||List" + "|" + result.getClass().getSimpleName();
                }
                case "join": {
                    String result = orders.stream()
                        .map(Order::customer)
                        .collect(Collectors.joining(", "));
                    return result + "|-|없음||-" + "|" + result.getClass().getSimpleName();
                }
                case "toMap": {
                    Map<String, Integer> result = orders.stream()
                        .collect(Collectors.toMap(Order::customer, Order::price));
                    return result + "|" + sorted(result) + "|없음||" + cls(result) + "|" + result.getClass().getSimpleName();
                }
                default: {
                    Map<String, Integer> result = orders.stream()
                        .collect(Collectors.toMap(Order::customer, Order::price, (a, b) -> a + b));
                    return result + "|" + sorted(result) + "|없음||" + cls(result) + "|" + result.getClass().getSimpleName();
                }
            }
        } catch (RuntimeException e) {
            return "-|-|" + e.getClass().getSimpleName() + "|" + e.getMessage() + "|-|-";
        }
    }

    // 소스 문자열을 실제로 컴파일해 성공 여부를 얻는다. 만들어진 클래스 파일은 디스크에 쓰지 않고 버린다
    static boolean compiles(String body) {
        String src = "import java.util.*; import java.util.stream.*; class T { void m() { " + body + " } }";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        JavaFileObject file = new SimpleJavaFileObject(URI.create("string:///T.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        JavaFileManager fm = new ForwardingJavaFileManager<JavaFileManager>(jc.getStandardFileManager(null, null, null)) {
            @Override public JavaFileObject getJavaFileForOutput(Location l, String name, JavaFileObject.Kind kind, FileObject sibling) {
                return new SimpleJavaFileObject(URI.create("mem:///" + name.replace('.', '/') + kind.extension), kind) {
                    @Override public OutputStream openOutputStream() { return new ByteArrayOutputStream(); }
                };
            }
        };
        return jc.getTask(new StringWriter(), fm, d -> { }, List.of("-proc:none"), null, List.of(file)).call();
    }

    public static void main(String[] args) {
        for (String how : new String[] { "toList", "group", "count", "sum", "part", "join", "toMap", "toMapMerge" })
            for (String d : new String[] { "dup", "uniq", "empty" })
                System.out.println(how + "|" + d + " => " + run(how, data(d)));
        System.out.println("확인 counting을 Map<String, Long>으로 받으면 컴파일됨: " + compiles("Map<String, Long> r = Stream.of(\"a\").collect(Collectors.groupingBy(s -> s, Collectors.counting()));"));
        System.out.println("확인 counting을 Map<String, Integer>로 받으면 컴파일됨: " + compiles("Map<String, Integer> r = Stream.of(\"a\").collect(Collectors.groupingBy(s -> s, Collectors.counting()));"));
    }
}
