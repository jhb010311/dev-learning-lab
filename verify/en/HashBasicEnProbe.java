// English-lab version of verify/plain/HashBasicProbe.java: same method and same inputs (pass1234, pass1235); only the comments in the code on the screen are English.
// Run: java verify/en/HashBasicEnProbe.java <output dir for generated sources>   Output is saved to verify/en/HashBasicEnProbe.out.txt
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Method;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "해시" 실습의 여섯 가지 조합(저장 방법 2 x 입력 3)을 실제로 실행한다.
// 조합마다 화면에 보이는 코드(처음 설정의 줄임 없는 소스)를 import, sha256 도우미 메서드, main으로 감싼 Main.java로 만들어
// javax.tools로 컴파일하고, 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
// 화면에 보이는 부분은 Main.java 안의 "// 화면 시작"과 "// 화면 끝" 줄 사이이고, cmp가 그 부분만 뽑아 화면의 코드와 견준다.
//   store : hash(해시한 값을 저장) / plain(비밀번호를 그대로 저장)
//   input : right(pass1234) / typo(pass1235) / stolen(저장된 값 saved를 그대로 입력)
// 계산이 표준대로인지: 출력 첫머리에 FIPS 180-4의 SHA-256 예시 두 가지("abc"와 56글자 메시지. NIST의 SHA256 예시 문서와
//   RFC 6234 시험 벡터에서 확인한 값)를 Probe가 계산해 문서의 값과 견준 결과(STD)를 남긴다.
// 세 구현의 값 견주기: HASH 줄(입력의 UTF-8 바이트를 16진수로, 자바 계산 값). cmp가 같은 바이트를 Node.js crypto와 openssl dgst -sha256으로 계산해 견준다.
// 단계 문장이 기대는 사실: FACT 줄.
// 출력(조합): store|input => 컴파일(OK/ERR)|오류 개수|Main.class가 만들어졌는가|프로그램이 출력한 saved|프로그램이 출력한 ok|
//        입력에서 계산한 값(Main.sha256(input)을 reflection으로 부른 값. plain은 '-')
public class HashBasicEnProbe {
    static final String PASS = "pass1234", TYPO = "pass1235";

