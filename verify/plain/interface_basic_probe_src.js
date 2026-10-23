// 기초개념 "인터페이스" 실습: 화면의 코드(실습의 code 함수)를 설정 조합마다 그대로 Main.java로 쓴다.
// 그다음 InterfaceBasicProbe.java가 이 파일들을 javac로 컴파일하고 실행한다. 대조는 cmp_interface_basic.js.
// 조합: 목록(scene=list) 12가지 = 변수 타입 2 x 만드는 것 3 x trimToSize 2, 정렬(scene=sort) 3가지, 직접 선언(scene=own) 2가지
// 사용: node verify/plain/interface_basic_probe_src.js   → verify/out/interface_basic_std/<조합>/Main.java
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('interface_basic');
const base = path.join(__dirname, '..', 'out', 'interface_basic_std');
function combos() {
  const out = [];
  for (const vtype of ['List', 'ArrayList']) for (const make of ['ArrayList', 'LinkedList', 'List']) for (const trim of [false, true])
    out.push({ key: ['list', vtype, make, trim].join('-'), c: { scene: 'list', vtype, make, trim, cmp: 'both', own: 'iface' } });
  for (const cmp of ['both', 'noimpl', 'nomethod']) out.push({ key: 'sort-' + cmp, c: { scene: 'sort', vtype: 'List', make: 'ArrayList', trim: false, cmp, own: 'iface' } });
  for (const own of ['iface', 'cls']) out.push({ key: 'own-' + own, c: { scene: 'own', vtype: 'List', make: 'ArrayList', trim: false, cmp: 'both', own } });
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
