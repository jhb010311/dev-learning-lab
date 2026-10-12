import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "캐시" 실습의 다섯 가지 조합을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   use : cache 변수와 find 안의 cache 줄이 있는가
//   chg : none(사이에 아무것도 안 함) / source(원본의 값만 바꿈) / both(원본을 바꾸고 cache.remove(1)도 씀)
//   (캐시가 없으면 cache.remove(1)을 쓸 수 없어서 use=false, chg=both 조합은 없다)
// 출력: use|chg => OK/ERR|출력(slowCount / second / source.get(1))
// 끝에 FACT 줄을 더한다: 단계 문장이 기대는 사실(처음 find(1) 한 번 뒤의 느린 조회 횟수와 받은 값)을
// 첫 find의 결과를 따로 출력하도록 바꾼 소스로 실행한 결과. 조합마다 만든 소스는 verify/out/cache_basic/<조합>/Main.java에 남긴다.
public class CacheBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(boolean use, String chg) {
        StringBuilder s = new StringBuilder();
        s.append("import java.util.*;\n\npublic class Main {\n");
        s.append("    // 원본: 값이 원래 들어 있는 곳\n");
        s.append("    static Map<Integer, String> source = new HashMap<>();\n");
        s.append("    static int slowCount = 0;\n\n");
        s.append("    // 느린 조회: 원본에서 읽어 온다. 부른 횟수를 센다\n");
        s.append("    static String slowLoad(int id) {\n        slowCount++;\n        return source.get(id);\n    }\n\n");
        if (use) s.append("    // 캐시: 읽어 온 값을 적어 두는 곳\n    static Map<Integer, String> cache = new HashMap<>();\n\n");
        s.append("    static String find(int id) {\n");
        if (use) s.append("        // 적어 둔 값이 있으면 주고, 없으면 읽어 와서 적어 둔다\n"
            + "        if (cache.containsKey(id)) return cache.get(id);\n"
            + "        String v = slowLoad(id);\n"
            + "        cache.put(id, v);\n"
            + "        return v;\n");
        else s.append("        return slowLoad(id);\n");
        s.append("    }\n\n    public static void main(String[] args) {\n");
        s.append("        source.put(1, \"키보드\");\n");
        s.append("        // 1번 값을 처음 찾는다\n        find(1);\n");
        if (!chg.equals("none")) s.append("        // 원본의 값을 바꾼다\n        source.put(1, \"마우스\");\n");
        if (chg.equals("both")) s.append("        // 캐시에 적어 둔 값도 지운다\n        cache.remove(1);\n");
        s.append("        // 1번 값을 다시 찾는다\n        String second = find(1);\n");
        s.append("        // 느린 조회 횟수 / 두 번째로 받은 값 / 원본의 값\n");
        s.append("        System.out.println(\n            slowCount + \" / \" + second + \" / \" + source.get(1));\n");
        s.append("    }\n}\n");
        return s.toString();
    }

    // 사실 확인용: 처음 find(1)의 결과와 그때까지의 느린 조회 횟수를 출력한다
    static String factSource(boolean use) {
        return source(use, "none").replace("        find(1);\n",
            "        String first = find(1);\n        System.out.println(\"first \" + first + \" / \" + slowCount);\n");
    }

    static String run(Path dir) throws Exception {
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, CacheBasicProbe.class.getClassLoader().getParent())) {
            PrintStream old = System.out;
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
            finally { System.setOut(old); }
            return buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " ## ");
        }
    }

    static String compileAndRun(JavaCompiler jc, String src, Path dir) throws Exception {
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        if (!ok) {
            return "ERR|" + dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).map(d -> d.getCode()).findFirst().orElse("?");
        }
        return "OK|" + run(dir);
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/cache_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean use : new boolean[] { true, false })
            for (String chg : new String[] { "none", "source", "both" }) {
                if (!use && chg.equals("both")) continue;
                String src = source(use, chg);
                System.out.println(use + "|" + chg + " => " + compileAndRun(jc, src, Path.of(base, use + "-" + chg)));
            }
        for (boolean use : new boolean[] { true, false })
            System.out.println("FACT first " + use + " => " + compileAndRun(jc, factSource(use), Path.of(base, "fact-first-" + use)));
    }
}
