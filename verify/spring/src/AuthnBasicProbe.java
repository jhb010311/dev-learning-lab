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
import org.springframework.security.core.SpringSecurityCoreVersion;

// 기초개념 "인증과 인가" 실습을 실제 스프링 부트 + 스프링 시큐리티(HTTP Basic)에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 소스(보안 설정 SecurityConfig, 컨트롤러 AdminController)를 만들어
// verify/out/authn_basic/<rule>-<who>/src/app 에 두고 패키지 app으로 컴파일해, 자식 java 프로세스(--server.port=0)로 실제 서버를 띄운다.
// 사용자 등록(Users)과 시작 클래스(Main), 기록 도구(Rec)는 Probe에만 있는 파일이다.
//   rule : role   = /admin은 hasRole("ADMIN") / authed = 그 규칙을 지운다(authenticated()만 남음) / open = /admin은 permitAll()
//   who  : admin / kim = 맞는 비밀번호 / wrong = kim이 틀린 비밀번호 / none = 아이디와 비밀번호 없음 (Authorization 헤더 없음)
// 화면의 코드와 다른 줄은 "// PROBE"로 끝나는 줄뿐이다(컨트롤러의 실행 횟수와 SecurityContextHolder를 기록하는 줄).
// 자식(app.Main)이 적는 것:
//   status/www/body/ct : 응답의 상태 코드, WWW-Authenticate 헤더, 본문 앞부분, Content-Type
//   ctx  : 요청이 처리되는 동안 SecurityContextHolder(의 전략을 기록용으로 감싼 것)를 읽고 쓴 기록. get/set 때의 Authentication을 적는다
//   disp : 서블릿 필터에 요청이 들어온 횟수와 종류(REQUEST, ERROR). 오류 응답이 /error로 다시 넘어가면 ERROR가 찍힌다
//   calls/ctlWho : admin() 메서드의 실행 횟수, 실행됐다면 그 안에서 본 Authentication
public class AuthnBasicProbe {
    static final String CONFIG_HEAD = """
            package app;

            import org.springframework.context.annotation.Bean;
            import org.springframework.context.annotation.Configuration;
            import org.springframework.security.config.Customizer;
            import org.springframework.security.config.annotation.web.builders.HttpSecurity;
            import org.springframework.security.web.SecurityFilterChain;

            """;

    // 화면의 code()와 같은 글: 인가 규칙 줄이 rule에 따라 달라진다
    static String config(String rule) {
        StringBuilder s = new StringBuilder(CONFIG_HEAD);
        s.append("@Configuration\n");
        s.append("public class SecurityConfig {\n");
        s.append("    @Bean\n");
        s.append("    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n");
        s.append("        http.authorizeHttpRequests(auth -> auth\n");
        if (rule.equals("role")) {
            s.append("                // 인가: /admin은 ADMIN 권한이 있는 사람만\n");
            s.append("                .requestMatchers(\"/admin\").hasRole(\"ADMIN\")\n");
        } else if (rule.equals("open")) {
            s.append("                // 확인 없음: /admin은 누구에게나 열어 둔다\n");
            s.append("                .requestMatchers(\"/admin\").permitAll()\n");
        }
        s.append("                // 인가: 그 밖의 주소는 인증된(누구인지 확인된) 사람만 허용\n");
        s.append("                // (누구인지 확인하는 일은 이 줄이 아니라 아래 httpBasic이 한다)\n");
        s.append("                .anyRequest().authenticated())\n");
        s.append("            // 요청에 실린 아이디와 비밀번호로 누구인지 확인한다\n");
        s.append("            .httpBasic(Customizer.withDefaults());\n");
        s.append("        return http.build();\n");
        s.append("    }\n");
        s.append("}\n");
        return s.toString();
    }

    static final String CONTROLLER = """
            package app;

            import org.springframework.web.bind.annotation.GetMapping;
            import org.springframework.web.bind.annotation.RestController;

            @RestController
            public class AdminController {
                @GetMapping("/admin")
                public String admin() {
                    Count.calls++; Rec.inController();  // PROBE
                    return "관리자 화면";
                }
            }
            """;

