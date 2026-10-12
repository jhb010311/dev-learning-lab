Lab.register({
  id: 'crypto_basic', nav: '암호화', cat: '기초개념', mode: 'step', basic: true, deep: ['crypto'],
  title: '암호화는 무엇이고, 열쇠가 없으면 어떻게 되는가',
  intro: '암호화는 글자를 열쇠와 함께 계산해서 알아볼 수 없는 값으로 바꾸는 것입니다. 코드에서는 encrypt("카드번호 1234", key)처럼 글자와 열쇠(key)를 넘기면 알아볼 수 없는 값이 돌아옵니다. 같은 열쇠를 가진 쪽이 decrypt(sent, key)처럼 그 값과 열쇠를 넘기면 원래 글자를 되찾습니다. 이것을 복호화라고 합니다. 열쇠가 없거나 다른 열쇠를 가진 쪽은 되찾지 못하므로, 지켜야 하는 것은 값이 아니라 열쇠입니다. 이 실습은 받는 쪽이 가진 열쇠를 같은 것, 다른 것, 없는 것으로 바꾸고 암호화 자체를 빼기도 하면서, 중간에서 보이는 값과 받는 쪽이 읽은 것을 실제로 실행해 확인합니다. (열쇠를 만드는 newKey와 계산하는 encrypt, decrypt의 본문은 화면에서 줄였습니다.)',
  terms: ['암호화', '복호화', '열쇠(키)', '대칭키 암호화와 비대칭키 암호화'],
  controls: [
    { id: 'enc', label: '보내는 쪽 (String sent 줄)', type: 'select', value: 'on', options: [['on', '열쇠로 암호화해서 보낸다: encrypt("카드번호 1234", key)'], ['off', '암호화하지 않고 그대로 보낸다: "카드번호 1234"']] },
    { id: 'reader', label: '받는 쪽 (String read 줄)', type: 'select', value: 'same', options: [['same', '받는 쪽이 같은 열쇠로 푼다: decrypt(sent, key)'], ['other', '받는 쪽이 다른 열쇠로 푼다: decrypt(sent, otherKey)'], ['none', '열쇠 없이 받은 값을 그대로 읽는다: sent']], show: function (c) { return c.enc === 'on'; } },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '암호화한 값은 어떻게 생겼고, 받는 쪽은 어떻게 읽나', d: '열쇠로 암호화한 값은 알아볼 수 없고, 같은 열쇠로 풀면 원래 글자가 나옵니다.', v: { enc: 'on', reader: 'same' } },
    { t: '열쇠 없이 읽으면', q: '받는 쪽이 열쇠 없이 받은 값을 그대로 읽으면', d: '알아볼 수 없는 값만 읽히고 글자는 얻지 못합니다.', v: { enc: 'on', reader: 'none' } },
    { t: '다른 열쇠로 풀면', q: '다른 열쇠로 풀면', d: 'decrypt가 예외를 던지고 글자를 얻지 못합니다.', v: { enc: 'on', reader: 'other' } },
    { t: '암호화하지 않고 보내면', q: '암호화하지 않고 보내면', d: '중간에서 보이는 값이 글자 그대로여서 누구나 읽습니다.', v: { enc: 'off', reader: 'same' } },
  ],
  // 대조한 값: 열쇠와 nonce를 고정한 Probe가 만든 값의 앞 12자와 전체 글자 수(실제로는 실행할 때마다 달라진다)
  pt: '카드번호 1234',
  head: 'ih/DXie50GTx',
  wlen: 60,
  excName: 'javax.crypto.AEADBadTagException',
  code: function (c) {
    var o = ['SecretKey key = newKey();                       // 열쇠를 하나 만든다', ''];
    if (c.enc === 'on') {
      o.push('// 보내는 쪽: 글자를 열쇠로 암호화한다', 'String sent = encrypt("카드번호 1234", key);', '');
      if (c.reader === 'same') o.push('// 받는 쪽: 같은 열쇠로 푼다', 'String read = decrypt(sent, key);');
      else if (c.reader === 'other') o.push('// 받는 쪽: 다른 열쇠로 푼다', 'SecretKey otherKey = newKey();   // 다른 열쇠', 'String read = decrypt(sent, otherKey);');
      else o.push('// 받는 쪽: 열쇠 없이 받은 값을 그대로 읽는다', 'String read = sent;');
    } else {
      o.push('// 보내는 쪽: 글자를 그대로 보낸다', 'String sent = "카드번호 1234";', '', '// 받는 쪽: 받은 것을 그대로 읽는다', 'String read = sent;');
    }
    o.push('', 'System.out.println(sent);', 'System.out.println(read);');
    return o.join('\n');
  },
  label: function (c) { return c.enc === 'on' ? '암호화함 · ' + { same: '같은 열쇠로 풂', other: '다른 열쇠로 풂', none: '열쇠 없이 읽음' }[c.reader] : '암호화 안 함'; },
  columns: ['중간에서 보이는 값', '받는 쪽이 읽은 것', '원래 글자를 되찾음'],
  simulate: function (c) {
    var PT = this.pt, on = c.enc === 'on', rd = c.reader, ev = [], sum = [];
    var mid = on ? this.head + '… (' + this.wlen + '자)' : PT;
    var readTxt = !on ? PT : rd === 'same' ? PT : rd === 'none' ? mid : '예외 AEADBadTagException: 풀지 못함';
    var got = !on || rd === 'same';
    var st = { hot: '', k1: 'none', enc: '', pass: false, rk: '', dec: '', mid: '', rd: '', res: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. 열쇠를 만든다
    st.hot = 'k1'; st.k1 = 'made';
    push('SecretKey key = newKey(); 줄을 실행합니다. 도우미 메서드 newKey()가 열쇠를 하나 만들어 key에 담습니다. 열쇠는 글자를 암호화할 때와 풀 때 계산에 함께 넣는 값입니다.', '');

    if (on) {
      // 2~4. 보내는 쪽
      st.hot = 'en'; st.enc = 'calc';
      push('String sent = encrypt("카드번호 1234", key); 줄에서 보내는 쪽이 글자 "카드번호 1234"와 열쇠 key를 encrypt에 넣습니다. encrypt는 글자를 열쇠와 함께 계산해서 다른 값으로 바꿉니다.', '');
      st.hot = 'en'; st.enc = 'done'; st.mid = 'cipher';
      push('계산이 끝나고 알아볼 수 없는 값이 나와 sent에 담깁니다. 이 실습에서는 ' + this.head + '…로 시작하는 ' + this.wlen + '자의 글자가 나왔습니다. 이 값에서는 "카드번호 1234"를 읽을 수 없습니다. 같은 글자를 같은 열쇠로 다시 암호화하면 다른 값이 나오므로, 이 값은 한 예입니다.', '');
      st.hot = 'mid'; st.pass = true;
      st.checks.push(['중간에서 보이는 값', { v: mid, cls: 'good' }]);
      push('sent의 값이 중간(네트워크나 저장소)을 지나 받는 쪽으로 갑니다. 중간에서 보이는 것은 이 값뿐입니다. 글자와 열쇠는 중간으로 보내지 않았으므로 보이지 않습니다.', '');
      // 5~. 받는 쪽
      if (rd === 'same') {
        st.hot = 'de'; st.rk = 'same'; st.dec = 'calc';
        push('String read = decrypt(sent, key); 줄에서 받는 쪽이 받은 값 sent와 같은 열쇠 key를 decrypt에 넣습니다. decrypt는 암호화의 반대 계산인 복호화를 합니다.', '');
        st.dec = 'ok'; st.rd = 'ok'; st.res = '예';
        st.checks.push(['받는 쪽이 읽은 것', { v: PT, cls: 'good' }], ['원래 글자를 되찾음', { v: '예', cls: 'good' }]);
        push('복호화 계산 결과로 원래 글자 "카드번호 1234"가 나와 read에 담깁니다. 암호화할 때 쓴 열쇠와 같은 열쇠를 넣었기 때문입니다.', 'good');
        st.hot = '';
        push('System.out.println(sent)가 알아볼 수 없는 값 ' + this.wlen + '자 전체를 출력하고, System.out.println(read)가 카드번호 1234를 출력합니다.', '');
      } else if (rd === 'other') {
        st.hot = 'k2'; st.rk = 'other';
        push('SecretKey otherKey = newKey(); 줄에서 받는 쪽이 쓸 열쇠를 newKey()로 하나 더 만듭니다. 이 열쇠는 처음 만든 key와 다른 열쇠입니다.', '');
        st.hot = 'de'; st.dec = 'calc';
        push('String read = decrypt(sent, otherKey); 줄에서 받는 쪽이 받은 값 sent와 다른 열쇠 otherKey를 decrypt에 넣습니다.', '');
        st.dec = 'fail'; st.rd = 'fail'; st.res = '아니요';
        st.checks.push(['받는 쪽이 읽은 것', { v: readTxt, cls: 'bad' }], ['원래 글자를 되찾음', { v: '아니요', cls: 'bad' }]);
        push('decrypt가 javax.crypto.AEADBadTagException 예외를 던지고, 글자를 얻지 못합니다. 이 실습의 방식(AES-GCM)은 값 끝에 붙은 확인 값(태그)이 풀 때 계산한 값과 맞는지 확인하고, 맞지 않으면 글자를 내놓지 않고 예외로 알립니다. 다른 열쇠로는 확인 값이 맞지 않았습니다.', 'bad');
        st.hot = '';
        push('예외를 처리하는 코드가 없어서 main이 여기서 멈춥니다. 아래의 System.out.println 두 줄은 실행되지 않아 아무것도 출력되지 않습니다.', 'bad');
      } else {
        st.hot = 'rd'; st.rk = 'none'; st.dec = 'raw'; st.rd = 'raw'; st.res = '아니요';
        st.checks.push(['받는 쪽이 읽은 것', { v: mid, cls: 'bad' }], ['원래 글자를 되찾음', { v: '아니요', cls: 'bad' }]);
        push('String read = sent; 줄에서 받는 쪽이 열쇠 없이 받은 값 sent를 그대로 read에 담습니다. 복호화 계산을 하지 않으므로 값은 알아볼 수 없는 채로 남고, 받는 쪽은 글자를 얻지 못합니다.', 'bad');
        st.hot = '';
        push('System.out.println(sent)와 System.out.println(read)가 같은 값 ' + this.wlen + '자를 두 번 출력합니다. 두 줄 모두 "카드번호 1234"가 아닙니다.', '');
      }
    } else {
      st.hot = 'pt'; st.k1 = 'unused';
      push('String sent = "카드번호 1234"; 줄에서 보내는 쪽이 글자를 encrypt에 넣지 않고 그대로 sent에 담습니다. 계산이 없으므로 열쇠 key는 쓰이지 않습니다.', '');
      st.hot = 'mid'; st.pass = true; st.mid = 'plain';
      st.checks.push(['중간에서 보이는 값', { v: PT, cls: 'bad' }]);
      push('sent의 값이 중간(네트워크나 저장소)을 지나 받는 쪽으로 갑니다. 중간에서 보이는 것이 글자 그대로이므로, 중간을 지켜보는 누구나 "카드번호 1234"를 읽을 수 있습니다.', 'bad');
      st.hot = 'rd'; st.dec = 'raw'; st.rd = 'ok'; st.res = '예';
      st.checks.push(['받는 쪽이 읽은 것', { v: PT, cls: '' }], ['원래 글자를 되찾음', { v: '예', cls: '' }]);
      push('String read = sent; 줄에서 받는 쪽이 받은 것을 그대로 read에 담습니다. 풀 필요가 없어서 열쇠도 계산도 쓰이지 않았고, ' + (rd === 'same' ? '받는 쪽이 같은 열쇠를 가졌더라도 쓸 데가 없습니다.' : rd === 'other' ? '받는 쪽이 다른 열쇠를 가졌더라도 상관없습니다.' : '받는 쪽에 열쇠가 없어도 상관없습니다.'), '');
      st.hot = '';
      push('System.out.println(sent)와 System.out.println(read)가 모두 카드번호 1234를 출력합니다.', '');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (on && rd === 'same') {
      sum.push('암호화는 글자를 열쇠와 함께 계산해서 알아볼 수 없는 값으로 바꾸는 것입니다. 중간에서 보인 것은 ' + this.head + '…로 시작하는 알아볼 수 없는 값뿐이었고, 받는 쪽은 같은 열쇠로 복호화해서 원래 글자 "카드번호 1234"를 되찾았습니다.');
      sum.push('해시는 누구도 원래 글자로 되돌리지 못하게 하는 것이고, 암호화는 열쇠를 가진 쪽만 되돌리게 하는 것입니다. 그래서 값을 지키는 것이 아니라 열쇠를 지켜야 합니다.');
    } else if (on && rd === 'none') {
      sum.push('열쇠 없이 받은 값을 그대로 읽으면 알아볼 수 없는 값이 그대로 읽힐 뿐, 글자는 얻지 못합니다. 복호화는 값만으로는 되지 않고, 값과 열쇠를 함께 계산에 넣어야 합니다.');
      sum.push('이 값이 중간에서 누구에게 보여도 열쇠가 없으면 글자를 알 수 없습니다. 그래서 지켜야 하는 것은 값이 아니라 열쇠입니다.');
    } else if (on) {
      sum.push('다른 열쇠로 풀면 decrypt가 javax.crypto.AEADBadTagException 예외를 던지고, 글자를 얻지 못합니다. 열쇠가 암호화할 때 쓴 것과 같아야만 풀립니다.');
      sum.push('이 방식(AES-GCM)은 틀린 열쇠로 풀면 엉뚱한 글자를 내놓지 않고 예외로 알려 줍니다. 예외를 처리하지 않으면 프로그램이 멈추므로, 받는 쪽은 풀지 못했다는 것을 바로 압니다.');
    } else {
      sum.push('암호화하지 않고 보내면 중간에서 보이는 값이 글자 그대로여서, 중간을 지켜보는 누구나 "카드번호 1234"를 읽습니다. 열쇠를 만들어 두기만 하고 쓰지 않으면 아무것도 지켜지지 않습니다.');
      sum.push('암호화는 보내는 쪽이 글자와 열쇠를 encrypt에 넣어야 일어납니다. 받는 쪽이 어떤 열쇠를 가졌는지는 이 경우 결과에 영향이 없습니다.');
    }
    var exc = on && rd === 'other' ? this.excName : '';
    var outKinds = !on ? ['pt', 'pt'] : rd === 'same' ? ['wire', 'pt'] : rd === 'none' ? ['wire', 'wire'] : [];
    return { events: ev, summary: sum, exc: exc, outKinds: outKinds, row: [mid, readTxt, got ? '예' : '아니요'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 열쇠를 만드는 줄부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '값'], s.checks.length ? s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['아직 없음', ''] }], '암호화의 결과');
  },
  // 그림: 왼쪽에 보내는 쪽(글자와 열쇠가 암호화 상자로), 가운데에 중간에서 보이는 값, 오른쪽에 받는 쪽(값과 열쇠가 복호화 상자로, 읽은 것). 열쇠 칸은 양쪽에 따로 그려 같은 열쇠인지 다른 열쇠인지 없는지를 보인다. 암호화하지 않으면 상자와 열쇠가 점선이 되고 가운데에 글자가 그대로 보인다. 맨 아래에 원래 글자를 되찾았는지.
  draw: function (P, sim, shown) {
    var c = sim.c, on = c.enc === 'on', last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    var PT = '카드번호 1234';
    P.size(680, 328);
    P.region('sd', 6, 6, 206, 258, '보내는 쪽');
    P.region('rv', 468, 6, 206, 258, '받는 쪽');
    P.box('pt', 14, 36, 190, 50, { cls: hot === 'pt' ? 'hot now' : 'plain', title: '글자', sub: PT });
    var enSub = !on ? '계산하지 않음' : s && s.enc === 'done' ? '알아볼 수 없는 값이 나옴' : '글자와 열쇠를 계산';
    P.box('en', 14, 112, 190, 62, { cls: !on ? 'ghost' : hot === 'en' ? 'hot now' : s && s.enc === 'done' ? 'good' : 'plain', title: '암호화', sub: enSub });
    var k1Sub = !s || s.k1 === 'none' ? '아직 없음' : s.k1 === 'unused' ? '만들었지만 쓰이지 않음' : 'key (열쇠 A)';
    P.box('k1', 14, 202, 190, 50, { cls: !s || s.k1 === 'none' || s.k1 === 'unused' ? 'ghost' : hot === 'k1' ? 'hot now' : 'plain', title: '열쇠', sub: k1Sub });

    var midSub = s && s.mid === 'cipher' ? [this.head + '…', '(' + this.wlen + '자)'] : s && s.mid === 'plain' ? [PT] : '';
    P.box('mid', 262, 112, 156, 62, { cls: s && s.mid === 'cipher' ? 'good' : s && s.mid === 'plain' ? 'bad' : 'ghost', title: '중간에서 보이는 값', sub: midSub, mono: true });
    P.text('mdl', 340, 196, '네트워크나 저장소', { cls: 'mut', anchor: 'middle' });

    var rdSub = !s || !s.rd ? '' : s.rd === 'ok' ? PT : s.rd === 'fail' ? ['AEADBadTagException', '풀지 못함'] : [this.head + '…', '(' + this.wlen + '자)'];
    P.box('rd', 476, 36, 190, 50, { cls: s && s.rd === 'ok' ? (on ? 'good' : 'plain') : s && s.rd ? 'bad' : hot === 'rd' ? 'hot now' : 'ghost', title: '받는 쪽이 읽은 것', sub: rdSub, mono: true });
    var deOn = on && c.reader !== 'none';
    var deSub = !deOn ? '계산하지 않음' : !s || !s.dec ? '값과 열쇠를 계산' : s.dec === 'calc' ? '값과 열쇠를 넣는 중' : s.dec === 'ok' ? '원래 글자가 나옴' : '예외를 던짐';
    P.box('de', 476, 112, 190, 62, { cls: !deOn ? 'ghost' : s && s.dec === 'ok' ? 'good' : s && s.dec === 'fail' ? 'bad' : hot === 'de' ? 'hot now' : 'plain', title: '복호화', sub: deSub });
    var k2Sub = !on ? '쓰이지 않음' : c.reader === 'none' ? '열쇠 없음' : !s || !s.rk ? '' : s.rk === 'same' ? 'key (같은 열쇠 A)' : 'otherKey (열쇠 B)';
    P.box('k2', 476, 202, 190, 50, { cls: !on || c.reader === 'none' || !s || !s.rk ? 'ghost' : s.rk === 'other' ? (hot === 'k2' ? 'hot now' : 'wait') : 'plain', title: '열쇠', sub: k2Sub });

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
    P.box('res', 14, 276, 652, 40, { cls: s && s.res === '예' ? (on ? 'good' : 'plain') : s && s.res ? 'bad' : 'ghost', title: '원래 글자를 되찾음', right: s ? s.res : '' });
  },
  assume: '자바 JDK 21.0.12.1의 javax.crypto.Cipher("AES/GCM/NoPadding")로 실제 계산했고, 열쇠는 256비트, 태그는 128비트, 암호화마다 새로 만드는 12바이트 nonce를 결과 앞에 붙여 Base64로 적었습니다. 화면에서 줄인 것은 import, main의 선언, 도우미 메서드 newKey, encrypt, decrypt의 본문입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 줄을 main에 담은 소스를 javax.tools로 컴파일하고 클래스를 새 클래스 로더로 읽어 Main.main을 실행해, 표준 출력과 던져진 예외를 잡은 결과와 대조했습니다. 대조한 것은 중간에서 보이는 값(encrypt가 돌려준 값의 앞 12자와 전체 글자 수), 받는 쪽이 읽은 것, 원래 글자를 되찾았는지, 다른 열쇠로 풀 때 던져진 예외의 이름(javax.crypto.AEADBadTagException, 메시지 Tag mismatch)과 그때 아무것도 출력되지 않는 것입니다. 암호화한 값은 실행할 때마다 달라집니다. 대조를 위해 열쇠와 nonce를 정해진 값으로 고정해 같은 값이 나오게 했고(실제로는 둘 다 무작위로 만듭니다), 화면의 ih/DXie50GTx…(60자)는 그렇게 얻은 한 예입니다. 같은 글자를 같은 열쇠로 nonce를 새로 만들어 두 번 암호화하면 두 값이 서로 달랐고 둘 다 풀렸으며, 무작위로 만든 열쇠와 nonce로 여섯 조합을 다시 실행해도 결과의 종류(읽은 글자, 예외 이름, 값의 길이)는 같았습니다. 화면에 보이는 앞 12자는 값 앞에 붙은 nonce 부분(앞 9바이트)이고, 암호화된 글자 부분은 그 뒤에 이어집니다. 값의 길이는 글자의 길이에 따라 달라집니다. 계산이 표준대로인지는 두 가지로 확인했습니다. 같은 열쇠, nonce, 글자를 Node.js의 aes-256-gcm으로도 암호화해 암호문과 태그가 자바와 바이트까지 같았고, Node.js가 자바의 값을 같은 열쇠로 풀고 다른 열쇠로는 풀지 못했습니다. 또 NIST 암호 알고리즘 검증 프로그램(CAVP)이 공개한 GCM 시험 벡터(gcmtestvectors.zip의 gcmEncryptExtIV256.rsp와 gcmDecrypt256.rsp, 열쇠 256비트, IV 96비트, 글자 128비트, 추가 데이터 없음, 태그 128비트)에서 암호화 한 건의 암호문과 태그, 복호화 두 건(통과 한 건, FAIL 한 건)의 결과가 자바 계산과 같았습니다. 문서는 직접 열어 확인했습니다. NIST FIPS 197(2023년 갱신판) 머리말 3항은 AES를 암호화하고 복호화할 수 있는 대칭 블록 암호로 소개하고, 열쇠 길이는 128, 192, 256비트이며 데이터는 128비트 블록 단위라고 적습니다. NIST SP 800-38D(2007년판)는 3절에서 GCM이 데이터의 기밀성과 인증을 함께 보장한다고 하고, 5.2.2절과 7.2절에서 인증된 복호화는 확인 값(태그)이 맞으면 글자를, 맞지 않으면 글자 대신 FAIL을 내놓는다고 정하며, 8절에서 같은 열쇠와 같은 IV로 서로 다른 데이터를 암호화하는 일이 일어날 확률을 2의 -32제곱 이하로 하라고 요구하고, 5.2.1.1절에서 IV 길이는 96비트를 권장합니다. Java 21의 Cipher 문서는 AEAD 방식(GCM 등)에서 태그가 암호문 뒤에 붙고 복호화할 때 확인된다고 설명하고, 같은 열쇠로 암호화할 때마다 IV를 바꾸라고 안내하며, AEADBadTagException 문서는 AEAD 방식의 Cipher가 태그를 확인하지 못할 때 던져진다고 설명합니다. 이 실습은 보내는 쪽과 받는 쪽이 같은 열쇠를 쓰는 방식(대칭 키 암호화)만 다룹니다. 열쇠가 둘인 방식(공개 키)과 서명은 "세부 동작 실습: 해시·암호화·서명"에서 다루고, 받는 쪽이 같은 열쇠를 어떻게 안전하게 갖게 되는지(열쇠 전달)는 다루지 않습니다. 다른 열쇠로 풀 때 예외가 나는 것은 이 실습이 고른 방식(AES-GCM)이 값이 바뀌었거나 열쇠가 다른지를 태그로 함께 확인하기 때문입니다. 그런 확인이 없는 방식에서는 다를 수 있어서, 다른 열쇠로 AES/CTR/NoPadding을 풀어 보았더니 예외 없이 원래 글자가 아닌 다른 바이트가 나왔습니다. 열쇠를 안전하게 보관하는 방법은 다루지 않았습니다.',
});
