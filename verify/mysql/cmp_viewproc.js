// "뷰, 프로시저, 트리거" 실습의 모형 결과를 실제 MySQL 8.4 실행 결과(viewproc_probe.out.txt)와 조합마다 대조한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('viewproc');
const all = fs.readFileSync(path.join(__dirname, 'viewproc_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const parse = v => Object.fromEntries(v.split('|').map(x => [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)]));
const real = {}; all.filter(l => !l.startsWith('#') && l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = parse(v); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = c.how + '|' + c.trig + '|' + c.qty, r = real[key], row = lesson.simulate(Object.assign({}, c)).row;
  if (!r) { console.log('Probe 출력에 없는 조합: ' + key); continue; }
  const res = r.result === 'ok' ? '성공' : /^error 3819 Check constraint 'chk_stock' is violated/.test(r.result) ? '오류 3819 (CHECK 제약 위반)' : r.result;
  const want = [res, r.orders + '행', r.stock + '개', r.log + '행' + (r.memo ? ' (' + r.memo.split(',').join(', ') + ')' : ''), r.view + '개 / ' + r.copy + '개'];
  // 모든 조합에서 같아야 하는 것: 주문 전 뷰의 값, 뷰와 복사본의 종류
  const fixed = r.viewBefore === '10' && r.viewType === 'VIEW/NULL' && r.copyType === 'BASE TABLE/InnoDB';
  if (JSON.stringify(row) === JSON.stringify(want) && fixed) ok++; else console.log('다름: ' + key + '\n   모형 ' + row.join(' / ') + '\n   실제 ' + want.join(' / ') + (fixed ? '' : '\n   뷰/복사본의 종류나 주문 전 값이 예상과 다름: ' + JSON.stringify(r)));
}
console.log('일치 ' + ok + ' / ' + n);
// 덧붙인 확인: 요약 문장의 "트랜잭션 안에서 실행하고 ROLLBACK하면 재고가 10개로 돌아온다"
const tx = all.find(l => l.startsWith('# tx-check')), t = tx ? parse(tx.split(' => ')[1]) : {};
console.log('트랜잭션으로 묶고 ROLLBACK했을 때: ' + (t.result === 'error 3819' && t.stock === '10' && t.orders === '0' && t.log === '0' ? '재고 10, 주문 0행, 로그 0행 (요약 문장과 일치)' : '요약 문장과 다름 ' + JSON.stringify(t)));
