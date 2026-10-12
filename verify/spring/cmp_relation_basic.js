// 기초개념 "연관관계" 실습의 모형 결과를 실제 Hibernate 7.4.5 + H2 실행 결과(relation_basic_probe.out.txt)와 대조한다
// 결과 표의 네 항목, 화면의 코드(Probe가 컴파일한 Order 소스와 쓰는 쪽)가 같은 글인지, 단계 문장이 기대는 사실(나간 SQL, 오류 메시지)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('relation_basic');
const lines = fs.readFileSync(path.join(__dirname, 'relation_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0, extraOk = 0, extraAll = 0;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '); n++;
  if (v.startsWith('COMPILE_ERROR')) { console.log('컴파일 오류: ' + k + ' ' + v); continue; }
  const c = { how: k }, f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const sim = lesson.simulate(c);
  // 실제 값에서 결과 표의 네 항목을 만든다
  let result;
  if (f.build === 'ERR' && /MappingException/.test(f.buildEx) && /missing association mapping annotation/.test(f.buildEx)) result = 'JPA가 시작하다 실패함: 엔티티 타입의 필드에 연관관계 표시가 없음';
  else if (f.build === 'OK' && f.ex === '-' && f.out === '김철수') result = '김철수';
  else result = '알 수 없음: ' + f.buildEx + ' / ' + f.ex + ' / ' + f.out;
  const om = /(?:^|;)ORDERS\(([^)]*)\)/.exec(f.tablesEnd);
  const table = om ? 'orders (' + om[1].toLowerCase().split(',').join(', ') + ')' : '만들어지지 않음';
  let fk;
  if (!om) fk = '테이블 없음';
  else if (f.fk === '-') fk = '없음';
  else { const m = /^ORDERS\.(\w+)->(\w+)\.(\w+)$/.exec(f.fk); fk = m ? '있음: ' + m[1].toLowerCase() + ' → ' + cap(m[2]) + '의 ' + m[3].toLowerCase() : '알 수 없음: ' + f.fk; }
  let rowText = '테이블 없음';
  if (f.orders !== '-') {
    const rm = /^(\d+)\{(.*)\}$/.exec(f.orders), cells = rm[2].split(',').map(x => x.split('='));
    const idc = cells.find(x => x[0] === 'ID'), others = cells.filter(x => x[0] !== 'ID');
    rowText = rm[1] === '1' ? ['id ' + idc[1]].concat(others.map(x => x[0].toLowerCase() + ' ' + x[1])).join(', ') : rm[1] + '행';
  }
  const real = [result, table, fk, rowText];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  // 화면의 코드 = Probe가 컴파일한 Order 소스 + 쓰는 쪽
  const want = f.src.replace(/\\n/g, '\n').replace(/\n+$/, '') + '\n\n' + f.save.replace(/\\n/g, '\n');
  const shown = lesson.code.call(lesson, c);
  if (shown !== want) { good = false; console.log('화면의 코드가 Probe가 컴파일한 소스와 다름: ' + k + '\n--- 화면\n' + shown + '\n--- 실행\n' + want); }
  // 단계 문장이 기대는 사실
  const text = sim.events.map(e => e.s).join('\n'), obj = k === 'ref' || k === 'named', S = sim.sql;
  const allSql = f.saveSql === '-' && f.readSql === '-' ? [] : (f.saveSql === '-' ? [] : f.saveSql.split(' ;; ')).concat(f.readSql === '-' ? [] : f.readSql.split(' ;; '));
  const lastSnap = sim.events[sim.events.length - 1].snap;
  const facts = {
    '테이블은 시작할 때 만들어지고 실행 중에 바뀌지 않는다(시작 직후와 실행 뒤가 같다)': f.tablesBuild === f.tablesEnd && f.fkBuild === f.fk,
    '준비 단계(member 테이블에 행 넣기)가 성공했거나 JPA가 시작하지 못했다': f.build === 'ERR' ? f.prepEx === '-' : f.prepEx === '-',
    '시작에 성공하면 Hibernate가 아는 엔티티는 Member와 Order 둘': f.build === 'ERR' || f.known.split(',').sort().join(',') === 'Member,Order',
    '외래 키 제약은 연관관계가 있을 때만 있고, 가리키는 곳은 MEMBER.ID다': f.build === 'ERR' || (obj ? /^ORDERS\.(MEMBER_ID|BUYER_ID)->MEMBER\.ID$/.test(f.fk) : f.fk === '-'),
    '외래 키 열의 이름: ref는 member_id, named는 buyer_id(단계 문장이 말한 것)': !obj || f.fk === (k === 'named' ? 'ORDERS.BUYER_ID->MEMBER.ID' : 'ORDERS.MEMBER_ID->MEMBER.ID'),
    '저장된 주문 행은 하나이고 id는 10, 외래 키 열의 값은 1이다': f.build === 'ERR' || /^1\{(ID=10,(MEMBER_ID|BUYER_ID)=1|(MEMBER_ID|BUYER_ID)=1,ID=10)\}$/.test(f.orders),
    '시작에 실패하면 SQL이 한 번도 나가지 않고 테이블이 없다': f.build !== 'ERR' || (allSql.length === 0 && f.tablesEnd === '-' && f.saveInserts === '0' && f.saveSelects === '0'),
    '시작에 실패하면 오류 메시지에 단계 문장이 인용한 글이 들어 있다': f.build !== 'ERR' || (f.buildEx.includes("Incorrect use of entity type 'app.Member' (possibly due to missing association mapping annotation)") && f.buildEx.includes("Could not determine recommended JdbcType for Java type 'app.Member'") && text.includes("Incorrect use of entity type 'app.Member' (possibly due to missing association mapping annotation)")),
    '연관관계가 있으면: 저장 단계에서 SELECT 1번(Member를 찾는 find), INSERT 1번이고 글이 모형과 같다': !obj || (f.saveSelects === '1' && f.saveInserts === '1' && f.saveSql === S.selM + ' ;; ' + S.insO && text.includes('"' + S.insO + '"')),
    '연관관계가 있으면: 다시 읽을 때 SELECT 1번이고 그 문장이 member 테이블까지 함께 읽는다': !obj || (f.readSelects === '1' && f.readSelectsMember === '1' && f.readSql === S.readJoin),
    '번호만 두면: 저장 단계에서 SELECT 없이 INSERT 1번이고 글이 모형과 같다': k !== 'idonly' || (f.saveSelects === '0' && f.saveInserts === '1' && f.saveSql === S.insO && text.includes('"' + S.insO + '"')),
    '번호만 두면: 읽기 단계에서 SELECT가 2번이고, 첫째는 orders만, 둘째는 우리가 부른 member 찾기다': k !== 'idonly' || (f.readSelects === '2' && f.readSql === S.readO + ' ;; ' + S.selM),
    '단계가 보인 SQL 목록(마지막 단계)이 실제로 나간 SQL과 같다': f.build === 'ERR' || JSON.stringify(lastSnap.sql) === JSON.stringify(allSql),
    '마지막 단계에서 세는 INSERT와 SELECT가 실제와 같다': f.build === 'ERR' || (String(lastSnap.ins) === f.saveInserts && String(lastSnap.sel) === String(+f.saveSelects + +f.readSelects)),
    '화면에 찍힌 글(System.out)이 한 줄 김철수다': f.build === 'ERR' ? f.out === '-' : f.out === '김철수',
  };
  for (const [name, pass] of Object.entries(facts)) { extraAll++; if (pass) extraOk++; else { good = false; console.log('사실 불일치: ' + k + ' / ' + name); } }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);
