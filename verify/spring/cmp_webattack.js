// "웹 공격 세 가지" 실습의 CSRF 쪽 모형을 실제 스프링 부트 + 스프링 시큐리티 서버의 결과(webattack_probe.out.txt, WebattackProbe.java)와 대조한다.
// 사용: node verify/spring/cmp_webattack.js
// 서버가 받은 요청을 어떻게 처리하는지만 대조한다. 브라우저가 쿠키를 붙이느냐(SameSite=None은 붙고 Lax는 안 붙음)는
// 브라우저가 정하는 일이라 ../cookie_probe.js(실제 크로미움)의 결과를 따른다.
//   방어 없음      = disable 구성: 세션 쿠키가 붙은 공격 POST가 200으로 이체됨 → 모형 "성공"
//   CSRF 토큰      = token 구성: 세션 쿠키가 붙어도 _csrf가 없거나 틀리면 403, 이체 안 됨 → 모형 "실패", 막은 지점 CSRF 토큰, 단계 글에 403
//                    (우리 화면의 _csrf 값을 보낸 POST는 200: 토큰 검사가 정상 요청은 막지 않음)
//   SameSite=Lax만 = lax 구성: 서버가 Set-Cookie에 SameSite=Lax를 붙임. 쿠키가 붙어 오면 서버는 그대로 이체(서버 쪽 검사 없음),
//                    쿠키가 없으면 로그인 화면으로 302 → 모형 "실패", 막은 지점이 브라우저 쪽 보조 방어, 요약이 서버 쪽 검사 없음을 말함
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const l = load('webattack');
const lines = fs.readFileSync(path.join(__dirname, 'webattack_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const R = {}; lines.slice(1).forEach(x => { const [k, v] = x.split(' => '); R[k] = v; });
let fail = 0; const bad = m => { fail++; console.log('다름: ' + m); };
const check = (name, cond) => { console.log((cond ? '같음: ' : '다름: ') + name); if (!cond) fail++; };
const sim = d3 => { const r = l.simulate({ atk: 'csrf', d1: 'none', d2: 'none', d3 }); return { row: r.row, text: r.events.map(e => e.s).join('\n'), sum: r.summary.join('\n') }; };

const none = sim('none'), token = sim('token'), lax = sim('samesite');
// 방어 없음
check('방어 없음: 실제 서버는 쿠키만 붙은 공격 POST를 이체(200) / 모형 ' + none.row[0], R['disable|attack POST /transfer (cookie, no _csrf)'] === '200|transfer=true' && none.row[0] === '성공');
// CSRF 토큰
check('CSRF 토큰: 실제 서버는 _csrf 없는 POST를 403, 이체 안 함 / 모형 ' + token.row.join(' | '), R['token|attack POST /transfer (cookie, no _csrf)'] === '403|transfer=false' && token.row[0] === '실패' && /CSRF 토큰/.test(token.row[2]) && /403/.test(token.text));
check('CSRF 토큰: 틀린 _csrf도 403', R['token|attack POST /transfer (cookie, wrong _csrf)'] === '403|transfer=false');
check('CSRF 토큰: 우리 화면의 _csrf를 보낸 POST는 200으로 이체', R['token|own form POST /transfer (cookie, right _csrf)'] === '200|transfer=true');
check('CSRF 토큰: 기본 로그인 화면의 폼에 숨은 입력 _csrf가 있음(스프링 시큐리티가 폼에 토큰을 심음)', R['token|login-page hidden _csrf input'] === 'true');
// SameSite=Lax만
check('SameSite=Lax만: 설정이 Set-Cookie에 SameSite=Lax를 붙임', /SameSite=Lax/.test(R['lax|session Set-Cookie'] || ''));
check('SameSite=Lax만: 쿠키가 붙어 오면 서버는 그대로 이체(서버 쪽 검사 없음) / 모형 요약이 이것을 말함', R['lax|attack POST /transfer (cookie, no _csrf)'] === '200|transfer=true' && /CSRF 보호를 끈 상태/.test(lax.sum));
check('SameSite=Lax만: 쿠키 없는 POST는 로그인 화면으로 302, 이체 안 됨 / 모형 ' + lax.row.join(' | '), /^302 \/login\|transfer=false$/.test(R['lax|POST /transfer without cookie'] || '') && lax.row[0] === '실패' && /로그인 화면/.test(lax.text) && /보조 방어/.test(lax.row[2]));
check('SameSite=Lax만: 요약이 CSRF 토큰을 기본 방어로, SameSite를 보조 방어로 말함', /보조 방어/.test(lax.sum) && /기본 방어는 스프링 시큐리티가 기본으로 켜 두는 CSRF 토큰 검사/.test(lax.sum));
console.log(fail ? '\n대조 실패 ' + fail + '건' : '\n모두 일치');
process.exit(fail ? 1 : 0);
