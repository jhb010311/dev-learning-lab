Lab.register({
  id: 'strbuild', nav: 'String, StringBuilder', cat: '자바 언어', mode: 'step',
  title: '문자열 메서드를 불렀는데 왜 원본이 그대로인가',
  intro: 'String은 한번 만들어지면 내용이 바뀌지 않는 객체입니다. concat, replace, toUpperCase 같은 메서드는 원본을 고치지 않고 새 문자열을 만들어 돌려주므로, 돌려준 값을 받지 않으면 아무 일도 없었던 것처럼 보입니다. 반대로 StringBuilder는 객체 하나의 내용을 직접 고쳐 씁니다. 두 변수가 같은 객체를 가리키는지를 ==로 확인하면서 차이를 살펴봅니다.',
  terms: ['String의 불변성', '불변 객체', 'StringBuilder와 StringBuffer', '동일성과 동등성'],
  controls: [
    { id: 'type', label: '문자열을 담는 타입', type: 'select', value: 'str', options: [['str', 'String'], ['sb', 'StringBuilder']] },
    { id: 'op', label: '하는 일', type: 'select', value: 'drop', options: [['drop', '메서드를 부르고, 돌려준 값을 받지 않음'], ['assign', '돌려준 값을 같은 변수에 다시 넣음'], ['loop', '반복문에서 세 번 이어 붙임']] },
    { id: 'm', label: '부르는 메서드', type: 'select', value: 'upper', options: [['concat', 'concat("!")  뒤에 이어 붙이기'], ['replace', 'replace(\'a\', \'o\')  글자 바꾸기'], ['upper', 'toUpperCase()  대문자로']], show: function (c) { return c.type === 'str' && c.op !== 'loop'; }, hint: 'StringBuilder에서는 append로 이어 붙입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'String s에 toUpperCase() 메서드를 부르고 돌려준 값을 받지 않으면 s는 어떻게 되나', d: 'toUpperCase()를 불렀는데 s를 출력하면 그대로입니다.', v: { type: 'str', op: 'drop', m: 'upper' } },
    { t: '돌려준 값을 받으면', q: '돌려준 값을 같은 변수에 다시 넣으면', d: 's는 새 문자열을 가리키고, 처음 객체는 그대로 남습니다.', v: { type: 'str', op: 'assign', m: 'upper' } },
    { t: 'concat도 마찬가지', q: 'toUpperCase() 대신 concat("!") 메서드를 부르면', d: '이어 붙이는 메서드도 원본을 바꾸지 않습니다.', v: { type: 'str', op: 'drop', m: 'concat' } },
    { t: '반복문에서 +로 이어 붙이기', q: '반복문에서 세 번 이어 붙이면', d: '한 번 돌 때마다 s가 새 객체를 가리킵니다.', v: { type: 'str', op: 'loop', m: 'upper' } },
    { t: 'StringBuilder로 이어 붙이기', q: '문자열을 담는 타입을 StringBuilder로 바꾸고 반복문에서 세 번 이어 붙이면', d: '끝까지 객체 하나를 고쳐 씁니다.', v: { type: 'sb', op: 'loop', m: 'upper' } },
    { t: 'StringBuilder의 append', q: 'String 대신 StringBuilder에 메서드를 부르고 돌려준 값을 받지 않으면', d: '돌려준 값을 받지 않아도 내용이 바뀝니다.', v: { type: 'sb', op: 'drop', m: 'upper' } },
  ],
  // 설정에 해당하는 메서드 호출 글자와 그 결과
  call: function (c) {
    if (c.type === 'sb') return { src: 'sb.append("!")', res: 'java!' };
    return { concat: { src: 's.concat("!")', res: 'java!' }, replace: { src: 's.replace(\'a\', \'o\')', res: 'jovo' }, upper: { src: 's.toUpperCase()', res: 'JAVA' } }[c.m];
  },
  code: function (c) {
    var sb = c.type === 'sb', T = sb ? 'StringBuilder' : 'String', v = sb ? 'sb' : 's', call = this.call(c);
    var head = sb ? 'StringBuilder sb = new StringBuilder("java");\nStringBuilder first = sb;          // 처음 객체를 기억해 둔다\n' : 'String s = "java";\nString first = s;                 // 처음 객체를 기억해 둔다\n';
    var tail = '\nSystem.out.println(' + v + ');\nSystem.out.println(first);\nSystem.out.println(' + v + ' == first);   // 같은 객체인가';
    if (c.op === 'loop') return head + 'int changed = 0;                  // ' + v + '가 다른 객체를 가리키게 된 횟수\n\nfor (int i = 1; i <= 3; i++) {\n    ' + T + ' before = ' + v + ';\n    ' + (sb ? 'sb.append(i);' : 's = s + i;') + '\n    if (' + v + ' != before) changed++;\n}\n' + tail + '\nSystem.out.println(changed);';
    return head + '\n' + (c.op === 'drop' ? call.src + ';                 // 돌려준 값을 받지 않는다' : v + ' = ' + call.src + ';             // 돌려준 값을 ' + v + '에 다시 넣는다') + '\n' + tail;
  },
  label: function (c) {
    var call = this.call(c);
    return (c.type === 'sb' ? 'StringBuilder' : 'String') + ' · ' + (c.op === 'loop' ? '반복문에서 세 번 이어 붙임' : c.op === 'drop' ? call.src + ' 결과를 받지 않음' : call.src + ' 결과를 다시 넣음');
  },
  columns: ['변수가 가리키는 내용', '처음 객체의 내용', '처음 객체와 같은가', '반복하며 객체가 바뀐 횟수'],
  simulate: function (c) {
    var sb = c.type === 'sb', v = sb ? 'sb' : 's', call = this.call(c), ev = [], sum = [];
    var st = { objs: [], s: 0, f: 0, out: [], ch: -1, eq: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function cur() { return st.objs[st.s - 1]; }
    st.objs.push('java'); st.s = 1;
    push(sb ? 'StringBuilder sb = new StringBuilder("java"): 내용이 "java"인 StringBuilder 객체를 만들고, 변수 sb가 그 객체를 가리킵니다.' : 'String s = "java": 내용이 "java"인 문자열 객체가 있고, 변수 s가 그 객체를 가리킵니다.');
    st.f = 1;
    push((sb ? 'StringBuilder' : 'String') + ' first = ' + v + ': first에 ' + v + '가 가리키는 곳을 그대로 넣습니다. 내용을 복사한 것이 아니라 두 변수가 같은 객체를 가리키게 된 것입니다. 처음 객체가 나중에 바뀌는지 보려고 둡니다.');
    if (c.op === 'loop') {
      st.ch = 0;
      push('int changed = 0: 반복하는 동안 ' + v + '가 다른 객체를 가리키게 된 횟수를 셀 변수입니다.');
      for (var i = 1; i <= 3; i++) {
        var prev = cur();
        if (sb) {
          st.objs[0] = prev + i;
          push('i = ' + i + ', sb.append(i): 새 객체를 만들지 않고, 같은 StringBuilder 객체의 내용을 고칩니다. 이제 내용은 "' + st.objs[0] + '"입니다. sb는 계속 같은 객체를 가리키므로 changed는 0 그대로입니다.', 'good');
        } else {
          st.objs.push(prev + i); st.s = st.objs.length; st.ch++;
          push('i = ' + i + ', s = s + i: s + i는 원래 문자열을 고치지 않고 새 문자열 "' + cur() + '" 객체를 만들어 냅니다. s가 그 새 객체를 가리키게 되고, 직전에 가리키던 객체와 다르므로 changed가 하나 늘어 ' + st.ch + '입니다. 직전의 "' + prev + '" 객체는 ' + (i > 1 ? '이제 어느 변수도 가리키지 않습니다.' : 'first가 계속 가리키고 있습니다.'), 'bad');
        }
      }
    } else if (sb) {
      st.objs[0] = 'java!';
      push((c.op === 'assign' ? 'sb = sb.append("!")' : 'sb.append("!")') + ': 새 객체를 만들지 않고, sb가 가리키는 바로 그 객체의 내용을 고칩니다. 이제 내용은 "java!"입니다. append가 돌려주는 것은 그 객체 자신입니다. ' + (c.op === 'assign' ? '그것을 sb에 다시 넣어도 sb는 같은 객체를 가리킵니다.' : '그래서 돌려준 값을 받지 않아도 됩니다.'), 'good');
    } else {
      st.objs.push(call.res);
      if (c.op === 'assign') {
        st.s = 2;
        push('s = ' + call.src + ': 원래 객체 "java"는 그대로 두고, 새 문자열 "' + call.res + '" 객체를 만들어 돌려줍니다. 돌려준 것을 s에 다시 넣었으므로 s는 이제 새 객체를 가리킵니다.', 'good');
      } else push(call.src + ': 원래 객체 "java"는 그대로 두고, 새 문자열 "' + call.res + '" 객체를 만들어 돌려줍니다. 그런데 돌려준 것을 받는 변수가 없습니다. 새 문자열은 어느 변수에도 남지 않습니다.', 'bad');
    }
    var same = st.s === st.f;
    st.out.push(cur());
    push('System.out.println(' + v + '): ' + v + '가 가리키는 객체의 내용인 ' + cur() + ' 한 줄이 출력됩니다.' + (!sb && c.op === 'drop' ? ' 메서드를 불렀지만 s는 처음 객체를 그대로 가리키고 있어 아무 일도 없었던 것처럼 보입니다.' : ''), !sb && c.op === 'drop' ? 'bad' : '');
    st.out.push(st.objs[0]);
    push('System.out.println(first): first가 가리키는 처음 객체의 내용인 ' + st.objs[0] + ' 한 줄이 출력됩니다. ' + (sb ? 'first를 통해서 고친 적은 없지만, 같은 객체를 가리키므로 바뀐 내용이 보입니다.' : '처음 객체의 내용은 바뀌지 않았습니다.'));
    st.eq = String(same); st.out.push(String(same));
    push(v + ' == first: ' + (same ? '두 변수가 같은 객체를 가리키므로 true입니다.' : v + '는 새로 만들어진 객체를, first는 처음 객체를 가리키므로 false입니다.'));
    if (c.op === 'loop') { st.out.push(String(st.ch)); push('System.out.println(changed): ' + st.ch + '이 출력됩니다. ' + (sb ? '세 번 도는 동안 sb가 가리키는 객체는 한 번도 바뀌지 않았습니다.' : '세 번 돌 때마다 s가 새 객체를 가리키게 되었습니다.'), sb ? 'good' : 'bad'); }
    var last = cur();
    if (c.op === 'loop' && !sb) {
      sum.push('String은 내용을 고칠 수 없으므로, +로 이어 붙일 때마다 새 문자열 객체가 만들어지고 s가 그쪽으로 옮겨 갑니다. 중간에 만들어진 "java1", "java12"는 쓰이지 않고 버려집니다.');
      sum.push('반복해서 이어 붙일 때는 StringBuilder를 씁니다.');
    } else if (c.op === 'loop') {
      sum.push('StringBuilder는 객체 하나의 내용을 계속 고쳐 쓰므로, 이어 붙일 때마다 새 문자열 객체를 만들지 않아도 됩니다. 완성된 문자열은 sb.toString()으로 얻습니다.');
      sum.push('first도 같은 객체를 가리키므로 java123이 보입니다. 내용이 바뀌는 객체를 여러 곳에서 함께 가리킬 때는 한쪽의 변경이 다른 쪽에도 보인다는 점을 기억해야 합니다.');
    } else if (sb) {
      sum.push(c.op === 'assign' ? 'append는 내용을 고친 뒤 자기 자신을 돌려줍니다. 그래서 다시 넣어도 같은 객체이고, sb.append("a").append("b")처럼 이어서 부를 수도 있습니다.' : 'StringBuilder는 내용을 바꿀 수 있는 객체입니다. append가 객체 자신을 고치므로, 돌려준 값을 받지 않아도 결과가 남습니다.');
    } else if (c.op === 'drop') {
      sum.push('String의 메서드는 원본을 고치지 않고 새 문자열을 돌려줍니다. 돌려준 값을 받지 않으면 결과가 버려집니다. 컴파일 오류도 예외도 나지 않아서 알아채기 어려운 실수입니다.');
      sum.push('결과를 쓰려면 s = ' + call.src + '처럼 돌려준 값을 변수에 받아야 합니다.');
    } else {
      sum.push('바뀐 것은 문자열 객체의 내용이 아니라 s가 가리키는 곳입니다. 처음 객체는 first로 보면 그대로 남아 있습니다.');
      sum.push('String의 내용이 바뀌지 않기 때문에, 같은 문자열을 여러 변수가 함께 가리켜도 한쪽에서 내용을 바꿔 버릴 걱정이 없습니다.');
    }
    return { events: ev, summary: sum, row: [last, st.objs[0], same ? '같은 객체' : '다른 객체', c.op === 'loop' ? st.ch + '번' : '(반복 없음)'] };
  },
  // 객체마다 그것을 가리키는 변수 이름을 모은다
  refs: function (s, v) { return s.objs.map(function (o, i) { var by = []; if (s.s === i + 1) by.push(v); if (s.f === i + 1) by.push('first'); return by; }); },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, sb = c.type === 'sb', name = sb ? 'sb' : 's';
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    var by = this.refs(s, name);
    H.table(v, ['객체', '종류', '내용', '가리키는 변수'], s.objs.map(function (o, i) { return { cls: by[i].length ? '' : 'gone', cells: ['객체 ' + (i + 1), sb ? 'StringBuilder' : 'String', '"' + o + '"', { v: by[i].length ? by[i].join(', ') : '없음', cls: by[i].length > 1 ? 'good' : '' }] }; }), '메모리의 객체');
  },
  // 그림: 왼쪽에 변수, 오른쪽에 객체. 변수에서 객체로 화살표가 가고, 가리키는 변수가 없는 객체는 점선으로 그린다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { objs: [], s: 0, f: 0, out: [], ch: -1, eq: '?' }, sb = c.type === 'sb', name = sb ? 'sb' : 's', by = this.refs(s, name);
    P.size(680, 292);
    P.region('V', 16, 16, 200, 212, '변수');
    P.region('O', 280, 16, 384, 212, '객체');
    P.box('v_s', 30, 56, 172, 34, s.s ? { cls: 'wait', title: name, right: '참조' } : { cls: 'ghost', title: name, right: '아직 없음' });
    P.box('v_first', 30, 104, 172, 34, s.f ? { cls: 'wait', title: 'first', right: '참조' } : { cls: 'ghost', title: 'first', right: '아직 없음' });
    if (s.ch >= 0) P.box('v_ch', 30, 152, 172, 34, { cls: s.ch ? 'bad' : 'plain', title: 'changed', right: String(s.ch) });
    s.objs.forEach(function (o, i) {
      P.box('o' + (i + 1), 296, 50 + i * 42, 352, 34, { cls: by[i].length ? (by[i].length > 1 ? 'good' : 'hot') : 'ghost', title: (sb ? 'StringBuilder' : 'String') + ' 객체 "' + o + '"', right: by[i].length ? '' : '가리키는 변수 없음' });
    });
    if (s.s) P.arrow('ar_s', 'v_s:r', 'o' + s.s + ':l' + (s.s === s.f ? ':0.3' : ''), { cls: s.s === s.f ? 'good' : 'hot' });
    if (s.f) P.arrow('ar_f', 'v_first:r', 'o' + s.f + ':l' + (s.s === s.f ? ':0.7' : ''), { cls: s.s === s.f ? 'good' : '' });
    P.box('r1', 16, 242, 250, 34, { cls: s.eq === '?' ? 'ghost' : 'plain', title: name + ' == first', right: s.eq });
    P.box('r2', 274, 242, 390, 34, { cls: s.out.length ? 'plain' : 'ghost', title: '출력', right: s.out.length ? s.out.join(' / ') : '아직 없음' });
    P.note(sb ? 'StringBuilder는 객체 하나의 내용을 고쳐 씁니다. 그래서 같은 객체를 가리키는 모든 변수에 바뀐 내용이 보입니다.' : '점선은 어느 변수도 가리키지 않는 객체입니다.');
  },
  assume: '열여덟 가지 조합(숨겨진 설정을 빼면 서로 다른 경우는 열 가지)의 출력을 검증 환경의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. "새 객체가 만들어졌다"는 것은 == 비교로 직전 객체와 다른 객체임을 확인한 것입니다. 실행 중에 실제로 몇 개의 객체가 메모리에 만들어지는지는 JVM의 최적화에 따라 달라질 수 있어 단정하지 않았습니다. 여기서 고른 메서드와 값은 모두 내용이 달라지는 경우입니다. 내용이 달라지지 않는 호출(예: 바꿀 글자가 없는 replace)에서는 String이 새 객체를 만들지 않고 자기 자신을 돌려주기도 합니다. StringBuilder가 안에서 글자를 담는 공간을 어떻게 늘리는지는 이 모형에서 다루지 않습니다.',
});
