import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "암호화" 실습의 여섯 가지 조합(보내는 쪽 2 x 받는 쪽 3)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 본문(main 안의 줄)을 담은 소스를 만들어 javax.tools로 컴파일하고,
// 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력과 던져진 예외를 잡는다.
//   enc    : on(열쇠로 암호화해서 보낸다) / off(암호화하지 않고 그대로 보낸다)
//   reader : same(같은 열쇠로 푼다) / other(다른 열쇠로 푼다) / none(열쇠 없이 받은 값을 그대로 읽는다)
// 화면에는 줄여 둔 것(assume에 밝힘): import, main의 선언, 도우미 메서드 newKey / encrypt / decrypt의 본문.
// 도우미는 AES-GCM(256비트 열쇠, 12바이트 nonce를 결과 앞에 붙이고 Base64)으로 javax.crypto.Cipher를 쓴다.
//
// 대조를 위해 고정한 것: 열쇠(newKey가 처음 돌려주는 열쇠는 0x00..0x1f, 두 번째는 0x20..0x3f)와 nonce(12바이트 고정값).
// 실제로는 둘 다 무작위로 만든다. 고정한 도우미로 돌린 값은 매번 같으므로 cmp가 화면의 글자와 견줄 수 있다.
// 또 Main.wire는 Probe가 encrypt의 반환값을 기록해 두는 칸이다(예외로 프로그램이 멈추면 출력에 남지 않는 "중간에서 보이는 값"을 재려고 둠).
//
// 출력: enc|reader => OK 또는 EX|wire(encrypt가 돌려준 값, 없으면 -)|표준 출력(줄은 ' / '로 잇는다)|예외 클래스|예외 메시지
// 끝에 FACT / NIST / REAL / JAVA 줄을 더한다(단계 문장이 기대는 사실과 표준 대조).
// 조합마다 만든 소스는 verify/out/crypto_basic/<조합>/Main.java에 남긴다.
public class CryptoBasicProbe {
    static final String PT = "카드번호 1234";
    static final byte[] NONCE = { (byte) 0x8a, 0x1f, (byte) 0xc3, 0x5e, 0x27, (byte) 0xb9, (byte) 0xd0, 0x64, (byte) 0xf1, 0x3a, (byte) 0x9c, 0x0e };
    static final HexFormat HEX = HexFormat.of();

    static byte[] seq(int from) { byte[] b = new byte[32]; for (int i = 0; i < 32; i++) b[i] = (byte) (from + i); return b; }

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String body(String enc, String reader) {
        List<String> o = new ArrayList<>();
        o.add("SecretKey key = newKey();                       // 열쇠를 하나 만든다");
        o.add("");
        if (enc.equals("on")) {
            o.add("// 보내는 쪽: 글자를 열쇠로 암호화한다");
            o.add("String sent = encrypt(\"카드번호 1234\", key);");
            o.add("");
            if (reader.equals("same")) {
                o.add("// 받는 쪽: 같은 열쇠로 푼다");
                o.add("String read = decrypt(sent, key);");
            } else if (reader.equals("other")) {
                o.add("// 받는 쪽: 다른 열쇠로 푼다");
                o.add("SecretKey otherKey = newKey();   // 다른 열쇠");
                o.add("String read = decrypt(sent, otherKey);");
            } else {
                o.add("// 받는 쪽: 열쇠 없이 받은 값을 그대로 읽는다");
                o.add("String read = sent;");
            }
        } else {
            o.add("// 보내는 쪽: 글자를 그대로 보낸다");
            o.add("String sent = \"카드번호 1234\";");
            o.add("");
            o.add("// 받는 쪽: 받은 것을 그대로 읽는다");
            o.add("String read = sent;");
        }
        o.add("");
        o.add("System.out.println(sent);");
        o.add("System.out.println(read);");
        return String.join("\n", o);
    }

    static final String IMPORTS = "import java.nio.charset.StandardCharsets;\nimport java.security.SecureRandom;\nimport java.util.Arrays;\nimport java.util.Base64;\n"
        + "import javax.crypto.Cipher;\nimport javax.crypto.KeyGenerator;\nimport javax.crypto.SecretKey;\nimport javax.crypto.spec.GCMParameterSpec;\nimport javax.crypto.spec.SecretKeySpec;\n\n";

