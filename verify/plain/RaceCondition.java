import java.util.concurrent.atomic.AtomicInteger;

public class RaceCondition {

    static final int LOOPS = 1_000_000;

    static int plain = 0;
    static int locked = 0;
    static final Object lock = new Object();
    static final AtomicInteger atomic = new AtomicInteger();

    public static void main(String[] args) throws InterruptedException {
        runOnTwoThreads(() -> {
            for (int i = 0; i < LOOPS; i++) {
                plain++;
            }
        });

        runOnTwoThreads(() -> {
            for (int i = 0; i < LOOPS; i++) {
                synchronized (lock) {
                    locked++;
                }
            }
        });

        runOnTwoThreads(() -> {
            for (int i = 0; i < LOOPS; i++) {
                atomic.incrementAndGet();
            }
        });

        System.out.println("기대값        : " + (LOOPS * 2));
        System.out.println("plain++       : " + plain);
        System.out.println("synchronized  : " + locked);
        System.out.println("AtomicInteger : " + atomic.get());
    }

    static void runOnTwoThreads(Runnable task) throws InterruptedException {
        Thread t1 = new Thread(task);
        Thread t2 = new Thread(task);
        t1.start();
        t2.start();
        t1.join();
        t2.join();
    }
}
