Lab.register({
  id: 'io_basic', nav: '파일 입출력', cat: '기초개념', mode: 'step', basic: true, deep: ['iobuf', 'serial'],
  title: '파일에 쓰고 읽는다는 것은 무엇을 주고받는 것인가',
  why: '프로그램의 변수에 둔 값은 프로그램이 끝나면 사라진다. 파일에 쓰고 읽는 기능은 값을 디스크의 파일에 바이트로 남겨서, 프로그램을 다시 켠 뒤에도, 다른 프로그램에서도 같은 내용을 읽게 해 준다. 글자는 UTF-8 같은 정해진 규칙으로 바이트가 되므로, 쓰는 쪽과 읽는 쪽이 같은 규칙을 쓰면 같은 글자를 얻는다.',
  use: '설정 파일이나 로그 파일을 읽고 쓰거나, 사용자가 올린 CSV 파일을 읽어 들일 때 쓴다. 파일의 글자가 깨져 보이면 쓴 규칙과 읽은 규칙이 다른 경우가 많아서, 쓰는 코드와 읽는 코드 모두에 StandardCharsets.UTF_8처럼 규칙을 적어 둔다. 여러 사람이 동시에 고치고 찾아야 하는 데이터는 파일보다 DB에 둔다.',
  intro: '파일에 글자를 쓰고 읽는 코드는 Files 클래스의 메서드 세 개로 이루어집니다. Files.writeString 메서드는 글자를 파일에 쓰고, Files.readAllBytes 메서드는 파일에 저장된 바이트를 있는 그대로 읽고, Files.readString 메서드는 파일의 바이트를 글자로 되돌려 읽습니다. 파일에는 글자가 아니라 바이트(0부터 255까지의 숫자로 볼 수 있는 값)가 저장됩니다. 그래서 글자를 쓸 때는 정해진 규칙(문자 인코딩)에 따라 글자를 바이트로 바꾸고, 읽을 때는 규칙에 따라 바이트를 글자로 되돌립니다. 코드에서 StandardCharsets.UTF_8 부분이 그 규칙을 적은 곳이고, 쓰는 줄과 읽는 줄에 각각 적습니다. 이 실습은 쓰는 글자와 읽는 방법을 바꿔 가며 같은 코드를 컴파일하고 실행해, 파일에 실제로 저장된 바이트와 읽어 낸 글자를 봅니다. (Path.of("memo.txt")는 프로그램을 실행한 폴더 안의 memo.txt 파일을 가리키는 것으로 보고, 그 밖의 경로 규칙은 다루지 않습니다.)',
  terms: ['바이트(byte)', '문자 인코딩과 UTF-8', 'ISO_8859_1', 'NoSuchFileException'],
  controls: [
    { id: 'text', label: 'memo.txt에 쓰는 글자', type: 'select', value: 'gaA', options: [['gaA', '"가A" (한글 한 글자, 영문 한 글자)'], ['ab', '"AB" (영문 두 글자)'], ['gana', '"가나" (한글 두 글자)']] },
    { id: 'read', label: '읽는 방법', type: 'select', value: 'utf8', options: [['utf8', 'memo.txt를 StandardCharsets.UTF_8로 읽는다'], ['iso', 'memo.txt를 StandardCharsets.ISO_8859_1로 읽는다'], ['none', '파일 이름을 none.txt로 바꿔 읽는다 (그런 파일은 없다)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '"가A"를 파일에 쓰면 무엇이 저장되고, 어떻게 다시 글자가 되나', d: '한글 한 글자는 3바이트, 영문 한 글자는 1바이트로 저장되고, 같은 UTF-8 규칙으로 읽으면 "가A"로 돌아옵니다.', v: { text: 'gaA', read: 'utf8' } },
    { t: '영문만 쓰면', q: '쓰는 글자를 영문 "AB"로 바꾸면', d: '영문 두 글자는 2바이트로 저장되어 글자 수와 바이트 수가 같습니다.', v: { text: 'ab', read: 'utf8' } },
    { t: '한글만 쓰면', q: '쓰는 글자를 한글 "가나"로 바꾸면', d: '한글 두 글자가 6바이트로 저장됩니다.', v: { text: 'gana', read: 'utf8' } },
    { t: '다른 규칙으로 읽으면', q: '읽을 때 StandardCharsets.UTF_8 대신 StandardCharsets.ISO_8859_1을 쓰면', d: '파일의 바이트는 그대로인데 한글이 엉뚱한 글자로 읽힙니다.', v: { text: 'gaA', read: 'iso' } },
    { t: '없는 파일을 읽으면', q: '읽는 파일 이름을 memo.txt에서 none.txt로 바꾸면', d: '그런 파일이 없어 읽는 줄에서 NoSuchFileException 예외가 납니다.', v: { text: 'gaA', read: 'none' } },
    { t: '영문을 다른 규칙으로 읽으면', q: '"AB"를 쓰고 StandardCharsets.ISO_8859_1로 읽으면', d: '영문자는 두 규칙에서 같은 글자가 되어 깨지지 않습니다.', v: { text: 'ab', read: 'iso' } },
  ],
  // 글자별 UTF-8 바이트(Probe가 실제로 잰 값)
  HEX: { '가': ['EA', 'B0', '80'], '나': ['EB', '82', '98'], 'A': ['41'], 'B': ['42'] },
  textOf: function (c) { return { gaA: '가A', ab: 'AB', gana: '가나' }[c.text]; },
  code: function (c) {
    var f = c.read === 'none' ? 'none.txt' : 'memo.txt', cs = c.read === 'iso' ? 'ISO_8859_1' : 'UTF_8';
    return [
      'public class Main {',
      '    public static void main(String[] args) throws IOException {',
      '        // 쓰기: 글자를 정해진 규칙으로 바이트로 바꿔 파일에 저장한다',
      '        Files.writeString(Path.of("memo.txt"), "' + this.textOf(c) + '",',
      '                StandardCharsets.UTF_8);',
      '        // 읽기 1: 파일에 저장된 바이트를 그대로 읽는다',
      '        byte[] bytes = Files.readAllBytes(Path.of("' + f + '"));',
      '        // 읽기 2: 파일의 바이트를 정해진 규칙으로 글자로 되돌린다',
      '        String text = Files.readString(Path.of("' + f + '"),',
      '                StandardCharsets.' + cs + ');',
      '        System.out.println(bytes.length);',
      '        System.out.println(text);',
      '    }',
      '}',
    ].join('\n');
  },
  label: function (c) { return '쓰는 글자 ' + { gaA: '가A', ab: 'AB', gana: '가나' }[c.text] + ' · ' + { utf8: 'UTF-8로 읽기', iso: 'ISO_8859_1로 읽기', none: '없는 파일 읽기' }[c.read]; },
  columns: ['파일에 저장된 바이트', '읽은 글자', '예외'],
  simulate: function (c) {
    var H = this.HEX, T = this.textOf(c), chars = T.split(''), ev = [], sum = [];
    var hexAll = []; chars.forEach(function (ch) { H[ch].forEach(function (h) { hexAll.push(h); }); });
    var N = hexAll.length, n = chars.length, hasKo = /[가-힣]/.test(T), hasEn = /[A-Za-z]/.test(T);
    var hexTxt = hexAll.join(' '), q = '"' + T + '"';
    // ISO_8859_1로 읽은 글자: 바이트 값이 곧 글자 번호. 0x20~0x7E와 0xA0 이상만 화면에 보인다
    function glyph(h) { var v = parseInt(h, 16); return v >= 0x20 && v < 0x7F || v >= 0xA0 ? String.fromCharCode(v) : null; }
    function glyphTxt(h) { return glyph(h) || 'U+00' + h; }
    var st = { tx: T, lines: chars.slice(), fl: chars.map(function (ch) { return H[ch].join(' '); }), made: false, got: false, rdFile: '', rule: '', wrule: '', rd: null, bad: 0, total: 0, err: '', hot: '', n: N, checks: [], out: [], fail: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var none = c.read === 'none', iso = c.read === 'iso';

    st.hot = 'tx';
    push('Files.writeString 메서드를 부르는 줄이 실행됩니다. 이 시점에 memo.txt 파일은 아직 없습니다. 파일에는 글자가 아니라 바이트(0부터 255까지의 숫자로 볼 수 있는 값)가 저장되므로, 쓸 글자 ' + n + '개를 먼저 바이트로 바꿔야 합니다. 바꾸는 규칙(문자 인코딩)은 세 번째로 넘긴 StandardCharsets.UTF_8 규칙, 곧 UTF-8입니다.', '');
    var parts = chars.map(function (ch) { return '"' + ch + '": ' + H[ch].length + '바이트(' + H[ch].join(' ') + ')'; }).join(', ');
    var kind = hasKo && hasEn ? '이 규칙에서 한글 한 글자는 3바이트, 영문 한 글자는 1바이트입니다.' : hasKo ? '이 규칙에서 한글 한 글자는 3바이트입니다.' : '이 규칙에서 영문 한 글자는 1바이트입니다.';
    st.hot = 'fl'; st.made = true; st.wrule = 'UTF-8';
    st.checks.push(['memo.txt에 저장된 바이트', { v: N + '바이트: ' + hexTxt, cls: 'good' }]);
    push('UTF-8 규칙에 따라 글자가 바이트로 바뀝니다. ' + parts + '. ' + kind + ' ' + (n === N ? '글자 수와 바이트 수가 모두 ' + N + '입니다.' : '글자는 ' + n + '개인데 바이트는 ' + N + '개가 됩니다.') + ' 이 바이트들이 memo.txt 파일에 저장됩니다. 파일에 저장된 것은 이 숫자들뿐입니다.', 'good');

    st.hot = 'fl'; st.rdFile = none ? 'none.txt' : 'memo.txt';
    var errStmt = '';
    if (none) {
      st.err = 'NoSuchFileException'; st.fail = true;
      st.checks.push(['Files.readAllBytes 줄', { v: 'NoSuchFileException', cls: 'bad' }]);
      errStmt = 'byte[] bytes = Files.readAllBytes(Path.of("none.txt"));';
      push('Files.readAllBytes 메서드를 부르는 줄이 none.txt 파일을 읽으려 합니다. 그런데 이 폴더에는 none.txt라는 파일이 없습니다. 읽을 파일이 없으므로 자바가 NoSuchFileException 예외를 던집니다(Java 문서: 존재하지 않는 파일에 접근하려 할 때 던지는 예외). 예외가 난 이 줄 아래의 코드는 실행되지 않습니다.', 'bad');
      st.hot = '';
      push('main 메서드 안에는 예외를 처리하는 코드가 없으므로 예외는 main 밖으로 나가고, 프로그램이 오류로 끝납니다(종료 코드 1). Files.readString 줄과 System.out.println 줄은 실행되지 않아 아무것도 출력되지 않았습니다. 앞에서 저장한 memo.txt 파일(' + N + '바이트)은 그대로 남아 있습니다.', 'bad');
    } else {
      st.got = true;
      st.checks.push(['bytes.length', { v: String(N), cls: '' }]);
      push('Files.readAllBytes 메서드를 부르는 줄이 memo.txt 파일을 읽습니다. 이 메서드는 읽을 때 쓰는 규칙이 없고, 파일에 저장된 바이트를 그대로 배열로 읽어 돌려주고, bytes 변수가 그 배열을 가리킵니다. 배열의 바이트는 ' + N + '개(' + hexTxt + ')로, 방금 저장한 바이트와 같습니다.', '');
      st.hot = 'rd'; st.rule = iso ? 'ISO_8859_1' : 'UTF-8'; st.total = n;
      var bad = 0, hidden = 0, disp = '';
      if (!iso) {
        st.rd = chars.slice();
        st.checks.push(['읽은 글자', { v: T, cls: 'good' }]);
        push('Files.readString 메서드를 부르는 줄이 memo.txt 파일의 바이트를 글자로 되돌립니다. 읽을 때의 규칙은 StandardCharsets.UTF_8 규칙으로, 쓸 때와 같습니다. 같은 규칙으로 바이트를 묶어 읽으므로 ' + chars.map(function (ch) { return H[ch].join(' ') + ' → "' + ch + '"'; }).join(', ') + '처럼 원래 글자가 그대로 돌아오고, text 변수가 그 글자를 가리킵니다.', 'good');
        disp = T;
      } else {
        st.total = N;
        var gl = chars.map(function (ch) { return H[ch].map(glyphTxt).join(' '); });
        st.rd = gl;
        hexAll.forEach(function (h) { if (parseInt(h, 16) >= 0x80) bad++; if (!glyph(h)) hidden++; else disp += glyph(h); });
        st.bad = bad;
        st.checks.push(['읽은 글자', { v: bad ? '글자 ' + N + '자 중 깨진 글자 ' + bad + '자' : T, cls: bad ? 'bad' : 'good' }]);
        push('Files.readString 메서드를 부르는 줄이 memo.txt 파일의 바이트를 글자로 되돌립니다. 읽을 때의 규칙은 StandardCharsets.ISO_8859_1 규칙으로, 쓸 때의 UTF-8 규칙과 다릅니다. ISO_8859_1 규칙은 바이트 하나를 글자 하나로 바꿉니다(이 JDK에서 확인). 그래서 바이트 ' + N + '개가 글자 ' + N + '개가 됩니다: ' + chars.map(function (ch, i) { return H[ch].join(' ') + ' → ' + gl[i]; }).join(', ') + '.' + (bad ? ' 글자 ' + N + '자 가운데 ' + bad + '자는 원래 글자가 아닌 엉뚱한 글자입니다.' + (hidden ? ' 번호(U+0080)로만 적은 글자는 화면에 보이지 않는 글자입니다.' : '') : ' 영문자의 바이트(' + hexTxt + ')는 UTF-8 규칙과 같은 글자가 되므로 깨진 글자가 없고, 결과가 UTF-8로 읽었을 때와 같습니다.'), bad ? 'bad' : 'good');
      }
      st.hot = '';
      st.out = [String(N), disp];
      st.checks.push(['출력', { v: N + ' / ' + disp + (hidden ? ' (보이지 않는 글자 ' + hidden + '자 포함)' : ''), cls: '' }]);
      push('System.out.println 두 줄이 bytes가 가리키는 배열의 바이트 수와 text가 가리키는 글자를 출력합니다. 첫 줄은 ' + N + '이고, 둘째 줄은 ' + disp + (hidden ? '(화면에 보이지 않는 글자 ' + hidden + '자가 더 있습니다)' : '') + '입니다.' + (n !== N ? ' 글자는 ' + n + '개인데 첫 줄의 수는 ' + N + '이므로, bytes.length 값은 글자 수가 아니라 바이트 수입니다.' : ''), bad ? 'bad' : 'good');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    var bad2 = st.bad;
    if (none) {
      sum.push('이름이 none.txt인 파일이 폴더에 없어서, 읽는 줄에서 NoSuchFileException 예외가 났습니다. 예외는 Files.readAllBytes 메서드를 부른 줄에서 났고, 그 아래의 읽기와 출력 줄은 실행되지 않아 아무것도 출력되지 않았습니다.');
      sum.push('예외가 나도 앞에서 쓴 memo.txt 파일은 이미 저장되어 있었습니다(' + N + '바이트). 쓰기와 읽기는 별개의 줄이어서, 읽다가 실패해도 이미 쓴 파일은 그대로 있습니다.');
    } else if (iso && bad2) {
      sum.push('UTF-8 규칙으로 쓴 파일을 ISO_8859_1 규칙으로 읽으면 글자가 깨집니다. 파일의 바이트(' + hexTxt + ')는 그대로인데, 읽는 규칙이 바이트를 다르게 글자로 바꿔 글자 ' + N + '자 중 ' + bad2 + '자가 원래 글자가 아니게 됐습니다.');
      sum.push('파일에는 바이트만 저장되고 어떤 규칙으로 썼는지는 저장되지 않습니다. 읽을 때는 쓸 때와 같은 규칙을 직접 맞춰 써야 합니다.');
    } else if (iso) {
      sum.push('영문만 쓴 파일은 ISO_8859_1 규칙으로 읽어도 깨지지 않았습니다. 영문자의 바이트(' + hexTxt + ')는 ISO_8859_1 규칙에서도 UTF-8 규칙과 같은 글자가 되기 때문입니다.');
      sum.push('규칙이 달라도 영문만으로는 차이가 드러나지 않습니다. 영문으로만 시험하면 규칙이 맞지 않는 문제를 놓치고, 한글을 넣으면 그제야 깨짐이 나타납니다.');
    } else {
      sum.push('파일에는 글자가 아니라 바이트가 저장됩니다. 쓴 글자 ' + n + '개는 UTF-8 규칙에 따라 ' + N + '바이트(' + hexTxt + ')가 되어 저장되고, 같은 UTF-8 규칙으로 읽으면 원래 글자가 그대로 돌아옵니다.');
      if (c.text === 'gaA') sum.push('글자는 2개인데 바이트는 4개입니다. 한글 한 글자는 3바이트, 영문 한 글자는 1바이트이기 때문이고, 그래서 bytes.length 값은 글자 수가 아닙니다.');
      else if (c.text === 'ab') sum.push('영문만 쓰면 글자 수와 바이트 수가 2로 같습니다. 영문 한 글자는 UTF-8에서 1바이트이기 때문이고, 한글을 쓰면 이 둘이 달라집니다.');
      else sum.push('한글 두 글자가 6바이트가 됐습니다. 한글 한 글자가 3바이트이므로 바이트 수는 글자 수의 세 배입니다.');
    }
    var row = ['' + N + '바이트: ' + hexTxt, none ? '읽지 못함' : iso && bad2 ? '글자 ' + N + '자 중 깨진 글자 ' + bad2 + '자' : T, none ? 'NoSuchFileException' : '없음'];
    return { events: ev, summary: sum, row: row, nbytes: N, hexAll: hexAll, cps: none ? [] : iso ? hexAll.slice() : chars.map(function (ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }), exAt: errStmt, broken: bad2 };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 글자를 파일에 쓰는 것부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '쓰기와 읽기');
    H.counters(v, [[s.made ? s.n : 0, '파일에 저장된 바이트'], [s.bad, '깨진 글자']]);
  },
  // 그림: 왼쪽은 쓰는 글자, 가운데는 memo.txt에 저장된 바이트, 오른쪽은 읽은 글자. 글자마다 한 줄씩 나란히 둔다. 아래에 쓰는 규칙, 읽는 파일, 읽는 규칙, 예외.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, T = { gaA: '가A', ab: 'AB', gana: '가나' }[c.text];
    P.size(680, 284);
    var lines = s ? s.lines : T.split('');
    P.box('tx', 14, 16, 186, 100, { cls: s && s.hot === 'tx' ? 'hot now' : 'plain', title: '쓰는 글자', sub: lines.map(function (x) { return '"' + x + '"'; }) });
    var made = s && s.made;
    P.box('fl', 250, 16, 186, 100, { cls: !made ? 'ghost' : s.hot === 'fl' ? 'hot now' : 'good', title: 'memo.txt', sub: made ? s.fl.concat([s.n + '바이트']) : '아직 없는 파일' });
    var bad = s && (s.fail || s.bad > 0);
    P.box('rd', 486, 16, 186, 100, { cls: s && s.fail ? 'bad' : s && s.rd ? (s.bad ? 'bad' : s.hot === 'rd' ? 'hot now' : 'good') : 'ghost', title: '읽은 글자', sub: s && s.fail ? '읽지 못함' : s && s.rd ? s.rd : '아직 읽기 전' });
    P.arrow('a1', 'tx:r', 'fl:l', { cls: made ? 'good' : 'mut' });
    P.arrow('a2', 'fl:r', 'rd:l', { cls: s && s.fail ? 'bad' : s && s.rd ? (s.bad ? 'bad' : 'good') : 'mut' });
    P.box('r1', 14, 128, 658, 30, { cls: made ? 'good' : 'ghost', title: '쓰는 규칙(글자를 바이트로)', right: made ? s.wrule : '' });
    P.box('r2', 14, 164, 658, 30, { cls: s && s.fail ? 'bad' : s && s.rdFile ? 'plain' : 'ghost', title: '읽는 파일', right: s && s.rdFile ? (s.fail ? 'none.txt (없는 파일)' : s.rdFile) : '' });
    P.box('r3', 14, 200, 658, 30, { cls: s && s.rule ? (s.bad ? 'bad' : 'good') : 'ghost', title: '읽는 규칙(바이트를 글자로)', right: s && s.rule ? s.rule : s && s.fail ? '(읽기 전에 멈춤)' : '' });
    P.box('r4', 14, 236, 658, 30, { cls: s && s.fail ? 'bad' : 'ghost', title: '예외', right: s && s.fail ? 'NoSuchFileException' : '없음' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 아홉 가지 조합을 모두, 화면의 코드(맨 위의 import 네 줄만 더함)를 javax.tools로 컴파일한 뒤 새 자바 프로세스(java -cp . Main)로 조합마다 빈 폴더에서 실행해 대조했습니다. 프로세스가 끝난 뒤 폴더의 memo.txt를 직접 열어 실제로 저장된 바이트(16진수)와 크기를 읽었고, 프로그램이 출력한 바이트 수와 읽은 글자의 코드 포인트, 종료 코드, 예외 이름과 예외가 난 줄(소스의 몇 번째 줄인지), 실행 뒤 폴더의 파일 목록(none.txt가 없고 memo.txt는 있음), 실행 전에 memo.txt가 없었다는 것을 확인했습니다. 화면에서 import 네 줄은 줄였습니다. 한글 가가 EA B0 80, 나가 EB 82 98, 영문 A와 B가 41과 42로 저장되는 것과, ISO_8859_1 규칙이 0부터 255까지 바이트 256가지를 모두 하나씩 글자 하나로 바꾸는 것도 같은 JDK에서 따로 실행해 확인했습니다. "깨진 글자"는 ISO_8859_1로 읽은 글자 가운데 번호가 128 이상인 것의 수이며, 원래 글자와 같은 영문자는 세지 않았습니다. 번호 128부터 159까지(예: U+0080)와 같이 화면에 보이지 않는 글자는 실제로 읽혔지만 그림과 단계 문장에서는 번호(U+0080 등)로 적었습니다. 문서는 직접 열어 확인했습니다. Java SE 21 API 문서의 Files(readAllBytes는 규칙 없이 바이트를 읽는다는 것, readString은 지정한 문자 집합으로 바이트를 글자로 해독한다는 것, writeString은 지정한 문자 집합으로 글자를 바이트로 인코딩해 쓰고 옵션이 없으면 파일을 만들거나 기존 내용을 비우고 쓴다는 것), StandardCharsets(UTF_8과 ISO_8859_1 상수), NoSuchFileException(존재하지 않는 파일에 접근하려 할 때 던지는 검사 예외), Byte(바이트가 8비트라는 것과 부호 없는 값으로 읽는 방법), RFC 3629 1절과 3절(UTF-8에서 U+0000부터 U+007F는 1바이트이고, U+0800부터 U+FFFF는 3바이트라는 것)입니다. 다만 Files 문서에는 NoSuchFileException이 이 메서드들의 예외로 따로 적혀 있지 않고 IOException으로만 적혀 있어서, 없는 파일을 읽을 때 이 예외가 난다는 것은 문서가 아니라 이 JDK에서 실행해 관찰한 것입니다. 마찬가지로 Path.of("memo.txt")가 실행한 폴더의 파일을 가리킨다는 것도 문서를 열어 확인하지 않고 실행으로만 관찰했습니다. 이 밖에 UTF-8로 읽을 때 잘못된 바이트가 있는 경우(MalformedInputException), UTF-16 같은 다른 인코딩, 줄바꿈 문자, 파일 경로 규칙, 파일에 한 바이트씩 쓰는 스트림과 버퍼(세부 동작 실습: 입출력 스트림과 버퍼), 객체를 바이트로 바꿔 저장하는 직렬화(세부 동작 실습: 직렬화)는 다루지 않았습니다.',
});
