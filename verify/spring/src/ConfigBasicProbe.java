import java.io.File;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.boot.SpringBootVersion;

// 기초개념 "설정 파일" 실습을 실제 스프링 부트 4.1.1에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 파일(application.properties, 패키지 app의 ShopInfo와 App)을 임시 폴더에 만들고,
// 자바 파일은 컴파일해 classes 폴더에 둔 뒤 application.properties를 그 폴더(클래스패스의 맨 위)에 놓고,
// 자식 java 프로세스로 app.App을 그대로(main 메서드부터) 실행해 표준 출력과 종료 코드와 예외를 프로세스 밖에서 관찰한다.
//   prop : application.properties의 shop.name 줄. kim = shop.name=kim-shop, lee = shop.name=lee-shop, none = 그 줄을 지움(파일에는 주석 줄만 남음)
//   def  : @Value("${shop.name:no-name}")처럼 기본값을 적었는가
// 클래스패스: spring-boot-starter가 들여오는 jar만(웹 라이브러리 없음. 스프링 부트 기초개념 실습의 BASE 목록과 같다) + classes 폴더.
// 자식 프로세스의 작업 폴더는 비어 있는 임시 폴더다(스프링 부트는 작업 폴더의 application.properties와 config/도 읽기 때문).
// 별도 프로세스(app.Inspect, 화면의 코드에는 없는 Probe 전용 클래스)가 같은 App으로 SpringApplication을 돌리고 스프링 안을 들여다본다:
//   읽은 설정 출처의 이름, Environment의 shop.name 값, ShopInfo 객체가 run이 끝났을 때 이미 있는가, 실패한 경우 예외 사슬.
public class ConfigBasicProbe {
    static final String LIBS = "E:/dev/java-interview-lab/verify/spring/libs/";
    static final String JDK = "E:/dev/jdk-21.0.12.1+1/bin/";

    // spring-boot-starter의 의존 관계(BootBasicProbe의 BASE와 같음. pom 확인)
    static final String[] BASE = { "spring-boot", "spring-boot-autoconfigure", "spring-boot-starter", "spring-boot-starter-logging", "logback-classic", "logback-core",
            "log4j-to-slf4j", "log4j-api", "jul-to-slf4j", "slf4j-api", "spring-core", "commons-logging", "jspecify", "spring-context", "spring-aop", "spring-beans",
            "spring-expression", "micrometer-observation", "micrometer-commons", "jakarta.annotation-api", "snakeyaml" };

    static String jar(String name) throws Exception {
        List<String> hit = new ArrayList<>();
        try (var st = Files.list(Path.of(LIBS))) {
            st.map(p -> p.getFileName().toString()).filter(f -> f.matches(Pattern.quote(name) + "-\\d[^/]*\\.jar")).forEach(hit::add);
        }
        if (hit.size() != 1) throw new IllegalStateException("jar " + name + " -> " + hit);
        return LIBS + hit.get(0);
    }

    static String classpath() throws Exception {
        List<String> jars = new ArrayList<>();
        for (String n : BASE) jars.add(jar(n));
        return String.join(File.pathSeparator, jars);
    }

    static String propsSource(String prop) {
        StringBuilder s = new StringBuilder("# application.properties\n");
        if (!prop.equals("none")) s.append("# 설정: 이름=값 꼴로 코드 밖에 적는 값\nshop.name=").append(prop.equals("kim") ? "kim-shop" : "lee-shop").append("\n");
        return s.toString();
    }

    static String shopSource(boolean def) {
        return "package app;\n\nimport org.springframework.beans.factory.annotation.Value;\nimport org.springframework.stereotype.Component;\n\n"
                + "@Component\nclass ShopInfo {\n    // 받기: 설정에서 shop.name 값을 찾아 name에 넣는다\n    @Value(\"${shop.name" + (def ? ":no-name" : "") + "}\")\n    String name;\n}\n";
    }

    static String appSource() {
        return "package app;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.context.ApplicationContext;\n\n"
                + "@SpringBootApplication\npublic class App {\n    public static void main(String[] args) {\n"
                + "        // 스프링을 시작한다. ctx는 스프링이 만든 객체를 보관한 곳이다\n"
                + "        ApplicationContext ctx = SpringApplication.run(App.class, args);\n        ShopInfo info = ctx.getBean(ShopInfo.class);\n        System.out.println(info.name);\n    }\n}\n";
    }

