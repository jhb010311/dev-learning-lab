import java.lang.reflect.*;
import java.util.concurrent.*;

// (1) 싱글톤 객체의 필드에 요청별 값을 두면 섞이는지 (2) ThreadLocal을 지우지 않으면 재사용된 스레드에 남는지
// (3) 프록시를 거치지 않는 내부 호출에는 부가 기능이 적용되지 않는지 (JDK 동적 프록시로 확인)
public class SharedState {
    static class OrderService { String currentUser;
        String order(String user, CountDownLatch saved, CountDownLatch go) throws Exception { currentUser = user; saved.countDown(); go.await(); return currentUser; }
        String orderLocal(String user, CountDownLatch saved, CountDownLatch go) throws Exception { saved.countDown(); go.await(); return user; } }
    static final ThreadLocal<String> USER = new ThreadLocal<>();

    interface Svc { void placeOrder(); void saveAll(); }
    static class SvcImpl implements Svc { public void placeOrder() { System.out.print("placeOrder 실행 → "); this.saveAll(); } public void saveAll() { System.out.print("saveAll 실행"); } }

    public static void main(String[] args) throws Exception {
        OrderService svc = new OrderService(); ExecutorService es = Executors.newFixedThreadPool(2);
        CountDownLatch saved = new CountDownLatch(2), go = new CountDownLatch(1);
        Future<String> a = es.submit(() -> svc.order("철수", saved, go)); Thread.sleep(100); Future<String> b = es.submit(() -> svc.order("영희", saved, go));
        saved.await(); go.countDown();
        System.out.println("필드: 철수의 주문=" + a.get() + ", 영희의 주문=" + b.get());
        CountDownLatch s2 = new CountDownLatch(2), g2 = new CountDownLatch(1);
        a = es.submit(() -> svc.orderLocal("철수", s2, g2)); b = es.submit(() -> svc.orderLocal("영희", s2, g2)); s2.await(); g2.countDown();
        System.out.println("지역 변수: 철수의 주문=" + a.get() + ", 영희의 주문=" + b.get());
        es.shutdown();

        ExecutorService one = Executors.newFixedThreadPool(1);          // 스레드가 재사용되는 풀
        one.submit(() -> USER.set("철수")).get();                        // 요청 1: 넣고 지우지 않음
        System.out.println("ThreadLocal 정리 안 함: 다음 요청이 본 값=" + one.submit(() -> USER.get()).get());
        one.submit(() -> { USER.set("철수"); USER.remove(); }).get();    // 요청 1: 끝에 remove
        System.out.println("ThreadLocal 정리함: 다음 요청이 본 값=" + one.submit(() -> USER.get()).get());
        one.shutdown();

        SvcImpl target = new SvcImpl();
        Svc proxy = (Svc) Proxy.newProxyInstance(Svc.class.getClassLoader(), new Class<?>[]{Svc.class}, (p, m, ar) -> {
            if (m.getName().equals("saveAll")) System.out.print("[프록시: 트랜잭션 시작] "); Object r = m.invoke(target, ar); if (m.getName().equals("saveAll")) System.out.print(" [프록시: 커밋]"); return r; });
        System.out.print("외부에서 proxy.saveAll(): "); proxy.saveAll(); System.out.println();
        System.out.print("외부에서 proxy.placeOrder() → 내부에서 this.saveAll(): "); proxy.placeOrder(); System.out.println();
    }
}
