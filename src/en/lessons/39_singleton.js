Lab.register({
  id: 'singleton', nav: 'Singleton beans and state', cat: 'Spring', mode: 'step',
  title: 'My order shows someone else\'s name',
  intro: 'By default, only one instance of a Spring bean is created, and all requests share it. If you store a value that differs per request in a field of that bean, another request that comes in at the same time overwrites the value.',
  terms: ['Stateless singleton beans', 'Bean scope', 'ThreadLocal', 'Thread safety', 'Race condition'], ranks: ['bean', 'di', 'concurrency'],
  controls: [
    { id: 'where', label: 'Where the current user information is kept', type: 'select', value: 'field', options: [['field', 'A field of the service bean'], ['local', 'A local variable of the method (passed as a parameter)'], ['tl', 'ThreadLocal (not cleared at the end of the request)'], ['tlc', 'ThreadLocal (remove at the end of the request)']] },
  ],
  presets: [
    { t: 'Default settings', d: 'Stored in a field of the bean. When two requests overlap, the values get mixed up.', v: { where: 'field' } },
    { t: 'In a local variable', d: 'Each request has its own variable on its own stack, so the values do not get mixed up.', v: { where: 'local' } },
    { t: 'ThreadLocal, not cleaned up', d: 'Concurrent requests are safe, but the previous value remains when the thread is reused.', v: { where: 'tl' } },
    { t: 'ThreadLocal, cleaned up', d: 'It is safe if you clear the value when the request ends.', v: { where: 'tlc' } },
  ],
  code: function (c) {
    if (c.where === 'field') return '@Service\nclass OrderService {                 // there is only one instance\n    private String currentUser;      // a field that all requests share\n\n    public Order order(String user, Item item) {\n        this.currentUser = user;     // (1) store\n        checkStock(item);            // some other work for a moment\n        return new Order(currentUser, item);   // (2) read it back\n    }\n}';
    if (c.where === 'local') return '@Service\nclass OrderService {                 // only one instance, no state in fields\n\n    public Order order(String user, Item item) {   // user is a local variable\n        checkStock(item);\n        return new Order(user, item);\n    }\n}';
    return 'class UserContext {\n    private static final ThreadLocal<String> USER = new ThreadLocal<>();\n    static void set(String user) { USER.set(user); }\n    static String get()          { return USER.get(); }\n    static void clear()          { USER.remove(); }\n}\n\n// Filter: sets the user information for each request\nvoid doFilter(req, res, chain) {\n' + (c.where === 'tlc' ? '    try {\n        if (loggedIn(req)) UserContext.set(userOf(req));\n        chain.doFilter(req, res);\n    } finally {\n        UserContext.clear();         // always clear it\n    }\n' : '    if (loggedIn(req)) UserContext.set(userOf(req));\n    chain.doFilter(req, res);        // not cleared afterward\n') + '}';
  },
  label: function (c) { return { field: 'Field of the bean', local: 'Local variable', tl: 'ThreadLocal (not cleaned up)', tlc: 'ThreadLocal (cleaned up)' }[c.where]; },
  columns: ['Name on Alice\'s order', 'Name on Bob\'s order', 'Value seen by a request that is not logged in', 'Result'],
  simulate: function (c) {
    var ev = [], sum = [], W = c.where, S = { field: '(empty)', t1: '', t2: '', tl1: '(empty)', tl2: '(empty)', o1: '-', o2: '-', o3: '-' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    var a, b, g = '-';
    push('There is only one OrderService bean in the container. Thread 1 handles Alice\'s request and thread 2 handles Bob\'s request, and they call order() on the same object at almost the same time.', '');
    if (W === 'field') {
      S.field = 'Alice'; S.t1 = '(1) stores "Alice" in the field'; push('Thread 1 (Alice): It stores "Alice" in the field currentUser.', '');
      S.field = 'Bob'; S.t2 = '(1) stores "Bob" in the field'; push('Thread 2 (Bob): It stores "Bob" in the same field. There is only one field, so "Alice" is overwritten.', 'bad');
      S.t1 = '(2) reads "Bob" from the field'; S.o1 = 'Bob'; a = 'Bob'; push('Thread 1 (Alice): After it finishes the stock check, it reads the field again and creates the order. The field contains "Bob". Alice\'s order is created under Bob\'s name.', 'bad');
      S.t2 = '(2) reads "Bob" from the field'; S.o2 = 'Bob'; b = 'Bob'; push('Thread 2 (Bob): It reads the field and creates the order. The value is "Bob".', '');
      sum.push('All requests share the fields of a singleton bean. If you keep a value that differs per request in a field, concurrent requests overwrite each other\'s values. This never shows up when you test alone, and it appears only intermittently when many users come in at once.');
    } else if (W === 'local') {
      S.t1 = 'local variable user = "Alice"'; push('Thread 1 (Alice): user is a parameter of the method, that is, a local variable. It exists only on the stack of thread 1.', '');
      S.t2 = 'local variable user = "Bob"'; push('Thread 2 (Bob): It runs the same method, but its user is separate, on the stack of thread 2. Neither thread can see or change the other\'s variable.', 'good');
      S.o1 = 'Alice'; S.o2 = 'Bob'; a = 'Alice'; b = 'Bob'; push('Each thread creates the order from its own local variable. The values do not get mixed up.', 'good');
      sum.push('The bean is shared, but the local variables inside a method are separate for each thread. The basic rule is that a singleton bean keeps no changing state in its fields (it is stateless) and the values it needs are passed as parameters.');
    } else {
      S.tl1 = 'Alice'; S.t1 = 'UserContext.set("Alice")'; push('Thread 1 (Alice): The filter puts "Alice" into the ThreadLocal. A ThreadLocal has a separate copy of the value for each thread.', '');
      S.tl2 = 'Bob'; S.t2 = 'UserContext.set("Bob")'; push('Thread 2 (Bob): It puts "Bob" into the ThreadLocal. The value goes into the copy that belongs to thread 2, so the value of thread 1 stays as it is.', 'good');
      S.o1 = 'Alice'; S.o2 = 'Bob'; a = 'Alice'; b = 'Bob'; S.t1 = 'order created, request ended'; S.t2 = 'order created, request ended'; push('Each thread takes the value from its own copy and creates the order. With concurrent requests, the values do not get mixed up.', 'good');
      if (W === 'tl') {
        push('The two requests have ended. The threads do not go away and return to Tomcat\'s thread pool. The ThreadLocal was not cleared, so the copy that belongs to thread 1 still holds "Alice".', 'bad');
        S.t1 = 'Handling a new request (not logged in)'; S.t2 = '(waiting)'; S.o3 = 'Alice'; g = 'Alice'; push('A new request from a user who is not logged in is assigned to thread 1. The user is not logged in, so the filter does not set a value. But a call to UserContext.get() returns "Alice", which the previous request left behind. The application behaves as if the user were logged in to someone else\'s account.', 'bad');
        sum.push('A ThreadLocal is storage that is bound to a thread, and in a thread pool the threads are reused. If you do not clear it when the request ends, the next request sees the value of the previous request. This is a typical cause of incidents in which personal information is exposed to another user, and it also leads to memory leaks.');
      } else {
        S.tl1 = '(empty)'; S.tl2 = '(empty)'; push('When the two requests end, the ThreadLocal is cleared in finally. The threads return to the thread pool in a clean state.', 'good');
        S.t1 = 'Handling a new request (not logged in)'; S.t2 = '(waiting)'; S.o3 = 'none (null)'; g = 'none (null)'; push('A new request from a user who is not logged in is assigned to thread 1. UserContext.get() returns null. No trace of the previous request remains.', 'good');
        sum.push('When you use a ThreadLocal, always call remove() when the request ends, with try-finally. SecurityContextHolder in Spring Security and the MDC for logging work on the same principle and need the same care.');
      }
    }
    var ok = a === 'Alice' && b === 'Bob' && (g === '-' || g.indexOf('none') === 0);
    return { events: ev, summary: sum, row: [a, b, g, ok ? 'Correct' : 'Values mixed up'] };
  },
  render: function (v, sim, t, H, shown) {
    var W = sim.c.where, last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to send two requests at the same time.'); return; }
    H.table(v, ['Request', 'Recorded user'], [{ cells: ['Alice\'s order', { v: s.o1, cls: s.o1 === '-' ? '' : s.o1 === 'Alice' ? 'good' : 'bad' }] }, { cells: ['Bob\'s order', { v: s.o2, cls: s.o2 === '-' ? '' : s.o2 === 'Bob' ? 'good' : 'bad' }] }].concat(W === 'tl' || W === 'tlc' ? [{ cells: ['Next request, not logged in', { v: s.o3, cls: s.o3 === '-' ? '' : s.o3.indexOf('none') === 0 ? 'good' : 'bad' }] }] : []), 'Result');
  },
  // Diagram: the single bean at the top and the two threads below. Both threads call the same object. The key point is where the value is placed.
  draw: function (P, sim, shown) {
    var W = sim.c.where, last = shown[shown.length - 1], s = last ? last.snap : { field: '(empty)', t1: '', t2: '', tl1: '(empty)', tl2: '(empty)', o1: '-', o2: '-', o3: '-' }, tl = W === 'tl' || W === 'tlc', next = s.t1.indexOf('Handling a new request') === 0;
    P.size(680, 316);
    P.box('bean', 180, 18, 320, 50, { cls: W !== 'field' ? 'plain' : s.field === 'Bob' ? 'bad' : s.field === 'Alice' ? 'hot' : 'plain', title: 'OrderService bean (one per container)', sub: W === 'field' ? 'field currentUser = ' + s.field : 'no per-request value in its fields' });
    P.box('t1', 16, 118, 310, 54, { cls: s.t1 ? 'wait' : 'plain', title: next ? 'Thread 1 (reused: next request)' : 'Thread 1 (Alice\'s request)', sub: s.t1 || 'waiting' });
    P.box('t2', 354, 118, 310, 54, { cls: s.t2 && s.t2 !== '(waiting)' ? 'wait' : 'plain', title: 'Thread 2 (Bob\'s request)', sub: s.t2 || 'waiting' });
    if (s.t1) P.arrow('c1', 't1:t', 'bean:b:0.3', { label: 'calls the same object' });
    if (s.t2 && s.t2 !== '(waiting)') P.arrow('c2', 't2:t', 'bean:b:0.7');
    if (tl) {
      P.box('tl1', 16, 180, 310, 30, { cls: s.tl1 === 'Alice' ? (next ? 'bad' : 'hot') : 'ghost', title: 'ThreadLocal of thread 1', right: s.tl1 });
      P.box('tl2', 354, 180, 310, 30, { cls: s.tl2 === 'Bob' ? 'hot' : 'ghost', title: 'ThreadLocal of thread 2', right: s.tl2 });
    }
    var res = function (x, ok) { return x === '-' ? 'ghost' : ok ? 'good' : 'bad'; }, w = tl ? 206 : 316;
    P.box('o1', 16, 246, w, 50, { cls: res(s.o1, s.o1 === 'Alice'), title: 'Alice\'s order', sub: 'Recorded user: ' + s.o1 });
    P.box('o2', tl ? 237 : 348, 246, w, 50, { cls: res(s.o2, s.o2 === 'Bob'), title: 'Bob\'s order', sub: 'Recorded user: ' + s.o2 });
    if (tl) P.box('o3', 458, 246, 206, 50, { cls: res(s.o3, s.o3.indexOf('none') === 0), title: 'Next request (no login)', sub: 'User seen: ' + s.o3 });
    P.note(W === 'field' ? 'There is only one bean, so there is only one field. When two threads write to the same field, the later value overwrites the earlier one.' : W === 'local' ? 'A local variable exists separately inside each thread (on its stack). The bean is shared, but the values do not get mixed up.' : 'A ThreadLocal holds a separate copy of the value for each thread. A thread does not go away when a request ends and is used again for the next request, so if the value is not cleared, the value of the previous request remains.');
  },
  assume: 'The model assumes the order in which the two requests overlap in the worst way (both store the value before either reads it). In reality, the problem shows up only when requests overlap, so it is hard to reproduce. That the default scope of a Spring bean is singleton and that a ThreadLocal keeps a separate value for each thread follow the official Spring and Java documentation. This was checked by actually running code on JDK 21 on this PC. When two threads wrote a value to a field of one object, both orders got the name that was written later, and with local variables the values did not get mixed up. In a pool with a single thread, when the ThreadLocal was not cleared, the next task read the previous value, and when remove was called, the result was null.',
});
