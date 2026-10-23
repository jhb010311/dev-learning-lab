import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.PrintStream;
import java.lang.annotation.Annotation;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import org.junit.platform.engine.discovery.DiscoverySelectors;
import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.SpringVersion;

// 기초개념 "애너테이션" 실습(표준 애너테이션 중심)을 실제로 컴파일하고 실행한다.
// 화면의 코드는 실습의 code 함수가 만든 글을 그대로 쓴다: 먼저 node verify/spring/annot_basic_probe_src.js가
// verify/out/annot_basic_std/<조합>/screen.txt를 만들고, 이 Probe가 "// 파일: ..." 줄로 파일을 나눠 javax.tools로 컴파일한다.
//   service-<put>-<spring> : 스프링 7(AnnotationConfigApplicationContext("app"), 실제 컴포넌트 스캔). 새 자바 프로세스로 app.Main 실행
//   override-<put>-<typo>  : javac가 @Override를 확인하는지. 컴파일되면 새 프로세스로 Main 실행
//   test-<put>-<junit>     : junit=true면 JUnit Platform Launcher(6.0.3)로 OrderTest 실행, false면 새 프로세스로 Main 실행
//   decl                   : 컴파일 뒤 javap -v로 OrderService.class를 보고 Service/Override가 남았는지
//   run-<put>-<reader>     : 직접 만든 @Run, 새 프로세스로 Main 실행
// 끝에 FACT 줄: 화면 문장이 기대는 사실(빈 이름, @Repository/@Controller/@Component로 바꿔도 빈이 되는지, 메서드에 @Service를 붙이면
// 컴파일 오류인지, @Service/@Override/@Test/@Component의 실제 선언(리플렉션), @Override가 class 파일에 남지 않는지 등).
// 출력: 키 => 이름=값|이름=값... (값의 줄바꿈은 \n으로 적음)
public class AnnotBasicProbe {
    static final String CP = System.getProperty("java.class.path");
    static final String JAVA = Path.of(System.getProperty("java.home"), "bin", "java").toString();
    static final String JAVAP = Path.of(System.getProperty("java.home"), "bin", "javap").toString();

    static String esc(String s) { return s.replace("\r", "").replace("\n", "\\n").replace("|", "¦"); }

    // "// 파일: app/X.java" 줄로 나눈다. 없으면 public class 이름(없으면 첫 class 이름)으로 한 파일
    static Map<String, String> split(String screen) {
        Map<String, String> files = new LinkedHashMap<>();
        String[] lines = screen.split("\n", -1);
        String cur = null; StringBuilder b = new StringBuilder();
        for (String ln : lines) {
            if (ln.startsWith("// 파일: ")) {
                if (cur != null) files.put(cur, b.toString());
                cur = ln.substring("// 파일: ".length()).trim(); b = new StringBuilder();
            }
            b.append(ln).append('\n');
        }
        if (cur != null) { files.put(cur, b.toString()); return files; }
        Matcher m = Pattern.compile("(?m)^public class (\\w+)").matcher(screen);
        String name = m.find() ? m.group(1) : null;
        if (name == null) { Matcher m2 = Pattern.compile("(?m)^class (\\w+)").matcher(screen); m2.find(); name = m2.group(1); }
        files.put(name + ".java", screen + "\n");
        return files;
    }

    record Compiled(boolean ok, String error, String errorLine, Path classes) {}

