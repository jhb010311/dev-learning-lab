// "내용 협상과 압축" 실습의 모형 결과를 실제 실행 결과(conneg_probe.out.txt)와 대조한다.
// 조합마다 다섯 열(고른 표현, Content-Encoding, 본문 크기, Vary, B가 받은 것)을 모두 비교하고, 모형에 적어 둔 크기 표(SIZES)도 zlib 결과와 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('conneg');
const lines = fs.readFileSync(path.join(__dirname, 'conneg_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => '));
const real = {}, sizes = {}, extra = [];
lines.forEach(l => { const [k, v] = l.split(' => '); if (k.startsWith('size|')) sizes[k.slice(5)] = v; else if (k.startsWith('extra|')) extra.push(l); else real[k] = v.split('|'); });
const num = n => String(n).replace(/\B(?=(\d{3})+$)/g, ',');
// 1) 크기 표
let sok = 0; const sk = { 'html-ko': 'text/html|ko', 'html-en': 'text/html|en', 'json-ko': 'application/json|ko', 'json-en': 'application/json|en', 'png': 'image/png|-' };
Object.keys(sk).forEach(k => { if (lesson.SIZES[k].join('|') === sizes[sk[k]]) sok++; else console.log('크기 다름: ' + k + '  모형 ' + lesson.SIZES[k].join('|') + '  실제 ' + sizes[sk[k]]); });
console.log('크기 표(원래, gzip, br) 일치 ' + sok + ' / ' + Object.keys(sk).length);
// 2) 조합
let ok = 0; const seen = new Set();
for (const c of combos(lesson)) {
  const k = [c.fmt, c.lang, c.enc, c.vary].join('|'); if (seen.has(k)) continue; seen.add(k);
  const r = real[k], row = lesson.simulate(Object.assign({}, c)).row;
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const [type, cl, ce, orig, wire, zl, vary, aCache, bCache, bEnc, bLang, bWire, bRight] = r;
  const size = ce === '-' ? num(orig) + '바이트 (그대로)' : num(orig) + ' → ' + num(wire) + '바이트 (' + (+wire < +orig ? Math.round((1 - wire / orig) * 100) + '% 줄어듦' : (wire - orig) + '바이트 늘어남') + ')';
  const wrong = []; if (bEnc !== '-') wrong.push(bEnc + ' 압축'); if (bLang !== '-' && bLang !== 'en') wrong.push('한국어');
  const b = bCache === 'MISS' ? '캐시가 서버에 다시 물어 B에게 맞는 응답을 받음' : wrong.length ? 'A의 응답을 그대로 받음: ' + wrong.join(', ') + ' (B에게 맞지 않음)' : 'A의 응답을 그대로 받음 (' + (vary === '-' ? '우연히 B에게도 맞음' : '요청 헤더가 같아 B에게도 맞음') + ')';
  const want = [type + (cl === '-' ? '' : ' · ' + cl), ce === '-' ? '없음' : ce, size, vary === '-' ? '없음' : vary, b];
  const sane = zl === 'ok' && aCache === 'MISS' && (bRight === 'right') === (wrong.length === 0) && (bCache === 'HIT' ? bWire === wire : true);
  if (sane && JSON.stringify(row) === JSON.stringify(want)) ok++; else console.log('다름: ' + k + '\n  모형 ' + row.join(' / ') + '\n  실제 ' + want.join(' / ') + (sane ? '' : '  (실행 결과 자체가 이상함: ' + r.join('|') + ')'));
}
console.log('일치 ' + ok + ' / ' + seen.size);
// 3) 추가 확인(실제 클라이언트가 압축을 다루는 모습): assume에 적은 내용과 같은지
const need = [/fetch 기본값 => 보낸 Accept-Encoding: gzip, deflate\|받은 Content-Encoding: gzip\|.*같음$/, /fetch에 Accept-Encoding: br => 받은 Content-Encoding: br\|.*같음$/, /curl --compressed => 보낸 Accept-Encoding: .*gzip.*\|.*같음$/, /curl 옵션 없음 => 보낸 Accept-Encoding: \(없음\)\|.*같음$/, /Vary 없는 캐시 뒤의 curl\(옵션 없음\) => 200 br HIT\|.*영어 HTML과 다름\|.*한국어 HTML과 같음$/];
const eok = need.filter(re => extra.some(l => re.test(l))).length;
extra.forEach(l => console.log('  ' + l));
console.log('추가 확인 ' + eok + ' / ' + need.length);
