import java.util.*;

// final 참조와 방어적 복사: 밖에서 내부 상태를 바꿀 수 있는지 조합별로 확인한다.
public class Immutable {
    static class Order {
        private final List<String> items;
        private final String out;
        Order(List<String> items, boolean copyIn, String out) { this.items = copyIn ? new ArrayList<>(items) : items; this.out = out; }
        List<String> getItems() { return out.equals("copy") ? new ArrayList<>(items) : out.equals("unmod") ? Collections.unmodifiableList(items) : items; }
        int size() { return items.size(); }
    }

    public static void main(String[] args) {
        for (boolean copyIn : new boolean[]{false, true}) for (String out : new String[]{"none", "copy", "unmod"}) {
            List<String> src = new ArrayList<>(List.of("키보드", "마우스"));
            Order o = new Order(src, copyIn, out);
            src.add("모니터");                               // (1) 생성자에 넘긴 원본 리스트를 밖에서 수정
            int afterSrc = o.size();
            String viaGetter;
            try { o.getItems().add("의자"); viaGetter = "ok"; } catch (UnsupportedOperationException e) { viaGetter = "UnsupportedOperationException"; }   // (2) getter로 받은 리스트를 수정
            System.out.println(copyIn + "," + out + "=" + afterSrc + "," + viaGetter + "," + o.size());
        }
    }
}
