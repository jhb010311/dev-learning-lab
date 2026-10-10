// "계층 구조와 캡슐화" 실습의 모형 결과를 실제 바이트로 만들어 잰 결과(layers_probe.out.txt)와 대조한다
// 사용: node verify/net/cmp_layers.js
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('layers');
const real = {};
fs.readFileSync(path.join(__dirname, 'layers_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = [c.size, c.mtu].join('|'), r = real[key];
  if (!r) { console.log('실행 결과에 없는 조합: ' + key); continue; }
  const [room, count, segs, last, per, over, total, maxPacket, maxFrame, pad, rebuilt, loop] = r;
  const sim = lesson.simulate(Object.assign({}, c));
  const want = [room + '바이트', count + '개', last + '바이트', over + '바이트 (' + per + '바이트 x ' + count + ')', total + '바이트'];
  // 표의 값 말고도 조각별 크기, 패킷이 MTU를 넘지 않는지, 채움 바이트가 없는지, 다시 풀어 이은 것과 실제 TCP로 받은 것이 원본과 같은지 본다
  const extra = sim.k.segs.join(',') === segs && +maxPacket <= +c.mtu && +maxFrame === Math.max(...sim.k.segs) + sim.k.per && pad === '0' && rebuilt === 'true' && loop === 'true';
  if (JSON.stringify(sim.row) === JSON.stringify(want) && extra) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' · 조각 ' + sim.k.segs.join(',') + '\n  실제 ' + want.join(' / ') + ' · 조각 ' + segs + ' · 가장 큰 패킷 ' + maxPacket + ' · 채움 ' + pad + ' · 복원 ' + rebuilt + ' · TCP ' + loop);
}
console.log('일치 ' + ok + ' / ' + n);
