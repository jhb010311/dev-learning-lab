Lab.register({
  id: 'generic', nav: '제네릭', cat: '자바 언어', mode: 'step',
  title: 'List<Integer>의 <Integer>는 무엇을 막아 주나',
  intro: '제네릭은 List<Integer>처럼 "이 리스트에 무엇을 담는지"를 타입에 적어 두는 문법입니다. 적어 두면 잘못된 타입을 넣는 코드를 컴파일러가 실행 전에 막아 줍니다. 적지 않으면 그 코드가 그대로 컴파일되고, 한참 뒤 값을 꺼내는 자리에서 ClassCastException이 납니다. 같은 리스트를 가리키는 변수 list의 선언을 바꿔 가며 무엇이 컴파일되고 무엇이 막히는지 확인하세요.',
  terms: ['제네릭', '로 타입(raw type)', '타입 소거', '와일드카드(? extends와 ? super)'],
  controls: [
    { id: 'decl', label: '변수 list의 선언 (ints와 같은 리스트를 가리킴)', type: 'select', value: 'raw', options: [['raw', 'List (제네릭 없이, 로 타입)'], ['int', 'List<Integer>'], ['num', 'List<Number>'], ['ext', 'List<? extends Number>'], ['sup', 'List<? super Integer>']] },
    { id: 'op', label: 'list로 하는 일', type: 'select', value: 'addStr', options: [['addInt', 'list.add(3): 정수를 넣기'], ['addDbl', 'list.add(3.5): 실수를 넣기'], ['addStr', 'list.add("삼"): 문자열을 넣기'], ['get', 'Number n = list.get(0): 꺼내기']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '제네릭 없이 문자열을 넣습니다. 컴파일은 되고, 나중에 꺼낼 때 예외가 납니다.', v: { decl: 'raw', op: 'addStr' } },
    { t: '제네릭을 쓰면', d: '같은 실수가 컴파일 오류로 미리 잡힙니다.', v: { decl: 'int', op: 'addStr' } },
    { t: 'List<Number>에 대입', d: 'Integer는 Number의 하위 타입인데도 대입 자체가 컴파일되지 않습니다.', v: { decl: 'num', op: 'addDbl' } },
    { t: '? extends에 넣기', d: '꺼낼 수는 있지만 Integer조차 넣을 수 없습니다.', v: { decl: 'ext', op: 'addInt' } },
    { t: '? extends에서 꺼내기', d: 'Number로 꺼내는 것은 됩니다.', v: { decl: 'ext', op: 'get' } },
    { t: '? super에 넣기', d: 'Integer를 넣을 수 있습니다.', v: { decl: 'sup', op: 'addInt' } },
    { t: '? super에서 꺼내기', d: 'Number로 받을 수 없습니다. Object로만 받을 수 있습니다.', v: { decl: 'sup', op: 'get' } },
  ],
  declLine: function (c) { return { raw: 'List list = ints;', int: 'List<Integer> list = ints;', num: 'List<Number> list = ints;', ext: 'List<? extends Number> list = ints;', sup: 'List<? super Integer> list = ints;' }[c.decl]; },
  opLine: function (c) { return { addInt: 'list.add(3);', addDbl: 'list.add(3.5);', addStr: 'list.add("삼");', get: 'Number n = list.get(0);' }[c.op]; },
  code: function (c) {
    return 'List<Integer> ints = new ArrayList<>();\nints.add(1);\nints.add(2);\n\n' + this.declLine(c) + '\n' + this.opLine(c) + '\n' + (c.op === 'get' ? 'System.out.println("꺼낸 값: " + n);\n' : '') + '\nSystem.out.println(ints);\nList<String> strs = new ArrayList<>();\nSystem.out.println(ints.getClass() == strs.getClass());\nInteger last = ints.get(ints.size() - 1);\nSystem.out.println("마지막 값: " + last);';
  },
  label: function (c) { return { raw: 'List', int: 'List<Integer>', num: 'List<Number>', ext: 'List<? extends Number>', sup: 'List<? super Integer>' }[c.decl] + ' · ' + { addInt: 'add(3)', addDbl: 'add(3.5)', addStr: 'add("삼")', get: 'get(0)' }[c.op]; },
  columns: ['컴파일', '오류가 난 줄', '출력', '끝난 모습'],
  // 컴파일러의 판단: 선언 줄이 오류인지, list로 하는 일이 통과·경고·오류인지와 그 메시지
  judge: function (c) {
    var d = c.decl, o = c.op, V = { addInt: ['3', 'int', 'Integer'], addDbl: ['3.5', 'double', 'Double'], addStr: ['"삼"', 'String', 'String'] }[o];
    var declMsg = d === 'num' ? 'incompatible types: List<Integer> cannot be converted to List<Number>' : '', res = 'pass', msg = '';
    if (o === 'get') {
      if (d === 'raw') { res = 'err'; msg = 'incompatible types: Object cannot be converted to Number'; }
      if (d === 'sup') { res = 'err'; msg = 'incompatible types: CAP#1 cannot be converted to Number'; }
    } else if (d === 'raw') { res = 'warn'; msg = 'unchecked call to add(E) as a member of the raw type List'; }
    else if (d === 'ext') { res = 'err'; msg = 'incompatible types: ' + V[1] + ' cannot be converted to CAP#1'; }
    else if (d === 'int' && o !== 'addInt') { res = 'err'; msg = 'incompatible types: ' + V[1] + ' cannot be converted to Integer'; }
    else if (d === 'sup' && o !== 'addInt') { res = 'err'; msg = 'incompatible types: ' + V[1] + ' cannot be converted to CAP#1'; }
    else if (d === 'num' && o === 'addStr') { res = 'err'; msg = 'incompatible types: String cannot be converted to Number'; }
    return { declMsg: declMsg, res: res, msg: msg, val: V ? V[0] : '', prim: V ? V[1] : '', box: V ? V[2] : '' };
  },
  simulate: function (c) {
    var j = this.judge(c), d = c.decl, o = c.op, ev = [], sum = [], declLine = this.declLine(c), opLine = this.opLine(c), opCode = opLine.slice(0, -1);
    var st = { link: '', chk: '', comp: '?', added: '', addedType: '', out: [], err: '', end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var shown = j.val.replace(/"/g, '');   // 리스트 안에 들어간 모습: 3, 3.5, 삼

    // ── 컴파일 단계
    push('List<Integer> ints를 만들고 1과 2를 넣습니다: <Integer>는 "이 리스트에는 Integer만 담는다"는 표시입니다. 컴파일러는 이 표시를 보고 ints에 넣고 꺼내는 코드를 검사합니다.');
    if (d === 'raw') { st.link = 'ok'; push('List list = ints 검사: 같은 리스트를 <...> 표시 없이 선언한 변수 list로도 가리키게 합니다. 이렇게 제네릭 없이 쓰는 것을 로 타입이라고 합니다. 제네릭이 없던 시절의 코드와 함께 쓸 수 있도록 남겨 둔 방식이어서 대입은 컴파일됩니다. 그 대신 컴파일러는 list에 무엇을 넣는지 검사하지 못합니다.'); }
    if (d === 'int') { st.link = 'ok'; push('List<Integer> list = ints 검사: 선언한 타입이 같으므로 대입됩니다. list와 ints는 같은 리스트 객체를 가리킵니다.'); }
    if (d === 'num') { st.link = 'err'; st.comp = '오류'; push('List<Number> list = ints 검사: 컴파일 오류입니다. Integer는 Number의 하위 타입이지만, List<Integer>는 List<Number>의 하위 타입이 아닙니다. 컴파일러는 "' + j.declMsg + '"라고 알립니다. 이 대입이 허용된다면 list.add(3.5)로 실수(Double)를 넣을 수 있게 되고, 그 값은 Integer만 담기로 한 ints 안에 들어가 버리기 때문입니다.', 'bad'); }
    if (d === 'ext') { st.link = 'ok'; push('List<? extends Number> list = ints 검사: ? extends Number는 "Number이거나 그 하위 타입인 어떤 타입"이라는 뜻입니다. List<Integer>도 List<Double>도 이 변수에 대입할 수 있으므로 통과합니다. 그래서 컴파일러는 list의 원소가 Number의 한 종류라는 것만 알고, 정확히 무엇인지는 모르는 것으로 다룹니다.'); }
    if (d === 'sup') { st.link = 'ok'; push('List<? super Integer> list = ints 검사: ? super Integer는 "Integer이거나 그 상위 타입(Number, Object)인 어떤 타입"이라는 뜻입니다. List<Integer>도 List<Number>도 List<Object>도 대입할 수 있으므로 통과합니다. 그래서 컴파일러는 이 리스트에 Integer를 담을 수 있다는 것만 압니다.'); }

    st.chk = j.res === 'err' ? '오류' : j.res === 'warn' ? '경고' : '통과';
    var CAP = ' CAP#1은 컴파일러가 "?에 해당하는, 무엇인지 모르는 타입"에 붙인 이름입니다.';
    if (o !== 'get') {
      if (d === 'raw') push(opCode + ' 검사: list가 로 타입이라 컴파일러는 넣는 값의 타입을 확인할 수 없습니다. 오류가 아니라 경고만 냅니다("' + j.msg + '"). ' + (o === 'addInt' ? '이번에는 넣는 값이 정수라서 문제가 없지만, 그것은 컴파일러가 확인해 준 것이 아닙니다.' : 'Integer 리스트에 ' + j.box + '을 넣는 코드인데도 컴파일됩니다.'), o === 'addInt' ? '' : 'bad');
      if (d === 'int' && o === 'addInt') push(opCode + ' 검사: 3은 Integer로 바뀌어(오토박싱) 들어갈 수 있습니다. 통과합니다.', 'good');
      if (d === 'int' && o !== 'addInt') { st.comp = '오류'; push(opCode + ' 검사: 컴파일 오류입니다. list는 Integer만 받는데 ' + j.prim + ' 값을 넣으려 했습니다. 컴파일러는 "' + j.msg + '"라고 알립니다. 잘못된 타입을 넣는 실수가 실행 전에 잡혔습니다.', 'good'); }
      if (d === 'num' && o !== 'addStr') push(opCode + ' 검사: list가 List<Number>라면 이 줄에는 문제가 없습니다(' + (o === 'addInt' ? 'Integer는' : 'Double은') + ' Number의 하위 타입입니다). 바로 이 줄이 컴파일되기 때문에 앞 줄의 대입을 막는 것입니다. 오류는 앞 줄 한 곳입니다.');
      if (d === 'num' && o === 'addStr') push(opCode + ' 검사: 이 줄도 컴파일 오류입니다. String은 Number가 아닙니다("' + j.msg + '"). 오류는 앞 줄과 이 줄, 두 곳입니다.', 'bad');
      if (d === 'ext') { st.comp = '오류'; push(opCode + ' 검사: 컴파일 오류입니다("' + j.msg + '").' + CAP + ' list가 실제로는 List<Double>을 가리키고 있을 수도 있으므로, 컴파일러는 ' + (o === 'addInt' ? 'Integer조차' : j.box + '도') + ' 넣게 두지 않습니다. ? extends로 선언한 리스트에는 값을 넣을 수 없습니다.', 'bad'); }
      if (d === 'sup' && o === 'addInt') push(opCode + ' 검사: 통과합니다. 실제 리스트가 List<Integer>이든 List<Number>이든 List<Object>이든, Integer는 어느 것에나 넣을 수 있기 때문입니다.', 'good');
      if (d === 'sup' && o !== 'addInt') { st.comp = '오류'; push(opCode + ' 검사: 컴파일 오류입니다("' + j.msg + '").' + CAP + ' 실제 리스트가 List<Integer>일 수 있으므로 ' + j.box + '을 넣게 둘 수 없습니다. ? super Integer 리스트에 넣을 수 있는 것은 Integer입니다.', 'good'); }
    } else {
      if (d === 'raw') { st.comp = '오류'; push(opCode + ' 검사: 컴파일 오류입니다("' + j.msg + '"). 로 타입에서 꺼낸 값은 무엇인지 모르므로 Object로만 취급합니다. Number로 쓰려면 (Number) list.get(0)처럼 형 변환을 직접 적어야 하고, 그 변환이 맞는지는 실행해 봐야 압니다.', 'bad'); }
      if (d === 'int') push(opCode + ' 검사: list에서 꺼낸 값은 Integer이고, Integer는 Number의 하위 타입이므로 Number 변수에 담을 수 있습니다. 통과합니다. 형 변환을 적을 필요도 없습니다.', 'good');
      if (d === 'num') push(opCode + ' 검사: list가 List<Number>라면 이 줄에는 문제가 없습니다. 오류는 앞 줄 한 곳입니다.');
      if (d === 'ext') push(opCode + ' 검사: 통과합니다. 실제 원소 타입이 무엇이든 Number의 하위 타입이므로, 꺼낸 값을 Number로 받는 것은 언제나 안전합니다.', 'good');
      if (d === 'sup') { st.comp = '오류'; push(opCode + ' 검사: 컴파일 오류입니다("' + j.msg + '").' + CAP + ' 실제 리스트가 List<Object>일 수도 있으므로 꺼낸 값이 Number라는 보장이 없습니다. ? super로 선언한 리스트에서 꺼낸 값은 Object로만 받을 수 있습니다.', 'bad'); }
    }
    var errLines = [], msgs = [];
    if (j.declMsg) { errLines.push(declLine); msgs.push(j.declMsg); }
    if (j.res === 'err') { errLines.push(opLine); msgs.push(j.msg); }
    if (errLines.length) {
      st.comp = '오류'; st.end = '실행 못 함';
      push('컴파일이 실패했습니다: class 파일이 만들어지지 않으므로 프로그램을 실행할 수 없습니다. 잘못될 수 있는 코드가 실행되기 전에 걸러졌습니다.', 'bad');
      sum.push('컴파일 오류입니다 (' + errLines.length + '곳). 프로그램은 실행되지 않습니다.');
      if (d === 'num') sum.push('List<Integer>를 List<Number> 변수에 대입할 수 없습니다. 원소끼리는 상위·하위 관계여도, 그것을 담는 리스트끼리는 아무 관계가 없습니다. 허용된다면 그 변수로 Double을 넣어 Integer 리스트를 망가뜨릴 수 있기 때문입니다. 여러 종류의 숫자 리스트를 받고 싶을 때는 List<? extends Number>를 씁니다.');
      if (d === 'int') sum.push('제네릭을 쓰면 잘못된 타입을 넣는 코드가 컴파일 오류가 됩니다. 로 타입(List)으로 바꿔 같은 코드를 실행해 보면, 같은 실수가 실행 중의 예외로 늦게 드러나는 것을 볼 수 있습니다.');
      if (d === 'ext') sum.push('? extends Number로 선언한 리스트는 "꺼내서 Number로 쓰기"만 됩니다. 실제 원소 타입을 모르므로 넣는 것은 막습니다. 값을 읽기만 하는 매개변수에 씁니다(예: 합계를 구하는 메서드).');
      if (d === 'sup' && o !== 'get') sum.push('? super Integer로 선언한 리스트에는 Integer를 넣을 수 있고, 그 밖의 타입은 넣을 수 없습니다.');
      if (d === 'sup' && o === 'get') sum.push('? super Integer로 선언한 리스트는 "Integer를 넣기"에 쓰는 것입니다. 꺼낸 값은 Object로만 받을 수 있습니다. 값을 채워 넣기만 하는 매개변수에 씁니다.');
      if (d === 'raw') sum.push('로 타입에서는 꺼낸 값이 Object입니다. 제네릭이 없던 때에는 꺼낼 때마다 형 변환을 직접 적어야 했고, 그것이 틀리면 실행 중에 ClassCastException이 났습니다.');
      return { events: ev, summary: sum, msgs: msgs, warn: '', crashLine: '', row: ['오류', errLines.join(' / '), '(실행 못 함)', '(실행 못 함)'] };
    }
    st.comp = j.res === 'warn' ? '성공 (경고 있음)' : '성공';
    push(j.res === 'warn' ? '컴파일에 성공했습니다: 경고는 컴파일을 막지 않습니다. 이제 프로그램을 실행합니다.' : '컴파일에 성공했습니다: 이제 프로그램을 실행합니다.', j.res === 'warn' ? '' : 'good');

    // ── 실행 단계
    var bad = o === 'addDbl' || o === 'addStr', content;
    if (o === 'get') {
      st.out.push('꺼낸 값: 1'); content = '[1, 2]';
      push('Number n = list.get(0) 실행: 첫 번째 원소 1을 꺼내 n에 담고 "꺼낸 값: 1"을 출력합니다.', '');
    } else {
      st.added = shown; st.addedType = j.box; content = '[1, 2, ' + shown + ']';
      push(opCode + ' 실행: ' + (d === 'raw' ? '실행 중의 리스트 객체는 자기가 Integer용이라는 것을 기억하지 않습니다. 넣을 때는 아무 검사도 하지 않으므로 ' + j.box + ' 값(' + shown + ')이 그대로 들어갑니다.' + (bad ? ' list와 ints는 같은 객체이므로, Integer만 담기로 한 ints 안에 ' + j.box + '이 들어간 것입니다.' : '') : '세 번째 원소로 3이 들어갑니다. list와 ints는 같은 객체이므로 ints에서도 보입니다.'), bad ? 'bad' : '');
    }
    st.out.push(content);
    push('System.out.println(ints) 실행: 리스트의 내용을 출력합니다. 출력은 ' + content + '입니다.' + (bad ? ' 출력만 할 때는 원소가 무슨 타입인지 따지지 않으므로 아직 아무 일도 일어나지 않습니다.' : ''), '');
    st.out.push('true');
    push('ints.getClass() == strs.getClass() 실행: true를 출력합니다. List<Integer>와 List<String>은 실행 중에는 똑같은 ArrayList 클래스의 객체입니다. <Integer>와 <String>은 컴파일할 때의 검사에만 쓰이고 실행 코드에는 남지 않습니다(타입 소거).', '');
    var crash = '', lastLine = 'Integer last = ints.get(ints.size() - 1);';
    if (bad) {
      crash = 'java.lang.ClassCastException';
      st.err = 'Exception in thread "main" java.lang.ClassCastException: class java.lang.' + j.box + ' cannot be cast to class java.lang.Integer ...'; st.end = '예외로 중단';
      push('Integer last = ints.get(ints.size() - 1) 실행: ClassCastException이 납니다. ints는 List<Integer>이므로 컴파일러가 이 줄에 "꺼낸 값을 Integer로 바꾸는" 형 변환을 넣어 두었습니다. 그런데 실제로 나온 값은 ' + j.box + '입니다. 잘못 넣은 줄이 아니라 한참 뒤 꺼내는 줄에서 터지므로 원인을 찾기 어렵습니다.', 'bad');
    } else {
      var lastVal = o === 'get' ? '2' : '3';
      st.out.push('마지막 값: ' + lastVal); st.end = '정상 종료';
      push('Integer last = ints.get(ints.size() - 1) 실행: 마지막 원소(' + lastVal + ')를 Integer로 꺼내 출력합니다. 출력은 "마지막 값: ' + lastVal + '"입니다. 프로그램이 정상으로 끝납니다.', 'good');
    }
    var endText = crash ? '예외로 중단: ClassCastException (' + j.box + '을 Integer로 바꿀 수 없음)' : '정상 종료';
    sum.push('컴파일 ' + st.comp + '. 출력: ' + st.out.join(' / ') + '. 끝난 모습: ' + endText + '.');
    if (d === 'raw' && bad) sum.push('제네릭 없이(로 타입) 쓰면 잘못된 타입을 넣는 코드가 컴파일되고, 넣는 순간에도 아무 일이 없다가, 값을 꺼내는 다른 줄에서 ClassCastException이 납니다. 선언을 List<Integer>로 바꾸면 같은 코드가 컴파일 오류가 됩니다.');
    if (d === 'raw' && !bad) sum.push('이번에는 넣은 값이 정수라서 문제가 없었습니다. 하지만 컴파일러가 확인해 준 것이 아니라 운이 좋았던 것입니다. 경고(unchecked)는 "이 줄은 내가 검사하지 못했다"는 컴파일러의 알림입니다.');
    if (d === 'int') sum.push('제네릭을 쓰면 넣을 때는 컴파일러가 타입을 검사하고, 꺼낼 때는 형 변환을 적지 않아도 됩니다.');
    if (d === 'ext') sum.push('? extends Number로 선언한 리스트에서는 값을 꺼내 Number로 쓸 수 있습니다. 넣는 쪽(add)을 골라 비교해 보세요.');
    if (d === 'sup') sum.push('? super Integer로 선언한 리스트에는 Integer를 넣을 수 있습니다. 꺼내는 쪽(get)을 골라 비교해 보세요.');
    sum.push('출력 가운데 true가 타입 소거를 보여 줍니다. 실행 중의 리스트는 원소 타입을 기억하지 않으므로, 제네릭의 보호는 전부 컴파일할 때 이루어집니다. 로 타입으로 그 검사를 피하면 막아 줄 것이 없습니다.');
    return { events: ev, summary: sum, msgs: [], warn: j.res === 'warn' ? j.msg : '', crashLine: crash ? lastLine : '', row: [st.comp, '없음', st.out.join(' / '), endText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 먼저 컴파일러의 검사를, 이어서 프로그램의 실행을 한 단계씩 보여 줍니다.'); return; }
    var ALLOW = { raw: '무엇이든 넣기 (검사 없음, 경고) · 꺼내면 Object', int: 'Integer 넣기 · 꺼내면 Integer', num: '(대입이 컴파일되지 않음)', ext: '넣기 불가 · 꺼내면 Number', sup: 'Integer 넣기 · 꺼내면 Object' };
    var TYPE = { raw: 'List', int: 'List<Integer>', num: 'List<Number>', ext: 'List<? extends Number>', sup: 'List<? super Integer>' };
    H.table(v, ['변수', '선언한 타입', '컴파일러가 허용하는 것'], [
      { cells: ['ints', 'List<Integer>', 'Integer 넣기 · 꺼내면 Integer'] },
      { cls: s.link ? '' : 'gone', cells: ['list', TYPE[c.decl], { v: ALLOW[c.decl], cls: s.link === 'err' ? 'bad' : '' }] },
    ], '같은 리스트를 가리키는 두 변수');
    var ln = H.lanes(v);
    H.lane(ln, '검사', s.chk ? this.opLine(c) + '  →  ' + s.chk : '아직', s.chk === '오류' ? 'bad' : s.chk === '경고' ? 'hot' : s.chk === '통과' ? 'good' : 'none');
    H.lane(ln, '컴파일', s.comp === '?' ? '검사 중' : s.comp, s.comp === '오류' ? 'bad' : s.comp === '?' ? 'hot' : 'good');
    H.lane(ln, '리스트 내용', '[1, 2' + (s.added ? ', ' + s.added : '') + ']' + (s.added && s.addedType !== 'Integer' ? '  (' + s.addedType + '이 섞여 있음)' : ''), s.added && s.addedType !== 'Integer' ? 'bad' : 'wait');
    H.title(v, '콘솔 출력');
    var lines = s.out.slice(); if (s.err) lines.push(s.err + '  (오류 출력)');
    v.appendChild(H.el('pre', 'code', lines.length ? lines.join('\n') : '(아직 없음)'));
    H.counters(v, [[s.comp, '컴파일'], [s.end, '프로그램']]);
  },
  // 그림: 왼쪽에 변수 ints와 list, 오른쪽에 둘이 함께 가리키는 리스트 객체와 그 원소. 아래에는 컴파일러가 list로 하는 일을 통과시켰는지와 결과를 적는다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { link: '', chk: '', comp: '?', added: '', addedType: '', out: [], err: '', end: '?' };
    var TYPE = { raw: 'List (표시 없음)', int: 'List<Integer>', num: 'List<Number>', ext: 'List<? extends Number>', sup: 'List<? super Integer>' };
    P.size(680, 280);
    P.region('vr', 16, 16, 236, 152, '변수 (컴파일러가 보는 타입)');
    P.region('hp', 300, 16, 364, 152, '실행 중의 리스트 객체');
    P.box('v_ints', 30, 50, 208, 46, { cls: 'wait', title: 'ints', sub: 'List<Integer>' });
    P.box('v_list', 30, 108, 208, 46, { cls: s.link === 'ok' ? (c.decl === 'raw' ? 'hot' : 'wait') : s.link === 'err' ? 'bad' : 'ghost', title: 'list', sub: TYPE[c.decl] });
    P.box('obj', 316, 50, 332, 32, { cls: 'plain', title: 'ArrayList', right: '원소 타입 표시 없음' });
    P.box('e0', 316, 94, 100, 58, { cls: 'good', title: '1', sub: 'Integer', center: true });
    P.box('e1', 432, 94, 100, 58, { cls: 'good', title: '2', sub: 'Integer', center: true });
    if (s.added) P.box('e2', 548, 94, 100, 58, { cls: s.addedType === 'Integer' ? 'good' : 'bad now', title: s.added, sub: s.addedType, center: true });
    else P.box('e2', 548, 94, 100, 58, { cls: 'ghost', title: '', sub: '비어 있음', center: true });
    P.arrow('a_ints', 'v_ints:r', 'obj:l:0.35', {});
    if (s.link === 'ok') P.arrow('a_list', 'v_list:r', 'obj:l:0.75', { cls: c.decl === 'raw' ? 'hot' : '' });
    P.box('chk', 16, 186, 648, 34, { cls: s.chk === '오류' || s.link === 'err' ? 'bad' : s.chk === '경고' ? 'hot' : s.chk === '통과' ? 'good' : 'ghost', title: '컴파일러의 검사:  ' + this.opLine(c), right: s.link === 'err' && !s.chk ? '앞 줄이 오류' : s.chk || '아직' });
    P.box('r1', 16, 230, 320, 34, { cls: s.comp === '?' ? 'ghost' : s.comp === '오류' ? 'bad' : 'good', title: '컴파일', right: s.comp });
    P.box('r2', 344, 230, 320, 34, { cls: s.end === '정상 종료' ? 'good' : s.end === '?' ? 'ghost' : 'bad', title: '프로그램', right: s.end });
    P.note('<Integer> 같은 표시는 변수 쪽(컴파일러가 보는 쪽)에만 있습니다. 실행 중의 리스트 객체에는 그런 표시가 없어서, 넣을 때 스스로 걸러 내지 못합니다. 그래서 잘못된 타입을 막는 일은 컴파일러가 변수의 선언을 보고 합니다.');
  },
  assume: '스무 가지 조합 모두를 이 PC의 JDK 21에서 화면의 코드를 main 메서드 안에 넣은 소스로 실제로 컴파일하고(javac -Xlint:unchecked), 컴파일된 것은 실행해서 컴파일 여부, 오류가 난 줄과 메시지, 경고 메시지, 출력, 예외의 종류와 예외가 난 줄을 대조했습니다. 컴파일러 메시지는 명령줄 javac가 보여 주는 모양(클래스 이름만, 정체 모를 타입은 CAP#1)으로 적었습니다. 화면의 코드에는 import java.util.ArrayList, import java.util.List와 main 메서드의 선언이 생략되어 있습니다. -Xlint:unchecked 없이 컴파일하면 경고의 자세한 내용 대신 "uses unchecked or unsafe operations"라는 안내만 나옵니다. ? extends로 선언한 리스트에도 null은 넣을 수 있지만 모형에서는 다루지 않았습니다. 타입 소거가 일어나도 필드나 메서드의 선언에 적힌 제네릭 정보는 class 파일에 남아 리플렉션으로 읽을 수 있습니다. 지워지는 것은 실행 중인 객체가 가진 정보입니다.',
});
