// "스위치와 라우터" 실습의 모형 결과(구간 표를 따라가는 계산)를 routing_probe.out.txt(기기마다 라우팅 표와 ARP 표를 두고 패킷을 넘기는 계산)와 대조한다.
// 둘 다 표준 문서의 규칙을 옮긴 계산이며 실제 장비의 실행 결과가 아니다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('routing');
const lines = fs.readFileSync(path.join(__dirname, 'routing_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#'));
const NAME = { A: 'PC A', B: 'PC B', C: '서버 C', D: '서버 D', R1: '라우터 R1', R2: '라우터 R2' };
const calc = {};
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [decision, owner, arpReq, result, endTtl, frames, ipSame, icmp, icmpArp] = v.split('|');
  const fs0 = frames.split('; '), firstDm = fs0[0].split(' ')[1].split('>')[1];
  const dropped = /^dropped at (\w+)$/.exec(result);
  // 다시 계산한 값만으로 결과 표의 다섯 칸을 만든다
  const row = [decision === 'direct' ? '같은 네트워크: 직접 보냄' : '다른 네트워크: 게이트웨이로 보냄', NAME[owner] + ' (…:' + firstDm + ')', arpReq + '번',
    result === 'delivered' ? '도착 (TTL ' + endTtl + ')' : dropped ? NAME[dropped[1]] + '에서 버려짐 (TTL 0)' : '예상 밖: ' + result, (fs0.length - 1) + '번'];
  // 모형이 글로 설명하는 사실: IP 주소는 끝까지 같다, 버려지면 ICMP가 보낸 쪽에 닿는다(추가 ARP 없이)
  const facts = ipSame === 'true' && (result === 'delivered' || (icmp === 'true' && icmpArp === '0'));
  calc[k] = { row, frames, facts };
}
let ok = 0, total = 0;
for (const c of combos(lesson)) {
  const k = c.dst + '|' + c.ttl + '|' + (c.arp ? 'cached' : 'empty'); total++;
  const sim = lesson.simulate(Object.assign({}, c)), want = calc[k];
  if (!want) { console.log('계산 결과 없음: ' + k); continue; }
  if (JSON.stringify(sim.row) === JSON.stringify(want.row) && sim.frames === want.frames && want.facts) ok++;
  else console.log('다름: ' + k + '\n  모형 ' + sim.row.join(' / ') + ' / ' + sim.frames + '\n  계산 ' + want.row.join(' / ') + ' / ' + want.frames + ' / 사실 확인 ' + want.facts);
}
console.log('일치 ' + ok + ' / ' + total + ' (규칙을 다시 계산한 값과의 대조, 계산 결과 ' + lines.length + '줄. 결과 표의 다섯 칸과 구간마다의 MAC 주소, TTL을 비교)');
