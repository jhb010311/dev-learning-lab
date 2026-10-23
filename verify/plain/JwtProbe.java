import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

// "JWT의 구조와 검증" 실습(JwtDecoder 중심으로 다시 짠 것)의 근거를 JDK만으로 계산한다(외부 요청 없음).
//  1. 토큰 네 가지를 javax.crypto.Mac(HmacSHA256)과 java.util.Base64(url)로 실제로 만든다. 같은 값을 Node.js crypto로 만든 것은 verify/net/jwt_probe.out.txt.
//  2. NimbusJwtDecoder.withSecretKey(key).build().decode(token)이 거치는 판단을 공식 소스에서 순서와 문구 그대로 옮겨, 조합마다 결과와 예외 이름·메시지를 적는다.
//     이 컴퓨터에는 spring-security-oauth2-jose와 nimbus-jose-jwt가 없어서 디코더 자체는 실행하지 않았다. 옮긴 곳:
//       spring-security 7.1.1  NimbusJwtDecoder.decode / parse / createJwt / validateJwt, SecretKeyJwtDecoderBuilder(기본 HS256, SingleKeyJWSKeySelector,
//                              claims 검증은 Nimbus에서 끄고 스프링이 함), JwtValidators.createDefault()(JwtTypeValidator.jwt, JwtTimestampValidator, X509 지문),
//                              JwtTimestampValidator(기본 여유 60초, now - 60초가 exp보다 뒤면 "Jwt expired at <exp>")
//       nimbus-jose-jwt 10.9.1 JWTParser.parse(alg가 none이면 PlainJWT), PlainJWT.parse(셋째 부분이 비어야 함),
//                              DefaultJWTProcessor.process(SignedJWT)(키 없음 → "Another algorithm expected, or no matching key(s) found", 서명 불일치 → "Invalid signature"),
//                              MACProvider(HS256 키는 256비트 이상)
//     서명이 맞는지는 Nimbus의 MACVerifier 대신 javax.crypto.Mac으로 실제로 계산해 비교한다.
//     이 실습의 토큰은 모두 typ가 JWT라 JwtTypeValidator는 늘 통과하므로 옮기지 않았다.
// 사용: javac -d <폴더> JwtProbe.java && java -cp <폴더> JwtProbe verify/plain/jwt_probe_std.out.txt
public class JwtProbe {
    static final byte[] serverKey = "shop-example-hs256-secret-key-01".getBytes(StandardCharsets.US_ASCII);   // 시험용 값 (32바이트)
    static final byte[] otherKey = "someone-elses-guessed-key-000000".getBytes(StandardCharsets.US_ASCII);    // 시험용 값
    static final long EXP = 1767225600L;                                                                       // 2026-01-01T00:00:00Z
    static final String TEMPLATE = "An error occurred while attempting to decode the Jwt: %s";                 // NimbusJwtDecoder.DECODING_ERROR_MESSAGE_TEMPLATE

    static class BadJwtException extends RuntimeException { BadJwtException(String m) { super(m); } }       // 이름만 같게 둔 대역
    static class JwtValidationException extends BadJwtException { JwtValidationException(String m) { super(m); } }

    static String field(String json, String name) {
        Matcher m = Pattern.compile("\"" + name + "\":(\"([^\"]*)\"|(\\d+))").matcher(json);
        return m.find() ? (m.group(2) != null ? m.group(2) : m.group(3)) : null;
    }

