package org.springframework.security.oauth2.jose.jws;

import org.springframework.security.oauth2.jose.JwaAlgorithm;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1). 실습 auth의 JwtEncoder 코드를 컴파일하려고 더함.
// 근거: https://github.com/spring-projects/spring-security/blob/7.1.1/oauth2/oauth2-jose/src/main/java/org/springframework/security/oauth2/jose/jws/JwsAlgorithm.java
public interface JwsAlgorithm extends JwaAlgorithm {
}
