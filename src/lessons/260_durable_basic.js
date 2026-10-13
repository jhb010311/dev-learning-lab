Lab.register({
  id: 'durable_basic', nav: '저장과 지속성', cat: '기초개념', mode: 'step', basic: true, deep: ['undoredo', 'bufferpool'],
  title: '커밋한 데이터는 서버가 꺼져도 남는가',
  intro: 'DB는 데이터를 디스크의 파일에 저장하는 프로그램입니다. 자바 프로그램의 변수는 프로그램이 끝나면 사라지지만, COMMIT까지 끝낸 데이터는 DB 프로그램이 갑자기 꺼졌다가 다시 켜져도 남아 있어야 합니다. 이 성질을 지속성(durability)이라고 합니다. 코드에서 이 성질을 이루는 것은 두 가지입니다(DB에 따라 COMMIT한 내용을 바로 디스크에 쓰게 하는 설정도 더 필요합니다). 하나는 COMMIT으로, 묶음 안의 변경을 남기겠다고 확정하는 문장입니다. 다른 하나는 데이터를 두는 곳으로, 연결 주소가 jdbc:h2:file: 글자로 시작하면 디스크의 파일에, jdbc:h2:mem: 글자로 시작하면 메모리에만 둡니다. 이 실습은 COMMIT 줄을 지우거나 데이터를 두는 곳을 바꿔 가며 같은 INSERT를 실행하고, DB 프로그램을 정리 없이 끝낸 다음 다시 켜서 memo 테이블을 읽어 봅니다. (이 실습의 H2는 자바 프로그램 안에서 도는 DB여서 "DB 프로그램이 꺼진다"는 것은 그 자바 프로그램이 끝나는 것입니다. MySQL 같은 DB는 따로 도는 프로그램이라는 점만 다릅니다. DB가 이 약속을 어떻게 지키는지(로그와 버퍼)는 세부 동작 실습에서 다룹니다.)',
  terms: ['지속성(Durability)', '파일 DB와 메모리 DB', '커밋과 롤백', 'H2의 쓰기 지연(WRITE_DELAY)'],
  controls: [
    { id: 'commit', label: 'INSERT 뒤에 COMMIT; 줄을 적는다', type: 'check', value: true },
    { id: 'where', label: '데이터를 두는 곳 (연결 주소)', type: 'select', value: 'file', options: [['file', '디스크의 파일에 저장하는 DB (jdbc:h2:file:)'], ['mem', '메모리에만 두는 DB (jdbc:h2:mem:)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'COMMIT까지 끝낸 INSERT는 어떻게 생겼고, DB 프로그램이 갑자기 꺼졌다가 다시 켜지면 그 행은 어떻게 되나', d: '파일에 저장하는 DB에서 COMMIT까지 한 행은 DB 프로그램이 갑자기 꺼졌다 켜진 뒤에도 남아 있습니다.', v: { commit: true, where: 'file' } },
    { t: 'COMMIT을 지우면', q: 'COMMIT; 줄을 지우면', d: 'COMMIT하지 않은 행은 다시 켜면 없습니다. 테이블은 남아 있습니다.', v: { commit: false, where: 'file' } },
    { t: '메모리에만 두는 DB면', q: '연결 주소를 메모리에만 두는 DB의 주소(jdbc:h2:mem:shop)로 바꾸면', d: 'COMMIT까지 했는데도 다시 켜면 테이블부터 없습니다.', v: { commit: true, where: 'mem' } },
    { t: 'COMMIT도 없고 메모리에만 두면', q: 'COMMIT; 줄도 지우고 메모리에만 두는 DB로 하면', d: 'COMMIT이 있을 때와 같은 결과입니다. 이 DB는 COMMIT과 상관없이 통째로 사라집니다.', v: { commit: false, where: 'mem' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/DurableBasicProbe.java)이 같은 글을 실행한다. 대조 스크립트가 글자까지 비교한다.
  code: function (c) {
    var l = [c.where === 'file' ? '-- 파일에 저장하는 DB(jdbc:h2:file:./shop;WRITE_DELAY=0)에 연결해서' : '-- 메모리에만 두는 DB(jdbc:h2:mem:shop)에 연결해서',
      'CREATE TABLE memo (id INT PRIMARY KEY, text VARCHAR(20));', '', '-- 시작: 여기서부터를 한 묶음으로 다룬다', 'BEGIN;', "INSERT INTO memo VALUES (1, 'hello');"];
    if (c.commit) l.push('-- 확정: 여기까지의 변경을 남기겠다고 DB에 알린다', 'COMMIT;');
    l.push('', '-- DB 프로그램이 갑자기 꺼졌다가 다시 켜진 뒤, 같은 주소로 연결해서', 'SELECT * FROM memo;');
    return l.join('\n');
  },
  label: function (c) { return (c.commit ? 'COMMIT 있음' : 'COMMIT 없음') + ' · ' + (c.where === 'file' ? '파일에 저장하는 DB' : '메모리에만 두는 DB'); },
  columns: ['다시 켠 뒤 memo의 행', 'COMMIT', '저장된 곳'],
  simulate: function (c) {
    var file = c.where === 'file', k = !!c.commit, ev = [], sum = [], facts = {};
    // 상태: ps는 DB 프로그램(off 켜기 전, on 켜짐, dead 갑자기 꺼짐, on2 다시 켜짐), mt는 프로그램 안에 memo 테이블이 있는가, mn은 거기 든 행 수, mok는 그 행이 확정되었는가,
    //       df는 디스크에 DB 파일이 있는가, dt는 그 파일에 memo 테이블이 있는가, dn은 파일에 확정된 행 수, wr은 이번 단계에서 디스크에 쓴 것,
    //       pre는 꺼지기 전에 이 연결이 읽은 행, post는 다시 켠 뒤 읽은 결과
    var st = { ps: 'off', mt: 0, mn: 0, mok: false, df: false, dt: 0, dn: 0, wr: false, pre: '', post: '', log: [] };
    function push(s, kind) { ev.push({ s: s, k: kind, snap: JSON.parse(JSON.stringify(st)) }); }
    function calm() { st.wr = false; }

    // 1. 연결
    st.ps = 'on';
    st.log.push(['연결', file ? '파일에 저장하는 DB' : '메모리에만 두는 DB', '']);
    push(file
      ? 'DB에 연결합니다. 주소의 jdbc:h2:file:./shop은 DB의 내용을 ./shop이라는 이름의 파일(H2는 shop.mv.db라는 파일로 만듭니다)에 저장하겠다는 뜻입니다. 끝에 붙인 WRITE_DELAY=0 설정은 COMMIT한 내용을 미루지 않고 바로 파일에 쓰라는 뜻입니다. H2는 기본 설정에서는 COMMIT 뒤 파일에 쓰는 일을 최대 0.5초 미루기 때문에(H2 문서), 갑자기 꺼지는 일을 실험하려고 바로 쓰게 했습니다.'
      : 'DB에 연결합니다. 주소의 jdbc:h2:mem:shop은 DB의 내용을 파일이 아니라 컴퓨터의 메모리에만 두겠다는 뜻입니다(mem은 메모리라는 뜻입니다). 이 연결은 파일을 만들지 않았습니다.', '');

    // 2. CREATE TABLE
    calm(); st.mt = 1;
    if (file) { st.df = true; st.dt = 1; st.wr = true; }
    st.log.push(['CREATE TABLE', file ? '바로 확정, 파일에 기록' : '바로 확정, 메모리 안에서만', '']);
    push('CREATE TABLE memo: DB가 id와 text 두 칸이 있는 memo 테이블을 만듭니다. 아직 BEGIN이 없으므로 이 문장은 실행되자마자 확정됩니다(자동 커밋). ' +
      (file ? '확정된 내용은 디스크의 DB 파일에 기록됩니다.' : '확정은 되었지만 이 DB는 메모리뿐이라, 테이블은 DB 프로그램의 메모리 안에만 있습니다.'), '');

    // 3. BEGIN
    calm();
    st.log.push(['BEGIN', '묶음 시작', '']);
    push('BEGIN: DB가 지금부터 COMMIT을 만날 때까지의 문장을 한 묶음(트랜잭션)으로 다루기 시작합니다. 자동 커밋이 꺼지므로 이 묶음 안의 변경은 COMMIT을 만나기 전까지 확정되지 않습니다.', '');

    // 4. INSERT
    calm(); st.mn = 1; st.mok = false; st.pre = '1행';
    st.log.push(['INSERT', '묶음 안, 아직 확정 전', 'hot']);
    push("INSERT INTO memo: DB가 (1, 'hello') 행을 memo 테이블에 넣습니다. 묶음 안의 변경이라 아직 확정되지 않았습니다. 이 연결에서 memo 테이블을 읽으면 1행이 보입니다.", '');

    // 5. COMMIT 또는 COMMIT 없음
    calm();
    if (k) {
      st.mok = true;
      if (file) { st.dn = 1; st.wr = true; }
      st.log.push(['COMMIT', file ? '확정, 파일에도 기록' : '확정, 메모리 안에서만', 'good']);
      push(file
        ? 'COMMIT: DB가 묶음을 확정합니다. WRITE_DELAY=0 설정이 있으므로 확정한 변경을 곧바로 DB 파일에 씁니다. 이제 행 1개가 프로그램의 메모리에도, 디스크의 파일에도 있습니다. 자동 커밋은 다시 켜집니다.'
        : 'COMMIT: DB가 묶음을 확정합니다. 하지만 이 DB는 메모리뿐이라 확정된 행도 프로그램의 메모리 안에만 있고, 디스크에는 쓰이는 것이 없습니다. 자동 커밋은 다시 켜집니다.', 'good');
    } else {
      st.log.push(['(COMMIT 없음)', '묶음이 끝나지 않음', 'bad']);
      push('이 코드에는 COMMIT 줄이 없으므로 묶음이 끝나지 않았고 INSERT는 확정되지 않은 채입니다. 이 연결에서 읽으면 아직 1행이 보이지만, ' + (file ? '디스크의 DB 파일에는 확정된 행이 없습니다.' : '이 DB는 어차피 메모리뿐입니다.'), 'bad');
    }

    // 6. 갑자기 꺼짐
    calm(); st.ps = 'dead'; st.mt = 0; st.mn = 0; st.mok = false;
    st.log.push(['DB 프로그램이 갑자기 꺼짐', '메모리의 내용이 사라짐', 'bad']);
    push('이 코드에는 없는 일입니다. DB 프로그램이 갑자기 꺼집니다. 연결을 닫지도, 끝내는 절차를 거치지도 않고 프로그램이 곧바로 끝납니다(실험에서는 자바의 Runtime.halt 메서드로 끝냈습니다). 프로그램의 메모리에 있던 memo 테이블과 행은 모두 사라집니다.' +
      (file ? ' 디스크의 DB 파일은 그대로 남습니다.' : ' 이 DB는 디스크에 쓴 것이 없습니다.') + ' (전원이 나가는 경우가 아니라 프로그램만 끝나는 경우를 실험했습니다.)', 'bad');

    // 7. 다시 켜짐
    calm(); st.ps = 'on2';
    var fin; // 다시 켠 뒤 memo의 결과
    if (file) {
      st.mt = st.dt; st.mn = st.dn; st.mok = st.dn > 0;
      st.log.push(['DB 프로그램을 다시 켬', '파일을 열었음', '']);
      push('DB 프로그램이 다시 켜지고, 같은 주소로 연결합니다. ./shop 파일이 디스크에 남아 있으므로 DB는 그 파일을 열어 내용을 읽을 수 있게 됩니다. 꺼질 때 연결을 닫지 않았는데도 파일은 오류 없이 열렸습니다.', '');
      fin = st.dn ? '1행 (1, hello)' : '0행 (memo 테이블은 있음)';
    } else {
      st.log.push(['DB 프로그램을 다시 켬', '빈 DB로 시작', '']);
      push('DB 프로그램이 다시 켜지고, 같은 주소로 연결합니다. 메모리에만 두는 DB는 켜질 때마다 빈 메모리에서 시작합니다. 이름이 같아도 이전 DB는 메모리와 함께 사라졌고, 디스크에는 읽을 파일이 없습니다. 지금 DB는 비어 있습니다.', '');
      fin = '오류: memo 테이블이 없음';
    }

    // 8. SELECT
    calm(); st.post = file ? (st.dn ? '1행 (1, hello)' : '0행') : '오류: 테이블 없음';
    var good = file && k;
    st.log.push(['SELECT', fin, good ? 'good' : 'bad']);
    if (file && k) push('SELECT * FROM memo: 결과는 1행 (1, hello)입니다. COMMIT으로 확정한 행이 디스크의 파일에 있었기 때문에, DB 프로그램이 갑자기 꺼졌다 켜진 뒤에도 남아 있습니다.', 'good');
    else if (file) push('SELECT * FROM memo: 결과는 0행입니다. memo 테이블은 남아 있습니다. CREATE TABLE은 BEGIN 앞에서 이미 확정되어 파일에 기록되었기 때문입니다. 하지만 COMMIT으로 확정하지 않은 INSERT의 행은 다시 켠 DB에서 볼 수 없습니다.', 'bad');
    else push('SELECT * FROM memo: DB가 오류로 답합니다. 행이 0개인 것이 아니라 memo 테이블 자체가 없다는 오류입니다(DB가 비어 있다고 적혀 있습니다). CREATE TABLE부터 INSERT까지 전부 메모리에만 있다가 함께 사라졌습니다.' + (k ? ' COMMIT까지 했는데도 마찬가지입니다.' : ' COMMIT 줄이 있었더라도 결과는 같았습니다.'), 'bad');

    // 요약: 첫 줄은 물음의 답
    if (file && k) {
      sum.push('COMMIT까지 끝낸 행은 DB 프로그램이 갑자기 꺼졌다가 다시 켜진 뒤에도 남아 있었습니다. 행이 디스크의 파일에 있었기 때문입니다. 프로그램이 끝나면 사라지는 메모리와 달리 디스크의 파일은 프로그램이 꺼져도 남고, COMMIT은 변경을 그 파일에 남기겠다고 확정하는 문장입니다.');
      sum.push('COMMIT한 변경이 꺼진 뒤에도 남는 이 성질을 지속성(durability)이라고 합니다. 이 실습에서는 COMMIT과 함께 파일에 쓰도록 주소에 WRITE_DELAY=0 설정을 붙였습니다. 이것을 빼고 H2 기본 설정으로 COMMIT 직후에 바로 끄면 다섯 번 모두 COMMIT한 행이 남지 않았고, 1.5초 기다렸다가 끄면 두 번 모두 남았습니다. DB가 이 약속을 지키는 방법(로그와 버퍼)은 세부 동작 실습에서 다룹니다.');
    } else if (file) {
      sum.push('COMMIT 줄을 지우면 INSERT한 행은 다시 켠 뒤에 없었습니다(0행). memo 테이블은 남아 있었습니다.');
      sum.push('DB 파일이 디스크에 있어도 남는 것은 확정한 변경뿐입니다. 테이블 만들기는 BEGIN 앞에서 이미 확정되어 남았고, 묶음 안의 INSERT는 COMMIT이 없어서 남지 않았습니다.');
    } else if (k) {
      sum.push('메모리에만 두는 DB에서는 COMMIT까지 했어도 다시 켠 뒤 memo 테이블이 아예 없었습니다.');
      sum.push('COMMIT은 변경을 확정하는 문장이고, 어디에 저장되느냐는 DB를 어디에 두느냐에 달려 있습니다. 메모리에만 두는 DB는 파일이 없어서 자바 프로그램의 변수처럼 프로그램이 끝나면 사라집니다. 지속성에는 COMMIT과 파일이 둘 다 필요합니다.');
    } else {
      sum.push('COMMIT 줄이 없고 메모리에만 두는 DB여도 다시 켠 뒤 memo 테이블이 아예 없었습니다. COMMIT이 있을 때와 같은 결과입니다.');
      sum.push('이 DB는 COMMIT 여부와 상관없이 모든 내용이 메모리에만 있었습니다. COMMIT이 결과를 가르는 것은 파일에 저장하는 DB일 때뿐입니다.');
    }
    facts.pre = '1'; facts.autoAfterBegin = 'false'; facts.autoAfterCommit = k ? 'true' : undefined;
    facts.files1 = file ? 'shop.mv.db' : ''; facts.files2 = file ? 'shop.mv.db' : '';
    facts.opened = 'true'; facts.errKind = file ? '' : 'table';
    return { events: ev, summary: sum, facts: facts, row: [fin, k ? '있음' : '없음', file ? '디스크의 파일 (shop.mv.db)' : '메모리뿐 (파일 없음)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 DB에 연결하는 것부터 시작합니다.'); return; }
    var ps = { off: '켜기 전', on: '켜져 있음', dead: '갑자기 꺼짐', on2: '다시 켜짐' }[s.ps];
    H.table(v, ['위치', '내용'], [
      { cls: '', cells: ['DB 프로그램', { v: ps, cls: s.ps === 'dead' ? 'bad' : '' }] },
      { cls: '', cells: ['프로그램의 메모리', s.mt ? 'memo 테이블 · ' + s.mn + '행' + (s.mn && !s.mok ? ' (확정 전)' : '') : '비어 있음'] },
      { cls: '', cells: ['디스크의 DB 파일', sim.c.where === 'mem' ? '없음' : !s.df ? '아직 없음' : s.dt ? 'memo 테이블 · 확정된 행 ' + s.dn + '개' : '비어 있음'] },
    ], '데이터가 있는 곳');
    H.table(v, ['실행한 일', '결과'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), '일어난 일');
    H.counters(v, [[s.mn, '프로그램의 메모리에 있는 행'], [s.dn, '디스크 파일에 확정된 행']]);
  },
  // 그림: 위는 DB 프로그램의 상태, 왼쪽은 꺼지면 사라지는 메모리, 오른쪽은 꺼져도 남는 디스크의 DB 파일. 확정하면 파일 쪽으로 화살표가 생기고, 꺼지면 왼쪽이 비워진다. 아래는 꺼지기 전과 다시 켠 뒤에 읽은 행.
  draw: function (P, sim, shown) {
    var c = sim.c, file = c.where === 'file', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 290);
    var ps = !s ? '켜기 전' : { off: '켜기 전', on: '켜져 있음', dead: '갑자기 꺼짐', on2: '다시 켜짐' }[s.ps];
    P.box('ps', 14, 12, 652, 36, { cls: s && s.ps === 'dead' ? 'bad' : s && s.ps !== 'off' ? 'good' : 'ghost', title: 'DB 프로그램', right: ps });
    P.region('rm', 14, 64, 280, 130, '메모리 (꺼지면 사라짐)');
    P.region('rd', 386, 64, 280, 130, file ? '디스크 (꺼져도 남음)' : '디스크 (이 설정에서는 쓰지 않음)');
    var mt = s ? s.mt : 0, mn = s ? s.mn : 0;
    P.box('m1', 26, 98, 256, 58, { cls: !mt ? 'ghost' : mn && !s.mok ? 'hot' : 'wait', title: 'memo 테이블', sub: !mt ? '없음' : mn ? '행 ' + mn + '개 · ' + (s.mok ? '확정됨' : '확정 전') : '행 0개' });
    if (file) {
      var dsub = !s || !s.df ? '아직 없음' : s.dt ? 'memo 테이블 · 확정된 행 ' + s.dn + '개' : '비어 있음';
      P.box('d1', 398, 98, 256, 58, { cls: s && s.wr ? 'good now' : s && s.df ? 'plain' : 'ghost', title: 'shop.mv.db', sub: dsub });
    } else P.box('d1', 398, 98, 256, 58, { cls: 'ghost', title: '파일 없음', sub: '메모리에만 두는 DB' });
    if (file && s && s.wr) P.arrow('wr', 'm1:r', 'd1:l', { cls: 'good' });
    P.box('n1', 14, 214, 322, 36, { cls: s && s.pre ? 'wait' : 'ghost', title: '꺼지기 전 읽은 행', right: s ? s.pre : '' });
    P.box('n2', 344, 214, 322, 36, { cls: s && s.post ? (s.post.indexOf('1행') === 0 ? 'good' : 'bad') : 'ghost', title: '다시 켠 뒤 읽은 행', right: s ? s.post : '' });
  },
  assume: 'H2 2.4.240(JDK 21.0.12.1)에서 실행해 대조했고, MySQL이 아니라 H2로 대조했습니다. 네 가지 조합을 모두, 화면의 SQL 전체(주석 줄 포함)를 글자 그대로 실행했습니다. 첫 줄 주석에 적힌 주소로 연결했고, 주석 줄은 뒤따르는 문장과 함께 DB에 보냈습니다. 먼저 새 자바 프로세스가 "DB 프로그램이 갑자기 꺼졌다가" 줄 앞까지의 문장을 한 문장씩 실행한 뒤 연결을 닫지도 종료 절차를 돌리지도 않고 Runtime.halt 메서드로 프로세스를 바로 끝냈고(종료 코드 7), 다시 새 자바 프로세스가 같은 주소로 연결해 그 줄 뒤의 SELECT를 실행했습니다. 파일 DB의 주소 ./shop은 조합마다 따로 만든 폴더 안의 파일입니다. 대조한 것은 결과 표의 세 항목, 곧 다시 켠 뒤 읽은 행(행 수와 값, 또는 오류의 종류), COMMIT 줄이 있는지, 폴더에 만들어진 파일입니다. 파일 DB는 꺼진 뒤 정리 없이 다시 열렸고, 네 조합 가운데 행이 남은 것은 파일 DB에서 COMMIT한 조합 하나뿐이었습니다. 메모리 DB는 폴더에 파일을 만들지 않았고, 다시 켠 연결에서 memo 테이블이 없다는 오류(H2 오류 코드 42104, 메시지에 this database is empty)가 났습니다. 오류의 원문은 Probe 출력에 있고 화면에는 종류만 한국어로 옮겼습니다. 단계 문장이 기대는 사실로 BEGIN 뒤 자동 커밋이 꺼지고 COMMIT 뒤 다시 켜지는 것, 꺼지기 직전 같은 연결에서 읽으면 1행이 보이는 것, CREATE TABLE이 BEGIN 앞에서 확정되어 COMMIT 없이 꺼진 뒤에도 테이블이 남는 것도 실행으로 확인했습니다. 화면의 코드에는 이 확인용 조회가 없고, memo 테이블의 열 이름 text는 H2에서 쓸 수 있었습니다. 중요한 점: 이 실습의 파일 DB 주소에는 ;WRITE_DELAY=0을 붙였습니다. H2 문서(commands 페이지의 SET WRITE_DELAY)는 COMMIT과 로그를 파일에 쓰는 사이의 최대 지연을 밀리초로 정하며 기본값이 500이라고 하고, 데이터베이스 주소에 ;WRITE_DELAY=0으로 붙일 수 있다고 합니다. 이 설정을 뺀 H2 기본 설정에서 파일 DB로 COMMIT 직후에 바로 끝내면, 다섯 번 모두 다시 켠 뒤 memo 테이블도 행도 없었고(DB 파일은 있으나 비어 있었음), COMMIT 뒤 1.5초를 기다렸다가 끝내면 두 번 모두 행이 남았습니다. 즉 이 실습의 "COMMIT하면 남는다"는 WRITE_DELAY=0 설정에서 관찰한 결과입니다. H2 문서(advanced 페이지의 Durability Problems)도 H2가 기본으로 COMMIT한 내용을 파일에 쓰는 일을 미루고, 전원이 나가면 1초 남짓 COMMIT한 내용을 잃을 수 있으며, 하드 디스크가 fsync를 지키지 않는 경우가 많아 완전한 지속성은 어렵다고 설명합니다. 그리고 이 실습은 전원을 끊은 것이 아니라 프로세스만 끝낸 것이라서, 프로세스가 끝나도 운영체제가 받아 둔 파일 쓰기는 남기 때문에 전원이 나가는 경우의 지속성은 실행으로 확인하지 못했습니다. 메모리 DB가 마지막 연결을 닫으면(또는 프로그램이 끝나면) 사라진다는 것은 H2 문서(features 페이지의 In-Memory Databases)를 따랐고, 이 실습에서는 프로세스가 끝난 경우를 실행으로 확인했습니다. MySQL 8.4 문서의 "InnoDB and the ACID Model" 페이지는 지속성이 MySQL 소프트웨어와 하드웨어 설정이 함께 정하는 성질이라 하며 innodb_flush_log_at_trx_commit, sync_binlog, fsync() 지원, 저장 장치의 쓰기 버퍼 같은 것을 관련 요소로 꼽고, 용어집의 ACID 항목은 commit이 성공하면 그 변경이 전원 장애나 시스템 충돌에도 안전하며 지속성은 보통 디스크에 쓰는 것을 뜻한다고 적고 있습니다. 이 문서들은 직접 열어 확인했지만 MySQL에서 같은 결과가 나오는지는 실행하지 않았습니다. 이 실습은 지속성의 겉모습, 곧 COMMIT과 저장 장소에 따라 꺼졌다 켜진 뒤 데이터가 남는지만 다룹니다. 로그와 버퍼 풀이 이것을 어떻게 지키는지는 세부 동작 실습 "Undo와 Redo 로그"와 "버퍼 풀과 페이지"에서, 트랜잭션 묶음 자체는 "트랜잭션"에서 다룹니다.',
});
