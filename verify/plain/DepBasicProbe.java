import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

// 기초개념 "라이브러리와 의존성" 실습(dep_basic)의 아홉 가지 조합을 실제로 실행한다(2026-10-22, 표준 중심으로 다시 짠 판).
//   컴파일하는 javac 명령의 -cp 3가지(잭슨 jar 세 개 모두 / jackson-core만 뺌 / 하나도 없음) x 실행하는 java 명령의 -cp 3가지.
// 라이브러리는 실제로 받아 둔 잭슨 jar(jackson-databind 3.1.5, jackson-core 3.1.5, jackson-annotations 2.21)를 쓴다. 새로 내려받지 않는다.
// 조합마다 새 폴더에 jar 세 개를 복사하고 App.java를 쓴 뒤, 화면에 적힌 터미널 명령(javac ..., java ...)을 그대로 실행한다.
// 컴파일이 실패해도 java 명령을 그대로 실행해 무슨 일이 생기는지 본다.
// 화면의 코드(실습의 code 함수)와 같은 글은 조합 폴더의 screen.txt에 Probe가 실제 파일과 실제 명령에서 만들어 남긴다.
// CLASSPATH 환경 변수는 자식 프로세스에서 지운다.
// (옛 판은 직접 만든 greet.jar로 네 가지 조합을 실행했다. 그 결과는 DepBasicProbe.out.txt와 verify/out/dep_basic/에 그대로 있다.)
// 사용(저장소 루트에서): java -Dstdout.encoding=UTF-8 verify/plain/DepBasicProbe.java <잭슨 jar 폴더> [출력 폴더] > verify/plain/dep_basic_probe.out.txt
// 출력: compile|run => 컴파일(OK/ERR)|오류 개수|진단 코드(쉼표)|오류가 난 줄(줄번호:내용, ## 로 구분)|App.class가 있는가|
//        java 종료 코드|java 표준 출력|java 오류 출력 첫 줄|오류 출력에서 App.main이 나오는 줄|javac 메시지(## 로 구분)|컴파일 전 폴더의 파일들
// 끝에 FACT 줄: 단계 문장이 기대는 사실.
public class DepBasicProbe {
    static final String D = "jackson-databind-3.1.5.jar", C = "jackson-core-3.1.5.jar", A = "jackson-annotations-2.21.jar";
    static final String APP = String.join("\n",
        "import java.util.Map;",
        "import tools.jackson.databind.ObjectMapper; // 잭슨 라이브러리(jackson-databind)가 주는 클래스",
        "",
        "public class App {",
        "    public static void main(String[] args) {",
        "        ObjectMapper mapper = new ObjectMapper();",
        "        String json = mapper.writeValueAsString(Map.of(\"name\", \"kim\")); // Map을 JSON 글로 바꾼다",
        "        System.out.println(json);",
        "    }",
        "}") + "\n";
    static final String GRADLE = String.join("\n",
        "dependencies {",
        "    implementation 'tools.jackson.core:jackson-databind:3.1.5'",
        "}") + "\n";
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

    static String jars(String which) {
        return switch (which) { case "all" -> D + ";" + C + ";" + A; case "nocore" -> D + ";" + A; default -> ""; };
    }

