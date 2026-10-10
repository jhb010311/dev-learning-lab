import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// "정보 누출" 실습의 조합을 실제 스프링 부트 + 스프링 시큐리티 서버(127.0.0.1)에 HTTP 요청을 보내 확인한다.
//   boot    : 주문 조회가 SQL 오류(컬럼 이름 오타)로 실패할 때, spring.web.error.include-message / include-stacktrace 설정과
//             요청의 ?trace=true 여부에 따라 스프링 부트의 기본 오류 응답(/error)에 무엇이 담기는지
//   handler : 같은 오류를 @ExceptionHandler가 받아 예외 메시지를 그대로 응답할 때와 정해 둔 글귀만 응답할 때
//   login   : 가입하지 않은 아이디와 틀린 비밀번호에 대한 응답이 서로 구별되는지 (직접 짠 코드, 스프링 시큐리티 기본값, hideUserNotFoundExceptions=false)
// 응답의 글귀는 버전과 언어 설정에 따라 다르므로 "그 항목이 들어 있는가", "두 응답이 같은가"만 적는다.
// 사용: java InfoLeakProbe <출력 파일>
@SpringBootConfiguration
@EnableAutoConfiguration   // 기본 패키지라서 컴포넌트 스캔은 쓰지 않는다
public class InfoLeakProbe {
    static final String SQL = "select id, item, pirce from orders where id = ?";   // price를 pirce로 잘못 적었다
    static volatile String lastAuthException = "-";

    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build(); }

    @Bean DataSource dataSource() {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl("jdbc:h2:mem:infoleak;DB_CLOSE_DELAY=-1"); cfg.setUsername("sa"); cfg.setPassword("");
        HikariDataSource ds = new HikariDataSource(cfg);
        new JdbcTemplate(ds).execute("create table if not exists orders(id bigint primary key, item varchar(40), price int)");
        return ds;
    }
    static final java.util.concurrent.atomic.AtomicInteger matchCalls = new java.util.concurrent.atomic.AtomicInteger();   // 비밀번호 비교(matches)가 불린 횟수
    @Bean PasswordEncoder passwordEncoder() {
        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(4);   // 시험이라 계산량을 가장 낮게 잡았다
        return new PasswordEncoder() {
            @Override public String encode(CharSequence raw) { return bcrypt.encode(raw); }
            @Override public boolean matches(CharSequence raw, String encoded) { matchCalls.incrementAndGet(); return bcrypt.matches(raw, encoded); }
        };
    }
    @Bean UserDetailsService users(PasswordEncoder encoder) {
        return new InMemoryUserDetailsManager(User.withUsername("kim").password(encoder.encode("right-password")).roles("USER").build());
    }
    @Bean AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder encoder, Environment env) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        if ("unhide".equals(env.getProperty("lab.lg"))) provider.setHideUserNotFoundExceptions(false);   // 기본값은 true
        return new ProviderManager(provider);
    }

    @RestController
    public static class Api {
        private final JdbcTemplate jdbc; private final AuthenticationManager authenticationManager; private final UserDetailsService users; private final PasswordEncoder encoder;
        public Api(DataSource ds, AuthenticationManager am, UserDetailsService users, PasswordEncoder encoder) { this.jdbc = new JdbcTemplate(ds); this.authenticationManager = am; this.users = users; this.encoder = encoder; }

        // 주문 조회: SQL의 컬럼 이름이 틀려 실행할 때마다 예외가 난다
        @GetMapping("/orders/{id}")
        public Map<String, Object> order(@PathVariable long id) {
            return jdbc.queryForMap(SQL, id);
        }

        // 직접 짠 로그인: 아이디가 없을 때와 비밀번호가 틀릴 때 다른 글귀로 응답한다
        @PostMapping("/login/split")
        public ResponseEntity<String> loginSplit(@RequestParam String id, @RequestParam String pw) {
            org.springframework.security.core.userdetails.UserDetails m;
            try { m = users.loadUserByUsername(id); } catch (org.springframework.security.core.userdetails.UsernameNotFoundException e) { m = null; }
            if (m == null) return ResponseEntity.status(401).body("존재하지 않는 아이디입니다.");
            if (!encoder.matches(pw, m.getPassword())) return ResponseEntity.status(401).body("비밀번호가 틀렸습니다.");
            return ResponseEntity.ok("로그인됨");
        }
        // 스프링 시큐리티에 맡긴 로그인: 실패하면 예외의 메시지를 응답한다
        @PostMapping("/login/sec")
        public ResponseEntity<String> loginSec(@RequestParam String id, @RequestParam String pw) {
            try {
                authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(id, pw));
                return ResponseEntity.ok("로그인됨");
            } catch (AuthenticationException e) {
                lastAuthException = e.getClass().getSimpleName();
                return ResponseEntity.status(401).body(e.getMessage());
            }
        }
    }

    @Bean @ConditionalOnProperty(name = "lab.advice", havingValue = "raw") RawAdvice rawAdvice() { return new RawAdvice(); }
    @Bean @ConditionalOnProperty(name = "lab.advice", havingValue = "safe") SafeAdvice safeAdvice() { return new SafeAdvice(); }

    static ConfigurableApplicationContext start(String... more) {
        SpringApplication app = new SpringApplication(InfoLeakProbe.class);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        List<String> a = new ArrayList<>(List.of("--server.port=0", "--server.address=127.0.0.1", "--logging.level.root=OFF",
            "--spring.autoconfigure.exclude=org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration"));
        a.addAll(List.of(more));
        return app.run(a.toArray(new String[0]));
    }
    static String base(ConfigurableApplicationContext ctx) { return "http://127.0.0.1:" + ctx.getEnvironment().getProperty("local.server.port"); }

    // JSON 본문의 맨 바깥 키 이름을 나온 순서대로 뽑는다 (값 안의 따옴표에 속지 않도록 문자열을 건너뛰며 읽는다)
    static List<String> keys(String json) {
        List<String> ks = new ArrayList<>(); int depth = 0;
        for (int i = 0; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (ch == '"') {
                int j = i + 1; StringBuilder sb = new StringBuilder();
                while (json.charAt(j) != '"') { if (json.charAt(j) == '\\') j++; sb.append(json.charAt(j)); j++; }
                int k = j + 1; while (k < json.length() && Character.isWhitespace(json.charAt(k))) k++;
                if (depth == 1 && k < json.length() && json.charAt(k) == ':') ks.add(sb.toString());
                i = j;
            } else if (ch == '{' || ch == '[') depth++; else if (ch == '}' || ch == ']') depth--;
        }
        return ks;
    }
    // 본문에 무엇이 보이는가: SQL 문장, 스택 트레이스의 줄(클래스.메서드(파일:줄 번호)), DB 제품의 이름
    static String facts(String body) {
        boolean frames = Pattern.compile("at [\\w.$]+\\([\\w.$]+\\.java:\\d+\\)").matcher(body).find();
        return "sql=" + body.contains("pirce from orders") + "|frames=" + frames + "|db=" + (body.contains("org.h2") || body.contains("H2 ")) + "|class=" + body.contains("BadSqlGrammarException");
    }
    // JSON 본문에서 "이름":"값"의 값을 (이스케이프를 풀지 않은 채) 꺼낸다
    static String jsonString(String json, String name) {
        int i = json.indexOf("\"" + name + "\":\""); if (i < 0) return "";
        int from = i + name.length() + 4, j = from;
        while (json.charAt(j) != '"') { if (json.charAt(j) == '\\') j++; j++; }
        return json.substring(from, j);
    }
    static HttpResponse<String> get(HttpClient client, String url, String accept) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create(url)).header("Accept", accept).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    static HttpResponse<String> login(HttpClient client, String url, String id, String pw) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create(url)).header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString("id=" + id + "&pw=" + pw)).build(), HttpResponse.BodyHandlers.ofString());
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring security " + SpringSecurityCoreVersion.getVersion());
        HttpClient client = HttpClient.newHttpClient();
        // boot: 스프링 부트의 기본 오류 응답
        for (String msg : new String[] { "never", "always" })
            for (String trace : new String[] { "never", "on_param", "always" })
                try (ConfigurableApplicationContext ctx = start("--spring.web.error.include-message=" + msg, "--spring.web.error.include-stacktrace=" + trace)) {
                    for (boolean q : new boolean[] { false, true }) {
                        HttpResponse<String> r = get(client, base(ctx) + "/orders/7" + (q ? "?trace=true" : ""), "application/json");
                        out.add("boot|" + msg + "|" + trace + "|" + q + " => status=" + r.statusCode() + "|keys=" + String.join(",", keys(r.body())) + "|" + facts(r.body()));
                        if (msg.equals("always") && trace.equals("always") && !q) {
                            out.add("# 이 PC에서 본 message의 예: " + jsonString(r.body(), "message"));
                            String tr = jsonString(r.body(), "trace");
                            if (!tr.isEmpty()) {
                                // JSON 문자열 안의 줄바꿈(\r\n)과 탭(\t) 표기를 풀어 줄 단위로 나눈다
                                String[] tl = tr.replace("\\r", "").replace("\\t", "").split("\\\\n");
                                out.add("# 이 PC에서 본 trace의 예 (모두 " + tl.length + "줄): 첫 줄 [" + tl[0] + "]");
                                for (String x : tl) if (x.contains("InfoLeakProbe")) { out.add("#   내 코드가 보이는 줄 [" + x + "]"); break; }
                                for (String x : tl) if (x.startsWith("Caused by")) { out.add("#   DB 드라이버의 예외가 보이는 줄 [" + x.replace("\\\"", "\"") + "]"); break; }
                            }
                            HttpResponse<String> h = get(client, base(ctx) + "/orders/7", "text/html");
                            out.add("html|always|always => status=" + h.statusCode() + "|type=" + h.headers().firstValue("Content-Type").orElse("-").replaceAll(";.*", "") + "|" + facts(h.body()));
                        }
                    }
                }
        // 설정을 하나도 주지 않았을 때(기본값)와, 스프링 부트 3까지 쓰던 이름(server.error.*)으로 주었을 때
        try (ConfigurableApplicationContext ctx = start()) {
            HttpResponse<String> r = get(client, base(ctx) + "/orders/7?trace=true", "application/json");
            out.add("defaults => status=" + r.statusCode() + "|keys=" + String.join(",", keys(r.body())) + "|" + facts(r.body()));
        }
        try (ConfigurableApplicationContext ctx = start("--server.error.include-message=always", "--server.error.include-stacktrace=always")) {
            HttpResponse<String> r = get(client, base(ctx) + "/orders/7", "application/json");
            out.add("oldname => status=" + r.statusCode() + "|keys=" + String.join(",", keys(r.body())) + "|" + facts(r.body()));
        }
        // handler: @ExceptionHandler가 직접 만든 응답
        for (String advice : new String[] { "raw", "safe" })
            try (ConfigurableApplicationContext ctx = start("--lab.advice=" + advice, "--logging.level.SafeAdvice=ERROR")) {
                // 로그에 무엇이 남는지 보려고 SafeAdvice의 로거에 기록을 모으는 장치를 단다 (콘솔로는 내보내지 않는다)
                ch.qos.logback.classic.Logger lg = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(SafeAdvice.class);
                ListAppender<ILoggingEvent> logs = new ListAppender<>(); logs.start(); lg.addAppender(logs); lg.setAdditive(false);
                HttpResponse<String> r = get(client, base(ctx) + "/orders/7?trace=true", "application/json");
                String id = ""; Matcher m = Pattern.compile("\"errorId\":\"([^\"]+)\"").matcher(r.body()); if (m.find()) id = m.group(1);
                final String fid = id;
                boolean logged = logs.list.stream().anyMatch(e -> !fid.isEmpty() && e.getFormattedMessage().contains(fid) && e.getThrowableProxy() != null && e.getThrowableProxy().getMessage().contains("pirce from orders"));
                out.add("handler|" + advice + " => status=" + r.statusCode() + "|keys=" + String.join(",", keys(r.body())) + "|" + facts(r.body()) + "|loggedWithSql=" + logged);
                lg.detachAppender(logs);
            }
        // login: 가입하지 않은 아이디(ghost)와 가입한 아이디(kim)의 틀린 비밀번호
        for (String lg : new String[] { "split", "sec", "unhide" })
            try (ConfigurableApplicationContext ctx = start("--lab.lg=" + lg)) {
                String url = base(ctx) + "/login/" + (lg.equals("split") ? "split" : "sec");
                lastAuthException = "-"; matchCalls.set(0); HttpResponse<String> none = login(client, url, "ghost", "wrong-password"); String exNone = lastAuthException; int mNone = matchCalls.get();
                lastAuthException = "-"; matchCalls.set(0); HttpResponse<String> exist = login(client, url, "kim", "wrong-password"); String exExist = lastAuthException; int mExist = matchCalls.get();
                HttpResponse<String> ok = login(client, url, "kim", "right-password");
                boolean same = none.statusCode() == exist.statusCode() && none.body().equals(exist.body());
                out.add("login|" + lg + "|none => status=" + none.statusCode() + "|exception=" + exNone + "|sameAsOther=" + same + "|matches=" + mNone);
                out.add("login|" + lg + "|exist => status=" + exist.statusCode() + "|exception=" + exExist + "|sameAsOther=" + same + "|matches=" + mExist);
                out.add("# " + lg + ": 이 PC에서 본 글귀: 없는 아이디 [" + none.body() + "] / 틀린 비밀번호 [" + exist.body() + "] / 맞는 비밀번호의 상태 코드 " + ok.statusCode());
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

// 켜고 끌 수 있도록 설정 클래스 밖에 둔다
@RestControllerAdvice
class RawAdvice {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handle(Exception e) {
        return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));   // 예외의 메시지를 그대로 내보낸다
    }
}

@RestControllerAdvice
class SafeAdvice {
    private static final Logger log = LoggerFactory.getLogger(SafeAdvice.class);
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handle(Exception e) {
        String errorId = UUID.randomUUID().toString().substring(0, 8);
        log.error("errorId={}", errorId, e);                                         // 자세한 내용은 서버의 로그에만 남긴다
        return ResponseEntity.status(500).body(Map.of("message", "요청을 처리하지 못했습니다.", "errorId", errorId));
    }
}
