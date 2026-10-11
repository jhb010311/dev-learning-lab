// 영어로 옮긴 실습 하나를 한국어 원본과 대조해 검사한다. 사용: node tools/i18n/check_en.js <실습 id>
// 번역은 글자만 바꾸는 일이다. 모형의 동작이 달라지면 안 되므로 다음을 본다.
//   1. 파일: src/en/lessons/<같은 파일 이름>, 줄 수가 같고, 한글이 없는 줄은 원본과 글자 하나까지 같다. 영어 파일에 한글이 남아 있지 않다.
//   2. 설정(id, 종류, 값, 선택지의 값)과 예시의 설정값이 같다.
//   3. 모든 설정 조합과 예시를 양쪽에서 돌려 결과의 뼈대가 같다: 사건의 수와 종류, 숫자, 한글이 없던 글자는 그대로, 한글이던 글자는 한글 없는 글자로.
//      render가 부르는 그리기 도구의 순서와 draw가 만드는 장면(상자·화살표의 id와 종류)도 같다.
//   4. terms가 용어 대조표(src/en/termbase)의 영어 이름이고 영어 설명집(kb/en)에 있다.
//   5. 문제(src/en/quiz_<id>.js): 한국어판과 개수·단계·sim 설정이 같고, sim이 영어 모형의 결과와 맞는다.
//   6. 검증 수준(src/en/verify_<id>.js)의 수준이 같다. 설명집(kb/en/kb_<id>.js)의 용어 수가 같다.
//   7. 영어 실습을 test.js로 돌린다(그림 밖으로 나간 글자, 칸이 좁아 잘리는 글자).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..', '..'), id = process.argv[2];
if (!id) { console.log('사용: node tools/i18n/check_en.js <실습 id>'); process.exit(1); }
const HAN = /[가-힣]/, errs = [], warns = [], MAPS = require('./maps.js');
// 영어판에도 남아야 하는 한글 데이터(src/en/hangul_ok.js)는 한글 검사에서 뺀다
const OKH = (() => { try { return require(path.join(root, 'src', 'en', 'hangul_ok.js'))[id] || []; } catch (e) { return []; } })();
const HANEN = s => HAN.test(OKH.reduce((a, w) => a.split(w).join(''), String(s)));
const err = m => { if (errs.length < 60) errs.push(m); else if (errs.length === 60) errs.push('… (오류가 더 있음)'); };
const koDir = path.join(root, 'src', 'lessons'), enDir = path.join(root, 'src', 'en', 'lessons');
const file = fs.readdirSync(koDir).find(f => new RegExp("^  id: '" + id + "', nav:", 'm').test(fs.readFileSync(path.join(koDir, f), 'utf8')));
if (!file) { console.log('한국어 실습 파일을 찾지 못함: ' + id); process.exit(1); }
if (!fs.existsSync(path.join(enDir, file))) { console.log('영어 실습 파일이 없음: src/en/lessons/' + file); process.exit(1); }
const read = p => fs.readFileSync(p, 'utf8').split('\r\n').join('\n');
const koSrc = read(path.join(koDir, file)), enSrc = read(path.join(enDir, file));
const fmt = x => (Math.round(x * 10) / 10).toFixed(1);
function load(src) { const list = []; new Function('Lab', src)({ register: l => list.push(l), fmt }); return list[0]; }
let ko, en; try { ko = load(koSrc); en = load(enSrc); } catch (e) { console.log('오류: 실습 파일을 읽지 못함: ' + e.message); process.exit(1); }

