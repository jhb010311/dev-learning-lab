import java.util.*;

// 작은 힙에서 객체를 계속 만들며 GC 로그를 본다. 실행 예:
//   java -XX:+UseSerialGC -Xmx64m -Xlog:gc GcProbe.java normal|longlived|leak
public class GcProbe {
    static final List<byte[]> leak = new ArrayList<>();
    public static void main(String[] args) {
        String mode = args[0]; Deque<byte[]> recent = new ArrayDeque<>(); long made = 0;
        try {
            for (int i = 0; i < 40_000; i++) {
                byte[] b = new byte[10_000]; made++;                 // 10KB짜리 객체
                if (mode.equals("longlived") && i % 3 == 0) { recent.add(b); if (recent.size() > 3000) recent.poll(); }   // 한동안 붙잡았다가 놓음
                if (mode.equals("leak") && i % 3 == 0) leak.add(b);   // 계속 붙잡음
            }
            System.out.println("결과=정상 종료, 만든 객체 " + made + "개");
        } catch (OutOfMemoryError e) { int n = leak.size(); leak.clear(); System.out.println("결과=OutOfMemoryError(" + e.getMessage() + "), 만든 객체 " + made + "개, 붙잡고 있던 객체 " + n + "개"); }
    }
}
