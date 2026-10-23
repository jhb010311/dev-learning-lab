Lab.register({
  id: 'dynquery', nav: 'Dynamic queries: Specification and Querydsl', cat: 'JPA', mode: 'step',
  title: 'How do you add a search condition to where only when it is given?',
  why: 'If you join JPQL strings for each condition, a person has to get the positions of where and and and the spaces right, and the compiler cannot check those strings, so a query whose pieces were joined wrongly shows its error only when a request with that combination actually arrives. If you also put the values into the string, it becomes a path for SQL injection. The Criteria API of the JPA standard lets you pass the conditions as objects and has JPA attach where and and, and Specification in Spring Data JPA splits each condition into one named method and lets you combine them with and or or. Querydsl points to fields with Q classes generated from the entity, so it catches even a typo in a field name at compile time.',
  use: 'You use it for search features where only the items that were entered become conditions, such as a member search on an admin screen or a product filter in a shop. In projects that use Spring Data JPA, it is common to add JpaSpecificationExecutor to the repository and combine conditions with Specification, or to use Querydsl together. For a query whose conditions are always the same, a query method or @Query is enough.',
  intro: 'On a member search screen, the name and the age may be filled in or left blank. Only the conditions that were filled in must go into where, so the shape of the query differs from request to request. A query like this is called a dynamic query. Specification in Spring Data JPA, the Criteria API of JPA, and Querydsl assemble the conditions as objects instead of strings, and the tool attaches where and and.',
  terms: ['Dynamic query', 'Specification', 'Criteria API', 'Querydsl', 'SQL injection'],
  controls: [
    { id: 'how', label: 'How the query is built', type: 'select', value: 'spec', options: [['spec', 'Spring Data JPA Specification'], ['criteria', 'JPA Criteria API'], ['querydsl', 'Querydsl'], ['concat', 'Joining strings by hand (a way you must not use)']] },
    { id: 'name', label: 'What was entered in the name field', type: 'select', value: 'none', options: [['none', 'Nothing entered (null)'], ['kim', 'Alice'], ['quote', "' or '1'='1 (text with quotes mixed in)"]] },
    { id: 'age', label: 'An age condition was entered (20 or older)', type: 'check', value: true },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you leave the name blank, enter only the age (20 or older), and search with Specification of Spring Data JPA?', d: 'The name condition, which returned null, is dropped, and only the age condition goes into where.', v: { how: 'spec', name: 'none', age: true } },
    { t: 'With no condition at all', q: 'What if you search with Specification and enter neither the name nor the age?', d: 'No condition remains, so no where clause is created at all and everything is returned.', v: { how: 'spec', name: 'none', age: false } },
    { t: 'Assemble two conditions with the Criteria API', q: 'What if you enter both the name Alice and the age (20 or older) with the JPA Criteria API?', d: 'When you pass two condition objects to where, JPA combines them with and. The cb that the lambda of Specification receives is also the CriteriaBuilder of this API.', v: { how: 'criteria', name: 'kim', age: true } },
    { t: 'Assemble with Querydsl', q: 'What if you enter only the name Alice and leave the age blank with Querydsl?', d: 'where skips the null condition, and only the name condition remains. The SQL sent is the same as with Specification and the Criteria API.', v: { how: 'querydsl', name: 'kim', age: false } },
    { t: 'When quotes are mixed into the name field', q: "What if you search with Specification and enter ' or '1'='1 in the name field?", d: 'The value is bound separately to the ? placeholder, so it is just a strange name, and 0 members are found.', v: { how: 'spec', name: 'quote', age: false } },
    { t: 'Joining strings by hand', q: 'What if you leave the name blank and enter only the age (20 or older) in code that joins strings by hand?', d: 'and comes right after where, which causes a syntax error. It is an error you miss if you test with both conditions given.', v: { how: 'concat', name: 'none', age: true } },
    { t: 'When quotes are mixed into the joined string', q: "What if you enter ' or '1'='1 in the name field of the code that joins strings by hand?", d: 'The quote that was entered closes the string and creates an or condition, and all 7 members are found.', v: { how: 'concat', name: 'quote', age: false } },
  ],
  // 7 members (name, age). They are the same as the data that the Probe inserts
  members: [['Alice', 30], ['Alice', 17], ['Bob', 25], ['Carol', 41], ['Dave', 22], ['Erin', 19], ['Alicia', 35]],
  QUOTE: "' or '1'='1",
  nameVal: function (c) { return c.name === 'kim' ? 'Alice' : c.name === 'quote' ? this.QUOTE : null; },
  // The lines that assemble the conditions for each method. The execution step is shown as the last row of the table, "(run the query)"
  lines: function (c) {
    if (c.how === 'spec') return ['Specification<Member> spec = Specification.where(nameEq(name))', '        .and(ageGoe(age));', 'return memberRepository.findAll(spec);'];
    if (c.how === 'criteria') return ['List<Predicate> conds = new ArrayList<>();', 'if (name != null) conds.add(cb.equal(m.get("name"), name));', 'if (age != null)  conds.add(cb.greaterThanOrEqualTo(m.get("age"), age));', 'cq.select(m).where(conds.toArray(new Predicate[0]));'];
    if (c.how === 'querydsl') return ['.selectFrom(m)', '.where(nameEq(name), ageGoe(age))   // null conditions are skipped', '.fetch();'];
    return ['String jpql = "select m from Member m where";', 'if (name != null) jpql += " m.name = \'" + name + "\'";', 'if (age != null)  jpql += " and m.age >= " + age;'];
  },
  code: function (c) {
    var nm = this.nameVal(c), lit = nm === null ? 'null' : '"' + nm + '"';
    var call = '\n\nsearch(' + lit + ', ' + (c.age ? '20' : 'null') + ');   // the name is ' + (nm === null ? 'not entered' : c.name === 'kim' ? 'Alice' : 'text with quotes mixed in') + ', ' + (c.age ? 'the age is 20 or older' : 'the age is not entered');
    var ind = function (a) { return a.map(function (l) { return '    ' + l; }).join('\n'); }, L = this.lines(c);
    if (c.how === 'spec') return '// Only the necessary parts are kept (class declaration, memberRepository field, the example Member entity we made, and imports omitted)\n'
      + '// MemberRepository is an example repository we made. JpaRepository, JpaSpecificationExecutor, and Specification are provided by Spring Data JPA\n'
      + 'interface MemberRepository extends JpaRepository<Member, Long>, JpaSpecificationExecutor<Member> { }\n\n'
      + '// nameEq and ageGoe are example methods we made. When there is no value, they return null instead of a condition\n'
      + 'static Specification<Member> nameEq(String name) {\n    return (root, query, cb) -> name == null ? null : cb.equal(root.get("name"), name);\n}\n'
      + 'static Specification<Member> ageGoe(Integer age) {\n    return (root, query, cb) -> age == null ? null : cb.greaterThanOrEqualTo(root.get("age"), age);\n}\n\n'
      + 'List<Member> search(String name, Integer age) {\n' + ind(L) + '\n}' + call;
    if (c.how === 'criteria') return '// Only the necessary parts are kept (class declaration, em field, the example Member entity we made, and imports omitted)\n'
      + '// CriteriaBuilder, CriteriaQuery, Root, and Predicate are provided by the JPA standard (jakarta.persistence.criteria)\n'
      + 'List<Member> search(String name, Integer age) {\n    CriteriaBuilder cb = em.getCriteriaBuilder();\n    CriteriaQuery<Member> cq = cb.createQuery(Member.class);\n    Root<Member> m = cq.from(Member.class);\n\n'
      + ind(L.slice(0, 3)) + '\n\n' + ind(L.slice(3)) + '\n    return em.createQuery(cq).getResultList();\n}' + call;
    if (c.how === 'querydsl') return '// Only the necessary parts are kept (class declaration, queryFactory field, the example Member entity we made, and imports omitted)\n'
      + '// JPAQueryFactory and BooleanExpression are provided by Querydsl. QMember is a class that the apt tool of Querydsl generated at compile time by looking at the Member entity\n'
      + 'List<Member> search(String name, Integer age) {\n    QMember m = QMember.member;\n    return queryFactory\n'
      + L.map(function (l) { return '        ' + l; }).join('\n') + '\n}\n\n'
      + '// nameEq and ageGoe are example methods we made. When there is no value, they return null instead of a condition\n'
      + 'BooleanExpression nameEq(String name) {\n    return name == null ? null : QMember.member.name.eq(name);\n}\n'
      + 'BooleanExpression ageGoe(Integer age) {\n    return age == null ? null : QMember.member.age.goe(age);\n}' + call;
    return '// Only the necessary parts are kept (class declaration, em field, the example Member entity we made, and imports omitted)\n'
      + '// A way you must not use: where, and, and even the values are attached directly to the string\n'
      + 'List<Member> search(String name, Integer age) {\n' + ind(L) + '\n    return em.createQuery(jpql, Member.class).getResultList();\n}' + call;
  },
  label: function (c) { return { spec: 'Specification', criteria: 'Criteria API', querydsl: 'Querydsl', concat: 'Joining strings by hand' }[c.how] + ' · name ' + { none: 'none', kim: 'Alice', quote: 'text with quotes' }[c.name] + ' · age ' + (c.age ? '20 or older' : 'none'); },
  columns: ['Built query', 'Execution result', 'where of the SQL sent to the DB', 'Bound values', 'Members found'],
  // The result of joining strings by hand. The order is the same as in the Probe's concat
  build: function (nm, age) {
    var jpql = 'select m from Member m where';
    if (nm !== null) jpql += " m.name = '" + nm + "'";
    if (age) jpql += ' and m.age >= 20';
    return jpql;
  },
  // The place where Hibernate first fails on the string of this lab (the character index counted from 0) and the word. null if there is no problem.
  // If there is no name, what follows where is empty (the end) or and. and is read as a name, and it fails at the next word, m (the execution result)
  check: function (jpql, nm, age) {
    if (nm !== null) return null;
    if (!age) return { at: jpql.length, tok: '<EOF>' };
    return { at: jpql.indexOf(' m.age') + 1, tok: 'm' };
  },
  simulate: function (c) {
    var ev = [], sum = [], L = this.lines(c), nm = this.nameVal(c), quote = c.name === 'quote';
    var n = (nm !== null ? 1 : 0) + (c.age ? 1 : 0);
    var hitStd = this.members.filter(function (m) { return (nm === null || m[0] === nm) && (!c.age || m[1] >= 20); }).length;
    var where = n ? 'where ' + [nm !== null ? 'name = ?' : '', c.age ? 'age >= ?' : ''].filter(Boolean).join(' and ') : 'no where';
    var binds = [nm !== null ? nm : '', c.age ? '20' : ''].filter(Boolean);
    var bindTxt = binds.length ? binds.join(', ') : 'none';
    var whereSay = n ? 'The condition of the SQL is "' + where + '".' : 'The SQL has no where.';
    var st = { line: -1, name: nm === null ? 'null' : quote ? 'text with quotes' : '"Alice"', age: c.age ? '20' : 'null', pieces: [], full: { t: '', s: '', cls: 'ghost' }, run: { s: 'Not run yet', cls: 'ghost' }, sql: 0 };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var nameSay = nm === null ? 'null because it was not entered' : quote ? "' or '1'='1 (text with quotes mixed in)" : '"Alice"';
    var input = 'Search conditions: the name is ' + nameSay + ', and the age is ' + (c.age ? '20' : 'null because it was not entered') + '. Only the conditions that are not null must go into the where of the query.';
    var bindSay = quote ? ' The name value with quotes mixed in does not get mixed into the SQL statement; it is bound separately to the ? placeholder. The DB looks for members whose name is exactly that text.' : '';
    var sqlSay = 'One SELECT is sent to the DB. ' + whereSay + (binds.length ? ' The values bound to the ? placeholders are ' + bindTxt + '.' : ' There are no bound values.') + bindSay + ' Members found: ' + hitStd + ' out of 7.';
    var row, err = null;
    var quoteSum = 'The text with quotes mixed in, entered in the name field, was used only as the value of a condition. A value is always bound to a ? placeholder, so it cannot change the shape of the statement, and no member has such a name, so 0 members were found. SQL injection does not work.';

    if (c.how === 'spec') {
      var sn = nm !== null ? 'name = ?' : 'null (dropped)', sa = c.age ? 'age >= ?' : 'null (dropped)';
      st.pieces = [{ t: 'nameEq(name)', r: '', cls: 'ghost' }, { t: 'ageGoe(age)', r: '', cls: 'ghost' }, { t: 'Specification.where(…).and(…)', r: '', cls: 'ghost' }];
      st.full = { t: 'Assembled condition', s: 'None yet', cls: 'ghost' };
      push(input);
      st.line = 0; st.pieces[0] = { t: 'nameEq(name)', r: '1 lambda', cls: 'plain' };
      push('Line 1, nameEq(name): an example method we made. It does not create the condition right away. It returns a lambda (a Specification) that is called when the query is built. This lambda is written to return null instead of a condition if name is null, and cb.equal(root.get("name"), name) otherwise. Specification.where is a method provided by Spring Data JPA, and it takes the Specification it receives as the starting point.');
      st.line = 1; st.pieces[1] = { t: 'ageGoe(age)', r: '1 lambda', cls: 'plain' }; st.pieces[2] = { t: st.pieces[2].t, r: 'two lambdas combined with and', cls: 'plain' };
      push('Line 2, .and(ageGoe(age)): ageGoe is also an example method we made, and it returns a lambda of the same shape. and is a method provided by Spring Data JPA, and it returns a new Specification that combines two Specifications with and. No SQL has been built yet.');
      st.line = 2;
      st.pieces[0] = { t: 'nameEq(name)', r: sn, cls: nm !== null ? 'good' : 'ghost' };
      st.pieces[1] = { t: 'ageGoe(age)', r: sa, cls: c.age ? 'good' : 'ghost' };
      st.pieces[2] = { t: st.pieces[2].t, r: 'conditions left: ' + n, cls: 'good' };
      st.full = { t: 'Assembled condition', s: n ? where : 'No conditions (no where clause is created)', cls: 'plain' };
      push('Line 3, memberRepository.findAll(spec): a method provided by JpaSpecificationExecutor. Spring Data JPA creates a CriteriaQuery and calls the two lambdas. nameEq returns ' + (nm !== null ? 'the condition name = ?' : 'null') + ', and ageGoe returns ' + (c.age ? 'the condition age >= ?' : 'null') + '. ' + (n === 0 ? 'A condition that returned null is dropped, so no condition remains and no where is attached.' : n === 1 ? 'A condition that returned null is dropped, and only the one remaining condition goes into where.' : 'The two conditions are combined with and and put into where.'), 'good');
      st.line = 90; st.sql = 1; st.run = { s: 'Success · ' + where + ' · bound ' + bindTxt + ' · members found: ' + hitStd, cls: 'good' };
      push(sqlSay, 'good');
      row = ['Specification: conditions left: ' + n, 'Success', where, bindTxt, hitStd + ''];
      sum.push('The query assembled with Specification ran with ' + n + (n === 1 ? ' condition' : ' conditions') + ' left, and members found: ' + hitStd + '. All six combinations of the name and age fields run without a syntax error.');
      if (quote) sum.push(quoteSum);
      else sum.push('You do not write where, and, or spaces yourself. If the lambda returns null instead of a condition when there is no value, Spring Data JPA drops that condition and combines only the remaining ones with and. When conditions increase, you create one more method like nameEq and chain it with and.');
      sum.push('Let the lambda return null instead of a condition. Do not pass null itself as the Specification. In Spring Data JPA 4.1.1, Specification.where(null) and and(null) throw an IllegalArgumentException.');
    }

    if (c.how === 'criteria') {
      var pn = 'cb.equal(m.get("name"), name)', pa = 'cb.greaterThanOrEqualTo(m.get("age"), age)';
      st.pieces = [{ t: pn, r: '', cls: 'ghost' }, { t: pa, r: '', cls: 'ghost' }, { t: 'where(conds.toArray(new Predicate[0]))', r: '', cls: 'ghost' }];
      st.full = { t: 'List of conditions (conds)', s: 'None yet', cls: 'ghost' };
      push(input);
      st.line = 0; st.full = { t: 'List of conditions (conds)', s: 'Predicates: 0', cls: 'plain' };
      push('Line 1: creates an empty list to hold the condition objects. What goes into the list is not text but condition objects called Predicates. cb is the CriteriaBuilder provided by JPA, and it creates condition objects.');
      var cnt = 0, have = [];
      [['name', nm !== null, 'name', 'name = ?'], ['age', c.age, 'age', 'age >= ?']].forEach(function (x, i) {
        st.line = i + 1;
        if (x[1]) { cnt++; have.push(x[3]); }
        st.pieces[i] = { t: st.pieces[i].t, r: x[1] ? 'added to the list' : 'skipped (' + x[0] + ' is null)', cls: x[1] ? 'good' : 'ghost' };
        st.full = { t: 'List of conditions (conds)', s: 'Predicates: ' + cnt + (cnt ? ' (' + have.join(', ') + ')' : ''), cls: 'plain' };
        push('Line ' + (i + 2) + ': ' + (x[1] ? 'There is a ' + x[2] + ' condition, so a condition object (' + x[3] + ') is created and added to the list.' + (i === 0 && quote ? ' Even the text with quotes mixed in is only the value of the condition object and does not become part of the statement.' : '') : 'The ' + x[2] + ' condition is null, so it is skipped.'));
      });
      st.line = 3; st.pieces[2] = { t: st.pieces[2].t, r: 'passed conditions: ' + n, cls: 'good' };
      st.full = { t: 'Assembled query (object)', s: n ? where : 'No conditions (no where clause is created)', cls: 'plain' };
      push('Line 4: passes the collected condition objects (' + n + ') to where. You did not write the text where or and yourself. ' + (n === 0 ? 'With 0 conditions, the query has no where clause.' : n === 1 ? 'With 1 condition, only that one condition goes into where.' : 'With several conditions, JPA combines them with and.'), 'good');
      st.line = 90; st.sql = 1; st.run = { s: 'Success · ' + where + ' · bound ' + bindTxt + ' · members found: ' + hitStd, cls: 'good' };
      push('em.createQuery(cq).getResultList(): builds the SQL from the assembled object and sends it. ' + sqlSay, 'good');
      row = ['Condition objects: ' + n + ' (no strings)', 'Success', where, bindTxt, hitStd + ''];
      sum.push('The query assembled from ' + n + (n === 1 ? ' condition object' : ' condition objects') + ' ran, and members found: ' + hitStd + '. The SQL that was sent is identical, down to the letters, to that of Specification and Querydsl with the same conditions.');
      if (quote) sum.push(quoteSum);
      else sum.push('The cb that the lambda of Specification receives is this very CriteriaBuilder. Specification splits the conditions built with the Criteria API into one method each and gives them names, and leaves combining and running them to Spring Data JPA.');
      sum.push('The Criteria API is verbose, so it is hard to tell at a glance what query it is, and the property name in m.get("name") is a string, so it compiles even if the name is wrong (in Hibernate 7.4.5, a PathElementException occurs while running). Querydsl relieves you of these two problems.');
    }

    if (c.how === 'querydsl') {
      st.pieces = [{ t: 'nameEq(name)', r: '', cls: 'ghost' }, { t: 'ageGoe(age)', r: '', cls: 'ghost' }, { t: 'where(nameEq(name), ageGoe(age))', r: '', cls: 'ghost' }];
      st.full = { t: 'Assembled query (object)', s: 'None yet', cls: 'ghost' };
      push(input);
      st.line = 0; push('selectFrom(m): creates a query object that selects members. m is QMember.member, an object of the Q class that the apt tool of Querydsl generated at compile time by looking at the Member entity. It lets you point to properties such as m.name and m.age in Java code.');
      st.line = 1;
      st.pieces[0] = { t: 'nameEq(name)', r: nm !== null ? 'm.name.eq(name)' : 'null', cls: nm !== null ? 'good' : 'ghost' };
      push('nameEq(name): an example method we made (not a method that Querydsl provides). ' + (nm !== null ? 'There is a name, so it returns a condition object (BooleanExpression) that means "name = value".' : 'The name is null, so it returns null instead of a condition object.'));
      st.pieces[1] = { t: 'ageGoe(age)', r: c.age ? 'm.age.goe(20)' : 'null', cls: c.age ? 'good' : 'ghost' };
      push('ageGoe(age): like nameEq, an example method we made. ' + (c.age ? 'There is an age, so it returns a condition object that means "age >= 20". goe means "greater than or equal".' : 'The age is null, so it returns null.'));
      st.pieces[2] = { t: st.pieces[2].t, r: 'conditions without null: ' + n, cls: 'good' };
      st.full = { t: 'Assembled query (object)', s: n ? where : 'No conditions (no where clause is created)', cls: 'plain' };
      push('where(nameEq(name), ageGoe(age)): the where of Querydsl skips the null ones among the conditions it receives and combines the remaining conditions with and. This time, conditions left: ' + n + '.' + (n === 0 ? ' If none remain, the query has no where clause.' : ''), 'good');
      st.line = 90; st.sql = 1; st.run = { s: 'Success · ' + where + ' · bound ' + bindTxt + ' · members found: ' + hitStd, cls: 'good' };
      push('fetch(): runs the query and returns the list. ' + sqlSay, 'good');
      row = ['Conditions that are not null: ' + n, 'Success', where, bindTxt, hitStd + ''];
      sum.push('The query assembled with Querydsl ran with ' + n + (n === 1 ? ' condition' : ' conditions') + ' left, and members found: ' + hitStd + '. The SQL that was sent is identical, down to the letters, to that of Specification and the Criteria API with the same conditions.');
      if (quote) sum.push(quoteSum);
      else sum.push('The condition methods return null when there is no value, and where skips null, so you do not need if statements to match where and and. You can do the same thing with a BooleanBuilder, which builds up conditions one at a time.');
      sum.push('Because properties such as m.name are written in Java code, a wrong name shows up as a compile error before running. In return, Querydsl is not a JPA standard, so you have to add the dependency and the build setting that generates the Q classes separately.');
    }

    if (c.how === 'concat') {
      var jpql = this.build(nm, c.age), q = function (s) { return '"' + s + '"'; };
      var pName = nm === null ? " m.name = '…'" : " m.name = '" + nm + "'";
      st.pieces = [{ t: q('select m from Member m where'), r: '', cls: 'ghost' }, { t: q(pName), r: '', cls: 'ghost' }, { t: q(' and m.age >= 20'), r: '', cls: 'ghost' }];
      st.full = { t: 'String built so far (jpql)', s: 'None yet', cls: 'ghost' };
      push(input);
      var cur = 'select m from Member m where';
      st.line = 0; st.pieces[0] = { t: st.pieces[0].t, r: 'base statement', cls: 'good' }; st.full = { t: 'String built so far (jpql)', s: q(cur), cls: 'plain' };
      push('Line 1: builds the base statement. Expecting conditions to follow, it attaches where at the end in advance.');
      st.line = 1;
      if (nm === null) { st.pieces[1] = { t: st.pieces[1].t, r: 'skipped (name is null)', cls: 'ghost' }; push('Line 2: the name condition is null, so it is skipped. The string stays as it is.'); }
      else {
        cur += pName; st.pieces[1] = { t: q(pName), r: 'attached', cls: quote ? 'bad' : 'good' }; st.full = { t: 'String built so far (jpql)', s: q(cur), cls: quote ? 'bad' : 'plain' };
        push('Line 2: there is a name condition, so the input value is put as it is between single quotes, and the piece ' + q(pName) + ' is attached.' + (quote ? ' The first quote of the input pairs with the opening quote, so the name value ends up as an empty string, and the rest, or \'1\'=\'1\', became part of the condition.' : ''), quote ? 'bad' : '');
      }
      st.line = 2;
      if (!c.age) { st.pieces[2] = { t: st.pieces[2].t, r: 'skipped (age is null)', cls: 'ghost' }; push('Line 3: the age condition is null, so it is skipped. The string stays as it is.'); }
      else {
        cur += ' and m.age >= 20'; st.pieces[2] = { t: st.pieces[2].t, r: 'attached', cls: nm === null ? 'bad' : 'good' }; st.full = { t: 'String built so far (jpql)', s: q(cur), cls: 'plain' };
        push('Line 3: there is an age condition, so the piece ' + q(' and m.age >= 20') + ' is attached at the end. This line assumes that a name condition is already attached before it, so it starts with and.' + (nm === null ? ' But this time the name condition was not attached.' : ''), nm === null ? 'bad' : '');
      }
      st.full = { t: 'Finished string (jpql)', s: q(jpql), cls: quote ? 'bad' : 'plain' };
      err = this.check(jpql, nm, c.age);
      st.line = 90;
      var hitCat = quote ? this.members.filter(function (m) { return !c.age || m[1] >= 20; }).length : hitStd;
      if (err) {
        var why = !c.age ? 'The string ended with where. A condition must come after where, but there is nothing, so it stops at the end of the string (<EOF>).'
          : 'and came right after where. The first condition that should be before and is missing. In the Hibernate grammar, a word such as and can also be used as a name, so it reads up to and as a name and moves on, and it stops at the next token, m.';
        st.full.cls = 'bad'; st.run = { s: 'SyntaxException · position 1:' + err.at + ' · failing token ' + err.tok, cls: 'bad' };
        push('em.createQuery(jpql, Member.class): Hibernate reads the string from the beginning and checks the syntax. ' + why, 'bad');
        push('Exception: createQuery throws an IllegalArgumentException (the cause is a SyntaxException from Hibernate). The text "At 1:' + err.at + '" in the message means that it stopped at character ' + err.at + ' of line 1 (counted from 0). No SQL was sent to the DB, and the search request fails.', 'bad');
        row = [jpql, 'Failed: SyntaxException (position 1:' + err.at + ', token ' + err.tok + ')', 'no SQL sent', 'none', 'none'];
        sum.push('This code fails when the name is left blank, whatever is entered for the age, and works normally when a name is given. The compiler does not check inside strings, and the error appears only when a request with that combination actually arrives. If you test with both conditions given, you miss it.');
      } else {
        var cw = "where name = '" + nm + "'" + (c.age ? ' and age >= 20' : '');
        if (quote) cw = "where name = '' or '1' = '1'" + (c.age ? ' and age >= 20' : '');
        st.sql = 1; st.run = { s: 'Success · ' + cw + ' · members found: ' + hitCat, cls: quote ? 'bad' : 'good' };
        push('em.createQuery(jpql, Member.class): Hibernate reads the string from the beginning and checks the syntax. It is valid. The value has already become letters of the statement, so there is no value to bind.', quote ? 'bad' : '');
        push('getResultList(): one SELECT is sent to the DB. The condition of the SQL is "' + cw + '". ' + (quote ? (c.age ? 'Because and binds before or, it becomes "the name is an empty string" or "\'1\'=\'1\' and the age is 20 or older", so the name condition disappears and all ' + hitCat + ' members aged 20 or older are found.' : '\'1\'=\'1\' is always true, so all 7 members are found. A feature that looks up members by name handed out the whole list.') : 'Members found: ' + hitCat + ' out of 7.'), quote ? 'bad' : 'good');
        row = [jpql, 'Success', cw, 'none', hitCat + ''];
        if (quote) sum.push('The quote that was entered closed the string and changed the shape of the statement. This is SQL injection. If you enter the same input in Specification, the Criteria API, or Querydsl, it is bound as a value and 0 members are found.');
        else sum.push('The combination with a name works normally, but the same code fails with a syntax error when the name is left blank, and becomes SQL injection when a name with quotes mixed in comes in.');
      }
      sum.push('If you must build it with strings, collect the conditions in a list and put " and " only between them, and leave a placeholder such as :name for each value and put it in with setParameter, and all six combinations run correctly. Even so, the compiler cannot catch a typo or a missing space, so one of the first three approaches is normally used.');
    }
    return { events: ev, summary: sum, row: row, L: L, ex: err ? 'IllegalArgumentException' : '' };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to follow the code that builds the query one line at a time.'); return; }
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }).concat([{ cells: ['', { v: '(run the query)', cls: s.line === 90 ? 'hot' : '' }, s.line === 90 ? '← now' : ''] }]), 'Code that builds the query');
    H.counters(v, [[s.sql, 'SQL sent to the DB']]);
  },
  // Diagram: at the top, the two search conditions; in the middle, the three pieces assembled into the query and the result built so far; at the bottom, the execution result. A piece that is dropped is a dashed box.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], first = sim.events[0].snap;
    var s = last ? last.snap : { name: first.name, age: first.age, pieces: first.pieces, full: first.full, run: first.run, sql: 0 };
    P.size(680, 326);
    P.box('name', 16, 12, 318, 34, { cls: c.name !== 'none' ? 'wait' : 'ghost', title: 'Name condition', right: c.name === 'none' ? 'null (not entered)' : s.name });
    P.box('age', 346, 12, 318, 34, { cls: c.age ? 'wait' : 'ghost', title: 'Age condition', right: c.age ? '20 or older' : 'null (not entered)' });
    P.region('q', 16, 58, 648, 194, { spec: 'Assembled with Specification (Spring Data JPA)', criteria: 'Assembled from Predicate objects (JPA Criteria API)', querydsl: 'Assembled from condition objects (Querydsl)', concat: 'Assembled from strings (the text inside the quotes is what is actually attached)' }[c.how]);
    s.pieces.forEach(function (p, i) { P.box('b' + i, 28, 88 + i * 34, 624, 28, { cls: p.cls, title: p.t, right: p.r, mono: true }); });
    P.box('full', 28, 194, 624, 46, { cls: s.full.cls, title: s.full.t || 'Assembled query', sub: s.full.s, mono: true });
    P.box('run', 16, 270, 648, 44, { cls: s.run.cls, title: 'Execution result', sub: s.run.s });
    if (s.run.cls !== 'ghost') P.arrow('go', 'full:b', 'run:t', { cls: s.run.cls === 'bad' ? 'bad' : 'good', label: { spec: 'findAll', criteria: 'createQuery', querydsl: 'fetch', concat: 'createQuery' }[c.how] });
    P.note(c.how === 'concat' ? 'A dashed box is a piece that was not attached because there is no value. Even the spaces inside the quotes and the input value are attached as they are, letter by letter. Even if some pieces are not attached, the remaining pieces are attached in their own form.' : 'A dashed box is a condition that was dropped because there is no value. The tool creates where and and to match the number of remaining conditions, and the values are bound separately to ? placeholders.');
  },
  assume: 'All 24 combinations of the four methods, the three name fields, and the two age fields were run for real, with code that has the same structure as the screen, on Spring Boot 4.1.1 (auto-configuration), Spring Data JPA 4.1.1, Hibernate 7.4.5, an H2 database, and Querydsl 5.1.0 (jakarta), and the screen was checked against whether it succeeded, the kind of exception, the error position and the failing token, the where of the SQL sent to the DB, the bound values, and the number of members found. For the Q class (QMember), the one that querydsl-apt generated by looking at the Member entity at compile time was used. With the same conditions, the SQL sent by Specification, the Criteria API, and Querydsl was identical down to the letters. The explanations that Spring Data JPA drops a condition that returned null and combines only the remaining conditions with and, and that the where of Querydsl skips null conditions, are based on the SQL sent in this way. We also confirmed by running that Specification.where(null) and and(null) throw an IllegalArgumentException, that with the Criteria API a property name that does not exist in m.get compiles and a PathElementException occurs while running, and that even with strings, collecting the conditions in a list, joining them with and, and binding the values makes all six combinations run correctly. The position of the syntax error and the failing token are based on the message produced by Hibernate 7.4.5, and they may come out differently on other versions or other JPA implementations. The explanation that, for "where and", Hibernate reads and as a name and moves on is an interpretation based on the execution result that the error occurred not at and but at the token after it. The SQL where on the screen has the table aliases removed and is shortened to be easy to read. In a real service there are many more conditions, and or, like, and sorting are mixed in, so the mistakes of the string method are easier to make than here.',
});
