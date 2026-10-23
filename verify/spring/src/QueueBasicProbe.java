import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.io.StringWriter;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.SpringVersion;

// 기초개념 "메시지 큐" 실습에서 큐를 지우고 직접 부르는 두 조합(direct-up, direct-late)을 실제 스프링 부트로 실행한다.
// 화면에 보이는 글(verify/out/queue_basic_std/<조합>/screen.txt, queue_basic_probe_src.js가 만든다)에 package와 import 줄만 붙여
// 임시 폴더에서 javac로 컴파일한다("localhost:8081"의 8081만 실제 빈 포트로 바꾼다).
//  - 알림 서버: 화면의 Notifier(@RestController, @PostMapping("/notify"))를 스프링 부트 4(내장 톰캣)로 띄운다. 컴포넌트 스캔 대신 Notifier를 소스로 준다.
//    보안·JPA·JDBC 자동 설정이 끼지 않게, 실행할 때의 클래스패스에서 그 jar들은 뺀다(run.cp).
//  - 주문 서버: 화면의 OrderService(@Service, RestClient.create())를 AnnotationConfigApplicationContext에 등록하고, 그 빈의 order(1), order(2), order(3)을 차례로 부른다.
//  - direct-up: 알림 서버를 먼저 띄운 뒤 주문 3건. direct-late: 아무도 듣지 않는 포트로 주문 3건을 보낸 뒤 같은 포트에 알림 서버를 띄우고 1초를 지켜본다.
// 적는 것: 주문마다 결과(성공 / 던진 예외 클래스와 원인 클래스), 걸린 ms, 그리고 사건 순서 기록(주문 시작·끝, Notifier가 System.out에 찍은 줄).
// 사용: java -cp "verify/spring/out/queue_basic;<run.cp>" QueueBasicProbe <저장소 루트>   (cmp_queue_basic.js가 컴파일과 실행을 맡는다)
// 결과: verify/spring/queue_basic_probe.out.txt
public class QueueBasicProbe {
    static final String CP = System.getProperty("java.class.path");
    static final List<String> log = Collections.synchronizedList(new ArrayList<>());
    static volatile long T0;

    @SpringBootConfiguration
    @EnableAutoConfiguration
    static class NotifyBoot { }

    static void mark(String kind, String v) { log.add(kind + "\u0001" + v + "\u0001" + (System.nanoTime() - T0) / 1_000_000); }

    // System.out에 찍힌 줄을 사건 기록에 넣는다(Notifier가 찍는 "… 보냄")
    static class LineTap extends OutputStream {
        final ByteArrayOutputStream cur = new ByteArrayOutputStream();
        @Override public synchronized void write(int b) {
            if (b == '\n') { String s = cur.toString(StandardCharsets.UTF_8).replace("\r", ""); cur.reset(); if (!s.isBlank()) mark("찍힌 줄", s); }
            else cur.write(b);
        }
    }

    static int closedPort() throws Exception {
        ServerSocket t = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1")); int p = t.getLocalPort(); t.close(); return p;
    }

    static final String HEAD = String.join("\n",
        "package app;", "",
        "import org.springframework.context.annotation.Bean;",
        "import org.springframework.context.annotation.Configuration;",
        "import org.springframework.stereotype.Component;",
        "import org.springframework.stereotype.Service;",
        "import org.springframework.beans.factory.annotation.Autowired;",
        "import org.springframework.web.bind.annotation.PostMapping;",
        "import org.springframework.web.bind.annotation.RequestBody;",
        "import org.springframework.web.bind.annotation.RestController;",
        "import org.springframework.web.client.RestClient;", "", "");

    static ClassLoader compile(String src, Path dir) throws Exception {
        Path f = dir.resolve("app").resolve("Screen.java");
        Files.createDirectories(f.getParent());
        Files.writeString(f, src, StandardCharsets.UTF_8);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        StringWriter err = new StringWriter();
        int rc = javac.run(null, null, new PrintStream(new ByteArrayOutputStream() {
            @Override public synchronized void write(byte[] b, int o, int l) { err.write(new String(b, o, l, StandardCharsets.UTF_8)); }
        }, true, StandardCharsets.UTF_8), "-encoding", "UTF-8", "-parameters", "-proc:none", "-cp", CP, "-d", dir.resolve("classes").toString(), f.toString());
        if (rc != 0) throw new IllegalStateException("컴파일 실패: " + err);
        return new URLClassLoader(new URL[]{dir.resolve("classes").toUri().toURL()}, QueueBasicProbe.class.getClassLoader());
    }

