Lab.register({
  id: 'loops', nav: '조건문과 반복문', cat: '자바 언어', mode: 'step',
  title: '반복문은 몇 번 돌고, 어디에서 멈추나',
  intro: '반복문은 "조건 검사 → 본문 → 값 바꾸기"를 조건이 false가 될 때까지 되풀이합니다. 조건에 <를 쓰느냐 <=를 쓰느냐에 따라 도는 횟수가 한 번 달라지고, break와 continue는 그 흐름을 중간에 끊거나 건너뜁니다. switch는 if처럼 값에 따라 실행할 곳을 고르는 조건문입니다. 값이 일치하는 case로 건너뛰는데, break가 없으면 아래 case까지 이어서 실행됩니다.',
  terms: ['for문과 while문', 'break와 continue', 'switch문과 fall-through'],
  controls: [
    { id: 'stmt', label: '문장', type: 'select', value: 'for', options: [['for', 'for 반복문'], ['while', 'while 반복문'], ['swc', 'switch (case마다 break 있음)'], ['swf', 'switch (break 없음)'], ['swa', 'switch (화살표 ->)']] },
    { id: 'cmp', label: '반복 조건', type: 'select', value: 'le', options: [['lt', 'i < 3'], ['le', 'i <= 3']], show: function (c) { return c.stmt === 'for' || c.stmt === 'while'; }, hint: 'i는 0에서 시작해 한 번 돌 때마다 1씩 커집니다.' },
    { id: 'jump', label: 'i가 1일 때 본문에서 하는 일', type: 'select', value: 'none', options: [['none', '특별한 일 없음'], ['break', 'break'], ['cont', 'continue']], show: function (c) { return c.stmt === 'for' || c.stmt === 'while'; } },
    { id: 'val', label: 'switch에 넣는 값 n', type: 'select', value: '2', options: [['1', '1'], ['2', '2'], ['3', '3'], ['9', '9 (일치하는 case 없음)']], show: function (c) { return c.stmt.indexOf('sw') === 0; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '반복 조건이 i <= 3인 for 반복문은 몇 번 돌고 어디에서 멈추나', d: 'i <= 3으로 쓴 for문. 세 번이 아니라 네 번 돕니다.', v: { stmt: 'for', cmp: 'le', jump: 'none', val: '2' } },
    { t: '<로 바꾸면', q: '반복 조건을 i < 3으로 바꾸면', d: 'i < 3은 0, 1, 2에서 세 번 돕니다.', v: { stmt: 'for', cmp: 'lt', jump: 'none', val: '2' } },
    { t: 'break를 만나면', q: '반복 조건을 i < 3으로 바꾸고 i가 1일 때 break를 만나면', d: 'i가 1일 때 반복문 전체가 끝납니다.', v: { stmt: 'for', cmp: 'lt', jump: 'break', val: '2' } },
    { t: 'continue를 만나면', q: '반복 조건을 i < 3으로 바꾸고 i가 1일 때 continue를 만나면', d: 'i가 1인 회차만 건너뛰고 계속 돕니다.', v: { stmt: 'for', cmp: 'lt', jump: 'cont', val: '2' } },
    { t: 'while문에서 continue', q: '문장을 while 반복문으로 바꾸고 i < 3에서 i가 1일 때 continue를 만나면', d: '같은 코드인데 끝나지 않습니다.', v: { stmt: 'while', cmp: 'lt', jump: 'cont', val: '2' } },
    { t: 'switch에서 break를 빼면', q: '문장을 switch (break 없음) 쪽으로 바꾸면', d: 'case 2에서 시작해 아래 case까지 모두 실행됩니다.', v: { stmt: 'swf', cmp: 'le', jump: 'none', val: '2' } },
    { t: '화살표 switch', q: '문장을 switch (화살표 ->) 쪽으로 바꾸면', d: 'break를 적지 않아도 일치한 case만 실행됩니다.', v: { stmt: 'swa', cmp: 'le', jump: 'none', val: '2' } },
  ],
  words: ['하나', '둘', '셋', '그 외'],
  code: function (c) {
    if (c.stmt === 'for' || c.stmt === 'while') {
      var pad = function (x) { return x + new Array(Math.max(2, 36 - x.length)).join(' ') + '// '; };
      var cond = 'i ' + (c.cmp === 'le' ? '<=' : '<') + ' 3', j = c.jump === 'break' ? pad('    if (i == 1) break;') + '반복문을 끝낸다\n' : c.jump === 'cont' ? pad('    if (i == 1) continue;') + '이번 회차의 남은 줄을 건너뛴다\n' : '';
      if (c.stmt === 'for') return pad('for (int i = 0; ' + cond + '; i++) {') + '초기화; 조건; 증감\n' + j + '    System.out.println(i);\n}\nSystem.out.println("끝");';
      return 'int i = 0;\n' + pad('while (' + cond + ') {') + '조건이 true인 동안 되풀이\n' + j + '    System.out.println(i);\n    i++;\n}\nSystem.out.println("끝");';
    }
    var w = this.words, head = 'int n = ' + c.val + ';\nswitch (n) {\n', tail = '}\nSystem.out.println("끝");';
    if (c.stmt === 'swa') return head + '    case 1 -> System.out.println("' + w[0] + '");\n    case 2 -> System.out.println("' + w[1] + '");\n    case 3 -> System.out.println("' + w[2] + '");\n    default -> System.out.println("' + w[3] + '");\n' + tail;
    var br = c.stmt === 'swc' ? '        break;\n' : '';
    return head + '    case 1:\n        System.out.println("' + w[0] + '");\n' + br + '    case 2:\n        System.out.println("' + w[1] + '");\n' + br + '    case 3:\n        System.out.println("' + w[2] + '");\n' + br + '    default:\n        System.out.println("' + w[3] + '");\n' + tail;
  },
  label: function (c) {
    if (c.stmt === 'for' || c.stmt === 'while') return c.stmt + ' · i ' + (c.cmp === 'le' ? '<=' : '<') + ' 3' + (c.jump === 'break' ? ' · i가 1일 때 break' : c.jump === 'cont' ? ' · i가 1일 때 continue' : '');
    return { swc: 'switch (break 있음)', swf: 'switch (break 없음)', swa: 'switch (화살표)' }[c.stmt] + ' · n = ' + c.val;
  },
  columns: ['출력', '실행된 횟수'],
  simulate: function (c) {
    var ev = [], sum = [], st;
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    if (c.stmt === 'for' || c.stmt === 'while') {
      var isFor = c.stmt === 'for', le = c.cmp === 'le', op = le ? '<=' : '<', jump = c.jump, seen = {}, spin = false, broke = false, skipped = false;
      st = { kind: 'loop', i: null, at: '', cond: null, out: [], body: 0, checks: 0, rounds: [], jumped: '', spin: false, done: false };
      st.i = 0; st.at = 'init';
      push(isFor ? 'int i = 0: for문 괄호 안의 첫 부분(초기화)입니다. 맨 처음에 한 번만 실행되고, i는 0이 됩니다.' : 'int i = 0: 반복문에 들어가기 전에 변수 i를 만들고 0을 넣어 둡니다.');
      for (;;) {
        var ok = le ? st.i <= 3 : st.i < 3, again = seen[st.i];
        seen[st.i] = true; st.checks++; st.at = 'cond'; st.cond = ok; st.jumped = '';
        push('i ' + op + ' 3 검사: i는 ' + st.i + '이고, ' + st.i + ' ' + op + ' 3은 ' + ok + '입니다. ' + (ok ? (le && st.i === 3 ? '<=는 같을 때도 true이므로 한 번 더 본문으로 들어갑니다.' : '본문으로 들어갑니다.') : '본문에 들어가지 않고 반복문을 끝냅니다.'), ok ? '' : 'good');
        if (!ok) break;
        if (again) { spin = true; st.spin = true; st.at = 'spin'; push('i는 여전히 1입니다. 조금 전과 완전히 같은 상태로 조건 검사에 돌아왔으므로, 같은 일이 끝없이 되풀이됩니다(무한 반복). 프로그램은 끝나지 않고 "끝"은 출력되지 않습니다.', 'bad'); break; }
        st.body++; st.cond = null; st.rounds.push({ i: st.i, did: '' });
        var rd = st.rounds[st.rounds.length - 1];
        if (jump !== 'none') {
          st.at = 'if';
          if (st.i === 1 && jump === 'break') { rd.did = 'break로 반복문을 끝냄'; st.jumped = 'break'; broke = true; push('if (i == 1) 검사: i가 1이므로 true입니다. break가 실행되어 반복문 전체를 그 자리에서 빠져나갑니다. 아래의 println도, 다음 조건 검사도 하지 않습니다.', 'bad'); break; }
          if (st.i === 1) {
            rd.did = 'continue로 남은 줄을 건너뜀'; st.jumped = 'cont'; skipped = true;
            if (isFor) { push('if (i == 1) 검사: i가 1이므로 true입니다. continue가 실행되어 이번 회차의 남은 줄(println)을 건너뜁니다. 반복문이 끝나는 것은 아닙니다. for문에서는 건너뛴 다음에 증감(i++)으로 갑니다.', ''); st.at = 'inc'; st.i++; push('i++: continue로 건너뛰어 왔지만 for문의 증감은 실행됩니다. i의 값은 이제 ' + st.i + '입니다. 다시 조건 검사로 돌아갑니다.'); }
            else push('if (i == 1) 검사: i가 1이므로 true입니다. continue가 실행되어 본문의 남은 줄을 모두 건너뛰고 바로 조건 검사로 돌아갑니다. 건너뛴 줄에는 println뿐 아니라 i++도 들어 있습니다. i는 1 그대로입니다.', 'bad');
            continue;
          }
          push('if (i == 1) 검사: i는 ' + st.i + '이므로 false입니다. ' + (jump === 'break' ? 'break' : 'continue') + '를 실행하지 않고 다음 줄로 갑니다.');
        }
        st.at = 'print'; st.out.push(String(st.i)); rd.did = '출력';
        push('System.out.println(i): i의 값을 출력합니다. 출력은 ' + st.i + '입니다.');
        st.at = 'inc'; st.i++; st.jumped = '';
        push(isFor ? 'i++: 본문이 끝나면 for문 괄호 안의 셋째 부분(증감)이 실행됩니다. i의 값은 이제 ' + st.i + '입니다. 다시 조건 검사로 돌아갑니다.' : 'i++: 본문의 마지막 줄입니다. i의 값은 이제 ' + st.i + '입니다. 본문이 끝났으므로 다시 조건 검사로 돌아갑니다.');
      }
      if (!spin) { st.at = 'after'; st.cond = null; st.out.push('끝'); st.done = true; push('System.out.println("끝"): 반복문 다음 줄이 실행됩니다. 본문에는 모두 ' + st.body + '번 들어갔습니다.', 'good'); }
      var outText = st.out.join(', ') + (spin ? ' (끝나지 않음)' : '');
      if (spin) sum.push('while문에서 continue는 곧바로 조건 검사로 돌아갑니다. i++가 continue보다 아래에 있으면 함께 건너뛰어져서 i가 영영 바뀌지 않습니다. 같은 코드를 for문으로 쓰면 증감이 본문 밖에 있어서 정상적으로 끝납니다. while문에서 continue를 쓸 때는 그 전에 값을 바꿔 둡니다.');
      else {
        if (!broke) sum.push(le ? 'i <= 3은 i가 3일 때도 true라서 i < 3보다 한 번 더 돕니다. 0부터 시작할 때 i < n은 n번, i <= n은 n + 1번입니다. 한 번 차이로 생기는 이런 실수는 아주 흔합니다. 원소가 n개인 배열을 돌 때는 i < n을 씁니다.' : 'i < 3은 i가 0, 1, 2일 때 true입니다. 0부터 시작해 i < n으로 쓰면 n번 돕니다.' + (skipped ? ' 그 가운데 한 번은 continue로 출력을 건너뛰었습니다.' : ''));
        if (broke) sum.push('break는 자기를 감싼 가장 가까운 반복문 하나를 즉시 끝냅니다. 조건이 아직 true여도 더 돌지 않습니다. 찾던 것을 찾아서 더 볼 필요가 없을 때 씁니다.');
        if (skipped) sum.push('continue는 반복문을 끝내지 않고 이번 회차의 남은 줄만 건너뜁니다. for문에서는 건너뛴 뒤에 증감(i++)이 실행되어 다음 회차로 넘어갑니다. 문장을 while로 바꾸면 결과가 달라집니다.');
        if (jump === 'none') sum.push(isFor ? 'for문은 초기화, 조건, 증감을 한 줄에 모아 적는 반복문입니다. 실행 순서는 초기화(한 번) → 조건 → 본문 → 증감 → 조건 → ... 입니다.' : 'while문은 조건이 true인 동안 본문을 되풀이합니다. 같은 일을 하는 for문과 실행 순서가 같고, 변수를 만드는 줄과 값을 바꾸는 줄을 직접 적는다는 점만 다릅니다.');
      }
      return { events: ev, summary: sum, row: [outText, spin ? '끝없이 반복' : '본문 ' + st.body + '번'] };
    }
    // switch
    var n = +c.val, w = this.words, arrow = c.stmt === 'swa', hasBreak = c.stmt === 'swc', names = ['case 1', 'case 2', 'case 3', 'default'];
    st = { kind: 'sw', n: null, match: null, cur: null, ran: [], fell: [], exit: null, out: [], done: false };
    st.n = n; push('int n = ' + n + ': 변수 n을 만듭니다. n의 값은 ' + n + '입니다.');
    var m = n >= 1 && n <= 3 ? n - 1 : 3;
    st.match = m; st.cur = m;
    push('switch (n): n과 값이 같은 case를 찾습니다. ' + (m < 3 ? '일치하는 것은 case ' + n + '입니다. 그 자리로 바로 건너뜁니다.' + (m > 0 ? ' 그 위에 있는 case의 코드는 실행하지 않습니다.' : '') : 'case 1, case 2, case 3 가운데 일치하는 것이 없으므로 default로 갑니다.'));
    for (var k = m; k < 4; k++) {
      st.cur = k; st.ran.push(k); st.out.push(w[k]);
      push('System.out.println("' + w[k] + '"): ' + names[k] + '의 코드가 실행됩니다. 출력은 ' + w[k] + '입니다.' + (k > m ? ' n은 ' + n + '인데도 실행됐습니다.' : ''), k > m ? 'bad' : '');
      if (arrow) { st.exit = k; push(names[k] + ' -> 오른쪽의 코드가 끝났습니다. 화살표 switch는 일치한 case의 코드만 실행하고 switch를 빠져나갑니다. break를 적지 않아도 아래로 흘러내리지 않습니다.', 'good'); break; }
      if (k === 3) { st.exit = k; push('switch의 닫는 중괄호에 닿았습니다. switch를 빠져나갑니다.'); break; }
      if (hasBreak) { st.exit = k; push('break: switch를 빠져나갑니다. 아래에 있는 case의 코드는 실행하지 않습니다.', 'good'); break; }
      st.fell.push(k);
      push(names[k] + '의 코드 끝에 break가 없습니다. switch는 여기서 멈추지 않고 바로 아래 ' + names[k + 1] + '의 코드로 흘러내립니다. n이 그 case와 같은지는 다시 검사하지 않습니다.', 'bad');
    }
    st.cur = null; st.out.push('끝'); st.done = true;
    push('System.out.println("끝"): switch 다음 줄이 실행됩니다. 실행된 case는 ' + st.ran.length + '개입니다.', st.ran.length > 1 ? 'bad' : 'good');
    if (c.stmt === 'swf') {
      if (st.ran.length > 1) { sum.push('case는 "여기서부터 실행하라"는 시작 표시일 뿐, 다음 case 앞에서 멈추게 해 주는 칸막이가 아닙니다. break가 없으면 일치한 case부터 switch의 끝까지 차례로 모두 실행됩니다. 이것을 fall-through(흘러내림)라고 합니다.'); sum.push('break를 빠뜨리는 것은 흔한 실수이고 컴파일 오류도 나지 않습니다. 일부러 흘러내리게 하는 경우가 아니면 case마다 break를 적거나 화살표 switch를 씁니다.'); }
      else sum.push('일치하는 case가 없어 default부터 시작했습니다. default가 맨 아래에 있어서 흘러내릴 곳이 없으므로 break가 없어도 결과가 같습니다.');
    }
    if (c.stmt === 'swc') sum.push('case마다 break가 있으면 일치한 case 하나의 코드만 실행됩니다.');
    if (arrow) sum.push('화살표(->) switch는 일치한 case의 오른쪽 코드만 실행합니다. break가 필요 없어서 빠뜨리는 실수가 생기지 않습니다. Java 14부터 쓸 수 있습니다.');
    if (m === 3 && c.stmt !== 'swf') sum.push('어느 case와도 일치하지 않으면 default가 실행됩니다. default가 없는 switch라면 아무것도 실행하지 않고 지나갑니다.');
    return { events: ev, summary: sum, row: [st.out.join(', '), 'case ' + st.ran.length + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, w = this.words;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    if (s.kind === 'loop') {
      H.counters(v, [[s.checks, '조건을 검사한 횟수']]);
      H.table(v, ['회차', '들어올 때의 i', '한 일'], s.rounds.map(function (r, i) { return { cells: [(i + 1) + '번째', String(r.i), { v: r.did || '진행 중', cls: r.did === '출력' ? '' : r.did ? 'hot' : '' }] }; }), '본문에 들어간 기록');
    } else {
      H.table(v, ['case', '코드', '실행됐나'], ['case 1', 'case 2', 'case 3', 'default'].map(function (nm, i) { var ran = s.ran.indexOf(i) >= 0; return { cls: ran || s.match === null ? '' : 'gone', cells: [nm + (s.match === i ? ' (일치)' : ''), 'println("' + w[i] + '")', { v: ran ? (i === s.match ? '실행' : '흘러내려 실행') : s.done || s.exit !== null || (s.match !== null && i < s.match) ? '실행 안 됨' : '', cls: ran ? (i === s.match ? 'good' : 'bad') : '' }] }; }), 'n = ' + s.n);
    }
  },
  // 그림: 반복문은 위에서 아래로 놓인 흐름도(조건 → 본문 → 증감 → 다시 조건)이고 지금 실행 중인 칸이 노랗다. switch는 case를 세로로 늘어놓고 들어간 자리와 흘러내린 길을 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, w = this.words;
    P.size(680, 300);
    if (c.stmt === 'for' || c.stmt === 'while') {
      var isFor = c.stmt === 'for', op = c.cmp === 'le' ? '<=' : '<', at = s ? s.at : '', jump = c.jump, X = 250, W = 210;
      var cls = function (name) { return at === name ? 'hot now' : 'plain'; };
      P.box('iv', 16, 16, 150, 32, { cls: s && s.i !== null ? 'wait' : 'ghost', title: 'i', right: s && s.i !== null ? String(s.i) : '아직 없음' });
      P.box('cnt', 16, 56, 150, 28, { cls: 'plain', title: '본문에 들어감', right: (s ? s.body : 0) + '번' });
      P.box('init', X, 16, W, 28, { cls: cls('init'), title: 'int i = 0', right: isFor ? '처음 한 번' : '' });
      P.box('cond', X, 62, W, 32, { cls: at === 'spin' ? 'bad now' : at === 'cond' ? (s.cond ? 'hot now' : 'good now') : 'plain', title: 'i ' + op + ' 3 ?', right: s && s.cond !== null ? String(s.cond) : '' });
      if (jump !== 'none') P.box('ifb', X, 114, W, 28, { cls: at === 'if' ? (s.jumped ? 'bad now' : 'hot now') : 'plain', title: 'if (i == 1) ' + (jump === 'break' ? 'break;' : 'continue;') });
      P.box('prt', X, 160, W, 28, { cls: cls('print'), title: 'System.out.println(i)' });
      P.box('inc', X, 206, W, 28, { cls: cls('inc'), title: 'i++', right: isFor ? 'for문의 증감' : '본문의 마지막 줄' });
      P.box('after', 516, 64, 148, 28, { cls: s && s.done ? 'good now' : 'plain', title: 'println("끝")' });
      P.arrow('a_ic', 'init:b', 'cond:t');
      P.arrow('a_ca', 'cond:r', 'after:l', { label: 'false', cls: s && s.done && !s.jumped ? 'good' : '' });
      P.arrow('a_cb', 'cond:b', (jump !== 'none' ? 'ifb' : 'prt') + ':t');
      P.text('t_true', X + W / 2 + 8, jump !== 'none' ? 109 : 132, 'true', { cls: 'mut' });
      if (jump !== 'none') P.arrow('a_ip', 'ifb:b', 'prt:t');
      P.arrow('a_pi', 'prt:b', 'inc:t');
      P.arrow('a_back', 'inc:l:0.7', 'cond:l:0.35', { cls: 'mut' });
      P.text('t_back', 170, 196, '다시 조건으로', { cls: 'mut', anchor: 'end' });
      if (jump === 'break') P.arrow('a_j', 'ifb:r', 'after:b', { label: 'break', cls: s && s.jumped === 'break' ? 'bad' : 'dash' });
      if (jump === 'cont') {
        P.arrow('a_j', 'ifb:r', isFor ? 'inc:r' : 'cond:r:0.8', { cls: s && (s.jumped === 'cont' || s.spin) ? (isFor ? 'hot' : 'bad') : 'dash' });
        P.text('t_j', 500, isFor ? 176 : 124, isFor ? 'continue: 증감으로' : 'continue: 조건으로', { cls: isFor ? 'mut' : 'bad' });
      }
      if (s && s.spin) { P.text('t_spin', 590, 170, 'i가 바뀌지 않아', { cls: 'bad', anchor: 'middle' }); P.text('t_spin2', 590, 188, '끝없이 되풀이', { cls: 'bad', anchor: 'middle' }); }
      P.box('out', 16, 250, 648, 34, { cls: s && s.out.length ? (s.spin ? 'bad' : 'good') : 'ghost', title: '출력', right: s && s.out.length ? s.out.join(', ') + (s.spin ? ' (끝나지 않음)' : '') : '아직 없음' });
      P.note(isFor ? '조건이 false가 되는 순간 오른쪽으로 빠져나갑니다.' : 'while문은 "조건 → 본문"을 되풀이합니다. i++는 본문 안의 한 줄일 뿐이어서, continue가 본문의 남은 줄을 건너뛰면 i++도 함께 건너뜁니다.');
      return;
    }
    var arrow = c.stmt === 'swa', hasBreak = c.stmt === 'swc', names = ['case 1', 'case 2', 'case 3', 'default'];
    P.box('nv', 16, 20, 150, 34, { cls: s ? 'wait' : 'ghost', title: 'n', right: s ? String(s.n) : '아직 없음' });
    names.forEach(function (nm, i) {
      var ran = s && s.ran.indexOf(i) >= 0, cur = s && s.cur === i && ran;
      P.box('c' + i, 210, 20 + i * 46, 304, 30, { cls: cur ? (i === s.match ? 'hot now' : 'bad now') : ran ? (i === s.match ? 'good' : 'bad') : 'plain', title: nm + (arrow ? ' ->' : ':'), right: 'println("' + w[i] + '")' + (hasBreak && i < 3 ? '; break;' : '') });
      if (s && s.fell.indexOf(i) >= 0) P.arrow('fa' + i, 'c' + i + ':b', 'c' + (i + 1) + ':t', { cls: 'bad' });
    });
    if (s && s.match !== null) { P.arrow('a_in', 'nv:r', 'c' + s.match + ':l', { cls: 'hot' }); P.text('t_in', 16, 74, s.match === 3 ? '같은 case가 없어 default로' : 'n과 같은 case로 건너뜀', { cls: 'mut' }); }
    if (s && s.exit !== null) P.text('ex', 540, 40 + s.exit * 46, '→ switch 밖으로', { cls: s.ran.length > 1 ? 'bad' : 'good' });
    P.box('after', 210, 214, 304, 28, { cls: s && s.done ? 'good now' : 'plain', title: 'System.out.println("끝")' });
    P.box('out', 16, 254, 648, 34, { cls: s && s.out.length ? (s.ran.length > 1 ? 'bad' : 'good') : 'ghost', title: '출력', right: s && s.out.length ? s.out.join(', ') : '아직 없음' });
    P.note(arrow ? '화살표 switch는 n과 일치하는 case 하나로 들어가서 그 줄만 실행하고 나옵니다. 일치하는 case가 없으면 default로 갑니다.' : hasBreak ? 'switch는 n과 일치하는 case로 바로 건너뜁니다. 그 뒤 break를 만나면 switch 밖으로 나갑니다. 일치하는 case가 없으면 default로 갑니다.' : 'break가 없으면 빨간 화살표처럼 아래 case의 코드로 계속 흘러내립니다.');
  },
  assume: '스물네 가지 조합(반복문 12, switch 12)의 출력과 횟수를 이 PC의 JDK 21에서 같은 구조의 코드를 실행한 결과와 대조했습니다. 본문에 들어간 횟수는 대조용 프로그램의 본문 첫 줄에 세는 코드를 넣어 얻었습니다. while문에서 continue를 쓴 두 조합은 실제 프로그램이 2초가 지나도 끝나지 않고 본문만 계속 되풀이하는 것을 확인했습니다. "영원히 끝나지 않는다"는 것 자체는 실행으로 증명할 수 없고, i가 바뀌지 않는다는 코드의 구조에서 나오는 결론입니다. 모형은 같은 i 값으로 조건 검사에 다시 돌아오면 무한 반복으로 판단하고 멈춥니다. default가 없는 switch에 일치하는 case가 없는 값을 넣으면 아무것도 실행하지 않는다는 것도 실행해 확인했습니다. 화살표 switch는 Java 14부터 정식 문법입니다. do-while문, 향상된 for문(for-each), 값을 돌려주는 switch 식, 이름표를 붙인 break는 다루지 않았습니다.',
});
