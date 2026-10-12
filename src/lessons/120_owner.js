Lab.register({
  id: 'owner', nav: '연관관계의 주인', cat: 'JPA', mode: 'step',
  title: '팀의 목록에 회원을 넣었는데 왜 DB의 외래 키는 비어 있나',
  intro: '팀과 회원이 서로를 가리키면 자바 객체에는 참조가 두 개(회원의 team, 팀의 members) 생깁니다. 하지만 DB에서 둘을 잇는 것은 member 테이블의 외래 키 team_id 하나뿐입니다. JPA는 두 참조 가운데 한쪽만 보고 외래 키를 씁니다. 그쪽을 연관관계의 주인이라고 합니다.',
  terms: ['연관관계의 주인과 mappedBy', '단방향과 양방향 연관관계', '기본 키, 유니크 키, 외래 키', '1차 캐시', '쓰기 지연과 flush'],
  controls: [
    { id: 'set', label: '어느 쪽에 값을 넣는가', type: 'select', value: 'inverse', options: [['inverse', '팀 쪽에만: team.getMembers().add(member)'], ['owner', '회원 쪽에만: member.setTeam(team)'], ['both', '양쪽 모두']] },
    { id: 'clear', label: '목록을 읽기 전에 em.flush()와 em.clear()를 한다', type: 'check', value: false, hint: '켜면 팀을 DB에서 다시 읽습니다. 끄면 메모리에 있는 객체를 그대로 씁니다.' },
    { id: 'mp', label: 'Team.members에 mappedBy = "team"을 적었다', type: 'check', value: true, hint: '끄면 양방향인데 mappedBy를 빠뜨린 경우가 됩니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'mappedBy를 적은 상태에서 팀의 목록에만 회원을 넣고 저장하면 member.team_id는 어떻게 되나', d: '팀의 목록에만 회원을 넣습니다. 예외는 없는데 DB의 team_id는 null입니다.', v: { set: 'inverse', clear: false, mp: true } },
    { t: '회원 쪽에만 넣으면', q: '팀의 목록에는 넣지 않고 회원 쪽에서만 setTeam으로 팀을 넣으면', d: 'team_id는 저장되지만, 같은 트랜잭션에서 읽은 팀의 목록은 비어 있습니다.', v: { set: 'owner', clear: false, mp: true } },
    { t: '양쪽에 다 넣으면', q: '팀의 목록과 회원의 setTeam 양쪽 모두에 넣으면', d: 'DB의 외래 키와 메모리의 목록이 모두 맞습니다.', v: { set: 'both', clear: false, mp: true } },
    { t: '팀 쪽에만 넣고 DB에서 다시 읽으면', q: '팀 쪽에만 넣은 채 목록을 읽기 전에 em.flush와 em.clear를 부르면', d: '메모리에서는 1명이던 목록이 DB에서 다시 읽으면 0명입니다.', v: { set: 'inverse', clear: true, mp: true } },
    { t: '회원 쪽에만 넣고 DB에서 다시 읽으면', q: '회원 쪽에만 넣고 목록을 읽기 전에 em.flush와 em.clear를 부르면', d: '외래 키가 저장돼 있으므로 다시 읽은 목록은 1명입니다.', v: { set: 'owner', clear: true, mp: true } },
    { t: 'mappedBy를 빠뜨리면', q: '양쪽 모두에 넣는데 Team.members에서 mappedBy를 빼면', d: '연결 테이블 team_member가 따로 생기고 INSERT가 한 번 더 나갑니다.', v: { set: 'both', clear: false, mp: false } },
  ],
  // 설정에 따라 실행되는 코드 줄. k는 그 줄을 가리키는 이름이다.
  lines: function (c) {
    var L = [['newTeam', 'Team team = new Team("개발팀");'], ['persistTeam', 'em.persist(team);'], ['newMember', 'Member member = new Member("김철수");']];
    if (c.set !== 'inverse') L.push(['setTeam', 'member.setTeam(team);']);
    if (c.set !== 'owner') L.push(['add', 'team.getMembers().add(member);']);
    L.push(['persistMember', 'em.persist(member);']);
    if (c.clear) L.push(['flush', 'em.flush();'], ['clear', 'em.clear();']);
    L.push(['find', 'Team found = em.find(Team.class, team.getId());'], ['size', 'int size = found.getMembers().size();']);
    return L;
  },
  code: function (c) {
    var note = { setTeam: '                 // 주인 쪽에 넣는다', add: '        // 주인이 아닌 쪽에 넣는다', flush: '                           // 모아 둔 SQL을 DB로 보낸다', clear: '                           // 1차 캐시를 비운다' };
    if (!c.mp) note.add = '        // mappedBy가 없으면 이쪽도 따로 주인이 된다';
    return '@Entity\nclass Team {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n\n' +
      (c.mp ? '    @OneToMany(mappedBy = "team")          // 주인이 아니다. 읽기만 한다\n' : '    @OneToMany                             // mappedBy를 빠뜨렸다\n') +
      '    List<Member> members = new ArrayList<>();\n}\n\n@Entity\nclass Member {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n\n    @ManyToOne(fetch = FetchType.LAZY)\n    @JoinColumn(name = "team_id")          // 주인이다. 외래 키 team_id를 관리한다\n    Team team;\n}\n// 생성자와 getter, setter는 줄였습니다\n\n// 트랜잭션 안에서\n' +
      this.lines(c).map(function (l) { return l[1] + (note[l[0]] || ''); }).join('\n') + '\n// 트랜잭션 커밋';
  },
  label: function (c) { return { inverse: '팀 쪽에만', owner: '회원 쪽에만', both: '양쪽 모두' }[c.set] + (c.clear ? ' · DB에서 다시 읽음' : ' · 메모리의 객체를 읽음') + (c.mp ? '' : ' · mappedBy 없음'); },
  columns: ['DB의 member.team_id', 'team.getMembers().size()', '나간 SQL', '만들어진 테이블'],
  simulate: function (c) {
    var own = c.set !== 'inverse', inv = c.set !== 'owner', mp = !!c.mp, clear = !!c.clear, L = this.lines(c), ev = [], sum = [];
    var st = { line: -2, team: '', teamList: '', member: '', ref: false, link: false, sent: [], dbTeam: false, dbMember: false, fk: '?', join: 0, size: '?' };
    function at(k) { for (var i = 0; i < L.length; i++) if (L[i][0] === k) return i; return -1; }
    function push(k, s, cls) { st.line = k === 'commit' ? -1 : at(k); ev.push({ s: s, k: cls, snap: JSON.parse(JSON.stringify(st)) }); }
    function send(kind, table, sql, when) { st.sent.push({ kind: kind, table: table, sql: sql, at: when }); }
    function ln(k) { return (at(k) + 1) + '번째 줄'; }

    st.team = 'new'; st.teamList = '[ ]';
    push('newTeam', 'new Team("개발팀"): 팀 객체를 만듭니다. 아직 자바 메모리에만 있고, members 목록은 비어 있습니다.', '');
    st.team = 'managed'; st.dbTeam = true; send('insert', 'team', "insert into team (name) values ('개발팀')", ln('persistTeam'));
    push('persistTeam', 'em.persist(team): 기본 키를 IDENTITY 전략으로 만들기 때문에 INSERT가 바로 나가고, DB가 정한 id 1을 받아 옵니다.', '');
    st.member = 'new';
    push('newMember', 'new Member("김철수"): 회원 객체를 만듭니다. team 필드는 아직 null입니다.', '');
    if (own) {
      st.ref = true;
      push('setTeam', 'member.setTeam(team): 회원 객체의 team 필드가 팀을 가리킵니다. 이 필드에는 @JoinColumn(name = "team_id")가 붙어 있어서, JPA는 외래 키 team_id에 넣을 값을 여기에서 읽습니다. 이쪽이 연관관계의 주인입니다.', 'good');
    }
    if (inv) {
      st.link = true; st.teamList = '[member]';
      if (mp) push('add', 'team.getMembers().add(member): 팀 객체의 members 목록에 회원이 들어갑니다. 그런데 이 목록에는 mappedBy = "team"이 붙어 있습니다. "외래 키는 Member의 team 필드가 관리하고, 나는 읽기만 한다"는 뜻이어서, JPA는 SQL을 만들 때 이 목록을 보지 않습니다.', own ? '' : 'bad');
      else push('add', 'team.getMembers().add(member): 팀 객체의 members 목록에 회원이 들어갑니다. mappedBy가 없으므로 JPA는 이 목록을 Member의 team 필드와 상관없는 또 하나의 연관관계로 봅니다. 이 목록의 내용은 연결 테이블 team_member에 저장됩니다. 지금은 메모리의 목록만 바뀌었습니다.', '');
    }
    st.member = 'managed'; st.dbMember = true; st.fk = own ? '1' : 'null';
    send('insert', 'member', "insert into member (name, team_id) values ('김철수', " + st.fk + ')', ln('persistMember'));
    push('persistMember', 'em.persist(member): INSERT가 바로 나갑니다. team_id 컬럼에는 회원 객체의 team 필드에서 읽은 값이 들어갑니다. ' + (own ? 'team 필드가 id 1인 팀을 가리키므로 team_id는 1입니다.' : 'team 필드가 null이므로 team_id도 null입니다. 팀의 목록에 회원을 넣은 것은 이 값에 아무 영향을 주지 못했습니다.'), own ? 'good' : 'bad');
    var joinPending = !mp && inv, afterPersist = st.sent.length;
    if (clear) {
      if (joinPending) {
        st.join = 1; send('insert', 'team_member', 'insert into team_member (team_id, members_id) values (1, 1)', ln('flush')); joinPending = false;
        push('flush', 'em.flush(): 모아 둔 변경을 DB로 보냅니다. 팀의 members 목록에 회원이 하나 들어 있으므로, 연결 테이블 team_member에 행을 넣는 INSERT가 나갑니다.', '');
      } else push('flush', 'em.flush(): 모아 둔 변경을 DB로 보내는 명령입니다. INSERT 두 건은 이미 나갔고' + (mp && inv ? ', mappedBy가 붙은 목록은 SQL을 만들지 않으므로' : '') + ' 더 보낼 SQL이 없습니다.', '');
      st.team = 'gone'; st.member = 'gone';
      push('clear', 'em.clear(): 영속성 컨텍스트(1차 캐시)를 비웁니다. 지금까지 쓰던 team과 member 객체는 더 이상 관리되지 않습니다.', '');
      st.team = 'found'; st.teamList = '아직 읽지 않음'; send('select', 'team', 'select * from team where id = 1', ln('find'));
      push('find', 'em.find(Team.class, team.getId()): 1차 캐시가 비어 있으므로 SELECT로 팀을 DB에서 다시 읽습니다. found는 새로 만들어진 객체이고, members 목록은 아직 읽지 않았습니다.', '');
      if (mp) {
        st.size = own ? '1' : '0'; st.teamList = own ? '[김철수]' : '[ ]'; send('select', 'member', 'select * from member where team_id = 1', ln('size'));
        push('size', 'found.getMembers().size(): members를 처음 쓰는 순간 SELECT가 나갑니다. mappedBy = "team"이므로 member 테이블에서 team_id가 1인 행을 찾습니다. ' + (own ? '한 건이 있어서 1입니다.' : 'team_id가 null로 저장됐기 때문에 한 건도 없어서 0입니다.'), own ? 'good' : 'bad');
      } else {
        st.size = inv ? '1' : '0'; st.teamList = inv ? '[김철수]' : '[ ]'; send('select', 'team_member', 'select * from team_member tm join member m on m.id = tm.members_id where tm.team_id = 1', ln('size'));
        push('size', 'found.getMembers().size(): members를 처음 쓰는 순간 SELECT가 나갑니다. mappedBy가 없으므로 member.team_id가 아니라 연결 테이블 team_member에서 이 팀의 행을 찾습니다. ' + (inv ? '한 건이 있어서 1입니다.' : '연결 테이블에는 넣은 것이 없어서 0입니다. member.team_id에는 1이 저장돼 있는데도 그렇습니다.'), inv ? '' : 'bad');
      }
    } else {
      push('find', 'em.find(Team.class, team.getId()): 1차 캐시에 id 1인 팀이 있으므로 DB에 가지 않고 그 객체를 돌려줍니다. found와 team은 같은 객체입니다.', '');
      st.size = inv ? '1' : '0';
      var tail = '', cls = '';
      if (mp && inv && !own) { tail = ' DB의 team_id는 null인데, 메모리에서는 팀에 회원이 있는 것처럼 보입니다.'; cls = 'bad'; }
      if (mp && !inv) { tail = ' DB에는 team_id가 1로 저장됐는데, 메모리의 목록은 비어 있습니다.'; cls = 'bad'; }
      if (mp && inv && own) { tail = ' DB의 team_id와 메모리의 목록이 서로 맞습니다.'; cls = 'good'; }
      push('size', 'found.getMembers().size(): found는 처음에 만든 team 객체 그대로이므로, 자바 목록에 들어 있는 개수를 그대로 돌려줍니다. DB에 묻지 않습니다. ' + (inv ? '목록에 회원을 넣었으므로 1입니다.' : '목록에는 아무것도 넣지 않았으므로 0입니다.') + tail, cls);
    }
    var beforeCommit = st.sent.length;
    if (joinPending) {
      st.join = 1; send('insert', 'team_member', 'insert into team_member (team_id, members_id) values (1, 1)', '커밋 직전');
      push('commit', '커밋: 커밋 직전의 flush에서 팀의 members 목록을 보고, 연결 테이블 team_member에 행을 넣는 INSERT가 나갑니다.', '');
    } else push('commit', '커밋: 더 보낼 SQL이 없습니다.' + (mp && !own ? ' 팀의 목록에 넣은 회원은 끝내 DB에 반영되지 않았습니다. 예외도 나지 않습니다.' : ''), mp && !own ? 'bad' : '');

    var kinds = {}, order = [];
    st.sent.forEach(function (q) { var k = q.kind.toUpperCase(); if (!kinds[k]) { kinds[k] = 0; order.push(k); } kinds[k]++; });
    var sqlText = order.map(function (k) { return k + ' ' + kinds[k] + '번'; }).join(', ');
    var tables = [{ name: 'member', cols: ['id', 'name', 'team_id'] }, { name: 'team', cols: ['id', 'name'] }];
    if (!mp) tables.push({ name: 'team_member', cols: ['members_id', 'team_id'] });
    if (mp && !own) sum.push('주인이 아닌 쪽(mappedBy가 붙은 Team.members)에만 넣으면 외래 키가 저장되지 않습니다. 예외가 나지 않아서 저장된 줄 알기 쉽습니다.' + (clear ? ' DB에서 다시 읽어 보면 팀의 목록이 비어 있습니다.' : ' 같은 트랜잭션 안에서는 메모리의 목록에 회원이 보이기 때문에 더 알아차리기 어렵습니다.'));
    if (mp && own && !inv) sum.push('주인 쪽(Member.team)에 넣었으므로 외래 키가 저장됩니다.' + (clear ? ' DB에서 다시 읽으면 팀의 목록도 맞게 채워집니다. 하지만 코드가 늘 flush와 clear를 거치는 것은 아니므로, 양쪽에 다 넣어 두는 편이 안전합니다.' : ' 하지만 팀 객체의 목록에는 넣지 않았기 때문에, 같은 트랜잭션 안에서 team.getMembers()를 읽으면 비어 있습니다. DB와 메모리가 서로 다른 상태입니다.'));
    if (mp && own && inv) sum.push('양쪽에 다 넣으면 DB의 외래 키도, 메모리의 목록도 맞습니다. 외래 키를 저장하는 것은 member.setTeam(team)이고, team.getMembers().add(member)는 같은 트랜잭션 안에서 객체를 읽을 때를 위한 것입니다.', '둘 중 하나를 빠뜨리지 않도록, setTeam 안에서 team.getMembers().add(this)까지 함께 하는 메서드를 만들어 두는 방법을 많이 씁니다(연관관계 편의 메서드).');
    if (!mp) sum.push('양방향인데 mappedBy를 빠뜨리면 JPA는 두 참조를 서로 상관없는 연관관계 두 개로 봅니다. Member.team은 외래 키 team_id에, Team.members는 연결 테이블 team_member에 따로 저장됩니다. 뜻하지 않은 테이블이 하나 더 생깁니다.', inv && own ? '같은 사실이 두 곳(team_id와 team_member)에 저장되고 INSERT도 한 번 더 나갔습니다.' : inv ? '팀의 목록에 넣은 것은 연결 테이블에만 저장되고, member.team_id는 null로 남았습니다.' : 'member.team_id는 저장됐지만 연결 테이블은 비어 있어서, DB에서 다시 읽어도 팀의 목록은 비어 있습니다.');
    return { events: ev, summary: sum, L: L.map(function (l) { return l[1]; }), tables: tables, sent: st.sent, afterPersist: afterPersist, beforeCommit: beforeCommit, same: !clear, fk: st.fk, join: st.join, size: st.size,
      row: [st.fk, st.size + '명', sqlText, 'team, member' + (mp ? '' : ', team_member')] };
  },
  blank: function () { return { line: -2, team: '', teamList: '', member: '', ref: false, link: false, sent: [], dbTeam: false, dbMember: false, fk: '?', join: 0, size: '?' }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank();
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }).concat([{ cells: ['', { v: '(트랜잭션 커밋)', cls: s.line === -1 ? 'hot' : '' }, s.line === -1 ? '← 지금' : ''] }]), '실행 중인 코드');
    H.counters(v, [[s.sent.length, 'DB로 나간 SQL']]);
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 시점'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'DB로 나간 SQL');
  },
  // 그림: 왼쪽에 자바 객체 둘과 서로를 가리키는 두 참조, 오른쪽에 DB의 테이블. 주인 쪽 참조만 외래 키로 이어진다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(), mp = !!sim.c.mp;
    P.size(680, 312);
    P.region('mem', 16, 16, 306, 226, '자바 객체 (메모리)');
    var tGone = s.team === 'gone', mGone = s.member === 'gone', found = s.team === 'found';
    P.box('team', 36, 48, 266, 56, !s.team ? { cls: 'ghost', title: 'team', sub: '아직 없음' } : { cls: tGone ? 'ghost' : 'wait', title: found ? 'found (다시 읽은 팀)' : tGone ? 'team (관리 끝남)' : 'team (개발팀)', sub: 'members = ' + s.teamList });
    P.box('member', 36, 166, 266, 56, !s.member ? { cls: 'ghost', title: 'member', sub: '아직 없음' } : { cls: mGone ? 'ghost' : 'wait', title: mGone ? 'member (관리 끝남)' : 'member (김철수)', sub: 'team = ' + (s.ref ? 'team' : 'null') });
    var live = s.team && s.member && !tGone && !mGone && !found;
    if (live && s.ref) P.arrow('own', 'member:t:0.25', 'team:b:0.25', { cls: 'good', label: 'team (주인)' });
    if (live && s.link) P.arrow('inv', 'team:b:0.75', 'member:t:0.75', { cls: mp ? 'dash' : 'hot', label: mp ? 'members (읽기만)' : 'members' });
    P.region('db', 358, 16, 306, 226, 'DB');
    P.box('dteam', 374, 42, 274, 44, s.dbTeam ? { cls: 'plain', title: 'team 테이블', sub: 'id 1 · name 개발팀' } : { cls: 'ghost', title: 'team 테이블', sub: '행 없음' });
    P.box('dmember', 374, 124, 274, 44, s.dbMember ? { cls: s.fk === 'null' ? 'bad' : 'good', title: 'member 테이블', sub: 'id 1 · name 김철수 · team_id ' + s.fk } : { cls: 'ghost', title: 'member 테이블', sub: '행 없음' });
    if (!mp) P.box('djoin', 374, 186, 274, 44, s.join ? { cls: 'hot', title: 'team_member 테이블', sub: 'team_id 1 · members_id 1' } : { cls: 'ghost', title: 'team_member 테이블', sub: '행 없음' });
    if (s.dbMember && s.fk === '1') P.arrow('fk', 'dmember:t', 'dteam:b', { cls: 'good', label: '외래 키' });
    var sizeBad = s.size !== '?' && mp && s.size !== (s.fk === '1' ? '1' : '0');
    P.box('r1', 16, 258, 320, 38, { cls: s.fk === '?' ? 'ghost' : s.fk === 'null' ? 'bad' : 'good', title: 'DB의 member.team_id', right: s.fk });
    P.box('r2', 344, 258, 320, 38, { cls: s.size === '?' ? 'ghost' : sizeBad ? 'bad' : 'plain', title: 'team.getMembers().size()', right: s.size === '?' ? '?' : s.size + '명' });
    P.note('초록 화살표(member의 team 필드)가 주인입니다. JPA는 이 참조만 보고 외래 키 team_id를 씁니다. ' + (mp ? '점선 화살표(team의 members 목록)는 mappedBy가 붙은 쪽으로, 메모리에서 읽을 때만 쓰이고 SQL에는 반영되지 않습니다.' : 'mappedBy가 없으면 team의 members 목록도 따로 저장되는데, 저장되는 곳은 외래 키가 아니라 연결 테이블 team_member입니다.'));
  },
  assume: '팀 하나와 회원 하나를 새로 저장하는 경우만 다룹니다. 이미 저장된 회원의 팀을 바꾸는 경우(UPDATE가 나가는 경우)는 다루지 않았습니다. 기본 키는 IDENTITY 전략이어서 persist를 부를 때 INSERT가 바로 나갑니다. 열두 가지 조합 모두를 Hibernate 7.4.5와 H2 데이터베이스에서 같은 구조의 코드로 실행해, 만들어진 테이블과 컬럼, 나간 SQL의 종류와 테이블별 횟수, 그 SQL이 persist 때 나갔는지 커밋 직전에 나갔는지, DB의 member.team_id 값, 연결 테이블의 행 수, team.getMembers().size()가 화면과 일치하는 것을 확인했습니다. 연결 테이블과 그 컬럼의 이름(team_member, team_id, members_id)은 Hibernate 7.4.5가 기본 규칙으로 지은 것이고 @JoinTable로 바꿀 수 있습니다. 화면의 SQL 문장은 읽기 쉽게 줄여 쓴 것이어서 실제 문장과 글자가 같지는 않습니다. SQL 로그에서는 테이블 이름 뒤에 별칭이 붙고 값 자리에 물음표가 들어갑니다.',
});
