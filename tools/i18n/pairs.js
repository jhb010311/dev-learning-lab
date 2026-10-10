// 실습 하나의 한국어 글과 영어 글을 나란히 보여 준다(번역 품질을 눈으로 읽어 볼 때 쓴다). 사용: node tools/i18n/pairs.js <실습 id> [예시 번호]
// 제목, 소개, 설정 이름, 예시, 고른 예시(기본은 처음 설정)로 실행한 단계 문장과 요약, 전제를 낸다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), id = process.argv[2], pi = +process.argv[3] || 0;
const koDir = path.join(root, 'src', 'lessons'), enDir = path.join(root, 'src', 'en', 'lessons');
const file = fs.readdirSync(koDir).find(f => new RegExp("^  id: '" + id + "', nav:", 'm').test(fs.readFileSync(path.join(koDir, f), 'utf8')));
const load = p => { const L = []; new Function('Lab', fs.readFileSync(p, 'utf8'))({ register: l => L.push(l), fmt: x => (Math.round(x * 10) / 10).toFixed(1) }); return L[0]; };
const ko = load(path.join(koDir, file)), en = load(path.join(enDir, file));
const pair = (tag, a, b) => console.log('[' + tag + ']\n  KO ' + a + '\n  EN ' + b + '\n');
pair('nav / title', ko.nav + ' / ' + ko.title, en.nav + ' / ' + en.title);
pair('intro', ko.intro, en.intro);
ko.controls.forEach((c, i) => pair('control ' + c.id, c.label + (c.hint ? ' — ' + c.hint : '') + (c.options ? ' [' + c.options.map(o => o[1]).join(' | ') + ']' : ''), en.controls[i].label + (en.controls[i].hint ? ' — ' + en.controls[i].hint : '') + (en.controls[i].options ? ' [' + en.controls[i].options.map(o => o[1]).join(' | ') + ']' : '')));
ko.presets.forEach((p, i) => pair('preset ' + i, p.t + ' — ' + p.d, en.presets[i].t + ' — ' + en.presets[i].d));
const cfg = l => { const c = {}; l.controls.forEach(d => c[d.id] = l.presets[pi].v[d.id] !== undefined ? l.presets[pi].v[d.id] : d.value); if (l.fix) Object.assign(c, l.fix(c) || {}); return c; };
const a = ko.simulate(cfg(ko)), b = en.simulate(cfg(en));
pair('columns', ko.columns.join(' | '), en.columns.join(' | '));
pair('row', a.row.join(' | '), b.row.join(' | '));
a.events.forEach((e, i) => pair('step ' + (i + 1), e.s, b.events[i] ? b.events[i].s : '(없음)'));
a.summary.forEach((s, i) => pair('summary ' + (i + 1), s, b.summary[i]));
pair('assume', ko.assume, en.assume);
