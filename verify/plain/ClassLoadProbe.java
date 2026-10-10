import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.PrintStream;
import java.io.StringWriter;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// "클래스 로딩과 초기화" 실습의 열여덟 가지 조합을 실제로 실행한다.
// 클래스의 초기화는 클래스 로더 하나에서 한 번만 일어나므로, 조합마다 화면의 코드와 같은 소스를 새로 컴파일해
// 새 클래스 로더에서 실행하고, static 초기화 블록이 찍은 줄을 모은다.
// 그리고 같은 클래스 파일을 새 JVM에서 -Xlog:class+load 옵션으로 한 번 더 실행해, 클래스를 읽어 들인 시점이
// 출력된 줄 사이의 어디인지도 기록한다("읽음 Parent"는 JVM이 그 순간 Parent 클래스를 읽어 들였다는 뜻).
// 출력: cls|use|decl => 출력된 줄(>로 이음)|이 로더가 읽어 들인 클래스(Parent,Child 가운데)|읽어 들인 시점까지 넣은 순서
// 사용: java ClassLoadProbe <컴파일 결과를 둘 폴더>
public class ClassLoadProbe {
    static final String[] USES = { "new", "smethod", "sfield", "const", "finalrt", "array", "classlit" };

    static class Tracking extends URLClassLoader {
        Tracking(URL[] urls) { super(urls, ClassLoader.getSystemClassLoader()); }
        boolean loaded(String name) { return findLoadedClass(name) != null; }
    }

    // 화면의 코드와 같은 구조의 소스를 만든다
    static String source(String cls, String use, String decl) {
        String member = switch (use) {
            case "smethod" -> "    static void hello() { }\n";
            case "sfield" -> "    static int count = 0;\n";
            case "const" -> "    static final int MAX = 10;\n";
            case "finalrt" -> "    static final int SIZE = Integer.parseInt(\"10\");\n";
            default -> "";
        };
        boolean inParent = cls.equals("parent") || decl.equals("parent");
        String T = cls.equals("parent") ? "Parent" : "Child";
        String[] stmt = switch (use) {
            case "new" -> new String[] { T + " a = new " + T + "();", T + " b = new " + T + "();" };
            case "smethod" -> new String[] { T + ".hello();", T + ".hello();" };
            case "sfield" -> new String[] { "int a = " + T + ".count;", "int b = " + T + ".count;" };
            case "const" -> new String[] { "int a = " + T + ".MAX;", "int b = " + T + ".MAX;" };
            case "finalrt" -> new String[] { "int a = " + T + ".SIZE;", "int b = " + T + ".SIZE;" };
            case "array" -> new String[] { T + "[] a = new " + T + "[3];", T + "[] b = new " + T + "[3];" };
            default -> new String[] { "Class<?> a = " + T + ".class;", "Class<?> b = " + T + ".class;" };
        };
        return "class Parent {\n" + (inParent ? member : "")
            + "    static { System.out.println(\"Parent 초기화\"); }\n}\n"
            + "class Child extends Parent {\n" + (inParent ? "" : member)
            + "    static { System.out.println(\"Child 초기화\"); }\n}\n"
            + "public class Main {\n    public static void main(String[] args) {\n"
            + "        System.out.println(\"main 시작\");\n"
            + "        " + stmt[0] + "\n"
            + "        System.out.println(\"첫 번째 사용 끝\");\n"
            + "        " + stmt[1] + "\n"
            + "        System.out.println(\"두 번째 사용 끝\");\n"
            + "    }\n}\n";
    }

    static String run(File dir, String src) throws Exception {
        dir.mkdirs();
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        JavaFileObject unit = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        StringWriter err = new StringWriter();
        boolean ok = jc.getTask(err, null, null, Arrays.asList("-d", dir.getPath(), "-proc:none"), null, List.of(unit)).call();
        if (!ok) return "컴파일 실패: " + err.toString().replace('\n', ' ');
        PrintStream old = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        String loaded;
        try (Tracking cl = new Tracking(new URL[] { dir.toURI().toURL() })) {
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try {
                Class<?> main = cl.loadClass("Main");
                main.getMethod("main", String[].class).invoke(null, (Object) new String[0]);
            } finally {
                System.setOut(old);
            }
            List<String> l = new ArrayList<>();
            if (cl.loaded("Parent")) l.add("Parent");
            if (cl.loaded("Child")) l.add("Child");
            loaded = l.isEmpty() ? "none" : String.join(",", l);
        }
        String lines = String.join(">", buf.toString(StandardCharsets.UTF_8).trim().split("\\R"));
        return lines + "|" + loaded + "|" + trace(dir);
    }

    // 새 JVM에서 실행해 "클래스를 읽어 들였다"는 JVM의 기록과 프로그램의 출력을 한 줄기로 받아, 순서대로 추린다
    static String trace(File dir) throws Exception {
        String java = System.getProperty("java.home") + File.separator + "bin" + File.separator + "java";
        Process p = new ProcessBuilder(java, "-Dstdout.encoding=UTF-8", "-Xlog:class+load:stdout", "-cp", dir.getPath(), "Main").redirectErrorStream(true).start();
        String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        p.waitFor();
        List<String> seq = new ArrayList<>();
        for (String line : out.split("\\R")) {
            if (line.contains("[class,load] Parent source:")) seq.add("읽음 Parent");
            else if (line.contains("[class,load] Child source:")) seq.add("읽음 Child");
            else if (!line.isEmpty() && !line.startsWith("[")) seq.add(line);
        }
        return String.join(">", seq);
    }

    public static void main(String[] args) throws Exception {
        File base = new File(args[0]);
        for (String cls : new String[] { "parent", "child" })
            for (String use : USES)
                for (String decl : new String[] { "own", "parent" }) {
                    // 선언 위치(decl)는 Child의 static 멤버를 쓸 때만 뜻이 있다. 그 밖에는 own 하나만 실행한다.
                    boolean member = use.equals("smethod") || use.equals("sfield") || use.equals("const") || use.equals("finalrt");
                    if (decl.equals("parent") && !(cls.equals("child") && member)) continue;
                    String key = cls + "|" + use + "|" + decl;
                    System.out.println(key + " => " + run(new File(base, key.replace('|', '_')), source(cls, use, decl)));
                }
    }
}
