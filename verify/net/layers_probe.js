// "계층 구조와 캡슐화" 실습의 모든 설정 조합을 실제 바이트로 만들어 크기를 잰다.
// 사용: node verify/net/layers_probe.js > verify/net/layers_probe.out.txt
// 조합마다 (1) 그 크기의 실제 HTTP 요청 글자를 만들고 (2) MTU를 넘지 않는 만큼씩 잘라
// (3) 표준의 자리 배치대로 TCP 머리말(RFC 9293 3.1절), IPv4 머리말(RFC 791 3.1절), 이더넷 머리말과 FCS(IEEE 802.3)를 만들어 붙이고
// (4) 만들어진 프레임을 뒤섞은 뒤 머리말을 읽어 가며 다시 풀어 이어 붙여 원래 메시지와 같은지 확인하고
// (5) 같은 메시지를 127.0.0.1의 실제 TCP 연결로 보내 받는 프로그램이 같은 바이트를 받는지 확인한다.
// 운영체제가 전선에 내보내는 프레임을 잡아 보는 것은 아니다(그것은 이 PC에서 확인하지 못함).
const net = require('net'), zlib = require('zlib'), crypto = require('crypto'), cp = require('child_process');
const sizes = [300, 1460, 1500, 4000, 10000], mtus = [1500, 1400];
const A = { cp: 51000, sp: 80, cip: [192, 168, 0, 10], sip: [192, 168, 0, 20], cmac: Buffer.from('00005e00530a', 'hex'), smac: Buffer.from('00005e005314', 'hex') };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

// 전체가 정확히 size바이트인 HTTP 요청을 만든다. 본문은 되풀이되지 않는 글자로 채워, 조각의 순서가 바뀌면 드러나게 한다
function httpMessage(size) {
  for (let n = 0; n <= size; n++) {
    const head = 'POST /reviews HTTP/1.1\r\nHost: shop.example\r\nContent-Type: text/plain\r\nContent-Length: ' + n + '\r\n\r\n';
    if (Buffer.byteLength(head) + n !== size) continue;
    let body = ''; for (let i = 0; body.length < n; i++) body += i + ',';
    return Buffer.from(head + body.slice(0, n), 'latin1');
  }
  throw new Error('크기를 맞출 수 없음: ' + size);
}
// 인터넷 검사합: 16비트씩 더해 넘친 것을 다시 더하고 뒤집는다 (RFC 1071)
function checksum(buf) {
  let sum = 0; for (let i = 0; i < buf.length; i += 2) sum += (buf[i] << 8) + (i + 1 < buf.length ? buf[i + 1] : 0);
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >>> 16);
  return (~sum) & 0xffff;
}
function tcpHeader(seq, data) {
  const h = Buffer.alloc(20);
  h.writeUInt16BE(A.cp, 0); h.writeUInt16BE(A.sp, 2); h.writeUInt32BE(seq, 4); h.writeUInt32BE(1, 8);
  h.writeUInt16BE((5 << 12) | 0x018, 12);                 // 머리말 길이 5 x 4바이트, ACK + PSH
  h.writeUInt16BE(65535, 14);
  const pseudo = Buffer.from([...A.cip, ...A.sip, 0, 6, (20 + data.length) >> 8, (20 + data.length) & 255]);
  h.writeUInt16BE(checksum(Buffer.concat([pseudo, h, data])), 16);
  return h;
}
function ipHeader(payloadLength, id) {
  const h = Buffer.alloc(20);
  h[0] = 0x45;                                            // 버전 4, 머리말 길이 5 x 4바이트
  h.writeUInt16BE(20 + payloadLength, 2); h.writeUInt16BE(id, 4); h.writeUInt16BE(0x4000, 6);   // 전체 길이, 식별자, 나누지 말 것(DF)
  h[8] = 64; h[9] = 6;                                    // TTL, 프로토콜 6 = TCP
  Buffer.from(A.cip).copy(h, 12); Buffer.from(A.sip).copy(h, 16);
  h.writeUInt16BE(checksum(h), 10);
  return h;
}
function frameOf(packet) {
  const pad = Buffer.alloc(Math.max(0, 46 - packet.length));   // 이더넷의 최소 크기를 채우는 바이트 (이 실습의 조합에서는 0이어야 한다)
  const body = Buffer.concat([A.smac, A.cmac, Buffer.from([0x08, 0x00]), packet, pad]);   // 목적지 MAC 6, 출발지 MAC 6, 종류 2(0x0800 = IPv4)
  const fcs = Buffer.alloc(4); fcs.writeUInt32LE(zlib.crc32(body), 0);
  return { frame: Buffer.concat([body, fcs]), pad: pad.length };
}
// 보내는 쪽: 캡슐화
function encapsulate(message, mtu) {
  const room = mtu - ipHeader(0, 0).length - tcpHeader(0, Buffer.alloc(0)).length;   // 패킷이 MTU를 넘지 않게 실을 수 있는 데이터
  const out = [];
  for (let at = 0, id = 1; at < message.length; at += room, id++) {
    const data = message.subarray(at, at + room);
    const segment = Buffer.concat([tcpHeader(1000 + at, data), data]);
    const packet = Buffer.concat([ipHeader(segment.length, id), segment]);
    const f = frameOf(packet);
    out.push({ data: data.length, segment: segment.length, packet: packet.length, frame: f.frame, pad: f.pad });
  }
  return { room, out };
}
// 받는 쪽: 역캡슐화. 머리말에 적힌 길이와 주소만 보고 푼다
function decapsulate(frames) {
  const parts = [];
  for (const f of frames) {
    if (zlib.crc32(f.subarray(0, f.length - 4)) !== f.readUInt32LE(f.length - 4)) throw new Error('FCS 불일치');
    if (!f.subarray(0, 6).equals(A.smac) || f.readUInt16BE(12) !== 0x0800) throw new Error('내 MAC 주소가 아니거나 IPv4가 아님');
    const ip = f.subarray(14, f.length - 4), ihl = (ip[0] & 15) * 4, total = ip.readUInt16BE(2);
    if (ip[0] >> 4 !== 4 || checksum(ip.subarray(0, ihl)) !== 0 || ip[9] !== 6 || !ip.subarray(16, 20).equals(Buffer.from(A.sip))) throw new Error('IP 머리말 확인 실패');
    const tcp = ip.subarray(ihl, total), off = (tcp[12] >> 4) * 4;
    if (tcp.readUInt16BE(2) !== A.sp) throw new Error('목적지 포트가 다름');
    parts.push({ seq: tcp.readUInt32BE(4), data: tcp.subarray(off) });
  }
  parts.sort((a, b) => a.seq - b.seq);                    // 순서 번호대로 이어 붙인다
  return Buffer.concat(parts.map(p => p.data));
}
// 같은 메시지를 127.0.0.1의 실제 TCP 연결로 보내 받는 쪽 프로그램이 받은 바이트를 돌려준다
function overLoopback(message) {
  return new Promise((resolve, reject) => {
    const server = net.createServer(sock => { const got = []; sock.on('data', d => got.push(d)); sock.on('end', () => { server.close(); resolve(Buffer.concat(got)); }); });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const c = net.connect(server.address().port, '127.0.0.1', () => c.end(message)); c.on('error', reject); });
  });
}

