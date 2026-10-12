// 기초개념 "인덱스" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(index_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값을 본다.
// 화면의 "-- 회원 1000명을 넣는다" 주석 줄은 Probe가 회원 1000명을 넣은 자리(데이터 넣기)에 해당하며, 그 줄도 Probe가 실행한 SQL 글에 그대로 들어 있어 글자 그대로 견줄 수 있다.
// "DB가 읽은 행"은 EXPLAIN ANALYZE의 scanCount에서 1을 뺀 값이다(scanCount = 읽은 행 + 1, 근거는 extra 줄들).
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('index_basic');
const lines = fs.readFileSync(path.join(__dirname, 'index_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0, extraOk = 0, extraN = 0;
const parse = v => { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
const real = {};
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => ');
  if (!k.startsWith('extra')) real[k] = parse(v);
}
const extra = {};
for (const ln of lines.slice(1)) { const [k, v] = ln.split(' => '); if (k.startsWith('extra')) extra[k.slice(6)] = parse(v); }

for (const k of Object.keys(real)) {
  const f = real[k];
  n++;
  const [idx, cond] = k.split('|'), c = { idx: idx === 'true', cond };
  const sim = lesson.simulate(c);
  const via = f.via.indexOf('IDX_NAME') >= 0 ? 'name 색인(idx_name)으로 찾음' : f.via.indexOf('PRIMARY_KEY') >= 0 ? '기본 키의 색인으로 찾음' : f.via.indexOf('tableScan') >= 0 ? '테이블의 행을 처음부터 끝까지 읽음' : '알 수 없음 ' + f.via;
  const r = [f.found + '행', via, (+f.scan - 1) + '행'];
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  let good = true;
  const bad = m => { good = false; console.log('다름: ' + k + ' ' + m); };
  if (JSON.stringify(sim.row) !== JSON.stringify(r)) bad('\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + r.join(' | '));
  if (f.sql !== wantSql) bad('화면의 SQL이 Probe가 실행한 SQL과 다름\n   화면 ' + wantSql + '\n   실행 ' + f.sql);
  if (f.create !== 'OK') bad('CREATE TABLE 실패');
  if (f.createIndex !== (c.idx ? 'OK' : 'none')) bad('CREATE INDEX 결과 ' + f.createIndex);
  // 단계 문장의 근거 1: CREATE TABLE 직후 id 열의 색인이 자동으로 생겨 있고, name 색인은 아직 없다
  if (!/^PRIMARY_KEY_\d+\(PRIMARY KEY,ID ASC,generated=TRUE\)$/.test(f.indexesAfterCreateTable)) bad('CREATE TABLE 직후의 색인 ' + f.indexesAfterCreateTable);
  // 근거 2: 회원 1000명, city마다 250명, 이웃한 name 값
  if (f.rowsAfterInsert !== '1000') bad('행 수 ' + f.rowsAfterInsert);
  if (f.cityCounts !== '서울=250,부산=250,대구=250,광주=250') bad('city별 행 수 ' + f.cityCounts);
  if (f.neighbors !== '회원776,회원777,회원778') bad('이웃한 name 값 ' + f.neighbors);
  // 근거 3: CREATE INDEX 전후로 행은 그대로, 색인이 생겼다면 name 열을 오름차순으로 정리한 색인
  if (f.rowsBeforeIndex !== '1000' || f.rowsAfterIndex !== '1000' || f.sameRowsAfterIndex !== 'true') bad('CREATE INDEX 전후의 행이 다름');
  const hasName = /IDX_NAME\(INDEX,NAME ASC,generated=FALSE\)/.test(f.indexesAfterCreateIndex), hasPk = /PRIMARY_KEY_\d+\(PRIMARY KEY,ID ASC,generated=TRUE\)/.test(f.indexesAfterCreateIndex);
  if (hasName !== c.idx || !hasPk) bad('CREATE INDEX 뒤의 색인 목록 ' + f.indexesAfterCreateIndex);
  // 근거 4: SELECT가 돌려준 행
  const ids = f.ids.split(',');
  if (cond === 'city') { if (f.found !== '250' || ids.slice(0, 3).join(',') !== '2,6,10' || !ids.every(x => (+x - 2) % 4 === 0)) bad('부산인 행 ' + ids.slice(0, 5)); }
  else if (f.ids !== '777') bad('찾아낸 행 ' + f.ids);
  // 근거 5: 모형의 단계 문장이 적는 값 (읽은 행 1000, 1)
  if (sim.events.length < 4) bad('단계가 너무 적음');
  if (good) ok++;
}
// 근거 6: 색인이 있을 때와 없을 때 찾아낸 행이 같다("찾아낸 행은 똑같고 달라지는 것은 읽는 양")
let pairOk = 0;
for (const cond of ['name', 'city', 'id']) {
  const a = real['true|' + cond], b = real['false|' + cond];
  const same = a.ids === b.ids, ra = +a.scan - 1, rb = +b.scan - 1;
  const note = cond + ': 찾아낸 행 ' + (same ? '같음' : '다름') + ', 읽은 행 색인 있음 ' + ra + ' / 없음 ' + rb;
  // 문장이 말하는 것: name은 1 대 1000, city는 1000 대 1000, id는 1 대 1
  const want = cond === 'name' ? [1, 1000] : cond === 'city' ? [1000, 1000] : [1, 1];
  if (same && ra === want[0] && rb === want[1]) { pairOk++; console.log('근거 확인: ' + note); } else console.log('다름: ' + note);
}
// 근거 7: scanCount = 읽은 행 + 1, 그리고 행 수가 늘면 전체 읽기도 같이 는다
const e = extra;
const chk = (name, cond, msg) => { extraN++; if (cond) { extraOk++; console.log('근거 확인: ' + msg); } else console.log('다름: ' + name + ' ' + JSON.stringify(e[name])); };
chk('counted', e.counted && e.counted.calls === '1000' && e.counted.scan === '1001' && e.counted.found === '1' && e.counted.via.indexOf('tableScan') >= 0, '조건에 세는 함수를 써서 전체를 읽게 하면 함수가 1000번 불리고 scanCount는 1001');
chk('tableOf0', e.tableOf0 && e.tableOf0.fullScan === '1', '행이 0개인 테이블을 전부 읽으면 scanCount 1');
chk('tableOf10', e.tableOf10 && e.tableOf10.fullScan === '11', '행이 10개인 테이블을 전부 읽으면 scanCount 11');
chk('tableOf1000', e.tableOf1000 && e.tableOf1000.fullScan === '1001' && e.tableOf1000.pkLookup === '2', '행이 1000개인 테이블을 전부 읽으면 scanCount 1001, 기본 키로 있는 행을 찾으면 2');
chk('tableOf10 pk', e.tableOf10 && e.tableOf10.pkLookup === '1', '행이 10개인 테이블에서 없는 id를 찾으면 scanCount 1');
chk('indexLookup', e.indexLookup && e.indexLookup.present === '2' && e.indexLookup.missing === '1' && e.indexLookup.pkMissing === '1', '색인으로 있는 값을 찾으면 scanCount 2(1행), 없는 값을 찾으면 1(0행)');
chk('cityIndex', e.cityIndex && e.cityIndex.via.indexOf('IDX_CITY') >= 0 && e.cityIndex.scan === '251' && e.cityIndex.found === '250', 'city 열에 색인을 만들면 city로 찾을 때 그 색인을 쓰고, 읽은 행 250 = 찾아낸 행 250');
console.log('일치 ' + ok + ' / ' + n);
console.log('쌍 확인 ' + pairOk + ' / 3, 근거 확인 ' + extraOk + ' / ' + extraN);
