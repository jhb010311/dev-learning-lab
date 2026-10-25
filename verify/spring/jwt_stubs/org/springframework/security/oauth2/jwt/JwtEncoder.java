package org.springframework.security.oauth2.jwt;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1, @since 5.6). 실습 auth의 JwtEncoder 코드를 컴파일하려고 더함.
// 근거: https://github.com/spring-projects/spring-security/blob/7.1.1/oauth2/oauth2-jose/src/main/java/org/springframework/security/oauth2/jwt/JwtEncoder.java
@FunctionalInterface
public interface JwtEncoder {
    Jwt encode(JwtEncoderParameters parameters) throws JwtEncodingException;
}
