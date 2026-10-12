Lab.register({
  id: 'eq', nav: '==와 equals', cat: '자바 언어', mode: 'step',
  title: '같은 값인데 ==는 왜 false가 나오나',
  intro: '==는 두 변수가 같은 객체를 가리키는지를, equals는 내용이 같은지를 비교합니다. 문자열과 Integer는 만드는 방법에 따라 같은 객체를 재사용하기도 하고 새로 만들기도 해서, 값이 같아도 ==의 결과가 달라집니다.',
  terms: ['동일성과 동등성', 'String Pool(문자열 상수 풀)', '박싱과 언박싱', '불변 객체'], ranks: ['string', 'equals'],
  controls: [
    { id: 'kind', label: '비교할 타입', type: 'select', value: 'str', options: [['str', 'String'], ['int', 'Integer']] },
    { id: 'sb', label: '두 번째 문자열을 만드는 방법', type: 'select', value: 'new', options: [['lit', '리터럴 "hello"'], ['new', 'new String("hello")'], ['intern', 'new String("hello").intern()'], ['const', '리터럴끼리 결합 "hel" + "lo"'], ['concat', '변수와 결합 part + "lo"']], show: function (c) { return c.kind === 'str'; } },
    { id: 'iv', label: '값', type: 'select', value: '127', options: [['127', '127'], ['128', '128']], show: function (c) { return c.kind === 'int'; } },
    { id: 'ib', label: '두 번째 변수의 타입', type: 'select', value: 'box', options: [['box', 'Integer (객체)'], ['prim', 'int (기본형)']], show: function (c) { return c.kind === 'int'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '두 번째 String을 new String("hello") 방식으로 만들어 ==와 equals로 비교하면 어떻게 나오나', d: '리터럴과 new String. 내용은 같지만 ==는 false입니다.', v: { kind: 'str', sb: 'new', iv: '127', ib: 'box' } },
    { t: '리터럴끼리', q: '두 번째 문자열을 new String 대신 리터럴 hello로 바꾸면', d: '같은 리터럴은 String Pool의 같은 객체를 씁니다.', v: { kind: 'str', sb: 'lit', iv: '127', ib: 'box' } },
    { t: '변수와 결합한 문자열', q: '두 번째 문자열을 part + "lo"처럼 변수와 결합해 만들면', d: '실행 중에 만들어진 문자열은 풀에 있는 것과 다른 객체입니다.', v: { kind: 'str', sb: 'concat', iv: '127', ib: 'box' } },
    { t: 'intern()을 부르면', q: '두 번째 문자열을 만들 때 new String("hello") 방식에 intern 메서드 호출을 덧붙이면', d: '풀에 있는 객체를 돌려받아 ==가 true가 됩니다.', v: { kind: 'str', sb: 'intern', iv: '127', ib: 'box' } },
    { t: 'Integer 127', q: '비교할 타입을 Integer로 바꿔 127을 비교하면', d: '==가 true입니다.', v: { kind: 'int', sb: 'new', iv: '127', ib: 'box' } },
    { t: 'Integer 128', q: '비교할 타입을 Integer로, 값을 128로 바꾸면', d: '값만 1 늘렸는데 ==가 false가 됩니다.', v: { kind: 'int', sb: 'new', iv: '128', ib: 'box' } },
    { t: 'Integer와 int 비교', q: 'Integer 128인데 두 번째 변수의 타입을 int로 바꾸면', d: '한쪽이 기본형이면 값으로 비교합니다.', v: { kind: 'int', sb: 'new', iv: '128', ib: 'prim' } },
  ],
  code: function (c) {
    if (c.kind === 'str') {
      var b = { lit: 'String b = "hello";', new: 'String b = new String("hello");', intern: 'String b = new String("hello").intern();', const: 'String b = "hel" + "lo";            // 컴파일할 때 "hello"로 합쳐짐', concat: 'String part = "hel";\nString b = part + "lo";             // 실행 중에 결합' }[c.sb];
      return 'String a = "hello";\n' + b + '\n\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));';
    }
    return 'Integer a = ' + c.iv + ';                 // Integer.valueOf(' + c.iv + ')\n' + (c.ib === 'box' ? 'Integer b = ' + c.iv + ';' : 'int b = ' + c.iv + ';') + '\n\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));';
  },
  label: function (c) { return c.kind === 'str' ? 'String · "hello"와 ' + { lit: '"hello"', new: 'new String', intern: 'intern()', const: '"hel" + "lo"', concat: 'part + "lo"' }[c.sb] : 'Integer ' + c.iv + '과 ' + (c.ib === 'box' ? 'Integer ' : 'int ') + c.iv; },
  columns: ['a == b', 'a.equals(b)', '같은 객체인가'],
  same: function (c) { return c.kind === 'str' ? (c.sb === 'lit' || c.sb === 'intern' || c.sb === 'const') : (c.ib === 'prim' || c.iv === '127'); },
  simulate: function (c) {
    var ev = [], same = this.same(c), sum = [], objs = [], A, B; var J = function (v, a, b) { var s = String(v), ch = s.charCodeAt(s.length - 1), k = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : [1, 8, 0, 1, 0, 0, 1, 8, 8, 0]['0123456789'.indexOf(s.slice(-1))] || 0; return s + (a === '으로' ? (k && k !== 8 ? a : b) : k ? a : b); };   // 값 뒤에 붙일 조사를 고른다
    function push(s, k, cmp) { ev.push({ s: s, k: k, snap: { objs: objs.map(function (o) { return { id: o.id, where: o.where, val: o.val, by: o.by.slice() }; }), a: A, b: B, cmp: cmp || {} } }); }
    function obj(where, val) { var o = { id: objs.length + 1, where: where, val: val, by: [] }; objs.push(o); return o; }
    if (c.kind === 'str') {
      var pool = obj('String Pool', '"hello"'); pool.by.push('a'); A = '객체 ' + pool.id;
      push('String a = "hello": 문자열 리터럴은 String Pool에 하나만 만들어 둡니다. a는 풀에 있는 "hello" 객체를 가리킵니다.', '');
      if (c.sb === 'lit') { pool.by.push('b'); B = A; push('String b = "hello": 같은 내용의 리터럴이 풀에 이미 있습니다. 새로 만들지 않고 그 객체를 다시 씁니다. a와 b가 같은 객체를 가리킵니다.', ''); }
      if (c.sb === 'const') { pool.by.push('b'); B = A; push('String b = "hel" + "lo": 리터럴끼리의 결합은 컴파일러가 미리 계산해서 "hello" 리터럴로 바꿔 놓습니다. 그래서 풀의 같은 객체를 가리킵니다.', ''); }
      if (c.sb === 'new') { var n1 = obj('힙 (풀 바깥)', '"hello"'); n1.by.push('b'); B = '객체 ' + n1.id; push('String b = new String("hello"): new는 무조건 새 객체를 만듭니다. 풀의 "hello"와 내용은 같지만 힙의 다른 자리에 있는 별개의 객체입니다.', ''); }
      if (c.sb === 'concat') { var p = obj('String Pool', '"hel"'); p.by.push('part'); var n2 = obj('힙 (풀 바깥)', '"hello"'); n2.by.push('b'); B = '객체 ' + n2.id; push('String b = part + "lo": 변수가 섞인 결합은 컴파일러가 미리 계산할 수 없습니다. 실행 중에 새 문자열 객체를 만들고, 이 객체는 풀에 들어가지 않습니다.', ''); }
      if (c.sb === 'intern') { var n3 = obj('힙 (풀 바깥)', '"hello"'); push('new String("hello"): 먼저 힙에 새 객체가 만들어집니다.', ''); pool.by.push('b'); B = A; push('.intern(): 같은 내용의 문자열이 풀에 있으면 풀의 객체를 돌려줍니다. b는 방금 만든 객체가 아니라 풀의 객체를 가리키게 됩니다. new로 만든 객체는 가리키는 곳이 없어 버려집니다.', ''); }
    } else {
      var cached = c.iv === '127', ia = obj(cached ? 'Integer 캐시 (-128 ~ 127)' : '힙', c.iv); ia.by.push('a'); A = '객체 ' + ia.id;
      push('Integer a = ' + c.iv + ': 기본형 값이 Integer.valueOf(' + c.iv + ')로 자동 변환됩니다(오토박싱). ' + (cached ? '-128부터 127까지는 미리 만들어 둔 객체를 돌려줍니다.' : '128은 캐시 범위 밖이라 새 Integer 객체를 만듭니다.'), '');
      if (c.ib === 'prim') { B = '기본형 값 ' + c.iv; push('int b = ' + c.iv + ': 기본형 변수는 객체를 가리키지 않고 값 자체를 담습니다.', ''); }
      else if (cached) { ia.by.push('b'); B = A; push('Integer b = 127: 다시 Integer.valueOf(127)이 호출되고, 캐시에 있는 같은 객체를 돌려줍니다. a와 b가 같은 객체를 가리킵니다.', ''); }
      else { var ib = obj('힙', c.iv); ib.by.push('b'); B = '객체 ' + ib.id; push('Integer b = 128: 캐시 범위 밖이므로 또 다른 Integer 객체를 새로 만듭니다. 값은 같지만 a와는 다른 객체입니다.', ''); }
    }
    var prim = c.kind === 'int' && c.ib === 'prim';
    push(prim ? 'a == b: 한쪽이 기본형 int이므로 Integer인 a에서 값을 꺼내(언박싱) 숫자끼리 비교합니다. ' + c.iv + ' == ' + c.iv + '이므로 true입니다.' : 'a == b: 두 변수가 가리키는 대상이 같은지 비교합니다. a는 ' + A + ', b는 ' + J(B, '을', '를') + ' 가리키므로 ' + same + '입니다.', same ? 'good' : 'bad', { eq: String(same) });
    push('a.equals(b): 객체 안의 값을 비교합니다. 내용이 같으므로 true입니다.', 'good', { eq: String(same), equals: 'true' });
    if (c.kind === 'str') { sum.push(same ? '두 변수가 String Pool의 같은 객체를 가리켜서 ==도 true가 나왔습니다. 하지만 이것은 만드는 방법에 따라 달라지는 우연에 가깝습니다.' : '내용은 같지만 서로 다른 객체라서 ==는 false입니다.'); sum.push('문자열 내용을 비교할 때는 항상 equals를 씁니다. DB나 요청에서 읽어 온 문자열은 리터럴이 아니므로 ==로 비교하면 대부분 false가 됩니다.'); }
    else { sum.push(prim ? 'Integer와 int를 ==로 비교하면 언박싱되어 값 비교가 됩니다. 단, Integer가 null이면 언박싱하다가 NullPointerException이 납니다.' : c.iv === '127' ? 'Integer.valueOf는 -128부터 127까지의 객체를 캐시해 두고 재사용합니다. 그래서 이 범위에서는 ==가 true로 나옵니다.' : '128은 캐시 범위를 벗어나 매번 새 객체가 만들어집니다. 테스트에서는 작은 수만 써서 통과하다가, 운영에서 ID가 커지면 비교가 틀어지는 버그의 원인입니다.'); sum.push('래퍼 타입(Integer, Long)끼리의 값 비교는 equals로 합니다.'); }
    return { events: ev, summary: sum, row: [String(same), 'true', prim ? '(기본형과 비교)' : same ? '같은 객체' : '다른 객체'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    H.table(v, ['객체', '위치', '값', '가리키는 변수'], s.objs.map(function (o) { return { cls: o.by.length ? '' : 'gone', cells: ['객체 ' + o.id, o.where, o.val, { v: o.by.length ? o.by.join(', ') : '없음 (버려짐)', cls: o.by.length > 1 ? 'good' : '' }] }; }), '메모리의 객체');
  },
  // 그림: 왼쪽에 변수, 오른쪽 위아래에 객체가 놓이는 두 곳. 변수에서 객체로 화살표가 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { objs: [], cmp: {} }, str = c.kind === 'str';
    P.size(680, 290);
    P.region('st', 16, 16, 220, 200, '스택 (변수)');
    P.region('r1', 300, 16, 364, 94, str ? 'String Pool (리터럴을 모아 두는 곳)' : 'Integer 캐시 (-128 ~ 127)');
    P.region('r2', 300, 122, 364, 94, str ? '힙 (풀 바깥)' : '힙 (캐시 밖)');
    var vars = [['a', s.a], ['b', s.b]]; if (s.objs.some(function (o) { return o.by.indexOf('part') >= 0; })) vars.push(['part', '객체']);
    vars.forEach(function (v, i) { P.box('v_' + v[0], 30, 52 + i * 48, 192, 34, v[1] ? { cls: 'wait', title: v[0], right: v[1].indexOf('기본형') === 0 ? 'int 값 ' + c.iv : '참조' } : { cls: 'ghost', title: v[0], right: '아직 없음' }); });
    var n1 = 0, n2 = 0;
    s.objs.forEach(function (o) {
      var up = o.where === 'String Pool' || o.where.indexOf('Integer 캐시') === 0, k = up ? n1++ : n2++;
      P.box('o' + o.id, 316 + k * 174, (up ? 16 : 122) + 40, 166, 38, { cls: o.by.length ? 'good' : 'ghost', title: '객체 ' + o.id, right: o.by.length ? o.val : '참조 없음' });
      o.by.forEach(function (name, j) { P.arrow('ar_' + name, 'v_' + name + ':r', 'o' + o.id + ':l:' + (o.by.length > 1 ? (j + 1) / (o.by.length + 1) : 0.5), { cls: o.by.length > 1 ? 'good' : '' }); });
    });
    var res = function (x) { return x === 'true' ? 'good' : x === 'false' ? 'bad' : 'ghost'; };
    P.box('c1', 16, 236, 320, 34, { cls: res(s.cmp.eq), title: 'a == b  (같은 객체인가)', right: s.cmp.eq || '?' });
    P.box('c2', 344, 236, 320, 34, { cls: res(s.cmp.equals), title: 'a.equals(b)  (내용이 같은가)', right: s.cmp.equals || '?' });
    P.note(str ? '화살표는 변수가 가리키는 객체입니다. 두 화살표가 같은 객체에 닿으면 ==가 true입니다. String Pool은 실제로는 힙 안에 있지만 구분하려고 따로 그렸습니다.' : '화살표는 변수가 가리키는 객체입니다. 두 화살표가 같은 객체에 닿으면 ==가 true입니다. 기본형 int 변수는 객체를 가리키지 않고 값을 직접 담습니다.');
  },
  assume: '모든 조합의 == 결과는 이 PC의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. Integer 캐시 범위 -128 ~ 127은 자바 언어 명세가 보장하는 최소 범위이며, JVM 옵션으로 상한을 늘릴 수 있습니다. String Pool의 위치는 JDK 7부터 힙 안이지만, 그림에서는 구분을 위해 따로 표시했습니다.',
});
