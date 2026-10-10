// "IP 주소와 서브넷" 실습의 모형 결과를 다시 계산한 결과(subnet_probe.out.txt)와 대조한다
// 사용: node verify/net/cmp_subnet.js
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('subnet');
const text = fs.readFileSync(path.join(__dirname, 'subnet_probe.out.txt'), 'utf8');
const real = {};
text.split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = [c.ip, c.prefix, c.dest].join('|'), r = real[key];
  if (!r) { console.log('실행 결과에 없는 조합: ' + key); continue; }
  const [mask, network, broadcast, hosts, first, last, same, srcPriv, dstPriv] = r;
  const sim = lesson.simulate(Object.assign({}, c)), k = sim.k, S = lesson.str;
  // 보내는 방법은 실행 결과의 "같은 네트워크"와 "목적지가 사설"로부터 정해지는 값이다 (NAT 자체는 RFC 3022에 따른 설명)
  const route = same === 'true' ? '직접 전달' : srcPriv === 'true' && dstPriv === 'false' ? '게이트웨이로 전달 + NAT' : '게이트웨이로 전달 (주소 변환 없음)';
  const want = [network + '/' + c.prefix, broadcast, hosts + '개', same === 'true' ? '같은 네트워크' : '다른 네트워크', route];
  // 표의 값 말고도 단계 설명에 쓰이는 마스크, 호스트 범위, 사설 여부를 함께 대조한다
  const extra = S(k.mask) === mask && S(k.first) === first && S(k.last) === last && String(k.dpriv) === dstPriv && String(lesson.isPrivate(c.ip)) === srcPriv;
  if (JSON.stringify(sim.row) === JSON.stringify(want) && extra) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' · 마스크 ' + S(k.mask) + ' · 범위 ' + S(k.first) + '~' + S(k.last) + '\n  실제 ' + want.join(' / ') + ' · 마스크 ' + mask + ' · 범위 ' + first + '~' + last);
}
const tail = /# 세 방법이 서로 일치하고 예시가 성립한 조합 (\d+) \/ (\d+)/.exec(text);
console.log('실행 쪽 세 방법끼리의 일치: ' + (tail ? tail[1] + ' / ' + tail[2] : '기록 없음'));
console.log('일치 ' + ok + ' / ' + n);
