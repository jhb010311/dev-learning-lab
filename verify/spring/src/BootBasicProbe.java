import java.io.File;
import java.io.StringWriter;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.TimeUnit;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.boot.SpringBootVersion;

// 기초개념 "스프링 부트" 실습을 실제 스프링 부트 4.1.1에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 소스(패키지 app의 App, 웹 라이브러리가 있으면 HelloController)를 임시 폴더에 만들어 컴파일하고,
// 자식 java 프로세스로 app.App을 그대로(main 메서드부터) 실행한 뒤 프로세스 밖에서 관찰한다. 소스에는 세는 줄도, 서버를 띄우는 줄도 없다.
//   run  : main에 SpringApplication.run(App.class, args)를 적었는가
//   anno : App 위에 @SpringBootApplication을 적었는가
//   web  : 프로젝트에 웹 라이브러리(spring-boot-starter-webmvc)가 들어 있는가. false면 spring-boot-starter만 있다.
// 클래스패스: 라이브러리 폴더 전체를 주지 않고, 화면의 의존성 한 줄이 들여오는 jar만 준다.
//   web=false : spring-boot-starter가 들여오는 jar (BASE)
//   web=true  : BASE + spring-boot-starter-webmvc가 더 들여오는 jar (WEB). 이 WEB 목록이 "web=false에서 뺀 jar"이다.
//   (pom을 열어 의존성 관계를 따라가 정한 목록이다. 아래 BASE, WEB 주석 참고)
// 자식 프로세스는 --server.port=<미리 비어 있는 것을 확인한 포트>로 띄운다. 서버가 없는 조합에서도 그 포트로 요청을 보내 연결이 되는지 본다.
// 관찰하는 것: 종료 여부와 종료 코드, 시작 뒤 3초가 지나도 살아 있는지, 자식이 연 TCP 대기 포트(netstat), 로그의 "Tomcat started on port",
//   요청의 응답, 스레드 목록(jcmd Thread.print: main 스레드가 끝났는지, 톰캣 스레드가 있는지), 실패한 경우의 로그.
// 별도 프로세스(app.Inspect, 화면의 코드에는 없는 Probe 전용 클래스)가 같은 App 클래스로 SpringApplication.run을 부르고 컨텍스트 안을 들여다본다:
//   웹 애플리케이션 종류, 컨텍스트 클래스, HelloController 빈, DispatcherServlet 빈, 톰캣 웹 서버 빈.
public class BootBasicProbe {
    static final String LIBS = "E:/dev/java-interview-lab/verify/spring/libs/";
    static final String JDK = "E:/dev/jdk-21.0.12.1+1/bin/";

    // BASE: spring-boot-starter의 의존 관계(pom 확인)
    //   spring-boot-starter -> spring-boot-starter-logging(logback-classic, log4j-to-slf4j, jul-to-slf4j), spring-boot-autoconfigure, jakarta.annotation-api, snakeyaml
    //   spring-boot -> spring-core(commons-logging, jspecify), spring-context(spring-aop, spring-beans, spring-expression, micrometer-observation)
    static final String[] BASE = { "spring-boot", "spring-boot-autoconfigure", "spring-boot-starter", "spring-boot-starter-logging", "logback-classic", "logback-core",
            "log4j-to-slf4j", "log4j-api", "jul-to-slf4j", "slf4j-api", "spring-core", "commons-logging", "jspecify", "spring-context", "spring-aop", "spring-beans",
            "spring-expression", "micrometer-observation", "micrometer-commons", "jakarta.annotation-api", "snakeyaml" };
    // WEB: spring-boot-starter-webmvc가 BASE 말고 더 들여오는 것(pom 확인)
    //   starter-webmvc -> starter, starter-jackson(spring-boot-jackson -> jackson-databind -> jackson-core, jackson-annotations), starter-tomcat, spring-boot-http-converter, spring-boot-webmvc
    //   starter-tomcat -> starter, starter-tomcat-runtime(spring-boot-tomcat, spring-boot-web-server, tomcat-embed-core/el/websocket), spring-boot-tomcat
    //   spring-boot-webmvc -> spring-boot-servlet, spring-web, spring-webmvc, spring-boot-http-converter
    static final String[] WEB = { "spring-boot-starter-webmvc", "spring-boot-starter-jackson", "spring-boot-starter-tomcat", "spring-boot-starter-tomcat-runtime",
            "spring-boot-tomcat", "spring-boot-web-server", "spring-boot-http-converter", "spring-boot-webmvc", "spring-boot-servlet", "spring-boot-jackson",
            "spring-web", "spring-webmvc", "tomcat-embed-core", "tomcat-embed-el", "tomcat-embed-websocket", "jackson-databind", "jackson-core", "jackson-annotations" };

