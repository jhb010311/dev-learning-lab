Lab.register({
  id: 'constraints', nav: '테이블, 키, 제약 조건', cat: '데이터베이스', mode: 'step',
  title: '제약 조건이 없으면 어떤 데이터가 들어가 버리나',
  intro: '회원(member) 테이블과 주문(orders) 테이블에 잘못된 값을 넣거나, 주문이 남아 있는 회원을 지워 봅니다. 제약 조건을 걸어 둔 테이블은 그 문장을 오류로 거부하고, 걸지 않은 테이블은 그대로 받아들입니다.',
  terms: ['제약 조건', '기본 키, 유니크 키, 외래 키', 'NOT NULL과 CHECK', '외래 키의 참조 동작(ON DELETE)'],
  controls: [
    { id: 'op', label: '실행할 문장', type: 'select', value: 'fkdel', options: [['pkdup', 'INSERT: 이미 있는 id로 회원 추가'], ['pknull', 'INSERT: id가 NULL인 회원 추가'], ['uqdup', 'INSERT: 이미 있는 email로 회원 추가'], ['uqnull', 'INSERT: email이 NULL인 회원을 한 명 더 추가'], ['nnull', 'UPDATE: 회원의 name을 NULL로 변경'], ['check', 'UPDATE: 회원의 age를 -5로 변경'], ['fkins', 'INSERT: 없는 회원(99번)의 주문 추가'], ['fkdel', 'DELETE: 주문이 2건 있는 회원 삭제']] },
    { id: 'con', label: '제약 조건', type: 'select', value: 'off', options: [['off', '걸지 않음 (컬럼 이름과 타입만)'], ['on', '걸어 둠 (기본 키, 유니크, NOT NULL, CHECK, 외래 키)']] },
    { id: 'act', label: '외래 키의 ON DELETE 동작', type: 'select', value: 'restrict', options: [['restrict', 'RESTRICT (자식이 있으면 삭제를 거부)'], ['cascade', 'CASCADE (자식도 함께 삭제)'], ['setnull', 'SET NULL (자식의 외래 키를 NULL로)']], hint: '부모(회원)를 지울 때 그 회원을 가리키는 자식(주문)을 어떻게 할지 정합니다.', show: function (c) { return c.op === 'fkdel' && c.con === 'on'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '제약 없이 회원을 삭제합니다. 주인이 없는 주문 2건이 남습니다.', v: { op: 'fkdel', con: 'off', act: 'restrict' } },
    { t: '외래 키 RESTRICT', d: '주문이 남아 있는 회원은 지울 수 없습니다(오류 1451).', v: { op: 'fkdel', con: 'on', act: 'restrict' } },
    { t: '외래 키 CASCADE', d: '회원을 지우면 그 회원의 주문도 함께 지워집니다.', v: { op: 'fkdel', con: 'on', act: 'cascade' } },
    { t: '외래 키 SET NULL', d: '주문은 남고, 회원을 가리키던 칸만 NULL이 됩니다.', v: { op: 'fkdel', con: 'on', act: 'setnull' } },
    { t: '같은 id가 두 번', d: '기본 키가 없으면 id 1인 회원이 두 명이 됩니다.', v: { op: 'pkdup', con: 'off', act: 'restrict' } },
    { t: '없는 회원의 주문', d: '외래 키가 없는 부모를 가리키는 주문을 막습니다(오류 1452).', v: { op: 'fkins', con: 'on', act: 'restrict' } },
    { t: '유니크와 NULL', d: '유니크를 걸어도 NULL은 여러 행에 들어갑니다.', v: { op: 'uqnull', con: 'on', act: 'restrict' } },
  ],
  ACT: { restrict: 'RESTRICT', cascade: 'CASCADE', setnull: 'SET NULL' },
  STMT: {
    pkdup: "INSERT INTO member (id, email, name, age)\nVALUES (1, 'choi@lab.example', '최지우', 22)",
    pknull: "INSERT INTO member (id, email, name, age)\nVALUES (NULL, 'choi@lab.example', '최지우', 22)",
    uqdup: "INSERT INTO member (id, email, name, age)\nVALUES (4, 'kim@lab.example', '최지우', 22)",
    uqnull: "INSERT INTO member (id, email, name, age)\nVALUES (4, NULL, '최지우', 22)",
    nnull: 'UPDATE member SET name = NULL WHERE id = 2',
    check: 'UPDATE member SET age = -5 WHERE id = 2',
    fkins: "INSERT INTO orders (id, member_id, item)\nVALUES (104, 99, '의자')",
    fkdel: 'DELETE FROM member WHERE id = 1',
  },
  // 확인 조회: [SQL, 무엇을 세는지, 단위, 이 수 이상이면 어긋난 데이터]
  CHECK: {
    pkdup: ['SELECT COUNT(*) FROM member WHERE id = 1', 'id가 1인 회원', '명', 2],
    pknull: ['SELECT COUNT(*) FROM member WHERE id IS NULL', 'id가 NULL인 회원', '명', 1],
    uqdup: ["SELECT COUNT(*) FROM member WHERE email = 'kim@lab.example'", 'email이 같은 회원', '명', 2],
    uqnull: ['SELECT COUNT(*) FROM member WHERE email IS NULL', 'email이 NULL인 회원', '명', 99],
    nnull: ['SELECT COUNT(*) FROM member WHERE name IS NULL', 'name이 NULL인 회원', '명', 1],
    check: ['SELECT COUNT(*) FROM member WHERE age < 0', 'age가 음수인 회원', '명', 1],
    fk: ['SELECT COUNT(*)\n  FROM orders o\n  LEFT JOIN member m ON m.id = o.member_id\n WHERE o.member_id IS NOT NULL AND m.id IS NULL', '회원이 없는 주문', '건', 1],
  },
  chk: function (c) { return this.CHECK[c.op === 'fkins' || c.op === 'fkdel' ? 'fk' : c.op]; },
  // 화면의 코드와 대조 프로그램(verify/mysql/constraints_probe.js)이 함께 쓰는 SQL. 대조 프로그램은 이 문장들을 실제 MySQL에서 그대로 실행한다.
  plan: function (c) {
    var on = c.con === 'on';
    var ddl = on
      ? ['CREATE TABLE member (\n  id    INT PRIMARY KEY,\n  email VARCHAR(50) UNIQUE,\n  name  VARCHAR(20) NOT NULL,\n  age   INT CHECK (age >= 0)\n)',
         'CREATE TABLE orders (\n  id        INT PRIMARY KEY,\n  member_id INT,\n  item      VARCHAR(30) NOT NULL,\n  FOREIGN KEY (member_id) REFERENCES member (id)\n    ON DELETE ' + this.ACT[c.act] + '\n)']
      : ['CREATE TABLE member (\n  id    INT,\n  email VARCHAR(50),\n  name  VARCHAR(20),\n  age   INT\n)',
         'CREATE TABLE orders (\n  id        INT,\n  member_id INT,\n  item      VARCHAR(30)\n)'];
    var seed = ["INSERT INTO member (id, email, name, age) VALUES\n  (1, 'kim@lab.example', '김철수', 30),\n  (2, 'lee@lab.example', '이영희', 25),\n  (3, NULL, '박민수', 41)",
                "INSERT INTO orders (id, member_id, item) VALUES\n  (101, 1, '키보드'),\n  (102, 1, '마우스'),\n  (103, 2, '모니터')"];
    return { ddl: ddl, seed: seed, stmt: this.STMT[c.op], check: this.chk(c)[0] };
  },
  code: function (c) {
    var p = this.plan(c);
    return (c.con === 'on' ? '-- 제약 조건을 걸어 둔 테이블\n' : '-- 제약 조건을 걸지 않은 테이블\n') + p.ddl.join(';\n') + ';\n\n-- 처음 데이터\n' + p.seed.join(';\n') + ';\n\n-- 실행할 문장\n' + p.stmt + ';\n\n-- 확인 조회\n' + p.check + ';';
  },
  label: function (c) { return { pkdup: '같은 id 추가', pknull: 'id NULL 추가', uqdup: '같은 email 추가', uqnull: 'email NULL 추가', nnull: 'name을 NULL로', check: 'age를 -5로', fkins: '없는 회원의 주문', fkdel: '주문 있는 회원 삭제' }[c.op] + ' · ' + (c.con === 'on' ? '제약 있음' + (c.op === 'fkdel' ? ' (' + this.ACT[c.act] + ')' : '') : '제약 없음'); },
  columns: ['문장의 결과', '바뀐 행', '끝난 뒤 행 수', '확인 조회'],
  // 문장 하나를 테이블에 적용한다. 제약이 있으면 MySQL과 같은 오류 번호로 거부한다.
  run: function (c) {
    var on = c.con === 'on', M = [[1, 'kim@lab.example', '김철수', 30], [2, 'lee@lab.example', '이영희', 25], [3, null, '박민수', 41]], O = [[101, 1, '키보드'], [102, 1, '마우스'], [103, 2, '모니터']];
    var r = { err: null, rule: '', affected: 0, mark: {}, gone: {}, kids: [] };
    function fail(no, msg, rule) { r.err = { no: no, msg: msg }; r.rule = rule; }
    function checkMember(row, self) {
      if (!on) return true;
      if (row[0] === null) { fail(1048, "Column 'id' cannot be null", 'PRIMARY KEY (id)'); return false; }
      if (row[2] === null) { fail(1048, "Column 'name' cannot be null", 'NOT NULL (name)'); return false; }
      if (row[3] !== null && row[3] < 0) { fail(3819, "Check constraint 'member_chk_1' is violated.", 'CHECK (age >= 0)'); return false; }
      if (M.some(function (m) { return m !== self && m[0] === row[0]; })) { fail(1062, "Duplicate entry '" + row[0] + "' for key 'member.PRIMARY'", 'PRIMARY KEY (id)'); return false; }
      if (row[1] !== null && M.some(function (m) { return m !== self && m[1] === row[1]; })) { fail(1062, "Duplicate entry '" + row[1] + "' for key 'member.email'", 'UNIQUE (email)'); return false; }
      return true;
    }
    function insMember(row) { if (checkMember(row, null)) { M.push(row); r.affected = 1; r.mark['m' + (M.length - 1)] = 1; } }
    function updMember(id, col, val) { var t = M.filter(function (m) { return m[0] === id; })[0], n = t.slice(); n[col] = val; if (checkMember(n, t)) { t[col] = val; r.affected = 1; r.mark['m' + M.indexOf(t) + ':' + col] = 1; } }
    if (c.op === 'pkdup') { r.rule = 'PRIMARY KEY (id)'; insMember([1, 'choi@lab.example', '최지우', 22]); }
    if (c.op === 'pknull') { r.rule = 'PRIMARY KEY (id)'; insMember([null, 'choi@lab.example', '최지우', 22]); }
    if (c.op === 'uqdup') { r.rule = 'UNIQUE (email)'; insMember([4, 'kim@lab.example', '최지우', 22]); }
    if (c.op === 'uqnull') { r.rule = 'UNIQUE (email)'; insMember([4, null, '최지우', 22]); }
    if (c.op === 'nnull') { r.rule = 'NOT NULL (name)'; updMember(2, 2, null); }
    if (c.op === 'check') { r.rule = 'CHECK (age >= 0)'; updMember(2, 3, -5); }
    if (c.op === 'fkins') {
      r.rule = 'FOREIGN KEY (member_id)';
      if (on && !M.some(function (m) { return m[0] === 99; })) fail(1452, 'Cannot add or update a child row: a foreign key constraint fails', r.rule);
      else { O.push([104, 99, '의자']); r.affected = 1; r.mark.o3 = 1; }
    }
    if (c.op === 'fkdel') {
      r.rule = 'FOREIGN KEY (member_id)';
      O.forEach(function (o, i) { if (o[1] === 1) r.kids.push(i); });
      if (on && c.act === 'restrict' && r.kids.length) fail(1451, 'Cannot delete or update a parent row: a foreign key constraint fails', r.rule);
      else {
        r.gone.m0 = 1; r.affected = 1;
        if (on && c.act === 'cascade') r.kids.forEach(function (i) { r.gone['o' + i] = 1; });
        if (on && c.act === 'setnull') r.kids.forEach(function (i) { O[i][1] = null; r.mark['o' + i + ':1'] = 1; });
      }
    }
    r.M = M; r.O = O;
    r.liveM = M.filter(function (m, i) { return !r.gone['m' + i]; }); r.liveO = O.filter(function (o, i) { return !r.gone['o' + i]; });
    return r;
  },
  count: function (c, M, O) {
    var f = { pkdup: function (m) { return m[0] === 1; }, pknull: function (m) { return m[0] === null; }, uqdup: function (m) { return m[1] === 'kim@lab.example'; }, uqnull: function (m) { return m[1] === null; }, nnull: function (m) { return m[2] === null; }, check: function (m) { return m[3] !== null && m[3] < 0; } }[c.op];
    if (f) return M.filter(f).length;
    return O.filter(function (o) { return o[1] !== null && !M.some(function (m) { return m[0] === o[1]; }); }).length;
  },
  simulate: function (c) {
    var on = c.con === 'on', self = this, r = this.run(c), ck = this.chk(c), ev = [], sum = [], first = this.STMT[c.op].replace(/\n/g, ' ');
    var before = this.run({ op: 'none', con: c.con, act: c.act });
    function nul(x) { return x === null ? 'NULL' : String(x); }
    function view(res, phase) {
      // phase 0: 처음 상태, 1: 문장이 도착(아직 적용 전), 2: 적용 뒤
      var src = phase === 2 ? res : before;
      return { m: src.M.map(function (m, i) { return { cells: m.map(nul), gone: phase === 2 && !!res.gone['m' + i], isNew: phase === 2 && !!res.mark['m' + i], hot: m.map(function (x, j) { return phase === 2 && !!res.mark['m' + i + ':' + j]; }) }; }),
               o: src.O.map(function (o, i) { return { cells: o.map(nul), gone: phase === 2 && !!res.gone['o' + i], isNew: phase === 2 && !!res.mark['o' + i], hot: o.map(function (x, j) { return phase === 2 && !!res.mark['o' + i + ':' + j]; }) }; }) };
    }
    var st = { stmt: '', gate: '', gateK: '', chk: '', chkBad: false };
    function push(s, k, phase) { var v = view(r, phase); ev.push({ s: s, k: k, snap: { m: v.m, o: v.o, stmt: st.stmt, gate: st.gate, gateK: st.gateK, chk: st.chk, chkBad: st.chkBad } }); }
    push(on ? 'CREATE TABLE, INSERT: 테이블 두 개를 만들고 회원 3명과 주문 3건을 넣었습니다. member에는 기본 키(id), 유니크(email), NOT NULL(name), CHECK(age >= 0)가 걸려 있고, orders에는 기본 키(id)와 member의 id를 가리키는 외래 키(member_id)가 걸려 있습니다.' : 'CREATE TABLE, INSERT: 테이블 두 개를 만들고 회원 3명과 주문 3건을 넣었습니다. 컬럼의 이름과 타입만 정했고 제약 조건은 하나도 걸지 않았습니다. orders의 member_id가 회원 번호라는 것은 사람만 알고 DB는 모릅니다.', '', 0);
    var what = { pkdup: 'id가 1인 회원 최지우를 넣으려 합니다. id 1은 이미 김철수가 쓰고 있습니다.', pknull: 'id를 비워 둔(NULL) 회원 최지우를 넣으려 합니다.', uqdup: 'email이 kim@lab.example인 회원 최지우를 넣으려 합니다. 이 email은 이미 김철수가 쓰고 있습니다.', uqnull: 'email을 비워 둔(NULL) 회원 최지우를 넣으려 합니다. 박민수의 email도 이미 NULL입니다.', nnull: '회원 2(이영희)의 name을 NULL로 바꾸려 합니다.', check: '회원 2(이영희)의 age를 -5로 바꾸려 합니다. 나이로는 말이 안 되는 값입니다.', fkins: '회원 99의 주문을 넣으려 합니다. member 테이블에 id가 99인 회원은 없습니다.', fkdel: '회원 1(김철수)을 지우려 합니다. orders에는 회원 1을 가리키는 주문이 2건(101, 102) 있습니다.' }[c.op];
    st.stmt = 'wait';
    push(first + ': ' + what, '', 1);
    var okWhy = { pkdup: '1행이 들어갔습니다.', pknull: '1행이 들어갔습니다.', uqdup: '1행이 들어갔습니다.', uqnull: '1행이 들어갔습니다.', nnull: '1행이 바뀌었습니다.', check: '1행이 바뀌었습니다.', fkins: '1행이 들어갔습니다.', fkdel: 'member에서 1행이 지워졌습니다. orders는 건드리지 않았습니다.' }[c.op];
    if (!on) {
      st.stmt = 'ok'; st.gate = '제약이 없어 검사하지 않음'; st.gateK = 'none';
      push('검사할 제약 조건이 없습니다: DB는 값이 타입에 맞는지만 보고 문장을 그대로 실행합니다. ' + okWhy, c.op === 'uqnull' ? '' : 'bad', 2);
    } else if (r.err) {
      st.stmt = 'err'; st.gate = '거부: 오류 ' + r.err.no; st.gateK = 'block';
      var why = { pkdup: '기본 키는 행마다 값이 달라야 합니다. id 1이 이미 있으므로', pknull: '기본 키는 비어 있을 수 없습니다(기본 키에는 NOT NULL이 함께 걸립니다). id가 NULL이므로', uqdup: '유니크가 걸린 컬럼에는 같은 값이 두 번 들어갈 수 없습니다. 같은 email이 이미 있으므로', nnull: 'NOT NULL이 걸린 컬럼은 비워 둘 수 없으므로', check: 'CHECK에 적어 둔 조건 age >= 0이 거짓이 되므로', fkins: '외래 키의 값은 부모 테이블(member)에 실제로 있는 id여야 합니다. 회원 99가 없으므로', fkdel: 'ON DELETE RESTRICT는 자식(주문)이 남아 있는 부모(회원)의 삭제를 막습니다. 회원 1을 가리키는 주문이 2건 있으므로' }[c.op];
      push(r.rule + ' 검사: ' + why + ' 문장을 거부하고 오류 ' + r.err.no + '(' + r.err.msg + ')를 돌려줍니다. 테이블은 한 행도 바뀌지 않았습니다.', 'good', 2);
    } else if (c.op === 'uqnull') {
      st.stmt = 'ok'; st.gate = '통과'; st.gateK = 'pass';
      push('UNIQUE (email) 검사: 넣으려는 email이 NULL입니다. NULL은 "값이 없음"을 뜻하고, 유니크 제약은 NULL끼리를 같은 값으로 보지 않습니다. 중복이 아니므로 통과하고 1행이 들어갔습니다.', '', 2);
    } else {
      st.stmt = 'ok'; st.gate = 'ON DELETE ' + this.ACT[c.act] + ' 적용'; st.gateK = 'pass';
      push(c.act === 'cascade' ? 'FOREIGN KEY (member_id) 검사: 회원 1을 가리키는 주문이 2건 있습니다. ON DELETE CASCADE이므로 회원 1을 지우면서 그 주문 2건(101, 102)도 함께 지웁니다.' : 'FOREIGN KEY (member_id) 검사: 회원 1을 가리키는 주문이 2건 있습니다. ON DELETE SET NULL이므로 회원 1을 지우면서 그 주문 2건(101, 102)의 member_id를 NULL로 바꿉니다. 주문 행은 남습니다.', '', 2);
      push('MySQL이 알려 주는 바뀐 행 수: 1행입니다. DELETE가 직접 지운 member의 행만 세고, 외래 키 때문에 함께 ' + (c.act === 'cascade' ? '지워진' : '바뀐') + ' orders의 2행은 이 수에 들어가지 않습니다.', '', 2);
    }
    var n = this.count(c, r.liveM, r.liveO), bad = n >= ck[3];
    st.chk = ck[1] + ' ' + n + ck[2]; st.chkBad = bad;
    var mean;
    if (c.op === 'uqnull') mean = (on ? 'email에 유니크를 걸어 두었는데도 NULL은 두 행에 들어갔습니다. 유니크 제약은 NULL이 아닌 값의 중복만 막습니다.' : '제약이 없으니 당연히 들어갑니다. 제약 조건을 걸어 둔 쪽과 비교해 보세요.');
    else if (bad) mean = { pkdup: 'id 1로 회원을 찾으면 두 명이 나옵니다. 이제 id로는 회원 한 명을 정확히 가리킬 수 없습니다.', pknull: 'id가 없는 회원이 생겼습니다. 이 회원은 id로 찾을 수도, 주문에서 가리킬 수도 없습니다.', uqdup: '같은 email을 쓰는 회원이 두 명입니다. email로 회원을 찾으면 누구인지 정할 수 없습니다.', nnull: '이름이 없는 회원이 생겼습니다.', check: '나이가 음수인 회원이 생겼습니다. INT라는 타입만으로는 음수를 막지 못합니다.', fkins: '주문 104는 회원 99의 것이라고 적혀 있는데 그런 회원이 없습니다. 누구의 주문인지 알 수 없는 행입니다.', fkdel: '주문 101과 102에는 member_id 1이 그대로 적혀 있는데 회원 1은 이제 없습니다. 주인이 없는 주문 2건이 남았습니다.' }[c.op];
    else if (c.op === 'fkdel' && !r.err) mean = c.act === 'cascade' ? '없는 회원을 가리키는 주문은 남지 않았습니다. 대신 주문 2건이 함께 사라졌습니다.' : '없는 회원을 가리키는 주문은 없습니다. member_id가 NULL인 주문은 "가리키는 회원이 없는 주문"으로 보며 외래 키에 어긋나지 않습니다.';
    else mean = '문장이 거부되어 데이터는 처음 그대로입니다.';
    push(ck[0].replace(/\s*\n\s*/g, ' ') + ': ' + ck[1] + '의 수를 셉니다. ' + n + ck[2] + '입니다. ' + mean, bad ? 'bad' : c.op === 'uqnull' ? '' : 'good', 2);
    if (!on && c.op !== 'uqnull') sum.push('제약 조건이 없으면 DB는 잘못된 값도 오류 없이 받아들입니다. 문장은 "성공"했는데 데이터는 어긋났고, 그 사실은 나중에 조회했을 때에야 드러납니다. 제약 조건은 이런 값이 테이블에 들어오는 순간에 막아 줍니다.');
    if (on && r.err) sum.push({ pkdup: '기본 키는 "이 값으로 행 하나를 정확히 가리킬 수 있다"는 약속입니다. 그래서 중복도 NULL도 받지 않습니다.', pknull: '기본 키는 유니크와 NOT NULL을 합친 것입니다. 중복도 NULL도 받지 않으며 테이블에 하나만 둘 수 있습니다.', uqdup: '유니크는 기본 키가 아닌 컬럼에서도 값이 겹치지 않게 해 줍니다. email이나 주민 번호처럼 사람마다 달라야 하는 값에 겁니다.', nnull: 'NOT NULL은 반드시 있어야 하는 값이 빠진 채 저장되는 것을 막습니다.', check: 'CHECK는 타입만으로는 표현할 수 없는 값의 범위나 조건을 적어 두는 제약입니다.', fkins: '외래 키는 자식 행이 실제로 있는 부모 행만 가리키게 해 줍니다. 없는 부모를 가리키는 INSERT와 UPDATE를 거부합니다.', fkdel: 'RESTRICT는 가장 안전한 선택입니다. 자식이 남아 있는 한 부모를 지울 수 없으므로, 주문을 먼저 정리해야 회원을 지울 수 있습니다. MySQL에서 ON DELETE를 적지 않았을 때의 동작도 이와 같습니다.' }[c.op]);
    if (c.op === 'uqnull') sum.push('"비어 있어도 되지만, 값이 있다면 겹치면 안 된다"가 유니크 제약의 뜻입니다. NULL까지 막으려면 NOT NULL을 함께 걸어야 하며, 기본 키가 바로 그 둘을 합친 것입니다.');
    if (on && c.op === 'fkdel' && c.act === 'cascade') sum.push('CASCADE는 부모와 함께 자식도 지웁니다. 편리하지만 DELETE 한 줄이 다른 테이블의 행까지 지우므로, 정말로 함께 사라져도 되는 데이터에만 씁니다.');
    if (on && c.op === 'fkdel' && c.act === 'setnull') sum.push('SET NULL은 자식 행을 남기고 부모를 가리키던 칸만 비웁니다. 탈퇴한 회원의 주문 기록을 남겨야 할 때처럼 쓰며, 외래 키 컬럼이 NULL을 받을 수 있어야 합니다.');
    return { events: ev, summary: sum, err: r.err, affected: r.affected, n: n, bad: bad,
      dump: { member: r.liveM.map(function (m) { return m.map(nul).join(','); }).sort().join(';'), orders: r.liveO.map(function (o) { return o.map(nul).join(','); }).sort().join(';') },
      row: [r.err ? '오류 ' + r.err.no : '성공', r.err ? '없음' : r.affected + '행', 'member ' + r.liveM.length + '행, orders ' + r.liveO.length + '행', ck[1] + ' ' + n + ck[2]] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    function rows(list) { return list.map(function (r) { return { cls: r.gone ? 'gone' : '', cells: r.cells.map(function (x, j) { return { v: x, cls: r.hot[j] || r.isNew ? 'hot' : '' }; }) }; }); }
    var ln = H.lanes(v);
    H.lane(ln, '문장', this.STMT[c.op].replace(/\n/g, ' '), s.stmt === 'ok' ? 'hot' : s.stmt === 'err' ? 'wait' : 'none');
    H.table(v, ['id', 'email', 'name', 'age'], rows(s.m), 'member 테이블');
    H.table(v, ['id', 'member_id', 'item'], rows(s.o), 'orders 테이블');
    H.text(v, '노란 칸은 방금 들어오거나 바뀐 값이고, 줄이 그어진 행은 지워진 행입니다.');
  },
  // 그림: 위에 실행할 문장과 제약 검사, 아래에 member와 orders의 행. 주문에서 회원으로 가는 화살표가 member_id가 가리키는 곳이다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, on = c.con === 'on';
    P.size(680, 340);
    P.box('stmt', 16, 14, 648, 36, { cls: !s || !s.stmt ? 'ghost' : s.stmt === 'ok' ? 'hot' : s.stmt === 'err' ? 'wait' : 'plain now', title: this.label(c).split(' · ')[0], right: !s || !s.stmt ? '' : s.stmt === 'ok' ? '실행됨' : s.stmt === 'err' ? '거부됨' : '실행하려는 문장' });
    P.box('gate', 16, 62, 648, 32, { cls: !s || !s.gate ? 'ghost' : s.gateK === 'block' ? 'good' : s.gateK === 'pass' ? 'plain' : 'ghost', title: on ? '제약 검사' : '제약 검사 없음', right: s && s.gate ? s.gate : on ? '' : '컬럼의 타입만 확인' });
    P.arrow('a1', 'stmt:b', 'gate:t', { cls: s && s.stmt ? 'hot' : 'mut' });
    P.region('tm', 16, 106, 372, 180, 'member (부모)');
    P.region('to', 404, 106, 260, 180, 'orders (자식)');
    if (!s) { P.text('hint', 340, 200, '실행을 누르면 시작합니다', { cls: 'mut', anchor: 'middle' }); return; }
    var alive = {};
    s.m.forEach(function (r, i) {
      var x = r.cells, changed = r.isNew || r.hot.some(Boolean);
      if (!r.gone && alive[x[0]] === undefined) alive[x[0]] = i;
      P.box('m' + i, 28, 138 + i * 35, 348, 29, { cls: r.gone ? 'ghost' : changed ? (sim.bad ? 'bad' : 'hot') : 'wait', title: 'id ' + x[0] + ' · ' + x[2] + ' · ' + x[3] + '세' + (r.gone ? ' (삭제됨)' : ''), right: x[1] });
    });
    s.o.forEach(function (r, i) {
      var x = r.cells, target = x[1] === 'NULL' ? undefined : alive[x[1]], orphan = !r.gone && x[1] !== 'NULL' && target === undefined;
      P.box('o' + i, 416, 138 + i * 35, 236, 29, { cls: r.gone ? 'ghost' : orphan ? 'bad' : r.isNew || r.hot.some(Boolean) ? 'hot' : 'plain', title: x[0] + ' ' + x[2] + (r.gone ? ' (삭제됨)' : ''), right: orphan ? '회원 ' + x[1] + ' 없음' : '회원 ' + x[1] });
      if (!r.gone && target !== undefined) P.arrow('fk' + i, 'o' + i + ':l', 'm' + target + ':r', { cls: on ? 'mut' : 'dash' });
    });
    P.box('chk', 16, 296, 648, 32, { cls: !s.chk ? 'ghost' : s.chkBad ? 'bad' : 'good', title: '확인 조회: ' + this.chk(c)[1], right: s.chk ? s.chk.slice(this.chk(c)[1].length + 1) : '?' });
    P.note(on ? '화살표는 주문의 member_id가 가리키는 회원입니다. 외래 키가 걸려 있어서 DB가 이 화살표의 끝에 회원이 실제로 있는지를 지켜 줍니다. 초록색 검사 칸은 제약이 문장을 막았다는 뜻입니다.' : '화살표는 주문의 member_id가 가리키는 회원입니다. 외래 키가 없으므로 점선입니다. DB는 이 값이 회원 번호라는 것을 모르고, 화살표 끝에 회원이 없어도 막지 않습니다. 빨간 상자가 어긋난 데이터입니다.');
  },
  assume: '회원 3명, 주문 3건의 작은 예입니다. 마흔여덟 가지 조합(문장 여덟 가지 × 제약 유무 × ON DELETE 세 가지) 모두, 화면의 SQL을 실제 MySQL 8.4.11(InnoDB, 기본 sql_mode)에서 그대로 실행해 오류 번호와 오류 메시지, 바뀐 행 수, 끝난 뒤 두 테이블의 모든 행, 확인 조회의 결과가 모형과 같은 것을 대조했습니다. 오류 번호와 메시지는 MySQL의 것이며 다른 DB에서는 다릅니다. NOT NULL 컬럼을 NULL로 바꾸는 UPDATE가 오류 1048로 거부되는 것은 엄격 모드(MySQL 8의 기본값)일 때이고, 엄격 모드를 끈 세션에서 같은 UPDATE를 실행해 보면 오류 없이 빈 문자열이 저장됩니다. 유니크 컬럼에 NULL이 여러 번 들어가는 것은 MySQL에서 실행해 확인한 동작이고, SQL Server처럼 NULL을 한 번만 허용하는 DB도 있습니다(이 비교는 실행이 아니라 문서를 따랐습니다). MySQL은 ON DELETE를 적지 않으면 RESTRICT와 같게(NO ACTION) 동작하고, InnoDB에서는 둘의 차이가 없습니다. CASCADE로 함께 지워진 자식 행이 "바뀐 행 수"에 들어가지 않는 것도 실행으로 확인한 MySQL의 동작입니다. 컬럼 정의 바로 뒤에 REFERENCES만 적는 방식(member_id INT REFERENCES member(id))은 MySQL이 오류 없이 받아들이지만 외래 키를 만들지 않는다는 것도 함께 실행해 확인했습니다. 그래서 화면에서는 FOREIGN KEY 절을 따로 적었습니다. 외래 키는 InnoDB 기준이며, 이 실습은 한 번에 한 문장만 실행하는 경우만 다룹니다.',
});
