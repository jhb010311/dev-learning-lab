Lab.register({
  id: 'io_basic', nav: 'File I/O', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['iobuf', 'serial'],
  title: 'What do you exchange when you write to and read from a file?',
  why: 'A value held in a program\'s variable disappears when the program ends. Writing to and reading from a file leaves the value as bytes in a file on disk, so the same content can be read after the program is started again, and by other programs too. Characters become bytes under a set rule such as UTF-8, so if the writing side and the reading side use the same rule, they get the same characters.',
  use: 'It is used to read and write configuration files or log files, or to read in a CSV file that a user has uploaded. When the characters in a file look garbled, the rule used to write often differs from the rule used to read, so the rule is stated in both the writing code and the reading code, as in StandardCharsets.UTF_8. Data that many people must modify and search at the same time is kept in a DB rather than in a file.',
  intro: 'Code that writes text to a file and reads it back is made of three methods of the Files class. The Files.writeString method writes text to a file, the Files.readAllBytes method reads the bytes stored in the file as they are, and the Files.readString method turns the bytes of the file back into text. A file stores not text but bytes (values you can see as numbers from 0 to 255). So when you write text, it is turned into bytes by a set rule (character encoding), and when you read, the bytes are turned back into text by a rule. The StandardCharsets.UTF_8 part of the code is where that rule is written, and you write it on the writing line and on the reading line. In this lab you change the text to write and the way to read, and the same code is compiled and run, to show the bytes actually stored in the file and the text that was read. (Path.of("memo.txt") is taken to mean the file memo.txt in the folder where the program was run, and other path rules are not covered.)',
  terms: ['Byte', 'Character encoding and UTF-8', 'ISO_8859_1', 'NoSuchFileException'],
  controls: [
    { id: 'text', label: 'Text written to memo.txt', type: 'select', value: 'gaA', options: [['gaA', '"가A" (one Korean character, one English letter)'], ['ab', '"AB" (two English letters)'], ['gana', '"가나" (two Korean characters)']] },
    { id: 'read', label: 'How to read', type: 'select', value: 'utf8', options: [['utf8', 'Read memo.txt with StandardCharsets.UTF_8'], ['iso', 'Read memo.txt with StandardCharsets.ISO_8859_1'], ['none', 'Change the file name to none.txt when reading (there is no such file)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What is stored in the file when you write "가A", and how does it become text again?', d: 'A Korean character is stored as 3 bytes and an English letter as 1 byte, and reading with the same UTF-8 rule brings back "가A".', v: { text: 'gaA', read: 'utf8' } },
    { t: 'Writing only English letters', q: 'What if you change the text to write to the English letters "AB"?', d: 'Two English letters are stored as 2 bytes, so the number of characters and the number of bytes are the same.', v: { text: 'ab', read: 'utf8' } },
    { t: 'Writing only Korean characters', q: 'What if you change the text to write to the Korean characters "가나"?', d: 'Two Korean characters are stored as 6 bytes.', v: { text: 'gana', read: 'utf8' } },
    { t: 'Reading with a different rule', q: 'What if you read with StandardCharsets.ISO_8859_1 instead of StandardCharsets.UTF_8?', d: 'The bytes in the file are the same, but the Korean characters are read as wrong characters.', v: { text: 'gaA', read: 'iso' } },
    { t: 'Reading a missing file', q: 'What if you change the file name to read from memo.txt to none.txt?', d: 'There is no such file, so the reading line throws a NoSuchFileException.', v: { text: 'gaA', read: 'none' } },
    { t: 'Reading English letters with a different rule', q: 'What if you write "AB" and read with StandardCharsets.ISO_8859_1?', d: 'English letters become the same characters under both rules, so nothing breaks.', v: { text: 'ab', read: 'iso' } },
  ],
  // UTF-8 bytes of each character (values actually measured by the probe)
  HEX: { '가': ['EA', 'B0', '80'], '나': ['EB', '82', '98'], 'A': ['41'], 'B': ['42'] },
  textOf: function (c) { return { gaA: '가A', ab: 'AB', gana: '가나' }[c.text]; },
  code: function (c) {
    var f = c.read === 'none' ? 'none.txt' : 'memo.txt', cs = c.read === 'iso' ? 'ISO_8859_1' : 'UTF_8';
    return [
      'public class Main {',
      '    public static void main(String[] args) throws IOException {',
      '        // Write: turn the text into bytes by a set rule and store them in the file',
      '        Files.writeString(Path.of("memo.txt"), "' + this.textOf(c) + '",',
      '                StandardCharsets.UTF_8);',
      '        // Read 1: read the bytes stored in the file as they are',
      '        byte[] bytes = Files.readAllBytes(Path.of("' + f + '"));',
      '        // Read 2: turn the bytes of the file back into text by a set rule',
      '        String text = Files.readString(Path.of("' + f + '"),',
      '                StandardCharsets.' + cs + ');',
      '        System.out.println(bytes.length);',
      '        System.out.println(text);',
      '    }',
      '}',
    ].join('\n');
  },
  label: function (c) { return 'Text written: ' + { gaA: '가A', ab: 'AB', gana: '가나' }[c.text] + ' · ' + { utf8: 'Read as UTF-8', iso: 'Read as ISO_8859_1', none: 'Read a missing file' }[c.read]; },
  columns: ['Bytes stored in the file', 'Text read', 'Exception'],
  simulate: function (c) {
    var H = this.HEX, T = this.textOf(c), chars = T.split(''), ev = [], sum = [];
    var hexAll = []; chars.forEach(function (ch) { H[ch].forEach(function (h) { hexAll.push(h); }); });
    var N = hexAll.length, n = chars.length, hasKo = /[\uAC00-\uD7A3]/.test(T), hasEn = /[A-Za-z]/.test(T);
    var hexTxt = hexAll.join(' '), q = '"' + T + '"';
    // Characters read with ISO_8859_1: the byte value is the character number. Only 0x20 to 0x7E and 0xA0 and above can be seen on the screen
    function glyph(h) { var v = parseInt(h, 16); return v >= 0x20 && v < 0x7F || v >= 0xA0 ? String.fromCharCode(v) : null; }
    function glyphTxt(h) { return glyph(h) || 'U+00' + h; }
    var st = { tx: T, lines: chars.slice(), fl: chars.map(function (ch) { return H[ch].join(' '); }), made: false, got: false, rdFile: '', rule: '', wrule: '', rd: null, bad: 0, total: 0, err: '', hot: '', n: N, checks: [], out: [], fail: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var none = c.read === 'none', iso = c.read === 'iso';

    st.hot = 'tx';
    push('The line that calls the Files.writeString method runs. At this point the file memo.txt does not exist yet. A file stores not text but bytes (values you can see as numbers from 0 to 255), so the ' + n + ' characters to write must first be turned into bytes. The rule for turning them (character encoding) is the StandardCharsets.UTF_8 rule passed as the third argument, that is, UTF-8.', '');
    var parts = chars.map(function (ch) { return '"' + ch + '": ' + H[ch].length + (H[ch].length === 1 ? ' byte' : ' bytes') + ' (' + H[ch].join(' ') + ')'; }).join(', ');
    var kind = hasKo && hasEn ? 'In this rule, a Korean character is 3 bytes and an English letter is 1 byte.' : hasKo ? 'In this rule, a Korean character is 3 bytes.' : 'In this rule, an English letter is 1 byte.';
    st.hot = 'fl'; st.made = true; st.wrule = 'UTF-8';
    st.checks.push(['Bytes stored in memo.txt', { v: N + ' bytes: ' + hexTxt, cls: 'good' }]);
    push('The text is turned into bytes by the UTF-8 rule. ' + parts + '. ' + kind + ' ' + (n === N ? 'Both the number of characters and the number of bytes are ' + N + '.' : 'There are ' + n + ' characters, but the bytes come to ' + N + '.') + ' These bytes are stored in the file memo.txt. These numbers are all that is stored in the file.', 'good');

    st.hot = 'fl'; st.rdFile = none ? 'none.txt' : 'memo.txt';
    var errStmt = '';
    if (none) {
      st.err = 'NoSuchFileException'; st.fail = true;
      st.checks.push(['Files.readAllBytes line', { v: 'NoSuchFileException', cls: 'bad' }]);
      errStmt = 'byte[] bytes = Files.readAllBytes(Path.of("none.txt"));';
      push('The line that calls the Files.readAllBytes method tries to read the file none.txt. But there is no file named none.txt in this folder. Since there is no file to read, Java throws a NoSuchFileException (Java documentation: an exception thrown when an attempt is made to access a file that does not exist). The code below the line where the exception occurred does not run.', 'bad');
      st.hot = '';
      push('The main method has no code that handles the exception, so the exception leaves main and the program ends with an error (exit code 1). The Files.readString line and the System.out.println line did not run, so nothing was printed. The file memo.txt saved earlier (' + N + ' bytes) remains as it was.', 'bad');
    } else {
      st.got = true;
      st.checks.push(['bytes.length', { v: String(N), cls: '' }]);
      push('The line that calls the Files.readAllBytes method reads the file memo.txt. This method has no rule for reading; it reads the bytes stored in the file as they are into an array, and the variable bytes refers to that array. The array has ' + N + ' bytes (' + hexTxt + '), the same as the bytes just stored.', '');
      st.hot = 'rd'; st.rule = iso ? 'ISO_8859_1' : 'UTF-8'; st.total = n;
      var bad = 0, hidden = 0, disp = '';
      if (!iso) {
        st.rd = chars.slice();
        st.checks.push(['Text read', { v: T, cls: 'good' }]);
        push('The line that calls the Files.readString method turns the bytes of the file memo.txt back into text. The rule for reading is the StandardCharsets.UTF_8 rule, the same as when writing. Because the bytes are grouped and read by the same rule, the original characters come back as they were, and the variable text refers to them: ' + chars.map(function (ch) { return H[ch].join(' ') + ' → "' + ch + '"'; }).join(', ') + '.', 'good');
        disp = T;
      } else {
        st.total = N;
        var gl = chars.map(function (ch) { return H[ch].map(glyphTxt).join(' '); });
        st.rd = gl;
        hexAll.forEach(function (h) { if (parseInt(h, 16) >= 0x80) bad++; if (!glyph(h)) hidden++; else disp += glyph(h); });
        st.bad = bad;
        st.checks.push(['Text read', { v: bad ? 'Broken characters: ' + bad + ' of ' + N : T, cls: bad ? 'bad' : 'good' }]);
        push('The line that calls the Files.readString method turns the bytes of the file memo.txt back into text. The rule for reading is the StandardCharsets.ISO_8859_1 rule, which differs from the UTF-8 rule used for writing. The ISO_8859_1 rule turns one byte into one character (confirmed on this JDK). So ' + N + ' bytes become ' + N + ' characters: ' + chars.map(function (ch, i) { return H[ch].join(' ') + ' → ' + gl[i]; }).join(', ') + '.' + (bad ? ' Of the ' + N + ' characters, ' + bad + ' are not the original characters but wrong ones.' + (hidden ? ' A character written only by its number (U+0080) is a character that cannot be seen on the screen.' : '') : ' The bytes of English letters (' + hexTxt + ') become the same characters as under the UTF-8 rule, so there are no broken characters, and the result is the same as reading with UTF-8.'), bad ? 'bad' : 'good');
      }
      st.hot = '';
      st.out = [String(N), disp];
      st.checks.push(['Output', { v: N + ' / ' + disp + (hidden ? ' (invisible characters: ' + hidden + ')' : ''), cls: '' }]);
      push('The two System.out.println lines print the number of bytes in the array that bytes refers to and the text that the variable text refers to. The first line is ' + N + ', and the second line is ' + disp + (hidden ? ' (plus invisible characters: ' + hidden + ')' : '') + '.' + (n !== N ? ' There are ' + n + ' characters, but the number on the first line is ' + N + ', so the value of bytes.length is the number of bytes, not the number of characters.' : ''), bad ? 'bad' : 'good');
    }

    // Summary: the first line is the answer to this setting (the question)
    var bad2 = st.bad;
    if (none) {
      sum.push('There is no file named none.txt in the folder, so the reading line threw a NoSuchFileException. The exception occurred on the line that called the Files.readAllBytes method, and the reading and printing lines below it did not run, so nothing was printed.');
      sum.push('Even when the exception occurred, the file memo.txt written earlier was already saved (' + N + ' bytes). Writing and reading are separate lines, so even if reading fails, the file already written stays as it is.');
    } else if (iso && bad2) {
      sum.push('If you read a file written by the UTF-8 rule with the ISO_8859_1 rule, the characters break. The bytes of the file (' + hexTxt + ') are as they were, but the reading rule turns the bytes into characters differently, so ' + bad2 + ' of the ' + N + ' characters are no longer the original characters.');
      sum.push('A file stores only bytes and does not store which rule was used to write them. When you read, you have to specify the same rule as when you wrote.');
    } else if (iso) {
      sum.push('A file with only English letters did not break when read with the ISO_8859_1 rule. This is because the bytes of English letters (' + hexTxt + ') become the same characters under the ISO_8859_1 rule as under the UTF-8 rule.');
      sum.push('Even if the rules differ, English letters alone do not show the difference. If you test only with English letters, you miss the problem of a rule that does not match, and breakage appears only when you put in Korean characters.');
    } else {
      sum.push('A file stores bytes, not characters. The ' + n + ' characters you wrote were stored as ' + N + ' bytes (' + hexTxt + ') by the UTF-8 rule, and reading with the same UTF-8 rule brings back the original characters as they were.');
      if (c.text === 'gaA') sum.push('There are 2 characters but 4 bytes. This is because a Korean character is 3 bytes and an English letter is 1 byte, which is why the value of bytes.length is not the number of characters.');
      else if (c.text === 'ab') sum.push('When you write only English letters, the number of characters and the number of bytes are the same, 2. This is because an English letter is 1 byte in UTF-8, and when you write Korean characters, the two numbers become different.');
      else sum.push('Two Korean characters became 6 bytes. A Korean character is 3 bytes, so the number of bytes is three times the number of characters.');
    }
    var row = ['' + N + ' bytes: ' + hexTxt, none ? 'Could not read' : iso && bad2 ? 'Broken characters: ' + bad2 + ' of ' + N : T, none ? 'NoSuchFileException' : 'None'];
    return { events: ev, summary: sum, row: row, nbytes: N, hexAll: hexAll, cps: none ? [] : iso ? hexAll.slice() : chars.map(function (ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }), exAt: errStmt, broken: bad2 };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from writing the text to a file.'); return; }
    H.table(v, ['What happened', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Writing and reading');
    H.counters(v, [[s.made ? s.n : 0, 'Bytes stored in the file'], [s.bad, 'Broken characters']]);
  },
  // Diagram: on the left is the text to write, in the middle the bytes stored in memo.txt, and on the right the text that was read. Each character gets its own line side by side. Below are the writing rule, the file to read, the reading rule, and the exception.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, T = { gaA: '가A', ab: 'AB', gana: '가나' }[c.text];
    P.size(680, 284);
    var lines = s ? s.lines : T.split('');
    P.box('tx', 14, 16, 186, 100, { cls: s && s.hot === 'tx' ? 'hot now' : 'plain', title: 'Text to write', sub: lines.map(function (x) { return '"' + x + '"'; }) });
    var made = s && s.made;
    P.box('fl', 250, 16, 186, 100, { cls: !made ? 'ghost' : s.hot === 'fl' ? 'hot now' : 'good', title: 'memo.txt', sub: made ? s.fl.concat([s.n + ' bytes']) : 'No file yet' });
    var bad = s && (s.fail || s.bad > 0);
    P.box('rd', 486, 16, 186, 100, { cls: s && s.fail ? 'bad' : s && s.rd ? (s.bad ? 'bad' : s.hot === 'rd' ? 'hot now' : 'good') : 'ghost', title: 'Text read', sub: s && s.fail ? 'Could not read' : s && s.rd ? s.rd : 'Not read yet' });
    P.arrow('a1', 'tx:r', 'fl:l', { cls: made ? 'good' : 'mut' });
    P.arrow('a2', 'fl:r', 'rd:l', { cls: s && s.fail ? 'bad' : s && s.rd ? (s.bad ? 'bad' : 'good') : 'mut' });
    P.box('r1', 14, 128, 658, 30, { cls: made ? 'good' : 'ghost', title: 'Writing rule (text to bytes)', right: made ? s.wrule : '' });
    P.box('r2', 14, 164, 658, 30, { cls: s && s.fail ? 'bad' : s && s.rdFile ? 'plain' : 'ghost', title: 'File to read', right: s && s.rdFile ? (s.fail ? 'none.txt (missing file)' : s.rdFile) : '' });
    P.box('r3', 14, 200, 658, 30, { cls: s && s.rule ? (s.bad ? 'bad' : 'good') : 'ghost', title: 'Reading rule (bytes to text)', right: s && s.rule ? s.rule : s && s.fail ? '(stopped before reading)' : '' });
    P.box('r4', 14, 236, 658, 30, { cls: s && s.fail ? 'bad' : 'ghost', title: 'Exception', right: s && s.fail ? 'NoSuchFileException' : 'None' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). All 9 combinations were checked against real runs: the code on the screen (with only the four import lines at the top added) was compiled with javax.tools and run in a new Java process (java -cp . Main) in an empty folder for each combination. After the process ended, the memo.txt in the folder was opened directly to read the bytes actually stored (in hexadecimal) and the size, and I confirmed the number of bytes the program printed, the code points of the characters it read, the exit code, the name of the exception and the line where it occurred (which line of the source), the list of files in the folder after the run (none.txt does not exist and memo.txt does), and that memo.txt did not exist before the run. The four import lines were left out of the screen. That 가 is stored as EA B0 80, 나 as EB 82 98, and the English letters A and B as 41 and 42, and that the ISO_8859_1 rule turns each of the 256 byte values from 0 to 255 into exactly one character, were also checked by a separate run on the same JDK. "Broken characters" is the number of characters read with ISO_8859_1 whose number is 128 or more, and English letters that are the same as the original characters are not counted. Characters that cannot be seen on the screen, such as numbers 128 to 159 (for example U+0080), were actually read, but in the diagram and the step sentences they are written by their number (U+0080 and so on). I opened the documentation and checked it. These are the Java SE 21 API documentation for Files (readAllBytes reads bytes without a rule, readString decodes bytes into characters with the specified character set, and writeString encodes characters into bytes with the specified character set and, with no options, creates the file or empties the existing content and writes), StandardCharsets (the constants UTF_8 and ISO_8859_1), NoSuchFileException (a checked exception thrown when an attempt is made to access a file that does not exist), and Byte (a byte is 8 bits, and how to read it as an unsigned value), and sections 1 and 3 of RFC 3629 (in UTF-8, U+0000 to U+007F take 1 byte, and U+0800 to U+FFFF take 3 bytes). However, the Files documentation does not list NoSuchFileException separately as an exception of these methods and lists only IOException, so that this exception occurs when you read a missing file was observed by running on this JDK, not from the documentation. In the same way, that Path.of("memo.txt") points to a file in the folder where the program was run was only observed by running, and I did not open the documentation to check it. Beyond that, the case where there are invalid bytes when reading as UTF-8 (MalformedInputException), other encodings such as UTF-16, line break characters, file path rules, streams and buffers that write to a file one byte at a time (in-depth lab: I/O streams and buffers), and serialization, which turns an object into bytes to store it (in-depth lab: Serialization), are not covered.',
});
