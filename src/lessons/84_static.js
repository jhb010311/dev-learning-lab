Lab.register({
  id: 'static', nav: 'static과 인스턴스', cat: '자바 언어', mode: 'step',
  title: 'b만 건드렸는데 왜 a의 값도 바뀌나',
  intro: '필드 앞에 static을 붙이면 그 필드는 객체가 아니라 클래스에 하나만 생기고, 모든 객체가 그 하나를 함께 씁니다. static을 붙이지 않은 인스턴스 필드는 객체마다 따로 생깁니다. static 메서드는 객체 없이 불리므로, 그 안에서는 인스턴스 필드와 this를 쓸 수 없습니다.',
  terms: ['static', '클래스와 객체', '인스턴스 멤버와 static 멤버', 'this'],
  controls: [
    { id: 'decl', label: 'count 필드의 선언', type: 'select', value: 'static', options: [['inst', 'int count (인스턴스 필드)'], ['static', 'static int count (static 필드)']] },
    { id: 'extra', label: '추가로 적는 코드', type: 'select', value: 'none', options: [['none', '없음'], ['sm', 'static 메서드 report()에서 return count'], ['smThis', 'static 메서드 report()에서 return this.count'], ['cls0', '객체를 만들기 전에 Counter.count 출력'], ['clsHit', '객체 없이 Counter.hit() 호출']] },
    { id: 'nb', label: 'b.hit()을 부르는 횟수', type: 'select', value: '1', options: [['0', '0번'], ['1', '1번'], ['2', '2번']], hint: 'a.hit()은 항상 2번 부릅니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'count가 static 필드일 때 a.hit()을 2번, b.hit()을 1번 부르면 a.count와 b.count는 각각 무엇이 되나', d: 'count가 static입니다. a.hit() 2번, b.hit() 1번인데 둘 다 3이 나옵니다.', v: { decl: 'static', extra: 'none', nb: '1' } },
    { t: 'static을 떼면', q: 'count 필드를 static 없는 int count 선언으로 바꾸면', d: '객체마다 자기 count를 가집니다. 2와 1이 나옵니다.', v: { decl: 'inst', extra: 'none', nb: '1' } },
    { t: 'static 메서드에서 인스턴스 필드를 쓰면', q: 'static 없는 int count 선언인데 static 메서드 report() 안에서 return count를 하면', d: '어느 객체의 count인지 알 수 없어 컴파일 오류입니다.', v: { decl: 'inst', extra: 'sm', nb: '1' } },
    { t: 'static 메서드에서 static 필드를 쓰면', q: 'count가 static int count인 채로 static 메서드 report() 안에서 return count를 하면', d: '객체 없이 Counter.report()로 값을 읽습니다.', v: { decl: 'static', extra: 'sm', nb: '1' } },
    { t: 'static 메서드에서 this를 쓰면', q: 'static 메서드 report() 안에서 return this.count를 하면', d: 'count가 static이어도 this는 쓸 수 없습니다.', v: { decl: 'static', extra: 'smThis', nb: '1' } },
    { t: '객체를 만들기 전에 Counter.count', q: '객체를 만들기 전에 Counter.count를 출력하면', d: '객체가 하나도 없어도 static 필드는 있습니다.', v: { decl: 'static', extra: 'cls0', nb: '1' } },
    { t: '객체 없이 Counter.hit()', q: '객체 없이 Counter.hit() 호출을 하면', d: '인스턴스 메서드는 클래스 이름으로 부를 수 없습니다.', v: { decl: 'static', extra: 'clsHit', nb: '1' } },
  ],
  code: function (c) {
    var e = this.error(c), isS = c.decl === 'static', nb = +c.nb, i;
    var s = 'class Counter {\n    ' + (isS ? 'static int count;              // static 필드: 클래스에 하나' : 'int count;                     // 인스턴스 필드: 객체마다 하나') + '\n\n    void hit() {                   // 인스턴스 메서드\n        count++;\n    }\n';
    if (c.extra === 'sm') s += '\n    static int report() {          // static 메서드\n        return count;' + (e ? '              // 컴파일 오류' : '') + '\n    }\n';
    if (c.extra === 'smThis') s += '\n    static int report() {          // static 메서드\n        return this.count;         // 컴파일 오류\n    }\n';
    s += '}\n\npublic class Main {\n    public static void main(String[] args) {\n';
    if (c.extra === 'cls0') s += '        System.out.println(Counter.count);' + (e ? '   // 컴파일 오류' : '   // 아직 객체가 없다') + '\n';
    if (c.extra === 'clsHit') s += '        Counter.hit();                        // 컴파일 오류\n';
    s += '        Counter a = new Counter();\n        Counter b = new Counter();\n        a.hit();\n        a.hit();\n';
    for (i = 0; i < nb; i++) s += '        b.hit();\n';
    s += '        System.out.println(a.count + " " + b.count);';
    if (c.extra === 'sm' || c.extra === 'smThis') s += '\n        System.out.println(Counter.report());';
    return s + '\n    }\n}';
  },
  label: function (c) { return (c.decl === 'static' ? 'static int count' : 'int count') + ' · ' + { none: '추가 없음', sm: 'report()에서 count', smThis: 'report()에서 this.count', cls0: '먼저 Counter.count', clsHit: 'Counter.hit()' }[c.extra] + ' · b.hit() ' + c.nb + '번'; },
  columns: ['컴파일', 'a.count와 b.count', '추가한 줄의 출력'],
  // 이 조합이 컴파일 오류라면 { msg: javac 메시지, at: 오류가 난 곳 }, 아니면 null
  error: function (c) {
    var V = 'non-static variable count cannot be referenced from a static context';
    if (c.extra === 'smThis') return { msg: 'non-static variable this cannot be referenced from a static context', at: 'mt' };
    if (c.extra === 'clsHit') return { msg: 'non-static method hit() cannot be referenced from a static context', at: 'mt' };
    if (c.decl === 'inst' && c.extra === 'sm') return { msg: V, at: 'mt' };
    if (c.decl === 'inst' && c.extra === 'cls0') return { msg: V, at: 'sf' };
    return null;
  },
  simulate: function (c) {
    var isS = c.decl === 'static', nb = +c.nb, x = c.extra, hasM = x === 'sm' || x === 'smThis', e = this.error(c), ev = [], sum = [], i;
    var st = { cls: false, sv: '', a: false, av: '', b: false, bv: '', hot: '', by: '', ab: '', ex: '', err: '', errAt: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    push('컴파일: Counter의 선언을 읽습니다. count는 ' + (isS ? 'static 필드라서 클래스에 하나만 있고' : '인스턴스 필드라서 객체마다 하나씩 있고') + ', hit()은 static이 붙지 않은 인스턴스 메서드라서 a.hit()처럼 객체를 대상으로 부릅니다.' + (hasM ? ' report()는 static 메서드라서 객체 없이 Counter.report()로 부릅니다.' : ''));
    if (e) {
      st.err = e.msg; st.errAt = e.at;
      if (x === 'smThis') push('컴파일: static 메서드 report() 안의 this.count를 검사합니다. this는 "지금 이 메서드가 다루고 있는 객체"인데, static 메서드는 객체 없이 불리므로 this가 없습니다. ' + (isS ? 'count가 static 필드여도 this라는 말 자체를 쓸 수 없어' : '가리킬 객체가 없으니 this.count도 읽을 수 없어') + ' 컴파일 오류입니다.', 'bad');
      else if (x === 'sm') push('컴파일: static 메서드 report() 안의 count를 검사합니다. count는 객체마다 따로 있는 인스턴스 필드입니다. static 메서드는 객체 없이 불리므로 어느 객체의 count를 말하는지 정할 수 없습니다. 컴파일 오류입니다.', 'bad');
      else if (x === 'cls0') push('컴파일: Counter.count를 검사합니다. 클래스 이름으로는 클래스에 속한 static 멤버만 쓸 수 있습니다. count는 객체마다 따로 있는 인스턴스 필드라서 어느 객체의 것인지 알 수 없습니다. 컴파일 오류입니다.', 'bad');
      else push('컴파일: Counter.hit()을 검사합니다. hit()은 인스턴스 메서드라서 어느 객체를 대상으로 실행할지가 정해져야 합니다. ' + (isS ? 'hit()이 건드리는 count가 static 필드여도, hit() 자체에 static이 없으면 객체가 필요합니다. ' : '') + '클래스 이름만으로는 대상 객체가 없어 컴파일 오류입니다.', 'bad');
      sum.push('컴파일 오류입니다. javac의 메시지는 "' + e.msg + '"이고, "static이 아닌 것을 static인 자리에서 쓸 수 없다"는 뜻입니다. 프로그램은 실행되지 않습니다.');
      if (x === 'smThis') { sum.push('static 메서드에는 this가 없습니다. 객체 없이 클래스 이름으로 불리기 때문입니다.'); sum.push(isS ? 'count가 static이므로 this를 빼고 return count라고 쓰면 됩니다.' : 'static 메서드에서 어떤 객체의 값을 읽으려면 그 객체를 인자로 받아야 합니다. static int report(Counter c) { return c.count; }처럼 쓰면 컴파일됩니다.'); }
      if (x === 'sm') { sum.push('static 메서드 안에서 이름만 적어서 쓸 수 있는 것은 static 멤버뿐입니다. 인스턴스 필드는 객체가 있어야 존재합니다.'); sum.push('고치는 방법은 둘입니다. count가 클래스 전체에 하나면 되는 값이면 count에 static을 붙이고, 객체마다 달라야 하는 값이면 static int report(Counter c) { return c.count; }처럼 객체를 인자로 받습니다.'); }
      if (x === 'cls0') sum.push('인스턴스 필드는 a.count처럼 객체를 통해서만 읽을 수 있습니다. 클래스 이름으로 읽으려면 그 필드가 static이어야 합니다.');
      if (x === 'clsHit') sum.push('인스턴스 메서드는 a.hit()처럼 객체를 대상으로 부릅니다. main처럼 static인 메서드 안에서 인스턴스 메서드를 그냥 부르려다 이 오류를 자주 만납니다. 그럴 때는 먼저 new로 객체를 만들고 그 객체로 부릅니다.');
      return { events: ev, summary: sum, row: ['오류: ' + e.msg, '실행되지 않음', '실행되지 않음'] };
    }
    st.cls = true; if (isS) st.sv = '0';
    push('실행 시작: Counter 클래스가 처음 쓰일 때 클래스가 준비됩니다. ' + (isS ? 'static 필드 count가 클래스에 하나 만들어지고 기본값 0이 들어갑니다. 아직 객체는 하나도 없습니다.' : '이 클래스에는 static 필드가 없어서 클래스 쪽에 놓이는 값이 없습니다. count는 객체를 만들 때 그 객체 안에 생깁니다.'));
    if (x === 'cls0') { st.ex = '0'; st.hot = 'sf'; push('System.out.println(Counter.count): 객체를 하나도 만들지 않았지만, static 필드는 클래스에 있으므로 클래스 이름으로 읽을 수 있습니다. 출력은 0입니다.', 'good'); }
    st.a = true; st.av = '0'; st.hot = 'oa';
    push('Counter a = new Counter(): 힙에 객체가 하나 만들어지고 a가 그것을 가리킵니다. ' + (isS ? 'count는 static이라 객체 안에 들어가지 않습니다. 이 객체에는 자기만의 count가 없습니다.' : '이 객체 안에 자기만의 count가 생기고 기본값 0이 들어갑니다.'));
    st.b = true; st.bv = '0'; st.hot = 'ob';
    push('Counter b = new Counter(): 두 번째 객체가 만들어지고 b가 그것을 가리킵니다. ' + (isS ? 'b에도 자기만의 count는 없습니다. count는 여전히 클래스에 하나뿐입니다.' : 'b 안에도 count가 생깁니다. a의 count와는 별개인 변수입니다.'));
    function hit(who, n) {
      st.by = who;
      if (isS) { st.sv = String(+st.sv + 1); st.hot = 'sf'; push(who + '.hit(): hit() 안의 count++가 실행됩니다. ' + (who === 'b' ? 'b를 대상으로 불렀지만 count는 static 필드이므로, a.hit()이 올려 둔 바로 그 count가 이어서 올라갑니다.' : 'count는 static 필드이므로 클래스에 하나뿐인 count가 1 늘어납니다.') + ' 이제 값은 ' + st.sv + '입니다.'); }
      else { var k = who === 'a' ? 'av' : 'bv'; st[k] = String(+st[k] + 1); st.hot = 'o' + who; push(who + '.hit(): hit() 안의 count++가 실행됩니다. 인스턴스 메서드 안의 count는 호출 대상인 ' + who + ' 객체의 count입니다. ' + who + '의 count만 1 늘어 ' + st[k] + '입니다. ' + (who === 'a' ? 'b' : 'a') + '의 count는 그대로 ' + st[who === 'a' ? 'bv' : 'av'] + '입니다.'); }
    }
    hit('a'); hit('a'); for (i = 0; i < nb; i++) hit('b');
    st.by = ''; st.hot = 'read'; st.ab = isS ? st.sv + ' ' + st.sv : st.av + ' ' + st.bv;
    push('System.out.println(a.count + " " + b.count): ' + (isS ? 'a.count와 b.count는 적힌 모양만 다를 뿐 둘 다 클래스에 하나뿐인 count를 읽습니다. 객체 변수로 static 필드를 읽으면 변수의 타입인 Counter의 static 필드가 읽힙니다.' : 'a의 count와 b의 count는 서로 다른 변수입니다. 각자 자기 객체에서 불린 hit()의 횟수만 들어 있습니다.') + ' 출력은 ' + st.ab + '입니다.', x === 'sm' ? '' : 'good');
    if (x === 'sm') { st.hot = 'mt'; st.ex = st.sv; push('System.out.println(Counter.report()): report()는 static 메서드라서 객체 없이 클래스 이름으로 부릅니다. 그 안의 count는 static 필드이므로 객체 없이도 읽을 수 있습니다. 출력은 ' + st.ex + '입니다.', 'good'); }
    if (isS) {
      sum.push('static 필드는 클래스에 하나뿐이라 모든 객체가 같은 값을 봅니다. a.hit() 2번과 b.hit() ' + nb + '번이 같은 count를 올려서, 어느 객체로 읽어도 합계인 ' + st.sv + '입니다.' + (nb === 0 ? ' b.hit()은 한 번도 부르지 않았는데도 b.count가 0이 아닙니다.' : ''));
      sum.push('a.count처럼 객체 변수로 static 필드를 쓰면 객체마다 따로 있는 값처럼 보여 헷갈립니다. static 멤버는 Counter.count처럼 클래스 이름으로 쓰는 것이 원칙입니다.');
      if (x === 'none') sum.push('객체마다 달라야 하는 값(이름, 수량)은 인스턴스 필드로, 클래스 전체에 하나면 되는 값(상수, 만들어진 객체 수)은 static 필드로 둡니다.');
      if (x === 'sm') sum.push('static 메서드는 객체 없이 Counter.report()로 부릅니다. 그 안에서는 static 필드와 다른 static 메서드를 이름만으로 쓸 수 있습니다. count에서 static을 떼면 같은 report()가 컴파일되지 않습니다.');
      if (x === 'cls0') sum.push('static 필드는 객체가 하나도 없어도 클래스와 함께 있습니다. 그래서 객체를 만들기 전에 Counter.count가 0으로 읽혔습니다. 인스턴스 필드는 객체가 만들어져야 생기므로 이렇게 읽을 수 없습니다.');
    } else {
      sum.push('인스턴스 필드는 객체마다 따로 있습니다. a.hit()은 a의 count만, b.hit()은 b의 count만 올립니다.');
      sum.push('선언에 static을 붙이면 같은 코드의 출력은 ' + (2 + nb) + ' ' + (2 + nb) + '입니다.');
    }
    return { events: ev, summary: sum, row: ['성공', st.ab, st.ex || '추가한 줄 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, isS = sim.c.decl === 'static';
    if (!s) { H.text(v, '실행을 누르면 컴파일 단계부터 한 단계씩 진행합니다.'); return; }
    if (s.err) { H.title(v, '컴파일 오류'); H.text(v, 'javac: ' + s.err); return; }
    var rows = [];
    if (isS) rows.push({ cells: ['클래스 Counter', { v: s.sv === '' ? '아직 없음' : s.sv, cls: s.hot === 'sf' ? 'hot' : '' }, 'a와 b가 함께 씀'] });
    else { if (s.a) rows.push({ cells: ['a가 가리키는 객체', { v: s.av, cls: s.hot === 'oa' ? 'hot' : '' }, 'a만 씀'] }); if (s.b) rows.push({ cells: ['b가 가리키는 객체', { v: s.bv, cls: s.hot === 'ob' ? 'hot' : '' }, 'b만 씀'] }); }
    H.table(v, ['count가 있는 곳', '값', '누가 쓰는가'], rows, isS ? 'count 변수는 클래스에 1개' : 'count 변수는 객체마다 1개');
    if (!rows.length) H.text(v, '아직 객체가 없어서 count도 없습니다.');
  },
  // 그림: 왼쪽은 클래스(하나뿐), 오른쪽은 힙의 객체 둘. count 상자가 왼쪽에 하나 있는지, 오른쪽 객체마다 있는지가 핵심이다. hit()이 어느 count를 올리는지 화살표로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { cls: false, sv: '', a: false, av: '', b: false, bv: '', hot: '', by: '', ab: '', ex: '', err: '', errAt: '' };
    var isS = c.decl === 'static', x = c.extra, hasM = x === 'sm' || x === 'smThis';
    P.size(680, 264);
    P.region('cl', 16, 16, 300, 168, '클래스 Counter (객체 수와 상관없이 하나)');
    P.region('hp', 364, 16, 300, 168, '힙 (객체마다 따로)');
    if (isS) P.box('sf', 30, 52, 272, 46, { cls: s.sv === '' ? 'ghost' : s.hot === 'sf' ? 'hot now' : 'good', title: 'static 필드 count', sub: '모든 객체가 함께 쓰는 하나', right: s.sv === '' ? '' : s.sv });
    else P.box('sf', 30, 52, 272, 46, { cls: s.errAt === 'sf' ? 'bad' : 'ghost', title: 'static 필드 없음', sub: 'count는 객체마다 따로 있음' });
    if (hasM) P.box('mt', 30, 114, 272, 46, { cls: s.errAt === 'mt' ? 'bad' : s.hot === 'mt' ? 'hot now' : 'plain', title: 'static 메서드 report()', sub: '객체 없이 부름. this가 없음' });
    else P.box('mt', 30, 114, 272, 46, { cls: s.errAt === 'mt' ? 'bad' : s.by ? 'hot' : 'plain', title: '인스턴스 메서드 hit()', sub: s.by ? '지금 대상 객체: ' + s.by : '객체를 대상으로 불러야 함' });
    function obj(id, name, on, val) {
      if (!on) { P.box(id, 378, id === 'oa' ? 52 : 114, 272, 46, { cls: 'ghost', title: name, sub: s.err ? '실행되지 않음' : '아직 객체가 없음' }); return; }
      P.box(id, 378, id === 'oa' ? 52 : 114, 272, 46, { cls: s.hot === id ? 'hot now' : 'wait', title: name + '의 객체', sub: isS ? '자기 count 없음' : '자기만의 count', right: isS ? '' : val });
    }
    obj('oa', 'a', s.a, s.av); obj('ob', 'b', s.b, s.bv);
    if (isS && s.by) P.arrow('wr', 'o' + s.by + ':l', 'sf:r', { cls: 'hot', label: 'count++' });
    if (isS && s.hot === 'read') { P.arrow('ra', 'oa:l', 'sf:r:0.35', { cls: 'good' }); P.arrow('rb', 'ob:l', 'sf:r:0.7', { cls: 'good' }); }
    var exT = { none: '추가한 줄 없음', sm: 'Counter.report()', smThis: 'Counter.report()', cls0: '객체 만들기 전 Counter.count', clsHit: 'Counter.hit()' }[x];
    P.box('o1', 16, 204, 320, 38, { cls: s.err ? 'bad' : s.ab ? 'good' : 'ghost', title: s.err ? '컴파일 오류' : 'a.count와 b.count', right: s.err ? '실행되지 않음' : s.ab || '?' });
    P.box('o2', 344, 204, 320, 38, { cls: s.err ? 'bad' : s.ex ? 'good' : 'ghost', title: exT, right: s.err ? '오류' : x === 'none' ? '' : s.ex || '?' });
    P.note(isS ? 'count 상자가 왼쪽 클래스에 하나만 있습니다. a로 부르든 b로 부르든 hit()은 이 하나를 올리고, a.count와 b.count도 이 하나를 읽습니다.' : 'count가 오른쪽 객체마다 하나씩 있습니다. 메서드의 코드 자체는 클래스에 하나만 있고, 인스턴스 메서드는 불릴 때 대상 객체를 넘겨받습니다.');
  },
  assume: '서른 가지 조합을 검증 환경의 JDK 21에서 같은 코드로 실제로 컴파일하고 실행해, 컴파일 결과와 오류 메시지, 출력을 대조했습니다. 요약에서 고치는 방법으로 든 "객체를 인자로 받는 static 메서드"가 컴파일되고 실행된다는 것, 객체 변수로 static 필드를 읽을 때 객체가 쓰이지 않는다는 것(null인 변수로 읽어도 예외가 나지 않음)도 실행으로 확인했습니다. 단순화한 점: 그림의 "클래스" 영역은 JVM이 클래스 정보를 두는 곳을 뭉뚱그린 것이며, static 필드가 메모리의 정확히 어디에 놓이는지는 JVM 구현에 따라 다릅니다. 클래스가 하나라는 것은 클래스 로더 하나가 그 클래스를 읽는 이 실습의 경우이며, 서로 다른 클래스 로더가 같은 클래스를 따로 읽으면 static 필드도 따로 생깁니다. 클래스가 준비되는 정확한 시점(처음으로 객체를 만들거나 static 멤버를 쓸 때)은 "실행 시작" 한 단계로 줄였습니다. a.count처럼 객체 변수로 static 필드를 쓰는 코드는 컴파일되지만 권장되지 않으며, 공유된다는 것을 보이려고 넣었습니다. 오류 메시지는 javac의 영어 메시지 첫 줄입니다.',
});
