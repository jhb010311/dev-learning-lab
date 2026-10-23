import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

// "세션과 토큰" 실습(auth)의 세션 코드에서 바꾼 한 줄을 실제 스프링 부트 서버로 확인한다.
//   화면 코드: HttpSession session = request.getSession(false);
//              if (session == null) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
// 확인하는 것: ResponseStatusException은 spring-web이 주는 예외이고, 컨트롤러에서 던지면 응답이 401이 된다.
//              로그인(request.getSession()) 뒤 JSESSIONID 쿠키를 보내면 같은 줄을 지나 200이 된다.
// 실행: javac -cp "libs/*" AuthProbe.java, java -cp "libs/*;." AuthProbe (내장 톰캣, 포트 0)
public class AuthProbe {
    record Member(String getId) {}

    @RestController
    public static class Ctl {
        @PostMapping("/login")
        public String login(HttpServletRequest request) {
            Member member = new Member("7");
            // 로그인 성공 시 (화면 코드와 같은 줄)
            HttpSession session = request.getSession();
            session.setAttribute("memberId", member.getId());
            return "로그인";
        }

        @GetMapping("/me")
        public String me(HttpServletRequest request) {
            // 이후 요청마다 (화면 코드와 같은 줄)
            HttpSession session = request.getSession(false);
            if (session == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            }
            return "회원 " + session.getAttribute("memberId");
        }
    }

    @Configuration
    @EnableAutoConfiguration
    @Import(Ctl.class)
    public static class App {}

    public static void main(String[] args) throws Exception {
        ConfigurableApplicationContext ctx = SpringApplication.run(App.class, "--server.port=0", "--logging.level.root=WARN", "--spring.main.banner-mode=off",
                // 클래스패스에 함께 있는 스프링 시큐리티와 JPA는 이 확인과 관계없으므로 끈다(켜 두면 시큐리티가 모든 요청을 먼저 401로 막는다)
                "--spring.autoconfigure.exclude="
                        + "org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration,"
                        + "org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration,"
                        + "org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration,"
                        + "org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration,"
                        + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                        + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                        + "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration");
        int port = ((WebServerApplicationContext) ctx).getWebServer().getPort();
        HttpClient http = HttpClient.newHttpClient();
        String base = "http://127.0.0.1:" + port;
        System.out.println("# spring boot " + SpringBootVersion.getVersion() + " | java " + System.getProperty("java.version"));
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        System.out.println("exception class => " + ex.getClass().getName() + " | statusCode=" + ex.getStatusCode().value() + " | jar=" + ResponseStatusException.class.getProtectionDomain().getCodeSource().getLocation().getPath().replaceAll(".*/", ""));

        HttpResponse<String> r1 = http.send(HttpRequest.newBuilder(URI.create(base + "/me")).GET().build(), HttpResponse.BodyHandlers.ofString());
        System.out.println("no cookie GET /me => status=" + r1.statusCode());

        HttpResponse<String> r2 = http.send(HttpRequest.newBuilder(URI.create(base + "/login")).POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        String setCookie = r2.headers().firstValue("Set-Cookie").orElse("-");
        System.out.println("POST /login => status=" + r2.statusCode() + " | Set-Cookie=" + setCookie.replaceAll("JSESSIONID=[0-9A-F]+", "JSESSIONID=…"));

        String cookie = setCookie.split(";")[0];
        HttpResponse<String> r3 = http.send(HttpRequest.newBuilder(URI.create(base + "/me")).header("Cookie", cookie).GET().build(), HttpResponse.BodyHandlers.ofString());
        System.out.println("with cookie GET /me => status=" + r3.statusCode() + " | body=" + r3.body());

        HttpResponse<String> r4 = http.send(HttpRequest.newBuilder(URI.create(base + "/me")).header("Cookie", "JSESSIONID=ABC123").GET().build(), HttpResponse.BodyHandlers.ofString());
        System.out.println("unknown session id GET /me => status=" + r4.statusCode());
        ctx.close();
    }
}
