import java.io.File;
import java.io.StringWriter;
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
import org.springframework.boot.SpringBootVersion;

// 기초개념 "리포지토리" 실습을 실제 스프링 부트 + 스프링 데이터 JPA + Hibernate + H2에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 소스(패키지 app의 Member 엔티티, MemberRepository, 시작 클래스 Main)를
// verify/out/repo_basic/<조합>/src/app 에 만들어 javax.tools로 컴파일하고, 컴파일되면 자식 java 프로세스를 새로 띄워 실행한다.
// 리포지토리를 손으로 등록하지 않는다. 스프링 데이터가 app 패키지에서 인터페이스를 찾아 구현을 만든다.
//   ext    : MemberRepository에 extends JpaRepository<Member, Long>을 적는가
//   method : name(findByName 선언) / none(찾는 메서드를 선언하지 않음) / nick(Member에 없는 필드로 findByNickname 선언)
// 화면의 코드와 다른 줄은 "// PROBE"로 끝나는 줄뿐이다(측정하는 줄). 대조 스크립트가 그 줄을 빼고 견준다.
// 컴파일 오류가 결과인 조합은 javac의 진단(코드, 줄, 메시지)을 적는다. 또 ext가 false인 조합은 쓰는 쪽을 뺀 변형(variant)을 따로 컴파일해 실행해,
// "인터페이스를 JpaRepository 없이 두면 스프링이 구현 객체를 만드는가"를 잰다.
// 자식(app.Probe)이 적는 것: 스프링이 시작되었는가(실패했다면 예외의 사슬), 컨텍스트에 있는 MemberRepository 빈의 수와 그 객체의 클래스·프록시 여부·구현한 인터페이스,
// 우리 클래스 가운데 MemberRepository를 구현한 것이 있는가, save와 findByName(또는 count) 사이사이에 나간 SQL, 프로그램이 출력한 글.
public class RepoBasicProbe {
    static final String H_REPO = "package app;\n\nimport java.util.List;\nimport org.springframework.data.jpa.repository.JpaRepository;\n\n";

    // 화면의 코드(실습의 code 함수) 앞쪽: 리포지토리 인터페이스
    static String repoSource(boolean ext, String method) {
        List<String> l = new ArrayList<>();
        if (ext) l.add("// 선언만 한다. 구현 클래스는 쓰지 않고, 스프링이 구현 객체를 만들어 준다");
        l.add("public interface MemberRepository" + (ext ? " extends JpaRepository<Member, Long>" : "") + " {");
        if (method.equals("name")) {
            l.add("    // 이름의 규칙(findBy + 필드 이름)을 보고 스프링이 쿼리를 만든다");
            l.add("    List<Member> findByName(String name);");
        } else if (method.equals("nick")) {
            l.add("    // 이름의 규칙(findBy + 필드 이름)을 보고 스프링이 쿼리를 만든다");
            l.add("    List<Member> findByNickname(String nickname);");
        }
        l.add("}");
        return H_REPO + String.join("\n", l) + "\n";
    }

    // 화면의 코드 뒤쪽: 쓰는 쪽 (main 안의 줄)
    static List<String> usage(String method) {
        List<String> l = new ArrayList<>();
        l.add("// 쓰는 쪽");
        l.add("// main 메서드 안의 줄만 남겼다(스프링을 시작하고 memberRepository를 받는 줄은 줄임).");
        l.add("memberRepository.save(new Member(1L, \"김철수\"));");
        if (method.equals("name")) { l.add("List<Member> found = memberRepository.findByName(\"김철수\");"); l.add("System.out.println(found.size());"); }
        else if (method.equals("nick")) { l.add("List<Member> found = memberRepository.findByNickname(\"철수\");"); l.add("System.out.println(found.size());"); }
        else l.add("System.out.println(memberRepository.count());");
        return l;
    }

    static final String MEMBER = """
            package app;

            import jakarta.persistence.Entity;
            import jakarta.persistence.Id;

            @Entity
            public class Member {
                @Id
                private Long id;
                private String name;

                protected Member() {
                }

                public Member(Long id, String name) {
                    this.id = id;
                    this.name = name;
                }

                public Long getId() {
                    return id;
                }

                public String getName() {
                    return name;
                }
            }
            """;

