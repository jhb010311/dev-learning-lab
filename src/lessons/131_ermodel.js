Lab.register({
  id: 'ermodel', nav: 'ER 모델링', cat: '데이터베이스', mode: 'step',
  title: '개체 사이의 관계를 테이블로 어떻게 옮기나',
  intro: '회원과 글(일대다), 글과 태그(다대다), 회원과 프로필(일대일)이라는 세 관계를 테이블로 옮깁니다. 관계마다 흔히 쓰는 설계와, 그럴듯해 보이지만 어긋나는 설계를 나란히 두었습니다. 양쪽에 같은 일(연결된 것 찾기, 하나 더 연결하기)을 시켜 보면 조회 결과가 달라집니다.',
  terms: ['ER 모델(개체, 속성, 관계)', '관계의 종류(일대일, 일대다, 다대다)', '연결 테이블', '기본 키, 유니크 키, 외래 키'],
  controls: [
    { id: 'design', label: '관계와 테이블 설계', type: 'select', value: 'm2m_csv', options: [['o2m_many', '일대다(회원-글): "다" 쪽인 글에 외래 키'], ['o2m_one', '일대다(회원-글): "일" 쪽인 회원에 외래 키'], ['m2m_link', '다대다(글-태그): 연결 테이블 post_tag'], ['m2m_csv', '다대다(글-태그): 쉼표로 이어 붙인 문자열 컬럼'], ['m2m_cols', '다대다(글-태그): tag1, tag2, tag3 컬럼'], ['o2o_uq', '일대일(회원-프로필): 외래 키 + 유니크'], ['o2o_fk', '일대일(회원-프로필): 외래 키만 (유니크 없음)']] },
    { id: 'task', label: '시켜 볼 일', type: 'select', value: 'find', options: [['find', '연결된 것 찾기'], ['add', '하나 더 연결하기']], hint: '일대일에서 "하나 더"는 들어가면 안 되는 두 번째 프로필을 넣어 보는 것입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '쉼표 문자열에서 java 태그를 찾습니다. javascript 글까지 나옵니다.', v: { design: 'm2m_csv', task: 'find' } },
    { t: '연결 테이블에서 찾기', d: 'java 태그가 붙은 글 2건만 정확히 나옵니다.', v: { design: 'm2m_link', task: 'find' } },
    { t: 'tag1~tag3에 네 번째 태그', d: '넣을 컬럼이 없어 오류가 납니다.', v: { design: 'm2m_cols', task: 'add' } },
    { t: '연결 테이블에 태그 하나 더', d: '연결 테이블에 행 하나를 넣으면 끝납니다.', v: { design: 'm2m_link', task: 'add' } },
    { t: '외래 키를 "일" 쪽에 두면', d: '회원이 쓴 글 2건 가운데 1건만 조회됩니다.', v: { design: 'o2m_one', task: 'find' } },
    { t: '일대일에 유니크가 없으면', d: '한 회원에 프로필이 2개 들어갑니다.', v: { design: 'o2o_fk', task: 'add' } },
    { t: '일대일에 유니크를 걸면', d: '두 번째 프로필이 오류 1062로 막힙니다.', v: { design: 'o2o_uq', task: 'add' } },
  ],
  // 설계별 테이블 정의(CREATE TABLE)와 처음 데이터. 모형과 화면의 INSERT 문이 같은 데이터에서 만들어진다.
  base: function (design) {
    var member = ['member', ['id', 'name'], [[1, '김철수'], [2, '이영희'], [3, '박민수']]], post = ['post', ['id', 'title'], [[1, '스프링 입문'], [2, '자바 기초'], [3, '화면 만들기']]];
    var cm = 'CREATE TABLE member (\n  id   INT PRIMARY KEY,\n  name VARCHAR(20) NOT NULL\n)', cp = 'CREATE TABLE post (\n  id    INT PRIMARY KEY,\n  title VARCHAR(50) NOT NULL\n)';
    if (design === 'o2m_many') return { rel: 'o2m', ddl: [cm, 'CREATE TABLE post (\n  id        INT PRIMARY KEY,\n  title     VARCHAR(50) NOT NULL,\n  member_id INT NOT NULL,\n  FOREIGN KEY (member_id) REFERENCES member (id)\n)'], t: [member, ['post', ['id', 'title', 'member_id'], [[1, '스프링 입문', 1], [2, '자바 기초', 1], [3, '화면 만들기', 2]]]] };
    if (design === 'o2m_one') return { rel: 'o2m', ddl: [cp, 'CREATE TABLE member (\n  id      INT PRIMARY KEY,\n  name    VARCHAR(20) NOT NULL,\n  post_id INT,\n  FOREIGN KEY (post_id) REFERENCES post (id)\n)'], t: [post, ['member', ['id', 'name', 'post_id'], [[1, '김철수', 1], [2, '이영희', 3], [3, '박민수', null]]]] };
    if (design === 'm2m_link') return { rel: 'm2m', ddl: [cp, 'CREATE TABLE tag (\n  id   INT PRIMARY KEY,\n  name VARCHAR(20) NOT NULL UNIQUE\n)', 'CREATE TABLE post_tag (\n  post_id INT NOT NULL,\n  tag_id  INT NOT NULL,\n  PRIMARY KEY (post_id, tag_id),\n  FOREIGN KEY (post_id) REFERENCES post (id),\n  FOREIGN KEY (tag_id) REFERENCES tag (id)\n)'], t: [post, ['tag', ['id', 'name'], [[1, 'java'], [2, 'spring'], [3, 'jpa'], [4, 'javascript'], [5, 'docker']]], ['post_tag', ['post_id', 'tag_id'], [[1, 1], [1, 2], [1, 3], [2, 1], [3, 4]]]] };
    if (design === 'm2m_csv') return { rel: 'm2m', ddl: ['CREATE TABLE post (\n  id    INT PRIMARY KEY,\n  title VARCHAR(50) NOT NULL,\n  tags  VARCHAR(100)\n)'], t: [['post', ['id', 'title', 'tags'], [[1, '스프링 입문', 'java,spring,jpa'], [2, '자바 기초', 'java'], [3, '화면 만들기', 'javascript']]]] };
    if (design === 'm2m_cols') return { rel: 'm2m', ddl: ['CREATE TABLE post (\n  id    INT PRIMARY KEY,\n  title VARCHAR(50) NOT NULL,\n  tag1  VARCHAR(20),\n  tag2  VARCHAR(20),\n  tag3  VARCHAR(20)\n)'], t: [['post', ['id', 'title', 'tag1', 'tag2', 'tag3'], [[1, '스프링 입문', 'java', 'spring', 'jpa'], [2, '자바 기초', 'java', null, null], [3, '화면 만들기', 'javascript', null, null]]]] };
    return { rel: 'o2o', ddl: [cm, 'CREATE TABLE profile (\n  id        INT PRIMARY KEY,\n  member_id INT NOT NULL' + (design === 'o2o_uq' ? ' UNIQUE' : '') + ',\n  bio       VARCHAR(50),\n  FOREIGN KEY (member_id) REFERENCES member (id)\n)'], t: [member, ['profile', ['id', 'member_id', 'bio'], [[1, 1, '백엔드 개발자'], [2, 2, '디자이너']]]] };
  },
  WRITE: {
    o2m_many: ["INSERT INTO post (id, title, member_id)\nVALUES (4, '도커 맛보기', 1)"],
    o2m_one: ["INSERT INTO post (id, title)\nVALUES (4, '도커 맛보기')", 'UPDATE member SET post_id = 4\n WHERE id = 1'],
    m2m_link: ['INSERT INTO post_tag (post_id, tag_id)\nVALUES (1, 5)'],
    m2m_csv: ["UPDATE post SET tags = CONCAT(tags, ',docker')\n WHERE id = 1"],
    m2m_cols: ["UPDATE post SET tag4 = 'docker'\n WHERE id = 1"],
    o2o_uq: ["INSERT INTO profile (id, member_id, bio)\nVALUES (3, 1, '두 번째 소개')"],
    o2o_fk: ["INSERT INTO profile (id, member_id, bio)\nVALUES (3, 1, '두 번째 소개')"],
  },
  // 조회: 일대다와 일대일은 찾기와 확인이 같은 조회이고, 다대다는 찾기(java가 붙은 글)와 확인(글 1의 태그)이 다르다
  QUERY: {
    o2m_many: ['SELECT id, title\n  FROM post\n WHERE member_id = 1\n ORDER BY id'],
    o2m_one: ['SELECT p.id, p.title\n  FROM member m\n  JOIN post p ON p.id = m.post_id\n WHERE m.id = 1\n ORDER BY p.id'],
    m2m_link: ["SELECT p.id, p.title\n  FROM post p\n  JOIN post_tag pt ON pt.post_id = p.id\n  JOIN tag t ON t.id = pt.tag_id\n WHERE t.name = 'java'\n ORDER BY p.id", 'SELECT t.name\n  FROM post_tag pt\n  JOIN tag t ON t.id = pt.tag_id\n WHERE pt.post_id = 1\n ORDER BY t.id'],
    m2m_csv: ["SELECT id, title\n  FROM post\n WHERE tags LIKE '%java%'\n ORDER BY id", 'SELECT tags\n  FROM post\n WHERE id = 1'],
    m2m_cols: ["SELECT id, title\n  FROM post\n WHERE tag1 = 'java'\n    OR tag2 = 'java'\n    OR tag3 = 'java'\n ORDER BY id", 'SELECT tag1, tag2, tag3\n  FROM post\n WHERE id = 1'],
    o2o_uq: ['SELECT id, bio\n  FROM profile\n WHERE member_id = 1\n ORDER BY id'],
    o2o_fk: ['SELECT id, bio\n  FROM profile\n WHERE member_id = 1\n ORDER BY id'],
  },
  // 이 관계에서 조회에 나와야 하는 것 (개념상의 정답)
  EXPECT: { o2m: { find: ['1', '2'], add: ['1', '2', '4'] }, m2m: { find: ['1', '2'], add: ['java', 'spring', 'jpa', 'docker'] }, o2o: { find: ['1'], add: ['1'] } },
  NOUN: { o2m: { find: '글', add: '글' }, m2m: { find: '글', add: '태그' }, o2o: { find: '프로필', add: '프로필' } },
  // 조회 결과의 행들에서 "연결된 것"의 목록을 뽑는다. 쉼표 문자열과 tag1~tag3은 한 행에서 여러 개를 꺼낸다.
  items: function (c, rows) {
    if (c.task === 'add' && c.design === 'm2m_csv') return rows.length ? String(rows[0][0]).split(',') : [];
    if (c.task === 'add' && c.design === 'm2m_cols') return rows.length ? rows[0].filter(function (x) { return x !== 'NULL'; }) : [];
    return rows.map(function (r) { return r[0]; });
  },
  query: function (c) { var q = this.QUERY[c.design]; return c.task === 'add' && q[1] ? q[1] : q[0]; },
  // 화면의 코드와 대조 프로그램(verify/mysql/ermodel_probe.js)이 함께 쓰는 SQL
  plan: function (c) {
    var b = this.base(c.design);
    function lit(x) { return x === null ? 'NULL' : typeof x === 'number' ? String(x) : "'" + x + "'"; }
    var seed = b.t.map(function (t) { return 'INSERT INTO ' + t[0] + ' (' + t[1].join(', ') + ') VALUES\n' + t[2].map(function (r) { return '  (' + r.map(lit).join(', ') + ')'; }).join(',\n'); });
    return { tables: b.t.map(function (t) { return { name: t[0], head: t[1] }; }), ddl: b.ddl, seed: seed, write: c.task === 'add' ? this.WRITE[c.design] : [], query: this.query(c) };
  },
  code: function (c) {
    var p = this.plan(c);
    return '-- 테이블\n' + p.ddl.join(';\n') + ';\n\n-- 처음 데이터\n' + p.seed.join(';\n') + ';\n' + (p.write.length ? '\n-- 하나 더 연결하기\n' + p.write.join(';\n') + ';\n' : '') + '\n-- ' + (c.task === 'find' ? '연결된 것 찾기' : '확인 조회') + '\n' + p.query + ';';
  },
  label: function (c) { return { o2m_many: '일대다 · 글에 외래 키', o2m_one: '일대다 · 회원에 외래 키', m2m_link: '다대다 · 연결 테이블', m2m_csv: '다대다 · 쉼표 문자열', m2m_cols: '다대다 · tag1~tag3', o2o_uq: '일대일 · 외래 키 + 유니크', o2o_fk: '일대일 · 외래 키만' }[c.design] + ' · ' + (c.task === 'find' ? '찾기' : '하나 더'); },
  columns: ['쓰기 문장의 결과', '조회된 행', '나와야 하는 것과 비교'],
  simulate: function (c) {
    var self = this, d = c.design, add = c.task === 'add', b = this.base(d), ev = [], sum = [], T = {}, hl = {}, wr = '', res = null;
    b.t.forEach(function (t) { T[t[0]] = t[2].map(function (r) { return r.slice(); }); });
    function nul(x) { return x === null ? 'NULL' : String(x); }
    function snap() { return { t: b.t.map(function (t) { return { name: t[0], head: t[1], rows: T[t[0]].map(function (r) { return r.map(nul); }) }; }), hl: JSON.parse(JSON.stringify(hl)), wr: wr, res: res ? JSON.parse(JSON.stringify(res)) : null }; }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    function flat(q) { return q.replace(/\s*\n\s*/g, ' '); }
    push({ o2m_many: 'CREATE TABLE, INSERT: 회원 한 명이 글을 여러 개 쓰는 일대다 관계입니다. "다" 쪽인 post 테이블에 member_id 컬럼(외래 키)을 두었습니다. 글 한 행이 자기를 쓴 회원 한 명을 가리킵니다. 김철수가 글 1과 2를, 이영희가 글 3을 썼습니다.',
      o2m_one: 'CREATE TABLE, INSERT: 회원 한 명이 글을 여러 개 쓰는 일대다 관계를, "일" 쪽인 member 테이블에 post_id 컬럼(외래 키)을 두어 옮기려 했습니다. 한 칸에는 값이 하나만 들어가므로 회원 한 행은 글을 하나만 가리킬 수 있습니다. 김철수는 글 1과 2를 썼지만 post_id에는 1만 적혔고, 글 2는 누가 썼는지 적을 곳이 없습니다.',
      m2m_link: 'CREATE TABLE, INSERT: 글 하나에 태그가 여러 개 붙고 태그 하나가 여러 글에 붙는 다대다 관계입니다. post와 tag 사이에 연결 테이블 post_tag를 두었습니다. "글 1에 java 태그가 붙어 있다"는 사실 하나가 post_tag의 행 하나 (1, 1)입니다.',
      m2m_csv: 'CREATE TABLE, INSERT: 글과 태그의 다대다 관계를 연결 테이블 없이, post 테이블의 tags 컬럼에 태그 이름을 쉼표로 이어 붙여 저장했습니다. DB가 보기에 tags는 글자들이 든 칸 하나일 뿐이고, 그 안에 태그가 몇 개 들어 있는지는 알지 못합니다.',
      m2m_cols: 'CREATE TABLE, INSERT: 글과 태그의 다대다 관계를 연결 테이블 없이, post 테이블에 tag1, tag2, tag3 컬럼을 두어 저장했습니다. 글 하나에 태그를 세 개까지만 적을 수 있고, 태그가 적은 글은 남는 칸이 NULL입니다.',
      o2o_uq: 'CREATE TABLE, INSERT: 회원 한 명에 프로필이 하나만 있는 일대일 관계입니다. profile 테이블에 member_id 외래 키를 두고 유니크 제약을 함께 걸었습니다. 같은 회원을 가리키는 프로필 행이 둘이 될 수 없습니다.',
      o2o_fk: 'CREATE TABLE, INSERT: 회원 한 명에 프로필이 하나만 있어야 하는 일대일 관계입니다. profile 테이블에 member_id 외래 키를 두었지만 유니크 제약은 걸지 않았습니다. 테이블의 모양은 일대다(회원 한 명에 프로필 여러 개)와 똑같습니다.' }[d], '');
    // 하나 더 연결하기
    var w = { err: null, affected: 0 };
    if (add) {
      if (d === 'o2m_many') { T.post.push([4, '도커 맛보기', 1]); w.affected = 1; hl.p4 = 'hot'; wr = '성공 (1행)'; push(flat(this.WRITE[d][0]) + ': 김철수가 쓴 새 글을 post에 넣습니다. 새 행의 member_id에 1을 적는 것으로 연결이 끝납니다. member 테이블은 건드리지 않습니다.', 'good'); }
      if (d === 'o2m_one') {
        T.post.push([4, '도커 맛보기']); hl.p4 = 'hot'; wr = '성공 (1행)'; push(flat(this.WRITE[d][0]) + ': 새 글을 post에 넣습니다. post에는 회원을 가리키는 칸이 없으므로, 누가 썼는지는 아직 어디에도 적히지 않았습니다.', '');
        T.member[0][2] = 4; w.affected = 1; hl.m1 = 'hot'; hl.p1 = 'bad'; push(flat(this.WRITE[d][1]) + ': 김철수의 post_id를 4로 바꿉니다. 칸이 하나뿐이므로 앞에 적혀 있던 1이 지워집니다. 글 1을 김철수가 썼다는 사실이 테이블에서 사라졌습니다.', 'bad');
      }
      if (d === 'm2m_link') { T.post_tag.push([1, 5]); w.affected = 1; hl.l1_5 = 'hot'; wr = '성공 (1행)'; push(flat(this.WRITE[d][0]) + ': 글 1에 docker 태그(id 5)를 붙입니다. 연결 테이블에 행 (1, 5) 하나를 넣는 것으로 끝납니다. post와 tag의 행은 바뀌지 않습니다.', 'good'); }
      if (d === 'm2m_csv') { T.post[0][2] = T.post[0][2] + ',docker'; w.affected = 1; hl.p1 = 'hot'; wr = '성공 (1행)'; push(flat(this.WRITE[d][0]) + ': 글 1의 tags 문자열 뒤에 ",docker"를 이어 붙입니다. 문자열을 통째로 새 값으로 바꿔 쓰는 것이며, DB는 붙인 글자가 태그인지, 이미 있는 태그인지 검사하지 않습니다.', ''); }
      if (d === 'm2m_cols') { w.err = { no: 1054, msg: "Unknown column 'tag4' in 'field list'" }; hl.x4 = 'bad'; wr = '오류 1054'; push(flat(this.WRITE[d][0]) + ': 글 1의 tag1, tag2, tag3이 모두 차 있어 네 번째 태그는 tag4에 넣어야 합니다. 그런 컬럼은 없으므로 오류 1054(' + w.err.msg + ')로 거부됩니다. 넣으려면 ALTER TABLE로 테이블의 모양부터 바꿔야 합니다.', 'bad'); }
      if (d === 'o2o_uq') { w.err = { no: 1062, msg: "Duplicate entry '1' for key 'profile.member_id'" }; wr = '오류 1062'; push(flat(this.WRITE[d][0]) + ': 회원 1을 가리키는 두 번째 프로필을 넣으려 합니다. member_id의 유니크 제약이 같은 값 1을 받지 않아 오류 1062(' + w.err.msg + ')로 거부됩니다.', 'good'); }
      if (d === 'o2o_fk') { T.profile.push([3, 1, '두 번째 소개']); w.affected = 1; wr = '성공 (1행)'; hl.f3 = 'bad'; push(flat(this.WRITE[d][0]) + ': 회원 1을 가리키는 두 번째 프로필을 넣으려 합니다. 외래 키는 "회원 1이 실제로 있는가"만 확인하므로 통과합니다. 1행이 들어갔습니다.', 'bad'); }
    }
    // 조회
    var rows = [], q = flat(this.query(c)), nounOf = this.NOUN[b.rel][c.task], want = this.EXPECT[b.rel][c.task];
    function finish(text, extra) {
      var items = self.items(c, rows), same = items.slice().sort().join('|') === want.slice().sort().join('|');
      res = { n: rows.length, items: items, same: same, text: rows.length + '행: ' + (items.length ? nounOf + ' ' + items.join(', ') : '없음') };
      push(q + ': ' + text + ' ' + (same ? '나와야 하는 것(' + nounOf + ' ' + want.join(', ') + ')과 같습니다.' : '나와야 하는 것은 ' + nounOf + ' ' + want.join(', ') + '인데 결과가 다릅니다.') + (extra ? ' ' + extra : ''), same ? 'good' : 'bad');
    }
    if (d === 'o2m_many') { rows = T.post.filter(function (p) { return p[2] === 1; }).map(function (p) { hl['p' + p[0]] = 'good'; return [nul(p[0]), p[1]]; }); finish('post에서 member_id가 1인 행을 고릅니다. ' + rows.length + '행이 나옵니다.', add ? '' : '김철수가 쓴 글 전부입니다.'); }
    if (d === 'o2m_one') { var pid = T.member[0][2]; rows = T.post.filter(function (p) { return p[0] === pid; }).map(function (p) { hl['p' + p[0]] = 'good'; return [nul(p[0]), p[1]]; }); finish('회원 1의 post_id가 가리키는 글을 가져옵니다. 칸이 하나이므로 언제나 많아야 1행입니다.', add ? '지금 테이블에서 김철수의 글이라고 알 수 있는 것은 글 4뿐입니다.' : '김철수가 글 2도 썼다는 사실은 테이블 어디에도 없으므로 어떤 조회로도 찾을 수 없습니다.'); }
    if (d === 'o2o_uq' || d === 'o2o_fk') { rows = T.profile.filter(function (f) { return f[1] === 1; }).map(function (f) { if (hl['f' + f[0]] !== 'bad') hl['f' + f[0]] = 'good'; return [nul(f[0]), f[2]]; }); finish('profile에서 member_id가 1인 행을 고릅니다. ' + rows.length + '행이 나옵니다.', rows.length > 1 ? '한 회원의 프로필이 두 개가 됐습니다. 일대일이 아니라 일대다가 된 것입니다.' : add ? '두 번째 프로필이 막혀 일대일이 지켜졌습니다.' : ''); }
    if (d === 'm2m_link' && !add) {
      var tg = T.tag.filter(function (t) { return t[1] === 'java'; })[0]; hl['t' + tg[0]] = 'hot';
      push("WHERE t.name = 'java': tag 테이블에서 이름이 java인 행을 찾습니다. id가 1인 행입니다. 태그는 tag 테이블의 행 하나이므로 이름 전체가 같은지로 비교합니다. javascript(id 4)는 다른 행입니다.", '');
      var lk = T.post_tag.filter(function (l) { return l[1] === tg[0]; }); lk.forEach(function (l) { hl['l' + l[0] + '_' + l[1]] = 'hot'; });
      push('JOIN post_tag: 연결 테이블에서 tag_id가 1인 행을 찾습니다. (1, 1)과 (2, 1), 2행입니다. 각각 "글 1에 java", "글 2에 java"라는 뜻입니다.', '');
      rows = lk.map(function (l) { var p = T.post.filter(function (x) { return x[0] === l[0]; })[0]; hl['p' + p[0]] = 'good'; return [nul(p[0]), p[1]]; });
      finish('찾은 연결 행의 post_id로 post의 행을 가져옵니다. 2행이 나옵니다.', '');
    }
    if (d === 'm2m_link' && add) { rows = T.post_tag.filter(function (l) { return l[0] === 1; }).map(function (l) { var t = T.tag.filter(function (x) { return x[0] === l[1]; })[0]; hl['t' + t[0]] = 'good'; return [t[1]]; }); finish('연결 테이블에서 post_id가 1인 행을 찾아 그 태그의 이름을 가져옵니다. 태그 하나가 한 행씩, 4행이 나옵니다.', ''); }
    if (d === 'm2m_csv' && !add) {
      T.post.forEach(function (p) {
        var hit = p[2].indexOf('java') >= 0, tags = p[2].split(','), real = tags.indexOf('java') >= 0;
        if (hit) rows.push([nul(p[0]), p[1]]);
        hl['p' + p[0]] = hit ? (real ? 'good' : 'bad') : '';
        push("글 " + p[0] + "의 tags '" + p[2] + "' LIKE '%java%': " + (hit ? (real ? '문자열 안에 java라는 글자가 있으므로 조건에 맞습니다. 이 글에는 실제로 java 태그가 붙어 있습니다.' : '문자열 안에 java라는 글자가 있으므로 조건에 맞습니다. 하지만 이 글의 태그는 javascript입니다. LIKE는 글자가 들어 있는지만 보고, 쉼표로 나눈 태그 하나와 같은지는 보지 않습니다.') : '문자열 안에 java라는 글자가 없으므로 조건에 맞지 않습니다.'), hit && !real ? 'bad' : '');
      });
      finish('조건에 맞은 글은 3행입니다.', 'java 태그가 붙지 않은 글 3이 섞여 나왔습니다.');
    }
    if (d === 'm2m_csv' && add) { rows = [[T.post[0][2]]]; hl.p1 = 'good'; finish('글 1의 tags를 읽습니다. 태그가 네 개인데 1행, 문자열 하나로 나옵니다. 태그를 하나씩 쓰려면 받은 쪽 프로그램이 쉼표로 잘라야 합니다.', ''); }
    if (d === 'm2m_cols' && !add) {
      T.post.forEach(function (p) { var k = [2, 3, 4].filter(function (i) { return p[i] === 'java'; })[0]; if (k) { rows.push([nul(p[0]), p[1]]); hl['p' + p[0]] = 'good'; hl['c' + p[0] + '_' + (k - 1)] = 'good'; } });
      finish('글마다 tag1, tag2, tag3 세 칸을 차례로 java와 비교해 하나라도 같으면 고릅니다. 값 전체가 같은지로 비교하므로 javascript는 걸리지 않습니다. 2행이 나옵니다.', '결과는 맞지만, 어느 칸에 들어 있을지 모르므로 컬럼 수만큼 OR을 적어야 합니다.');
    }
    if (d === 'm2m_cols' && add) { rows = [T.post[0].slice(2).map(nul)]; finish('글 1의 tag1, tag2, tag3을 읽습니다. 처음의 세 태그 그대로입니다.', 'docker 태그는 붙지 않았습니다.'); }
    var wres = !add ? '조회만 함' : w.err ? '오류 ' + w.err.no : '성공 (' + w.affected + '행)';
    sum.push({ o2m_many: add ? '글을 하나 더 쓰면 post에 행 하나를 넣으면 끝납니다. 회원이 글을 몇 개 쓰든 테이블의 모양은 그대로이고 행만 늘어납니다.' : '일대다의 외래 키는 "다" 쪽 테이블에 둡니다. 글 한 행에는 쓴 사람이 한 명뿐이라 칸 하나로 충분하고, 회원이 글을 몇 개 쓰든 post의 행이 늘어날 뿐입니다.',
      o2m_one: add ? '새 글을 연결하자 앞의 글과의 연결이 덮어써졌습니다. 칸이 하나뿐이라 "하나 더"가 아니라 "바꾸기"가 됩니다. 외래 키를 "다" 쪽인 글에 두면 이런 일이 없습니다.' : '외래 키를 "일" 쪽에 두면 한 칸에 값이 하나만 들어가므로 "여러 개"를 담을 수 없습니다. 그래서 일대다의 외래 키는 "다" 쪽 테이블에 둡니다.',
      m2m_link: add ? '태그를 하나 더 붙이는 것은 연결 테이블에 행 하나를 넣는 일입니다. 태그가 몇 개든 테이블의 모양은 바뀌지 않습니다. 기본 키 (post_id, tag_id)는 같은 태그를 두 번 붙이는 것을, 외래 키는 없는 태그를 붙이는 것을 막아 줍니다.' : '다대다는 테이블 두 개의 외래 키만으로는 옮길 수 없어서 가운데에 연결 테이블을 둡니다. 연결 테이블에서 보면 글과도 일대다, 태그와도 일대다입니다. 다대다 하나를 일대다 둘로 푼 것입니다.',
      m2m_csv: add ? '이어 붙이는 것 자체는 됩니다. 하지만 DB는 그 글자가 태그인지 모르므로, 같은 태그를 또 붙여도 없는 태그나 오타를 붙여도 막지 않습니다. 그리고 "연결된 것 찾기"에서 문제가 드러납니다.' : "한 칸에 값을 여러 개 넣으면 DB가 그 값을 하나씩 다루지 못합니다. LIKE로 java를 찾으면 javascript도 걸립니다. MySQL의 FIND_IN_SET('java', tags)을 쓰면 쉼표로 나눈 조각과 비교해 글 1과 2만 나오지만, 컬럼을 함수에 넣은 조건이라 tags에 인덱스가 있어도 쓰지 못하고 모든 행을 읽습니다.",
      m2m_cols: add ? '태그 수의 한계가 테이블의 모양에 박혀 있습니다. ALTER TABLE로 tag4를 추가하면, 태그를 찾는 모든 조회에 OR tag4 = ... 조건도 함께 더해야 합니다.' : '태그를 찾는 조건이 컬럼 수만큼 길어지고, 컬럼이 늘 때마다 이 조회를 쓰는 SQL을 모두 고쳐야 합니다.',
      o2o_uq: add ? '일대일은 일대다의 외래 키에 유니크 제약을 더한 것입니다. 유니크가 같은 회원을 가리키는 두 번째 행을 막아 주므로 "한 회원에 프로필 하나"가 지켜집니다.' : '일대일은 일대다의 외래 키에 유니크 제약을 더한 것입니다. 외래 키는 두 테이블 가운데 어느 쪽에 두어도 되고, 늘 함께 조회하는 정보라면 테이블 하나로 합치기도 합니다.',
      o2o_fk: add ? '유니크가 없으면 같은 회원을 가리키는 프로필이 두 개 들어갑니다. 테이블의 구조가 일대다와 같기 때문입니다. "회원의 프로필은 한 행"이라고 믿고 만든 프로그램이 여기서 틀어집니다.' : '조회만 해서는 유니크를 건 설계와 차이가 보이지 않습니다.' }[d]);
    var dump = {}; b.t.forEach(function (t) { dump[t[0]] = T[t[0]].map(function (r) { return r.map(nul); }); });
    return { events: ev, summary: sum, rel: b.rel, werr: w.err, rows: rows, same: res.same, dump: dump, row: [wres, res.text, res.same ? '같음' : '다름'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '조회 결과', s.res ? s.res.text + (s.res.same ? ' (나와야 하는 것과 같음)' : ' (나와야 하는 것과 다름)') : '아직 조회 전', !s.res ? 'none' : s.res.same ? 'good' : 'bad');
    var key = { member: 'm', post: 'p', tag: 't', profile: 'f' };
    s.t.forEach(function (tb) {
      H.table(v, tb.head, tb.rows.map(function (r) { var id = tb.name === 'post_tag' ? 'l' + r[0] + '_' + r[1] : key[tb.name] + r[0], k = s.hl[id]; return { cells: r.map(function (x) { return { v: x, cls: k === 'hot' ? 'hot' : k === 'good' ? 'good' : k === 'bad' ? 'bad' : '' }; }) }; }), tb.name + ' 테이블');
    });
    H.text(v, '노란 행은 방금 들어오거나 바뀐 행, 초록 행은 조회에 맞게 나온 행, 빨간 행은 문제가 있는 행입니다.');
  },
  // 그림: 테이블마다 영역 하나, 행마다 상자 하나. 화살표는 외래 키가 가리키는 행이다. 아래 두 칸은 쓰기 문장과 조회의 결과.
  draw: function (P, sim, shown) {
    var c = sim.c, d = c.design, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 304);
    var name = { o2m_many: ['member ("일" 쪽)', 'post ("다" 쪽, 외래 키 member_id)'], o2m_one: ['member ("일" 쪽, 외래 키 post_id)', 'post ("다" 쪽)'], o2o_uq: ['member', 'profile (외래 키 member_id + 유니크)'], o2o_fk: ['member', 'profile (외래 키 member_id)'] }[d];
    if (d === 'm2m_link') { P.region('r1', 16, 14, 206, 232, 'post'); P.region('r2', 237, 14, 206, 232, 'post_tag (연결 테이블)'); P.region('r3', 458, 14, 206, 232, 'tag'); }
    else if (d === 'm2m_csv') P.region('r1', 16, 14, 648, 232, 'post (tags 컬럼에 쉼표로 이어 붙임)');
    else if (d === 'm2m_cols') P.region('r1', 16, 14, 648, 232, 'post (tag1, tag2, tag3 컬럼)');
    else { P.region('r1', 16, 14, 280, 232, name[0]); P.region('r2', 364, 14, 300, 232, name[1]); }
    var wr = s ? s.wr : '', res = s ? s.res : null;
    P.box('wr', 16, 256, 230, 36, { cls: c.task === 'find' || !wr ? 'ghost' : /오류/.test(wr) ? 'wait' : 'hot', title: '쓰기 문장', right: c.task === 'find' ? '없음 (조회만)' : wr || '?' });
    P.box('res', 258, 256, 406, 36, { cls: !res ? 'ghost' : res.same ? 'good' : 'bad', title: '조회 결과', right: res ? res.text : '?' });
    if (!s) { P.text('hint', 340, 136, '실행을 누르면 시작합니다', { cls: 'mut', anchor: 'middle' }); return; }
    var T = {}; s.t.forEach(function (tb) { T[tb.name] = tb.rows; });
    function k(id, base) { var h = s.hl[id]; return h === 'hot' ? 'hot' : h === 'good' ? 'good' : h === 'bad' ? 'bad' : base; }
    function y(i) { return 46 + i * 32; }
    if (d === 'o2m_many' || d === 'o2o_uq' || d === 'o2o_fk') {
      var child = d === 'o2m_many' ? T.post : T.profile, pre = d === 'o2m_many' ? 'p' : 'f';
      T.member.forEach(function (m, i) { P.box('m' + m[0], 28, y(i), 256, 26, { cls: k('m' + m[0], 'wait'), title: '회원 ' + m[0] + ' ' + m[1] }); });
      child.forEach(function (r, i) {
        var mid = d === 'o2m_many' ? r[2] : r[1];
        P.box(pre + r[0], 376, y(i), 276, 26, { cls: k(pre + r[0], 'plain'), title: (d === 'o2m_many' ? '글 ' + r[0] + ' ' + r[1] : '프로필 ' + r[0]), right: 'member_id ' + mid });
        P.arrow('a' + pre + r[0], pre + r[0] + ':l', 'm' + mid + ':r', { cls: s.hl[pre + r[0]] === 'bad' ? 'bad' : 'mut' });
      });
    }
    if (d === 'o2m_one') {
      var used = {}; T.member.forEach(function (m) { if (m[2] !== 'NULL') used[m[2]] = 1; });
      T.member.forEach(function (m, i) { P.box('m' + m[0], 28, y(i), 256, 26, { cls: k('m' + m[0], 'wait'), title: '회원 ' + m[0] + ' ' + m[1], right: 'post_id ' + m[2] }); });
      T.post.forEach(function (p, i) { P.box('p' + p[0], 376, y(i), 276, 26, { cls: s.hl['p' + p[0]] === 'good' ? 'good' : used[p[0]] ? k('p' + p[0], 'plain') : 'bad', title: '글 ' + p[0] + ' ' + p[1], right: used[p[0]] ? '' : '쓴 회원을 알 수 없음' }); });
      T.member.forEach(function (m) { if (m[2] !== 'NULL') P.arrow('am' + m[0], 'm' + m[0] + ':r', 'p' + m[2] + ':l', { cls: s.hl['m' + m[0]] === 'hot' ? 'hot' : 'mut' }); });
    }
    if (d === 'm2m_link') {
      T.post.forEach(function (p, i) { P.box('p' + p[0], 28, y(i), 182, 26, { cls: k('p' + p[0], 'wait'), title: '글 ' + p[0] + ' ' + p[1] }); });
      T.tag.forEach(function (t, i) { P.box('t' + t[0], 470, y(i), 182, 26, { cls: k('t' + t[0], 'wait'), title: '태그 ' + t[0] + ' ' + t[1] }); });
      T.post_tag.forEach(function (l, i) {
        var id = 'l' + l[0] + '_' + l[1];
        P.box(id, 249, y(i), 182, 26, { cls: k(id, 'plain'), title: '(' + l[0] + ', ' + l[1] + ')', center: true });
        P.arrow('x' + id, id + ':l', 'p' + l[0] + ':r', { cls: s.hl[id] ? 'hot' : 'mut' }); P.arrow('z' + id, id + ':r', 't' + l[1] + ':l', { cls: s.hl[id] ? 'hot' : 'mut' });
      });
    }
    if (d === 'm2m_csv') T.post.forEach(function (p, i) { P.box('p' + p[0], 28, y(i), 624, 26, { cls: k('p' + p[0], 'plain'), title: '글 ' + p[0] + ' ' + p[1], right: "tags = '" + p[2] + "'" }); });
    if (d === 'm2m_cols') {
      T.post.forEach(function (p, i) {
        P.box('p' + p[0], 28, y(i), 200, 26, { cls: k('p' + p[0], 'wait'), title: '글 ' + p[0] + ' ' + p[1] });
        [2, 3, 4].forEach(function (j) { var id = 'c' + p[0] + '_' + (j - 1); P.box(id, 236 + (j - 2) * 106, y(i), 100, 26, { cls: p[j] === 'NULL' ? 'ghost' : k(id, 'plain'), title: p[j] === 'NULL' ? 'NULL' : p[j], center: true }); });
      });
      if (s.hl.x4) P.box('x4', 554, y(0), 98, 26, { cls: 'bad', title: 'tag4 없음', center: true });
    }
    P.note({ o2m_many: '화살표는 글의 member_id가 가리키는 회원입니다. 화살표는 "다" 쪽의 행에서 하나씩만 나가고, "일" 쪽의 행에는 여러 개가 모일 수 있습니다.', o2m_one: '화살표는 회원의 post_id가 가리키는 글입니다. 빨간 글은 쓴 회원을 테이블에서 알 수 없는 글입니다.', m2m_link: '가운데 연결 테이블의 행 하나가 "이 글에 이 태그가 붙어 있다"는 연결 하나입니다. 행마다 화살표가 글 쪽으로 하나, 태그 쪽으로 하나 나갑니다.', m2m_csv: '태그가 tags 칸 안의 글자로만 들어 있어 그릴 수 있는 화살표가 없습니다. 빨간 행은 조건에는 맞았지만 나오면 안 되는 글입니다.', m2m_cols: '글마다 태그를 적는 칸이 세 개로 정해져 있습니다. 점선 칸은 NULL로 비어 있는 칸입니다.', o2o_uq: '화살표는 프로필의 member_id가 가리키는 회원입니다. 유니크 제약 때문에 회원 한 명에게 화살표가 하나만 닿을 수 있습니다.', o2o_fk: '화살표는 프로필의 member_id가 가리키는 회원입니다. 유니크 제약이 없어 회원 한 명에게 화살표가 여러 개 닿을 수 있습니다.' }[d]);
  },
  assume: '회원 3명, 글 3개, 태그 5개의 작은 예입니다. 열네 가지 조합(설계 일곱 가지 × 시켜 볼 일 두 가지) 모두, 화면의 SQL을 실제 MySQL 8.4.11(InnoDB)에서 그대로 실행해 쓰기 문장의 오류 번호와 바뀐 행 수, 조회 결과의 모든 행, 끝난 뒤 각 테이블의 모든 행이 모형과 같은 것을 대조했습니다. "나와야 하는 것"은 이 예에서 정한 사실(김철수가 글 1과 2를 썼다, java 태그는 글 1과 2에 붙어 있다, 회원의 프로필은 하나다)이며 DB가 알려 주는 값이 아닙니다. 요약에 적은 다음 내용도 같은 MySQL에서 따로 실행해 확인했습니다. 쉼표 문자열에 FIND_IN_SET을 쓰면 글 1과 2만 나오는 것, tags에 인덱스를 만들고 행을 2,000개 넣어도 FIND_IN_SET 조건의 실행 계획은 인덱스로 찾지 않고 모든 행을 읽는 것(type이 ALL), 쉼표 문자열에는 이미 있는 태그를 또 붙여도 그대로 들어가는 것, 연결 테이블에서는 같은 연결을 한 번 더 넣으면 오류 1062로, 없는 태그를 연결하면 오류 1452로 거부되는 것입니다. LIKE가 javascript까지 찾는 것은 어느 DB에서나 같지만 FIND_IN_SET은 MySQL의 함수입니다. 오류 번호와 메시지도 MySQL의 것입니다. 일대다의 외래 키를 "일" 쪽에 두는 설계는 잘못을 보이려고 만든 예입니다. 일대일에서 외래 키를 어느 테이블에 둘지, 테이블을 합칠지는 조회 방식에 따라 정하는 설계 판단이며 이 실습은 그 비교까지는 다루지 않습니다. 정규화와 이상 현상은 "정규화" 실습에서 다룹니다.',
});
