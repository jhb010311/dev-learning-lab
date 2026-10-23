import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "상속" 실습을 실제로 컴파일하고 실행한다(2026-10-22, Object·RuntimeException 중심으로 다시 짠 판).
// 1. inherit_basic_probe_src.js가 화면의 코드 그대로 써 둔 <base>/<조합>/Main.java를 하나씩 javax.tools로 컴파일하고,
//    성공하면 자식 프로세스(java -cp <조합 폴더> Main)로 실행해 표준 출력, 표준 오류, 종료 코드를 잡는다.
//    출력: 조합 => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|표준 출력(줄은 " / "로 이음)|
//          첫 오류의 영어 메시지 첫 줄|오류가 난 줄(소스의 그 줄 글, ## 로 구분)|종료 코드|표준 오류 첫 줄
// 2. 단계 문장이 말하는 사실을 리플렉션과 짧은 소스로 잰다(# fact 줄).
// 실행: java verify/plain/InheritBasicProbe.java verify/out/inherit_basic_std > verify/plain/inherit_basic_probe.out.txt
// (옛 판: Animal·Dog 여덟 조합. 그 결과 InheritBasicProbe.out.txt와 소스 verify/out/inherit_basic/은 그대로 둔다.)
public class InheritBasicProbe {
    static final JavaCompiler JC = ToolProvider.getSystemJavaCompiler();
    static final String JAVA = Path.of(System.getProperty("java.home"), "bin", "java").toString();

