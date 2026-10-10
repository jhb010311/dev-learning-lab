import java.util.*;
import java.util.concurrent.*;

// 외부 호출 4개(0.3, 0.5, 0.8, 1.6초)를 순차/병렬로 호출할 때의 전체 시간을 잰다.
public class ParallelCalls {
    static final long[] MS = {300, 500, 800, 1600};
    static String call(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { } return "ok"; }
    static long par(int pool, boolean timeout) {
        ExecutorService es = Executors.newFixedThreadPool(pool); long t = System.nanoTime(); List<CompletableFuture<String>> fs = new ArrayList<>();
        for (long ms : MS) { CompletableFuture<String> f = CompletableFuture.supplyAsync(() -> call(ms), es); fs.add(timeout ? f.completeOnTimeout("기본값", 1, TimeUnit.SECONDS) : f); }
        CompletableFuture.allOf(fs.toArray(new CompletableFuture[0])).join(); long el = (System.nanoTime() - t) / 1_000_000; es.shutdownNow(); return el;
    }
    public static void main(String[] args) {
        long t = System.nanoTime(); for (long ms : MS) call(ms);
        System.out.println("순차 = " + (System.nanoTime() - t) / 1_000_000 + "ms");
        System.out.println("병렬, 스레드 5개 = " + par(5, false) + "ms");
        System.out.println("병렬, 스레드 2개 = " + par(2, false) + "ms");
        System.out.println("병렬, 스레드 5개, 제한 시간 1초 = " + par(5, true) + "ms");
    }
}