    // 사용자 등록(화면에서 줄인 부분): 메모리 안의 사용자 저장소에 kim(USER)과 admin(ADMIN). 비밀번호는 {noop} 접두어로 암호화하지 않은 시험용 값
    static final String USERS = """
            package app;

            import org.springframework.context.annotation.Bean;
            import org.springframework.context.annotation.Configuration;
            import org.springframework.security.core.userdetails.User;
            import org.springframework.security.core.userdetails.UserDetailsService;
            import org.springframework.security.provisioning.InMemoryUserDetailsManager;

            @Configuration
            public class Users {
                @Bean
                UserDetailsService memoryUsers() {
                    return new InMemoryUserDetailsManager(
                            User.withUsername("kim").password("{noop}kim-test-pw").roles("USER").build(),
                            User.withUsername("admin").password("{noop}admin-test-pw").roles("ADMIN").build());
                }
            }
            """;

    // 기록 도구: SecurityContextHolder의 저장 방식(전략)을 기본 것을 감싼 것으로 바꿔, 읽고 쓰는 때마다 Authentication을 적는다.
    // 보안 필터 체인에는 아무것도 더하지 않는다. 요청 전체를 감싸는 서블릿 필터는 요청이 몇 번 들어왔는지(REQUEST, ERROR)만 적는다.
    static final String REC = """
            package app;

            import jakarta.servlet.DispatcherType;
            import jakarta.servlet.Filter;
            import java.util.ArrayList;
            import java.util.EnumSet;
            import java.util.List;
            import java.util.function.Supplier;
            import org.springframework.boot.web.servlet.FilterRegistrationBean;
            import org.springframework.context.annotation.Bean;
            import org.springframework.context.annotation.Configuration;
            import org.springframework.core.Ordered;
            import org.springframework.security.authentication.AnonymousAuthenticationToken;
            import org.springframework.security.core.Authentication;
            import org.springframework.security.core.context.SecurityContext;
            import org.springframework.security.core.context.SecurityContextHolder;
            import org.springframework.security.core.context.SecurityContextHolderStrategy;

            @Configuration
            public class Rec {
                static final List<String> ctx = new ArrayList<>(), disp = new ArrayList<>();

                static void reset() { synchronized (ctx) { ctx.clear(); disp.clear(); } }

                static void add(List<String> l, String s) { synchronized (ctx) { if (l.isEmpty() || !l.get(l.size() - 1).equals(s)) l.add(s); } }

                static String sum(Authentication a) {
                    if (a == null) return "null";
                    if (a instanceof AnonymousAuthenticationToken) return "anonymous";
                    return (a.isAuthenticated() ? "auth:" : "unauth:") + a.getName() + a.getAuthorities().stream().map(g -> g.getAuthority()).sorted().toList();
                }

                static void inController() {
                    synchronized (ctx) { ctx.add("controller:" + sum(SecurityContextHolder.getContext().getAuthentication())); }
                }

                static class Strategy implements SecurityContextHolderStrategy {
                    final SecurityContextHolderStrategy d = SecurityContextHolder.getContextHolderStrategy();

                    public void clearContext() { add(ctx, "clear"); d.clearContext(); }

                    public SecurityContext getContext() {
                        SecurityContext c = d.getContext();
                        add(ctx, "get:" + sum(c.getAuthentication()));
                        return c;
                    }

                    public Supplier<SecurityContext> getDeferredContext() {
                        Supplier<SecurityContext> s = d.getDeferredContext();
                        return () -> {
                            SecurityContext c = s.get();
                            add(ctx, "getDeferred:" + sum(c.getAuthentication()));
                            return c;
                        };
                    }

                    public void setContext(SecurityContext c) { add(ctx, "set:" + sum(c.getAuthentication())); d.setContext(c); }

                    public void setDeferredContext(Supplier<SecurityContext> s) { d.setDeferredContext(s); }

                    public SecurityContext createEmptyContext() { return d.createEmptyContext(); }
                }

                static void install() { SecurityContextHolder.setContextHolderStrategy(new Strategy()); }

                @Bean
                FilterRegistrationBean<Filter> outer() {
                    Filter f = (req, res, chain) -> {
                        add(disp, req.getDispatcherType().name() + ":" + ((jakarta.servlet.http.HttpServletRequest) req).getRequestURI());
                        add(ctx, ">" + req.getDispatcherType().name());
                        chain.doFilter(req, res);
                    };
                    FilterRegistrationBean<Filter> b = new FilterRegistrationBean<>(f);
                    b.setOrder(Ordered.HIGHEST_PRECEDENCE);
                    b.setDispatcherTypes(EnumSet.of(DispatcherType.REQUEST, DispatcherType.ERROR, DispatcherType.FORWARD, DispatcherType.ASYNC));
                    return b;
                }
            }
            """;

