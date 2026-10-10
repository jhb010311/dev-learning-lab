import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;

// 스레드 수를 바꿔 가며 2초 동안 처리한 작업 수를 잰다.
// cpu: 작업 하나가 정해진 양의 계산만 함(혼자 돌리면 약 10ms) / io: 계산 약 1ms + 기다림 9ms
public class CtxSwitch {
    static volatile long sink;
    static void work(long iters) { long s = 0; for (long i = 0; i < iters; i++) s += i * 31L ^ s >>> 3; sink = s; }

    static long measure(int threads, boolean io, long itersPerMs) throws Exception {
        LongAdder done = new LongAdder(); ExecutorService es = Executors.newFixedThreadPool(threads); long stopAt = System.nanoTime() + 2_000_000_000L;
        for (int t = 0; t < threads; t++) es.submit(() -> { while (System.nanoTime() < stopAt) { if (io) { work(itersPerMs); try { Thread.sleep(9); } catch (InterruptedException e) { } } else work(itersPerMs * 10); done.increment(); } });
        es.shutdown(); es.awaitTermination(20, TimeUnit.SECONDS); return Math.round(done.sum() / 2.0);
    }
    public static void main(String[] args) throws Exception {
        int cores = Runtime.getRuntime().availableProcessors(); System.out.println("코어 수=" + cores);
        for (int i = 0; i < 50; i++) work(2_000_000);                         // JIT 워밍업
        long t = System.nanoTime(); work(200_000_000L); long itersPerMs = 200_000_000L * 1_000_000L / (System.nanoTime() - t);
        for (int m : new int[]{1, cores / 2, cores, cores * 2, cores * 4, cores * 16}) System.out.println("cpu 스레드 " + m + "개 = 초당 " + measure(m, false, itersPerMs) + "건");
        for (int m : new int[]{cores / 2, cores, cores * 4, cores * 10, cores * 20, cores * 40}) System.out.println("io 스레드 " + m + "개 = 초당 " + measure(m, true, itersPerMs) + "건");
    }
}
