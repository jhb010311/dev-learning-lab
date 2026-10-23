package org.springframework.security.oauth2.jwt;

import java.util.Collection;
import org.springframework.security.oauth2.core.OAuth2Error;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1)
public class JwtValidationException extends BadJwtException {
    public JwtValidationException(String message, Collection<OAuth2Error> errors) { super(message); }
    public Collection<OAuth2Error> getErrors() { return null; }
}
