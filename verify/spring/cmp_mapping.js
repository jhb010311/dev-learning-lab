// "엔티티 매핑과 기본 키" 실습의 모형 결과를 실제 Hibernate 실행 결과(mapping_probe.out.txt)와 대조한다
// 비교하는 것: 결과 표의 다섯 칸, Hibernate가 만든 create table 문의 컬럼 정의 전부(모형의 ddl), 다시 읽은 memo, INSERT가 나간 횟수
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('mapping');
const lines = fs.readFileSync(path.join(__dirname, 'mapping_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
lines.filter(l => l.includes(' => ')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = l.slice(i + 4); });
// "ddl=...|persist=...|row=..." 를 { ddl, persist, row, ... } 로
function fields(v) { const o = {}; v.split('|').forEach(p => { const i = p.indexOf('='); o[p.slice(0, i)] = p.slice(i + 1); }); return o; }
function pairs(s) { const o = {}; if (s && s !== 'none') s.split(',').forEach(p => { const i = p.indexOf('='); o[p.slice(0, i)] = p.slice(i + 1); }); return o; }
// create table 문을 { table, cols: { 컬럼 이름: 정의 }, rest: [컬럼이 아닌 항목] } 으로 나눈다. 괄호 안의 쉼표는 나누지 않는다
function parseDdl(ddl) {
  const m = /^create table (\w+) \((.*)\);?$/.exec(ddl.trim());
  if (!m) throw new Error('create table 문이 아님: ' + ddl);
  const items = []; let depth = 0, cur = '';
  for (const ch of m[2]) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { items.push(cur.trim()); cur = ''; } else cur += ch; }
  items.push(cur.trim());
  const cols = {}, rest = [];
  items.forEach(it => { if (/^primary key/.test(it)) rest.push(it); else { const i = it.indexOf(' '); cols[it.slice(0, i)] = it.slice(i + 1); } });
  return { table: m[1].toLowerCase(), cols, rest };
}
function sortKeys(o) { const r = {}; Object.keys(o).sort().forEach(k => { r[k] = o[k]; }); return r; }
let ok = 0; const all = combos(lesson), bad = [];
for (const c of all) {
  const key = c.col + '|' + c.en + '|' + c.tr + '|' + c.pk, v = real[key];
  if (!v) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const f = fields(v), d = parseDdl(f.ddl), row = pairs(f.row), read = pairs(f.read), saved = f.persist === 'ok';
  const want = [d.cols.name, saved ? row.grade : '저장 안 됨', saved ? read.grade : '저장 안 됨', 'memo' in d.cols ? '있음' : '없음', saved ? row.id + (c.pk === 'auto' ? ' (DB가 정함)' : '') : '예외: ' + f.persist];
  const sim = lesson.simulate(Object.assign({}, c));
  const problems = [];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) problems.push('결과 표  모형 ' + sim.row.join(' / ') + '  실제 ' + want.join(' / '));
  if (JSON.stringify(sortKeys(sim.ddl)) !== JSON.stringify(sortKeys(d.cols))) problems.push('컬럼 정의  모형 ' + JSON.stringify(sortKeys(sim.ddl)) + '  실제 ' + JSON.stringify(sortKeys(d.cols)));
  if (d.table !== 'member' || JSON.stringify(d.rest) !== JSON.stringify(['primary key (id)'])) problems.push('테이블 이름 또는 기본 키 항목이 다름: ' + d.table + ' ' + d.rest);
  if (saved && sim.readMemo !== read.memo) problems.push('다시 읽은 memo  모형 ' + sim.readMemo + '  실제 ' + read.memo);
  if (saved && 'memo' in d.cols && row.memo !== '오늘 가입') problems.push('저장된 memo가 다름: ' + row.memo);
  if (+f.inserts !== (saved ? 1 : 0)) problems.push('INSERT 횟수  모형 ' + (saved ? 1 : 0) + '  실제 ' + f.inserts);
  if (problems.length) bad.push(key + '\n   ' + problems.join('\n   ')); else ok++;
}
console.log('일치 ' + ok + ' / ' + all.length);
bad.slice(0, 20).forEach(b => console.log('다름: ' + b));
// 요약과 assume에 적은 사실(모형의 조합이 아닌 것)이 실제 실행 결과와 맞는지 확인한다
let eok = 0, en = 0;
function expect(k, want) { en++; if (real[k] === want) eok++; else console.log('덧붙인 사실이 다름: ' + k + '  기대 ' + want + '  실제 ' + real[k]); }
// (1) 제약을 어기는 값: 모형의 viol 표와 비교
Object.keys(lesson.viol).forEach(col => Object.keys(lesson.viol[col]).forEach(val => expect('extra|viol|' + col + '|' + val, lesson.viol[col][val][0] + '|insertSent=' + lesson.viol[col][val][1])));
// (2) 테이블을 Hibernate가 만들지 않으면 unique와 length는 막지 못하고, nullable = false만 Hibernate가 막는다
['none', 'nn', 'uq', 'len'].forEach(col => ['null', 'dup', 'long'].forEach(val => expect('extra|noddl|' + col + '|' + val, col === 'nn' && val === 'null' ? 'PropertyValueException|insertSent=0' : 'ok|insertSent=1')));
// (3) 자동 생성인데 id를 직접 넣으면 예외
expect('extra|auto-with-id', 'EntityExistsException|insertSent=0');
// (4) @Enumerated를 붙이지 않으면 ORDINAL과 같은 컬럼 정의와 저장 값
en++;
{ const f = fields(real['extra|no-enumerated'] || 'ddl=create table x (y z);'), d = parseDdl(f.ddl), ordDef = lesson.simulate({ col: 'none', en: 'ORDINAL', tr: true, pk: 'assigned' }).ddl.grade;
  if (d.cols.grade === ordDef && pairs(f.row).grade === '1') eok++; else console.log('덧붙인 사실이 다름: extra|no-enumerated  ' + real['extra|no-enumerated']); }
console.log('덧붙인 사실 확인 ' + eok + ' / ' + en);
