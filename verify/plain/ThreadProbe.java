import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

// "스레드의 생성과 상태" 실습의 스물네 가지 조합(실행시키는 방법 3 × 작업 4 × interrupt 2)을 실제로 실행한다.
// 출력: call|work|intr => 작업을 실행한 스레드|start 전 t의 상태|중간에 본 t의 상태|발생한 예외|join 뒤 t의 상태|작업 안에서 본 자기 상태|작업이 끝날 때의 interrupt 표시
// 화면의 코드는 main이 Thread.sleep(100)으로 잠깐 기다린 뒤 getState를 부르지만,
// 여기서는 시간에 기대지 않도록 t의 상태가 RUNNABLE을 벗어나 그대로 머무를 때까지 되풀이해 확인한다(settle).
public class ThreadProbe {
    // t의 상태가 NEW, RUNNABLE이 아닌 값으로 세 번 연속 같게 읽힐 때까지 기다린다. 5초 안에 그렇게 되지 않으면 그때의 값을 돌려준다.
    static String settle(Thread t) throws InterruptedException {
        long end = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < end) {
            Thread.State s = t.getState();
            if (s != Thread.State.NEW && s != Thread.State.RUNNABLE) {
                Thread.sleep(20);
                if (t.getState() == s) { Thread.sleep(20); if (t.getState() == s) return s.toString(); }
            }
            Thread.sleep(5);
        }
        return t.getState().toString() + "(시간 초과)";
    }

    static String one(String call, String work, boolean intr) throws Exception {
        final Object lock = new Object();
        final List<String> ex = Collections.synchronizedList(new ArrayList<>());
        final String[] ran = new String[3];
        Thread helper = new Thread(() -> { try { Thread.sleep(600); } catch (InterruptedException e) { } }, "helper");
        Runnable task = () -> {
            ran[0] = Thread.currentThread().getName();
            ran[1] = Thread.currentThread().getState().toString();
            try {
                if (work.equals("sleep")) Thread.sleep(1000);
                if (work.equals("join")) helper.join();
                if (work.equals("lock")) { synchronized (lock) { } }
            } catch (InterruptedException e) {
                ex.add("InterruptedException");
            }
            ran[2] = String.valueOf(Thread.currentThread().isInterrupted());
        };
        Thread t = new Thread(task, "worker");
        String before = t.getState().toString();
        if (work.equals("join")) helper.start();
        String mid;
        if (work.equals("lock")) {
            synchronized (lock) {                      // main이 먼저 lock을 쥔다
                if (call.equals("run")) t.run(); else t.start();
                mid = call.equals("run") ? t.getState().toString() : settle(t);
                if (intr) t.interrupt();
            }
        } else {
            if (call.equals("run")) t.run(); else t.start();
            mid = call.equals("run") ? t.getState().toString() : settle(t);
            if (intr) t.interrupt();
        }
        t.join();
        String after = t.getState().toString();
        if (call.equals("twice")) {
            try { t.start(); } catch (IllegalThreadStateException e) { ex.add("IllegalThreadStateException"); }
        }
        if (work.equals("join")) helper.join();
        return ran[0] + "|" + before + "|" + mid + "|" + (ex.isEmpty() ? "none" : String.join(",", ex)) + "|" + after + "|" + ran[1] + "|" + ran[2];
    }

    public static void main(String[] args) throws Exception {
        for (String call : new String[] { "start", "run", "twice" })
            for (String work : new String[] { "quick", "sleep", "join", "lock" })
                for (boolean intr : new boolean[] { false, true })
                    System.out.println(call + "|" + work + "|" + intr + " => " + one(call, work, intr));

        // 아래는 조합이 아니라, 실습의 글에서 말하는 사실을 따로 확인한 것이다.
        // 1) 아직 살아 있는(자고 있는) 스레드에 start()를 한 번 더 불러도 같은 예외인가
        Thread a = new Thread(() -> { try { Thread.sleep(300); } catch (InterruptedException e) { } });
        a.start(); settle(a);
        String r1; try { a.start(); r1 = "예외 없음"; } catch (IllegalThreadStateException e) { r1 = "IllegalThreadStateException"; }
        a.join();
        System.out.println("extra|살아 있는 스레드에 start() 한 번 더 => " + r1);

        // 2) sleep 중에 interrupt를 받아 catch로 들어갔을 때 interrupt 표시(isInterrupted)는 지워져 있는가
        final boolean[] flag = new boolean[2];
        Thread b = new Thread(() -> { try { Thread.sleep(2000); } catch (InterruptedException e) { flag[0] = Thread.currentThread().isInterrupted(); } });
        b.start(); settle(b); b.interrupt(); b.join();
        System.out.println("extra|sleep 중 interrupt 뒤 catch 안의 isInterrupted => " + flag[0]);

        // 3) BLOCKED 상태에서 interrupt를 받은 스레드는 예외 없이 계속 기다리고, 락을 얻은 뒤에 보면 interrupt 표시가 남아 있는가
        final Object lock = new Object();
        final String[] st = new String[1];
        Thread c = new Thread(() -> { synchronized (lock) { flag[1] = Thread.currentThread().isInterrupted(); } });
        synchronized (lock) { c.start(); settle(c); c.interrupt(); Thread.sleep(100); st[0] = c.getState().toString(); }
        c.join();
        System.out.println("extra|BLOCKED 중 interrupt 뒤의 상태 => " + st[0]);
        System.out.println("extra|BLOCKED 중 interrupt, 락을 얻은 뒤 isInterrupted => " + flag[1]);

        // 4) 시작하지 않은 스레드에 join()을 부르면 바로 돌아오는가 (1초 안에 돌아오면 true)
        Thread d = new Thread(() -> { });
        long t0 = System.currentTimeMillis(); d.join();
        System.out.println("extra|시작하지 않은 스레드에 join() => " + (System.currentTimeMillis() - t0 < 1000 ? "바로 돌아옴" : "기다림"));

        // 5) t.join()으로 기다리는 동안 기다리는 쪽(main) 스레드의 상태
        final Thread mainThread = Thread.currentThread();
        final String[] seen = new String[1];
        Thread e = new Thread(() -> { try { seen[0] = settle(mainThread); } catch (InterruptedException x) { } });
        e.start(); e.join();
        System.out.println("extra|t.join()으로 기다리는 main의 상태 => " + seen[0]);
    }
}
