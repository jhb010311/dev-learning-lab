// "입출력 스트림과 버퍼" 실습의 모형 결과를 실제 실행 결과(IoBufProbe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('iobuf');
const lines = fs.readFileSync(path.join(__dirname, 'IoBufProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => '));
const real = {}, extra = {};
lines.forEach(l => { const [k, v] = l.split(' => '); if (k.startsWith('extra|')) extra[k.slice(6)] = v; else real[k] = v.split('|'); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.buf + '|' + c.end + '|' + c.fail + '|' + c.read, r = real[key]; n++;
  if (!r) { console.log('실행 결과 없음: ' + key); continue; }
  // 실제: 아래 스트림 write 횟수 | 한 번에 내려간 바이트 수들 | 파일 크기 | 닫혔는가 | 읽은 글자들의 코드
  const [calls, lens, size, closed, codes] = r, cs = codes ? codes.split(' ') : [];
  const text = cs.map(h => String.fromCharCode(parseInt(h, 16))).join('');
  const readText = !cs.length ? '읽은 것 없음' : c.read === 'byte' ? cs.length + '글자 (모두 깨짐)' : text.includes('�') ? text + ' (마지막 글자 깨짐)' : text;
  const want = [calls + '번', size + ' / 9바이트', closed === 'true' ? '닫힘' : '열린 채로 남음', readText];
  const sim = lesson.simulate(Object.assign({}, c));
  // 바이트 방식으로 읽은 글자가 원래 글자("가나다"의 앞부분)와 정말 다른지도 확인한다
  const broken = c.read !== 'byte' || !cs.length || !'가나다'.startsWith(text);
  if (JSON.stringify(sim.row) === JSON.stringify(want) && '[' + sim.lens.join(',') + ']' === lens && sim.codes.join(' ') === codes && broken) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' [' + sim.lens + '] ' + sim.codes.join(' ') + '\n  실제 ' + want.join(' / ') + ' ' + lens + ' ' + codes);
}
console.log('일치 ' + ok + ' / ' + n);
// 조합이 아닌, 글에서 말하는 사실의 확인
const facts = { '가나다의 UTF-8 바이트': 'EA B0 80 EB 82 98 EB 8B A4', '기본 버퍼: 처음 내려간 것은 몇 번째 write에서, 몇 바이트': '8193번째, 8192바이트', 'abc를 바이트 하나씩 글자로': 'abc (3바이트)', '닫지 않고 프로그램이 끝난 뒤의 파일 크기': '0바이트 (종료 코드 0)' };
let fo = 0; Object.keys(facts).forEach(k => { if (extra[k] === facts[k]) fo++; else console.log('사실 확인 다름: ' + k + ' => ' + extra[k]); });
console.log('따로 확인한 사실 ' + fo + ' / ' + Object.keys(facts).length);
