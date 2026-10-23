Lab.register({
  id: 'cache_basic', nav: 'Caches', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['cache', 'cacheabs', 'etag', 'redis'],
  title: 'What is a cache, and what do you gain and lose by using one?',
  why: 'If something that takes time, such as a database query or a call to another server, is done again for every request even though the same answer is known to come out, the user waits every time and the same work piles up on the original source. A cache keeps an answer, once obtained, in a place from which it can be fetched quickly and reuses it, so that slow work is not repeated. In return, when the original changes, you have to separately take care of when to discard the value in the cache.',
  use: 'Things that are read often but change rarely, such as product information, category lists, and settings, are put in a cache. In Spring, you write @EnableCaching on a configuration class, @Cacheable on a method that looks something up, and @CacheEvict on a method that changes the value. Where the cache is kept is chosen with a CacheManager bean, and the same annotations work from the memory of a single server to Redis, which several servers look at together. Things that must always have the current value, such as remaining stock or an account balance, are not put in a cache, or the value in the cache is deleted immediately when the value changes.',
  intro: 'A cache is a device that writes down a result that took a long time to get, in a place close by, and hands out what it wrote down when the same thing is asked for again, without going to the source. A cache is not the source. It is a copy of the value from the moment it was read from the source, so after the source changes, it can hand out an old value. In Spring you do not write the cache yourself. You write annotations that Spring provides. In the code on the screen, @EnableCaching on the CacheConfig class turns the caching feature on, and the ConcurrentMapCacheManager registered with @Bean (a class provided by Spring) keeps a cache named product in memory. If you write @Cacheable("product") above the find method of ProductService (an example class we made), Spring looks at the product cache around the call to find and writes down the result. The body of find reads the value from the source (a Map that stands in for a database) and counts the reads from the source with loadCount. The lab does not measure real time. It shows "how many times the slow work was done" by the number of reads from the source. Caller (an example class we made) looks up product 1 twice with the ProductService bean that Spring supplied. You can remove the @Cacheable line, change the source with rename between the two lookups, or write @CacheEvict above rename, and you see how many times the source is read and whether the second value you receive is the same as the source. The last question compares what @Cacheable does with a version written by hand with a Map.',
  terms: ['Cache', 'Cache hits and misses', '@Cacheable', '@CacheEvict and @CachePut', '@EnableCaching and CacheManager', 'Stale data in a cache'],
  controls: [
    { id: 'cache', label: 'How to put a cache on find', type: 'select', value: 'spring', options: [['spring', 'Write @Cacheable("product") above find'], ['none', 'Remove the @Cacheable line (no cache)'], ['map', 'Write it by hand with a Map, without @Cacheable']] },
    { id: 'mid', label: 'What happens between the two lookups of product 1', type: 'select', value: 'none', options: [['none', 'Nothing'], ['rename', 'Change only the source with rename(1L, "mouse")'], ['evict', 'Write @CacheEvict above rename and call rename(1L, "mouse")']], hint: 'In the cache written by hand with a Map, the cache.remove(id) line in rename does the same job as @CacheEvict.' },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a cache look like, and how many times is the source read when you look up product 1 twice with find that has @Cacheable?', d: 'find has @Cacheable("product"). You looked up twice, but the source is read only once.', v: { cache: 'spring', mid: 'none' } },
    { t: 'Removing @Cacheable', q: 'What if you remove the @Cacheable line and look up the same product 1 twice?', d: 'The find body runs every time you look up, so the source is read twice.', v: { cache: 'none', mid: 'none' } },
    { t: 'The source changes between the two lookups', q: 'What if @Cacheable is there and you change the value in the source with rename(1L, "mouse") between the two lookups?', d: 'The source is read only once, but the second value you receive is different from the source.', v: { cache: 'spring', mid: 'rename' } },
    { t: 'Writing @CacheEvict above rename', q: 'What if you write @CacheEvict above rename so that the value in the cache is also erased when the source is changed?', d: 'The second find cannot find the value in the cache, so the body runs again and you receive the changed value.', v: { cache: 'spring', mid: 'evict' } },
    { t: 'The source changes without a cache', q: 'What if the code has no @Cacheable line and you change the value in the source between the two lookups?', d: 'Every lookup reads the source, so you receive the changed value, but the source is read twice.', v: { cache: 'none', mid: 'rename' } },
    { t: 'Writing what @Cacheable does by hand', q: 'What if you write the same thing by hand with one Map and an if statement, without @Cacheable?', d: 'What Spring did around find is written directly in the find body. The number of reads from the source is the same.', v: { cache: 'map', mid: 'none' } },
  ],
  // The source shown on the screen and the source run by the checking program (verify/spring/src/CacheBasicProbe.java) are the same text (the checking script compares them down to the letter).
  code: function (c) {
    var map = c.cache === 'map', spring = c.cache === 'spring', evict = c.mid === 'evict', o = [];
    if (!map) o.push('// Turn the caching feature on: @Cacheable and @CacheEvict work only with this setting', '@Configuration', '@EnableCaching', 'class CacheConfig {',
      '    // Where the cache is kept: ConcurrentMapCacheManager, provided by Spring (it uses a Map in memory)', '    @Bean', '    CacheManager cacheManager() {', '        return new ConcurrentMapCacheManager("product");', '    }', '}', '');
    o.push(map ? '// An example product service we made. The cache is written by hand, without @Cacheable' : '// An example product service we made', '@Service', 'class ProductService {',
      '    // The source: the original values of product names (a Map that stands in for a database)', '    private final Map<Long, String> db = new HashMap<>(Map.of(1L, "keyboard"));', '    // How many times the source was read', '    private int loadCount = 0;');
    if (map) o.push('    // The cache: a Map that writes down the values that were read, by id', '    private final Map<Long, String> cache = new HashMap<>();');
    o.push('');
    if (spring) o.push('    // Writes the result in the product cache by id. If called again with the same id, the body does not run', '    @Cacheable("product")');
    o.push('    public String find(Long id) {');
    if (map) o.push('        // If a value is written down, give it', '        if (cache.containsKey(id)) {', '            return cache.get(id);', '        }');
    o.push('        // Read from the source (in real code, this is where slow work such as a database query goes)', '        loadCount++;');
    if (map) o.push('        String v = db.get(id);', '        // Write down the value that was read', '        cache.put(id, v);', '        return v;');
    else o.push('        return db.get(id);');
    o.push('    }', '');
    if (evict && !map) o.push('    // After the source is changed, erase the value whose key is id from the product cache', '    @CacheEvict(cacheNames = "product", key = "#id")');
    o.push('    public void rename(Long id, String name) {', '        db.put(id, name);');
    if (evict && map) o.push('        // Also erase the value written in the cache', '        cache.remove(id);');
    o.push('    }', '', '    public int loadCount() {', '        return loadCount;', '    }', '', '    public String source(Long id) {', '        return db.get(id);', '    }', '}', '',
      '// An example class we made that calls ProductService', '@Component', 'class Caller {', '    @Autowired', '    ProductService productService;', '', '    void run() {',
      '        // Look up product 1 for the first time', '        productService.find(1L);');
    if (c.mid !== 'none') o.push('        // Change the value for 1 in the source', '        productService.rename(1L, "mouse");');
    o.push('        // Look up product 1 again', '        String second = productService.find(1L);', '        // Reads from the source / second value received / value in the source', '        System.out.println(',
      '            productService.loadCount() + " / " + second + " / " + productService.source(1L));', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { spring: 'With @Cacheable', none: 'Without @Cacheable', map: 'Cache written by hand with a Map' }[c.cache] + ' · ' + { none: 'Nothing in between', rename: 'Only the source changed', evict: 'Source changed and cache erased' }[c.mid]; },
  columns: ['Reads from the source', 'Second value received', 'Value in the source'],
  simulate: function (c) {
    var mode = c.cache, mid = c.mid, spring = mode === 'spring', none = mode === 'none', map = mode === 'map';
    var changed = mid !== 'none', evict = mid === 'evict';
    // Proxy: Spring creates a proxy of ProductService only when find has @Cacheable or rename has @CacheEvict
    var proxy = spring || (none && evict);
    var ev = [], sum = [], v1 = 'keyboard', v2 = 'mouse';
    // State: src the value for 1 in the source, cache the value written for 1 in the cache ('' none), loads how many times the source was read, call the method Caller is calling now, body the method whose body is running now,
    //        hot the box that is working in the diagram now, act the kind of arrow, second the second value received, out the output, ph which part we are in (start, f1 first find, mid the work in between, f2 second find, out output)
    var st = { mode: mode, proxy: proxy, src: v1, cache: '', loads: 0, call: '', body: '', hot: '', act: '', second: '', out: '', ph: 'start' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function q(x) { return '"' + x + '"'; }
    // English needs no particle after a number
    function J(n) { return ''; }
    var CN = map ? 'cache' : 'the product cache';

    // 1. Spring prepares the beans
    st.hot = 'src';
    if (spring) push('When the program starts, Spring sees @EnableCaching on CacheConfig and turns the caching feature on, and it keeps the ConcurrentMapCacheManager returned by the cacheManager method as a bean. This CacheManager keeps a cache named product in memory, and the product cache is still empty. Because find in ProductService has @Cacheable, Spring does not use the ProductService object itself as the bean. It creates a proxy (an object of the class ProductService$$SpringCGLIB$$0) that receives calls first, and keeps that as the bean. The proxy holds a reference to the real ProductService object, and the productService field of Caller points to this proxy. The value for key 1 in the source is ' + q(v1) + '.', '');
    else if (none) push('When the program starts, Spring sees @EnableCaching on CacheConfig and turns the caching feature on, and ConcurrentMapCacheManager keeps an empty cache named product in memory. ' + (evict
      ? 'find has no @Cacheable, but rename has @CacheEvict, so Spring creates a proxy of ProductService and keeps it as the bean. This proxy, however, does not look at the cache when find is called and passes the call straight to the find body of the real object.'
      : 'But this code has neither @Cacheable nor @CacheEvict, so there is nothing for Spring to insert. So it keeps the ProductService object itself as the bean (no proxy), and the productService field of Caller also points to that object. Even if you turn the caching feature on, nothing happens for a method that has no annotation.') + ' The value for key 1 in the source is ' + q(v1) + '.', '');
    else push('This code has neither CacheConfig nor @Cacheable. Spring keeps the ProductService object itself as the bean (no proxy), and the productService field of Caller also points to that object. The cache is the Map that the cache field points to. It is an empty Map created with new HashMap<>(), so nothing is written in it yet. The value for key 1 in the source is ' + q(v1) + '.', '');

    // One find: look at the cache, and if there is nothing, read from the source and write it down. n is which find this is
    function find(n) {
      var val = st.src, line = (n === 1 ? 'The run() method of the Caller bean is called, and the line ' : 'The line ') + (n === 1 ? 'productService.find(1L);' : 'String second = productService.find(1L);') + ' runs. ';
      st.call = 'find'; st.body = ''; st.ph = 'f' + n;
      if (none) {
        st.hot = 'bd'; st.act = 'load'; st.body = 'find'; st.loads++;
        if (n === 2) st.second = val;
        push(line + 'Because find has no @Cacheable, ' + (proxy ? 'even the proxy does not look at the cache, and ' : 'the cache is not looked at, and ') + 'the find body runs right away. The body increases loadCount to ' + st.loads + J(st.loads) + ', reads the value ' + q(val) + ' for key 1 from the source, and returns it. The value it read is not written down anywhere, so the product cache stays empty.' + (n === 2 ? (changed ? ' The source has already changed, so you receive the changed value.' : ' Even though it is the same product 1, it was read from the source again, just as the first time.') : ''), n === 2 && changed ? 'good' : '');
        return;
      }
      var hit = st.cache !== '';
      st.hot = spring ? 'px' : 'bd'; st.act = hit ? 'hit' : 'miss'; st.body = map ? 'find' : '';
      if (hit) {
        if (n === 2) st.second = st.cache;
        var stale = st.cache !== st.src;
        push(line + (spring
          ? 'The proxy, which received the call first, looks in the product cache for key 1 and finds ' + q(st.cache) + ' written there. This case is called a hit. The proxy does not run the find body and returns the written-down ' + q(st.cache) + '.'
          : 'The if statement in the find body checks with the call cache.containsKey(id), and a value for key 1 is written there (a hit). The line return cache.get(id); returns the written-down ' + q(st.cache) + ', and the loadCount++ and db.get lines below it are not reached.') + ' loadCount is still ' + st.loads + '.' + (stale ? ' The source has already changed to ' + q(st.src) + ', but the line that reads the source did not run, so you received the value from before the change.' : ''), stale ? 'bad' : 'good');
        return;
      }
      push(line + (spring
        ? 'The proxy, which received the call first, looks in the product cache for key 1 before entering the find body. ' + (n === 1 ? 'The cache is empty, so' : 'The value was just erased, so') + ' no value is written there. This case is called a miss.'
        : 'The if statement in the find body checks with the call cache.containsKey(id) whether a value for key 1 is written. ' + (n === 1 ? 'cache is empty, so' : 'The value was just erased, so') + ' none is written. This case is called a miss.'), '');
      st.hot = 'bd'; st.act = 'load'; st.body = 'find'; st.loads++;
      push((spring ? 'So the proxy runs the find body of the real ProductService object. The body' : 'So execution goes past the if statement to the lines below. The find body') + ' increases loadCount to ' + st.loads + J(st.loads) + ' and reads the value ' + q(val) + ' for key 1 from the source.', '');
      st.hot = spring ? 'px' : 'bd'; st.act = 'put'; st.cache = val; st.body = map ? 'find' : '';
      if (n === 2) st.second = val;
      push(spring
        ? 'When the body returns ' + q(val) + ', Spring writes that value into the product cache under key 1 and returns it to Caller. The line that writes it down is not in the code we wrote. It is what @Cacheable("product") told Spring to do.'
        : 'The line cache.put(id, v) writes the value it read, ' + q(val) + ', into cache, and find returns that value. What Spring did when you used @Cacheable is done here by the find body itself.', 'good');
    }

    // 2. The first lookup
    find(1);

    // 3. What happens in between
    if (changed) {
      st.ph = 'mid'; st.call = 'rename'; st.hot = 'bd'; st.act = 'chg'; st.body = 'rename'; st.src = v2;
      if (!evict) push('The line productService.rename(1L, "mouse"); runs, and the value for key 1 in the source changes to ' + q(v2) + '. rename has no line or annotation that touches the cache, so ' + (none ? 'only the source changed.' : CN + ' still holds ' + q(st.cache) + '.'), '');
      else if (map) {
        push('The line productService.rename(1L, "mouse"); runs. The line db.put(id, name) in the rename body changes the value for key 1 in the source to ' + q(v2) + '.', '');
        st.act = 'rm'; st.cache = '';
        push('Next, the line cache.remove(id) in the rename body erases the value for key 1 from cache. cache is empty again. What Spring did when you used @CacheEvict is done here by the rename body itself.', '');
      } else {
        push('The line productService.rename(1L, "mouse"); runs. The proxy receives the call and runs the rename body of the real object, and the line db.put(id, name) changes the value for key 1 in the source to ' + q(v2) + '.', '');
        st.hot = 'px'; st.act = 'rm'; st.body = '';
        if (spring) {
          st.cache = '';
          push('When the rename body finishes, Spring follows @CacheEvict(cacheNames = "product", key = "#id") and erases the value whose key is id (1) from the product cache. The product cache is empty again. key = "#id" is the part that sets the key of the value to erase to the value of the parameter id. Without it, Spring would use both parameters (1, "mouse") together as the key and could not erase the value written under key 1.', '');
        } else push('When the rename body finishes, Spring tries to erase the value for key 1 from the product cache, following @CacheEvict. But find has no @Cacheable, so nothing was written down and there is nothing to erase.', '');
      }
    }

    // 4. Look up again
    find(2);

    // 5. Output
    st.hot = ''; st.act = ''; st.call = ''; st.body = ''; st.ph = 'out';
    st.out = st.loads + ' / ' + st.second + ' / ' + st.src;
    var stale = st.second !== st.src;
    push('The last line, System.out.println, prints the values of loadCount(), second, and source(1L) in that order. The output is "' + st.out + '".' + (stale ? ' The value you received, ' + q(st.second) + ', is different from the value in the source, ' + q(st.src) + '.' : ' The value you received is the same as the value in the source.'), stale ? 'bad' : 'good');

    // Summary: the first line is the answer to this setting (the question)
    var k = mode + '|' + mid;
    if (k === 'spring|none') {
      sum.push('A cache writes down a result that was read once, and when the same thing is looked up again it gives the written-down value without going to the source. The single line @Cacheable("product") above find made Spring do this, and although product 1 was looked up twice, the source was read only once.');
      sum.push('We did not write the code that checks the cache and writes the value down. Around the call to find, Spring looked at the product cache and wrote down the value that the body returned. The source did not change between the two lookups, so the value you received was the same as the source.');
    } else if (k === 'none|none') {
      sum.push('Without the @Cacheable line, there is no cache. Even though the same product 1 was looked up twice, the find body ran twice and the source was read 2 times. Even if you turn the caching feature on with @EnableCaching, a method that has no annotation does not use the cache.');
      sum.push('In this code, the value you received was always the value in the source at that moment. What a cache saves is going all the way to the source again and again to get the same result.');
    } else if (k === 'spring|rename') {
      sum.push('A cache is not the source. It is the value from the moment it was read from the source. Even though the source changed between the two lookups, the second find received ' + q(v1) + ' written in the cache, which was different from the value in the source, ' + q(v2) + '. The source was read only once.');
      sum.push('Being fast but possibly receiving an old value is what you gain and lose by using a cache. The ConcurrentMapCacheManager in this lab has no setting that discards a written-down value after some time, so the old value stays until you erase it.');
    } else if (k === 'spring|evict') {
      sum.push('When you wrote @CacheEvict above rename, Spring erased the value for key 1 from the product cache after the source was changed. The second find was a miss, the body ran again, and you received the changed value ' + q(v2) + '. The source was read 2 times.');
      sum.push('If the method that changes the value also erases the value in the cache, you can avoid receiving an old value. In exchange, the first lookup after the erase reads the source again.');
    } else if (k === 'none|rename') {
      sum.push('In code without @Cacheable, even though the source changed between the two lookups, the second find read the source again and received the changed value ' + q(v2) + '. The source was read 2 times, and you never received an old value.');
      sum.push('You can receive an old value only when a written-down value exists. Without a cache, instead of going to the source every time, you always receive the value in the source at that moment.');
    } else if (k === 'none|evict') {
      sum.push('If you write @CacheEvict only on rename, without @Cacheable, Spring tries to erase the value for key 1 from the product cache, but nothing was written down, so there is nothing to erase. The result is the same as without @CacheEvict: the source was read 2 times and you received the changed value ' + q(v2) + '.');
      sum.push('@CacheEvict only erases values written in the cache. Writing values down is done by the method that has @Cacheable.');
    } else if (k === 'map|none') {
      sum.push('The find written with one Map and an if statement, without @Cacheable, also read the source only once while product 1 was looked up twice. This order (check with containsKey, read from the source only when there is nothing, write down with put) is what Spring does around the call to a method that has @Cacheable.');
      sum.push('You can write it by hand like this, but you have to repeat the same lines in every method that needs a cache. In Spring, you write the single line @Cacheable above the method instead of these lines.');
    } else if (k === 'map|rename') {
      sum.push('In the cache written by hand with a Map too, when the source changes between the two lookups, the second find received ' + q(v1) + ' written in cache. The result is the same as with @Cacheable.');
      sum.push('The old value does not come from Spring. It comes from the way a cache works, which is to hand out what was written down. When to erase a written-down value has to be taken care of separately either way.');
    } else {
      sum.push('The cache.remove(id) line in rename did by hand what @CacheEvict did. The second find was a miss, read the source again, and received the changed value ' + q(v2) + '. The source was read 2 times.');
      sum.push('When you write it by hand, you have to remember to write this line in every method that changes the source. In Spring, you write @CacheEvict above that method.');
    }
    return { events: ev, summary: sum, row: [String(st.loads), st.second, st.src] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from Spring preparing the beans.'); return; }
    var cname = s.mode === 'map' ? 'Cache (the Map in the cache field)' : 'The product cache';
    H.table(v, ['Place', 'Value written for key 1'], [
      { cls: '', cells: ['Source (db)', s.src] },
      { cls: s.mode === 'none' ? 'gone' : '', cells: [cname, s.cache ? s.cache : s.mode === 'none' ? 'Empty (find has no @Cacheable, so nothing is written)' : 'Empty'] },
    ], 'Values written now');
    H.counters(v, [[s.loads, 'Reads from the source']]);
    if (s.out) H.table(v, ['Reads from the source', 'Second value received', 'Value in the source'], [{ cls: '', cells: [String(s.loads), { v: s.second, cls: s.second === s.src ? 'good' : 'bad' }, s.src] }], 'Output');
  },
  // Diagram: on the left, when Caller calls, a Spring cache means the proxy receives it first, looks at the product cache, and only when there is nothing does the body of the real object read the source. Without a cache, the body reads the source right away, and with a cache written by hand, the find body looks at cache. Below are boxes for the reads from the source, the second value received, and the value in the source.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, f = sim.events[0].snap;
    var mode = f.mode, px = f.proxy, hot = s ? s.hot : '', act = s ? s.act : '';
    P.size(680, 262);
    P.box('cl', 14, 40, 130, 100, { cls: s && s.call ? 'hot now' : 'plain', title: 'Caller', sub: s && s.call ? ['Calling:', s.call] : 'Idle' });
    P.box('px', 170, 40, 150, 84, { cls: !px ? 'ghost' : hot === 'px' ? 'hot now' : 'plain', title: px ? 'Proxy (Spring)' : 'No proxy', sub: px ? (mode === 'spring' ? 'Checks cache first' : 'Passes find on') : mode === 'map' ? 'Hand-written cache' : 'Spring stays out' });
    P.box('ca', 352, 8, 160, 64, { cls: mode === 'none' ? 'ghost' : 'plain', title: mode === 'map' ? 'Map in cache field' : 'Cache: product', sub: s && s.cache ? '1 → ' + s.cache : 'Empty' });
    P.box('bd', 352, 106, 160, 64, { cls: hot === 'bd' ? 'hot now' : 'plain', title: 'ProductService', sub: s && s.body ? s.body + ' body running' : 'Idle' });
    P.box('src', 540, 40, 126, 100, { cls: hot === 'src' ? 'hot now' : 'plain', title: 'Source (db)', sub: '1 → ' + (s ? s.src : 'keyboard') });
    // Arrows: toward the side that receives the call, and from the side that is actually working
    if (s && s.call) P.arrow('a0', px ? 'cl:r:0.4' : 'cl:r:0.9', px ? 'px:l:0.5' : 'bd:l', { cls: 'hot', label: s.call });
    if (px && hot === 'bd') P.arrow('a1', 'px:b', 'bd:l', { cls: 'hot' });
    var sp = hot === 'px', from = sp ? 'px:r:0.25' : 'bd:t', to = sp ? 'ca:l' : 'ca:b';
    if (act === 'hit') P.arrow('a2', from, to, { cls: 'good', label: 'Hit' });
    if (act === 'miss') P.arrow('a2', from, to, { cls: 'bad', label: 'Miss' });
    if (act === 'put') P.arrow('a2', from, to, { cls: 'good', label: 'Written' });
    if (act === 'rm') P.arrow('a2', from, to, { cls: mode === 'none' ? 'hot' : 'bad', label: mode === 'none' ? 'Nothing to erase' : 'Erased' });
    if (act === 'load') P.arrow('a3', 'bd:r', 'src:l:0.75', { cls: 'hot', label: 'Read' });
    if (act === 'chg') P.arrow('a3', 'bd:r', 'src:l:0.75', { cls: 'hot', label: 'Changed' });
    P.box('n1', 14, 210, 208, 38, { cls: s && s.loads ? 'wait' : 'ghost', title: 'Reads from source', right: String(s ? s.loads : 0) });
    P.box('n2', 236, 210, 208, 38, { cls: s && s.second ? (s.second === s.src ? 'good' : 'bad') : 'ghost', title: 'Second value', right: s && s.second ? s.second : '-' });
    P.box('n3', 458, 210, 208, 38, { cls: 'plain', title: 'Value in source', right: s ? s.src : 'keyboard' });
  },
  assume: 'We checked Spring Framework 7.0.9 (spring-context) by running it on JDK 21.0.12.1. All nine combinations (three ways of putting a cache on find times three things that can happen between the two lookups) were checked in the same way. The source is the same as the code on the screen (only the package and import lines and measurement lines marked with PROBE at the end were added). It was compiled with javac (with -parameters turned on; the build settings of Spring Boot also turn this on), and a new Java process was started for each combination. The classes on the screen were found by AnnotationConfigApplicationContext through component scanning, and the checking program called run() of the Caller bean and captured the line that run() printed. What was compared is the three printed values (the number of reads from the source, the value the second find returned, and the value in the source). As facts that the step sentences rely on, we also checked the class of the ProductService bean (the ProductService$$SpringCGLIB$$0 proxy when find has @Cacheable or rename has @CacheEvict, and plain ProductService when neither is there or when the cache is written by hand), whether the object that Caller received is that bean, and loadCount and what was written in the cache after the first find, after rename, and at the end (for Spring, the product cache of the CacheManager, and for the hand-written version, the Map in the cache field). As a variation that is not on the screen, we also ran @CacheEvict("product") with no key above rename, and in that case the value for key 1 in the product cache was not erased and the second find received "keyboard" (because the key becomes both parameters used together). That ConcurrentMapCacheManager has no method that sets a validity time was checked by opening the public methods of this class with javap. Nothing was shortened in the code on the screen. This lab was run with only spring-context, without Spring Boot, and the setting with which Boot creates a CacheManager automatically was not verified. Reading from the source does not really take long and no time was measured, and "slow" is shown only by the number of reads from the source. For the documentation, we followed what we had confirmed earlier, and did not open it again this time: the Spring Framework Reference, Cache Abstraction section (https://docs.spring.io/spring-framework/reference/integration/cache/strategies.html; if the method was already called with the same arguments, it returns the cached result without executing the method) and RFC 9111 (HTTP Caching) section 4.2 (a stored response that is past its freshness lifetime is called stale). Not covered: calling find from inside the same class so that it does not pass through the proxy and the cache is not used, a null result, @CachePut, a cache that several threads write at the same time, what to throw away when the cache is full, the validity time (TTL), many requests rushing to the source when a popular value disappears all at once, the HTTP cache between a browser and a server (ETag), and Redis. These are covered in the in-depth labs "Cache abstraction", "Caching and TTL", "HTTP caching and ETag", and "Redis single-threaded execution".',
});
