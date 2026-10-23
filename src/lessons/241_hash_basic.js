Lab.register({
  id: 'hash_basic', nav: '해시', cat: '기초개념', mode: 'step', basic: true, deep: ['pwhash'],
  title: '해시는 무엇이고, 비밀번호를 왜 해시로 저장하는가',
  why: '비밀번호를 그대로 저장하면, DB가 새어 나가거나 관리자가 들여다보는 순간 모든 회원의 비밀번호가 드러나고, 같은 비밀번호를 쓰는 다른 사이트까지 위험해진다. 비밀번호를 해시로 저장하면 서버는 원래 비밀번호를 저장해 두지 않고도 "입력한 것이 맞는가"만 확인할 수 있고, 저장된 값을 훔쳐도 그 값으로 바로 로그인하지 못한다.',
  use: '회원 가입과 로그인이 있는 서비스는 비밀번호를 해시해서 저장하는 것이 기본이다. 스프링으로 만든 서비스는 스프링 시큐리티가 주는 PasswordEncoder(흔히 BCryptPasswordEncoder)의 encode로 저장할 값을 만들고, 로그인할 때 matches로 확인한다. SHA-256처럼 빨리 계산되는 해시는 자바가 주는 MessageDigest로 계산하며, 내려받은 파일이 중간에 바뀌지 않았는지 확인할 때 쓴다.',
  intro: '해시 함수는 어떤 글자를 넣든 정해진 길이의 뒤섞인 값을 내놓는 계산입니다. 같은 글자를 넣으면 같은 값이 나오고, 한 글자만 달라도 전혀 다른 값이 나오고, 나온 값에서 원래 글자를 거꾸로 계산해 낼 수 없습니다. 그래서 서버는 가입할 때 비밀번호 자체가 아니라 해시한 값을 저장하고, 로그인할 때는 입력한 글자가 그 값과 맞는지만 확인합니다. 스프링으로 만든 서비스에서는 이 일을 스프링 시큐리티가 주는 PasswordEncoder가 합니다. 코드의 encoder.encode("pass1234")가 저장할 값을 만들고, encoder.matches(input, saved)가 입력이 맞는지 확인합니다. PasswordEncoder는 인터페이스이고, 여기서는 BCrypt라는 비밀번호 전용 해시로 구현한 BCryptPasswordEncoder를 씁니다. encode는 할 때마다 무작위 값(솔트)을 새로 만들어 비밀번호와 함께 계산하므로, 같은 pass1234도 encode할 때마다 다른 값이 나옵니다. 비교용으로 자바가 주는 MessageDigest로 SHA-256을 직접 계산해 저장하는 코드와, 비밀번호를 그대로 저장하는 코드도 둡니다. 세 가지 저장 방법에 맞는 비밀번호, 한 글자 다른 비밀번호, 저장된 값 자체를 입력해 보며 로그인이 어떻게 되는지를 봅니다. (saved, input, ok는 이 실습에서 지은 변수 이름입니다.)',
  terms: ['해시 함수', '단방향', 'PasswordEncoder', 'bcrypt', '솔트', 'MessageDigest', '비밀번호 해시 저장'],
  controls: [
    { id: 'store', label: '가입할 때 서버가 저장하는 것', type: 'select', value: 'bcrypt', options: [['bcrypt', 'PasswordEncoder가 만든 값을 저장한다: encoder.encode("pass1234")'], ['sha', 'SHA-256을 직접 계산한 값을 저장한다: MessageDigest'], ['plain', '비밀번호를 그대로 저장한다: "pass1234"']] },
    { id: 'input', label: '로그인할 때 입력하는 것', type: 'select', value: 'right', options: [['right', 'pass1234를 입력한다'], ['typo', '한 글자 다른 pass1235를 입력한다'], ['stolen', '저장된 값(saved)을 그대로 입력한다'], ['eq', 'pass1234를 입력하고, matches 대신 다시 encode해 equals로 견준다']], hint: 'equals로 견주는 선택은 PasswordEncoder로 저장할 때만 고를 수 있어서, 다른 저장 방법에서는 pass1234를 입력하는 것으로 바뀝니다.' },
  ],
  // matches 대신 encode와 equals로 견주는 선택은 PasswordEncoder로 저장할 때만 있다
  fix: function (c) { return c.store !== 'bcrypt' && c.input === 'eq' ? { input: 'right' } : null; },
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'PasswordEncoder는 비밀번호를 어떤 값으로 저장하고, 로그인할 때 무엇으로 확인하나', d: 'encode가 $2a$10$로 시작하는 60자 값을 만들어 저장하고, 로그인할 때 matches가 입력이 그 값과 맞는지 확인합니다. 맞는 비밀번호라 true입니다.', v: { store: 'bcrypt', input: 'right' } },
    { t: '한 글자만 다른 비밀번호를 입력하면', q: '한 글자만 다른 비밀번호를 입력하면', d: 'matches가 false를 돌려주어 로그인에 실패합니다.', v: { store: 'bcrypt', input: 'typo' } },
    { t: '다시 encode해서 equals로 견주면', q: '맞는 비밀번호를 다시 encode해서 저장된 값과 equals로 견주면', d: 'encode는 할 때마다 솔트를 새로 만들어 다른 값을 내므로, 맞는 비밀번호인데도 false가 나옵니다. 저장된 값과 견주는 일은 matches로 합니다.', v: { store: 'bcrypt', input: 'eq' } },
    { t: '저장된 값을 입력하면', q: '저장된 값을 훔쳐서 비밀번호 칸에 그대로 입력하면', d: 'matches는 입력을 비밀번호로 보고 계산하므로, 저장된 값과 달라져 로그인에 실패합니다.', v: { store: 'bcrypt', input: 'stolen' } },
    { t: 'SHA-256을 직접 계산해 저장하면', q: 'MessageDigest로 SHA-256을 직접 계산해 저장하고 견주면', d: '솔트가 없어 같은 글자는 언제 계산해도 같은 64자 값입니다. 그래서 다시 계산해 equals로 견주면 되지만, 같은 비밀번호를 쓰는 회원은 저장된 값도 같습니다.', v: { store: 'sha', input: 'right' } },
    { t: 'SHA-256에 한 글자 다른 비밀번호를 넣으면', q: 'SHA-256에 한 글자만 다른 비밀번호를 넣으면 값이 얼마나 달라지나', d: 'pass1235의 값은 pass1234의 값과 64자 가운데 61자가 다릅니다.', v: { store: 'sha', input: 'typo' } },
    { t: '그대로 저장한 값을 입력하면', q: '비밀번호를 그대로 저장한 서버에서 저장된 값을 훔쳐 입력하면', d: '저장된 값이 곧 비밀번호여서 그대로 로그인됩니다.', v: { store: 'plain', input: 'stolen' } },
  ],
  // 실제로 계산한 값(verify/spring/hash_basic_probe.out.txt)
  // H1~H3: MessageDigest SHA-256. pass1234, pass1235, 그리고 pass1234의 해시 값(64자)을 다시 해시한 값
  H1: 'bd94dcda26fccb4e68d6a31f9b5aac0b571ae266d822620e901ef7ebe3a11d4f',
  H2: '2fe9191f10fe5bd05a49355ea886e7fece20492469060faaf066dda7b533ca75',
  H3: '9277570d4006cc0fdb73af3c61fd5036ed9c626e1d6e4aec535045e353e0e0b9',
  DIFF: 61,
  // B1, B2: BCryptPasswordEncoder의 encode("pass1234")가 두 번 낸 값(한 번 실행했을 때의 예. 실행할 때마다 다르다)
  // BT, BS: matches가 B1의 솔트로 pass1235를, B1 자체를 계산한 값(BCrypt.hashpw(입력, B1))
  B1: '$2a$10$rlL85YF/J1.aZXD3Bv0GWekFKyqt/OrhKPdwFShdqxkvr3HaDO/4a',
  B2: '$2a$10$laSZMbdPIh0qEtYaXA19HuvcwaklZXp9twjqx7wtIxD0CjCSIX292',
  BT: '$2a$10$rlL85YF/J1.aZXD3Bv0GWe57kzrc.cLrmJiyqWAgsrQm8vcC5LxEO',
  BS: '$2a$10$rlL85YF/J1.aZXD3Bv0GWe1Do6FD0JqXXGbY9gy2w5leOK2rvu5ra',
  NOCALC: '계산하지 않음 (입력 그대로 견줌)',
  // 값을 줄여 적는 규칙. SHA-256: 앞 12자와 '… (64자)', BCrypt: 앞 11자(표시, cost, 솔트 앞 4자)와 끝 6자, '(60자)'
  cut: function (v) { return v.slice(0, 12) + '… (64자)'; },
  cutB: function (v) { return v.slice(0, 11) + '…' + v.slice(-6) + ' (60자)'; },
  code: function (c) {
    c = Object.assign({}, c, this.fix(c));
    var o = [], inExpr = { right: '"pass1234"', typo: '"pass1235"', stolen: 'saved', eq: '"pass1234"' }[c.input];
    o.push('// main 메서드 안의 줄만 보임 (import 줄과 클래스·main 선언은 생략)');
    if (c.store === 'bcrypt') {
      o.push('PasswordEncoder encoder = new BCryptPasswordEncoder();', '');
      o.push('// 가입할 때: encode가 비밀번호를 해시한 값을 저장한다', 'String saved = encoder.encode("pass1234");', '');
      if (c.input === 'eq') o.push('// 로그인할 때: 입력을 다시 encode해서 equals로 견준다 (잘못 쓴 예)', 'String input = "pass1234";', 'boolean ok = encoder.encode(input).equals(saved);');
      else o.push('// 로그인할 때: 입력한 글자와 저장된 값을 matches에 넘겨 견준다', 'String input = ' + inExpr + ';', 'boolean ok = encoder.matches(input, saved);');
    } else if (c.store === 'sha') {
      o.push('MessageDigest md = MessageDigest.getInstance("SHA-256");', 'HexFormat hex = HexFormat.of();', '');
      o.push('// 가입할 때: 비밀번호를 SHA-256으로 해시한 값을 16진수 글자로 바꿔 저장한다', 'String saved = hex.formatHex(md.digest("pass1234".getBytes(StandardCharsets.UTF_8)));', '');
      o.push('// 로그인할 때: 입력을 같은 방법으로 해시해서 저장된 값과 equals로 견준다', 'String input = ' + inExpr + ';', 'String calc = hex.formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));', 'boolean ok = calc.equals(saved);');
    } else {
      o.push('// 가입할 때: 비밀번호를 그대로 저장한다', 'String saved = "pass1234";', '');
      o.push('// 로그인할 때: 입력을 저장된 값과 그대로 equals로 견준다', 'String input = ' + inExpr + ';', 'boolean ok = input.equals(saved);');
    }
    o.push('', 'System.out.println(saved);', 'System.out.println(ok);');
    return o.join('\n');
  },
  label: function (c) { return { bcrypt: 'PasswordEncoder로 저장', sha: 'SHA-256으로 저장', plain: '그대로 저장' }[c.store] + ' · ' + { right: 'pass1234를 입력', typo: 'pass1235를 입력', stolen: '저장된 값을 입력', eq: '다시 encode해 equals' }[c.input]; },
  columns: ['서버에 저장된 값', '입력에서 계산한 값', '로그인'],
  simulate: function (c) {
    c = Object.assign({}, c, this.fix(c));
    var ev = [], sum = [], self = this, S = c.store;
    var typed, saved, calc, same;
    var st = { hot: '', phase: '', fn: '', ar: [], inTxt: '', outTxt: '', svTxt: '', icTxt: '', cmp: '', login: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var inLine = 'String input = ' + { right: '"pass1234"', typo: '"pass1235"', stolen: 'saved', eq: '"pass1234"' }[c.input] + '; 줄이 실행됩니다. 이제 로그인입니다. ';
    var pre = function (v) { return v.slice(0, 12); };

    if (S === 'bcrypt') {
      saved = this.B1;
      typed = { right: 'pass1234', typo: 'pass1235', stolen: saved, eq: 'pass1234' }[c.input];
      calc = { right: this.B1, typo: this.BT, stolen: this.BS, eq: this.B2 }[c.input];
      same = calc === saved;
      var typedB = { right: '사용자가 비밀번호 칸에 pass1234를 입력합니다.', typo: '사용자가 비밀번호 칸에 가입 때와 한 글자 다른 pass1235를 입력합니다.', stolen: '저장된 값을 훔친 사람이 비밀번호 칸에 저장된 값 60자를 그대로 입력합니다.', eq: '사용자가 비밀번호 칸에 가입 때와 같은 pass1234를 입력합니다.' }[c.input];
      // 가입
      st.phase = 'signup'; st.hot = 'fn'; st.fn = 'enc'; st.ar = [];
      push('PasswordEncoder encoder = new BCryptPasswordEncoder(); 줄이 실행됩니다. 변수 encoder의 타입은 PasswordEncoder이고, 값은 BCryptPasswordEncoder 객체입니다. PasswordEncoder는 스프링 시큐리티가 주는 인터페이스이고, BCryptPasswordEncoder는 그것을 BCrypt라는 비밀번호 전용 해시로 구현한, 역시 스프링 시큐리티가 주는 클래스입니다.', '');
      st.inTxt = 'pass1234'; st.ar = [['a1', 'hot']];
      push('String saved = encoder.encode("pass1234"); 줄이 실행됩니다. 가입하는 순간, encode가 사용자가 정한 비밀번호 pass1234를 받습니다. encode는 먼저 무작위 값(솔트)을 새로 만들고, 그 솔트와 비밀번호를 함께 BCrypt로 계산합니다. BCrypt는 일부러 계산을 여러 번 되풀이해 느리게 만든 해시입니다.', '');
      st.hot = 'out'; st.outTxt = this.cutB(saved); st.ar = [['a1', 'mut'], ['a2', 'hot']];
      push('나온 값은 60자이고 $2a$10$로 시작합니다. $2a$는 BCrypt로 만든 값이라는 표시, 10은 계산을 얼마나 되풀이할지 정하는 cost 값이고, 그 뒤 22자가 솔트, 나머지 31자가 해시 결과입니다. 이번 실행에서 나온 값은 ' + saved + '입니다. 솔트를 매번 새로 만들므로 실행할 때마다 다른 값이 나옵니다.', '');
      st.hot = 'sv'; st.svTxt = this.cutB(saved); st.ar = [['a3', 'hot']];
      push('서버는 이 60자 값만 saved에 저장합니다. 원래 비밀번호 pass1234는 저장하지 않습니다. 솔트는 이 값의 앞부분에 적혀 있으므로 따로 저장하지 않습니다.', '');
      // 로그인
      st.phase = 'login'; st.hot = 'in'; st.inTxt = c.input === 'stolen' ? saved.slice(0, 11) + '…' : typed; st.outTxt = ''; st.ar = [];
      push(inLine + typedB, '');
      if (c.input === 'eq') {
        st.hot = 'fn'; st.fn = 'enc'; st.ar = [['a1', 'hot']];
        push('encoder.encode(input)이 실행됩니다. encode는 가입 때와 마찬가지로 솔트를 새로 만들어 계산합니다. 가입 때의 솔트는 쓰지 않습니다.', '');
        st.hot = 'out'; st.outTxt = this.cutB(calc); st.icTxt = this.cutB(calc); st.ar = [['a1', 'mut'], ['a2', 'hot'], ['a4', 'hot']];
        push('나온 값은 ' + calc + '입니다. 같은 pass1234인데도 솔트가 달라서, 앞의 $2a$10$ 말고는 saved와 전혀 다른 60자가 나왔습니다.', '');
        st.hot = 'ic'; st.ar = []; st.cmp = 'diff'; st.login = '실패';
        push('.equals(saved)가 두 값을 견주면 달라서 ok는 false입니다. 맞는 비밀번호를 넣었는데도 로그인에 실패합니다. 저장된 값과 견주는 일은 equals가 아니라 matches로 해야 합니다.', 'bad');
      } else {
        st.hot = 'fn'; st.fn = 'match'; st.ar = [['a1', 'hot'], ['a6', 'hot']];
        push('encoder.matches(input, saved)가 실행됩니다. matches는 saved의 앞부분에서 cost와 솔트를 읽고, 입력한 글자를 가입 때와 같은 솔트로 BCrypt 계산합니다. 솔트를 새로 만들지 않는 것이 encode와 다른 점입니다.', '');
        st.hot = 'out'; st.outTxt = this.cutB(calc); st.icTxt = this.cutB(calc); st.ar = [['a1', 'mut'], ['a6', 'mut'], ['a2', 'hot'], ['a4', 'hot']];
        if (c.input === 'right') push('계산한 값은 saved와 똑같은 60자입니다. 같은 비밀번호를 같은 솔트로 계산했기 때문입니다.', '');
        else if (c.input === 'typo') push('계산한 값은 앞 29자(표시, cost, 솔트)가 saved와 같지만, 뒤 31자 해시 결과가 다릅니다. 같은 솔트로 계산해도 비밀번호가 한 글자 다르면 해시 결과가 달라집니다.', '');
        else push('입력된 글자는 비밀번호가 아니라 저장된 값 60자이지만, matches에게는 그저 입력한 비밀번호일 뿐입니다. 그 60자를 같은 솔트로 계산한 값은 뒤 31자가 saved와 다릅니다.', '');
        st.hot = 'ic'; st.ar = []; st.cmp = same ? 'same' : 'diff'; st.login = same ? '성공' : '실패';
        if (c.input === 'right') push('matches가 계산한 값과 saved를 견주어 같으므로 true를 돌려주고, ok는 true입니다. 로그인에 성공합니다. matches는 계산한 값을 돌려주지 않고 맞는지(true나 false)만 돌려줍니다. 서버는 원래 비밀번호를 저장해 두지 않았는데도 맞는지 확인했습니다.', 'good');
        else if (c.input === 'typo') push('matches가 계산한 값과 saved를 견주어 다르므로 false를 돌려주고, ok는 false입니다. 입력이 가입 때의 비밀번호와 같지 않았다는 뜻이므로 로그인에 실패합니다.', 'bad');
        else push('matches가 계산한 값과 saved를 견주어 다르므로 false를 돌려주고, ok는 false입니다. 저장된 값을 알아도, 그 값을 비밀번호 칸에 넣는 것만으로는 로그인할 수 없습니다.', 'bad');
      }
      st.hot = '';
      push('System.out.println(saved)가 저장된 값 60자를, System.out.println(ok)가 ' + same + '를 출력합니다. 다시 실행하면 saved는 다른 60자로 출력되지만 ok는 같습니다.', '');
    } else if (S === 'sha') {
      var HASHES = { pass1234: this.H1, pass1235: this.H2 }; HASHES[this.H1] = this.H3;
      saved = this.H1;
      typed = { right: 'pass1234', typo: 'pass1235', stolen: saved }[c.input];
      calc = HASHES[typed]; same = calc === saved;
      var typedS = { right: '사용자가 비밀번호 칸에 pass1234를 입력합니다.', typo: '사용자가 비밀번호 칸에 가입 때와 한 글자 다른 pass1235를 입력합니다.', stolen: '저장된 값을 훔친 사람이 비밀번호 칸에 저장된 값 64자 ' + pre(saved) + '…를 그대로 입력합니다.' }[c.input];
      st.phase = 'signup'; st.hot = 'fn'; st.fn = 'sha'; st.ar = [];
      push('MessageDigest md = MessageDigest.getInstance("SHA-256"); 줄이 실행됩니다. MessageDigest는 자바가 주는 해시 계산 클래스이고, getInstance("SHA-256")은 SHA-256으로 계산하는 객체를 돌려줍니다. 다음 줄의 HexFormat도 자바가 주는 클래스로, 계산 결과인 바이트 32개를 0-9와 a-f 글자로 바꾸는 데 씁니다.', '');
      st.inTxt = 'pass1234'; st.ar = [['a1', 'hot']];
      push('String saved = hex.formatHex(md.digest("pass1234".getBytes(StandardCharsets.UTF_8))); 줄이 실행됩니다. 가장 깊은 괄호부터 읽습니다. getBytes가 글자 pass1234를 바이트로 바꾸고, md.digest가 그 바이트를 SHA-256으로 계산해 바이트 32개를 돌려주고, hex.formatHex가 그것을 글자 64개로 바꿉니다.', '');
      st.hot = 'out'; st.outTxt = this.cut(saved); st.ar = [['a1', 'mut'], ['a2', 'hot']];
      push('나온 값은 0-9와 a-f 글자 64개이고, 앞 12자는 ' + pre(saved) + '입니다. 입력이 1글자든 100글자든 나오는 값은 64자입니다. SHA-256은 솔트를 섞지 않으므로, 같은 글자를 넣으면 언제 계산해도 같은 값이 나옵니다.', '');
      st.hot = 'sv'; st.svTxt = this.cut(saved); st.ar = [['a3', 'hot']];
      push('서버는 이 64자 값만 saved에 저장합니다. 원래 비밀번호 pass1234는 저장하지 않습니다.', '');
      st.phase = 'login'; st.hot = 'in'; st.inTxt = c.input === 'stolen' ? pre(saved) + '…' : typed; st.outTxt = ''; st.ar = [];
      push(inLine + typedS, '');
      st.hot = 'fn'; st.ar = [['a1', 'hot']];
      push('String calc = hex.formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8))); 줄이 실행됩니다. 입력한 글자를 가입 때와 똑같은 방법으로 계산합니다.', '');
      st.hot = 'out'; st.outTxt = this.cut(calc); st.icTxt = this.cut(calc); st.ar = [['a1', 'mut'], ['a2', 'hot'], ['a4', 'hot']];
      if (c.input === 'right') push('나온 값은 ' + pre(calc) + '…로, 가입 때 pass1234에서 나온 값과 같습니다. 같은 글자를 넣으면 언제나 같은 값이 나오기 때문입니다.', '');
      else if (c.input === 'typo') push('나온 값은 ' + pre(calc) + '…입니다. pass1235는 pass1234와 한 글자만 다르지만 나온 값은 전혀 다릅니다. 64자 가운데 ' + this.DIFF + '자가 가입 때의 값과 다른 글자입니다.', '');
      else push('입력된 글자는 비밀번호가 아니라 저장된 값 64자이지만, 계산하는 쪽에게는 그저 넣은 글자일 뿐입니다. 그 64자를 해시한 값 ' + pre(calc) + '…이 나옵니다. 해시를 한 번 더 한 값이어서 저장된 값과 다릅니다.', '');
      st.hot = 'ic'; st.ar = []; st.cmp = same ? 'same' : 'diff'; st.login = same ? '성공' : '실패';
      if (c.input === 'right') push('calc.equals(saved)가 실행됩니다. 두 값이 같아서 ok는 true이고, 로그인에 성공합니다. SHA-256은 솔트가 없으므로 다시 계산한 값을 equals로 견주면 됩니다. 대신 같은 비밀번호를 쓰는 회원은 저장된 값도 똑같습니다.', 'good');
      else if (c.input === 'typo') push('calc.equals(saved)가 실행됩니다. 두 값이 달라서 ok는 false이고, 로그인에 실패합니다.', 'bad');
      else push('calc.equals(saved)가 실행됩니다. 두 값이 달라서 ok는 false이고, 로그인에 실패합니다. 저장된 값을 알아도, 그 값을 비밀번호 칸에 넣는 것만으로는 로그인할 수 없습니다.', 'bad');
      st.hot = '';
      push('System.out.println(saved)가 저장된 값 64자를, System.out.println(ok)가 ' + same + '를 출력합니다. 다시 실행해도 saved는 같은 64자로 출력됩니다.', '');
    } else {
      saved = 'pass1234';
      typed = { right: 'pass1234', typo: 'pass1235', stolen: saved }[c.input];
      same = typed === saved;
      var typedP = { right: '사용자가 비밀번호 칸에 pass1234를 입력합니다.', typo: '사용자가 비밀번호 칸에 가입 때와 한 글자 다른 pass1235를 입력합니다.', stolen: '저장된 값을 훔친 사람이 비밀번호 칸에 저장된 값 pass1234를 그대로 입력합니다.' }[c.input];
      st.phase = 'signup'; st.hot = 'sv'; st.inTxt = 'pass1234'; st.svTxt = 'pass1234'; st.ar = [['a5', 'hot']];
      push('String saved = "pass1234"; 줄이 실행됩니다. 가입하는 순간, 서버가 사용자가 정한 비밀번호 pass1234를 해시하지 않고 그대로 saved에 저장합니다.', 'bad');
      st.phase = 'login'; st.hot = 'in'; st.inTxt = typed; st.ar = [];
      push(inLine + typedP, '');
      st.hot = 'sv'; st.ar = [['a5', 'hot']]; st.icTxt = this.NOCALC; st.cmp = same ? 'same' : 'diff'; st.login = same ? '성공' : '실패';
      if (c.input === 'right') push('input.equals(saved)가 실행됩니다. 해시하지 않으므로 입력한 글자를 계산 없이 그대로 저장된 값과 견주고, 같아서 ok는 true입니다. 로그인에 성공하지만, 서버에 저장된 값이 곧 비밀번호 pass1234입니다. 저장된 값을 볼 수 있는 사람은 누구나 비밀번호를 그대로 읽습니다.', 'good');
      else if (c.input === 'typo') push('input.equals(saved)가 실행됩니다. 해시하지 않으므로 입력한 글자를 계산 없이 그대로 저장된 값과 견주고, 달라서 ok는 false입니다. 로그인에 실패합니다. 틀린 비밀번호를 막는 일은 해시를 쓰지 않아도 됩니다.', 'bad');
      else push('input.equals(saved)가 실행됩니다. 해시하지 않으므로 입력한 글자를 계산 없이 그대로 저장된 값과 견주고, 같아서 ok는 true입니다. 저장된 값이 곧 비밀번호이므로, 훔친 값을 입력하면 진짜 비밀번호를 입력한 것과 같아 그대로 로그인됩니다.', 'bad');
      st.hot = ''; st.ar = [];
      push('System.out.println(saved)가 pass1234를, System.out.println(ok)가 ' + same + '를 출력합니다. 출력된 saved에서 비밀번호가 그대로 보입니다.', 'bad');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (S === 'bcrypt') {
      if (c.input === 'right') {
        sum.push('PasswordEncoder의 encode는 비밀번호를 $2a$10$로 시작하는 60자 값으로 바꾸고, 서버는 그 값만 저장합니다. 로그인할 때 matches(입력, 저장된 값)가 저장된 값의 솔트로 입력을 다시 계산해 맞는지 확인했고, 같은 pass1234라 true가 나와 로그인에 성공했습니다.');
        sum.push('서버는 원래 비밀번호를 저장하지 않았고, 확인하는 데 필요하지도 않았습니다. 저장된 값이 새어 나가도 그 값에서 pass1234를 거꾸로 계산해 낼 방법은 알려져 있지 않습니다. 흔한 비밀번호는 후보를 하나씩 계산해 견주면 찾아낼 수 있지만, BCrypt는 일부러 느리게 계산하므로 그 일에 시간이 많이 듭니다.');
      } else if (c.input === 'typo') {
        sum.push('한 글자만 다른 pass1235를 입력하면 matches가 false를 돌려주어 로그인에 실패합니다. 같은 솔트로 계산했지만 뒤 31자 해시 결과가 저장된 값과 다릅니다.');
        sum.push('서버는 계산한 값이 저장된 값과 같은지만 확인하면 되고, 이 확인에 원래 비밀번호는 필요하지 않습니다.');
      } else if (c.input === 'eq') {
        sum.push('같은 비밀번호를 다시 encode해서 equals로 견주면, 맞는 비밀번호인데도 false가 나와 로그인에 실패합니다. encode는 할 때마다 솔트를 새로 만들어 다른 값을 내기 때문입니다.');
        sum.push('저장된 값과 견주는 일은 matches(입력, 저장된 값)로 합니다. matches는 저장된 값에서 솔트를 읽어 같은 솔트로 계산하므로, 맞는 비밀번호면 true가 나옵니다.');
      } else {
        sum.push('저장된 값을 훔쳐 비밀번호 칸에 그대로 입력해도 로그인되지 않습니다. matches는 입력을 언제나 비밀번호로 보고 계산하므로, 저장된 60자를 다시 계산한 값은 저장된 값과 다릅니다.');
        sum.push('저장된 값이 새어 나가도 그 값으로는 로그인할 수 없고, 값에서 원래 비밀번호가 보이지도 않습니다. 비밀번호를 그대로 저장한 서버에서는 어떻게 되는지 비교해 보세요.');
      }
    } else if (S === 'sha') {
      if (c.input === 'right') {
        sum.push('MessageDigest로 SHA-256을 직접 계산해도 비밀번호를 해시로 저장하고 확인할 수 있습니다. SHA-256은 솔트를 섞지 않아 같은 글자는 언제나 같은 64자 값이므로, 입력을 다시 계산해 equals로 견주면 됩니다.');
        sum.push('바로 그 성질 때문에 같은 비밀번호를 쓰는 회원은 저장된 값도 같고, 계산이 빨라 후보를 하나씩 넣어 보기도 쉽습니다. PasswordEncoder(BCrypt)는 솔트와 느린 계산으로 이 두 가지를 막습니다.');
      } else if (c.input === 'typo') {
        sum.push('SHA-256에 한 글자만 다른 pass1235를 넣으면 전혀 다른 값이 나와 로그인에 실패합니다. 저장된 값과 64자 가운데 ' + this.DIFF + '자가 다릅니다.');
        sum.push('한 글자가 달라도 비슷한 값이 나오는 것이 아니라 전혀 다른 값이 나오므로, 서버는 두 값이 같은지만 확인하면 됩니다.');
      } else {
        sum.push('SHA-256으로 저장한 값을 훔쳐 비밀번호 칸에 입력해도 로그인되지 않습니다. 서버가 입력을 한 번 더 해시하므로 저장된 값과 다른 값이 됩니다.');
        sum.push('다만 SHA-256은 계산이 빨라서, 저장된 값을 가진 사람이 흔한 비밀번호를 하나씩 계산해 견주어 원래 비밀번호를 찾아내기 쉽습니다.');
      }
      sum.push('SHA-256을 직접 계산하는 코드는 해시의 성질을 보이려고 둔 것입니다. 실제 서비스는 비밀번호를 SHA-256으로 저장하지 않고 PasswordEncoder(BCrypt 등)를 씁니다.');
    } else if (c.input === 'right') {
      sum.push('해시하지 않고 비밀번호를 그대로 저장하면 서버에 저장된 값이 곧 비밀번호입니다. 로그인은 성공했지만, 저장된 값을 볼 수 있는 사람(운영자, 저장된 값을 훔친 사람)은 누구나 pass1234를 그대로 읽습니다.');
      sum.push('로그인이 되는 것만으로는 안전한지 알 수 없습니다. PasswordEncoder로 저장하면 로그인은 똑같이 되면서, 저장된 값에서 비밀번호를 읽을 수 없습니다.');
    } else if (c.input === 'typo') {
      sum.push('그대로 저장해도 한 글자 다른 비밀번호는 로그인에 실패합니다. 틀린 비밀번호를 막는 일은 저장 방법과 상관없이 됩니다.');
      sum.push('저장 방법이 달라지는 것은 로그인이 아니라 저장된 값이 새어 나갔을 때입니다. 저장된 값을 입력하는 설정으로 바꿔 비교해 보세요.');
    } else {
      sum.push('그대로 저장한 서버에서 저장된 값을 훔쳐 비밀번호 칸에 입력하면 그대로 로그인됩니다. 저장된 값이 곧 비밀번호이기 때문입니다.');
      sum.push('PasswordEncoder로 저장한 서버에서는 같은 일을 해도 실패합니다. matches가 입력을 비밀번호로 보고 계산해서, 저장된 값과 다른 값이 되기 때문입니다.');
    }
    var row = S === 'bcrypt' ? [this.cutB(saved), this.cutB(calc), same ? '성공' : '실패']
      : S === 'sha' ? [this.cut(saved), this.cut(calc), same ? '성공' : '실패']
      : [saved, this.NOCALC, same ? '성공' : '실패'];
    return { events: ev, summary: sum, row: row };
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
  // 그림: 위쪽에 입력 글자 → 해시 계산(encode, matches, MessageDigest) → 나온 값, 아래쪽에 서버에 저장된 값과 입력에서 계산한 값을 나란히 두고 같음/다름을 표시한다.
  // matches일 때는 저장된 값에서 해시 계산으로 가는 화살표(matches가 saved를 받아 솔트를 읽음)를 더하고, 나온 값 칸의 이름을 'matches가 계산한 값'으로 한다(matches는 이 값을 돌려주지 않는다). 맨 아래는 로그인 결과 칸.
  // 그대로 저장하면 해시 계산 상자가 점선이 되고 저장된 칸에 비밀번호가 그대로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, S = c.store, h = S !== 'plain', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 262);
    var hot = s ? s.hot : '';
    var fnT = !h ? '해시 계산' : S === 'sha' ? 'MessageDigest' : s && s.fn === 'match' ? 'matches' : 'encode';
    var fnS = !h ? '쓰지 않음' : S === 'sha' ? ['SHA-256', '솔트 없음'] : s && s.fn === 'match' ? ['BCrypt', 'saved의 솔트를 씀'] : ['BCrypt', '솔트를 새로 만듦'];
    P.box('in', 14, 16, 134, 78, { cls: hot === 'in' ? 'hot now' : 'plain', title: '입력 글자', sub: s && s.inTxt ? s.inTxt : '아직 없음' });
    P.box('fn', 204, 16, 156, 78, { cls: !h ? 'ghost' : hot === 'fn' ? 'hot now' : 'plain', title: fnT, sub: fnS });
    P.box('out', 416, 16, 250, 78, { cls: !h ? 'ghost' : hot === 'out' ? 'hot now' : 'plain', title: S === 'bcrypt' && s && s.fn === 'match' ? 'matches가 계산한 값' : '나온 값', sub: !h ? '계산하지 않음' : s && s.outTxt ? s.outTxt : '아직 없음' });
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
      else if (id === 'a6') P.arrow('a6', 'sv:t:0.75', 'fn:b:0.3', { cls: cl });
    });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)이고, PasswordEncoder와 BCryptPasswordEncoder는 스프링 시큐리티 7.1.1(spring-security-crypto 7.1.1)의 것입니다. 열 가지 조합(PasswordEncoder로 저장 4가지, SHA-256으로 저장 3가지, 그대로 저장 3가지)을 모두, 화면의 코드를 import 줄과 클래스, main 메서드(throws Exception)의 틀로 감싼 소스로 만들어 javax.tools로 컴파일하고 새 클래스 로더로 읽어 main을 실행했습니다(verify/spring/src/HashBasicProbe.java). 대조한 것은 화면의 코드가 실행한 소스의 그 부분과 같은 글인지, 프로그램이 출력한 saved와 ok입니다. BCrypt의 saved는 실행할 때마다 다르므로, 실행에서 나온 saved가 $2a$10$와 53글자의 모양인지, ok가 결과 표의 로그인과 같은지를 대조했습니다. 화면과 결과 표에 보이는 BCrypt 값 두 개(B1, B2)는 encode("pass1234")를 실제로 두 번 불러 나온 값을 옮겨 적은 예이고, 두 값 모두 matches("pass1234", 값)가 true인 것과 두 값이 서로 다른 것을 확인했습니다. matches가 계산한 값은 matches가 돌려주지 않으므로, 스프링 시큐리티의 BCrypt.hashpw(입력, 저장된 값)로 계산해 보였습니다. javap로 보면 BCryptPasswordEncoder의 matches는 BCrypt.checkpw를 부르고, checkpw는 저장된 값의 cost와 솔트로 입력을 계산해 저장된 값과 견줍니다. 실행한 조합마다 hashpw로 계산한 값이 saved와 같은지와 matches의 결과가 같았습니다. 같은 비밀번호를 20번 encode하면 20개 값과 솔트가 모두 달랐고 모두 matches가 true였으며, 다시 encode한 값은 equals로 견주면 false였습니다. 잰 시간은 matches 한 번이 수십 ms(두 번 실행해 약 59ms와 78ms), SHA-256 한 번이 0.1ms보다 짧았습니다(CPU에 따라 다릅니다). BCryptPasswordEncoder를 인자 없이 만들면 cost는 10이고 값은 $2a$로 시작합니다. 스프링 시큐리티 문서(Password Storage)는 PasswordEncoder가 비밀번호를 한 방향으로 바꿔 안전하게 저장하게 한다고 설명하고, 저장 방식을 나중에 바꿀 수 있도록 PasswordEncoderFactories.createDelegatingPasswordEncoder()로 만드는 DelegatingPasswordEncoder를 소개합니다. 이것이 새로 만드는 값은 앞에 {bcrypt}가 붙은 BCrypt 값입니다(실행해서 {bcrypt}$2a$10$로 시작하는 것을 확인했습니다). 이 실습은 PasswordEncoder가 하는 일을 보이려고 BCryptPasswordEncoder를 직접 만들었습니다. 스프링 부트 애플리케이션에서는 보통 PasswordEncoder를 빈으로 등록해 씁니다. SHA-256 쪽은 계산이 표준대로인지 SHA-256의 표준 예시 두 가지(메시지 "abc"와 56글자 메시지)를 MessageDigest로 계산해 NIST의 예시 문서와 RFC 6234의 값과 견주었고, 7가지 입력(빈 글자, 1글자, 100글자 포함)을 Node.js의 crypto와 openssl dgst -sha256으로도 계산해 세 구현의 값이 같은 것을 확인했습니다. pass1234와 pass1235의 SHA-256 값은 64자 가운데 61자가 다르며(이 입력에서 관찰한 값입니다), 입력이 0글자, 1글자, 100글자여도 결과는 64자입니다. NIST FIPS 180-4(Secure Hash Standard)는 SHA-256을 메시지에서 다이제스트라는 값을 만드는 단방향 해시 함수로 정하고, 메시지가 조금이라도 바뀌면 매우 높은 확률로 다른 다이제스트가 나온다고 합니다. OWASP의 Password Storage Cheat Sheet는 비밀번호를 평문으로 저장하지 말고 해시해서 저장하라고 하고, SHA-256 같은 빠른 해시는 비밀번호 저장에 맞지 않다고 하며, 사용자마다 고유한 솔트를 더하고 Argon2id, scrypt, bcrypt, PBKDF2 같은 느린 비밀번호 전용 함수를 쓰라고 합니다. 이 실습에서 "거꾸로 계산해 낼 수 없다"는 것은 수학적으로 증명된 것이 아니라 현실적으로 알려진 방법이 없다는 뜻이고, 짧고 흔한 비밀번호는 후보를 하나씩 계산해서 저장된 값과 견주는 방법으로 찾아질 수 있습니다. 화면의 코드는 가입과 로그인을 한 번의 실행 안에 이어 적은 것입니다. 실제 서비스에서는 가입과 로그인이 서로 다른 요청이고 saved는 DB에 보관되며, 서버가 사용자가 입력한 비밀번호 글자를 받아 계산한다고 가정했습니다. BCrypt가 비밀번호의 앞 72바이트만 쓰는 것, cost를 고르는 법, 저장된 값을 더 강한 방식으로 바꾸는 일, 해시 충돌은 다루지 않았습니다(BCrypt의 자세한 동작은 "세부 동작 실습: 비밀번호 해시"에서 다룹니다). 이 실습의 해시 함수는 암호용 해시 함수이고, HashMap의 해시 코드와는 쓰임이 다릅니다.',
});
