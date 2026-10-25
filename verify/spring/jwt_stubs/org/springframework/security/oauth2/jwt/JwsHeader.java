package org.springframework.security.oauth2.jwt;

import org.springframework.security.oauth2.jose.jws.JwsAlgorithm;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1). 실습 auth의 JwtEncoder 코드를 컴파일하려고 더함.
// 실제로는 JoseHeader를 물려받고 Builder는 AbstractBuilder<JwsHeader, Builder>를 물려받는다(type, keyId 같은 메서드는 그쪽에 있음. 여기서는 생략).
// 근거: https://github.com/spring-projects/spring-security/blob/7.1.1/oauth2/oauth2-jose/src/main/java/org/springframework/security/oauth2/jwt/JwsHeader.java
public final class JwsHeader {
    private JwsHeader() { }
    public JwsAlgorithm getAlgorithm() { return null; }
    public static Builder with(JwsAlgorithm jwsAlgorithm) { return new Builder(); }
    public static Builder from(JwsHeader headers) { return new Builder(); }

    public static final class Builder {
        private Builder() { }
        public JwsHeader build() { return new JwsHeader(); }
    }
}
