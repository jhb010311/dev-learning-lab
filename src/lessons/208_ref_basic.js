Lab.register({
  id: 'ref_basic', nav: '참조', cat: '기초개념', mode: 'step', basic: true, deep: ['eq'],
  title: '변수에 객체를 담는다는 것은 무슨 뜻인가',
  intro: 'Card a = new Card();에서 변수 a에 들어 있는 것은 Card 객체 자체가 아니라, 그 객체를 가리키는 값입니다. 이 값을 참조라고 부릅니다. 그래서 Card b = a;처럼 변수를 다른 변수에 담으면 객체는 복사되지 않고 가리키는 값만 복사되어, a와 b가 같은 객체를 가리키게 됩니다. 한쪽으로 객체의 내용을 바꾸면 다른 쪽으로 봐도 바뀌어 있습니다. int 같은 기본 타입 변수는 다릅니다. 값 자체가 들어 있어서 int b = a;는 값을 복사합니다. 이 실습은 b에 담는 것을 a에서 복사한 참조, new로 새로 만든 객체, 새로 만든 뒤 owner만 옮겨 담은 객체, int 값으로 바꿔 가며 같은 줄을 실행해, b를 바꾼 뒤 a가 어떻게 되는지와 만들어진 Card 객체가 몇 개인지를 봅니다.',
  terms: ['참조', '클래스와 객체', '기본형과 참조형', '동일성과 동등성'],
  controls: [
    { id: 'how', label: 'b에 담는 코드', type: 'select', value: 'same', options: [['same', 'Card b = a;'], ['fresh', 'Card b = new Card();'], ['copy', 'Card b = new Card(); b.owner = a.owner;'], ['prim', 'Card 대신 int로: int a = 1; int b = a; b = 2;']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'Card b = a; 뒤에 b로 값을 바꾸면 a는 어떻게 되나', d: 'b에는 a가 가리키는 같은 객체가 담깁니다. b로 바꾸면 a로 봐도 바뀌어 있고, 객체는 1개뿐입니다.', v: { how: 'same' } },
    { t: 'b에 new Card()를 담으면', q: 'b에 a 대신 new Card()를 담으면', d: '새 객체가 하나 더 만들어져 a와 b는 서로 다른 객체를 가리킵니다. b를 바꿔도 a는 그대로입니다.', v: { how: 'fresh' } },
    { t: '새로 만든 뒤 값만 옮기면', q: 'b를 new Card()로 새로 만들고 a.owner 값만 옮겨 담으면', d: 'owner의 글을 옮겨 담아도 객체는 둘입니다. 처음엔 내용이 같았지만 서로 다른 객체입니다.', v: { how: 'copy' } },
    { t: 'int로 바꾸면', q: 'Card 대신 int로 b = a를 한 뒤 b를 바꾸면', d: '기본 타입 변수에는 값 자체가 들어 있어서 대입하면 값이 복사됩니다. b를 바꿔도 a는 그대로입니다.', v: { how: 'prim' } },
  ],
  code: function (c) {
    var o = [];
    if (c.how === 'prim') {
      o.push('public class Main {', '    public static void main(String[] args) {', '        int a = 1;', '        int b = a;', '        b = 2;', '        System.out.println(a);', '        System.out.println(a == b);', '    }', '}');
      return o.join('\n');
    }
    o.push('class Card {', '    String owner;', '}', '', 'public class Main {', '    public static void main(String[] args) {', '        Card a = new Card();', '        a.owner = "김철수";');
    if (c.how === 'same') o.push('        // b에는 a가 가리키는 그 객체가 담긴다. 객체는 새로 생기지 않는다', '        Card b = a;');
    else {
      o.push('        Card b = new Card();');
      if (c.how === 'copy') o.push('        b.owner = a.owner;');
    }
    o.push('        b.owner = "이영희";', '        System.out.println(a.owner);', '        System.out.println(a == b);', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { same: 'Card b = a;', fresh: 'Card b = new Card();', copy: 'new Card() 뒤 owner를 옮겨 담음', prim: 'int 변수' }[c.how]; },
  columns: ['b를 바꾼 뒤 a의 값', 'a == b', '만들어진 Card 객체'],
  simulate: function (c) {
    var how = c.how, prim = how === 'prim', ev = [], sum = [], after = null, NM = ['A', 'B'];
    var st = { prim: prim, vars: { a: null, b: null }, objs: [{ made: false, owner: null }, { made: false, owner: null }], out: [], hot: '', made: 0, done: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function mk(i) { st.objs[i].made = true; st.made++; }
    function sameThing() { var a = st.vars.a, b = st.vars.b; return prim ? a.val === b.val : a.ref === b.ref; }
    function ownerOf(nm) { return st.objs[st.vars[nm].ref].owner; }
    function show(nm) { var o = ownerOf(nm); return o === null ? '비어 있음' : o; }

    if (prim) {
      st.hot = 'va'; st.vars.a = { val: 1 };
      push('int a = 1; 줄이 실행됩니다. int 변수 a에는 1이라는 값 자체가 들어 있습니다. 객체를 가리키는 값이 아니라, 1이 그대로 들어 있는 것입니다.');
      st.hot = 'va vb'; st.vars.b = { val: st.vars.a.val };
      after = { eq: sameThing() };
      push('int b = a; 줄이 실행됩니다. a에 들어 있는 값 1이 b에 복사됩니다. 이제 a와 b가 각각 1이라는 값을 따로 갖고 있습니다. 두 값이 같으므로 지금은 a == b가 true입니다.');
      st.hot = 'vb'; st.vars.b = { val: 2 };
      push('b = 2; 줄이 실행됩니다. b에 들어 있는 값을 2로 바꿉니다. a에 들어 있는 1은 b와 따로 가진 값이므로 그대로입니다.');
      st.hot = 'va'; st.out.push('1');
      push('System.out.println(a); 줄이 실행됩니다. a에 들어 있는 값 1을 출력합니다. b를 바꿨지만 a는 바뀌지 않았습니다.');
      st.hot = 'va vb'; st.out.push('false');
      push('System.out.println(a == b); 줄이 실행됩니다. int 변수의 ==는 두 변수에 들어 있는 값이 같은지를 봅니다. a는 1이고 b는 2이므로 false를 출력합니다.');
      st.hot = ''; st.done = true;
      push('main이 끝납니다. 이 코드에는 Card 객체가 나오지 않으므로 객체는 하나도 만들어지지 않았습니다.');
      sum.push('int 같은 기본 타입 변수에는 값 자체가 들어 있어서, int b = a;는 값을 복사합니다. 그래서 b를 2로 바꿔도 a는 1 그대로였고, a == b는 false였습니다.');
      sum.push('Card 변수에서는 같은 줄 모양인 Card b = a;가 같은 객체를 가리키게 만들었지만, int 변수는 값을 각자 갖습니다. 변수에 들어 있는 것이 값 자체인지 객체를 가리키는 값(참조)인지에 따라, b를 바꿨을 때 a가 달라지는지가 갈립니다.');
    } else {
      st.hot = 'va o0'; mk(0); st.vars.a = { ref: 0 };
      push('Card a = new Card(); 줄이 실행됩니다. new Card()가 Card 객체를 하나 만들고(그림의 객체 A), 변수 a에는 그 객체를 가리키는 값이 담깁니다. 이 값을 참조라고 부릅니다. a 안에 객체가 들어 있는 것이 아니라, a가 객체 A를 가리키고 있습니다.');
      st.hot = 'va o0'; st.objs[0].owner = '김철수';
      push('a.owner = "김철수"; 줄이 실행됩니다. a가 가리키는 객체 A를 찾아가, 그 객체의 owner에 김철수를 담습니다.');
      if (how === 'same') {
        st.hot = 'vb'; st.vars.b = { ref: 0 };
        after = { made: st.made, eq: sameThing(), owner: String(ownerOf('b')), ownerSame: ownerOf('a') === ownerOf('b') };
        push('Card b = a; 줄이 실행됩니다. a 안에 들어 있는 것은 "객체 A를 가리키는 값"이고, 이 값이 b에 복사됩니다. 객체 A가 복사되는 것이 아닙니다. 새 객체는 만들어지지 않았고 객체는 여전히 1개입니다. a와 b가 같은 객체 A를 가리킵니다.');
      } else {
        st.hot = 'vb o1'; mk(1); st.vars.b = { ref: 1 };
        if (how === 'fresh') after = { made: st.made, eq: sameThing(), owner: String(ownerOf('b')), ownerSame: ownerOf('a') === ownerOf('b') };
        push('Card b = new Card(); 줄이 실행됩니다. new Card()가 Card 객체를 하나 더 만들고(객체 B), b에는 그 객체를 가리키는 값이 담깁니다. 이제 a는 객체 A를, b는 객체 B를 가리킵니다. 새로 만든 객체 B의 owner에는 아직 아무 값도 담기지 않았습니다(null).');
        if (how === 'copy') {
          st.hot = 'va vb o1'; st.objs[1].owner = ownerOf('a');
          after = { made: st.made, eq: sameThing(), owner: String(ownerOf('b')), ownerSame: ownerOf('a') === ownerOf('b') };
          push('b.owner = a.owner; 줄이 실행됩니다. a가 가리키는 객체 A의 owner를 읽으면 김철수이고, 이 글이 b가 가리키는 객체 B의 owner에 담깁니다. 두 객체의 owner가 같은 김철수가 되었지만, 객체는 여전히 A와 B 둘입니다. 담긴 글이 같다고 같은 객체가 되지는 않습니다.');
        }
      }
      var tgt = st.vars.b.ref;
      st.hot = 'vb o' + tgt; st.objs[tgt].owner = '이영희';
      if (how === 'same') push('b.owner = "이영희"; 줄이 실행됩니다. b가 가리키는 객체를 찾아가 owner에 이영희를 담습니다. b가 가리키는 객체는 객체 A이고, a가 가리키는 객체도 객체 A입니다. 그래서 객체 A의 owner가 김철수에서 이영희로 바뀝니다.');
      else push('b.owner = "이영희"; 줄이 실행됩니다. b가 가리키는 객체 B의 owner에 이영희를 담습니다. 바뀐 것은 객체 B뿐입니다. a가 가리키는 객체 A의 owner는 김철수 그대로입니다.');
      st.hot = 'va o0'; st.out.push(String(ownerOf('a')));
      if (how === 'same') push('System.out.println(a.owner); 줄이 실행됩니다. a가 가리키는 객체 A의 owner를 읽어 이영희를 출력합니다. a로는 아무것도 바꾸지 않았는데 바뀌어 있는 것은, b로 바꾼 객체가 a가 가리키는 바로 그 객체이기 때문입니다.');
      else push('System.out.println(a.owner); 줄이 실행됩니다. a가 가리키는 객체 A의 owner를 읽어 김철수를 출력합니다. b로 바꾼 것은 객체 B였으므로 객체 A는 바뀌지 않았습니다.');
      st.hot = 'va vb'; st.out.push(String(sameThing()));
      if (how === 'same') push('System.out.println(a == b); 줄이 실행됩니다. 두 변수에 ==를 쓰면 들어 있는 값이 같은 객체를 가리키는지를 비교합니다. a와 b는 모두 객체 A를 가리키므로 true를 출력합니다. owner의 글을 비교하는 것이 아닙니다.');
      else if (how === 'fresh') push('System.out.println(a == b); 줄이 실행됩니다. 두 변수에 ==를 쓰면 들어 있는 값이 같은 객체를 가리키는지를 비교합니다. a는 객체 A를, b는 객체 B를 가리키므로 false를 출력합니다.');
      else push('System.out.println(a == b); 줄이 실행됩니다. b.owner를 바꾸기 전에는 두 객체의 owner가 같은 글이었지만, ==는 owner의 글을 비교하지 않고 가리키는 객체가 같은지를 비교합니다. a는 객체 A를, b는 객체 B를 가리키므로 false를 출력합니다.');
      st.hot = ''; st.done = true;
      push('main이 끝납니다. 이 실행에서 new Card()가 ' + st.made + '번 실행되어 Card 객체가 ' + st.made + '개 만들어졌습니다. 변수에 값을 담는 줄이 객체를 늘린 것은 아니고, 이 코드에서 객체는 new Card()로만 만들어졌습니다.');
      if (how === 'same') {
        sum.push('Card 변수에는 Card 객체 자체가 아니라 그 객체를 가리키는 값(참조)이 들어 있습니다. 그래서 Card b = a;는 객체를 복사하지 않고, 같은 객체를 가리키는 변수를 하나 더 만듭니다.');
        sum.push('b로 owner를 바꿨는데 a로 읽어도 이영희였던 것, a == b가 true였던 것, Card 객체가 1개뿐이었던 것은 모두 같은 이유입니다. 객체를 따로 갖고 싶으면 new Card()로 새로 만들어야 합니다.');
      } else if (how === 'fresh') {
        sum.push('b에 new Card()를 담으면 새 객체가 만들어져, a와 b가 서로 다른 객체를 가리킵니다. b로 이영희를 담아도 a의 객체는 김철수 그대로였고, a == b는 false였습니다.');
        sum.push('new Card()가 실행될 때마다 객체가 하나 더 생겼습니다(이번에는 2개). 객체를 따로 갖고 싶으면 이렇게 new로 새로 만들어야 합니다.');
      } else {
        sum.push('새로 만든 객체에 a.owner의 글을 옮겨 담으면 두 객체의 내용은 같아지지만, 객체는 둘입니다. b를 바꿔도 a의 객체는 김철수 그대로였고, a == b는 false였습니다.');
        sum.push('a == b는 owner의 글이 같은지가 아니라 같은 객체를 가리키는지를 묻습니다. 내용이 같은 객체 두 개라도 a == b는 false입니다.');
      }
    }
    return { events: ev, summary: sum, after: after, row: [st.out[0], st.out[1], prim ? '없음 (기본 타입)' : st.made + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 코드의 첫 줄부터 한 줄씩 실행합니다.'); return; }
    function inVar(nm) { var x = s.vars[nm]; return !x ? '아직 없음' : s.prim ? '값 ' + x.val : '객체 ' + (x.ref === 0 ? 'A' : 'B') + '를 가리키는 값'; }
    H.table(v, ['변수', '들어 있는 것'], [{ cls: '', cells: [(s.prim ? 'int ' : 'Card ') + 'a', inVar('a')] }, { cls: '', cells: [(s.prim ? 'int ' : 'Card ') + 'b', inVar('b')] }], '변수');
    if (!s.prim) {
      var rows = [];
      s.objs.forEach(function (o, i) { if (o.made) rows.push({ cls: '', cells: ['Card 객체 ' + 'AB'[i], o.owner === null ? '비어 있음' : o.owner] }); });
      H.table(v, ['객체', 'owner'], rows.length ? rows : [{ cls: 'gone', cells: ['아직 없음', ''] }], '만들어진 Card 객체');
    }
    if (s.out.length) H.table(v, ['출력'], s.out.map(function (x) { return { cls: '', cells: [x] }; }), '화면에 출력된 것');
    if (!s.prim) H.counters(v, [[s.made, '만들어진 Card 객체']]);
  },
  // 그림: 왼쪽에 변수 a, b 상자, 오른쪽에 Card 객체 상자(owner 값). 화살표가 같은 객체로 모이는지 서로 다른 객체로 가는지가 핵심이다. int일 때는 변수 상자에 값이 직접 들어 있고 객체는 없다. 아래에 만들어진 객체 수와 출력.
  draw: function (P, sim, shown) {
    var prim = sim.c.how === 'prim', last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    function on(k) { return hot.split(' ').indexOf(k) >= 0; }
    P.size(680, 336);
    P.region('rv', 4, 8, 220, 226, '변수');
    P.region('ro', 426, 8, 250, 226, '객체');
    ['a', 'b'].forEach(function (nm, i) {
      var x = s ? s.vars[nm] : null, sub = !x ? '아직 없음' : prim ? '값 ' + x.val : (x.ref === 0 ? 'A' : 'B') + '를 가리키는 값';
      P.box('v' + nm, 14, 46 + i * 94, 200, 72, { cls: on('v' + nm) ? 'hot now' : x ? 'plain' : 'ghost', title: (prim ? 'int ' : 'Card ') + nm, sub: sub });
    });
    if (prim) {
      P.box('o0', 436, 46, 230, 72, { cls: 'ghost', title: 'Card 객체', sub: '이 코드에는 없음' });
    } else {
      [0, 1].forEach(function (i) {
        var o = s ? s.objs[i] : { made: false, owner: null };
        P.box('o' + i, 436, 46 + i * 94, 230, 72, { cls: o.made ? (on('o' + i) ? 'hot now' : 'plain') : 'ghost', title: 'Card 객체 ' + 'AB'[i], sub: o.made ? 'owner: ' + (o.owner === null ? '비어 있음' : o.owner) : (s && s.done ? '만들어지지 않음' : '아직 없음') });
      });
      ['a', 'b'].forEach(function (nm, i) {
        var x = s ? s.vars[nm] : null;
        if (!x) return;
        var to = 'o' + x.ref + ':l' + (i === 1 && x.ref === 0 ? ':0.85' : '');
        P.arrow('r' + nm, 'v' + nm + ':r', to, { cls: on('v' + nm) ? 'hot' : 'good' });
      });
    }
    P.box('n1', 14, 244, 652, 36, { cls: s && s.made ? 'wait' : 'ghost', title: '만들어진 Card 객체', right: prim ? '없음 (기본 타입)' : (s ? s.made : 0) + '개' });
    P.box('n2', 14, 288, 652, 36, { cls: s && s.out.length ? 'good' : 'ghost', title: '출력', right: s ? s.out.join(' / ') : '' });
  },
  assume: '실행 환경은 JDK 21.0.12.1(javac 21)입니다. 네 가지 조합을 모두, 화면의 코드와 같은 소스를 javax.tools로 컴파일해 새 클래스 로더로 읽어 Main.main을 실행하고, 표준 출력을 잡은 결과와 대조했습니다. 대조할 때 Probe의 소스에는 Card 객체를 세는 줄(static 변수와 생성자의 증가, 그리고 몇 줄의 출력)만 더했고, 그 줄을 빼면 화면의 코드와 줄 단위로 같은 글임을 조합마다 확인했습니다. 대조한 것은 두 출력 줄, 만들어진 Card 객체의 수, 그리고 단계 문장이 기대는 사실입니다. 사실은 Card b = ...; 줄을 실행한 직후(new Card()를 담은 조합은 owner를 옮겨 담은 직후)의 객체 수, a == b의 값, 두 변수가 가리키는 객체의 owner 값과 그 두 값이 같은지입니다. 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. 객체를 가리키는 참조 값이 있다는 것, 두 변수가 같은 객체를 가리키면 한 변수로 바꾼 상태를 다른 변수로 읽을 수 있다는 것, int 값은 대입하면 복사되어 둘이 따로라는 것은 4.2절과 4.3.1절(예제 4.3.1-2)을, 기본 타입 변수는 그 기본 타입의 값을 담고 클래스 타입 변수는 null이나 그 클래스의 객체에 대한 참조를 담는다는 것은 4.12.1절과 4.12.2절을, 참조에 쓴 ==가 둘 다 null이거나 같은 객체를 가리킬 때 true라는 것은 15.21.3절을 따랐습니다. int 변수의 ==가 값을 비교한다는 것(15.21.1절)은 문서를 열어 확인하지 않았고, 이 실행의 결과로만 확인했습니다. 화면은 owner의 글 김철수와 이영희를 객체 안에 들어 있는 값처럼 그렸지만, owner도 String 객체를 가리키는 참조입니다. 이 실습은 그 차이를 다루지 않고, 문자열 상수가 같은 객체를 가리키게 되는 일도 다루지 않았습니다. 객체의 내용이 같은지를 묻는 equals는 "세부 동작 실습: ==와 equals"에서 다룹니다. 변수와 객체가 메모리의 어디에 놓이는지는 이 실습이 다루거나 확인한 것이 아닙니다. 이 실습에서 본 것은 변수에 담긴 값이 객체를 가리키고, 대입하면 그 값이 복사된다는 동작입니다.',
});
