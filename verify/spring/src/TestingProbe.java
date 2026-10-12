import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.SpringBootVersion;
import org.springframework.core.SpringVersion;

// "테스트" 실습의 서른여섯 가지 조합을 실제 JUnit + 스프링 테스트로 확인한다.
// 테스트 방식(스프링 없는 단위 테스트, @SpringBootTest, @WebMvcTest) × 가짜 객체 네 가지 × 두 번째 테스트 클래스 네 가지.
// 단위 테스트는 컨텍스트가 없어 "두 번째 클래스" 설정이 뜻이 없으므로 same 하나만 실행한다(4 + 16 + 16 = 36).
// 스프링의 테스트 컨텍스트 캐시는 JVM 안의 정적 상태이므로, 조합마다 자바 프로세스를 새로 띄워 labtesting.TestingRun을 실행한다.
// 테스트 대상과 테스트 클래스: TestingApp.java, TestingCases.java (패키지 labtesting). Gradle이나 Maven 없이 JUnit Platform Launcher로 실행한다.
//
// 컴파일: javac -encoding UTF-8 -parameters -proc:none -cp "<libs>/*;<libs-extra>/*" -d verify/out/testing verify/spring/src/Testing*.java
//         (-proc:none: 클래스패스의 querydsl-apt 같은 애너테이션 처리기가 돌지 않게 한다. JUnit의 @API 때문에 "unknown enum constant Status" 경고가 나오지만 무시해도 된다)
// 실행:   java -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -cp "<libs>/*;<libs-extra>/*;verify/out/testing" TestingProbe verify/spring/testing_probe.out.txt
public class TestingProbe {
    // 매니페스트에 버전이 없으면 jar 파일 이름으로 대신한다
    static String ver(Class<?> c) {
        String v = c.getPackage().getImplementationVersion();
        if (v != null) return v;
        try { return Path.of(c.getProtectionDomain().getCodeSource().getLocation().toURI()).getFileName().toString(); } catch (Exception e) { return "?"; }
    }

    public static void main(String[] args) throws Exception {
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring framework " + SpringVersion.getVersion()
            + " | junit jupiter " + ver(org.junit.jupiter.api.Test.class) + " | junit platform launcher " + ver(org.junit.platform.launcher.Launcher.class)
            + " | mockito " + ver(org.mockito.Mockito.class) + " | java " + System.getProperty("java.version"));
        out.add("# 형식: 방식|가짜 객체|두 번째 클래스 => 첫 번째 결과|첫 번째의 컨트롤러 · 서비스 · 리포지토리|두 번째 결과|컨텍스트 만들기를 시작한 횟수|두 번째의 컨트롤러 · 서비스 · 리포지토리|기동 성공 횟수|두 클래스가 받은 컨텍스트|실행 순서|캐시 통계|첫 번째의 빈 정의 수, 걸린 시간, 예외|두 번째의 같은 것");
        for (String kind : new String[] { "unit", "boot", "webmvc" })
            for (String mock : new String[] { "none", "svc", "bare", "repo" })
                for (String next : kind.equals("unit") ? new String[] { "same" } : new String[] { "same", "mock", "profile", "dirty" }) {
                    // 스프링 로그와 배너는 끈다(결과에는 영향이 없다). Mockito가 JDK 21에서 스스로 에이전트를 붙이며 내는 경고는 그대로 둔다.
                    List<String> cmd = List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dlogging.level.root=OFF", "-Dspring.main.banner-mode=off",
                        "-cp", cp, "labtesting.TestingRun", kind, mock, next);
                    Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
                    String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                    p.waitFor();
                    String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst()
                        .orElse("RESULT ?|" + (all.length() > 600 ? all.substring(all.length() - 600) : all).replace('\n', ' ').replace('\r', ' ').replace('|', '/'));
                    String line = kind + "|" + mock + "|" + next + " => " + res.substring(7);
                    out.add(line);
                    System.out.println(line);
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.size() - 2 + " combos");
    }
}
