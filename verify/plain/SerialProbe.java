import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.PrintStream;
import java.io.StringWriter;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// "직렬화" 실습의 열다섯 가지 조합을 실제로 실행한다. User 클래스 3 × point 필드 3 × 저장 뒤의 변화 3 가운데,
// 저장부터 실패하는 클래스(no, field)는 저장 뒤의 변화가 뜻이 없으므로 same 하나만 실행한다(화면의 설정도 그렇게 고정된다).
// 조합마다 화면의 코드와 같은 소스를 컴파일한다. "저장한 뒤 클래스를 고쳐 다시 컴파일"하는 조합은
// 같은 이름의 User 클래스를 두 벌(v1, v2) 따로 컴파일해, v1으로 저장한 파일을 v2로 읽는다.
// 클래스 로더를 따로 쓰므로 v2 쪽은 저장한 프로그램과 다른 프로그램에서 읽는 것과 같다.
// 출력: cls|fld|chg => 저장 결과|되살리기 결과|되살린 name과 point|생성자 실행 횟수|예외 메시지
// 사용: java SerialProbe <컴파일 결과와 파일을 둘 폴더>
public class SerialProbe {
    static JavaFileObject unit(String name, String src) {
        return new SimpleJavaFileObject(URI.create("string:///" + name + ".java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
    }

    // uid: "1", "2" 또는 "none"(serialVersionUID를 적지 않음). extra: 클래스에 더 넣을 필드 선언
    static String userSrc(String cls, String fieldDecl, String uid, String extra) {
        boolean ser = !cls.equals("no");
        return "import java.io.Serializable;\n"
            + (cls.equals("field") ? "class Address {\n    String city = \"Seoul\";\n}\n" : "")
            + "class User" + (ser ? " implements Serializable" : "") + " {\n"
            + (ser && !uid.equals("none") ? "    private static final long serialVersionUID = " + uid + "L;\n" : "")
            + "    String name;\n"
            + "    " + fieldDecl + "\n"
            + (cls.equals("field") ? "    Address address = new Address();\n" : "")
            + extra
            + "    User(String name) {\n        this.name = name;\n        System.out.println(\"생성자 실행\");\n    }\n}\n";
    }

    static String saveSrc(boolean isStatic) {
        String p = isStatic ? "User.point" : "u.point";
        return "import java.io.*;\npublic class Save {\n    public static Object run(String file) throws Exception {\n"
            + "        User u = new User(\"kim\");\n"
            + "        " + p + " = 50;\n"
            + "        try (ObjectOutputStream out = new ObjectOutputStream(new FileOutputStream(file))) {\n"
            + "            out.writeObject(u);\n"
            + "        }\n"
            + "        " + p + " = 70;\n"
            + "        return u;\n    }\n}\n";
    }

    static String loadSrc(boolean isStatic, String more) {
        return "import java.io.*;\npublic class Load {\n    public static Object last;\n    public static String run(String file) throws Exception {\n"
            + "        try (ObjectInputStream in = new ObjectInputStream(new FileInputStream(file))) {\n"
            + "            User r = (User) in.readObject();\n"
            + "            last = r;\n"
            + "            return r.name + \" \" + " + (isStatic ? "User.point" : "r.point") + more + ";\n"
            + "        }\n    }\n}\n";
    }

    static URLClassLoader compile(File dir, String user, String save, String load) throws Exception {
        dir.mkdirs();
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        StringWriter err = new StringWriter();
        boolean ok = jc.getTask(err, null, null, Arrays.asList("-d", dir.getPath(), "-proc:none", "-Xlint:none"), null,
            List.of(unit("User", user), unit("Save", save), unit("Load", load))).call();
        if (!ok) throw new IllegalStateException("컴파일 실패: " + err);
        return new URLClassLoader(new URL[] { dir.toURI().toURL() }, ClassLoader.getSystemClassLoader());
    }

    static Object call(ClassLoader cl, String cls, String file) throws Throwable {
        try { return cl.loadClass(cls).getMethod("run", String.class).invoke(null, file); }
        catch (InvocationTargetException e) { throw e.getCause(); }
    }

    static String decl(String fld) { return fld.equals("transient") ? "transient int point;" : fld.equals("static") ? "static int point;" : "int point;"; }

    static String one(File base, String cls, String fld, String chg) throws Exception {
        String key = cls + "_" + fld + "_" + chg, file = new File(base, key + ".ser").getPath();
        boolean st = fld.equals("static");
        String uid1 = chg.equals("auto") ? "none" : "1";
        URLClassLoader v1 = compile(new File(base, key + "_v1"), userSrc(cls, decl(fld), uid1, ""), saveSrc(st), loadSrc(st, ""));
        URLClassLoader v2 = chg.equals("same") ? v1 : compile(new File(base, key + "_v2"),
            userSrc(cls, decl(fld), chg.equals("uid") ? "2" : "none", chg.equals("auto") ? "    String email;\n" : ""), saveSrc(st), loadSrc(st, ""));
        PrintStream old = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
        String save = "ok", load = "-", vals = "-", msg = "-";
        try {
            try { call(v1, "Save", file); }
            catch (Throwable e) { save = e.getClass().getSimpleName(); msg = String.valueOf(e.getMessage()); }
            if (save.equals("ok")) {
                try { vals = (String) call(v2, "Load", file); load = "ok"; }
                catch (Throwable e) { load = e.getClass().getSimpleName(); msg = String.valueOf(e.getMessage()); }
            }
        } finally { System.setOut(old); }
        long ctor = buf.toString(StandardCharsets.UTF_8).lines().filter(l -> l.equals("생성자 실행")).count();
        return save + "|" + load + "|" + vals + "|" + ctor + "|" + msg;
    }

    public static void main(String[] args) throws Throwable {
        File base = new File(args[0]);
        for (String cls : new String[] { "ok", "no", "field" })
            for (String fld : new String[] { "plain", "transient", "static" })
                for (String chg : new String[] { "same", "uid", "auto" }) {
                    if (!cls.equals("ok") && !chg.equals("same")) continue;
                    System.out.println(cls + "|" + fld + "|" + chg + " => " + one(base, cls, fld, chg));
                }

        // 아래는 조합이 아니라, 실습의 글에서 말하는 사실을 따로 확인한 것이다.
        PrintStream old = System.out;
        List<String> out = new ArrayList<>();
        System.setOut(new PrintStream(new ByteArrayOutputStream(), true, StandardCharsets.UTF_8));
        try {
            // 1) serialVersionUID를 1L로 적어 둔 채 필드(email)만 추가하면 읽을 수 있는가, 새 필드의 값은 무엇인가
            String f1 = new File(base, "x1.ser").getPath();
            URLClassLoader a1 = compile(new File(base, "x1_v1"), userSrc("ok", "int point;", "1", ""), saveSrc(false), loadSrc(false, ""));
            URLClassLoader a2 = compile(new File(base, "x1_v2"), userSrc("ok", "int point;", "1", "    String email;\n"), saveSrc(false), loadSrc(false, " + \" \" + r.email"));
            call(a1, "Save", f1);
            out.add("extra|serialVersionUID를 1L로 둔 채 필드 추가 뒤 읽기 (name point email) => " + call(a2, "Load", f1));

            // 2) transient인 참조형(String) 필드는 되살리면 null인가
            String f2 = new File(base, "x2.ser").getPath();
            URLClassLoader b1 = compile(new File(base, "x2_v1"), userSrc("ok", "int point;", "1", "    transient String memo = \"hello\";\n"), saveSrc(false), loadSrc(false, " + \" \" + r.memo"));
            call(b1, "Save", f2);
            out.add("extra|transient String 필드를 되살린 값 (name point memo) => " + call(b1, "Load", f2));

            // 3) static 필드를 50으로 두고 저장한 파일을, 다른 프로그램(다른 클래스 로더)에서 읽으면 static 값은 무엇인가
            String f3 = new File(base, "x3.ser").getPath();
            URLClassLoader c1 = compile(new File(base, "x3_v1"), userSrc("ok", "static int point;", "1", ""), saveSrc(true), loadSrc(true, ""));
            URLClassLoader c2 = compile(new File(base, "x3_v2"), userSrc("ok", "static int point;", "1", ""), saveSrc(true), loadSrc(true, ""));
            call(c1, "Save", f3);
            out.add("extra|static 필드를 다른 프로그램에서 읽은 값 (name point) => " + call(c2, "Load", f3));

            // 4) Serializable이 아닌 Address 필드에 transient를 붙이면 저장할 수 있는가, 되살린 address는 무엇인가
            String f4 = new File(base, "x4.ser").getPath();
            String u4 = userSrc("field", "int point;", "1", "").replace("    Address address = new Address();", "    transient Address address = new Address();");
            URLClassLoader d1 = compile(new File(base, "x4_v1"), u4, saveSrc(false), loadSrc(false, " + \" \" + r.address"));
            call(d1, "Save", f4);
            out.add("extra|Address 필드에 transient를 붙이고 저장한 뒤 되살린 값 (name point address) => " + call(d1, "Load", f4));

            // 5) 되살린 객체는 저장한 원래 객체와 같은 객체인가
            String f5 = new File(base, "x5.ser").getPath();
            URLClassLoader e1 = compile(new File(base, "x5_v1"), userSrc("ok", "int point;", "1", ""), saveSrc(false), loadSrc(false, ""));
            Object u = call(e1, "Save", f5);
            call(e1, "Load", f5);
            Object r = e1.loadClass("Load").getField("last").get(null);
            out.add("extra|되살린 객체 == 원래 객체 => " + (u == r));
        } finally { System.setOut(old); }
        out.forEach(System.out::println);
    }
}
