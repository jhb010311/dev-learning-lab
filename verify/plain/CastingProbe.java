import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.function.DoubleSupplier;
import java.util.function.IntSupplier;
import java.util.function.LongSupplier;
import java.util.stream.Collectors;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// "연산자와 형변환" 실습의 열여덟 가지 코드(정수 계산 6 + 형변환 8 + 문자열 4)를 실제로 실행한다.
// 출력: 주제|코드 => 오른쪽 식의 타입|변수 r의 타입|println(r)의 출력 (또는 예외, 컴파일 오류)
// 식의 타입은 오버로드된 ty(...) 가운데 컴파일러가 어느 것을 고르는지로 알아낸다(컴파일할 때 정해지는 타입).
// '# '으로 시작하는 줄은 실습의 요약 글에 적은 사실을 따로 확인한 것이다.
public class CastingProbe {
    static String ty(byte x) { return "byte"; }
    static String ty(short x) { return "short"; }
    static String ty(char x) { return "char"; }
    static String ty(int x) { return "int"; }
    static String ty(long x) { return "long"; }
    static String ty(float x) { return "float"; }
    static String ty(double x) { return "double"; }
    static String ty(String x) { return "String"; }
    // 식을 계산하지 않고 타입만 알아낸다 (계산하면 예외가 나는 7 / 0에 쓴다)
    static String lz(IntSupplier s) { return "int"; }
    static String lz(LongSupplier s) { return "long"; }
    static String lz(DoubleSupplier s) { return "double"; }

    // System.out.println이 실제로 내보낸 글자
    static String p(Runnable r) {
        PrintStream old = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
        try { r.run(); } finally { System.setOut(old); }
        return buf.toString(StandardCharsets.UTF_8).strip();
    }
    static void line(String key, String exprType, String varType, String out) {
        System.out.println(key + " => " + exprType + "|" + varType + "|" + out);
    }
    // 한 줄을 main 안에 넣은 소스를 같은 JDK의 컴파일러로 컴파일한다. 성공하면 "OK", 실패하면 오류 메시지.
    static String compile(String stmt, String outDir) {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        String src = "public class T {\n    public static void main(String[] args) {\n        " + stmt + "\n        System.out.println(r);\n    }\n}\n";
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///T.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        new java.io.File(outDir).mkdirs();
        boolean ok = jc.getTask(null, null, dc, List.of("-d", outDir, "-proc:none"), null, List.of(fo)).call();
        if (ok) return "OK";
        return dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).map(d -> d.getMessage(Locale.ENGLISH)).collect(Collectors.joining(" / "));
    }

    public static void main(String[] args) {
        String gen = args.length > 0 ? args[0] : "verify/out/casting/gen";

        // ---- 정수끼리의 계산 ----
        { int r = 7 / 2; line("ints|div", ty(7 / 2), ty(r), p(() -> System.out.println(r))); }
        { int r = 7 % 2; line("ints|mod", ty(7 % 2), ty(r), p(() -> System.out.println(r))); }
        { int r = -7 / 2; line("ints|ndiv", ty(-7 / 2), ty(r), p(() -> System.out.println(r))); }
        { int r = -7 % 2; line("ints|nmod", ty(-7 % 2), ty(r), p(() -> System.out.println(r))); }
        {
            String out;
            try {
                int r = 7 / 0;
                out = p(() -> System.out.println(r));
            } catch (ArithmeticException e) {
                out = e.getClass().getSimpleName() + ": " + e.getMessage();
            }
            line("ints|zero", lz(() -> 7 / 0), "int", out);       // r은 int로 선언했다. 값이 들어가기 전에 예외가 난다
        }
        { int big = 2147483647; int r = big + 1; line("ints|over", ty(big + 1), ty(r), p(() -> System.out.println(r))); }

        // ---- 타입이 섞이거나 바뀔 때 ----
        { double r = 7 / 2; line("conv|late", ty(7 / 2), ty(r), p(() -> System.out.println(r))); }
        { double r = 7 / 2.0; line("conv|mix", ty(7 / 2.0), ty(r), p(() -> System.out.println(r))); }
        { int big = 2147483647; long r = big + 1; line("conv|longlate", ty(big + 1), ty(r), p(() -> System.out.println(r))); }
        { int big = 2147483647; long r = big + 1L; line("conv|longmix", ty(big + 1L), ty(r), p(() -> System.out.println(r))); }
        {
            String err = compile("int r = 3.99;", gen), ok = compile("int r = (int) 3.99;", gen);
            System.out.println("# 컴파일 확인 (같은 틀에 넣은 올바른 코드): int r = (int) 3.99; => " + ok);
            System.out.println("# 컴파일 메시지: " + err);
            line("conv|narrow", ty(3.99), "int", err.equals("OK") ? "컴파일됨" : "컴파일 오류");
        }
        { int r = (int) 3.99; line("conv|trunc", ty((int) 3.99), ty(r), p(() -> System.out.println(r))); }
        { int r = (int) -3.99; line("conv|ntrunc", ty((int) -3.99), ty(r), p(() -> System.out.println(r))); }
        { byte r = (byte) 200; line("conv|byte", ty((byte) 200), ty(r), p(() -> System.out.println(r))); }

        // ---- 문자열과 + ----
        { String r = 1 + 2 + "3"; line("str|ns", ty(1 + 2 + "3"), ty(r), p(() -> System.out.println(r))); }
        { String r = "1" + 2 + 3; line("str|sn", ty("1" + 2 + 3), ty(r), p(() -> System.out.println(r))); }
        { String r = "1" + (2 + 3); line("str|paren", ty("1" + (2 + 3)), ty(r), p(() -> System.out.println(r))); }
        { String r = 1 + 2 + "3" + 4 + 5; line("str|mixed", ty(1 + 2 + "3" + 4 + 5), ty(r), p(() -> System.out.println(r))); }

        // ---- 요약 글에 적은 사실 ----
        System.out.println("# 7 / 0.0 = " + (7 / 0.0));
        { int zero = 0; try { System.out.println("# 7 % 0 = " + (7 % zero)); } catch (ArithmeticException e) { System.out.println("# 7 % 0 => " + e.getClass().getSimpleName() + ": " + e.getMessage()); } }
        { int sum = 7, count = 2; double avg = sum / count; System.out.println("# double avg = sum / count (7, 2) = " + avg + " , (double) sum / count = " + ((double) sum / count)); }
        System.out.println("# \"합: \" + 1 + 2 = " + ("합: " + 1 + 2) + " , \"합: \" + (1 + 2) = " + ("합: " + (1 + 2)));
        { int n = -7; System.out.println("# n = -7 일 때 n % 2 == 1 은 " + (n % 2 == 1) + " , n % 2 != 0 은 " + (n % 2 != 0)); }
        System.out.println("# Math.round(3.99) = " + Math.round(3.99) + " , Math.round(-3.99) = " + Math.round(-3.99));
        { int big = 2147483647; System.out.println("# (long) big + 1 = " + ((long) big + 1)); }
        try { System.out.println("# Math.addExact(2147483647, 1) = " + Math.addExact(2147483647, 1)); }
        catch (ArithmeticException e) { System.out.println("# Math.addExact(2147483647, 1) => " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
        System.out.println("# 200의 아래쪽 8비트 = " + Integer.toBinaryString(200 & 0xff) + " , 200 - 256 = " + (200 - 256));
    }
}
