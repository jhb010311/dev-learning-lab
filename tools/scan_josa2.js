// 한글 낱말 뒤의 조사가 받침과 맞지 않는 곳을 찾는다("값를", "서버을", "요청와", "이름로" 같은 것).
// 실습의 모든 글(고정된 글 + 모든 설정 조합으로 돌려 만든 단계 설명·실행 결과·그림 글자), 개념 설명집, 문제, 용어 풀이를 훑는다.
// 조사처럼 보이지만 낱말의 일부인 것(경로, 효과, 가을 …)은 EXC에 적어 거른다. 남는 것은 사람이 본다.
// 실행: node tools/scan_josa2.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const { loadLessons } = require('../build.js'); const { list } = loadLessons();
const fw = fs.readFileSync(path.join(root, 'src', 'framework.html'), 'utf8').split('/*PIC-BEGIN*/')[1].split('/*PIC-END*/')[0];
const pic = new Function(fw + '; return { picScene: picScene };')();
const jong = ch => { const c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : -1; };
// 낱말 끝이 조사와 같은 글자인 것들 (앞 글자 + 그 글자)
const EXC = new Set(('가을 마을 노을 효과 사과 초과 교과 투과 여과 다과 부과 대과 성과 결과 통과 경과 전과 학과 내과 외과 안과 ' +
  '경로 통로 선로 진로 항로 원로 근로 공로 등로 행로 탄로 용로 회로 피로 수로 도로 미로 화로 위로 새로 서로 바로 따로 대로 실로 절로 별로 날로 홀로 스스로 함부로 억지로 차례로 ' +
  '나은 지은 모은 세은 이은 깊은 높은 같은 많은 작은 좋은 넓은 짧은 젊은 늦은 낮은 굳은 얕은 옅은 붉은 맑은 밝은 늙은 묽은 검은 ' +
  '있는 없는 같는 받는 읽는 찾는 넣는 닫는 묻는 듣는 걷는 믿는 얻는 싣는 씻는 잊는 맺는 좇는 쫓는 맞는 늦는 갖는 낳는 놓는 쌓는 닿는 않는 끊는 앉는 얹는 남는 넘는 담는 삼는 숨는 감는 참는 심는 잡는 접는 좁는 뽑는 입는 집는 업는 굽는 돕는 눕는 줍는 깁는 묶는 닦는 섞는 겪는 볶는 꺾는 깎는 낚는 먹는 막는 적는 죽는 속는 식는 익는 녹는 박는 찍는 묵는 긁는 늙는 밝는 맑는 읊는 밟는 넓는 짧는 핥는 훑는 잃는 끓는 뚫는 꿇는 앓는 옳는 곯는 ' +
  '인가 한가 는가 은가 던가 을까 평가 증가 추가 첨가 참가 인가 허가 국가 작가 전문가 물가 정가 원가 단가 판가 휴가 건가 것인가 ' +
  '들와 봐와 돌아와 들어와 나와 내려와 올라와 따라와 넘어와 건너와 다가와 찾아와 돌아와').split(' '));
