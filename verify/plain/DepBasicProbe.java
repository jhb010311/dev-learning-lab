import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

// 기초개념 "라이브러리와 의존성" 실습의 네 가지 조합(컴파일할 때 -cp greet.jar 2 x 실행할 때 -cp greet.jar 2)을 실제로 실행한다.
// 먼저 작은 라이브러리 lib.Greeter를 javac와 jar로 greet.jar에 묶는다(외부 jar는 받지 않는다).
// 조합마다 새 폴더에 greet.jar를 복사하고 App.java를 쓴 뒤, 화면에 적힌 터미널 명령(javac ..., java ...)을 그대로 실행한다.
// 컴파일이 실패해도 java 명령을 그대로 실행해 무슨 일이 생기는지 본다.
// 화면의 코드(실습의 code 함수)와 같은 글은 조합 폴더의 screen.txt에 Probe가 실제 파일과 실제 명령에서 만들어 남긴다.
// CLASSPATH 환경 변수는 자식 프로세스에서 지운다(javac와 java가 환경 변수에 영향받지 않게).
// 출력: compileCp|runCp => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|App.class가 있는가|오류가 난 줄(## 로 구분)|
//        java 종료 코드|java 표준 출력|java 오류 출력 첫 줄|javac 메시지 첫 줄|오류 코드 전체(쉼표)|컴파일 전 폴더의 파일들|java 오류 출력 둘째 줄
// 끝에 FACT 줄: jar의 내용 등 단계 문장이 기대는 사실.
public class DepBasicProbe {
    static final String GREETER = "package lib;\n\npublic class Greeter {\n    public static String hello(String name) {\n        return \"hello, \" + name;\n    }\n}\n";
    static final String APP = "// greet.jar 안에 있는, 남이 만든 클래스를 가져온다\nimport lib.Greeter;\n\npublic class App {\n    public static void main(String[] args) {\n        System.out.println(Greeter.hello(\"kim\"));\n    }\n}\n";
    // java 실행기의 오류 문장은 한국어 윈도우에서 시스템 문자 집합(native.encoding)으로 나온다
    static final java.nio.charset.Charset NATIVE = java.nio.charset.Charset.forName(System.getProperty("native.encoding"));
    static final String BIN = System.getProperty("java.home") + File.separator + "bin" + File.separator;

    static String[] exec(Path dir, List<String> args) throws Exception {
        List<String> real = new ArrayList<>(args);
        real.set(0, BIN + args.get(0));
        ProcessBuilder pb = new ProcessBuilder(real).directory(dir.toFile());
        pb.environment().remove("CLASSPATH");
        Process p = pb.start();
        byte[] out = p.getInputStream().readAllBytes(), err = p.getErrorStream().readAllBytes();
        int code = p.waitFor();
        return new String[] { String.valueOf(code), new String(out, NATIVE).replace("\r\n", "\n"), new String(err, NATIVE).replace("\r\n", "\n") };
    }

    static String firstLine(String s) { String t = s.strip(); int i = t.indexOf('\n'); return t.isEmpty() ? "-" : i < 0 ? t : t.substring(0, i); }

    static String secondLine(String s) { String[] l = s.strip().split("\n"); return l.length < 2 ? "-" : l[1].strip(); }

