package labtesting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// "테스트" 실습의 테스트 클래스들. TestingRun이 조합마다 이 가운데 두 개(첫 번째, 두 번째)를 골라 JUnit으로 실행한다.
// 이름: <방식><가짜 객체><A|B...>. A는 먼저 실행되는 첫 번째 클래스, B는 두 번째 클래스다(JUnit에 클래스 이름순으로 실행하게 한다).
// 화면의 코드는 클래스마다 필드와 테스트 메서드를 다 적지만, 여기서는 같은 본문을 여러 클래스가 써야 하므로
// 본문을 abstract 클래스에 두고 애노테이션만 다른 클래스가 그것을 물려받는다(필드의 @MockitoBean과 @Test는 물려받은 것도 똑같이 적용된다).
// TestingRun.note...는 대조를 위해 "지금 쓰는 객체가 진짜인지 가짜인지"를 적어 두는 줄이고, 화면의 코드에는 없다.

// ---- 스프링 없이 하는 단위 테스트: new와 Mockito만 쓴다 ----
abstract class UnitNone {
    @Test
    void returnsOrderName() {
        OrderRepository orderRepository = new OrderRepository();
        OrderService orderService = new OrderService(orderRepository);
        OrderController orderController = new OrderController(orderService);
        TestingRun.noteObjects(this, orderController, orderService, orderRepository);
        assertEquals("키보드", orderController.name(1L));
    }
}
abstract class UnitSvc {
    @Test
    void returnsOrderName() {
        OrderService orderService = mock(OrderService.class);
        when(orderService.findName(1L)).thenReturn("키보드");
        OrderController orderController = new OrderController(orderService);
        TestingRun.noteObjects(this, orderController, orderService, null);
        assertEquals("키보드", orderController.name(1L));
    }
}
abstract class UnitBare {
    @Test
    void returnsOrderName() {
        OrderService orderService = mock(OrderService.class);
        OrderController orderController = new OrderController(orderService);
        TestingRun.noteObjects(this, orderController, orderService, null);
        assertEquals("키보드", orderController.name(1L));
    }
}
abstract class UnitRepo {
    @Test
    void returnsOrderName() {
        OrderRepository orderRepository = mock(OrderRepository.class);
        when(orderRepository.findName(1L)).thenReturn("키보드");
        OrderService orderService = new OrderService(orderRepository);
        OrderController orderController = new OrderController(orderService);
        TestingRun.noteObjects(this, orderController, orderService, orderRepository);
        assertEquals("키보드", orderController.name(1L));
    }
}
class UnitNoneA extends UnitNone {}
class UnitNoneBSame extends UnitNone {}
class UnitSvcA extends UnitSvc {}
class UnitSvcBSame extends UnitSvc {}
class UnitBareA extends UnitBare {}
class UnitBareBSame extends UnitBare {}
class UnitRepoA extends UnitRepo {}
class UnitRepoBSame extends UnitRepo {}

// ---- 스프링 컨텍스트를 띄우는 테스트의 공통 본문: MockMvc로 GET /orders/1을 보내고 응답 본문을 확인한다 ----
abstract class MvcBase {
    @Autowired MockMvc mockMvc;
    @Autowired ApplicationContext ctx;

    void stub() { }

    @Test
    void returnsOrderName() throws Exception {
        TestingRun.noteContext(this, ctx);
        stub();
        mockMvc.perform(get("/orders/1"))
               .andExpect(status().isOk())
               .andExpect(content().string("키보드"));
    }
}
// 가짜 객체 없음
abstract class MvcNone extends MvcBase { }
// OrderService를 가짜로 바꾸고 돌려줄 값을 정한다
abstract class MvcSvc extends MvcBase {
    @MockitoBean OrderService orderService;
    void stub() { when(orderService.findName(1L)).thenReturn("키보드"); }
}
// OrderService를 가짜로 바꾸기만 한다
abstract class MvcBare extends MvcBase {
    @MockitoBean OrderService orderService;
}
// OrderRepository를 가짜로 바꾸고 돌려줄 값을 정한다
abstract class MvcRepo extends MvcBase {
    @MockitoBean OrderRepository orderRepository;
    void stub() { when(orderRepository.findName(1L)).thenReturn("키보드"); }
}
// 두 번째 클래스에 "@MockitoBean이 하나 더 있다"일 때 쓰는 본문: 첫 번째 클래스가 바꾸지 않은 것 하나(OrderRepository, 이미 바꿨으면 OrderService)를 더 바꾼다
abstract class MvcNonePlus extends MvcBase {
    @MockitoBean OrderRepository orderRepository;
    void stub() { when(orderRepository.findName(1L)).thenReturn("키보드"); }
}
abstract class MvcSvcPlus extends MvcBase {
    @MockitoBean OrderService orderService;
    @MockitoBean OrderRepository orderRepository;
    void stub() { when(orderService.findName(1L)).thenReturn("키보드"); }
}
abstract class MvcBarePlus extends MvcBase {
    @MockitoBean OrderService orderService;
    @MockitoBean OrderRepository orderRepository;
}
abstract class MvcRepoPlus extends MvcBase {
    @MockitoBean OrderRepository orderRepository;
    @MockitoBean OrderService orderService;
    void stub() { when(orderService.findName(1L)).thenReturn("키보드"); }
}

