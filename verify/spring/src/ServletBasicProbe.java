import java.io.StringWriter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.apache.catalina.Container;
import org.apache.catalina.Context;
import org.apache.catalina.Wrapper;
import org.apache.catalina.startup.ContextConfig;
import org.apache.catalina.startup.Tomcat;
import org.apache.tomcat.util.scan.StandardJarScanner;

// 기초개념 "서블릿" 실습을 실제 톰캣(내장 톰캣 11)에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 소스를 만들어 컴파일하고, 웹 애플리케이션 폴더(WEB-INF/classes)에 넣어 톰캣을 띄운다.
// 클래스를 톰캣에 손으로 등록하지 않는다. 톰캣이 클래스 파일을 훑어 @WebServlet을 찾는 실제 배치 과정을 그대로 거친다.
//   ext  : 클래스 선언에 extends HttpServlet이 있는가
//   map  : 클래스 위에 @WebServlet이 있는가
//   many : one(주소 1개) / each(주소 3개를 클래스 3개가 하나씩) / shared(주소 3개를 클래스 1개가 모두)
// 적는 것: 톰캣의 주소 표(주소 → 클래스), 요청마다의 상태 코드와 본문, 만들어진 객체 수, doGet 실행 횟수.
public class ServletBasicProbe {
    static final String[][] ONE = { { "Hello", "/hello", "안녕하세요" } };
    static final String[][] EACH = { { "Login", "/login", "로그인 화면" }, { "Join", "/join", "회원가입 화면" }, { "Members", "/members", "회원 목록" } };

    // 화면의 코드와 같은 구조. 세는 코드(생성자와 doGet 첫 줄의 System.setProperty)만 더했다.
    static String source(String cls, boolean ext, boolean map, String[] urls, String body) {
        StringBuilder s = new StringBuilder();
        s.append("import jakarta.servlet.annotation.WebServlet;\nimport jakarta.servlet.http.HttpServlet;\nimport jakarta.servlet.http.HttpServletRequest;\nimport jakarta.servlet.http.HttpServletResponse;\nimport java.io.IOException;\n\n");
        if (map) s.append(urls.length == 1 ? "@WebServlet(\"" + urls[0] + "\")\n" : "@WebServlet({\"" + String.join("\", \"", urls) + "\"})\n");
        s.append("public class ").append(cls).append(ext ? " extends HttpServlet" : "").append(" {\n");
        s.append("    public ").append(cls).append("() { hit(\"lab.made\"); }\n");
        s.append("    static void hit(String k) { System.setProperty(k, String.valueOf(Integer.getInteger(k, 0) + 1)); }\n");
        s.append("    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {\n");
        s.append("        hit(\"lab.doGet\");\n");
        s.append("        resp.setContentType(\"text/plain; charset=UTF-8\");\n");
        s.append("        resp.getWriter().write(\"").append(body).append("\");\n");
        s.append("    }\n}\n");
        return s.toString();
    }

    static final HttpClient client = HttpClient.newHttpClient();

