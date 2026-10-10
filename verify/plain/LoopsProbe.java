import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.IntConsumer;

// "조건문과 반복문" 실습의 스물네 가지 조합을 실제로 실행한다.
//   반복문 12가지: 문장(for, while) × 조건(i < 3, i <= 3) × i가 1일 때 하는 일(없음, break, continue)
//   switch 12가지: 방식(break 있음, break 없음, 화살표) × n(1, 2, 3, 9)
// 출력: 반복문은  문장|조건|하는 일 => 출력(쉼표로 이음)|본문에 들어간 횟수
//       switch는  방식|n => 출력(쉼표로 이음)|println이 실행된 case 수
// 반복문의 코드는 화면에 보이는 코드와 같고, 본문 첫 줄에 횟수를 세는 enter()만 대조용으로 넣었다.
// 끝나지 않는 반복문이 있으므로 조합마다 따로 스레드에서 실행하고 2초를 기다린다.
public class LoopsProbe {
    // 본문에 들어간 횟수. 끝나지 않는 반복문의 스레드가 계속 돌고 있어도 다른 조합의 횟수에 섞이지 않도록 스레드마다 따로 센다.
    static final ThreadLocal<AtomicLong> BODY = new ThreadLocal<>();
    static void enter() { BODY.get().incrementAndGet(); }

    // ---- for ----
    static void forLtNone() {
        for (int i = 0; i < 3; i++) {
            enter();
            System.out.println(i);
        }
        System.out.println("끝");
    }
    static void forLtBreak() {
        for (int i = 0; i < 3; i++) {
            enter();
            if (i == 1) break;
            System.out.println(i);
        }
        System.out.println("끝");
    }
    static void forLtCont() {
        for (int i = 0; i < 3; i++) {
            enter();
            if (i == 1) continue;
            System.out.println(i);
        }
        System.out.println("끝");
    }
    static void forLeNone() {
        for (int i = 0; i <= 3; i++) {
            enter();
            System.out.println(i);
        }
        System.out.println("끝");
    }
    static void forLeBreak() {
        for (int i = 0; i <= 3; i++) {
            enter();
            if (i == 1) break;
            System.out.println(i);
        }
        System.out.println("끝");
    }
    static void forLeCont() {
        for (int i = 0; i <= 3; i++) {
            enter();
            if (i == 1) continue;
            System.out.println(i);
        }
        System.out.println("끝");
    }

    // ---- while ----
    static void whileLtNone() {
        int i = 0;
        while (i < 3) {
            enter();
            System.out.println(i);
            i++;
        }
        System.out.println("끝");
    }
    static void whileLtBreak() {
        int i = 0;
        while (i < 3) {
            enter();
            if (i == 1) break;
            System.out.println(i);
            i++;
        }
        System.out.println("끝");
    }
    static void whileLtCont() {
        int i = 0;
        while (i < 3) {
            enter();
            if (i == 1) continue;
            System.out.println(i);
            i++;
        }
        System.out.println("끝");
    }
    static void whileLeNone() {
        int i = 0;
        while (i <= 3) {
            enter();
            System.out.println(i);
            i++;
        }
        System.out.println("끝");
    }
    static void whileLeBreak() {
        int i = 0;
        while (i <= 3) {
            enter();
            if (i == 1) break;
            System.out.println(i);
            i++;
        }
        System.out.println("끝");
    }
    static void whileLeCont() {
        int i = 0;
        while (i <= 3) {
            enter();
            if (i == 1) continue;
            System.out.println(i);
            i++;
        }
        System.out.println("끝");
    }

