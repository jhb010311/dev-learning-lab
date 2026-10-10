import java.util.*;
import java.util.stream.*;

// 계산으로 정해지는 모형 세 가지를 자바로 따로 계산해 대조한다: 전략 패턴 선택, 백분위, 샤드 재배치 비율
public class SmallChecks {
    interface PaymentStrategy { String type(); String pay(); }
    record Impl(String type) implements PaymentStrategy { public String pay() { return type + "Payment.pay 실행"; } }

    public static void main(String[] args) {
        Map<String, PaymentStrategy> m = Stream.of("CARD", "BANK", "KAKAO", "NAVER").map(Impl::new).collect(Collectors.toMap(Impl::type, s -> s));
        for (String t : List.of("CARD", "KAKAO", "NAVER")) {
            int cmp = 0; for (String x : List.of("CARD", "BANK", "KAKAO", "NAVER")) { cmp++; if (x.equals(t)) break; }
            System.out.println("strategy," + t + "=" + m.get(t).pay() + ", if-else 비교 " + cmp + "번");
        }
        for (double ratio : new double[]{0, 0.5, 2, 6, 20}) {
            int n = 1000, slow = (int) Math.round(n * ratio / 100); double[] d = new double[n];
            for (int i = 0; i < n - slow; i++) d[i] = 0.08 + 0.04 * (i / (double) Math.max(1, n - slow - 1));
            for (int j = n - slow; j < n; j++) d[j] = 3; Arrays.sort(d);
            double mean = Arrays.stream(d).sum() / n;
            System.out.printf(Locale.ROOT, "pct,%s=%.2f,%.2f,%.2f,%.2f,%.2f%n", ratio == 0.5 ? "0.5" : String.valueOf((int) ratio), mean, d[499], d[949], d[989], d[999]);
        }
        for (int n = 2; n <= 6; n++) { int moved = 0; for (int i = 1; i <= 120; i++) { int mem = (i * 7 + 3) % 40 + 1; if (mem % n != mem % (n + 1)) moved++; } System.out.println("shard," + n + "=" + moved); }
    }
}
