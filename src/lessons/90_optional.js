Lab.register({
  id: 'optional', nav: 'Optional', cat: '자바 언어', mode: 'step',
  title: '값이 있는데도 orElse의 기본값 코드는 왜 실행되나',
  intro: 'Optional은 값이 있을 수도 없을 수도 있다는 것을 나타내는 상자입니다. 만드는 방법(of, ofNullable, empty)과 꺼내는 방법(get, orElse, orElseGet, map)에 따라, 값이 없을 때 예외가 나기도 하고 기본값이 쓰이기도 합니다. orElse와 orElseGet은 결과가 같아 보여도 기본값을 만드는 코드가 실행되는 때가 다릅니다.',
  terms: ['Optional', 'orElse와 orElseGet', 'NullPointerException', '지연 평가(Lazy Evaluation)', '람다 표현식'],
  controls: [
    { id: 'val', label: 'name에 들어 있는 값', type: 'select', value: 'kim', options: [['kim', '"kim" (값이 있음)'], ['null', 'null (값이 없음)']], show: function (c) { return c.make !== 'empty'; } },
    { id: 'make', label: 'Optional을 만드는 방법', type: 'select', value: 'nullable', options: [['of', 'Optional.of(name)'], ['nullable', 'Optional.ofNullable(name)'], ['empty', 'Optional.empty()']] },
    { id: 'take', label: '값을 꺼내는 방법', type: 'select', value: 'orElse', options: [['get', 'get()'], ['orElse', 'orElse(makeDefault())'], ['orElseGet', 'orElseGet(() -> makeDefault())'], ['map', 'map으로 이어 간 뒤 orElse("이름 없음")']], hint: 'makeDefault()는 기본값 "손님"을 만드는 메서드이고, 실행되면 한 줄을 출력합니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'name에 "kim" 값이 있고 Optional.ofNullable(name) 호출로 만든 opt를 orElse(makeDefault()) 호출로 꺼내면 어떻게 되나', d: '값이 있는데도 makeDefault()가 실행됩니다.', v: { val: 'kim', make: 'nullable', take: 'orElse' } },
    { t: 'orElseGet으로 바꾸면', q: 'orElse(makeDefault()) 대신 orElseGet(() -> makeDefault()) 방식으로 꺼내면', d: '값이 있으면 makeDefault()가 실행되지 않습니다.', v: { val: 'kim', make: 'nullable', take: 'orElseGet' } },
    { t: 'Optional.of에 null을 넣으면', q: 'name을 null로 바꾸고 Optional.of(name) 호출로 만들면', d: 'Optional을 만드는 순간 NullPointerException이 납니다.', v: { val: 'null', make: 'of', take: 'orElse' } },
    { t: '비어 있는데 get()', q: 'name이 null인데 get() 호출로 꺼내면', d: 'null이 아니라 NoSuchElementException이 나옵니다.', v: { val: 'null', make: 'nullable', take: 'get' } },
    { t: '비어 있을 때의 orElseGet', q: 'name이 null인데 orElseGet(() -> makeDefault()) 방식으로 꺼내면', d: '이때에만 makeDefault()가 실행됩니다.', v: { val: 'null', make: 'nullable', take: 'orElseGet' } },
    { t: 'map으로 이어 가기 (값 없음)', q: 'name이 null인데 map으로 이어 간 뒤 orElse("이름 없음") 방식으로 꺼내면', d: 'null 검사를 하지 않아도 예외 없이 끝까지 갑니다.', v: { val: 'null', make: 'nullable', take: 'map' } },
    { t: 'map으로 이어 가기 (값 있음)', q: 'name에 "kim" 값이 있는데 map으로 이어 간 뒤 orElse("이름 없음") 방식으로 꺼내면', d: '값에 함수를 차례로 적용합니다.', v: { val: 'kim', make: 'nullable', take: 'map' } },
  ],
  code: function (c) {
    var useMd = c.take === 'orElse' || c.take === 'orElseGet';
    var md = useMd ? '    static String makeDefault() {                // 기본값을 만드는 메서드\n        System.out.println("makeDefault 실행");\n        return "손님";\n    }\n\n' : '';
    var mk = c.make === 'empty' ? '        Optional<String> opt = Optional.empty();\n' : '        String name = ' + (c.val === 'kim' ? '"kim"' : 'null') + ';\n        Optional<String> opt = Optional.' + (c.make === 'of' ? 'of' : 'ofNullable') + '(name);\n';
    var tk = { get: '        String result = opt.get();\n', orElse: '        String result = opt.orElse(makeDefault());\n', orElseGet: '        String result = opt.orElseGet(() -> makeDefault());\n',
      map: '        String result = opt.map(s -> s.toUpperCase())\n                           .map(s -> s + " 님")\n                           .orElse("이름 없음");\n' }[c.take];
    return 'import java.util.Optional;\n\npublic class Main {\n' + md + '    public static void main(String[] args) {\n' + mk + '        System.out.println(opt);\n\n' + tk + '        System.out.println(result);\n    }\n}';
  },
  label: function (c) {
    return (c.make === 'empty' ? 'Optional.empty()' : (c.make === 'of' ? 'of(' : 'ofNullable(') + (c.val === 'kim' ? '"kim"' : 'null') + ')') + ' · ' + { get: 'get()', orElse: 'orElse(makeDefault())', orElseGet: 'orElseGet(() -> makeDefault())', map: 'map 두 번 뒤 orElse' }[c.take];
  },
  columns: ['opt의 상태', '꺼낸 결과', 'makeDefault() 실행 여부'],
  simulate: function (c) {
    var has = c.make !== 'empty' && c.val === 'kim', npe = c.make === 'of' && c.val === 'null', useMd = c.take === 'orElse' || c.take === 'orElseGet';
    var ev = [], sum = [], ex = '';
    // name: 변수의 값 · opt: '' | 'kim' | 'empty' | 'npe' · md: '' | 'wait' | 'run' | 'skip' · chain: map 단계의 값
    var st = { name: '', opt: '', md: '', chain: [], res: '', ex: '', out: [] };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    if (c.make !== 'empty') {
      st.name = c.val === 'kim' ? '"kim"' : 'null';
      push('String name = ' + st.name + ': ' + (c.val === 'kim' ? 'name이 문자열 "kim"을 가리킵니다.' : 'name은 아무 객체도 가리키지 않습니다(null).'));
    }
    if (npe) {
      st.opt = 'npe'; st.ex = ex = 'NullPointerException';
      push('Optional.of(name): of는 값이 반드시 있을 때 쓰는 메서드입니다. null을 받으면 Optional을 만들지 않고 그 자리에서 NullPointerException을 던집니다.', 'bad');
      push('예외로 프로그램이 멈춥니다. Optional이 만들어지지 않았으므로 아래 줄들은 하나도 실행되지 않습니다.' + (useMd ? ' makeDefault()도 실행되지 않습니다.' : ''), 'bad');
      sum.push('Optional로 감싼다고 해서 null이 저절로 안전해지지 않습니다. of는 null을 받지 않습니다.');
      sum.push('null일 수도 있는 값은 Optional.ofNullable로 감쌉니다.');
      return { events: ev, summary: sum, ex: ex, out: [], row: ['예외: NullPointerException', '(실행되지 않음)', useMd ? '실행되지 않음' : '(쓰지 않음)'] };
    }
    st.opt = has ? 'kim' : 'empty';
    if (c.make === 'of') push('Optional.of(name): name이 null이 아니므로 값 "kim"을 담은 Optional을 만듭니다.');
    else if (c.make === 'nullable') push('Optional.ofNullable(name): ' + (has ? 'name이 null이 아니므로 값 "kim"을 담은 Optional을 만듭니다.' : 'name이 null이므로 비어 있는 Optional을 만듭니다. of와 달리 예외를 던지지 않습니다.'));
    else push('Optional.empty(): 값이 들어 있지 않은, 비어 있는 Optional을 돌려줍니다.');
    var optStr = has ? 'Optional[kim]' : 'Optional.empty';
    st.out.push(optStr);
    push('System.out.println(opt): ' + optStr + ' 한 줄이 출력됩니다. ' + (has ? '대괄호 안이 들어 있는 값입니다.' : '값이 없다는 표시입니다.'));
    var res = '', mdRow = '(쓰지 않음)';
    if (c.take === 'get') {
      if (has) { res = 'kim'; st.res = res; push('opt.get(): 값이 들어 있으므로 "kim"을 꺼내 돌려줍니다.', 'good'); }
      else {
        st.ex = ex = 'NoSuchElementException: No value present';
        push('opt.get(): 비어 있는데 값을 꺼내려고 했습니다. null을 돌려주는 것이 아니라 NoSuchElementException을 던집니다. 예외 메시지는 "No value present"입니다.', 'bad');
        push('예외로 프로그램이 멈춥니다. 마지막 출력 줄은 실행되지 않습니다.', 'bad');
      }
    } else if (c.take === 'orElse') {
      st.md = 'run'; st.out.push('makeDefault 실행'); mdRow = '실행됨';
      push('makeDefault(): orElse를 호출하기 전에 괄호 안의 인자부터 계산합니다. 자바는 메서드를 부르기 전에 넘길 값을 먼저 구하기 때문입니다. opt에 값이 있는지와 상관없이 makeDefault()가 실행되어 "makeDefault 실행"이 출력되고, "손님"이 만들어집니다.', has ? 'bad' : '');
      res = has ? 'kim' : '손님'; st.res = res;
      push('opt.orElse("손님"): ' + (has ? '값이 들어 있으므로 "kim"을 돌려줍니다. 방금 만든 "손님"은 쓰이지 않고 버려집니다.' : '비어 있으므로 인자로 받은 "손님"을 돌려줍니다.'), has ? '' : 'good');
    } else if (c.take === 'orElseGet') {
      st.md = 'wait';
      push('opt.orElseGet(() -> makeDefault()): 괄호 안의 람다는 "필요해지면 실행할 코드"입니다. 이 줄에서는 람다를 넘기기만 하고, makeDefault()는 아직 실행되지 않습니다.');
      if (has) { st.md = 'skip'; mdRow = '실행되지 않음'; res = 'kim'; st.res = res; push('orElseGet 안에서: 값이 들어 있으므로 "kim"을 돌려줍니다. 람다는 끝내 실행되지 않고, makeDefault()도 불리지 않습니다.', 'good'); }
      else { st.md = 'run'; mdRow = '실행됨'; st.out.push('makeDefault 실행'); res = '손님'; st.res = res; push('orElseGet 안에서: 비어 있으므로 넘겨받은 람다를 실행합니다. makeDefault()가 불려 "makeDefault 실행"이 출력되고, 돌아온 "손님"이 결과가 됩니다.', 'good'); }
    } else {
      if (has) {
        st.chain.push('KIM');
        push('opt.map(s -> s.toUpperCase()): 값이 들어 있으므로 "kim"에 함수를 적용하고, 결과 "KIM"을 담은 새 Optional을 돌려줍니다.');
        st.chain.push('KIM 님');
        push('.map(s -> s + " 님"): 앞 단계의 Optional에 값이 들어 있으므로 다시 함수를 적용합니다. "KIM 님"을 담은 Optional이 됩니다.');
        res = 'KIM 님'; st.res = res;
        push('.orElse("이름 없음"): 값이 들어 있으므로 "KIM 님"을 꺼내 돌려줍니다.', 'good');
      } else {
        st.chain.push('');
        push('opt.map(s -> s.toUpperCase()): 비어 있으므로 함수를 실행하지 않고, 비어 있는 Optional을 돌려줍니다. 없는 값에 toUpperCase()를 부르는 일이 생기지 않습니다.');
        st.chain.push('');
        push('.map(s -> s + " 님"): 앞 단계가 비어 있으므로 이번에도 함수를 건너뛰고 비어 있는 Optional을 넘깁니다.');
        res = '이름 없음'; st.res = res;
        push('.orElse("이름 없음"): 끝까지 비어 있으므로 기본값 "이름 없음"을 돌려줍니다. null 검사를 한 번도 적지 않았지만 예외 없이 끝났습니다.', 'good');
      }
    }
    if (!ex) { st.out.push(res); push('System.out.println(result): ' + res + ' 한 줄이 출력됩니다.'); }
    if (c.take === 'get') {
      sum.push(has ? 'get()은 값이 있을 때만 안전합니다.' : 'Optional에서 get()을 그냥 부르는 것은 null을 검사하지 않고 쓰는 것과 다르지 않습니다. 예외의 이름만 바뀔 뿐입니다.');
      sum.push('값이 없을 수 있다면 orElse, orElseGet, map처럼 "없을 때 어떻게 할지"를 함께 적는 메서드를 씁니다.');
    } else if (c.take === 'orElse') {
      sum.push(has ? '값이 있어서 기본값이 필요 없는데도 makeDefault()가 실행되었습니다. orElse의 괄호 안은 평범한 인자라서 orElse가 불리기 전에 항상 먼저 계산됩니다.' : '비어 있으므로 기본값이 쓰였습니다. 이 경우에는 orElseGet과 결과도, makeDefault()가 실행되는 것도 같습니다.');
      sum.push('기본값이 "없음" 같은 이미 만들어져 있는 값이면 orElse로 충분합니다. 기본값을 만드는 데 DB 조회나 객체 생성 같은 일이 따른다면 orElseGet을 씁니다.');
    } else if (c.take === 'orElseGet') {
      sum.push(has ? 'orElseGet은 기본값이 아니라 "기본값을 만드는 코드"(람다)를 받습니다. 값이 있으면 그 코드를 실행하지 않습니다.' : '비어 있을 때에만 람다가 실행됩니다.');
    } else {
      sum.push(has ? 'map은 값이 들어 있으면 함수를 적용한 결과를 다시 Optional에 담아 돌려줍니다. 그래서 map을 여러 번 이어 쓸 수 있습니다.' : 'map은 비어 있으면 함수를 실행하지 않고 빈 Optional을 그대로 넘깁니다. 중간에 if (x != null)을 적지 않아도 됩니다.');
      sum.push('값이 없을 때의 처리는 맨 끝의 orElse 한 곳에만 적으면 됩니다.');
    }
    return { events: ev, summary: sum, ex: ex, out: st.out.slice(), row: [optStr, ex ? '예외: NoSuchElementException' : res, mdRow] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, useMd = c.take === 'orElse' || c.take === 'orElseGet';
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    var ln = H.lanes(v);
    if (c.make !== 'empty') H.lane(ln, 'name', s.name || '아직 없음', s.name ? 'wait' : 'none');
    H.lane(ln, 'opt', !s.opt ? '아직 없음' : s.opt === 'npe' ? '만들지 못함 (NullPointerException)' : s.opt === 'kim' ? '값 "kim"이 들어 있음' : '비어 있음', !s.opt ? 'none' : s.opt === 'npe' ? 'bad' : s.opt === 'kim' ? 'good' : 'hot');
    if (useMd) H.lane(ln, 'makeDefault()', s.md === 'run' ? '실행됨 → "손님"' : s.md === 'skip' ? '실행되지 않음' : s.md === 'wait' ? '람다로 넘겨짐 (아직 실행 전)' : '아직 실행 전', s.md === 'run' ? 'hot' : s.md === 'skip' ? 'good' : 'none');
    if (c.take === 'map') s.chain.forEach(function (x, i) { H.lane(ln, 'map ' + (i + 1) + '번째', x ? '함수 실행 → "' + x + '"' : '함수를 건너뜀 (비어 있음)', x ? 'good' : 'wait'); });
    H.lane(ln, 'result', s.res ? '"' + s.res + '"' : s.ex ? '예외로 값을 받지 못함' : '아직 없음', s.res ? 'good' : s.ex ? 'bad' : 'none');
  },
  // 그림: 왼쪽에서 오른쪽으로 name → Optional 상자 → 꺼낸 결과. Optional 아래에는 기본값을 만드는 makeDefault()(또는 map의 두 단계)가 실행됐는지를 둔다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { name: '', opt: '', md: '', chain: [], res: '', ex: '', out: [] }, useMd = c.take === 'orElse' || c.take === 'orElseGet';
    P.size(680, 300);
    P.box('name', 16, 30, 170, 50, c.make === 'empty' ? { cls: 'ghost', title: 'name', sub: '이 설정에서는 쓰지 않음' } : s.name ? { cls: s.name === 'null' ? 'plain' : 'wait', title: 'name', sub: s.name === 'null' ? 'null (값이 없음)' : '"kim"' } : { cls: 'ghost', title: 'name', sub: '아직 없음' });
    P.box('opt', 250, 24, 200, 62, !s.opt ? { cls: 'ghost', title: 'opt : Optional', sub: '아직 없음' } : s.opt === 'npe' ? { cls: 'bad', title: 'opt : Optional', sub: ['만들지 못함', 'NullPointerException'] } : s.opt === 'kim' ? { cls: 'good', title: 'opt : Optional', sub: '값 "kim"이 들어 있음' } : { cls: 'hot', title: 'opt : Optional', sub: '비어 있음' });
    if (c.make !== 'empty' && s.opt) P.arrow('mk', 'name:r', 'opt:l', { cls: s.opt === 'npe' ? 'bad' : '', label: c.make === 'of' ? 'of' : 'ofNullable' });
    P.box('res', 500, 30, 164, 50, s.res ? { cls: 'good', title: 'result', sub: '"' + s.res + '"' } : s.ex ? { cls: 'bad', title: 'result', sub: '예외로 받지 못함' } : { cls: 'ghost', title: 'result', sub: '아직 없음' });
    var fromDefault = s.res && s.opt === 'empty' && c.take !== 'get';
    if (s.res && !fromDefault) P.arrow('tk', 'opt:r', 'res:l', { cls: 'good', label: c.take === 'map' ? '꺼낸 결과' : '들어 있던 값' });
    if (useMd) {
      P.box('md', 250, 130, 200, 56, { cls: s.md === 'run' ? 'hot now' : s.md === 'skip' ? 'ghost' : 'plain', title: 'makeDefault()', sub: s.md === 'run' ? '실행됨 → "손님"' : s.md === 'skip' ? '실행되지 않음' : s.md === 'wait' ? '람다로 넘겨짐, 아직 실행 전' : '아직 실행 전' });
      if (fromDefault) P.arrow('df', 'md:r', 'res:b', { cls: 'hot', label: '기본값' });
    } else if (c.take === 'map') {
      ['s.toUpperCase()', 's + " 님"'].forEach(function (f, i) {
        var done = s.chain.length > i, x = s.chain[i];
        P.box('m' + i, 140 + i * 210, 130, 196, 56, { cls: !done ? 'plain' : x ? 'good' : 'ghost', title: 'map: ' + f, sub: !done ? '아직 실행 전' : x ? '실행됨 → "' + x + '"' : '건너뜀 (비어 있음)' });
      });
      if (s.chain.length) P.arrow('c0', 'opt:b', 'm0:t', {});
      if (s.chain.length > 1) P.arrow('c1', 'm0:r', 'm1:l', {});
      if (fromDefault) P.arrow('df', 'm1:r', 'res:b', { cls: 'hot', label: '"이름 없음"' });
    } else P.box('md', 250, 130, 200, 56, { cls: 'ghost', title: 'get()', sub: '값이 없을 때의 대비가 없음' });
    P.box('out', 16, 216, 648, 34, { cls: s.out.length ? 'plain' : 'ghost', title: '출력', right: s.out.length ? s.out.join(' / ') : s.ex ? '없음' : '아직 없음' });
    if (s.ex) P.text('ex', 16, 276, '예외: ' + s.ex, { cls: 'bad' });
    P.note(useMd ? 'orElse는 기본값을 미리 만들어서 넘기고, orElseGet은 기본값을 만드는 코드를 넘깁니다. 그래서 값이 들어 있을 때 makeDefault()가 실행되는지가 다릅니다.' : c.take === 'map' ? 'map은 값이 들어 있을 때만 함수를 실행하고, 비어 있으면 건너뜁니다. 값이 없을 때의 처리는 마지막 orElse가 맡습니다.' : 'get()은 값이 들어 있을 때만 쓸 수 있습니다. 비어 있으면 예외를 던집니다.');
  },
  assume: '스물네 가지 조합(Optional.empty()는 name을 쓰지 않으므로 서로 다른 경우는 스무 가지)에서 화면에 찍히는 줄과 예외를 이 PC의 JDK 21에서 같은 코드를 실행한 결과와 대조했습니다. makeDefault()가 실행됐는지는 그 메서드가 찍는 줄이 출력에 있는지로 확인했습니다. map이 비어 있을 때 함수를 실행하지 않는다는 것은 Optional의 문서에 적힌 동작이며, 실행에서는 예외 없이 "이름 없음"이 나오는 것으로 확인했습니다. 예외 메시지 "No value present"는 JDK 21 기준입니다. Optional.of(null)의 NullPointerException에는 메시지가 없습니다.',
});