    static Compiled compile(Path dir, Map<String, String> files) throws Exception {
        Path src = dir.resolve("src"), classes = dir.resolve("classes");
        Files.createDirectories(src); Files.createDirectories(classes);
        List<File> list = new ArrayList<>();
        for (var e : files.entrySet()) { Path p = src.resolve(e.getKey()); Files.createDirectories(p.getParent()); Files.writeString(p, e.getValue(), StandardCharsets.UTF_8); list.add(p.toFile()); }
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        try (StandardJavaFileManager fm = jc.getStandardFileManager(dc, Locale.ENGLISH, StandardCharsets.UTF_8)) {
            boolean ok = jc.getTask(null, fm, dc, List.of("-d", classes.toString(), "-proc:none", "-encoding", "UTF-8", "-cp", CP), null, fm.getJavaFileObjectsFromFiles(list)).call();
            String err = "-", errLine = "-";
            for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) if (d.getKind() == Diagnostic.Kind.ERROR) {
                err = d.getMessage(Locale.ENGLISH).split("\n")[0];
                String text = Files.readString(Path.of(d.getSource().toUri()), StandardCharsets.UTF_8);
                errLine = text.split("\n")[(int) d.getLineNumber() - 1].trim();
                break;
            }
            return new Compiled(ok, err, errLine, classes);
        }
    }

    record Ran(int exit, String out, String exc) {}

    static Ran runProcess(Path classes, String mainClass) throws Exception {
        Path so = classes.resolveSibling("stdout.txt"), se = classes.resolveSibling("stderr.txt");
        Process p = new ProcessBuilder(JAVA, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8",
                "-cp", CP + File.pathSeparator + classes, mainClass).redirectOutput(so.toFile()).redirectError(se.toFile()).start();
        int exit = p.waitFor();
        List<String> out = Files.readAllLines(so, StandardCharsets.UTF_8), err = Files.readAllLines(se, StandardCharsets.UTF_8);
        String exc = err.stream().filter(l -> l.startsWith("Exception in thread")).findFirst().orElse("-").replace("Exception in thread \"main\" ", "");
        return new Ran(exit, String.join(";", out), exc);
    }

    static String mainOf(Map<String, String> files) { return files.containsKey("app/Main.java") ? "app.Main" : "Main"; }

    static String decl(Class<? extends Annotation> a) {
        List<String> parts = new ArrayList<>();
        for (Annotation x : a.getDeclaredAnnotations()) {
            if (x instanceof Target t) parts.add("@Target" + Arrays.toString(t.value()));
            else if (x instanceof Retention r) parts.add("@Retention(" + r.value() + ")");
            else parts.add("@" + x.annotationType().getSimpleName());
        }
        String elems = Arrays.stream(a.getDeclaredMethods()).map(m -> m.getName()).sorted().collect(Collectors.joining(","));
        return String.join(" ", parts) + " elements=" + (elems.isEmpty() ? "-" : elems);
    }

    static boolean bytesContain(Path f, String s) throws Exception {
        return new String(Files.readAllBytes(f), StandardCharsets.ISO_8859_1).contains(s);
    }

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args.length > 1 ? args[1] : "verify/out/annot_basic_std");
        Path work = Files.createTempDirectory("lab-annot-basic");
        List<String> out = new ArrayList<>();
        out.add("# spring framework " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version") + " | junit-platform-launcher 6.0.3");
        for (String key : Files.readAllLines(base.resolve("keys.txt"))) {
            if (key.isBlank()) continue;
            String screen = Files.readString(base.resolve(key).resolve("screen.txt"), StandardCharsets.UTF_8).replace("\r", "");
            Map<String, String> files = split(screen);
            Compiled c = compile(work.resolve(key), files);
            StringBuilder r = new StringBuilder(key + " => compile=" + (c.ok() ? "OK" : "ERR") + "|err=" + c.error() + "|errLine=" + c.errorLine());
            if (c.ok()) {
                if (key.startsWith("test-") && key.endsWith("-true")) {
                    URLClassLoader cl = new URLClassLoader(new URL[] { c.classes().toUri().toURL() }, AnnotBasicProbe.class.getClassLoader());
                    Thread.currentThread().setContextClassLoader(cl);
                    PrintStream old = System.out; ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                    LauncherDiscoveryRequest req = LauncherDiscoveryRequestBuilder.request().selectors(DiscoverySelectors.selectClass(cl.loadClass("OrderTest"))).build();
                    Launcher launcher = LauncherFactory.create();
                    SummaryGeneratingListener lis = new SummaryGeneratingListener();
                    launcher.execute(req, lis);
                    System.setOut(old);
                    TestExecutionSummary s = lis.getSummary();
                    r.append("|found=" + s.getTestsFoundCount() + "|succeeded=" + s.getTestsSucceededCount() + "|failed=" + s.getTestsFailedCount()
                        + "|out=" + String.join(";", buf.toString(StandardCharsets.UTF_8).replace("\r", "").lines().toList()));
                    cl.close();
                } else if (key.equals("decl")) {
                    Path cls = c.classes().resolve("app/OrderService.class");
                    Process p = new ProcessBuilder(JAVAP, "-v", cls.toString()).redirectErrorStream(true).start();
                    String jp = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
                    r.append("|javapVisible=" + jp.contains("RuntimeVisibleAnnotations") + "|javapService=" + jp.contains("org.springframework.stereotype.Service")
                        + "|javapInvisible=" + jp.contains("RuntimeInvisibleAnnotations") + "|javapOverride=" + jp.contains("Override")
                        + "|bytesOverride=" + bytesContain(cls, "java/lang/Override"));
                } else {
                    Ran ran = runProcess(c.classes(), mainOf(files));
                    r.append("|exit=" + ran.exit() + "|out=" + ran.out() + "|exc=" + ran.exc());
                    if (key.startsWith("override-") && key.split("-")[1].equals("true")) r.append("|classHasOverride=" + bytesContain(c.classes().resolve("Order.class"), "java/lang/Override"));
                }
            }
            r.append("|screen=" + esc(screen));
            out.add(r.toString());
        }

        // FACT: 컴포넌트 스캔이 등록한 빈 이름(스프링 내부 것은 뺌), 싱글톤인지
        {
            Compiled c = compile(work.resolve("fact-names"), split(Files.readString(base.resolve("service-true-true/screen.txt"), StandardCharsets.UTF_8).replace("\r", "")));
            URLClassLoader cl = new URLClassLoader(new URL[] { c.classes().toUri().toURL() }, AnnotBasicProbe.class.getClassLoader());
            AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext();
            ctx.setClassLoader(cl); ctx.scan("app"); ctx.refresh();
            String names = Arrays.stream(ctx.getBeanDefinitionNames()).filter(n -> !n.startsWith("org.springframework.")).collect(Collectors.joining(","));
            out.add("FACT beanNames => names=" + names + "|singleton=" + ctx.isSingleton("orderService"));
            // 메타 애너테이션: 자바 리플렉션(isAnnotationPresent)은 선언을 따라가 읽지 않고, 스프링(AnnotatedElementUtils)은 따라가 읽는다
            Class<?> os = cl.loadClass("app.OrderService");
            out.add("FACT metaRead => reflectService=" + os.isAnnotationPresent(org.springframework.stereotype.Service.class)
                + "|reflectComponent=" + os.isAnnotationPresent(org.springframework.stereotype.Component.class)
                + "|springComponent=" + org.springframework.core.annotation.AnnotatedElementUtils.hasAnnotation(os, org.springframework.stereotype.Component.class));
            ctx.close(); cl.close();
        }
        // FACT: @Service 자리에 @Repository, @Controller, @Component를 붙여도 빈이 되는가(같은 Main으로 실행)
        String svc = Files.readString(base.resolve("service-true-true/screen.txt"), StandardCharsets.UTF_8).replace("\r", "");
        for (String[] st : new String[][] { { "Repository", "org.springframework.stereotype.Repository" }, { "Controller", "org.springframework.stereotype.Controller" }, { "Component", "org.springframework.stereotype.Component" } }) {
            String v = svc.replace("import org.springframework.stereotype.Service;", "import " + st[1] + ";").replace("\n@Service\n", "\n@" + st[0] + "\n");
            Map<String, String> f = split(v);
            Compiled c = compile(work.resolve("fact-" + st[0]), f);
            Ran ran = c.ok() ? runProcess(c.classes(), "app.Main") : new Ran(-1, "", c.error());
            out.add("FACT stereotype=" + st[0] + " => compile=" + (c.ok() ? "OK" : "ERR") + "|exit=" + ran.exit() + "|out=" + ran.out() + "|exc=" + ran.exc());
        }
        // FACT: 메서드 위에 @Service를 붙이면(@Target(TYPE)) 컴파일 오류인가
        {
            String v = "import org.springframework.stereotype.Service;\n\npublic class Main {\n    @Service\n    public void run() { }\n    public static void main(String[] args) { }\n}\n";
            Compiled c = compile(work.resolve("fact-target"), Map.of("Main.java", v));
            out.add("FACT serviceOnMethod => compile=" + (c.ok() ? "OK" : "ERR") + "|err=" + c.error());
        }
        // FACT: 실제 선언(리플렉션으로 읽은 메타 애너테이션과 요소)
        out.add("FACT decl Service => " + decl(org.springframework.stereotype.Service.class));
        out.add("FACT decl Repository => " + decl(org.springframework.stereotype.Repository.class));
        out.add("FACT decl Controller => " + decl(org.springframework.stereotype.Controller.class));
        out.add("FACT decl Component => " + decl(org.springframework.stereotype.Component.class));
        out.add("FACT decl RestController => " + decl(org.springframework.web.bind.annotation.RestController.class));
        out.add("FACT decl SpringBootApplication => " + decl(org.springframework.boot.autoconfigure.SpringBootApplication.class));
        out.add("FACT decl Override => " + decl(Override.class));
        out.add("FACT decl Test => " + decl(org.junit.jupiter.api.Test.class));
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(l -> System.out.println(l.length() > 400 ? l.substring(0, 400) + "…" : l));
    }
}