    static final String MAIN = """
            package app;

            import java.net.URI;
            import java.net.http.HttpClient;
            import java.net.http.HttpRequest;
            import java.net.http.HttpResponse;
            import java.util.Base64;
            import org.springframework.boot.Banner;
            import org.springframework.boot.SpringApplication;
            import org.springframework.boot.SpringBootConfiguration;
            import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
            import org.springframework.context.ConfigurableApplicationContext;
            import org.springframework.context.annotation.ComponentScan;

            @SpringBootConfiguration
            @EnableAutoConfiguration
            @ComponentScan
            public class Main {
                public static void main(String[] args) throws Exception {
                    String who = System.getProperty("lab.who");
                    Rec.install();
                    SpringApplication app = new SpringApplication(Main.class);
                    app.setBannerMode(Banner.Mode.OFF);
                    app.setLogStartupInfo(false);
                    try (ConfigurableApplicationContext ctx = app.run(args)) {
                        String port = ctx.getEnvironment().getProperty("local.server.port");
                        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/admin")).GET()
                                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                        String cred = switch (who) {
                            case "admin" -> "admin:admin-test-pw";
                            case "kim" -> "kim:kim-test-pw";
                            case "wrong" -> "kim:not-the-password";
                            default -> null;
                        };
                        if (cred != null) rb.header("Authorization", "Basic " + Base64.getEncoder().encodeToString(cred.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                        int calls0 = Count.calls;
                        Rec.reset();
                        HttpResponse<String> r = HttpClient.newHttpClient().send(rb.build(), HttpResponse.BodyHandlers.ofString());
                        Thread.sleep(400);
                        String body = r.body().replace('\\n', ' ').replace('\\r', ' ').replace('|', '/');
                        if (body.length() > 70) body = body.substring(0, 70);
                        String www = r.headers().firstValue("WWW-Authenticate").orElse("-").replace('|', '/');
                        String ct = r.headers().firstValue("Content-Type").orElse("-");
                        String c, d;
                        synchronized (Rec.ctx) { c = String.join(",", Rec.ctx); d = String.join(",", Rec.disp); }
                        System.out.println("RESULT status=" + r.statusCode() + "|www=" + www + "|ct=" + ct + "|body=" + body + "|calls0=" + calls0
                                + "|calls=" + Count.calls + "|disp=" + d + "|ctx=" + c);
                    }
                }
            }

            class Count {
                static int calls;
            }
            """;

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args[1]);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring security " + SpringSecurityCoreVersion.getVersion() + " | java " + System.getProperty("java.version"));
        for (String rule : new String[] { "role", "authed", "open" })
            for (String who : new String[] { "admin", "kim", "wrong", "none" }) {
                String name = rule + "-" + who;
                Path dir = base.resolve(name), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                Files.createDirectories(src); Files.createDirectories(classes);
                String[][] files = { { "SecurityConfig", config(rule) }, { "AdminController", CONTROLLER }, { "Users", USERS }, { "Rec", REC }, { "Main", MAIN } };
                List<String> args2 = new ArrayList<>(List.of("-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString()));
                for (String[] f : files) {
                    Files.writeString(src.resolve(f[0] + ".java"), f[1], StandardCharsets.UTF_8);
                    args2.add(src.resolve(f[0] + ".java").toString());
                }
                StringWriter cw = new StringWriter();
                int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }), args2.toArray(new String[0]));
                if (rc != 0) { out.add(rule + "|" + who + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dlab.who=" + who,
                        "-cp", cp + File.pathSeparator + classes, "app.Main", "--server.port=0", "--logging.level.root=OFF"));
                Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
                String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
                String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 800 ? all.substring(0, 800) : all).replace('\n', ' ').replace('\r', ' '));
                out.add(rule + "|" + who + " => " + res.substring(7));
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
