// "세션 하이재킹과 세션 고정" 실습의 모형 결과를 실제 스프링 시큐리티 서버 실행 결과(sessionfix_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('sessionfix');
const all = fs.readFileSync(path.join(__dirname, 'sessionfix_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const parse = v => { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
const real = {}, extra = {};
all.forEach(l => { if (!l.includes(' => ')) return; const ref = l.startsWith('# 참고 '), [k, v] = l.replace(/^# 참고 /, '').split(' => '); (ref ? extra : real)[k] = parse(v); });
// 실제 응답에서 화면의 네 칸을 만든다
function rowOf(f) {
  const ok = f.attacker === '200:kim', blocked = f.attacker === '302:/login';
  if (!ok && !blocked) return ['예상하지 못한 응답 ' + f.attacker];
  if (f.victim !== '200:kim' || f.login !== '302:/' || f.cartAdd !== '200' || f.preIssued !== 'true' || f.pageNewCookie !== 'false') return ['피해자 쪽 흐름이 예상과 다름'];
  return [f.idChanged === 'true' ? '새 ID로 바뀜' : '로그인 전과 같음', f.cart === '키보드' ? '남아 있음' : f.cart === '-' ? '사라짐' : '?' + f.cart,
    ok ? '200 · kim으로 처리됨' : '302 · 로그인 화면으로 보냄',
    ok ? '막지 못함' : f.knownIsCurrent === 'false' ? '로그인할 때의 세션 ID 교체' : f.logout !== '-' ? '로그아웃 (세션 삭제)' : '알 수 없음'];
}
const cs = combos(lesson);
let ok = 0;
for (const c of cs) {
  const k = [c.fix, c.when, c.logout].join('|'), sim = lesson.simulate(Object.assign({}, c)), f = real[k];
  if (!f) { console.log('실제 실행 결과 없음: ' + k); continue; }
  const realRow = rowOf(f);
  // 화면의 코드에 적은 Set-Cookie 속성도 실제와 같아야 한다
  const attrsOk = f.firstCookieAttrs === 'Path=/; HttpOnly' && (f.idChanged === 'true' ? f.loginCookieAttrs === 'Path=/; HttpOnly' : f.loginCookieAttrs === '-');
  if (JSON.stringify(sim.row) === JSON.stringify(realRow) && attrsOk) ok++;
  else console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + realRow.join(' | ') + (attrsOk ? '' : '\n   Set-Cookie 속성이 다름: ' + f.firstCookieAttrs + ' / ' + f.loginCookieAttrs));
}
console.log('일치 ' + ok + ' / ' + cs.length + (Object.keys(real).length !== cs.length ? '  (실제 실행 줄 수 ' + Object.keys(real).length + ')' : ''));
// 참고: changeSessionId, migrateSession을 명시한 서버가 기본값 서버와 같은 결과를 내는가
let same = 0, n = 0;
Object.keys(extra).forEach(k => { const [, when, logout] = k.split('|'); n++; if (JSON.stringify(rowOf(extra[k])) === JSON.stringify(rowOf(real['default|' + when + '|' + logout]))) same++; else console.log('기본값과 다름: ' + k); });
console.log('참고: changeSessionId, migrateSession을 명시한 서버의 결과가 기본값과 같음 ' + same + ' / ' + n);
all.filter(l => l.startsWith('# 참고 cookie')).forEach(l => console.log(l));
