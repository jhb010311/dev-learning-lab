// 기초개념 "출처(origin)" 실습의 모형 결과를 실제 실행 결과(origin_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 네 열(요청 주소의 출처, 같은 출처인가, 요청이 서버에 도착, 스크립트가 응답을 읽음),
//       스킴·호스트·포트 각각이 같은지(모형의 parts와 Node.js URL로 계산한 값), 막혔을 때 스크립트가 받은 오류(TypeError: Failed to fetch),
//       화면 주소의 출처 계산과 Chrome에서 만든 같은 차이의 결과가 같은 방향인지(realSame), 서버가 본 요청,
//       단계 문장이 기대는 사실(기본 포트 생략, 경로·쿼리는 출처에 안 들어감, 허락 헤더를 달면 읽힘, 서버가 없을 때도 같은 오류),
//       그리고 화면의 코드(code 함수)가 Probe가 쓴 주소와 같은 글인지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('origin_basic');
const lines = fs.readFileSync(path.join(__dirname, 'origin_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, code = {}, notes = [];
lines.forEach(l => {
  if (l.startsWith('# 화면의 코드 ')) { const i = l.indexOf(' = '); code[l.slice('# 화면의 코드 '.length, i)] = JSON.parse(l.slice(i + 3)); return; }
  if (l.startsWith('#')) { notes.push(l); return; }
  if (!l.includes(' => ')) return;
  const [k, v] = l.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
});
const problems = [];
const note = s => notes.find(n => n.startsWith('# ' + s));
// 단계 문장이 기대는 사실
const facts = (note('사실') || '');
['기본포트생략|https://shop.example:443/x=https://shop.example', '포트없음|https://shop.example/x=https://shop.example', '경로쿼리|https://shop.example=https://shop.example', 'http기본포트생략|http://shop.example:80/x=http://shop.example'].forEach(x => { if (!facts.includes(x)) problems.push('사실 없음: ' + x); });
const back = note('근거 스킴 반대'), cors = note('근거 허락 헤더'), closed = note('근거 서버가 없는 포트');
if (!back || !back.includes('읽음=false') || !back.includes('TypeError: Failed to fetch') || !back.includes('서버에 도착=true')) problems.push('스킴 반대 방향이 기대와 다름: ' + back);
if (!cors || !cors.includes('읽음=true') || !cors.includes('본문=상품 3개')) problems.push('허락 헤더를 달아도 읽히지 않음: ' + cors);
if (!closed || !closed.includes('읽음=false') || !closed.includes('TypeError: Failed to fetch') || !closed.includes('서버에 도착=false')) problems.push('서버가 없는 포트의 오류가 막힌 경우와 다름: ' + closed);
let ok = 0, n = 0;
const names = ['scheme', 'host', 'port'], KO = { same: '같은 출처', diff: '다른 출처' };
for (const c of combos(lesson)) {
  n++;
  const k = c.target, f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  const want = [f.origin, f.same === 'true' ? '같은 출처' : '다른 출처', f.arrived === 'true' ? '예' : '아니요', f.read === 'true' ? '예' : '아니요'];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 부분별 같음/다름 (화면 주소를 URL로 계산한 값)
  const wantParts = names.map(x => f[x] === '같음');
  if (JSON.stringify(sim.parts) !== JSON.stringify(wantParts)) probs.push('부분별 모형 ' + JSON.stringify(sim.parts) + ' 실제 ' + JSON.stringify(wantParts));
  // 화면 주소의 판단과 Chrome에서 만든 같은 차이의 판단이 같은 방향인가
  if (f.same !== f.realSame) probs.push('화면 주소의 판단(' + f.same + ')과 Chrome 실험 주소의 판단(' + f.realSame + ')이 다름');
  // Chrome 실험에서 달라진 부분이 화면 주소의 달라진 부분 가운데 하나인가 (스킴 실험은 스킴만, 포트 실험은 포트만 다르게 만들었다)
  const realDiff = f.realParts.split(',').filter(x => x.endsWith('다름')).map(x => x.split(':')[0]);
  const screenDiff = names.filter((x, i) => !wantParts[i]);
  if (realDiff.some(x => !screenDiff.includes(x)) || (realDiff.length === 0) !== (screenDiff.length === 0)) probs.push('Chrome 실험에서 다른 부분 ' + realDiff + ' 화면 주소에서 다른 부분 ' + screenDiff);
  // 막혔을 때의 오류, 읽혔을 때의 상태와 본문
  if (f.read === 'true' && (f.status !== '200' || f.body !== '상품 3개')) probs.push('읽은 상태/본문이 다름: ' + f.status + ' ' + f.body);
  if (f.read === 'false' && (f.errName !== 'TypeError' || f.errMsg !== 'Failed to fetch')) probs.push('막힌 오류가 다름: ' + f.errName + ' ' + f.errMsg);
  // 서버가 본 요청: 모든 조합에서 도착했고 페이지는 한 번만 열렸다. 다른 출처의 요청에는 Origin 헤더가 붙었다.
  if (f.arrived !== 'true') probs.push('요청이 서버에 도착하지 않음');
  if (f.pageLoads !== '1') probs.push('페이지가 열린 횟수 ' + f.pageLoads);
  if (f.same === 'false' && f.originHeader === '(없음)') probs.push('다른 출처 요청에 Origin 헤더가 없음');
  // 화면의 코드 = Probe가 쓴 주소
  const want_code = lesson.code(Object.assign({}, c));
  if (want_code !== code[k]) probs.push('화면의 코드와 Probe의 주소가 다름\n   화면 ' + JSON.stringify(want_code) + '\n   실제 ' + JSON.stringify(code[k]));
  // 코드의 줄: 처음 설정과 다른 줄은 마지막 줄 하나뿐
  const base = lesson.code({ target: 'same' }).split('\n'), mine = want_code.split('\n');
  const changed = mine.map((x, i) => x !== base[i] ? i : -1).filter(i => i >= 0);
  if (k !== 'same' && (changed.length !== 1 || changed[0] !== 3)) probs.push('처음 설정과 다른 줄이 마지막 줄 하나가 아님: ' + changed);
  // 코드 한 줄은 75칸(한글 2칸) 이내
  mine.forEach(x => { const w = [...x].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0); if (w > 75) probs.push('75칸 초과: ' + x); });
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실도 모두 일치)'));
