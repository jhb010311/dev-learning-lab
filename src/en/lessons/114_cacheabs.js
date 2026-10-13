Lab.register({
  id: 'cacheabs', nav: 'Cache abstraction', cat: 'Spring', mode: 'step',
  title: 'With @Cacheable on a method, when does the method body not run?',
  intro: 'In Spring, you only need to put @Cacheable on a method. When the method is called again with the same arguments, the body does not run, and the value that was returned before is taken from the cache. The code that looks up the cache and stores values in it is run by a proxy on your behalf. The layer that Spring puts in between, so that the same annotations work with whatever cache store is used, is called the cache abstraction.',
  terms: ['@Cacheable', '@CacheEvict and @CachePut', 'Cache', 'Proxy', 'Self-invocation'],
  controls: [
    { id: 'mid', label: 'What is done after find(1) is called', type: 'select', value: 'none', options: [['none', 'Call find(1) again right away'], ['other', 'Call find(2), with a different argument'], ['evict', 'Call evict(1), then find(1) · @CacheEvict'], ['put', 'Call rename(1, "New keyboard"), then find(1) · @CachePut'], ['plain', 'Call renamePlain(1, "New keyboard"), then find(1) · no annotation']] },
    { id: 'via', label: 'How find is called', type: 'select', value: 'ext', options: [['ext', 'productService.find(id) from another bean'], ['self', 'detail(id) of the same class calls find(id) inside it']] },
    { id: 'data', label: 'Product with id 1', type: 'select', value: 'yes', options: [['yes', 'Is in the DB ("Keyboard")'], ['no', 'Is not in the DB (find returns null)']] },
    { id: 'unless', label: 'Add unless = "#result == null" to @Cacheable', type: 'check', value: false, show: function (c) { return c.data === 'no'; }, hint: 'This condition means that a null result is not put in the cache.' },
  ],
  presets: [
    { t: 'Default settings', q: 'How many times does the body run when you call find, which has @Cacheable, twice in a row with the same argument 1?', d: 'find is called twice with the same argument. The body runs only once.', v: { mid: 'none', via: 'ext', data: 'yes', unless: false } },
    { t: 'With a different argument', q: 'What if you call find(1) and then call find again with the argument 2?', d: 'The key is different, so the body runs again.', v: { mid: 'other', via: 'ext', data: 'yes', unless: false } },
    { t: 'Evicting with @CacheEvict', q: 'What if, after find(1), you remove 1 with evict, which has @CacheEvict, and call find again?', d: 'The value was removed from the cache, so the body runs again.', v: { mid: 'evict', via: 'ext', data: 'yes', unless: false } },
    { t: 'Replacing the value with @CachePut', q: 'What if, after find(1), you change product 1 to "New keyboard" with rename, which has @CachePut, and call find again?', d: 'The body of rename always runs, and the cache is updated with the new value.', v: { mid: 'put', via: 'ext', data: 'yes', unless: false } },
    { t: 'Changing only the DB and leaving the cache as it is', q: 'What if, after find(1), you change product 1 to "New keyboard" with renamePlain, which has no annotation, and call find again?', d: 'The second find returns the value from before the change.', v: { mid: 'plain', via: 'ext', data: 'yes', unless: false } },
    { t: 'Calling from within the same class', q: 'What if detail of the same class calls find inside it, and you call detail twice?', d: 'Caching is not applied, so the body runs every time.', v: { mid: 'none', via: 'self', data: 'yes', unless: false } },
    { t: 'A null result is cached too', q: 'What if the product with id 1 is not in the DB and find returns null?', d: 'A product that does not exist is looked up twice. Turn on unless and compare.', v: { mid: 'none', via: 'ext', data: 'no', unless: false } },
  ],
  code: function (c) {
    var self = c.via === 'self', f = function (id) { return 'productService.' + (self ? 'detail' : 'find') + '(' + id + 'L);'; };
    var calls = [f(1)].concat(c.mid === 'evict' ? ['productService.evict(1L);'] : c.mid === 'put' ? ['productService.rename(1L, "New keyboard");'] : c.mid === 'plain' ? ['productService.renamePlain(1L, "New keyboard");'] : [], [f(c.mid === 'other' ? 2 : 1)]);
    var s = '// another bean makes these calls in this order\n' + calls.join('\n') + '\n\n@Service\nclass ProductService {\n    // a map used in place of a DB\n    private final Map<Long, String> db = new HashMap<>(\n        Map.of(' + (c.data === 'yes' ? '1L, "Keyboard", ' : '') + '2L, "Mouse"));\n    private int findCount;\n\n' +
      '    @Cacheable(cacheNames = "product"' + (c.unless ? ',\n               unless = "#result == null"' : '') + ')\n    public String find(Long id) {\n        findCount++;                 // number of times the body has run\n        return db.get(id);           // null if there is no such id\n    }\n';
    if (c.mid === 'evict') s += '\n    @CacheEvict(cacheNames = "product")\n    public void evict(Long id) { }\n';
    if (c.mid === 'put') s += '\n    @CachePut(cacheNames = "product", key = "#id")\n    public String rename(Long id, String name) {\n        db.put(id, name);\n        return name;                 // the returned value goes into the cache\n    }\n';
    if (c.mid === 'plain') s += '\n    public void renamePlain(Long id, String name) {\n        db.put(id, name);            // no cache annotation\n    }\n';
    if (self) s += '\n    public String detail(Long id) {\n        return find(id);             // same as this.find(id)\n    }\n';
    return s + '}';
  },
  label: function (c) { return { none: 'Same argument again', other: 'Different argument', evict: 'After @CacheEvict', put: 'After @CachePut', plain: 'After changing only the DB' }[c.mid] + ' · ' + (c.via === 'ext' ? 'from another bean' : 'from within the same class') + ' · ' + (c.data === 'yes' ? 'product exists' : 'no product (null)' + (c.unless ? ' · unless' : '')); },
  columns: ['Times the find body ran', 'Value returned by the second find', 'Cache contents at the end'],
  simulate: function (c) {
    var self = c.via === 'self', has = c.data === 'yes', unless = !!c.unless, mid = c.mid, ev = [], sum = [];
    var db = { 1: has ? 'Keyboard' : null, 2: 'Mouse' }, cache = {}, count = 0;
    var st = { call: '', short: '', px: '', tg: '', look: '', toBody: false, self: false, dbop: '', cache: [], db: [], count: 0, second: '' };
    function q(v) { return v === null ? 'null' : '"' + v + '"'; }
    function obj(v) { return v === null ? 'null' : '"' + v + '"'; }
    function push(s, k) {
      st.cache = Object.keys(cache).sort().map(function (k2) { return [k2, cache[k2] === null ? 'null' : cache[k2]]; });
      st.db = Object.keys(db).sort().filter(function (k2) { return db[k2] !== null; }).map(function (k2) { return [k2, db[k2]]; });
      st.count = count;
      ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) });
    }
    function reset(call, short) { st.call = call; st.short = short; st.px = ''; st.tg = ''; st.look = ''; st.toBody = false; st.self = false; st.dbop = ''; }
    function find(id, nth) {
      var ord = nth === 1 ? '#1' : '#2', v;
      if (self) {
        reset('detail(' + id + 'L)', 'detail(' + id + ')'); st.px = 'No cache annotation: passes it on'; st.tg = 'Running detail'; st.toBody = true;
        push('productService.detail(' + id + 'L) call ' + ord + ': Another bean calls detail. The call arrives at the proxy, but detail has no cache annotation, so the proxy does nothing and passes the call on to the real object.');
        count++; v = db[id]; st.self = true; st.px = 'Does not see this call'; st.tg = 'find body runs (#' + count + ')'; st.dbop = 'read';
        if (nth === 2) st.second = q(v);
        push('find(id) inside detail: This is the same as calling this.find(id). The real object calls its own method directly, so the call does not go through the proxy. The cache is not looked up and the result is not stored, and the body runs (run #' + count + '). ' + (v === null ? 'There is no product with id ' + id + ' in the DB, so the body returns null.' : 'The body returns ' + obj(v) + ', which it read from the DB.'), 'bad');
        return v;
      }
      reset('find(' + id + 'L)', 'find(' + id + ')'); st.px = 'Call received';
      push('productService.find(' + id + 'L) call ' + ord + ': Another bean makes the call. The call arrives at the proxy first. The proxy sees @Cacheable and, before running the body, looks up key ' + id + (id === 2 ? '' : '') + ' in the cache "product".' + (nth === 1 ? ' The proxy does not know where the cache is actually stored. It only calls get and put on the Cache object that the CacheManager hands out, so this code and the annotations stay the same even if the store is changed from an in-memory map to Redis. Spring calls this structure the cache abstraction.' : ''));
      if (id in cache) {
        v = cache[id]; st.look = 'hit'; st.px = 'Key ' + id + ' found: returns cached value'; st.tg = 'Body not run';
        if (nth === 2) st.second = q(v);
        var stale = db[id] !== v;
        push('Cache lookup: Key ' + id + (id === 2 ? '' : '') + ' is in the cache. The proxy does not run the body of find and returns what the cache holds: ' + (v === null ? 'null, as the entry "the result is null" says' : obj(v)) + '. The number of times the body has run stays at ' + count + '.' + (stale ? ' The DB now holds "' + db[id] + '", but the cache does not know that. The call received the result from before the change.' : ''), stale ? 'bad' : 'good');
        return v;
      }
      st.look = 'miss'; st.px = 'Key ' + id + ' not found: body must run';
      push('Cache lookup: Key ' + id + (id === 2 ? '' : '') + ' is not in the cache. ' + (id === 2 ? 'The cache key is built from the arguments of the method. A call with the argument 2 looks up key 2, so it has nothing to do with the value stored under key 1.' : nth === 1 ? 'Nothing has been put in the cache yet.' : mid === 'evict' && had ? '@CacheEvict has just removed it.' : 'The first result was null, so it was not stored.') + ' The proxy calls find on the real object.');
      count++; v = db[id]; st.toBody = true; st.tg = 'find body runs (#' + count + ')'; st.dbop = 'read';
      if (nth === 2) st.second = q(v);
      push('find body runs (run #' + count + '): findCount becomes ' + count + (count === 2 ? '' : '') + '. ' + (v === null ? 'There is no product with id ' + id + ' in the DB, so the body returns null.' : 'The body finds the product with id ' + id + ' in the DB and returns ' + obj(v) + '.'));
      st.dbop = '';
      if (v === null && unless) { st.look = ''; st.px = 'null, so not stored (unless)'; push('Checking unless = "#result == null": The result is null, so the condition is true. When unless is true, the result is not put in the cache.', ''); }
      else {
        cache[id] = v; st.look = 'store'; st.px = 'Stores the result in the cache';
        push('The proxy stores the result in the cache: key ' + id + ' → ' + (v === null ? 'null. Even when the result is null, the default settings store "the result for key ' + id + ' is null".' : v + '. The next call with the same argument uses this value.' + (unless ? ' The result is not null, so the unless condition does not apply.' : '')), '');
      }
      return v;
    }
    find(1, 1);
    if (mid === 'evict') {
      var had = 1 in cache; delete cache[1];
      reset('evict(1L)', 'evict(1)'); st.px = 'Removes key 1 from the cache'; st.look = 'evict'; st.tg = 'evict runs (empty body)'; st.toBody = true;
      push('productService.evict(1L) call: The proxy sees @CacheEvict and removes key 1 from the cache "product".' + (had ? ' The next time find(1) is called, the cache has no value for it.' : ' Key 1 is not in the cache now, so there is nothing to remove. Even so, no error occurs.'), '');
    }
    if (mid === 'put') {
      db[1] = 'New keyboard';
      reset('rename(1L, "New keyboard")', 'rename'); st.px = '@CachePut: always runs the body'; st.tg = 'rename body runs'; st.toBody = true; st.dbop = 'update';
      push('productService.rename(1L, "New keyboard") call: A method annotated with @CachePut always runs its body, whether or not the cache has a value. The body ' + (has ? 'changes id 1 in the DB to "New keyboard"' : 'puts id 1 in the DB as "New keyboard"') + ' and returns that name.', '');
      var had2 = 1 in cache; cache[1] = 'New keyboard'; st.dbop = ''; st.look = 'store'; st.px = 'Stores the result in the cache';
      push('The proxy stores the value returned by rename in the cache: key 1 → New keyboard.' + (had2 ? ' This overwrites the ' + (has ? '"Keyboard"' : 'null') + ' that was there before.' : ''), 'good');
    }
    if (mid === 'plain') {
      db[1] = 'New keyboard';
      reset('renamePlain(1L, "New keyboard")', 'renamePlain'); st.px = 'No cache annotation: passes it on'; st.tg = 'renamePlain body runs'; st.toBody = true; st.dbop = 'update';
      push('productService.renamePlain(1L, "New keyboard") call: This method has no cache annotation. Only the DB changes, where id 1 ' + (has ? 'becomes "New keyboard"' : 'is added as "New keyboard"') + ', and nothing touches the cache.', '');
    }
    var second = find(mid === 'other' ? 2 : 1, 2);
    var ck = Object.keys(cache).sort(), cstr = ck.length ? ck.map(function (k2) { return k2 + '=' + (cache[k2] === null ? 'null' : cache[k2]); }).join(', ') : 'empty';
    if (self) {
      sum.push('A find that is called from within the same class does not go through the proxy, so @Cacheable is not applied. The body runs every time, with no error and no warning. To apply caching, call find from another bean or move find to another bean.');
      if (mid === 'put') sum.push('rename was called from another bean, so @CachePut was applied and the value went into the cache. But find does not look at the cache, so that value was not used.');
    } else if (mid === 'none') {
      if (count === 1 && second !== null) sum.push('When the method is called again with the same argument, the proxy returns the value from the cache and does not run the body. The longer the body takes, as with a DB query or an external call, the larger the effect.');
      if (count === 1 && second === null) sum.push('With the default settings, a null result is cached too. This saves looking up again something that "does not exist", but if that data is created later, the calls keep receiving null until the cache is evicted. To avoid caching null, add unless = "#result == null".');
      if (count === 2) sum.push('When the unless condition is true, the result is not put in the cache. null was not stored, so the second call also ran the body.');
    } else if (mid === 'other') sum.push('By default, the cache key is the arguments of the method. A different argument means a different key, so the body runs again, and the result is stored separately for each key.');
    else if (mid === 'evict') sum.push('@CacheEvict removes a value from the cache. The next call runs the body again and stores the result anew. Put it on methods that change or delete data so that no stale value remains in the cache.');
    else if (mid === 'put') sum.push('Unlike @Cacheable, @CachePut does not skip the body. It always runs the body and replaces the value in the cache with the returned value. That is why the next find received the new value without running the body.');
    else if (count === 1) sum.push('When data is changed by a method that has no cache annotation, the ' + (has ? 'value' : 'null') + ' from before the change remains in the cache. Put @CacheEvict or @CachePut on methods that change data so that the cache is updated together with the data.');
    else sum.push('The first result was null and was not put in the cache, so the second call ran the body and read the changed value. Once a value has gone into the cache, changing only the DB leaves the stale value in the cache.');
    return { events: ev, summary: sum, self: self, row: [count + '', q(second), cstr] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the calls one step at a time.'); return; }
    H.table(v, ['Key', 'Value'], s.cache.map(function (r) { return { cells: [r[0], { v: r[1], cls: r[1] === 'null' ? 'hot' : '' }] }; }), 'Cache "product"' + (s.cache.length ? '' : ' (empty)'));
  },
  // Diagram: the upper box is the proxy and the lower box is the real object, and they are two different objects (the proxy holds a reference to it). The proxy looks at the cache at the upper right first, and if the value is there, the call is not passed on to the real object. The call goes to the DB at the lower right only when the body runs.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { call: '', short: '', px: '', tg: '', look: '', toBody: false, self: false, dbop: '', cache: [], db: [], count: 0, second: '' };
    var lines = function (rows) { return rows.length ? rows.map(function (r) { return r[0] + ' → ' + r[1]; }) : ['empty']; };
    P.size(680, 318);
    P.box('caller', 10, 17, 96, 56, { cls: s.call ? 'wait' : 'plain', title: 'Other bean', sub: 'Caller' });
    P.box('px', 176, 14, 268, 62, { cls: s.px.indexOf('Does not see') >= 0 ? 'bad' : s.look === 'hit' ? 'good' : s.px ? 'hot' : 'plain', title: 'ProductService proxy', sub: s.px || 'Idle' });
    P.box('tg', 176, 130, 268, 96, { cls: s.tg.indexOf('not run') >= 0 ? 'ghost' : s.tg ? 'wait now' : 'plain', title: 'Real ProductService', sub: s.tg || 'Idle' });
    P.box('cache', 486, 14, 182, 92, { cls: s.look === 'hit' ? 'good' : s.look === 'store' ? 'hot' : s.look === 'evict' || s.look === 'miss' ? 'wait' : 'plain', title: 'Cache "product"', sub: lines(s.cache) });
    P.text('store', 577, 122, 'Store: an in-memory map', { cls: 'mut', anchor: 'middle' });
    P.box('db', 486, 132, 182, 92, { cls: s.dbop ? 'hot' : 'plain', title: 'DB', sub: lines(s.db) });
    if (s.call) P.arrow('in', 'caller:r', 'px:l', { label: s.short });
    if (s.look) P.arrow('look', 'px:r:0.75', 'cache:l', { cls: s.look === 'hit' ? 'good' : s.look === 'miss' ? 'mut' : '', label: { hit: 'hit', miss: 'miss', store: 'put', evict: 'evict' }[s.look] });
    P.arrow('pass', 'px:b', 'tg:t', s.toBody && !s.self ? { label: 'pass on' } : { cls: 'mut', label: 'reference' });
    if (s.self) P.arrow('selfcall', 'tg:l:0.3', 'tg:l:0.75', { cls: 'bad', label: 'this.find' });
    if (s.dbop) P.arrow('dbq', 'tg:r', 'db:l', { label: s.dbop });
    P.box('cnt', 12, 252, 324, 38, { cls: s.count ? 'hot' : 'ghost', title: 'Times the find body ran', right: s.count + '' });
    P.box('res', 344, 252, 324, 38, { cls: s.second ? 'good' : 'ghost', title: 'Second find returned', right: s.second || 'Not called yet' });
    P.note('The upper box is the proxy, and the lower box is the real object. They are two different objects: the proxy holds a reference to the real object and passes the call on to it. The red arrow, where the real object calls its own method with this, does not go through the proxy, so the body runs regardless of the cache.');
  },
  assume: 'All 40 combinations were run on Spring Framework 7.0.9 (the version included in Spring Boot 4.1.1) on this PC with @EnableCaching and ConcurrentMapCacheManager, and these were checked against the results: the number of times the find body ran, the value returned by the second find, and the cache contents at the end. The same runs also confirmed that the body of rename runs even when the cache has a value, and that removing a key that is not in the cache with @CacheEvict does not cause an error. ConcurrentMapCacheManager is the simplest cache manager, which stores values in maps in the memory of the application, and it has no expiration time (TTL) and no size limit. Expiration and requests that arrive at the same time are covered in the "Caching and TTL" lab. Whether null can be put in a cache depends on the settings of the cache implementation, and ConcurrentMapCacheManager stores null by default (the behavior of other cache implementations was not verified by execution). The DB was replaced with an in-memory map both on the screen and in the runs. The code on the screen assumes that @EnableCaching is turned on, and to use a parameter name as in key = "#id", the code must be compiled with the -parameters option. When the code was compiled without this option and run on this PC, an IllegalArgumentException saying that the key is null was thrown at the moment rename was called (the build settings of a project created with Spring Boot include this option). The reason why proxy-based features are not applied to calls made from within the same class is covered in detail in the "Proxies and self-invocation" lab. This lab covers only the case where the calls are made one after another on a single thread. The case where several threads look up the same key for the first time at the same moment was not run.',
});
