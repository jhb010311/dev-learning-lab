Lab.register({
  id: 'dynquery', nav: '동적 쿼리와 Querydsl', cat: 'JPA', mode: 'step',
  title: '검색 조건이 있을 때만 where에 붙이려면',
  intro: '회원 검색 화면에서 이름과 나이는 입력할 수도 있고 비워 둘 수도 있습니다. 입력된 조건만 where에 넣어야 하므로 쿼리의 모양이 요청마다 달라집니다. 이런 쿼리를 동적 쿼리라고 합니다.',
  terms: ['동적 쿼리', 'JPQL', 'Criteria API', 'Querydsl', 'SQL Injection'],
  controls: [
    { id: 'how', label: '쿼리를 만드는 방법', type: 'select', value: 'fixed', options: [['fixed', '문자열 잇기: where를 미리 붙여 둠'], ['nospace', '문자열 잇기: 띄어쓰기를 빠뜨림'], ['join', '문자열 잇기: 조건을 모아서 and로 이음'], ['criteria', 'JPA Criteria API (코드로 조립)'], ['querydsl', 'Querydsl (코드로 조립, 실행은 못 함)']] },
    { id: 'name', label: '이름 조건을 입력했다 (김철수)', type: 'check', value: false },
    { id: 'age', label: '나이 조건을 입력했다 (20세 이상)', type: 'check', value: true },
  ],
  presets: [
    { t: '처음 설정으로', q: '이름은 입력하지 않고 나이 20 이상만 입력해, where를 미리 붙여 둔 문자열 잇기로 쿼리를 만들면', d: '나이만 입력했더니 where 바로 뒤에 and가 와서 문법 오류가 납니다.', v: { how: 'fixed', name: false, age: true } },
    { t: '같은 코드에 조건을 둘 다 넣으면', q: '같은 코드에 이름 김철수와 나이 20 이상을 둘 다 넣으면', d: '아무 문제 없이 동작합니다. 그래서 이 조합만 시험하면 오류를 놓칩니다.', v: { how: 'fixed', name: true, age: true } },
    { t: '조건을 하나도 넣지 않으면', q: '이름과 나이 조건을 둘 다 입력하지 않으면', d: '문자열이 where로 끝나서 문법 오류가 납니다.', v: { how: 'fixed', name: false, age: false } },
    { t: '띄어쓰기 하나를 빠뜨리면', q: '띄어쓰기를 빠뜨린 문자열 잇기에 이름 김철수만 입력하고 나이는 입력하지 않으면', d: 'm과 where가 붙어 mwhere가 됩니다.', v: { how: 'nospace', name: true, age: false } },
    { t: '조건을 모아서 잇기', q: '조건을 모아서 and로 잇는 문자열 방식으로 바꾸면', d: '문자열로도 바르게 만들 수는 있습니다.', v: { how: 'join', name: false, age: true } },
    { t: 'Criteria API로 조립', q: 'JPA Criteria API로 조립하는데 이름도 나이도 입력하지 않으면', d: '조건이 없으면 where가 아예 생기지 않습니다.', v: { how: 'criteria', name: false, age: false } },
    { t: 'Querydsl로 조립', q: '이름은 입력하지 않고 나이 20 이상만 Querydsl로 조립하면', d: 'null인 조건은 where가 알아서 건너뜁니다(문서 기준).', v: { how: 'querydsl', name: false, age: true } },
  ],
  // 회원 7명 (이름, 나이). Probe가 넣는 데이터와 같다
  members: [['김철수', 30], ['김철수', 17], ['이영희', 25], ['박민수', 41], ['김영수', 22], ['최지우', 19], ['이철민', 35]],
  // 방법마다의 코드. 조립하는 줄(L)과 실행하는 줄(R)로 나눈다
  lines: function (c) {
    if (c.how === 'fixed') return ['String jpql = "select m from Member m where";', 'if (name != null) jpql += " m.name = :name";', 'if (age != null)  jpql += " and m.age >= :age";'];
    if (c.how === 'nospace') return ['String jpql = "select m from Member m";  boolean first = true;', 'if (name != null) { jpql += (first ? "where" : "and") + " m.name = :name"; first = false; }', 'if (age != null)  { jpql += (first ? "where" : "and") + " m.age >= :age"; first = false; }'];
    if (c.how === 'join') return ['List<String> conds = new ArrayList<>();', 'if (name != null) conds.add("m.name = :name");', 'if (age != null)  conds.add("m.age >= :age");', 'String jpql = "select m from Member m";', 'if (!conds.isEmpty()) jpql += " where " + String.join(" and ", conds);'];
    if (c.how === 'criteria') return ['List<Predicate> conds = new ArrayList<>();', 'if (name != null) conds.add(cb.equal(m.get("name"), name));', 'if (age != null)  conds.add(cb.greaterThanOrEqualTo(m.get("age"), age));', 'cq.select(m).where(conds.toArray(new Predicate[0]));'];
    return ['.selectFrom(m)', '.where(nameEq(name), ageGoe(age))   // null인 조건은 건너뛴다', '.fetch();'];
  },
  code: function (c) {
    var L = this.lines(c), call = '\n\nsearch(' + (c.name ? '"김철수"' : 'null') + ', ' + (c.age ? '20' : 'null') + ');   // ' + (c.name ? '이름은 김철수' : '이름은 입력 안 함') + ', ' + (c.age ? '나이는 20 이상' : '나이는 입력 안 함');
    var ind = function (a) { return a.map(function (l) { return '    ' + l; }).join('\n'); };
    var run = '\n\n    TypedQuery<Member> query = em.createQuery(jpql, Member.class);\n    if (name != null) query.setParameter("name", name);\n    if (age != null)  query.setParameter("age", age);\n    return query.getResultList();\n}';
    if (c.how === 'criteria') return 'List<Member> search(String name, Integer age) {\n    CriteriaBuilder cb = em.getCriteriaBuilder();\n    CriteriaQuery<Member> cq = cb.createQuery(Member.class);\n    Root<Member> m = cq.from(Member.class);\n\n' + ind(L.slice(0, 3)) + '\n\n' + ind(L.slice(3)) + '\n    return em.createQuery(cq).getResultList();\n}' + call;
    if (c.how === 'querydsl') return 'List<Member> search(String name, Integer age) {\n    QMember m = QMember.member;\n    return queryFactory            // JPAQueryFactory\n' + L.map(function (l) { return '        ' + l; }).join('\n') + '\n}\n\nBooleanExpression nameEq(String name) {\n    return name == null ? null : QMember.member.name.eq(name);\n}\nBooleanExpression ageGoe(Integer age) {\n    return age == null ? null : QMember.member.age.goe(age);\n}\n\n// 같은 일을 BooleanBuilder로 해도 된다\n// BooleanBuilder builder = new BooleanBuilder();\n// if (name != null) builder.and(m.name.eq(name));\n// if (age != null)  builder.and(m.age.goe(age));\n// queryFactory.selectFrom(m).where(builder).fetch();' + call;
    return 'List<Member> search(String name, Integer age) {\n' + ind(L) + run + call;
  },
  label: function (c) { return { fixed: 'where를 미리 붙임', nospace: '띄어쓰기 빠뜨림', join: '조건을 모아 이음', criteria: 'Criteria API', querydsl: 'Querydsl' }[c.how] + ' · 이름 ' + (c.name ? '입력' : '없음') + ' · 나이 ' + (c.age ? '입력' : '없음'); },
  columns: ['조립된 쿼리', '실행 결과', 'DB로 나간 SQL의 where', '조회된 회원'],
  // 문자열을 조립한다. Probe의 자바 코드와 같은 순서다. 돌려주는 것은 [완성된 문자열, 줄마다 붙인 조각]
  build: function (how, name, age) {
    var jpql, add = ['', ''];
    if (how === 'fixed') { jpql = 'select m from Member m where'; if (name) { add[0] = ' m.name = :name'; jpql += add[0]; } if (age) { add[1] = ' and m.age >= :age'; jpql += add[1]; } }
    else if (how === 'nospace') { jpql = 'select m from Member m'; var first = true; if (name) { add[0] = (first ? 'where' : 'and') + ' m.name = :name'; jpql += add[0]; first = false; } if (age) { add[1] = (first ? 'where' : 'and') + ' m.age >= :age'; jpql += add[1]; first = false; } }
    else { var conds = []; if (name) { add[0] = 'm.name = :name'; conds.push(add[0]); } if (age) { add[1] = 'm.age >= :age'; conds.push(add[1]); } jpql = 'select m from Member m'; if (conds.length) jpql += ' where ' + conds.join(' and '); }
    return [jpql, add];
  },
  // 이 실습에 나오는 문장만 읽을 수 있는 작은 문법 검사. 처음 걸리는 낱말과 그 위치(0부터 센 글자 번호)를 돌려준다. 문제가 없으면 null
  check: function (jpql) {
    var toks = [], re = /\S+/g, m; while ((m = re.exec(jpql))) toks.push({ s: m[0], at: m.index });
    var eof = { s: '<EOF>', at: jpql.length }, i = 5, t = function (k) { return toks[k] || eof; }, isOp = function (x) { return x.s === '=' || x.s === '>='; };
    // select m from Member 별칭 까지는 어떤 낱말이 와도 별칭으로 읽힌다
    if (i >= toks.length) return null;
    if (t(i).s !== 'where') return { at: t(i).at, tok: t(i).s.split('.')[0] };
    i++;
    for (;;) {
      if (t(i) === eof) return { at: eof.at, tok: eof.s };
      // 조건의 왼쪽: m.name 같은 경로. and 같은 낱말도 이름으로 읽히므로 여기서는 걸리지 않는다
      i++;
      if (!isOp(t(i))) return { at: t(i).at, tok: t(i).s.split('.')[0] };
      i += 2;
      if (t(i) === eof) return null;
      if (t(i).s !== 'and') return { at: t(i).at, tok: t(i).s.split('.')[0] };
      i++;
    }
  },
  simulate: function (c) {
    var self = this, ev = [], sum = [], L = this.lines(c), n = (c.name ? 1 : 0) + (c.age ? 1 : 0);
    var hit = this.members.filter(function (m) { return (!c.name || m[0] === '김철수') && (!c.age || m[1] >= 20); }).length;
    var where = n ? 'where ' + [c.name ? 'name = ?' : '', c.age ? 'age >= ?' : ''].filter(Boolean).join(' and ') : 'where 없음';
    var whereSay = n ? 'SQL의 조건은 "' + where + '"이고' : 'SQL에는 where가 없고';
    var st = { line: -1, name: c.name ? '김철수' : 'null', age: c.age ? '20' : 'null', pieces: [], full: { t: '', s: '', cls: 'ghost' }, run: { s: '아직 실행 전', cls: 'ghost' }, sql: 0 };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var str = c.how === 'fixed' || c.how === 'nospace' || c.how === 'join', row, err = null;
    var input = '검색 조건: 이름은 ' + (c.name ? '"김철수"' : '입력하지 않아 null') + ', 나이는 ' + (c.age ? '20' : '입력하지 않아 null') + '입니다. null이 아닌 조건만 쿼리의 where에 넣어야 합니다.';

    if (str) {
      var b = this.build(c.how, c.name, c.age), jpql = b[0], add = b[1], q = function (s) { return '"' + s + '"'; };
      st.full = { t: '지금까지 조립된 문자열 (jpql)', s: '아직 없음', cls: 'ghost' };
      if (c.how === 'join') {
        st.pieces = [{ t: q('m.name = :name'), r: '', cls: 'ghost' }, { t: q('m.age >= :age'), r: '', cls: 'ghost' }, { t: '" where " + String.join(" and ", conds)', r: '', cls: 'ghost' }];
        push(input);
        st.line = 0; st.full = { t: '조건 목록 (conds)', s: '비어 있음', cls: 'plain' };
        push('1번째 줄: 조건을 담을 빈 목록을 만듭니다. where나 and는 아직 쓰지 않습니다.');
        [['name', c.name, '이름'], ['age', c.age, '나이']].forEach(function (x, i) {
          st.line = i + 1; st.pieces[i] = { t: st.pieces[i].t, r: x[1] ? '목록에 넣음' : '건너뜀 (' + x[0] + '이 null)', cls: x[1] ? 'good' : 'ghost' };
          if (i === 1 && !x[1]) st.pieces[i].r = '건너뜀 (age가 null)';
          if (x[1]) st.full = { t: '조건 목록 (conds)', s: (i === 1 && c.name ? q('m.name = :name') + ', ' : '') + st.pieces[i].t, cls: 'plain' };
          push((i + 2) + '번째 줄: ' + (x[1] ? x[2] + ' 조건이 있으므로 조건 글자 ' + st.pieces[i].t + ' 하나를 목록에 넣습니다. 조건만 넣고, 앞뒤에 where나 and를 붙이지 않습니다.' : x[2] + ' 조건이 null이므로 건너뜁니다.'));
        });
        st.line = 4; st.pieces[2] = { t: st.pieces[2].t, r: n ? '붙임 (조건 ' + n + '개)' : '건너뜀 (목록이 비어 있음)', cls: n ? 'good' : 'ghost' };
        st.full = { t: '완성된 문자열 (jpql)', s: q(jpql), cls: 'plain' };
        push('4~5번째 줄: 기본 문장 "select m from Member m"에, ' + (n ? '목록에 조건이 ' + n + '개 있으므로 " where "를 붙이고 조건들을 ' + (n > 1 ? '" and "로 이어 붙입니다. and는 조건과 조건 사이에만 들어갑니다.' : '붙입니다. 조건이 하나라서 and는 들어가지 않습니다.') : '목록이 비어 있으므로 아무것도 붙이지 않습니다. where가 생기지 않습니다.'));
      } else {
        var base = c.how === 'fixed' ? 'select m from Member m where' : 'select m from Member m';
        var gen = c.how === 'fixed' ? [' m.name = :name', ' and m.age >= :age'] : ['(where 또는 and) + " m.name = :name"', '(where 또는 and) + " m.age >= :age"'];
        st.pieces = [{ t: q(base), r: '', cls: 'ghost' }, { t: c.how === 'fixed' ? q(gen[0]) : gen[0], r: '', cls: 'ghost' }, { t: c.how === 'fixed' ? q(gen[1]) : gen[1], r: '', cls: 'ghost' }];
        push(input);
        st.line = 0; st.pieces[0] = { t: q(base), r: '기본 문장', cls: 'good' }; st.full = { t: '지금까지 조립된 문자열 (jpql)', s: q(base), cls: 'plain' };
        push('1번째 줄: ' + (c.how === 'fixed' ? '기본 문장을 만듭니다. 조건이 붙을 것이라 보고 끝에 where를 미리 붙여 두었습니다.' : '기본 문장을 만듭니다. 아직 where는 없습니다. first는 "지금 붙이는 것이 첫 조건인가"를 기억하는 변수이고 true로 시작합니다.'));
        var cur = base, firstFlag = true;
        [['name', c.name, '이름'], ['age', c.age, '나이']].forEach(function (x, i) {
          st.line = i + 1;
          if (!x[1]) { st.pieces[i + 1] = { t: st.pieces[i + 1].t, r: '건너뜀 (' + x[0] + (i ? '가' : '이') + ' null)', cls: 'ghost' }; push((i + 2) + '번째 줄: ' + x[2] + ' 조건이 null이므로 건너뜁니다. 문자열은 그대로입니다.'); return; }
          cur += add[i]; st.pieces[i + 1] = { t: q(add[i]), r: '붙임', cls: 'good' }; st.full = { t: '지금까지 조립된 문자열 (jpql)', s: q(cur), cls: 'plain' };
          if (c.how === 'fixed') push((i + 2) + '번째 줄: ' + x[2] + ' 조건이 있으므로 뒤에 ' + q(add[i]) + ' 조각을 붙입니다.' + (i === 1 ? ' 이 줄은 앞에 이름 조건이 이미 붙어 있다고 보고 and로 시작합니다.' + (c.name ? '' : ' 그런데 이번에는 이름 조건이 붙지 않았습니다.') : ''), i === 1 && !c.name ? 'bad' : '');
          else { push((i + 2) + '번째 줄: ' + x[2] + ' 조건이 있습니다. first가 ' + firstFlag + '이므로 ' + (firstFlag ? 'where' : 'and') + '로 시작하는 ' + q(add[i]) + ' 조각을 뒤에 붙입니다. 붙이는 글자의 맨 앞에 띄어쓰기가 없습니다.', 'bad'); firstFlag = false; }
        });
        st.full = { t: '완성된 문자열 (jpql)', s: q(jpql), cls: 'plain' };
      }
      err = this.check(jpql);
      st.line = 90;
      if (err) {
        var why = c.how === 'nospace' ? '"Member m" 뒤에 띄어쓰기 없이 글자가 붙어 mwhere가 됐습니다. Hibernate는 mwhere를 Member에 붙인 별칭(이름)으로 읽습니다. where라는 낱말이 사라진 셈이라, 그다음 낱말 ' + err.tok + '에서 "여기에 올 수 없는 낱말"이라며 멈춥니다.' + (n === 2 ? ' 뒤쪽의 :nameand도 붙어 버렸지만, 앞에서 먼저 걸렸습니다.' : '')
          : n === 0 ? '문자열이 where로 끝났습니다. where 뒤에는 조건이 와야 하는데 아무것도 없으므로, 문자열의 끝(' + err.tok + ')에서 멈춥니다.'
          : 'where 바로 뒤에 and가 왔습니다. and 앞에 있어야 할 첫 조건이 없습니다. Hibernate의 문법에서는 and 같은 낱말도 이름으로 쓸 수 있어서 and까지는 이름으로 읽고 넘어가고, 그다음 낱말 ' + err.tok + '에서 멈춥니다.';
        st.full.cls = 'bad'; st.run = { s: 'SyntaxException · 위치 1:' + err.at + ' · 걸린 낱말 ' + err.tok, cls: 'bad' };
        push('em.createQuery(jpql, Member.class): Hibernate가 문자열을 처음부터 읽어 문법을 검사합니다. ' + why, 'bad');
        push('예외: createQuery가 IllegalArgumentException을 던집니다(원인은 Hibernate의 SyntaxException). 메시지에 나오는 "At 1:' + err.at + '"이라는 글자는 1번째 줄의 ' + err.at + '번 글자(0부터 셈)에서 멈췄다는 뜻입니다. SQL은 DB로 나가지 않았고, 검색 요청은 실패합니다.', 'bad');
        row = [jpql, '실패: SyntaxException (위치 1:' + err.at + ', 낱말 ' + err.tok + ')', 'SQL이 나가지 않음', '없음'];
      } else {
        push('em.createQuery(jpql, Member.class): Hibernate가 문자열을 처음부터 읽어 문법을 검사합니다. 문법에 맞습니다. 이어서 값이 있는 조건에만 setParameter로 값을 넣습니다.', 'good');
        st.sql = 1; st.run = { s: '성공 · SQL의 ' + where + ' · ' + hit + '명', cls: 'good' };
        push('query.getResultList(): SELECT 한 번이 DB로 나갑니다. ' + whereSay + ', 회원 7명 가운데 ' + hit + '명이 조회됩니다.', 'good');
        row = [jpql, '성공', where, hit + '명'];
      }
      // 이 방법이 네 가지 조합 가운데 어디에서 실패하는지
      var fails = [[false, false, '둘 다 없을 때'], [true, false, '이름만 있을 때'], [false, true, '나이만 있을 때'], [true, true, '둘 다 있을 때']].filter(function (x) { return self.check(self.build(c.how, x[0], x[1])[0]); }).map(function (x) { return x[2]; });
      if (fails.length) sum.push('이 코드는 네 가지 조합 가운데 ' + fails.join(', ') + ' 실패하고 나머지에서는 정상입니다. 컴파일러는 문자열 안을 검사하지 않고, 오류는 그 조합의 요청이 실제로 들어왔을 때에야 납니다. 모든 조합을 시험해 보지 않으면 운영 중에 드러납니다.');
      else sum.push('조건을 목록에 모은 뒤 사이에만 and를 넣으면 네 가지 조합이 모두 바르게 조립됩니다. 다만 여전히 문자열이라서 오타나 빠진 띄어쓰기를 컴파일러가 잡아 주지 못하고, 조건이 늘수록 코드를 읽기 어려워집니다.');
      sum.push('어느 방식이든 값은 문자열에 직접 이어 붙이지 않고 :name 같은 자리를 두고 setParameter로 넣습니다. 사용자가 입력한 값을 문장에 그대로 이어 붙이면 SQL Injection 공격에 노출됩니다.');
    }

    if (c.how === 'criteria') {
      var pn = 'cb.equal(m.get("name"), name)', pa = 'cb.greaterThanOrEqualTo(m.get("age"), age)';
      st.pieces = [{ t: pn, r: '', cls: 'ghost' }, { t: pa, r: '', cls: 'ghost' }, { t: 'where(conds.toArray(new Predicate[0]))', r: '', cls: 'ghost' }];
      st.full = { t: '조건 목록 (conds)', s: '아직 없음', cls: 'ghost' };
      push(input);
      st.line = 0; st.full = { t: '조건 목록 (conds)', s: 'Predicate 0개', cls: 'plain' };
      push('1번째 줄: 조건을 담을 빈 목록을 만듭니다. 목록에 담는 것은 글자가 아니라 Predicate라는 조건 객체입니다.');
      var cnt = 0;
      [['name', c.name, '이름', 'name = 김철수'], ['age', c.age, '나이', 'age >= 20']].forEach(function (x, i) {
        st.line = i + 1;
        if (x[1]) cnt++;
        st.pieces[i] = { t: st.pieces[i].t, r: x[1] ? '목록에 넣음' : '건너뜀 (' + x[0] + (i ? '가' : '이') + ' null)', cls: x[1] ? 'good' : 'ghost' };
        st.full = { t: '조건 목록 (conds)', s: 'Predicate ' + cnt + '개' + (cnt ? ': ' + [c.name ? 'name = 김철수' : '', i === 1 && c.age ? 'age >= 20' : ''].filter(Boolean).join(', ') : ''), cls: 'plain' };
        push((i + 2) + '번째 줄: ' + (x[1] ? x[2] + ' 조건이 있으므로 조건 객체(' + x[3] + ')를 만들어 목록에 넣습니다. cb는 조건 객체를 만들어 주는 CriteriaBuilder입니다.' : x[2] + ' 조건이 null이므로 건너뜁니다.'));
      });
      st.line = 3; st.pieces[2] = { t: st.pieces[2].t, r: '조건 ' + n + '개를 넘김', cls: 'good' };
      st.full = { t: '조립된 쿼리 (객체)', s: n ? '조건 ' + n + '개' + (n > 1 ? '를 and로 묶음' : '') : '조건 없음 (where 절이 생기지 않음)', cls: 'plain' };
      push('4번째 줄: 모은 조건 객체 ' + n + '개를 where에 넘깁니다. where나 and라는 글자를 직접 쓰지 않았습니다. ' + (n === 0 ? '조건이 0개이면 where 절이 없는 쿼리가 됩니다.' : n === 1 ? '조건이 1개이면 그 조건 하나만 where에 들어갑니다.' : '조건이 여러 개이면 JPA가 and로 묶습니다.'), 'good');
      st.line = 90; st.sql = 1; st.run = { s: '성공 · SQL의 ' + where + ' · ' + hit + '명', cls: 'good' };
      push('em.createQuery(cq).getResultList(): 조립한 객체로부터 SQL을 만들어 SELECT 한 번을 보냅니다. ' + whereSay + ', 회원 7명 가운데 ' + hit + '명이 조회됩니다. 문자열을 이어 붙이지 않았으므로 띄어쓰기나 and의 위치가 틀릴 일이 없습니다.', 'good');
      row = ['조건 객체 ' + n + '개 (문자열 없음)', '성공', where, hit + '명'];
      sum.push('조건 객체 ' + n + '개로 조립한 쿼리가 실행되어 ' + hit + '명이 조회됐습니다. 네 가지 조합 모두 문법 오류 없이 실행됩니다.');
      sum.push('where, and, 띄어쓰기를 사람이 쓰지 않고 JPA가 조건의 개수에 맞게 만들어 주기 때문입니다.');
      sum.push('다만 Criteria API는 코드가 길어 어떤 쿼리인지 한눈에 읽기 어렵습니다. 또 m.get("name")의 프로퍼티 이름은 여전히 문자열이라, 이름이 틀리면 컴파일이 아니라 실행 중에 예외가 납니다. Querydsl은 이 두 가지를 덜어 주려고 쓰는 라이브러리입니다.');
    }

    if (c.how === 'querydsl') {
      st.pieces = [{ t: 'nameEq(name)', r: '', cls: 'ghost' }, { t: 'ageGoe(age)', r: '', cls: 'ghost' }, { t: 'where(nameEq(name), ageGoe(age))', r: '', cls: 'ghost' }];
      st.full = { t: '조립된 쿼리 (객체)', s: '아직 없음', cls: 'ghost' };
      push(input);
      st.line = 0; push('selectFrom(m): 회원을 조회하는 쿼리 객체를 만듭니다. m은 QMember.member로, Querydsl이 Member 엔티티를 보고 만들어 둔 Q클래스의 객체입니다. m.name, m.age처럼 프로퍼티를 자바 코드로 가리킬 수 있습니다.');
      st.line = 1;
      st.pieces[0] = { t: 'nameEq(name)', r: c.name ? 'm.name.eq("김철수")' : 'null', cls: c.name ? 'good' : 'ghost' };
      push('nameEq(name): ' + (c.name ? '이름이 있으므로 "name = 김철수"를 뜻하는 조건 객체(BooleanExpression)를 돌려줍니다.' : '이름이 null이므로 조건 객체 대신 null을 돌려줍니다.'));
      st.pieces[1] = { t: 'ageGoe(age)', r: c.age ? 'm.age.goe(20)' : 'null', cls: c.age ? 'good' : 'ghost' };
      push('ageGoe(age): ' + (c.age ? '나이가 있으므로 "age >= 20"을 뜻하는 조건 객체를 돌려줍니다. goe는 "크거나 같다"는 뜻입니다.' : '나이가 null이므로 null을 돌려줍니다.'));
      st.pieces[2] = { t: st.pieces[2].t, r: 'null을 뺀 조건 ' + n + '개', cls: 'good' };
      st.full = { t: '조립된 쿼리 (객체)', s: n ? '조건 ' + n + '개' + (n > 1 ? '를 and로 묶음' : '') : '조건 없음 (where 절이 생기지 않음)', cls: 'plain' };
      push('where(nameEq(name), ageGoe(age)): Querydsl의 where는 넘겨받은 조건 가운데 null인 것을 건너뛰고(공식 API 문서: "Skips null arguments"), 남은 조건을 and로 묶습니다. 이번에는 조건 ' + n + '개가 남습니다.' + (n === 0 ? ' 하나도 남지 않으면 where 절이 없는 쿼리가 됩니다.' : ''), 'good');
      st.line = 2; st.run = { s: '실행하지 못함 · 문서 기준: ' + where + ' · ' + hit + '명', cls: 'wait' };
      push('fetch(): 쿼리를 실행해 목록을 돌려주는 메서드입니다. 이 PC에는 Querydsl 라이브러리가 없어서 이 단계는 실제로 실행해 보지 못했습니다. 문서대로라면 ' + (n ? '조건이 "' + where + '"인 쿼리' : 'where가 없는 쿼리') + '가 되고, 같은 조건을 실행으로 확인한 Criteria API의 결과로 미루어 ' + hit + '명이 조회됩니다.');
      row = ['null이 아닌 조건 ' + n + '개 (문자열 없음)', '실행하지 못함 (문서 기준: 오류 없음)', '문서 기준: ' + where, '문서 기준: ' + hit + '명'];
      sum.push('Querydsl은 이 PC에서 실행하지 못했습니다. 아래 내용은 Querydsl 공식 문서에 근거한 설명입니다.');
      sum.push('조건 메서드가 값이 없을 때 null을 돌려주고, where가 null을 건너뛰므로, if 문으로 where와 and를 맞출 필요가 없습니다. 조건이 늘어도 where 안에 메서드 하나를 더 적으면 됩니다.');
      sum.push('m.name처럼 프로퍼티를 자바 코드로 쓰기 때문에, 이름을 틀리면 실행 전에 컴파일 오류로 드러납니다. 조건을 하나씩 쌓아 가는 BooleanBuilder를 써도 같은 일을 할 수 있습니다.');
    }
    return { events: ev, summary: sum, row: row, L: L, ex: err ? 'IllegalArgumentException' : '', verified: c.how !== 'querydsl' };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 쿼리를 조립하는 코드를 한 줄씩 따라갑니다.'); return; }
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { var on = i === s.line || (c.how === 'join' && s.line === 4 && i === 3); return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }).concat([{ cells: ['', { v: c.how === 'querydsl' ? '(조립 끝)' : '(쿼리 실행)', cls: s.line === 90 ? 'hot' : '' }, s.line === 90 ? '← 지금' : ''] }]), '쿼리를 조립하는 코드');
    H.counters(v, [[s.sql, 'DB로 나간 SQL']]);
  },
  // 그림: 위에 검색 조건 두 개, 가운데에 쿼리로 조립되는 조각 셋과 지금까지 조립된 결과, 아래에 실행 결과. 건너뛴 조각은 점선이다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], first = sim.events[0].snap;
    var s = last ? last.snap : { name: first.name, age: first.age, pieces: first.pieces, full: first.full, run: first.run, sql: 0 };
    P.size(680, 326);
    P.box('name', 16, 12, 318, 34, { cls: c.name ? 'wait' : 'ghost', title: '이름 조건 (name)', right: c.name ? '"김철수"' : 'null (입력 안 함)' });
    P.box('age', 346, 12, 318, 34, { cls: c.age ? 'wait' : 'ghost', title: '나이 조건 (age)', right: c.age ? '20 이상' : 'null (입력 안 함)' });
    P.region('q', 16, 58, 648, 194, c.how === 'criteria' ? 'Predicate 객체로 조립 (JPA Criteria API)' : c.how === 'querydsl' ? '조건 객체로 조립 (Querydsl)' : '문자열로 조립 (따옴표 안이 실제로 붙는 글자)');
    s.pieces.forEach(function (p, i) { P.box('b' + i, 28, 88 + i * 34, 624, 28, { cls: p.cls, title: p.t, right: p.r, mono: true }); });
    P.box('full', 28, 194, 624, 46, { cls: s.full.cls, title: s.full.t || '조립된 쿼리', sub: s.full.s, mono: true });
    P.box('run', 16, 270, 648, 44, { cls: s.run.cls, title: '실행 결과', sub: s.run.s });
    if (s.run.cls !== 'ghost') P.arrow('go', 'full:b', 'run:t', { cls: s.run.cls === 'bad' ? 'bad' : s.run.cls === 'good' ? 'good' : 'dash', label: c.how === 'querydsl' ? 'fetch (실행 못 함)' : 'createQuery' });
    P.note(c.how === 'querydsl' ? 'Querydsl은 이 PC에 라이브러리가 없어 실행하지 못했습니다. 그림은 공식 문서가 설명하는 동작을 옮긴 것입니다. 점선 상자는 null이라서 where가 건너뛴 조건입니다.' : c.how === 'criteria' ? '점선 상자는 값이 없어 목록에 넣지 않은 조건입니다. where와 and는 조건의 개수에 맞춰 JPA가 만듭니다.' : '점선 상자는 값이 없어 붙이지 않은 조각입니다. 따옴표 안의 띄어쓰기까지 그대로 이어 붙는다는 점을 눈여겨보세요. 붙지 않은 조각이 있어도 나머지 조각은 자기 모양 그대로 붙습니다.');
  },
  assume: '문자열을 이어 붙이는 세 가지 방식과 JPA Criteria API 방식의 열여섯 가지 조합은 이 PC의 Hibernate 7.4.5와 H2 데이터베이스에서 화면과 같은 구조의 코드를 실제로 실행해, 조립된 문자열, 성공 여부, 예외의 종류와 오류 위치와 걸린 낱말, DB로 나간 SQL의 where, 조회된 회원 수를 화면과 대조했습니다. Querydsl의 네 가지 조합은 이 PC에 Querydsl 라이브러리가 없어 실행으로 확인하지 못했습니다. 그 부분은 Querydsl 공식 문서를 따른 설명입니다: FilteredClause.where(Predicate...)의 API 문서("Adds the given filter conditions. Skips null arguments"), 참조 문서 Querying JPA 장의 여러 필터를 and로 묶는 예, Complex predicates 절의 BooleanBuilder 설명. Querydsl의 결과 칸에 적힌 where와 회원 수는 문서대로 동작한다고 볼 때의 값이며 실행 결과가 아닙니다. 문법 오류의 위치와 걸린 낱말은 Hibernate 7.4.5가 낸 메시지 기준이고, 다른 버전이나 다른 JPA 구현에서는 다르게 나올 수 있습니다. "where and"에서 Hibernate가 and를 이름으로 읽고 넘어간다는 설명은, 오류가 and가 아니라 그다음 낱말에서 났다는 실행 결과에 근거한 해석입니다. 화면의 SQL where는 테이블 별칭을 걷어 내고 읽기 쉽게 줄인 것입니다. Criteria API에서 조건이 0개일 때 where 절이 생기지 않는다는 것, m.get에 없는 프로퍼티 이름을 주면 컴파일은 되고 실행 중에 예외(Hibernate 7.4.5에서는 PathElementException)가 난다는 것도 실행으로 확인했습니다. 실제 서비스에서는 조건이 훨씬 많고 or, like, 정렬이 섞이므로 문자열 방식의 실수가 여기보다 생기기 쉽습니다.',
});
