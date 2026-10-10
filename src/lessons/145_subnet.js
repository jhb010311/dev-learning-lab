Lab.register({
  id: 'subnet', nav: 'IP 주소와 서브넷', cat: '네트워크', mode: 'step',
  title: '앞의 세 숫자가 같은 두 IP 주소는 같은 네트워크일까',
  intro: 'IP 주소는 "어느 네트워크인지"를 나타내는 앞부분과 "그 안의 어느 기기인지"를 나타내는 뒷부분으로 나뉩니다. 어디까지가 앞부분인지는 주소 뒤에 붙는 /24 같은 숫자가 정합니다. 컴퓨터는 이 숫자로 목적지가 같은 네트워크에 있는지 판단해, 직접 보낼지 게이트웨이(공유기나 라우터)에 맡길지를 정합니다.',
  terms: ['IP 주소(IPv4)', '서브넷 마스크와 CIDR', '네트워크 주소와 브로드캐스트 주소', '사설 IP 주소', 'NAT'],
  controls: [
    { id: 'ip', label: '내 PC의 IP 주소', type: 'select', value: '192.168.0.10', options: [['192.168.0.10', '192.168.0.10'], ['192.168.0.130', '192.168.0.130'], ['10.20.30.42', '10.20.30.42']] },
    { id: 'prefix', label: '네트워크 부분의 길이 (CIDR)', type: 'select', value: '25', options: [['16', '/16 (서브넷 마스크 255.255.0.0)'], ['23', '/23 (255.255.254.0)'], ['24', '/24 (255.255.255.0)'], ['25', '/25 (255.255.255.128)'], ['26', '/26 (255.255.255.192)'], ['30', '/30 (255.255.255.252)']], hint: '숫자가 클수록 네트워크 부분이 길어지고, 한 네트워크에 둘 수 있는 기기는 줄어듭니다.' },
    { id: 'dest', label: '데이터를 보낼 목적지', type: 'select', value: '192.168.0.200', options: [['192.168.0.200', '192.168.0.200'], ['192.168.1.5', '192.168.1.5'], ['10.20.31.7', '10.20.31.7'], ['203.0.113.7', '203.0.113.7 (인터넷에 있는 서버)']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '192.168.0.10/25에서 192.168.0.200으로. 앞의 세 숫자가 같은데도 다른 네트워크입니다.', v: { ip: '192.168.0.10', prefix: '25', dest: '192.168.0.200' } },
    { t: '/24로 바꾸면', d: '같은 두 주소가 이번에는 같은 네트워크가 되어 직접 보냅니다.', v: { ip: '192.168.0.10', prefix: '24', dest: '192.168.0.200' } },
    { t: '세 번째 숫자가 달라도 같은 네트워크', d: '/23이면 192.168.0.x와 192.168.1.x가 한 네트워크입니다.', v: { ip: '192.168.0.10', prefix: '23', dest: '192.168.1.5' } },
    { t: '인터넷의 서버로', d: '게이트웨이가 출발지 주소를 공인 주소로 바꿉니다 (NAT).', v: { ip: '192.168.0.10', prefix: '24', dest: '203.0.113.7' } },
    { t: '기기 두 대뿐인 네트워크', d: '/30은 호스트 부분이 2비트라 쓸 수 있는 주소가 2개입니다.', v: { ip: '192.168.0.130', prefix: '30', dest: '192.168.0.200' } },
    { t: '큰 네트워크 /16', d: '쓸 수 있는 주소가 65534개입니다.', v: { ip: '10.20.30.42', prefix: '16', dest: '10.20.31.7' } },
  ],
  code: function (c) {
    return '// 자바스크립트입니다. 브라우저 개발자 도구의 콘솔에 붙여 넣으면 실행됩니다.\nconst toNumber = ip => ip.split(\'.\').reduce((n, part) => n * 256 + Number(part), 0);   // 주소를 32비트 숫자로\nconst toText = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(\'.\');\n\nconst prefix = ' + c.prefix + ';\nconst mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;                 // 앞 ' + c.prefix + '비트만 1인 서브넷 마스크\nconst network = (toNumber(\'' + c.ip + '\') & mask) >>> 0;' + ' '.repeat(Math.max(1, 22 - c.ip.length)) + '// 호스트 부분을 모두 0으로\nconst broadcast = (network | ~mask) >>> 0;                        // 호스트 부분을 모두 1로\n\nconsole.log(toText(mask), toText(network), toText(broadcast));\nconsole.log(2 ** (32 - prefix) - 2);                              // 쓸 수 있는 호스트 수\n\n// 목적지에도 같은 마스크를 적용해 네트워크 주소가 같은지 본다\nconsole.log(((toNumber(\'' + c.dest + '\') & mask) >>> 0) === network);';
  },
  label: function (c) { return c.ip + '/' + c.prefix + ' → ' + c.dest; },
  columns: ['네트워크 주소', '브로드캐스트 주소', '쓸 수 있는 호스트 수', '목적지와 같은 네트워크인가', '보내는 방법'],
  // 주소 글자를 숫자로, 숫자를 주소 글자로
  num: function (ip) { var p = ip.split('.'); return (+p[0]) * 16777216 + (+p[1]) * 65536 + (+p[2]) * 256 + (+p[3]); },
  str: function (n) { return [Math.floor(n / 16777216), Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.'); },
  // 32비트를 0과 1의 배열로
  bits: function (n) { var a = [], i; for (i = 0; i < 32; i++) a.push(Math.floor(n / Math.pow(2, 31 - i)) % 2); return a; },
  // 2진수 글자. 8비트마다 점을 찍고, 네트워크 부분과 호스트 부분 사이에는 | 를 넣는다
  bin: function (n, p) { var b = this.bits(n), s = '', i; for (i = 0; i < 32; i++) { if (i === p) s += ' | '; else if (i && i % 8 === 0) s += '.'; s += b[i]; } return s; },
  // 사설 주소 대역(RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  isPrivate: function (ip) { var p = ip.split('.'), a = +p[0], b = +p[1]; return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); },
  calc: function (c) {
    var p = +c.prefix, size = Math.pow(2, 32 - p), me = this.num(c.ip), net = Math.floor(me / size) * size, dn = this.num(c.dest), dnet = Math.floor(dn / size) * size;
    return { p: p, h: 32 - p, size: size, me: me, mask: 4294967296 - size, net: net, bc: net + size - 1, hosts: size - 2, first: net + 1, last: net + size - 2, dn: dn, dnet: dnet, same: dnet === net, gw: net + 1, dpriv: this.isPrivate(c.dest) };
  },
  simulate: function (c) {
    var k = this.calc(c), S = this.str, ev = [], sum = [], st = { stage: 0 }, self = this;
    function push(s, kind) { st.stage++; ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var netS = S(k.net), bcS = S(k.bc), gwS = S(k.gw), dnetS = S(k.dnet), a3 = c.ip.split('.').slice(0, 3).join('.'), d3 = c.dest.split('.').slice(0, 3).join('.');
    var nat = !k.same && !k.dpriv, route = k.same ? '직접 전달' : nat ? '게이트웨이로 전달 + NAT' : '게이트웨이로 전달 (주소 변환 없음)';
    var pub = '198.51.100.7', other = k.hosts > 2 ? S(k.net + 2 === k.me ? k.net + 3 : k.net + 2) : '';
    push('내 PC의 주소는 ' + c.ip + '/' + k.p + '입니다. IP 주소(IPv4)는 32비트 숫자이고, 사람이 읽기 쉽게 8비트씩 끊어 10진수 네 개로 적습니다. 2진수로 쓰면 ' + this.bin(k.me, -1) + '입니다.');
    push('/' + k.p + ': 앞에서부터 ' + k.p + '비트가 네트워크 부분이라는 뜻입니다(CIDR 표기). 남은 ' + k.h + '비트가 호스트 부분입니다. 네트워크 부분을 1로, 호스트 부분을 0으로 채운 숫자가 서브넷 마스크이고, 10진수로 적으면 ' + S(k.mask) + '입니다.');
    push('네트워크 주소: 내 주소에서 호스트 부분 ' + k.h + '비트를 모두 0으로 바꾼 ' + netS + '입니다. 이 네트워크 자체를 가리키는 주소라서 기기에는 주지 않습니다.');
    push('브로드캐스트 주소: 호스트 부분을 모두 1로 바꾼 ' + bcS + '입니다. 이 네트워크의 모든 기기에게 한꺼번에 보낼 때 쓰는 주소라서 역시 기기에는 주지 않습니다.');
    push('쓸 수 있는 호스트 수: 호스트 부분 ' + k.h + '비트로 만들 수 있는 주소는 2를 ' + k.h + '번 곱한 ' + k.size + '개입니다. 여기서 네트워크 주소와 브로드캐스트 주소를 빼면 ' + k.hosts + '개가 남습니다. 범위는 ' + S(k.first) + '부터 ' + S(k.last) + '까지입니다.', k.hosts <= 2 ? 'bad' : '');
    var seem = k.same ? (a3 !== d3 ? ' 10진수로 보면 앞의 세 숫자가 서로 다르지만, 비교하는 것은 앞 ' + k.p + '비트뿐이고 그 부분은 같습니다.' : '') : (a3 === d3 ? ' 10진수로 보면 앞의 세 숫자가 같지만, 비교하는 것은 앞 ' + k.p + '비트이고 그 안에서 차이가 납니다.' : '');
    push('목적지(' + c.dest + ')가 같은 네트워크에 있는지 봅니다. 목적지 주소에도 내 서브넷 마스크를 적용해 앞 ' + k.p + '비트만 남기면 결과는 ' + dnetS + '입니다. 내 네트워크 주소(' + netS + ')와 ' + (k.same ? '같습니다. 같은 네트워크입니다.' : '다릅니다. 다른 네트워크입니다.') + seem, k.same ? 'good' : 'bad');
    if (k.same) push('같은 네트워크이므로 게이트웨이를 거치지 않고 목적지에 직접 보냅니다. 같은 네트워크 안에서는 상대 기기의 MAC 주소(랜카드마다 붙은 주소)를 알아내 그 기기 앞으로 바로 전달합니다.', 'good');
    else push('다른 네트워크이므로 직접 보낼 수 없습니다. 내 네트워크의 출구인 게이트웨이에 맡깁니다(이 예에서는 ' + gwS + ', 보통 공유기나 라우터입니다). 받는 쪽 IP 주소는 목적지 그대로 적어 두고, 전달만 게이트웨이에 부탁하는 것입니다.', '');
    if (nat) {
      push('목적지는 인터넷의 공인 주소이고, 내 주소(' + c.ip + ')는 사설 주소입니다. 사설 주소는 인터넷에서 길을 찾아 주지 않으므로 이대로 내보내면 응답이 돌아올 수 없습니다. 그래서 게이트웨이가 보내는 쪽 주소와 포트를 자신의 공인 주소로 바꿔서 내보냅니다(NAT): ' + c.ip + ':51000 → ' + pub + ':40001.', '');
      push('게이트웨이는 바꾼 짝을 변환표에 적어 둡니다. 서버의 응답이 ' + pub + ':40001 앞으로 돌아오면 표를 보고 받는 쪽을 ' + c.ip + ':51000으로 되돌려 내 PC에 전달합니다.' + (other ? ' 같은 네트워크의 다른 기기(' + other + ')가 내보낸 것에는 다른 포트 40002를 붙이므로, 여러 기기가 공인 주소 하나를 함께 쓸 수 있습니다.' : ' 이 네트워크에는 내 PC와 게이트웨이뿐이지만, 기기가 더 있더라도 기기마다 다른 포트를 붙여 공인 주소 하나를 함께 쓰게 됩니다.'), 'good');
    } else if (!k.same) push('목적지도 사설 주소입니다. 회사 내부망처럼 사설 네트워크 여러 개가 라우터로 이어진 곳이라면, 게이트웨이는 주소를 바꾸지 않고 그대로 넘깁니다. 사설 주소는 인터넷에서는 통하지 않으므로, 이 목적지는 같은 조직의 내부망 안에 있을 때만 닿습니다.', '');
    sum.push(c.ip + '/' + k.p + '의 네트워크 주소는 ' + netS + ', 브로드캐스트 주소는 ' + bcS + ', 쓸 수 있는 호스트는 ' + k.hosts + '개입니다. 목적지(' + c.dest + ')는 ' + (k.same ? '같은' : '다른') + ' 네트워크이고, 보내는 방법은 "' + route + '"입니다.');
    if (!k.same && a3 === d3) sum.push('두 주소가 같은 네트워크인지는 10진수의 앞자리가 아니라 서브넷 마스크가 가리는 앞 ' + k.p + '비트로 정해집니다. /24보다 긴 길이(/25, /26, /30)에서는 마지막 숫자 안에서도 네트워크가 갈립니다. 서브넷 마스크를 잘못 넣으면 바로 옆 기기에 보낼 것을 게이트웨이로 보내거나, 그 반대가 됩니다.');
    if (k.same && a3 !== d3) sum.push('/24보다 짧은 길이(/23, /16)에서는 세 번째 숫자가 달라도 같은 네트워크일 수 있습니다. 판단은 언제나 "같은 마스크를 적용한 결과가 같은가"입니다.');
    if (k.same && a3 === d3) sum.push('같은 네트워크의 기기끼리는 게이트웨이를 거치지 않습니다. 네트워크 부분의 길이를 더 길게(예: /25, /26) 바꿔 같은 두 주소가 어떻게 갈리는지 비교해 보세요.');
    if (k.hosts <= 2) sum.push('/30은 호스트 부분이 2비트뿐이라 주소 4개 가운데 2개만 쓸 수 있습니다. 라우터 두 대를 잇는 구간처럼 기기가 둘뿐인 곳에 씁니다.');
    if (nat) sum.push('10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16은 누구나 내부에서 자유롭게 쓰는 사설 주소 대역입니다. 인터넷으로 나갈 때는 게이트웨이가 NAT로 공인 주소를 빌려주며, 포트 번호로 기기를 구분하기 때문에 집 안의 여러 기기가 공인 주소 하나로 인터넷을 씁니다. 반대로 인터넷 쪽에서 먼저 내 PC로 연결을 시작할 수는 없습니다. 변환표에 짝이 없기 때문입니다.');
    if (!k.same && !nat) sum.push('NAT는 사설 주소에서 공인 주소로 나갈 때 필요합니다. 사설 주소끼리 오가는 내부망에서는 라우터가 주소를 바꾸지 않고 전달만 합니다.');
    return { events: ev, summary: sum, k: k, nat: nat, other: other, pub: pub, route: route, row: [netS + '/' + k.p, bcS, k.hosts + '개', k.same ? '같은 네트워크' : '다른 네트워크', route] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.stage : 0, k = sim.k, c = sim.c, S = this.str, self = this;
    if (!n) { H.text(v, '실행을 누르면 주소를 2진수로 풀어 한 단계씩 계산합니다.'); return; }
    var rows = [{ cells: ['내 주소', c.ip, self.bin(k.me, n >= 2 ? k.p : -1)] }];
    if (n >= 2) rows.push({ cells: ['서브넷 마스크', S(k.mask), self.bin(k.mask, k.p)] });
    if (n >= 3) rows.push({ cells: ['네트워크 주소', { v: S(k.net), cls: 'hot' }, self.bin(k.net, k.p)] });
    if (n >= 4) rows.push({ cells: ['브로드캐스트 주소', { v: S(k.bc), cls: 'hot' }, self.bin(k.bc, k.p)] });
    if (n >= 6) rows.push({ cells: ['목적지', c.dest, self.bin(k.dn, k.p)] }, { cells: ['목적지에 마스크 적용', { v: S(k.dnet), cls: k.same ? 'good' : 'bad' }, self.bin(k.dnet, k.p)] });
    H.table(v, ['무엇', '10진수', '2진수 (네트워크 부분 | 호스트 부분)'], rows, '주소를 2진수로 풀어 보기');
    H.counters(v, [[n >= 5 ? k.hosts + '개' : '?', '쓸 수 있는 호스트 수'], [n >= 6 ? (k.same ? '같음' : '다름') : '?', '목적지의 네트워크']]);
    var ln = H.lanes(v);
    H.lane(ln, '판단', n < 6 ? '아직 비교 전' : k.same ? '같은 네트워크: ' + S(k.dnet) + ' = ' + S(k.net) : '다른 네트워크: ' + S(k.dnet) + ' ≠ ' + S(k.net), n < 6 ? 'none' : k.same ? 'good' : 'wait');
    H.lane(ln, '보내는 방법', n < 7 ? '아직 정하지 않음' : sim.route, n < 7 ? 'none' : k.same ? 'good' : 'hot');
    if (sim.nat && n >= 8) {
      var nr = [{ cells: [c.ip + ':51000', sim.pub + ':40001', c.dest + ':443'] }];
      if (n >= 9 && sim.other) nr.push({ cells: [sim.other + ':51000', sim.pub + ':40002', c.dest + ':443'] });
      H.table(v, ['안쪽 (사설 주소:포트)', '바깥쪽 (공인 주소:포트)', '상대'], nr, '게이트웨이의 NAT 변환표');
    }
  },
  // 그림: 위에는 내 주소의 32비트를 네트워크 부분(파랑)과 호스트 부분(노랑)으로 나눠 놓고, 아래에는 내 PC, 게이트웨이, 목적지와 데이터가 가는 길을 그린다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.stage : 0, k = sim.k, c = sim.c, S = this.str, b = this.bits(k.me), i;
    P.size(680, 336);
    P.text('bt', 16, 28, n ? '내 주소 ' + c.ip + ' 의 32비트' : '내 주소의 32비트 (실행을 누르면 채워집니다)', { bold: true });
    for (i = 0; i < 32; i++) P.box('b' + i, 16 + i * 20 + Math.floor(i / 8) * 3, 38, 18, 26, { cls: !n ? 'ghost' : n < 2 ? 'plain' : i < k.p ? 'wait' : 'hot', title: n ? String(n === 4 && i >= k.p ? 1 : n === 3 && i >= k.p ? 0 : b[i]) : '', center: true });
    if (n >= 2) { P.text('tn', 16, 82, '네트워크 부분 ' + k.p + '비트 (파랑)', { cls: 'mut' }); P.text('th', 664, 82, (n === 3 ? '호스트 부분을 모두 0으로 → 네트워크 주소' : n === 4 ? '호스트 부분을 모두 1로 → 브로드캐스트 주소' : '호스트 부분 ' + k.h + '비트 (노랑)'), { cls: 'mut', anchor: 'end' }); }
    P.region('net', 8, 98, 436, 172, n >= 3 ? '내 네트워크 ' + S(k.net) + '/' + k.p : '내 네트워크');
    P.box('me', 22, 128, 190, 52, { cls: 'wait', title: '내 PC', sub: c.ip });
    P.box('gw', 240, 204, 190, 52, { cls: n >= 7 && !k.same ? 'hot' : 'plain', title: '게이트웨이 (공유기)', sub: n >= 3 ? S(k.gw) : '' });
    var inside = n >= 6 && k.same;
    P.box('dst', inside ? 240 : 474, 128, 190, 52, { cls: n < 6 ? 'plain' : k.same ? 'good' : 'bad', title: '목적지', sub: c.dest });
    if (n >= 7 && k.same) P.arrow('send', 'me:r', 'dst:l', { cls: 'good', label: '직접' });
    if (n >= 7 && !k.same) { P.arrow('send', 'me:b', 'gw:l', { cls: 'hot', label: '맡김' }); P.arrow('fwd', 'gw:r', 'dst:b', { cls: sim.nat && n >= 8 ? 'hot' : '', label: sim.nat && n >= 8 ? 'NAT로 주소를 바꿔 전달' : '전달' }); }
    P.box('res', 16, 286, 648, 34, { cls: n < 7 ? 'ghost' : k.same ? 'good' : 'hot', title: '보내는 방법', right: n < 7 ? (n >= 6 ? (k.same ? '같은 네트워크' : '다른 네트워크') : '아직 정하지 않음') : sim.route });
    P.note('파란 칸이 네트워크 부분, 노란 칸이 호스트 부분입니다. 목적지의 파란 칸 부분이 내 것과 같으면 같은 네트워크라서 직접 보내고, 다르면 게이트웨이에 맡깁니다. 게이트웨이의 주소는 이 예에서 네트워크의 첫 번째 주소로 두었습니다.');
  },
  assume: '네트워크 주소, 브로드캐스트 주소, 쓸 수 있는 호스트 수, 같은 네트워크인지의 판단은 일흔두 가지 조합을 모두 다시 계산해 대조했습니다. 대조에는 모형과 다른 세 가지 방법을 썼습니다: 화면에 보이는 비트 연산 코드를 Node.js 24에서 실행한 값, 32글자 2진수 문자열을 잘라 붙여 구한 값, 그리고 Node.js의 net.BlockList에 내 주소와 길이를 넣고 주소를 하나씩 물어 찾은 범위의 양 끝과 개수입니다. "같은 마스크를 적용한 결과가 같으면 직접, 다르면 게이트웨이로"라는 규칙은 RFC 1122 3.3.1.1절, 사설 주소 대역은 RFC 1918 3절을 따랐습니다. NAT는 이 PC에서 실행해 확인하지 못했고 RFC 3022(2.2절, 4.1절)가 설명하는 주소와 포트 변환(NAPT)을 따라 적었습니다. 공인 주소 198.51.100.7과 포트 40001, 40002, 게이트웨이를 네트워크의 첫 번째 주소로 둔 것은 설명을 위한 예입니다. 사설 주소인 목적지는 같은 조직의 내부망에 있다고 가정했습니다. 203.0.113.7은 문서용으로 예약된 주소이며 여기서는 공인 주소의 예로 썼습니다. /31과 /32처럼 "주소 2개를 뺀다"는 규칙이 맞지 않는 길이(RFC 3021)와 IPv6는 다루지 않았습니다.',
});
