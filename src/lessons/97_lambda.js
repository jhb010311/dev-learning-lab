Lab.register({
  id: 'lambda', nav: '람다와 함수형 인터페이스', cat: '자바 언어', mode: 'step',
  title: '람다에 적은 코드는 언제 실행되나',
  intro: '람다는 "나중에 실행할 동작"을 값처럼 변수에 담고 다른 메서드에 넘기는 문법입니다. 람다를 적은 줄에서는 그 안의 코드가 실행되지 않고, 넘겨받은 쪽이 부를 때 비로소 실행됩니다.',
  terms: ['람다 표현식', '함수형 인터페이스', '메서드 참조', '익명 클래스와 람다의 차이'],
  controls: [
    { id: 'fi', label: '함수형 인터페이스 (동작의 모양)', type: 'select', value: 'function', options: [['function', 'Function<String, Integer> : 값을 받아 다른 값을 돌려준다'], ['predicate', 'Predicate<String> : 값을 받아 true 또는 false를 돌려준다'], ['supplier', 'Supplier<String> : 받는 것 없이 값을 돌려준다'], ['consumer', 'Consumer<String> : 값을 받고 아무것도 돌려주지 않는다']] },
    { id: 'form', label: '동작을 쓰는 방식', type: 'select', value: 'lambda', options: [['anon', '익명 클래스'], ['lambda', '람다'], ['ref', '메서드 참조']], hint: '세 가지 모두 같은 일을 하는 객체를 만듭니다(this가 가리키는 것 같은 세부는 다릅니다).' },
    { id: 'calls', label: '넘겨받은 쪽(run)이 동작을 부르는 횟수', type: 'select', value: '2', options: [['0', '0번 (받기만 하고 부르지 않는다)'], ['1', '1번'], ['2', '2번']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'Function<String, Integer> 람다를 run에 넘겼고 run이 동작을 2번 부르면 본문은 언제 실행되나', d: '람다를 만든 줄에서는 아무 일도 없고, run이 부를 때마다 본문이 실행됩니다.', v: { fi: 'function', form: 'lambda', calls: '2' } },
    { t: '받기만 하고 부르지 않으면', q: '넘겨받은 쪽(run)이 동작을 0번 부르면', d: '람다를 만들고 넘겼는데도 본문은 한 번도 실행되지 않습니다.', v: { fi: 'function', form: 'lambda', calls: '0' } },
    { t: '익명 클래스로 쓰면', q: '람다 대신 익명 클래스로 쓰면', d: '코드는 길어지지만 결과는 람다와 같습니다.', v: { fi: 'function', form: 'anon', calls: '2' } },
    { t: '메서드 참조로 쓰면', q: '람다 대신 메서드 참조로 쓰면', d: '이미 있는 메서드를 이름으로 가리킵니다. 결과는 같습니다.', v: { fi: 'function', form: 'ref', calls: '2' } },
    { t: 'Supplier를 넘겨 두고 나중에 get', q: 'Supplier<String> 람다를 run에 넘기고 run이 동작을 1번 부르면', d: '값을 만드는 일을 미뤄 두었다가 필요할 때 실행합니다.', v: { fi: 'supplier', form: 'lambda', calls: '1' } },
    { t: 'Predicate', q: 'Predicate<String> 람다를 run에 넘기면', d: '조건 검사를 넘깁니다. true 또는 false가 돌아옵니다.', v: { fi: 'predicate', form: 'lambda', calls: '2' } },
    { t: 'Consumer', q: 'Consumer<String> 람다를 run에 넘기면', d: '값을 받아 쓰기만 하고 돌려주는 것이 없습니다.', v: { fi: 'consumer', form: 'lambda', calls: '2' } },
  ],
  // 인터페이스마다: 타입, 변수 이름, 부르는 메서드, 본문이 되는 메서드, 받는 것, 돌려주는 것, 부를 때 넘기는 값, 돌려받는 값
  FI: {
    'function': { type: 'Function<String, Integer>', v: 'f', m: 'apply', body: 'length', sig: 'static int length(String s)', ret: '        return s.length();\n', takes: '값 하나', gives: '값 하나', args: ['hello', 'hi'], res: ['5', '2'], anon: 'public Integer apply(String s) {\n        return length(s);\n    }', lam: 's -> length(s)', what: '문자열을 받아 그 길이를 돌려주는 일' },
    predicate: { type: 'Predicate<String>', v: 'p', m: 'test', body: 'isLong', sig: 'static boolean isLong(String s)', ret: '        return s.length() > 3;\n', takes: '값 하나', gives: 'true 또는 false', args: ['hello', 'hi'], res: ['true', 'false'], anon: 'public boolean test(String s) {\n        return isLong(s);\n    }', lam: 's -> isLong(s)', what: '문자열을 받아 3글자보다 긴지 검사하는 일' },
    supplier: { type: 'Supplier<String>', v: 's', m: 'get', body: 'make', sig: 'static String make()', ret: '        return "hello";\n', takes: '없음', gives: '값 하나', args: [null, null], res: ['hello', 'hello'], anon: 'public String get() {\n        return make();\n    }', lam: '() -> make()', what: '받는 것 없이 문자열 하나를 만들어 돌려주는 일' },
    consumer: { type: 'Consumer<String>', v: 'c', m: 'accept', body: 'show', sig: 'static void show(String s)', ret: '', takes: '값 하나', gives: '없음 (void)', args: ['hello', 'hi'], res: [null, null], anon: 'public void accept(String s) {\n        show(s);\n    }', lam: 's -> show(s)', what: '문자열을 받아 쓰기만 하고 돌려주는 것은 없는 일' },
  },
  // i번째로 부르는 코드와, 그때 본문이 출력하는 줄
  callText: function (F, i) { return F.v + '.' + F.m + '(' + (F.args[i] === null ? '' : '"' + F.args[i] + '"') + ')'; },
  bodyLine: function (F, i) { return '본문 실행: ' + F.body + '(' + (F.args[i] === null ? '' : F.args[i]) + ')'; },
  code: function (c) {
    var F = this.FI[c.fi], n = +c.calls, self = this, sup = c.fi === 'supplier';
    var body = F.sig + ' {' + '                    // 넘길 동작이 하는 일\n        System.out.println("본문 실행: ' + F.body + '(" + ' + (sup ? '' : 's + ') + '")");\n' + F.ret + '    }';
    if (sup) body = F.sig + ' {' + '                    // 넘길 동작이 하는 일\n        System.out.println("본문 실행: make()");\n' + F.ret + '    }';
    var calls = '';
    for (var i = 0; i < n; i++) calls += c.fi === 'consumer' ? '        ' + self.callText(F, i) + ';' + (i === 0 ? '                       // 돌려주는 값이 없다' : '') + '\n' : '        System.out.println("결과 " + ' + self.callText(F, i) + ');\n';
    if (!n) calls = '        // ' + F.v + '를 받았지만 부르지 않는다\n';
    var run = 'static void run(' + F.type + ' ' + F.v + ') {' + '      // 동작을 받아서 부르는 쪽\n        System.out.println("run 시작");\n' + calls + '        System.out.println("run 끝");\n    }';
    var make = c.form === 'anon' ? 'new ' + F.type + '() {    // 동작을 만든다 (아직 실행되지 않는다)\n            @Override\n            ' + F.anon.replace(/\n/g, '\n        ') + '\n        };' : c.form === 'lambda' ? F.lam + ';        // 동작을 만든다 (아직 실행되지 않는다)' : 'Demo::' + F.body + ';         // 동작을 만든다 (아직 실행되지 않는다)';
    return 'class Demo {\n    ' + body + '\n\n    ' + run + '\n\n    public static void main(String[] args) {\n        ' + F.type + ' ' + F.v + ' = ' + make + '\n        System.out.println("만든 뒤");\n        run(' + F.v + ');                                   // 동작을 값처럼 넘긴다\n    }\n}';
  },
  label: function (c) { return this.FI[c.fi].type.replace(/<.*/, '') + ' · ' + { anon: '익명 클래스', lambda: '람다', ref: '메서드 참조' }[c.form] + ' · ' + c.calls + '번 부름'; },
  columns: ['부르는 메서드', '받는 것', '돌려주는 것', '본문 실행 횟수', '돌려받은 값'],
  simulate: function (c) {
    var F = this.FI[c.fi], n = +c.calls, ev = [], sum = [], self = this, form = c.form;
    var st = { made: false, passed: false, cur: -1, done: 0, count: 0, out: [], end: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var decl = F.type + ' ' + F.v + ' = ';
    st.made = true;
    push(form === 'anon' ? decl + 'new ' + F.type + '() { ... }: ' + F.type.replace(/<.*/, '') + ' 인터페이스를 구현한 이름 없는 클래스의 객체를 만들어 변수 ' + F.v + '에 담습니다. ' + F.m + ' 안에 적은 코드는 아직 실행되지 않습니다. 아무것도 출력되지 않습니다.'
      : form === 'lambda' ? decl + F.lam + ': 화살표(->) 오른쪽에 적은 동작을 담은 객체를 만들어 변수 ' + F.v + '에 담습니다. ' + F.body + ' 메서드는 아직 불리지 않습니다. 아무것도 출력되지 않습니다.'
      : decl + 'Demo::' + F.body + ': ' + F.body + ' 메서드를 가리키는 객체를 만들어 변수 ' + F.v + '에 담습니다. 메서드를 부른 것이 아니라 "이 메서드를 쓰라"고 가리키기만 한 것입니다. 아무것도 출력되지 않습니다.', '');
    st.out.push('만든 뒤');
    push('System.out.println("만든 뒤"): "만든 뒤"가 출력됩니다. 동작을 만든 줄을 이미 지났지만 "본문 실행"은 아직 한 번도 출력되지 않았습니다.', '');
    st.passed = true;
    push('run(' + F.v + '): 변수 ' + F.v + '에 담긴 동작을 run 메서드에 넘깁니다. 숫자나 문자열을 넘기듯이 동작을 넘기는 것입니다. 넘기는 것만으로는 실행되지 않습니다.', '');
    st.out.push('run 시작');
    push('System.out.println("run 시작"): run 안으로 들어와 "run 시작"이 출력됩니다.', '');
    for (var i = 0; i < n; i++) {
      st.cur = i; st.done = i + 1; st.count = i + 1; st.out.push(this.bodyLine(F, i));
      var res = F.res[i];
      if (res !== null) st.out.push('결과 ' + res);
      push(this.callText(F, i) + ': ' + (i === 0 ? '여기서 비로소 동작이 실행됩니다. ' : '같은 동작이 한 번 더 실행됩니다. ') + F.body + ' 메서드가 불려 "' + this.bodyLine(F, i) + '"가 출력됩니다. ' + (res === null ? 'accept는 돌려주는 값이 없으므로 받을 것이 없습니다.' : '돌려받은 ' + res + '가 "결과 ' + res + '"로 출력됩니다.'), 'good');
    }
    st.cur = -1;
    if (!n) push('run 안에는 ' + F.v + '.' + F.m + '(...) 호출이 없습니다. 동작을 받았지만 실행하지 않고 지나갑니다.', 'bad');
    st.out.push('run 끝'); st.end = true;
    push('System.out.println("run 끝"): "run 끝"이 출력됩니다. "본문 실행"은 모두 ' + n + '번 출력되었습니다.', '');
    var got = F.res.slice(0, n).filter(function (x) { return x !== null; });
    sum.push(n ? '동작을 만든 줄에서는 아무것도 실행되지 않았고, run 안에서 ' + F.m + ' 메서드를 부를 때마다 실행되었습니다. 람다 안의 코드는 만들 때가 아니라 불릴 때 실행됩니다.' : '동작을 만들고 넘겼지만 받은 쪽이 부르지 않아 본문은 한 번도 실행되지 않았습니다. 람다는 "나중에 실행할 수 있는 코드"일 뿐이고, 실행할지 말지와 몇 번 실행할지는 받은 쪽이 정합니다.');
    sum.push({ 'function': 'Function<T, R>은 T 타입 값 하나를 받아 R 타입 값을 돌려주는 동작이고, apply로 부릅니다. 값을 다른 값으로 바꾸는 일(변환)에 씁니다.', predicate: 'Predicate<T>는 T 타입 값 하나를 받아 true 또는 false를 돌려주는 동작이고, test로 부릅니다. 조건 검사에 씁니다.', supplier: 'Supplier<T>는 받는 것 없이 T 타입 값을 돌려주는 동작이고, get으로 부릅니다. 값을 만드는 일을 미뤄 두었다가 정말 필요할 때만 실행하게 할 수 있습니다.', consumer: 'Consumer<T>는 T 타입 값 하나를 받고 아무것도 돌려주지 않는 동작이고, accept로 부릅니다. 출력이나 저장처럼 받아서 쓰기만 하는 일에 씁니다.' }[c.fi]);
    sum.push(form === 'anon' ? '익명 클래스는 람다가 생기기 전(자바 7까지)에 동작을 넘기던 방식입니다. 방식을 람다로 바꾸면 같은 일이 한 줄이 됩니다.' : form === 'lambda' ? '익명 클래스, 람다, 메서드 참조 가운데 무엇으로 쓰든 결과는 같습니다.' : '람다가 이미 있는 메서드 하나를 부르기만 할 때는 메서드 참조(클래스이름::메서드이름)로 더 짧게 쓸 수 있습니다. 결과는 람다와 같습니다.');
    return { events: ev, summary: sum, out: st.out.slice(), row: [F.m, F.takes, F.gives, n + '번', !n ? '(부르지 않음)' : got.length ? got.join(', ') : '(돌려주는 값 없음)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, F = this.FI[c.fi];
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    H.table(v, ['인터페이스', '부르는 메서드', '받는 것', '돌려주는 것'], [{ cells: [F.type.replace(/<.*/, ''), F.m, F.takes, F.gives] }], '이 동작의 모양');
    H.table(v, ['순서', '출력된 줄'], s.out.map(function (o, i) { return { cells: [String(i + 1), { v: o, cls: o.indexOf('본문 실행') === 0 ? 'hot' : '' }] }; }), '지금까지의 출력');
  },
  // 그림: 왼쪽은 동작을 만든 곳(변수), 가운데는 동작을 넘겨받아 부르는 run 메서드, 오른쪽은 본문이 되는 메서드. 부를 때에만 본문으로 화살표가 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, F = this.FI[c.fi], n = +c.calls, self = this, last = shown[shown.length - 1];
    var s = last ? last.snap : { made: false, passed: false, cur: -1, done: 0, count: 0, out: [], end: false };
    P.size(680, 300);
    P.region('mk', 16, 16, 232, 200, '동작을 만든 곳 (main)');
    P.box('obj', 28, 52, 208, 66, s.made ? { cls: 'wait', title: '변수 ' + F.v, sub: [F.type, c.form === 'anon' ? 'new ' + F.type.replace(/<.*/, '') + '<>() { ... }' : c.form === 'lambda' ? F.lam : 'Demo::' + F.body] } : { cls: 'ghost', title: '변수 ' + F.v, sub: '아직 없음' });
    P.text('mkn', 28, 144, s.made ? '만들기만 했고 실행은 안 됨' : '', { cls: 'mut' });
    P.region('rn', 260, 16, 196, 200, 'run (받아서 부르는 쪽)');
    P.box('prm', 272, 50, 172, 34, { cls: s.passed ? 'wait' : 'ghost', title: '매개변수 ' + F.v, right: s.passed ? '받음' : '' });
    if (s.passed) P.arrow('pass', 'obj:r', 'prm:l', { label: '넘김' });
    for (var i = 0; i < n; i++) P.box('c' + i, 272, 96 + i * 56, 172, 48, { cls: i >= s.done ? 'ghost' : 'good' + (i === s.cur ? ' now' : ''), title: self.callText(F, i), sub: i >= s.done ? '아직 부르지 않음' : F.res[i] === null ? '돌려받는 값 없음' : '돌려받은 값 ' + F.res[i] });
    if (!n) P.text('nocall', 358, 140, '부르는 코드가 없음', { cls: s.end ? 'bad' : 'mut', anchor: 'middle' });
    P.region('bd', 468, 16, 196, 200, '본문 (' + F.body + ' 메서드)');
    P.box('body', 480, 52, 172, 66, { cls: s.cur >= 0 ? 'hot now' : s.count ? 'plain' : 'ghost', title: F.body + '(' + (c.fi === 'supplier' ? '' : 's') + ')', sub: ['"본문 실행" 출력', '지금까지 ' + s.count + '번 실행'] });
    if (s.cur >= 0) P.arrow('call', 'c' + s.cur + ':r', 'body:l', { cls: 'hot', label: '실행' });
    P.box('r1', 16, 236, 648, 38, { cls: s.count ? 'good' : s.end ? 'bad' : 'ghost', title: '본문이 실행된 횟수', right: s.count + '번' });
    P.note('동작을 만든 줄에서는 본문으로 가는 화살표가 없습니다. run 안에서 ' + F.m + ' 메서드를 부르는 순간에만 본문이 실행됩니다. 본문이 따로 메서드로 있는 것은 세 가지 방식을 같은 조건으로 비교하려는 것이고, 람다 안에 코드를 직접 적어도 실행 시점은 같습니다.');
  },
  assume: '서른여섯 가지 조합의 출력 순서, 본문 실행 횟수, 돌려받은 값을 검증 환경의 JDK 21에서 같은 구조의 코드를 실행한 결과와 대조했습니다. 각 인터페이스가 부르는 메서드의 이름, 받는 값의 개수, 돌려주는 타입도 실제 인터페이스를 들여다본 값과 대조했습니다. 익명 클래스, 람다, 메서드 참조는 이 실습에서 보는 결과(출력과 돌려받은 값)가 같다는 뜻이며, 내부에서 객체가 만들어지는 방법과 this가 가리키는 대상은 서로 다릅니다. 람다 안에서 바깥의 지역 변수를 쓸 때는 값이 바뀌지 않는 변수만 쓸 수 있는데, 이 규칙은 "내부 클래스와 익명 클래스" 실습에서 설명합니다.',
});