    static ConfigurableApplicationContext startNotify(Class<?> notifier, int port) {
        SpringApplication app = new SpringApplication(NotifyBoot.class, notifier);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        return app.run("--server.port=" + port, "--server.address=127.0.0.1", "--logging.level.root=OFF");
    }

    static String esc(String s) { return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n"); }

    public static void main(String[] args) throws Exception {
        Path root = Path.of(args.length > 0 ? args[0] : ".");
        Path std = root.resolve("verify/out/queue_basic_std");
        Path work = Files.createTempDirectory("queue_basic_probe");
        PrintStream realOut = System.out;
        List<String> lines = new ArrayList<>();
        lines.add("# spring boot " + SpringBootVersion.getVersion() + " | spring framework " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version") + " | " + System.getProperty("os.name")
            + " | 127.0.0.1 안에서만 | 형식: 보내는 방식|알림 서버 상태 => JSON (results: 주문마다 결과, log: [사건, 값, ms])");
        System.setOut(new PrintStream(new LineTap(), true, StandardCharsets.UTF_8));
        try {
            for (String key : Files.readAllLines(std.resolve("keys.txt"))) {
                if (!key.startsWith("direct-")) continue;
                boolean late = key.endsWith("-late");
                String screen = Files.readString(std.resolve(key).resolve("screen.txt"), StandardCharsets.UTF_8);
                int port = closedPort();
                if (!screen.contains("localhost:8081")) throw new IllegalStateException("화면에 localhost:8081이 없음");
                ClassLoader cl = compile(HEAD + screen.replace("localhost:8081", "localhost:" + port) + "\n", work.resolve(key));
                Class<?> orderService = cl.loadClass("app.OrderService"), notifier = cl.loadClass("app.Notifier");
                log.clear(); T0 = System.nanoTime();
                ConfigurableApplicationContext notify = null;
                if (!late) { notify = startNotify(notifier, port); mark("알림 서버 켜짐", String.valueOf(port)); }
                List<String> results = new ArrayList<>();
                try (AnnotationConfigApplicationContext orderCtx = new AnnotationConfigApplicationContext(orderService)) {
                    Object bean = orderCtx.getBean(orderService);
                    Method order = orderService.getDeclaredMethod("order", int.class); order.setAccessible(true);
                    for (int no = 1; no <= 3; no++) {
                        mark("주문 시작", String.valueOf(no));
                        long t = System.nanoTime(); String r;
                        try { order.invoke(bean, no); r = "{\"no\":" + no + ",\"ok\":true"; }
                        catch (InvocationTargetException e) {
                            Throwable x = e.getCause();
                            r = "{\"no\":" + no + ",\"ok\":false,\"ex\":\"" + x.getClass().getName() + "\",\"cause\":\"" + (x.getCause() == null ? "-" : x.getCause().getClass().getName()) + "\",\"msg\":\"" + esc(String.valueOf(x.getMessage())) + "\"";
                        }
                        long ms = (System.nanoTime() - t) / 1_000_000;
                        mark("주문 끝", no + (r.contains("\"ok\":true") ? " 성공" : " 실패"));
                        results.add(r + ",\"ms\":" + ms + "}");
                    }
                    mark("주문 빈 클래스", bean.getClass().getName());
                }
                if (late) { Thread.sleep(100); notify = startNotify(notifier, port); mark("알림 서버 켜짐", String.valueOf(port)); }
                Thread.sleep(1000);
                mark("지켜보기 끝", "1000");
                if (notify != null) notify.close();
                List<String> lg = new ArrayList<>();
                synchronized (log) { for (String e : log) { String[] p = e.split("\u0001"); lg.add("[\"" + esc(p[0]) + "\",\"" + esc(p[1]) + "\"," + p[2] + "]"); } }
                lines.add(key.replace('-', '|') + " => {\"text\":\"" + esc(screen) + "\",\"results\":[" + String.join(",", results) + "],\"log\":[" + String.join(",", lg) + "]}");
                realOut.println(key + " " + results);
            }
        } finally { System.setOut(realOut); }
        Files.write(root.resolve("verify/spring/queue_basic_probe.out.txt"), lines, StandardCharsets.UTF_8);
        realOut.println("썼음: verify/spring/queue_basic_probe.out.txt");
        System.exit(0);
    }
}
