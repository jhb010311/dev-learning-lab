Lab.register({
  id: 'crypto', nav: '해시·암호화·서명', cat: '인증', mode: 'step',
  title: '숨기는 것, 확인하는 것, 되돌릴 수 없는 것',
  intro: '보안 이야기에 늘 나오는 해시, 대칭키 암호화, 비대칭키 암호화, 서명은 서로 다른 일을 합니다. "주문 100원"이라는 메시지에 다섯 가지 도구를 각각 써 보고, 내용을 바꾸거나 다른 키를 썼을 때 무슨 일이 생기는지 확인하세요. 화면의 값은 모두 실제로 계산한 값입니다.',
  terms: ['해시 함수와 솔트', '대칭키 암호화와 비대칭키 암호화', 'HMAC과 전자서명', 'JWT(JSON Web Token)'], ranks: ['websec', 'auth', 'network'],
  controls: [
    { id: 'tool', label: '도구', type: 'select', value: 'hash', options: [['hash', '해시 (SHA-256)'], ['sym', '대칭키 암호화 (AES)'], ['asym', '비대칭키 암호화 (RSA)'], ['hmac', '키가 있는 해시로 서명 (HMAC)'], ['sign', '전자서명 (개인키로 서명, 공개키로 검증)']] },
    { id: 'act', label: '해 보는 일', type: 'select', value: 'ok', options: [['ok', '정상적으로 사용'], ['tamper', '중간에 내용을 "주문 900원"으로 바꿈'], ['wrong', '다른 키(또는 키 없이)로 시도']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '해시. 같은 입력은 항상 같은 값이 되고, 되돌릴 수 없습니다.', v: { tool: 'hash', act: 'ok' } },
    { t: '해시: 한 글자만 바꾸면', d: '결과가 전혀 다른 값이 됩니다.', v: { tool: 'hash', act: 'tamper' } },
    { t: '대칭키: 다른 키로 풀기', d: '같은 키가 없으면 풀 수 없습니다.', v: { tool: 'sym', act: 'wrong' } },
    { t: '비대칭키: 공개키로 풀기', d: '잠근 열쇠로는 열 수 없습니다. 짝이 되는 개인키만 엽니다.', v: { tool: 'asym', act: 'wrong' } },
    { t: 'HMAC: 내용을 바꾸면', d: '서명이 맞지 않아 변조가 드러납니다. JWT가 이 방식입니다.', v: { tool: 'hmac', act: 'tamper' } },
    { t: '전자서명: 다른 사람의 키로 서명', d: '공개키로 검증하면 가짜임이 드러납니다.', v: { tool: 'sign', act: 'wrong' } },
  ],
  code: function (c) {
    return {
      hash: 'MessageDigest md = MessageDigest.getInstance("SHA-256");\nbyte[] digest = md.digest(message.getBytes(UTF_8));\n// 키가 없다. 누구나 같은 입력으로 같은 값을 얻는다.',
      sym: 'Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");\ncipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(128, iv));\nbyte[] encrypted = cipher.doFinal(message.getBytes(UTF_8));\n\n// 풀 때도 같은 secretKey\ncipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(128, iv));',
      asym: 'Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");\ncipher.init(Cipher.ENCRYPT_MODE, publicKey);      // 공개키로 잠그고\nbyte[] encrypted = cipher.doFinal(message.getBytes(UTF_8));\n\ncipher.init(Cipher.DECRYPT_MODE, privateKey);     // 개인키로만 연다',
      hmac: 'Mac mac = Mac.getInstance("HmacSHA256");\nmac.init(new SecretKeySpec(serverKey, "HmacSHA256"));\nbyte[] signature = mac.doFinal(message.getBytes(UTF_8));\n\n// 받은 쪽도 같은 키로 다시 계산해 비교한다 (JWT의 HS256)',
      sign: 'Signature s = Signature.getInstance("SHA256withRSA");\ns.initSign(privateKey);                            // 개인키로 서명\ns.update(message.getBytes(UTF_8));\nbyte[] signature = s.sign();\n\ns.initVerify(publicKey);                           // 공개키로 검증\ns.update(message.getBytes(UTF_8));\nboolean ok = s.verify(signature);',
    }[c.tool];
  },
  label: function (c) { return { hash: '해시', sym: '대칭키 암호화', asym: '비대칭키 암호화', hmac: 'HMAC 서명', sign: '전자서명' }[c.tool] + ' · ' + { ok: '정상 사용', tamper: '내용 변조', wrong: '다른 키' }[c.act]; },
  columns: ['결과', '원래 내용으로 되돌릴 수 있나', '쓰는 키', '대표적인 쓰임'],
  simulate: function (c) {
    var T = c.tool, A = c.act, ev = [], rows = [], sum = [], res;
    var SHA1 = 'd262c5de4c7e878debde9ca793209ecf6ed055bede1b021f298f05dee15d9071', SHA2 = '183b226fc6f1393a5716b07ae1f7aa52d1527f69c83a5b9898de63ae8d362396', AES = '376ab1de11a014258a13186347', RSA = '863cd521da711cdb8380126b48e49dd3… (256바이트)', HM = 'b5efce470986677f38c0dfabf8b0a3b662000538d1335eca9146c3ddb736029d', SIG = 'a8f856a3dba36a039c50d4dc0cdada50… (256바이트)';
    function row(a, b, cls) { rows.push({ cells: [a, { v: b, cls: cls || '' }] }); }
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice() } }); }
    row('원래 메시지', '주문 100원'); push('보내려는 메시지는 "주문 100원"입니다.', '');
    if (T === 'hash') {
      row('SHA-256 해시', SHA1); push('해시 함수에 넣으면 길이가 일정한 값이 나옵니다. 키는 쓰지 않습니다. 같은 메시지를 다시 넣으면 언제 누가 해도 똑같은 값이 나옵니다.', '');
      if (A === 'ok') { row('해시에서 원래 메시지 구하기', '불가능 (되돌리는 계산이 없음)', 'hot'); res = '같은 입력 → 같은 해시'; push('이 값에서 "주문 100원"을 거꾸로 계산해 낼 방법은 없습니다. 해시는 한 방향으로만 갑니다. 그래서 비밀번호처럼 원래 값을 몰라도 되는 것을 저장할 때 씁니다.', 'good'); }
      if (A === 'tamper') { row('"주문 900원"의 해시', SHA2, 'bad'); res = '해시가 완전히 달라짐'; push('메시지의 글자 하나(1 → 9)만 바꿔도 해시는 전혀 다른 값이 됩니다. 원본의 해시를 알고 있으면 내용이 바뀌었는지 바로 알 수 있습니다. 다만 해시만으로는 "누가" 바꿨는지 막을 수 없습니다. 공격자도 바꾼 내용의 해시를 새로 계산할 수 있기 때문입니다.', 'bad'); }
      if (A === 'wrong') { row('키', '없음', 'hot'); res = '키가 없으므로 누구나 계산 가능'; push('해시에는 키가 없습니다. 누구나 같은 입력으로 같은 값을 계산할 수 있습니다. 그래서 흔한 비밀번호의 해시는 미리 계산한 표로 찾아낼 수 있고, 내용의 진위를 보증하지도 못합니다. 키를 섞으면 HMAC이 됩니다.', ''); }
      sum.push('해시: 되돌릴 수 없고, 키가 없고, 같은 입력은 항상 같은 값입니다. 내용이 같은지 비교하거나 원래 값을 숨긴 채 저장하는 데 씁니다.');
    }
    if (T === 'sym') {
      row('키', '보내는 쪽과 받는 쪽이 같은 키 하나를 가짐'); row('암호화한 값 (AES)', AES); push('같은 키 하나로 잠급니다. 암호화한 값만 봐서는 내용을 알 수 없습니다.', '');
      if (A === 'ok') { row('같은 키로 복호화', '주문 100원', 'good'); res = '복호화 성공'; push('받는 쪽이 같은 키로 풀면 원래 메시지가 나옵니다. 해시와 달리 되돌릴 수 있습니다.', 'good'); }
      if (A === 'wrong') { row('다른 키로 복호화', '실패 (인증 오류)', 'bad'); res = '복호화 실패'; push('다른 키로는 풀리지 않습니다. 문제는 이 "같은 키"를 처음에 상대에게 어떻게 안전하게 전달하느냐입니다. 키를 그냥 보내면 중간에서 엿본 사람도 풀 수 있습니다.', 'bad'); }
      if (A === 'tamper') { row('전송 중 암호문이 바뀜', '복호화 실패 (변조 감지)', 'bad'); res = '변조 감지'; push('여기서 쓴 방식(AES-GCM)은 암호문이 조금이라도 바뀌면 복호화 단계에서 알아챕니다. 키를 모르는 사람은 내용을 원하는 값으로 바꿔치기할 수 없습니다.', 'bad'); }
      sum.push('대칭키 암호화: 키 하나로 잠그고 같은 키로 엽니다. 빠르기 때문에 실제 데이터 암호화(HTTPS의 본문, DB 암호화)에 씁니다. 약점은 키를 어떻게 나눠 갖느냐입니다.');
    }
    if (T === 'asym') {
      row('키', '공개키(누구에게나 공개) + 개인키(주인만 보관) 한 쌍'); row('공개키로 암호화한 값 (RSA)', RSA); push('받는 사람의 공개키로 잠급니다. 공개키는 누구나 가져다 쓸 수 있습니다.', '');
      if (A === 'ok') { row('짝이 되는 개인키로 복호화', '주문 100원', 'good'); res = '복호화 성공'; push('짝이 되는 개인키를 가진 사람만 풀 수 있습니다. 키를 미리 몰래 나눠 가질 필요가 없다는 것이 대칭키와의 차이입니다.', 'good'); }
      if (A === 'wrong') { row('공개키로 다시 풀기', '실패', 'bad'); row('다른 사람의 개인키로 풀기', '실패', 'bad'); res = '복호화 실패'; push('잠글 때 쓴 공개키로는 풀 수 없고, 다른 사람의 개인키로도 풀 수 없습니다. 공개키가 알려져도 안전한 이유입니다.', 'bad'); }
      if (A === 'tamper') { row('전송 중 암호문이 바뀜', '복호화 실패', 'bad'); res = '복호화 실패'; push('암호문이 바뀌면 개인키로도 올바르게 풀리지 않습니다. 다만 비대칭키 암호화만으로는 "누가 보냈는지"는 알 수 없습니다. 공개키는 누구나 쓸 수 있기 때문입니다. 보낸 사람을 확인하려면 서명이 필요합니다.', 'bad'); }
      sum.push('비대칭키 암호화: 공개키로 잠그고 개인키로 엽니다. 키를 미리 공유하지 않아도 되지만 계산이 느려서, 큰 데이터가 아니라 "대칭키를 안전하게 정하는 일"과 서명에 주로 씁니다. HTTPS가 이렇게 둘을 섞어 씁니다.');
    }
    if (T === 'hmac') {
      row('키', '서버만 아는 키 하나'); row('메시지에 붙인 서명 (HMAC-SHA256)', HM); push('메시지와 서버의 키를 함께 해시해서 서명을 만듭니다. 메시지 내용 자체는 숨기지 않습니다. "주문 100원"과 서명을 함께 내보냅니다.', '');
      if (A === 'ok') { row('서버가 같은 키로 다시 계산해 비교', '일치 → 내가 발급한 그대로', 'good'); res = '검증 성공'; push('나중에 이 메시지가 돌아오면 서버는 같은 키로 서명을 다시 계산합니다. 붙어 온 서명과 같으면 내용이 바뀌지 않았다고 믿습니다. JWT(HS256)의 서명 부분이 정확히 이것입니다.', 'good'); }
      if (A === 'tamper') { row('내용을 "주문 900원"으로 바꾸고 서명은 그대로', '불일치 → 변조됨', 'bad'); res = '검증 실패 (변조 감지)'; push('누군가 내용을 "주문 900원"으로 바꿨습니다. 서버가 다시 계산한 서명과 붙어 온 서명이 다릅니다. 변조가 드러납니다. JWT의 내용을 누구나 읽을 수는 있어도 고칠 수는 없는 이유입니다.', 'bad'); }
      if (A === 'wrong') { row('공격자가 추측한 키로 새 서명을 만듦', '불일치 → 위조 실패', 'bad'); res = '검증 실패 (위조 불가)'; push('공격자가 내용을 바꾸고 자기가 아는 키로 서명을 새로 만들어 붙였습니다. 서버의 키로 계산한 값과 다르므로 통과하지 못합니다. 서버의 키가 유출되지 않는 한 위조할 수 없습니다.', 'bad'); }
      sum.push('HMAC: 키를 섞은 해시로 "내가 만든 것이 맞고 바뀌지 않았다"를 확인합니다. 내용을 숨기지는 않습니다. 만드는 쪽과 확인하는 쪽이 같은 키를 가져야 하므로, 한 서버가 발급하고 그 서버가 다시 확인하는 경우에 맞습니다.');
    }
    if (T === 'sign') {
      row('키', '서명하는 쪽의 개인키 + 누구나 가진 공개키'); row('개인키로 만든 서명 (RSA-SHA256)', SIG); push('메시지의 해시를 개인키로 서명합니다. 메시지와 서명을 함께 보냅니다. 내용은 숨기지 않습니다.', '');
      if (A === 'ok') { row('공개키로 검증', '통과 → 개인키 주인이 서명한 것', 'good'); res = '검증 성공'; push('받은 쪽은 공개키로 서명을 검증합니다. 통과하면 "개인키를 가진 바로 그 주인이 서명했고 내용이 바뀌지 않았다"는 뜻입니다. 검증하는 쪽은 비밀을 하나도 몰라도 됩니다.', 'good'); }
      if (A === 'tamper') { row('내용을 "주문 900원"으로 바꿈', '검증 실패', 'bad'); res = '검증 실패 (변조 감지)'; push('내용이 바뀌면 같은 서명으로는 검증을 통과하지 못합니다.', 'bad'); }
      if (A === 'wrong') { row('다른 사람의 개인키로 서명', '검증 실패', 'bad'); res = '검증 실패 (위조 불가)'; push('공격자가 자기 개인키로 서명해 보냈습니다. 진짜 주인의 공개키로 검증하면 실패합니다. 공개키가 온 세상에 알려져 있어도 서명을 흉내 낼 수 없습니다.', 'bad'); }
      sum.push('전자서명: 개인키로 서명하고 공개키로 검증합니다. HMAC과 달리 검증하는 쪽이 비밀 키를 가질 필요가 없어서, 발급하는 곳과 확인하는 곳이 다를 때 씁니다(인증서, 여러 서비스가 검증하는 JWT의 RS256).');
    }
    var back = { hash: '불가능', sym: '같은 키로 가능', asym: '개인키로 가능', hmac: '해당 없음 (내용을 숨기지 않음)', sign: '해당 없음 (내용을 숨기지 않음)' }[T], key = { hash: '없음', sym: '같은 키 하나', asym: '공개키로 잠그고 개인키로 엶', hmac: '같은 키 하나', sign: '개인키로 서명, 공개키로 검증' }[T], use = { hash: '비밀번호 저장, 내용 비교', sym: 'HTTPS 본문, 데이터 암호화', asym: '키를 안전하게 정하기', hmac: 'JWT(HS256), API 요청 서명', sign: '인증서, JWT(RS256)' }[T];
    sum.unshift('결과: ' + res + '.');
    return { events: ev, summary: sum, row: [res, back, key, use] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [];
    if (rows.length) H.table(v, ['무엇', '값'], rows, '실제로 계산한 값'); else H.text(v, '실행을 누르면 시작합니다.');
    H.table(v, ['도구', '내용을 숨기나', '되돌릴 수 있나', '키'], [['해시', '숨김', '불가능', '없음'], ['대칭키 암호화', '숨김', '가능', '같은 키 하나'], ['비대칭키 암호화', '숨김', '가능', '공개키 / 개인키'], ['HMAC', '안 숨김', '-', '같은 키 하나'], ['전자서명', '안 숨김', '-', '개인키 / 공개키']].map(function (r, i) { var on = ['hash', 'sym', 'asym', 'hmac', 'sign'][i] === sim.c.tool; return { cells: [{ v: r[0], cls: on ? 'hot' : '' }, r[1], r[2], r[3]] }; }), '다섯 가지 도구 비교');
  },
  // 그림: 원문이 도구와 키를 거쳐 무엇이 되는지를 위에서 아래로 잇는다.
  draw: function (P, sim, shown) {
    var tool = sim.c.tool, last = shown[shown.length - 1], rows = last ? last.snap.rows : [], n = rows.length;
    var key = { hash: '키 없음: 누구나 같은 계산을 할 수 있음', sym: '같은 키 하나로 잠그고 푼다', asym: '공개키로 잠그고, 짝이 되는 개인키로만 푼다', hmac: '같은 키 하나: 키를 아는 쪽만 서명을 만들고 확인한다', sign: '개인키로 서명하고, 공개키로 누구나 검증한다' }[tool];
    P.size(680, 76 + Math.max(1, n) * 56 + 16);
    P.box('key', 16, 16, 648, 40, { cls: tool === 'hash' ? 'ghost' : 'hot', title: '쓰는 키', right: key });
    rows.forEach(function (r, i) { var c = P.c(r.cells[1]); P.box('row' + i, 16, 72 + i * 56, 648, 46, { cls: (c || 'plain') + (i === n - 1 ? ' now' : ''), title: P.v(r.cells[0]), sub: P.v(r.cells[1]), mono: true }); if (i) P.arrow('ar' + i, 'row' + (i - 1) + ':b:0.1', 'row' + i + ':t:0.1'); });
    if (!n) P.text('hint', 340, 100, '실행을 누르면 시작합니다', { cls: 'mut', anchor: 'middle' });
    P.note('위에서 아래로 진행합니다. 초록은 뜻대로 된 것, 빨강은 실패했거나 달라진 것입니다. 해시와 서명은 내용을 숨기지 않고, 암호화는 내용을 숨깁니다.');
  },
  assume: '화면의 해시, 암호문, 서명 값과 성공·실패 결과는 모두 Node.js의 암호 라이브러리로 실제 계산하고 검증한 것입니다(SHA-256, AES-256-GCM, RSA 2048비트, HMAC-SHA256). RSA 값은 길어서 앞부분만 보였고, 키를 새로 만들 때마다 값이 달라집니다. 실제 서비스에서는 직접 구현하지 않고 검증된 라이브러리와 프로토콜(TLS, JWT 라이브러리)을 씁니다.',
});
