Lab.register({
  id: 'static_basic', nav: 'static', cat: '기초개념', mode: 'step', basic: true, deep: ['static'],
  title: 'static은 무엇이고, 붙이면 무엇이 달라지는가',
  intro: 'static은 필드(클래스 안에 선언한 변수)나 메서드 앞에 붙이는 키워드입니다(이 실습은 필드만 봅니다). static이 없는 필드는 객체를 만들 때마다 그 객체 안에 따로 하나씩 생깁니다. static을 붙이면 객체마다가 아니라 클래스에 하나만 있고, 그 클래스의 모든 객체가 그 하나를 같이 씁니다. 그래서 static인 필드는 객체 없이 Counter.count처럼 클래스 이름으로 쓸 수 있고, static이 아닌 필드는 "어느 객체의 것인지"가 정해져 있어야 해서 클래스 이름만으로는 쓸 수 없습니다. 이 실습은 count 앞에 static을 붙였다 떼고 읽는 방법도 바꿔 가며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주고 무엇이 출력되는지, count가 어디에 있는지를 봅니다.',
  terms: ['static', '필드', '인스턴스 필드와 static 필드', '클래스와 객체'],
  controls: [
    { id: 'st', label: 'count 앞에 static을 적는다', type: 'check', value: true },
    { id: 'read', label: '출력할 때 count를 읽는 방법', type: 'select', value: 'cls', options: [['cls', 'Counter.count로 읽는다 (클래스 이름으로)'], ['obj', 'a.count로 읽는다 (객체 a로)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'static은 어떻게 생겼고, 객체 둘이 한 번씩 올리면 count는 얼마가 되나', d: 'count 앞에 static이 있고 클래스 이름으로 읽습니다. 컴파일에 성공하고 2가 출력됩니다.', v: { st: true, read: 'cls' } },
    { t: 'static을 지우고 a.count로 읽으면', q: 'static을 지우고 a.count로 읽으면', d: 'count가 객체마다 따로 있어서 a의 count만 1입니다. 컴파일에 성공하고 1이 출력됩니다.', v: { st: false, read: 'obj' } },
    { t: 'static을 지우고 Counter.count로 읽으면', q: 'static을 지우고 Counter.count로 읽으면', d: '클래스 이름만으로는 어느 객체의 count인지 정할 수 없어 컴파일 오류가 납니다.', v: { st: false, read: 'cls' } },
    { t: 'static을 둔 채 a.count로 읽으면', q: 'static을 둔 채 a.count로 읽으면', d: '객체 a로 읽어도 읽는 것은 클래스에 하나뿐인 count입니다. 컴파일에 성공하고 2가 출력됩니다.', v: { st: true, read: 'obj' } },
  ],
  // 컴파일러가 알려 주는 오류의 종류(실제 javac의 진단 코드를 옮긴 것)
  errNonStatic: 'static이 아닌 count를 클래스 이름으로 읽을 수 없음',
  code: function (c) {
    var o = ['class Counter {'];
    if (c.st) o.push('    // static: 객체마다가 아니라 Counter 클래스에 하나만 있다');
    o.push('    ' + (c.st ? 'static ' : '') + 'int count = 0;', '    void up() {', '        count = count + 1;', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) {', '        Counter a = new Counter();', '        Counter b = new Counter();', '        a.up();', '        b.up();', '        System.out.println(' + (c.read === 'cls' ? 'Counter.count' : 'a.count') + ');', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.st ? 'static 있음' : 'static 없음') + ' · ' + (c.read === 'cls' ? 'Counter.count로 읽음' : 'a.count로 읽음'); },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '출력', 'count가 있는 곳'],
  simulate: function (c) {
    var ev = [], sum = [], READ = c.read === 'cls' ? 'Counter.count' : 'a.count', READ_LINE = 'System.out.println(' + READ + ');'; var J = function (v, a, b) { var s = String(v), ch = s.charCodeAt(s.length - 1), k = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : [1, 8, 0, 1, 0, 0, 1, 8, 8, 0]['0123456789'.indexOf(s.slice(-1))] || 0; return s + (a === '으로' ? (k && k !== 8 ? a : b) : k ? a : b); };   // 값 뒤에 붙일 조사를 고른다
    var fail = !c.st && c.read === 'cls';
    var where = c.st ? '클래스에 하나' : '객체마다 하나씩';
    var st = { hot: '', by: '', objs: 0, cells: 0, cls: null, a: null, b: null, bad: {}, compile: '', errText: '', ran: false, out: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var errNonStatic = this.errNonStatic;

    // 1. Counter 클래스의 count 선언을 읽는다
    st.hot = 'cl';
    st.checks.push(['count가 있는 곳', { v: where, cls: '' }]);
    push('컴파일러가 소스를 위에서부터 읽습니다. 먼저 Counter 클래스의 count 선언을 읽습니다.' + (c.st ? ' count 앞에 static이 있으므로, count는 객체마다 생기는 것이 아니라 Counter 클래스에 하나만 있는 변수로 정해집니다.' : ' count 앞에 static이 없으므로, count는 Counter 객체를 만들 때마다 그 객체 안에 따로 하나씩 생기는 변수로 정해집니다.'), '');

    // 2. 읽는 줄을 확인한다
    st.hot = 'rd';
    if (fail) {
      st.bad.cl = true; st.errText = errNonStatic;
      st.checks.push([READ_LINE + ' 줄', { v: '오류: ' + errNonStatic, cls: 'bad' }]);
      push('컴파일러가 main 안의 ' + READ_LINE + ' 줄을 확인합니다. Counter.count는 클래스 이름만 쓰고 객체가 없습니다. 그런데 count는 static이 아니어서 객체마다 따로 있으므로, 어느 객체의 count인지 정해지지 않습니다. 그래서 오류가 납니다(javac: non-static variable count cannot be referenced from a static context).', 'bad');
    } else if (c.st && c.read === 'cls') {
      st.checks.push([READ_LINE + ' 줄', { v: '오류 아님', cls: 'good' }]);
      push('컴파일러가 main 안의 ' + READ_LINE + ' 줄을 확인합니다. Counter.count는 클래스 이름으로 count를 가리킵니다. count가 static이어서 Counter 클래스에 하나 있으므로, 객체 없이도 가리킬 수 있습니다. 오류가 아닙니다.', 'good');
    } else if (c.st) {
      st.checks.push([READ_LINE + ' 줄', { v: '오류 아님 (경고 없음)', cls: 'good' }]);
      push('컴파일러가 main 안의 ' + READ_LINE + ' 줄을 확인합니다. a.count는 객체 a로 count를 가리키는 모양입니다. 하지만 count가 static이어서 가리키는 것은 a 안의 칸이 아니라 Counter 클래스에 하나뿐인 count입니다. 컴파일은 됩니다. 기본 설정의 javac는 아무것도 알리지 않았고, -Xlint:all 옵션을 주면 "static variable should be qualified by type name, Counter, instead of by an expression"라는 경고가 나왔습니다.', 'good');
    } else {
      st.checks.push([READ_LINE + ' 줄', { v: '오류 아님', cls: 'good' }]);
      push('컴파일러가 main 안의 ' + READ_LINE + ' 줄을 확인합니다. a.count는 객체 a로 count를 가리킵니다. count가 static이 아니어서 객체마다 따로 있지만, 어느 객체인지(a)가 정해져 있으므로 오류가 아닙니다.', 'good');
    }

    // 3. 컴파일 결과
    st.hot = '';
    if (fail) {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 1개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 1개이고, "' + errNonStatic + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없고, new Counter()도 한 번도 실행되지 않습니다.', 'bad');
    } else {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다.', 'good');
    }

    var out = '';
    if (!fail) {
      // 4. new Counter() 두 번
      st.hot = 'oa'; st.objs = 1;
      if (c.st) { st.cls = 0; st.cells = 1; } else { st.a = 0; st.cells = 1; }
      push('java Main으로 실행합니다. main이 시작되고, 첫 new Counter()가 Counter 객체를 만들어 변수 a에 담습니다.' + (c.st ? ' count는 static이어서 이 객체 안에는 count 칸이 생기지 않습니다. Counter 클래스에 count 칸이 하나 있고 값은 0입니다.' : ' count는 static이 아니어서 이 객체 안에 count 칸이 생기고, 값은 0입니다.'), '');
      st.hot = 'ob'; st.objs = 2;
      if (!c.st) { st.b = 0; st.cells = 2; }
      push('두 번째 new Counter()가 Counter 객체를 하나 더 만들어 변수 b에 담습니다.' + (c.st ? ' 객체는 둘이 되었지만 count 칸은 새로 생기지 않았습니다. 여전히 Counter 클래스에 하나뿐입니다.' : ' 이 객체 안에도 count 칸이 따로 생기고 값은 0입니다. 이제 count 칸은 a의 것과 b의 것, 둘입니다.'), '');

      // 5. a.up()
      if (c.st) { st.cls = 1; st.hot = 'cl'; st.by = 'a'; } else { st.a = 1; st.hot = 'oa'; }
      push('a.up() 호출이 실행됩니다. up 메서드의 count = count + 1; 은 count를 읽어 1을 더해 다시 담습니다.' + (c.st ? ' 이 count는 Counter 클래스에 하나뿐인 칸이어서, 그 칸의 값이 0에서 1이 됩니다. 객체 b를 거쳐 읽어도 지금 이 칸의 값은 1입니다.' : ' 객체 a를 대상으로 불렀으므로 이 count는 a의 count 칸입니다. a의 count가 0에서 1이 되고, b의 count는 그대로 0입니다.'), '');

      // 6. b.up()
      if (c.st) { st.cls = 2; st.hot = 'cl'; st.by = 'b'; } else { st.b = 1; st.hot = 'ob'; }
      push('b.up() 호출이 실행됩니다. 같은 count = count + 1; 입니다.' + (c.st ? ' b의 up도 같은 하나뿐인 칸을 올리므로, 값이 1에서 2가 됩니다. a가 올린 것 위에 b가 더한 것입니다.' : ' 이번에는 객체 b를 대상으로 불렀으므로 b의 count 칸이 0에서 1이 됩니다. a의 count는 그대로 1입니다. 두 칸은 서로 다른 칸입니다.'), '');

      // 7. 읽는다
      st.by = c.st && c.read === 'obj' ? 'a' : '';
      st.hot = c.st ? 'cl' : 'oa';
      out = c.st ? '2' : '1';
      st.ran = true; st.out = out;
      st.checks.push(['출력', { v: out, cls: 'good' }]);
      if (c.st && c.read === 'cls') push(READ_LINE + ' 줄이 실행됩니다. Counter.count는 Counter 클래스에 하나 있는 count이고, 그 값 ' + J(out, '이', '가') + ' 출력됩니다.', 'good');
      else if (c.st) push(READ_LINE + ' 줄이 실행됩니다. a.count는 객체 a로 가리키는 모양이지만 count는 static이어서, 읽는 것은 Counter 클래스에 하나 있는 count입니다. 그 값 ' + J(out, '이', '가') + ' 출력됩니다. a와 b가 같은 칸을 올렸으므로 b.count로 읽어도 같은 값입니다.', 'good');
      else push(READ_LINE + ' 줄이 실행됩니다. a.count는 a의 count 칸이고, 그 값 ' + J(out, '이', '가') + ' 출력됩니다. b의 count 칸도 값이 1이고 서로 다른 칸이므로, 둘이 올린 값을 합친 2는 어디에도 없습니다.', 'good');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (c.st && c.read === 'cls') {
      sum.push('static 필드는 필드 앞에 static을 붙인 것입니다. 일반 필드와 다른 곳은 객체마다가 아니라 클래스에 하나만 있고, 그 클래스의 모든 객체가 그 하나를 같이 쓴다는 것입니다. a와 b가 up()을 한 번씩 불러 count가 2가 된 것은, 둘이 같은 count를 올렸기 때문입니다.');
      sum.push('static이어서 Counter.count처럼 객체 없이 클래스 이름으로 읽을 수 있었습니다. static이 없는 필드는 객체마다 따로 있어서, 클래스 이름만으로는 어느 객체의 것인지 정할 수 없습니다.');
    } else if (c.st) {
      sum.push('static을 둔 채 a.count로 읽어도 컴파일에 성공했고 2가 출력됐습니다. 객체 a로 쓴 모양이지만 읽은 것은 a 안의 칸이 아니라 Counter 클래스에 하나뿐인 count입니다.');
      sum.push('static 필드는 객체의 것이 아니라 클래스의 것이어서, 어느 객체로 읽어도 같은 하나를 읽습니다. 그래서 기본 설정의 javac는 아무것도 알리지 않았고, -Xlint:all 옵션을 주면 클래스 이름으로 쓰라는 경고를 냈습니다.');
    } else if (c.read === 'obj') {
      sum.push('static이 없으면 count는 객체마다 따로 있습니다. a.up()은 a의 count만, b.up()은 b의 count만 올려서 a.count는 1이었고, 컴파일에 성공해 1이 출력됐습니다.');
      sum.push('b의 count도 1이어서(읽는 줄만 b.count로도 출력하도록 바꿔 실행해 확인했습니다) 객체 둘의 count는 서로 다른 칸입니다. 객체가 늘면 count 칸도 그만큼 늘어납니다.');
    } else {
      sum.push('static이 없는 count는 객체마다 따로 있어서, Counter라는 클래스 이름만으로는 어느 객체의 count인지 정할 수 없습니다. 컴파일러가 오류를 알렸고, 컴파일에 실패해 실행할 수 없었습니다.');
      sum.push('같은 소스에서 읽는 줄만 a.count와 b.count로 바꿔 실행하면 1과 1이 출력됩니다. count는 a에도 b에도 따로 있습니다. 클래스 이름으로 읽으려면 count가 클래스에 하나 있어야 하고, 그것이 static입니다.');
    }
    return { events: ev, summary: sum, nerr: fail ? 1 : 0, errAt: fail ? [READ_LINE] : [], row: [fail ? '오류' : '성공', fail ? errNonStatic : '없음', fail ? '실행할 수 없음' : out, where] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    if (s.cells) {
      var rows = c.st ? [['Counter 클래스의 count', s.cls]] : [['a의 count', s.a], ['b의 count', s.b]].filter(function (r) { return r[1] !== null; });
      H.table(v, ['count 칸', '값'], rows.map(function (r) { return { cls: '', cells: [r[0], { v: String(r[1]), cls: 'hot' }] }; }), 'count 칸과 값');
    }
    H.counters(v, [[s.objs, '만들어진 Counter 객체'], [s.cells, 'count 칸']]);
  },
  // 그림: 왼쪽에 Counter(클래스) 상자, 오른쪽에 객체 a, b 상자. static이면 count 칸이 클래스 상자 안에 하나, 아니면 객체 상자마다 하나씩. 올리거나 읽는 칸이 노랗게 보이고, 아래에 컴파일 결과와 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 300);
    var hot = s ? s.hot : '', bad = s ? s.bad : {}, failed = s && s.compile === 'err';
    var clSub = c.st ? ['static int count', !s || s.cls === null ? '값: 실행 전' : 'count: ' + s.cls] : ['count 칸은 여기에 없음', '객체마다 하나씩 생김'];
    P.box('cl', 14, 20, 270, 140, { cls: bad.cl ? 'bad' : hot === 'cl' ? 'hot now' : 'plain', title: 'Counter (클래스)', sub: clSub });
    function obj(id, y, name, made, n) {
      var sub = made ? (c.st ? 'count 칸 없음' : 'count: ' + n) : failed ? '만들어지지 않음' : '아직 없음';
      P.box(id, 394, y, 272, 62, { cls: made ? (hot === id ? 'hot now' : 'plain') : 'ghost', title: name + '가 가리키는 Counter 객체', sub: sub });
    }
    obj('oa', 20, 'a', s && s.objs >= 1, s ? s.a : null);
    obj('ob', 98, 'b', s && s.objs >= 2, s ? s.b : null);
    if (c.st && s && s.by === 'a') P.arrow('ua', 'oa:l', 'cl:r:0.3', { cls: 'hot' });
    if (c.st && s && s.by === 'b') P.arrow('ub', 'ob:l', 'cl:r:0.7', { cls: 'hot' });
    P.box('r1', 14, 184, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : failed ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 246, 652, 36, { cls: s && s.ran ? 'good' : failed ? 'bad' : 'ghost', title: '출력', right: s && s.ran ? s.out : failed ? '실행할 수 없음' : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 네 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드(compiler.err.non-static.cant.be.ref를 화면의 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력입니다. "count가 있는 곳" 열은 같은 선언에서 읽는 줄만 a.count와 b.count를 각각 출력하도록 바꾼 소스를 따로 컴파일해 실행한 값으로 확인했습니다(static이 있으면 2와 2, 없으면 1과 1). 컴파일 오류가 나는 조합에서도 읽는 줄만 바꾼 소스는 컴파일되어 실행됩니다. 단계 문장이 기대는 사실인 a.up() 직후의 값(static이면 a.count와 b.count가 1과 1, 아니면 1과 0)도 따로 실행해 확인했습니다. 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. static 필드는 객체를 몇 개 만들든 변수가 정확히 하나라는 것과 static이 아닌 필드는 객체를 만들 때마다 그 객체의 변수가 생긴다는 것은 8.3.1.1절을, 객체로 static 필드를 읽으면 그 식은 계산하고 결과는 버리며 필드의 값이 쓰인다는 것은 15.11.1절을, 클래스 이름으로 static이 아닌 필드를 쓰면 컴파일 오류라는 것은 6.5.6.2절을 따랐습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. a.count처럼 객체로 static 필드를 읽을 때 이 javac는 기본 설정에서 경고를 내지 않았고, -Xlint:all 옵션을 주면 그 줄에 "static variable should be qualified by type name, Counter, instead of by an expression"라는 경고 하나를 냈습니다. 경고는 명세가 정한 것이 아니라 이 javac의 동작입니다. static은 이 밖에도 메서드와 초기화 블록에 붙일 수 있고, static 메서드 안에서는 대상 객체가 없어 static이 아닌 필드를 이름만으로 쓸 수 없는데, 이 실습은 static 필드만 다뤘습니다. static 필드의 값이 정해지는 시점이나 여러 스레드가 함께 고칠 때의 문제도 다루지 않았습니다. static 메서드와 static이 아닌 멤버의 관계는 "세부 동작 실습: static과 인스턴스"에서 다룹니다.',
});
