import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

// "서킷 브레이커" 실습과 같은 호출 순서(1초에 한 번씩 40번, 11초부터 장애)를 실제 Resilience4j 서킷 브레이커에 넣어 본다.
// 시간은 실제로 기다리지 않고, 서킷 브레이커가 보는 시계를 1초씩 앞으로 돌린다.
public class CircuitProbe {
    static class StepClock extends Clock {
        long sec;
        @Override public ZoneId getZone() { return ZoneId.of("UTC"); }
        @Override public Clock withZone(ZoneId z) { return this; }
        // 호출마다 아주 조금씩(1마이크로초) 늦게 도착한다고 본다. Resilience4j는 차단 시간이 "지난 뒤"에만 시험 호출을 허용하므로,
        // 정확히 같은 시각에 맞물린 호출은 아직 차단된다. 실제 시간에서는 호출이 그렇게 정확히 맞물리지 않는다.
        @Override public Instant instant() { return Instant.ofEpochSecond(1_700_000_000L + sec, sec * 1000); }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# resilience4j " + CircuitBreaker.class.getPackage().getImplementationVersion());
        for (int th : new int[] { 30, 50, 80 })
            for (int wait : new int[] { 3, 5, 10 })
                for (int dur : new int[] { 5, 15, 25 }) {
                    StepClock clock = new StepClock();
                    CircuitBreakerConfig cfg = CircuitBreakerConfig.custom()
                        .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED).slidingWindowSize(10).minimumNumberOfCalls(10)
                        .failureRateThreshold(th).waitDurationInOpenState(Duration.ofSeconds(wait)).permittedNumberOfCallsInHalfOpenState(3)
                        .clock(clock).build();
                    CircuitBreaker cb = CircuitBreaker.of("payment", cfg);
                    List<String> trans = new ArrayList<>();
                    cb.getEventPublisher().onStateTransition(e -> trans.add(e.getStateTransition().getToState().name()));
                    int ok = 0, fail = 0, blocked = 0;
                    for (int t = 1; t <= 40; t++) {
                        clock.sec = t;
                        boolean down = t >= 11 && t <= 10 + dur;
                        if (!cb.tryAcquirePermission()) { blocked++; continue; }          // 열려 있으면 호출하지 않는다
                        if (down) { fail++; cb.onError(3, TimeUnit.SECONDS, new java.util.concurrent.TimeoutException("3초 타임아웃")); }
                        else { ok++; cb.onSuccess(10, TimeUnit.MILLISECONDS); }
                    }
                    out.add(th + "|" + wait + "|" + dur + " => " + ok + "|" + fail + "|" + blocked + "|" + (trans.isEmpty() ? "없음" : "CLOSED → " + String.join(" → ", trans)));
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}
