import java.io.IOException;
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

// "체크 예외와 언체크 예외" 실습의 24가지 조합(예외 2 × 처리 방식 6 × 실제 발생 여부 2)을 실제로 컴파일하고 실행한다.
// 조합마다 Main.java를 verify/out/chkex/cases/<조합>/ 에 만들어 javac로 컴파일하고, 성공하면 별도의 java 프로세스로 실행한다.
// 출력: 예외|처리|발생 => 컴파일|오류가 난 줄|컴파일러 메시지|표준 출력|종료 코드|표준 오류 첫 줄
//       # src 예외|처리|발생 :: 컴파일한 소스 (줄바꿈은 \n으로 적음. 화면의 코드와 같은지 대조하는 데 쓴다)
public class ChkExProbe {
    static final Path BASE = Path.of("verify", "out", "chkex", "cases");

    // 화면에 보이는 코드와 같은 모양의 소스를 만든다
    static String source(String ex, String how, boolean occur) {
        String type = ex.equals("io") ? "IOException" : "IllegalStateException";
        boolean readThrows = how.equals("throws") || how.equals("throws2") || how.equals("throwscatch");
        StringBuilder s = new StringBuilder();
        if (ex.equals("io")) s.append("import java.io.IOException;\n\n");
        s.append("public class Main {\n");
        s.append("    static String read(boolean missing)").append(readThrows ? " throws " + type : "").append(" {\n");
        if (how.equals("catch") || how.equals("wrap")) {
            s.append("        try {\n");
            s.append("            if (missing) throw new ").append(type).append("(\"파일 없음\");\n");
            s.append("            return \"내용\";\n");
            s.append("        } catch (").append(type).append(" e) {\n");
            if (how.equals("catch")) {
                s.append("            System.out.println(\"read에서 잡음: \" + e.getMessage());\n");
                s.append("            return \"기본값\";\n");
            } else {
                s.append("            throw new RuntimeException(e);\n");
            }
            s.append("        }\n");
        } else {
            s.append("        if (missing) throw new ").append(type).append("(\"파일 없음\");\n");
            s.append("        return \"내용\";\n");
        }
        s.append("    }\n\n");
        s.append("    public static void main(String[] args)").append(how.equals("throws2") ? " throws " + type : "").append(" {\n");
        if (how.equals("throwscatch")) {
            s.append("        try {\n");
            s.append("            String s = read(").append(occur).append(");\n");
            s.append("            System.out.println(\"읽음: \" + s);\n");
            s.append("        } catch (").append(type).append(" e) {\n");
            s.append("            System.out.println(\"main에서 잡음: \" + e.getMessage());\n");
            s.append("        }\n");
        } else {
            s.append("        String s = read(").append(occur).append(");\n");
            s.append("        System.out.println(\"읽음: \" + s);\n");
        }
        s.append("        System.out.println(\"main 끝\");\n");
        s.append("    }\n");
        s.append("}");
        return s.toString();
    }

    // 소스를 컴파일하고(오류면 그 줄과 메시지), 성공하면 새 JVM에서 실행해 출력과 종료 코드를 얻는다
    static String compileAndRun(String key, String src) throws Exception {
        Path dir = BASE.resolve(key.replace('|', '_'));
        Files.createDirectories(dir);
        Path file = dir.resolve("Main.java");
        Files.writeString(file, src, StandardCharsets.UTF_8);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diags = new DiagnosticCollector<>();
        boolean ok;
        try (StandardJavaFileManager fm = javac.getStandardFileManager(diags, Locale.ENGLISH, StandardCharsets.UTF_8)) {
            ok = javac.getTask(null, fm, diags, List.of("-d", dir.toString(), "-encoding", "UTF-8"), null, fm.getJavaFileObjects(file)).call();
        }
        String[] lines = src.split("\n");
        List<String> errLines = new ArrayList<>(), errMsgs = new ArrayList<>();
        for (Diagnostic<? extends JavaFileObject> d : diags.getDiagnostics()) {
            if (d.getKind() != Diagnostic.Kind.ERROR) continue;
            errLines.add(lines[(int) d.getLineNumber() - 1].trim());
            errMsgs.add(d.getMessage(Locale.ENGLISH).split("\n")[0].trim());
        }
        if (!ok) return "ERROR|" + String.join(" ## ", errLines) + "|" + String.join(" ## ", errMsgs) + "|-|-|-";
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        Process p = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), "Main")
            .redirectError(dir.resolve("stderr.txt").toFile()).redirectOutput(dir.resolve("stdout.txt").toFile()).start();
        int exit = p.waitFor();
        List<String> out = Files.readAllLines(dir.resolve("stdout.txt"), StandardCharsets.UTF_8);
        List<String> err = Files.readAllLines(dir.resolve("stderr.txt"), StandardCharsets.UTF_8);
        return "OK|-|-|" + (out.isEmpty() ? "-" : String.join(" / ", out)) + "|" + exit + "|" + (err.isEmpty() ? "-" : err.get(0).trim());
    }

    public static void main(String[] args) throws Exception {
        for (String ex : new String[] { "io", "rt" })
            for (String how : new String[] { "none", "catch", "throws", "throws2", "throwscatch", "wrap" })
                for (boolean occur : new boolean[] { true, false }) {
                    String key = ex + "|" + how + "|" + occur, src = source(ex, how, occur);
                    System.out.println(key + " => " + compileAndRun(key, src));
                    System.out.println("# src " + key + " :: " + src.replace("\n", "\\n"));
                }
        // 실습의 설정에는 없지만 글에서 말하는 사실: Error 계열도 컴파일러가 처리를 강제하지 않는다 / Exception 자체는 체크 예외다
        String err = source("rt", "none", true).replace("IllegalStateException(\"파일 없음\")", "StackOverflowError()");
        System.out.println("extra|error-none => " + compileAndRun("extra|error-none", err));
        String exc = source("rt", "none", true).replace("IllegalStateException(\"파일 없음\")", "Exception(\"파일 없음\")");
        System.out.println("extra|exception-none => " + compileAndRun("extra|exception-none", exc));
    }
}
