Lab.register({
  id: 'cicd', nav: 'CI/CD 파이프라인', cat: '배포와 운영', mode: 'step',
  title: '코드를 올리면 기계가 대신 확인하고 배포한다',
  intro: '코드를 고쳐서 운영 서버에 반영하기까지는 빌드, 테스트, 포장, 배포라는 단계가 있습니다. 이 단계를 사람이 손으로 하면 빠뜨리거나 사람마다 다르게 합니다.',
  terms: ['CI/CD', '단위 테스트와 통합 테스트', '코드 리뷰와 Pull Request', '헬스 체크(Liveness, Readiness)', '롤링, 블루-그린, 카나리 배포'], ranks: ['deploy', 'test'],
  controls: [
    { id: 'pipe', label: '반영 방식', type: 'select', value: 'manual', options: [['manual', '손으로: 내 PC에서 빌드해 서버에 복사'], ['ci', 'CI: 올리면 자동으로 빌드와 테스트, 배포는 사람이'], ['cicd', 'CI/CD: 통과하면 배포까지 자동']] },
    { id: 'bug', label: '이번 변경에 든 문제', type: 'select', value: 'test', options: [['none', '문제 없음'], ['compile', '컴파일이 안 되는 코드'], ['test', '기존 기능을 망가뜨림 (테스트가 잡을 수 있음)'], ['env', '내 PC에만 있는 파일에 기대는 코드'], ['runtime', '운영 환경에서만 시작에 실패 (테스트로는 못 잡음)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '내 PC에서 빌드해 서버에 복사하는 손 배포로 기존 기능을 망가뜨리는 변경을 올리면 어떻게 되나', d: '손으로 배포. 테스트를 건너뛰어 운영에서 장애가 납니다.', v: { pipe: 'manual', bug: 'test' } },
    { t: 'CI를 두면', q: '반영 방식을 CI: 올리면 자동으로 빌드와 테스트, 배포는 사람이 쪽으로 바꾸면', d: '같은 변경이 테스트 단계에서 막힙니다.', v: { pipe: 'ci', bug: 'test' } },
    { t: '내 PC에서만 되는 코드', q: '반영 방식을 CI로 바꾸고 문제를 내 PC에만 있는 파일에 기대는 코드로 바꾸면', d: '깨끗한 환경에서 돌려야 드러납니다.', v: { pipe: 'ci', bug: 'env' } },
    { t: '테스트가 못 잡는 문제, CI만', q: '반영 방식을 CI로 바꾸고 문제를 운영 환경에서만 시작에 실패 (테스트로는 못 잡음) 쪽으로 바꾸면', d: '사람이 배포하고 사람이 되돌립니다.', v: { pipe: 'ci', bug: 'runtime' } },
    { t: '테스트가 못 잡는 문제, CI/CD', q: '반영 방식을 CI/CD로 바꾸고 문제를 운영 환경에서만 시작에 실패 (테스트로는 못 잡음) 쪽으로 바꾸면', d: '배포 뒤 헬스 체크에서 걸려 자동으로 되돌립니다.', v: { pipe: 'cicd', bug: 'runtime' } },
    { t: '문제가 없을 때', q: '반영 방식을 CI/CD로 바꾸고 이번 변경에 든 문제를 문제 없음으로 바꾸면', d: '사람이 할 일이 얼마나 남는지 비교해 보세요.', v: { pipe: 'cicd', bug: 'none' } },
  ],
  code: function (c) {
    if (c.pipe === 'manual') return '# 개발자가 자기 PC에서 직접 입력\n./gradlew build -x test      # 급해서 테스트는 건너뜀\nscp build/libs/app.jar prod-server:/app/\nssh prod-server "systemctl restart app"\n\n# 누가, 언제, 어떤 코드를 올렸는지 기록이 남지 않는다';
    return '# .github/workflows/ci.yml (GitHub Actions 예시)\non: [pull_request, push]\njobs:\n  build:\n    runs-on: ubuntu-latest             # 매번 깨끗한 환경에서 시작\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-java@v4\n        with: { distribution: temurin, java-version: 21 }\n      - run: ./gradlew build           # 컴파일 + 테스트. 실패하면 병합할 수 없다\n' + (c.pipe === 'cicd' ? '      - run: docker build -t shop/app:${{ github.sha }} .\n      - run: docker push shop/app:${{ github.sha }}\n  deploy:\n    needs: build                       # build가 성공해야 실행\n    if: github.ref == \'refs/heads/main\'\n    steps:\n      - run: kubectl set image deployment/app app=shop/app:${{ github.sha }}\n      - run: kubectl rollout status deployment/app || kubectl rollout undo deployment/app' : '\n# 배포는 통과한 결과물을 사람이 골라 수동으로 진행');
  },
  label: function (c) { return { manual: '손으로', ci: 'CI', cicd: 'CI/CD' }[c.pipe] + ' · ' + { none: '문제 없음', compile: '컴파일 오류', test: '테스트로 잡히는 버그', env: '내 PC에서만 됨', runtime: '운영에서만 실패' }[c.bug]; },
  columns: ['문제가 발견된 곳', '운영 사용자에게 영향', '사람이 한 일'],
  // 순수 계산: 어느 단계에서 멈추는가
  result: function (c) {
    var p = c.pipe, b = c.bug;
    if (b === 'none') return { stop: '', where: '없음', impact: '없음', ok: true };
    if (b === 'compile') return { stop: 'build', where: p === 'manual' ? '내 PC의 빌드' : 'CI의 빌드 단계', impact: '없음', ok: false };
    if (b === 'test') return p === 'manual' ? { stop: 'prod', where: '운영 (사용자 신고)', impact: '장애', ok: false } : { stop: 'test', where: 'CI의 테스트 단계', impact: '없음', ok: false };
    if (b === 'env') return p === 'manual' ? { stop: 'prod', where: '운영 서버에서 실행할 때', impact: '장애', ok: false } : { stop: 'test', where: 'CI의 테스트 단계', impact: '없음', ok: false };
    return p === 'cicd' ? { stop: 'health', where: '배포 직후 헬스 체크', impact: '없음 (기존 버전이 계속 응답)', ok: false } : { stop: 'prod', where: '운영 (배포 직후)', impact: '장애', ok: false };
  },
  simulate: function (c) {
    var R = this.result(c), p = c.pipe, b = c.bug, ev = [], sum = [], hands = [], S = { stages: [] };
    function push(name, st, who, s, k) { S.stages.push([name, st, who]); ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    var auto = p !== 'manual';
    if (!auto) {
      hands.push('빌드');
      if (b === 'compile') { push('빌드', '실패', '사람 (내 PC)', '개발자가 자기 PC에서 빌드합니다. 컴파일 오류로 실패합니다. 결과물(jar)이 나오지 않으므로 여기서 멈춥니다. 이 문제는 손으로 해도 걸러집니다.', 'bad'); }
      else {
        push('빌드', '성공', '사람 (내 PC)', '개발자가 자기 PC에서 빌드합니다.' + (b === 'env' ? ' 코드가 이 PC의 특정 폴더에 있는 설정 파일을 읽는데, 이 PC에는 그 파일이 있어서 문제없이 됩니다.' : ''), '');
        push('테스트', '건너뜀', '-', '급해서 테스트를 돌리지 않았습니다. 테스트를 돌릴지 말지가 사람의 기억과 성의에 달려 있습니다.', b === 'test' ? 'bad' : '');
        hands.push('서버에 복사', '재시작');
        push('배포', '완료', '사람', '빌드한 파일을 운영 서버에 복사하고 재시작합니다. 어떤 코드가 올라갔는지는 그 개발자만 압니다.', '');
        if (b === 'none') push('운영', '정상', '-', '새 버전이 정상 동작합니다. 이번에는 운이 좋았습니다.', 'good');
        else { hands.push('원인 찾기', '이전 파일을 찾아 되돌리기'); push('운영', '장애', '사용자가 발견', { test: '기존 기능이 망가진 채 운영에 올라갔습니다. 사용자 신고로 알게 됩니다.', env: '운영 서버에는 그 파일이 없습니다. 애플리케이션이 시작하다 죽습니다.', runtime: '운영 설정에서만 생기는 문제로 애플리케이션이 시작하지 못합니다.' }[b] + ' 개발자가 원인을 찾고, 이전 파일을 찾아 다시 올려야 합니다.', 'bad'); }
      }
    } else {
      hands.push('코드 올리기 (push)');
      push('코드 올리기', '완료', '사람', '개발자가 변경을 저장소에 올리고 병합 요청(Pull Request)을 엽니다. 이것이 신호가 되어 파이프라인이 자동으로 시작됩니다.', '');
      push('환경 준비', '완료', '자동', '아무것도 설치돼 있지 않은 깨끗한 환경에 코드를 내려받습니다. 개발자 PC에만 있는 파일은 여기에 없습니다.', '');
      if (R.stop === 'build') push('빌드', '실패', '자동', '컴파일 오류로 빌드가 실패합니다. 병합 요청에 실패 표시가 붙고 병합할 수 없게 됩니다.', 'bad');
      else {
        push('빌드', '성공', '자동', '컴파일에 성공합니다.', '');
        if (R.stop === 'test') push('테스트', '실패', '자동', '전체 테스트를 매번 빠짐없이 실행합니다. ' + (b === 'env' ? '테스트가 애플리케이션을 띄우다가 개발자 PC에만 있던 파일을 찾지 못해 실패합니다. "내 PC에서는 되는데"가 여기서 드러납니다.' : '망가진 기능의 테스트가 실패합니다.') + ' 병합이 막히고, 이 코드는 운영 근처에도 가지 못합니다.', 'bad');
        else {
          push('테스트', '통과', '자동', '전체 테스트가 통과합니다.' + (b === 'runtime' ? ' 이번 문제는 운영 설정에서만 드러나므로 테스트로는 잡히지 않습니다.' : ''), '');
          hands.push('코드 리뷰와 병합 승인');
          push('리뷰와 병합', '완료', '사람', '동료가 코드를 리뷰하고 병합을 승인합니다. 기계가 확인한 것(빌드, 테스트) 위에서 사람은 설계와 의도를 봅니다.', '');
          push('포장', '완료', '자동', '통과한 코드로 배포용 결과물(컨테이너 이미지)을 만들고 커밋 번호를 이름표로 붙입니다. 어떤 코드가 어떤 결과물인지 추적할 수 있습니다.', '');
          if (p === 'ci') {
            hands.push('배포 명령 실행');
            push('배포', '완료', '사람', 'CI는 여기까지입니다. 배포는 사람이 결과물을 골라 직접 명령합니다.', '');
            if (b === 'none') push('운영', '정상', '-', '새 버전이 정상 동작합니다.', 'good');
            else { hands.push('장애 확인', '이전 버전으로 되돌리기'); push('운영', '장애', '사람이 발견', '새 버전이 운영 설정에서 시작하지 못합니다. 사람이 알아채고 이전 이미지로 되돌립니다. 이전 결과물이 이름표와 함께 남아 있어 되돌리기는 쉽습니다.', 'bad'); }
          } else {
            push('배포', '진행', '자동', '병합되자 자동으로 새 버전을 서버에 올리기 시작합니다. 새 버전이 준비될 때까지 기존 버전이 계속 요청을 받습니다.', '');
            if (b === 'none') { push('헬스 체크', '통과', '자동', '새 버전이 "요청 받을 준비가 됐다"고 응답합니다. 트래픽을 새 버전으로 넘기고 기존 버전을 내립니다.', 'good'); push('운영', '정상', '-', '사람은 코드를 올리고 리뷰만 했습니다. 나머지는 매번 같은 순서로 자동 실행됐습니다.', 'good'); }
            else { push('헬스 체크', '실패', '자동', '새 버전이 시작하지 못해 헬스 체크에 응답하지 않습니다. 트래픽은 새 버전으로 넘어가지 않습니다.', 'bad'); push('되돌리기', '완료', '자동', '배포가 정해진 시간 안에 끝나지 않자 파이프라인이 이전 버전으로 되돌립니다. 사용자는 내내 기존 버전의 응답을 받았습니다. 개발자에게 실패 알림이 갑니다.', 'good'); }
          }
        }
      }
    }
    if (!auto && R.impact === '장애') sum.push('손으로 하면 확인 단계를 건너뛸 수 있고, 건너뛴 것을 아무도 모릅니다. 문제는 가장 비싼 곳인 운영에서 발견됩니다.');
    if (auto && (R.stop === 'build' || R.stop === 'test')) sum.push('CI(지속적 통합)는 코드를 올릴 때마다 깨끗한 환경에서 빌드와 테스트를 자동으로 돌려, 문제를 병합 전에 찾습니다. 문제는 일찍 찾을수록 고치는 비용이 작습니다.');
    if (p === 'ci' && b === 'runtime') sum.push('CI는 병합까지만 지킵니다. 배포와 그 뒤의 확인은 여전히 사람의 일로 남습니다.');
    if (p === 'cicd' && b === 'runtime') sum.push('CD(지속적 배포)는 배포와 확인, 되돌리기까지 같은 절차로 자동화합니다. 자동으로 되돌리려면 헬스 체크와 무중단 배포 방식이 함께 갖춰져 있어야 합니다.');
    if (b === 'none') sum.push('문제가 없을 때의 차이는 사람이 한 일의 수와 기록입니다. 자동화하면 누가 해도 같은 순서로 실행되고, 어떤 커밋이 언제 배포됐는지 남습니다.');
    sum.push('파이프라인이 걸러 주는 것은 테스트와 점검으로 확인할 수 있는 문제까지입니다. 테스트가 없는 기능의 버그는 CI가 있어도 통과합니다.');
    return { events: ev, summary: sum, row: [R.where, R.impact, hands.join(' → ')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { stages: [] };
    if (!s.stages.length) { H.text(v, '실행을 누르면 단계를 하나씩 진행합니다.'); return; }
    H.table(v, ['단계', '결과', '누가'], s.stages.map(function (r, i) { var bad = r[1] === '실패' || r[1] === '장애'; return { cells: [{ v: r[0], cls: i === s.stages.length - 1 ? 'hot' : '' }, { v: r[1], cls: bad ? 'bad' : r[1] === '건너뜀' ? '' : 'good' }, r[2]] }; }), '코드가 운영에 닿기까지');
  },
  // 그림: 코드가 운영에 닿기까지 거치는 단계를 왼쪽에서 오른쪽으로 잇는다. 어디서 멈췄는지가 보인다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], st = last ? last.snap.stages : [], n = st.length, rows = Math.max(1, Math.ceil(n / 5));
    P.size(680, 40 + rows * 100 + 16);
    P.region('pipe', 16, 16, 648, 24 + rows * 100, sim.c.pipe === 'manual' ? '사람이 손으로 하는 순서' : '파이프라인: 코드를 올리면 자동으로 시작');
    st.forEach(function (r, i) {
      var bad = r[1] === '실패' || r[1] === '장애', skip = r[1] === '건너뜀';
      P.box('sg' + i, 28 + (i % 5) * 126, 52 + Math.floor(i / 5) * 100, 116, 68, { cls: (bad ? 'bad' : skip ? 'ghost' : r[2] === '자동' ? 'good' : 'wait') + (i === n - 1 ? ' now' : ''), title: r[0], sub: [r[1], r[2]], center: true });
      if (i) P.arrow('ar' + i, 'sg' + (i - 1) + (i % 5 ? ':r' : ':b'), 'sg' + i + (i % 5 ? ':l' : ':t'), { cls: bad ? 'bad' : '' });
    });
    if (!n) P.text('hint', 340, 90, '실행을 누르면 단계를 하나씩 진행합니다', { cls: 'mut', anchor: 'middle' });
    P.note('초록은 기계가 자동으로 한 단계, 파랑은 사람이 한 단계, 빨강은 실패하거나 장애가 난 단계, 점선은 건너뛴 단계입니다. 빨간 단계가 왼쪽에 있을수록 문제를 일찍 찾은 것입니다.');
  },
  assume: '개념을 설명하기 위한 모델이며 실제 CI/CD 도구를 실행해 확인한 결과는 아닙니다. "손으로"에서 테스트를 건너뛴 것은 흔한 사고를 가정한 것이고, 손으로 해도 테스트를 돌리면 같은 문제를 잡을 수 있습니다. 헬스 체크 실패 시의 자동 되돌리기는 파이프라인과 배포 도구에 그렇게 구성했을 때의 동작입니다. 코드의 워크플로는 구조를 보여 주기 위한 예시로, 인증과 캐시 같은 실제에 필요한 단계는 뺐습니다.',
});