    // 시작 클래스. withUse가 false면 getBean과 쓰는 쪽을 뺀 변형이다
    static String mainSource(String method, boolean withUse) {
        StringBuilder s = new StringBuilder();
        s.append("package app;\n\nimport java.util.List;\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.SpringBootConfiguration;\n"
                + "import org.springframework.boot.autoconfigure.EnableAutoConfiguration;\nimport org.springframework.context.ConfigurableApplicationContext;\n\n"
                + "@SpringBootConfiguration\n@EnableAutoConfiguration\npublic class Main {\n"
                + "    public static void main(String[] args) {\n"
                + "        ConfigurableApplicationContext context = SpringApplication.run(Main.class, args);\n");
        if (withUse) s.append("        MemberRepository memberRepository = context.getBean(MemberRepository.class);\n");
        s.append("        Probe.started(context);  // PROBE\n");
        if (withUse) {
            List<String> u = usage(method);
            for (int i = 0; i < u.size(); i++) {
                s.append("        ").append(u.get(i)).append("\n");
                if (u.get(i).startsWith("memberRepository.save")) s.append("        Probe.mark(\"save\");  // PROBE\n");
            }
            s.append("        Probe.mark(\"use\");  // PROBE\n");
        }
        s.append("        context.close();\n    }\n}\n");
        return s.toString();
    }

    static final String SQLLOG = """
            package app;

            import java.util.ArrayList;
            import java.util.List;
            import org.hibernate.resource.jdbc.spi.StatementInspector;

            // Hibernate가 DB로 보내는 SQL을 적는다 (측정용)
            public class SqlLog implements StatementInspector {
                public static final List<String> SQL = new ArrayList<>();

                public SqlLog() {
                }

                @Override
                public String inspect(String sql) {
                    SQL.add(sql);
                    return sql;
                }
            }
            """;

    static final String PROBE = """
            package app;

            import java.io.File;
            import java.lang.reflect.InvocationTargetException;
            import java.lang.reflect.Proxy;
            import java.util.ArrayList;
            import java.util.Arrays;
            import java.util.List;
            import java.util.Map;
            import java.util.stream.Collectors;
            import org.springframework.context.ApplicationContext;

            public class Probe {
                static final List<String> marks = new ArrayList<>();

                // 스프링이 시작을 끝낸 직후: 이 뒤에 나가는 SQL만 센다
                public static void started(ApplicationContext ctx) {
                    Map<String, MemberRepository> beans = ctx.getBeansOfType(MemberRepository.class);
                    String impl = "-", proxy = "-", itfs = "-", same = "-";
                    if (!beans.isEmpty()) {
                        Object o = beans.values().iterator().next();
                        impl = o.getClass().getName();
                        proxy = String.valueOf(Proxy.isProxyClass(o.getClass()));
                        itfs = Arrays.stream(o.getClass().getInterfaces()).map(Class::getName).collect(Collectors.joining(","));
                        same = String.valueOf(o.getClass() == MemberRepository.class);
                    }
                    // 우리가 만든 클래스 가운데 MemberRepository를 구현한 것이 있는가
                    List<String> ours = new ArrayList<>(), all = new ArrayList<>();
                    File dir = new File(System.getProperty("lab.classes"), "app");
                    for (File f : dir.listFiles()) {
                        if (!f.getName().endsWith(".class")) continue;
                        String n = "app." + f.getName().substring(0, f.getName().length() - 6);
                        all.add(n.substring(4));
                        try {
                            Class<?> c = Class.forName(n);
                            if (c != MemberRepository.class && MemberRepository.class.isAssignableFrom(c)) ours.add(n);
                        } catch (ClassNotFoundException e) { throw new IllegalStateException(e); }
                    }
                    java.util.Collections.sort(all);
                    System.out.println("PROBE beans=" + beans.size() + "|impl=" + impl + "|isProxy=" + proxy + "|itfs=" + itfs + "|isOurInterface=" + same
                            + "|ourImpls=" + ours + "|ourClasses=" + all + "|repoBeanNames=" + Arrays.toString(ctx.getBeanNamesForType(MemberRepository.class)));
                    SqlLog.SQL.clear();
                }

                // 지금까지 나간 SQL의 수를 적는다
                public static void mark(String name) { marks.add(name + ":" + SqlLog.SQL.size()); }

                static String first(Throwable t) {
                    String m = t.getMessage();
                    if (m == null) m = "";
                    int i = m.indexOf('\\n');
                    if (i >= 0) m = m.substring(0, i);
                    return t.getClass().getName() + ": " + m.replace('|', '/');
                }

                public static void main(String[] args) throws Exception {
                    String chain = "-";
                    try {
                        Class.forName("app.Main").getMethod("main", String[].class).invoke(null, (Object) args);
                    } catch (InvocationTargetException e) {
                        List<String> ch = new ArrayList<>();
                        for (Throwable t = e.getCause(); t != null; t = t.getCause()) ch.add(first(t));
                        chain = String.join(" >> ", ch);
                    }
                    System.out.println("PROBE exc=" + chain + "|marks=" + marks + "|sql=" + SqlLog.SQL.stream().map(x -> x.replace('|', '/').replace('\\n', ' ')).collect(Collectors.joining(" ;; ")));
                    System.out.flush();
                    System.exit(0);
                }
            }
            """;

