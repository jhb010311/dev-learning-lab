Lab.register({
  id: 'dns_basic', nav: 'DNS', cat: '기초개념', mode: 'step', basic: true, deep: ['dns'],
  title: 'DNS는 무엇을 무엇으로 바꿔 주는가',
  intro: '컴퓨터끼리는 IP 주소(숫자)로 연결하지만, 사람은 shop.example 같은 이름을 씁니다. DNS는 이름을 IP 주소로 바꿔 주는 서비스이고, 이름과 IP 주소를 짝지어 적어 둔 표를 가진 컴퓨터가 DNS 서버입니다. 화면의 코드 칸은 두 구역입니다. 위쪽은 DNS 서버에 등록된 것(이름 → IP 주소)이고, 아래쪽은 클라이언트가 접속하려는 주소입니다. 이름으로 접속하려는 클라이언트는 서버에 연결하기 전에 먼저 DNS 서버에 그 이름의 IP 주소를 묻고, 답으로 받은 IP 주소로 연결합니다. 이 실습은 이름을 등록하지 않거나, 다른 IP 주소로 등록하거나, 주소 칸에 이름 대신 IP 주소를 직접 적어 가며 같은 접속을 시켜, DNS 서버에 몇 번 묻는지, 어느 컴퓨터에 닿는지를 봅니다. 화면의 8080은 예시로 적은 포트 번호입니다.',
  terms: ['DNS', '도메인 이름', 'IP 주소(IPv4)', '이름 없음 응답(NXDOMAIN)'],
  controls: [
    { id: 'reg', label: 'DNS 서버에 등록된 것', type: 'select', value: 'one', options: [['one', 'shop.example을 127.0.0.1로 등록해 둔다'], ['two', 'shop.example을 127.0.0.2로 등록해 둔다 (다른 컴퓨터)'], ['none', 'shop.example을 등록하지 않는다']] },
    { id: 'target', label: '클라이언트가 접속하려는 주소', type: 'select', value: 'name', options: [['name', 'http://shop.example:8080/로 접속한다'], ['ip', 'http://127.0.0.1:8080/로 접속한다 (IP 주소를 직접 적는다)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'DNS는 무엇이고, 이름으로 접속하면 무슨 일이 일어나나', d: '이름이 등록돼 있습니다. 클라이언트가 먼저 DNS 서버에 묻고, 받은 IP 주소로 연결합니다.', v: { reg: 'one', target: 'name' } },
    { t: '이름을 등록하지 않으면', q: 'shop.example이 DNS에 등록돼 있지 않으면', d: 'DNS 서버가 그런 이름은 없다고 답해 IP 주소를 얻지 못합니다. 서버가 떠 있어도 연결을 시작하지 못합니다.', v: { reg: 'none', target: 'name' } },
    { t: '다른 IP 주소로 등록하면', q: '같은 이름이 다른 IP 주소(127.0.0.2)로 등록돼 있으면', d: '같은 이름으로 접속했는데 DNS의 답이 달라져 다른 컴퓨터에 닿습니다.', v: { reg: 'two', target: 'name' } },
    { t: 'IP 주소를 직접 적으면', q: '이름 대신 IP 주소를 직접 적으면', d: '이름이 아니라서 DNS 서버에 묻지 않고, 그 IP 주소로 바로 연결합니다.', v: { reg: 'one', target: 'ip' } },
  ],
  IP: { one: '127.0.0.1', two: '127.0.0.2' },
  code: function (c) {
    var reg = c.reg === 'none' ? '(등록된 이름 없음)' : 'shop.example    ' + this.IP[c.reg];
    return ['# DNS 서버에 등록된 것 (이름 → IP 주소)', reg, '', '# 클라이언트가 접속하려는 주소', c.target === 'name' ? 'http://shop.example:8080/' : 'http://127.0.0.1:8080/'].join('\n');
  },
  label: function (c) { return { one: '127.0.0.1로 등록', two: '127.0.0.2로 등록', none: '등록 안 함' }[c.reg] + ' · ' + (c.target === 'name' ? '이름으로 접속' : 'IP 주소로 접속'); },
  columns: ['DNS 서버에 물은 횟수', 'DNS 서버의 답', '연결한 IP 주소', '응답'],
  simulate: function (c) {
    var ev = [], sum = [], name = c.target === 'name', host = name ? 'shop.example' : '127.0.0.1';
    var dest = name ? { one: '127.0.0.1', two: '127.0.0.2', none: null }[c.reg] : '127.0.0.1';
    var who = dest === '127.0.0.2' ? 'c2' : 'c1', body = dest === '127.0.0.2' ? '둘째 컴퓨터입니다' : '첫째 컴퓨터입니다';
    var port = '8080은 포트 번호로, 그 컴퓨터 안에서 서버 프로그램이 기다리는 문의 번호입니다.';
    var st = { asked: 0, cl: 'plain', clt: ['대기'], dn: 'plain', ask: false, rep: '', go: '', back: false, c1: 'plain', c1t: ['서버가 떠 있음'], c2: 'plain', c2t: ['서버가 떠 있음'], ans: '', ip: '', resp: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 1단계: 주소에서 호스트 부분을 본다
    st.cl = 'hot'; st.clt = ['호스트 부분을 봄'];
    if (name) {
      push('클라이언트(브라우저처럼 서버에 접속하는 프로그램)가 접속하려는 주소 http://shop.example:8080/ 에서 호스트 부분을 봅니다. 호스트는 어느 컴퓨터에 접속할지를 적은 칸으로, 여기서는 shop.example입니다. 이것은 IP 주소가 아니라 이름입니다. 컴퓨터끼리는 IP 주소로 연결하므로, 클라이언트는 연결하기 전에 이 이름의 IP 주소부터 알아내야 합니다.', '');
      // 2단계: DNS 서버에 묻는다
      st.ask = true; st.asked = 1; st.dn = 'hot'; st.clt = ['DNS 서버에', '묻는 중'];
      push('클라이언트가 DNS 서버에 "shop.example의 IP 주소가 무엇인가"를 묻습니다. DNS 서버는 이름과 IP 주소를 짝지어 적어 둔 표(화면 위쪽의 "등록된 것")를 가지고, 이름을 IP 주소로 바꿔 주는 컴퓨터입니다. 이 질문은 서버에 연결하기 전에 먼저 나갑니다.', '');
      // 3단계: DNS 서버의 답
      if (dest) {
        st.rep = 'good'; st.dn = 'good'; st.cl = 'plain'; st.ans = dest; st.clt = ['받은 IP 주소', dest];
        push('DNS 서버가 표에서 shop.example을 찾아 답합니다. shop.example의 IP 주소는 ' + dest + '입니다.' + (c.reg === 'two' ? ' 이 표에는 shop.example이 127.0.0.2로 등록돼 있습니다. 127.0.0.2는 127.0.0.1과 다른 컴퓨터의 주소입니다.' : '') + ' 클라이언트는 이제 어디로 연결할지 압니다.', 'good');
        // 4단계: 연결
        st.go = who; st.ip = dest; st.dn = 'plain'; st.cl = 'hot'; st[who] = 'hot'; st.clt = [dest + '의', '8080번에 연결'];
        push('클라이언트가 답으로 받은 IP 주소 ' + dest + '의 8080번 포트로 연결해 GET / 요청을 보냅니다. ' + port + ' 주소에 적은 이름 shop.example은 연결에 쓰이지 않고, 연결하는 곳은 DNS가 알려 준 IP 주소입니다.', '');
        // 5단계: 서버의 응답
        st.back = true; st[who] = 'good'; st[who + 't'] = ['요청을 받음: 200 응답']; st.resp = '200 ' + body;
        push('IP 주소 ' + dest + '의 컴퓨터에서 떠 있던 서버가 요청을 받아 200 응답을 돌려줍니다. 본문은 "' + body + '"입니다. DNS 서버는 이 연결에 끼어들지 않았습니다.', 'good');
        st.cl = 'good'; st.clt = ['200 응답을 받음'];
        push('클라이언트가 200 응답을 받습니다. 본문은 "' + body + '"입니다.', 'good');
        if (c.reg === 'one') {
          sum.push('DNS는 이름을 IP 주소로 바꿔 주는 서비스입니다. 이름으로 접속하는 클라이언트는 연결하기 전에 먼저 DNS 서버에 shop.example의 IP 주소를 묻고, 답으로 받은 127.0.0.1로 연결했습니다.');
          sum.push('서버에 연결하는 것은 이름이 아니라 IP 주소입니다. 이름은 사람이 쓰기 위한 것이고, 연결 직전에 DNS를 거쳐 IP 주소로 바뀝니다.');
        } else {
          sum.push('같은 이름 shop.example을 127.0.0.2로 등록해 두면 DNS 서버가 127.0.0.2라고 답해서, 클라이언트는 다른 컴퓨터(둘째 컴퓨터)에 닿았습니다. 주소에 적은 글은 한 글자도 바뀌지 않았습니다.');
          sum.push('이름이 어느 컴퓨터를 가리키는지는 DNS 서버의 표가 정합니다. 표의 IP 주소만 바꾸면 같은 이름으로 다른 컴퓨터에 접속합니다.');
        }
      } else {
        st.rep = 'bad'; st.cl = 'bad'; st.ans = '그런 이름 없음'; st.clt = ['IP 주소를', '얻지 못함'];
        push('DNS 서버가 표에서 shop.example을 찾아보지만, 표에 등록된 이름이 하나도 없습니다. 그래서 그런 이름은 없다고 답합니다. 클라이언트는 IP 주소를 얻지 못했습니다.', 'bad');
        st.c1t = ['요청을 받지 못함']; st.c2t = ['요청을 받지 못함']; st.clt = ['연결을 시작', '하지 못함'];
        push('클라이언트는 어디로 연결할지 몰라서 연결을 시작하지 못하고, 여기서 끝납니다. 두 컴퓨터의 서버는 멀쩡히 떠 있지만 요청을 받지도 못했습니다. 막힌 곳은 서버가 아니라 이름을 IP 주소로 바꾸는 단계입니다.', 'bad');
        st.resp = '접속하지 못함: 이름의 주소를 알 수 없음';
        push('클라이언트가 접속하지 못했다는 결과를 냅니다: 이름의 주소를 알 수 없음.', 'bad');
        sum.push('shop.example이 DNS에 등록돼 있지 않으면 DNS 서버가 그런 이름은 없다고 답하고, 클라이언트는 IP 주소를 얻지 못해 연결을 시작하지도 못합니다.');
        sum.push('서버가 멀쩡히 떠 있어도 마찬가지입니다. 이름으로 접속할 때는 DNS에서 IP 주소를 얻는 것이 첫 단계이고, 거기서 막히면 서버까지 가지 못합니다.');
      }
    } else {
      st.dn = 'ghost';
      var regNote = { one: ' DNS 서버에 shop.example이 등록돼 있지만, 이 주소에는 shop.example이 없으므로 쓰이지 않습니다.', two: ' DNS 서버에 shop.example이 127.0.0.2로 등록돼 있지만, 이 주소에는 shop.example이 없으므로 쓰이지 않습니다.', none: ' DNS 서버에 등록된 이름이 하나도 없어도 상관없습니다.' }[c.reg];
      push('클라이언트가 접속하려는 주소 http://127.0.0.1:8080/ 에서 호스트 부분을 봅니다. 호스트는 어느 컴퓨터에 접속할지를 적은 칸으로, 여기서는 127.0.0.1입니다. 이것은 이름이 아니라 IP 주소입니다. IP 주소는 바로 연결에 쓸 수 있으므로 클라이언트는 DNS 서버에 묻지 않습니다.' + regNote, '');
      st.go = 'c1'; st.ip = '127.0.0.1'; st.c1 = 'hot'; st.clt = ['127.0.0.1의', '8080번에 연결'];
      push('클라이언트가 127.0.0.1의 8080번 포트로 연결해 GET / 요청을 보냅니다. ' + port, '');
      st.back = true; st.c1 = 'good'; st.c1t = ['요청을 받음: 200 응답']; st.resp = '200 ' + body;
      push('IP 주소 127.0.0.1의 컴퓨터에서 떠 있던 서버가 요청을 받아 200 응답을 돌려줍니다. 본문은 "' + body + '"입니다.', 'good');
      st.cl = 'good'; st.clt = ['200 응답을 받음'];
      push('클라이언트가 200 응답을 받습니다. 본문은 "' + body + '"입니다. DNS 서버에는 한 번도 묻지 않았습니다.', 'good');
      sum.push('주소 칸에 이름 대신 IP 주소를 직접 적으면 클라이언트는 DNS 서버에 묻지 않고, 그 IP 주소로 바로 연결합니다.');
      sum.push({ one: 'DNS 서버에 shop.example이 등록돼 있어도 쓰이지 않았습니다. DNS가 끼어드는 것은 주소에 이름을 적었을 때뿐입니다.', two: 'DNS 서버에 shop.example이 127.0.0.2로 등록돼 있었지만 쓰이지 않아서, 127.0.0.1의 첫째 컴퓨터에 연결됐습니다. 주소에 이름이 아닌 IP 주소를 적었기 때문입니다.', none: 'DNS에 등록된 이름이 하나도 없어도 연결됐습니다. DNS는 이름을 IP 주소로 바꿀 때만 필요합니다.' }[c.reg]);
    }
    return { events: ev, summary: sum, row: [st.asked + '번', st.ans || '(묻지 않음)', st.ip || '(연결하지 않음)', st.resp] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, host = sim.c.target === 'name' ? 'shop.example' : '127.0.0.1';
    if (!s) { H.text(v, '실행을 누르면 클라이언트가 주소에서 호스트 부분을 보는 것부터 시작합니다.'); return; }
    var ok = s.resp.indexOf('200') === 0;
    H.table(v, ['항목', '값'], [
      { cls: '', cells: ['접속하려는 호스트', host] },
      { cls: '', cells: ['DNS 서버에 물은 횟수', s.asked + '번'] },
      { cls: s.ans || s.dn === 'ghost' ? '' : 'gone', cells: ['DNS 서버의 답', s.ans ? { v: s.ans, cls: s.rep === 'bad' ? 'bad' : 'good' } : (sim.c.target === 'ip' ? '(묻지 않음)' : '아직')] },
      { cls: s.ip ? '' : 'gone', cells: ['연결한 IP 주소', s.ip || '아직'] },
      { cls: s.resp ? '' : 'gone', cells: ['응답', s.resp ? { v: s.resp, cls: ok ? 'good' : 'bad' } : '아직'] },
    ], '진행');
  },
  // 그림: 왼쪽에 클라이언트, 가운데 위에 DNS 서버(이름 → IP 주소 표), 오른쪽에 서버가 떠 있는 컴퓨터 둘(127.0.0.1, 127.0.0.2). 이름이면 DNS 서버로 질문과 답이 오가고 답으로 받은 컴퓨터로 연결하며, IP 주소를 직접 적으면 DNS 서버로 가는 화살표가 없다. 이름이 없다는 답이면 연결 화살표가 생기지 않는다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var table = c.reg === 'none' ? '(등록된 이름 없음)' : 'shop.example → ' + { one: '127.0.0.1', two: '127.0.0.2' }[c.reg];
    P.size(680, 332);
    P.box('cl', 14, 116, 130, 72, { cls: s ? s.cl : 'plain', title: '클라이언트', sub: s ? s.clt : ['대기'] });
    P.box('dn', 215, 14, 240, 72, { cls: s ? s.dn : 'plain', title: 'DNS 서버', sub: ['이름 → IP 주소 표', table] });
    P.box('c1', 510, 100, 156, 62, { cls: s ? s.c1 : 'plain', title: '컴퓨터 127.0.0.1', sub: s ? s.c1t : ['서버가 떠 있음'] });
    P.box('c2', 510, 190, 156, 62, { cls: s ? s.c2 : 'plain', title: '컴퓨터 127.0.0.2', sub: s ? s.c2t : ['서버가 떠 있음'] });
    if (s && s.ask) P.arrow('ask', 'cl:t:0.3', 'dn:l:0.35', { cls: 'hot' });
    if (s && s.rep) P.arrow('rep', 'dn:l:0.8', 'cl:t:0.75', { cls: s.rep });
    if (s && s.go) P.arrow('go', 'cl:r:0.4', s.go + ':l:0.5', { cls: 'hot' });
    if (s && s.back) P.arrow('back', s.go + ':l:0.8', 'cl:r:0.85', { cls: 'good' });
    P.box('n1', 14, 282, 322, 36, { cls: s && s.asked ? 'wait' : 'ghost', title: 'DNS 서버에 물은 횟수', right: (s ? s.asked : 0) + '번' });
    P.box('n2', 344, 282, 322, 36, { cls: s && s.resp ? (s.resp.indexOf('200') === 0 ? 'good' : 'bad') : 'ghost', title: '응답', right: s && s.resp ? s.resp.split(' ')[0] === '200' ? '200' : '접속 못함' : '아직' });
  },
  assume: '여섯 가지 조합을 모두 이 PC의 127.0.0.x 주소 안에서만 실제로 실행해 대조했습니다. 외부 네트워크와 이 PC의 실제 DNS 설정에는 묻지 않았습니다. DNS 서버는 Node.js 24.18.0의 dgram으로 127.0.0.1의 빈 UDP 포트에 띄운 작은 서버입니다. 메시지는 RFC 1035 4.1절의 형식(머리 12바이트, 질문, 답)대로 직접 만들었고, 등록표에 있는 이름의 A 질의에는 그 IP 주소를 답하고 없는 이름에는 RCODE 3(Name Error, 4.1.1절)을 답합니다. 클라이언트는 화면의 두 구역 글자를 그대로 읽어, 주소의 호스트가 net.isIP로 IP 주소가 아니면 dns.Resolver에 setServers로 위 서버만 지정해 resolve4로 묻고 받은 IP 주소로 HTTP 요청을 보냈으며, IP 주소이면 Resolver를 부르지 않고 바로 보냈습니다. 화면의 \"이름이면 먼저 묻고, IP 주소면 묻지 않는다\"는 흐름은 이 Probe의 흐름과 같게 만든 것입니다. 운영체제의 이름 풀이 순서, hosts 파일, 브라우저와 운영체제의 캐시, 재귀 리졸버는 다루지 않았고, 실제 브라우저가 이 Probe와 같은 순서로 일하는지는 확인하지 않았습니다. 그 세부는 \"세부 동작 실습: DNS\"에서 다룹니다. 서버로는 HTTP 서버 둘을 같은 포트 번호의 127.0.0.1과 127.0.0.2에 띄웠습니다. 화면의 8080은 예시 번호이고 실제로는 빈 포트를 썼으며, 127.0.0.2는 \"다른 컴퓨터\"를 흉내 낸 것으로 실제로는 같은 PC의 다른 루프백 주소입니다. 이 PC(Windows)에서는 127.0.0.2에 바로 묶였습니다. 대조한 것은 DNS 서버가 받은 질의의 수와 종류, 이름 없음 답의 RCODE, 클라이언트가 받은 답, 서버가 받은 연결의 목적지 IP 주소, 응답의 상태와 본문, 이름 있는 조합에서는 질의가 연결보다 먼저라는 순서, 이름이 없다는 답일 때 두 서버가 연결도 요청도 받지 않았다는 것입니다. \"DNS 서버에 물은 횟수\"는 DNS 서버가 받은 A 질의의 수입니다. 이 Resolver는 A 말고 다른 종류의 질의를 보내지 않았고, 이름 없음 답을 받은 뒤에도 다시 묻지 않아서 질의 수와 A 질의 수가 같았습니다. 이것은 이 Node.js 버전의 기본 설정에서 관찰한 것입니다. 이름 없음 답을 Node.js가 ENOTFOUND 오류로 알려 주는 것도 관찰한 동작입니다. DNS 서버는 독립된 구현이 아니라 이 실습을 위해 만든 것이고, 그 답을 읽은 것은 Node.js의 dns.Resolver(c-ares)이므로 DNS 메시지를 독립된 구현이 읽어 보았다는 점에서만 외부와 대조한 셈이며 실제로 운영되는 DNS 서버와 대조한 것은 아닙니다. 문서로 확인한 것은 RFC 1034의 5.2.1절(호스트 이름을 호스트 주소로 바꾸는 요청은 A 레코드를 묻는 것이 되고, 이름이 없으면 name error가 돌아온다), 3.6절(리소스 레코드), 4.3.1절(이름이 존재하지 않는다는 응답), RFC 1035의 3.4.1절(A 레코드는 32비트 인터넷 주소), 4.1절과 4.1.1절(메시지 형식, RCODE 3 Name Error)과 RFC 6761의 6.5절(.example로 끝나는 이름은 문서용으로 예약돼 등록되지 않는다)입니다. 같은 이름에 IP 주소를 여럿 등록하거나 AAAA 레코드를 쓰는 경우는 다루지 않았고, 화면의 서버 코드는 보이지 않습니다.',
});
