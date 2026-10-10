import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

// "JWT의 구조와 검증" 실습의 화면에 보이는 자바 코드를 JDK만으로 그대로 실행한다(외부 요청 없음).
// 같은 토큰과 같은 결과가 Node.js의 crypto로 계산한 것(verify/net/jwt_probe.js)과 같은지는 verify/net/cmp_jwt.js가 대조한다.
public class JwtProbe {
    static final byte[] serverKey = "shop-example-hs256-secret-key-01".getBytes(StandardCharsets.US_ASCII);   // 시험용 값
    static final byte[] otherKey = "someone-elses-guessed-key-000000".getBytes(StandardCharsets.US_ASCII);    // 시험용 값
    static final long EXP = 1767225600L;

    record Claims(String sub, String role) { }
    static class BadTokenException extends RuntimeException { BadTokenException(String m) { super(m); } }

    // JSON에서 값을 꺼내는 도우미 (실제로는 JSON 라이브러리를 쓴다)
    static String field(String json, String name) {
        Matcher m = Pattern.compile("\"" + name + "\":(\"([^\"]*)\"|(\\d+))").matcher(json);
        if (!m.find()) throw new BadTokenException("형식 오류");
        return m.group(2) != null ? m.group(2) : m.group(3);
    }

    // 화면의 코드: 서버가 알고리즘을 HS256으로 정해 둔 검증
    static Claims verifyFixed(String token, long now) throws Exception {
        String[] part = token.split("\\.", -1);                       // 머리말 . 내용 . 서명
        if (part.length != 3) throw new BadTokenException("형식 오류");
        Base64.Decoder dec = Base64.getUrlDecoder();
        String header = new String(dec.decode(part[0]), StandardCharsets.UTF_8);    // 키 없이 풀린다
        String payload = new String(dec.decode(part[1]), StandardCharsets.UTF_8);   // 키 없이 풀린다

        // 1. 알고리즘: 서버가 정해 둔 HS256만 받는다
        if (!"HS256".equals(field(header, "alg"))) throw new BadTokenException("허용하지 않는 알고리즘");

        // 2. 서명: 앞의 두 부분으로 서버가 직접 다시 계산해 비교한다
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));
        byte[] expected = mac.doFinal((part[0] + "." + part[1]).getBytes(StandardCharsets.US_ASCII));
        if (!MessageDigest.isEqual(expected, dec.decode(part[2]))) throw new BadTokenException("서명 불일치");

        // 3. 만료: 지금이 exp보다 앞이어야 한다
        if (now >= Long.parseLong(field(payload, "exp"))) throw new BadTokenException("만료됨");
        return new Claims(field(payload, "sub"), field(payload, "role"));
    }

    // 화면의 코드: 토큰 머리말의 alg를 그대로 따르는 검증 (위험한 방식)
    static Claims verifyTrust(String token, long now) throws Exception {
        String[] part = token.split("\\.", -1);
        if (part.length != 3) throw new BadTokenException("형식 오류");
        Base64.Decoder dec = Base64.getUrlDecoder();
        String header = new String(dec.decode(part[0]), StandardCharsets.UTF_8);
        String payload = new String(dec.decode(part[1]), StandardCharsets.UTF_8);

        // 1. 알고리즘: 토큰의 머리말에 적힌 대로 따른다
        String alg = field(header, "alg");
        if (alg.equals("HS256")) {
            // 2. 서명: 앞의 두 부분으로 서버가 직접 다시 계산해 비교한다
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));
            byte[] expected = mac.doFinal((part[0] + "." + part[1]).getBytes(StandardCharsets.US_ASCII));
            if (!MessageDigest.isEqual(expected, dec.decode(part[2]))) throw new BadTokenException("서명 불일치");
        } else if (alg.equals("none")) {
            // "서명이 없는 토큰"으로 보고 서명 확인을 건너뛴다
        } else {
            throw new BadTokenException("허용하지 않는 알고리즘");
        }

        // 3. 만료: 지금이 exp보다 앞이어야 한다
        if (now >= Long.parseLong(field(payload, "exp"))) throw new BadTokenException("만료됨");
        return new Claims(field(payload, "sub"), field(payload, "role"));
    }

    static String b64u(byte[] b) { return Base64.getUrlEncoder().withoutPadding().encodeToString(b); }
    static String hmac(byte[] key, String input) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return b64u(mac.doFinal(input.getBytes(StandardCharsets.US_ASCII)));
    }

    public static void main(String[] args) throws Exception {
        String hHs = b64u("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8)), hNone = b64u("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String pUser = b64u(("{\"sub\":\"7\",\"role\":\"USER\",\"exp\":" + EXP + "}").getBytes(StandardCharsets.UTF_8)), pAdmin = b64u(("{\"sub\":\"7\",\"role\":\"ADMIN\",\"exp\":" + EXP + "}").getBytes(StandardCharsets.UTF_8));
        String sigOk = hmac(serverKey, hHs + "." + pUser);
        String[][] tokens = {
            { "ok", hHs + "." + pUser + "." + sigOk },
            { "payload", hHs + "." + pAdmin + "." + sigOk },
            { "otherkey", hHs + "." + pAdmin + "." + hmac(otherKey, hHs + "." + pAdmin) },
            { "none", hNone + "." + pAdmin + "." },
        };
        List<String> out = new ArrayList<>();
        out.add("# java " + System.getProperty("java.version") + " | javax.crypto.Mac HmacSHA256, java.util.Base64 url");
        out.add("# sig.serverForAdmin " + hmac(serverKey, hHs + "." + pAdmin));
        for (String[] t : tokens) out.add("# token." + t[0] + " " + t[1]);
        for (String[] t : tokens)
            for (String time : new String[] { "before", "after" })
                for (String policy : new String[] { "fixed", "trust" }) {
                    long now = time.equals("before") ? EXP - 600 : EXP + 60;
                    String res;
                    try {
                        Claims c = policy.equals("fixed") ? verifyFixed(t[1], now) : verifyTrust(t[1], now);
                        res = "accept|" + c.role();
                    } catch (BadTokenException e) {
                        res = "reject:" + e.getMessage() + "|-";
                    }
                    out.add(t[0] + "|" + time + "|" + policy + " => " + res);
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
