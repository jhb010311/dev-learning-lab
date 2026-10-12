import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// 기초개념 "프로세스" 실습의 여섯 가지 조합(실행 방법 3 x 횟수 2)을 실제로 실행한다.
// 조합마다 빈 폴더(verify/out/process_basic/<조합>/)를 만들고, 화면에 보이는 글(# Counter.java 구역과 # 터미널 구역)을 그대로 만든 뒤,
// 그 글에서 소스와 명령을 읽어 JDK의 javac와 java 프로그램을 실제 프로세스로 띄워 실행한다.
//   how : procs(터미널 여러 곳에서, 앞의 실행이 끝나기 전에 실행) / rerun(끝난 뒤에 다시 실행) / threads(한 번 실행, 안에서 스레드가 차례로 add)
//   n   : 2 / 3 (실행하는 횟수, threads에서는 스레드의 수)
// 터미널 구역의 java Counter 줄은 바로 윗줄 주석을 읽어 실행 시점을 정한다: "끝난 뒤에"가 있으면 앞의 프로세스가 모두 끝나기를 기다린 뒤 시작하고,
// 그 밖에는 기다리지 않고 바로 시작한다("끝나기 전에" 포함). 프로세스를 하나 시작할 때마다 그 순간 살아 있는 프로세스 수를 센다.
// 출력: how|n => 시작한 프로세스 수|출력한 PID가 실행기가 본 PID와 같은가|출력에 나온 서로 다른 PID 수|프로세스별 count(프로세스는 ;, 한 프로세스의 줄은 ,)|
//        같은 때에 살아 있던 프로세스 수의 최댓값|종료 코드(,)|표준 오류가 모두 비었는가|실행 뒤 폴더의 파일|실행한 명령 차례   (한 줄로 출력한다)
// 끝에 FACT 줄을 더한다: 서버 프로그램(요청을 받는 프로그램)도 java 명령으로 실행하면 프로세스 하나이고, 요청 사이에 변수가 이어지는지.
// 조합마다 만든 화면의 글은 verify/out/process_basic/<조합>/screen.txt, Counter.java와 프로세스별 출력은 같은 폴더에 남긴다.
public class ProcessBasicProbe {
    static final Path JBIN = Path.of(System.getProperty("java.home"), "bin");

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String screen(String how, int n) {
        List<String> o = new ArrayList<>(List.of("# Counter.java", "public class Counter {", "    // 이 프로세스의 메모리에 있는 변수", "    static int count = 0;", "",
            "    // count를 3 올리고, 이 프로세스의 PID와 count를 출력한다", "    static void add() {", "        count++;", "        count++;", "        count++;",
            "        System.out.println(\"PID \" + ProcessHandle.current().pid()", "                + \" count \" + count);", "    }", "", "    public static void main(String[] args) throws Exception {"));
        if (how.equals("threads")) {
            for (int j = 1; j <= n; j++) {
                if (j == 1) o.add("        // 스레드: 이 프로세스 안에서 add(Counter::add)를 실행하는 흐름");
                o.add("        Thread t" + j + " = new Thread(Counter::add);");
                o.add("        t" + j + ".start();");
                if (j == 1) o.add("        // 끝날 때까지 기다린다. 스레드가 차례로 실행된다");
                o.add("        t" + j + ".join();");
            }
        } else o.add("        add();");
        o.addAll(List.of("        // 실행이 2초 이어지게 한다", "        Thread.sleep(2000);", "    }", "}", "", "# 터미널", "# 컴파일: Counter.class 파일이 만들어진다", "javac Counter.java"));
        if (how.equals("threads")) { o.add("# 실행한다"); o.add("java Counter"); }
        else if (how.equals("rerun")) {
            o.add("# 실행한다"); o.add("java Counter");
            for (int i = 2; i <= n; i++) { o.add("# 앞의 실행이 끝난 뒤에, 같은 터미널에서 다시 실행한다"); o.add("java Counter"); }
        } else {
            o.add("# 터미널 1에서 실행한다"); o.add("java Counter");
            for (int k = 2; k <= n; k++) { o.add("# 터미널 " + k + "에서, 앞의 실행이 끝나기 전에 실행한다"); o.add("java Counter"); }
        }
        return String.join("\n", o);
    }

    static Process start(Path dir, List<String> cmd, String outName, String errName) throws Exception {
        return new ProcessBuilder(cmd).directory(dir.toFile())
            .redirectOutput(dir.resolve(outName).toFile()).redirectError(dir.resolve(errName).toFile()).start();
    }

