import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "생성자" 실습의 여덟 가지 조합(생성자 2 x 만드는 방식 2 x 객체 수 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   ctor : Card(String owner) 생성자를 적는가
//   arg  : name(new Card("김철수")) / empty(new Card())
//   two  : 객체를 하나 더 만드는가
// 조합 출력: ctor|arg|two => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력(줄은 ## 로 구분)|
//        "생성자 실행" 줄 수|첫 오류의 영어 메시지(줄은 ## 로 구분)|오류가 난 줄(소스의 그 줄 글, ## 로 구분)
// 단계 문장이 기대는 사실은 "@이름 => 값" 줄로 따로 출력한다.
// 조합마다 만든 소스는 verify/out/ctor_basic/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
public class CtorBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(boolean ctor, String arg, boolean two) {
        String a = arg.equals("name") ? "\"김철수\"" : "";
        String b = arg.equals("name") ? "\"이영희\"" : "";
        StringBuilder s = new StringBuilder();
        s.append("class Card {\n    String owner;\n");
        if (ctor) s.append("    // 생성자: 클래스와 이름이 같다. new Card(...)를 할 때 실행된다\n"
            + "    Card(String owner) {\n"
            + "        System.out.println(\"생성자 실행\");\n"
            + "        this.owner = owner;\n"
            + "    }\n");
        s.append("}\n\npublic class Main {\n    public static void main(String[] args) {\n");
        s.append("        Card a = new Card(" + a + ");\n        System.out.println(a.owner);\n");
        if (two) s.append("        Card b = new Card(" + b + ");\n        System.out.println(b.owner);\n");
        s.append("    }\n}\n");
        return s.toString();
    }

    static class Result {
        boolean ok; List<Diagnostic<? extends JavaFileObject>> errs; boolean mainClass; boolean ran; String out = "-"; Path dir; String[] lines;
    }

    static Result run(String src, Path dir) throws Exception {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        Result r = new Result();
        r.dir = dir;
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.deleteIfExists(dir.resolve("Card.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        r.ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        r.errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
        r.lines = src.split("\n");
        r.mainClass = Files.exists(dir.resolve("Main.class"));
        if (r.ok) {
            try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, CtorBasicProbe.class.getClassLoader().getParent())) {
                PrintStream old = System.out;
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                finally { System.setOut(old); }
                r.ran = true;
                r.out = buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " ## ");
            }
        }
        return r;
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/ctor_basic";
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean ctor : new boolean[] { false, true })
            for (String arg : new String[] { "name", "empty" })
                for (boolean two : new boolean[] { false, true }) {
                    String src = source(ctor, arg, two);
                    Result r = run(src, Path.of(base, ctor + "-" + arg + "-" + two));
                    String code = "-", msg = "-", where = "-";
                    if (!r.errs.isEmpty()) {
                        code = r.errs.get(0).getCode();
                        msg = r.errs.get(0).getMessage(Locale.ENGLISH).replace("\r\n", "\n").replace("\n", " ## ");
                        where = r.errs.stream().map(d -> r.lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
                    }
                    long runs = r.ran ? Arrays.stream(r.out.split(" ## ")).filter(x -> x.equals("생성자 실행")).count() : 0;
                    System.out.println(ctor + "|" + arg + "|" + two + " => " + (r.ok ? "OK" : "ERR") + "|" + code + "|" + r.errs.size()
                        + "|" + r.mainClass + "|" + r.ran + "|" + r.out + "|" + runs + "|" + msg + "|" + where);
                }

        // 사실 1: 생성자를 적지 않으면 컴파일러가 인자 없는 기본 생성자를 넣는다 (Card.class를 읽어 확인)
        {
            Result r = run(source(false, "empty", false), Path.of(base, "fact-default"));
            try (URLClassLoader cl = new URLClassLoader(new URL[] { r.dir.toUri().toURL() }, CtorBasicProbe.class.getClassLoader().getParent())) {
                Constructor<?>[] cs = cl.loadClass("Card").getDeclaredConstructors();
                System.out.println("@기본 생성자(생성자를 적지 않은 Card) => 개수 " + cs.length + "|매개변수 " + cs[0].getParameterCount() + "|접근 " + Modifier.toString(cs[0].getModifiers()) + "|");
            }
        }
        // 사실 1-2: 값을 받는 생성자를 적으면 Card.class에 생성자는 그것 하나뿐이다 (기본 생성자가 따로 생기지 않는다)
        {
            Result r = run(source(true, "name", false), Path.of(base, "fact-explicit"));
            try (URLClassLoader cl = new URLClassLoader(new URL[] { r.dir.toUri().toURL() }, CtorBasicProbe.class.getClassLoader().getParent())) {
                Constructor<?>[] cs = cl.loadClass("Card").getDeclaredConstructors();
                System.out.println("@값을 받는 생성자를 적은 Card => 개수 " + cs.length + "|매개변수 " + cs[0].getParameterCount() + "|");
            }
        }
        // 사실 2: 생성자가 실행되기 시작할 때 새 객체는 이미 있고 owner는 비어(null) 있다. new가 끝나야 main이 다음 줄로 간다.
        {
            String src = "class Card {\n    String owner;\n    Card(String owner) {\n"
                + "        System.out.println(\"시작할 때 this.owner=\" + this.owner + \", 매개변수 owner=\" + owner);\n"
                + "        this.owner = owner;\n        System.out.println(\"끝날 때 this.owner=\" + this.owner);\n    }\n}\n\n"
                + "public class Main {\n    public static void main(String[] args) {\n"
                + "        System.out.println(\"new 전\");\n        Card a = new Card(\"김철수\");\n        System.out.println(\"new 후 a.owner=\" + a.owner);\n    }\n}\n";
            Result r = run(src, Path.of(base, "fact-order"));
            System.out.println("@생성자 실행 순서 => " + (r.ok ? r.out : "컴파일 오류") + "|");
        }
        // 사실 3: 생성자는 이름으로 부를 수 없다 (a.Card("이영희"), Card("이영희") 모두 컴파일 오류)
        for (String call : new String[] { "a.Card(\"이영희\");", "Card(\"이영희\");" }) {
            String src = "class Card {\n    String owner;\n    Card(String owner) {\n        this.owner = owner;\n    }\n}\n\n"
                + "public class Main {\n    public static void main(String[] args) {\n        Card a = new Card(\"김철수\");\n        " + call + "\n    }\n}\n";
            Result r = run(src, Path.of(base, "fact-byname-" + (call.startsWith("a.") ? "a" : "bare")));
            String code = r.errs.isEmpty() ? "-" : r.errs.get(0).getCode();
            String msg = r.errs.isEmpty() ? "-" : r.errs.get(0).getMessage(Locale.ENGLISH).replace("\r\n", "\n").replace("\n", " ## ");
            System.out.println("@이름으로 부르기 " + call + " => " + (r.ok ? "OK" : "ERR") + "|" + code + "|" + msg + "|");
        }
    }
}
