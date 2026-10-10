import java.lang.reflect.Field;
import java.util.ArrayList;

// ArrayList 내부 배열의 길이가 언제, 얼마로 늘어나는지 리플렉션으로 확인한다.
// 실행: java --add-opens java.base/java.util=ALL-UNNAMED ArrayListGrow.java
public class ArrayListGrow {
    public static void main(String[] a) throws Exception {
        Field f = ArrayList.class.getDeclaredField("elementData"); f.setAccessible(true);
        ArrayList<Integer> list = new ArrayList<>();
        int prev = ((Object[]) f.get(list)).length, copied = 0;
        System.out.println("처음 길이 " + prev);
        for (int x = 1; x <= 40; x++) {
            int before = list.size();
            list.add(x);
            int cap = ((Object[]) f.get(list)).length;
            if (cap != prev) { if (prev > 0) copied += before; System.out.println("add " + x + "번째: " + prev + " -> " + cap + " (복사 " + (prev > 0 ? before : 0) + "개)"); prev = cap; }
        }
        System.out.println("복사 합계 " + copied);
    }
}
