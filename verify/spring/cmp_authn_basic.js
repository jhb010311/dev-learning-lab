// 기초개념 "인증과 인가" 실습의 모형 결과를 실제 스프링 부트 + 스프링 시큐리티 실행 결과(authn_basic_probe.out.txt)와 대조한다
// 대조: 결과 표 세 열(서버가 확인한 사람은 SecurityContextHolder 기록에서, 응답은 상태 코드와 본문에서, 메서드 실행은 호출 횟수에서),
//       단계 문장이 기대는 사실들(WWW-Authenticate 헤더, 인증이 인가보다 먼저인 순서, 틀린 비밀번호는 인가 단계에 가지 못함 등),
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/authn_basic/<조합>/src/app)와 같은 글인지
//       (Probe 소스에만 있는 "// PROBE" 줄은 측정을 위해 더한 것이므로 빼고, package와 import 줄도 뺀다)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('authn_basic');
const lines = fs.readFileSync(path.join(__dirname, 'authn_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0, extraOk = 0, extraAll = 0;
for (const ln of lines.slice(1)) {
  n++;
  const [k, v] = ln.split(' => '), [rule, who] = k.split('|');
  if (v.startsWith('COMPILE_ERROR') || v.startsWith('?')) { console.log('다름: ' + k + ' 실행 실패 ' + v); continue; }
  const f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const probs = [];
  // SecurityContextHolder 기록을 요청(REQUEST)과 오류 재전달(ERROR) 두 구간으로 나눈다. 항목은 쉼표로 나뉘고 권한 목록 안에도 쉼표가 있어 대괄호 밖의 쉼표만 쓴다
  const items = f.ctx.split(/,(?![^\[]*\])/);
  const segs = {}; let cur = null;
  for (const it of items) { if (it.startsWith('>')) { cur = it.slice(1); segs[cur] = []; } else if (cur) segs[cur].push(it); }
  const req = segs.REQUEST || [];
  // 첫 구간에서 이름 있는 인증 정보(익명이 아닌 auth:)가 기록됐는가
  const named = [...new Set(req.map(x => /(?:set|get|getDeferred):auth:(\w+)\[/.exec(x)).filter(Boolean).map(m => m[1]))];
  const anonSeen = req.some(x => /:anonymous$/.test(x));
  const who2 = named.length === 1 ? { admin: 'admin (관리자)', kim: 'kim (일반 회원)' }[named[0]] : named.length === 0 ? '확인되지 않음' : '(모르는 상태 ' + named + ')';
  const status = +f.status, resp = status === 200 ? '200 ' + f.body : String(status), run = +f.calls === 1 ? '실행됨' : +f.calls === 0 ? '실행되지 않음' : '(모르는 횟수 ' + f.calls + ')';
  const real = [who2, resp, run];
  const sim = lesson.simulate({ rule, who });
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면의 코드와 Probe가 컴파일한 소스
  const dir = path.join(__dirname, '..', 'out', 'authn_basic', rule + '-' + who, 'src', 'app');
  const parts = ['SecurityConfig', 'AdminController'].map(nm => {
    const a = fs.readFileSync(path.join(dir, nm + '.java'), 'utf8').replace(/\r\n/g, '\n').trimEnd().split('\n');
    const i = a.findIndex(l => /^@/.test(l));
    return a.slice(i).filter(l => !l.endsWith('// PROBE')).join('\n');
  });
  const probeLines = fs.readFileSync(path.join(dir, 'AdminController.java'), 'utf8').split('\n').filter(l => l.endsWith('// PROBE')).length;
  if (probeLines !== 1) probs.push('세는 줄 수 ' + probeLines);
  if (parts.join('\n\n') !== lesson.code({ rule, who })) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
  // 화면 문장이 기대는 사실들
  const idx = p => req.findIndex(x => p.test(x));
  const valid = who === 'admin' || who === 'kim';
  const checks = {
    '요청은 먼저 REQUEST로 들어온다(오류 재전달 ERROR는 그 뒤)': f.disp.split(',')[0] === 'REQUEST:/admin',
    '서버가 뜬 직후에는 admin()이 한 번도 실행되지 않았다': f.calls0 === '0',
    '200 응답이면 admin() 실행 1번, 아니면 0번': (status === 200) === (f.calls === '1'),
    '200 응답의 본문은 관리자 화면': status !== 200 || f.body === '관리자 화면',
    '401 응답에는 WWW-Authenticate 헤더가 있고 Basic 방식이다': status !== 401 || /^Basic realm=/.test(f.www),
    '401이 아닌 응답에는 WWW-Authenticate 헤더가 없다': status === 401 || f.www === '-',
    '401과 403은 인증 정보가 없거나 틀리거나 권한이 없을 때만 나온다': (status === 401) === (who === 'wrong' || (who === 'none' && rule !== 'open')) && (status === 403) === (who === 'kim' && rule === 'role'),
    ...(valid ? {
      '맞는 비밀번호: 인증 정보는 요청을 처리하기 시작할 때는 비어 있고(null) 그다음에 설정된다': /^get:null$/.test(req[0]) && /^set:auth:(admin|kim)\[/.test(req[1]),
      '맞는 비밀번호: 이름 있는 사용자가 하나 기록되고 그 이름이 보낸 아이디와 같다': named.length === 1 && named[0] === who,
      '권한은 admin이 ROLE_ADMIN, kim이 ROLE_USER이다': req[1].includes(who === 'admin' ? 'ROLE_ADMIN' : 'ROLE_USER') && !req[1].includes(who === 'admin' ? 'ROLE_USER' : 'ROLE_ADMIN'),
      '인증(set)이 인가(getDeferred)보다 먼저다': idx(/^set:auth:/) >= 0 && idx(/^set:auth:/) < idx(/^getDeferred:auth:/),
    } : {}),
    ...(status === 200 ? {
      '통과하면 컨트롤러 안에서 본 인증 정보가 앞에서 설정된 것과 같다(인가 뒤에 컨트롤러가 실행)': idx(/^getDeferred:/) >= 0 && idx(/^getDeferred:/) < idx(/^controller:/) && req[idx(/^controller:/)].replace('controller:', '') === (valid ? req[1].replace('set:', '') : 'anonymous'),
      '통과하면 오류 재전달(ERROR) 없이 REQUEST 한 번으로 끝난다': f.disp === 'REQUEST:/admin',
    } : {}),
    ...(who === 'wrong' ? {
      '틀린 비밀번호: 이름 있는 사용자가 한 번도 기록되지 않았다': named.length === 0,
      '틀린 비밀번호: 인가 단계(getDeferred, 익명 기록)에 가지 못하고 인증 정보를 비우며 끝난다(첫 구간)': req.length === 2 && req[0] === 'get:null' && req[1] === 'clear' && !anonSeen,
      '틀린 비밀번호는 /admin의 규칙(role, authed, open)과 상관없이 401이다': status === 401,
    } : {}),
    ...(who === 'none' ? {
      '아이디 없음: 익명으로 기록되고 이름 있는 사용자는 없다': anonSeen && named.length === 0,
      '아이디 없음: 인증을 시도해 지운 흔적(clear)이 인가보다 먼저 나오지 않는다(틀린 비밀번호와 다르다)': idx(/^clear$/) < 0 || idx(/^clear$/) > idx(/^get:anonymous$/),
    } : {}),
    ...(status === 401 || status === 403 ? {
      '막힌 요청은 오류 응답을 /error로 한 번 더 넘기고(ERROR) 그래도 같은 상태 코드다': f.disp === 'REQUEST:/admin,ERROR:/error',
    } : {}),
    ...(status === 403 ? {
      '403: 오류 재전달(ERROR) 구간에서도 같은 사용자(kim)가 기록되어 /error가 막히지 않았다': (segs.ERROR || []).some(x => /^getDeferred:auth:kim\[/.test(x)),
    } : {}),
    ...(status === 401 ? {
      '401: 오류 재전달(ERROR) 구간에서는 익명이고, 그 뒤에도 401이다': (segs.ERROR || []).some(x => x === 'get:anonymous'),
    } : {}),
    ...(rule === 'open' && who === 'none' ? { 'permitAll + 아이디 없음: 컨트롤러 안에서 본 인증 정보가 익명이다': req.includes('controller:anonymous') } : {}),
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + k + ' / ' + name); }
}
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);
