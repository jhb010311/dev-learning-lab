import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

// "빈 생성과 주입" 실습의 열두 가지 조합을 실제 스프링 부트(SpringApplication)로 띄워 본다.
// 객체가 만들어진 순서는 생성자가 불린 순서, 완성된 순서는 의존성 주입이 끝난 뒤 불리는 afterPropertiesSet의 순서로 적는다.
// 빈은 화면의 코드와 같은 순서(컨트롤러 → 서비스 → 결제 서비스 → 리포지토리)로 등록한다.
public class DiProbe {
    static final List<String> created = new ArrayList<>(), completed = new ArrayList<>();
    public static class Tracked implements InitializingBean {
        public Tracked() { created.add(getClass().getSimpleName()); }
        @Override public void afterPropertiesSet() { completed.add(getClass().getSimpleName()); }
    }

    // 생성자 주입
    public static class C1 {
        @Component public static class OrderRepository extends Tracked { }
        @Component public static class OrderService extends Tracked { final OrderRepository r; public OrderService(OrderRepository r) { this.r = r; } }
        @Component public static class OrderController extends Tracked { final OrderService s; public OrderController(OrderService s) { this.s = s; } }
    }
    public static class C2 {
        @Component public static class OrderRepository extends Tracked { }
        @Component public static class OrderService extends Tracked { final OrderRepository r; final PaymentService p; public OrderService(OrderRepository r, PaymentService p) { this.r = r; this.p = p; } }
        @Component public static class PaymentService extends Tracked { final OrderService s; public PaymentService(OrderService s) { this.s = s; } }
        @Component public static class OrderController extends Tracked { final OrderService s; public OrderController(OrderService s) { this.s = s; } }
    }
    // 필드 주입
    public static class F1 {
        @Component public static class OrderRepository extends Tracked { }
        @Component public static class OrderService extends Tracked { @Autowired OrderRepository orderRepository; }
        @Component public static class OrderController extends Tracked { @Autowired OrderService orderService; }
    }
    public static class F2 {
        @Component public static class OrderRepository extends Tracked { }
        @Component public static class OrderService extends Tracked { @Autowired OrderRepository orderRepository; @Autowired PaymentService paymentService; }
        @Component public static class PaymentService extends Tracked { @Autowired OrderService orderService; }
        @Component public static class OrderController extends Tracked { @Autowired OrderService orderService; }
    }
    // 세터 주입
    public static class S1 {
        @Component public static class OrderRepository extends Tracked { }
        @Component public static class OrderService extends Tracked { OrderRepository r; @Autowired void setOrderRepository(OrderRepository r) { this.r = r; } }
        @Component public static class OrderController extends Tracked { OrderService s; @Autowired void setOrderService(OrderService s) { this.s = s; } }
    }
    public static class S2 {
        @Component public static class OrderRepository extends Tracked { }
        @Component public static class OrderService extends Tracked { OrderRepository r; PaymentService p; @Autowired void setOrderRepository(OrderRepository r) { this.r = r; } @Autowired void setPaymentService(PaymentService p) { this.p = p; } }
        @Component public static class PaymentService extends Tracked { OrderService s; @Autowired void setOrderService(OrderService s) { this.s = s; } }
        @Component public static class OrderController extends Tracked { OrderService s; @Autowired void setOrderService(OrderService s) { this.s = s; } }
    }

    static Class<?>[] sources(String inj, boolean cycle) {
        return switch (inj + (cycle ? "2" : "1")) {
            case "ctor1" -> new Class<?>[] { C1.OrderController.class, C1.OrderService.class, C1.OrderRepository.class };
            case "ctor2" -> new Class<?>[] { C2.OrderController.class, C2.OrderService.class, C2.PaymentService.class, C2.OrderRepository.class };
            case "field1" -> new Class<?>[] { F1.OrderController.class, F1.OrderService.class, F1.OrderRepository.class };
            case "field2" -> new Class<?>[] { F2.OrderController.class, F2.OrderService.class, F2.PaymentService.class, F2.OrderRepository.class };
            case "setter1" -> new Class<?>[] { S1.OrderController.class, S1.OrderService.class, S1.OrderRepository.class };
            default -> new Class<?>[] { S2.OrderController.class, S2.OrderService.class, S2.PaymentService.class, S2.OrderRepository.class };
        };
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion());
        for (String inj : new String[] { "ctor", "field", "setter" })
            for (boolean cycle : new boolean[] { false, true })
                for (boolean allow : new boolean[] { false, true }) {
                    created.clear(); completed.clear();
                    String result = "성공", why = "";
                    SpringApplication app = new SpringApplication(sources(inj, cycle));
                    app.setWebApplicationType(WebApplicationType.NONE);
                    app.setBannerMode(Banner.Mode.OFF);
                    app.setLogStartupInfo(false);
                    try (ConfigurableApplicationContext ctx = app.run("--spring.main.allow-circular-references=" + allow, "--logging.level.root=OFF")) { /* 떴다 */ }
                    catch (Throwable e) { result = "실패"; Throwable r = e; while (r.getCause() != null) r = r.getCause(); why = r.getClass().getSimpleName(); }
                    out.add(inj + "|" + cycle + "|" + allow + " => " + result + "|" + String.join(" → ", created) + "|" + String.join(" → ", completed) + "|" + why);
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}
