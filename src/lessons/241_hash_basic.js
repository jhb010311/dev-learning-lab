Lab.register({
  id: 'hash_basic', nav: '해시', cat: '기초개념', mode: 'step', basic: true, deep: ['pwhash'],
  title: '해시는 무엇이고, 비밀번호를 왜 해시로 저장하는가',
  intro: '해시 함수는 어떤 글자를 넣든 정해진 길이의 뒤섞인 값을 내놓는 계산입니다. 코드의 sha256("pass1234")는 SHA-256이라는 해시 함수에 pass1234를 넣는 줄이고, 나오는 값은 0-9와 a-f 글자 64개입니다. 해시 함수에는 세 가지 성질이 있습니다. 같은 글자를 넣으면 언제나 같은 값이 나오고, 한 글자만 달라도 전혀 다른 값이 나오고, 나온 값에서 원래 글자를 거꾸로 계산해 낼 수 없습니다. 그래서 서버는 가입할 때 비밀번호 자체가 아니라 그 해시 값을 저장하고, 로그인할 때는 입력한 글자를 같은 방법으로 해시해서 저장된 값과 같은지만 봅니다. 이 실습은 비밀번호를 해시해서 저장하는 서버와 그대로 저장하는 서버에, 맞는 비밀번호, 한 글자 다른 비밀번호, 저장된 값 자체를 입력해 보며 로그인이 어떻게 되는지를 봅니다. (실제 서비스는 비밀번호를 SHA-256으로 저장하지 않고 전용 함수를 씁니다. 자세한 것은 아래 설명을 보세요.)',
  terms: ['해시 함수', '단방향', '비밀번호 해시 저장', '해시 함수와 솔트'],
  controls: [
    { id: 'store', label: '가입할 때 서버가 저장하는 것', type: 'select', value: 'hash', options: [['hash', '해시한 값을 저장한다: sha256("pass1234")'], ['plain', '비밀번호를 그대로 저장한다: "pass1234"']] },
    { id: 'input', label: '로그인할 때 입력하는 것', type: 'select', value: 'right', options: [['right', '로그인할 때 pass1234를 입력한다'], ['typo', '한 글자 다른 pass1235를 입력한다'], ['stolen', '저장된 값(saved)을 그대로 입력한다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '해시는 어떻게 생겼고, 로그인할 때 서버는 무엇을 견주나', d: '비밀번호를 해시해서 저장하고, 로그인할 때 입력을 같은 방법으로 해시해 견줍니다. 같은 값이라 로그인에 성공합니다.', v: { store: 'hash', input: 'right' } },
    { t: '한 글자만 다른 비밀번호를 입력하면', q: '한 글자만 다른 비밀번호를 입력하면', d: 'pass1235를 해시한 값은 pass1234의 값과 전혀 달라 로그인에 실패합니다.', v: { store: 'hash', input: 'typo' } },
    { t: '해시하지 않고 그대로 저장하면', q: '해시하지 않고 비밀번호를 그대로 저장하면', d: '로그인은 되지만, 서버에 저장된 값이 곧 비밀번호입니다.', v: { store: 'plain', input: 'right' } },
    { t: '저장된 해시 값을 입력하면', q: '저장된 해시 값을 훔쳐서 비밀번호 칸에 그대로 입력하면', d: '그 값을 또 해시하므로 저장된 값과 달라져 로그인에 실패합니다.', v: { store: 'hash', input: 'stolen' } },
    { t: '그대로 저장한 값을 입력하면', q: '그대로 저장한 서버에서 저장된 값을 훔쳐 입력하면', d: '저장된 값이 곧 비밀번호여서 그대로 로그인됩니다.', v: { store: 'plain', input: 'stolen' } },
  ],
  // 실제로 SHA-256을 계산한 값(verify/plain/HashBasicProbe.out.txt): pass1234, pass1235, 그리고 pass1234의 해시 값을 다시 해시한 값
  H1: 'bd94dcda26fccb4e68d6a31f9b5aac0b571ae266d822620e901ef7ebe3a11d4f',
  H2: '2fe9191f10fe5bd05a49355ea886e7fece20492469060faaf066dda7b533ca75',
  H3: '9277570d4006cc0fdb73af3c61fd5036ed9c626e1d6e4aec535045e353e0e0b9',
  DIFF: 61,
  NOCALC: '계산하지 않음 (입력 그대로 견줌)',
  // 값을 줄여 적는 규칙: 앞 12자와 '… (64자)'
  cut: function (v) { return v.slice(0, 12) + '… (64자)'; },
  code: function (c) {
    var h = c.store === 'hash', o = [];
    o.push(h ? '// 가입할 때: 비밀번호 자체가 아니라 해시한 값을 저장한다' : '// 가입할 때: 비밀번호를 그대로 저장한다');
    o.push(h ? 'String saved = sha256("pass1234");' : 'String saved = "pass1234";');
    o.push('', h ? '// 로그인할 때: 입력을 같은 방법으로 해시해서 저장된 값과 견준다' : '// 로그인할 때: 입력을 저장된 값과 그대로 견준다');
    o.push('String input = ' + { right: '"pass1234"', typo: '"pass1235"', stolen: 'saved' }[c.input] + ';');
    o.push(h ? 'boolean ok = sha256(input).equals(saved);' : 'boolean ok = input.equals(saved);');
    o.push('', 'System.out.println(saved);', 'System.out.println(ok);');
    return o.join('\n');
  },
  label: function (c) { return (c.store === 'hash' ? '해시한 값을 저장' : '그대로 저장') + ' · ' + { right: 'pass1234를 입력', typo: 'pass1235를 입력', stolen: '저장된 값을 입력' }[c.input]; },
  columns: ['서버에 저장된 값', '입력에서 계산한 값', '로그인'],
  simulate: function (c) {
    var ev = [], sum = [], h = c.store === 'hash', self = this;
    var HASHES = { pass1234: this.H1, pass1235: this.H2 }; HASHES[this.H1] = this.H3;
    var saved = h ? this.H1 : 'pass1234';
    var typed = { right: 'pass1234', typo: 'pass1235', stolen: saved }[c.input];
    var calc = h ? HASHES[typed] : null;
    var same = h ? calc === saved : typed === saved;
    var pre = function (v) { return v.slice(0, 12); };
    var st = { hot: '', phase: '', ar: [], inTxt: '', outTxt: '', svTxt: '', icTxt: '', cmp: '', login: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var inShow = h && c.input === 'stolen' ? pre(saved) + '…' : typed;
    var typedTxt = { right: '사용자가 비밀번호 칸에 pass1234를 입력합니다.', typo: '사용자가 비밀번호 칸에 가입 때와 한 글자 다른 pass1235를 입력합니다.', stolen: h ? '저장된 값을 훔친 사람이 비밀번호 칸에 저장된 값 64자 ' + pre(saved) + '…를 그대로 입력합니다.' : '저장된 값을 훔친 사람이 비밀번호 칸에 저장된 값 pass1234를 그대로 입력합니다.' }[c.input];
    var inLine = 'String input = ' + { right: '"pass1234"', typo: '"pass1235"', stolen: 'saved' }[c.input] + '; 줄이 실행됩니다. 이제 로그인입니다. ';

    if (h) {
      // 가입
      st.phase = 'signup'; st.hot = 'fn'; st.inTxt = 'pass1234'; st.ar = [['a1', 'hot']];
      push('String saved = sha256("pass1234"); 줄이 실행됩니다. 가입하는 순간, 서버가 사용자가 정한 비밀번호 "pass1234"를 해시 함수에 넣습니다. 해시 함수는 어떤 글자를 넣든 정해진 길이의 뒤섞인 값을 내놓는 계산이고, 여기서는 그중 SHA-256을 씁니다. sha256은 이 계산을 해 주는 도우미 메서드입니다(코드는 줄였습니다).', '');
      st.hot = 'out'; st.outTxt = this.cut(saved); st.ar = [['a1', 'mut'], ['a2', 'hot']];
      push('계산 결과로 뒤섞인 64자 값이 나옵니다. 0-9와 a-f 글자 64개이고, 앞 12자는 ' + pre(saved) + '입니다. 입력이 1글자든 100글자든 나오는 값은 언제나 64자이고, 같은 글자를 넣으면 언제 계산해도 같은 값이 나옵니다.', '');
      st.hot = 'sv'; st.svTxt = this.cut(saved); st.ar = [['a3', 'hot']];
      push('서버는 이 64자 값만 saved에 저장합니다. 원래 비밀번호 pass1234는 저장하지 않습니다. 해시 함수는 나온 값에서 원래 글자를 찾아내는 것이 현실적으로 불가능하도록 만들어진 함수여서, 저장된 값만 봐서는 pass1234를 알 수 없습니다.', '');
      // 로그인
      st.phase = 'login'; st.hot = 'in'; st.inTxt = inShow; st.outTxt = ''; st.ar = [];
      push(inLine + typedTxt, '');
      st.hot = 'fn'; st.ar = [['a1', 'hot']];
      push('sha256(input)이 실행됩니다. 서버가 입력된 글자를 가입 때와 똑같은 해시 함수에 넣습니다. 서버는 가입 때의 비밀번호를 가지고 있지 않으므로, 입력을 같은 방법으로 해시해서 저장된 값과 견주는 수밖에 없습니다.', '');
      st.hot = 'out'; st.outTxt = this.cut(calc); st.icTxt = this.cut(calc); st.ar = [['a1', 'mut'], ['a2', 'hot'], ['a4', 'hot']];
      if (c.input === 'right') push('나온 값은 ' + pre(calc) + '…로, 가입 때 pass1234에서 나온 값과 같습니다. 같은 글자를 넣으면 언제나 같은 값이 나오기 때문입니다.', '');
      else if (c.input === 'typo') push('나온 값은 ' + pre(calc) + '…입니다. pass1235는 pass1234와 한 글자만 다르지만 나온 값은 전혀 다릅니다. 64자 가운데 ' + this.DIFF + '자가 가입 때의 값과 다른 글자입니다.', '');
      else push('입력된 글자는 비밀번호가 아니라 저장된 값 64자이지만, 해시 함수에게는 그저 넣은 글자일 뿐입니다. 그 64자를 해시한 값 ' + pre(calc) + '…이 나옵니다. 해시를 한 번 더 한 값이어서 저장된 값과 다릅니다.', '');
      st.hot = 'ic'; st.ar = []; st.cmp = same ? 'same' : 'diff'; st.login = same ? '성공' : '실패';
      if (c.input === 'right') push('sha256(input).equals(saved)가 실행됩니다. 입력에서 계산한 값과 저장된 값을 견주면 같아서 ok는 true입니다. 같다는 것은 입력이 가입 때의 비밀번호와 같았다는 뜻이므로 로그인에 성공합니다. 서버는 원래 비밀번호를 저장해 두지 않았는데도, 해시 값끼리 견주는 것만으로 맞는지 확인했습니다.', 'good');
      else if (c.input === 'typo') push('sha256(input).equals(saved)가 실행됩니다. 입력에서 계산한 값과 저장된 값을 견주면 달라서 ok는 false입니다. 입력이 가입 때의 비밀번호와 같지 않았다는 뜻이므로 로그인에 실패합니다.', 'bad');
      else push('sha256(input).equals(saved)가 실행됩니다. 입력에서 계산한 값과 저장된 값을 견주면 달라서 ok는 false이고, 로그인에 실패합니다. 저장된 값을 알아도, 그 값을 비밀번호 칸에 넣는 것만으로는 로그인할 수 없습니다.', 'bad');
      st.hot = '';
      push('System.out.println(saved)가 저장된 값 64자를, System.out.println(ok)가 ' + same + '를 출력합니다.', '');
    } else {
      st.phase = 'signup'; st.hot = 'sv'; st.inTxt = 'pass1234'; st.svTxt = 'pass1234'; st.ar = [['a5', 'hot']];
      push('String saved = "pass1234"; 줄이 실행됩니다. 가입하는 순간, 서버가 사용자가 정한 비밀번호 "pass1234"를 해시 함수에 넣지 않고 그대로 saved에 저장합니다.', 'bad');
      st.phase = 'login'; st.hot = 'in'; st.inTxt = inShow; st.ar = [];
      push(inLine + typedTxt, '');
      st.hot = 'sv'; st.ar = [['a5', 'hot']]; st.icTxt = this.NOCALC; st.cmp = same ? 'same' : 'diff'; st.login = same ? '성공' : '실패';
      if (c.input === 'right') push('input.equals(saved)가 실행됩니다. 해시 함수를 쓰지 않으므로 입력한 글자를 계산 없이 그대로 저장된 값과 견주고, 같아서 ok는 true입니다. 로그인에 성공하지만, 서버에 저장된 값이 곧 비밀번호 pass1234입니다. 저장된 값을 볼 수 있는 사람은 누구나 비밀번호를 그대로 읽습니다.', 'good');
      else if (c.input === 'typo') push('input.equals(saved)가 실행됩니다. 해시 함수를 쓰지 않으므로 입력한 글자를 계산 없이 그대로 저장된 값과 견주고, 달라서 ok는 false입니다. 로그인에 실패합니다. 틀린 비밀번호를 막는 일은 해시를 쓰지 않아도 됩니다.', 'bad');
      else push('input.equals(saved)가 실행됩니다. 해시 함수를 쓰지 않으므로 입력한 글자를 계산 없이 그대로 저장된 값과 견주고, 같아서 ok는 true입니다. 저장된 값이 곧 비밀번호이므로, 훔친 값을 입력하면 진짜 비밀번호를 입력한 것과 같아 그대로 로그인됩니다.', 'bad');
      st.hot = ''; st.ar = [];
      push('System.out.println(saved)가 pass1234를, System.out.println(ok)가 ' + same + '를 출력합니다. 출력된 saved에 비밀번호가 그대로 보입니다.', 'bad');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    var tail = '이 실습은 해시의 성질을 보이려고 SHA-256을 그대로 썼습니다. 실제 비밀번호 저장에는 SHA-256이 아니라 BCrypt, Argon2 같은 비밀번호 전용 함수를 씁니다.';
    if (h && c.input === 'right') {
      sum.push('해시는 어떤 글자를 넣든 정해진 길이(SHA-256은 64자)의 뒤섞인 값을 내놓는 계산입니다. 서버는 가입 때 비밀번호 대신 그 값을 저장했고, 로그인 때는 입력을 같은 방법으로 해시해서 저장된 값과 같은지만 견주었습니다. 같은 pass1234라 같은 값이 나와 로그인에 성공했습니다.');
      sum.push('서버는 원래 비밀번호를 저장하지 않았고, 견주는 데 필요하지도 않았습니다. 저장된 값이 새어 나가도 그 값에서 pass1234를 거꾸로 계산해 낼 방법은 알려져 있지 않습니다.');
    } else if (h && c.input === 'typo') {
      sum.push('한 글자만 다른 비밀번호를 입력하면 해시한 값이 전혀 달라져 로그인에 실패합니다. pass1235의 값은 저장된 값과 64자 가운데 ' + this.DIFF + '자가 다릅니다.');
      sum.push('한 글자가 달라도 비슷한 값이 나오는 것이 아니라 전혀 다른 값이 나오므로, 서버는 두 값이 같은지 다른지만 확인하면 됩니다. 이 확인에 원래 비밀번호는 필요하지 않습니다.');
    } else if (h) {
      sum.push('저장된 해시 값을 훔쳐서 비밀번호 칸에 그대로 입력해도 로그인되지 않습니다. 서버는 입력을 언제나 비밀번호로 보고 해시하므로, 해시를 한 번 더 한 값이 나와 저장된 값과 달라집니다.');
      sum.push('저장된 값이 새어 나가도 그 값으로는 로그인할 수 없고, 값에서 원래 비밀번호가 보이지도 않습니다. 같은 일이 비밀번호를 그대로 저장한 서버에서는 어떻게 되는지 비교해 보세요.');
    } else if (c.input === 'right') {
      sum.push('해시하지 않고 비밀번호를 그대로 저장하면 서버에 저장된 값이 곧 비밀번호입니다. 로그인은 성공했지만, 저장된 값을 볼 수 있는 사람(운영자, 저장된 값을 훔친 사람)은 누구나 pass1234를 그대로 읽습니다.');
      sum.push('로그인이 되는 것만으로는 안전한지 알 수 없습니다. 해시로 저장하면 로그인은 똑같이 되면서, 저장된 값에는 비밀번호가 담기지 않습니다.');
    } else if (c.input === 'typo') {
      sum.push('그대로 저장해도 한 글자 다른 비밀번호는 로그인에 실패합니다. 틀린 비밀번호를 막는 일은 저장 방법과 상관없이 됩니다.');
      sum.push('저장 방법이 달라지는 것은 로그인이 아니라 저장된 값이 새어 나갔을 때입니다. 저장된 값을 입력하는 설정으로 바꿔 비교해 보세요.');
    } else {
      sum.push('그대로 저장한 서버에서 저장된 값을 훔쳐 비밀번호 칸에 입력하면 그대로 로그인됩니다. 저장된 값이 곧 비밀번호이기 때문입니다.');
      sum.push('해시로 저장한 서버에서는 같은 입력이 실패합니다. 서버가 입력을 한 번 더 해시해서, 저장된 값과 다른 값이 되기 때문입니다.');
    }
    if (h) sum.push(tail);
    var sv = h ? this.cut(saved) : saved;
    return { events: ev, summary: sum, row: [sv, h ? this.cut(calc) : this.NOCALC, same ? '성공' : '실패'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 가입을 받는 것부터 시작합니다.'); return; }
    var rows = [];
    if (s.svTxt) rows.push({ cls: '', cells: ['서버에 저장된 값', s.svTxt] });
    if (s.icTxt) rows.push({ cls: '', cells: ['입력에서 계산한 값', s.icTxt] });
    if (s.login) rows.push({ cls: '', cells: ['로그인', { v: s.login, cls: s.login === '성공' ? 'good' : 'bad' }] });
    if (rows.length) H.table(v, ['항목', '값'], rows, '가입과 로그인');
  },
  // 그림: 위쪽에 입력 글자 → 해시 함수(한쪽 방향 화살표만) → 나온 값, 아래쪽에 서버에 저장된 값과 입력에서 계산한 값을 나란히 두고 같음/다름을 표시한다. 맨 아래는 로그인 결과 칸. 그대로 저장하면 해시 함수 상자가 점선이 되고 저장된 칸에 비밀번호가 그대로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, h = c.store === 'hash', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 262);
    var hot = s ? s.hot : '';
    P.box('in', 14, 16, 134, 78, { cls: hot === 'in' ? 'hot now' : 'plain', title: '입력 글자', sub: s && s.inTxt ? s.inTxt : '아직 없음' });
    P.box('fn', 204, 16, 156, 78, { cls: !h ? 'ghost' : hot === 'fn' ? 'hot now' : 'plain', title: '해시 함수', sub: h ? ['SHA-256', '글자 → 값만 가능'] : '쓰지 않음' });
    P.box('out', 416, 16, 250, 78, { cls: !h ? 'ghost' : hot === 'out' ? 'hot now' : 'plain', title: '나온 값', sub: !h ? '계산하지 않음' : s && s.outTxt ? s.outTxt : '아직 없음' });
    var mark = s && s.cmp ? (s.cmp === 'same' ? '같음' : '다름') : '';
    P.box('sv', 14, 130, 300, 62, { cls: !h && s && s.svTxt ? 'bad' : hot === 'sv' ? 'hot now' : 'plain', title: '서버에 저장된 값', right: !h ? mark : '', sub: s && s.svTxt ? s.svTxt : '아직 없음' });
    P.box('ic', 334, 130, 332, 62, { cls: !h ? 'ghost' : s && s.cmp ? (s.cmp === 'same' ? 'good' : 'bad') : hot === 'ic' ? 'hot now' : 'plain', title: '입력에서 계산한 값', right: h ? mark : '', sub: !h ? '계산하지 않음 (입력 그대로 견줌)' : s && s.icTxt ? s.icTxt : '아직 없음' });
    P.box('lg', 14, 212, 652, 40, { cls: s && s.login ? (s.login === '성공' ? 'good' : 'bad') : 'ghost', title: '로그인', right: s ? s.login : '' });
    var ar = s ? s.ar : [];
    ar.forEach(function (a) {
      var id = a[0], cl = a[1];
      if (id === 'a1') P.arrow('a1', 'in:r', 'fn:l', { cls: cl });
      else if (id === 'a2') P.arrow('a2', 'fn:r', 'out:l', { cls: cl });
      else if (id === 'a3') P.arrow('a3', 'out:b:0.1', 'sv:t:0.9', { cls: cl });
      else if (id === 'a4') P.arrow('a4', 'out:b:0.4', 'ic:t:0.5', { cls: cl });
      else if (id === 'a5') P.arrow('a5', 'in:b:0.5', 'sv:t:0.2', { cls: cl });
    });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 여섯 가지 조합을 모두, 화면의 코드를 import 줄, sha256 도우미 메서드, main 메서드의 틀로 감싼 소스로 만들어 javax.tools로 컴파일하고 새 클래스 로더로 읽어 Main.main을 실행했습니다. 화면에는 import, main, sha256 메서드를 줄였고, 줄인 sha256 메서드는 MessageDigest로 SHA-256을 계산해 소문자 16진수 글자 64개로 바꿉니다. 대조한 것은 화면의 코드가 실행한 소스의 그 부분과 같은 글인지, 프로그램이 출력한 saved와 ok, 입력에서 계산한 값(컴파일한 Main의 sha256 메서드를 입력에 대해 불러 얻었습니다)입니다. 결과 표의 값은 저장된 값과 입력에서 계산한 값의 앞 12자와 "… (64자)"로 줄여 적었고, 줄이기 전의 값 전체도 같은 방식으로 대조했습니다. 비밀번호를 그대로 저장하는 쪽에서 계산이 일어나지 않는다는 것은 그 코드에 sha256 호출이 없는 것으로 확인했습니다. 계산이 표준대로인지는 SHA-256의 표준 예시 두 가지(메시지 "abc"와 56글자 메시지)를 자바로 계산해 문서의 값과 견주었고, "abc"의 값은 NIST의 SHA-256 예시 문서와 RFC 6234의 시험 벡터에서, 56글자 메시지의 값은 NIST의 예시 문서에서 확인했습니다. 같은 8가지 입력(빈 글자, 1글자, 100글자 포함)을 Node.js의 crypto와 이 PC의 openssl dgst -sha256으로도 계산해 세 구현의 값이 모두 같은 것을 확인했습니다. 단계 문장이 기대는 사실도 따로 재었습니다. 같은 입력을 두 번 해시하면 같은 값이고, pass1234와 pass1235의 해시는 64자 가운데 61자가 다르며(이 입력에서 관찰한 값입니다), 입력이 0글자, 1글자, 100글자여도 결과는 64자입니다. 문서는 직접 열어 확인했습니다. NIST FIPS 180-4(Secure Hash Standard)는 1절에서 SHA-256 등을 반복 계산하는 단방향 해시 함수로, 입력(메시지)에서 메시지 다이제스트라는 압축된 값을 만든다고 하고 메시지가 조금이라도 바뀌면 매우 높은 확률로 다른 다이제스트가 나온다고 하며, 1절의 표는 SHA-256의 다이제스트 크기를 256비트(16진수 64자)로 정했고, 문서 앞머리의 설명은 주어진 다이제스트에 맞는 메시지를 찾는 것과 같은 다이제스트를 내는 두 메시지를 찾는 것이 계산상 불가능하다는 뜻으로 "안전한" 해시 알고리즘이라 부른다고 말합니다. OWASP의 Password Storage Cheat Sheet는 비밀번호를 평문으로 저장하지 말고 해시해서 저장하라고 하고, 해시는 한 방향 함수라서 원래 비밀번호로 되돌릴 수 없다고 하며(암호화가 아니라 해시), 약하고 흔한 비밀번호는 흔한 비밀번호 목록이나 모든 후보를 하나씩 넣어 보는 방법으로 찾아질 수 있다고 합니다. 이 실습에서 "거꾸로 계산해 낼 수 없다"는 것은 수학적으로 증명된 것이 아니라 현실적으로 알려진 방법이 없다는 뜻이고, 짧고 흔한 비밀번호는 후보를 하나씩 해시해서 저장된 값과 견주는 방법으로 찾아질 수 있습니다. 이 실습은 해시의 성질을 보이려고 빠른 범용 해시 함수 SHA-256을 그대로 썼습니다. 실제 서비스에서 비밀번호를 저장할 때는 SHA-256을 그대로 쓰지 않고, 일부러 느리게 만들고 사용자마다 다른 값(솔트)을 섞는 비밀번호 전용 함수(BCrypt, Argon2 등)를 씁니다. OWASP 문서도 SHA-256 같은 빠른 해시 알고리즘은 비밀번호 저장에 맞지 않다고 하고, Argon2id를 먼저 권하고, 그것을 쓸 수 없을 때의 scrypt, 오래된 시스템의 bcrypt, FIPS 인증이 필요할 때의 PBKDF2를 들며, 사용자마다 고유한 솔트를 더하라고 합니다. 그 이유와 동작은 "세부 동작 실습: 비밀번호 해시"에서 다룹니다. 화면의 코드는 가입과 로그인을 한 번의 실행 안에 이어 적은 것입니다. 실제 서비스에서는 가입과 로그인이 서로 다른 요청이고 saved는 DB에 보관되며, 서버가 사용자가 입력한 비밀번호 글자를 받아 해시한다고 가정했습니다. 입력을 사용자의 기기에서 미리 해시하는 방식, 해시 값을 직접 비교할 때의 시간차 공격, 솔트와 느린 해시, 해시 충돌은 다루지 않았습니다. 이 실습의 해시 함수는 암호용 해시 함수이고, HashMap의 해시 코드와는 쓰임이 다릅니다.',
});
