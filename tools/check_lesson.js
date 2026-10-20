// 실습 하나를 따로 검사한다. 사용: node tools/check_lesson.js <실습 id>
// 다른 실습 파일은 읽지 않으므로, 여러 실습을 동시에 작업하는 중에도 쓸 수 있다.
// 검사: 필수 항목, 예시의 설정 이름, 설명 용어가 kb에 있는지, 문제 파일(정답 4개, sim 대조), 검증 수준 파일, 글 규칙,
//       그리고 모든 설정 조합 실행과 그림 장면(test.js).
const fs = require('fs'), path = require('path'), cp = require('child_process'), whyuse = require('./whyuse.js');
const root = path.join(__dirname, '..'), id = process.argv[2];
if (!id) { console.log('사용: node tools/check_lesson.js <실습 id>'); process.exit(1); }
const ldir = path.join(root, 'src', 'lessons');
const file = fs.readdirSync(ldir).find(f => new RegExp("^  id: '" + id + "', nav:", 'm').test(fs.readFileSync(path.join(ldir, f), 'utf8')));
const errs = [], warns = [];
if (!file) { console.log('실습 파일을 찾지 못함: src/lessons/NN_' + id + ".js 안에 \"  id: '" + id + "', nav:\" 줄이 있어야 합니다"); process.exit(1); }
const list = []; new Function('Lab', fs.readFileSync(path.join(ldir, file), 'utf8'))({ register: l => list.push(l), fmt: x => (Math.round(x * 10) / 10).toFixed(1) });
const l = list[0];
['id', 'nav', 'cat', 'mode', 'title', 'intro', 'terms', 'controls', 'presets', 'code', 'label', 'columns', 'simulate', 'render', 'assume'].forEach(k => { if (l[k] === undefined) errs.push('필수 항목 없음: ' + k); });
if (!['step', 'time'].includes(l.mode)) errs.push('mode는 step 또는 time');
whyuse.lessonErrors(l).forEach(e => errs.push(e)); // 고르는 항목 why(왜 생겼나), use(지금 어디에 쓰나)
(l.presets || []).forEach(p => { if (!p.t || !p.d || !p.v) errs.push('예시 형식 오류: ' + p.t); Object.keys(p.v || {}).forEach(k => { if (!l.controls.some(c => c.id === k)) errs.push('예시 "' + p.t + '"의 알 수 없는 설정: ' + k); }); });
if ((l.presets || []).length < 4) warns.push('예시가 4개보다 적음');
if (!l.presets || l.presets[0].t !== '처음 설정으로') warns.push('첫 예시의 이름은 "처음 설정으로"로 통일');
// 설명 용어
const kb = [];
fs.readdirSync(path.join(root, 'kb')).filter(f => /^kb.*\.js$/.test(f)).forEach(f => { try { kb.push(...require(path.join(root, 'kb', f))); } catch (e) { if (f === 'kb_' + id + '.js') errs.push('kb_' + id + '.js 오류: ' + e.message); } });
(l.terms || []).forEach(t => { if (!kb.some(r => r[1] === t)) errs.push('kb에 없는 용어(이름이 정확히 같아야 함): ' + t); });
if (!(l.terms || []).length) errs.push('terms가 비어 있음');
const myKb = path.join(root, 'kb', 'kb_' + id + '.js');
if (fs.existsSync(myKb)) { const rows = require(myKb), all = kb.map(r => r[1]); rows.forEach(r => { whyuse.kbErrors(r).forEach(e => errs.push('kb_' + id + '.js 형식 오류: ' + r[1] + ' — ' + e)); if (all.filter(n => n === r[1]).length > 1) errs.push('kb에 이미 있는 용어: ' + r[1]); if (r[2].length < 80) warns.push('설명이 너무 짧음: ' + r[1]); }); }
// 문제
const qf = path.join(root, 'src', 'quiz_' + id + '.js');
// 기초개념 실습(basic: true)은 문제 파일이 없어도 된다
if (!fs.existsSync(qf)) { if (!l.basic) errs.push('문제 파일 없음: src/quiz_' + id + '.js'); }
else { const bank = []; try { new Function('Lab', fs.readFileSync(qf, 'utf8'))({ quiz: q => bank.push(...q) }); } catch (e) { errs.push('문제 파일 오류: ' + e.message); }
  if (bank.length < 3) errs.push('문제가 3개보다 적음');
  [1, 2, 3].forEach(lv => { if (!bank.some(q => q.lv === lv)) warns.push('단계 ' + lv + ' 문제가 없음'); });
  bank.forEach((q, i) => { if (![1, 2, 3].includes(q.lv) || q.id !== id || !q.q || !q.why || !Array.isArray(q.a) || q.a.length !== 4 || new Set(q.a).size !== 4) errs.push('문제 ' + (i + 1) + ' 형식 오류(lv, id, q, why, 서로 다른 보기 4개)');
    if (q.sim) { try { const row = l.simulate(Object.assign({}, q.sim.c)).row; if (!String(row[q.sim.col]).includes(q.sim.has)) errs.push('문제 ' + (i + 1) + ': 실습 결과와 다름. 실습=' + row[q.sim.col] + ' 기대=' + q.sim.has); } catch (e) { errs.push('문제 ' + (i + 1) + ' sim 실행 오류: ' + e.message); } } });
  if (!bank.some(q => q.sim)) warns.push('sim으로 실습 결과와 대조하는 문제가 하나도 없음'); }
