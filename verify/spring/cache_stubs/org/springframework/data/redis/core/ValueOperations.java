package org.springframework.data.redis.core;

import java.time.Duration;

// 대역: 시그니처만 옮김
public interface ValueOperations<K, V> {
    void set(K key, V value);
    default void set(K key, V value, Duration timeout) { }
    V get(Object key);
}
