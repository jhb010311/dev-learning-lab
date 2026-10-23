import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.Serializable;
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
import java.util.Collections;
import java.util.LinkedList;
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

// 기초개념 "인터페이스" 실습을 실제로 컴파일하고 실행한다(2026-10-22, 표준 List·Comparable 중심으로 다시 짠 판).
// 1. 리플렉션으로 실습이 말하는 자바 표준 라이브러리의 사실을 확인한다(# fact 줄).
//    List·Comparable이 인터페이스인지, ArrayList·LinkedList가 무엇을 extends·implements하는지, String이 Comparable인지,
//    trimToSize가 ArrayList에만 있는지, Comparable의 추상 메서드, Collections.sort(List)의 선언.
// 2. extends 뒤에 클래스 둘, implements 뒤에 인터페이스 둘을 적은 짧은 소스를 컴파일해 본다(# fact 줄).
// 3. interface_basic_probe_src.js가 화면의 코드 그대로 써 둔 <base>/<조합>/Main.java를 하나씩 javax.tools로 컴파일하고,
//    성공하면 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//    출력: 조합 => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력(줄은 " / "로 이음)|
//          첫 오류의 영어 메시지 첫 줄|오류가 난 줄(소스의 그 줄 글, ## 로 구분)
// 실행: java verify/plain/InterfaceBasicProbe.java verify/out/interface_basic_std > verify/plain/interface_basic_probe.out.txt
public class InterfaceBasicProbe {
    static final JavaCompiler JC = ToolProvider.getSystemJavaCompiler();

    static List<Diagnostic<? extends JavaFileObject>> compile(String src, Path outDir) throws Exception {
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        JC.getTask(null, null, dc, List.of("-d", outDir.toString(), "-proc:none", "-encoding", "UTF-8"), null, List.of(fo)).call();
        return dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).collect(Collectors.toList());
    }

    static String names(Class<?>[] cs) { return Arrays.stream(cs).map(Class::getSimpleName).collect(Collectors.joining(", ")); }

    static boolean hasMethod(Class<?> c, String name) { return Arrays.stream(c.getMethods()).anyMatch(m -> m.getName().equals(name)); }

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args.length > 0 ? args[0] : "verify/out/interface_basic_std");
        System.out.println("# java " + System.getProperty("java.version"));
        // 1. 표준 라이브러리의 사실
        System.out.println("# fact List: " + List.class.toGenericString() + " | isInterface=" + List.class.isInterface());
        System.out.println("# fact Comparable: " + Comparable.class.toGenericString() + " | isInterface=" + Comparable.class.isInterface()
            + " | abstract methods=" + Arrays.stream(Comparable.class.getDeclaredMethods()).filter(m -> Modifier.isAbstract(m.getModifiers())).map(Method::toGenericString).collect(Collectors.joining(", ")));
        System.out.println("# fact ArrayList: isInterface=" + ArrayList.class.isInterface() + " | extends " + ArrayList.class.getSuperclass().getSimpleName() + " | implements " + names(ArrayList.class.getInterfaces()));
        System.out.println("# fact LinkedList: isInterface=" + LinkedList.class.isInterface() + " | extends " + LinkedList.class.getSuperclass().getSimpleName() + " | implements " + names(LinkedList.class.getInterfaces()));
        System.out.println("# fact String implements " + names(String.class.getInterfaces()) + " | Comparable? " + Comparable.class.isAssignableFrom(String.class));
        System.out.println("# fact trimToSize: ArrayList=" + hasMethod(ArrayList.class, "trimToSize") + " List=" + hasMethod(List.class, "trimToSize") + " LinkedList=" + hasMethod(LinkedList.class, "trimToSize"));
        System.out.println("# fact List add/get/size: " + hasMethod(List.class, "add") + "/" + hasMethod(List.class, "get") + "/" + hasMethod(List.class, "size"));
        System.out.println("# fact List default methods: " + Arrays.stream(List.class.getDeclaredMethods()).filter(Method::isDefault).map(Method::getName).distinct().sorted().collect(Collectors.joining(", ")));
        System.out.println("# fact Collections.sort: " + Collections.class.getMethod("sort", List.class).toGenericString());
        // 2. extends 둘, implements 둘
        Path tmp = Files.createTempDirectory("ifb");
        List<Diagnostic<? extends JavaFileObject>> e2 = compile("class A { }\nclass B { }\nclass C extends A, B { }\npublic class Main { }\n", tmp);
        System.out.println("# fact extends A, B: " + (e2.isEmpty() ? "OK" : "ERR " + e2.get(0).getCode() + " / " + e2.get(0).getMessage(Locale.ENGLISH).split("\n")[0]));
        List<Diagnostic<? extends JavaFileObject>> i2 = compile("interface I { }\ninterface J { }\nclass K implements I, J { }\npublic class Main { }\n", tmp);
        System.out.println("# fact implements I, J: " + (i2.isEmpty() ? "OK" : "ERR " + i2.get(0).getCode()));
        // 3. 화면의 코드 조합
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
            String ran = "false", out = "-";
            if (ok) {
                try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, InterfaceBasicProbe.class.getClassLoader().getParent())) {
                    PrintStream old = System.out;
                    ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                    try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                    finally { System.setOut(old); }
                    ran = "true";
                    out = String.join(" / ", buf.toString(StandardCharsets.UTF_8).strip().split("\\R"));
                }
            }
            System.out.println(dir.getFileName() + " => " + (ok ? "OK" : "ERR") + "|" + code + "|" + errs.size()
                + "|" + mainClass + "|" + ran + "|" + out + "|" + msg + "|" + where);
        }
    }
}