(async () => {
  console.log('# node ' + process.version + ' · 형식: 메시지 크기|MTU => 한 조각의 최대 데이터|조각 수|조각별 데이터|마지막 조각|프레임 하나에 덧붙은 크기|덧붙은 합|전선으로 나간 합|가장 큰 패킷|가장 큰 프레임|채움 바이트|다시 풀어 이은 것이 원본과 같음|127.0.0.1 TCP로 받은 것이 원본과 같음');
  try {   // 참고: 이 PC의 인터페이스에 설정된 MTU (값만 적는다. 결과 대조에는 쓰지 않는다)
    const txt = cp.execFileSync('netsh', ['interface', 'ipv4', 'show', 'subinterfaces'], { encoding: 'latin1' });
    const vals = txt.split(/\r?\n/).map(l => /^\s*(\d+)\s+\d+\s+\d+\s+\d+\s/.exec(l)).filter(Boolean).map(m => m[1]);
    console.log('# 참고: 이 PC의 인터페이스 MTU 설정값 ' + [...new Set(vals)].join(', ') + ' (4294967295는 루프백)');
  } catch (e) { console.log('# 참고: 이 PC의 MTU 설정값은 읽지 못함'); }
  for (const size of sizes) for (const mtu of mtus) {
    const message = httpMessage(size), { room, out } = encapsulate(message, mtu);
    const frames = out.map(o => o.frame), shuffled = frames.slice().reverse();
    const per = [...new Set(out.map(o => o.frame.length - o.data))];
    const total = frames.reduce((n, f) => n + f.length, 0);
    const back = decapsulate(shuffled), loop = await overLoopback(message);
    console.log([size, mtu].join('|') + ' => ' + [room, out.length, out.map(o => o.data).join(','), out[out.length - 1].data, per.join(','), total - size, total,
      Math.max(...out.map(o => o.packet)), Math.max(...frames.map(f => f.length)), out.reduce((n, o) => n + o.pad, 0), sha(back) === sha(message) && back.length === size, sha(loop) === sha(message) && loop.length === size].join('|'));
  }
})();
