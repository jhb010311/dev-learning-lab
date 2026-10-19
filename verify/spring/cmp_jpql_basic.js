// 기초개념 "JPQL" 실습의 모형 결과를 실제 Hibernate 7.4.5 + H2 실행 결과(jpql_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 코드(Probe가 컴파일해 실행한 소스와 같은 글인가), 단계 문장이 기대는 사실(오류가 난 줄, 줄마다의 SQL 수, SQL이 나간 줄, 돌아온 객체의 클래스와 값, 예외의 종류와 메시지)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('jpql_basic');
const lines = fs.readFileSync(path.join(__dirname, 'jpql_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
function fields(v) { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); if (i > 0) f[p.slice(0, i)] = p.slice(i + 1); }); return f; }
const rec = {};
lines.slice(1).forEach(ln => { const [k, v] = ln.split(' => '); rec[k] = fields(v); });
const CREATE = 'TypedQuery<Member> query = em.createQuery(jpql, Member.class);', GET = 'List<Member> list = query.getResultList();';
function obsMap(s) { const m = {}; (s || '').split(' ## ').filter(Boolean).forEach(e => { const i = e.indexOf(' :: '); m[e.slice(0, i)] = e.slice(i + 4); }); return m; }
let ok = 0, n = 0, factOk = 0, factAll = 0;
for (const q of ['ok', 'table', 'col', 'field']) {
  n++;
  const c = { q }, f = rec[q], m = rec['measure|' + q];
  if (!f || !m) { console.log('Probe 출력에 없음: ' + q); continue; }
  let good = true;
  const sim = lesson.simulate(c), bad = q === 'table' || q === 'col';
  const sqls = f.sqls ? f.sqls.split(' ## ').map(e => { const i = e.indexOf(' :: '); return { at: e.slice(0, i), sql: e.slice(i + 4) }; }) : [];
  const ob = obsMap(m.obs), o = s => ob[s] || '';
  const get = (stmt, key) => { const mm = new RegExp(key + '=(\\S*)').exec(o(stmt)); return mm ? mm[1] : '?'; };
  let real;
  if (bad) {
    const reason = /Could not resolve root entity 'member_tbl'/.test(f.err) ? 'member_tbl이라는 엔티티를 찾지 못함' : /Could not resolve attribute 'user_name' of 'Member'/.test(f.err) ? 'Member에 user_name이라는 필드가 없음' : '알 수 없음 ' + f.err;
    const where = f.errAt === CREATE ? 'createQuery 줄에서' : '다른 줄에서 ' + f.errAt;
    const cls = f.err.startsWith('java.lang.IllegalArgumentException') ? 'IllegalArgumentException' : f.err;
    real = [sqls.length === 0 ? '나가지 않음' : sqls[0].sql, o(GET) ? '돌아옴' : '없음 (list를 만들지 못함)', where + ' ' + cls + ' (' + reason + ')'];
  } else {
    const vals = get(GET, 'values'), names = vals.split(',').map(x => x.split(':')[1]);
    real = [sqls.length ? sqls[0].sql : '(SQL 없음)', 'Member 객체 ' + get(GET, 'size') + '개 (' + names.join(', ') + ')', f.err === '' ? '없음' : f.err];
  }
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + q + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  // 화면의 코드 = Probe가 컴파일해 실행한 소스(엔티티 + 조회하는 쪽)
  const want = lesson.code.call(lesson, c).replace(/^(\/\/ 조회하는 쪽): 메서드 안의 줄만 보임 [^\n]*$/m, '$1').split('\n').join('\\n');   // 화면 주석 끝의 "줄만 보임 (…생략)"은 Probe 소스에 없으므로 빼고 비교
  if (f.code !== want) { good = false; console.log('화면의 코드가 Probe가 실행한 소스와 다름: ' + q + '\n   화면 ' + want + '\n   실행 ' + f.code); }
  const JP = lesson.code.call(lesson, c).split('\n').find(l => l.startsWith('String jpql')), want1 = JP;
  const checks = {
    '측정 줄을 끼운 실행과 화면의 코드 그대로의 실행이 같은 결과(오류, SQL 수)': f.err === m.err && f.sqlCount === m.sqlCount,
    'jpql 변수 줄을 지난 직후 나간 SQL은 0번': get(want1, 'sql') === '0',
    '오류가 나는 조합은 createQuery 줄에서 나고, 나는 조합이 아니면 오류가 없다': bad ? f.errAt === CREATE : (f.err === '' && f.errAt === '-'),
    '오류가 나는 조합은 SQL이 한 번도 나가지 않고 getResultList 줄의 측정은 없다(실행되지 않았다)': bad ? (f.sqlCount === '0' && !o(CREATE) && !o(GET)) : true,
    '예외는 IllegalArgumentException이고 원인은 모형이 적은 종류와 메시지': bad ? (f.err.startsWith('java.lang.IllegalArgumentException') && f.err.includes('org.hibernate.query.sqm.' + lesson.facts[q].ex) && f.err.includes(lesson.facts[q].msg)) : true,
    'createQuery 줄을 지난 직후에도 나간 SQL은 0번': bad ? true : get(CREATE, 'sql') === '0',
    'SQL은 정확히 1번, getResultList 줄에서 나갔다': bad ? true : (f.sqlCount === '1' && sqls[0].at === GET && get(GET, 'sql') === '1'),
    '나간 SQL은 모형이 적은 글과 같다': bad ? true : sqls[0].sql === lesson.facts[q].sql,
    '돌아온 객체의 클래스는 모두 Member이고 영속성 컨텍스트에 들어 있다': bad ? true : get(GET, 'classes').split(',').every(x => x === 'Member') && get(GET, 'contains').split(',').every(x => x === 'true'),
    '돌아온 객체의 값(id:name:age)': bad ? true : get(GET, 'values') === (q === 'ok' ? '1:kim:25,3:park:30' : '1:kim:25'),
  };
  for (const [name, pass] of Object.entries(checks)) { factAll++; if (pass) factOk++; else { good = false; console.log('사실 불일치: ' + q + ' / ' + name); } }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);
let longest = 0;
for (const q of ['ok', 'table', 'col', 'field']) lesson.code.call(lesson, { q }).split('\n').forEach(l => { const w = [...l].reduce((a, ch) => a + (ch.charCodeAt(0) > 127 ? 2 : 1), 0); if (w > longest) longest = w; });
console.log('화면 문장이 기대는 사실 ' + factOk + ' / ' + factAll + ' (가장 긴 코드 줄 ' + longest + '칸)');
