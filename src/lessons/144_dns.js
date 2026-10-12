Lab.register({
  id: 'dns', nav: 'DNS', cat: '네트워크', mode: 'step',
  title: '도메인 이름의 주소는 누가 알고 있고, 바꾸면 언제 반영될까',
  intro: '컴퓨터는 shop.example 같은 이름으로는 접속할 수 없고 IP 주소가 있어야 합니다. 이름을 주소로 바꿔 주는 것이 DNS입니다. 답을 아는 서버는 한 곳이 아니라 여러 단계로 나뉘어 있고, 한 번 받은 답은 정해진 시간(TTL) 동안 캐시에 남아 다시 묻지 않습니다.',
  terms: ['DNS', 'DNS 레코드', '재귀 리졸버와 권한 있는 네임 서버', 'DNS 캐시와 TTL'],
  controls: [
    { id: 'q', label: '묻는 것', type: 'select', value: 'a', options: [['a', 'shop.example의 IPv4 주소 (A)'], ['aaaa', 'shop.example의 IPv6 주소 (AAAA)'], ['cname', 'www.shop.example의 주소 (CNAME을 거침)'], ['mx', 'shop.example의 메일 서버 (MX)']] },
    { id: 'cache', label: '캐시의 상태', type: 'select', value: 'none', options: [['none', '어디에도 없다 (처음 묻는 이름)'], ['resolver', '리졸버의 캐시에 있다 (다른 사용자가 120초 전에 물음)'], ['os', '이 PC의 캐시에 있다 (120초 전에 물음)'], ['expired', '이 PC가 400초 전에 물었다 (TTL 300초가 지남)']] },
    { id: 'changed', label: '관리자가 조금 전에 레코드의 값을 바꿨다', type: 'check', value: false, hint: '권한 있는 네임 서버의 값만 바뀝니다. 캐시에 이미 들어 있는 답은 그대로입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: '캐시가 어디에도 없는 처음 묻는 이름 shop.example의 IPv4 주소를 물으면 PC는 어떤 경로로 답을 얻나', d: '처음 묻는 이름. 리졸버가 루트 서버부터 차례로 물어 답을 찾습니다.', v: { q: 'a', cache: 'none', changed: false } },
    { t: '방금 물었던 이름', q: '이 PC의 캐시에 120초 전에 물은 답이 있으면', d: '이 PC의 캐시에 답이 있어 아무에게도 묻지 않습니다.', v: { q: 'a', cache: 'os', changed: false } },
    { t: '레코드를 바꿨는데 예전 주소로 간다', q: '리졸버의 캐시에 다른 사용자가 120초 전에 물은 답이 있는데 관리자가 레코드의 값을 조금 전에 바꾸면', d: '리졸버의 캐시에 TTL이 남아 있어 예전 값을 받습니다.', v: { q: 'a', cache: 'resolver', changed: true } },
    { t: 'TTL이 지난 뒤', q: '이 PC가 400초 전에 물어 TTL 300초가 지났는데 관리자가 레코드의 값을 조금 전에 바꾸면', d: '다시 묻고 새 값을 받습니다. 루트 서버부터 묻지는 않습니다.', v: { q: 'a', cache: 'expired', changed: true } },
    { t: 'CNAME을 거치는 이름', q: 'CNAME을 거치는 www.shop.example의 주소를 물으면', d: '별명의 진짜 이름을 알아낸 뒤 그 이름으로 한 번 더 찾습니다.', v: { q: 'cname', cache: 'none', changed: false } },
    { t: '메일 서버 찾기', q: 'MX 레코드로 shop.example의 메일 서버를 물으면', d: 'MX 레코드는 주소가 아니라 메일 서버의 이름을 알려 줍니다.', v: { q: 'mx', cache: 'none', changed: false } },
  ],
  CASES: {
    a: { name: 'shop.example', type: 'A', old: '203.0.113.10', neu: '203.0.113.99' },
    aaaa: { name: 'shop.example', type: 'AAAA', old: '2001:db8::10', neu: '2001:db8::99' },
    cname: { name: 'www.shop.example', type: 'A', alias: 'shop.cdn.example', old: '203.0.113.80', neu: '203.0.113.81' },
    mx: { name: 'shop.example', type: 'MX', old: '10 mail.shop.example', neu: '10 mail2.shop.example' },
  },
  code: function (c) {
    var C = this.CASES, K = C[c.q];
    var ch = function (q) { return c.changed && c.q === q ? '   ; 조금 전에 바꿈 (전에는 ' + C[q].old + ')' : ''; }, v = function (q) { return c.changed && c.q === q ? C[q].neu : C[q].old; };
    var call = c.q === 'aaaa' ? 'resolve6(\'shop.example\', { ttl: true })' : c.q === 'mx' ? 'resolveMx(\'shop.example\')' : 'resolve4(\'' + K.name + '\', { ttl: true })';
    return '; shop.example의 권한 있는 네임 서버가 가진 레코드 (이름, TTL, 종류, 값)\nshop.example.        300  IN  A      ' + v('a') + ch('a') + '\nshop.example.        300  IN  AAAA   ' + v('aaaa') + ch('aaaa') + '\nshop.example.        300  IN  MX     ' + v('mx') + '.' + ch('mx') + '\nwww.shop.example.    300  IN  CNAME  shop.cdn.example.\n\n; cdn.example의 권한 있는 네임 서버가 가진 레코드\nshop.cdn.example.    300  IN  A      ' + v('cname') + ch('cname') + '\n\n// 묻는 쪽 (Node.js, 파일 이름은 ask.mjs). 네트워크 설정에 있는 재귀 리졸버에게 묻고 답을 받는다\nimport { Resolver } from \'node:dns/promises\';\nconsole.log(await new Resolver().' + call + ');';
  },
  label: function (c) { return { a: 'A', aaaa: 'AAAA', cname: 'CNAME을 거치는 A', mx: 'MX' }[c.q] + ' · ' + { none: '캐시 없음', resolver: '리졸버의 캐시', os: 'PC의 캐시', expired: 'TTL 지남' }[c.cache] + (c.changed ? ' · 레코드를 바꿈' : ''); },
  columns: ['받은 답', '답이 나온 곳', 'PC가 리졸버에 물은 횟수', '리졸버가 네임 서버에 물은 횟수', '바꾼 값이 반영됐나'],
  simulate: function (c) {
    var K = this.CASES[c.q], cn = c.q === 'cname', TTL = 300, AGO = 120, LEFT = TTL - AGO, OLD = 400, NS = 172800, ev = [], sum = [];
    var st = { msgs: [], pc: [], rs: [], pcq: 0, upq: 0, ans: '', src: '' };
    function push(s, kind) { ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function msg(f, t, s, cls) { st.msgs.push({ f: f, t: t, s: s, cls: cls || '' }); }
    var cached = c.cache === 'os' || c.cache === 'resolver', val = c.changed && !cached ? K.neu : K.old, show = function (v) { return cn ? K.alias + ' → ' + v : v; };
    var answer = show(val), ask = K.name + ' ' + K.type + ' ?', path = [];
    // 캐시에 들어 있는 레코드를 표의 줄로 만든다
    function recs(v, ttl) { return cn ? [[K.name, 'CNAME', K.alias, ttl], [K.alias, 'A', v, ttl]] : [[K.name, K.type, v, ttl]]; }
    function deleg(left) { var d = [['example', 'NS', '.example 서버', left + '초'], ['shop.example', 'NS', 'shop.example의 네임 서버', left + '초']]; if (cn) d.push(['cdn.example', 'NS', 'cdn.example의 네임 서버', left + '초']); return d; }
    var need = { a: '브라우저가 shop.example에 접속하려면 IP 주소가 필요합니다. 찾을 것은 shop.example의 A 레코드(IPv4 주소)입니다.', aaaa: '브라우저가 shop.example에 IPv6로 접속하려면 IPv6 주소가 필요합니다. 찾을 것은 shop.example의 AAAA 레코드(IPv6 주소)입니다.', cname: '브라우저가 www.shop.example에 접속하려면 IP 주소가 필요합니다. 찾을 것은 www.shop.example의 A 레코드(IPv4 주소)입니다.', mx: 'shop.example 앞으로 메일을 보내려면 그 도메인의 메일을 받는 서버가 어디인지 알아야 합니다. 찾을 것은 shop.example의 MX 레코드입니다.' }[c.q];
    var chg = { a: 'A 레코드의 주소를 ' + K.neu, aaaa: 'AAAA 레코드의 주소를 ' + K.neu, cname: '진짜 이름(' + K.alias + ') 쪽 A 레코드의 주소를 ' + K.neu, mx: 'MX 레코드의 메일 서버를 ' + K.neu.slice(3) }[c.q] + '로 바꿨습니다';
    // 시작할 때의 캐시
    if (c.cache === 'os') { st.pc = recs(K.old, LEFT + '초'); st.rs = recs(K.old, LEFT + '초').concat(deleg(NS - AGO)); }
    if (c.cache === 'resolver') st.rs = recs(K.old, LEFT + '초').concat(deleg(NS - AGO));
    if (c.cache === 'expired') { st.pc = recs(K.old, 'TTL 지남'); st.rs = recs(K.old, 'TTL 지남').concat(deleg(NS - OLD)); }
    // 1. PC의 캐시
    if (c.cache === 'os') {
      msg('pc', '', '캐시에 있음 (' + LEFT + '초 남음)', 'good'); st.ans = show(K.old); st.src = 'PC의 캐시';
      push(need + ' 먼저 이 PC의 캐시(운영체제와 브라우저가 전에 받은 답을 기억해 둔 곳)를 봅니다. ' + AGO + '초 전에 같은 것을 물어 받은 답이 있고, TTL ' + TTL + '초 가운데 ' + LEFT + '초가 남았습니다. 캐시의 답을 그대로 씁니다. 네트워크로는 아무 질문도 나가지 않습니다.', 'good');
      if (c.changed) push('그런데 관리자가 조금 전에 ' + chg + '. 바뀐 것은 권한 있는 네임 서버가 가진 값뿐이고, 이 PC는 그 사실을 알 방법이 없습니다. 캐시의 TTL이 끝나는 ' + LEFT + '초 뒤에야 다시 묻고 새 값을 받습니다.', 'bad');
    } else {
      if (c.cache === 'expired') { msg('pc', '', '캐시의 답은 TTL이 지남'); st.pc = []; push(need + ' 먼저 이 PC의 캐시를 봅니다. 전에 받은 답이 있었지만 ' + OLD + '초 전의 것이라 TTL ' + TTL + '초가 지났습니다. TTL이 지난 답은 쓰지 않고 버립니다.'); }
      else { msg('pc', '', '캐시에 없음'); push(need + ' 먼저 이 PC의 캐시(운영체제와 브라우저가 전에 받은 답을 기억해 둔 곳)를 봅니다. ' + (c.cache === 'none' ? '처음 묻는 이름이라 없습니다.' : '이 PC는 물은 적이 없어 캐시에 없습니다.')); }
      // 2. 재귀 리졸버
      msg('pc', 'rs', ask); st.pcq = 1;
      var intro2 = '이 PC가 재귀 리졸버에게 묻습니다. 재귀 리졸버는 답을 대신 찾아다 주는 DNS 서버로, 보통 통신사나 회사가 운영하며 그 주소는 네트워크 설정에 들어 있습니다. 리졸버도 먼저 자기 캐시를 봅니다. ';
      if (c.cache === 'resolver') {
        msg('rs', '', '캐시에 있음 (' + LEFT + '초 남음)', 'good');
        push(intro2 + '다른 사용자가 ' + AGO + '초 전에 같은 것을 물었기 때문에 답이 있고, TTL이 ' + LEFT + '초 남았습니다.', 'good');
        msg('rs', 'pc', '답: ' + K.old + (K.type === 'MX' ? '' : ' (TTL ' + LEFT + ')'), 'good'); st.pc = recs(K.old, LEFT + '초'); st.ans = show(K.old); st.src = '리졸버의 캐시';
        push('리졸버가 루트 서버나 권한 있는 네임 서버에 묻지 않고 캐시의 답을 바로 돌려줍니다. 답에 적힌 TTL은 처음의 ' + TTL + '초가 아니라 남은 ' + LEFT + '초입니다. 이 PC도 그 ' + LEFT + '초 동안만 답을 기억합니다.', 'good');
        if (c.changed) push('그런데 관리자가 조금 전에 ' + chg + '. 리졸버는 캐시의 TTL이 남아 있는 동안 권한 있는 네임 서버에 다시 묻지 않으므로, 이 리졸버를 쓰는 사용자는 모두 남은 ' + LEFT + '초 동안 예전 값을 받습니다.', 'bad');
      } else {
        var chNote = c.changed ? ' 관리자가 조금 전에 바꾼 새 값입니다.' : '';
        if (c.cache === 'none') {
          msg('rs', '', '캐시에 없음');
          push(intro2 + '없습니다. 리졸버가 처음부터 알고 있는 것은 루트 서버의 주소뿐입니다.');
          msg('rs', 'root', ask); msg('root', 'rs', '위임: .example 서버로'); st.upq++; path.push('루트'); st.rs.push(['example', 'NS', '.example 서버', NS + '초']);
          push('리졸버 → 루트 서버: 리졸버가 같은 질문을 루트 서버에 보냅니다. 루트 서버는 답을 가지고 있지 않습니다. 대신 이름의 맨 끝(.example)을 보고, .example로 끝나는 이름을 맡은 서버(TLD 서버)의 주소를 알려 줍니다. 이렇게 아래 서버에 맡겨 둔 것을 위임이라고 합니다.');
          msg('rs', 'tld', ask); msg('tld', 'rs', '위임: shop.example 서버로'); st.upq++; path.push('.example'); st.rs.push(['shop.example', 'NS', 'shop.example의 네임 서버', NS + '초']);
          push('리졸버 → .example 서버: 같은 질문을 다시 보냅니다. 이 서버도 답은 가지고 있지 않고, shop.example을 맡은 네임 서버의 주소를 알려 줍니다.');
        } else {
          msg('rs', '', '답은 TTL 지남, 위임 정보는 있음'); st.rs = deleg(NS - OLD);
          push(intro2 + '답은 TTL이 지나 지워졌습니다. 하지만 "shop.example은 어느 네임 서버가 맡는가" 하는 위임 정보는 TTL이 훨씬 길어서(이 예에서는 ' + NS + '초, 이틀) 아직 기억하고 있습니다.');
        }
        var skip = c.cache === 'expired' ? ' 위임 정보가 캐시에 있으므로 루트 서버와 .example 서버를 건너뛰고 바로 묻습니다.' : '';
        st.upq++; path.push('shop.example'); msg('rs', 'shop', ask);
        if (!cn) {
          msg('shop', 'rs', '답: ' + (K.type === 'MX' ? 'MX ' + val : K.type + ' ' + val + ' (TTL ' + TTL + ')'), 'good'); st.rs = recs(val, TTL + '초').concat(st.rs);
          push('리졸버 → shop.example의 권한 있는 네임 서버: 이 도메인의 레코드 원본을 가진 서버입니다.' + skip + ' 답을 줍니다: ' + K.name + ' ' + K.type + ' ' + val + ', TTL ' + TTL + '초.' + chNote, 'good');
        } else {
          msg('shop', 'rs', 'CNAME ' + K.alias); st.rs = [[K.name, 'CNAME', K.alias, TTL + '초']].concat(st.rs);
          push('리졸버 → shop.example의 권한 있는 네임 서버: 이 도메인의 레코드 원본을 가진 서버입니다.' + skip + ' A 레코드를 물었는데 CNAME 레코드가 왔습니다: ' + K.name + ' CNAME ' + K.alias + ', TTL ' + TTL + '초. ' + K.name + '은 별명이고 진짜 이름은 ' + K.alias + '이라는 뜻입니다. 주소는 아직 모릅니다.');
          if (c.cache === 'none') {
            msg('rs', 'tld', K.alias + ' A ?'); msg('tld', 'rs', '위임: cdn.example 서버로'); st.upq++; path.push('.example'); st.rs.push(['cdn.example', 'NS', 'cdn.example의 네임 서버', NS + '초']);
            push('리졸버가 진짜 이름(' + K.alias + ')으로 다시 찾습니다. .example을 맡은 서버는 조금 전에 알아 두었으므로 루트 서버는 건너뛰고 .example 서버에 묻습니다. cdn.example을 맡은 네임 서버의 주소를 받습니다.');
          }
          msg('rs', 'cdn', K.alias + ' A ?'); msg('cdn', 'rs', '답: A ' + val + ' (TTL ' + TTL + ')', 'good'); st.upq++; path.push('cdn.example'); st.rs = [st.rs[0], [K.alias, 'A', val, TTL + '초']].concat(st.rs.slice(1));
          push('리졸버 → cdn.example의 권한 있는 네임 서버: ' + (c.cache === 'expired' ? '진짜 이름(' + K.alias + ')으로 다시 찾습니다. cdn.example의 위임 정보도 캐시에 있으므로 바로 묻습니다. ' : '') + '답을 줍니다: ' + K.alias + ' A ' + val + ', TTL ' + TTL + '초.' + chNote, 'good');
        }
        msg('rs', 'pc', '답: ' + val + (K.type === 'MX' ? '' : ' (TTL ' + TTL + ')'), 'good'); st.pc = recs(val, TTL + '초'); st.ans = answer; st.src = '권한 있는 네임 서버';
        push('리졸버가 받은 레코드를 자기 캐시에 넣고 이 PC에 답을 돌려줍니다. 앞으로 ' + TTL + '초 동안은 누가 같은 것을 물어도 캐시에서 답합니다.' + (c.cache === 'none' ? ' 오는 길에 알게 된 위임 정보도 함께 기억해 둡니다.' : '') + ' 이 PC도 받은 답을 TTL 동안 캐시에 넣어 둡니다.' + (c.changed ? ' 어느 캐시에도 예전 값이 남아 있지 않았기 때문에 새 값이 바로 반영됐습니다.' : ''), 'good');
      }
    }
    var stale = c.changed && cached;
    push(c.q === 'mx' ? '메일을 ' + st.ans.slice(3) + ' 서버로 보냅니다. 이 이름의 IP 주소는 A 레코드로 한 번 더 찾습니다(네임 서버가 MX 답에 함께 실어 주기도 합니다).' + (stale ? ' 관리자가 바꾸기 전의 예전 서버입니다.' : '') : '브라우저는 받은 주소(' + (cn ? val : st.ans) + ')로 접속합니다.' + (stale ? ' 관리자가 바꾸기 전의 예전 주소입니다.' : ''), stale ? 'bad' : 'good');
    var reflected = !c.changed ? '바꾸지 않음' : cached ? '아직 예전 값' : '반영됨 (새 값)';
    if (c.cache === 'none') sum.push('어느 서버도 모든 이름의 답을 가지고 있지 않습니다. 루트 서버는 맨 끝 부분(.example, .com, .kr)을 맡은 서버를, 그 서버는 각 도메인을 맡은 네임 서버를 알려 주고, 답은 그 도메인의 권한 있는 네임 서버만 가지고 있습니다. 이 PC는 리졸버 하나에게만 묻고, 차례로 묻는 일은 리졸버가 대신합니다.');
    if (cached) sum.push('한 번 받은 답은 TTL 동안 캐시에 남아, 그동안은 다시 묻지 않습니다. 캐시는 PC에도 있고 리졸버에도 있습니다. 덕분에 대부분의 조회는 루트 서버까지 가지 않고 끝납니다.');
    if (c.cache === 'expired') sum.push('TTL이 지나면 다시 묻습니다. 그래도 루트 서버부터 다시 가는 것은 아닙니다. 어느 네임 서버가 그 도메인을 맡는지는 따로, 더 긴 TTL로 기억하고 있기 때문입니다.');
    if (stale) sum.push('레코드를 바꿔도 이미 캐시에 들어간 답은 TTL이 끝날 때까지 그대로 쓰입니다. 그래서 사용자마다 새 값을 받는 시점이 다르고, 늦으면 바꾸기 전의 TTL만큼 걸립니다. 서버를 옮길 계획이 있으면 미리 TTL을 짧게 줄여 두고, 옮긴 뒤에도 예전 서버를 한동안 켜 둡니다.');
    if (c.changed && !cached) sum.push('이번에는 어느 캐시에도 예전 값이 없어서 새 값을 바로 받았습니다.');
    sum.push({ a: 'A 레코드는 이름에 IPv4 주소를 연결합니다. 가장 기본이 되는 레코드입니다.', aaaa: 'AAAA 레코드는 이름에 IPv6 주소를 연결합니다. IPv6 주소는 128비트로 IPv4 주소(32비트)의 네 배 길이이고, 레코드의 이름도 A를 네 번 쓴 AAAA입니다. 한 이름에 A와 AAAA를 둘 다 둘 수 있습니다.', cname: 'CNAME 레코드는 이름을 주소가 아닌 다른 이름에 연결합니다. 진짜 이름을 가진 쪽(CDN이나 호스팅 회사)이 서버 주소를 바꿔도 내 레코드는 고칠 필요가 없습니다. 대신 진짜 이름으로 한 번 더 찾아야 합니다.', mx: 'MX 레코드는 그 도메인 앞으로 온 메일을 받는 서버의 이름을 알려 줍니다. 앞의 숫자는 우선순위이고, 여러 개가 있으면 숫자가 작은 서버부터 시도합니다.' }[c.q]);
    return { events: ev, summary: sum, answer: answer, path: path, cn: cn, row: [answer, st.src, st.pcq + '번', st.upq + '번' + (path.length ? ' (' + path.join(' → ') + ')' : ''), reflected] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], pc: [], rs: [], pcq: 0, upq: 0, ans: '', src: '' }, c = sim.c;
    if (!last) H.text(v, '실행을 누르면 이 PC의 캐시부터 차례로 찾아봅니다.');
    var ln = H.lanes(v);
    H.lane(ln, '답이 나온 곳', s.src || '아직 없음', s.src ? (s.src === '권한 있는 네임 서버' ? 'good' : 'wait') : 'none');
    var rows = function (list) { return list.length ? list.map(function (r) { return { cls: r[3] === 'TTL 지남' ? 'gone' : '', cells: [r[0], r[1], r[2], r[3]] }; }) : [{ cells: ['(비어 있음)', '', '', ''] }]; };
    H.table(v, ['이름', '종류', '값', '남은 TTL'], rows(s.pc), '이 PC의 캐시');
    H.table(v, ['이름', '종류', '값', '남은 TTL'], rows(s.rs), '재귀 리졸버의 캐시 (NS는 "이 이름은 어느 서버가 맡는가"를 적은 위임 정보)');
    var kind = c.q === 'cname' ? 'CNAME' : this.CASES[c.q].type;
    H.table(v, ['종류', '이름에 연결하는 것', '예'], [['A', 'IPv4 주소', 'shop.example → 203.0.113.10'], ['AAAA', 'IPv6 주소', 'shop.example → 2001:db8::10'], ['CNAME', '다른 이름 (이 이름은 별명)', 'www.shop.example → shop.cdn.example'], ['MX', '메일을 받는 서버의 이름과 우선순위', 'shop.example → 10 mail.shop.example']].map(function (r) { return { cells: [{ v: r[0], cls: r[0] === kind ? 'hot' : '' }, r[1], r[2]] }; }), '레코드의 종류');
  },
  // 그림: PC, 재귀 리졸버, 루트 서버, .example 서버, 권한 있는 네임 서버를 나란히 놓고 그 사이를 오가는 질문과 답을 위에서 아래로 그린다. 캐시에서 답이 나오면 화살표가 거기서 끝난다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], pc: [], rs: [], pcq: 0, upq: 0, ans: '', src: '' };
    var actors = sim.cn ? [['pc', 'PC', 'wait'], ['rs', '리졸버', 'wait'], ['root', '루트'], ['tld', '.example'], ['shop', 'shop 권한'], ['cdn', 'cdn 권한']] : [['pc', 'PC', 'wait'], ['rs', '재귀 리졸버', 'wait'], ['root', '루트 서버'], ['tld', '.example 서버'], ['shop', '권한 서버']];
    var end = P.seq(actors, s.msgs.map(function (m) { return m.t ? { f: m.f, t: m.t, s: m.s, cls: m.cls } : { f: m.f, s: m.s, cls: m.cls }; }), { keep: 9 });
    P.box('cnt', 16, end + 14, 262, 34, { cls: 'plain', title: '보낸 질문', right: 'PC ' + s.pcq + '번 · 리졸버 ' + s.upq + '번' });
    P.box('ans', 286, end + 14, 378, 34, { cls: s.ans ? (sim.row[4] === '아직 예전 값' ? 'bad' : 'good') : 'ghost', title: '받은 답', right: s.ans || '아직 없음' });
    P.size(680, end + 64);
    P.note('화살표 하나가 질문이나 답 하나이고, 위에서 아래로 시간이 흐릅니다. 상자는 그 서버 안에서 캐시를 찾아본 결과입니다. 권한 서버는 그 도메인의 레코드 원본을 가진 권한 있는 네임 서버를 줄여 쓴 것입니다. 캐시에 답이 있으면 오른쪽 서버들까지 가지 않고 끝납니다.');
  },
  assume: '127.0.0.1에 루트 서버, .example 서버, 권한 있는 네임 서버 둘, 재귀 리졸버 역할을 하는 시험용 프로그램을 띄워 실제 DNS 메시지를 주고받게 하고, 서른두 가지 조합의 답, 질문 횟수, 묻는 순서, 바꾼 값이 반영되는지를 대조했습니다. 외부 DNS에는 묻지 않았습니다. 다만 이 시험용 네임 서버와 리졸버, PC 쪽 캐시는 표준의 절차(RFC 1034 4.3.2절 네임 서버의 응답, 5.3.3절 리졸버의 절차, RFC 1035 6.1.3절 캐시의 TTL)를 따라 이 실습을 위해 만든 것입니다. 그래서 "루트부터 차례로 묻는다", "TTL 동안 캐시의 답을 쓴다", "TTL이 지나도 위임 정보가 남아 있으면 권한 있는 네임 서버에 바로 묻는다"는 동작은 표준의 절차를 재현해 확인한 것이고, 실제로 운영되는 리졸버 제품이나 운영체제의 캐시와 대조한 것은 아닙니다. 독립된 구현으로 확인한 부분은 레코드의 내용입니다. 조합마다 같은 질문을 Node.js 24의 dns.Resolver(c-ares)로도 보내, 시험용 서버의 응답을 c-ares가 풀이한 A, AAAA, CNAME, MX의 값이 같은지 대조했습니다. Node.js의 dns.Resolver는 스스로 캐시하지 않고 매번 다시 묻는다는 것도 확인했습니다. 시간은 실제로 기다려 만들었습니다. 실행에서는 레코드의 TTL을 4초로 두고 1.2초 뒤(TTL이 남음)와 5.2초 뒤(TTL이 지남)에 다시 물었으며, 화면의 300초, 120초, 400초, 위임 정보의 172800초는 같은 상황을 흔히 보는 크기의 숫자로 적은 예입니다. 레코드의 뜻은 RFC 1035 3.3절과 3.4.1절(A, CNAME, MX), RFC 3596(AAAA), CNAME을 만나면 진짜 이름으로 다시 찾는 것은 RFC 1034 3.6.2절을 따랐습니다. 실제 리졸버는 여러 루트 서버와 네임 서버 가운데 하나를 고르고, 질문에 이름의 일부만 실어 보내거나(RFC 9156) 없다는 답도 캐시하는 등 더 많은 일을 합니다. 브라우저와 운영체제가 TTL을 그대로 지키지 않고 더 짧게 또는 더 길게 기억하는 경우도 있습니다. 주소는 모두 문서용으로 예약된 대역입니다.',
});
