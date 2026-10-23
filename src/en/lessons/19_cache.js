Lab.register({
  id: 'cache', nav: 'Caching and TTL', cat: 'High traffic', mode: 'time',
  title: 'If you give @Cacheable a TTL, how much does it reduce database queries, and when do requests pile up again?',
  why: 'If product information is read from the database again each time it is viewed, the database repeats the same work even though the result is the same every time, and when requests increase, the database is the first thing that cannot hold up. A cache keeps a result that has been read once in a memory store for a short time and returns it from there from the next request on, so that fewer requests go to the database. But if a value is kept forever, the cache never learns that the original changed, so we decide after how long to discard a value (the TTL), and that brought a new problem: at the moment the TTL ends, requests rush to the database all at once.',
  use: 'It is used for data that is read often and changes occasionally, such as a product detail, a popular post list, and common codes. In Spring, you write @Cacheable on a lookup method, and if several servers must see the same cache, you attach Redis as the store and set the TTL with entryTtl of RedisCacheManager. For a key that many requests rush to, you let only one request query the database by using @Cacheable(sync = true) together with a locking RedisCacheWriter. Values that must always be the latest, such as inventory or balance right before payment, are read from the database without going through the cache.',
  intro: 'One popular product is requested continuously for 30 seconds. The lookup method getProduct has Spring\'s @Cacheable on it, and the cache store is Redis (RedisCacheManager, provided by Spring Data Redis). @Cacheable looks at the cache first, and only when there is no value does it run the method body (the database query) and store the result in the cache. A stored value disappears from Redis after the time (TTL) set with entryTtl of RedisCacheConfiguration. This lab looks at the operating problems that come after that: requests rushing to the database at the moment the TTL ends (a cache stampede), and the cache giving an old value during the TTL even though the original has changed.',
  terms: ['TTL (time to live)', 'RedisCacheManager and entryTtl', 'Cache stampede', '@Cacheable(sync = true)', 'Locking RedisCacheWriter', 'Stale data in a cache', '@Cacheable', 'Redis', 'Distributed lock', 'Cache-aside pattern', 'RedisTemplate'], ranks: ['cache', 'traffic', 'nosql'],
  controls: [
    { id: 'impl', label: 'How to put a cache on getProduct', type: 'select', value: 'plain', options: [['plain', '@Cacheable'], ['sync', '@Cacheable(sync = true), RedisCacheManager with default settings'], ['lockw', '@Cacheable(sync = true), RedisCacheManager with lockingRedisCacheWriter'], ['none', 'No @Cacheable (no cache is used)'], ['aside', 'Cache-aside written by hand with RedisTemplate, without @Cacheable']] },
    { id: 'ttl', label: 'TTL of the product cache (entryTtl)', type: 'select', value: '10', options: [['5', '5s'], ['10', '10s'], ['inf', 'entryTtl not written (never expires)']], show: function (c) { return c.impl !== 'none'; } },
    { id: 'rps', label: 'Requests per second', type: 'range', min: 1, max: 20, value: 5, fmt: function (v) { return v + ''; } },
    { id: 'dbt', label: 'Time for one database query', type: 'select', value: '1', options: [['0.2', '0.2s'], ['1', '1s'], ['2', '2s']] },
    { id: 'chg', label: 'Change the product price in the database at 5s (the value in the cache is not erased)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'How do requests reach the database when you write @Cacheable and set entryTtl to 10s, 5 requests arrive per second, and one database query takes 1s?', d: 'TTL 10s. Each time the value disappears, several requests that arrive before it is filled again go to the database at the same time.', v: { impl: 'plain', ttl: '10', rps: 5, dbt: '1', chg: false } },
    { t: 'Without a cache', q: 'What if you remove @Cacheable?', d: 'Every request runs the method body and queries the database.', v: { impl: 'none', ttl: '10', rps: 5, dbt: '1', chg: false } },
    { t: 'Many requests and a slow database', q: 'What if you change the requests per second to 20 and the time for one database query to 2s?', d: 'All 40 requests that arrive from the moment the value disappears until it is filled again query the database (a cache stampede).', v: { impl: 'plain', ttl: '10', rps: 20, dbt: '2', chg: false } },
    { t: 'Writing only sync = true', q: 'What if you change to @Cacheable(sync = true) in the same situation, but leave RedisCacheManager at its default settings?', d: 'The pile-up stays. sync = true leaves the locking to the cache implementation, and the default RedisCacheWriter does not lock.', v: { impl: 'sync', ttl: '10', rps: 20, dbt: '2', chg: false } },
    { t: 'With a locking writer', q: 'What if you also make RedisCacheManager with lockingRedisCacheWriter, in addition to sync = true?', d: 'Thanks to the lock key in Redis, only one request queries the database, and the others wait for its result.', v: { impl: 'lockw', ttl: '10', rps: 20, dbt: '2', chg: false } },
    { t: 'When the source changes', q: 'What if, in a cache with entryTtl of 10s, you change the price in the database at 5s and do not erase the cache?', d: 'Until the value in the cache disappears and is read again, requests receive the price from before the change.', v: { impl: 'plain', ttl: '10', rps: 5, dbt: '1', chg: true } },
    { t: 'Shorten the TTL to 5s', q: 'What if you shorten entryTtl to 5s in the same situation?', d: 'Fewer requests receive an old value, but there are more database queries.', v: { impl: 'plain', ttl: '5', rps: 5, dbt: '1', chg: true } },
    { t: 'Not writing entryTtl', q: 'What if you do not write entryTtl, so the value never expires, and change the price in the database at 5s?', d: 'The database is queried only when the cache is first filled, but every request after the change receives the old price.', v: { impl: 'plain', ttl: 'inf', rps: 5, dbt: '1', chg: true } },
    { t: 'How it works underneath', q: 'What if you write the same thing (cache-aside) by hand with RedisTemplate, without @Cacheable, and run it with 20 requests per second and a 2s database query?', d: 'What @Cacheable did in the proxy is written directly in the method body. The result is the same as with @Cacheable, and the same pile-up happens.', v: { impl: 'aside', ttl: '10', rps: 20, dbt: '2', chg: false } },
  ],
  // The code on the screen is compiled with javac by verify/spring/cmp_cache.js, together with stand-ins (verify/spring/cache_stubs) that copy the official signatures of Spring Data Redis.
  code: function (c) {
    var impl = c.impl, none = impl === 'none', aside = impl === 'aside', sync = impl === 'sync' || impl === 'lockw', lockw = impl === 'lockw', inf = c.ttl === 'inf', o = [];
    o.push('// The import lines are omitted.');
    if (aside) o.push('// Provided by Spring Data Redis (spring-data-redis): RedisTemplate');
    else if (!none) o.push('// Provided by Spring Data Redis (spring-data-redis): RedisConnectionFactory, RedisCacheManager, RedisCacheConfiguration' + (lockw ? ', RedisCacheWriter' : ''));
    o.push('// Example classes we made (declarations omitted): Product, ProductRepository');
    o.push('');
    if (!none && !aside) {
      o.push('// Turn the caching feature on and register as a bean a RedisCacheManager that uses Redis as the cache store', '@Configuration', '@EnableCaching', 'class CacheConfig {', '    // connectionFactory: a bean that Spring Boot creates from the Redis connection settings (spring.data.redis.host and so on)', '    @Bean', '    RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {');
      if (inf) o.push('        // If entryTtl is not written, the value never expires, which is the default', '        RedisCacheConfiguration product = RedisCacheConfiguration.defaultCacheConfig();');
      else o.push('        // A value in the product cache disappears from Redis ' + c.ttl + ' seconds after it is stored', '        RedisCacheConfiguration product = RedisCacheConfiguration.defaultCacheConfig()', '                .entryTtl(Duration.ofSeconds(' + c.ttl + '));');
      if (lockw) o.push('        // A writer that puts a lock key (product~lock) in Redis: with sync = true, only one request runs the body', '        return RedisCacheManager.builder(RedisCacheWriter.lockingRedisCacheWriter(connectionFactory))');
      else o.push('        // The default writer used by builder(connectionFactory) does not lock', '        return RedisCacheManager.builder(connectionFactory)');
      o.push('                .withCacheConfiguration("product", product)', '                .build();', '    }', '}', '');
    }
    o.push(aside ? '// An example product service we made. The cache is written by hand with RedisTemplate, without @Cacheable' : '// An example product service we made', '@Service', 'class ProductService {', '    private final ProductRepository productRepository;');
    if (aside) o.push('    // A RedisTemplate<String, Product> bean has to be registered separately (the registration code is omitted)', '    private final RedisTemplate<String, Product> redisTemplate;');
    o.push('');
    if (aside) o.push('    ProductService(ProductRepository productRepository, RedisTemplate<String, Product> redisTemplate) {', '        this.productRepository = productRepository;', '        this.redisTemplate = redisTemplate;', '    }');
    else o.push('    ProductService(ProductRepository productRepository) {', '        this.productRepository = productRepository;', '    }');
    o.push('');
    if (!none && !aside) {
      o.push('    // Look for a value with key id in the product cache, and only when there is none, run the body and store the result');
      if (sync) o.push('    // sync = true: asks the cache implementation to let only one call run the body when the same key is looked up at the same time', '    @Cacheable(cacheNames = "product", key = "#id", sync = true)');
      else o.push('    @Cacheable(cacheNames = "product", key = "#id")');
    }
    o.push('    public Product getProduct(long id) {');
    if (aside) {
      o.push('        String key = "product:" + id;', '        // Look at the cache first', '        Product cached = redisTemplate.opsForValue().get(key);', '        if (cached != null) {', '            return cached;   // cache hit', '        }',
        '        // If there is none, read from the database (' + c.dbt + 's)', '        Product p = productRepository.findById(id).orElseThrow();');
      if (inf) o.push('        // Store it in the cache (without a time, it never expires)', '        redisTemplate.opsForValue().set(key, p);');
      else o.push('        // Store it in the cache with a TTL of ' + c.ttl + 's', '        redisTemplate.opsForValue().set(key, p, Duration.ofSeconds(' + c.ttl + '));');
      o.push('        return p;');
    } else o.push('        // Database query (' + c.dbt + 's)', '        return productRepository.findById(id).orElseThrow();');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { plain: '@Cacheable', sync: 'sync = true · default writer', lockw: 'sync = true · locking writer', none: 'No cache', aside: 'RedisTemplate by hand' }[c.impl] + (c.impl === 'none' ? '' : ' · ' + (c.ttl === 'inf' ? 'Never expires' : 'TTL ' + c.ttl + 's')) + ' · ' + c.rps + ' requests/s · DB ' + c.dbt + 's' + (c.chg ? ' · Source changes at 5s' : ''); },
  columns: ['Requests', 'Cache hit rate', 'Database queries', 'Peak simultaneous database queries', 'Requests that received an old value', 'Average response time'],
  simulate: function (c) {
    var impl = c.impl, none = impl === 'none', inf = c.ttl === 'inf', ttl = none ? 0 : inf ? Infinity : +c.ttl, dbt = +c.dbt, lock = impl === 'lockw', chg = !!c.chg, CHG = 5;
    var DUR = 30, fmt = Lab.fmt, reqs = [], ev = [], sets = [], expireAt = -1, has = false, cacheVer = '', loadDone = -1, loadVer = '', grp = null, queries = [], chgDone = false;
    var ttlText = inf ? 'never expires' : 'TTL ' + ttl + 's';
    // The value in the source: a database query that started before 5s reads the value from before the change (old), and a query that started at 5s or later reads the changed value (new)
    function verAt(t) { return chg && t >= CHG - 1e-9 ? 'new' : 'old'; }
    function applySets(t) {
      while (sets.length && sets[0].t <= t + 1e-9) {
        var f = sets.shift(); has = true; expireAt = f.t + ttl; cacheVer = f.ver;
        if (grp) {
          ev.push({ t: f.t, k: grp.n > 1 ? 'bad' : '', s: fmt(f.t) + 's: The value read from the database was stored in the product cache in Redis (' + ttlText + '). ' + (grp.n > 1 ? 'Before it was stored, ' + grp.n + ' requests, starting at ' + fmt(grp.start) + 's, all failed to find the value in the cache, so each ran the method body and queried the database.' : 'One request queried the database to fill this value.')
            + (sets.length ? ' The other requests store the value again under the same key as their queries finish, so the TTL is counted from the last store (' + fmt(sets[sets.length - 1].t) + 's).' : '')
            + (grp.w ? ' Because of the lock, ' + grp.w + (grp.w === 1 ? ' request' : ' requests') + ' did not go to the database and waited for this result.' : '')
            + (chg && f.t >= CHG - 1e-9 ? (f.ver === 'old' ? ' This value is an old one, read before the database changed at ' + fmt(CHG) + 's.' : ' This value is a new one, read after the database changed at ' + fmt(CHG) + 's.') : '') });
          grp = null;
        }
      }
    }
    var total = DUR * c.rps;
    for (var i = 0; i < total; i++) {
      var t = Math.round(i / c.rps * 1000) / 1000, r = { t: t }; reqs.push(r);
      if (chg && !chgDone && t >= CHG - 1e-9) { chgDone = true; ev.push({ t: CHG, s: fmt(CHG) + 's: The product price in the database changed. The value in the cache was not erased (there is no handling such as @CacheEvict). From now on, a request that gets its value from the cache receives the old price if that value was read before the change.' }); }
      if (none) { r.kind = 'db'; r.done = t + dbt; r.ver = verAt(t); queries.push([t, r.done]); continue; }
      applySets(t);
      if (has && t >= expireAt - 1e-9) { has = false; ev.push({ t: t, s: fmt(t) + 's: The TTL has passed, so the value in the cache was removed from Redis. From now on, requests that arrive will not find the value in the cache.' }); }
      if (has) { r.kind = 'hit'; r.done = t + 0.01; r.ver = cacheVer; continue; }
      if (lock && loadDone > t) { r.kind = 'wait'; r.done = loadDone; r.ver = loadVer; if (grp) grp.w = (grp.w || 0) + 1; continue; }
      r.kind = 'db'; r.done = t + dbt; r.ver = verAt(t); queries.push([t, r.done]); sets.push({ t: r.done, ver: r.ver }); sets.sort(function (a, b) { return a.t - b.t; }); loadDone = r.done; loadVer = r.ver;
      if (!grp) { grp = { start: t, n: 1 }; ev.push({ t: t, s: fmt(t) + 's: The cache has no value (' + (i === 0 ? 'the first request' : 'right after expiration') + '). ' + (lock ? 'Only this request, which set the lock key product~lock in Redis, ' : 'The request ') + 'runs the method body to query the database. It takes ' + dbt + 's for the result to come back.' }); } else grp.n++;
    }
    applySets(Infinity);
    var hits = reqs.filter(function (r) { return r.kind === 'hit'; }).length, dbq = queries.length, waits = reqs.filter(function (r) { return r.kind === 'wait'; }).length;
    var stale = reqs.filter(function (r) { return chg && r.t >= CHG - 1e-9 && r.ver === 'old'; }), lastStale = stale.length ? stale[stale.length - 1].t : -1;
    var peak = 0; queries.forEach(function (q) { var n = queries.filter(function (x) { return x[0] <= q[0] + 1e-9 && x[1] > q[0] + 1e-9; }).length; if (n > peak) peak = n; });
    var avg = reqs.reduce(function (a, r) { return a + (r.done - r.t); }, 0) / reqs.length, rate = Math.round(hits / reqs.length * 100);
    if (none) ev.push({ t: 0, s: '0.0s: There is no cache. Every request runs the getProduct body and queries the database.' });
    ev.sort(function (a, b) { return a.t - b.t; });
    var sum = [];
    if (none) sum.push('The same product was requested ' + reqs.length + ' times, and the database was read ' + dbq + ' times. The more often data is read and the less often it changes, the more a cache helps.');
    else if (peak > 1 && impl === 'sync') sum.push('Even though sync = true was written, the pile-up stays the same. sync = true only makes Spring call get(key, valueLoader) of the cache implementation, and making calls that arrive at the same time wait is done by the cache implementation. Since Spring Data Redis 3.4, RedisCache leaves this job to RedisCacheWriter, but the default writer used by RedisCacheManager.builder(connectionFactory) does not lock. So every request that arrived while there was no value ran the body.');
    else if (peak > 1 && !lock) sum.push('From the moment the cache was empty until it was filled again (during ' + dbt + 's), all the requests that arrived ran the method body and went to the database. The more requests there are and the slower the database query is, the bigger the pile-up. This is a cache stampede, and @Cacheable alone cannot prevent it. ' + (impl === 'aside' ? 'In code you write yourself, you also have to write the lock yourself.' : 'In Spring, you write @Cacheable(sync = true), and if the store is Redis, you make RedisCacheManager with lockingRedisCacheWriter so that only one request queries the database.') + ' When many keys expire at the same time, give each key a slightly different TTL.');
    else if (lock) sum.push('lockingRedisCacheWriter puts a lock key (product~lock) in Redis, so even with several servers, only one request queries the database each time the cache becomes empty. ' + (waits ? 'This protected the database from the pile-up, but ' + waits + (waits === 1 ? ' request' : ' requests') + ' had to wait until that query finished.' : 'In this setting, no request arrived before the query finished, so no request had to wait.') + ' This lock covers the whole product cache, not each key, so requests that look for other products also wait in the meantime. To lock each key, you write it yourself with a distributed lock such as RLock of Redisson.');
    if (impl === 'aside') sum.push('This code is what @Cacheable does in the proxy (look at the cache first, and if there is nothing, run the body and store the result), written directly with RedisTemplate. The number of database queries and the pile-up are the same as with @Cacheable.');
    if (!none && !inf) sum.push('The longer the entryTtl, the fewer the database queries, but even when the source changes, the cache keeps returning the old value for up to the TTL. How old a value you can accept is the criterion for choosing the TTL.');
    if (!none && inf) sum.push('If you do not write entryTtl, the value never expires, which is the default of RedisCacheConfiguration.defaultCacheConfig(). The database is queried only when the cache is first filled, but even when the source changes, the cache keeps returning the old value until you erase the value in the cache (with @CacheEvict and so on).');
    if (chg && !none) sum.push(stale.length ? 'After the database changed at ' + fmt(CHG) + 's, ' + stale.length + (stale.length === 1 ? ' request' : ' requests') + ' received the old price (the last one arrived at ' + fmt(lastStale) + 's). If you write @CacheEvict on the method that changes the value so that the value in the cache is erased together, this period goes away.' : 'No request received the old price after the database changed at ' + fmt(CHG) + 's.');
    return { total: DUR, events: ev, summary: sum, reqs: reqs, queries: queries, sets: null, ttl: ttl, row: [String(reqs.length), rate + '%', String(dbq), String(peak), chg ? String(stale.length) : 'Source not changed', (Math.round(avg * 100) / 100) + 's'] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, done = sim.reqs.filter(function (r) { return r.t <= t + 1e-9; }), hits = done.filter(function (r) { return r.kind === 'hit'; }).length, dbq = sim.queries.filter(function (q) { return q[0] <= t + 1e-9; }).length;
    var cs = [[done.length, 'Requests received'], [hits, 'Cache hits'], [dbq, 'Database queries'], [done.length ? Math.round(hits / done.length * 100) + '%' : '-', 'Hit rate']];
    if (c.chg) cs.push([done.filter(function (r) { return r.t >= 5 - 1e-9 && r.ver === 'old'; }).length, 'Requests with an old value']);
    H.counters(v, cs);
  },
  // Diagram: The application that received a request looks at the Redis cache first and queries the database only when the value is missing. The row below shows the number of queries that reached the database in each second.
  draw: function (P, sim, shown, t) {
    var c = sim.c, e = 1e-9, done = sim.reqs.filter(function (r) { return r.t <= t + e; }), hits = done.filter(function (r) { return r.kind === 'hit'; }).length, flying = sim.queries.filter(function (q) { return q[0] <= t + e && q[1] > t + e; }).length, lastReq = done[done.length - 1], off = c.impl === 'none', hit = lastReq && lastReq.kind === 'hit', lockw = c.impl === 'lockw';
    var stale = done.filter(function (r) { return c.chg && r.t >= 5 - e && r.ver === 'old'; }).length, staleHit = hit && c.chg && lastReq.t >= 5 - e && lastReq.ver === 'old';
    P.size(680, 320);
    P.box('app', 16, 70, 170, 60, { cls: 'wait', title: 'Application', sub: 'Received: ' + done.length });
    P.box('ca', 255, 70, 170, 60, { cls: off ? 'ghost' : hit ? (staleHit ? 'hot' : 'good') : done.length ? 'bad' : 'plain', title: off ? 'Cache not used' : 'Redis cache: product', sub: off ? ' ' : hit ? (staleHit ? 'Replies: old value' : 'Has value: replies') : flying ? (lockw ? 'No value: locked' : 'Waiting for DB') : done.length ? 'No value' : 'Empty' });
    P.box('db', 494, 70, 170, 60, { cls: flying > 3 ? 'bad' : flying ? 'hot' : 'plain', title: 'DB', sub: flying ? 'In progress: ' + flying : c.chg && t >= 5 - e ? 'Price changed' : 'Idle' });
    if (lastReq) { if (!off) P.arrow('a1', 'app:r', 'ca:l', { cls: hit ? 'good' : '', label: hit ? 'Hit' : '' }); if (!hit && flying) P.arrow('a2', 'app:t:0.7', 'db:t:0.3', { cls: flying > 3 ? 'bad' : 'hot', label: 'DB queries: ' + flying }); }
    P.region('sec', 16, 158, 648, 96, 'Queries that reached the database each second (1 box = 1 second)');
    for (var k = 0; k < 30; k++) { var n = sim.queries.filter(function (q) { return q[0] >= k - e && q[0] < k + 1 - e && q[0] <= t + e; }).length, past = k < t; P.box('s' + k, 26 + k * 21, 194, 20, 40, { cls: !past ? 'ghost' : n === 0 ? 'good' : n === 1 ? 'wait' : 'bad', sub: past ? String(n) : undefined, center: true }); }
    P.box('rate', 16, 270, 648, 34, { cls: 'plain', title: 'Cache hit rate', right: (done.length ? Math.round(hits / done.length * 100) + '% (' + hits + ' / ' + done.length + ')' : '-') + (c.chg ? ' · Requests with an old value: ' + stale : '') });
    P.note('The application that received a request looks at the Redis cache first, and if the value is there, it ends there (green arrow). An arrow appears only when the value is missing from the cache, showing the application running the method body to query the database. In the row below, green is a second with no database query, and red is a second when several queries piled up.');
  },
  assume: 'Only one key (one popular product) is handled, and requests are assumed to arrive at regular intervals. The cache response time is set to 0.01s. With the locking writer, a waiting request is simplified to receive the value at the moment the query finishes (in reality, it checks again every 50 milliseconds by default whether the lock key has disappeared). The eviction policy, which removes keys when the cache is full, is not covered here. What was actually run is the Spring side (spring-context 7.0.9). When 20 threads called with the same key at the same time on an empty cache, @Cacheable ran the body 20 times, sync = true with ConcurrentMapCacheManager ran it 1 time, and even with sync = true, a cache implementation that does not lock get(key, valueLoader) ran it 20 times (verify/spring/cache_probe.out.txt). The Redis server and spring-data-redis were not run. entryTtl, the fact that its default is never expires, the lock key and the lock scope (the whole cache) of lockingRedisCacheWriter, and the fact that since Spring Data Redis 3.4 the default writer does not lock were checked against the official documentation and the source (RedisCache, DefaultRedisCacheWriter). The times and counts are a model that shows how the behavior works, and they are not values measured on a real Redis.',
});
