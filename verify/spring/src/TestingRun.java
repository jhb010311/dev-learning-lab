package labtesting;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.platform.engine.TestExecutionResult;
import org.junit.platform.engine.discovery.DiscoverySelectors;
import org.junit.platform.engine.support.descriptor.ClassSource;
import org.junit.platform.engine.support.descriptor.MethodSource;
import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestIdentifier;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.mockito.Mockito;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.cache.ContextCache;

// "테스트" 실습의 조합 하나를 실행하는 자식 프로세스. TestingProbe가 조합마다 새 JVM으로 띄운다
// (스프링의 테스트 컨텍스트 캐시가 JVM 안의 정적 상태라서, 한 JVM에서 여러 조합을 돌리면 서로 섞인다).
// 인자: <unit|boot|webmvc> <none|svc|bare|repo> <same|mock|profile|dirty>
// JUnit Platform Launcher로 첫 번째 클래스와 두 번째 클래스를 한 번에(같은 JVM에서, 이름순으로) 실행하고 결과를 "RESULT ..." 한 줄로 낸다.
public class TestingRun {
    public static int created, refreshed;                                   // TestingApp이 올린다: 컨텍스트 만들기를 시작한 횟수, 기동에 성공한 횟수
    static final Map<String, String> beans = new LinkedHashMap<>();         // 테스트 클래스 → "컨트롤러 · 서비스 · 리포지토리"가 진짜인지 가짜인지
    static final Map<String, String> info = new LinkedHashMap<>();          // 테스트 클래스 → 빈 정의 수와 활성 프로필
    static final Map<String, Integer> ctxIds = new LinkedHashMap<>();       // 테스트 클래스 → 받은 컨텍스트 객체(같은 객체인지 보려고)

    static String kind(Object o) { return o == null ? "없음" : Mockito.mockingDetails(o).isMock() ? "가짜" : "진짜"; }

    // 단위 테스트: 테스트 메서드가 직접 만든 객체
    static void noteObjects(Object test, Object controller, Object service, Object repository) {
        beans.put(test.getClass().getSimpleName(), kind(controller) + " · " + kind(service) + " · " + kind(repository));
    }

    // 컨텍스트를 띄운 테스트: 컨텍스트에 그 타입의 빈이 있는지, 있으면 Mockito의 가짜인지
    static void noteContext(Object test, ApplicationContext ctx) {
        String n = test.getClass().getSimpleName();
        beans.put(n, kind(ctx.getBeanProvider(OrderController.class).getIfAvailable()) + " · " + kind(ctx.getBeanProvider(OrderService.class).getIfAvailable()) + " · " + kind(ctx.getBeanProvider(OrderRepository.class).getIfAvailable()));
        info.put(n, "defs=" + ctx.getBeanDefinitionCount() + ",profiles=[" + String.join("+", ctx.getEnvironment().getActiveProfiles()) + "]");
        ctxIds.put(n, System.identityHashCode(ctx));
    }

    static String cap(String s) { return Character.toUpperCase(s.charAt(0)) + s.substring(1); }
    static String clean(String s) { s = String.valueOf(s).replaceAll("\\s+", " ").replace('|', '/'); return s.length() > 150 ? s.substring(0, 150) + "..." : s; }

