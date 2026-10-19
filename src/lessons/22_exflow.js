Lab.register({
  id: 'exflow', nav: '예외와 finally', cat: '자바 언어', mode: 'step',
  title: '예외가 나면 어느 블록이 어떤 순서로 실행되나',
  intro: 'try에서 예외가 나면 catch로 건너뛰고, finally는 try를 정상으로 빠져나가든 return이나 예외로 빠져나가든 실행됩니다(System.exit()로 JVM 자체를 끝내면 실행되지 않습니다). return이 끼어 있거나 catch 안에서 또 예외가 나면 순서가 헷갈리기 쉽습니다.',
  terms: ['finally와 try-with-resources', '예외(Exception)와 Error', 'Checked 예외와 Unchecked 예외'], ranks: ['exception'],
  controls: [
    { id: 'ex', label: '예외', type: 'select', value: 'match', options: [['none', '예외 없음'], ['match', 'try에서 발생, catch가 잡는 타입'], ['nomatch', 'try에서 발생, catch가 잡지 못하는 타입'], ['incatch', 'try에서 발생해 잡았는데 catch 안에서 또 발생']] },
    { id: 'ret', label: 'try 블록 끝에 return이 있다', type: 'check', value: false },
    { id: 'fret', label: 'finally 블록에 return이 있다', type: 'check', value: false },
    { id: 'res', label: 'try-with-resources로 자원을 연다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: 'try에서 예외가 나고 catch가 그 타입을 잡으면 어느 블록이 어떤 순서로 실행되나', d: 'try에서 난 예외를 catch가 잡습니다.', v: { ex: 'match', ret: false, fret: false, res: false } },
    { t: 'catch가 잡지 못하는 예외', q: '예외를 catch가 잡지 못하는 타입으로 바꾸면', d: 'catch는 건너뛰지만 finally는 실행됩니다.', v: { ex: 'nomatch', ret: false, fret: false, res: false } },
    { t: 'try에서 return하면', q: '예외를 없애고 try 블록 끝에 return이 있으면', d: 'return 값을 정해 놓고도 finally가 먼저 실행됩니다.', v: { ex: 'none', ret: true, fret: false, res: false } },
    { t: 'finally에 return이 있으면', q: 'catch가 잡지 못하는 예외가 나는데 finally 블록에 return이 있으면', d: '밖으로 나가던 예외가 사라집니다.', v: { ex: 'nomatch', ret: false, fret: true, res: false } },
    { t: 'try-with-resources', q: 'try-with-resources로 자원을 열면', d: '자원은 catch와 finally보다 먼저 닫힙니다.', v: { ex: 'match', ret: false, fret: false, res: true } },
    { t: 'catch 안에서 또 예외', q: 'try에서 난 예외를 잡았는데 catch 안에서 또 예외가 나면', d: '새 예외가 밖으로 나가고, finally는 그 전에 실행됩니다.', v: { ex: 'incatch', ret: false, fret: false, res: false } },
  ],
  code: function (c) {
    var t = c.ex === 'none' ? '' : c.ex === 'nomatch' ? '        if (fail) throw new IllegalStateException();     // fail은 true. catch가 잡지 못함\n' : '        if (fail) throw new IllegalArgumentException();  // fail은 true\n', tail = !(c.fret || (c.ret && c.ex === 'incatch'));
    return 'int run() {\n    try ' + (c.res ? '(Resource r = new Resource()) ' : '') + '{' + (c.res ? '   // Resource: 예시로 만든 AutoCloseable 클래스' : '') + '\n        print("try 시작");\n' + t + '        print("try 끝");\n' + (c.ret ? '        return 1;\n' : '') + '    } catch (IllegalArgumentException e) {\n        print("catch");\n' + (c.ex === 'incatch' ? '        throw new RuntimeException();           // catch 안에서 또 예외\n' : '') + '    } finally {\n        print("finally");\n' + (c.fret ? '        return 3;\n' : '') + '    }\n' + (tail ? '    print("블록 다음");\n    return 2;\n}' : '    // 이 뒤에는 문장을 둘 수 없다. ' + (c.fret ? 'finally가 return으로 끝나서' : 'try는 return, catch는 throw로 끝나서') + ' 도달할 수 없는 문장(컴파일 오류)이 된다\n}');
  },
  label: function (c) { return { none: '예외 없음', match: '잡는 예외', nomatch: '못 잡는 예외', incatch: 'catch에서 또 예외' }[c.ex] + (c.ret ? ' · try에 return' : '') + (c.fret ? ' · finally에 return' : '') + (c.res ? ' · 자원 사용' : ''); },
  columns: ['실행 순서', '최종 결과'],
  // 실제 실행 결과와 대조하는 데 쓰는 순수 계산
  trace: function (c) {
    var log = [], pending = null, retv = null;
    if (c.res) log.push('open');
    log.push('try-start');
    if (c.ex === 'match' || c.ex === 'incatch') pending = 'IllegalArgumentException'; else if (c.ex === 'nomatch') pending = 'IllegalStateException';
    else { log.push('try-end'); if (c.ret) retv = 1; }
    if (c.res) log.push('close');
    if (pending === 'IllegalArgumentException') { log.push('catch'); pending = c.ex === 'incatch' ? 'RuntimeException' : null; }
    log.push('finally');
    if (c.fret) return { log: log, out: 'return 3' };
    if (pending) return { log: log, out: 'throw ' + pending };
    if (retv !== null) return { log: log, out: 'return ' + retv };
    log.push('after'); return { log: log, out: 'return 2' };
  },
  simulate: function (c) {
    var tr = this.trace(c), ev = [], seen = [], pend = '', sum = [];
    var NAME = { open: '자원 열기', 'try-start': 'try 시작', 'try-end': 'try 끝', close: '자원 닫기 (close)', catch: 'catch', finally: 'finally', after: '블록 다음' };
    function push(id, s, k) { if (id) seen.push(NAME[id]); ev.push({ s: s, k: k, snap: { seen: seen.slice(), pend: pend } }); }
    var threw = c.ex !== 'none', caught = c.ex === 'match' || c.ex === 'incatch';
    if (c.res) push('open', 'try의 괄호 안에서 자원을 엽니다.', '');
    if (threw) { pend = caught ? 'IllegalArgumentException' : 'IllegalStateException'; push('try-start', '"try 시작"을 출력한 뒤 ' + pend + '이 발생합니다. try 블록의 나머지 줄("try 끝"' + (c.ret ? ', return 1' : '') + ')은 실행되지 않습니다.', 'bad'); }
    else { push('try-start', '"try 시작"을 출력합니다.', ''); if (c.ret) pend = '반환값 1 (대기)'; push('try-end', '"try 끝"을 출력합니다.' + (c.ret ? ' return 1을 만나 반환값 1을 정해 둡니다. 하지만 아직 메서드를 떠나지 않습니다. finally가 남아 있습니다.' : ''), ''); }
    if (c.res) push('close', 'try 블록을 벗어나는 즉시 자원의 close()가 자동으로 호출됩니다. catch나 finally보다 먼저입니다. 예외가 났어도 닫힙니다.', 'good');
    if (threw && caught) { pend = ''; push('catch', '예외 타입이 catch의 IllegalArgumentException과 맞습니다. catch 블록이 실행되고 예외는 처리된 것으로 봅니다.', ''); if (c.ex === 'incatch') { pend = 'RuntimeException'; ev[ev.length - 1].snap.pend = pend; ev[ev.length - 1].s += ' 그런데 catch 블록 안에서 새 RuntimeException을 던졌습니다. 같은 try의 다른 catch는 이것을 잡지 않습니다.'; ev[ev.length - 1].k = 'bad'; } }
    else if (threw) push(null, 'IllegalStateException은 catch의 IllegalArgumentException과 타입이 맞지 않습니다. catch 블록을 건너뜁니다. 예외는 아직 처리되지 않은 채 남아 있습니다.', 'bad');
    var before = pend;
    if (c.fret) pend = '';
    push('finally', 'finally 블록이 실행됩니다.' + (before ? ' 처리되지 않은 것(' + before + ')이 있어도 finally는 반드시 먼저 실행됩니다.' : '') + (c.fret ? ' finally 안에서 return 3을 만났습니다.' + (before ? ' 이 return이 ' + (before.indexOf('반환값') === 0 ? '앞서 정해 둔 반환값 1을 덮어씁니다.' : '밖으로 나가려던 예외를 없애 버립니다.') : '') : ''), c.fret && before ? 'bad' : '');
    if (tr.out === 'return 2') push('after', 'try-catch-finally가 끝나고 그다음 줄이 실행됩니다. "블록 다음"을 출력하고 2를 반환합니다.', 'good');
    else if (tr.out.indexOf('throw') === 0) push(null, 'finally가 끝난 뒤, 처리되지 않은 ' + tr.out.slice(6) + '이 메서드 밖으로 나갑니다.' + (c.ret && c.ex === 'incatch' ? '' : ' "블록 다음"은 실행되지 않습니다.'), 'bad');
    else push(null, '메서드가 여기서 끝납니다. 반환값은 ' + tr.out.slice(7) + '입니다.' + (c.fret ? '' : ' "블록 다음"은 실행되지 않습니다.'), c.fret && before ? 'bad' : 'good');
    var res = tr.out.indexOf('throw') === 0 ? tr.out.slice(6) + ' 발생' : tr.out.slice(7) + ' 반환';
    sum.push('finally는 정상 종료, return, 예외 어느 경우에도 실행됩니다(System.exit()로 JVM을 끝내는 경우는 제외). 락 해제나 자원 정리를 finally에 두는 이유입니다.');
    if (c.fret && before) sum.push('finally 안의 return은 진행 중이던 예외나 반환값을 조용히 지워 버립니다. 예외가 났다는 사실이 사라지므로 finally에는 return을 쓰지 않습니다.');
    if (c.res) sum.push('try-with-resources의 자원은 try 블록이 끝나는 시점에 닫히므로, catch와 finally가 실행될 때는 이미 닫혀 있습니다. 직접 finally에서 close()를 부르는 것보다 안전합니다.');
    if (c.ex === 'nomatch' && !c.fret) sum.push('catch는 선언한 타입(과 그 하위 타입)만 잡습니다. 맞지 않는 예외는 호출한 쪽으로 계속 올라갑니다.');
    return { events: ev, summary: sum, row: [seen.join(' → '), res] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], pend: '' };
    H.title(v, '지금까지 실행된 블록'); H.slots(v, s.seen.map(function (x, i) { return [x, i === s.seen.length - 1 ? 'b' : 'd']; }), '아직 없음');
    H.counters(v, [[s.pend || '없음', '아직 처리되지 않고 대기 중인 것 (예외 또는 반환값)']]);
    H.title(v, '콘솔 출력 (print가 찍은 줄)'); var out = s.seen.filter(function (x) { return x.indexOf('자원') < 0; });
    v.appendChild(H.el('pre', 'code', out.length ? out.join('\n') : '(아직 없음)'));
  },
  assume: '32가지 조합 모두에서 화면의 코드 그대로(값이 true인 fail 필드와 print, Resource만 더함)를 검증 실행(JDK 21)에서 컴파일하고 실행해, 출력 순서와 최종 결과를 대조했습니다(verify/plain/exflow_code_check.js). 자원이 하나인 경우만 다뤘습니다. 자원이 여러 개면 연 순서의 반대로 닫히고, close()에서 난 예외는 원래 예외에 억제된 예외(suppressed)로 붙습니다.',
});
