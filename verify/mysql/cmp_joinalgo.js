// "조인 알고리즘" 실습의 모형 결과를 실제 MySQL 8.4 실행 결과(joinalgo_probe.out.txt)와 조합마다 대조한다.
// 먼저 읽는 테이블, 나중 테이블의 type/key/Extra는 EXPLAIN, 조인 방식은 EXPLAIN FORMAT=TREE의 첫 줄,
// 읽은 횟수와 행 수는 EXPLAIN ANALYZE의 loops와 rows(실제로 실행하며 센 값)에서 얻는다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('joinalgo');
const all = fs.readFileSync(path.join(__dirname, 'joinalgo_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const num = x => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ','), NAME = { m: 'member', o: 'orders' };
function parse(v) {
  const o = {}; v.split(' ## ')[0].split(' || ').forEach(x => { o[x.slice(0, x.indexOf('='))] = x.slice(x.indexOf('=') + 1); });
  o.rows = o.plan.split(' > ').map(r => { const [table, type, key, ...ex] = r.split(':'); return { table, type, key, extra: ex.join(':') === 'null' ? '' : ex.join(':') }; });
  o.nodes = o.tree.split(' > ').map(n => { const m = /^\d+\) (.*?) \[rows=(\S+) loops=(\d+)\]$/.exec(n); return m ? { what: m[1], rows: +m[2], loops: +m[3] } : { what: n }; });
  // 테이블 하나를 실제로 읽는 마디(테이블 스캔이나 인덱스 탐색)
  o.read = t => o.nodes.find(n => new RegExp('^(Table scan|Index lookup|Single-row index lookup|Index range scan) on ' + t + '( |$)').test(n.what));
  return o;
}
const real = {}; all.filter(l => !l.startsWith('#') && l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = parse(v); });
const seen = new Set(); let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.idx + '|' + c.drive + '|' + c.hash;
  if (seen.has(key)) continue; seen.add(key); n++;
  const r = real[key], sim = lesson.simulate(Object.assign({}, c));
  if (!r) { console.log('Probe 출력에 없는 조합: ' + key); continue; }
  const a = r.rows[0], b = r.rows[1], ra = r.read(a.table), rb = r.read(b.table);
  const want = [NAME[a.table], /^Inner hash join/.test(r.ftree) ? '해시 조인' : /^Nested loop inner join/.test(r.ftree) ? '중첩 루프 조인' : r.ftree, b.type + ' / ' + (b.key === 'null' ? '인덱스 없음' : b.key), num(rb.loops) + '번 × ' + num(rb.rows) + '행', num(ra.rows * ra.loops + rb.rows * rb.loops) + '행'];
  const more = [];
  if (r.ftree !== sim.p.tree) more.push('FORMAT=TREE 첫 줄  모형 ' + sim.p.tree + '  실제 ' + r.ftree);
  if (b.extra !== sim.p.extra2) more.push('나중 테이블의 Extra  모형 ' + sim.p.extra2 + '  실제 ' + b.extra);
  if (!(a.type === 'ALL' && a.key === 'null' && a.extra === '')) more.push('먼저 읽는 테이블의 줄이 ALL / NULL / 빈 Extra가 아님: ' + JSON.stringify(a));
  if (r.result !== '10000') more.push('결과 행 수 ' + r.result);
  if (JSON.stringify(sim.row) === JSON.stringify(want) && !more.length) ok++; else console.log('다름: ' + key + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | ') + more.map(x => '\n   ' + x).join(''));
}
console.log('일치 ' + ok + ' / ' + n);
// 덧붙인 확인 1: 화면에서 해시 조인 설정이 숨겨지는 경우, NO_BNL 힌트를 붙여도 계획이 같은가
const hidden = Object.keys(real).filter(k => !seen.has(k)), same = hidden.filter(k => { const t = real[k.replace(/\|false$/, '|true')]; return t && t.plan === real[k].plan && t.tree === real[k].tree; });
console.log('힌트가 영향을 주지 않는 조합: ' + same.length + ' / ' + hidden.length + ' 에서 계획이 같음');
// 덧붙인 확인 2: 요약 문장의 "회원 10명의 주문만 찾을 때 해시 조인은 orders 10,000행을 다 읽고, 인덱스가 있으면 10번 찾아가 100행만 읽는다"
const few = k => parse(all.find(l => l.startsWith('# extra few|' + k)).split(' => ')[1]), f0 = few('false'), f1 = few('true'), o0 = f0.read('o'), o1 = f1.read('o');
console.log('회원 10명만 찾을 때: 인덱스 없음 = ' + f0.ftree + ', orders ' + o0.loops + '번 × ' + num(o0.rows) + '행 / 인덱스 있음 = ' + f1.ftree + ', orders ' + o1.loops + '번 × ' + o1.rows + '행' + (/^Inner hash join/.test(f0.ftree) && o0.loops === 1 && o0.rows === 10000 && o1.loops === 10 && o1.rows === 10 ? '  (요약 문장과 일치)' : '  (요약 문장과 다름)'));
