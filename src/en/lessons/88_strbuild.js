Lab.register({
  id: 'strbuild', nav: 'String, StringBuilder', cat: 'Java language', mode: 'step',
  title: 'Why is the original unchanged after you call a string method?',
  intro: 'A String is an object whose contents do not change once it has been created. Methods such as concat, replace, and toUpperCase do not modify the original. They create a new string and return it, so if you ignore the return value, it looks as if nothing happened. A StringBuilder, in contrast, modifies the contents of a single object directly. Look at the difference while using == to check whether two variables refer to the same object.',
  terms: ['String immutability', 'Immutable object', 'StringBuilder and StringBuffer', 'Identity and equality'],
  controls: [
    { id: 'type', label: 'Type that holds the string', type: 'select', value: 'str', options: [['str', 'String'], ['sb', 'StringBuilder']] },
    { id: 'op', label: 'What the code does', type: 'select', value: 'drop', options: [['drop', 'Calls a method and ignores the return value'], ['assign', 'Assigns the return value back to the same variable'], ['loop', 'Concatenates three times in a loop']] },
    { id: 'm', label: 'Method to call', type: 'select', value: 'upper', options: [['concat', 'concat("!")  concatenate to the end'], ['replace', 'replace(\'a\', \'o\')  replace a character'], ['upper', 'toUpperCase()  convert to upper case']], show: function (c) { return c.type === 'str' && c.op !== 'loop'; }, hint: 'With a StringBuilder, you add to the end with append.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens to the String s when you call toUpperCase() and do not use the returned value?', d: 'toUpperCase() is called, but printing s shows that it is unchanged.', v: { type: 'str', op: 'drop', m: 'upper' } },
    { t: 'Assigning the return value', q: 'What if the code assigns the return value back to the same variable?', d: 's refers to the new string, and the first object stays as it was.', v: { type: 'str', op: 'assign', m: 'upper' } },
    { t: 'concat works the same way', q: 'What if you call concat("!") instead?', d: 'A method that concatenates does not change the original either.', v: { type: 'str', op: 'drop', m: 'concat' } },
    { t: 'Concatenating with + in a loop', q: 'What if the code concatenates three times in a loop?', d: 'On every iteration, s refers to a new object.', v: { type: 'str', op: 'loop', m: 'upper' } },
    { t: 'Appending with a StringBuilder', q: 'What if you change the type to StringBuilder and concatenate three times in a loop?', d: 'A single object is modified from start to finish.', v: { type: 'sb', op: 'loop', m: 'upper' } },
    { t: 'append of StringBuilder', q: 'What if you change the type to StringBuilder and call a method without using the returned value?', d: 'The contents change even if you ignore the return value.', v: { type: 'sb', op: 'drop', m: 'upper' } },
  ],
  // The text of the method call that matches the settings, and its result
  call: function (c) {
    if (c.type === 'sb') return { src: 'sb.append("!")', res: 'java!' };
    return { concat: { src: 's.concat("!")', res: 'java!' }, replace: { src: 's.replace(\'a\', \'o\')', res: 'jovo' }, upper: { src: 's.toUpperCase()', res: 'JAVA' } }[c.m];
  },
  code: function (c) {
    var sb = c.type === 'sb', T = sb ? 'StringBuilder' : 'String', v = sb ? 'sb' : 's', call = this.call(c);
    var head = sb ? 'StringBuilder sb = new StringBuilder("java");\nStringBuilder first = sb;          // remember the first object\n' : 'String s = "java";\nString first = s;                 // remember the first object\n';
    var tail = '\nSystem.out.println(' + v + ');\nSystem.out.println(first);\nSystem.out.println(' + v + ' == first);   // same object?';
    if (c.op === 'loop') return head + 'int changed = 0;                  // how many times ' + v + ' came to refer to a different object\n\nfor (int i = 1; i <= 3; i++) {\n    ' + T + ' before = ' + v + ';\n    ' + (sb ? 'sb.append(i);' : 's = s + i;') + '\n    if (' + v + ' != before) changed++;\n}\n' + tail + '\nSystem.out.println(changed);';
    return head + '\n' + (c.op === 'drop' ? call.src + ';                 // the return value is ignored' : v + ' = ' + call.src + ';             // stores the return value in ' + v + ' again') + '\n' + tail;
  },
  label: function (c) {
    var call = this.call(c);
    return (c.type === 'sb' ? 'StringBuilder' : 'String') + ' · ' + (c.op === 'loop' ? 'three concatenations in a loop' : c.op === 'drop' ? call.src + ', return value ignored' : call.src + ', return value assigned back');
  },
  columns: ['Contents the variable refers to', 'Contents of the first object', 'Same as the first object?', 'Times the object changed in the loop'],
  simulate: function (c) {
    var sb = c.type === 'sb', v = sb ? 'sb' : 's', call = this.call(c), ev = [], sum = [];
    var st = { objs: [], s: 0, f: 0, out: [], ch: -1, eq: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function cur() { return st.objs[st.s - 1]; }
    st.objs.push('java'); st.s = 1;
    push(sb ? 'StringBuilder sb = new StringBuilder("java"): A StringBuilder object with the contents "java" is created, and the variable sb refers to that object.' : 'String s = "java": There is a string object with the contents "java", and the variable s refers to that object.');
    st.f = 1;
    push((sb ? 'StringBuilder' : 'String') + ' first = ' + v + ': first is given the same reference that ' + v + ' holds. The contents are not copied. Instead, the two variables now refer to the same object. first is kept so that you can see later whether the first object changes.');
    if (c.op === 'loop') {
      st.ch = 0;
      push('int changed = 0: This variable counts how many times ' + v + ' comes to refer to a different object during the loop.');
      for (var i = 1; i <= 3; i++) {
        var prev = cur();
        if (sb) {
          st.objs[0] = prev + i;
          push('i = ' + i + ', sb.append(i): No new object is created. The contents of the same StringBuilder object are modified. The contents are now "' + st.objs[0] + '". sb still refers to the same object, so changed stays 0.', 'good');
        } else {
          st.objs.push(prev + i); st.s = st.objs.length; st.ch++;
          push('i = ' + i + ', s = s + i: s + i does not modify the original string. It creates a new string object, "' + cur() + '". s now refers to that new object, which is different from the object it referred to just before, so changed goes up by one to ' + st.ch + '. The previous object, "' + prev + '", ' + (i > 1 ? 'is no longer referred to by any variable.' : 'is still referred to by first.'), 'bad');
        }
      }
    } else if (sb) {
      st.objs[0] = 'java!';
      push((c.op === 'assign' ? 'sb = sb.append("!")' : 'sb.append("!")') + ': No new object is created. The contents of the very object that sb refers to are modified. The contents are now "java!". What append returns is a reference to that same object. ' + (c.op === 'assign' ? 'Assigning it back to sb leaves sb referring to the same object.' : 'So you do not have to use the return value.'), 'good');
    } else {
      st.objs.push(call.res);
      if (c.op === 'assign') {
        st.s = 2;
        push('s = ' + call.src + ': The original object "java" is left as it is, and a new string object "' + call.res + '" is created and returned. The return value is assigned back to s, so s now refers to the new object.', 'good');
      } else push(call.src + ': The original object "java" is left as it is, and a new string object "' + call.res + '" is created and returned. But there is no variable to receive the return value. The new string is not kept in any variable.', 'bad');
    }
    var same = st.s === st.f;
    st.out.push(cur());
    push('System.out.println(' + v + '): The contents of the object that ' + v + ' refers to are printed as one line: ' + cur() + '.' + (!sb && c.op === 'drop' ? ' A method was called, but s still refers to the first object, so it looks as if nothing happened.' : ''), !sb && c.op === 'drop' ? 'bad' : '');
    st.out.push(st.objs[0]);
    push('System.out.println(first): The contents of the first object, which first refers to, are printed as one line: ' + st.objs[0] + '. ' + (sb ? 'Nothing was modified through first, but first refers to the same object, so the changed contents are visible.' : 'The contents of the first object did not change.'));
    st.eq = String(same); st.out.push(String(same));
    push(v + ' == first: ' + (same ? 'The two variables refer to the same object, so the result is true.' : v + ' refers to the newly created object and first refers to the first object, so the result is false.'));
    if (c.op === 'loop') { st.out.push(String(st.ch)); push('System.out.println(changed): This prints ' + st.ch + '. ' + (sb ? 'Over the three iterations, the object that sb refers to never changed.' : 'On each of the three iterations, s came to refer to a new object.'), sb ? 'good' : 'bad'); }
    var last = cur();
    if (c.op === 'loop' && !sb) {
      sum.push('The contents of a String cannot be modified, so every concatenation with + creates a new string object, and s moves over to it. The strings "java1" and "java12", which were created along the way, are not used and are discarded.');
      sum.push('For repeated concatenation, use a StringBuilder.');
    } else if (c.op === 'loop') {
      sum.push('A StringBuilder keeps modifying the contents of one object, so it does not have to create a new string object every time something is appended. You get the finished string with sb.toString().');
      sum.push('first refers to the same object, so it shows java123 as well. When several places refer to an object whose contents can change, remember that a change made through one of them is visible through the others too.');
    } else if (sb) {
      sum.push(c.op === 'assign' ? 'append modifies the contents and then returns the object itself. So assigning the return value back gives the same object, and you can also chain the calls, as in sb.append("a").append("b").' : 'A StringBuilder is an object whose contents can be changed. append modifies the object itself, so the result remains even if you ignore the return value.');
    } else if (c.op === 'drop') {
      sum.push('The methods of String do not modify the original. They return a new string. If you ignore the return value, the result is thrown away. There is no compile-time error and no exception, so this mistake is hard to notice.');
      sum.push('To use the result, you must assign the return value to a variable, as in s = ' + call.src + '.');
    } else {
      sum.push('What changed is not the contents of the string object but what s refers to. Seen through first, the first object is still there as it was.');
      sum.push('Because the contents of a String do not change, several variables can refer to the same string without any worry that one of them will change the contents.');
    }
    return { events: ev, summary: sum, row: [last, st.objs[0], same ? 'Same object' : 'Different object', c.op === 'loop' ? st.ch + '' : '(no loop)'] };
  },
  // For each object, collect the names of the variables that refer to it
  refs: function (s, v) { return s.objs.map(function (o, i) { var by = []; if (s.s === i + 1) by.push(v); if (s.f === i + 1) by.push('first'); return by; }); },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, sb = c.type === 'sb', name = sb ? 'sb' : 's';
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var by = this.refs(s, name);
    H.table(v, ['Object', 'Type', 'Contents', 'Referenced by'], s.objs.map(function (o, i) { return { cls: by[i].length ? '' : 'gone', cells: ['Object ' + (i + 1), sb ? 'StringBuilder' : 'String', '"' + o + '"', { v: by[i].length ? by[i].join(', ') : 'none', cls: by[i].length > 1 ? 'good' : '' }] }; }), 'Objects in memory');
  },
  // Diagram: variables on the left, objects on the right. Arrows go from the variables to the objects, and an object that no variable refers to is drawn with a dashed line.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { objs: [], s: 0, f: 0, out: [], ch: -1, eq: '?' }, sb = c.type === 'sb', name = sb ? 'sb' : 's', by = this.refs(s, name);
    P.size(680, 292);
    P.region('V', 16, 16, 200, 212, 'Variables');
    P.region('O', 280, 16, 384, 212, 'Objects');
    P.box('v_s', 30, 56, 172, 34, s.s ? { cls: 'wait', title: name, right: 'reference' } : { cls: 'ghost', title: name, right: 'not declared' });
    P.box('v_first', 30, 104, 172, 34, s.f ? { cls: 'wait', title: 'first', right: 'reference' } : { cls: 'ghost', title: 'first', right: 'not declared' });
    if (s.ch >= 0) P.box('v_ch', 30, 152, 172, 34, { cls: s.ch ? 'bad' : 'plain', title: 'changed', right: String(s.ch) });
    s.objs.forEach(function (o, i) {
      P.box('o' + (i + 1), 296, 50 + i * 42, 352, 34, { cls: by[i].length ? (by[i].length > 1 ? 'good' : 'hot') : 'ghost', title: (sb ? 'StringBuilder' : 'String') + ' object "' + o + '"', right: by[i].length ? '' : 'no references' });
    });
    if (s.s) P.arrow('ar_s', 'v_s:r', 'o' + s.s + ':l' + (s.s === s.f ? ':0.3' : ''), { cls: s.s === s.f ? 'good' : 'hot' });
    if (s.f) P.arrow('ar_f', 'v_first:r', 'o' + s.f + ':l' + (s.s === s.f ? ':0.7' : ''), { cls: s.s === s.f ? 'good' : '' });
    P.box('r1', 16, 242, 250, 34, { cls: s.eq === '?' ? 'ghost' : 'plain', title: name + ' == first', right: s.eq });
    P.box('r2', 274, 242, 390, 34, { cls: s.out.length ? 'plain' : 'ghost', title: 'Output', right: s.out.length ? s.out.join(' / ') : 'none yet' });
    P.note(sb ? 'A StringBuilder modifies the contents of a single object. So the changed contents are visible through every variable that refers to the same object.' : 'A dashed outline marks an object that no variable refers to.');
  },
  assume: 'The output of the 18 combinations (10 distinct cases when the hidden setting is left out) was checked against the results of running the same code on JDK 21 on this PC. Saying that "a new object was created" means that a == comparison confirmed that the object is different from the previous one. How many objects are actually created in memory at run time can vary with the optimizations of the JVM, so no claim is made about it. The methods and values chosen here are all cases in which the contents change. For a call that does not change the contents (for example, replace when there is no character to replace), String sometimes returns itself without creating a new object. How a StringBuilder grows the internal space that holds its characters is not covered by this model.',
});
