Lab.register({
  id: 'cacheabs', nav: '캐시 추상화', cat: '스프링', mode: 'step',
  title: '@Cacheable을 붙이면 메서드 본문은 언제 실행되지 않나',
  intro: '스프링에서는 메서드에 @Cacheable을 붙이기만 하면, 같은 인자로 다시 부를 때 본문을 실행하지 않고 전에 돌려준 값을 캐시에서 꺼내 줍니다. 캐시를 조회하고 저장하는 코드는 프록시가 대신 실행합니다. 어떤 캐시 저장소를 쓰든 같은 애노테이션으로 다룰 수 있게 스프링이 중간에 둔 층을 캐시 추상화라고 합니다.',
  terms: ['@Cacheable', '@CacheEvict와 @CachePut', '캐시', '프록시(Proxy)', '자기 호출(Self-invocation)'],
  controls: [
    { id: 'mid', label: 'find(1)을 부른 다음에 하는 일', type: 'select', value: 'none', options: [['none', '바로 find(1)을 다시 부른다'], ['other', '인자를 바꿔 find(2)를 부른다'], ['evict', 'evict(1)을 부르고 find(1) · @CacheEvict'], ['put', 'rename(1, "새 키보드")를 부르고 find(1) · @CachePut'], ['plain', 'renamePlain(1, "새 키보드")를 부르고 find(1) · 애노테이션 없음']] },
    { id: 'via', label: 'find를 부르는 방식', type: 'select', value: 'ext', options: [['ext', '다른 빈에서 productService.find(id)'], ['self', '같은 클래스의 detail(id)가 안에서 find(id)를 부른다']] },
    { id: 'data', label: 'id 1인 상품', type: 'select', value: 'yes', options: [['yes', 'DB에 있다 ("키보드")'], ['no', 'DB에 없다 (find가 null을 돌려준다)']] },
    { id: 'unless', label: '@Cacheable에 unless = "#result == null"을 붙인다', type: 'check', value: false, show: function (c) { return c.data === 'no'; }, hint: '결과가 null이면 캐시에 넣지 않는다는 조건입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '같은 인자로 두 번 부릅니다. 본문은 한 번만 실행됩니다.', v: { mid: 'none', via: 'ext', data: 'yes', unless: false } },
    { t: '인자가 다르면', d: '키가 달라서 본문이 다시 실행됩니다.', v: { mid: 'other', via: 'ext', data: 'yes', unless: false } },
    { t: '@CacheEvict로 비우면', d: '캐시에서 지워졌으므로 본문이 다시 실행됩니다.', v: { mid: 'evict', via: 'ext', data: 'yes', unless: false } },
    { t: '@CachePut으로 값을 바꾸면', d: 'rename의 본문은 항상 실행되고, 캐시가 새 값으로 바뀝니다.', v: { mid: 'put', via: 'ext', data: 'yes', unless: false } },
    { t: '캐시는 그대로 두고 DB만 바꾸면', d: '두 번째 find가 바뀌기 전의 값을 돌려줍니다.', v: { mid: 'plain', via: 'ext', data: 'yes', unless: false } },
    { t: '같은 클래스 안에서 부르면', d: '캐시가 적용되지 않아 본문이 매번 실행됩니다.', v: { mid: 'none', via: 'self', data: 'yes', unless: false } },
    { t: '결과가 null이어도 캐시된다', d: '없는 상품을 두 번 찾습니다. unless를 켜서 비교해 보세요.', v: { mid: 'none', via: 'ext', data: 'no', unless: false } },
  ],
  code: function (c) {
    var self = c.via === 'self', f = function (id) { return 'productService.' + (self ? 'detail' : 'find') + '(' + id + 'L);'; };
    var calls = [f(1)].concat(c.mid === 'evict' ? ['productService.evict(1L);'] : c.mid === 'put' ? ['productService.rename(1L, "새 키보드");'] : c.mid === 'plain' ? ['productService.renamePlain(1L, "새 키보드");'] : [], [f(c.mid === 'other' ? 2 : 1)]);
    var s = '// 다른 빈에서 이 순서로 부른다\n' + calls.join('\n') + '\n\n@Service\nclass ProductService {\n    // DB 대신 쓰는 맵\n    private final Map<Long, String> db = new HashMap<>(\n        Map.of(' + (c.data === 'yes' ? '1L, "키보드", ' : '') + '2L, "마우스"));\n    private int findCount;\n\n' +
      '    @Cacheable(cacheNames = "product"' + (c.unless ? ',\n               unless = "#result == null"' : '') + ')\n    public String find(Long id) {\n        findCount++;                 // 본문이 실행된 횟수\n        return db.get(id);           // 없으면 null\n    }\n';
    if (c.mid === 'evict') s += '\n    @CacheEvict(cacheNames = "product")\n    public void evict(Long id) { }\n';
    if (c.mid === 'put') s += '\n    @CachePut(cacheNames = "product", key = "#id")\n    public String rename(Long id, String name) {\n        db.put(id, name);\n        return name;                 // 돌려준 값이 캐시에 들어간다\n    }\n';
    if (c.mid === 'plain') s += '\n    public void renamePlain(Long id, String name) {\n        db.put(id, name);            // 캐시 애노테이션이 없다\n    }\n';
    if (self) s += '\n    public String detail(Long id) {\n        return find(id);             // this.find(id)와 같다\n    }\n';
    return s + '}';
  },
  label: function (c) { return { none: '같은 인자로 다시', other: '다른 인자로', evict: '@CacheEvict 뒤', put: '@CachePut 뒤', plain: 'DB만 바꾼 뒤' }[c.mid] + ' · ' + (c.via === 'ext' ? '다른 빈에서' : '같은 클래스 안에서') + ' · ' + (c.data === 'yes' ? '상품 있음' : '상품 없음(null)' + (c.unless ? ' · unless' : '')); },
  columns: ['find 본문이 실행된 횟수', '두 번째 find가 돌려준 값', '끝난 뒤 캐시에 든 것'],
  simulate: function (c) {
    var self = c.via === 'self', has = c.data === 'yes', unless = !!c.unless, mid = c.mid, ev = [], sum = [];
    var db = { 1: has ? '키보드' : null, 2: '마우스' }, cache = {}, count = 0;
    var st = { call: '', short: '', px: '', tg: '', look: '', toBody: false, self: false, dbop: '', cache: [], db: [], count: 0, second: '' };
    function q(v) { return v === null ? 'null' : '"' + v + '"'; }
    function obj(v) { return v === null ? 'null을' : '"' + v + '"를'; }
    function push(s, k) {
      st.cache = Object.keys(cache).sort().map(function (k2) { return [k2, cache[k2] === null ? 'null' : cache[k2]]; });
      st.db = Object.keys(db).sort().filter(function (k2) { return db[k2] !== null; }).map(function (k2) { return [k2, db[k2]]; });
      st.count = count;
      ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) });
    }
    function reset(call, short) { st.call = call; st.short = short; st.px = ''; st.tg = ''; st.look = ''; st.toBody = false; st.self = false; st.dbop = ''; }
    function find(id, nth) {
      var ord = nth === 1 ? '첫 번째' : '두 번째', v;
      if (self) {
        reset('detail(' + id + 'L)', 'detail(' + id + ')'); st.px = '캐시 애노테이션 없음: 그대로 넘김'; st.tg = 'detail 실행 중'; st.toBody = true;
        push('productService.detail(' + id + 'L) 호출 (' + ord + '): 다른 빈이 detail을 부릅니다. 호출은 프록시에 도착하지만 detail에는 캐시 애노테이션이 없으므로, 프록시는 아무 일도 하지 않고 실제 객체에 넘깁니다.');
        count++; v = db[id]; st.self = true; st.px = '이 호출을 보지 못함'; st.tg = 'find 본문 실행 (' + count + '번째)'; st.dbop = '조회';
        if (nth === 2) st.second = q(v);
        push('detail 안의 find(id): this.find(id)를 부르는 것과 같습니다. 실제 객체가 자기 메서드를 직접 부르는 것이라 프록시를 지나지 않습니다. 캐시를 찾아보지도, 결과를 저장하지도 않고 본문이 실행됩니다(' + count + '번째). ' + (v === null ? 'DB에 id ' + id + '인 상품이 없어서 null을 돌려줍니다.' : 'DB에서 읽은 ' + obj(v) + ' 돌려줍니다.'), 'bad');
        return v;
      }
      reset('find(' + id + 'L)', 'find(' + id + ')'); st.px = '호출을 받음';
      push('productService.find(' + id + 'L) 호출 (' + ord + '): 다른 빈이 부릅니다. 호출은 프록시에 먼저 도착합니다. 프록시는 @Cacheable을 보고, 본문을 실행하기 전에 캐시 "product"에서 키 ' + id + (id === 2 ? '를' : '을') + ' 찾아봅니다.' + (nth === 1 ? ' 프록시는 캐시가 실제로 어디에 저장되는지 모릅니다. CacheManager가 내준 Cache 객체에 get과 put을 부를 뿐이어서, 저장소를 메모리의 맵에서 Redis로 바꿔도 이 코드와 애노테이션은 그대로입니다. 스프링은 이 구조를 캐시 추상화라고 부릅니다.' : ''));
      if (id in cache) {
        v = cache[id]; st.look = 'hit'; st.px = '키 ' + id + ' 있음: 캐시의 값을 돌려줌'; st.tg = '본문을 실행하지 않음';
        if (nth === 2) st.second = q(v);
        var stale = db[id] !== v;
        push('캐시 조회: 키 ' + id + (id === 2 ? '가' : '이') + ' 있습니다. 프록시는 find의 본문을 실행하지 않고 캐시에 든 ' + (v === null ? '"결과는 null"이라는 기록대로 null을' : obj(v)) + ' 돌려줍니다. 본문의 실행 횟수는 ' + count + '번 그대로입니다.' + (stale ? ' DB에는 이제 "' + db[id] + '"가 들어 있지만 캐시는 그 사실을 모릅니다. 바뀌기 전의 결과를 받았습니다.' : ''), stale ? 'bad' : 'good');
        return v;
      }
      st.look = 'miss'; st.px = '키 ' + id + ' 없음: 본문을 실행해야 함';
      push('캐시 조회: 키 ' + id + (id === 2 ? '가' : '이') + ' 없습니다. ' + (id === 2 ? '캐시의 키는 메서드의 인자로 만들어집니다. 인자가 2인 호출은 키 2를 찾으므로, 키 1에 든 값과는 관계가 없습니다.' : nth === 1 ? '아직 아무것도 넣은 적이 없습니다.' : mid === 'evict' && had ? '방금 @CacheEvict가 지웠습니다.' : '첫 번째 결과가 null이라 넣지 않았습니다.') + ' 프록시가 실제 객체의 find를 부릅니다.');
      count++; v = db[id]; st.toBody = true; st.tg = 'find 본문 실행 (' + count + '번째)'; st.dbop = '조회';
      if (nth === 2) st.second = q(v);
      push('find 본문 실행 (' + count + '번째): findCount가 ' + count + (count === 2 ? '가' : '이') + ' 됩니다. ' + (v === null ? 'DB에 id ' + id + '인 상품이 없어서 null을 돌려줍니다.' : 'DB에서 id ' + id + '인 상품을 찾아 ' + obj(v) + ' 돌려줍니다.'));
      st.dbop = '';
      if (v === null && unless) { st.look = ''; st.px = 'null이라 저장하지 않음 (unless)'; push('unless = "#result == null" 확인: 결과가 null이므로 조건이 참입니다. unless가 참이면 결과를 캐시에 넣지 않습니다.', ''); }
      else {
        cache[id] = v; st.look = 'store'; st.px = '결과를 캐시에 저장';
        push('프록시가 결과를 캐시에 저장: 키 ' + id + ' → ' + (v === null ? 'null. 결과가 null이어도 기본 설정에서는 "키 ' + id + '의 결과는 null"이라고 저장합니다.' : v + '. 다음에 같은 인자로 부르면 이 값을 씁니다.' + (unless ? ' 결과가 null이 아니므로 unless 조건에 걸리지 않습니다.' : '')), '');
      }
      return v;
    }
    find(1, 1);
    if (mid === 'evict') {
      var had = 1 in cache; delete cache[1];
      reset('evict(1L)', 'evict(1)'); st.px = '캐시에서 키 1을 지움'; st.look = 'evict'; st.tg = 'evict 실행 (빈 본문)'; st.toBody = true;
      push('productService.evict(1L) 호출: 프록시가 @CacheEvict를 보고 캐시 "product"에서 키 1을 지웁니다.' + (had ? ' 다음에 find(1)을 부르면 캐시에 값이 없는 상태입니다.' : ' 지금은 캐시에 키 1이 없어서 지울 것이 없습니다. 그래도 오류는 나지 않습니다.'), '');
    }
    if (mid === 'put') {
      db[1] = '새 키보드';
      reset('rename(1L, "새 키보드")', 'rename'); st.px = '@CachePut: 본문을 항상 실행'; st.tg = 'rename 본문 실행'; st.toBody = true; st.dbop = '변경';
      push('productService.rename(1L, "새 키보드") 호출: @CachePut이 붙은 메서드는 캐시에 값이 있든 없든 본문을 항상 실행합니다. 본문이 DB의 id 1을 "새 키보드"로 ' + (has ? '바꾸고' : '넣고') + ' 그 이름을 돌려줍니다.', '');
      var had2 = 1 in cache; cache[1] = '새 키보드'; st.dbop = ''; st.look = 'store'; st.px = '결과를 캐시에 저장';
      push('프록시가 rename이 돌려준 값을 캐시에 저장: 키 1 → 새 키보드.' + (had2 ? ' 전에 들어 있던 ' + (has ? '"키보드"를' : 'null을') + ' 덮어씁니다.' : ''), 'good');
    }
    if (mid === 'plain') {
      db[1] = '새 키보드';
      reset('renamePlain(1L, "새 키보드")', 'renamePlain'); st.px = '캐시 애노테이션 없음: 그대로 넘김'; st.tg = 'renamePlain 본문 실행'; st.toBody = true; st.dbop = '변경';
      push('productService.renamePlain(1L, "새 키보드") 호출: 캐시 애노테이션이 없는 메서드입니다. DB의 id 1만 "새 키보드"로 ' + (has ? '바뀌고' : '들어가고') + ', 캐시는 아무도 건드리지 않습니다.', '');
    }
    var second = find(mid === 'other' ? 2 : 1, 2);
    var ck = Object.keys(cache).sort(), cstr = ck.length ? ck.map(function (k2) { return k2 + '=' + (cache[k2] === null ? 'null' : cache[k2]); }).join(', ') : '비어 있음';
    if (self) {
      sum.push('같은 클래스 안에서 부른 find는 프록시를 지나지 않아 @Cacheable이 적용되지 않습니다. 오류도 경고도 없이 본문이 매번 실행됩니다. 캐시를 적용하려면 다른 빈에서 부르거나 find를 다른 빈으로 옮깁니다.');
      if (mid === 'put') sum.push('rename은 다른 빈에서 불렀으므로 @CachePut이 적용되어 캐시에 값이 들어갔습니다. 하지만 find가 캐시를 보지 않으므로 그 값은 쓰이지 않았습니다.');
    } else if (mid === 'none') {
      if (count === 1 && second !== null) sum.push('같은 인자로 다시 부르면 프록시가 캐시의 값을 돌려주고 본문은 실행하지 않습니다. 본문이 오래 걸리는 DB 조회나 외부 호출일수록 효과가 큽니다.');
      if (count === 1 && second === null) sum.push('null 결과도 기본 설정에서는 캐시됩니다. "없다"는 것을 다시 조회하지 않게 되지만, 나중에 그 데이터가 생겨도 캐시를 비우기 전까지는 계속 null을 받습니다. null을 캐시하지 않으려면 unless = "#result == null"을 붙입니다.');
      if (count === 2) sum.push('unless 조건이 참이면 결과를 캐시에 넣지 않습니다. null이 저장되지 않았으므로 두 번째 호출도 본문을 실행했습니다.');
    } else if (mid === 'other') sum.push('캐시의 키는 기본으로 메서드의 인자입니다. 인자가 다르면 키가 다르므로 본문이 다시 실행되고, 결과는 키마다 따로 저장됩니다.');
    else if (mid === 'evict') sum.push('@CacheEvict는 캐시에서 값을 지웁니다. 그다음 호출은 본문을 다시 실행해 결과를 새로 저장합니다. 데이터를 바꾸거나 지우는 메서드에 붙여 캐시에 옛 값이 남지 않게 합니다.');
    else if (mid === 'put') sum.push('@CachePut은 @Cacheable과 달리 본문을 건너뛰지 않습니다. 항상 실행하고, 돌려준 값으로 캐시를 바꿉니다. 그래서 그다음 find는 본문을 실행하지 않고도 새 값을 받았습니다.');
    else if (count === 1) sum.push('캐시 애노테이션이 없는 메서드로 데이터를 바꾸면 캐시에는 바뀌기 전의 ' + (has ? '값이' : 'null이') + ' 남습니다. 데이터를 바꾸는 메서드에는 @CacheEvict나 @CachePut을 붙여 캐시를 함께 맞춰야 합니다.');
    else sum.push('첫 번째 결과가 null이라 캐시에 넣지 않았으므로, 두 번째 호출이 본문을 실행해 바뀐 값을 읽었습니다. 값이 한번 캐시에 들어간 뒤에 DB만 바꾸면 캐시에는 옛 값이 남습니다.');
    return { events: ev, summary: sum, self: self, row: [count + '번', q(second), cstr] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    H.table(v, ['키', '값'], s.cache.map(function (r) { return { cells: [r[0], { v: r[1], cls: r[1] === 'null' ? 'hot' : '' }] }; }), '캐시 "product"' + (s.cache.length ? '' : ' (비어 있음)'));
  },
  // 그림: 바깥 상자가 프록시, 안쪽 상자가 실제 객체다. 프록시는 오른쪽 위의 캐시를 먼저 보고, 값이 있으면 안쪽으로 들어가지 않는다. 본문이 실행될 때만 오른쪽 아래의 DB에 간다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { call: '', short: '', px: '', tg: '', look: '', toBody: false, self: false, dbop: '', cache: [], db: [], count: 0, second: '' };
    var lines = function (rows) { return rows.length ? rows.map(function (r) { return r[0] + ' → ' + r[1]; }) : ['비어 있음']; };
    P.size(680, 318);
    P.box('caller', 10, 70, 100, 56, { cls: s.call ? 'wait' : 'plain', title: '다른 빈', sub: '호출하는 쪽' });
    P.box('px', 190, 20, 268, 212, { cls: s.px.indexOf('보지 못함') >= 0 ? 'bad' : s.look === 'hit' ? 'good' : s.px ? 'hot' : 'plain', title: 'ProductService 프록시', sub: s.px || '대기' });
    P.box('tg', 250, 122, 194, 96, { cls: s.tg.indexOf('실행하지 않음') >= 0 ? 'ghost' : s.tg ? 'wait now' : 'plain', title: '실제 ProductService', sub: s.tg || '대기' });
    P.box('cache', 486, 20, 182, 92, { cls: s.look === 'hit' ? 'good' : s.look === 'store' ? 'hot' : s.look === 'evict' || s.look === 'miss' ? 'wait' : 'plain', title: '캐시 "product"', sub: lines(s.cache) });
    P.text('store', 577, 130, '저장소: 메모리의 맵', { cls: 'mut', anchor: 'middle' });
    P.box('db', 486, 140, 182, 92, { cls: s.dbop ? 'hot' : 'plain', title: 'DB', sub: lines(s.db) });
    if (s.call) P.arrow('in', 'caller:r', 'px:l:0.37', { label: s.short });
    if (s.look) P.arrow('look', 'px:r:0.2', 'cache:l', { cls: s.look === 'hit' ? 'good' : s.look === 'miss' ? 'mut' : '', label: { hit: '있음', miss: '없음', store: '저장', evict: '지움' }[s.look] });
    if (s.toBody && !s.self) P.arrow('pass', [347, 84], 'tg:t', {});
    if (s.self) P.arrow('selfcall', 'tg:l:0.3', 'tg:l:0.75', { cls: 'bad', label: 'this.find' });
    if (s.dbop) P.arrow('dbq', 'tg:r', 'db:l', { label: s.dbop });
    P.box('cnt', 12, 252, 324, 38, { cls: s.count ? 'hot' : 'ghost', title: 'find 본문이 실행된 횟수', right: s.count + '번' });
    P.box('res', 344, 252, 324, 38, { cls: s.second ? 'good' : 'ghost', title: '두 번째 find가 돌려준 값', right: s.second || '아직 부르기 전' });
    P.note('바깥 상자가 프록시, 안쪽 상자가 실제 객체입니다. 안쪽 객체가 자기 메서드를 this로 부르는 빨간 화살표는 프록시를 지나지 않으므로 캐시와 관계없이 본문이 실행됩니다.');
  },
  assume: '마흔 가지 조합 모두를 이 PC의 스프링 프레임워크 7.0.9(스프링 부트 4.1.1에 들어 있는 버전)에서 @EnableCaching과 ConcurrentMapCacheManager로 실행해, find 본문이 실행된 횟수, 두 번째 find가 돌려준 값, 끝난 뒤 캐시에 든 것을 대조했습니다. rename의 본문이 캐시에 값이 있어도 실행된다는 것, 캐시에 없는 키를 @CacheEvict로 지워도 오류가 나지 않는다는 것도 같은 실행에서 확인했습니다. ConcurrentMapCacheManager는 애플리케이션의 메모리에 맵으로 저장하는 가장 단순한 캐시 매니저로, 만료 시간(TTL)이나 크기 제한이 없습니다. 만료와 동시에 몰리는 요청은 "캐시와 TTL" 실습에서 다룹니다. null을 캐시에 넣을 수 있는지는 캐시 구현의 설정에 따라 다르며, ConcurrentMapCacheManager는 기본으로 null을 넣습니다(다른 캐시 구현에서의 동작은 실행으로 확인하지 않았습니다). DB는 화면과 실행 모두 메모리의 맵으로 대신했습니다. 화면의 코드는 @EnableCaching이 켜져 있다고 가정하며, key = "#id"처럼 매개변수 이름을 쓰려면 -parameters 옵션으로 컴파일해야 합니다. 이 PC에서 이 옵션 없이 컴파일해 실행했을 때는 rename을 부르는 순간 키가 null이라는 IllegalArgumentException이 났습니다(스프링 부트로 만든 프로젝트의 빌드 설정에는 이 옵션이 들어 있습니다). 같은 클래스 안에서 부르는 호출에 프록시 기반 기능이 적용되지 않는 이유는 "프록시와 자기 호출" 실습에서 자세히 다룹니다. 여기서는 한 스레드에서 차례로 부르는 경우만 다뤘습니다. 여러 스레드가 같은 키를 동시에 처음 조회하는 경우는 실행해 보지 않았습니다.',
});
