import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.io.StringWriter;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.core.SpringVersion;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

// 기초개념 "다른 서버 부르기" 실습을 실제 스프링 RestClient(spring-web)로 확인한다.
// 조합마다 화면에 보이는 것과 같은 글(verify/out/remote_basic_std/<조합>/screen.txt, remote_basic_probe_src.js가 만든다)을
// 임시 폴더에 OrderApp.java로 써서 javac로 컴파일하고(다른 서버를 부르는 코드는 "localhost:9000"의 9000만 실제 빈 포트로 바꾼다),
// 이 프로세스 안에서 새 클래스 로더로 OrderApp.main을 부른다. main이 System.out에 찍은 줄과 걸린 시간을 잰다.
// 결제 서버 역할: 이 프로그램이 ServerSocket으로 띄우는 작은 HTTP 서버(127.0.0.1의 빈 포트).
//   ok = 요청을 받고 0.1초 뒤 200 "결제 완료" / slow = 3초 뒤 200 "결제 완료" / down = 포트를 열었다가 닫아 아무도 듣지 않는 포트를 만든다.
//   요청 줄을 적고, 지연이 끝난 때(=결제 처리를 끝낸 때)와 그때 상대(주문 쪽)가 연결을 이미 닫았는지를 적은 뒤 답을 쓴다(연결이 닫혔는지 보지 않고 처리를 끝낸다).
// 같은 프로그램의 PayService를 부르는 코드(local)는 결제 서버 없이 그대로 실행한다.
// 화면에 없는 사실(# 근거): RestClient.create()가 고른 요청 팩토리, 요청을 받고 끝내 답하지 않는 서버를
//   RestClient.create()로 부를 때 4초 뒤에도 기다리는지, 타임아웃 1초를 정한 RestClient로 부를 때 언제 무엇으로 끝나는지,
//   catch에 잡힌 예외의 정확한 클래스(화면 코드와 같은 호출을 이 프로그램에서 한 번 더 해서 본다).
// 사용: javac -cp "libs/*" -d out RemoteBasicProbe.java && java -cp "out;libs/*" RemoteBasicProbe <저장소 루트>
//       결과는 verify/spring/remote_basic_probe.out.txt
public class RemoteBasicProbe {
    static final String CP = System.getProperty("java.class.path");

