// 기초개념 "프록시 서버" 실습(nginx + 스프링 부트)의 모형 결과를 실행 결과(proxy_basic_probe_boot.out.txt)와 대조한다.
// (2026-10-23 다시 짬. 옛 Node.js만의 실행 결과 proxy_basic_probe.out.txt와 대조하던 판은 git 기록에 있다)
// 대조:
//   - 결과 표 네 열(사용자가 받은 것, getRemoteAddr(), X-Forwarded-For, 요청이 지나간 길)을 실행에서 잰 사실로부터 따로 만들어 모형의 row와 견준다.
//     getRemoteAddr()와 X-Forwarded-For는 스프링 부트 컨트롤러가 돌려준 본문에서 읽는다.
//   - 단계 문장이 기대는 사실: 컨트롤러 본문 글(문장에 적은 본문과 같은지), 502 본문이 nginx의 502 페이지인지,
//     nginx(모형)가 받은 요청 수와 뒤쪽 연결 오류, nginx가 붙인 X-Forwarded-For·Host, 스프링 부트의 /hello 요청 수.
//   - 화면의 코드(code 함수)가 실행이 읽은 글과 같은지, 코드 한 줄이 75칸(한글 2칸)을 넘지 않는지.
//   - 실행 머리줄: server.address=127.0.0.1이면 127.0.0.1에서만, 줄이 없으면 0.0.0.0에서 기다렸는지(netstat).
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('proxy_basic');
const lines = fs.readFileSync(path.join(__dirname, 'proxy_basic_probe_boot.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, head = lines.filter(l => l.startsWith('# application.properties'));
lines.forEach(l => { if (l.startsWith('#') || !l.includes(' => ')) return; const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
let ok = 0, n = 0;
const G = lesson.GOT, NONE = lesson.NONE, CL = lesson.CL;
// 실행 머리줄 확인
{
  const probs = [];
  const withAddr = head.find(l => l.includes('server.address=127.0.0.1')), without = head.find(l => !l.includes('server.address'));
  if (!withAddr || !/기다리는 주소\(netstat\) \["127\.0\.0\.1:\d+"\]$/.test(withAddr)) probs.push('server.address=127.0.0.1인데 127.0.0.1에서만 기다리지 않음: ' + withAddr);
  if (!without || !/기다리는 주소\(netstat\) \["0\.0\.0\.0:\d+"\]$/.test(without)) probs.push('server.address 줄이 없는데 0.0.0.0에서 기다리지 않음: ' + without);
  n++; if (!probs.length) ok++; else console.log('다름: 실행 머리줄\n   ' + probs.join('\n   '));
}
for (const c of combos(lesson)) {
  n++;
  const k = [c.via, c.bind, c.up].join('|'), r = real[k], probs = [];
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), cl = r.client, viaP = c.via === 'proxy';
  // 실행에서 표의 네 열을 따로 만든다
  let got, peer = NONE, xff = NONE;
  if (cl.ok && cl.status === 200 && r.springHelloRequests === 1) got = G.ok;
  else if (cl.ok && cl.status === 502 && r.nginxRequests === 1 && r.nginxUpstream && r.nginxUpstream.error === 'ECONNREFUSED' && /<title>502 Bad Gateway<\/title>/.test(cl.body) && /<center>nginx<\/center>/.test(cl.body)) got = G.bad;
  else if (!cl.ok && cl.errCode === 'ECONNREFUSED') got = G.refuse;
  else got = '??? ' + JSON.stringify(cl);
  if (got === G.ok) {
    const m = /^연결한 상대: (\S+), X-Forwarded-For: (\S+)$/.exec(cl.body);
    if (!m) probs.push('본문 모양이 다름: ' + cl.body);
    else {
      peer = m[1] === '127.0.0.1' && r.nginxRequests === 1 ? '127.0.0.1 (nginx)' : m[1] === CL && r.nginxRequests === 0 ? CL + ' (사용자)' : '??? ' + m[1];
      xff = m[2] === 'null' ? 'null (헤더 없음)' : m[2];
      // 단계 문장에 적은 본문이 실제 본문과 같은지
      if (!sim.events.some(e => e.s.includes('본문 "' + cl.body + '"'))) probs.push('단계 문장에 실제 본문이 없음: ' + cl.body);
    }
  }
  const hops = ['사용자'];
  if (viaP) {
    hops.push(r.nginxOn ? 'nginx(80)' : 'nginx(80) (연결 거부)');
    if (r.nginxRequests > 0) hops.push(r.nginxUpstream && r.nginxUpstream.error === 'ECONNREFUSED' ? '스프링 부트(8080) (연결 거부)' : '스프링 부트(8080)');
  } else hops.push(!cl.ok && cl.errCode === 'ECONNREFUSED' ? '스프링 부트(8080) (연결 거부)' : '스프링 부트(8080)');
  const want = [got, peer, xff, hops.join(' → ')];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 문장이 기대는 사실
  const pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver';
  if (r.nginxOn !== pOn || r.springOn !== sOn) probs.push('화면과 켠 프로그램이 다름');
  if (!viaP && r.nginxRequests !== 0) probs.push('직접 불렀는데 nginx가 요청을 받음');
  if (viaP && pOn && (!r.nginxSent || r.nginxSent['x-forwarded-for'] !== CL || r.nginxSent.host !== lesson.HOST || r.nginxSent.connection !== 'close')) probs.push('nginx가 붙인 헤더가 다름: ' + JSON.stringify(r.nginxSent));
  if (got !== G.ok && r.springHelloRequests !== 0) probs.push('실패한 조합인데 스프링 부트가 /hello를 받음');
  // 화면의 코드 = 실행이 읽은 글
  const code = lesson.code(Object.assign({}, c));
  if (code !== r.text) probs.push('화면의 코드와 실행한 글이 다름');
  code.split('\n').forEach(l => { const w = Array.from(l).reduce((a, ch) => a + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0); if (w > 75) probs.push('코드 줄이 75칸을 넘음(' + w + '): ' + l); });
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);
