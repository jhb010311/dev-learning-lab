// 리다이렉션 실습의 모형 결과를 실제 실행 결과(redirect_probe.out.txt)와 대조한다.
// 대조하는 열: 두 번째 요청(fetch와 curl 모두), 서버에 도착한 요청 수, 끝난 모습. 앞의 두 열(종류, 표준이 정한 메서드 처리)은 RFC 9110의 문구라 실행과 대조하지 않는다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('redirect');
const real = {};
fs.readFileSync(path.join(__dirname, 'redirect_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
const show = r => r.replace(/^(\S+ \S+) \+본문$/, '$1 + 본문').replace(/^(\S+ \S+)$/, '$1 (본문 없음)');
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const k = [c.code, c.m, c.dest].join('|'), r = real[k], row = lesson.simulate(Object.assign({}, c)).row; n++;
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const [fNext, cNext, fN, cN, fEnd, cEnd] = r, loop = /redirect count exceeded/.test(fEnd) && /exit 47/.test(cEnd);
  const want = [show(fNext), fN === cN ? fN + '번' : 'fetch ' + fN + '번, curl ' + cN + '번', loop ? '오류로 멈춤 (fetch는 ' + (fN - 1) + '번, curl은 ' + (cN - 1) + '번 따라간 뒤)' : fEnd === '200' && cEnd === '200' ? '200 OK' : fEnd + ' / ' + cEnd];
  const same = fNext === cNext && JSON.stringify(row.slice(2)) === JSON.stringify(want);
  if (same) ok++; else console.log('다름: ' + k + '\n  모형 ' + row.slice(2).join(' / ') + '\n  실제 ' + want.join(' / ') + (fNext === cNext ? '' : '  (fetch와 curl의 두 번째 요청이 서로 다름: ' + fNext + ' / ' + cNext + ')'));
}
console.log('일치 ' + ok + ' / ' + n);