    // 결제 서버 역할을 하는 아주 작은 HTTP 서버. 연결 하나만 받는다.
    static class PayServer extends Thread {
        final ServerSocket ss; final long delay; // delay < 0: 요청을 받고도 답하지 않는다
        volatile String saw = "(없음)"; volatile long doneAt = -1; volatile String peerClosed = "-"; volatile long t0;
        volatile Socket sock; volatile String bodyHow = "-";
        PayServer(long delay) throws Exception { this.delay = delay; ss = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1")); setDaemon(true); }
        int port() { return ss.getLocalPort(); }
        public void run() {
            try (Socket s = ss.accept()) {
                sock = s;
                InputStream in = s.getInputStream();
                String head = readHead(in);
                saw = head.split("\r\n")[0];
                int len = 0; boolean chunked = false;
                for (String h : head.split("\r\n")) {
                    String low = h.toLowerCase(Locale.ROOT);
                    if (low.startsWith("content-length:")) len = Integer.parseInt(h.substring(15).trim());
                    if (low.startsWith("transfer-encoding:") && low.contains("chunked")) chunked = true;
                }
                bodyHow = chunked ? "chunked" : "content-length=" + len;
                if (chunked) readHead(in); // 본문 없는 POST: 마지막 조각 "0\r\n\r\n"까지 읽는다
                else for (int i = 0; i < len; i++) in.read();
                if (delay < 0) { while (in.read() >= 0) { } return; }
                Thread.sleep(delay);
                doneAt = (System.nanoTime() - t0) / 1_000_000;
                s.setSoTimeout(50);
                try { int r = in.read(); peerClosed = r < 0 ? "true" : "false(데이터)"; }
                catch (SocketTimeoutException e) { peerClosed = "false"; }
                catch (Exception e) { peerClosed = "true(" + e.getClass().getSimpleName() + ")"; }
                byte[] body = "결제 완료".getBytes(StandardCharsets.UTF_8);
                OutputStream out = s.getOutputStream();
                try {
                    out.write(("HTTP/1.1 200 OK\r\nContent-Type: text/plain;charset=UTF-8\r\nContent-Length: " + body.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                    out.write(body); out.flush();
                } catch (Exception e) { }
            } catch (Exception e) {
            } finally { try { ss.close(); } catch (Exception e) { } }
        }
        static String readHead(InputStream in) throws Exception {
            ByteArrayOutputStream b = new ByteArrayOutputStream(); int c, n = 0;
            while ((c = in.read()) >= 0) { b.write(c); n = (c == '\r' || c == '\n') ? n + 1 : 0; if (n == 4) break; }
            return b.toString(StandardCharsets.US_ASCII);
        }
    }

    static int closedPort() throws Exception {
        ServerSocket t = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1")); int p = t.getLocalPort(); t.close(); return p;
    }

    static Class<?> compile(String src, Path dir) throws Exception {
        Files.createDirectories(dir);
        Path f = dir.resolve("OrderApp.java");
        Files.writeString(f, src, StandardCharsets.UTF_8);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        StringWriter err = new StringWriter();
        int rc = javac.run(null, null, new PrintStream(new ByteArrayOutputStream() {
            @Override public synchronized void write(byte[] b, int o, int l) { err.write(new String(b, o, l, StandardCharsets.UTF_8)); }
        }, true, StandardCharsets.UTF_8), "-encoding", "UTF-8", "-cp", CP, "-d", dir.toString(), f.toString());
        if (rc != 0) throw new IllegalStateException("컴파일 실패: " + err);
        URLClassLoader cl = new URLClassLoader(new URL[]{dir.toUri().toURL()}, RemoteBasicProbe.class.getClassLoader());
        return cl.loadClass("OrderApp");
    }

    static String esc(String s) { return s.replace("\\", "\\\\").replace("\r", "").replace("\n", "\\n").replace("|", "\\p"); }

    public static void main(String[] args) throws Exception {
        Path root = Path.of(args.length > 0 ? args[0] : ".");
        Path std = root.resolve("verify/out/remote_basic_std");
        Path work = Files.createTempDirectory("remote_basic_probe");
        PrintStream realOut = System.out;
        List<String> lines = new ArrayList<>();
        StringBuilder lh = new StringBuilder();
        for (InetAddress a : InetAddress.getAllByName("localhost")) lh.append(lh.length() > 0 ? "," : "").append(a.getHostAddress());
        lines.add("# spring framework " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version") + " | " + System.getProperty("os.name") + " | localhost=" + lh);

        // 덥히기: 처음 쓰는 클래스를 미리 읽어 두어, 걸린 시간에 클래스 읽는 시간이 섞이지 않게 한다
        for (int i = 0; i < 3; i++) {
            PayServer w1 = new PayServer(0); w1.start();
            SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory(); f.setConnectTimeout(Duration.ofSeconds(1)); f.setReadTimeout(Duration.ofSeconds(1));
            RestClient.builder().requestFactory(f).build().post().uri("http://localhost:" + w1.port() + "/pay").retrieve().body(String.class);
            PayServer w2 = new PayServer(0); w2.start();
            RestClient.create().post().uri("http://localhost:" + w2.port() + "/pay").retrieve().body(String.class);
            for (RestClient rc : new RestClient[]{RestClient.builder().requestFactory(f).build(), RestClient.create()}) {
                try { rc.post().uri("http://localhost:" + closedPort() + "/pay").retrieve().body(String.class); } catch (ResourceAccessException e) { }
            }
        }

        for (String key : Files.readAllLines(std.resolve("keys.txt"))) {
            if (key.isBlank()) continue;
            String[] k = key.split("-");
            String where = k[0], pay = k[1];
            String screen = Files.readString(std.resolve(key).resolve("screen.txt"), StandardCharsets.UTF_8);
            PayServer srv = null; int port = -1;
            if (where.equals("remote")) {
                if (pay.equals("down")) port = closedPort();
                else { srv = new PayServer(pay.equals("ok") ? 100 : 3000); srv.start(); port = srv.port(); }
            }
            String src = port < 0 ? screen : screen.replace("localhost:9000", "localhost:" + port);
            Class<?> app = compile(src, work.resolve(key));
            Method m = app.getMethod("main", String[].class);
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            String uncaught = "-";
            long t0 = System.nanoTime();
            if (srv != null) srv.t0 = t0;
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try { m.invoke(null, (Object) new String[0]); }
            catch (InvocationTargetException e) { uncaught = String.valueOf(e.getCause()); }
            finally { System.setOut(realOut); }
            long ms = (System.nanoTime() - t0) / 1_000_000;
            if (srv != null) srv.join(5000);
            String out = buf.toString(StandardCharsets.UTF_8).trim().replace("\r", "").replace("\n", "~");
            lines.add(String.join("|", key.replace('-', '|') + " => out=" + out, "ms=" + ms,
                    "paySaw=" + (srv == null ? (pay.equals("down") && where.equals("remote") ? "(없음)" : "-") : srv.saw),
                    "payDoneMs=" + (srv == null ? -1 : srv.doneAt), "peerClosed=" + (srv == null ? "-" : srv.peerClosed), "reqBody=" + (srv == null ? "-" : srv.bodyHow),
                    "uncaught=" + uncaught, "src=" + esc(screen)));
            realOut.println(lines.get(lines.size() - 1).replaceAll("\\|src=.*", ""));
        }

        // # 근거 1: RestClient.create()가 고른 요청 팩토리
        RestClient def = RestClient.create();
        String factory = "?";
        for (Class<?> c = def.getClass(); c != null && factory.equals("?"); c = c.getSuperclass())
            for (Field fd : c.getDeclaredFields())
                if (fd.getName().equals("clientRequestFactory")) { fd.setAccessible(true); Object v = fd.get(def); factory = v == null ? "null" : v.getClass().getName(); }
        lines.add("# 근거 RestClient.create()의 요청 팩토리=" + factory);

        // # 근거 2: catch에 잡히는 예외의 정확한 클래스와 원인 (화면과 같은 호출)
        SimpleClientHttpRequestFactory f1 = new SimpleClientHttpRequestFactory(); f1.setConnectTimeout(Duration.ofSeconds(1)); f1.setReadTimeout(Duration.ofSeconds(1));
        String[][] cases = {{"timeout", "down"}, {"none", "down"}, {"timeout", "slow"}};
        for (String[] cs : cases) {
            RestClient rc = cs[0].equals("timeout") ? RestClient.builder().requestFactory(f1).build() : RestClient.create();
            PayServer s = cs[1].equals("slow") ? new PayServer(3000) : null; if (s != null) s.start();
            int p = s != null ? s.port() : closedPort();
            long t = System.nanoTime(); String r;
            try { rc.post().uri("http://localhost:" + p + "/pay").retrieve().body(String.class); r = "예외 없음"; }
            catch (RuntimeException e) { r = e.getClass().getName() + "|cause=" + e.getCause().getClass().getName() + "|causeMsg=" + e.getCause().getMessage() + "|msg=" + e.getMessage(); }
            lines.add("# 근거 예외 " + cs[0] + "/" + cs[1] + " => " + r + "|ms=" + (System.nanoTime() - t) / 1_000_000);
            if (s != null) s.join(5000);
        }

        // # 근거 3: 요청을 받고 끝내 답하지 않는 서버
        for (String mode : new String[]{"none", "timeout"}) {
            PayServer hang = new PayServer(-1); hang.start();
            RestClient rc = mode.equals("timeout") ? RestClient.builder().requestFactory(f1).build() : RestClient.create();
            final String[] res = {"아직 기다림"}; final long[] at = {-1};
            long t = System.nanoTime();
            Thread th = new Thread(() -> {
                try { rc.post().uri("http://localhost:" + hang.port() + "/pay").retrieve().body(String.class); res[0] = "답을 받음"; }
                catch (RuntimeException e) { res[0] = e.getClass().getSimpleName() + "(원인 " + (e.getCause() == null ? "-" : e.getCause().getClass().getSimpleName()) + ")"; }
                at[0] = (System.nanoTime() - t) / 1_000_000;
            });
            th.setDaemon(true); th.start(); th.join(4000);
            boolean alive = th.isAlive();
            lines.add("# 근거 답하지 않는 서버, " + (mode.equals("none") ? "RestClient.create()" : "타임아웃 1초") + " => 4초 뒤 아직 기다림=" + alive
                    + "|결과=" + res[0] + "|ms=" + at[0] + "|결제 서버가 요청을 받음=" + !hang.saw.equals("(없음)"));
            if (hang.sock != null) hang.sock.close();
            th.join(3000);
        }

        Files.write(root.resolve("verify/spring/remote_basic_probe.out.txt"), lines, StandardCharsets.UTF_8);
        realOut.println(String.join("\n", lines.subList(lines.size() - 6, lines.size())));
    }
}
