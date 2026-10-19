Lab.register({
  id: 'jdbc_basic', nav: 'JDBC', cat: '기초개념', mode: 'step', basic: true, deep: ['jdbctmpl', 'connpool', 'ormwhy'],
  title: '자바 코드는 어떻게 DB에 SQL을 보내는가',
  intro: 'DB는 자바 프로그램과 따로 일하는 프로그램입니다. (MySQL 같은 DB는 아예 다른 프로그램이고, 이 실습의 H2는 자바 프로그램 안에서 돌지만 코드가 하는 일은 같습니다.) 자바 코드가 DB에 일을 시키려면 JDBC라는 약속대로 세 가지를 합니다. 먼저 DB와 연결(Connection)을 맺습니다. 그 연결로 SQL을 글자로 보냅니다. 돌아온 결과(ResultSet)를 한 행씩 읽습니다. 연결이 없으면 SQL을 보낼 수 없고, SQL 글자가 틀리면 DB가 오류로 답해서 자바에서는 SQLException(오류가 났다는 신호인 예외)이 됩니다. 이 실습은 member 테이블에서 id가 1인 회원의 name을 읽는 코드에 conn.close() 줄을 넣거나 SQL 글자를 바꿔 가며, DB가 받은 SQL과 자바가 출력한 값과 예외를 봅니다. (화면의 코드는 main 메서드 안에 있다고 보고 import 줄과 main 선언은 줄였습니다. 이 반복되는 코드를 대신 써 주는 JdbcTemplate과 JPA는 세부 동작 실습에서 다룹니다.)',
  terms: ['JDBC', 'Connection과 DriverManager', 'Statement와 executeQuery', 'ResultSet과 SQLException'],
  controls: [
    { id: 'conn', label: 'conn(DB와 맺은 연결)', type: 'select', value: 'open', options: [['open', '연결을 맺고 바로 SQL을 보낸다'], ['closed', 'conn.close() 줄로 연결을 닫은 뒤에 SQL을 보낸다']] },
    { id: 'sql', label: 'executeQuery에 적는 SQL', type: 'select', value: 'ok', options: [['ok', '맞는 SQL: FROM member WHERE id = 1'], ['typo', '없는 테이블: FROM memberr'], ['none', '맞는 행이 없는 조건: WHERE id = 99']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'DB에서 id가 1인 회원의 name을 읽는 자바 코드는 어떻게 생겼고, 실행하면 무슨 일이 일어나나', d: '연결을 맺고, SQL을 보내고, 결과를 한 행씩 읽습니다. DB가 SQL 한 문장을 받아 실행하고 kim 값을 돌려줍니다.', v: { conn: 'open', sql: 'ok' } },
    { t: '연결을 닫은 뒤에 보내면', q: 'conn.close() 줄을 넣어 연결을 닫은 뒤에 SQL을 보내면', d: '닫힌 연결로는 SQL이 DB에 닿지 못하고 SQLException이 납니다.', v: { conn: 'closed', sql: 'ok' } },
    { t: '없는 테이블 이름', q: 'SQL의 테이블 이름 자리에 없는 이름(memberr)을 적으면', d: 'DB가 SQL을 읽다가 테이블이 없다고 오류로 답하고, 자바에서는 SQLException이 됩니다.', v: { conn: 'open', sql: 'typo' } },
    { t: '맞는 행이 없으면', q: '조건에 맞는 행이 없으면(WHERE id = 99)', d: '오류는 아니고 빈 결과가 옵니다. rs.next() 호출이 false 값이고, 그대로 값을 읽으려 하면 예외가 납니다.', v: { conn: 'open', sql: 'none' } },
    { t: '연결도 닫고 테이블 이름도 틀리면', q: 'conn.close() 줄도 넣고 테이블 이름도 없는 이름(memberr)이면', d: '닫힌 연결 오류가 먼저 나옵니다. 틀린 SQL은 DB가 읽어 보지도 못했습니다.', v: { conn: 'closed', sql: 'typo' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/JdbcBasicProbe.java)이 같은 글을 컴파일해 실행한다. 대조 스크립트가 글자까지 비교한다.
  code: function (c) {
    var l = ['// member 테이블에는 (id 1, name kim) 한 행이 들어 있다', '// 연결: 주소가 가리키는 DB와 연결을 맺는다', 'Connection conn = DriverManager.getConnection("jdbc:h2:mem:shop");', '// 도구: 이 연결로 SQL을 보내는 객체', 'Statement st = conn.createStatement();'];
    if (c.conn === 'closed') l.push('// 닫기: DB와의 연결을 끊는다', 'conn.close();');
    l.push('// 보내기: SQL 글자를 DB에 보내고, 결과를 받는다', 'ResultSet rs = st.executeQuery("' + this.sqlText(c) + '");', '// 읽기: 다음 행으로 옮긴다. 행이 있으면 true', 'boolean found = rs.next();', 'System.out.println(found);', 'System.out.println(rs.getString("name"));');
    return l.join('\n');
  },
  sqlText: function (c) { return 'SELECT name FROM ' + (c.sql === 'typo' ? 'memberr' : 'member') + ' WHERE id = ' + (c.sql === 'none' ? '99' : '1'); },
  label: function (c) { return (c.conn === 'open' ? '연결을 맺고 보냄' : '연결을 닫은 뒤 보냄') + ' · ' + { ok: '맞는 SQL', typo: '없는 테이블 이름', none: '맞는 행이 없는 조건' }[c.sql]; },
  // 실제 H2의 오류 코드를 화면에 적는 한국어로 옮긴 것 (대조 스크립트가 같은 표를 쓴다)
  errName: { closed: 'SQLException: 닫힌 연결에 SQL을 보내려 함', typo: 'SQLException: 테이블을 찾을 수 없음', none: 'SQLException: 읽을 행이 없는데 값을 읽으려 함' },
  columns: ['DB가 받은 SQL', '출력된 값', '예외'],
  simulate: function (c) {
    var closed = c.conn === 'closed', typo = c.sql === 'typo', none = c.sql === 'none', S = this.sqlText(c);
    var ev = [], sum = [], outs = [], recv = 0, excKind = '';
    // 상태: cn 연결(none 만들기 전, open, closed), se DB 쪽 자리, sm Statement, sq SQL 화살표(go 도착, blocked 막힘), ans DB의 답, rs ResultSet(none, before 첫 행 앞, row 현재 행 있음, after 현재 행 없음),
    //       n 결과 행 수, hot 지금 움직이는 곳, log 지금까지의 일, outs 출력, exc 예외
    var st = { cn: 'none', se: false, sm: false, sq: '', ans: '', rs: 'none', n: 0, hot: '', log: [], outs: [], exc: '', recv: 0 };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. 연결
    st.cn = 'open'; st.se = true; st.hot = 'cn'; st.log.push(['DriverManager.getConnection', { v: '연결을 맺음', cls: 'good' }]);
    push('DriverManager.getConnection("jdbc:h2:mem:shop"): 자바 프로그램이 DB에 연결을 맺습니다. 주소의 jdbc는 자바가 DB에 접속하는 약속(JDBC)이라는 뜻이고, h2는 DB의 종류, mem:shop은 메모리 안에 있는 shop이라는 DB입니다. 연결이 맺어지면 DB 쪽에 이 연결을 맡는 자리(세션)가 하나 생기고, 자바에는 그 연결을 나타내는 Connection 객체가 생기고, 변수 conn이 그 객체를 가리킵니다. member 테이블에는 (1, kim) 한 행이 들어 있습니다. 아직 SQL은 한 줄도 보내지 않았습니다.', '');

    // 2. Statement
    st.sm = true; st.hot = 'sm'; st.log.push(['conn.createStatement', { v: 'SQL을 보낼 도구를 만듦', cls: '' }]);
    push('conn.createStatement(): conn이 가리키는 연결로 SQL을 보내는 도구(Statement 객체)를 만들고, 변수 st가 그 객체를 가리키게 합니다. 도구를 만든 것뿐이라 DB에는 아직 SQL이 가지 않았습니다.', '');

    // 3. 닫기
    if (closed) {
      st.cn = 'closed'; st.se = false; st.hot = 'cn'; st.log.push(['conn.close', { v: '연결을 닫음', cls: 'bad' }]);
      push('conn.close(): 연결을 끊습니다. DB 쪽에 있던 이 연결의 자리가 사라지고, conn이 가리키는 Connection 객체는 닫힌 연결이 됩니다. st가 가리키는 Statement는 방금 닫은 그 연결로 만든 도구입니다.', 'bad');
    }

    // 4. 보내기
    st.hot = 'sm';
    if (closed) {
      st.sq = 'blocked'; st.ans = 'none'; st.exc = this.errName.closed; excKind = 'closed';
      st.log.push(['st.executeQuery', { v: '보내지 못함', cls: 'bad' }]);
      push('st.executeQuery("' + S + '"): SQL을 보내려 하지만 conn이 가리키는 연결이 이미 닫혀 있습니다. 이 줄은 DB에 닿기 전에, JDBC 드라이버가 닫힌 연결이라는 것을 알아채고 SQLException을 던집니다. DB는 이 SQL을 받은 적이 없습니다. ' +
        (typo ? '테이블 이름이 틀렸다는 것도 DB가 SQL을 읽어 봐야 알 수 있어서, 닫힌 연결 오류가 먼저 나오고 틀린 이름은 알려지지 않습니다. ' : none ? 'WHERE id = 99라는 조건도 DB가 읽어 본 적이 없습니다. ' : '') +
        '예외를 처리하는 코드가 없어서 프로그램은 이 줄에서 멈추고, 아래 줄들은 실행되지 않습니다.', 'bad');
    } else if (typo) {
      st.sq = 'go'; st.ans = 'err'; st.exc = this.errName.typo; excKind = 'typo'; recv = 1; st.recv = 1;
      st.log.push(['st.executeQuery', { v: 'DB가 오류로 답함', cls: 'bad' }]);
      push('st.executeQuery("' + S + '"): st가 SQL 글자를 DB에 보냅니다. DB는 받은 글자를 읽다가 FROM 뒤의 memberr 테이블을 찾지만, 그런 테이블이 없습니다. DB는 결과 대신 "테이블을 찾을 수 없다"는 오류로 답하고, 자바의 JDBC가 이 오류를 SQLException으로 바꿔 던집니다. 컴파일할 때는 SQL이 그냥 글자여서 틀린 줄을 몰랐고, DB가 읽은 지금에야 알려졌습니다. 예외를 처리하는 코드가 없어서 프로그램은 이 줄에서 멈추고, 아래 줄들은 실행되지 않습니다.', 'bad');
    } else {
      st.sq = 'go'; st.ans = none ? 'rows0' : 'rows1'; st.rs = 'before'; st.n = none ? 0 : 1; recv = 1; st.recv = 1;
      st.log.push(['st.executeQuery', { v: 'DB가 실행해 결과를 돌려줌 (행 ' + st.n + '개)', cls: 'good' }]);
      push('st.executeQuery("' + S + '"): st가 SQL 글자를 DB에 보냅니다. DB는 받은 글자를 읽어 member 테이블에서 ' + (none ? 'id가 99인 행을 찾지만 그런 행은 없습니다. 실행은 성공했고 결과는 행이 0개인 표입니다. 이것은 오류가 아닙니다. ' : 'id가 1인 행을 찾아 결과를 만듭니다. 결과는 행이 1개인 표입니다. ') +
        '자바는 이 결과를 ResultSet 객체로 받고, 변수 rs가 그 객체를 가리킵니다. ResultSet은 처음에 첫 행의 앞에 서 있어서 아직 어느 행도 읽지 않았습니다.', 'good');
    }
    if (!closed && !typo) {
      // 5. next
      st.hot = 'rs'; st.rs = none ? 'after' : 'row';
      st.log.push(['rs.next', { v: none ? 'false: 옮길 행이 없음' : 'true: 첫 행으로 옮김', cls: none ? 'bad' : 'good' }]);
      push('rs.next(): 결과에서 다음 행으로 한 칸 옮기고, 옮긴 자리에 행이 있으면 true, 없으면 false 값을 돌려줍니다. ' + (none
        ? '결과가 행 0개라서 옮길 행이 없고 false 값이 found 변수에 담깁니다. rs는 현재 행이 없는 상태입니다.'
        : '첫 행으로 옮겨 true 값이 found 변수에 담깁니다. next() 메서드를 부르기 전에 값을 읽으려 하면 읽을 행이 없다며 SQLException이 납니다.'), none ? 'bad' : 'good');
      // 6. println(found)
      outs.push(none ? 'false' : 'true'); st.outs = outs.slice(); st.hot = '';
      push('System.out.println(found): found 변수에 담긴 ' + (none ? 'false' : 'true') + ' 값을 화면에 출력합니다.', '');
      // 7. getString
      if (none) {
        st.exc = this.errName.none; excKind = 'none'; st.hot = 'rs';
        st.log.push(['rs.getString', { v: '현재 행이 없어 예외', cls: 'bad' }]);
        push('rs.getString("name"): 현재 행에서 name 열의 값을 꺼내려 하지만 rs에는 현재 행이 없습니다. JDBC가 읽을 데이터가 없다며 SQLException을 던지고, 프로그램은 이 줄에서 멈춥니다. 앞 줄에서 found 변수가 false였는데 코드가 그것을 확인하지 않고 읽으려 해서 생긴 오류입니다.', 'bad');
      } else {
        outs.push('kim'); st.outs = outs.slice(); st.hot = 'rs';
        st.log.push(['rs.getString', { v: 'kim', cls: 'good' }]);
        push('rs.getString("name"): 현재 행에서 name 열의 값을 글자로 꺼내 kim 값을 출력합니다. main의 마지막 줄까지 실행되어 프로그램이 끝났고, DB가 받은 SQL은 한 문장, 예외는 없습니다.', 'good');
      }
    } else { st.outs = []; }

    if (closed) {
      sum.push('연결을 닫은 뒤에는 SQL을 보낼 수 없습니다. executeQuery 줄에서 SQLException이 났고, DB는 이 SQL을 받지 못했습니다.');
      sum.push(typo ? 'SQL이 틀렸는지는 DB가 읽어 봐야 알 수 있는데, 닫힌 연결로는 DB에 닿지 못해서 틀린 테이블 이름 대신 닫힌 연결 오류가 나왔습니다.' : '연결은 SQL을 보내는 통로입니다. SQL이 맞는지 틀린지 따지기 전에, 통로가 열려 있어야 합니다.');
    } else if (typo) {
      sum.push('SQL 글자가 틀리면 DB가 오류로 답하고, 자바에서는 그것이 SQLException이 됩니다. DB는 SQL을 받아 읽어 봤지만 memberr 테이블이 없어 실행하지 못했고, 자바는 읽은 값이 없습니다.');
      sum.push('자바에게 SQL은 그냥 글자(문자열)입니다. 컴파일은 성공했고, 틀린 것은 DB가 읽은 실행 때에야 알려졌습니다.');
    } else if (none) {
      sum.push('조건에 맞는 행이 없는 것은 오류가 아닙니다. DB는 SQL을 실행해 빈 결과를 돌려주고, rs.next() 호출이 false 값으로 그것을 알려 줍니다. 이 신호를 확인하지 않고 값을 읽으면 SQLException이 납니다.');
      sum.push('행이 있는지는 next() 메서드가 돌려주는 true와 false 값으로 확인합니다. 읽기 전에 그 값을 보는 것은 코드의 몫입니다.');
    } else {
      sum.push('자바 코드는 연결 맺기, 보내는 도구 만들기, SQL 보내기, 결과를 한 행씩 읽기 차례로 DB에서 값을 읽어 옵니다. DB는 SQL 한 문장을 받아 실행했고 자바는 kim 값을 읽었습니다.');
      sum.push('자바 쪽에는 SQL을 실행하는 코드가 없습니다. SQL은 글자로 만들어 DB에 보내는 것이고 실행은 DB가 하며, 자바는 돌아온 결과를 ResultSet으로 받아 읽을 뿐입니다.');
    }
    var out = outs.length ? outs.join(' / ') : '(아무것도 출력되지 않음)';
    return { events: ev, summary: sum, recvCount: recv, excKind: excKind, row: [recv ? S : '없음 (SQL을 받지 못함)', out, excKind ? this.errName[excKind] : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 연결을 맺는 것부터 시작합니다.'); return; }
    H.table(v, ['실행한 줄', '일어난 일'], s.log.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '자바와 DB 사이에서 일어난 일');
    H.counters(v, [[s.recv, 'DB가 받은 SQL'], [s.exc ? 1 : 0, '던져진 예외']]);
  },
  // 그림: 왼쪽 자바 프로그램의 conn, st, rs 세 객체와 오른쪽 DB의 자리, member 테이블, DB의 답. 연결과 SQL과 결과가 오가는 화살표가 DB에 닿는지 끊기는지를 보이고, 아래에 DB가 받은 SQL, 출력, 예외 칸.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    P.region('jv', 14, 12, 290, 178, '자바 프로그램');
    P.region('db', 376, 12, 290, 178, 'DB (H2)');
    var cnSub = !s || s.cn === 'none' ? '아직 없음' : s.cn === 'open' ? 'DB와 맺은 연결' : '닫힌 연결';
    P.box('cn', 24, 40, 270, 40, { cls: s && s.cn === 'closed' ? 'bad' : s && s.hot === 'cn' ? 'hot now' : s && s.cn === 'open' ? 'plain' : 'ghost', title: 'conn', sub: cnSub });
    P.box('sm', 24, 92, 270, 40, { cls: s && s.hot === 'sm' ? 'hot now' : s && s.sm ? 'plain' : 'ghost', title: 'st', sub: s && s.sm ? 'SQL을 보내는 도구' : '아직 없음' });
    var rsSub = !s || s.rs === 'none' ? '아직 없음' : s.rs === 'before' ? '결과 행 ' + s.n + '개 · 첫 행 앞' : s.rs === 'row' ? '현재 행: kim' : '현재 행 없음';
    P.box('rs', 24, 144, 270, 40, { cls: s && s.rs === 'after' ? 'bad' : s && s.hot === 'rs' ? 'hot now' : s && s.rs !== 'none' ? 'plain' : 'ghost', title: 'rs', sub: rsSub });
    P.box('se', 386, 40, 270, 40, { cls: s && s.se ? 'good' : 'ghost', title: '이 연결을 맡는 자리', sub: s && s.se ? '있음' : '없음' });
    P.box('tb', 386, 92, 270, 40, { cls: s && s.sq === 'go' && s.ans !== 'err' ? 'hot now' : 'plain', title: 'member 테이블', sub: '(1, kim)' });
    var an = !s || !s.ans ? '아직 답 없음' : s.ans === 'rows1' ? '결과: 행 1개' : s.ans === 'rows0' ? '결과: 행 0개' : s.ans === 'err' ? '오류: 테이블을 찾을 수 없음' : 'SQL을 받지 못해 답 없음';
    P.box('an', 386, 144, 270, 40, { cls: s && s.ans === 'err' ? 'bad' : s && (s.ans === 'rows1' || s.ans === 'rows0') ? 'good' : 'ghost', title: 'DB의 답', sub: an });
    if (s && s.cn === 'open') P.arrow('lk', 'cn:r', 'se:l', { cls: 'good' });
    if (s && s.sq === 'go') P.arrow('sq', 'sm:r', 'tb:l', { cls: s.ans === 'err' ? 'bad' : 'hot' });
    if (s && s.sq === 'blocked') P.arrow('sq', 'sm:r', [338, 112], { cls: 'bad' });
    if (s && (s.ans === 'rows1' || s.ans === 'rows0')) P.arrow('rt', 'an:l', 'rs:r', { cls: 'good' });
    var recv = s && s.recv ? sim.row[0] : s && s.sq === 'blocked' ? '없음 (SQL을 받지 못함)' : '';
    P.box('r1', 14, 204, 652, 36, { cls: s && s.recv ? 'wait' : s && s.sq === 'blocked' ? 'bad' : 'ghost', title: 'DB가 받은 SQL', right: recv });
    P.box('r2', 14, 248, 652, 36, { cls: s && s.outs.length ? 'good' : 'ghost', title: '출력된 값', right: s && s.outs.length ? s.outs.join(' / ') : '' });
    P.box('r3', 14, 292, 652, 36, { cls: s && s.exc ? 'bad' : 'ghost', title: '예외', right: s && s.exc ? s.exc : '' });
  },
  assume: 'JDK 21.0.12.1과 H2 2.4.240(메모리 DB)에서 실행해 대조했고, MySQL에서의 실행 대조는 하지 않았습니다. 여섯 가지 조합을 모두, 화면의 코드를 main 메서드가 든 Main.java에 넣어(import java.sql.*와 main 선언만 더했습니다) javax.tools로 컴파일하고, 조합마다 새 자바 프로세스에서 실행했습니다. 실행 전에 같은 프로세스에서 member 테이블(id INT 기본 키, name VARCHAR(20))과 (1, kim) 한 행을 만들어 두었는데, 화면에서는 이 준비 코드를 줄였습니다. DB는 자바 프로세스 안에서 도는 H2라서 실제로는 같은 프로세스에 있고, MySQL처럼 따로 떨어진 프로그램이 아닙니다. 연결과 SQL 전송과 결과 읽기의 차례는 같지만, 그 사이를 오가는 것이 네트워크 통신이라는 점은 이 실습에서 확인하지 않았습니다. 대조한 것은 결과 표의 세 항목, 곧 DB가 받은 SQL, 출력된 값, 예외입니다. DB가 받은 SQL은 H2의 INFORMATION_SCHEMA.QUERY_STATISTICS(실행 기록)에 그 SELECT가 남았거나, 예외가 DB 엔진의 파서(org.h2.command.Parser)에서 났고 오류 메시지가 그 SQL을 인용한 경우로 판정했습니다. 닫힌 연결에서는 두 가지 모두 없었고, 예외가 JdbcConnection.checkClosed에서 났습니다. 예외의 종류는 H2의 SQLState와 오류 코드(42102 테이블을 찾을 수 없음, 2000 읽을 데이터가 없음, 90007 이미 닫힌 객체)를 화면의 한국어로 옮긴 것이고, 이 코드는 H2의 것이어서 MySQL에서는 다를 수 있습니다. 세 예외는 모두 SQLException의 하위 클래스입니다. 단계 문장이 기대는 사실로 연결을 맺으면 DB 쪽 세션이 하나 늘고 닫으면 줄어드는 것, createStatement만으로는 DB의 실행 기록에 SELECT가 남지 않고 executeQuery 뒤에는 남는 것, next() 메서드를 부르기 전에 getString을 하면 SQLException이 나는 것, next() 메서드를 한 번 더 부르면 false인 것도 실행으로 확인했습니다. 세션 수에는 실행 전에 준비 코드가 연 연결 하나가 들어 있습니다. 실행 기록(QUERY_STATISTICS)은 한 번 읽은 뒤에는 새 기록이 보이지 않아서(원인은 확인하지 않았습니다) 시점마다 DB를 따로 만들어 한 번씩만 읽었습니다. 화면의 코드는 짧게 하려고 연결과 ResultSet을 닫는 줄과 예외를 처리하는 코드를 적지 않았습니다. 예외를 처리하지 않으므로 예외가 난 줄에서 프로그램이 멈추고 아래 줄이 실행되지 않는 것은 출력에 뒤 줄의 값이 없는 것으로 확인했습니다. 문서는 Java SE 21 API 문서를 직접 열어 확인했습니다. java.sql 패키지 설명에서 DriverManager로 연결을 맺고 Statement로 SQL을 보내고 ResultSet으로 결과를 받는다는 것, Connection의 설명에서 SQL이 연결 안에서 실행되고 결과가 돌아온다는 것과 createStatement가 닫힌 연결에서 SQLException을 던진다는 것, Statement.executeQuery가 ResultSet을 돌려주고 닫힌 Statement에서 SQLException을 던진다는 것, ResultSet의 설명에서 커서가 처음에 첫 행의 앞에 있고 next가 한 칸 옮기며 행이 없으면 false 값을 돌려준다는 것과 현재 행이 필요한 메서드가 그때 SQLException을 던진다는 것, SQLException의 설명에서 SQLState와 오류 코드를 담는 예외라는 것, DriverManager.getConnection의 URL이 jdbc:부프로토콜:이름 꼴이라는 것을 따랐습니다. H2 문서(features 페이지)에서는 jdbc:h2:mem:이름이 같은 이름으로 같은 JVM 안에서 하나의 메모리 DB를 가리킨다는 것과 마지막 연결이 닫히면 메모리 DB가 사라진다는 것을 확인했습니다. 닫은 연결로 만든 Statement를 쓰면 H2가 오류를 내는 것은 문서가 정한 것이 아니라 이 H2에서 관찰한 동작입니다(Statement 문서는 닫힌 Statement에서 예외를 던진다고만 적고 있습니다). 이 밖에 PreparedStatement와 SQL에 값을 끼워 넣는 방법, 데이터를 바꾸는 SQL(executeUpdate), 트랜잭션, 연결을 닫는 올바른 방법(try-with-resources)은 다루지 않았고, 반복되는 코드를 줄여 주는 JdbcTemplate은 "세부 동작 실습: JdbcTemplate과 예외 변환", 연결을 매번 새로 맺지 않고 빌려 쓰는 방식은 "커넥션 풀과 OSIV", 객체와 테이블을 이어 주는 JPA는 "JPA가 푸는 문제"에서 다룹니다.',
});
