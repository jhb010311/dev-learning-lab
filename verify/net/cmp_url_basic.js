// 기초개념 "URL" 실습의 모형 결과를 실제 실행 결과(url_basic_probe.out.txt)와 대조한다.
// 조합마다 확인하는 것:
//  (1) 화면의 code(c)가 Probe가 new URL에 넣은 글자(text)와 같은 글인가
//  (2) 모형이 읽은 부분(protocol, hostname, port, pathname, search 또는 오류 코드)이 new URL이 낸 값과 같은가
//  (3) http 주소: 클라이언트가 연결하려던 host와 port, 서버가 받은 요청의 첫 줄과 Host 줄(가로채기 실행)이 모형과 같은가
//      포트를 적은 조합은 실제 연결의 첫 줄, Host 줄, 응답 상태와 본문도 모형과 같은가 (Host 줄의 번호는 8080으로 바꾼 값)
//  (4) 스킴이 http가 아닌 주소: http.request가 요청을 보내지 못했는가(ERR_INVALID_PROTOCOL 또는 ERR_INVALID_URL)
//  (5) 표의 세 열(row)을 실제 값에서 얻은 것과 견준다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('url_basic');
const lines = fs.readFileSync(path.join(__dirname, 'url_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]); console.log(lines.filter(l => l.startsWith('# dns') || l.startsWith('# autoSelect')).join('\n'));
const real = {};
lines.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const k = [c.scheme, c.port, c.path, c.query].join('|'), r = real[k], sim = lesson.simulate(Object.assign({}, c)), f = sim.f, bad = [];
  n++;
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  if (lesson.code(c) !== r.text) bad.push('코드 ' + lesson.code(c) + ' / Probe ' + r.text);
  // (2)
  if (f.kind === 'bad') { if (r.parse.error !== f.parse.error) bad.push('parse ' + JSON.stringify(r.parse)); }
  else if (!eq(r.parse, f.parse)) bad.push('parse 모형 ' + JSON.stringify(f.parse) + ' 실제 ' + JSON.stringify(r.parse));
  // (3), (4)와 (5)의 실제 값
  let row;
  if (f.kind === 'http') {
    const x = r.intercept;
    if (!x) bad.push('가로채기 실행 없음');
    else {
      if (x.wantedHost !== f.connect.host || x.wantedPort !== f.connect.port) bad.push('연결하려던 곳 ' + x.wantedHost + ':' + x.wantedPort);
      if (x.requestLine !== f.line) bad.push('첫 줄 ' + x.requestLine);
      if (x.hostLine !== f.hostLine) bad.push('Host 줄 ' + x.hostLine);
    }
    if (c.port) {
      const y = r.real;
      if (!y) bad.push('실제 연결 실행 없음');
      else {
        if (y.calls !== 1) bad.push('서버가 받은 요청 수 ' + y.calls);
        if (y.requestLine !== f.line || y.hostLine !== f.hostLine) bad.push('실제 연결의 첫 줄/Host ' + y.requestLine + ' / ' + y.hostLine);
        if (y.status !== f.status || y.body !== f.body) bad.push('응답 ' + y.status + ' ' + y.body);
        if (y.remoteAddress !== '127.0.0.1') bad.push('연결 주소 ' + y.remoteAddress);
      }
      row = ['localhost, ' + r.parse.port + '번', r.real && r.real.requestLine, r.real && (r.real.status === 200 ? '200 ' + r.real.body : String(r.real.status))];
    } else {
      // 포트를 생략: 연결하려던 곳이 80번임을 실제 값에서 읽는다. 80번에는 연결하지 않았다
      row = ['localhost, ' + x.wantedPort + '번 (http의 기본 포트)', x.requestLine + ' (' + x.wantedPort + '번으로 보낼 요청)', x.wantedPort + '번 포트에 서버가 없으면 연결할 수 없음'];
    }
  } else {
    const failed = f.kind === 'odd' ? (r.sendAttempt && r.sendAttempt.err === 'ERR_INVALID_PROTOCOL' && !r.sendAttempt.ok) : (r.sendString && r.sendString.err === 'ERR_INVALID_URL');
    if (!failed) bad.push('요청 보내기가 거절되지 않음');
    if (!/unknown scheme|Failed to parse URL/.test(r.fetch || '')) bad.push('fetch ' + r.fetch);
    row = [r.parse.error ? '주소로 읽히지 않음' : '스킴이 ' + r.parse.protocol.replace(':', '') + '로 읽힘' + (r.parse.hostname === '' ? ' (호스트 없음)' : ''), '보내지 못함', '응답 없음 (요청을 보내지 못함)'];
  }
  if (!eq(sim.row, row)) bad.push('row 모형 ' + sim.row.join(' | ') + '\n      실제 ' + row.join(' | '));
  if (bad.length) console.log('다름: ' + k + '\n   ' + bad.join('\n   ')); else ok++;
}
console.log('일치 ' + ok + ' / ' + n);
