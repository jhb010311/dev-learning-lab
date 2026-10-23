package org.springframework.security.oauth2.server.resource.authentication;

import java.util.Collection;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

// 대역: 시그니처만 옮김 (spring-security-oauth2-resource-server 7.1.1)
public class JwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    @Override public final AbstractAuthenticationToken convert(Jwt jwt) { throw new UnsupportedOperationException("대역"); }
    public void setJwtGrantedAuthoritiesConverter(Converter<Jwt, Collection<GrantedAuthority>> jwtGrantedAuthoritiesConverter) { }
    public void setPrincipalClaimName(String principalClaimName) { }
}
