package org.springframework.security.oauth2.server.resource.authentication;

import java.util.Collection;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

// 대역: 시그니처만 옮김 (spring-security-oauth2-resource-server 7.1.1)
public final class JwtGrantedAuthoritiesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {
    @Override public Collection<GrantedAuthority> convert(Jwt jwt) { throw new UnsupportedOperationException("대역"); }
    public void setAuthorityPrefix(String authorityPrefix) { }
    public void setAuthoritiesClaimDelimiter(String authoritiesClaimDelimiter) { }
    public void setAuthoritiesClaimName(String authoritiesClaimName) { }
}
