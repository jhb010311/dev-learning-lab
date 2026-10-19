Lab.register({
  id: 'relations', nav: '다대일, 일대다, 일대일, 다대다', cat: 'JPA', mode: 'step',
  title: '관계의 종류에 따라 테이블과 외래 키는 어떻게 달라지나',
  intro: '엔티티 사이의 관계에는 다대일, 일대다, 일대일, 다대다가 있습니다. 어느 것을 고르느냐에 따라 만들어지는 테이블의 수, 외래 키가 놓이는 테이블, 저장할 때 나가는 SQL이 달라집니다.',
  terms: ['다대일과 일대다 연관관계', '일대일 연관관계', '다대다와 연결 테이블', '연관관계의 주인과 mappedBy', '기본 키, 유니크 키, 외래 키'],
  controls: [
    { id: 'rel', label: '관계의 종류', type: 'select', value: 'o2m', options: [['m2o', '다대일: 회원이 팀을 가리킴 (@ManyToOne)'], ['o2m', '일대다 단방향: 팀이 회원 목록을 가짐 (@OneToMany + @JoinColumn)'], ['o2mjt', '일대다 단방향인데 @JoinColumn을 적지 않음'], ['o2o', '일대일: 회원과 사물함 (@OneToOne)'], ['m2m', '다대다: 회원과 상품 (@ManyToMany)']] },
    { id: 'fk', label: '일대일의 외래 키를 둘 테이블', type: 'select', value: 'main', options: [['main', '회원 테이블 (member.locker_id)'], ['target', '사물함 테이블 (locker.member_id)']], show: function (c) { return c.rel === 'o2o'; } },
    { id: 'n', label: '함께 저장할 상대의 수', type: 'range', min: 1, max: 3, value: 2, step: 1, fmt: function (v) { return v + '개'; }, show: function (c) { return c.rel !== 'o2o'; }, hint: '다대일과 일대다에서는 한 팀에 속한 회원 수, 다대다에서는 한 회원이 고른 상품 수입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: '팀이 @OneToMany + @JoinColumn으로 회원 목록을 가질 때 회원 2명을 함께 저장하면 SQL은 어떻게 나가나', d: '일대다 단방향. INSERT가 끝난 뒤에 외래 키를 채우는 UPDATE가 회원 수만큼 더 나갑니다.', v: { rel: 'o2m', fk: 'main', n: 2 } },
    { t: '다대일', q: '관계의 종류를 회원이 팀을 가리키는 @ManyToOne으로 바꾸면', d: '테이블은 같은데 INSERT만으로 끝납니다.', v: { rel: 'm2o', fk: 'main', n: 2 } },
    { t: '일대다에서 @JoinColumn을 빼면', q: '일대다 단방향에서 @JoinColumn을 적지 않으면', d: '외래 키 대신 연결 테이블이 생깁니다.', v: { rel: 'o2mjt', fk: 'main', n: 2 } },
    { t: '다대다', q: '회원과 상품의 관계를 @ManyToMany로 바꾸면', d: '가운데에 연결 테이블 member_product가 자동으로 생깁니다.', v: { rel: 'm2m', fk: 'main', n: 2 } },
    { t: '일대일: 외래 키를 회원 테이블에', q: '회원과 사물함을 @OneToOne으로 바꾸고 외래 키를 회원 테이블 member.locker_id에 두면', d: 'member.locker_id에 외래 키와 유니크 제약이 생깁니다.', v: { rel: 'o2o', fk: 'main', n: 2 } },
    { t: '일대일: 외래 키를 사물함 테이블에', q: '@OneToOne 회원과 사물함인데 외래 키를 사물함 테이블 locker.member_id에 두면', d: '외래 키가 locker.member_id로 옮겨 갑니다.', v: { rel: 'o2o', fk: 'target', n: 2 } },
    { t: '일대다에서 회원이 3명이면', q: '일대다 단방향에서 회원 3명을 함께 저장하면', d: 'UPDATE도 3번으로 늘어납니다.', v: { rel: 'o2m', fk: 'main', n: 3 } },
  ],
  // 관계의 종류마다 테이블, 외래 키, 엔티티 코드, 저장 코드를 정해 둔 것
  spec: function (c) {
    var n = +c.n, key = c.rel === 'o2o' ? (c.fk === 'target' ? 'o2otarget' : 'o2omain') : c.rel;
    var id = '    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n';
    var loop = 'for (int i = 1; i <= ' + n + '; i++) {';
    if (key === 'm2o') return { key: key, n: n, owner: 'Member.team', tables: [['team', ['id', 'name']], ['member', ['id', 'name', 'team_id']]], fks: [['member', 'team_id', 'team', false]],
      ent: '@Entity\nclass Team {\n' + id + '}\n\n@Entity\nclass Member {\n' + id + '\n    @ManyToOne                          // 회원 여러 명이 팀 하나에 속한다\n    @JoinColumn(name = "team_id")       // 외래 키는 내 테이블(member)에 있다\n    Team team;\n}',
      lines: ['Team team = new Team("개발팀");', 'em.persist(team);', loop, '    Member member = new Member("회원" + i);', '    member.setTeam(team);', '    em.persist(member);', '}'] };
    if (key === 'o2m') return { key: key, n: n, owner: 'Team.members', tables: [['team', ['id', 'name']], ['member', ['id', 'name', 'team_id']]], fks: [['member', 'team_id', 'team', false]],
      ent: '@Entity\nclass Team {\n' + id + '\n    @OneToMany                          // 팀 하나에 회원 여러 명\n    @JoinColumn(name = "team_id")       // 외래 키는 상대 테이블(member)에 있다\n    List<Member> members = new ArrayList<>();\n}\n\n@Entity\nclass Member {\n' + id + '}                                       // 팀을 가리키는 필드가 없다',
      lines: ['Team team = new Team("개발팀");', 'em.persist(team);', loop, '    Member member = new Member("회원" + i);', '    em.persist(member);', '    team.getMembers().add(member);', '}'] };
    if (key === 'o2mjt') return { key: key, n: n, owner: 'Team.members', tables: [['team', ['id', 'name']], ['team_member', ['team_id', 'members_id']], ['member', ['id', 'name']]], fks: [['team_member', 'team_id', 'team', false], ['team_member', 'members_id', 'member', true]],
      ent: '@Entity\nclass Team {\n' + id + '\n    @OneToMany                          // @JoinColumn을 적지 않았다\n    List<Member> members = new ArrayList<>();\n}\n\n@Entity\nclass Member {\n' + id + '}',
      lines: ['Team team = new Team("개발팀");', 'em.persist(team);', loop, '    Member member = new Member("회원" + i);', '    em.persist(member);', '    team.getMembers().add(member);', '}'] };
    if (key === 'm2m') return { key: key, n: n, owner: 'Member.products', tables: [['member', ['id', 'name']], ['member_product', ['member_id', 'products_id']], ['product', ['id', 'name']]], fks: [['member_product', 'member_id', 'member', false], ['member_product', 'products_id', 'product', false]],
      ent: '@Entity\nclass Product {\n' + id + '}\n\n@Entity\nclass Member {\n' + id + '\n    @ManyToMany                         // 회원도 여러 명, 상품도 여러 개\n    List<Product> products = new ArrayList<>();\n}',
      lines: ['Member member = new Member("회원1");', 'em.persist(member);', loop, '    Product product = new Product("상품" + i);', '    em.persist(product);', '    member.getProducts().add(product);', '}'] };
    if (key === 'o2omain') return { key: key, n: 1, owner: 'Member.locker', tables: [['locker', ['id', 'name']], ['member', ['id', 'name', 'locker_id']]], fks: [['member', 'locker_id', 'locker', true]],
      ent: '@Entity\nclass Locker {\n' + id + '}\n\n@Entity\nclass Member {\n' + id + '\n    @OneToOne                           // 회원 하나에 사물함 하나\n    @JoinColumn(name = "locker_id")     // 외래 키를 회원 테이블에 둔다\n    Locker locker;\n}',
      lines: ['Locker locker = new Locker("101번 사물함");', 'em.persist(locker);', 'Member member = new Member("회원1");', 'member.setLocker(locker);', 'em.persist(member);'] };
    return { key: key, n: 1, owner: 'Locker.member', tables: [['member', ['id', 'name']], ['locker', ['id', 'name', 'member_id']]], fks: [['locker', 'member_id', 'member', true]],
      ent: '@Entity\nclass Locker {\n' + id + '\n    @OneToOne\n    @JoinColumn(name = "member_id")     // 외래 키를 사물함 테이블에 둔다\n    Member member;\n}\n\n@Entity\nclass Member {\n' + id + '\n    @OneToOne(mappedBy = "member")      // 주인이 아니다. 읽기만 한다\n    Locker locker;\n}',
      lines: ['Member member = new Member("회원1");', 'em.persist(member);', 'Locker locker = new Locker("101번 사물함");', 'locker.setMember(member);', 'em.persist(locker);'] };
  },
  code: function (c) {
    var sp = this.spec(c);
    return sp.ent + '\n// 생성자와 getter, setter는 줄였습니다\n\n// 트랜잭션 안에서\n' + sp.lines.join('\n') + '\n// 트랜잭션 커밋';
  },
  label: function (c) { return c.rel === 'o2o' ? '일대일 · 외래 키는 ' + (c.fk === 'target' ? '사물함 테이블' : '회원 테이블') : { m2o: '다대일', o2m: '일대다 단방향', o2mjt: '일대다 단방향 · @JoinColumn 없음', m2m: '다대다' }[c.rel] + ' · ' + (c.rel === 'm2m' ? '상품 ' : '회원 ') + (+c.n) + (c.rel === 'm2m' ? '개' : '명'); },
  columns: ['만들어진 테이블', '외래 키가 있는 곳', '저장할 때 나간 SQL'],
  simulate: function (c) {
    var sp = this.spec(c), key = sp.key, n = sp.n, ev = [], sum = [], i;
    var st = { line: -2, rows: {}, sent: [], hot: '' };
    sp.tables.forEach(function (t) { st.rows[t[0]] = []; });
    function push(line, s, k) { st.line = line; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.hot = ''; }
    function send(kind, table, sql, when) { st.sent.push({ kind: kind, table: table, sql: sql, at: when }); st.hot = table; }
    var before;
    if (key === 'm2o' || key === 'o2m' || key === 'o2mjt') {
      st.rows.team.push(['1', '개발팀']); send('insert', 'team', "insert into team (name) values ('개발팀')", '2번째 줄');
      push(1, 'em.persist(team): 팀을 저장합니다. 기본 키가 IDENTITY 전략이어서 INSERT가 바로 나가고 id 1을 받아 옵니다.', '');
      for (i = 1; i <= n; i++) {
        if (key === 'm2o') {
          st.rows.member.push([String(i), '회원' + i, '1']); send('insert', 'member', "insert into member (name, team_id) values ('회원" + i + "', 1)", '6번째 줄 (' + i + '번째 반복)');
          push(5, i + '번째 반복, em.persist(member): 바로 앞 줄의 member.setTeam(team)으로 회원 객체가 팀을 가리키고 있습니다. 외래 키를 관리하는 필드가 Member 안에 있으므로, INSERT 한 번에 team_id 1까지 함께 들어갑니다.', 'good');
        } else if (key === 'o2m') {
          st.rows.member.push([String(i), '회원' + i, 'null']); send('insert', 'member', "insert into member (name) values ('회원" + i + "')", '5번째 줄 (' + i + '번째 반복)');
          push(4, i + '번째 반복, em.persist(member): Member 클래스에는 팀을 가리키는 필드가 없습니다. 그래서 INSERT 문에 team_id가 들어가지 않고, 이 행의 team_id는 null로 남습니다.', 'bad');
          push(5, i + '번째 반복, team.getMembers().add(member): 팀의 목록에 회원을 넣습니다. 외래 키 team_id는 member 테이블에 있지만, 그것을 관리하는 것은 Team의 이 목록입니다. 지금은 메모리의 목록만 바뀌었습니다.', '');
        } else {
          st.rows.member.push([String(i), '회원' + i]); send('insert', 'member', "insert into member (name) values ('회원" + i + "')", '5번째 줄 (' + i + '번째 반복)');
          push(4, i + '번째 반복, em.persist(member): 회원을 저장합니다. member 테이블에는 팀을 가리키는 컬럼이 아예 없습니다.', '');
          push(5, i + '번째 반복, team.getMembers().add(member): 팀의 목록에 회원을 넣습니다. @JoinColumn이 없으므로 이 목록은 연결 테이블 team_member에 저장됩니다. 지금은 메모리의 목록만 바뀌었습니다.', '');
        }
      }
      before = st.sent.length;
      if (key === 'm2o') push(-1, '트랜잭션 커밋: 외래 키까지 INSERT에 다 들어갔으므로 더 보낼 SQL이 없습니다.', 'good');
      else if (key === 'o2m') {
        push(-1, '트랜잭션 커밋: 커밋 직전에 flush가 일어납니다. JPA가 팀의 members 목록을 살펴보니 회원이 ' + n + '명 들어 있습니다. INSERT 때 넣지 못한 team_id를 이제 채워야 합니다.', '');
        for (i = 1; i <= n; i++) {
          st.rows.member[i - 1][2] = '1'; send('update', 'member', 'update member set team_id = 1 where id = ' + i, '커밋 직전');
          push(-1, '회원' + i + '의 외래 키를 채우는 UPDATE가 나갑니다. team_id가 null에서 1로 바뀝니다. 다대일이었다면 나가지 않았을 SQL입니다.', 'bad');
        }
      } else {
        push(-1, '트랜잭션 커밋: 커밋 직전에 flush가 일어납니다. JPA가 팀의 members 목록을 살펴보니 회원이 ' + n + '명 들어 있습니다. 이 목록의 내용을 연결 테이블에 넣어야 합니다.', '');
        for (i = 1; i <= n; i++) {
          st.rows.team_member.push(['1', String(i)]); send('insert', 'team_member', 'insert into team_member (team_id, members_id) values (1, ' + i + ')', '커밋 직전');
          push(-1, '연결 테이블 team_member에 "팀 1에 회원 ' + i + '번이 속한다"는 행을 넣는 INSERT가 나갑니다.', '');
        }
      }
    } else if (key === 'm2m') {
      st.rows.member.push(['1', '회원1']); send('insert', 'member', "insert into member (name) values ('회원1')", '2번째 줄');
      push(1, 'em.persist(member): 회원을 저장합니다. 기본 키가 IDENTITY 전략이어서 INSERT가 바로 나가고 id 1을 받아 옵니다.', '');
      for (i = 1; i <= n; i++) {
        st.rows.product.push([String(i), '상품' + i]); send('insert', 'product', "insert into product (name) values ('상품" + i + "')", '5번째 줄 (' + i + '번째 반복)');
        push(4, i + '번째 반복, em.persist(product): 상품을 저장합니다. product 테이블에도 member 테이블에도 상대를 가리키는 컬럼은 없습니다.', '');
        push(5, i + '번째 반복, member.getProducts().add(product): 회원의 상품 목록에 상품을 넣습니다. 이 목록은 연결 테이블 member_product에 저장됩니다. 지금은 메모리의 목록만 바뀌었습니다.', '');
      }
      before = st.sent.length;
      push(-1, '트랜잭션 커밋: 커밋 직전에 flush가 일어납니다. JPA가 회원의 products 목록을 살펴보니 상품이 ' + n + '개 들어 있습니다. 이 목록의 내용을 연결 테이블에 넣어야 합니다.', '');
      for (i = 1; i <= n; i++) {
        st.rows.member_product.push(['1', String(i)]); send('insert', 'member_product', 'insert into member_product (member_id, products_id) values (1, ' + i + ')', '커밋 직전');
        push(-1, '연결 테이블 member_product에 "회원 1이 상품 ' + i + '번을 골랐다"는 행을 넣는 INSERT가 나갑니다.', '');
      }
    } else if (key === 'o2omain') {
      st.rows.locker.push(['1', '101번 사물함']); send('insert', 'locker', "insert into locker (name) values ('101번 사물함')", '2번째 줄');
      push(1, 'em.persist(locker): 사물함을 먼저 저장합니다. INSERT가 바로 나가고 id 1을 받아 옵니다.', '');
      push(3, 'member.setLocker(locker): 회원 객체의 locker 필드가 사물함을 가리킵니다. 이 필드에 @JoinColumn(name = "locker_id")가 붙어 있으므로 외래 키는 member 테이블에 놓입니다.', '');
      st.rows.member.push(['1', '회원1', '1']); send('insert', 'member', "insert into member (name, locker_id) values ('회원1', 1)", '5번째 줄');
      push(4, 'em.persist(member): INSERT 한 번에 locker_id 1까지 함께 들어갑니다.', 'good');
      before = st.sent.length;
      push(-1, '트랜잭션 커밋: 더 보낼 SQL이 없습니다.', '');
    } else {
      st.rows.member.push(['1', '회원1']); send('insert', 'member', "insert into member (name) values ('회원1')", '2번째 줄');
      push(1, 'em.persist(member): 회원을 먼저 저장합니다. INSERT가 바로 나가고 id 1을 받아 옵니다. member 테이블에는 사물함을 가리키는 컬럼이 없습니다.', '');
      push(3, 'locker.setMember(member): 사물함 객체의 member 필드가 회원을 가리킵니다. 이 필드에 @JoinColumn(name = "member_id")가 붙어 있으므로 외래 키는 locker 테이블에 놓입니다. Member의 locker 필드는 mappedBy가 붙어 있어 읽기만 합니다.', '');
      st.rows.locker.push(['1', '101번 사물함', '1']); send('insert', 'locker', "insert into locker (name, member_id) values ('101번 사물함', 1)", '5번째 줄');
      push(4, 'em.persist(locker): INSERT 한 번에 member_id 1까지 함께 들어갑니다.', 'good');
      before = st.sent.length;
      push(-1, '트랜잭션 커밋: 더 보낼 SQL이 없습니다.', '');
    }
    var ins = st.sent.filter(function (q) { return q.kind === 'insert'; }).length, upd = st.sent.length - ins;
    var sqlText = 'INSERT ' + ins + '번' + (upd ? ', UPDATE ' + upd + '번' : '');
    var fkText = sp.fks.map(function (f) { return f[0] + '.' + f[1] + (f[3] ? ' (유니크)' : ''); }).join(', ');
    var names = sp.tables.map(function (t) { return t[0]; });
    if (key === 'm2o') sum.push('다대일에서는 외래 키가 "다" 쪽 테이블(member)에 있고, 그 외래 키를 관리하는 필드(Member.team)도 같은 엔티티 안에 있습니다. 그래서 INSERT 한 번에 외래 키까지 들어갑니다. 가장 기본이 되는 매핑입니다.');
    if (key === 'o2m') sum.push('일대다 단방향에서도 외래 키는 member 테이블에 있습니다. 일대다 관계를 외래 키 컬럼 하나로 나타내면 그 컬럼은 "다" 쪽 테이블에 놓일 수밖에 없기 때문입니다. 팀의 한 행에는 회원 여러 명의 id를 적을 칸이 없습니다. 그런데 그것을 관리하는 것은 반대편 엔티티인 Team의 목록입니다. Member를 INSERT할 때는 팀을 알 수 없어서, 나중에 UPDATE로 외래 키를 채웁니다. 회원 ' + n + '명에 UPDATE가 ' + n + '번 더 나갔습니다.', '테이블 모양은 다대일과 똑같은데 SQL만 더 나갑니다. 그래서 일대다 단방향보다 다대일을 먼저 쓰고, 팀에서 회원 목록이 필요하면 mappedBy를 붙인 양방향으로 만드는 방법을 많이 씁니다.');
    if (key === 'o2mjt') sum.push('일대다 단방향에 @JoinColumn을 적지 않으면 외래 키 대신 연결 테이블(team_member)이 만들어집니다. 테이블이 하나 더 생기고, 회원마다 연결 테이블에 INSERT가 한 번씩 더 나갑니다.', '연결 테이블의 members_id에는 유니크 제약이 걸려 있어서 한 회원이 두 팀에 들어갈 수 없습니다. 이 제약 덕분에 연결 테이블을 쓰면서도 일대다가 유지됩니다.');
    if (key === 'm2m') sum.push('다대다는 테이블 두 개만으로는 표현할 수 없습니다. 한 칸에 값을 여러 개 넣을 수 없기 때문입니다. 그래서 가운데에 연결 테이블(member_product)이 자동으로 만들어지고, 관계 하나가 행 하나로 저장됩니다.', '자동으로 만들어진 연결 테이블에는 양쪽을 가리키는 외래 키 두 개만 있습니다. 수량이나 주문한 날짜 같은 값을 넣을 자리가 없어서, 그런 값이 필요하면 연결 테이블을 엔티티로 따로 만들고 일대다와 다대일 두 개로 풀어 씁니다.');
    if (key === 'o2omain') sum.push('일대일은 외래 키를 어느 쪽 테이블에 두어도 됩니다. 여기서는 회원 테이블에 두었습니다. 외래 키 locker_id에 유니크 제약이 함께 걸려서, 사물함 하나를 두 회원이 가리킬 수 없습니다. 다대일과 다른 점이 바로 이 유니크 제약입니다.');
    if (key === 'o2otarget') sum.push('외래 키를 사물함 테이블에 두었습니다. 외래 키가 있는 테이블의 엔티티(Locker)가 연관관계의 주인이 되고, Member의 locker 필드는 mappedBy로 읽기만 합니다. 테이블 수와 INSERT 횟수는 같고, 외래 키의 위치와 저장 순서(회원 먼저, 사물함 나중)만 달라졌습니다.');
    var tables = sp.tables.map(function (t) { return { name: t[0], cols: t[1] }; });
    return { events: ev, summary: sum, L: sp.lines, key: key, tables: tables, fks: sp.fks, owner: sp.owner, sent: st.sent, before: before, rows: st.rows, fkInInsert: key === 'o2mjt' || key === 'm2m' ? '-' : String(key !== 'o2m'),
      row: [names.join(', '), fkText, sqlText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -2, rows: {}, sent: [], hot: '' };
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }).concat([{ cells: ['', { v: '(트랜잭션 커밋)', cls: s.line === -1 ? 'hot' : '' }, s.line === -1 ? '← 지금' : ''] }]), '실행 중인 코드');
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 시점'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: q.kind === 'update' ? 'bad' : '' }, q.at] }; }), 'DB로 나간 SQL');
  },
  // 그림: 만들어진 테이블을 상자로 그리고, 외래 키가 있는 테이블에서 가리키는 테이블로 화살표를 긋는다. 아래에는 나간 SQL의 수.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -2, rows: {}, sent: [], hot: '' };
    var three = sim.tables.length === 3, pos = three ? [[16, 150], [210, 260], [514, 150]] : [[36, 250], [394, 250]];
    P.size(680, 262);
    P.region('tb', 8, 10, 664, 154, 'DB에 만들어진 테이블');
    sim.tables.forEach(function (tb, i) {
      var rows = s.rows[tb.name] || [], fk = sim.fks.filter(function (x) { return x[0] === tb.name; });
      var head = tb.cols.map(function (col) { return fk.some(function (x) { return x[1] === col; }) ? col + '(FK)' : col; }).join(' · ');
      var sub = [head].concat(rows.length ? rows.map(function (r) { return r.join(' · '); }) : ['(행 없음)']);
      fk.forEach(function (x) { if (x[3]) sub.push('(' + x[1] + '에 유니크 제약)'); });
      P.box('t_' + tb.name, pos[i][0], 42, pos[i][1], 110, { cls: s.hot === tb.name ? 'hot' : fk.length ? 'wait' : 'plain', title: tb.name + ' 테이블', sub: sub });
    });
    sim.fks.forEach(function (x) { P.arrow('fk_' + x[0] + '_' + x[1], 't_' + x[0], 't_' + x[2], { cls: 'good', label: three ? '' : x[1] }); });
    var ins = s.sent.filter(function (q) { return q.kind === 'insert'; }).length, upd = s.sent.length - ins;
    P.box('q_ins', 16, 178, 150, 40, { cls: ins ? 'plain' : 'ghost', title: 'INSERT', right: ins + '번' });
    P.box('q_upd', 176, 178, 150, 40, { cls: upd ? 'bad' : 'ghost', title: 'UPDATE', right: upd + '번' });
    P.box('q_own', 336, 178, 328, 40, { cls: 'plain', title: '외래 키를 관리하는 필드', right: sim.owner });
    P.note('파란 상자가 외래 키(FK)를 가진 테이블이고, 초록 화살표는 외래 키가 가리키는 테이블입니다. 노란 상자는 이번 단계에서 SQL이 나간 테이블입니다.');
  },
  assume: '엔티티마다 필드는 id와 name만 두었고, 기본 키는 IDENTITY 전략이어서 persist를 부를 때 INSERT가 바로 나갑니다. 일대다와 다대다는 한쪽에서만 상대를 가리키는 단방향으로 만들었습니다. 열네 가지 조합(다대일, 일대다, @JoinColumn 없는 일대다, 다대다는 상대의 수 1·2·3개씩, 일대일은 외래 키 위치 두 가지) 모두를 Hibernate 7.4.5와 H2 데이터베이스에서 같은 구조의 코드로 실행해, 만들어진 테이블과 컬럼, 외래 키 제약이 걸린 컬럼과 유니크 제약, 나간 SQL의 종류와 테이블별 횟수, 커밋 전까지 나간 SQL, 외래 키 컬럼에 남은 값이 화면과 일치하는 것을 확인했습니다. 일대다 단방향의 INSERT 문에 team_id가 들어 있지 않다는 것도 실제 SQL에서 확인했습니다. 연결 테이블과 그 컬럼의 이름(team_member, members_id, member_product, products_id)은 Hibernate 7.4.5가 기본 규칙으로 지은 것이고 @JoinTable로 바꿀 수 있습니다. 화면의 SQL 문장은 읽기 쉽게 줄여 쓴 것이어서 실제 문장과 글자가 같지는 않습니다. 테이블 안의 컬럼 순서도 실제와 다를 수 있습니다.',
});
