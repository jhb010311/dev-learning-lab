// 영어로 옮긴 설명집 파일 하나를 한국어 원본과 대조한다. 사용: node tools/i18n/check_kb.js <파일 이름>   예: node tools/i18n/check_kb.js kb1.js
// 보는 것: kb/en/<파일>이 있고 줄 수(용어 수)와 순서가 원본과 같은지, 분류가 maps.js의 이름인지, 용어 이름이 용어 대조표의 영어 이름인지,
//          한글이 남지 않았는지, 설명이 지나치게 짧거나 길지 않은지(원문에서 빠뜨리거나 보탠 것이 없는지의 대략적인 신호).
const fs = require('fs'), path = require('path'), whyuse = require('../whyuse.js');
const root = path.join(__dirname, '..', '..'), f = process.argv[2], HAN = /[가-힣]/, MAPS = require('./maps.js');
if (!f) { console.log('사용: node tools/i18n/check_kb.js <파일 이름>'); process.exit(1); }
const koP = path.join(root, 'kb', f), enP = path.join(root, 'kb', 'en', f), errs = [], warns = [];
if (!fs.existsSync(enP)) { console.log('영어 파일이 없음: kb/en/' + f); process.exit(1); }
const tbDir = path.join(root, 'src', 'en', 'termbase'), tb = {};
fs.readdirSync(tbDir).filter(x => x.endsWith('.js')).forEach(x => require(path.join(tbDir, x)).forEach(r => { tb[r.ko] = r.en; }));
let ko, en; try { ko = require(koP); en = require(enP); } catch (e) { console.log('오류: 파일을 읽지 못함: ' + e.message); process.exit(1); }
fs.readFileSync(enP, 'utf8').split('\n').forEach((l, i) => { if (HAN.test(l)) errs.push('한글이 남음 (' + (i + 1) + '줄): ' + l.trim().slice(0, 60)); });
if (ko.length !== en.length) errs.push('용어 수가 다름: 한국어 ' + ko.length + '개, 영어 ' + en.length + '개');
else ko.forEach((r, i) => {
  const e = en[i], at = (i + 1) + '번째 (' + r[1] + ')';
  const fe = whyuse.kbErrors(e); if (fe.length) return errs.push(at + ': ' + fe.join(', '));
  // 네 번째 칸(why, use)은 원본에 있는 것과 같은 것이 있어야 한다
  whyuse.sameKeys(r[3], e[3]).forEach(k => errs.push(at + ': 네 번째 칸의 ' + k + '가 ' + (r[3] && r[3][k] ? '원본에는 있는데 영어에 없음' : '원본에는 없는데 영어에 있음')));
  if (e[0] !== MAPS.KBCAT[r[0]]) errs.push(at + ': 분류는 ' + JSON.stringify(MAPS.KBCAT[r[0]]) + ' 이어야 함');
  if (!tb[r[1]]) errs.push(at + ': 용어 대조표에 없는 용어'); else if (e[1] !== tb[r[1]]) errs.push(at + ': 용어 이름은 대조표의 ' + JSON.stringify(tb[r[1]]) + ' 이어야 함 (지금 ' + JSON.stringify(e[1]) + ')');
  // 한글 한 자는 영어 두세 자쯤이다. 비율이 크게 벗어나면 빠뜨렸거나 보탠 것일 수 있다.
  const ratio = e[2].length / r[2].length; if (ratio < 1.5) warns.push(at + ': 설명이 원문에 비해 짧음(비율 ' + ratio.toFixed(1) + '). 빠뜨린 문장이 없는지 확인'); if (ratio > 3.6) warns.push(at + ': 설명이 원문에 비해 김(비율 ' + ratio.toFixed(1) + '). 보탠 내용이 없는지 확인');
  const ns = s => (s.match(/\d+(?:\.\d+)?/g) || []).sort().join(','); if (ns(r[2]) !== ns(e[2])) warns.push(at + ': 설명 속 숫자가 원문과 다름 (원문 ' + (ns(r[2]) || '없음') + ' / 영어 ' + (ns(e[2]) || '없음') + '). 한글로 쓴 숫자를 옮긴 것이면 괜찮음');
});
warns.forEach(w => console.log('주의: ' + w)); errs.forEach(e => console.log('오류: ' + e));
console.log(errs.length ? '\n검사 실패 (' + errs.length + '개)' : '\n검사 통과: ' + en.length + '개' + (warns.length ? ' (주의 ' + warns.length + '개)' : ''));
process.exit(errs.length ? 1 : 0);
