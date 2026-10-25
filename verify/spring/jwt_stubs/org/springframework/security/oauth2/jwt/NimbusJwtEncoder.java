package org.springframework.security.oauth2.jwt;

import javax.crypto.SecretKey;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1). 실습 auth의 JwtEncoder 코드를 컴파일하려고 더함. 화면 코드가 쓰는 것만 둔다.
// 실제로는 NimbusJwtEncoder(JWKSource<SecurityContext>) 생성자, setJwkSelector, withKeyPair(RSA·EC 키)도 있다.
// withSecretKey와 그 빌더는 @since 7.0이다.
// 근거: https://github.com/spring-projects/spring-security/blob/7.1.1/oauth2/oauth2-jose/src/main/java/org/springframework/security/oauth2/jwt/NimbusJwtEncoder.java
public final class NimbusJwtEncoder implements JwtEncoder {
    private NimbusJwtEncoder() { }
    @Override public Jwt encode(JwtEncoderParameters parameters) throws JwtEncodingException { throw new UnsupportedOperationException("대역"); }
    public static SecretKeyJwtEncoderBuilder withSecretKey(SecretKey secretKey) { return new SecretKeyJwtEncoderBuilder(); }

    public static final class SecretKeyJwtEncoderBuilder {
        private SecretKeyJwtEncoderBuilder() { }
        public SecretKeyJwtEncoderBuilder algorithm(MacAlgorithm macAlgorithm) { return this; }
        public NimbusJwtEncoder build() { return new NimbusJwtEncoder(); }
    }
}
