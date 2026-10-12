// 기초개념 "GROUP BY와 집계" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(groupby_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목(행 수, 결과, 오류), 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('groupby_basic');
const lines = fs.readFileSync(path.join(__dirname, 'groupby_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const [group, extra] = k.split('|'), c = { group: group === 'true', extra };
  const sim = lesson.simulate(c);
  const bad = [];
  // 결과 표: 오류가 아니면 실제 행을 ', '로 이은 글, 오류이면 오류 코드 90016(id가 GROUP BY 목록에 있어야 함)
  const realRows = f.rows && f.rows !== '-' ? f.rows.split('/') : [];
  let real;
  if (f.sel === 'OK') real = [f.n + '행', realRows.join(', '), '없음'];
  else {
    if (!/^90016 Column "ID" must be in the GROUP BY list/.test(f.err)) bad.push('예상한 오류가 아님: ' + k + ' ' + f.err);
    real = ['-', '-', c.group ? 'id는 묶은 열도 집계도 아님' : 'id는 집계가 아닌 열'];
  }
  if (c.extra === 'col' ? f.sel !== 'ERR' : f.sel !== 'OK') bad.push('오류 여부가 예상과 다름: ' + k + ' sel=' + f.sel);
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) bad.push('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면의 SQL = Probe가 실행한 SQL
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  if (f.sql !== wantSql) bad.push('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + f.sql);
  if (f.stmts !== '3' || f.s0 !== 'OK' || f.s1 !== 'OK') bad.push('테이블 만들기나 INSERT가 실패하거나 문장 수가 3이 아님: ' + k);
  // 단계 문장의 근거: 전체 행 수, 전체 합계, 조건에 맞는 행, 이름별 id 목록, 이름별 서로 다른 id 수, 묶음 수
  if (f.total !== '5' || f.sumAll !== '8000' || f.groups !== '3') bad.push('행 수, 합계, 묶음 수가 다름: ' + k);
  if (f.whereIds !== '(1)/(2)/(4)/(5)') bad.push('WHERE price >= 1000에 맞는 행의 id가 다름: ' + k + ' ' + f.whereIds);
  if (f.idsOf !== 'kim:1,2;lee:3,4;park:5' || f.idsOfWhere !== 'kim:1,2;lee:4;park:5') bad.push('이름별 id 목록이 다름: ' + k);
  if (f.distinctIds !== 'kim:2;lee:2;park:1') bad.push('이름별 서로 다른 id 수가 다름: ' + k);
  // 모형이 단계 문장에서 쓴 묶음(행의 id)과 거른 행이 실제와 같은가
  if (c.group) {
    const model = sim.G.map(g => g.key + ':' + g.rs.map(r => r.id).join(',')).join(';');
    const want = c.extra === 'where' ? f.idsOfWhere : f.idsOf;
    if (model !== want) bad.push('모형의 묶음이 실제와 다름: ' + k + ' 모형 ' + model + ' 실제 ' + want);
  } else {
    const model = sim.kept.map(r => r.id).join(',');
    const want = c.extra === 'where' ? '1,2,4,5' : '1,2,3,4,5';
    if (model !== want) bad.push('모형의 묶음이 실제와 다름: ' + k + ' 모형 ' + model);
  }
  if (sim.kept.map(r => '(' + r.id + ')').join('/') !== (c.extra === 'where' ? f.whereIds : '(1)/(2)/(3)/(4)/(5)')) bad.push('모형이 남긴 행이 다름: ' + k);
  // 오류 단계 문장의 근거: id를 집계 함수 안에 넣으면 실행되고, 묶음마다 id가 하나씩뿐이면 같은 문장이 오류 없이 실행됨
  if (f.maxId !== '(kim, 2)/(lee, 4)/(park, 5)') bad.push('MAX(id)를 적은 문장의 결과가 다름: ' + k + ' ' + f.maxId);
  if (!/^OK /.test(f.parkOnly) || !/^OK /.test(f.oneIdEach)) bad.push('묶음마다 id가 하나뿐일 때 오류가 났음: ' + k);
  // 모형의 마지막 단계 문장에 실제 행 수가 들어 있는가
  if (f.sel === 'OK') {
    const lastText = sim.events[sim.events.length - 1].s;
    if (lastText.indexOf('결과는 ' + f.n + '행') < 0) bad.push('마지막 단계의 행 수 문장이 실제와 다름: ' + k + ' ' + lastText);
    // 모형의 결과 줄(줄이기 전) = 실제 행 전체
    const modelRows = sim.events[sim.events.length - 1].snap.res;
    if (JSON.stringify(modelRows) !== JSON.stringify(realRows)) bad.push('모형의 결과 줄이 실제와 다름: ' + k + ' 모형 ' + modelRows.join('/') + ' 실제 ' + realRows.join('/'));
  }
  if (bad.length) console.log(bad.join('\n')); else ok++;
}
console.log('일치 ' + ok + ' / ' + n);
