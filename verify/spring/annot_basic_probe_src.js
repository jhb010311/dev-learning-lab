// 기초개념 "애너테이션" 실습의 화면 코드(code 함수)를 조합마다 파일로 꺼낸다. AnnotBasicProbe.java가 이 글을 그대로 컴파일하고 실행한다.
// 사용: node verify/spring/annot_basic_probe_src.js  →  verify/out/annot_basic_std/<조합>/screen.txt
// 조합: who(service/override/test/decl/run)마다 그 물음에 쓰이는 설정 두 개(put과 spring/typo/junit/reader)만 바꾼다. decl은 하나.
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const l = load('annot_basic');
const SECOND = { service: 'spring', override: 'typo', test: 'junit', run: 'reader' };
const out = path.join(__dirname, '..', 'out', 'annot_basic_std');
const keys = [];
for (const who of ['service', 'override', 'test', 'decl', 'run']) {
  const list = who === 'decl' ? [[true, false]] : [[true, true], [true, false], [false, true], [false, false]];
  for (const [put, x] of list) {
    const c = { who, put, spring: true, typo: false, junit: true, reader: true };
    if (SECOND[who]) c[SECOND[who]] = x;
    const key = who === 'decl' ? 'decl' : [who, put, x].join('-');
    fs.mkdirSync(path.join(out, key), { recursive: true });
    fs.writeFileSync(path.join(out, key, 'screen.txt'), l.code(c), 'utf8');
    keys.push(key);
  }
}
fs.writeFileSync(path.join(out, 'keys.txt'), keys.join('\n') + '\n', 'utf8');
console.log(keys.length + '개 조합의 화면 코드를 ' + out + '에 씀');
