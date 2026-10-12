import java.io.IOException;
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
import javax.tools.JavaCompiler;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

// 기초개념 "IP 주소와 포트" 실습의 여덟 가지 조합(서버가 포트를 열고 있다 2 x 클라이언트가 연결하는 포트 2 x 같은 포트를 또 열려는 프로그램 2)을 실제로 실행한다.
// 서버 프로그램, 같은 포트를 또 열려는 프로그램, 클라이언트 프로그램은 서로 다른 자바 프로세스다. 조합마다 화면에 보이는 것과 같은 글로 소스를 만들어 javax.tools로 컴파일하고,
// 이 JDK의 java로 각각 띄워 실제로 127.0.0.1에서 연결한다. 외부 네트워크에는 연결하지 않는다. 끝나면 모든 프로세스를 끝낸다.
// 화면의 8080은 "8080 자리", 9090은 "9090 자리"이며 실제 실행에서는 조합마다 비어 있는 포트 두 개(p1, p2)로 바꿔 쓴다.
// 화면에 없는 줄(프로세스가 준비됐음을 알리는 출력 등)은 줄 끝에 "// [Probe]"를 붙여 두었고, cmp가 견줄 때 뺀다.
// 출력 한 줄: 서버가 열려 있다|포트(same/other)|또 열려는 프로그램이 있다 => 키=값|...
//   conn: 클라이언트가 연결됐는지(CONNECTED / FAILED)   text: 클라이언트가 받은 글   clientDone: 3초 안에 클라이언트가 끝났는가
//   clientErr: 클라이언트의 표준 오류 첫 줄   clientPorts: 클라이언트 쪽 소켓의 자기 포트(local)와 상대 포트(remote)
//   second: 또 열려는 프로그램의 결과(OPENED / FAILED / -)   secondErr: 그 표준 오류 첫 줄
//   pre: 시작 전에 p1, p2로 연결해 본 결과   listenServer: 서버가 뜬 직후 netstat이 p1에서 LISTENING으로 보여 준 (주소, 프로세스)가 서버 프로세스인가
//   listenAfterSecond: 또 열려는 프로그램을 띄운 뒤 p1을 LISTENING으로 가진 프로세스   p2Listen: 클라이언트가 연결을 시도하던 때 p2를 LISTENING으로 가진 프로세스
public class PortBasicProbe {
    static final String P = " // [Probe]";
    static final long WAIT_CLIENT = 3000;

    // 화면의 코드(실습의 code 함수)와 같은 글. 8080과 9090은 실행할 때 실제 포트로 바뀐다.
    static final String SERVER = "// 서버 프로그램: 8080번 포트를 열고 연결을 기다린다\n"
        + "ServerSocket server = new ServerSocket(8080);\n"
        + "System.out.println(\"LISTENING\"); System.out.flush();" + P + "\n"
        + "Socket fromClient = server.accept();\n"
        + "fromClient.getOutputStream().write(\"안녕하세요\".getBytes(\"UTF-8\"));\n"
        + "fromClient.close();\n";
    static final String SECOND = "// 또 다른 프로그램: 같은 8080번 포트를 열려고 한다\n"
        + "ServerSocket another = new ServerSocket(8080);\n"
        + "System.out.println(\"OPENED\"); System.out.flush(); System.in.read();" + P + "\n";
    static final String CLIENT = "// 클라이언트 프로그램: 127.0.0.1(이 컴퓨터)에 연결한다\n"
        + "Socket socket = new Socket(\"127.0.0.1\", @PORT@);\n"
        + "System.out.println(\"CONNECTED \" + socket.getLocalPort() + \" \" + socket.getPort()); System.out.flush();" + P + "\n"
        + "String text = new String(socket.getInputStream().readAllBytes(), \"UTF-8\");\n"
        + "System.out.println(text);\n";

    static String program(String cls, String body, int p1, int p2) {
        StringBuilder s = new StringBuilder("import java.net.ServerSocket;\nimport java.net.Socket;\n\npublic class " + cls
            + " {\n    public static void main(String[] args) throws Exception {\n");
        for (String line : body.split("\n")) s.append("        ").append(line).append("\n");
        s.append("    }\n}\n");
        return s.toString().replace("8080", "\u0001A").replace("9090", "\u0001B")
            .replace("\u0001A", String.valueOf(p1)).replace("\u0001B", String.valueOf(p2));
    }

    static class Proc {
        Process p; Path out, err;
        String out() { try { return Files.readString(out, StandardCharsets.UTF_8); } catch (IOException e) { return ""; } }
        String err() { try { return Files.readString(err, StandardCharsets.UTF_8); } catch (IOException e) { return ""; } }
        boolean alive() { return p.isAlive(); }
    }

