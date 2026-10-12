import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.annotation.Annotation;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "애너테이션" 실습의 열두 가지 조합(붙이는 곳 3 x 읽는 코드 2 x @Retention 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   mark   : work(work에만 @Run) / none(어디에도 안 붙임) / both(work와 rest 둘 다)
//   reader : Run이 붙은 메서드를 찾아 부르는 코드가 있는가
//   keep   : @Retention(RetentionPolicy.RUNTIME)을 적는가
// Main과 별개로 Probe가 직접 재는 것 (읽는 코드가 없는 조합에서도 잰다):
//   present : 같은 클래스 로더에서 Job.work, Job.rest에 isAnnotationPresent(Run)을 물은 결과
//   attr    : Job.class 파일에 RuntimeVisibleAnnotations / RuntimeInvisibleAnnotations 속성 이름이 있는가
// 출력: mark|reader|keep => 컴파일(OK/ERR)|오류 개수|Main.class가 만들어졌는가|출력(줄은 " / ")|present|attr|첫 오류 메시지
// 조합마다 만든 소스는 verify/out/annot_basic/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
public class AnnotBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(String mark, boolean reader, boolean keep) {
        StringBuilder s = new StringBuilder();
        if (keep) s.append("import java.lang.annotation.Retention;\n"
            + "import java.lang.annotation.RetentionPolicy;\n");
        if (reader) s.append("import java.lang.reflect.Method;\n");
        if (keep || reader) s.append("\n");
        s.append(keep ? "// 표시를 만든다. 실행 중에도 읽을 수 있게 남겨 두라고 적는다\n" : "// 표시를 만든다\n");
        if (keep) s.append("@Retention(RetentionPolicy.RUNTIME)\n");
        s.append("@interface Run { }\n\n"
            + "class Job {\n");
        if (!mark.equals("none")) s.append("    // 표시: work 메서드에 Run을 붙인다\n"
            + "    @Run\n");
        s.append("    public void work() {\n"
            + "        System.out.println(\"work 실행\");\n"
            + "    }\n");
        if (mark.equals("both")) s.append("    @Run\n");
        s.append("    public void rest() {\n"
            + "        System.out.println(\"rest 실행\");\n"
            + "    }\n"
            + "}\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) throws Exception {\n"
            + "        Job job = new Job();\n");
        if (reader) s.append("        // 읽는 쪽: Run이 붙은 메서드만 찾아 부른다\n"
            + "        for (String name : new String[] { \"work\", \"rest\" }) {\n"
            + "            Method m = Job.class.getMethod(name);\n"
            + "            if (m.isAnnotationPresent(Run.class)) {\n"
            + "                m.invoke(job);\n"
            + "            }\n"
            + "        }\n");
        s.append("    }\n"
            + "}\n");
        return s.toString();
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/annot_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String mark : new String[] { "work", "none", "both" })
            for (boolean reader : new boolean[] { false, true })
                for (boolean keep : new boolean[] { false, true }) {
                    String src = source(mark, reader, keep);
                    Path dir = Path.of(base, mark + "-" + reader + "-" + keep);
                    Files.createDirectories(dir);
                    Files.deleteIfExists(dir.resolve("Main.class"));
                    Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                    DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
                    JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
                        @Override public CharSequence getCharContent(boolean ignore) { return src; }
                    };
                    boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
                    List<Diagnostic<? extends JavaFileObject>> errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
                    String msg = errs.isEmpty() ? "-" : errs.get(0).getMessage(Locale.ENGLISH).split("\n")[0];
                    String mainClass = String.valueOf(Files.exists(dir.resolve("Main.class")));
                    String out = "-", present = "-", attr = "-";
                    if (ok) {
                        // Job.class 파일에 표시가 어떤 형태로 적혔는가
                        String job = new String(Files.readAllBytes(dir.resolve("Job.class")), StandardCharsets.ISO_8859_1);
                        attr = job.contains("RuntimeVisibleAnnotations") ? "visible" : job.contains("RuntimeInvisibleAnnotations") ? "invisible" : "none";
                        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, AnnotBasicProbe.class.getClassLoader().getParent())) {
                            // Main과 따로, 두 메서드에 Run이 보이는지 직접 묻는다
                            Class<?> jobClass = cl.loadClass("Job");
                            Class<? extends Annotation> runClass = cl.loadClass("Run").asSubclass(Annotation.class);
                            List<String> seen = new ArrayList<>();
                            for (String n : new String[] { "work", "rest" })
                                if (jobClass.getMethod(n).isAnnotationPresent(runClass)) seen.add(n);
                            present = seen.isEmpty() ? "없음" : String.join(", ", seen);
                            PrintStream old = System.out;
                            ByteArrayOutputStream buf = new ByteArrayOutputStream();
                            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                            finally { System.setOut(old); }
                            String text = buf.toString(StandardCharsets.UTF_8).strip();
                            out = text.isEmpty() ? "" : String.join(" / ", text.split("\\R"));
                        }
                    }
                    System.out.println(mark + "|" + reader + "|" + keep + " => " + (ok ? "OK" : "ERR") + "|" + errs.size()
                        + "|" + mainClass + "|" + out + "|" + present + "|" + attr + "|" + msg);
                }
    }
}
