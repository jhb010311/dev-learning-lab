Lab.register({
  id: 'lb_basic', nav: '로드 밸런서', cat: '기초개념', mode: 'step', basic: true, deep: ['scale', 'deploy', 'k8s'],
  title: '서버를 여러 대 두면 요청은 어느 서버로 가는가',
  intro: '서버 한 대가 감당하지 못할 만큼 요청이 많으면 같은 서버 프로그램을 여러 대 띄웁니다. 그런데 클라이언트(요청을 보내는 쪽)가 서버 주소를 여러 개 알아야 한다면 불편합니다. 그래서 클라이언트는 주소 하나로만 접속하고, 그 주소에서 요청을 받는 로드 밸런서가 요청을 서버들에 나눠 보냅니다. 이 실습의 로드 밸런서는 서버 A, 서버 B에 번갈아 보내고, 연결이 거부된 서버는 건너뜁니다. 코드 칸은 자바 코드가 아니라, 어떤 프로그램이 어느 주소에서 무엇을 하는지 적은 구성입니다(#으로 시작하는 줄은 설명입니다). 서버는 자기가 받은 요청 수를 자기 메모리에 세어 "나는 A, 받은 요청 1번째"처럼 답합니다. 이 실습은 로드 밸런서를 빼 보고, 서버 A 프로그램을 요청 3번 뒤에 꺼 보면서 클라이언트가 받는 답이 어떻게 달라지는지 봅니다.',
  terms: ['로드밸런서', '라운드 로빈', '실패한 서버 건너뛰기', '연결 거부 오류'],
  controls: [
    { id: 'servers', label: '서버 구성', type: 'select', value: 'lb', options: [['lb', '서버 A, 서버 B 두 대와 로드 밸런서'], ['one', '서버 A 한 대만 (로드 밸런서 없이 직접 접속)']] },
    { id: 'down', label: '요청 3번을 보낸 뒤 서버 A 프로그램을 끈다', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '로드 밸런서는 어떻게 생겼고, 서버 A와 서버 B 앞에 두면 요청 6번은 어디로 가나', d: '서버 두 대 앞에 로드 밸런서. 요청이 A와 B에 번갈아 갑니다.', v: { servers: 'lb', down: false } },
    { t: '서버 A 프로그램을 끄면', q: '요청 3번을 보낸 뒤 서버 A 프로그램을 끄면', d: '로드 밸런서가 서버 A를 건너뛰어, 클라이언트는 실패 없이 답을 받습니다.', v: { servers: 'lb', down: true } },
    { t: '로드 밸런서 없이 서버 한 대만 두면', q: '로드 밸런서를 빼고 서버 A 한 대에 직접 접속하면', d: '서버가 한 대뿐이라 모든 요청을 그 서버가 받습니다.', v: { servers: 'one', down: false } },
    { t: '서버 한 대뿐인데 그 서버를 끄면', q: '서버 A 한 대뿐인데 요청 3번을 보낸 뒤 서버 A 프로그램을 끄면', d: '받아 줄 서버가 없어 그 뒤의 요청이 모두 실패합니다.', v: { servers: 'one', down: true } },
  ],
  CODE1: '# 클라이언트: http://localhost:8080/ 로 요청 6번',
  code: function (c) {
    var out = [this.CODE1];
    if (c.servers === 'lb') out.push('# 8080: 로드 밸런서 (서버 A, 서버 B에 번갈아 보낸다)', '# 서버 A(9001), 서버 B(9002): "나는 A", "나는 B"라고 답한다', '#   답에는 자기가 받은 요청 수도 적는다');
    else out.push('# 8080: 서버 A. 로드 밸런서 없이 클라이언트가 직접 접속한다', '# 서버 A: "나는 A"라고 답한다', '#   답에는 자기가 받은 요청 수도 적는다');
    if (c.down) out.push('# 요청 3번을 보낸 뒤 서버 A 프로그램을 끈다');
    return out.join('\n');
  },
  label: function (c) { return (c.servers === 'lb' ? '서버 2대와 로드 밸런서' : '서버 1대, 직접 접속') + ' · ' + (c.down ? '요청 3번 뒤 서버 A 끔' : '서버 A 계속 켜 둠'); },
  columns: ['A가 답한 수', 'B가 답한 수', '실패한 요청'],
  simulate: function (c) {
    var lb = c.servers === 'lb', down = !!c.down, N = 6, K = 3;
    var ev = [], sum = [], trace = [];
    var st = { n: 0, aUp: true, cntA: 0, cntB: 0, ansA: 0, ansB: 0, fail: 0, to: '', ref: '', say: '', err: false, phase: 'up', rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var up = { A: true, B: true }, marked = {}, rr = 0;
    // 1단계: 서버가 뜬다
    push(lb ? '서버가 뜹니다. 같은 서버 프로그램 두 개가 서버 A와 서버 B로 따로 뜹니다. 둘은 각자 받은 요청 수를 자기 메모리에 세고, 요청이 오면 "나는 A" 또는 "나는 B"와 그 수를 답합니다. 그 앞에 로드 밸런서가 뜹니다. 클라이언트는 서버가 몇 대인지 모르고 localhost:8080 주소 하나만 압니다. 이 주소에서 요청을 받는 것이 로드 밸런서입니다.'
      : '서버가 뜹니다. 서버 한 대(서버 A)가 8080 주소에서 요청을 기다립니다. 서버 A는 받은 요청 수를 자기 메모리에 세고, 요청이 오면 "나는 A"와 그 수를 답합니다. 앞에 로드 밸런서가 없어서, 클라이언트는 localhost:8080 주소로 이 서버에 직접 접속합니다.', '');
    for (var i = 1; i <= N; i++) {
      if (down && i === K + 1) {
        up.A = false; st.aUp = false; st.phase = 'kill'; st.to = ''; st.ref = '';
        push(lb ? '요청 ' + K + '번을 보낸 뒤 서버 A 프로그램을 끕니다(코드 칸 마지막 줄). 서버 A는 더 이상 연결을 받지 않습니다. 서버 B는 그대로 켜져 있습니다. 이 실습의 로드 밸런서는 서버에 연결해 보고 거부당해야 그 서버가 꺼진 것을 알기 때문에, 아직은 서버 A가 꺼진 것을 모릅니다.'
          : '요청 ' + K + '번을 보낸 뒤 서버 A 프로그램을 끕니다(코드 칸 마지막 줄). 서버는 서버 A 한 대뿐입니다.', 'bad');
      }
      st.n = i; st.to = ''; st.ref = ''; st.say = ''; st.err = false;
      var ans = null, refused = [], skipped = [], turn = '';
      if (lb) {
        var order = (rr++ % 2 === 0) ? ['A', 'B'] : ['B', 'A']; turn = order[0];
        for (var j = 0; j < order.length; j++) {
          var nm = order[j];
          if (marked[nm]) { skipped.push(nm); continue; }
          if (!up[nm]) { refused.push(nm); marked[nm] = true; continue; }
          ans = nm; break;
        }
      } else if (up.A) ans = 'A';
      // 첫 요청은 "보냄"과 "답함"을 두 단계로 나눠 보이므로, 그때는 답하는 단계에서 센다
      var answer = function () {
        if (ans) { if (ans === 'A') { st.cntA++; st.ansA++; } else { st.cntB++; st.ansB++; } st.say = '나는 ' + ans + ', 받은 요청 ' + (ans === 'A' ? st.cntA : st.cntB) + '번째'; }
        else { st.fail++; st.err = true; }
        var rowWhere = lb ? (refused.length ? '서버 ' + refused.join(', ') + ' 연결 거부 → ' : '') + (skipped.length ? '서버 ' + skipped.join(', ') + ' 건너뜀 → ' : '') + '서버 ' + ans : '서버 A';
        st.rows.push([i + '번째 요청', rowWhere, ans ? st.say : '연결 거부 오류']);
        trace.push(ans ? ans + '#' + (ans === 'A' ? st.cntA : st.cntB) + (refused.length ? '<' + refused.join(',') + '거부>' : '') : '오류ECONNREFUSED');
      };
      if (!(lb && i === 1)) answer();
      var hd = '클라이언트가 GET / 요청을 보냅니다(' + i + '번째). ';
      if (lb) {
        st.to = ans; st.ref = refused.length ? refused[0] : '';
        if (i === 1) {
          st.phase = 'sent'; st.to = turn; st.say = ''; var keepSay = '나는 ' + ans + ', 받은 요청 1번째';
          push(hd + '8080 주소에서 요청을 받는 것은 서버가 아니라 로드 밸런서입니다. 로드 밸런서는 서버 목록의 첫 서버인 서버 ' + turn + '에 이 요청을 전달합니다.', '');
          answer(); st.phase = 'answer'; st.say = keepSay; st.to = ans;
          push('서버 ' + ans + '가 자기 메모리에 센 받은 요청 수를 하나 올리고 "' + keepSay + '"라고 답합니다. 로드 밸런서가 이 답을 그대로 클라이언트에 돌려줍니다. 클라이언트가 받은 글에는 어느 서버가 답했는지가 적혀 있습니다.', 'good');
        } else if (refused.length) {
          st.phase = 'req';
                    push(hd + '이번에는 서버 ' + turn + ' 차례여서 로드 밸런서가 서버 ' + turn + '에 연결하려고 하지만, 서버 ' + turn + ' 프로그램을 꺼 둔 뒤라 연결이 거부됩니다(연결 거부 오류). 로드 밸런서는 서버 ' + turn + '를 건너뛰고 같은 요청을 다음 서버인 서버 ' + ans + '에 보냅니다. 서버 ' + ans + '가 자기 메모리에 센 수를 하나 올리고 "' + st.say + '"라고 답하고, 로드 밸런서가 이 답을 돌려줍니다. 클라이언트는 거부된 일을 겪지 않고 정상 답을 받습니다.', 'good');
        } else {
          st.phase = 'req';
          var extra = '';
          if (i === 2) extra = ' 서버 A가 이미 1번 답했지만 서버 B의 수는 "1번째"부터 시작합니다. 받은 요청 수는 서버마다 자기 메모리에 따로 세기 때문입니다.';
          if (skipped.length) extra = ' 서버 ' + skipped[0] + '는 앞에서 연결이 거부돼 건너뜁니다.';
          push(hd + '로드 밸런서는 번갈아 보내므로 이번에는 서버 ' + ans + ' 차례입니다. 서버 ' + ans + '가 자기 메모리에 센 수를 하나 올리고 "' + st.say + '"라고 답하고, 로드 밸런서가 이 답을 돌려줍니다.' + extra, 'good');
        }
      } else {
        st.to = ans || ''; st.phase = 'req';
        if (ans) push(hd + (i === 1 ? '앞에 로드 밸런서가 없으므로 이 요청은 서버 A에 곧바로 닿습니다. ' : '이 요청도 서버 A에 곧바로 닿습니다. ') + '서버 A가 자기 메모리에 센 받은 요청 수를 하나 올리고 "' + st.say + '"라고 답합니다.', 'good');
        else if (i === K + 1) push(hd + '서버 A 프로그램을 꺼 둔 뒤라 8080 주소에서 연결을 받는 프로그램이 없고, 클라이언트에 연결 거부 오류가 납니다. 요청은 서버에 닿지 못했고 답도 없습니다. 앞에 로드 밸런서가 없으니 대신 받아 줄 서버도 없습니다.', 'bad');
        else push(hd + '같은 이유로 연결 거부 오류가 납니다. 답이 없습니다.', 'bad');
      }
    }
    // 마지막 단계
    st.phase = 'end'; st.to = ''; st.ref = '';
    var tail = lb ? '서버 A가 ' + st.ansA + '번, 서버 B가 ' + st.ansB + '번 답했고' : '서버 A가 ' + st.ansA + '번 답했고';
    push('요청 ' + N + '번이 끝났습니다. ' + tail + ', 실패한 요청은 ' + st.fail + '번입니다. 서버 A가 센 받은 요청 수는 ' + st.cntA + '번' + (lb ? ', 서버 B가 센 수는 ' + st.cntB + '번' : '') + '입니다.', st.fail ? 'bad' : 'good');
    // 요약
    if (lb && !down) {
      sum.push('로드 밸런서는 클라이언트가 접속하는 주소 하나에서 요청을 받아 서버 A와 서버 B에 번갈아 보냅니다. 요청 6번 가운데 서버 A가 3번, 서버 B가 3번 답했습니다.');
      sum.push('받은 요청 수는 서버마다 자기 메모리에 따로 셉니다. 서버 B가 처음 받은 요청은 서버 A가 이미 답한 뒤였는데도 "1번째"였고, 두 서버가 센 수는 각각 3번입니다. 서버 메모리에 적어 둔 값은 그 서버의 메모리에만 있고, 다른 서버는 그 값을 모릅니다.');
    } else if (lb && down) {
      sum.push('요청 3번을 보낸 뒤 서버 A 프로그램을 꺼도 요청 6번 모두 답을 받았고 실패한 요청은 0번입니다. 로드 밸런서가 연결이 거부된 서버 A를 건너뛰고 남은 서버 B에 보냈습니다.');
      sum.push('서버가 한 대 꺼져도 남은 서버가 있으면 서비스는 이어집니다. 다만 서버 B 혼자 나머지를 받아, 서버 B가 센 수는 2번째, 3번째, 4번째로 이어져 4번이 됐습니다.');
    } else if (!down) {
      sum.push('로드 밸런서 없이 서버 A 한 대에 직접 접속하면 요청 6번 모두 서버 A가 답했습니다. 서버 A가 센 받은 요청 수도 1번째부터 6번째까지 한 서버에서 이어졌습니다.');
      sum.push('서버가 살아 있는 동안은 문제가 없습니다. 로드 밸런서가 있을 때는 이 수가 서버마다 따로 셌습니다.');
    } else {
      sum.push('서버 A 한 대뿐일 때 요청 3번 뒤에 서버 A 프로그램을 끄면, 끄기 전의 요청 3번은 답을 받지만 끈 뒤의 요청 3번(4~6번째)은 모두 연결 거부 오류로 실패합니다. 끈 뒤로는 클라이언트가 한 번도 답을 받지 못했습니다.');
      sum.push('대신 받아 줄 서버가 없습니다. 로드 밸런서 없이 서버 한 대에 기대면 그 한 대가 꺼지는 순간 서비스 전체가 멈춥니다.');
    }
    return { events: ev, summary: sum, trace: trace, row: [st.ansA + '번', lb ? st.ansB + '번' : '서버 B 없음', st.fail + '번' + (st.fail ? ' (연결 거부 오류)' : '')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 뜨는 것부터 시작합니다.'); return; }
    if (s.rows.length) H.table(v, ['요청', '보낸 곳', '클라이언트가 받은 것'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1], { v: r[2], cls: r[2].indexOf('나는') === 0 ? 'good' : 'bad' }] }; }), '요청과 답');
    H.counters(v, [[s.ansA, 'A가 답한 수'], [sim.c.servers === 'lb' ? s.ansB : '-', 'B가 답한 수'], [s.fail, '실패한 요청']]);
  },
  // 그림: 왼쪽에 클라이언트, 가운데에 로드 밸런서(없으면 점선), 오른쪽에 서버 A와 B. 요청이 어느 서버에 닿는지, 연결이 거부되는 곳이 어디인지를 화살표로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, lb = c.servers === 'lb', last = shown[shown.length - 1], s = last ? last.snap : null;
    var sending = s && (s.phase === 'sent' || s.phase === 'answer' || s.phase === 'req');
    P.size(680, 292);
    P.region('cl', 10, 16, 150, 206, '클라이언트');
    var cs;
    if (!s || !s.n) cs = ['요청 0/6번째', '대기'];
    else if (s.phase === 'sent') cs = ['요청 ' + s.n + '/6번째', '답을 기다림'];
    else if (s.phase === 'kill') cs = ['요청 ' + s.n + '/6번째', '다음 요청 전'];
    else if (s.err) cs = ['요청 ' + s.n + '/6번째', '연결 거부', '오류'];
    else cs = ['요청 ' + s.n + '/6번째', '받은 답:'].concat(s.say.split(', '));
    P.box('c', 20, 44, 130, 162, { cls: s && s.err && sending ? 'bad' : sending ? 'wait' : 'plain', title: '요청 보내기', sub: cs });
    P.box('lb', 220, 95, 120, 62, { cls: lb ? (sending ? 'hot' : 'plain') : 'ghost', title: '로드 밸런서', sub: lb ? ['8080 주소'] : ['(없음)'] });
    P.region('sv', 440, 16, 230, 206, '서버');
    var aOn = s && sending && s.to === 'A', bOn = s && sending && s.to === 'B';
    P.box('a', 450, 36, 210, 70, { cls: s && !s.aUp ? 'bad' : aOn ? (s.phase === 'sent' ? 'hot now' : 'good now') : 'plain', title: '서버 A', sub: ['받은 요청 ' + (s ? s.cntA : 0) + '번', s && !s.aUp ? '꺼져 있음' : '켜져 있음'] });
    P.box('b', 450, 132, 210, 70, { cls: lb ? (bOn ? (s.phase === 'sent' ? 'hot now' : 'good now') : 'plain') : 'ghost', title: '서버 B', sub: lb ? ['받은 요청 ' + (s ? s.cntB : 0) + '번', '켜져 있음'] : ['(없음)'] });
    if (sending) {
      if (lb) {
        P.arrow('rq', 'c:r:0.5', 'lb:l', {});
        if (s.to) P.arrow('fw', 'lb:r:' + (s.to === 'A' ? '0.25' : '0.75'), (s.to === 'A' ? 'a' : 'b') + ':l:0.5', { cls: 'good' });
        if (s.ref) P.arrow('rf', 'lb:r:' + (s.ref === 'A' ? '0.25' : '0.75'), (s.ref === 'A' ? 'a' : 'b') + ':l:0.5', { cls: 'bad' });
      } else {
        P.arrow('rq', 'c:r:0.2', 'a:l:0.5', { cls: s.err ? 'bad' : 'good' });
      }
    }
    P.box('n1', 14, 240, 214, 36, { cls: s && s.ansA ? 'good' : 'ghost', title: 'A가 답한 수', right: (s ? s.ansA : 0) + '번' });
    P.box('n2', 233, 240, 214, 36, { cls: lb && s && s.ansB ? 'good' : 'ghost', title: 'B가 답한 수', right: lb ? (s ? s.ansB : 0) + '번' : '없음' });
    P.box('n3', 452, 240, 214, 36, { cls: s && s.fail ? 'bad' : 'ghost', title: '실패한 요청', right: (s ? s.fail : 0) + '번' });
  },
  assume: '서버 A(와 서버 B)는 Node.js 24.18.0의 http 서버이고, 받은 요청 수를 서버마다 자기 변수에 세어 "나는 A, 받은 요청 1번째"처럼 답합니다. 로드 밸런서는 NGINX 같은 제품이 아니라 같은 Node.js의 http 서버로 직접 만든 것입니다. 요청이 올 때마다 서버 목록의 시작 자리를 하나씩 돌려(A, B, A, B...) 그 서버에 새 연결로 요청을 전달하고, 연결이 거부되면 그 서버를 건너뛰어 다음 서버에 같은 요청을 보내며, 한 번 거부당한 서버는 이후 다시 시도하지 않습니다. 클라이언트는 http 모듈로 GET / 요청을 요청마다 새 연결로 6번 차례로 보냈습니다. 서버 A를 끄는 것은 프로세스를 끝내는 대신 그 서버의 연결 받는 소켓과 열린 연결을 닫는 것으로 했고, 닫은 뒤 클라이언트나 로드 밸런서가 연결하면 ECONNREFUSED(연결 거부 오류)가 났습니다. 네 가지 조합을 모두 실행해, 서버 A와 서버 B가 답한 수, 실패한 요청 수, 요청 6번 각각을 어느 서버가 몇 번째로 답했는지, 서버가 메모리에 센 수, 로드 밸런서가 연결을 거부당한 요청과 서버, 서버가 받은 요청 글을 모형과 대조했고, 화면의 코드가 그 구성과 같은 내용인지도 조합마다 확인했습니다. 화면의 코드는 실행한 프로그램이 아니라 그 구성을 설명한 글이고, 화면의 8080, 9001, 9002는 예시 주소이며 실제 실행에서는 빈 포트를 썼습니다. 이것들은 이 구현에서 관찰한 동작입니다. 문서로 확인한 것은 RFC 9110 3.7절(게이트웨이, 곧 리버스 프록시는 받은 요청을 안쪽의 다른 서버나 여러 서버에 전달하는 중간 서버라는 정의)과 NGINX 문서(nginx.org의 ngx_http_upstream_module: 요청은 기본으로 가중치를 둔 라운드 로빈으로 서버들에 나뉘고, max_fails 기본 1과 fail_timeout 기본 10초가 실패한 서버를 그 시간 동안 쓰지 않을 서버로 본다는 설명, ngx_http_proxy_module: proxy_next_upstream 기본값이 error timeout이고 error에는 서버와 연결을 맺는 중 오류가 난 경우가 들어 있다는 설명)입니다. 검증 실행에서는 NGINX를 실행해 보지 않았고, 이 실습의 로드 밸런서가 NGINX와 같은 취지로 움직이게 짠 것일 뿐 NGINX의 실제 동작을 대조한 것은 아닙니다. 다루지 않은 것: 로드 밸런서 자신이 꺼지는 경우, 꺼진 서버가 다시 켜져 돌아오는 경우, 서버 상태를 주기적으로 확인하는 헬스 체크, 서버마다 처리 능력이나 가중치가 다른 경우, 같은 사용자의 요청을 같은 서버로 보내는 방식, 요청이 아주 많을 때 서버가 버티는 한계입니다. 서버를 늘려 처리량이 어디까지 느는지는 "세부 동작 실습: 로드밸런서와 스케일 아웃"에서, 서버를 하나씩 바꿔 배포하는 방법은 "배포 전략"에서, 죽은 서버를 자동으로 다시 띄우는 일은 "쿠버네티스 자가 치유"에서 다룹니다.',
});
