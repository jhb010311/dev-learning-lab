Lab.register({
  id: 'json_basic', nav: 'JSON', cat: '기초개념', mode: 'step', basic: true, deep: ['msgconv'],
  title: 'JSON은 어떻게 생긴 글이고, 무엇이 틀리면 읽히지 않는가',
  intro: '프로그램끼리 데이터를 주고받을 때(예: 서버가 브라우저에 회원 정보를 보낼 때), 메모리 안의 객체를 그대로 보낼 수는 없습니다. 그래서 정해진 약속대로 글자로 적어 보내고, 받는 쪽은 그 글자를 읽어 다시 자기 언어의 객체로 만듭니다. JSON은 가장 널리 쓰이는 그 약속입니다. 코드 칸에 보이는 것이 JSON 글 그대로입니다. { } 안에 "이름": 값을 쉼표로 이어 적고, 이름과 글자 값은 큰따옴표로 감싸며, 숫자는 따옴표 없이 적습니다. [ ]는 값 여러 개의 목록입니다. 따옴표가 있고 없고가 값의 종류를 정해서 30은 숫자, "30"은 글자입니다. 이 실습은 이름의 따옴표, age의 값, 쉼표를 하나씩 바꿔 가며 같은 글을 두 가지 해석기(글을 읽어 객체로 만드는 프로그램), 곧 Node.js의 JSON.parse와 자바의 Jackson에 넣어, 읽히는지와 읽은 age가 어떤 종류인지를 봅니다. JSON에는 주석을 적는 문법이 없어서, 코드 칸에는 설명 없이 글만 보입니다.',
  terms: ['JSON', 'JSON의 값의 종류', '파싱(parsing)', '직렬화와 역직렬화'],
  controls: [
    { id: 'key', label: '첫 이름 name의 따옴표', type: 'select', value: 'dq', options: [['dq', '이름을 큰따옴표로 감싼다: "name"'], ['none', '이름의 따옴표를 지운다: name'], ['sq', "이름을 작은따옴표로 감싼다: 'name'"]] },
    { id: 'age', label: 'age의 값', type: 'select', value: 'num', options: [['num', 'age의 값을 숫자로 적는다: 30'], ['str', 'age의 값에 큰따옴표를 붙인다: "30"']] },
    { id: 'comma', label: '쉼표', type: 'select', value: 'ok', options: [['ok', '값 사이에만 쉼표를 둔다'], ['trail', '마지막 값 뒤에도 쉼표를 붙인다'], ['miss', '"age" 줄 끝의 쉼표를 빠뜨린다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'JSON은 어떻게 생겼고, 받는 쪽은 그 글을 어떻게 읽나', d: '규칙에 맞는 JSON 글. 해석기가 읽어 age가 숫자인 객체를 만듭니다.', v: { key: 'dq', age: 'num', comma: 'ok' } },
    { t: '30에 큰따옴표를 붙이면', q: '30에 큰따옴표를 붙여 "30"으로 적으면', d: '읽히지만 age가 글자가 되어, 1을 더하면 301이 됩니다.', v: { key: 'dq', age: 'str', comma: 'ok' } },
    { t: '이름의 큰따옴표를 지우면', q: '이름의 큰따옴표를 지우면', d: '이름에 따옴표가 없어 글 전체를 읽지 못합니다.', v: { key: 'none', age: 'num', comma: 'ok' } },
    { t: '작은따옴표를 쓰면', q: '큰따옴표 대신 작은따옴표를 쓰면', d: '작은따옴표는 JSON의 따옴표가 아니어서 글 전체를 읽지 못합니다.', v: { key: 'sq', age: 'num', comma: 'ok' } },
    { t: '마지막 값 뒤에 쉼표를 붙이면', q: '마지막 값 뒤에 쉼표를 하나 더 붙이면', d: '쉼표 뒤에 이름이 와야 하는데 끝(})이 와서 글 전체를 읽지 못합니다.', v: { key: 'dq', age: 'num', comma: 'trail' } },
    { t: '쉼표를 빠뜨리면', q: '값 사이의 쉼표를 빠뜨리면', d: '값 사이에 쉼표가 없어 글 전체를 읽지 못합니다.', v: { key: 'dq', age: 'num', comma: 'miss' } },
  ],
  NAMES: { dq: '"name"', none: 'name', sq: "'name'" },
  // 화면에 보이는 JSON 글 (Probe가 두 해석기에 넣은 글과 같아야 한다)
  lines: function (c) {
    return [
      '{',
      '  ' + this.NAMES[c.key] + ': "김철수",',
      '  "age": ' + (c.age === 'num' ? '30' : '"30"') + (c.comma === 'miss' ? '' : ','),
      '  "tags": ["vip", "new"]' + (c.comma === 'trail' ? ',' : ''),
      '}',
    ];
  },
  code: function (c) { return this.lines(c).join('\n'); },
  label: function (c) { return '이름 ' + this.NAMES[c.key] + ' · age ' + (c.age === 'num' ? '30' : '"30"') + ' · ' + { ok: '쉼표 정상', trail: '마지막 값 뒤 쉼표', miss: 'age 줄 쉼표 없음' }[c.comma]; },
  // 이 설정에서 해석기가 처음 만나는 규칙 위반(없으면 null): 줄, 칸, 그 자리의 글자 (Probe가 두 해석기에서 잰 것과 같은 항목)
  facts: function (c) {
    var fail = null;
    if (c.key !== 'dq') fail = { kind: c.key, line: 2, col: 3, ch: c.key === 'none' ? 'n' : "'" };
    else if (c.comma === 'miss') fail = { kind: 'miss', line: 4, col: 3, ch: '"' };
    else if (c.comma === 'trail') fail = { kind: 'trail', line: 5, col: 1, ch: '}' };
    return { text: this.code(c), fail: fail, ageKind: c.age === 'num' ? '숫자' : '글자', plus: c.age === 'num' ? '31' : '301' };
  },
  WHY: { none: '이름에 큰따옴표가 없음', sq: '이름을 큰따옴표가 아닌 작은따옴표로 감쌈', trail: '마지막 쉼표 뒤에 이름이 와야 하는데 }가 옴', miss: '쉼표가 있어야 할 자리에 다음 이름이 바로 옴' },
  columns: ['읽기', '읽어 낸 age의 종류', '자바스크립트로 읽은 객체의 age + 1'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], fail = f.fail, num = c.age === 'num', agev = num ? '30' : '"30"';
    var st = { ln: ['plain', 'plain', 'plain', 'plain', 'plain'], o: { name: '', age: '', tags: '' }, arr: [], dead: false, done: false, rows: [], read: '', kind: '', plus: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 1단계: 보내는 쪽이 글자로 적는다
    var diff = [];
    if (c.key === 'none') diff.push('이름의 큰따옴표를 지움');
    if (c.key === 'sq') diff.push('이름을 작은따옴표로 감쌈');
    if (!num) diff.push('age의 값 30에 큰따옴표를 붙임');
    if (c.comma === 'trail') diff.push('마지막 값 뒤에 쉼표를 붙임');
    if (c.comma === 'miss') diff.push('"age" 줄 끝의 쉼표를 뺌');
    push('서버가 브라우저에 회원 정보를 보내려 합니다. 서버의 메모리 안에 있는 객체(이름, 나이, 태그를 가진 것)는 그대로 보낼 수 없습니다. 그래서 정해진 약속대로 글자로 적어 보내는데, 그 약속이 JSON입니다. 보내는 쪽이 객체를 아래 글자로 적었습니다.' + (diff.length ? ' 이 실습의 글이 처음 모양과 다른 점: ' + diff.join(', ') + '.' : '') + ' 받는 쪽의 해석기가 이 글을 읽어 객체로 되돌립니다. 이 실습은 같은 글을 Node.js의 JSON.parse와 자바의 Jackson 두 해석기에 넣어 보았고, 모든 조합에서 두 해석기의 판단이 같았습니다.', '');
    // 2단계: {
    st.ln[0] = 'hot'; st.rows.push(['{', '이름과 값의 묶음이 시작됨']);
    push('받는 쪽 해석기가 글을 앞에서부터 차례로 읽습니다. 첫 글자는 {입니다. {는 "이름과 값의 묶음이 시작된다"는 뜻이어서, 해석기는 이제부터 "이름": 값이 쉼표로 이어지다가 }로 끝나리라고 기대합니다.', '');

    // 실패를 알리는 단계들: 읽던 것을 모두 버리고 멈춘다
    function stop(partial) {
      var where = fail.line + '번째 줄 ' + fail.col + '번째 글자';
      st.dead = true; st.o = { name: '', age: '', tags: '' }; st.arr = []; st.read = '실패: ' + WHYS[fail.kind]; st.kind = '읽지 못함'; st.plus = '읽지 못함'; st.done = true;
      var more = (c.key !== 'dq' && c.comma !== 'ok') ? ' 뒤쪽(' + (c.comma === 'miss' ? '"age" 줄 끝에 쉼표가 없는 곳' : '마지막 값 뒤의 쉼표') + ')에도 규칙에 어긋난 곳이 있지만, 해석기는 처음 만난 곳에서 멈추므로 알려 주는 오류는 이 한 곳뿐입니다.' : '';
      push('해석기가 여기서 읽기를 멈추고 오류를 냅니다. 오류가 난 곳은 ' + where + '이고, JSON.parse와 Jackson이 알려 준 위치가 같았습니다.' + (partial ? ' 앞에서 읽은 ' + partial + '도 객체로 돌려주지 않습니다.' : '') + ' 읽을 수 있는 데까지만 읽어 돌려주는 일은 없고, 글 전체가 읽히거나 전체가 실패하거나 둘 중 하나입니다.' + more, 'bad');
      push('받는 쪽은 객체를 얻지 못했습니다. 객체가 없으니 age를 꺼낼 수 없고, age의 종류도 1을 더한 결과도 없습니다.', 'bad');
    }
    var WHYS = this.WHY;
    function summaryFail(a, b) { sum.push(a); sum.push(b); }
    var firstFail = function () {
      var m = { none: '이름의 큰따옴표를 지우면 규칙에 어긋나서, 해석기가 둘째 줄의 name에서 멈추고 오류를 냅니다. 글을 읽지 못해 객체는 만들어지지 않았습니다.', sq: '큰따옴표 대신 작은따옴표를 쓰면 규칙에 어긋나서, 해석기가 둘째 줄의 \'name\'에서 멈추고 오류를 냅니다. 글을 읽지 못해 객체는 만들어지지 않았습니다.' };
      return m[c.key];
    };

    // 3단계: 첫 이름과 값
    st.ln[0] = 'good'; st.ln[1] = 'hot';
    if (c.key !== 'dq') {
      st.ln[1] = 'bad'; st.rows.push([c.key === 'none' ? 'name' : "'name'", '이름이 와야 할 자리인데 큰따옴표가 아님']);
      push(c.key === 'none' ? '다음에 name이 나옵니다. 이름이 와야 할 자리인데 큰따옴표가 아니라 n이 나왔습니다. JSON에서 이름은 반드시 큰따옴표로 감싸야 하므로, 해석기는 이것을 이름의 시작으로 읽지 못합니다.' : "다음에 'name'이 나옵니다. 이름이 와야 할 자리인데 큰따옴표가 아니라 작은따옴표(')가 나왔습니다. JSON에서 글자를 감싸는 따옴표는 큰따옴표뿐이어서, 해석기는 작은따옴표를 이름의 시작으로 읽지 못합니다.", 'bad');
      stop('');
      summaryFail(firstFail(), c.key === 'none' ? 'JSON에서 이름은 반드시 큰따옴표로 감쌉니다. 프로그래밍 언어의 변수 이름처럼 따옴표 없이 써도 되는 것이 아닙니다. 나머지 줄이 맞아도 읽힌 것은 하나도 없습니다.' : '작은따옴표는 JSON의 따옴표가 아닙니다. JSON 글에서는 이름도 글자 값도 큰따옴표로 적어야 합니다.');
      return { events: ev, summary: sum, f: f, row: ['실패: ' + this.WHY[fail.kind], '읽지 못함', '읽지 못함'] };
    }
    st.rows.push(['"name":', '큰따옴표로 감싼 이름 name, : 뒤가 값']);
    push('다음에 "name"이 나옵니다. 묶음 안에서 큰따옴표로 감싼 글자는 이름입니다. 뒤따르는 :는 "이 뒤가 이 이름의 값"이라는 표시입니다.', '');
    st.o.name = '글자 "김철수"'; st.arr.push('name'); st.rows.push(['"김철수",', '큰따옴표가 있으니 글자 값. 쉼표 뒤에 다음 묶음']);
    push(': 뒤의 "김철수"는 큰따옴표로 감싸여 있으니 글자 값입니다. 이어서 쉼표가 있으므로 다음 "이름": 값이 이어집니다.', '');

    // 4단계: age
    st.ln[1] = 'good'; st.ln[2] = 'hot';
    st.o.age = num ? '숫자 30' : '글자 "30"'; st.arr.push('age');
    st.rows.push(['"age": ' + agev, num ? '따옴표가 없는 값이니 숫자' : '큰따옴표가 있으니 글자 (안의 모양이 숫자여도)']);
    push('쉼표 다음 줄입니다. "age"는 큰따옴표로 감싼 이름이고, : 뒤의 값은 ' + agev + '입니다. ' + (num ? '큰따옴표가 없고 숫자 모양이어서 숫자 값입니다.' : '큰따옴표로 감싸여 있으니, 안에 든 것이 숫자 모양이어도 글자 값입니다.') + (c.comma === 'miss' ? ' 그런데 이 값 뒤에는 쉼표가 오지 않았습니다.' : ' 뒤에 쉼표가 있어 다음 묶음이 이어집니다.'), '');
    if (c.comma === 'miss') {
      st.ln[2] = 'good'; st.ln[3] = 'bad'; st.rows.push(['"tags"', '쉼표 없이 이름이 바로 나옴']);
      push('age의 값 뒤에는 쉼표가 있어야 다음 "이름": 값이 이어집니다. 그런데 쉼표 없이 다음 줄의 "tags"가 바로 나옵니다. 줄이 바뀐 것은 구분 기호가 아니어서(줄바꿈과 공백은 뜻 없이 넘어갑니다), 해석기는 값과 값 사이에 와야 할 쉼표를 찾지 못하고 이 자리를 규칙에 어긋난 곳으로 봅니다.', 'bad');
      stop('name과 age의 값');
      summaryFail('값 사이의 쉼표를 빠뜨리면 규칙에 어긋나서, 해석기가 "age" 줄 다음의 "tags"에서 멈추고 오류를 냅니다. 앞의 name과 age가 맞게 적혀 있어도 읽힌 것은 없고, 글 전체를 읽지 못합니다.', '쉼표는 "다음 묶음이 이어진다"는 표시입니다. 줄이 바뀌었다고 해서 다음 이름으로 읽어 주지 않습니다.');
      return { events: ev, summary: sum, f: f, row: ['실패: ' + this.WHY.miss, '읽지 못함', '읽지 못함'] };
    }

    // 5단계: tags
    st.ln[2] = 'good'; st.ln[3] = 'hot';
    st.o.tags = '목록 2개'; st.arr.push('tags'); st.rows.push(['"tags": ["vip", "new"]', '[ ]는 값의 목록. 글자 두 개']);
    push('쉼표 다음 줄입니다. "tags"는 큰따옴표로 감싼 이름이고, 값은 [로 시작합니다. [ ]는 값 여러 개의 목록입니다. 안의 "vip"와 "new"는 둘 다 큰따옴표로 감싸여 글자 두 개이고, 사이의 쉼표로 나뉩니다. ]에서 목록이 끝납니다.' + (c.comma === 'trail' ? ' 그런데 ] 뒤에 쉼표가 하나 더 있습니다.' : ''), '');
    if (c.comma === 'trail') {
      st.ln[3] = 'good'; st.ln[4] = 'bad'; st.rows.push(['}', '쉼표 뒤에 이름이 와야 하는데 끝이 나옴']);
      push('쉼표를 만났으니 해석기는 새 "이름": 값이 이어질 것으로 기대합니다. 그런데 다음에 나온 것은 }입니다. 이름이 와야 할 자리에 끝을 나타내는 }가 와서 규칙에 어긋납니다. JSON의 문법에서 쉼표는 값과 값 사이에만 두고, 쉼표 뒤에는 반드시 다음 이름과 값이 와야 합니다.', 'bad');
      stop('name, age, tags');
      summaryFail('마지막 값 뒤에 쉼표를 붙이면, 쉼표 뒤에 이름이 와야 하는데 }가 와서 규칙에 어긋납니다. 해석기가 마지막 줄의 }에서 멈추고 오류를 냅니다. 앞의 내용이 모두 맞아도 글 전체를 읽지 못합니다.', 'JSON에서 쉼표는 값과 값 사이에만 둡니다. 맨 끝에 하나 더 붙이면, 읽을 수 있는 데까지 읽어 주는 일 없이 글 전체가 읽히지 않습니다.');
      return { events: ev, summary: sum, f: f, row: ['실패: ' + this.WHY.trail, '읽지 못함', '읽지 못함'] };
    }

    // 6단계: } 로 끝나고 객체가 만들어진다
    st.ln[3] = 'good'; st.ln[4] = 'hot'; st.rows.push(['}', '묶음의 끝']);
    push('마지막으로 }를 만났습니다. 쉼표 없이 }가 나왔으니 {로 시작한 묶음이 여기서 끝납니다. 규칙에 어긋난 곳이 한 군데도 없이 끝까지 읽혔습니다.', 'good');
    st.ln[4] = 'good'; st.done = true; st.read = '성공'; st.kind = f.ageKind;
    push('읽기에 성공해, 받는 쪽이 자기 언어의 객체를 만들었습니다. name은 글자 "김철수", age는 ' + (num ? '숫자 30' : '글자 "30"') + ', tags는 글자 두 개의 목록입니다. 글자로 적어 보낸 것이 다시 객체가 되었습니다.', 'good');
    st.plus = f.plus;
    push('받는 쪽 프로그램이 읽은 객체에서 age를 꺼내 1을 더합니다(자바스크립트로 읽은 객체의 age + 1을 실행한 결과입니다). ' + (num ? 'age가 숫자 30이라서 숫자끼리의 덧셈이고, 결과는 31입니다.' : 'age가 글자 "30"이라서, +는 글자 뒤에 1을 이어 붙입니다. 결과는 글자 "301"입니다.'), num ? 'good' : 'bad');
    if (num) {
      sum.push('JSON은 객체를 글자로 적어 주고받는 약속입니다. { } 안에 "이름": 값을 쉼표로 이어 적고, 이름과 글자 값은 큰따옴표로 감싸며, 숫자는 따옴표 없이 적습니다. 받는 쪽 해석기는 이 글을 앞에서부터 읽어 객체로 만들었습니다.');
      sum.push('age의 30은 따옴표가 없어 숫자이고, 1을 더하면 31입니다. 이 글은 규칙에 한 군데도 어긋나지 않았기 때문에 읽혔습니다.');
    } else {
      sum.push('30에 큰따옴표를 붙여 "30"으로 적어도 글은 규칙에 맞아서 읽기에 성공하지만, age가 숫자가 아니라 글자가 됩니다.');
      sum.push('따옴표가 있고 없고가 값의 종류를 정합니다. 자바스크립트로 age에 1을 더하면 글자 "30" 뒤에 1이 이어 붙어 "301"이 됩니다. 글이 읽히는 것과 값이 기대한 종류인 것은 별개입니다.');
    }
    return { events: ev, summary: sum, f: f, row: ['성공', f.ageKind, f.plus] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 보낸 글을 해석기가 앞에서부터 읽는 것부터 시작합니다.'); return; }
    if (s.rows.length) H.table(v, ['해석기가 읽은 글', '뜻'], s.rows.map(function (r, i) { return { cls: '', cells: [r[0], i === s.rows.length - 1 && s.dead ? { v: r[1], cls: 'bad' } : r[1]] }; }), '읽은 글');
    H.table(v, ['항목', '값'], [
      { cls: s.read ? '' : 'gone', cells: ['읽기', s.read ? { v: s.read, cls: s.read === '성공' ? 'good' : 'bad' } : '아직'] },
      { cls: s.kind ? '' : 'gone', cells: ['읽어 낸 age의 종류', s.kind ? { v: s.kind, cls: s.kind === '읽지 못함' ? 'bad' : '' } : '아직'] },
      { cls: s.plus ? '' : 'gone', cells: ['읽은 객체의 age + 1 (자바스크립트)', s.plus ? { v: s.plus, cls: s.plus === '읽지 못함' ? 'bad' : '' } : '아직'] },
    ], '결과');
  },
  // 그림: 왼쪽에 받은 글을 줄별 상자로(지금 읽는 줄은 노랑, 읽은 줄은 초록, 어긋난 줄은 빨강), 오른쪽에 읽어서 만든 객체의 name, age, tags 칸. 읽은 줄에서 칸으로 화살표가 가고, 읽기에 실패하면 칸이 모두 비어 "만들어지지 않음"이 된다. 맨 아래는 결과 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, i;
    var texts = this.lines(c).map(function (l) { return l.replace(/^ +/, ''); });
    P.size(680, 338);
    P.region('tx', 14, 8, 312, 228, '받은 글');
    for (i = 0; i < 5; i++) P.box('l' + i, 24, 34 + i * 40, 292, 34, { cls: s ? s.ln[i] + (s.ln[i] === 'hot' ? ' now' : '') : 'plain', sub: texts[i], mono: true });
    P.region('ob', 376, 8, 290, 228, '읽어서 만든 객체');
    var ks = [['name', 'name', 44], ['age', 'age', 104], ['tags', 'tags', 164]];
    ks.forEach(function (k) {
      var val = s ? s.o[k[0]] : '', right = val || (s && s.dead ? '만들어지지 않음' : '아직');
      var cls = s && s.dead ? 'ghost' : !val ? 'ghost' : s.done ? 'good' : 'plain';
      P.box('o_' + k[0], 386, k[2], 270, 44, { cls: cls, title: k[1], right: right });
    });
    if (s) s.arr.forEach(function (a) { P.arrow('a_' + a, 'l' + { name: 1, age: 2, tags: 3 }[a] + ':r', 'o_' + a + ':l', { cls: s.done ? 'good' : 'hot' }); });
    var rd = s ? s.read : '', kd = s ? s.kind : '', pl = s ? s.plus : '';
    P.box('r1', 14, 248, 652, 36, { cls: rd === '성공' ? 'good' : rd ? 'bad' : 'ghost', title: '읽기', right: rd || '아직' });
    P.box('r2', 14, 292, 322, 36, { cls: kd === '읽지 못함' ? 'bad' : kd === '글자' ? 'hot' : kd ? 'good' : 'ghost', title: '읽어 낸 age의 종류', right: kd || '아직' });
    P.box('r3', 344, 292, 322, 36, { cls: pl === '읽지 못함' ? 'bad' : pl === '301' ? 'hot' : pl ? 'good' : 'ghost', title: '자바스크립트 age + 1', right: pl || '아직' });
  },
  assume: '해석기는 두 가지입니다. 하나는 Node.js 24.18.0의 JSON.parse(자바스크립트의 표준 해석기)이고, 다른 하나는 자바 21.0.12.1에서 돌린 Jackson 3.1.5(jackson-databind와 jackson-core)의 기본 설정, 곧 JsonMapper.builder().build()로 만든 해석기의 readTree입니다. 열여덟 가지 조합을 모두, 화면의 코드와 같은 글자(줄 끝은 \\n, 끝에 줄바꿈 없음)를 두 해석기에 그대로 넣어 실행했고, 성공과 실패 판단, 오류가 난 줄과 칸과 그 자리의 글자, 읽은 age의 종류(JSON.parse의 typeof, Jackson의 노드 종류), 읽은 이름들과 값을 모형과 대조했습니다. 두 해석기는 열여덟 조합 모두에서 성공/실패 판단이 같았고, 실패일 때는 오류 위치도 같았습니다. 실패할 때 두 해석기 모두 오류만 내고 읽은 부분을 돌려주지 않았으며, 글에 오류가 둘 이상이면 처음 만난 곳 하나만 알려 주었습니다. 오류 메시지 원문은 둘이 다르고(예: JSON.parse는 "Expected property name or \'}\' in JSON at position 4", Jackson은 "was expecting double-quote to start property name"), 화면에는 오류의 종류만 한국어로 적었습니다. 원문은 Probe 출력에 있습니다. 화면의 "자바스크립트로 읽은 객체의 age + 1"은 자바스크립트의 동작입니다. JSON.parse로 읽은 객체의 age에 1을 더한 값(typeof까지 확인했고, 숫자 30은 숫자 31, 글자 "30"은 글자 "301")이며, 자바의 동작이 아닙니다. 같은 글을 Jackson으로 읽으면 age가 글자 노드이고, 그 노드의 intValue()는 오류(JsonNodeException)를 냈으며, asInt()와 정수 필드를 가진 레코드로 읽기는 둘 다 30을 냈습니다. 이것은 Jackson의 변환 동작이어서 화면에는 쓰지 않았습니다. 일부 해석기는 설정에 따라 규칙에 어긋난 글도 받아 주는 옵션이 있습니다. 확인한 범위는 Jackson의 JsonReadFeature 세 가지(ALLOW_SINGLE_QUOTES, ALLOW_UNQUOTED_PROPERTY_NAMES, ALLOW_TRAILING_COMMA)를 켜면 작은따옴표로 감싼 이름, 따옴표 없는 이름, 마지막 값 뒤의 쉼표가 읽힌다는 것까지입니다(쉼표를 빠뜨린 글은 그래도 읽히지 않았습니다). 화면의 대조는 모두 기본 설정으로 한 것입니다. 다른 해석기와 JSON.parse의 설정은 보지 않았습니다. 주석을 넣은 글도 두 해석기가 기본 설정에서 모두 읽지 못했습니다. 문서로 확인한 것은 RFC 8259의 1절(JSON은 구조가 있는 데이터를 직렬화하는 텍스트 형식), 2절(문법. 구조 문자 둘레의 공백은 뜻이 없음), 3절(값은 객체, 배열, 숫자, 문자열 또는 false, null, true이고 이 낱말들은 소문자), 4절(객체의 문법: member를 쉼표로 이어 적고, 이름은 문자열), 5절(배열의 문법), 6절(숫자는 10진수 숫자로 적음), 7절(문자열은 따옴표로 시작하고 끝나며 따옴표는 큰따옴표 %x22 하나뿐), 9절(해석기는 문법에 맞는 글을 모두 받아야 하고, JSON이 아닌 형식을 받아 줄 수도 있음)입니다. 문서는 요약으로만 열려 원문 전체를 대조하지는 못했습니다. 마지막 쉼표와 작은따옴표가 안 된다는 말은 문서에 직접 없고, 4절과 5절의 문법에 쉼표 뒤에 값이 없는 모양과 작은따옴표 모양이 없다는 것과 위 실행 결과를 근거로 삼았습니다. 화면의 JSON은 값 네 종류 가운데 객체, 목록, 글자, 숫자만 다뤘고 true, false, null, 중첩 객체, 글자 안의 이스케이프(\\n 등)는 다루지 않았습니다. 같은 주제의 세부 동작(서버가 객체와 JSON을 서로 바꾸는 과정)은 "세부 동작 실습: REST API와 메시지 컨버터"에서 다룹니다.',
});