    // 도우미 메서드. fixed면 열쇠와 nonce를 고정값으로, 아니면 실제대로 무작위로 만든다
    static String helpers(boolean fixed) {
        String nonceDecl = fixed ? "        byte[] nonce = { " + joinBytes(NONCE) + " };\n"
            : "        byte[] nonce = new byte[12];\n        new SecureRandom().nextBytes(nonce);\n";
        String newKey = fixed
            ? "    static int made = 0;\n"
              + "    static SecretKey newKey() {\n"
              + "        byte[] b = new byte[32];\n"
              + "        for (int i = 0; i < 32; i++) b[i] = (byte) (32 * made + i);\n"
              + "        made++;\n"
              + "        return new SecretKeySpec(b, \"AES\");\n"
              + "    }\n"
            : "    static SecretKey newKey() throws Exception {\n"
              + "        KeyGenerator g = KeyGenerator.getInstance(\"AES\");\n"
              + "        g.init(256);\n"
              + "        return g.generateKey();\n"
              + "    }\n";
        return "    public static String wire = null;   // Probe가 encrypt의 반환값을 기록해 두는 칸\n\n" + newKey + "\n"
            + "    static String encrypt(String text, SecretKey key) throws Exception {\n"
            + nonceDecl
            + "        Cipher c = Cipher.getInstance(\"AES/GCM/NoPadding\");\n"
            + "        c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));\n"
            + "        byte[] ct = c.doFinal(text.getBytes(StandardCharsets.UTF_8));\n"
            + "        byte[] all = new byte[12 + ct.length];\n"
            + "        System.arraycopy(nonce, 0, all, 0, 12);\n"
            + "        System.arraycopy(ct, 0, all, 12, ct.length);\n"
            + "        wire = Base64.getEncoder().encodeToString(all);\n"
            + "        return wire;\n"
            + "    }\n\n"
            + "    static String decrypt(String value, SecretKey key) throws Exception {\n"
            + "        byte[] all = Base64.getDecoder().decode(value);\n"
            + "        Cipher c = Cipher.getInstance(\"AES/GCM/NoPadding\");\n"
            + "        c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, all, 0, 12));\n"
            + "        return new String(c.doFinal(all, 12, all.length - 12), StandardCharsets.UTF_8);\n"
            + "    }\n\n";
    }