    static String jar(String name) throws Exception {
        List<String> hit = new ArrayList<>();
        try (var st = Files.list(Path.of(LIBS))) {
            st.map(p -> p.getFileName().toString()).filter(f -> f.matches(Pattern.quote(name) + "-\\d[^/]*\\.jar")).forEach(hit::add);
        }
        if (hit.size() != 1) throw new IllegalStateException("jar " + name + " -> " + hit);
        return LIBS + hit.get(0);
    }

    static String classpath(boolean web, List<String> names) throws Exception {
        List<String> all = new ArrayList<>(List.of(BASE));
        if (web) all.addAll(List.of(WEB));
        List<String> jars = new ArrayList<>();
        for (String n : all) { String j = jar(n); jars.add(j); names.add(Path.of(j).getFileName().toString()); }
        return String.join(File.pathSeparator, jars);
    }

    static String appSource(boolean run, boolean anno) {
        StringBuilder s = new StringBuilder();
        s.append("package app;\n\n");
        if (run) s.append("import org.springframework.boot.SpringApplication;\n");
        if (anno) s.append("import org.springframework.boot.autoconfigure.SpringBootApplication;\n");
        s.append("\n");
        if (anno) s.append("// 표시: 이 패키지부터 훑고, 필요한 것을 알아서 설정한다\n@SpringBootApplication\n");
        s.append("public class App {\n    public static void main(String[] args) {\n");
        if (run) s.append("        // 이 한 줄이 스프링을 시작하고 서버를 띄운다\n        SpringApplication.run(App.class, args);\n");
        s.append("    }\n}\n");
        return s.toString();
    }

    static String controllerSource() {
        return "package app;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n"
                + "@RestController\npublic class HelloController {\n    @GetMapping(\"/hello\")\n    public String hello() {\n        return \"안녕하세요\";\n    }\n}\n";
    }

    static final String INSPECT = """
            package app;

            import org.springframework.boot.Banner;
            import org.springframework.boot.SpringApplication;
            import org.springframework.context.ConfigurableApplicationContext;

            public class Inspect {
                static String one(Throwable t) {
                    String m = String.valueOf(t.getMessage());
                    int i = m.indexOf('\\n');
                    return t.getClass().getName() + ": " + (i < 0 ? m : m.substring(0, i));
                }

                public static void main(String[] args) throws Exception {
                    boolean run = Boolean.parseBoolean(System.getProperty("lab.run"));
                    SpringApplication app = new SpringApplication(App.class);
                    app.setBannerMode(Banner.Mode.OFF);
                    app.setLogStartupInfo(false);
                    StringBuilder sb = new StringBuilder("INSPECT wat=" + app.getWebApplicationType());
                    if (run) {
                        try (ConfigurableApplicationContext ctx = app.run(args)) {
                            boolean hello = false, disp = false, ws = false;
                            try { hello = ctx.getBeanNamesForType(Class.forName("app.HelloController")).length > 0; } catch (ClassNotFoundException e) { }
                            try { disp = ctx.getBeanNamesForType(Class.forName("org.springframework.web.servlet.DispatcherServlet")).length > 0; } catch (ClassNotFoundException e) { }
                            try { ws = ctx.getBeanNamesForType(Class.forName("org.springframework.boot.web.server.WebServer")).length > 0
                                    || ctx.getClass().getName().contains("WebServer"); } catch (ClassNotFoundException e) { }
                            String regs = "-";
                            try {
                                Object sc = ctx.getClass().getMethod("getServletContext").invoke(ctx);
                                java.util.Map<?, ?> m = (java.util.Map<?, ?>) Class.forName("jakarta.servlet.ServletContext").getMethod("getServletRegistrations").invoke(sc);
                                Class<?> rc = Class.forName("jakarta.servlet.ServletRegistration");
                                java.util.List<String> l = new java.util.ArrayList<>();
                                for (Object r : m.values()) l.add(rc.getMethod("getName").invoke(r) + ":" + rc.getMethod("getClassName").invoke(r) + ":" + rc.getMethod("getMappings").invoke(r));
                                regs = String.join(";", l);
                            } catch (Exception e) { regs = "-"; }
                            sb.append("|servlets=").append(regs);
                            int n = ctx.getBeanDefinitionCount();
                            sb.append("|ctx=").append(ctx.getClass().getSimpleName()).append("|helloBean=").append(hello).append("|dispatcherBean=").append(disp)
                              .append("|webServerCtx=").append(ws).append("|appBean=").append(ctx.getBeanNamesForType(App.class).length > 0).append("|beanDefs=").append(n);
                        } catch (Throwable t) {
                            sb.append("|fail=").append(one(t));
                            Throwable c = t;
                            while (c.getCause() != null && c.getCause() != c) c = c.getCause();
                            if (c != t) sb.append("|root=").append(one(c));
                        }
                    } else sb.append("|ctx=-(main이 비어 있어 Inspect가 대신 부르지 않음)");
                    System.out.println(sb);
                }
            }
            """;

