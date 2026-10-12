Lab.register({
  id: 'inner', nav: '내부 클래스와 익명 클래스', cat: '자바 언어', mode: 'step',
  title: '클래스 안에 만든 클래스는 바깥 객체와 어떻게 이어져 있나',
  intro: '클래스 안에 또 클래스를 선언할 수 있습니다. static을 붙이지 않은 내부 클래스의 객체는 자기를 만든 바깥 객체를 가리키는 참조를 갖고 있어서, 바깥 객체 없이는 만들 수 없습니다. 이름 없이 그 자리에서 만드는 익명 클래스와 람다는 주변의 지역 변수를 쓸 수 있지만 그 변수의 값을 바꾸면 컴파일 오류가 나고, 둘 안에서 this가 가리키는 것도 서로 다릅니다.',
  terms: ['내부 클래스와 중첩 클래스', '익명 클래스', '사실상 final(effectively final)', '람다 표현식', 'static'],
  controls: [
    { id: 'kind', label: '안쪽에 만드는 것', type: 'select', value: 'inner', options: [['inner', '인스턴스 내부 클래스 (static 없음)'], ['nested', 'static 중첩 클래스'], ['anon', '익명 클래스'], ['lambda', '람다']] },
    { id: 'use', label: '해 보려는 것', type: 'select', value: 'alone', options: [['field', '바깥 객체를 만들고, 안쪽에서 바깥 필드 name을 읽기'], ['alone', '바깥 객체 없이 안쪽 객체만 만들기']], show: function (c) { return c.kind === 'inner' || c.kind === 'nested'; } },
    { id: 'loc', label: '안에서 쓰는 지역 변수 count', type: 'select', value: 'keep', options: [['keep', '값을 바꾸지 않음'], ['change', '만든 뒤에 count = 2로 바꿈'], ['arr', '배열에 담아 두고 칸의 값만 바꿈']], show: function (c) { return c.kind === 'anon' || c.kind === 'lambda'; }, hint: '익명 클래스와 람다는 자기를 만든 메서드의 지역 변수를 안에서 쓸 수 있습니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'static 없는 인스턴스 내부 클래스인데 바깥 객체 없이 안쪽 객체만 만들면 어떻게 되나', d: '내부 클래스를 바깥 객체 없이 만들기. 컴파일 오류가 납니다.', v: { kind: 'inner', use: 'alone', loc: 'keep' } },
    { t: '바깥 객체로 만들면', q: '바깥 객체를 만들고 안쪽에서 바깥 필드 name을 읽으면', d: '안쪽 객체가 바깥 객체를 따라가 필드를 읽습니다.', v: { kind: 'inner', use: 'field', loc: 'keep' } },
    { t: 'static 중첩 클래스', q: '인스턴스 내부 클래스 대신 static 중첩 클래스를 쓰면', d: '바깥 객체 없이 만들 수 있습니다.', v: { kind: 'nested', use: 'alone', loc: 'keep' } },
    { t: 'static 중첩 클래스에서 바깥 필드 읽기', q: '바깥 객체를 만들고 static 중첩 클래스 안에서 바깥 필드 name을 읽으면', d: '가리키는 바깥 객체가 없어 컴파일 오류가 납니다.', v: { kind: 'nested', use: 'field', loc: 'keep' } },
    { t: '익명 클래스의 this', q: '인스턴스 내부 클래스 대신 익명 클래스를 쓰면', d: 'this는 익명 클래스로 만든 객체 자신입니다.', v: { kind: 'anon', use: 'alone', loc: 'keep' } },
    { t: '람다의 this', q: '인스턴스 내부 클래스 대신 람다를 쓰면', d: 'this는 람다를 적은 바깥 객체입니다.', v: { kind: 'lambda', use: 'alone', loc: 'keep' } },
    { t: '지역 변수의 값을 바꾸면', q: '람다를 만든 뒤에 그 안에서 쓰는 지역 변수 count를 count = 2로 바꾸면', d: '람다 안에서 쓰는 지역 변수를 바꾸면 컴파일 오류가 납니다.', v: { kind: 'lambda', use: 'alone', loc: 'change' } },
  ],
  code: function (c) {
    var main = function (body) { return '\n\npublic class Main {\n    public static void main(String[] args) {\n' + body + '    }\n}'; };
    if (c.kind === 'inner' || c.kind === 'nested') {
      var st = c.kind === 'nested', cn = st ? 'Nested' : 'Inner', field = c.use === 'field';
      var cls = 'class Outer {\n    String name = "A";\n\n    '
        + (st ? 'static class Nested {              // static 중첩 클래스' : 'class Inner {                      // 인스턴스 내부 클래스 (static 없음)')
        + '\n        String who() { return ' + (field ? 'name; }      // 바깥 객체의 필드' : '"안쪽"; }') + '\n    }\n}';
      var body = field
        ? '        Outer o = new Outer();\n        Outer.' + cn + ' in = ' + (st ? 'new Outer.Nested();' : 'o.new Inner();          // 바깥 객체 o로 만든다')
          + '\n        o.name = "B";                          // 만든 뒤에 바깥 객체의 필드를 바꾼다\n        System.out.println(in.who());\n'
        : '        Outer.' + cn + ' in = new Outer.' + cn + '();   // 바깥 객체 없이 만든다\n        System.out.println(in.who());\n';
      return cls + main(body);
    }
    var arr = c.loc === 'arr', cv = arr ? 'count[0]' : 'count';
    var decl = arr ? '        int[] count = { 1 };                 // 지역 변수 (배열을 가리킨다)\n' : '        int count = 1;                       // 지역 변수\n';
    var p1 = 'System.out.println("count = " + ' + cv + ');\n', p2 = 'System.out.println("this = " + this.getClass().getName());\n';
    var obj = c.kind === 'anon'
      ? '        Runnable r = new Runnable() {        // 익명 클래스\n            @Override\n            public void run() {\n                ' + p1 + '                ' + p2 + '            }\n        };\n'
      : '        Runnable r = () -> {                 // 람다\n            ' + p1 + '            ' + p2 + '        };\n';
    var chg = c.loc === 'change' ? '        count = 2;                           // 만든 뒤에 값을 바꾼다\n'
      : arr ? '        count[0] = 2;                        // 변수는 그대로 두고 배열 칸의 값만 바꾼다\n' : '';
    return 'class Outer {\n    Runnable make() {\n' + decl + obj + chg + '        return r;\n    }\n}' + main('        Runnable r = new Outer().make();\n        r.run();\n');
  },
  label: function (c) {
    var k = { inner: '내부 클래스', nested: 'static 중첩 클래스', anon: '익명 클래스', lambda: '람다' }[c.kind];
    if (c.kind === 'inner' || c.kind === 'nested') return k + ' · ' + (c.use === 'field' ? '바깥 필드 읽기' : '바깥 객체 없이 만들기');
    return k + ' · count ' + { keep: '바꾸지 않음', change: '= 2로 바꿈', arr: '배열 칸만 바꿈' }[c.loc];
  },
  columns: ['컴파일', '출력', '바깥 객체와의 관계'],
  simulate: function (c) {
    var member = c.kind === 'inner' || c.kind === 'nested', nested = c.kind === 'nested', anon = c.kind === 'anon', arr = c.loc === 'arr';
    var ev = [], sum = [], err = '', rel = '-';
    var st = { cmp: '?', o: '', inn: false, ref: false, cnt: '', live: false, r: false, cap: '', th: '', out: [] };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(msg, meaning) { err = msg; push('오류 메시지: "' + msg + '". ' + meaning + ' 컴파일이 되지 않았으므로 프로그램은 한 줄도 실행되지 않습니다.', 'bad'); }
    var passed = '컴파일: 오류 없이 통과했습니다. 이제 main의 첫 줄부터 실행합니다.';
    if (member && c.use === 'alone' && !nested) {
      push('컴파일러가 Outer 클래스를 읽습니다: Inner에는 static이 없습니다. static이 없는 내부 클래스의 객체는 반드시 어느 한 Outer 객체에 딸려서 만들어집니다.');
      st.cmp = 'err';
      push('new Outer.Inner(): 컴파일 오류입니다. main은 static 메서드라서 이 자리에는 Outer 객체가 없고, 코드에서 따로 정해 주지도 않았습니다. 어느 바깥 객체에 딸린 안쪽 객체인지 정할 수 없어 컴파일러가 막습니다.', 'bad');
      fail('an enclosing instance that contains Outer.Inner is required', 'Outer.Inner를 품을 바깥 객체가 있어야 한다는 뜻입니다.');
      sum.push('static이 없는 내부 클래스의 객체는 바깥 객체를 가리키는 참조를 갖도록 만들어집니다. 그래서 바깥 객체가 먼저 있어야 하고, 바깥 객체 o가 있으면 o.new Inner()로 만듭니다.');
      sum.push('안쪽 클래스가 바깥 객체의 필드나 메서드를 쓰지 않는다면 static을 붙여 중첩 클래스로 만드는 편이 낫습니다.');
    } else if (member && c.use === 'field' && nested) {
      push('컴파일러가 Outer 클래스를 읽습니다: Nested에는 static이 붙어 있습니다. static 중첩 클래스의 객체는 어느 Outer 객체와도 이어져 있지 않습니다.');
      st.cmp = 'err';
      push('return name: 컴파일 오류입니다. name은 Outer 객체마다 따로 있는 필드입니다. Nested 객체는 가리키는 Outer 객체가 없으므로 누구의 name을 읽어야 하는지 정할 수 없습니다.', 'bad');
      fail('non-static variable name cannot be referenced from a static context', 'static인 곳에서는 static이 아닌 변수 name을 쓸 수 없다는 뜻입니다. main에서 Outer 객체 o를 만들더라도 Nested 객체는 그 o를 알지 못합니다.');
      sum.push('static 중첩 클래스는 바깥 클래스 안에 자리만 빌린 독립된 클래스입니다. 바깥 객체를 가리키는 참조가 없으므로 바깥 객체의 필드를 그냥 쓸 수 없습니다.');
      sum.push('바깥 객체의 필드가 필요하면 static을 떼어 내부 클래스로 만들거나, 필요한 값을 생성자로 넘겨줍니다.');
    } else if (member && !nested) {
      st.cmp = 'ok'; push(passed);
      st.o = 'A';
      push('Outer o = new Outer(): 바깥 객체를 만듭니다. name 필드의 값은 "A"입니다.');
      st.inn = true; st.ref = true;
      push('o.new Inner(): o를 바깥 객체로 삼아 안쪽 객체를 만듭니다. 안쪽 객체는 자기를 만든 바깥 객체 o를 가리키는 참조를 숨은 필드로 갖게 됩니다.');
      st.o = 'B';
      push('o.name = "B": 바깥 객체의 필드를 "B"로 바꿉니다. 안쪽 객체에는 아무 일도 하지 않았습니다.');
      st.out.push('B'); rel = '안쪽 객체가 바깥 객체 o를 가리킴';
      push('in.who(): Inner 안의 name은 "내가 가리키는 바깥 객체의 name"입니다. 값을 복사해 둔 것이 아니라 참조를 따라가 지금 값을 읽으므로 B가 출력됩니다.', 'good');
      sum.push('static이 없는 내부 클래스의 객체는 바깥 객체를 가리키는 참조를 갖고 있어서, 바깥 객체의 필드와 메서드를 자기 것처럼 쓸 수 있습니다.');
      sum.push('그 대신 안쪽 객체가 남아 있는 동안에는 바깥 객체도 가비지 컬렉션으로 치워지지 않습니다. 바깥 객체를 쓰지 않는 안쪽 클래스에는 static을 붙이는 이유입니다.');
    } else if (member) {
      st.cmp = 'ok'; push(passed);
      st.inn = true;
      push('new Outer.Nested(): 안쪽 객체를 만듭니다. static 중첩 클래스는 바깥 객체가 없어도 만들 수 있습니다. 이 프로그램에서 Outer 객체는 하나도 만들어지지 않았습니다.', 'good');
      st.out.push('안쪽'); rel = '바깥 객체를 가리키지 않음';
      push('in.who(): 자기 안의 코드만 실행해 "안쪽"을 돌려주고, 그것이 출력됩니다. 이 객체에는 바깥 객체를 가리키는 참조가 없습니다.');
      sum.push('static 중첩 클래스는 이름만 Outer.Nested일 뿐, 따로 선언한 클래스와 같은 방식으로 만들어 씁니다. 바깥 객체를 가리키는 참조가 없습니다.');
    } else if (c.loc === 'change') {
      push('컴파일러가 make()를 읽습니다: count에 1을 넣고, 아래에서 다시 2를 넣습니다. 값이 한 번이라도 바뀌는 지역 변수는 "사실상 final"이 아닙니다.');
      st.cmp = 'err';
      push((anon ? '익명 클래스' : '람다') + ' 안의 count: 컴파일 오류입니다. ' + (anon ? '익명 클래스' : '람다') + '는 지역 변수 자체가 아니라 그 값을 복사해 가져갑니다. 원본이 나중에 바뀌면 복사본과 서로 달라지므로, 자바는 값이 바뀌지 않는 지역 변수만 안에서 쓰게 합니다.', 'bad');
      fail('local variables referenced from ' + (anon ? 'an inner class' : 'a lambda expression') + ' must be final or effectively final', (anon ? '내부 클래스' : '람다') + '에서 쓰는 지역 변수는 final이거나 사실상 final이어야 한다는 뜻입니다.' + (anon ? ' 익명 클래스도 내부 클래스의 한 가지라서 메시지에 inner class라고 나옵니다.' : ''));
      sum.push('"사실상 final"은 final을 적지 않았어도 처음 넣은 값이 한 번도 바뀌지 않는 변수를 말합니다. ' + (anon ? '익명 클래스' : '람다') + '를 만든 뒤에 바꾸든 그 전에 바꾸든, 다시 대입하는 줄이 하나라도 있으면 오류입니다.');
      sum.push('익명 클래스와 람다 모두 같은 규칙을 따릅니다. 값을 바꿔야 한다면 필드에 두거나, 지역 변수 설정의 "배열에 담아 두고 칸의 값만 바꿈"처럼 배열이나 객체에 담아 그 안의 값을 바꿉니다.');
    } else {
      st.cmp = 'ok'; push(passed);
      st.o = 'run';
      push('new Outer().make(): Outer 객체를 만들고 그 객체의 make()를 호출합니다.');
      st.cnt = '1'; st.live = true;
      push(arr ? 'int[] count = { 1 }: 칸이 하나인 배열을 만들고, 지역 변수 count가 그 배열을 가리킵니다.' : 'int count = 1: make() 안의 지역 변수입니다. 지역 변수는 메서드가 끝나면 사라집니다.');
      st.r = true; st.cap = arr ? 'ref' : '1';
      push((anon ? 'new Runnable() { ... }: 이름 없는 클래스를 그 자리에서 선언하면서 객체를 하나 만듭니다.' : '() -> { ... }: 나중에 실행할 코드를 담은 람다를 만듭니다.') + ' 안에서 count를 쓰므로 ' + (arr ? 'count가 가리키는 배열의 참조를 복사해 갖습니다. 배열을 통째로 복사하는 것은 아닙니다.' : 'count의 지금 값 1을 복사해 갖습니다.'));
      if (arr) { st.cnt = '2'; push('count[0] = 2: 변수 count에 다른 것을 대입한 것이 아니라, count가 가리키는 배열의 칸을 바꿨습니다. count는 계속 같은 배열을 가리키므로 "사실상 final"이고, 컴파일러는 막지 않습니다.'); }
      st.live = false; st.o = 'done';
      push('return r: make()가 끝나면서 지역 변수 count는 사라집니다. ' + (arr ? '배열은 r이 복사해 둔 참조가 가리키고 있으므로 남아 있습니다.' : 'r이 복사해 둔 값 1은 그대로 남아 있습니다.'));
      st.out.push('count = ' + (arr ? '2' : '1'));
      push('r.run()의 첫 줄: ' + (arr ? '복사해 둔 참조로 배열을 찾아가 칸의 값을 읽습니다. r을 만든 뒤에 바꾼 값이 보여 count = 2가 출력됩니다.' : '복사해 둔 값을 읽어 count = 1을 출력합니다.'), 'good');
      st.th = anon ? 'self' : 'outer'; st.out.push('this = ' + (anon ? 'Outer$1' : 'Outer')); rel = anon ? 'this는 익명 객체 자신' : 'this는 바깥 Outer 객체';
      push(anon ? 'this.getClass().getName(): 익명 클래스 안의 this는 그 익명 클래스로 만든 객체 자신입니다. 이름이 없는 클래스라서 컴파일러가 Outer$1이라는 이름을 붙였고, 그것이 출력됩니다.' : 'this.getClass().getName(): 람다는 자기만의 this를 갖지 않습니다. 람다 안의 this는 람다를 적은 메서드 make()의 this, 곧 바깥의 Outer 객체입니다. Outer가 출력됩니다.', anon ? '' : 'good');
      sum.push(anon ? '익명 클래스는 새 클래스를 하나 선언하는 것이라서 그 안의 this는 새로 만든 객체입니다. 바깥 객체를 가리키려면 Outer.this라고 적어야 합니다.' : '람다는 새 클래스의 선언이 아니라 코드 조각이라서, 그 안의 this는 람다 바깥의 this와 같습니다. 익명 클래스를 람다로 바꿀 때 this를 쓰는 코드가 있으면 뜻이 달라집니다.');
      sum.push(arr ? '배열에 담으면 변수 count는 바뀌지 않고 배열 안의 값만 바뀌므로 규칙을 통과합니다. 다만 여러 스레드가 함께 쓰는 코드에서는 값이 꼬일 수 있으니 조심해서 써야 합니다.' : 'make()가 끝나 지역 변수가 사라진 뒤에도 복사해 둔 값으로 실행됩니다. 값을 복사해 가기 때문에, 그 변수를 다른 곳에서 바꾸는 것은 허용되지 않습니다.');
    }
    return { events: ev, summary: sum, err: err, row: [err ? '오류: ' + err : '성공', err ? '(실행되지 않음)' : st.out.join(' / '), rel] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, member = c.kind === 'inner' || c.kind === 'nested', arr = c.loc === 'arr';
    if (!s) { H.text(v, '실행을 누르면 컴파일부터 한 단계씩 진행합니다.'); return; }
    if (s.cmp === 'err') { H.text(v, '컴파일 오류가 나면 클래스 파일이 만들어지지 않아 실행할 수 없습니다.'); return; }
    var rows = [];
    if (member) {
      if (s.o) rows.push({ cells: ['o', 'Outer 객체', 'name = "' + s.o + '"', '-'] });
      if (s.inn) rows.push({ cells: ['in', (c.kind === 'nested' ? 'Nested' : 'Inner') + ' 객체', '-', { v: s.ref ? 'o를 가리킴' : '없음', cls: s.ref ? 'hot' : '' }] });
      H.table(v, ['변수', '가리키는 객체', '필드', '바깥 객체 참조'], rows, '만들어진 객체');
    } else {
      if (s.cnt) rows.push({ cls: s.live ? '' : 'gone', cells: ['count', 'make()의 지역 변수', s.live ? (arr ? '배열 { ' + s.cnt + ' }을 가리킴' : s.cnt) : '사라짐 (메서드가 끝남)'] });
      if (s.r) rows.push({ cells: ['r', c.kind === 'anon' ? '익명 클래스의 객체' : '람다', arr ? '복사한 참조 → 배열 { ' + s.cnt + ' }' : '복사한 값 ' + s.cap] });
      H.table(v, ['이름', '무엇인가', '갖고 있는 것'], rows, 'make() 안에서 만들어진 것');
    }
  },
  // 그림: 왼쪽에 바깥 객체(와 지역 변수), 오른쪽에 안쪽 객체. 안쪽 객체가 무엇을 가리키거나 복사해 갖는지를 화살표로 잇는다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { cmp: '?', o: '', inn: false, ref: false, cnt: '', live: false, r: false, cap: '', th: '', out: [] };
    var member = c.kind === 'inner' || c.kind === 'nested', nested = c.kind === 'nested', anon = c.kind === 'anon', arr = c.loc === 'arr', bad = s.cmp === 'err';
    P.size(680, 300);
    if (member) {
      P.region('L', 16, 16, 300, 150, '바깥 객체');
      P.region('R', 364, 16, 300, 150, '안쪽 객체');
      P.box('o', 30, 62, 272, 56, s.o ? { cls: 'wait', title: 'o : Outer 객체', sub: 'name = "' + s.o + '"' } : { cls: 'ghost', title: 'Outer 객체', sub: bad ? '실행되지 않음' : c.use === 'alone' ? '만들지 않음' : '아직 없음' });
      P.box('in', 378, 62, 272, 56, s.inn ? { cls: s.ref ? 'hot' : 'good', title: 'in : ' + (nested ? 'Nested' : 'Inner') + ' 객체', sub: s.ref ? '숨은 필드로 바깥 객체 o를 가리킴' : '바깥 객체를 가리키는 참조 없음' } : { cls: bad ? 'bad' : 'ghost', title: (nested ? 'Nested' : 'Inner') + ' 객체', sub: bad ? '만들 수 없음 (컴파일 오류)' : '아직 없음' });
      if (s.ref) P.arrow('ref', 'in:l', 'o:r', { cls: 'hot', label: '참조' });
    } else {
      P.region('L', 16, 16, 300, 180, 'Outer 객체와 make()의 지역 변수');
      P.region('R', 364, 16, 300, 180, 'r이 가리키는 것');
      P.box('o', 30, 50, 272, 34, s.o ? { cls: s.th === 'outer' ? 'good' : 'wait', title: 'Outer 객체', right: s.o === 'run' ? 'make() 실행 중' : 'make() 끝남' } : { cls: 'ghost', title: 'Outer 객체', right: bad ? '실행되지 않음' : '아직 없음' });
      P.box('cnt', 30, 100, 272, 34, s.cnt && s.live ? { cls: 'wait', title: 'count (지역 변수)', right: arr ? '배열을 가리킴' : s.cnt } : { cls: 'ghost', title: 'count (지역 변수)', right: s.cnt ? '사라짐' : bad ? '값이 두 번 들어감' : '아직 없음' });
      if (arr) P.box('arr', 30, 150, 272, 34, s.cnt ? { cls: 'hot', title: '배열 객체', right: '{ ' + s.cnt + ' }' } : { cls: 'ghost', title: '배열 객체', right: '아직 없음' });
      P.box('r', 378, 74, 272, 74, s.r ? { cls: s.th === 'self' ? 'good' : 'wait', title: anon ? '익명 객체 (클래스 Outer$1)' : '람다', sub: [arr ? '복사해 둔 것: 배열의 참조' : '복사해 둔 값: count = ' + s.cap, s.th === 'self' ? 'this = 이 객체 자신' : s.th === 'outer' ? 'this = 바깥의 Outer 객체' : 'this = ?'] } : { cls: bad ? 'bad' : 'ghost', title: anon ? '익명 객체' : '람다', sub: bad ? '만들 수 없음 (컴파일 오류)' : '아직 없음' });
      if (s.r && s.live && !arr) P.arrow('cap', 'cnt:r', 'r:l', { cls: 'hot', label: '값 복사' });
      if (arr && s.cnt && s.live) P.arrow('ca', 'cnt:b', 'arr:t', {});
      if (arr && s.r) P.arrow('ra', 'r:l:0.8', 'arr:r', { cls: 'hot', label: '참조' });
      if (s.th === 'outer') P.arrow('th', 'r:l:0.2', 'o:r', { cls: 'good', label: 'this' });
    }
    var y = member ? 186 : 212;
    P.box('c1', 16, y, 200, 36, { cls: s.cmp === '?' ? 'ghost' : bad ? 'bad' : 'good', title: '컴파일', right: s.cmp === '?' ? '?' : bad ? '오류' : '성공' });
    P.box('c2', 224, y, 440, 36, { cls: bad ? 'ghost' : s.out.length ? 'good' : 'ghost', title: '출력', right: bad ? '실행되지 않음' : s.out.length ? s.out.join(' / ') : '아직 없음' });
    if (bad && sim.err && shown.length >= 3) P.text('em', 16, y + 62, sim.err, { cls: 'bad' });
    P.note(member ? 'static이 없는 내부 클래스의 객체는 자기를 만든 바깥 객체를 가리킵니다. static 중첩 클래스의 객체는 바깥 객체와 이어져 있지 않습니다.' : '익명 클래스와 람다는 지역 변수의 값을 복사해 갖습니다. 지역 변수는 메서드가 끝나면 사라지지만 복사해 둔 값은 남습니다. this가 가리키는 것은 둘이 서로 다릅니다.');
  },
  assume: '스물네 가지 조합(숨겨진 설정을 빼면 서로 다른 경우는 열 가지)의 코드를 이 PC의 JDK 21에서 그대로 컴파일하고 실행해, 컴파일 성공 여부와 오류 메시지, 출력을 대조했습니다. 내부 클래스의 객체가 바깥 객체를 가리킨다는 것과 static 중첩 클래스에는 그런 참조가 없다는 것은 리플렉션으로 숨은 필드를 확인했습니다. 익명 클래스의 객체와 람다가 지역 변수의 값(배열이면 참조)을 복사해 갖고 있다는 것도 이 JDK에서 숨은 필드로 확인했습니다. 다만 람다가 값을 어떤 모양으로 갖고 있는지는 JVM 구현에 따라 다를 수 있습니다. 오류 메시지의 문장은 JDK 21의 javac 기준이며 버전에 따라 조금 다를 수 있습니다. JDK 21의 javac는 안쪽 클래스가 바깥 객체를 전혀 쓰지 않으면 숨은 참조 필드를 만들지 않습니다(이 실습의 익명 클래스가 그 경우입니다). 그래도 static이 없는 내부 클래스를 만들 때 바깥 객체가 필요하다는 규칙은 같습니다.',
});
