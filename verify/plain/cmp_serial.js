// "직렬화" 실습의 모형 결과를 실제 실행 결과(SerialProbe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('serial');
const lines = fs.readFileSync(path.join(__dirname, 'SerialProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => '));
const real = {}, extra = {};
lines.forEach(l => { const i = l.indexOf(' => '), k = l.slice(0, i), v = l.slice(i + 4); if (k.startsWith('extra|')) extra[k.slice(6)] = v; else real[k] = v.split('|'); });
const seen = new Set(); let ok = 0, n = 0;
for (const c of combos(lesson)) {      // combos가 fix를 적용하므로 뜻이 같은 조합은 하나로 모인다
  const key = c.cls + '|' + c.fld + '|' + c.chg; if (seen.has(key)) continue; seen.add(key); n++;
  const r = real[key]; if (!r) { console.log('실행 결과 없음: ' + key); continue; }
  // 실제: 저장 결과 | 되살리기 결과 | 되살린 name과 point | 생성자 실행 횟수 | 예외 메시지
  const [save, loadR, vals, ctor, msg] = r;
  const want = [save === 'ok' ? '성공' : save + ' (' + msg + ')', loadR === 'ok' ? '성공' : loadR === '-' ? '하지 못함' : loadR, vals === '-' ? '없음' : ({ 50: '50 (저장할 때의 값)', 0: '0 (기본값)', 70: '70 (저장 뒤에 바꾼 값)' })[vals.split(' ')[1]], ctor + '번'];
  const sim = lesson.simulate(Object.assign({}, c));
  let good = JSON.stringify(sim.row) === JSON.stringify(want);
  if (vals !== '-' && vals.split(' ')[0] !== 'kim') good = false;                       // 되살린 name
  // serialVersionUID를 1에서 2로 바꾼 조합은 예외 메시지의 숫자까지, 자동 계산 조합은 두 값이 서로 다른지를 확인한다
  const m = /stream classdesc serialVersionUID = (-?\d+), local class serialVersionUID = (-?\d+)/.exec(msg);
  if (loadR === 'InvalidClassException' && !(m && (c.chg === 'uid' ? m[1] === '1' && m[2] === '2' : m[1] !== m[2]))) good = false;
  if (good) ok++; else console.log('다름: ' + key + '  모형 ' + sim.row.join(' / ') + '  실제 ' + want.join(' / ') + '  [' + msg + ']');
}
Object.keys(real).forEach(k => { if (!seen.has(k)) console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n);
// 조합이 아닌, 글에서 말하는 사실의 확인
const facts = { 'serialVersionUID를 1L로 둔 채 필드 추가 뒤 읽기 (name point email)': 'kim 50 null', 'transient String 필드를 되살린 값 (name point memo)': 'kim 50 null', 'static 필드를 다른 프로그램에서 읽은 값 (name point)': 'kim 0', 'Address 필드에 transient를 붙이고 저장한 뒤 되살린 값 (name point address)': 'kim 50 null', '되살린 객체 == 원래 객체': 'false' };
let fo = 0; Object.keys(facts).forEach(k => { if (extra[k] === facts[k]) fo++; else console.log('사실 확인 다름: ' + k + ' => ' + extra[k]); });
console.log('따로 확인한 사실 ' + fo + ' / ' + Object.keys(facts).length);
