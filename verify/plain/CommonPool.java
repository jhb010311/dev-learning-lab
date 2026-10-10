import java.util.List;
import java.util.concurrent.*;
import java.util.stream.IntStream;

// 병렬 스트림은 모두 같은 공용 풀(ForkJoinPool.commonPool)을 쓴다.
// 한쪽이 공용 풀의 스레드를 블로킹 작업으로 붙잡으면 다른 쪽 병렬 스트림이 느려지는지 측정한다.
// 실행: java -Djava.util.concurrent.ForkJoinPool.common.parallelism=3 CommonPool.java
public class CommonPool {
    static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { throw new RuntimeException(e); } }

    static long timeB() {      // 요청 B: 0.1초짜리 작업 8개를 병렬 스트림으로
        long t = System.nanoTime();
        IntStream.range(0, 8).parallel().forEach(i -> sleep(100));
        return (System.nanoTime() - t) / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        System.out.println("공용 풀 병렬 수준=" + ForkJoinPool.commonPool().getParallelism());
        System.out.println("B만 실행=" + timeB() + "ms");

        ExecutorService es = Executors.newCachedThreadPool();
        // 요청 A: 2초짜리 블로킹 호출 8개를 병렬 스트림으로 (공용 풀 사용)
        Future<?> a = es.submit(() -> IntStream.range(0, 8).parallel().forEach(i -> sleep(2000)));
        sleep(300);                                   // A가 공용 풀을 다 차지할 시간을 준다
        System.out.println("A가 공용 풀을 붙잡은 동안 B=" + es.submit(CommonPool::timeB).get() + "ms");
        a.get();

        // 요청 A를 전용 풀로 옮기면
        ForkJoinPool own = new ForkJoinPool(8);
        Future<?> a2 = own.submit(() -> IntStream.range(0, 8).parallel().forEach(i -> sleep(2000)));
        sleep(300);
        System.out.println("A를 전용 풀로 분리했을 때 B=" + es.submit(CommonPool::timeB).get() + "ms");
        a2.get(); own.shutdown(); es.shutdown();
    }
}
