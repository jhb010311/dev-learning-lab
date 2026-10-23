package org.springframework.data.redis.cache;

import java.util.Collection;
import java.util.List;
import org.springframework.cache.Cache;
import org.springframework.cache.support.AbstractCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

// 대역: 시그니처만 옮김. 실제 부모 AbstractTransactionSupportingCacheManager(spring-context-support)는 점검용 클래스패스에 없어, 그 부모인 AbstractCacheManager(spring-context)를 둔다
public class RedisCacheManager extends AbstractCacheManager {
    @Override protected Collection<? extends Cache> loadCaches() { return List.of(); }
    public static RedisCacheManagerBuilder builder(RedisConnectionFactory connectionFactory) { return new RedisCacheManagerBuilder(); }
    public static RedisCacheManagerBuilder builder(RedisCacheWriter cacheWriter) { return new RedisCacheManagerBuilder(); }
    public static class RedisCacheManagerBuilder {
        public RedisCacheManagerBuilder cacheDefaults(RedisCacheConfiguration defaultCacheConfiguration) { return this; }
        public RedisCacheManagerBuilder withCacheConfiguration(String cacheName, RedisCacheConfiguration cacheConfiguration) { return this; }
        public RedisCacheManager build() { return new RedisCacheManager(); }
    }
}
