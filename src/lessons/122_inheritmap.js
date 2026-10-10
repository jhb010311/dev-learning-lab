Lab.register({
  id: 'inheritmap', nav: '상속 관계 매핑', cat: 'JPA', mode: 'step',
  title: '상속한 클래스는 테이블 몇 개에 어떻게 저장되나',
  intro: '자바에는 상속이 있지만 관계형 데이터베이스의 테이블에는 상속이 없습니다. 그래서 부모 Item과 자식 Book, Album, Movie를 테이블에 담는 방법을 골라야 합니다. JPA에는 세 가지 전략이 있고, 어느 것을 고르느냐에 따라 테이블의 수와 모양, 저장할 때의 INSERT 수, 조회할 때의 쿼리 모양이 달라집니다.',
  terms: ['상속 관계 매핑', '조인 전략(JOINED)', '단일 테이블 전략(SINGLE_TABLE)', '구현 클래스마다 테이블 전략(TABLE_PER_CLASS)', 'JOIN (INNER, OUTER)'],
  controls: [
    { id: 'st', label: '상속 매핑 전략', type: 'select', value: 'JOINED', options: [['JOINED', '조인 전략 (JOINED)'], ['SINGLE_TABLE', '단일 테이블 전략 (SINGLE_TABLE)'], ['TABLE_PER_CLASS', '구현 클래스마다 테이블 전략 (TABLE_PER_CLASS)']] },
    { id: 'op', label: '해 볼 일', type: 'select', value: 'save', options: [['save', 'Book 하나를 저장'], ['findc', '자식 타입으로 조회: em.find(Book.class, 1L)'], ['findp', '부모 타입으로 조회: em.find(Item.class, 1L)']] },
    { id: 'kids', label: '자식 클래스의 수', type: 'range', min: 1, max: 3, value: 3, step: 1, fmt: function (v) { return v + '개'; }, hint: '1개면 Book만, 2개면 Book과 Album, 3개면 Movie까지 있습니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '조인 전략에서 Book 하나를 저장합니다. 객체는 하나인데 INSERT가 2번 나갑니다.', v: { st: 'JOINED', op: 'save', kids: 3 } },
    { t: '조인 전략: 부모 타입으로 조회', d: '어느 자식인지 모르므로 자식 테이블을 모두 조인합니다.', v: { st: 'JOINED', op: 'findp', kids: 3 } },
    { t: '단일 테이블 전략: 저장', d: '테이블 하나에 INSERT 한 번. 다른 자식의 컬럼은 null로 남습니다.', v: { st: 'SINGLE_TABLE', op: 'save', kids: 3 } },
    { t: '단일 테이블 전략: 부모 타입으로 조회', d: '조인 없이 한 테이블만 읽습니다.', v: { st: 'SINGLE_TABLE', op: 'findp', kids: 3 } },
    { t: '구현 클래스마다 테이블: 저장', d: '부모 테이블이 없고 자식 테이블에 INSERT 한 번입니다.', v: { st: 'TABLE_PER_CLASS', op: 'save', kids: 3 } },
    { t: '구현 클래스마다 테이블: 부모 타입으로 조회', d: '자식 테이블을 모두 UNION으로 합쳐서 찾습니다.', v: { st: 'TABLE_PER_CLASS', op: 'findp', kids: 3 } },
    { t: '조인 전략: 자식 타입으로 조회', d: '자식 테이블과 부모 테이블 둘만 조인합니다.', v: { st: 'JOINED', op: 'findc', kids: 3 } },
  ],
  KIDS: [['Book', 'author'], ['Album', 'artist'], ['Movie', 'actor']],
  // 전략과 자식 수에 따라 만들어지는 테이블: [{ name, cols }]
  tablesOf: function (st, kids) {
    var ks = this.KIDS.slice(0, kids);
    if (st === 'JOINED') return [{ name: 'item', cols: ['id', 'name', 'price'] }].concat(ks.map(function (k) { return { name: k[0].toLowerCase(), cols: ['id', k[1]] }; }));
    if (st === 'SINGLE_TABLE') return [{ name: 'item', cols: ['dtype', 'id', 'name', 'price'].concat(ks.map(function (k) { return k[1]; })) }];
    return ks.map(function (k) { return { name: k[0].toLowerCase(), cols: ['id', 'name', 'price', k[1]] }; });
  },
  code: function (c) {
    var ks = this.KIDS.slice(0, +c.kids);
    var s = '@Entity\n@Inheritance(strategy = InheritanceType.' + c.st + ')\nabstract class Item {\n    @Id\n    Long id;\n    String name;\n    int price;\n}\n';
    ks.forEach(function (k) { s += '\n@Entity\nclass ' + k[0] + ' extends Item {\n    String ' + k[1] + ';\n}\n'; });
    s += '// 생성자는 줄였습니다\n\n';
    if (c.op === 'save') return s + '// 트랜잭션 안에서\nBook book = new Book(1L, "자바책", 20000, "김저자");\nem.persist(book);\n// 트랜잭션 커밋';
    return s + '// id 1인 Book이 저장돼 있습니다\n' + (c.op === 'findc' ? 'Book book = em.find(Book.class, 1L);        // 자식 타입으로 조회' : 'Item item = em.find(Item.class, 1L);        // 부모 타입으로 조회');
  },
  label: function (c) { return { JOINED: '조인 전략', SINGLE_TABLE: '단일 테이블', TABLE_PER_CLASS: '구현 클래스마다 테이블' }[c.st] + ' · ' + { save: 'Book 저장', findc: 'Book으로 조회', findp: 'Item으로 조회' }[c.op] + ' · 자식 ' + (+c.kids) + '개'; },
  columns: ['만들어진 테이블', '나간 SQL', '읽거나 쓴 테이블', '조인 / UNION'],
  simulate: function (c) {
    var st = c.st, op = c.op, kids = +c.kids, ks = this.KIDS.slice(0, kids), tables = this.tablesOf(st, kids), ev = [], sum = [];
    var kidNames = ks.map(function (k) { return k[0].toLowerCase(); }), others = kidNames.slice(1);
    // Book 한 건이 저장됐을 때 각 테이블의 행
    var full = {};
    tables.forEach(function (t) { full[t.name] = []; });
    if (st === 'JOINED') { full.item = [['1', '자바책', '20000']]; full.book = [['1', '김저자']]; }
    if (st === 'SINGLE_TABLE') full.item = [['Book', '1', '자바책', '20000', '김저자'].concat(others.map(function () { return 'null'; }))];
    if (st === 'TABLE_PER_CLASS') full.book = [['1', '자바책', '20000', '김저자']];
    var s = { line: -2, obj: '', rows: {}, sent: [], hot: [], how: '', found: '' };
    tables.forEach(function (t) { s.rows[t.name] = op === 'save' ? [] : full[t.name]; });
    var init = JSON.parse(JSON.stringify(s));
    function push(line, text, k) { s.line = line; ev.push({ s: text, k: k, snap: JSON.parse(JSON.stringify(s)) }); }
    function send(kind, tbls, sql, when) { s.sent.push({ kind: kind, tables: tbls, sql: sql, at: when }); s.hot = tbls; }
    var touched = [], joins = 0, innerJoins = 0, unions = 0, dtypeInWhere = false, L, before = '-';
    var names = tables.map(function (t) { return t.name; });

    if (op === 'save') {
      L = ['Book book = new Book(1L, "자바책", 20000, "김저자");', 'em.persist(book);'];
      s.obj = 'new';
      push(0, 'new Book(1L, "자바책", 20000, "김저자"): Book 객체 하나를 만듭니다. 부모 Item에게서 물려받은 id, name, price와 Book이 선언한 author가 한 객체 안에 함께 들어 있습니다.', '');
      s.obj = 'managed';
      push(1, 'em.persist(book): 영속성 컨텍스트에 보관합니다. id를 코드에서 직접 넣었으므로 DB에 물어볼 것이 없어서, INSERT는 바로 나가지 않고 커밋 때까지 미뤄집니다.', '');
      before = '0';
      if (st === 'JOINED') {
        s.rows.item = full.item; send('insert', ['item'], "insert into item (id, name, price) values (1, '자바책', 20000)", '커밋 직전');
        push(-1, '트랜잭션 커밋, 첫 번째 INSERT: 조인 전략에서는 부모의 필드(id, name, price)가 부모 테이블 item에 들어갑니다. 먼저 item에 한 행을 넣습니다.', '');
        s.rows.book = full.book; send('insert', ['book'], "insert into book (id, author) values (1, '김저자')", '커밋 직전');
        push(-1, '두 번째 INSERT: Book만의 필드(author)는 자식 테이블 book에 들어갑니다. book의 id는 기본 키이면서 item의 id를 가리키는 외래 키입니다. 객체 하나를 저장하는 데 INSERT가 2번 나갔습니다.', 'bad');
        touched = ['item', 'book'];
        sum.push('조인 전략은 부모 테이블과 자식 테이블을 따로 만들고, 객체 하나를 두 테이블에 나눠 담습니다. 같은 값을 두 번 적지 않고 빈 칸도 없어서 테이블이 깔끔하지만, 저장할 때 INSERT가 2번 나갑니다.');
      } else if (st === 'SINGLE_TABLE') {
        s.rows.item = full.item; send('insert', ['item'], "insert into item (dtype, id, name, price, author) values ('Book', 1, '자바책', 20000, '김저자')", '커밋 직전');
        push(-1, '트랜잭션 커밋, INSERT: 단일 테이블 전략에는 item 테이블 하나뿐입니다. 한 행에 모든 필드를 넣고, 이 행이 어느 자식인지 구분 컬럼 dtype에 "Book"이라고 적습니다.' + (others.length ? ' 다른 자식의 컬럼(' + ks.slice(1).map(function (k) { return k[1]; }).join(', ') + ')은 넣을 값이 없어서 null로 남습니다.' : ''), others.length ? '' : 'good');
        touched = ['item'];
        sum.push('단일 테이블 전략은 INSERT 한 번으로 끝납니다. ' + (others.length ? '대신 한 테이블에 모든 자식의 컬럼이 다 들어 있어서, 자기 것이 아닌 컬럼은 null이 됩니다. 그래서 자식의 컬럼은 null을 허용해야 합니다.' : '지금은 자식이 Book 하나뿐이어서 빈 칸이 없습니다. 자식 클래스의 수를 늘리면 다른 자식의 컬럼이 null로 남는 것을 볼 수 있습니다.'));
      } else {
        s.rows.book = full.book; send('insert', ['book'], "insert into book (id, name, price, author) values (1, '자바책', 20000, '김저자')", '커밋 직전');
        push(-1, '트랜잭션 커밋, INSERT: 이 전략에는 부모 테이블 item이 없습니다. 자식 테이블 book이 부모의 필드(id, name, price)까지 모두 컬럼으로 가지고 있어서, book에 한 행만 넣으면 됩니다.', 'good');
        touched = ['book'];
        sum.push('구현 클래스마다 테이블 전략은 자식 테이블만 만들고, 부모의 컬럼을 자식 테이블마다 되풀이해 넣습니다. 저장은 INSERT 한 번으로 끝납니다. 이 전략의 약점은 부모 타입으로 조회할 때 드러납니다.');
      }
    } else if (op === 'findc') {
      L = ['Book book = em.find(Book.class, 1L);'];
      if (st === 'JOINED') {
        push(0, 'em.find(Book.class, 1L): Book 객체를 채우려면 id, name, price, author가 모두 필요합니다. 조인 전략에서는 앞의 셋이 item 테이블에, author가 book 테이블에 나뉘어 있습니다.', '');
        send('select', ['book', 'item'], 'select b.id, i.name, i.price, b.author from book b join item i on b.id = i.id where b.id = 1', '1번째 줄'); s.how = 'join'; s.found = 'Book';
        push(0, 'SELECT 한 번: book과 item을 id로 조인해서 한 번에 읽습니다. 다른 자식 테이블은 볼 필요가 없으므로 조인은 1번입니다. Book 객체가 만들어집니다.', '');
        touched = ['book', 'item']; joins = 1; innerJoins = 1;
        sum.push('조인 전략에서 자식 타입으로 조회하면 그 자식 테이블과 부모 테이블 둘만 조인합니다. 자식 클래스가 몇 개든 조인은 1번입니다.');
      } else if (st === 'SINGLE_TABLE') {
        push(0, 'em.find(Book.class, 1L): 단일 테이블 전략에서는 Book의 필드가 모두 item 테이블 한 곳에 있습니다. 다만 이 테이블에는 다른 자식의 행도 섞여 있을 수 있습니다.', '');
        send('select', ['item'], "select id, name, price, author from item where dtype = 'Book' and id = 1", '1번째 줄'); s.how = 'one'; s.found = 'Book';
        push(0, 'SELECT 한 번: item 테이블만 읽습니다. 조인이 없습니다. id 조건에 더해 구분 컬럼 조건(dtype이 "Book")이 붙어서, id가 1이어도 Book이 아닌 행은 걸러집니다.', 'good');
        touched = ['item']; dtypeInWhere = true;
        sum.push('단일 테이블 전략은 조인 없이 테이블 하나만 읽습니다. 자식 타입으로 조회할 때는 구분 컬럼(dtype) 조건으로 그 자식의 행만 고릅니다.');
      } else {
        push(0, 'em.find(Book.class, 1L): 이 전략에서는 Book의 필드가 부모에게서 물려받은 것까지 모두 book 테이블 한 곳에 있습니다.', '');
        send('select', ['book'], 'select id, name, price, author from book where id = 1', '1번째 줄'); s.how = 'one'; s.found = 'Book';
        push(0, 'SELECT 한 번: book 테이블만 읽습니다. 조인도 구분 컬럼도 필요 없습니다.', 'good');
        touched = ['book'];
        sum.push('구현 클래스마다 테이블 전략에서 자식 타입으로 조회하면 그 자식의 테이블 하나만 읽으면 됩니다. 조인도 구분 컬럼 조건도 없는 단순한 쿼리입니다.');
      }
    } else {
      L = ['Item item = em.find(Item.class, 1L);'];
      var kidClasses = ks.map(function (k) { return k[0]; }).join(', ');
      push(0, kids > 1 ? 'em.find(Item.class, 1L): Item은 추상 클래스이므로 실제 객체는 자식(' + kidClasses + ') 가운데 하나입니다. 그런데 id가 1인 것이 어느 자식인지 JPA는 아직 모릅니다.' : 'em.find(Item.class, 1L): Item은 추상 클래스이므로 실제 객체는 자식 클래스의 객체입니다. 지금은 자식이 Book 하나뿐입니다.', '');
      if (st === 'JOINED') {
        send('select', ['item'].concat(kidNames), 'select i.*, ' + kidNames.map(function (k) { return k.charAt(0) + '.*'; }).join(', ') + ' from item i ' + kidNames.map(function (k) { return 'left join ' + k + ' ' + k.charAt(0) + ' on i.id = ' + k.charAt(0) + '.id'; }).join(' ') + ' where i.id = 1', '1번째 줄'); s.how = 'join';
        push(0, kids > 1 ? 'SELECT 한 번: 어느 자식인지 모르므로 item에 자식 테이블 ' + kids + '개를 모두 left join으로 붙여서 읽습니다. 조인이 ' + kids + '번입니다.' : 'SELECT 한 번: item에 자식 테이블 book을 left join으로 붙여서 읽습니다. 조인이 1번입니다. 자식 클래스가 늘어나면 그 수만큼 조인도 늘어납니다.', kids > 1 ? 'bad' : '');
        s.found = 'Book';
        push(0, '결과 확인: 자식 테이블 가운데 book 쪽에만 id 1인 행이 붙어 왔습니다. 그것을 보고 Book 객체를 만들어 돌려줍니다. 변수의 타입은 Item이지만 실제 객체는 Book입니다.', '');
        touched = ['item'].concat(kidNames); joins = kids;
        sum.push('조인 전략에서 부모 타입으로 조회하면 자식 테이블을 전부 조인합니다. 자식 클래스가 ' + kids + '개이므로 조인이 ' + kids + '번입니다. 자식 클래스가 늘어나면 조인도 그만큼 늘어납니다.');
      } else if (st === 'SINGLE_TABLE') {
        send('select', ['item'], 'select * from item where id = 1', '1번째 줄'); s.how = 'one';
        push(0, 'SELECT 한 번: item 테이블 하나에 모든 자식이 들어 있으므로 id 조건만으로 읽습니다. 조인이 없고, 구분 컬럼 조건도 붙지 않습니다.', 'good');
        s.found = 'Book';
        push(0, '결과 확인: 읽어 온 행의 dtype이 "Book"입니다. 그것을 보고 Book 객체를 만들어 돌려줍니다. 변수의 타입은 Item이지만 실제 객체는 Book입니다.', '');
        touched = ['item'];
        sum.push('단일 테이블 전략은 부모 타입으로 조회해도 테이블 하나만 읽습니다. 어느 자식인지는 읽어 온 행의 구분 컬럼(dtype)으로 알아냅니다. 자식 클래스가 여럿일 때 부모 타입 조회에 조인도 UNION도 필요 없는 전략은 이것뿐입니다.');
      } else {
        unions = kids - 1;
        send('select', kidNames, 'select * from (' + kidNames.map(function (k) { return 'select ... from ' + k; }).join(' union all ') + ') where id = 1', '1번째 줄'); s.how = kids > 1 ? 'union' : 'one';
        push(0, kids > 1 ? 'SELECT 한 번: 부모 테이블이 없으므로 id 1이 어느 자식 테이블에 있는지 알 방법이 없습니다. 자식 테이블 ' + kids + '개를 UNION ALL로 모두 이어 붙인 뒤 그 안에서 id 1을 찾습니다.' : 'SELECT 한 번: 자식이 Book 하나뿐이어서 book 테이블만 읽으면 됩니다. 자식 클래스가 둘 이상이면 자식 테이블을 UNION ALL로 모두 이어 붙여야 합니다.', kids > 1 ? 'bad' : '');
        s.found = 'Book';
        push(0, '결과 확인: ' + (kids > 1 ? '이어 붙인 결과 가운데 book에서 온 행이 id 1입니다. ' : '') + 'Book 객체를 만들어 돌려줍니다. 변수의 타입은 Item이지만 실제 객체는 Book입니다.', '');
        touched = kidNames;
        sum.push(kids > 1 ? '구현 클래스마다 테이블 전략에서 부모 타입으로 조회하면 자식 테이블 ' + kids + '개를 UNION ALL로 합쳐야 합니다. 자식 클래스가 늘어나면 합쳐야 할 테이블도 그만큼 늘어납니다. 부모 타입으로 조회할 일이 있다면 이 전략은 피하는 편이 좋습니다.' : '자식 클래스가 하나뿐이면 UNION이 필요 없습니다. 자식 클래스의 수를 2개 이상으로 올려 보세요.');
      }
    }
    var kindText = op === 'save' ? 'INSERT ' + s.sent.length + '번' : 'SELECT ' + s.sent.length + '번';
    var shapeText = op === 'save' ? '해당 없음' : joins ? '조인 ' + joins + '번' : unions ? 'UNION ALL ' + unions + '번 (테이블 ' + kids + '개)' : '없음';
    sum.unshift('테이블은 ' + names.length + '개(' + names.join(', ') + ')가 만들어집니다. 나간 SQL은 ' + kindText + '이고, ' + (op === 'save' ? '행이 들어간' : '읽은') + ' 테이블은 ' + touched.join(', ') + '입니다.' + (op === 'save' ? '' : ' 돌려받은 객체의 실제 타입은 Book입니다.'));
    return { events: ev, summary: sum, L: L, init: init, tables: tables, sent: s.sent, before: before, touched: touched, joins: joins, innerJoins: innerJoins, unions: unions, dtypeInWhere: dtypeInWhere, found: op === 'save' ? '-' : 'Book', rows: full, kidList: ks, fks: st === 'JOINED' ? kidNames.map(function (k) { return [k, 'id', 'item']; }) : [],
      row: [names.join(', ') + ' (' + names.length + '개' + (st === 'SINGLE_TABLE' ? ', 컬럼 ' + tables[0].cols.length + '개' : '') + ')', kindText, touched.join(', '), shapeText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : sim.init, c = sim.c;
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }).concat(c.op === 'save' ? [{ cells: ['', { v: '(트랜잭션 커밋)', cls: s.line === -1 ? 'hot' : '' }, s.line === -1 ? '← 지금' : ''] }] : []), '실행 중인 코드');
    H.counters(v, [[sim.tables.length, '만들어진 테이블'], [s.sent.length, 'DB로 나간 SQL'], [s.found || '?', c.op === 'save' ? '조회한 객체 (해당 없음)' : '돌려받은 객체의 타입']].slice(0, c.op === 'save' ? 2 : 3));
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 시점'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'DB로 나간 SQL');
    sim.tables.forEach(function (tb) {
      var hot = s.hot.indexOf(tb.name) >= 0;
      H.table(v, tb.cols, (s.rows[tb.name] || []).map(function (r) { return { cells: r.map(function (x) { return x === 'null' ? { v: 'null', cls: 'bad' } : hot ? { v: x, cls: 'hot' } : x; }) }; }), 'DB의 ' + tb.name + ' 테이블' + (hot ? (c.op === 'save' ? ' (방금 INSERT)' : ' (이번 SELECT가 읽음)') : ''));
    });
  },
  // 그림: 위에는 자바의 상속(부모 Item과 자식들), 아래에는 그 전략으로 만들어진 테이블. SQL이 건드린 테이블이 노랗게 표시된다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : sim.init, c = sim.c, ks = sim.kidList, n = ks.length, st = c.st;
    P.size(680, 316);
    P.region('cl', 8, 8, 664, 104, '자바 클래스');
    P.box('c_item', 240, 28, 200, 26, { cls: 'plain', title: 'Item (id, name, price)', center: true });
    var cx = n === 1 ? [264] : n === 2 ? [150, 378] : [72, 264, 456];
    ks.forEach(function (k, i) {
      P.box('c_' + k[0], cx[i], 76, 152, 26, { cls: i === 0 && s.obj ? 'wait' : 'plain', title: k[0] + ' (' + k[1] + ')', center: true });
      P.arrow('ex_' + k[0], 'c_' + k[0] + ':t', 'c_item:b', { cls: 'mut' });
    });
    P.region('db', 8, 120, 664, 128, 'DB 테이블 · ' + { JOINED: '조인 전략', SINGLE_TABLE: '단일 테이블 전략', TABLE_PER_CLASS: '구현 클래스마다 테이블 전략' }[st]);
    var pos;
    if (st === 'SINGLE_TABLE') pos = [[110, 460]];
    else if (st === 'JOINED') pos = n === 1 ? [[150, 170], [360, 170]] : n === 2 ? [[60, 170], [255, 170], [450, 170]] : [[16, 156], [180, 156], [344, 156], [508, 156]];
    else pos = n === 1 ? [[234, 212]] : n === 2 ? [[110, 212], [358, 212]] : [[16, 212], [234, 212], [452, 212]];
    sim.tables.forEach(function (tb, i) {
      var rows = s.rows[tb.name] || [], hot = s.hot.indexOf(tb.name) >= 0;
      P.box('t_' + tb.name, pos[i][0], 152, pos[i][1], 82, { cls: hot ? 'hot' : rows.length ? 'plain' : 'ghost', title: tb.name + ' 테이블', sub: [tb.cols.join(' · ')].concat(rows.length ? rows.map(function (r) { return r.join(' · '); }) : ['(행 없음)']) });
    });
    var how = { join: '노란 테이블 ' + s.hot.length + '개를 id로 조인해서 읽음', union: '노란 테이블 ' + s.hot.length + '개를 UNION ALL로 합쳐서 읽음', one: '노란 테이블 하나만 읽음' }[s.how] || '';
    var ins = s.sent.filter(function (q) { return q.kind === 'insert'; }).length;
    P.box('res', 16, 258, 648, 38, c.op === 'save' ? { cls: ins > 1 ? 'bad' : ins ? 'good' : 'ghost', title: 'Book 하나를 저장할 때 나간 INSERT', right: ins + '번' } : { cls: !how ? 'ghost' : s.how === 'one' ? 'good' : s.hot.length > 2 ? 'bad' : 'plain', title: c.op === 'findc' ? 'em.find(Book.class, 1L)의 쿼리' : 'em.find(Item.class, 1L)의 쿼리', right: how || '아직 실행 전' });
    P.note('위쪽은 자바 클래스의 상속이고 아래쪽은 그것을 담으려고 만든 테이블입니다. 전략을 바꾸면 아래쪽 테이블의 수와 컬럼이 달라집니다. 노란 테이블은 이번 단계의 SQL이 행을 넣거나 읽은 곳입니다.');
  },
  assume: '부모 Item은 추상 클래스이고 자식은 필드를 하나씩만 가진다고 두었습니다. 기본 키는 코드에서 직접 넣었습니다. 구현 클래스마다 테이블 전략에서는 IDENTITY 전략을 쓸 수 없기 때문입니다(Hibernate 7.4.5에서 시작할 때 MappingException이 나는 것을 확인했습니다). 스물일곱 가지 조합(전략 세 가지, 해 볼 일 세 가지, 자식 클래스 1·2·3개) 모두를 Hibernate 7.4.5와 H2 데이터베이스에서 같은 구조의 코드로 실행해, 만들어진 테이블과 컬럼, 자식 테이블에서 부모 테이블로 가는 외래 키, 나간 SQL의 종류와 테이블별 횟수, 조회 쿼리가 읽은 테이블과 조인 수와 UNION 수, 구분 컬럼 조건이 붙는지, 돌려받은 객체의 타입, DB에 남은 행이 화면과 일치하는 것을 확인했습니다. Hibernate는 조인 전략과 구현 클래스마다 테이블 전략에서 대량 수정 쿼리에 쓸 임시 테이블(이름이 ht_, hte_로 시작)을 따로 만들어 두는데, 매핑과 상관없는 것이어서 화면에서는 뺐습니다. 조인 전략에 구분 컬럼(DTYPE)을 두지 않은 것은 Hibernate의 기본 동작이며, @DiscriminatorColumn을 붙이면 item 테이블에 dtype 컬럼이 생기는 것도 실행해서 확인했습니다. @Inheritance를 아예 적지 않으면 단일 테이블 전략과 같은 테이블이 만들어지는 것도 확인했습니다. 화면의 SQL 문장은 읽기 쉽게 줄여 쓴 것이어서 실제 문장과 글자가 같지는 않습니다. 실제 SQL에서는 조인 전략의 부모 타입 조회가 CASE 식으로, 구현 클래스마다 테이블 전략의 부모 타입 조회가 자식마다 붙인 번호로 어느 자식인지 구분합니다. 테이블 안의 컬럼 순서도 실제와 다를 수 있습니다.',
});
