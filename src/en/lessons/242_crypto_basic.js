Lab.register({
  id: 'crypto_basic', nav: 'Encryption', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['crypto'],
  title: 'What is encryption, and what happens without the key?',
  why: 'Information that must be read back in its original form later, such as a phone number or a card number, cannot be recovered if you turn it into a hash, and if you leave it as plain text, anyone who peeks at the communication or steals the storage can read all of it. Encryption lets only the party who knows the key turn it back into the original value, so the party that needs the value can use it again, and for a person without the key it stays a value that cannot be recognized.',
  use: 'It is used to hide the text that HTTPS exchanges, and also when you store in a database personal information that must be read again, such as an address, a phone number, and an account number. In Java, you make a key with KeyGenerator of the standard library javax.crypto and encrypt and decrypt with Cipher. Do not write the key in the code; keep it in an environment variable or in a service that holds keys separately. A password that does not need to be read again is not encrypted but stored as a hash.',
  intro: 'Encryption means calculating text together with a key to turn it into bytes that cannot be recognized. In Java, the standard library (the javax.crypto package) does this work. KeyGenerator makes a key, and Cipher calculates with that key. The sender sets the Cipher to encryption mode (Cipher.ENCRYPT_MODE) and calls doFinal, and the receiver, who has the same key, sets the Cipher to decryption mode (Cipher.DECRYPT_MODE) and calls doFinal to get the original text back. If the key is different, you cannot get it back, so what you must protect is not the value but the key. In this lab you turn encryption on or off, change one byte on the way, and switch the receiver\'s key between the same one and a different one, and you actually run it to see what is visible in the middle and what the receiver read.',
  terms: ['Encryption', 'Decryption', 'Key', 'KeyGenerator and SecretKey', 'Cipher', 'IV (initialization vector)', 'AES-GCM and authentication tag', 'Symmetric-key cryptography and public-key cryptography'],
  controls: [
    { id: 'enc', label: 'Sender (the byte[] sent line)', type: 'select', value: 'on', options: [['on', 'Encrypt with Cipher and send: encCipher.doFinal(…)'], ['off', 'Send the bytes of the text as they are, without encrypting']] },
    { id: 'mid', label: 'In the middle (network or database)', type: 'select', value: 'keep', options: [['keep', 'Do not touch the bytes'], ['tamper', 'Someone changes one byte a little: sent[16] ^= 1;']] },
    { id: 'reader', label: 'Receiver (the decCipher.init line)', type: 'select', value: 'same', options: [['same', 'Decrypt with the same key: key'], ['other', 'Decrypt with a different key: otherKey']], show: function (c) { return c.enc === 'on'; } },
  ],
  // q is the question shown in the question-style screen; t and d are the name and description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'If you encrypt with Java\'s standard Cipher, what is visible in the middle, and what comes out when you decrypt with the same key?', d: 'Only garbled text is visible in the middle, and if you call doFinal with the same key, the original text comes out.', v: { enc: 'on', mid: 'keep', reader: 'same' } },
    { t: 'Decrypt with a different key', q: 'What if the receiver calls doFinal with a different key?', d: 'doFinal throws AEADBadTagException and you do not get the text.', v: { enc: 'on', mid: 'keep', reader: 'other' } },
    { t: 'A byte is changed in the middle', q: 'If the encrypted bytes arrive with one byte changed in the middle, can you still decrypt them with the same key?', d: 'Even if the key is right, doFinal throws AEADBadTagException, so the receiver knows that something was changed.', v: { enc: 'on', mid: 'tamper', reader: 'same' } },
    { t: 'Send without encrypting', q: 'What if you send the bytes of the text as they are, without encrypting?', d: 'If you turn them into text in the middle, you see Card number: 1234 as it is.', v: { enc: 'off', mid: 'keep', reader: 'same' } },
    { t: 'A byte is changed without encryption', q: 'What if one byte of the unencrypted bytes is changed in the middle?', d: 'The receiver reads Card number: 1235 and does not know that it was changed.', v: { enc: 'off', mid: 'tamper', reader: 'same' } },
  ],
  // Checked values: the number of bytes obtained from the real run (verify/plain/CryptoBasicProbe.java)
  pt: 'Card number: 1234',
  changed: 'Card number: 1235',
  ptLen: 17,
  sentLen: 33,
  tagLen: 16,
  excName: 'javax.crypto.AEADBadTagException',
  code: function (c) {
    var on = c.enc === 'on', tam = c.mid === 'tamper', other = on && c.reader === 'other';
    var o = ['// Only the lines inside main are shown (the class and main declarations and the imports are omitted)', '',
      '// ① Make a key: KeyGenerator is a class that Java provides',
      'KeyGenerator gen = KeyGenerator.getInstance("AES");   // Get a tool that makes AES keys',
      'gen.init(256);                                        // Set the key length to 256 bits',
      'SecretKey key = gen.generateKey();                    // Make one random key',
      ''];
    if (on) o.push('// ② Sender: encrypt with Cipher (a class that Java provides)',
      'byte[] iv = new byte[12];                             // Make an array of 12 bytes',
      'new SecureRandom().nextBytes(iv);                     // Fill iv with random bytes',
      'Cipher encCipher = Cipher.getInstance("AES/GCM/NoPadding");             // Get a Cipher that calculates with AES-GCM',
      'encCipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv)); // Set encryption mode, the key, and iv',
      'byte[] sent = encCipher.doFinal("Card number: 1234".getBytes(StandardCharsets.UTF_8)); // Encrypt the bytes of the text',
      '');
    else o.push('// ② Sender: do not encrypt, only turn the text into bytes',
      'byte[] sent = "Card number: 1234".getBytes(StandardCharsets.UTF_8); // Turn the text into UTF-8 bytes',
      '');
    o.push('// ③ In the middle (network or database): turn the passing bytes into text and look',
      'System.out.println(new String(sent, StandardCharsets.UTF_8));');
    if (tam) o.push('sent[16] ^= 1;                                        // In the middle, flip one bit of the 17th byte');
    o.push('');
    if (on) {
      o.push(other ? '// ④ Receiver: decrypt with a different key' : '// ④ Receiver: decrypt with the same key');
      if (other) o.push('SecretKey otherKey = gen.generateKey();               // Make one more key (a key different from key)');
      o.push('Cipher decCipher = Cipher.getInstance("AES/GCM/NoPadding");             // Get a Cipher of the same kind',
        'decCipher.init(Cipher.DECRYPT_MODE, ' + (other ? 'otherKey' : 'key') + ', new GCMParameterSpec(128, iv)); // Set decryption mode, ' + (other ? 'a different key' : 'the same key') + ', and the same iv',
        'byte[] read = decCipher.doFinal(sent);                // Decrypt and get the original bytes');
    } else {
      o.push('// ④ Receiver: no need to decrypt, use the received bytes as they are',
        'byte[] read = sent;                                   // Use neither a key nor a Cipher');
    }
    o.push('System.out.println(new String(read, StandardCharsets.UTF_8)); // Turn the bytes into text and print it');
    return o.join('\n');
  },
  label: function (c) {
    var t = c.mid === 'tamper' ? ' · changed in the middle' : '';
    return c.enc === 'on' ? 'Encrypted' + t + ' · ' + (c.reader === 'other' ? 'decrypted with a different key' : 'decrypted with the same key') : 'Not encrypted' + t;
  },
  columns: ['Visible in the middle', 'What the receiver read', 'Original text recovered'],
  simulate: function (c) {
    var PT = this.pt, on = c.enc === 'on', tam = c.mid === 'tamper', other = on && c.reader === 'other', ev = [], sum = [];
    var mid = on ? 'Garbled text (' + this.sentLen + ' bytes)' : PT;
    var fail = on && (other || tam);
    var readTxt = fail ? 'Exception AEADBadTagException' : tam ? this.changed : PT;
    var got = fail ? 'No (reported by exception)' : tam ? 'No (change not noticed)' : 'Yes';
    var st = { hot: '', k1: 'none', enc: '', mid: '', tam: false, rk: '', dec: '', rd: '', res: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // ① Key
    st.hot = 'k1';
    push('The line KeyGenerator gen = KeyGenerator.getInstance("AES"); gets a tool that makes AES keys. KeyGenerator is a class that Java provides (in the javax.crypto package), and "AES" passed to getInstance is the name of the calculation method. AES is a method set by a US standard (NIST FIPS 197) that encrypts and decrypts with the same key.', '');
    st.k1 = 'made';
    push('The line gen.init(256); sets the key length to 256 bits (32 bytes), and the line SecretKey key = gen.generateKey(); makes one random key. The type of the variable key, SecretKey, is a type that Java provides, and it stands for a key that must not be shown to others.', '');

    if (on) {
      // ② Sender
      st.hot = 'en'; st.enc = 'iv';
      push('The line byte[] iv = new byte[12]; makes an array of 12 bytes, and the line new SecureRandom().nextBytes(iv); fills that array with random bytes. SecureRandom is a class that Java provides that makes random values good enough for cryptography. The iv is not a key; it is a value that you choose anew each time you encrypt with the same key. You must not use the same iv again with the same key.', '');
      st.enc = 'calc';
      push('The line Cipher encCipher = Cipher.getInstance("AES/GCM/NoPadding"); gets the Cipher that will do the calculation. Cipher is a standard Java class that encrypts and decrypts, and "AES/GCM/NoPadding" means to use AES in GCM mode, without padding (extra bytes added at the end). Then the line encCipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv)); sets this Cipher to encryption mode and passes the key key and the iv. The 128 is the length, 128 bits, of the check value (the tag) that is attached at the end.', '');
      st.enc = 'done';
      push('In the line byte[] sent = encCipher.doFinal("Card number: 1234".getBytes(StandardCharsets.UTF_8)); getBytes turns the text into ' + this.ptLen + ' UTF-8 bytes, and doFinal encrypts those bytes with the key and the iv. The sent that comes back is ' + this.sentLen + ' bytes. The first ' + this.ptLen + ' bytes are the encrypted text, and the last ' + this.tagLen + ' bytes are the check value (the tag).', '');
    } else {
      st.hot = 'pt'; st.k1 = 'unused';
      push('The line byte[] sent = "Card number: 1234".getBytes(StandardCharsets.UTF_8); only turns the text into ' + this.ptLen + ' UTF-8 bytes. It does not use Cipher, so the key key is made but not used.', '');
    }

    // ③ In the middle
    st.hot = 'mid'; st.mid = on ? 'cipher' : 'plain';
    st.checks.push(['Visible in the middle', { v: mid, cls: on ? 'good' : 'bad' }]);
    if (on) push('The line System.out.println(new String(sent, StandardCharsets.UTF_8)); is the same as someone in the middle (the network or the database) turning these bytes into text to look at them. As the first line, garbled text mixed with � and meaningless symbols is printed, and neither "Card number" nor "1234" is visible. The key and the iv are chosen at random on each run, so the shape of the garbled text is different every time.', '');
    else push('The line System.out.println(new String(sent, StandardCharsets.UTF_8)); is the same as someone in the middle (the network or the database) turning these bytes into text to look at them. The way of turning bytes into text (UTF-8) is a standard that everyone knows, so Card number: 1234 is printed as it is on the first line.', 'bad');
    if (tam) {
      st.tam = true;
      if (on) push('The line sent[16] ^= 1; has someone in the middle flip one bit of the 17th byte (sent[16], because the numbering starts at 0) between 0 and 1. This position is the byte that encrypted the character "4". Anyone can change bytes even without the key.', 'bad');
      else push('The line sent[16] ^= 1; has someone in the middle flip one bit of the 17th byte (sent[16], because the numbering starts at 0) between 0 and 1. This position is the byte of the character "4", so if one bit changes, it becomes the byte of "5".', 'bad');
    }

    // ④ Receiver
    if (on) {
      if (other) {
        st.hot = 'k2'; st.rk = 'other';
        push('The line SecretKey otherKey = gen.generateKey(); makes one more key with the same tool. It is made at random, so it is a key different from the key you made first.', '');
      } else st.rk = 'same';
      st.hot = 'de'; st.dec = 'calc';
      push('The line Cipher decCipher = Cipher.getInstance("AES/GCM/NoPadding"); gets a Cipher of the same kind on the receiving side too, and the line decCipher.init(Cipher.DECRYPT_MODE, ' + (other ? 'otherKey' : 'key') + ', new GCMParameterSpec(128, iv)); sets decryption mode, ' + (other ? 'the different key otherKey' : 'the same key key') + ', and the same iv. The receiver also needs the iv to decrypt, so in practice you send the iv together with the ciphertext. This code is in a single main, so it uses the variable iv as it is.', '');
      if (!fail) {
        st.dec = 'ok'; st.rd = 'ok'; st.res = 'ok';
        st.checks.push(['What the receiver read', { v: PT, cls: 'good' }], ['Original text recovered', { v: got, cls: 'good' }]);
        push('In the line byte[] read = decCipher.doFinal(sent); doFinal calculates the tag again from the received bytes and checks that it matches the tag at the end, and because it matches, it returns the original ' + this.ptLen + ' bytes. new String(read, StandardCharsets.UTF_8) on the last line turns those bytes into text and prints Card number: 1234 as the second line. This is because the same key and the same iv as at encryption were put in.', 'good');
      } else {
        st.dec = 'fail'; st.rd = 'fail'; st.res = 'fail';
        st.checks.push(['What the receiver read', { v: readTxt, cls: 'bad' }], ['Original text recovered', { v: got, cls: 'bad' }]);
        var why = other && tam ? 'the key is different and the bytes were changed too, so' : other ? 'the key is different, so' : 'the key is the same but one byte was changed, so';
        push('In the line byte[] read = decCipher.doFinal(sent); doFinal calculates the tag again from the received bytes and compares it with the tag at the end. Because ' + why + ' the tag does not match, and doFinal does not return text but throws javax.crypto.AEADBadTagException (message Tag mismatch).', 'bad');
        st.hot = '';
        push('There is no code in main that handles the exception, so main stops here. The last System.out.println does not run, so the output is only the one line of garbled text seen in the middle.', 'bad');
      }
    } else {
      st.hot = 'rd'; st.dec = 'raw'; st.rd = tam ? 'changed' : 'ok'; st.res = tam ? 'changed' : 'ok';
      st.checks.push(['What the receiver read', { v: readTxt, cls: tam ? 'bad' : '' }], ['Original text recovered', { v: got, cls: tam ? 'bad' : '' }]);
      if (tam) push('In the line byte[] read = sent; the receiver uses the received bytes as they are, and the last line prints Card number: 1235 as the second line. There is no exception and no warning, so the receiver does not know that it was changed in the middle. This is because no check value (tag) is attached to the bytes.', 'bad');
      else push('In the line byte[] read = sent; the receiver uses the received bytes as they are, and the last line prints Card number: 1234 as the second line. There was no need to decrypt, so neither a key nor a Cipher was used.', '');
    }

    // Summary: the first line is the answer for this setting (question)
    if (on && !fail) {
      sum.push('When you set Cipher to encryption mode and call doFinal, the bytes of the text turn into ' + this.sentLen + ' bytes that cannot be recognized (' + this.ptLen + ' bytes of encrypted text and a ' + this.tagLen + '-byte tag), so only garbled text was visible in the middle. The receiver set a Cipher to decryption mode with the same key and the same iv, called doFinal, and got back Card number: 1234.');
      sum.push('KeyGenerator, which makes the key, Cipher, which does the calculation, and GCMParameterSpec, which passes the iv and the tag length, are all things that Java provides. In real code, these lines are sometimes bundled into methods named encrypt and decrypt, but such methods are ones you make yourself, and the calculation is done by the Cipher that they call inside.');
    } else if (on && other) {
      sum.push('If you call doFinal with a different key, javax.crypto.AEADBadTagException is thrown and you do not get the text. It decrypts only with the same key that was used to encrypt' + (tam ? '. In this setting the bytes were changed too, but a different key alone is enough to throw the same exception.' : '.'));
      sum.push('When AES-GCM decrypts with a wrong key, it does not give out wrong text; it reports with an exception that the tag does not match. So the receiver knows right away that it could not decrypt. What you must protect is not the value but the key.');
    } else if (on) {
      sum.push('Even if the key is the same, if one byte is changed in the middle, doFinal throws javax.crypto.AEADBadTagException. Instead of receiving changed text, the receiver learns that someone touched the bytes.');
      sum.push('AES-GCM hides the text, and at the same time it checks with the tag at the end that the bytes were not changed. If you change the same byte with a method that has no tag (AES/CTR), Card number: 1235 comes out without any exception.');
    } else if (tam) {
      sum.push('Anyone in the middle can read and also change bytes that are not encrypted. When one bit was changed, the receiver read Card number: 1235 and did not know it had been changed.');
      sum.push('If you do the same to bytes encrypted with AES-GCM, doFinal throws AEADBadTagException and reports the change. Cipher does the hiding and the noticing of changes together.');
    } else {
      sum.push('If you send without encrypting, just turning the bytes into text in the middle shows Card number: 1234 as it is. Turning text into bytes (getBytes) is not encryption.');
      sum.push('If you only make a key and do not calculate with Cipher, nothing is protected. In this case, which key the receiver has does not affect the result either.');
    }
    var exc = fail ? this.excName : '';
    var out = fail ? ['garbled'] : on ? ['garbled', 'pt'] : tam ? ['pt', 'changed'] : ['pt', 'pt'];
    return { events: ev, summary: sum, exc: exc, out: out, row: [mid, readTxt, got] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the line that makes the key.'); return; }
    H.table(v, ['What happened', 'Value'], s.checks.length ? s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['Nothing yet', ''] }], 'Result of the encryption');
  },
  // Diagram: on the left, the sender (the text and the key go into the encryption Cipher); in the middle, what is visible in the middle (if it was changed, it is shown below); on the right, the receiver (the bytes and the key go into the decryption Cipher, and what it read). The key boxes are drawn separately on both sides to show whether it is the same key or a different key. If you do not encrypt, the Cipher boxes and the keys fade, and the text is visible as it is in the middle. At the very bottom, whether the original text was recovered.
  draw: function (P, sim, shown) {
    var c = sim.c, on = c.enc === 'on', last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    var PT = this.pt;
    P.size(680, 328);
    P.region('sd', 6, 6, 206, 258, 'Sender');
    P.region('rv', 468, 6, 206, 258, 'Receiver');
    P.box('pt', 14, 36, 190, 50, { cls: hot === 'pt' ? 'hot now' : 'plain', title: 'Text', sub: PT });
    var enSub = !on ? 'Not used' : !s || !s.enc ? 'Not calculated yet' : s.enc === 'iv' ? 'Makes a 12-byte iv' : s.enc === 'calc' ? 'ENCRYPT_MODE, key, iv' : this.sentLen + ' bytes produced';
    P.box('en', 14, 112, 190, 62, { cls: !on ? 'ghost' : s && s.enc === 'done' ? (hot === 'en' ? 'good now' : 'good') : hot === 'en' ? 'hot now' : 'plain', title: 'Encryption (encCipher)', sub: enSub });
    var k1Sub = !s || s.k1 === 'none' ? 'Not yet' : s.k1 === 'unused' ? 'Made but not used' : 'key (key A)';
    P.box('k1', 14, 202, 190, 50, { cls: !s || s.k1 === 'none' || s.k1 === 'unused' ? 'ghost' : hot === 'k1' ? 'hot now' : 'plain', title: 'Key', sub: k1Sub });

    var midSub = s && s.mid === 'cipher' ? ['Garbled text', '(' + this.sentLen + ' bytes)'] : s && s.mid === 'plain' ? [PT] : '';
    P.box('mid', 262, 112, 156, 62, { cls: s && s.mid === 'cipher' ? (hot === 'mid' ? 'good now' : 'good') : s && s.mid === 'plain' ? 'bad' : 'ghost', title: 'Seen in the middle', sub: midSub, mono: true });
    P.text('mdl', 340, 196, 'Network or database', { cls: 'mut', anchor: 'middle' });
    if (s && s.tam) P.text('tam', 340, 218, 'Byte #17 changed', { cls: 'bad', anchor: 'middle' });

    var rdSub = !s || !s.rd ? '' : s.rd === 'ok' ? PT : s.rd === 'changed' ? this.changed : ['AEADBadTag', 'Exception'];
    P.box('rd', 476, 36, 190, 50, { cls: s && s.rd === 'ok' ? (on ? 'good' : 'plain') : s && s.rd ? 'bad' : hot === 'rd' ? 'hot now' : 'ghost', title: 'What the receiver read', sub: rdSub, mono: true });
    var deSub = !on ? 'Not used' : !s || !s.dec ? 'Not calculated yet' : s.dec === 'calc' ? 'DECRYPT_MODE, key, iv' : s.dec === 'ok' ? 'Tag matches' : 'Tag does not match';
    P.box('de', 476, 112, 190, 62, { cls: !on ? 'ghost' : s && s.dec === 'ok' ? 'good' : s && s.dec === 'fail' ? 'bad' : hot === 'de' ? 'hot now' : 'plain', title: 'Decryption (decCipher)', sub: deSub });
    var k2Sub = !on ? 'Not used' : !s || !s.rk ? '' : s.rk === 'same' ? 'key (same key A)' : 'otherKey (key B)';
    P.box('k2', 476, 202, 190, 50, { cls: !on || !s || !s.rk ? 'ghost' : s.rk === 'other' ? (hot === 'k2' ? 'hot now' : 'wait') : 'plain', title: 'Key', sub: k2Sub });

    if (on) {
      if (s && s.enc === 'calc') { P.arrow('a1', 'pt:b', 'en:t', { cls: 'hot' }); P.arrow('a2', 'k1:t', 'en:b', { cls: 'hot' }); }
      else if (s && s.enc === 'done') { P.arrow('a1', 'pt:b', 'en:t', { cls: 'mut' }); P.arrow('a2', 'k1:t', 'en:b', { cls: 'mut' }); }
      if (s && s.mid) P.arrow('a3', 'en:r', 'mid:l', { cls: hot === 'mid' ? 'hot' : 'mut' });
      if (s && s.dec) P.arrow('a4', 'mid:r', 'de:l', { cls: s.dec === 'calc' ? 'hot' : 'mut' });
      if (s && s.dec === 'calc') P.arrow('a5', 'k2:t', 'de:b', { cls: 'hot' });
      else if (s && (s.dec === 'ok' || s.dec === 'fail')) P.arrow('a5', 'k2:t', 'de:b', { cls: s.dec === 'ok' ? 'mut' : 'bad' });
      if (s && s.dec === 'ok') P.arrow('a6', 'de:t', 'rd:b', { cls: 'good' });
    } else {
      if (s && s.mid) P.arrow('b1', 'pt:r', 'mid:t:0.3', { cls: 'bad' });
      if (s && s.dec === 'raw') P.arrow('b2', 'mid:t:0.7', 'rd:l', { cls: 'bad' });
    }
    var resTxt = !s || !s.res ? '' : s.res === 'ok' ? 'Yes' : s.res === 'fail' ? 'No (reported by exception)' : 'No (change not noticed)';
    P.box('res', 14, 276, 652, 40, { cls: s && s.res === 'ok' ? (on ? 'good' : 'plain') : s && s.res ? 'bad' : 'ghost', title: 'Original text recovered', right: resTxt });
  },
  assume: 'It was checked against real execution on Java JDK 21.0.12.1 (verify/plain/CryptoBasicProbe.java, comparison tool cmp_crypto_basic.js). For each of the eight combinations, the code on the screen (the lines inside main, without the one header comment line) was put inside main without changing a single character, only the imports and the class and main declarations (throws Exception) were added, and it was compiled with javax.tools and run, and the standard output and the thrown exception were captured. What was checked is what is visible in the middle (the first line), what the receiver read (the second line), the name and message of the thrown exception (javax.crypto.AEADBadTagException, Tag mismatch), and that the second line is not printed when the exception occurs. The key and the iv are chosen at random on each run, so only during the comparison a test security provider was put at the front of the order so that SecureRandom gives fixed bytes (00, 01, 02, …). The code on the screen is unchanged, and it was checked separately that KeyGenerator.init(256) and new SecureRandom() use those bytes. When the same code was run again with real random values, the kinds of results (the text that was read, the name of the exception, the number of output lines) were the same. The shape of the garbled text changes with the key and the iv, so only the number of bytes is written on the screen. The facts that the step sentences rely on were also checked by running. "Card number: 1234" is 17 bytes in UTF-8, and the result of doFinal was 33 bytes (17 bytes of encrypted text and a 16-byte tag). The text made by turning those bytes into text with new String(…, StandardCharsets.UTF_8) had � mixed in, and had neither "Card" nor "1234". With two random keys, decrypting with a different key threw AEADBadTagException all 100 times out of 100, and flipping one bit at any position of the 33 bytes threw the same exception all 33 times out of 33. When the same text was encrypted twice with the same key and only a newly chosen iv, the two results differed and both could be decrypted. When an attempt was made to set the Cipher that was used for encryption to encryption mode again with the same key and the same iv, Java blocked it with InvalidAlgorithmParameterException (Cannot reuse iv for GCM encryption). That sent[16] is the position that encrypted the character "4" was confirmed by separately running the counter method with which GCM calculates the text part (SP 800-38D section 7.1) as AES/CTR and decrypting the changed byte without a tag check, which gave Card number: 1235. When a byte at the same position of the bytes encrypted with AES/CTR/NoPadding, which has no tag, was changed, Card number: 1235 came out without an exception, and when it was decrypted with a different key, 17 bytes that were not the original text came out without an exception. In the bytes that were not encrypted, sent[16] is "4" (0x34), and flipping one bit gives "5" (0x35). Whether the calculation follows the standard was checked in two ways. The bytes (ciphertext and tag) made by encrypting the same key, iv, and text with aes-256-gcm of Node.js were the same, byte for byte, as the result of doFinal of Java, and Node.js decrypted the value from Java only with the same key and could not decrypt it with a different key or changed bytes. Also, from the GCM test vectors published by the NIST Cryptographic Algorithm Validation Program (CAVP) (gcmEncryptExtIV256.rsp and gcmDecrypt256.rsp in gcmtestvectors.zip; key 256 bits, IV 96 bits, text 128 bits, no additional data, tag 128 bits), the ciphertext and tag of one encryption and the results of two decryptions (one that passed and one FAIL) were the same as the Java calculation. The names of KeyGenerator, SecretKey, SecureRandom, Cipher, and GCMParameterSpec and how to call them were checked by the compilation and running above, and that the first argument 128 of GCMParameterSpec is the tag length (in bits) was checked by the result becoming 16 bytes longer. The documentation is what was opened and checked directly in the previous edition. Item 3 of the preface of NIST FIPS 197 (2023 update) introduces AES as a symmetric block cipher that can encrypt and decrypt, and says the key length is 128, 192, or 256 bits. NIST SP 800-38D (2007 edition) says in section 3 that GCM guarantees both confidentiality and authentication of data, defines in sections 5.2.2 and 7.2 that authenticated decryption gives the text if the tag matches and FAIL instead of the text if it does not, requires in section 8 that the same IV is not repeated with the same key, and recommends in section 5.2.1.1 an IV length of 96 bits. The Java 21 Cipher documentation explains that in AEAD modes (GCM and others) the tag is appended after the ciphertext and verified when decrypting, and tells you to change the IV every time you encrypt with the same key, and the AEADBadTagException documentation explains that it is thrown when a Cipher of an AEAD mode cannot verify the tag. This lab covers only the method in which the sender and the receiver use the same key (symmetric-key encryption). The code on the screen writes the sender and the receiver in one main, so it shares the variables key and iv as they are. How to actually send the iv together with the ciphertext (for example, by putting it in front), how the receiver safely gets the same key (key delivery), and how to store keys safely are not covered. The method with two keys (public key) and signatures are covered in the "In-depth lab: Hashing, encryption, and signatures".',
});
