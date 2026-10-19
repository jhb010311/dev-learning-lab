import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.FileObject;
import javax.tools.ForwardingJavaFileManager;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

// "클래스, 객체, 생성자" 실습의 열여섯 가지 조합(적은 생성자 4 × 만드는 코드 2 × 위에 적은 것 2)을 실제로 컴파일하고 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 만들어 메모리에서 컴파일한다. 컴파일되면 실행해 출력을 얻고,
// 같은 소스에 기록 코드만 끼운 것을 한 번 더 실행해 초기화식, 블록, 생성자 본문이 실행된 순서를 얻는다.
// 출력: 생성자|만드는 코드|위에 적은 것 => 컴파일 결과|실행된 순서|출력
//       SRC 로 시작하는 줄은 그 조합에서 컴파일한 소스(화면의 코드와 같은지 cmp_ctor.js가 비교한다)
public class CtorProbe {
    // ---- 메모리에서 컴파일하고 실행하는 도구 ----
    static class Src extends SimpleJavaFileObject {
        final String code;
        Src(String name, String code) { super(URI.create("string:///" + name.replace('.', '/') + ".java"), Kind.SOURCE); this.code = code; }
        @Override public CharSequence getCharContent(boolean ignore) { return code; }
    }
    static class Out extends SimpleJavaFileObject {
        final ByteArrayOutputStream bos = new ByteArrayOutputStream();
        Out(String name) { super(URI.create("mem:///" + name.replace('.', '/') + ".class"), Kind.CLASS); }
        @Override public OutputStream openOutputStream() { return bos; }
    }
    static class Mem extends ForwardingJavaFileManager<StandardJavaFileManager> {
        final Map<String, Out> out = new HashMap<>();
        Mem(StandardJavaFileManager m) { super(m); }
        @Override public JavaFileObject getJavaFileForOutput(Location l, String cn, JavaFileObject.Kind k, FileObject sib) { Out o = new Out(cn); out.put(cn, o); return o; }
    }
    static class Res { boolean ok; String err = ""; int errCount; String stdout = ""; }

    // sources: 파일 이름(클래스 이름) → 소스. 컴파일에 성공하고 mainClass가 있으면 그 main을 실행해 표준 출력을 모은다.
    static Res compileRun(Map<String, String> sources, String mainClass) throws Exception {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        Mem fm = new Mem(jc.getStandardFileManager(dc, Locale.ENGLISH, StandardCharsets.UTF_8));
        List<JavaFileObject> units = new ArrayList<>();
        sources.forEach((n, s) -> units.add(new Src(n, s)));
        Res r = new Res();
        r.ok = jc.getTask(null, fm, dc, List.of("-proc:none"), null, units).call();
        for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) {
            if (d.getKind() != Diagnostic.Kind.ERROR) continue;
            if (r.errCount++ == 0) r.err = d.getMessage(Locale.ENGLISH).split("\\R")[0].replaceAll(";$", "");
        }
        if (!r.ok || mainClass == null) return r;
        ClassLoader cl = new ClassLoader(CtorProbe.class.getClassLoader()) {
            @Override protected Class<?> findClass(String name) throws ClassNotFoundException {
                Out o = fm.out.get(name); if (o == null) throw new ClassNotFoundException(name);
                byte[] b = o.bos.toByteArray(); return defineClass(name, b, 0, b.length);
            }
        };
        PrintStream old = System.out; ByteArrayOutputStream cap = new ByteArrayOutputStream();
        System.setOut(new PrintStream(cap, true, StandardCharsets.UTF_8));
        try { cl.loadClass(mainClass).getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
        finally { System.setOut(old); }
        r.stdout = cap.toString(StandardCharsets.UTF_8).strip().replaceAll("\\R", " / ");
        return r;
    }
    static Res run(String classes, String mainBody) throws Exception {
        return compileRun(Map.of("Main", source(classes, mainBody)), "Main");
    }
    // 실제로 컴파일하는 소스 전체(화면의 코드도 이 모양: Order 클래스 + main을 가진 Main 클래스)
    static String source(String classes, String mainBody) {
        return classes + "\npublic class Main {\n    public static void main(String[] args) {\n" + mainBody + "\n    }\n}\n";
    }

