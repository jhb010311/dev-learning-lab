import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class ThreadPoolOrder {

    public static void main(String[] args) throws InterruptedException {
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                2,
                4,
                10, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(2));

        CountDownLatch release = new CountDownLatch(1);
        Runnable blockingTask = () -> {
            try {
                release.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };

        for (int i = 1; i <= 7; i++) {
            try {
                pool.execute(blockingTask);
                System.out.printf("작업 %d 제출 -> 스레드 %d개, 큐 대기 %d개%n",
                        i, pool.getPoolSize(), pool.getQueue().size());
            } catch (RejectedExecutionException e) {
                System.out.printf("작업 %d 제출 -> 거부됨 (%s)%n",
                        i, e.getClass().getSimpleName());
            }
        }

        release.countDown();
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("끝까지 실행된 작업 수: " + pool.getCompletedTaskCount());
    }
}
