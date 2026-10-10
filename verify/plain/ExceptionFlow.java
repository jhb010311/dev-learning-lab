import java.util.ArrayList;
import java.util.List;

// try / catch / finally / try-with-resources가 실제로 어떤 순서로 실행되는지 조합별로 기록한다.
public class ExceptionFlow {
    static List<String> log = new ArrayList<>();
    static class Res implements AutoCloseable { Res() { log.add("open"); } @Override public void close() { log.add("close"); } }

    @SuppressWarnings("finally")
    static int body(String ex, boolean ret, boolean fret, boolean res) {
        try (Res r = res ? new Res() : null) {
            log.add("try-start");
            if (ex.equals("match") || ex.equals("incatch")) throw new IllegalArgumentException("A");
            if (ex.equals("nomatch")) throw new IllegalStateException("B");
            log.add("try-end");
            if (ret) return 1;
        } catch (IllegalArgumentException e) {
            log.add("catch");
            if (ex.equals("incatch")) throw new RuntimeException("C");
        } finally {
            log.add("finally");
            if (fret) return 3;
        }
        log.add("after");
        return 2;
    }

    public static void main(String[] args) {
        for (String ex : new String[]{"none", "match", "nomatch", "incatch"})
            for (boolean ret : new boolean[]{false, true}) for (boolean fret : new boolean[]{false, true}) for (boolean res : new boolean[]{false, true}) {
                log.clear(); String out;
                try { out = "return " + body(ex, ret, fret, res); } catch (RuntimeException e) { out = "throw " + e.getClass().getSimpleName(); }
                System.out.println(ex + "," + ret + "," + fret + "," + res + "=" + String.join(">", log) + "|" + out);
            }
    }
}