    public static void main(String[] args) throws Exception {
        java.util.logging.LogManager.getLogManager().reset();
        List<String> out = new ArrayList<>();
        out.add("# tomcat " + org.apache.catalina.util.ServerInfo.getServerNumber() + " | java " + System.getProperty("java.version"));
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        Path root = Files.createTempDirectory("lab-servlet-basic");
        int no = 0;
        for (boolean ext : new boolean[] { false, true })
            for (boolean map : new boolean[] { false, true })
                for (String many : new String[] { "one", "each", "shared" }) {
                    Path app = root.resolve("app" + (no++)), classes = app.resolve("WEB-INF/classes"), src = app.resolve("src");
                    Files.createDirectories(classes); Files.createDirectories(src);
                    Map<String, String> files = new LinkedHashMap<>();
                    String[] paths;
                    if (many.equals("one")) { paths = new String[] { "/hello" }; files.put("Hello", source("Hello", ext, map, paths, ONE[0][2])); }
                    else if (many.equals("each")) { paths = new String[] { "/login", "/join", "/members" }; for (String[] e : EACH) { String c = e[0]; files.put(c, source(c, ext, map, new String[] { e[1] }, e[2])); } }
                    else { paths = new String[] { "/login", "/join", "/members" }; String c = "Member"; files.put(c, source(c, ext, map, paths, "회원 화면")); }
                    List<String> srcFiles = new ArrayList<>();
                    for (Map.Entry<String, String> e : files.entrySet()) { Path f = src.resolve(e.getKey() + ".java"); Files.writeString(f, e.getValue(), StandardCharsets.UTF_8); srcFiles.add(f.toString()); }
                    List<String> opts = new ArrayList<>(List.of("-encoding", "UTF-8", "-proc:none", "-cp", System.getProperty("java.class.path"), "-d", classes.toString()));
                    opts.addAll(srcFiles);
                    StringWriter cw = new StringWriter();
                    int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }), opts.toArray(new String[0]));
                    if (rc != 0) { out.add(ext + "|" + map + "|" + many + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }

                    System.clearProperty("lab.made"); System.clearProperty("lab.doGet");
                    Tomcat tomcat = new Tomcat();
                    tomcat.setBaseDir(root.resolve("base" + no).toString()); tomcat.setPort(0);
                    Context ctx = tomcat.addWebapp(tomcat.getHost(), "", app.toString(), new ContextConfig());
                    // 이 Probe의 클래스패스(스프링 등)는 훑지 않고, 웹 애플리케이션 폴더의 클래스만 훑게 한다
                    ((StandardJarScanner) ctx.getJarScanner()).setScanClassPath(false);
                    tomcat.getConnector();
                    String startErr = "";
                    try { tomcat.start(); } catch (Exception e) { startErr = e.toString(); }
                    String state = ctx.getState().toString();
                    // 주소 표: 톰캣이 기본으로 넣는 것(기본 서블릿 "/", JSP)을 뺀 나머지
                    TreeMap<String, String> table = new TreeMap<>();
                    for (String p : ctx.findServletMappings()) { String name = ctx.findServletMapping(p); Container w = ctx.findChild(name); String cls = w instanceof Wrapper ? ((Wrapper) w).getServletClass() : "?"; if (cls != null && cls.startsWith("org.apache.")) continue; table.put(p, cls); }
                    int madeAtStart = Integer.getInteger("lab.made", 0);
                    // 작성한 클래스가 Servlet 타입인지: 컴파일한 클래스를 읽어 들여 직접 확인한다
                    boolean isServlet = true;
                    try (java.net.URLClassLoader cl = new java.net.URLClassLoader(new java.net.URL[] { classes.toUri().toURL() }, ServletBasicProbe.class.getClassLoader())) {
                        for (String c : files.keySet()) isServlet &= jakarta.servlet.Servlet.class.isAssignableFrom(Class.forName(c, false, cl));
                    }
                    // 주소마다 한 번씩 차례로 요청한다(round1). 그 뒤 같은 요청을 한 번 더 보낸 결과(round2)도 적어 둔다
                    List<String> r1 = new ArrayList<>(), r2 = new ArrayList<>();
                    int port = tomcat.getConnector().getLocalPort(), made1 = 0, doGet1 = 0;
                    for (int round = 0; round < 2; round++) {
                        for (String p : paths) {
                            HttpResponse<String> r = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + p)).GET().build(), HttpResponse.BodyHandlers.ofString());
                            (round == 0 ? r1 : r2).add(p + "=" + r.statusCode() + ":" + (r.statusCode() == 200 ? r.body() : r.body().contains("is not a Servlet") ? "not a Servlet" : "-"));
                        }
                        if (round == 0) { made1 = Integer.getInteger("lab.made", 0); doGet1 = Integer.getInteger("lab.doGet", 0); }
                    }
                    try { tomcat.stop(); tomcat.destroy(); } catch (Exception e) { }
                    out.add(ext + "|" + map + "|" + many + " => state=" + state + (startErr.isEmpty() ? "" : "(" + startErr + ")") + "|classes=" + String.join(",", files.keySet()) + "|table=" + table + "|isServlet=" + isServlet + "|madeAtStart=" + madeAtStart + "|made1=" + made1 + "|doGet1=" + doGet1 + "|round1=" + String.join(";", r1) + "|round2=" + String.join(";", r2));
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
        out.forEach(System.out::println);
    }
}
