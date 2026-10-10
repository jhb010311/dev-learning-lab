// "TCP와 UDP" 실습의 모형 결과를 실제 실행 결과(udp_probe.out.txt)와 대조한다.
// 실행으로 만들 수 없는 조합(TCP의 유실, 순서 바뀜)은 대조에서 빼고 따로 적는다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('udp'), SENT = ['AB', 'CD', 'EF'];
const lines = fs.readFileSync(path.join(__dirname, 'udp_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#'));
const real = {}, docOnly = [];
const q = a => a.map(x => '"' + x + '"').join(', ');
for (const ln of lines) {
  const [k, v] = ln.split(' => '), proto = k.split('|')[0];
  if (v.startsWith('(실행으로 재현하지 않음')) { docOnly.push(k); continue; }
  if (v.startsWith('(실행마다 다름)')) { real[k] = ['실행마다 다름: ' + v]; continue; }
  const [conn, sent, err, json] = v.split('|'), got = JSON.parse(json);
  // 실제 실행에서 얻은 사실만으로 결과 표의 네 칸을 만든다
  const c0 = conn === 'connected' ? '맺음 (성공)' : conn === 'failed' ? '실패 (' + err + ')' : '없음';
  const c1 = proto === 'tcp' ? (conn === 'connected' && sent === '3' && err === 'none' ? 'write 3번 성공' : sent === '0' ? '보내지 못함' : '예상 밖: ' + v) : (sent === '3' && err === 'none' ? 'send 3번 모두 오류 없음' : '예상 밖: ' + v);
  const c2 = got.length ? q(got) + ' ' + ['', '한', '두', '세'][got.length] + ' 덩어리' : '없음';
  let c3;
  if (!got.length) c3 = sent === '0' ? '아무것도 보내지 않음' : '모두 사라짐';
  else if (JSON.stringify(got) === JSON.stringify(SENT)) c3 = '보낸 그대로';
  else if (got.join('') === SENT.join('') && got.length < SENT.length) c3 = '내용과 순서는 같고 경계는 사라짐';
  else if (got.length === SENT.length - 1 && got.every(x => SENT.includes(x)) && got.join() === SENT.filter(x => got.includes(x)).join()) c3 = '하나가 빠짐';
  else if (got.slice().sort().join() === SENT.slice().sort().join()) c3 = '순서가 바뀜';
  else c3 = '예상 밖: ' + json;
  real[k] = [c0, c1, c2, c3];
}
let ok = 0, total = 0; const seen = new Set(), rows = {};
for (const c of combos(lesson)) {
  const k = c.proto + '|' + (c.recv ? 'on' : 'off') + '|' + c.net; if (seen.has(k)) continue; seen.add(k);
  const row = lesson.simulate(Object.assign({}, c)).row; rows[k] = row;
  if (docOnly.includes(k)) continue;
  total++;
  if (!real[k]) { console.log('실행 결과 없음: ' + k); continue; }
  if (JSON.stringify(row) === JSON.stringify(real[k])) ok++; else console.log('다름: ' + k + '\n  모형 ' + row.join(' / ') + '\n  실제 ' + real[k].join(' / '));
}
console.log('일치 ' + ok + ' / ' + total + ' (실행으로 대조한 조합)');
// 문서 기준 조합: TCP는 유실과 순서 바뀜을 바로잡으므로(RFC 9293 3.4절, 3.8절) 프로그램이 읽는 결과가 아무 일 없을 때와 같아야 한다
const base = JSON.stringify(real['tcp|on|ok'] || []);
docOnly.forEach(k => console.log('문서 기준(실행 대조 아님): ' + k + ' → 모형의 결과가 실행으로 확인한 tcp|on|ok와 ' + (JSON.stringify(rows[k]) === base ? '같음' : '다름: ' + (rows[k] || []).join(' / '))));
console.log('조합 ' + seen.size + '개 = 실행 대조 ' + total + '개 + 문서 기준 ' + docOnly.length + '개');
