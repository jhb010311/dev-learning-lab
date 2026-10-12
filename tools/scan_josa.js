// 숫자나 영문자 뒤에 붙은 조사가 틀린 곳을 찾는다("스레드 2을", "요청 4은"처럼 값을 문장에 끼워 넣다 생기는 것).
// 실습을 모든 설정 조합(고르기·켜고 끄기)과 예시로 돌려, 단계 설명·실행 결과·결과 표·그림 글자·물음·예시 설명을 훑는다.
// 실행: node tools/scan_josa.js
const fs = require('fs'), path = require('path');
const { loadLessons } = require('../build.js'); const { list } = loadLessons();
const fw = fs.readFileSync(path.join(__dirname, '..', 'src', 'framework.html'), 'utf8').split('/*PIC-BEGIN*/')[1].split('/*PIC-END*/')[0];
const pic = new Function(fw + '; return { picScene: picScene };')();
// 숫자의 마지막 자리: 받침 있음(0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔), 그중 ㄹ받침(1, 7, 8)은 "로"
const FINAL = { 0: 1, 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 };            // 1 받침, 2 ㄹ받침, 없으면 받침 없음
const LETTER = { L: 2, M: 1, N: 1, R: 2 };                        // 엘, 엠, 엔, 알
const PAIRS = [['을', '를'], ['이', '가'], ['은', '는'], ['과', '와'], ['으로', '로']];
function wrong(kind, josa) {
  for (const [a, b] of PAIRS) {
    if (josa !== a && josa !== b) continue;
    if (a === '으로') return (kind === 1 ? '으로' : '로') !== josa;
    return (kind ? a : b) !== josa;
  }
  return false;
}
// 조사 뒤가 띄어쓰기나 문장 부호일 때만 조사로 본다("2가지", "3이상" 같은 낱말은 뺀다)
const RE = /(\d+|[A-Z])(으로|을|를|이|가|은|는|과|와|로)(?=[\s,.)!?"'·:;]|$)/g;
const found = {}; let n = 0;
function check(id, where, text) {
  String(text || '').replace(RE, (m, tok, josa, at, all) => {
    const before = all[at - 1] || '';
    if (/[\d.,A-Za-z_$@#/:=<>+\-*%]/.test(before)) return m;         // 소수, 식별자, 식의 일부
    if (/^[A-Z]$/.test(tok) && /[A-Za-z]/.test(all[at + m.length] || '')) return m;
    const kind = /^\d/.test(tok) ? (FINAL[tok[tok.length - 1]] || 0) : (LETTER[tok] || 0);
    if (!wrong(kind, josa)) return m;
    const snip = all.slice(Math.max(0, at - 18), at + m.length + 12).replace(/\s+/g, ' '), key = id + '|' + snip.replace(/\d+/g, '#');
    if (!found[key]) { found[key] = 1; n++; console.log(id + ' [' + where + '] …' + snip + '…'); }
    return m;
  });
}
list.forEach(l => {
  check(l.id, '소개', l.intro); check(l.id, '물음', l.title); check(l.id, '전제', l.assume);
  (l.presets || []).forEach(p => { check(l.id, '예시', p.t); check(l.id, '예시 설명', p.d); check(l.id, '물음', p.q); });
  const base = {}; l.controls.forEach(d => { base[d.id] = d.value; check(l.id, '설정', d.label); (d.options || []).forEach(o => check(l.id, '설정', o[1])); });
  const combos = []; const opts = l.controls.map(d => d.type === 'select' ? d.options.map(o => o[0]) : d.type === 'check' ? [false, true] : [d.value]);
  let total = opts.reduce((a, o) => a * o.length, 1);
  if (total <= 400) (function go(i, c) { if (i === l.controls.length) { combos.push(Object.assign({}, c)); return; } opts[i].forEach(v => { c[l.controls[i].id] = v; go(i + 1, c); }); })(0, {});
  else combos.push(Object.assign({}, base));
  (l.presets || []).forEach(p => combos.push(Object.assign({}, base, p.v)));
  combos.forEach(c => {
    let sim; try { sim = l.simulate(Object.assign({}, c)); sim.c = c; } catch (e) { return; }
    (sim.events || []).forEach(e => check(l.id, '단계 설명', e.s)); (sim.summary || []).forEach(s => check(l.id, '실행 결과', s)); (sim.row || []).forEach(s => check(l.id, '결과 표', s));
    try { check(l.id, '실행 이름', l.label(c)); check(l.id, '코드', ''); } catch (e) {}
    if (l.draw) { const ev = sim.events || [], times = l.mode === 'step' ? ev.map((e, i) => i) : ev.map(e => e.t);
      times.forEach(t => { const shown = l.mode === 'step' ? ev.slice(0, t + 1) : ev.filter(e => e.t <= t + 1e-9); const P = pic.picScene(); try { l.draw(P, sim, shown, l.mode === 'step' ? t : Math.max(0, t)); } catch (e) { return; }
        P.items.forEach(it => { check(l.id, '그림', it.label); check(l.id, '그림', it.title); (it.sub || []).forEach(s => check(l.id, '그림', s)); check(l.id, '그림', it.right); check(l.id, '그림', it.str); }); check(l.id, '그림 설명', P.noteText); }); }
  });
});
console.log(n ? '조사가 틀린 곳 ' + n + '곳' : '조사가 틀린 곳 없음');
