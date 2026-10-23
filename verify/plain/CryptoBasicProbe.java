import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Provider;
import java.security.SecureRandom;
import java.security.SecureRandomSpi;
import java.security.Security;
import java.util.ArrayList;
import java.util.Arrays;
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

// 기초개념 "암호화" 실습(2026-10-22 표준 Cipher 중심으로 다시 짠 판)의 여덟 가지 조합을 실제로 실행한다.
// (옛 판: 숨긴 도우미 newKey/encrypt/decrypt를 쓰던 Probe와 그 결과 CryptoBasicProbe.out.txt는 git 기록과 옛 결과 파일로 남아 있다.)
//   enc    : on(Cipher로 암호화해서 보낸다) / off(글자의 바이트를 그대로 보낸다)
//   mid    : keep(중간에서 건드리지 않는다) / tamper(sent[16] ^= 1;)
//   reader : same(같은 열쇠로 푼다) / other(다른 열쇠로 푼다)
// 화면의 코드(실습의 code 함수에서 머리 주석 한 줄만 뺀 것)는 cmp_crypto_basic.js --bodies가 verify/out/crypto_basic_v2/<조합>/body.txt로 써 둔다.
// 이 Probe는 그 본문을 한 글자도 바꾸지 않고 main 안에 넣고, import와 클래스·main 선언만 붙여 javax.tools로 컴파일한 뒤
// 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력과 던져진 예외를 잡는다.
//
// 대조를 위해 고정한 것: 무작위 값. 실행하는 동안 맨 앞 순위에 시험용 보안 제공자(ProbeFixed)를 넣어
// new SecureRandom()과 KeyGenerator.init(256)이 쓰는 무작위 바이트를 00, 01, 02, … 차례로 내놓게 한다(조합마다 처음부터).
// 그래서 key = 00..1f, iv = 20..2b, otherKey = 2c..4b가 된다(FACT fixedStream 줄로 확인). 화면의 코드는 그대로다.
// 같은 본문을 시험용 제공자가 실제 DRBG(SUN)로 넘기게 해서 한 번 더 돌린다(REAL 줄). 결과의 종류가 같아야 한다.
//
// 실행: javac -d verify/out/crypto_basic_v2/probe verify/plain/CryptoBasicProbe.java
//       java -cp verify/out/crypto_basic_v2/probe CryptoBasicProbe verify/out/crypto_basic_v2 > verify/plain/CryptoBasicProbe.v2.out.txt
// 출력: enc|mid|reader => OK 또는 EX|첫 줄|둘째 줄|예외 클래스|예외 메시지|lines=출력 줄 수   (없으면 -)
//   글자 중 제어 문자, |, \는 <U+XXXX>로 적는다.
// 끝에 FACT / JAVA / NIST 줄을 더한다(단계 문장이 기대는 사실과 표준 대조).
public class CryptoBasicProbe {
    static final String PT = "카드번호 1234";
    static final HexFormat HEX = HexFormat.of();

    // ── 시험용 무작위 값 ──
    public static final class FixedSpi extends SecureRandomSpi {
        static boolean fixed = true;
        static int next = 0;
        static SecureRandom real;
        public FixedSpi() { }
        @Override protected void engineSetSeed(byte[] seed) { }
        @Override protected void engineNextBytes(byte[] b) {
            if (fixed) { for (int i = 0; i < b.length; i++) b[i] = (byte) next++; return; }
            try { if (real == null) real = SecureRandom.getInstance("DRBG", "SUN"); } catch (Exception e) { throw new RuntimeException(e); }
            real.nextBytes(b);
        }
        @Override protected byte[] engineGenerateSeed(int n) { byte[] b = new byte[n]; engineNextBytes(b); return b; }
    }
    static final class FixedProvider extends Provider {
        FixedProvider() { super("ProbeFixed", "1.0", "probe only: fixed SecureRandom"); put("SecureRandom.Fixed", FixedSpi.class.getName()); }
    }

    static final String IMPORTS = "import java.nio.charset.StandardCharsets;\nimport java.security.SecureRandom;\n"
        + "import javax.crypto.Cipher;\nimport javax.crypto.KeyGenerator;\nimport javax.crypto.SecretKey;\nimport javax.crypto.spec.GCMParameterSpec;\n\n";

