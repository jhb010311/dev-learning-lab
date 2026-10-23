// 기초개념 "상속" 실습: 화면의 코드(실습의 code 함수)를 설정 조합마다 그대로 Main.java로 쓴다.
// 그다음 InheritBasicProbe.java가 이 파일들을 javac로 컴파일하고, 성공한 것은 java로 실행한다. 대조는 cmp_inherit_basic.js.
// (2026-10-22, Object·RuntimeException 중심으로 다시 짠 판. 옛 판의 소스 verify/out/inherit_basic/은 그대로 둔다.)
// 조합: Object(scene=obj) 12가지 = toString 4 x 변수 타입 3, 예외 클래스(scene=exc) 8가지 = extends 2 x 생성자 2 x catch 타입 2
// 사용: node verify/plain/inherit_basic_probe_src.js   → verify/out/inherit_basic_std/<조합>/Main.java
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('inherit_basic');
const base = path.join(__dirname, '..', 'out', 'inherit_basic_std');
const D = { scene: 'obj', tos: 'none', vt: 'Member', ext: true, ctor: 'super', ct: 'own' };
function combos() {
  const out = [];
  for (const tos of ['none', 'ok', 'typo', 'typo_noann']) for (const vt of ['Member', 'Object', 'String'])
    out.push({ key: ['obj', tos, vt].join('-'), c: Object.assign({}, D, { scene: 'obj', tos, vt }) });
  for (const ext of [true, false]) for (const ctor of ['super', 'none']) for (const ct of ['own', 'rt'])
    out.push({ key: ['exc', ext ? 'ext' : 'noext', ctor, ct].join('-'), c: Object.assign({}, D, { scene: 'exc', ext, ctor, ct }) });
  return out;
}
module.exports = { combos, base };
if (require.main === module) {
  for (const { key, c } of combos()) {
    const dir = path.join(base, key);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'Main.java'), lesson.code(c) + '\n', 'utf8');
  }
  console.log('썼음: ' + combos().length + '개 → ' + base);
}
