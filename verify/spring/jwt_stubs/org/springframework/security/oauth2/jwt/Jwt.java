package org.springframework.security.oauth2.jwt;

import java.time.Instant;
import java.util.Map;

// 대역: 시그니처만 옮김 (spring-security-oauth2-jose 7.1.1). 실제로는 AbstractOAuth2Token을 물려받고 JwtClaimAccessor를 구현하며,
// getSubject()·getExpiresAt()는 JwtClaimAccessor의, getClaimAsString(String)은 ClaimAccessor의 default 메서드다.
public class Jwt {
    public Jwt(String tokenValue, Instant issuedAt, Instant expiresAt, Map<String, Object> headers, Map<String, Object> claims) { }
    public String getTokenValue() { return null; }
    public Map<String, Object> getHeaders() { return null; }
    public Map<String, Object> getClaims() { return null; }
    public String getSubject() { return null; }
    public Instant getExpiresAt() { return null; }
    public String getClaimAsString(String claim) { return null; }
}