// 1. 파일
const kl = koSrc.split('\n'), el = enSrc.split('\n');
if (kl.length !== el.length) err('줄 수가 다름: 한국어 ' + kl.length + '줄, 영어 ' + el.length + '줄 (줄을 합치거나 나누지 말 것)');
else {
  // 따옴표와 역따옴표 안의 글자를 지운 나머지(코드의 뼈대)를 비교한다. 정확한 구문 분석은 아니므로 다르면 "주의"로만 알린다.
  const bone = l => l.replace(/\/\/.*$/, '').replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, 'S').replace(/\s+/g, '');
  let boneDiff = 0;
  kl.forEach((l, i) => {
    if (!HAN.test(l)) { if (l !== el[i]) err('한글이 없는 줄이 원본과 다름 (' + (i + 1) + '줄): ' + el[i].trim().slice(0, 80)); }
    else if (bone(l) !== bone(el[i])) { boneDiff++; if (boneDiff <= 8) warns.push('코드의 뼈대가 달라 보임 (' + (i + 1) + '줄). 글자만 바꿨는지 확인: ' + el[i].trim().slice(0, 70)); }
  });
  if (boneDiff > 8) warns.push('코드의 뼈대가 달라 보이는 줄이 모두 ' + boneDiff + '개');
}
el.forEach((l, i) => { if (HANEN(l)) err('영어 파일에 한글이 남음 (' + (i + 1) + '줄): ' + l.trim().slice(0, 70)); });

// 뼈대 비교: 숫자·참거짓은 같아야 하고, 한글이 없던 글자는 그대로, 한글이던 글자는 한글 없는 글자여야 한다
function same(a, b, at) {
  if (typeof a === 'function' || typeof b === 'function') return;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (typeof a !== typeof b) return err(at + ': 종류가 다름 ' + JSON.stringify(a) + ' / ' + JSON.stringify(b));
    if (typeof a === 'string') { if (HAN.test(a)) { if (!b || HANEN(b)) err(at + ': 옮기지 않은 글자 ' + JSON.stringify(b)); } else if (a !== b) err(at + ': 한글이 없던 글자가 바뀜 ' + JSON.stringify(a) + ' → ' + JSON.stringify(b)); return; }
    if (a !== b && !(a !== a && b !== b)) err(at + ': 값이 다름 ' + a + ' / ' + b); return;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return err(at + ': 배열 여부가 다름');
  if (Array.isArray(a)) { if (a.length !== b.length) return err(at + ': 길이가 다름 ' + a.length + ' / ' + b.length); a.forEach((x, i) => same(x, b[i], at + '[' + i + ']')); return; }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return err(at + ': 항목 수가 다름 ' + ka.join(',') + ' / ' + kb.join(','));
  ka.forEach((k, i) => { if (!HAN.test(k) && k !== kb[i]) return err(at + ': 항목 이름이 다름 ' + k + ' / ' + kb[i]); same(a[k], b[kb[i]], at + '.' + k); });
}

// 2. 설정과 예시
if (ko.id !== en.id || ko.mode !== en.mode) err('id, mode는 원본과 같아야 함');
if (en.cat !== MAPS.CAT[ko.cat]) err('cat은 ' + JSON.stringify(MAPS.CAT[ko.cat]) + ' 이어야 함 (tools/i18n/maps.js)');
if (en.presets[0] && en.presets[0].t !== MAPS.FIRST_PRESET) err('첫 예시의 이름은 ' + JSON.stringify(MAPS.FIRST_PRESET) + ' 이어야 함');
en.presets.forEach(p => { if (!p.t || !p.d || HANEN(p.t + p.d)) err('예시의 이름이나 설명에 한글이 남음: ' + p.t); });
['title', 'nav', 'intro', 'assume'].forEach(k => { if (!en[k] || HANEN(en[k])) err(k + '가 없거나 한글이 남음'); });
same(ko.controls.map(c => ({ id: c.id, type: c.type, value: c.value, min: c.min, max: c.max, step: c.step, opts: (c.options || []).map(o => o[0]) })), en.controls.map(c => ({ id: c.id, type: c.type, value: c.value, min: c.min, max: c.max, step: c.step, opts: (c.options || []).map(o => o[0]) })), 'controls');
same(ko.presets.map(p => p.v), en.presets.map(p => p.v), 'presets.v');
if (ko.columns.length !== en.columns.length) err('columns의 수가 다름');
if (!!ko.draw !== !!en.draw) err('draw의 유무가 다름');

