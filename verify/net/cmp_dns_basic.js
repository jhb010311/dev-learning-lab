// 기초개념 "DNS" 실습의 모형 결과를 실제 실행 결과(dns_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 네 열(실제 값에서 얻는다), 화면의 코드(code 함수)가 Probe가 읽어 실행한 글과 같은지,
//       단계 문장이 기대는 사실(이름이면 먼저 묻고 그다음 연결, IP 주소면 묻지 않음, 이름 없음이면 어느 서버도 요청을 받지 못함 등)
// 실제 값에서 표를 얻는 방법: 물은 횟수 = DNS 서버가 받은 A 질의의 수, DNS 서버의 답 = 클라이언트가 Resolver에서 받은 값(오류 ENOTFOUND이면 이름 없음),
//   연결한 IP 주소 = HTTP 서버들이 받은 연결의 목적지 주소, 응답 = 클라이언트가 받은 상태와 본문(또는 오류).
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('dns_basic');
const lines = fs.readFileSync(path.join(__dirname, 'dns_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {};
lines.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.reg, c.target].join('|'), r = real[k];
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), cl = r.client, probs = [];
  const aQueries = r.dnsQueries.filter(q => q.type === 'A').length;
  const ans = !cl.resolverCalled ? '(묻지 않음)' : cl.dnsAnswer ? cl.dnsAnswer.join(',') : cl.dnsError === 'ENOTFOUND' ? '그런 이름 없음' : '(모르는 오류 ' + cl.dnsError + ')';
  const uniq = [...new Set(r.connAddrs)];
  const resp = cl.status === 200 ? '200 ' + cl.body : cl.dnsError === 'ENOTFOUND' ? '접속하지 못함: 이름의 주소를 알 수 없음' : '(모르는 결과 ' + (cl.err || cl.dnsError || cl.status) + ')';
  const want = [aQueries + '번', ans, uniq.length ? uniq.join(',') : '(연결하지 않음)', resp];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 화면의 코드와 Probe가 읽어 실행한 글
  if (r.code !== lesson.code(c)) probs.push('화면의 코드와 Probe가 쓴 글이 다름');
  // 단계 문장이 기대는 사실
  if (r.dnsQueries.length !== aQueries) probs.push('A 말고 다른 종류의 질의가 있었음: ' + JSON.stringify(r.dnsQueries));
  if (r.dnsQueries.some(q => q.name !== 'shop.example')) probs.push('shop.example 말고 다른 이름을 물음');
  const isName = c.target === 'name';
  if ((cl.isIP === 0) !== isName) probs.push('호스트가 이름인지 IP 주소인지 판단(net.isIP)이 화면과 다름: ' + cl.isIP);
  if (cl.resolverCalled !== isName) probs.push('Resolver 호출 여부가 이름 여부와 다름');
  const expectOrder = !isName ? ['connect'] : c.reg === 'none' ? ['dns'] : ['dns', 'connect'];
  if (JSON.stringify(r.order) !== JSON.stringify(expectOrder)) probs.push('일어난 순서 ' + JSON.stringify(r.order) + ' 기대 ' + JSON.stringify(expectOrder));
  if (c.reg === 'none' && isName) {
    if (r.dnsQueries[0].rcode !== 3) probs.push('이름 없음 답의 RCODE가 3이 아님: ' + r.dnsQueries[0].rcode);
    if (r.requests.length !== 0 || r.connAddrs.length !== 0) probs.push('이름 없음인데 서버가 연결이나 요청을 받음');
  } else {
    if (r.requests.length !== 1 || r.connAddrs.length !== 1) probs.push('연결과 요청이 하나씩이 아님: ' + JSON.stringify(r.requests));
    if (cl.connectTo !== uniq[0]) probs.push('클라이언트가 연결하려던 IP와 서버가 받은 연결의 IP가 다름');
    if (isName && r.dnsQueries[0].rcode !== 0) probs.push('등록된 이름인데 RCODE가 0이 아님');
  }
  if (r.bind127002 !== 'ok' || r.bindTries !== 1) probs.push('127.0.0.2에 바로 묶이지 않음: ' + r.bind127002 + ' ' + r.bindTries);
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log(lines.filter(l => l.startsWith('# 받은 질의') || l.startsWith('# 127.0.0.2')).join('\n'));
console.log('일치 ' + ok + ' / ' + n);
