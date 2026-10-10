import java.lang.reflect.Field;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

// (1) 스택·큐·우선순위 큐에서 꺼내는 순서와 PriorityQueue 내부 배열
// (2) 순회 중 삭제: 방법과 컬렉션에 따라 예외가 나는지, 결과가 어떻게 되는지
// 실행: java --add-opens java.base/java.util=ALL-UNNAMED CollectionsProbe.java
public class CollectionsProbe {
    static String heap(PriorityQueue<Integer> pq) throws Exception {
        Field f = PriorityQueue.class.getDeclaredField("queue"); f.setAccessible(true);
        Object[] a = (Object[]) f.get(pq); StringBuilder sb = new StringBuilder();
        for (int i = 0; i < pq.size(); i++) sb.append(i == 0 ? "" : " ").append(a[i]);
        return sb.toString();
    }

    static String removeTest(String coll, String how) {
        List<Integer> list = coll.equals("array") ? new ArrayList<>(List.of(1, 2, 2, 3, 4)) : new CopyOnWriteArrayList<>(List.of(1, 2, 2, 3, 4));
        try {
            switch (how) {
                case "foreach" -> { for (Integer x : list) if (x == 2) list.remove(x); }
                case "iterator" -> { for (Iterator<Integer> it = list.iterator(); it.hasNext(); ) if (it.next() == 2) it.remove(); }
                case "removeIf" -> list.removeIf(x -> x == 2);
                case "indexfwd" -> { for (int i = 0; i < list.size(); i++) if (list.get(i) == 2) list.remove(i); }
                case "indexback" -> { for (int i = list.size() - 1; i >= 0; i--) if (list.get(i) == 2) list.remove(i); }
            }
            return list.toString();
        } catch (Exception e) { return e.getClass().getSimpleName() + " " + list; }
    }

    public static void main(String[] args) throws Exception {
        int[][] inputs = {{5, 2, 8, 1, 9}, {1, 2, 5, 8, 9}, {9, 8, 5, 2, 1}};
        String[] names = {"mixed", "asc", "desc"};
        for (int n = 0; n < inputs.length; n++) {
            Deque<Integer> stack = new ArrayDeque<>(); Queue<Integer> queue = new ArrayDeque<>(); PriorityQueue<Integer> pq = new PriorityQueue<>();
            StringBuilder hs = new StringBuilder();
            for (int x : inputs[n]) { stack.push(x); queue.offer(x); pq.offer(x); hs.append("[").append(heap(pq)).append("]"); }
            StringBuilder so = new StringBuilder(), qo = new StringBuilder(), po = new StringBuilder(), hp = new StringBuilder();
            while (!stack.isEmpty()) so.append(stack.pop()).append(' ');
            while (!queue.isEmpty()) qo.append(queue.poll()).append(' ');
            while (!pq.isEmpty()) { po.append(pq.poll()).append(' '); hp.append("[").append(heap(pq)).append("]"); }
            System.out.println("order," + names[n] + ",stack=" + so.toString().trim());
            System.out.println("order," + names[n] + ",queue=" + qo.toString().trim());
            System.out.println("order," + names[n] + ",pq=" + po.toString().trim());
            System.out.println("heapin," + names[n] + "=" + hs);
            System.out.println("heapout," + names[n] + "=" + hp);
        }
        for (String coll : new String[]{"array", "cow"}) for (String how : new String[]{"foreach", "iterator", "removeIf", "indexfwd", "indexback"})
            System.out.println("remove," + coll + "," + how + "=" + removeTest(coll, how));
    }
}