    public static void main(String[] a) throws Exception {
        String pre = cap(a[0]) + cap(a[1]), next = a[2];
        String first = pre + (next.equals("dirty") ? "ADirty" : "A"), second = pre + "B" + (next.equals("dirty") ? "Same" : cap(next));
        LauncherDiscoveryRequest request = LauncherDiscoveryRequestBuilder.request()
            .selectors(DiscoverySelectors.selectClass(Class.forName("labtesting." + first)), DiscoverySelectors.selectClass(Class.forName("labtesting." + second)))
            .configurationParameter("junit.jupiter.testclass.order.default", "org.junit.jupiter.api.ClassOrderer$ClassName")
            .build();
        Map<String, String> result = new LinkedHashMap<>(), error = new LinkedHashMap<>();
        Map<String, Long> began = new LinkedHashMap<>(), took = new LinkedHashMap<>();
        List<String> order = new ArrayList<>(), odd = new ArrayList<>();
        Launcher launcher = LauncherFactory.create();
        launcher.execute(request, new TestExecutionListener() {
            @Override public void executionStarted(TestIdentifier id) {
                id.getSource().filter(s -> s instanceof ClassSource).ifPresent(s -> { String n = ((ClassSource) s).getJavaClass().getSimpleName(); order.add(n); began.put(n, System.nanoTime()); });
            }
            @Override public void executionFinished(TestIdentifier id, TestExecutionResult r) {
                if (id.getSource().orElse(null) instanceof ClassSource cs) took.put(cs.getJavaClass().getSimpleName(), (System.nanoTime() - began.get(cs.getJavaClass().getSimpleName())) / 1_000_000);
                if (!id.isTest()) { if (r.getStatus() != TestExecutionResult.Status.SUCCESSFUL) odd.add(id.getDisplayName() + ":" + r.getStatus()); return; }
                String n = ((MethodSource) id.getSource().get()).getJavaClass().getSimpleName();
                Throwable t = r.getThrowable().orElse(null), root = t;
                while (root != null && root.getCause() != null) root = root.getCause();
                String msg = t == null ? "" : String.valueOf(t.getMessage());
                // 결과를 네 가지로 나눈다. 단언이 틀리면 AssertionError(JUnit의 AssertionFailedError도 그 하위 타입), 컨텍스트를 못 띄우면 스프링이 IllegalStateException을 던진다.
                result.put(n, r.getStatus() == TestExecutionResult.Status.SUCCESSFUL ? "통과"
                    : t instanceof AssertionError ? "실패 (기대한 값과 다름)"
                    : t instanceof IllegalStateException && msg.startsWith("Failed to load ApplicationContext") ? "컨텍스트 기동 실패"
                    : t instanceof IllegalStateException && msg.startsWith("ApplicationContext failure threshold") ? "컨텍스트 기동 실패 (다시 시도하지 않음)"
                    : "기타 " + t);
                error.put(n, t == null ? "-" : t.getClass().getName() + ": " + clean(msg) + (root != t ? " <= " + root.getClass().getName() + ": " + clean(root.getMessage()) : ""));
            }
        });
        String cache = "?";
        try {   // 스프링의 기본 컨텍스트 캐시(정적 필드)에서 남아 있는 컨텍스트 수와 적중, 실패 횟수를 읽는다. 참고용이다.
            Field f = Class.forName("org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate").getDeclaredField("defaultContextCache");
            f.setAccessible(true);
            ContextCache cc = (ContextCache) f.get(null);
            cache = "size=" + cc.size() + ",hit=" + cc.getHitCount() + ",miss=" + cc.getMissCount();
        } catch (Throwable e) { cache = "읽지 못함 " + e.getClass().getSimpleName(); }
        Integer id1 = ctxIds.get(first), id2 = ctxIds.get(second);
        String shared = id1 == null || id2 == null ? "-" : id1.equals(id2) ? "같은 컨텍스트" : "다른 컨텍스트";
        System.out.println("RESULT " + String.join("|",
            result.getOrDefault(first, "실행되지 않음"), beans.getOrDefault(first, "만들어지지 않음"),
            result.getOrDefault(second, "실행되지 않음"), created + "번",
            beans.getOrDefault(second, "만들어지지 않음"), "성공 " + refreshed + "번", shared,
            "order=" + String.join(">", order) + (odd.isEmpty() ? "" : " odd=" + odd), "cache[" + cache + "]",
            "first[" + info.getOrDefault(first, "-") + "," + took.get(first) + "ms] " + error.get(first),
            "second[" + info.getOrDefault(second, "-") + "," + took.get(second) + "ms] " + error.get(second)));
        System.exit(0);
    }
}
