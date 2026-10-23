import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "람다" 실습(표준 중심판, 2026-10-22)의 조합을 실제로 컴파일하고 실행한다.
//   to   : runnable(Runnable r = …; r.run()) / thread(new Thread(…); th.start()) / sort(names.sort(…)) / task(직접 만든 Task: 메서드 run, stop 둘)
//   form : lambda(람다) / anon(익명 클래스) / named(이름 있는 클래스 Work, ByName)
//   drop : 부르는 줄(r.run(), th.start(), t.run())을 지웠는가. sort는 넘기는 줄이 곧 sort를 부르는 줄이라 지우지 않는다(false만).
// 조합마다 화면에 보이는 것과 같은 소스를 javax.tools로 컴파일하고(진단 코드와 영어 메시지를 얻으려고),
// 성공하면 사용자가 하는 것처럼 별도 프로세스로 java -cp <폴더> Main을 실행해 표준 출력을 잡는다(새 스레드가 끝날 때까지 JVM이 기다리는 것까지 실제와 같게).
// 출력: to|form|drop => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력(줄은 " / "로 구분)|
//        첫 오류의 영어 메시지(줄은 " ~ "로 구분)|오류가 난 줄(소스의 그 줄 글, ## 로 구분)
// 조합마다 만든 소스는 verify/out/lambda_basic_std/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
// 단계 문장이 기대는 사실은 "# fact" 줄로 따로 잰다.
// 결과 파일: verify/plain/lambda_basic_probe.out.txt (옛 판(직접 만든 Task 중심)의 결과 LambdaBasicProbe.out.txt는 그대로 둔다)
// 실행(저장소 폴더에서): javac -d <임시> verify/plain/LambdaBasicProbe.java
//                      java -cp <임시> LambdaBasicProbe verify/out/lambda_basic_std > verify/plain/lambda_basic_probe.out.txt
public class LambdaBasicProbe {
    static final String JAVA = Path.of(System.getProperty("java.home"), "bin", "java").toString();

    // 선언 줄 바로 위의 주석(화면의 코드와 같은 글)
    static String comment(String to, String form) {
        switch (to + "-" + form) {
            case "runnable-lambda": return "// 람다: run이 할 일을 화살표 뒤에 적는다. 이 줄에서는 실행되지 않는다";
            case "runnable-anon": return "// 익명 클래스: Runnable을 구현한 이름 없는 클래스를 만들고 바로 new로 객체를 만든다";
            case "runnable-named": return "// Work 객체를 new로 만들고 r이 그 객체를 가리키게 한다";
            case "thread-lambda": return "// 람다를 Thread에 넘긴다. 이 줄에서는 실행되지 않는다";
            case "thread-anon": return "// 익명 클래스의 객체를 Thread에 넘긴다";
            case "thread-named": return "// Work 객체를 Thread에 넘긴다";
            case "sort-lambda": return "// 람다를 정렬 기준(Comparator)으로 넘긴다";
            case "sort-anon": return "// 익명 클래스의 객체를 정렬 기준으로 넘긴다";
            case "sort-named": return "// ByName 객체를 정렬 기준으로 넘긴다";
            case "task-lambda": return "// 람다: Task에는 구현할 메서드가 run, stop 두 개다";
            case "task-anon": return "// 익명 클래스: run과 stop을 둘 다 작성한다";
            default: return "// Work 객체를 new로 만들고 t가 그 객체를 가리키게 한다";
        }
    }

