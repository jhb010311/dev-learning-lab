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
import java.util.stream.Collectors;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "상속" 실습의 여덟 가지 조합(extends 2 x eat 다시 적기 2 x 변수 타입 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   ext  : Dog에 extends Animal을 쓰는가
//   over : Dog에 eat()을 다시 적는가
//   var  : dog(Dog d = new Dog(); d.eat(); d.bark();) / animal(Animal d = new Dog(); d.eat();)
// 출력: ext|over|var => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력(줄은 " / "로 이음)|
//        첫 오류의 영어 메시지 첫 줄|오류가 난 줄(소스의 그 줄 글, ## 로 구분)   (한 줄로 출력한다)
// 조합마다 만든 소스는 verify/out/inherit_basic/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
// 단계 문장이 기대는 사실은 "FACT 이름 => 컴파일|진단 코드|출력" 줄로 따로 잰다.
public class InheritBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글. mainBody가 null이면 var에 맞는 화면의 main 본문을 쓴다.
    static String source(boolean ext, boolean over, String var, String mainBody) {
        StringBuilder s = new StringBuilder();
        s.append("class Animal {\n"
            + "    void eat() {\n"
            + "        System.out.println(\"먹는다\");\n"
            + "    }\n"
            + "}\n\n");
        if (ext) s.append("// 상속: Dog는 Animal에 적힌 것을 물려받는다\n");
        s.append("class Dog").append(ext ? " extends Animal" : "").append(" {\n"
            + "    void bark() {\n"
            + "        System.out.println(\"멍멍\");\n"
            + "    }\n");
        if (over) s.append("\n"
            + "    // Animal에도 있는 eat()을 Dog에 같은 이름으로 다시 적는다\n"
            + "    void eat() {\n"
            + "        System.out.println(\"개가 먹는다\");\n"
            + "    }\n");
        s.append("}\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) {\n");
        if (mainBody != null) s.append(mainBody);
        else if (var.equals("dog")) s.append("        Dog d = new Dog();\n"
            + "        d.eat();\n"
            + "        d.bark();\n");
        else s.append("        Animal d = new Dog();\n"
            + "        d.eat();\n");
        s.append("    }\n"
            + "}\n");
        return s.toString();
    }

    // 컴파일하고(성공하면 실행하고) 결과를 한 줄로 돌려준다
    static String run(String src, Path dir) throws Exception {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        List<Diagnostic<? extends JavaFileObject>> errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
        String code = "-", msg = "-", where = "-";
        if (!errs.isEmpty()) {
            String[] lines = src.split("\n");
            code = errs.get(0).getCode();
            msg = errs.get(0).getMessage(Locale.ENGLISH).split("\n")[0];
            where = errs.stream().map(d -> lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
        }
        String mainClass = String.valueOf(Files.exists(dir.resolve("Main.class")));
        String ran = "false", out = "-";
        if (ok) {
            try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, InheritBasicProbe.class.getClassLoader().getParent())) {
                PrintStream old = System.out;
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                finally { System.setOut(old); }
                ran = "true";
                out = buf.toString(StandardCharsets.UTF_8).strip().replaceAll("\\R", " / ");
            }
        }
        return (ok ? "OK" : "ERR") + "|" + code + "|" + errs.size() + "|" + mainClass + "|" + ran + "|" + out + "|" + msg + "|" + where;
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/inherit_basic";
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean ext : new boolean[] { false, true })
            for (boolean over : new boolean[] { false, true })
                for (String var : new String[] { "dog", "animal" }) {
                    String src = source(ext, over, var, null);
                    System.out.println(ext + "|" + over + "|" + var + " => " + run(src, Path.of(base, ext + "-" + over + "-" + var)));
                }
        // 사실 1: Animal 타입 변수로는 Dog에만 적은 bark()를 부를 수 없다 (화면의 Animal 변수 코드에 d.bark() 줄이 없는 이유)
        String f1 = source(true, false, "animal", "        Animal d = new Dog();\n        d.eat();\n        d.bark();\n");
        System.out.println("FACT animal_var_bark => " + run(f1, Path.of(base, "fact-animal-var-bark")));
        // 사실 2: Dog에 eat()을 다시 적어도 Animal 객체의 eat()은 그대로다
        String f2 = source(true, true, "dog", "        Animal a = new Animal();\n        a.eat();\n");
        System.out.println("FACT animal_object_eat => " + run(f2, Path.of(base, "fact-animal-object-eat")));
        // 사실 3: extends가 없고 eat()도 다시 적지 않았을 때, Dog에 bark()는 있어 d.bark() 줄은 오류가 아니다
        String f3 = source(false, false, "dog", "        Dog d = new Dog();\n        d.bark();\n");
        System.out.println("FACT dog_bark_alone => " + run(f3, Path.of(base, "fact-dog-bark-alone")));
    }
}
