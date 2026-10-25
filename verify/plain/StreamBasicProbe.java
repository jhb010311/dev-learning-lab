import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "스트림" 실습의 여덟 가지 조합(방식 2 x filter 2 x map 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 코드(body)를 만들고, import와 class Main { main } 으로 감싸 javax.tools로 컴파일해 새 클래스 로더로 실행한다.
//   style  : stream(스트림으로) / for(같은 일을 for 문으로)
//   filter : filter 줄(for 문이면 if)이 있는가
//   map    : map 줄(for 문이면 * 10)이 있는가
// 출력: style|filter|map => 컴파일(OK/ERR)|result 출력|nums 출력|코드에 적은 단계(> 로 잇는다)
// 끝에 FACT 줄을 더한다. 단계 문장이 기대는 사실을 따로 잰 것이다.
//   FACT trace <조합> => 값 하나씩 filter/map(for 문이면 if/add)이 불린 순서(코드에 호출을 기록하는 줄을 더한 소스로 잰다)
//   FACT identity => 거르기도 바꾸기도 없는 스트림의 result가 nums와 같은 객체인지, 같은 값인지
// 조합마다 만든 소스는 verify/out/stream_basic/<조합>/Main.java, 화면에 보이는 글은 같은 폴더의 body.txt 에 남긴다.
public class StreamBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String body(String style, boolean filter, boolean map) {
        StringBuilder s = new StringBuilder("List<Integer> nums = List.of(1, 2, 3, 4, 5, 6);\n");
        if (style.equals("stream")) {
            s.append("// 스트림: nums의 값을 하나씩 흘려보내는 흐름을 만든다\n");
            s.append("List<Integer> result = nums.stream()\n");
            if (filter) s.append("    // 거르기: 짝수인 값만 통과시킨다\n    .filter(n -> n % 2 == 0)\n");
            if (map) s.append("    // 바꾸기: 통과한 값을 10배로 바꾼다\n    .map(n -> n * 10)\n");
            s.append("    // 모으기: 흘러나온 값을 새 리스트에 모은다\n    .toList();\n");
        } else {
            s.append("// 새 리스트: 결과를 모을 빈 리스트를 직접 만든다\n");
            s.append("List<Integer> result = new ArrayList<>();\n");
            s.append("// 반복: nums에서 값을 하나씩 꺼내 n에 넣는다\n");
            s.append("for (int n : nums) {\n");
            String ind = filter ? "        " : "    ";
            if (filter) s.append("    // 거르기: 짝수인 값만 통과시킨다\n    if (n % 2 == 0) {\n");
            s.append(ind).append(map ? "// 바꾸기와 넣기: 10배로 바꿔 result 리스트에 추가한다\n" : "// 넣기: 그대로 result 리스트에 추가한다\n");
            s.append(ind).append(map ? "result.add(n * 10);\n" : "result.add(n);\n");
            if (filter) s.append("    }\n");
            s.append("}\n");
        }
        s.append("System.out.println(result);\n");
        s.append("System.out.println(nums);\n");
        return s.toString();
    }

    static String indent(String body, String pad) {
        StringBuilder s = new StringBuilder();
        for (String ln : body.split("\n")) s.append(ln.isEmpty() ? "" : pad + ln).append("\n");
        return s.toString();
    }

    static String wrap(String body, boolean trace) {
        return "import java.util.*;\n\npublic class Main {\n"
            + (trace ? "    static List<String> T = new ArrayList<>();\n" : "")
            + "    public static void main(String[] args) {\n"
            + indent(body, "        ")
            + (trace ? "        System.out.println(T);\n" : "")
            + "    }\n}\n";
    }

    // 호출을 기록하는 줄을 더한 body (구조는 같고 기록만 더한다)
    static String traced(String body, String style) {
        if (style.equals("stream"))
            return body.replace("n -> n % 2 == 0", "n -> { T.add(\"filter(\" + n + \")\"); return n % 2 == 0; }")
                       .replace("n -> n * 10", "n -> { T.add(\"map(\" + n + \")\"); return n * 10; }");
        return body.replace("if (n % 2 == 0) {", "T.add(\"if(\" + n + \")\"); if (n % 2 == 0) {")
                   .replace("result.add(n * 10);", "T.add(\"add(\" + (n * 10) + \")\"); result.add(n * 10);")
                   .replace("result.add(n);", "T.add(\"add(\" + n + \")\"); result.add(n);");
    }

    // 코드에 적은 단계: 소스의 줄을 읽어 얻는다
    static String steps(String body, String style) {
        StringBuilder s = new StringBuilder();
        for (String raw : body.split("\n")) {
            String ln = raw.strip();
            if (ln.startsWith("//")) continue;
            Matcher m;
            if (style.equals("stream")) {
                m = Pattern.compile("^\\.(\\w+)\\(").matcher(ln);
                if (m.find()) s.append(s.length() > 0 ? ">" : "").append(m.group(1));
            } else {
                String w = ln.startsWith("for (") ? "for" : ln.startsWith("if (") ? "if" : ln.startsWith("result.add(") ? "add" : null;
                if (w != null) s.append(s.length() > 0 ? ">" : "").append(w);
            }
        }
        return s.toString();
    }

    static class Result { boolean ok; String out = "", err = ""; }

    static Result compileAndRun(Path dir, String src) throws Exception {
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        Result r = new Result();
        r.ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        if (!r.ok) {
            for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics())
                if (d.getKind() == Diagnostic.Kind.ERROR) r.err += d.getCode() + ": " + d.getMessage(Locale.ENGLISH).split("\n")[0] + " ";
            return r;
        }
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, StreamBasicProbe.class.getClassLoader().getParent())) {
            PrintStream old = System.out;
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
            finally { System.setOut(old); }
            r.out = buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " ; ");
        }
        return r;
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/stream_basic";
        System.out.println("# java " + System.getProperty("java.version"));
        for (String style : new String[] { "stream", "for" })
            for (boolean filter : new boolean[] { true, false })
                for (boolean map : new boolean[] { true, false }) {
                    String key = style + "-" + filter + "-" + map;
                    String b = body(style, filter, map);
                    Path dir = Path.of(base, key);
                    Files.createDirectories(dir);
                    Files.writeString(dir.resolve("body.txt"), b, StandardCharsets.UTF_8);
                    Result r = compileAndRun(dir, wrap(b, false));
                    String[] parts = r.out.split(" ; ", -1);
                    System.out.println(style + "|" + filter + "|" + map + " => " + (r.ok ? "OK" : "ERR " + r.err) + "|"
                        + (r.ok ? parts[0] : "-") + "|" + (r.ok && parts.length > 1 ? parts[1] : "-") + "|" + steps(b, style));
                    // 호출 순서
                    Result t = compileAndRun(Path.of(base, key + "-trace"), wrap(traced(b, style), true));
                    String tp = t.out;
                    System.out.println("FACT trace " + style + "|" + filter + "|" + map + " => " + (t.ok ? tp.substring(tp.lastIndexOf(" ; ") + 3) : "컴파일 실패 " + t.err)
                        + (t.ok && !tp.startsWith(r.out.substring(0, r.out.length())) ? " (출력 다름)" : ""));
                }
        // 거르기도 바꾸기도 없는 스트림의 result는 nums와 같은 객체인가
        String fb = "List<Integer> nums = List.of(1, 2, 3, 4, 5, 6);\nList<Integer> result = nums.stream().toList();\n"
            + "System.out.println((result == nums) + \" \" + result.equals(nums));\n";
        Result f = compileAndRun(Path.of(base, "fact-identity"), wrap(fb, false));
        System.out.println("FACT identity => " + (f.ok ? f.out : "컴파일 실패 " + f.err));
    }
}
