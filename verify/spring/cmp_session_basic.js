// 기초개념 "세션" 실습의 모형 결과를 실제 스프링 부트 실행 결과(session_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 코드(Probe가 컴파일해 실행한 소스와 같은 글인지), 단계 문장이 기대는 사실을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('session_basic');
const lines = fs.readFileSync(path.join(__dirname, 'session_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]); console.log(lines[1]);
const body = lines.filter(l => !l.startsWith('# '));
// Probe가 쓴 소스에서 package, import, 클래스 선언, Probe 전용 블록을 빼고 들여쓰기를 걷어 낸다
function strip(src) {
  let t = src.replace(/\\n/g, '\n');
  t = t.replace(/\n\s*\/\/ \[probe-only\][\s\S]*?\/\/ \[\/probe-only\]\n/, '\n');
  const ls = t.split('\n').filter(l => !/^(package|import) /.test(l));
  const a = ls.findIndex(l => /^public class SessionController \{/.test(l)), z = ls.lastIndexOf('}');
  return ls.slice(a + 1, z).map(l => l.replace(/^    /, '')).join('\n').trim();
}
const storeText = s => { const m = /^(\d+)\[(.*)\]$/.exec(s); const n = +m[1]; return n === 0 ? '세션 없음' : '세션 ' + n + '개: ' + (m[2] === '-' ? '비어 있음' : m[2]); };
let ok = 0, extraOk = 0, extraAll = 0;
for (const ln of body) {
  const i0 = ln.indexOf(' => '), k = ln.slice(0, i0), v = ln.slice(i0 + 4), [saveS, second] = k.split('|'), save = saveS === 'true', f = {};
  if (v.startsWith('COMPILE_ERROR')) { console.log('컴파일 오류: ' + k + ' ' + v); continue; }
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  if (!f.store1) { console.log('실행 실패: ' + k + ' ' + v.slice(0, 300)); continue; }
  const c = { save, second }, sim = lesson.simulate(c), want = lesson.code.call(lesson, c).replace(/^\/\/ [^\n]*생략\)\n/, '');   // 화면 맨 위의 "클래스 본문만 보임 (… 생략)" 머리 줄은 Probe 소스에 없으므로 빼고 비교
  const cookieText = f.cookie === 'JSESSIONID' ? 'JSESSIONID=(무작위 글자 ' + f.cookieLen + '자)' : '없음';
  const real = [storeText(f.store1), cookieText, f.meBody];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  const got = strip(f.src);
  if (want !== got) { good = false; console.log('화면의 코드가 Probe가 실행한 소스와 다름: ' + k + '\n--- 화면\n' + want + '\n--- 실행\n' + got); }
  if (good) ok++;
  // 단계 문장이 기대는 사실들
  const tr = f.trace.split('~'), ins = tr.filter(x => x.startsWith('in ')), created = tr.filter(x => x.startsWith('created ')), destroyed = tr.filter(x => x.startsWith('destroyed '));
  const port = x => /port=(\d+)/.exec(x)[1], reqId = x => /reqId=(\S+)/.exec(x)[1], valid = x => /valid=(\S+)/.exec(x)[1];
  const ids1 = f.ids1.split(',').filter(Boolean), ids2 = f.ids2.split(',').filter(Boolean);
  const sid = (f.loginSet.match(/^JSESSIONID=([^;]+)/) || [])[1];
  const checks = {
    '서버가 뜬 직후 세션 저장소는 비어 있다': f.store0 === '0[]',
    'login 요청에는 세션 번호가 실려 있지 않다(요청에 실린 번호 없음)': reqId(ins[0]) === 'null' && valid(ins[0]) === 'false',
    'login 응답에 Set-Cookie: JSESSIONID=… 한 줄이 붙고, 번호는 영문 대문자와 숫자 32글자이다': f.loginSet.indexOf(' ## ') < 0 && f.cookieShape === 'hex32' && f.cookieLen === '32',
    'login 응답의 쿠키 값에 kim이라는 글자가 없다': f.cookieHasKim === 'false' && !/kim/i.test(sid),
    'login 응답의 Set-Cookie에 Path=/와 HttpOnly 속성이 있다(화면은 속성을 다루지 않는다)': /; Path=\/; HttpOnly$/.test(f.loginSet),
    '우리가 쓴 소스에는 Cookie를 다루는 코드가 없다': !/Cookie/i.test(f.src),
    'login 뒤 저장소에 세션이 정확히 1개 있고 그 번호가 쿠키의 번호와 같다(setAttribute 유무와 무관)': ids1.length === 1 && ids1[0] === sid && created.length >= 1 && created[0] === 'created ' + sid,
    'login 뒤 칸의 내용은 setAttribute가 있으면 user=kim, 없으면 비어 있다': f.store1 === (save ? '1[user=kim]' : '1[-]'),
    'login 응답의 본문은 "로그인됨"이다': f.loginBody === '로그인됨' && f.loginStatus === '200',
    '쿠키 없이 /me를 요청하면 서버가 새 세션을 만들어 새 번호를 준다(저장소가 2개, 새 번호가 login의 번호와 다름)': second !== 'nocookie' || (f.meNewCookie === 'true' && f.meNewDiffers === 'true' && ids2.length === 2 && ids2.indexOf(sid) >= 0 && created.length === 2 && reqId(ins[1]) === 'null'),
    '쿠키 없이 /me를 요청해도 login의 칸은 그대로 있다(내용이 남아 있다)': second !== 'nocookie' || f.store2 === (save ? '2[-;user=kim]' : '2[-;-]'),
    '같은 브라우저의 /me는 요청에 실린 번호가 유효하고 새 세션을 만들지 않으며 Set-Cookie 줄이 없다': second !== 'same' || (valid(ins[1]) === 'true' && reqId(ins[1]) === sid && created.length === 1 && f.meSet === '-' && ids2.length === 1 && ids2[0] === sid),
    '다른 사람의 /me는 다른 연결(다른 포트)에서 왔는데도 같은 번호가 유효하고, 새 세션도 새 Set-Cookie도 없다': second !== 'stolen' || (port(ins[1]) !== port(ins[0]) && valid(ins[1]) === 'true' && reqId(ins[1]) === sid && created.length === 1 && f.meSet === '-' && ids2.length === 1),
    '다른 사람이 요청한 뒤 로그인한 브라우저의 요청도 같은 세션으로 처리된다(서버가 둘을 가르지 않음)': second !== 'stolen' || (valid(ins[2]) === 'true' && port(ins[2]) === port(ins[0]) && f.extraBody === f.meBody && f.extraSet === '-'),
    '로그아웃 요청은 유효한 번호로 와서 칸을 지운다(저장소 0개, destroyed 1번)': second !== 'gone' || (valid(ins[1]) === 'true' && f.storeOut === '0[]' && destroyed.length === 1 && destroyed[0] === 'destroyed ' + sid && f.outBody === '로그아웃됨'),
    '로그아웃 응답에는 쿠키를 지우라는 Set-Cookie 줄이 없다': second !== 'gone' || f.outSet === '-',
    '지운 뒤의 /me는 같은 번호를 보내지만 그 번호는 유효하지 않고, 서버가 새 세션을 만들어 새 번호를 준다': second !== 'gone' || (reqId(ins[2]) === sid && valid(ins[2]) === 'false' && f.meNewCookie === 'true' && f.meNewDiffers === 'true' && ids2.length === 1 && ids2[0] !== sid && created.length === 2),
    '지운 뒤의 /me에서 저장소에는 새 빈 칸 1개만 있다': second !== 'gone' || f.store2 === '1[-]',
    '/me의 응답 상태는 모두 200이다': f.meStatus === '200' && (f.extraStatus === undefined || f.extraStatus === '200'),
    '컨트롤러의 한글 본문이 UTF-8로 나간다': /charset=UTF-8/i.test(f.loginType),
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + k + ' / ' + name); }
}
console.log('일치 ' + ok + ' / ' + body.length);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);
