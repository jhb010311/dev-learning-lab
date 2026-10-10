import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.stereotype.Component;

// "설정 우선순위" 실습의 32가지 조합을 실제 스프링 부트로 확인한다.
// 환경 변수와 JVM 옵션은 프로세스가 뜰 때 정해지므로, 조합마다 자바 프로세스를 새로 띄운다.
// 자식 프로세스는 @Value("${app.timeout:1000}")에 들어온 값과, 그 값을 준 프로퍼티 소스의 이름을 출력한다.
public class ConfigProbe {
    @Component
    public static class Holder {
        @Value("${app.timeout:1000}") String timeout;
    }

    // 자식: 스프링 부트를 띄워 값을 출력한다
    public static class Child {
        public static void main(String[] args) {
            SpringApplication app = new SpringApplication(Holder.class);
            app.setWebApplicationType(WebApplicationType.NONE); app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            try (ConfigurableApplicationContext ctx = app.run(args)) {
                String from = "코드의 기본값";
                for (PropertySource<?> ps : ctx.getEnvironment().getPropertySources()) {
                    if (ps.getName().equals("configurationProperties")) continue;   // 다른 소스들을 감싼 보기용 소스
                    if (ps.containsProperty("app.timeout") || (ps instanceof EnumerablePropertySource<?> e && ps.getName().equals("systemEnvironment") && e.containsProperty("APP_TIMEOUT"))) { from = ps.getName(); break; }
                }
                System.out.println("RESULT " + ctx.getBean(Holder.class).timeout + "|" + from);
            }
        }
    }

    public static void main(String[] args) throws Exception {
        Path base = Files.createTempDirectory("lab-config");
        // 설정 파일이 있는 폴더 네 가지: 기본 파일 유무 × prod 파일 유무
        for (int i = 0; i < 4; i++) {
            Path d = Files.createDirectories(base.resolve("c" + i));
            if ((i & 1) != 0) Files.writeString(d.resolve("application.yml"), "app:\n  timeout: 3000\n");
            if ((i & 2) != 0) Files.writeString(d.resolve("application-prod.yml"), "app:\n  timeout: 5000\n");
        }
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion());
        for (int m = 0; m < 32; m++) {
            boolean yml = (m & 1) != 0, prof = (m & 2) != 0, env = (m & 4) != 0, sys = (m & 8) != 0, cli = (m & 16) != 0;
            List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8"));
            if (sys) cmd.add("-Dapp.timeout=8000");
            cmd.addAll(List.of("-cp", cp, "ConfigProbe$Child", "--logging.level.root=OFF"));
            cmd.add("--spring.config.location=optional:file:" + base.resolve("c" + ((yml ? 1 : 0) + (prof ? 2 : 0))).toString().replace(File.separatorChar, '/') + "/");
            if (prof) cmd.add("--spring.profiles.active=prod");
            if (cli) cmd.add("--app.timeout=9000");
            ProcessBuilder pb = new ProcessBuilder(cmd).redirectErrorStream(true);
            pb.environment().remove("APP_TIMEOUT");
            if (env) pb.environment().put("APP_TIMEOUT", "7000");
            Process p = pb.start();
            String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
            String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 400 ? all.substring(0, 400) : all).replace('\n', ' ').replace('\r', ' '));
            out.add(yml + "|" + prof + "|" + env + "|" + sys + "|" + cli + " => " + res.substring(7));
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
