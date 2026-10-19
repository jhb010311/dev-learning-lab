// 기초개념 "영속성 컨텍스트" 실습의 모형 결과를 실제 Hibernate 7.4.5 + H2 실행 결과(pc_basic_probe.out.txt)와 대조한다
// 결과 표의 네 항목, 화면의 코드(Probe가 실행한 코드와 같은 글인가), 단계 문장이 기대는 사실(contains, SQL이 나간 줄, 같은 id를 다시 find할 때의 객체, 기억하는 처음 값)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('pc_basic');
const lines = fs.readFileSync(path.join(__dirname, 'pc_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
function fields(v) { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); if (i > 0) f[p.slice(0, i)] = p.slice(i + 1); }); return f; }
function obsMap(s) { const m = {}; (s || '').split(' ## ').filter(Boolean).forEach(e => { const [stmt, rest] = e.split(' :: '); m[stmt] = rest; }); return m; }
function sqlList(s) { return (s || '').split(' ## ').filter(Boolean).map(e => { const [head, sql] = e.split(' :: '); const [kind, at] = head.split(' @ '); return { kind, at, sql }; }); }
const rec = {};
lines.slice(1).forEach(ln => { const [k, v] = ln.split(' => '); rec[k] = fields(v); });
let ok = 0, n = 0, factOk = 0, factAll = 0;
const COMMIT = 'em.getTransaction().commit();';
for (const how of ['find', 'new', 'detach'])
  for (const again of [false, true]) {
    const k = how + '|' + again, c = { how, again }, f = rec[k], m = rec['measure|' + k];
    n++;
    let good = true;
    if (!f || !m) { console.log('Probe 출력에 없음: ' + k); continue; }
    const sim = lesson.simulate(c);
    const real = [f.dbName, f.update + '번', f.select + '번', f.stdout === '' ? '(다시 찾지 않음)' : f.stdout];
    if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
    // 화면의 코드 = Probe가 실행한 코드
    const want = lesson.code.call(lesson, c).replace(/^\/\/ [^\n]*생략\)\n/, '').split('\n').join('\\n');   // 맨 위의 "…생략)" 머리 줄은 Probe 코드에 없으니 빼고 견준다
    if (f.code !== want) { good = false; console.log('화면의 코드가 Probe가 실행한 코드와 다름: ' + k + '\n   화면 ' + want + '\n   실행 ' + f.code); }
    // 단계 문장이 기대는 사실
    const sq = sqlList(f.sqls), ob = obsMap(m.obs);
    const upd = sq.filter(x => x.kind === 'update'), sel = sq.filter(x => x.kind === 'select');
    const o = (stmt) => ob[stmt] || '';
    const get = (stmt, key) => { const mm = new RegExp(key.replace(/[()]/g, '\\$&') + '=(\\S+)').exec(o(stmt)); return mm ? mm[1] : '?'; };
    const FIND = 'Member m = em.find(Member.class, 1L);', NEW = 'Member m = new Member(1L, "김철수");', SET = 'm.setName("이영희");', DET = 'em.detach(m);', M2 = 'Member m2 = em.find(Member.class, 1L);', PRINT = 'System.out.println(m == m2);';
    const first = how === 'new' ? NEW : FIND;
    const managedAfterFirst = how !== 'new';
    const checks = {
      '오류 없이 끝난다': f.err === '' && m.err === '',
      '측정 줄을 끼운 실행과 화면의 코드 그대로의 실행이 같은 결과(DB, SQL 수)': ['dbName', 'select', 'update', 'insert', 'stdout'].every(x => f[x] === m[x]),
      '다른 SQL(INSERT 등)은 나가지 않는다': f.insert === '0' && f.other === '0',
      '첫 줄 직후 em.contains(m)은 find면 true, new면 false': get(first, 'contains(m)') === String(managedAfterFirst),
      'find로 가져온 직후 JPA가 기억하는 처음 값은 김철수, new면 기억 없음': get(first, 'loaded(m)') === (managedAfterFirst ? '[김철수]' : '(기억'),
      'setName 직후에도 UPDATE는 나가지 않았다(update=0)': get(SET, 'update') === '0',
      'setName 직후 m의 name은 이영희이고, 기억하는 처음 값은 find면 그대로 김철수': get(SET, 'name(m)') === '이영희' && (how !== 'find' || get(SET, 'loaded(m)') === '[김철수]'),
      'UPDATE는 find 조합에서만 한 번 나가고, 나간 줄은 commit이다': how === 'find' ? (upd.length === 1 && upd[0].at === COMMIT && /^update member set name=\? where id=\?$/i.test(upd[0].sql)) : upd.length === 0,
      '커밋 줄 직후 update 수는 find면 1, 아니면 0': get(COMMIT, 'update') === (how === 'find' ? '1' : '0'),
      'SELECT가 나간 줄: find와 detach는 첫 find 줄, again이면 new는 m2 줄 / detach는 m2 줄이 추가': (() => {
        const want = []; if (how !== 'new') want.push(FIND); if (again && how !== 'find') want.push(M2);
        return JSON.stringify(sel.map(x => x.at)) === JSON.stringify(want);
      })(),
    };
    if (how === 'detach') {
      checks['detach 직후 em.contains(m)은 false, 기억하는 처음 값도 없다'] = get(DET, 'contains(m)') === 'false' && get(DET, 'loaded(m)') === '(기억';
      checks['detach 직후 name은 아직 김철수이고 SQL은 나가지 않았다'] = get(DET, 'name(m)') === '김철수' && get(DET, 'update') === '0' && get(DET, 'select') === '1';
    }
    if (how === 'detach') checks['detach 뒤 setName 직후에도 em.contains(m)은 false'] = get(SET, 'contains(m)') === 'false';
    if (how === 'new') checks['new로 만든 객체는 setName, commit 뒤에도 em.contains(m)이 false'] = get(SET, 'contains(m)') === 'false' && get(COMMIT, 'contains(m)') === 'false';
    if (how === 'find') checks['find로 가져온 객체는 commit 뒤에도 em.contains(m)이 true'] = get(COMMIT, 'contains(m)') === 'true';
    if (again) {
      checks['again: m2는 영속성 컨텍스트에 들어 있다(em.contains(m2)=true)'] = get(M2, 'contains(m2)') === 'true';
      checks['again: m2 직후 SELECT 수는 find 1, new 1, detach 2'] = get(M2, 'select') === ({ find: '1', 'new': '1', detach: '2' })[how];
      checks['again: m2의 name은 find면 커밋 전인데도 이영희(같은 객체), 아니면 DB의 김철수'] = get(M2, 'name(m2)') === (how === 'find' ? '이영희' : '김철수');
      checks['again: m == m2는 find면 true, 아니면 false'] = f.stdout === (how === 'find' ? 'true' : 'false');
      checks['again: m2 줄에서도 update는 0'] = get(M2, 'update') === '0';
      checks['again: m2를 찾은 뒤 m의 name은 이영희 그대로'] = get(M2, 'name(m)') === '이영희';
    }
    for (const [name, pass] of Object.entries(checks)) { factAll++; if (pass) factOk++; else { good = false; console.log('사실 불일치: ' + k + ' / ' + name); } }
    if (good) ok++;
  }
