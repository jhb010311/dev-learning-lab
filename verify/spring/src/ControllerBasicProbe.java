import java.io.File;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.boot.SpringBootVersion;

// 기초개념 "컨트롤러" 실습을 실제 스프링 부트(내장 톰캣 + DispatcherServlet)에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 소스(세는 코드만 더함)와 app.Main을 임시 폴더에 만들어 패키지 app으로 컴파일하고,
// 자바 프로세스를 새로 띄워 실제 컴포넌트 스캔으로 컨트롤러를 찾게 한다. 컨트롤러를 @Bean으로 손수 등록하지 않는다.
//   ctl  : 클래스 위에 @RestController가 있는가
//   map  : 메서드 위에 @GetMapping("주소")가 있는가
//   many : one(/hello, 메서드 1개) / three(/login, /join, /members, 메서드 3개)
// 자식(app.Main)이 적는 것: 서버가 뜬 직후와 요청을 보낸 뒤의 컨트롤러 객체 수, 스프링의 주소 표(RequestMappingHandlerMapping),
// 주소마다 GET 한 번씩의 응답, 메서드 실행 횟수, 톰캣에 등록된 서블릿 목록, 컨트롤러 클래스가 Servlet 타입인지,
// DispatcherServlet이 서버가 뜬 직후에 초기화되어 있는지.
public class ControllerBasicProbe {
    static String source(boolean ctl, boolean map, boolean three) {
        StringBuilder s = new StringBuilder();
        String cls = three ? "MemberController" : "HelloController";
        String[][] ms = three ? new String[][] { { "login", "/login", "로그인 화면" }, { "join", "/join", "회원가입 화면" }, { "members", "/members", "회원 목록" } } : new String[][] { { "hello", "/hello", "안녕하세요" } };
        s.append("package app;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n");
        if (ctl) s.append("@RestController\n");
        s.append("public class ").append(cls).append(" {\n");
        s.append("    public ").append(cls).append("() { Count.made++; }\n\n");
        for (int i = 0; i < ms.length; i++) {
            if (map) s.append("    @GetMapping(\"").append(ms[i][1]).append("\")\n");
            s.append("    public String ").append(ms[i][0]).append("() {\n        Count.calls++;\n        return \"").append(ms[i][2]).append("\";\n    }\n");
            if (i < ms.length - 1) s.append("\n");
        }
        s.append("}\n");
        return s.toString();
    }

    static final String MAIN = """
            package app;

            import jakarta.servlet.ServletRegistration;
            import java.net.URI;
            import java.net.http.HttpClient;
            import java.net.http.HttpRequest;
            import java.net.http.HttpResponse;
            import java.util.ArrayList;
            import java.util.List;
            import java.util.Map;
            import java.util.TreeMap;
            import org.springframework.boot.Banner;
            import org.springframework.boot.SpringApplication;
            import org.springframework.boot.SpringBootConfiguration;
            import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
            import org.springframework.context.ConfigurableApplicationContext;
            import org.springframework.context.annotation.Bean;
            import org.springframework.context.annotation.ComponentScan;
            import org.springframework.security.config.annotation.web.builders.HttpSecurity;
            import org.springframework.security.web.SecurityFilterChain;
            import org.springframework.web.method.HandlerMethod;
            import org.springframework.web.servlet.DispatcherServlet;
            import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
            import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
            import org.springframework.web.context.WebApplicationContext;

            @SpringBootConfiguration
            @EnableAutoConfiguration
            @ComponentScan
            public class Main {
                @Bean SecurityFilterChain open(HttpSecurity http) throws Exception {
                    return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build();
                }

                public static void main(String[] args) throws Exception {
                    String cls = System.getProperty("lab.cls");
                    String[] paths = System.getProperty("lab.paths").split(",");
                    SpringApplication app = new SpringApplication(Main.class);
                    app.setBannerMode(Banner.Mode.OFF);
                    app.setLogStartupInfo(false);
                    try (ConfigurableApplicationContext ctx = app.run(args)) {
                        int made0 = Count.made, calls0 = Count.calls;
                        DispatcherServlet ds = ctx.getBean(DispatcherServlet.class);
                        boolean dispInit0 = ds.getServletConfig() != null;
                        int beans = ctx.getBeansOfType(Class.forName(cls)).size();
                        TreeMap<String, String> table = new TreeMap<>();
                        for (RequestMappingHandlerMapping hm : ctx.getBeansOfType(RequestMappingHandlerMapping.class).values()) {
                            for (Map.Entry<RequestMappingInfo, HandlerMethod> e : hm.getHandlerMethods().entrySet()) {
                                if (!e.getValue().getBeanType().getName().equals(cls)) continue;
                                table.put(String.join(",", e.getKey().getPatternValues()), e.getValue().getBeanType().getSimpleName() + "." + e.getValue().getMethod().getName());
                            }
                        }
                        boolean isServlet = jakarta.servlet.Servlet.class.isAssignableFrom(Class.forName(cls));
                        List<String> regs = new ArrayList<>();
                        String slash = "-";
                        for (ServletRegistration r : ((WebApplicationContext) ctx).getServletContext().getServletRegistrations().values()) {
                            regs.add(r.getName() + ":" + r.getClassName() + ":" + r.getMappings());
                            if (r.getMappings().contains("/")) slash = r.getClassName();
                        }
                        String port = ctx.getEnvironment().getProperty("local.server.port");
                        HttpClient client = HttpClient.newHttpClient();
                        List<String> r1 = new ArrayList<>();
                        for (String p : paths) {
                            HttpResponse<String> r = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + p)).GET()
                                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8").build(), HttpResponse.BodyHandlers.ofString());
                            r1.add(p + "=" + r.statusCode() + ":" + (r.statusCode() == 200 ? r.body() : "-") + ":" + r.headers().firstValue("Content-Type").orElse("-"));
                        }
                        System.out.println("RESULT made0=" + made0 + "|calls0=" + calls0 + "|beans=" + beans + "|table=" + table + "|isServlet=" + isServlet
                                + "|dispInit0=" + dispInit0 + "|dispInit1=" + (ds.getServletConfig() != null) + "|slash=" + slash + "|servlets=" + String.join(";", regs)
                                + "|made1=" + Count.made + "|calls1=" + Count.calls + "|round1=" + String.join(";", r1));
                    }
                }
            }

            class Count {
                static int made, calls;
            }
            """;

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-controller-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (boolean ctl : new boolean[] { false, true })
            for (boolean map : new boolean[] { false, true })
                for (String many : new String[] { "one", "three" }) {
                    boolean three = many.equals("three");
                    Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                    Files.createDirectories(src); Files.createDirectories(classes);
                    String cls = three ? "MemberController" : "HelloController";
                    Files.writeString(src.resolve(cls + ".java"), source(ctl, map, three), StandardCharsets.UTF_8);
                    Files.writeString(src.resolve("Main.java"), MAIN, StandardCharsets.UTF_8);
                    StringWriter cw = new StringWriter();
                    int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                            "-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString(), src.resolve(cls + ".java").toString(), src.resolve("Main.java").toString());
                    String key = ctl + "|" + map + "|" + many;
                    if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                    String paths = three ? "/login,/join,/members" : "/hello";
                    List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dlab.cls=app." + cls, "-Dlab.paths=" + paths,
                            "-cp", cp + File.pathSeparator + classes, "app.Main", "--server.port=0", "--logging.level.root=OFF"));
                    Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
                    String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
                    String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 600 ? all.substring(0, 600) : all).replace('\n', ' ').replace('\r', ' '));
                    out.add(key + " => classes=" + cls + "|" + res.substring(7));
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
