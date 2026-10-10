import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.IntFunction;

// "equals와 hashCode" 실습의 열두 가지 조합(재정의 방식 6 × id가 같은지 2)을 실제로 실행한다.
// 출력: 방식|id => a.equals(b)|hashCode가 같은가|map.get(b)|set의 크기
public class EqHashProbe {
    static class None { final int id; None(int id) { this.id = id; } }
    static class EqOnly { final int id; EqOnly(int id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof EqOnly other && id == other.id; } }
    static class HashOnly { final int id; HashOnly(int id) { this.id = id; }
        @Override public int hashCode() { return Objects.hash(id); } }
    static class Both { final int id; Both(int id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof Both other && id == other.id; }
        @Override public int hashCode() { return Objects.hash(id); } }
    static class Const { final int id; Const(int id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof Const other && id == other.id; }
        @Override public int hashCode() { return 42; } }
    record Rec(int id) { }

    static void run(String how, IntFunction<Object> make) {
        for (String same : new String[] { "same", "diff" }) {
            Object a = make.apply(1), b = make.apply(same.equals("same") ? 1 : 2);
            Map<Object, String> map = new HashMap<>();
            map.put(a, "주문 내역");
            Set<Object> set = new HashSet<>();
            set.add(a); set.add(b);
            System.out.println(how + "|" + same + " => " + a.equals(b) + "|" + (a.hashCode() == b.hashCode()) + "|" + map.get(b) + "|" + set.size());
        }
    }
    public static void main(String[] args) {
        run("none", None::new); run("eq", EqOnly::new); run("hash", HashOnly::new);
        run("both", Both::new); run("const", Const::new); run("record", Rec::new);
    }
}
