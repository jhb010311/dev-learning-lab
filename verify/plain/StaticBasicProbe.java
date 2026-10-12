import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "static" 실습의 네 가지 조합(count 앞에 static 2 x 읽는 방법 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   st   : count 앞에 static을 적는가
//   read : cls(Counter.count로 읽는다) / obj(a.count로 읽는다)
// 출력 1) 표: st|read => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력|
//              첫 오류의 영어 메시지 첫 줄|오류가 난 줄(소스의 그 줄 글, ## 로 구분)
//   출력 2) SHARE st|read => a.count b.count : 같은 선언에서 읽는 줄만 a.count와 b.count를 각각 출력하도록 바꾼 소스를 실행한 값.
//          컴파일 오류인 조합에서도 읽는 줄만 바꾼 소스는 컴파일된다(count가 있는 곳의 근거).
//   출력 3) MID st => a.up() 직후의 a.count b.count (단계 문장이 기대는 사실)
//   출력 4) LINT st|read => 기본 옵션으로 컴파일했을 때의 경고 수 / -Xlint:all로 컴파일했을 때의 경고(코드: 메시지 첫 줄, ## 로 구분)
// 조합마다 만든 소스는 verify/out/static_basic/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
public class StaticBasicProbe {
    static final String READ_CLS = "        System.out.println(Counter.count);\n";
    static final String READ_OBJ = "        System.out.println(a.count);\n";
    static final String READ_BOTH = "        System.out.println(a.count + \" \" + b.count);\n";

    // 화면의 코드(실습의 code 함수)와 같은 글. readLine: 읽는 줄(보이는 코드는 read에 맞는 줄), mid: a.up() 뒤에 확인 줄을 더한다
    static String source(boolean st, String readLine, boolean mid) {
        StringBuilder s = new StringBuilder();
        s.append("class Counter {\n");
        if (st) s.append("    // static: 객체마다가 아니라 Counter 클래스에 하나만 있다\n");
        s.append("    ").append(st ? "static " : "").append("int count = 0;\n");
        s.append("    void up() {\n"
            + "        count = count + 1;\n"
            + "    }\n"
            + "}\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        Counter a = new Counter();\n"
            + "        Counter b = new Counter();\n"
            + "        a.up();\n");
        if (mid) s.append(READ_BOTH);
        s.append("        b.up();\n");
        s.append(readLine);
        s.append("    }\n"
            + "}\n");
        return s.toString();
    }

    record Result(boolean ok, List<Diagnostic<? extends JavaFileObject>> errs, List<Diagnostic<? extends JavaFileObject>> warns, boolean mainClass, String out, String src) {}

    static Result run(String src, Path dir, List<String> extra, boolean exec) throws Exception {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        List<String> opts = new ArrayList<>(List.of("-d", dir.toString(), "-proc:none"));
        opts.addAll(extra);
        boolean ok = jc.getTask(null, null, dc, opts, null, List.of(fo)).call();
        var errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
        var warns = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.WARNING || d.getKind() == Diagnostic.Kind.MANDATORY_WARNING).toList();
        String out = "-";
        if (ok && exec) {
            try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, StaticBasicProbe.class.getClassLoader().getParent())) {
                PrintStream old = System.out;
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                finally { System.setOut(old); }
                out = buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
            }
        }
        return new Result(ok, errs, warns, Files.exists(dir.resolve("Main.class")), out, src);
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/static_basic";
        System.out.println("# java " + System.getProperty("java.version"));
        List<String> table = new ArrayList<>(), share = new ArrayList<>(), mid = new ArrayList<>(), lint = new ArrayList<>();
        for (boolean st : new boolean[] { false, true }) {
            for (String read : new String[] { "cls", "obj" }) {
                String key = st + "|" + read;
                String src = source(st, read.equals("cls") ? READ_CLS : READ_OBJ, false);
                Result r = run(src, Path.of(base, st + "-" + read), List.of(), true);
                String code = "-", msg = "-", where = "-";
                if (!r.errs.isEmpty()) {
                    String[] lines = src.split("\n");
                    code = r.errs.get(0).getCode();
                    msg = r.errs.get(0).getMessage(Locale.ENGLISH).split("\n")[0];
                    where = r.errs.stream().map(d -> lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
                }
                table.add(key + " => " + (r.ok ? "OK" : "ERR") + "|" + code + "|" + r.errs.size() + "|" + r.mainClass + "|" + r.ok + "|" + r.out + "|" + msg + "|" + where);
                // 읽는 줄만 a.count, b.count로 바꾼 소스(컴파일 오류 조합에서도 근거를 남긴다)
                Result sh = run(source(st, READ_BOTH, false), Path.of(base, "share-" + st + "-" + read), List.of(), true);
                share.add("SHARE " + key + " => " + (sh.ok ? sh.out : "컴파일 오류"));
                // 경고: 기본 옵션과 -Xlint:all
                Result l0 = run(src, Path.of(base, "lint0-" + st + "-" + read), List.of(), false);
                Result l1 = run(src, Path.of(base, "lint1-" + st + "-" + read), List.of("-Xlint:all"), false);
                String w1 = l1.warns.isEmpty() ? "(없음)" : l1.warns.stream().map(d -> d.getCode() + ": " + d.getMessage(Locale.ENGLISH).split("\n")[0] + " @" + d.getLineNumber()).collect(Collectors.joining(" ## "));
                lint.add("LINT " + key + " => 기본 " + l0.warns.size() + "개 | -Xlint:all " + l1.warns.size() + "개 | " + w1);
            }
            // a.up() 직후의 값 (읽는 줄은 a.count로 맞춰 컴파일되게 한다)
            Result m = run(source(st, READ_OBJ, true), Path.of(base, "mid-" + st), List.of(), true);
            mid.add("MID " + st + " => " + (m.ok ? m.out : "컴파일 오류"));
        }
        table.forEach(System.out::println);
        share.forEach(System.out::println);
        mid.forEach(System.out::println);
        lint.forEach(System.out::println);
    }
}
