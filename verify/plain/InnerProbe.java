import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
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
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

// "내부 클래스와 익명 클래스" 실습의 스물네 가지 조합(종류 4 × 해 보려는 것 2 × 지역 변수 3)을 실제로 컴파일하고 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스(Main.java)를 문자열로 만들어 메모리에서 컴파일하고, 성공하면 Main.main을 실행한다.
// 출력: SRC 종류|해 보려는 것|지역 변수 :: 소스(줄바꿈은 \n으로 적음)
//       종류|해 보려는 것|지역 변수 => 컴파일 결과|실행 출력|바깥 객체 참조
//   컴파일 결과: ok 또는 error: javac의 오류 메시지 · 실행 출력: 여러 줄이면 " / "로 이음
//   바깥 객체 참조: 리플렉션으로 안쪽 클래스에 Outer 타입 필드가 있는지 본 것(ref=true는 그 필드가 바깥 객체 o를 가리킴, ref=none은 필드 없음)
public class InnerProbe {
    static String main(String body) {
        return "\n\npublic class Main {\n    public static void main(String[] args) {\n" + body + "    }\n}";
    }

    static String src(String kind, String use, String loc) {
        if (kind.equals("inner") || kind.equals("nested")) {
            boolean st = kind.equals("nested"), field = use.equals("field");
            String cn = st ? "Nested" : "Inner";
            String cls = "class Outer {\n    String name = \"A\";\n\n    "
                + (st ? "static class Nested {              // static 중첩 클래스" : "class Inner {                      // 인스턴스 내부 클래스 (static 없음)")
                + "\n        String who() { return " + (field ? "name; }      // 바깥 객체의 필드" : "\"안쪽\"; }") + "\n    }\n}";
            String body = field
                ? "        Outer o = new Outer();\n        Outer." + cn + " in = " + (st ? "new Outer.Nested();" : "o.new Inner();          // 바깥 객체 o로 만든다")
                    + "\n        o.name = \"B\";                          // 만든 뒤에 바깥 객체의 필드를 바꾼다\n        System.out.println(in.who());\n"
                : "        Outer." + cn + " in = new Outer." + cn + "();   // 바깥 객체 없이 만든다\n        System.out.println(in.who());\n";
            return cls + main(body);
        }
        boolean arr = loc.equals("arr");
        String cv = arr ? "count[0]" : "count";
        String decl = arr ? "        int[] count = { 1 };                 // 지역 변수 (배열을 가리킨다)\n" : "        int count = 1;                       // 지역 변수\n";
        String p1 = "System.out.println(\"count = \" + " + cv + ");\n", p2 = "System.out.println(\"this = \" + this.getClass().getName());\n";
        String obj = kind.equals("anon")
            ? "        Runnable r = new Runnable() {        // 익명 클래스\n            @Override\n            public void run() {\n                " + p1 + "                " + p2 + "            }\n        };\n"
            : "        Runnable r = () -> {                 // 람다\n            " + p1 + "            " + p2 + "        };\n";
        String chg = loc.equals("change") ? "        count = 2;                           // 만든 뒤에 값을 바꾼다\n"
            : arr ? "        count[0] = 2;                        // 변수는 그대로 두고 배열 칸의 값만 바꾼다\n" : "";
        return "class Outer {\n    Runnable make() {\n" + decl + obj + chg + "        return r;\n    }\n}" + main("        Runnable r = new Outer().make();\n        r.run();\n");
    }

    // 소스 문자열 하나를 담는 파일
    static class Src extends SimpleJavaFileObject {
        final String code;
        Src(String code) { super(URI.create("string:///Main.java"), Kind.SOURCE); this.code = code; }
        @Override public CharSequence getCharContent(boolean ignore) { return code; }
    }
    // 컴파일된 클래스를 메모리에 담는 파일
    static class Out extends SimpleJavaFileObject {
        final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        Out(String name) { super(URI.create("mem:///" + name.replace('.', '/') + ".class"), Kind.CLASS); }
        @Override public OutputStream openOutputStream() { return bytes; }
    }
    static class Loader extends ClassLoader {
        final Map<String, Out> outs;
        Loader(Map<String, Out> outs) { super(InnerProbe.class.getClassLoader()); this.outs = outs; }
        @Override protected Class<?> findClass(String name) throws ClassNotFoundException {
            Out o = outs.get(name);
            if (o == null) throw new ClassNotFoundException(name);
            byte[] b = o.bytes.toByteArray();
            return defineClass(name, b, 0, b.length);
        }
    }

