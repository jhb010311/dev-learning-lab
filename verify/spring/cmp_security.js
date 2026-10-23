// "시큐리티 필터 체인" 실습(oauth2ResourceServer 중심으로 다시 짠 것)을 대조한다. 사용: node verify/spring/cmp_security.js
//  1. security_std_probe.out.txt (src/SecurityStdProbe.java, 스프링 부트 4.1.1 + 시큐리티 7.1.1 서버에 실제 HTTP 요청): 열두 조합의
//     응답 코드, 응답을 만든 곳(진입점/처리기, 토큰 확인 필터에서 끝났는지), 컨트롤러 실행 여부, 인증 여부가 모형의 표와 같은가.
//     같은 프로브의 custom 줄(틀린 토큰을 그냥 넘기는 직접 만든 필터)은 요약 글 "직접 짜면 이 요청은 200"의 근거다.
//  2. 화면의 인가 규칙 줄(requestMatchers, anyRequest, sessionManagement)이 프로브 소스의 줄과 같은 글인가.
//  3. 화면의 설정 코드를 package/import만 붙여, 공식 시그니처만 옮긴 대역(jwt_stubs/)과 함께 javac로 컴파일한다(실행하지 않음).
// 옛 실습(직접 만든 JwtAuthenticationFilter)의 결과 security_probe.out.txt는 그대로 둔다.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const { load, combos } = require('../model_rows.js');
const l = load('security');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin', LIBS = 'E:/dev/java-interview-lab/verify/spring/libs/*';
let fail = 0; const bad = m => { fail++; console.log('다름: ' + m); };

// 1. 실제 서버 결과
const lines = fs.readFileSync(path.join(__dirname, 'security_std_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {}; lines.filter(x => x.includes(' => ')).forEach(x => { const [k, v] = x.split(' => '); const p = v.split('|'); const o = { status: +p[0] }; p.slice(1).forEach(kv => { const i = kv.indexOf('='); o[kv.slice(0, i)] = kv.slice(i + 1); }); real[k] = o; });
const cs = combos(l);
let ok = 0;
for (const c of cs) {
  const r = real['std|' + c.who + '|' + c.path], row = l.simulate(Object.assign({}, c)).row;
  if (!r) { bad('실제 결과 없음 ' + JSON.stringify(c)); continue; }
  const ended = r.status === 200 ? '컨트롤러' : r.ended + (r.rejectedIn === 'BearerTokenAuthenticationFilter' ? ' (토큰 확인 필터에서)' : '');
  const authed = /JwtAuthentication|UsernamePassword/.test(r.auth) ? '예' : '아니오';
  const want = [{ 200: '200 OK', 401: '401 Unauthorized', 403: '403 Forbidden' }[r.status], null, ended, r.controller === 'true' ? '실행됨' : '실행 안 됨'];
  // 인증 여부: 컨트롤러까지 간 요청은 그때의 인증 정보로, 막힌 요청은 토큰이 유효한지로 본다(유효한 토큰은 403 조합에서도 인증됨)
  want[1] = r.controller === 'true' ? authed : (c.who === 'user' || c.who === 'admin' ? '예' : '아니오');
  if (JSON.stringify(row) === JSON.stringify(want)) ok++; else bad(JSON.stringify(c) + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + want.join(' | '));
}
console.log('모형과 실제 서버 일치 ' + ok + ' / ' + cs.length);
const auths = Object.entries(real).filter(([k]) => /^std\|(user|admin)\|(public|orders)$/.test(k)).map(([k, r]) => r.auth);
const roleOk = auths.length === 4 && auths.every(a => /:7:\[FACTOR_BEARER, ROLE_(USER|ADMIN)\]$/.test(a));
console.log('유효한 토큰의 인증 정보(회원 7, ROLE_USER/ROLE_ADMIN + FACTOR_BEARER): ' + roleOk); if (!roleOk) bad('인증 정보');
const wwwOk = /error="invalid_token"/.test(real['std|bad|public'].www) && /error="insufficient_scope"/.test(real['std|user|admin'].www);
console.log('WWW-Authenticate 헤더(틀린 토큰 invalid_token, 권한 부족 insufficient_scope): ' + wwwOk); if (!wwwOk) bad('헤더');
const customOk = real['custom|bad|public'] && real['custom|bad|public'].status === 200;
console.log('직접 만든 필터가 틀린 토큰을 넘기면 /public/notice가 200: ' + customOk); if (!customOk) bad('custom 근거');
const sumText = cs.map(c => l.simulate(Object.assign({}, c)).summary.join(' ')).join(' ');
if (!/직접 만들어 틀린 토큰을 거절하지 않고 넘기게 짜면 이 요청은 200/.test(sumText)) bad('요약에 custom 근거 문장이 없음');
const chain = lines.find(x => x.startsWith('# chain.std ')) || '';
const order = ['BearerStandIn', 'AnonymousAuthenticationFilter', 'ExceptionTranslationFilter', 'AuthorizationFilter'].map(n => chain.indexOf(n));
const orderOk = order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1]));
console.log('필터 순서(토큰 확인 > 익명 > 예외 변환 > 인가): ' + orderOk); if (!orderOk) bad('필터 순서');

// 2. 인가 규칙 줄
const code = l.code({}), probe = fs.readFileSync(path.join(__dirname, 'src', 'SecurityStdProbe.java'), 'utf8');
const ruleLines = code.split('\n').filter(x => /requestMatchers|anyRequest|sessionCreationPolicy/.test(x)).map(x => x.trim());
const rOk = ruleLines.every(x => probe.includes(x.replace(/\)\)$/, ')').replace(/\)$/, '')));
console.log('화면의 규칙 줄 ' + ruleLines.length + '개가 프로브의 줄과 같음: ' + rOk); if (!rOk) bad('규칙 줄');

// 3. 화면 코드 컴파일 (대역과 함께)
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cmp_security_'));
const stubs = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.java')) stubs.push(p); } })(path.join(__dirname, 'jwt_stubs'));
const HEAD = ['package app;', '', 'import java.nio.charset.StandardCharsets;', 'import javax.crypto.SecretKey;', 'import javax.crypto.spec.SecretKeySpec;', 'import org.springframework.beans.factory.annotation.Value;',
  'import org.springframework.context.annotation.Bean;', 'import org.springframework.context.annotation.Configuration;', 'import org.springframework.security.config.Customizer;',
  'import org.springframework.security.config.annotation.web.builders.HttpSecurity;', 'import org.springframework.security.config.http.SessionCreationPolicy;', 'import org.springframework.security.oauth2.jwt.JwtDecoder;',
  'import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;', 'import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;',
  'import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;', 'import org.springframework.security.web.SecurityFilterChain;', '', '@Configuration', 'class SecurityConfig {', ''].join('\n');
const texts = new Set(cs.map(c => l.code(c)));
let cOk = 0;
for (const t of texts) {
  fs.mkdirSync(path.join(work, 'app'), { recursive: true });
  const f = path.join(work, 'app', 'SecurityConfig.java');
  fs.writeFileSync(f, HEAD + t + '\n}\n');
  try { cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-proc:none', '-parameters', '-cp', LIBS, '-d', path.join(work, 'classes'), f, ...stubs], { stdio: 'pipe' }); cOk++; }
  catch (e) { bad('화면 코드 컴파일 실패\n' + String(e.stderr).slice(0, 800)); }
}
console.log('화면 코드 컴파일(대역과 함께): ' + cOk + ' / ' + texts.size);
fs.rmSync(work, { recursive: true, force: true });
console.log(fail ? '\n대조 실패 ' + fail + '건' : '\n모두 일치');
process.exit(fail ? 1 : 0);
