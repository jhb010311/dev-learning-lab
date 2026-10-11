Lab.register({
  id: 'dtoquery', nav: 'DTO로 바로 조회하기', cat: 'JPA', mode: 'step',
  title: '엔티티로 조회해 옮기는 것과 DTO로 바로 조회하는 것은 무엇이 다른가',
  intro: '화면에 회원의 이름과 나이만 보여 주면 되는데, 엔티티로 조회하면 회원의 모든 컬럼을 읽어 온 뒤 필요한 값만 DTO로 옮기게 됩니다. JPQL의 new를 쓰면 필요한 값만 골라 DTO로 바로 받을 수 있습니다.',
  terms: ['DTO', 'JPQL 생성자 표현식', '영속성 컨텍스트', '변경 감지(Dirty Checking)', 'N+1 문제'],
  controls: [
    { id: 'how', label: '조회하는 방법', type: 'select', value: 'entity', options: [['entity', '엔티티로 조회한 뒤 DTO로 옮김'], ['fetch', '엔티티를 fetch join으로 조회한 뒤 DTO로 옮김'], ['dto', 'JPQL의 new로 DTO를 바로 조회']] },
    { id: 'team', label: 'DTO에 팀 이름도 담는다', type: 'check', value: true, hint: '팀은 회원이 참조하는 다른 엔티티입니다(지연 로딩).' },
    { id: 'mod', label: '조회한 객체의 이름을 바꿔 본다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: '엔티티로 조회해 팀 이름까지 옮깁니다. SELECT가 3번 나갑니다.', v: { how: 'entity', team: true, mod: false } },
    { t: 'DTO로 바로 조회', d: 'SELECT 한 번, 컬럼 3개만 읽습니다.', v: { how: 'dto', team: true, mod: false } },
    { t: '이름과 나이만 필요할 때: 엔티티', d: '2개만 쓰는데 컬럼 6개를 모두 읽습니다.', v: { how: 'entity', team: false, mod: false } },
    { t: '이름과 나이만 필요할 때: DTO', d: '컬럼 2개만 읽고, 관리하는 엔티티가 없습니다.', v: { how: 'dto', team: false, mod: false } },
    { t: '엔티티의 값을 바꾸면', d: 'save를 부르지 않아도 커밋할 때 UPDATE가 나갑니다.', v: { how: 'entity', team: false, mod: true } },
    { t: 'DTO의 값을 바꾸면', d: '같은 setName인데 UPDATE가 나가지 않습니다.', v: { how: 'dto', team: false, mod: true } },
    { t: 'fetch join으로 조회', d: 'SELECT는 한 번이지만 팀의 컬럼까지 8개를 읽습니다.', v: { how: 'fetch', team: true, mod: false } },
  ],
  // 회원 4명과 팀 2개. Probe가 넣는 데이터와 같다
  data: [[1, '김철수', 30, 1], [2, '이영희', 25, 1], [3, '박민수', 41, 2], [4, '최지우', 19, 2]],
  teams: { 1: '개발팀', 2: '운영팀' },
  jpql: function (c) {
    if (c.how === 'dto') return c.team ? ['"select new dtoquery.MemberDto(m.name, m.age, t.name)" +', '" from Member m join m.team t"'] : ['"select new dtoquery.MemberDto(m.name, m.age)" +', '" from Member m"'];
    return [c.how === 'fetch' ? '"select m from Member m join fetch m.team"' : '"select m from Member m"'];
  },
  code: function (c) {
    var ent = '@Entity\nclass Member {\n    @Id Long id;\n    String name;\n    int age;\n    String email;\n    String city;\n    @ManyToOne(fetch = FetchType.LAZY)\n    Team team;             // Team에는 id, name, region이 있다\n}\n\n';
    var dto = '// 화면에 내보낼 값만 담는 클래스. 엔티티가 아니다 (패키지는 dtoquery)\npublic class MemberDto {\n    private String name;\n    private int age;\n' + (c.team ? '    private String teamName;\n    public MemberDto(String name, int age, String teamName) {\n        this.name = name; this.age = age; this.teamName = teamName;\n    }\n' : '    public MemberDto(String name, int age) {\n        this.name = name; this.age = age;\n    }\n') + '    public void setName(String name) { this.name = name; }\n}\n\n';
    var q = this.jpql(c), body;
    if (c.how === 'dto') body = '    List<MemberDto> dtos = em.createQuery(\n        ' + q.join('\n        ') + ', MemberDto.class)\n        .getResultList();\n' + (c.mod ? '\n    dtos.get(0).setName("김영수");      // 조회한 DTO의 이름을 바꿔 본다\n' : '');
    else body = '    List<Member> members = em.createQuery(\n        ' + q[0] + ', Member.class)\n        .getResultList();\n\n    List<MemberDto> dtos = new ArrayList<>();\n    for (Member m : members) {\n        dtos.add(new MemberDto(m.getName(), m.getAge()' + (c.team ? ', m.getTeam().getName()' : '') + '));\n    }\n' + (c.mod ? '\n    members.get(0).setName("김영수");   // 조회한 엔티티의 이름을 바꿔 본다\n' : '');
    return ent + dto + '@Transactional\npublic List<MemberDto> list() {\n' + body + '    return dtos;\n}   // 메서드가 끝나면 커밋';
  },
  label: function (c) { return { entity: '엔티티 → DTO', fetch: '엔티티 (fetch join) → DTO', dto: 'DTO로 바로 조회' }[c.how] + ' · 팀 이름 ' + (c.team ? '담음' : '안 담음') + ' · 이름 ' + (c.mod ? '바꿈' : '안 바꿈'); },
  columns: ['DB로 나간 SELECT', '첫 SELECT의 컬럼 수', '영속성 컨텍스트가 관리하는 엔티티', '커밋할 때 UPDATE'],
  simulate: function (c) {
    var self = this, ev = [], sum = [], D = this.data, T = this.teams, isDto = c.how === 'dto';
    var st = { members: [], teams: [], dtos: [], sqls: [], sel: 0, upd: 0, cols: 0, managed: 0, dbName: '김철수', arrow: '', sql: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function send(sql, why) { st.sqls.push({ sql: sql, why: why }); st.sql = sql; if (sql.indexOf('select') === 0) st.sel++; else st.upd++; }
    function dtoText(d) { return { t: d[1] + ' · ' + d[2], r: c.team ? T[d[3]] : '', cls: 'wait' }; }
    var teamQ = 0;

    if (isDto) {
      st.cols = c.team ? 3 : 2; st.arrow = 'direct';
      send(c.team ? 'select m.name, m.age, t.name from member m join team t' : 'select m.name, m.age from member m', 'JPQL의 new');
      st.dtos = D.map(dtoText);
      push('em.createQuery("select new dtoquery.MemberDto(…) …"): new 뒤에 DTO 클래스의 이름과, 생성자에 넘길 값을 적었습니다. SQL의 SELECT 절에는 그 값에 해당하는 컬럼 ' + st.cols + '개만 들어갑니다' + (c.team ? '(회원의 이름과 나이, 팀의 이름). 팀 이름은 team 테이블에 있으므로 같은 쿼리에서 조인해 가져옵니다.' : '(회원의 이름과 나이).') + ' 쿼리는 한 번입니다.', 'good');
      st.arrow = '';
      push('결과 만들기: Hibernate가 돌아온 행마다 MemberDto의 생성자를 불러 DTO 4개를 만듭니다. Member 엔티티는 만들지 않습니다. 그래서 영속성 컨텍스트에는 아무것도 들어가지 않고, 처음 값을 기억해 두는 스냅샷도 없습니다.', 'good');
      if (c.mod) { st.dtos[0] = { t: '김영수 · 30', r: st.dtos[0].r, cls: 'hot' }; push('dtos.get(0).setName("김영수"): DTO의 이름을 바꿨습니다. DTO는 @Entity가 없는 보통 자바 객체입니다. 영속성 컨텍스트는 이 객체를 알지 못합니다.'); }
      push('메서드 종료, 커밋: 영속성 컨텍스트가 관리하는 엔티티가 없으므로 비교할 것도, 보낼 SQL도 없습니다.' + (c.mod ? ' DTO의 이름은 김영수로 바뀌었지만 UPDATE는 나가지 않았고, DB의 이름은 김철수 그대로입니다.' : ''), c.mod ? 'bad' : '');
    } else {
      var fetch = c.how === 'fetch';
      st.cols = fetch ? 8 : 6; st.arrow = 'in';
      send(fetch ? 'select 회원 컬럼 5개, 팀 컬럼 3개 from member m join team t' : 'select 회원 컬럼 6개 from member m', '엔티티 조회');
      st.members = D.map(function (d) { return { name: d[1], cls: 'good' }; });
      st.teams = [1, 2].map(function (id) { return { name: T[id], loaded: fetch }; });
      st.managed = fetch ? 6 : 4;
      if (fetch) push('em.createQuery("select m from Member m join fetch m.team"): 회원과 팀을 조인해 한 번에 조회합니다. SELECT 절에는 회원의 컬럼 5개와 팀의 컬럼 3개, 모두 8개가 들어갑니다(회원의 team_id는 팀의 id와 같은 값이라 따로 읽지 않았습니다). 읽어 온 회원 4명과 팀 2개를 엔티티 객체로 만들어 영속성 컨텍스트에 보관하고, 처음 값을 스냅샷으로 남깁니다.');
      else push('em.createQuery("select m from Member m"): Member 엔티티를 통째로 조회합니다. SELECT 절에는 회원의 컬럼 6개(id, name, age, email, city, team_id)가 모두 들어갑니다. 읽어 온 회원 4명을 엔티티 객체로 만들어 영속성 컨텍스트에 보관하고, 처음 값을 스냅샷으로 남깁니다. 팀은 지연 로딩이라 아직 읽지 않았습니다.');
      st.arrow = 'conv';
      if (c.team && !fetch) {
        D.forEach(function (d) {
          var t = st.teams[d[3] - 1];
          st.dtos.push(dtoText(d));
          if (!t.loaded) {
            t.loaded = true; teamQ++; st.managed++; send('select 팀 컬럼 3개 from team where id = ' + d[3], '지연 로딩'); st.arrow = 'lazy';
            push('회원 ' + d[0] + '번을 DTO로 옮기기: m.getTeam().getName()으로 팀 이름을 꺼내는 순간, 아직 읽지 않은 팀 ' + d[3] + '번을 조회하는 SELECT가 따로 나갑니다(지연 로딩). 읽어 온 팀도 영속성 컨텍스트가 관리합니다.', 'bad');
          } else { st.arrow = 'conv'; push('회원 ' + d[0] + '번을 DTO로 옮기기: 이 회원의 팀 ' + d[3] + '번은 앞에서 읽어 영속성 컨텍스트에 있으므로 쿼리가 나가지 않습니다.'); }
        });
      } else {
        st.dtos = D.map(dtoText);
        push('DTO로 옮기기: 회원 4명을 돌며 new MemberDto(…)로 DTO 4개를 만듭니다. ' + (c.team ? '팀은 fetch join으로 이미 읽어 왔으므로 m.getTeam().getName()에서 쿼리가 더 나가지 않습니다. ' : '') + '읽어 온 컬럼 ' + st.cols + '개 가운데 DTO에 담은 것은 ' + (c.team ? '이름, 나이, 팀 이름 3개' : '이름과 나이 2개') + '뿐입니다.' + (fetch && !c.team ? ' 팀은 쓰지도 않는데 조인해서 읽어 왔습니다.' : ''));
      }
      st.arrow = '';
      if (c.mod) { st.members[0] = { name: '김영수', cls: 'hot' }; push('members.get(0).setName("김영수"): 엔티티의 이름을 바꿨습니다. 이 객체는 영속성 컨텍스트가 관리하고 있어서, 현재 값(김영수)이 스냅샷(김철수)과 달라진 상태가 됩니다. 아직 SQL은 나가지 않습니다.'); }
      if (c.mod) { send('update member set … where id = 1', '변경 감지'); st.dbName = '김영수'; st.arrow = 'upd'; st.members[0].cls = 'good'; push('메서드 종료, 커밋: 커밋 직전에 관리 중인 엔티티 ' + st.managed + '개를 스냅샷과 비교합니다. 회원 1의 이름이 달라졌으므로 UPDATE를 보냅니다. save를 부르지 않았는데도 DB의 이름이 김영수로 바뀌었습니다.', 'good'); }
      else push('메서드 종료, 커밋: 커밋 직전에 관리 중인 엔티티 ' + st.managed + '개를 스냅샷과 비교합니다. 달라진 것이 없어 보낼 SQL이 없습니다. 조회만 하는 화면인데도 스냅샷을 만들어 두고 비교하는 일은 일어납니다.');
    }
    var row = [st.sel + '번' + (teamQ ? ' (회원 1 + 팀 ' + teamQ + ')' : ''), st.cols + '개', st.managed + '개', !c.mod ? '0번 (값을 바꾸지 않음)' : st.upd ? '1번 (DB의 이름이 김영수로 바뀜)' : '0번 (DTO만 바뀌고 DB는 그대로)'];
    if (isDto) {
      sum.push('JPQL의 new로 조회하면 필요한 컬럼만 읽고, 결과는 엔티티가 아니라 보통 객체입니다. 영속성 컨텍스트가 관리하지 않으므로 스냅샷도, 커밋할 때의 비교도 없습니다. 목록이나 통계처럼 보여 주기만 하는 화면에 맞습니다.');
      sum.push(c.mod ? 'DTO의 값을 바꿔도 DB에는 반영되지 않습니다. 데이터를 수정하려면 엔티티로 조회해서 바꿔야 합니다.' : '반대로, 데이터를 수정하는 것이 목적이라면 엔티티로 조회해야 합니다. DTO는 바꿔도 DB에 반영되지 않습니다.');
      sum.push('이 쿼리는 이 화면에 필요한 값에만 맞춘 것입니다. 화면이 달라질 때마다 DTO와 쿼리를 따로 만들어야 한다는 것이 단점입니다.');
    } else {
      if (teamQ) sum.push('목록은 한 번 조회했는데 팀을 읽는 SELECT가 팀 수만큼 더 나갔습니다. N+1 문제입니다. 엔티티로 조회한 뒤 연관된 값을 DTO에 담을 때 자주 생깁니다.');
      if (c.how === 'fetch') sum.push('fetch join을 쓰면 SELECT는 한 번으로 줄지만, 회원과 팀의 컬럼을 모두 읽습니다(8개).' + (c.team ? ' DTO에 담는 값은 3개뿐입니다.' : ' 팀은 DTO에 담지도 않으므로 이 경우에는 필요 없는 조인입니다.'));
      else if (!teamQ) sum.push('엔티티로 조회하면 쓰지 않는 컬럼까지 모두 읽습니다. 컬럼이 수십 개이거나 긴 글이 든 컬럼이 있으면 차이가 커집니다.');
      sum.push(c.mod ? '조회한 엔티티는 영속성 컨텍스트가 관리하므로, 값을 바꾸면 커밋할 때 UPDATE가 나갑니다(변경 감지). 수정이 목적일 때는 이 방식이 맞습니다.' : '조회한 엔티티는 영속성 컨텍스트가 관리합니다. 값을 바꾸면 커밋할 때 UPDATE가 나가므로, 수정이 목적일 때는 이 방식이 맞습니다. 보여 주기만 할 때는 스냅샷을 만들고 비교하는 일이 낭비가 됩니다.');
    }
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 조회부터 커밋까지 한 단계씩 진행합니다.'); return; }
    H.counters(v, [[s.cols + '개', '첫 SELECT의 컬럼'], [s.managed + '개', '관리 중인 엔티티']]);
    H.table(v, ['#', 'DB로 나간 SQL', '이유'], s.sqls.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i === s.sqls.length - 1 ? 'hot' : '' }, q.why] }; }), 'SQL 로그');
  },
  // 그림: 왼쪽에 DB, 가운데에 영속성 컨텍스트(관리 중인 엔티티), 오른쪽에 DTO 목록. 엔티티 조회는 가운데를 거치고, DTO 조회는 DB에서 DTO로 바로 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1];
    var s = last ? last.snap : { members: [], teams: [], dtos: [], sel: 0, upd: 0, cols: 0, managed: 0, dbName: '김철수', arrow: '', sql: '' };
    P.size(680, 324);
    P.region('db', 16, 16, 176, 236, 'DB');
    P.box('tm', 26, 48, 156, 46, { cls: s.dbName === '김영수' ? 'hot' : 'plain', title: 'member 테이블', sub: 'id 1의 이름: ' + s.dbName });
    P.box('tt', 26, 102, 156, 46, { cls: 'plain', title: 'team 테이블', sub: '개발팀, 운영팀' });
    P.box('sel', 26, 166, 156, 30, { cls: s.sel > 1 ? 'bad' : s.sel ? 'good' : 'ghost', title: 'SELECT', right: s.sel + '번' });
    P.box('upd', 26, 204, 156, 30, { cls: s.upd ? 'hot' : 'ghost', title: 'UPDATE', right: s.upd + '번' });
    P.region('pc', 202, 16, 256, 236, '영속성 컨텍스트 (관리 중인 엔티티)');
    if (c.how === 'dto') P.box('none', 212, 110, 236, 44, { cls: 'ghost', title: '비어 있음', sub: '엔티티를 만들지 않음', center: true });
    else if (!s.members.length) P.box('none', 212, 110, 236, 44, { cls: 'ghost', title: '비어 있음', sub: '아직 조회 전', center: true });
    s.members.forEach(function (m, i) { P.box('m' + i, 212, 48 + i * 34, 150, 28, { cls: m.cls, title: '회원 ' + (i + 1), right: m.name }); });
    s.teams.forEach(function (tm, i) { P.box('t' + i, 370, 48 + i * 68, 80, 28, { cls: tm.loaded ? 'good' : 'ghost', title: tm.loaded ? tm.name : '팀 ' + (i + 1), center: true }); });
    P.region('dto', 468, 16, 196, 236, 'DTO 목록 (내보낼 값)');
    if (!s.dtos.length) P.box('nodto', 478, 110, 176, 44, { cls: 'ghost', title: '아직 없음', center: true });
    s.dtos.forEach(function (d, i) { P.box('d' + i, 478, 48 + i * 34, 176, 28, { cls: d.cls, title: d.t, right: d.r }); });
    if (s.arrow === 'in') P.arrow('a1', 'db:r', 'pc:l', { cls: 'hot', label: 'SELECT ' + s.cols + '개 컬럼' });
    if (s.arrow === 'lazy') P.arrow('a1', 'db:r:0.4', 'pc:l:0.4', { cls: 'bad', label: 'SELECT 팀' });
    if (s.arrow === 'upd') P.arrow('a1', 'pc:l', 'db:r', { cls: 'hot', label: 'UPDATE' });
    if (s.arrow === 'conv' || s.arrow === 'lazy') P.arrow('a2', 'pc:r', 'dto:l', { cls: 'mut', label: '옮김' });
    if (s.arrow === 'direct') P.arrow('a1', 'db:r:0.08', 'dto:l:0.08', { cls: 'good', label: 'SELECT ' + s.cols + '개 컬럼 → DTO' });
    P.box('q', 16, 264, 648, 46, { cls: s.sql ? 'plain' : 'ghost', title: '마지막으로 DB에 나간 SQL', sub: s.sql || '아직 없음', mono: true });
    P.note('가운데 영역에 들어온 객체만 영속성 컨텍스트가 관리합니다. DTO는 오른쪽 영역에만 있으므로 바꿔도 DB에 반영되지 않습니다. 점선으로 된 팀은 아직 읽지 않은 것(프록시)입니다.');
  },
  assume: '열두 가지 조합을 이 PC의 Hibernate 7.4.5와 H2 데이터베이스에서 화면과 같은 구조의 코드로 실제 실행해, 나간 SELECT의 수와 대상 테이블, 첫 SELECT의 컬럼 수, 영속성 컨텍스트가 관리하는 엔티티의 수, 커밋할 때 나간 UPDATE의 수, DB에 남은 이름을 화면과 대조했습니다. 코드 전체가 하나의 트랜잭션(영속성 컨텍스트) 안에서 실행된다고 보았습니다. 화면의 SQL은 읽기 쉽게 줄인 것이고, 실제 문장의 모양과 컬럼 순서는 Hibernate 버전에 따라 다릅니다. fetch join에서 컬럼이 9개가 아니라 8개인 것은 Hibernate 7.4.5가 회원의 team_id를 따로 읽지 않았기 때문이며, 버전에 따라 달라질 수 있습니다. 팀을 읽는 추가 쿼리의 수는 아직 읽지 않은 서로 다른 팀의 수(이 예에서는 2)이고, 배치 크기 설정이 없을 때의 값입니다. JPA 표준은 new 뒤에 패키지 이름까지 포함한 클래스 이름을 적도록 정합니다. Hibernate 7.4.5에서 실행해 보니, createQuery에 결과 타입으로 MemberDto.class를 함께 넘기면 패키지 이름을 빼도 실행됐고, 결과 타입 없이 클래스 이름만 적으면 클래스를 찾지 못해 예외(SemanticException)가 났습니다. 패키지 이름을 빼도 되는 것은 표준이 보장하는 동작이 아닙니다. 스프링 데이터 JPA가 인터페이스나 record로 필요한 값만 받게 해 주는 기능(프로젝션)은 이 실습에서 다루지 않았습니다.',
});
