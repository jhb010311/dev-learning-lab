// "토큰" 기초 실습의 두 번째 확인: Node.js Probe가 만든 토큰을 JWT 라이브러리(jose4j 0.9.5)로 검증해 본다.
// 표준입력: 첫 줄은 서버의 시험용 열쇠(16진수), 다음 줄부터 "이름<TAB>토큰". 출력은 표준출력(UTF-8).
// 실행은 token_basic_probe.js가 한다. (이 PC의 Gradle 캐시에 있는 jose4j-0.9.5.jar를 읽기만 한다)
import org.jose4j.jwa.AlgorithmConstraints;
import org.jose4j.jws.JsonWebSignature;
import org.jose4j.keys.HmacKey;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

public class TokenBasicJose4jCheck {
    public static void main(String[] args) throws Exception {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        PrintStream out = new PrintStream(System.out, true, "UTF-8");
        String hex = in.readLine().trim();
        byte[] key = new byte[hex.length() / 2];
        for (int i = 0; i < key.length; i++) key[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        out.println("# jose4j 0.9.5 (jar 이름 기준) | JDK " + System.getProperty("java.version") + " | HS256만 허용");
        String line;
        while ((line = in.readLine()) != null) {
            if (line.isEmpty()) continue;
            int tab = line.indexOf('\t');
            String name = line.substring(0, tab), token = line.substring(tab + 1);
            try {
                JsonWebSignature jws = new JsonWebSignature();
                jws.setCompactSerialization(token);
                jws.setAlgorithmConstraints(new AlgorithmConstraints(AlgorithmConstraints.ConstraintType.PERMIT, "HS256"));
                jws.setKey(new HmacKey(key));
                boolean ok = jws.verifySignature();
                out.println(name + " => verify=" + ok + "|payload=" + jws.getUnverifiedPayload());
            } catch (Exception e) {
                out.println(name + " => verify=error|error=" + e.getClass().getSimpleName());
            }
        }
    }
}
