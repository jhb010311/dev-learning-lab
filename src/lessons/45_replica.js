Lab.register({
  id: 'replica', nav: '복제 지연과 CAP', cat: '데이터베이스', mode: 'step',
  title: '방금 저장했는데 조회하니 옛날 값이 나온다',
  intro: '쓰기는 원본(프라이머리) DB에, 읽기는 복제본(레플리카)에 나눠 보내면 읽기 부하를 분산할 수 있습니다. 하지만 원본의 변경이 복제본에 도착하기까지 시간이 걸립니다.',
  terms: ['레플리케이션(복제)', '최종 일관성(Eventual Consistency)', 'CAP 정리', 'readOnly 트랜잭션'], ranks: ['dbengine', 'nosql', 'traffic'],
  controls: [
    { id: 'part', label: '볼 내용', type: 'select', value: 'lag', options: [['lag', '복제 지연'], ['cut', '원본과 복제본 사이의 네트워크 단절']] },
    { id: 'lag', label: '복제에 걸리는 시간', type: 'select', value: '1', options: [['0.1', '0.1초'], ['1', '1초'], ['5', '5초']], show: function (c) { return c.part === 'lag'; } },
    { id: 'when', label: '저장한 뒤 조회하기까지', type: 'select', value: '0.3', options: [['0.3', '0.3초 뒤 (저장 직후 화면 이동)'], ['2', '2초 뒤'], ['10', '10초 뒤']], show: function (c) { return c.part === 'lag'; } },
    { id: 'from', label: '조회를 보내는 곳', type: 'select', value: 'replica', options: [['replica', '복제본'], ['primary', '원본']], show: function (c) { return c.part === 'lag'; } },
    { id: 'choice', label: '단절됐을 때 복제본의 동작', type: 'select', value: 'ap', options: [['ap', '가진 데이터로 계속 응답한다 (가용성 선택)'], ['cp', '최신인지 확인할 수 없으므로 응답을 거부한다 (일관성 선택)']], show: function (c) { return c.part === 'cut'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '복제 1초, 저장 0.3초 뒤 복제본 조회. 옛 값이 나옵니다.', v: { part: 'lag', lag: '1', when: '0.3', from: 'replica', choice: 'ap' } },
    { t: '저장 직후 조회만 원본으로', d: '방금 쓴 사용자는 원본에서 읽게 합니다.', v: { part: 'lag', lag: '1', when: '0.3', from: 'primary', choice: 'ap' } },
    { t: '시간이 지난 뒤 조회', d: '복제가 끝난 뒤에는 복제본도 새 값을 줍니다.', v: { part: 'lag', lag: '1', when: '2', from: 'replica', choice: 'ap' } },
    { t: '복제가 5초씩 밀릴 때', d: '2초 뒤에 읽어도 옛 값입니다.', v: { part: 'lag', lag: '5', when: '2', from: 'replica', choice: 'ap' } },
    { t: '네트워크 단절: 계속 응답', d: '서비스는 되지만 옛 값을 돌려줍니다.', v: { part: 'cut', lag: '1', when: '0.3', from: 'replica', choice: 'ap' } },
    { t: '네트워크 단절: 응답 거부', d: '틀린 값은 주지 않지만 조회가 실패합니다.', v: { part: 'cut', lag: '1', when: '0.3', from: 'replica', choice: 'cp' } },
  ],
  code: function (c) {
    if (c.part === 'cut') return '// 원본과 복제본이 서로 통신하지 못하는 상황\n// 복제본이 고를 수 있는 것은 둘 중 하나\n//\n// 1) 가진 값으로 응답한다  -> 응답은 하지만 최신이 아닐 수 있다 (AP)\n// 2) 응답을 거부한다       -> 틀린 값은 주지 않지만 서비스가 안 된다 (CP)';
    return '// readOnly 트랜잭션은 복제본으로, 그 외는 원본으로 보내는 설정\n@Transactional\npublic void changeNickname(long id, String name) {     // -> 원본\n    memberRepository.findById(id).orElseThrow().setNickname(name);\n}\n\n@Transactional(readOnly = true)\npublic Member getMember(long id) {                      // -> ' + (c.from === 'replica' ? '복제본' : '원본 (직후 조회는 원본으로 보냄)') + '\n    return memberRepository.findById(id).orElseThrow();\n}';
  },
  label: function (c) { return c.part === 'lag' ? '복제 ' + c.lag + '초 · ' + c.when + '초 뒤 ' + (c.from === 'replica' ? '복제본' : '원본') + ' 조회' : '단절 · ' + (c.choice === 'ap' ? '계속 응답' : '응답 거부'); },
  columns: ['조회 결과', '최신 값인가', '응답했나'],
  simulate: function (c) {
    var ev = [], sum = [], S = { p: '닉네임 = 철수', r: '닉네임 = 철수', link: '연결됨', read: '-' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    push('회원의 닉네임은 "철수"이고, 원본과 복제본이 같은 값을 가지고 있습니다.', '');
    var got, fresh, answered = true;
    if (c.part === 'lag') {
      var lag = +c.lag, when = +c.when;
      S.p = '닉네임 = 민수'; push('0초: 사용자가 닉네임을 "민수"로 바꿉니다. 원본 DB에 저장되고 커밋됩니다. 사용자에게는 "저장 완료"가 응답됩니다. 복제본에는 아직 전달되지 않았습니다.', '');
      var first = when < lag;
      if (!first) { S.r = '닉네임 = 민수'; push(lag + '초: 원본의 변경 기록이 복제본에 도착해 반영됐습니다.', 'good'); }
      if (c.from === 'primary') { got = '민수'; S.read = '원본에서 "민수"'; push(when + '초: 조회를 원본으로 보냅니다. 원본은 항상 최신 값을 가지고 있으므로 "민수"가 나옵니다.', 'good'); }
      else if (first) { got = '철수'; S.read = '복제본에서 "철수"'; push(when + '초: 조회를 복제본으로 보냅니다. 복제가 아직 도착하지 않아 복제본에는 옛 값 "철수"가 있습니다. 사용자는 방금 바꾼 닉네임이 그대로인 화면을 봅니다.', 'bad'); }
      else { got = '민수'; S.read = '복제본에서 "민수"'; push(when + '초: 조회를 복제본으로 보냅니다. 복제가 끝난 뒤라 "민수"가 나옵니다.', 'good'); }
      if (first) { S.r = '닉네임 = 민수'; push(lag + '초: 뒤늦게 복제가 도착해 복제본도 "민수"가 됩니다. 이후의 조회는 새 값을 봅니다.', ''); }
      fresh = got === '민수';
      sum.push('복제는 보통 비동기라서 원본과 복제본 사이에 시차가 있습니다. 시간이 지나면 같아지지만 그 전에는 다를 수 있습니다(최종 일관성). 대응 방법은 자기가 방금 쓴 데이터는 원본에서 읽게 하거나, 쓰기 직후의 화면은 응답으로 받은 값을 그대로 쓰는 것입니다.');
      if (c.from === 'primary') sum.push('모든 조회를 원본으로 보내면 문제는 없지만 읽기 분산의 이점이 사라집니다. 꼭 최신이어야 하는 조회만 원본으로 보냅니다.');
    } else {
      S.link = '끊김'; push('원본과 복제본 사이의 네트워크가 끊겼습니다. 두 DB는 각각 살아 있지만 서로의 상태를 알 수 없습니다.', 'bad');
      S.p = '닉네임 = 민수'; push('사용자가 닉네임을 "민수"로 바꿉니다. 원본에는 저장되지만 복제본에 전달할 길이 없습니다.', '');
      if (c.choice === 'ap') { got = '철수'; fresh = false; S.read = '복제본에서 "철수" (옛 값)'; push('다른 사용자의 조회가 복제본으로 옵니다. 복제본은 자신이 가진 값 "철수"로 응답합니다. 서비스는 계속되지만 최신이 아닌 값이 나갔습니다.', 'bad'); }
      else { got = '오류'; fresh = true; answered = false; S.read = '복제본이 응답 거부'; push('다른 사용자의 조회가 복제본으로 옵니다. 복제본은 자기 데이터가 최신인지 보장할 수 없으므로 오류를 돌려줍니다. 틀린 값은 나가지 않았지만 조회가 실패했습니다.', 'bad'); }
      S.link = '복구됨'; S.r = '닉네임 = 민수'; push('네트워크가 복구됐습니다. 밀려 있던 변경이 복제본에 전달되어 두 DB가 다시 같아집니다.', 'good');
      sum.push('여러 대로 나뉜 시스템에서 네트워크 단절은 언젠가 반드시 일어납니다. 그때 "모든 요청에 응답한다(가용성)"와 "어디서 읽어도 같은 최신 값을 준다(일관성)"를 둘 다 지킬 수는 없고 하나를 골라야 합니다. 이것이 CAP 정리가 말하는 바입니다. 단절이 없는 평상시에는 둘 다 지킬 수 있습니다.');
      sum.push(c.choice === 'ap' ? '상품 목록이나 좋아요 수처럼 잠깐 옛 값이어도 되는 데이터는 가용성을 고릅니다.' : '계좌 잔액이나 재고처럼 틀린 값이 나가면 안 되는 데이터는 일관성을 고르고 오류를 감수합니다.');
    }
    return { events: ev, summary: sum, row: [answered ? '"' + got + '"' : '오류', c.part === 'cut' && !answered ? '(응답 없음)' : fresh ? '예' : '아니오', answered ? '예' : '아니오'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { p: '닉네임 = 철수', r: '닉네임 = 철수', link: '연결됨', read: '-' };
    var ln = H.lanes(v);
    H.lane(ln, '원본', s.p + '  (쓰기를 받는 곳)', s.p.indexOf('민수') >= 0 ? 'good' : '');
    H.lane(ln, '복제 연결', s.link, s.link === '끊김' ? 'bad' : 'none');
    H.lane(ln, '복제본', s.r + '  (읽기를 받는 곳)', s.r === s.p ? (s.r.indexOf('민수') >= 0 ? 'good' : '') : 'bad');
  },
  // 그림: 원본과 복제본, 그 사이의 복제 화살표. 쓰기는 원본으로, 조회는 설정한 쪽으로 간다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { p: '닉네임 = 철수', r: '닉네임 = 철수', link: '연결됨', read: '-' }, diff = s.r !== s.p, cut = s.link === '끊김', newP = s.p.indexOf('민수') >= 0;
    P.size(680, 290);
    P.box('app', 240, 16, 200, 40, { cls: 'plain', title: '애플리케이션', center: true });
    P.box('pri', 40, 124, 240, 60, { cls: newP ? 'good' : 'plain', title: '원본 DB (쓰기를 받는 곳)', sub: s.p });
    P.box('rep', 400, 124, 240, 60, { cls: diff ? 'bad' : newP ? 'good' : 'plain', title: '복제본 DB (읽기를 받는 곳)', sub: s.r });
    P.arrow('repl', 'pri:r', 'rep:l', { cls: cut ? 'bad dash' : diff ? 'dash' : 'good', label: cut ? '끊김' : diff ? '아직 전달 안 됨' : '복제' });
    if (newP) P.arrow('wr', 'app:b:0.25', 'pri:t', { label: '쓰기' });
    if (s.read !== '-') P.arrow('rd', 'app:b:0.75', (s.read.indexOf('원본') === 0 ? 'pri' : 'rep') + ':t', { cls: s.read.indexOf('민수') >= 0 ? 'good' : 'bad', label: '조회' });
    if (diff) P.text('df', 340, 212, '지금 원본과 복제본의 값이 다릅니다', { cls: 'bad', anchor: 'middle' });
    P.box('res', 40, 230, 600, 40, { cls: s.read === '-' ? 'ghost' : s.read.indexOf('민수') >= 0 ? 'good' : 'bad', title: '조회한 쪽이 받은 것', right: s.read === '-' ? '아직 조회 전' : s.read });
    P.note('가운데 화살표가 복제입니다. 점선이면 원본의 변경이 아직 복제본에 도착하지 않은 것이고, 그 사이에 복제본에서 읽으면 옛 값이 나옵니다.');
  },
  assume: '원본 1대와 복제본 1대, 비동기 복제를 가정했습니다. 복제 시간은 설정한 값으로 일정하다고 보았지만 실제로는 부하에 따라 출렁이고, 평소 0.1초 미만이다가 순간적으로 수 초 이상 벌어지기도 합니다. CAP 정리는 네트워크 단절 상황에서의 선택에 관한 것이며, 실제 시스템은 데이터 종류마다 다른 선택을 섞어 씁니다.',
});