    static String clean(String s) { return s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    // 컴파일: 성공이면 null, 실패면 진단 목록(코드@줄@메시지 첫 줄)
    static List<String> compile(JavaCompiler javac, String cp, Path src, Path classes, List<String> files) throws Exception {
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        try (StandardJavaFileManager fm = javac.getStandardFileManager(dc, null, StandardCharsets.UTF_8)) {
            List<File> fs = new ArrayList<>();
            for (String f : files) fs.add(src.resolve(f).toFile());
            boolean ok = javac.getTask(new StringWriter(), fm, dc, List.of("-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString()), null, fm.getJavaFileObjectsFromFiles(fs)).call();
            if (ok) return null;
            List<String> errs = new ArrayList<>();
            for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) {
                if (d.getKind() != Diagnostic.Kind.ERROR) continue;
                String msg = d.getMessage(Locale.ENGLISH).replace("\r", "").replace('\n', '/').replace('|', '¦');
                errs.add(d.getCode() + "@" + d.getSource().getName().replaceAll(".*[/\\\\]", "") + ":" + d.getLineNumber() + "@" + msg);
            }
            return errs;
        }
    }

    // 자식 프로세스를 띄워 PROBE 줄과 프로그램의 출력을 모은다
    static String run(String cp, Path classes, int no) throws Exception {
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dlab.classes=" + classes, "-cp", cp + File.pathSeparator + classes, "app.Probe",
                "--spring.main.web-application-type=none", "--spring.main.banner-mode=off", "--logging.level.root=OFF",
                "--spring.datasource.url=jdbc:h2:mem:repo_basic" + no + ";DB_CLOSE_DELAY=-1",
                "--spring.jpa.hibernate.ddl-auto=create-drop",
                "--spring.jpa.properties.hibernate.session_factory.statement_inspector=app.SqlLog"));
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        p.waitFor();
        List<String> probe = new ArrayList<>(), prog = new ArrayList<>();
        for (String ln : all.split("\r?\n")) {
            if (ln.isEmpty()) continue;
            if (ln.startsWith("PROBE ")) probe.add(ln.substring(6)); else prog.add(ln.replace('|', '¦'));
        }
        return String.join("|", probe) + "|out=" + (prog.isEmpty() ? "(없음)" : String.join(" / ", prog)) + "|exit=" + p.exitValue();
    }

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args[1]);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring data jpa " + org.springframework.data.jpa.repository.JpaRepository.class.getPackage().getImplementationVersion()
                + " | hibernate " + org.hibernate.Version.getVersionString() + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (boolean ext : new boolean[] { false, true })
            for (String method : new String[] { "name", "none", "nick" }) {
                no++;
                String key = ext + "|" + method;
                Path dir = base.resolve(ext + "-" + method), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                Files.createDirectories(src); Files.createDirectories(classes);
                Files.writeString(src.resolve("Member.java"), MEMBER, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("MemberRepository.java"), repoSource(ext, method), StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Main.java"), mainSource(method, true), StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Probe.java"), PROBE, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("SqlLog.java"), SQLLOG, StandardCharsets.UTF_8);
                List<String> files = List.of("Member.java", "MemberRepository.java", "Main.java", "Probe.java", "SqlLog.java");
                List<String> errs = compile(javac, cp, src, classes, files);
                if (errs != null) {
                    // 쓰는 쪽을 뺀 변형을 따로 컴파일해 실행한다: 스프링이 이 인터페이스의 구현 객체를 만드는가
                    Path vdir = base.resolve(ext + "-" + method + "-variant"), vsrc = vdir.resolve("src/app"), vclasses = vdir.resolve("classes");
                    Files.createDirectories(vsrc); Files.createDirectories(vclasses);
                    Files.writeString(vsrc.resolve("Member.java"), MEMBER, StandardCharsets.UTF_8);
                    Files.writeString(vsrc.resolve("MemberRepository.java"), repoSource(ext, method), StandardCharsets.UTF_8);
                    Files.writeString(vsrc.resolve("Main.java"), mainSource(method, false), StandardCharsets.UTF_8);
                    Files.writeString(vsrc.resolve("Probe.java"), PROBE, StandardCharsets.UTF_8);
                    Files.writeString(vsrc.resolve("SqlLog.java"), SQLLOG, StandardCharsets.UTF_8);
                    List<String> verrs = compile(javac, cp, vsrc, vclasses, files);
                    String variant = verrs != null ? "VARIANT_COMPILE_ERROR " + verrs : run(cp, vclasses, no + 100);
                    out.add(key + " => compile=ERR|nerr=" + errs.size() + "|errs=" + String.join(" ;; ", errs) + "|variant=[" + variant + "]");
                    continue;
                }
                out.add(key + " => compile=OK|" + run(cp, classes, no));
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
