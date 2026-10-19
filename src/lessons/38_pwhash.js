Lab.register({
  id: 'pwhash', nav: '비밀번호 해시', cat: '인증', mode: 'step',
  title: 'DB가 털렸을 때 비밀번호는 얼마나 버티나',
  intro: '회원 두 명이 우연히 같은 비밀번호(password123)를 씁니다. 비밀번호를 DB에 저장하는 방식에 따라, DB가 유출됐을 때 공격자가 원래 비밀번호를 알아내는 데 걸리는 시간이 크게 달라집니다. 해시는 원래 값으로 되돌릴 수 없게 계산해 낸 값입니다. 평문, 해시, 솔트를 넣은 해시, 일부러 느리게 만든 해시(bcrypt)를 비교합니다.',
  terms: ['해시 함수와 솔트', 'bcrypt', '대칭키 암호화와 비대칭키 암호화'], ranks: ['websec', 'auth'],
  controls: [
    { id: 'how', label: '저장 방식', type: 'select', value: 'sha', options: [['plain', '평문 그대로'], ['sha', 'SHA-256 해시'], ['salt', 'SHA-256 + 회원별 솔트'], ['bcrypt', 'bcrypt (솔트 포함, 느린 해시)']] },
    { id: 'cost', label: 'bcrypt 연산 비용 (cost)', type: 'select', value: '10', options: [['10', '10 (스프링 시큐리티 기본값)'], ['12', '12'], ['14', '14']], show: function (c) { return c.how === 'bcrypt'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '비밀번호를 SHA-256 해시로 저장한 DB가 털리면 얼마나 버티나', d: 'SHA-256. 같은 비밀번호는 같은 해시가 됩니다.', v: { how: 'sha', cost: '10' } },
    { t: '평문 저장', q: '비밀번호를 해시 없이 평문 그대로 저장하면', d: '유출 즉시 전부 노출됩니다.', v: { how: 'plain', cost: '10' } },
    { t: '솔트를 추가하면', q: 'SHA-256 해시에 회원별 솔트를 붙여 저장하면', d: '같은 비밀번호도 해시가 달라집니다. 하지만 해시 자체가 빠릅니다.', v: { how: 'salt', cost: '10' } },
    { t: 'bcrypt', q: 'bcrypt로 저장하고 cost는 기본값 10 그대로 두면', d: '일부러 느리게 만든 해시입니다. 대입에 걸리는 시간이 달라집니다.', v: { how: 'bcrypt', cost: '10' } },
    { t: 'bcrypt cost 14', q: 'bcrypt로 저장하고 cost를 14로 바꾸면', d: '공격은 더 느려지지만 로그인 검증도 느려집니다.', v: { how: 'bcrypt', cost: '14' } },
  ],
  code: function (c) {
    return '// 메서드 안의 줄만 보임 (선언과 import는 생략. member·rawPassword는 예시로 만든 변수)\n' + this.codeBody(c);
  },
  codeBody: function (c) {
    if (c.how === 'plain') return '// 입력을 그대로 저장\nmember.setPassword(rawPassword);';
    if (c.how === 'sha') return 'MessageDigest md = MessageDigest.getInstance("SHA-256");\nbyte[] hash = md.digest(rawPassword.getBytes(UTF_8));\nmember.setPassword(HexFormat.of().formatHex(hash));';
    if (c.how === 'salt') return 'MessageDigest md = MessageDigest.getInstance("SHA-256");\nString salt = randomString(6);                  // 회원마다 다른 임의의 값 (randomString은 예시로 만든 메서드)\nbyte[] hash = md.digest((salt + rawPassword).getBytes(UTF_8));\nmember.setSalt(salt);                            // 솔트는 숨기지 않고 함께 저장\nmember.setPassword(HexFormat.of().formatHex(hash));';
    return 'PasswordEncoder encoder = new BCryptPasswordEncoder(' + c.cost + ');\n\n// 가입: 솔트 생성과 해시를 한 번에\nmember.setPassword(encoder.encode(rawPassword));\n\n// 로그인: 저장된 값에서 솔트와 cost를 꺼내 같은 방식으로 계산해 비교\nboolean ok = encoder.matches(rawPassword, member.getPassword());';
  },
  label: function (c) { return { plain: '평문', sha: 'SHA-256', salt: 'SHA-256 + 솔트', bcrypt: 'bcrypt cost ' + c.cost }[c.how]; },
  columns: ['두 회원의 저장값', '미리 계산한 표로 역추적', '사전 1억 개 대입 (회원 1명)', '로그인 1회 검증 시간'],
  simulate: function (c) {
    var ev = [], sum = [], rows = [], H = c.how;
    var SHA = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', S1 = '34ec6e5610ddbdd724d48b5b999df8a383d09d06a6035f836ef949881287ac53', S2 = '3f4ac84a9098fe3e661ef85f5f0543d060ae2b4a038b17f99d750dfda5df99ec';
    var stored = { plain: [['-', 'password123'], ['-', 'password123']], sha: [['-', SHA], ['-', SHA]], salt: [['x7Kp2q', S1], ['M4nT9z', S2]], bcrypt: [['(값 안에 포함)', '$2a$' + c.cost + '$N9qo8uLOickgx2ZMRZoMye…'], ['(값 안에 포함)', '$2a$' + c.cost + '$Xk3pQ7vRt1WzbY0aHdLu4.…']] }[H];
    var speed = { plain: 0, sha: 2e10, salt: 2e10, bcrypt: +c.cost === 10 ? 6000 : +c.cost === 12 ? 1500 : 375 }[H], verify = { plain: '거의 0', sha: '거의 0', salt: '거의 0', bcrypt: +c.cost === 10 ? '약 0.06초' : +c.cost === 12 ? '약 0.23초' : '약 0.95초' }[H];
    function dur(sec) { return sec < 1 ? '1초 미만' : sec < 3600 ? '약 ' + Math.round(sec / 60) + '분' : sec < 86400 * 2 ? '약 ' + Math.round(sec / 3600) + '시간' : '약 ' + Math.round(sec / 86400) + '일'; }
    var crack = H === 'plain' ? '필요 없음 (그대로 보임)' : dur(1e8 / speed), same = stored[0][1] === stored[1][1], table = H === 'plain' ? '필요 없음' : H === 'sha' ? '가능' : '불가능';
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('회원 김철수와 이영희가 가입하면서 둘 다 비밀번호를 password123으로 정했습니다. 서버가 ' + this.label(c) + ' 방식으로 DB에 저장합니다.' + (H === 'bcrypt' ? ' bcrypt는 솔트를 스스로 만들어 결과 문자열 안에 함께 넣습니다.' : ''), '', 1);
    push(same ? '두 회원의 저장값이 완전히 같습니다. DB를 본 사람은 두 사람의 비밀번호가 같다는 것을 바로 알 수 있고, 하나를 알아내면 같은 값을 가진 모든 회원의 비밀번호를 알게 됩니다.' : '같은 비밀번호인데 저장값이 서로 다릅니다. 회원마다 다른 솔트를 섞어 해시했기 때문입니다. 저장값만 봐서는 두 사람의 비밀번호가 같은지 알 수 없습니다.', same ? 'bad' : 'good', 2);
    push('사고: 공격자가 DB의 회원 테이블을 통째로 빼냈습니다.', 'bad', 3);
    if (H === 'plain') push('비밀번호가 그대로 적혀 있습니다. 공격자는 아무 작업 없이 모든 회원의 비밀번호를 얻습니다. 사용자들이 다른 사이트에서도 같은 비밀번호를 쓰고 있다면 그곳까지 뚫립니다.', 'bad', 4);
    if (H === 'sha') push('해시는 거꾸로 계산할 수 없지만, 흔한 비밀번호의 해시를 미리 계산해 둔 표가 이미 존재합니다. 공격자는 저장값을 표에서 찾기만 하면 됩니다. password123의 SHA-256은 누구에게나 같은 값이기 때문입니다.', 'bad', 4);
    if (H === 'salt') push('솔트가 섞여 있어서 미리 계산해 둔 표는 쓸모가 없습니다. 공격자는 회원마다 그 회원의 솔트를 붙여 가며 후보 비밀번호를 하나씩 해시해 봐야 합니다. 그런데 SHA-256은 빠르게 계산되도록 만들어진 함수라서, 그래픽 카드 한 장으로 초당 수백억 번을 시도할 수 있습니다.', 'bad', 4);
    if (H === 'bcrypt') push('bcrypt도 솔트가 있어 미리 계산한 표를 쓸 수 없고, 회원마다 따로 대입해야 합니다. 차이는 속도입니다. bcrypt는 한 번 계산하는 데 일부러 시간이 걸리도록 설계돼 있어서, 같은 장비로도 초당 수백 번에서 수천 번 정도밖에 시도하지 못합니다.', 'good', 4);
    push(H === 'plain' ? '결과: 유출과 동시에 전부 노출.' : '흔한 비밀번호 1억 개를 회원 한 명에게 모두 대입해 보는 데 걸리는 시간: ' + crack + '.' + (H === 'bcrypt' ? ' 회원이 100만 명이면 이 시간이 회원 수만큼 곱해집니다.' : ' password123처럼 흔한 비밀번호는 사실상 즉시 찾아냅니다.'), H === 'bcrypt' ? 'good' : 'bad', 5);
    if (H === 'plain') sum.push('평문 저장은 어떤 경우에도 해서는 안 됩니다. 운영자나 DB에 접근할 수 있는 누구든 비밀번호를 볼 수 있다는 뜻이기도 합니다.');
    if (H === 'sha') sum.push('SHA-256 같은 일반 해시 함수는 파일 검증처럼 빨라야 하는 용도로 만들어졌습니다. 비밀번호 저장에는 "빠르다"는 것이 약점입니다.');
    if (H === 'salt') sum.push('솔트는 같은 비밀번호가 같은 해시가 되는 것과 미리 계산한 표를 막아 줍니다. 그러나 대입 공격의 속도 자체는 줄이지 못합니다.');
    if (H === 'bcrypt') sum.push('비밀번호에는 bcrypt, scrypt, Argon2처럼 일부러 느리게 만든 전용 해시를 씁니다. cost를 1 올리면 계산 시간이 두 배가 됩니다. 공격자도 느려지지만 로그인 검증도 그만큼 느려지고 서버 CPU를 더 쓰므로, 로그인 한 번에 감당할 수 있는 시간 안에서 가장 높은 값을 고릅니다.');
    sum.push('비밀번호는 암호화가 아니라 해시로 저장합니다. 암호화는 열쇠가 있으면 원래 값으로 되돌릴 수 있지만, 해시는 되돌릴 방법이 없고 서버도 원래 비밀번호를 알 필요가 없습니다.');
    return { events: ev, summary: sum, stored: stored, same: same, k: { crack: crack, table: table, verify: verify }, row: [same ? '같음' : '다름', table, crack, verify] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], st = last ? last.snap.stage : 0;
    if (st >= 1) H.table(v, ['회원', '가입 때 입력한 값 (테이블의 열이 아님)', '솔트 (저장됨)', 'DB에 저장된 값'], [['김철수', sim.stored[0]], ['이영희', sim.stored[1]]].map(function (r) { return { cells: [r[0], 'password123', r[1][0], { v: r[1][1], cls: st >= 2 ? (sim.same ? 'bad' : 'good') : '' }] }; }), '입력한 비밀번호와 member 테이블에 저장된 값');
    if (st >= 4) H.counters(v, [[sim.k.table, '미리 계산한 표로 역추적'], [st >= 5 ? sim.k.crack : '?', '사전 1억 개 대입에 걸리는 시간'], [sim.k.verify, '정상 로그인 1회 검증 시간']]);
    if (sim.c.how === 'bcrypt' && st >= 1) H.text(v, 'bcrypt 저장값의 구조: $2a$ (알고리즘) + ' + sim.c.cost + '$ (cost) + 솔트 22자 + 해시 31자. 표의 값은 구조를 보이기 위한 예시이며 뒷부분은 줄였습니다.');
  },
  assume: 'SHA-256 값은 실제로 계산한 값입니다. bcrypt 저장값은 형식을 보이기 위한 예시 문자열입니다. 대입 속도는 대략적인 크기를 나타냅니다. 고성능 그래픽 카드 한 장 기준으로 SHA-256은 초당 수백억 번, bcrypt cost 10은 초당 수천 번 수준이라고 보았고, 공개된 벤치마크의 자릿수에 맞춘 값입니다. 로그인 검증 시간은 검증 실행에서 스프링 시큐리티 7.1.1의 BCryptPasswordEncoder로 matches 한 번에 걸린 시간을 잰 값(cost 10은 약 58ms, 12는 약 232ms, 14는 약 952ms)이며, cost가 2 오를 때 약 4배가 되어 cost를 1 올리면 두 배가 된다는 설명과 맞았습니다. 이 시간은 서버 CPU에 따라 달라집니다. 스프링 시큐리티의 BCryptPasswordEncoder 기본 cost는 10입니다. 검증 실행에서 openssl로 잰 SHA-256 속도는 CPU 코어 하나로 초당 약 3,200만 번이었습니다(화면의 초당 수백억 번은 그래픽 카드 기준의 공개 수치입니다). bcrypt를 공격하는 쪽의 속도(그래픽 카드 기준)는 직접 재지 않았습니다.',
});
