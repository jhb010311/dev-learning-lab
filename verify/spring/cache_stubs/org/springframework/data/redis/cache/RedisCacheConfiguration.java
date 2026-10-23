package org.springframework.data.redis.cache;

import java.time.Duration;

// 대역: 시그니처만 옮김(public static RedisCacheConfiguration defaultCacheConfig(), public RedisCacheConfiguration entryTtl(Duration ttl))
public class RedisCacheConfiguration {
    public static RedisCacheConfiguration defaultCacheConfig() { return new RedisCacheConfiguration(); }
    public RedisCacheConfiguration entryTtl(Duration ttl) { return this; }
}
