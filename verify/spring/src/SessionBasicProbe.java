import java.io.File;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.boot.SpringBootVersion;

// 기초개념 "세션" 실습을 실제 스프링 부트(내장 톰캣 11)에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 컨트롤러 소스(+ Probe 전용 /logout 메서드)와 app.Main을 임시 폴더에 만들어 패키지 app으로 컴파일하고,
// 자바 프로세스를 새로 띄워 실제 컴포넌트 스캔으로 컨트롤러를 찾게 한 뒤 실제 HTTP로 요청을 보낸다.
//   save   : login에서 session.setAttribute("user", "kim")을 실행하는가
//   second : same(같은 브라우저가 받은 JSESSIONID와 함께 /me) / nocookie(쿠키 없이 /me) / stolen(다른 사람이 같은 값으로 /me) / gone(POST /logout 뒤 같은 쿠키로 /me)
// 클래스패스는 스프링 시큐리티, JPA, H2 없이 필요한 jar만 준다(시큐리티가 있으면 요청이 막히고 자동 설정이 늘어난다).
// 요청은 java.net.http.HttpClient로 보내고 쿠키 보관 기능(CookieHandler)을 쓰지 않는다. "같은 브라우저"는 받은 Set-Cookie의 값을 다음 요청의 Cookie 헤더에 직접 적는 클라이언트 하나,
// "다른 사람"은 별개의 HttpClient(별개의 연결)가 같은 값을 Cookie 헤더에 적어 보내는 것이다.
// 서버 안의 세션 수와 내용은 톰캣 세션 관리자(Manager.findSessions)로 읽고, 요청마다 서버 쪽 필터가 요청에 실린 세션 번호와 그 번호가 유효했는지를 적는다.
public class SessionBasicProbe {
    static final String LIBS = "E:/dev/java-interview-lab/verify/spring/libs/";

    // boot_basic Probe와 같은 목록: BASE(spring-boot-starter) + WEB(spring-boot-starter-webmvc가 더 들여오는 것)
    static final String[] JARS = { "spring-boot", "spring-boot-autoconfigure", "spring-boot-starter", "spring-boot-starter-logging", "logback-classic", "logback-core",
            "log4j-to-slf4j", "log4j-api", "jul-to-slf4j", "slf4j-api", "spring-core", "commons-logging", "jspecify", "spring-context", "spring-aop", "spring-beans",
            "spring-expression", "micrometer-observation", "micrometer-commons", "jakarta.annotation-api", "snakeyaml",
            "spring-boot-starter-webmvc", "spring-boot-starter-jackson", "spring-boot-starter-tomcat", "spring-boot-starter-tomcat-runtime",
            "spring-boot-tomcat", "spring-boot-web-server", "spring-boot-http-converter", "spring-boot-webmvc", "spring-boot-servlet", "spring-boot-jackson",
            "spring-web", "spring-webmvc", "tomcat-embed-core", "tomcat-embed-el", "tomcat-embed-websocket", "jackson-databind", "jackson-core", "jackson-annotations" };

    static String classpath() throws Exception {
        List<String> jars = new ArrayList<>();
        for (String n : JARS) {
            List<String> hit = new ArrayList<>();
            try (var st = Files.list(Path.of(LIBS))) {
                st.map(p -> p.getFileName().toString()).filter(f -> f.matches(Pattern.quote(n) + "-\\d[^/]*\\.jar")).forEach(hit::add);
            }
            if (hit.size() != 1) throw new IllegalStateException("jar " + n + " -> " + hit);
            jars.add(LIBS + hit.get(0));
        }
        return String.join(File.pathSeparator, jars);
    }

    static String source(boolean save) {
        StringBuilder s = new StringBuilder();
        s.append("package app;\n\n");
        s.append("import jakarta.servlet.http.HttpSession;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.PostMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n");
        s.append("@RestController\npublic class SessionController {\n");
        s.append("    @PostMapping(\"/login\")\n    public String login(HttpSession session) {\n");
        if (save) s.append("        // 서버의 세션 저장소에 \"이 세션의 사용자는 kim\"이라고 적어 둔다\n        session.setAttribute(\"user\", \"kim\");\n");
        s.append("        return \"로그인됨\";\n    }\n\n");
        s.append("    @GetMapping(\"/me\")\n    public String me(HttpSession session) {\n");
        s.append("        // 요청에 실려 온 세션 번호로 저장소의 칸을 찾아 읽는다\n");
        s.append("        Object user = session.getAttribute(\"user\");\n");
        s.append("        return user == null ? \"누구인지 모름\" : \"안녕하세요, \" + user;\n    }\n\n");
        s.append("    // [probe-only] 화면에 보이지 않는 로그아웃 메서드\n");
        s.append("    @PostMapping(\"/logout\")\n    public String logout(HttpSession session) {\n        session.invalidate();\n        return \"로그아웃됨\";\n    }\n");
        s.append("    // [/probe-only]\n}\n");
        return s.toString();
    }

