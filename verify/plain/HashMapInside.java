import java.lang.reflect.Field;
import java.util.*;

// 실제 HashMap 내부(버킷 배열, 버킷별 노드 수, 트리 여부)를 리플렉션으로 꺼내 시뮬레이터 모형과 대조한다.
// 실행: java --add-opens java.base/java.util=ALL-UNNAMED HashMapInside.java
public class HashMapInside {
    static final int[] IDS = {3817, 9204, 1466, 7531, 2890, 6043, 5178, 8312, 4725, 1039, 6654, 3391, 7968, 2247, 9580, 5803, 4112, 8076, 1723, 6929, 3250, 7494, 2565, 9841, 5336, 4487, 8659, 1198, 6302, 3774, 7015, 2933, 9127, 5561, 4840, 8423, 1652, 6216, 3609, 7781};
    static String mode = "good";

    static class Key {
        final int id;
        Key(int id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof Key k && k.id == id; }
        @Override public int hashCode() { return mode.equals("good") ? Integer.hashCode(id) : mode.equals("mod4") ? id % 4 : 1; }
    }
    static class EqOnly { final int id; EqOnly(int id) { this.id = id; } @Override public boolean equals(Object o) { return o instanceof EqOnly k && k.id == id; } }
    static class HcOnly { final int id; HcOnly(int id) { this.id = id; } @Override public int hashCode() { return Integer.hashCode(id); } }
    static class None { final int id; None(int id) { this.id = id; } }

    static String dump(HashMap<?, ?> map) throws Exception {
        Field tf = HashMap.class.getDeclaredField("table"); tf.setAccessible(true);
        Object[] tab = (Object[]) tf.get(map);
        StringBuilder sb = new StringBuilder().append(tab.length);
        for (int i = 0; i < tab.length; i++) {
            Object n = tab[i]; if (n == null) continue;
            boolean tree = n.getClass().getSimpleName().equals("TreeNode");
            Field nf = Class.forName("java.util.HashMap$Node").getDeclaredField("next"); nf.setAccessible(true);
            int cnt = 0; for (Object x = n; x != null; x = nf.get(x)) cnt++;
            sb.append(' ').append(i).append(':').append(cnt).append(tree ? "T" : "");
        }
        return sb.toString();
    }

    public static void main(String[] a) throws Exception {
        for (String m : new String[]{"good", "mod4", "same"}) for (float lf : new float[]{0.5f, 0.75f, 1f}) {
            mode = m; HashMap<Key, String> map = new HashMap<>(16, lf);
            for (int i = 0; i < IDS.length; i++) { map.put(new Key(IDS[i]), "회원"); System.out.println(m + " " + lf + " " + (i + 1) + " | " + dump(map)); }
        }
        mode = "good";
        HashMap<Object, String> m1 = new HashMap<>(), m2 = new HashMap<>(), m3 = new HashMap<>(), m4 = new HashMap<>();
        for (int i = 0; i < 13; i++) { m1.put(new Key(IDS[i]), "회원"); m2.put(new EqOnly(IDS[i]), "회원"); m3.put(new HcOnly(IDS[i]), "회원"); m4.put(new None(IDS[i]), "회원"); }
        m1.put(new Key(IDS[0]), "수정"); m2.put(new EqOnly(IDS[0]), "수정"); m3.put(new HcOnly(IDS[0]), "수정"); m4.put(new None(IDS[0]), "수정");
        System.out.println("both size=" + m1.size() + " get=" + m1.get(new Key(IDS[0])));
        System.out.println("eqonly size=" + m2.size() + " get=" + m2.get(new EqOnly(IDS[0])));
        System.out.println("hconly size=" + m3.size() + " get=" + m3.get(new HcOnly(IDS[0])));
        System.out.println("none size=" + m4.size() + " get=" + m4.get(new None(IDS[0])));
    }
}
