package org.springframework.security.oauth2.jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1). 실습 auth의 JwtEncoder 코드를 컴파일하려고 더함.
// 실제로는 JwtClaimAccessor를 구현해 getSubject()·getExpiresAt() 같은 default 메서드도 있다(여기서는 생략).
// 근거: https://github.com/spring-projects/spring-security/blob/7.1.1/oauth2/oauth2-jose/src/main/java/org/springframework/security/oauth2/jwt/JwtClaimsSet.java
public final class JwtClaimsSet {
    private JwtClaimsSet() { }
    public Map<String, Object> getClaims() { return null; }
    public static Builder builder() { return new Builder(); }
    public static Builder from(JwtClaimsSet claims) { return new Builder(); }

    public static final class Builder {
        private Builder() { }
        public Builder issuer(String issuer) { return this; }
        public Builder subject(String subject) { return this; }
        public Builder audience(List<String> audience) { return this; }
        public Builder expiresAt(Instant expiresAt) { return this; }
        public Builder notBefore(Instant notBefore) { return this; }
        public Builder issuedAt(Instant issuedAt) { return this; }
        public Builder id(String jti) { return this; }
        public Builder claim(String name, Object value) { return this; }
        public Builder claims(Consumer<Map<String, Object>> claimsConsumer) { return this; }
        public JwtClaimsSet build() { return new JwtClaimsSet(); }
    }
}
