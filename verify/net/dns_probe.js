// "DNS" 실습의 모든 설정 조합을 127.0.0.1 안에 띄운 작은 DNS 세계에서 실제로 실행한다.
// 사용: node verify/net/dns_probe.js > verify/net/dns_probe.out.txt   (TTL이 지나기를 실제로 기다리므로 10초쯤 걸린다)
//
// 조합마다 UDP 소켓 다섯 개를 127.0.0.1에 연다: 루트 서버, .example 서버(TLD), shop.example의 권한 있는 네임 서버,
// cdn.example의 권한 있는 네임 서버, 그리고 재귀 리졸버. 이들은 진짜 DNS 메시지(RFC 1035 4절의 형식)를 주고받는다.
// 외부 DNS에는 아무것도 묻지 않는다.
//
// 무엇이 독립된 구현이고 무엇이 아닌가:
// - 네임 서버, 재귀 리졸버, PC 쪽 캐시는 이 파일에서 RFC 1034(4.3.2절 서버의 응답 절차, 5.3.3절 리졸버의 절차)를 따라 만든 시험용이다.
//   그래서 "루트 → TLD → 권한 서버로 차례로 묻는다", "TTL 동안은 캐시의 답을 쓴다"는 동작은 표준의 절차를 재현해 본 것이지,
//   실제로 쓰이는 리졸버 제품과 대조한 것이 아니다.
// - Node.js의 dns.Resolver(c-ares)는 독립된 구현이다. 조합마다 같은 질문을 c-ares로도 리졸버에 보내, 시험용 서버가 낸
//   응답을 c-ares가 풀이한 값(A, AAAA, CNAME, MX)이 같은지 확인한다. c-ares 자신은 캐시하지 않는다는 것도 확인해 적는다.
const dgram = require('dgram'), dns = require('dns');
const TTL = 4, NS_TTL = 3600, FRESH_WAIT = 1200, EXPIRE_WAIT = TTL * 1000 + 1200;
const T = { A: 1, NS: 2, CNAME: 5, MX: 15, AAAA: 28 }, TN = { 1: 'A', 2: 'NS', 5: 'CNAME', 15: 'MX', 28: 'AAAA' };
const QR = 0x8000, AA = 0x0400, RD = 0x0100, RA = 0x0080;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- DNS 메시지 만들기와 읽기 (RFC 1035 4.1절) ----------
const encName = name => Buffer.concat([...(name ? name.split('.') : []).map(p => Buffer.concat([Buffer.from([p.length]), Buffer.from(p, 'ascii')])), Buffer.from([0])]);
function readName(buf, off) {
  const labels = []; let end = -1;
  for (let hops = 0; hops < 64; hops++) {
    const len = buf[off];
    if (len === 0) { if (end < 0) end = off + 1; break; }
    if ((len & 0xc0) === 0xc0) { if (end < 0) end = off + 2; off = ((len & 0x3f) << 8) | buf[off + 1]; continue; }   // 압축: 앞에 나온 이름을 가리킴
    labels.push(buf.toString('ascii', off + 1, off + 1 + len).toLowerCase()); off += 1 + len;
  }
  return { name: labels.join('.'), end };
}
function v6bytes(text) { const [head, tail] = text.split('::'), h = head ? head.split(':') : [], t = tail === undefined ? [] : tail ? tail.split(':') : []; const g = tail === undefined ? h : [...h, ...Array(8 - h.length - t.length).fill('0'), ...t]; return Buffer.concat(g.map(x => { const b = Buffer.alloc(2); b.writeUInt16BE(parseInt(x, 16)); return b; })); }
const v6text = b => new URL('http://[' + [0, 2, 4, 6, 8, 10, 12, 14].map(i => b.readUInt16BE(i).toString(16)).join(':') + ']/').hostname.slice(1, -1);   // 표준 표기로 줄여 쓴다
function encData(type, data) {
  if (type === 'A') return Buffer.from(data.split('.').map(Number));
  if (type === 'AAAA') return v6bytes(data);
  if (type === 'MX') { const [pref, host] = data.split(' '), b = Buffer.alloc(2); b.writeUInt16BE(+pref); return Buffer.concat([b, encName(host)]); }
  return encName(data);   // NS, CNAME
}
function build(m) {
  const head = Buffer.alloc(12), an = m.answers || [], ns = m.authority || [], ar = m.additional || [];
  head.writeUInt16BE(m.id, 0); head.writeUInt16BE(m.flags, 2); head.writeUInt16BE(1, 4); head.writeUInt16BE(an.length, 6); head.writeUInt16BE(ns.length, 8); head.writeUInt16BE(ar.length, 10);
  const tc = Buffer.alloc(4); tc.writeUInt16BE(T[m.question.type], 0); tc.writeUInt16BE(1, 2);
  const q = m.question.raw || Buffer.concat([encName(m.question.name), tc]);
  const rr = r => { const d = encData(r.type, r.data), f = Buffer.alloc(10); f.writeUInt16BE(T[r.type], 0); f.writeUInt16BE(1, 2); f.writeUInt32BE(r.ttl, 4); f.writeUInt16BE(d.length, 8); return Buffer.concat([encName(r.name), f, d]); };
  return Buffer.concat([head, q, ...an.map(rr), ...ns.map(rr), ...ar.map(rr)]);
}
function parse(buf) {
  const m = { id: buf.readUInt16BE(0), flags: buf.readUInt16BE(2), answers: [], authority: [], additional: [] }, counts = [6, 8, 10].map(i => buf.readUInt16BE(i));
  const qn = readName(buf, 12); m.question = { name: qn.name, type: TN[buf.readUInt16BE(qn.end)] || String(buf.readUInt16BE(qn.end)), raw: buf.subarray(12, qn.end + 4) };
  let off = qn.end + 4;
  ['answers', 'authority', 'additional'].forEach((sec, i) => { for (let k = 0; k < counts[i]; k++) {
    const n = readName(buf, off), type = TN[buf.readUInt16BE(n.end)], ttl = buf.readUInt32BE(n.end + 4), len = buf.readUInt16BE(n.end + 8), at = n.end + 10;
    off = at + len; if (!type) continue;   // 모르는 종류(c-ares가 붙이는 OPT 등)는 건너뛴다
    const data = type === 'A' ? [...buf.subarray(at, at + 4)].join('.') : type === 'AAAA' ? v6text(buf.subarray(at, at + 16)) : type === 'MX' ? buf.readUInt16BE(at) + ' ' + readName(buf, at + 2).name : readName(buf, at).name;
    m[sec].push({ name: n.name, type, ttl, data });
  } });
  return m;
}
const listen = handler => new Promise(resolve => { const s = dgram.createSocket('udp4'); s.on('message', (msg, from) => handler(msg, buf => s.send(buf, from.port, from.address))); s.bind(0, '127.0.0.1', () => resolve(s)); });
// 질문 하나를 보내고 응답을 기다린다
const exchange = (port, msg) => new Promise((resolve, reject) => { const s = dgram.createSocket('udp4'), timer = setTimeout(() => { s.close(); reject(new Error('응답 없음')); }, 3000); s.on('message', buf => { clearTimeout(timer); s.close(); resolve(parse(buf)); }); s.send(msg, port, '127.0.0.1'); });
const inZone = (name, zone) => zone === '' || name === zone || name.endsWith('.' + zone);

