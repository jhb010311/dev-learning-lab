import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.cache.support.SimpleValueWrapper;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.SpringVersion;

// "캐시와 TTL" 실습(src/lessons/19_cache.js)의 스탬피드 물음이 기대는 스프링 쪽 사실을 실제 스프링(spring-context)에서 실행해 확인한다.
// 캐시가 빈 상태에서 스레드 20개가 같은 키(1)로 @Cacheable 메서드를 동시에 부르고(CountDownLatch로 한꺼번에 출발),
// 메서드 본문(DB 조회 자리, 300ms 잠)이 몇 번 실행되었는지, 캐시의 어느 메서드가 불렸는지 센다.
//   plain_map   : @Cacheable(cacheNames = "product", key = "#id")                 + ConcurrentMapCache(스프링이 주는 것)
//   sync_map    : @Cacheable(cacheNames = "product", key = "#id", sync = true)    + ConcurrentMapCache
//   sync_nolock : @Cacheable(..., sync = true) + 이 프로브에서 만든 NoLockCache.
//                 NoLockCache.get(key, valueLoader)는 잠그지 않고 "읽기 → 없으면 valueLoader 실행 → 저장"만 한다.
//                 Spring Data Redis 3.4부터 RedisCache.get(key, valueLoader)가 기본(잠그지 않는) RedisCacheWriter로 하는 순서와 같게 만든 것이다
//                 (DefaultRedisCacheWriter.get: doGet → valueLoader.get() → doPut. 잠금은 lockingRedisCacheWriter일 때만). Redis 자체는 실행하지 않았다.
//   sync_unless : sync = true에 unless를 함께 적으면 어떻게 되는가
// 모든 캐시는 CountingCache로 한 겹 둘러 get(key)와 get(key, valueLoader)가 불린 횟수를 센다(그 밖의 일은 그대로 넘긴다).
// 컴파일: javac -parameters (key = "#id"가 인자 이름을 읽는다. 스프링 부트의 빌드 설정과 같게)
public class CacheProbe {
    static final int THREADS = 20, BODY_MS = 300;
    static final AtomicInteger LOADS = new AtomicInteger();

    // 본문이 실행될 때마다 새 객체를 돌려준다(받은 값이 같은 객체인지 세려고)
    static String load(long id) {
        LOADS.incrementAndGet();
        try { Thread.sleep(BODY_MS); } catch (InterruptedException e) { throw new RuntimeException(e); }
        return new String("상품" + id);
    }

    public interface Products { String getProduct(long id); }

    public static class PlainService implements Products {
        @Cacheable(cacheNames = "product", key = "#id")
        public String getProduct(long id) { return load(id); }
    }
    public static class SyncService implements Products {
        @Cacheable(cacheNames = "product", key = "#id", sync = true)
        public String getProduct(long id) { return load(id); }
    }
    public static class SyncUnlessService implements Products {
        @Cacheable(cacheNames = "product", key = "#id", sync = true, unless = "#result == null")
        public String getProduct(long id) { return load(id); }
    }

    // get(key)와 get(key, valueLoader)가 불린 횟수를 센다. lock=false이면 get(key, valueLoader)를 잠그지 않는 순서로 직접 한다.
    public static class CountingCache implements Cache {
        final ConcurrentMapCache store = new ConcurrentMapCache("product");
        final boolean lock;
        final AtomicInteger gets = new AtomicInteger(), loaderGets = new AtomicInteger();
        CountingCache(boolean lock) { this.lock = lock; }
        public String getName() { return store.getName(); }
        public Object getNativeCache() { return store.getNativeCache(); }
        public ValueWrapper get(Object key) { gets.incrementAndGet(); return store.get(key); }
        public <T> T get(Object key, Class<T> type) { gets.incrementAndGet(); return store.get(key, type); }
        @SuppressWarnings("unchecked")
        public <T> T get(Object key, Callable<T> valueLoader) {
            loaderGets.incrementAndGet();
            if (lock) return store.get(key, valueLoader);            // ConcurrentMapCache: 스프링이 주는 구현(잠근다)
            ValueWrapper w = store.get(key);                          // NoLockCache: 읽고
            if (w != null) return (T) w.get();
            T v;
            try { v = valueLoader.call(); } catch (Exception e) { throw new ValueRetrievalException(key, valueLoader, e); }   // 없으면 계산하고
            store.put(key, v);                                        // 저장한다
            return v;
        }
        public void put(Object key, Object value) { store.put(key, value); }
        public void evict(Object key) { store.evict(key); }
        public void clear() { store.clear(); }
    }

