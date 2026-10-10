import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

// "제네릭" 실습의 스무 가지 조합(변수 list의 선언 5 × list로 하는 일 4)을 실제로 컴파일하고 실행한다.
// 조합마다 화면의 코드를 main 안에 넣은 Main.java를 verify/out/generic/cases/<조합>/ 에 만들어 javac -Xlint:unchecked 로 컴파일하고,
// 성공하면 별도의 java 프로세스로 실행한다.
// 출력: 선언|하는 일 => 컴파일|오류가 난 줄|오류 메시지|경고가 난 줄|경고 메시지|표준 출력|종료 코드|표준 오류 첫 줄|예외가 난 줄
//       # src 선언|하는 일 :: main 안에 넣은 코드 (줄바꿈은 \n으로 적음. 화면의 코드와 같은지 대조하는 데 쓴다)
public class GenericProbe {
    static final Path BASE = Path.of("verify", "out", "generic", "cases");

    // 화면에 보이는 코드와 같은 조각
    static String fragment(String decl, String op) {
        String d = switch (decl) {
            case "raw" -> "List list = ints;";
            case "int" -> "List<Integer> list = ints;";
            case "num" -> "List<Number> list = ints;";
            case "ext" -> "List<? extends Number> list = ints;";
            default -> "List<? super Integer> list = ints;";
        };
        String o = switch (op) {
            case "addInt" -> "list.add(3);";
            case "addDbl" -> "list.add(3.5);";
            case "addStr" -> "list.add(\"삼\");";
            default -> "Number n = list.get(0);\nSystem.out.println(\"꺼낸 값: \" + n);";
        };
        return "List<Integer> ints = new ArrayList<>();\n"
            + "ints.add(1);\n"
            + "ints.add(2);\n"
            + "\n"
            + d + "\n"
            + o + "\n"
            + "\n"
            + "System.out.println(ints);\n"
            + "List<String> strs = new ArrayList<>();\n"
            + "System.out.println(ints.getClass() == strs.getClass());\n"
            + "Integer last = ints.get(ints.size() - 1);\n"
            + "System.out.println(\"마지막 값: \" + last);";
    }

    static String wrap(String fragment) {
        StringBuilder s = new StringBuilder("import java.util.ArrayList;\nimport java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n");
        for (String line : fragment.split("\n", -1)) s.append(line.isEmpty() ? "" : "        " + line).append("\n");
        return s.append("    }\n}\n").toString();
    }

    static String compileAndRun(String key, String src) throws Exception {
        Path dir = BASE.resolve(key.replace('|', '_'));
        Files.createDirectories(dir);
        Path file = dir.resolve("Main.java");
        Files.writeString(file, src, StandardCharsets.UTF_8);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diags = new DiagnosticCollector<>();
        boolean ok;
        try (StandardJavaFileManager fm = javac.getStandardFileManager(diags, Locale.ENGLISH, StandardCharsets.UTF_8)) {
            ok = javac.getTask(null, fm, diags, List.of("-d", dir.toString(), "-encoding", "UTF-8", "-Xlint:unchecked"), null, fm.getJavaFileObjects(file)).call();
        }
        String[] lines = src.split("\n");
        List<String> errLines = new ArrayList<>(), errMsgs = new ArrayList<>(), warnLines = new ArrayList<>(), warnMsgs = new ArrayList<>();
        for (Diagnostic<? extends JavaFileObject> d : diags.getDiagnostics()) {
            boolean err = d.getKind() == Diagnostic.Kind.ERROR, warn = d.getKind() == Diagnostic.Kind.WARNING || d.getKind() == Diagnostic.Kind.MANDATORY_WARNING;
            if (!err && !warn) continue;
            (err ? errLines : warnLines).add(d.getLineNumber() > 0 ? lines[(int) d.getLineNumber() - 1].trim() : "?");
            (err ? errMsgs : warnMsgs).add(d.getMessage(Locale.ENGLISH).split("\n")[0].trim());
        }
        String diag = join(errLines) + "|" + join(errMsgs) + "|" + join(warnLines) + "|" + join(warnMsgs);
        if (!ok) return "ERROR|" + diag + "|-|-|-|-";
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        Process p = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), "Main")
            .redirectError(dir.resolve("stderr.txt").toFile()).redirectOutput(dir.resolve("stdout.txt").toFile()).start();
        int exit = p.waitFor();
        List<String> out = Files.readAllLines(dir.resolve("stdout.txt"), StandardCharsets.UTF_8);
        List<String> err = Files.readAllLines(dir.resolve("stderr.txt"), StandardCharsets.UTF_8);
        // 스택 트레이스의 "at Main.main(Main.java:줄)"에서 예외가 난 소스 줄을 찾는다
        String at = "-";
        for (String e : err) {
            int i = e.indexOf("at Main.main(Main.java:");
            if (i >= 0) { at = lines[Integer.parseInt(e.substring(i + 23, e.indexOf(')', i))) - 1].trim(); break; }
        }
        return "OK|" + diag + "|" + (out.isEmpty() ? "-" : String.join(" / ", out)) + "|" + exit + "|" + (err.isEmpty() ? "-" : err.get(0).trim()) + "|" + at;
    }
    static String join(List<String> xs) { return xs.isEmpty() ? "-" : String.join(" ## ", xs); }

    public static void main(String[] args) throws Exception {
        for (String decl : new String[] { "raw", "int", "num", "ext", "sup" })
            for (String op : new String[] { "addInt", "addDbl", "addStr", "get" }) {
                String key = decl + "|" + op, frag = fragment(decl, op);
                System.out.println(key + " => " + compileAndRun(key, wrap(frag)));
                System.out.println("# src " + key + " :: " + frag.replace("\n", "\\n"));
            }
    }
}
