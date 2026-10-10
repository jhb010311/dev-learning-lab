import java.lang.management.ManagementFactory;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

// 교착 상태: 락 순서, 타이밍, tryLock에 따라 실제로 멈추는지 확인한다.
public class DeadlockProbe {
    static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { } }

    // synchronized 두 개를 주어진 순서로 잡는다. overlap이면 첫 락을 잡은 뒤 상대도 첫 락을 잡을 때까지 기다린다.
    static String sync(boolean sameOrder, boolean overlap) throws Exception {
        Object a = new Object(), b = new Object();
        CountDownLatch bothHoldFirst = new CountDownLatch(sameOrder ? 1 : 2), done = new CountDownLatch(2);
        Runnable t1 = () -> { synchronized (a) { bothHoldFirst.countDown(); if (overlap && !sameOrder) await(bothHoldFirst); else if (overlap) sleep(100); synchronized (b) { } } done.countDown(); };
        Object f = sameOrder ? a : b, s = sameOrder ? b : a;
        Runnable t2 = () -> { synchronized (f) { bothHoldFirst.countDown(); if (overlap && !sameOrder) await(bothHoldFirst); synchronized (s) { } } done.countDown(); };
        Thread x = new Thread(t1, "t1"), y = new Thread(t2, "t2"); x.setDaemon(true); y.setDaemon(true);
        x.start(); if (!overlap) x.join(); y.start();
        boolean finished = done.await(1500, TimeUnit.MILLISECONDS);
        long[] dead = ManagementFactory.getThreadMXBean().findDeadlockedThreads();
        return finished ? "완료 2건" : "교착 상태 (JVM이 감지한 교착 스레드 " + (dead == null ? 0 : dead.length) + "개, 상태 " + x.getState() + "/" + y.getState() + ")";
    }
    static void await(CountDownLatch l) { try { l.await(); } catch (InterruptedException e) { } }

    static String tryLock() throws Exception {
        ReentrantLock a = new ReentrantLock(), b = new ReentrantLock(); AtomicInteger retries = new AtomicInteger(); CountDownLatch done = new CountDownLatch(2), bothHoldFirst = new CountDownLatch(2);
        class T implements Runnable { final ReentrantLock f, s; final long wait; T(ReentrantLock f, ReentrantLock s, long wait) { this.f = f; this.s = s; this.wait = wait; }
            public void run() { boolean first = true; for (;;) { f.lock(); try { if (first) { first = false; bothHoldFirst.countDown(); await(bothHoldFirst); } if (s.tryLock(wait, TimeUnit.MILLISECONDS)) { try { done.countDown(); return; } finally { s.unlock(); } } } catch (InterruptedException e) { return; } finally { f.unlock(); } retries.incrementAndGet(); sleep(50); } } }
        new Thread(new T(a, b, 200)).start(); new Thread(new T(b, a, 600)).start();
        boolean finished = done.await(5, TimeUnit.SECONDS);
        return (finished ? "완료 2건" : "미완료") + ", 재시도 " + retries.get() + "번";
    }

    public static void main(String[] args) throws Exception {
        System.out.println("반대 순서 + 동시에 = " + sync(false, true));
        System.out.println("같은 순서 + 동시에 = " + sync(true, true));
        System.out.println("반대 순서 + 차례로 = " + sync(false, false));
        System.out.println("반대 순서 + 동시에 + tryLock = " + tryLock());
    }
}
