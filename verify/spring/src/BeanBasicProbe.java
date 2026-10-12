import java.io.File;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.core.SpringVersion;

// 기초개념 "빈" 실습을 실제 스프링 프레임워크(스프링 부트 없이 AnnotationConfigApplicationContext("app"))에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 소스(패키지 app의 Greeter와 Main)를 임시 폴더에 만들어 컴파일하고,
// 자바 프로세스를 새로 띄워 app.Main을 그대로 실행한다. 실제 컴포넌트 스캔이며 Greeter를 손으로 등록하지 않는다.
//   comp : Greeter 위에 @Component가 있는가
//   get  : bean(context.getBean(Greeter.class)로 받는다) / new(new Greeter()로 직접 만든다)
// Probe에만 있는 줄은 끝에 //@probe 표시를 붙였고, 화면의 코드와 견줄 때(cmp) 뺀다.
//   Greeter의 생성자(객체가 만들어질 때마다 Count.made를 올림), Main의 Count.hook()과 Count.afterStart(context)
// 자식 프로세스가 적는 것: 표준 출력(프로그램의 출력), 표준 오류의 첫 줄(예외 종류와 메시지),
//   스프링을 시작한 직후의 Greeter 객체 수(started), 끝난 뒤의 수(end), 시작 직후 컨테이너에 등록된 이름들(names),
//   끝난 뒤 컨테이너 안의 Greeter 빈 수(beansEnd), 컨테이너의 Greeter 빈이 싱글톤인지(singleton)
public class BeanBasicProbe {
    static String greeterSource(boolean comp) {
        StringBuilder s = new StringBuilder();
        s.append("package app;\n\nimport org.springframework.stereotype.Component;\n\n");
        if (comp) s.append("// 표시: 스프링이 이 클래스의 객체를 만들어 보관한다\n@Component\n");
        s.append("public class Greeter {\n");
        s.append("    public Greeter() { Count.made++; } //@probe\n");
        s.append("    public String hello() {\n        return \"안녕하세요\";\n    }\n}\n");
        return s.toString();
    }

    static String mainSource(boolean viaBean) {
        StringBuilder s = new StringBuilder();
        s.append("package app;\n\nimport org.springframework.context.ApplicationContext;\nimport org.springframework.context.annotation.AnnotationConfigApplicationContext;\n\n");
        s.append("public class Main {\n    public static void main(String[] args) {\n");
        s.append("        Count.hook(); //@probe\n");
        s.append("        // 스프링을 시작한다. app 패키지를 훑어 @Component를 찾는다\n");
        s.append("        ApplicationContext context =\n                new AnnotationConfigApplicationContext(\"app\");\n");
        s.append("        Count.afterStart(context); //@probe\n");
        if (viaBean) {
            s.append("        // 스프링이 보관하고 있는 Greeter 객체를 달라고 한다\n");
            s.append("        Greeter a = context.getBean(Greeter.class);\n        Greeter b = context.getBean(Greeter.class);\n");
        } else {
            s.append("        Greeter a = new Greeter();\n        Greeter b = new Greeter();\n");
        }
        s.append("        System.out.println(a.hello());\n        System.out.println(a == b);\n    }\n}\n");
        return s.toString();
    }

    static final String COUNT = """
            package app;

            import java.util.List;
            import org.springframework.context.ApplicationContext;

            public class Count {
                public static int made, started = -1;
                public static String names = "";
                static ApplicationContext ctx;

                public static void hook() {
                    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                        int end = made;
                        String sing = "-";
                        int beansEnd = -1;
                        if (ctx != null) {
                            beansEnd = ctx.getBeanNamesForType(Greeter.class).length;
                            if (beansEnd == 1) sing = String.valueOf(ctx.isSingleton(ctx.getBeanNamesForType(Greeter.class)[0]));
                        }
                        System.out.println("PROBE started=" + started + "|end=" + end + "|names=" + names + "|beansEnd=" + beansEnd + "|singleton=" + sing);
                    }));
                }

                public static void afterStart(ApplicationContext context) {
                    ctx = context;
                    started = made;
                    List<String> l = new java.util.ArrayList<>();
                    // (스프링 내부 이름은 뺀다)
                    for (String n : context.getBeanDefinitionNames()) if (!n.startsWith("org.springframework.")) l.add(n);
                    names = String.join(",", l);
                }
            }
            """;

    static String esc(String s) { return s.replace("\r", "").replace("\n", "\\n"); }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-bean-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring framework " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (boolean comp : new boolean[] { true, false })
            for (String get : new String[] { "bean", "new" }) {
                Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                Files.createDirectories(src); Files.createDirectories(classes);
                String g = greeterSource(comp), m = mainSource(get.equals("bean"));
                Files.writeString(src.resolve("Greeter.java"), g, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Main.java"), m, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Count.java"), COUNT, StandardCharsets.UTF_8);
                StringWriter cw = new StringWriter();
                int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                        "-encoding", "UTF-8", "-proc:none", "-cp", cp, "-d", classes.toString(),
                        src.resolve("Greeter.java").toString(), src.resolve("Main.java").toString(), src.resolve("Count.java").toString());
                String key = comp + "|" + get;
                if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8",
                        "-cp", cp + File.pathSeparator + classes, "app.Main"));
                Path so = dir.resolve("stdout.txt"), se = dir.resolve("stderr.txt");
                Process p = new ProcessBuilder(cmd).redirectOutput(so.toFile()).redirectError(se.toFile()).start();
                int exit = p.waitFor();
                List<String> stdout = Files.readAllLines(so, StandardCharsets.UTF_8), stderr = Files.readAllLines(se, StandardCharsets.UTF_8);
                String probe = stdout.stream().filter(l -> l.startsWith("PROBE ")).findFirst().orElse("PROBE ?").substring(6);
                List<String> prog = stdout.stream().filter(l -> !l.startsWith("PROBE ")).toList();
                // 예외: "Exception in thread "main" 클래스: 메시지" 첫 줄
                String exc = stderr.stream().filter(l -> l.startsWith("Exception in thread")).findFirst().orElse("-");
                exc = exc.replace("Exception in thread \"main\" ", "");
                String otherErr = stderr.stream().filter(l -> !l.startsWith("Exception in thread") && !l.startsWith("\tat ") && !l.startsWith("Caused by") && !l.startsWith("\t... ")).findFirst().orElse("-");
                out.add(key + " => exit=" + exit + "|out=" + String.join(";", prog) + "|exc=" + exc + "|" + probe
                        + "|stderrOther=" + otherErr + "|greeter=" + esc(g) + "|main=" + esc(m));
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
