// 기초개념 "지연 로딩" 실습의 모형 결과를 실제 Hibernate 7.4.5 + H2 실행 결과(lazy_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목(줄마다 나간 SQL에서 직접 만든다), 화면의 코드(Probe가 컴파일한 소스와 같은 글인가), 단계 문장이 기대는 사실(프록시 여부, 초기화 여부, 줄마다 SQL 수)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('lazy_basic');
const lines = fs.readFileSync(path.join(__dirname, 'lazy_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
function fields(v) { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); if (i > 0) f[p.slice(0, i)] = p.slice(i + 1); }); return f; }
function sqlList(s) { return (s || '').split(' ## ').filter(Boolean).map(e => { const [head, sql] = e.split(' :: '); const [kind, at] = head.split(' @ '); return { kind, at, sql }; }); }
function obsMap(s) { const m = {}; (s || '').split(' ## ').filter(Boolean).forEach(e => { const i = e.indexOf(' :: '); m[e.slice(0, i)] = e.slice(i + 4); }); return m; }
const rec = {};
lines.slice(1).forEach(ln => { const i = ln.indexOf(' => '); rec[ln.slice(0, i)] = fields(ln.slice(i + 4)); });
const FIND = 'Order order = em.find(Order.class, 10L);', NAME = 'String name = order.getMember().getName();';
// 한 줄에서 나간 SQL들을 글로: 없으면 '없음', 있으면 SELECT 몇 번 (읽은 테이블)
function describe(sqls) {
  if (!sqls.length) return '없음';
  if (sqls.some(x => x.kind !== 'select')) return '? SELECT가 아닌 SQL';
  const tabs = sqls.map(x => [...x.sql.matchAll(/\b(?:from|join)\s+(\w+)/gi)].map(m => m[1].toLowerCase()));
  const flat = [...new Set(tabs.flat())];
  const joined = sqls.some(x => /\bjoin\b/i.test(x.sql));
  const where = flat.length === 1 ? flat[0] + (flat[0] === 'orders' ? ' 테이블만' : ' 테이블만') : flat.length === 2 && joined ? flat[0] + '와 ' + flat[1] + '를 조인' : '? ' + flat.join(',');
  return 'SELECT ' + sqls.length + '번 (' + (flat.length === 1 ? flat[0] : where) + ')';
}
let ok = 0, n = 0, factOk = 0, factAll = 0, longest = 0;
for (const fetch of ['lazy', 'eager'])
  for (const use of [true, false]) {
    const k = fetch + '|' + use, c = { fetch, use }, f = rec[k], m = rec['measure|' + k];
    n++;
    let good = true;
    if (!f || !m) { console.log('Probe 출력에 없음: ' + k); continue; }
    const sim = lesson.simulate(c);
    const sq = sqlList(f.sqls);
    const atFind = sq.filter(x => x.at === FIND), atName = sq.filter(x => x.at === NAME);
    const other = sq.filter(x => x.at !== FIND && x.at !== NAME);
    const memberAt = x => /\b(from|join)\s+member\b/i.test(x.sql);
    const when = sq.some(x => x.at === FIND && memberAt(x)) ? 'find 줄에서' : sq.some(x => x.at === NAME && memberAt(x)) ? 'getName 줄에서' : '읽지 않음';
    const real = [describe(atFind).replace('(orders)', '(orders)').replace(/\(orders 테이블만\)/, '(orders)').replace(/\(member 테이블만\)/, '(member)'), use ? describe(atName) : '(그 줄이 없음)', when];
    if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
    // 화면의 코드 = Probe가 컴파일한 소스
    const want = lesson.code.call(lesson, c).split('\n').join('\\n');
    if (f.code !== want) { good = false; console.log('화면의 코드가 Probe가 실행한 코드와 다름: ' + k + '\n   화면 ' + want + '\n   실행 ' + f.code); }
    // 단계 문장이 기대는 사실
    const ob = obsMap(m.obs), o = stmt => ob[stmt] || '';
    const get = (stmt, key) => { const mm = new RegExp('(?:^| )' + key + '=(\\S+)').exec(o(stmt)); return mm ? mm[1] : '?'; };
    const MEM = 'Member mem = order.getMember();', MNAME = 'String name = mem.getName();';
    const lazy = fetch === 'lazy';
    const checks = {
      '오류 없이 끝난다': f.err === '' && m.err === '',
      '측정 줄을 끼운 실행과 화면의 코드 그대로의 실행이 같은 SELECT 수': f.select === m.select && f.other === m.other,
      'SELECT 말고 다른 SQL은 나가지 않는다': f.other === '0' && other.length === 0,
      'find 줄에서 나간 SQL은 orders 테이블을 읽는다(1번)': atFind.length === 1 && /\bfrom\s+orders\b/i.test(atFind[0].sql),
      'find 직후 Order 객체는 영속성 컨텍스트에 있다': get(FIND, 'containsOrder') === 'true',
      'find 직후 member 필드의 객체는 LAZY면 프록시(Member$HibernateProxy)이고 초기화 전, EAGER면 진짜 Member이고 초기화됨': lazy ? (get(FIND, 'fieldProxy') === 'true' && get(FIND, 'fieldInit') === 'false' && /HibernateProxy/.test(get(FIND, 'fieldClass'))) : (get(FIND, 'fieldProxy') === 'false' && get(FIND, 'fieldInit') === 'true' && get(FIND, 'fieldClass') === 'Member'),
      'find 직후 member 필드의 객체는 회원 번호 1을 안다': get(FIND, 'fieldId') === '1',
      'find 직후 member 테이블을 읽은 SELECT는 LAZY면 0번, EAGER면 1번(같은 SELECT 안의 조인)': get(FIND, 'fromMember') === (lazy ? '0' : '1') && get(FIND, 'selects') === '1',
      'EAGER의 SELECT는 left join 하나다': lazy || (atFind.length === 1 && /\bleft join\s+member\b/i.test(atFind[0].sql)),
    };
    if (use) {
      checks['getMember() 직후에도 SQL 수는 그대로이고 객체의 초기화 여부도 그대로'] = get(MEM, 'selects') === '1' && get(MEM, 'varInit') === String(!lazy) && get(MEM, 'varProxy') === String(lazy);
      checks['getMember()가 돌려준 객체는 member 필드의 것과 같은 종류'] = get(MEM, 'varClass') === get(MEM, 'fieldClass');
      checks['getName() 직후 SELECT 수는 LAZY면 2, EAGER면 1이고 객체는 초기화됨'] = get(MNAME, 'selects') === (lazy ? '2' : '1') && get(MNAME, 'varInit') === 'true';
      checks['getName() 직후 member 테이블을 읽은 SELECT 수는 LAZY면 1(이 줄에서 나감), EAGER면 find 줄의 1'] = get(MNAME, 'fromMember') === '1';
      checks['getName 줄에서 나간 SQL은 LAZY면 member 테이블 하나만 읽는 SELECT, EAGER면 없음'] = lazy ? (atName.length === 1 && /\bfrom\s+member\b/i.test(atName[0].sql) && !/\bjoin\b/i.test(atName[0].sql)) : atName.length === 0;
      checks['전체 SELECT 수는 LAZY면 2, EAGER면 1'] = f.select === (lazy ? '2' : '1');
    } else {
      checks['이름을 쓰지 않으면 전체 SELECT는 1번이고 LAZY면 member 테이블은 끝까지 읽히지 않는다'] = f.select === '1' && (lazy ? !sq.some(memberAt) : sq.some(memberAt));
      checks['이름을 쓰지 않은 LAZY의 대리 객체는 끝까지 초기화되지 않는다'] = !lazy || get(FIND, 'fieldInit') === 'false';
    }
    for (const [name, pass] of Object.entries(checks)) { factAll++; if (pass) factOk++; else { good = false; console.log('사실 불일치: ' + k + ' / ' + name); } }
    lesson.code.call(lesson, c).split('\n').forEach(l => { const w = [...l].reduce((a, ch) => a + (ch.charCodeAt(0) > 127 ? 2 : 1), 0); if (w > longest) longest = w; });
    if (good) ok++;
  }
console.log('일치 ' + ok + ' / ' + n);
// fetch를 적지 않은 @ManyToOne(용어 설명의 근거)
const d = rec['extra|default'], dm = rec['measure|extra|default'];
const dsq = sqlList(d.sqls);
const dOk = d.err === '' && d.select === '1' && dsq.length === 1 && /\bleft join\s+member\b/i.test(dsq[0].sql) && /fieldProxy=false fieldInit=true/.test(dm.obs) && /@ManyToOne\\n/.test(d.code) && !/ManyToOne\(fetch/.test(d.code);
factAll++; if (dOk) factOk++; else console.log('사실 불일치: fetch를 적지 않은 @ManyToOne은 EAGER처럼 find 줄에서 조인 SELECT 1번으로 회원까지 읽는다');
console.log('화면 문장이 기대는 사실 ' + factOk + ' / ' + factAll + ' (가장 긴 코드 줄 ' + longest + '칸)');
