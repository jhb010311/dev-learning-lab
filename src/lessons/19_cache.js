Lab.register({
  id: 'cache', nav: '캐시와 TTL', cat: '대용량 트래픽', mode: 'time',
  title: '@Cacheable에 TTL을 주면 DB 조회가 얼마나 줄고, 언제 다시 몰리나',
  why: '같은 상품 정보를 볼 때마다 DB에서 다시 읽으면 결과가 매번 같은데도 DB가 같은 일을 되풀이하고, 요청이 늘면 DB가 먼저 버티지 못한다. 캐시는 한 번 읽은 결과를 메모리 저장소에 잠시 남겨 두고 다음 요청부터 거기서 돌려주게 해서, DB까지 가는 요청을 줄인다. 다만 값을 영원히 두면 원본이 바뀐 것을 모르게 되므로 값을 얼마 뒤에 버릴지(TTL)를 정하게 되었고, 그 TTL이 끝나는 순간 요청이 한꺼번에 DB로 몰리는 문제가 따라 생겼다.',
  use: '상품 상세, 인기 게시글 목록, 공통 코드처럼 자주 읽고 가끔 바뀌는 데이터에 쓴다. 스프링에서는 조회 메서드에 @Cacheable을 적고, 여러 서버가 같은 캐시를 봐야 하면 저장소로 Redis를 붙여 RedisCacheManager의 entryTtl로 TTL을 정한다. 요청이 몰리는 키에는 @Cacheable(sync = true)와 잠그는 RedisCacheWriter로 한 요청만 DB를 조회하게 한다. 결제 직전의 재고나 잔액처럼 늘 최신이어야 하는 값은 캐시를 거치지 않고 DB에서 읽는다.',
  intro: '인기 상품 하나를 30초 동안 계속 조회합니다. 조회 메서드 getProduct에는 스프링의 @Cacheable을 적었고, 캐시 저장소는 Redis입니다(스프링 데이터 Redis가 주는 RedisCacheManager). @Cacheable은 캐시를 먼저 보고, 값이 없을 때만 메서드 본문(DB 조회)을 실행해 결과를 캐시에 저장합니다. 저장한 값은 RedisCacheConfiguration의 entryTtl로 정한 시간(TTL)이 지나면 Redis에서 사라집니다. 이 실습은 그 뒤에 생기는 운영 문제를 봅니다. TTL이 끝나는 순간 요청이 DB로 몰리는 일(캐시 스탬피드)과, 원본이 바뀌어도 TTL 동안 옛 값을 주는 일입니다.',
  terms: ['TTL(Time To Live)', 'RedisCacheManager와 entryTtl', '캐시 스탬피드', '@Cacheable(sync = true)', 'RedisCacheWriter의 잠금', '캐시의 옛 값(Stale)', '@Cacheable', 'Redis', '분산 락', 'Cache-Aside 패턴', 'RedisTemplate'], ranks: ['cache', 'traffic', 'nosql'],
  controls: [
    { id: 'impl', label: 'getProduct에 캐시를 두는 방법', type: 'select', value: 'plain', options: [['plain', '@Cacheable'], ['sync', '@Cacheable(sync = true), RedisCacheManager는 기본 설정'], ['lockw', '@Cacheable(sync = true), RedisCacheManager를 lockingRedisCacheWriter로'], ['none', '@Cacheable 없음 (캐시를 쓰지 않음)'], ['aside', '@Cacheable 없이 RedisTemplate으로 직접 짠 Cache-Aside']] },
    { id: 'ttl', label: '캐시 product의 TTL (entryTtl)', type: 'select', value: '10', options: [['5', '5초'], ['10', '10초'], ['inf', 'entryTtl을 적지 않음 (만료 없음)']], show: function (c) { return c.impl !== 'none'; } },
    { id: 'rps', label: '초당 요청 수', type: 'range', min: 1, max: 20, value: 5, fmt: function (v) { return v + '건'; } },
    { id: 'dbt', label: 'DB 조회 한 번에 걸리는 시간', type: 'select', value: '1', options: [['0.2', '0.2초'], ['1', '1초'], ['2', '2초']] },
    { id: 'chg', label: '5초에 DB의 상품 가격을 바꾼다 (캐시의 값은 지우지 않는다)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '@Cacheable을 적고 entryTtl을 10초로 정했을 때, 초당 5건 요청에 DB 조회가 1초 걸리면 요청은 DB로 어떻게 가나', d: 'TTL 10초. 값이 사라질 때마다, 다시 채워지기 전에 들어온 요청 여러 건이 한꺼번에 DB로 갑니다.', v: { impl: 'plain', ttl: '10', rps: 5, dbt: '1', chg: false } },
    { t: '캐시가 없다면', q: '@Cacheable을 지우면', d: '모든 요청이 메서드 본문을 실행해 DB를 조회합니다.', v: { impl: 'none', ttl: '10', rps: 5, dbt: '1', chg: false } },
    { t: '요청이 많고 DB가 느릴 때', q: '초당 요청 수를 20건으로, DB 조회에 걸리는 시간을 2초로 바꾸면', d: '값이 사라진 순간부터 다시 채워질 때까지 들어온 요청 40건이 모두 DB를 조회합니다(캐시 스탬피드).', v: { impl: 'plain', ttl: '10', rps: 20, dbt: '2', chg: false } },
    { t: 'sync = true만 적으면', q: '같은 상황에서 @Cacheable(sync = true)로 바꾸되, RedisCacheManager는 기본 설정 그대로 두면', d: '몰림이 그대로입니다. sync = true는 잠그는 일을 캐시 구현에 맡기는데, 기본 RedisCacheWriter는 잠그지 않습니다.', v: { impl: 'sync', ttl: '10', rps: 20, dbt: '2', chg: false } },
    { t: '잠그는 writer와 함께', q: 'sync = true에 더해 RedisCacheManager를 lockingRedisCacheWriter로 만들면', d: 'Redis의 잠금 키 덕분에 한 요청만 DB를 조회하고, 나머지는 그 결과를 기다립니다.', v: { impl: 'lockw', ttl: '10', rps: 20, dbt: '2', chg: false } },
    { t: '원본이 바뀌면', q: 'entryTtl이 10초인 캐시에서, 5초에 DB의 가격을 바꾸고 캐시는 지우지 않으면', d: '캐시의 값이 사라져 다시 읽을 때까지 요청들이 바뀌기 전의 가격을 받습니다.', v: { impl: 'plain', ttl: '10', rps: 5, dbt: '1', chg: true } },
    { t: 'TTL을 5초로 줄이면', q: '같은 상황에서 entryTtl을 5초로 줄이면', d: '옛 값을 받는 요청은 줄지만 DB 조회가 늘어납니다.', v: { impl: 'plain', ttl: '5', rps: 5, dbt: '1', chg: true } },
    { t: 'entryTtl을 적지 않으면', q: 'entryTtl을 적지 않아 값이 만료되지 않게 두고 5초에 DB의 가격을 바꾸면', d: 'DB 조회는 처음 캐시를 채울 때뿐이지만, 바뀐 뒤의 요청은 모두 옛 가격을 받습니다.', v: { impl: 'plain', ttl: 'inf', rps: 5, dbt: '1', chg: true } },
    { t: '속에서는 이렇게 동작한다', q: '@Cacheable 없이 RedisTemplate으로 같은 일(Cache-Aside)을 직접 짜고 초당 20건, DB 2초로 돌리면', d: '@Cacheable이 프록시에서 하던 일을 메서드 본문에 직접 씁니다. 결과는 @Cacheable과 같고, 몰림도 똑같이 생깁니다.', v: { impl: 'aside', ttl: '10', rps: 20, dbt: '2', chg: false } },
  ],
  // 화면의 코드는 verify/spring/cmp_cache.js가 스프링 데이터 Redis의 공식 시그니처를 옮긴 대역(verify/spring/cache_stubs)과 함께 javac로 컴파일해 본다.
  code: function (c) {
    var impl = c.impl, none = impl === 'none', aside = impl === 'aside', sync = impl === 'sync' || impl === 'lockw', lockw = impl === 'lockw', inf = c.ttl === 'inf', o = [];
    o.push('// import 줄은 생략했다.');
    if (aside) o.push('// 스프링 데이터 Redis(spring-data-redis)가 주는 것: RedisTemplate');
    else if (!none) o.push('// 스프링 데이터 Redis(spring-data-redis)가 주는 것: RedisConnectionFactory, RedisCacheManager, RedisCacheConfiguration' + (lockw ? ', RedisCacheWriter' : ''));
    o.push('// 예시로 만든 것(선언 생략): Product, ProductRepository');
    o.push('');
    if (!none && !aside) {
      o.push('// 캐시 기능을 켜고, 캐시 저장소로 Redis를 쓰는 RedisCacheManager를 빈으로 등록한다', '@Configuration', '@EnableCaching', 'class CacheConfig {', '    // connectionFactory: 스프링 부트가 Redis 접속 설정(spring.data.redis.host 등)으로 만들어 주는 빈', '    @Bean', '    RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {');
      if (inf) o.push('        // entryTtl을 적지 않으면 기본값대로 만료되지 않는다', '        RedisCacheConfiguration product = RedisCacheConfiguration.defaultCacheConfig();');
      else o.push('        // 캐시 product의 값은 저장하고 ' + c.ttl + '초가 지나면 Redis에서 사라진다', '        RedisCacheConfiguration product = RedisCacheConfiguration.defaultCacheConfig()', '                .entryTtl(Duration.ofSeconds(' + c.ttl + '));');
      if (lockw) o.push('        // Redis에 잠금 키(product~lock)를 두는 writer: sync = true일 때 한 요청만 본문을 실행하게 한다', '        return RedisCacheManager.builder(RedisCacheWriter.lockingRedisCacheWriter(connectionFactory))');
      else o.push('        // builder(connectionFactory)가 쓰는 기본 writer는 잠그지 않는다', '        return RedisCacheManager.builder(connectionFactory)');
      o.push('                .withCacheConfiguration("product", product)', '                .build();', '    }', '}', '');
    }
    o.push(aside ? '// 예시로 만든 상품 서비스. @Cacheable 없이 RedisTemplate으로 캐시를 직접 쓴 모양' : '// 예시로 만든 상품 서비스', '@Service', 'class ProductService {', '    private final ProductRepository productRepository;');
    if (aside) o.push('    // RedisTemplate<String, Product> 빈은 따로 등록해야 한다(등록 코드 생략)', '    private final RedisTemplate<String, Product> redisTemplate;');
    o.push('');
    if (aside) o.push('    ProductService(ProductRepository productRepository, RedisTemplate<String, Product> redisTemplate) {', '        this.productRepository = productRepository;', '        this.redisTemplate = redisTemplate;', '    }');
    else o.push('    ProductService(ProductRepository productRepository) {', '        this.productRepository = productRepository;', '    }');
    o.push('');
    if (!none && !aside) {
      o.push('    // 캐시 product에서 키 id로 값을 찾고, 없을 때만 본문을 실행해 결과를 저장한다');
      if (sync) o.push('    // sync = true: 같은 키를 동시에 찾으면 한 호출만 본문을 실행하게 해 달라고 캐시 구현에 맡긴다', '    @Cacheable(cacheNames = "product", key = "#id", sync = true)');
      else o.push('    @Cacheable(cacheNames = "product", key = "#id")');
    }
    o.push('    public Product getProduct(long id) {');
    if (aside) {
      o.push('        String key = "product:" + id;', '        // 캐시를 먼저 본다', '        Product cached = redisTemplate.opsForValue().get(key);', '        if (cached != null) {', '            return cached;   // 캐시 적중', '        }',
        '        // 없으면 DB에서 읽고 (' + c.dbt + '초)', '        Product p = productRepository.findById(id).orElseThrow();');
      if (inf) o.push('        // 캐시에 저장한다(시간을 주지 않으면 만료되지 않는다)', '        redisTemplate.opsForValue().set(key, p);');
      else o.push('        // TTL ' + c.ttl + '초로 캐시에 저장한다', '        redisTemplate.opsForValue().set(key, p, Duration.ofSeconds(' + c.ttl + '));');
      o.push('        return p;');
    } else o.push('        // DB 조회 (' + c.dbt + '초)', '        return productRepository.findById(id).orElseThrow();');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { plain: '@Cacheable', sync: 'sync = true · 기본 writer', lockw: 'sync = true · 잠그는 writer', none: '캐시 없음', aside: 'RedisTemplate 직접' }[c.impl] + (c.impl === 'none' ? '' : ' · ' + (c.ttl === 'inf' ? '만료 없음' : 'TTL ' + c.ttl + '초')) + ' · 초당 ' + c.rps + '건 · DB ' + c.dbt + '초' + (c.chg ? ' · 5초에 원본 변경' : ''); },
  columns: ['요청', '캐시 적중률', 'DB 조회', '동시에 몰린 DB 조회', '옛 값을 받은 요청', '평균 응답 시간'],
  simulate: function (c) {
    var impl = c.impl, none = impl === 'none', inf = c.ttl === 'inf', ttl = none ? 0 : inf ? Infinity : +c.ttl, dbt = +c.dbt, lock = impl === 'lockw', chg = !!c.chg, CHG = 5;
    var DUR = 30, fmt = Lab.fmt, reqs = [], ev = [], sets = [], expireAt = -1, has = false, cacheVer = '', loadDone = -1, loadVer = '', grp = null, queries = [], chgDone = false;
    var ttlText = inf ? '만료 없음' : 'TTL ' + ttl + '초';
    // 원본의 값: 5초 전에 시작한 DB 조회는 바뀌기 전의 값(old)을, 5초부터 시작한 조회는 바뀐 값(new)을 읽는다
    function verAt(t) { return chg && t >= CHG - 1e-9 ? 'new' : 'old'; }
    function applySets(t) {
      while (sets.length && sets[0].t <= t + 1e-9) {
        var f = sets.shift(); has = true; expireAt = f.t + ttl; cacheVer = f.ver;
        if (grp) {
          ev.push({ t: f.t, k: grp.n > 1 ? 'bad' : '', s: fmt(f.t) + '초: DB에서 읽은 값을 Redis의 캐시 product에 저장했습니다(' + ttlText + '). ' + (grp.n > 1 ? '저장되기 전까지 ' + fmt(grp.start) + '초부터 요청 ' + grp.n + '건이 모두 캐시에서 값을 찾지 못해 각자 메서드 본문을 실행하고 DB를 조회했습니다.' : '이 값을 채우려고 요청 1건이 DB를 조회했습니다.')
            + (sets.length ? ' 나머지 요청도 조회가 끝나는 대로 같은 키에 다시 저장하므로, TTL은 마지막 저장(' + fmt(sets[sets.length - 1].t) + '초)부터 셉니다.' : '')
            + (grp.w ? ' 잠금 때문에 ' + grp.w + '건은 DB에 가지 않고 이 결과를 기다렸습니다.' : '')
            + (chg && f.t >= CHG - 1e-9 ? (f.ver === 'old' ? ' 이 값은 ' + fmt(CHG) + '초에 DB가 바뀌기 전에 읽은 옛 값입니다.' : ' 이 값은 ' + fmt(CHG) + '초에 DB가 바뀐 뒤에 읽은 새 값입니다.') : '') });
          grp = null;
        }
      }
    }
    var total = DUR * c.rps;
    for (var i = 0; i < total; i++) {
      var t = Math.round(i / c.rps * 1000) / 1000, r = { t: t }; reqs.push(r);
      if (chg && !chgDone && t >= CHG - 1e-9) { chgDone = true; ev.push({ t: CHG, s: fmt(CHG) + '초: DB의 상품 가격이 바뀌었습니다. 캐시의 값은 지우지 않았습니다(@CacheEvict 같은 처리가 없음). 이제 캐시에서 값을 받는 요청은, 그 값이 바뀌기 전에 읽은 것이면 옛 가격을 받습니다.' }); }
      if (none) { r.kind = 'db'; r.done = t + dbt; r.ver = verAt(t); queries.push([t, r.done]); continue; }
      applySets(t);
      if (has && t >= expireAt - 1e-9) { has = false; ev.push({ t: t, s: fmt(t) + '초: TTL이 지나 Redis에서 캐시의 값이 사라졌습니다. 이제부터 오는 요청은 캐시에서 값을 찾지 못합니다.' }); }
      if (has) { r.kind = 'hit'; r.done = t + 0.01; r.ver = cacheVer; continue; }
      if (lock && loadDone > t) { r.kind = 'wait'; r.done = loadDone; r.ver = loadVer; if (grp) grp.w = (grp.w || 0) + 1; continue; }
      r.kind = 'db'; r.done = t + dbt; r.ver = verAt(t); queries.push([t, r.done]); sets.push({ t: r.done, ver: r.ver }); sets.sort(function (a, b) { return a.t - b.t; }); loadDone = r.done; loadVer = r.ver;
      if (!grp) { grp = { start: t, n: 1 }; ev.push({ t: t, s: fmt(t) + '초: 캐시에 값이 없습니다(' + (i === 0 ? '첫 요청' : '만료 직후') + '). ' + (lock ? 'Redis에 잠금 키 product~lock을 건 이 요청만 ' : '요청이 ') + '메서드 본문을 실행해 DB를 조회합니다. 결과가 오기까지 ' + dbt + '초가 걸립니다.' }); } else grp.n++;
    }
    applySets(Infinity);
    var hits = reqs.filter(function (r) { return r.kind === 'hit'; }).length, dbq = queries.length, waits = reqs.filter(function (r) { return r.kind === 'wait'; }).length;
    var stale = reqs.filter(function (r) { return chg && r.t >= CHG - 1e-9 && r.ver === 'old'; }), lastStale = stale.length ? stale[stale.length - 1].t : -1;
    var peak = 0; queries.forEach(function (q) { var n = queries.filter(function (x) { return x[0] <= q[0] + 1e-9 && x[1] > q[0] + 1e-9; }).length; if (n > peak) peak = n; });
    var avg = reqs.reduce(function (a, r) { return a + (r.done - r.t); }, 0) / reqs.length, rate = Math.round(hits / reqs.length * 100);
    if (none) ev.push({ t: 0, s: '0.0초: 캐시가 없습니다. 모든 요청이 getProduct 본문을 실행해 DB를 조회합니다.' });
    ev.sort(function (a, b) { return a.t - b.t; });
    var sum = [];
    if (none) sum.push('같은 상품을 ' + reqs.length + '번 조회하는 데 DB를 ' + dbq + '번 읽었습니다. 자주 읽히고 잘 바뀌지 않는 데이터일수록 캐시의 효과가 큽니다.');
    else if (peak > 1 && impl === 'sync') sum.push('sync = true를 적었는데도 몰림이 그대로입니다. sync = true는 스프링이 캐시 구현의 get(key, valueLoader)를 부르게 할 뿐이고, 동시에 온 호출을 기다리게 하는 일은 캐시 구현이 합니다. Spring Data Redis 3.4부터 RedisCache는 이 일을 RedisCacheWriter에 맡기는데, RedisCacheManager.builder(connectionFactory)가 쓰는 기본 writer는 잠그지 않습니다. 그래서 값이 없는 동안 들어온 요청이 모두 본문을 실행했습니다.');
    else if (peak > 1 && !lock) sum.push('캐시가 비어 있는 순간부터 다시 채워지기 전까지(' + dbt + '초 동안) 들어온 요청이 모두 메서드 본문을 실행해 DB로 갔습니다. 요청이 많고 DB 조회가 느릴수록 몰림이 커집니다. 이것이 캐시 스탬피드이며, @Cacheable만으로는 막지 못합니다. ' + (impl === 'aside' ? '직접 짠 코드라면 잠금도 직접 짜야 합니다.' : '스프링에서는 @Cacheable(sync = true)를 적고, 저장소가 Redis라면 RedisCacheManager를 lockingRedisCacheWriter로 만들어 한 요청만 조회하게 합니다.') + ' 여러 키가 한꺼번에 만료되는 경우에는 키마다 TTL에 약간의 차이를 줍니다.');
    else if (lock) sum.push('lockingRedisCacheWriter는 Redis에 잠금 키(product~lock)를 두므로, 서버가 여러 대여도 캐시가 빌 때마다 한 요청만 DB를 조회합니다. ' + (waits ? 'DB로 몰리는 것은 막았지만, ' + waits + '건은 그 조회가 끝날 때까지 기다렸습니다.' : '이 설정에서는 조회가 끝나기 전에 들어온 요청이 없어 기다린 요청도 없었습니다.') + ' 이 잠금은 키마다가 아니라 캐시 product 전체에 걸리므로, 그동안 다른 상품을 찾는 요청도 기다립니다. 키마다 잠그려면 Redisson의 RLock 같은 분산 락으로 직접 짭니다.');
    if (impl === 'aside') sum.push('이 코드는 @Cacheable이 프록시에서 하는 일(캐시를 먼저 보고, 없으면 본문을 실행해 저장)을 RedisTemplate으로 직접 쓴 것입니다. DB 조회 수와 몰림은 @Cacheable과 같습니다.');
    if (!none && !inf) sum.push('entryTtl이 길수록 DB 조회는 줄지만, 원본이 바뀌어도 최대 TTL만큼 옛 값을 돌려줍니다. 얼마나 오래된 값까지 허용할 수 있는지가 TTL을 정하는 기준입니다.');
    if (!none && inf) sum.push('entryTtl을 적지 않으면 RedisCacheConfiguration.defaultCacheConfig()의 기본값대로 값이 만료되지 않습니다. DB 조회는 처음 캐시를 채울 때뿐이지만, 원본이 바뀌어도 캐시의 값을 지우기 전까지(@CacheEvict 등) 옛 값을 계속 돌려줍니다.');
    if (chg && !none) sum.push(stale.length ? fmt(CHG) + '초에 DB가 바뀐 뒤 요청 ' + stale.length + '건이 옛 가격을 받았습니다(마지막은 ' + fmt(lastStale) + '초에 들어온 요청). 값을 바꾸는 메서드에 @CacheEvict를 적어 캐시의 값을 함께 지우면 이 시간이 없어집니다.' : fmt(CHG) + '초에 DB가 바뀐 뒤 옛 가격을 받은 요청은 없었습니다.');
    return { total: DUR, events: ev, summary: sum, reqs: reqs, queries: queries, sets: null, ttl: ttl, row: [reqs.length + '건', rate + '%', dbq + '번', peak + '건', chg ? stale.length + '건' : '원본을 바꾸지 않음', (Math.round(avg * 100) / 100) + '초'] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, done = sim.reqs.filter(function (r) { return r.t <= t + 1e-9; }), hits = done.filter(function (r) { return r.kind === 'hit'; }).length, dbq = sim.queries.filter(function (q) { return q[0] <= t + 1e-9; }).length;
    var cs = [[done.length, '들어온 요청'], [hits, '캐시 적중'], [dbq, 'DB 조회'], [done.length ? Math.round(hits / done.length * 100) + '%' : '-', '적중률']];
    if (c.chg) cs.push([done.filter(function (r) { return r.t >= 5 - 1e-9 && r.ver === 'old'; }).length, '옛 값을 받은 요청']);
    H.counters(v, cs);
  },
  // 그림: 요청을 받은 애플리케이션이 Redis 캐시를 먼저 보고, 값이 없을 때만 DB를 조회한다. 아래 줄은 초마다 DB까지 간 조회 수다.
  draw: function (P, sim, shown, t) {
    var c = sim.c, e = 1e-9, done = sim.reqs.filter(function (r) { return r.t <= t + e; }), hits = done.filter(function (r) { return r.kind === 'hit'; }).length, flying = sim.queries.filter(function (q) { return q[0] <= t + e && q[1] > t + e; }).length, lastReq = done[done.length - 1], off = c.impl === 'none', hit = lastReq && lastReq.kind === 'hit', lockw = c.impl === 'lockw';
    var stale = done.filter(function (r) { return c.chg && r.t >= 5 - e && r.ver === 'old'; }).length, staleHit = hit && c.chg && lastReq.t >= 5 - e && lastReq.ver === 'old';
    P.size(680, 320);
    P.box('app', 16, 70, 170, 60, { cls: 'wait', title: '애플리케이션', sub: '요청 ' + done.length + '건 받음' });
    P.box('ca', 255, 70, 170, 60, { cls: off ? 'ghost' : hit ? (staleHit ? 'hot' : 'good') : done.length ? 'bad' : 'plain', title: off ? '캐시 사용 안 함' : 'Redis 캐시 product', sub: off ? ' ' : hit ? (staleHit ? '옛 값으로 응답' : '값 있음: 바로 응답') : flying ? (lockw ? '값 없음: 잠금 중' : '값 없음: DB를 기다림') : done.length ? '값 없음' : '비어 있음' });
    P.box('db', 494, 70, 170, 60, { cls: flying > 3 ? 'bad' : flying ? 'hot' : 'plain', title: 'DB', sub: flying ? '조회 ' + flying + '건 처리 중' : c.chg && t >= 5 - e ? '가격이 바뀌어 있음' : '한가함' });
    if (lastReq) { if (!off) P.arrow('a1', 'app:r', 'ca:l', { cls: hit ? 'good' : '', label: hit ? '적중' : '' }); if (!hit && flying) P.arrow('a2', 'app:t:0.7', 'db:t:0.3', { cls: flying > 3 ? 'bad' : 'hot', label: 'DB 조회 ' + flying + '건' }); }
    P.region('sec', 16, 158, 648, 96, '초마다 DB까지 간 조회 수 (1칸 = 1초)');
    for (var k = 0; k < 30; k++) { var n = sim.queries.filter(function (q) { return q[0] >= k - e && q[0] < k + 1 - e && q[0] <= t + e; }).length, past = k < t; P.box('s' + k, 26 + k * 21, 194, 20, 40, { cls: !past ? 'ghost' : n === 0 ? 'good' : n === 1 ? 'wait' : 'bad', sub: past ? String(n) : undefined, center: true }); }
    P.box('rate', 16, 270, 648, 34, { cls: 'plain', title: '캐시 적중률', right: (done.length ? Math.round(hits / done.length * 100) + '% (' + hits + ' / ' + done.length + ')' : '-') + (c.chg ? ' · 옛 값을 받은 요청 ' + stale + '건' : '') });
    P.note('요청을 받은 애플리케이션은 Redis 캐시를 먼저 보고, 값이 있으면 거기서 끝납니다(초록 화살표). 캐시에 없을 때만 애플리케이션이 메서드 본문을 실행해 DB를 조회하는 화살표가 생깁니다. 아래 줄에서 초록은 DB 조회가 없던 초, 빨강은 조회가 여러 건 몰린 초입니다.');
  },
  assume: '한 개의 키(인기 상품 하나)만 다루고, 요청은 일정한 간격으로 들어온다고 가정했습니다. 캐시 응답 시간은 0.01초로 두었습니다. 잠그는 writer에서 기다리는 요청은 조회가 끝나는 순간 값을 받는다고 단순화했습니다(실제로는 잠금 키가 사라졌는지 기본 50밀리초마다 다시 확인합니다). 캐시가 가득 차서 키를 밀어내는 제거(eviction) 정책은 다루지 않습니다. 실제로 실행해 확인한 것은 스프링(spring-context 7.0.9) 쪽입니다. 빈 캐시에 스레드 20개가 같은 키로 동시에 부르면 @Cacheable은 본문을 20번, sync = true와 ConcurrentMapCacheManager는 1번 실행했고, sync = true여도 get(key, valueLoader)를 잠그지 않는 캐시 구현에서는 20번 실행했습니다(verify/spring/cache_probe.out.txt). Redis 서버와 spring-data-redis는 실행하지 않았습니다. entryTtl, 그 기본값이 만료 없음인 것, lockingRedisCacheWriter의 잠금 키와 잠금 범위(캐시 전체), Spring Data Redis 3.4부터 기본 writer가 잠그지 않는 것은 공식 문서와 소스(RedisCache, DefaultRedisCacheWriter)와 대조했습니다. 시간과 횟수는 동작 방식을 보이기 위한 모형이며 실제 Redis를 측정한 값이 아닙니다.',
});
