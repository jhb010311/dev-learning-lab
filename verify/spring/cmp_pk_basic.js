// 기초개념 "기본 키" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(pk_basic_probe.out.txt)와 대조한다
// 결과 표의 네 항목, 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값(오류의 종류, NULL 비교)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('pk_basic');
const lines = fs.readFileSync(path.join(__dirname, 'pk_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  if (k.startsWith('extra')) {
    // PRIMARY KEY가 없으면 id가 빈 행이 둘 들어가고, IS NULL은 둘 다 고르며, = NULL은 하나도 고르지 못한다
    if (f.count === '2' && f.isNull === '2' && f.eqNull === '0') console.log('근거 확인: id가 빈 행 둘이 들어가고 IS NULL이 둘 다 고름 (count=2, isNull=2, eqNull=0)');
    else console.log('다름: ' + ln);
    continue;
  }
  n++;
  const [pk, second] = k.split('|'), c = { pk: pk === 'true', second };
  const sim = lesson.simulate(c);
  const kind = f.ins2 === 'OK' ? '들어감' : f.sqlstate === '23505' ? '거부됨: 같은 id가 이미 있음' : f.sqlstate === '23502' ? '거부됨: id를 비울 수 없음' : '알 수 없는 오류 ' + f.sqlstate;
  const real = [kind, f.count + '행', f.updated + '행', f.final];
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  if (f.sql !== wantSql) { good = false; console.log('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + f.sql); }
  if (f.create !== 'OK' || f.ins1 !== 'OK') { good = false; console.log('CREATE/첫 INSERT 실패: ' + k); }
  // 단계 문장의 근거: id = NULL은 언제나 0행, IS NULL은 id가 빈 행이 남아 있을 때만 1행
  const wantNull = (!c.pk && second === 'null') ? '1' : '0';
  if (f.eqNull !== '0' || f.isNull !== wantNull) { good = false; console.log('NULL 비교 값이 다름: ' + k + ' eqNull=' + f.eqNull + ' isNull=' + f.isNull); }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);
