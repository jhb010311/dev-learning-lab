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

// "static과 인스턴스" 실습의 서른 가지 조합(count 선언 2 × 추가한 코드 5 × b.hit() 횟수 3)을 실제로 컴파일하고 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 만들어 메모리에서 컴파일하고, 컴파일되면 실행해 출력을 얻는다.
// 출력: 선언|추가한 코드|b.hit() 횟수 => 컴파일 결과|오류 개수|표준 출력(줄은 " / "로 이음)
//       SRC 로 시작하는 줄은 그 조합에서 컴파일한 소스(화면의 코드와 같은지 cmp_static.js가 비교한다)
public class StaticProbe {
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
        ClassLoader cl = new ClassLoader(StaticProbe.class.getClassLoader()) {
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
        return compileRun(Map.of("Main", classes + "\npublic class Main {\n    public static void main(String[] args) {\n" + mainBody + "\n    }\n}\n"), "Main");
    }

    // ---- 이 실습의 소스 ----
    static String classes(String decl, String extra) {
        String s = "class Counter {\n    " + (decl.equals("static") ? "static int count;" : "int count;") + "\n\n    void hit() {\n        count++;\n    }\n";
        if (extra.equals("sm")) s += "\n    static int report() {\n        return count;\n    }\n";
        if (extra.equals("smThis")) s += "\n    static int report() {\n        return this.count;\n    }\n";
        return s + "}\n";
    }
    static String mainBody(String extra, int nb) {
        String s = "";
        if (extra.equals("cls0")) s += "System.out.println(Counter.count);\n";
        if (extra.equals("clsHit")) s += "Counter.hit();\n";
        s += "Counter a = new Counter();\nCounter b = new Counter();\na.hit();\na.hit();\n";
        for (int i = 0; i < nb; i++) s += "b.hit();\n";
        s += "System.out.println(a.count + \" \" + b.count);";
        if (extra.equals("sm") || extra.equals("smThis")) s += "\nSystem.out.println(Counter.report());";
        return s;
    }

    public static void main(String[] args) throws Exception {
        for (String decl : new String[] { "inst", "static" })
            for (String extra : new String[] { "none", "sm", "smThis", "cls0", "clsHit" })
                for (int nb = 0; nb <= 2; nb++) {
                    String key = decl + "|" + extra + "|" + nb, cls = classes(decl, extra), mb = mainBody(extra, nb);
                    Res r = run(cls, mb);
                    System.out.println("SRC " + key + " => " + (cls + "\npublic class Main {\n    public static void main(String[] args) {\n" + mb + "\n    }\n}\n").replace("\n", "\\n"));
                    System.out.println(key + " => " + (r.ok ? "성공" : "오류: " + r.err) + "|" + r.errCount + "|" + (r.ok ? r.stdout : "-"));
                }
        // 요약에서 말하는 고치는 방법: static 메서드가 객체를 인자로 받아 그 객체의 인스턴스 필드를 읽는 것은 되는가
        Res p = run("class Counter {\n    int count;\n\n    void hit() {\n        count++;\n    }\n\n    static int report(Counter c) {\n        return c.count;\n    }\n}\n",
            "Counter a = new Counter();\na.hit();\na.hit();\nSystem.out.println(Counter.report(a));");
        System.out.println("# 객체를 인자로 받는 static 메서드 => " + (p.ok ? "성공|" + p.stdout : "오류: " + p.err));
        // 객체 변수로 static 필드를 읽을 때 객체가 쓰이지 않는가: null인 변수로 읽어도 예외 없이 값이 나오는지
        Res n = run("class Counter {\n    static int count;\n\n    void hit() {\n        count++;\n    }\n}\n",
            "Counter a = new Counter();\na.hit();\nCounter none = null;\nSystem.out.println(none.count);");
        System.out.println("# null인 변수로 static 필드 읽기 => " + (n.ok ? "성공|" + n.stdout : "오류: " + n.err));
    }
}
