Lab.register({
  id: 'iobuf', nav: 'I/O streams and buffers', cat: 'Java language', mode: 'step',
  title: 'I called write, so why is the file empty?',
  intro: 'When you write to a file, calling out.write does not mean that the data goes into the file right away. A buffered stream collects data in memory and writes it out all at once. This lab writes the 9 bytes of the three Korean characters "가나다" one byte at a time, counts how many writes actually reach the underlying stream, and then reads the file back both byte by byte and character by character.',
  terms: ['Byte streams and character streams', 'Buffer and flush', 'Character encoding and UTF-8', 'finally and try-with-resources'],
  controls: [
    { id: 'buf', label: 'Stream to write to', type: 'select', value: 'buf', options: [['raw', 'Write directly, with no buffer'], ['buf', 'Write through a BufferedOutputStream (default size)'], ['buf4', 'Write through a BufferedOutputStream (4-byte buffer)']] },
    { id: 'end', label: 'What to do after all the writes', type: 'select', value: 'none', options: [['none', 'Nothing'], ['flush', 'out.flush()'], ['close', 'out.close()'], ['twr', 'try-with-resources (closed automatically)']] },
    { id: 'fail', label: 'An exception is thrown right after the writes, before the stream is closed', type: 'check', value: false, hint: 'This is the case where something goes wrong before the closing code is reached.' },
    { id: 'read', label: 'How to read the file back', type: 'select', value: 'char', options: [['byte', 'Read one byte at a time with a byte stream and convert each byte to a character'], ['char', 'Read with a character stream (InputStreamReader, UTF-8)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens to the file when you call write 9 times on a BufferedOutputStream (default size) and never close it?', d: 'Written through a buffer and not closed. write was called 9 times, but the file has 0 bytes.', v: { buf: 'buf', end: 'none', fail: false, read: 'char' } },
    { t: 'Closing with close', q: 'What if you call out.close() after all the writes?', d: 'The 9 bytes collected in the buffer are written out in one write and end up in the file.', v: { buf: 'buf', end: 'close', fail: false, read: 'char' } },
    { t: 'Writing with no buffer', q: 'What if you write directly, with no buffer?', d: 'The 9 calls to write reach the underlying stream as 9 writes.', v: { buf: 'raw', end: 'none', fail: false, read: 'char' } },
    { t: 'With a 4-byte buffer', q: 'What if you write through a BufferedOutputStream with a 4-byte buffer?', d: 'The buffer is written out each time it fills up, and if the stream is not closed, the last 1 byte is left behind.', v: { buf: 'buf4', end: 'none', fail: false, read: 'char' } },
    { t: 'An exception before close', q: 'What if you call out.close() after the writes, but an exception is thrown right after the writes, before the stream is closed?', d: 'close never runs, so the file is empty.', v: { buf: 'buf', end: 'close', fail: true, read: 'char' } },
    { t: 'With try-with-resources', q: 'What if you use try-with-resources and an exception is thrown right after the writes, before the stream is closed?', d: 'Even when an exception is thrown, the stream is closed automatically and the data is written to the file.', v: { buf: 'buf', end: 'twr', fail: true, read: 'char' } },
    { t: 'Reading one byte as one character', q: 'What if you call out.close() and read the file back one byte at a time with a byte stream, converting each byte to a character?', d: 'The three Korean characters become nine garbled characters.', v: { buf: 'buf', end: 'close', fail: false, read: 'byte' } },
  ],
  code: function (c) {
    var wrap = { raw: 'OutputStream out = counting;                                // directly, with no buffer', buf: 'OutputStream out = new BufferedOutputStream(counting);     // a stream that has a buffer', buf4: 'OutputStream out = new BufferedOutputStream(counting, 4);  // a 4-byte buffer' }[c.buf];
    var s = 'class CountingOutputStream extends OutputStream {       // a class made for this example. It counts the write calls that reach it\n    private final OutputStream out;\n    int calls = 0;\n    boolean closed = false;\n    CountingOutputStream(OutputStream out) { this.out = out; }\n    @Override public void write(int b) throws IOException { calls++; out.write(b); }\n    @Override public void write(byte[] b, int off, int len) throws IOException { calls++; out.write(b, off, len); }\n    @Override public void close() throws IOException { closed = true; out.close(); }\n}\n\n';
    if (c.fail) s += 'static void process() { throw new IllegalStateException("error during handling"); }\n\n';
    s += 'byte[] data = "가나다".getBytes(StandardCharsets.UTF_8);    // 9 bytes\nCountingOutputStream counting = new CountingOutputStream(new FileOutputStream("out.txt"));\n';
    var body = ['for (byte b : data) out.write(b);                           // one byte at a time, 9 times'];
    if (c.fail) body.push('process();                                                  // the exception is thrown here');
    if (c.end === 'flush') body.push('out.flush();'); if (c.end === 'close') body.push('out.close();');
    var tail = c.fail ? '} catch (IllegalStateException e) {\n    System.out.println("Exception: " + e.getMessage());\n}\n' : '}\n';
    if (c.end === 'twr') s += 'try (' + wrap.replace(/;\s*\/\/.*$/, '') + ') {      // out.close() is called automatically when the block is exited\n' + body.map(function (x) { return '    ' + x; }).join('\n') + '\n' + tail;
    else if (c.fail) s += wrap + '\ntry {\n' + body.map(function (x) { return '    ' + x; }).join('\n') + '\n' + tail;
    else s += wrap + '\n' + body.join('\n') + '\n';
    s += '\nSystem.out.println(counting.calls);                          // number of writes that reached the underlying stream\nSystem.out.println(Files.size(Path.of("out.txt")));           // file size\n\nStringBuilder sb = new StringBuilder();                      // read the file back\n';
    if (c.read === 'byte') s += 'try (InputStream in = new FileInputStream("out.txt")) {\n    int b;\n    while ((b = in.read()) != -1) sb.append((char) b);       // one byte as one character\n}\n';
    else s += 'try (Reader in = new InputStreamReader(new FileInputStream("out.txt"), StandardCharsets.UTF_8)) {\n    int ch;\n    while ((ch = in.read()) != -1) sb.append((char) ch);     // one character at a time\n}\n';
    return s + 'System.out.println(sb);';
  },
  label: function (c) { return { raw: 'no buffer', buf: 'buffer (default size)', buf4: '4-byte buffer' }[c.buf] + ' · ' + { none: 'not closed', flush: 'flush', close: 'close', twr: 'try-with-resources' }[c.end] + (c.fail ? ' · exception' : '') + ' · ' + (c.read === 'byte' ? 'read as bytes' : 'read as characters'); },
  columns: ['Writes to the underlying stream', 'Bytes written to the file', 'Stream', 'Result of reading the file back'],
  simulate: function (c) {
    var cap = { raw: 0, buf: 8192, buf4: 4 }[c.buf], fail = !!c.fail, E = c.end, ev = [], sum = [];
    var HEX = ['EA', 'B0', '80', 'EB', '82', '98', 'EB', '8B', 'A4'], NAME = ['가', '나', '다'];
    // where: for each byte, 0 not written yet, 1 in the buffer, 2 in the file
    var st = { calls: 0, lens: [], file: 0, pend: 0, where: [0, 0, 0, 0, 0, 0, 0, 0, 0], open: false, closed: false, ex: false, read: '', readOk: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function down() { if (!st.pend) return; st.calls++; st.lens.push(st.pend); st.file += st.pend; st.pend = 0; st.where = st.where.map(function (w) { return w === 1 ? 2 : w; }); }
    st.open = true;
    push('new FileOutputStream("out.txt"): This opens the file for writing. A CountingOutputStream (a class made for this example), which counts write calls, holds a reference to this file stream and passes each write on to it. ' + (cap ? 'A BufferedOutputStream whose buffer is ' + cap + ' bytes holds a reference to the CountingOutputStream, so out.write goes through the buffer before it reaches the underlying stream.' : 'There is no buffer, so out.write goes straight to the underlying stream.'));
    for (var i = 0; i < 3; i++) {
      var flushed = 0;
      for (var j = i * 3; j < i * 3 + 3; j++) {
        if (!cap) { st.calls++; st.lens.push(1); st.file++; st.where[j] = 2; }
        else { if (st.pend >= cap) { flushed = st.pend; down(); } st.pend++; st.where[j] = 1; }
      }
      var head = 'The 3 bytes of "' + NAME[i] + '" (' + HEX.slice(i * 3, i * 3 + 3).join(' ') + '), one at a time with out.write(b): ';
      if (!cap) push(head + 'There is no buffer, so every call to write goes all the way to the underlying stream. So far ' + st.calls + ' writes have reached the underlying stream, and the file has ' + st.file + ' bytes.');
      else if (!flushed) push(head + 'All three writes only store the bytes in the buffer, and nothing reaches the underlying stream. The buffer has collected ' + st.pend + ' bytes, and the file has ' + st.file + ' bytes.');
      else push(head + 'Partway through, the ' + cap + '-byte buffer became full. When the next byte arrives at a full buffer, the stream writes the ' + flushed + ' collected bytes to the underlying stream in a single write, which empties the buffer, and then stores the new byte. Writes that reached the underlying stream: ' + st.calls + ', bytes in the file: ' + st.file + ', bytes in the buffer: ' + st.pend + '.', 'good');
    }
    var left = function () { return st.pend ? 'What is left in the buffer (' + st.pend + (st.pend === 1 ? ' byte)' : ' bytes)') : ''; };
    function closeIt() { var n = st.pend; down(); st.closed = true; st.open = false; return n; }
    if (fail) {
      st.ex = true;
      if (E === 'twr') push('process(): An exception is thrown. However, no matter how the block is exited, try-with-resources calls out.close() first.', 'bad');
      else push('process(): An exception is thrown, and control jumps to the catch block.' + (E === 'none' ? '' : ' The out.' + E + '() below it did not get to run.'), 'bad');
    }
    if (E === 'twr') { var n1 = closeIt(); push((fail ? 'out.close(), called automatically: ' : 'End of the try block: try-with-resources calls out.close() automatically. ') + (n1 ? 'Before closing, the stream writes the ' + n1 + (n1 === 1 ? ' byte' : ' bytes') + ' left in the buffer to the underlying stream in a single write. ' : '') + 'The underlying stream and the file are closed. The file has ' + st.file + ' bytes.', 'good'); }
    else if (E === 'none' || fail) push((fail ? 'End of the catch block: Execution moves on without the closing code having run. ' : '(no closing code): Execution moves on without a call to flush or close. ') + (st.pend ? left() + ' is only in memory and is not in the file. If the program ends like this, that data is lost.' : 'The data is already in the file.') + ' The stream is left open and keeps holding the file.', 'bad');
    else if (E === 'flush') { var n2 = st.pend; down(); push('out.flush(): ' + (cap ? 'This writes the ' + n2 + (n2 === 1 ? ' byte' : ' bytes') + ' left in the buffer to the underlying stream in a single write. The file has ' + st.file + ' bytes.' : 'There is no buffer, so there is nothing to write out. The data is already in the file.') + ' flush does not close anything, so the stream stays open.', cap ? 'good' : ''); }
    else { var n3 = closeIt(); push('out.close(): ' + (n3 ? 'Before closing, the stream writes the ' + n3 + (n3 === 1 ? ' byte' : ' bytes') + ' left in the buffer to the underlying stream in a single write. ' : '') + 'The underlying stream and the file are closed. The file has ' + st.file + ' bytes.', 'good'); }
    push('counting.calls and Files.size: The number of writes that reached the underlying stream is ' + st.calls + ', and the file size is ' + st.file + ' bytes.' + (st.file < 9 ? ' 9 bytes were written, but the file is missing ' + (9 - st.file) + ' of them.' : ''), st.file < 9 ? 'bad' : 'good');
    var full = Math.floor(st.file / 3), rest = st.file % 3, codes = [], rowRead;
    if (!st.file) { st.read = '(nothing read)'; st.readOk = 'bad'; rowRead = 'Nothing read'; push('Reading the file back: The file is empty, so in.read() returns -1 (the end) from the very first call. No characters are read.', 'bad'); }
    else if (c.read === 'byte') {
      codes = HEX.slice(0, st.file).map(function (h) { return '00' + h; });
      st.read = HEX.slice(0, st.file).map(function (h) { var v = parseInt(h, 16); return v >= 0xA0 ? String.fromCharCode(v) : '□'; }).join('') + ' (' + st.file + ' characters)'; st.readOk = 'bad'; rowRead = st.file + ' characters (all garbled)';
      push('(char) in.read(), ' + st.file + ' times: FileInputStream returns one byte at a time. One Korean character is 3 bytes in UTF-8, but each byte was converted to one character, so the result is not Korean text but ' + st.file + ' unrelated characters.', 'bad');
    } else {
      codes = ['AC00', 'B098', 'B2E4'].slice(0, full); if (rest) codes.push('FFFD');
      var txt = NAME.slice(0, full).join('') + (rest ? '�' : '');
      st.read = txt + ' (' + codes.length + ' characters)'; st.readOk = rest ? 'bad' : 'good'; rowRead = rest ? txt + ' (last character garbled)' : txt;
      if (!rest) push('One character at a time with in.read(): InputStreamReader groups the bytes according to the rules of UTF-8 and converts them to characters. The bytes are grouped three at a time, and the three characters "가", "나", and "다" come out intact.', 'good');
      else push('One character at a time with in.read(): InputStreamReader groups the bytes according to the rules of UTF-8 and converts them to characters. "가" and "나" have all 3 of their bytes, so they come out intact. The remaining ' + rest + ' bytes (' + HEX.slice(full * 3, st.file).join(' ') + ') are only the first part of "다", so they do not make up a character and come out as one garbled character (�).', 'bad');
    }
    if (!cap) sum.push('With no buffer, one call to write is one call to the underlying stream. The data goes into the file right away, but the program requests a file write for every byte, so it gets slower as the amount of data grows.');
    else if (st.file < 9) sum.push('BufferedOutputStream collects data in a buffer in memory and writes it out all at once. The data is written out only when the buffer becomes full or when flush or close is called. So if the stream is not closed, the data left in the buffer at the end is not written to the file.');
    else sum.push(c.buf === 'buf' ? 'The 9 calls to write were reduced to 1 write to the underlying stream. The buffer of a BufferedOutputStream created without a size was 8192 bytes in our test run (JDK 21), and until that much data has collected, the data is written out only when flush or close is called.' : 'The buffer is 4 bytes, so 4 bytes were written out each time it filled up, and the last 1 byte was written out when flush or close was called.');
    if (fail && E === 'twr') sum.push('try-with-resources calls close even when an exception is thrown. If you write the closing code yourself, it is skipped when an exception is thrown before it, so it is safer to open a resource that must be closed, such as a stream, with try-with-resources.');
    if (fail && (E === 'close' || E === 'flush')) sum.push('If you write the closing code yourself on the last line, it does not run when an exception is thrown before it.');
    if (!fail && E === 'flush') sum.push('flush only empties the buffer and does not close the stream. An open stream keeps holding the file, so close a stream with close when you have finished writing. close also empties the buffer before it closes the stream.');
    if (st.file && c.read === 'byte') sum.push('Text in which one character takes several bytes, such as Korean, is garbled when each byte is converted to one character. To read characters, use a character stream such as InputStreamReader and tell it the encoding (UTF-8). The English letters abc take 1 byte per character in UTF-8 and look the same even when read this way, so you miss this problem if you test only with English text.');
    if (st.file && c.read === 'char' && !rest) sum.push('A character stream sits on top of a byte stream, uses the rules of the encoding to decide how many bytes make up one character, and returns the data one character at a time.');
    return { events: ev, summary: sum, lens: st.lens, codes: codes, closed: st.closed, row: [st.calls + '', st.file + ' / 9 bytes', st.closed ? 'Closed' : 'Left open', rowRead] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'Stream', s.closed ? 'Closed' : 'Open', s.closed ? 'good' : 'wait');
    H.lane(ln, 'Exception', s.ex ? 'IllegalStateException thrown' : 'None', s.ex ? 'bad' : 'none');
    H.lane(ln, 'Result of reading back', s.read || 'Not read yet', s.readOk || 'none');
  },
  // Diagram: at the top, the path that out.write takes (program, buffer, counting stream, file); in the middle, where each of the 9 bytes is now; at the bottom, the results.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { calls: 0, lens: [], file: 0, pend: 0, where: [0, 0, 0, 0, 0, 0, 0, 0, 0], open: false, closed: false, ex: false, read: '', readOk: '' };
    var HEX = ['EA', 'B0', '80', 'EB', '82', '98', 'EB', '8B', 'A4'], cap = { raw: 0, buf: 8192, buf4: 4 }[c.buf];
    P.size(680, 338);
    P.text('hd', 16, 28, 'The path that out.write(b) takes', { cls: 'mut' });
    P.box('pg', 16, 40, 128, 58, { cls: 'plain', title: 'Program', sub: 'write × 9' });
    P.box('bf', 178, 40, 174, 58, cap ? { cls: s.pend ? 'hot' : 'plain', title: 'Buffer (' + cap + ' bytes)', sub: s.pend + (s.pend === 1 ? ' byte collected' : ' bytes collected') } : { cls: 'ghost', title: 'No buffer', sub: 'goes straight through' });
    P.box('ct', 386, 40, 136, 58, { cls: s.calls ? 'wait' : 'plain', title: 'Counting stream', sub: 'write arrived ' + s.calls + '×' });
    P.box('fl', 556, 40, 108, 58, { cls: s.file === 9 ? 'good' : s.file ? 'hot' : 'plain', title: 'out.txt', sub: s.file + ' / 9 bytes' });
    P.arrow('a1', 'pg:r', 'bf:l', {}); P.arrow('a2', 'bf:r', 'ct:l', { cls: s.calls ? 'good' : 'mut' }); P.arrow('a3', 'ct:r', 'fl:l', { cls: s.calls ? 'good' : 'mut' });
    ['가', '나', '다'].forEach(function (n, i) { P.text('nm' + i, 16 + i * 216 + 104, 128, 'character "' + n + '" = 3 bytes', { cls: 'mut', anchor: 'middle' }); });
    HEX.forEach(function (h, i) { var w = s.where[i]; P.box('b' + i, 16 + i * 72, 138, 64, 46, { cls: w === 2 ? 'good' : w === 1 ? 'hot' : 'ghost', title: h, sub: w === 2 ? 'file' : w === 1 ? 'buffer' : 'not yet', center: true }); });
    P.box('r1', 16, 202, 320, 36, { cls: 'plain', title: 'Writes to the underlying stream', right: s.calls + '' });
    P.box('r2', 344, 202, 320, 36, { cls: s.closed ? 'good' : s.open ? 'wait' : 'ghost', title: 'Stream', right: s.closed ? 'closed' : s.open ? 'open' : 'not opened yet' });
    P.box('r3', 16, 248, 648, 36, { cls: s.read ? s.readOk : 'ghost', title: 'Result of reading the file back', right: s.read || 'not read yet' });
    P.box('r4', 16, 294, 648, 30, { cls: s.ex ? 'bad' : 'ghost', title: 'Exception', right: s.ex ? 'IllegalStateException (error during handling)' : 'none' });
    P.note('Each box in the middle row is 1 byte. A yellow box is a byte that is only in the buffer in memory, and a green box is a byte that has reached the file.');
  },
  assume: 'The results of the 48 combinations (the number of writes that reached the underlying stream and the number of bytes in each one, the file size, whether the stream was closed, and the characters read back) were checked against the results of actually running the code on JDK 21. The following were also confirmed by separate runs on the same JDK: a BufferedOutputStream created without a size writes its data out after it has collected 8192 bytes, the data left in the buffer is not written to the file even when the program ends normally without closing the stream, and the English letters abc stay the same even when each byte is converted to a character. 8192 is the value seen on this JDK and is not a figure that the Java documentation fixes. "File" in the diagram means the point up to which the program has handed the write over to the operating system. The operating system has buffers of its own, so the data may actually be recorded on the disk later than that, and this is not covered. In the result of reading byte by byte, a character that cannot be shown on the screen is displayed as □. The difference in speed with and without a buffer was not measured. Character streams on the writing side (Writer) and write(byte[]), which writes a large chunk at once, are not covered.',
});
