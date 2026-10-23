"캐시와 TTL" 실습(src/lessons/19_cache.js)의 화면 코드를 컴파일해 보려고 만든 대역이다. 실행하지 않는다.
spring-data-redis는 이 컴퓨터에 없어서, 화면 코드가 쓰는 클래스와 메서드의 이름·인자·돌려주는 타입만 공식 소스(spring-data-redis main 브랜치)에서 옮겼다.
  RedisCacheManager.builder(RedisConnectionFactory) / builder(RedisCacheWriter), RedisCacheManagerBuilder.withCacheConfiguration(String, RedisCacheConfiguration) / build()
  RedisCacheConfiguration.defaultCacheConfig() / entryTtl(Duration), RedisCacheWriter.lockingRedisCacheWriter(RedisConnectionFactory)
  RedisTemplate<K, V>.opsForValue() -> ValueOperations<K, V>: V get(Object), void set(K, V), default void set(K, V, Duration)
app/Product, app/ProductRepository는 화면 코드가 "예시로 만든 것(선언 생략)"이라고 밝힌 타입의 선언이다.
사용: node verify/spring/cmp_cache.js
