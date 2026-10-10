import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.SpringVersion;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

// "외부 API 호출과 타임아웃" 실습의 조합을 스프링의 RestClient로 실제 호출해 확인한다.
// 상대 서버(결제 서버)는 이 프로그램이 127.0.0.1에 띄운 스프링 부트 서버(내장 톰캣)다. 곧바로 응답하는 주소, 일부러 늦게 응답하는 주소,
// 404와 500으로 응답하는 주소를 둔다. "연결 거절"은 아무도 듣지 않는 127.0.0.1의 포트로, "연결 요청에 답이 없음"은 127.0.0.1로는 만들 수 없어
// 문서용으로 예약된 주소 192.0.2.1(RFC 5737, 어느 장비에도 배정되지 않음)로 확인한다. 이 주소는 두 번째 인자로 바꿀 수 있다.
// 화면의 시간(초)은 예시이고, 여기서는 100분의 1로 줄여 실행한다: 연결 타임아웃 2초 → 200ms, 읽기 타임아웃 3초 → 300ms, 느린 응답 10초 → 1000ms.
@SpringBootConfiguration
@EnableAutoConfiguration
public class RestClientProbe {
    static final int CONNECT_MS = 200, READ_MS = 300, SLOW_MS = 1000;
    static final AtomicInteger served = new AtomicInteger();

    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build(); }

    @RestController public static class PayController {
        @GetMapping("/ok/payments/1") public String ok() { served.incrementAndGet(); return "paid"; }
        @GetMapping("/slow/payments/1") public String slow() throws InterruptedException { Thread.sleep(SLOW_MS); served.incrementAndGet(); return "paid"; }
        @GetMapping("/e404/payments/1") public ResponseEntity<String> notFound() { served.incrementAndGet(); return ResponseEntity.status(404).body("no such payment"); }
        @GetMapping("/e500/payments/1") public ResponseEntity<String> error() { served.incrementAndGet(); return ResponseEntity.status(500).body("failed"); }
    }

    // 화면의 코드와 같은 구조: 요청 팩토리에 타임아웃을 정하고(또는 정하지 않고) RestClient로 GET 호출을 한다
    static String call(String url, boolean ct, boolean rt) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        if (ct) factory.setConnectTimeout(Duration.ofMillis(CONNECT_MS));
        if (rt) factory.setReadTimeout(Duration.ofMillis(READ_MS));
        RestClient client = RestClient.builder().requestFactory(factory).build();
        long t0 = System.nanoTime(); String res;
        try {
            String body = client.get().uri(url).retrieve().body(String.class);
            res = "returned=" + body + "|ex=-|exact=-|status=200|cause=-";
        } catch (HttpClientErrorException e) {
            res = "returned=-|ex=HttpClientErrorException|exact=" + e.getClass().getName().replace("org.springframework.web.client.", "") + "|status=" + e.getStatusCode().value() + "|cause=-";
        } catch (HttpServerErrorException e) {
            res = "returned=-|ex=HttpServerErrorException|exact=" + e.getClass().getName().replace("org.springframework.web.client.", "") + "|status=" + e.getStatusCode().value() + "|cause=-";
        } catch (ResourceAccessException e) {
            res = "returned=-|ex=ResourceAccessException|exact=ResourceAccessException|status=-|cause=" + (e.getCause() == null ? "-" : e.getCause().getClass().getSimpleName() + "(" + e.getCause().getMessage() + ")");
        }
        return res + "|ms=" + (System.nanoTime() - t0) / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        System.setProperty("http.keepAlive", "false");   // 호출마다 연결을 새로 맺게 한다(앞 호출의 연결을 다시 쓰면 연결 단계가 생략된다)
        String blackhole = args.length > 1 ? args[1] : "192.0.2.1";
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring framework " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version") + " | " + System.getProperty("os.name")
            + " | connect=" + CONNECT_MS + "ms read=" + READ_MS + "ms slow=" + SLOW_MS + "ms | no-answer host=" + blackhole);
        SpringApplication app = new SpringApplication(RestClientProbe.class);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--logging.level.root=OFF")) {
            String port = ctx.getEnvironment().getProperty("local.server.port");
            int closed; try (ServerSocket s = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"))) { closed = s.getLocalPort(); }   // 닫은 뒤에는 아무도 듣지 않는 포트
            for (int i = 0; i < 3; i++) call("http://127.0.0.1:" + port + "/ok/payments/1", true, true);   // 첫 호출의 준비 시간이 측정에 섞이지 않게 미리 호출
            for (String server : new String[] { "ok", "slow", "noanswer", "refused", "e404", "e500" })
                for (boolean ct : new boolean[] { false, true })
                    for (boolean rt : new boolean[] { false, true }) {
                        String url = server.equals("refused") ? "http://127.0.0.1:" + closed + "/payments/1" : server.equals("noanswer") ? "http://" + blackhole + "/payments/1" : "http://127.0.0.1:" + port + "/" + server + "/payments/1";
                        int before = served.get();
                        String res = call(url, ct, rt);
                        // 호출한 쪽이 타임아웃으로 포기한 뒤에도 서버가 그 요청을 끝까지 처리하는지 보려고 잠시 기다린다
                        for (int i = 0; i < 30 && served.get() == before && server.equals("slow"); i++) Thread.sleep(100);
                        out.add(server + "|" + ct + "|" + rt + " => " + res + "|served=" + (served.get() - before));
                        System.out.println(out.get(out.size() - 1));
                    }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}
