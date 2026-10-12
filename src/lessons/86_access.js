Lab.register({
  id: 'access', nav: '접근 제어자와 캡슐화', cat: '자바 언어', mode: 'step',
  title: 'private, protected, public은 어디까지 열어 주나',
  intro: '필드나 메서드 앞의 접근 제어자는 그 멤버를 어느 코드가 쓸 수 있는지를 정합니다. 컴파일러는 접근하는 코드가 어느 클래스, 어느 패키지에 있는지를 보고 허용할지 판단하며, 허용되지 않으면 컴파일 오류입니다. protected는 자식 클래스에게 열려 있지만, 다른 패키지의 자식에서는 조건이 하나 더 붙습니다.',
  terms: ['접근 제어자', '캡슐화', '패키지', 'protected', '상속'],
  controls: [
    { id: 'mod', label: 'Account의 balance 앞에 적은 접근 제어자', type: 'select', value: 'protected', options: [['private', 'private'], ['package', '아무것도 쓰지 않음 (패키지 전용)'], ['protected', 'protected'], ['public', 'public']] },
    { id: 'from', label: 'balance를 읽는 코드가 있는 곳', type: 'select', value: 'subParent', options: [['same', '같은 클래스 Account 안'], ['pkg', '같은 패키지의 다른 클래스 Teller'], ['subThis', '다른 패키지의 자식 SavingAccount: this.balance'], ['subChild', '다른 패키지의 자식: SavingAccount 타입 변수로'], ['subParent', '다른 패키지의 자식: Account 타입 변수로'], ['other', '다른 패키지의 무관한 클래스 Report']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'balance 앞에 protected를 적고 다른 패키지의 자식에서 Account 타입 변수로 읽으면 컴파일되나', d: 'protected 멤버를 자식 클래스 안에서 읽는데, 부모 타입 변수로 읽으면 컴파일 오류입니다.', v: { mod: 'protected', from: 'subParent' } },
    { t: 'protected를 자기 자신의 것으로 읽으면', q: '다른 패키지의 자식 SavingAccount에서 this.balance로 읽으면', d: '물려받은 자기 멤버 this.balance는 읽을 수 있습니다.', v: { mod: 'protected', from: 'subThis' } },
    { t: 'protected는 같은 패키지에도 열려 있다', q: '같은 패키지의 다른 클래스 Teller에서 읽으면', d: '자식이 아니어도 같은 패키지의 클래스는 읽을 수 있습니다.', v: { mod: 'protected', from: 'pkg' } },
    { t: 'private을 같은 패키지에서 읽으면', q: '접근 제어자를 private으로 바꾸고 같은 패키지의 다른 클래스 Teller에서 읽으면', d: 'private은 같은 클래스 안에서만 쓸 수 있습니다.', v: { mod: 'private', from: 'pkg' } },
    { t: '아무것도 쓰지 않은 멤버를 다른 패키지의 자식에서', q: 'balance 앞에 접근 제어자를 쓰지 않고 다른 패키지의 자식 SavingAccount에서 this.balance로 읽으면', d: '자식 클래스여도 패키지가 다르면 읽을 수 없습니다.', v: { mod: 'package', from: 'subThis' } },
    { t: 'protected를 무관한 클래스에서', q: '다른 패키지의 무관한 클래스 Report에서 읽으면', d: '다른 패키지이고 자식도 아니면 읽을 수 없습니다.', v: { mod: 'protected', from: 'other' } },
    { t: 'public이면', q: '접근 제어자를 public으로 바꾸고 다른 패키지의 무관한 클래스 Report에서 읽으면', d: '다른 패키지의 무관한 클래스에서도 읽을 수 있습니다.', v: { mod: 'public', from: 'other' } },
  ],
  code: function (c) {
    var ok = this.allowed(c.mod, c.from), tail = ok ? '' : '       // 컴파일 오류', kw = c.mod === 'package' ? '' : c.mod + ' ';
    var acc = '// 파일: bank/Account.java\npackage bank;\n\npublic class Account {\n    ' + kw + 'int balance = 1000;' + (c.mod === 'package' ? '            // 접근 제어자 없음: 패키지 전용' : '') + '\n' + (c.from === 'same' ? '\n    int read() {\n        return this.balance;\n    }\n' : '') + '}\n';
    if (c.from === 'same') return acc;
    if (c.from === 'pkg') return acc + '\n// 파일: bank/Teller.java  (같은 패키지)\npackage bank;\n\npublic class Teller {\n    int read(Account acc) {\n        return acc.balance;' + tail + '\n    }\n}\n';
    if (c.from === 'other') return acc + '\n// 파일: app/Report.java  (다른 패키지, 상속 관계 없음)\npackage app;\n\nimport bank.Account;\n\npublic class Report {\n    int read(Account acc) {\n        return acc.balance;' + tail + '\n    }\n}\n';
    var body = c.from === 'subThis' ? '    int read() {\n        return this.balance;' + tail + '\n    }\n' : c.from === 'subChild' ? '    int read(SavingAccount other) {\n        return other.balance;' + tail + '\n    }\n' : '    int read(Account other) {\n        return other.balance;' + tail + '\n    }\n';
    return acc + '\n// 파일: app/SavingAccount.java  (다른 패키지, Account의 자식)\npackage app;\n\nimport bank.Account;\n\npublic class SavingAccount extends Account {\n' + body + '}\n';
  },
  label: function (c) { return { private: 'private', package: '제어자 없음', protected: 'protected', public: 'public' }[c.mod] + ' · ' + { same: '같은 클래스', pkg: '같은 패키지', subThis: '다른 패키지 자식 (this)', subChild: '다른 패키지 자식 (자식 타입 변수)', subParent: '다른 패키지 자식 (부모 타입 변수)', other: '다른 패키지 무관한 클래스' }[c.from]; },
  columns: ['컴파일', '판단한 이유', 'javac의 오류 메시지'],
  // 이 접근 제어자의 멤버를 이 위치에서 쓸 수 있는가
  allowed: function (mod, from) {
    if (mod === 'public' || from === 'same') return true;
    if (mod === 'private') return false;
    if (from === 'pkg') return true;
    if (mod === 'package') return false;
    return from === 'subThis' || from === 'subChild';
  },
  message: function (mod) { return { private: 'balance has private access in bank.Account', package: 'balance is not public in bank.Account; cannot be accessed from outside package', protected: 'balance has protected access in bank.Account' }[mod]; },
  simulate: function (c) {
    var ev = [], sum = [], mod = c.mod, from = c.from, ok = this.allowed(mod, from), msg = ok ? '' : this.message(mod), sub = from.indexOf('sub') === 0, reason = '';
    var st = { step: '', checks: [], verdict: '', msg: '', reason: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function check(q, a, then) { st.checks.push({ q: q, a: a, then: then }); }
    function end(r) { reason = r; st.verdict = ok ? 'ok' : 'no'; st.msg = msg; st.reason = r; }
    var fin = ok ? ' 컴파일됩니다.' : ' 컴파일 오류입니다.';
    st.step = 'decl';
    push({ private: 'bank/Account.java의 선언: balance는 private으로 선언되어 있습니다. private은 "이 클래스 안에서만 쓸 수 있다"는 뜻입니다.', package: 'bank/Account.java의 선언: balance 앞에 접근 제어자가 없습니다. 아무것도 쓰지 않으면 "같은 패키지 안에서만 쓸 수 있다"는 뜻이 됩니다. 이것을 패키지 전용이라고 부릅니다.', protected: 'bank/Account.java의 선언: balance는 protected로 선언되어 있습니다. protected는 "같은 패키지 안에서, 그리고 다른 패키지에 있더라도 자식 클래스 안에서 쓸 수 있다"는 뜻입니다.', public: 'bank/Account.java의 선언: balance는 public으로 선언되어 있습니다. public은 "어디서나 쓸 수 있다"는 뜻입니다.' }[mod]);
    st.step = 'use';
    push({ same: 'bank/Account.java의 read(): Account 클래스 안의 코드가 this.balance를 읽으려 합니다. 컴파일러는 접근하는 코드가 어느 클래스, 어느 패키지에 있는지를 기준으로 허용할지 따집니다.',
      pkg: 'bank/Teller.java의 read(Account acc): Teller 클래스 안의 코드가 acc.balance를 읽으려 합니다. Teller는 Account와 같은 bank 패키지에 있지만 다른 클래스이고, Account의 자식도 아닙니다.',
      subThis: 'app/SavingAccount.java의 read(): SavingAccount 안의 코드가 this.balance, 곧 물려받은 자기 자신의 balance를 읽으려 합니다. SavingAccount는 Account의 자식이지만 다른 패키지인 app에 있습니다.',
      subChild: 'app/SavingAccount.java의 read(SavingAccount other): SavingAccount 안의 코드가 other.balance를 읽으려 합니다. other는 자기와 같은 SavingAccount 타입의 다른 객체입니다. SavingAccount는 Account의 자식이지만 다른 패키지인 app에 있습니다.',
      subParent: 'app/SavingAccount.java의 read(Account other): SavingAccount 안의 코드가 other.balance를 읽으려 합니다. other의 타입은 부모인 Account입니다. SavingAccount는 Account의 자식이지만 다른 패키지인 app에 있습니다.',
      other: 'app/Report.java의 read(Account acc): Report 클래스 안의 코드가 acc.balance를 읽으려 합니다. Report는 다른 패키지인 app에 있고, Account의 자식도 아닙니다.' }[from]);
    st.step = 'check';
    var who = from === 'same' ? 'Account' : from === 'pkg' ? 'Teller' : sub ? 'SavingAccount' : 'Report';
    if (mod === 'public') {
      check('public인가', '예', '어디서나 허용'); end('public이라 어디서나');
      push('확인: balance가 public인가. 그렇습니다. public 멤버는 접근하는 코드가 어느 클래스, 어느 패키지에 있든 허용됩니다.' + fin, 'good');
    } else if (from === 'same') {
      check('Account 클래스 안의 코드인가', '예', '허용'); end('같은 클래스 안');
      push('확인 1: 접근하는 코드가 Account 클래스 안에 있는가. 그렇습니다. 같은 클래스 안에서는 private을 포함해 어떤 접근 제어자의 멤버든 쓸 수 있습니다.' + fin, 'good');
    } else {
      if (mod === 'private') {
        check('Account 클래스 안의 코드인가', '아니오', 'private은 여기까지만'); end('private은 같은 클래스까지만');
        push('확인 1: 접근하는 코드가 Account 클래스 안에 있는가. 아닙니다. ' + who + ' 클래스 안에 있습니다. private은 같은 클래스까지만 허용하므로 ' + (from === 'pkg' ? '같은 패키지여도' : sub ? '자식 클래스여도' : '여기서는') + ' 쓸 수 없습니다.' + fin, 'bad');
      } else {
        check('Account 클래스 안의 코드인가', '아니오', '다음 확인으로');
        push('확인 1: 접근하는 코드가 Account 클래스 안에 있는가. 아닙니다. ' + who + ' 클래스 안에 있습니다. private이었다면 여기서 끝이지만, 이 멤버는 private이 아니므로 다음을 확인합니다.');
        if (from === 'pkg') {
          check('같은 패키지(bank)인가', '예', '허용'); end('같은 패키지');
          push('확인 2: 접근하는 코드가 Account와 같은 패키지에 있는가. 그렇습니다. Teller도 bank 패키지에 있습니다. ' + (mod === 'protected' ? 'protected는 자식 클래스뿐 아니라 같은 패키지의 모든 클래스에도 열려 있습니다.' : '접근 제어자를 쓰지 않은 멤버는 같은 패키지 안에서 쓸 수 있습니다.') + fin, 'good');
        } else if (mod === 'package') {
          check('같은 패키지(bank)인가', '아니오', '패키지 전용은 여기까지만'); end('패키지 전용은 같은 패키지까지만');
          push('확인 2: 접근하는 코드가 Account와 같은 패키지에 있는가. 아닙니다. ' + who + ' 클래스는 app 패키지에 있습니다. 접근 제어자를 쓰지 않은 멤버는 같은 패키지까지만 허용합니다.' + (sub ? ' 자식 클래스라는 사실은 여기서 도움이 되지 않습니다.' : '') + fin, 'bad');
        } else {
          check('같은 패키지(bank)인가', '아니오', '다음 확인으로');
          push('확인 2: 접근하는 코드가 Account와 같은 패키지에 있는가. 아닙니다. ' + who + ' 클래스는 app 패키지에 있습니다. protected는 다른 패키지라도 자식 클래스에게는 열려 있으므로 다음을 확인합니다.');
          if (from === 'other') {
            check('Account의 자식 클래스 안인가', '아니오', '허용되지 않음'); end('자식 클래스가 아님');
            push('확인 3: 접근하는 코드가 Account의 자식 클래스 안에 있는가. 아닙니다. Report는 Account를 상속하지 않았습니다. 다른 패키지이고 자식도 아니므로 protected 멤버를 쓸 수 없습니다.' + fin, 'bad');
          } else {
            check('Account의 자식 클래스 안인가', '예', '조건 하나 더 확인');
            push('확인 3: 접근하는 코드가 Account의 자식 클래스 안에 있는가. 그렇습니다. SavingAccount는 Account를 상속했습니다. 다만 다른 패키지의 자식에게는 조건이 하나 더 있습니다.');
            var q4 = '참조의 타입이 SavingAccount인가';
            if (from === 'subThis') { check(q4, '예', '허용'); end('자식 클래스에서 자기 타입으로'); push('확인 4: balance 앞에 적은 참조의 타입이 자기 클래스인 SavingAccount인가. 그렇습니다. this의 타입은 SavingAccount입니다. 물려받은 자기 자신의 멤버이므로 허용됩니다.' + fin, 'good'); }
            else if (from === 'subChild') { check(q4, '예', '허용'); end('자식 클래스에서 자기 타입으로'); push('확인 4: balance 앞에 적은 참조의 타입이 자기 클래스인 SavingAccount인가. 그렇습니다. other는 SavingAccount 타입으로 선언되어 있습니다. 자기 자신이 아닌 다른 객체여도 타입이 자기 클래스이면 허용됩니다.' + fin, 'good'); }
            else { check(q4, '아니오', '허용되지 않음'); end('부모 타입 변수로는 안 됨'); push('확인 4: balance 앞에 적은 참조의 타입이 자기 클래스인 SavingAccount인가. 아닙니다. other는 부모 타입인 Account로 선언되어 있습니다. protected가 다른 패키지의 자식에게 열어 주는 것은 "자기 타입을 통한 접근"뿐이어서, 자식 클래스 안의 코드인데도 쓸 수 없습니다.' + fin, 'bad'); }
          }
        }
      }
    }
    if (mod === 'private') sum.push(ok ? 'private 멤버는 선언한 클래스 안에서만 쓸 수 있습니다. 설정에서 접근하는 곳을 바꾸면 나머지는 모두 컴파일 오류가 됩니다.' : 'private 멤버는 선언한 클래스 밖에서는 보이지 않습니다. 같은 패키지든 자식 클래스든 마찬가지입니다. 필드를 private으로 두고 필요한 동작만 메서드로 공개하는 것이 캡슐화의 기본이며, 이렇게 하면 바깥 코드가 값을 마음대로 바꾸지 못합니다.');
    if (mod === 'package') sum.push(ok ? '접근 제어자를 쓰지 않은 멤버는 같은 패키지 안에서 쓸 수 있습니다.' + (from === 'pkg' ? ' 같은 패키지의 클래스끼리만 쓰는 내부용 멤버에 알맞습니다.' : '') : '접근 제어자를 쓰지 않은 멤버는 패키지 밖에서는 보이지 않습니다.' + (sub ? ' 다른 패키지의 자식 클래스에서도 쓸 수 없다는 점이 protected와 다릅니다.' : ''));
    if (mod === 'protected') {
      if (from === 'pkg') sum.push('protected를 "자식만 쓸 수 있다"로 기억하기 쉽지만, 같은 패키지의 클래스는 자식이 아니어도 쓸 수 있습니다. protected는 패키지 전용보다 넓은 범위입니다.');
      if (from === 'subThis' || from === 'subChild') sum.push('다른 패키지의 자식 클래스는 물려받은 protected 멤버를 자기 타입(this, 또는 자기 클래스 타입의 변수)을 통해 쓸 수 있습니다.');
      if (from === 'subParent') { sum.push('다른 패키지의 자식 클래스 안이라도, 부모 타입 변수로는 protected 멤버를 쓸 수 없습니다. Account 타입 변수에는 SavingAccount와 상관없는 다른 자식 객체가 들어 있을 수도 있기 때문입니다.'); sum.push('this.balance나 SavingAccount 타입 변수의 balance는 됩니다. 변수의 타입만 Account에서 SavingAccount로 바꿔도 컴파일됩니다.'); }
      if (from === 'other') sum.push('다른 패키지이고 자식도 아니면 protected 멤버는 보이지 않습니다. 이 위치에서 쓸 수 있는 것은 public 멤버뿐입니다.');
      if (from === 'same') sum.push('같은 클래스 안에서는 어떤 접근 제어자든 쓸 수 있습니다.');
    }
    if (mod === 'public') sum.push('public 멤버는 어디서나 쓸 수 있습니다. 그만큼 한 번 공개하면 나중에 바꾸기 어렵습니다. 필드는 되도록 private으로 두고, 밖에서 꼭 필요한 것만 public 메서드로 공개합니다.');
    sum.push('범위는 private(같은 클래스) → 제어자 없음(같은 패키지까지) → protected(다른 패키지의 자식까지) → public(어디서나) 순서로 넓어집니다.');
    return { events: ev, summary: sum, row: [ok ? '성공' : '오류', reason, ok ? '없음' : msg] };
  },
  places: [['same', '같은 클래스 Account 안'], ['pkg', '같은 패키지의 Teller'], ['subThis', '다른 패키지의 자식: this'], ['subChild', '다른 패키지의 자식: 자식 타입 변수'], ['subParent', '다른 패키지의 자식: 부모 타입 변수'], ['other', '다른 패키지의 무관한 Report']],
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, self = this;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 따지는 순서대로 한 단계씩 진행합니다.'); return; }
    var ln = H.lanes(v), modT = { private: 'private', package: '접근 제어자 없음 (패키지 전용)', protected: 'protected', public: 'public' }[c.mod];
    H.lane(ln, 'balance의 선언', modT, 'wait');
    H.lane(ln, '읽는 코드', s.step === 'decl' ? '아직 보지 않음' : this.places.filter(function (p) { return p[0] === c.from; })[0][1], s.step === 'decl' ? 'none' : 'hot');
    H.table(v, ['확인한 것', '답과 결론'], s.checks.map(function (k, i) { var lastOne = i === s.checks.length - 1 && s.verdict; return { cells: [k.q, { v: k.a + ' → ' + k.then, cls: lastOne ? (s.verdict === 'ok' ? 'good' : 'bad') : '' }] }; }), '확인한 순서');
    if (!s.checks.length) H.text(v, '아직 확인을 시작하지 않았습니다.');
    if (s.verdict) {
      H.table(v, ['읽는 코드가 있는 곳', '결과'], this.places.map(function (p) { var a = self.allowed(c.mod, p[0]); return { cells: [{ v: p[1], cls: p[0] === c.from ? 'hot' : '' }, { v: a ? '컴파일됨' : '컴파일 오류', cls: a ? 'good' : 'bad' }] }; }), modT + '일 때 여섯 곳의 결과');
    }
  },
  // 그림: 왼쪽은 bank 패키지(Account와 Teller), 오른쪽은 다른 패키지 app(자식 SavingAccount와 무관한 Report). 읽는 코드가 있는 상자에서 Account로 화살표가 가고, 허용되면 초록, 막히면 빨강이다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { step: '', checks: [], verdict: '', msg: '', reason: '' }, self = this;
    var kw = c.mod === 'package' ? '(제어자 없음)' : c.mod, src = { same: 'acc', pkg: 'tel', subThis: 'sav', subChild: 'sav', subParent: 'sav', other: 'rep' }[c.from], seen = s.step === 'use' || s.step === 'check';
    P.size(680, 296);
    P.region('pb', 16, 16, 290, 196, 'bank 패키지');
    P.region('pa', 374, 16, 290, 196, 'app 패키지 (다른 패키지)');
    function cls(id) { return src !== id || !seen ? (id === 'acc' ? 'wait' : 'plain') : s.verdict === 'ok' ? 'good now' : s.verdict === 'no' ? 'bad now' : 'hot now'; }
    function reach(id) {
      if (!s.verdict) return '';
      if (id === 'sav') { var a = self.allowed(c.mod, 'subThis'), b = self.allowed(c.mod, 'subParent'); return a && b ? '가능' : a ? '조건부' : '불가'; }
      return self.allowed(c.mod, { acc: 'same', tel: 'pkg', rep: 'other' }[id]) ? '가능' : '불가';
    }
    P.box('acc', 30, 50, 262, 60, { cls: cls('acc'), title: 'Account', sub: [kw + ' int balance'].concat(c.from === 'same' ? ['read()에서 this.balance'] : ['읽으려는 대상']), right: reach('acc') });
    P.box('tel', 30, 146, 262, 50, { cls: cls('tel'), title: 'Teller', sub: '같은 패키지의 다른 클래스', right: reach('tel') });
    P.box('sav', 388, 50, 262, 60, { cls: cls('sav'), title: 'SavingAccount', sub: ['Account의 자식 클래스'].concat(c.from === 'subThis' ? ['this.balance'] : c.from === 'subChild' ? ['SavingAccount other'] : c.from === 'subParent' ? ['Account other'] : []), right: reach('sav') });
    P.box('rep', 388, 146, 262, 50, { cls: cls('rep'), title: 'Report', sub: 'Account와 무관한 클래스', right: reach('rep') });
    if (seen && src !== 'acc') {
      var ac = s.verdict === 'ok' ? 'good' : s.verdict === 'no' ? 'bad' : 'dash mut', lb = s.verdict === 'ok' ? '읽을 수 있음' : s.verdict === 'no' ? '막힘' : c.from === 'pkg' || c.from === 'other' ? 'acc.balance' : c.from === 'subThis' ? 'this.balance' : 'other.balance';
      P.arrow('ar', src === 'tel' ? 'tel:t' : src === 'sav' ? 'sav:l' : 'rep:l', src === 'tel' ? 'acc:b' : src === 'sav' ? 'acc:r' : 'acc:r:0.85', { cls: ac, label: lb });
    }
    P.box('res', 16, 230, 648, 48, { cls: s.verdict === 'ok' ? 'good' : s.verdict === 'no' ? 'bad' : 'ghost', title: s.verdict === 'ok' ? '컴파일 성공' : s.verdict === 'no' ? '컴파일 오류' : '컴파일 결과', sub: s.verdict === 'ok' ? s.reason : s.verdict === 'no' ? s.msg : '아직 확인 중' });
    P.note('마지막 단계에서 상자 오른쪽에 이 접근 제어자로 그곳에서 읽을 수 있는지가 표시됩니다. "조건부"는 자기 타입(this나 SavingAccount 타입 변수)을 통할 때만 된다는 뜻입니다.');
  },
  assume: '스물네 가지 조합을 이 PC의 JDK 21에서 패키지를 bank와 app으로 나눈 소스 파일로 실제로 컴파일해, 성공 여부와 오류 메시지를 대조했습니다(실행 결과가 아니라 컴파일 결과를 보는 실습입니다). "판단한 이유" 칸과 확인 순서는 자바 언어 명세의 접근 규칙을 풀어 쓴 설명이며, 컴파일러가 실제로 이 순서로 검사한다는 뜻은 아닙니다. 필드 대신 메서드에 같은 접근 제어자를 붙여 컴파일했을 때도 스물네 조합의 성공과 오류가 똑같았습니다(오류 메시지의 글귀는 일부 다릅니다). 다루지 않은 것: 클래스 자체의 접근 제어자, 생성자, static 멤버, 중첩 클래스, 모듈(module-info). protected의 "자기 타입을 통해서만" 조건은 static이 아닌 멤버에 대한 것입니다. 오류 메시지는 javac의 영어 메시지 첫 줄입니다.',
});
