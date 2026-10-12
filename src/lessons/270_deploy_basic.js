Lab.register({
  id: 'deploy_basic', nav: '배포', cat: '기초개념', mode: 'step', basic: true, deep: ['deploy', 'cicd', 'k8s'],
  title: '코드를 고치면 실행 중인 서버는 언제 바뀌는가',
  intro: '서버는 소스 파일(코드를 적어 둔 파일)을 읽어 들여, 그 코드대로 요청에 답하는 프로그램입니다. 서버를 켜면 컴퓨터가 서버 프로그램을 실행해 프로세스(실행 중인 프로그램)를 하나 만들고, 이 프로세스는 켜질 때 소스 파일 server.js를 읽어 들입니다. 그 뒤에는 읽어 들인 코드로 돌 뿐이고, 이 서버는 디스크에 있는 파일을 다시 읽지 않습니다. 그래서 파일을 고쳐 저장해도 이미 켜져 있는 서버는 옛 코드 그대로 답합니다. 새 코드를 쓰게 하려면 서버를 끄고 새 코드로 다시 켜야 하고, 이렇게 새 버전을 실제로 돌아가게 하는 일을 배포라고 합니다. 코드 칸은 자바 코드가 아니라 사람이 하는 일을 순서대로 적은 목록입니다(#으로 시작하는 줄은 번호가 붙은 할 일입니다). 이 실습은 소스 파일을 고치는 2번 줄과 서버를 껐다 켜는 3번 줄을 하나씩 지우거나 순서를 바꿔 가며, 4번 요청에 어느 버전이 답하는지를 봅니다.',
  terms: ['배포', '서버 재시작', '시작할 때 읽은 코드', '연결 거부 오류'],
  controls: [
    { id: 'edit', label: '2번 줄 "소스 파일의 "버전 1"을 "버전 2"로 고친다"를 적는다', type: 'check', value: true },
    { id: 'restart', label: '3번 줄 "서버를 끄고 다시 켠다"를 적는다', type: 'check', value: true },
    { id: 'when', label: '4번 요청을 보내는 때', type: 'select', value: 'after', show: function (c) { return c.restart; }, options: [['after', '서버를 끄고 다시 켠 뒤'], ['during', '서버를 끈 뒤, 다시 켜기 전 (3번 끈다, 4번 요청, 5번 다시 켠다)']] },
  ],
  // 다시 켜는 줄이 없으면 요청 때를 고를 수 없으므로 처음 값으로 되돌린다
  fix: function (c) { if (!c.restart && c.when !== 'after') return { when: 'after' }; },
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '소스 파일을 고친 새 버전을 서버에 반영하는 일(배포)은 어떻게 생겼고, 4번 요청에는 어느 버전이 답하나', d: '파일을 고치고 서버를 끄고 다시 켠 뒤 요청합니다. 새 버전이 답합니다.', v: { edit: true, restart: true, when: 'after' } },
    { t: '3번 줄을 지우면', q: '3번 줄(서버를 끄고 다시 켠다)을 지우면', d: '파일만 고치고 서버는 그대로입니다. 옛 버전이 계속 답합니다.', v: { edit: true, restart: false, when: 'after' } },
    { t: '서버를 끈 사이에 요청하면', q: '서버를 끈 뒤 다시 켜기 전에 요청을 보내면 (3번 서버를 끈다, 4번 요청을 보낸다, 5번 서버를 다시 켠다)', d: '서버가 꺼져 있는 동안 온 요청은 답을 받지 못합니다.', v: { edit: true, restart: true, when: 'during' } },
    { t: '2번 줄을 지우면', q: '2번 줄(소스 파일을 고친다)을 지우고 서버만 끄고 다시 켜면', d: '고친 것이 없으면 다시 켜도 같은 버전이 답합니다.', v: { edit: false, restart: true, when: 'after' } },
    { t: '2번 줄과 3번 줄을 둘 다 지우면', q: '2번 줄과 3번 줄을 둘 다 지우면', d: '아무것도 바뀌지 않아 처음 버전이 답합니다.', v: { edit: false, restart: false, when: 'after' } },
  ],
  code: function (c) {
    var out = ['# 1. 서버를 켠다 (코드: "버전 1"을 답한다)'];
    if (c.edit) out.push('# 2. 소스 파일의 "버전 1"을 "버전 2"로 고친다');
    if (c.restart) {
      if (c.when === 'during') out.push('# 3. 서버를 끈다', '# 4. 요청을 보낸다', '# 5. 서버를 다시 켠다');
      else out.push('# 3. 서버를 끄고 다시 켠다', '# 4. 요청을 보낸다');
    } else out.push('# 4. 요청을 보낸다');
    return out.join('\n');
  },
  label: function (c) { return (c.edit ? '소스 파일을 고침' : '소스 파일을 고치지 않음') + ' · ' + (!c.restart ? '서버를 다시 켜지 않음' : c.when === 'during' ? '서버를 끈 사이에 요청' : '서버를 끄고 다시 켠 뒤 요청'); },
  columns: ['응답', '실행 중인 코드', '디스크의 소스'],
  simulate: function (c) {
    var edit = !!c.edit, rs = !!c.restart, during = rs && c.when === 'during';
    var V1 = '버전 1', V2 = '버전 2', dnow = edit ? V2 : V1;
    var ev = [], sum = [];
    var st = { proc: 'none', mem: '', disk: V1, starts: 0, req: '', ans: '', rd: false, ed: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function q(v) { return '"' + v + '"'; }
    function J(v, t) { var p = { '을': ['을', '를'], '이': ['이', '가'], '로': ['로', '로'] }[t]; return q(v) + (v === V1 ? p[0] : p[1]); }
    var result = { response: '', running: '' };
    // 1번 줄: 서버를 켠다
    st.proc = 'up'; st.mem = st.disk; st.starts = 1; st.rd = true;
    push('1번 줄: 서버를 켭니다. 컴퓨터가 서버 프로그램을 실행해 프로세스(실행 중인 프로그램)를 하나 만듭니다. 이 프로세스는 켜질 때 디스크의 소스 파일 server.js를 읽어 들입니다. 파일에 적힌 코드는 요청이 오면 ' + J(V1, '을') + ' 답하라는 것이고, 프로세스는 읽어 들인 이 코드를 자기 안에 가지고 요청을 기다립니다.', '');
    st.rd = false;
    // 2번 줄: 소스 파일을 고친다
    if (edit) {
      st.disk = V2; st.ed = true;
      push('2번 줄: 사람이 소스 파일 server.js를 열어 ' + J(V1, '을') + ' ' + J(V2, '로') + ' 고쳐 저장합니다. 이제 디스크의 파일에는 ' + J(V2, '이') + ' 적혀 있습니다. 하지만 실행 중인 서버는 켤 때 이미 파일을 읽어 들였고, 그 뒤에 파일이 바뀐 것을 가져오지 않습니다. 고치고 0.5초를 기다린 뒤 실행 중인 서버에 직접 물어보아도 서버가 가진 코드는 여전히 ' + J(V1, '이') + '었습니다. 파일과 서버 안의 코드는 서로 다른 곳에 있습니다.', '');
      st.ed = false;
    }
    // 3번 줄: 서버를 끈다 (그리고 다시 켠다)
    if (rs) {
      st.proc = 'down'; st.mem = '';
      push('3번 줄: 서버를 끕니다. 서버 프로세스가 끝나고, 그 프로세스가 읽어 들여 가지고 있던 코드도 함께 사라집니다.' + (during ? ' 다시 켜기 전이어서 지금은 8080 주소에서 요청을 받는 프로그램이 없습니다.' : ''), '');
      if (!during) {
        st.proc = 'up'; st.mem = st.disk; st.starts++; st.rd = true;
        push('3번 줄: 이어서 서버를 다시 켭니다. 서버 프로그램을 다시 실행해 새 프로세스를 만들고, 새 프로세스는 켜질 때 소스 파일을 처음부터 읽어 들입니다. 지금 파일에는 ' + J(st.disk, '이') + ' 적혀 있으므로 새 프로세스는 ' + J(st.disk, '을') + ' 답하는 코드를 가집니다.' + (edit ? ' 고친 코드가 이제 서버 안으로 들어왔습니다.' : ' 파일을 고치지 않았으니 처음과 같은 코드입니다.'), edit ? 'good' : '');
        st.rd = false;
      }
    }
    // 4번 줄: 요청을 보낸다
    st.req = 'sent';
    push('4번 줄: 클라이언트가 서버에 GET /hello 요청을 보냅니다. 브라우저 주소창에 localhost:8080/hello 주소를 입력하면 브라우저가 보내는 요청과 같은 것입니다.', '');
    if (during) {
      st.req = 'fail'; st.ans = '연결 거부 오류';
      push('서버를 꺼 둔 뒤라서, 8080 주소에서 연결을 받는 프로그램이 없습니다. 클라이언트에 연결 거부 오류가 나고 답을 받지 못합니다. 디스크의 파일은 ' + J(dnow, '이') + '지만, 이 요청에는 상관이 없습니다.', 'bad');
      result.response = '연결 거부 오류'; result.running = '없음 (서버가 꺼져 있음)';
    } else {
      var stale = st.mem !== st.disk;
      st.req = 'got'; st.ans = st.mem;
      if (stale) push('서버 프로세스가 가진 코드는 ' + J(st.mem, '을') + ' 답하는 것이어서 클라이언트는 ' + J(st.mem, '을') + ' 받습니다. 디스크의 파일에는 ' + J(st.disk, '이') + ' 적혀 있지만, 서버가 파일을 다시 읽지 않았으므로 답에는 반영되지 않았습니다.', 'bad');
      else push('서버 프로세스가 가진 코드대로 ' + J(st.mem, '을') + ' 답하고, 클라이언트는 ' + J(st.mem, '을') + ' 받습니다. 디스크의 파일에 적힌 글도 ' + q(st.disk) + ' 그대로여서 파일과 서버 안의 코드가 같습니다.' + (edit ? ' 고친 새 버전이 요청에 답했습니다.' : ' 파일을 고친 적이 없으므로 처음 버전 그대로입니다.'), edit ? 'good' : '');
      result.response = st.mem; result.running = st.mem;
    }
    // 5번 줄: 서버를 다시 켠다 (요청 뒤에)
    if (during) {
      st.proc = 'up'; st.mem = st.disk; st.starts++; st.rd = true; st.req = 'sent'; st.ans = '';
      push('5번 줄: 서버를 다시 켭니다. 새 프로세스가 켜질 때 소스 파일을 읽어 들입니다. 지금 파일에는 ' + J(st.disk, '이') + ' 적혀 있으므로 새 프로세스는 ' + J(st.disk, '을') + ' 답하는 코드를 가집니다. 꺼져 있는 사이에 보낸 4번 요청은 이미 실패했습니다. 다시 켠 뒤에 보낸 요청은 ' + J(st.disk, '로') + ' 답을 받았습니다.' + (edit ? '' : ' 파일을 고치지 않았으니 처음과 같은 버전입니다.'), 'good');
      st.rd = false; st.req = 'got'; st.ans = st.mem;
    }
    // 요약
    if (edit && rs && !during) {
      sum.push('실행 중인 서버는 켤 때 읽어 들인 코드로 돕니다. 소스 파일을 고친 뒤 서버를 끄고 다시 켜면 새 프로세스가 고친 파일을 읽어 ' + J(V2, '이') + ' 답합니다. 이렇게 새 버전을 실제로 돌아가게 하는 일이 배포입니다. 코드를 고치기만 하는 것과 다른 곳은 3번 줄(서버를 끄고 다시 켠다)입니다.');
      sum.push('고치는 일(2번 줄)과 다시 켜는 일(3번 줄)은 서로 다른 일입니다. 둘이 모두 있어야 새 코드가 요청에 답합니다.');
    } else if (edit && !rs) {
      sum.push('소스 파일은 ' + J(V2, '로') + ' 바뀌었지만 서버는 계속 ' + J(V1, '로') + ' 답합니다. 실행 중인 서버는 켤 때 읽어 들인 코드로 돌기 때문에, 파일을 고쳐도 서버를 다시 켜기 전에는 바뀌지 않습니다.');
      sum.push('디스크의 파일과 실행 중인 코드는 따로 있습니다. 파일만 고쳐 둔 상태는 아직 배포가 아닙니다.');
    } else if (edit && during) {
      sum.push('서버가 꺼져 있는 사이에 보낸 요청은 연결 거부 오류로 실패합니다. 받아 줄 프로세스가 없기 때문입니다. 다시 켠 뒤에 온 요청은 고친 코드인 ' + J(V2, '로') + ' 답을 받았습니다.');
      sum.push('서버가 한 대뿐이면 껐다 켜는 동안 서비스가 멈춥니다. 이 틈을 없애는 방법은 "세부 동작 실습: 배포 전략"에서 다룹니다.');
    } else if (!edit && rs && !during) {
      sum.push('소스 파일을 고치지 않고 서버만 끄고 다시 켜면, 새 프로세스가 읽는 파일이 그대로여서 ' + J(V1, '이') + ' 답합니다. 껐다 켠다고 코드가 바뀌지는 않습니다.');
      sum.push('새 코드가 돌려면 파일을 고치는 일과 서버를 다시 켜는 일이 둘 다 필요합니다.');
    } else if (!edit && !rs) {
      sum.push('아무것도 바꾸지 않았으므로 ' + J(V1, '이') + ' 답합니다. 서버는 처음 읽어 들인 코드 그대로 돌고 있습니다.');
      sum.push('서버 안의 코드는 서버를 다시 켜는 것으로만 바뀌고, 그때 읽는 것은 그 순간의 소스 파일입니다. 둘 중 하나라도 빠지면 새 버전은 요청에 닿지 못합니다.');
    } else {
      sum.push('서버가 꺼져 있는 사이에 보낸 요청은 연결 거부 오류로 실패합니다. 다시 켠 뒤에도 소스 파일을 고치지 않았으니 ' + J(V1, '이') + ' 답합니다.');
      sum.push('코드를 바꾸지도 않고 서버를 껐다 켜면 얻는 것 없이 끊기는 시간만 생깁니다.');
    }
    return { events: ev, summary: sum, row: [result.response, result.running, dnow], later: during ? dnow : '', starts: st.starts, afterEdit: edit ? V1 : '', sameProc: during ? '(해당 없음)' : String(!rs) };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버를 켜는 것부터 시작합니다.'); return; }
    var mem = s.proc === 'up' ? s.mem : s.proc === 'down' ? '없음 (서버가 꺼져 있음)' : '아직';
    H.table(v, ['항목', '지금'], [
      { cls: '', cells: ['디스크의 소스 파일', s.disk] },
      { cls: s.proc === 'down' ? 'gone' : '', cells: ['실행 중인 코드', s.proc === 'up' && s.mem !== s.disk ? { v: mem + ' (파일과 다름)', cls: 'bad' } : mem] },
      { cls: s.ans ? '' : 'gone', cells: ['요청에 온 응답', s.ans ? { v: s.ans, cls: s.req === 'fail' ? 'bad' : s.ans === s.disk ? 'good' : 'bad' } : '아직'] },
    ], '지금 상태');
    H.counters(v, [[s.starts, '서버를 켠 횟수']]);
  },
  // 그림: 왼쪽에 클라이언트, 가운데에 서버 프로세스(읽어 들인 코드), 오른쪽에 디스크의 소스 파일. 켤 때만 파일에서 프로세스로 읽어 들이고, 요청은 프로세스만 거친다. 서버가 꺼져 있으면 요청이 끊긴다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    var up = s && s.proc === 'up', down = s && s.proc === 'down', stale = up && s.mem !== s.disk;
    P.size(680, 228);
    P.region('cl', 10, 16, 150, 146, '클라이언트');
    P.box('req', 20, 44, 130, 108, { cls: s && s.req === 'fail' ? 'bad' : s && s.req === 'sent' ? 'wait' : s && s.req === 'got' ? 'good' : 'plain', title: '요청 보내기', sub: !s || !s.req ? ['대기'] : s.req === 'sent' ? ['GET /hello', '답을 기다림'] : s.req === 'fail' ? ['GET /hello', '연결 거부 오류'] : ['GET /hello', '받은 답:', s.ans] });
    P.region('sv', 220, 16, 200, 146, '서버');
    P.box('proc', 230, 44, 180, 108, { cls: down ? 'ghost' : stale && s.req === 'got' ? 'bad' : up ? (s.rd ? 'hot' : 'wait') : 'ghost', title: '서버 프로세스', sub: up ? ['켜져 있음', '읽어 들인 코드:', s.mem] : down ? ['꺼져 있음'] : ['켜기 전'] });
    P.region('dk', 480, 16, 190, 146, '디스크');
    P.box('src', 490, 44, 170, 108, { cls: s && s.ed ? 'hot' : 'plain', title: 'server.js', sub: ['적힌 글:', s ? s.disk : '버전 1'] });
    if (s && s.req) P.arrow('rq', 'req:r:0.3', 'proc:l:0.3', { cls: s.req === 'fail' ? 'bad' : 'hot' });
    if (s && s.req === 'got') P.arrow('rs', 'proc:l:0.75', 'req:r:0.75', { cls: stale ? 'bad' : 'good' });
    if (s && s.rd) P.arrow('rd', 'src:l:0.5', 'proc:r:0.5', { cls: 'hot' });
    P.box('n1', 14, 180, 322, 36, { cls: s && s.starts ? 'wait' : 'ghost', title: '서버를 켠 횟수', right: (s ? s.starts : 0) + '번' });
    P.box('n2', 344, 180, 322, 36, { cls: s && s.ans ? (s.req === 'fail' ? 'bad' : s.ans === s.disk ? 'good' : 'bad') : 'ghost', title: '요청에 온 응답', right: s && s.ans ? s.ans : '아직' });
  },
  assume: '서버는 Node.js 24.18.0의 http 서버입니다. 조합마다 server.js 파일을 실제로 쓰고(시작할 때 const answer = \'버전 1\' 줄을 읽어 들이고, 요청이 오면 그 값을 답하는 짧은 프로그램), node server.js를 자식 프로세스로 실제로 띄웠습니다. 화면의 코드는 실행한 프로그램이 아니라 사람이 하는 일을 적은 목록이고, Probe는 이 목록을 줄 단위로 그대로 실행했습니다. 켠다는 자식 프로세스를 시작하는 것, 고친다는 server.js 파일을 실제로 다시 쓰는 것, 끈다는 그 프로세스를 끝내는 것, 요청은 http 모듈의 GET /hello입니다. 여섯 가지 조합(다시 켜는 줄이 없으면 요청 때를 고를 수 없으므로 여덟 가지 설정 가운데 서로 다른 것)을 모두 실행해, 요청에 온 응답(또는 연결 거부 오류), 그때 살아 있는 프로세스가 가진 값(별도의 요청으로 물음), 그때 디스크 파일에 적힌 값, 껐다 켠 뒤의 프로세스가 처음 프로세스와 다른 프로세스인지, 켠 횟수, 파일을 고치고 0.5초 기다린 뒤에도 처음 프로세스가 가진 값이 그대로인지, 서버를 끈 사이에 요청한 조합에서 다시 켠 뒤 한 번 더 보낸 요청의 답을 확인해 모형과 대조했고, 화면의 코드가 Probe가 실행한 목록과 같은 글인지도 조합마다 확인했습니다. 한 조합 안에서는 껐다 켜도 같은 포트를 썼고, 화면의 localhost:8080은 예시 주소이며 실제로는 빈 포트를 한 번 잡아 썼습니다. 이 실습의 서버는 파일을 읽는 일을 켤 때 한 번만 하는 짧은 프로그램이라, 파일이 바뀌면 스스로 다시 읽어 들이는 도구(개발용 자동 재시작 도구 등)나 요청마다 파일을 읽는 프로그램은 다루지 않았습니다. 문서로 확인한 것은 Node.js 문서 Modules의 Caching 절(모듈은 처음 읽어 들인 뒤 캐시되고, require 캐시를 바꾸지 않으면 같은 모듈을 여러 번 불러도 모듈의 코드가 여러 번 실행되지 않는다는 서술)과 Kubernetes 문서 Deployments(Deployment가 Pod의 선언적 갱신을 맡는다는 소개, Strategy 절의 Recreate는 기존 Pod를 모두 끝낸 뒤 새 Pod를 만들고 RollingUpdate는 점진적으로 바꾼다는 서술)입니다. 두 문서는 읽기만 했고, 서버가 켤 때 읽어 들인 코드로 돈다는 것은 문서가 아니라 위의 실행으로 확인했습니다. Node.js 문서의 Caching 절은 require로 불러온 모듈에 대한 서술이고 이 실습의 server.js는 node 명령으로 직접 실행한 시작 파일이어서, 문서가 server.js의 동작까지 정한다고는 쓰지 않았습니다. 다루지 않은 것: 서버를 껐다 켜는 틈을 없애는 방법(여러 대를 차례로 바꾸는 롤링, 새 환경을 통째로 만드는 블루-그린 등)은 "세부 동작 실습: 배포 전략"에서, 코드를 고친 뒤 빌드와 테스트를 거쳐 서버에 올리는 자동화는 "세부 동작 실습: CI/CD 파이프라인"에서, 컨테이너로 포장해 쿠버네티스가 서버를 바꾸는 방식은 "세부 동작 실습: 쿠버네티스 자가 치유"에서 다룹니다. 자바 같은 컴파일 언어에서는 소스 파일을 고친 뒤 다시 컴파일해야 한다는 단계가 하나 더 있는데, 이 실습은 컴파일이 없는 Node.js의 소스 파일로만 보였습니다.',
});
