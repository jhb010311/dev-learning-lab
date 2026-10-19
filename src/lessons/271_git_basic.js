Lab.register({
  id: 'git_basic', nav: 'Git 커밋과 브랜치', cat: '기초개념', mode: 'step', basic: true, deep: ['git'],
  title: '커밋은 무엇이고, 브랜치는 무엇을 가리키는가',
  intro: 'Git에서 커밋은 그 시점의 파일 전체 모습을 저장한 것이고, 바로 앞 커밋을 가리킵니다. 브랜치는 커밋을 따로 복사해 둔 것이 아니라 커밋 하나를 가리키는 이름표입니다. 브랜치에서 커밋하면 그 이름표만 새 커밋으로 옮겨 가고, 다른 브랜치는 그대로입니다. git switch로 다른 브랜치로 옮기면 폴더의 파일이 그 브랜치가 가리키는 커밋의 모습으로 바뀝니다. 이 실습은 코드 칸의 명령을 실제 Git으로 새 빈 폴더에서 한 줄씩 실행한 결과를 보여 줍니다. 둘째 커밋 줄과 main으로 돌아가는 줄을 하나씩 지워 가며, 이름표가 가리키는 커밋과 폴더의 memo.txt가 어떻게 달라지는지를 봅니다. 커밋 번호는 실행할 때마다 달라지는 긴 글자라서, 만들어진 차례대로 커밋 1, 커밋 2로 적었습니다. 코드 칸의 #로 시작하는 줄은 설명이고, echo는 파일에 글을 쓰는 명령, cat은 파일 내용을 보이는 명령입니다.',
  terms: ['Git 커밋(commit)', 'Git 브랜치(branch)', 'git switch', 'HEAD(Git)'],
  controls: [
    { id: 'commit2', label: 'echo v2 > memo.txt 다음에 git commit -am "둘째 커밋" 줄을 적는다', type: 'check', value: true },
    { id: 'back', label: 'feature에서 main으로 돌아가는 줄', type: 'select', value: 'main', options: [['main', 'git switch main 줄을 적는다 (main으로 돌아간다)'], ['stay', 'git switch main 줄을 지운다 (feature에 그대로 있는다)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'feature 브랜치에서 둘째 커밋을 한 뒤 main으로 돌아오면, 커밋과 브랜치는 어떻게 되고 memo.txt에는 무엇이 보이나', d: 'feature에서 커밋하면 feature 이름표만 새 커밋으로 가고, main으로 돌아오면 폴더가 main의 커밋 모습(v1)으로 바뀝니다.', v: { commit2: true, back: 'main' } },
    { t: 'main으로 돌아가지 않으면', q: 'git switch main 줄을 지우면', d: 'feature에 그대로 있어서 폴더의 memo.txt는 둘째 커밋의 모습(v2)입니다. main은 커밋 1에 그대로 있습니다.', v: { commit2: true, back: 'stay' } },
    { t: '둘째 커밋을 하지 않고 main으로 옮기면', q: 'git commit -am "둘째 커밋" 줄을 지우면', d: '고친 memo.txt가 어느 커밋에도 들어 있지 않은 채 main으로 따라옵니다. 두 브랜치는 같은 커밋 1을 가리킵니다.', v: { commit2: false, back: 'main' } },
    { t: '둘 다 지우면', q: 'git commit -am "둘째 커밋" 줄과 git switch main 줄을 둘 다 지우면', d: '커밋은 1개뿐이고 두 브랜치는 같은 커밋 1을 가리킵니다. 고친 v2는 폴더에만 있습니다.', v: { commit2: false, back: 'stay' } },
  ],
  // 이 설정에서 실제로 실행하는 줄들(# 설명 줄은 실행하지 않는다). 상태는 Probe가 줄마다 실제 Git에서 잰 것과 대조한다.
  steps: function (c) {
    var s = [
      ['# 이 폴더를 Git 저장소로 만든다 (첫 브랜치 이름은 main)', 'git init -b main'],
      ['# memo.txt 파일을 만들고 v1이라고 쓴다', 'echo v1 > memo.txt'],
      ['# memo.txt를 다음 커밋에 넣을 것으로 올린다', 'git add memo.txt'],
      ['# 올려 둔 것을 커밋(저장)한다', 'git commit -m "첫 커밋"'],
      ['# feature 브랜치를 새로 만들고 그쪽으로 옮겨 간다', 'git switch -c feature'],
      ['# memo.txt의 내용을 v2로 바꾼다', 'echo v2 > memo.txt'],
    ];
    if (c.commit2) s.push(['# 바뀐 파일을 올리고(-a) 곧바로 커밋한다', 'git commit -am "둘째 커밋"']);
    if (c.back === 'main') s.push(['# main 브랜치로 옮겨 간다', 'git switch main']);
    s.push(['# memo.txt의 내용을 화면에 보인다', 'cat memo.txt']);
    return s;
  },
  code: function (c) {
    return this.steps(c).map(function (p) { return p[0] + '\n' + p[1]; }).join('\n');
  },
  label: function (c) { return (c.commit2 ? '둘째 커밋 있음' : '둘째 커밋 없음') + ' · ' + (c.back === 'main' ? 'main으로 돌아감' : 'feature에 그대로'); },
  columns: ['지금 있는 브랜치', 'main이 가리키는 커밋', 'feature가 가리키는 커밋', '지금 보이는 memo.txt', '커밋에 든 memo.txt (main / feature)'],
  simulate: function (c) {
    var ev = [], sum = [], st = { cur: '(없음)', main: '없음', feature: '없음', count: 0, file: '없음', status: '(깨끗함)', mainFile: '없음', featFile: '없음' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var c2 = !!c.commit2, home = c.back === 'main';
    // 1: git init
    st.cur = 'main';
    push('git init -b main: 이 폴더를 Git 저장소로 만듭니다. 폴더 안에 .git이라는 폴더가 생기고, 앞으로 커밋이 여기에 쌓입니다. -b main은 처음 쓸 브랜치의 이름을 main으로 하라는 뜻이고, 브랜치가 무엇인지는 뒤에서 봅니다. 아직 커밋이 하나도 없어서, main이라는 이름이 가리킬 커밋도 없습니다.', '');
    // 2: echo v1
    st.file = 'v1'; st.status = '?? memo.txt';
    push('echo v1 > memo.txt: 폴더에 memo.txt 파일을 만들고 안에 v1이라고 씁니다. 이 줄은 Git 명령이 아니라 폴더의 파일을 쓰는 명령입니다. Git은 이 파일을 아직 저장소에 올리지 않은 새 파일(??)로만 알려 줍니다.', '');
    // 3: git add
    st.status = 'A  memo.txt';
    push('git add memo.txt: memo.txt의 지금 모습(v1)을 다음 커밋에 넣을 것으로 올려 둡니다. 아직 커밋은 아닙니다. Git이 이 파일을 커밋에 넣을 것으로 알려 줍니다(A).', '');
    // 4: first commit
    st.count = 1; st.main = '커밋 1'; st.status = '(깨끗함)'; st.mainFile = 'v1';
    push('git commit -m "첫 커밋": 올려 둔 것을 커밋으로 저장합니다. 커밋 1이 만들어졌고, 그 안에는 이 순간의 memo.txt 모습(v1)이 들어 있습니다. 앞에 다른 커밋이 없는 맨 처음 커밋입니다. 이렇게 커밋 하나를 가리키는 이름표를 브랜치라고 하는데, main 브랜치가 커밋 1을 가리키게 되었습니다. 폴더의 파일과 커밋의 모습이 같아서, 저장하지 않은 변경은 없습니다.', 'good');
    // 5: git switch -c feature
    st.cur = 'feature'; st.feature = '커밋 1'; st.featFile = 'v1';
    push('git switch -c feature: feature라는 새 이름표를 만들어 지금 있는 커밋 1을 가리키게 하고, 지금 있는 브랜치를 feature로 옮깁니다. 브랜치를 만들었는데 커밋은 늘지 않고 1개 그대로입니다. 브랜치는 커밋을 복사해 둔 것이 아니라 커밋 하나를 가리킬 뿐이라서, main과 feature가 같은 커밋 1을 함께 가리킵니다.', 'good');
    // 6: echo v2
    st.file = 'v2'; st.status = ' M memo.txt';
    push('echo v2 > memo.txt: 폴더의 memo.txt 안을 v2로 바꿉니다. 폴더의 파일만 바뀌었고 커밋 1 안의 memo.txt는 그대로 v1입니다. Git은 고쳤지만 커밋하지 않은 변경(M)으로 알려 줍니다. 이 v2는 아직 어느 커밋에도 들어 있지 않습니다.', '');
    // 7: second commit
    if (c2) {
      st.count = 2; st.feature = '커밋 2'; st.status = '(깨끗함)'; st.featFile = 'v2';
      push('git commit -am "둘째 커밋": 바뀐 memo.txt를 올려서(-a) 커밋 2로 저장합니다. 커밋 2는 바로 앞 커밋인 커밋 1을 가리키고, 그 안에는 이 순간의 memo.txt 모습(v2)이 들어 있습니다. 지금 있는 브랜치인 feature 이름표가 커밋 2로 옮겨 갔습니다. main 이름표는 움직이지 않아서 커밋 1을 가리킨 채이고, 커밋 1 안의 memo.txt도 v1 그대로입니다.', 'good');
    }
    // 8: git switch main
    if (home) {
      st.cur = 'main';
      if (c2) {
        st.file = 'v1'; st.status = '(깨끗함)';
        push('git switch main: 지금 있는 브랜치를 main으로 옮기고, 폴더의 파일을 main이 가리키는 커밋 1의 모습으로 바꿉니다. 그래서 폴더의 memo.txt가 v1이 되었습니다. 커밋 2는 사라지지 않았고, feature 이름표가 그대로 가리키고 있습니다.', 'good');
      } else {
        push('git switch main: 지금 있는 브랜치를 main으로 옮깁니다. 둘째 커밋을 하지 않았으므로 main과 feature는 같은 커밋 1을 가리키고, 두 브랜치의 memo.txt 모습도 같습니다(v1). 파일을 바꿀 것이 없어서 Git은 옮기기를 막지 않았고, 커밋하지 않은 v2가 폴더에 그대로 따라왔습니다. Git은 M memo.txt라고 알려 줍니다.', 'bad');
      }
    }
    // 9: cat
    if (c2 && home) push('cat memo.txt: 폴더의 memo.txt를 화면에 보입니다. v1입니다. feature에서 v2로 고쳐 커밋했지만 그 모습은 커밋 2 안에 있고, 지금 폴더에는 main이 가리키는 커밋 1의 모습이 나와 있습니다.', 'good');
    else if (c2) push('cat memo.txt: 폴더의 memo.txt를 화면에 보입니다. v2입니다. main으로 돌아가지 않아서 지금도 feature에 있고, 폴더의 파일은 feature가 가리키는 커밋 2의 모습입니다. main은 커밋 1을 가리킨 채 그대로입니다.', 'good');
    else if (home) push('cat memo.txt: 폴더의 memo.txt를 화면에 보입니다. v2입니다. main에 있는데도 main이 가리키는 커밋 1 안의 memo.txt는 v1입니다. v2는 커밋하지 않은 변경이라 어느 커밋에도 들어 있지 않고 폴더에만 있습니다.', 'bad');
    else push('cat memo.txt: 폴더의 memo.txt를 화면에 보입니다. v2입니다. feature에 그대로 있고 feature가 가리키는 커밋 1 안의 memo.txt는 v1입니다. v2는 커밋하지 않은 변경이라 어느 커밋에도 들어 있지 않고 폴더에만 있습니다.', 'bad');
    // 요약
    if (c2 && home) {
      sum.push('커밋은 그 시점의 파일 전체 모습을 저장한 것이고 바로 앞 커밋을 가리킵니다. 브랜치(main, feature)는 커밋을 복사해 둔 것이 아니라 커밋 하나를 가리키는 이름표입니다. feature에서 커밋하면 feature 이름표만 커밋 2로 옮겨 가고 main은 커밋 1에 그대로 있어서, main으로 돌아오면 memo.txt는 v1입니다.');
      sum.push('git switch main은 지금 있는 브랜치(HEAD)를 main으로 옮기고 폴더의 파일을 main이 가리키는 커밋의 모습으로 바꿨을 뿐, main과 feature 이름표는 옮기지 않았습니다. 커밋 2는 지워지지 않고 feature 이름표가 가리키고 있습니다.');
    } else if (c2) {
      sum.push('main으로 돌아가는 줄이 없으면 feature에 그대로 있어서 memo.txt는 v2입니다. 폴더의 파일은 지금 있는 브랜치가 가리키는 커밋 2의 모습입니다.');
      sum.push('feature에서 커밋해도 main 이름표는 움직이지 않았습니다. 브랜치에서 커밋하면 지금 있는 브랜치의 이름표만 새 커밋으로 옮겨 갑니다.');
    } else if (home) {
      sum.push('둘째 커밋을 하지 않고 main으로 옮겨도 Git은 막지 않았고, memo.txt는 v2로 보입니다. v2는 어느 커밋에도 들어 있지 않고 폴더에만 있으며, main과 feature는 같은 커밋 1을 가리킵니다.');
      sum.push('커밋하지 않은 변경은 커밋 안에 없어서, 이 경우처럼 브랜치를 옮겨도 폴더에 그대로 따라다닙니다. 커밋해야 비로소 한 브랜치의 이름표 아래에 저장됩니다.');
    } else {
      sum.push('둘째 커밋도 main으로 돌아가는 줄도 없으면, 커밋은 1개뿐이고 main과 feature는 같은 커밋 1을 가리킵니다. 폴더의 memo.txt는 v2이지만 이것은 어느 커밋에도 들어 있지 않습니다.');
      sum.push('브랜치를 만들어도 커밋하지 않으면 이름표만 하나 더 생길 뿐 커밋은 늘지 않습니다. 파일을 고친 것만으로는 이름표가 가리키는 곳이 바뀌지 않습니다.');
    }
    return { events: ev, summary: sum, row: [st.cur, st.main, st.feature, st.file, st.mainFile + ' / ' + st.featFile] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 빈 폴더에서 명령을 한 줄씩 실행하는 것부터 시작합니다.'); return; }
    var unsaved = /^.?M/.test(s.status), stTxt = { '(깨끗함)': '없음', '?? memo.txt': 'Git이 모르는 새 파일 (??)', 'A  memo.txt': '커밋에 넣을 것으로 올려 둠 (A)', ' M memo.txt': '고쳤지만 커밋하지 않음 (M)' }[s.status] || s.status;
    H.table(v, ['항목', '값'], [
      { cls: '', cells: ['지금 있는 브랜치 (HEAD)', s.cur] },
      { cls: s.main === '없음' ? 'gone' : '', cells: ['main이 가리키는 커밋', s.main === '없음' ? '아직 없음' : s.main] },
      { cls: s.feature === '없음' ? 'gone' : '', cells: ['feature가 가리키는 커밋', s.feature === '없음' ? '아직 없음' : s.feature] },
      { cls: s.file === '없음' ? 'gone' : '', cells: ['폴더의 memo.txt', s.file === '없음' ? '아직 없음' : s.file] },
      { cls: '', cells: ['커밋에 든 memo.txt (main / feature)', s.mainFile + ' / ' + s.featFile] },
      { cls: '', cells: ['커밋하지 않은 변경 (git status)', unsaved ? { v: stTxt, cls: 'bad' } : stTxt] },
    ], '저장소의 상태');
    H.counters(v, [[s.count, '만들어진 커밋']]);
  },
  // 그림: 위에 이름표(main, feature), 가운데에 커밋 상자(커밋 2는 커밋 1을 가리킴), 아래에 폴더의 memo.txt. 이름표에서 커밋으로 가는 화살표가 브랜치의 정체이고, 지금 있는 브랜치가 가리키는 커밋에서 폴더로 가는 화살표는 폴더의 파일이 그 커밋의 모습일 때만 생긴다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    var has = function (k) { return s && s[k] !== '없음'; };
    P.size(680, 304);
    P.region('rg', 10, 14, 660, 186, 'Git 저장소 (.git)');
    var cur = s ? s.cur : '';
    P.box('tm', 100, 40, 150, 46, { cls: has('main') ? (cur === 'main' ? 'hot now' : 'wait') : 'ghost', title: 'main', sub: has('main') ? (cur === 'main' ? '지금 있는 브랜치' : ' ') : '아직 없음' });
    P.box('tf', 380, 40, 150, 46, { cls: has('feature') ? (cur === 'feature' ? 'hot now' : 'wait') : 'ghost', title: 'feature', sub: has('feature') ? (cur === 'feature' ? '지금 있는 브랜치' : ' ') : '아직 없음' });
    var n = s ? s.count : 0;
    P.box('c1', 100, 124, 150, 58, { cls: n >= 1 ? 'good' : 'ghost', title: '커밋 1', sub: n >= 1 ? 'memo.txt = v1' : '아직 없음' });
    P.box('c2', 380, 124, 150, 58, { cls: n >= 2 ? 'good' : 'ghost', title: '커밋 2', sub: n >= 2 ? 'memo.txt = v2' : '아직 없음' });
    if (n >= 2) { P.arrow('par', 'c2:l', 'c1:r', { cls: 'mut' }); P.text('part', 315, 142, '앞 커밋', { cls: 'mut', anchor: 'middle' }); }
    if (has('main')) P.arrow('am', 'tm:b', s.main === '커밋 1' ? 'c1:t:0.3' : 'c2:t:0.3', {});
    if (has('feature')) P.arrow('af', 'tf:b', s.feature === '커밋 1' ? 'c1:t:0.8' : 'c2:t:0.5', {});
    var mod = s && s.file !== '없음' && /^.?M/.test(s.status);
    var curFile = s ? (cur === 'main' ? s.mainFile : s.featFile) : '없음';
    P.box('wd', 100, 214, 430, 34, { cls: !s || s.file === '없음' ? 'ghost' : mod ? 'bad' : 'plain', title: '폴더의 memo.txt', right: !s || s.file === '없음' ? '아직 없음' : mod ? s.file + ' (커밋에 없는 변경)' : s.file });
    if (s && s.file !== '없음' && !mod && curFile !== '없음') {
      var from = cur === 'main' ? s.main : s.feature;
      P.arrow('cw', from === '커밋 1' ? 'c1:b' : 'c2:b', from === '커밋 1' ? 'wd:t:0.15' : 'wd:t:0.85', { cls: 'good' });
    }
    P.box('n1', 14, 262, 322, 36, { cls: s && s.cur !== '(없음)' ? 'wait' : 'ghost', title: '지금 있는 브랜치', right: s ? s.cur : '아직' });
    P.box('n2', 344, 262, 322, 36, { cls: n ? 'good' : 'ghost', title: '만들어진 커밋', right: n + '개' });
  },
  assume: 'git 2.55.0(Windows)로 실제 실행해 대조했습니다. 네 가지 조합을 모두, 조합마다 새 빈 폴더에서 화면의 코드(# 설명 줄은 실행하지 않음)를 한 줄씩 그대로 실행했습니다. git 명령은 git.exe에 인자 그대로 주었고(사용자 이름과 메일은 그 명령에만 -c로 주고 전역 설정은 읽지 않게 함), echo와 cat은 Git Bash가 실행했습니다. 줄마다 실행한 직후에 지금 있는 브랜치, main과 feature 브랜치가 가리키는 커밋, 만들어진 커밋 수, 폴더의 memo.txt, git status --short, 각 브랜치의 커밋 안에 든 memo.txt를 재서 화면 단계의 상태와 대조했고, 화면의 코드가 실행한 글과 같은 글인지도 조합마다 확인했습니다. 커밋 번호(해시)는 실행마다 달라지므로 만들어진 차례대로 커밋 1, 커밋 2로 적었습니다. 처음 브랜치를 main으로 하려고 git init -b main을 썼습니다. 이 실습의 둘째 커밋 줄이 없는 조합에서는 main과 feature가 같은 커밋 1을 가리켜, 커밋하지 않은 변경이 막히지 않고 main으로 따라왔습니다. 이것은 두 브랜치의 memo.txt가 같기 때문이며, 화면 조합 밖에서 따로 확인한 결과 두 브랜치의 memo.txt가 서로 다를 때(main은 v1, feature는 v2인 상태에서 main에서 memo.txt를 v3로 고치고 feature로 옮기려 할 때)는 Git이 옮기기를 막고 "Your local changes to the following files would be overwritten by checkout"이라는 오류를 냈습니다. 이 막힘은 화면 조합에 넣지 않았고, 이 Git 버전에서 본 동작입니다. 새 저장소의 .git/HEAD 파일은 지금 있는 브랜치 이름을("ref: refs/heads/main" 꼴) 적고, 브랜치 파일(.git/refs/heads/main 등)은 커밋 번호 하나만 적은 41바이트 파일임을 확인했습니다. 문서로 확인한 것은 Pro Git 2판 3.1절 Branches in a Nutshell(커밋은 스냅숏을 가리키고 부모를 가리킴, 브랜치는 커밋을 가리키는 가벼운 움직이는 포인터이자 SHA-1 40자를 담은 단순한 파일, HEAD는 지금 있는 브랜치를 가리키는 포인터, 브랜치를 바꾸면 작업 폴더의 파일이 바뀌고 깔끔하게 할 수 없으면 옮기지 못함), git-switch 문서(깨끗하지 않은 작업 폴더로도 옮길 수 있고 변경을 잃게 되면 중단함, -c는 새 브랜치를 만들고 옮김), git-commit 문서(-a는 이미 아는 파일의 변경을 자동으로 올림, -m은 메시지, 새 커밋은 HEAD의 자식이고 브랜치가 그 커밋을 가리키도록 갱신됨), git-init 문서(-b는 처음 브랜치의 이름)입니다. 커밋 하나가 "그 시점의 파일 전체 모습"이라는 설명은 문서의 스냅숏 서술을 쉽게 푼 것으로, 커밋 1과 커밋 2의 memo.txt 내용을 git show로 직접 확인했습니다(파일이 하나뿐인 저장소라서 전체 모습과 한 파일이 같습니다). 병합(merge, rebase), 원격 저장소, 충돌, 커밋 안에 파일이 어떤 형식으로 저장되는지(객체)는 다루지 않았습니다. 같은 주제의 세부 동작은 "세부 동작 실습: merge와 rebase"에서 다룹니다.',
});