// 3. 모든 조합 실행
const fw = read(path.join(root, 'src', 'framework.html'));
const pic = new Function(fw.split('/*PIC-BEGIN*/')[1].split('/*PIC-END*/')[0] + '; return { picScene: picScene };')();
function combos(l) {
  const vals = l.controls.map(d => d.type === 'check' ? [false, true] : d.type === 'select' ? d.options.map(o => o[0]) : [...new Set([d.min, d.value, d.max])]);
  let out = [{}]; l.controls.forEach((d, i) => { out = out.flatMap(c => vals[i].map(v => Object.assign({}, c, { [d.id]: v }))); });
  l.presets.forEach(p => { const c = {}; l.controls.forEach(d => c[d.id] = p.v[d.id] !== undefined ? p.v[d.id] : d.value); out.push(c); });
  return out;
}
function runAll(l, c) {
  c = Object.assign({}, c); if (l.fix) Object.assign(c, l.fix(c) || {});
  const sim = l.simulate(c); sim.c = c;
  if (l.mode === 'step') { sim.events.forEach((e, i) => e.t = i + 1); sim.total = sim.events.length; }
  const calls = [], stub = () => new Proxy(function () {}, { get: (t, k) => k === 'appendChild' ? (x => x) : k === 'style' ? {} : stub(), apply: () => stub() });
  const H = new Proxy({}, { get: (t, k) => k === 'fmt' ? fmt : (() => { calls.push(String(k)); return stub(); }) });
  const scenes = [], cuts = [];
  [0].concat(sim.events.map(e => e.t), [sim.total]).forEach(t => {
    const shown = sim.events.filter(e => e.t <= t + 1e-9);
    l.render(stub(), sim, t, H, shown);
    if (l.draw) { const P = pic.picScene(); l.draw(P, sim, shown, t); scenes.push(P.items.map(it => ({ k: it.k, id: it.id, cls: it.cls || '' })));
      // 순서 그림의 화살표 글자와 P.fit으로 줄인 글자는 길면 끝이 "…"로 잘린다(test.js는 상자의 제목만 본다)
      P.items.forEach(it => [it.label, it.title, it.right, it.str].concat(it.sub || []).forEach(x => { if (typeof x === 'string' && /…$/.test(x)) cuts.push(x); })); }
  });
  return { sim, calls, scenes, cuts, code: String(l.code(c)), label: String(l.label(c)) };
}
let ran = 0, sceneDiff = 0; const cutSeen = new Set();
if (!errs.length) for (const c of combos(ko)) {
  const before = errs.length, at = JSON.stringify(c);
  let a, b; try { a = runAll(ko, c); b = runAll(en, c); } catch (e) { err('실행 오류 ' + at + ': ' + e.message); break; }
  same(a.sim, b.sim, 'sim');
  if (a.calls.join() !== b.calls.join()) err('render가 부르는 그리기 도구의 순서가 다름');
  // 상자의 id가 한글 데이터(상품 이름 등)로 만들어지는 실습이 있다. 그런 id는 영어판에서 달라질 수밖에 없으므로, 한글이 없는 글자이기만 하면 같은 것으로 본다.
  const norm = (sc, ref) => JSON.stringify(sc.map((items, i) => items.map((it, j) => { const r = ref[i] && ref[i][j]; return { k: it.k, cls: it.cls, id: r && HAN.test(r.id) && !HANEN(it.id) ? '§' : HAN.test(it.id) ? '§' : it.id }; })));
  if (norm(a.scenes, a.scenes) !== norm(b.scenes, a.scenes)) sceneDiff++;
  // 한국어판에서는 잘리지 않던 글자가 영어판에서 "…"로 잘리면 글자를 줄여야 한다
  if (b.cuts.length > a.cuts.length) b.cuts.forEach(x => cutSeen.add(x));
  const ac = a.code.split('\n'), bc = b.code.split('\n');
  if (ac.length !== bc.length) err('code의 줄 수가 다름'); else ac.forEach((l, i) => { if (!HAN.test(l) && l !== bc[i]) err('code에서 한글이 없던 줄이 바뀜: ' + bc[i].trim().slice(0, 60)); });
  [b.code, b.label].concat(b.sim.summary, b.sim.row.map(String), b.sim.events.map(e => e.s)).forEach(x => { if (HANEN(x)) err('결과에 한글이 남음: ' + String(x).slice(0, 60)); });
  if (errs.length > before) { errs.splice(before, 0, '── 설정 ' + at + ' 에서:'); break; }
  ran++;
}
if (cutSeen.size) err('그림에서 끝이 "…"로 잘리는 글자가 ' + cutSeen.size + '개 (한국어판보다 많음). 뜻이 달라지지 않게 줄일 것: ' + [...cutSeen].slice(0, 8).map(x => JSON.stringify(x)).join(', '));
if (sceneDiff) err('그림(draw)의 장면이 다른 조합이 ' + sceneDiff + '개 (상자·화살표의 id, 종류, 색이 원본과 같아야 함)');

