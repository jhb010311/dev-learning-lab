package org.springframework.security.oauth2.jwt;

import javax.crypto.SecretKey;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1). 화면 코드가 쓰는 것만 둔다.
public final class NimbusJwtDecoder implements JwtDecoder {
    @Override public Jwt decode(String token) throws JwtException { throw new UnsupportedOperationException("대역"); }
    public static SecretKeyJwtDecoderBuilder withSecretKey(SecretKey secretKey) { return new SecretKeyJwtDecoderBuilder(); }

    public static final class SecretKeyJwtDecoderBuilder {
        private SecretKeyJwtDecoderBuilder() { }
        public SecretKeyJwtDecoderBuilder validateType(boolean shouldValidateTypHeader) { return this; }
        public NimbusJwtDecoder build() { return new NimbusJwtDecoder(); }
    }
}