    static String esc(String s) { return s.replace("\r", "").replace("\n", "\\n"); }
    static String clean(String s) { return s.replace('|', '¦').replace('\r', ' ').replace('\n', ' ').trim(); }

    static String runCapture(List<String> cmd) throws Exception {
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        String s = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        p.waitFor();
        return s;
    }

    static Set<Integer> listeningPorts(long pid) throws Exception {
        Set<Integer> ports = new LinkedHashSet<>();
        String out = runCapture(List.of("netstat", "-ano", "-p", "TCP"));
        for (String l : out.split("\\R")) {
            String[] t = l.trim().split("\\s+");
            if (t.length >= 5 && t[0].equals("TCP") && t[3].equals("LISTENING") && t[4].equals(String.valueOf(pid))) {
                String a = t[1];
                ports.add(Integer.parseInt(a.substring(a.lastIndexOf(':') + 1)));
            }
        }
        return ports;
    }

    static int freePort() throws Exception {
        try (ServerSocket s = new ServerSocket(0)) { return s.getLocalPort(); }
    }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-boot-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String javaExe = JDK + "java.exe", jcmd = JDK + "jcmd.exe";
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | java " + System.getProperty("java.version"));
        List<String> baseNames = new ArrayList<>(), webNames = new ArrayList<>();
        classpath(false, baseNames);
        classpath(true, webNames);
        List<String> removed = new ArrayList<>(webNames);
        removed.removeAll(baseNames);
        out.add("# web=false의 클래스패스(" + baseNames.size() + "개) = spring-boot-starter가 들여오는 jar");
        out.add("# web=true의 클래스패스(" + webNames.size() + "개) = 위 + 아래 " + removed.size() + "개(spring-boot-starter-webmvc가 더 들여오는 jar. web=false에서 뺀 것)");
        out.add("# removed: " + String.join(", ", removed));
        // 웹 라이브러리 없이 HelloController를 컴파일하면 어떻게 되는지
        {
            Path d = root.resolve("nocompile");
            Files.createDirectories(d.resolve("src/app")); Files.createDirectories(d.resolve("classes"));
            Files.writeString(d.resolve("src/app/HelloController.java"), controllerSource(), StandardCharsets.UTF_8);
            StringWriter cw = new StringWriter();
            int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                    "-encoding", "UTF-8", "-proc:none", "-cp", classpath(false, new ArrayList<>()), "-d", d.resolve("classes").toString(), d.resolve("src/app/HelloController.java").toString());
            String first = cw.toString().lines().filter(l -> l.contains("error:")).findFirst().orElse("-");
            out.add("# HelloController를 web=false 클래스패스로 컴파일: rc=" + rc + " | " + clean(first.substring(first.indexOf("error:"))));
        }
        int no = 0;
        for (boolean run : new boolean[] { false, true })
            for (boolean anno : new boolean[] { false, true })
                for (boolean web : new boolean[] { false, true }) {
                    String key = run + "|" + anno + "|" + web;
                    Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes"), ins = dir.resolve("inspect");
                    Files.createDirectories(src); Files.createDirectories(classes); Files.createDirectories(ins);
                    String app = appSource(run, anno), ctl = web ? controllerSource() : "";
                    Files.writeString(src.resolve("App.java"), app, StandardCharsets.UTF_8);
                    List<String> files = new ArrayList<>(List.of(src.resolve("App.java").toString()));
                    if (web) { Files.writeString(src.resolve("HelloController.java"), ctl, StandardCharsets.UTF_8); files.add(src.resolve("HelloController.java").toString()); }
                    String cp = classpath(web, new ArrayList<>());
                    List<String> jc = new ArrayList<>(List.of("-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString()));
                    jc.addAll(files);
                    StringWriter cw = new StringWriter();
                    int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }), jc.toArray(new String[0]));
                    if (rc != 0) { out.add(key + " => COMPILE_ERROR " + clean(cw.toString())); continue; }
                    Files.writeString(src.resolve("Inspect.java"), INSPECT, StandardCharsets.UTF_8);
                    rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                            "-encoding", "UTF-8", "-proc:none", "-cp", cp + File.pathSeparator + classes, "-d", ins.toString(), src.resolve("Inspect.java").toString());
                    if (rc != 0) { out.add(key + " => COMPILE_ERROR(Inspect) " + clean(cw.toString())); continue; }
                    // 소스에 서버를 띄우는 코드가 있는가
                    String all = (app + ctl).toLowerCase();
                    boolean srcServer = all.contains("tomcat") || all.contains("serversocket") || all.contains("webserver") || all.contains("jetty") || all.contains("httpserver");

                    // 1) Inspect: 컨텍스트 안
                    Path ilog = dir.resolve("inspect.txt");
                    Process ip = new ProcessBuilder(javaExe, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dlab.run=" + run, "-cp", cp + File.pathSeparator + classes + File.pathSeparator + ins,
                            "app.Inspect", "--server.port=0", "--logging.level.root=OFF").redirectErrorStream(true).redirectOutput(ilog.toFile()).start();
                    ip.waitFor(30, TimeUnit.SECONDS);
                    if (ip.isAlive()) ip.destroyForcibly();
                    String insp = Files.readAllLines(ilog, StandardCharsets.UTF_8).stream().filter(l -> l.startsWith("INSPECT ")).findFirst().orElse("INSPECT ?").substring(8);

                    // 2) 진짜 실행: java app.App
                    int port = freePort();
                    Path log = dir.resolve("app.log");
                    long t0 = System.nanoTime();
                    Process p = new ProcessBuilder(javaExe, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", cp + File.pathSeparator + classes,
                            "app.App", "--server.port=" + port, "--spring.main.banner-mode=off").redirectErrorStream(true).redirectOutput(log.toFile()).start();
                    long pid = p.pid();
                    Set<Integer> ports = new LinkedHashSet<>();
                    try {
                        // 끝나거나 대기 포트가 열릴 때까지(최대 40초)
                        while (p.isAlive() && ports.isEmpty() && (System.nanoTime() - t0) < 40_000_000_000L) {
                            Thread.sleep(300);
                            if (p.isAlive()) ports = listeningPorts(pid);
                        }
                        boolean exitedEarly = !p.isAlive();
                        Thread.sleep(3000);
                        boolean alive3 = p.isAlive();
                        String exit = alive3 ? "-" : String.valueOf(p.exitValue());
                        if (alive3) ports = listeningPorts(pid);
                        String threads = "-", mainEnded = "-", http = "연결할 수 없음";
                        if (alive3) {
                            String dump = runCapture(List.of(jcmd, String.valueOf(pid), "Thread.print"));
                            List<String> names = new ArrayList<>(), nonDaemon = new ArrayList<>();
                            // 자바 스레드의 머리글은 "이름" #번호 [..] (daemon) prio=.. 모양이다. daemon 표시가 없는 것이 프로세스를 붙잡는 스레드다
                            Matcher m = Pattern.compile("^\"([^\"]+)\"(.*)$", Pattern.MULTILINE).matcher(dump);
                            while (m.find()) {
                                names.add(m.group(1));
                                if (m.group(2).contains(" #") && !m.group(2).contains(" daemon ")) nonDaemon.add(m.group(1));
                            }
                            boolean hasMain = names.contains("main"), destroy = names.contains("DestroyJavaVM");
                            mainEnded = String.valueOf(!hasMain && destroy);
                            List<String> tc = new ArrayList<>();
                            for (String n : names) if (n.startsWith("container-") || n.startsWith("http-nio") || n.startsWith("Catalina")) tc.add(n);
                            threads = "main=" + hasMain + ",DestroyJavaVM=" + destroy + ",nonDaemon=" + String.join(";", nonDaemon) + ",tomcat=" + String.join(";", tc);
                        }
                        // 요청: 프로세스 밖에서 실제 HTTP
                        try {
                            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
                            HttpResponse<String> r = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/hello")).timeout(Duration.ofSeconds(5)).GET()
                                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8").build(), HttpResponse.BodyHandlers.ofString());
                            http = r.statusCode() == 200 ? "200 " + r.body() : String.valueOf(r.statusCode());
                        } catch (java.io.IOException e) {
                            http = "연결할 수 없음(" + e.getClass().getSimpleName() + ")";
                        }
                        boolean aliveAfter = p.isAlive();
                        String logText = Files.readString(log, StandardCharsets.UTF_8);
                        Matcher tm = Pattern.compile("Tomcat started on port (\\d+)").matcher(logText);
                        String tomcatLog = tm.find() ? tm.group(1) : "-";
                        boolean started = logText.contains("Started App in");
                        // 로그에 찍힌 순서(톰캣이 만들어진 때, 연결을 받기 시작한 때, 스프링이 다 시작한 때, 첫 요청에서 DispatcherServlet이 초기화된 때)
                        String[][] marks = { { "Tomcat initialized with port", "tomcatInit" }, { "Root WebApplicationContext: initialization completed", "rootCtx" },
                                { "Tomcat started on port", "tomcatStarted" }, { "Started App in", "appStarted" }, { "Initializing Spring DispatcherServlet", "dispatcherInit" } };
                        List<String> order = new ArrayList<>();
                        for (String l : logText.lines().toList()) for (String[] mk : marks) if (l.contains(mk[0])) order.add(mk[1]);
                        String logOrder = order.isEmpty() ? "-" : String.join(">", order);
                        // 실패한 경우의 로그
                        String fail = "-";
                        if (!alive3 && !exit.equals("0")) {
                            List<String> ls = logText.lines().toList();
                            StringBuilder fb = new StringBuilder();
                            for (int i = 0; i < ls.size(); i++) {
                                String l = ls.get(i);
                                if (l.contains("APPLICATION FAILED TO START")) {
                                    for (int j = i + 1; j < ls.size() && j < i + 6; j++) if (!ls.get(j).isBlank() && !ls.get(j).startsWith("***")) fb.append(ls.get(j).trim()).append(" / ");
                                    break;
                                }
                            }
                            if (fb.length() == 0) {
                                for (String l : ls) if (l.startsWith("Exception in thread") || l.contains(" ERROR ")) { fb.append(l.trim()); break; }
                            }
                            fail = fb.length() == 0 ? "?" : fb.toString();
                        }
                        long ms = (System.nanoTime() - t0) / 1_000_000;
                        out.add(key + " => exitedEarly=" + exitedEarly + "|alive3=" + alive3 + "|exit=" + exit + "|aliveAfterRequest=" + aliveAfter + "|ports=" + ports + "|chosen=" + port
                                + "|tomcatLog=" + tomcatLog + "|started=" + started + "|http=" + clean(http) + "|mainEnded=" + mainEnded + "|threads=" + clean(threads)
                                + "|logOrder=" + logOrder + "|dep=" + (web ? "spring-boot-starter-webmvc" : "spring-boot-starter")
                                + "|srcServer=" + srcServer + "|inspect=" + clean(insp).replace(" ", "_") + "|fail=" + clean(fail) + "|ms=" + ms
                                + "|app=" + esc(app) + "|ctl=" + esc(ctl));
                    } finally {
                        p.descendants().forEach(ProcessHandle::destroyForcibly);
                        p.destroyForcibly();
                        p.waitFor();
                    }
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
