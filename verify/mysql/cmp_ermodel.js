// "ER 모델링" 실습의 모형 결과를 실제 MySQL 실행 결과(ermodel_probe.out.txt)와 조합마다 대조한다.
// 비교 표의 세 칸과 함께, 조회 결과의 모든 행과 끝난 뒤 각 테이블의 모든 행도 비교한다.
// "나와야 하는 것"은 모형의 코드와 따로 여기에 다시 적어, 실제 조회 결과에서 직접 판정한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('ermodel');
const lines = fs.readFileSync(path.join(__dirname, 'ermodel_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}; lines.filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
const WANT = { o2m: { find: ['1', '2'], add: ['1', '2', '4'] }, m2m: { find: ['1', '2'], add: ['java', 'spring', 'jpa', 'docker'] }, o2o: { find: ['1'], add: ['1'] } };
const NOUN = { o2m: { find: '글', add: '글' }, m2m: { find: '글', add: '태그' }, o2o: { find: '프로필', add: '프로필' } };
const sorted = rows => JSON.stringify(rows.map(r => JSON.stringify(r)).sort());
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.design + '|' + c.task; n++;
  const sim = lesson.simulate(Object.assign({}, c)), r = real[key];
  if (!r) { console.log('다름: ' + key + '  실제 실행 결과가 없음'); continue; }
  const [errno, rc, msg, rowsJson, dumpJson] = r, rows = JSON.parse(rowsJson), dump = JSON.parse(dumpJson), rel = c.design.slice(0, 3);
  // 실제 조회 결과에서 "연결된 것"의 목록을 뽑는다 (쉼표 문자열은 쉼표로 자르고, tag1~tag3은 NULL이 아닌 칸을 모은다)
  const items = c.task === 'add' && c.design === 'm2m_csv' ? rows[0][0].split(',') : c.task === 'add' && c.design === 'm2m_cols' ? rows[0].filter(x => x !== 'NULL') : rows.map(x => x[0]);
  const same = items.slice().sort().join('|') === WANT[rel][c.task].slice().sort().join('|');
  const want = [c.task === 'find' ? '조회만 함' : errno === '0' ? '성공 (' + rc + '행)' : '오류 ' + errno, rows.length + '행: ' + NOUN[rel][c.task] + ' ' + items.join(', '), same ? '같음' : '다름'];
  const problems = [];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) problems.push('비교 표  모형 ' + sim.row.join(' / ') + '  실제 ' + want.join(' / '));
  if (JSON.stringify(sim.rows) !== JSON.stringify(rows)) problems.push('조회 결과의 행  모형 ' + JSON.stringify(sim.rows) + '  실제 ' + rowsJson);
  if ((sim.werr ? sim.werr.msg : '') !== msg) problems.push('오류 메시지  모형 ' + (sim.werr ? sim.werr.msg : '') + '  실제 ' + msg);
  Object.keys(dump).concat(Object.keys(sim.dump)).forEach(t => { if (!dump[t] || !sim.dump[t] || sorted(dump[t]) !== sorted(sim.dump[t])) problems.push('끝난 뒤 ' + t + '  모형 ' + JSON.stringify(sim.dump[t]) + '  실제 ' + JSON.stringify(dump[t])); });
  if (!problems.length) ok++; else console.log('다름: ' + key + '\n   ' + [...new Set(problems)].join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);
