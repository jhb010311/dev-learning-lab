Lab.register({
  id: 'annot_basic', nav: '애너테이션', cat: '기초개념', mode: 'step', basic: true, deep: ['annot'],
  title: '애너테이션은 무엇이고, 붙이면 누가 무슨 일을 하는가',
  why: '애너테이션이 없던 때는 "이 메서드는 테스트다", "이 클래스의 객체는 스프링이 만든다" 같은 정보를 test로 시작하는 메서드 이름 같은 규칙이나 코드와 떨어진 XML 설정 파일로 알려야 해서, 코드를 고치면 설정 파일도 따로 맞춰야 했다. 애너테이션은 그런 표시를 해당 코드 바로 위에 @로 적게 해서, 코드와 표시가 한자리에서 보이고 같이 고쳐지게 한다.',
  use: '@Override는 부모의 메서드를 제대로 다시 적었는지 컴파일러가 확인하게 한다. 스프링의 @Service, @Repository, @Controller, @Component는 그 클래스의 객체를 스프링이 만들어 빈으로 등록하게 하고, @GetMapping, @Transactional도 스프링이 읽어서 일한다. JUnit의 @Test는 그 메서드를 테스트로 실행하게 한다. 애너테이션을 직접 만드는 일은 드물고, 대개 자바와 프레임워크가 만들어 둔 것을 붙여 쓴다.',
  intro: '애너테이션은 @Service, @Override, @Test처럼 @로 시작해 클래스나 메서드 위에 붙이는 꼬리표입니다. 꼬리표 자체에는 실행되는 코드가 없고, 뜻은 그것을 읽는 쪽이 정합니다. @Override는 컴파일러가, @Service는 스프링이(컴포넌트 스캔으로 찾은 클래스의 객체를 만들어 빈으로 등록), @Test는 JUnit이 읽어서 일합니다. 이 실습은 세 애너테이션을 붙였다 뗐다 하고, 읽는 쪽(스프링, JUnit)을 거치거나 거치지 않으면서 같은 코드를 컴파일하고 실행해 무엇이 달라지는지 봅니다. 이어서 @Service와 @Override의 실제 선언에서 @Retention이 꼬리표를 어디까지 남기는지 보고, 마지막으로 애너테이션과 그것을 읽는 코드를 직접 만들어 봅니다. 코드에 나오는 OrderService, Order, OrderTest, Job은 이 실습에서 예시로 만든 클래스입니다.',
  terms: ['애너테이션', '@Override', '@Service와 @Repository', '컴포넌트 스캔', '@Test', '@Retention과 @Target', '메타 애너테이션', '@interface'],
  controls: [
    { id: 'who', label: '살펴볼 애너테이션', type: 'select', value: 'service', options: [['service', '@Service (스프링이 주는 것)'], ['override', '@Override (자바가 주는 것)'], ['test', '@Test (JUnit이 주는 것)'], ['decl', '@Service와 @Override의 선언(@Retention)'], ['run', '@Run (직접 만든 것)']] },
    { id: 'put', label: '애너테이션을 붙인다', type: 'check', value: true, show: function (c) { return c.who !== 'decl'; } },
    { id: 'spring', label: '스프링을 시작해 getBean으로 받는다 (끄면 new로 직접 만든다)', type: 'check', value: true, show: function (c) { return c.who === 'service'; } },
    { id: 'typo', label: '메서드 이름을 tostring으로 잘못 적는다', type: 'check', value: false, show: function (c) { return c.who === 'override'; } },
    { id: 'junit', label: 'JUnit으로 실행한다 (끄면 main에서 직접 부른다)', type: 'check', value: true, show: function (c) { return c.who === 'test'; } },
    { id: 'reader', label: '@Run이 붙은 메서드를 찾아 부르는 for 문을 쓴다', type: 'check', value: true, show: function (c) { return c.who === 'run'; } },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '애너테이션은 어떻게 생겼고, @Service를 붙이면 누가 무슨 일을 하나', d: '스프링이 @Service를 읽고 OrderService의 객체를 만들어 빈으로 등록합니다. 그래서 getBean으로 받아 쓸 수 있습니다.', v: { who: 'service', put: true, spring: true } },
    { t: '@Service를 떼면', q: 'OrderService 위의 @Service를 떼면', d: '스프링이 OrderService를 빈으로 만들지 않아, getBean이 NoSuchBeanDefinitionException으로 멈춥니다.', v: { who: 'service', put: false, spring: true } },
    { t: '스프링 없이 new로 만들면', q: '@Service는 붙인 채로, 스프링을 시작하지 않고 new OrderService()로 만들면', d: '읽는 쪽인 스프링이 없으니 @Service는 아무 일도 하지 않습니다.', v: { who: 'service', put: true, spring: false } },
    { t: '@Override를 붙이고 이름을 잘못 적으면', q: '@Override를 붙인 toString()을 tostring()으로 잘못 적으면', d: '@Override를 읽는 컴파일러가 재정의가 아니라는 오류를 내고 컴파일을 멈춥니다.', v: { who: 'override', put: true, typo: true } },
    { t: '@Test를 붙이고 JUnit으로 실행하면', q: '@Test가 붙은 total()을 JUnit으로 실행하면', d: 'JUnit이 @Test를 읽고 total()을 테스트로 찾아 부릅니다.', v: { who: 'test', put: true, junit: true } },
    { t: '@Retention: 꼬리표는 어디까지 남나', q: '@Service와 @Override는 어떻게 선언되어 있고, 컴파일한 뒤에도 남나', d: '@Service는 @Retention(RUNTIME)이라 class 파일에 남고, @Override는 @Retention(SOURCE)라 컴파일이 끝나면 버려집니다.', v: { who: 'decl' } },
    { t: '직접 만든 @Run', q: '애너테이션을 직접 만들고, 읽는 코드도 직접 쓰면', d: '@interface로 만든 @Run에는 정해진 뜻이 없어서, 읽고 일하는 코드도 우리가 써야 합니다.', v: { who: 'run', put: true, reader: true } },
  ],
  code: function (c) {
    var o;
    if (c.who === 'service') {
      o = ['// 파일: app/OrderService.java', 'package app;', ''];
      if (c.put) o.push('import org.springframework.stereotype.Service;', '', '// OrderService는 예시로 만든 클래스, @Service는 스프링이 주는 애너테이션', '@Service');
      else o.push('// OrderService는 예시로 만든 클래스');
      o.push('public class OrderService {', '    public String name() {', '        return "주문 서비스";', '    }', '}', '', '// 파일: app/Main.java', 'package app;', '');
      if (c.spring) o.push('import org.springframework.context.ApplicationContext;', 'import org.springframework.context.annotation.AnnotationConfigApplicationContext;', '');
      o.push('public class Main {', '    public static void main(String[] args) {');
      if (c.spring) o.push('        // 스프링을 시작한다. app 패키지의 클래스를 훑는다(컴포넌트 스캔)', '        ApplicationContext context =', '                new AnnotationConfigApplicationContext("app");', '        // 스프링이 만들어 둔 OrderService 객체를 달라고 한다', '        OrderService service = context.getBean(OrderService.class);');
      else o.push('        // 스프링을 시작하지 않고, 우리 코드가 new로 직접 만든다', '        OrderService service = new OrderService();');
      o.push('        System.out.println(service.name());', '    }', '}');
    } else if (c.who === 'override') {
      o = ['// Order는 예시로 만든 클래스.', '// 자바의 모든 클래스는 자바가 주는 Object를 물려받고, Object에는 toString()이 있다', 'class Order {'];
      if (c.put) o.push('    @Override');
      o.push('    public String ' + (c.typo ? 'tostring' : 'toString') + '() {', '        return "주문 1번";', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) {', '        // println은 객체의 toString()이 돌려준 글을 출력한다', '        System.out.println(new Order());', '    }', '}');
    } else if (c.who === 'test') {
      o = ['import org.junit.jupiter.api.Test;', '', 'import static org.junit.jupiter.api.Assertions.assertEquals;', '', '// OrderTest는 예시로 만든 테스트 클래스, @Test와 assertEquals는 JUnit이 주는 것', 'class OrderTest {'];
      if (c.put) o.push('    @Test');
      o.push('    void total() {', '        System.out.println("total 실행");', '        assertEquals(3000, 1000 + 2000);', '    }', '}');
      if (c.junit) o.push('', '// 실행은 JUnit이 한다(./gradlew test 명령이나 IDE의 테스트 실행 단추)');
      else o.push('', '// JUnit 없이 java Main으로 실행한다', 'public class Main {', '    public static void main(String[] args) {', '        new OrderTest().total();', '    }', '}');
    } else if (c.who === 'decl') {
      o = ['// 파일: app/OrderService.java', 'package app;', '', 'import org.springframework.stereotype.Service;', '',
        '// 스프링이 주는 @Service의 선언(spring-context의 Service.java, 요소 value는 생략)',
        '//     @Target(ElementType.TYPE)', '//     @Retention(RetentionPolicy.RUNTIME)', '//     @Documented', '//     @Component', '//     public @interface Service { … }',
        '@Service', 'public class OrderService {',
        '    // 자바가 주는 @Override의 선언(java.lang.Override)', '    //     @Target(ElementType.METHOD)', '    //     @Retention(RetentionPolicy.SOURCE)', '    //     public @interface Override { }',
        '    @Override', '    public String toString() {', '        return "주문 서비스";', '    }', '}', '',
        '// 컴파일한 뒤 JDK의 javap로 class 파일을 본다', '//     javap -v app/OrderService.class'];
    } else {
      o = ['import java.lang.annotation.ElementType;', 'import java.lang.annotation.Retention;', 'import java.lang.annotation.RetentionPolicy;', 'import java.lang.annotation.Target;'];
      if (c.reader) o.push('import java.lang.reflect.Method;');
      o.push('', '// 직접 만든 애너테이션 Run. 선언하는 모양은 @Service, @Test와 같다', '@Target(ElementType.METHOD)', '@Retention(RetentionPolicy.RUNTIME)', '@interface Run {', '}', '', '// Job은 예시로 만든 클래스', 'class Job {');
      if (c.put) o.push('    @Run');
      o.push('    public void work() {', '        System.out.println("work 실행");', '    }', '', '    public void rest() {', '        System.out.println("rest 실행");', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) throws Exception {', '        Job job = new Job();');
      if (c.reader) o.push('        // 읽는 쪽: Job의 메서드 가운데 @Run이 붙은 것만 부른다(리플렉션)', '        for (Method m : Job.class.getDeclaredMethods()) {', '            if (m.isAnnotationPresent(Run.class)) {', '                m.invoke(job);', '            }', '        }');
      o.push('    }', '}');
    }
    return o.join('\n');
  },
  label: function (c) {
    var on = c.put ? '붙임' : '뗌';
    if (c.who === 'service') return '@Service ' + on + ' · ' + (c.spring ? '스프링 시작, getBean' : '스프링 없이 new');
    if (c.who === 'override') return '@Override ' + on + ' · ' + (c.typo ? '이름 tostring' : '이름 toString');
    if (c.who === 'test') return '@Test ' + on + ' · ' + (c.junit ? 'JUnit으로 실행' : 'main에서 직접 호출');
    if (c.who === 'decl') return '@Service와 @Override의 선언';
    return '직접 만든 @Run ' + on + ' · ' + (c.reader ? '읽는 for 문 있음' : '읽는 코드 없음');
  },
  columns: ['읽는 쪽', '실행 결과', '애너테이션 때문에 일어난 일'],
  simulate: function (c) {
    var ev = [], sum = [], row, w = c.who, put = !!c.put;
    var NAMES = { service: '@Service', override: '@Override', test: '@Test', decl: '@Service와 @Override', run: '@Run' };
    var READER = { service: '스프링(컴포넌트 스캔)', override: '컴파일러(javac)', test: 'JUnit', decl: '컴파일러(javac)', run: '우리가 쓴 for 문' };
    var hasReader = w === 'service' ? !!c.spring : w === 'test' ? !!c.junit : w === 'run' ? !!c.reader : true;
    var st = { hot: '', compile: '', read: '', out: [], exc: '', bean: '', file: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    if (w === 'service') {
      st.hot = 'code';
      push(put ? 'OrderService는 이 실습에서 예시로 만든 클래스이고, 그 위의 @Service는 스프링이 주는 애너테이션입니다. 애너테이션은 @로 시작해 클래스나 메서드 위에 붙이는 꼬리표입니다. @Service라고 적는 것만으로는 객체가 만들어지지도, 메서드가 실행되지도 않습니다.'
        : 'OrderService는 이 실습에서 예시로 만든 클래스입니다. 이번에는 클래스 위에 @Service가 없습니다. 코드에서 달라진 것은 이 줄뿐이고, name 메서드는 그대로입니다.', '');
      st.hot = ''; st.compile = 'ok';
      push(put ? 'javac가 두 파일을 컴파일합니다. 컴파일러는 @Service가 클래스에 붙일 수 있는 애너테이션인지만 확인하고 class 파일에 기록해 둡니다. @Service는 스프링이 @Retention(RetentionPolicy.RUNTIME)으로 선언해 두어서, 프로그램이 실행되는 동안에도 읽을 수 있는 꼬리표로 남습니다.'
        : 'javac가 두 파일을 컴파일합니다. @Service가 없어도 OrderService는 평범한 자바 클래스여서 컴파일은 문제없이 성공합니다.', '');
      if (c.spring) {
        st.hot = 'reader';
        push('main의 new AnnotationConfigApplicationContext("app")가 스프링을 시작합니다. 스프링은 app 패키지의 클래스를 훑으며 꼬리표를 읽습니다. 이것을 컴포넌트 스캔이라고 합니다. 스프링이 찾는 것은 @Component, 그리고 @Service처럼 선언에 @Component가 붙어 있는 애너테이션입니다.', '');
        if (put) {
          st.read = 'yes'; st.bean = 'orderService'; st.hot = 'code';
          push('OrderService에 @Service가 붙어 있습니다. 스프링이 OrderService의 객체를 하나 만들어 빈(스프링이 만들어 관리하는 객체)으로 등록합니다. 빈의 이름은 클래스 이름의 첫 글자를 소문자로 바꾼 orderService입니다. 객체를 만든 것은 우리 코드의 new가 아니라 스프링입니다.', 'good');
          st.hot = 'result'; st.out.push('주문 서비스');
          push('context.getBean(OrderService.class)가 스프링에게 OrderService 빈을 달라고 합니다. 스프링이 만들어 둔 객체를 돌려주고, service.name()이 돌려준 "주문 서비스"가 출력됩니다.', 'good');
        } else {
          st.read = 'no'; st.hot = 'code';
          push('OrderService에는 꼬리표가 없습니다. 스프링은 이 클래스를 빈으로 삼을 근거가 없으므로 객체를 만들지 않고 지나갑니다. 등록된 빈 가운데 OrderService는 없습니다.', 'bad');
          st.hot = 'result'; st.exc = 'NoSuchBeanDefinitionException';
          push('context.getBean(OrderService.class)가 OrderService 빈을 달라고 하지만 등록된 것이 없습니다. 스프링이 그런 빈이 없다는 뜻의 NoSuchBeanDefinitionException을 던지고, 메시지는 No qualifying bean of type \'app.OrderService\' available입니다. 이 예외를 처리하는 코드가 없어 프로그램이 이 줄에서 멈추고, 아무것도 출력되지 않습니다.', 'bad');
        }
      } else {
        st.read = 'none'; st.hot = 'reader';
        push('main은 스프링을 시작하지 않고, new OrderService()로 우리 코드가 직접 객체를 만듭니다. 이 프로그램에는 꼬리표를 읽는 쪽이 없습니다. ' + (put ? 'OrderService에 @Service가 붙어 있지만, 읽어 줄 스프링이 실행되지 않았으므로 @Service는 아무 일도 하지 않습니다.' : '@Service도 없으니 평범한 자바 프로그램입니다.'), '');
        st.hot = 'result'; st.out.push('주문 서비스');
        push('service.name()이 돌려준 "주문 서비스"가 출력됩니다. 이 객체는 스프링이 관리하는 빈이 아니라, 우리 코드가 new로 만든 평범한 객체입니다.', 'good');
      }
      if (put && c.spring) {
        row = [READER.service, '"주문 서비스" 출력', 'OrderService 객체가 빈으로 등록됨'];
        sum.push('애너테이션은 코드에 붙이는 꼬리표이고, 그 뜻은 읽는 쪽이 정합니다. @Service를 읽은 것은 스프링의 컴포넌트 스캔이었고, 스프링이 OrderService의 객체를 만들어 빈으로 등록했기 때문에 getBean이 그 객체를 받아 올 수 있었습니다.');
        sum.push('@Repository와 @Controller도 선언에 @Component가 붙어 있어서 같은 방식으로 빈이 됩니다. @Override는 컴파일러가, @Test는 JUnit이 읽는다는 것은 다음 물음들에서 봅니다.');
      } else if (c.spring) {
        row = [READER.service, 'NoSuchBeanDefinitionException으로 멈춤', '없음'];
        sum.push('@Service를 떼자 스프링이 OrderService를 빈으로 만들지 않았고, getBean이 NoSuchBeanDefinitionException으로 멈췄습니다. 코드에서 바뀐 것은 꼬리표 한 줄뿐이지만, 그것을 읽는 스프링에게는 빈으로 만들지 말지를 가르는 차이입니다.');
        sum.push('스프링은 꼬리표가 없는 클래스를 컴포넌트 스캔으로 빈으로 만들지 않습니다. 같은 패키지에 있어도 마찬가지입니다.');
      } else if (put) {
        row = ['없음(스프링을 시작하지 않음)', '"주문 서비스" 출력', '없음'];
        sum.push('스프링을 시작하지 않고 new로 만들면, @Service가 붙어 있어도 아무 일도 일어나지 않았습니다. 꼬리표를 읽는 쪽이 없기 때문입니다.');
        sum.push('@Service의 뜻은 스프링이 읽을 때만 생깁니다. 꼬리표 자체에는 실행되는 코드가 없습니다.');
      } else {
        row = ['없음(스프링을 시작하지 않음)', '"주문 서비스" 출력', '없음'];
        sum.push('@Service도 스프링도 없는 평범한 자바 프로그램입니다. new로 만든 객체의 name()이 불려 "주문 서비스"가 출력되었습니다.');
        sum.push('@Service를 붙이고 new로 만든 경우와 출력이 같습니다. 읽는 쪽이 없으면 꼬리표가 있든 없든 결과가 같습니다.');
      }
    } else if (w === 'override') {
      st.hot = 'code';
      push('Order는 이 실습에서 예시로 만든 클래스입니다. 자바의 모든 클래스는 자바가 주는 Object 클래스를 물려받고, Object에는 객체를 글로 바꿔 돌려주는 toString() 메서드가 있습니다. Order는 이 메서드를 ' + (c.typo ? '다시 적으려다 이름을 tostring()으로 잘못 적었습니다(대문자 S를 소문자 s로 적음).' : '다시 적어(재정의) "주문 1번"을 돌려주게 했습니다.') + (put ? ' 그 위에 자바가 주는 @Override를 붙였습니다.' : ' @Override는 붙이지 않았습니다.'), '');
      st.hot = 'reader';
      if (put && c.typo) {
        st.read = 'yes'; st.compile = 'err'; st.exc = '컴파일 오류';
        push('javac가 컴파일하면서 @Override를 읽고, 부모 쪽에 tostring()이 있는지 확인합니다. Object에 있는 것은 toString()이고 tostring()은 없습니다. 컴파일러가 "method does not override or implement a method from a supertype"(상위 타입의 메서드를 재정의하지 않는다) 오류를 내고 컴파일을 멈춥니다.', 'bad');
        st.hot = 'result';
        push('컴파일에 실패해 class 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없습니다. 이름을 잘못 적은 실수가 실행해 보기도 전에 드러났습니다.', 'bad');
      } else {
        st.compile = 'ok'; st.read = put ? 'yes' : 'no';
        push(put ? 'javac가 컴파일하면서 @Override를 읽습니다. @Override는 "이 메서드는 부모의 메서드를 다시 적은 것"이라는 꼬리표이고, 컴파일러는 Object에 같은 이름과 매개변수의 toString()이 있는지 확인합니다. 있으므로 통과하고 컴파일이 성공합니다. @Override는 @Retention(RetentionPolicy.SOURCE)로 선언되어 있어서, 확인이 끝나면 class 파일에 남지 않습니다.'
          : c.typo ? 'javac가 컴파일합니다. @Override가 없으므로 컴파일러는 재정의인지 확인하지 않고, tostring()을 Order에 새로 생긴 별개의 메서드로 보고 넘어갑니다. 오류 없이 컴파일이 성공합니다.'
          : 'javac가 컴파일합니다. @Override가 없으므로 컴파일러는 재정의가 맞는지 따로 확인하지 않습니다. 이름과 매개변수가 맞게 적혀 있어서 toString()은 그대로 재정의되고, 컴파일이 성공합니다.', put ? 'good' : '');
        st.hot = 'result'; st.out.push(c.typo ? 'Order@…' : '주문 1번');
        push('java Main으로 실행합니다. System.out.println(new Order())는 Order 객체의 toString()이 돌려준 글을 출력합니다. ' + (c.typo ? 'Order에는 toString()이 다시 적혀 있지 않으므로 Object의 toString()이 불려, Order@ 뒤에 16진수 해시 값이 붙은 글(예: Order@1b6d3586, 숫자는 실행할 때마다 다를 수 있음)이 출력됩니다. 실수가 있는데도 아무 오류 없이 엉뚱한 결과가 나왔습니다.' : 'Order가 다시 적은 toString()이 불려 "주문 1번"이 출력됩니다.'), c.typo ? 'bad' : 'good');
      }
      if (put && c.typo) {
        row = [READER.override, '컴파일 오류(재정의가 아님)', '컴파일러가 실수를 찾아 컴파일을 멈춤'];
        sum.push('@Override를 읽는 쪽은 컴파일러입니다. 이름을 잘못 적자 컴파일러가 재정의가 아니라는 오류로 실수를 바로 알려 주었습니다.');
        sum.push('@Override를 떼고 같은 실수를 하면 오류 없이 컴파일되고 Object의 toString()이 실행됩니다. 이 꼬리표가 컴파일러에게 하는 말은 "재정의가 맞는지 확인해 달라"입니다.');
      } else if (put) {
        row = [READER.override, '"주문 1번" 출력', '컴파일러가 재정의인지 확인함(맞음)'];
        sum.push('@Override를 읽은 것은 컴파일러였고, 재정의가 맞는지 확인한 뒤 통과시켰습니다. 실행 결과는 @Override가 없을 때와 같습니다.');
        sum.push('@Override는 실행할 때 하는 일이 없고, 컴파일할 때 실수를 잡는 데만 쓰입니다. 그래서 class 파일에도 남기지 않도록 선언되어 있습니다.');
      } else if (c.typo) {
        row = [READER.override, '"Order@…" 출력(Object의 toString)', '없음(컴파일러가 확인하지 않음)'];
        sum.push('@Override가 없으니 컴파일러가 확인하지 않았고, 잘못 적은 tostring()은 새 메서드가 되었습니다. 출력은 Object의 toString()이 만든 Order@…였습니다.');
        sum.push('오류가 나지 않아 실수를 알아채기 어렵습니다. @Override를 붙이면 같은 실수가 컴파일 오류로 드러납니다.');
      } else {
        row = [READER.override, '"주문 1번" 출력', '없음(컴파일러가 확인하지 않음)'];
        sum.push('@Override 없이도 이름과 매개변수가 맞으면 재정의가 됩니다. 컴파일러는 확인 없이 통과시켰고, "주문 1번"이 출력되었습니다.');
        sum.push('@Override를 붙여도 실행 결과는 같습니다. 차이는 이름을 잘못 적었을 때 드러납니다.');
      }
    } else if (w === 'test') {
      st.hot = 'code';
      push('OrderTest는 이 실습에서 예시로 만든 테스트 클래스입니다. total() 메서드는 "total 실행"을 출력하고, JUnit이 주는 assertEquals로 1000 + 2000이 3000인지 확인합니다. ' + (put ? 'total() 위의 @Test는 JUnit이 주는 애너테이션입니다.' : '이번에는 total() 위에 @Test가 없습니다.'), '');
      st.hot = ''; st.compile = 'ok';
      push('javac가 컴파일하고, 컴파일은 성공합니다.' + (put ? ' @Test는 JUnit이 @Retention(RetentionPolicy.RUNTIME)으로 선언해 두어서 class 파일에 남고, 실행 중에 JUnit이 읽을 수 있습니다.' : ''), '');
      if (c.junit) {
        st.hot = 'reader';
        push('JUnit이 OrderTest 클래스를 받아 실행합니다. ./gradlew test 명령이나 IDE의 테스트 실행 단추가 하는 일이 이것입니다. JUnit은 클래스의 메서드를 훑어 @Test가 붙은 것을 테스트로 셉니다. ' + (put ? 'total()에 @Test가 있어 테스트 1개를 찾습니다.' : '@Test가 붙은 메서드가 없으므로 찾은 테스트는 0개입니다.'), '');
        st.hot = 'result';
        if (put) {
          st.read = 'yes'; st.out.push('total 실행');
          push('JUnit이 OrderTest 객체를 만들고 total()을 부릅니다. "total 실행"이 출력되고 assertEquals의 두 값이 같으므로, JUnit이 이 테스트를 통과로 셉니다. total()을 부른 것은 우리 코드가 아니라 JUnit입니다.', 'good');
        } else {
          st.read = 'no';
          push('JUnit은 total()을 부르지 않습니다. "total 실행"도 출력되지 않고, 통과도 실패도 없이 끝납니다. 메서드는 그대로 있는데, 꼬리표가 없어 JUnit이 테스트로 보지 않았습니다.', 'bad');
        }
      } else {
        st.read = 'none'; st.hot = 'reader';
        push('JUnit 없이 java Main으로 실행합니다. main이 new OrderTest().total()로 total()을 직접 부릅니다. ' + (put ? 'total()에 @Test가 붙어 있지만, 이 프로그램에는 @Test를 읽는 쪽이 없으므로 아무 일도 하지 않습니다.' : '@Test도 JUnit도 없는 평범한 메서드 호출입니다.'), '');
        st.hot = 'result'; st.out.push('total 실행');
        push('"total 실행"이 출력되고, assertEquals의 두 값이 같으므로 예외 없이 끝납니다. 통과나 실패를 세는 쪽이 없으니, 테스트로 실행된 것이 아니라 평범한 메서드 호출입니다.', 'good');
      }
      if (put && c.junit) {
        row = ['JUnit', '테스트 1개 실행, 통과', 'JUnit이 total()을 테스트로 찾아 부름'];
        sum.push('@Test를 읽은 것은 JUnit이었습니다. JUnit이 @Test가 붙은 total()을 찾아 부르고, 통과로 셌습니다.');
        sum.push('테스트 메서드를 부르는 것은 우리 코드가 아니라 JUnit입니다. 통과와 실패를 어떻게 가르는지는 "테스트 코드" 기초 실습에서 봅니다.');
      } else if (c.junit) {
        row = ['JUnit', '찾은 테스트 0개, 실행 안 됨', '없음'];
        sum.push('@Test를 떼자 JUnit이 찾은 테스트가 0개가 되었고, total()은 한 번도 불리지 않았습니다.');
        sum.push('JUnit은 메서드 이름이 아니라 @Test 꼬리표를 보고 테스트를 고릅니다.');
      } else if (put) {
        row = ['없음(main에서 직접 부름)', '"total 실행" 출력', '없음'];
        sum.push('main에서 직접 부르면 @Test가 붙어 있어도 평범한 메서드 호출입니다. @Test를 읽는 JUnit이 없으니 꼬리표는 아무 일도 하지 않았습니다.');
        sum.push('같은 꼬리표라도 읽는 쪽이 없으면 뜻이 생기지 않습니다. @Service를 붙이고 new로 만든 경우와 같습니다.');
      } else {
        row = ['없음(main에서 직접 부름)', '"total 실행" 출력', '없음'];
        sum.push('@Test도 JUnit도 없이 main에서 total()을 직접 불렀습니다. 출력은 @Test를 붙였을 때와 같습니다.');
        sum.push('읽는 쪽이 없으면 꼬리표가 있든 없든 결과가 같습니다.');
      }
    } else if (w === 'decl') {
      st.hot = 'code';
      push('OrderService(예시로 만든 클래스)에는 스프링이 주는 @Service를, 그 toString() 위에는 자바가 주는 @Override를 붙였습니다. 주석에 옮겨 적은 것이 두 애너테이션의 실제 선언입니다. 애너테이션은 @interface로 선언하고, 선언 위에 붙은 @Target과 @Retention이 그 애너테이션의 성질을 정합니다.', '');
      st.hot = 'decl';
      push('@Target은 붙일 수 있는 곳입니다. @Service는 ElementType.TYPE(클래스 같은 타입 선언), @Override는 ElementType.METHOD(메서드)입니다. 맞지 않는 곳, 예를 들어 메서드 위에 @Service를 붙이면 컴파일러가 오류를 냅니다.', '');
      push('@Retention은 꼬리표를 어디까지 남길지입니다. @Override는 RetentionPolicy.SOURCE여서 컴파일러가 읽고 확인한 뒤 버립니다. @Service는 RetentionPolicy.RUNTIME이어서 class 파일에 기록되고, 프로그램이 실행되는 동안에도 읽을 수 있습니다. 실행 중에 꼬리표를 읽는 스프링과 JUnit을 위한 애너테이션은 RUNTIME으로 선언되어 있고, @Test도 그렇습니다. @Retention을 적지 않으면 CLASS가 되어 class 파일에는 남지만 실행 중에는 읽을 수 없습니다.', '');
      st.compile = 'ok'; st.file = 'done'; st.hot = 'file';
      push('javac로 컴파일한 뒤 JDK의 javap -v로 OrderService.class를 봅니다. 실행 중에 읽을 수 있는 애너테이션 목록(RuntimeVisibleAnnotations)에 org.springframework.stereotype.Service가 적혀 있고, Override는 class 파일 어디에도 없습니다. 컴파일러가 각 선언의 @Retention을 보고 남길 것과 버릴 것을 정한 결과입니다.', 'good');
      st.hot = 'decl';
      push('@Service의 선언에는 @Component도 붙어 있습니다. 이렇게 애너테이션의 선언에 붙은 애너테이션을 메타 애너테이션이라고 합니다. 스프링의 컴포넌트 스캔은 @Component뿐 아니라 선언에 @Component가 붙은 @Service, @Repository, @Controller도 찾기 때문에, 이것들을 붙인 클래스가 모두 빈이 됩니다.', '');
      row = ['컴파일러(javac)가 @Retention을 봄', 'class 파일에 @Service만 남음(javap)', '@Override는 SOURCE라 버려짐'];
      sum.push('애너테이션의 선언에 붙은 @Retention이 꼬리표를 어디까지 남길지 정합니다. 컴파일러만 읽는 @Override는 SOURCE라 class 파일에 남지 않았고, 실행 중에 스프링이 읽는 @Service는 RUNTIME이라 class 파일에 남았습니다.');
      sum.push('@Service가 붙은 클래스가 빈이 되는 근거는 @Service의 선언에 붙은 @Component입니다. 애너테이션이 스스로 일하는 것이 아니라, 스프링이 이 선언까지 따라가 읽고 일합니다.');
    } else {
      st.hot = 'code';
      push('Run은 이 실습에서 @interface로 직접 만든 애너테이션이고, Job도 예시로 만든 클래스입니다. 선언하는 모양은 @Service, @Test와 같습니다. @Target(ElementType.METHOD)로 메서드에 붙이게 했고, 실행 중에 읽을 것이므로 @Retention(RetentionPolicy.RUNTIME)을 적었습니다. ' + (put ? 'work() 위에 @Run을 붙였습니다.' : '이번에는 어느 메서드에도 @Run을 붙이지 않았습니다.'), '');
      st.hot = ''; st.compile = 'ok';
      push('컴파일이 성공합니다. 직접 만든 애너테이션에는 정해진 뜻이 없습니다. 스프링도 JUnit도 @Run을 모르므로, 읽고 일하는 쪽도 우리가 써야 합니다.', '');
      st.hot = 'reader';
      if (c.reader) {
        st.read = put ? 'yes' : 'no';
        push('main의 for 문이 리플렉션(실행 중에 클래스와 메서드를 조사하는 자바 기능)으로 Job의 메서드를 하나씩 꺼내, m.isAnnotationPresent(Run.class)로 @Run이 붙었는지 묻습니다. ' + (put ? 'work()는 true, rest()는 false입니다.' : '두 메서드 모두 false입니다.'), '');
        st.hot = 'result';
        if (put) {
          st.out.push('work 실행');
          push('true인 work()만 m.invoke(job)으로 부릅니다. "work 실행"이 출력됩니다. 스프링과 JUnit도 이렇게 꼬리표를 읽고 일하는 코드를 미리 만들어 둔 것이고, 우리는 꼬리표만 붙여 씁니다.', 'good');
        } else {
          push('부를 메서드가 없어 아무것도 출력되지 않고 main이 끝납니다.', '');
        }
      } else {
        st.read = 'none';
        push('main에는 Job 객체를 만드는 줄뿐이고 @Run을 읽는 코드가 없습니다. ' + (put ? 'work()에 @Run이 붙어 있어도 아무것도 불리지 않고 출력도 없습니다.' : '@Run도 읽는 코드도 없으니 평범한 코드이고, 아무것도 출력되지 않습니다.'), '');
      }
      if (put && c.reader) {
        row = [READER.run, '"work 실행" 출력', 'for 문이 work()를 찾아 부름'];
        sum.push('애너테이션은 @interface로 직접 만들 수도 있습니다. 다만 뜻을 정하는 읽는 쪽도 직접 써야 하고, 여기서는 리플렉션을 쓴 for 문이 그 일을 했습니다.');
        sum.push('실무에서는 직접 만드는 일보다 자바, 스프링, JUnit이 주는 애너테이션을 붙여 쓰는 일이 훨씬 많습니다. 직접 만든 애너테이션은 스프링 AOP처럼 꼬리표가 붙은 메서드를 골라 주는 기능과 함께 쓰기도 합니다.');
      } else if (c.reader) {
        row = [READER.run, '아무것도 출력되지 않음', '없음'];
        sum.push('@Run을 붙인 메서드가 없어서 for 문이 아무것도 부르지 않았습니다.');
        sum.push('읽는 쪽이 있어도 꼬리표가 없으면 할 일이 없습니다.');
      } else if (put) {
        row = ['없음', '아무것도 출력되지 않음', '없음'];
        sum.push('@Run을 붙였지만 읽는 코드가 없어 아무 일도 일어나지 않았습니다.');
        sum.push('직접 만든 애너테이션은 읽는 쪽이 없으면 뜻이 없습니다. 스프링 없이 new로 만든 OrderService의 @Service와 같습니다.');
      } else {
        row = ['없음', '아무것도 출력되지 않음', '없음'];
        sum.push('@Run도 읽는 코드도 없어 아무것도 실행되지 않았습니다.');
        sum.push('Job 객체를 만들었을 뿐 메서드를 부르는 줄이 없으니, 출력이 없습니다.');
      }
    }
    return { events: ev, summary: sum, row: row, hasReader: hasReader, name: NAMES[w], readerName: READER[w] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, w = c.who;
    if (!s) { H.text(v, '실행을 누르면 코드를 읽는 것부터 시작합니다.'); return; }
    if (w === 'decl') {
      H.table(v, ['애너테이션', '주는 쪽', '@Target', '@Retention', 'class 파일에'], [
        { cls: '', cells: ['@Service', '스프링', 'TYPE', 'RUNTIME', { v: s.file ? '남음' : '', cls: s.file ? 'good' : '' }] },
        { cls: '', cells: ['@Override', '자바', 'METHOD', 'SOURCE', { v: s.file ? '없음' : '', cls: s.file ? 'bad' : '' }] },
      ], '두 애너테이션의 선언');
      return;
    }
    var readTxt = { yes: '읽고 일함', no: '꼬리표가 없어 할 일 없음', none: '읽는 쪽이 없음', '': '' };
    H.table(v, ['애너테이션', '코드에', '읽는 쪽', '이번 실행에서'], [{ cls: '', cells: [sim.name, c.put ? '붙어 있음' : '없음', sim.hasReader ? sim.readerName : '없음', { v: readTxt[s.read], cls: s.read === 'yes' ? 'good' : s.read ? 'bad' : '' }] }], '꼬리표와 읽는 쪽');
    var rows = s.out.map(function (o) { return { cls: '', cells: [o] }; });
    if (s.exc) rows.push({ cls: 'bad', cells: [s.exc === '컴파일 오류' ? '컴파일 오류: method does not override or implement a method from a supertype' : s.exc + '으로 멈춤'] });
    H.table(v, ['출력'], rows.length ? rows : [{ cls: 'gone', cells: ['(아직 출력된 것 없음)'] }], '출력');
  },
  // 그림: 왼쪽 위에 꼬리표를 붙인 우리 코드, 오른쪽 위에 그 꼬리표를 읽는 쪽(없으면 점선 상자), 읽는 쪽에서 코드로 "읽음" 화살표, 아래에 실행 결과. 선언을 보는 물음에서는 두 선언과 class 파일에 남은 것을 나란히 둔다.
  draw: function (P, sim, shown) {
    var c = sim.c, w = c.who, last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    P.size(680, 250);
    if (w === 'decl') {
      P.box('ds', 14, 16, 318, 96, { cls: hot === 'decl' ? 'hot now' : 'plain', title: '@Service의 선언 (스프링)', sub: ['@Target(TYPE)', '@Retention(RUNTIME)', '@Component가 붙어 있음'] });
      P.box('do', 348, 16, 318, 96, { cls: hot === 'decl' ? 'hot now' : 'plain', title: '@Override의 선언 (자바)', sub: ['@Target(METHOD)', '@Retention(SOURCE)'] });
      P.box('cf', 14, 140, 652, 90, { cls: s && s.file ? 'good' : hot === 'code' ? 'hot now' : 'ghost', title: 'OrderService.class (javap -v로 본 것)', sub: s && s.file ? ['RuntimeVisibleAnnotations: Service', 'Override: 없음 (컴파일이 끝나면 버려짐)'] : ['아직 컴파일 전'] });
      return;
    }
    var tag = { service: '@Service', override: '@Override', test: '@Test', run: '@Run' }[w];
    var on = { service: 'class OrderService', override: 'Order의 ' + (c.typo ? 'tostring()' : 'toString()'), test: 'OrderTest의 total()', run: 'Job의 work()' }[w];
    P.box('code', 14, 16, 300, 96, { cls: hot === 'code' ? 'hot now' : 'plain', title: '우리 코드', sub: [c.put ? tag + ' 붙어 있음' : tag + ' 없음', on] });
    var rs = s ? s.read : '';
    if (sim.hasReader) {
      var rsub = rs === 'yes' ? '꼬리표를 읽고 일함' : rs === 'no' ? '꼬리표가 없어 할 일 없음' : w === 'override' ? '컴파일할 때 읽음' : '실행할 때 읽음';
      P.box('reader', 366, 16, 300, 96, { cls: hot === 'reader' ? 'hot now' : rs === 'yes' ? 'good' : 'plain', title: '읽는 쪽: ' + sim.readerName, sub: [rsub, w === 'service' ? '주는 쪽: 스프링' : w === 'override' ? '주는 쪽: JDK' : w === 'test' ? '주는 쪽: JUnit' : '우리가 직접 쓴 코드'] });
      if (rs === 'yes' || rs === 'no') P.arrow('rd', 'reader:l', 'code:r', { cls: rs === 'yes' ? 'good' : 'dash', label: '읽음' });
    } else {
      P.box('reader', 366, 16, 300, 96, { cls: 'ghost', title: '읽는 쪽: 없음', sub: [w === 'service' ? '스프링을 시작하지 않음' : w === 'test' ? 'JUnit 없이 main에서 부름' : '@Run을 읽는 코드가 없음', '꼬리표는 아무 일도 하지 않음'] });
    }
    var res = !s || !s.compile ? '아직 실행 전' : s.exc ? (s.exc === '컴파일 오류' ? '컴파일 오류로 멈춤' : s.exc + '으로 멈춤') : s.out.length ? '출력: ' + s.out.join(', ') : '출력 없음';
    var extra = s && s.bean ? '스프링이 등록한 빈: ' + s.bean : ' ';
    P.box('result', 14, 150, 652, 80, { cls: s && s.exc ? 'bad' : s && s.out.length ? 'good' : hot === 'result' ? 'hot now' : 'ghost', title: '실행 결과', sub: [res, extra] });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1, 스프링 프레임워크 7.0.9(스프링 부트 없이 AnnotationConfigApplicationContext로 시작), JUnit Jupiter 6.0.3(JUnit Platform Launcher 6.0.3으로 실행)입니다. 물음에 쓰이는 열일곱 조합(@Service, @Override, @Test, 직접 만든 @Run마다 네 가지와 선언을 보는 물음 하나)의 화면 코드를 이 실습의 code 함수에서 그대로 꺼내 javax.tools로 컴파일했습니다. 컴파일에 성공한 것은 새 자바 프로세스로 실행하고(@Test를 JUnit으로 실행하는 조합은 Launcher로 실행), 표준 출력과 예외, JUnit이 찾은 테스트 수와 통과 수를 잡아 결과 표와 대조했습니다. 컴포넌트 스캔은 실제 스캔이며 OrderService를 손으로 등록하지 않았습니다. NoSuchBeanDefinitionException의 메시지, @Override의 컴파일 오류 문구, 빈 이름 orderService, @Service 자리에 @Repository, @Controller, @Component를 붙여도 getBean이 성공하는 것, 메서드 위에 @Service를 붙이면 컴파일 오류가 나는 것, javap -v로 본 OrderService.class에 Service만 RuntimeVisibleAnnotations로 남고 Override는 없는 것, @Override를 붙인 Order.class에도 Override가 남지 않는 것도 실행해 확인했습니다. 주석에 옮겨 적은 @Service와 @Override의 선언, 단계 문장의 @Test 선언(@Retention(RUNTIME))은 실행 중에 리플렉션으로 읽은 메타 애너테이션과 요소 이름으로 대조했고, 설명 주석은 옮기지 않았습니다. Object의 toString()이 돌려주는 Order@ 뒤의 16진수는 실행마다 다를 수 있어 형식만 대조했습니다. @Retention을 적지 않으면 CLASS가 되어 실행 중에 읽을 수 없다는 문장은 이번에 다시 실행하지 않았고, Java Language Specification(Java SE 21) 9.6.4.2절과 이 실습의 예전 실행 기록(직접 만든 애너테이션에 @Retention이 없으면 isAnnotationPresent가 false)에 기댑니다. 문서는 Java Language Specification 9.6절(@interface 선언), 9.6.4.1절(@Target), 9.6.4.2절(@Retention), 9.6.4.4절(@Override), 스프링 프레임워크 레퍼런스의 컴포넌트 스캔과 메타 애너테이션 절, JUnit 사용자 가이드의 @Test 설명을 확인했습니다. ./gradlew test나 IDE의 실행 단추가 JUnit을 부른다는 문장은 이 실습에서 실행하지 않았습니다. 스프링이 컴포넌트 스캔에서 꼬리표를 읽는 내부 방식, 직접 만든 애너테이션을 스프링 AOP와 함께 쓰는 방법은 다루지 않았고, 애너테이션의 세부 동작은 "세부 동작 실습: 애너테이션"에서 다룹니다.',
});