// ---------- 네임 서버 (RFC 1034 4.3.2절) ----------
// records: 이 서버가 권한을 가진 레코드. delegations: 아래 구역을 다른 서버에 맡긴 정보(위임).
async function nameServer(records, delegations) {
  const sock = await listen((msg, reply) => {
    const q = parse(msg), name0 = q.question.name, type = q.question.type;
    const d = delegations.find(x => inZone(name0, x.zone));
    if (d) return reply(build({ id: q.id, flags: QR, question: q.question, authority: [{ name: d.zone, type: 'NS', ttl: NS_TTL, data: d.ns }], additional: [{ name: d.ns, type: 'A', ttl: NS_TTL, data: d.addr }] }));   // 답은 모르고 맡은 서버를 알려 준다
    const answers = []; let name = name0;
    for (let i = 0; i < 5; i++) {
      const hit = records.filter(r => r.name === name && r.type === type);
      if (hit.length) { answers.push(...hit); break; }
      const alias = records.find(r => r.name === name && r.type === 'CNAME');
      if (!alias) break;
      answers.push(alias); name = alias.data;   // 별명이면 CNAME을 답에 넣고 진짜 이름으로 다시 찾는다 (같은 서버가 가진 범위 안에서만)
    }
    reply(build({ id: q.id, flags: QR | AA | (answers.length ? 0 : 3), question: q.question, answers }));
  });
  return { sock, port: sock.address().port };
}

