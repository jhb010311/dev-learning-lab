Lab.register({
  id: 'pc_basic', nav: '영속성 컨텍스트', cat: '기초개념', mode: 'step', basic: true, deep: ['pc'],
  title: '영속성 컨텍스트는 무엇이고, 무엇을 해 주는가',
  intro: '영속성 컨텍스트는 EntityManager(코드의 em)가 엔티티 객체를 보관하면서 지켜보는 곳입니다. 엔티티는 DB의 행 하나에 대응하는 자바 객체이고, 여기서는 Member입니다. em.find로 DB에서 읽어 온 엔티티가 영속성 컨텍스트에 들어갑니다(새로 저장할 때 쓰는 em.persist로 넘긴 엔티티도 들어가지만 이 실습에는 나오지 않습니다). 들어 있는 엔티티는 JPA가 지켜보고 있어서, 값을 바꾸기만 해도 트랜잭션을 커밋할 때 JPA가 UPDATE 문을 만들어 보냅니다. 같은 id를 다시 find하면 DB에 가지 않고 보관하던 그 객체를 줍니다. 반대로 new로 직접 만든 객체나 em.detach로 떼어 낸 객체는 영속성 컨텍스트에 들어 있지 않은 평범한 자바 객체여서, 값을 바꿔도 DB에 반영되지 않습니다. 이 실습은 Member를 얻는 방법을 바꿔 가며 같은 코드(name을 이영희로 바꾸고 커밋)를 실행해, 커밋 뒤 DB의 name과 나간 UPDATE, SELECT 문의 수를 봅니다.',
  terms: ['영속성 컨텍스트', '변경 감지(Dirty Checking)', '1차 캐시', '준영속 상태'],
  controls: [
    { id: 'how', label: 'Member를 얻는 코드', type: 'select', value: 'find', options: [['find', 'em.find로 가져온다'], ['new', 'new Member(1L, "김철수")로 직접 만든다'], ['detach', 'em.find로 가져온 뒤 em.detach(m)으로 떼어 낸다']] },
    { id: 'again', label: '같은 id로 한 번 더 find한다', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '영속성 컨텍스트는 무엇이고, find로 가져온 엔티티의 값을 바꾸면 무슨 일이 일어나나', d: 'find로 가져온 Member의 name만 바꿨는데, 커밋할 때 JPA가 UPDATE 문을 보내 DB가 이영희가 됩니다.', v: { how: 'find', again: false } },
    { t: 'new로 직접 만들면', q: 'find 대신 new로 직접 만든 객체의 값을 바꾸면', d: 'new로 만든 객체는 영속성 컨텍스트에 없는 평범한 객체라서, 바꿔도 UPDATE가 나가지 않고 DB는 김철수 그대로입니다.', v: { how: 'new', again: false } },
    { t: 'find 뒤 detach로 떼어 내면', q: 'find로 가져온 뒤 em.detach(m)으로 떼어 내면', d: 'find로 가져왔어도 떼어 내면 지켜보지 않는 평범한 객체가 되어, 바꿔도 UPDATE가 나가지 않습니다.', v: { how: 'detach', again: false } },
    { t: '같은 id로 한 번 더 find하면', q: '같은 id로 한 번 더 find하면', d: '두 번째 find는 DB에 가지 않고 보관하던 객체를 주어서, SELECT는 1번이고 m == m2가 true입니다.', v: { how: 'find', again: true } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/PcBasicProbe.java)이 실행한 코드는 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var l = ['em.getTransaction().begin();'];
    if (c.how === 'new') l.push('Member m = new Member(1L, "김철수");');
    else {
      l.push('// find: DB에서 읽어 온 엔티티가 영속성 컨텍스트에 들어간다', 'Member m = em.find(Member.class, 1L);');
      if (c.how === 'detach') l.push('em.detach(m);');
    }
    l.push('m.setName("이영희");');
    if (c.again) l.push('Member m2 = em.find(Member.class, 1L);', 'System.out.println(m == m2);');
    l.push('em.getTransaction().commit();');
    return l.join('\n');
  },
  label: function (c) { return { find: 'em.find로 가져옴', 'new': 'new로 직접 만듦', detach: 'find 뒤 detach로 떼어 냄' }[c.how] + (c.again ? ' · 같은 id로 한 번 더 find' : ''); },
  columns: ['커밋 뒤 DB의 name', '나간 UPDATE 문', '나간 SELECT 문', 'm == m2'],
  simulate: function (c) {
    var how = c.how, again = !!c.again, managed = how === 'find', ev = [], sum = [];
    // 상태: o1은 m이 가리키는 객체, o2는 m2가 따로 읽어 온 객체(없을 수 있음). in은 영속성 컨텍스트 안인가, first는 JPA가 기억하는 처음 값.
    // mv와 m2v는 변수가 가리키는 객체, sel과 upd는 이 단계에서 나간 SQL의 화살표, hot은 이 단계에서 달라진 객체
    var st = { o1: null, o2: null, mv: '', m2v: '', db: '김철수', ns: 0, nu: 0, sel: false, upd: false, hot: '', fin: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function step() { st.sel = false; st.upd = false; st.hot = ''; }

    // 준비: DB의 행
    push('DB의 준비: 코드가 실행되기 전에 DB의 member 테이블에는 id가 1인 행 (1, 김철수)가 하나 들어 있습니다. 이 행은 화면의 코드 바깥에서 미리 넣어 둔 것입니다. 코드에 나오는 em은 EntityManager 객체이고, em이 엔티티(DB의 행 하나에 대응하는 자바 객체, 여기서는 Member)를 보관하면서 지켜보는 곳이 영속성 컨텍스트입니다. 지금은 비어 있습니다.', '');

    // begin
    step();
    push('em.getTransaction().begin(): 트랜잭션을 시작합니다. 여기서부터 commit까지가 한 묶음의 작업입니다.', '');

    // m을 얻는다
    step();
    if (how === 'new') {
      st.o1 = { inn: false, name: '김철수', first: '' }; st.mv = 'o1'; st.hot = 'o1';
      push('Member m = new Member(1L, "김철수"): 우리가 new로 Member 객체를 만듭니다. 이 객체를 영속성 컨텍스트에 넣는 줄이 없으므로, 영속성 컨텍스트 밖에 있는 평범한 자바 객체입니다. 같은 id 1을 달았어도 em은 이 객체를 모르고, SQL도 나가지 않았습니다.', '');
    } else {
      st.o1 = { inn: true, name: '김철수', first: '김철수' }; st.mv = 'o1'; st.hot = 'o1'; st.sel = true; st.ns++;
      push('Member m = em.find(Member.class, 1L): em이 id가 1인 Member를 찾습니다. 영속성 컨텍스트에는 아직 없으므로 JPA가 SELECT 문을 만들어 DB에 보내고, 읽어 온 값으로 Member 객체를 만들어 영속성 컨텍스트에 넣습니다. JPA는 이때의 값(김철수)도 기억해 둡니다. m은 이 객체를 가리킵니다. SELECT를 쓴 줄은 우리가 쓴 코드에 없고, JPA가 만들어 보냈습니다.', '');
    }

    // detach
    if (how === 'detach') {
      step();
      st.o1.inn = false; st.o1.first = ''; st.hot = 'o1';
      push('em.detach(m): em이 m이 가리키는 객체를 영속성 컨텍스트에서 떼어 냅니다. 객체는 그대로(name은 김철수) 남아 있지만, 이제 영속성 컨텍스트 밖의 평범한 자바 객체입니다. JPA가 이 객체에 대해 기억하던 처음 값도 없어졌습니다.', '');
    }

    // setName
    step();
    st.o1.name = '이영희'; st.hot = 'o1';
    if (managed) push('m.setName("이영희"): 자바 객체의 name만 이영희로 바뀝니다. 이 줄에서는 SQL이 나가지 않고, DB의 name은 그대로 김철수입니다. 영속성 컨텍스트 안의 객체는 지금 값(이영희)과 JPA가 기억하는 처음 값(김철수)이 달라졌습니다.', '');
    else push('m.setName("이영희"): m이 가리키는 객체의 name이 이영희로 바뀝니다. 이 객체는 영속성 컨텍스트 밖에 있어서 JPA는 이 변화를 알지 못하고, SQL도 나가지 않습니다.' + (how === 'detach' ? ' 떼어 내기 전에는 JPA가 지켜보던 객체였지만 지금은 아닙니다.' : ''), '');

    // 한 번 더 find
    if (again) {
      step();
      if (managed) {
        st.m2v = 'o1'; st.hot = 'o1';
        push('Member m2 = em.find(Member.class, 1L): 같은 id 1을 한 번 더 찾습니다. 영속성 컨텍스트에 id가 1인 객체가 이미 들어 있으므로, JPA는 DB에 가지 않고(SELECT를 보내지 않고) 보관하던 그 객체를 줍니다. m2도 m과 같은 객체를 가리키고, 이 객체의 name은 아직 커밋 전인데도 이영희입니다.', 'good');
        step();
        push('System.out.println(m == m2): true가 출력됩니다. m과 m2가 가리키는 객체가 같기 때문입니다.', '');
      } else {
        st.o2 = { inn: true, name: '김철수', first: '김철수' }; st.m2v = 'o2'; st.hot = 'o2'; st.sel = true; st.ns++;
        push('Member m2 = em.find(Member.class, 1L): 같은 id 1을 한 번 더 찾지만, ' + (how === 'new' ? '영속성 컨텍스트에는 id가 1인 객체가 없습니다(m은 영속성 컨텍스트에 들어 있지 않습니다).' : 'em.detach(m)으로 m을 떼어 냈으므로 영속성 컨텍스트에는 id가 1인 객체가 없습니다.') + ' JPA가 SELECT 문을 ' + (how === 'new' ? '보내' : '한 번 더 보내') + ' DB의 값으로 새 Member 객체를 만들어 영속성 컨텍스트에 넣고, m2가 그것을 가리킵니다. 이 객체의 name은 DB에 있던 김철수입니다.', '');
        step();
        push('System.out.println(m == m2): false가 출력됩니다. ' + (how === 'new' ? 'm은 우리가 new로 만든 객체' : 'm은 떼어 낸 객체') + '이고 m2는 영속성 컨텍스트에 들어 있는 다른 객체이기 때문입니다. 둘 다 id는 1이지만 name이 다릅니다(이영희, 김철수).', '');
      }
    }

    // commit
    step();
    if (managed) {
      st.upd = true; st.nu++; st.db = '이영희'; st.o1.first = '이영희'; st.hot = 'o1';
      push('em.getTransaction().commit(): 커밋할 때 JPA가 영속성 컨텍스트에 보관 중인 엔티티의 현재 값을 기억해 둔 처음 값과 비교합니다. name이 김철수에서 이영희로 달라졌으므로, JPA가 UPDATE 문을 만들어 DB에 보냅니다. 우리가 쓴 코드에는 UPDATE도, 저장하라는 호출도 없습니다. UPDATE가 나간 것은 m.setName 줄이 아니라 이 commit 줄입니다.' + (again ? ' 두 변수가 같은 객체를 가리키므로 UPDATE는 1번만 나갑니다.' : ''), 'good');
    } else {
      var who = how === 'new' ? 'new로 만든 m' : '떼어 낸 m';
      push('em.getTransaction().commit(): 커밋할 때 JPA가 비교하는 것은 영속성 컨텍스트에 들어 있는 엔티티뿐입니다. ' + (again ? 'm2가 가리키는 객체는 들어 있지만 값이 처음과 같고, ' + who + '이 가리키는 객체는 들어 있지 않습니다. 달라진 것이 없어 UPDATE 문은 나가지 않습니다.' : '영속성 컨텍스트에는 들어 있는 엔티티가 없으므로 비교할 것이 없고, UPDATE 문은 나가지 않습니다. m이 가리키는 객체의 name은 이영희로 바뀌어 있지만 JPA는 그것을 보지 않습니다.'), 'bad');
    }

    // DB 확인
    step();
    st.fin = st.db; st.hot = '';
    push('커밋이 끝난 뒤 다른 연결로 DB의 member 테이블을 조회하면, id가 1인 행의 name은 ' + st.db + '입니다. (이 조회는 확인용이어서 나간 SELECT 문의 수에 세지 않습니다.)' + (managed ? '' : ' 코드에서 m의 name을 이영희로 바꿨지만 DB에는 반영되지 않았습니다.'), managed ? 'good' : 'bad');

    // 요약: 첫 줄은 물음의 답
    var S = {
      'find|0': ['영속성 컨텍스트는 EntityManager가 엔티티 객체를 보관하면서 지켜보는 곳입니다. em.find로 가져온 Member는 여기에 들어가 있어서, name만 바꿨는데 커밋할 때 JPA가 UPDATE 문을 1번 만들어 보내 DB의 name이 이영희가 되었습니다.', '우리가 쓴 코드에는 UPDATE도 저장하라는 호출도 없습니다. 영속성 컨텍스트 안의 엔티티는 값을 바꾸기만 하면 커밋할 때 DB에 반영됩니다.'],
      'new|0': ['new로 만든 Member는 영속성 컨텍스트에 들어 있지 않은 평범한 자바 객체여서, name을 바꿔도 UPDATE가 나가지 않고 DB의 name은 김철수 그대로입니다.', '같은 클래스이고 같은 id를 달았어도 JPA가 지켜보는 것은 영속성 컨텍스트에 들어 있는 객체뿐입니다. 예외도 나지 않아서 놓치기 쉽습니다.'],
      'detach|0': ['em.detach(m)으로 떼어 낸 Member는 find로 가져왔어도 더는 지켜보지 않는 평범한 자바 객체여서, name을 바꿔도 UPDATE가 나가지 않고 DB의 name은 김철수 그대로입니다.', '영속성 컨텍스트에 들어 있는지는 객체를 어디서 얻었는지가 아니라 지금 들어 있는지로 정해집니다. SELECT가 1번 나간 것은 떼어 내기 전의 find 때문입니다.'],
      'find|1': ['같은 id로 한 번 더 find하면 DB에 가지 않고 영속성 컨텍스트에 보관하던 객체를 줍니다. SELECT는 여전히 1번이고, m == m2는 true입니다.', 'm2가 받은 객체의 name은 아직 커밋 전인데도 이영희입니다. DB의 값이 아니라 영속성 컨텍스트가 들고 있는 객체를 받았기 때문이고, 객체가 하나라서 UPDATE도 1번만 나갔습니다.'],
      'new|1': ['new로 만든 m은 영속성 컨텍스트에 없어서, find가 DB에 가서(SELECT 1번) 새 Member 객체를 가져왔습니다. m == m2는 false이고, m의 name은 이영희, m2의 name은 김철수입니다.', '같은 id 1이어도 m은 영속성 컨텍스트 밖의 평범한 객체이고 m2는 안의 객체입니다. 값을 바꾼 것은 m뿐이라 UPDATE는 0번이고, DB의 name은 김철수 그대로입니다.'],
      'detach|1': ['떼어 낸 뒤에는 영속성 컨텍스트에 id가 1인 객체가 없어서, 같은 id로 find하면 DB에 다시 갑니다(SELECT 2번). m == m2는 false입니다.', 'm은 떼어 낸 객체(이영희)이고 m2는 새로 읽어 온 객체(김철수)입니다. 영속성 컨텍스트 안의 m2는 바뀐 것이 없어서 UPDATE는 0번이고, DB의 name은 김철수 그대로입니다.']
    };
    S[how + '|' + (again ? 1 : 0)].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, row: [st.db, st.nu + '번', st.ns + '번', again ? (managed ? 'true' : 'false') : '(다시 찾지 않음)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, again = !!c.again;
    if (!s) { H.text(v, '실행을 누르면 DB에 (1, 김철수)가 들어 있는 것부터 시작합니다.'); return; }
    var rows = [];
    function vr(name, key) {
      var o = key ? s[key] : null;
      rows.push({ cls: '', cells: [name, o ? o.name : '-', o ? { v: o.inn ? '들어 있음' : '들어 있지 않음', cls: o.inn ? 'good' : 'bad' } : '-'] });
    }
    vr('m', s.mv);
    if (again) vr('m2', s.m2v);
    H.table(v, ['변수', '가리키는 객체의 name', '영속성 컨텍스트에'], rows, '코드의 변수');
    H.table(v, ['DB의 member 테이블', 'name'], [{ cls: '', cells: ['id 1', { v: s.db, cls: s.db === '이영희' ? 'good' : '' }] }], 'DB');
    H.counters(v, [[s.nu, '나간 UPDATE 문'], [s.ns, '나간 SELECT 문']]);
  },
  // 그림: 왼쪽에 코드의 변수 m(과 m2), 가운데에 영속성 컨텍스트 영역, 오른쪽에 DB의 member 행. 객체 상자는 들어 있으면 영역 안에, 아니면 영역 밖(아래)에 있고, 변수 화살표가 그 객체를 가리킨다.
  draw: function (P, sim, shown) {
    var c = sim.c, again = !!c.again, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.text('lv', 62, 32, '코드의 변수', { cls: 'mut', anchor: 'middle' });
    P.box('vm', 14, 46, 96, 44, { cls: s && s.mv ? 'plain' : 'ghost', title: 'm', sub: s && s.mv ? ' ' : '아직 없음' });
    if (again) P.box('vm2', 14, 102, 96, 44, { cls: s && s.m2v ? 'plain' : 'ghost', title: 'm2', sub: s && s.m2v ? ' ' : '아직 없음' });
    P.region('ctx', 150, 14, 280, 118, '영속성 컨텍스트');
    P.region('db', 482, 14, 184, 118, 'DB의 member 테이블');
    P.box('row', 494, 48, 160, 66, { cls: s && s.upd ? 'hot' : 'wait', title: 'id 1', sub: ['name: ' + (s ? s.db : '김철수')] });
    var outside = false, pos = {};
    ['o1', 'o2'].forEach(function (k) {
      var o = s ? s[k] : null;
      if (!o) return;
      if (!o.inn) outside = true;
      P.box(k, 162, o.inn ? 48 : 158, 256, 66, { cls: s.hot === k ? 'hot' : o.inn ? 'wait' : 'plain', title: 'Member 객체', sub: ['name: ' + o.name, '기억하는 처음 값: ' + (o.first || '없음')] });
    });
    if (outside) P.text('out', 290, 150, '영속성 컨텍스트 밖', { cls: 'mut', anchor: 'middle' });
    if (s && s.mv) P.arrow('am', 'vm:r', s.mv + ':l:0.3', {});
    if (s && s.m2v) P.arrow('am2', 'vm2:r', s.m2v + ':l:0.7', {});
    var tgt = s && s.o2 && s.o2.inn ? 'o2' : 'o1';
    if (s && s.sel) P.arrow('sel', 'row:l:0.3', tgt + ':r:0.3', { cls: 'hot' });
    if (s && s.upd) P.arrow('upd', 'o1:r:0.7', 'row:l:0.7', { cls: 'good' });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.nu ? 'good' : 'ghost', title: '나간 UPDATE 문', right: (s ? s.nu : 0) + '번' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.ns ? 'wait' : 'ghost', title: '나간 SELECT 문', right: (s ? s.ns : 0) + '번' });
    if (s && s.o1 && !s.o1.inn && s.o1.name === '이영희') P.note('영속성 컨텍스트 밖의 객체는 name을 바꿔도 JPA가 알지 못합니다.');
  },
  assume: 'Hibernate 7.4.5와 H2 2.4.240(메모리 DB)에서 실행해 대조했습니다. 스프링 없이 SessionFactory를 직접 만들었고, JDK 21입니다. 여섯 가지 조합을 모두, 화면의 코드 줄을 글자 그대로(주석 줄 포함) 컴파일해 실행했습니다. 조합마다 DB와 SessionFactory를 새로 만들고, DB에는 실행 전에 JDBC로 (1, 김철수) 한 행을 미리 넣었습니다. 이 준비의 SQL은 세지 않았습니다. 화면에 보이지 않는 것은 Member 엔티티(@Entity, @Id가 붙은 id와 name, 생성자, setName과 getName)와 EntityManager를 얻고 닫는 코드이고, 트랜잭션은 em에서 직접 시작하고 커밋했습니다. 대조한 것은 커밋 뒤 다른 연결(순수 JDBC)로 조회한 name, Hibernate의 StatementInspector로 센 UPDATE와 SELECT 문의 수(SQL 원문과 나간 줄은 대조 출력에 남겼습니다), 코드가 화면에 찍은 m == m2입니다. 단계 문장이 기대는 사실도 코드 줄마다 바로 아래에 측정 줄을 끼운 두 번째 실행에서 쟀습니다. em.contains(m)(find로 가져온 뒤에는 true, new로 만든 객체와 detach로 뗀 뒤에는 false), UPDATE는 m.setName 줄이 아니라 commit 줄에서 나간다는 것, 같은 id를 다시 find할 때 find 조합에서는 SELECT가 늘지 않고 아직 커밋 전인데도 name이 이영희인 같은 객체를 받는다는 것(new와 detach 조합에서는 SELECT가 늘고 name이 김철수인 새 객체를 받는다는 것), Hibernate가 읽어 올 때의 값을 따로 기억한다는 것(내부 API로 보면 읽은 뒤 [김철수], detach 뒤에는 기억 없음)입니다. 이름을 이영희로 바꿨다가 김철수로 되돌린 뒤 커밋하면 UPDATE가 나가지 않는다는 것도 따로 실행해, "바꾸는 호출을 했는지"가 아니라 처음 값과 비교한다는 근거로 삼았습니다. 또 new로 만든 객체를 em.persist로 넘기면 em.contains가 true가 되고 커밋할 때 INSERT가 나가는 것도 실행해 확인했습니다. 문서가 정한 것은 Jakarta Persistence 3.2 명세의 3.1절(EntityManager마다 영속성 컨텍스트가 있고, 그 안에는 같은 식별자의 엔티티 인스턴스가 하나뿐이라는 것), 3.3절(엔티티 인스턴스의 생명주기: managed는 영속성 컨텍스트에 속한 상태, detached는 속하지 않거나 더는 속하지 않는 상태), 3.3.2절(persist로 managed가 되는 것), 3.3.4절(영속 엔티티의 상태가 트랜잭션 커밋 때 DB와 맞춰지는 것), 3.3.6절과 3.3.7절(영속성 컨텍스트에서 떼어 낸 인스턴스는 그 밖에서 살아간다는 것)입니다. 명세 페이지는 요약으로만 돌아와 이 절들의 원문 전체를 읽지는 못했습니다. 처음 값을 기억해 비교하는 방식과 나가는 SQL의 모양은 명세가 정한 것이 아니라 Hibernate 7.4.5에서 관찰한 동작이므로, 화면에는 SQL 문장 대신 횟수만 적었습니다. 이 실습은 em을 직접 만들어 쓰는 모양이라 스프링의 @Transactional과 함께 쓸 때(영속성 컨텍스트가 트랜잭션과 같이 만들어지고 끝납니다)나, 쓰기 지연, 쿼리를 실행하기 직전의 flush, em.persist로 새로 저장하는 일은 다루지 않으며, 세부는 "JPA는 SQL을 언제 보내나" 실습에서 다룹니다. MySQL에서의 실행 대조는 하지 않았습니다.',
});
