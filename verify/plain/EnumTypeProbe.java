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

// "열거형(enum)" 실습의 45가지 조합(저장 방식 3 × 선언의 변경 5 × 저장해 둔 상수 3)을 실제로 컴파일하고 실행한다.
// 저장해 둔 값은 이 파일의 예전 선언(Old)에서 실제로 ordinal(), name(), code를 불러 얻는다.
// 조합마다 화면의 코드(바뀐 enum 선언 + main 안의 코드)로 Main.java를 verify/out/enumtype/cases/<조합>/ 에 만들어 컴파일하고 별도의 java 프로세스로 실행한다.
// 출력: 저장 방식|변경|상수 => 저장해 둔 값|컴파일|표준 출력|종료 코드|표준 오류 첫 줄
//       # src 저장 방식|변경|상수 :: 화면의 코드 (줄바꿈은 \n으로 적음. 화면의 코드와 같은지 대조하는 데 쓴다)
public class EnumTypeProbe {
    static final Path BASE = Path.of("verify", "out", "enumtype", "cases");

    // 예전 선언: 저장할 때의 enum
    enum Old {
        ORDERED("O", "주문 접수"), PAID("P", "결제 완료"), SHIPPED("S", "배송 시작");
        final String code, label;
        Old(String code, String label) { this.code = code; this.label = label; }
    }

    // 바뀐 뒤의 상수 목록: { 이름, code, label }
    static String[][] constants(String change) {
        String[] o = { "ORDERED", "O", "주문 접수" }, p = { "PAID", "P", "결제 완료" }, s = { "SHIPPED", "S", "배송 시작" }, x = { "CANCELED", "C", "주문 취소" };
        return switch (change) {
            case "append" -> new String[][] { o, p, s, x };
            case "insert" -> new String[][] { o, x, p, s };
            case "swap" -> new String[][] { p, o, s };
            case "rename" -> new String[][] { o, { "PAYMENT_DONE", "P", "결제 완료" }, s };
            default -> new String[][] { o, p, s };
        };
    }

    // 화면에 보이는 enum 선언
    static String enumDecl(String store, String change) {
        String[][] cs = constants(change);
        boolean code = store.equals("code");
        StringBuilder s = new StringBuilder("enum Status {\n");
        for (int i = 0; i < cs.length; i++)
            s.append("    ").append(cs[i][0]).append("(").append(code ? "\"" + cs[i][1] + "\", " : "").append("\"").append(cs[i][2]).append("\")").append(i < cs.length - 1 ? "," : ";").append("\n");
        s.append("\n");
        if (code) s.append("    private final String code;\n");
        s.append("    private final String label;\n\n");
        if (code) s.append("    Status(String code, String label) {\n        this.code = code;\n        this.label = label;\n    }\n\n");
        else s.append("    Status(String label) {\n        this.label = label;\n    }\n\n");
        s.append("    String label() {\n        return label;\n    }\n");
        if (code) s.append("\n    static Status fromCode(String code) {\n        for (Status s : values()) {\n            if (s.code.equals(code)) return s;\n        }\n        throw new IllegalArgumentException(\"없는 코드: \" + code);\n    }\n");
        return s.append("}").toString();
    }

    // 화면에 보이는 main 안의 코드. savedValue는 예전 선언에서 실제로 얻은 값
    static String mainPart(String store, String change, String saved, String savedValue) {
        String now = change.equals("rename") && saved.equals("PAID") ? "PAYMENT_DONE" : saved;
        String s = switch (store) {
            case "ordinal" -> "int saved = " + savedValue + ";\nStatus s = Status.values()[saved];\n";
            case "name" -> "String saved = \"" + savedValue + "\";\nStatus s = Status.valueOf(saved);\n";
            default -> "String saved = \"" + savedValue + "\";\nStatus s = Status.fromCode(saved);\n";
        };
        String how = store.equals("ordinal") ? saved + ".ordinal()" : store.equals("name") ? saved + ".name()" : saved + "의 code";
        String note = "// 예전 선언(ORDERED, PAID, SHIPPED 순서)일 때 " + how + " 값을 저장해 둔 것\n";
        return note + s + "System.out.println(s + \" (\" + s.label() + \")\");\nSystem.out.println(s == Status." + now + ");";
    }