// 4. 용어
const tbDir = path.join(root, 'src', 'en', 'termbase'), tb = {};
if (fs.existsSync(tbDir)) fs.readdirSync(tbDir).filter(f => f.endsWith('.js')).forEach(f => require(path.join(tbDir, f)).forEach(r => { tb[r.ko] = r.en; }));
const kbEnDir = path.join(root, 'kb', 'en'), kbEn = [];
if (fs.existsSync(kbEnDir)) fs.readdirSync(kbEnDir).filter(f => /^kb.*\.js$/.test(f)).forEach(f => { try { kbEn.push(...require(path.join(kbEnDir, f))); } catch (e) { err('kb/en/' + f + ' 오류: ' + e.message); } });
if (ko.terms.length !== en.terms.length) err('terms의 수가 다름');
else ko.terms.forEach((t, i) => { if (!tb[t]) warns.push('용어 대조표에 없는 용어: ' + t); else if (tb[t] !== en.terms[i]) err('terms[' + i + ']는 용어 대조표의 이름이어야 함: ' + JSON.stringify(tb[t]) + ' (지금 ' + JSON.stringify(en.terms[i]) + ')'); if (!kbEn.some(r => r[1] === en.terms[i])) err('영어 설명집(kb/en)에 없는 용어: ' + en.terms[i]); });
const myKb = path.join(root, 'kb', 'kb_' + id + '.js'), myKbEn = path.join(kbEnDir, 'kb_' + id + '.js');
if (fs.existsSync(myKb)) {
  if (!fs.existsSync(myKbEn)) err('영어 설명집 파일이 없음: kb/en/kb_' + id + '.js');
  else { const a = require(myKb), b = require(myKbEn); if (a.length !== b.length) err('kb_' + id + '.js의 용어 수가 다름'); else a.forEach((r, i) => { if (b[i].length !== 3 || b[i].some(x => !x || HANEN(x))) err('kb/en/kb_' + id + '.js ' + (i + 1) + '번째: 형식 오류이거나 한글이 남음'); if (b[i][0] !== MAPS.KBCAT[r[0]]) err('kb/en/kb_' + id + '.js ' + (i + 1) + '번째 분류는 ' + JSON.stringify(MAPS.KBCAT[r[0]]) + ' 이어야 함'); if (tb[r[1]] && tb[r[1]] !== b[i][1]) err('kb/en/kb_' + id + '.js ' + (i + 1) + '번째 용어 이름은 대조표의 ' + JSON.stringify(tb[r[1]]) + ' 이어야 함'); if (b[i][2] && b[i][2].length < 120) warns.push('설명이 너무 짧음: ' + b[i][1]); }); }
}

