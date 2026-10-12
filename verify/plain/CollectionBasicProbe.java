import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "List와 Map" 실습의 여섯 가지 조합(담는 그릇 2 x 꺼내거나 넣는 것 3)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 이 JDK의 java를 자식 프로세스로 띄워 Main을 실행해 표준 출력, 표준 오류, 종료 코드를 잡는다.
//   kind : list(List<String> names) / map(Map<String, Integer> ages)
//   ask  : has(있는 것을 꺼냄) / none(없는 것을 꺼냄: names.get(5) 또는 ages.get("park")) / dup("kim"을 한 번 더 넣음)
// 출력: kind|ask => 컴파일(OK/ERR)|오류 개수|종료 코드|표준 출력(여러 줄이면 " / ", 없으면 (없음))|
//        표준 오류의 첫 줄(없으면 -)|표준 오류의 줄 수|표준 출력 줄 수   (한 줄로 출력한다)
// 끝에 FACT 줄을 더한다: 단계 문장이 기대는 사실(번호는 0부터 담는 순서대로, get은 값을 없애지 않음,
// 같은 값을 또 담으면 List는 번호 2 자리에 따로 담김, Map의 put은 이전 값을 돌려주고 값을 바꿈, 없는 키는 containsKey가 false)을
// 따로 컴파일해 실행한 결과. 조합마다 만든 소스는 verify/out/collection_basic/<조합>/Main.java에, 실제 출력은 stdout.txt와 stderr.txt에 남긴다.
public class CollectionBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(String kind, String ask) {
        boolean list = kind.equals("list"), dup = ask.equals("dup"), none = ask.equals("none");
        StringBuilder s = new StringBuilder();
        s.append("// 컬렉션 클래스들이 들어 있는 java.util을 가져다 쓴다\n"
            + "import java.util.*;\n"
            + "\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) {\n");
        if (list) {
            s.append("        // List: 넣은 순서대로 줄 세워 담는 그릇. 처음에는 비어 있다\n"
                + "        List<String> names = new ArrayList<>();\n"
                + "        // 담기: add는 맨 뒤에 붙인다. 번호는 0부터 매겨진다\n"
                + "        names.add(\"kim\");\n"
                + "        names.add(\"lee\");\n");
            if (dup) s.append("        // 같은 값 \"kim\"을 한 번 더 담는다\n"
                + "        names.add(\"kim\");\n");
            s.append("        // 개수: size는 담긴 값의 개수를 돌려준다\n"
                + "        System.out.println(names.size());\n"
                + "        // 꺼내기: get은 그 번호 자리의 값을 돌려준다\n"
                + "        System.out.println(names.get(" + (none ? "5" : "0") + "));\n");
        } else {
            s.append("        // Map: 키와 값을 짝지어 담는 그릇. 처음에는 비어 있다\n"
                + "        Map<String, Integer> ages = new HashMap<>();\n"
                + "        // 담기: put은 키와 값을 짝지어 담는다\n"
                + "        ages.put(\"kim\", 20);\n"
                + "        ages.put(\"lee\", 30);\n");
            if (dup) s.append("        // 같은 키 \"kim\"으로 한 번 더 담는다\n"
                + "        ages.put(\"kim\", 25);\n");
            s.append("        // 개수: size는 담긴 짝의 개수를 돌려준다\n"
                + "        System.out.println(ages.size());\n"
                + "        // 꺼내기: get은 그 키와 짝지어진 값을 돌려준다\n"
                + "        System.out.println(ages.get(\"" + (none ? "park" : "kim") + "\"));\n");
        }
        s.append("    }\n}\n");
        return s.toString();
    }

    // 사실 확인용: List
    static String factList() {
        return "import java.util.*;\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        List<String> names = new ArrayList<>();\n"
            + "        names.add(\"kim\");\n"
            + "        names.add(\"lee\");\n"
            + "        System.out.println(names.indexOf(\"kim\") + \",\" + names.indexOf(\"lee\"));\n"
            + "        String x = names.get(0);\n"
            + "        System.out.println(names.size());\n"
            + "        names.add(\"kim\");\n"
            + "        System.out.println(names.get(2) + \",\" + names.indexOf(\"kim\") + \",\" + names.size());\n"
            + "    }\n}\n";
    }

    // 사실 확인용: Map
    static String factMap() {
        return "import java.util.*;\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        Map<String, Integer> ages = new HashMap<>();\n"
            + "        ages.put(\"kim\", 20);\n"
            + "        ages.put(\"lee\", 30);\n"
            + "        System.out.println(ages.put(\"kim\", 25));\n"
            + "        System.out.println(ages.get(\"kim\") + \",\" + ages.size());\n"
            + "        System.out.println(ages.get(\"park\"));\n"
            + "        System.out.println(ages.containsKey(\"park\") + \",\" + ages.get(\"lee\") + \",\" + ages.size());\n"
            + "    }\n}\n";
    }

    static String[] lines(String text) {
        text = text.replace("\r\n", "\n");
        if (text.isEmpty()) return new String[0];
        return text.stripTrailing().split("\n");
    }

    static String[] compileAndRun(JavaCompiler jc, String java, String src, Path dir) throws Exception {
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.deleteIfExists(dir.resolve("stdout.txt"));
        Files.deleteIfExists(dir.resolve("stderr.txt"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        long errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).count();
        if (!ok) return new String[] { "ERR", String.valueOf(errs), "-", "-", "-", "-", "-" };
        ProcessBuilder pb = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8",
            "-cp", dir.toString(), "Main");
        pb.redirectOutput(dir.resolve("stdout.txt").toFile());
        pb.redirectError(dir.resolve("stderr.txt").toFile());
        Process p = pb.start();
        if (!p.waitFor(60, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new IllegalStateException("시간 초과 " + dir); }
        String[] so = lines(Files.readString(dir.resolve("stdout.txt"), StandardCharsets.UTF_8));
        String[] se = lines(Files.readString(dir.resolve("stderr.txt"), StandardCharsets.UTF_8));
        return new String[] { "OK", String.valueOf(errs), String.valueOf(p.exitValue()), so.length == 0 ? "(없음)" : String.join(" / ", so),
            se.length == 0 ? "-" : se[0], String.valueOf(se.length), String.valueOf(so.length) };
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/collection_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String kind : new String[] { "list", "map" })
            for (String ask : new String[] { "has", "none", "dup" }) {
                String[] r = compileAndRun(jc, java, source(kind, ask), Path.of(base, kind + "-" + ask));
                System.out.println(kind + "|" + ask + " => " + String.join("|", r));
            }
        String[] fl = compileAndRun(jc, java, factList(), Path.of(base, "fact-list"));
        System.out.println("FACT list => " + fl[0] + "|" + fl[2] + "|" + fl[3] + "|" + fl[4]);
        String[] fm = compileAndRun(jc, java, factMap(), Path.of(base, "fact-map"));
        System.out.println("FACT map => " + fm[0] + "|" + fm[2] + "|" + fm[3] + "|" + fm[4]);
    }
}
