Lab.register({
  id: 'dynquery', nav: '동적 쿼리: Specification과 Querydsl', cat: 'JPA', mode: 'step',
  title: '검색 조건이 있을 때만 where에 붙이려면',
  why: '조건마다 JPQL 문자열을 이어 붙이면 where와 and의 자리, 띄어쓰기를 사람이 맞춰야 하고, 컴파일러는 그 문자열을 검사하지 못해 잘못 이은 조합은 그 요청이 실제로 들어올 때에야 드러난다. 값까지 문자열에 넣으면 SQL Injection의 통로도 된다. JPA 표준의 Criteria API는 조건을 객체로 만들어 넘기면 where와 and를 JPA가 붙여 주게 했고, 스프링 데이터 JPA의 Specification은 그 조건을 메서드 하나씩으로 나눠 이름을 붙이고 and나 or로 조합하게 했다. Querydsl은 엔티티를 보고 만든 Q클래스로 필드를 가리켜 필드 이름 오타까지 컴파일할 때 잡는다.',
  use: '관리자 화면의 회원 검색, 쇼핑몰의 상품 필터처럼 입력한 항목만 조건이 되는 검색 기능에 쓴다. 스프링 데이터 JPA를 쓰는 프로젝트에서는 리포지토리에 JpaSpecificationExecutor를 더해 Specification으로 조건을 조합하거나, Querydsl을 함께 쓰는 경우가 흔하다. 조건이 늘 같은 쿼리라면 쿼리 메서드나 @Query로 충분하다.',
  intro: '회원 검색 화면에서 이름과 나이는 입력할 수도 있고 비워 둘 수도 있습니다. 입력된 조건만 where에 넣어야 하므로 쿼리의 모양이 요청마다 달라집니다. 이런 쿼리를 동적 쿼리라고 합니다. 스프링 데이터 JPA의 Specification, JPA의 Criteria API, Querydsl은 조건을 문자열이 아니라 객체로 조립하고, where와 and는 도구가 붙입니다.',
  terms: ['동적 쿼리', 'Specification', 'Criteria API', 'Querydsl', 'SQL Injection'],
  controls: [
    { id: 'how', label: '쿼리를 만드는 방법', type: 'select', value: 'spec', options: [['spec', '스프링 데이터 JPA Specification'], ['criteria', 'JPA Criteria API'], ['querydsl', 'Querydsl'], ['concat', '문자열을 직접 이어 붙임 (하면 안 되는 방식)']] },
    { id: 'name', label: '이름 칸에 입력한 값', type: 'select', value: 'none', options: [['none', '입력 안 함 (null)'], ['kim', '김철수'], ['quote', "' or '1'='1 (따옴표가 섞인 글자)"]] },
    { id: 'age', label: '나이 조건을 입력했다 (20세 이상)', type: 'check', value: true },
  ],
  presets: [
    { t: '처음 설정으로', q: '이름은 비우고 나이 20 이상만 입력해, 스프링 데이터 JPA의 Specification으로 검색하면', d: 'null을 돌려준 이름 조건은 빠지고 나이 조건 하나만 where에 들어갑니다.', v: { how: 'spec', name: 'none', age: true } },
    { t: '조건을 하나도 넣지 않으면', q: 'Specification으로 검색하는데 이름도 나이도 입력하지 않으면', d: '남은 조건이 없어서 where 절이 아예 생기지 않고 전체가 조회됩니다.', v: { how: 'spec', name: 'none', age: false } },
    { t: 'Criteria API로 조건 둘을 조립', q: 'JPA Criteria API로 이름 김철수와 나이 20 이상을 둘 다 넣으면', d: '조건 객체 두 개를 where에 넘기면 JPA가 and로 묶습니다. Specification의 람다가 받는 cb도 이 API의 CriteriaBuilder입니다.', v: { how: 'criteria', name: 'kim', age: true } },
    { t: 'Querydsl로 조립', q: 'Querydsl로 이름 김철수만 입력하고 나이는 비우면', d: 'where가 null인 조건을 건너뛰어, 이름 조건만 남습니다. 나간 SQL은 Specification, Criteria API와 같습니다.', v: { how: 'querydsl', name: 'kim', age: false } },
    { t: '이름 칸에 따옴표가 섞이면', q: "Specification으로 검색하는데 이름 칸에 ' or '1'='1을 넣으면", d: '값은 ? 자리에 따로 바인딩되므로 그냥 이상한 이름일 뿐이고, 0명이 조회됩니다.', v: { how: 'spec', name: 'quote', age: false } },
    { t: '문자열을 직접 이어 붙이면', q: '문자열을 직접 이어 붙이는 코드에 이름은 비우고 나이 20 이상만 입력하면', d: 'where 바로 뒤에 and가 와서 문법 오류가 납니다. 조건을 둘 다 넣어 시험하면 놓치는 오류입니다.', v: { how: 'concat', name: 'none', age: true } },
    { t: '이어 붙인 문자열에 따옴표가 섞이면', q: "직접 이어 붙이는 코드의 이름 칸에 ' or '1'='1을 넣으면", d: '넣은 따옴표가 문자열을 닫아 or 조건이 생기고, 회원 7명이 모두 조회됩니다.', v: { how: 'concat', name: 'quote', age: false } },
  ],
  // 회원 7명 (이름, 나이). Probe가 넣는 데이터와 같다
  members: [['김철수', 30], ['김철수', 17], ['이영희', 25], ['박민수', 41], ['김영수', 22], ['최지우', 19], ['이철민', 35]],
  QUOTE: "' or '1'='1",
  nameVal: function (c) { return c.name === 'kim' ? '김철수' : c.name === 'quote' ? this.QUOTE : null; },
  // 방법마다 조건을 조립하는 줄. 실행 단계는 표의 마지막 줄 "(쿼리 실행)"로 보인다
  lines: function (c) {
    if (c.how === 'spec') return ['Specification<Member> spec = Specification.where(nameEq(name))', '        .and(ageGoe(age));', 'return memberRepository.findAll(spec);'];
    if (c.how === 'criteria') return ['List<Predicate> conds = new ArrayList<>();', 'if (name != null) conds.add(cb.equal(m.get("name"), name));', 'if (age != null)  conds.add(cb.greaterThanOrEqualTo(m.get("age"), age));', 'cq.select(m).where(conds.toArray(new Predicate[0]));'];
    if (c.how === 'querydsl') return ['.selectFrom(m)', '.where(nameEq(name), ageGoe(age))   // null인 조건은 건너뛴다', '.fetch();'];
    return ['String jpql = "select m from Member m where";', 'if (name != null) jpql += " m.name = \'" + name + "\'";', 'if (age != null)  jpql += " and m.age >= " + age;'];
  },
  code: function (c) {
    var nm = this.nameVal(c), lit = nm === null ? 'null' : '"' + nm + '"';
    var call = '\n\nsearch(' + lit + ', ' + (c.age ? '20' : 'null') + ');   // 이름은 ' + (nm === null ? '입력 안 함' : c.name === 'kim' ? '김철수' : '따옴표가 섞인 글자') + ', ' + (c.age ? '나이는 20 이상' : '나이는 입력 안 함');
    var ind = function (a) { return a.map(function (l) { return '    ' + l; }).join('\n'); }, L = this.lines(c);
    if (c.how === 'spec') return '// 필요한 부분만 남김 (클래스 선언, memberRepository 필드, 예시로 만든 Member 엔티티, import는 생략)\n'
      + '// MemberRepository는 예시로 만든 리포지토리. JpaRepository, JpaSpecificationExecutor, Specification은 스프링 데이터 JPA가 주는 것\n'
      + 'interface MemberRepository extends JpaRepository<Member, Long>, JpaSpecificationExecutor<Member> { }\n\n'
      + '// nameEq, ageGoe는 예시로 만든 메서드. 값이 없으면 조건 대신 null을 돌려준다\n'
      + 'static Specification<Member> nameEq(String name) {\n    return (root, query, cb) -> name == null ? null : cb.equal(root.get("name"), name);\n}\n'
      + 'static Specification<Member> ageGoe(Integer age) {\n    return (root, query, cb) -> age == null ? null : cb.greaterThanOrEqualTo(root.get("age"), age);\n}\n\n'
      + 'List<Member> search(String name, Integer age) {\n' + ind(L) + '\n}' + call;
    if (c.how === 'criteria') return '// 필요한 부분만 남김 (클래스 선언, em 필드, 예시로 만든 Member 엔티티, import는 생략)\n'
      + '// CriteriaBuilder, CriteriaQuery, Root, Predicate는 JPA 표준(jakarta.persistence.criteria)이 주는 것\n'
      + 'List<Member> search(String name, Integer age) {\n    CriteriaBuilder cb = em.getCriteriaBuilder();\n    CriteriaQuery<Member> cq = cb.createQuery(Member.class);\n    Root<Member> m = cq.from(Member.class);\n\n'
      + ind(L.slice(0, 3)) + '\n\n' + ind(L.slice(3)) + '\n    return em.createQuery(cq).getResultList();\n}' + call;
    if (c.how === 'querydsl') return '// 필요한 부분만 남김 (클래스 선언, queryFactory 필드, 예시로 만든 Member 엔티티, import는 생략)\n'
      + '// JPAQueryFactory, BooleanExpression은 Querydsl이 주는 것. QMember는 Querydsl의 apt 도구가 Member 엔티티를 보고 컴파일할 때 만든 클래스\n'
      + 'List<Member> search(String name, Integer age) {\n    QMember m = QMember.member;\n    return queryFactory\n'
      + L.map(function (l) { return '        ' + l; }).join('\n') + '\n}\n\n'
      + '// nameEq, ageGoe는 예시로 만든 메서드. 값이 없으면 조건 대신 null을 돌려준다\n'
      + 'BooleanExpression nameEq(String name) {\n    return name == null ? null : QMember.member.name.eq(name);\n}\n'
      + 'BooleanExpression ageGoe(Integer age) {\n    return age == null ? null : QMember.member.age.goe(age);\n}' + call;
    return '// 필요한 부분만 남김 (클래스 선언, em 필드, 예시로 만든 Member 엔티티, import는 생략)\n'
      + '// 하면 안 되는 방식: where, and, 값까지 문자열에 직접 이어 붙인다\n'
      + 'List<Member> search(String name, Integer age) {\n' + ind(L) + '\n    return em.createQuery(jpql, Member.class).getResultList();\n}' + call;
  },
  label: function (c) { return { spec: 'Specification', criteria: 'Criteria API', querydsl: 'Querydsl', concat: '문자열 직접 잇기' }[c.how] + ' · 이름 ' + { none: '없음', kim: '김철수', quote: '따옴표 글자' }[c.name] + ' · 나이 ' + (c.age ? '20 이상' : '없음'); },
  columns: ['조립된 쿼리', '실행 결과', 'DB로 나간 SQL의 where', '바인딩된 값', '조회된 회원'],
  // 문자열을 직접 이어 붙인 결과. Probe의 concat과 같은 순서다
  build: function (nm, age) {
    var jpql = 'select m from Member m where';
    if (nm !== null) jpql += " m.name = '" + nm + "'";
    if (age) jpql += ' and m.age >= 20';
    return jpql;
  },
  // 이 실습의 문자열에서 Hibernate가 처음 걸리는 자리(0부터 센 글자 번호)와 낱말. 문제가 없으면 null.
  // 이름이 없으면 where 바로 뒤가 비거나(끝) and가 온다. and는 이름으로 읽히고 그다음 낱말 m에서 걸린다(실행 결과)
  check: function (jpql, nm, age) {
    if (nm !== null) return null;
    if (!age) return { at: jpql.length, tok: '<EOF>' };
    return { at: jpql.indexOf(' m.age') + 1, tok: 'm' };
  },
  simulate: function (c) {
    var ev = [], sum = [], L = this.lines(c), nm = this.nameVal(c), quote = c.name === 'quote';
    var n = (nm !== null ? 1 : 0) + (c.age ? 1 : 0);
    var hitStd = this.members.filter(function (m) { return (nm === null || m[0] === nm) && (!c.age || m[1] >= 20); }).length;
    var where = n ? 'where ' + [nm !== null ? 'name = ?' : '', c.age ? 'age >= ?' : ''].filter(Boolean).join(' and ') : 'where 없음';
    var binds = [nm !== null ? nm : '', c.age ? '20' : ''].filter(Boolean);
    var bindTxt = binds.length ? binds.join(', ') : '없음';
    var whereSay = n ? 'SQL의 조건은 "' + where + '"입니다.' : 'SQL에는 where가 없습니다.';
    var st = { line: -1, name: nm === null ? 'null' : quote ? '따옴표 글자' : '"김철수"', age: c.age ? '20' : 'null', pieces: [], full: { t: '', s: '', cls: 'ghost' }, run: { s: '아직 실행 전', cls: 'ghost' }, sql: 0 };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var nameSay = nm === null ? '입력하지 않아 null' : quote ? "' or '1'='1(따옴표가 섞인 글자)" : '"김철수"';
    var input = '검색 조건: 이름은 ' + nameSay + ', 나이는 ' + (c.age ? '20' : '입력하지 않아 null') + '입니다. null이 아닌 조건만 쿼리의 where에 넣어야 합니다.';
    var bindSay = quote ? ' 따옴표가 섞인 이름 값은 SQL 문장에 섞이지 않고 ? 자리에 따로 바인딩됩니다. DB는 이름이 글자 그대로 그 값인 회원을 찾습니다.' : '';
    var sqlSay = 'SELECT 한 번이 DB로 나갑니다. ' + whereSay + (binds.length ? ' ? 자리에 바인딩된 값은 ' + bindTxt + '입니다.' : ' 바인딩된 값은 없습니다.') + bindSay + ' 회원 7명 가운데 ' + hitStd + '명이 조회됩니다.';
    var row, err = null;
    var quoteSum = '이름 칸의 따옴표가 섞인 글자는 조건의 값으로만 쓰였습니다. 값은 언제나 ? 자리에 바인딩되므로 문장의 모양을 바꾸지 못하고, 그런 이름의 회원이 없어 0명입니다. SQL Injection이 통하지 않습니다.';

    if (c.how === 'spec') {
      var sn = nm !== null ? 'name = ?' : 'null (빠짐)', sa = c.age ? 'age >= ?' : 'null (빠짐)';
      st.pieces = [{ t: 'nameEq(name)', r: '', cls: 'ghost' }, { t: 'ageGoe(age)', r: '', cls: 'ghost' }, { t: 'Specification.where(…).and(…)', r: '', cls: 'ghost' }];
      st.full = { t: '조립된 조건', s: '아직 없음', cls: 'ghost' };
      push(input);
      st.line = 0; st.pieces[0] = { t: 'nameEq(name)', r: '람다 1개', cls: 'plain' };
      push('1번째 줄 nameEq(name): 예시로 만든 메서드입니다. 조건을 바로 만들지 않고, 쿼리를 만들 때 불릴 람다(Specification)를 돌려줍니다. 이 람다는 name이 null이면 조건 대신 null을, 아니면 cb.equal(root.get("name"), name)을 돌려주도록 적혀 있습니다. Specification.where는 스프링 데이터 JPA가 주는 메서드로, 받은 Specification을 출발점으로 삼습니다.');
      st.line = 1; st.pieces[1] = { t: 'ageGoe(age)', r: '람다 1개', cls: 'plain' }; st.pieces[2] = { t: st.pieces[2].t, r: '두 람다를 and로 묶음', cls: 'plain' };
      push('2번째 줄 .and(ageGoe(age)): ageGoe도 예시로 만든 메서드이고 같은 모양의 람다를 돌려줍니다. and는 스프링 데이터 JPA가 주는 메서드로, 두 Specification을 and로 묶은 새 Specification을 돌려줍니다. 아직 SQL은 만들지 않았습니다.');
      st.line = 2;
      st.pieces[0] = { t: 'nameEq(name)', r: sn, cls: nm !== null ? 'good' : 'ghost' };
      st.pieces[1] = { t: 'ageGoe(age)', r: sa, cls: c.age ? 'good' : 'ghost' };
      st.pieces[2] = { t: st.pieces[2].t, r: '남은 조건 ' + n + '개', cls: 'good' };
      st.full = { t: '조립된 조건', s: n ? where : '조건 없음 (where 절이 생기지 않음)', cls: 'plain' };
      push('3번째 줄 memberRepository.findAll(spec): JpaSpecificationExecutor가 주는 메서드입니다. 스프링 데이터 JPA가 CriteriaQuery를 만들고 두 람다를 부릅니다. nameEq는 ' + (nm !== null ? '조건 name = ?를' : 'null을') + ', ageGoe는 ' + (c.age ? '조건 age >= ?를' : 'null을') + ' 돌려줍니다. ' + (n === 0 ? 'null을 돌려준 조건은 빠지므로 남은 조건이 없고, where를 붙이지 않습니다.' : n === 1 ? 'null을 돌려준 조건은 빠지고, 남은 조건 하나만 where에 들어갑니다.' : '두 조건을 and로 묶어 where에 넣습니다.'), 'good');
      st.line = 90; st.sql = 1; st.run = { s: '성공 · ' + where + ' · 바인딩 ' + bindTxt + ' · ' + hitStd + '명', cls: 'good' };
      push(sqlSay, 'good');
      row = ['Specification: 남은 조건 ' + n + '개', '성공', where, bindTxt, hitStd + '명'];
      sum.push('Specification으로 조립한 쿼리에 조건 ' + n + '개가 남아 ' + hitStd + '명이 조회됐습니다. 이름과 나이 칸의 여섯 가지 조합이 모두 문법 오류 없이 실행됩니다.');
      if (quote) sum.push(quoteSum);
      else sum.push('where, and, 띄어쓰기를 사람이 쓰지 않습니다. 값이 없을 때 람다가 조건 대신 null을 돌려주면 스프링 데이터 JPA가 그 조건을 빼고 남은 것만 and로 묶습니다. 조건이 늘면 nameEq 같은 메서드를 하나 더 만들어 and로 잇습니다.');
      sum.push('null은 람다가 조건 대신 돌려주게 합니다. Specification 자체를 null로 넘기면 안 됩니다. 스프링 데이터 JPA 4.1.1에서 Specification.where(null)이나 and(null)은 IllegalArgumentException을 던집니다.');
    }

    if (c.how === 'criteria') {
      var pn = 'cb.equal(m.get("name"), name)', pa = 'cb.greaterThanOrEqualTo(m.get("age"), age)';
      st.pieces = [{ t: pn, r: '', cls: 'ghost' }, { t: pa, r: '', cls: 'ghost' }, { t: 'where(conds.toArray(new Predicate[0]))', r: '', cls: 'ghost' }];
      st.full = { t: '조건 목록 (conds)', s: '아직 없음', cls: 'ghost' };
      push(input);
      st.line = 0; st.full = { t: '조건 목록 (conds)', s: 'Predicate 0개', cls: 'plain' };
      push('1번째 줄: 조건 객체를 모을 빈 목록을 만듭니다. 목록의 원소는 글자가 아니라 Predicate라는 조건 객체입니다. cb는 JPA가 주는 CriteriaBuilder로, 조건 객체를 만들어 줍니다.');
      var cnt = 0, have = [];
      [['name', nm !== null, '이름', 'name = ?'], ['age', c.age, '나이', 'age >= ?']].forEach(function (x, i) {
        st.line = i + 1;
        if (x[1]) { cnt++; have.push(x[3]); }
        st.pieces[i] = { t: st.pieces[i].t, r: x[1] ? '목록에 넣음' : '건너뜀 (' + x[0] + (i ? '가' : '이') + ' null)', cls: x[1] ? 'good' : 'ghost' };
        st.full = { t: '조건 목록 (conds)', s: 'Predicate ' + cnt + '개' + (cnt ? ': ' + have.join(', ') : ''), cls: 'plain' };
        push((i + 2) + '번째 줄: ' + (x[1] ? x[2] + ' 조건이 있으므로 조건 객체(' + x[3] + ')를 만들어 목록에 넣습니다.' + (i === 0 && quote ? ' 따옴표가 섞인 글자도 조건 객체의 값일 뿐, 문장의 일부가 되지 않습니다.' : '') : x[2] + ' 조건이 null이므로 건너뜁니다.'));
      });
      st.line = 3; st.pieces[2] = { t: st.pieces[2].t, r: '조건 ' + n + '개를 넘김', cls: 'good' };
      st.full = { t: '조립된 쿼리 (객체)', s: n ? where : '조건 없음 (where 절이 생기지 않음)', cls: 'plain' };
      push('4번째 줄: 모은 조건 객체 ' + n + '개를 where에 넘깁니다. where나 and라는 글자를 직접 쓰지 않았습니다. ' + (n === 0 ? '조건이 0개이면 where 절이 없는 쿼리가 됩니다.' : n === 1 ? '조건이 1개이면 그 조건 하나만 where에 들어갑니다.' : '조건이 여러 개이면 JPA가 and로 묶습니다.'), 'good');
      st.line = 90; st.sql = 1; st.run = { s: '성공 · ' + where + ' · 바인딩 ' + bindTxt + ' · ' + hitStd + '명', cls: 'good' };
      push('em.createQuery(cq).getResultList(): 조립한 객체로부터 SQL을 만들어 보냅니다. ' + sqlSay, 'good');
      row = ['Predicate ' + n + '개 (문자열 없음)', '성공', where, bindTxt, hitStd + '명'];
      sum.push('조건 객체 ' + n + '개로 조립한 쿼리가 실행되어 ' + hitStd + '명이 조회됐습니다. 나간 SQL은 같은 조건의 Specification, Querydsl과 글자까지 같습니다.');
      if (quote) sum.push(quoteSum);
      else sum.push('Specification의 람다가 받는 cb가 바로 이 CriteriaBuilder입니다. Specification은 Criteria API로 만드는 조건을 메서드 하나씩으로 나눠 이름을 붙이고, 조합과 실행은 스프링 데이터 JPA에 맡기게 해 줍니다.');
      sum.push('Criteria API는 코드가 길어 어떤 쿼리인지 한눈에 읽기 어렵고, m.get("name")의 프로퍼티 이름이 문자열이라 이름이 틀려도 컴파일은 됩니다(Hibernate 7.4.5에서는 실행 중에 PathElementException). Querydsl은 이 두 가지를 덜어 줍니다.');
    }

    if (c.how === 'querydsl') {
      st.pieces = [{ t: 'nameEq(name)', r: '', cls: 'ghost' }, { t: 'ageGoe(age)', r: '', cls: 'ghost' }, { t: 'where(nameEq(name), ageGoe(age))', r: '', cls: 'ghost' }];
      st.full = { t: '조립된 쿼리 (객체)', s: '아직 없음', cls: 'ghost' };
      push(input);
      st.line = 0; push('selectFrom(m): 회원을 조회하는 쿼리 객체를 만듭니다. m은 QMember.member로, Querydsl의 apt 도구가 Member 엔티티를 보고 컴파일할 때 만든 Q클래스의 객체입니다. m.name, m.age처럼 프로퍼티를 자바 코드로 가리킵니다.');
      st.line = 1;
      st.pieces[0] = { t: 'nameEq(name)', r: nm !== null ? 'm.name.eq(name)' : 'null', cls: nm !== null ? 'good' : 'ghost' };
      push('nameEq(name): 예시로 만든 메서드입니다(Querydsl이 주는 메서드가 아닙니다). ' + (nm !== null ? '이름이 있으므로 "name = 값"을 뜻하는 조건 객체(BooleanExpression)를 돌려줍니다.' : '이름이 null이므로 조건 객체 대신 null을 돌려줍니다.'));
      st.pieces[1] = { t: 'ageGoe(age)', r: c.age ? 'm.age.goe(20)' : 'null', cls: c.age ? 'good' : 'ghost' };
      push('ageGoe(age): nameEq와 마찬가지로 예시로 만든 메서드입니다. ' + (c.age ? '나이가 있으므로 "age >= 20"을 뜻하는 조건 객체를 돌려줍니다. goe는 "크거나 같다"는 뜻입니다.' : '나이가 null이므로 null을 돌려줍니다.'));
      st.pieces[2] = { t: st.pieces[2].t, r: 'null을 뺀 조건 ' + n + '개', cls: 'good' };
      st.full = { t: '조립된 쿼리 (객체)', s: n ? where : '조건 없음 (where 절이 생기지 않음)', cls: 'plain' };
      push('where(nameEq(name), ageGoe(age)): Querydsl의 where는 넘겨받은 조건 가운데 null인 것을 건너뛰고, 남은 조건을 and로 묶습니다. 이번에는 조건 ' + n + '개가 남습니다.' + (n === 0 ? ' 하나도 남지 않으면 where 절이 없는 쿼리가 됩니다.' : ''), 'good');
      st.line = 90; st.sql = 1; st.run = { s: '성공 · ' + where + ' · 바인딩 ' + bindTxt + ' · ' + hitStd + '명', cls: 'good' };
      push('fetch(): 쿼리를 실행해 목록을 돌려줍니다. ' + sqlSay, 'good');
      row = ['null이 아닌 조건 ' + n + '개', '성공', where, bindTxt, hitStd + '명'];
      sum.push('Querydsl로 조립한 쿼리에 조건 ' + n + '개가 남아 ' + hitStd + '명이 조회됐습니다. 나간 SQL은 같은 조건의 Specification, Criteria API와 글자까지 같습니다.');
      if (quote) sum.push(quoteSum);
      else sum.push('조건 메서드가 값이 없을 때 null을 돌려주고 where가 null을 건너뛰므로, if 문으로 where와 and를 맞출 필요가 없습니다. 조건을 하나씩 쌓는 BooleanBuilder를 써도 같은 일을 할 수 있습니다.');
      sum.push('m.name처럼 프로퍼티를 자바 코드로 쓰므로, 이름을 틀리면 실행 전에 컴파일 오류로 드러납니다. 대신 Querydsl은 JPA 표준이 아니라서 의존성과 Q클래스를 만드는 빌드 설정을 따로 더해야 합니다.');
    }

    if (c.how === 'concat') {
      var jpql = this.build(nm, c.age), q = function (s) { return '"' + s + '"'; };
      var pName = nm === null ? " m.name = '…'" : " m.name = '" + nm + "'";
      st.pieces = [{ t: q('select m from Member m where'), r: '', cls: 'ghost' }, { t: q(pName), r: '', cls: 'ghost' }, { t: q(' and m.age >= 20'), r: '', cls: 'ghost' }];
      st.full = { t: '지금까지 조립된 문자열 (jpql)', s: '아직 없음', cls: 'ghost' };
      push(input);
      var cur = 'select m from Member m where';
      st.line = 0; st.pieces[0] = { t: st.pieces[0].t, r: '기본 문장', cls: 'good' }; st.full = { t: '지금까지 조립된 문자열 (jpql)', s: q(cur), cls: 'plain' };
      push('1번째 줄: 기본 문장을 만듭니다. 조건이 붙을 것이라 보고 끝에 where를 미리 붙여 두었습니다.');
      st.line = 1;
      if (nm === null) { st.pieces[1] = { t: st.pieces[1].t, r: '건너뜀 (name이 null)', cls: 'ghost' }; push('2번째 줄: 이름 조건이 null이므로 건너뜁니다. 문자열은 그대로입니다.'); }
      else {
        cur += pName; st.pieces[1] = { t: q(pName), r: '붙임', cls: quote ? 'bad' : 'good' }; st.full = { t: '지금까지 조립된 문자열 (jpql)', s: q(cur), cls: quote ? 'bad' : 'plain' };
        push('2번째 줄: 이름 조건이 있으므로 입력값을 작은따옴표 사이에 그대로 넣어 ' + q(pName) + ' 조각을 붙입니다.' + (quote ? ' 입력값의 첫 따옴표가 여는 따옴표와 짝을 이뤄 이름 값이 빈 글자로 끝나고, 뒤의 or \'1\'=\'1\'이 조건의 일부가 됐습니다.' : ''), quote ? 'bad' : '');
      }
      st.line = 2;
      if (!c.age) { st.pieces[2] = { t: st.pieces[2].t, r: '건너뜀 (age가 null)', cls: 'ghost' }; push('3번째 줄: 나이 조건이 null이므로 건너뜁니다. 문자열은 그대로입니다.'); }
      else {
        cur += ' and m.age >= 20'; st.pieces[2] = { t: st.pieces[2].t, r: '붙임', cls: nm === null ? 'bad' : 'good' }; st.full = { t: '지금까지 조립된 문자열 (jpql)', s: q(cur), cls: 'plain' };
        push('3번째 줄: 나이 조건이 있으므로 뒤에 ' + q(' and m.age >= 20') + ' 조각을 붙입니다. 이 줄은 앞에 이름 조건이 이미 붙어 있다고 보고 and로 시작합니다.' + (nm === null ? ' 그런데 이번에는 이름 조건이 붙지 않았습니다.' : ''), nm === null ? 'bad' : '');
      }
      st.full = { t: '완성된 문자열 (jpql)', s: q(jpql), cls: quote ? 'bad' : 'plain' };
      err = this.check(jpql, nm, c.age);
      st.line = 90;
      var hitCat = quote ? this.members.filter(function (m) { return !c.age || m[1] >= 20; }).length : hitStd;
      if (err) {
        var why = !c.age ? '문자열이 where로 끝났습니다. where 뒤에는 조건이 와야 하는데 아무것도 없으므로, 문자열의 끝(<EOF>)에서 멈춥니다.'
          : 'where 바로 뒤에 and가 왔습니다. and 앞에 있어야 할 첫 조건이 없습니다. Hibernate의 문법에서는 and 같은 낱말도 이름으로 쓸 수 있어서 and까지는 이름으로 읽고 넘어가고, 그다음 낱말 m에서 멈춥니다.';
        st.full.cls = 'bad'; st.run = { s: 'SyntaxException · 위치 1:' + err.at + ' · 걸린 낱말 ' + err.tok, cls: 'bad' };
        push('em.createQuery(jpql, Member.class): Hibernate가 문자열을 처음부터 읽어 문법을 검사합니다. ' + why, 'bad');
        push('예외: createQuery가 IllegalArgumentException을 던집니다(원인은 Hibernate의 SyntaxException). 메시지의 "At 1:' + err.at + '"는 1번째 줄의 ' + err.at + '번 글자(0부터 셈)에서 멈췄다는 뜻입니다. SQL은 DB로 나가지 않았고, 검색 요청은 실패합니다.', 'bad');
        row = [jpql, '실패: SyntaxException (위치 1:' + err.at + ', 낱말 ' + err.tok + ')', 'SQL이 나가지 않음', '없음', '없음'];
        sum.push('이 코드는 이름을 비웠을 때 나이 입력과 상관없이 실패하고, 이름을 넣으면 정상입니다. 컴파일러는 문자열 안을 검사하지 않고, 오류는 그 조합의 요청이 실제로 들어왔을 때에야 납니다. 조건을 둘 다 넣어 시험하면 놓칩니다.');
      } else {
        var cw = "where name = '" + nm + "'" + (c.age ? ' and age >= 20' : '');
        if (quote) cw = "where name = '' or '1' = '1'" + (c.age ? ' and age >= 20' : '');
        st.sql = 1; st.run = { s: '성공 · ' + cw + ' · ' + hitCat + '명', cls: quote ? 'bad' : 'good' };
        push('em.createQuery(jpql, Member.class): Hibernate가 문자열을 처음부터 읽어 문법을 검사합니다. 문법에 맞습니다. 값이 이미 문장의 글자가 되어 바인딩할 값은 없습니다.', quote ? 'bad' : '');
        push('getResultList(): SELECT 한 번이 DB로 나갑니다. SQL의 조건은 "' + cw + '"입니다. ' + (quote ? (c.age ? 'and가 or보다 먼저 묶이므로 "이름이 빈 글자" 또는 "\'1\'=\'1\'이면서 나이 20 이상"이 되어, 이름 조건이 사라지고 나이 20 이상인 ' + hitCat + '명이 모두 조회됩니다.' : '\'1\'=\'1\'은 언제나 참이라서 회원 7명이 모두 조회됩니다. 이름으로 회원을 찾는 기능이 전체 목록을 내준 것입니다.') : '회원 7명 가운데 ' + hitCat + '명이 조회됩니다.'), quote ? 'bad' : 'good');
        row = [jpql, '성공', cw, '없음', hitCat + '명'];
        if (quote) sum.push('입력한 따옴표가 문자열을 닫아 문장의 모양이 바뀌었습니다. 이것이 SQL Injection입니다. 같은 입력을 Specification, Criteria API, Querydsl에 넣으면 값으로 바인딩되어 0명이 조회됩니다.');
        else sum.push('이름을 넣은 조합은 정상이지만, 같은 코드가 이름을 비우면 문법 오류로 실패하고, 따옴표가 섞인 이름이 들어오면 SQL Injection이 됩니다.');
      }
      sum.push('문자열로 꼭 만들어야 한다면 조건을 목록에 모아 사이에만 " and "를 넣고, 값은 :name 같은 자리를 두고 setParameter로 넣으면 여섯 가지 조합이 모두 바르게 실행됩니다. 그래도 오타나 빠진 띄어쓰기는 컴파일러가 잡지 못하므로, 보통은 앞의 세 가지 방식을 씁니다.');
    }
    return { events: ev, summary: sum, row: row, L: L, ex: err ? 'IllegalArgumentException' : '' };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 쿼리를 조립하는 코드를 한 줄씩 따라갑니다.'); return; }
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }).concat([{ cells: ['', { v: '(쿼리 실행)', cls: s.line === 90 ? 'hot' : '' }, s.line === 90 ? '← 지금' : ''] }]), '쿼리를 조립하는 코드');
    H.counters(v, [[s.sql, 'DB로 나간 SQL']]);
  },
  // 그림: 위에 검색 조건 두 개, 가운데에 쿼리로 조립되는 조각 셋과 지금까지 조립된 결과, 아래에 실행 결과. 빠진 조각은 점선이다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], first = sim.events[0].snap;
    var s = last ? last.snap : { name: first.name, age: first.age, pieces: first.pieces, full: first.full, run: first.run, sql: 0 };
    P.size(680, 326);
    P.box('name', 16, 12, 318, 34, { cls: c.name !== 'none' ? 'wait' : 'ghost', title: '이름 조건 (name)', right: c.name === 'none' ? 'null (입력 안 함)' : s.name });
    P.box('age', 346, 12, 318, 34, { cls: c.age ? 'wait' : 'ghost', title: '나이 조건 (age)', right: c.age ? '20 이상' : 'null (입력 안 함)' });
    P.region('q', 16, 58, 648, 194, { spec: 'Specification으로 조립 (스프링 데이터 JPA)', criteria: 'Predicate 객체로 조립 (JPA Criteria API)', querydsl: '조건 객체로 조립 (Querydsl)', concat: '문자열로 조립 (따옴표 안이 실제로 붙는 글자)' }[c.how]);
    s.pieces.forEach(function (p, i) { P.box('b' + i, 28, 88 + i * 34, 624, 28, { cls: p.cls, title: p.t, right: p.r, mono: true }); });
    P.box('full', 28, 194, 624, 46, { cls: s.full.cls, title: s.full.t || '조립된 쿼리', sub: s.full.s, mono: true });
    P.box('run', 16, 270, 648, 44, { cls: s.run.cls, title: '실행 결과', sub: s.run.s });
    if (s.run.cls !== 'ghost') P.arrow('go', 'full:b', 'run:t', { cls: s.run.cls === 'bad' ? 'bad' : 'good', label: { spec: 'findAll', criteria: 'createQuery', querydsl: 'fetch', concat: 'createQuery' }[c.how] });
    P.note(c.how === 'concat' ? '점선 상자는 값이 없어 붙이지 않은 조각입니다. 따옴표 안의 띄어쓰기와 입력값까지 글자 그대로 이어 붙습니다. 붙지 않은 조각이 있어도 나머지 조각은 자기 모양 그대로 붙습니다.' : '점선 상자는 값이 없어 빠진 조건입니다. where와 and는 남은 조건의 개수에 맞춰 도구가 만들고, 값은 ? 자리에 따로 바인딩됩니다.');
  },
  assume: '네 가지 방식과 이름 칸 세 가지, 나이 칸 두 가지를 곱한 스물네 가지 조합을 스프링 부트 4.1.1(자동 설정), 스프링 데이터 JPA 4.1.1, Hibernate 7.4.5, H2 데이터베이스, Querydsl 5.1.0(jakarta)에서 화면과 같은 구조의 코드로 실제로 실행해, 성공 여부, 예외의 종류와 오류 위치와 걸린 낱말, DB로 나간 SQL의 where, 바인딩된 값, 조회된 회원 수를 화면과 대조했습니다. Q클래스(QMember)는 컴파일할 때 querydsl-apt가 Member 엔티티를 보고 만든 것을 썼습니다. Specification, Criteria API, Querydsl은 같은 조건이면 나간 SQL이 글자까지 같았습니다. 스프링 데이터 JPA가 null을 돌려준 조건을 빼고 남은 조건만 and로 묶는다는 설명, Querydsl의 where가 null인 조건을 건너뛴다는 설명은 이렇게 나간 SQL에 근거합니다. Specification.where(null)과 and(null)이 IllegalArgumentException을 던진다는 것, Criteria API에서 m.get에 없는 프로퍼티 이름을 주면 컴파일은 되고 실행 중에 PathElementException이 난다는 것, 문자열이라도 조건을 목록에 모아 and로 잇고 값을 바인딩하면 여섯 조합이 모두 바르게 실행된다는 것도 실행으로 확인했습니다. 문법 오류의 위치와 걸린 낱말은 Hibernate 7.4.5가 낸 메시지 기준이고, 다른 버전이나 다른 JPA 구현에서는 다르게 나올 수 있습니다. "where and"에서 Hibernate가 and를 이름으로 읽고 넘어간다는 설명은, 오류가 and가 아니라 그다음 낱말에서 났다는 실행 결과에 근거한 해석입니다. 화면의 SQL where는 테이블 별칭을 걷어 내고 읽기 쉽게 줄인 것입니다. 실제 서비스에서는 조건이 훨씬 많고 or, like, 정렬이 섞이므로 문자열 방식의 실수가 여기보다 생기기 쉽습니다.',
});