// 5. 문제
const koQ = []; fs.readdirSync(path.join(root, 'src')).filter(f => /^quiz.*\.js$/.test(f)).sort().forEach(f => new Function('Lab', read(path.join(root, 'src', f)))({ quiz: q => koQ.push(...q.filter(x => x.id === id)) }));
const qf = path.join(root, 'src', 'en', 'quiz_' + id + '.js');
if (!fs.existsSync(qf)) err('영어 문제 파일이 없음: src/en/quiz_' + id + '.js');
else { const enQ = []; try { new Function('Lab', read(qf))({ quiz: q => enQ.push(...q) }); } catch (e) { err('영어 문제 파일 오류: ' + e.message); }
  if (HANEN(read(qf))) err('영어 문제 파일에 한글이 남음');
  if (enQ.length !== koQ.length) err('문제 수가 다름: 한국어 ' + koQ.length + '개, 영어 ' + enQ.length + '개');
  else enQ.forEach((q, i) => { const k = koQ[i], at = '문제 ' + (i + 1);
    if (q.id !== id || q.lv !== k.lv) err(at + ': id나 lv가 원본과 다름');
    if (!q.q || !q.why || !Array.isArray(q.a) || q.a.length !== 4 || new Set(q.a).size !== 4) err(at + ': 질문, 해설, 서로 다른 보기 4개가 필요');
    if (!!q.sim !== !!k.sim) err(at + ': sim의 유무가 원본과 다름');
    else if (q.sim) { if (JSON.stringify(q.sim.c) !== JSON.stringify(k.sim.c) || q.sim.col !== k.sim.col || (q.sim.id || '') !== (k.sim.id || '')) err(at + ': sim의 설정(c, col)이 원본과 다름');
      if (!q.sim.id) { try { const row = en.simulate(Object.assign({}, q.sim.c)).row; if (!String(row[q.sim.col]).includes(q.sim.has)) err(at + ': 영어 모형의 결과와 다름. 모형=' + row[q.sim.col] + ' 기대=' + q.sim.has); } catch (e) { err(at + ' sim 실행 오류: ' + e.message); } } } }); }

// 6. 검증 수준
const koV = {}; fs.readdirSync(path.join(root, 'src')).filter(f => /^verify.*\.js$/.test(f)).forEach(f => new Function('Lab', read(path.join(root, 'src', f)))({ verify: v => Object.assign(koV, v) }));
const vf = path.join(root, 'src', 'en', 'verify_' + id + '.js');
if (!fs.existsSync(vf)) err('영어 검증 수준 파일이 없음: src/en/verify_' + id + '.js');
else { let v = {}; try { new Function('Lab', read(vf))({ verify: o => { v = o; } }); } catch (e) { err('영어 검증 수준 파일 오류: ' + e.message); }
  if (!v[id] || v[id][0] !== koV[id][0] || !v[id][1] || HANEN(v[id][1])) err('verify_' + id + '.js: 수준은 원본과 같은 ' + koV[id][0] + ' 이어야 하고 설명에 한글이 없어야 함'); }

// 7. 영어 실습의 조합 실행과 그림 검사
let out = ''; try { out = cp.execFileSync(process.execPath, [path.join(root, 'test.js'), id], { env: Object.assign({}, process.env, { LAB_LANG: 'en', LAB_ONLY_FILE: file }), encoding: 'utf8' }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); err('test.js 실패'); }
if (/FAIL/.test(out)) err('영어 실습의 조합 실행 실패');
// 상자 안에서 잘리는 글자가 한국어판보다 많으면 안 된다
{ const n = s => +((/잘리는 글자 (\d+)개/.exec(s) || [])[1] || 0); let koOut = ''; try { koOut = cp.execFileSync(process.execPath, [path.join(root, 'test.js'), id], { env: Object.assign({}, process.env, { LAB_LANG: '', LAB_ONLY_FILE: file }), encoding: 'utf8' }); } catch (e) { koOut = e.stdout || ''; }
  if (n(out) > n(koOut)) err('그림의 상자에서 잘리는 글자가 ' + n(out) + '개 (한국어판은 ' + n(koOut) + '개). 아래 목록의 글자를 줄일 것'); }
console.log(out.trim().split('\n').slice(0, 60).join('\n'));
console.log('한국어 원본과 뼈대를 대조한 조합: ' + ran + '개');
warns.forEach(w => console.log('주의: ' + w));
errs.forEach(e => console.log(e.startsWith('──') ? e : '오류: ' + e));
console.log(errs.length ? '\n검사 실패 (' + errs.filter(e => !e.startsWith('──')).length + '개)' : '\n검사 통과' + (warns.length ? ' (주의 ' + warns.length + '개)' : ''));
process.exit(errs.length ? 1 : 0);
