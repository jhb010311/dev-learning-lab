// "열거형(enum)" 실습의 화면 코드(code 함수)를 조합마다 파일로 꺼낸다. EnumTypeProbe.java가 이 글을 그대로 컴파일해 Hibernate로 실행한다.
// 사용: node verify/spring/enumtype_probe_src.js [출력 폴더]  (기본: verify/out/enumtype_jpa)
//   →  <출력 폴더>/<저장 방식>_<변경>_<상수>/screen.txt  (지금 선언, 다시 배포한 뒤의 코드)
//      <출력 폴더>/<저장 방식>_old/screen.txt          (예전 선언 ORDERED, PAID, SHIPPED. 처음 배포해 저장할 때의 코드)
//      <출력 폴더>/keys.txt
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const l = load('enumtype');
const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'out', 'enumtype_jpa'));
const keys = [];
const write = (key, text) => { fs.mkdirSync(path.join(out, key), { recursive: true }); fs.writeFileSync(path.join(out, key, 'screen.txt'), text, 'utf8'); };
for (const c of combos(l)) {
  const key = [c.store, c.change, c.saved].join('_');
  write(key, l.code(c));
  keys.push(key);
}
// 예전 선언의 코드: 선언을 고치지 않은 조합(same)의 화면 코드와 같다
for (const store of ['ORDINAL', 'STRING', 'code']) write(store + '_old', l.code({ store, change: 'same', saved: 'PAID' }));
fs.writeFileSync(path.join(out, 'keys.txt'), keys.join('\n') + '\n', 'utf8');
console.log(keys.length + '개 조합의 화면 코드를 ' + out + '에 씀');
