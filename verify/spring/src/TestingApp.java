package labtesting;

import java.util.Map;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

// "테스트" 실습(TestingProbe)의 테스트 대상 애플리케이션: 컨트롤러 → 서비스 → 리포지토리.
// 다른 Probe와 달리 이름 있는 패키지(labtesting)에 둔다. @SpringBootApplication의 컴포넌트 스캔이
// 이 패키지만 훑게 하고, @WebMvcTest가 그 스캔에서 @Service와 @Repository를 빼는 것을 그대로 보기 위해서다.
// (설정 클래스 안에 중첩 클래스로 두면 스캔과 관계없이 빈이 되므로, 세 클래스는 최상위 클래스로 둔다.)
//
// 이 PC의 클래스패스에는 스프링 시큐리티, H2/HikariCP, Hibernate, 스프링 데이터 JPA가 함께 있다.
// 그대로 두면 @SpringBootTest에서 시큐리티가 요청을 401로 막고 DataSource와 JPA가 떠 버리므로 아래 자동 설정을 뺀다.
@SpringBootApplication(exclude = {
    org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration.class,
    org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration.class,
    org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration.class,
    org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration.class,
    org.springframework.boot.security.autoconfigure.actuate.web.servlet.ManagementWebSecurityAutoConfiguration.class,
    org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration.class,
    org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration.class,
    org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration.class })
public class TestingApp {
    // 컨텍스트를 만들 때마다 이 설정 클래스의 객체가 하나 생기므로, 생성자가 불린 횟수가 컨텍스트 만들기를 시작한 횟수다(기동에 실패한 것도 센다)
    public TestingApp() { TestingRun.created++; }

    // 기동에 성공한 횟수
    @EventListener
    public void onRefreshed(ContextRefreshedEvent e) { TestingRun.refreshed++; }
}

@RestController
class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) { this.orderService = orderService; }

    @GetMapping("/orders/{id}")
    public String name(@PathVariable Long id) { return orderService.findName(id); }
}

@Service
class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) { this.orderRepository = orderRepository; }

    public String findName(Long id) { return orderRepository.findName(id); }
}

@Repository
class OrderRepository {
    private final Map<Long, String> db = Map.of(1L, "키보드");   // DB 대신 쓰는 맵

    public String findName(Long id) { return db.get(id); }
}