    // 들여쓰기만 다른 메서드 선언(클래스 안: 4칸, 익명 클래스 안: 12칸)
    static String method(String indent, String head, String body) {
        return indent + head + " {\n" + indent + "    " + body + "\n" + indent + "}\n";
    }

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(String to, String form, boolean drop) {
        boolean sort = to.equals("sort"), task = to.equals("task"), thread = to.equals("thread");
        String run = "public void run()", runBody = "System.out.println(\"일한다\");";
        String stop = "public void stop()", stopBody = "System.out.println(\"멈춘다\");";
        String cmp = "public int compare(String a, String b)", cmpBody = "return a.compareTo(b);";
        StringBuilder s = new StringBuilder();
        if (sort) s.append("import java.util.ArrayList;\n").append(form.equals("lambda") ? "" : "import java.util.Comparator;\n").append("import java.util.List;\n\n");
        if (task) s.append("// 직접 만든 인터페이스(Task는 예시로 지은 이름): 본문 없는 메서드가 run, stop 두 개\n"
            + "interface Task {\n    void run();\n    void stop();\n}\n\n");
        if (form.equals("named")) {
            if (sort) s.append("// Comparator<String>을 구현한 클래스(ByName은 예시로 지은 이름)\n"
                + "class ByName implements Comparator<String> {\n" + method("    ", cmp, cmpBody) + "}\n\n");
            else s.append("// " + (task ? "Task를" : "Runnable을") + " 구현한 클래스(Work는 예시로 지은 이름)\n"
                + "class Work implements " + (task ? "Task" : "Runnable") + " {\n" + method("    ", run, runBody)
                + (task ? method("    ", stop, stopBody) : "") + "}\n\n");
        }
        s.append("public class Main {\n    public static void main(String[] args) {\n");
        String in = "        ", in3 = "            ", c = in + comment(to, form) + "\n";
        if (sort) {
            s.append(in + "List<String> names = new ArrayList<>(List.of(\"다현\", \"가영\", \"나래\"));\n");
            s.append(in + "System.out.println(names);\n").append(c);
            if (form.equals("lambda")) s.append(in + "names.sort((a, b) -> a.compareTo(b));\n");
            else if (form.equals("anon")) s.append(in + "names.sort(new Comparator<String>() {\n" + method(in3, cmp, cmpBody) + in + "});\n");
            else s.append(in + "names.sort(new ByName());\n");
            s.append(in + "System.out.println(names);\n");
        } else if (thread) {
            s.append(c);
            if (form.equals("lambda")) s.append(in + "Thread th = new Thread(() -> System.out.println(\"일한다\"));\n");
            else if (form.equals("anon")) s.append(in + "Thread th = new Thread(new Runnable() {\n" + method(in3, run, runBody) + in + "});\n");
            else s.append(in + "Thread th = new Thread(new Work());\n");
            s.append(in + "System.out.println(\"준비\");\n");
            if (!drop) s.append(in + "th.start();\n");
        } else {
            String type = task ? "Task" : "Runnable", v = task ? "t" : "r";
            s.append(c);
            if (form.equals("lambda")) s.append(in + type + " " + v + " = () -> System.out.println(\"일한다\");\n");
            else if (form.equals("anon")) s.append(in + type + " " + v + " = new " + type + "() {\n" + method(in3, run, runBody)
                + (task ? method(in3, stop, stopBody) : "") + in + "};\n");
            else s.append(in + type + " " + v + " = new Work();\n");
            s.append(in + "System.out.println(\"준비\");\n");
            if (!drop) s.append(in + v + ".run();\n");
        }
        s.append("    }\n}\n");
        return s.toString();
    }

    static class Result { boolean ok; List<Diagnostic<? extends JavaFileObject>> errs; Path dir; }

    static Result compile(JavaCompiler jc, String src, Path dir) throws Exception {
        Files.createDirectories(dir);
        try (var st = Files.list(dir)) { for (Path p : st.filter(p -> p.toString().endsWith(".class")).toList()) Files.delete(p); }
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        Result r = new Result();
        r.ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        r.errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
        r.dir = dir;
        return r;
    }

