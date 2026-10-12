// 기초개념 "쿠키" 실습의 모형 결과를 실제 실행 결과(cookie_basic_probe.out.txt)와 대조한다.
// 대조: (1) 결과 표 세 열을 실제 값에서 얻는다. 저장된 쿠키는 첫 응답 뒤 curl jar 파일의 내용에서, Cookie 헤더는 서버가 받은 둘째 요청 원문에서,
//       둘째 응답은 서버가 보낸 원문과 curl이 받은 본문에서 얻는다.
//       (2) 화면의 코드(code 함수)가 서버가 실제로 보낸 첫 응답의 줄들과 같은 글인지(빈 줄은 (빈 줄)로 바꿔 견준다).
//       (3) 단계 문장이 기대는 사실: 첫 요청에 Cookie 헤더가 없었음, 첫 응답과 둘째 응답의 Set-Cookie 줄 유무, 클라이언트가 받은 응답에 Set-Cookie 줄이 있었는지,
//           둘째 응답 뒤 jar의 쿠키(지운 뒤 서버가 Set-Cookie를 다시 주면 다시 저장됨), 쿠키 없는 새 클라이언트는 알아보지 못함(서버가 기억하지 않음),
//           curl 인자에 Cookie 헤더를 직접 적지 않았음(헤더는 curl의 쿠키 엔진이 붙임), 쿠키를 저장하지 않는 쪽은 쿠키 옵션이 없고 저장하는 쪽은 -b와 -c에 같은 jar를 줌,
//           clear는 둘째 요청에 첫 요청과 다른 jar를 줌, 세 요청 모두 200 OK.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('cookie_basic');
const lines = fs.readFileSync(path.join(__dirname, 'cookie_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const raw = {}, real = {};
lines.slice(1).forEach(l => {
  const m = /^# (.+?) ((?:true|false)\|(?:keep|clear|nojar)) = (.*)$/.exec(l);
  if (m) { raw[m[2] + '/' + m[1]] = JSON.parse(m[3]); return; }
  if (l.includes(' => ') && !l.startsWith('#')) { const [k, v] = l.split(' => '), f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); real[k] = f; }
});
const hdr = (text, name) => { const r = new RegExp('^' + name + ':.*$', 'im').exec(text.split('\r\n\r\n')[0]); return r ? r[0] : null; };
const jarStored = txt => { const got = []; txt.split(/\r?\n/).forEach(l => { if (!l || (l.startsWith('#') && !l.startsWith('#HttpOnly_'))) return; const f = l.split('\t'); if (f.length >= 7) got.push(f[5] + '=' + f[6]); }); return got.length ? got.join('; ') : '없음'; };
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.set, c.client].join('|'), f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const R = name => raw[k + '/' + name];
  // (1) 표 세 열을 실제 값에서
  const cookieLine = hdr(R('둘째 요청'), 'Cookie');
  const body2 = R('둘째 응답').split('\r\n\r\n')[1];
  const realRow = [jarStored(R('jar(첫 응답 뒤)')), cookieLine === null ? '없음' : cookieLine, body2];
  const row = lesson.simulate(Object.assign({}, c)).row;
  if (JSON.stringify(row) !== JSON.stringify(realRow)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + realRow.join(' | '));
  if (f.resp2 !== body2) probs.push('curl이 받은 둘째 응답 본문이 서버가 보낸 것과 다름 ' + f.resp2 + ' / ' + body2);
  // (2) 화면의 코드 = 서버가 보낸 첫 응답
  const sent1 = R('첫 응답').split('\r\n').map(x => x === '' ? '(빈 줄)' : x).join('\n'), shown = lesson.code(c);
  if (sent1 !== shown) probs.push('화면의 코드와 서버가 보낸 첫 응답이 다름\n--- 서버\n' + sent1 + '\n--- 화면\n' + shown);
  // (3) 단계 문장이 기대는 사실
  const keep = c.client === 'keep', nojar = c.client === 'nojar', cookie2 = c.set && keep, saved = c.set && !nojar;
  if (hdr(R('첫 요청'), 'Cookie') !== null || f.cookie1 !== '(없음)') probs.push('첫 요청에 Cookie 헤더가 있음');
  if ((f.setSent1 === 'true') !== c.set) probs.push('첫 응답의 Set-Cookie 줄 유무가 설정과 다름 ' + f.setSent1);
  if ((f.setSent2 === 'true') !== (c.set && !cookie2)) probs.push('둘째 응답의 Set-Cookie 줄 유무가 예상과 다름 ' + f.setSent2);
  if (hdr(R('둘째 응답'), 'Set-Cookie') !== (c.set && !cookie2 ? 'Set-Cookie: visitor=kim' : null)) probs.push('둘째 응답 원문의 Set-Cookie 줄이 예상과 다름');
  if ((f.clientSaw1 === 'true') !== c.set) probs.push('클라이언트가 받은 첫 응답의 Set-Cookie 줄 유무가 서버가 보낸 것과 다름 ' + f.clientSaw1);
  if (f.stored2 !== (saved ? 'visitor=kim' : '없음')) probs.push('둘째 응답 뒤 저장된 쿠키가 예상과 다름 ' + f.stored2);
  if (f.fresh !== '처음 오셨군요') probs.push('쿠키 없는 새 클라이언트를 알아봄 ' + f.fresh);
  if (f.manualCookie !== 'false') probs.push('curl 인자에 Cookie 헤더를 직접 적음');
  if (f.statusOk !== 'true') probs.push('상태 줄이 200 OK가 아니거나 curl이 실패함');
  if (f.requests !== '3') probs.push('서버가 받은 요청 수가 3이 아님 ' + f.requests);
  const a1 = R('curl 인자(첫 요청)'), a2 = R('curl 인자(둘째 요청)');
  if (nojar) { if (/ -[bc] /.test(' ' + a1 + ' ') || / -[bc] /.test(' ' + a2 + ' ')) probs.push('쿠키를 저장하지 않는 쪽에 쿠키 옵션이 있음'); }
  else {
    const jars = s => { const m = /-b (\S+) -c (\S+)/.exec(s); return m && m[1] === m[2] ? m[1] : null; };
    if (!jars(a1) || !jars(a2)) probs.push('쿠키를 저장하는 쪽의 인자가 -b와 -c에 같은 jar를 주는 모양이 아님');
    else if ((jars(a1) === jars(a2)) !== keep) probs.push('둘째 요청의 jar가 예상과 다름(keep은 같은 jar, clear는 다른 jar) ' + jars(a1) + ' / ' + jars(a2));
    else if (!keep && jarStored(R('jar(둘째 응답 뒤)')) !== (c.set ? 'visitor=kim' : '없음')) probs.push('새 jar의 내용이 예상과 다름');
  }
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);
