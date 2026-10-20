Lab.register({
  id: 'cache_basic', nav: '캐시', cat: '기초개념', mode: 'step', basic: true, deep: ['cache', 'cacheabs', 'etag', 'redis'],
  title: '캐시는 무엇이고, 쓰면 무엇을 얻고 무엇을 잃는가',
  why: 'DB 조회나 다른 서버 호출처럼 시간이 드는 일을, 같은 답이 나올 것을 알면서도 요청마다 다시 하면 사용자는 매번 기다리고 원본 쪽에는 같은 일이 쌓인다. 캐시는 한 번 얻은 답을 빨리 꺼낼 수 있는 곳에 두었다가 다시 쓰게 해서, 느린 일을 되풀이하지 않게 한다. 그 대가로 원본이 바뀌면 캐시의 값을 언제 버릴지를 따로 챙겨야 한다.',
  use: '자주 읽히지만 잘 바뀌지 않는 상품 정보, 카테고리 목록, 설정값 같은 것을 캐시에 둔다. 스프링에서는 메서드에 @Cacheable 애너테이션을 붙여 결과를 캐시에 두고, 여러 서버가 같은 캐시를 보게 하려면 Redis 같은 따로 띄운 저장소를 쓴다. 남은 재고나 계좌 잔액처럼 늘 지금 값이어야 하는 것은 캐시에 두지 않거나, 값이 바뀔 때 캐시의 값을 바로 지운다.',
  intro: '캐시는 오래 걸려 얻은 결과를 가까운 곳에 적어 두었다가, 같은 것을 다시 달라고 하면 적어 둔 것을 주는 장치입니다. 이 실습의 코드에서는 cache라는 Map이 적어 두는 곳이고, find 메서드 안의 cache 줄들이 "적어 둔 것이 있으면 그것을 주고, 없을 때만 느린 조회(slowLoad)를 한 뒤 적어 둔다"는 일을 합니다. slowLoad는 원본(source)에서 값을 읽어 오는 느린 일이고, 부른 횟수를 slowCount로 셉니다. 실제 시간은 재지 않고 slowLoad가 불린 횟수로 "얼마나 느린 일을 했는가"를 보입니다. 이 실습은 cache 줄을 지워 보고, 두 번 찾는 사이에 원본의 값을 바꾸거나 cache.remove(1) 줄로 캐시의 값을 지워 가며 같은 코드를 컴파일해 실행하고, 느린 조회가 몇 번 일어나는지와 두 번째로 받은 값이 원본과 같은지를 봅니다. (static은 main이 객체를 만들지 않고 바로 부를 수 있게 붙인 것으로 보고, 이 실습에서는 다루지 않습니다.)',
  terms: ['캐시', '캐시 적중과 미스', 'Cache-Aside 패턴', '캐시의 옛 값(Stale)'],
  controls: [
    { id: 'use', label: '캐시를 둔다 (cache 변수와 find 안의 cache 줄)', type: 'check', value: true },
    { id: 'chg', label: '1번 값을 두 번 찾는 사이에 하는 일', type: 'select', value: 'none', options: [['none', '아무것도 하지 않는다'], ['source', 'source.put(1, "마우스") 줄로 원본의 값을 바꾼다'], ['both', '원본의 값을 바꾸고 cache.remove(1) 줄도 쓴다']], hint: '캐시를 두지 않으면 cache.remove(1) 줄을 쓸 수 없어서, 이 선택은 원본만 바꾸는 것으로 바뀝니다.' },
  ],
  // 캐시가 없으면 cache.remove(1) 줄을 쓸 수 없다
  fix: function (c) { return !c.use && c.chg === 'both' ? { chg: 'source' } : null; },
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '캐시는 어떻게 생겼고, 같은 1번 값을 find로 두 번 찾으면 slowLoad 호출은 몇 번 일어나나', d: 'cache 줄이 있는 모습. 두 번 찾았는데 느린 조회는 한 번만 일어납니다.', v: { use: true, chg: 'none' } },
    { t: '캐시 없이 두 번 찾으면', q: 'cache 줄을 모두 지우고 find가 return slowLoad(id); 한 줄만 하게 하면', d: '찾을 때마다 원본까지 가서 느린 조회가 두 번 일어납니다.', v: { use: false, chg: 'none' } },
    { t: '캐시가 있는데 그 사이에 원본이 바뀌면', q: '두 번 찾는 사이에 source.put(1, "마우스") 줄로 원본의 값을 바꾸면', d: '느린 조회는 한 번이지만, 두 번째로 받은 값이 원본과 다릅니다.', v: { use: true, chg: 'source' } },
    { t: '원본을 바꾸면서 캐시의 값도 지우면', q: 'source.put(1, "마우스") 뒤에 cache.remove(1) 줄도 쓰면', d: '두 번째 find가 캐시에서 값을 찾지 못해 바뀐 값을 새로 읽어 옵니다.', v: { use: true, chg: 'both' } },
    { t: '캐시 없이 그 사이에 원본이 바뀌면', q: 'cache 줄이 없는 코드에서 두 번 찾는 사이에 source.put(1, "마우스") 줄로 원본의 값을 바꾸면', d: '매번 원본에서 읽으므로 바뀐 값을 받지만, 느린 조회가 두 번입니다.', v: { use: false, chg: 'source' } },
  ],
  fixc: function (c) { return { use: !!c.use, chg: !c.use && c.chg === 'both' ? 'source' : c.chg }; },
  code: function (c) {
    var f = this.fixc(c), u = f.use, chg = f.chg;
    var o = ['import java.util.*;', '', 'public class Main {', '    // 원본: 값이 원래 들어 있는 곳', '    static Map<Integer, String> source = new HashMap<>();', '    static int slowCount = 0;', '',
      '    // 느린 조회: 원본에서 읽어 온다. 부른 횟수를 센다', '    static String slowLoad(int id) {', '        slowCount++;', '        return source.get(id);', '    }', ''];
    if (u) o.push('    // 캐시: 읽어 온 값을 적어 두는 곳', '    static Map<Integer, String> cache = new HashMap<>();', '');
    o.push('    static String find(int id) {');
    if (u) o.push('        // 적어 둔 값이 있으면 주고, 없으면 읽어 와서 적어 둔다', '        if (cache.containsKey(id)) return cache.get(id);', '        String v = slowLoad(id);', '        cache.put(id, v);', '        return v;');
    else o.push('        return slowLoad(id);');
    o.push('    }', '', '    public static void main(String[] args) {', '        source.put(1, "키보드");', '        // 1번 값을 처음 찾는다', '        find(1);');
    if (chg !== 'none') o.push('        // 원본의 값을 바꾼다', '        source.put(1, "마우스");');
    if (chg === 'both') o.push('        // 캐시에 적어 둔 값도 지운다', '        cache.remove(1);');
    o.push('        // 1번 값을 다시 찾는다', '        String second = find(1);', '        // 느린 조회 횟수 / 두 번째로 받은 값 / 원본의 값', '        System.out.println(', '            slowCount + " / " + second + " / " + source.get(1));', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { var f = this.fixc(c); return (f.use ? '캐시 있음' : '캐시 없음') + ' · ' + { none: '사이에 아무것도 안 함', source: '원본만 바꿈', both: '원본을 바꾸고 캐시도 지움' }[f.chg]; },
  columns: ['느린 조회 횟수', '두 번째로 받은 값', '원본의 값'],
  simulate: function (c) {
    var f = this.fixc(c), u = f.use, chg = f.chg, changed = chg !== 'none', both = chg === 'both';
    var ev = [], sum = [], v1 = '키보드', v2 = '마우스', cur = changed ? v2 : v1;
    var st = { hot: '', act: '', u: u, cache: [], src: '', slow: 0, second: '', out: '', find: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function q(x) { return '"' + x + '"'; }

    // 1. 원본에 값을 넣는다
    st.hot = 'src'; st.act = 'chg'; st.src = v1;
    push('main이 시작되고 첫 줄 source.put(1, "키보드"); 줄이 실행됩니다. 원본에 1번 값 ' + q(v1) + '가 들어갑니다. 원본은 값이 원래 들어 있는 곳이고, slowLoad가 읽어 오는 곳입니다.' + (u ? ' cache는 new HashMap<>() 호출로 만든 빈 Map이어서 아직 아무것도 적혀 있지 않습니다.' : ' 이 코드에는 cache가 없어서, find가 읽어 온 값을 적어 둘 곳이 없습니다.'), '');

    // 2. 처음 찾는다
    st.find = 'find(1)'; st.act = '';
    if (u) {
      st.hot = 'fd'; st.act = 'miss';
      push('find(1); 줄이 실행됩니다. find는 먼저 cache.containsKey(1) 호출로 캐시에 1번 값이 적혀 있는지 봅니다. 캐시가 비어 있으므로 적혀 있지 않습니다. 캐시에 적혀 있지 않은 이런 경우를 미스라고 합니다.', '');
      st.hot = 'sl'; st.act = 'load'; st.slow = 1;
      push('그래서 find가 slowLoad 메서드를 부릅니다. slowLoad는 원본에서 1번 값 ' + q(v1) + '를 읽어 오는 느린 일이고, slowCount를 올려 부른 횟수를 셉니다. 지금까지 slowLoad가 불린 횟수는 1번입니다.', '');
      st.hot = 'ca'; st.act = 'put'; st.cache = [['1', v1]];
      push('find는 읽어 온 값 ' + q(v1) + '를 cache.put(1, v) 호출로 캐시에 적어 두고, 그 값을 돌려줍니다. 이제 캐시에 1번 값 ' + q(v1) + '가 적혀 있습니다.', 'good');
    } else {
      st.hot = 'sl'; st.act = 'load'; st.slow = 1;
      push('find(1); 줄이 실행됩니다. 이 find는 return slowLoad(id); 한 줄뿐이어서 곧바로 slowLoad를 부르고, slowLoad가 원본에서 1번 값 ' + q(v1) + '를 읽어 옵니다. slowLoad가 불린 횟수는 1번입니다. 읽어 온 값은 어디에도 적어 두지 않고 돌려줄 뿐입니다.', '');
    }

    // 3. 사이에 하는 일
    if (changed) {
      st.hot = 'src'; st.act = 'chg'; st.src = v2; st.find = '';
      push('source.put(1, "마우스") 줄이 실행되어 원본의 1번 값이 ' + q(v2) + '로 바뀝니다.' + (u ? ' 이 줄은 cache를 건드리지 않으므로 캐시에는 여전히 ' + q(v1) + '가 적혀 있습니다.' : ' 캐시가 없으므로 바뀐 곳은 원본뿐입니다.'), '');
    }
    if (both) {
      st.hot = 'ca'; st.act = 'rm'; st.cache = [];
      push('cache.remove(1) 줄이 실행되어 캐시에서 1번 값이 지워집니다. 캐시는 다시 비어 있습니다. 원본은 바뀐 그대로입니다.', '');
    }

    // 4. 다시 찾는다
    var stale = false, second;
    st.find = 'find(1)';
    if (u && !both) {
      second = v1; stale = changed;
      st.hot = 'fd'; st.act = 'hit'; st.second = second;
      push('String second = find(1); 줄이 실행됩니다. find가 cache.containsKey(1) 호출로 캐시를 보니 1번 값이 적혀 있습니다. 캐시에 적혀 있는 이런 경우를 적중이라고 합니다. find는 slowLoad를 부르지 않고 적어 둔 값 ' + q(v1) + '를 그대로 돌려줍니다. slowLoad가 불린 횟수는 1번 그대로입니다.' + (changed ? ' 원본은 이미 ' + q(v2) + '로 바뀌었지만, find는 원본을 보지 않았으므로 바뀌기 전의 값을 받았습니다.' : ''), changed ? 'bad' : 'good');
    } else if (u) {
      second = v2;
      st.hot = 'fd'; st.act = 'miss'; st.second = '';
      push('String second = find(1); 줄이 실행됩니다. find가 cache.containsKey(1) 호출로 캐시를 보지만, 방금 지웠으므로 1번 값이 적혀 있지 않습니다(미스).', '');
      st.hot = 'sl'; st.act = 'load'; st.slow = 2;
      push('그래서 find가 slowLoad를 다시 부릅니다. slowLoad는 원본에서 바뀐 1번 값 ' + q(v2) + '를 읽어 옵니다. slowLoad가 불린 횟수는 2번이 됩니다.', '');
      st.hot = 'ca'; st.act = 'put'; st.cache = [['1', v2]]; st.second = second;
      push('find는 읽어 온 값 ' + q(v2) + '를 캐시에 새로 적어 두고 돌려줍니다. 이제 캐시에 1번 값 ' + q(v2) + '가 적혀 있습니다.', 'good');
    } else {
      second = cur;
      st.hot = 'sl'; st.act = 'load'; st.slow = 2; st.second = second;
      push('String second = find(1); 줄이 실행됩니다. 이 find는 이번에도 곧바로 slowLoad를 부르고, slowLoad가 원본에서 1번 값 ' + q(cur) + '를 읽어 옵니다. slowLoad가 불린 횟수는 2번이 됩니다.' + (changed ? ' 원본이 바뀐 뒤이므로 바뀐 값을 받습니다.' : ' 같은 1번 값인데도 처음과 똑같이 원본까지 갔다 옵니다.'), changed ? 'good' : '');
    }

    // 5. 출력
    st.hot = ''; st.act = ''; st.find = ''; st.out = st.slow + ' / ' + second + ' / ' + cur;
    push('마지막 줄 System.out.println이 slowCount, second, source.get(1) 값을 차례로 출력합니다. 출력은 "' + st.out + '"입니다.' + (stale ? ' 받은 값 ' + q(second) + '와 원본의 값 ' + q(cur) + '가 다릅니다.' : ' 받은 값과 원본의 값이 같습니다.'), stale ? 'bad' : 'good');

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (u && chg === 'none') {
      sum.push('캐시는 읽어 온 값을 Map에 적어 두었다가, 같은 것을 다시 찾으면 적어 둔 값을 주는 것입니다. find 안의 cache 줄들(containsKey로 확인, put으로 적기, get으로 꺼내기)이 그 일을 했고, 1번 값을 두 번 찾았는데 느린 조회 slowLoad는 1번만 불렸습니다.');
      sum.push('두 번째 find는 적어 둔 값을 바로 주어서 원본까지 가지 않았습니다. 두 번 찾는 사이에 원본이 바뀌지 않았으므로 받은 값은 원본과 같았습니다.');
    } else if (!u && chg === 'none') {
      sum.push('cache 줄이 없으면 같은 1번 값을 두 번 찾아도 slowLoad가 두 번 불립니다. find가 읽어 온 값을 적어 두지 않으니, 찾을 때마다 원본까지 갑니다.');
      sum.push('이 코드에서는 받은 값이 늘 그 순간 원본의 값이었습니다. 캐시가 하는 일은 같은 결과를 되풀이해 얻는 느린 일을 줄이는 것입니다.');
    } else if (u && chg === 'source') {
      sum.push('캐시가 있는데 두 번 찾는 사이에 원본이 바뀌면, 두 번째 find는 바뀌기 전의 값 ' + q(v1) + '를 받습니다. 느린 조회는 1번뿐이었지만, 받은 값 ' + q(v1) + '가 원본의 값 ' + q(v2) + '와 달랐습니다.');
      sum.push('빠른 대신 옛 값을 받을 수 있다는 것이 캐시를 쓰고 잃는 것입니다. 이 캐시에는 적어 둔 값을 언제 버릴지 정하는 규칙이 없어서, 지우기 전까지 옛 값이 그대로 남습니다.');
    } else if (u) {
      sum.push('원본을 바꾸면서 cache.remove(1) 줄로 캐시의 값도 지우면, 두 번째 find가 캐시에서 값을 찾지 못해 slowLoad를 다시 불러 바뀐 값 ' + q(v2) + '를 읽어 왔습니다. 느린 조회는 2번이 되었지만 받은 값이 원본과 같았습니다.');
      sum.push('원본을 바꾸는 쪽이 캐시의 값도 함께 지워 주면 옛 값을 받는 일을 피할 수 있습니다. 대신 지운 뒤 처음 찾는 한 번은 다시 느린 조회를 합니다.');
    } else {
      sum.push('cache 줄이 없는 코드에서는 두 번 찾는 사이에 원본이 바뀌어도, 두 번째 find가 원본에서 새로 읽어 와 바뀐 값 ' + q(v2) + '를 받았습니다. 느린 조회는 2번이었고 옛 값을 받는 일은 없었습니다.');
      sum.push('옛 값을 받을 수 있는 것은 적어 둔 값이 있을 때입니다. 캐시가 없으면 매번 느린 대신 늘 그 순간 원본의 값을 받습니다.');
    }
    return { events: ev, summary: sum, fx: f, row: [st.slow + '번', second, cur] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 main이 원본에 값을 넣는 것부터 시작합니다.'); return; }
    H.table(v, ['위치', '1번에 적혀 있는 값'], [
      { cls: '', cells: ['원본(source)', s.src ? s.src : '-'] },
      { cls: s.u ? '' : 'gone', cells: ['캐시(cache)', s.u ? (s.cache.length ? s.cache[0][1] : '비어 있음') : '캐시가 없음'] },
    ], '지금 적혀 있는 값');
    H.counters(v, [[s.slow, 'slowLoad가 불린 횟수']]);
    if (s.out) H.table(v, ['느린 조회 횟수', '두 번째로 받은 값', '원본의 값'], [{ cls: '', cells: [s.out.split(' / ')[0] + '번', { v: s.second, cls: s.second === s.src ? 'good' : 'bad' }, s.src] }], '출력');
  },
  // 그림: 왼쪽 find에서 시작해, 캐시를 먼저 보고 없을 때만 slowLoad를 거쳐 원본까지 간다. 캐시가 없으면 find가 곧바로 slowLoad로 간다. 아래에 느린 조회 횟수, 두 번째로 받은 값, 원본의 값을 세는 칸.
  draw: function (P, sim, shown) {
    var u = sim.fx.use, last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '', act = s ? s.act : '';
    P.size(680, 250);
    P.box('fd', 14, 40, 150, 100, { cls: hot === 'fd' ? 'hot now' : 'plain', title: 'find', sub: s && s.find ? '실행 중: ' + s.find : '대기' });
    P.box('ca', 260, 10, 170, 64, { cls: !u ? 'ghost' : hot === 'ca' ? 'hot now' : 'plain', title: u ? '캐시' : '캐시(없음)', sub: !u ? ' ' : s && s.cache.length ? '1 → ' + s.cache[0][1] : '비어 있음' });
    P.box('sl', 260, 106, 170, 64, { cls: hot === 'sl' ? 'hot now' : 'plain', title: 'slowLoad', sub: '불린 횟수 ' + (s ? s.slow : 0) + '번' });
    P.box('src', 500, 40, 166, 100, { cls: hot === 'src' ? 'hot now' : 'plain', title: '원본', sub: '1 → ' + (s && s.src ? s.src : '-') });
    if (u && (act === 'chk' || act === 'hit' || act === 'miss')) P.arrow('a1', 'fd:r:0.25', 'ca:l', { cls: act === 'hit' ? 'good' : act === 'miss' ? 'bad' : 'hot' });
    if (act === 'load') {
      P.arrow('a2', 'fd:r:0.75', 'sl:l', { cls: 'hot' });
      P.arrow('a4', 'sl:r', 'src:l:0.75', { cls: 'hot' });
    }
    P.box('n1', 14, 196, 208, 38, { cls: s && s.slow ? 'wait' : 'ghost', title: '느린 조회 횟수', right: (s ? s.slow : 0) + '번' });
    P.box('n2', 236, 196, 208, 38, { cls: s && s.second ? (s.second === s.src ? 'good' : 'bad') : 'ghost', title: '두 번째로 받은 값', right: s && s.second ? s.second : '-' });
    P.box('n3', 458, 196, 208, 38, { cls: s && s.src ? 'plain' : 'ghost', title: '원본의 값', right: s && s.src ? s.src : '-' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 다섯 가지 조합(캐시를 두는가 두 가지와 두 번 찾는 사이에 하는 일 세 가지에서, 캐시가 없으면 cache.remove(1) 줄을 쓸 수 없어 빠지는 한 가지를 뺀 것)을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글, import 줄까지 포함)를 javax.tools로 컴파일하고, 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 출력된 세 값(slowLoad가 불린 횟수, 두 번째 find가 돌려준 값, 원본의 값)과 마지막 단계 문장이 보이는 출력 글입니다. 단계 문장이 기대는 "처음 find(1) 호출을 한 번 한 뒤 slowLoad는 1번 불렸고 받은 값은 키보드"라는 사실은, 처음 find의 결과를 출력하도록 고친 별도의 소스(캐시가 있는 것과 없는 것)를 같은 방식으로 실행해 확인했습니다. 화면의 코드는 실제로 컴파일되고 실행되는 프로그램이며 줄인 것은 없습니다. slowLoad는 실제로 오래 걸리지 않고 시간도 재지 않았습니다. "느리다"는 slowLoad가 불린 횟수로만 나타냈고, 실제 DB나 네트워크의 시간은 측정하지 않았습니다. 이 캐시는 Map 하나이고, 적어 둔 값을 언제 버릴지 정하는 규칙(유효 시간, 크기 제한)이 없어서 cache.remove(1) 줄로 지우기 전까지 값이 남습니다. 문서는 직접 열어 확인했습니다. Spring Framework Reference의 Cache Abstraction 도입부(https://docs.spring.io/spring-framework/reference/integration/cache.html)는 캐싱을 기존 애플리케이션에 투명하게 더하는 지원이라는 설명까지만 열렸고, 같은 문서의 하위 쪽(https://docs.spring.io/spring-framework/reference/integration/cache/strategies.html)에서 같은 인자로 이미 호출했으면 메서드를 실행하지 않고 캐시된 결과를 돌려주며 아니면 실행해 결과를 캐시에 넣는다는 것, 캐시의 내용을 갱신하거나 항목을 지우는 기능이 있다는 것을 확인했습니다. RFC 9111(HTTP Caching)은 1절(캐시가 응답을 저장해 응답 시간과 네트워크 사용을 줄인다), 4절(저장한 응답을 다시 쓰는 조건), 4.2절과 4.2.4절(유효 기간을 넘긴 저장 응답을 stale이라 부른다)을 확인했고, 문서의 끝 7천 자 가량은 읽지 못했습니다. 적중과 미스라는 낱말을 그 문서들이 쓰는지는 확인하지 못했고, 설명집에는 이 낱말을 일반적인 용어로만 적었습니다. 이 실습의 Map 캐시는 문서가 말하는 방식의 한 예일 뿐 스프링이나 HTTP 캐시의 동작을 실행해 대조한 것은 아닙니다. 이 밖에 여러 스레드가 동시에 쓰는 캐시, 캐시가 가득 찼을 때 무엇을 버릴지, 유효 시간(TTL), 인기 있는 값이 한꺼번에 사라질 때 원본에 요청이 몰리는 일, 스프링의 @Cacheable, 브라우저와 서버 사이의 HTTP 캐시(ETag), Redis는 다루지 않았습니다. 이들은 "세부 동작 실습: 캐시와 TTL, 캐시 추상화, ETag, Redis"에서 다룹니다.',
});
