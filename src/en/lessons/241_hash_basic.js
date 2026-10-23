Lab.register({
  id: 'hash_basic', nav: 'Hashing', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['pwhash'],
  title: 'What is a hash, and why do we store passwords as hashes?',
  why: 'If you store passwords as they are, then the moment the database leaks or an administrator looks inside it, the passwords of all members are exposed, and other sites where the same password is used are put at risk too. If you store a hash of the password, the server can check only "is what was entered correct?" without keeping the original password, and even if someone steals the stored value, they cannot log in with that value right away.',
  use: 'For a service with sign-up and login, storing a hash of the password is the basic practice. A service built with Spring makes the value to store with encode of PasswordEncoder (often BCryptPasswordEncoder), which Spring Security provides, and checks it with matches at login. A hash that is calculated fast, such as SHA-256, is calculated with MessageDigest, which Java provides, and it is used to check that a downloaded file was not changed on the way.',
  intro: 'A hash function is a calculation that gives a mixed-up value of a fixed length, whatever text you put in. The same text gives the same value, a change of even one character gives a completely different value, and you cannot calculate the original text backwards from the value that came out. So at sign-up the server stores not the password itself but the hashed value, and at login it only checks whether the text that was entered matches that value. In a service built with Spring, PasswordEncoder, which Spring Security provides, does this work. In the code, encoder.encode("pass1234") makes the value to store, and encoder.matches(input, saved) checks whether the input is correct. PasswordEncoder is an interface, and here we use BCryptPasswordEncoder, which implements it with a password-only hash called BCrypt. Each time encode runs, it makes a new random value (a salt) and calculates it together with the password, so even the same pass1234 gives a different value each time you call encode. For comparison, the lab also has code that calculates SHA-256 itself with MessageDigest, which Java provides, and stores that, and code that stores the password as it is. With the three ways of storing, you enter the correct password, a password that differs by one character, and the stored value itself, and see how login goes. (saved, input, and ok are variable names chosen for this lab.)',
  terms: ['Hash function', 'One-way function', 'PasswordEncoder', 'bcrypt', 'Salt', 'MessageDigest', 'Password hashing'],
  controls: [
    { id: 'store', label: 'What the server stores at sign-up', type: 'select', value: 'bcrypt', options: [['bcrypt', 'Store the value that PasswordEncoder makes: encoder.encode("pass1234")'], ['sha', 'Store a value calculated directly with SHA-256: MessageDigest'], ['plain', 'Store the password as it is: "pass1234"']] },
    { id: 'input', label: 'What is entered at login', type: 'select', value: 'right', options: [['right', 'Enter pass1234'], ['typo', 'Enter pass1235, which differs by one character'], ['stolen', 'Enter the stored value (saved) as it is'], ['eq', 'Enter pass1234, and instead of matches, encode again and compare with equals']], hint: 'The choice that compares with equals can be picked only when you store with PasswordEncoder, so with the other ways of storing it changes to entering pass1234.' },
  ],
  // The choice that compares with encode and equals instead of matches exists only when storing with PasswordEncoder
  fix: function (c) { return c.store !== 'bcrypt' && c.input === 'eq' ? { input: 'right' } : null; },
  // q is the question shown in the question-style screen; t and d are the name and description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What value does PasswordEncoder store for a password, and what does it use to check at login?', d: 'encode makes a 60-character value that starts with $2a$10$ and stores it, and at login matches checks whether the input matches that value. The password is correct, so it is true.', v: { store: 'bcrypt', input: 'right' } },
    { t: 'Enter a password that differs by one character', q: 'What if you enter a password that differs by only one character?', d: 'matches returns false, and login fails.', v: { store: 'bcrypt', input: 'typo' } },
    { t: 'Encode again and compare with equals', q: 'What if you encode the correct password again and compare it with the stored value using equals?', d: 'encode makes a new salt each time and gives a different value, so you get false even though the password is correct. To compare with a stored value, use matches.', v: { store: 'bcrypt', input: 'eq' } },
    { t: 'Enter the stored value', q: 'What if you steal the stored value and enter it as it is in the password field?', d: 'matches calculates the input as a password, so it differs from the stored value, and login fails.', v: { store: 'bcrypt', input: 'stolen' } },
    { t: 'Calculate SHA-256 directly and store it', q: 'What if you calculate SHA-256 directly with MessageDigest, store it, and compare?', d: 'There is no salt, so the same text always gives the same 64-character value however many times you calculate it. So you can calculate again and compare with equals, but members who use the same password also have the same stored value.', v: { store: 'sha', input: 'right' } },
    { t: 'Enter a password that differs by one character into SHA-256', q: 'How much does the value change if you put a password that differs by only one character into SHA-256?', d: 'The value of pass1235 differs from the value of pass1234 in 61 of the 64 characters.', v: { store: 'sha', input: 'typo' } },
    { t: 'Enter a value that was stored as it is', q: 'What if you steal the stored value from a server that stores the password as it is, and enter it?', d: 'The stored value is the password itself, so you log in as it is.', v: { store: 'plain', input: 'stolen' } },
  ],
  // Values that were actually calculated (verify/spring/hash_basic_probe.out.txt)
  // H1~H3: MessageDigest SHA-256. pass1234, pass1235, and the value that hashes the hash value of pass1234 (64 characters) once more
  H1: 'bd94dcda26fccb4e68d6a31f9b5aac0b571ae266d822620e901ef7ebe3a11d4f',
  H2: '2fe9191f10fe5bd05a49355ea886e7fece20492469060faaf066dda7b533ca75',
  H3: '9277570d4006cc0fdb73af3c61fd5036ed9c626e1d6e4aec535045e353e0e0b9',
  DIFF: 61,
  // B1, B2: the two values that encode("pass1234") of BCryptPasswordEncoder gave (an example from one run; it differs every run)
  // BT, BS: the values that matches calculated with the salt of B1 for pass1235, and for B1 itself (BCrypt.hashpw(input, B1))
  B1: '$2a$10$rlL85YF/J1.aZXD3Bv0GWekFKyqt/OrhKPdwFShdqxkvr3HaDO/4a',
  B2: '$2a$10$laSZMbdPIh0qEtYaXA19HuvcwaklZXp9twjqx7wtIxD0CjCSIX292',
  BT: '$2a$10$rlL85YF/J1.aZXD3Bv0GWe57kzrc.cLrmJiyqWAgsrQm8vcC5LxEO',
  BS: '$2a$10$rlL85YF/J1.aZXD3Bv0GWe1Do6FD0JqXXGbY9gy2w5leOK2rvu5ra',
  NOCALC: 'Not calculated (input compared as is)',
  // The rule for shortening a value. SHA-256: the first 12 characters and '… (64 chars)'. BCrypt: the first 11 characters (marker, cost, first 4 characters of the salt) and the last 6, and '(60 chars)'
  cut: function (v) { return v.slice(0, 12) + '… (64 chars)'; },
  cutB: function (v) { return v.slice(0, 11) + '…' + v.slice(-6) + ' (60 chars)'; },
  code: function (c) {
    c = Object.assign({}, c, this.fix(c));
    var o = [], inExpr = { right: '"pass1234"', typo: '"pass1235"', stolen: 'saved', eq: '"pass1234"' }[c.input];
    o.push('// Only the lines inside the main method are shown (the import lines and the class and main declarations are omitted)');
    if (c.store === 'bcrypt') {
      o.push('PasswordEncoder encoder = new BCryptPasswordEncoder();', '');
      o.push('// At sign-up: encode stores the hash of the password', 'String saved = encoder.encode("pass1234");', '');
      if (c.input === 'eq') o.push('// At login: encode the input again and compare with equals (a wrong way to write it)', 'String input = "pass1234";', 'boolean ok = encoder.encode(input).equals(saved);');
      else o.push('// At login: pass the entered text and the stored value to matches to compare', 'String input = ' + inExpr + ';', 'boolean ok = encoder.matches(input, saved);');
    } else if (c.store === 'sha') {
      o.push('MessageDigest md = MessageDigest.getInstance("SHA-256");', 'HexFormat hex = HexFormat.of();', '');
      o.push('// At sign-up: hash the password with SHA-256, turn it into hexadecimal text, and store it', 'String saved = hex.formatHex(md.digest("pass1234".getBytes(StandardCharsets.UTF_8)));', '');
      o.push('// At login: hash the input the same way and compare it with the stored value using equals', 'String input = ' + inExpr + ';', 'String calc = hex.formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));', 'boolean ok = calc.equals(saved);');
    } else {
      o.push('// At sign-up: store the password as it is', 'String saved = "pass1234";', '');
      o.push('// At login: compare the input with the stored value as it is, using equals', 'String input = ' + inExpr + ';', 'boolean ok = input.equals(saved);');
    }
    o.push('', 'System.out.println(saved);', 'System.out.println(ok);');
    return o.join('\n');
  },
  label: function (c) { return { bcrypt: 'Stored with PasswordEncoder', sha: 'Stored with SHA-256', plain: 'Stored as it is' }[c.store] + ' · ' + { right: 'enter pass1234', typo: 'enter pass1235', stolen: 'enter the stored value', eq: 'encode again and equals' }[c.input]; },
  columns: ['Value stored on the server', 'Value calculated from the input', 'Login'],
  simulate: function (c) {
    c = Object.assign({}, c, this.fix(c));
    var ev = [], sum = [], self = this, S = c.store;
    var typed, saved, calc, same;
    var st = { hot: '', phase: '', fn: '', ar: [], inTxt: '', outTxt: '', svTxt: '', icTxt: '', cmp: '', login: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var inLine = 'The line String input = ' + { right: '"pass1234"', typo: '"pass1235"', stolen: 'saved', eq: '"pass1234"' }[c.input] + '; runs. Now it is login. ';
    var pre = function (v) { return v.slice(0, 12); };

    if (S === 'bcrypt') {
      saved = this.B1;
      typed = { right: 'pass1234', typo: 'pass1235', stolen: saved, eq: 'pass1234' }[c.input];
      calc = { right: this.B1, typo: this.BT, stolen: this.BS, eq: this.B2 }[c.input];
      same = calc === saved;
      var typedB = { right: 'The user enters pass1234 in the password field.', typo: 'The user enters pass1235, which differs by one character from the password at sign-up, in the password field.', stolen: 'A person who stole the stored value enters the 60 characters of the stored value as they are in the password field.', eq: 'The user enters pass1234, the same as at sign-up, in the password field.' }[c.input];
      // Sign-up
      st.phase = 'signup'; st.hot = 'fn'; st.fn = 'enc'; st.ar = [];
      push('The line PasswordEncoder encoder = new BCryptPasswordEncoder(); runs. The type of the variable encoder is PasswordEncoder, and its value is a BCryptPasswordEncoder object. PasswordEncoder is an interface that Spring Security provides, and BCryptPasswordEncoder is a class, also provided by Spring Security, that implements it with a password-only hash called BCrypt.', '');
      st.inTxt = 'pass1234'; st.ar = [['a1', 'hot']];
      push('The line String saved = encoder.encode("pass1234"); runs. At the moment of sign-up, encode receives the password pass1234 that the user chose. encode first makes a new random value (a salt), and calculates that salt and the password together with BCrypt. BCrypt is a hash that is deliberately made slow by repeating the calculation many times.', '');
      st.hot = 'out'; st.outTxt = this.cutB(saved); st.ar = [['a1', 'mut'], ['a2', 'hot']];
      push('The value that comes out is 60 characters long and starts with $2a$10$. $2a$ is the marker that the value was made with BCrypt, 10 is the cost value that decides how many times the calculation is repeated, and after that the next 22 characters are the salt and the remaining 31 are the hash result. The value that came out in this run is ' + saved + '. The salt is made new each time, so a different value comes out every run.', '');
      st.hot = 'sv'; st.svTxt = this.cutB(saved); st.ar = [['a3', 'hot']];
      push('The server stores only this 60-character value in saved. It does not store the original password pass1234. The salt is written at the front of this value, so it is not stored separately.', '');
      // Login
      st.phase = 'login'; st.hot = 'in'; st.inTxt = c.input === 'stolen' ? saved.slice(0, 11) + '…' : typed; st.outTxt = ''; st.ar = [];
      push(inLine + typedB, '');
      if (c.input === 'eq') {
        st.hot = 'fn'; st.fn = 'enc'; st.ar = [['a1', 'hot']];
        push('encoder.encode(input) runs. As at sign-up, encode makes a new salt and calculates with it. It does not use the salt from sign-up.', '');
        st.hot = 'out'; st.outTxt = this.cutB(calc); st.icTxt = this.cutB(calc); st.ar = [['a1', 'mut'], ['a2', 'hot'], ['a4', 'hot']];
        push('The value that comes out is ' + calc + '. Even though it is the same pass1234, the salt is different, so 60 characters that are completely different from saved came out, except for the $2a$10$ at the front.', '');
        st.hot = 'ic'; st.ar = []; st.cmp = 'diff'; st.login = 'Failure';
        push('When .equals(saved) compares the two values, they differ, so ok is false. Login fails even though you entered the correct password. To compare with a stored value, you must use matches, not equals.', 'bad');
      } else {
        st.hot = 'fn'; st.fn = 'match'; st.ar = [['a1', 'hot'], ['a6', 'hot']];
        push('encoder.matches(input, saved) runs. matches reads the cost and the salt from the front of saved, and calculates the entered text with BCrypt using the same salt as at sign-up. It differs from encode in that it does not make a new salt.', '');
        st.hot = 'out'; st.outTxt = this.cutB(calc); st.icTxt = this.cutB(calc); st.ar = [['a1', 'mut'], ['a6', 'mut'], ['a2', 'hot'], ['a4', 'hot']];
        if (c.input === 'right') push('The value it calculated is the same 60 characters as saved. This is because the same password was calculated with the same salt.', '');
        else if (c.input === 'typo') push('In the value it calculated, the first 29 characters (the marker, the cost, and the salt) are the same as in saved, but the last 31 characters, the hash result, differ. Even if you calculate with the same salt, if the password differs by one character, the hash result differs.', '');
        else push('The text that was entered is not a password but the 60 characters of the stored value, but to matches it is just a password that was entered. The value calculated from those 60 characters with the same salt differs from saved in the last 31 characters.', '');
        st.hot = 'ic'; st.ar = []; st.cmp = same ? 'same' : 'diff'; st.login = same ? 'Success' : 'Failure';
        if (c.input === 'right') push('matches compares the value it calculated with saved, and they are the same, so it returns true and ok is true. Login succeeds. matches does not return the value it calculated; it returns only whether it matched (true or false). The server did not keep the original password, but it still checked whether it matched.', 'good');
        else if (c.input === 'typo') push('matches compares the value it calculated with saved, and they differ, so it returns false and ok is false. It means the input was not the same as the password at sign-up, so login fails.', 'bad');
        else push('matches compares the value it calculated with saved, and they differ, so it returns false and ok is false. Even if you know the stored value, you cannot log in just by putting that value in the password field.', 'bad');
      }
      st.hot = '';
      push('System.out.println(saved) prints the 60-character stored value, and System.out.println(ok) prints ' + same + '. If you run it again, saved is printed as a different 60 characters, but ok stays the same.', '');
    } else if (S === 'sha') {
      var HASHES = { pass1234: this.H1, pass1235: this.H2 }; HASHES[this.H1] = this.H3;
      saved = this.H1;
      typed = { right: 'pass1234', typo: 'pass1235', stolen: saved }[c.input];
      calc = HASHES[typed]; same = calc === saved;
      var typedS = { right: 'The user enters pass1234 in the password field.', typo: 'The user enters pass1235, which differs by one character from the password at sign-up, in the password field.', stolen: 'A person who stole the stored value enters the 64 characters of the stored value, ' + pre(saved) + '…, as they are in the password field.' }[c.input];
      st.phase = 'signup'; st.hot = 'fn'; st.fn = 'sha'; st.ar = [];
      push('The line MessageDigest md = MessageDigest.getInstance("SHA-256"); runs. MessageDigest is a hash calculation class that Java provides, and getInstance("SHA-256") returns an object that calculates with SHA-256. HexFormat on the next line is also a class that Java provides, and it is used to turn the 32 bytes of the result into the characters 0-9 and a-f.', '');
      st.inTxt = 'pass1234'; st.ar = [['a1', 'hot']];
      push('The line String saved = hex.formatHex(md.digest("pass1234".getBytes(StandardCharsets.UTF_8))); runs. Read it from the innermost parentheses. getBytes turns the text pass1234 into bytes, md.digest calculates those bytes with SHA-256 and returns 32 bytes, and hex.formatHex turns them into 64 characters.', '');
      st.hot = 'out'; st.outTxt = this.cut(saved); st.ar = [['a1', 'mut'], ['a2', 'hot']];
      push('The value that comes out is 64 characters of 0-9 and a-f, and its first 12 characters are ' + pre(saved) + '. Whether the input is 1 character or 100 characters, the value that comes out is 64 characters. SHA-256 does not mix in a salt, so when you put in the same text, the same value comes out whenever you calculate it.', '');
      st.hot = 'sv'; st.svTxt = this.cut(saved); st.ar = [['a3', 'hot']];
      push('The server stores only this 64-character value in saved. It does not store the original password pass1234.', '');
      st.phase = 'login'; st.hot = 'in'; st.inTxt = c.input === 'stolen' ? pre(saved) + '…' : typed; st.outTxt = ''; st.ar = [];
      push(inLine + typedS, '');
      st.hot = 'fn'; st.ar = [['a1', 'hot']];
      push('The line String calc = hex.formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8))); runs. It calculates the entered text in exactly the same way as at sign-up.', '');
      st.hot = 'out'; st.outTxt = this.cut(calc); st.icTxt = this.cut(calc); st.ar = [['a1', 'mut'], ['a2', 'hot'], ['a4', 'hot']];
      if (c.input === 'right') push('The value that comes out is ' + pre(calc) + '…, which is the same as the value that came out of pass1234 at sign-up. This is because the same text always gives the same value.', '');
      else if (c.input === 'typo') push('The value that comes out is ' + pre(calc) + '…. pass1235 differs from pass1234 by only one character, but the value that comes out is completely different. Of the 64 characters, ' + this.DIFF + ' differ from the value at sign-up.', '');
      else push('The text that was entered is not a password but the 64 characters of the stored value, but to the part that calculates, it is just text that was put in. The value that hashes those 64 characters is ' + pre(calc) + '…. It is a value hashed one more time, so it differs from the stored value.', '');
      st.hot = 'ic'; st.ar = []; st.cmp = same ? 'same' : 'diff'; st.login = same ? 'Success' : 'Failure';
      if (c.input === 'right') push('calc.equals(saved) runs. The two values are the same, so ok is true and login succeeds. SHA-256 has no salt, so you can simply calculate again and compare with equals. In exchange, members who use the same password also have exactly the same stored value.', 'good');
      else if (c.input === 'typo') push('calc.equals(saved) runs. The two values differ, so ok is false and login fails.', 'bad');
      else push('calc.equals(saved) runs. The two values differ, so ok is false and login fails. Even if you know the stored value, you cannot log in just by putting that value in the password field.', 'bad');
      st.hot = '';
      push('System.out.println(saved) prints the 64-character stored value, and System.out.println(ok) prints ' + same + '. Even if you run it again, saved is printed as the same 64 characters.', '');
    } else {
      saved = 'pass1234';
      typed = { right: 'pass1234', typo: 'pass1235', stolen: saved }[c.input];
      same = typed === saved;
      var typedP = { right: 'The user enters pass1234 in the password field.', typo: 'The user enters pass1235, which differs by one character from the password at sign-up, in the password field.', stolen: 'A person who stole the stored value enters the stored value pass1234 as it is in the password field.' }[c.input];
      st.phase = 'signup'; st.hot = 'sv'; st.inTxt = 'pass1234'; st.svTxt = 'pass1234'; st.ar = [['a5', 'hot']];
      push('The line String saved = "pass1234"; runs. At the moment of sign-up, the server does not hash the password pass1234 that the user chose, and stores it in saved as it is.', 'bad');
      st.phase = 'login'; st.hot = 'in'; st.inTxt = typed; st.ar = [];
      push(inLine + typedP, '');
      st.hot = 'sv'; st.ar = [['a5', 'hot']]; st.icTxt = this.NOCALC; st.cmp = same ? 'same' : 'diff'; st.login = same ? 'Success' : 'Failure';
      if (c.input === 'right') push('input.equals(saved) runs. There is no hashing, so it compares the entered text with the stored value as it is, without any calculation, and they are the same, so ok is true. Login succeeds, but the value stored on the server is the password pass1234 itself. Anyone who can see the stored value reads the password as it is.', 'good');
      else if (c.input === 'typo') push('input.equals(saved) runs. There is no hashing, so it compares the entered text with the stored value as it is, without any calculation, and they differ, so ok is false. Login fails. Blocking a wrong password does not require a hash.', 'bad');
      else push('input.equals(saved) runs. There is no hashing, so it compares the entered text with the stored value as it is, without any calculation, and they are the same, so ok is true. The stored value is the password itself, so entering the stolen value is the same as entering the real password, and you log in as it is.', 'bad');
      st.hot = ''; st.ar = [];
      push('System.out.println(saved) prints pass1234, and System.out.println(ok) prints ' + same + '. You can see the password as it is in the printed saved.', 'bad');
    }

    // Summary: the first line is the answer for this setting (question)
    if (S === 'bcrypt') {
      if (c.input === 'right') {
        sum.push('encode of PasswordEncoder turns the password into a 60-character value that starts with $2a$10$, and the server stores only that value. At login, matches(input, saved value) calculated the input again with the salt of the stored value and checked whether it matched, and it was the same pass1234, so it returned true and login succeeded.');
        sum.push('The server did not store the original password, and it did not need to in order to check. Even if the stored value leaks, no method is known to calculate pass1234 backwards from that value. A common password can be found by calculating the candidates one by one and comparing, but BCrypt is deliberately slow to calculate, so that work takes a lot of time.');
      } else if (c.input === 'typo') {
        sum.push('If you enter pass1235, which differs by only one character, matches returns false and login fails. It was calculated with the same salt, but the last 31 characters, the hash result, differ from the stored value.');
        sum.push('The server only has to check whether the value it calculated is the same as the stored value, and this check does not need the original password.');
      } else if (c.input === 'eq') {
        sum.push('If you encode the same password again and compare it with equals, you get false even though the password is correct, and login fails. This is because encode makes a new salt each time and gives a different value.');
        sum.push('To compare with a stored value, use matches(input, saved value). matches reads the salt from the stored value and calculates with the same salt, so if the password is correct, you get true.');
      } else {
        sum.push('Even if you steal the stored value and enter it as it is in the password field, you cannot log in. matches always treats the input as a password and calculates it, so the value calculated from the stored 60 characters differs from the stored value.');
        sum.push('Even if the stored value leaks, you cannot log in with that value, and you cannot see the original password from it either. Compare what happens on a server that stores the password as it is.');
      }
    } else if (S === 'sha') {
      if (c.input === 'right') {
        sum.push('Even if you calculate SHA-256 directly with MessageDigest, you can store a hash of the password and check it. SHA-256 does not mix in a salt, so the same text is always the same 64-character value, and you can calculate the input again and compare it with equals.');
        sum.push('Because of that very property, members who use the same password have the same stored value, and since the calculation is fast, it is also easy to try candidates one by one. PasswordEncoder (BCrypt) prevents both with a salt and a slow calculation.');
      } else if (c.input === 'typo') {
        sum.push('If you put pass1235, which differs by only one character, into SHA-256, a completely different value comes out and login fails. It differs from the stored value in ' + this.DIFF + ' of the 64 characters.');
        sum.push('Even if one character differs, you do not get a similar value; you get a completely different value, so the server only has to check whether the two values are the same.');
      } else {
        sum.push('Even if you steal a value stored with SHA-256 and enter it in the password field, you cannot log in. The server hashes the input one more time, so it becomes a value that differs from the stored value.');
        sum.push('But SHA-256 is fast to calculate, so a person who has the stored value can easily find the original password by calculating common passwords one by one and comparing.');
      }
      sum.push('The code that calculates SHA-256 directly is there to show the properties of a hash. A real service does not store passwords with SHA-256; it uses PasswordEncoder (BCrypt and others).');
    } else if (c.input === 'right') {
      sum.push('If you store the password as it is, without hashing, the value stored on the server is the password itself. Login succeeded, but anyone who can see the stored value (an operator, or a person who stole the stored value) reads pass1234 as it is.');
      sum.push('Login working does not tell you whether it is safe. If you store with PasswordEncoder, login works just the same, and you cannot read the password from the stored value.');
    } else if (c.input === 'typo') {
      sum.push('Even if you store the password as it is, a password that differs by one character fails to log in. Blocking a wrong password works regardless of how you store it.');
      sum.push('What changes with the way of storing is not login but what happens when the stored value leaks. Change to the setting that enters the stored value and compare.');
    } else {
      sum.push('If you steal the stored value from a server that stores the password as it is and enter it in the password field, you log in as it is. This is because the stored value is the password itself.');
      sum.push('On a server that stores with PasswordEncoder, the same action fails. matches calculates the input as a password, so it becomes a value that differs from the stored value.');
    }
    var row = S === 'bcrypt' ? [this.cutB(saved), this.cutB(calc), same ? 'Success' : 'Failure']
      : S === 'sha' ? [this.cut(saved), this.cut(calc), same ? 'Success' : 'Failure']
      : [saved, this.NOCALC, same ? 'Success' : 'Failure'];
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the server receiving the sign-up.'); return; }
    var rows = [];
    if (s.svTxt) rows.push({ cls: '', cells: ['Value stored on the server', s.svTxt] });
    if (s.icTxt) rows.push({ cls: '', cells: ['Value calculated from the input', s.icTxt] });
    if (s.login) rows.push({ cls: '', cells: ['Login', { v: s.login, cls: s.login === 'Success' ? 'good' : 'bad' }] });
    if (rows.length) H.table(v, ['Item', 'Value'], rows, 'Sign-up and login');
  },
  // Diagram: at the top, the input text → the hash calculation (encode, matches, MessageDigest) → the value that came out; at the bottom, the value stored on the server and the value calculated from the input are placed side by side, and Same/Different is shown.
  // For matches, an arrow from the stored value to the hash calculation is added (matches receives saved and reads the salt), and the name of the value box is 'Value calculated by matches' (matches does not return this value). At the very bottom is the login result box.
  // If the password is stored as it is, the hash calculation box becomes dotted and the password is visible in the stored box.
  draw: function (P, sim, shown) {
    var c = sim.c, S = c.store, h = S !== 'plain', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 262);
    var hot = s ? s.hot : '';
    var fnT = !h ? 'Hash calculation' : S === 'sha' ? 'MessageDigest' : s && s.fn === 'match' ? 'matches' : 'encode';
    var fnS = !h ? 'Not used' : S === 'sha' ? ['SHA-256', 'No salt'] : s && s.fn === 'match' ? ['BCrypt', 'Salt from saved'] : ['BCrypt', 'Makes a new salt'];
    P.box('in', 14, 16, 134, 78, { cls: hot === 'in' ? 'hot now' : 'plain', title: 'Input text', sub: s && s.inTxt ? s.inTxt : 'Not yet' });
    P.box('fn', 204, 16, 156, 78, { cls: !h ? 'ghost' : hot === 'fn' ? 'hot now' : 'plain', title: fnT, sub: fnS });
    P.box('out', 416, 16, 250, 78, { cls: !h ? 'ghost' : hot === 'out' ? 'hot now' : 'plain', title: S === 'bcrypt' && s && s.fn === 'match' ? 'Value calculated by matches' : 'Value that came out', sub: !h ? 'Not calculated' : s && s.outTxt ? s.outTxt : 'Not yet' });
    var mark = s && s.cmp ? (s.cmp === 'same' ? 'Same' : 'Different') : '';
    P.box('sv', 14, 130, 300, 62, { cls: !h && s && s.svTxt ? 'bad' : hot === 'sv' ? 'hot now' : 'plain', title: 'Value stored on the server', right: !h ? mark : '', sub: s && s.svTxt ? s.svTxt : 'Not yet' });
    P.box('ic', 334, 130, 332, 62, { cls: !h ? 'ghost' : s && s.cmp ? (s.cmp === 'same' ? 'good' : 'bad') : hot === 'ic' ? 'hot now' : 'plain', title: 'Calculated from input', right: h ? mark : '', sub: !h ? 'Not calculated (input compared as is)' : s && s.icTxt ? s.icTxt : 'Not yet' });
    P.box('lg', 14, 212, 652, 40, { cls: s && s.login ? (s.login === 'Success' ? 'good' : 'bad') : 'ghost', title: 'Login', right: s ? s.login : '' });
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
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21), and PasswordEncoder and BCryptPasswordEncoder are from Spring Security 7.1.1 (spring-security-crypto 7.1.1). For all ten combinations (4 for storing with PasswordEncoder, 3 for storing with SHA-256, and 3 for storing as it is), the code on the screen was wrapped in the frame of the import lines, a class, and a main method (throws Exception) to make the source, which was compiled with javax.tools, loaded with a new class loader, and main was run (verify/spring/src/HashBasicProbe.java). What was checked is whether the code on the screen is the same text as that part of the source that was run, and the saved and ok that the program printed. The saved of BCrypt is different every run, so what was checked is whether the saved from the run has the form of $2a$10$ followed by 53 characters and whether ok is the same as the login in the result table. The two BCrypt values (B1 and B2) shown on the screen and in the result table are examples copied from the values that came out when encode("pass1234") was actually called twice, and for both values it was confirmed that matches("pass1234", value) is true and that the two values differ from each other. The value that matches calculates is not returned by matches, so it was shown by calculating it with BCrypt.hashpw(input, stored value) of Spring Security. Looking with javap, matches of BCryptPasswordEncoder calls BCrypt.checkpw, and checkpw calculates the input with the cost and salt of the stored value and compares it with the stored value. For each combination that was run, the value calculated with hashpw was the same as saved, and the result of matches was the same. When the same password was encoded 20 times, all 20 values and salts were different and matches was true for all of them, and when the values encoded again were compared with equals, it was false. The measured time was tens of ms for one matches (about 59ms and 78ms in two runs) and less than 0.1ms for one SHA-256 (it depends on the CPU). If you create BCryptPasswordEncoder without arguments, the cost is 10 and the value starts with $2a$. The Spring Security documentation (Password Storage) explains that PasswordEncoder lets you transform a password one way so that it is stored safely, and introduces DelegatingPasswordEncoder, made with PasswordEncoderFactories.createDelegatingPasswordEncoder(), so that you can change the storage method later. The value this makes is a BCrypt value with {bcrypt} at the front (it was confirmed by running that it starts with {bcrypt}$2a$10$). This lab created BCryptPasswordEncoder directly to show what PasswordEncoder does. In a Spring Boot application, you usually register PasswordEncoder as a bean and use it. For the SHA-256 side, to check that the calculation follows the standard, two standard examples of SHA-256 (the message "abc" and a 56-character message) were calculated with MessageDigest and compared with the NIST example document and the values in RFC 6234, and 7 inputs (including an empty text, 1 character, and 100 characters) were also calculated with Node.js crypto and openssl dgst -sha256, and the values of the three implementations were confirmed to be the same. The SHA-256 values of pass1234 and pass1235 differ in 61 of the 64 characters (this is the value observed with these inputs), and the result is 64 characters whether the input is 0, 1, or 100 characters. NIST FIPS 180-4 (Secure Hash Standard) defines SHA-256 as a one-way hash function that makes a value called a digest from a message, and says that if the message changes even a little, a different digest comes out with very high probability. The OWASP Password Storage Cheat Sheet says not to store passwords in plaintext but to hash them, says that a fast hash such as SHA-256 is not suitable for storing passwords, and says to add a salt that is unique to each user and to use a slow password-only function such as Argon2id, scrypt, bcrypt, or PBKDF2. In this lab, "you cannot calculate it backwards" does not mean that it has been proven mathematically, but that no practical method is known, and a short and common password can be found by calculating the candidates one by one and comparing them with the stored value. The code on the screen writes sign-up and login one after the other in a single run. In a real service, sign-up and login are different requests, saved is kept in the database, and it is assumed that the server receives the password text that the user entered and calculates it. The fact that BCrypt uses only the first 72 bytes of the password, how to choose the cost, changing a stored value to a stronger method, and hash collisions are not covered (the detailed behavior of BCrypt is covered in the "In-depth lab: Password hashing"). The hash function in this lab is a cryptographic hash function, and its use is different from the hash code of HashMap.',
});
