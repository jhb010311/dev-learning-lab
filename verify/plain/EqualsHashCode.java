import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class EqualsHashCode {

    static class OnlyEquals {
        final String id;

        OnlyEquals(String id) {
            this.id = id;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof OnlyEquals other && id.equals(other.id);
        }
    }

    static class Both {
        final String id;

        Both(String id) {
            this.id = id;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Both other && id.equals(other.id);
        }

        @Override
        public int hashCode() {
            return Objects.hash(id);
        }
    }

    record AsRecord(String id) {
    }

    public static void main(String[] args) {
        OnlyEquals a = new OnlyEquals("user-1");
        OnlyEquals b = new OnlyEquals("user-1");
        System.out.println("a.equals(b)       : " + a.equals(b));
        System.out.println("hashCode 같은가   : " + (a.hashCode() == b.hashCode()));

        Map<OnlyEquals, String> broken = new HashMap<>();
        broken.put(a, "주문 내역");
        System.out.println("equals만 재정의   : " + broken.get(b));

        Map<Both, String> fixed = new HashMap<>();
        fixed.put(new Both("user-1"), "주문 내역");
        System.out.println("둘 다 재정의      : " + fixed.get(new Both("user-1")));

        Map<AsRecord, String> byRecord = new HashMap<>();
        byRecord.put(new AsRecord("user-1"), "주문 내역");
        System.out.println("record            : " + byRecord.get(new AsRecord("user-1")));
    }
}
