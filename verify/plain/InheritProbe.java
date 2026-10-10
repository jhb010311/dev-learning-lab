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

// "상속과 오버라이딩" 실습의 서른여섯 가지 조합(부모의 생성자 3 × 자식 생성자의 첫 줄 3 × 부모 생성자가 describe()를 부르는가 2
// × 자식의 describe()가 super.describe()를 부르는가 2)을 실제로 컴파일하고 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 만들어 메모리에서 컴파일한다. 컴파일되면 "Dog d = new Dog();"까지만 있는 것과
// 전체를 따로 실행해, 객체를 만드는 동안의 출력과 d.describe()의 출력을 나눈다.
// 출력: 부모 생성자|첫 줄|부모가 부름|super.describe => 컴파일 결과|오류 개수|new Dog() 동안의 출력|d.describe()의 출력
//       SRC 로 시작하는 줄은 그 조합에서 컴파일한 소스(화면의 코드와 같은지 cmp_inherit.js가 비교한다)
public class InheritProbe {
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
        ClassLoader cl = new ClassLoader(InheritProbe.class.getClassLoader()) {
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
    static String classes(String pctor, String sup, boolean pcall, boolean sm) {
        String call = pcall ? "        describe();\n" : "";
        String noArg = "    Animal() {\n        name = \"이름 없음\";\n        System.out.println(\"Animal() 실행\");\n" + call + "    }\n";
        String withArg = "    Animal(String name) {\n        this.name = name;\n        System.out.println(\"Animal(String) 실행\");\n" + call + "    }\n";
        String animal = "class Animal {\n    String name;\n\n"
            + (pctor.equals("noarg") ? noArg : pctor.equals("arg") ? withArg : noArg + "\n" + withArg)
            + "\n    void describe() {\n        System.out.println(\"name=\" + name);\n    }\n}\n";
        String first = sup.equals("noarg") ? "        super();\n" : sup.equals("arg") ? "        super(\"바둑이\");\n" : "";
        String dog = "class Dog extends Animal {\n    String sound = \"멍멍\";\n\n    Dog() {\n" + first + "        System.out.println(\"Dog() 실행\");\n    }\n\n"
            + "    @Override\n    void describe() {\n" + (sm ? "        super.describe();\n" : "") + "        System.out.println(\"sound=\" + sound);\n    }\n}\n";
        return animal + "\n" + dog;
    }

    public static void main(String[] args) throws Exception {
        String make = "Dog d = new Dog();", use = "d.describe();";
        for (String pctor : new String[] { "noarg", "arg", "both" })
            for (String sup : new String[] { "omit", "noarg", "arg" })
                for (boolean pcall : new boolean[] { false, true })
                    for (boolean sm : new boolean[] { false, true }) {
                        String key = pctor + "|" + sup + "|" + pcall + "|" + sm, cls = classes(pctor, sup, pcall, sm);
                        Res full = run(cls, make + "\n" + use);
                        System.out.println("SRC " + key + " => " + (cls + "\n" + make + "\n" + use).replace("\n", "\\n"));
                        if (!full.ok) { System.out.println(key + " => 오류: " + full.err + "|" + full.errCount + "|-|-"); continue; }
                        Res part = run(cls, make);
                        if (!part.ok || !full.stdout.startsWith(part.stdout + " / ")) throw new IllegalStateException("출력을 나눌 수 없음: " + key);
                        System.out.println(key + " => 성공|0|" + part.stdout + "|" + full.stdout.substring(part.stdout.length() + 3));
                    }
        // 요약에서 말하는 것: 자식 클래스에 생성자를 하나도 적지 않아도, 부모에 인자 없는 생성자가 없으면 컴파일되지 않는가
        Res a = run("class Animal {\n    String name;\n\n    Animal(String name) {\n        this.name = name;\n    }\n}\n\nclass Dog extends Animal {\n}\n", "new Dog();");
        System.out.println("# 생성자를 적지 않은 자식, 인자 있는 생성자만 있는 부모 => " + (a.ok ? "성공" : "오류: " + a.err));
        // super(...)를 생성자의 첫 문장이 아닌 자리에 쓰면 컴파일되는지 (JDK 21 기준)
        Res b = run("class Animal {\n    Animal() {\n    }\n}\n\nclass Dog extends Animal {\n    Dog() {\n        System.out.println(\"Dog() 실행\");\n        super();\n    }\n}\n", "new Dog();");
        System.out.println("# super()가 첫 문장이 아님 => " + (b.ok ? "성공" : "오류: " + b.err));
        // 요약에서 말하는 것: 부모 생성자가 부른 오버라이딩 메서드에서 아직 null인 자식 필드의 메서드를 부르면 예외가 나는가
        String npe;
        try {
            Res n = run("class Animal {\n    Animal() {\n        describe();\n    }\n\n    void describe() {\n    }\n}\n\nclass Dog extends Animal {\n    String sound = \"멍멍\";\n\n    @Override\n    void describe() {\n        System.out.println(sound.length());\n    }\n}\n", "new Dog();");
            npe = n.ok ? "예외 없음|" + n.stdout : "오류: " + n.err;
        } catch (java.lang.reflect.InvocationTargetException e) { npe = "예외 " + e.getCause().getClass().getName(); }
        System.out.println("# 부모 생성자가 부른 describe()에서 sound.length() => " + npe);
    }
}
