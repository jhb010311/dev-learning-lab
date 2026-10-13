Lab.register({
  id: 'bean_basic', nav: '빈', cat: '기초개념', mode: 'step', basic: true, deep: ['ioc'],
  title: '빈은 무엇이고, 그냥 만든 객체와 무엇이 다른가',
  intro: '빈은 스프링이 만들어서 보관하는 객체입니다. 코드로는 평범한 클래스이고, 클래스 위에 @Component를 적어 두면 스프링이 시작할 때 app 패키지를 훑어 그 클래스를 찾아 객체를 하나 만들고, 컨테이너라는 보관하는 곳에 넣어 둡니다. 우리는 new를 쓰지 않고 필요한 곳에서 context.getBean(Greeter.class)로 스프링에게 객체를 달라고 하며, 몇 번을 달라고 해도 스프링은 보관하던 같은 객체 하나를 줍니다. 이 실습은 @Component를 지우거나 getBean 대신 new Greeter()로 만들어 가며 같은 코드를 실행해, 스프링이 만든 객체와 우리 코드가 new로 만든 객체가 각각 몇 개인지, a == b가 true인지 false인지를 봅니다.',
  terms: ['스프링 빈(Bean)', 'IoC 컨테이너(ApplicationContext)', '@Component', '컴포넌트 스캔'],
  controls: [
    { id: 'comp', label: 'Greeter 위에 @Component를 적는다', type: 'check', value: true },
    { id: 'get', label: 'Greeter 객체를 얻는 방법', type: 'select', value: 'bean', options: [['bean', 'context.getBean(Greeter.class)로 받는다'], ['new', 'new Greeter()로 직접 만든다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '빈은 어떻게 생겼고, 스프링에게 달라고 하면 무슨 일이 일어나나', d: '@Component가 있는 Greeter. 스프링이 시작할 때 객체를 하나 만들어 보관하고, 몇 번을 달라고 해도 그 객체를 줍니다.', v: { comp: true, get: 'bean' } },
    { t: '@Component를 지우면', q: '@Component를 지우면', d: '스프링이 Greeter 클래스를 모르므로 보관한 객체가 없고, 달라고 하면 예외로 멈춥니다.', v: { comp: false, get: 'bean' } },
    { t: 'new Greeter()로 만들면', q: 'getBean 대신 new Greeter()로 직접 만들면', d: '우리가 new로 만든 객체는 스프링이 보관하는 것이 아니어서 빈이 아니고, 만들 때마다 다른 객체입니다.', v: { comp: true, get: 'new' } },
    { t: '둘 다 바꾸면', q: '@Component를 지우고 new Greeter()로 만들면', d: '스프링은 Greeter 객체를 하나도 만들지 않고, 우리가 만든 객체 2개는 서로 다릅니다.', v: { comp: false, get: 'new' } },
  ],
  code: function (c) {
    var g = [], m = [];
    if (c.comp) g.push('// 표시: 스프링이 이 클래스의 객체를 만들어 보관한다', '@Component');
    g.push('public class Greeter {', '    public String hello() {', '        return "안녕하세요";', '    }', '}');
    m.push('public class Main {', '    public static void main(String[] args) {', '        // 스프링을 시작한다. app 패키지를 훑어 @Component를 찾는다', '        ApplicationContext context =', '                new AnnotationConfigApplicationContext("app");');
    if (c.get === 'bean') m.push('        // 스프링이 보관하고 있는 Greeter 객체를 달라고 한다', '        Greeter a = context.getBean(Greeter.class);', '        Greeter b = context.getBean(Greeter.class);');
    else m.push('        Greeter a = new Greeter();', '        Greeter b = new Greeter();');
    m.push('        System.out.println(a.hello());', '        System.out.println(a == b);', '    }', '}');
    return g.concat([''], m).join('\n');
  },
  label: function (c) { return (c.comp ? '@Component 있음' : '@Component 없음') + ' · ' + (c.get === 'bean' ? 'getBean으로 받음' : 'new로 직접 만듦'); },
  columns: ['실행 결과', 'a == b', '스프링이 만든 Greeter 객체', '우리 코드가 new로 만든 객체'],
  simulate: function (c) {
    var ev = [], sum = [], via = c.get === 'bean', EXC = 'NoSuchBeanDefinitionException';
    var st = { up: false, bean: false, made: 0, ours: 0, va: '', vb: '', out: [], exc: '', hot: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // main 메서드의 첫 줄: 스프링을 시작한다. 스프링이 app 패키지를 훑어 @Component를 찾고, 찾은 클래스의 객체를 만들어 보관한다
    st.up = true; st.hot = 'ct';
    push('main 메서드가 실행되고, new AnnotationConfigApplicationContext("app") 줄이 스프링을 시작합니다. 시작할 때 컨테이너가 만들어집니다. 컨테이너는 스프링이 만든 객체를 보관하는 곳이고, 지금은 비어 있습니다.', '');
    if (c.comp) {
      push('스프링이 app 패키지의 클래스를 훑어 @Component가 붙은 클래스를 찾습니다. Greeter 클래스에 붙어 있습니다.', '');
      st.bean = true; st.made = 1; st.hot = 'bean';
      push('스프링이 Greeter 클래스의 객체를 하나 만들어 컨테이너에 보관합니다. 이렇게 스프링이 만들어 보관하는 객체가 빈입니다. 이 객체는 우리 코드가 달라고 하기 전에, 스프링을 시작할 때 이미 만들어집니다.' + (via ? ' 우리가 쓴 코드에는 new Greeter()라는 줄이 없습니다.' : ' 아래에서 우리가 new Greeter()를 쓰는 것과는 상관없는 객체입니다.'), 'good');
    } else {
      push('스프링이 app 패키지의 클래스를 훑어 @Component가 붙은 클래스를 찾습니다. 하나도 없습니다. Greeter 클래스의 파일은 app 패키지에 있지만 @Component가 없어, 스프링은 이 클래스를 알아보지 못하고 객체도 만들지 않습니다. 컨테이너는 비어 있습니다.', 'bad');
    }
    if (via && c.comp) {
      st.va = 'bean'; st.hot = 'va';
      push('Greeter a = context.getBean(Greeter.class); 줄이 실행됩니다. 스프링에게 Greeter 객체를 달라고 하는 줄입니다. 스프링은 새로 만들지 않고, 컨테이너에 보관하던 그 객체를 줍니다. 변수 a가 그 객체를 가리킵니다. 스프링이 만든 객체는 그대로 1개입니다.', 'good');
      st.vb = 'bean'; st.hot = 'vb';
      push('Greeter b = context.getBean(Greeter.class); 줄이 실행됩니다. 한 번 더 달라고 해도 스프링은 새로 만들지 않고 같은 객체를 줍니다. 스프링은 빈을 하나만 만들어 두고, 달라고 할 때마다 그 하나를 주기 때문입니다. 변수 b도 a와 같은 객체를 가리킵니다.', 'good');
    } else if (via) {
      st.va = 'miss'; st.hot = 'va';
      push('Greeter a = context.getBean(Greeter.class); 줄이 실행됩니다. 스프링에게 Greeter 객체를 달라고 하지만 컨테이너는 비어 있습니다. 스프링은 Greeter 클래스를 알지 못하므로 새로 만들어 주지도 않고, "그런 빈이 없다"는 뜻의 ' + EXC + '을 일으킵니다. 이 예외를 처리하는 코드가 없어, 프로그램이 이 줄에서 멈춥니다.', 'bad');
      st.exc = EXC; st.hot = '';
      push('프로그램이 멈췄으므로 그 아래 줄들은 실행되지 않습니다. Greeter b 줄도, 값을 출력하는 줄도 실행되지 않아, 출력된 글은 하나도 없습니다.', 'bad');
    } else {
      st.ours = 1; st.va = 'o1'; st.hot = 'o1';
      push('Greeter a = new Greeter(); 줄이 실행됩니다. 우리 코드가 직접 new로 Greeter 객체를 하나 만들고, 변수 a가 그 객체를 가리킵니다. 스프링에게 달라고 하지 않았으므로 이 객체는 컨테이너에 들어 있지 않고, 스프링은 이 객체를 모릅니다.' + (c.comp ? ' 컨테이너에는 스프링이 만든 객체가 따로 있지만, a는 그것을 가리키지 않습니다.' : ''), 'good');
      st.ours = 2; st.vb = 'o2'; st.hot = 'o2';
      push('Greeter b = new Greeter(); 줄이 실행됩니다. new를 실행할 때마다 객체가 새로 하나씩 생기므로, 이번에도 또 다른 객체가 만들어지고 변수 b가 그 객체를 가리킵니다. 우리 코드가 new로 만든 객체는 2개가 되었습니다.', '');
    }
    if (!st.exc) {
      st.out.push('안녕하세요'); st.hot = 'va';
      push('System.out.println(a.hello()); 줄이 실행됩니다. a가 가리키는 객체의 hello() 메서드가 "안녕하세요"를 돌려주고, 이 글이 출력됩니다.' + (via ? '' : ' 스프링이 만들지 않은 객체라도, 클래스에 적힌 메서드는 평소와 똑같이 실행됩니다.'), '');
      st.out.push(via ? 'true' : 'false'); st.hot = '';
      push('System.out.println(a == b); 줄이 실행됩니다. a == b는 두 변수가 같은 객체를 가리키는지 비교하는 식입니다. ' + (via ? 'a와 b는 컨테이너에 보관된 같은 객체를 가리키므로 true가 출력됩니다.' : 'a와 b는 우리가 new로 만든 서로 다른 객체를 가리키므로 false가 출력됩니다.'), via ? 'good' : '');
    }
    // 요약: 첫 줄은 이 설정(물음)의 답
    if (c.comp && via) {
      sum.push('빈은 스프링이 만들어서 보관하는 객체입니다. 일반 클래스와 다른 곳은 클래스 위의 @Component 하나이고, 이것이 있으면 스프링이 시작할 때 Greeter 객체를 하나 만들어 컨테이너에 보관합니다.');
      sum.push('getBean은 새로 만드는 것이 아니라 보관하던 객체를 꺼내 주는 것이어서, 기본 설정에서는 몇 번을 달라고 해도 같은 객체가 오고 a == b가 true입니다. 우리 코드에는 new Greeter()라는 줄이 없습니다.');
    } else if (via) {
      sum.push('@Component가 없으면 스프링이 Greeter 클래스를 알아보지 못해 객체를 만들어 보관하지 않습니다. 컨테이너가 비어 있어서 getBean(Greeter.class)가 ' + EXC + ' 예외를 일으켰고, 프로그램이 그 줄에서 멈췄습니다.');
      sum.push('스프링은 달라는 요청을 받았다고 해서 @Component가 없는 클래스의 객체를 대신 만들어 주지 않습니다. 빈이 되려면 스프링이 찾을 수 있게 클래스에 표시해 두어야 합니다.');
    } else if (c.comp) {
      sum.push('우리 코드가 new Greeter()로 직접 만든 객체는 빈이 아닙니다. 스프링은 시작할 때 Greeter 객체를 1개 만들어 보관했지만 이 코드는 그것을 달라고 하지 않았고, new를 두 번 실행해 다른 객체 2개를 만들었으므로 a == b는 false입니다.');
      sum.push('@Component가 있어도 new로 만든 객체는 스프링이 보관하는 것이 아닙니다. 스프링이 만든 객체를 쓰려면 스프링에게 달라고 해야 하고, 그렇지 않으면 보관된 객체는 쓰이지 않은 채 남습니다.');
    } else {
      sum.push('@Component 없이 new로 만든 Greeter 객체는 스프링과 상관없는 일반 객체입니다. 스프링은 Greeter 객체를 하나도 만들지 않았고(0개), 우리가 만든 2개는 서로 다른 객체여서 a == b는 false입니다.');
      sum.push('스프링을 시작했어도 이 코드는 스프링의 도움 없이 평소처럼 동작했습니다. 스프링이 만들어 보관하는 객체가 빈이고, 스프링에 맡기지 않고 우리 코드가 new로 만들어 쓰는 객체는 빈이 아닙니다.');
    }
    return { events: ev, summary: sum, row: [st.exc ? EXC + '으로 멈춤' : st.out[0], st.out.length > 1 ? st.out[1] : '실행되지 않음', st.made + '개', st.ours + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 스프링이 시작되는 것부터 시작합니다.'); return; }
    H.table(v, ['보관된 객체', '수'], s.bean ? [{ cls: '', cells: ['Greeter', '1개'] }] : [{ cls: 'gone', cells: [s.up ? '비어 있음' : '스프링 시작 전', ''] }], '스프링이 보관하는 곳(컨테이너)');
    var what = { bean: '컨테이너의 Greeter 객체', o1: '우리가 new로 만든 첫 번째 객체', o2: '우리가 new로 만든 두 번째 객체', miss: '예외로 멈춤' };
    if (s.va) H.table(v, ['변수', '가리키는 것'], [['a', s.va], ['b', s.vb]].filter(function (r) { return r[1]; }).map(function (r) { return { cls: '', cells: [r[0], { v: what[r[1]], cls: r[1] === 'miss' ? 'bad' : '' }] }; }), 'main의 변수');
    if (s.out.length || s.exc) H.table(v, ['출력'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }).concat(s.exc ? [{ cls: '', cells: [{ v: s.exc + '으로 멈춤', cls: 'bad' }] }] : []), '실행 결과');
    H.counters(v, [[s.made, '스프링이 만든 객체'], [s.ours, '우리 코드가 new로 만든 객체']]);
  },
  // 그림: 왼쪽에 변수 a, b, 가운데에서 오른쪽 위에 스프링이 보관하는 곳(컨테이너)과 그 안의 Greeter 빈 상자, 오른쪽 아래에 컨테이너 밖에서 우리 코드가 new로 만든 객체 둘. a, b에서 화살표가 컨테이너 안의 빈을 가리키는지, 컨테이너 밖의 객체를 가리키는지(또는 비어 있는 곳으로 가다 막히는지)를 보인다. 맨 아래에 세는 칸 둘.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    P.size(680, 316);
    P.region('ct', 250, 16, 416, 118, '스프링이 보관하는 곳(컨테이너)' + (s && s.up ? '' : ': 시작 전'));
    P.box('bean', 270, 48, 376, 66, { cls: s && s.bean ? (hot === 'bean' ? 'good now' : 'good') : 'ghost', title: 'Greeter 빈', sub: s && s.bean ? ['스프링이 만들어 보관한 객체'] : [s && s.up ? '비어 있음' : ' '] });
    P.region('ow', 250, 150, 416, 106, '컨테이너 밖: 우리 코드가 new로 만든 객체');
    P.box('o1', 270, 172, 376, 34, { cls: s && s.ours > 0 ? (hot === 'o1' ? 'wait now' : 'wait') : 'ghost', title: 'Greeter 객체 (첫 번째 new)', right: s && s.ours > 0 ? '만들어짐' : '아직 없음' });
    P.box('o2', 270, 212, 376, 34, { cls: s && s.ours > 1 ? (hot === 'o2' ? 'wait now' : 'wait') : 'ghost', title: 'Greeter 객체 (두 번째 new)', right: s && s.ours > 1 ? '만들어짐' : '아직 없음' });
    var vs = { '': '아직 없음', bean: '빈을 가리킴', o1: '첫 번째 new 객체', o2: '두 번째 new 객체', miss: '예외로 멈춤' };
    function vcls(x) { return x === 'miss' ? 'bad' : x ? 'good' : 'ghost'; }
    P.box('va', 14, 52, 150, 58, { cls: vcls(s && s.va) + (hot === 'va' ? ' now' : ''), title: 'Greeter a', sub: vs[s ? s.va : ''] });
    P.box('vb', 14, 146, 150, 58, { cls: vcls(s && s.vb) + (hot === 'vb' ? ' now' : ''), title: 'Greeter b', sub: vs[s ? s.vb : ''] });
    var to = { bean: 'bean:l:', o1: 'o1:l:', o2: 'o2:l:', miss: 'bean:l:' };
    if (s && s.va) P.arrow('ra', 'va:r', to[s.va] + '0.35', { cls: s.va === 'miss' ? 'bad' : 'good' });
    if (s && s.vb) P.arrow('rb', 'vb:r', to[s.vb] + '0.65', { cls: 'good' });
    P.box('n1', 14, 270, 322, 36, { cls: s && s.made ? 'good' : 'ghost', title: '스프링이 만든 Greeter 객체', right: (s ? s.made : 0) + '개' });
    P.box('n2', 344, 270, 322, 36, { cls: s && s.ours ? 'wait' : 'ghost', title: '우리 코드가 new로 만든 객체', right: (s ? s.ours : 0) + '개' });
  },
  assume: '스프링 프레임워크 7.0.9를 JDK 21.0.12.1에서 실행한 결과입니다. 스프링 부트는 쓰지 않았고, 화면의 코드대로 AnnotationConfigApplicationContext("app")만 썼습니다. 네 가지 조합을 모두, 화면의 코드와 같은 구조의 소스(패키지 app의 Greeter와 Main)를 컴파일해 자바 프로세스를 새로 띄워 그대로 실행했습니다. Greeter를 손으로 등록하지 않았고, 스프링이 app 패키지를 훑어 @Component를 찾게 했습니다. 대조한 것은 프로그램이 출력한 글(안녕하세요와 a == b의 값), 예외로 멈췄을 때 그 예외의 종류, 스프링이 만든 Greeter 객체의 수, 우리 코드가 new로 만든 객체의 수입니다. 객체 수는 짐작이 아니라 실측했습니다. 대조용 소스에만 Greeter의 생성자에 객체가 만들어질 때마다 숫자를 올리는 줄을 더했고, 스프링을 시작한 직후의 수를 스프링이 만든 수로, 끝난 뒤의 수에서 그 수를 뺀 것을 우리 코드가 new로 만든 수로 적었습니다. 시작한 직후의 수는 getBean을 부르기 전에 이미 1개(@Component가 있을 때)였으므로, 스프링이 객체를 만드는 때는 getBean을 부를 때가 아니라 스프링을 시작할 때입니다. getBean을 두 번 불러도 수는 늘지 않았고 a == b는 true였으며, new를 쓴 조합에서는 컨테이너에 들어 있는 Greeter 빈이 끝난 뒤에도 시작 직후와 같은 수여서 new로 만든 객체는 컨테이너에 들어가지 않았습니다. @Component가 없을 때는 시작한 직후의 수가 0이었고 컨테이너에 등록된 이름도 없었으며(스프링 내부의 것은 뺐습니다), getBean 줄에서 org.springframework.beans.factory.NoSuchBeanDefinitionException(메시지는 app.Greeter 타입의 빈이 없다는 내용)이 나와 프로세스가 오류 코드로 끝났고 출력은 하나도 없었습니다. @Component가 있을 때 컨테이너에 등록된 이름은 greeter 하나였고 그 빈은 싱글톤이었습니다. 문서가 정한 것은 스프링 프레임워크 문서 Core의 다음 절입니다. Introduction to the Spring IoC Container and Beans(빈은 스프링 IoC 컨테이너가 만들고 조립하고 관리하는 객체이고, 그렇지 않은 객체는 그냥 애플리케이션의 여러 객체 가운데 하나라는 것), Classpath Scanning and Managed Components(@Component가 스프링이 관리하는 컴포넌트를 뜻하는 일반적인 애너테이션이고 @Service, @Controller 등이 그것을 특수화한 것이라는 것, 스프링이 애너테이션이 붙은 클래스를 찾아 빈 정의를 등록한다는 것, 이름을 정하지 않으면 클래스 이름의 첫 글자를 소문자로 바꾼 이름이 쓰인다는 것), Bean Scopes(싱글톤은 기본 범위이고 컨테이너가 그 빈 정의로 객체를 정확히 하나만 만들어 두고 요청이 올 때마다 그 객체를 돌려준다는 것), 그리고 AnnotationConfigApplicationContext(String... basePackages)의 API 문서(주어진 패키지에서 컴포넌트를 찾아 빈 정의를 등록하고 컨텍스트를 자동으로 새로 고친다는 것)입니다. 문서가 정한 것과 달리, 객체가 시작할 때 만들어지고 @Component가 없는 클래스는 getBean을 불러도 만들어지지 않는다는 점과 예외의 이름은 이 버전에서 관찰한 동작입니다. 화면의 코드는 package와 import 줄을 줄였고, Greeter와 Main이 둘 다 app 패키지에 있다고 가정했습니다. 컨테이너를 닫는 줄은 쓰지 않았습니다. 빈을 등록하는 방법은 @Component 말고도 @Bean 메서드 등이 있고, @Component 계열인 @Service나 @Controller, 빈의 범위가 싱글톤이 아닌 경우, 빈끼리 서로 연결하는 의존성 주입은 다루지 않았습니다. 이것들은 "세부 동작 실습: 스프링 컨테이너와 빈"에서 다룹니다.',
});