    static void await(Process p) throws Exception {
        if (!p.waitFor(60, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new RuntimeException("시간 초과"); }
    }

    static void fresh(Path dir) throws Exception {
        if (Files.exists(dir)) try (Stream<Path> s = Files.list(dir)) { for (Path p : s.toList()) Files.delete(p); }
        Files.createDirectories(dir);
    }

    static String files(Path dir) throws Exception {
        try (Stream<Path> s = Files.list(dir)) {
            return s.map(p -> p.getFileName().toString()).filter(n -> !n.equals("screen.txt") && !n.startsWith("out-") && !n.startsWith("err-")).sorted().collect(Collectors.joining(","));
        }
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/process_basic";
        System.out.println("# java " + System.getProperty("java.version"));
        List<String> javaBase = List.of(JBIN.resolve("java").toString(), "-Duser.language=en", "-Duser.country=US", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", ".");
        for (String how : new String[] { "procs", "rerun", "threads" })
            for (int n : new int[] { 2, 3 }) {
                Path dir = Path.of(base, how + "-" + n);
                fresh(dir);
                String scr = screen(how, n);
                Files.writeString(dir.resolve("screen.txt"), scr, StandardCharsets.UTF_8);
                String[] parts = scr.split("\n\n# 터미널\n");
                Files.writeString(dir.resolve("Counter.java"), parts[0].substring("# Counter.java\n".length()) + "\n", StandardCharsets.UTF_8);
                List<String> ran = new ArrayList<>();
                List<Process> procs = new ArrayList<>();
                int maxAlive = 0;
                String prevComment = "";
                for (String line : parts[1].split("\n")) {
                    if (line.startsWith("# ")) { prevComment = line; continue; }
                    if (line.equals("javac Counter.java")) {
                        Process p = start(dir, List.of(JBIN.resolve("javac").toString(), "-J-Duser.language=en", "-J-Duser.country=US", "Counter.java"), "out-javac.txt", "err-javac.txt");
                        await(p);
                        if (p.exitValue() != 0) throw new RuntimeException("javac 실패 " + dir);
                        ran.add("javac");
                    } else if (line.equals("java Counter")) {
                        if (prevComment.contains("끝난 뒤에")) for (Process q : procs) await(q);
                        List<String> cmd = new ArrayList<>(javaBase); cmd.add("Counter");
                        Process p = start(dir, cmd, "out-" + procs.size() + ".txt", "err-" + procs.size() + ".txt");
                        procs.add(p);
                        ran.add("java");
                        int alive = (int) procs.stream().filter(Process::isAlive).count();
                        maxAlive = Math.max(maxAlive, alive);
                    } else throw new RuntimeException("모르는 줄: " + line);
                }
                for (Process p : procs) await(p);
                List<String> perProc = new ArrayList<>(), exits = new ArrayList<>();
                Set<String> pids = new HashSet<>();
                boolean pidMatch = true, errEmpty = true;
                for (int i = 0; i < procs.size(); i++) {
                    exits.add(String.valueOf(procs.get(i).exitValue()));
                    String out = Files.readString(dir.resolve("out-" + i + ".txt"), StandardCharsets.UTF_8).replace("\r\n", "\n").strip();
                    if (!Files.readString(dir.resolve("err-" + i + ".txt"), StandardCharsets.UTF_8).isEmpty()) errEmpty = false;
                    List<String> cs = new ArrayList<>();
                    for (String l : out.split("\n")) {
                        String[] w = l.split(" ");   // PID <pid> count <n>
                        if (w.length != 4 || !w[0].equals("PID") || !w[2].equals("count")) throw new RuntimeException("모르는 출력: " + l);
                        pids.add(w[1]);
                        if (!w[1].equals(String.valueOf(procs.get(i).pid()))) pidMatch = false;
                        cs.add(w[3]);
                    }
                    perProc.add(String.join(",", cs));
                }
                System.out.println(how + "|" + n + " => " + procs.size() + "|" + pidMatch + "|" + pids.size() + "|" + String.join(";", perProc) + "|" + maxAlive
                    + "|" + String.join(",", exits) + "|" + errEmpty + "|" + files(dir) + "|" + String.join(",", ran));
            }

        // 사실: 서버 프로그램(요청을 받는 프로그램)도 java 명령으로 실행하면 프로세스 하나이고, 요청 사이에 변수가 이어진다
        Path d = Path.of(base, "fact-server");
        fresh(d);
        Files.writeString(d.resolve("Server.java"), String.join("\n",
            "import com.sun.net.httpserver.HttpServer;",
            "import java.net.InetSocketAddress;",
            "public class Server {",
            "    static int count = 0;",
            "    public static void main(String[] args) throws Exception {",
            "        HttpServer s = HttpServer.create(new InetSocketAddress(\"127.0.0.1\", 0), 0);",
            "        s.createContext(\"/\", ex -> {",
            "            count++;",
            "            byte[] b = (\"PID \" + ProcessHandle.current().pid() + \" count \" + count).getBytes();",
            "            ex.sendResponseHeaders(200, b.length);",
            "            ex.getResponseBody().write(b);",
            "            ex.close();",
            "        });",
            "        s.start();",
            "        System.out.println(\"PORT \" + s.getAddress().getPort());",
            "    }",
            "}", ""), StandardCharsets.UTF_8);
        Process jc = start(d, List.of(JBIN.resolve("javac").toString(), "Server.java"), "out-javac.txt", "err-javac.txt");
        await(jc);
        if (jc.exitValue() != 0) throw new RuntimeException("Server 컴파일 실패");
        Process srv = new ProcessBuilder(JBIN.resolve("java").toString(), "-cp", ".", "Server").directory(d.toFile()).redirectError(d.resolve("err-server.txt").toFile()).start();
        try {
            java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(srv.getInputStream(), StandardCharsets.UTF_8));
            String first = br.readLine();
            int port = Integer.parseInt(first.split(" ")[1]);
            HttpClient hc = HttpClient.newHttpClient();
            String r1 = hc.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/")).build(), HttpResponse.BodyHandlers.ofString()).body();
            boolean aliveBetween = srv.isAlive();
            String r2 = hc.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/")).build(), HttpResponse.BodyHandlers.ofString()).body();
            boolean samePid = r1.split(" ")[1].equals(r2.split(" ")[1]) && r1.split(" ")[1].equals(String.valueOf(srv.pid()));
            System.out.println("FACT server => 요청1=" + r1.replaceAll("PID \\d+", "PID x") + "|요청2=" + r2.replaceAll("PID \\d+", "PID x") + "|PID가 모두 같고 실행기가 본 PID와 같은가=" + samePid + "|요청 사이에 살아 있는가=" + aliveBetween);
        } finally {
            srv.destroy();
            await(srv);
        }
        System.out.println("FACT server-end => 서버 프로세스가 끝났는가=" + !srv.isAlive());
    }
}
