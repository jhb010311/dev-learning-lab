import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.aop.support.AopUtils;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.SpringVersion;

// "캐시 추상화" 실습의 마흔 가지 조합을 실제 스프링(@EnableCaching + ConcurrentMapCacheManager)에서 실행한다.
// 조합마다 컨텍스트를 새로 띄워 find를 한 번 부르고, 가운데 일을 하고, find를 한 번 더 부른 뒤
// find 본문이 실행된 횟수, 두 번째 find가 돌려준 값, 캐시에 남은 것을 적는다.
public class CacheAbsProbe {
    public interface Products {
        String find(Long id);
        void evict(Long id);
        String rename(Long id, String name);
        void renamePlain(Long id, String name);
        String detail(Long id);
        int findCount();
        int renameCount();
    }

    @Configuration
    @EnableCaching(proxyTargetClass = true)
    public static class Cfg {
        @Bean public CacheManager cacheManager() { return new ConcurrentMapCacheManager("product"); }
    }

    // @Cacheable에 unless가 없는 서비스
    public static class ProductService implements Products {
        private final Map<Long, String> db = new HashMap<>();   // DB 대신 쓰는 맵
        private int findCount, renameCount;
        public ProductService(boolean has1) { if (has1) db.put(1L, "키보드"); db.put(2L, "마우스"); }

        @Cacheable(cacheNames = "product")
        public String find(Long id) {
            findCount++;
            return db.get(id);
        }

        @CacheEvict(cacheNames = "product")
        public void evict(Long id) { }

        @CachePut(cacheNames = "product", key = "#id")
        public String rename(Long id, String name) {
            renameCount++;
            db.put(id, name);
            return name;
        }

        public void renamePlain(Long id, String name) { db.put(id, name); }

        public String detail(Long id) { return find(id); }

        public int findCount() { return findCount; }
        public int renameCount() { return renameCount; }
    }

    // @Cacheable에 unless = "#result == null"을 붙인 서비스. 나머지는 위와 같다.
    public static class ProductServiceUnless implements Products {
        private final Map<Long, String> db = new HashMap<>();
        private int findCount, renameCount;
        public ProductServiceUnless(boolean has1) { if (has1) db.put(1L, "키보드"); db.put(2L, "마우스"); }

        @Cacheable(cacheNames = "product", unless = "#result == null")
        public String find(Long id) {
            findCount++;
            return db.get(id);
        }

        @CacheEvict(cacheNames = "product")
        public void evict(Long id) { }

        @CachePut(cacheNames = "product", key = "#id")
        public String rename(Long id, String name) {
            renameCount++;
            db.put(id, name);
            return name;
        }

        public void renamePlain(Long id, String name) { db.put(id, name); }

        public String detail(Long id) { return find(id); }

        public int findCount() { return findCount; }
        public int renameCount() { return renameCount; }
    }

    static String show(String v) { return v == null ? "null" : "\"" + v + "\""; }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version") + " | ConcurrentMapCacheManager");
        for (String mid : new String[] { "none", "other", "evict", "put", "plain" })
            for (String via : new String[] { "ext", "self" })
                for (String data : new String[] { "yes", "no" })
                    for (boolean unless : new boolean[] { false, true }) {
                        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext()) {
                            ctx.register(Cfg.class);
                            boolean has1 = data.equals("yes");
                            if (unless) ctx.registerBean(ProductServiceUnless.class, () -> new ProductServiceUnless(has1));
                            else ctx.registerBean(ProductService.class, () -> new ProductService(has1));
                            ctx.refresh();
                            Products p = ctx.getBean(Products.class);
                            boolean self = via.equals("self");
                            String first = self ? p.detail(1L) : p.find(1L);
                            switch (mid) {
                                case "evict" -> p.evict(1L);
                                case "put" -> p.rename(1L, "새 키보드");
                                case "plain" -> p.renamePlain(1L, "새 키보드");
                                default -> { }
                            }
                            Long id2 = mid.equals("other") ? 2L : 1L;
                            String second = self ? p.detail(id2) : p.find(id2);
                            Map<Object, Object> cache = new TreeMap<>(((ConcurrentMapCache) ctx.getBean(CacheManager.class).getCache("product")).getNativeCache());
                            List<String> entries = new ArrayList<>();
                            cache.forEach((k, v) -> entries.add(k + "=" + (v instanceof String ? v : v.getClass().getSimpleName().equals("NullValue") ? "null" : v)));
                            out.add(mid + "|" + via + "|" + data + "|" + unless + " => " + p.findCount() + "번|" + show(second) + "|" + (entries.isEmpty() ? "비어 있음" : String.join(", ", entries))
                                + "|first=" + show(first) + "|renameCount=" + p.renameCount() + "|proxy=" + AopUtils.isAopProxy(p));
                        }
                    }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.size() - 1 + " combos");
    }
}
