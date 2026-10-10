// "흐름 제어와 혼잡 제어" 실습의 수치를 RFC 5681의 규칙대로 독립적으로 다시 계산한다.
// 실제 TCP를 실행하는 것이 아니다(운영체제의 혼잡 윈도는 프로그램에서 들여다보거나 조작할 수 없다). 규칙을 ACK 하나 단위로 옮긴 계산이다.
// 실습의 모형은 "왕복 한 번" 단위의 식으로 계산하고, 여기서는 "ACK 하나" 단위로 계산해 서로 다른 방법의 결과가 같은지 본다.
// 사용: node verify/net/congestion_probe.js  → verify/net/congestion_probe.out.txt 를 다시 쓴다
// 한 줄: loss|at|ssth|rwnd => 왕복마다 보낸 양|왕복마다의 혼잡 윈도|왕복마다의 문턱값|유실 직후 문턱값|유실 직후 혼잡 윈도|보낸 양의 합|수신 윈도에 막힌 왕복 수
//
// 옮긴 규칙 (단위는 조각 = SMSS 크기의 세그먼트 하나, ACK 하나가 조각 하나를 확인한다고 가정)
//  - 보낼 수 있는 양 = min(cwnd, rwnd)                                   RFC 5681 3.1절, RFC 9293 3.8.6절
//  - 느린 시작(cwnd < ssthresh): ACK마다 cwnd += min(N, SMSS)             RFC 5681 3.1절 식 (2)
//  - 혼잡 회피(cwnd >= ssthresh): 확인된 양이 cwnd에 닿으면 cwnd += SMSS   RFC 5681 3.1절 (권장하는 바이트 세기 방식)
//  - 유실을 알아채면 ssthresh = max(FlightSize / 2, 2 * SMSS)             RFC 5681 3.1절 식 (4) (조각 단위로 내림)
//  - 같은 ACK 세 번(빠른 재전송과 빠른 회복)이 끝나면 cwnd = ssthresh     RFC 5681 3.2절 6단계
//  - 재전송 타이머 만료면 cwnd = 1 * SMSS (손실 윈도)                      RFC 5681 3.1절
const fs = require('fs'), path = require('path');
const ROUNDS = 12;

function run(loss, at, ssth0, rwnd) {
  let cwnd = 1, ssthresh = ssth0, acked = 0;
  const flights = [], cwnds = [], ssths = []; let after = null, limited = 0;
  function onAck() {                                   // 새 데이터를 확인하는 ACK 하나
    if (cwnd < ssthresh) cwnd += 1;                    // 느린 시작
    else if (++acked >= cwnd) { acked = 0; cwnd += 1; } // 혼잡 회피
  }
  for (let r = 1; r <= ROUNDS; r++) {
    const flight = Math.min(cwnd, rwnd);
    flights.push(flight); cwnds.push(cwnd); ssths.push(ssthresh);
    if (rwnd < cwnd) limited++;
    if (loss !== 'none' && r === at) {
      // 이 왕복에 보낸 것에 대한 새 ACK는 오지 않는다(dup: 맨 앞 조각이 사라져 같은 ACK만 거듭 옴, rto: 모두 사라짐)
      ssthresh = Math.max(Math.floor(flight / 2), 2);
      if (loss === 'dup') { cwnd = ssthresh + 3; /* 빠른 회복 동안 잠시 부풀림 */ cwnd = ssthresh; /* 새 ACK가 오면 되돌림 */ }
      else cwnd = 1;
      acked = 0;
      after = [ssthresh, cwnd];
    } else for (let k = 0; k < flight; k++) onAck();
  }
  return [flights.join(' '), cwnds.join(' '), ssths.join(' '), after ? after[0] : '-', after ? after[1] : '-', flights.reduce((a, b) => a + b, 0), limited].join('|');
}

const out = ['# 흐름 제어와 혼잡 제어: RFC 5681의 규칙을 ACK 하나 단위로 옮겨 계산한 값 (실제 TCP 실행이 아님)', '# loss|at|ssth|rwnd => 보낸 양|혼잡 윈도|문턱값|유실 직후 문턱값|유실 직후 혼잡 윈도|합|수신 윈도에 막힌 왕복'];
for (const loss of ['none', 'dup', 'rto']) for (const at of loss === 'none' ? [6] : [3, 4, 5, 6, 7, 8, 9, 10]) for (const ssth of [8, 16, 64]) for (const rwnd of [64, 12, 6])
  out.push([loss, at, ssth, rwnd].join('|') + ' => ' + run(loss, at, ssth, rwnd));
fs.writeFileSync(path.join(__dirname, 'congestion_probe.out.txt'), out.join('\n') + '\n');
console.log(out.slice(0, 2).concat(out.slice(2, 14), ['... 모두 ' + (out.length - 2) + '줄']).join('\n'));
