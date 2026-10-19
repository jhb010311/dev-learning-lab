Lab.register({
  id: 'index_basic', nav: '인덱스', cat: '기초개념', mode: 'step', basic: true, deep: ['index'],
  title: '인덱스는 무엇이고, 없으면 무엇이 달라지는가',
  intro: '인덱스(색인)는 어떤 열의 값을 정리해 두고, 그 값이 있는 행을 가리키는 목록입니다. DB가 테이블과 따로 만들어 두는 것이고, 책 뒤의 "찾아보기"와 같습니다. CREATE INDEX idx_name ON member(name)은 name 열의 색인을 만드는 문장입니다. 색인이 없으면 DB는 조건에 맞는 행을 찾으려고 테이블의 행을 처음부터 끝까지 읽어야 하고, 색인이 있으면 색인에서 값을 찾아 필요한 행만 읽습니다. 이 실습은 CREATE INDEX를 지우거나 찾는 열을 바꿔 가며 같은 SELECT를 실행해, 찾아낸 행은 같은데 DB가 읽은 행이 얼마나 달라지는지를 봅니다. 색인이 값을 어떤 구조로 정리하는지와 색인을 만드는 데 드는 비용은 다루지 않습니다.',
  terms: ['인덱스', 'CREATE INDEX', '풀 테이블 스캔', '실행 계획(EXPLAIN)'],
  controls: [
    { id: 'idx', label: 'CREATE INDEX idx_name ON member(name)을 실행한다', type: 'check', value: true },
    { id: 'cond', label: '찾는 조건', type: 'select', value: 'name', options: [['name', "WHERE name = '회원777'"], ['city', "WHERE city = '부산' (색인을 만들지 않은 열)"], ['id', 'WHERE id = 777 (기본 키)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '인덱스는 어떻게 생겼고, 있으면 DB는 행을 어떻게 찾나', d: 'name 색인이 있는 테이블. DB는 색인에서 회원777을 찾아 그 1행만 읽습니다.', v: { idx: true, cond: 'name' } },
    { t: 'CREATE INDEX를 지우면', q: 'CREATE INDEX를 지우면', d: '같은 1행을 찾지만 DB가 테이블의 1000행을 다 읽습니다.', v: { idx: false, cond: 'name' } },
    { t: '색인을 만들지 않은 열로 찾으면', q: '색인을 만들지 않은 열(city)로 찾으면', d: 'idx_name은 name 값으로 정리한 색인이라 city로 찾을 때는 쓰이지 않고, DB가 1000행을 다 읽습니다.', v: { idx: true, cond: 'city' } },
    { t: '기본 키로 찾으면', q: 'CREATE INDEX 없이 기본 키(id)로 찾으면', d: 'CREATE INDEX를 쓰지 않았지만 기본 키에는 색인이 이미 있어서, DB가 1행만 읽습니다.', v: { idx: false, cond: 'id' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/IndexBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  // "-- 회원 1000명을 넣는다" 줄이 있는 자리에서 대조 프로그램이 회원 1000명을 넣는다(INSERT 문은 화면에서 줄였다).
  wh: { name: "WHERE name = '회원777'", city: "WHERE city = '부산'", id: 'WHERE id = 777' },
  how: { index: 'name 색인(idx_name)으로 찾음', pk: '기본 키의 색인으로 찾음', full: '테이블의 행을 처음부터 끝까지 읽음' },
  code: function (c) {
    var l = ['CREATE TABLE member (', '    id   INT PRIMARY KEY,', '    name VARCHAR(20),', '    city VARCHAR(20)', ');',
      '-- 회원 1000명을 넣는다 (회원1 ~ 회원1000. INSERT 문은 화면에서 줄였다)', ''];
    if (c.idx) l.push('-- 인덱스: name 값으로 행을 빨리 찾기 위한 색인을 만든다', 'CREATE INDEX idx_name ON member(name);', '');
    l.push('SELECT * FROM member ' + this.wh[c.cond] + ';');
    return l.join('\n');
  },
  label: function (c) { return (c.idx ? 'CREATE INDEX 있음' : 'CREATE INDEX 없음') + ' · ' + this.wh[c.cond]; },
  columns: ['찾아낸 행', 'DB가 행을 찾은 방법', 'DB가 읽은 행'],
  simulate: function (c) {
    var idx = !!c.idx, cond = c.cond, ev = [], sum = [];
    var how = cond === 'id' ? 'pk' : (cond === 'name' && idx) ? 'index' : 'full';
    var found = cond === 'city' ? 250 : 1, read = how === 'full' ? 1000 : 1;
    var q = 'SELECT * FROM member ' + this.wh[cond];
    // 상태: 색인 상자(id 색인, name 색인), 테이블의 행 수, 지금 하는 일(mode), 읽은 행 수, 찾아낸 행 수, 이번 단계에서 새로 생긴 색인
    var st = { ixId: false, ixName: false, fresh: '', rows: 0, mode: 'idle', read: null, found: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. CREATE TABLE
    st.ixId = true; st.fresh = 'id';
    push('CREATE TABLE: DB가 member라는 테이블을 만듭니다. 열은 id, name, city 셋이고 지금은 행이 하나도 없습니다. id 열에는 PRIMARY KEY가 적혀 있으므로, DB는 id 값으로 행을 찾는 색인(인덱스)도 만들어 둡니다. 색인은 어떤 열의 값을 정리해 두고 그 값이 있는 행을 가리키는 목록이며, 책 뒤의 "찾아보기"와 같은 것입니다. 이 색인은 CREATE INDEX를 쓰지 않아도 생깁니다.', '');

    // 2. 회원 1000명
    st.rows = 1000; st.fresh = '';
    push('회원 1000명 넣기(화면에서 줄인 INSERT 1000번): DB가 id 1부터 1000까지, name은 회원1부터 회원1000까지, city는 서울, 부산, 대구, 광주를 돌아가며 넣습니다. 테이블은 1000행이 되었고 city마다 250행입니다.', '');

    // 3. CREATE INDEX
    if (idx) {
      st.ixName = true; st.fresh = 'name';
      push('CREATE INDEX idx_name ON member(name): DB가 name 열의 값들을 순서대로 정리한 색인을 테이블과 따로 만듭니다. 색인에는 name 값(…, 회원776, 회원777, 회원778, …)과 그 값이 있는 행을 가리키는 정보가 들어 있습니다. 테이블의 행은 그대로 1000행입니다. 색인을 만들어도 행은 바뀌지 않습니다.', '');
    }

    // 4. SELECT: 쓸 수 있는 색인이 있는지 본다
    st.fresh = ''; st.mode = 'look';
    var detail = how === 'index' ? 'name 열에는 CREATE INDEX로 만든 색인 idx_name이 있으므로, DB는 이 색인으로 찾기로 합니다.'
      : how === 'pk' ? 'id 열에는 PRIMARY KEY 때문에 생긴 색인이 있으므로, DB는 이 색인으로 찾기로 합니다.' + (idx ? ' name 색인 idx_name은 id로 찾는 데는 쓸모가 없습니다.' : ' CREATE INDEX를 쓰지 않았어도 이 색인은 있습니다.')
      : cond === 'name' ? 'name 열을 위한 색인이 없습니다. 이 테이블에 있는 색인은 id 열의 것뿐입니다. 그래서 DB는 테이블의 행을 직접 읽어 찾기로 합니다.'
      : 'city 열을 위한 색인이 없습니다. ' + (idx ? 'name 색인 idx_name은 name 값을 정리해 둔 것이라, city로 찾는 데는 쓸 수 없습니다.' : '이 테이블에 있는 색인은 id 열의 것뿐입니다.') + ' 그래서 DB는 테이블의 행을 직접 읽어 찾기로 합니다.';
    st.look = how;
    push(q + ': DB가 먼저 조건에 쓰인 ' + cond + ' 열을 위한 색인이 있는지 봅니다. ' + detail, '');

    // 5. 찾는다
    st.read = read;
    if (how === 'index') {
      st.mode = 'target';
      push('DB가 name 색인에서 회원777을 찾고, 그 값에 딸린 정보를 따라 테이블의 id 777 행으로 바로 갑니다. 테이블의 나머지 999행은 읽지 않았습니다. DB가 읽은 행은 1행입니다.', 'good');
    } else if (how === 'pk') {
      st.mode = 'target';
      push('DB가 id 색인에서 777을 찾고, 테이블의 id 777 행으로 바로 갑니다. ' + (idx ? '' : 'CREATE INDEX를 쓰지 않았지만 PRIMARY KEY가 만든 색인이 같은 일을 합니다. ') + '테이블의 나머지 999행은 읽지 않았습니다. DB가 읽은 행은 1행입니다.', 'good');
    } else {
      st.mode = 'scan';
      push('DB가 member 테이블의 첫 행부터 마지막 행까지 ' + (cond === 'name' ? "name이 '회원777'인지" : "city가 '부산'인지") + ' 하나씩 봅니다. ' + (cond === 'name' ? '회원777 행(id 777)을 만난 뒤에도 name이 같은 행이 더 있는지 알 수 없어서 마지막 행까지 읽습니다. ' : '부산인 행은 여럿이라 마지막 행까지 읽어야 전부 찾을 수 있습니다. ') + 'DB가 읽은 행은 1000행입니다.' + (cond === 'name' ? ' 찾는 행은 하나뿐인데도 테이블의 모든 행을 읽었습니다.' : ''), '');
    }

    // 6. 결과
    st.found = found; st.mode = 'found';
    var tail = how === 'index' ? ' CREATE INDEX가 없는 테이블에서 같은 SELECT를 실행해도 찾아내는 행은 똑같습니다. 다른 점은 그때 DB가 읽는 행이 1000행이라는 것입니다.'
      : cond === 'name' ? ' CREATE INDEX idx_name이 있는 테이블에서 같은 SELECT를 실행해도 찾아내는 행은 똑같습니다. 다른 점은 그때 DB가 읽는 행이 1행이라는 것입니다.'
      : cond === 'city' ? ' CREATE INDEX가 있든 없든 DB가 읽는 행은 1000행으로 같습니다.'
      : ' CREATE INDEX가 있든 없든 DB가 읽는 행은 1행으로 같습니다.';
    push('SELECT의 결과: ' + (cond === 'city' ? "city가 '부산'인 250행(id 2, 6, 10, …)을 돌려줍니다. DB가 읽은 1000행 가운데 250행이 조건에 맞았습니다." : 'id 777인 회원777 행 하나를 돌려줍니다.') + tail, how === 'full' ? '' : 'good');

    // 요약: 첫 줄은 물음의 답
    var S = {
      'true|name': ['인덱스는 어떤 열의 값을 정리해 두고 그 값이 있는 행을 가리키는, 테이블과 따로 만든 색인입니다. name 색인이 있어서 DB는 회원777 행으로 바로 가 1000행 가운데 1행만 읽었습니다.', '찾아낸 행은 색인이 없을 때와 똑같습니다. 색인이 바꾸는 것은 결과가 아니라 DB가 읽는 양입니다.'],
      'false|name': ['CREATE INDEX를 지우면 name 열의 색인이 없어서, DB는 첫 행부터 마지막 행까지 1000행을 읽고서야 회원777 행을 찾았습니다.', '찾아낸 행은 색인이 있을 때와 같은 1행입니다. 색인이 없으면 결과는 같고 읽는 양만 늡니다. 테이블의 행이 늘면 이 읽는 양도 같이 늡니다.'],
      'true|city': ['색인은 만든 열에서만 쓸모가 있습니다. idx_name은 name 값으로 정리한 색인이라 city로 찾을 때는 쓰이지 않았고, DB는 1000행을 다 읽어 부산인 250행을 찾았습니다.', 'CREATE INDEX가 있는 테이블이라도 색인이 없는 열로 찾으면 읽는 양은 색인이 없을 때와 같습니다. city로 빨리 찾으려면 city 열의 색인이 따로 있어야 합니다.'],
      'false|city': ['이 테이블에는 city 열의 색인이 없어서 DB는 1000행을 다 읽어 부산인 250행을 찾았습니다.', '색인을 만들지 않은 열로 찾을 때 DB가 읽는 양은 name 색인이 있든 없든 같습니다.'],
      'true|id': ['기본 키(id)에는 따로 만들지 않아도 색인이 이미 있습니다. 그래서 DB는 id 색인에서 777을 찾아 그 1행만 읽었고, name 색인 idx_name은 쓰이지 않았습니다.', '색인은 열마다 따로 있습니다. 어느 색인을 쓸지는 DB가 조건의 열을 보고 정합니다.'],
      'false|id': ['CREATE INDEX를 한 줄도 쓰지 않았는데도 id로 찾을 때는 1행만 읽었습니다. PRIMARY KEY를 적은 열에는 DB가 색인을 만들어 두기 때문입니다.', '기본 키가 아닌 열에 색인이 필요하면 CREATE INDEX로 직접 만들어야 합니다.']
    };
    S[idx + '|' + cond].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, how: how, row: [found + '행', this.how[how], read + '행'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 CREATE TABLE부터 한 문장씩 진행합니다.'); return; }
    var ix = [];
    if (s.ixId) ix.push({ cls: s.fresh === 'id' ? 'hot' : '', cells: ['id 색인', 'PRIMARY KEY가 적혀 있어서 생김'] });
    if (s.ixName) ix.push({ cls: s.fresh === 'name' ? 'hot' : '', cells: ['name 색인 (idx_name)', 'CREATE INDEX로 만듦'] });
    H.table(v, ['색인', '어떻게 생겼나'], ix, 'member 테이블의 색인');
    if (s.found !== null) H.table(v, ['찾아낸 행', 'DB가 행을 찾은 방법', 'DB가 읽은 행'], [{ cls: '', cells: [s.found + '행', sim.how === 'full' ? { v: sim.row[1], cls: 'hot' } : { v: sim.row[1], cls: 'good' }, s.read + '행'] }], 'SELECT의 결과');
    H.counters(v, [[s.rows, '테이블의 행 수'], [s.read === null ? '-' : s.read, 'DB가 읽은 행'], [s.found === null ? '-' : s.found, '찾아낸 행']]);
  },
  // 그림: 왼쪽에 색인 상자(name 색인은 만들었을 때만), 오른쪽에 member 테이블의 행 몇 개. 색인으로 찾을 때는 색인에서 한 행으로 가는 화살표, 전체를 읽을 때는 테이블의 모든 행이 노랗게 칠해진다. 아래에 DB가 읽은 행을 센다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.region('ix', 14, 16, 250, 208, '색인');
    P.region('tb', 414, 16, 252, 208, 'member 테이블');
    var hasName = s && s.ixName, tgt = s && s.mode === 'target';
    if (hasName) P.box('ixn', 24, 44, 230, 76, { cls: s.fresh === 'name' ? 'hot' : tgt && s.look === 'index' ? 'hot now' : s.mode === 'look' && s.look === 'index' ? 'hot now' : 'plain', title: 'name 색인 idx_name', sub: ['…, 회원776, 회원777,', '회원778, …'] });
    if (s && s.ixId) P.box('ixi', 24, 136, 230, 76, { cls: s.fresh === 'id' ? 'hot' : (tgt || s.mode === 'look') && s.look === 'pk' ? 'hot now' : 'plain', title: 'id 색인 (기본 키)', sub: ['…, 776, 777, 778, …'] });
    // 테이블의 행 몇 개: 맞는 행은 조건에 따라 정해진다(name, id는 777번, city는 부산인 2번)
    var rowsDef = [['r1', 1, '서울', 42], ['r2', 2, '부산', 74], ['r777', 777, '서울', 134], ['r1000', 1000, '광주', 190]];
    var matchOf = function (id, city) { return c.cond === 'city' ? city === '부산' : id === 777; };
    if (s && s.rows) {
      rowsDef.forEach(function (r) {
        var m = matchOf(r[1], r[2]), cls = 'plain';
        if (s.mode === 'scan') cls = 'hot';
        else if (s.mode === 'target') cls = r[1] === 777 ? 'hot now' : 'plain';
        else if (s.mode === 'found') cls = m ? 'good' : 'plain';
        P.box(r[0], 424, r[3], 232, 28, { cls: cls, title: 'id ' + r[1] + ' · 회원' + r[1] + ' · ' + r[2] });
      });
      P.text('d1', 540, 122, '⋮', { cls: 'mut', anchor: 'middle' });
      P.text('d2', 540, 180, '⋮  (모두 1000행)', { cls: 'mut', anchor: 'middle' });
    } else P.text('emp', 540, 126, '행이 없습니다', { cls: 'mut', anchor: 'middle' });
    if (tgt) {
      if (s.look === 'index') P.arrow('ar', 'ixn:r', 'r777:l', { cls: 'hot', label: '회원777' });
      else P.arrow('ar', 'ixi:r', 'r777:l', { cls: 'hot', label: '777' });
    }
    P.box('n1', 14, 242, 322, 36, { cls: s && s.read !== null ? (s.read > 1 ? 'hot' : 'good') : 'ghost', title: 'DB가 읽은 행', right: s && s.read !== null ? s.read + '행' : '-' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.found !== null ? 'good' : 'ghost', title: '찾아낸 행', right: s && s.found !== null ? s.found + '행' : '-' });
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했습니다. 여섯 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 글자 그대로 실행했습니다. 화면의 "회원 1000명을 넣는다" 주석 줄이 있는 자리에서는 대조 프로그램이 회원 1000명(id 1~1000, name은 회원1~회원1000, city는 서울, 부산, 대구, 광주를 돌아가며 250명씩)을 넣었고, INSERT 문은 화면에서 줄였습니다. 대조한 것은 SELECT가 돌려준 행 수, H2의 EXPLAIN이 알려 준 찾는 방법(name 색인 IDX_NAME, 기본 키의 색인 PRIMARY_KEY, 색인 없이 tableScan), EXPLAIN ANALYZE가 알려 준 scanCount, 그리고 단계 문장이 기대는 사실입니다. 기대는 사실은 CREATE TABLE 직후 id 열의 색인이 자동으로 생겨 있다는 것, CREATE INDEX가 name 열을 순서대로 정리한 색인을 만들었다는 것, CREATE INDEX 전후로 행이 1000행 그대로라는 것, 색인이 있을 때와 없을 때 SELECT가 같은 행을 돌려준다는 것입니다. 화면의 "DB가 읽은 행"은 scanCount에서 1을 뺀 값입니다. H2 문서는 scanCount의 뜻을 따로 정의하지 않았고, 이 버전에서 관찰한 scanCount는 읽은 행 수보다 1 큽니다(더 읽을 행이 없음을 확인하는 한 번이 더해지는 것으로 보입니다). 근거는 이렇습니다. 행이 0개, 10개, 1000개인 테이블을 처음부터 끝까지 읽으면 scanCount는 1, 11, 1001이고, 조건에 행마다 불린 횟수를 세는 함수를 써서 전체를 읽게 했더니 함수가 1000번 불렸고 scanCount는 1001이었습니다. 색인으로 없는 값을 찾으면 scanCount가 1, 있는 값을 찾으면 2였습니다. 색인으로 찾을 때의 "1행"은 이 관찰에 따라 같은 방식으로 1을 뺀 값이며, 찾아낸 행 수와 같습니다. 어떤 방법으로 찾을지는 DB가 데이터의 양과 분포를 보고 정하므로, 다른 DB나 다른 데이터에서는 색인이 있어도 쓰지 않을 수 있습니다. 검증 실행(H2 2.4.240)에서 이 데이터로 관찰한 결과입니다. 문서는 H2 문서의 performance 페이지에서 "How Data is Stored and How Indexes Work"(색인은 색인된 열과 행 번호를 담은 표와 같다), "Statement Execution Plans (EXPLAIN)"(EXPLAIN ANALYZE는 읽은 행을 보여 주고, tableScan은 색인을 쓰지 않았다는 뜻이며, 기본 키와 유니크 제약에는 색인이 자동으로 만들어진다)를 열어 확인했습니다. MySQL 8.4 문서는 10.3.1절 How MySQL Uses Indexes(색인이 없으면 첫 행부터 테이블 전체를 읽어야 한다), 15.1.15절 CREATE INDEX Statement(기존 테이블에 색인을 더한다), 10.3.2절 Primary Key Optimization(기본 키에는 색인이 딸려 있다), CREATE TABLE 문의 PRIMARY KEY 항목을 열어 확인했습니다. 다만 MySQL에서의 실행 대조는 하지 않았습니다. 또 이 화면은 기본 키의 색인도 name 색인처럼 상자로 그렸지만, H2와 MySQL(InnoDB)은 정수 기본 키를 테이블 데이터 자체의 정렬 기준으로 쓰므로 기본 키의 색인이 name 색인처럼 테이블과 따로 있는 목록은 아닙니다. 색인의 구조(B-트리 등)와, 색인이 있으면 INSERT, UPDATE, DELETE가 색인도 고쳐야 해서 드는 비용은 다루지 않았고 "세부 동작 실습: 인덱스"에서 다룹니다.',
});
