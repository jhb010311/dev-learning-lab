import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

// "Set과 Map의 종류" 실습의 서른 가지 조합(종류 3 × 넣는 값 5 × Set/Map 2)을 실제로 실행한다.
// 실행: java --add-opens java.base/java.util=ALL-UNNAMED -cp verify/out/setmap SetMapProbe
// 출력: 종류|넣는 값|모양 => println 결과|크기|중복을 넣었을 때 돌려준 값|예외 이름|예외가 난 차례|칸 번호(꺼내는 순서대로)|칸 수
public class SetMapProbe {
    record Task(int id) { }                    // Comparable을 구현하지 않았다

    static Object[] data(String d) {
        switch (d) {
            case "words": return new Object[] { "grape", "apple", "date", "apple", "fig" };
            case "small": return new Object[] { 3, 1, 2, 1, 5 };
            case "big": return new Object[] { 40, 5, 17, 5, 100 };
            case "null": return new Object[] { "grape", "apple", null, "apple", "fig" };
            default: return new Object[] { new Task(40), new Task(5), new Task(17), new Task(5), new Task(100) };
        }
    }

    // 실제 HashMap의 내부 배열에서, 꺼내는 순서대로 각 항목이 들어 있는 칸 번호를 읽는다
    static String cells(HashMap<?, ?> map) throws Exception {
        Field tf = HashMap.class.getDeclaredField("table"); tf.setAccessible(true);
        Object[] tab = (Object[]) tf.get(map);
        if (tab == null) return "|0";
        Field nf = Class.forName("java.util.HashMap$Node").getDeclaredField("next"); nf.setAccessible(true);
        List<String> out = new ArrayList<>();
        for (int i = 0; i < tab.length; i++) for (Object x = tab[i]; x != null; x = nf.get(x)) out.add(String.valueOf(i));
        return String.join(",", out) + "|" + tab.length;
    }

    static String run(String kind, String d, String shape) throws Exception {
        Object[] in = data(d);
        String dup = "-", ex = "없음", print = "-", size = "-", cells = "-|-";
        int at = 0;
        try {
            if (shape.equals("set")) {
                Set<Object> set = kind.equals("hash") ? new HashSet<>() : kind.equals("linked") ? new LinkedHashSet<>() : new TreeSet<>();
                for (int i = 0; i < in.length; i++) { at = i + 1; boolean r = set.add(in[i]); if (i == 3) dup = String.valueOf(r); }
                at = 0;
                print = String.valueOf(set); size = String.valueOf(set.size());
                if (kind.equals("hash")) { Field mf = HashSet.class.getDeclaredField("map"); mf.setAccessible(true); cells = cells((HashMap<?, ?>) mf.get(set)); }
            } else {
                Map<Object, Integer> map = kind.equals("hash") ? new HashMap<>() : kind.equals("linked") ? new LinkedHashMap<>() : new TreeMap<>();
                for (int i = 0; i < in.length; i++) { at = i + 1; Integer r = map.put(in[i], i + 1); if (i == 3) dup = String.valueOf(r); }
                at = 0;
                print = String.valueOf(map); size = String.valueOf(map.size());
                if (kind.equals("hash")) cells = cells((HashMap<?, ?>) map);
            }
        } catch (RuntimeException e) {
            ex = e.getClass().getSimpleName();
        }
        return print + "|" + size + "|" + dup + "|" + ex + "|" + at + "|" + cells;
    }

    // 화면의 코드처럼 타입을 적어 쓴 경우에도 컴파일되고, 실행 중에 같은 예외가 나는지 확인한다
    static String typedObj() {
        try { Set<Task> set = new TreeSet<>(); set.add(new Task(40)); return "예외 없음"; } catch (ClassCastException e) { return "ClassCastException"; }
    }
    static String typedNull() {
        Set<String> set = new TreeSet<>();
        set.add("grape"); set.add("apple");
        try { set.add(null); return "예외 없음"; } catch (NullPointerException e) { return "NullPointerException, 그때 크기 " + set.size(); }
    }

    public static void main(String[] args) throws Exception {
        for (String kind : new String[] { "hash", "linked", "tree" })
            for (String d : new String[] { "words", "small", "big", "null", "obj" })
                for (String shape : new String[] { "set", "map" })
                    System.out.println(kind + "|" + d + "|" + shape + " => " + run(kind, d, shape));
        System.out.println("확인 typedObj: " + typedObj());
        System.out.println("확인 typedNull: " + typedNull());
    }
}
