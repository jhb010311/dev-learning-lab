import java.net.URL;
import java.net.URLClassLoader;
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

// "애너테이션" 실습의 28가지 조합을 실제로 컴파일하고 실행한다.
//   custom|Retention 4|Target 3|읽는 코드 2 = 24가지 (직접 만든 @Timed를 리플렉션으로 읽기)
//   override|이름 오타 2|@Override 2 = 4가지 (컴파일러가 읽는 @Override)
// 조합마다 화면의 코드로 Main.java를 verify/out/annot/cases/<조합>/ 에 만들어 컴파일하고, 성공하면
//   (1) 만들어진 class 파일에 애너테이션이 적혀 있는지 바이트를 직접 찾아보고
//   (2) 그 클래스를 읽어 들여 리플렉션으로 애너테이션이 보이는지 확인하고
//   (3) 별도의 java 프로세스로 실행해 출력을 얻는다.
// 출력: 조합 => 컴파일|오류가 난 줄|오류 메시지|class 파일(none, invisible, visible)|리플렉션으로 보이는가|표준 출력|종료 코드
//       # src 조합 :: 화면의 코드 (줄바꿈은 \n으로 적음. 화면의 코드와 같은지 대조하는 데 쓴다)
public class AnnotProbe {
    static final Path BASE = Path.of("verify", "out", "annot", "cases");
    static final String IMPORTS = "import java.lang.annotation.ElementType;\nimport java.lang.annotation.Retention;\nimport java.lang.annotation.RetentionPolicy;\nimport java.lang.annotation.Target;\nimport java.lang.reflect.Method;\n\n";

    // 화면의 코드: [선언 부분, main 안의 부분]
    static String[] custom(String ret, String target, boolean reader) {
        String decl = (ret.equals("none") ? "" : "@Retention(RetentionPolicy." + ret + ")\n")
            + (target.equals("none") ? "" : "@Target(ElementType." + target + ")\n")
            + "@interface Timed { }\n"
            + "\n"
            + "class Service {\n"
            + "    @Timed\n"
            + "    void work() {\n"
            + "        System.out.println(\"work 실행\");\n"
            + "    }\n"
            + "}";
        String body = reader
            ? "// 여기부터는 main 안의 코드: 애너테이션을 읽는 쪽\n"
            + "Service service = new Service();\n"
            + "Method m = Service.class.getDeclaredMethod(\"work\");\n"
            + "boolean found = m.isAnnotationPresent(Timed.class);\n"
            + "System.out.println(\"@Timed가 보이는가: \" + found);\n"
            + "if (found) System.out.println(\"[시간 측정 시작]\");\n"
            + "m.invoke(service);\n"
            + "if (found) System.out.println(\"[시간 측정 끝]\");"
            : "// 여기부터는 main 안의 코드: 애너테이션을 읽는 코드가 없음\n"
            + "Service service = new Service();\n"
            + "service.work();";
        return new String[] { decl, body };
    }

    static String[] override(boolean typo, boolean ov) {
        String decl = "class Animal {\n"
            + "    String sound() {\n"
            + "        return \"...\";\n"
            + "    }\n"
            + "}\n"
            + "\n"
            + "class Dog extends Animal {\n"
            + (ov ? "    @Override\n" : "")
            + "    String " + (typo ? "sount" : "sound") + "() {\n"
            + "        return \"멍멍\";\n"
            + "    }\n"
            + "}";
        String body = "// 여기부터는 main 안의 코드\n"
            + "Animal a = new Dog();\n"
            + "System.out.println(a.sound());";
        return new String[] { decl, body };
    }

    static String wrap(String[] parts) {
        StringBuilder s = new StringBuilder(IMPORTS).append(parts[0]).append("\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n");
        for (String line : parts[1].split("\n", -1)) s.append(line.isEmpty() ? "" : "        " + line).append("\n");
        return s.append("    }\n}\n").toString();
    }

    // cls 클래스의 method 메서드에 붙은 annotation을 class 파일과 리플렉션 양쪽에서 찾아본다
    static String compileAndRun(String key, String src, String cls, String method, String annotation) throws Exception {
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
        if (!ok) return "ERROR|" + String.join(" ## ", errLines) + "|" + String.join(" ## ", errMsgs) + "|-|-|-|-";
        // (1) class 파일의 바이트에서 애너테이션 타입의 표기(예: LTimed;)와 그것이 적힌 칸의 이름을 찾는다
        String bytes = new String(Files.readAllBytes(dir.resolve(cls + ".class")), StandardCharsets.ISO_8859_1);
        String desc = "L" + annotation.replace('.', '/') + ";";
        String inClass = !bytes.contains(desc) ? "none" : bytes.contains("RuntimeVisibleAnnotations") ? "visible" : bytes.contains("RuntimeInvisibleAnnotations") ? "invisible" : "unknown";
        // (2) 리플렉션
        boolean seen;
        try (URLClassLoader loader = new URLClassLoader(new URL[] { dir.toUri().toURL() }, null)) {
            Class<?> target = loader.loadClass(cls);
            @SuppressWarnings("unchecked")
            Class<? extends java.lang.annotation.Annotation> ann = (Class<? extends java.lang.annotation.Annotation>) (annotation.contains(".") ? Class.forName(annotation) : loader.loadClass(annotation));
            seen = target.getDeclaredMethod(method).isAnnotationPresent(ann);
        }
        // (3) 실행
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        Process p = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), "Main")
            .redirectError(dir.resolve("stderr.txt").toFile()).redirectOutput(dir.resolve("stdout.txt").toFile()).start();
        int exit = p.waitFor();
        List<String> out = Files.readAllLines(dir.resolve("stdout.txt"), StandardCharsets.UTF_8);
        return "OK|-|-|" + inClass + "|" + seen + "|" + (out.isEmpty() ? "-" : String.join(" / ", out)) + "|" + exit;
    }

    public static void main(String[] args) throws Exception {
        for (String ret : new String[] { "none", "SOURCE", "CLASS", "RUNTIME" })
            for (String target : new String[] { "none", "METHOD", "TYPE" })
                for (boolean reader : new boolean[] { true, false }) {
                    String key = "custom|" + ret + "|" + target + "|" + reader;
                    String[] parts = custom(ret, target, reader);
                    System.out.println(key + " => " + compileAndRun(key, wrap(parts), "Service", "work", "Timed"));
                    System.out.println("# src " + key + " :: " + (parts[0] + "\n\n" + parts[1]).replace("\n", "\\n"));
                }
        for (boolean typo : new boolean[] { true, false })
            for (boolean ov : new boolean[] { true, false }) {
                String key = "override|" + typo + "|" + ov;
                String[] parts = override(typo, ov);
                System.out.println(key + " => " + compileAndRun(key, wrap(parts), "Dog", typo ? "sount" : "sound", "java.lang.Override"));
                System.out.println("# src " + key + " :: " + (parts[0] + "\n\n" + parts[1]).replace("\n", "\\n"));
            }
        // 글에서 말하는 사실: @Target(TYPE)인 애너테이션을 클래스에 붙이면 컴파일된다 (메서드에 붙였을 때만 오류)
        String onClass = wrap(custom("RUNTIME", "TYPE", false)).replace("    @Timed\n", "").replace("class Service {", "@Timed\nclass Service {");
        System.out.println("extra|type-on-class => " + compileAndRun("extra|type-on-class", onClass, "Service", "work", "Timed"));
    }
}