    static final String MAIN = """
            package app;

            import jakarta.servlet.Filter;
            import jakarta.servlet.FilterChain;
            import jakarta.servlet.ServletRequest;
            import jakarta.servlet.ServletResponse;
            import jakarta.servlet.DispatcherType;
            import jakarta.servlet.http.HttpServletRequest;
            import jakarta.servlet.http.HttpServletResponse;
            import jakarta.servlet.http.HttpSession;
            import jakarta.servlet.http.HttpSessionEvent;
            import jakarta.servlet.http.HttpSessionListener;
            import java.net.URI;
            import java.net.http.HttpClient;
            import java.net.http.HttpRequest;
            import java.net.http.HttpResponse;
            import java.util.ArrayList;
            import java.util.Collections;
            import java.util.List;
            import org.apache.catalina.Context;
            import org.apache.catalina.Manager;
            import org.apache.catalina.Session;
            import org.springframework.boot.Banner;
            import org.springframework.boot.SpringApplication;
            import org.springframework.boot.SpringBootConfiguration;
            import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
            import org.springframework.boot.tomcat.TomcatWebServer;
            import org.springframework.boot.web.server.servlet.context.ServletWebServerApplicationContext;
            import org.springframework.context.ConfigurableApplicationContext;
            import org.springframework.context.annotation.ComponentScan;
            import org.springframework.stereotype.Component;

            @SpringBootConfiguration
            @EnableAutoConfiguration
            @ComponentScan
            public class Main {
                record Resp(int status, String body, List<String> setCookies, String type) {}

                static Resp send(HttpClient c, String method, String port, String path, String cookie) throws Exception {
                    HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
                    if (method.equals("POST")) b.POST(HttpRequest.BodyPublishers.noBody()); else b.GET();
                    if (cookie != null) b.header("Cookie", "JSESSIONID=" + cookie);
                    Events.log.add("== " + method + " " + path);
                    HttpResponse<String> r = c.send(b.build(), HttpResponse.BodyHandlers.ofString());
                    return new Resp(r.statusCode(), r.body(), r.headers().allValues("Set-Cookie"), r.headers().firstValue("Content-Type").orElse("-"));
                }

                static String jsid(Resp r) {
                    for (String h : r.setCookies()) if (h.startsWith("JSESSIONID=")) { int e = h.indexOf(';'); return h.substring(11, e < 0 ? h.length() : e); }
                    return null;
                }

                static String store(Manager m) throws Exception {
                    Session[] ss = m.findSessions();
                    List<String> parts = new ArrayList<>();
                    for (Session s : ss) {
                        HttpSession h = s.getSession();
                        List<String> attrs = new ArrayList<>();
                        for (String n : Collections.list(h.getAttributeNames())) attrs.add(n + "=" + h.getAttribute(n));
                        Collections.sort(attrs);
                        parts.add(attrs.isEmpty() ? "-" : String.join(",", attrs));
                    }
                    Collections.sort(parts);
                    return ss.length + "[" + String.join(";", parts) + "]";
                }

                static String ids(Manager m) {
                    List<String> l = new ArrayList<>();
                    for (Session s : m.findSessions()) l.add(s.getIdInternal());
                    Collections.sort(l);
                    return String.join(",", l);
                }

                static String sets(Resp r) { return r.setCookies().isEmpty() ? "-" : String.join(" ## ", r.setCookies()); }

                public static void main(String[] args) throws Exception {
                    String second = System.getProperty("lab.second");
                    SpringApplication app = new SpringApplication(Main.class);
                    app.setBannerMode(Banner.Mode.OFF);
                    app.setLogStartupInfo(false);
                    try (ConfigurableApplicationContext ctx = app.run(args)) {
                        String port = ctx.getEnvironment().getProperty("local.server.port");
                        TomcatWebServer tws = (TomcatWebServer) ((ServletWebServerApplicationContext) ctx).getWebServer();
                        Context tc = (Context) tws.getTomcat().getHost().findChildren()[0];
                        Manager mgr = tc.getManager();
                        String store0 = store(mgr);
                        HttpClient a = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
                        HttpClient b = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
                        Resp login = send(a, "POST", port, "/login", null);
                        String c1 = jsid(login);
                        String store1 = store(mgr), ids1 = ids(mgr);
                        Resp me, extra = null, out = null;
                        String storeOut = "-";
                        switch (second) {
                            case "same" -> me = send(a, "GET", port, "/me", c1);
                            case "nocookie" -> me = send(a, "GET", port, "/me", null);
                            case "stolen" -> { me = send(b, "GET", port, "/me", c1); extra = send(a, "GET", port, "/me", c1); }
                            case "gone" -> { out = send(a, "POST", port, "/logout", c1); storeOut = store(mgr); me = send(a, "GET", port, "/me", c1); }
                            default -> throw new IllegalStateException(second);
                        }
                        String store2 = store(mgr), ids2 = ids(mgr), c2 = jsid(me);
                        String shape = c1 == null ? "-" : c1.matches("[0-9A-F]{32}") ? "hex32" : "other";
                        StringBuilder sb = new StringBuilder("RESULT store0=" + store0);
                        sb.append("|loginStatus=").append(login.status()).append("|loginBody=").append(login.body()).append("|loginType=").append(login.type());
                        sb.append("|loginSet=").append(sets(login)).append("|cookie=").append(c1 == null ? "-" : "JSESSIONID").append("|cookieLen=").append(c1 == null ? 0 : c1.length());
                        sb.append("|cookieShape=").append(shape).append("|cookieHasKim=").append(c1 != null && c1.toLowerCase().contains("kim"));
                        sb.append("|store1=").append(store1).append("|ids1=").append(ids1);
                        sb.append("|meStatus=").append(me.status()).append("|meBody=").append(me.body()).append("|meSet=").append(sets(me));
                        sb.append("|meNewCookie=").append(c2 != null).append("|meNewDiffers=").append(c2 != null && !c2.equals(c1));
                        if (extra != null) sb.append("|extraStatus=").append(extra.status()).append("|extraBody=").append(extra.body()).append("|extraSet=").append(sets(extra));
                        if (out != null) sb.append("|outStatus=").append(out.status()).append("|outBody=").append(out.body()).append("|outSet=").append(sets(out)).append("|storeOut=").append(storeOut);
                        sb.append("|store2=").append(store2).append("|ids2=").append(ids2);
                        sb.append("|cookieName=").append(tc.getSessionCookieName()).append("|maxInactive=").append(mgr.getContext().getSessionTimeout());
                        sb.append("|trace=").append(String.join("~", Events.log));
                        System.out.println(sb);
                    }
                    System.exit(0);
                }
            }

            class Events {
                static final List<String> log = Collections.synchronizedList(new ArrayList<>());
            }

            @Component
            class TraceFilter implements Filter {
                public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws java.io.IOException, jakarta.servlet.ServletException {
                    HttpServletRequest rq = (HttpServletRequest) req;
                    if (rq.getDispatcherType() != DispatcherType.REQUEST) { chain.doFilter(req, res); return; }
                    Events.log.add("in port=" + rq.getRemotePort() + " cookie=" + rq.getHeader("Cookie") + " reqId=" + rq.getRequestedSessionId() + " valid=" + rq.isRequestedSessionIdValid());
                    chain.doFilter(req, res);
                }
            }

            @Component
            class TraceListener implements HttpSessionListener {
                public void sessionCreated(HttpSessionEvent e) { Events.log.add("created " + e.getSession().getId()); }
                public void sessionDestroyed(HttpSessionEvent e) { Events.log.add("destroyed " + e.getSession().getId()); }
            }
            """;

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-session-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = classpath();
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | java " + System.getProperty("java.version"));
        out.add("# classpath " + cp.split(File.pathSeparator).length + "개: 스프링 시큐리티, JPA, H2는 넣지 않음");
        int no = 0;
        for (boolean save : new boolean[] { false, true })
            for (String second : new String[] { "same", "nocookie", "stolen", "gone" }) {
                Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                Files.createDirectories(src); Files.createDirectories(classes);
                String code = source(save);
                Files.writeString(src.resolve("SessionController.java"), code, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Main.java"), MAIN, StandardCharsets.UTF_8);
                StringWriter cw = new StringWriter();
                int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                        "-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString(), src.resolve("SessionController.java").toString(), src.resolve("Main.java").toString());
                String key = save + "|" + second;
                if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                List<String> cmd = List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dlab.second=" + second,
                        "-cp", cp + File.pathSeparator + classes, "app.Main", "--server.port=0", "--logging.level.root=OFF");
                Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
                String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                if (!p.waitFor(60, TimeUnit.SECONDS)) p.destroyForcibly();
                String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 800 ? all.substring(0, 800) : all).replace('\n', ' ').replace('\r', ' '));
                out.add(key + " => src=" + code.replace("\n", "\\n") + "|" + res.substring(7));
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