console.log('일치 ' + ok + ' / ' + n);
// 문장의 근거가 되는 따로 실행한 것
const ex = [];
function chk(name, pass) { ex.push([name, pass]); }
const rv = rec['extra|revert'], rvm = rec['measure|extra|revert'], ps = rec['extra|persist'], psm = rec['measure|extra|persist'];
chk('이름을 바꿨다가 처음 값으로 되돌리면 UPDATE가 나가지 않는다(바꾸는 호출이 아니라 처음 값과의 비교)', rv && rv.update === '0' && rv.dbName === '김철수' && rv.select === '1' && rv.err === '');
chk('되돌리기 실험의 setName 두 번 사이에도 JPA가 기억하는 처음 값은 김철수', /m\.setName\("김철수"\); :: .*loaded\(m\)=\[김철수\]/.test(rvm.obs));
chk('persist로 넘긴 객체는 em.contains가 true가 되고, INSERT는 persist 줄이 아니라 commit 줄에서 나간다', ps && ps.insert === '1' && ps.update === '0' && ps.select === '0' && sqlList(ps.sqls)[0].at === COMMIT && /em\.persist\(m\); :: contains\(m\)=true/.test(psm.obs) && /Member m = new Member\(2L, "박민수"\); :: contains\(m\)=false/.test(psm.obs) && ps.name2 === '박민수' && ps.rows === '2');
ex.forEach(([name, pass]) => { factAll++; if (pass) factOk++; else console.log('사실 불일치: ' + name); });
// 화면의 코드 줄 길이(75칸, 한글 2칸)
let longest = 0;
for (const how of ['find', 'new', 'detach']) for (const again of [false, true]) lesson.code.call(lesson, { how, again }).split('\n').forEach(l => { const w = [...l].reduce((a, ch) => a + (ch.charCodeAt(0) > 127 ? 2 : 1), 0); if (w > longest) longest = w; });
console.log('화면 문장이 기대는 사실 ' + factOk + ' / ' + factAll + ' (가장 긴 코드 줄 ' + longest + '칸)');
