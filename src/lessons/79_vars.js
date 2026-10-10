Lab.register({
  id: 'vars', nav: '변수와 타입', cat: '자바 언어', mode: 'step',
  title: '변수를 다른 변수에 대입하면 무엇이 복사되나',
  intro: '변수는 무언가를 담아 두는 칸입니다. int 같은 기본형 변수의 칸에는 값 자체가 들어 있고, 클래스 타입 같은 참조형 변수의 칸에는 객체가 있는 곳을 가리키는 참조가 들어 있습니다. 대입할 때도 메서드에 넘길 때도 복사되는 것은 언제나 "칸에 들어 있는 것"입니다. 그래서 기본형은 복사본을 바꿔도 원래 변수가 그대로이고, 참조형은 두 변수가 같은 객체 하나를 함께 보게 됩니다.',
  terms: ['기본형과 참조형', '값에 의한 전달', '불변 객체', '힙(Heap) 메모리'],
  controls: [
    { id: 'what', label: '변수의 타입과 복사본으로 하는 일', type: 'select', value: 'field', options: [['prim', 'int (기본형): 복사본에 99를 대입'], ['field', 'Point (참조형): 복사본으로 객체의 내용을 바꿈'], ['renew', 'Point (참조형): 복사본에 새 객체를 대입'], ['copy', 'Point (참조형): 새 객체로 복사해 두고 내용을 바꿈'], ['str', 'String (참조형): 복사본에 글자를 이어 붙임']] },
    { id: 'how', label: '복사가 일어나는 곳', type: 'select', value: 'assign', options: [['assign', '다른 변수에 대입: b = a'], ['call', '메서드에 넘김: change(a)'], ['ret', '메서드에 넘기고 결과를 돌려받음: a = change(a)']], hint: '메서드에 넘길 때는 매개변수 p가 복사본입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: 'Point 변수를 b에 대입하고 b로 내용을 바꿉니다. a에서 읽어도 99입니다.', v: { what: 'field', how: 'assign' } },
    { t: '기본형이면', d: '값이 복사되므로 b를 바꿔도 a는 1 그대로입니다.', v: { what: 'prim', how: 'assign' } },
    { t: '메서드에 객체를 넘기면', d: '메서드 안에서 바꾼 내용이 메서드 밖에서도 보입니다.', v: { what: 'field', how: 'call' } },
    { t: '메서드 안에서 새 객체를 대입하면', d: '매개변수만 다른 객체를 가리키게 되고 a는 그대로입니다.', v: { what: 'renew', how: 'call' } },
    { t: '기본형을 메서드에 넘기면', d: '메서드가 매개변수를 바꿔도 a는 그대로입니다.', v: { what: 'prim', how: 'call' } },
    { t: '결과를 돌려받아 대입하면', d: 'return으로 받은 값을 a에 다시 넣어야 a가 바뀝니다.', v: { what: 'prim', how: 'ret' } },
    { t: 'String에 이어 붙이면', d: '참조형인데도 a는 그대로입니다.', v: { what: 'str', how: 'assign' } },
  ],
  code: function (c) {
    var W = c.what, call = c.how !== 'assign', ret = c.how === 'ret', cv = call ? 'p' : 'b';
    var T = W === 'prim' ? 'int' : W === 'str' ? 'String' : 'Point', init = W === 'prim' ? '1' : W === 'str' ? '"hi"' : 'new Point(1)';
    var rd = function (n) { return T === 'Point' ? n + '.x' : n; };
    var cm = function (line, note) { return line + new Array(Math.max(2, 37 - line.length)).join(' ') + '// ' + note; };
    var act = { prim: cv + ' = 99;', field: cv + '.x = 99;', copy: cv + '.x = 99;', renew: cv + ' = new Point(99);', str: cv + ' = ' + cv + ' + "!";' }[W];
    var actNote = { prim: '칸에 든 값을 바꾼다', field: '가리키는 객체의 내용을 바꾼다', copy: '복사해 둔 객체의 내용을 바꾼다', renew: '칸에 다른 객체의 참조를 넣는다', str: '새 String 객체가 만들어진다' }[W];
    var cls = T === 'Point' ? 'class Point {\n    int x;\n    Point(int x) { this.x = x; }\n}\n\n' : '';
    var src = W === 'copy' ? 'new Point(a.x)' : 'a', srcNote = W === 'copy' ? '새 객체를 만들어 내용을 옮긴다' : W === 'prim' ? 'a에 든 값이 복사된다' : 'a에 든 참조가 복사된다';
    if (!call) return cls + T + ' a = ' + init + ';\n' + cm(T + ' b = ' + src + ';', srcNote) + '\n' + cm(act, actNote) + '\n\nSystem.out.println(' + rd('b') + ');\nSystem.out.println(' + rd('a') + ');';
    return cls + 'static ' + (ret ? T : 'void') + ' change(' + T + ' p) {\n' + cm('    ' + act, actNote) + '\n    System.out.println(' + rd('p') + ');\n' + (ret ? '    return p;\n' : '') + '}\n\npublic static void main(String[] args) {\n    ' + T + ' a = ' + init + ';\n' + cm('    ' + (ret ? 'a = ' : '') + 'change(' + src + ');', W === 'copy' ? '새 객체를 만들어 넘긴다' : srcNote.replace('복사된다', 'p로 복사된다')) + '\n    System.out.println(' + rd('a') + ');\n}';
  },
  label: function (c) { return { prim: 'int · 99 대입', field: 'Point · 내용을 바꿈', renew: 'Point · 새 객체 대입', copy: 'Point · 새 객체로 복사', str: 'String · 이어 붙임' }[c.what] + ' · ' + { assign: 'b = a', call: 'change(a)', ret: 'a = change(a)' }[c.how]; },
  columns: ['복사본에서 읽은 값', 'a에서 읽은 값', 'a에서 읽은 값이 달라졌나'],
  simulate: function (c) {
    var W = c.what, call = c.how !== 'assign', ret = c.how === 'ret', cv = call ? 'p' : 'b', prim = W === 'prim', str = W === 'str', ev = [], sum = [];
    // 칸에 든 것: { v: 값 } (기본형) 또는 { ref: 객체 번호 } (참조형). 객체의 v는 Point면 x 값, String이면 글자.
    var st = { a: null, cp: null, gone: false, objs: [], out1: '?', out2: '?', hot: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function obj(v) { st.objs.push({ id: st.objs.length + 1, v: v }); return st.objs.length; }
    function read(cell) { return cell.ref ? st.objs[cell.ref - 1].v : cell.v; }
    var fld = function (n) { return prim || str ? n : n + '.x'; }, what = prim ? '값' : '참조';
    // 1. a를 만든다
    if (prim) { st.a = { v: 1 }; st.hot = 'a'; push('int a = 1: 변수 a의 칸에 값 1이 그대로 들어갑니다. int 같은 기본형 변수는 칸 안에 값 자체를 담습니다.'); }
    else if (str) { st.a = { ref: obj('hi') }; st.hot = 'a'; push('String a = "hi": 글자 "hi"는 힙에 있는 String 객체에 담겨 있습니다. 변수 a의 칸에는 글자가 아니라 그 객체를 가리키는 참조가 들어갑니다.'); }
    else { st.a = { ref: obj(1) }; st.hot = 'a'; push('Point a = new Point(1): new가 힙에 Point 객체를 하나 만듭니다(x는 1). 변수 a의 칸에는 객체 자체가 아니라 그 객체가 있는 곳을 가리키는 참조가 들어갑니다.'); }
    var first = read(st.a);
    // 2. 칸에 든 것을 복사한다
    st.hot = 'cp';
    if (W === 'copy') {
      st.cp = { ref: obj(read(st.a)) };
      push(call ? 'change(new Point(a.x)) 호출: 먼저 새 Point 객체를 하나 더 만들고, a가 가리키는 객체의 x 값 1을 옮겨 담습니다. 매개변수 p의 칸에는 이 새 객체의 참조가 들어갑니다. a가 가리키는 객체와 내용은 같지만 서로 다른 객체입니다.' : 'Point b = new Point(a.x): 새 Point 객체를 하나 더 만들고, a가 가리키는 객체의 x 값 1을 옮겨 담습니다. b의 칸에는 이 새 객체의 참조가 들어갑니다. 내용은 같지만 서로 다른 객체입니다.');
    } else {
      st.cp = JSON.parse(JSON.stringify(st.a));
      var same = prim ? ' 두 칸은 서로 이어져 있지 않습니다.' : ' 객체는 복사되지 않습니다. 객체는 여전히 하나이고, a와 ' + cv + '가 같은 객체를 가리킵니다.';
      push(call ? 'change(a) 호출: 메서드의 매개변수 p가 새로 생기고, a의 칸에 들어 있는 ' + (prim ? '값 1이' : '참조가') + ' p의 칸으로 복사됩니다. 대입(p = a)과 같은 일입니다.' + same : (prim ? 'int' : str ? 'String' : 'Point') + ' b = a: a의 칸에 들어 있는 ' + (prim ? '값 1을' : '참조를') + ' 복사해 b의 칸에 넣습니다.' + same);
    }
    // 3. 복사본으로 무언가를 한다
    if (prim) { st.cp = { v: 99 }; push(cv + ' = 99: ' + cv + '의 칸에 든 값을 99로 바꿉니다. a의 칸은 건드리지 않았으므로 1 그대로입니다.'); }
    else if (W === 'field' || W === 'copy') { st.objs[st.cp.ref - 1].v = 99; push(cv + '.x = 99: ' + cv + '의 칸에 든 참조를 따라가서, 그 객체의 x를 99로 바꿉니다. ' + cv + '의 칸 자체는 바뀌지 않습니다.' + (W === 'field' ? ' a도 바로 이 객체를 가리키고 있습니다.' : ' a가 가리키는 객체는 다른 객체라서 그대로입니다.'), W === 'field' ? 'bad' : ''); }
    else if (W === 'renew') { st.cp = { ref: obj(99) }; push(cv + ' = new Point(99): 새 Point 객체(x는 99)를 만들고, ' + cv + '의 칸에 그 참조를 넣습니다. 바뀐 것은 ' + cv + '의 칸뿐입니다. 처음 객체와 a의 칸은 그대로입니다.'); }
    else { st.cp = { ref: obj(read(st.cp) + '!') }; push(cv + ' = ' + cv + ' + "!": String 객체는 한번 만들어지면 내용을 바꿀 수 없습니다. 그래서 +는 "hi!"가 담긴 새 String 객체를 만들고, ' + cv + '의 칸에 그 참조를 넣습니다. 처음의 "hi" 객체와 a의 칸은 그대로입니다.'); }
    // 4. 복사본에서 읽는다
    st.out1 = String(read(st.cp));
    push('System.out.println(' + fld(cv) + '): ' + (prim ? cv + '의 칸에 든 값을 읽습니다.' : str ? cv + '가 가리키는 객체의 글자를 읽습니다.' : cv + '가 가리키는 객체의 x를 읽습니다.') + ' 출력은 ' + st.out1 + '입니다.');
    // 5. 메서드에서 돌아온다
    if (call) {
      var back = st.cp, orphan = !prim && back.ref !== st.a.ref;
      st.gone = true; st.hot = '';
      if (!ret) { st.cp = null; push('change 메서드가 끝났습니다. 매개변수 p는 메서드와 함께 사라집니다.' + (orphan ? ' p만 가리키던 ' + back.ref + '번 객체는 이제 어떤 변수도 가리키지 않습니다.' : '')); }
      else {
        st.cp = null; push('return p: p의 칸에 든 ' + (prim ? '값 99가' : '참조가') + ' 호출한 쪽으로 복사되어 돌아갑니다. 매개변수 p는 메서드와 함께 사라집니다.');
        var old = st.a; st.a = JSON.parse(JSON.stringify(back)); st.hot = 'a';
        push('a = change(...): 돌려받은 ' + (prim ? '값 99를' : '참조를') + ' a의 칸에 넣습니다. ' + (prim ? 'a의 칸이 1에서 99로 바뀝니다. a에 대입했기 때문에 바뀐 것입니다.' : back.ref === old.ref ? '돌려받은 것은 a가 이미 가리키던 바로 그 객체의 참조라서, a의 칸은 달라지지 않습니다.' : 'a가 ' + back.ref + '번 객체를 가리키게 됩니다. 처음에 가리키던 ' + old.ref + '번 객체는 이제 어떤 변수도 가리키지 않습니다.'), 'good');
      }
    }
    // 6. a에서 읽는다
    st.hot = 'a'; st.out2 = String(read(st.a));
    var changed = read(st.a) !== first, why;
    if (ret) why = prim || W !== 'field' ? 'a의 칸에 돌려받은 것을 대입했기 때문입니다.' : 'a가 가리키는 객체의 내용이 메서드 안에서 바뀌었기 때문입니다.';
    else if (prim) why = '복사된 것은 값이었고, a의 칸은 한 번도 바뀌지 않았습니다.';
    else if (W === 'field') why = cv + '로 바꾼 객체가 a가 가리키는 바로 그 객체이기 때문입니다.';
    else if (W === 'copy') why = cv + '로 바꾼 것은 따로 만든 복사본 객체였습니다.';
    else if (W === 'renew') why = cv + '의 칸만 새 객체를 가리키게 됐고, a가 가리키는 객체는 아무도 바꾸지 않았습니다.';
    else why = '새 String 객체가 만들어졌을 뿐, a가 가리키는 "hi" 객체는 바뀌지 않았습니다.';
    push('System.out.println(' + fld('a') + '): ' + (prim ? 'a의 칸에 든 값을 읽습니다.' : str ? 'a가 가리키는 객체의 글자를 읽습니다.' : 'a가 가리키는 객체의 x를 읽습니다.') + ' 출력은 ' + st.out2 + '입니다. ' + why, changed ? (ret ? 'good' : 'bad') : '');
    sum.push((call ? 'p' : 'b') + '에서 읽은 값은 ' + st.out1 + ', a에서 읽은 값은 ' + st.out2 + '입니다. a에서 읽은 값은 ' + (changed ? '처음과 달라졌습니다.' : '처음 그대로입니다.'));
    if (prim) sum.push('기본형 변수의 칸에는 값 자체가 들어 있습니다. 복사하면 같은 값이 하나 더 생길 뿐이어서, 복사본을 아무리 바꿔도 원래 변수는 달라지지 않습니다.');
    if (W === 'field') sum.push('참조형 변수의 칸에는 객체가 아니라 참조가 들어 있습니다. 복사된 것이 참조이므로 두 변수가 같은 객체 하나를 가리키고, 한쪽에서 내용을 바꾸면 다른 쪽에서도 바뀐 내용이 보입니다.');
    if (W === 'renew') sum.push('"가리키는 객체의 내용을 바꾸는 것"(' + cv + '.x = 99)과 "변수가 다른 객체를 가리키게 하는 것"(' + cv + ' = new Point(99))은 다른 일입니다. 뒤의 것은 그 변수의 칸만 바꾸므로, 같은 객체를 가리키던 다른 변수에는 아무 영향이 없습니다.');
    if (W === 'copy') sum.push('원본을 지키려면 참조가 아니라 객체를 복사해야 합니다. 새 객체를 만들어 내용을 옮겨 두면 객체가 둘이 되므로, 한쪽을 바꿔도 다른 쪽은 그대로입니다.');
    if (str) sum.push('String도 참조형이라 처음에는 두 변수가 같은 객체를 가리킵니다. 하지만 String은 내용을 바꿀 방법이 없는 불변 객체입니다. 이어 붙이면 새 객체가 만들어지고 변수만 그쪽을 가리키게 되므로, 기본형처럼 서로 영향을 주지 않습니다.');
    if (c.how === 'call') sum.push('메서드에 넘기는 것도 대입과 같습니다. 자바는 언제나 변수의 칸에 든 것(값 또는 참조)을 복사해서 넘깁니다. 그래서 메서드 안에서 매개변수에 다른 것을 대입해도 호출한 쪽 변수는 바뀌지 않고, 넘겨받은 객체의 내용을 바꾼 것만 밖에서 보입니다.');
    if (ret) sum.push('a의 칸을 바꿀 수 있는 것은 a에 대입하는 코드뿐입니다. 메서드가 만든 결과를 호출한 쪽 변수에 반영하려면 return으로 돌려주고 a = change(a)처럼 직접 대입합니다.');
    return { events: ev, summary: sum, cv: cv, row: [st.out1, st.out2, changed ? '달라짐' : '그대로'] };
  },
  // 칸에 든 것을 글로
  cell: function (cell, c) { return !cell ? '' : cell.ref ? '객체 ' + cell.ref + '의 참조' : '값 ' + cell.v; },
  objText: function (o, c) { return c.what === 'str' ? '"' + o.v + '"' : 'x = ' + o.v; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, cv = sim.cv, self = this;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    H.table(v, ['변수', '칸에 들어 있는 것'], [
      { cells: ['a', { v: self.cell(s.a, c), cls: s.hot === 'a' ? 'hot' : '' }] },
      { cls: s.cp ? '' : 'gone', cells: [cv === 'p' ? 'p (change의 매개변수)' : 'b', { v: s.cp ? self.cell(s.cp, c) : s.gone ? '사라짐 (메서드가 끝남)' : '아직 없음', cls: s.hot === 'cp' ? 'hot' : '' }] },
    ], '변수');
    if (c.what !== 'prim') H.table(v, ['객체', '내용', '가리키는 변수'], s.objs.map(function (o) {
      var by = []; if (s.a && s.a.ref === o.id) by.push('a'); if (s.cp && s.cp.ref === o.id) by.push(cv);
      return { cls: by.length ? '' : 'gone', cells: ['객체 ' + o.id, self.objText(o, c), { v: by.length ? by.join(', ') : '없음', cls: by.length > 1 ? 'hot' : '' }] };
    }), '힙의 객체');
    else H.text(v, '기본형은 객체를 만들지 않습니다. 값이 변수의 칸에 바로 들어 있습니다.');
    H.counters(v, [[s.out1, cv + '에서 읽은 값'], [s.out2, 'a에서 읽은 값']]);
  },
  // 그림: 왼쪽에 변수의 칸, 오른쪽에 힙의 객체. 참조가 든 칸에서 객체로 화살표가 간다. 아래에는 두 번의 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, cv = sim.cv, self = this, last = shown[shown.length - 1], s = last ? last.snap : { a: null, cp: null, gone: false, objs: [], out1: '?', out2: '?', hot: '' }, call = c.how !== 'assign';
    P.size(680, 296);
    P.region('st', 16, 16, 252, 196, '변수의 칸');
    P.region('hp', 316, 16, 348, 196, '힙 (객체가 놓이는 곳)');
    P.text('fa', 30, 58, call ? 'main 메서드의 변수' : '변수', { cls: 'mut' });
    P.box('v_a', 30, 66, 224, 34, s.a ? { cls: 'wait' + (s.hot === 'a' ? ' now' : ''), title: 'a', right: self.cell(s.a, c) } : { cls: 'ghost', title: 'a', right: '아직 없음' });
    P.text('fc', 30, 136, call ? 'change 메서드의 매개변수' : '복사본', { cls: 'mut' });
    P.box('v_c', 30, 144, 224, 34, s.cp ? { cls: 'hot' + (s.hot === 'cp' ? ' now' : ''), title: cv, right: self.cell(s.cp, c) } : { cls: 'ghost', title: cv, right: s.gone ? '사라짐' : '아직 없음' });
    if (c.what === 'prim') P.text('he', 490, 118, '기본형은 객체를 만들지 않습니다', { cls: 'mut', anchor: 'middle' });
    s.objs.forEach(function (o, i) {
      var by = []; if (s.a && s.a.ref === o.id) by.push('a'); if (s.cp && s.cp.ref === o.id) by.push('c');
      P.box('o' + o.id, 336, 62 + i * 78, 308, 42, { cls: by.length ? 'good' : 'ghost', title: '객체 ' + o.id + (c.what === 'str' ? ' (String)' : ' (Point)'), sub: by.length ? '' : '가리키는 변수 없음', right: self.objText(o, c) });
      by.forEach(function (n, j) { P.arrow('ar_' + n, 'v_' + n + ':r', 'o' + o.id + ':l:' + (by.length > 1 ? (j + 1) / 3 : 0.5), { cls: by.length > 1 ? 'hot' : '' }); });
    });
    P.box('r1', 16, 232, 320, 36, { cls: s.out1 === '?' ? 'ghost' : 'plain', title: cv + '에서 읽은 값', right: s.out1 });
    P.box('r2', 344, 232, 320, 36, { cls: s.out2 === '?' ? 'ghost' : s.out2 === s.out1 && c.what === 'field' && c.how !== 'ret' ? 'bad' : 'plain', title: 'a에서 읽은 값', right: s.out2 });
    P.note(c.what === 'prim' ? '기본형 변수의 칸에는 값이 그대로 들어 있습니다. 복사하면 값이 하나 더 생기고, 두 칸은 서로 이어져 있지 않습니다.' : '화살표는 칸에 든 참조가 가리키는 객체입니다. 대입이나 메서드 호출로 복사되는 것은 화살표(참조)이고, 객체는 new를 해야만 새로 생깁니다. 두 화살표가 한 객체에 닿아 있으면, 한쪽에서 바꾼 내용이 다른 쪽에서도 보입니다.');
  },
  assume: '열다섯 가지 조합의 출력(복사본에서 읽은 값, a에서 읽은 값)을 이 PC의 JDK 21에서 같은 구조의 코드를 실행한 결과와 대조했습니다. "참조"는 객체가 있는 곳을 가리키는 값이라는 뜻으로 썼습니다. 자바에서는 이 값을 숫자로 꺼내 볼 수 없고, 실제로 메모리 주소 그대로인지도 JVM마다 다릅니다. 변수의 칸이 스택에, 객체가 힙에 놓인다는 그림은 지역 변수에 대한 일반적인 설명이며, JIT 컴파일러가 최적화하면 객체를 힙에 만들지 않을 수도 있지만 프로그램의 결과는 같습니다. 문자열 "hi"는 실제로는 String Pool에 있는 객체인데, 여기서는 힙의 객체 하나로만 그렸습니다. 메서드에 넘길 때 생기는 호출 프레임은 "스택과 힙" 실습에서, ==와 equals의 차이는 "==와 equals" 실습에서 다룹니다.',
});
