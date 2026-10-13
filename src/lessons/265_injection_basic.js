Lab.register({
  id: 'injection_basic', nav: '입력과 인젝션', cat: '기초개념', mode: 'step', basic: true, deep: ['webattack', 'jdbctmpl'],
  title: '사용자가 입력한 글이 코드로 읽히면 무슨 일이 생기는가',
  intro: 'SQL은 DB에 글자로 보내는 명령입니다. 사용자가 입력창에 쓴 이름으로 회원을 찾으려면 그 이름이 SQL 어딘가에 들어가야 하는데, 자바 코드에는 방법이 두 가지 있습니다. 하나는 SQL 글자에 입력을 이어 붙이는 것("… name = \'" + input + "\'")이고, 하나는 SQL에 ?로 값 자리를 비워 두고 입력은 PreparedStatement(값을 따로 받는 도구)로 따로 넘기는 것입니다. 이어 붙이면 입력 안에 든 따옴표 같은 글자도 SQL 글자의 일부가 되어서, DB가 그것을 SQL 문법으로 읽습니다. 그러면 입력이 값이 아니라 명령이 됩니다. 이것이 SQL 인젝션입니다. ?로 넘기면 입력 안의 따옴표나 OR도 찾을 값의 일부일 뿐입니다. 이 실습은 두 방법에 평범한 이름, 따옴표와 OR가 든 글, 따옴표가 든 평범한 이름을 하나씩 넣어, DB가 받은 SQL과 돌아온 행을 봅니다. (화면의 코드는 main 메서드 안에 있다고 보고 import 줄과 main 선언은 줄였습니다. 입력창은 만들지 않고 input 변수에 글을 적어 두었습니다. 웹 공격 전반과 JdbcTemplate은 세부 동작 실습에서 다룹니다.)',
  terms: ['Statement와 executeQuery', 'PreparedStatement와 바인드 파라미터', 'SQL 문자열 값과 따옴표', 'SQL Injection'],
  controls: [
    { id: 'how', label: 'input을 SQL에 넣는 방법', type: 'select', value: 'bind', options: [['bind', 'sql에 ?를 적고 ps.setString으로 값을 따로 넘긴다'], ['concat', 'sql 글자에 input을 이어 붙이고 st.executeQuery(sql)로 보낸다']] },
    { id: 'input', label: 'input에 담긴 글', type: 'select', value: 'kim', options: [['kim', 'kim'], ['or', '\' OR \'1\'=\'1'], ['oneil', 'O\'Neil (따옴표가 든 평범한 이름)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'input을 ?로 넘기면 kim을 찾는 SQL은 어떻게 실행되나', d: 'SQL에는 ?가 남고, kim은 값으로 따로 넘어갑니다. kim 한 행이 돌아옵니다.', v: { how: 'bind', input: 'kim' } },
    { t: '이어 붙이고 kim', q: 'input을 SQL 글자에 이어 붙이고 kim을 입력하면', d: '이어 붙인 SQL도 kim 한 행을 돌려줍니다. 결과만 봐서는 두 방법이 구별되지 않습니다.', v: { how: 'concat', input: 'kim' } },
    { t: '이어 붙이고 OR 입력', q: 'input을 이어 붙이는데 \' OR \'1\'=\'1 을 입력하면', d: '입력이 SQL의 조건으로 읽혀서 세 행이 모두 돌아옵니다.', v: { how: 'concat', input: 'or' } },
    { t: '?로 넘기고 OR 입력', q: '같은 \' OR \'1\'=\'1 을 ?로 넘기면', d: '입력은 값으로만 다뤄져서 그 이름의 행은 없고 0행이 돌아옵니다.', v: { how: 'bind', input: 'or' } },
    { t: '이어 붙이고 O\'Neil', q: 'input을 이어 붙이는데 따옴표가 든 이름 O\'Neil을 입력하면', d: '평범한 이름인데도 SQL 문법이 깨져 오류가 납니다.', v: { how: 'concat', input: 'oneil' } },
    { t: '?로 넘기고 O\'Neil', q: 'O\'Neil을 ?로 넘기면', d: '따옴표가 있어도 문제없이 O\'Neil 한 행이 돌아옵니다.', v: { how: 'bind', input: 'oneil' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/InjectionBasicProbe.java)이 같은 글을 컴파일해 실행한다. 대조 스크립트가 글자까지 비교한다.
  inp: { kim: 'kim', or: '\' OR \'1\'=\'1', oneil: 'O\'Neil' },
  code: function (c) {
    var l = ['// member 테이블에는 세 행(name: kim, lee, O\'Neil)이 들어 있다', '// 연결: 주소가 가리키는 DB와 연결을 맺는다', 'Connection conn = DriverManager.getConnection("jdbc:h2:mem:shop");', '// 입력: 사용자가 입력창에 쓴 글이라고 하자', 'String input = "' + this.inp[c.input] + '";'];
    if (c.how === 'bind') l.push('// SQL: 값이 들어갈 자리를 ?로 비워 둔다', 'String sql = "SELECT name FROM member WHERE name = ?";', '// 보내기: SQL 글자와 값을 따로 넘긴다', 'PreparedStatement ps = conn.prepareStatement(sql);', 'ps.setString(1, input);', 'ResultSet rs = ps.executeQuery();');
    else l.push('// SQL: input의 글자를 SQL 글자 사이에 그대로 이어 붙인다', 'String sql = "SELECT name FROM member WHERE name = \'" + input + "\'";', '// 보내기: 이어 붙여 완성한 SQL 글자를 통째로 보낸다', 'Statement st = conn.createStatement();', 'ResultSet rs = st.executeQuery(sql);');
    l.push('// 읽기: 돌아온 행마다 name을 출력한다', 'while (rs.next()) {', '    System.out.println(rs.getString("name"));', '}');
    return l.join('\n');
  },
  // DB에 가는 SQL 글자. ?로 넘기면 ?가 그대로 남고, 이어 붙이면 input이 글자 속에 섞인다
  sqlText: function (c) { return c.how === 'bind' ? 'SELECT name FROM member WHERE name = ?' : 'SELECT name FROM member WHERE name = \'' + this.inp[c.input] + '\''; },
  // 돌아오는 행의 name들(실제 실행에서 얻은 값), err는 SQL 문법 오류
  outcome: function (c) {
    if (c.how === 'bind') return { err: false, names: { kim: ['kim'], or: [], oneil: ['O\'Neil'] }[c.input] };
    return c.input === 'oneil' ? { err: true, names: [] } : { err: false, names: c.input === 'kim' ? ['kim'] : ['kim', 'lee', 'O\'Neil'] };
  },
  label: function (c) { return (c.how === 'bind' ? '?로 값을 따로 넘김' : '글자에 이어 붙임') + ' · 입력 ' + this.inp[c.input]; },
  errName: 'SQLException: SQL 문법 오류',
  columns: ['DB가 받은 SQL', '돌아온 행', '입력이 다뤄진 방식'],
  simulate: function (c) {
    var bind = c.how === 'bind', k = c.input, I = this.inp[k], S = this.sqlText(c), o = this.outcome(c);
    var ev = [], sum = [], outs = [];
    // 상태: inp input 변수가 만들어졌나, sql sql 변수(''/made), tool 도구(none/ps/st), val ? 자리에 값을 넘겼나, sent SQL이 DB에 갔나(''/go),
    //       ans DB의 답(''/rows/err), n 돌아온 행 수, hot 지금 움직이는 곳, log 지금까지의 일, outs 출력, exc 예외
    var st = { inp: false, sql: '', tool: 'none', val: false, sent: '', ans: '', n: 0, hot: '', log: [], outs: [], exc: '', recv: 0 };
    function push(s, kk) { ev.push({ s: s, k: kk, snap: JSON.parse(JSON.stringify(st)) }); }
    var kind = { kim: '평범한 이름입니다.', or: '따옴표와 OR가 든 글입니다.', oneil: '따옴표가 든 평범한 이름입니다.' }[k];

    // 1. input
    st.inp = true; st.hot = 'in'; st.log.push(['String input', { v: '글이 담김: ' + I, cls: '' }]);
    push('String input = "' + I + '": input 변수에 "' + I + '"라는 글이 담깁니다. ' + kind + ' 이 실습에서는 이것이 사용자가 입력창에 쓴 글이라고 보고, 입력창 대신 코드에 글을 적어 두었습니다. DB의 member 테이블에는 kim, lee, O\'Neil 세 행이 들어 있습니다.', '');

    // 2. sql 변수
    st.sql = 'made'; st.hot = 'tl';
    if (bind) {
      st.log.push(['String sql', { v: '값 자리가 ?로 빈 SQL 글자', cls: '' }]);
      push('String sql = "SELECT name FROM member WHERE name = ?": sql 변수에 SQL 글자를 담습니다. 값이 들어갈 자리는 ?로 비어 있고, input의 글은 이 글자에 들어가지 않습니다. 아직 DB에는 아무것도 보내지 않았습니다.', '');
    } else {
      st.log.push(['String sql', { v: 'input이 섞인 SQL 글자', cls: k === 'kim' ? '' : 'hot' }]);
      push('String sql = "SELECT name FROM member WHERE name = \'" + input + "\'": 자바가 글자를 이어 붙여 완성한 SQL 글자를 sql 변수에 담습니다. 담긴 글은 "' + S + '"입니다. ' +
        (k === 'kim' ? 'input 자리에 "kim"이라는 글이 그대로 들어갔습니다.' : '자바에게는 SQL을 쓴 사람이 넣은 따옴표와 input 안에 든 따옴표가 똑같은 글자라서, 구별하지 않고 그대로 이어 붙입니다.') +
        ' 아직 DB에는 아무것도 보내지 않았습니다.', k === 'kim' ? '' : 'bad');
    }

    // 3. 도구
    st.hot = 'tl';
    if (bind) {
      st.tool = 'ps'; st.log.push(['conn.prepareStatement', { v: 'ps 만듦 (? 자리 1개)', cls: '' }]);
      push('conn.prepareStatement(sql): sql 글자를 가진 PreparedStatement 객체를 만들어 ps에 담습니다. ps가 가진 SQL에는 ? 자리가 1개 있고 값은 아직 없습니다. DB의 실행 기록에도 이 SELECT는 아직 없습니다.', '');
      // 4. 값
      st.val = true; st.hot = 'in';
      st.log.push(['ps.setString', { v: '1번 ? 자리의 값이 정해짐', cls: 'good' }]);
      push('ps.setString(1, input): 1번 ? 자리에 input의 글을 값으로 넘깁니다. ps는 SQL 글자(? 자리가 있는 그대로)와 1번 자리의 값을 따로 가집니다. input의 글은 SQL 글자에 끼워 넣어지지 않습니다.', 'good');
    } else {
      st.tool = 'st'; st.log.push(['conn.createStatement', { v: 'SQL을 보낼 도구를 만듦', cls: '' }]);
      push('conn.createStatement(): SQL을 보내는 도구(Statement)를 만들어 st에 담습니다. 도구를 만든 것뿐이라 DB에는 아직 SQL이 가지 않았습니다.', '');
    }

    // 5. 보내기
    st.sent = 'go'; st.recv = 1; st.hot = 'tl';
    var tbl = 'name이 "' + I + '"인 행';
    if (bind) {
      st.ans = 'rows'; st.n = o.names.length;
      st.log.push(['ps.executeQuery', { v: 'DB가 실행해 결과를 돌려줌 (행 ' + st.n + '개)', cls: 'good' }]);
      push('ps.executeQuery(): ps는 값을 SQL 글과 따로 다뤄서, 값이 SQL 문법으로 읽히지 않게 합니다. DB가 실행한 SQL은 "' + S + '"이고, 이 글자 어디에도 input의 글은 없습니다. DB는 member 테이블에서 name이 값과 같은 행을 찾습니다. ' +
        (k === 'or' ? '값은 "' + I + '"라는 글 전체이고, ' + tbl + '은 없어서 결과는 행이 0개입니다. 값 안의 따옴표와 OR는 SQL 문법으로 읽히지 않고 이름의 일부일 뿐입니다.'
          : k === 'oneil' ? tbl + '은 1개입니다. 값 안의 따옴표는 이름의 일부일 뿐이라 SQL을 끝내거나 깨뜨리지 않습니다.'
          : tbl + '은 1개입니다.') +
        ' 자바는 결과를 ResultSet rs로 받습니다.', 'good');
    } else if (o.err) {
      st.ans = 'err'; st.exc = this.errName;
      st.log.push(['st.executeQuery', { v: 'DB가 문법 오류로 답함', cls: 'bad' }]);
      push('st.executeQuery(sql): st가 sql 변수의 글자를 통째로 DB에 보냅니다. DB가 받은 SQL은 "' + S + '"입니다. DB는 이 글자를 읽다가 name = 뒤의 \'O\'에서 두 번째 따옴표를 문자열의 끝으로 읽고, Neil은 문자열 밖의 글자로 읽습니다. 마지막 따옴표는 새 문자열을 여는데 닫는 따옴표가 없습니다. 문자열 안에 따옴표를 넣으려면 \'\'처럼 두 번 써야 하는데, 이어 붙인 글에는 그런 구별이 없습니다. DB는 결과 대신 문법 오류로 답하고(오류 위치는 Neil 바로 뒤입니다), JDBC가 이것을 SQLException으로 바꿔 던집니다. 예외를 처리하는 코드가 없어서 프로그램은 이 줄에서 멈추고, 아래 줄들은 실행되지 않습니다. 평범한 이름인데도 입력이 SQL의 일부가 되어 SQL을 깨뜨렸습니다.', 'bad');
    } else {
      st.ans = 'rows'; st.n = o.names.length;
      st.log.push(['st.executeQuery', { v: 'DB가 실행해 결과를 돌려줌 (행 ' + st.n + '개)', cls: k === 'or' ? 'bad' : 'good' }]);
      push('st.executeQuery(sql): st가 sql 변수의 글자를 통째로 DB에 보냅니다. DB가 받은 SQL은 "' + S + '"입니다. DB는 이 글자를 처음부터 읽어 SQL 문법으로 해석하고 실행합니다. ' +
        (k === 'or' ? 'input에 든 따옴표가 SQL의 따옴표로 읽혀서, 조건은 name = \'\' 와 \'1\'=\'1\' 두 개가 OR로 이어진 모양이 됩니다. name이 빈 글자인 행은 없지만 \'1\'=\'1\'은 모든 행에서 참이고, OR는 둘 중 하나만 참이어도 맞는 것으로 보므로 이름에 상관없이 모든 행이 결과가 됩니다. 결과는 행이 3개입니다. 사용자가 쓴 글이 값이 아니라 조건이라는 명령으로 읽혔습니다.'
          : tbl + '을 찾아 결과는 1개입니다.') +
        ' 자바는 결과를 ResultSet rs로 받습니다.', k === 'or' ? 'bad' : 'good');
    }

    // 6. 읽기
    if (!o.err) {
      st.hot = 'rs'; st.outs = o.names.slice(); outs = st.outs;
      st.log.push(['while (rs.next())', { v: o.names.length ? '출력: ' + o.names.join(' / ') : '돌 행이 없어 출력 없음', cls: k === 'or' && !bind ? 'bad' : '' }]);
      push(o.names.length
        ? 'while (rs.next()): rs의 행을 하나씩 읽어 name을 출력합니다. 출력은 ' + o.names.join(', ') + '입니다.' + (!bind && k === 'or' ? ' 이름을 하나만 찾는 코드였는데 member 테이블 전체가 나왔습니다.' : '')
        : 'while (rs.next()): rs.next()가 처음부터 false 값이라 반복문 안으로 들어가지 않고, 출력하는 줄이 없습니다. 오류가 난 것은 아니고 빈 결과입니다.', !bind && k === 'or' ? 'bad' : '');
    }

    // 요약: 첫 줄은 물음의 답
    var key = c.how + '|' + k;
    var S2 = {
      'bind|kim': ['input을 ?로 넘기면 SQL 글자는 SELECT name FROM member WHERE name = ? 그대로 DB에 가고, kim은 값으로 따로 넘어가서 kim 한 행이 돌아옵니다.', '평범한 입력 하나만 보아서는 ?로 넘기는 것이 무엇을 막는지 드러나지 않습니다. 이어 붙이는 방법과 입력을 바꿔 견주는 것이 이어지는 물음들입니다.'],
      'concat|kim': ['input을 이어 붙이고 kim을 입력해도 kim 한 행이 돌아옵니다. 결과는 ?로 넘길 때와 같습니다.', '평범한 입력에서는 두 방법의 결과가 같아서 결과만 봐서는 어느 방법인지 알 수 없습니다. 차이는 DB가 받은 SQL 글자에 있습니다. 이어 붙인 쪽은 kim이 글자 속에 섞여 있습니다.'],
      'concat|or': ['input을 이어 붙이면 입력이 값이 아니라 SQL의 조건으로 읽혀서, 이름을 하나 찾는 SQL이 모든 행을 돌려주는 SQL이 됩니다. 세 행이 모두 돌아왔습니다.', '사용자가 쓴 글이 SQL 명령 구실을 하는 것이 SQL 인젝션입니다. 코드에 sql 글자를 이어 붙이는 줄이 있으면, 입력에 따라 SQL의 모양이 달라집니다.'],
      'bind|or': ['같은 입력도 ?로 넘기면 값으로만 다뤄져서, 이름이 그 글 그대로인 행을 찾고 없어서 0행이 돌아옵니다.', '?로 넘긴 값은 따옴표와 OR가 들어 있어도 SQL 문법으로 읽히지 않습니다. DB가 받은 SQL 글자는 입력이 바뀌어도 그대로입니다.'],
      'concat|oneil': ['input을 이어 붙이면 따옴표가 든 평범한 이름 O\'Neil도 SQL 문법을 깨뜨려 오류가 납니다.', '공격이 아닌 평범한 입력에서도 문제가 생깁니다. 입력 안의 글자가 SQL의 글자로 읽힌다는 같은 원인에서 나온 일입니다.'],
      'bind|oneil': ['O\'Neil을 ?로 넘기면 따옴표가 있어도 문제없이 O\'Neil 한 행이 돌아옵니다.', '값으로 넘긴 글은 따옴표가 있어도 SQL 문법에 영향을 주지 않습니다. 이어 붙일 때 오류가 났던 입력이 여기서는 정상으로 처리됩니다.'],
    };
    S2[key].forEach(function (x) { sum.push(x); });
    var rowsText = o.err ? this.errName + ' (돌아온 행 없음)' : (o.names.length ? o.names.length + '개: ' + o.names.join(', ') : '0개');
    var way = bind ? '값으로만 다뤄짐 (SQL 글자에 들어가지 않음)'
      : { kim: 'SQL 글자의 일부가 됨 (평범한 글이라 결과는 같음)', or: 'SQL 글자의 일부가 됨 (OR 조건이 SQL로 읽혀 실행됨)', oneil: 'SQL 글자의 일부가 됨 (따옴표가 문자열을 끝내 문법이 깨짐)' }[k];
    return { events: ev, summary: sum, outcome: o, row: [bind ? S + ' (값: ' + I + ')' : S, rowsText, way] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 input 변수에 글이 담기는 것부터 시작합니다.'); return; }
    H.table(v, ['실행한 줄', '일어난 일'], s.log.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '자바와 DB 사이에서 일어난 일');
    H.counters(v, [[s.recv, 'DB가 받은 SQL'], [s.n, '돌아온 행'], [s.exc ? 1 : 0, '던져진 예외']]);
  },
  // 그림: 왼쪽 자바 프로그램의 input, 도구(ps 또는 st), rs 세 칸과 오른쪽 DB의 값 칸, SQL 글자 칸, 답 칸. ?로 넘기면 input에서 DB의 값 칸으로 가는 길과 SQL 글자로 가는 길이 따로 있고, 이어 붙이면 input이 SQL 글자 속에 섞여 한 길로만 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, bind = c.how === 'bind', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    P.region('jv', 14, 12, 290, 178, '자바 프로그램');
    P.region('db', 376, 12, 290, 178, 'DB (H2)');
    var I = this.inp[c.input];
    P.box('in', 24, 40, 270, 40, { cls: s && s.hot === 'in' ? 'hot now' : s && s.inp ? 'plain' : 'ghost', title: 'input', sub: s && s.inp ? I : '아직 없음' });
    var tsub = !s || s.tool === 'none' ? (s && s.sql ? 'sql 글자만 만들어짐' : '아직 없음') : s.tool === 'ps' ? (s.val ? '? 자리 1개 · 값 넘김' : '? 자리 1개 · 값 아직 없음') : 'SQL을 보내는 도구';
    P.box('tl', 24, 92, 270, 40, { cls: s && s.hot === 'tl' ? 'hot now' : s && s.tool !== 'none' ? 'plain' : 'ghost', title: bind ? 'ps' : 'st', sub: tsub });
    var rsSub = !s || !s.ans ? '아직 없음' : s.ans === 'err' ? '받지 못함' : s.n ? '결과 행 ' + s.n + '개' : '결과 행 0개';
    P.box('rs', 24, 144, 270, 40, { cls: s && s.ans === 'err' ? 'bad' : s && s.hot === 'rs' ? 'hot now' : s && s.ans ? 'plain' : 'ghost', title: 'rs', sub: rsSub });
    var vsub = !s || !s.sent ? '아직 없음' : bind ? '값 1개 도착' : '없음 (따로 받은 값 없음)';
    P.box('vl', 386, 40, 270, 40, { cls: s && s.sent && bind ? 'good' : 'ghost', title: 'DB가 받은 값', sub: vsub });
    var csub = !s || !s.sent ? '아직 없음' : bind ? '? 자리가 있는 글자' : 'input이 섞인 글자';
    P.box('rc', 386, 92, 270, 40, { cls: s && s.ans === 'err' ? 'bad' : s && s.sent ? (bind ? 'wait' : (c.input === 'kim' ? 'wait' : 'hot')) : 'ghost', title: 'DB가 받은 SQL 글자', sub: csub });
    var an = !s || !s.ans ? '아직 답 없음' : s.ans === 'err' ? '오류: SQL 문법 오류' : '결과: 행 ' + s.n + '개';
    P.box('an', 386, 144, 270, 40, { cls: s && s.ans === 'err' ? 'bad' : s && s.ans === 'rows' ? 'good' : 'ghost', title: 'DB의 답', sub: an });
    if (s && s.sent) {
      P.arrow('sq', 'tl:r', 'rc:l', { cls: s.ans === 'err' ? 'bad' : 'hot' });
      if (bind) P.arrow('vv', 'in:r', 'vl:l', { cls: 'good' });
    }
    if (s && s.ans === 'rows') P.arrow('rt', 'an:l', 'rs:r', { cls: 'good' });
    var recv = s && s.recv ? sim.row[0] : '';
    P.box('r1', 14, 204, 652, 36, { cls: s && s.recv ? (s.ans === 'err' ? 'bad' : 'wait') : 'ghost', title: 'DB가 받은 SQL', right: recv });
    P.box('r2', 14, 248, 652, 36, { cls: s && s.outs.length ? (!bind && c.input === 'or' ? 'bad' : 'good') : 'ghost', title: '출력된 값', right: s && s.outs.length ? s.outs.join(' / ') : '' });
    P.box('r3', 14, 292, 652, 36, { cls: s && s.exc ? 'bad' : 'ghost', title: '예외', right: s && s.exc ? s.exc : '' });
  },
  assume: 'JDK 21.0.12.1과 H2 2.4.240(메모리 DB)에서 실행해 대조했고, MySQL에서의 실행 대조는 하지 않았습니다. 여섯 가지 조합을 모두, 화면의 코드를 main 메서드가 든 Main.java에 넣어(import java.sql.*와 main 선언만 더했습니다) javax.tools로 컴파일하고, 조합마다 새 자바 프로세스에서 실행했습니다. 실행 전에 같은 프로세스에서 member 테이블(id INT 기본 키, name VARCHAR(20))과 세 행 (1, kim), (2, lee), (3, O\'Neil)을 만들어 두었는데, 화면에서는 이 준비 코드를 줄였습니다. 입력창은 만들지 않고 input 변수에 글을 적어 두었습니다. 대조한 것은 결과 표의 세 항목입니다. DB가 받은 SQL은 H2의 INFORMATION_SCHEMA.QUERY_STATISTICS(실행 기록)에 남은 SELECT이고, 문법 오류로 실행되지 못한 조합은 오류가 DB 엔진의 파서에서 났고 오류 메시지가 그 SQL을 인용한 것으로 판정했습니다(실행 기록은 비어 있었습니다). 돌아온 행은 코드가 출력한 name이고, 입력이 다뤄진 방식은 실제 값에서 얻었습니다. DB가 받은 SQL에 input의 글이 들어 있으면 "SQL 글자의 일부", 들어 있지 않으면 "값으로만 다뤄짐"이고, 괄호 안은 오류가 났는지, 이름이 input과 같은 행보다 많은 행이 돌아왔는지로 정했습니다. 결과 표의 첫 항목에서 ?로 넘긴 조합의 값은 코드에서 setString으로 넘긴 글입니다. 이 값이 ps에 SQL 글자와 따로 들어 있는 것은 H2가 ps를 문자열로 보여 주는 모양(SQL 글자 뒤에 {1: 값})으로 확인했습니다. 이 모양에서 값 안의 작은따옴표가 두 번 쓰이는 것은 H2가 값을 SQL 글자 값으로 보여 주는 표기이고, 값이 SQL 글자에 끼워졌다는 뜻이 아닙니다. 단계 문장이 기대는 사실로, prepareStatement와 setString까지 한 시점과 createStatement까지 한 시점에는 DB의 실행 기록에 이 SELECT가 없는 것, ps의 ? 자리가 1개이고 이어 붙인 SQL의 ? 자리는 0개인 것도 실행으로 확인했습니다(실행 기록은 한 번 읽으면 새 기록이 보이지 않아 시점마다 DB를 따로 만들어 한 번씩만 읽었습니다). O\'Neil을 이어 붙인 조합의 오류는 H2의 SQLState 42000(문법 오류)이고, 메시지의 오류 위치는 Neil 바로 뒤였으며 오류가 난 곳은 H2의 문자열 읽기(Tokenizer.readCharacterString)였습니다. 화면의 설명("두 번째 따옴표가 문자열을 끝내고 마지막 따옴표는 닫히지 않은 문자열을 연다")은 이 관찰과 문자열 안의 따옴표를 두 번 써야 한다는 H2 문서에 맞춘 풀이이고, H2가 글자를 어떻게 나누는지는 직접 추적하지 않았습니다. 이 오류 코드는 H2의 것이어서 MySQL에서는 다를 수 있습니다. 실제 DB 로그에 SQL 글자가 어떻게 남는지와 결과 행의 순서(ORDER BY가 없어 DB가 정하는 순서)는 H2에서 본 것일 뿐입니다. 문서는 직접 열어 확인했습니다. OWASP SQL Injection Prevention Cheat Sheet에서 문자열 이어 붙이기와 사용자 입력으로 만든 질의가 위험하다는 것(What Is a SQL Injection Attack?), 준비된 문장에서는 SQL을 먼저 정하고 값을 나중에 넘기며 DB가 입력이 무엇이든 코드와 데이터를 구별한다는 것(Defense Option 1), Java 예제가 SELECT에 ?를 쓰고 setString으로 값을 넘기며 tom\' or \'1\'=\'1 같은 입력도 그 글 전체와 같은 이름을 찾을 뿐이라는 것(Safe Java Prepared Statement Example)을 따랐습니다. Java SE 21 API 문서의 PreparedStatement에서는 미리 컴파일된 SQL 문장이라는 설명, 값을 넣는 setter가 ? 자리(IN 파라미터)의 값을 정한다는 것, 자리 번호가 1부터라는 것을, Statement에서는 정해진(static) SQL 문장을 실행하는 객체이고 executeQuery(String)이 ResultSet 하나를 돌려준다는 것을 확인했습니다. PreparedStatement 문서는 setString이 따옴표를 어떻게 다루는지는 적고 있지 않아서, 값이 따옴표와 상관없이 다뤄지는 것은 문서가 정한 것이 아니라 이 H2에서 관찰한 동작입니다. H2 문서 grammar 페이지에서 문자열 값이 작은따옴표로 시작하고 끝나며 안에 작은따옴표를 넣으려면 두 번 쓴다는 것을, MySQL 8.4 문서의 String Literals에서 같은 규칙(MySQL은 \\를 앞에 붙이는 방법도 허용)을 확인했습니다. 열린 문서는 모두 도구가 돌려준 요약으로 읽었고 원문 전체를 읽지는 않았습니다. 화면의 코드는 짧게 하려고 연결과 ResultSet을 닫는 줄과 예외를 처리하는 코드를 적지 않았고, 예외가 난 줄에서 프로그램이 멈추고 아래 줄이 실행되지 않는 것은 출력이 비어 있는 것으로 확인했습니다. 이 실습은 SQL 인젝션 하나만 다루며, 입력 검사, 출력할 때의 이스케이프, DB 계정 권한, 실제 공격에서 쓰는 다른 수법, 입력이 SQL이 아닌 곳(HTML, 명령어 등)에서 코드로 읽히는 경우는 다루지 않습니다. 웹 공격 전반(XSS, CSRF 포함)은 "웹 공격 세 가지", SQL을 직접 쓰는 JDBC의 반복되는 코드를 줄여 주는 JdbcTemplate은 "JdbcTemplate과 예외 변환"에서 다룹니다.',
});
