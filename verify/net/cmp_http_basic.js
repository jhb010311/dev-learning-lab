// 기초개념 "HTTP 요청" 실습의 모형 결과를 실제 실행 결과(http_basic_probe.out.txt)와 대조한다.
// 실제 값에서 표의 세 열을 얻는 방법: 처리 함수가 불렸으면 그 함수가 받은 method url, clientError가 났으면 "요청으로 읽지 못함",
// 응답이 없고 불리지도 않았으면 "아직 읽는 중", 400인데 불리지 않았고 clientError도 없으면 "(Host 검사를 끈 서버가 받은 method url) 요청 (Host가 없어 거절)".
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('http_basic');
const lines = fs.readFileSync(path.join(__dirname, 'http_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {};
lines.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => {
  const [k, v] = l.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const called = f.called === 'true', answered = f.answered === 'true';
  const code = answered ? f.status.split(' ')[1] : '';
  const read = called ? f.req + ' 요청' : f.clientError !== '(없음)' ? '요청으로 읽지 못함' : !answered ? '아직 읽는 중' : f.hostOff + ' 요청 (Host가 없어 거절)';
  const resp = !answered ? '응답 없음 (기다림)' : code === '200' ? '200 ' + f.body : code;
  real[k] = [read, resp, called ? '예' : '아니요'];
});
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const k = [c.line, c.host, c.blank].join('|'), r = real[k], row = lesson.simulate(Object.assign({}, c)).row; n++;
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  if (JSON.stringify(row) === JSON.stringify(r)) ok++; else console.log('다름: ' + k + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + r.join(' | '));
}
console.log('일치 ' + ok + ' / ' + n);
