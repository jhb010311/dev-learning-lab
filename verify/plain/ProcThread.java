import java.util.*;
import java.util.concurrent.*;

// 프로세스와 스레드: 메모리를 함께 쓰는지, 하나가 죽으면 나머지가 어떻게 되는지, 걸리는 시간은 어떤지 확인한다.
public class ProcThread {
    static int counter = 0;                      // 힙(정확히는 클래스의 static 영역)에 있는 공유 변수
    static void work(int id, String fail) throws Exception {
        Thread.sleep(300);
        if (id == 2 && fail.equals("ex")) throw new IllegalStateException("작업 2 실패");
        if (id == 2 && fail.equals("kill")) System.exit(3);
        synchronized (ProcThread.class) { counter++; }
    }
    public static void main(String[] args) throws Exception {
        if (args.length > 0 && args[0].equals("child")) { work(Integer.parseInt(args[1]), args[2]); System.out.println("child " + args[1] + " counter=" + counter); return; }
        String mode = args[0], fail = args[1]; long t = System.nanoTime();
        if (mode.equals("single")) { String end = "끝까지 실행"; try { for (int i = 1; i <= 3; i++) work(i, fail); } catch (Exception e) { end = "작업 2의 예외로 중단"; } System.out.println("single," + fail + "=" + end + ", counter=" + counter + ", " + Math.round((System.nanoTime() - t) / 1e8) / 10.0 + "초"); }
        if (mode.equals("multi")) { List<Thread> ts = new ArrayList<>(); for (int i = 1; i <= 3; i++) { int id = i; Thread th = new Thread(() -> { try { work(id, fail); } catch (Exception e) { throw new RuntimeException(e); } }); th.setUncaughtExceptionHandler((x, e) -> { }); ts.add(th); th.start(); } for (Thread th : ts) th.join(); System.out.println("multi," + fail + "=스레드 3개 종료, counter=" + counter + ", " + Math.round((System.nanoTime() - t) / 1e8) / 10.0 + "초"); }
        if (mode.equals("proc")) { String java = ProcessHandle.current().info().command().get(); List<Process> ps = new ArrayList<>(); for (int i = 1; i <= 3; i++) ps.add(new ProcessBuilder(java, "-Dstdout.encoding=UTF-8", "ProcThread.java", "child", String.valueOf(i), fail).redirectErrorStream(true).start()); StringBuilder sb = new StringBuilder(); for (Process p : ps) { String out = new String(p.getInputStream().readAllBytes(), "UTF-8").trim(); sb.append(" [종료 코드 ").append(p.waitFor()).append(out.contains("counter") ? ", " + out.substring(out.indexOf("counter")) : ", 출력 없음").append("]"); } System.out.println("proc," + fail + "=" + sb.toString().trim() + ", 부모의 counter=" + counter); }
    }
}