    static CountingCache CACHE;
    static Class<?> SERVICE;

    @Configuration
    @EnableCaching
    public static class Cfg {
        @Bean public CacheManager cacheManager() { SimpleCacheManager m = new SimpleCacheManager(); m.setCaches(List.of(CACHE)); return m; }
        @Bean public Products products() throws Exception { return (Products) SERVICE.getDeclaredConstructor().newInstance(); }
    }

    static String run(String name, Class<?> service, boolean lock) throws Exception {
        CACHE = new CountingCache(lock); SERVICE = service; LOADS.set(0);
        StringBuilder o = new StringBuilder(name + " => ");
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(Cfg.class)) {
            Products p = ctx.getBean(Products.class);
            ExecutorService ex = Executors.newFixedThreadPool(THREADS);
            CountDownLatch ready = new CountDownLatch(THREADS), go = new CountDownLatch(1);
            List<Future<Object[]>> fs = new ArrayList<>();
            for (int i = 0; i < THREADS; i++) fs.add(ex.submit(() -> {
                ready.countDown(); go.await();
                long t = System.nanoTime();
                String v = p.getProduct(1L);
                return new Object[] { v, (System.nanoTime() - t) / 1_000_000 };
            }));
            ready.await(); go.countDown();
            Set<Object> distinct = Collections.newSetFromMap(new IdentityHashMap<>());
            long min = Long.MAX_VALUE, max = 0; String err = null;
            for (Future<Object[]> f : fs) {
                try { Object[] r = f.get(); distinct.add(r[0]); min = Math.min(min, (Long) r[1]); max = Math.max(max, (Long) r[1]); }
                catch (Exception e) { Throwable c = e.getCause() != null ? e.getCause() : e; err = c.getClass().getName() + ": " + c.getMessage(); }
            }
            ex.shutdown();
            if (err != null) return o.append("error=").append(err.replace('\n', ' ')).toString();
            int loads = LOADS.get(), gets = CACHE.gets.get(), lg = CACHE.loaderGets.get();
            o.append("threads=").append(THREADS).append("|loads=").append(loads).append("|distinctValues=").append(distinct.size())
             .append("|cacheGet=").append(gets).append("|cacheGetWithLoader=").append(lg)
             .append("|minMs=").append(min).append("|maxMs=").append(max);
            // 다 끝난 뒤 한 번 더 부르면(캐시에 값이 있음) 본문이 실행되는가
            p.getProduct(1L);
            o.append("|loadsAfterOneMoreCall=").append(LOADS.get()).append("|cached=").append(CACHE.store.getNativeCache().keySet());
        } catch (Exception e) {
            Throwable c = e; while (c.getCause() != null) c = c.getCause();
            o.append("error=").append(c.getClass().getName()).append(": ").append(String.valueOf(c.getMessage()).replace('\n', ' '));
        }
        return o.toString();
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version") + " | threads " + THREADS + " | body " + BODY_MS + "ms");
        out.add(run("plain_map", PlainService.class, true));
        out.add(run("sync_map", SyncService.class, true));
        out.add(run("sync_nolock", SyncService.class, false));
        out.add(run("plain_nolock", PlainService.class, false));
        out.add(run("sync_unless", SyncUnlessService.class, true));
        out.forEach(System.out::println);
        Files.write(Path.of(args.length > 0 ? args[0] : "cache_probe.out.txt"), out, StandardCharsets.UTF_8);
    }
}
