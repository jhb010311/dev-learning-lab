Lab.register({
  id: 'iobuf', nav: '입출력 스트림과 버퍼', cat: '자바 언어', mode: 'step',
  title: 'write를 했는데 왜 파일이 비어 있나',
  why: '파일이나 소켓에 1바이트씩 바로 쓰면 쓸 때마다 운영체제를 부르는 비용이 들어서, 작은 쓰기가 많을수록 느려진다. BufferedOutputStream은 작은 쓰기 요청을 모아 큰 덩어리로 아래 스트림에 넘겨서 운영체제를 부르는 횟수를 줄인다. 그 대가로 버퍼가 차거나 flush·close를 부르기 전에는 데이터가 파일에 닿지 않는다.',
  use: '파일을 읽고 쓸 때 BufferedReader, BufferedWriter, Files.newBufferedWriter처럼 버퍼가 있는 스트림을 기본으로 쓰고, try-with-resources로 닫힘을 보장한다. 한글이 섞인 글은 인코딩을 UTF-8로 지정한 문자 스트림으로 읽는다. 소켓으로 보내는 메시지처럼 곧바로 상대에게 닿아야 하는 출력은 메시지 하나를 다 쓴 뒤 flush를 부른다.',
  intro: '파일에 쓸 때 out.write를 불렀다고 해서 그 데이터가 곧바로 파일에 들어가는 것은 아닙니다. 버퍼를 쓰는 스트림은 데이터를 메모리에 모아 두었다가 한꺼번에 내려보냅니다. "가나다" 9바이트를 한 바이트씩 쓰면서 아래 스트림으로 실제로 몇 번 내려가는지 세어 보고, 그 파일을 바이트 단위와 글자 단위로 다시 읽어 봅니다.',
  terms: ['바이트 스트림과 문자 스트림', '버퍼와 flush', '문자 인코딩과 UTF-8', 'finally와 try-with-resources'],
  controls: [
    { id: 'buf', label: '쓰는 스트림', type: 'select', value: 'buf', options: [['raw', '버퍼 없이 바로 쓰기'], ['buf', 'BufferedOutputStream을 거쳐 쓰기 (기본 크기)'], ['buf4', 'BufferedOutputStream을 거쳐 쓰기 (버퍼 4바이트)']] },
    { id: 'end', label: '다 쓴 뒤에 하는 일', type: 'select', value: 'none', options: [['none', '아무것도 하지 않음'], ['flush', 'out.flush()'], ['close', 'out.close()'], ['twr', 'try-with-resources (자동으로 닫힘)']] },
    { id: 'fail', label: '쓰기를 마친 직후, 닫기 전에 예외 발생', type: 'check', value: false, hint: '닫는 코드에 닿기 전에 문제가 생긴 경우입니다.' },
    { id: 'read', label: '파일을 다시 읽는 방법', type: 'select', value: 'char', options: [['byte', '바이트 스트림으로 한 바이트씩 읽어 글자로 바꾸기'], ['char', '문자 스트림(InputStreamReader, UTF-8)으로 읽기']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'BufferedOutputStream을 거쳐 write를 9번 하고 닫지 않으면 파일은 어떻게 되나', d: '버퍼를 거쳐 쓰고 닫지 않음. write를 9번 했는데 파일은 0바이트입니다.', v: { buf: 'buf', end: 'none', fail: false, read: 'char' } },
    { t: 'close로 닫으면', q: '다 쓴 뒤에 out.close 호출을 추가하면', d: '버퍼에 모인 9바이트가 한 번에 내려가 파일에 쓰입니다.', v: { buf: 'buf', end: 'close', fail: false, read: 'char' } },
    { t: '버퍼 없이 쓰면', q: '버퍼 없이 바로 쓰면', d: 'write 9번이 그대로 아래로 9번 내려갑니다.', v: { buf: 'raw', end: 'none', fail: false, read: 'char' } },
    { t: '버퍼가 4바이트라면', q: '버퍼가 4바이트인 BufferedOutputStream을 거쳐 쓰면', d: '가득 찰 때마다 내려가고, 닫지 않으면 마지막 1바이트가 남습니다.', v: { buf: 'buf4', end: 'none', fail: false, read: 'char' } },
    { t: 'close 전에 예외가 나면', q: '다 쓴 뒤 out.close 호출을 하는데 쓰기를 마친 직후 닫기 전에 예외가 발생하면', d: 'close가 실행되지 못해 파일이 비어 있습니다.', v: { buf: 'buf', end: 'close', fail: true, read: 'char' } },
    { t: 'try-with-resources라면', q: 'try-with-resources로 쓰는데, 쓰기를 마친 직후 닫기 전에 예외가 발생하면', d: '예외가 나도 자동으로 닫혀 데이터가 파일에 쓰입니다.', v: { buf: 'buf', end: 'twr', fail: true, read: 'char' } },
    { t: '바이트 하나를 글자 하나로 읽으면', q: 'out.close로 닫은 뒤, 파일을 바이트 스트림으로 한 바이트씩 읽어 글자로 바꾸면', d: '한글 세 글자가 깨진 글자 아홉 개가 됩니다.', v: { buf: 'buf', end: 'close', fail: false, read: 'byte' } },
  ],
  code: function (c) {
    var wrap = { raw: 'OutputStream out = counting;                                // 버퍼 없이 바로', buf: 'OutputStream out = new BufferedOutputStream(counting);     // 버퍼를 가진 스트림', buf4: 'OutputStream out = new BufferedOutputStream(counting, 4);  // 4바이트짜리 버퍼' }[c.buf];
    var s = (c.fail ? '// process 메서드 아래는 main 메서드 안의 줄 (바깥 클래스·main 선언과 import는 생략)\n' : '// 예시 클래스 아래는 main 메서드 안의 줄 (바깥 클래스·main 선언과 import는 생략)\n') + 'class CountingOutputStream extends OutputStream {       // 예시로 만든 클래스. 아래로 내려온 write 호출을 센다\n    private final OutputStream out;\n    int calls = 0;\n    boolean closed = false;\n    CountingOutputStream(OutputStream out) { this.out = out; }\n    @Override public void write(int b) throws IOException { calls++; out.write(b); }\n    @Override public void write(byte[] b, int off, int len) throws IOException { calls++; out.write(b, off, len); }\n    @Override public void close() throws IOException { closed = true; out.close(); }\n}\n\n';
    if (c.fail) s += 'static void process() { throw new IllegalStateException("처리 중 오류"); }\n\n';
    s += 'byte[] data = "가나다".getBytes(StandardCharsets.UTF_8);    // 9바이트\nCountingOutputStream counting = new CountingOutputStream(new FileOutputStream("out.txt"));\n';
    var body = ['for (byte b : data) out.write(b);                           // 한 바이트씩 9번'];
    if (c.fail) body.push('process();                                                  // 여기서 예외가 발생한다');
    if (c.end === 'flush') body.push('out.flush();'); if (c.end === 'close') body.push('out.close();');
    var tail = c.fail ? '} catch (IllegalStateException e) {\n    System.out.println("예외: " + e.getMessage());\n}\n' : '}\n';
    if (c.end === 'twr') s += 'try (' + wrap.replace(/;\s*\/\/.*$/, '') + ') {      // 블록을 벗어날 때 자동으로 out.close()\n' + body.map(function (x) { return '    ' + x; }).join('\n') + '\n' + tail;
    else if (c.fail) s += wrap + '\ntry {\n' + body.map(function (x) { return '    ' + x; }).join('\n') + '\n' + tail;
    else s += wrap + '\n' + body.join('\n') + '\n';
    s += '\nSystem.out.println(counting.calls);                          // 아래로 내려간 write 횟수\nSystem.out.println(Files.size(Path.of("out.txt")));           // 파일 크기\n\nStringBuilder sb = new StringBuilder();                      // 파일을 다시 읽는다\n';
    if (c.read === 'byte') s += 'try (InputStream in = new FileInputStream("out.txt")) {\n    int b;\n    while ((b = in.read()) != -1) sb.append((char) b);       // 바이트 하나를 글자 하나로\n}\n';
    else s += 'try (Reader in = new InputStreamReader(new FileInputStream("out.txt"), StandardCharsets.UTF_8)) {\n    int ch;\n    while ((ch = in.read()) != -1) sb.append((char) ch);     // 글자 하나씩\n}\n';
    return s + 'System.out.println(sb);';
  },
  label: function (c) { return { raw: '버퍼 없음', buf: '버퍼 (기본 크기)', buf4: '버퍼 4바이트' }[c.buf] + ' · ' + { none: '닫지 않음', flush: 'flush', close: 'close', twr: 'try-with-resources' }[c.end] + (c.fail ? ' · 예외' : '') + ' · ' + (c.read === 'byte' ? '바이트로 읽기' : '문자로 읽기'); },
  columns: ['아래로 내려간 write', '파일에 쓰인 바이트', '스트림', '파일을 다시 읽은 결과'],
  simulate: function (c) {
    var cap = { raw: 0, buf: 8192, buf4: 4 }[c.buf], fail = !!c.fail, E = c.end, ev = [], sum = [];
    var HEX = ['EA', 'B0', '80', 'EB', '82', '98', 'EB', '8B', 'A4'], NAME = ['가', '나', '다'];
    // where: 바이트마다 0 아직 쓰지 않음, 1 버퍼에 있음, 2 파일에 있음
    var st = { calls: 0, lens: [], file: 0, pend: 0, where: [0, 0, 0, 0, 0, 0, 0, 0, 0], open: false, closed: false, ex: false, read: '', readOk: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function down() { if (!st.pend) return; st.calls++; st.lens.push(st.pend); st.file += st.pend; st.pend = 0; st.where = st.where.map(function (w) { return w === 1 ? 2 : w; }); }
    st.open = true;
    push('new FileOutputStream("out.txt"): 파일을 쓰기용으로 엽니다. write 호출을 세는 CountingOutputStream(예시로 만든 클래스)이 이 파일 스트림을 참조로 갖고, 받은 write를 그쪽으로 넘깁니다. ' + (cap ? '그리고 ' + cap + '바이트짜리 버퍼를 가진 BufferedOutputStream이 CountingOutputStream을 참조로 가지므로, out.write는 버퍼를 거쳐서 내려갑니다.' : '버퍼가 없으므로 out.write는 곧바로 아래 스트림으로 내려갑니다.'));
    for (var i = 0; i < 3; i++) {
      var flushed = 0;
      for (var j = i * 3; j < i * 3 + 3; j++) {
        if (!cap) { st.calls++; st.lens.push(1); st.file++; st.where[j] = 2; }
        else { if (st.pend >= cap) { flushed = st.pend; down(); } st.pend++; st.where[j] = 1; }
      }
      var head = '"' + NAME[i] + '"의 3바이트(' + HEX.slice(i * 3, i * 3 + 3).join(' ') + ')를 out.write(b)로 하나씩: ';
      if (!cap) push(head + '버퍼가 없어서 write를 부를 때마다 아래 스트림까지 내려갑니다. 지금까지 아래로 내려간 횟수는 ' + st.calls + '번이고, 파일에는 ' + st.file + '바이트가 있습니다.');
      else if (!flushed) push(head + '세 번 모두 버퍼에 담기기만 하고 아래로는 내려가지 않습니다. 버퍼에 ' + st.pend + '바이트가 모였고, 파일에는 ' + st.file + '바이트가 있습니다.');
      else push(head + '쓰는 도중에 ' + cap + '바이트짜리 버퍼가 가득 찼습니다. 가득 찬 버퍼에 다음 바이트가 오면, 모아 둔 ' + flushed + '바이트를 한 번의 write로 아래에 내려보내 버퍼를 비운 뒤 새 바이트를 담습니다. 아래로 내려간 횟수는 ' + st.calls + '번, 파일에는 ' + st.file + '바이트, 버퍼에는 ' + st.pend + '바이트입니다.', 'good');
    }
    var left = function () { return st.pend ? '버퍼에 남은 ' + st.pend + '바이트' : ''; };
    function closeIt() { var n = st.pend; down(); st.closed = true; st.open = false; return n; }
    if (fail) {
      st.ex = true;
      if (E === 'twr') push('process(): 예외가 발생합니다. 하지만 try-with-resources는 블록을 어떤 식으로 벗어나든 그 전에 out.close()를 먼저 부릅니다.', 'bad');
      else push('process(): 예외가 발생해 catch 블록으로 건너뜁니다.' + (E === 'none' ? '' : ' 그 아래에 있던 out.' + E + '()는 실행되지 못했습니다.'), 'bad');
    }
    if (E === 'twr') { var n1 = closeIt(); push((fail ? '자동으로 불린 out.close(): ' : 'try 블록의 끝: try-with-resources가 out.close()를 자동으로 부릅니다. ') + (n1 ? '닫기 전에 버퍼에 남은 ' + n1 + '바이트를 한 번의 write로 내려보내고, ' : '') + '아래 스트림과 파일을 닫습니다. 파일에는 ' + st.file + '바이트가 있습니다.', 'good'); }
    else if (E === 'none' || fail) push((fail ? 'catch 블록의 끝: 닫는 코드가 실행되지 않은 채로 다음으로 넘어갑니다. ' : '(닫는 코드 없음): flush도 close도 부르지 않고 다음으로 넘어갑니다. ') + (st.pend ? left() + '는 메모리에만 있고 파일에는 없습니다. 프로그램이 이대로 끝나면 그 데이터는 사라집니다.' : '데이터는 이미 파일에 있습니다.') + ' 스트림은 열린 채로 남아 파일을 계속 붙잡고 있습니다.', 'bad');
    else if (E === 'flush') { var n2 = st.pend; down(); push('out.flush(): ' + (cap ? '버퍼에 남은 ' + n2 + '바이트를 한 번의 write로 아래에 내려보냅니다. 파일에는 ' + st.file + '바이트가 있습니다.' : '버퍼가 없으므로 내려보낼 것이 없습니다. 데이터는 이미 파일에 있습니다.') + ' flush는 닫는 것이 아니므로 스트림은 열린 채로 남습니다.', cap ? 'good' : ''); }
    else { var n3 = closeIt(); push('out.close(): ' + (n3 ? '닫기 전에 버퍼에 남은 ' + n3 + '바이트를 한 번의 write로 내려보내고, ' : '') + '아래 스트림과 파일을 닫습니다. 파일에는 ' + st.file + '바이트가 있습니다.', 'good'); }
    push('counting.calls와 Files.size: 아래 스트림으로 내려간 write는 ' + st.calls + '번이고, 파일 크기는 ' + st.file + '바이트입니다.' + (st.file < 9 ? ' 9바이트를 썼지만 ' + (9 - st.file) + '바이트가 파일에 없습니다.' : ''), st.file < 9 ? 'bad' : 'good');
    var full = Math.floor(st.file / 3), rest = st.file % 3, codes = [], rowRead;
    if (!st.file) { st.read = '(읽은 것 없음)'; st.readOk = 'bad'; rowRead = '읽은 것 없음'; push('파일 다시 읽기: 파일이 비어 있어서 in.read()가 처음부터 -1(끝)을 돌려줍니다. 읽은 글자가 없습니다.', 'bad'); }
    else if (c.read === 'byte') {
      codes = HEX.slice(0, st.file).map(function (h) { return '00' + h; });
      st.read = HEX.slice(0, st.file).map(function (h) { var v = parseInt(h, 16); return v >= 0xA0 ? String.fromCharCode(v) : '□'; }).join('') + ' (' + st.file + '글자)'; st.readOk = 'bad'; rowRead = st.file + '글자 (모두 깨짐)';
      push('(char) in.read()를 ' + st.file + '번: FileInputStream은 바이트를 하나씩 돌려줍니다. 한글 한 글자는 UTF-8에서 3바이트인데 바이트 하나를 글자 하나로 바꿨으므로, 한글이 아니라 엉뚱한 글자 ' + st.file + '개가 됩니다.', 'bad');
    } else {
      codes = ['AC00', 'B098', 'B2E4'].slice(0, full); if (rest) codes.push('FFFD');
      var txt = NAME.slice(0, full).join('') + (rest ? '�' : '');
      st.read = txt + ' (' + codes.length + '글자)'; st.readOk = rest ? 'bad' : 'good'; rowRead = rest ? txt + ' (마지막 글자 깨짐)' : txt;
      if (!rest) push('in.read()로 글자 하나씩: InputStreamReader는 바이트를 UTF-8 규칙에 따라 묶어 글자로 바꿉니다. 3바이트씩 묶여 "가", "나", "다" 세 글자가 그대로 나옵니다.', 'good');
      else push('in.read()로 글자 하나씩: InputStreamReader는 바이트를 UTF-8 규칙에 따라 묶어 글자로 바꿉니다. "가"와 "나"는 3바이트가 온전히 있어 그대로 나옵니다. 남은 ' + rest + '바이트(' + HEX.slice(full * 3, st.file).join(' ') + ')는 "다"의 앞부분뿐이라 글자를 이루지 못하고, 깨진 글자(�) 하나로 나옵니다.', 'bad');
    }
    if (!cap) sum.push('버퍼가 없으면 write 한 번이 곧 아래 스트림 호출 한 번입니다. 데이터는 바로 파일에 들어가지만, 바이트 수만큼 파일 쓰기를 요청하게 되어 데이터가 많을수록 느려집니다.');
    else if (st.file < 9) sum.push('BufferedOutputStream은 데이터를 메모리의 버퍼에 모았다가 한꺼번에 내려보냅니다. 내려가는 때는 버퍼가 가득 찼을 때와 flush 또는 close를 불렀을 때뿐입니다. 그래서 닫지 않으면 마지막에 버퍼에 남은 데이터가 파일에 쓰이지 않습니다.');
    else sum.push(c.buf === 'buf' ? '9번의 write가 아래로는 1번으로 줄었습니다. 크기를 따로 주지 않은 BufferedOutputStream의 버퍼는 검증 실행(JDK 21)에서 8192바이트였고, 그만큼 모이기 전에는 flush나 close를 불러야 내려갑니다.' : '버퍼가 4바이트라서 가득 찰 때마다 4바이트씩 내려가고, 마지막 1바이트는 flush나 close를 불렀을 때 내려갔습니다.');
    if (fail && E === 'twr') sum.push('try-with-resources는 예외가 발생해도 close를 불러 줍니다. 닫는 코드를 직접 쓰면 그 앞에서 예외가 났을 때 건너뛰게 되므로, 스트림처럼 닫아야 하는 자원은 try-with-resources로 여는 것이 안전합니다.');
    if (fail && (E === 'close' || E === 'flush')) sum.push('닫는 코드를 맨 아래에 직접 써 두면, 그 앞에서 예외가 났을 때 실행되지 않습니다.');
    if (!fail && E === 'flush') sum.push('flush는 버퍼를 비울 뿐 스트림을 닫지 않습니다. 열린 스트림은 파일을 계속 붙잡고 있으므로, 다 쓴 스트림은 close로 닫습니다. close는 닫기 전에 버퍼도 비워 줍니다.');
    if (st.file && c.read === 'byte') sum.push('한글처럼 한 글자가 여러 바이트인 문자는 바이트 하나를 글자 하나로 바꾸면 깨집니다. 글자를 읽을 때는 InputStreamReader 같은 문자 스트림에 인코딩(UTF-8)을 알려 주고 읽습니다. 영문자 abc는 UTF-8에서 한 글자가 1바이트라서 이렇게 읽어도 그대로 보이므로, 영문으로만 시험하면 이 문제를 놓칩니다.');
    if (st.file && c.read === 'char' && !rest) sum.push('문자 스트림은 바이트 스트림 위에서 "몇 바이트가 글자 하나인지"를 인코딩 규칙으로 판단해 글자 단위로 돌려줍니다.');
    return { events: ev, summary: sum, lens: st.lens, codes: codes, closed: st.closed, row: [st.calls + '번', st.file + ' / 9바이트', st.closed ? '닫힘' : '열린 채로 남음', rowRead] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '스트림', s.closed ? '닫힘' : '열려 있음', s.closed ? 'good' : 'wait');
    H.lane(ln, '예외', s.ex ? 'IllegalStateException 발생' : '없음', s.ex ? 'bad' : 'none');
    H.lane(ln, '다시 읽은 결과', s.read || '아직 읽기 전', s.readOk || 'none');
  },
  // 그림: 위에는 out.write가 지나가는 길(프로그램, 버퍼, 세는 스트림, 파일), 가운데에는 9바이트 각각이 지금 있는 곳, 아래에는 결과.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { calls: 0, lens: [], file: 0, pend: 0, where: [0, 0, 0, 0, 0, 0, 0, 0, 0], open: false, closed: false, ex: false, read: '', readOk: '' };
    var HEX = ['EA', 'B0', '80', 'EB', '82', '98', 'EB', '8B', 'A4'], cap = { raw: 0, buf: 8192, buf4: 4 }[c.buf];
    P.size(680, 338);
    P.text('hd', 16, 28, 'out.write(b)가 지나가는 길', { cls: 'mut' });
    P.box('pg', 16, 40, 128, 58, { cls: 'plain', title: '프로그램', sub: 'write 9번' });
    P.box('bf', 178, 40, 174, 58, cap ? { cls: s.pend ? 'hot' : 'plain', title: '버퍼 (' + cap + '바이트)', sub: s.pend + '바이트 모여 있음' } : { cls: 'ghost', title: '버퍼 없음', sub: '그대로 지나감' });
    P.box('ct', 386, 40, 136, 58, { cls: s.calls ? 'wait' : 'plain', title: '세는 스트림', sub: 'write ' + s.calls + '번 내려옴' });
    P.box('fl', 556, 40, 108, 58, { cls: s.file === 9 ? 'good' : s.file ? 'hot' : 'plain', title: 'out.txt', sub: s.file + ' / 9바이트' });
    P.arrow('a1', 'pg:r', 'bf:l', {}); P.arrow('a2', 'bf:r', 'ct:l', { cls: s.calls ? 'good' : 'mut' }); P.arrow('a3', 'ct:r', 'fl:l', { cls: s.calls ? 'good' : 'mut' });
    ['가', '나', '다'].forEach(function (n, i) { P.text('nm' + i, 16 + i * 216 + 104, 128, '"' + n + '" 한 글자 = 3바이트', { cls: 'mut', anchor: 'middle' }); });
    HEX.forEach(function (h, i) { var w = s.where[i]; P.box('b' + i, 16 + i * 72, 138, 64, 46, { cls: w === 2 ? 'good' : w === 1 ? 'hot' : 'ghost', title: h, sub: w === 2 ? '파일' : w === 1 ? '버퍼' : '아직', center: true }); });
    P.box('r1', 16, 202, 320, 36, { cls: 'plain', title: '아래로 내려간 write', right: s.calls + '번' });
    P.box('r2', 344, 202, 320, 36, { cls: s.closed ? 'good' : s.open ? 'wait' : 'ghost', title: '스트림', right: s.closed ? '닫힘' : s.open ? '열려 있음' : '아직 열기 전' });
    P.box('r3', 16, 248, 648, 36, { cls: s.read ? s.readOk : 'ghost', title: '파일을 다시 읽은 결과', right: s.read || '아직 읽기 전' });
    P.box('r4', 16, 294, 648, 30, { cls: s.ex ? 'bad' : 'ghost', title: '예외', right: s.ex ? 'IllegalStateException (처리 중 오류)' : '없음' });
    P.note('가운데 줄의 상자 하나가 1바이트입니다. 노란 상자는 메모리의 버퍼에만 있는 바이트, 초록 상자는 파일까지 내려간 바이트입니다.');
  },
  assume: '마흔여덟 가지 조합의 결과(아래 스트림으로 내려간 write 횟수와 한 번에 내려간 바이트 수, 파일 크기, 닫혔는지, 다시 읽은 글자)를 JDK 21에서 실제로 실행한 결과와 대조했습니다. 크기를 주지 않은 BufferedOutputStream이 8192바이트를 모은 뒤에 내려보낸다는 것, 닫지 않고 프로그램이 정상 종료해도 버퍼에 남은 데이터가 파일에 쓰이지 않는다는 것, 영문 abc는 바이트 하나씩 글자로 바꿔도 그대로라는 것도 같은 JDK에서 따로 실행해 확인했습니다. 8192는 이 JDK에서 본 값이며 자바 문서가 정해 둔 수치는 아닙니다. 그림의 "파일"은 프로그램이 운영체제에 쓰기를 넘긴 것까지를 뜻합니다. 운영체제도 자기 버퍼를 따로 가지고 있어서 디스크에 실제로 기록되는 때는 그보다 늦을 수 있는데, 이것은 다루지 않았습니다. 바이트 방식으로 읽은 결과에서 화면에 보일 수 없는 글자는 □로 표시했습니다. 버퍼가 있을 때와 없을 때의 속도 차이는 재지 않았습니다. 쓰는 쪽의 문자 스트림(Writer)과 큰 덩어리를 한 번에 쓰는 write(byte[])는 다루지 않았습니다.',
});