    static Proc start(Path dir, String java, String cls) throws Exception {
        Proc r = new Proc();
        r.out = dir.resolve(cls + ".stdout.txt"); r.err = dir.resolve(cls + ".stderr.txt");
        ProcessBuilder pb = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), cls);
        pb.redirectOutput(r.out.toFile()); pb.redirectError(r.err.toFile());
        r.p = pb.start();
        return r;
    }

    // 표시(marker)가 표준 출력에 나오거나 프로세스가 끝날 때까지 기다린다
    static boolean waitMarker(Proc r, String marker, long ms) throws Exception {
        long end = System.currentTimeMillis() + ms;
        while (System.currentTimeMillis() < end) {
            if (r.out().contains(marker)) return true;
            if (!r.alive()) { Thread.sleep(100); return r.out().contains(marker); }
            Thread.sleep(40);
        }
        return r.out().contains(marker);
    }

    static boolean waitExit(Proc r, long ms) throws Exception {
        long end = System.currentTimeMillis() + ms;
        while (System.currentTimeMillis() < end) { if (!r.alive()) return true; Thread.sleep(40); }
        return !r.alive();
    }

    static String firstLine(String t) {
        t = t.replace("\r\n", "\n").stripTrailing();
        return t.isEmpty() ? "-" : t.split("\n")[0];
    }

    // 시작 전에 그 포트로 연결해 보면 어떻게 되는지(아무도 열지 않은 포트면 거절돼야 한다)
    static String tryConnect(int port) {
        try (Socket s = new Socket()) { s.connect(new InetSocketAddress("127.0.0.1", port), 1500); return "connected"; }
        catch (IOException e) { return "refused"; }
    }

    // netstat -ano -p TCP에서 그 포트를 LISTENING으로 가진 (주소, 프로세스 번호)들
    static List<String[]> listeners(int port) throws Exception {
        Process p = new ProcessBuilder("netstat", "-ano", "-p", "TCP").redirectErrorStream(true).start();
        String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        p.waitFor();
        List<String[]> r = new ArrayList<>();
        for (String line : all.split("\r?\n")) {
            String[] t = line.trim().split("\\s+");
            if (t.length >= 5 && t[0].equals("TCP") && t[3].equals("LISTENING") && t[1].endsWith(":" + port)) r.add(new String[] { t[1], t[4] });
        }
        return r;
    }

    static String owners(int port, long serverPid, long secondPid) throws Exception {
        List<String[]> l = listeners(port);
        if (l.isEmpty()) return "none";
        List<String> o = new ArrayList<>();
        for (String[] x : l) {
            long pid = Long.parseLong(x[1]);
            o.add(x[0].replace(":" + port, ":P") + "/" + (pid == serverPid ? "server" : pid == secondPid ? "second" : "other"));
        }
        return String.join(",", o);
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/port_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        System.out.println("# java " + System.getProperty("java.version") + " · " + System.getProperty("os.name") + " · 127.0.0.1 · 서버, 또 열려는 프로그램, 클라이언트는 각각 따로 띄운 자바 프로세스 · 클라이언트가 " + WAIT_CLIENT + "ms 안에 끝나지 않으면 기다리는 중으로 본다");
        // 단계 문장이 기대는 사실: 이 PC에서 localhost라는 이름이 풀리는 주소(외부 DNS를 쓰지 않는 이름이다)
        StringBuilder lh = new StringBuilder();
        for (InetAddress a : InetAddress.getAllByName("localhost")) lh.append(lh.length() > 0 ? "," : "").append(a.getHostAddress());
        System.out.println("# localhost => " + lh);
        for (boolean server : new boolean[] { false, true })
            for (String port : new String[] { "same", "other" })
                for (boolean second : new boolean[] { false, true }) {
                    // 비어 있는 포트 두 개를 고른다
                    int p1, p2;
                    try (ServerSocket a = new ServerSocket(0); ServerSocket b = new ServerSocket(0)) { p1 = a.getLocalPort(); p2 = b.getLocalPort(); }
                    Path dir = Path.of(base, server + "-" + port + "-" + second);
                    Files.createDirectories(dir);
                    for (String n : new String[] { "Server", "Another", "Client" })
                        for (String ext : new String[] { ".java", ".class", ".stdout.txt", ".stderr.txt" }) Files.deleteIfExists(dir.resolve(n + ext));
                    Files.writeString(dir.resolve("ports.txt"), p1 + "," + p2 + "\n", StandardCharsets.UTF_8);
                    Files.writeString(dir.resolve("Server.java"), program("Server", SERVER, p1, p2), StandardCharsets.UTF_8);
                    Files.writeString(dir.resolve("Another.java"), program("Another", SECOND, p1, p2), StandardCharsets.UTF_8);
                    Files.writeString(dir.resolve("Client.java"), program("Client", CLIENT.replace("@PORT@", port.equals("same") ? "8080" : "9090"), p1, p2), StandardCharsets.UTF_8);
                    try (StandardJavaFileManager fm = jc.getStandardFileManager(null, null, StandardCharsets.UTF_8)) {
                        boolean ok = jc.getTask(null, fm, null, List.of("-encoding", "UTF-8", "-d", dir.toString(), "-proc:none"),
                            null, fm.getJavaFileObjects(dir.resolve("Server.java"), dir.resolve("Another.java"), dir.resolve("Client.java"))).call();
                        if (!ok) throw new IllegalStateException("컴파일 실패 " + dir);
                    }
                    String pre = tryConnect(p1) + "," + tryConnect(p2);
                    Proc srv = null, sec = null;
                    long srvPid = -1, secPid = -1;
                    String listenServer = "-", listenAfterSecond = "-", secondRes = "-", secondErr = "-";
                    if (server) {
                        srv = start(dir, java, "Server"); srvPid = srv.p.pid();
                        if (!waitMarker(srv, "LISTENING", 10000)) throw new IllegalStateException("서버가 뜨지 않음 " + dir + "\n" + srv.err());
                        listenServer = owners(p1, srvPid, -1);
                    }
                    if (second) {
                        sec = start(dir, java, "Another"); secPid = sec.p.pid();
                        waitMarker(sec, "OPENED", 8000);
                        waitExit(sec, 600);
                        boolean opened = sec.out().contains("OPENED");
                        secondRes = opened ? "OPENED" : "FAILED";
                        secondErr = firstLine(sec.err());
                        listenAfterSecond = owners(p1, srvPid, secPid);
                    }
                    // 클라이언트
                    Proc cli = start(dir, java, "Client");
                    boolean done = waitExit(cli, WAIT_CLIENT);
                    String p2Listen = owners(p2, srvPid, secPid);
                    String cout = cli.out(), cerr = firstLine(cli.err());
                    String exit = done ? String.valueOf(cli.p.exitValue()) : "waiting";
                    String conn = "FAILED", localRemote = "-", text = "(없음)";
                    List<String> textLines = new ArrayList<>();
                    for (String l : cout.replace("\r\n", "\n").stripTrailing().split("\n")) {
                        if (l.isEmpty()) continue;
                        if (l.startsWith("CONNECTED ")) {
                            conn = "CONNECTED";
                            String[] t = l.split(" ");
                            localRemote = (Integer.parseInt(t[1]) == p1 ? "local=P1" : Integer.parseInt(t[1]) == p2 ? "local=P2" : "local=" + (Integer.parseInt(t[1]) >= 49152 ? "ephemeral" : "low"))
                                + ",remote=" + (Integer.parseInt(t[2]) == p1 ? "P1" : Integer.parseInt(t[2]) == p2 ? "P2" : t[2]);
                        } else textLines.add(l);
                    }
                    if (!textLines.isEmpty()) text = String.join(" / ", textLines);
                    String serverExit = "-";
                    if (srv != null) {
                        boolean sd = waitExit(srv, 1500);
                        serverExit = sd ? String.valueOf(srv.p.exitValue()) : "waiting";
                    }
                    // 끝내기
                    if (cli.alive()) cli.p.destroyForcibly();
                    if (srv != null && srv.alive()) srv.p.destroyForcibly();
                    if (sec != null && sec.alive()) sec.p.destroyForcibly();
                    for (Proc r : new Proc[] { cli, srv, sec }) if (r != null) r.p.waitFor(5, TimeUnit.SECONDS);
                    System.out.println(server + "|" + port + "|" + second + " => conn=" + conn + "|text=" + text + "|clientDone=" + done + "|clientExit=" + exit
                        + "|clientErr=" + cerr + "|clientPorts=" + localRemote + "|second=" + secondRes + "|secondErr=" + secondErr + "|pre=" + pre
                        + "|listenServer=" + listenServer + "|listenAfterSecond=" + listenAfterSecond + "|p2Listen=" + p2Listen + "|serverExit=" + serverExit
                        + "|ports=" + p1 + "," + p2);
                }
    }
}