    // ---- switch ----
    static void switchBreak(int n) {
        switch (n) {
            case 1:
                System.out.println("하나");
                break;
            case 2:
                System.out.println("둘");
                break;
            case 3:
                System.out.println("셋");
                break;
            default:
                System.out.println("그 외");
        }
        System.out.println("끝");
    }
    @SuppressWarnings("fallthrough")
    static void switchFall(int n) {
        switch (n) {
            case 1:
                System.out.println("하나");
            case 2:
                System.out.println("둘");
            case 3:
                System.out.println("셋");
            default:
                System.out.println("그 외");
        }
        System.out.println("끝");
    }
    static void switchArrow(int n) {
        switch (n) {
            case 1 -> System.out.println("하나");
            case 2 -> System.out.println("둘");
            case 3 -> System.out.println("셋");
            default -> System.out.println("그 외");
        }
        System.out.println("끝");
    }
    // 요약 글 확인용: default가 없는 switch
    static void switchNoDefault(int n) {
        switch (n) {
            case 1:
                System.out.println("하나");
                break;
            case 2:
                System.out.println("둘");
                break;
        }
        System.out.println("끝");
    }

    // 따로 만든 스레드에서 실행하고, 그동안 System.out으로 나간 줄을 모은다. 2초 안에 끝나지 않으면 끝나지 않는 것으로 본다.
    static String[] run(Runnable r) throws InterruptedException {
        AtomicLong body = new AtomicLong();
        PrintStream old = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
        Thread t = new Thread(() -> { BODY.set(body); r.run(); });
        t.setDaemon(true);                 // 끝나지 않는 반복문이 프로그램 종료를 막지 않게 한다
        t.start();
        t.join(2000);
        boolean alive = t.isAlive();
        long before = body.get();
        if (alive) Thread.sleep(200);
        long after = body.get();              // 살아 있다면 그 사이에도 본문이 계속 실행되고 있어야 한다
        String text;
        synchronized (buf) { text = buf.toString(StandardCharsets.UTF_8).strip(); }
        System.setOut(old);
        String out = text.isEmpty() ? "" : String.join(", ", text.split("\\R"));
        if (alive) return new String[] { out + " (끝나지 않음)", after > before ? "끝없이" : "멈춰 있음" };
        return new String[] { out, String.valueOf(body.get()) };
    }

    public static void main(String[] args) throws Exception {
        Map<String, Runnable> loops = new LinkedHashMap<>();
        loops.put("for|lt|none", LoopsProbe::forLtNone); loops.put("for|lt|break", LoopsProbe::forLtBreak); loops.put("for|lt|cont", LoopsProbe::forLtCont);
        loops.put("for|le|none", LoopsProbe::forLeNone); loops.put("for|le|break", LoopsProbe::forLeBreak); loops.put("for|le|cont", LoopsProbe::forLeCont);
        loops.put("while|lt|none", LoopsProbe::whileLtNone); loops.put("while|lt|break", LoopsProbe::whileLtBreak); loops.put("while|lt|cont", LoopsProbe::whileLtCont);
        loops.put("while|le|none", LoopsProbe::whileLeNone); loops.put("while|le|break", LoopsProbe::whileLeBreak); loops.put("while|le|cont", LoopsProbe::whileLeCont);
        for (Map.Entry<String, Runnable> e : loops.entrySet()) {
            String[] r = run(e.getValue());
            System.out.println(e.getKey() + " => " + r[0] + "|" + r[1]);
        }
        Map<String, IntConsumer> sw = new LinkedHashMap<>();
        sw.put("swc", LoopsProbe::switchBreak); sw.put("swf", LoopsProbe::switchFall); sw.put("swa", LoopsProbe::switchArrow);
        for (Map.Entry<String, IntConsumer> e : sw.entrySet()) {
            for (int n : new int[] { 1, 2, 3, 9 }) {
                String[] r = run(() -> e.getValue().accept(n));
                int cases = r[0].split(", ").length - 1;          // 마지막의 "끝"을 뺀 줄 수
                System.out.println(e.getKey() + "|" + n + " => " + r[0] + "|" + cases);
            }
        }
        // '# '으로 시작하는 줄은 실습의 요약 글에 적은 사실을 따로 확인한 것이다
        System.out.println("# default가 없는 switch에 일치하는 case가 없는 값(9)을 넣었을 때의 출력: " + run(() -> switchNoDefault(9))[0]);
        System.out.println("# break가 없는 switch(switchFall)는 이 파일과 함께 오류 없이 컴파일됐다");
    }
}
