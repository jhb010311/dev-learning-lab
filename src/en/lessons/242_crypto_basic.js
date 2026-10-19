Lab.register({
  id: 'crypto_basic', nav: 'Encryption', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['crypto'],
  title: 'What is encryption, and what happens without the key?',
  intro: 'Encryption means calculating text together with a key to turn it into a value that cannot be read. In this lab\'s code, you pass the text and a key to encrypt("Card number 1234", key), and you get back a value that cannot be read. A party that has the same key passes that value and the key to decrypt(sent, key) and gets the original text back. This is called decryption. A party that has no key, or a different key, cannot get the text back, so what you must protect is the key, not the value. In this lab, you change the key that the receiver has to the same key, a different key, or no key, and sometimes you remove the encryption itself. You see the value that is visible in the middle and what the receiver read, both checked by actually running the code. (newKey, which makes a key, and encrypt and decrypt, which do the calculation, are helper methods written for this lab as examples using the standard Java library (javax.crypto); their bodies are shortened on the screen.)',
  terms: ['Encryption', 'Decryption', 'Key', 'Symmetric-key cryptography and public-key cryptography'],
  controls: [
    { id: 'enc', label: 'Sender (the String sent line)', type: 'select', value: 'on', options: [['on', 'Encrypt with a key and send: encrypt("Card number 1234", key)'], ['off', 'Send the text as it is, without encrypting: "Card number 1234"']] },
    { id: 'reader', label: 'Receiver (the String read line)', type: 'select', value: 'same', options: [['same', 'The receiver decrypts with the same key: decrypt(sent, key)'], ['other', 'The receiver decrypts with a different key: decrypt(sent, otherKey)'], ['none', 'The receiver reads the received value as it is, with no key: sent']], show: function (c) { return c.enc === 'on'; } },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an encrypted value look like, and how does the receiver read it?', d: 'A value encrypted with a key cannot be read, and decrypting it with the same key gives back the original text.', v: { enc: 'on', reader: 'same' } },
    { t: 'Reading without the key', q: 'What if you read that value as it is, without the key?', d: 'You read only a value that cannot be read, and you do not get the text.', v: { enc: 'on', reader: 'none' } },
    { t: 'Decrypting with a different key', q: 'What if you decrypt with a different key?', d: 'decrypt throws an exception and you do not get the text.', v: { enc: 'on', reader: 'other' } },
    { t: 'Sending without encryption', q: 'What if you send it without encrypting?', d: 'The value that is visible in the middle is the text itself, so anyone can read it.', v: { enc: 'off', reader: 'same' } },
  ],
  // Checked values: the first 12 characters and the total number of characters of the value made by the Probe with a fixed key and nonce (in real use it is different every run)
  pt: 'Card number 1234',
  head: 'ih/DXie50GTx',
  wlen: 60,
  excName: 'javax.crypto.AEADBadTagException',
  code: function (c) {
    var o = ['// Only the lines inside main are shown (class, main declaration, imports, and the example helper methods newKey, encrypt, and decrypt omitted)', 'SecretKey key = newKey();                       // Create one key', ''];
    if (c.enc === 'on') {
      o.push('// Sender: encrypt the text with the key', 'String sent = encrypt("Card number 1234", key);', '');
      if (c.reader === 'same') o.push('// Receiver: decrypt with the same key', 'String read = decrypt(sent, key);');
      else if (c.reader === 'other') o.push('// Receiver: decrypt with a different key', 'SecretKey otherKey = newKey();   // a different key', 'String read = decrypt(sent, otherKey);');
      else o.push('// Receiver: read the received value as it is, without a key', 'String read = sent;');
    } else {
      o.push('// Sender: send the text as it is', 'String sent = "Card number 1234";', '', '// Receiver: read what was received as it is', 'String read = sent;');
    }
    o.push('', 'System.out.println(sent);', 'System.out.println(read);');
    return o.join('\n');
  },
  label: function (c) { return c.enc === 'on' ? 'Encrypted · ' + { same: 'decrypted with the same key', other: 'decrypted with a different key', none: 'read without a key' }[c.reader] : 'Not encrypted'; },
  columns: ['Value visible in the middle', 'What the receiver read', 'Original text recovered'],
  simulate: function (c) {
    var PT = this.pt, on = c.enc === 'on', rd = c.reader, ev = [], sum = [];
    var mid = on ? this.head + '… (' + this.wlen + ' chars)' : PT;
    var readTxt = !on ? PT : rd === 'same' ? PT : rd === 'none' ? mid : 'Exception AEADBadTagException: could not decrypt';
    var got = !on || rd === 'same';
    var st = { hot: '', k1: 'none', enc: '', pass: false, rk: '', dec: '', mid: '', rd: '', res: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. Make the key
    st.hot = 'k1'; st.k1 = 'made';
    push('The SecretKey key = newKey(); line runs. The helper method newKey(), written for this lab as an example, makes one key, and the variable key refers to that key. A key is a value that you put into the calculation together with the text, both when you encrypt and when you decrypt.', '');

    if (on) {
      // 2-4. The sender
      st.hot = 'en'; st.enc = 'calc';
      push('On the String sent = encrypt("Card number 1234", key); line, the sender puts the text "Card number 1234" and the key into encrypt. encrypt calculates the text together with the key and turns it into a different value.', '');
      st.hot = 'en'; st.enc = 'done'; st.mid = 'cipher';
      push('The calculation ends, a value that cannot be read comes out, and the variable sent refers to that value. In this lab, a value that starts with ' + this.head + '… and is ' + this.wlen + ' characters long came out. You cannot read "Card number 1234" from this value. If you encrypt the same text again with the same key, a different value comes out, so this value is one example.', '');
      st.hot = 'mid'; st.pass = true;
      st.checks.push(['Value visible in the middle', { v: mid, cls: 'good' }]);
      push('The value of sent goes through the middle (a network or storage) to the receiver. This value is all that is visible in the middle. The text and the key were not sent to the middle, so they are not visible.', '');
      // 5 onward. The receiver
      if (rd === 'same') {
        st.hot = 'de'; st.rk = 'same'; st.dec = 'calc';
        push('On the String read = decrypt(sent, key); line, the receiver puts the received value sent and the same key into decrypt. decrypt does decryption, the calculation that reverses encryption.', '');
        st.dec = 'ok'; st.rd = 'ok'; st.res = 'Yes';
        st.checks.push(['What the receiver read', { v: PT, cls: 'good' }], ['Original text recovered', { v: 'Yes', cls: 'good' }]);
        push('The result of the decryption is the original text "Card number 1234", and the variable read refers to it. This is because you put in the same key that was used to encrypt.', 'good');
        st.hot = '';
        push('System.out.println(sent) prints the whole ' + this.wlen + '-character value that cannot be read, and System.out.println(read) prints Card number 1234.', '');
      } else if (rd === 'other') {
        st.hot = 'k2'; st.rk = 'other';
        push('On the SecretKey otherKey = newKey(); line, the receiver makes one more key with newKey() to use. This key is different from the first key, key.', '');
        st.hot = 'de'; st.dec = 'calc';
        push('On the String read = decrypt(sent, otherKey); line, the receiver puts the received value sent and the different key otherKey into decrypt.', '');
        st.dec = 'fail'; st.rd = 'fail'; st.res = 'No';
        st.checks.push(['What the receiver read', { v: readTxt, cls: 'bad' }], ['Original text recovered', { v: 'No', cls: 'bad' }]);
        push('decrypt throws a javax.crypto.AEADBadTagException exception, and you do not get the text. The method used in this lab (AES-GCM) checks whether the check value (tag) at the end of the value matches the one calculated when decrypting. If it does not match, it reports this with an exception instead of giving out text. With a different key, the check value did not match.', 'bad');
        st.hot = '';
        push('No code handles the exception, so main stops here. The two System.out.println lines below do not run, so nothing is printed.', 'bad');
      } else {
        st.hot = 'rd'; st.rk = 'none'; st.dec = 'raw'; st.rd = 'raw'; st.res = 'No';
        st.checks.push(['What the receiver read', { v: mid, cls: 'bad' }], ['Original text recovered', { v: 'No', cls: 'bad' }]);
        push('On the String read = sent; line, the receiver, without a key, makes read refer to the received value (the value sent refers to) as it is. No decryption calculation is done, so the value stays unreadable, and the receiver does not get the text.', 'bad');
        st.hot = '';
        push('System.out.println(sent) and System.out.println(read) print the same ' + this.wlen + '-character value twice. Neither line is "Card number 1234".', '');
      }
    } else {
      st.hot = 'pt'; st.k1 = 'unused';
      push('On the String sent = "Card number 1234"; line, the sender does not pass the text to encrypt, and the variable sent refers to the text as it is. There is no calculation, so the key is not used.', '');
      st.hot = 'mid'; st.pass = true; st.mid = 'plain';
      st.checks.push(['Value visible in the middle', { v: PT, cls: 'bad' }]);
      push('The value of sent goes through the middle (a network or storage) to the receiver. What is visible in the middle is the text itself, so anyone who watches the middle can read "Card number 1234".', 'bad');
      st.hot = 'rd'; st.dec = 'raw'; st.rd = 'ok'; st.res = 'Yes';
      st.checks.push(['What the receiver read', { v: PT, cls: '' }], ['Original text recovered', { v: 'Yes', cls: '' }]);
      push('On the String read = sent; line, the receiver makes read refer to the received text (the text sent refers to) as it is. There is nothing to decrypt, so neither a key nor a calculation was used, and ' + (rd === 'same' ? 'even if the receiver has the same key, there is nothing to use it for.' : rd === 'other' ? 'it does not matter even if the receiver has a different key.' : 'it does not matter that the receiver has no key.'), '');
      st.hot = '';
      push('System.out.println(sent) and System.out.println(read) both print Card number 1234.', '');
    }

    // Summary: the first line is the answer to this setting (question)
    if (on && rd === 'same') {
      sum.push('Encryption is calculating text together with a key to turn it into a value that cannot be read. All that was visible in the middle was a value that cannot be read, starting with ' + this.head + '…, and the receiver decrypted it with the same key and recovered the original text "Card number 1234".');
      sum.push('Hashing makes it so that no one can turn the value back into the original text. Encryption makes it so that only a party that has the key can turn it back. So what you must protect is the key, not the value.');
    } else if (on && rd === 'none') {
      sum.push('If you read the received value as it is, without a key, you only read a value that cannot be read, and you do not get the text. Decryption cannot be done with the value alone. You must put the value and the key together into the calculation.');
      sum.push('Even if this value is seen by anyone in the middle, nobody can learn the text without the key. So what you must protect is the key, not the value.');
    } else if (on) {
      sum.push('If you decrypt with a different key, decrypt throws a javax.crypto.AEADBadTagException exception, and you do not get the text. The text comes back only if the key is the same as the one used to encrypt.');
      sum.push('With this method (AES-GCM), decrypting with the wrong key does not give out wrong text. It tells you with an exception. If the exception is not handled, the program stops, so the receiver knows right away that the value could not be decrypted.');
    } else {
      sum.push('If you send it without encrypting, the value visible in the middle is the text itself, so anyone who watches the middle reads "Card number 1234". If you only make a key and do not use it, nothing is protected.');
      sum.push('Encryption happens only when the sender puts the text and a key into encrypt. In this case, which key the receiver has does not affect the result.');
    }
    var exc = on && rd === 'other' ? this.excName : '';
    var outKinds = !on ? ['pt', 'pt'] : rd === 'same' ? ['wire', 'pt'] : rd === 'none' ? ['wire', 'wire'] : [];
    return { events: ev, summary: sum, exc: exc, outKinds: outKinds, row: [mid, readTxt, got ? 'Yes' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the line that makes the key.'); return; }
    H.table(v, ['What happened', 'Value'], s.checks.length ? s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['Nothing yet', ''] }], 'Result of the encryption');
  },
  // Diagram: on the left the sender (the text and the key go into the encryption box), in the middle the value visible in the middle, on the right the receiver (the value and the key go into the decryption box, and what it read). The key box is drawn separately on each side to show whether it is the same key, a different key, or no key. Without encryption, the boxes and the key become dotted and the text is visible as it is in the middle. At the bottom, whether the original text was recovered.
  draw: function (P, sim, shown) {
    var c = sim.c, on = c.enc === 'on', last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    var PT = 'Card number 1234';
    P.size(680, 328);
    P.region('sd', 6, 6, 206, 258, 'Sender');
    P.region('rv', 468, 6, 206, 258, 'Receiver');
    P.box('pt', 14, 36, 190, 50, { cls: hot === 'pt' ? 'hot now' : 'plain', title: 'Text', sub: PT });
    var enSub = !on ? 'No calculation' : s && s.enc === 'done' ? 'Unreadable value made' : 'Calculates text and key';
    P.box('en', 14, 112, 190, 62, { cls: !on ? 'ghost' : s && s.enc === 'done' ? (hot === 'en' ? 'good now' : 'good') : hot === 'en' ? 'hot now' : 'plain', title: 'Encryption', sub: enSub });
    var k1Sub = !s || s.k1 === 'none' ? 'None yet' : s.k1 === 'unused' ? 'Made but not used' : 'key (Key A)';
    P.box('k1', 14, 202, 190, 50, { cls: !s || s.k1 === 'none' || s.k1 === 'unused' ? 'ghost' : hot === 'k1' ? 'hot now' : 'plain', title: 'Key', sub: k1Sub });

    var midSub = s && s.mid === 'cipher' ? [this.head + '…', '(' + this.wlen + ' chars)'] : s && s.mid === 'plain' ? [PT] : '';
    P.box('mid', 262, 112, 156, 62, { cls: s && s.mid === 'cipher' ? 'good' : s && s.mid === 'plain' ? 'bad' : 'ghost', title: 'Seen in the middle', sub: midSub, mono: true });
    P.text('mdl', 340, 196, 'Network or storage', { cls: 'mut', anchor: 'middle' });

    var rdSub = !s || !s.rd ? '' : s.rd === 'ok' ? PT : s.rd === 'fail' ? ['AEADBadTagException', 'could not decrypt'] : [this.head + '…', '(' + this.wlen + ' chars)'];
    P.box('rd', 476, 36, 190, 50, { cls: s && s.rd === 'ok' ? (on ? 'good' : 'plain') : s && s.rd ? 'bad' : hot === 'rd' ? 'hot now' : 'ghost', title: 'What the receiver read', sub: rdSub, mono: true });
    var deOn = on && c.reader !== 'none';
    var deSub = !deOn ? 'No calculation' : !s || !s.dec ? 'Uses value and key' : s.dec === 'calc' ? 'Value and key go in' : s.dec === 'ok' ? 'Original text comes out' : 'Throws an exception';
    P.box('de', 476, 112, 190, 62, { cls: !deOn ? 'ghost' : s && s.dec === 'ok' ? 'good' : s && s.dec === 'fail' ? 'bad' : hot === 'de' ? 'hot now' : 'plain', title: 'Decryption', sub: deSub });
    var k2Sub = !on ? 'Not used' : c.reader === 'none' ? 'No key' : !s || !s.rk ? '' : s.rk === 'same' ? 'key (same Key A)' : 'otherKey (Key B)';
    P.box('k2', 476, 202, 190, 50, { cls: !on || c.reader === 'none' || !s || !s.rk ? 'ghost' : s.rk === 'other' ? (hot === 'k2' ? 'hot now' : 'wait') : 'plain', title: 'Key', sub: k2Sub });

    if (on) {
      if (s && s.enc) { P.arrow('a1', 'pt:b', 'en:t', { cls: s.enc === 'calc' ? 'hot' : 'mut' }); P.arrow('a2', 'k1:t', 'en:b', { cls: s.enc === 'calc' ? 'hot' : 'mut' }); }
      if (s && s.mid) P.arrow('a3', 'en:r', 'mid:l', { cls: s.pass ? 'mut' : 'hot' });
      if (s && s.pass && c.reader !== 'none') P.arrow('a4', 'mid:r', 'de:l', { cls: s.dec ? 'mut' : 'hot' });
      if (s && s.dec === 'calc') P.arrow('a5', 'k2:t', 'de:b', { cls: 'hot' });
      else if (s && (s.dec === 'ok' || s.dec === 'fail')) P.arrow('a5', 'k2:t', 'de:b', { cls: s.dec === 'ok' ? 'mut' : 'bad' });
      if (s && s.dec === 'ok') P.arrow('a6', 'de:t', 'rd:b', { cls: 'good' });
      if (s && s.dec === 'raw') P.arrow('b2', 'mid:t:0.7', 'rd:l', { cls: 'bad' });
    } else {
      if (s && s.mid) P.arrow('b1', 'pt:r', 'mid:t:0.3', { cls: 'bad' });
      if (s && s.dec === 'raw') P.arrow('b2', 'mid:t:0.7', 'rd:l', { cls: 'bad' });
    }
    P.box('res', 14, 276, 652, 40, { cls: s && s.res === 'Yes' ? (on ? 'good' : 'plain') : s && s.res ? 'bad' : 'ghost', title: 'Original text recovered', right: s ? s.res : '' });
  },
  assume: 'We did the actual calculation with javax.crypto.Cipher("AES/GCM/NoPadding") of Java JDK 21.0.12.1. The key is 256 bits, the tag is 128 bits, and a new 12-byte nonce is made for each encryption and put in front of the result, which is written in Base64. What is shortened on the screen is the import lines, the declaration of main, and the bodies of the helper methods newKey, encrypt, and decrypt. We checked all 6 combinations against the result of this: we put the same lines as the code on the screen into main, compiled that source with javax.tools, loaded the class with a new class loader, ran Main.main, and caught the standard output and the thrown exception. What we checked against is the value visible in the middle (the first 12 characters and the total number of characters of the value that encrypt returned), what the receiver read, whether the original text was recovered, the name of the exception thrown when decrypting with a different key (javax.crypto.AEADBadTagException, with the message Tag mismatch), and that nothing is printed at that time. The encrypted value is different every run. To compare, we fixed the key and the nonce to set values so that the same value comes out (in real use both are made at random), and ih/DXie50GTx…(60 characters) on the screen is one example obtained that way. When we encrypted the same text with the same key twice, making a new nonce each time, the two values were different from each other and both could be decrypted, and when we ran the 6 combinations again with a randomly made key and nonce, the kind of result (the text that was read, the name of the exception, the length of the value) was the same. The first 12 characters shown on the screen are the nonce part put in front of the value (the first 9 bytes), and the encrypted text part follows after it. The length of the value changes with the length of the text. We checked in two ways that the calculation follows the standard. We encrypted the same key, nonce, and text with aes-256-gcm of Node.js too, and the ciphertext and the tag were the same as Java down to the byte, and Node.js decrypted the Java value with the same key but could not with a different key. Also, in the GCM test vectors that the NIST Cryptographic Algorithm Validation Program (CAVP) publishes (gcmEncryptExtIV256.rsp and gcmDecrypt256.rsp in gcmtestvectors.zip; key 256 bits, IV 96 bits, text 128 bits, no additional data, tag 128 bits), the ciphertext and tag of one encryption case and the results of two decryption cases (one that passes and one that is FAIL) were the same as the Java calculation. We opened the documents ourselves and checked them. NIST FIPS 197 (the 2023 update), item 3 of the preface, introduces AES as a symmetric block cipher that can encrypt and decrypt, and says the key length is 128, 192, or 256 bits and the data is in 128-bit blocks. NIST SP 800-38D (the 2007 edition) says in section 3 that GCM guarantees the confidentiality and the authentication of data together, defines in sections 5.2.2 and 7.2 that authenticated decryption outputs the text if the check value (tag) matches and FAIL instead of the text if it does not, requires in section 8 that the probability of encrypting different data with the same key and the same IV be 2 to the power of -32 or less, and recommends in section 5.2.1.1 that the IV length be 96 bits. The Java 21 Cipher documentation explains that in AEAD modes (GCM and others) the tag is put after the ciphertext and is checked when decrypting, and tells you to change the IV every time you encrypt with the same key, and the AEADBadTagException documentation explains that it is thrown when a Cipher in an AEAD mode cannot verify the tag. This lab covers only the method in which the sender and the receiver use the same key (symmetric-key encryption). The method with two keys (public key) and signatures are covered in the in-depth lab "Hashing, encryption, and signatures", and how the receiver gets the same key safely (key delivery) is not covered. An exception is thrown when decrypting with a different key because the method this lab chose (AES-GCM) checks with the tag whether the value was changed or the key is different. A method without such a check can behave differently, and when we decrypted with a different key using AES/CTR/NoPadding, bytes other than the original text came out with no exception. How to store the key safely is not covered.',
});
