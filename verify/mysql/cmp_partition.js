// "파티셔닝" 실습의 모형 결과를 실제 MySQL 실행 결과(partition_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('partition');
const all = fs.readFileSync(path.join(__dirname, 'partition_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const real = {}, extra = {};
for (const ln of all.filter(l => l.includes(' => '))) { const [k, v] = ln.split(' => '); if (k.startsWith('extra ')) extra[k.slice(6)] = v; else real[k] = v.split('|'); }
let ok = 0; const bad = [], cs = combos(lesson);
for (const c of cs) {
  const k = [c.how, c.pk, c.ins, c.q].join('|'), r = real[k];
  if (!r) { bad.push(k + '  실제 실행 결과가 없음'); continue; }
  const [made, put, parts, total, counts] = r, sim = lesson.simulate(Object.assign({}, c));
  const n = parts === '-' ? 0 : parts.split(',').length;
  const realRow = made === 'ok' ? ['성공', /^\d+$/.test(put) ? '오류 ' + put : put + '에 저장', parts, total + '개 중 ' + n + '개' + (n === +total ? ' (전부)' : '')] : ['오류 ' + made, '-', '-', '-'];
  // 주문 300건이 파티션마다 들어간 건수도 모형의 계산과 같아야 한다
  const spreadOk = made !== 'ok' || lesson.spread(c.how).join(',') === counts;
  if (JSON.stringify(sim.row) === JSON.stringify(realRow) && spreadOk) ok++; else bad.push(k + '\n   모형 ' + sim.row.join(' / ') + '\n   실제 ' + realRow.join(' / ') + (spreadOk ? '' : '\n   파티션별 건수: 모형 ' + lesson.spread(c.how) + ' 실제 ' + counts));
}
console.log('일치 ' + ok + ' / ' + cs.length);
bad.forEach(b => console.log('다름: ' + b));
// 화면의 설명에 쓴 그 밖의 사실
const facts = [
  ['유니크 키에 파티션 키가 없어도 오류 1503', /^1503:A UNIQUE INDEX must include all columns/.test(extra.unique || '')],
  ['기본 키와 유니크 키가 없으면 제약에 걸리지 않음', extra.nokey === 'ok'],
  ['컬럼의 범위(>=, <)로 쓰면 p2024만 읽음', extra.rewrite === 'p2024'],
  ['ADD PARTITION 뒤에는 2026년 행이 들어감', /추가 전 1526, 추가 뒤 ok, 들어간 곳 p2026=1/.test(extra.addpartition || '')],
  ['DROP PARTITION p2023이 121행을 없앰', /전체 301행, p2023 121행 -> DROP PARTITION p2023 뒤 전체 180행/.test(extra.droppartition || '')],
  ['기본 키가 (id, ordered_at)이면 id만 같은 두 행이 들어감', /^ok, id가 5000인 행 수=2/.test(extra.sameid || '')],
  ['HASH에서 BETWEEN 5 AND 6은 p1, p2만 읽음', extra.shortrange === 'p1,p2'],
  ['파티션 셋이 저마다 PRIMARY 인덱스를 가진 별도의 InnoDB 테이블과 파일', /^InnoDB 테이블 3개, PRIMARY 인덱스 3개, 데이터 파일 3개/.test(extra.localindex || '')],
  ['파티션 넷이 테이블 하나, 엔진 InnoDB', /^1개 테이블, 4개 파티션, 엔진 InnoDB/.test(extra.engine || '')],
];
facts.forEach(f => console.log((f[1] ? '확인: ' : '다름: ') + f[0]));
if (bad.length || facts.some(f => !f[1])) process.exitCode = 1;
