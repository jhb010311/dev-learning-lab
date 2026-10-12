Lab.register({
  id: 'bulk', nav: '벌크 연산', cat: 'JPA', mode: 'step',
  title: '한 번에 고치는 UPDATE 뒤에 엔티티는 왜 옛 값인가',
  intro: 'executeUpdate로 실행하는 UPDATE와 DELETE(벌크 연산)는 SQL 한 번으로 여러 행을 고칩니다. 그런데 이 SQL은 영속성 컨텍스트를 거치지 않고 DB에 바로 실행됩니다. 그래서 이미 조회해 둔 엔티티는 DB가 바뀐 것을 모릅니다.',
  terms: ['벌크 연산', 'em.clear와 em.refresh', '영속성 컨텍스트', '1차 캐시', '쓰기 지연과 flush'],
  controls: [
    { id: 'op', label: '가격을 고치는 방법', type: 'select', value: 'update', options: [['update', '벌크 UPDATE (모든 상품의 가격 + 500)'], ['delete', '벌크 DELETE (모든 상품 삭제)'], ['each', '엔티티를 하나씩 setPrice (변경 감지)']] },
    { id: 'after', label: '벌크 연산 뒤에 상품 1을 읽는 방법', type: 'select', value: 'none', options: [['none', '갖고 있던 엔티티를 그대로 읽음'], ['find', 'em.find로 다시 조회'], ['jpql', 'JPQL로 목록을 다시 조회'], ['clear', 'em.clear() 뒤에 em.find'], ['refresh', 'em.refresh(first)']], show: function (c) { return c.op !== 'each'; } },
    { id: 'dirty', label: '그 전에 상품 1의 가격을 5000으로 고쳐 둠', type: 'check', value: false, hint: 'setPrice만 부른 상태입니다. 아직 DB로 나가지 않은 변경입니다.' },
    { id: 'n', label: '상품 수', type: 'range', min: 2, max: 8, value: 3, step: 1, fmt: function (v) { return v + '개'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '상품 3개의 가격을 벌크 UPDATE로 500씩 올린 뒤 갖고 있던 엔티티로 상품 1의 가격을 읽으면', d: '벌크 UPDATE 뒤에 엔티티를 읽으면 옛 값 1000원이 나옵니다.', v: { op: 'update', after: 'none', dirty: false, n: 3 } },
    { t: '다시 조회해도 옛 값', q: '벌크 UPDATE 뒤 JPQL로 목록을 다시 조회해 상품 1의 가격을 읽으면', d: 'JPQL로 다시 읽어도 보관 중인 엔티티가 그대로 돌아옵니다.', v: { op: 'update', after: 'jpql', dirty: false, n: 3 } },
    { t: 'em.clear() 뒤에 조회', q: '벌크 UPDATE 뒤 em.clear 하고 em.find로 상품 1을 읽으면', d: '영속성 컨텍스트를 비우면 DB의 새 값을 읽습니다.', v: { op: 'update', after: 'clear', dirty: false, n: 3 } },
    { t: 'em.refresh', q: '벌크 UPDATE 뒤 em.refresh로 상품 1을 다시 읽어 오면', d: '그 엔티티 하나만 DB의 값으로 덮어씁니다.', v: { op: 'update', after: 'refresh', dirty: false, n: 3 } },
    { t: '미뤄 둔 변경이 있으면', q: '벌크 UPDATE 전에 상품 1의 가격을 5000으로 고쳐 두면', d: '벌크 연산 직전에 그 변경이 먼저 DB로 나갑니다.', v: { op: 'update', after: 'none', dirty: true, n: 3 } },
    { t: '하나씩 고치면', q: '벌크 UPDATE 대신 상품 8개를 하나씩 setPrice로 고치면', d: '상품 8개에 UPDATE가 8번 나갑니다. 벌크 연산은 1번입니다.', v: { op: 'each', after: 'none', dirty: false, n: 8 } },
    { t: '벌크 DELETE 뒤 em.find', q: '벌크 DELETE로 모든 상품을 지운 뒤 em.find로 상품 1을 읽으면', d: 'DB에서 지워진 상품이 em.find로 그대로 나옵니다.', v: { op: 'delete', after: 'find', dirty: false, n: 3 } },
  ],
  code: function (c) {
    var sel = 'em.createQuery("select i from Item i order by i.id", Item.class).getResultList()';
    var s = '@Entity\nclass Item {\n    @Id Long id;\n    String name;\n    int price;\n    int getPrice() { return price; }\n    void setPrice(int price) { this.price = price; }\n}\n\n// 트랜잭션 안. DB에는 상품 ' + c.n + '개 (상품 1은 1000원, 상품 2는 2000원, …)\nList<Item> items = ' + sel + ';\nItem first = items.get(0);                 // 상품 1\n';
    if (c.dirty) s += 'first.setPrice(5000);                      // 아직 SQL은 나가지 않는다\n';
    s += '\n';
    if (c.op === 'update') s += 'int count = em.createQuery("update Item i set i.price = i.price + 500")\n        .executeUpdate();                  // 벌크 UPDATE\n';
    if (c.op === 'delete') s += 'int count = em.createQuery("delete from Item i")\n        .executeUpdate();                  // 벌크 DELETE\n';
    if (c.op === 'each') s += 'for (Item i : items) {\n    i.setPrice(i.getPrice() + 500);        // 엔티티를 하나씩 고친다\n}\n\nSystem.out.println(first.getPrice());\n';
    else {
      var nul = c.op === 'delete';
      s += '\n' + { none: 'System.out.println(first.getPrice());', find: 'Item again = em.find(Item.class, 1L);\nSystem.out.println(again.getPrice());', jpql: 'List<Item> again = ' + sel + ';\nSystem.out.println(' + (nul ? 'again.size()' : 'again.get(0).getPrice()') + ');', clear: 'em.clear();                                // 영속성 컨텍스트를 비운다\nItem again = em.find(Item.class, 1L);\nSystem.out.println(' + (nul ? 'again' : 'again.getPrice()') + ');', refresh: nul ? 'try {\n    em.refresh(first);                     // DB에서 다시 읽어 덮어쓴다\n    System.out.println(first.getPrice());\n} catch (RuntimeException e) {\n    System.out.println(e.getClass().getSimpleName());\n}' : 'em.refresh(first);                         // DB에서 다시 읽어 덮어쓴다\nSystem.out.println(first.getPrice());' }[c.after] + '\n';
    }
    return s + '// 메서드가 끝나면 커밋';
  },
  label: function (c) { return { update: '벌크 UPDATE', delete: '벌크 DELETE', each: '하나씩 고침' }[c.op] + (c.op === 'each' ? '' : ' · ' + { none: '그대로 읽음', find: 'em.find', jpql: 'JPQL 다시 조회', clear: 'clear 뒤 find', refresh: 'refresh' }[c.after]) + (c.dirty ? ' · 미뤄 둔 변경 있음' : '') + ' · 상품 ' + c.n + '개'; },
  columns: ['조회 SQL', '쓰기 SQL', '읽은 상품 1의 가격', 'DB의 상품 1'],
  simulate: function (c) {
    var op = c.op, after = op === 'each' ? 'none' : c.after, dirty = !!c.dirty, n = +c.n, ev = [], sum = [];
    var seq = { op: [], read: [], commit: [] }, phase = 'load';
    // items: mem 영속성 컨텍스트에 있는 엔티티의 가격(null이면 관리하지 않음), db DB의 가격(null이면 행 없음), pend 아직 DB로 보내지 않은 변경이 있음
    var st = { items: [], sent: [], fresh: [], hot: {}, read: '', err: '', cleared: false };
    for (var i = 1; i <= n; i++) st.items.push({ id: i, mem: null, db: 1000 * i });
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.fresh = []; st.hot = {}; }
    function send(tok, sql, at) { st.sent.push({ sql: sql, at: at }); st.fresh.push(sql.split(' ')[0].toUpperCase()); if (phase !== 'load') seq[phase].push(tok); }
    var first = st.items[0], selAll = 'select * from item order by id', sel1 = 'select * from item where id = 1';
    send('S', selAll, '처음 조회');
    st.items.forEach(function (it) { it.mem = it.db; });
    push('getResultList(): SELECT 1번으로 상품 ' + n + '개를 읽어 영속성 컨텍스트에 보관합니다. 상품 1의 가격은 1000원입니다.', '');
    if (dirty) { first.mem = 5000; first.pend = true; push('first.setPrice(5000): 메모리에 있는 상품 1의 가격만 5000원으로 바뀝니다. SQL은 아직 나가지 않았습니다. 커밋할 때 UPDATE로 나갈 "미뤄 둔 변경"입니다.', ''); }
    phase = 'op';
    if (op === 'each') {
      st.items.forEach(function (it) { it.mem += 500; it.pend = true; });
      push('반복문: 엔티티 ' + n + '개의 가격을 하나씩 500원 올립니다. 메모리의 값만 바뀌었고 SQL은 나가지 않았습니다.', '');
      st.read = first.mem + '원';
      push('first.getPrice(): 메모리에 있는 엔티티의 값 ' + first.mem + '원을 읽습니다. 엔티티를 직접 고쳤으므로 메모리의 값이 곧 최신 값입니다.', 'good');
      phase = 'commit';
      st.items.forEach(function (it) { send('U1', "update item set name = '상품" + it.id + "', price = " + it.mem + ' where id = ' + it.id, '커밋할 때'); it.db = it.mem; it.pend = false; }); st.hot.db = 1;
      push('메서드 종료, 커밋: flush가 일어나 변경 감지가 값이 달라진 엔티티 ' + n + '개를 찾아냅니다. 엔티티마다 UPDATE가 한 번씩, 모두 ' + n + '번 나갑니다.', 'bad');
    } else {
      if (dirty) {
        send('U1', "update item set name = '상품1', price = 5000 where id = 1", 'executeUpdate 직전 (flush)'); first.db = 5000; first.pend = false; st.hot.d1 = 1;
        push('executeUpdate() 직전: 벌크 연산은 DB에 바로 실행되므로, Hibernate가 그 전에 미뤄 둔 변경을 먼저 DB로 보냅니다(flush). 상품 1을 5000원으로 고치는 UPDATE가 먼저 나갑니다. 커밋은 아닙니다.', '');
      }
      if (op === 'update') {
        send('UB', 'update item set price = price + 500', 'executeUpdate'); st.items.forEach(function (it) { it.db += 500; }); st.hot.db = 1;
        push('executeUpdate(): UPDATE 한 문장이 DB에서 ' + n + '개 행의 가격을 한꺼번에 500원씩 올립니다. 반환값은 고쳐진 행 수 ' + n + '입니다. 이 SQL은 영속성 컨텍스트를 거치지 않으므로, 보관 중인 엔티티는 그대로입니다. 상품 1은 DB에서 ' + first.db + '원, 메모리에서 ' + first.mem + '원입니다.', 'bad');
      } else {
        send('DB', 'delete from item', 'executeUpdate'); st.items.forEach(function (it) { it.db = null; }); st.hot.db = 1;
        push('executeUpdate(): DELETE 한 문장이 DB에서 ' + n + '개 행을 한꺼번에 지웁니다. 반환값은 지워진 행 수 ' + n + '입니다. 이 SQL은 영속성 컨텍스트를 거치지 않으므로, 보관 중인 엔티티 ' + n + '개는 지워진 줄 모르고 그대로 남아 있습니다.', 'bad');
      }
      phase = 'read';
      var gone = op === 'delete';
      if (after === 'none') {
        st.read = first.mem + '원';
        push('first.getPrice(): 갖고 있던 엔티티에서 ' + first.mem + '원을 읽습니다. ' + (gone ? 'DB에는 이미 없는 상품입니다.' : 'DB의 값 ' + first.db + '원과 다릅니다.'), 'bad');
      }
      if (after === 'find') {
        st.read = first.mem + '원';
        push('em.find(Item.class, 1L): 영속성 컨텍스트(1차 캐시)에 상품 1이 있으므로 DB에 가지 않고 그 객체를 돌려줍니다. SQL이 나가지 않았고, 값은 여전히 ' + first.mem + '원입니다.' + (gone ? ' DB에서 지워진 상품인데도 null이 아니라 객체가 돌아옵니다.' : ''), 'bad');
      }
      if (after === 'jpql') {
        send('S', selAll, '다시 조회');
        if (gone) { st.read = '조회 결과 0건'; push('JPQL로 다시 조회: SELECT가 DB로 나갑니다. 행이 모두 지워졌으므로 결과는 0건입니다. 그런데 변수 first가 가리키는 엔티티는 여전히 영속성 컨텍스트에 남아 있습니다.', ''); }
        else { st.read = first.mem + '원'; push('JPQL로 다시 조회: SELECT가 DB로 나가고, DB는 새 값(' + first.db + '원)을 돌려줍니다. 하지만 영속성 컨텍스트에 같은 식별자의 엔티티가 이미 있으면, Hibernate는 방금 읽은 값을 버리고 보관 중인 엔티티를 그대로 돌려줍니다. 읽은 값은 여전히 ' + first.mem + '원입니다.', 'bad'); }
      }
      if (after === 'clear') {
        st.items.forEach(function (it) { it.mem = null; }); st.cleared = true;
        push('em.clear(): 영속성 컨텍스트를 비웁니다. 보관하던 엔티티는 모두 관리 대상에서 빠집니다. 옛 값을 가진 객체들이 1차 캐시에서 사라졌습니다.', '');
        send('S', sel1, 'em.find');
        if (gone) { st.read = 'null'; push('em.find(Item.class, 1L): 1차 캐시가 비었으므로 SELECT가 DB로 나갑니다. 행이 없으므로 null이 돌아옵니다. DB의 실제 상태가 보입니다.', 'good'); }
        else { first.mem = first.db; st.read = first.mem + '원'; push('em.find(Item.class, 1L): 1차 캐시가 비었으므로 SELECT가 DB로 나갑니다. 새 엔티티가 만들어지고 DB의 새 값 ' + first.mem + '원이 보입니다.', 'good'); }
      }
      if (after === 'refresh') {
        send('S', sel1, 'em.refresh');
        if (gone) { st.err = 'UnresolvableObjectException'; st.read = st.err; first.mem = null; push('em.refresh(first): 이 엔티티를 DB에서 다시 읽으려고 SELECT를 보냅니다. 그런데 행이 지워지고 없습니다. 다시 읽을 수 없으므로 UnresolvableObjectException이 납니다.', 'bad'); }
        else { first.mem = first.db; st.read = first.mem + '원'; push('em.refresh(first): 이 엔티티 하나를 DB에서 다시 읽어 덮어씁니다. SELECT가 1번 나가고 상품 1이 ' + first.mem + '원이 됩니다.' + (n > 1 ? ' 나머지 상품 ' + (n - 1) + '개는 여전히 옛 값입니다.' : ''), 'good'); }
      }
      phase = 'commit';
      push('메서드 종료, 커밋: ' + (st.err ? '예외를 잡아 처리했으므로 트랜잭션은 계속됩니다. ' : '') + '더 보낼 SQL이 없습니다.' + (dirty ? ' 미뤄 둔 변경은 벌크 연산 직전에 이미 나갔습니다.' : '') + ' 그대로 커밋합니다.', '');
    }
    var sels = st.sent.filter(function (x) { return x.sql.indexOf('select') === 0; }).length;
    var write = op === 'each' ? 'UPDATE ' + n + '번 (상품마다 1번)' : op === 'update' ? (dirty ? 'UPDATE 2번 (미뤄 둔 변경 1번 + 벌크 1번)' : 'UPDATE 1번 (벌크)') : (dirty ? 'UPDATE 1번 (미뤄 둔 변경) + DELETE 1번 (벌크)' : 'DELETE 1번 (벌크)');
    var dbText = first.db === null ? '행 없음' : first.db + '원';
    var readText = st.read;
    if (/^\d+원$/.test(st.read)) readText += first.db === null ? ' (DB에는 없는 행)' : st.read === dbText ? ' (DB와 같음)' : ' (DB는 ' + dbText + ')';
    if (op === 'each') sum.push('엔티티를 하나씩 고치면 메모리와 DB가 어긋날 일이 없지만, UPDATE가 상품 수만큼 나갑니다. 상품이 ' + n + '개면 ' + n + '번, 만 개면 만 번입니다. 같은 일을 벌크 UPDATE는 SQL 1번으로 끝냅니다.' + (dirty ? ' 먼저 5000원으로 고쳐 둔 상품 1은 거기에 500원이 더해져 5500원이 되고, UPDATE는 한 번만 나갑니다.' : ''));
    if (op !== 'each' && dirty) sum.push('벌크 연산을 실행하기 전에 미뤄 둔 변경이 먼저 flush됐습니다. 그래서 DB에서는 5000원으로 고친 뒤에 ' + (op === 'update' ? '500원이 더해져 5500원이 됐습니다. 순서가 반대였다면 5000원이 남았을 것입니다.' : '행이 지워졌습니다.'));
    if (op === 'update' && (after === 'none' || after === 'find' || after === 'jpql')) sum.push('벌크 연산은 영속성 컨텍스트를 거치지 않으므로, 이미 조회해 둔 엔티티는 옛 값을 그대로 갖고 있습니다. ' + (after === 'find' ? 'em.find는 1차 캐시를 먼저 보기 때문에 다시 불러도 소용이 없습니다.' : after === 'jpql' ? 'JPQL로 다시 조회해 DB에서 새 값을 읽어 와도, 같은 식별자의 엔티티가 이미 있으면 그 엔티티가 우선합니다.' : '이 값으로 계산을 이어 가면 틀린 결과가 됩니다.'), '벌크 연산 뒤에는 em.clear()로 영속성 컨텍스트를 비우거나, 벌크 연산을 엔티티를 조회하기 전에 먼저 실행합니다. 스프링 데이터 JPA에서는 @Modifying(clearAutomatically = true)가 이 일을 해 줍니다.');
    if (op === 'update' && after === 'clear') sum.push('em.clear()로 영속성 컨텍스트를 비우면 그 뒤의 조회는 DB에서 새로 읽습니다. 벌크 연산 뒤에 가장 흔히 쓰는 방법입니다. 다만 비우기 전에 갖고 있던 객체(first)는 관리 대상에서 빠지므로 더는 쓰지 않습니다.');
    if (op === 'update' && after === 'refresh') sum.push('em.refresh는 지정한 엔티티 하나만 DB의 값으로 덮어씁니다. 벌크 연산이 고친 엔티티가 여러 개라면 하나씩 refresh하는 것보다 em.clear()가 간단합니다.');
    if (op === 'delete') sum.push(after === 'clear' ? '영속성 컨텍스트를 비우고 나서야 "상품이 없다"는 DB의 실제 상태가 보입니다.' : after === 'refresh' ? '지워진 행의 엔티티를 refresh하면 예외가 납니다. 벌크 DELETE 뒤에는 그 엔티티들을 더 쓰지 않도록 em.clear()로 비웁니다.' : after === 'jpql' ? 'JPQL 조회는 DB에 가므로 지워진 것이 보이지만, 영속성 컨텍스트에는 지워진 상품의 엔티티가 그대로 남아 있습니다. em.find로는 여전히 그 객체가 나옵니다.' : '벌크 DELETE로 지운 행의 엔티티가 영속성 컨텍스트에 남아 있어서, 지워진 상품을 있는 것처럼 다루게 됩니다. 벌크 연산 뒤에는 em.clear()로 비웁니다.');
    if (op === 'delete') sum.push('벌크 DELETE는 엔티티를 거치지 않으므로 cascade나 orphanRemoval 설정도 따르지 않습니다. 같은 환경에서 cascade = ALL, orphanRemoval = true인 부모를 벌크 DELETE로 지워 보니, 자식은 지워지지 않고 외래 키 제약 위반으로 실패했습니다.');
    return { events: ev, summary: sum, seq: { op: seq.op.join(',') || '-', read: seq.read.join(',') || '-', commit: seq.commit.join(',') || '-' }, contains: !(st.cleared || st.err), row: ['SELECT ' + sels + '번', write, readText, dbText] };
  },
  blank: function (c) { var items = []; for (var i = 1; i <= +c.n; i++) items.push({ id: i, mem: null, db: 1000 * i }); return { items: items, sent: [], fresh: [], hot: {}, read: '', err: '', cleared: false }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(sim.c);
    H.counters(v, [[s.sent.length, 'DB로 나간 SQL'], [s.sent.filter(function (x) { return x.sql.indexOf('select') !== 0; }).length, '그 가운데 쓰기 SQL']]);
    H.table(v, ['상품', '엔티티 (메모리)', 'DB의 행', '상태'], s.items.map(function (it) {
      var diff = it.mem !== null && it.mem !== it.db;
      return { cells: ['상품 ' + it.id, { v: it.mem === null ? '(없음)' : it.mem + '원', cls: it.pend ? 'hot' : diff ? 'bad' : it.mem === null ? '' : 'good' }, it.db === null ? '(행 없음)' : it.db + '원', it.mem === null ? '' : it.pend ? '보내기 전' : diff ? '옛 값' : '같음'] };
    }), '메모리와 DB');
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 때'], s.sent.map(function (x, i) { return { cells: [String(i + 1), { v: x.sql, cls: i >= s.sent.length - s.fresh.length ? 'hot' : '' }, x.at] }; }), 'DB로 나간 SQL'); else { H.title(v, 'DB로 나간 SQL'); H.text(v, '아직 없습니다.'); }
  },
  // 그림: 왼쪽에 영속성 컨텍스트가 보관 중인 상품 엔티티, 오른쪽에 DB의 행을 같은 높이로 나란히 둔다. DB가 바뀐 줄 모르는 엔티티는 빨강, 아직 보내지 않은 변경은 노랑.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(sim.c), n = s.items.length;
    var rh = 44 + n * 29;                                  // 상품 수에 맞춘 영역 높이
    P.size(680, rh + 72);
    P.region('pc', 16, 16, 290, rh, s.cleared ? '영속성 컨텍스트 (비운 뒤)' : '영속성 컨텍스트 (보관 중인 엔티티)');
    P.region('db', 374, 16, 290, rh, 'DB의 item 테이블');
    s.items.forEach(function (it, i) {
      var y = 50 + i * 29, diff = it.mem !== null && it.mem !== it.db;
      P.box('m' + it.id, 30, y, 262, 25, { cls: it.mem === null ? 'ghost' : it.pend ? 'hot' : diff ? 'bad' : 'good', title: '상품 ' + it.id, right: it.mem === null ? '없음' : it.mem + '원' });
      P.box('d' + it.id, 388, y, 262, 25, { cls: it.db === null ? 'ghost' : s.hot.db || (s.hot.d1 && it.id === 1) ? 'hot' : 'plain', title: 'id ' + it.id, right: it.db === null ? '행 없음' : it.db + '원' });
    });
    if (s.fresh.length) { var kinds = {}; s.fresh.forEach(function (k) { kinds[k] = (kinds[k] || 0) + 1; }); P.arrow('sql', 'pc:r', 'db:l', { cls: 'hot', label: Object.keys(kinds).map(function (k) { return k + (kinds[k] > 1 ? ' ×' + kinds[k] : ''); }).join(', ') }); }
    P.box('res', 16, rh + 26, 648, 34, { cls: s.err ? 'bad' : s.read ? 'plain' : 'ghost', title: s.err ? '예외' : '읽은 상품 1의 가격', right: s.err || s.read || '아직 읽기 전' });
    P.note('같은 줄의 왼쪽과 오른쪽이 같은 상품입니다. 초록은 메모리의 엔티티와 DB의 값이 같은 것, 노랑은 아직 DB로 보내지 않은 변경이 있는 것, 빨강은 DB가 바뀐 줄 모르고 옛 값을 갖고 있는 것입니다. 가운데 화살표는 이번 단계에서 DB로 SQL이 나갔다는 표시입니다. 벌크 연산의 화살표는 왼쪽 엔티티를 바꾸지 않고 오른쪽 DB만 바꿉니다.');
  },
  assume: '식별자를 직접 넣는 단순한 엔티티 Item 하나, 하나의 트랜잭션과 영속성 컨텍스트 안에서 실행한다고 보았습니다. 방법 셋, 읽는 방법 다섯, 미뤄 둔 변경 여부, 상품 수 2·3·8개를 조합한 66가지("하나씩 고치기"에서는 읽는 방법 설정을 쓰지 않습니다)를 모두 실제 Hibernate 7.4.5와 H2 데이터베이스에서 실행해, 나간 SQL의 종류와 순서, executeUpdate의 반환값, 읽은 값, 끝난 뒤 DB의 값, 예외가 화면과 일치하는 것을 확인했습니다. 화면의 SQL은 읽기 쉽게 줄인 것입니다. 벌크 연산 직전의 flush는 기본 설정(FlushMode AUTO)에서의 동작입니다. 지워진 행을 refresh할 때의 예외는 이 환경에서 Hibernate의 UnresolvableObjectException이었습니다(JPA 문서는 이 경우의 예외를 EntityNotFoundException으로 적고 있습니다). 스프링 데이터 JPA의 @Modifying(clearAutomatically = true)는 이 환경에서 실행해 보지 않았고 문서를 따른 설명입니다. @Version이 있는 엔티티에 대한 벌크 UPDATE, 벌크 연산과 2차 캐시의 관계, 네이티브 SQL로 실행하는 벌크 연산은 다루지 않았습니다.',
});
