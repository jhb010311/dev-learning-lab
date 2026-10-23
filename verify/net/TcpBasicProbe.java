import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.tools.JavaCompiler;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

// 기초개념 "TCP 연결" 실습의 네 가지 조합(보내는 방식 TCP/UDP x 받는 쪽 프로그램이 9000번 포트에서 기다린다/아니다)을 실제로 실행한다.
// 받는 쪽 프로그램과 보내는 쪽 프로그램은 서로 다른 자바 프로세스다. 조합마다 화면에 보이는 것과 같은 글로 소스를 만들어 javax.tools로 컴파일하고,
// 이 JDK의 java로 각각 띄워 이 컴퓨터(localhost) 안에서 주고받는다. 외부 네트워크에는 연결하지 않는다. 끝나면 모든 프로세스를 끝낸다.
// 화면의 9000은 예시이며, 실제 실행에서는 실행마다 비어 있는 포트(TCP와 UDP 모두 비어 있는 번호)로 바꿔 쓴다.
// 화면에 없는 줄(받는 쪽이 준비됐음을 알리는 출력)은 줄 끝에 "// [Probe]"를 붙여 두었고, cmp가 견줄 때 뺀다.
// 조합마다 RUNS번 실행해 매번 같은 결과인지 본다.
// 출력 한 줄: proto|listen => 키=값|...
//   senderOut: 보내는 쪽의 표준 출력(줄은 " / "로 이음)   senderErr: 보내는 쪽 표준 오류 첫 줄   senderExit: 종료 코드
//   receiverOut: 받는 쪽의 표준 출력(Probe 줄 뺌)   receiverExit: 받는 쪽 종료 코드(끝나지 않았으면 waiting)
//   pre: 시작 전에 그 포트로 TCP 연결해 본 결과(아무도 열지 않았으면 refused)
public class TcpBasicProbe {
    static final String P = " // [Probe]";
    static final int RUNS = 5;

    // 화면의 코드(실습의 code 함수)와 같은 글. 9000은 실행할 때 실제 포트로 바뀐다.
    static final String TCP_RECEIVER = "// 받는 쪽 프로그램: 9000번 포트를 TCP로 열고 연결을 기다린다\n"
        + "ServerSocket server = new ServerSocket(9000);\n"
        + "System.out.println(\"READY\"); System.out.flush();" + P + "\n"
        + "Socket conn = server.accept();\n"
        + "String text = new String(conn.getInputStream().readAllBytes(), \"UTF-8\");\n"
        + "System.out.println(\"받은 글: \" + text);\n";
    static final String TCP_SENDER = "// 보내는 쪽 프로그램: localhost의 9000번 포트에 TCP로 연결한 뒤 보낸다\n"
        + "Socket socket = new Socket(\"localhost\", 9000);\n"
        + "OutputStream out = socket.getOutputStream();\n"
        + "out.write(\"A\".getBytes(\"UTF-8\"));\n"
        + "out.write(\"B\".getBytes(\"UTF-8\"));\n"
        + "out.write(\"C\".getBytes(\"UTF-8\"));\n"
        + "socket.close();\n"
        + "System.out.println(\"보내기 끝\");\n";
    static final String UDP_RECEIVER = "// 받는 쪽 프로그램: 9000번 포트를 UDP로 열고 글을 기다린다\n"
        + "DatagramSocket server = new DatagramSocket(9000);\n"
        + "System.out.println(\"READY\"); System.out.flush();" + P + "\n"
        + "for (int i = 0; i < 3; i++) {\n"
        + "    DatagramPacket packet = new DatagramPacket(new byte[100], 100);\n"
        + "    server.receive(packet);\n"
        + "    System.out.println(\"받은 글: \" + new String(packet.getData(), 0, packet.getLength(), \"UTF-8\"));\n"
        + "}\n";
    static final String UDP_SENDER = "// 보내는 쪽 프로그램: 연결하지 않고 localhost의 9000번 포트로 글을 하나씩 보낸다\n"
        + "DatagramSocket socket = new DatagramSocket();\n"
        + "InetSocketAddress to = new InetSocketAddress(\"localhost\", 9000);\n"
        + "socket.send(new DatagramPacket(\"A\".getBytes(\"UTF-8\"), 1, to));\n"
        + "socket.send(new DatagramPacket(\"B\".getBytes(\"UTF-8\"), 1, to));\n"
        + "socket.send(new DatagramPacket(\"C\".getBytes(\"UTF-8\"), 1, to));\n"
        + "socket.close();\n"
        + "System.out.println(\"보내기 끝\");\n";

