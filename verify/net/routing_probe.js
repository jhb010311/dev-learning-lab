// "스위치와 라우터" 실습의 결과를 표준 문서의 규칙대로 독립적으로 다시 계산한다.
// 실제 장비나 실제 네트워크를 쓰는 것이 아니다(이 PC 한 대로는 라우터 두 대를 거치는 길을 만들 수 없다). 규칙을 옮긴 계산이다.
// 실습의 모형은 받는 쪽마다 거치는 구간을 표로 적어 두고 따라가고, 여기서는 기기마다 IP·마스크·라우팅 표·ARP 표를 두고
// 패킷을 실제로 넘겨 가며 계산한다(서로 다른 방법의 결과가 같은지 본다).
// 사용: node verify/net/routing_probe.js  → verify/net/routing_probe.out.txt 를 다시 쓴다
// 한 줄: dst|ttl|arp => 보내는 쪽의 판단|첫 프레임의 받는 MAC 주인|ARP 요청 수|결과|끝났을 때 TTL|프레임들|IP 주소가 끝까지 같은가|ICMP 시간 초과가 보낸 쪽에 닿았나|그때 추가된 ARP 요청 수
//
// 옮긴 규칙
//  - 보내는 컴퓨터: (받는 IP & 마스크) == (내 IP & 마스크)면 받는 IP에게 직접, 아니면 게이트웨이에게     RFC 1122 3.3.1.1절
//  - 다음 구간에서 건넬 기기의 MAC을 모르면 ARP 요청을 브로드캐스트하고, 그 IP의 주인만 응답한다.
//    요청을 받은 주인은 요청한 쪽의 IP와 MAC도 자기 표에 적는다                                         RFC 826 (Packet Reception)
//  - 스위치: 받는 MAC 주소를 가진 기기에게만 프레임을 넘긴다(브로드캐스트는 모두에게). 프레임을 고치지 않는다   IEEE 802.1D
//  - 라우터: 자기에게 온 프레임 안의 패킷이 자기 IP가 아니면 전달한다. TTL을 1 줄이고, 0이 되면 버리고
//    ICMP 시간 초과를 보낸 쪽에 돌려보낸다. TTL 확인은 다음 구간의 MAC을 알아내기 전에 한다               RFC 791 3.2절, RFC 1812 5.2.1.2절·5.3.1절, RFC 792
//  - 받는 컴퓨터는 TTL이 1인 패킷도 받는다                                                              RFC 1122 3.2.1.7절
const fs = require('fs'), path = require('path');
const n = s => s.split('.').reduce((a, x) => ((a << 8) | +x) >>> 0, 0);
const MAC = x => '00:00:5E:00:53:' + x, BROADCAST = 'FF:FF:FF:FF:FF:FF', M24 = '255.255.255.0';

function build() {
  const nodes = {
    A: { ifs: [{ ip: '192.168.1.10', mask: M24, mac: MAC('0A'), seg: 'netA' }], routes: [{ net: '0.0.0.0', mask: '0.0.0.0', via: '192.168.1.1' }] },
    B: { ifs: [{ ip: '192.168.1.20', mask: M24, mac: MAC('0B'), seg: 'netA' }], routes: [{ net: '0.0.0.0', mask: '0.0.0.0', via: '192.168.1.1' }] },
    R1: { router: true, ifs: [{ ip: '192.168.1.1', mask: M24, mac: MAC('11'), seg: 'netA' }, { ip: '192.168.2.1', mask: M24, mac: MAC('12'), seg: 'netB' }], routes: [{ net: '192.168.3.0', mask: M24, via: '192.168.2.2' }] },
    C: { ifs: [{ ip: '192.168.2.30', mask: M24, mac: MAC('0C'), seg: 'netB' }], routes: [{ net: '0.0.0.0', mask: '0.0.0.0', via: '192.168.2.1' }] },
    R2: { router: true, ifs: [{ ip: '192.168.2.2', mask: M24, mac: MAC('21'), seg: 'netB' }, { ip: '192.168.3.1', mask: M24, mac: MAC('22'), seg: 'netC' }], routes: [{ net: '192.168.1.0', mask: M24, via: '192.168.2.1' }] },
    D: { ifs: [{ ip: '192.168.3.40', mask: M24, mac: MAC('0D'), seg: 'netC' }], routes: [{ net: '0.0.0.0', mask: '0.0.0.0', via: '192.168.3.1' }] },
  };
  Object.keys(nodes).forEach(k => { nodes[k].name = k; nodes[k].arp = {}; });
  return nodes;
}

