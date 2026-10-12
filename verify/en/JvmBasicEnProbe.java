// English edition of JvmBasicProbe: the same six combinations with the English screen text of the lab ("Hi" and "Bye" instead of the Korean greetings, English comments). javac and java already ran with -Duser.language=en. Output: JvmBasicEnProbe.out.txt
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// 기초개념 "컴파일과 JVM" 실습의 여섯 가지 조합(javac 줄 2 x 소스 글 3)을 실제로 실행한다.
// 조합마다 빈 폴더(verify/out/jvm_basic/<조합>/)를 만들고, 화면에 보이는 글(# Hello.java 구역과 # 터미널 구역)을 그대로 만든 뒤,
// 그 글에서 소스와 명령을 읽어 실제로 실행한다. javax.tools를 쓰지 않고 JDK의 javac와 java 프로그램을 프로세스로 띄운다.
//   compile : 터미널에 javac Hello.java 줄이 있는가
//   src     : ok(맞는 코드) / nosemi(println 줄 끝의 ;를 뺀 코드) / edited(컴파일한 뒤 "안녕"을 "잘 가"로 고침)
// 터미널 구역에서 '# 편집기에서 ...' 줄은 Hello.java의 "안녕"을 "잘 가"로 고치는 일, javac Hello.java와 java Hello 줄은 그 명령의 실행이다.
// 출력: compile|src => javac 종료 코드|javac 오류 첫 줄|javac 마지막 줄|javac 표준 출력|javac 뒤 Hello.class가 있는가|맨 앞 4바이트|major 버전|고친 뒤에도 같은 class인가|
//        java 종료 코드|java 표준 출력|java 오류 첫 줄|java 오류 둘째 줄|마지막 폴더의 파일|실행한 명령 (한 줄로 출력한다)
// 끝에 FACT 줄을 더한다: 단계 문장이 기대는 사실(다시 컴파일하면 새 글이 나온다, java Hello.java는 소스를 바로 실행한다 등).
// 조합마다 만든 화면의 글은 verify/out/jvm_basic/<조합>/screen.txt, 마지막 Hello.java는 같은 폴더에 남긴다.
public class JvmBasicEnProbe {
    static final Path JBIN = Path.of(System.getProperty("java.home"), "bin");

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String screen(boolean compile, String src) {
        String txt = src.equals("edited") ? "Bye" : "Hi";
        List<String> o = new ArrayList<>(List.of(
            "# Hello.java",
            "public class Hello {",
            "    // main: the method that the java command calls first",
            "    public static void main(String[] args) {",
            "        System.out.println(\"" + txt + "\")" + (src.equals("nosemi") ? "" : ";"),
            "    }",
            "}",
            "",
            "# Terminal"));
        if (compile) { o.add("# Compile: javac reads Hello.java and creates Hello.class"); o.add("javac Hello.java"); }
        if (src.equals("edited")) o.add("# Edit Hello.java in an editor: change \"Hi\" to \"Bye\"");
        o.add("# Run: java starts the JVM, which runs main in Hello.class");
        o.add("java Hello");
        return String.join("\n", o);
    }

    record Res(int exit, String out, String err) {}

