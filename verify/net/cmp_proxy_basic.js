// 기초개념 "프록시 서버" 실습의 모형 결과를 실제 실행 결과(proxy_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(클라이언트가 받은 것, 진짜 서버가 본 상대, 요청이 지나간 길)을 실행에서 잰 사실로부터 따로 만들어 모형의 row와 견준다.
//       단계 문장이 기대는 사실(서버가 본 상대의 포트가 클라이언트의 것인지 프록시의 것인지, 서버에 연결해 온 상대의 수,
//       프록시가 받은 요청 수, 연결 거부 오류, 502, 같은 컴퓨터라 주소가 127.0.0.1로 같다는 것)도 확인한다.
//       그리고 화면의 코드(code 함수)가 Probe가 실제로 읽어 실행한 글과 같은 글인지 확인한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('proxy_basic');
const lines = fs.readFileSync(path.join(__dirname, 'proxy_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {};
lines.forEach(l => { if (l.startsWith('#') || !l.includes(' => ')) return; const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.via, c.up].join('|'), r = real[k], probs = [];
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), cl = r.client;
  // 실제 결과에서 표의 세 열을 따로 만든다 (모형의 글을 베끼지 않고, 잰 값으로)
  const viaProxy = c.via === 'proxy';
  let got;
  if (cl.ok && cl.status === 200 && cl.body === '안녕하세요') got = '200 OK, 본문 "안녕하세요"';
  else if (cl.ok && cl.status === 502 && cl.statusMessage === 'Bad Gateway' && r.proxySawRequests === 1 && r.proxyUpstream && r.proxyUpstream.error === 'ECONNREFUSED') got = '502 Bad Gateway (프록시 서버가 보낸 응답)';
  else if (!cl.ok && cl.errCode === 'ECONNREFUSED') got = '연결 거부 오류 (그 번호에서 기다리는 프로그램이 없음)';
  else got = '??? ' + JSON.stringify(cl);
  const seen = { proxy: '프록시 서버', client: '클라이언트', none: '없음 (요청이 오지 않음)' }[r.seenPeer];
  const hops = ['클라이언트'];
  if (viaProxy) {
    hops.push(r.listens.proxy ? '프록시' : '프록시 (연결 거부)');
    if (r.proxySawRequests > 0) hops.push(r.proxyUpstream && r.proxyUpstream.error === 'ECONNREFUSED' ? '진짜 서버 (연결 거부)' : '진짜 서버');
  } else hops.push(!cl.ok && cl.errCode === 'ECONNREFUSED' ? '진짜 서버 (연결 거부)' : '진짜 서버');
  const way = hops.join(' → ');
  const want = [got, seen, way];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 문장이 기대는 사실
  const sOn = c.up !== 'noserver', pOn = c.up !== 'noproxy';
  if (r.listens.proxy !== pOn || r.listens.server !== sOn) probs.push('화면의 줄과 띄운 것이 다름: ' + JSON.stringify(r.listens));
  if (viaProxy && pOn) {
    if (r.proxySawRequests !== 1) probs.push('프록시가 받은 요청 수 ' + r.proxySawRequests);
    if (sOn) {
      if (r.seenPeer !== 'proxy' || r.portsDiffer.serverSawPort_equals_clientPort !== false || r.portsDiffer.serverSawPort_equals_proxyPort !== true) probs.push('서버가 본 상대가 프록시가 아님: ' + JSON.stringify(r.portsDiffer));
      if (r.serverConns !== 1 || r.serverRequests !== 1) probs.push('서버에 연결해 온 상대/요청 수 ' + r.serverConns + '/' + r.serverRequests);
    } else if (r.serverConns !== 0 || r.serverRequests !== 0) probs.push('꺼진 서버에 연결이 있음');
  }
  if (viaProxy && !pOn) {
    if (r.proxySawRequests !== 0 || r.serverConns !== 0 || r.serverRequests !== 0) probs.push('프록시가 꺼졌는데 요청이 어딘가 닿음');
  }
  if (!viaProxy) {
    if (r.proxySawRequests !== 0) probs.push('직접 접속인데 프록시가 요청을 받음');
    if (sOn) {
      if (r.seenPeer !== 'client' || r.portsDiffer.serverSawPort_equals_clientPort !== true || r.portsDiffer.serverSawPort_equals_proxyPort !== false) probs.push('서버가 본 상대가 클라이언트가 아님: ' + JSON.stringify(r.portsDiffer));
      if (r.serverConns !== 1) probs.push('서버에 연결해 온 상대 수 ' + r.serverConns);
    }
  }
  if (r.serverRequests > 0 && r.serverSawRemoteAddress !== '127.0.0.1') probs.push('서버가 본 상대 주소가 127.0.0.1이 아님: ' + r.serverSawRemoteAddress);
  // 화면의 코드 = Probe가 읽어 실행한 글
  const code = lesson.code(Object.assign({}, c));
  if (code !== r.text) probs.push('화면의 코드와 Probe가 실행한 글이 다름\n   화면 ' + JSON.stringify(code) + '\n   실제 ' + JSON.stringify(r.text));
  // 화면의 코드 한 줄이 75칸(한글 2칸) 이내인지
  code.split('\n').forEach(l => { const w = Array.from(l).reduce((a, ch) => a + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0); if (w > 75) probs.push('코드 줄이 75칸을 넘음(' + w + '): ' + l); });
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);
