// "메서드 보안" 실습의 모형 결과를 실제 스프링 시큐리티 실행 결과(methodsec_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('methodsec');
const read = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean);
const all = read(path.join(__dirname, 'methodsec_probe.out.txt'));
console.log(all[0]);
const parse = v => { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
const real = {};
all.forEach(l => { if (l.startsWith('#') || !l.includes(' => ')) return; const [k, v] = l.split(' => '); real[k] = parse(v); });
const GOT = { '모두 삭제함': '"모두 삭제함"', 'kim의 주문 목록': '"kim의 주문 목록"', 'Order(1,kim)': '주문 1번 (주인 kim)', 'EX:AuthorizationDeniedException': '예외 AuthorizationDeniedException' };
const cs = combos(lesson);
let ok = 0;
for (const c of cs) {
  const k = [c.enable, c.m, c.who, c.call].join('|'), sim = lesson.simulate(Object.assign({}, c)), f = real[k];
  if (!f) { console.log('실제 실행 결과 없음: ' + k); continue; }
  // 검사가 실행됐는지는 실제로 센 횟수로, 실행되지 않은 까닭은 빈이 프록시인지로 정한다
  const check = f.checks === '1' ? (f.denies === '1' ? '실행됨: 거부' : '실행됨: 통과') : f.checks === '0' ? (f.proxy === 'false' ? '실행되지 않음 (@EnableMethodSecurity 없음)' : '실행되지 않음 (프록시를 거치지 않음)') : '검사 ' + f.checks + '번';
  const realRow = [check, f.body === '1' ? '실행됨' : f.body === '0' ? '실행되지 않음' : f.body + '번 실행', GOT[f.got] || f.got];
  // 거부 예외는 AccessDeniedException의 한 종류여야 하고, 모형이 말하는 "프록시인가"도 실제와 같아야 한다
  const side = String(sim.j.proxy) === f.proxy && (f.got.startsWith('EX:') ? f.accessDenied === 'true' : f.accessDenied === 'false');
  if (JSON.stringify(sim.row) === JSON.stringify(realRow) && side) ok++;
  else console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + realRow.join(' | ') + (side ? '' : '\n   프록시 여부 또는 예외의 종류가 다름'));
}
console.log('일치 ' + ok + ' / ' + cs.length + (Object.keys(real).length !== cs.length ? '  (실제 실행 줄 수 ' + Object.keys(real).length + ')' : ''));
all.filter(l => l.startsWith('# 참고')).forEach(l => console.log(l));
// 참고: -parameters 없이 컴파일해 실행한 결과 (있으면 보여 준다)
const nf = path.join(__dirname, 'methodsec_noparam_probe.out.txt');
if (fs.existsSync(nf)) { const nl = read(nf); console.log(nl[0]); nl.filter(l => l.startsWith('true|arg|') && l.includes('|ext ')).forEach(l => console.log('  ' + l.split('|proxy')[0])); }
