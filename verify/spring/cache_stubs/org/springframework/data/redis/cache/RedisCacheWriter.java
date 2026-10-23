package org.springframework.data.redis.cache;

import org.springframework.data.redis.connection.RedisConnectionFactory;

// 대역: 시그니처만 옮김
public interface RedisCacheWriter {
    static RedisCacheWriter nonLockingRedisCacheWriter(RedisConnectionFactory connectionFactory) { return new RedisCacheWriter() { }; }
    static RedisCacheWriter lockingRedisCacheWriter(RedisConnectionFactory connectionFactory) { return new RedisCacheWriter() { }; }
}
