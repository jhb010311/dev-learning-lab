Lab.register({
  id: 'explainplan', nav: '실행 계획 읽기', cat: '데이터베이스', mode: 'step',
  title: 'EXPLAIN 한 줄에서 무엇을 읽어야 하나',
  intro: '쿼리 앞에 EXPLAIN을 붙이면 DB가 그 쿼리를 어떻게 실행할지 세운 계획을 보여 줍니다. 한 줄에 칸이 여러 개인데, type과 key와 rows와 Extra 네 칸만 읽을 줄 알아도 느린 쿼리의 원인을 대부분 찾을 수 있습니다.',
  terms: ['실행 계획(EXPLAIN)', 'EXPLAIN의 type', 'EXPLAIN의 Extra', '풀 테이블 스캔', '커버링 인덱스'],
  controls: [
    { id: 'w', label: 'WHERE 조건의 모양', type: 'select', value: 'func', options: [['none', '조건 없음'], ['pk', 'id = 500 (기본 키)'], ['eq', "name = 'user00123' (인덱스 컬럼, 값 하나)"], ['prefix', "name LIKE 'user001%' (앞부분이 정해진 LIKE)"], ['suffix', "name LIKE '%00123' (앞에 %가 붙은 LIKE)"], ['func', "LEFT(name, 7) = 'user001' (인덱스 컬럼에 함수)"], ['noidx', 'age = 30 (인덱스 없는 컬럼)'], ['join', '조인: orders와 member를 기본 키로 연결']] },
    { id: 'sel', label: '조회하는 컬럼', type: 'select', value: 'star', options: [['star', 'SELECT * (모든 컬럼)'], ['cov', 'SELECT id, name (인덱스에 있는 컬럼만)']], show: function (c) { return c.w !== 'join' && c.tail !== 'gage'; } },
    { id: 'tail', label: '뒤에 붙는 절', type: 'select', value: 'none', options: [['none', '없음'], ['oname', 'ORDER BY name (인덱스 컬럼으로 정렬)'], ['oage', 'ORDER BY age (인덱스 없는 컬럼으로 정렬)'], ['gage', 'GROUP BY age (나이별 인원수)']], show: function (c) { return c.w !== 'join'; } },
  ],
  // 조인 예시는 쿼리가 정해져 있고, GROUP BY를 고르면 조회 컬럼이 age, COUNT(*)로 정해진다
  fix: function (c) { return c.w === 'join' ? { sel: 'star', tail: 'none' } : c.tail === 'gage' ? { sel: 'star' } : null; },
  presets: [
    { t: '처음 설정으로', q: 'LEFT(name, 7) = \'user001\' 조건으로 SELECT *로 조회하면 EXPLAIN 한 줄에서 무엇을 읽어야 하나', d: '인덱스가 있는 컬럼인데 함수를 씌웠더니 type이 ALL입니다.', v: { w: 'func', sel: 'star', tail: 'none' } },
    { t: '같은 뜻을 LIKE로 쓰면', q: 'WHERE 조건을 name LIKE \'user001%\' 모양으로 바꾸면', d: "LIKE 'user001%'. type이 range로 바뀝니다.", v: { w: 'prefix', sel: 'star', tail: 'none' } },
    { t: '기본 키로 한 행', q: 'WHERE 조건을 id = 500 기본 키 모양으로 바꾸면', d: 'type const. 가장 적게 읽는 경우입니다.', v: { w: 'pk', sel: 'star', tail: 'none' } },
    { t: '앞에 %가 붙은 LIKE, 인덱스 컬럼만 조회', q: 'name LIKE \'%00123\' 조건에 id, name만 SELECT하면', d: 'type index. 이름과 달리 인덱스 전체를 읽습니다.', v: { w: 'suffix', sel: 'cov', tail: 'none' } },
    { t: '찾기는 인덱스로, 정렬은 따로', q: 'name = \'user00123\' 조건에 인덱스 없는 컬럼 age로 ORDER BY 하면', d: 'type ref인데 Extra에 Using filesort가 붙습니다.', v: { w: 'eq', sel: 'star', tail: 'oage' } },
    { t: 'GROUP BY', q: 'WHERE 조건 없이 GROUP BY age로 나이별 인원수를 세면', d: 'Extra에 Using temporary가 나옵니다.', v: { w: 'none', sel: 'star', tail: 'gage' } },
    { t: '조인', q: 'orders와 member를 기본 키로 연결하는 조인으로 바꾸면', d: '두 줄이 나오고, 둘째 줄의 type이 eq_ref입니다.', v: { w: 'join', sel: 'star', tail: 'none' } },
  ],
  WHERE: { none: '', pk: 'id = 500', eq: "name = 'user00123'", prefix: "name LIKE 'user001%'", suffix: "name LIKE '%00123'", func: "LEFT(name, 7) = 'user001'", noidx: 'age = 30' },
  // 조건에 실제로 맞는 행의 수 (Probe가 같은 데이터에서 세어 본 값)
  MATCH: { none: 20000, pk: 1, eq: 2, prefix: 200, suffix: 2, func: 200, noidx: 400 },
  code: function (c) {
    if (c.w === 'join') return '-- member 2만 행 (기본 키 id)\n-- orders 2만 행 (member_id에 인덱스 없음)\n\nEXPLAIN\nSELECT o.id, o.amount, m.name\n  FROM orders o\n  JOIN member m ON m.id = o.member_id;';
    var cols = c.tail === 'gage' ? 'age, COUNT(*)' : c.sel === 'cov' ? 'id, name' : '*', w = this.WHERE[c.w];
    return '-- member 테이블: 2만 행\n-- 기본 키 id, 인덱스 idx_name (name)\n-- age 컬럼에는 인덱스가 없다\n\nEXPLAIN\nSELECT ' + cols + '\n  FROM member' + (w ? '\n WHERE ' + w : '') + { none: '', oname: '\n ORDER BY name', oage: '\n ORDER BY age', gage: '\n GROUP BY age' }[c.tail] + ';';
  },
  label: function (c) {
    if (c.w === 'join') return '조인 (orders, member)';
    return (this.WHERE[c.w] || '조건 없음') + ' · ' + (c.tail === 'gage' ? 'age, COUNT(*)' : c.sel === 'cov' ? 'id, name' : 'SELECT *') + { none: '', oname: ' · ORDER BY name', oage: ' · ORDER BY age', gage: ' · GROUP BY age' }[c.tail];
  },
  columns: ['type', 'possible_keys', 'key', 'rows (예상 행 수)', 'Extra'],
  // 실행 계획의 각 칸. 한 줄이 테이블 하나다.
  plan: function (c) {
    if (c.w === 'join') return [{ table: 'o', type: 'ALL', pkeys: 'NULL', key: 'NULL', ref: 'NULL', rows: 'all', extra: [] }, { table: 'm', type: 'eq_ref', pkeys: 'PRIMARY', key: 'PRIMARY', ref: 'o.member_id', rows: 'one', extra: [] }];
    var w = c.w, grp = c.tail === 'gage', star = !grp && c.sel === 'star';
    // 이 쿼리에 필요한 컬럼이 모두 idx_name 인덱스(name과 기본 키 id) 안에 있으면 테이블을 읽지 않아도 된다
    var cover = !(star || grp || c.tail === 'oage' || w === 'noidx');
    var type, pkeys = 'NULL', key = 'NULL', rows = 'all', extra = [];
    if (w === 'pk') { type = 'const'; pkeys = key = 'PRIMARY'; rows = 'one'; }
    else if (w === 'eq') { type = 'ref'; pkeys = key = 'idx_name'; rows = 'few'; }
    else if (w === 'prefix') { type = 'range'; pkeys = key = 'idx_name'; rows = 'few'; }
    else if (w === 'noidx') type = 'ALL';
    else { type = cover ? 'index' : 'ALL'; if (cover) key = 'idx_name'; }
    if (type !== 'const') {
      var ageFixed = w === 'noidx';   // WHERE age = 30이면 age가 한 값이라 정렬도 묶기도 필요 없다
      if (w === 'prefix') extra.push(cover ? 'Using where' : 'Using index condition');
      if (w === 'suffix' || w === 'func' || w === 'noidx') extra.push('Using where');
      if (cover) extra.push('Using index');
      if (grp && !ageFixed) extra.push('Using temporary');
      if (c.tail === 'oage' && !ageFixed) extra.push('Using filesort');
      if (c.tail === 'oname' && type === 'ALL') extra.push('Using filesort');
    }
    return [{ table: 'member', type: type, pkeys: pkeys, key: key, ref: type === 'const' || type === 'ref' ? 'const' : 'NULL', rows: rows, extra: extra, cover: cover }];
  },
  rowsText: function (c, r) { return r.rows === 'one' ? '1' : r.rows === 'few' ? (c.w === 'eq' ? '약 2' : '약 200') : '약 20,000'; },
  rowsCol: function (c, r) { return r.rows === 'one' ? '1행' : r.rows === 'few' ? '일부 (' + (c.w === 'eq' ? '약 2행' : '약 200행') + ')' : '테이블 전체 (약 2만 행)'; },
  TYPE: {
    const: '기본 키나 유니크 인덱스에 값 하나를 "="로 주어, 맞는 행이 많아야 한 행임이 보장되는 경우입니다. 한 번 찾으면 끝나는 가장 빠른 접근입니다.',
    ref: '유니크가 아닌 인덱스에 "=" 조건을 준 경우입니다. 값이 같은 행이 여러 개일 수 있으므로, 인덱스에서 그 값이 시작되는 곳을 찾아 같은 값이 이어지는 동안 읽습니다.',
    range: '인덱스의 한 구간만 읽습니다. 인덱스는 정렬돼 있으므로 구간의 시작과 끝을 찾을 수 있습니다. BETWEEN, 부등호, IN, 앞부분이 정해진 LIKE가 여기에 해당합니다.',
    index: '인덱스 하나를 처음부터 끝까지 읽습니다(인덱스 풀 스캔). 이름과 달리 인덱스로 범위를 좁혔다는 뜻이 아닙니다. 전부 읽는다는 점은 ALL과 같고, 테이블 대신 그보다 작은 인덱스를 읽는다는 점만 다릅니다.',
    ALL: '테이블의 모든 행을 처음부터 끝까지 읽습니다(풀 테이블 스캔). 행이 많은 테이블에서 몇 행만 찾는데 ALL이 나오면 가장 먼저 의심할 곳입니다.',
  },
  EXTRA: {
    'Using where': '읽어 온 행을 WHERE 조건으로 하나씩 확인해 걸러낸다는 뜻입니다.',
    'Using index': '테이블에는 가지 않고 인덱스만 읽어서 끝낸다는 뜻입니다(커버링 인덱스). "인덱스를 썼다"가 아니라 "인덱스만 읽었다"는 표시이며, 필요한 컬럼이 모두 인덱스 안에 있을 때 나옵니다.',
    'Using index condition': '인덱스에서 읽은 항목을, 테이블로 찾아가기 전에 인덱스에 들어 있는 값으로 먼저 조건을 확인한다는 뜻입니다(인덱스 컨디션 푸시다운). 테이블을 찾아가는 횟수를 줄여 줍니다.',
    'Using filesort': '결과를 ORDER BY 순서로 내보내려고 따로 정렬 작업을 한다는 뜻입니다. 이름과 달리 꼭 파일을 쓰는 것은 아니고 메모리에서 끝나기도 하지만, 정렬할 행이 많으면 부담이 됩니다.',
    'Using temporary': 'GROUP BY를 처리하려고 임시 테이블을 만든다는 뜻입니다. 읽어 온 행을 값별로 모아 세기 위한 작업 공간입니다.',
  },
  simulate: function (c) {
    var p = this.plan(c), ev = [], sum = [], self = this, st = { a: 0, b: 0, ex: 0, cur: '', line: 0 };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function col(f) { return p.length > 1 ? p.map(function (r) { return r.table + ': ' + f(r); }).join(' / ') : f(p[0]); }
    var row = [col(function (r) { return r.type; }), col(function (r) { return r.pkeys; }), col(function (r) { return r.key; }), col(function (r) { return self.rowsCol(c, r); }), col(function (r) { return r.extra.join('; ') || '(없음)'; })];
    if (c.w === 'join') {
      push('EXPLAIN을 붙여 실행합니다: 쿼리를 실제로 실행하지 않고 실행 계획만 돌려줍니다. 테이블 두 개를 조인하므로 두 줄이 나옵니다. 위 줄의 테이블을 먼저 읽고, 그 행마다 아래 줄의 테이블을 찾아갑니다.');
      st.a = 3; st.cur = 'type';
      push('첫째 줄 (orders, 별칭 o)의 type 칸은 ALL입니다: ' + this.TYPE.ALL + ' orders에는 조건이 없으므로 2만 행을 모두 읽습니다. key는 NULL, rows는 약 20,000입니다.');
      st.b = 1; st.line = 1;
      push('둘째 줄 (member, 별칭 m)의 type 칸은 eq_ref입니다: 앞 테이블의 행 하나마다 이 테이블에서 정확히 한 행만 찾는다는 뜻입니다. 조인 조건의 m.id가 기본 키라서, 주문 하나에 맞는 회원은 많아야 한 명임이 보장됩니다. const와 같은 "한 행 찾기"를 앞 테이블의 행마다 되풀이하는 것으로, 조인에서 가장 좋은 type입니다.', 'good');
      st.b = 3; st.cur = 'key';
      push('둘째 줄의 key 칸은 PRIMARY, ref 칸은 o.member_id, rows 칸은 1입니다: 기본 키 인덱스를 쓰고, 찾을 값은 앞 테이블 o의 member_id이며, 한 번 찾을 때 한 행을 읽는다는 뜻입니다.');
      st.a = 4; st.b = 4; st.cur = 'extra';
      push('Extra 칸은 두 줄 모두 비어 있습니다: 덧붙일 것이 없다는 뜻입니다. 두 테이블을 어떤 방식으로 짝짓는지는 "조인 알고리즘" 실습에서 다룹니다.');
      st.cur = '';
      sum.push('조인의 EXPLAIN은 위에서 아래로 읽습니다. 아래 줄의 type이 eq_ref나 ref이면 인덱스로 찾아간다는 뜻이고, ALL이면 앞 테이블의 행마다 뒤 테이블을 통째로 읽거나 해시 조인을 쓴다는 뜻입니다.');
      sum.push('type은 대략 const, eq_ref, ref, range, index, ALL 순으로 읽는 양이 늘어납니다. 반드시 왼쪽이어야 하는 것은 아니고, 필요한 행 수에 비해 읽는 행(rows)이 지나치게 많은지를 봅니다.');
      return { events: ev, summary: sum, p: p, match: 20000, row: row };
    }
    var r = p[0], w = c.w, W = this.WHERE[w], match = this.MATCH[w], rt = this.rowsText(c, r);
    push('EXPLAIN을 붙여 실행합니다: 쿼리를 실제로 실행하지 않고 실행 계획만 돌려줍니다. 테이블 하나를 읽는 쿼리라 한 줄이 나옵니다. member 테이블은 2만 행이고' + (w === 'none' ? ' 조건이 없으므로 모든 행이 결과입니다.' : ' 이 조건에 실제로 맞는 행은 ' + match + '행입니다.'));
    var why = w === 'none' ? (r.type === 'index' ? '조건이 없어 전부 읽어야 하는데, 필요한 컬럼(id, name)이 모두 idx_name 인덱스에 들어 있어 테이블 대신 인덱스를 읽습니다. InnoDB의 인덱스에는 기본 키 값이 함께 들어 있습니다.' : 'WHERE 조건이 없어 모든 행이 필요하므로 여기서는 당연한 결과입니다.')
      : w === 'pk' ? 'id는 기본 키이고 값 하나를 주었습니다.'
      : w === 'eq' ? 'idx_name은 유니크가 아닌 인덱스이고, name에 값 하나를 "="로 주었습니다.'
      : w === 'prefix' ? "'user001%'는 user001로 시작하는 이름이라는 뜻이므로, 이름순으로 정렬된 인덱스에서 한 구간이 됩니다."
      : w === 'suffix' ? "name에 인덱스가 있지만 범위를 좁히는 데 쓰지 못했습니다. 인덱스는 이름의 첫 글자부터 차례로 정렬돼 있는데, '%00123'은 앞부분이 무엇이든 될 수 있어 읽기 시작할 곳을 정할 수 없습니다." + (r.type === 'index' ? ' 다만 필요한 컬럼이 모두 인덱스에 있어, 테이블 대신 인덱스 전체를 읽습니다.' : '')
      : w === 'func' ? "name에 인덱스가 있지만 범위를 좁히는 데 쓰지 못했습니다. 인덱스에는 name의 원래 값이 정렬돼 있을 뿐, LEFT(name, 7)을 계산한 결과는 들어 있지 않습니다. 행마다 함수를 계산해 봐야 하므로 읽을 구간을 정할 수 없습니다." + (r.type === 'index' ? ' 다만 필요한 컬럼이 모두 인덱스에 있어, 테이블 대신 인덱스 전체를 읽습니다.' : '')
      : 'age 컬럼에는 인덱스가 없으므로 모든 행을 읽으며 age를 확인하는 수밖에 없습니다.';
    st.a = 1; st.cur = 'type';
    push('type 칸은 ' + r.type + '입니다: ' + this.TYPE[r.type] + ' ' + why, r.type === 'ALL' && w !== 'none' ? 'bad' : r.type === 'index' || r.type === 'ALL' ? '' : 'good');
    st.a = 2; st.cur = 'key';
    push('possible_keys 칸과 key 칸: possible_keys는 조건에 쓸 수 있다고 본 인덱스 후보이고, key는 실제로 고른 인덱스입니다. ' + (r.key === 'NULL' ? '둘 다 NULL이므로 인덱스를 쓰지 않습니다.' + (w === 'suffix' || w === 'func' ? ' name에 인덱스가 있는데도 후보에조차 오르지 못했습니다.' : '') : r.pkeys === 'NULL' ? 'possible_keys는 NULL인데 key는 idx_name입니다. 조건으로 행을 찾는 데 쓸 후보는 없지만, 테이블 대신 읽을 대상으로 이 인덱스를 골랐다는 뜻입니다.' : '둘 다 ' + r.key + (r.key === 'PRIMARY' ? '(기본 키)' : '') + '입니다.'));
    st.a = 3; st.cur = 'rows';
    var whole = r.type === 'index' ? '인덱스 전체' : '테이블 전체';
    push('rows 칸은 ' + rt + '입니다: 읽어야 할 것으로 예상한 행 수입니다. ' + (r.rows === 'one' ? '한 행만 읽습니다.' : '실제로 세어 본 값이 아니라 통계로 추정한 값이라 조금씩 다를 수 있습니다. ' + (r.rows === 'all' ? (w === 'none' ? whole + '를 읽습니다.' : '결과는 ' + match + '행인데 ' + whole + '를 읽는다는 뜻입니다. 읽고 나서 버리는 행이 대부분입니다.') : '2만 행 가운데 조건에 맞는 부분만 읽습니다.')), r.rows === 'all' && w !== 'none' ? 'bad' : '');
    st.a = 4; st.cur = 'extra';
    if (!r.extra.length) push('Extra 칸은 비어 있습니다: 덧붙일 것이 없다는 뜻입니다.' + (r.type === 'const' ? ' 한 행만 읽으므로 걸러내기도 정렬도 필요 없습니다.' : ''));
    r.extra.forEach(function (x, i) {
      st.ex = i + 1;
      var more = '';
      if (x === 'Using where' && (r.type === 'ALL' || r.type === 'index')) more = ' 인덱스로 범위를 좁히지 못한 조건이 있다는 표시입니다. type이 ' + r.type + '인데 이 표시가 있으면 "전부 읽은 뒤 조건에 맞지 않는 행을 버린다"는 뜻입니다.';
      if (x === 'Using where' && r.type === 'range') more = ' 여기서는 인덱스의 한 구간에서 읽은 항목을 조건으로 한 번 더 확인하는 것이라, 읽는 양이 늘지는 않습니다.';
      if (x === 'Using filesort' && c.tail === 'oage') more = ' age에는 인덱스가 없어, 읽어 온 행을 age 순으로 직접 정렬해야 합니다.';
      if (x === 'Using filesort' && c.tail === 'oname') more = ' name에는 인덱스가 있지만, 인덱스 순서로 읽으려면 인덱스의 2만 개 항목마다 테이블을 찾아가야 합니다. 옵티마이저는 테이블을 한 번 훑고 따로 정렬하는 쪽이 싸다고 판단했습니다.';
      if (x === 'Using temporary') more = ' 인덱스가 있는 name으로 묶었다면 인덱스 순서대로 읽으면서 셀 수 있어 임시 테이블이 필요 없습니다.';
      push('Extra 칸의 ' + x + ': ' + self.EXTRA[x] + more, x === 'Using index' ? 'good' : (x === 'Using filesort' || x === 'Using temporary') && r.rows === 'all' ? 'bad' : '');
    });
    // ORDER BY나 GROUP BY가 있는데 정렬이나 임시 테이블 표시가 없는 경우, 그 이유
    var sortTag = c.tail === 'gage' ? 'Using temporary' : 'Using filesort';
    if (c.tail !== 'none' && r.extra.indexOf(sortTag) < 0) {
      var reason = r.type === 'const' ? '결과가 한 행뿐이라 ' + (c.tail === 'gage' ? '묶을' : '정렬할') + ' 것이 없습니다.'
        : c.tail === 'oname' ? (w === 'eq' ? 'WHERE에서 name이 한 값으로 정해져 있어 정렬할 것이 없습니다.' : 'idx_name 인덱스가 이미 name 순서로 정렬돼 있어, 인덱스를 읽은 순서가 곧 정렬된 순서입니다.')
        : c.tail === 'oage' ? 'WHERE age = 30으로 age가 한 값이라 정렬할 것이 없습니다.' : 'WHERE age = 30으로 age가 한 값이라 묶음이 하나뿐입니다.';
      push({ oname: 'ORDER BY name', oage: 'ORDER BY age', gage: 'GROUP BY age' }[c.tail] + ' 절이 있는데 Extra에 ' + sortTag + '가 없습니다: ' + reason + ' 따로 ' + (c.tail === 'gage' ? '임시 테이블을 만들지' : '정렬하지') + ' 않습니다.', 'good');
    }
    st.cur = '';
    if (w === 'func') sum.push("인덱스가 있는 컬럼이라도 함수나 계산을 씌우면 인덱스로 범위를 좁히지 못합니다. 컬럼은 그대로 두고 비교할 값 쪽을 바꿔 쓰는 것이 원칙입니다. 여기서는 name LIKE 'user001%'가 같은 뜻이면서 type range가 됩니다.");
    if (w === 'suffix') sum.push("앞에 %가 붙은 LIKE는 인덱스의 정렬 순서를 이용할 수 없습니다. '무엇으로 시작하는가'는 인덱스로 찾을 수 있지만 '무엇으로 끝나는가'와 '무엇을 포함하는가'는 전부 읽어야 압니다.");
    if (w === 'prefix') sum.push('앞부분이 정해진 LIKE는 인덱스의 한 구간이 되어 type range로 읽습니다. 2만 행 가운데 200행만 읽습니다.');
    if (w === 'eq') sum.push('유니크가 아닌 인덱스에 "=" 조건이면 type ref입니다. 같은 조건이 기본 키나 유니크 인덱스에 걸리면 const가 됩니다.');
    if (w === 'pk') sum.push('기본 키에 값 하나를 주면 type const입니다. 한 행만 읽으므로 ORDER BY나 GROUP BY가 붙어도 Extra에 아무것도 나오지 않습니다.');
    if (w === 'noidx') sum.push('조건에 쓴 컬럼에 인덱스가 없으면 type ALL에 Using where가 붙습니다. 400행을 얻으려고 2만 행을 읽습니다. 자주 쓰는 조건이라면 그 컬럼에 인덱스를 만들 것을 검토합니다.');
    if (r.type === 'index') sum.push('type index는 "인덱스를 잘 탔다"가 아니라 "인덱스 전체를 읽었다"는 뜻입니다. rows가 테이블 전체에 가까운 것으로 알 수 있습니다. 조회 컬럼을 SELECT *로 바꾸면 인덱스만으로는 부족해져 type이 ALL이 됩니다.');
    if (r.extra.indexOf('Using filesort') >= 0) sum.push('Using filesort는 정렬 작업이 따로 필요하다는 표시입니다. 몇 행만 정렬하면 문제가 없지만, rows가 큰데 filesort가 붙으면 읽은 행 전부를 정렬합니다.');
    if (r.extra.indexOf('Using temporary') >= 0) sum.push('Using temporary는 임시 테이블을 만든다는 표시입니다. 인덱스가 없는 컬럼으로 GROUP BY를 할 때 흔히 나옵니다.');
    sum.push('읽는 순서: type으로 얼마나 넓게 읽는지 보고, key로 어떤 인덱스를 쓰는지 확인하고, rows로 읽는 양을 가늠한 뒤, Extra에서 걸러내기, 정렬, 임시 테이블 같은 덧붙은 작업을 봅니다.');
    return { events: ev, summary: sum, p: p, match: match, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, p = sim.p, self = this, last = shown[shown.length - 1], s = last ? last.snap : null, join = c.w === 'join';
    if (!s) { H.text(v, '실행을 누르면 EXPLAIN 결과를 한 칸씩 읽습니다.'); return; }
    function cell(lv, need, key, val) { return { v: lv >= need ? val : '?', cls: lv >= need && s.cur === key ? 'hot' : '' }; }
    var rows = p.map(function (r, i) {
      var lv = i === 0 ? s.a : s.b, here = !join || s.line === i || s.cur === 'extra';
      function cl(need, key, val) { var x = cell(lv, need, key, val); if (!here) x.cls = ''; return x; }
      var ex = lv >= 4 ? (join ? '' : r.extra.slice(0, s.ex).join('; ')) : '?';
      return { cells: [r.table, cl(1, 'type', r.type), cl(2, 'key', r.pkeys), cl(2, 'key', r.key)].concat(join ? [cl(2, 'key', r.ref)] : []).concat([cl(3, 'rows', self.rowsText(c, r)), { v: ex, cls: lv >= 4 && s.cur === 'extra' ? 'hot' : '' }]) };
    });
    if (join) H.table(v, ['table', 'type', 'possible_keys', 'key'].concat(join ? ['ref'] : []).concat(['rows', 'Extra']), rows, 'EXPLAIN 결과 (주요 칸만)');
    if (!join && s.a >= 3) H.counters(v, [[String(sim.match).replace(/\B(?=(\d{3})+(?!\d))/g, ','), '조건에 실제로 맞는 행'], [this.rowsText(c, p[0]), '읽을 것으로 예상한 행 (rows)']]);
    if (join && s.b >= 3) H.counters(v, [['약 20,000', 'o에서 읽는 행'], ['1', 'o의 행마다 m에서 읽는 행']]);
    H.text(v, 'rows는 통계로 추정한 값이라 실행할 때마다 조금씩 다를 수 있습니다. 여기 적힌 수는 이 PC에서 본 값을 어림한 것입니다.');
  },
  // 그림: 위쪽에 EXPLAIN이 돌려준 줄을 칸별 상자로 놓고 지금 읽는 칸을 강조한다. 아래쪽에는 type 값을 읽는 양이 적은 것부터 늘어놓고 이 쿼리의 type을 표시한다.
  draw: function (P, sim, shown) {
    var c = sim.c, p = sim.p, self = this, last = shown[shown.length - 1], s = last ? last.snap : { a: -1, b: -1, ex: 0, cur: '', line: 0 }, join = c.w === 'join';
    P.size(680, 320);
    P.region('ex', 16, 16, 648, 150, join ? 'EXPLAIN 결과 두 줄 (위 줄의 테이블을 먼저 읽는다)' : 'EXPLAIN 결과 한 줄');
    var X = [28, 130, 232, 372, 512], Wd = [96, 96, 134, 134, 140];
    function cells(r, lv, y, tag, here) {
      var names = join ? ['table', 'type', 'key', 'ref', 'rows'] : ['table', 'type', 'possible_keys', 'key', 'rows'];
      var vals = join ? [r.table, r.type, r.key, r.ref, self.rowsText(c, r)] : [r.table, r.type, r.pkeys, r.key, self.rowsText(c, r)];
      var need = join ? [0, 1, 2, 2, 3] : [0, 1, 2, 2, 3], keyOf = join ? ['', 'type', 'key', 'key', 'rows'] : ['', 'type', 'key', 'key', 'rows'];
      names.forEach(function (n, i) {
        var on = lv >= need[i], cur = on && here && keyOf[i] && s.cur === keyOf[i] && lv === need[i];
        var bad = n === 'type' && (r.type === 'ALL') && c.w !== 'none' && !join, good = n === 'type' && ['const', 'eq_ref', 'ref', 'range'].indexOf(r.type) >= 0;
        P.box(tag + i, X[i], y, Wd[i], 48, { cls: (!on ? 'ghost' : cur ? (bad ? 'bad' : 'hot') : i === 0 ? 'plain' : bad ? 'bad' : good ? 'good' : 'wait') + (cur ? ' now' : ''), title: n, sub: on ? vals[i] : '?' });
      });
    }
    cells(p[0], s.a, 46, 'a', !join || s.line === 0);
    if (join) cells(p[1], s.b, 104, 'b', s.line === 1);
    else {
      var r = p[0], on = s.a >= 4, txt = on ? (r.extra.slice(0, s.ex).join('; ') || '(비어 있음)') : '?', warn = on && r.extra.slice(0, s.ex).some(function (x) { return x === 'Using filesort' || x === 'Using temporary'; });
      P.box('extra', 28, 104, 624, 48, { cls: (!on ? 'ghost' : s.cur === 'extra' ? 'hot' : warn ? 'hot' : 'wait') + (on && s.cur === 'extra' ? ' now' : ''), title: 'Extra', sub: txt });
    }
    P.region('sc', 16, 180, 648, 124, '접근 방법(type): 왼쪽일수록 적게 읽는다');
    var types = [['const', '한 행'], ['eq_ref', '행마다 한 행'], ['ref', '같은 값들'], ['range', '한 구간'], ['index', '인덱스 전체'], ['ALL', '테이블 전체']];
    types.forEach(function (tp, i) {
      var mine = p.some(function (r, ri) { return r.type === tp[0] && (ri === 0 ? s.a : s.b) >= 1; });
      P.box('t' + tp[0], 28 + i * 105, 212, 99, 48, { cls: mine ? (i >= 5 ? 'bad' : i === 4 ? 'hot' : 'good') + ' now' : 'plain', title: tp[0], sub: tp[1] });
    });
    P.text('lo', 28, 284, '적게 읽음', { cls: 'mut' });
    P.text('hi', 652, 284, '많이 읽음', { cls: 'mut', anchor: 'end' });
    P.arrow('ax', [100, 280], [580, 280], { cls: 'mut' });
    P.note(join ? '위는 EXPLAIN이 돌려준 두 줄에서 주요 칸만 뽑은 것입니다. 아래는 type에 나올 수 있는 값을 읽는 양이 적은 것부터 늘어놓은 것이고, 이 계획에 나온 type 두 개가 표시됩니다.' : '위는 EXPLAIN이 돌려준 한 줄에서 주요 칸만 뽑은 것입니다. 아래는 type에 나올 수 있는 값을 읽는 양이 적은 것부터 늘어놓은 것이고, 이 쿼리의 type이 표시됩니다. eq_ref는 조인에서만 나옵니다.');
  },
  assume: '쉰 가지 조합 모두, 화면의 SQL을 이 PC의 MySQL 8.4에서 EXPLAIN으로 실행해 type, possible_keys, key, Extra를 글자 그대로 대조했습니다. 테이블에는 member 2만 행(이름 하나에 두 행)과 orders 2만 행을 넣고 ANALYZE TABLE을 한 뒤에 실행했습니다. rows는 통계로 추정하는 값이라 실행할 때마다 조금씩 다르므로(이 PC에서는 전체 스캔일 때 19,700에서 20,400 사이), 1행인지, 일부인지, 테이블 전체에 가까운지만 대조했습니다. 조건에 실제로 맞는 행 수도 같은 데이터에서 세어 확인했습니다. 실행 계획은 옵티마이저가 비용을 계산해 고르는 것이어서, 행 수나 값의 분포가 다르면 같은 쿼리라도 다른 계획이 나올 수 있습니다. 예를 들어 행이 몇 개뿐인 테이블이나 조건에 맞는 행이 아주 많은 경우에는 인덱스가 있어도 ALL이 선택될 수 있습니다(MySQL 문서의 풀 테이블 스캔 설명). Extra에 표시가 없는 이유를 설명한 문장(한 값으로 정해져 있어 정렬이 필요 없다 등)은 MySQL 문서의 ORDER BY 최적화 설명을 따른 풀이입니다. 화면에서는 id, select_type, partitions, key_len, filtered 칸을 뺐습니다.',
});