    static String source(String body) {
        StringBuilder s = new StringBuilder(IMPORTS).append("public class Main {\n    public static void main(String[] args) throws Exception {\n");
        for (String ln : body.split("\n", -1)) s.append(ln.isEmpty() ? "" : "        " + ln).append("\n");
        return s.append("    }\n}\n").toString();
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

    static String esc(String s) {
        StringBuilder b = new StringBuilder();
        for (char ch : s.toCharArray()) {
            if (ch < 0x20 || (ch >= 0x7f && ch < 0xa0) || ch == '|' || ch == '\\') b.append(String.format("<U+%04X>", (int) ch));
            else b.append(ch);
        }
        return b.toString();
    }

    // [0]=OK/EX, [1]=첫 줄, [2]=둘째 줄, [3]=예외 클래스, [4]=예외 메시지, [5]=출력 줄 수
    static String[] run(Path dir) throws Exception {
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, ClassLoader.getPlatformClassLoader())) {
            PrintStream old = System.out;
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            String st = "OK", exc = "-", msg = "-";
            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
            catch (InvocationTargetException e) { Throwable t = e.getCause(); st = "EX"; exc = t.getClass().getName(); msg = String.valueOf(t.getMessage()); }
            finally { System.setOut(old); }
            String out = buf.toString(StandardCharsets.UTF_8), nl = System.lineSeparator();
            if (out.endsWith(nl)) out = out.substring(0, out.length() - nl.length());
            String[] ls = out.isEmpty() ? new String[0] : out.split(nl, -1);
            return new String[] { st, ls.length > 0 ? esc(ls[0]) : "-", ls.length > 1 ? esc(ls[1]) : "-", exc, msg, String.valueOf(ls.length) };
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
    static byte[] seq(int from, int n) { byte[] b = new byte[n]; for (int i = 0; i < n; i++) b[i] = (byte) (from + i); return b; }

    public static void main(String[] args) throws Exception {
        Security.insertProviderAt(new FixedProvider(), 1);
        String base = args.length > 0 ? args[0] : "verify/out/crypto_basic_v2";
        System.out.println("# java " + System.getProperty("java.version"));

        // 0. 시험용 무작위 값이 화면의 코드가 부르는 표준 메서드(KeyGenerator.init(256), new SecureRandom())에 쓰이는지
        FixedSpi.fixed = true; FixedSpi.next = 0;
        KeyGenerator g0 = KeyGenerator.getInstance("AES"); g0.init(256);
        byte[] k0 = g0.generateKey().getEncoded();
        byte[] iv0 = new byte[12]; new SecureRandom().nextBytes(iv0);
        byte[] k1 = g0.generateKey().getEncoded();
        System.out.println("FACT fixedStream => key=" + HEX.formatHex(k0) + "|iv=" + HEX.formatHex(iv0) + "|otherKey=" + HEX.formatHex(k1)
            + "|provider=" + new SecureRandom().getProvider().getName());

        // 1. 여덟 가지 조합
        for (String enc : new String[] { "on", "off" })
            for (String mid : new String[] { "keep", "tamper" })
                for (String reader : new String[] { "same", "other" }) {
                    String k = enc + "-" + mid + "-" + reader, name = enc + "|" + mid + "|" + reader;
                    String body = Files.readString(Path.of(base, k, "body.txt"), StandardCharsets.UTF_8).replace("\r\n", "\n");
                    List<String> errs = new ArrayList<>();
                    Path dir = Path.of(base, k);
                    if (!compile(source(body), dir, errs)) { System.out.println(name + " => COMPILE_ERR|" + errs); continue; }
                    FixedSpi.fixed = true; FixedSpi.next = 0;
                    String[] r = run(dir);
                    System.out.println(name + " => " + String.join("|", Arrays.copyOf(r, 5)) + "|lines=" + r[5]);
                    FixedSpi.fixed = false;
                    String[] q = run(dir);
                    System.out.println("REAL " + name + " => " + q[0] + "|firstIsPt=" + q[1].equals(PT) + "|second=" + (q[2].equals(PT) ? "PT" : q[2]) + "|" + q[3] + "|" + q[4] + "|lines=" + q[5]);
                }
        FixedSpi.fixed = false;

        // 2. 단계 문장이 기대는 사실 (고정 값과 같은 key = 00..1f, iv = 20..2b, otherKey = 2c..4b)
        byte[] key = seq(0, 32), iv = seq(32, 12), key2 = seq(44, 32);
        byte[] ptBytes = PT.getBytes(StandardCharsets.UTF_8);
        byte[] sent = gcm(Cipher.ENCRYPT_MODE, key, iv).doFinal(ptBytes);
        System.out.println("JAVA key=" + HEX.formatHex(key) + "|iv=" + HEX.formatHex(iv) + "|pt=" + HEX.formatHex(ptBytes) + "|sent=" + HEX.formatHex(sent));
        System.out.println("FACT bytes => ptBytes=" + ptBytes.length + "|sentBytes=" + sent.length + "|tagBytes=" + (sent.length - ptBytes.length));
        String midStr = new String(sent, StandardCharsets.UTF_8);
        System.out.println("FACT midString => " + esc(midStr) + "|hasFFFD=" + midStr.contains("�") + "|has1234=" + midStr.contains("1234") + "|hasCard=" + midStr.contains("카드"));
        System.out.println("FACT ptByte16 => " + String.format("%02x", ptBytes[16]) + "|flipped=" + String.format("%02x", ptBytes[16] ^ 1) + "|" + (char) (ptBytes[16] ^ 1));
        // 같은 글자를 같은 열쇠로 iv만 새로 정해 두 번 암호화하면 값이 다르고 둘 다 풀린다
        {
            KeyGenerator g = KeyGenerator.getInstance("AES"); g.init(256);
            SecretKey rk = g.generateKey();
            byte[] ia = new byte[12], ib = new byte[12]; new SecureRandom().nextBytes(ia); new SecureRandom().nextBytes(ib);
            Cipher ca = Cipher.getInstance("AES/GCM/NoPadding"); ca.init(Cipher.ENCRYPT_MODE, rk, new GCMParameterSpec(128, ia));
            Cipher cb = Cipher.getInstance("AES/GCM/NoPadding"); cb.init(Cipher.ENCRYPT_MODE, rk, new GCMParameterSpec(128, ib));
            byte[] a = ca.doFinal(ptBytes), b = cb.doFinal(ptBytes);
            Cipher da = Cipher.getInstance("AES/GCM/NoPadding"); da.init(Cipher.DECRYPT_MODE, rk, new GCMParameterSpec(128, ia));
            Cipher db = Cipher.getInstance("AES/GCM/NoPadding"); db.init(Cipher.DECRYPT_MODE, rk, new GCMParameterSpec(128, ib));
            System.out.println("FACT twice => same=" + Arrays.equals(a, b) + "|decA=" + new String(da.doFinal(a), StandardCharsets.UTF_8) + "|decB=" + new String(db.doFinal(b), StandardCharsets.UTF_8));
            // 암호화에 쓴 Cipher 객체를 같은 열쇠·같은 iv로 다시 암호화 모드로 정하려 하면 자바가 막는가 (iv를 다시 쓰지 말라는 문장의 근거)
            String reuse;
            try { ca.init(Cipher.ENCRYPT_MODE, rk, new GCMParameterSpec(128, ia)); reuse = "allowed"; } catch (Exception e) { reuse = e.getClass().getName() + ": " + e.getMessage(); }
            System.out.println("FACT reuseIv => " + reuse);
        }
        // 무작위 열쇠 둘로 100번: 다른 열쇠로 풀면 항상 예외인가
        {
            int thrown = 0, returned = 0; Throwable first = null; SecureRandom sr = new SecureRandom();
            for (int i = 0; i < 100; i++) {
                byte[] ka = new byte[32], kb = new byte[32], v = new byte[12]; sr.nextBytes(ka); sr.nextBytes(kb); sr.nextBytes(v);
                byte[] ct = gcm(Cipher.ENCRYPT_MODE, ka, v).doFinal(ptBytes);
                try { gcm(Cipher.DECRYPT_MODE, kb, v).doFinal(ct); returned++; } catch (Exception e) { thrown++; if (first == null) first = e; }
            }
            System.out.println("FACT wrongKey100 => thrown=" + thrown + "|returned=" + returned + "|" + first.getClass().getName() + "|" + first.getMessage());
        }
        // 33바이트 중 어느 바이트의 비트 하나를 뒤집어도 같은 열쇠로 풀 때 예외인가
        {
            int thrown = 0; String name = "-";
            for (int i = 0; i < sent.length; i++) {
                byte[] bad = sent.clone(); bad[i] ^= 1;
                String r = tryDec(key, iv, bad);
                if (!r.startsWith("PT=")) { thrown++; name = r; }
            }
            System.out.println("FACT tamperEachByte => positions=" + sent.length + "|thrown=" + thrown + "|" + name);
        }
        byte[] tam = sent.clone(); tam[16] ^= 1;
        System.out.println("FACT tamper16 => " + tryDec(key, iv, tam));
        System.out.println("FACT sameKey => " + tryDec(key, iv, sent) + "|expectPT=" + HEX.formatHex(ptBytes));
        System.out.println("FACT otherKeyFixed => " + tryDec(key2, iv, sent));
        // GCM에서 글자를 감추는 부분은 카운터(CTR) 방식이다. 96비트 iv의 GCM은 iv || 00000002부터 센 카운터로 글자 부분을 계산한다(SP 800-38D 7.1).
        // 그 카운터로 AES/CTR을 돌려, 태그 확인 없이 풀면 sent[16]을 바꾼 바이트가 어떤 글자가 되는지 본다.
        {
            byte[] ctr0 = new byte[16]; System.arraycopy(iv, 0, ctr0, 0, 12); ctr0[15] = 2;
            Cipher c1 = Cipher.getInstance("AES/CTR/NoPadding"); c1.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(ctr0));
            String plainOk = new String(c1.doFinal(Arrays.copyOfRange(sent, 0, 17)), StandardCharsets.UTF_8);
            Cipher c2 = Cipher.getInstance("AES/CTR/NoPadding"); c2.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(ctr0));
            String plainTam = new String(c2.doFinal(Arrays.copyOfRange(tam, 0, 17)), StandardCharsets.UTF_8);
            System.out.println("FACT gcmBodyAsCtr => untouched=" + plainOk + "|tampered16=" + plainTam);
        }
        // 태그가 없는 AES/CTR/NoPadding으로 암호화한 바이트를 중간에서 바꾸면 / 다른 열쇠로 풀면
        {
            byte[] ctrIv = seq(32, 16);
            Cipher ce = Cipher.getInstance("AES/CTR/NoPadding"); ce.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(ctrIv));
            byte[] ctr = ce.doFinal(ptBytes);
            byte[] ctrT = ctr.clone(); ctrT[16] ^= 1;
            Cipher cd = Cipher.getInstance("AES/CTR/NoPadding"); cd.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(ctrIv));
            System.out.println("FACT ctrTamper => noException|" + new String(cd.doFinal(ctrT), StandardCharsets.UTF_8));
            Cipher co = Cipher.getInstance("AES/CTR/NoPadding"); co.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key2, "AES"), new IvParameterSpec(ctrIv));
            byte[] garbage = co.doFinal(ctr);
            System.out.println("FACT ctrOtherKey => noException|len=" + garbage.length + "|equalsPT=" + Arrays.equals(garbage, ptBytes));
        }

        // 3. NIST CAVP 시험 벡터 (csrc.nist.gov의 gcmtestvectors.zip)
        //    gcmEncryptExtIV256.rsp [Keylen=256][IVlen=96][PTlen=128][AADlen=0][Taglen=128] Count 0
        byte[] nk = HEX.parseHex("31bdadd96698c204aa9ce1448ea94ae1fb4a9a0b3c9d773b51bb1822666b8f22"), niv = HEX.parseHex("0d18e06c7c725ac9e362e1ce");
        byte[] nout = gcm(Cipher.ENCRYPT_MODE, nk, niv).doFinal(HEX.parseHex("2db5168e932556f8089a0622981d017d"));
        String nct = HEX.formatHex(Arrays.copyOfRange(nout, 0, nout.length - 16)), ntag = HEX.formatHex(Arrays.copyOfRange(nout, nout.length - 16, nout.length));
        System.out.println("NIST enc => ct=" + nct + "|tag=" + ntag + "|match=" + (nct.equals("fa4362189661d163fcd6a56d8bf0405a") && ntag.equals("d636ac1bbedd5cc3ee727dc2ab4a9489")));
        //    gcmDecrypt256.rsp 같은 구간 Count 0 (통과), Count 2 (FAIL)
        String r0 = tryDec(HEX.parseHex("4c8ebfe1444ec1b2d503c6986659af2c94fafe945f72c1e8486a5acfedb8a0f8"), HEX.parseHex("473360e0ad24889959858995"),
            HEX.parseHex("d2c78110ac7e8f107c0df0570bd7c90cc26a379b6d98ef2852ead8ce83a833a7"));
        System.out.println("NIST dec0 => " + r0 + "|match=" + r0.equals("PT=7789b41cb3ee548814ca0b388c10b343"));
        String r2 = tryDec(HEX.parseHex("c997768e2d14e3d38259667a6649079de77beb4543589771e5068e6cd7cd0b14"), HEX.parseHex("835090aed9552dbdd45277e2"),
            HEX.parseHex("9f6607d68e22ccf21928db0986be126ef32617f67c574fd9f44ef76ff880ab9f"));
        System.out.println("NIST dec2 => " + r2 + "|match=" + r2.equals("javax.crypto.AEADBadTagException"));
    }
}
