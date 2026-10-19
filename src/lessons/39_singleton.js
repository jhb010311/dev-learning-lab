Lab.register({
  id: 'singleton', nav: '싱글톤 빈과 상태', cat: '스프링', mode: 'step',
  title: '내 주문에 다른 사람 이름이 찍혔다',
  intro: '스프링 빈은 기본적으로 하나만 만들어져 모든 요청이 함께 씁니다. 그 빈의 필드에 요청마다 달라지는 값을 저장하면, 동시에 들어온 다른 요청이 그 값을 덮어씁니다.',
  terms: ['싱글톤 빈과 무상태(Stateless)', '빈 스코프', 'ThreadLocal', '스레드 안전(Thread-safe)', '경쟁 상태(Race Condition)'], ranks: ['bean', 'di', 'concurrency'],
  controls: [
    { id: 'where', label: '현재 사용자 정보를 두는 곳', type: 'select', value: 'field', options: [['field', '서비스 빈의 필드'], ['local', '메서드의 지역 변수 (파라미터로 전달)'], ['tl', 'ThreadLocal (요청 끝에 지우지 않음)'], ['tlc', 'ThreadLocal (요청 끝에 remove)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '현재 사용자 정보를 서비스 빈의 필드에 두고 철수와 영희가 동시에 주문하면 각 주문에 누구 이름이 찍히나', d: '빈의 필드에 저장. 두 요청이 겹치면 값이 섞입니다.', v: { where: 'field' } },
    { t: '지역 변수로', q: '사용자 정보를 필드에 두지 않고 파라미터(지역 변수)로 전달하면', d: '요청마다 자기 스택에 따로 있어서 섞이지 않습니다.', v: { where: 'local' } },
    { t: 'ThreadLocal, 정리 안 함', q: '사용자 정보를 ThreadLocal에 두고 요청이 끝나도 지우지 않으면', d: '동시 요청은 안전하지만, 스레드가 재사용될 때 이전 값이 남습니다.', v: { where: 'tl' } },
    { t: 'ThreadLocal, 정리함', q: '사용자 정보를 ThreadLocal에 두고 요청이 끝날 때 remove를 호출하면', d: '요청이 끝날 때 지우면 안전합니다.', v: { where: 'tlc' } },
  ],
  code: function (c) {
    if (c.where === 'field') return '// 필요한 부분만 남김 (checkStock은 예시로 만든 메서드, 선언 생략)\n@Service\nclass OrderService {                 // 인스턴스는 하나뿐\n    private String currentUser;      // 모든 요청이 함께 쓰는 필드\n\n    public Order order(String user, Item item) {\n        this.currentUser = user;     // (1) 저장\n        checkStock(item);            // 잠깐 다른 일\n        return new Order(currentUser, item);   // (2) 다시 읽음\n    }\n}';
    if (c.where === 'local') return '// 필요한 부분만 남김 (checkStock은 예시로 만든 메서드, 선언 생략)\n@Service\nclass OrderService {                 // 인스턴스는 하나뿐, 필드에 상태 없음\n\n    public Order order(String user, Item item) {   // user는 지역 변수\n        checkStock(item);\n        return new Order(user, item);\n    }\n}';
    return '// 필요한 부분만 남김 (loggedIn, userOf, checkStock은 예시로 만든 메서드)\nclass UserContext {\n    private static final ThreadLocal<String> USER = new ThreadLocal<>();\n    static void set(String user) { USER.set(user); }\n    static String get()          { return USER.get(); }\n    static void clear()          { USER.remove(); }\n}\n\n// 필터: 요청마다 사용자 정보를 넣는다\npublic void doFilter(ServletRequest req, ServletResponse res,\n        FilterChain chain) throws IOException, ServletException {\n' + (c.where === 'tlc' ? '    try {\n        if (loggedIn(req)) UserContext.set(userOf(req));\n        chain.doFilter(req, res);\n    } finally {\n        UserContext.clear();         // 요청이 끝나면 지운다\n    }\n' : '    if (loggedIn(req)) UserContext.set(userOf(req));\n    chain.doFilter(req, res);        // 끝난 뒤 지우지 않음\n') + '}\n\n// 서비스: 필드 대신 ThreadLocal에서 사용자를 읽는다\n@Service\nclass OrderService {                 // 인스턴스는 하나뿐, 필드에 상태 없음\n    public Order order(Item item) {\n        checkStock(item);\n        return new Order(UserContext.get(), item);\n    }\n}';
  },
  label: function (c) { return { field: '빈의 필드', local: '지역 변수', tl: 'ThreadLocal (정리 안 함)', tlc: 'ThreadLocal (정리함)' }[c.where]; },
  columns: ['철수의 주문에 찍힌 이름', '영희의 주문에 찍힌 이름', '로그인 안 한 요청이 본 값', '결과'],
  simulate: function (c) {
    var ev = [], sum = [], W = c.where, S = { field: '(비어 있음)', t1: '', t2: '', tl1: '(비어 있음)', tl2: '(비어 있음)', o1: '-', o2: '-', o3: '-' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    var a, b, g = '-';
    push('OrderService 빈은 컨테이너에 하나만 있습니다. 철수의 요청은 스레드 1이, 영희의 요청은 스레드 2가 맡아 거의 동시에 같은 객체의 order()를 호출합니다.', '');
    if (W === 'field') {
      S.field = '철수'; S.t1 = '(1) 필드에 "철수" 저장'; push('스레드 1(철수): 필드 currentUser에 "철수"를 저장합니다.', '');
      S.field = '영희'; S.t2 = '(1) 필드에 "영희" 저장'; push('스레드 2(영희): 같은 필드에 "영희"를 저장합니다. 필드는 하나뿐이므로 "철수"가 덮어써집니다.', 'bad');
      S.t1 = '(2) 필드에서 "영희"를 읽음'; S.o1 = '영희'; a = '영희'; push('스레드 1(철수): 재고 확인을 마치고 필드를 다시 읽어 주문을 만듭니다. 필드는 "영희"를 가리키고 있습니다. 철수의 주문이 영희의 이름으로 만들어졌습니다.', 'bad');
      S.t2 = '(2) 필드에서 "영희"를 읽음'; S.o2 = '영희'; b = '영희'; push('스레드 2(영희): 필드를 읽어 주문을 만듭니다. "영희"입니다.', '');
      sum.push('싱글톤 빈의 필드는 모든 요청이 공유합니다. 요청마다 달라지는 값을 필드에 두면 동시 요청에서 서로의 값을 덮어씁니다. 혼자 테스트할 때는 요청이 겹치지 않아 거의 드러나지 않고, 요청이 동시에 몰릴 때 간헐적으로 나타납니다.');
    } else if (W === 'local') {
      S.t1 = '지역 변수 user = "철수"'; push('스레드 1(철수): user는 메서드의 파라미터, 즉 지역 변수입니다. 스레드 1의 스택에만 존재합니다.', '');
      S.t2 = '지역 변수 user = "영희"'; push('스레드 2(영희): 같은 메서드를 실행하지만 user는 스레드 2의 스택에 따로 있습니다. 서로 볼 수도 바꿀 수도 없습니다.', 'good');
      S.o1 = '철수'; S.o2 = '영희'; a = '철수'; b = '영희'; push('각 스레드가 자기 지역 변수로 주문을 만듭니다. 섞이지 않습니다.', 'good');
      sum.push('빈은 공유되지만 메서드 안의 지역 변수는 스레드마다 따로 있습니다. 싱글톤 빈은 필드에 변하는 상태를 두지 않고(무상태), 필요한 값은 파라미터로 넘기는 것이 기본입니다.');
    } else {
      S.tl1 = '철수'; S.t1 = 'UserContext.set("철수")'; push('스레드 1(철수): 필터가 ThreadLocal에 "철수"를 넣습니다. ThreadLocal은 스레드마다 별도의 보관함을 가집니다.', '');
      S.tl2 = '영희'; S.t2 = 'UserContext.set("영희")'; push('스레드 2(영희): ThreadLocal에 "영희"를 넣습니다. 스레드 2의 보관함에 들어가므로 스레드 1의 값은 그대로입니다.', 'good');
      S.o1 = '철수'; S.o2 = '영희'; a = '철수'; b = '영희'; S.t1 = '주문 생성 후 요청 종료'; S.t2 = '주문 생성 후 요청 종료'; push('각 스레드가 자기 보관함에서 값을 꺼내 주문을 만듭니다. 동시 요청에서는 섞이지 않습니다.', 'good');
      if (W === 'tl') {
        push('두 요청이 끝났습니다. 스레드는 없어지지 않고 톰캣의 스레드 풀로 돌아갑니다. ThreadLocal을 지우지 않았으므로 스레드 1의 보관함에는 "철수"가 그대로 남아 있습니다.', 'bad');
        S.t1 = '새 요청 처리 (로그인 안 한 사용자)'; S.t2 = '(대기)'; S.o3 = '철수'; g = '철수'; push('로그인하지 않은 사용자의 새 요청이 스레드 1에 배정됩니다. 로그인하지 않았으므로 필터는 값을 넣지 않습니다. 그런데 UserContext.get()을 부르면 이전 요청이 남긴 "철수"가 나옵니다. 남의 계정으로 로그인된 것처럼 동작합니다.', 'bad');
        sum.push('ThreadLocal은 스레드에 묶인 저장소이고, 스레드 풀에서는 스레드가 재사용됩니다. 요청이 끝날 때 지우지 않으면 다음 요청이 이전 요청의 값을 보게 됩니다. 개인정보가 다른 사용자에게 노출되는 사고의 전형적인 원인이며, 메모리 누수의 원인이 되기도 합니다.');
      } else {
        S.tl1 = '(비어 있음)'; S.tl2 = '(비어 있음)'; push('두 요청이 끝날 때 finally에서 ThreadLocal을 지웁니다. 스레드는 깨끗한 상태로 스레드 풀에 돌아갑니다.', 'good');
        S.t1 = '새 요청 처리 (로그인 안 한 사용자)'; S.t2 = '(대기)'; S.o3 = '없음 (null)'; g = '없음 (null)'; push('로그인하지 않은 사용자의 새 요청이 스레드 1에 배정됩니다. UserContext.get()은 null을 돌려줍니다. 이전 요청의 흔적이 없습니다.', 'good');
        sum.push('스레드 풀처럼 스레드를 다시 쓰는 환경에서 ThreadLocal을 쓸 때는 try-finally로 요청이 끝날 때 remove()를 호출해 지웁니다. 스프링 시큐리티의 SecurityContextHolder나 로그의 MDC도 같은 원리로 동작하며 같은 주의가 필요합니다.');
      }
    }
    var ok = a === '철수' && b === '영희' && (g === '-' || g.indexOf('없음') === 0);
    return { events: ev, summary: sum, row: [a, b, g, ok ? '정상' : '값이 섞임'] };
  },
  render: function (v, sim, t, H, shown) {
    var W = sim.c.where, last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 두 요청이 동시에 들어옵니다.'); return; }
    H.table(v, ['요청', '기록된 사용자'], [{ cells: ['철수의 주문', { v: s.o1, cls: s.o1 === '-' ? '' : s.o1 === '철수' ? 'good' : 'bad' }] }, { cells: ['영희의 주문', { v: s.o2, cls: s.o2 === '-' ? '' : s.o2 === '영희' ? 'good' : 'bad' }] }].concat(W === 'tl' || W === 'tlc' ? [{ cells: ['로그인 안 한 다음 요청', { v: s.o3, cls: s.o3 === '-' ? '' : s.o3.indexOf('없음') === 0 ? 'good' : 'bad' }] }] : []), '결과');
  },
  // 그림: 위에 하나뿐인 빈, 아래에 두 스레드. 두 스레드가 같은 객체를 부른다. 값이 어디에 놓이는지가 핵심.
  draw: function (P, sim, shown) {
    var W = sim.c.where, last = shown[shown.length - 1], s = last ? last.snap : { field: '(비어 있음)', t1: '', t2: '', tl1: '(비어 있음)', tl2: '(비어 있음)', o1: '-', o2: '-', o3: '-' }, tl = W === 'tl' || W === 'tlc', next = s.t1.indexOf('새 요청') === 0;
    P.size(680, 316);
    P.box('bean', 180, 18, 320, 50, { cls: W !== 'field' ? 'plain' : s.field === '영희' ? 'bad' : s.field === '철수' ? 'hot' : 'plain', title: 'OrderService 빈 (컨테이너에 하나뿐)', sub: W === 'field' ? '필드 currentUser = ' + s.field : tl ? '필드 없이 UserContext.get()으로 읽음' : '필드에 요청별 값을 두지 않음' });
    P.box('t1', 16, 118, 310, 54, { cls: s.t1 ? 'wait' : 'plain', title: next ? '스레드 1 (재사용됨: 다음 요청)' : '스레드 1 (철수의 요청)', sub: s.t1 || '대기' });
    P.box('t2', 354, 118, 310, 54, { cls: s.t2 && s.t2 !== '(대기)' ? 'wait' : 'plain', title: '스레드 2 (영희의 요청)', sub: s.t2 || '대기' });
    if (s.t1) P.arrow('c1', 't1:t', 'bean:b:0.3', { label: '같은 객체를 호출' });
    if (s.t2 && s.t2 !== '(대기)') P.arrow('c2', 't2:t', 'bean:b:0.7');
    if (tl) {
      P.box('tl1', 16, 180, 310, 30, { cls: s.tl1 === '철수' ? (next ? 'bad' : 'hot') : 'ghost', title: '스레드 1의 ThreadLocal', right: s.tl1 });
      P.box('tl2', 354, 180, 310, 30, { cls: s.tl2 === '영희' ? 'hot' : 'ghost', title: '스레드 2의 ThreadLocal', right: s.tl2 });
    }
    var res = function (x, ok) { return x === '-' ? 'ghost' : ok ? 'good' : 'bad'; }, w = tl ? 206 : 316;
    P.box('o1', 16, 246, w, 50, { cls: res(s.o1, s.o1 === '철수'), title: '철수의 주문', sub: '기록된 사용자: ' + s.o1 });
    P.box('o2', tl ? 237 : 348, 246, w, 50, { cls: res(s.o2, s.o2 === '영희'), title: '영희의 주문', sub: '기록된 사용자: ' + s.o2 });
    if (tl) P.box('o3', 458, 246, 206, 50, { cls: res(s.o3, s.o3.indexOf('없음') === 0), title: '로그인 안 한 다음 요청', sub: '보인 사용자: ' + s.o3 });
    P.note(W === 'field' ? '빈은 하나뿐이라 필드도 하나뿐입니다. 두 스레드가 같은 필드에 쓰면 나중 값이 앞의 값을 덮어씁니다.' : W === 'local' ? '지역 변수는 각 스레드의 스택에 따로 있습니다. 빈은 함께 쓰지만 값은 섞이지 않습니다.' : 'ThreadLocal은 스레드마다 따로 가진 보관함입니다. 스레드는 요청이 끝나도 없어지지 않고 다음 요청에 다시 쓰이므로, 지우지 않으면 이전 요청의 값이 남습니다.');
  },
  assume: '두 요청이 가장 나쁘게 겹치는 순서(둘 다 저장한 뒤에 읽는 순서)를 가정했습니다. 실제로는 겹칠 때만 드러나므로 재현이 어렵습니다. 스프링 빈의 기본 스코프가 싱글톤이라는 점과 ThreadLocal이 스레드별로 값을 따로 가진다는 점은 스프링과 자바 공식 문서의 설명을 따랐습니다. 검증 실행(JDK 21)에서 실제로 실행해 확인했습니다. 객체 하나의 필드에 두 스레드가 값을 쓰게 하니 두 주문 모두 나중에 쓴 이름이 됐고, 지역 변수로는 섞이지 않았습니다. 스레드 하나짜리 풀에서 ThreadLocal을 지우지 않으면 다음 작업이 이전 값을 읽었고, remove한 경우에는 null이 나왔습니다.',
});
