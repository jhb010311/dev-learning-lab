// "세션과 JWT" 실습의 JWT 쪽을 점검한다. 사용: node verify/spring/cmp_auth.js   (컴파일용 파일은 CMP_TMP 폴더, 없으면 OS 임시 폴더의 cmp_auth에 쓴다)
//  1. 화면의 JWT 코드(Spring Security의 JwtEncoder·NimbusJwtEncoder로 발급, JwtDecoder·NimbusJwtDecoder로 검증)를 조합마다 뽑아,
//     공식 시그니처만 옮긴 대역(jwt_stubs, 파일마다 근거 주소가 있다)과 함께 javac로 컴파일한다(실행하지 않음: 이 컴퓨터에는
//     spring-security-oauth2-jose와 nimbus-jose-jwt가 없다).
//  2. 디코더의 기본 시계 오차 여유(60초, JwtTimestampValidator)가 모형의 결과를 바꾸지 않는지: 모든 조합에서 액세스 토큰을 쓰는
//     요청 시각이 그때의 만료 시각과 60초 넘게 떨어져 있어야 한다(assume의 "5분 이상 떨어져" 문장도 함께 확인).
//  3. 예시 물음(presets)의 결과 표가 단계 글·영상 대본이 말하는 숫자와 같은지(모형을 고친 뒤에도 결과가 바뀌지 않았는지).
// 세션 쪽의 401/200은 AuthProbe.java(auth_probe.out.txt)가 실제 스프링 부트 서버로 확인한 것이다.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const { load, combos } = require('../model_rows.js');
const l = load('auth');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin', LIBS = 'E:/dev/java-interview-lab/verify/spring/libs/*';
const work = path.join(process.env.CMP_TMP || os.tmpdir(), 'cmp_auth');
let fail = 0; const bad = m => { fail++; console.log('다름: ' + m); };

// 1. 화면의 JWT 코드 컴파일
const stubs = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.java')) stubs.push(p); } })(path.join(__dirname, 'jwt_stubs'));
const HEAD = ['package app;', '', 'import java.time.Duration;', 'import java.time.Instant;', 'import javax.crypto.SecretKey;', 'import javax.crypto.spec.SecretKeySpec;',
  'import org.springframework.security.oauth2.jose.jws.MacAlgorithm;', 'import org.springframework.security.oauth2.jwt.JwsHeader;', 'import org.springframework.security.oauth2.jwt.Jwt;',
  'import org.springframework.security.oauth2.jwt.JwtClaimsSet;', 'import org.springframework.security.oauth2.jwt.JwtDecoder;', 'import org.springframework.security.oauth2.jwt.JwtEncoder;',
  'import org.springframework.security.oauth2.jwt.JwtEncoderParameters;', 'import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;', 'import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;', ''].join('\n');
const all = combos(l);
// 영어판(src/en/lessons/06_auth.js)의 화면 코드도 함께 컴파일한다
const enL = (() => { const list = []; new Function('Lab', fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'en', 'lessons', '06_auth.js'), 'utf8'))({ register: x => list.push(x), fmt: String }); return list[0]; })();
const texts = new Map();
all.filter(c => c.mode === 'jwt' || c.mode === 'refresh').forEach(c => [l, enL].forEach(x => { const t = x.code(c); texts.set(t, (texts.get(t) || []).concat([c])); }));
let ci = 0, cOk = 0;
for (const [t] of texts) {
  const dir = path.join(work, 'jwt' + (++ci)); fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  const f = path.join(dir, 'app', 'Demo.java');
  // 생략한 선언(serverKey·memberId·token)은 필드와 매개변수로, 예시로 만든 createRefreshToken은 빈 메서드로 둔다
  fs.writeFileSync(f, HEAD + '\nclass Demo {\n    byte[] serverKey;\n    String createRefreshToken() { return ""; }\n    void run(String memberId, String token) {\n' + t.split('\n').map(x => '        ' + x).join('\n') + '\n    }\n}\n');
  try { cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-proc:none', '-cp', LIBS, '-d', path.join(dir, 'classes'), f, ...stubs], { stdio: 'pipe' }); cOk++; }
  catch (e) { bad('JWT 코드 컴파일 실패\n' + String(e.stderr).slice(0, 1200)); }
}
console.log('화면의 JWT 코드(한국어판·영어판): 서로 다른 글 ' + texts.size + '개 가운데 대역과 함께 컴파일 ' + cOk);
const noJjwt = [l, enL].every(x => { const one = x.code({ mode: 'jwt', servers: 2, exp: '45', kick: true });
  return !/Jwts|Claims claims|signWith|parseSignedClaims/.test(one) && /NimbusJwtEncoder\.withSecretKey/.test(one) && /NimbusJwtDecoder\.withSecretKey/.test(one) && /oauth2ResourceServer/.test(one); });
console.log('JWT 코드가 jjwt 대신 JwtEncoder·JwtDecoder를 씀: ' + noJjwt); if (!noJjwt) bad('JWT 코드의 라이브러리');

// 2. 60초 여유가 결과를 바꾸지 않는가: 모형과 같은 규칙으로 요청 시각과 만료 시각의 차이를 모두 잰다
let minGap = Infinity;
for (const c of all.filter(c => c.mode === 'jwt' || c.mode === 'refresh')) {
  const exp = +c.exp; let accessExp = exp, out = false;
  for (const t of [10, 20, 30, 40, 50]) {
    if (out) break;
    minGap = Math.min(minGap, Math.abs(t - accessExp));
    if (t < accessExp) continue;
    if (c.mode === 'jwt') { out = true; continue; }
    const refreshed = !(c.kick && t > 25); if (refreshed) accessExp = t + exp; else out = true;
  }
}
console.log('요청 시각과 만료 시각의 가장 작은 차이: ' + minGap + '분 (60초 여유가 결과를 바꾸지 않으려면 1분 초과, assume은 5분 이상)'); if (!(minGap >= 5)) bad('만료 시각 차이 ' + minGap);

// 3. 예시 물음의 결과 표 (단계 글·영상 대본·문제의 숫자)
const want = [
  ['처음 설정으로', ['2번', '3번', '0번', '해당 없음']],
  ['세션을 Redis로 옮기면', ['5번', '0번', '6번', '해당 없음']],
  ['JWT로 바꾸면', ['2번', '1번', '0번', '해당 없음']],
  ['JWT인데 강제 로그아웃', ['4번', '1번', '0번', '2번']],
  ['세션인데 강제 로그아웃', ['2번', '3번', '7번', '0번']],
  ['짧은 액세스 토큰 + 리프레시 토큰', ['3번', '2번', '4번', '1번']],
];
let pOk = 0;
l.presets.forEach((p, i) => {
  const w = want.find(x => x[0] === p.t); if (!w) { bad('기대 결과 없는 예시 ' + p.t); return; }
  const row = l.simulate(Object.assign({}, p.v)).row;
  if (JSON.stringify(row) === JSON.stringify(w[1])) pOk++; else bad('예시 ' + (i + 1) + ' ' + p.t + ' 모형 ' + row.join(' | ') + ' / 기대 ' + w[1].join(' | '));
});
console.log('예시 물음 결과 표: ' + pOk + ' / ' + l.presets.length);
console.log(fail ? '\n대조 실패 ' + fail + '건' : '\n모두 일치');
process.exit(fail ? 1 : 0);
