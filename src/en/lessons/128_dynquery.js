Lab.register({
  id: 'dynquery', nav: 'Dynamic queries and Querydsl', cat: 'JPA', mode: 'step',
  title: 'How do you add a search condition to where only when it is given?',
  intro: 'On a member search screen, the name and the age may be filled in or left blank. Only the conditions that were filled in must go into where, so the shape of the query differs from request to request. A query built at run time from whichever conditions were supplied is called a dynamic query.',
  terms: ['Dynamic query', 'JPQL', 'Criteria API', 'Querydsl', 'SQL injection'],
  controls: [
    { id: 'how', label: 'How the query is built', type: 'select', value: 'fixed', options: [['fixed', 'String concatenation: where is attached in advance'], ['nospace', 'String concatenation: a space is missing'], ['join', 'String concatenation: collect the conditions and join them with and'], ['criteria', 'JPA Criteria API (assembled with code)'], ['querydsl', 'Querydsl (assembled with code, cannot be run here)']] },
    { id: 'name', label: 'A name condition was entered (Alice)', type: 'check', value: false },
    { id: 'age', label: 'An age condition was entered (20 or older)', type: 'check', value: true },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when only the age (20 or older) is entered and the query is built with where attached in advance?', d: 'Only the age is entered, so and comes right after where and causes a syntax error.', v: { how: 'fixed', name: false, age: true } },
    { t: 'Same code with both conditions', q: 'What if you enter both the name Alice and the age (20 or older) with the same code?', d: 'It works with no problem. So if you test only this combination, you miss the error.', v: { how: 'fixed', name: true, age: true } },
    { t: 'With no condition at all', q: 'What if neither the name condition nor the age condition is entered?', d: 'The string ends with where, which causes a syntax error.', v: { how: 'fixed', name: false, age: false } },
    { t: 'Missing a single space', q: 'What if a space is missing in the string concatenation, the name Alice is entered, and the age is not?', d: 'm and where stick together and become mwhere.', v: { how: 'nospace', name: true, age: false } },
    { t: 'Collect the conditions and join them', q: 'What if you collect the conditions and join them with and in the string concatenation?', d: 'You can build it correctly with strings too.', v: { how: 'join', name: false, age: true } },
    { t: 'Assemble with the Criteria API', q: 'What if you assemble the query with the JPA Criteria API and enter neither the name nor the age?', d: 'If there is no condition, no where is created at all.', v: { how: 'criteria', name: false, age: false } },
    { t: 'Assemble with Querydsl', q: 'What if you assemble the query with Querydsl, entering only the age (20 or older) and no name?', d: 'A null condition is skipped by where on its own (according to the documentation).', v: { how: 'querydsl', name: false, age: true } },
  ],
  // 7 members (name, age). They correspond to the data that the Probe inserts
  members: [['Alice', 30], ['Alice', 17], ['Bob', 25], ['Carol', 41], ['Dave', 22], ['Erin', 19], ['Alicia', 35]],
  // The code for each method. It is divided into the lines that build the query (L) and the lines that run it (R)
  lines: function (c) {
    if (c.how === 'fixed') return ['String jpql = "select m from Member m where";', 'if (name != null) jpql += " m.name = :name";', 'if (age != null)  jpql += " and m.age >= :age";'];
    if (c.how === 'nospace') return ['String jpql = "select m from Member m";  boolean first = true;', 'if (name != null) { jpql += (first ? "where" : "and") + " m.name = :name"; first = false; }', 'if (age != null)  { jpql += (first ? "where" : "and") + " m.age >= :age"; first = false; }'];
    if (c.how === 'join') return ['List<String> conds = new ArrayList<>();', 'if (name != null) conds.add("m.name = :name");', 'if (age != null)  conds.add("m.age >= :age");', 'String jpql = "select m from Member m";', 'if (!conds.isEmpty()) jpql += " where " + String.join(" and ", conds);'];
    if (c.how === 'criteria') return ['List<Predicate> conds = new ArrayList<>();', 'if (name != null) conds.add(cb.equal(m.get("name"), name));', 'if (age != null)  conds.add(cb.greaterThanOrEqualTo(m.get("age"), age));', 'cq.select(m).where(conds.toArray(new Predicate[0]));'];
    return ['.selectFrom(m)', '.where(nameEq(name), ageGoe(age))   // null conditions are skipped', '.fetch();'];
  },
  code: function (c) {
    var H = '// Only the methods inside the class and the line that calls search are shown (class declaration, the ' + (c.how === 'querydsl' ? 'queryFactory' : 'em') + ' field, the example Member entity, and imports omitted)\n';
    var L = this.lines(c), call = '\n\nsearch(' + (c.name ? '"Alice"' : 'null') + ', ' + (c.age ? '20' : 'null') + ');   // ' + (c.name ? 'the name is Alice' : 'the name is not entered') + ', ' + (c.age ? 'the age is 20 or older' : 'the age is not entered');
    var ind = function (a) { return a.map(function (l) { return '    ' + l; }).join('\n'); };
    var run = '\n\n    TypedQuery<Member> query = em.createQuery(jpql, Member.class);\n    if (name != null) query.setParameter("name", name);\n    if (age != null)  query.setParameter("age", age);\n    return query.getResultList();\n}';
    if (c.how === 'criteria') return H + 'List<Member> search(String name, Integer age) {\n    CriteriaBuilder cb = em.getCriteriaBuilder();\n    CriteriaQuery<Member> cq = cb.createQuery(Member.class);\n    Root<Member> m = cq.from(Member.class);\n\n' + ind(L.slice(0, 3)) + '\n\n' + ind(L.slice(3)) + '\n    return em.createQuery(cq).getResultList();\n}' + call;
    if (c.how === 'querydsl') return H + 'List<Member> search(String name, Integer age) {\n    QMember m = QMember.member;\n    return queryFactory            // JPAQueryFactory\n' + L.map(function (l) { return '        ' + l; }).join('\n') + '\n}\n\nBooleanExpression nameEq(String name) {\n    return name == null ? null : QMember.member.name.eq(name);\n}\nBooleanExpression ageGoe(Integer age) {\n    return age == null ? null : QMember.member.age.goe(age);\n}\n\n// You can do the same thing with a BooleanBuilder\n// BooleanBuilder builder = new BooleanBuilder();\n// if (name != null) builder.and(m.name.eq(name));\n// if (age != null)  builder.and(m.age.goe(age));\n// queryFactory.selectFrom(m).where(builder).fetch();' + call;
    return H + 'List<Member> search(String name, Integer age) {\n' + ind(L) + run + call;
  },
  label: function (c) { return { fixed: 'where attached in advance', nospace: 'missing space', join: 'conditions collected and joined', criteria: 'Criteria API', querydsl: 'Querydsl' }[c.how] + ' · name ' + (c.name ? 'entered' : 'none') + ' · age ' + (c.age ? 'entered' : 'none'); },
  columns: ['Built query', 'Execution result', 'where of the SQL sent to the DB', 'Members found'],
  // Builds the string. The order is the same as the Java code of the Probe. It returns [the finished string, the piece added on each line]
  build: function (how, name, age) {
    var jpql, add = ['', ''];
    if (how === 'fixed') { jpql = 'select m from Member m where'; if (name) { add[0] = ' m.name = :name'; jpql += add[0]; } if (age) { add[1] = ' and m.age >= :age'; jpql += add[1]; } }
    else if (how === 'nospace') { jpql = 'select m from Member m'; var first = true; if (name) { add[0] = (first ? 'where' : 'and') + ' m.name = :name'; jpql += add[0]; first = false; } if (age) { add[1] = (first ? 'where' : 'and') + ' m.age >= :age'; jpql += add[1]; first = false; } }
    else { var conds = []; if (name) { add[0] = 'm.name = :name'; conds.push(add[0]); } if (age) { add[1] = 'm.age >= :age'; conds.push(add[1]); } jpql = 'select m from Member m'; if (conds.length) jpql += ' where ' + conds.join(' and '); }
    return [jpql, add];
  },
  // A small syntax check that can read only the statements that appear in this lab. It returns the first token that fails and its position (the character index, counted from 0). It returns null if there is no problem
  check: function (jpql) {
    var toks = [], re = /\S+/g, m; while ((m = re.exec(jpql))) toks.push({ s: m[0], at: m.index });
    var eof = { s: '<EOF>', at: jpql.length }, i = 5, t = function (k) { return toks[k] || eof; }, isOp = function (x) { return x.s === '=' || x.s === '>='; };
    // up to "select m from Member alias", any token is read as the alias
    if (i >= toks.length) return null;
    if (t(i).s !== 'where') return { at: t(i).at, tok: t(i).s.split('.')[0] };
    i++;
    for (;;) {
      if (t(i) === eof) return { at: eof.at, tok: eof.s };
      // the left side of a condition: a path such as m.name. A token such as and is also read as a name, so it does not fail here
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
    var hit = this.members.filter(function (m) { return (!c.name || m[0] === 'Alice') && (!c.age || m[1] >= 20); }).length;
    var where = n ? 'where ' + [c.name ? 'name = ?' : '', c.age ? 'age >= ?' : ''].filter(Boolean).join(' and ') : 'no where';
    var whereSay = n ? 'The SQL condition is "' + where + '"' : 'The SQL has no where';
    var st = { line: -1, name: c.name ? 'Alice' : 'null', age: c.age ? '20' : 'null', pieces: [], full: { t: '', s: '', cls: 'ghost' }, run: { s: 'Not run yet', cls: 'ghost' }, sql: 0 };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var str = c.how === 'fixed' || c.how === 'nospace' || c.how === 'join', row, err = null;
    var input = 'Search conditions: the name is ' + (c.name ? '"Alice"' : 'null because it was not entered') + ', and the age is ' + (c.age ? '20' : 'null because it was not entered') + '. Only the conditions that are not null must go into the where of the query.';

    if (str) {
      var b = this.build(c.how, c.name, c.age), jpql = b[0], add = b[1], q = function (s) { return '"' + s + '"'; };
      st.full = { t: 'String built so far (jpql)', s: 'None yet', cls: 'ghost' };
      if (c.how === 'join') {
        st.pieces = [{ t: q('m.name = :name'), r: '', cls: 'ghost' }, { t: q('m.age >= :age'), r: '', cls: 'ghost' }, { t: '" where " + String.join(" and ", conds)', r: '', cls: 'ghost' }];
        push(input);
        st.line = 0; st.full = { t: 'List of conditions (conds)', s: 'Empty', cls: 'plain' };
        push('Line 1: Creates an empty list to hold the conditions. where and and are not written yet.');
        [['name', c.name, 'name'], ['age', c.age, 'age']].forEach(function (x, i) {
          st.line = i + 1; st.pieces[i] = { t: st.pieces[i].t, r: x[1] ? 'added to the list' : 'skipped (' + x[0] + ' is null)', cls: x[1] ? 'good' : 'ghost' };
          if (i === 1 && !x[1]) st.pieces[i].r = 'skipped (age is null)';
          if (x[1]) st.full = { t: 'List of conditions (conds)', s: (i === 1 && c.name ? q('m.name = :name') + ', ' : '') + st.pieces[i].t, cls: 'plain' };
          push('Line ' + (i + 2) + ': ' + (x[1] ? 'There is a ' + x[2] + ' condition, so the one condition string ' + st.pieces[i].t + ' is added to the list. Only the condition is added, and where or and is not put before or after it.' : 'The ' + x[2] + ' condition is null, so it is skipped.'));
        });
        st.line = 4; st.pieces[2] = { t: st.pieces[2].t, r: n ? 'attached (conditions: ' + n + ')' : 'skipped (the list is empty)', cls: n ? 'good' : 'ghost' };
        st.full = { t: 'Finished string (jpql)', s: q(jpql), cls: 'plain' };
        push('Lines 4-5: To the base statement "select m from Member m", ' + (n ? 'the list has ' + n + (n === 1 ? ' condition' : ' conditions') + ', so " where " is attached and the conditions are ' + (n > 1 ? 'joined with " and ". and goes only between conditions.' : 'attached. There is only one condition, so no and goes in.') : 'the list is empty, so nothing is attached. No where is created.'));
      } else {
        var base = c.how === 'fixed' ? 'select m from Member m where' : 'select m from Member m';
        var gen = c.how === 'fixed' ? [' m.name = :name', ' and m.age >= :age'] : ['(where or and) + " m.name = :name"', '(where or and) + " m.age >= :age"'];
        st.pieces = [{ t: q(base), r: '', cls: 'ghost' }, { t: c.how === 'fixed' ? q(gen[0]) : gen[0], r: '', cls: 'ghost' }, { t: c.how === 'fixed' ? q(gen[1]) : gen[1], r: '', cls: 'ghost' }];
        push(input);
        st.line = 0; st.pieces[0] = { t: q(base), r: 'base statement', cls: 'good' }; st.full = { t: 'String built so far (jpql)', s: q(base), cls: 'plain' };
        push('Line 1: ' + (c.how === 'fixed' ? 'Builds the base statement. Expecting conditions to follow, it attaches where at the end in advance.' : 'Builds the base statement. There is no where yet. first is a variable that remembers "is the piece being attached now the first condition", and it starts as true.'));
        var cur = base, firstFlag = true;
        [['name', c.name, 'name'], ['age', c.age, 'age']].forEach(function (x, i) {
          st.line = i + 1;
          if (!x[1]) { st.pieces[i + 1] = { t: st.pieces[i + 1].t, r: 'skipped (' + x[0] + ' is null)', cls: 'ghost' }; push('Line ' + (i + 2) + ': The ' + x[2] + ' condition is null, so it is skipped. The string stays as it is.'); return; }
          cur += add[i]; st.pieces[i + 1] = { t: q(add[i]), r: 'attached', cls: 'good' }; st.full = { t: 'String built so far (jpql)', s: q(cur), cls: 'plain' };
          if (c.how === 'fixed') push('Line ' + (i + 2) + ': There is a ' + x[2] + ' condition, so the piece ' + q(add[i]) + ' is attached at the end.' + (i === 1 ? ' This line assumes that the name condition is already attached before it, so it starts with and.' + (c.name ? '' : ' But this time the name condition was not attached.') : ''), i === 1 && !c.name ? 'bad' : '');
          else { push('Line ' + (i + 2) + ': There is a ' + x[2] + ' condition. first is ' + firstFlag + ', so the piece ' + q(add[i]) + ', which starts with ' + (firstFlag ? 'where' : 'and') + ', is attached at the end. There is no space at the start of the text being attached.', 'bad'); firstFlag = false; }
        });
        st.full = { t: 'Finished string (jpql)', s: q(jpql), cls: 'plain' };
      }
      err = this.check(jpql);
      st.line = 90;
      if (err) {
        var why = c.how === 'nospace' ? 'The text was attached right after "Member m" without a space, and it became mwhere. Hibernate reads mwhere as an alias (a name) attached to Member. The word where has effectively disappeared, so it stops at the next token, ' + err.tok + ', as a token that cannot come here.' + (n === 2 ? ' The :nameand at the end is also stuck together, but the failure came earlier.' : '')
          : n === 0 ? 'The string ended with where. A condition must come after where, but there is nothing, so it stops at the end of the string (' + err.tok + ').'
          : 'and came right after where. The first condition that should be before and is missing. In the Hibernate grammar, a word such as and can also be used as a name, so it reads up to and as a name and moves on, and it stops at the next token, ' + err.tok + '.';
        st.full.cls = 'bad'; st.run = { s: 'SyntaxException · position 1:' + err.at + ' · failing token ' + err.tok, cls: 'bad' };
        push('em.createQuery(jpql, Member.class): Hibernate reads the string from the beginning and checks the syntax. ' + why, 'bad');
        push('Exception: createQuery throws an IllegalArgumentException (the cause is a SyntaxException from Hibernate). The text "At 1:' + err.at + '" in the message means that it stopped at character ' + err.at + ' of line 1 (counted from 0). No SQL was sent to the DB, and the search request fails.', 'bad');
        row = [jpql, 'Failed: SyntaxException (position 1:' + err.at + ', token ' + err.tok + ')', 'no SQL sent', 'none'];
      } else {
        push('em.createQuery(jpql, Member.class): Hibernate reads the string from the beginning and checks the syntax. It is valid. Next, setParameter puts the values only into the conditions that have a value.', 'good');
        st.sql = 1; st.run = { s: 'Success · SQL ' + where + ' · ' + hit + (hit === 1 ? ' member' : ' members'), cls: 'good' };
        push('query.getResultList(): One SELECT is sent to the DB. ' + whereSay + ', and the number of members found is ' + hit + ' out of 7.', 'good');
        row = [jpql, 'Success', where, hit + ''];
      }
      // Which of the four combinations this method fails in
      var fails = [[false, false, 'when neither is given'], [true, false, 'when only the name is given'], [false, true, 'when only the age is given'], [true, true, 'when both are given']].filter(function (x) { return self.check(self.build(c.how, x[0], x[1])[0]); }).map(function (x) { return x[2]; });
      if (fails.length) sum.push('Of the four combinations, this code fails ' + fails.join(', ') + ', and works normally in the rest. The compiler does not check inside strings, and an error appears only when a request with that combination actually arrives. If you do not test every combination, the error shows up in production.');
      else sum.push('If you collect the conditions in a list and put and only between them, all four combinations are built correctly. But it is still a string, so the compiler cannot catch a typo or a missing space, and the code gets harder to read as the conditions increase.');
      sum.push('With any approach, do not append values to the string directly; leave a placeholder such as :name and put the value in with setParameter. If you append a value entered by a user to the statement as it is, you are exposed to a SQL injection attack.');
    }

    if (c.how === 'criteria') {
      var pn = 'cb.equal(m.get("name"), name)', pa = 'cb.greaterThanOrEqualTo(m.get("age"), age)';
      st.pieces = [{ t: pn, r: '', cls: 'ghost' }, { t: pa, r: '', cls: 'ghost' }, { t: 'where(conds.toArray(new Predicate[0]))', r: '', cls: 'ghost' }];
      st.full = { t: 'List of conditions (conds)', s: 'None yet', cls: 'ghost' };
      push(input);
      st.line = 0; st.full = { t: 'List of conditions (conds)', s: 'Predicates: 0', cls: 'plain' };
      push('Line 1: Creates an empty list to hold the conditions. What goes into the list is not text but condition objects called Predicates.');
      var cnt = 0;
      [['name', c.name, 'name', 'name = Alice'], ['age', c.age, 'age', 'age >= 20']].forEach(function (x, i) {
        st.line = i + 1;
        if (x[1]) cnt++;
        st.pieces[i] = { t: st.pieces[i].t, r: x[1] ? 'added to the list' : 'skipped (' + x[0] + ' is null)', cls: x[1] ? 'good' : 'ghost' };
        st.full = { t: 'List of conditions (conds)', s: 'Predicates: ' + cnt + (cnt ? ' (' + [c.name ? 'name = Alice' : '', i === 1 && c.age ? 'age >= 20' : ''].filter(Boolean).join(', ') + ')' : ''), cls: 'plain' };
        push('Line ' + (i + 2) + ': ' + (x[1] ? 'There is a ' + x[2] + ' condition, so a condition object (' + x[3] + ') is created and added to the list. cb is the CriteriaBuilder that creates condition objects.' : 'The ' + x[2] + ' condition is null, so it is skipped.'));
      });
      st.line = 3; st.pieces[2] = { t: st.pieces[2].t, r: 'passed conditions: ' + n, cls: 'good' };
      st.full = { t: 'Assembled query (object)', s: n ? (n === 1 ? '1 condition' : n + ' conditions') + (n > 1 ? ', combined with and' : '') : 'No conditions (no where clause is created)', cls: 'plain' };
      push('Line 4: Passes the collected condition objects (' + n + ') to where. You did not write the text where or and yourself. ' + (n === 0 ? 'With 0 conditions, the query has no where clause.' : n === 1 ? 'With 1 condition, only that one condition goes into where.' : 'With several conditions, JPA combines them with and.'), 'good');
      st.line = 90; st.sql = 1; st.run = { s: 'Success · SQL ' + where + ' · ' + hit + (hit === 1 ? ' member' : ' members'), cls: 'good' };
      push('em.createQuery(cq).getResultList(): Builds the SQL from the assembled object and sends one SELECT. ' + whereSay + ', and the number of members found is ' + hit + ' out of 7. No strings were concatenated, so there is no chance that a space or the position of and is wrong.', 'good');
      row = ['Condition objects: ' + n + ' (no strings)', 'Success', where, hit + ''];
      sum.push('The query assembled from condition objects (' + n + ') ran. Members found: ' + hit + '. All four combinations run without a syntax error.');
      sum.push('This is because JPA, not a person, writes where, and, and the spaces to match the number of conditions.');
      sum.push('But the Criteria API is verbose, so it is hard to tell at a glance what query it is. Also, the property name in m.get("name") is still a string, so a wrong name raises an exception while running, not at compile time. Querydsl is a library used to reduce these two problems.');
    }

    if (c.how === 'querydsl') {
      st.pieces = [{ t: 'nameEq(name)', r: '', cls: 'ghost' }, { t: 'ageGoe(age)', r: '', cls: 'ghost' }, { t: 'where(nameEq(name), ageGoe(age))', r: '', cls: 'ghost' }];
      st.full = { t: 'Assembled query (object)', s: 'None yet', cls: 'ghost' };
      push(input);
      st.line = 0; push('selectFrom(m): Creates a query object that selects members. m is QMember.member, an object of the Q class that Querydsl generated by looking at the Member entity. It lets you point to properties such as m.name and m.age in Java code.');
      st.line = 1;
      st.pieces[0] = { t: 'nameEq(name)', r: c.name ? 'm.name.eq("Alice")' : 'null', cls: c.name ? 'good' : 'ghost' };
      push('nameEq(name): A method made up for this example (not a method that Querydsl provides). ' + (c.name ? 'There is a name, so it returns a condition object (BooleanExpression) that means "name = Alice".' : 'The name is null, so it returns null instead of a condition object.'));
      st.pieces[1] = { t: 'ageGoe(age)', r: c.age ? 'm.age.goe(20)' : 'null', cls: c.age ? 'good' : 'ghost' };
      push('ageGoe(age): Like nameEq, a method made up for this example. ' + (c.age ? 'There is an age, so it returns a condition object that means "age >= 20". goe means "greater than or equal".' : 'The age is null, so it returns null.'));
      st.pieces[2] = { t: st.pieces[2].t, r: 'conditions that are not null: ' + n, cls: 'good' };
      st.full = { t: 'Assembled query (object)', s: n ? (n === 1 ? '1 condition' : n + ' conditions') + (n > 1 ? ', combined with and' : '') : 'No conditions (no where clause is created)', cls: 'plain' };
      push('where(nameEq(name), ageGoe(age)): The where of Querydsl skips the null ones among the conditions it receives (official API documentation: "Skips null arguments") and combines the remaining conditions with and. The number of conditions that remain this time is ' + n + '.' + (n === 0 ? ' If none remain, the query has no where clause.' : ''), 'good');
      st.line = 2; st.run = { s: 'Not run · per the documentation: ' + where + ' · found: ' + hit, cls: 'wait' };
      push('fetch(): The method that runs the query and returns the list. The Querydsl library was not available in our test runs, so this step was not actually run. According to the documentation, ' + (n ? 'the query has the condition "' + where + '"' : 'the query has no where') + ', and judging from the result of the Criteria API, which was confirmed by running the same conditions, the number of members found is ' + hit + '.');
      row = ['Conditions that are not null: ' + n + ' (no strings)', 'Not run (according to the documentation: no error)', 'According to the documentation: ' + where, 'According to the documentation: ' + hit];
      sum.push('Querydsl could not be checked by running it. What follows is an explanation based on the official Querydsl documentation.');
      sum.push('The condition methods return null when there is no value, and where skips null, so you do not need if statements to match where and and. When the conditions increase, you just add one more method inside where.');
      sum.push('Because properties such as m.name are written in Java code, a wrong name shows up as a compile error before running. You can do the same thing with a BooleanBuilder, which builds up conditions one at a time.');
    }
    return { events: ev, summary: sum, row: row, L: L, ex: err ? 'IllegalArgumentException' : '', verified: c.how !== 'querydsl' };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to follow the code that builds the query one line at a time.'); return; }
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { var on = i === s.line || (c.how === 'join' && s.line === 4 && i === 3); return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }).concat([{ cells: ['', { v: c.how === 'querydsl' ? '(assembly done)' : '(run the query)', cls: s.line === 90 ? 'hot' : '' }, s.line === 90 ? '← now' : ''] }]), 'Code that builds the query');
    H.counters(v, [[s.sql, 'SQL sent to the DB']]);
  },
  // Diagram: at the top, the two search conditions; in the middle, the three pieces assembled into the query and the result built so far; at the bottom, the execution result. A skipped piece is a dashed box.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], first = sim.events[0].snap;
    var s = last ? last.snap : { name: first.name, age: first.age, pieces: first.pieces, full: first.full, run: first.run, sql: 0 };
    P.size(680, 326);
    P.box('name', 16, 12, 318, 34, { cls: c.name ? 'wait' : 'ghost', title: 'Name condition', right: c.name ? '"Alice"' : 'null (not entered)' });
    P.box('age', 346, 12, 318, 34, { cls: c.age ? 'wait' : 'ghost', title: 'Age condition', right: c.age ? '20 or older' : 'null (not entered)' });
    P.region('q', 16, 58, 648, 194, c.how === 'criteria' ? 'Assembled from Predicate objects (JPA Criteria API)' : c.how === 'querydsl' ? 'Assembled from condition objects (Querydsl)' : 'Assembled from strings (the text inside the quotes is what is actually attached)');
    s.pieces.forEach(function (p, i) { P.box('b' + i, 28, 88 + i * 34, 624, 28, { cls: p.cls, title: p.t, right: p.r, mono: true }); });
    P.box('full', 28, 194, 624, 46, { cls: s.full.cls, title: s.full.t || 'Assembled query', sub: s.full.s, mono: true });
    P.box('run', 16, 270, 648, 44, { cls: s.run.cls, title: 'Execution result', sub: s.run.s });
    if (s.run.cls !== 'ghost') P.arrow('go', 'full:b', 'run:t', { cls: s.run.cls === 'bad' ? 'bad' : s.run.cls === 'good' ? 'good' : 'dash', label: c.how === 'querydsl' ? 'fetch (not run)' : 'createQuery' });
    P.note(c.how === 'querydsl' ? 'The Querydsl library was not available in our test runs, so it was not run. The diagram reproduces the behavior that the official documentation describes. A dashed box is a condition that where skipped because it is null.' : c.how === 'criteria' ? 'A dashed box is a condition that was not added to the list because it has no value. JPA creates where and and to match the number of conditions.' : 'A dashed box is a piece that was not attached because there is no value. Pay attention to the fact that even the spaces inside the quotes are attached as they are. Even if some pieces are not attached, the remaining pieces are attached in their own form.');
  },
  assume: 'The 16 combinations of the three string-concatenation methods and the JPA Criteria API method were run on Hibernate 7.4.5 and an H2 database, using code with the same structure as the screen, and the built string, whether it succeeded, the kind of exception, the error position and the failing token, the where of the SQL sent to the DB, and the number of members found were checked against the screen. The 4 Querydsl combinations could not be checked by execution because the Querydsl library was not available in our test runs. That part is an explanation that follows the official Querydsl documentation: the API documentation of FilteredClause.where(Predicate...) ("Adds the given filter conditions. Skips null arguments"), the example of combining several filters with and in the Querying JPA chapter of the reference documentation, and the explanation of BooleanBuilder in the Complex predicates section. The where and the number of members written in the result cells of Querydsl are the values assuming that it works as the documentation says, and they are not execution results. The position of the syntax error and the failing token are based on the message produced by Hibernate 7.4.5, and they may come out differently on other versions or other JPA implementations. The explanation that, for "where and", Hibernate reads and as a name and moves on is an interpretation based on the execution result that the error occurred not at and but at the token after it. The SQL where on the screen has the table aliases removed and is shortened to be easy to read. It was also confirmed by execution that, with the Criteria API, no where clause is created when there are 0 conditions, and that if you give m.get a property name that does not exist, it compiles and an exception (a PathElementException in Hibernate 7.4.5) is thrown while running. In a real service there are many more conditions, and or, like, and sorting are mixed in, so the mistakes of the string method are easier to make than here.',
});