    static final List<String> notes = new ArrayList<>();

    static String run(String kind, String use, String loc) throws Exception {
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diags = new DiagnosticCollector<>();
        Map<String, Out> outs = new HashMap<>();
        StandardJavaFileManager std = javac.getStandardFileManager(diags, Locale.ENGLISH, StandardCharsets.UTF_8);
        JavaFileManager fm = new ForwardingJavaFileManager<JavaFileManager>(std) {
            @Override public JavaFileObject getJavaFileForOutput(Location l, String name, JavaFileObject.Kind k, FileObject sibling) {
                Out o = new Out(name); outs.put(name, o); return o;
            }
        };
        boolean ok = javac.getTask(null, fm, diags, List.of("-proc:none"), null, List.of(new Src(src(kind, use, loc)))).call();
        if (!ok) {
            List<String> errs = new ArrayList<>();
            for (Diagnostic<? extends JavaFileObject> d : diags.getDiagnostics()) if (d.getKind() == Diagnostic.Kind.ERROR) errs.add(d.getMessage(Locale.ENGLISH));
            return "error: " + String.join(" ;; ", errs) + "|-|-";
        }
        Loader loader = new Loader(outs);
        PrintStream real = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
        try { loader.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
        finally { System.setOut(real); }
        String out = String.join(" / ", buf.toString(StandardCharsets.UTF_8).strip().split("\\R"));
        // 안쪽 클래스에 바깥 객체(Outer)를 가리키는 필드가 있는지 리플렉션으로 본다
        String ref = "-";
        // 익명 클래스의 객체와 람다가 지역 변수의 값을 복사해 갖고 있는지, 숨은 필드와 그 값을 참고로 적어 둔다 (대조에는 쓰지 않는 줄)
        if (kind.equals("anon") || kind.equals("lambda")) {
            Class<?> outer = loader.loadClass("Outer");
            Constructor<?> oc = outer.getDeclaredConstructor(); oc.setAccessible(true);
            java.lang.reflect.Method make = outer.getDeclaredMethod("make"); make.setAccessible(true);
            Object r = make.invoke(oc.newInstance());
            StringBuilder sb = new StringBuilder();
            for (Field f : r.getClass().getDeclaredFields()) {
                String val;
                try { f.setAccessible(true); Object x = f.get(r); val = x instanceof int[] ia ? "int[]{" + ia[0] + "}" : x != null && x.getClass() == outer ? "Outer 객체" : String.valueOf(x); }
                catch (RuntimeException | IllegalAccessException e) { val = "(읽을 수 없음: " + e.getClass().getSimpleName() + ")"; }
                sb.append(f.getType().getSimpleName()).append(' ').append(f.getName()).append(" = ").append(val).append("; ");
            }
            notes.add("# " + kind + "|" + use + "|" + loc + " r이 가리키는 객체의 숨은 필드: " + sb.toString().strip());
        }
        if (kind.equals("inner") || kind.equals("nested")) {
            Class<?> outer = loader.loadClass("Outer"), in = loader.loadClass(kind.equals("inner") ? "Outer$Inner" : "Outer$Nested");
            Field hidden = null;
            for (Field f : in.getDeclaredFields()) if (f.getType() == outer) hidden = f;
            if (hidden == null) ref = "none";
            else {
                Constructor<?> oc = outer.getDeclaredConstructor(); oc.setAccessible(true);
                Object o = oc.newInstance();
                Constructor<?> ic = in.getDeclaredConstructor(outer); ic.setAccessible(true);
                Object i = ic.newInstance(o);
                hidden.setAccessible(true);
                ref = String.valueOf(hidden.get(i) == o);
            }
            ref = "ref=" + ref;
        }
        return "ok|" + out + "|" + ref;
    }

    public static void main(String[] args) throws Exception {
        for (String kind : new String[] { "inner", "nested", "anon", "lambda" })
            for (String use : new String[] { "field", "alone" })
                for (String loc : new String[] { "keep", "change", "arr" }) {
                    String key = kind + "|" + use + "|" + loc;
                    System.out.println("SRC " + key + " :: " + src(kind, use, loc).replace("\n", "\\n"));
                    System.out.println(key + " => " + run(kind, use, loc));
                }
        for (String n : notes) System.out.println(n);
    }
}
