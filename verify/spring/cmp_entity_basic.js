// 기초개념 "엔티티" 실습의 모형 결과를 실제 Hibernate 7.4.5 + H2 실행 결과(entity_basic_probe.out.txt)와 대조한다
// 결과 표의 네 항목, 화면의 코드(Probe가 컴파일한 Member 소스와 저장하는 쪽 세 줄)가 같은 글인지, 단계 문장이 기대는 사실을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('entity_basic');
const lines = fs.readFileSync(path.join(__dirname, 'entity_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0, extraOk = 0, extraAll = 0;
const cap = s => s.charAt(0) + s.slice(1).toLowerCase();
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '); n++;
  if (v.startsWith('COMPILE_ERROR')) { console.log('컴파일 오류: ' + k + ' ' + v); continue; }
  const [ent, idf, extra] = k.split('|').map(x => x === 'true'), c = { ent, idf, extra }, f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const sim = lesson.simulate(c);
  // 실제 값에서 결과 표의 네 항목을 만든다
  let result;
  if (f.build === 'ERR' && /has no identifier/.test(f.buildEx) && /AnnotationException/.test(f.buildEx)) result = 'JPA가 시작하다가 실패함: 기본 키로 쓸 필드가 없음';
  else if (f.build === 'OK' && /^persist: java\.lang\.IllegalArgumentException: Unknown entity type/.test(f.persistEx)) result = '저장할 수 없음: 엔티티가 아닌 클래스';
  else if (f.build === 'OK' && f.persistEx === '-' && f.insTotal === '1') result = '저장됨';
  else result = '알 수 없음: ' + f.buildEx + ' / ' + f.persistEx;
  const tm = /^(\w+)\(([^)]*)\)$/.exec(f.tablesEnd);
  const table = f.tablesEnd === '-' ? '만들어지지 않음' : cap(tm[1]) + ' (' + tm[2].toLowerCase().split(',').join(', ') + ')';
  const rm = /^(\w+)=(\d+)\{/.exec(f.rows);
  const real = [result, table, f.insTotal + '번', f.rows === '-' ? '테이블 없음' : rm[2] + '행'];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  // 화면의 코드 = Probe가 컴파일한 Member 소스 + 저장하는 쪽
  const want = f.src.replace(/\\n/g, '\n').replace(/\n+$/, '') + '\n\n// 저장하는 쪽 (메서드 안의 줄만 보임. 그 메서드의 선언, em을 만드는 코드, import는 생략)\n' + f.save.replace(/\\n/g, '\n');
  const shown = lesson.code.call(lesson, c);
  if (shown !== want) { good = false; console.log('화면의 코드가 Probe가 컴파일한 소스와 다름: ' + k + '\n--- 화면\n' + shown + '\n--- 실행\n' + want); }
  // 단계 문장이 기대는 사실
  const text = sim.events.map(e => e.s).join('\n');
  const facts = {
    '시작 직후와 실행 뒤의 테이블이 같다(테이블은 시작할 때 만들어지고 persist나 commit이 만드는 것이 아니다)': f.tablesBuild === f.tablesEnd,
    '저장됨이면: INSERT는 persist 줄이 끝난 때 0번, commit 줄이 끝난 때 1번': result !== '저장됨' || (f.insAtPersist === '0' && f.insAtCommit === '1'),
    '저장됨이면: 나간 INSERT 문이 단계 문장에 적은 글과 같고(대소문자 그대로), 한 번뿐이다': result !== '저장됨' || (f.dml === sim.ins && text.includes('"' + sim.ins + '"')),
    '저장됨이면: email이 있을 때 email 열은 NULL이고 name은 김철수, id는 1': result !== '저장됨' || (c.extra ? f.rows === 'MEMBER=1{ID=1,EMAIL=null,NAME=김철수}' : f.rows === 'MEMBER=1{ID=1,NAME=김철수}'),
    '엔티티가 아닌 클래스: 시작은 성공하고 JPA가 아는 엔티티가 없다(오류는 persist 줄에서)': c.ent || (f.build === 'OK' && f.known === 'none' && /^persist:/.test(f.persistEx)),
    '엔티티가 아닌 클래스: 오류 메시지에 not annotated \'@Entity\'가 들어 있다(단계 문장이 인용한 글)': c.ent || (f.persistEx.includes("Unknown entity type 'app.Member' ('Member' is not annotated '@Entity')") && text.includes("Unknown entity type 'app.Member' ('Member' is not annotated '@Entity')")),
    '@Entity만 있고 @Id가 없음: 시작에서 실패하고 persist까지 가지 못한다': !(c.ent && !c.idf) || (f.build === 'ERR' && f.persistEx === '-' && f.insTotal === '0' && f.known === '-'),
    '@Entity만 있고 @Id가 없음: 오류 메시지에 Entity \'app.Member\' has no identifier가 들어 있다': !(c.ent && !c.idf) || (f.buildEx.includes("Entity 'app.Member' has no identifier") && text.includes("Entity 'app.Member' has no identifier")),
    '열 순서: id가 먼저, 나머지는 이름 순이다(email이 name보다 앞)': f.tablesEnd === '-' || (c.extra ? f.tablesEnd === 'MEMBER(ID,EMAIL,NAME)' : f.tablesEnd === 'MEMBER(ID,NAME)'),
    '테이블이 만들어졌으면 Hibernate가 아는 엔티티는 Member 하나': f.tablesEnd === '-' || f.known === 'Member',
  };
  for (const [name, pass] of Object.entries(facts)) { extraAll++; if (pass) extraOk++; else { good = false; console.log('사실 불일치: ' + k + ' / ' + name); } }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);
