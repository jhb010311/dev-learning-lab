Lab.register({
  id: 'hash_basic', nav: 'Hashing', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['pwhash'],
  title: 'What is a hash, and why do we store passwords as hashes?',
  intro: 'A hash function is a calculation that gives a mixed-up value of a fixed length, whatever text you put in. The sha256("pass1234") in the code is the line that puts pass1234 into the hash function called SHA-256, and the value that comes out is 64 characters of 0-9 and a-f. A hash function has three properties. If you put in the same text, you always get the same value. If even one character is different, you get a completely different value. And you cannot calculate the original text backwards from the value that came out. So at sign-up, the server stores the hash value, not the password itself, and at login, it hashes the entered text the same way and only checks whether it is the same as the stored value. In this lab, you enter the right password, a password that differs by one character, and the stored value itself, once for a server that hashes and stores the password and once for a server that stores it as it is, and you see what happens to the login. (A real service does not store passwords with SHA-256. It uses a dedicated function. See the explanation below for details.)',
  terms: ['Hash function', 'One-way function', 'Password hashing', 'Hash function and salt'],
  controls: [
    { id: 'store', label: 'What the server stores at sign-up', type: 'select', value: 'hash', options: [['hash', 'Store the hash value: sha256("pass1234")'], ['plain', 'Store the password as it is: "pass1234"']] },
    { id: 'input', label: 'What you enter at login', type: 'select', value: 'right', options: [['right', 'Enter pass1234 at login'], ['typo', 'Enter pass1235, which differs by one character'], ['stolen', 'Enter the stored value (saved) as it is']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a hash look like, and what does the server compare at login?', d: 'The password is hashed and stored, and at login the input is hashed the same way and compared. The values are the same, so login succeeds.', v: { store: 'hash', input: 'right' } },
    { t: 'Entering a password that differs by one character', q: 'What if you enter a password that differs by one character?', d: 'The hash of pass1235 is completely different from that of pass1234, so login fails.', v: { store: 'hash', input: 'typo' } },
    { t: 'Storing without hashing', q: 'What if you store the password as it is, without hashing?', d: 'Login works, but the value stored on the server is the password itself.', v: { store: 'plain', input: 'right' } },
    { t: 'Entering the stored hash value', q: 'What if you steal the stored hash value and enter it as it is in the password field?', d: 'That value is hashed again, so it differs from the stored value and login fails.', v: { store: 'hash', input: 'stolen' } },
    { t: 'Entering the value stored as it is', q: 'What if you steal the stored value from the server that stores it as it is, and enter it?', d: 'The stored value is the password itself, so you log in as it is.', v: { store: 'plain', input: 'stolen' } },
  ],
  // Values from the actual SHA-256 calculation (verify/plain/HashBasicProbe.out.txt, and the same in verify/en/HashBasicEnProbe.out.txt): pass1234, pass1235, and the hash of the hash value of pass1234
  H1: 'bd94dcda26fccb4e68d6a31f9b5aac0b571ae266d822620e901ef7ebe3a11d4f',
  H2: '2fe9191f10fe5bd05a49355ea886e7fece20492469060faaf066dda7b533ca75',
  H3: '9277570d4006cc0fdb73af3c61fd5036ed9c626e1d6e4aec535045e353e0e0b9',
  DIFF: 61,
  NOCALC: 'No calculation (input compared as it is)',
  // Rule for shortening a value: the first 12 characters and '… (64 chars)'
  cut: function (v) { return v.slice(0, 12) + '… (64 chars)'; },
  code: function (c) {
    var h = c.store === 'hash', o = [];
    o.push(h ? '// At sign-up: store the hash value, not the password itself' : '// At sign-up: store the password as it is');
    o.push(h ? 'String saved = sha256("pass1234");' : 'String saved = "pass1234";');
    o.push('', h ? '// At login: hash the input the same way and compare it with the stored value' : '// At login: compare the input with the stored value as it is');
    o.push('String input = ' + { right: '"pass1234"', typo: '"pass1235"', stolen: 'saved' }[c.input] + ';');
    o.push(h ? 'boolean ok = sha256(input).equals(saved);' : 'boolean ok = input.equals(saved);');
    o.push('', 'System.out.println(saved);', 'System.out.println(ok);');
    return o.join('\n');
  },
  label: function (c) { return (c.store === 'hash' ? 'Hash value stored' : 'Stored as it is') + ' · ' + { right: 'pass1234 entered', typo: 'pass1235 entered', stolen: 'Stored value entered' }[c.input]; },
  columns: ['Value stored on the server', 'Value calculated from the input', 'Login'],
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
    var typedTxt = { right: 'The user enters pass1234 in the password field.', typo: 'The user enters pass1235, which differs by one character from the one at sign-up, in the password field.', stolen: h ? 'The person who stole the stored value enters the stored 64-character value ' + pre(saved) + '… as it is in the password field.' : 'The person who stole the stored value enters the stored value pass1234 as it is in the password field.' }[c.input];
    var inLine = 'The String input = ' + { right: '"pass1234"', typo: '"pass1235"', stolen: 'saved' }[c.input] + '; line runs. Now it is login. ';

    if (h) {
      // Sign-up
      st.phase = 'signup'; st.hot = 'fn'; st.inTxt = 'pass1234'; st.ar = [['a1', 'hot']];
      push('The String saved = sha256("pass1234"); line runs. At the moment of sign-up, the server puts the password "pass1234" that the user chose into a hash function. A hash function is a calculation that gives a mixed-up value of a fixed length, whatever text you put in, and here it uses SHA-256. sha256 is a helper method that does this calculation (the code is shortened).', '');
      st.hot = 'out'; st.outTxt = this.cut(saved); st.ar = [['a1', 'mut'], ['a2', 'hot']];
      push('The calculation gives a mixed-up value 64 characters long. It is 64 characters of 0-9 and a-f, and the first 12 are ' + pre(saved) + '. Whether the input is 1 character or 100 characters, the value that comes out is always 64 characters, and if you put in the same text, you get the same value whenever you calculate.', '');
      st.hot = 'sv'; st.svTxt = this.cut(saved); st.ar = [['a3', 'hot']];
      push('The server stores only this 64-character value in saved. It does not store the original password pass1234. A hash function is made so that finding the original text from the value that came out is not practically possible, so you cannot learn pass1234 by calculating backwards from the stored value.', '');
      // Login
      st.phase = 'login'; st.hot = 'in'; st.inTxt = inShow; st.outTxt = ''; st.ar = [];
      push(inLine + typedTxt, '');
      st.hot = 'fn'; st.ar = [['a1', 'hot']];
      push('sha256(input) runs. The server puts the entered text into the same hash function as at sign-up. The server does not have the password from sign-up, so the only way is to hash the input the same way and compare it with the stored value.', '');
      st.hot = 'out'; st.outTxt = this.cut(calc); st.icTxt = this.cut(calc); st.ar = [['a1', 'mut'], ['a2', 'hot'], ['a4', 'hot']];
      if (c.input === 'right') push('The value that came out is ' + pre(calc) + '…, which is the same as the value that came out of pass1234 at sign-up. This is because the same text always gives the same value.', '');
      else if (c.input === 'typo') push('The value that came out is ' + pre(calc) + '…. pass1235 differs from pass1234 by only one character, but the value that came out is completely different. Of the 64 characters, ' + this.DIFF + ' are characters that differ from the value at sign-up.', '');
      else push('The text entered is not a password but the 64-character stored value, but to the hash function it is just text that was put in. Hashing those 64 characters gives the value ' + pre(calc) + '…. It is a value hashed one more time, so it differs from the stored value.', '');
      st.hot = 'ic'; st.ar = []; st.cmp = same ? 'same' : 'diff'; st.login = same ? 'Success' : 'Failure';
      if (c.input === 'right') push('sha256(input).equals(saved) runs. Comparing the value calculated from the input with the stored value, they are the same, so ok is true. Being the same means that the input was the same as the password at sign-up, so login succeeds. The server did not store the original password, but it could check that the input was right just by comparing hash values.', 'good');
      else if (c.input === 'typo') push('sha256(input).equals(saved) runs. Comparing the value calculated from the input with the stored value, they differ, so ok is false. It means the input was not the same as the password at sign-up, so login fails.', 'bad');
      else push('sha256(input).equals(saved) runs. Comparing the value calculated from the input with the stored value, they differ, so ok is false, and login fails. Even if you know the stored value, you cannot log in just by putting that value into the password field.', 'bad');
      st.hot = '';
      push('System.out.println(saved) prints the 64-character stored value, and System.out.println(ok) prints ' + same + '.', '');
    } else {
      st.phase = 'signup'; st.hot = 'sv'; st.inTxt = 'pass1234'; st.svTxt = 'pass1234'; st.ar = [['a5', 'hot']];
      push('The String saved = "pass1234"; line runs. At the moment of sign-up, the server does not put the password "pass1234" that the user chose into a hash function, and stores it in saved as it is.', 'bad');
      st.phase = 'login'; st.hot = 'in'; st.inTxt = inShow; st.ar = [];
      push(inLine + typedTxt, '');
      st.hot = 'sv'; st.ar = [['a5', 'hot']]; st.icTxt = this.NOCALC; st.cmp = same ? 'same' : 'diff'; st.login = same ? 'Success' : 'Failure';
      if (c.input === 'right') push('input.equals(saved) runs. No hash function is used, so the entered text is compared with the stored value as it is, without calculation, and they are the same, so ok is true. Login succeeds, but the value stored on the server is the password pass1234 itself. Anyone who can see the stored value reads the password as it is.', 'good');
      else if (c.input === 'typo') push('input.equals(saved) runs. No hash function is used, so the entered text is compared with the stored value as it is, without calculation, and they differ, so ok is false. Login fails. Blocking a wrong password does not require hashing.', 'bad');
      else push('input.equals(saved) runs. No hash function is used, so the entered text is compared with the stored value as it is, without calculation, and they are the same, so ok is true. The stored value is the password itself, so entering the stolen value is the same as entering the real password, and you log in as it is.', 'bad');
      st.hot = ''; st.ar = [];
      push('System.out.println(saved) prints pass1234, and System.out.println(ok) prints ' + same + '. You can see the password as it is in the printed saved.', 'bad');
    }

    // Summary: the first line is the answer to this setting (question)
    var tail = 'This lab used SHA-256 as it is to show the properties of a hash. Real password storage uses password-only functions such as BCrypt and Argon2, not SHA-256.';
    if (h && c.input === 'right') {
      sum.push('A hash is a calculation that gives a mixed-up value of a fixed length (64 characters for SHA-256), whatever text you put in. At sign-up, the server stored that value instead of the password, and at login, it hashed the input the same way and only compared it with the stored value. It was the same pass1234, so the same value came out and login succeeded.');
      sum.push('The server did not store the original password, and it did not need it to compare. Even if the stored value leaks, no method is known to calculate pass1234 backwards from that value (but a common password can be found by hashing candidates one by one and comparing).');
    } else if (h && c.input === 'typo') {
      sum.push('If you enter a password that differs by one character, the hashed value is completely different and login fails. The value for pass1235 differs from the stored value in ' + this.DIFF + ' of the 64 characters.');
      sum.push('Even if one character differs, you do not get a similar value but a completely different value, so the server only has to check whether the two values are the same or different. This check does not need the original password.');
    } else if (h) {
      sum.push('If you steal the stored hash value and enter it as it is in the password field, you still cannot log in. The server always treats the input as a password and hashes it, so a value hashed one more time comes out and differs from the stored value.');
      sum.push('Even if the stored value leaks, you cannot log in with it, and you cannot see the original password from the value either. Compare what happens in the same case on the server that stores the password as it is.');
    } else if (c.input === 'right') {
      sum.push('If you store the password as it is, without hashing, the value stored on the server is the password itself. Login succeeded, but anyone who can see the stored value (an operator, a person who stole the stored value) reads pass1234 as it is.');
      sum.push('Login working does not tell you whether it is safe. If you store a hash, login works the same, and the stored value does not contain the password.');
    } else if (c.input === 'typo') {
      sum.push('Even if you store the password as it is, a password that differs by one character fails to log in. Blocking a wrong password works regardless of how you store it.');
      sum.push('How you store it matters not at login but when the stored value leaks. Change to the setting that enters the stored value and compare.');
    } else {
      sum.push('If you steal the stored value from the server that stores the password as it is and enter it in the password field, you log in as it is. This is because the stored value is the password itself.');
      sum.push('On the server that stores a hash, the same input fails. The server hashes the input one more time, and it becomes a value different from the stored value.');
    }
    if (h) sum.push(tail);
    var sv = h ? this.cut(saved) : saved;
    return { events: ev, summary: sum, row: [sv, h ? this.cut(calc) : this.NOCALC, same ? 'Success' : 'Failure'] };
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
  // Diagram: at the top, the input text → the hash function (only a one-way arrow) → the resulting value. Below, the value stored on the server and the value calculated from the input are placed side by side, and Same/Different is shown. At the bottom is the login result box. If the password is stored as it is, the hash function box becomes dotted and the password is visible in the stored box.
  draw: function (P, sim, shown) {
    var c = sim.c, h = c.store === 'hash', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 262);
    var hot = s ? s.hot : '';
    P.box('in', 14, 16, 134, 78, { cls: hot === 'in' ? 'hot now' : 'plain', title: 'Input text', sub: s && s.inTxt ? s.inTxt : 'None yet' });
    P.box('fn', 204, 16, 156, 78, { cls: !h ? 'ghost' : hot === 'fn' ? 'hot now' : 'plain', title: 'Hash function', sub: h ? ['SHA-256', 'Text → value only'] : 'Not used' });
    P.box('out', 416, 16, 250, 78, { cls: !h ? 'ghost' : hot === 'out' ? 'hot now' : 'plain', title: 'Resulting value', sub: !h ? 'No calculation' : s && s.outTxt ? s.outTxt : 'None yet' });
    var mark = s && s.cmp ? (s.cmp === 'same' ? 'Same' : 'Different') : '';
    P.box('sv', 14, 130, 300, 62, { cls: !h && s && s.svTxt ? 'bad' : hot === 'sv' ? 'hot now' : 'plain', title: 'Value stored on the server', right: !h ? mark : '', sub: s && s.svTxt ? s.svTxt : 'None yet' });
    P.box('ic', 334, 130, 332, 62, { cls: !h ? 'ghost' : s && s.cmp ? (s.cmp === 'same' ? 'good' : 'bad') : hot === 'ic' ? 'hot now' : 'plain', title: 'Calculated from input', right: h ? mark : '', sub: !h ? 'No calculation (input compared as it is)' : s && s.icTxt ? s.icTxt : 'None yet' });
    P.box('lg', 14, 212, 652, 40, { cls: s && s.login ? (s.login === 'Success' ? 'good' : 'bad') : 'ghost', title: 'Login', right: s ? s.login : '' });
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
  assume: 'The compiler and the runtime are JDK 21.0.12.1 (javac 21). For all 6 combinations, we wrapped the code on the screen in the frame of the import lines, the sha256 helper method, and the main method to make a source, compiled it with javax.tools, loaded it with a new class loader, and ran Main.main. The import lines, main, and the sha256 method are shortened on the screen, and the shortened sha256 method calculates SHA-256 with MessageDigest and turns it into 64 lowercase hexadecimal characters. What we checked against is whether the code on the screen is the same text as that part of the source that ran, the saved and ok that the program printed, and the value calculated from the input (we got it by calling the sha256 method of the compiled Main on the input). The values in the result table are shortened to the first 12 characters of the stored value and of the value calculated from the input, followed by "… (64 chars)", and we checked the whole values before shortening in the same way. That no calculation happens on the side that stores the password as it is was confirmed by the fact that there is no sha256 call in that code. That the calculation follows the standard was checked by calculating two standard examples of SHA-256 (the message "abc" and a 56-character message) in Java and comparing them with the values in the documents: the value for "abc" is from the NIST SHA-256 example document and the RFC 6234 test vectors, and the value for the 56-character message is from the NIST example document. We also calculated the same 8 inputs (including empty text, 1 character, and 100 characters) with crypto of Node.js and openssl dgst -sha256 on the PC used to write this lab, and confirmed that the values of the three implementations were all the same. We also measured the facts that the step sentences rely on. Hashing the same input twice gives the same value, the hashes of pass1234 and pass1235 differ in 61 of the 64 characters (a value observed for these inputs), and the result is 64 characters even if the input is 0, 1, or 100 characters. We opened the documents ourselves and checked them. NIST FIPS 180-4 (Secure Hash Standard) says in section 1 that SHA-256 and the others are iterative one-way hash functions that make a compressed value called a message digest from an input (the message), and that if the message changes, a different digest comes out with very high probability, the table in section 1 sets the digest size of SHA-256 to 256 bits (64 hexadecimal characters), and the explanation at the beginning of the document says that these are called "secure" hash algorithms in the sense that finding a message that matches a given digest and finding two messages that give the same digest is computationally infeasible. The OWASP Password Storage Cheat Sheet says not to store passwords in plaintext but to hash them, says that a hash is a one-way function so it cannot be turned back into the original password (it is not encryption, it is hashing), and says that weak and common passwords can be found with lists of common passwords or by trying every candidate one by one. In this lab, "cannot be calculated backwards" does not mean it has been proven mathematically, it means there is no known practical method, and a short and common password can be found by hashing the candidates one by one and comparing them with the stored value. This lab used SHA-256, a fast general-purpose hash function, as it is to show the properties of a hash. When a real service stores passwords, it does not use SHA-256 as it is, it uses password-only functions (BCrypt, Argon2, and so on) that are made slow on purpose and mix in a value that differs for each user (a salt). The OWASP document also says that a fast hash algorithm such as SHA-256 is not suitable for storing passwords, recommends Argon2id first, lists scrypt when that cannot be used, bcrypt for legacy systems, and PBKDF2 when FIPS certification is needed, and tells you to add a salt that is unique to each user. The reason and the behavior are covered in the in-depth lab "Password hashing". The code on the screen writes sign-up and login one after the other in a single run. In a real service, sign-up and login are separate requests, saved is kept in a database, and we assumed that the server receives the password text that the user entered and hashes it. A method that hashes the input beforehand on the user\'s device, timing attacks when comparing hash values directly, salts and slow hashes, and hash collisions are not covered. The hash function in this lab is a cryptographic hash function, and it is used for a different purpose from the hash code of HashMap.',
});