// ---------- 재귀 리졸버 (RFC 1034 5.3.3절) ----------
// route: 문서용 IP 주소 → 127.0.0.1의 포트. DNS 레코드에는 포트가 없으므로, "그 IP로 보낸다"를 이 표로 흉내 낸다.
async function recursiveResolver(rootAddr, route, who) {
  const cache = new Map(), log = { clientQueries: 0, upstream: [], lastAA: false };
  const put = rrs => { const groups = {}; rrs.forEach(r => (groups[r.name + '|' + r.type] = groups[r.name + '|' + r.type] || []).push(r)); Object.keys(groups).forEach(k => cache.set(k, { rrs: groups[k], expires: Date.now() + groups[k][0].ttl * 1000 })); };
  const get = (name, type) => { const e = cache.get(name + '|' + type); if (!e || Date.now() >= e.expires) return null; const left = Math.ceil((e.expires - Date.now()) / 1000); return e.rrs.map(r => Object.assign({}, r, { ttl: left })); };   // 캐시에 있는 동안 TTL은 줄어든다 (RFC 1035 6.1.3절)
  function bestServer(name) {   // 이 이름에 가장 가까운, 이미 알고 있는 위임 정보를 찾는다. 없으면 루트부터
    for (let zone = name; ; zone = zone.includes('.') ? zone.slice(zone.indexOf('.') + 1) : '') {
      const ns = get(zone, 'NS'), a = ns && get(ns[0].data, 'A');
      if (a) return a[0].data;
      if (zone === '') return rootAddr;
    }
  }
  async function resolve(qname, qtype) {
    const answers = []; let name = qname;
    for (let step = 0; step < 12; step++) {
      const hit = get(name, qtype);
      if (hit) { answers.push(...hit); return answers; }
      const alias = qtype !== 'CNAME' && get(name, 'CNAME');
      if (alias) { answers.push(...alias); name = alias[0].data; continue; }   // 별명을 알았으면 진짜 이름으로 처음부터 다시
      const addr = bestServer(name);
      const res = await exchange(route[addr], build({ id: 1 + Math.floor(step * 97 + log.upstream.length * 13), flags: 0, question: { name, type: qtype } }));
      log.upstream.push(who[addr]); log.lastAA = !!(res.flags & AA);
      if (res.answers.length) put(res.answers);
      else if (res.authority.some(r => r.type === 'NS')) put([...res.authority, ...res.additional]);
      else return answers;
    }
    return answers;
  }
  const sock = await listen(async (msg, reply) => { const q = parse(msg); log.clientQueries++; const answers = await resolve(q.question.name, q.question.type); reply(build({ id: q.id, flags: QR | RA | (q.flags & RD) | (answers.length ? 0 : 2), question: q.question, answers })); });
  return { sock, port: sock.address().port, log };
}

// ---------- PC 쪽: 답을 TTL 동안 기억하는 작은 캐시 ----------
function stub(resolverPort) {
  const cache = new Map(); let id = 100;
  return async (name, type) => {
    const key = name + '|' + type, e = cache.get(key);
    if (e && Date.now() < e.expires) return { from: 'pc', answers: e.answers.map(r => Object.assign({}, r, { ttl: Math.ceil((e.expires - Date.now()) / 1000) })) };
    const res = await exchange(resolverPort, build({ id: id++, flags: RD, question: { name, type } }));
    if (res.answers.length) cache.set(key, { answers: res.answers, expires: Date.now() + Math.min(...res.answers.map(r => r.ttl)) * 1000 });
    return { from: 'resolver', answers: res.answers };
  };
}

