import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "null" 실습의 여섯 가지 조합(담는 값 3 x if 확인 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일된 Main을 새 java 프로세스로 실행해 표준 출력, 표준 오류의 첫 줄, 종료 코드를 잡는다.
//   value : kim(문자열 "kim") / null / empty(빈 문자열 "")
//   check : true면 if (name != null)로 감싼다
// 출력: value|check => 컴파일(OK/ERR)|종료 코드|표준 출력(줄은 ' / '로 잇는다)|표준 오류 첫 줄|예외가 난 줄(소스의 그 줄 글)
// 끝에 FACT 줄을 더한다: 단계 문장이 기대는 사실.
//   FACT value <값> => isNull=<name == null>, length=<name.length() 또는 -> (값 세 개를 한 프로그램에서 잰다)
//   FACT assign => null을 담는 줄은 예외 없이 실행되고, 예외는 그다음 name.length() 줄에서 난다
// 조합마다 만든 소스는 verify/out/null_basic/<조합>/Main.java에 남긴다.
public class NullBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(String value, boolean check) {
        String v = value.equals("kim") ? "\"kim\"" : value.equals("null") ? "null" : "\"\"";
        StringBuilder s = new StringBuilder("public class Main {\n    public static void main(String[] args) {\n");
        s.append("        // 변수: 문자열 객체를 가리키거나, null이면 아무것도 가리키지 않는다\n");
        s.append("        String name = ").append(v).append(";\n");
        if (check) {
            s.append("        // 확인: name이 null이 아닐 때만 length()를 부른다\n");
            s.append("        if (name != null) {\n");
            s.append("            System.out.println(name.length());\n");
            s.append("        } else {\n");
            s.append("            System.out.println(\"이름 없음\");\n");
            s.append("        }\n");
        } else {
            s.append("        System.out.println(name.length());\n");
        }
        s.append("    }\n}\n");
        return s.toString();
    }

    static String factValues() {
        return "public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        String[] values = { \"kim\", null, \"\" };\n"
            + "        for (String name : values) {\n"
            + "            String len = name == null ? \"-\" : String.valueOf(name.length());\n"
            + "            System.out.println(\"isNull=\" + (name == null) + \" length=\" + len);\n"
            + "        }\n"
            + "    }\n}\n";
    }

    static String factAssign() {
        return "public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        String name = null;\n"
            + "        System.out.println(\"대입 끝\");\n"
            + "        System.out.println(name.length());\n"
            + "    }\n}\n";
    }

    static boolean compile(JavaCompiler jc, String src, Path dir) throws Exception {
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics())
            if (d.getKind() == Diagnostic.Kind.ERROR) System.out.println("# 컴파일 오류 " + d.getMessage(null));
        return ok;
    }

    // [종료 코드, 표준 출력, 표준 오류]
    static String[] runJava(Path dir) throws Exception {
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        ProcessBuilder pb = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8",
            "-cp", dir.toString(), "Main");
        Path outF = dir.resolve("stdout.txt"), errF = dir.resolve("stderr.txt");
        pb.redirectOutput(outF.toFile());
        pb.redirectError(errF.toFile());
        int code = pb.start().waitFor();
        String out = Files.readString(outF, StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
        String err = Files.readString(errF, StandardCharsets.UTF_8).strip().replace("\r\n", "\n");
        return new String[] { String.valueOf(code), out, err };
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/null_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String value : new String[] { "kim", "null", "empty" })
            for (boolean check : new boolean[] { false, true }) {
                String src = source(value, check);
                Path dir = Path.of(base, value + "-" + check);
                boolean ok = compile(jc, src, dir);
                String code = "-", out = "-", first = "-", where = "-";
                if (ok) {
                    String[] r = runJava(dir);
                    code = r[0];
                    out = r[1].isEmpty() ? "(없음)" : r[1];
                    String[] errLines = r[2].isEmpty() ? new String[0] : r[2].split("\n");
                    if (errLines.length > 0) first = errLines[0];
                    Matcher m = Pattern.compile("at Main\\.main\\(Main\\.java:(\\d+)\\)").matcher(r[2]);
                    if (m.find()) where = src.split("\n")[Integer.parseInt(m.group(1)) - 1].strip();
                }
                System.out.println(value + "|" + check + " => " + (ok ? "OK" : "ERR") + "|" + code + "|" + out + "|" + first + "|" + where);
            }
        // 사실 확인 1: 값 세 개의 name == null, length()
        Path d1 = Path.of(base, "fact-values");
        if (!compile(jc, factValues(), d1)) { System.out.println("FACT value => 컴파일 실패"); return; }
        String[] r1 = runJava(d1);
        String[] ls = r1[1].split(" / ");
        String[] names = { "kim", "null", "empty" };
        for (int i = 0; i < names.length; i++) System.out.println("FACT value " + names[i] + " => " + (i < ls.length ? ls[i] : "(없음)"));
        // 사실 확인 2: null을 담는 줄은 예외 없이 실행되고, 예외는 그다음 줄에서 난다
        Path d2 = Path.of(base, "fact-assign");
        if (!compile(jc, factAssign(), d2)) { System.out.println("FACT assign => 컴파일 실패"); return; }
        String[] r2 = runJava(d2);
        Matcher m = Pattern.compile("at Main\\.main\\(Main\\.java:(\\d+)\\)").matcher(r2[2]);
        String line = m.find() ? factAssign().split("\n")[Integer.parseInt(m.group(1)) - 1].strip() : "-";
        System.out.println("FACT assign => 출력 " + (r2[1].isEmpty() ? "(없음)" : r2[1]) + " | 종료 " + r2[0] + " | 예외가 난 줄 " + line);
    }
}