    static String files(Path dir) throws Exception {
        try (var st = Files.list(dir)) { return st.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".java") || n.endsWith(".jar") || n.endsWith(".class")).sorted().collect(Collectors.joining(" / ")); }
    }

    public static void main(String[] argv) throws Exception {
        Path libs = Path.of(argv.length > 0 ? argv[0] : "E:/dev/java-interview-lab/verify/spring/libs");
        Path base = Path.of(argv.length > 1 ? argv[1] : "verify/out/dep_basic_v2");
        Files.createDirectories(base);
        System.out.println("# java " + System.getProperty("java.version"));
        String[] kinds = { "all", "nocore", "none" };
        for (String cc : kinds)
            for (String rc : kinds) {
                Path dir = base.resolve(cc + "-" + rc);
                Files.createDirectories(dir);
                Files.deleteIfExists(dir.resolve("App.class"));
                for (String j : new String[] { D, C, A }) Files.copy(libs.resolve(j), dir.resolve(j), StandardCopyOption.REPLACE_EXISTING);
                Files.writeString(dir.resolve("App.java"), APP, StandardCharsets.UTF_8);
                List<String> javac = new ArrayList<>(List.of("javac"));
                if (!cc.equals("none")) { javac.add("-cp"); javac.add(jars(cc)); }
                javac.add("App.java");
                List<String> jcmd = List.of("java", "-cp", rc.equals("none") ? "." : jars(rc) + ";.", "App");
                String screen = "# App.java\n" + Files.readString(dir.resolve("App.java"), StandardCharsets.UTF_8)
                    + "\n# 터미널 (잭슨 jar 세 개를 받아 둔 폴더에서)\n" + String.join(" ", javac) + "\n" + String.join(" ", jcmd) + "\n"
                    + "\n# build.gradle (Gradle을 쓰면 jar를 받아 -cp에 적는 일을 이 한 줄이 대신한다)\n" + GRADLE;
                Files.writeString(dir.resolve("screen.txt"), screen, StandardCharsets.UTF_8);
                String before = files(dir);
                String[] c = exec(dir, javac);
                boolean ok = c[0].equals("0");
                // 같은 명령에 진단 코드만 얻는 옵션을 더해 한 번 더(결과 파일은 다른 폴더에)
                List<String> raw = new ArrayList<>(javac);
                raw.add(1, "-XDrawDiagnostics"); raw.add(1, "rawout"); raw.add(1, "-d");
                Files.createDirectories(dir.resolve("rawout"));
                String[] r2 = exec(dir, raw);
                String[] src = APP.split("\n");
                List<String> codes = new ArrayList<>(), where = new ArrayList<>();
                for (String ln : (r2[1] + r2[2]).split("\n")) {
                    Matcher m = Pattern.compile("^App\\.java:(\\d+):(\\d+): (compiler\\.err\\.[a-z.]+)").matcher(ln);
                    if (m.find()) { codes.add(m.group(3)); where.add(m.group(1) + ":" + src[Integer.parseInt(m.group(1)) - 1].strip()); }
                }
                boolean exists = Files.exists(dir.resolve("App.class"));
                String[] j = exec(dir, jcmd);
                String appLine = "-";
                for (String ln : j[2].split("\n")) if (ln.strip().startsWith("at App.main(")) { appLine = ln.strip(); break; }
                String msgs = (c[1] + c[2]).lines().filter(l -> l.startsWith("App.java:") || l.strip().startsWith("class file for") || l.strip().startsWith("symbol:")).map(String::strip).collect(Collectors.joining(" ## "));
                Files.writeString(dir.resolve("javac.out.txt"), c[1] + c[2], StandardCharsets.UTF_8);
                Files.writeString(dir.resolve("java.out.txt"), "exit " + j[0] + "\nstdout: " + j[1] + "stderr: " + j[2], StandardCharsets.UTF_8);
                System.out.println(cc + "|" + rc + " => " + (ok ? "OK" : "ERR") + "|" + codes.size() + "|" + String.join(",", codes) + "|" + (where.isEmpty() ? "-" : String.join(" ## ", where))
                    + "|" + exists + "|" + j[0] + "|" + (j[1].strip().isEmpty() ? "-" : j[1].strip()) + "|" + firstLine(j[2]) + "|" + appLine + "|" + (msgs.isEmpty() ? "-" : msgs) + "|" + before);
            }
        Path ok = base.resolve("all-all");
        // 사실: 각 jar가 가진 클래스 파일(화면 설명에 나오는 것)
        String[] r = exec(ok, List.of("jar", "tf", D));
        System.out.println("FACT databind_has_ObjectMapper => " + r[1].lines().anyMatch(l -> l.equals("tools/jackson/databind/ObjectMapper.class")));
        r = exec(ok, List.of("jar", "tf", C));
        System.out.println("FACT core_has_TreeCodec => " + r[1].lines().anyMatch(l -> l.equals("tools/jackson/core/TreeCodec.class")));
        r = exec(ok, List.of("jar", "tf", A));
        System.out.println("FACT annotations_has_JsonSerializeAs => " + r[1].lines().anyMatch(l -> l.equals("com/fasterxml/jackson/annotation/JsonSerializeAs.class")));
        // 사실: ObjectMapper는 jackson-core의 TreeCodec을 구현한다(javap). 그래서 ObjectMapper를 쓰려면 jackson-core도 필요하다.
        r = exec(ok, List.of("javap", "-cp", jars("all"), "tools.jackson.databind.ObjectMapper"));
        String decl = r[1].lines().filter(l -> l.startsWith("public class tools.jackson.databind.ObjectMapper")).findFirst().orElse("-");
        System.out.println("FACT ObjectMapper_decl => " + decl.strip());
        // 사실: jackson-databind jar에 함께 묶인 pom.xml(이 라이브러리의 좌표와, 이 라이브러리가 쓰는 라이브러리 목록). test 범위는 뺀다.
        r = exec(ok, List.of("jar", "tf", D));
        String pomPath = r[1].lines().filter(l -> l.startsWith("META-INF/maven/") && l.endsWith("/pom.xml")).findFirst().orElseThrow();
        Path pomDir = base.resolve("_pom");
        Files.createDirectories(pomDir);
        exec(pomDir, List.of("jar", "xf", ok.resolve(D).toAbsolutePath().toString(), pomPath));
        var doc = javax.xml.parsers.DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(pomDir.resolve(pomPath).toFile());
        var proj = doc.getDocumentElement();
        System.out.println("FACT databind_coordinate => " + child(proj, "groupId") + ":" + child(proj, "artifactId") + ":" + child(proj, "version"));
        List<String> deps = new ArrayList<>();
        for (var n = proj.getFirstChild(); n != null; n = n.getNextSibling())
            if (n instanceof org.w3c.dom.Element e && e.getTagName().equals("dependencies"))
                for (var d = e.getFirstChild(); d != null; d = d.getNextSibling())
                    if (d instanceof org.w3c.dom.Element de && de.getTagName().equals("dependency") && !"test".equals(child(de, "scope")))
                        deps.add(child(de, "groupId") + ":" + child(de, "artifactId"));
        System.out.println("FACT databind_pom_deps => " + String.join(" / ", deps));
        // 사실: 컴파일에 성공한 폴더(all-all)에 생긴 클래스 파일은 App.class 하나뿐(잭슨 클래스가 복사되지 않는다)
        try (var st = Files.list(ok)) {
            System.out.println("FACT classes => " + st.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(".class")).sorted().collect(Collectors.joining(" / ")));
        }
        // 사실: 실행할 때 jar 세 개만 적고 점(.)을 빼면 현재 폴더의 App.class를 찾지 못한다
        r = exec(ok, List.of("java", "-cp", jars("all"), "App"));
        System.out.println("FACT nodot => " + r[0] + "|" + firstLine(r[2]));
        // 사실: 실행할 때 jackson-annotations만 빼면(databind와 core는 있음)
        r = exec(ok, List.of("java", "-cp", D + ";" + C + ";.", "App"));
        String app = r[2].lines().map(String::strip).filter(l -> l.startsWith("at App.main(")).findFirst().orElse("-");
        System.out.println("FACT noann => " + r[0] + "|" + firstLine(r[2]) + "|" + app);
        // 사실: 직접 만든 클래스도 jar로 묶으면 같은 방법으로 쓴다(lib.Greeter -> greet.jar)
        Path g = base.resolve("_greet");
        Files.createDirectories(g.resolve("src/lib"));
        Files.createDirectories(g.resolve("classes"));
        Files.writeString(g.resolve("src/lib/Greeter.java"), "package lib;\n\npublic class Greeter {\n    public static String hello(String name) {\n        return \"hello, \" + name;\n    }\n}\n", StandardCharsets.UTF_8);
        Files.writeString(g.resolve("Hello.java"), "import lib.Greeter;\n\npublic class Hello {\n    public static void main(String[] args) {\n        System.out.println(Greeter.hello(\"kim\"));\n    }\n}\n", StandardCharsets.UTF_8);
        Files.deleteIfExists(g.resolve("greet.jar"));
        String s1 = exec(g, List.of("javac", "-d", "classes", "src/lib/Greeter.java"))[0];
        String s2 = exec(g, List.of("jar", "cf", "greet.jar", "-C", "classes", "lib"))[0];
        String list = exec(g, List.of("jar", "tf", "greet.jar"))[1].strip().replace("\n", " / ");
        String s3 = exec(g, List.of("javac", "-cp", "greet.jar", "Hello.java"))[0];
        String[] hr = exec(g, List.of("java", "-cp", "greet.jar;.", "Hello"));
        System.out.println("FACT greet => " + s1 + s2 + s3 + hr[0] + "|" + list + "|" + hr[1].strip());
    }

    static String child(org.w3c.dom.Element e, String tag) {
        for (var n = e.getFirstChild(); n != null; n = n.getNextSibling())
            if (n instanceof org.w3c.dom.Element c && c.getTagName().equals(tag)) return c.getTextContent().strip();
        return "-";
    }
}
