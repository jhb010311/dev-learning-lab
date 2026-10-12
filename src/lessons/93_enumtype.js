Lab.register({
  id: 'enumtype', nav: '열거형(enum)', cat: '자바 언어', mode: 'step',
  title: 'enum을 숫자로 저장해 두면 왜 다른 상수가 되어 돌아오나',
  intro: 'enum은 주문 상태처럼 정해진 몇 가지 값만 가질 수 있는 타입입니다. 상수 하나하나가 프로그램에 하나뿐인 객체여서 ==로 비교할 수 있고, 필드와 메서드도 가질 수 있습니다. 그런데 이 상수를 DB에 저장할 때 선언 순서 번호(ordinal)를 적어 두면, 나중에 enum 선언을 고쳤을 때 같은 숫자가 다른 상수를 가리키게 됩니다.',
  terms: ['열거형(enum)', 'ordinal()과 name()', 'enum의 valueOf', '동일성과 동등성'],
  controls: [
    { id: 'store', label: '저장할 때 적어 둔 값', type: 'select', value: 'ordinal', options: [['ordinal', 'ordinal(): 선언 순서 번호'], ['name', 'name(): 상수의 이름'], ['code', '직접 만든 필드 code의 값']] },
    { id: 'change', label: '저장한 뒤 enum 선언을 어떻게 고쳤나', type: 'select', value: 'insert', options: [['same', '고치지 않음'], ['append', '새 상수 CANCELED를 맨 끝에 추가'], ['insert', '새 상수 CANCELED를 중간에 끼워 넣음'], ['swap', 'ORDERED와 PAID의 순서를 바꿈'], ['rename', 'PAID의 이름을 PAYMENT_DONE으로 바꿈']] },
    { id: 'saved', label: '저장해 둔 상수', type: 'select', value: 'PAID', options: [['ORDERED', 'ORDERED (주문 접수)'], ['PAID', 'PAID (결제 완료)'], ['SHIPPED', 'SHIPPED (배송 시작)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'ordinal()로 저장해 둔 PAID를 읽어 오는데 enum 선언 중간에 새 상수 CANCELED를 끼워 넣었으면 어떤 상수가 되나', d: '번호로 저장한 뒤 상수를 중간에 끼워 넣었습니다. 결제 완료가 주문 취소로 읽힙니다.', v: { store: 'ordinal', change: 'insert', saved: 'PAID' } },
    { t: '순서만 바꿔도', q: '새 상수를 끼워 넣는 대신 ORDERED와 PAID의 순서를 바꾸면', d: '상수를 추가하지 않고 순서만 바꿔도 번호가 가리키는 상수가 달라집니다.', v: { store: 'ordinal', change: 'swap', saved: 'PAID' } },
    { t: '맨 끝에 추가하면', q: '새 상수 CANCELED를 중간이 아니라 맨 끝에 추가하면', d: '기존 상수의 번호가 그대로라서 무사합니다.', v: { store: 'ordinal', change: 'append', saved: 'PAID' } },
    { t: '운 좋게 무사한 상수', q: '저장해 둔 상수를 ORDERED로 바꾸고 새 상수 CANCELED는 중간에 끼워 넣은 채로 두면', d: '같은 변경인데 맨 앞의 상수는 번호가 바뀌지 않습니다.', v: { store: 'ordinal', change: 'insert', saved: 'ORDERED' } },
    { t: '이름으로 저장', q: '저장할 때 적어 둔 값을 ordinal() 대신 name() 값으로 바꾸면', d: '중간에 끼워 넣어도 같은 상수가 나옵니다.', v: { store: 'name', change: 'insert', saved: 'PAID' } },
    { t: '이름으로 저장했는데 이름을 바꾸면', q: '저장할 때 적어 둔 값이 name() 값인데 PAID의 이름을 PAYMENT_DONE으로 바꾸면', d: 'valueOf가 없는 이름을 받아 IllegalArgumentException을 던집니다.', v: { store: 'name', change: 'rename', saved: 'PAID' } },
    { t: '직접 만든 code로 저장', q: '저장할 때 적어 둔 값을 직접 만든 필드 code의 값으로 바꾸고 PAID의 이름을 PAYMENT_DONE으로 바꾸면', d: '순서를 바꿔도 이름을 바꿔도 같은 상수가 나옵니다.', v: { store: 'code', change: 'rename', saved: 'PAID' } },
  ],
  OLD: [['ORDERED', 'O', '주문 접수'], ['PAID', 'P', '결제 완료'], ['SHIPPED', 'S', '배송 시작']],
  // 고친 뒤의 선언: [이름, code, label]
  consts: function (change) {
    var o = this.OLD[0], p = this.OLD[1], s = this.OLD[2], x = ['CANCELED', 'C', '주문 취소'];
    return { same: [o, p, s], append: [o, p, s, x], insert: [o, x, p, s], swap: [p, o, s], rename: [o, ['PAYMENT_DONE', 'P', '결제 완료'], s] }[change];
  },
  // 저장해 둔 값, 지금 선언에서 읽어 온 상수(없으면 null), 저장한 상수의 지금 이름
  facts: function (c) {
    var cs = this.consts(c.change), oi = this.OLD.map(function (r) { return r[0]; }).indexOf(c.saved), old = this.OLD[oi];
    var value = c.store === 'ordinal' ? String(oi) : c.store === 'name' ? old[0] : old[1], read = null;
    if (c.store === 'ordinal') read = cs[oi];
    if (c.store === 'name') read = cs.filter(function (r) { return r[0] === value; })[0] || null;
    if (c.store === 'code') read = cs.filter(function (r) { return r[1] === value; })[0] || null;
    var now = c.change === 'rename' && c.saved === 'PAID' ? 'PAYMENT_DONE' : c.saved;
    return { cs: cs, oi: oi, old: old, value: value, shown: c.store === 'ordinal' ? value : '"' + value + '"', read: read, now: now, eq: !!read && read[0] === now };
  },
  code: function (c) {
    var f = this.facts(c), code = c.store === 'code', s = 'enum Status {\n';
    f.cs.forEach(function (r, i) { s += '    ' + r[0] + '(' + (code ? '"' + r[1] + '", ' : '') + '"' + r[2] + '")' + (i < f.cs.length - 1 ? ',' : ';') + '\n'; });
    s += '\n';
    if (code) s += '    private final String code;\n';
    s += '    private final String label;\n\n';
    if (code) s += '    Status(String code, String label) {\n        this.code = code;\n        this.label = label;\n    }\n\n';
    else s += '    Status(String label) {\n        this.label = label;\n    }\n\n';
    s += '    String label() {\n        return label;\n    }\n';
    if (code) s += '\n    static Status fromCode(String code) {\n        for (Status s : values()) {\n            if (s.code.equals(code)) return s;\n        }\n        throw new IllegalArgumentException("없는 코드: " + code);\n    }\n';
    s += '}\n\n';
    s += '// 예전 선언(ORDERED, PAID, SHIPPED 순서)일 때 ' + c.saved + (c.store === 'ordinal' ? '.ordinal()' : c.store === 'name' ? '.name()' : '의 code') + ' 값을 저장해 둔 것\n';
    if (c.store === 'ordinal') s += 'int saved = ' + f.value + ';\nStatus s = Status.values()[saved];\n';
    if (c.store === 'name') s += 'String saved = "' + f.value + '";\nStatus s = Status.valueOf(saved);\n';
    if (c.store === 'code') s += 'String saved = "' + f.value + '";\nStatus s = Status.fromCode(saved);\n';
    return s + 'System.out.println(s + " (" + s.label() + ")");\nSystem.out.println(s == Status.' + f.now + ');';
  },
  label: function (c) { return { ordinal: 'ordinal()로 저장', name: 'name()으로 저장', code: 'code로 저장' }[c.store] + ' · ' + { same: '선언 그대로', append: '끝에 추가', insert: '중간에 끼움', swap: '순서 바꿈', rename: '이름 바꿈' }[c.change] + ' · ' + c.saved; },
  columns: ['저장해 둔 값', '읽어 온 상수', '저장한 상수와 ==', '끝난 모습'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], store = c.store, ch = c.change;
    var st = { savedOn: false, changed: false, read: '', failed: false, out: [], err: '', eq: '?', end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var order = function (cs) { return cs.map(function (r, i) { return r[0] + '(' + i + ')'; }).join(', '); };
    var ctor = store === 'code' ? 'PAID("P", "결제 완료")는 생성자에 "P"와 "결제 완료"를 넘겨 만든' : 'PAID("결제 완료")는 생성자에 "결제 완료"를 넘겨 만든';

    push('예전의 enum 선언은 ORDERED, PAID, SHIPPED 순서였습니다: enum의 상수는 저마다 객체 하나입니다. ' + ctor + ' Status 객체이고, 프로그램 전체에 PAID 객체는 그것 하나뿐입니다. new로 더 만들 수도 없습니다.');
    st.savedOn = true;
    var HOW = { ordinal: c.saved + '.ordinal()의 값(' + f.value + ')을 적었습니다. ordinal()은 그 상수가 선언에서 몇 번째인지를 0부터 센 번호입니다.', name: c.saved + '.name()의 값("' + f.value + '")을 적었습니다. name()은 상수의 이름을 문자열로 돌려줍니다.', code: c.saved + ' 상수가 가진 code 필드의 값("' + f.value + '")을 적었습니다. code는 저장할 때 쓰려고 상수마다 직접 정해 둔 값입니다.' }[store];
    push(c.saved + ' 상태인 주문을 DB에 저장했습니다: enum 객체를 그대로 넣을 수는 없으므로 그 상수를 나타낼 값을 대신 적어 둡니다. 여기서는 ' + HOW);
    st.changed = true;
    var CH = { append: '새 상수 CANCELED를 맨 끝에 추가했습니다', insert: '새 상수 CANCELED를 ORDERED와 PAID 사이에 끼워 넣었습니다', swap: '맨 앞의 두 상수 ORDERED와 PAID의 순서를 서로 바꿨습니다', rename: 'PAID의 이름을 PAYMENT_DONE으로 바꿨습니다' }[ch];
    if (ch === 'same') push('그 뒤에도 enum 선언은 고치지 않았습니다: 순서 번호는 ' + order(f.cs) + ' 그대로입니다.');
    else push('그 뒤 enum 선언을 고쳤습니다: ' + CH + '. 지금의 순서 번호는 ' + order(f.cs) + '입니다. DB에 적어 둔 값(' + f.shown + ')은 고쳐지지 않고 그대로 남아 있습니다.', ch === 'append' || ch === 'rename' ? '' : 'hot');

    var shifted = (ch === 'insert' || ch === 'swap');
    if (store === 'ordinal') {
      st.read = f.read[0];
      push('Status.values()[' + f.value + '] 실행: values()는 지금 선언의 순서대로 상수를 담은 배열을 돌려줍니다. ' + f.value + '번 칸에 있는 것은 ' + f.read[0] + '입니다. ' + (f.eq ? (shifted ? '저장한 상수와 같습니다. 이 상수의 번호가 이번 변경에서 바뀌지 않았기 때문입니다.' : '저장한 상수와 같습니다.') : '저장한 것은 ' + c.saved + '인데 다른 상수가 나왔습니다. 예외도 경고도 없습니다.'), f.eq ? 'good' : 'bad');
    } else if (store === 'name') {
      if (f.read) { st.read = f.read[0]; push('Status.valueOf("' + f.value + '") 실행: 이름이 정확히 "' + f.value + '"인 상수를 찾아 돌려줍니다. 번호가 아니라 이름으로 찾으므로 상수의 순서나 개수가 달라져도 영향이 없습니다.', 'good'); }
      else {
        st.failed = true; st.err = 'Exception in thread "main" java.lang.IllegalArgumentException: No enum constant Status.' + f.value; st.end = '예외로 중단';
        push('Status.valueOf("' + f.value + '") 실행: 이름이 정확히 "' + f.value + '"인 상수를 찾습니다. 지금 선언에는 그런 이름이 없습니다. valueOf는 이럴 때 null을 돌려주지 않고 IllegalArgumentException을 던집니다(메시지: No enum constant Status.' + f.value + '). 잡는 곳이 없어 프로그램이 이 줄에서 멈춥니다.', 'bad');
      }
    } else {
      st.read = f.read[0];
      push('Status.fromCode("' + f.value + '") 실행: enum 안에 직접 만든 메서드가 상수를 하나씩 보며 code 필드가 "' + f.value + '"인 것을 찾습니다. 찾은 상수는 ' + f.read[0] + '입니다. 순서나 이름을 고쳐도 code 값을 그대로 두면 영향이 없습니다.', 'good');
    }
    if (f.read) {
      var line = f.read[0] + ' (' + f.read[2] + ')';
      st.out.push(line);
      push('System.out.println(s + " (" + s.label() + ")") 실행: 출력은 "' + line + '"입니다. label()은 enum 안에 직접 만든 메서드로, 그 상수가 만들어질 때 받은 label 값을 돌려줍니다. enum도 클래스라서 이렇게 필드와 메서드를 가질 수 있습니다.');
      st.eq = String(f.eq); st.out.push(String(f.eq)); st.end = '정상 종료';
      push('s == Status.' + f.now + ' 실행: ' + f.eq + '입니다. enum 상수는 상수마다 객체가 하나뿐이어서, 어떤 방법으로 얻었든 같은 상수면 같은 객체입니다. 그래서 equals 없이 ==로 비교해도 됩니다. ' + (f.eq ? '방금 읽어 온 s와 코드에 적은 Status.' + f.now + (f.now === 'PAYMENT_DONE' ? '은' : '는') + ' 같은 객체입니다.' : 'false가 나온 것은 비교 방법 때문이 아니라, s가 정말로 다른 상수(' + f.read[0] + ')이기 때문입니다.') + ' 프로그램은 정상으로 끝납니다.', f.eq ? 'good' : 'bad');
    }
    var endText = f.read ? '정상 종료' : '예외로 중단: java.lang.IllegalArgumentException: No enum constant Status.' + f.value;
    var row = [f.shown, f.read ? f.read[0] + ' (' + f.read[2] + ')' : '(읽지 못함)', f.read ? String(f.eq) : '(읽지 못함)', endText];
    if (store === 'ordinal' && !f.eq) sum.push('ordinal()은 선언 순서일 뿐이어서, 상수를 중간에 끼워 넣거나 순서를 바꾸면 이미 저장해 둔 숫자가 다른 상수를 가리키게 됩니다. 예외가 나지 않으므로 "' + f.old[2] + '" 주문이 "' + f.read[2] + '" 주문으로 보이는 잘못된 데이터가 조용히 쓰입니다. ordinal() 값은 저장하지 않습니다.');
    if (store === 'ordinal' && f.eq && shifted) sum.push('이 상수는 번호가 바뀌지 않아 무사했습니다. 같은 변경에서도 다른 상수를 저장해 둔 데이터는 틀어집니다.');
    if (store === 'ordinal' && ch === 'append') sum.push('맨 끝에 추가하면 기존 상수의 번호는 바뀌지 않습니다. 하지만 "언제나 끝에만 추가한다"는 약속을 고치는 사람 모두가 계속 지켜야 하므로, ordinal()을 저장에 쓰는 방식 자체를 피합니다.');
    if (store === 'ordinal' && ch === 'rename') sum.push('이름을 바꾸는 것은 번호에 영향을 주지 않습니다. 번호로 저장한 데이터는 순서를 건드릴 때 틀어집니다.');
    if (store === 'ordinal' && ch === 'same') sum.push('선언을 고치지 않는 동안에는 번호로 저장해도 문제가 드러나지 않습니다.');
    if (store === 'name' && f.read) sum.push('name()으로 저장하면 상수를 추가하거나 순서를 바꿔도 같은 상수가 읽힙니다.' + (ch === 'rename' ? ' 이번에 이름을 바꾼 것은 PAID뿐이라 ' + c.saved + '에는 영향이 없었습니다.' : ' 대신 상수의 이름을 바꾸면 안 됩니다.'));
    if (store === 'name' && !f.read) sum.push('valueOf는 없는 이름을 받으면 IllegalArgumentException을 던집니다. 대소문자만 달라도("paid") 마찬가지입니다. 이름으로 저장했다면 상수의 이름을 바꾸는 일이 곧 저장된 데이터를 못 읽게 만드는 일입니다. 그래도 조용히 다른 상수가 나오는 것보다는 예외로 바로 드러나는 쪽이 낫습니다.');
    if (store === 'code') sum.push('저장할 값을 enum의 필드로 따로 정해 두면 상수의 순서도 이름도 마음대로 고칠 수 있습니다. 대신 한번 정한 code 값은 바꾸지 않습니다. enum이 필드와 메서드를 가질 수 있어서 가능한 방법입니다.');
    if (f.read) sum.push('enum 상수의 비교에는 ==를 씁니다. 상수마다 객체가 하나뿐이라 결과가 equals와 같고, 한쪽이 null이어도 예외가 나지 않으며, 서로 다른 enum 타입을 비교하면 컴파일 오류로 알려 줍니다.');
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, f = this.facts(c);
    if (!s) { H.text(v, '실행을 누르면 저장할 때부터 다시 읽어 올 때까지를 한 단계씩 보여 줍니다.'); return; }
    var cs = s.changed ? f.cs : this.OLD, code = c.store === 'code';
    H.table(v, ['ordinal()', 'name()'].concat(code ? ['code'] : [], ['label()']), cs.map(function (r, i) {
      var hit = s.read === r[0] && s.changed;
      return { cells: [String(i), { v: r[0], cls: hit ? (f.eq ? 'good' : 'bad') : '' }].concat(code ? [r[1]] : [], [r[2]]) };
    }), s.changed ? '지금의 enum 선언' : '예전의 enum 선언');
    var ln = H.lanes(v);
    H.lane(ln, '읽는 방법', { ordinal: 'Status.values()[' + f.value + ']', name: 'Status.valueOf("' + f.value + '")', code: 'Status.fromCode("' + f.value + '")' }[c.store], 'none');
    H.title(v, '콘솔 출력');
    var lines = s.out.slice(); if (s.err) lines.push(s.err + '  (오류 출력)');
    v.appendChild(H.el('pre', 'code', lines.length ? lines.join('\n') : '(아직 없음)'));
    H.counters(v, [[s.end, '프로그램']]);
  },
  // 그림: 위에 예전 선언의 상수들, 아래에 지금 선언의 상수들을 순서대로 놓고, 가운데에 저장해 둔 값을 둔다. 저장한 상수에서 값으로, 값에서 읽어 온 상수로 화살표를 긋는다.
  draw: function (P, sim, shown) {
    var c = sim.c, f = this.facts(c), last = shown[shown.length - 1], s = last ? last.snap : { savedOn: false, changed: false, read: '', failed: false, out: [], err: '', eq: '?', end: '?' };
    var attr = function (r, i) { return c.store === 'ordinal' ? 'ordinal ' + i : c.store === 'name' ? '이름 ' + r[0] : 'code ' + r[1]; };
    P.size(680, 334);
    P.region('old', 16, 16, 648, 98, '예전 선언 (저장할 때)');
    this.OLD.forEach(function (r, i) { P.box('o_' + r[0], 30 + i * 156, 46, 152, 56, { cls: s.savedOn && r[0] === c.saved ? 'hot' : 'plain', title: r[0], sub: [attr(r, i), r[2]] }); });
    P.box('saved', 214, 126, 252, 34, { cls: s.savedOn ? (s.failed ? 'bad' : 'hot') : 'ghost', title: 'DB에 저장해 둔 값', right: s.savedOn ? f.shown : '아직 없음' });
    P.region('new', 16, 172, 648, 98, s.changed ? '지금 선언 (읽을 때)' : '지금 선언 (아직 고치기 전)');
    f.cs.forEach(function (r, i) {
      var hit = s.read === r[0];
      P.box('n_' + r[0], 30 + i * 156, 202, 152, 56, { cls: !s.changed ? 'ghost' : hit ? (f.eq ? 'good now' : 'bad now') : r[0] === 'CANCELED' || r[0] === 'PAYMENT_DONE' ? 'wait' : 'plain', title: r[0], sub: [attr(r, i), r[2]] });
    });
    if (s.savedOn) P.arrow('a_save', 'o_' + c.saved + ':b', 'saved:t', { cls: 'hot', label: '저장' });
    if (s.read) P.arrow('a_read', 'saved:b', 'n_' + s.read + ':t', { cls: f.eq ? 'good' : 'bad', label: '읽기' });
    P.box('r1', 16, 284, 320, 34, { cls: s.failed ? 'bad' : s.read ? (f.eq ? 'good' : 'bad') : 'ghost', title: '읽어 온 상수', right: s.failed ? '예외 발생' : s.read || '?' });
    P.box('r2', 344, 284, 320, 34, { cls: s.eq === 'true' ? 'good' : s.eq === 'false' ? 'bad' : s.failed ? 'bad' : 'ghost', title: '저장한 상수와 ==', right: s.failed ? '비교하지 못함' : s.eq });
    P.note('상자 하나가 enum 상수 하나(객체 하나)입니다. 위에서 아래로 같은 자리를 따라 내려오는 것이 번호(ordinal)로 찾는 방식이고, 이름이나 code로 찾으면 그 상수가 어느 자리로 옮겨 갔든 따라갑니다.');
  },
  assume: '마흔다섯 가지 조합 모두를 이 PC의 JDK 21에서 화면의 코드(고친 뒤의 enum 선언과 그 아래 코드)를 실제로 컴파일하고 실행해서, 저장해 둔 값, 출력 두 줄, 종료 코드, 예외 메시지를 대조했습니다. 저장해 둔 값은 예전 선언의 enum에서 ordinal(), name(), code를 실제로 불러 얻은 것입니다. 화면의 코드에서 enum 선언 아래의 다섯 줄은 main 메서드 안에 들어 있는 것으로, main의 선언은 생략했습니다. 같은 상수는 어떤 방법으로 얻어도 같은 객체라는 것, valueOf가 대소문자가 다른 이름에도 예외를 던진다는 것, ==는 한쪽이 null이어도 예외가 나지 않는다는 것, 서로 다른 enum 타입의 == 비교가 컴파일 오류라는 것도 같은 방법으로 확인했습니다. 실제 DB를 쓰지는 않았고, 저장해 둔 값을 코드에 직접 적어 흉내 냈습니다. 상수를 지우는 변경은 설정에 넣지 않았습니다. 지우면 번호로 읽을 때는 뒤의 상수가 당겨져 나오거나 배열 범위를 벗어난 예외(ArrayIndexOutOfBoundsException)가 나고, 이름으로 읽을 때는 valueOf가 예외를 던집니다(이것도 따로 실행해 확인했습니다).',
});
