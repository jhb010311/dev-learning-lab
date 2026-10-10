import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

// "정렬과 Comparator" 실습의 열여섯 가지 조합(정렬 기준 4 × 잔액 2 × 거꾸로 2)을 실제로 실행한다.
// 출력: 기준|잔액|거꾸로 => 정렬된 이름들|compare(park, choi)|compare(park, kim)|잔액 순서가 맞는가
public class SortingProbe {
    record Account(String owner, int balance) implements Comparable<Account> {
        @Override
        public int compareTo(Account other) {          // 클래스가 스스로 정한 순서: 이름순
            return owner.compareTo(other.owner);
        }
    }

    static List<Account> data(String d) {
        if (d.equals("normal")) return new ArrayList<>(List.of(
            new Account("park", 300), new Account("choi", 100), new Account("kim", 300),
            new Account("lee", 100), new Account("han", 200)));
        return new ArrayList<>(List.of(
            new Account("park", 2_000_000_000), new Account("choi", -2_000_000_000), new Account("kim", 2_000_000_000),
            new Account("lee", -2_000_000_000), new Account("han", 0)));
    }

    static Comparator<Account> order(String by) {
        switch (by) {
            case "natural": { Comparator<Account> order = Comparator.naturalOrder(); return order; }
            case "cmp": { Comparator<Account> order = Comparator.comparingInt(Account::balance); return order; }
            case "then": { Comparator<Account> order = Comparator.comparingInt(Account::balance).thenComparing(Account::owner); return order; }
            default: { Comparator<Account> order = (a, b) -> a.balance() - b.balance(); return order; }
        }
    }

    public static void main(String[] args) {
        for (String by : new String[] { "natural", "cmp", "then", "sub" })
            for (String d : new String[] { "normal", "big" })
                for (boolean rev : new boolean[] { false, true }) {
                    List<Account> list = data(d);
                    Comparator<Account> order = order(by);
                    if (rev) order = order.reversed();
                    int c1 = order.compare(list.get(0), list.get(1));    // park와 choi
                    int c2 = order.compare(list.get(0), list.get(2));    // park와 kim
                    list.sort(order);
                    StringBuilder names = new StringBuilder();
                    boolean ok = true;
                    for (int i = 0; i < list.size(); i++) {
                        names.append(i == 0 ? "" : ", ").append(list.get(i).owner());
                        if (i > 0) {
                            int s = Integer.compare(list.get(i - 1).balance(), list.get(i).balance());
                            if (rev ? s < 0 : s > 0) ok = false;
                        }
                    }
                    System.out.println(by + "|" + d + "|" + rev + " => " + names + "|" + c1 + "|" + c2 + "|" + ok);
                }
        // Comparator를 주지 않는 Collections.sort(list)와 list.sort(null)이 naturalOrder와 같은 순서를 내는지
        List<Account> a = data("normal"), b = data("normal"), n = data("normal");
        Collections.sort(a); b.sort(null); n.sort(Comparator.naturalOrder());
        System.out.println("확인 Collections.sort와 naturalOrder가 같은 결과: " + (a.equals(n) && b.equals(n)));
    }
}
