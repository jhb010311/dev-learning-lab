package org.springframework.security.oauth2.jose.jws;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1). 실습 auth의 JwtEncoder 코드를 컴파일하려고 더함.
// 근거: https://github.com/spring-projects/spring-security/blob/7.1.1/oauth2/oauth2-jose/src/main/java/org/springframework/security/oauth2/jose/jws/MacAlgorithm.java
public enum MacAlgorithm implements JwsAlgorithm {
    HS256("HS256"), HS384("HS384"), HS512("HS512");
    private final String name;
    MacAlgorithm(String name) { this.name = name; }
    @Override public String getName() { return this.name; }
    public static MacAlgorithm from(String name) { for (MacAlgorithm a : values()) if (a.getName().equals(name)) return a; return null; }
}
