import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.FileObject;
import javax.tools.ForwardingJavaFileManager;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

// "접근 제어자와 캡슐화" 실습의 스물네 가지 조합(멤버의 접근 제어자 4 × 접근하는 곳 6)을 실제로 컴파일한다.
// 조합마다 패키지가 나뉜 소스 파일 두 개(bank/Account.java와 접근하는 클래스)를 만들어 메모리에서 함께 컴파일하고,
// 성공 여부와 javac의 오류 메시지 첫 줄을 얻는다. 같은 조합을 필드 대신 메서드로도 컴파일해 규칙이 같은지 본다.
// 출력: 접근 제어자|접근하는 곳 => 컴파일 결과|오류 개수|오류 메시지
//       SRC 로 시작하는 줄은 그 조합에서 컴파일한 소스(화면의 코드와 같은지 cmp_access.js가 비교한다)
//       M 으로 시작하는 줄은 필드를 메서드 getBalance()로 바꿔 컴파일한 결과
public class AccessProbe {
    // ---- 메모리에서 컴파일하는 도구 ----
    static class Src extends SimpleJavaFileObject {
        final String code;
        Src(String name, String code) { super(URI.create("string:///" + name.replace('.', '/') + ".java"), Kind.SOURCE); this.code = code; }
        @Override public CharSequence getCharContent(boolean ignore) { return code; }
    }
    static class Out extends SimpleJavaFileObject {
        final ByteArrayOutputStream bos = new ByteArrayOutputStream();
        Out(String name) { super(URI.create("mem:///" + name.replace('.', '/') + ".class"), Kind.CLASS); }
        @Override public OutputStream openOutputStream() { return bos; }
    }
    static class Mem extends ForwardingJavaFileManager<StandardJavaFileManager> {
        final Map<String, Out> out = new HashMap<>();
        Mem(StandardJavaFileManager m) { super(m); }
        @Override public JavaFileObject getJavaFileForOutput(Location l, String cn, JavaFileObject.Kind k, FileObject sib) { Out o = new Out(cn); out.put(cn, o); return o; }
    }
    static class Res { boolean ok; String err = ""; int errCount; }

    // sources: 클래스 이름(패키지 포함) → 소스. 모두 한 번에 컴파일한다.
    static Res compile(Map<String, String> sources) {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        Mem fm = new Mem(jc.getStandardFileManager(dc, Locale.ENGLISH, StandardCharsets.UTF_8));
        List<JavaFileObject> units = new ArrayList<>();
        sources.forEach((n, s) -> units.add(new Src(n, s)));
        Res r = new Res();
        r.ok = jc.getTask(null, fm, dc, List.of("-proc:none"), null, units).call();
        for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) {
            if (d.getKind() != Diagnostic.Kind.ERROR) continue;
            if (r.errCount++ == 0) r.err = d.getMessage(Locale.ENGLISH).split("\\R")[0].replaceAll(";$", "");
        }
        return r;
    }

    // ---- 이 실습의 소스 ----
    // method가 true이면 필드 balance 대신 메서드 getBalance()에 접근 제어자를 붙이고, 접근하는 쪽도 메서드를 부른다
    static Map<String, String> sources(String mod, String from, boolean method) {
        String m = mod.equals("package") ? "" : mod + " ";
        String member = method ? "    " + m + "int getBalance() {\n        return 1000;\n    }\n" : "    " + m + "int balance = 1000;\n";
        String use = method ? "getBalance()" : "balance";
        String account = "package bank;\n\npublic class Account {\n" + member
            + (from.equals("same") ? "\n    int read() {\n        return this." + use + ";\n    }\n" : "") + "}\n";
        Map<String, String> s = new LinkedHashMap<>();
        s.put("bank.Account", account);
        if (from.equals("pkg")) s.put("bank.Teller", "package bank;\n\npublic class Teller {\n    int read(Account acc) {\n        return acc." + use + ";\n    }\n}\n");
        if (from.startsWith("sub")) {
            String body = from.equals("subThis") ? "    int read() {\n        return this." + use + ";\n    }\n"
                : from.equals("subChild") ? "    int read(SavingAccount other) {\n        return other." + use + ";\n    }\n"
                : "    int read(Account other) {\n        return other." + use + ";\n    }\n";
            s.put("app.SavingAccount", "package app;\n\nimport bank.Account;\n\npublic class SavingAccount extends Account {\n" + body + "}\n");
        }
        if (from.equals("other")) s.put("app.Report", "package app;\n\nimport bank.Account;\n\npublic class Report {\n    int read(Account acc) {\n        return acc." + use + ";\n    }\n}\n");
        return s;
    }

    public static void main(String[] args) {
        String[] mods = { "private", "package", "protected", "public" }, froms = { "same", "pkg", "subThis", "subChild", "subParent", "other" };
        for (String mod : mods)
            for (String from : froms) {
                String key = mod + "|" + from;
                Map<String, String> src = sources(mod, from, false);
                Res r = compile(src);
                System.out.println("SRC " + key + " => " + String.join("\n", src.values()).replace("\n", "\\n"));
                System.out.println(key + " => " + (r.ok ? "성공" : "오류") + "|" + r.errCount + "|" + (r.ok ? "-" : r.err));
            }
        for (String mod : mods)
            for (String from : froms) {
                Res r = compile(sources(mod, from, true));
                System.out.println("M " + mod + "|" + from + " => " + (r.ok ? "성공" : "오류") + "|" + r.errCount + "|" + (r.ok ? "-" : r.err));
            }
    }
}