// 검증 수준
const vf = path.join(root, 'src', 'verify_' + id + '.js');
if (!fs.existsSync(vf)) errs.push('검증 수준 파일 없음: src/verify_' + id + '.js');
else { let v = {}; try { new Function('Lab', fs.readFileSync(vf, 'utf8'))({ verify: o => { v = o; } }); } catch (e) { errs.push('검증 수준 파일 오류: ' + e.message); } if (!v[id] || !['run', 'part', 'doc', 'model'].includes(v[id][0]) || !v[id][1]) errs.push('verify_' + id + ".js 형식: Lab.verify({ " + id + ": ['run', '무엇과 어떻게 대조했는지'] })"); }
// 글 규칙
const texts = [l.title, l.why, l.use, l.intro, l.assume].concat((l.presets || []).map(p => p.t + ' ' + p.d), (l.controls || []).map(c => c.label + ' ' + (c.hint || '')));
try { const c0 = {}; l.controls.forEach(d => c0[d.id] = d.value); const sim = l.simulate(c0); sim.events.forEach(e => texts.push(e.s)); texts.push(...sim.summary); } catch (e) { errs.push('기본 설정으로 실행 실패: ' + e.message); }
texts.forEach(t => { const m = /[가-힣]\((을|를|은|는|이|가|으)\)|\((으)\)로|을\(를\)|은\(는\)|이\(가\)/.exec(t || ''); if (m) warns.push('조사 병기 표현을 풀어 쓸 것: …' + t.slice(Math.max(0, m.index - 12), m.index + 12) + '…'); });
if (!/실행|대조|확인|문서|명세|모형/.test(l.assume || '')) warns.push('assume에 무엇과 대조했는지(또는 확인하지 못했는지)가 적혀 있지 않음');
if (l.draw && !/\/\/ 그림:/.test(fs.readFileSync(path.join(ldir, file), 'utf8'))) warns.push('draw 바로 위에 "// 그림: …" 한 줄 설명을 둘 것');
// 모든 조합 실행과 그림 검사
let out = ''; try { out = cp.execFileSync(process.execPath, [path.join(root, 'test.js'), id], { env: Object.assign({}, process.env, { LAB_ONLY_FILE: file }), encoding: 'utf8' }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); errs.push('test.js 실패'); }
if (/FAIL/.test(out)) errs.push('조합 실행 실패');
console.log(out.trim());
warns.forEach(w => console.log('주의: ' + w));
errs.forEach(e => console.log('오류: ' + e));
console.log(errs.length ? '\n검사 실패 (' + errs.length + '개)' : '\n검사 통과' + (warns.length ? ' (주의 ' + warns.length + '개)' : ''));
process.exit(errs.length ? 1 : 0);