function run(dstName, ttl0, cached) {
  const nodes = build(), log = { frames: [], arpReq: 0, result: '', endTtl: '-', decision: '', icmp: false, icmpArp: 0 };
  let counting = 'data';
  const onSeg = seg => Object.values(nodes).flatMap(nd => nd.ifs.filter(i => i.seg === seg).map(i => ({ nd, i })));
  if (cached) Object.values(nodes).forEach(nd => nd.ifs.forEach(i => onSeg(i.seg).forEach(o => { if (o.nd !== nd) nd.arp[o.i.ip] = o.i.mac; })));
  // 다음에 건넬 곳: 직접 연결된 네트워크면 받는 IP 자신, 아니면 라우팅 표에서 가장 길게 맞는 길의 게이트웨이
  function nextHop(nd, dst) {
    for (const i of nd.ifs) if ((n(dst) & n(i.mask)) === (n(i.ip) & n(i.mask))) return { i, hop: dst, direct: true };
    const r = nd.routes.filter(r => (n(dst) & n(r.mask)) === (n(r.net) & n(r.mask))).sort((a, b) => n(b.mask) - n(a.mask))[0];
    if (!r) return null;
    return { i: nd.ifs.find(i => (n(r.via) & n(i.mask)) === (n(i.ip) & n(i.mask))), hop: r.via, direct: false };
  }
  // ARP (RFC 826): 요청은 그 네트워크의 모두에게, 응답은 주인만
  function resolve(nd, i, ip) {
    if (nd.arp[ip]) return nd.arp[ip];
    if (counting === 'data') log.arpReq++; else log.icmpArp++;
    for (const o of onSeg(i.seg)) {
      if (o.nd === nd) continue;
      let merged = false;
      if (o.nd.arp[i.ip]) { o.nd.arp[i.ip] = i.mac; merged = true; }
      if (o.i.ip === ip) { if (!merged) o.nd.arp[i.ip] = i.mac; nd.arp[ip] = o.i.mac; }
    }
    return nd.arp[ip];
  }
  function transmit(nd, pkt) {
    const h = nextHop(nd, pkt.dst); if (!h) return;
    const dmac = resolve(nd, h.i, h.hop); if (!dmac) return;
    const frame = { smac: h.i.mac, dmac, pkt: Object.assign({}, pkt) };
    const rx = onSeg(h.i.seg).filter(o => o.i.mac === dmac || dmac === BROADCAST)[0];      // 스위치: 받는 MAC의 주인에게만
    if (pkt.kind === 'data') log.frames.push(nd.name + '>' + rx.nd.name + ' ' + frame.smac.slice(-2) + '>' + frame.dmac.slice(-2) + ' ' + pkt.src + '>' + pkt.dst + ' ttl' + pkt.ttl);
    receive(rx.nd, rx.i, frame);
  }
  function receive(nd, i, frame) {
    if (frame.dmac !== i.mac) return;                                  // 내 MAC이 아니면 무시
    const pkt = frame.pkt;
    if (nd.ifs.some(x => x.ip === pkt.dst)) {                          // 받는 IP가 나: 도착
      if (pkt.kind === 'data') { log.result = 'delivered'; log.endTtl = pkt.ttl; }
      if (pkt.kind === 'icmp' && nd.name === 'A') log.icmp = true;
      return;
    }
    if (!nd.router) return;                                            // 컴퓨터는 남의 패킷을 전달하지 않는다
    pkt.ttl -= 1;                                                      // 라우터: TTL을 1 줄인다
    if (pkt.ttl <= 0) {
      if (pkt.kind === 'data') { log.result = 'dropped at ' + nd.name; log.endTtl = 0; counting = 'icmp'; transmit(nd, { kind: 'icmp', src: i.ip, dst: pkt.src, ttl: 64 }); }
      return;
    }
    transmit(nd, pkt);
  }
  const A = nodes.A, dst = nodes[dstName].ifs[0].ip, first = nextHop(A, dst);
  log.decision = first.direct ? 'direct' : 'gateway';
  transmit(A, { kind: 'data', src: A.ifs[0].ip, dst, ttl: ttl0 });
  const owner = Object.values(nodes).find(nd => nd.ifs.some(i => i.mac.slice(-2) === log.frames[0].split(' ')[1].split('>')[1])).name;
  const ipSame = log.frames.every(f => f.split(' ')[2] === A.ifs[0].ip + '>' + dst);
  return [log.decision, owner, log.arpReq, log.result, log.endTtl, log.frames.map(f => { const p = f.split(' '); return p[0] + ' ' + p[1] + ' ' + p[3]; }).join('; '), ipSame, log.result === 'delivered' ? '-' : log.icmp, log.result === 'delivered' ? '-' : log.icmpArp].join('|');
}

const out = ['# 스위치와 라우터: RFC 826, 791, 792, 1122, 1812의 규칙을 옮겨 계산한 값 (실제 장비 실행이 아님)', '# dst|ttl|arp => 판단|첫 프레임의 받는 MAC 주인|ARP 요청|결과|끝났을 때 TTL|프레임(구간 보내는MAC>받는MAC TTL)|IP 그대로|ICMP가 보낸 쪽에 닿음|그때 추가 ARP'];
for (const dst of ['b', 'c', 'd']) for (const ttl of [64, 2, 1]) for (const arp of [false, true])
  out.push(dst + '|' + ttl + '|' + (arp ? 'cached' : 'empty') + ' => ' + run(dst.toUpperCase(), ttl, arp));
fs.writeFileSync(path.join(__dirname, 'routing_probe.out.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