    static String sha256(String text) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(text.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    static String fragment(String store, String input) {
        boolean hash = store.equals("hash");
        StringBuilder s = new StringBuilder();
        if (hash) s.append("// At sign-up: store the hash value, not the password itself\n").append("String saved = sha256(\"pass1234\");\n");
        else s.append("// At sign-up: store the password as it is\n").append("String saved = \"pass1234\";\n");
        s.append("\n");
        s.append(hash ? "// At login: hash the input the same way and compare it with the stored value\n" : "// At login: compare the input with the stored value as it is\n");
        s.append("String input = ").append(input.equals("right") ? "\"pass1234\"" : input.equals("typo") ? "\"pass1235\"" : "saved").append(";\n");
        s.append(hash ? "boolean ok = sha256(input).equals(saved);\n" : "boolean ok = input.equals(saved);\n");
        s.append("\n");
        s.append("System.out.println(saved);\n").append("System.out.println(ok);\n");
        return s.toString();
    }

    // 전체 소스: 화면에 보이지 않는 부분(import, sha256 도우미 메서드, main의 틀)을 더한다
    static String source(String store, String input) {
        StringBuilder s = new StringBuilder();
        s.append("import java.nio.charset.StandardCharsets;\n").append("import java.security.MessageDigest;\n").append("import java.util.HexFormat;\n\n");
        s.append("public class Main {\n");
        s.append("    static String sha256(String text) throws Exception {\n")
         .append("        MessageDigest md = MessageDigest.getInstance(\"SHA-256\");\n")
         .append("        byte[] hash = md.digest(text.getBytes(StandardCharsets.UTF_8));\n")
         .append("        return HexFormat.of().formatHex(hash);\n")
         .append("    }\n\n");
        s.append("    public static void main(String[] args) throws Exception {\n");
        s.append("        // 화면 시작\n");
        for (String ln : fragment(store, input).stripTrailing().split("\n", -1)) {
            if (ln.isEmpty()) s.append("\n"); else s.append("        ").append(ln).append("\n");
        }
        s.append("        // 화면 끝\n");
        s.append("    }\n}\n");
        return s.toString();
    }

    static String hex(String text) { return HexFormat.of().formatHex(text.getBytes(StandardCharsets.UTF_8)); }

    static boolean compile(String src, Path dir) throws Exception {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics())
            if (d.getKind() == Diagnostic.Kind.ERROR) System.out.println("# 컴파일 오류 " + d.getCode() + " " + d.getMessage(Locale.ENGLISH));
        return ok;
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/hash_basic";
        System.out.println("# java " + System.getProperty("java.version"));

        // 1. 계산이 표준대로인지: 표준 문서의 예시와 견준다
        String[][] std = {
            { "abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" },
            { "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1" },
        };
        for (String[] e : std) {
            String got = sha256(e[0]);
            System.out.println("STD " + hex(e[0]) + " => " + got + "|" + e[1] + "|" + (got.equals(e[1]) ? "same" : "DIFFERENT"));
        }

        // 2. 세 구현을 견줄 입력들 (자바의 값)
        String saved1234 = sha256(PASS);
        String[] inputs = { "", "abc", "a", "a".repeat(100), PASS, TYPO, saved1234, sha256(TYPO) };
        for (String t : inputs) System.out.println("HASH " + hex(t) + " => " + sha256(t));

        // 3. 단계 문장이 기대는 사실
        String a = sha256(PASS), b = sha256(PASS), c = sha256(TYPO);
        System.out.println("FACT same-twice => " + a.equals(b));
        int diff = 0; for (int i = 0; i < a.length(); i++) if (a.charAt(i) != c.charAt(i)) diff++;
        System.out.println("FACT typo-diff-positions => " + diff + " of " + a.length());
        System.out.println("FACT len-1char => " + sha256("a").length());
        System.out.println("FACT len-100chars => " + sha256("a".repeat(100)).length());
        System.out.println("FACT len-empty => " + sha256("").length());
        System.out.println("FACT hex-only => " + a.matches("[0-9a-f]{64}"));
        System.out.println("FACT hash-of-hash-differs => " + !sha256(a).equals(a));
        int prefixSame = 0; while (prefixSame < a.length() && a.charAt(prefixSame) == c.charAt(prefixSame)) prefixSame++;
        System.out.println("FACT typo-common-prefix => " + prefixSame);

        // 4. 여섯 가지 조합을 컴파일하고 실행
        for (String store : new String[] { "hash", "plain" })
            for (String input : new String[] { "right", "typo", "stolen" }) {
                String src = source(store, input);
                Path dir = Path.of(base, store + "-" + input);
                Files.createDirectories(dir);
                Files.deleteIfExists(dir.resolve("Main.class"));
                Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                boolean ok = compile(src, dir);
                String saved = "-", okOut = "-", inHash = "-";
                if (ok) {
                    try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, HashBasicEnProbe.class.getClassLoader().getParent())) {
                        PrintStream old = System.out;
                        ByteArrayOutputStream buf = new ByteArrayOutputStream();
                        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                        Class<?> m = cl.loadClass("Main");
                        try { m.getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                        finally { System.setOut(old); }
                        String[] out = buf.toString(StandardCharsets.UTF_8).strip().split("\r?\n");
                        saved = out[0]; okOut = out[1];
                        if (store.equals("hash")) {
                            String typed = input.equals("right") ? PASS : input.equals("typo") ? TYPO : saved;
                            Method sh = m.getDeclaredMethod("sha256", String.class);
                            sh.setAccessible(true);
                            inHash = (String) sh.invoke(null, typed);
                        }
                    }
                }
                System.out.println(store + "|" + input + " => " + (ok ? "OK" : "ERR") + "|" + (ok ? 0 : 1) + "|" + Files.exists(dir.resolve("Main.class"))
                    + "|" + saved + "|" + okOut + "|" + inHash);
            }
    }
}
