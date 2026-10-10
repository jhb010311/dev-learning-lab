Lab.register({
  id: 'tls', nav: 'TLS 핸드셰이크', cat: '네트워크', mode: 'step',
  title: 'https의 자물쇠가 잠기기까지',
  intro: 'HTTPS는 HTTP를 TLS로 감싼 것입니다. 데이터를 보내기 전에 브라우저와 서버는 "상대가 진짜 그 서버인지" 확인하고 "둘만 아는 암호화 키"를 만듭니다. 이 과정에서 비대칭키와 대칭키가 각각 어디에 쓰이는지, 인증서에 문제가 있으면 어디서 멈추는지 보세요.',
  terms: ['HTTPS와 TLS', 'TLS 핸드셰이크와 인증서', '대칭키 암호화와 비대칭키 암호화', 'HMAC과 전자서명'], ranks: ['network', 'websec', 'http'],
  controls: [
    { id: 'cert', label: '서버 인증서의 상태', type: 'select', value: 'ok', options: [['ok', '정상'], ['expired', '유효 기간이 지남'], ['name', '다른 도메인의 인증서'], ['self', '신뢰할 수 없는 곳에서 발급 (자체 서명)']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '정상적인 TLS 1.3 핸드셰이크입니다.', v: { cert: 'ok' } },
    { t: '인증서가 만료됐다면', d: '브라우저가 경고를 띄우고 연결을 멈춥니다.', v: { cert: 'expired' } },
    { t: '도메인이 다르다면', d: '인증서는 진짜지만 이 서버의 것이 아닙니다.', v: { cert: 'name' } },
    { t: '자체 서명 인증서', d: '누구도 보증해 주지 않는 인증서입니다.', v: { cert: 'self' } },
  ],
  code: function () {
    return '# application.yml (서버 쪽 설정)\nserver:\n  port: 443\n  ssl:\n    enabled: true\n    key-store: classpath:shop.p12       # 인증서 + 개인키\n    key-store-password: ********\n    protocol: TLS\n    enabled-protocols: TLSv1.3\n\n# 실무에서는 보통 앞단의 로드밸런서나 nginx가 TLS를 처리하고\n# 애플리케이션 서버는 그 뒤에서 HTTP로 받는다';
  },
  label: function (c) { return '인증서: ' + { ok: '정상', expired: '만료', name: '도메인 불일치', self: '신뢰할 수 없는 발급자' }[c.cert]; },
  columns: ['결과', '멈춘 단계', '데이터 암호화에 쓰인 키'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], S = { key: '없음', lock: '아직 암호화되지 않음' };
    function step(dir, what, s, k) { rows.push({ cells: [dir, { v: what, cls: k === 'bad' ? 'bad' : k === 'good' ? 'good' : '' }] }); ev.push({ s: s, k: k, snap: { rows: rows.slice(), key: S.key, lock: S.lock } }); }
    step('브라우저 → 서버', 'ClientHello: 지원하는 TLS 버전과 암호 방식, 키 합의용 공개값', '브라우저가 https://shop.com 에 접속합니다. TCP 연결이 맺어진 뒤, 자신이 쓸 수 있는 암호 방식 목록과 키 합의에 쓸 공개값을 보냅니다. 이 메시지는 암호화되지 않았습니다.', '');
    step('서버 → 브라우저', 'ServerHello: 선택한 암호 방식, 서버의 키 합의용 공개값', '서버가 암호 방식을 하나 고르고 자신의 키 합의용 공개값을 보냅니다. 양쪽은 서로의 공개값과 자신의 비밀값을 조합해 같은 값을 계산해 냅니다. 중간에서 공개값만 엿본 사람은 이 값을 계산할 수 없습니다.', '');
    S.key = '양쪽이 같은 대칭키를 계산해 냄'; step('(양쪽 내부)', '키 합의 완료: 같은 대칭키를 각자 계산', '이 값에서 대칭키를 만들어 냅니다. 키 자체는 네트워크로 한 번도 전송되지 않았습니다. 이후의 핸드셰이크 메시지부터 암호화됩니다.', 'good');
    step('서버 → 브라우저', '인증서 (shop.com의 공개키 + 인증 기관의 서명)', '서버가 인증서를 보냅니다. 인증서에는 도메인 이름, 서버의 공개키, 유효 기간, 그리고 이 내용을 인증 기관(CA)이 자신의 개인키로 서명한 값이 들어 있습니다.', '');
    var fail = c.cert !== 'ok';
    if (c.cert === 'self') step('(브라우저 내부)', '검증 실패: 서명한 기관을 신뢰할 수 없음', '브라우저는 인증서의 서명을 따라 올라가며 신뢰하는 인증 기관 목록(운영체제와 브라우저에 내장)에 닿는지 확인합니다. 이 인증서는 서버가 스스로 서명한 것이라 보증해 주는 기관이 없습니다. 누구나 "나는 shop.com이다"라는 인증서를 스스로 만들 수 있으므로 믿을 수 없습니다.', 'bad');
    else if (c.cert === 'expired') step('(브라우저 내부)', '검증 실패: 유효 기간이 지남', '인증 기관의 서명은 올바르지만 인증서의 유효 기간이 지났습니다. 기간이 지난 인증서는 개인키가 유출됐을 가능성 등을 더 이상 보증받지 못하므로 거부합니다.', 'bad');
    else if (c.cert === 'name') step('(브라우저 내부)', '검증 실패: 인증서의 도메인이 shop.com이 아님', '서명도 유효 기간도 정상이지만, 인증서에 적힌 도메인이 접속하려는 shop.com과 다릅니다. 다른 사이트의 진짜 인증서를 가져다 쓴 것일 수 있습니다.', 'bad');
    else step('(브라우저 내부)', '인증서 검증 통과: 서명, 유효 기간, 도메인 일치', '브라우저가 인증서를 검증합니다. 신뢰하는 인증 기관의 서명이 맞고, 유효 기간 안이며, 도메인이 shop.com과 일치합니다. 이 공개키는 진짜 shop.com의 것이라고 믿을 수 있습니다.', 'good');
    if (fail) { S.lock = '연결 중단'; step('브라우저 → 사용자', '경고 화면: "연결이 비공개로 설정되어 있지 않습니다"', '브라우저가 핸드셰이크를 중단하고 경고 화면을 보여 줍니다. HTTP 요청은 전송되지 않았습니다.', 'bad'); sum.push('인증서 검증에서 멈췄습니다. 암호화만으로는 부족하고, 암호화된 통로의 반대편이 누구인지 확인돼야 합니다. 그렇지 않으면 중간에 끼어든 공격자와 안전하게 암호화 통신을 하는 꼴이 됩니다.'); return { events: ev, summary: sum, row: ['연결 실패', '인증서 검증', '사용 안 함'] }; }
    step('서버 → 브라우저', 'CertificateVerify: 지금까지의 대화를 서버 개인키로 서명', '서버가 지금까지 주고받은 내용을 자신의 개인키로 서명해 보냅니다. 브라우저는 인증서의 공개키로 이 서명을 확인합니다. 인증서는 누구나 복사할 수 있지만, 서명은 짝이 되는 개인키를 가진 진짜 서버만 만들 수 있습니다.', 'good');
    step('양쪽', 'Finished: 핸드셰이크 전체가 변조되지 않았음을 확인', '양쪽이 핸드셰이크 내용 전체의 확인값을 주고받아, 중간에 누가 메시지를 바꾸지 않았는지 확인합니다.', '');
    S.lock = '대칭키로 암호화 중'; step('브라우저 ↔ 서버', 'HTTP 요청과 응답 (대칭키로 암호화)', '이제 HTTP 요청과 응답이 합의한 대칭키로 암호화되어 오갑니다. 중간에서 보는 사람에게는 어느 서버와 통신하는지 정도만 보이고 내용(주소의 경로, 헤더, 쿠키, 본문)은 보이지 않습니다.', 'good');
    sum.push('핸드셰이크가 끝나고 암호화 통신이 시작됐습니다.');
    sum.push('비대칭키(공개키와 개인키)는 "상대가 진짜인지 확인"하는 서명과 "키를 안전하게 합의"하는 데만 쓰입니다. 계산이 느리기 때문입니다. 실제 데이터는 빠른 대칭키로 암호화합니다. 두 방식의 장점을 나눠 쓰는 구조입니다.');
    sum.push('TLS 1.3은 이 과정을 왕복 한 번으로 끝냅니다(이전 버전은 두 번). 그래도 연결마다 비용이 들기 때문에 한 번 맺은 연결을 재사용하는 것이 중요합니다.');
    return { events: ev, summary: sum, row: ['연결 성공', '-', '키 합의로 만든 대칭키'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], key: '없음', lock: '아직 암호화되지 않음' };
    H.counters(v, [[s.key, '암호화 키'], [s.lock, '통신 상태']]);
    if (s.rows.length) H.table(v, ['방향', '내용'], s.rows, '핸드셰이크 순서'); else H.text(v, '실행을 누르면 시작합니다.');
  },
  // 그림: 브라우저와 서버가 주고받는 핸드셰이크 메시지. 각자 안에서 하는 계산과 검증은 상자로 그린다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], key: '없음', lock: '아직 암호화되지 않음' }, ids = { '브라우저': 'b', '서버': 's' };
    var msgs = s.rows.map(function (r) { var m = P.dir(P.v(r.cells[0]), ids); m.s = P.v(r.cells[1]); m.cls = P.c(r.cells[1]); return m; });
    var end = P.seq([['b', '브라우저', 'wait'], ['s', '서버 (shop.com)', 'wait']], msgs), enc = s.lock.indexOf('암호화 중') >= 0;
    P.box('key', 16, end + 14, 318, 48, { cls: s.key === '없음' ? 'ghost' : 'good', title: '암호화 키', sub: s.key });
    P.box('lock', 346, end + 14, 318, 48, { cls: enc ? 'good' : s.lock.indexOf('아직') === 0 ? 'ghost' : 'bad', title: '통신 상태', sub: s.lock });
    P.size(680, end + 78);
    P.note('화살표는 주고받는 메시지이고, 한쪽 선 위의 상자는 그쪽 안에서 하는 일(계산, 검증)입니다. 인증서 검증에서 막히면 그 아래로 진행하지 않습니다.');
  },
  assume: 'TLS 1.3의 기본 핸드셰이크를 단순화했습니다(실제로는 서버의 응답 메시지 여러 개가 한 번에 묶여 전송됩니다). 키 합의는 양쪽이 공개값을 교환해 같은 비밀을 계산하는 방식(ECDHE)이며, 예전 방식처럼 대칭키를 서버 공개키로 암호화해 보내지 않습니다. 인증서 검증 항목은 TLS와 웹 PKI의 표준 절차를 따랐습니다. 이 PC에서 openssl로 시험용 인증 기관과 인증서 네 가지를 만들어 실제 TLS 1.3 연결을 맺어 확인했습니다. 정상 인증서는 검증을 통과했고, 나머지는 각각 certificate has expired, hostname mismatch, self-signed certificate 오류로 거부됐습니다. 핸드셰이크 메시지도 ClientHello, ServerHello, EncryptedExtensions, Certificate, CertificateVerify, Finished 순서로 오가는 것을 확인했습니다.',
});