    public static void main(String[] argv) throws Exception {
        Path base = Path.of(argv.length > 0 ? argv[0] : "verify/out/dep_basic");
        Files.createDirectories(base);
        // 라이브러리 만들기
        Path lib = base.resolve("_lib");
        Files.createDirectories(lib.resolve("src/lib"));
        Files.createDirectories(lib.resolve("classes"));
        Files.writeString(lib.resolve("src/lib/Greeter.java"), GREETER, StandardCharsets.UTF_8);
        String[] r = exec(lib, List.of("javac", "-d", "classes", "src/lib/Greeter.java"));
        if (!r[0].equals("0")) throw new RuntimeException("Greeter 컴파일 실패 " + r[2]);
        Files.deleteIfExists(lib.resolve("greet.jar"));
        r = exec(lib, List.of("jar", "cf", "greet.jar", "-C", "classes", "lib"));
        if (!r[0].equals("0")) throw new RuntimeException("jar 실패 " + r[2]);
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean ccp : new boolean[] { true, false })
            for (boolean rcp : new boolean[] { true, false }) {
                Path dir = base.resolve(ccp + "-" + rcp);
                Files.createDirectories(dir);
                Files.deleteIfExists(dir.resolve("App.class"));
                Files.copy(lib.resolve("greet.jar"), dir.resolve("greet.jar"), StandardCopyOption.REPLACE_EXISTING);
                Files.writeString(dir.resolve("App.java"), APP, StandardCharsets.UTF_8);
                List<String> javac = ccp ? List.of("javac", "-cp", "greet.jar", "App.java") : List.of("javac", "App.java");
                List<String> jcmd = rcp ? List.of("java", "-cp", "greet.jar;.", "App") : List.of("java", "-cp", ".", "App");
                // 화면에 보일 글: 실제 파일 내용과 실제 명령
                String jarListing = Files.readString(lib.resolve("src/lib/Greeter.java"), StandardCharsets.UTF_8);
                String screen = "# App.java\n" + Files.readString(dir.resolve("App.java"), StandardCharsets.UTF_8)
                    + "\n# greet.jar (Greeter.java를 컴파일해 jar로 묶은 것)\n" + jarListing
                    + "\n# 터미널\n" + String.join(" ", javac) + "\n" + String.join(" ", jcmd) + "\n";
                Files.writeString(dir.resolve("screen.txt"), screen, StandardCharsets.UTF_8);
                String before; try (var st = Files.list(dir)) { before = st.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".java") || n.endsWith(".jar") || n.endsWith(".class")).sorted().collect(Collectors.joining(" / ")); }
                // 컴파일(화면의 명령 그대로)
                String[] c = exec(dir, javac);
                boolean ok = c[0].equals("0");
                // 같은 명령에 진단 코드만 얻는 옵션을 더해 한 번 더(결과 파일은 다른 폴더에)
                List<String> raw = new ArrayList<>(javac);
                raw.add(1, "-XDrawDiagnostics"); raw.add(1, "rawout"); raw.add(1, "-d");
                Files.createDirectories(dir.resolve("rawout"));
                String[] rc = exec(dir, raw);
                String[] src = APP.split("\n");
                List<String> codes = new ArrayList<>(), where = new ArrayList<>();
                for (String ln : (rc[1] + rc[2]).split("\n")) {
                    // App.java:2:11: compiler.err.doesnt.exist: lib
                    java.util.regex.Matcher m = java.util.regex.Pattern.compile("^App\\.java:(\\d+):(\\d+): (compiler\\.err\\.[a-z.]+)").matcher(ln);
                    if (m.find()) { codes.add(m.group(3)); where.add(src[Integer.parseInt(m.group(1)) - 1].strip()); }
                }
                boolean exists = Files.exists(dir.resolve("App.class"));
                String[] j = exec(dir, jcmd);
                String msg = ok ? "-" : firstLine((c[1] + c[2]).replaceAll("^App\\.java:\\d+: ", "").replace("error: ", ""));
                String full = (c[1] + c[2]).strip().replace("\n", " ## ");
                Files.writeString(dir.resolve("javac.out.txt"), full + "\n", StandardCharsets.UTF_8);
                Files.writeString(dir.resolve("java.out.txt"), "exit " + j[0] + "\nstdout: " + j[1] + "stderr: " + j[2], StandardCharsets.UTF_8);
                System.out.println(ccp + "|" + rcp + " => " + (ok ? "OK" : "ERR") + "|" + (codes.isEmpty() ? "-" : codes.get(0)) + "|" + codes.size()
                    + "|" + exists + "|" + (where.isEmpty() ? "-" : String.join(" ## ", where)) + "|" + j[0] + "|" + (j[1].strip().isEmpty() ? "-" : j[1].strip())
                    + "|" + firstLine(j[2]) + "|" + msg + "|" + codes.stream().collect(Collectors.joining(",")) + "|" + before + "|" + secondLine(j[2]));
            }
        // 사실: jar의 내용, 클래스 파일의 이름, 컴파일된 App.class가 jar 없이 실행 가능한지(위 조합 true|false가 그 사실이다)
        r = exec(lib, List.of("jar", "tf", "greet.jar"));
        System.out.println("FACT jar => " + r[1].strip().replace("\n", " / "));
        // 사실: 컴파일에 성공한 폴더(true-true)에 만들어진 .class 파일은 App.class 하나뿐이다(Greeter가 App.class에 복사되지 않는다)
        Path ok = base.resolve("true-true");
        try (var st = Files.list(ok)) {
            System.out.println("FACT classes => " + st.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".class")).sorted().collect(Collectors.joining(" / ")));
        }
        // 사실: 클래스패스를 greet.jar만 주고 "."을 빼면 현재 폴더의 App.class를 찾지 못한다
        r = exec(ok, List.of("java", "-cp", "greet.jar", "App"));
        System.out.println("FACT nodot => " + r[0] + "|" + firstLine(r[2]));
    }
}
