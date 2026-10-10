// "클릭재킹과 오픈 리다이렉트" 실습의 모형 결과를 실제 실행 결과(clickjack_probe.out.txt)와 조합마다 대조한다.
//   응답 헤더(X-Frame-Options, Content-Security-Policy, Location): 스프링 부트 서버의 실제 응답
//   브라우저의 동작(프레임 안에 그리는지, Location을 따라 어디에 닿는지): 크로미움으로 본 결과 (Probe에 크로미움 경로를 주었을 때만 있다)
// 화면은 https://shop.example을 가정하고 시험 서버는 http://127.0.0.1:포트이므로, Location은 주소의 앞부분을 바꿔서 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('clickjack');
const lines = fs.readFileSync(path.join(__dirname, 'clickjack_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
lines.filter(l => l.startsWith('#')).forEach(l => console.log(l));
const real = {};
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
}
const hasBrowser = Object.keys(real).some(k => k.startsWith('browser|'));
// 시험 서버의 주소를 화면의 주소로 바꾼다. //로 시작하는 값은 톰캣이 요청의 프로토콜(시험에서는 http)을 붙이므로 그것도 https로 맞춘다.
const toScreen = loc => loc.replace('{서버}', 'https://shop.example').replace(/^http:\/\/attacker\.example/, 'https://attacker.example');
const seen = new Set(); let ok = 0, n = 0, bn = 0;
for (const c of combos(lesson)) {
  const key = c.topic === 'frame' ? 'frame|' + c.hdr + '|' + c.who : 'redir|' + c.check + '|' + c.next;
  if (seen.has(key)) continue; seen.add(key); n++;
  const row = lesson.simulate(Object.assign({}, c)).row, diff = [];
  if (c.topic === 'frame') {
    const f = real['frame|' + c.hdr], b = real['browser|' + c.hdr + '|' + c.who];
    const hs = []; if (f.xfo !== '-') hs.push('X-Frame-Options: ' + f.xfo); if (f.csp !== '-') hs.push('Content-Security-Policy: ' + f.csp);
    const header = hs.length ? hs.join(' 그리고 ') : '프레임 관련 헤더 없음';
    if (row[0] !== header) diff.push('헤더: 모형 ' + row[0] + ' / 실제 ' + header);
    if (b) { bn++; const shown = b.shown === 'true' ? '프레임 안에 그림' : '프레임 안에 그리지 않음'; if (row[1] !== shown) diff.push('브라우저: 모형 ' + row[1] + ' / 실제 ' + shown); }
  } else {
    const f = real[key], b = real['browser' + key];
    const loc = 'Location: ' + toScreen(f.location);
    if (f.status !== '302') diff.push('상태 코드 ' + f.status);
    if (row[0] !== loc) diff.push('Location: 모형 ' + row[0] + ' / 실제 ' + loc);
    // 그 Location이 가리키는 호스트: 자바 URI(RFC 3986)와 Node의 URL(WHATWG URL 표준, 브라우저와 같은 규칙)로 각각 계산
    const javaHost = f.host === '{서버}' ? 'shop.example에 머무름' : 'attacker.example로 이동';
    const nodeHost = new URL(toScreen(f.location), 'https://shop.example/login/done').host === 'shop.example' ? 'shop.example에 머무름' : 'attacker.example로 이동';
    if (row[1] !== javaHost) diff.push('도착하는 곳(자바 URI): 모형 ' + row[1] + ' / 계산 ' + javaHost);
    if (row[1] !== nodeHost) diff.push('도착하는 곳(WHATWG URL): 모형 ' + row[1] + ' / 계산 ' + nodeHost);
    if (b) { bn++; const went = b.attacker === 'true' ? 'attacker.example로 이동' : 'shop.example에 머무름'; if (row[1] !== went) diff.push('브라우저: 모형 ' + row[1] + ' / 실제 ' + went); }
  }
  if (diff.length) console.log('다름: ' + key + '\n   ' + diff.join('\n   ')); else ok++;
}
console.log('일치 ' + ok + ' / ' + n + ' (응답 헤더 ' + n + '가지' + (hasBrowser ? ', 그 가운데 브라우저의 동작까지 본 것 ' + bn + '가지' : ', 브라우저의 동작은 실행하지 않음: Probe에 크로미움 경로를 주지 않았음') + ')');

// 화면의 글에 적은 사실 가운데 조합 밖의 것을 따로 확인한다
const extra = [];
const head = lines.find(l => l.startsWith('# 기본 설정의 응답 헤더')) || '';
extra.push(['기본 설정의 응답에 x-frame-options=DENY, x-content-type-options=nosniff, x-xss-protection=0, cache-control이 있다', /x-frame-options=DENY/.test(head) && /x-content-type-options=nosniff/.test(head) && /x-xss-protection=0/.test(head) && /cache-control=/.test(head)]);
extra.push(['"같은 사이트의 경로만 허용" 검사는 /\\attacker.example 꼴의 값도 "/"로 바꾼다', real['redir|path|bslash'].location === '{서버}/' && real['redirrel|path|bslash'].location === '/']);
extra.push(['기본 설정(완전한 주소로 바꿔 내보냄)에서는 /\\ 값의 Location이 시험 서버의 주소로 시작한다', real['redir|slash|bslash'].location.startsWith('{서버}/')]);
extra.push(['use-relative-redirects=true에서는 Location이 받은 값 그대로 나간다', real['redirrel|none|dslash'].location === '//attacker.example/login' && real['redirrel|slash|bslash'].location === '/\\attacker.example/login']);
extra.push(['WHATWG URL 계산: /\\attacker.example/login 은 attacker.example을 가리킨다', new URL('/\\attacker.example/login', 'https://shop.example/login/done').host === 'attacker.example']);
if (hasBrowser) {
  extra.push(['크로미움: 기본 설정에서는 /\\ 값으로 다른 서버에 닿지 않는다', real['browserredir|none|bslash'].attacker === 'false' && real['browserredir|slash|bslash'].attacker === 'false']);
  extra.push(['크로미움: use-relative-redirects=true에서는 /\\ 값이 "/" 검사를 통과해 다른 서버에 닿는다', real['browserredirrel|slash|bslash'].attacker === 'true' && real['browserredirrel|path|bslash'].attacker === 'false']);
  extra.push(['크로미움: use-relative-redirects=true에서도 나머지 아홉 가지의 도착지는 기본 설정과 같다', ['none', 'slash', 'path'].every(ch => ['path', 'abs', 'dslash'].every(nx => real['browserredir|' + ch + '|' + nx].attacker === real['browserredirrel|' + ch + '|' + nx].attacker))]);
}
extra.forEach(e => { if (!e[1]) console.log('덧붙인 확인 실패: ' + e[0]); });
console.log('덧붙인 확인 ' + extra.filter(e => e[1]).length + ' / ' + extra.length);
