// 트랜잭션 전파 실습의 모형 결과를 실제 스프링 실행 결과(tx_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path'), vm = require('vm');
const sim = path.join(__dirname, '..', '..', 'src', 'lessons');
const L = []; const ctx = vm.createContext({ Lab: { register: o => L.push(o), fmt: String }, console, Math, JSON });
for (const f of fs.readdirSync(sim).sort()) vm.runInContext(fs.readFileSync(path.join(sim, f), 'utf8'), ctx);
const lesson = L.find(l => l.id === 'txprop');
const lines = fs.readFileSync(path.join(__dirname, 'tx_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0; const bad = [];
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [prop, ex, type, ct, rf] = k.split('|'), [orders, logs, caller, peak] = v.split('|');
  const row = lesson.simulate({ prop, ex, type, catch: ct === 'true', rf: rf === 'true' }).row;
  const real = [orders === '1' ? '저장됨' : '저장 안 됨', logs === '1' ? '저장됨' : '저장 안 됨', caller, peak + '개'];
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else bad.push(k + '\n   모형 ' + row.join(' / ') + '\n   실제 ' + real.join(' / '));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));
bad.forEach(b => console.log('다름: ' + b));
