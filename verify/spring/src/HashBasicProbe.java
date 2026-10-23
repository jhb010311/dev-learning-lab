import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

// 기초개념 "해시" 실습(표준 중심으로 다시 짠 판)을 실제 JDK와 스프링 시큐리티(spring-security-crypto)로 실행한다.
// 조합마다 화면에 보이는 코드(머리 주석 한 줄을 뺀 것)를 import, 클래스, main(throws Exception)으로 감싼 Main.java로 만들어
// javax.tools로 컴파일하고(클래스 경로는 이 Probe와 같은 libs), 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
// 화면에 보이는 부분은 Main.java 안의 "// 화면 시작"과 "// 화면 끝" 줄 사이이고, cmp가 그 부분만 뽑아 화면의 코드와 견준다.
//   store : bcrypt(PasswordEncoder = BCryptPasswordEncoder의 encode로 저장, matches로 견줌)
//           sha(MessageDigest로 SHA-256을 계산해 16진수 글자로 저장, 다시 계산해 equals로 견줌)
//           plain(비밀번호를 그대로 저장, equals로 견줌)
//   input : right(pass1234) / typo(pass1235) / stolen(저장된 값 saved를 그대로 입력)
//           eq(pass1234를 입력하고 matches 대신 encode를 한 번 더 해 equals로 견줌. bcrypt에서만)
// 출력
//   STD   : FIPS 180-4의 SHA-256 예시 두 가지를 MessageDigest로 계산해 문서의 값과 견준 결과
//   HASH  : 입력의 UTF-8 바이트(16진수) => MessageDigest SHA-256 값. cmp가 Node.js crypto, openssl로 다시 계산해 견준다
//   EX    : 실습이 예시로 보이는 BCrypt 값(이 Probe를 처음 돌렸을 때 encode가 낸 값을 옮겨 적은 것)에 대한 사실
//   FACT  : 단계 문장이 기대는 사실
//   조합  : store|input => 컴파일(OK/ERR)|Main.class가 있는가|프로그램이 출력한 saved|프로그램이 출력한 ok|입력에서 계산한 값
//           입력에서 계산한 값: sha는 MessageDigest 값, bcrypt의 matches는 BCrypt.hashpw(입력, saved)
//           (matches가 부르는 BCrypt.checkpw가 계산하는 값), bcrypt의 eq는 '-'(Main 안에서 새로 encode한 값은 출력하지 않음), plain은 '-'
//           그리고 bcrypt는 hashpw로 계산한 값이 saved와 같은지와 matches 결과가 같은지(agree=true/false)
public class HashBasicProbe {
    static final String PASS = "pass1234", TYPO = "pass1235";
    // 실습의 예시 값: 이 Probe를 처음 돌렸을 때 encoder.encode("pass1234")가 두 번 낸 값
    static final String EX1 = "$2a$10$rlL85YF/J1.aZXD3Bv0GWekFKyqt/OrhKPdwFShdqxkvr3HaDO/4a";
    static final String EX2 = "$2a$10$laSZMbdPIh0qEtYaXA19HuvcwaklZXp9twjqx7wtIxD0CjCSIX292";

