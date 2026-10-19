Lab.register({
  id: 'fk_basic', nav: '외래 키', cat: '기초개념', mode: 'step', basic: true, deep: ['constraints'],
  title: '외래 키는 무엇이고, 없으면 무엇이 달라지는가',
  intro: '주문 테이블의 member_id 열에는 "이 주문을 한 회원의 번호"를 적습니다. 이 열에 FOREIGN KEY (member_id) REFERENCES member(id)라는 줄을 적으면 외래 키가 됩니다. member_id의 값은 member 테이블에 실제로 있는 id여야 한다고 DB에 약속하는 것이고, 약속을 어기는 INSERT와 DELETE는 DB가 거부합니다. 이 실습은 그 줄을 지우거나 둘째 주문의 member_id를 바꿔 가며 같은 SQL을 실행해, DB가 문장을 받아들이는지와 마지막에 없는 회원을 가리키는 주문이 남는지를 봅니다.',
  terms: ['기본 키, 유니크 키, 외래 키', '제약 조건', '참조 무결성', '부모 테이블과 자식 테이블'],
  controls: [
    { id: 'fk', label: 'orders에 FOREIGN KEY (member_id) REFERENCES member(id) 줄을 적는다', type: 'check', value: true },
    { id: 'who', label: '둘째 주문의 member_id', type: 'select', value: 'none', options: [['none', '둘째 주문의 member_id를 99로 (없는 회원)'], ['exist', '둘째 주문의 member_id를 1로 (있는 회원)'], ['null', '둘째 주문의 member_id를 비워서 (NULL)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '외래 키는 어떻게 생겼고, 없는 회원 번호로 주문을 넣으면 무슨 일이 일어나나', d: '외래 키가 있는 orders 테이블. 없는 회원 번호 99의 주문을 넣는 INSERT도, 주문이 가리키는 회원을 지우는 DELETE도 DB가 거부합니다.', v: { fk: true, who: 'none' } },
    { t: 'FOREIGN KEY 줄을 지우면', q: 'FOREIGN KEY (member_id) REFERENCES member(id) 줄을 지우면', d: 'member_id는 그냥 숫자 칸입니다. 없는 회원의 주문이 들어가고 회원도 지워져, 주인 없는 주문이 남습니다.', v: { fk: false, who: 'none' } },
    { t: '둘째 주문의 member_id를 1로 바꾸면', q: '둘째 주문의 member_id를 있는 회원 번호 1로 바꾸면', d: '있는 회원 번호는 외래 키가 있어도 들어갑니다. 그 회원을 지우는 DELETE는 거부됩니다.', v: { fk: true, who: 'exist' } },
    { t: 'member_id를 비워서 넣으면', q: '둘째 주문의 member_id를 비워서(NULL) 넣으면', d: 'NULL은 외래 키가 있어도 들어갑니다. 가리키는 회원이 없다고 적은 것이기 때문입니다.', v: { fk: true, who: 'null' } },
    { t: 'FOREIGN KEY 줄을 지우고 member_id를 1로 바꾸면', q: 'FOREIGN KEY 줄을 지우고 둘째 주문의 member_id를 1로 바꾸면', d: '회원 1을 지우는 DELETE가 거부되지 않아, 두 주문 모두 지워진 회원을 가리킵니다.', v: { fk: false, who: 'exist' } },
    { t: 'FOREIGN KEY 줄을 지우고 member_id를 비우면', q: 'FOREIGN KEY 줄을 지우고 둘째 주문의 member_id를 비워서 넣으면', d: '첫 주문만 지워진 회원을 가리킵니다. NULL인 주문은 가리키는 회원이 없다고 적은 주문입니다.', v: { fk: false, who: 'null' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/FkBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  m2Of: { none: '99', exist: '1', 'null': 'NULL' },
  code: function (c) {
    var l = ['CREATE TABLE member (', '    id   INT PRIMARY KEY,', '    name VARCHAR(20)', ');',
      'CREATE TABLE orders (', '    id        INT PRIMARY KEY,', '    member_id INT' + (c.fk ? ',' : '')];
    if (c.fk) l.push('    -- 외래 키: member_id 열의 값은 member 테이블에 있는 id여야 한다', '    FOREIGN KEY (member_id) REFERENCES member(id)');
    l.push(');', '',
      "INSERT INTO member VALUES (1, '김철수');",
      'INSERT INTO orders VALUES (10, 1);',
      'INSERT INTO orders VALUES (11, ' + this.m2Of[c.who] + ');', '',
      'DELETE FROM member WHERE id = 1;',
      'SELECT * FROM orders ORDER BY id;');
    return l.join('\n');
  },
  label: function (c) { return (c.fk ? '외래 키 있음' : '외래 키 없음') + ' · 둘째 주문의 member_id ' + { none: '99', exist: '1', 'null': 'NULL' }[c.who]; },
  columns: ['둘째 주문 INSERT', '회원 1을 지우는 DELETE', '마지막에 남은 주문', '없는 회원을 가리키는 주문'],
  simulate: function (c) {
    var fk = !!c.fk, who = c.who, m2 = this.m2Of[who], ev = [], sum = [];
    var insRej = fk && who === 'none';
    var q2 = 'INSERT INTO orders VALUES (11, ' + m2 + ')';
    // 상태: 두 테이블의 행, 문장과 결과 기록, 거부된 문장(rej: 둘째 주문의 INSERT, delrej: DELETE), 없는 회원을 가리키는 주문의 수(orph)
    var st = { members: [], orders: [], log: [], rej: null, delrej: false, orph: 0 };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function alive(id) { for (var i = 0; i < st.members.length; i++) if (!st.members[i].gone && st.members[i].id === id) return true; return false; }
    function refresh() {
      st.orph = 0;
      st.orders.forEach(function (o) { o.bad = o.m !== 'NULL' && !alive(o.m); if (o.bad) st.orph++; });
    }
    function cool() { st.members.forEach(function (r) { r.hot = false; }); st.orders.forEach(function (o) { o.hot = false; }); st.rej = null; st.delrej = false; }

    // 1. CREATE TABLE 둘
    push('CREATE TABLE: DB가 member와 orders라는 테이블 두 개를 만듭니다. 지금은 행이 하나도 없습니다. orders의 member_id 열에는 "이 주문을 한 회원의 번호"를 적습니다. ' + (fk ? 'orders에 FOREIGN KEY (member_id) REFERENCES member(id) 줄이 있으므로, DB는 "member_id 열의 값은 member 테이블에 실제로 있는 id여야 한다"는 약속을 기억해 둡니다. 이것이 외래 키입니다.' : 'member_id 열에는 INT(정수)라는 타입만 적었으므로 DB가 기억해 둘 약속이 없고, member_id는 그냥 숫자를 담는 칸입니다.'), '');

    // 2. member에 회원 1
    cool();
    st.members.push({ id: '1', name: '김철수', gone: false, hot: true });
    st.log.push(["INSERT member (1, 김철수)", '들어감', 'good']);
    push("INSERT INTO member VALUES (1, '김철수'): DB가 member 테이블에 id 1, 김철수 행을 넣습니다. 이제 회원이 한 명 있습니다.", '');

    // 3. 주문 10 (회원 1)
    cool();
    st.orders.push({ id: '10', m: '1', hot: true, bad: false });
    refresh();
    st.log.push(['INSERT orders (10, 1)', '들어감', 'good']);
    push('INSERT INTO orders VALUES (10, 1): 주문 10을 넣습니다. member_id에 적은 1은 "이 주문을 한 회원의 번호"이고, member 테이블의 id가 1인 행(김철수)을 가리킵니다. ' + (fk ? 'DB는 행을 넣기 전에 외래 키의 약속을 확인합니다. member 테이블에서 id가 1인 행을 찾아보고, 있으므로 통과해 주문 10이 들어갑니다. 이 확인을 하는 코드를 우리는 쓰지 않았습니다. DB가 INSERT가 올 때마다 스스로 합니다.' : '확인할 약속이 없으므로 DB는 그대로 주문 10을 넣습니다.'), '');

    // 4. 주문 11
    cool();
    var res2 = insRej ? '거부됨: member에 없는 번호' : '들어감';
    var shortQ = 'INSERT orders (11, ' + m2 + ')';
    if (fk) {
      push(q2 + ': 둘째 주문을 넣으려 합니다. DB는 행을 넣기 전에 ' + (who === 'null' ? 'member_id를 봅니다. member_id가 비어 있어(NULL) 찾아볼 회원 번호가 없습니다.' : 'member 테이블에서 id가 ' + m2 + '인 행을 찾아봅니다.') + ' 이 확인도 DB가 스스로 합니다.', '');
      if (insRej) {
        st.rej = { m: m2 }; st.log.push([shortQ, res2, 'bad']);
        push('DB의 확인 결과: member 테이블에 id가 99인 행이 없습니다. 약속을 어기므로 DB는 이 INSERT를 거부하고, "참조하는 행이 없다"는 종류의 오류를 돌려줍니다. 주문 11은 orders에 들어가지 않았고, 테이블은 INSERT 전 그대로입니다.', 'bad');
      } else {
        st.orders.push({ id: '11', m: m2, hot: true, bad: false }); refresh(); st.log.push([shortQ, res2, 'good']);
        push(who === 'null'
          ? 'DB의 확인 결과: NULL은 "가리키는 회원이 없다"는 뜻이어서 DB가 찾아볼 회원이 없고, 이 INSERT를 거부하지 않습니다. 주문 11이 들어갔습니다. 외래 키가 있어도 NULL은 들어갈 수 있습니다.'
          : 'DB의 확인 결과: id가 1인 행이 있으므로 약속을 지키고 통과합니다. 주문 11이 들어갔고, 주문 10과 11이 같은 회원 1을 가리킵니다. 한 회원이 주문을 여러 번 할 수 있으므로 같은 번호가 여러 주문에 적혀도 됩니다.', 'good');
      }
    } else {
      st.orders.push({ id: '11', m: m2, hot: true, bad: false }); refresh(); st.log.push([shortQ, res2, who === 'none' ? 'bad' : 'good']);
      push(q2 + ': 둘째 주문을 넣습니다. DB가 확인할 약속이 없으므로 그대로 넣습니다. ' + (who === 'none' ? 'member 테이블에는 id가 99인 행이 없지만, member_id는 그냥 숫자 칸이어서 99가 들어갑니다. 주문 11은 없는 회원을 가리킵니다.' : who === 'exist' ? '이번에는 member_id에 있는 회원 번호 1을 적었으므로, 주문 10과 11이 같은 회원 1을 가리킵니다.' : 'member_id가 비어 있는(NULL) 주문 11이 들어갔습니다.'), who === 'none' ? 'bad' : '');
    }

    // 5. DELETE
    cool();
    var refs = ['10']; if (who === 'exist') refs.push('11');
    var refText = refs.length === 1 ? '주문 10이' : '주문 10과 11이';
    var res3 = fk ? '거부됨: 이 회원을 가리키는 주문이 있음' : '지워짐';
    if (fk) {
      push('DELETE FROM member WHERE id = 1: 회원 1(김철수)을 지우려 합니다. DB는 지우기 전에 orders 테이블에서 member_id가 1인 주문이 있는지 찾아봅니다. ' + refText + ' 있습니다.', '');
      st.delrej = true; st.members[0].hot = true; st.log.push(['DELETE member (id = 1)', res3, 'bad']);
      push('DB의 확인 결과: 이 회원을 가리키는 주문이 남아 있으므로 DB는 이 DELETE를 거부하고, "다른 테이블이 참조하고 있다"는 종류의 오류를 돌려줍니다. 회원 1은 지워지지 않았고 member 테이블은 DELETE 전 그대로입니다. 그래서 주문이 가리키는 회원이 사라지는 일은 일어나지 않습니다.', 'bad');
    } else {
      st.members[0].gone = true; refresh();
      st.log.push(['DELETE member (id = 1)', res3, 'bad']);
      push('DELETE FROM member WHERE id = 1: 회원 1(김철수)을 지웁니다. DB가 확인할 약속이 없으므로 member에서 id가 1인 행이 그대로 지워집니다. orders에 적힌 member_id는 바뀌지 않아서, ' + (refs.length === 1 ? 'member_id가 1인 주문 10이 남아 있지만' : 'member_id가 1인 주문 10과 11이 남아 있지만') + ' 그 번호가 가리키던 회원은 이제 없습니다. 이렇게 가리키는 회원이 없는 주문을 "주인 없는 주문"이라고 부르겠습니다.', 'bad');
    }

    // 6. SELECT
    cool();
    var finalText = st.orders.map(function (o) { return '(' + o.id + ', ' + o.m + ')'; }).join(', ');
    var after;
    if (fk) after = who === 'none' ? '주문 11은 거부되어 들어가지 않았고, 남은 주문 10은 member에 있는 회원 1을 가리킵니다.' : who === 'exist' ? '두 주문 모두 회원 1을 가리키고, 회원 1은 지워지지 않아 member에 남아 있습니다.' : '주문 11은 member_id가 NULL이라 가리키는 회원이 없고, 주문 10은 member에 남은 회원 1을 가리킵니다.';
    else after = who === 'none' ? '주문 10이 가리키는 회원 1은 방금 지워졌고, 주문 11이 가리키는 회원 99는 처음부터 없었습니다. 두 주문 모두 주인이 없습니다.' : who === 'exist' ? '주문 10과 11이 모두 회원 1을 가리키지만 회원 1은 지워졌습니다. 두 주문 모두 주인이 없습니다.' : '주문 10은 지워진 회원 1을 가리킵니다. 주문 11은 member_id가 NULL이라, 가리키는 회원이 없다고 적은 주문입니다.';
    st.log.push(['SELECT * FROM orders', finalText, st.orph ? 'bad' : 'good']);
    push('SELECT * FROM orders ORDER BY id: orders에 남은 주문을 id 순으로 읽습니다. 결과는 ' + finalText + '입니다. ' + after, st.orph ? 'bad' : 'good');

    // 7. 확인용 SELECT. 화면의 코드에는 없는 문장을 따로 실행한 결과
    st.log.push(['(확인용) 없는 회원을 세는 SELECT', st.orph + '건', st.orph ? 'bad' : 'good']);
    push('참고로 이 코드에는 없는 확인용 문장을 따로 실행합니다. SELECT COUNT(*) FROM orders o LEFT JOIN member m ON o.member_id = m.id WHERE o.member_id IS NOT NULL AND m.id IS NULL은 orders의 주문마다 member에서 짝을 찾아, 짝이 없는 주문을 셉니다. 결과는 ' + st.orph + '건입니다.' + (who === 'null' ? ' member_id가 NULL인 주문은 가리키는 회원이 없다고 적은 것이므로 세지 않습니다.' : '') + (st.orph === 0 ? ' 외래 키가 있어서 짝이 없는 주문은 한 건도 생기지 못했습니다.' : ' 외래 키가 없어서 DB가 막지 않았고, 짝이 없는 주문이 남았습니다.'), st.orph ? 'bad' : 'good');

    // 요약: 첫 줄은 물음의 답
    var S = {
      'true|none': ['외래 키는 테이블을 만들 때 orders에 FOREIGN KEY (member_id) REFERENCES member(id)라고 적는 것입니다. member_id의 값은 member 테이블에 실제로 있는 id여야 한다고 DB에 약속하는 것이고, 없는 회원 번호 99로 주문을 넣는 INSERT는 DB가 거부했습니다.', '주문이 가리키고 있는 회원을 지우는 DELETE도 DB가 거부했습니다. 확인하는 코드는 우리가 쓰지 않았고 DB가 문장마다 스스로 확인했으므로, 없는 회원을 가리키는 주문은 0건입니다.'],
      'false|none': ['FOREIGN KEY 줄을 지우면 member_id는 그냥 숫자 칸입니다. 없는 회원 번호 99의 주문이 들어갔고, 주문이 남아 있는 회원 1도 지워졌습니다.', '두 주문 모두 member에 없는 회원을 가리키는 주인 없는 주문이 되었습니다(2건). 약속을 적어 두지 않으면 DB는 주문과 회원의 관계를 지켜 주지 않습니다.'],
      'true|exist': ['둘째 주문의 member_id를 있는 회원 번호 1로 바꾸면 외래 키가 있어도 INSERT가 들어갑니다. 외래 키는 INSERT를 모두 막는 것이 아니라, member에 없는 번호만 막는 약속입니다.', '두 주문이 같은 회원 1을 가리켜도 됩니다. 회원 1을 지우는 DELETE는 이 주문들이 가리키고 있어 거부되었고, 없는 회원을 가리키는 주문은 0건입니다.'],
      'false|exist': ['FOREIGN KEY 줄이 없어도 있는 회원 번호를 넣은 INSERT는 들어갑니다. 달라지는 것은 그 뒤입니다. 회원 1을 지우는 DELETE가 거부되지 않아, 두 주문이 모두 지워진 회원을 가리키게 되었습니다.', '있는 번호를 넣은 것은 우리가 맞게 넣었을 뿐 DB가 지켜 준 것이 아니고, 주문이 남은 회원이 지워지는 것도 DB가 막아 주지 않았습니다(2건).'],
      'true|null': ['member_id를 비워서(NULL) 넣는 INSERT는 외래 키가 있어도 들어갑니다. NULL은 "가리키는 회원이 없다"는 뜻이어서 DB가 찾아볼 회원이 없고, 외래 키는 NULL을 거부하지 않습니다.', '회원 1을 지우는 DELETE는 주문 10이 가리키고 있어 거부되었습니다. member_id가 NULL인 주문은 없는 회원을 가리키는 주문으로 세지 않아 0건입니다.'],
      'false|null': ['FOREIGN KEY 줄을 지우면 member_id를 비운 주문도, 회원 1을 지우는 DELETE도 그대로 통과합니다. 남은 주문 10은 지워진 회원 1을 가리킵니다(1건).', '주문 11은 member_id가 NULL이라 가리키는 회원이 없다고 적은 주문이어서 주인 없는 주문으로 세지 않습니다. NULL은 외래 키가 있든 없든 들어갑니다.']
    };
    S[fk + '|' + who].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, row: [res2, res3, finalText, st.orph + '건'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 CREATE TABLE부터 한 문장씩 진행합니다.'); return; }
    H.table(v, ['id', 'name'], s.members.length ? s.members.map(function (r) { return { cls: r.gone ? 'gone' : '', cells: [{ v: r.id, cls: r.hot ? 'hot' : '' }, { v: r.gone ? r.name + ' (지워짐)' : r.name, cls: r.hot ? 'hot' : '' }] }; }) : [{ cls: 'gone', cells: ['행 없음', ''] }], 'member 테이블');
    H.table(v, ['id', 'member_id'], s.orders.length ? s.orders.map(function (o) { var k = o.bad ? 'bad' : o.hot ? 'hot' : ''; return { cls: '', cells: [{ v: o.id, cls: k }, { v: o.m, cls: k }] }; }) : [{ cls: 'gone', cells: ['행 없음', ''] }], 'orders 테이블');
    H.table(v, ['실행한 문장', '결과'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), '문장과 결과');
    H.counters(v, [[s.orph, '없는 회원을 가리키는 주문'], [s.orders.length, 'orders의 행 수']]);
  },
  // 그림: 왼쪽에 member 테이블, 오른쪽에 orders 테이블. 주문 행의 member_id가 회원 행을 가리키는 화살표를 그리고, 가리키는 회원이 없는 주문은 끊긴 빨간 화살표로 보인다. 맨 아래에 그런 주문의 수.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.region('mt', 14, 16, 222, 208, 'member 테이블');
    P.region('ot', 404, 16, 262, 208, 'orders 테이블');
    if (s && s.members.length === 0) P.text('emp', 125, 126, '행이 없습니다', { cls: 'mut', anchor: 'middle' });
    if (s && s.orders.length === 0 && !s.rej) P.text('emo', 535, 126, '행이 없습니다', { cls: 'mut', anchor: 'middle' });
    if (s && s.members.length) {
      var m = s.members[0];
      P.box('m0', 26, 90, 198, 40, { cls: m.gone ? 'ghost' : m.hot ? 'hot' : 'wait', title: 'id ' + m.id + ' · ' + m.name + (m.gone ? ' (지워짐)' : '') });
      if (s.delrej) P.text('dl', 125, 156, 'DELETE가 거부되어 남음', { cls: 'bad', anchor: 'middle', bold: true });
    }
    (s ? s.orders : []).forEach(function (o, i) {
      var y = 50 + i * 56;
      P.box('o' + i, 416, y, 238, 40, { cls: o.bad ? 'bad' : o.hot ? 'hot' : 'wait', title: 'id ' + o.id + ' · member_id ' + o.m });
      if (o.m !== 'NULL') {
        if (o.bad) { P.arrow('ar' + i, 'o' + i + ':l', [310, y + 20], { cls: 'bad' }); P.text('x' + i, 302, y + 25, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
        else P.arrow('ar' + i, 'o' + i + ':l', 'm0:r', { cls: 'good' });
      }
    });
    if (s && s.rej) {
      var yr = 50 + s.orders.length * 56;
      P.box('o' + s.orders.length, 416, yr, 238, 40, { cls: 'ghost', title: 'id 11 · member_id ' + s.rej.m + ' (거부)' });
      P.arrow('arj', 'o' + s.orders.length + ':l', [310, yr + 20], { cls: 'bad' }); P.text('xj', 302, yr + 25, '×', { cls: 'bad', anchor: 'middle', bold: true });
    }
    P.box('n1', 14, 242, 652, 36, { cls: s ? (s.orph ? 'bad' : 'good') : 'ghost', title: '없는 회원을 가리키는 주문', right: (s ? s.orph : 0) + '건' });
    if (s && s.orders.some(function (o) { return o.m === 'NULL'; })) P.note('member_id가 NULL인 주문은 가리키는 회원이 없다고 적은 것이어서, 없는 회원을 가리키는 주문으로 세지 않습니다.');
    else if (s && s.orph) P.note('빨간 상자는 member_id가 가리키는 회원이 member에 없는 주문입니다. 화살표가 끊겨 있습니다.');
  },
  assume: 'H2 2.4.240(메모리 DB, JDBC)에서 실행해 대조했습니다. 여섯 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 글자 그대로 한 문장씩 실행했고, 문장 하나가 거부되어도 다음 문장은 계속 실행했습니다. 둘째 주문의 INSERT와 회원 1을 지우는 DELETE가 받아들여졌는지 거부됐는지와 오류의 종류(H2의 SQLSTATE 23506은 INSERT가 외래 키를 어김, 23503은 DELETE가 참조하는 행을 지우려 함), 마지막 SELECT 결과를 모형과 대조했습니다. "없는 회원을 가리키는 주문"은 화면의 코드에 없는 확인용 문장 SELECT COUNT(*) FROM orders o LEFT JOIN member m ON o.member_id = m.id WHERE o.member_id IS NOT NULL AND m.id IS NULL을 Probe가 마지막에 따로 실행해 센 값입니다. 화면의 코드는 열 정의 옆에 REFERENCES만 적는 모양이 아니라 FOREIGN KEY (member_id) REFERENCES member(id) 줄을 따로 쓰는 모양입니다. MySQL 8.4 문서(1.7.2.3절 FOREIGN KEY Constraint Differences와 15.1.20절 CREATE TABLE의 Indexes, Foreign Keys, and CHECK Constraints)가 열 정의 옆에 적은 REFERENCES를 해석만 하고 무시하며 별도의 FOREIGN KEY 줄에 적은 것만 받아들인다고 하기 때문입니다. H2는 두 모양을 모두 외래 키로 받아들이는 것을 따로 확인했습니다. MySQL 8.4 문서의 15.1.20.5절 FOREIGN KEY Constraints를 직접 열어, 외래 키 제약은 자식 테이블에 정의하며, 부모 테이블에 짝이 되는 값이 없는 값을 자식 테이블에 만드는 INSERT와 UPDATE는 거부되고, ON DELETE를 적지 않으면 기본 동작은 NO ACTION이며 InnoDB에서는 RESTRICT와 같이 부모 행의 삭제가 즉시 거부된다는 것을 확인했습니다. 외래 키 열이 NULL이면 부모에 짝이 없어도 INSERT가 가능하다는 것은 15.1.20절과 1.7.2.3절의 MATCH 설명(MATCH SIMPLE은 외래 키가 NULL인 것을 허용)을 따랐습니다. 오류의 번호와 메시지의 글자는 DB마다 다르므로 화면에는 종류만 적었습니다. MySQL에서의 실행 대조는 하지 않았습니다. 그래서 위 규칙은 문서와 H2 실행이 일치한다는 근거이고, MySQL이 같은 SQL에서 같은 결과를 내는지는 실행으로 확인하지 않았습니다. FOREIGN KEY 줄이 없는 테이블이 없는 회원 번호를 받아들이고 회원 삭제를 막지 않는 것은 H2에서 관찰한 동작입니다. 이 실습은 외래 키의 기본 동작(거부)만 다루며, ON DELETE CASCADE 같은 참조 동작, UPDATE, NOT NULL, 복합 외래 키는 다루지 않습니다.',
});
