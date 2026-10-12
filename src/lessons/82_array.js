Lab.register({
  id: 'array', nav: '배열', cat: '자바 언어', mode: 'step',
  title: '배열 변수를 대입하면 배열이 복사되나',
  intro: '배열은 같은 타입의 칸을 정해진 개수만큼 나란히 붙여 놓은 것입니다. 칸의 번호(인덱스)는 0부터 시작하고, 길이는 만들 때 정해져 바뀌지 않으며, 만들자마자 모든 칸이 기본값으로 채워집니다. 배열도 객체라서 변수에는 배열을 가리키는 참조가 들어갑니다. 그래서 b = a는 배열을 복사하지 않고, 2차원 배열은 "배열을 칸에 담은 배열"이 됩니다.',
  terms: ['배열', '얕은 복사와 깊은 복사', '기본형과 참조형', 'ArrayList'],
  controls: [
    { id: 'shape', label: '배열의 모양', type: 'select', value: '1', options: [['1', '1차원: 칸 3개'], ['2', '2차원: 2행 3열']] },
    { id: 'type', label: '칸의 타입', type: 'select', value: 'int', options: [['int', 'int'], ['boolean', 'boolean'], ['String', 'String']], hint: '값을 넣지 않은 칸에 무엇이 들어 있는지가 타입에 따라 다릅니다.' },
    { id: 'copy', label: '두 번째 변수 b를 만드는 방법', type: 'select', value: 'ref', options: [['ref', 'b = a'], ['clone', 'b = a.clone()'], ['copyOf', 'b = Arrays.copyOf(a, a.length)']] },
    { id: 'idx', label: 'b로 값을 넣을 칸의 번호(인덱스)', type: 'select', value: '2', options: [['0', '0 (첫 번째 칸)'], ['2', '2 (마지막 칸)'], ['3', '3 (길이와 같은 수)'], ['-1', '-1']], hint: '2차원에서는 0번 행(b[0])의 칸 번호입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: '칸 3개인 int 배열 a를 b = a로 대입하고 b의 2번 칸에 값을 넣으면 배열이 복사되나', d: 'b = a로 대입한 뒤 b의 칸에 값을 넣습니다. a를 출력해도 그 값이 보입니다.', v: { shape: '1', type: 'int', copy: 'ref', idx: '2' } },
    { t: 'clone으로 복사하면', q: '두 번째 변수를 b = a.clone() 호출로 만들면', d: '배열이 두 개가 되어 a는 그대로입니다.', v: { shape: '1', type: 'int', copy: 'clone', idx: '2' } },
    { t: '길이와 같은 번호에 넣으면', q: 'b = a.clone() 호출로 만들고 b의 3번 칸, 곧 길이와 같은 번호에 값을 넣으면', d: '칸 3개의 번호는 0, 1, 2뿐입니다. 3번에 넣으면 예외가 납니다.', v: { shape: '1', type: 'int', copy: 'clone', idx: '3' } },
    { t: 'String 배열의 처음 상태', q: '칸의 타입을 String으로 바꾸고 b = a.clone() 호출로 만든 뒤 b의 0번 칸에 값을 넣으면', d: '값을 넣지 않은 칸에는 null이 들어 있습니다.', v: { shape: '1', type: 'String', copy: 'clone', idx: '0' } },
    { t: '2차원 배열은 배열의 배열', q: '배열을 2행 3열의 2차원 배열로 바꾸면', d: '바깥 배열 하나와 행 배열 둘, 모두 세 개가 만들어집니다.', v: { shape: '2', type: 'int', copy: 'ref', idx: '2' } },
    { t: '2차원 배열을 clone하면', q: '2행 3열의 2차원 배열 a를 b = a.clone() 호출로 복사하면', d: '복사했는데도 a의 값이 바뀝니다. 행 배열을 함께 쓰기 때문입니다.', v: { shape: '2', type: 'int', copy: 'clone', idx: '2' } },
  ],
  lit: function (c) { return { int: '7', boolean: 'true', String: '"A"' }[c.type]; },
  code: function (c) {
    var two = c.shape === '2', T = c.type, AT = T + (two ? '[][]' : '[]'), pr = two ? 'Arrays.deepToString' : 'Arrays.toString';
    var pad = function (x) { return x + new Array(Math.max(2, 41 - x.length)).join(' ') + '// '; };
    var cp = c.copy === 'ref' ? 'a' : c.copy === 'clone' ? 'a.clone()' : 'Arrays.copyOf(a, a.length)';
    return 'import java.util.Arrays;\n\n' +
      pad(AT + ' a = new ' + T + (two ? '[2][3]' : '[3]') + ';') + (two ? '길이 3인 배열 2개와, 그 둘을 담은 배열' : '칸 3개. 기본값으로 채워진다') + '\n' +
      pad(AT + ' b = ' + cp + ';') + (c.copy === 'ref' ? '참조만 복사된다' : two ? '바깥 배열만 새로 만들어진다' : '새 배열을 만들어 값을 복사한다') + '\n\n' +
      'System.out.println(a == b);\n' + (two ? 'System.out.println(a[0] == b[0]);\n' : '') +
      pad((two ? 'b[0][' : 'b[') + c.idx + '] = ' + this.lit(c) + ';') + (two ? '0번 행의 ' : '') + c.idx + '번 칸에 넣는다\n' +
      'System.out.println(' + pr + '(a));\nSystem.out.println(' + pr + '(b));';
  },
  label: function (c) { return c.type + (c.shape === '2' ? '[2][3]' : '[3]') + ' · b = ' + (c.copy === 'ref' ? 'a' : c.copy === 'clone' ? 'a.clone()' : 'Arrays.copyOf') + ' · ' + (c.shape === '2' ? 'b[0][' : 'b[') + c.idx + ']에 넣기'; },
  columns: ['a == b', '값 넣기', 'a 출력', 'b 출력'],
  simulate: function (c) {
    var two = c.shape === '2', T = c.type, idx = +c.idx, ev = [], sum = [], AT = T + (two ? '[][]' : '[]'), lit = this.lit(c);
    var def = { int: 0, boolean: false, String: null }[T], val = { int: 7, boolean: true, String: 'A' }[T];
    var defWord = { int: 'int의 기본값은 0', boolean: 'boolean의 기본값은 false', String: 'String 같은 참조형의 기본값은 null' }[T];
    var st = { arrs: [], a: null, b: null, eq: null, eq0: null, hit: null, oob: null, outA: null, outB: null, err: null };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function mk(type, cells) { st.arrs.push({ id: st.arrs.length + 1, type: type, cells: cells }); return st.arrs.length; }
    function arr(id) { return st.arrs[id - 1]; }
    function fill(n) { var x = []; for (var i = 0; i < n; i++) x.push(def); return x; }
    // Arrays.toString, Arrays.deepToString이 내는 글자
    function show(id) { return '[' + arr(id).cells.map(function (x) { return x !== null && typeof x === 'object' ? show(x.ref) : String(x); }).join(', ') + ']'; }
    // 1. 배열을 만든다
    if (!two) { st.a = mk(T + '[]', fill(3)); push(AT + ' a = new ' + T + '[3]: 힙에 ' + T + ' 칸 3개가 나란히 붙은 배열이 만들어집니다. 칸에는 앞에서부터 0, 1, 2라는 번호(인덱스)가 붙습니다. 값을 넣지 않았지만 모든 칸이 기본값으로 채워져 있습니다(' + defWord + '). 변수 a에는 이 배열을 가리키는 참조가 들어갑니다.'); }
    else {
      st.a = mk(T + '[][]', []); var r0 = mk(T + '[]', fill(3)), r1 = mk(T + '[]', fill(3)); arr(st.a).cells = [{ ref: r0 }, { ref: r1 }];
      push(AT + ' a = new ' + T + '[2][3]: 배열이 모두 세 개 만들어집니다. 길이 3인 ' + T + ' 배열 2개(행)와, 그 둘의 참조를 칸에 담은 길이 2인 바깥 배열입니다. 2차원 배열은 표 한 장이 아니라 "배열을 칸에 담은 배열"입니다. 변수 a에는 바깥 배열의 참조가 들어갑니다. 행의 칸은 모두 기본값입니다(' + defWord + ').');
    }
    // 2. 두 번째 변수
    var shallow = two && c.copy !== 'ref';
    if (c.copy === 'ref') { st.b = st.a; push(AT + ' b = a: a에 든 참조가 b로 복사됩니다. 배열은 새로 만들어지지 않습니다. a와 b가 같은 배열 하나를 가리킵니다.'); }
    else {
      st.b = mk(arr(st.a).type, JSON.parse(JSON.stringify(arr(st.a).cells)));
      var head = AT + ' b = ' + (c.copy === 'clone' ? 'a.clone()' : 'Arrays.copyOf(a, a.length)') + ': ';
      if (!two) push(head + (c.copy === 'clone' ? '길이가 같은 새 배열을 만들고, a가 가리키는 배열의 칸에 든 값을 차례로 복사해 넣습니다.' : '둘째 인자로 준 길이(여기서는 a.length, 곧 3)의 새 배열을 만들고, a가 가리키는 배열의 값을 앞에서부터 복사해 넣습니다.') + ' b에는 새 배열의 참조가 들어갑니다. 배열이 두 개가 됐습니다.', 'good');
      else push(head + '새로 만들어지는 것은 바깥 배열 하나뿐입니다(길이 2). 그 칸에는 원래 바깥 배열의 칸에 든 것을 복사해 넣는데, 거기에 든 것은 행 배열의 참조입니다. 행 배열은 새로 만들어지지 않으므로, 두 바깥 배열이 같은 행 배열 둘을 가리킵니다.', 'bad');
    }
    // 3. 같은 배열인지
    st.eq = String(st.a === st.b);
    push('System.out.println(a == b): 두 변수가 같은 배열을 가리키는지 비교합니다. 출력은 ' + st.eq + '입니다.');
    if (two) { st.eq0 = String(arr(st.a).cells[0].ref === arr(st.b).cells[0].ref); push('System.out.println(a[0] == b[0]): a 쪽 바깥 배열의 0번 칸과 b 쪽 바깥 배열의 0번 칸이 같은 행 배열을 가리키는지 비교합니다. 출력은 ' + st.eq0 + '입니다.' + (shallow ? ' 바깥 배열은 서로 다른데 행 배열은 같습니다.' : ''), shallow ? 'bad' : ''); }
    // 4. b로 값을 넣는다
    var target = two ? arr(arr(st.b).cells[0].ref) : arr(st.b), w = (two ? 'b[0][' : 'b[') + idx + '] = ' + lit, len = target.cells.length;
    if (idx < 0 || idx >= len) {
      st.oob = { arr: target.id, idx: idx }; st.err = 'ArrayIndexOutOfBoundsException: Index ' + idx + ' out of bounds for length ' + len;
      push(w + ': ' + (two ? 'b[0]이 가리키는 행 배열' : 'b가 가리키는 배열') + '의 길이는 ' + len + '이고, 쓸 수 있는 번호는 0, 1, 2뿐입니다. ' + (idx < 0 ? '번호는 0보다 작을 수 없습니다.' : idx + '번 칸은 없습니다. 배열은 만든 뒤에 길이가 늘어나지 않습니다.') + ' ArrayIndexOutOfBoundsException이 발생하고, 프로그램은 이 줄에서 멈춥니다. 메시지는 "Index ' + idx + ' out of bounds for length ' + len + '"입니다.', 'bad');
    } else {
      target.cells[idx] = val; st.hit = { arr: target.id, idx: idx };
      push(w + ': ' + (two ? 'b가 가리키는 바깥 배열의 0번 칸을 따라가 행 배열을 찾고, 그 배열의 ' : 'b가 가리키는 배열의 ') + idx + '번 칸에 값을 넣습니다. ' + (idx === 0 ? '번호는 0부터 세므로 0번이 첫 번째 칸입니다.' : '길이가 3이면 번호는 0부터 2까지이므로 2번이 마지막 칸입니다.'));
      var seen = two ? arr(st.a).cells[0].ref === target.id : st.a === target.id, pr = two ? 'Arrays.deepToString' : 'Arrays.toString';
      st.outA = show(st.a);
      push('System.out.println(' + pr + '(a)): a가 가리키는 배열의 내용을 출력합니다. 출력은 ' + st.outA + '입니다. ' + (!seen ? 'b로 넣은 값이 보이지 않습니다. a의 배열과 b의 배열이 따로 있기 때문입니다.' : shallow ? 'b로 넣은 값이 a에서도 보입니다. 바깥 배열은 따로 만들었지만 0번 행 배열을 함께 쓰기 때문입니다.' : 'b로 넣은 값이 a에서도 보입니다. a와 b가 같은 배열을 가리키기 때문입니다.'), seen ? 'bad' : 'good');
      st.outB = show(st.b);
      push('System.out.println(' + pr + '(b)): b가 가리키는 배열의 내용을 출력합니다. 출력은 ' + st.outB + '입니다.');
    }
    if (st.err) {
      sum.push('배열의 길이는 만들 때 정해지고 그 뒤로 바뀌지 않습니다. 길이가 n이면 번호는 0부터 n - 1까지입니다. 이 범위를 벗어난 번호는 컴파일할 때가 아니라 실행 중에 예외로 드러납니다.');
      sum.push(idx < 0 ? '음수 번호로 뒤에서부터 세는 문법은 자바에 없습니다. 마지막 칸은 a[a.length - 1]로 씁니다.' : '반복문의 조건을 i <= a.length로 쓰면 마지막에 바로 이 예외를 만납니다. i < a.length로 씁니다. 칸을 더 늘려야 한다면 더 긴 배열을 새로 만들어 옮기거나(Arrays.copyOf(a, 5)), 크기가 저절로 늘어나는 ArrayList를 씁니다.');
    } else {
      if (c.copy === 'ref') sum.push('배열 변수를 대입하면 배열이 복사되는 것이 아니라, 같은 배열을 가리키는 변수가 하나 더 생깁니다. 그래서 한쪽으로 넣은 값이 다른 쪽에서도 보입니다. 메서드에 배열을 넘길 때도 마찬가지입니다.');
      else if (!two) sum.push('배열을 복사하려면 a.clone()이나 Arrays.copyOf(a, a.length)로 새 배열을 만듭니다. 두 배열이 따로 있으므로 한쪽을 바꿔도 다른 쪽은 그대로입니다.' + (c.copy === 'copyOf' ? ' Arrays.copyOf의 둘째 인자는 새 배열의 길이입니다. 원래보다 큰 수를 주면 남는 칸이 기본값으로 채워진 더 긴 배열을 얻습니다.' : ''));
      else sum.push('2차원 배열에 clone이나 Arrays.copyOf를 쓰면 바깥 배열만 새로 만들어지고 행 배열은 함께 씁니다. 이것을 얕은 복사라고 합니다. 그래서 b[0]의 칸을 바꾸면 a[0]에서도 바뀝니다. 행까지 따로 가지려면 행마다 clone을 해야 합니다(깊은 복사).');
      if (two && c.copy === 'ref') sum.push('new ' + T + '[2][3]은 배열 세 개를 만듭니다. a.length는 바깥 배열의 길이인 2이고, a[0].length는 행 배열의 길이인 3입니다. a[0]은 그 자체로 ' + T + '[] 배열입니다.');
      sum.push(T === 'int' ? '배열은 만들 때 모든 칸이 기본값으로 채워집니다. 숫자 타입은 0, boolean은 false, 참조형은 null입니다.' : T === 'boolean' ? 'boolean 배열의 칸은 값을 넣기 전에 false입니다. 기본값은 타입에 따라 정해집니다(숫자는 0, 참조형은 null).' : 'String 배열의 칸은 값을 넣기 전에 null입니다. 빈 문자열 ""이 아닙니다. null인 칸에 a[1].length()처럼 메서드를 부르면 NullPointerException이 납니다.');
    }
    return { events: ev, summary: sum, row: [two ? st.eq + ' (a[0] == b[0]은 ' + st.eq0 + ')' : st.eq, st.err || '성공', st.err ? '출력 전에 멈춤' : st.outA, st.err ? '출력 전에 멈춤' : st.outB] };
  },
  cellText: function (x) { return x === null ? 'null' : typeof x === 'string' ? '"' + x + '"' : typeof x === 'object' ? '배열 ' + x.ref + '의 참조' : String(x); },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, self = this;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    H.table(v, ['배열', '타입', '길이', '칸의 내용 (0번부터)'], s.arrs.map(function (A) { return { cells: ['배열 ' + A.id, A.type, String(A.cells.length), { v: A.cells.map(function (x) { return self.cellText(x); }).join(' | '), cls: s.hit && s.hit.arr === A.id ? 'hot' : '' }] }; }), '힙의 배열');
  },
  // 그림: 배열마다 테두리를 두르고 그 안에 칸을 번호 순서로 나란히 놓는다. 변수와 참조가 든 칸에서 배열로 화살표가 간다. 2차원이면 가운데에 행 배열, 양옆에 바깥 배열이 놓인다.
  draw: function (P, sim, shown) {
    var c = sim.c, two = c.shape === '2', self = this, last = shown[shown.length - 1], s = last ? last.snap : { arrs: [], a: null, b: null, eq: null, eq0: null, hit: null, oob: null, outA: null, outB: null, err: null };
    P.size(680, 318);
    var cell = function (A, i, x, y, w, o) { var hit = s.hit && s.hit.arr === A.id && s.hit.idx === i; P.box('c' + A.id + '_' + i, x, y, w, 30, o || { cls: hit ? 'hot now' : 'plain', title: self.cellText(A.cells[i]), center: true }); };
    var off = c.idx === '-1' ? 1 : 0;   // -1번을 고른 설정에서는 0번 칸 왼쪽에 '없는 칸' 자리를 하나 비워 둔다
    var oobBox = function (x, y, w) { P.box('oob', x, y, w, 30, { cls: 'bad now', title: '없는 칸', center: true }); P.text('oobix', x + w / 2, y + 46, '[' + s.oob.idx + ']', { cls: 'bad', anchor: 'middle' }); };
    var sameAB = s.a && s.b === s.a;
    if (!two) {
      P.box('v_a', 16, 48, 96, 32, s.a ? { cls: 'wait', title: 'a', right: '참조' } : { cls: 'ghost', title: 'a', right: '없음' });
      P.box('v_b', 16, 138, 96, 32, s.b ? { cls: 'wait', title: 'b', right: '참조' } : { cls: 'ghost', title: 'b', right: '없음' });
      s.arrs.forEach(function (A, k) {
        var y0 = 24 + k * 90, x0 = 250;
        P.region('A' + A.id, x0, y0, 264, 82, '배열 ' + A.id + ' · ' + A.type + ' · 길이 ' + A.cells.length);
        A.cells.forEach(function (x, i) { cell(A, i, x0 + 10 + (i + off) * 62, y0 + 28, 58); P.text('ix' + A.id + '_' + i, x0 + 39 + (i + off) * 62, y0 + 74, '[' + i + ']', { cls: 'mut', anchor: 'middle' }); });
        if (s.oob && s.oob.arr === A.id) oobBox(x0 + 10 + (off ? 0 : 3) * 62, y0 + 28, 58);
      });
      if (!s.arrs.length) P.text('empty', 400, 110, '아직 배열이 없습니다', { cls: 'mut', anchor: 'middle' });
      if (s.a) P.arrow('ar_a', 'v_a:r', 'A' + s.a + ':l' + (sameAB ? ':0.3' : ''), { cls: sameAB ? 'hot' : '' });
      if (s.b) P.arrow('ar_b', 'v_b:r', 'A' + s.b + ':l' + (sameAB ? ':0.7' : ''), { cls: sameAB ? 'hot' : '' });
    } else {
      var right = c.copy !== 'ref';
      P.box('v_a', 16, 52, 44, 30, s.a ? { cls: 'wait', title: 'a', center: true } : { cls: 'ghost', title: 'a', center: true });
      P.box('v_b', right ? 624 : 16, right ? 52 : 142, right ? 40 : 44, 30, s.b ? { cls: 'wait', title: 'b', center: true } : { cls: 'ghost', title: 'b', center: true });
      s.arrs.forEach(function (A) {
        if (A.type.indexOf('[][]') > 0) {
          var x0 = A.id === 1 ? 92 : 506, side = A.id === 1 ? 'r' : 'l';
          P.region('A' + A.id, x0, 24, 90, 172, '배열 ' + A.id);
          A.cells.forEach(function (x, i) { cell(A, i, x0 + 8, 52 + i * 90, 74, { cls: 'wait', title: '[' + i + ']', right: '참조' }); P.arrow('ro' + A.id + '_' + i, 'c' + A.id + '_' + i + ':' + side, 'A' + x.ref + ':' + (side === 'r' ? 'l' : 'r'), { cls: s.arrs.length > 3 ? 'hot' : '' }); });
        } else {
          var y0 = A.id === 2 ? 24 : 114;
          P.region('A' + A.id, 214, y0, 260, 82, '배열 ' + A.id + ' · ' + A.type + ' · 길이 ' + A.cells.length);
          A.cells.forEach(function (x, i) { cell(A, i, 224 + (i + off) * 58, y0 + 28, 54); P.text('ix' + A.id + '_' + i, 251 + (i + off) * 58, y0 + 74, '[' + i + ']', { cls: 'mut', anchor: 'middle' }); });
          if (s.oob && s.oob.arr === A.id) oobBox(224 + (off ? 0 : 3) * 58, y0 + 28, 54);
        }
      });
      if (!s.arrs.length) P.text('empty', 340, 110, '아직 배열이 없습니다', { cls: 'mut', anchor: 'middle' });
      if (s.a) P.arrow('ar_a', 'v_a:r', 'A1:l:0.2');
      if (s.b) P.arrow('ar_b', right ? 'v_b:l' : 'v_b:r', right ? 'A' + s.b + ':r:0.2' : 'A1:l:0.75', { cls: sameAB ? 'hot' : '' });
    }
    P.box('eq', 16, 206, 648, 28, { cls: s.eq === null ? 'ghost' : 'plain', title: two ? 'a == b,  a[0] == b[0]' : 'a == b', right: s.eq === null ? '?' : two ? s.eq + ',  ' + (s.eq0 === null ? '?' : s.eq0) : s.eq });
    P.box('ra', 16, 240, 648, 28, s.err ? { cls: 'bad', title: '예외', right: s.err } : { cls: s.outA === null ? 'ghost' : 'plain', title: 'a 출력', right: s.outA === null ? '?' : s.outA });
    P.box('rb', 16, 274, 648, 28, s.err ? { cls: 'ghost', title: '출력', right: '실행되지 않음' } : { cls: s.outB === null ? 'ghost' : 'plain', title: 'b 출력', right: s.outB === null ? '?' : s.outB });
    P.note(two ? '2차원 배열은 바깥 배열(양옆)의 칸이 행 배열(가운데)을 가리키는 구조입니다. clone이나 Arrays.copyOf는 바깥 배열만 새로 만들기 때문에, 두 바깥 배열의 화살표가 같은 행 배열에 닿습니다. 배열은 모두 힙에 놓입니다.' : '테두리 하나가 배열 하나이고, 칸은 번호 순서대로 붙어 있습니다. 화살표는 변수에 든 참조가 가리키는 배열로 이어집니다. 두 화살표가 한 배열에 닿아 있으면 어느 변수로 바꾸든 같은 칸이 바뀝니다. 배열은 모두 힙에 놓입니다.');
  },
  assume: '일흔두 가지 조합의 결과(a == b, 예외와 그 메시지, 두 번의 출력)를 이 PC의 JDK 21에서 같은 구조의 코드를 실행한 결과와 대조했습니다. 요약에 적은 내용 가운데 Arrays.copyOf로 더 긴 배열을 얻는 것, 행마다 clone하면 행을 함께 쓰지 않는 것, 메서드에 넘긴 배열을 메서드 안에서 바꾸면 밖에서도 보이는 것, i <= a.length로 돌면 예외가 나는 것, null인 칸에 메서드를 부르면 NullPointerException이 나는 것, a.length와 a[0].length의 값도 함께 실행해 확인했습니다. 예외 메시지의 문장은 JDK 버전에 따라 다를 수 있으며 여기 적은 것은 JDK 21의 것입니다. 배열의 칸이 메모리에서 실제로 나란히 붙어 있는지는 실행으로 확인한 것이 아니라 JVM의 일반적인 구현 방식을 따른 설명입니다. 그림에서 String 값 "A"는 칸 안에 바로 적었지만, 실제로는 칸에 String 객체의 참조가 들어 있습니다. { 1, 2, 3 }처럼 값을 적어 만드는 방법, 행마다 길이가 다른 2차원 배열, 향상된 for문은 다루지 않았습니다.',
});
