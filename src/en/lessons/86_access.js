Lab.register({
  id: 'access', nav: 'Access modifiers and encapsulation', cat: 'Java language', mode: 'step',
  title: 'How far do private, protected, and public open up access?',
  intro: 'The access modifier in front of a field or a method determines which code can use that member. The compiler looks at which class and which package the accessing code is in to decide whether to allow the access, and if the access is not allowed, the result is a compile-time error. protected is open to subclasses, but one more condition applies in a subclass in a different package.',
  terms: ['Access modifiers', 'Encapsulation', 'Package', 'protected', 'Inheritance'],
  controls: [
    { id: 'mod', label: 'Access modifier written before balance in Account', type: 'select', value: 'protected', options: [['private', 'private'], ['package', 'No modifier (package-private)'], ['protected', 'protected'], ['public', 'public']] },
    { id: 'from', label: 'Where the code that reads balance is', type: 'select', value: 'subParent', options: [['same', 'Inside the same class, Account'], ['pkg', 'Teller, another class in the same package'], ['subThis', 'SavingAccount, a subclass in another package: this.balance'], ['subChild', 'Subclass in another package: through a SavingAccount variable'], ['subParent', 'Subclass in another package: through an Account variable'], ['other', 'Report, an unrelated class in another package']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Does the code compile when balance is protected and a subclass in another package reads it through an Account variable?', d: 'A protected member is read inside a subclass, but reading it through a variable of the superclass type is a compile-time error.', v: { mod: 'protected', from: 'subParent' } },
    { t: 'Reading a protected member as its own', q: 'What if SavingAccount, a subclass in another package, reads balance with this.balance?', d: 'The subclass can read this.balance, its own inherited member.', v: { mod: 'protected', from: 'subThis' } },
    { t: 'protected is also open to the same package', q: 'What if Teller, another class in the same package, reads balance?', d: 'A class in the same package can read the member even if it is not a subclass.', v: { mod: 'protected', from: 'pkg' } },
    { t: 'Reading a private member from the same package', q: 'What if you change the access modifier to private and Teller, another class in the same package, reads balance?', d: 'A private member can be used only inside the same class.', v: { mod: 'private', from: 'pkg' } },
    { t: 'A member with no modifier, from a subclass in another package', q: 'What if balance has no modifier (package-private) and SavingAccount, a subclass in another package, reads this.balance?', d: 'Even a subclass cannot read it if the package is different.', v: { mod: 'package', from: 'subThis' } },
    { t: 'A protected member, from an unrelated class', q: 'What if Report, an unrelated class in another package, reads balance?', d: 'A class that is in another package and is not a subclass cannot read it.', v: { mod: 'protected', from: 'other' } },
    { t: 'With public', q: 'What if you change the access modifier to public and Report, an unrelated class in another package, reads balance?', d: 'Even an unrelated class in another package can read it.', v: { mod: 'public', from: 'other' } },
  ],
  code: function (c) {
    var ok = this.allowed(c.mod, c.from), tail = ok ? '' : '       // compile-time error', kw = c.mod === 'package' ? '' : c.mod + ' ';
    var acc = '// File: bank/Account.java\npackage bank;\n\npublic class Account {\n    ' + kw + 'int balance = 1000;' + (c.mod === 'package' ? '            // no access modifier: package-private' : '') + '\n' + (c.from === 'same' ? '\n    int read() {\n        return this.balance;\n    }\n' : '') + '}\n';
    if (c.from === 'same') return acc;
    if (c.from === 'pkg') return acc + '\n// File: bank/Teller.java  (same package)\npackage bank;\n\npublic class Teller {\n    int read(Account acc) {\n        return acc.balance;' + tail + '\n    }\n}\n';
    if (c.from === 'other') return acc + '\n// File: app/Report.java  (different package, no inheritance relationship)\npackage app;\n\nimport bank.Account;\n\npublic class Report {\n    int read(Account acc) {\n        return acc.balance;' + tail + '\n    }\n}\n';
    var body = c.from === 'subThis' ? '    int read() {\n        return this.balance;' + tail + '\n    }\n' : c.from === 'subChild' ? '    int read(SavingAccount other) {\n        return other.balance;' + tail + '\n    }\n' : '    int read(Account other) {\n        return other.balance;' + tail + '\n    }\n';
    return acc + '\n// File: app/SavingAccount.java  (different package, subclass of Account)\npackage app;\n\nimport bank.Account;\n\npublic class SavingAccount extends Account {\n' + body + '}\n';
  },
  label: function (c) { return { private: 'private', package: 'no modifier', protected: 'protected', public: 'public' }[c.mod] + ' · ' + { same: 'same class', pkg: 'same package', subThis: 'subclass in another package (this)', subChild: 'subclass in another package (subclass-type variable)', subParent: 'subclass in another package (superclass-type variable)', other: 'unrelated class in another package' }[c.from]; },
  columns: ['Compilation', 'Reason for the decision', 'javac error message'],
  // Can a member with this access modifier be used from this place?
  allowed: function (mod, from) {
    if (mod === 'public' || from === 'same') return true;
    if (mod === 'private') return false;
    if (from === 'pkg') return true;
    if (mod === 'package') return false;
    return from === 'subThis' || from === 'subChild';
  },
  message: function (mod) { return { private: 'balance has private access in Account', package: 'balance is not public in Account; cannot be accessed from outside package', protected: 'balance has protected access in Account' }[mod]; },
  simulate: function (c) {
    var ev = [], sum = [], mod = c.mod, from = c.from, ok = this.allowed(mod, from), msg = ok ? '' : this.message(mod), sub = from.indexOf('sub') === 0, reason = '';
    var st = { step: '', checks: [], verdict: '', msg: '', reason: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function check(q, a, then) { st.checks.push({ q: q, a: a, then: then }); }
    function end(r) { reason = r; st.verdict = ok ? 'ok' : 'no'; st.msg = msg; st.reason = r; }
    var fin = ok ? ' The code compiles.' : ' This is a compile-time error.';
    st.step = 'decl';
    push({ private: 'Declaration in bank/Account.java: balance is declared private. private means "can be used only inside this class".', package: 'Declaration in bank/Account.java: There is no access modifier before balance. Writing nothing means "can be used only inside the same package". This is called package-private.', protected: 'Declaration in bank/Account.java: balance is declared protected. protected means "can be used inside the same package, and also inside a subclass even if the subclass is in a different package".', public: 'Declaration in bank/Account.java: balance is declared public. public means "can be used from anywhere".' }[mod]);
    st.step = 'use';
    push({ same: 'read() in bank/Account.java: Code inside the Account class tries to read this.balance. The compiler decides whether to allow the access based on which class and which package the accessing code is in.',
      pkg: 'read(Account acc) in bank/Teller.java: Code inside the Teller class tries to read acc.balance. Teller is in the same bank package as Account, but it is a different class and is not a subclass of Account.',
      subThis: 'read() in app/SavingAccount.java: Code inside SavingAccount tries to read this.balance, that is, its own inherited balance. SavingAccount is a subclass of Account, but it is in a different package, app.',
      subChild: 'read(SavingAccount other) in app/SavingAccount.java: Code inside SavingAccount tries to read other.balance. other is another object of the same type as itself, SavingAccount. SavingAccount is a subclass of Account, but it is in a different package, app.',
      subParent: 'read(Account other) in app/SavingAccount.java: Code inside SavingAccount tries to read other.balance. The type of other is the superclass, Account. SavingAccount is a subclass of Account, but it is in a different package, app.',
      other: 'read(Account acc) in app/Report.java: Code inside the Report class tries to read acc.balance. Report is in a different package, app, and is not a subclass of Account.' }[from]);
    st.step = 'check';
    var who = from === 'same' ? 'Account' : from === 'pkg' ? 'Teller' : sub ? 'SavingAccount' : 'Report';
    if (mod === 'public') {
      check('Is it public?', 'Yes', 'allowed anywhere'); end('public is allowed anywhere');
      push('Check: Is balance public? Yes. A public member is allowed no matter which class or which package the accessing code is in.' + fin, 'good');
    } else if (from === 'same') {
      check('Is the code inside the Account class?', 'Yes', 'allowed'); end('inside the same class');
      push('Check 1: Is the accessing code inside the Account class? Yes. Inside the same class, a member with any access modifier, including private, can be used.' + fin, 'good');
    } else {
      if (mod === 'private') {
        check('Is the code inside the Account class?', 'No', 'private stops here'); end('private reaches only the same class');
        push('Check 1: Is the accessing code inside the Account class? No. It is inside the ' + who + ' class. private allows access only within the same class, so the member cannot be used here' + (from === 'pkg' ? ', even in the same package' : sub ? ', even in a subclass' : '') + '.' + fin, 'bad');
      } else {
        check('Is the code inside the Account class?', 'No', 'go to the next check');
        push('Check 1: Is the accessing code inside the Account class? No. It is inside the ' + who + ' class. If the member were private, the checks would end here, but this member is not private, so the next check follows.');
        if (from === 'pkg') {
          check('Is it in the same package (bank)?', 'Yes', 'allowed'); end('same package');
          push('Check 2: Is the accessing code in the same package as Account? Yes. Teller is also in the bank package. ' + (mod === 'protected' ? 'protected is open not only to subclasses but also to every class in the same package.' : 'A member with no access modifier can be used inside the same package.') + fin, 'good');
        } else if (mod === 'package') {
          check('Is it in the same package (bank)?', 'No', 'package-private stops here'); end('package-private reaches only the same package');
          push('Check 2: Is the accessing code in the same package as Account? No. The ' + who + ' class is in the app package. A member with no access modifier allows access only within the same package.' + (sub ? ' Being a subclass does not help here.' : '') + fin, 'bad');
        } else {
          check('Is it in the same package (bank)?', 'No', 'go to the next check');
          push('Check 2: Is the accessing code in the same package as Account? No. The ' + who + ' class is in the app package. protected is open to subclasses even in a different package, so the next check follows.');
          if (from === 'other') {
            check('Is the code inside a subclass of Account?', 'No', 'not allowed'); end('not a subclass');
            push('Check 3: Is the accessing code inside a subclass of Account? No. Report does not extend Account. It is in a different package and is not a subclass, so it cannot use the protected member.' + fin, 'bad');
          } else {
            check('Is the code inside a subclass of Account?', 'Yes', 'check one more condition');
            push('Check 3: Is the accessing code inside a subclass of Account? Yes. SavingAccount extends Account. However, one more condition applies to a subclass in a different package.');
            var q4 = 'Is the type of the reference SavingAccount?';
            if (from === 'subThis') { check(q4, 'Yes', 'allowed'); end('in a subclass, through its own type'); push('Check 4: Is the type of the reference written before balance its own class, SavingAccount? Yes. The type of this is SavingAccount. It is an inherited member of the object itself, so the access is allowed.' + fin, 'good'); }
            else if (from === 'subChild') { check(q4, 'Yes', 'allowed'); end('in a subclass, through its own type'); push('Check 4: Is the type of the reference written before balance its own class, SavingAccount? Yes. other is declared with the type SavingAccount. Even though it is a different object and not the object itself, the access is allowed as long as its type is its own class.' + fin, 'good'); }
            else { check(q4, 'No', 'not allowed'); end('not allowed through a superclass-type variable'); push('Check 4: Is the type of the reference written before balance its own class, SavingAccount? No. other is declared with the superclass type, Account. The only thing that protected opens to a subclass in a different package is "access through its own type", so the member cannot be used even though the code is inside a subclass.' + fin, 'bad'); }
          }
        }
      }
    }
    if (mod === 'private') sum.push(ok ? 'A private member can be used only inside the class that declares it. If you change where the access comes from in the settings, every other place gives a compile-time error.' : 'A private member is not visible outside the class that declares it. This is true for the same package and for subclasses alike. Keeping fields private and exposing only the necessary operations as methods is the basis of encapsulation, and it prevents outside code from changing the values freely.');
    if (mod === 'package') sum.push(ok ? 'A member with no access modifier can be used inside the same package.' + (from === 'pkg' ? ' This suits internal members that only classes in the same package use.' : '') : 'A member with no access modifier is not visible outside its package.' + (sub ? ' Unlike protected, it cannot be used even from a subclass in a different package.' : ''));
    if (mod === 'protected') {
      if (from === 'pkg') sum.push('It is easy to remember protected as "only subclasses can use it", but a class in the same package can use it even if it is not a subclass. protected gives wider access than package-private.');
      if (from === 'subThis' || from === 'subChild') sum.push('A subclass in a different package can use an inherited protected member through its own type (this, or a variable of its own class type).');
      if (from === 'subParent') { sum.push('Even inside a subclass in a different package, a protected member cannot be used through a variable of the superclass type. This is because a variable of type Account might hold an object of some other subclass that has nothing to do with SavingAccount.'); sum.push('this.balance and the balance of a variable of type SavingAccount are allowed. Just changing the type of the variable from Account to SavingAccount makes the code compile.'); }
      if (from === 'other') sum.push('A protected member is not visible from a class that is in a different package and is not a subclass. From this place, only public members can be used.');
      if (from === 'same') sum.push('Inside the same class, a member with any access modifier can be used.');
    }
    if (mod === 'public') sum.push('A public member can be used from anywhere. For that reason, once you make something public, it is hard to change later. Keep fields private whenever possible, and expose only what outside code really needs as public methods.');
    sum.push('Access widens in this order: private (the same class) → no modifier (up to the same package) → protected (up to subclasses in other packages) → public (anywhere).');
    return { events: ev, summary: sum, row: [ok ? 'Success' : 'Error', reason, ok ? 'None' : msg] };
  },
  places: [['same', 'Inside the same class, Account'], ['pkg', 'Teller in the same package'], ['subThis', 'Subclass in another package: this'], ['subChild', 'Subclass in another package: subclass-type variable'], ['subParent', 'Subclass in another package: superclass-type variable'], ['other', 'Unrelated class Report in another package']],
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, self = this;
    if (!s) { H.text(v, 'Click Run to go through the access rules one check at a time.'); return; }
    var ln = H.lanes(v), modT = { private: 'private', package: 'No access modifier (package-private)', protected: 'protected', public: 'public' }[c.mod];
    H.lane(ln, 'Declaration of balance', modT, 'wait');
    H.lane(ln, 'Code that reads it', s.step === 'decl' ? 'not looked at yet' : this.places.filter(function (p) { return p[0] === c.from; })[0][1], s.step === 'decl' ? 'none' : 'hot');
    H.table(v, ['What was checked', 'Answer and conclusion'], s.checks.map(function (k, i) { var lastOne = i === s.checks.length - 1 && s.verdict; return { cells: [k.q, { v: k.a + ' → ' + k.then, cls: lastOne ? (s.verdict === 'ok' ? 'good' : 'bad') : '' }] }; }), 'Order of the checks');
    if (!s.checks.length) H.text(v, 'The checks have not started yet.');
    if (s.verdict) {
      H.table(v, ['Where the reading code is', 'Result'], this.places.map(function (p) { var a = self.allowed(c.mod, p[0]); return { cells: [{ v: p[1], cls: p[0] === c.from ? 'hot' : '' }, { v: a ? 'Compiles' : 'Compile-time error', cls: a ? 'good' : 'bad' }] }; }), modT + ': results for the 6 places');
    }
  },
  // Diagram: on the left, the bank package (Account and Teller); on the right, a different package, app (the subclass SavingAccount and the unrelated Report). An arrow goes from the box that contains the reading code to Account. It is green if the access is allowed and red if it is blocked.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { step: '', checks: [], verdict: '', msg: '', reason: '' }, self = this;
    var kw = c.mod === 'package' ? '(no modifier)' : c.mod, src = { same: 'acc', pkg: 'tel', subThis: 'sav', subChild: 'sav', subParent: 'sav', other: 'rep' }[c.from], seen = s.step === 'use' || s.step === 'check';
    P.size(680, 296);
    P.region('pb', 16, 16, 290, 196, 'bank package');
    P.region('pa', 374, 16, 290, 196, 'app package (a different package)');
    function cls(id) { return src !== id || !seen ? (id === 'acc' ? 'wait' : 'plain') : s.verdict === 'ok' ? 'good now' : s.verdict === 'no' ? 'bad now' : 'hot now'; }
    function reach(id) {
      if (!s.verdict) return '';
      if (id === 'sav') { var a = self.allowed(c.mod, 'subThis'), b = self.allowed(c.mod, 'subParent'); return a && b ? 'yes' : a ? 'conditional' : 'no'; }
      return self.allowed(c.mod, { acc: 'same', tel: 'pkg', rep: 'other' }[id]) ? 'yes' : 'no';
    }
    P.box('acc', 30, 50, 262, 60, { cls: cls('acc'), title: 'Account', sub: [kw + ' int balance'].concat(c.from === 'same' ? ['this.balance in read()'] : ['the member being read']), right: reach('acc') });
    P.box('tel', 30, 146, 262, 50, { cls: cls('tel'), title: 'Teller', sub: 'Another class, same package', right: reach('tel') });
    P.box('sav', 388, 50, 262, 60, { cls: cls('sav'), title: 'SavingAccount', sub: ['Subclass of Account'].concat(c.from === 'subThis' ? ['this.balance'] : c.from === 'subChild' ? ['SavingAccount other'] : c.from === 'subParent' ? ['Account other'] : []), right: reach('sav') });
    P.box('rep', 388, 146, 262, 50, { cls: cls('rep'), title: 'Report', sub: 'Class unrelated to Account', right: reach('rep') });
    if (seen && src !== 'acc') {
      var ac = s.verdict === 'ok' ? 'good' : s.verdict === 'no' ? 'bad' : 'dash mut', lb = s.verdict === 'ok' ? 'can read' : s.verdict === 'no' ? 'blocked' : c.from === 'pkg' || c.from === 'other' ? 'acc.balance' : c.from === 'subThis' ? 'this.balance' : 'other.balance';
      P.arrow('ar', src === 'tel' ? 'tel:t' : src === 'sav' ? 'sav:l' : 'rep:l', src === 'tel' ? 'acc:b' : src === 'sav' ? 'acc:r' : 'acc:r:0.85', { cls: ac, label: lb });
    }
    P.box('res', 16, 230, 648, 48, { cls: s.verdict === 'ok' ? 'good' : s.verdict === 'no' ? 'bad' : 'ghost', title: s.verdict === 'ok' ? 'Compilation succeeded' : s.verdict === 'no' ? 'Compile-time error' : 'Compilation result', sub: s.verdict === 'ok' ? s.reason : s.verdict === 'no' ? s.msg : 'still checking' });
    P.note('At the last step, the right side of each box shows whether code in that place can read the member with this access modifier. "conditional" means that the access works only through its own type (this or a variable of type SavingAccount).');
  },
  assume: 'The 24 combinations were actually compiled on JDK 21 in our test environment from source files split into the packages bank and app, and whether compilation succeeded and the error messages were checked against the results (this lab looks at the result of compilation, not the result of execution). The "Reason for the decision" column and the order of the checks are an explanation that restates the access rules of the Java Language Specification, and they do not mean that the compiler actually checks in this order. When the same access modifiers were put on a method instead of a field and compiled, success and error were exactly the same for the 24 combinations (the wording of the error messages differs in part). Not covered: access modifiers on the class itself, constructors, static members, nested classes, and modules (module-info). The "only through its own type" condition of protected applies to members that are not static. The error messages are the first line of the English javac message.',
});