    static List<Diagnostic<? extends JavaFileObject>> compile(String src, Path outDir) throws Exception {
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        JC.getTask(null, null, dc, List.of("-d", outDir.toString(), "-proc:none", "-encoding", "UTF-8"), null, List.of(fo)).call();
        return dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).collect(Collectors.toList());
    }

    // java -cp dir Main 을 실행해 [표준 출력, 표준 오류, 종료 코드]를 돌려준다
    static String[] runJava(Path dir) throws Exception {
        Path err = Files.createTempFile("ibp", ".err");
        Process p = new ProcessBuilder(JAVA, "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), "Main")
            .redirectError(err.toFile()).start();
        String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int code = p.waitFor();
        String e = Files.readString(err, StandardCharsets.UTF_8);
        Files.delete(err);
        return new String[] { out, e, String.valueOf(code) };
    }

    static String joinLines(String s) { return s.strip().isEmpty() ? "-" : String.join(" / ", s.strip().split("\\R")); }

    static Class<?> load(Path dir, String name) throws Exception {
        URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, InheritBasicProbe.class.getClassLoader().getParent());
        return cl.loadClass(name);
    }

    static String chain(Class<?> c) {
        List<String> l = new ArrayList<>();
        for (Class<?> k = c; k != null; k = k.getSuperclass()) l.add(k.getName());
        return String.join(" > ", l);
    }

    static String ctors(Class<?> c) {
        return Arrays.stream(c.getDeclaredConstructors()).map(Constructor::toString).sorted().collect(Collectors.joining(", "));
    }

    static String declaring(Class<?> c, String name, Class<?>... ps) throws Exception {
        return c.getMethod(name, ps).getDeclaringClass().getName();
    }

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args.length > 0 ? args[0] : "verify/out/inherit_basic_std");
        System.out.println("# java " + System.getProperty("java.version"));
        // 1. 화면의 코드 조합
        List<Path> dirs;
        try (Stream<Path> s = Files.list(base)) { dirs = s.filter(Files::isDirectory).sorted().collect(Collectors.toList()); }
        for (Path dir : dirs) {
            String src = Files.readString(dir.resolve("Main.java"), StandardCharsets.UTF_8);
            try (Stream<Path> s = Files.list(dir)) { for (Path p : s.filter(p -> p.toString().endsWith(".class")).collect(Collectors.toList())) Files.delete(p); }
            List<Diagnostic<? extends JavaFileObject>> errs = compile(src, dir);
            boolean ok = errs.isEmpty();
            String code = "-", msg = "-", where = "-";
            if (!ok) {
                String[] lines = src.split("\n");
                code = errs.get(0).getCode();
                msg = errs.get(0).getMessage(Locale.ENGLISH).split("\n")[0];
                where = errs.stream().map(d -> lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
            }
            String mainClass = String.valueOf(Files.exists(dir.resolve("Main.class")));
            String ran = "false", out = "-", exit = "-", err1 = "-";
            if (ok) {
                String[] r = runJava(dir);
                ran = "true"; out = joinLines(r[0]); exit = r[2];
                err1 = r[1].strip().isEmpty() ? "-" : r[1].strip().split("\\R")[0];
            }
            System.out.println(dir.getFileName() + " => " + (ok ? "OK" : "ERR") + "|" + code + "|" + errs.size()
                + "|" + mainClass + "|" + ran + "|" + out + "|" + msg + "|" + where + "|" + exit + "|" + err1);
        }
        // 2. 사실
        Path none = base.resolve("obj-none-Member"), ok = base.resolve("obj-ok-Member"), typo = base.resolve("obj-typo_noann-Member");
        Class<?> m0 = load(none, "Member");
        System.out.println("# fact Member superclass: " + m0.getSuperclass().getName());
        System.out.println("# fact Member(none) toString/equals/hashCode/getClass declared in: " + declaring(m0, "toString") + "/" + declaring(m0, "equals", Object.class)
            + "/" + declaring(m0, "hashCode") + "/" + declaring(m0, "getClass"));
        System.out.println("# fact Member(ok) toString declared in: " + declaring(load(ok, "Member"), "toString"));
        Class<?> m2 = load(typo, "Member");
        System.out.println("# fact Member(typo_noann) toString declared in: " + declaring(m2, "toString") + " | tostring declared in: " + declaring(m2, "tostring"));
        System.out.println("# fact Object public methods: " + Arrays.stream(Object.class.getMethods()).map(Method::getName).distinct().sorted().collect(Collectors.joining(", ")));
        System.out.println("# fact Object.toString: " + Object.class.getMethod("toString").toGenericString());
        // 같은 프로그램을 세 번 더 실행해 @ 뒤의 해시 코드가 실행마다 같은지 본다
        List<String> runs = new ArrayList<>();
        for (int i = 0; i < 3; i++) runs.add(joinLines(runJava(none)[0]));
        System.out.println("# fact obj-none-Member reruns: " + String.join(" ;; ", runs));
        Class<?> e0 = load(base.resolve("exc-ext-super-own"), "MemberNotFoundException");
        System.out.println("# fact MemberNotFoundException chain: " + chain(e0));
        System.out.println("# fact MemberNotFoundException getMessage declared in: " + declaring(e0, "getMessage"));
        System.out.println("# fact MemberNotFoundException(super) constructors: " + ctors(e0));
        System.out.println("# fact RuntimeException public constructors: " + Arrays.stream(RuntimeException.class.getConstructors()).map(Constructor::toString).sorted().collect(Collectors.joining(", ")));
        // 생성자를 적지 않은 예외 클래스에는 무엇이 생기나: 컴파일러가 넣는 인자 없는 생성자 하나뿐이다
        Path tmp = Files.createTempDirectory("ibp");
        List<Diagnostic<? extends JavaFileObject>> e1 = compile("class MemberNotFoundException extends RuntimeException {\n}\npublic class Main { }\n", tmp);
        System.out.println("# fact no-ctor class compiles: " + (e1.isEmpty() ? "OK" : "ERR") + " | constructors: " + ctors(load(tmp, "MemberNotFoundException")));
        // 용어 설명(kb_inherit_basic.js)이 말하는 것: 자바가 주는 예외들의 부모, throws 없이 RuntimeException을 던지는 메서드,
        // 문자열 + 객체와 record의 toString
        System.out.println("# fact superclass of NullPointerException/IllegalArgumentException/ArithmeticException: " + NullPointerException.class.getSuperclass().getName()
            + "/" + IllegalArgumentException.class.getSuperclass().getName() + "/" + ArithmeticException.class.getSuperclass().getName());
        Path t4 = Files.createTempDirectory("ibp");
        List<Diagnostic<? extends JavaFileObject>> e4 = compile("class E extends RuntimeException { E(String m) { super(m); } }\n"
            + "record Point(int x, int y) { }\n"
            + "class Member { String name; Member(String n) { name = n; } @Override public String toString() { return \"Member(\" + name + \")\"; } }\n"
            + "public class Main {\n    static void find() { throw new E(\"x\"); }\n"
            + "    public static void main(String[] a) { System.out.println(\"m=\" + new Member(\"민수\")); System.out.println(new Point(1, 2)); }\n}\n", t4);
        String[] r4 = e4.isEmpty() ? runJava(t4) : new String[] { "-", "-", "-" };
        System.out.println("# fact unchecked throw without throws compiles: " + (e4.isEmpty() ? "OK" : "ERR " + e4.get(0).getCode()) + " | output: " + joinLines(r4[0]));
        // extends 뒤에 클래스를 둘 적으면
        List<Diagnostic<? extends JavaFileObject>> e2 = compile("class A { }\nclass B { }\nclass C extends A, B { }\npublic class Main { }\n", Files.createTempDirectory("ibp"));
        System.out.println("# fact extends A, B: " + (e2.isEmpty() ? "OK" : "ERR " + e2.get(0).getCode() + " / " + e2.get(0).getMessage(Locale.ENGLISH).split("\n")[0]));
        // final 클래스 String은 extends할 수 없다
        List<Diagnostic<? extends JavaFileObject>> e3 = compile("class MyString extends String { }\npublic class Main { }\n", Files.createTempDirectory("ibp"));
        System.out.println("# fact extends String: " + (e3.isEmpty() ? "OK" : "ERR " + e3.get(0).getCode() + " / " + e3.get(0).getMessage(Locale.ENGLISH).split("\n")[0])
            + " | String is final: " + Modifier.isFinal(String.class.getModifiers()));
    }
}
