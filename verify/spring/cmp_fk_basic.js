// 기초개념 "외래 키" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(fk_basic_probe.out.txt)와 대조한다
// 결과 표의 네 항목, 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값(오류의 종류, 지워진 행 수, member의 남은 행 수)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('fk_basic');
const lines = fs.readFileSync(path.join(__dirname, 'fk_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  if (k.startsWith('extra')) {
    // 참고: 열 정의 옆의 REFERENCES도 H2는 외래 키로 받아들여 없는 번호의 INSERT를 거부한다(MySQL은 이 모양을 무시한다)
    if (f.ins99 === 'ERR' && f.sqlstate === '23506') console.log('근거 확인: H2는 열 정의 옆의 REFERENCES도 외래 키로 받아들임 (23506)');
    else console.log('다름: ' + ln);
    continue;
  }
  n++;
  const [fk, who] = k.split('|'), c = { fk: fk === 'true', who };
  const sim = lesson.simulate(c);
  // 같은 줄에 INSERT와 DELETE의 오류가 모두 있으면 두 번째 sqlstate가 덮어쓰므로, 오류는 문장별로 따로 읽는다
  const m = ln.match(/ins11=ERR\|sqlstate=(\d+)\|code=(\d+)/), d = ln.match(/del=ERR\|sqlstate=(\d+)\|code=(\d+)/);
  const insKind = f.ins11 === 'OK' ? '들어감' : m && m[1] === '23506' ? '거부됨: member에 없는 번호' : '알 수 없는 오류 ' + (m && m[1]);
  const delKind = f.del === 'OK' ? '지워짐' : d && d[1] === '23503' ? '거부됨: 이 회원을 가리키는 주문이 있음' : '알 수 없는 오류 ' + (d && d[1]);
  const real = [insKind, delKind, f.final, f.orphans + '건'];
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  if (f.sql !== wantSql) { good = false; console.log('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + f.sql); }
  if (f.createMember !== 'OK' || f.createOrders !== 'OK' || f.insMember !== 'OK' || f.ins10 !== 'OK') { good = false; console.log('CREATE/앞의 INSERT 실패: ' + k); }
  // 단계 문장의 근거: 외래 키가 없으면 DELETE가 1행을 지우고 member가 비며, 있으면 member에 1행이 남는다
  if (c.fk ? (f.members !== '1' || f.del !== 'ERR') : (f.members !== '0' || f.deleted !== '1')) { good = false; console.log('DELETE 뒤의 member 행 수가 다름: ' + k + ' members=' + f.members + ' deleted=' + f.deleted); }
  // 단계 문장의 근거: 외래 키가 있을 때 DELETE를 막는 것은 주문 10이다(모형은 항상 거부로 적는다). 주문의 수도 본다
  const wantOrders = c.fk ? (who === 'none' ? 1 : 2) : 2;
  const gotOrders = (f.final.match(/\(/g) || []).length;
  if (gotOrders !== wantOrders) { good = false; console.log('남은 주문 수가 다름: ' + k + ' ' + gotOrders); }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);
