import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "람다" 실습의 열여덟 가지 조합(형식 3 x t.run() 호출 3 x Task에 메서드가 하나 더 있는가 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   form : lambda(람다) / anon(익명 클래스) / named(이름 있는 클래스 Work)
//   call : once / none / twice (t.run()을 부르는 횟수)
//   two  : Task에 void stop();이 하나 더 있는가
// 출력: form|call|two => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력(줄은 " / "로 구분)|
//        첫 오류의 영어 메시지(줄은 " ~ "로 구분)|오류가 난 줄(소스의 그 줄 글, ## 로 구분)   (한 줄로 출력한다)
// 조합마다 만든 소스는 verify/out/lambda_basic/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
// 단계 문장이 기대는 사실은 아래 "# fact" 줄로 따로 잰다(람다 줄이 만든 객체의 종류, 그 줄에서 아무것도 출력되지 않는 것).
public class LambdaBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(String form, String call, boolean two) {
        StringBuilder s = new StringBuilder();
        s.append("interface Task {\n    void run();\n");
        if (two) s.append("    void stop();\n");
        s.append("}\n\n");
        if (form.equals("named")) s.append("// Task를 구현한 클래스: run이 할 일을 작성한다\n"
            + "class Work implements Task {\n"
            + "    public void run() {\n"
            + "        System.out.println(\"일한다\");\n"
            + "    }\n"
            + "}\n\n");
        s.append("public class Main {\n    public static void main(String[] args) {\n");
        if (form.equals("lambda")) s.append("        // 람다: run의 할 일을 담아 둔다. 이 줄에서는 실행되지 않는다\n"
            + "        Task t = () -> System.out.println(\"일한다\");\n");
        else if (form.equals("anon")) s.append("        // 익명 클래스: 이름 없는 클래스를 만들고 바로 new로 객체를 만든다\n"
            + "        Task t = new Task() {\n"
            + "            public void run() {\n"
            + "                System.out.println(\"일한다\");\n"
            + "            }\n"
            + "        };\n");
        else s.append("        // Work 클래스로 new를 해서 객체를 만들어 담는다\n"
            + "        Task t = new Work();\n");
        s.append("        System.out.println(\"준비\");\n");
        if (call.equals("once") || call.equals("twice")) s.append("        t.run();\n");
        if (call.equals("twice")) s.append("        t.run();\n");
        s.append("    }\n}\n");
        return s.toString();
    }

    static class Result {
        boolean ok; List<Diagnostic<? extends JavaFileObject>> errs; Path dir; String src;
    }

    static Result compile(JavaCompiler jc, String src, Path dir) throws Exception {
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        Result r = new Result();
        r.ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        r.errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
        r.dir = dir; r.src = src;
        return r;
    }

    static String run(Path dir) throws Exception {
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, LambdaBasicProbe.class.getClassLoader().getParent())) {
            PrintStream old = System.out;
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
            finally { System.setOut(old); }
            return buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
        }
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/lambda_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String form : new String[] { "lambda", "anon", "named" })
            for (String call : new String[] { "once", "none", "twice" })
                for (boolean two : new boolean[] { false, true }) {
                    String src = source(form, call, two);
                    Result r = compile(jc, src, Path.of(base, form + "-" + call + "-" + two));
                    String code = "-", msg = "-", where = "-";
                    if (!r.errs.isEmpty()) {
                        String[] lines = src.split("\n");
                        code = r.errs.get(0).getCode();
                        msg = r.errs.get(0).getMessage(Locale.ENGLISH).replace("\r", "").replace("\n", " ~ ").strip();
                        where = r.errs.stream().map(d -> lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
                    }
                    String mainClass = String.valueOf(Files.exists(r.dir.resolve("Main.class")));
                    String ran = "false", out = "-";
                    if (r.ok) { out = run(r.dir); ran = "true"; }
                    System.out.println(form + "|" + call + "|" + two + " => " + (r.ok ? "OK" : "ERR") + "|" + code + "|" + r.errs.size()
                        + "|" + mainClass + "|" + ran + "|" + out + "|" + msg + "|" + where);
                }

        // 사실 재기: Task t = ... 줄 바로 뒤에서 t가 어떤 객체인지(Task를 구현한 클래스의 객체인가, 람다/익명/이름 있는 클래스 중 무엇인가)를 출력한다.
        // 줄이 실행된 직후에는 "일한다"가 출력되지 않았는지도 함께 본다(그 줄 바로 뒤에 "직후" 출력).
        for (String form : new String[] { "lambda", "anon", "named" }) {
            String src = source(form, "none", false).replace("        System.out.println(\"준비\");\n",
                "        System.out.println(\"직후\");\n"
                + "        System.out.println(\"Task 구현 객체: \" + (t instanceof Task) + \", 익명 클래스: \" + t.getClass().isAnonymousClass()"
                + " + \", 숨은 클래스: \" + t.getClass().isHidden() + \", 클래스 이름 이름있음: \" + t.getClass().getSimpleName().equals(\"Work\"));\n");
            Result r = compile(jc, src, Path.of(base, "fact-" + form));
            System.out.println("# fact " + form + " => " + (r.ok ? run(r.dir) : "컴파일 실패 " + r.errs));
        }
    }
}