// ---- @SpringBootTest: 전체 컨텍스트 (MockMvc를 쓰려면 @AutoConfigureMockMvc가 필요하다) ----
@SpringBootTest @AutoConfigureMockMvc class BootNoneA extends MvcNone {}
@SpringBootTest @AutoConfigureMockMvc @DirtiesContext class BootNoneADirty extends MvcNone {}
@SpringBootTest @AutoConfigureMockMvc class BootNoneBSame extends MvcNone {}
@SpringBootTest @AutoConfigureMockMvc class BootNoneBMock extends MvcNonePlus {}
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") class BootNoneBProfile extends MvcNone {}
@SpringBootTest @AutoConfigureMockMvc class BootSvcA extends MvcSvc {}
@SpringBootTest @AutoConfigureMockMvc @DirtiesContext class BootSvcADirty extends MvcSvc {}
@SpringBootTest @AutoConfigureMockMvc class BootSvcBSame extends MvcSvc {}
@SpringBootTest @AutoConfigureMockMvc class BootSvcBMock extends MvcSvcPlus {}
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") class BootSvcBProfile extends MvcSvc {}
@SpringBootTest @AutoConfigureMockMvc class BootBareA extends MvcBare {}
@SpringBootTest @AutoConfigureMockMvc @DirtiesContext class BootBareADirty extends MvcBare {}
@SpringBootTest @AutoConfigureMockMvc class BootBareBSame extends MvcBare {}
@SpringBootTest @AutoConfigureMockMvc class BootBareBMock extends MvcBarePlus {}
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") class BootBareBProfile extends MvcBare {}
@SpringBootTest @AutoConfigureMockMvc class BootRepoA extends MvcRepo {}
@SpringBootTest @AutoConfigureMockMvc @DirtiesContext class BootRepoADirty extends MvcRepo {}
@SpringBootTest @AutoConfigureMockMvc class BootRepoBSame extends MvcRepo {}
@SpringBootTest @AutoConfigureMockMvc class BootRepoBMock extends MvcRepoPlus {}
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") class BootRepoBProfile extends MvcRepo {}

// ---- @WebMvcTest: 웹 계층만 ----
@WebMvcTest(OrderController.class) class WebmvcNoneA extends MvcNone {}
@WebMvcTest(OrderController.class) @DirtiesContext class WebmvcNoneADirty extends MvcNone {}
@WebMvcTest(OrderController.class) class WebmvcNoneBSame extends MvcNone {}
@WebMvcTest(OrderController.class) class WebmvcNoneBMock extends MvcNonePlus {}
@WebMvcTest(OrderController.class) @ActiveProfiles("test") class WebmvcNoneBProfile extends MvcNone {}
@WebMvcTest(OrderController.class) class WebmvcSvcA extends MvcSvc {}
@WebMvcTest(OrderController.class) @DirtiesContext class WebmvcSvcADirty extends MvcSvc {}
@WebMvcTest(OrderController.class) class WebmvcSvcBSame extends MvcSvc {}
@WebMvcTest(OrderController.class) class WebmvcSvcBMock extends MvcSvcPlus {}
@WebMvcTest(OrderController.class) @ActiveProfiles("test") class WebmvcSvcBProfile extends MvcSvc {}
@WebMvcTest(OrderController.class) class WebmvcBareA extends MvcBare {}
@WebMvcTest(OrderController.class) @DirtiesContext class WebmvcBareADirty extends MvcBare {}
@WebMvcTest(OrderController.class) class WebmvcBareBSame extends MvcBare {}
@WebMvcTest(OrderController.class) class WebmvcBareBMock extends MvcBarePlus {}
@WebMvcTest(OrderController.class) @ActiveProfiles("test") class WebmvcBareBProfile extends MvcBare {}
@WebMvcTest(OrderController.class) class WebmvcRepoA extends MvcRepo {}
@WebMvcTest(OrderController.class) @DirtiesContext class WebmvcRepoADirty extends MvcRepo {}
@WebMvcTest(OrderController.class) class WebmvcRepoBSame extends MvcRepo {}
@WebMvcTest(OrderController.class) class WebmvcRepoBMock extends MvcRepoPlus {}
@WebMvcTest(OrderController.class) @ActiveProfiles("test") class WebmvcRepoBProfile extends MvcRepo {}