    static String sha256(String text) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(md.digest(text.getBytes(StandardCharsets.UTF_8)));
    }

    static String inputExpr(String input) {
        return input.equals("typo") ? "\"pass1235\"" : input.equals("stolen") ? "saved" : "\"pass1234\"";
    }

    // 화면의 코드에서 머리 주석 한 줄을 뺀 것
    static String fragment(String store, String input) {
        StringBuilder s = new StringBuilder();
        if (store.equals("bcrypt")) {
            s.append("PasswordEncoder encoder = new BCryptPasswordEncoder();\n\n");
            s.append("// 가입할 때: encode가 비밀번호를 해시한 값을 저장한다\n");
            s.append("String saved = encoder.encode(\"pass1234\");\n\n");
            if (input.equals("eq")) {
                s.append("// 로그인할 때: 입력을 다시 encode해서 equals로 견준다 (잘못 쓴 예)\n");
                s.append("String input = \"pass1234\";\n");
                s.append("boolean ok = encoder.encode(input).equals(saved);\n");
            } else {
                s.append("// 로그인할 때: 입력한 글자와 저장된 값을 matches에 넘겨 견준다\n");
                s.append("String input = ").append(inputExpr(input)).append(";\n");
                s.append("boolean ok = encoder.matches(input, saved);\n");
            }
        } else if (store.equals("sha")) {
            s.append("MessageDigest md = MessageDigest.getInstance(\"SHA-256\");\n");
            s.append("HexFormat hex = HexFormat.of();\n\n");
            s.append("// 가입할 때: 비밀번호를 SHA-256으로 해시한 값을 16진수 글자로 바꿔 저장한다\n");
            s.append("String saved = hex.formatHex(md.digest(\"pass1234\".getBytes(StandardCharsets.UTF_8)));\n\n");
            s.append("// 로그인할 때: 입력을 같은 방법으로 해시해서 저장된 값과 equals로 견준다\n");
            s.append("String input = ").append(inputExpr(input)).append(";\n");
            s.append("String calc = hex.formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));\n");
            s.append("boolean ok = calc.equals(saved);\n");
        } else {
            s.append("// 가입할 때: 비밀번호를 그대로 저장한다\n");
            s.append("String saved = \"pass1234\";\n\n");
            s.append("// 로그인할 때: 입력을 저장된 값과 그대로 equals로 견준다\n");
            s.append("String input = ").append(inputExpr(input)).append(";\n");
            s.append("boolean ok = input.equals(saved);\n");
        }
        s.append("\nSystem.out.println(saved);\nSystem.out.println(ok);\n");
        return s.toString();
    }

    static String source(String store, String input) {
        StringBuilder s = new StringBuilder();
        if (store.equals("bcrypt")) s.append("import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;\n").append("import org.springframework.security.crypto.password.PasswordEncoder;\n\n");
        if (store.equals("sha")) s.append("import java.nio.charset.StandardCharsets;\n").append("import java.security.MessageDigest;\n").append("import java.util.HexFormat;\n\n");
        s.append("public class Main {\n");
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
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none", "-cp", System.getProperty("java.class.path")), null, List.of(fo)).call();
        for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics())
            if (d.getKind() == Diagnostic.Kind.ERROR) System.out.println("# 컴파일 오류 " + d.getCode() + " " + d.getMessage(Locale.ENGLISH));
        return ok;
    }

    static final java.util.regex.Pattern BC = java.util.regex.Pattern.compile("\\$2a\\$10\\$[./A-Za-z0-9]{53}");

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/hash_basic_std";
        System.out.println("# java " + System.getProperty("java.version") + " | spring security " + SpringSecurityCoreVersion.getVersion());

        // 1. SHA-256 계산이 표준대로인지
        String[][] std = {
            { "abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" },
            { "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1" },
        };
        for (String[] e : std) {
            String got = sha256(e[0]);
            System.out.println("STD " + hex(e[0]) + " => " + got + "|" + e[1] + "|" + (got.equals(e[1]) ? "same" : "DIFFERENT"));
        }

        // 2. 세 구현을 견줄 입력들 (자바의 값)
        String h1 = sha256(PASS);
        String[] inputs = { "", "abc", "a", "a".repeat(100), PASS, TYPO, h1 };
        for (String t : inputs) System.out.println("HASH " + hex(t) + " => " + sha256(t));

        // 3. 실습이 보이는 BCrypt 예시 값에 대한 사실
        PasswordEncoder enc = new BCryptPasswordEncoder();
        System.out.println("EX ex1 => " + EX1);
        System.out.println("EX ex2 => " + EX2);
        System.out.println("EX ex1-format => " + BC.matcher(EX1).matches() + "|" + EX1.length());
        System.out.println("EX ex2-format => " + BC.matcher(EX2).matches() + "|" + EX2.length());
        System.out.println("EX matches-pass1234-ex1 => " + enc.matches(PASS, EX1));
        System.out.println("EX matches-pass1234-ex2 => " + enc.matches(PASS, EX2));
        System.out.println("EX matches-pass1235-ex1 => " + enc.matches(TYPO, EX1));
        System.out.println("EX matches-ex1-ex1 => " + enc.matches(EX1, EX1));
        System.out.println("EX hashpw-pass1234-ex1 => " + BCrypt.hashpw(PASS, EX1));
        System.out.println("EX hashpw-pass1235-ex1 => " + BCrypt.hashpw(TYPO, EX1));
        System.out.println("EX hashpw-ex1-ex1 => " + BCrypt.hashpw(EX1, EX1));
        System.out.println("EX ex1-equals-ex2 => " + EX1.equals(EX2));

        // 4. 단계 문장이 기대는 사실
        String a = sha256(PASS), b = sha256(PASS), c = sha256(TYPO);
        System.out.println("FACT sha-same-twice => " + a.equals(b));
        int diff = 0; for (int i = 0; i < a.length(); i++) if (a.charAt(i) != c.charAt(i)) diff++;
        System.out.println("FACT sha-typo-diff-positions => " + diff + " of " + a.length());
        System.out.println("FACT sha-len-empty-1-100 => " + sha256("").length() + "," + sha256("a").length() + "," + sha256("a".repeat(100)).length());
        System.out.println("FACT sha-hex-only => " + a.matches("[0-9a-f]{64}"));
        System.out.println("FACT sha-digest-bytes => " + MessageDigest.getInstance("SHA-256").digest(PASS.getBytes(StandardCharsets.UTF_8)).length);
        // encode를 여러 번: 모두 다른 값이고, 모두 matches가 true
        int n = 20; Set<String> seen = new HashSet<>(); boolean allMatch = true, allFormat = true; Set<String> salts = new HashSet<>();
        for (int i = 0; i < n; i++) {
            String e = enc.encode(PASS);
            seen.add(e); salts.add(e.substring(7, 29));
            allMatch &= enc.matches(PASS, e);
            allFormat &= BC.matcher(e).matches();
        }
        System.out.println("FACT bcrypt-encode-" + n + "-distinct => " + seen.size() + "|salts " + salts.size() + "|all-matches " + allMatch + "|all-format " + allFormat);
        String e1 = enc.encode(PASS);
        System.out.println("FACT bcrypt-reencode-equals => " + enc.encode(PASS).equals(e1));
        System.out.println("FACT bcrypt-salt-kept-by-hashpw => " + BCrypt.hashpw(TYPO, e1).substring(0, 29).equals(e1.substring(0, 29)));
        long t0 = System.nanoTime(); for (int i = 0; i < 5; i++) enc.matches(PASS, e1); long t1 = System.nanoTime();
        for (int i = 0; i < 5; i++) sha256(PASS); long t2 = System.nanoTime();
        System.out.println("FACT time-ms bcrypt-matches => " + String.format("%.1f", (t1 - t0) / 5e6) + "|sha256 " + String.format("%.4f", (t2 - t1) / 5e6));
        String dele = PasswordEncoderFactories.createDelegatingPasswordEncoder().encode(PASS);
        System.out.println("FACT delegating-prefix => " + dele.substring(0, 15) + "|" + dele.startsWith("{bcrypt}$2a$10$"));

        // 5. 조합을 컴파일하고 실행
        String[][] cs = { { "bcrypt", "right" }, { "bcrypt", "typo" }, { "bcrypt", "eq" }, { "bcrypt", "stolen" },
                          { "sha", "right" }, { "sha", "typo" }, { "sha", "stolen" },
                          { "plain", "right" }, { "plain", "typo" }, { "plain", "stolen" } };
        for (String[] k : cs) {
            String store = k[0], input = k[1];
            String src = source(store, input);
            Path dir = Path.of(base, store + "-" + input);
            Files.createDirectories(dir);
            Files.deleteIfExists(dir.resolve("Main.class"));
            Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
            boolean ok = compile(src, dir);
            String saved = "-", okOut = "-", calc = "-", agree = "-";
            if (ok) {
                try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, HashBasicProbe.class.getClassLoader())) {
                    PrintStream old = System.out;
                    ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                    try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                    finally { System.setOut(old); }
                    String[] out = buf.toString(StandardCharsets.UTF_8).strip().split("\r?\n");
                    saved = out[0]; okOut = out[1];
                }
                String typed = input.equals("typo") ? TYPO : input.equals("stolen") ? saved : PASS;
                if (store.equals("sha")) calc = sha256(typed);
                if (store.equals("bcrypt") && !input.equals("eq")) {
                    calc = BCrypt.hashpw(typed, saved);
                    agree = String.valueOf(calc.equals(saved) == enc.matches(typed, saved));
                }
            }
            System.out.println(store + "|" + input + " => " + (ok ? "OK" : "ERR") + "|" + Files.exists(dir.resolve("Main.class"))
                + "|" + saved + "|" + okOut + "|" + calc + "|" + agree);
        }
    }
}
