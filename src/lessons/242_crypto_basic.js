Lab.register({
  id: 'crypto_basic', nav: '암호화', cat: '기초개념', mode: 'step', basic: true, deep: ['crypto'],
  title: '암호화는 무엇이고, 열쇠가 없으면 어떻게 되는가',
  why: '전화번호나 카드 번호처럼 나중에 원래 값을 다시 읽어야 하는 정보는 해시로 바꾸면 되찾을 길이 없고, 글자 그대로 두면 통신을 엿보거나 저장소를 훔친 사람이 다 읽는다. 암호화는 열쇠를 아는 쪽만 원래 값으로 되돌릴 수 있게 해서, 필요한 쪽은 값을 다시 쓰고 열쇠가 없는 사람에게는 알아볼 수 없는 값으로 남게 한다.',
  use: 'HTTPS가 주고받는 글을 감추는 데 쓰고, DB에 주소, 전화번호, 계좌 번호처럼 다시 읽어야 하는 개인 정보를 저장할 때도 쓴다. 자바에서는 표준 라이브러리 javax.crypto의 KeyGenerator로 열쇠를 만들고 Cipher로 암호화와 복호화를 한다. 열쇠는 코드에 적어 두지 않고 환경 변수나 열쇠를 따로 맡아 주는 서비스에 둔다. 다시 읽을 필요가 없는 비밀번호는 암호화하지 않고 해시로 저장한다.',
  intro: '암호화는 글자를 열쇠와 함께 계산해서 알아볼 수 없는 바이트로 바꾸는 것입니다. 자바에서는 표준 라이브러리(javax.crypto 패키지)가 이 일을 합니다. KeyGenerator가 열쇠를 만들고, Cipher가 그 열쇠로 계산합니다. 보내는 쪽은 Cipher를 암호화 모드(Cipher.ENCRYPT_MODE)로 정해 doFinal을 부르고, 같은 열쇠를 가진 받는 쪽은 Cipher를 복호화 모드(Cipher.DECRYPT_MODE)로 정해 doFinal을 불러 원래 글자를 되찾습니다. 열쇠가 다르면 되찾지 못하므로, 지켜야 하는 것은 값이 아니라 열쇠입니다. 이 실습은 암호화를 하거나 빼고, 중간에서 바이트 하나를 바꾸기도 하고, 받는 쪽의 열쇠를 같은 것과 다른 것으로 바꾸면서, 중간에서 보이는 것과 받는 쪽이 읽은 것을 실제로 실행해 확인합니다.',
  terms: ['암호화', '복호화', '열쇠(키)', 'KeyGenerator와 SecretKey', 'Cipher', 'IV(초기화 벡터)', 'AES-GCM과 태그', '대칭키 암호화와 비대칭키 암호화'],
  controls: [
    { id: 'enc', label: '보내는 쪽 (byte[] sent 줄)', type: 'select', value: 'on', options: [['on', 'Cipher로 암호화해서 보낸다: encCipher.doFinal(…)'], ['off', '암호화하지 않고 글자의 바이트를 그대로 보낸다']] },
    { id: 'mid', label: '중간 (네트워크나 DB)', type: 'select', value: 'keep', options: [['keep', '바이트를 건드리지 않는다'], ['tamper', '누군가 바이트 하나를 조금 바꾼다: sent[16] ^= 1;']] },
    { id: 'reader', label: '받는 쪽 (decCipher.init 줄)', type: 'select', value: 'same', options: [['same', '같은 열쇠로 푼다: key'], ['other', '다른 열쇠로 푼다: otherKey']], show: function (c) { return c.enc === 'on'; } },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '자바 표준 Cipher로 암호화하면 중간에서는 무엇이 보이고, 같은 열쇠로 풀면 무엇이 나오나', d: '중간에서는 깨진 글자만 보이고, 같은 열쇠로 doFinal을 부르면 원래 글자가 나옵니다.', v: { enc: 'on', mid: 'keep', reader: 'same' } },
    { t: '다른 열쇠로 풀면', q: '받는 쪽이 다른 열쇠로 doFinal을 부르면', d: 'doFinal이 AEADBadTagException을 던지고 글자를 얻지 못합니다.', v: { enc: 'on', mid: 'keep', reader: 'other' } },
    { t: '중간에서 바이트가 바뀌면', q: '암호화한 바이트가 중간에서 하나 바뀐 채 도착하면, 같은 열쇠로 풀어도 되나', d: '열쇠가 맞아도 doFinal이 AEADBadTagException을 던져서, 바뀐 것을 받는 쪽이 압니다.', v: { enc: 'on', mid: 'tamper', reader: 'same' } },
    { t: '암호화하지 않고 보내면', q: '암호화하지 않고 글자의 바이트를 그대로 보내면', d: '중간에서 글자로 바꿔 보면 카드번호 1234가 그대로 보입니다.', v: { enc: 'off', mid: 'keep', reader: 'same' } },
    { t: '암호화 없이 바이트가 바뀌면', q: '암호화하지 않은 바이트가 중간에서 하나 바뀌면', d: '받는 쪽이 카드번호 1235를 읽고, 바뀐 줄 모릅니다.', v: { enc: 'off', mid: 'tamper', reader: 'same' } },
  ],
  // 대조한 값: 실제 실행(verify/plain/CryptoBasicProbe.java)에서 얻은 바이트 수
  pt: '카드번호 1234',
  changed: '카드번호 1235',
  ptLen: 17,
  sentLen: 33,
  tagLen: 16,
  excName: 'javax.crypto.AEADBadTagException',
  code: function (c) {
    var on = c.enc === 'on', tam = c.mid === 'tamper', other = on && c.reader === 'other';
    var o = ['// main 메서드 안의 줄만 보임 (클래스·main 선언과 import는 생략)', '',
      '// ① 열쇠 만들기: KeyGenerator는 자바가 주는 클래스',
      'KeyGenerator gen = KeyGenerator.getInstance("AES");   // AES 열쇠를 만드는 도구를 얻는다',
      'gen.init(256);                                        // 열쇠 길이를 256비트로 정한다',
      'SecretKey key = gen.generateKey();                    // 무작위 열쇠를 하나 만든다',
      ''];
    if (on) o.push('// ② 보내는 쪽: Cipher(자바가 주는 클래스)로 암호화한다',
      'byte[] iv = new byte[12];                             // 12바이트 배열을 만든다',
      'new SecureRandom().nextBytes(iv);                     // iv를 무작위 바이트로 채운다',
      'Cipher encCipher = Cipher.getInstance("AES/GCM/NoPadding");             // AES-GCM으로 계산할 Cipher를 얻는다',
      'encCipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv)); // 암호화 모드, 열쇠, iv를 정한다',
      'byte[] sent = encCipher.doFinal("카드번호 1234".getBytes(StandardCharsets.UTF_8)); // 글자의 바이트를 암호화한다',
      '');
    else o.push('// ② 보내는 쪽: 암호화하지 않고 글자를 바이트로만 바꾼다',
      'byte[] sent = "카드번호 1234".getBytes(StandardCharsets.UTF_8); // 글자를 UTF-8 바이트로 바꾼다',
      '');
    o.push('// ③ 중간(네트워크나 DB): 지나가는 바이트를 글자로 바꿔 본다',
      'System.out.println(new String(sent, StandardCharsets.UTF_8));');
    if (tam) o.push('sent[16] ^= 1;                                        // 중간에서 17번째 바이트의 비트 하나를 바꾼다');
    o.push('');
    if (on) {
      o.push(other ? '// ④ 받는 쪽: 다른 열쇠로 푼다' : '// ④ 받는 쪽: 같은 열쇠로 푼다');
      if (other) o.push('SecretKey otherKey = gen.generateKey();               // 열쇠를 하나 더 만든다 (key와 다른 열쇠)');
      o.push('Cipher decCipher = Cipher.getInstance("AES/GCM/NoPadding");             // 같은 방식의 Cipher를 얻는다',
        'decCipher.init(Cipher.DECRYPT_MODE, ' + (other ? 'otherKey' : 'key') + ', new GCMParameterSpec(128, iv)); // 복호화 모드, ' + (other ? '다른 열쇠' : '같은 열쇠') + ', 같은 iv를 정한다',
        'byte[] read = decCipher.doFinal(sent);                // 풀어서 원래 바이트를 얻는다');
    } else {
      o.push('// ④ 받는 쪽: 풀 필요 없이 받은 바이트를 그대로 쓴다',
        'byte[] read = sent;                                   // 열쇠도 Cipher도 쓰지 않는다');
    }
    o.push('System.out.println(new String(read, StandardCharsets.UTF_8)); // 바이트를 글자로 바꿔 출력한다');
    return o.join('\n');
  },
  label: function (c) {
    var t = c.mid === 'tamper' ? ' · 중간에서 바뀜' : '';
    return c.enc === 'on' ? '암호화함' + t + ' · ' + (c.reader === 'other' ? '다른 열쇠로 풂' : '같은 열쇠로 풂') : '암호화 안 함' + t;
  },
  columns: ['중간에서 보이는 것', '받는 쪽이 읽은 것', '원래 글자를 되찾음'],
  simulate: function (c) {
    var PT = this.pt, on = c.enc === 'on', tam = c.mid === 'tamper', other = on && c.reader === 'other', ev = [], sum = [];
    var mid = on ? '깨진 글자 (' + this.sentLen + '바이트)' : PT;
    var fail = on && (other || tam);
    var readTxt = fail ? '예외 AEADBadTagException' : tam ? this.changed : PT;
    var got = fail ? '아니요 (예외로 알림)' : tam ? '아니요 (바뀐 줄 모름)' : '예';
    var st = { hot: '', k1: 'none', enc: '', mid: '', tam: false, rk: '', dec: '', rd: '', res: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // ① 열쇠
    st.hot = 'k1';
    push('KeyGenerator gen = KeyGenerator.getInstance("AES"); 줄에서 AES 열쇠를 만드는 도구를 얻습니다. KeyGenerator는 자바가 주는 클래스(javax.crypto 패키지)이고, getInstance에 넘긴 "AES"는 계산 방식의 이름입니다. AES는 미국 표준(NIST FIPS 197)으로 정해진, 같은 열쇠로 암호화하고 복호화하는 방식입니다.', '');
    st.k1 = 'made';
    push('gen.init(256); 줄이 열쇠 길이를 256비트(32바이트)로 정하고, SecretKey key = gen.generateKey(); 줄이 무작위 열쇠를 하나 만듭니다. 변수 key의 타입 SecretKey는 자바가 주는 타입으로, 남에게 보이면 안 되는 열쇠를 나타냅니다.', '');

    if (on) {
      // ② 보내는 쪽
      st.hot = 'en'; st.enc = 'iv';
      push('byte[] iv = new byte[12]; 줄이 12바이트 배열을 만들고, new SecureRandom().nextBytes(iv); 줄이 그 배열을 무작위 바이트로 채웁니다. SecureRandom은 자바가 주는, 암호에 쓸 만한 무작위 값을 만드는 클래스입니다. iv는 열쇠가 아니라, 같은 열쇠로 암호화할 때마다 새로 정하는 값입니다. 같은 열쇠로 같은 iv를 다시 쓰면 안 됩니다.', '');
      st.enc = 'calc';
      push('Cipher encCipher = Cipher.getInstance("AES/GCM/NoPadding"); 줄이 계산을 맡을 Cipher를 얻습니다. Cipher는 암호화와 복호화를 하는 자바 표준 클래스이고, "AES/GCM/NoPadding"은 AES를 GCM 방식으로, 덧붙이는 바이트(패딩) 없이 쓰겠다는 뜻입니다. 이어서 encCipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv)); 줄이 이 Cipher를 암호화 모드로 정하고 열쇠 key와 iv를 넘깁니다. 128은 끝에 붙일 확인 값(태그)의 길이 128비트입니다.', '');
      st.enc = 'done';
      push('byte[] sent = encCipher.doFinal("카드번호 1234".getBytes(StandardCharsets.UTF_8)); 줄에서 getBytes가 글자를 UTF-8 바이트 ' + this.ptLen + '개로 바꾸고, doFinal이 그 바이트를 열쇠와 iv로 암호화합니다. 돌아온 sent는 ' + this.sentLen + '바이트입니다. 앞 ' + this.ptLen + '바이트가 암호화된 글자이고, 뒤 ' + this.tagLen + '바이트가 확인 값(태그)입니다.', '');
    } else {
      st.hot = 'pt'; st.k1 = 'unused';
      push('byte[] sent = "카드번호 1234".getBytes(StandardCharsets.UTF_8); 줄은 글자를 UTF-8 바이트 ' + this.ptLen + '개로 바꾸기만 합니다. Cipher를 쓰지 않으므로 열쇠 key는 만들어 두기만 하고 쓰이지 않습니다.', '');
    }

    // ③ 중간
    st.hot = 'mid'; st.mid = on ? 'cipher' : 'plain';
    st.checks.push(['중간에서 보이는 것', { v: mid, cls: on ? 'good' : 'bad' }]);
    if (on) push('System.out.println(new String(sent, StandardCharsets.UTF_8)); 줄은 중간(네트워크나 DB)에서 누군가 이 바이트를 글자로 바꿔 보는 것과 같습니다. 첫 줄로 �와 뜻 없는 기호가 섞인 깨진 글자가 출력되고, "카드번호"도 "1234"도 보이지 않습니다. 열쇠와 iv가 실행할 때마다 무작위로 정해지므로 깨진 모양도 매번 다릅니다.', '');
    else push('System.out.println(new String(sent, StandardCharsets.UTF_8)); 줄은 중간(네트워크나 DB)에서 누군가 이 바이트를 글자로 바꿔 보는 것과 같습니다. 바이트를 글자로 바꾸는 방법(UTF-8)은 누구나 아는 표준이어서, 첫 줄로 카드번호 1234가 그대로 출력됩니다.', 'bad');
    if (tam) {
      st.tam = true;
      if (on) push('sent[16] ^= 1; 줄은 중간에서 누군가 17번째 바이트(번호는 0부터 세므로 sent[16])의 비트 하나를 0과 1로 뒤집습니다. 이 자리는 글자 "4"를 암호화한 바이트입니다. 열쇠가 없어도 바이트를 바꾸는 일은 누구나 할 수 있습니다.', 'bad');
      else push('sent[16] ^= 1; 줄은 중간에서 누군가 17번째 바이트(번호는 0부터 세므로 sent[16])의 비트 하나를 0과 1로 뒤집습니다. 이 자리는 글자 "4"의 바이트여서, 비트 하나가 바뀌면 "5"의 바이트가 됩니다.', 'bad');
    }

    // ④ 받는 쪽
    if (on) {
      if (other) {
        st.hot = 'k2'; st.rk = 'other';
        push('SecretKey otherKey = gen.generateKey(); 줄이 같은 도구로 열쇠를 하나 더 만듭니다. 무작위로 만들므로 처음 만든 key와 다른 열쇠입니다.', '');
      } else st.rk = 'same';
      st.hot = 'de'; st.dec = 'calc';
      push('Cipher decCipher = Cipher.getInstance("AES/GCM/NoPadding"); 줄로 받는 쪽도 같은 방식의 Cipher를 얻고, decCipher.init(Cipher.DECRYPT_MODE, ' + (other ? 'otherKey' : 'key') + ', new GCMParameterSpec(128, iv)); 줄로 복호화 모드, ' + (other ? '다른 열쇠 otherKey' : '같은 열쇠 key') + ', 같은 iv를 정합니다. 받는 쪽도 iv가 있어야 풀 수 있으므로 실제로는 iv를 암호문과 함께 보냅니다. 이 코드는 한 main 안이라 변수 iv를 그대로 씁니다.', '');
      if (!fail) {
        st.dec = 'ok'; st.rd = 'ok'; st.res = 'ok';
        st.checks.push(['받는 쪽이 읽은 것', { v: PT, cls: 'good' }], ['원래 글자를 되찾음', { v: got, cls: 'good' }]);
        push('byte[] read = decCipher.doFinal(sent); 줄에서 doFinal이 받은 바이트로 태그를 다시 계산해 끝의 태그와 맞는지 확인하고, 맞으므로 원래 바이트 ' + this.ptLen + '개를 돌려줍니다. 마지막 줄의 new String(read, StandardCharsets.UTF_8)이 그 바이트를 글자로 바꿔 둘째 줄로 카드번호 1234를 출력합니다. 암호화할 때와 같은 열쇠, 같은 iv를 넣었기 때문입니다.', 'good');
      } else {
        st.dec = 'fail'; st.rd = 'fail'; st.res = 'fail';
        st.checks.push(['받는 쪽이 읽은 것', { v: readTxt, cls: 'bad' }], ['원래 글자를 되찾음', { v: got, cls: 'bad' }]);
        var why = other && tam ? '열쇠가 다르고 바이트도 바뀌어서' : other ? '열쇠가 달라서' : '열쇠는 같지만 바이트 하나가 바뀌어서';
        push('byte[] read = decCipher.doFinal(sent); 줄에서 doFinal이 받은 바이트로 태그를 다시 계산해 끝의 태그와 견줍니다. ' + why + ' 태그가 맞지 않고, doFinal은 글자를 돌려주지 않고 javax.crypto.AEADBadTagException(메시지 Tag mismatch)을 던집니다.', 'bad');
        st.hot = '';
        push('main에 예외를 처리하는 코드가 없어서 main이 여기서 멈춥니다. 마지막 System.out.println은 실행되지 않으므로, 출력은 중간에서 본 깨진 글자 한 줄뿐입니다.', 'bad');
      }
    } else {
      st.hot = 'rd'; st.dec = 'raw'; st.rd = tam ? 'changed' : 'ok'; st.res = tam ? 'changed' : 'ok';
      st.checks.push(['받는 쪽이 읽은 것', { v: readTxt, cls: tam ? 'bad' : '' }], ['원래 글자를 되찾음', { v: got, cls: tam ? 'bad' : '' }]);
      if (tam) push('byte[] read = sent; 줄에서 받는 쪽은 받은 바이트를 그대로 쓰고, 마지막 줄이 둘째 줄로 카드번호 1235를 출력합니다. 예외도 경고도 없어서 받는 쪽은 중간에서 바뀐 줄 모릅니다. 바이트에 확인 값(태그)이 붙어 있지 않기 때문입니다.', 'bad');
      else push('byte[] read = sent; 줄에서 받는 쪽은 받은 바이트를 그대로 쓰고, 마지막 줄이 둘째 줄로 카드번호 1234를 출력합니다. 풀 필요가 없어서 열쇠도 Cipher도 쓰이지 않았습니다.', '');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (on && !fail) {
      sum.push('Cipher를 암호화 모드로 정해 doFinal을 부르면 글자의 바이트가 알아볼 수 없는 ' + this.sentLen + '바이트(암호화된 글자 ' + this.ptLen + '바이트와 태그 ' + this.tagLen + '바이트)로 바뀌어, 중간에서는 깨진 글자만 보였습니다. 받는 쪽은 같은 열쇠와 같은 iv로 Cipher를 복호화 모드로 정해 doFinal을 불러 카드번호 1234를 되찾았습니다.');
      sum.push('열쇠를 만드는 KeyGenerator, 계산하는 Cipher, iv와 태그 길이를 넘기는 GCMParameterSpec은 모두 자바가 주는 것입니다. 실무 코드에서는 이 줄들을 encrypt, decrypt 같은 이름의 메서드로 묶어 두고 부르기도 하는데, 그런 메서드는 직접 만드는 것이고 계산은 안에서 부르는 Cipher가 합니다.');
    } else if (on && other) {
      sum.push('다른 열쇠로 doFinal을 부르면 javax.crypto.AEADBadTagException이 나고 글자를 얻지 못합니다. 암호화할 때 쓴 것과 같은 열쇠여야만 풀립니다' + (tam ? '. 이 설정은 바이트도 바뀌어 있었지만, 열쇠가 다른 것만으로도 같은 예외가 납니다.' : '.'));
      sum.push('AES-GCM은 틀린 열쇠로 풀 때 엉뚱한 글자를 내놓지 않고 태그가 맞지 않는다고 예외로 알립니다. 그래서 받는 쪽은 풀지 못했다는 것을 바로 압니다. 지켜야 하는 것은 값이 아니라 열쇠입니다.');
    } else if (on) {
      sum.push('열쇠가 같아도 중간에서 바이트 하나가 바뀌면 doFinal이 javax.crypto.AEADBadTagException을 던집니다. 받는 쪽은 바뀐 글자를 받는 대신, 누군가 바이트를 건드렸다는 것을 압니다.');
      sum.push('AES-GCM은 글자를 감추는 일과 함께, 끝에 붙인 태그로 바이트가 바뀌지 않았는지를 확인합니다. 태그가 없는 방식(AES/CTR)으로 같은 바이트를 바꿔 보면 예외 없이 카드번호 1235가 나옵니다.');
    } else if (tam) {
      sum.push('암호화하지 않은 바이트는 중간에서 누구나 읽고, 바꿀 수도 있습니다. 비트 하나를 바꾸자 받는 쪽은 카드번호 1235를 읽었고, 바뀐 줄 몰랐습니다.');
      sum.push('같은 일을 AES-GCM으로 암호화한 바이트에 하면 doFinal이 AEADBadTagException을 던져 바뀐 것을 알립니다. 감추기와 바뀐 것 알아채기를 Cipher가 함께 합니다.');
    } else {
      sum.push('암호화하지 않고 보내면 중간에서 바이트를 글자로 바꿔 보는 것만으로 카드번호 1234가 그대로 보입니다. 바이트로 바꾸는 것(getBytes)은 암호화가 아닙니다.');
      sum.push('열쇠를 만들어 두기만 하고 Cipher로 계산하지 않으면 아무것도 지켜지지 않습니다. 받는 쪽이 어떤 열쇠를 가졌는지도 이 경우 결과에 영향이 없습니다.');
    }
    var exc = fail ? this.excName : '';
    var out = fail ? ['garbled'] : on ? ['garbled', 'pt'] : tam ? ['pt', 'changed'] : ['pt', 'pt'];
    return { events: ev, summary: sum, exc: exc, out: out, row: [mid, readTxt, got] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 열쇠를 만드는 줄부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '값'], s.checks.length ? s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['아직 없음', ''] }], '암호화의 결과');
  },
  // 그림: 왼쪽에 보내는 쪽(글자와 열쇠가 암호화 Cipher로), 가운데에 중간에서 보이는 것(바뀌었으면 아래에 표시), 오른쪽에 받는 쪽(바이트와 열쇠가 복호화 Cipher로, 읽은 것). 열쇠 칸은 양쪽에 따로 그려 같은 열쇠인지 다른 열쇠인지를 보인다. 암호화하지 않으면 Cipher 상자와 열쇠가 흐려지고 가운데에 글자가 그대로 보인다. 맨 아래에 원래 글자를 되찾았는지.
  draw: function (P, sim, shown) {
    var c = sim.c, on = c.enc === 'on', last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    var PT = this.pt;
    P.size(680, 328);
    P.region('sd', 6, 6, 206, 258, '보내는 쪽');
    P.region('rv', 468, 6, 206, 258, '받는 쪽');
    P.box('pt', 14, 36, 190, 50, { cls: hot === 'pt' ? 'hot now' : 'plain', title: '글자', sub: PT });
    var enSub = !on ? '쓰이지 않음' : !s || !s.enc ? '아직 계산 전' : s.enc === 'iv' ? 'iv 12바이트를 만듦' : s.enc === 'calc' ? 'ENCRYPT_MODE, key, iv' : this.sentLen + '바이트가 나옴';
    P.box('en', 14, 112, 190, 62, { cls: !on ? 'ghost' : s && s.enc === 'done' ? (hot === 'en' ? 'good now' : 'good') : hot === 'en' ? 'hot now' : 'plain', title: '암호화 (encCipher)', sub: enSub });
    var k1Sub = !s || s.k1 === 'none' ? '아직 없음' : s.k1 === 'unused' ? '만들었지만 쓰이지 않음' : 'key (열쇠 A)';
    P.box('k1', 14, 202, 190, 50, { cls: !s || s.k1 === 'none' || s.k1 === 'unused' ? 'ghost' : hot === 'k1' ? 'hot now' : 'plain', title: '열쇠', sub: k1Sub });

    var midSub = s && s.mid === 'cipher' ? ['깨진 글자', '(' + this.sentLen + '바이트)'] : s && s.mid === 'plain' ? [PT] : '';
    P.box('mid', 262, 112, 156, 62, { cls: s && s.mid === 'cipher' ? (hot === 'mid' ? 'good now' : 'good') : s && s.mid === 'plain' ? 'bad' : 'ghost', title: '중간에서 보이는 것', sub: midSub, mono: true });
    P.text('mdl', 340, 196, '네트워크나 DB', { cls: 'mut', anchor: 'middle' });
    if (s && s.tam) P.text('tam', 340, 218, '17번째 바이트가 바뀜', { cls: 'bad', anchor: 'middle' });

    var rdSub = !s || !s.rd ? '' : s.rd === 'ok' ? PT : s.rd === 'changed' ? this.changed : ['AEADBadTag', 'Exception'];
    P.box('rd', 476, 36, 190, 50, { cls: s && s.rd === 'ok' ? (on ? 'good' : 'plain') : s && s.rd ? 'bad' : hot === 'rd' ? 'hot now' : 'ghost', title: '받는 쪽이 읽은 것', sub: rdSub, mono: true });
    var deSub = !on ? '쓰이지 않음' : !s || !s.dec ? '아직 계산 전' : s.dec === 'calc' ? 'DECRYPT_MODE, 열쇠, iv' : s.dec === 'ok' ? '태그가 맞음' : '태그가 맞지 않음';
    P.box('de', 476, 112, 190, 62, { cls: !on ? 'ghost' : s && s.dec === 'ok' ? 'good' : s && s.dec === 'fail' ? 'bad' : hot === 'de' ? 'hot now' : 'plain', title: '복호화 (decCipher)', sub: deSub });
    var k2Sub = !on ? '쓰이지 않음' : !s || !s.rk ? '' : s.rk === 'same' ? 'key (같은 열쇠 A)' : 'otherKey (열쇠 B)';
    P.box('k2', 476, 202, 190, 50, { cls: !on || !s || !s.rk ? 'ghost' : s.rk === 'other' ? (hot === 'k2' ? 'hot now' : 'wait') : 'plain', title: '열쇠', sub: k2Sub });

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
    var resTxt = !s || !s.res ? '' : s.res === 'ok' ? '예' : s.res === 'fail' ? '아니요 (예외로 알림)' : '아니요 (바뀐 줄 모름)';
    P.box('res', 14, 276, 652, 40, { cls: s && s.res === 'ok' ? (on ? 'good' : 'plain') : s && s.res ? 'bad' : 'ghost', title: '원래 글자를 되찾음', right: resTxt });
  },
  assume: '자바 JDK 21.0.12.1에서 실제로 실행해 대조했습니다(verify/plain/CryptoBasicProbe.java, 대조 도구 cmp_crypto_basic.js). 여덟 가지 조합마다 화면의 코드(머리 주석 한 줄을 뺀 main 안의 줄)를 한 글자도 바꾸지 않고 main 안에 넣고, import와 클래스·main 선언(throws Exception)만 붙여 javax.tools로 컴파일한 뒤 실행해 표준 출력과 던져진 예외를 잡았습니다. 대조한 것은 중간에서 보이는 것(첫 줄), 받는 쪽이 읽은 것(둘째 줄), 던져진 예외의 이름과 메시지(javax.crypto.AEADBadTagException, Tag mismatch), 예외가 나면 둘째 줄이 출력되지 않는 것입니다. 열쇠와 iv는 실행할 때마다 무작위로 정해지므로, 대조하는 동안만 시험용 보안 제공자를 맨 앞 순위에 넣어 SecureRandom이 정해진 바이트(00, 01, 02, …)를 내놓게 했습니다. 화면의 코드는 그대로이고, KeyGenerator.init(256)과 new SecureRandom()이 그 바이트를 쓰는 것을 따로 확인했습니다. 같은 코드를 실제 무작위 값으로 다시 돌려도 결과의 종류(읽은 글자, 예외 이름, 출력 줄 수)는 같았습니다. 깨진 글자의 모양은 열쇠와 iv에 따라 달라지므로 화면에는 바이트 수만 적었습니다. 단계 문장이 기대는 사실도 실행해 확인했습니다. "카드번호 1234"는 UTF-8로 17바이트이고, doFinal의 결과는 33바이트(암호화된 글자 17바이트와 태그 16바이트)였습니다. 그 바이트를 new String(…, StandardCharsets.UTF_8)으로 바꾼 글자에는 �가 섞여 있고 "카드"도 "1234"도 없었습니다. 무작위 열쇠 두 개로 100번, 다른 열쇠로 풀면 100번 모두 AEADBadTagException이었고, 33바이트 중 어느 자리의 비트 하나를 뒤집어도 33번 모두 같은 예외였습니다. 같은 글자를 같은 열쇠로 iv만 새로 정해 두 번 암호화하면 두 결과가 달랐고 둘 다 풀렸습니다. 암호화에 쓴 Cipher를 같은 열쇠와 같은 iv로 다시 암호화 모드로 정하려 하면 자바가 InvalidAlgorithmParameterException(Cannot reuse iv for GCM encryption)으로 막았습니다. sent[16]이 글자 "4"를 암호화한 자리라는 것은, GCM이 글자 부분을 계산하는 카운터 방식(SP 800-38D 7.1절)을 AES/CTR로 따로 돌려 바뀐 바이트를 태그 확인 없이 풀어 보니 카드번호 1235가 나오는 것으로 확인했습니다. 태그가 없는 AES/CTR/NoPadding으로 암호화한 바이트의 같은 자리를 바꾸면 예외 없이 카드번호 1235가 나왔고, 다른 열쇠로 풀면 예외 없이 원래 글자가 아닌 17바이트가 나왔습니다. 암호화하지 않은 바이트의 sent[16]은 "4"(0x34)이고, 비트 하나를 뒤집으면 "5"(0x35)입니다. 계산이 표준대로인지는 두 가지로 확인했습니다. 같은 열쇠, iv, 글자를 Node.js의 aes-256-gcm으로 암호화한 바이트(암호문과 태그)가 자바의 doFinal 결과와 바이트까지 같았고, Node.js도 자바의 값을 같은 열쇠로만 풀고 다른 열쇠나 바뀐 바이트로는 풀지 못했습니다. 또 NIST 암호 알고리즘 검증 프로그램(CAVP)이 공개한 GCM 시험 벡터(gcmtestvectors.zip의 gcmEncryptExtIV256.rsp와 gcmDecrypt256.rsp, 열쇠 256비트, IV 96비트, 글자 128비트, 추가 데이터 없음, 태그 128비트)에서 암호화 한 건의 암호문과 태그, 복호화 두 건(통과 한 건, FAIL 한 건)의 결과가 자바 계산과 같았습니다. KeyGenerator, SecretKey, SecureRandom, Cipher, GCMParameterSpec의 이름과 부르는 법은 위의 컴파일과 실행으로 확인했고, GCMParameterSpec의 첫 인자 128이 태그 길이(비트)라는 것은 결과가 16바이트 길어진 것으로 확인했습니다. 문서는 이전 판에서 직접 열어 확인한 내용입니다. NIST FIPS 197(2023년 갱신판) 머리말 3항은 AES를 암호화하고 복호화할 수 있는 대칭 블록 암호로 소개하고, 열쇠 길이는 128, 192, 256비트라고 적습니다. NIST SP 800-38D(2007년판)는 3절에서 GCM이 데이터의 기밀성과 인증을 함께 보장한다고 하고, 5.2.2절과 7.2절에서 인증된 복호화는 태그가 맞으면 글자를, 맞지 않으면 글자 대신 FAIL을 내놓는다고 정하며, 8절에서 같은 열쇠로 같은 IV를 되풀이하지 않도록 요구하고, 5.2.1.1절에서 IV 길이는 96비트를 권장합니다. Java 21의 Cipher 문서는 AEAD 방식(GCM 등)에서 태그가 암호문 뒤에 붙고 복호화할 때 확인된다고 설명하고, 같은 열쇠로 암호화할 때마다 IV를 바꾸라고 안내하며, AEADBadTagException 문서는 AEAD 방식의 Cipher가 태그를 확인하지 못할 때 던져진다고 설명합니다. 이 실습은 보내는 쪽과 받는 쪽이 같은 열쇠를 쓰는 방식(대칭 키 암호화)만 다룹니다. 화면의 코드는 보내는 쪽과 받는 쪽을 한 main에 적어서 변수 key와 iv를 그대로 함께 씁니다. 실제로 iv를 암호문과 함께 보내는 방법(앞에 붙여 보내기 등), 받는 쪽이 같은 열쇠를 안전하게 갖는 방법(열쇠 전달), 열쇠를 안전하게 보관하는 방법은 다루지 않았습니다. 열쇠가 둘인 방식(공개 키)과 서명은 "세부 동작 실습: 해시·암호화·서명"에서 다룹니다.',
});