    // ---- 이 실습의 소스 ----
    // trace가 true이면 실행 순서를 기록하는 코드를 끼운다(구조는 같다)
    static String classes(String ctors, String first, boolean trace) {
        String field = "    int qty = " + (trace ? "T.v(\"필드 초기화식\", 10)" : "10") + ";\n";
        String block = "    {\n" + (trace ? "        T.log(\"초기화 블록\");\n" : "") + "        qty = 20;\n    }\n";
        String memo = "    String memo;\n";
        String argCtor = "    Order(int extra) {\n" + (trace ? "        T.log(\"Order(int) 본문\");\n" : "") + "        qty = qty + extra;\n        memo = \"추가 \" + extra;\n    }\n";
        String noArg = "    Order() {\n" + (ctors.equals("chain") ? "        this(1);\n" : "") + (trace ? "        T.log(\"Order() 본문\");\n" : "") + "        memo = \"기본\";\n    }\n";
        String body = first.equals("field") ? field + memo + "\n" + block : block + "\n" + field + memo;
        if (ctors.equals("arg")) body += "\n" + argCtor;
        if (ctors.equals("both") || ctors.equals("chain")) body += "\n" + noArg + "\n" + argCtor;
        String t = "class T {\n    static StringBuilder sb = new StringBuilder();\n    static void log(String s) { if (sb.length() > 0) sb.append(\" → \"); sb.append(s); }\n    static int v(String s, int x) { log(s); return x; }\n}\n";
        return "class Order {\n" + body + "}\n" + (trace ? t : "");
    }
    static String mainBody(String call) {
        return "Order o = new Order(" + (call.equals("arg") ? "3" : "") + ");\nSystem.out.println(o.qty + \", \" + o.memo);";
    }

    public static void main(String[] args) throws Exception {
        for (String ctors : new String[] { "none", "arg", "both", "chain" })
            for (String call : new String[] { "noarg", "arg" })
                for (String first : new String[] { "field", "block" }) {
                    String key = ctors + "|" + call + "|" + first, cls = classes(ctors, first, false), mb = mainBody(call);
                    Res r = run(cls, mb);
                    System.out.println("SRC " + key + " => " + source(cls, mb).replace("\n", "\\n"));
                    if (!r.ok) { System.out.println(key + " => 오류: " + r.err + "|-|-"); continue; }
                    Res tr = run(classes(ctors, first, true), mb + "\nSystem.out.println(\"TRACE \" + T.sb);");
                    String[] p = tr.stdout.split(" / TRACE ", -1);
                    if (!tr.ok || p.length != 2 || !p[0].equals(r.stdout)) throw new IllegalStateException("기록 코드를 끼운 실행의 출력이 다름: " + key + " " + tr.stdout);
                    System.out.println(key + " => 성공|" + p[1] + "|" + r.stdout);
                }
        // 필드가 초기화식보다 먼저 기본값으로 채워져 있는지: 맨 위의 초기화 블록에서 아직 대입하지 않은 필드를 읽는다
        Res d = run("class Order {\n    {\n        System.out.println(this.qty + \", \" + this.memo);\n    }\n    int qty = 10;\n    String memo;\n}\n", "new Order();");
        System.out.println("# 기본값 => " + d.stdout);
        // this(...)를 생성자의 첫 문장이 아닌 자리에 쓰면 컴파일되는지 (JDK 21 기준)
        Res t = run("class Order {\n    int qty;\n    String memo;\n    Order() {\n        memo = \"기본\";\n        this(1);\n    }\n    Order(int extra) {\n        qty = extra;\n    }\n}\n", "new Order();");
        System.out.println("# this가 첫 문장이 아님 => " + (t.ok ? "성공" : "오류: " + t.err));
    }
}
