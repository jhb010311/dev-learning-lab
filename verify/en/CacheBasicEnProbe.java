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

// English edition of CacheBasicProbe for the Fundamentals lab "Caches" (cache_basic): runs the same five combinations for real, with the English screen text.
// For each combination it builds the same source as the code on the screen, compiles it with javax.tools,
// and if the compile succeeds it loads the class with a new class loader, runs Main.main, and captures the standard output.
//   use : whether the cache variable and the cache lines in find are there
//   chg : none (nothing in between) / source (only the value in the source changes) / both (the source changes and cache.remove(1) is also used)
//   (Without a cache you cannot use cache.remove(1), so there is no use=false, chg=both combination)
// Output: use|chg => OK/ERR|output (slowCount / second / source.get(1))
// FACT lines are added at the end: the fact the step sentences rely on (the number of slow lookups and the value received after the first find(1)),
// obtained by running a source changed to print the result of the first find. The source made for each combination is kept in verify/out/cache_basic_en/<combination>/Main.java.
public class CacheBasicEnProbe {
    // The same text as the code on the screen (the code function of the lab)
    static String source(boolean use, String chg) {
        StringBuilder s = new StringBuilder();
        s.append("import java.util.*;\n\npublic class Main {\n");
        s.append("    // The source: where the values originally are\n");
        s.append("    static Map<Integer, String> source = new HashMap<>();\n");
        s.append("    static int slowCount = 0;\n\n");
        s.append("    // Slow lookup: reads from the source. Counts how many times it is called\n");
        s.append("    static String slowLoad(int id) {\n        slowCount++;\n        return source.get(id);\n    }\n\n");
        if (use) s.append("    // Cache: the place where values that were read are written down\n    static Map<Integer, String> cache = new HashMap<>();\n\n");
        s.append("    static String find(int id) {\n");
        if (use) s.append("        // If a value is written down, give it; if not, read it and write it down\n"
            + "        if (cache.containsKey(id)) return cache.get(id);\n"
            + "        String v = slowLoad(id);\n"
            + "        cache.put(id, v);\n"
            + "        return v;\n");
        else s.append("        return slowLoad(id);\n");
        s.append("    }\n\n    public static void main(String[] args) {\n");
        s.append("        source.put(1, \"keyboard\");\n");
        s.append("        // Look up key 1 for the first time\n        find(1);\n");
        if (!chg.equals("none")) s.append("        // Change the value in the source\n        source.put(1, \"mouse\");\n");
        if (chg.equals("both")) s.append("        // Also erase the value written in the cache\n        cache.remove(1);\n");
        s.append("        // Look up key 1 again\n        String second = find(1);\n");
        s.append("        // Slow lookups / second value received / value in the source\n");
        s.append("        System.out.println(\n            slowCount + \" / \" + second + \" / \" + source.get(1));\n");
        s.append("    }\n}\n");
        return s.toString();
    }

    // For checking the fact: prints the result of the first find(1) and the number of slow lookups up to then
    static String factSource(boolean use) {
        return source(use, "none").replace("        find(1);\n",
            "        String first = find(1);\n        System.out.println(\"first \" + first + \" / \" + slowCount);\n");
    }

    static String run(Path dir) throws Exception {
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, CacheBasicEnProbe.class.getClassLoader().getParent())) {
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
        String base = args.length > 0 ? args[0] : "verify/out/cache_basic_en";
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
