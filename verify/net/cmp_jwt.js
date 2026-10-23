// "JWT의 구조와 검증" 실습(JwtDecoder 중심으로 다시 짠 것)을 실제 계산 결과와 대조한다. 사용: node verify/net/cmp_jwt.js
//  1. ../plain/jwt_probe_std.out.txt (JwtProbe.java): JDK Mac으로 만든 토큰과, NimbusJwtDecoder의 판단(소스에서 옮김)을 조합마다 계산한 결과.
//     모형의 표(서명·만료·판단·예외 이름)와 화면의 예외 메시지, 토큰 글자가 이것과 같아야 한다.
//  2. jwt_probe.out.txt (jwt_probe.js, Node.js crypto): 같은 토큰 글자가 나오는지(JDK와 Node가 같은 값을 내는지)만 본다.
//  3. 화면의 "속에서 하는 일" 코드를 조합마다 뽑아 JDK로 컴파일하고 그대로 실행해, true/false가 모형의 판단과 같은지 본다.
//  4. 화면의 표준 코드(JwtDecoder)를 조합마다 뽑아, 공식 시그니처만 옮긴 대역(../spring/jwt_stubs)과 함께 javac로 컴파일한다(실행하지 않음).
//     문제 4의 근거(catch 순서를 바꾸면 컴파일 오류)도 같은 대역으로 확인한다.
// 컴파일한 파일은 OS 임시 폴더에 쓴다.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const { load, combos } = require('../model_rows.js');
const l = load('jwt');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin', LIBS = 'E:/dev/java-interview-lab/verify/spring/libs/*';
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cmp_jwt_'));
const read = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean);
let fail = 0; const bad = m => { fail++; console.log('다름: ' + m); };

// 1. JDK로 계산한 판단
const jl = read(path.join(__dirname, '..', 'plain', 'jwt_probe_std.out.txt'));
console.log(jl[0]);
const meta = {}; jl.filter(l => /^# \S+ /.test(l)).forEach(x => { const m = /^# (\S+) (.*)$/.exec(x); meta[m[1]] = m[2]; });
const real = {}; jl.filter(x => x.includes(' => ') && !x.startsWith('#')).forEach(x => { const [k, v] = x.split(' => '); real[k] = v.split('|'); });
const V = l.V, cs = combos(l);
let ok = 0;
for (const c of cs) {
  const r = real[c.tok + '|' + c.time], sim = l.simulate(Object.assign({}, c)), row = sim.row, text = sim.events.map(e => e.s).join('\n');
  if (!r) { bad('실제 계산 없음 ' + c.tok + '|' + c.time); continue; }
  const accept = r[0] === 'accept', errs = [];
  if ((row[2].indexOf('통과') === 0) !== accept) errs.push('판단');
  if (accept && row[2] !== '통과 · role ' + r[2].replace('role=', '')) errs.push('role');
  if (!accept && c.view === 'std') {
    if (row[3].split(' ')[0] !== r[1]) errs.push('예외 이름 ' + row[3] + ' / ' + r[1]);
    if (text.indexOf(r[2]) < 0) errs.push('단계 글에 실제 메시지가 없음: ' + r[2]);
  }
  // 서명·만료 칸: 예외 메시지로 어디서 걸렸는지 안다
  const where = accept ? 'ok' : /Unsupported algorithm/.test(r[2]) ? 'alg' : /Invalid signature/.test(r[2]) ? 'sig' : /expired/.test(r[2]) ? 'exp' : '?';
  const wantSig = where === 'alg' ? '하지 않음 (알고리즘에서 거절)' : where === 'sig' ? '불일치' : '일치';
  if (row[0] !== wantSig) errs.push('서명 칸');
  if (where === 'exp' && row[1].indexOf('만료됨') !== 0) errs.push('만료 칸');
  if (where === 'ok' && !(row[1] === '만료 전' || row[1].indexOf('60초 여유 안') >= 0)) errs.push('만료 칸');
  if ((where === 'alg' || where === 'sig') && row[1] !== '하지 않음 (앞에서 거절)') errs.push('만료 칸');
  if (sim.tk.text !== meta['token.' + c.tok]) errs.push('토큰 글자');
  if (errs.length) bad(JSON.stringify(c) + ' ' + errs.join(', ') + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + r.join(' | ')); else ok++;
}
console.log('모형과 JDK 계산(디코더 판단) 일치 ' + ok + ' / ' + cs.length);
const msgOk = [V.msgSig, V.msgNone, V.msgExp].every(m => jl.some(x => x.endsWith('|' + m)));
console.log('화면의 예외 메시지 3개가 계산 결과의 메시지와 같음: ' + msgOk); if (!msgOk) bad('예외 메시지');
const bOk = jl.includes('# boundary exp+60s: accept') && jl.includes('# boundary exp+61s: reject');
console.log('만료 여유 경계(exp+60초 통과, +61초 거절): ' + bOk); if (!bOk) bad('경계');
// 모형의 시각 값
const tOk = ['before', 'grace', 'after'].every(t => (meta['time.' + t] || '').split(' ')[0] === String(V.now[t]) && (meta['time.' + t] || '').endsWith(V.nowText[t].replace(' UTC', 'Z').replace(' ', 'T')));
console.log('시각 값과 표기: ' + tOk); if (!tOk) bad('시각 값');

// 2. Node.js로 만든 토큰 글자
const nl = read(path.join(__dirname, 'jwt_probe.out.txt')), nmeta = {};
nl.filter(x => /^# token\./.test(x)).forEach(x => { const m = /^# token\.(\S+) (.*)$/.exec(x); nmeta[m[1]] = m[2]; });
const nOk = ['ok', 'payload', 'otherkey', 'none'].every(k => nmeta[k] === meta['token.' + k]);
console.log(nl[0] + ' | JDK와 같은 토큰 글자: ' + nOk); if (!nOk) bad('Node 토큰');

// 3. "속에서 하는 일" 코드 실행
const insideTexts = new Map();
for (const c of cs.filter(c => c.view === 'inside')) {
  const t = l.code(c), body = t.slice(t.indexOf('boolean check(')).replace(/\s*\/\/ ← 이번 토큰[^\n]*/g, '');
  insideTexts.set(body, (insideTexts.get(body) || []).concat([c]));
}
let ri = 0, runOk = 0, runN = 0;
for (const [body, list] of insideTexts) {
  const dir = path.join(work, 'inside' + (++ri)); fs.mkdirSync(dir, { recursive: true });
  const src = ['import static java.nio.charset.StandardCharsets.UTF_8;', 'import static java.nio.charset.StandardCharsets.US_ASCII;', 'import java.security.MessageDigest;', 'import java.time.Instant;', 'import java.util.Base64;', 'import javax.crypto.Mac;', 'import javax.crypto.spec.SecretKeySpec;', '',
    'public class Inside {', '    byte[] serverKey = "shop-example-hs256-secret-key-01".getBytes(US_ASCII);   // 시험용 값', '',
    body.split('\n').map(x => '    ' + x).join('\n'), '',
    '    public static void main(String[] a) throws Exception { System.out.println(new Inside().check(a[0], Long.parseLong(a[1]))); }', '}'].join('\n');
  fs.writeFileSync(path.join(dir, 'Inside.java'), src);
  try { cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-d', dir, path.join(dir, 'Inside.java')], { stdio: 'pipe' }); }
  catch (e) { bad('속에서 하는 일 코드 컴파일 실패\n' + String(e.stderr).slice(0, 800)); continue; }
  for (const c of list) {
    runN++;
    const out = cp.execFileSync(JDK + '/java', ['-cp', dir, 'Inside', l.token(c).text, String(V.now[c.time])], { encoding: 'utf8' }).trim();
    const want = l.simulate(Object.assign({}, c)).row[2].indexOf('통과') === 0 ? 'true' : 'false';
    if (out === want) runOk++; else bad('속에서 하는 일 실행 ' + JSON.stringify(c) + ' 실행 ' + out + ' / 모형 ' + want);
  }
}
console.log('"속에서 하는 일" 코드: 서로 다른 글 ' + insideTexts.size + '개 컴파일, 실행 결과와 모형 일치 ' + runOk + ' / ' + runN);

// 4. 표준 코드 컴파일 (대역과 함께)
const stubs = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.java')) stubs.push(p); } })(path.join(__dirname, '..', 'spring', 'jwt_stubs'));
const HEAD = ['package app;', '', 'import javax.crypto.SecretKey;', 'import javax.crypto.spec.SecretKeySpec;', 'import org.springframework.security.oauth2.jwt.BadJwtException;', 'import org.springframework.security.oauth2.jwt.Jwt;',
  'import org.springframework.security.oauth2.jwt.JwtDecoder;', 'import org.springframework.security.oauth2.jwt.JwtValidationException;', 'import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;', ''].join('\n');
const javac = (dir, file) => cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-proc:none', '-cp', LIBS, '-d', path.join(dir, 'classes'), file, ...stubs], { stdio: 'pipe' });
const stdTexts = new Set(cs.filter(c => c.view === 'std').map(c => l.code(c)));
let si = 0, sOk = 0;
for (const t of stdTexts) {
  const dir = path.join(work, 'std' + (++si)); fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  const f = path.join(dir, 'app', 'Demo.java');
  fs.writeFileSync(f, HEAD + '\nclass Demo {\n    byte[] serverKey;\n    void run(String token) {\n' + t.split('\n').map(x => '        ' + x).join('\n') + '\n    }\n}\n');
  try { javac(dir, f); sOk++; } catch (e) { bad('표준 코드 컴파일 실패\n' + String(e.stderr).slice(0, 800)); }
}
console.log('표준 코드(JwtDecoder): 서로 다른 글 ' + stdTexts.size + '개 가운데 대역과 함께 컴파일 ' + sOk);
// 문제 4: catch 순서를 바꾸면 컴파일 오류
{
  const dir = path.join(work, 'quiz4'); fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  const f = path.join(dir, 'app', 'Demo.java');
  fs.writeFileSync(f, HEAD + '\nclass Demo {\n    void run(JwtDecoder decoder, String token) {\n        try { decoder.decode(token); }\n        catch (BadJwtException e) { }\n        catch (JwtValidationException e) { }\n    }\n}\n');
  let msg = ''; try { javac(dir, f); } catch (e) { msg = String(e.stderr); }
  const q4 = /has already been caught/.test(msg);
  console.log('문제 4: BadJwtException을 먼저 잡으면 JwtValidationException catch가 컴파일 오류(has already been caught): ' + q4); if (!q4) bad('문제 4 근거');
}
fs.rmSync(work, { recursive: true, force: true });
console.log(fail ? '\n대조 실패 ' + fail + '건' : '\n모두 일치');
process.exit(fail ? 1 : 0);