const RULES = [
  ['를', k => k > 0, '받침 있는 말 뒤에는 "을"'], ['을', k => k === 0, '받침 없는 말 뒤에는 "를"'],
  ['와', k => k > 0, '받침 있는 말 뒤에는 "과"'], ['과', k => k === 0, '받침 없는 말 뒤에는 "와"'],
  ['은', k => k === 0, '받침 없는 말 뒤에는 "는"'], ['는', k => k > 0, '받침 있는 말 뒤에는 "은"'],
  ['가', k => k > 0, '받침 있는 말 뒤에는 "이"'],
  ['으로', k => k === 0 || k === 8, '받침이 없거나 ㄹ받침이면 "로"'], ['로', k => k > 0 && k !== 8, 'ㄹ이 아닌 받침 뒤에는 "으로"'],
];
const RE = /([가-힣])(으로|를|을|와|과|은|는|가|로)(?=[\s,.)!?"'·:;\]]|$)/g;
const found = {}; let n = 0;
function check(src, where, text) {
  String(text || '').replace(RE, (m, ch, josa, at, all) => {
    const k = jong(ch); if (k < 0) return m;
    const rule = RULES.find(r => r[0] === josa); if (!rule || !rule[1](k)) return m;
    if (josa === '로' && all[at - 1] === '으') return m;
    // 낱말의 일부인지: 앞에서부터 이어진 한글 덩어리의 끝 두세 글자를 본다
    let b = at; while (b > 0 && /[가-힣]/.test(all[b - 1])) b--;
    const word = all.slice(b, at + m.length);
    for (let len = 2; len <= 4; len++) if (EXC.has(word.slice(-len))) return m;
    if ((josa === '는' || josa === '은') && /[았었겠였했됐갔왔봤줬썼났렸졌켰혔꼈뤘웠]$/.test(ch)) return m;      // -았는, -었는 (어미)
    if (josa === '가' && /[는은을던]$/.test(ch)) return m;                                                  // -는가, -은가
    if (josa === '는' && k > 0 && /(하|되|이|리|지|치|키|기|니|시|우|주|두|누|오|보|가|서|사|자|차|나|다)$/.test(all.slice(Math.max(0, at - 1), at))) return m;
    const snip = all.slice(Math.max(0, at - 16), at + m.length + 10).replace(/\s+/g, ' '), key = word + '|' + josa;
    if (!found[key]) { found[key] = 1; n++; console.log(src + ' [' + where + '] …' + snip + '…  (' + rule[2] + ')'); }
    return m;
  });
}
list.forEach(l => {
  check(l.id, '소개', l.intro); check(l.id, '물음', l.title); check(l.id, '전제', l.assume); check(l.id, '이름', l.nav);
  (l.presets || []).forEach(p => { check(l.id, '예시', p.t); check(l.id, '예시 설명', p.d); check(l.id, '물음', p.q); });
  const base = {}; l.controls.forEach(d => { base[d.id] = d.value; check(l.id, '설정', d.label); (d.options || []).forEach(o => check(l.id, '설정', o[1])); });
  (l.columns || []).forEach(c => check(l.id, '결과 표', c));
  const combos = [], opts = l.controls.map(d => d.type === 'select' ? d.options.map(o => o[0]) : d.type === 'check' ? [false, true] : [d.value]);
  if (opts.reduce((a, o) => a * o.length, 1) <= 400) (function go(i, c) { if (i === l.controls.length) { combos.push(Object.assign({}, c)); return; } opts[i].forEach(v => { c[l.controls[i].id] = v; go(i + 1, c); }); })(0, {});
  else combos.push(Object.assign({}, base));
  (l.presets || []).forEach(p => combos.push(Object.assign({}, base, p.v)));
  combos.forEach(c => {
    let sim; try { sim = l.simulate(Object.assign({}, c)); sim.c = c; } catch (e) { return; }
    (sim.events || []).forEach(e => check(l.id, '단계 설명', e.s)); (sim.summary || []).forEach(s => check(l.id, '실행 결과', s)); (sim.row || []).forEach(s => check(l.id, '결과 표', s));
    try { check(l.id, '실행 이름', l.label(c)); } catch (e) {}
    if (l.draw) { const ev = sim.events || [], times = l.mode === 'step' ? ev.map((e, i) => i) : ev.map(e => e.t);
      times.forEach(t => { const shown = l.mode === 'step' ? ev.slice(0, t + 1) : ev.filter(e => e.t <= t + 1e-9); const P = pic.picScene(); try { l.draw(P, sim, shown, l.mode === 'step' ? t : Math.max(0, t)); } catch (e) { return; }
        P.items.forEach(it => { check(l.id, '그림', it.label); check(l.id, '그림', it.title); (it.sub || []).forEach(s => check(l.id, '그림', s)); check(l.id, '그림', it.right); check(l.id, '그림', it.str); }); check(l.id, '그림 설명', P.noteText); }); }
  });
});
// 개념 설명집, 문제, 용어 풀이, 목차는 파일의 글자를 그대로 훑는다
const scanFile = (f, where) => { const s = fs.readFileSync(f, 'utf8'); s.split('\n').forEach(line => check(path.basename(f), where, line)); };
fs.readdirSync(path.join(root, 'kb')).filter(f => /^kb.*\.js$/.test(f)).forEach(f => scanFile(path.join(root, 'kb', f), '개념 설명'));
fs.readdirSync(path.join(root, 'src')).filter(f => /^(quiz|glossary|curriculum|basics|tracks|verify)/.test(f) && f.endsWith('.js')).forEach(f => scanFile(path.join(root, 'src', f), '글'));
console.log(n ? '확인할 곳 ' + n + '곳' : '확인할 곳 없음');
