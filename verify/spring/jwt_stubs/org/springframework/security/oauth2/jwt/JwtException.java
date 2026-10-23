package org.springframework.security.oauth2.jwt;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1)
public class JwtException extends RuntimeException {
    public JwtException(String message) { super(message); }
    public JwtException(String message, Throwable cause) { super(message, cause); }
}