    static final String INSPECT = """
            package app;

            import org.springframework.boot.Banner;
            import org.springframework.boot.SpringApplication;
            import org.springframework.context.ConfigurableApplicationContext;
            import org.springframework.core.env.ConfigurableEnvironment;
            import org.springframework.core.env.PropertySource;

            public class Inspect {
                static String one(Throwable t) {
                    String m = String.valueOf(t.getMessage());
                    int i = m.indexOf('\\n');
                    return t.getClass().getName() + ": " + (i < 0 ? m : m.substring(0, i));
                }

                public static void main(String[] args) throws Exception {
                    SpringApplication app = new SpringApplication(App.class);
                    app.setBannerMode(Banner.Mode.OFF);
                    app.setLogStartupInfo(false);
                    StringBuilder sb = new StringBuilder("INSPECT ");
                    try (ConfigurableApplicationContext ctx = app.run(args)) {
                        ConfigurableEnvironment env = ctx.getEnvironment();
                        java.util.List<String> src = new java.util.ArrayList<>();
                        for (PropertySource<?> ps : env.getPropertySources()) if (ps.getName().contains("application.properties")) src.add(ps.getName());
                        sb.append("propSource=").append(String.join(";", src));
                        sb.append("|envShop=").append(env.getProperty("shop.name"));
                        boolean made = ctx.getBeanFactory().containsSingleton("shopInfo");
                        sb.append("|shopInfoMade=").append(made);
                        if (made) {
                            Object o = ctx.getBean("shopInfo");
                            java.lang.reflect.Field f = o.getClass().getDeclaredField("name");
                            f.setAccessible(true);
                            sb.append("|field=").append(f.get(o));
                            sb.append("|ctor=").append(o.getClass().getDeclaredConstructors().length);
                        }
                    } catch (Throwable t) {
                        sb.append("fail=").append(one(t));
                        Throwable c = t;
                        StringBuilder chain = new StringBuilder(t.getClass().getName());
                        while (c.getCause() != null && c.getCause() != c) { c = c.getCause(); chain.append(">").append(c.getClass().getName()); }
                        sb.append("|chain=").append(chain).append("|root=").append(one(c));
                    }
                    System.out.println(sb);
                }
            }
            """;

    static String esc(String s) { return s.replace("\r", "").replace("\n", "\\n"); }
    static String clean(String s) { return s.replace('|', '¦').replace('\r', ' ').replace('\n', ' ').trim(); }