    // 사용자가 하는 것처럼 별도 프로세스로 java Main을 실행한다(표준 오류나 0이 아닌 종료 코드가 있으면 뒤에 붙인다)
    static String run(Path dir) throws Exception {
        Process p = new ProcessBuilder(JAVA, "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), "Main").start();
        String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        String err = new String(p.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
        int code = p.waitFor();
        String o = out.strip().replace("\r\n", "\n").replace("\n", " / ");
        return o + (code != 0 || !err.isBlank() ? " [exit " + code + " stderr " + err.strip().replace("\r\n", "\n").replace("\n", " ~ ") + "]" : "");
    }

    // Object의 public 메서드와 같은 모양인가(함수형 인터페이스의 추상 메서드를 셀 때 빼는 것, JLS 9.8)
    static boolean objectMethod(Method m) {
        try { return Modifier.isPublic(Object.class.getMethod(m.getName(), m.getParameterTypes()).getModifiers()); }
        catch (NoSuchMethodException e) { return false; }
    }

    static String abstracts(Class<?> c) {
        return Arrays.stream(c.getMethods()).filter(m -> Modifier.isAbstract(m.getModifiers()) && !objectMethod(m))
            .map(Method::getName).sorted().collect(Collectors.joining(", "));
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/lambda_basic_std";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String to : new String[] { "runnable", "thread", "sort", "task" })
            for (String form : new String[] { "lambda", "anon", "named" })
                for (boolean drop : to.equals("sort") ? new boolean[] { false } : new boolean[] { false, true }) {
                    String src = source(to, form, drop);
                    Result r = compile(jc, src, Path.of(base, to + "-" + form + "-" + drop));
                    String code = "-", msg = "-", where = "-";
                    if (!r.errs.isEmpty()) {
                        String[] lines = src.split("\n");
                        code = r.errs.get(0).getCode();
                        msg = r.errs.get(0).getMessage(Locale.ENGLISH).replace("\r", "").replace("\n", " ~ ").strip();
                        where = r.errs.stream().map(d -> lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
                    }
                    String mainClass = String.valueOf(Files.exists(r.dir.resolve("Main.class")));
                    String ran = "false", out = "-";
                    if (r.ok) { out = run(r.dir); ran = "true"; }
                    System.out.println(to + "|" + form + "|" + drop + " => " + (r.ok ? "OK" : "ERR") + "|" + code + "|" + r.errs.size()
                        + "|" + mainClass + "|" + ran + "|" + out + "|" + msg + "|" + where);
                }

        // 사실 1: 자바가 주는 인터페이스의 모양. 구현해야 할 메서드(Object의 메서드를 뺀 추상 메서드), @FunctionalInterface 여부, 패키지,
        //         Thread에 Runnable을 받는 생성자가 있는가, List에 Comparator를 받는 sort가 있는가
        System.out.println("# fact api Runnable => 인터페이스: " + Runnable.class.isInterface() + ", 패키지: " + Runnable.class.getPackageName()
            + ", 구현할 메서드: " + abstracts(Runnable.class) + ", @FunctionalInterface: " + Runnable.class.isAnnotationPresent(FunctionalInterface.class));
        System.out.println("# fact api Comparator => 인터페이스: " + Comparator.class.isInterface() + ", 패키지: " + Comparator.class.getPackageName()
            + ", 구현할 메서드: " + abstracts(Comparator.class) + ", @FunctionalInterface: " + Comparator.class.isAnnotationPresent(FunctionalInterface.class)
            + ", 본문 없이 선언된 equals도 있음: " + Arrays.stream(Comparator.class.getDeclaredMethods()).anyMatch(m -> m.getName().equals("equals") && Modifier.isAbstract(m.getModifiers())));
        System.out.println("# fact api Thread(Runnable) => " + (Thread.class.getConstructor(Runnable.class) != null)
            + ", List.sort(Comparator) => " + (List.class.getMethod("sort", Comparator.class) != null));

        // 사실 2: 람다·익명 클래스·이름 있는 클래스를 적은 줄 바로 뒤에서, 아무것도 출력되지 않았고 r이 Runnable을 구현한 객체인지
        for (String form : new String[] { "lambda", "anon", "named" }) {
            String src = source("runnable", form, true).replace("        System.out.println(\"준비\");\n",
                "        System.out.println(\"직후\");\n"
                + "        System.out.println(\"Runnable 구현 객체: \" + (r instanceof Runnable) + \", 익명 클래스: \" + r.getClass().isAnonymousClass()"
                + " + \", 숨은 클래스: \" + r.getClass().isHidden() + \", 클래스 이름: \" + (r.getClass().isHidden() ? \"(숨은 클래스)\" : r.getClass().getName()));\n");
            Result r = compile(jc, src, Path.of(base, "fact-runnable-" + form));
            System.out.println("# fact after " + form + " => " + (r.ok ? run(r.dir) : "컴파일 실패 " + r.errs));
        }

        // 사실 3: 할 일이 어느 스레드에서 실행되는가. r.run()은 main에서, th.start()는 새 스레드에서
        for (String to : new String[] { "runnable", "thread" })
            for (String form : new String[] { "lambda", "anon", "named" }) {
                String src = source(to, form, false)
                    .replace("System.out.println(\"일한다\")", "System.out.println(\"일한다 \" + Thread.currentThread().getName())")
                    .replace("System.out.println(\"준비\")", "System.out.println(\"준비 \" + Thread.currentThread().getName())");
                Result r = compile(jc, src, Path.of(base, "fact-thread-" + to + "-" + form));
                System.out.println("# fact where " + to + " " + form + " => " + (r.ok ? run(r.dir) : "컴파일 실패 " + r.errs));
            }

        // 사실 4: sort가 compare(람다)를 몇 번, 어떤 두 이름으로 불렀는가
        {
            String src = source("sort", "lambda", false).replace("        names.sort((a, b) -> a.compareTo(b));\n",
                "        int[] n = { 0 };\n"
                + "        names.sort((a, b) -> { n[0]++; System.out.println(\"compare(\" + a + \", \" + b + \") = \" + a.compareTo(b)); return a.compareTo(b); });\n"
                + "        System.out.println(\"불린 횟수 \" + n[0]);\n");
            Result r = compile(jc, src, Path.of(base, "fact-sort-calls"));
            System.out.println("# fact sortcalls => " + (r.ok ? run(r.dir) : "컴파일 실패 " + r.errs));
        }

        // 사실 5: 직접 만든 Task의 구현할 메서드를 센다(익명 클래스·Work가 run과 stop을 둘 다 작성하면 컴파일되는 것은 위 표에서 본다)
        {
            String src = "interface Task {\n    void run();\n    void stop();\n}\npublic class Main {\n    public static void main(String[] args) {\n"
                + "        System.out.println(\"구현할 메서드: \" + java.util.Arrays.stream(Task.class.getMethods()).map(m -> m.getName()).sorted().collect(java.util.stream.Collectors.joining(\", \")));\n    }\n}\n";
            Result r = compile(jc, src, Path.of(base, "fact-task"));
            System.out.println("# fact task => " + (r.ok ? run(r.dir) : "컴파일 실패 " + r.errs));
        }
    }
}