    static Res run(Path dir, List<String> cmd) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd).directory(dir.toFile());
        Path o = Files.createTempFile(dir, "o", ".txt"), e = Files.createTempFile(dir, "e", ".txt");
        pb.redirectOutput(o.toFile()).redirectError(e.toFile());
        Process p = pb.start();
        if (!p.waitFor(60, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new RuntimeException("timeout " + cmd); }
        Res r = new Res(p.exitValue(), Files.readString(o, StandardCharsets.UTF_8).replace("\r\n", "\n"), Files.readString(e, StandardCharsets.UTF_8).replace("\r\n", "\n"));
        Files.delete(o); Files.delete(e);
        return r;
    }

    static Res javac(Path dir, String... files) throws Exception {
        List<String> c = new ArrayList<>(List.of(JBIN.resolve("javac").toString(), "-J-Duser.language=en", "-J-Duser.country=US", "-J-Dstdout.encoding=UTF-8", "-J-Dstderr.encoding=UTF-8"));
        c.addAll(Arrays.asList(files));
        return run(dir, c);
    }

    static Res java(Path dir, String... args) throws Exception {
        List<String> c = new ArrayList<>(List.of(JBIN.resolve("java").toString(), "-Duser.language=en", "-Duser.country=US", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8"));
        c.addAll(Arrays.asList(args));
        return run(dir, c);
    }

    static String first(String s, int n) {
        String[] ls = s.strip().split("\n");
        return s.isBlank() || n >= ls.length ? "-" : ls[n].strip();
    }

    static String last(String s) {
        String[] ls = s.strip().split("\n");
        return s.isBlank() ? "-" : ls[ls.length - 1].strip();
    }

    static String sha(Path f) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(f)));
    }

    static void fresh(Path dir) throws Exception {
        if (Files.exists(dir)) try (Stream<Path> s = Files.list(dir)) { for (Path p : s.toList()) Files.delete(p); }
        Files.createDirectories(dir);
    }

    static String files(Path dir) throws Exception {
        try (Stream<Path> s = Files.list(dir)) {
            return s.map(p -> p.getFileName().toString()).filter(n -> !n.equals("screen.txt")).sorted().collect(Collectors.joining(","));
        }
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/jvm_basic_en";
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean compile : new boolean[] { false, true })
            for (String src : new String[] { "ok", "nosemi", "edited" }) {
                Path dir = Path.of(base, compile + "-" + src);
                fresh(dir);
                String scr = screen(compile, src);
                Files.writeString(dir.resolve("screen.txt"), scr, StandardCharsets.UTF_8);
                // 화면의 글을 읽어 소스와 명령을 얻는다
                String[] parts = scr.split("\n\n# Terminal\n");
                String shown = parts[0].substring("# Hello.java\n".length()) + "\n";
                String[] term = parts[1].split("\n");
                boolean hasEdit = Arrays.stream(term).anyMatch(l -> l.startsWith("# Edit Hello.java in an editor"));
                // Text before the edit: if there is an edit line, change "Bye" on the screen back to "Hi"
                String initial = hasEdit ? shown.replace("\"Bye\"", "\"Hi\"") : shown;
                Path java = dir.resolve("Hello.java"), cls = dir.resolve("Hello.class");
                Files.writeString(java, initial, StandardCharsets.UTF_8);
                String jcExit = "-", jcErr1 = "-", jcLast = "-", jcOut = "-", clsAfterJc = "-", clsSame = "-", jExit = "-", jOut = "-", jErr1 = "-", jErr2 = "-";
                List<String> ran = new ArrayList<>();
                for (String line : term) {
                    if (line.startsWith("# Edit Hello.java in an editor")) {
                        String before = Files.exists(cls) ? sha(cls) : null;
                        Files.writeString(java, shown, StandardCharsets.UTF_8);
                        ran.add("edit");
                        if (before != null) clsSame = String.valueOf(before.equals(sha(cls)));
                    } else if (line.equals("javac Hello.java")) {
                        Res r = javac(dir, "Hello.java");
                        ran.add("javac");
                        jcExit = String.valueOf(r.exit); jcErr1 = first(r.err, 0); jcLast = last(r.err); jcOut = r.out.strip().isEmpty() ? "(empty)" : r.out.strip();
                        clsAfterJc = String.valueOf(Files.exists(cls));
                    } else if (line.equals("java Hello")) {
                        Res r = java(dir, "Hello");
                        ran.add("java");
                        jExit = String.valueOf(r.exit);
                        jOut = r.out.isEmpty() ? "" : r.out.strip().replace("\n", " / ");
                        jErr1 = first(r.err, 0); jErr2 = first(r.err, 1);
                    } else if (!line.startsWith("# ")) throw new RuntimeException("unknown line: " + line);
                }
                if (!Files.readString(java, StandardCharsets.UTF_8).equals(shown)) throw new RuntimeException("the last Hello.java differs from the screen text");
                String magic = "-", major = "-";
                if (Files.exists(cls)) {
                    byte[] b = Files.readAllBytes(cls);
                    magic = HexFormat.of().withUpperCase().formatHex(b, 0, 4);
                    major = String.valueOf(((b[6] & 0xff) << 8) | (b[7] & 0xff));
                }
                System.out.println(compile + "|" + src + " => " + jcExit + "|" + jcErr1 + "|" + jcLast + "|" + jcOut + "|" + clsAfterJc + "|" + magic + "|" + major + "|" + clsSame
                    + "|" + jExit + "|" + jOut + "|" + jErr1 + "|" + jErr2 + "|" + files(dir) + "|" + String.join(",", ran));
            }

        // 사실 1: 고친 뒤 javac를 다시 실행하면 새 Hello.class가 만들어지고 "잘 가"가 출력된다
        Path d1 = Path.of(base, "fact-recompile");
        fresh(d1);
        String ok = screen(true, "ok").split("\n\n# Terminal\n")[0].substring("# Hello.java\n".length()) + "\n";
        Files.writeString(d1.resolve("Hello.java"), ok, StandardCharsets.UTF_8);
        javac(d1, "Hello.java");
        String h1 = sha(d1.resolve("Hello.class"));
        Files.writeString(d1.resolve("Hello.java"), ok.replace("\"Hi\"", "\"Bye\""), StandardCharsets.UTF_8);
        Res a = java(d1, "Hello");
        Res b = javac(d1, "Hello.java");
        Res c = java(d1, "Hello");
        System.out.println("FACT recompile => output before recompiling after the edit=" + a.out.strip() + "|javac exit code=" + b.exit + "|class changed=" + !h1.equals(sha(d1.resolve("Hello.class"))) + "|output after recompiling=" + c.out.strip());

        // 사실 2: java Hello.java (소스 파일 모드)는 Hello.class를 만들지 않고 소스를 바로 실행한다 (이 실습은 쓰지 않는다)
        Path d2 = Path.of(base, "fact-sourcemode");
        fresh(d2);
        Files.writeString(d2.resolve("Hello.java"), ok, StandardCharsets.UTF_8);
        Res s = java(d2, "Hello.java");
        System.out.println("FACT sourcemode => java exit code=" + s.exit + "|output=" + s.out.strip() + "|Hello.class created=" + Files.exists(d2.resolve("Hello.class")));

        // 사실 3: 세미콜론이 없는 소스에 java Hello.java를 하면 이 모드에서도 실패한다(참고)
        Path d3 = Path.of(base, "fact-sourcemode-err");
        fresh(d3);
        Files.writeString(d3.resolve("Hello.java"), ok.replace("\");", "\")"), StandardCharsets.UTF_8);
        Res s3 = java(d3, "Hello.java");
        System.out.println("FACT sourcemode-err => java exit code=" + s3.exit + "|first error line=" + first(s3.err, 0));

        // 사실 4: 컴파일 오류가 있는 소스에 javac를 했을 때 이미 있던 옛 Hello.class는 그대로 남는가(참고: 이 실습이 다루지 않는 경우)
        Path d4 = Path.of(base, "fact-oldclass");
        fresh(d4);
        Files.writeString(d4.resolve("Hello.java"), ok, StandardCharsets.UTF_8);
        javac(d4, "Hello.java");
        String h4 = sha(d4.resolve("Hello.class"));
        Files.writeString(d4.resolve("Hello.java"), ok.replace("\");", "\")"), StandardCharsets.UTF_8);
        Res e4 = javac(d4, "Hello.java");
        Res r4 = java(d4, "Hello");
        System.out.println("FACT oldclass => javac exit code=" + e4.exit + "|old class remains=" + Files.exists(d4.resolve("Hello.class")) + "|unchanged=" + (Files.exists(d4.resolve("Hello.class")) && h4.equals(sha(d4.resolve("Hello.class")))) + "|java Hello output=" + r4.out.strip());
    }
}
