import java.util.*;
import java.util.concurrent.*;

// 요청 12건이 각각 0.2초씩 "기다리는" 작업일 때, 스레드 모델별 전체 소요 시간을 잰다.
// 실행: java -Djdk.virtualThreadScheduler.parallelism=2 -Djdk.virtualThreadScheduler.maxPoolSize=2 ThreadModels.java
public class ThreadModels {
    static long run(ExecutorService es, int n, long waitMs) throws Exception {
        long t = System.nanoTime(); List<Future<?>> fs = new ArrayList<>();
        for (int i = 0; i < n; i++) fs.add(es.submit(() -> { try { Thread.sleep(waitMs); } catch (InterruptedException e) { } }));
        for (Future<?> f : fs) f.get();
        es.shutdown(); return (System.nanoTime() - t) / 1_000_000;
    }
    public static void main(String[] args) throws Exception {
        System.out.println("스레드 풀 4개 (요청당 스레드) = " + run(Executors.newFixedThreadPool(4), 12, 200) + "ms");
        System.out.println("스레드 2개에서 블로킹 (이벤트 루프 안의 블로킹 호출과 같은 상황) = " + run(Executors.newFixedThreadPool(2), 12, 200) + "ms");
        System.out.println("가상 스레드 (실어 나르는 OS 스레드 2개) = " + run(Executors.newVirtualThreadPerTaskExecutor(), 12, 200) + "ms");
        System.out.println("스레드 풀 10개, 요청 30건 = " + run(Executors.newFixedThreadPool(10), 30, 200) + "ms");
        // 논블로킹(타이머에 등록만 하고 스레드를 놓아줌): 스레드 2개로 12건
        ScheduledExecutorService loop = Executors.newScheduledThreadPool(2); long t = System.nanoTime(); CountDownLatch done = new CountDownLatch(12);
        for (int i = 0; i < 12; i++) loop.schedule(done::countDown, 200, TimeUnit.MILLISECONDS);
        done.await(); loop.shutdown();
        System.out.println("스레드 2개에서 논블로킹 (기다림을 등록만 함) = " + (System.nanoTime() - t) / 1_000_000 + "ms");
    }
}
