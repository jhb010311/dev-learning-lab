Lab.register({
  id: 'cache_basic', nav: 'Caches', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['cache', 'cacheabs', 'etag', 'redis'],
  title: 'What is a cache, and what do you gain and lose by using one?',
  intro: 'A cache is a device that writes down a result that took a long time to get, in a place close by, and hands out what it wrote down when the same thing is asked for again. In the code of this lab, the Map named cache is the place where results are written down, and the cache lines inside the find method do this: "if there is a written-down value, give it, and only if there is none, do the slow lookup (slowLoad) and write the result down." slowLoad is the slow job of reading a value from the source, and slowCount counts how many times it was called. The lab does not measure real time. It shows "how much slow work was done" by the number of calls to slowLoad. In this lab you remove the cache lines, change the value in the source between the two lookups, or erase the cached value with the cache.remove(1) line. The same code is compiled and run, and you see how many slow lookups happen and whether the second value you receive is the same as the value in the source. (static is read as a keyword that lets main call these without creating an object, and it is not covered here.)',
  terms: ['Cache', 'Cache hits and misses', 'Cache-aside pattern', 'Stale data in a cache'],
  controls: [
    { id: 'use', label: 'Use a cache (the cache variable and the cache lines in find)', type: 'check', value: true },
    { id: 'chg', label: 'What happens between the two lookups of key 1', type: 'select', value: 'none', options: [['none', 'Nothing'], ['source', 'Change the value in the source with the source.put(1, "mouse") line'], ['both', 'Change the value in the source and also use the cache.remove(1) line']], hint: 'Without a cache you cannot use the cache.remove(1) line, so this choice changes to changing only the source.' },
  ],
  // Without a cache you cannot use the cache.remove(1) line
  fix: function (c) { return !c.use && c.chg === 'both' ? { chg: 'source' } : null; },
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a cache look like, and how many times is slowLoad called when you look up the same key 1 twice with find?', d: 'The cache lines are there. You looked up twice, but the slow lookup happens only once.', v: { use: true, chg: 'none' } },
    { t: 'Looking up twice without a cache', q: 'What if you remove all the cache lines so that find is just one line, return slowLoad(id);?', d: 'Each lookup goes all the way to the source, so the slow lookup happens twice.', v: { use: false, chg: 'none' } },
    { t: 'The source changes while the cache is there', q: 'What if you change the value in the source with the source.put(1, "mouse") line between the two lookups?', d: 'The slow lookup happens once, but the second value you receive is different from the source.', v: { use: true, chg: 'source' } },
    { t: 'Changing the source and also erasing the cached value', q: 'What if you also use the cache.remove(1) line after source.put(1, "mouse")?', d: 'The second find cannot find the value in the cache and reads the changed value again.', v: { use: true, chg: 'both' } },
    { t: 'The source changes without a cache', q: 'What if the code has no cache lines and you change the value in the source with the source.put(1, "mouse") line between the two lookups?', d: 'Every lookup reads the source, so you receive the changed value, but the slow lookup happens twice.', v: { use: false, chg: 'source' } },
  ],
  fixc: function (c) { return { use: !!c.use, chg: !c.use && c.chg === 'both' ? 'source' : c.chg }; },
  code: function (c) {
    var f = this.fixc(c), u = f.use, chg = f.chg;
    var o = ['import java.util.*;', '', 'public class Main {', '    // The source: where the values originally are', '    static Map<Integer, String> source = new HashMap<>();', '    static int slowCount = 0;', '',
      '    // Slow lookup: reads from the source. Counts how many times it is called', '    static String slowLoad(int id) {', '        slowCount++;', '        return source.get(id);', '    }', ''];
    if (u) o.push('    // Cache: the place where values that were read are written down', '    static Map<Integer, String> cache = new HashMap<>();', '');
    o.push('    static String find(int id) {');
    if (u) o.push('        // If a value is written down, give it; if not, read it and write it down', '        if (cache.containsKey(id)) return cache.get(id);', '        String v = slowLoad(id);', '        cache.put(id, v);', '        return v;');
    else o.push('        return slowLoad(id);');
    o.push('    }', '', '    public static void main(String[] args) {', '        source.put(1, "keyboard");', '        // Look up key 1 for the first time', '        find(1);');
    if (chg !== 'none') o.push('        // Change the value in the source', '        source.put(1, "mouse");');
    if (chg === 'both') o.push('        // Also erase the value written in the cache', '        cache.remove(1);');
    o.push('        // Look up key 1 again', '        String second = find(1);', '        // Slow lookups / second value received / value in the source', '        System.out.println(', '            slowCount + " / " + second + " / " + source.get(1));', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { var f = this.fixc(c); return (f.use ? 'With a cache' : 'No cache') + ' · ' + { none: 'Nothing in between', source: 'Only the source changed', both: 'Source changed and cache erased' }[f.chg]; },
  columns: ['Slow lookups', 'Second value received', 'Value in the source'],
  simulate: function (c) {
    var f = this.fixc(c), u = f.use, chg = f.chg, changed = chg !== 'none', both = chg === 'both';
    var ev = [], sum = [], v1 = 'keyboard', v2 = 'mouse', cur = changed ? v2 : v1;
    var st = { hot: '', act: '', u: u, cache: [], src: '', slow: 0, second: '', out: '', find: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function q(x) { return '"' + x + '"'; }

    // 1. Put a value in the source
    st.hot = 'src'; st.act = 'chg'; st.src = v1;
    push('main starts and the first line, source.put(1, "keyboard");, runs. The source gets the value ' + q(v1) + ' for key 1. The source is where the values originally are, and it is where slowLoad reads from.' + (u ? ' cache is an empty Map created by calling new HashMap<>(), so nothing is written in it yet.' : ' This code has no cache, so find has nowhere to write down the value it reads.'), '');

    // 2. The first lookup
    st.find = 'find(1)'; st.act = '';
    if (u) {
      st.hot = 'fd'; st.act = 'miss';
      push('The line find(1); runs. First, find calls cache.containsKey(1) to see whether a value for key 1 is written in the cache. The cache is empty, so there is none. This case, where the value is not written in the cache, is called a miss.', '');
      st.hot = 'sl'; st.act = 'load'; st.slow = 1;
      push('So find calls the slowLoad method. slowLoad is the slow job of reading the value ' + q(v1) + ' for key 1 from the source, and it increases slowCount to count how many times it was called. So far slowLoad has been called 1 time.', '');
      st.hot = 'ca'; st.act = 'put'; st.cache = [['1', v1]];
      push('find writes the value it read, ' + q(v1) + ', into the cache with the call cache.put(1, v), and returns that value. Now the cache holds the value ' + q(v1) + ' for key 1.', 'good');
    } else {
      st.hot = 'sl'; st.act = 'load'; st.slow = 1;
      push('The line find(1); runs. This find is just the one line return slowLoad(id);, so it calls slowLoad right away, and slowLoad reads the value ' + q(v1) + ' for key 1 from the source. slowLoad has been called 1 time. The value it read is not written down anywhere. It is only returned.', '');
    }

    // 3. What happens in between
    if (changed) {
      st.hot = 'src'; st.act = 'chg'; st.src = v2; st.find = '';
      push('The line source.put(1, "mouse") runs, and the value for key 1 in the source changes to ' + q(v2) + '.' + (u ? ' This line does not touch the cache, so the cache still holds ' + q(v1) + '.' : ' There is no cache, so only the source was changed.'), '');
    }
    if (both) {
      st.hot = 'ca'; st.act = 'rm'; st.cache = [];
      push('The line cache.remove(1) runs, and the value for key 1 is erased from the cache. The cache is empty again. The source stays changed.', '');
    }

    // 4. The second lookup
    var stale = false, second;
    st.find = 'find(1)';
    if (u && !both) {
      second = v1; stale = changed;
      st.hot = 'fd'; st.act = 'hit'; st.second = second;
      push('The line String second = find(1); runs. find calls cache.containsKey(1) to look at the cache, and a value for key 1 is written there. This case, where the value is written in the cache, is called a hit. find does not call slowLoad and returns the written-down value ' + q(v1) + ' as it is. slowLoad has still been called 1 time.' + (changed ? ' The source has already changed to ' + q(v2) + ', but find did not look at the source, so it returned the value from before the change.' : ''), changed ? 'bad' : 'good');
    } else if (u) {
      second = v2;
      st.hot = 'fd'; st.act = 'miss'; st.second = '';
      push('The line String second = find(1); runs. find calls cache.containsKey(1) to look at the cache, but the value was just erased, so no value for key 1 is written there (a miss).', '');
      st.hot = 'sl'; st.act = 'load'; st.slow = 2;
      push('So find calls slowLoad again. slowLoad reads the changed value ' + q(v2) + ' for key 1 from the source. slowLoad has now been called 2 times.', '');
      st.hot = 'ca'; st.act = 'put'; st.cache = [['1', v2]]; st.second = second;
      push('find writes the value it read, ' + q(v2) + ', into the cache again and returns it. Now the cache holds the value ' + q(v2) + ' for key 1.', 'good');
    } else {
      second = cur;
      st.hot = 'sl'; st.act = 'load'; st.slow = 2; st.second = second;
      push('The line String second = find(1); runs. This find again calls slowLoad right away, and slowLoad reads the value ' + q(cur) + ' for key 1 from the source. slowLoad has now been called 2 times.' + (changed ? ' The source has already changed, so you receive the changed value.' : ' Even though it is the same key 1, it goes all the way to the source, just as it did the first time.'), changed ? 'good' : '');
    }

    // 5. Output
    st.hot = ''; st.act = ''; st.find = ''; st.out = st.slow + ' / ' + second + ' / ' + cur;
    push('The last line, System.out.println, prints slowCount, second, and source.get(1) in that order. The output is "' + st.out + '".' + (stale ? ' The value you received, ' + q(second) + ', is different from the value in the source, ' + q(cur) + '.' : ' The value you received is the same as the value in the source.'), stale ? 'bad' : 'good');

    // Summary: the first line is the answer to this setting (the question)
    if (u && chg === 'none') {
      sum.push('A cache writes down a value it read in a Map, and when the same thing is looked up again it gives the written-down value. The cache lines in find (checking with containsKey, writing with put, taking out with get) did this, and although key 1 was looked up twice, the slow lookup slowLoad was called only once.');
      sum.push('The second find gave the written-down value right away and did not go to the source. The source did not change between the two lookups, so the value you received was the same as the source.');
    } else if (!u && chg === 'none') {
      sum.push('Without the cache lines, slowLoad is called twice even when you look up the same key 1 twice. find does not write down the value it read, so every lookup goes to the source.');
      sum.push('In this code, the value you received was always the value in the source at that moment. What a cache does is reduce slow work that gets the same result again and again.');
    } else if (u && chg === 'source') {
      sum.push('If the source changes between the two lookups while the cache is there, the second find receives the value from before the change, ' + q(v1) + '. The slow lookup happened only once, but the value you received, ' + q(v1) + ', was different from the value in the source, ' + q(v2) + '.');
      sum.push('Being fast but possibly receiving an old value is what you gain and lose by using a cache. This cache has no rule for when to throw away a written-down value, so the old value stays until you erase it.');
    } else if (u) {
      sum.push('When you change the source and also erase the cached value with the cache.remove(1) line, the second find could not find the value in the cache, called slowLoad again, and read the changed value ' + q(v2) + '. The slow lookup happened 2 times, but the value you received was the same as the source.');
      sum.push('If the side that changes the source also erases the cached value, you can avoid receiving an old value. In exchange, the first lookup after the erase does a slow lookup again.');
    } else {
      sum.push('In code without cache lines, even when the source changes between the two lookups, the second find read the source again and received the changed value ' + q(v2) + '. The slow lookup happened 2 times, and you never received an old value.');
      sum.push('You can receive an old value only when a written-down value exists. Without a cache, every lookup is slow, but you always receive the value in the source at that moment.');
    }
    return { events: ev, summary: sum, fx: f, row: [String(st.slow), second, cur] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from main putting a value in the source.'); return; }
    H.table(v, ['Place', 'Value written for key 1'], [
      { cls: '', cells: ['Source (source)', s.src ? s.src : '-'] },
      { cls: s.u ? '' : 'gone', cells: ['Cache (cache)', s.u ? (s.cache.length ? s.cache[0][1] : 'Empty') : 'No cache'] },
    ], 'Values written now');
    H.counters(v, [[s.slow, 'Calls to slowLoad']]);
    if (s.out) H.table(v, ['Slow lookups', 'Second value received', 'Value in the source'], [{ cls: '', cells: [s.out.split(' / ')[0], { v: s.second, cls: s.second === s.src ? 'good' : 'bad' }, s.src] }], 'Output');
  },
  // Diagram: starting from find on the left, it looks at the cache first and goes through slowLoad to the source only when the value is not there. Without a cache, find goes straight to slowLoad. Below are boxes for the slow lookups, the second value received, and the value in the source.
  draw: function (P, sim, shown) {
    var u = sim.fx.use, last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '', act = s ? s.act : '';
    P.size(680, 250);
    P.box('fd', 14, 40, 150, 100, { cls: hot === 'fd' ? 'hot now' : 'plain', title: 'find', sub: s && s.find ? 'Running: ' + s.find : 'Idle' });
    P.box('ca', 260, 10, 170, 64, { cls: !u ? 'ghost' : hot === 'ca' ? 'hot now' : 'plain', title: u ? 'Cache' : 'Cache (none)', sub: !u ? ' ' : s && s.cache.length ? '1 → ' + s.cache[0][1] : 'Empty' });
    P.box('sl', 260, 106, 170, 64, { cls: hot === 'sl' ? 'hot now' : 'plain', title: 'slowLoad', sub: 'Calls: ' + (s ? s.slow : 0) });
    P.box('src', 500, 40, 166, 100, { cls: hot === 'src' ? 'hot now' : 'plain', title: 'Source', sub: '1 → ' + (s && s.src ? s.src : '-') });
    if (u && (act === 'chk' || act === 'hit' || act === 'miss')) P.arrow('a1', 'fd:r:0.25', 'ca:l', { cls: act === 'hit' ? 'good' : act === 'miss' ? 'bad' : 'hot' });
    if (act === 'load') {
      if (u) P.arrow('a2', 'ca:b', 'sl:t', { cls: 'hot' }); else P.arrow('a3', 'fd:r:0.75', 'sl:l', { cls: 'hot' });
      P.arrow('a4', 'sl:r', 'src:l:0.75', { cls: 'hot' });
    }
    P.box('n1', 14, 196, 208, 38, { cls: s && s.slow ? 'wait' : 'ghost', title: 'Slow lookups', right: String(s ? s.slow : 0) });
    P.box('n2', 236, 196, 208, 38, { cls: s && s.second ? (s.second === s.src ? 'good' : 'bad') : 'ghost', title: 'Second value', right: s && s.second ? s.second : '-' });
    P.box('n3', 458, 196, 208, 38, { cls: s && s.src ? 'plain' : 'ghost', title: 'Value in source', right: s && s.src ? s.src : '-' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). All five combinations (the two choices of having a cache or not, times the three choices of what happens between the two lookups, minus the one that is left out because you cannot use the cache.remove(1) line without a cache) were checked against real runs: the same source as the code on the screen (identical line by line, including the import line) was compiled with javax.tools, the class file was read by a new class loader, Main.main was run, and the standard output that was captured was compared with the model. What was compared is whether the compile succeeded, the three printed values (the number of calls to slowLoad, the value the second find returned, and the value in the source), and the output text that the last step shows. The fact that the step sentences rely on, that "after one call to find(1) at first, slowLoad has been called 1 time and the value received is keyboard", was checked by running separate source (one with a cache and one without) changed to print the result of the first find, in the same way. The code on the screen is a program that is really compiled and run, and nothing was shortened. slowLoad does not really take long and no time was measured. "Slow" is shown only by the number of calls to slowLoad, and the time of a real database or network was not measured. This cache is one Map, and it has no rule for when to throw away a written-down value (expiry time, size limit), so a value stays until it is erased with the cache.remove(1) line. I opened the documentation myself. The introduction of the Cache Abstraction chapter of the Spring Framework Reference (https://docs.spring.io/spring-framework/reference/integration/cache.html) opened only as far as the explanation that caching is support that is added transparently to an existing application, and in the lower page of the same documentation (https://docs.spring.io/spring-framework/reference/integration/cache/strategies.html) I confirmed that if the method has already been invoked with the same arguments, the cached result is returned without executing the method, and otherwise the method is executed and its result is put in the cache, and that there are features to update the contents of the cache or evict entries. For RFC 9111 (HTTP Caching), I confirmed section 1 (a cache stores responses to reduce response time and network use), section 4 (conditions for reusing a stored response), and sections 4.2 and 4.2.4 (a stored response that is past its freshness lifetime is called stale), and I did not read the last 7 thousand or so characters of the document. I did not confirm whether those documents use the words hit and miss, and the glossary uses these words only as general terms. The Map cache in this lab is just one example of the approach the documents describe, and it was not checked against real execution of Spring or of an HTTP cache. Not covered: a cache that several threads write at the same time, what to throw away when the cache is full, the validity time (TTL), many requests rushing to the source when a popular value disappears all at once, @Cacheable of Spring, the HTTP cache between a browser and a server (ETag), and Redis. These are covered in the in-depth labs "Caching and TTL", "Cache abstraction", "HTTP caching and ETag", and "Redis single-threaded execution".',
});
