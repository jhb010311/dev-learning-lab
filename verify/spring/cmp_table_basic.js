// 기초개념 "테이블, 행, 열" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(table_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값(CREATE 직후의 행 수, 열의 이름과 타입, 첫 INSERT 뒤의 행 수, 오류의 종류)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('table_basic');
const lines = fs.readFileSync(path.join(__dirname, 'table_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const [cr, second, col] = k.split('|'), c = { create: cr === 'true', second, col };
  const sim = lesson.simulate(c);
  const bad = [];
  // 결과 표
  const kind = f.ins2 === 'OK' ? '들어감'
    : f.ins2_state === '22018' ? '거부됨: id 칸에는 정수만 담을 수 있음'
    : f.ins2_state === '21S02' ? '거부됨: 값의 개수가 열의 개수와 다름'
    : f.ins2_state === '42S04' ? '거부됨: member 테이블이 없음' : '알 수 없는 오류 ' + f.ins2_state;
  const cnt = f.count.startsWith('ERR') ? (f.count === 'ERR 42S04' ? '테이블 없음' : '알 수 없는 오류 ' + f.count) : f.count + '행';
  const sel = f.sel === 'OK' ? f.vals
    : f.sel_state === '42S22' ? '오류: ' + (/"AGE"/.test(f.sel_msg) ? 'age라는 열이 없음' : '알 수 없는 열')
    : f.sel_state === '42S04' ? '오류: member 테이블이 없음' : '알 수 없는 오류 ' + f.sel_state;
  const real = [kind, cnt, sel];
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) bad.push('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면의 SQL = Probe가 실행한 SQL
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  if (f.sql !== wantSql) bad.push('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + f.sql);
  // 단계 문장의 근거
  const cr1 = c.create;
  if (cr1) {
    if (f.create !== 'OK') bad.push('CREATE 실패: ' + k);
    if (f.rows0 !== '0') bad.push('CREATE 직후의 행 수가 0이 아님: ' + k + ' ' + f.rows0);
    if (f.meta !== 'ID:INTEGER,NAME:CHARACTER VARYING(20)') bad.push('열의 이름과 타입이 다름: ' + k + ' ' + f.meta);
    if (f.ins1 !== 'OK' || f.rows1 !== '1') bad.push('첫 INSERT가 들어가 행이 1개가 되지 않음: ' + k);
  } else {
    if (f.create !== undefined) bad.push('CREATE가 실행됨: ' + k);
    if (f.ins1 !== 'ERR' || f.ins1_state !== '42S04') bad.push('첫 INSERT가 테이블 없음으로 거부되지 않음: ' + k);
  }
  // 모형의 마지막 단계(SELECT) 직전 상태의 행 수와 SELECT가 읽은 행 수가 실제와 같은가
  const ev = sim.events, lastSnap = ev[ev.length - 1].snap;
  if (cr1 && String(lastSnap.rows.length) !== f.count) bad.push('모형의 행 수와 실제가 다름: ' + k);
  if (f.sel === 'OK' && lastSnap.rd !== +f.nrows) bad.push('SELECT가 읽은 행 수가 다름: ' + k + ' 모형 ' + lastSnap.rd + ' 실제 ' + f.nrows);
  if (f.sel !== 'OK' && lastSnap.rd !== 'err') bad.push('SELECT 오류가 모형에 없음: ' + k);
  if (f.sel === 'OK' && lastSnap.rows.map(r => r.name).join(', ') !== f.vals) bad.push('SELECT가 읽은 값이 모형과 다름: ' + k);
  if (bad.length) bad.forEach(b => console.log(b)); else ok++;
}
console.log('일치 ' + ok + ' / ' + n);
