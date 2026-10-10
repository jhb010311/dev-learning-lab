// "소켓과 포트" 실습의 모형 결과를 실제 실행 결과(socket_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('socket');
const lines = fs.readFileSync(path.join(__dirname, 'socket_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#'));
const real = {};
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [srv, to, n] = k.split('|');
  const [bListen, ok, bad, recv, conns, srvPorts, srvPortIsListen, cliPorts, mirror, open] = v.split('|');
  // 실제 실행에서 얻은 사실만으로 결과 표의 네 칸을 만든다
  const b = { ok: '성공 (9001번)', EADDRINUSE: '실패 (EADDRINUSE)', none: '띄우지 않음' }[bListen] || '알 수 없음: ' + bListen;
  const conn = +ok > 0 && bad === '0' ? ok + '개 성공' : ok === '0' && /^\d+\(ECONNREFUSED\)$/.test(bad) ? parseInt(bad, 10) + '개 거절 (ECONNREFUSED)' : '섞임: ' + ok + '/' + bad;
  const who = recv === 'none' ? '없음' : '서버 ' + recv;
  let seen = '연결 0개';
  if (+conns > 0) seen = srvPorts === '1' && srvPortIsListen === 'true' && mirror === 'true' && open === conns
    ? '연결 ' + conns + '개 · 서버 쪽 포트 ' + to + '번 하나 · 클라이언트 쪽 임시 포트 ' + cliPorts + '개' : '예상과 다른 연결 상태: ' + v;
  real[k] = [b, conn, who, seen];
}
let ok = 0, total = 0;
for (const c of combos(lesson)) {
  const k = c.srv + '|' + c.to + '|' + c.n, row = lesson.simulate(Object.assign({}, c)).row; total++;
  if (!real[k]) { console.log('실행 결과 없음: ' + k); continue; }
  if (JSON.stringify(row) === JSON.stringify(real[k])) ok++; else console.log('다름: ' + k + '\n  모형 ' + row.join(' / ') + '\n  실제 ' + real[k].join(' / '));
}
console.log('일치 ' + ok + ' / ' + total + ' (실행 결과 ' + lines.length + '줄)');
