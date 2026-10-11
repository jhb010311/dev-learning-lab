Lab.register({
  id: 'merge', nav: '준영속과 병합', cat: 'JPA', mode: 'step',
  title: 'merge로 이름만 고쳤는데 왜 다른 값이 지워지나',
  intro: '영속성 컨텍스트 밖에 있는 준영속 객체는 값을 바꿔도 DB에 반영되지 않습니다. 반영하는 방법은 두 가지입니다. em.merge에 객체를 통째로 넘기는 병합과, 엔티티를 다시 조회해서 바꿀 값만 넣는 변경 감지입니다.',
  terms: ['준영속 상태', '병합(merge)', '변경 감지(Dirty Checking)', '영속성 컨텍스트', '엔티티의 네 가지 상태'],
  controls: [
    { id: 'src', label: '준영속 객체 m을 얻은 방법', type: 'select', value: 'form', options: [['form', '화면에서 받은 값으로 new (id와 name만 채움)'], ['loaded', '앞선 요청에서 조회해 둔 객체 (모든 필드가 채워짐)']] },
    { id: 'how', label: '이름을 바꾼 뒤 반영하는 방법', type: 'select', value: 'merge', options: [['merge', 'em.merge(m)으로 병합'], ['none', '아무것도 하지 않고 커밋'], ['dirty', '다시 조회해서 이름만 옮김 (변경 감지)']] },
    { id: 'after', label: 'merge 다음에 city를 "부산"으로 바꾼다면', type: 'select', value: 'none', options: [['none', '바꾸지 않는다'], ['arg', 'merge에 넘긴 객체 m에서 바꾼다'], ['ret', 'merge가 돌려준 객체 r에서 바꾼다']], show: function (c) { return c.how === 'merge'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '이름만 채운 객체를 merge합니다. city가 NULL이 됩니다.', v: { src: 'form', how: 'merge', after: 'none' } },
    { t: '다시 조회해서 이름만 옮기면', d: 'city는 그대로 남습니다(변경 감지).', v: { src: 'form', how: 'dirty', after: 'none' } },
    { t: '아무것도 하지 않으면', d: '준영속 객체의 값만 바꿔서는 반영되지 않습니다.', v: { src: 'form', how: 'none', after: 'none' } },
    { t: '조회해 둔 객체를 merge', d: '모든 필드가 채워져 있어 city가 유지됩니다.', v: { src: 'loaded', how: 'merge', after: 'none' } },
    { t: 'merge 뒤에 넘긴 객체를 고치면', d: '넘긴 객체는 여전히 준영속이라 반영되지 않습니다.', v: { src: 'loaded', how: 'merge', after: 'arg' } },
    { t: 'merge 뒤에 돌려받은 객체를 고치면', d: '돌려받은 객체는 영속이라 반영됩니다.', v: { src: 'loaded', how: 'merge', after: 'ret' } },
  ],
  // 설정에 해당하는 코드의 줄들. k는 그 줄이 하는 일의 종류, pre는 앞줄에 붙여 보일 코드(단계는 아님)
  lines: function (c) {
    var L = c.src === 'form' ? [{ k: 'new', code: 'Member m = new Member();  m.setId(1L);' }] : [{ k: 'find1', code: 'Member m = em1.find(Member.class, 1L);' }, { k: 'close1', code: 'em1.close();' }];
    L.push({ k: 'set', code: 'm.setName("김영수");' });
    var first = L.length;
    if (c.how === 'merge') { L.push({ k: 'merge', code: 'Member r = em.merge(m);' }); if (c.after === 'arg') L.push({ k: 'setArg', code: 'm.setCity("부산");' }); if (c.after === 'ret') L.push({ k: 'setRet', code: 'r.setCity("부산");' }); L.push({ k: 'contains', code: 'System.out.println(em.contains(m) + ", " + em.contains(r));' }); }
    else if (c.how === 'dirty') L.push({ k: 'find', code: 'Member f = em.find(Member.class, 1L);' }, { k: 'copy', code: 'f.setName(m.getName());' }, { k: 'contains', code: 'System.out.println(em.contains(m) + ", " + em.contains(f));' });
    else L.push({ k: 'contains', code: 'System.out.println(em.contains(m));' });
    L.push({ k: 'commit', code: 'em.getTransaction().commit();' });
    L[first].pre = true;
    return L;
  },
  code: function (c) {
    var head = c.src === 'form' ? '// 화면에서 받은 값으로 만든 객체. city는 받지 않았다\n' : '// 앞선 요청에서 조회해 둔 객체\nEntityManager em1 = emf.createEntityManager();\n';
    return head + this.lines(c).map(function (l) { return (l.pre ? '\nEntityManager em = emf.createEntityManager();\nem.getTransaction().begin();\n' : '') + l.code.replace(';  ', ';\n'); }).join('\n');
  },
  label: function (c) { return (c.src === 'form' ? '화면 값으로 new' : '조회해 둔 객체') + ' · ' + { merge: 'merge', none: '아무것도 안 함', dirty: '변경 감지' }[c.how] + (c.how === 'merge' && c.after !== 'none' ? ' · 그 뒤 ' + (c.after === 'arg' ? 'm' : 'r') + '의 city 변경' : ''); },
  columns: ['em.contains(m)', '영속 상태인 객체', '이 트랜잭션에서 나간 SQL', 'DB에 남은 값 (name · city)'],
  simulate: function (c) {
    var L = this.lines(c), ev = [], sum = [], trace = [], PRE = { 'new': 1, find1: 1, close1: 1, set: 1 };
    // m: 준영속 객체. r: 이 트랜잭션의 영속 엔티티(merge가 돌려준 r, 또는 다시 조회한 f). snap: 영속성 컨텍스트가 기억하는 처음 읽은 값
    var st = { line: -1, m: null, mState: '', r: null, rName: '', snap: null, sent: [], db: { name: '김철수', city: '서울' }, cm: '?', cr: '?', flow: '', dbCls: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.flow = ''; }
    function send(kind, sql) { trace[trace.length - 1][1].push(kind); st.sent.push({ sql: sql, at: PRE[L[st.line].k] ? '앞선 요청' : L[st.line].k === 'commit' ? '커밋할 때' : L[st.line].code, pre: !!PRE[L[st.line].k] }); st.flow = kind; }
    function show(x) { return x === null ? 'null' : x; }
    L.forEach(function (ln, i) {
      st.line = i; if (ln.k !== 'contains') trace.push([ln.k, []]);
      var m = st.m, r = st.r;
      if (ln.k === 'new') {
        st.m = { name: null, city: null }; st.mState = '준영속';
        push('new Member()와 setId(1L): 화면에서 받은 값을 담을 객체를 새로 만들고, 고칠 회원의 id인 1을 넣었습니다. name과 city는 아직 null입니다. DB에 이미 있는 행의 id를 가졌지만 영속성 컨텍스트가 관리하지 않는 객체이므로 준영속으로 다룹니다.', '');
      } else if (ln.k === 'find1') {
        send('select', 'select ... from member where id = 1'); st.m = { name: '김철수', city: '서울' }; st.mState = 'em1에서 영속';
        push('em1.find(Member.class, 1L): 앞선 요청에서 다른 EntityManager(em1)로 1번 회원을 읽었습니다. name은 김철수, city는 서울입니다. 이때는 em1이 관리하는 영속 상태입니다.', '');
      } else if (ln.k === 'close1') {
        st.mState = '준영속';
        push('em1.close(): em1을 닫아 그 영속성 컨텍스트가 끝났습니다. m은 준영속이 됩니다. 자바 객체는 모든 필드가 채워진 채로 남아 있습니다.', '');
      } else if (ln.k === 'set') {
        m.name = '김영수';
        push('m.setName("김영수"): 준영속 객체의 이름을 바꿨습니다. 메모리의 값만 바뀌고 SQL은 나가지 않습니다. 이 객체를 지켜보는 영속성 컨텍스트가 없습니다.', '');
      } else if (ln.k === 'merge') {
        send('select', 'select ... from member where id = 1'); st.r = { name: st.db.name, city: st.db.city }; st.rName = 'r'; st.snap = { name: st.db.name, city: st.db.city };
        push('em.merge(m)의 첫 단계: m의 id(1)로 영속 엔티티를 찾습니다. 새로 연 영속성 컨텍스트에는 아무것도 없으므로 SELECT로 DB에서 읽어 옵니다(김철수, 서울). 이것이 merge 때 나가는 SELECT입니다.', '');
        st.r.name = m.name; st.r.city = m.city; st.flow = 'copyAll';
        push('em.merge(m)의 둘째 단계: m의 모든 필드 값을 그 영속 엔티티에 덮어씁니다. name은 김영수가 되고, city는 ' + (m.city === null ? 'm에서 비어 있던 null로 덮어써집니다' : 'm이 가진 값 "' + m.city + '"로 덮어써집니다(같은 값이라 달라지지 않습니다)') + '. merge는 이 영속 엔티티를 r로 돌려줍니다. 넘긴 객체 m은 준영속인 채로 남습니다.', m.city === null ? 'bad' : '');
      } else if (ln.k === 'setArg') {
        m.city = '부산';
        push('m.setCity("부산"): merge에 넘겼던 객체 m의 값을 바꿨습니다. m은 merge 뒤에도 준영속이므로 이 변경을 지켜보는 쪽이 없습니다. 영속 엔티티 r의 city는 그대로입니다.', 'bad');
      } else if (ln.k === 'setRet') {
        r.city = '부산';
        push('r.setCity("부산"): merge가 돌려준 객체 r의 값을 바꿨습니다. r은 영속 상태이므로 커밋할 때 이 값까지 반영됩니다.', 'good');
      } else if (ln.k === 'find') {
        send('select', 'select ... from member where id = 1'); st.r = { name: st.db.name, city: st.db.city }; st.rName = 'f'; st.snap = { name: st.db.name, city: st.db.city };
        push('em.find(Member.class, 1L): SELECT로 1번 회원을 읽어 영속 상태의 객체 f를 얻습니다(김철수, 서울). m과는 다른 객체입니다.', '');
      } else if (ln.k === 'copy') {
        r.name = m.name; st.flow = 'copyName';
        push('f.setName(m.getName()): 바꾸려는 값인 이름만 f에 옮깁니다. city에는 손대지 않았으므로 f의 city는 "서울" 그대로입니다.', 'good');
      } else if (ln.k === 'contains') {
        st.cm = 'false'; st.cr = r ? 'true' : '-';
        push(r ? 'em.contains(m)의 결과는 false, em.contains(' + st.rName + ')의 결과는 true입니다. 둘은 서로 다른 객체이고, 영속성 컨텍스트가 관리하는 것은 ' + st.rName + ' 쪽입니다.' :'em.contains(m): false입니다. m은 준영속 객체이고, 이 영속성 컨텍스트에는 관리 중인 엔티티가 하나도 없습니다.', '');
      } else if (ln.k === 'commit') {
        if (r && (r.name !== st.snap.name || r.city !== st.snap.city)) {
          send('update', "update member set city = " + (r.city === null ? 'null' : "'" + r.city + "'") + ", name = '" + r.name + "' where id = 1"); st.db = { name: r.name, city: r.city }; st.dbCls = r.city === null ? 'bad' : 'good';
          push('commit: 커밋 직전의 flush에서 영속 엔티티 ' + st.rName + '의 값을 처음 읽은 값(김철수, 서울)과 비교해 UPDATE를 보냅니다. DB의 1번 행은 name이 ' + r.name + ', city가 ' + (r.city === null ? 'NULL이 됐습니다. 고치려던 것은 이름뿐인데 city가 지워졌습니다.' : r.city + (r.city === '서울' ? '로 남았습니다.' : '이 됐습니다.')), r.city === null ? 'bad' : 'good');
        } else push('commit: 이 영속성 컨텍스트에는 관리 중인 엔티티가 없습니다. 비교할 대상이 없으므로 UPDATE가 나가지 않습니다. DB의 이름은 "김철수" 그대로이고, 예외도 나지 않습니다.', 'bad');
      }
    });
    var cnt = {}, order = [];
    trace.forEach(function (t) { if (PRE[t[0]]) return; t[1].forEach(function (k) { var w = k.toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; }); });
    var sqlText = order.length ? order.map(function (w) { return w + ' ' + cnt[w] + '번'; }).join(', ') : '없음', dbText = st.db.name + ' · ' + (st.db.city === null ? 'NULL' : st.db.city);
    if (c.how === 'none') sum.push('준영속 객체는 값을 바꾸고 트랜잭션을 커밋해도 반영되지 않습니다. 반영하려면 em.merge에 넘기거나, 엔티티를 다시 조회해 값을 옮겨야 합니다.');
    if (c.how === 'merge') {
      if (c.src === 'form' && st.db.city === null) sum.push('merge는 바뀐 필드만 골라 반영하지 않고, 넘긴 객체의 모든 필드로 덮어씁니다. 화면에서 이름만 받아 만든 객체에는 city가 null이므로 DB의 city도 NULL이 됩니다. 수정 화면에 없는 필드가 지워지는 사고가 이렇게 생깁니다.');
      if (c.src === 'loaded' && c.after === 'none') sum.push('조회해 둔 객체는 모든 필드가 채워져 있어서 merge해도 city가 남습니다. 다만 merge는 m이 가진 값 전부로 덮어쓰므로, m을 조회한 뒤에 다른 곳에서 city를 고쳤다면 그 변경은 m의 예전 값으로 되돌아갑니다.');
      if (c.after === 'arg') sum.push('merge에 넘긴 객체는 merge 뒤에도 준영속입니다. em.merge(m)은 m을 영속으로 바꿔 주는 것이 아니라, 영속 상태인 다른 객체를 돌려줍니다. 그 뒤의 작업은 돌려받은 객체로 해야 합니다.');
      if (c.after === 'ret') sum.push('merge가 돌려준 객체 r은 영속 상태이므로 값을 바꾸면 변경 감지로 반영됩니다.' + (c.src === 'form' ? ' merge가 null로 덮어쓴 city도 그 뒤에 r에서 "부산"으로 바꿨기 때문에 부산으로 저장됐습니다.' : ''));
      sum.push('merge는 영속 엔티티를 얻으려고 SELECT를 한 번 보냅니다. 같은 id의 엔티티가 이미 영속성 컨텍스트에 있으면 SELECT 없이 그 엔티티에 덮어쓰고, DB에 없는 id이면 SELECT로 없음을 확인한 뒤 INSERT를 보냅니다.');
    }
    if (c.how === 'dirty') { sum.push('다시 조회한 영속 엔티티에 바꿀 값만 넣었으므로 나머지 필드는 처음 읽은 값 그대로입니다. 나간 SQL은 merge와 같이 SELECT 한 번, UPDATE 한 번입니다. 일부 필드만 고칠 때는 이 방식이 안전합니다.'); if (c.src !== 'form') sum.push('조회해 둔 객체가 있더라도, 새 트랜잭션에서는 다시 조회한 엔티티에 값을 옮기는 것이 기본입니다.'); }
    return { events: ev, summary: sum, L: L, trace: trace.map(function (t) { return t[0] + ':' + t[1].join(','); }).join(' '), row: [st.cm, st.r ? st.rName + ' (m과 다른 객체)' : '없음', sqlText, dbText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -1, m: null, r: null, sent: [], db: { name: '김철수', city: '서울' }, cm: '?', cr: '?' };
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l.code, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }), '실행 중인 코드');
    H.counters(v, [[s.sent.filter(function (q) { return !q.pre; }).length + '번', '이 트랜잭션에서 나간 SQL']]);
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 때'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'DB로 나간 SQL');
  },
  // 그림: 왼쪽에 준영속 객체 m, 가운데에 이 트랜잭션의 영속성 컨텍스트와 영속 엔티티, 오른쪽에 DB의 행. SELECT, 값 옮기기, UPDATE가 일어나는 단계에 그 화살표가 생긴다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { m: null, mState: '', r: null, rName: '', snap: null, sent: [], db: { name: '김철수', city: '서울' }, cm: '?', cr: '?', flow: '', dbCls: '' };
    function show(x) { return x === null ? 'null' : x; }
    P.size(680, 310);
    P.region('out', 16, 16, 200, 150, '영속성 컨텍스트 밖');
    P.region('pc', 240, 16, 200, 150, '영속성 컨텍스트');
    P.region('db', 464, 16, 200, 150, 'DB의 member 테이블');
    P.box('m', 34, 52, 164, 74, s.m ? { cls: s.mState === '준영속' ? 'hot' : 'good', title: 'm (' + s.mState + ')', sub: ['name: ' + show(s.m.name), 'city: ' + show(s.m.city)] } : { cls: 'ghost', title: 'm', sub: '아직 없음' });
    P.box('r', 258, 52, 164, 74, s.r ? { cls: s.r.city === null ? 'bad' : 'good', title: s.rName + ' (영속)', sub: ['name: ' + show(s.r.name), 'city: ' + show(s.r.city)] } : { cls: 'ghost', title: '영속 엔티티', sub: '없음' });
    P.box('row', 482, 52, 164, 74, { cls: s.dbCls === 'bad' ? 'bad' : s.dbCls === 'good' ? 'hot' : 'plain', title: '1번 행', sub: ['name: ' + s.db.name, 'city: ' + (s.db.city === null ? 'NULL' : s.db.city)] });
    if (s.flow === 'select' && s.r) P.arrow('fl', 'row:l', 'r:r', { cls: 'hot', label: 'SELECT' });
    if (s.flow === 'copyAll') P.arrow('fl', 'm:r', 'r:l', { cls: 'hot', label: '모든 필드' });
    if (s.flow === 'copyName') P.arrow('fl', 'm:r', 'r:l', { cls: 'hot', label: 'name만' });
    if (s.flow === 'update') P.arrow('fl', 'r:r', 'row:l', { cls: 'hot', label: 'UPDATE' });
    P.box('c1', 16, 186, 320, 36, { cls: s.cm === '?' ? 'ghost' : 'plain', title: 'em.contains(m)', right: s.cm });
    P.box('c2', 344, 186, 320, 36, { cls: s.cr === '?' || s.cr === '-' ? 'ghost' : 'good', title: 'em.contains(' + (s.rName || 'r') + ')', right: s.cr === '-' ? '해당 없음' : s.cr });
    P.box('c3', 16, 230, 648, 36, { cls: s.dbCls === 'bad' ? 'bad' : s.dbCls === 'good' ? 'good' : 'plain', title: 'DB에 남은 값 (name · city)', right: s.db.name + ' · ' + (s.db.city === null ? 'NULL' : s.db.city) });
    P.note('merge는 왼쪽 객체의 모든 필드를 가운데 객체에 덮어쓰고, 변경 감지 방식은 바꿀 값만 옮깁니다.');
  },
  assume: '열여덟 가지 조합을 실제 Hibernate 7.4.5와 H2 데이터베이스에서 실행해, 줄마다 나간 SQL의 종류, em.contains의 결과, merge가 돌려준 객체가 넘긴 객체와 다른지, DB에 남은 name과 city가 화면과 일치하는 것을 확인했습니다. "merge 다음에 city를 바꾼다면" 설정은 merge를 고른 때에만 뜻이 있습니다. "이 트랜잭션에서 나간 SQL"에는 앞선 요청에서 m을 조회한 SELECT를 넣지 않았습니다. 요약에 적은 다음 사실도 따로 실행해 확인했습니다: DB에 없는 id를 가진 객체를 merge하면 SELECT 뒤에 INSERT가 나간다, 조회해 둔 객체를 값을 바꾸지 않고 merge하면 SELECT만 나가고 UPDATE는 없다, 같은 id의 엔티티가 이미 영속 상태이면 merge는 SELECT를 보내지 않는다, 조회한 뒤에 DB의 city가 다른 값으로 바뀌었어도 merge는 m의 예전 값으로 덮어쓴다. 회원의 id는 코드에서 직접 넣는 방식이고 @Version 필드는 두지 않았습니다. @Version이 있으면 예전 값으로 덮어쓰려 할 때 예외로 막을 수 있습니다. Hibernate는 merge와 변경 감지 모두에서 기본으로 모든 컬럼을 UPDATE 문에 넣으므로, 두 방법의 차이는 UPDATE 문의 모양이 아니라 거기에 실려 가는 값에 있습니다. 화면의 SQL 문장은 읽기 쉽게 줄여 적은 것입니다. 스프링 데이터 JPA의 save는 새 엔티티가 아니라고 판단하면 내부에서 merge를 부릅니다(공식 문서 기준이며 여기서 실행해 보지는 않았습니다).',
});
