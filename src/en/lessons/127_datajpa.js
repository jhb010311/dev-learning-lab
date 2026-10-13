Lab.register({
  id: 'datajpa', nav: 'Spring Data JPA', cat: 'JPA', mode: 'step',
  title: 'How does a repository work when there is no implementation class?',
  intro: 'Spring Data JPA is a Spring module that makes JPA easier to use, and a repository is an interface that gathers the methods for saving and querying entities. In Spring Data JPA, you declare a repository only as an interface. Spring Data creates the implementation when the application starts, and a method such as findByName is read by its name and turned into a query. This lab shows how a method name becomes a query, and also which SQL is actually sent when a page is requested and when save() is called.',
  terms: ['JPA, Hibernate, Spring Data JPA', 'Query method', 'Pageable and Page', 'save() and merge', 'Entity'],
  controls: [
    { id: 'sc', label: 'What to try', type: 'select', value: 'name', options: [['name', 'Query by method name'], ['page', 'Request a page with Pageable'], ['save', 'Call save()']] },
    { id: 'mt', label: 'Method declared in the repository', type: 'select', value: 'findByNameAndAgeGreaterThan', options: [['findByName', 'findByName'], ['findByNameAndAgeGreaterThan', 'findByNameAndAgeGreaterThan'], ['findByNameContainingOrderByAgeDesc', 'findByNameContainingOrderByAgeDesc'], ['countByAgeGreaterThan', 'countByAgeGreaterThan'], ['findByNickname', 'findByNickname (a name the entity does not have)'], ['findByAgeGreaterThen', 'findByAgeGreaterThen (Than misspelled as Then)']], show: function (c) { return c.sc === 'name'; }, hint: 'The Member entity has three properties: id, name, and age.' },
    { id: 'ret', label: 'Return type', type: 'select', value: 'page', options: [['page', 'Page (knows the total number of elements)'], ['slice', 'Slice (knows only whether a next slice exists)']], show: function (c) { return c.sc === 'page'; } },
    { id: 'pg', label: 'Page number to request', type: 'select', value: '2', options: [['0', '0 (first page)'], ['1', '1'], ['2', '2 (last page)'], ['3', '3 (a page that does not exist)']], show: function (c) { return c.sc === 'page'; }, hint: 'There are 7 members and a page holds 3. Page numbers start from 0.' },
    { id: 'ent', label: 'Object passed to save()', type: 'select', value: 'assigned', options: [['new', 'A new member (id is null)'], ['change', 'A member with id 1, with a name different from the DB'], ['same', 'A member with id 1, with the same values as the DB'], ['gone', 'A member with id 999 (an id that is not in the DB)'], ['assigned', 'A new coupon (an entity whose id is set in code)']], show: function (c) { return c.sc === 'save'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What SQL is sent when you call a repository that declares only findByNameAndAgeGreaterThan and has no implementation class?', d: 'The method has no body, yet a query with two conditions is sent from the name alone.', v: { sc: 'name', mt: 'findByNameAndAgeGreaterThan', ret: 'page', pg: '2', ent: 'assigned' } },
    { t: 'A name the entity does not have', q: 'What if you declare findByNickname, a name the entity does not have, instead of findByNameAndAgeGreaterThan?', d: 'It fails while the application is starting, before the method is even called.', v: { sc: 'name', mt: 'findByNickname', ret: 'page', pg: '2', ent: 'assigned' } },
    { t: 'A misspelled keyword', q: 'What if you declare findByAgeGreaterThen, with Than misspelled as Then?', d: 'GreaterThen is not a keyword, so it is read as a property name.', v: { sc: 'name', mt: 'findByAgeGreaterThen', ret: 'page', pg: '2', ent: 'assigned' } },
    { t: 'Page request: two queries', q: 'What if you request page number 0, with 3 elements per page, as a Page with Pageable?', d: 'The query that reads the content and the query that counts the total are sent separately.', v: { sc: 'page', mt: 'findByNameAndAgeGreaterThan', ret: 'page', pg: '0', ent: 'assigned' } },
    { t: 'On the last page', q: 'What if you request page number 2, the last page, as a Page?', d: 'The total can be calculated, so no count query is sent.', v: { sc: 'page', mt: 'findByNameAndAgeGreaterThan', ret: 'page', pg: '2', ent: 'assigned' } },
    { t: 'Receiving a Slice', q: 'What if you receive a Slice instead of a Page and request page number 0?', d: 'There is no count query, but it reads one extra row to see whether a next slice exists.', v: { sc: 'page', mt: 'findByNameAndAgeGreaterThan', ret: 'slice', pg: '0', ent: 'assigned' } },
    { t: 'save: a new entity, but a SELECT comes first', q: 'What if you call save() with a new Coupon whose id you set in the code?', d: 'For an entity whose id you set yourself, one more SELECT is sent before the INSERT.', v: { sc: 'save', mt: 'findByNameAndAgeGreaterThan', ret: 'page', pg: '2', ent: 'assigned' } },
  ],
  // 7 members (id, name, age). They correspond to the data that the Probe inserts
  members: [[1, 'Alice', 30], [2, 'Alice', 17], [3, 'Bob', 25], [4, 'Carol', 41], [5, 'Dave', 22], [6, 'Erin', 19], [7, 'Alicia', 35]],
  methods: {
    findByName: { ret: 'List<Member>', params: 'String name', call: '"Alice"', args: ['Alice'] },
    findByNameAndAgeGreaterThan: { ret: 'List<Member>', params: 'String name, int age', call: '"Alice", 20', args: ['Alice', 20] },
    findByNameContainingOrderByAgeDesc: { ret: 'List<Member>', params: 'String part', call: '"li"', args: ['li'] },
    countByAgeGreaterThan: { ret: 'long', params: 'int age', call: '20', args: [20] },
    findByNickname: { ret: 'List<Member>', params: 'String nickname', call: '"Ally"', args: ['Ally'] },
    findByAgeGreaterThen: { ret: 'List<Member>', params: 'int age', call: '20', args: [20] },
  },
  saves: {
    'new': { make: 'new Member("Frank", 20)', note: 'id is null' },
    change: { make: 'new Member(1L, "Dave", 30)', note: 'id 1 is set directly. Id 1 in the DB is Alice' },
    same: { make: 'new Member(1L, "Alice", 30)', note: 'id 1 is set directly. The values are the same as id 1 in the DB' },
    gone: { make: 'new Member(999L, "Nobody", 30)', note: 'id 999 is not in the DB' },
    assigned: { make: 'new Coupon("SUMMER", "Summer sale")', note: 'code, which is the id, is set directly' },
  },
  // Splits the method name into pieces. It imitates the order in which Spring Data reads the name
  parse: function (name) {
    var types = { id: 'Long', name: 'String', age: 'int' }, low = function (s) { return s.charAt(0).toLowerCase() + s.slice(1); };
    var m = /^(find|count)By(.*)$/.exec(name), rest = m[2], order = '', oi = rest.indexOf('OrderBy');
    if (oi >= 0) { order = rest.slice(oi + 7); rest = rest.slice(0, oi); }
    var parts = [{ text: m[1] + '…By', kind: 'subject', sql: m[1] === 'count' ? 'select count' : 'select …' }];
    rest.split(/And(?=[A-Z])/).forEach(function (seg, i) {
      var kw = '', op = '= ?';
      [['GreaterThan', '> ?'], ['Containing', 'like ?']].forEach(function (k) { if (seg.slice(-k[0].length) === k[0]) { kw = k[0]; op = k[1]; } });
      var pn = kw ? seg.slice(0, -kw.length) : seg, prop = low(pn), p = { text: (i ? 'And ' : '') + seg, kind: 'cond', and: i > 0, kw: kw, op: op, prop: prop };
      if (types[prop]) p.sql = prop + ' ' + op;
      else {
        // If the name does not exist, split it at word boundaries and also look for "a property inside the first property"
        var words = pn.match(/[A-Z][a-z0-9]*/g) || [pn];
        p.msg = "No property '" + prop + "' found for type 'Member'";
        for (var k = words.length - 1; k >= 1; k--) { var head = low(words.slice(0, k).join('')); if (types[head]) { p.head = head; p.tail = low(words.slice(k).join('')); p.headType = types[head]; p.msg = "No property '" + p.tail + "' found for type '" + types[head] + "'; Traversed path: Member." + head; break; } }
      }
      parts.push(p);
    });
    if (order) { var om = /^(.*?)(Asc|Desc)$/.exec(order); parts.push({ text: 'OrderBy' + order, kind: 'order', prop: low(om[1]), dir: om[2].toLowerCase(), sql: 'order by ' + low(om[1]) + ' ' + om[2].toLowerCase() }); }
    return parts;
  },
  code: function (c) {
    var member = '@Entity\nclass Member {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n    int age;\n    // constructor and getters omitted\n}\n\n';
    if (c.sc === 'name') {
      var d = this.methods[c.mt];
      return member + '// Do not write an implementation class. Declare only the interface\ninterface MemberRepository extends JpaRepository<Member, Long> {\n    ' + d.ret + ' ' + c.mt + '(' + d.params + ');\n}\n\n// service\n' + d.ret + ' result = memberRepository.' + c.mt + '(' + d.call + ');';
    }
    if (c.sc === 'page') {
      var req = 'Pageable pageable = PageRequest.of(' + c.pg + ', 3, Sort.by("id"));   // page number ' + c.pg + ', 3 per page\n';
      return member + 'interface MemberRepository extends JpaRepository<Member, Long> {\n    // Page<Member> findAll(Pageable pageable) is already in JpaRepository\n    Slice<Member> findSliceBy(Pageable pageable);\n}\n\n// service\n' + req +
        (c.ret === 'slice' ? 'Slice<Member> slice = memberRepository.findSliceBy(pageable);\nslice.getContent();   // the members of this page\nslice.hasNext();      // whether there is a next slice' : 'Page<Member> page = memberRepository.findAll(pageable);\npage.getContent();         // the members of this page\npage.getTotalElements();   // total number of elements\npage.hasNext();            // whether there is a next page');
    }
    var s = this.saves[c.ent];
    if (c.ent === 'assigned') return '@Entity\nclass Coupon {\n    @Id\n    String code;      // There is no @GeneratedValue. The id is set directly in code\n    String title;\n    // constructor omitted\n}\n\ninterface CouponRepository extends JpaRepository<Coupon, String> { }\n\n// service\nCoupon coupon = ' + s.make + ';   // ' + s.note + '\nCoupon saved = couponRepository.save(coupon);';
    return member + 'interface MemberRepository extends JpaRepository<Member, Long> { }\n\n// service\nMember member = ' + s.make + ';   // ' + s.note + '\nMember saved = memberRepository.save(member);';
  },
  label: function (c) {
    if (c.sc === 'name') return c.mt;
    if (c.sc === 'page') return (c.ret === 'slice' ? 'Slice' : 'Page') + ' · page number ' + c.pg;
    return 'save · ' + { 'new': 'new member', change: 'id 1, different name', same: 'id 1, same values', gone: 'id 999 (not in the DB)', assigned: 'new coupon (id set directly)' }[c.ent];
  },
  columns: ['Application startup', 'SQL sent to the DB', 'SQL details', 'Result'],
  simulate: function (c) {
    var self = this, ev = [], sum = [], sent = [], coupon = c.sc === 'save' && c.ent === 'assigned';
    var st = { boot: 'ing', call: '', called: false, steps: [], out: { t: 'Result', s: 'None yet', cls: 'ghost' }, sent: sent, tbl: coupon ? 'coupon' : 'member',
      rows: coupon ? [{ k: 'WELCOME', v: 'Welcome gift', cls: '' }] : this.members.map(function (m) { return { k: 'id ' + m[0], v: m[1] + ' · ' + m[2], cls: '' }; }) };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function send(sql, why) { sent.push({ sql: sql, why: why }); }
    var row, msg = '', order = '';

    if (c.sc === 'name') {
      var d = this.methods[c.mt], parts = this.parse(c.mt), bad = null;
      st.call = c.mt + '(' + d.call + ')';
      st.steps = parts.map(function (p) { return { t: p.text, r: '', cls: 'ghost' }; });
      push('Application start: Spring Data JPA finds the interface MemberRepository, which extends JpaRepository. You never wrote an implementation class, but Spring Data creates an implementation object (a proxy) of this interface on your behalf and registers it as a bean.');
      for (var i = 0; i < parts.length && !bad; i++) {
        var p = parts[i];
        if (p.kind === 'subject') {
          st.steps[i] = { t: p.text, r: p.sql === 'select count' ? 'counts' : 'selects', cls: 'good' };
          push('Reading the method name: The method ' + c.mt + ' has no body written by a person. Spring Data splits the name, reads it, and builds a query. The ' + p.text + ' at the beginning means ' + (p.sql === 'select count' ? '"count the matching rows"' : '"select the matching rows"') + ', and what follows By is the condition.');
        } else if (p.kind === 'cond' && p.sql) {
          st.steps[i] = { t: p.text, r: (p.and ? 'and ' : '') + p.sql, cls: 'good' };
          push(p.text + ': ' + (p.and ? 'And means joining with the previous condition by and. ' : '') + (p.kw === 'GreaterThan' ? 'The keyword at the end (GreaterThan) means "greater than". ' : p.kw === 'Containing' ? 'The keyword at the end (Containing) means "contains this text". ' : 'No keyword is attached, so the condition is "equals". ') + 'It checks whether the Member entity has a property with this name (' + p.prop + '). It does, so the condition in the query is "' + p.sql + '". The question mark is where the value passed in the call goes.', 'good');
        } else if (p.kind === 'cond') {
          bad = p; msg = p.msg;
          st.steps[i] = { t: p.text, r: 'No such property', cls: 'bad' };
          if (p.head) push(p.text.replace('And ', '') + ': The keyword that Spring Data knows is GreaterThan. GreaterThen is not a keyword, so the whole piece is read as a property name. Member has no such property, so it splits the name at word boundaries and also looks for "' + p.tail + ' inside ' + p.head + '". The ' + p.head + ' property exists, but there is no "' + p.tail + '" property inside its type (' + p.headType + ').', 'bad');
          else push(p.text.replace('And ', '') + ': No keyword is attached, so it is read as an "equals" condition. But the Member entity has no property with this name (' + p.prop + '). It has only id, name, and age. There is nothing to apply the condition to, so the query cannot be built.', 'bad');
        } else {
          st.steps[i] = { t: p.text, r: p.sql, cls: 'good' };
          push(p.text + ': What follows OrderBy is the sort key. It sorts by the ' + p.prop + ' value of the Member entity, ' + (p.dir === 'desc' ? 'largest first (Desc)' : 'smallest first (Asc)') + '.', 'good');
        }
      }
      if (bad) {
        st.boot = 'fail'; st.out = { t: 'PropertyReferenceException', s: msg.split(';')[0], cls: 'bad' };
        push('Application startup failed: The query could not be built and a PropertyReferenceException was thrown. The repository bean cannot be created, so the application does not start. The error message is "' + msg + '". Even though this method was never called, the problem shows up at startup.', 'bad');
        row = ['Failed (PropertyReferenceException)', '0', 'none', 'The method cannot be called'];
        sum.push('The application could not start. The method name contains a property name that the Member entity does not have.');
        sum.push(bad.head ? 'If a keyword is misspelled, you are not told that it is an unknown keyword. Spring Data tries to read even the wrong part as a property name and fails, so the word in the error message (' + bad.tail + ') looks unfamiliar. First check whether the word in the message is a misspelled keyword.' : 'A property name in a method name must match a field name of the entity class, not a column name.');
        sum.push('Turning a name into a query is done in advance, when the application starts. So a wrong name is found before any real request arrives.');
      } else {
        var q = parts.map(function (x) { return x.kind === 'cond' ? (x.and ? 'and ' : 'where ') + x.sql : x.sql; }).join(' ');
        st.boot = 'ok'; st.out = { t: 'Prepared query', s: q, cls: 'wait' };
        push('Application startup complete: Reading the name is finished and the query is ready. This reading and the property check are done in advance, when the application starts, not when the method is called.', 'good');
        var conds = parts.filter(function (x) { return x.kind === 'cond'; }), ord = parts.filter(function (x) { return x.kind === 'order'; })[0], idx = { id: 0, name: 1, age: 2 };
        var hit = this.members.filter(function (m) { return conds.every(function (x, j) { var v = m[idx[x.prop]], a = d.args[j]; return x.op === '= ?' ? v === a : x.op === '> ?' ? v > a : String(v).indexOf(a) >= 0; }); });
        if (ord) { hit.sort(function (a, b) { return (a[idx[ord.prop]] - b[idx[ord.prop]]) * (ord.dir === 'desc' ? -1 : 1); }); order = hit.map(function (m) { return m[idx[ord.prop]]; }).join(' '); }
        var like = conds.some(function (x) { return x.kw === 'Containing'; });
        st.called = true; send(q, 'Method call');
        hit.forEach(function (m) { st.rows[m[0] - 1].cls = 'good'; });
        push('Call to memberRepository.' + c.mt + '(' + d.call + '): The implementation object puts the values you passed into the question mark positions of the prepared query and sends one SELECT.' + (like ? ' Containing wraps the value in % on both sides and applies a like condition with %li%.' : ''));
        var count = parts[0].sql === 'select count';
        st.out = { t: 'Returned value', s: count ? 'Number ' + hit.length : hit.length + (hit.length === 1 ? ' member' : ' members') + (ord ? ' (' + ord.prop + ' order: ' + order.split(' ').join(', ') + ')' : ''), cls: 'good' };
        push('Result: ' + (count ? 'The number of members that match the condition is ' + hit.length + ', so it returns the number ' + hit.length + '.' : 'It returns the ' + hit.length + (hit.length === 1 ? ' member' : ' members') + ' that match the condition as a list of Member objects.' + (ord ? ' The ' + ord.prop + ' values are in the order ' + order.split(' ').join(', ') + '.' : '')), 'good');
        row = ['Success', '1', q, count ? 'Number ' + hit.length + ' (a count)' : hit.length + (hit.length === 1 ? ' member' : ' members')];
        sum.push('A method with no body was called, and the query "' + q + '" was sent once. The method name is the query.');
        sum.push('The rule: write the property name of the entity after find…By or count…By, put the kind of condition (GreaterThan, Containing, and so on) after the property name, and join several conditions with And or Or. Parameters go into the conditions in order, not by name.');
        sum.push('When there are more than three or four conditions, the name becomes too long. Then it is easier to read if you write the JPQL directly in @Query.');
      }
    }

    if (c.sc === 'page') {
      var pg = +c.pg, size = 3, slice = c.ret === 'slice', off = pg * size, ask = slice ? size + 1 : size, all = this.members.length;
      var got = this.members.slice(off, off + ask), content = got.slice(0, size);
      st.call = (slice ? 'findSliceBy' : 'findAll') + '(PageRequest.of(' + pg + ', 3, Sort.by("id")))';
      st.steps = [{ t: 'PageRequest.of(' + pg + ', 3, …)', r: '', cls: 'ghost' }, { t: 'Content query', r: '', cls: 'ghost' }, { t: slice ? 'Decide whether a next slice exists' : 'Count query', r: '', cls: 'ghost' }];
      st.boot = 'ok';
      push('Application start: Spring Data JPA creates an implementation object (a proxy) of the MemberRepository interface and registers it as a bean. ' + (slice ? 'The findSliceBy that you declared yourself is read by its name and prepared as a query that "selects everything with no condition".' : 'A method that JpaRepository already has, such as findAll(Pageable), is handled by the SimpleJpaRepository class inside Spring Data.'));
      st.steps[0] = { t: st.steps[0].t, r: 'skip ' + off + ', take 3', cls: 'good' };
      push('PageRequest.of(' + pg + ', 3, Sort.by("id")): A request for page number ' + pg + ', 3 per page, in id order. Page numbers start from 0, so this is page #' + (pg + 1) + '. The number of rows to skip at the front is ' + pg + ' × 3 = ' + off + '.');
      st.called = true; send('select … order by id (skip ' + off + ', take ' + ask + ')', 'Content query');
      got.forEach(function (m, j) { st.rows[m[0] - 1].cls = j < size ? 'good' : 'wait'; });
      st.steps[1] = { t: 'Content query', r: ask + ' requested → ' + got.length + ' returned', cls: 'good' };
      push('Content query: ' + (slice ? 'A Slice only needs to know whether a next slice exists. So it requests one more row, 4 instead of 3. ' : '') + 'It sends a SELECT that skips ' + off + ' rows and reads up to ' + ask + ' rows. ' + (got.length ? 'There are 7 members, so the query returns ' + got.length + (got.length === 1 ? ' row.' : ' rows.') : 'There are only 7 members, so no rows are returned.'));
      var hasNext, counted = false, total = all;
      if (slice) {
        hasNext = got.length > size;
        st.steps[2] = { t: 'Decide whether a next slice exists', r: hasNext ? '4 returned → yes' : got.length + ' returned → no', cls: 'good' };
        push('Deciding whether a next slice exists: ' + (hasNext ? 'It requested 4 rows and 4 came back, so there is a next slice. The one extra row (blue) is discarded and only 3 are returned.' : 'It requested 4 rows but only ' + got.length + ' came back, so there is no next slice.') + ' It does not count the total, so no count query is sent.', 'good');
      } else {
        var skip = content.length < size && (off === 0 || content.length > 0);
        if (skip) {
          st.steps[2] = { t: 'Count query', r: 'not sent (' + off + ' + ' + content.length + ' = ' + all + ')', cls: 'plain' };
          push('Count query skipped: The number of rows that came back, ' + content.length + ', is smaller than the page size of 3. That means this is the last page, so the total can be calculated as the ' + off + ' skipped + the ' + content.length + ' read = ' + all + '. No count query is sent.', 'good');
        } else {
          counted = true; send('select count … (total)', 'Count query');
          st.steps[2] = { t: 'Count query', r: 'select count → ' + all, cls: 'hot' };
          push('Count query: ' + (content.length ? 'The page came back full with 3 rows, so this result alone cannot tell you whether there are more after it, or how many there are in total.' : 'No rows came back, so there is nothing to calculate the total from.') + ' A Page needs to know the total, so one more select count query is sent. The total is ' + all + '.');
        }
        hasNext = off + size < total;
      }
      var res = 'Content: ' + content.length + ' · ' + (slice ? 'Total unknown' : 'Total: ' + total) + ' · Next: ' + (hasNext ? 'yes' : 'no');
      st.out = { t: slice ? 'Returned Slice' : 'Returned Page', s: res, cls: 'good' };
      push('Result: ' + (slice ? 'The size of slice.getContent() is ' + content.length + ', and slice.hasNext() is ' + hasNext + '. With a Slice, you cannot know how many rows there are in total or how many pages there are.' : 'The size of page.getContent() is ' + content.length + ', page.getTotalElements() is ' + total + ', page.getTotalPages() is ' + Math.ceil(total / size) + ', and page.hasNext() is ' + hasNext + '.'), 'good');
      row = ['Success', sent.length + '', 'Content query (skip ' + off + ', request ' + ask + ')' + (counted ? ' + count query' : ''), res];
      if (slice) sum.push('A Slice does not send a count query. Instead, it reads one extra row to learn only whether a next slice exists. It suits screens that do not need the total number of pages, such as a "Load more" button or infinite scroll.');
      else if (counted) sum.push('When you receive a Page, a query that counts the total is sent in addition to the content query. On a table with a lot of data, this count query can be slower than the content query. If you do not need the total, you can receive a Slice instead.');
      else sum.push('When fewer rows come back than the page size, as on the last page, Spring Data can work out the total itself, so it skips the count query. So the number of queries differs by page even though the code is the same.');
      if (!content.length) sum.push('Requesting a page that does not exist does not throw an exception; empty content comes back.');
    }

    if (c.sc === 'save') {
      var e = c.ent, sv = this.saves[e], repo = coupon ? 'couponRepository' : 'memberRepository', isNew = e === 'new';
      st.call = 'save(' + sv.make + ')';
      st.steps = [{ t: 'Is it a new entity (is the id null)?', r: '', cls: 'ghost' }, { t: 'merge queries first', r: '', cls: 'ghost' }, { t: 'Write SQL', r: '', cls: 'ghost' }];
      st.boot = 'ok';
      push('Application start: Spring Data JPA creates an implementation object (a proxy) of the ' + (coupon ? 'CouponRepository' : 'MemberRepository') + ' interface and registers it as a bean. A method that JpaRepository already has, such as save, is handled by the SimpleJpaRepository class inside Spring Data.');
      push(sv.make + ': A Java object was created. ' + (isNew ? 'You did not set an id, so the id is null. The id is decided by the DB when the object is saved.' : e === 'assigned' ? 'Coupon is an entity whose id, code, is set directly in code, so it already has an id (SUMMER) from the moment it is created. It is a coupon that is not in the DB yet.' : e === 'gone' ? 'You set the id directly to 999. There is no member with id 999 in the DB.' : 'You set the id directly to 1. This is an object created with new, not an object read from the DB.'));
      st.called = true;
      st.steps[0] = { t: st.steps[0].t, r: isNew ? 'yes → persist' : 'no → merge', cls: 'good' };
      push(repo + '.save(…) call: save first decides "is this a new entity". The default rule is that an entity with a null id is new. ' + (isNew ? 'The id is null, so it is treated as a new entity and calls em.persist.' : 'An id is present, so it is treated as not new and calls em.merge.' + (e === 'assigned' ? ' It decides this even though this is a coupon being saved for the first time.' : '')));
      if (isNew) {
        st.steps[1] = { t: st.steps[1].t, r: 'not queried', cls: 'plain' };
        send('insert into member …', 'persist'); st.rows.push({ k: 'id 8', v: 'Frank · 20', cls: 'hot' });
        st.steps[2] = { t: 'Write SQL', r: 'INSERT', cls: 'hot' };
        push('INSERT: It sends an INSERT directly, without a query first. This uses the IDENTITY strategy, where the DB decides the id, so the INSERT is run and the id 8 decided by the DB is received and filled into the object.', 'good');
        st.out = { t: 'Returned object', s: 'The object you passed (id 8 filled in)', cls: 'good' };
        push('Result: The object that save returned is the same object you passed. There are now 8 members.', 'good');
        row = ['Success', '1', 'INSERT', '8 members now · the returned object is the same as the one passed'];
        sum.push('save branches into "persist if the entity is new, merge otherwise". Whether it is new is decided by default by whether the id is null.');
      } else {
        var found = e === 'change' || e === 'same', key = coupon ? 'code = SUMMER' : 'id = ' + (e === 'gone' ? 999 : 1);
        send('select … where ' + key.replace(/= .*/, '= ?'), 'merge');
        st.steps[1] = { t: st.steps[1].t, r: found ? 'found' : 'not found', cls: 'hot' };
        if (found) st.rows[0].cls = 'wait';
        push('SELECT: merge does not save the object you passed as it is. It first queries the row with the same id from the DB (' + key + '). ' + (found ? 'Member Alice with id 1 exists, so it creates a separate managed object with that content and overwrites it with the values of the object you passed.' : 'There is no such row.'));
        if (e === 'change') {
          send('update member … where id = ?', 'dirty checking'); st.rows[0] = { k: 'id 1', v: 'Dave · 30', cls: 'hot' };
          st.steps[2] = { t: 'Write SQL', r: 'UPDATE', cls: 'hot' };
          push('UPDATE: After the overwrite, the name (Dave) differs from the value that was queried (Alice). When the transaction of save commits, it finds what changed and sends an UPDATE.', 'good');
          st.out = { t: 'Returned object', s: 'A different, managed object, not the one you passed', cls: 'good' };
          push('Result: Id 1 in the DB is now Dave. The object that save returned is not the one you passed but the managed object that merge created.', 'good');
          row = ['Success', '2', 'SELECT → UPDATE', 'The name in the DB changed to Dave · the returned object differs from the one passed'];
          sum.push('If you save an object that has an id, a SELECT queries first, and an UPDATE is sent when the values differ.');
          sum.push('The object that save returned and the object you passed are different objects. When you keep working after saving, use the returned object.');
        } else if (e === 'same') {
          st.steps[2] = { t: 'Write SQL', r: 'Nothing to send', cls: 'plain' };
          push('No write SQL: It overwrote the values, but nothing differs from the queried values. There is no UPDATE to send when the transaction commits.');
          st.out = { t: 'Returned object', s: 'A different, managed object, not the one you passed', cls: 'good' };
          push('Result: Only one SELECT was sent and the DB is unchanged. Calling save does not always send an INSERT or UPDATE.', 'good');
          row = ['Success', '1', 'SELECT', 'No change in the DB · the returned object differs from the one passed'];
          sum.push('save was called, but no write SQL was sent. merge sends an UPDATE only when something differs from the queried values.');
          sum.push('Conversely, for an entity queried inside a transaction, just changing its values sends an UPDATE at commit, so you do not need to call save again (dirty checking).');
        } else if (e === 'gone') {
          send('select … where id = ?', 'merge (checks again)');
          st.steps[1] = { t: st.steps[1].t, r: 'not found (twice)', cls: 'hot' };
          st.steps[2] = { t: 'Write SQL', r: 'None (exception)', cls: 'bad' };
          st.out = { t: 'ObjectOptimisticLockingFailureException', s: 'No INSERT or UPDATE was done', cls: 'bad' };
          push('Exception: Member is an entity whose id the DB decides. If such an entity has an id, it means the object was saved before, but there is no such row in the DB. Hibernate assumes that "someone deleted a row that existed in the meantime" and throws an exception. In Hibernate 7.4.5 on the PC used to write this lab, the same SELECT was sent once more, and then Spring translated the optimistic lock exception thrown by Hibernate into an ObjectOptimisticLockingFailureException and threw that. It does not INSERT the object as a new row.', 'bad');
          row = ['Success', '2', 'SELECT → SELECT', 'Exception (ObjectOptimisticLockingFailureException) · No change in the DB'];
          sum.push('If you save an entity whose id the DB decides with an id that does not exist, it is not saved and an exception is thrown. Do not set an id on an object that you are saving as new.');
          sum.push('This behavior differs by Hibernate version. The migration guide for Hibernate 6.6 says that in the versions before it, an INSERT was sent in this case without an exception (older versions were not run).');
        } else {
          send('insert into coupon …', 'Saved as a new row'); st.rows.push({ k: 'SUMMER', v: 'Summer sale', cls: 'hot' });
          st.steps[2] = { t: 'Write SQL', r: 'INSERT', cls: 'hot' };
          push('INSERT: The query found no such row, so only then is it saved as a new row. The INSERT is sent when the transaction commits. Saving one new coupon took two statements, a SELECT and an INSERT.', 'bad');
          st.out = { t: 'Returned object', s: 'A different, managed object, not the one you passed', cls: 'good' };
          push('Result: There are now 2 coupons. The object that save returned is not the one you passed but the managed object that merge created.', 'good');
          row = ['Success', '2', 'SELECT → INSERT', '2 coupons now · the returned object differs from the one passed'];
          sum.push('An entity whose id is set directly in code has an id even when it is saved for the first time. save decides "this is not a new entity" and sends a SELECT first. When you save many, that many extra SELECTs are sent.');
          sum.push('In this case, either let the entity implement the Persistable interface to tell Spring Data directly whether it is new, or add a @Version field. It was confirmed by running it on the PC used to write this lab that when you tell Spring Data that the entity is new through Persistable, only one INSERT is sent, without a SELECT.');
        }
      }
    }
    return { events: ev, summary: sum, row: row, msg: msg, order: order };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go step by step, starting with the application starting up.'); return; }
    H.counters(v, [[s.sent.length, 'SQL sent to the DB']]);
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Reason'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i === s.sent.length - 1 ? 'hot' : '' }, q.why] }; }), 'SQL sent to the DB');  },
  // Diagram: at the top, the method that was called and the startup state; on the left, the steps that the implementation made by Spring Data goes through; on the right, the rows of the DB. An arrow appears only in the steps where SQL is sent.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], prev = shown[shown.length - 2], first = sim.events[0].snap;
    var s = last ? last.snap : { boot: '', call: first.call, called: false, steps: first.steps, out: first.out, sent: [], rows: first.rows, tbl: first.tbl };
    var fresh = s.sent.slice(prev ? prev.snap.sent.length : 0);
    P.size(680, 340);
    P.box('call', 16, 12, 440, 40, { cls: s.called ? 'hot' : s.boot === 'fail' ? 'ghost' : 'plain', title: s.call, sub: s.called ? 'Called' : s.boot === 'fail' ? 'Cannot be called' : 'Not called yet' });
    P.box('boot', 464, 12, 200, 40, { cls: s.boot === 'fail' ? 'bad' : s.boot === 'ok' ? 'good' : s.boot === 'ing' ? 'wait' : 'ghost', title: 'Application', right: s.boot === 'fail' ? 'Failed' : s.boot === 'ok' ? 'Started' : s.boot === 'ing' ? 'Starting' : 'Not started' });
    P.region('impl', 16, 64, 440, 264, 'Implementation made by Spring Data (proxy)');
    s.steps.forEach(function (x, i) { P.box('p' + i, 28, 96 + i * 40, 416, 34, { cls: x.cls, title: x.t, right: x.r }); });
    P.box('out', 28, 264, 416, 52, { cls: s.out.cls, title: s.out.t, sub: s.out.s });
    P.region('db', 464, 64, 200, 264, s.tbl + ' table in the DB');
    s.rows.forEach(function (r, i) { P.box('r' + i, 474, 94 + i * 28, 180, 24, { cls: r.cls || 'plain', title: r.k, right: r.v }); });
    if (fresh.length) P.arrow('sql', 'impl:r', 'db:l', { cls: 'hot', label: fresh.map(function (q) { return q.sql.split(' ')[0].toUpperCase(); }).join(', ') });
    P.note(c.sc === 'name' ? 'The boxes on the left are the pieces that the method name was split into, and the text on the right shows what part each piece plays in the query. The … after select means all the columns of the member. Green rows are the members that matched the condition and were selected.' : c.sc === 'page' ? 'Green rows are the members returned for this page. Blue rows are the extra row that a Slice reads to see whether a next slice exists; they are not returned.' : 'The arrow in the middle shows that SQL was sent to the DB in this step. Yellow rows are rows that were created or whose values changed, and blue rows are rows that merge queried.');
  },
  assume: 'All the scenes (6 method names, 8 page requests, and 5 save cases) were run on the PC used to write this lab by actually starting Spring Data JPA 4.1.1, Hibernate 7.4.5, and an H2 database with the auto-configuration of Spring Boot 4.1.1, and whether startup succeeded, the exception name and message, the number and kind of SQL statements sent to the database, the shape of where and order by, the number of rows skipped and requested, and the results received were checked against the screen. It was also confirmed by execution that the implementation of the repository is a proxy and that SimpleJpaRepository is behind it. The SQL on the screen is shortened to be easy to read. The actual SQL has table aliases, and the like condition has an escape clause added to it, and the shape of the statement differs by Hibernate version and database. The two wrong method names were checked by starting a separate repository that has only that method. Other keywords mentioned in the result summaries, such as Or, follow the keyword table in the Spring Data JPA documentation and were not run. The decision of whether an entity is new in save follows the "Entity State-detection Strategies" section of the Spring Data JPA documentation, and for an entity with a @Version field, the decision is made by whether that field is null instead of the id. The SELECT being sent twice and the exception being thrown in the id 999 example are results seen with Hibernate 7.4.5, and they differ by version. It was also confirmed by execution that when an entity whose id is set directly implements Persistable and tells Spring Data that it is new, only one INSERT is sent without a SELECT (the way of adding a @Version field was not run). save was called with no transaction outside it, so the UPDATE and INSERT are sent when the transaction of save itself ends. If there is a @Transactional outside, they are sent when that transaction commits.',
});