    // NimbusJwtDecoder.withSecretKey(new SecretKeySpec(serverKey, "HmacSHA256")).build() 에 시계를 now로 고정한 JwtTimestampValidator를 둔 것과 같은 판단
    static String[] decode(String token, long now) throws Exception {
        // JWTParser.parse: 첫 점 앞을 머리말로 풀어 alg를 읽는다
        int dot = token.indexOf('.');
        if (dot < 0) throw new BadJwtException(String.format(TEMPLATE, "Malformed token"));
        Base64.Decoder dec = Base64.getUrlDecoder();
        String header = new String(dec.decode(token.substring(0, dot)), StandardCharsets.UTF_8);
        String alg = field(header, "alg");
        String[] part = token.split("\\.", -1);
        if ("none".equals(alg)) {
            // PlainJWT.parse: 셋째 부분이 비어 있어야 한다. 그다음 NimbusJwtDecoder.decode가 PlainJWT를 거절한다
            if (part.length != 3 || !part[2].isEmpty()) throw new BadJwtException(String.format(TEMPLATE, "Malformed token"));
            throw new BadJwtException("Unsupported algorithm of none");
        }
        String payload = new String(dec.decode(part[1]), StandardCharsets.UTF_8);
        // DefaultJWTProcessor.process: SingleKeyJWSKeySelector(HS256, key)는 머리말의 alg가 HS256일 때만 키를 내준다
        if (!"HS256".equals(alg)) throw new BadJwtException(String.format(TEMPLATE, "Signed JWT rejected: Another algorithm expected, or no matching key(s) found"));
        if (serverKey.length * 8 < 256) throw new IllegalStateException("HS256 키는 256비트 이상이어야 함");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));
        byte[] expected = mac.doFinal((part[0] + "." + part[1]).getBytes(StandardCharsets.US_ASCII));
        if (!MessageDigest.isEqual(expected, dec.decode(part[2]))) throw new BadJwtException(String.format(TEMPLATE, "Signed JWT rejected: Invalid signature"));
        // JwtTimestampValidator: Instant.now(clock).minus(clockSkew).isAfter(expiry) 이면 실패
        Clock clock = Clock.fixed(Instant.ofEpochSecond(now), ZoneOffset.UTC);
        Duration clockSkew = Duration.ofSeconds(60);
        Instant expiry = Instant.ofEpochSecond(Long.parseLong(field(payload, "exp")));
        if (Instant.now(clock).minus(clockSkew).isAfter(expiry)) throw new JwtValidationException(String.format(TEMPLATE, String.format("Jwt expired at %s", expiry)));
        return new String[] { field(payload, "sub"), field(payload, "role") };
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
        String[][] times = { { "before", String.valueOf(EXP - 600) }, { "grace", String.valueOf(EXP + 30) }, { "after", String.valueOf(EXP + 300) } };
        List<String> out = new ArrayList<>();
        out.add("# java " + System.getProperty("java.version") + " | javax.crypto.Mac HmacSHA256 | 판단 순서와 문구: spring-security 7.1.1 NimbusJwtDecoder, nimbus-jose-jwt 10.9.1 (소스에서 옮김, 디코더는 실행하지 않음)");
        for (String[] t : times) out.add("# time." + t[0] + " " + t[1] + " = " + Instant.ofEpochSecond(Long.parseLong(t[1])));
        out.add("# exp " + EXP + " = " + Instant.ofEpochSecond(EXP));
        out.add("# sig.ok " + sigOk);
        out.add("# sig.serverForAdmin " + hmac(serverKey, hHs + "." + pAdmin));
        for (String[] t : tokens) out.add("# token." + t[0] + " " + t[1]);
        // 만료 경계: 60초 여유 안쪽은 통과, 바깥은 거절
        for (long d : new long[] { 0, 59, 60, 61 }) {
            String r; try { decode(tokens[0][1], EXP + d); r = "accept"; } catch (BadJwtException e) { r = "reject"; }
            out.add("# boundary exp+" + d + "s: " + r);
        }
        for (String[] t : tokens)
            for (String[] time : times) {
                String res;
                try { String[] c = decode(t[1], Long.parseLong(time[1])); res = "accept|sub=" + c[0] + "|role=" + c[1]; }
                catch (BadJwtException e) { res = "reject|" + e.getClass().getSimpleName() + "|" + e.getMessage(); }
                out.add(t[0] + "|" + time[0] + " => " + res);
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}
