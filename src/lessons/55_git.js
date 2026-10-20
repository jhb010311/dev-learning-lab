Lab.register({
  id: 'git', nav: 'merge와 rebase', cat: 'Git', mode: 'step',
  title: '두 브랜치를 합치는 세 가지 모양',
  why: '여러 사람이 각자 작업한 변경을 파일 복사로 맞추면 누가 무엇을 바꿨는지 잃어버리고 서로의 수정을 덮어쓰게 된다. Git의 merge와 rebase는 두 갈래의 변경을 자동으로 합치고 같은 곳을 고친 부분만 사람에게 묻게 해서, 합친 결과를 커밋 이력으로 남긴다.',
  use: 'GitHub에서 Pull Request를 합칠 때 merge commit, squash, rebase 가운데 하나를 고르며, 팀마다 어느 모양으로 남길지 정해 둔다. 혼자 쓰는 작업 브랜치를 최신 main 위로 올릴 때는 rebase를, 이미 다른 사람과 공유한 브랜치를 합칠 때는 merge를 쓴다. 작업 중의 자잘한 커밋을 남기고 싶지 않으면 squash로 기능 하나를 커밋 하나로 남긴다.',
  intro: 'feature 브랜치에서 작업하는 동안 main에도 새 커밋이 생겼습니다. 이 둘을 합칠 때 merge를 쓰느냐 rebase를 쓰느냐에 따라 커밋 그래프의 모양이 달라지고, 같은 줄을 고쳤다면 충돌이 납니다.',
  terms: ['merge와 rebase', 'Git 충돌(Conflict)', 'Git의 fetch, pull, push', 'Git Flow와 GitHub Flow', '코드 리뷰와 Pull Request'], ranks: ['git'],
  controls: [
    { id: 'how', label: '합치는 방법', type: 'select', value: 'merge', options: [['merge', 'main에서 git merge feature'], ['rebase', 'feature에서 git rebase main 후 merge'], ['squash', 'git merge --squash feature']] },
    { id: 'main', label: '그 사이 main에 새 커밋이 있다', type: 'check', value: true },
    { id: 'conf', label: '두 브랜치가 같은 파일의 같은 줄을 고쳤다', type: 'check', value: false, show: function (c) { return c.main; } },
    { id: 'pushed', label: 'feature 브랜치를 이미 원격에 올렸다', type: 'check', value: false, show: function (c) { return c.how === 'rebase'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: 'main에 새 커밋이 있는 상태에서 main에서 git merge feature를 하면 그래프는 어떻게 되나', d: 'merge. 두 갈래를 잇는 병합 커밋이 생깁니다.', v: { how: 'merge', main: true, conf: false, pushed: false } },
    { t: 'rebase 후 합치기', q: '합치는 방법을 feature에서 git rebase main 후 merge로 바꾸면', d: 'feature의 커밋을 main 끝으로 옮겨 붙입니다. 한 줄로 이어집니다.', v: { how: 'rebase', main: true, conf: false, pushed: false } },
    { t: 'main에 새 커밋이 없으면', q: '그 사이 main에 새 커밋이 없으면', d: '병합 커밋 없이 main이 앞으로 이동만 합니다(fast-forward).', v: { how: 'merge', main: false, conf: false, pushed: false } },
    { t: '같은 줄을 고쳤다면', q: '두 브랜치가 같은 파일의 같은 줄을 고쳤으면', d: '충돌이 납니다. 사람이 골라 줘야 합니다.', v: { how: 'merge', main: true, conf: true, pushed: false } },
    { t: '이미 올린 브랜치를 rebase하면', q: 'feature 브랜치를 이미 원격에 올렸는데 feature에서 git rebase main 후 merge를 하면', d: '원격의 커밋과 달라져 강제로 올려야 합니다.', v: { how: 'rebase', main: true, conf: false, pushed: true } },
    { t: 'squash', q: '합치는 방법을 git merge --squash feature로 바꾸면', d: 'feature의 커밋 여러 개를 하나로 뭉쳐 main에 올립니다.', v: { how: 'squash', main: true, conf: false, pushed: false } },
  ],
  code: function (c) {
    if (c.how === 'merge') return 'git switch main\ngit merge feature' + (c.main && c.conf ? '\n# CONFLICT (content): Merge conflict in OrderService.java\n# 파일을 열어 직접 고친 뒤\ngit add OrderService.java\ngit commit' : '');
    if (c.how === 'rebase') return 'git switch feature\ngit rebase main' + (c.main && c.conf ? '\n# CONFLICT: 커밋 D를 옮기다 충돌\n# 파일을 고친 뒤\ngit add OrderService.java\ngit rebase --continue' : '') + (c.pushed && c.main ? '\ngit push --force-with-lease          # 이력이 바뀌어 일반 push는 거부됨' : '') + '\n\ngit switch main\ngit merge feature                    # fast-forward';
    return 'git switch main\ngit merge --squash feature' + (c.main && c.conf ? '\n# CONFLICT: 파일을 고친 뒤 git add' : '') + '\ngit commit -m "주문 취소 기능"';
  },
  label: function (c) { return { merge: 'merge', rebase: 'rebase 후 merge', squash: 'squash merge' }[c.how] + (c.main ? ' · main에 새 커밋' : ' · main 그대로') + (c.main && c.conf ? ' · 충돌' : '') + (c.how === 'rebase' && c.main && c.pushed ? ' · 이미 push함' : ''); },
  columns: ['그래프 모양', '새로 생긴 커밋', '충돌 해결', '주의할 점'],
  simulate: function (c) {
    var ev = [], sum = [], conf = c.main && c.conf, shape, made, fix = '없음', warn = '없음';
    function push(s, k, g) { ev.push({ s: s, k: k, snap: { g: g } }); }
    var start = c.main ? 'A───B───C            ← main\n     \\\n      D───E          ← feature' : 'A───B                ← main\n     \\\n      D───E          ← feature';
    push('시작 상태입니다. feature 브랜치는 커밋 B에서 갈라져 D, E 두 커밋을 쌓았습니다.' + (c.main ? ' 그 사이 main에는 다른 사람이 올린 커밋 C가 생겼습니다.' : ' main에는 그 뒤로 새 커밋이 없습니다.'), '', start);
    if (c.how === 'merge') {
      if (!c.main) { shape = '한 줄 (fast-forward)'; made = '없음'; push('main은 B에서 멈춰 있고 feature는 그 뒤로 이어져 있습니다. 합칠 것이 없으므로 main이 가리키는 위치만 E로 옮깁니다. 새 커밋은 생기지 않습니다(fast-forward).', 'good', 'A───B───D───E        ← main, feature'); sum.push('두 브랜치가 갈라지지 않았다면 merge는 포인터만 앞으로 옮깁니다.'); }
      else {
        if (conf) { fix = '1번 (병합할 때)'; push('C와 feature의 커밋이 OrderService.java의 같은 줄을 서로 다르게 고쳤습니다. Git은 어느 쪽이 맞는지 판단할 수 없어 병합을 멈추고, 파일 안에 양쪽 내용을 표시해 둡니다.', 'bad', start + '\n\n<<<<<<< HEAD\n    int limit = 10;        (main의 내용)\n=======\n    int limit = 20;        (feature의 내용)\n>>>>>>> feature'); push('사람이 파일을 열어 남길 내용을 정하고, 표시를 지운 뒤 add와 commit을 합니다.', '', start + '\n\n    int limit = 20;        (직접 고른 결과)'); }
        shape = '두 갈래 + 병합 커밋'; made = '병합 커밋 M';
        push('C와 E의 내용을 합친 새 커밋 M이 만들어집니다. M은 부모가 둘(C와 E)인 병합 커밋입니다. 기존 커밋 D와 E는 그대로이고, 언제 갈라져 언제 합쳐졌는지가 그래프에 남습니다.', 'good', 'A───B───C───────M    ← main\n     \\         /\n      D───────E      ← feature');
        sum.push('merge는 기존 커밋을 건드리지 않고 병합 커밋을 하나 추가합니다. 이력이 사실 그대로 남지만, 브랜치가 많으면 그래프가 복잡해집니다.');
      }
    }
    if (c.how === 'rebase') {
      if (!c.main) { shape = '한 줄'; made = '없음'; push('feature가 이미 main의 끝(B) 위에 있습니다. rebase할 것이 없습니다.', '', start); push('main에서 merge하면 fast-forward로 E까지 이동합니다.', 'good', 'A───B───D───E        ← main, feature'); sum.push('갈라지지 않은 브랜치는 rebase해도 달라지는 것이 없습니다.'); }
      else {
        push('git rebase main: feature의 커밋 D, E를 잠시 떼어 놓고, feature의 시작점을 main의 끝인 C로 옮깁니다.', '', 'A───B───C            ← main\n\n (떼어 둔 커밋: D, E)');
        if (conf) { fix = '커밋마다 (최대 2번)'; push('D를 C 위에 다시 적용하려는데 같은 줄을 고친 부분이 충돌합니다. rebase가 멈춥니다. 파일을 고치고 git rebase --continue로 이어 갑니다. 다음 커밋 E에서도 같은 곳이 걸리면 한 번 더 해결해야 합니다.', 'bad', 'A───B───C            ← main\n         \\\n          (D 적용 중 충돌)'); }
        push('D와 E의 변경 내용을 C 위에 차례로 다시 적용합니다. 내용은 같지만 부모가 달라졌으므로 완전히 새로운 커밋 D\', E\'입니다(해시가 다릅니다). 원래의 D, E는 feature가 더는 가리키지 않게 됩니다(지워지지는 않고 reflog에 남습니다).', '', 'A───B───C            ← main\n         \\\n          D\'──E\'     ← feature');
        if (c.pushed) { warn = '강제 push 필요, 같이 쓰는 사람의 이력과 어긋남'; push('feature를 이미 원격에 올렸다면, 원격에는 옛 커밋 D, E가 있고 내 것은 D\', E\'입니다. 서로 다른 이력이라 일반 push가 거부되고 강제로 덮어써야 합니다. 그 브랜치를 받아 간 동료가 있다면 그 사람의 작업과 어긋납니다.', 'bad', '원격 feature:  A───B───D───E\n내 feature:    A───B───C───D\'──E\'\n\n→ git push --force-with-lease 필요'); }
        shape = '한 줄'; made = 'D\', E\' (D, E를 대체)';
        push('main에서 merge하면 feature가 main 바로 뒤에 이어져 있으므로 fast-forward로 끝납니다. 병합 커밋 없이 이력이 한 줄이 됩니다.', 'good', 'A───B───C───D\'──E\'   ← main, feature');
        sum.push('rebase는 내 커밋을 최신 main 위에서 다시 만든 것처럼 이력을 고쳐 씁니다. 그래프가 깔끔해지는 대신 커밋이 새것으로 바뀝니다.');
        sum.push('원칙: 혼자 쓰는 브랜치는 rebase해도 되지만, 다른 사람과 공유한 브랜치의 이력은 고쳐 쓰지 않습니다.');
      }
    }
    if (c.how === 'squash') {
      if (conf) { fix = '1번'; push('feature의 변경을 main에 얹으려는데 같은 줄이 충돌합니다. 파일을 고친 뒤 진행합니다.', 'bad', start + '\n\n(충돌 해결 필요)'); }
      shape = '한 줄 (feature와 연결 없음)'; made = '뭉친 커밋 S 하나';
      push('feature의 D와 E가 만든 변경 전체를 하나로 뭉쳐 main에 새 커밋 S로 올립니다. S의 부모는 main의 끝 하나뿐이라 그래프에는 feature와의 연결선이 남지 않습니다.', 'good', (c.main ? 'A───B───C───S        ← main' : 'A───B───S            ← main') + '\n     \\\n      D───E          ← feature (합쳐진 뒤 삭제)');
      warn = 'feature의 개별 커밋 이력이 main에 남지 않음';
      sum.push('squash는 "기능 하나 = 커밋 하나"로 main을 정리합니다. 작업 중의 자잘한 커밋(오타 수정, 리뷰 반영)이 main에 남지 않습니다. 대신 세부 이력이 사라지고, Git은 feature가 합쳐졌다는 사실을 모르므로(branch -d가 거부함) 보통 브랜치를 따로 지웁니다.');
    }
    if (conf) sum.push('충돌은 Git의 오류가 아니라 "두 사람이 같은 곳을 다르게 고쳤으니 사람이 정해 달라"는 요청입니다. 브랜치를 오래 끌수록, 한 번에 많이 고칠수록 충돌이 커집니다. 자주 main을 받아 오고 작게 나눠 합치는 것이 예방책입니다.');
    return { events: ev, summary: sum, row: [shape, made, fix, warn] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1];
    H.title(v, '커밋 그래프 (왼쪽이 오래된 커밋)');
    v.appendChild(H.el('pre', 'code', last ? last.snap.g : '실행을 누르면 시작합니다.'));
  },
  // 그림: 글자로 그린 커밋 그래프를 읽어 상자와 화살표로 다시 그린다. 위 줄이 main, 아래 줄이 feature.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], g = last ? last.snap.g : '', lines = g.split('\n'), tok = function (l) { return l ? (l.split('←')[0].match(/[A-Z]'?/g) || []) : []; };
    var remote = g.indexOf('원격 feature') >= 0, mainLine = lines.filter(function (l) { return l.indexOf('← main') >= 0; })[0], featLine = lines.filter(function (l) { return l.indexOf('← feature') >= 0 && l.indexOf('← main') < 0; })[0];
    var top = remote ? ['A', 'B', 'C', "D'", "E'"] : tok(mainLine), low = remote ? ['D', 'E'] : tok(featLine), floating = g.indexOf('떼어 둔 커밋') >= 0, applying = g.indexOf('적용 중 충돌') >= 0;
    if (floating) low = ['D', 'E']; if (applying) low = ['D'];
    P.size(680, 290);
    if (!last) { P.text('hint', 340, 140, '실행을 누르면 시작합니다', { cls: 'mut', anchor: 'middle' }); return; }
    var X = {}, fresh = { M: 1, S: 1, "D'": 1, "E'": 1 }, attach = low[0] === "D'" || applying ? top[top.length - 1] : 'B';
    top.forEach(function (t, i) { X[t] = t === 'M' ? 420 : 60 + i * 90; P.box('c_' + t, X[t] - 23, 60, 46, 30, { cls: fresh[t] ? 'hot' : 'wait', sub: t, center: true }); if (i) P.arrow('e_' + top[i - 1] + t, 'c_' + top[i - 1] + ':r', 'c_' + t + ':l'); });
    low.forEach(function (t, k) {
      var x = (X[attach] || 150) + 90 * (k + 1); X[t + '_low'] = x;
      P.box('c_' + t, x - 23, 150, 46, 30, { cls: floating ? 'ghost' : applying || remote ? 'bad' : fresh[t] ? 'hot' : 'good', sub: t, center: true });
      if (k) P.arrow('e_' + low[k - 1] + t, 'c_' + low[k - 1] + ':r', 'c_' + t + ':l');
      else if (!floating) P.arrow('e_' + attach + t, 'c_' + attach + ':b', 'c_' + t + ':l', { cls: applying ? 'bad' : '' });
    });
    if (top.indexOf('M') >= 0 && low.length) P.arrow('e_merge', 'c_' + low[low.length - 1] + ':r', 'c_M:b', { cls: 'hot' });
    var both = mainLine && mainLine.indexOf('feature') >= 0, lastTop = top[top.length - 1];
    if (lastTop) P.text('lm', X[lastTop], 48, remote ? '내 feature' : both ? 'main, feature' : 'main', { anchor: 'middle', bold: true });
    if (low.length) P.text('lf', X[low[low.length - 1] + '_low'], 200, floating ? '떼어 둔 커밋' : applying ? '다시 적용하다 충돌' : remote ? '원격의 feature (옛 커밋)' : top.indexOf('S') >= 0 ? 'feature (합친 뒤 삭제)' : 'feature', { anchor: 'middle', bold: true, cls: applying || remote ? 'bad' : '' });
    if (g.indexOf('<<<<<<<') >= 0) P.box('cf', 60, 228, 560, 44, { cls: 'bad', title: '충돌: 같은 줄을 서로 다르게 고침', sub: 'main은 limit = 10, feature는 limit = 20' });
    else if (g.indexOf('직접 고른 결과') >= 0) P.box('cf', 60, 228, 560, 44, { cls: 'good', title: '사람이 직접 골라 해결', sub: 'limit = 20으로 정하고 커밋' });
    else if (g.indexOf('충돌 해결 필요') >= 0) P.box('cf', 60, 228, 560, 44, { cls: 'bad', title: '충돌: 같은 줄을 서로 다르게 고침', sub: '파일을 고친 뒤 진행' });
    else if (remote) P.box('cf', 60, 228, 560, 44, { cls: 'bad', title: '원격과 내 이력이 서로 다름', sub: '일반 push는 거부됨. 강제로 덮어써야 함' });
    P.note('상자 하나가 커밋 하나이고 왼쪽이 오래된 커밋이며, 화살표는 시간이 흐르는 방향입니다(실제 Git은 자식이 부모를 가리킴). 파랑은 main의 커밋, 초록은 feature의 커밋, 노랑은 이번에 새로 만들어진 커밋입니다. D\'처럼 작은따옴표가 붙은 것은 내용은 같지만 새로 만들어진 다른 커밋입니다.');
  },
  assume: '커밋 다섯 개짜리 작은 저장소 예시입니다. 충돌은 한 파일의 한 곳에서만 난다고 가정했습니다. 각 명령의 동작은 Git 공식 문서(git-merge, git-rebase)의 설명을 따랐습니다. 팀에 따라 병합 방식(merge commit, squash, rebase)을 정해 두고 쓰며, 어느 쪽이 옳다기보다 이력을 어떤 모양으로 남길지의 선택입니다. 검증 환경의 git 2.55로 임시 저장소를 만들어 확인했습니다. merge는 부모가 둘인 병합 커밋을 만들고 기존 커밋의 해시를 유지했으며, main에 새 커밋이 없을 때는 fast-forward였습니다. rebase 뒤에는 D와 E의 해시가 바뀌고 병합 커밋 없이 한 줄이 됐으며, 이미 올린 브랜치는 일반 push가 거부되고 강제 push가 필요했습니다. squash 커밋은 부모가 하나였고 git은 feature가 합쳐졌다고 인식하지 않았습니다. 충돌 표시도 화면의 모양 그대로였습니다.',
});
