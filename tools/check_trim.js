// 실습 화면의 되풀이를 줄이는 작업(tools/TRIM_GUIDE.md)을 한 뒤, 고치면 안 되는 것이 그대로인지 확인한다.
// 기준 커밋(BASE)의 파일과 지금 파일을 한국어·영어 각각 모든 설정 조합으로 돌려 견준다.
//   그대로여야 하는 것: 결과 표의 행(row), 단계 문장(events), 설정, 예시, 열 이름, 용어, 전제, 코드, 제목
//   달라져도 되는 것: 소개(뒤 문장을 뺀 것만), 실행 결과 요약(줄 수가 줄어든 것만, 조합마다 한 줄 이상), 실행표(render), 그림 설명
// 실행: node tools/check_trim.js <id> [<id> ...]
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), BASE = 'a141cec';
const fmt = x => (Math.round(x * 10) / 10).toFixed(1);
function load(src) { const list = []; new Function('Lab', src)({ register: l => list.push(l), fmt }); return list[0]; }
function combos(l) {
  const vals = l.controls.map(d => d.type === 'check' ? [false, true] : d.type === 'select' ? d.options.map(o => o[0]) : [...new Set([d.min, d.value, d.max])]);
  let out = [{}]; l.controls.forEach((d, i) => { const nx = []; out.forEach(o => vals[i].forEach(v => nx.push({ ...o, [d.id]: v }))); out = nx; });
  l.presets.forEach(p => { const c = {}; l.controls.forEach(d => { c[d.id] = d.value; }); out.push(Object.assign(c, p.v)); });
  return out;
}
const J = x => JSON.stringify(x, (k, v) => typeof v === 'function' ? '[fn]' : v);
let failed = 0;
process.argv.slice(2).forEach(id => {
  const errs = [], notes = [];
  ['', 'en'].forEach(lang => {
    const dir = path.join('src', lang, 'lessons').replace(/\\/g, '/'), file = fs.readdirSync(path.join(root, dir)).filter(f => fs.readFileSync(path.join(root, dir, f), 'utf8').split('\n').some(l => l.trim().startsWith("id: '" + id + "', nav:")))[0]; // 실습의 id 줄만 본다(설정의 id와 헷갈리지 않게)
    if (!file) { errs.push((lang || 'ko') + ': 실습 파일 없음'); return; }
    const tag = lang || 'ko';
    let old; try { old = load(cp.execFileSync('git', ['show', BASE + ':' + dir + '/' + file], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 })); } catch (e) { errs.push(tag + ': 기준 커밋에서 파일을 읽지 못함'); return; }
    let cur; try { cur = load(fs.readFileSync(path.join(root, dir, file), 'utf8')); } catch (e) { errs.push(tag + ': 지금 파일이 실행되지 않음: ' + e.message); return; }
    ['id', 'nav', 'cat', 'mode', 'title', 'terms', 'columns', 'assume'].forEach(k => { if (J(old[k]) !== J(cur[k])) errs.push(tag + ': ' + k + '가 바뀜'); });
    if (J(old.controls.map(d => [d.id, d.label, d.type, d.value, d.options, d.min, d.max, d.hint])) !== J(cur.controls.map(d => [d.id, d.label, d.type, d.value, d.options, d.min, d.max, d.hint]))) errs.push(tag + ': 설정(controls)이 바뀜');
    if (J(old.presets) !== J(cur.presets)) errs.push(tag + ': 예시(presets)가 바뀜');
    if (old.intro !== cur.intro) { if (!old.intro.startsWith(cur.intro) || cur.intro.length < 30) errs.push(tag + ': 소개는 뒤 문장을 빼는 것만 됨'); else notes.push(tag + ' 소개 ' + old.intro.length + '→' + cur.intro.length + '자'); }
    let sumOld = 0, sumCur = 0, n = 0;
    combos(old).forEach(c => {
      n++; let a, b; try { a = old.simulate({ ...c }); b = cur.simulate({ ...c }); } catch (e) { errs.push(tag + ': 조합 ' + J(c) + '에서 오류 ' + e.message); return; }
      if (J(a.row) !== J(b.row)) errs.push(tag + ': 결과 표의 행이 바뀜 ' + J(c));
      if (J(a.events.map(e => [e.t, e.k, e.s])) !== J(b.events.map(e => [e.t, e.k, e.s]))) errs.push(tag + ': 단계 문장(events)이 바뀜 ' + J(c));
      if (J(old.label(c)) !== J(cur.label(c))) errs.push(tag + ': label이 바뀜');
      if (typeof old.code === 'function' && J(old.code({ ...c })) !== J(cur.code({ ...c }))) errs.push(tag + ': 코드가 바뀜 ' + J(c));
      if (!b.summary || b.summary.length < 1) errs.push(tag + ': 실행 결과 요약이 비었음 ' + J(c));
      if (b.summary.length > a.summary.length) errs.push(tag + ': 실행 결과 요약의 줄이 늘었음 ' + J(c));
      b.summary.forEach(s => { if (/undefined|NaN|\[object/.test(String(s))) errs.push(tag + ': 요약에 이상한 글자 ' + s); });
      sumOld += a.summary.length; sumCur += b.summary.length;
    });
    notes.push(tag + ' 요약 줄 ' + sumOld + '→' + sumCur + ' (조합 ' + n + '개)');
  });
  const uniq = [...new Set(errs)];
  console.log(id + ': ' + (uniq.length ? '실패\n  ' + uniq.slice(0, 12).join('\n  ') : '통과') + ' | ' + notes.join(', '));
  if (uniq.length) failed++;
});
process.exit(failed ? 1 : 0);