    static String program(String cls, String body, int port) {
        StringBuilder s = new StringBuilder("import java.io.OutputStream;\nimport java.net.*;\n\npublic class " + cls
            + " {\n    public static void main(String[] args) throws Exception {\n");
        for (String line : body.split("\n")) s.append("        ").append(line).append("\n");
        s.append("    }\n}\n");
        return s.toString().replace("9000", String.valueOf(port));
    }

    static class Proc {
        Process p; Path out, err;
        String out() { try { return Files.readString(out, StandardCharsets.UTF_8); } catch (IOException e) { return ""; } }
        String err() { try { return Files.readString(err, StandardCharsets.UTF_8); } catch (IOException e) { return ""; } }
        boolean alive() { return p.isAlive(); }
    }

    static Proc start(Path dir, String java, String cls, int run) throws Exception {
        Proc r = new Proc();
        r.out = dir.resolve(cls + ".run" + run + ".stdout.txt"); r.err = dir.resolve(cls + ".run" + run + ".stderr.txt");
        ProcessBuilder pb = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), cls);
        pb.redirectOutput(r.out.toFile()); pb.redirectError(r.err.toFile());
        r.p = pb.start();
        return r;
    }

    static boolean waitMarker(Proc r, String marker, long ms) throws Exception {
        long end = System.currentTimeMillis() + ms;
        while (System.currentTimeMillis() < end) {
            if (r.out().contains(marker)) return true;
            if (!r.alive()) { Thread.sleep(100); return r.out().contains(marker); }
            Thread.sleep(30);
        }
        return r.out().contains(marker);
    }

    static boolean waitExit(Proc r, long ms) throws Exception {
        long end = System.currentTimeMillis() + ms;
        while (System.currentTimeMillis() < end) { if (!r.alive()) return true; Thread.sleep(30); }
        return !r.alive();
    }

    static String lines(String t, boolean dropProbe) {
        List<String> o = new ArrayList<>();
        for (String l : t.replace("\r\n", "\n").split("\n")) { if (l.isEmpty() || (dropProbe && l.equals("READY"))) continue; o.add(l); }
        return o.isEmpty() ? "-" : String.join(" / ", o);
    }

    static String firstLine(String t) {
        t = t.replace("\r\n", "\n").stripTrailing();
        return t.isEmpty() ? "-" : t.split("\n")[0];
    }

    static String tryConnect(int port) {
        try (Socket s = new Socket()) { s.connect(new InetSocketAddress("127.0.0.1", port), 1500); return "connected"; }
        catch (IOException e) { return "refused"; }
    }

    // TCP와 UDP 모두에서 비어 있는 포트
    static int freePort() throws Exception {
        for (int i = 0; i < 50; i++) {
            int p;
            try (ServerSocket a = new ServerSocket(0)) { p = a.getLocalPort(); }
            try (DatagramSocket d = new DatagramSocket(p)) { return p; } catch (IOException e) { /* UDP 쪽이 쓰이고 있으면 다시 */ }
        }
        throw new IllegalStateException("빈 포트를 찾지 못함");
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/tcp_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        System.out.println("# java " + System.getProperty("java.version") + " · " + System.getProperty("os.name") + " · localhost · 받는 쪽과 보내는 쪽은 각각 따로 띄운 자바 프로세스 · 조합마다 " + RUNS + "번 실행");
        System.out.println("# localhost(InetAddress.getByName) => " + InetAddress.getByName("localhost").getHostAddress());
        for (String proto : new String[] { "tcp", "udp" })
            for (boolean listen : new boolean[] { true, false }) {
                Path dir = Path.of(base, proto + "-" + (listen ? "on" : "off"));
                Files.createDirectories(dir);
                List<String> results = new ArrayList<>();
                List<Integer> ports = new ArrayList<>();
                for (int run = 1; run <= RUNS; run++) {
                    int port = freePort();
                    ports.add(port);
                    for (String n : new String[] { "Receiver", "Sender" })
                        for (String ext : new String[] { ".java", ".class" }) Files.deleteIfExists(dir.resolve(n + ext));
                    boolean tcp = proto.equals("tcp");
                    Files.writeString(dir.resolve("port.txt"), port + "\n", StandardCharsets.UTF_8);
                    Files.writeString(dir.resolve("Receiver.java"), program("Receiver", tcp ? TCP_RECEIVER : UDP_RECEIVER, port), StandardCharsets.UTF_8);
                    Files.writeString(dir.resolve("Sender.java"), program("Sender", tcp ? TCP_SENDER : UDP_SENDER, port), StandardCharsets.UTF_8);
                    try (StandardJavaFileManager fm = jc.getStandardFileManager(null, null, StandardCharsets.UTF_8)) {
                        boolean ok = jc.getTask(null, fm, null, List.of("-encoding", "UTF-8", "-d", dir.toString(), "-proc:none"),
                            null, fm.getJavaFileObjects(dir.resolve("Receiver.java"), dir.resolve("Sender.java"))).call();
                        if (!ok) throw new IllegalStateException("컴파일 실패 " + dir);
                    }
                    String pre = tryConnect(port);
                    Proc rcv = null;
                    if (listen) {
                        rcv = start(dir, java, "Receiver", run);
                        if (!waitMarker(rcv, "READY", 10000)) throw new IllegalStateException("받는 쪽이 뜨지 않음 " + dir + "\n" + rcv.err());
                    }
                    Proc snd = start(dir, java, "Sender", run);
                    boolean sDone = waitExit(snd, 10000);
                    String rExit = "-";
                    if (rcv != null) { boolean rd = waitExit(rcv, 3000); rExit = rd ? String.valueOf(rcv.p.exitValue()) : "waiting"; }
                    String line = "senderOut=" + lines(snd.out(), false) + "|senderErr=" + firstLine(snd.err()) + "|senderExit=" + (sDone ? snd.p.exitValue() : "waiting")
                        + "|receiverOut=" + (rcv == null ? "(띄우지 않음)" : lines(rcv.out(), true)) + "|receiverExit=" + rExit + "|pre=" + pre;
                    if (snd.alive()) snd.p.destroyForcibly();
                    if (rcv != null && rcv.alive()) rcv.p.destroyForcibly();
                    snd.p.waitFor(5, TimeUnit.SECONDS);
                    if (rcv != null) rcv.p.waitFor(5, TimeUnit.SECONDS);
                    results.add(line);
                }
                boolean same = results.stream().distinct().count() == 1;
                System.out.println(proto + "|" + (listen ? "on" : "off") + " => " + (same ? results.get(0) + "|runs=" + RUNS + "개 모두 같음" : "(실행마다 다름) " + String.join(" ## ", results)) + "|ports=" + ports);
            }

        // 사실 1: 연결 거부 예외가 오기까지 걸린 시간(이 프로세스 안에서 아무도 열지 않은 포트로 new Socket("localhost", 포트)를 5번)
        List<Long> ms = new ArrayList<>();
        String exName = "-";
        for (int i = 0; i < 5; i++) {
            int port = freePort();
            long t0 = System.nanoTime();
            try (Socket s = new Socket("localhost", port)) { exName = "connected?!"; }
            catch (IOException e) { exName = e.getClass().getName() + ": " + e.getMessage(); }
            ms.add((System.nanoTime() - t0) / 1_000_000);
        }
        System.out.println("# 사실 연결 거부까지 걸린 시간 => 예외=" + exName + "|ms=" + ms);

        // 사실 2: HTTP 요청 글을 TCP 연결로 쓰면 JDK의 HttpServer가 답하고, 같은 글을 UDP로 같은 포트에 보내면 서버는 받지 않는다
        int hp = freePort();
        AtomicInteger requests = new AtomicInteger();
        List<String> seen = new ArrayList<>();
        HttpServer hs = HttpServer.create(new InetSocketAddress(hp), 0);
        hs.createContext("/hello", ex -> {
            requests.incrementAndGet();
            synchronized (seen) { seen.add(ex.getRequestMethod() + " " + ex.getRequestURI()); }
            byte[] b = "hello".getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(200, b.length);
            try (OutputStream o = ex.getResponseBody()) { o.write(b); }
        });
        hs.start();
        String req = "GET /hello HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n";
        String status, bodyText;
        try (Socket s = new Socket("localhost", hp)) {
            s.getOutputStream().write(req.getBytes(StandardCharsets.UTF_8));
            InputStream in = s.getInputStream();
            String all = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            status = all.split("\r\n")[0];
            bodyText = all.substring(all.indexOf("\r\n\r\n") + 4);
        }
        int afterTcp = requests.get();
        String udpErr = "none";
        try (DatagramSocket d = new DatagramSocket()) {
            byte[] b = req.getBytes(StandardCharsets.UTF_8);
            d.send(new DatagramPacket(b, b.length, new InetSocketAddress("localhost", hp)));
        } catch (IOException e) { udpErr = e.toString(); }
        Thread.sleep(800);
        int afterUdp = requests.get() - afterTcp;
        hs.stop(0);
        System.out.println("# 사실 HTTP를 TCP로 보냄 => 서버가 받은 요청=" + seen + "|응답 첫 줄=" + status + "|본문=" + bodyText);
        System.out.println("# 사실 같은 요청 글을 UDP로 보냄 => send 예외=" + udpErr + "|0.8초 안에 서버가 더 받은 요청 수=" + afterUdp);
    }
}