// ---------- 조합 하나 ----------
const QUESTIONS = { a: ['shop.example', 'A'], aaaa: ['shop.example', 'AAAA'], cname: ['www.shop.example', 'A'], mx: ['shop.example', 'MX'] };
const answerText = (q, answers) => { const pick = t => (answers.find(r => r.type === t) || { data: '?' }).data; return q === 'cname' ? pick('CNAME') + ' → ' + pick('A') : pick(QUESTIONS[q][1]); };
async function runCombo(q, cacheState, changed) {
  const shopRecords = [
    { name: 'shop.example', type: 'A', ttl: TTL, data: '203.0.113.10' }, { name: 'shop.example', type: 'AAAA', ttl: TTL, data: '2001:db8::10' },
    { name: 'shop.example', type: 'MX', ttl: TTL, data: '10 mail.shop.example' }, { name: 'mail.shop.example', type: 'A', ttl: TTL, data: '203.0.113.25' }, { name: 'mail2.shop.example', type: 'A', ttl: TTL, data: '203.0.113.26' },
    { name: 'www.shop.example', type: 'CNAME', ttl: TTL, data: 'shop.cdn.example' }];
  const cdnRecords = [{ name: 'shop.cdn.example', type: 'A', ttl: TTL, data: '203.0.113.80' }];
  // 관리자가 레코드를 바꾸는 일: 권한 있는 네임 서버가 가진 값만 바뀐다. 누구의 캐시에도 알려 주지 않는다
  const target = { a: shopRecords[0], aaaa: shopRecords[1], mx: shopRecords[2], cname: cdnRecords[0] }[q], newData = { a: '203.0.113.99', aaaa: '2001:db8::99', mx: '10 mail2.shop.example', cname: '203.0.113.81' }[q];
  const withTarget = d => q === 'cname' ? 'shop.cdn.example → ' + d : d, oldValue = withTarget(target.data), newValue = withTarget(newData);
  const change = () => { if (changed) target.data = newData; };

  const shop = await nameServer(shopRecords, []), cdn = await nameServer(cdnRecords, []);
  const tld = await nameServer([], [{ zone: 'shop.example', ns: 'ns1.shop.example', addr: '192.0.2.53' }, { zone: 'cdn.example', ns: 'ns1.cdn.example', addr: '192.0.2.153' }]);
  const root = await nameServer([], [{ zone: 'example', ns: 'ns.nic.example', addr: '198.51.100.2' }]);
  const route = { '198.51.100.1': root.port, '198.51.100.2': tld.port, '192.0.2.53': shop.port, '192.0.2.153': cdn.port }, who = { '198.51.100.1': 'root', '198.51.100.2': 'tld', '192.0.2.53': 'shop', '192.0.2.153': 'cdn' };
  const resolver = await recursiveResolver('198.51.100.1', route, who);
  const pc = stub(resolver.port), otherPc = stub(resolver.port), [name, type] = QUESTIONS[q];

  if (cacheState === 'none') change();
  if (cacheState === 'resolver') { await otherPc(name, type); change(); await sleep(FRESH_WAIT); }   // 다른 사람이 먼저 물어 리졸버의 캐시에만 있다
  if (cacheState === 'os') { await pc(name, type); change(); await sleep(FRESH_WAIT); }               // 이 PC가 조금 전에 물었고 TTL이 남았다
  if (cacheState === 'expired') { await pc(name, type); change(); await sleep(EXPIRE_WAIT); }         // 이 PC가 전에 물었지만 TTL이 지났다
  resolver.log.clientQueries = 0; resolver.log.upstream = []; resolver.log.lastAA = false;

  const got = await pc(name, type);
  const out = { answer: answerText(q, got.answers), pcQueries: resolver.log.clientQueries, upstream: resolver.log.upstream.slice(), authoritative: resolver.log.lastAA, ttlAnswer: Math.min(...got.answers.map(r => r.ttl)), ttlZone: TTL, oldValue, newValue };

  // 독립된 구현(c-ares)으로 같은 질문을 리졸버에 보내, 시험용 서버의 응답을 c-ares가 풀이한 값이 같은지 본다. 횟수는 위에서 이미 적었으므로 이 질문은 세지 않는다
  const r = new dns.promises.Resolver({ timeout: 2000, tries: 2 }); r.setServers(['127.0.0.1:' + resolver.port]);
  const before = resolver.log.clientQueries;
  let cares;
  if (q === 'a') cares = (await r.resolve4(name))[0];
  if (q === 'aaaa') cares = (await r.resolve6(name))[0];
  if (q === 'cname') cares = (await r.resolveCname(name))[0] + ' → ' + (await r.resolve4(name))[0];
  if (q === 'mx') { const m = (await r.resolveMx(name))[0]; cares = m.priority + ' ' + m.exchange; }
  out.cares = cares;
  // c-ares는 캐시하지 않는다: 같은 질문을 한 번 더 하면 리졸버가 받은 질문 수가 또 늘어난다
  const mid = resolver.log.clientQueries; await (q === 'aaaa' ? r.resolve6(name) : q === 'mx' ? r.resolveMx(name) : r.resolve4(name)).catch(() => {});
  out.caresAskedAgain = resolver.log.clientQueries > mid && mid > before;
  [shop, cdn, tld, root, resolver].forEach(s => s.sock.close());
  return out;
}

(async () => {
  const combos = [];
  for (const q of ['a', 'aaaa', 'cname', 'mx']) for (const cacheState of ['none', 'resolver', 'os', 'expired']) for (const changed of [false, true]) combos.push([q, cacheState, changed]);
  const results = await Promise.all(combos.map(c => runCombo(...c)));   // 조합마다 따로 띄운 세계이므로 한꺼번에 돌려도 서로 섞이지 않는다
  console.log('# node ' + process.version + ' · c-ares ' + process.versions.ares + ' · 시험에 쓴 TTL ' + TTL + '초(레코드), ' + NS_TTL + '초(위임 정보) · 형식: 묻는 것|캐시 상태|레코드를 바꿈 => 실행 결과(JSON)');
  combos.forEach((c, i) => console.log(c.join('|') + ' => ' + JSON.stringify(results[i])));
  console.log('# 조합 ' + combos.length + '개 · c-ares가 풀이한 답이 같은 조합 ' + results.filter(r => r.cares === r.answer).length + '개 · c-ares는 캐시하지 않고 다시 물음 ' + results.filter(r => r.caresAskedAgain).length + '개');
})().catch(e => { console.error(e); process.exit(1); });
