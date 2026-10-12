// 기초개념 "JSON" 실습의 모형 결과를 실제 실행 결과(json_basic_probe.out.txt)와 대조한다.
// 조합마다 확인하는 것:
//  (1) 화면의 code(c)가 Probe가 두 해석기에 넣은 글자(text)와 같은 글인가 (verify/out/json_basic/input/<키>.json 파일과도 견준다)
//  (2) JSON.parse와 Jackson이 성공/실패에서 같은 판단을 했는가, 그리고 모형(facts.fail이 null인가)과 같은가
//  (3) 실패일 때 두 해석기가 알려 준 오류의 위치(줄, 칸, 그 자리의 글자)가 서로 같고 모형과 같은가
//  (4) 오류의 종류(이름 자리에 따옴표 없는 글자 / 작은따옴표 / 쉼표 뒤에 }가 옴 / 쉼표가 있어야 할 자리에 이름이 옴)를 두 해석기의 메시지와 글자에서 각각 얻어, 모형의 종류와 같은가
//  (5) 성공일 때 읽어 낸 age의 종류(JSON.parse의 typeof, Jackson의 노드 종류)와 age + 1의 값(자바스크립트)
//  (6) 모형이 말하는 "뒤쪽에도 어긋난 곳이 있다"가 사실인가: 이름이 틀린 조합에서 이름만 바로잡은 조합이 같은 쉼표 오류로 실패하는가
// 실제 값에서 표의 세 열을 얻는 방법: 성공이면 ['성공', 읽은 age의 종류, age + 1의 값], 실패이면 ['실패: ' + 오류 종류의 한국어, '읽지 못함', '읽지 못함']
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('json_basic');
const lines = fs.readFileSync(path.join(__dirname, 'json_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, extra = {};
lines.filter(l => l.includes(' => ')).forEach(l => {
  const i = l.indexOf(' => '), k = l.slice(0, i);
  if (k.startsWith('# 참고 ')) extra[k.slice(5)] = JSON.parse(l.slice(i + 4)); else if (!k.startsWith('#')) real[k] = JSON.parse(l.slice(i + 4));
});
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 오류 종류의 한국어 (모형의 WHY와 따로 적은 것)
const KO = { none: '이름에 큰따옴표가 없음', sq: '이름을 큰따옴표가 아닌 작은따옴표로 감쌈', trail: '마지막 쉼표 뒤에 이름이 와야 하는데 }가 옴', miss: '쉼표가 있어야 할 자리에 다음 이름이 바로 옴' };
// 해석기의 메시지와 오류가 난 자리의 글자에서 오류의 종류를 얻는다
function kindOf(parser, ch, msg) {
  const wantName = parser === 'js' ? /^Expected (property name or '\}'|double-quoted property name) in JSON/.test(msg) : /was expecting double-quote to start property name/.test(msg);
  const wantComma = parser === 'js' ? /^Expected ',' or '\}' after property value in JSON/.test(msg) : /was expecting comma to separate Object entries/.test(msg);
  if (wantComma) return ch === '"' ? 'miss' : '(모르는 ' + ch + ')';
  if (wantName) return ch === '}' ? 'trail' : ch === "'" ? 'sq' : /[A-Za-z_]/.test(ch) ? 'none' : '(모르는 ' + ch + ')';
  return '(모르는 오류 ' + msg + ')';
}

let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const k = [c.key, c.age, c.comma].join('-'), r = real[k], sim = lesson.simulate(Object.assign({}, c)), f = sim.f, bad = [];
  n++;
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  // (1)
  if (lesson.code(c) !== r.text) bad.push('코드가 Probe가 넣은 글과 다름\n      코드 ' + JSON.stringify(lesson.code(c)) + '\n      Probe ' + JSON.stringify(r.text));
  const file = fs.readFileSync(path.join(__dirname, '..', 'out', 'json_basic', 'input', k + '.json'), 'utf8');
  if (file !== lesson.code(c)) bad.push('코드가 입력 파일과 다름');
  // (2)
  const jsOk = r.js.ok, jkOk = r.jackson.ok === 'true';
  if (jsOk !== jkOk) bad.push('두 해석기의 판단이 다름: JSON.parse ' + jsOk + ' / Jackson ' + jkOk);
  if (jsOk !== (f.fail === null)) bad.push('성공 여부 모형 ' + (f.fail === null) + ' 실제 ' + jsOk);
  let row;
  if (jsOk && jkOk) {
    // (5)
    const jsKind = r.js.ageType === 'number' ? '숫자' : r.js.ageType === 'string' ? '글자' : '(' + r.js.ageType + ')';
    const jkKind = r.jackson.ageType === 'NUMBER' ? '숫자' : r.jackson.ageType === 'STRING' ? '글자' : '(' + r.jackson.ageType + ')';
    if (jsKind !== jkKind) bad.push('age의 종류가 다름: JSON.parse ' + jsKind + ' / Jackson ' + jkKind);
    if (r.js.keys !== 'name,age,tags' || r.jackson.names !== 'name,age,tags') bad.push('읽은 이름들이 다름: ' + r.js.keys + ' / ' + r.jackson.names);
    if (r.js.name !== '김철수' || r.jackson.nameValue !== '김철수' || r.js.tags !== '["vip","new"]' || r.jackson.tagsSize !== '2') bad.push('name 또는 tags를 다르게 읽음');
    row = ['성공', jsKind, r.js.plusOne];
  } else if (!jsOk && !jkOk) {
    // (3), (4)
    const js = r.js, jk = r.jackson, fl = f.fail;
    if (fl) {
      if (js.line !== fl.line || js.col !== fl.col || js.char !== fl.ch) bad.push('JSON.parse의 오류 위치 ' + js.line + ':' + js.col + ' ' + js.char + ' / 모형 ' + fl.line + ':' + fl.col + ' ' + fl.ch);
      if (+jk.line !== fl.line || +jk.col !== fl.col || jk.char !== fl.ch) bad.push('Jackson의 오류 위치 ' + jk.line + ':' + jk.col + ' ' + jk.char + ' / 모형 ' + fl.line + ':' + fl.col + ' ' + fl.ch);
    }
    if (+jk.line !== js.line || +jk.col !== js.col) bad.push('두 해석기의 오류 위치가 다름');
    const kj = kindOf('js', js.char, js.msg), kk = kindOf('jackson', jk.char, jk.msg);
    if (kj !== kk) bad.push('오류 종류가 다름: JSON.parse ' + kj + ' / Jackson ' + kk);
    if (f.fail && kj !== f.fail.kind) bad.push('오류 종류 모형 ' + f.fail.kind + ' 실제 ' + kj);
    if (jk.exc !== 'tools.jackson.core.exc.StreamReadException' || js.errName !== 'SyntaxError') bad.push('예외 종류 ' + js.errName + ' / ' + jk.exc);
    row = ['실패: ' + (KO[kj] || kj), '읽지 못함', '읽지 못함'];
    // (6)
    if (c.key !== 'dq' && c.comma !== 'ok') {
      const k2 = ['dq', c.age, c.comma].join('-'), r2 = real[k2];
      if (!r2 || r2.js.ok || r2.jackson.ok === 'true' || kindOf('js', r2.js.char, r2.js.msg) !== c.comma) bad.push('이름만 바로잡은 조합 ' + k2 + '이 쉼표 오류로 실패하지 않음');
    }
  } else row = ['(두 해석기 판단이 다름)', '', ''];
  if (!eq(sim.row, row)) bad.push('row 모형 ' + sim.row.join(' | ') + '\n      실제 ' + row.join(' | '));
  if (bad.length) console.log('다름: ' + k + '\n   ' + bad.join('\n   ')); else ok++;
}
console.log('일치 ' + ok + ' / ' + n);

// 참고: 화면의 조합이 아닌 것들 (assume에 적은 내용의 근거)
const cm = extra['x-comment'];
console.log('참고 주석을 넣은 글: JSON.parse 성공=' + cm.js.ok + ' / Jackson 성공=' + cm.jackson.ok);
const len = Object.keys(real).map(k => k + ':' + (real[k].jacksonLenient.ok === 'true' ? '읽힘' : '실패')).join('  ');
console.log('참고 규칙 완화 옵션(작은따옴표, 따옴표 없는 이름, 마지막 쉼표)을 켠 Jackson: ' + len);
const strs = Object.keys(real).filter(k => k.split('-')[1] === 'str' && real[k].jackson.ok === 'true').map(k => k + ' intValue=' + real[k].jackson.intValue + ' asInt=' + real[k].jackson.asInt + ' bind=' + real[k].jackson.bind);
console.log('참고 age가 "30"일 때 Jackson에서 정수로 꺼내기: ' + strs.join(' / '));
