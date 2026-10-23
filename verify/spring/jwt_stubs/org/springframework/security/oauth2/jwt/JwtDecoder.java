package org.springframework.security.oauth2.jwt;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1)
@FunctionalInterface
public interface JwtDecoder {
    Jwt decode(String token) throws JwtException;
}
