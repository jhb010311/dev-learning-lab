import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
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

// 기초개념 "제네릭" 실습의 여덟 가지 조합(<String> 표시 2 x 담는 것 2 x (String) 캐스팅 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 기본 옵션(경고 옵션 없음)으로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력과 예외를 잡는다.
//   gen  : List 뒤에 <String>을 적는가
//   put  : str(names.add("김철수")) / num(names.add(123))
//   cast : 꺼낼 때 (String)을 적는가
// 출력: gen|put|cast => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|
//        예외 클래스(없으면 -)|예외 메시지 첫 줄|예외가 난 줄(소스의 그 줄 글)|출력|
//        오류가 아닌 진단(경고, 노트)의 종류와 코드(없으면 -)|첫 오류의 영어 메시지 첫 줄|오류가 난 줄(소스의 그 줄 글, ## 로 구분)   (한 줄로 출력한다)
// 조합마다 만든 소스는 verify/out/generic_basic/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
public class GenericBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(boolean gen, String put, boolean cast) {
        StringBuilder s = new StringBuilder();
        s.append("import java.util.ArrayList;\n"
            + "import java.util.List;\n"
            + "\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) {\n");
        if (gen) s.append("        // <String>: 이 리스트에는 String만 담는다는 표시\n");
        s.append(gen ? "        List<String> names = new ArrayList<>();\n" : "        List names = new ArrayList();\n");
        s.append(put.equals("str") ? "        names.add(\"김철수\");\n" : "        names.add(123);\n");
        if (cast) s.append("        // (String): 꺼낸 것을 String으로 바꾼다고 직접 적는다\n");
        s.append(cast ? "        String first = (String) names.get(0);\n" : "        String first = names.get(0);\n");
        s.append("        System.out.println(first.length());\n"
            + "    }\n"
            + "}\n");
        return s.toString();
    }

    record Result(boolean ok, String code, int nerr, String mainClass, String ran, String exc, String excMsg, String excLine,
                  String out, String notes, String msg, String where) {
        String line() {
            return (ok ? "OK" : "ERR") + "|" + code + "|" + nerr + "|" + mainClass + "|" + ran + "|" + exc + "|" + excMsg + "|"
                + excLine + "|" + out + "|" + notes + "|" + msg + "|" + where;
        }
    }

    static Result build(JavaCompiler jc, String src, Path dir) throws Exception { return build(jc, src, dir, List.of()); }

    static Result build(JavaCompiler jc, String src, Path dir, List<String> extra) throws Exception {
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        List<String> opts = new java.util.ArrayList<>(List.of("-d", dir.toString(), "-proc:none"));
        opts.addAll(extra);
        boolean ok = jc.getTask(null, null, dc, opts, null, List.of(fo)).call();
        List<Diagnostic<? extends JavaFileObject>> all = dc.getDiagnostics();
        List<Diagnostic<? extends JavaFileObject>> errs = all.stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
        String[] lines = src.split("\n");
        String code = "-", msg = "-", where = "-";
        if (!errs.isEmpty()) {
            code = errs.get(0).getCode();
            msg = errs.get(0).getMessage(Locale.ENGLISH).split("\n")[0];
            where = errs.stream().map(d -> lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
        }
        String notes = all.stream().filter(d -> d.getKind() != Diagnostic.Kind.ERROR)
            .map(d -> d.getKind() + ":" + d.getCode() + ":" + d.getMessage(Locale.ENGLISH).split("\n")[0]
            + (d.getLineNumber() > 0 ? "@" + lines[(int) d.getLineNumber() - 1].strip() : "")).collect(Collectors.joining(" ;; "));
        if (notes.isEmpty()) notes = "-";
        String mainClass = String.valueOf(Files.exists(dir.resolve("Main.class")));
        String ran = "false", exc = "-", excMsg = "-", excLine = "-", out = "-";
        if (ok) {
            try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, GenericBasicProbe.class.getClassLoader().getParent())) {
                PrintStream old = System.out;
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                try {
                    cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]);
                } catch (InvocationTargetException e) {
                    Throwable t = e.getCause();
                    exc = t.getClass().getName();
                    excMsg = String.valueOf(t.getMessage()).split("\n")[0];
                    for (StackTraceElement el : t.getStackTrace())
                        if (el.getClassName().equals("Main") && el.getMethodName().equals("main")) { excLine = lines[el.getLineNumber() - 1].strip(); break; }
                } finally { System.setOut(old); }
                ran = "true";
                out = buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
                if (out.isEmpty()) out = "(없음)";
            }
        }
        return new Result(ok, code, errs.size(), mainClass, ran, exc, excMsg, excLine, out, notes, msg, where);
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/generic_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean gen : new boolean[] { false, true })
            for (String put : new String[] { "str", "num" })
                for (boolean cast : new boolean[] { false, true }) {
                    String src = source(gen, put, cast);
                    Result r = build(jc, src, Path.of(base, gen + "-" + put + "-" + cast));
                    System.out.println(gen + "|" + put + "|" + cast + " => " + r.line());
                }
        // 단계 문장이 기대는 사실 1: <String>이 없는 리스트에 123을 담는 줄은 실행 중에도 아무 일 없이 지나간다(꺼낼 때까지 예외가 없다)
        String f1 = "import java.util.ArrayList;\nimport java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n"
            + "        List names = new ArrayList();\n        names.add(123);\n        System.out.println(names.size());\n    }\n}\n";
        System.out.println("FACT add_raw_number => " + build(jc, f1, Path.of(base, "fact-add-raw-number")).line());
        // 단계 문장이 기대는 사실 2: <String>이 없어도 꺼낸 것을 Object 변수에 담는 것은 컴파일된다(컴파일러는 Object라고만 안다)
        String f2 = "import java.util.ArrayList;\nimport java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n"
            + "        List names = new ArrayList();\n        names.add(\"김철수\");\n        Object first = names.get(0);\n        System.out.println(first);\n    }\n}\n";
        System.out.println("FACT get_raw_object => " + build(jc, f2, Path.of(base, "fact-get-raw-object")).line());
        // 단계 문장이 기대는 사실 3: <String>이 있는 리스트에서 꺼낸 것을 Object가 아니라 String 취급한다
        // (String의 메서드 length()를 캐스팅 없이 바로 부를 수 있다)
        String f3 = "import java.util.ArrayList;\nimport java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n"
            + "        List<String> names = new ArrayList<>();\n        names.add(\"김철수\");\n        System.out.println(names.get(0).length());\n    }\n}\n";
        System.out.println("FACT get_generic_string_method => " + build(jc, f3, Path.of(base, "fact-get-generic-method")).line());
        // 사실 4: 같은 raw 리스트에서 꺼낸 것의 메서드는 캐스팅 없이 부를 수 없다
        String f4 = "import java.util.ArrayList;\nimport java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n"
            + "        List names = new ArrayList();\n        names.add(\"김철수\");\n        System.out.println(names.get(0).length());\n    }\n}\n";
        System.out.println("FACT get_raw_string_method => " + build(jc, f4, Path.of(base, "fact-get-raw-method")).line());
        // 사실 5: 경고 옵션(-Xlint:unchecked,rawtypes)을 켜면 어느 줄에서 경고가 나는지(기본 옵션에서는 노트 두 줄뿐이다)
        System.out.println("FACT lint_raw_str_cast => " + build(jc, source(false, "str", true), Path.of(base, "fact-lint-raw-str-cast"), List.of("-Xlint:unchecked", "-Xlint:rawtypes")).line());
        System.out.println("FACT lint_raw_num_cast => " + build(jc, source(false, "num", true), Path.of(base, "fact-lint-raw-num-cast"), List.of("-Xlint:unchecked", "-Xlint:rawtypes")).line());
        // 사실 6: <String>이 있는 리스트에 123을 담는 오류를 javac가 줄이지 않고 알리면(-Xdiags:verbose)
        System.out.println("FACT verbose_gen_num => " + build(jc, source(true, "num", false), Path.of(base, "fact-verbose-gen-num"), List.of("-Xdiags:verbose")).line());
        // 사실 7: <String>이 있어도 (String)을 적으면 경고 없이 컴파일된다(-Xlint:all으로 확인; 불필요한 캐스트는 lint cast 항목)
        System.out.println("FACT lint_gen_str_cast => " + build(jc, source(true, "str", true), Path.of(base, "fact-lint-gen-str-cast"), List.of("-Xlint:all")).line());
    }
}
