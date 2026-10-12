import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "파일 입출력" 실습의 아홉 가지 조합(쓰는 글자 3 x 읽는 방법 3)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스(맨 위의 import 네 줄만 더함)를 Main.java로 만들어 javax.tools로 컴파일하고,
// 새 자바 프로세스(java -cp . Main)로 그 조합의 빈 폴더에서 실행한다. 프로세스가 끝난 뒤 폴더의 memo.txt를 직접 열어
// 실제로 저장된 바이트를 읽는다.
//   text : gaA("가A") / ab("AB") / gana("가나")
//   read : utf8(UTF-8로 읽는다) / iso(ISO_8859_1로 읽는다) / none(없는 파일 none.txt를 읽는다)
// 출력: text|read => 컴파일(OK/ERR)|종료코드|memo.txt의 크기|memo.txt의 바이트(16진수)|프로그램이 출력한 첫 줄(바이트 수)|
//        프로그램이 출력한 둘째 줄의 글자별 코드 포인트(16진수)|표준 오류의 첫 줄|예외가 난 줄 번호|실행 뒤 폴더의 파일들|실행 전 memo.txt가 있었나
// 끝에 FACT 줄을 더한다(단계 문장이 기대는 사실).
public class IoBasicProbe {
    static final String IMPORTS = "import java.io.IOException;\nimport java.nio.charset.StandardCharsets;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\n";

    // 화면의 코드(실습의 code 함수)와 같은 글. import 네 줄은 앞에 따로 붙인다.
    static String code(String text, String read) {
        String t = text.equals("gaA") ? "가A" : text.equals("ab") ? "AB" : "가나";
        String file = read.equals("none") ? "none.txt" : "memo.txt";
        String cs = read.equals("iso") ? "ISO_8859_1" : "UTF_8";
        return "public class Main {\n"
            + "    public static void main(String[] args) throws IOException {\n"
            + "        // 쓰기: 글자를 정해진 규칙으로 바이트로 바꿔 파일에 저장한다\n"
            + "        Files.writeString(Path.of(\"memo.txt\"), \"" + t + "\",\n"
            + "                StandardCharsets.UTF_8);\n"
            + "        // 읽기 1: 파일에 저장된 바이트를 그대로 읽는다\n"
            + "        byte[] bytes = Files.readAllBytes(Path.of(\"" + file + "\"));\n"
            + "        // 읽기 2: 파일의 바이트를 정해진 규칙으로 글자로 되돌린다\n"
            + "        String text = Files.readString(Path.of(\"" + file + "\"),\n"
            + "                StandardCharsets." + cs + ");\n"
            + "        System.out.println(bytes.length);\n"
            + "        System.out.println(text);\n"
            + "    }\n"
            + "}\n";
    }

    static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (byte x : b) { if (s.length() > 0) s.append(' '); s.append(String.format("%02X", x & 0xFF)); }
        return s.toString();
    }

    static byte[] readAll(InputStream in) throws Exception { return in.readAllBytes(); }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/io_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        String javaExe = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String text : new String[] { "gaA", "ab", "gana" })
            for (String read : new String[] { "utf8", "iso", "none" }) {
                Path dir = Path.of(base, text + "-" + read).toAbsolutePath();
                Files.createDirectories(dir);
                // 이전 실행의 파일을 치운다(이 폴더는 이 Probe가 만든 임시 폴더다)
                try (Stream<Path> st = Files.list(dir)) { for (Path p : st.toList()) Files.delete(p); }
                String code = code(text, read), src = IMPORTS + code;
                Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
                JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
                    @Override public CharSequence getCharContent(boolean ignore) { return src; }
                };
                boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
                if (!ok) {
                    System.out.println(text + "|" + read + " => ERR|" + dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).map(d -> d.getMessage(java.util.Locale.ENGLISH)).collect(Collectors.joining(" ## ")));
                    continue;
                }
                boolean before = Files.exists(dir.resolve("memo.txt"));
                ProcessBuilder pb = new ProcessBuilder(javaExe, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", ".", "Main");
                pb.directory(dir.toFile());
                Process p = pb.start();
                byte[] out = readAll(p.getInputStream()), err = readAll(p.getErrorStream());
                int exit = p.waitFor();
                String[] ol = new String(out, StandardCharsets.UTF_8).split("\n", -1);
                String l1 = ol.length > 0 ? ol[0].replace("\r", "") : "-";
                String l2 = ol.length > 1 ? ol[1].replace("\r", "") : "";
                String cps = l2.isEmpty() ? "-" : l2.codePoints().mapToObj(c -> String.format("%X", c)).collect(Collectors.joining(" "));
                if (out.length == 0) l1 = "-";
                String[] el = new String(err, StandardCharsets.UTF_8).split("\r?\n");
                String errFirst = err.length == 0 ? "-" : el[0];
                String errLine = "-";
                for (String x : el) { int i = x.indexOf("Main.main(Main.java:"); if (i >= 0) { errLine = x.substring(i + 20, x.indexOf(')', i)); break; } }
                Path memo = dir.resolve("memo.txt");
                byte[] mb = Files.exists(memo) ? Files.readAllBytes(memo) : new byte[0];
                String files;
                try (Stream<Path> st = Files.list(dir)) { files = st.map(x -> x.getFileName().toString()).sorted().collect(Collectors.joining(",")); }
                System.out.println(text + "|" + read + " => OK|" + exit + "|" + mb.length + "|" + hex(mb) + "|" + l1 + "|" + cps + "|" + errFirst + "|" + errLine + "|" + files + "|" + before);
            }
        // 사실 확인: 자바가 글자 하나를 UTF-8로 바꿨을 때의 바이트 수(가, 나, A, B)
        StringBuilder f = new StringBuilder("FACT utf8len =>");
        for (String ch : new String[] { "A", "B", "가", "나" }) f.append(' ').append(ch).append('=').append(ch.getBytes(StandardCharsets.UTF_8).length).append('(').append(hex(ch.getBytes(StandardCharsets.UTF_8))).append(')');
        System.out.println(f);
        // 사실 확인: 같은 바이트를 ISO_8859_1로 읽으면 바이트 하나가 글자 하나(256가지 바이트 모두)
        byte[] all = new byte[256]; for (int i = 0; i < 256; i++) all[i] = (byte) i;
        String s = new String(all, StandardCharsets.ISO_8859_1);
        boolean same = s.length() == 256; for (int i = 0; i < 256 && same; i++) if (s.charAt(i) != i) same = false;
        System.out.println("FACT iso256 => " + same);
        // 사실 확인: 쓰기 전에는 memo.txt가 없다는 것, 읽기는 파일을 바꾸지 않는다는 것은 위 조합 줄의 마지막 칸(실행 전 memo.txt)과 바이트 칸으로 본다
    }
}
