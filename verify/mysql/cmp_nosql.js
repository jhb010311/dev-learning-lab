// "NoSQL과 문서 모델" 실습의 모형 결과를 실제 MySQL 실행 결과(nosql_probe.out.txt)와 조합마다 대조한다.
// 문서 모델은 MySQL의 JSON 컬럼으로 재현한 것이다. 전용 문서 DB는 실행하지 않았다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('nosql');
const all = fs.readFileSync(path.join(__dirname, 'nosql_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const real = {}, extra = {};
for (const ln of all.filter(l => l.includes(' => '))) { const [k, v] = ln.split(' => '); if (k.startsWith('extra ')) extra[k.slice(6)] = v; else real[k] = v.split('|'); }
const seen = new Set(); let ok = 0, total = 0; const bad = [];
for (const c of combos(lesson)) {
  const k = c.model + '|' + c.op + '|' + c.n; if (seen.has(k)) continue; seen.add(k); total++;
  const r = real[k]; if (!r) { bad.push(k + '  실제 실행 결과가 없음'); continue; }
  const [err, a, b, d] = r, n = +c.n, rel = c.model === 'rel';
  const react = err === '0' ? '성공' : err === '1054' ? '오류 1054 (없는 컬럼)' : '오류 ' + err;
  let row;
  if (c.op === 'read') row = [react, rel ? '테이블 ' + a + '개를 조인, 결과 ' + b + '행' : (a === '1' && b === '1' ? '문서 1개, 조인 없음' : '테이블 ' + a + '개, 결과 ' + b + '행'), '주문 1건과 그 항목 ' + d + '개를 얻음'];
  else if (c.op === 'rename') row = [react, rel ? a + '행 수정 (product 테이블)' : '문서 ' + a + '개 수정', '새 이름으로 보이는 주문: ' + n + '건 중 ' + b + '건' + (d === '0' ? '' : ' (옛 이름 ' + d + '건)')];
  else {
    const added = +a - n, scope = err !== '0' && added === 0 ? '저장 안 됨' : err === '0' && added === 1 ? '문서 1개 추가' : '주문 수 ' + n + ' -> ' + a;
    row = [react, scope, c.op === 'newfield' ? 'gift가 있는 주문: ' + a + '건 중 ' + b + '건' : '수량 합계 ' + b + ' (실제 주문량 ' + d + ')'];
  }
  const model = lesson.simulate(Object.assign({}, c)).row;
  if (JSON.stringify(model) === JSON.stringify(row)) ok++; else bad.push(k + '\n   모형 ' + model.join(' / ') + '\n   실제 ' + row.join(' / '));
}
console.log('일치 ' + ok + ' / ' + total);
bad.forEach(b => console.log('다름: ' + b));
// 화면의 설명에 쓴 그 밖의 사실
const nf = Object.keys(real).filter(k => k.startsWith('rel|newfield')).map(k => real[k].slice(4).join('|')), dn = Object.keys(real).filter(k => k.startsWith('doc|newfield')).map(k => real[k].slice(4).join('|'));
const facts = [
  ['조인 없이 읽으면 테이블마다 한 번씩 쿼리 3번 (1행, 2행, 2행)', /쿼리 3번: orders 1행, order_item 2행, product 2행/.test(extra.separate || '')],
  ['ALTER TABLE로 컬럼을 추가한 뒤에는 같은 INSERT가 들어가고 기존 행에도 gift 칸이 생김', nf.length === 3 && nf.every(x => /ALTER TABLE 뒤 같은 INSERT=0,gift 칸이 있는 주문=\d+,gift가 참인 주문=1/.test(x))],
  ['gift가 없는 문서에서 gift를 읽으면 NULL', dn.length === 3 && dn.every(x => /읽은 값=NULL/.test(x))],
  ['문서 하나만 고치면 같은 상품의 이름이 두 가지로 남음', /이름 종류=기계식 키보드,키보드/.test(extra.partial || '')],
  ['JSON_SCHEMA_VALID 제약을 걸면 필드 이름을 틀린 문서가 오류 3819로 거절되고 올바른 문서는 들어감', /^3819 \| 올바른 문서는 0/.test(extra.schemacheck || '')],
];
facts.forEach(f => console.log((f[1] ? '확인: ' : '다름: ') + f[0]));
console.log('실행하지 못한 것: 전용 문서 DB(MongoDB 등). 이 PC에 없음');
if (bad.length || facts.some(f => !f[1])) process.exitCode = 1;
