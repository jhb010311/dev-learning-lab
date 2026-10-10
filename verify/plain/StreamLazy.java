import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

// 스트림의 지연 평가: 원소가 연산을 통과하는 실제 순서를 조합별로 기록한다.
public class StreamLazy {
    static List<String> log = new ArrayList<>();

    static String run(String term, boolean sorted, boolean limit) {
        Stream<Integer> s = List.of(5, 2, 8, 1, 9, 4).stream().filter(x -> { log.add("filter(" + x + ")"); return x > 3; });
        if (sorted) s = s.sorted();
        s = s.map(x -> { log.add("map(" + x + ")"); return x * 10; });
        if (limit) s = s.limit(2);
        if (term.equals("toList")) return s.toList().toString();
        if (term.equals("findFirst")) return s.findFirst().toString();
        return "(실행 안 됨)";
    }

    public static void main(String[] args) {
        for (String term : new String[]{"none", "toList", "findFirst"}) for (boolean sorted : new boolean[]{false, true}) for (boolean limit : new boolean[]{false, true}) {
            log.clear(); String out = run(term, sorted, limit);
            System.out.println(term + "," + sorted + "," + limit + "=" + String.join(" ", log) + "|" + out);
        }
    }
}
