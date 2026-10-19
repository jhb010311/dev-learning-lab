Lab.register({
  id: 'stream_basic', nav: '스트림', cat: '기초개념', mode: 'step', basic: true, deep: ['stream', 'collect'],
  title: '스트림은 무엇이고, for 문과 무엇이 다른가',
  intro: '스트림은 컬렉션(여러 값을 담은 리스트 같은 것)에 든 값을 하나씩 흘려보내면서 거르고 바꾸는 방법입니다. 코드에서는 nums.stream()으로 시작해 점(.)으로 단계를 이어 붙입니다. .filter(n -> n % 2 == 0)은 거르는 단계로, n -> ... 는 값 n을 받아 계산한 답을 돌려주는 짧은 함수(람다)이고, 여기서는 n을 2로 나눈 나머지가 0인지(짝수인지) 보아 true인 값만 통과시킵니다. .map(n -> n * 10)은 바꾸는 단계로, 통과한 값을 10배로 바꿉니다. .toList()는 흘러나온 값을 모아 리스트로 만드는 마지막 단계입니다. 같은 일을 for 문으로 쓰려면 결과를 담을 새 리스트를 만들고, 값을 하나씩 꺼내고, if로 조건을 보고, add로 담는 일을 모두 직접 적어야 합니다. 이 실습은 스트림과 for 문을 나란히 놓고 filter 줄과 map 줄을 하나씩 지워 가며 같은 코드를 컴파일하고 실행해, result에 무엇이 담기는지와 원래 리스트 nums가 바뀌는지를 봅니다. (import 줄과 main 메서드는 줄여서 보입니다.)',
  terms: ['Stream API', '람다 표현식', 'filter와 map', 'toList()와 스트림의 결과'],
  controls: [
    { id: 'style', label: '같은 일을 적는 방식', type: 'select', value: 'stream', options: [['stream', '스트림: nums.stream() 뒤에 단계를 이어 붙인다'], ['for', 'for 문: 새 리스트를 만들고 하나씩 꺼내 담는다']] },
    { id: 'filter', label: '.filter(n -> n % 2 == 0) 줄 (for 문에서는 if)', type: 'check', value: true },
    { id: 'map', label: '.map(n -> n * 10) 줄 (for 문에서는 * 10)', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '스트림은 어떻게 생겼고, result에는 무엇이 담기나', d: 'filter와 map이 있는 스트림. 짝수만 남아 10배가 되고, nums는 그대로입니다.', v: { style: 'stream', filter: true, map: true } },
    { t: '같은 일을 for 문으로 쓰면', q: '같은 일을 for 문으로 쓰면', d: '결과는 같고, 코드는 새 리스트 만들기부터 담기까지 모두 직접 적습니다.', v: { style: 'for', filter: true, map: true } },
    { t: '.filter 줄을 지우면', q: '.filter(n -> n % 2 == 0) 줄을 지우면', d: '거르는 단계가 없어 모든 값이 10배가 되어 담깁니다.', v: { style: 'stream', filter: false, map: true } },
    { t: '.map 줄을 지우면', q: '.map(n -> n * 10) 줄을 지우면', d: '바꾸는 단계가 없어 통과한 값이 그대로 담깁니다.', v: { style: 'stream', filter: true, map: false } },
    { t: '둘 다 지우면', q: '.filter 줄과 .map 줄을 둘 다 지우면', d: '거르지도 바꾸지도 않아 nums와 같은 값이 담깁니다.', v: { style: 'stream', filter: false, map: false } },
  ],
  nums: [1, 2, 3, 4, 5, 6],
  // 화면의 코드. 스트림은 한 줄이 한 단계, for 문은 새 리스트와 반복, if, add가 같은 일을 한다
  code: function (c) {
    var o = ['// main 메서드 안의 줄만 보임 (클래스·main 선언과 import는 생략)', 'List<Integer> nums = List.of(1, 2, 3, 4, 5, 6);'];
    if (c.style === 'stream') {
      o.push('// 스트림: nums의 값을 하나씩 흘려보내는 흐름을 만든다', 'List<Integer> result = nums.stream()');
      if (c.filter) o.push('    // 거르기: 짝수인 값만 통과시킨다', '    .filter(n -> n % 2 == 0)');
      if (c.map) o.push('    // 바꾸기: 통과한 값을 10배로 바꾼다', '    .map(n -> n * 10)');
      o.push('    // 모으기: 흘러나온 값을 새 리스트에 담는다', '    .toList();');
    } else {
      var ind = c.filter ? '        ' : '    ';
      o.push('// 새 리스트: 결과를 담을 빈 리스트를 직접 만든다', 'List<Integer> result = new ArrayList<>();', '// 반복: nums에서 값을 하나씩 꺼내 n에 담는다', 'for (int n : nums) {');
      if (c.filter) o.push('    // 거르기: 짝수인 값만 통과시킨다', '    if (n % 2 == 0) {');
      o.push(ind + (c.map ? '// 바꾸기와 담기: 10배로 바꿔 result에 담는다' : '// 담기: 그대로 result에 담는다'), ind + (c.map ? 'result.add(n * 10);' : 'result.add(n);'));
      if (c.filter) o.push('    }');
      o.push('}');
    }
    o.push('System.out.println(result);', 'System.out.println(nums);');
    return o.join('\n');
  },
  label: function (c) { return (c.style === 'stream' ? '스트림' : 'for 문') + ' · ' + (c.filter ? (c.style === 'stream' ? 'filter 있음' : 'if 있음') : (c.style === 'stream' ? 'filter 없음' : 'if 없음')) + ' · ' + (c.map ? '* 10 있음' : '* 10 없음'); },
  columns: ['result', '원래 리스트 nums', '코드에 적은 단계'],
  simulate: function (c) {
    var ev = [], sum = [], st0 = c.style === 'stream', fOn = !!c.filter, mOn = !!c.map, V = this.nums.slice();
    var F = st0 ? 'filter' : 'if', M = st0 ? 'map' : 'add';
    var st = { numsMade: false, made: false, cur: null, note: '', stage: '', dropped: [], got: [], hist: [], checked: 0, out: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function list(a) { return '[' + a.join(', ') + ']'; }
    var trace = [], result = [];
    V.forEach(function (v) {
      var pass = !fOn || v % 2 === 0;
      if (fOn) trace.push(F + '(' + v + ')');
      if (pass) { var x = mOn ? v * 10 : v; result.push(x); trace.push(st0 ? (mOn ? 'map(' + v + ')' : null) : 'add(' + x + ')'); }
    });
    trace = trace.filter(function (t) { return t; });
    var res = list(result), numsTxt = list(V);

    // 1. nums를 만든다
    st.numsMade = true; st.stage = 'nm';
    push('List<Integer> nums = List.of(1, 2, 3, 4, 5, 6); 줄이 값 6개를 이 순서대로 담은 리스트 nums를 만듭니다. 이 리스트가 앞으로 거르고 바꿀 값의 출처입니다.', '');
    // 2. 스트림을 만들거나 새 리스트를 만든다
    if (st0) {
      st.stage = 'nm';
      push('nums.stream() 줄이 nums에 든 값을 하나씩 흘려보내는 흐름, 곧 스트림을 만듭니다. 스트림은 값을 따로 저장하는 곳이 아니라, nums에서 값을 하나씩 꺼내 다음 단계로 전해 주는 통로입니다. 아래에 이어 붙인 ' + [fOn ? '.filter' : null, mOn ? '.map' : null, '.toList'].filter(function (t) { return t; }).join(', ') + ' 줄은 그 통로에 단계를 더한 것입니다. 끝의 .toList() 줄이 실행되면 값이 하나씩 흘러갑니다.', '');
    } else {
      st.made = true; st.stage = 'rs';
      push('List<Integer> result = new ArrayList<>(); 줄이 비어 있는 새 리스트 result를 만듭니다. for 문으로 쓸 때는 결과를 담을 그릇을 우리가 직접 만들어야 합니다.', '');
      st.stage = 'nm';
      push('for (int n : nums) 줄이 nums에서 값을 앞에서부터 하나씩 꺼냅니다. 값을 꺼낼 때마다 n에 담고 중괄호 안의 줄들을 실행합니다. 이것도 우리가 직접 적은 반복입니다.', '');
    }
    // 3. 값을 하나씩
    V.forEach(function (v, i) {
      var pass = !fOn || v % 2 === 0, x = mOn ? v * 10 : v, pre = st0 ? '값 ' + v + ': ' : 'n = ' + v + ': ';
      st.cur = v; st.note = '';
      if (fOn) {
        st.stage = 'fl'; st.checked++;
        var rem = v % 2;
        if (pass) {
          st.note = '통과';
          push(pre + (st0 ? 'filter가 n % 2 == 0 식을 계산합니다. ' : 'if (n % 2 == 0) 줄이 조건을 확인합니다. ') + v + ' % 2의 나머지는 ' + rem + '이어서 true이고, ' + (st0 ? '이 값은 다음 단계로 통과합니다.' : '중괄호 안으로 들어갑니다.'), '');
        } else {
          st.dropped.push(v); st.note = '버려짐'; st.hist.push([String(v), '버려짐', 'gone']);
          push(pre + (st0 ? 'filter가 n % 2 == 0 식을 계산합니다. ' : 'if (n % 2 == 0) 줄이 조건을 확인합니다. ') + v + ' % 2의 나머지는 ' + rem + '이어서 false이고, ' + (st0 ? '이 값은 버려집니다. 버려진 값은 ' + (mOn ? 'map에' : '') + (mOn ? ' 닿지 않고 ' : '') + 'result에 담기지 않습니다.' : '중괄호 안을 건너뜁니다. result에는 아무것도 담지 않습니다.'), '');
          return;
        }
      }
      if (mOn) {
        st.stage = 'mp'; st.got.push(x); st.hist.push([String(v), x + ' 담김', 'good']); st.note = v + ' → ' + x;
        if (st0) push(pre + 'map이 n * 10 식을 계산해 값을 바꿉니다. n * 10은 ' + x + '이고, 바뀐 값은 toList 쪽으로 흘러가 모입니다.', 'good');
        else push(pre + 'result.add(n * 10) 줄이 실행됩니다. n * 10은 ' + x + '이고, 이 값이 result의 맨 뒤에 담깁니다.', 'good');
      } else {
        st.stage = st0 ? 'rs' : 'mp'; st.got.push(x); st.hist.push([String(v), x + ' 담김', 'good']); st.note = '그대로';
        if (st0) push(pre + (fOn ? '' : '거칠 단계가 없어 ') + '값을 바꾸지 않고 그대로 toList 쪽으로 흘려보내 모읍니다.', 'good');
        else push(pre + 'result.add(n) 줄이 실행됩니다. 담기는 값은 ' + v + ' 그대로이고, result의 맨 뒤에 담깁니다.', 'good');
      }
    });
    // 4. 끝
    st.cur = null; st.note = ''; st.stage = 'rs';
    if (st0) {
      st.made = true;
      push('nums의 값 6개가 모두 흘러갔습니다. .toList() 줄이 모인 값으로 리스트를 만들어 result에 담습니다. result는 ' + res + '입니다.', 'good');
    } else {
      push('for 문이 nums의 값 6개를 모두 꺼내고 끝납니다. result는 ' + res + '입니다.', 'good');
    }
    st.stage = ''; st.out.push(res);
    push('System.out.println(result) 줄의 출력은 ' + res + '입니다.', 'good');
    st.out.push(numsTxt);
    push('System.out.println(nums) 줄의 출력은 ' + numsTxt + '입니다. ' + (st0 ? '스트림은 nums에서 값을 흘려보내기만 했고 nums를 고치지 않았습니다.' : 'for 문은 nums에서 값을 꺼내기만 하고 새 리스트 result에만 담았으므로 nums는 그대로입니다.'), 'good');

    // 요약: 첫 줄은 이 설정(물음)의 답
    var both = fOn && mOn;
    if (st0 && both) {
      sum.push('스트림은 컬렉션의 값을 하나씩 흘려보내며 거르고(filter) 바꾸는(map) 방법입니다. nums의 값이 하나씩 흘러 짝수만 남고 10배가 되어, result에 담긴 값은 ' + res + '입니다. for 문과 다른 곳은 "무엇을 거르고 무엇으로 바꿀지"만 적었다는 점입니다.');
      sum.push('새 리스트를 만들고 값을 하나씩 꺼내고 담는 일은 코드에 적지 않았습니다. nums는 ' + numsTxt + ' 그대로입니다. 모으는 줄을 빼면 어떻게 되는지는 세부 동작 실습 "스트림 지연 평가"에서 다룹니다.');
    } else if (!st0 && both) {
      sum.push('같은 일을 for 문으로 쓰면 결과도 같습니다. result에 담긴 값은 ' + res + '이고 nums는 그대로입니다. 스트림이 .filter와 .map 두 줄로 적은 것을, for 문은 새 리스트 만들기, 하나씩 꺼내기, if로 조건 보기, add로 담기까지 모두 직접 적었습니다.');
      sum.push('두 방식은 코드의 모양만 다르고 결과가 같습니다. for 문에서도 nums는 고치지 않고 새 리스트 result에만 담았습니다.');
    } else if (!fOn && mOn) {
      sum.push((st0 ? '.filter 줄을 지우면' : 'if를 지우면') + ' 거르는 단계가 없어 값 6개가 모두 10배가 되어 담깁니다. result에 담긴 값은 ' + res + '입니다.');
      sum.push('몇 개가 담기는지는 ' + (st0 ? 'filter' : 'if') + '가 정합니다. ' + (st0 ? 'map은' : '* 10 부분은') + ' 값을 바꿀 뿐 개수를 줄이지 않습니다. nums는 ' + numsTxt + ' 그대로입니다.');
    } else if (fOn && !mOn) {
      sum.push((st0 ? '.map 줄을 지우면' : '* 10 부분을 지우면') + ' 바꾸는 단계가 없어 통과한 값이 그대로 담깁니다. result에 담긴 값은 ' + res + '입니다.');
      sum.push((st0 ? 'filter' : 'if') + '는 값을 고르고, ' + (st0 ? 'map' : '* 10 부분') + '은 값을 바꿉니다. 고르는 일은 그대로이므로 짝수 3개만 담겼고, nums는 ' + numsTxt + ' 그대로입니다.');
    } else {
      sum.push((st0 ? '.filter 줄과 .map 줄을 둘 다 지우면' : 'if와 * 10 부분을 둘 다 지우면') + ' 값을 거르지도 바꾸지도 않아, result에 담긴 값은 ' + res + '입니다. nums와 같은 값입니다.');
      sum.push('같은 값이어도 result는 ' + (st0 ? '.toList() 줄이 값을 모아 만든' : '직접 new로 만든') + ' 리스트이고 nums는 처음부터 있던 리스트여서, 서로 다른 리스트입니다.');
    }
    var steps = st0 ? [fOn ? 'filter' : null, mOn ? 'map' : null, 'toList'] : ['for', fOn ? 'if' : null, 'add'];
    steps = steps.filter(function (t) { return t; });
    return { events: ev, summary: sum, trace: trace, fOn: fOn, mOn: mOn, row: [res, numsTxt, steps.join(' → ')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, st0 = sim.c.style === 'stream';
    if (!s) { H.text(v, '실행을 누르면 nums를 만드는 것부터 시작합니다.'); return; }
    H.table(v, ['nums의 값', '결과'], s.hist.length ? s.hist.map(function (r) { return { cls: r[2], cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['아직 다룬 값 없음', ''] }], '값마다 일어난 일');
    H.counters(v, [[s.checked, st0 ? 'filter가 확인한 값' : 'if가 확인한 값'], [s.got.length, 'result에 담긴 값']]);
  },
  // 그림: 왼쪽부터 nums, 거르는 단계(filter 또는 if), 바꾸는 단계(map 또는 add), result 상자. 값이 지나는 단계에 화살표가 켜진다. 없앤 단계는 점선 상자. 아래에 지금 다루는 값, 버려진 값, 원래 리스트 nums.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, st0 = c.style === 'stream', stg = s ? s.stage : '';
    P.size(680, 292);
    function rows(a) { var o = []; for (var i = 0; i < a.length; i += 3) o.push(a.slice(i, i + 3).join(' ')); return o; }
    P.box('nm', 14, 16, 120, 84, { cls: stg === 'nm' ? 'hot now' : 'plain', title: 'nums', sub: s && s.numsMade ? ['1 2 3', '4 5 6'] : '아직 없음' });
    P.box('fl', 190, 16, 120, 84, { cls: !c.filter ? 'ghost' : stg === 'fl' ? 'hot now' : 'plain', title: st0 ? 'filter' : 'if', sub: c.filter ? ['n % 2 == 0', '짝수만 통과'] : '거르지 않음' });
    P.box('mp', 366, 16, 120, 84, { cls: !c.map ? 'ghost' : stg === 'mp' ? 'hot now' : 'plain', title: st0 ? 'map' : 'add', sub: c.map ? ['n * 10', '10배로 바꿈'] : '바꾸지 않음' });
    var made = s && s.made, got = s ? s.got : [], rsub = got.length ? (made ? rows(got) : ['모으는 중'].concat(rows(got))) : made ? '비어 있음' : '아직 없음';
    P.box('rs', 542, 16, 120, 84, { cls: stg === 'rs' ? 'hot now' : made ? 'good' : 'ghost', title: 'result', sub: rsub });
    P.arrow('a1', 'nm:r', 'fl:l', { cls: stg === 'fl' ? 'hot' : 'mut' });
    P.arrow('a2', 'fl:r', 'mp:l', { cls: stg === 'mp' ? 'hot' : 'mut' });
    P.arrow('a3', 'mp:r', 'rs:l', { cls: stg === 'rs' || (stg === 'mp' && !st0) ? 'hot' : 'mut' });
    P.box('r1', 14, 120, 652, 40, { cls: s && s.cur !== null ? 'wait' : 'ghost', title: '지금 다루는 값', right: s && s.cur !== null ? 'n = ' + s.cur + (s.note ? ' · ' + s.note : '') : '' });
    P.box('r2', 14, 168, 652, 40, { cls: s && s.dropped.length ? 'plain' : 'ghost', title: '버려진 값', right: !c.filter ? '거르지 않음' : s && s.dropped.length ? s.dropped.join(', ') : '' });
    P.box('r3', 14, 216, 652, 40, { cls: s && s.numsMade ? 'good' : 'ghost', title: '원래 리스트 nums', right: s && s.numsMade ? '[1, 2, 3, 4, 5, 6]' : '' });
    P.note('nums의 값은 한 번에 하나씩 단계를 지나고, 어느 단계에서도 nums 자체는 바뀌지 않습니다.');
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1입니다. 여덟 가지 조합(방식 2 x filter 2 x map 2)을 모두, 화면의 코드에 import java.util.*;과 class Main, main 메서드를 둘러 javax.tools로 컴파일하고 새 클래스 로더로 읽어 실행한 표준 출력과 대조했습니다. 화면은 이 둘러싼 줄(import, class, main)을 줄여서 보여 줍니다. 대조한 것은 result 출력, nums 출력, 코드에 적은 단계(소스의 줄에서 읽은 것), 그리고 화면의 코드가 Probe가 컴파일한 소스와 같은 글인지입니다. 단계 문장이 기대는 사실은 별도로 쟀습니다. 조합마다 같은 소스에 filter, map, if, add가 불릴 때 기록을 남기는 줄만 더해 실행해, 값 하나가 filter와 map을 모두 지난 뒤 다음 값으로 넘어가고(스트림도 for 문과 같은 순서), 버려진 값에는 map이 불리지 않는 것을 확인했습니다. 거르기도 바꾸기도 없는 스트림의 result가 nums와 같은 값이지만 같은 객체는 아닌 것(result == nums는 false, equals는 true)도 이 JDK에서 실행해 확인했습니다. 문서는 Java SE 21 API를 직접 열어 확인했습니다. java.util.stream 패키지 설명에서는 스트림이 요소를 저장하는 자료구조가 아니라 원본에서 요소를 연산의 파이프라인으로 전달하는 것이라는 것, 연산이 원본을 바꾸지 않고 filter가 원본에서 요소를 지우지 않고 새 스트림을 만든다는 것, 중간 연산은 지연되며 최종 연산이 실행되어야 원본 순회가 시작된다는 것을 따랐습니다. Stream 문서에서는 filter가 조건에 맞는 요소로 이루어진 스트림을, map이 함수를 적용한 결과로 이루어진 스트림을 돌려주는 중간 연산이라는 것, toList()가 요소를 List에 모으고 그 List는 수정할 수 없다는 것을 따랐습니다. List.of 문서에서는 List.of가 수정할 수 없는 리스트를 만든다는 것을 따랐습니다. Stream 문서는 마지막 약 2천 자를 읽지 못했습니다. toList()가 돌려주는 리스트가 새로 만든 것이라는 문장은 문서에 명시되어 있지 않고, 문서의 구현 요구 사항(요소를 새 ArrayList에 복사)과 이 JDK에서의 관찰을 따랐습니다. 주의할 점은 nums가 List.of로 만든 수정할 수 없는 리스트라서, 이 실습에서 nums가 그대로인 것이 스트림 덕분만은 아니라는 것입니다. 스트림이 원본을 바꾸지 않는다는 것은 위 패키지 설명의 문장을 따른 것이고, 이 실습의 실행이 따로 증명한 것이 아닙니다. 이 밖에 정렬(sorted), 개수 제한(limit), 합계, 병렬 스트림, 스트림은 한 번만 쓸 수 있다는 것은 다루지 않았고, 모으는 줄(toList)이 없으면 아무 일도 일어나지 않는 것과 처리 순서는 "세부 동작 실습: 스트림 지연 평가"에서, toList 말고 Map 등으로 모으는 방법은 "스트림으로 모으기"에서 다룹니다.',
});
