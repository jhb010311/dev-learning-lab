Lab.register({
  id: 'jdbctmpl', nav: 'JdbcTemplate과 예외 변환', cat: '스프링', mode: 'step',
  title: 'JdbcTemplate은 무엇을 대신 해 주고, 예외를 무엇으로 바꾸나',
  intro: 'JDBC를 직접 쓰면 SQL 한 줄을 실행하려고 커넥션을 얻고, 닫고, SQLException을 처리하는 코드를 매번 써야 합니다. JdbcTemplate은 이 반복되는 일을 대신 하고, JDBC 드라이버가 던진 SQLException을 스프링의 예외(DataAccessException 계열)로 바꿔 줍니다.',
  terms: ['JdbcTemplate', '예외 변환과 DataAccessException', '커넥션 풀', 'Checked 예외와 Unchecked 예외', '템플릿 메서드 패턴'],
  controls: [
    { id: 'how', label: 'DB에 접근하는 방식', type: 'select', value: 'plain', options: [['plain', 'JDBC 직접: close()를 마지막 줄에서 호출'], ['twr', 'JDBC 직접: try-with-resources로 닫기'], ['tmpl', 'JdbcTemplate']] },
    { id: 'op', label: '실행할 작업', type: 'select', value: 'dup', options: [['one', '조회: 결과가 1건'], ['zero', '조회: 결과가 0건'], ['two', '조회: 결과가 2건'], ['dup', '추가: 이미 있는 id (기본 키 중복)'], ['nul', '추가: NOT NULL 컬럼에 null'], ['bad', '조회: SQL의 컬럼 이름에 오타']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'JDBC를 직접 쓰고 close는 마지막 줄에서 호출하는데 기본 키가 중복되는 id를 추가하면 무슨 일이 일어나나', d: 'JDBC를 직접 쓰고 close()를 마지막 줄에 뒀습니다. 예외가 나면 커넥션이 반납되지 않습니다.', v: { how: 'plain', op: 'dup' } },
    { t: 'try-with-resources로 닫으면', q: 'close를 마지막 줄에서 호출하는 대신 try-with-resources로 닫으면', d: '커넥션은 반납됩니다. 하지만 받는 것은 여전히 SQLException과 코드입니다.', v: { how: 'twr', op: 'dup' } },
    { t: 'JdbcTemplate으로 바꾸면', q: 'DB에 접근하는 방식을 JdbcTemplate으로 바꾸면', d: '코드가 한 줄이 되고, 예외는 DuplicateKeyException으로 바뀝니다.', v: { how: 'tmpl', op: 'dup' } },
    { t: 'SQL에 오타가 있으면', q: 'JdbcTemplate으로 바꾸고 SQL의 컬럼 이름에 오타가 있는 조회를 하면', d: 'BadSqlGrammarException으로 바뀝니다.', v: { how: 'tmpl', op: 'bad' } },
    { t: 'queryForObject의 결과가 0건', q: 'JdbcTemplate의 queryForObject로 결과가 0건인 조회를 하면', d: 'null이 아니라 예외가 나옵니다.', v: { how: 'tmpl', op: 'zero' } },
    { t: '결과가 2건인데 JDBC 직접', q: 'JDBC를 직접 쓰는 채로 결과가 2건인 조회를 하면', d: '첫 행만 돌려주고 2건이었다는 사실은 사라집니다.', v: { how: 'plain', op: 'two' } },
    { t: '결과가 2건인 queryForObject', q: '결과가 2건인 조회를 JdbcTemplate의 queryForObject로 하면', d: '바로 위와 비교해 보세요. 예외로 알려 줍니다.', v: { how: 'tmpl', op: 'two' } },
  ],
  code: function (c) {
    var q = c.op === 'one' || c.op === 'zero' || c.op === 'two' || c.op === 'bad', city = { one: '부산', zero: '제주', two: '서울', bad: '부산' }[c.op];
    var head = '// member 테이블 (id는 기본 키, name은 NOT NULL)\n//   (1, kim, 서울), (2, lee, 부산), (3, park, 서울)\n// 호출: ' + (q ? 'memberRepository.findName("' + city + '");' : c.op === 'dup' ? 'memberRepository.insert(1L, "choi", "대전");' : 'memberRepository.insert(4L, null, "대전");') + '\n\n';
    var sql = q ? '"select ' + (c.op === 'bad' ? 'nmae' : 'name') + ' from member where city = ? order by id"' : '"insert into member(id, name, city) values (?, ?, ?)"';
    if (c.how === 'tmpl') return head + (q ? 'public String findName(String city) {\n    return jdbcTemplate.queryForObject(\n        ' + sql + ',\n        String.class, city);\n}' : 'public int insert(Long id, String name, String city) {\n    return jdbcTemplate.update(\n        ' + sql + ',\n        id, name, city);\n}');
    if (c.how === 'plain') return head + (q ? 'public String findName(String city) throws SQLException {\n    Connection con = dataSource.getConnection();           // 커넥션 얻기\n    PreparedStatement ps = con.prepareStatement(\n        ' + sql + ');\n    ps.setString(1, city);\n    ResultSet rs = ps.executeQuery();                       // SQL 실행\n    String name = rs.next() ? rs.getString("name") : null;  // 결과 꺼내기\n    rs.close();\n    ps.close();\n    con.close();                                            // 커넥션 반납\n    return name;\n}'
      : 'public int insert(Long id, String name, String city) throws SQLException {\n    Connection con = dataSource.getConnection();           // 커넥션 얻기\n    PreparedStatement ps = con.prepareStatement(\n        ' + sql + ');\n    ps.setLong(1, id);\n    ps.setString(2, name);\n    ps.setString(3, city);\n    int rows = ps.executeUpdate();                          // SQL 실행\n    ps.close();\n    con.close();                                            // 커넥션 반납\n    return rows;\n}');
    return head + (q ? 'public String findName(String city) throws SQLException {\n    try (Connection con = dataSource.getConnection();      // 커넥션 얻기\n         PreparedStatement ps = con.prepareStatement(\n             ' + sql + ')) {\n        ps.setString(1, city);\n        try (ResultSet rs = ps.executeQuery()) {            // SQL 실행\n            return rs.next() ? rs.getString("name") : null; // 결과 꺼내기\n        }\n    }                                                       // 여기서 자동으로 닫힌다\n}'
      : 'public int insert(Long id, String name, String city) throws SQLException {\n    try (Connection con = dataSource.getConnection();      // 커넥션 얻기\n         PreparedStatement ps = con.prepareStatement(\n             ' + sql + ')) {\n        ps.setLong(1, id);\n        ps.setString(2, name);\n        ps.setString(3, city);\n        return ps.executeUpdate();                          // SQL 실행\n    }                                                       // 여기서 자동으로 닫힌다\n}');
  },
  label: function (c) { return { plain: 'JDBC 직접(마지막에 close)', twr: 'JDBC 직접(try-with-resources)', tmpl: 'JdbcTemplate' }[c.how] + ' · ' + { one: '조회 1건', zero: '조회 0건', two: '조회 2건', dup: '기본 키 중복', nul: 'NOT NULL 위반', bad: 'SQL 오타' }[c.op]; },
  columns: ['호출한 쪽이 받는 것', '예외의 종류', '커넥션'],
  simulate: function (c) {
    var raw = c.how !== 'tmpl', plain = c.how === 'plain', op = c.op, q = op === 'one' || op === 'zero' || op === 'two' || op === 'bad', ev = [], sum = [];
    var n = { one: 1, zero: 0, two: 2 }[op], city = { one: '부산', zero: '제주', two: '서울', bad: '부산' }[op];
    // DB가 내는 오류: SQLState, 무슨 오류인지, 스프링이 바꿔 주는 예외
    var err = { dup: ['23505', 'id 1인 행이 이미 있어 기본 키가 겹칩니다', 'DuplicateKeyException', '중복 키', '중복 키를'], nul: ['23502', 'name 컬럼은 NOT NULL인데 null을 넣으려 했습니다', 'DataIntegrityViolationException', '제약 조건 위반', '제약 조건 위반을'], bad: ['42S22', 'member 테이블에 nmae라는 컬럼이 없습니다', 'BadSqlGrammarException', '잘못된 SQL', '잘못된 SQL을'] }[op];
    var call = q ? 'findName("' + city + '")' : op === 'dup' ? 'insert(1L, "choi", "대전")' : 'insert(4L, null, "대전")';
    var steps = raw ? (q ? ['커넥션 얻기', 'SQL 실행', '결과 꺼내기', plain ? 'close() 호출' : '자동으로 닫기'] : ['커넥션 얻기', 'SQL 실행', plain ? 'close() 호출' : '자동으로 닫기']) : ['커넥션 얻기', 'SQL 실행', '닫기 (커넥션 반납)', err ? '예외 변환' : '결과 건수 확인'];
    var st = { con: '풀에 있음', db: '', at: -1, st: steps.map(function () { return ''; }), ex: '', caller: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function step(i, mark) { st.at = i; st.st[i] = mark; }
    var caller, kind, conn = '반납됨';
    push('memberRepository.' + call + ' 호출: ' + (raw ? 'JDBC를 직접 쓰는 메서드입니다. 커넥션을 얻는 일부터 닫는 일까지 모두 이 메서드 안에 직접 적었습니다.' : 'JdbcTemplate을 쓰는 메서드입니다. 직접 적은 것은 SQL과 넣을 값' + (q ? ', 그리고 결과로 받을 타입(String.class)' : '') + '뿐입니다.'));
    step(0, '끝남'); st.con = '빌려 쓰는 중';
    push((raw ? 'dataSource.getConnection(): ' : (q ? 'jdbcTemplate.queryForObject(...)' : 'jdbcTemplate.update(...)') + '의 안: ') + '커넥션 풀에서 커넥션 하나를 빌립니다. ' + (raw ? '빌린 커넥션은 다 쓴 뒤 반드시 닫아서(close) 풀에 돌려줘야 합니다.' : '이 일은 JdbcTemplate이 대신 합니다.'));
    if (!err) {
      step(1, '끝남'); st.db = n + '건을 돌려줌';
      push((raw ? 'ps.executeQuery(): ' : 'JdbcTemplate이 SQL을 실행: ') + '물음표 자리에 들어가는 값은 "' + city + '"입니다. city가 ' + city + '인 회원은 ' + (n ? n + '명이므로' : '없으므로') + ' DB가 ' + n + '건을 돌려줍니다. DB로서는 0건이든 2건이든 오류가 아닙니다.');
      if (raw) {
        step(2, n === 1 ? '끝남' : '주의');
        push('rs.next() ? rs.getString("name") : null: ' + (n === 0 ? '첫 행이 없으므로 rs.next()가 false이고, 결과는 null이 됩니다. 0건일 때 무엇을 돌려줄지도 직접 정해서 적은 것입니다.' : n === 1 ? '첫 행으로 가서 name 컬럼의 값 "lee"를 꺼냅니다.' : '첫 행으로 가서 name 컬럼의 값 "kim"을 꺼냅니다. 둘째 행(park)은 읽지 않습니다. 결과가 2건이었다는 사실은 어디에도 남지 않습니다.'), n === 2 ? 'bad' : '');
        step(3, '끝남'); st.con = '반납됨';
        push(plain ? 'rs.close(), ps.close(), con.close(): 세 가지를 직접 닫습니다. con.close()가 커넥션을 풀에 돌려줍니다.' : 'try 블록의 끝: 자바가 rs, ps, con의 close()를 자동으로 부릅니다. 커넥션이 풀에 돌아갑니다.', 'good');
        caller = n === 0 ? 'null' : n === 1 ? '"lee"' : '"kim"'; kind = '예외 없음';
        st.at = -1; st.caller = caller;
        push('호출한 쪽: ' + (n === 0 ? 'null을' : n === 1 ? '"lee"를' : '"kim"을') + ' 받습니다. ' + (n === 0 ? '받은 값이 null인지 확인하지 않고 쓰면 NullPointerException이 납니다.' : n === 2 ? '서울에 사는 회원이 둘인데 한 명의 이름만 받았고, 문제가 있다는 신호는 없습니다.' : '예외 없이 값을 받았습니다.'), n === 1 ? 'good' : 'bad');
      } else {
        step(2, '끝남'); st.con = '반납됨';
        push('JdbcTemplate이 결과를 읽고 닫기: 돌아온 행을 모두 읽은 뒤 ResultSet과 PreparedStatement를 닫고 커넥션을 풀에 돌려줍니다. 닫는 코드를 직접 쓰지 않았습니다.', 'good');
        if (n === 1) { step(3, '끝남'); caller = '"lee"'; kind = '예외 없음'; push('queryForObject가 결과 건수를 확인: queryForObject는 결과가 정확히 1건이어야 하는 메서드입니다. 1건이므로 그 값 "lee"를 돌려줍니다.', 'good'); }
        else {
          step(3, '예외'); caller = n === 0 ? 'EmptyResultDataAccessException' : 'IncorrectResultSizeDataAccessException'; kind = '언체크 예외'; st.ex = caller;
          push('queryForObject가 결과 건수를 확인: queryForObject는 결과가 정확히 1건이어야 하는 메서드입니다. ' + n + '건이므로 ' + caller + '을 던집니다. DB가 낸 오류가 아니라, 스프링이 건수를 보고 던지는 예외입니다.', 'bad');
        }
        st.at = -1; st.caller = caller;
        push('호출한 쪽: ' + (n === 1 ? '"lee"를 받습니다.' : caller + '을 받습니다. 언체크 예외라서 throws나 try-catch를 쓰지 않아도 컴파일됩니다. ' + (n === 0 ? '0건이 정상일 수 있는 조회라면 이 예외를 잡아서 처리하거나, 여러 건을 받는 query(...)를 써서 목록이 비었는지 확인합니다.' : '1건이어야 하는 조회에서 2건이 나왔다는 것을 조용히 넘기지 않고 알려 줍니다.')), n === 1 ? 'good' : 'bad');
      }
    } else {
      step(1, '예외'); st.db = '오류 (SQLState ' + err[0] + ')'; st.ex = 'SQLException';
      push((raw ? (op === 'bad' ? 'SQL을 DB에 보냄: ' : 'ps.executeUpdate(): ') : 'JdbcTemplate이 SQL을 실행: ') + 'DB가 오류를 냅니다. ' + err[1] + '. JDBC 드라이버는 이것을 SQLException으로 던지며, 무슨 오류인지는 그 안의 SQLState 코드(' + err[0] + ')에 들어 있습니다.', 'bad');
      if (raw) {
        if (q) st.st[2] = '건너뜀';
        if (plain) {
          st.st[steps.length - 1] = '건너뜀'; st.at = steps.length - 1; st.con = '반납 안 됨'; conn = '반납 안 됨';
          push('예외가 메서드 밖으로 나감: 예외가 난 줄 아래에 적은 ' + (q ? 'rs.close(), ps.close(), con.close()' : 'ps.close(), con.close()') + '는 실행되지 않습니다. 빌린 커넥션이 풀에 돌아가지 못합니다. 이런 일이 쌓이면 풀의 커넥션이 바닥나서 다른 요청이 커넥션을 얻지 못합니다.', 'bad');
        } else {
          st.st[steps.length - 1] = '끝남'; st.at = steps.length - 1; st.con = '반납됨';
          push('예외가 try 블록을 벗어남: try-with-resources는 예외가 나도 블록을 벗어날 때 close()를 자동으로 부릅니다. 커넥션이 풀에 돌아갑니다.', 'good');
        }
        caller = 'SQLException (SQLState ' + err[0] + ')'; kind = '체크 예외';
        st.at = -1; st.caller = caller;
        push('호출한 쪽: SQLException(또는 그 하위 클래스)을 받습니다. 체크 예외이므로 이 메서드를 부르는 모든 메서드가 throws SQLException을 적거나 try-catch로 잡아야 합니다. ' + err[3] + '인지 알아내려면 SQLState ' + err[0] + ' 같은 코드를 봐야 하는 경우가 많습니다.', 'bad');
      } else {
        step(2, '끝남'); st.con = '반납됨';
        push('JdbcTemplate이 SQLException을 잡음: 먼저 PreparedStatement를 닫고 커넥션을 풀에 돌려줍니다. 예외가 났을 때의 정리도 JdbcTemplate이 합니다.', 'good');
        step(3, '끝남'); caller = err[2]; kind = '언체크 예외'; st.ex = caller;
        push('예외 변환: JdbcTemplate이 SQLException의 종류와 SQLState 코드 ' + err[0] + ' 값을 보고, ' + err[4] + ' 뜻하는 ' + err[2] + '으로 바꿔 던집니다. 원래의 SQLException은 새 예외의 원인(cause)으로 들어 있어 사라지지 않습니다.', '');
        st.at = -1; st.caller = caller;
        push('호출한 쪽: ' + err[2] + '을 받습니다. 언체크 예외라서 throws를 적지 않아도 되고, 이 경우만 따로 처리하고 싶으면 코드 번호가 아니라 예외 클래스의 이름으로 잡으면 됩니다.', 'bad');
      }
    }
    if (plain && err) sum.push('close()를 메서드의 마지막에 두면 도중에 예외가 났을 때 닫지 못합니다. JDBC를 직접 쓸 때는 try-with-resources(또는 finally)로 닫아야 하고, 이것을 메서드마다 빠짐없이 써야 합니다.');
    if (c.how === 'twr' && err) sum.push('try-with-resources를 쓰면 커넥션은 반납됩니다. 그래도 JDBC가 던지는 것은 체크 예외인 SQLException(과 그 하위 클래스)이고, 원인을 가리려면 DB마다 다른 코드 번호를 봐야 하는 경우가 많습니다.');
    if (raw && !err && n !== 1) sum.push('JDBC를 직접 쓰면 0건이나 2건일 때 어떻게 할지도 직접 정해야 합니다. 정하지 않고 첫 행만 읽으면 문제가 조용히 지나갑니다. JdbcTemplate의 queryForObject는 같은 상황에서 예외를 던집니다.');
    if (raw && !err && n === 1) sum.push('결과는 맞지만 SQL 한 줄을 실행하려고 커넥션 얻기, 값 넣기, 실행, 결과 꺼내기, 닫기를 모두 직접 썼습니다. 메서드마다 같은 코드가 반복됩니다.');
    if (!raw && err) sum.push('JdbcTemplate은 SQLException을 DataAccessException 계열의 예외로 바꿉니다. 모두 언체크 예외이고, 클래스 이름이 문제의 종류를 말해 줍니다. DB 제품이 바뀌어도 같은 예외 클래스로 잡을 수 있습니다.' + (op === 'dup' ? ' DuplicateKeyException은 DataIntegrityViolationException의 하위 클래스입니다.' : ''));
    if (!raw && !err && n === 1) sum.push('커넥션을 얻고 닫는 코드를 한 줄도 쓰지 않았습니다. 쓴 것은 SQL과 넣을 값, 받을 타입뿐입니다.');
    if (!raw && !err && n === 0) sum.push('queryForObject는 결과가 0건이면 null을 돌려주지 않고 EmptyResultDataAccessException을 던집니다. 이 예외는 IncorrectResultSizeDataAccessException의 하위 클래스입니다.');
    if (!raw && !err && n === 2) sum.push('queryForObject는 결과가 2건 이상이면 IncorrectResultSizeDataAccessException을 던집니다. 여러 건이 나올 수 있는 조회에는 목록을 돌려주는 query(...)나 queryForList(...)를 씁니다.');
    return { events: ev, summary: sum, steps: steps, raw: raw, n: n, city: city, row: [caller, kind, conn] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    var q = sim.city !== undefined;
    H.table(v, ['id', 'name', 'city'], [['1', 'kim', '서울'], ['2', 'lee', '부산'], ['3', 'park', '서울']].map(function (r) { var hit = q && c.op !== 'bad' && r[2] === sim.city && s.db; return { cells: [r[0], r[1], { v: r[2], cls: hit ? 'hot' : '' }] }; }), 'member 테이블');
    H.title(v, sim.raw ? '직접 쓴 코드가 하는 일' : 'JdbcTemplate이 대신 하는 일'); var ln = H.lanes(v);
    sim.steps.forEach(function (name, i) { var m = s.st[i]; H.lane(ln, name, m || '아직', m === '끝남' ? 'good' : m === '예외' || m === '건너뜀' ? 'bad' : m === '주의' ? 'hot' : 'none'); });  },
  // 그림: 가운데에 한 번의 DB 작업에 필요한 일을 위에서 아래로 놓는다(직접 쓴 코드 또는 JdbcTemplate이 대신 하는 일). 오른쪽은 커넥션 풀과 DB, 아래는 호출한 쪽이 받는 것이다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { con: '풀에 있음', db: '', at: -1, st: sim.steps.map(function () { return ''; }), ex: '', caller: '' };
    var n = sim.steps.length, gap = n === 4 ? 48 : 62;
    P.size(680, 318);
    P.box('caller', 12, 104, 124, 56, { cls: shown.length ? 'wait' : 'plain', title: '호출한 쪽', sub: '서비스 코드' });
    P.region('code', 142, 14, 270, 244, sim.raw ? '직접 쓴 코드' : 'JdbcTemplate이 대신 하는 일');
    sim.steps.forEach(function (name, i) {
      var m = s.st[i], cls = !m ? 'ghost' : m === '끝남' ? 'good' : m === '주의' ? 'hot' : 'bad';
      P.box('s' + i, 154, 48 + i * gap, 246, 38, { cls: cls + (s.at === i ? ' now' : ''), title: (i + 1) + '. ' + name, right: m === '건너뜀' ? '건너뜀' : m === '예외' ? '예외 발생' : '' });
    });
    P.box('pool', 478, 44, 190, 62, { cls: s.con === '반납 안 됨' ? 'bad' : s.con === '빌려 쓰는 중' ? 'hot' : s.con === '반납됨' ? 'good' : 'plain', title: '커넥션 풀', sub: '커넥션: ' + s.con });
    P.box('db', 478, 150, 190, 62, { cls: !s.db ? 'plain' : s.db.indexOf('오류') === 0 ? 'bad' : 'wait', title: 'DB (member 테이블)', sub: s.db || '아직 실행 전' });
    if (shown.length) P.arrow('in', 'caller:r', [142, 132], {});
    if (s.con === '빌려 쓰는 중' || s.con === '반납 안 됨') P.arrow('con', 's0:r', 'pool:l:0.4', { cls: s.con === '반납 안 됨' ? 'bad' : '', label: s.con === '반납 안 됨' ? '반납 안 됨' : '빌림' });
    if (s.st[1]) P.arrow('sql', 's1:r', 'db:l', { cls: s.st[1] === '예외' ? 'bad' : '', label: s.st[1] === '예외' ? '오류' : 'SQL' });
    P.box('res', 12, 274, 656, 36, { cls: !s.caller ? 'ghost' : s.caller.indexOf('Exception') >= 0 ? 'bad' : s.caller === 'null' || sim.n === 2 ? 'hot' : 'good', title: '호출한 쪽이 받는 것', right: s.caller || '아직 실행 중' });
    P.note('커넥션 풀로 가는 화살표는 커넥션을 빌려 쓰는 동안에만 보입니다. 가운데 상자의 일은 SQL을 한 번 실행할 때마다 똑같이 반복됩니다.');
  },
  assume: '열여덟 가지 조합 모두를 이 PC의 스프링 프레임워크 7.0.9(스프링 부트 4.1.1에 들어 있는 버전)의 JdbcTemplate, HikariCP 커넥션 풀, H2 2.4.240에서 화면과 같은 구조의 코드로 실행해, 호출한 쪽이 받는 것, 예외가 체크 예외인지, 호출이 끝난 뒤 풀에 반납되지 않은 커넥션이 있는지를 대조했습니다. DuplicateKeyException이 DataIntegrityViolationException의 하위 클래스라는 것, EmptyResultDataAccessException이 IncorrectResultSizeDataAccessException의 하위 클래스라는 것, 바뀐 예외의 원인(cause)에 원래의 SQLException이 들어 있다는 것, JdbcTemplate이 예외를 바꾸는 시점에는 커넥션이 이미 반납되어 있다는 것도 실행으로 확인했습니다. SQLState 값(23505, 23502, 42S22)은 H2가 준 값입니다. 다른 DB 제품에서 코드가 다를 수 있다는 것과, 그래도 스프링이 같은 예외로 바꿔 준다는 것은 이 PC에서 H2로만 실행했으므로 스프링 문서를 따른 설명입니다. queryForObject가 결과를 다 읽고 커넥션을 반납한 다음에 건수를 확인한다는 단계의 순서는 스프링의 소스 코드를 따랐습니다(실행으로는 호출이 끝난 뒤 커넥션이 반납되어 있다는 것만 확인했습니다). H2는 SQL의 오타를 PreparedStatement를 만들 때 알려 주지만, SQL을 실행할 때에야 알려 주는 DB도 있습니다. 화면에서는 이것을 구분하지 않고 "SQL 실행" 단계로 그렸습니다. 스프링이 관리하는 트랜잭션 안에서는 JdbcTemplate이 커넥션을 풀에 바로 반납하지 않고 트랜잭션이 끝날 때 반납합니다. 여기서는 트랜잭션이 없는 경우만 다뤘습니다.',
});