    static String wrap(String enumDecl, String mainPart) {
        StringBuilder s = new StringBuilder(enumDecl).append("\n\npublic class Main {\n    public static void main(String[] args) {\n");
        for (String line : mainPart.split("\n", -1)) s.append(line.isEmpty() ? "" : "        " + line).append("\n");
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
            ok = javac.getTask(null, fm, diags, List.of("-d", dir.toString(), "-encoding", "UTF-8"), null, fm.getJavaFileObjects(file)).call();
        }
        if (!ok) {
            List<String> msgs = new ArrayList<>();
            for (Diagnostic<? extends JavaFileObject> d : diags.getDiagnostics()) if (d.getKind() == Diagnostic.Kind.ERROR) msgs.add(d.getMessage(Locale.ENGLISH).split("\n")[0].trim());
            return "ERROR " + String.join(" ## ", msgs) + "|-|-|-";
        }
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        Process p = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), "Main")
            .redirectError(dir.resolve("stderr.txt").toFile()).redirectOutput(dir.resolve("stdout.txt").toFile()).start();
        int exit = p.waitFor();
        List<String> out = Files.readAllLines(dir.resolve("stdout.txt"), StandardCharsets.UTF_8);
        List<String> err = Files.readAllLines(dir.resolve("stderr.txt"), StandardCharsets.UTF_8);
        return "OK|" + (out.isEmpty() ? "-" : String.join(" / ", out)) + "|" + exit + "|" + (err.isEmpty() ? "-" : err.get(0).trim());
    }

    public static void main(String[] args) throws Exception {
        for (String store : new String[] { "ordinal", "name", "code" })
            for (String change : new String[] { "same", "append", "insert", "swap", "rename" })
                for (String saved : new String[] { "ORDERED", "PAID", "SHIPPED" }) {
                    Old old = Old.valueOf(saved);
                    String savedValue = store.equals("ordinal") ? String.valueOf(old.ordinal()) : store.equals("name") ? old.name() : old.code;
                    String key = store + "|" + change + "|" + saved, decl = enumDecl(store, change), body = mainPart(store, change, saved, savedValue);
                    System.out.println(key + " => " + savedValue + "|" + compileAndRun(key, wrap(decl, body)));
                    System.out.println("# src " + key + " :: " + (decl + "\n\n" + body).replace("\n", "\\n"));
                }
        // 글에서 말하는 사실: 같은 상수는 어떤 방법으로 얻어도 같은 객체다 / valueOf는 대소문자가 다르면 찾지 못한다
        Old a = Old.valueOf("PAID"), b = Old.values()[1];
        System.out.println("extra|same-object => " + (a == b && b == Old.PAID));
        String lower;
        try { lower = String.valueOf(Old.valueOf("paid")); } catch (IllegalArgumentException e) { lower = e.toString(); }
        System.out.println("extra|valueOf-lowercase => " + lower);
        // ==는 한쪽이 null이어도 예외 없이 false다 / 서로 다른 enum 타입을 ==로 비교하면 컴파일 오류다
        Old none = null;
        System.out.println("extra|null-eq => " + (none == Old.PAID));
        String cross = "enum A { X }\nenum B { Y }\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(A.X == B.Y);\n    }\n}\n";
        System.out.println("extra|cross-enum-eq => " + compileAndRun("extra|cross-enum-eq", cross));
        // 상수를 지운 경우(실습의 설정에는 없음): PAID를 지우면 번호 1은 뒤의 상수가 당겨져 나오고, 번호 2는 배열 범위를 벗어나며, 이름 "PAID"는 valueOf가 예외를 던진다
        String removed = "enum Status { ORDERED, SHIPPED }\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(EXPR);\n    }\n}\n";
        System.out.println("extra|removed-ordinal-1 => " + compileAndRun("extra|removed-ordinal-1", removed.replace("EXPR", "Status.values()[1]")));
        System.out.println("extra|removed-ordinal-2 => " + compileAndRun("extra|removed-ordinal-2", removed.replace("EXPR", "Status.values()[2]")));
        System.out.println("extra|removed-name => " + compileAndRun("extra|removed-name", removed.replace("EXPR", "Status.valueOf(\"PAID\")")));
    }
}