    static String joinBytes(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < b.length; i++) { if (i > 0) s.append(", "); s.append("(byte) 0x").append(String.format("%02x", b[i] & 0xff)); }
        return s.toString();
    }

    static final String MARK_A = "        // <<화면의 코드 시작";
    static final String MARK_B = "        // >>화면의 코드 끝";

    static String source(String mainBody, boolean fixed) {
        StringBuilder s = new StringBuilder(IMPORTS).append("public class Main {\n").append(helpers(fixed));
        s.append("    public static void main(String[] args) throws Exception {\n").append(MARK_A).append("\n");
        for (String ln : mainBody.split("\n", -1)) s.append(ln.isEmpty() ? "" : "        " + ln).append("\n");
        s.append(MARK_B).append("\n    }\n}\n");
        return s.toString();
    }

    static JavaCompiler jc = ToolProvider.getSystemJavaCompiler();

    static boolean compile(String src, Path dir, List<String> errOut) throws Exception {
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) if (d.getKind() == Diagnostic.Kind.ERROR) errOut.add(d.getMessage(Locale.ENGLISH));
        return ok;
    }

    // 실행 결과: [0]=OK/EX, [1]=wire, [2]=표준 출력, [3]=예외 클래스, [4]=예외 메시지
    static String[] run(Path dir) throws Exception {
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, CryptoBasicProbe.class.getClassLoader().getParent())) {
            PrintStream old = System.out;
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            String st = "OK", exc = "-", msg = "-";
            Class<?> m = cl.loadClass("Main");
            try { m.getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
            catch (InvocationTargetException e) { Throwable t = e.getCause(); st = "EX"; exc = t.getClass().getName(); msg = String.valueOf(t.getMessage()); }
            finally { System.setOut(old); }
            Object w = m.getDeclaredField("wire").get(null);
            String out = buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
            return new String[] { st, w == null ? "-" : (String) w, out, exc, msg };
        }
    }

    static Cipher gcm(int mode, byte[] key, byte[] iv) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(mode, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        return c;
    }

    static String tryDec(byte[] key, byte[] iv, byte[] ctAndTag) {
        try { return "PT=" + HEX.formatHex(gcm(Cipher.DECRYPT_MODE, key, iv).doFinal(ctAndTag)); }
        catch (Exception e) { return e.getClass().getName(); }
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/crypto_basic";
        System.out.println("# java " + System.getProperty("java.version"));
        // 1. 여섯 가지 조합: 고정한 열쇠와 nonce로 한 번, 실제대로 무작위로 한 번
        for (String enc : new String[] { "on", "off" })
            for (String reader : new String[] { "same", "other", "none" }) {
                String body = body(enc, reader);
                List<String> errs = new ArrayList<>();
                Path dir = Path.of(base, enc + "-" + reader);
                if (!compile(source(body, true), dir, errs)) { System.out.println(enc + "|" + reader + " => COMPILE_ERR|" + errs); continue; }
                String[] r = run(dir);
                System.out.println(enc + "|" + reader + " => " + String.join("|", r));
                // 같은 본문을 무작위 열쇠와 nonce로 돌려 결과의 종류가 같은지 본다
                Path dir2 = Path.of(base, enc + "-" + reader + "-real");
                if (!compile(source(body, false), dir2, errs)) { System.out.println("REAL " + enc + "|" + reader + " => COMPILE_ERR|" + errs); continue; }
                String[] q = run(dir2);
                String[] lines = q[2].split(" / ");
                boolean readIsPt = lines.length >= 2 && lines[1].equals(PT);
                System.out.println("REAL " + enc + "|" + reader + " => " + q[0] + "|wireLen=" + (q[1].equals("-") ? "-" : q[1].length()) + "|readIsPt=" + readIsPt + "|" + q[3] + "|" + q[4]);
            }

        // 2. 단계 문장이 기대는 사실
        byte[] key = seq(0), key2 = seq(32);
        byte[] ptBytes = PT.getBytes(StandardCharsets.UTF_8);
        byte[] enc = gcm(Cipher.ENCRYPT_MODE, key, NONCE).doFinal(ptBytes);
        byte[] all = new byte[12 + enc.length];
        System.arraycopy(NONCE, 0, all, 0, 12);
        System.arraycopy(enc, 0, all, 12, enc.length);
        String b64 = Base64.getEncoder().encodeToString(all);
        System.out.println("JAVA key=" + HEX.formatHex(key) + "|nonce=" + HEX.formatHex(NONCE) + "|pt=" + HEX.formatHex(ptBytes)
            + "|ct=" + HEX.formatHex(Arrays.copyOfRange(enc, 0, enc.length - 16)) + "|tag=" + HEX.formatHex(Arrays.copyOfRange(enc, enc.length - 16, enc.length)) + "|b64=" + b64);
        System.out.println("FACT bytes => ptBytes=" + ptBytes.length + "|decodedBytes=" + all.length + "|b64Len=" + b64.length());
        // 화면에 보이는 앞 12자는 nonce의 앞 9바이트를 Base64로 적은 것과 같다
        System.out.println("FACT head12IsNonce => " + b64.substring(0, 12).equals(Base64.getEncoder().encodeToString(Arrays.copyOfRange(NONCE, 0, 9))));
        // 암호화한 값에 글자가 그대로 들어 있지 않다
        String hay = new String(all, StandardCharsets.ISO_8859_1), needle = new String(ptBytes, StandardCharsets.ISO_8859_1);
        System.out.println("FACT plainInWire => bytes=" + hay.contains(needle) + "|text=" + b64.contains(PT) + "|ASCIIdigits=" + b64.contains("1234"));

        // 같은 글자를 같은 열쇠로 nonce를 새로 만들어 두 번 암호화하면 두 값이 다르고, 둘 다 풀린다 (도우미를 실제 무작위로 만든 Main으로)
        String twiceBody = "SecretKey key = newKey();\nString a = encrypt(\"카드번호 1234\", key);\nString b = encrypt(\"카드번호 1234\", key);\n"
            + "System.out.println(a.equals(b));\nSystem.out.println(decrypt(a, key));\nSystem.out.println(decrypt(b, key));\nSystem.out.println(a.length() + \" \" + b.length());\n"
            + "SecretKey k2 = newKey();\nSystem.out.println(Arrays.equals(key.getEncoded(), k2.getEncoded()));";
        List<String> e1 = new ArrayList<>();
        Path d1 = Path.of(base, "fact-twice");
        if (compile(source(twiceBody, false), d1, e1)) System.out.println("FACT twice => " + String.join("|", run(d1)));
        else System.out.println("FACT twice => COMPILE_ERR " + e1);

        // 무작위 열쇠 둘로 100번 해 본다: 다른 열쇠로 풀면 항상 예외인가
        int thrown = 0; Throwable first = null; int returned = 0;
        for (int i = 0; i < 100; i++) {
            byte[] ka = new byte[32], kb = new byte[32], iv = new byte[12];
            SecureRandom sr = new SecureRandom(); sr.nextBytes(ka); sr.nextBytes(kb); sr.nextBytes(iv);
            byte[] ct = gcm(Cipher.ENCRYPT_MODE, ka, iv).doFinal(ptBytes);
            try { gcm(Cipher.DECRYPT_MODE, kb, iv).doFinal(ct); returned++; } catch (Exception e) { thrown++; if (first == null) first = e; }
        }
        System.out.println("FACT wrongKey100 => thrown=" + thrown + "|returned=" + returned + "|" + first.getClass().getName() + "|" + first.getMessage() + "|isBadPadding=" + (first instanceof javax.crypto.BadPaddingException));
        // 값이 한 비트 바뀌어도 예외인가 (태그를 확인한다는 문장의 근거)
        byte[] bad = enc.clone(); bad[0] ^= 1;
        System.out.println("FACT tampered => " + tryDec(key, NONCE, bad));
        System.out.println("FACT sameKey => " + tryDec(key, NONCE, enc) + "|expectPT=" + HEX.formatHex(ptBytes));
        System.out.println("FACT otherKeyFixed => " + tryDec(key2, NONCE, enc));
        // 확인 값(태그)이 없는 방식(AES/CTR/NoPadding)에서 다른 열쇠로 풀면 어떻게 되나
        Cipher ce = Cipher.getInstance("AES/CTR/NoPadding");
        ce.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(new byte[16]));
        byte[] ctr = ce.doFinal(ptBytes);
        Cipher cd = Cipher.getInstance("AES/CTR/NoPadding");
        cd.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key2, "AES"), new IvParameterSpec(new byte[16]));
        byte[] garbage = cd.doFinal(ctr);
        System.out.println("FACT ctrOtherKey => noException|len=" + garbage.length + "|equalsPT=" + Arrays.equals(garbage, ptBytes) + "|utf8=" + new String(garbage, StandardCharsets.UTF_8).equals(PT));

        // 3. NIST CAVP 시험 벡터 (csrc.nist.gov의 gcmtestvectors.zip)
        //    gcmEncryptExtIV256.rsp [Keylen=256][IVlen=96][PTlen=128][AADlen=0][Taglen=128] Count 0
        byte[] nk = HEX.parseHex("31bdadd96698c204aa9ce1448ea94ae1fb4a9a0b3c9d773b51bb1822666b8f22"), niv = HEX.parseHex("0d18e06c7c725ac9e362e1ce");
        byte[] npt = HEX.parseHex("2db5168e932556f8089a0622981d017d");
        byte[] nout = gcm(Cipher.ENCRYPT_MODE, nk, niv).doFinal(npt);
        String nct = HEX.formatHex(Arrays.copyOfRange(nout, 0, nout.length - 16)), ntag = HEX.formatHex(Arrays.copyOfRange(nout, nout.length - 16, nout.length));
        System.out.println("NIST enc => ct=" + nct + "|tag=" + ntag + "|expectCt=fa4362189661d163fcd6a56d8bf0405a|expectTag=d636ac1bbedd5cc3ee727dc2ab4a9489"
            + "|match=" + (nct.equals("fa4362189661d163fcd6a56d8bf0405a") && ntag.equals("d636ac1bbedd5cc3ee727dc2ab4a9489")));
        //    gcmDecrypt256.rsp 같은 구간 Count 0 (통과), Count 2 (FAIL)
        byte[] k0 = HEX.parseHex("4c8ebfe1444ec1b2d503c6986659af2c94fafe945f72c1e8486a5acfedb8a0f8"), iv0 = HEX.parseHex("473360e0ad24889959858995");
        String r0 = tryDec(k0, iv0, HEX.parseHex("d2c78110ac7e8f107c0df0570bd7c90cc26a379b6d98ef2852ead8ce83a833a7"));
        System.out.println("NIST dec0 => " + r0 + "|expect=PT=7789b41cb3ee548814ca0b388c10b343|match=" + r0.equals("PT=7789b41cb3ee548814ca0b388c10b343"));
        byte[] k2v = HEX.parseHex("c997768e2d14e3d38259667a6649079de77beb4543589771e5068e6cd7cd0b14"), iv2 = HEX.parseHex("835090aed9552dbdd45277e2");
        String r2 = tryDec(k2v, iv2, HEX.parseHex("9f6607d68e22ccf21928db0986be126ef32617f67c574fd9f44ef76ff880ab9f"));
        System.out.println("NIST dec2 => " + r2 + "|expect=FAIL(exception)|match=" + r2.equals("javax.crypto.AEADBadTagException"));
    }
}
