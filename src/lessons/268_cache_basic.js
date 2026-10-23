Lab.register({
  id: 'cache_basic', nav: '캐시', cat: '기초개념', mode: 'step', basic: true, deep: ['cache', 'cacheabs', 'etag', 'redis'],
  title: '캐시는 무엇이고, 쓰면 무엇을 얻고 무엇을 잃는가',
  why: 'DB 조회나 다른 서버 호출처럼 시간이 드는 일을, 같은 답이 나올 것을 알면서도 요청마다 다시 하면 사용자는 매번 기다리고 원본 쪽에는 같은 일이 쌓인다. 캐시는 한 번 얻은 답을 빨리 꺼낼 수 있는 곳에 두었다가 다시 쓰게 해서, 느린 일을 되풀이하지 않게 한다. 그 대가로 원본이 바뀌면 캐시의 값을 언제 버릴지를 따로 챙겨야 한다.',
  use: '자주 읽히지만 잘 바뀌지 않는 상품 정보, 카테고리 목록, 설정값 같은 것을 캐시에 둔다. 스프링에서는 설정 클래스에 @EnableCaching을 적고, 조회 메서드에 @Cacheable, 값을 바꾸는 메서드에 @CacheEvict를 적어 쓴다. 캐시를 보관하는 곳은 CacheManager 빈으로 고르며, 서버 한 대의 메모리부터 여러 서버가 함께 보는 Redis까지 같은 애너테이션으로 쓴다. 남은 재고나 계좌 잔액처럼 늘 지금 값이어야 하는 것은 캐시에 두지 않거나, 값이 바뀔 때 캐시의 값을 바로 지운다.',
  intro: '캐시는 오래 걸려 얻은 결과를 가까운 곳에 적어 두었다가, 같은 것을 다시 달라고 하면 원본까지 가지 않고 적어 둔 것을 주는 장치입니다. 캐시는 원본이 아니라 원본을 읽어 온 그때의 값을 적어 둔 것이어서, 원본이 바뀐 뒤에는 옛 값을 줄 수 있습니다. 스프링에서는 캐시를 직접 짜지 않고 스프링이 주는 애너테이션을 적습니다. 화면의 코드에서 CacheConfig 클래스의 @EnableCaching은 캐시 기능을 켜고, @Bean으로 등록한 ConcurrentMapCacheManager(스프링이 주는 클래스)는 이름이 product인 캐시를 메모리에 둡니다. 예시로 만든 ProductService 클래스의 find 메서드 위에 @Cacheable("product")을 적으면, 스프링이 find를 부르는 앞뒤에서 캐시 product를 보고 결과를 적어 두는 일을 합니다. find의 본문은 원본(DB 대신 쓰는 Map)에서 값을 읽고, loadCount로 원본에서 읽은 횟수를 셉니다. 실제 시간은 재지 않고, 원본에서 읽은 횟수로 "느린 일을 몇 번 했는가"를 봅니다. 예시로 만든 Caller 클래스는 스프링이 넣어 준 ProductService 빈으로 1번 상품을 두 번 찾습니다. 이 실습은 @Cacheable 줄을 지워 보고, 두 번 찾는 사이에 rename으로 원본을 바꾸거나 rename 위에 @CacheEvict를 적어 가며, 원본에서 몇 번 읽는지와 두 번째로 받은 값이 원본과 같은지를 봅니다. 마지막 물음에서는 @Cacheable이 하는 일을 Map으로 직접 쓴 모양과 견주어 봅니다.',
  terms: ['캐시', '캐시 적중과 미스', '@Cacheable', '@CacheEvict와 @CachePut', '@EnableCaching과 CacheManager', '캐시의 옛 값(Stale)'],
  controls: [
    { id: 'cache', label: 'find에 캐시를 두는 방법', type: 'select', value: 'spring', options: [['spring', 'find 위에 @Cacheable("product")을 적는다'], ['none', '@Cacheable 줄을 지운다 (캐시 없음)'], ['map', '@Cacheable 없이 Map으로 직접 쓴다']] },
    { id: 'mid', label: '1번 상품을 두 번 찾는 사이에 하는 일', type: 'select', value: 'none', options: [['none', '아무것도 하지 않는다'], ['rename', 'rename(1L, "마우스")로 원본만 바꾼다'], ['evict', 'rename 위에 @CacheEvict를 적고 rename(1L, "마우스")를 부른다']], hint: 'Map으로 직접 쓴 캐시에서는 @CacheEvict 대신 rename의 cache.remove(id) 줄이 같은 일을 합니다.' },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '캐시는 어떻게 생겼고, @Cacheable이 붙은 find로 1번 상품을 두 번 찾으면 원본에서 몇 번 읽나', d: '@Cacheable("product")이 붙은 find. 두 번 찾았는데 원본에서는 한 번만 읽습니다.', v: { cache: 'spring', mid: 'none' } },
    { t: '@Cacheable을 지우면', q: '@Cacheable 줄을 지우고 같은 1번 상품을 두 번 찾으면', d: '찾을 때마다 find 본문이 실행되어 원본에서 두 번 읽습니다.', v: { cache: 'none', mid: 'none' } },
    { t: '두 번 찾는 사이에 원본이 바뀌면', q: '@Cacheable이 있는데 두 번 찾는 사이에 rename(1L, "마우스")로 원본의 값을 바꾸면', d: '원본에서는 한 번만 읽지만, 두 번째로 받은 값이 원본과 다릅니다.', v: { cache: 'spring', mid: 'rename' } },
    { t: 'rename 위에 @CacheEvict를 적으면', q: 'rename 위에 @CacheEvict를 적어, 원본을 바꿀 때 캐시의 값도 지우게 하면', d: '두 번째 find가 캐시에서 값을 찾지 못해 본문이 다시 실행되고, 바뀐 값을 받습니다.', v: { cache: 'spring', mid: 'evict' } },
    { t: '캐시 없이 그 사이에 원본이 바뀌면', q: '@Cacheable 줄이 없는 코드에서 두 번 찾는 사이에 원본의 값을 바꾸면', d: '매번 원본에서 읽으므로 바뀐 값을 받지만, 원본에서 두 번 읽습니다.', v: { cache: 'none', mid: 'rename' } },
    { t: '@Cacheable이 하는 일을 직접 쓰면', q: '@Cacheable 없이 Map 하나와 if 문으로 같은 일을 직접 쓰면', d: '스프링이 find의 앞뒤에서 하던 일을 find 본문에 직접 씁니다. 원본에서 읽는 횟수는 같습니다.', v: { cache: 'map', mid: 'none' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/CacheBasicProbe.java)이 실행한 소스는 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var map = c.cache === 'map', spring = c.cache === 'spring', evict = c.mid === 'evict', o = [];
    if (!map) o.push('// 캐시 기능을 켠다: 이 설정이 있어야 @Cacheable, @CacheEvict가 동작한다', '@Configuration', '@EnableCaching', 'class CacheConfig {',
      '    // 캐시를 보관하는 곳: 스프링이 주는 ConcurrentMapCacheManager(메모리의 Map을 쓴다)', '    @Bean', '    CacheManager cacheManager() {', '        return new ConcurrentMapCacheManager("product");', '    }', '}', '');
    o.push(map ? '// 예시로 만든 상품 서비스. @Cacheable 없이 캐시를 손으로 쓴 모양' : '// 예시로 만든 상품 서비스', '@Service', 'class ProductService {',
      '    // 원본: 상품 이름의 원래 값(DB 대신 쓰는 Map)', '    private final Map<Long, String> db = new HashMap<>(Map.of(1L, "키보드"));', '    // 원본에서 읽은 횟수', '    private int loadCount = 0;');
    if (map) o.push('    // 캐시: 읽어 온 값을 id별로 적어 두는 Map', '    private final Map<Long, String> cache = new HashMap<>();');
    o.push('');
    if (spring) o.push('    // 결과를 캐시 product에 id별로 적어 둔다. 같은 id로 다시 부르면 본문을 실행하지 않는다', '    @Cacheable("product")');
    o.push('    public String find(Long id) {');
    if (map) o.push('        // 적어 둔 값이 있으면 그것을 준다', '        if (cache.containsKey(id)) {', '            return cache.get(id);', '        }');
    o.push('        // 원본에서 읽는다(실제로는 DB 조회 같은 느린 일이 오는 자리)', '        loadCount++;');
    if (map) o.push('        String v = db.get(id);', '        // 읽어 온 값을 적어 둔다', '        cache.put(id, v);', '        return v;');
    else o.push('        return db.get(id);');
    o.push('    }', '');
    if (evict && !map) o.push('    // 원본을 바꾼 뒤, 캐시 product에서 키가 id인 값을 지운다', '    @CacheEvict(cacheNames = "product", key = "#id")');
    o.push('    public void rename(Long id, String name) {', '        db.put(id, name);');
    if (evict && map) o.push('        // 캐시에 적어 둔 값도 지운다', '        cache.remove(id);');
    o.push('    }', '', '    public int loadCount() {', '        return loadCount;', '    }', '', '    public String source(Long id) {', '        return db.get(id);', '    }', '}', '',
      '// 예시로 만든, ProductService를 부르는 쪽', '@Component', 'class Caller {', '    @Autowired', '    ProductService productService;', '', '    void run() {',
      '        // 1번 상품을 처음 찾는다', '        productService.find(1L);');
    if (c.mid !== 'none') o.push('        // 원본의 1번 값을 바꾼다', '        productService.rename(1L, "마우스");');
    o.push('        // 1번 상품을 다시 찾는다', '        String second = productService.find(1L);', '        // 원본에서 읽은 횟수 / 두 번째로 받은 값 / 원본의 값', '        System.out.println(',
      '            productService.loadCount() + " / " + second + " / " + productService.source(1L));', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { spring: '@Cacheable 있음', none: '@Cacheable 없음', map: 'Map으로 직접 쓴 캐시' }[c.cache] + ' · ' + { none: '사이에 아무것도 안 함', rename: '원본만 바꿈', evict: '원본을 바꾸고 캐시도 지움' }[c.mid]; },
  columns: ['원본에서 읽은 횟수', '두 번째로 받은 값', '원본의 값'],
  simulate: function (c) {
    var mode = c.cache, mid = c.mid, spring = mode === 'spring', none = mode === 'none', map = mode === 'map';
    var changed = mid !== 'none', evict = mid === 'evict';
    // 프록시: find에 @Cacheable이 있거나 rename에 @CacheEvict가 있을 때만 스프링이 ProductService의 프록시를 만든다
    var proxy = spring || (none && evict);
    var ev = [], sum = [], v1 = '키보드', v2 = '마우스';
    // 상태: src 원본의 1번 값, cache 캐시에 적힌 1번 값('' 없음), loads 원본에서 읽은 횟수, call Caller가 지금 부르는 메서드, body 지금 본문이 실행 중인 메서드,
    //       hot 그림에서 지금 일하는 상자, act 화살표의 종류, second 두 번째로 받은 값, out 출력, ph 지금 어느 부분인가(start, f1 첫 find, mid 사이의 일, f2 둘째 find, out 출력)
    var st = { mode: mode, proxy: proxy, src: v1, cache: '', loads: 0, call: '', body: '', hot: '', act: '', second: '', out: '', ph: 'start' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function q(x) { return '"' + x + '"'; }
    // 숫자 뒤의 "로/으로"
    function J(n) { return [0, 3, 6].indexOf(n % 10) >= 0 ? '으로' : '로'; }
    var CN = map ? 'cache' : '캐시 product';

    // 1. 스프링이 빈을 준비한다
    st.hot = 'src';
    if (spring) push('프로그램이 시작되면 스프링이 CacheConfig의 @EnableCaching을 보고 캐시 기능을 켜고, cacheManager 메서드가 돌려준 ConcurrentMapCacheManager를 빈으로 보관합니다. 이 CacheManager가 이름이 product인 캐시를 메모리에 두며, 캐시 product는 아직 비어 있습니다. ProductService의 find 위에 @Cacheable이 있으므로, 스프링은 ProductService 객체를 그대로 빈으로 쓰지 않고 그 앞에서 호출을 먼저 받을 프록시(ProductService$$SpringCGLIB$$0 클래스의 객체)를 만들어 빈으로 보관합니다. 프록시는 진짜 ProductService 객체를 참조로 갖고 있고, Caller의 productService 칸이 가리키는 것은 이 프록시입니다. 원본의 1번 값은 ' + q(v1) + '입니다.', '');
    else if (none) push('프로그램이 시작되면 스프링이 CacheConfig의 @EnableCaching을 보고 캐시 기능을 켜고, ConcurrentMapCacheManager가 비어 있는 캐시 product를 메모리에 둡니다. ' + (evict
      ? 'find에는 @Cacheable이 없지만 rename 위에 @CacheEvict가 있으므로, 스프링은 ProductService의 프록시를 만들어 빈으로 보관합니다. 다만 이 프록시는 find를 부를 때 캐시를 보지 않고 곧바로 진짜 객체의 find 본문으로 넘깁니다.'
      : '그런데 이 코드에는 @Cacheable도 @CacheEvict도 없어서 스프링이 끼워 넣을 일이 없습니다. 그래서 ProductService 객체를 그대로 빈으로 보관하고(프록시 없음), Caller의 productService 칸도 그 객체를 가리킵니다. 캐시 기능을 켜 두어도, 애너테이션을 적지 않은 메서드에는 아무 일도 일어나지 않습니다.') + ' 원본의 1번 값은 ' + q(v1) + '입니다.', '');
    else push('이 코드에는 CacheConfig도 @Cacheable도 없습니다. 스프링은 ProductService 객체를 그대로 빈으로 보관하고(프록시 없음), Caller의 productService 칸도 그 객체를 가리킵니다. 캐시는 ProductService의 cache 필드가 가리키는 Map이고, new HashMap<>()으로 만든 빈 Map이어서 아직 아무것도 적혀 있지 않습니다. 원본의 1번 값은 ' + q(v1) + '입니다.', '');

    // 한 번의 find: 캐시를 보고, 없으면 원본에서 읽어 적어 둔다. n은 몇 번째 find인가
    function find(n) {
      var val = st.src, line = (n === 1 ? 'Caller 빈의 run()이 불리고, ' : '') + (n === 1 ? 'productService.find(1L);' : 'String second = productService.find(1L);') + ' 줄이 실행됩니다. ';
      st.call = 'find'; st.body = ''; st.ph = 'f' + n;
      if (none) {
        st.hot = 'bd'; st.act = 'load'; st.body = 'find'; st.loads++;
        if (n === 2) st.second = val;
        push(line + 'find에 @Cacheable이 없으므로 ' + (proxy ? '프록시도 ' : '') + '캐시를 보지 않고, 곧바로 find 본문이 실행됩니다. 본문은 loadCount를 ' + st.loads + J(st.loads) + ' 올리고 원본에서 1번 값 ' + q(val) + '를 읽어 돌려줍니다. 읽어 온 값은 어디에도 적어 두지 않으므로 캐시 product는 계속 비어 있습니다.' + (n === 2 ? (changed ? ' 원본이 바뀐 뒤이므로 바뀐 값을 받습니다.' : ' 같은 1번 상품인데도 처음과 똑같이 원본에서 다시 읽었습니다.') : ''), n === 2 && changed ? 'good' : '');
        return;
      }
      var hit = st.cache !== '';
      st.hot = spring ? 'px' : 'bd'; st.act = hit ? 'hit' : 'miss'; st.body = map ? 'find' : '';
      if (hit) {
        if (n === 2) st.second = st.cache;
        var stale = st.cache !== st.src;
        push(line + (spring
          ? '호출을 먼저 받은 프록시가 캐시 product에서 키 1을 찾으니 ' + q(st.cache) + '가 적혀 있습니다. 이런 경우를 적중이라고 합니다. 프록시는 find 본문을 실행하지 않고 적어 둔 ' + q(st.cache) + '를 돌려줍니다.'
          : 'find 본문의 if 문이 cache.containsKey(id) 호출로 보니 1번 값이 적혀 있습니다(적중). return cache.get(id); 줄이 적어 둔 ' + q(st.cache) + '를 돌려주고, 그 아래의 loadCount++와 db.get 줄에는 닿지 않습니다.') + ' loadCount는 ' + st.loads + ' 그대로입니다.' + (stale ? ' 원본은 이미 ' + q(st.src) + '로 바뀌었지만, 원본을 읽는 줄이 실행되지 않았으므로 바뀌기 전의 값을 받았습니다.' : ''), stale ? 'bad' : 'good');
        return;
      }
      push(line + (spring
        ? '호출을 먼저 받은 프록시가, find 본문에 들어가기 전에 캐시 product에서 키 1을 찾습니다. ' + (n === 1 ? '캐시가 비어 있으므로' : '방금 지웠으므로') + ' 적혀 있지 않습니다. 이런 경우를 미스라고 합니다.'
        : 'find 본문의 if 문이 cache.containsKey(id) 호출로 1번 값이 적혀 있는지 봅니다. ' + (n === 1 ? 'cache가 비어 있으므로' : '방금 지웠으므로') + ' 적혀 있지 않습니다. 이런 경우를 미스라고 합니다.'), '');
      st.hot = 'bd'; st.act = 'load'; st.body = 'find'; st.loads++;
      push((spring ? '그래서 프록시가 진짜 ProductService 객체의 find 본문을 실행합니다. 본문은' : '그래서 if 문을 지나 아래 줄로 내려갑니다. find 본문은') + ' loadCount를 ' + st.loads + J(st.loads) + ' 올리고 원본에서 1번 값 ' + q(val) + '를 읽습니다.', '');
      st.hot = spring ? 'px' : 'bd'; st.act = 'put'; st.cache = val; st.body = map ? 'find' : '';
      if (n === 2) st.second = val;
      push(spring
        ? '본문이 ' + q(val) + '를 돌려주면, 스프링이 그 값을 캐시 product에 키 1로 적어 두고 Caller에게 돌려줍니다. 적어 두는 줄은 우리가 쓴 코드에 없습니다. @Cacheable("product")이 스프링에게 시킨 일입니다.'
        : 'cache.put(id, v) 줄이 읽어 온 ' + q(val) + '를 cache에 적어 두고, find는 그 값을 돌려줍니다. @Cacheable을 쓸 때 스프링이 하던 일을 여기서는 find 본문이 직접 합니다.', 'good');
    }

    // 2. 처음 찾는다
    find(1);

    // 3. 사이에 하는 일
    if (changed) {
      st.ph = 'mid'; st.call = 'rename'; st.hot = 'bd'; st.act = 'chg'; st.body = 'rename'; st.src = v2;
      if (!evict) push('productService.rename(1L, "마우스"); 줄이 실행되어 원본의 1번 값이 ' + q(v2) + '로 바뀝니다. rename에는 캐시를 건드리는 줄도 애너테이션도 없으므로, ' + (none ? '바뀐 곳은 원본뿐입니다.' : CN + '에는 여전히 ' + q(st.cache) + '가 적혀 있습니다.'), '');
      else if (map) {
        push('productService.rename(1L, "마우스"); 줄이 실행됩니다. rename 본문의 db.put(id, name) 줄이 원본의 1번 값을 ' + q(v2) + '로 바꿉니다.', '');
        st.act = 'rm'; st.cache = '';
        push('이어서 rename 본문의 cache.remove(id) 줄이 cache에서 1번 값을 지웁니다. cache는 다시 비어 있습니다. @CacheEvict를 쓸 때 스프링이 하던 일을 여기서는 rename 본문이 직접 합니다.', '');
      } else {
        push('productService.rename(1L, "마우스"); 줄이 실행됩니다. 프록시가 호출을 받아 진짜 객체의 rename 본문을 실행하고, db.put(id, name) 줄이 원본의 1번 값을 ' + q(v2) + '로 바꿉니다.', '');
        st.hot = 'px'; st.act = 'rm'; st.body = '';
        if (spring) {
          st.cache = '';
          push('rename 본문이 끝나면 스프링이 @CacheEvict(cacheNames = "product", key = "#id")에 따라 캐시 product에서 키가 id(1)인 값을 지웁니다. 캐시 product는 다시 비어 있습니다. key = "#id"는 지울 값의 키를 매개변수 id의 값으로 정하는 부분입니다. 이것을 적지 않으면 스프링은 매개변수 두 개(1, "마우스")를 함께 키로 써서, 키 1로 적힌 값을 지우지 못합니다.', '');
        } else push('rename 본문이 끝나면 스프링이 @CacheEvict에 따라 캐시 product에서 키 1의 값을 지우려 합니다. 하지만 find에 @Cacheable이 없어 적어 둔 것이 없으므로 지울 것도 없습니다.', '');
      }
    }

    // 4. 다시 찾는다
    find(2);

    // 5. 출력
    st.hot = ''; st.act = ''; st.call = ''; st.body = ''; st.ph = 'out';
    st.out = st.loads + ' / ' + st.second + ' / ' + st.src;
    var stale = st.second !== st.src;
    push('마지막 줄 System.out.println이 loadCount(), second, source(1L)의 값을 차례로 출력합니다. 출력은 "' + st.out + '"입니다.' + (stale ? ' 받은 값 ' + q(st.second) + '와 원본의 값 ' + q(st.src) + '가 다릅니다.' : ' 받은 값과 원본의 값이 같습니다.'), stale ? 'bad' : 'good');

    // 요약: 첫 줄은 이 설정(물음)의 답
    var k = mode + '|' + mid;
    if (k === 'spring|none') {
      sum.push('캐시는 한 번 읽어 온 결과를 적어 두었다가, 같은 것을 다시 찾으면 원본까지 가지 않고 적어 둔 값을 주는 것입니다. find 위의 @Cacheable("product") 한 줄로 스프링이 그 일을 했고, 1번 상품을 두 번 찾았는데 원본에서는 1번만 읽었습니다.');
      sum.push('캐시를 확인하고 적어 두는 코드는 우리가 쓰지 않았습니다. 스프링이 find를 부르는 앞뒤에서 캐시 product를 보고, 본문이 돌려준 값을 적어 두었습니다. 두 번 찾는 사이에 원본이 바뀌지 않았으므로 받은 값은 원본과 같았습니다.');
    } else if (k === 'none|none') {
      sum.push('@Cacheable 줄이 없으면 캐시가 아닙니다. 같은 1번 상품을 두 번 찾아도 find 본문이 두 번 실행되어 원본에서 2번 읽었습니다. @EnableCaching으로 캐시 기능을 켜 두어도, 애너테이션을 적지 않은 메서드는 캐시를 쓰지 않습니다.');
      sum.push('이 코드에서는 받은 값이 늘 그 순간 원본의 값이었습니다. 캐시가 덜어 주는 것은 같은 결과를 얻으려고 원본까지 되풀이해 가는 일입니다.');
    } else if (k === 'spring|rename') {
      sum.push('캐시는 원본이 아니라, 원본을 읽어 온 그때의 값을 적어 둔 것입니다. 두 번 찾는 사이에 원본이 바뀌어도 두 번째 find는 캐시에 적힌 ' + q(v1) + '를 받았고, 원본의 값 ' + q(v2) + '와 달랐습니다. 원본에서 읽은 것은 1번뿐이었습니다.');
      sum.push('빠른 대신 옛 값을 받을 수 있다는 것이 캐시를 쓰고 잃는 것입니다. 이 실습의 ConcurrentMapCacheManager에는 적어 둔 값을 시간이 지나면 버리는 설정이 없어서, 지우기 전까지 옛 값이 그대로 남습니다.');
    } else if (k === 'spring|evict') {
      sum.push('rename 위에 @CacheEvict를 적자, 원본을 바꾼 뒤 스프링이 캐시 product에서 키 1의 값을 지웠습니다. 두 번째 find는 미스가 되어 본문이 다시 실행되었고, 바뀐 값 ' + q(v2) + '를 받았습니다. 원본에서 읽은 것은 2번입니다.');
      sum.push('값을 바꾸는 메서드가 캐시의 값도 지우게 하면 옛 값을 받는 일을 피할 수 있습니다. 대신 지운 뒤 처음 찾는 한 번은 다시 원본에서 읽습니다.');
    } else if (k === 'none|rename') {
      sum.push('@Cacheable이 없는 코드에서는 두 번 찾는 사이에 원본이 바뀌어도, 두 번째 find가 원본에서 새로 읽어 바뀐 값 ' + q(v2) + '를 받았습니다. 원본에서 2번 읽었고 옛 값을 받는 일은 없었습니다.');
      sum.push('옛 값을 받을 수 있는 것은 적어 둔 값이 있을 때입니다. 캐시가 없으면 매번 원본까지 가는 대신 늘 그 순간 원본의 값을 받습니다.');
    } else if (k === 'none|evict') {
      sum.push('@Cacheable 없이 rename에만 @CacheEvict를 적으면, 스프링이 캐시 product에서 키 1의 값을 지우려 해도 적어 둔 것이 없어 지울 것이 없습니다. 결과는 @CacheEvict가 없을 때와 같아서, 원본에서 2번 읽고 바뀐 값 ' + q(v2) + '를 받았습니다.');
      sum.push('@CacheEvict는 캐시에 적힌 값을 지우는 일만 합니다. 값을 적어 두는 것은 @Cacheable이 붙은 메서드입니다.');
    } else if (k === 'map|none') {
      sum.push('@Cacheable 없이 Map 하나와 if 문으로 쓴 find도, 1번 상품을 두 번 찾는 동안 원본에서 1번만 읽었습니다. containsKey로 확인하고, 없을 때만 원본에서 읽고, put으로 적어 두는 이 순서가 @Cacheable이 붙은 메서드를 부를 때 스프링이 앞뒤에서 하는 일입니다.');
      sum.push('이렇게 직접 쓸 수도 있지만, 캐시가 필요한 메서드마다 같은 줄을 되풀이해야 합니다. 스프링에서는 이 줄들 대신 메서드 위에 @Cacheable 한 줄을 적습니다.');
    } else if (k === 'map|rename') {
      sum.push('Map으로 직접 쓴 캐시에서도, 두 번 찾는 사이에 원본이 바뀌면 두 번째 find는 cache에 적힌 ' + q(v1) + '를 받았습니다. @Cacheable을 쓴 것과 결과가 같습니다.');
      sum.push('옛 값은 스프링 때문이 아니라 적어 둔 값을 다시 주는 캐시의 방식에서 생깁니다. 적어 둔 값을 언제 지울지는 어느 쪽이든 따로 챙겨야 합니다.');
    } else {
      sum.push('rename의 cache.remove(id) 줄이 @CacheEvict가 하던 일을 직접 했습니다. 두 번째 find는 미스가 되어 원본에서 다시 읽고, 바뀐 값 ' + q(v2) + '를 받았습니다. 원본에서 읽은 것은 2번입니다.');
      sum.push('직접 쓰면 원본을 바꾸는 메서드마다 이 줄을 잊지 않고 써야 합니다. 스프링에서는 그 메서드 위에 @CacheEvict를 적습니다.');
    }
    return { events: ev, summary: sum, row: [st.loads + '번', st.second, st.src] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 스프링이 빈을 준비하는 것부터 시작합니다.'); return; }
    var cname = s.mode === 'map' ? '캐시(cache 필드의 Map)' : '캐시 product';
    H.table(v, ['위치', '1번에 적혀 있는 값'], [
      { cls: '', cells: ['원본(db)', s.src] },
      { cls: s.mode === 'none' ? 'gone' : '', cells: [cname, s.cache ? s.cache : s.mode === 'none' ? '비어 있음 (find에 @Cacheable이 없어 적히지 않음)' : '비어 있음'] },
    ], '지금 적혀 있는 값');
    H.counters(v, [[s.loads, '원본에서 읽은 횟수']]);
    if (s.out) H.table(v, ['원본에서 읽은 횟수', '두 번째로 받은 값', '원본의 값'], [{ cls: '', cells: [s.loads + '번', { v: s.second, cls: s.second === s.src ? 'good' : 'bad' }, s.src] }], '출력');
  },
  // 그림: 왼쪽 Caller가 부르면, 스프링 캐시를 쓸 때는 프록시가 먼저 받아 캐시 product를 보고 없을 때만 진짜 객체의 본문이 원본을 읽는다. 캐시가 없으면 본문이 곧바로 원본을 읽고, Map으로 직접 쓰면 find 본문이 cache를 본다. 아래에 원본에서 읽은 횟수, 두 번째로 받은 값, 원본의 값을 세는 칸.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, f = sim.events[0].snap;
    var mode = f.mode, px = f.proxy, hot = s ? s.hot : '', act = s ? s.act : '';
    P.size(680, 262);
    P.box('cl', 14, 40, 130, 100, { cls: s && s.call ? 'hot now' : 'plain', title: 'Caller', sub: s && s.call ? ['부르는 중:', s.call] : '대기' });
    P.box('px', 170, 40, 150, 84, { cls: !px ? 'ghost' : hot === 'px' ? 'hot now' : 'plain', title: px ? '프록시(스프링)' : '프록시 없음', sub: px ? (mode === 'spring' ? '캐시를 먼저 봄' : 'find는 그대로 넘김') : mode === 'map' ? '직접 쓴 캐시' : '스프링이 끼지 않음' });
    P.box('ca', 352, 8, 160, 64, { cls: mode === 'none' ? 'ghost' : 'plain', title: mode === 'map' ? 'cache 필드의 Map' : '캐시 product', sub: s && s.cache ? '1 → ' + s.cache : '비어 있음' });
    P.box('bd', 352, 106, 160, 64, { cls: hot === 'bd' ? 'hot now' : 'plain', title: 'ProductService 객체', sub: s && s.body ? s.body + ' 본문 실행 중' : '대기' });
    P.box('src', 540, 40, 126, 100, { cls: hot === 'src' ? 'hot now' : 'plain', title: '원본(db)', sub: '1 → ' + (s ? s.src : '키보드') });
    // 화살표: 호출을 받는 쪽으로, 그리고 실제로 일하는 쪽에서 출발한다
    if (s && s.call) P.arrow('a0', px ? 'cl:r:0.4' : 'cl:r:0.9', px ? 'px:l:0.5' : 'bd:l', { cls: 'hot', label: s.call });
    if (px && hot === 'bd') P.arrow('a1', 'px:b', 'bd:l', { cls: 'hot' });
    var sp = hot === 'px', from = sp ? 'px:r:0.25' : 'bd:t', to = sp ? 'ca:l' : 'ca:b';
    if (act === 'hit') P.arrow('a2', from, to, { cls: 'good', label: '적중' });
    if (act === 'miss') P.arrow('a2', from, to, { cls: 'bad', label: '미스' });
    if (act === 'put') P.arrow('a2', from, to, { cls: 'good', label: '적어 둠' });
    if (act === 'rm') P.arrow('a2', from, to, { cls: mode === 'none' ? 'hot' : 'bad', label: mode === 'none' ? '지울 것 없음' : '지움' });
    if (act === 'load') P.arrow('a3', 'bd:r', 'src:l:0.75', { cls: 'hot', label: '읽음' });
    if (act === 'chg') P.arrow('a3', 'bd:r', 'src:l:0.75', { cls: 'hot', label: '바꿈' });
    P.box('n1', 14, 210, 208, 38, { cls: s && s.loads ? 'wait' : 'ghost', title: '원본에서 읽은 횟수', right: (s ? s.loads : 0) + '번' });
    P.box('n2', 236, 210, 208, 38, { cls: s && s.second ? (s.second === s.src ? 'good' : 'bad') : 'ghost', title: '두 번째로 받은 값', right: s && s.second ? s.second : '-' });
    P.box('n3', 458, 210, 208, 38, { cls: 'plain', title: '원본의 값', right: s ? s.src : '키보드' });
  },
  assume: 'Spring Framework 7.0.9(spring-context)를 JDK 21.0.12.1에서 실행해 대조했습니다. 아홉 가지 조합(캐시를 두는 방법 세 가지와 두 번 찾는 사이에 하는 일 세 가지)을 모두, 화면의 코드와 같은 소스(package와 import 줄, 그리고 끝에 PROBE 표시를 붙인 측정 줄만 더함)를 javac로 컴파일하고(-parameters를 켬. 스프링 부트의 빌드 설정도 이것을 켭니다) 자바 프로세스를 조합마다 새로 띄워 확인했습니다. 화면의 클래스는 AnnotationConfigApplicationContext가 컴포넌트 스캔으로 찾게 했고, 대조 프로그램이 Caller 빈의 run()을 부른 뒤 run()이 출력한 줄을 잡았습니다. 대조한 것은 출력된 세 값(원본에서 읽은 횟수, 두 번째 find가 돌려준 값, 원본의 값)입니다. 단계 문장이 기대는 사실로 ProductService 빈의 클래스(find에 @Cacheable이 있거나 rename에 @CacheEvict가 있으면 ProductService$$SpringCGLIB$$0 프록시, 둘 다 없거나 Map으로 직접 쓴 모양이면 ProductService 그대로), Caller가 받은 객체가 그 빈인지, 첫 find 뒤와 rename 뒤와 끝에서 loadCount와 캐시에 적힌 것(스프링 쪽은 CacheManager의 product 캐시, 직접 쓴 모양은 cache 필드의 Map)도 확인했습니다. 화면에는 없는 변형으로, key를 적지 않은 @CacheEvict("product")를 rename 위에 둔 것도 실행해 보았고, 이때는 캐시 product의 키 1 값이 지워지지 않아 두 번째 find가 "키보드"를 받았습니다(키가 매개변수 둘을 함께 쓴 것이 되기 때문입니다). ConcurrentMapCacheManager에 유효 시간을 정하는 메서드가 없는 것은 javap로 이 클래스의 공개 메서드를 열어 확인했습니다. 화면의 코드는 줄인 것이 없습니다. 이 실습은 스프링 부트 없이 spring-context만으로 실행했고, 부트가 CacheManager를 자동으로 만들어 주는 설정은 확인하지 않았습니다. 원본에서 읽는 일은 실제로 오래 걸리지 않고 시간도 재지 않았으며, "느리다"는 원본에서 읽은 횟수로만 나타냈습니다. 문서는 Spring Framework Reference의 Cache Abstraction 쪽(https://docs.spring.io/spring-framework/reference/integration/cache/strategies.html, 같은 인자로 이미 호출했으면 메서드를 실행하지 않고 캐시된 결과를 돌려준다)과 RFC 9111(HTTP Caching) 4.2절(유효 기간을 넘긴 저장 응답을 stale이라 부른다)을 이전에 확인한 그대로 따랐고, 이번에 다시 열지는 않았습니다. 같은 클래스 안에서 find를 부르면 프록시를 거치지 않아 캐시가 쓰이지 않는 일, 결과가 null일 때, @CachePut, 여러 스레드가 동시에 쓰는 캐시, 캐시가 가득 찼을 때 무엇을 버릴지, 유효 시간(TTL), 인기 있는 값이 한꺼번에 사라질 때 원본에 요청이 몰리는 일, 브라우저와 서버 사이의 HTTP 캐시(ETag), Redis는 다루지 않았습니다. 이들은 "세부 동작 실습: 캐시 추상화, 캐시와 TTL, ETag, Redis"에서 다룹니다.',
});