    static String sha(Path p) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(p));
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) sb.append(String.format("%02x", d[i]));
        return sb.toString();
    }

    static ProcessBuilder child(String cp, Path work, String mainClass, String... extra) {
        List<String> cmd = new ArrayList<>(List.of(JDK + "java.exe", "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", cp, mainClass));
        cmd.addAll(List.of(extra));
        ProcessBuilder pb = new ProcessBuilder(cmd).directory(work.toFile());
        pb.environment().keySet().removeIf(k -> k.toUpperCase().startsWith("SPRING_") || k.toUpperCase().startsWith("SHOP_") || k.equalsIgnoreCase("JAVA_TOOL_OPTIONS") || k.equalsIgnoreCase("_JAVA_OPTIONS"));
        return pb;
    }

    // 실행해서 exit, stdout, stderr를 돌려준다
    static String[] run(ProcessBuilder pb, Path dir, String tag) throws Exception {
        Path so = dir.resolve(tag + ".out"), se = dir.resolve(tag + ".err");
        Process p = pb.redirectOutput(so.toFile()).redirectError(se.toFile()).start();
        boolean done = p.waitFor(60, TimeUnit.SECONDS);
        if (!done) { p.descendants().forEach(ProcessHandle::destroyForcibly); p.destroyForcibly(); p.waitFor(); }
        return new String[] { done ? String.valueOf(p.exitValue()) : "TIMEOUT", Files.readString(so, StandardCharsets.UTF_8), Files.readString(se, StandardCharsets.UTF_8) };
    }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-config-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | java " + System.getProperty("java.version"));
        out.add("# 클래스패스: spring-boot-starter가 들여오는 jar " + BASE.length + "개 + classes 폴더(application.properties도 여기). 작업 폴더는 빈 임시 폴더.");
        String cp0 = classpath();
        int no = 0;
        Path keep = null;
        for (String prop : new String[] { "kim", "lee", "none" })
            for (boolean def : new boolean[] { false, true }) {
                String key = prop + "|" + def;
                Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes"), ins = dir.resolve("inspect"), work = dir.resolve("work");
                for (Path d : new Path[] { src, classes, ins, work }) Files.createDirectories(d);
                String props = propsSource(prop), shop = shopSource(def), app = appSource();
                Files.writeString(src.resolve("ShopInfo.java"), shop, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("App.java"), app, StandardCharsets.UTF_8);
                Files.writeString(classes.resolve("application.properties"), props, StandardCharsets.UTF_8);
                StringWriter cw = new StringWriter();
                java.io.PrintStream err = new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } });
                int rc = javac.run(null, null, err, "-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp0, "-d", classes.toString(),
                        src.resolve("ShopInfo.java").toString(), src.resolve("App.java").toString());
                if (rc != 0) { out.add(key + " => COMPILE_ERROR " + clean(cw.toString())); continue; }
                Files.writeString(src.resolve("Inspect.java"), INSPECT, StandardCharsets.UTF_8);
                rc = javac.run(null, null, err, "-encoding", "UTF-8", "-proc:none", "-cp", cp0 + File.pathSeparator + classes, "-d", ins.toString(), src.resolve("Inspect.java").toString());
                if (rc != 0) { out.add(key + " => COMPILE_ERROR(Inspect) " + clean(cw.toString())); continue; }
                String cp = cp0 + File.pathSeparator + classes;
                if (prop.equals("kim") && !def) keep = dir;

                // 1) Inspect
                String[] ir = run(child(cp + File.pathSeparator + ins, work, "app.Inspect", "--logging.level.root=OFF"), dir, "inspect");
                String insp = ir[1].lines().filter(l -> l.startsWith("INSPECT ")).findFirst().orElse("INSPECT ?").substring(8);

                // 2) 진짜 실행: java app.App
                String[] r = run(child(cp, work, "app.App", "--logging.level.root=OFF", "--spring.main.banner-mode=off"), dir, "app");
                String stdout = r[1].replace("\r", ""), stderr = r[2].replace("\r", "");
                List<String> el = stderr.lines().toList();
                String first = el.stream().filter(l -> l.startsWith("Exception in thread")).findFirst().orElse("-");
                String lastCause = "-";
                for (String l : el) if (l.startsWith("Caused by:")) lastCause = l;
                boolean frameMain = el.stream().anyMatch(l -> l.contains("app.App.main(App.java:"));
                boolean frameRun = el.stream().anyMatch(l -> l.contains("org.springframework.boot.SpringApplication.run("));
                boolean frameInject = el.stream().anyMatch(l -> l.contains("app.ShopInfo") || l.contains("shopInfo"));
                out.add(key + " => exit=" + r[0] + "|stdout=" + esc(stdout).replace("|", "¦") + "|stderrFirst=" + clean(first) + "|lastCause=" + clean(lastCause)
                        + "|frameMain=" + frameMain + "|frameRun=" + frameRun + "|stderrLines=" + el.size()
                        + "|hashShop=" + sha(classes.resolve("app/ShopInfo.class")) + "|hashApp=" + sha(classes.resolve("app/App.class"))
                        + "|inspect=" + clean(insp).replace(" ", "_")
                        + "|props=" + esc(props) + "|shop=" + esc(shop) + "|app=" + esc(app));
            }
        // 코드를 다시 컴파일하지 않고 설정 파일만 고치면: kim|false의 classes 폴더에서 application.properties만 lee로 바꿔 실행
        if (keep != null) {
            Path classes = keep.resolve("classes"), work = keep.resolve("work");
            String before = sha(classes.resolve("app/ShopInfo.class")) + "," + sha(classes.resolve("app/App.class"));
            Files.writeString(classes.resolve("application.properties"), propsSource("lee"), StandardCharsets.UTF_8);
            String[] r = run(child(cp0 + File.pathSeparator + classes, work, "app.App", "--logging.level.root=OFF", "--spring.main.banner-mode=off"), keep, "app2");
            String after = sha(classes.resolve("app/ShopInfo.class")) + "," + sha(classes.resolve("app/App.class"));
            out.add("# norecompile => exit=" + r[0] + "|stdout=" + esc(r[1].replace("\r", "")) + "|classesBefore=" + before + "|classesAfter=" + after);
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
