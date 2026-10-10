// "JWT의 구조와 검증" 실습의 모형을 실제 계산 결과와 대조한다.
//  1) jwt_probe.out.txt  : Node.js crypto로 토큰을 만들고 검증한 결과 (조합마다 한 줄)
//  2) ../plain/JwtProbe.out.txt : 화면의 자바 코드를 JDK에서 실행한 결과 (있으면 함께 대조)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('jwt');
const read = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean);
const all = read(path.join(__dirname, 'jwt_probe.out.txt'));
console.log(all[0]);
const meta = {}; all.filter(l => l.startsWith('# ') && /^# [a-z]+\.[a-zA-Z0-9]+ /.test(l)).forEach(l => { const m = /^# (\S+) (.*)$/.exec(l); meta[m[1]] = m[2]; });
const real = {}; all.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
const SIG = { match: '일치', mismatch: '불일치', 'not-checked': '건너뜀 (alg가 none)', 'alg-rejected': '하지 않음 (alg에서 거절)' }, EXP = { valid: '만료 전', expired: '만료됨', skipped: '하지 않음 (앞에서 거절)' };
const cs = combos(lesson);
let ok = 0;
for (const c of cs) {
  const k = [c.tok, c.time, c.policy].join('|'), sim = lesson.simulate(Object.assign({}, c)), r = real[k];
  if (!r) { console.log('실제 실행 결과 없음: ' + k); continue; }
  const realRow = [SIG[r[0]], EXP[r[1]], r[2] === 'accept' ? '통과' : '거절', r[3] === '-' ? '없음' : r[3]];
  // 화면에 보이는 토큰 글자와 풀어 본 내용도 실제 값과 같아야 한다
  const dec = meta['decoded.' + c.tok], tokOk = sim.tk.text === meta['token.' + c.tok] && sim.tk.header + ' ' + sim.tk.payload === dec && sim.tk.expect === (c.tok === 'ok' ? meta['sig.ok'] : meta['sig.serverForAdmin']);
  if (JSON.stringify(sim.row) === JSON.stringify(realRow) && tokOk) ok++;
  else console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + realRow.join(' | ') + (tokOk ? '' : '\n   토큰 글자 또는 풀어 본 내용이 다름'));
}
console.log('일치 ' + ok + ' / ' + cs.length + (Object.keys(real).length !== cs.length ? '  (실제 실행 줄 수 ' + Object.keys(real).length + ')' : ''));
// 화면의 시각 값
const V = lesson.V, t = /exp (\d+) = (\S+) \| before (\d+) = (\S+) \| after (\d+) = (\S+)/.exec(all[1]);
console.log('시각 값(exp, 만료 전, 만료 뒤) ' + (t && +t[1] === V.exp && +t[3] === V.now.before && +t[5] === V.now.after && t[2] === '2026-01-01T00:00:00.000Z' && t[4] === '2025-12-31T23:50:00.000Z' && t[6] === '2026-01-01T00:01:00.000Z' ? '일치' : '다름'));
// 자바로 실행한 결과
const jf = path.join(__dirname, '..', 'plain', 'JwtProbe.out.txt');
if (fs.existsSync(jf)) {
  const jl = read(jf), jreal = {}; jl.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const [k, v] = l.split(' => '); jreal[k] = v; });
  const jtok = {}; jl.filter(l => l.startsWith('# token.')).forEach(l => { const m = /^# token\.(\S+) (.*)$/.exec(l); jtok[m[1]] = m[2]; });
  const WHY = { mismatch: 'reject:서명 불일치', 'alg-rejected': 'reject:허용하지 않는 알고리즘' };
  let jok = 0;
  for (const c of cs) {
    const k = [c.tok, c.time, c.policy].join('|'), sim = lesson.simulate(Object.assign({}, c)), r = real[k] || [];
    const want = r[2] === 'accept' ? 'accept|' + r[3] : (WHY[r[0]] || 'reject:만료됨') + '|-';
    if (jreal[k] === want && jtok[c.tok] === sim.tk.text) jok++; else console.log('자바 실행과 다름: ' + k + '  자바 ' + jreal[k] + '  Node ' + want);
  }
  console.log(jl[0]);
  console.log('자바 실행과 일치 ' + jok + ' / ' + cs.length);
}
