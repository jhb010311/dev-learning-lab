Lab.register({
  id: 'collection_basic', nav: 'List와 Map', cat: '기초개념', mode: 'step', basic: true, deep: ['list', 'hashmap', 'setmap'],
  title: 'List와 Map은 무엇을 담고, 어떻게 꺼내는가',
  intro: '값을 여러 개 담아 두는 그릇을 컬렉션이라고 부릅니다. List는 값을 넣은 순서대로 줄 세워 담고, 0부터 시작하는 번호로 꺼냅니다. Map은 키와 값을 짝지어 담고, 키로 꺼냅니다. 코드에서는 List<String> names = new ArrayList<>();처럼 왼쪽에 그릇의 종류(꺾쇠 안은 담을 값의 종류)를 적고, 오른쪽의 new로 빈 그릇을 만듭니다. 괄호에 크기를 적지 않아도 add나 put으로 담는 만큼 담긴 개수가 늘어납니다. 이 실습은 List와 Map을 바꿔 가며 같은 모양의 코드를 컴파일하고 실행해, 있는 것을 꺼낼 때, 없는 것을 꺼낼 때, 같은 것을 한 번 더 넣을 때 무엇이 출력되는지를 봅니다. (담긴 개수를 먼저 출력하는 것은, 꺼내다 멈춰도 그 개수를 볼 수 있게 하려는 것입니다.)',
  terms: ['List, Set, Map', 'List의 add와 get', 'Map의 put과 get', 'IndexOutOfBoundsException'],
  controls: [
    { id: 'kind', label: '담는 그릇', type: 'select', value: 'list', options: [['list', 'List<String> names'], ['map', 'Map<String, Integer> ages']] },
    { id: 'ask', label: '꺼내거나 넣는 것', type: 'select', value: 'has', options: [['has', '담아 둔 것을 꺼낸다: 번호 0 또는 키 "kim"'], ['none', '담지 않은 것을 꺼낸다: 번호 5 또는 키 "park"'], ['dup', '"kim"을 한 번 더 넣는다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'List는 어떻게 생겼고, "kim"과 "lee"를 담은 뒤 names.get(0) 줄로 꺼내면 무슨 일이 일어나나', d: '번호 0 자리에 "kim", 번호 1 자리에 "lee"가 담기고, get(0)이 "kim"을 꺼냅니다.', v: { kind: 'list', ask: 'has' } },
    { t: 'List에서 없는 번호를 꺼내면', q: 'names.get(5) 줄처럼 담기지 않은 번호를 꺼내면', d: '담긴 번호는 0과 1뿐이라 예외가 나고 프로그램이 멈춥니다.', v: { kind: 'list', ask: 'none' } },
    { t: 'List에 같은 값을 한 번 더 넣으면', q: 'names.add("kim") 줄을 하나 더 써서 "kim"을 한 번 더 넣으면', d: '막지 않고 하나 더 담아 담긴 개수가 3이 됩니다.', v: { kind: 'list', ask: 'dup' } },
    { t: 'Map으로 바꿔 키로 꺼내면', q: 'List 대신 Map으로 바꿔, ages.get("kim") 줄로 키 "kim"의 값을 꺼내면', d: '키 "kim"과 짝지어 둔 값 20을 꺼냅니다.', v: { kind: 'map', ask: 'has' } },
    { t: 'Map에서 없는 키를 꺼내면', q: 'Map에서 담지 않은 키를 ages.get("park") 줄로 꺼내면', d: '예외가 나지 않고 null이 나옵니다.', v: { kind: 'map', ask: 'none' } },
    { t: 'Map에 같은 키를 한 번 더 넣으면', q: 'Map에 같은 키 "kim"으로 ages.put("kim", 25) 줄을 한 번 더 쓰면', d: '새 짝이 생기지 않고 값만 25로 바뀝니다.', v: { kind: 'map', ask: 'dup' } },
  ],
  code: function (c) {
    var L = c.kind === 'list', D = c.ask === 'dup', N = c.ask === 'none';
    var o = ['// 컬렉션 클래스들이 들어 있는 java.util을 가져다 쓴다', 'import java.util.*;', '', 'public class Main {', '    public static void main(String[] args) {'];
    if (L) {
      o.push('        // List: 넣은 순서대로 줄 세워 담는 그릇. 처음에는 비어 있다', '        List<String> names = new ArrayList<>();',
        '        // 담기: add는 맨 뒤에 붙인다. 번호는 0부터 매겨진다', '        names.add("kim");', '        names.add("lee");');
      if (D) o.push('        // 같은 값 "kim"을 한 번 더 담는다', '        names.add("kim");');
      o.push('        // 개수: size는 담긴 값의 개수를 돌려준다', '        System.out.println(names.size());',
        '        // 꺼내기: get은 그 번호 자리의 값을 돌려준다', '        System.out.println(names.get(' + (N ? '5' : '0') + '));');
    } else {
      o.push('        // Map: 키와 값을 짝지어 담는 그릇. 처음에는 비어 있다', '        Map<String, Integer> ages = new HashMap<>();',
        '        // 담기: put은 키와 값을 짝지어 담는다', '        ages.put("kim", 20);', '        ages.put("lee", 30);');
      if (D) o.push('        // 같은 키 "kim"으로 한 번 더 담는다', '        ages.put("kim", 25);');
      o.push('        // 개수: size는 담긴 짝의 개수를 돌려준다', '        System.out.println(ages.size());',
        '        // 꺼내기: get은 그 키와 짝지어진 값을 돌려준다', '        System.out.println(ages.get("' + (N ? 'park' : 'kim') + '"));');
    }
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.kind === 'list' ? 'List' : 'Map') + ' · ' + { has: '있는 것을 꺼냄', none: '없는 것을 꺼냄', dup: '같은 것을 한 번 더 넣음' }[c.ask]; },
  columns: ['꺼낸 값', '담긴 개수', '예외'],
  simulate: function (c) {
    var L = c.kind === 'list', D = c.ask === 'dup', N = c.ask === 'none', ev = [], sum = [];
    var v = L ? 'names' : 'ages', cnt = D && L ? 3 : 2;
    var st = { hotIdx: -1, items: [], count: 0, out: [], cur: '', res: '', fetch: null, exc: '', stopped: false, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. 빈 그릇을 만든다
    st.cur = L ? 'List<String> names = new ArrayList<>();' : 'Map<String, Integer> ages = new HashMap<>();'; st.res = '빈 그릇';
    st.checks.push([st.cur, { v: '담긴 것이 없는 ' + (L ? 'List' : 'Map') + '을 만듦', cls: '' }]);
    if (L) push('java Main으로 실행합니다. main의 첫 줄 List<String> names = new ArrayList<>(); 가 실행됩니다. 왼쪽의 List<String>은 "문자열(String)을 담는 List"라는 뜻으로, names 변수가 어떤 그릇을 가리키는지 정한 것입니다. 오른쪽의 new ArrayList<>()가 담긴 것이 하나도 없는 빈 List를 만들고, names가 그 List를 가리킵니다. List는 담는 규칙의 이름이고, ArrayList는 그 규칙대로 만든 실제 클래스입니다. 괄호 안에 크기는 적지 않았습니다. 담긴 개수는 0입니다.', '');
    else push('java Main으로 실행합니다. main의 첫 줄 Map<String, Integer> ages = new HashMap<>(); 가 실행됩니다. 왼쪽의 Map<String, Integer>는 "키는 문자열(String), 값은 정수(Integer)"라는 뜻으로, ages 변수가 어떤 그릇을 가리키는지 정한 것입니다. 오른쪽의 new HashMap<>()가 담긴 것이 하나도 없는 빈 Map을 만들고, ages가 그 Map을 가리킵니다. Map은 담는 규칙의 이름이고, HashMap은 그 규칙대로 만든 실제 클래스입니다. 담긴 짝은 0개입니다.', '');

    // 2~3. 담는다
    var adds = L ? [['kim', 'names.add("kim");'], ['lee', 'names.add("lee");']] : [['kim', 'ages.put("kim", 20);', '20'], ['lee', 'ages.put("lee", 30);', '30']];
    adds.forEach(function (a, i) {
      st.items.push(L ? [String(i), a[0]] : [a[0], a[2]]); st.count++; st.hotIdx = i; st.cur = a[1]; st.res = '담긴 개수 ' + st.count;
      st.checks.push([a[1], { v: L ? '번호 ' + i + ' 자리에 담음' : '키 ' + a[0] + '와 값 ' + a[2] + '를 짝지어 담음', cls: 'good' }]);
      if (L) push(a[1] + ' 줄이 실행됩니다. add는 List의 맨 뒤에 값을 붙입니다. ' + (i === 0 ? '비어 있었으므로 "kim"은 번호 0 자리에 들어갑니다. 번호는 0부터 시작해, 담는 순서대로 매겨집니다.' : '"lee"는 "kim" 다음인 번호 1 자리에 들어갑니다.') + ' 담긴 개수는 ' + st.count + '입니다.', 'good');
      else push(a[1] + ' 줄이 실행됩니다. put은 키와 값을 짝지어 담습니다. ' + (i === 0 ? '키 "kim"에 값 20이 짝지어집니다. 나중에 값을 꺼낼 때 쓰는 이름표는 값이 아니라 키입니다.' : '키 "lee"에 값 30이 짝지어집니다.') + ' 담긴 짝은 ' + st.count + '개입니다.', 'good');
    });

    // 4. 한 번 더 넣는다
    if (D) {
      var line = L ? 'names.add("kim");' : 'ages.put("kim", 25);';
      st.cur = line;
      if (L) {
        st.items.push(['2', 'kim']); st.count++; st.hotIdx = 2; st.res = '담긴 개수 3';
        st.checks.push([line, { v: '번호 2 자리에 한 번 더 담음', cls: 'good' }]);
        push(line + ' 줄이 한 번 더 실행됩니다. "kim"은 이미 담겨 있지만, List는 같은 값을 여러 번 담을 수 있습니다. add가 맨 뒤인 번호 2 자리에 "kim"을 하나 더 붙여, 담긴 개수는 3이 됩니다.', 'good');
      } else {
        st.items[0] = ['kim', '25']; st.hotIdx = 0; st.res = '담긴 짝 2개 그대로';
        st.checks.push([line, { v: '키 kim의 값 20을 25로 바꿈', cls: 'good' }]);
        push(line + ' 줄이 실행됩니다. 키 "kim"은 이미 담겨 있습니다. Map에는 같은 키가 둘 있을 수 없어서, 새 짝을 만들지 않고 "kim"과 짝지어진 값 20을 25로 바꿉니다. 담긴 짝은 그대로 2개입니다.', 'good');
      }
    }

    // 5. 개수를 출력한다
    st.hotIdx = -1; st.cur = v + '.size()'; st.res = String(st.count); st.out.push(String(st.count));
    st.checks.push([v + '.size() 출력', { v: String(st.count), cls: 'good' }]);
    push('System.out.println(' + v + '.size()); 줄이 ' + (L ? '담긴 값' : '담긴 짝') + '의 개수를 출력합니다. 출력된 개수는 ' + st.count + '입니다.' + (!L && D ? ' 키 "kim"을 두 번 담았어도 짝은 하나라서 3이 아니라 2입니다.' : ''), 'good');

    // 6. 꺼낸다
    if (L && N) {
      st.fetch = { idx: 2, kind: 'bad' }; st.cur = 'names.get(5)'; st.res = 'IndexOutOfBoundsException'; st.exc = 'IndexOutOfBoundsException'; st.stopped = true;
      st.checks.push(['names.get(5)', { v: '없는 번호: 예외가 나고 멈춤', cls: 'bad' }]);
      push('System.out.println(names.get(5)); 줄에서 get(5) 호출이 번호 5 자리의 값을 꺼내려 합니다. 담긴 번호는 0과 1뿐이어서 5번 자리는 없습니다. 이럴 때 get은 값 대신 IndexOutOfBoundsException(번호가 범위를 벗어났다는 예외)을 던집니다. 이 예외를 잡는 곳이 없어 프로그램은 그 줄에서 멈추고, println은 아무것도 출력하지 못합니다.', 'bad');
    } else if (L) {
      st.fetch = { idx: 0, kind: 'good' }; st.cur = 'names.get(0)'; st.res = 'kim'; st.out.push('kim');
      st.checks.push(['names.get(0) 출력', { v: 'kim', cls: 'good' }]);
      push('System.out.println(names.get(0)); 줄에서 get(0) 호출이 번호 0 자리의 값을 돌려주고, println이 "kim"을 출력합니다. 꺼낼 번호는 괄호 안에 적은 값 0입니다. 꺼내도 List에서 값이 없어지지는 않아서, 담긴 개수는 그대로 ' + st.count + '입니다.', 'good');
    } else if (N) {
      st.fetch = { idx: 2, kind: 'none' }; st.cur = 'ages.get("park")'; st.res = 'null'; st.out.push('null');
      st.checks.push(['ages.get("park") 출력', { v: 'null', cls: 'good' }]);
      push('System.out.println(ages.get("park")); 줄에서 get("park") 호출이 키 park에 짝지어진 값을 찾습니다. 담아 둔 키는 "kim"과 "lee"뿐이어서 park에는 짝지어진 값이 없습니다. 이럴 때 get은 예외를 던지지 않고 null을 돌려줍니다. null은 "짝지어진 값이 없다"는 뜻으로 돌려주는 값이고, println이 그대로 null을 출력합니다.', 'good');
    } else {
      var val = D ? '25' : '20';
      st.fetch = { idx: 0, kind: 'good' }; st.cur = 'ages.get("kim")'; st.res = val; st.out.push(val);
      st.checks.push(['ages.get("kim") 출력', { v: val, cls: 'good' }]);
      push('System.out.println(ages.get("kim")); 줄에서 get("kim") 호출이 키 kim에 짝지어진 값을 돌려주고, println이 그 값을 출력합니다. 출력된 값은 ' + val + '입니다. 꺼낼 키는 괄호 안에 적은 "kim"입니다.' + (D ? ' 처음에 담은 20이 아니라, 나중에 같은 키로 담은 25가 나옵니다.' : ' 꺼내도 Map에서 짝이 없어지지는 않아서, 담긴 짝은 그대로 ' + st.count + '개입니다.'), 'good');
    }

    // 7. 끝
    if (!st.stopped) {
      st.cur = 'main 끝'; st.res = '';
      push('main의 마지막 줄까지 실행되어 프로그램이 끝납니다.', 'good');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (L && !N && !D) {
      sum.push('List는 값을 넣은 순서대로 줄 세워 담고, 0부터 시작하는 번호로 꺼냅니다. "kim"과 "lee"를 add로 담자 번호 0, 1 자리에 들어갔고, get(0) 호출이 "kim"을 꺼냈습니다.');
      sum.push('new ArrayList<>() 괄호에 크기를 적지 않았는데도 담은 만큼 담긴 개수가 늘었습니다. 배열은 만들 때 길이를 정하고 그 뒤로 바뀌지 않지만(Java 언어 명세 10.2절), List는 담는 만큼 늘어납니다. 꺼내도 값은 그대로 남아 있습니다.');
    } else if (L && N) {
      sum.push('List에서 담기지 않은 번호를 꺼내면 값이 아니라 예외가 납니다. 담긴 번호는 0과 1뿐인데 get(5) 호출이 IndexOutOfBoundsException을 던졌고, 아무도 잡지 않아 프로그램이 거기서 멈췄습니다.');
      sum.push('List에서 쓸 수 있는 번호는 0부터 (담긴 개수 - 1)까지입니다. 번호가 틀려도 컴파일은 통과하고, 실행하다가 그 줄에 닿아서야 알게 됩니다. 담긴 개수 2는 그 앞 줄에서 이미 출력됐습니다.');
    } else if (L) {
      sum.push('List에 "kim"을 한 번 더 넣으면 막지 않고 하나 더 담아, 담긴 개수가 3이 됩니다. List는 같은 값을 여러 번 담을 수 있고, 번호가 다르면 다른 자리입니다.');
      sum.push('get(0) 호출은 여전히 처음에 담은 "kim"을 꺼냈습니다. 나중에 넣은 같은 값은 번호 2 자리에 따로 담겨 있습니다.');
    } else if (!N && !D) {
      sum.push('Map은 키와 값을 짝지어 담고, 키로 꺼냅니다. put 줄이 키 kim에 값 20을 짝지었고, get("kim") 호출이 그 값을 꺼내 20이 출력됐습니다.');
      sum.push('List는 담은 순서의 번호로, Map은 키로 찾습니다. 담긴 개수 2는 값의 수가 아니라 짝의 수입니다.');
    } else if (N) {
      sum.push('Map에서 담지 않은 키를 꺼내면 예외가 아니라 null이 나옵니다. get이 짝지어진 값이 없다는 뜻으로 null을 돌려주었고, 프로그램은 멈추지 않고 끝까지 실행됐습니다.');
      sum.push('List에서 없는 번호는 예외, Map에서 없는 키는 null입니다. 같은 "없는 것을 꺼내기"인데 결과가 다릅니다.');
    } else {
      sum.push('Map에 같은 키 "kim"으로 한 번 더 넣으면 새 짝이 생기지 않고 값만 바뀝니다. 담긴 개수는 2 그대로이고, get("kim") 호출은 20이 아니라 25를 꺼냈습니다.');
      sum.push('List는 같은 값을 또 담으면 개수가 늘지만, Map은 같은 키를 또 담으면 값만 바뀝니다. Map에는 같은 키가 하나만 있을 수 있습니다.');
    }
    var got2 = st.stopped ? '꺼내지 못함' : st.out[1];
    return { events: ev, summary: sum, row: [got2, String(st.count), st.stopped ? 'IndexOutOfBoundsException으로 멈춤' : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 main의 첫 줄부터 한 줄씩 실행합니다.'); return; }
    H.table(v, ['실행한 줄', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '실행');
    if (s.out.length) H.table(v, ['출력'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), '표준 출력');
    H.counters(v, [[s.count, sim.c.kind === 'list' ? '담긴 값' : '담긴 짝'], [s.out.length, '출력된 줄']]);
  },
  // 그림: 왼쪽에 변수(names 또는 ages), 오른쪽 점선 안에 담긴 칸들(List는 번호 0, 1, 2 자리, Map은 키와 값의 짝). 아래의 실행 줄에서 꺼내는 칸으로 화살표가 간다. 없는 번호나 없는 키는 점선 칸으로 보인다. 맨 아래에 담긴 개수와 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, L = c.kind === 'list', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 310);
    P.box('var', 14, 52, 184, 76, { cls: 'plain', title: L ? 'names' : 'ages', sub: L ? 'List<String>' : 'Map<String, Integer>' });
    P.region('bx', 214, 14, 452, 138, (L ? 'List' : 'Map') + ': 담긴 ' + (L ? '값 ' : '짝 ') + (s ? s.count : 0) + '개');
    P.arrow('ref', 'var:r', [214, 90], { cls: 'mut' });
    var extra = c.ask === 'none' || (L && c.ask === 'dup');
    for (var i = 0; i < 3; i++) {
      if (i === 2 && !extra) continue;
      var it = s ? s.items[i] : null, f = s ? s.fetch : null, x = 224 + i * 150, id = 's' + i;
      if (it) {
        var cls = s.hotIdx === i ? 'hot now' : f && f.idx === i ? 'good now' : 'plain';
        P.box(id, x, 44, 140, 84, { cls: cls, title: L ? '번호 ' + it[0] : '키 "' + it[0] + '"', sub: L ? '"' + it[1] + '"' : '값 ' + it[1] });
      } else if (i === 2 && c.ask === 'none') {
        var asked = f && f.idx === 2;
        P.box(id, x, 44, 140, 84, { cls: asked ? (f.kind === 'bad' ? 'bad dash' : 'wait dash') : 'ghost', title: L ? '번호 5' : '키 "park"', sub: asked ? (L ? '없는 자리' : '짝이 없음') : '아직 안 꺼냄' });
      } else {
        P.box(id, x, 44, 140, 84, { cls: 'ghost', title: L ? '번호 ' + i : '비어 있음', sub: L ? '비어 있음' : '' });
      }
    }
    var bad = s && s.exc;
    P.box('op', 14, 168, 652, 44, { cls: bad ? 'bad' : s && s.cur ? 'hot now' : 'ghost', title: s && s.cur ? s.cur : '실행하는 줄', right: s ? s.res : '' });
    if (s && s.fetch) { var k = s.fetch.idx; P.arrow('pt', 'op:t:' + ((224 + k * 150 + 70 - 14) / 652).toFixed(3), 's' + k + ':b:0.5', { cls: s.fetch.kind === 'good' ? 'good' : s.fetch.kind === 'bad' ? 'bad' : 'mut' }); }
    P.box('r1', 14, 224, 652, 36, { cls: s && s.count ? 'wait' : 'ghost', title: L ? '담긴 값의 개수' : '담긴 짝의 개수', right: (s ? s.count : 0) + '개' });
    P.box('r2', 14, 268, 652, 36, { cls: bad ? 'bad' : s && s.out.length ? 'good' : 'ghost', title: '출력', right: s ? (s.out.length ? s.out.join(' / ') : '(아직 출력 없음)') + (bad ? ' / 예외로 멈춤' : '') : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일해 모두 컴파일되는 것을 확인했고, 컴파일된 Main을 이 JDK의 java를 자식 프로세스로 띄워 실제로 실행해 표준 출력, 표준 오류, 종료 코드를 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 표준 출력의 줄들(담긴 개수와 꺼낸 값), 종료 코드와 표준 오류의 첫 줄(예외가 난 조합은 종료 코드 1에 첫 줄이 Exception in thread "main" java.lang.IndexOutOfBoundsException: Index 5 out of bounds for length 2였고 표준 오류에 Main.main이 있는 스택 추적이 이어졌으며, 나머지는 종료 코드 0에 표준 오류가 비어 있었습니다)입니다. 단계 문장이 기대는 사실은 별도의 소스를 같은 방식으로 실행해 확인했습니다. List는 "kim"과 "lee"가 번호 0과 1 자리에 담기고(indexOf 결과 0, 1), get으로 꺼내도 담긴 개수가 그대로 2이며, 같은 "kim"을 또 담으면 번호 2 자리에 따로 담깁니다(get(2)가 kim, 개수 3). Map은 같은 키로 put하면 이전 값 20을 돌려주고 값이 25로 바뀌며 짝은 2개 그대로이고, 담지 않은 키 park는 get이 null이고 containsKey가 false입니다. 문서는 Java SE 21 API 문서를 직접 열어 확인했습니다. List에서 번호가 0부터 시작하고 같은 값을 여러 번 담을 수 있다는 것, add가 맨 뒤에 붙이고 get이 범위를 벗어난 번호에 IndexOutOfBoundsException을 던진다는 것은 java.util.List와 java.util.ArrayList를, ArrayList가 담을수록 용량을 스스로 늘린다는 것은 java.util.ArrayList를, Map에 같은 키가 둘 있을 수 없다는 것과 get이 짝이 없으면 null을 돌려준다는 것과 put이 이전 값을 바꾸고 돌려준다는 것은 java.util.Map과 java.util.HashMap을, IndexOutOfBoundsException이 RuntimeException의 하위 클래스라는 것은 java.lang.IndexOutOfBoundsException을 따랐고, 배열의 길이가 만든 뒤 바뀌지 않는다는 것은 Java Language Specification(Java SE 21) 10.2절을 따랐습니다. 이 문서들은 내용을 요약해 돌려주는 방식으로 열었으므로 원문 전체를 눈으로 읽은 것은 아닙니다. 번호가 틀려도 컴파일이 통과하고 실행할 때 예외가 난다는 것, 종료 코드 1과 표준 오류에 나온 글은 문서가 아니라 이 java에서 관찰한 것입니다. 화면의 코드는 java Main으로 실행하는 모양 그대로이고 패키지는 없습니다. 담긴 개수를 먼저 출력하고 꺼내는 줄을 뒤에 둔 것은, 꺼내다 멈춘 조합에서도 담긴 개수를 출력으로 확인하려는 배치입니다. 그림의 점선 칸(번호 5, 키 park)은 담겨 있지 않은 자리를 가리키려고 그린 것이고, 실제 List나 Map에 그런 칸이 있다는 뜻이 아닙니다. List와 Map의 이 밖의 메서드(remove, contains 등), 반복해서 훑는 방법, Set, 꺼내는 순서가 정해지는 방식, null을 값으로 담는 경우는 다루지 않았습니다. ArrayList와 LinkedList의 차이는 "세부 동작 실습: ArrayList와 LinkedList", HashMap이 키를 찾는 방식은 "세부 동작 실습: HashMap 내부", Set과 Map의 종류별 순서는 "세부 동작 실습: Set과 Map의 종류"에서 다룹니다.',
});
