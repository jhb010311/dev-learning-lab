Lab.register({
  id: 'entitylife', nav: '엔티티의 생명주기', cat: 'JPA', mode: 'step',
  title: '같은 setName인데 왜 어떤 때는 DB에 반영되지 않나',
  intro: '엔티티 객체는 비영속, 영속, 준영속, 삭제라는 네 가지 상태 가운데 하나에 있습니다. JPA가 값의 변화를 지켜보고 DB에 반영해 주는 것은 영속 상태일 때뿐입니다. 이 실습의 Member는 예시로 만든 엔티티 클래스입니다.',
  terms: ['엔티티의 네 가지 상태', '준영속 상태', '영속성 컨텍스트', '변경 감지(Dirty Checking)', '쓰기 지연과 flush'],
  controls: [
    { id: 'st', label: '엔티티가 거치는 길', type: 'select', value: 'detach', options: [['new', 'new만 한다 (비영속)'], ['persist', 'new 한 뒤 em.persist (영속)'], ['find', 'em.find로 조회 (영속)'], ['detach', '조회한 뒤 em.detach (준영속)'], ['clear', '조회한 뒤 em.clear (준영속)'], ['close', '조회한 뒤 커밋하고 em.close (준영속)'], ['remove', '조회한 뒤 em.remove (삭제)']] },
    { id: 'when', label: '이름을 바꾸는 때', type: 'select', value: 'after', options: [['after', '상태가 바뀐 뒤에'], ['before', '상태가 바뀌기 직전에']], show: function (c) { return ['persist', 'detach', 'clear', 'close'].indexOf(c.st) >= 0; }, hint: '상태를 바꾸는 줄(persist, detach, clear, 커밋과 close)의 앞에서 바꿀지 뒤에서 바꿀지를 정합니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: '조회한 엔티티를 em.detach로 준영속으로 만든 뒤 이름을 바꾸면 DB에는 무엇이 남나', d: '떼어 낸(준영속) 객체의 이름을 바꿉니다. 오류 없이 반영되지 않습니다.', v: { st: 'detach', when: 'after' } },
    { t: '영속 상태에서 바꾸면', q: 'em.detach 대신 em.find로 조회만 한 영속 상태에서 이름을 바꾸면', d: '조회한 객체의 이름만 바꿔도 커밋할 때 UPDATE가 나갑니다.', v: { st: 'find', when: 'after' } },
    { t: '바꾼 다음에 em.clear', q: '조회한 뒤 이름을 바꾸고 나서 em.clear를 부르면', d: '영속일 때 바꿨는데도 사라집니다. 아직 DB로 보내기 전이었기 때문입니다.', v: { st: 'clear', when: 'before' } },
    { t: 'new만 하고 persist를 잊으면', q: 'em.persist 없이 new만 한 엔티티의 이름을 바꾸면', d: 'SQL이 하나도 나가지 않습니다.', v: { st: 'new', when: 'after' } },
    { t: 'persist 한 뒤에 바꾸면', q: 'new 한 뒤 em.persist까지 한 엔티티의 이름을 바꾸면', d: 'INSERT에 이어 UPDATE가 한 번 더 나갑니다.', v: { st: 'persist', when: 'after' } },
    { t: 'em을 닫은 뒤에 바꾸면', q: '조회한 뒤 커밋하고 em.close로 닫은 다음 이름을 바꾸면', d: '트랜잭션 밖에서 엔티티를 고치는 흔한 실수입니다.', v: { st: 'close', when: 'after' } },
    { t: 'remove 한 뒤에 바꾸면', q: '조회한 뒤 em.remove를 부른 다음 이름을 바꾸면', d: 'DELETE만 나갑니다. 그것도 커밋할 때 나갑니다.', v: { st: 'remove', when: 'after' } },
  ],
  // 설정에 해당하는 코드의 줄들. k는 그 줄이 하는 일의 종류이고, simulate가 이 순서대로 한 줄씩 실행한다
  lines: function (c) {
    var nw = c.st === 'new' || c.st === 'persist', before = c.when === 'before' && ['persist', 'detach', 'clear', 'close'].indexOf(c.st) >= 0;
    var mk = nw ? { k: 'new', code: 'Member m = new Member(2L, "이영희");' } : { k: 'find', code: 'Member m = em.find(Member.class, 1L);' };
    var set = { k: 'set', code: 'm.setName("' + (nw ? '이수진' : '김영수') + '");' }, con = { k: 'contains', code: 'System.out.println(em.contains(m));' }, commit = { k: 'commit', code: 'em.getTransaction().commit();' };
    if (c.st === 'new' || c.st === 'find') return [mk, set, con, commit];
    if (c.st === 'close') { var cl = { k: 'close', code: 'em.close();' }, cx = { k: 'contains', code: '// 여기서 em.contains(m)을 부르면 IllegalStateException' }; return before ? [mk, set, commit, cl, cx] : [mk, commit, cl, set, cx]; }
    var mid = { k: c.st, code: { persist: 'em.persist(m);', detach: 'em.detach(m);', clear: 'em.clear();', remove: 'em.remove(m);' }[c.st] };
    return before ? [mk, set, mid, con, commit] : [mk, mid, set, con, commit];
  },
  code: function (c) {
    return 'EntityManager em = emf.createEntityManager();\nem.getTransaction().begin();\n\n' + this.lines(c).map(function (l) { return l.code; }).join('\n');
  },
  label: function (c) { return { new: 'new만', persist: 'persist', find: 'find', detach: 'detach', clear: 'clear', close: '커밋 후 close', remove: 'remove' }[c.st] + (['persist', 'detach', 'clear', 'close'].indexOf(c.st) >= 0 ? ' · 이름은 ' + (c.when === 'before' ? '직전에' : '뒤에') + ' 바꿈' : ''); },
  columns: ['em.contains(m)', 'DB로 나간 SQL', '쓰기 SQL이 나간 때', 'DB에 남은 값'],
  stateName: { none: '아직 없음', 'new': '비영속', managed: '영속', detached: '준영속', removed: '삭제' },
  simulate: function (c) {
    var L = this.lines(c), ev = [], sum = [], trace = [];
    // o: 자바 객체 m. snap: 영속성 컨텍스트가 기억하는 값(처음 읽었거나 persist한 때의 값). ins: 아직 보내지 않은 INSERT가 있는가. open: em이 열려 있는가
    var st = { line: -1, o: null, snap: null, ins: false, open: true, sent: [], db: [{ id: 1, name: '김철수' }], contains: '?', moved: '', flow: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.moved = ''; st.flow = ''; }
    function send(kind, sql) { trace[trace.length - 1][1].push(kind); st.sent.push({ sql: sql, at: L[st.line].k === 'commit' ? '커밋할 때' : L[st.line].code }); st.flow = st.flow ? st.flow + ', ' + kind.toUpperCase() : kind.toUpperCase(); }
    var lost = false;   // 영속일 때 바꾼 값이 DB로 가기 전에 떼어 내져 사라졌는가
    L.forEach(function (ln, i) {
      st.line = i; trace.push([ln.k, []]);
      var o = st.o;
      if (ln.k === 'new') {
        st.o = { id: 2, name: '이영희', state: 'new' };
        push('new Member(2L, "이영희"): 자바 객체를 하나 만들었을 뿐입니다. 영속성 컨텍스트도 DB도 이 객체를 모릅니다. 이 상태를 비영속이라고 합니다.', '');
      } else if (ln.k === 'find') {
        send('select', 'select ... from member where id = 1'); st.o = { id: 1, name: '김철수', state: 'managed' }; st.snap = '김철수'; st.moved = 'find';
        push('em.find(Member.class, 1L): SELECT로 1번 회원을 읽어 영속성 컨텍스트에 보관합니다. 이때부터 m은 영속 상태입니다. 영속성 컨텍스트가 처음 읽은 값(김철수)을 기억해 두고 m의 변화를 지켜봅니다.', '');
      } else if (ln.k === 'persist') {
        o.state = 'managed'; st.snap = o.name; st.ins = true; st.moved = 'persist';
        push('em.persist(m): m을 영속성 컨텍스트에 맡깁니다. 비영속에서 영속으로 바뀌었습니다. 이 줄에서는 SQL이 나가지 않고, INSERT는 커밋할 때까지 미뤄집니다.' + (o.name === '이수진' ? ' 저장할 값은 이미 바꿔 둔 이름 "이수진"입니다.' : ''), '');
      } else if (ln.k === 'set') {
        var nm = o.id === 2 ? '이수진' : '김영수'; o.name = nm;
        if (o.state === 'new') push('m.setName("' + nm + '"): 비영속 객체의 이름을 바꿨습니다. 메모리의 값만 바뀝니다. 이 객체를 지켜보는 쪽이 없으므로 SQL과는 아무 관계가 없습니다.', '');
        else if (o.state === 'managed') push('m.setName("' + nm + '"): 영속 상태인 객체의 이름을 바꿨습니다. 이 줄에서는 SQL이 나가지 않습니다. 영속성 컨텍스트가 기억해 둔 값(' + st.snap + ')과 지금 값이 달라진 상태로 남습니다.', '');
        else if (o.state === 'removed') push('m.setName("' + nm + '"): 삭제 상태인 객체의 이름을 바꿨습니다. 자바 객체는 메모리에 그대로 있으므로 값은 바뀝니다. 그러나 지워질 예정인 엔티티라서 UPDATE 대상이 되지 않습니다.', '');
        else push('m.setName("' + nm + '"): 준영속 상태인 객체의 이름을 바꿨습니다. 자바 객체의 값은 바뀌지만, 영속성 컨텍스트는 이 객체를 더는 지켜보지 않습니다. 오류도 나지 않습니다.', 'bad');
      } else if (ln.k === 'detach' || ln.k === 'clear') {
        lost = o.name !== st.snap; o.state = 'detached'; st.snap = null; st.moved = 'detach';
        push((ln.k === 'detach' ? 'em.detach(m): m을 영속성 컨텍스트에서 떼어 냅니다.' : 'em.clear(): 영속성 컨텍스트를 통째로 비웁니다. 영속성 컨텍스트가 관리하던 엔티티가 모두 준영속이 됩니다.') + ' m은 영속에서 준영속으로 바뀌었습니다. SQL은 나가지 않습니다.' + (lost ? ' 앞에서 바꾼 이름은 아직 DB로 보내지 않은 상태였습니다. 기억해 둔 값과 비교해 줄 영속성 컨텍스트가 m을 놓았으므로, 이 변경을 DB에 보내 줄 쪽이 없어졌습니다.' : ''), lost ? 'bad' : '');
      } else if (ln.k === 'remove') {
        o.state = 'removed'; st.moved = 'remove';
        push('em.remove(m): m을 지울 대상으로 표시합니다. 영속에서 삭제 상태로 바뀌었습니다. DELETE는 이 줄에서 나가지 않고 커밋할 때까지 미뤄집니다.', '');
      } else if (ln.k === 'close') {
        st.open = false; o.state = 'detached'; st.snap = null; st.moved = 'detach';
        push('em.close(): EntityManager를 닫아 영속성 컨텍스트가 끝났습니다. 영속성 컨텍스트가 관리하던 m은 준영속이 됩니다. 자바 객체는 메모리에 그대로 남아 있습니다.', '');
      } else if (ln.k === 'contains') {
        if (!st.open) { st.contains = '예외 (em이 닫힘)'; push('em.contains(m)을 불러 보면: em이 이미 닫혀 있어서 IllegalStateException이 납니다. 닫힌 em에는 무엇을 관리하고 있는지 물어볼 수 없습니다.', ''); }
        else {
          st.contains = String(o.state === 'managed');
          push('em.contains(m): ' + st.contains + '입니다. ' + { 'new': '한 번도 영속성 컨텍스트에 맡긴 적이 없는 비영속 객체이기 때문입니다.', managed: '영속성 컨텍스트가 m을 관리하고 있다는 뜻입니다.', detached: '영속성 컨텍스트가 m을 더는 관리하지 않는다는 뜻입니다.', removed: '지울 대상으로 표시된 엔티티는 em.contains에서 관리 중인 것으로 치지 않습니다. 다만 영속성 컨텍스트는 커밋 때 DELETE를 보내려고 이 엔티티를 그때까지 기억해 둡니다.' }[o.state], o.state === 'managed' ? 'good' : '');
        }
      } else if (ln.k === 'commit') {
        if (o.state === 'managed' && st.ins) {
          send('insert', "insert into member (name, id) values ('" + st.snap + "', 2)"); st.db.push({ id: 2, name: o.name, cls: 'hot' }); st.ins = false;
          if (o.name !== st.snap) { send('update', "update member set name = '" + o.name + "' where id = 2"); st.snap = o.name; push('commit: 커밋 직전에 flush가 일어납니다. 미뤄 둔 INSERT를 persist할 때의 값(이영희)으로 보내고, 그 뒤에 바뀐 이름을 UPDATE로 한 번 더 보냅니다. SQL이 두 번 나갔습니다.', 'good'); }
          else push('commit: 커밋 직전에 flush가 일어나 미뤄 둔 INSERT를 보냅니다. persist할 때 이미 "' + o.name + '"이었으므로 INSERT 한 번으로 끝납니다.', 'good');
        } else if (o.state === 'managed' && o.name !== st.snap) {
          send('update', "update member set name = '" + o.name + "' where id = 1"); st.db[0].name = o.name; st.db[0].cls = 'hot'; st.snap = o.name;
          push('commit: 커밋 직전에 flush가 일어납니다. 영속 상태인 m의 지금 값을 기억해 둔 값과 비교해 달라진 것을 찾아내고, UPDATE를 만들어 보냅니다(변경 감지).', 'good');
        } else if (o.state === 'removed') {
          send('delete', 'delete from member where id = 1'); st.db[0].cls = 'gone';
          push('commit: 커밋 직전에 flush가 일어나 미뤄 둔 DELETE를 보냅니다. 1번 행이 지워졌습니다. 삭제 상태에서 바꾼 이름은 어디에도 반영되지 않습니다.', '');
        } else if (o.state === 'managed') push('commit: 커밋 직전에 flush가 일어나지만, m의 값이 기억해 둔 값과 같으므로 보낼 SQL이 없습니다.', '');
        else if (o.state === 'new') push('commit: 영속성 컨텍스트에 관리 중인 엔티티가 하나도 없습니다. 보낼 SQL이 없습니다. 2번 회원은 DB에 생기지 않았습니다.', 'bad');
        else push('commit: 커밋 직전에 flush가 일어나지만, m은 관리 대상이 아니라서 비교하지 않습니다. UPDATE가 나가지 않고 DB의 이름은 "김철수" 그대로입니다.', 'bad');
      }
    });
    var cnt = {}, order = [], wr = [];
    trace.forEach(function (t) { t[1].forEach(function (k) { var w = k.toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; if (k !== 'select') wr.push(t[0]); }); });
    var sqlText = order.length ? order.map(function (w) { return w + ' ' + cnt[w] + '번'; }).join(', ') : '없음';
    var whenText = !wr.length ? '나가지 않음' : wr.every(function (k) { return k === 'commit'; }) ? '커밋할 때' : '그 줄에서 바로';
    var left = st.db.filter(function (r) { return r.cls !== 'gone'; }), dbText = left.length ? left.map(function (r) { return r.id + '번 ' + r.name; }).join(', ') : '행 없음';
    var o = st.o, changed = o.id === 1 ? left.length && left[0].name === '김영수' : left.length === 2;
    if (c.st === 'new') sum.push('new로 만든 객체는 em.persist에 넘기기 전까지 JPA와 아무 관계가 없습니다. 값을 아무리 바꿔도, 트랜잭션을 커밋해도 SQL이 나가지 않습니다. 저장이 안 될 때는 persist(스프링 데이터 JPA라면 save)를 불렀는지부터 확인합니다.');
    if (c.st === 'persist') sum.push(cnt.UPDATE ? 'persist 한 뒤에 값을 바꾸면 변경 감지가 일해서 INSERT 뒤에 UPDATE가 한 번 더 나갑니다. 결과는 맞지만 SQL이 하나 더 듭니다. 값을 다 채운 다음에 persist하면 INSERT 한 번으로 끝납니다.' : '값을 다 채운 다음에 persist했으므로 INSERT 한 번으로 끝났습니다. persist 한 뒤에 바꾸면 UPDATE가 한 번 더 나갑니다.', 'persist를 부른 줄에서 INSERT가 나가지 않은 것은 id를 코드에서 직접 넣었기 때문입니다. DB가 id를 정하는 IDENTITY 방식이면 persist하는 줄에서 INSERT가 바로 나갑니다(영속성 컨텍스트 실습 참고).');
    if (c.st === 'find') sum.push('영속 상태에서는 값만 바꾸면 됩니다. 커밋할 때 영속성 컨텍스트가 기억해 둔 값과 비교해 UPDATE를 만들어 줍니다. 다른 상태들과 비교해 보면, 이 일이 일어나는 것은 영속 상태일 때뿐임을 알 수 있습니다.');
    if ((c.st === 'detach' || c.st === 'clear') && !lost) sum.push('준영속 객체는 평범한 자바 객체와 같습니다. 값을 바꿔도 예외가 나지 않고, DB에도 반영되지 않습니다. 떼어 낸 뒤 같은 id를 em.find로 다시 조회하면 SELECT가 다시 나가고 m과는 다른 새 객체가 옵니다.', c.st === 'clear' ? 'em.clear()는 영속성 컨텍스트가 관리하던 모든 엔티티를 한꺼번에 준영속으로 만듭니다. em.detach(m)은 m 하나만 떼어 냅니다.' : '준영속 객체의 변경을 DB에 반영하려면 병합(merge)으로 영속 객체에 값을 옮겨야 합니다. 병합은 다음 실습에서 다룹니다.');
    if ((c.st === 'detach' || c.st === 'clear') && lost) sum.push('영속 상태일 때 바꾼 값이라도, DB로 보내기(flush) 전에 떼어 내면 사라집니다.', '떼어 내기 전에 em.flush()를 부르면 그때 UPDATE가 나가므로 반영됩니다. 많은 데이터를 처리하다가 메모리를 비우려고 em.clear()를 부를 때는 그 앞에 em.flush()를 둡니다.');
    if (c.st === 'close' && !changed) sum.push('트랜잭션이 끝나고 em이 닫힌 뒤의 엔티티는 준영속입니다. 서비스 메서드가 돌려준 엔티티를, 트랜잭션이 끝난 뒤(OSIV를 끈 경우) 컨트롤러에서 고치는 경우가 여기에 해당합니다. 값은 바뀌지만 DB에는 반영되지 않고, 예외도 나지 않습니다.');
    if (c.st === 'close' && changed) sum.push('커밋은 그 직전에 flush를 일으킵니다. 그래서 커밋 전에 바꾼 값은 UPDATE로 나간 뒤에 em이 닫힙니다. 같은 "직전에 바꿈"인데 detach나 clear에서는 값이 사라지는 것과 비교해 보세요. 그쪽은 flush 없이 떼어 내기 때문입니다.');
    if (c.st === 'remove') sum.push('em.remove는 그 줄에서 DELETE를 보내지 않고 "지울 대상"으로 표시만 합니다. DELETE는 커밋할 때 나갑니다. 삭제 상태에서 값을 바꿔도 UPDATE는 나가지 않습니다.', 'DB의 행이 지워진 뒤에도 자바 객체 m은 메모리에 남아 있어 값을 읽을 수 있습니다. 커밋하기 전에 em.persist(m)을 다시 부르면 삭제가 취소되고 영속 상태로 돌아옵니다.');
    return { events: ev, summary: sum, L: L, trace: trace.map(function (t) { return t[0] + ':' + t[1].join(','); }).join(' '), row: [st.contains, sqlText, whenText, dbText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -1, o: null, snap: null, sent: [], db: [{ id: 1, name: '김철수' }], contains: '?' }, SN = this.stateName;
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l.code, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }), '실행 중인 코드');
    if (s.o) H.table(v, ['객체', '지금 값', '영속성 컨텍스트가 기억하는 값', '상태'], [{ cells: ['m (회원 ' + s.o.id + ')', { v: s.o.name, cls: s.snap !== null && s.o.name !== s.snap ? 'hot' : '' }, s.snap === null || s.o.state !== 'managed' ? '(지켜보지 않음)' : s.snap, { v: SN[s.o.state], cls: s.o.state === 'managed' ? 'good' : s.o.state === 'new' ? '' : 'bad' }] }], '자바 객체 m');
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 때'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'DB로 나간 SQL');  },
  // 그림: 네 가지 상태를 상자로 놓고, 객체 m이 지금 있는 상태를 굵게 표시한다. 상태를 바꾼 줄에서는 그 화살표가, SQL이 나간 줄에서는 DB로 가는 화살표가 강조된다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { o: null, sent: [], db: [{ id: 1, name: '김철수' }], contains: '?', moved: '', flow: '' };
    var cur = s.o ? s.o.state : 'none', who = s.o ? 'm: ' + s.o.id + '번 ' + s.o.name : '';
    function box(id, x, y, w, state, title, idle, cls) { P.box(id, x, y, w, 56, cur === state ? { cls: cls + ' now', title: title, sub: who } : { cls: 'ghost', title: title, sub: idle }); }
    P.size(680, 330);
    P.region('pc', 198, 16, 220, 112, '영속성 컨텍스트');
    P.region('db', 536, 16, 128, 240, 'member 테이블');
    box('sNew', 16, 52, 138, 'new', '비영속 (new)', 'new만 한 객체', 'wait');
    box('sMan', 210, 52, 196, 'managed', '영속 (managed)', 'JPA가 지켜보는 객체', 'good');
    box('sDet', 16, 200, 176, 'detached', '준영속 (detached)', '떼어 낸 객체', 'hot');
    box('sRem', 210, 200, 196, 'removed', '삭제 (removed)', '지우기로 표시한 객체', 'bad');
    P.arrow('aPersist', 'sNew:r', 'sMan:l', { cls: s.moved === 'persist' ? 'hot' : 'mut', label: 'persist' });
    P.arrow('aDetach', 'sMan:b:0.2', 'sDet:t:0.8', { cls: s.moved === 'detach' ? 'hot' : 'mut', label: 'detach · clear · close' });
    P.arrow('aRemove', 'sMan:b:0.7', 'sRem:t:0.7', { cls: s.moved === 'remove' ? 'hot' : 'mut', label: 'remove' });
    s.db.forEach(function (r, i) { P.box('r' + r.id, 546, 52 + i * 44, 108, 34, { cls: r.cls === 'gone' ? 'ghost' : r.cls === 'hot' ? 'hot' : 'plain', title: r.id + '번', right: r.cls === 'gone' ? '지워짐' : r.name }); });
    if (s.moved === 'find') P.arrow('sql', 'db:l', 'sMan:r', { cls: 'hot', label: 'SELECT (find)' });
    else if (s.flow) P.arrow('sql', cur === 'removed' ? 'sRem:r' : 'sMan:r', 'db:l', { cls: 'hot', label: s.flow });
    P.box('c1', 16, 278, 300, 36, { cls: s.contains === '?' ? 'ghost' : s.contains === 'true' ? 'good' : 'plain', title: 'em.contains(m)', right: s.contains });
    P.box('c2', 324, 278, 340, 36, { cls: s.sent.length ? 'plain' : 'ghost', title: 'DB로 나간 SQL', right: s.sent.length + '번' });
    P.note('굵은 테두리가 객체 m의 지금 상태입니다. "영속성 컨텍스트" 테두리 안에는 em.contains가 true인 영속 상태만 두었습니다. 삭제 상태의 엔티티는 em.contains가 false이지만, 커밋 때 DELETE를 보내려고 영속성 컨텍스트가 그때까지 기억해 둡니다. DB로 가는 화살표가 없는 단계에서는 SQL이 나가지 않았습니다.');
  },
  assume: '열네 가지 조합(일곱 가지 길 × 이름을 바꾸는 때)을 실제 Hibernate 7.4.5와 H2 데이터베이스에서 실행해, 줄마다 나간 SQL의 종류, em.contains의 결과, DB에 남은 행이 화면과 일치하는 것을 확인했습니다. "이름을 바꾸는 때"는 new만 하는 길, 조회만 하는 길, remove에서는 결과에 영향이 없어 숨겨 두었습니다. 요약에 적은 다음 사실도 따로 실행해 확인했습니다: 값을 바꾼 뒤 em.flush()를 부르고 떼어 내면 반영된다, 떼어 낸 뒤 다시 조회하면 SELECT가 다시 나가고 다른 객체가 온다, remove 한 객체를 커밋 전에 다시 persist하면 DELETE가 나가지 않는다, 지워진 뒤에도 자바 객체의 값은 읽힌다, persist 뒤에 값을 바꾸면 INSERT에는 persist할 때의 값이 들어간다. 회원의 id는 코드에서 직접 넣는 방식으로 두었습니다. DB가 id를 정하는 IDENTITY 방식에서는 persist하는 줄에서 INSERT가 바로 나갑니다. 화면의 SQL 문장은 읽기 쉽게 줄여 적은 것입니다. 스프링에서는 @Transactional 메서드가 시작하고 끝날 때 여기의 begin, commit, close가 대신 일어납니다(OSIV를 켠 웹 요청에서는 em이 요청이 끝날 때 닫힙니다).',
});
