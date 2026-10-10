// "서브쿼리" 실습의 서른여섯 가지 조합을 실제 MySQL 8.4(컨테이너 lab-mysql, 데이터베이스 lab_subquery)에서 실행한다.
// 실습 파일의 plan(c)가 돌려주는 SQL(화면에 나오는 것과 같은 문장)을 그대로 실행하고, MySQL이 돌려준 것만 기록한다.
// 조합마다: 문장의 결과, 괄호 안의 서브쿼리만 따로 실행한 결과, EXPLAIN의 select_type, EXPLAIN ANALYZE에서 본 서브쿼리의 실행 횟수.
// 사용: node verify/mysql/subquery_probe.js   → verify/mysql/subquery_probe.out.txt
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const DB = 'lab_subquery';

// 문장들을 한 번의 mysql 실행으로 차례로 보내고, 문장마다 { errno, msg, rc(ROW_COUNT), rows }를 돌려준다.
// 문장 하나를 한 줄로 만들어 보내므로, 오류 메시지의 "at line N"으로 어느 문장이 실패했는지 알 수 있다.
function mysql(db, stmts) {
  const lines = ['SET NAMES utf8mb4;'];
  stmts.forEach((s, i) => lines.push("SELECT '@@S', " + i + ';', s.replace(/\s*\n\s*/g, ' ').replace(/;\s*$/, '') + ';', "SELECT '@@R', ROW_COUNT();"));
  const args = ['exec', '-i', '-e', 'MYSQL_PWD=labtest', 'lab-mysql', 'mysql', '-uroot', '--default-character-set=utf8mb4', '--force', '--batch', '-N'];
  if (db) args.push(db);
  const r = cp.spawnSync('docker', args, { input: lines.join('\n') + '\n', encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error) throw r.error;
  const res = stmts.map(() => ({ errno: 0, msg: '', rc: null, rows: [] })); let cur = null;
  const out = r.stdout.split(/\r?\n/); if (out[out.length - 1] === '') out.pop();
  out.forEach(ln => {
    if (ln.startsWith('@@S\t')) cur = res[+ln.slice(4)];
    else if (ln.startsWith('@@R\t')) { cur.rc = +ln.slice(4); cur = null; }
    else if (cur) cur.rows.push(ln.split('\t'));
    else throw new Error('알 수 없는 출력: ' + ln);
  });
  r.stderr.split(/\r?\n/).filter(Boolean).forEach(ln => {
    const m = /^ERROR (\d+) \((\w+)\) at line (\d+): (.*)$/.exec(ln);
    if (!m) throw new Error('알 수 없는 오류 출력: ' + ln);
    const i = (+m[3] - 3) / 3; if (!Number.isInteger(i) || !res[i]) throw new Error('문장 밖의 오류: ' + ln);
    res[i].errno = +m[1]; res[i].msg = m[4];
  });
  return res;
}const DROP = ['DROP TABLE IF EXISTS orders', 'DROP TABLE IF EXISTS member'];
const flat = s => s.replace(/\s*\n\s*/g, ' ');
const types = x => x.errno ? '-' : x.rows.map(r => r[1]).join(',');
// EXPLAIN ANALYZE의 트리에서 서브쿼리(Select #2) 줄을 읽는다. dependent(상관) 서브쿼리면 바로 아래 줄의 loops(실행 횟수)도 함께 적는다
function analyze(x) {
  if (x.errno) return '-';
  // mysql의 배치 출력은 줄바꿈을 역슬래시와 n 두 글자로 바꿔 내보낸다
  const ls = x.rows[0][0].split(/\\n/), i = ls.findIndex(l => l.includes('Select #2'));
  if (i < 0) return 'Select #2 줄 없음';
  const m = /loops=(\d+)/.exec(ls[i + 1] || '');
  return ls[i].trim().replace(/^-> /, '') + (m && ls[i].includes('dependent') ? ' / 바로 아래 줄의 loops=' + m[1] : '');
}

mysql('', ['CREATE DATABASE IF NOT EXISTS ' + DB]);
const lesson = load('subquery'), out = [];
const ver = mysql(DB, ['SELECT VERSION()', "SELECT @@optimizer_switch LIKE '%semijoin=on%', @@optimizer_switch LIKE '%materialization=on%', @@optimizer_switch LIKE '%subquery_to_derived=off%'"]);
out.push('# mysql ' + ver[0].rows[0][0] + ' | optimizer_switch: semijoin=on ' + ver[1].rows[0][0] + ', materialization=on ' + ver[1].rows[0][1] + ', subquery_to_derived=off ' + ver[1].rows[0][2] + ' (1이면 그렇다)');
out.push('# 형식: kind|nul|pick => 오류 번호|오류 메시지|결과의 모든 행(JSON)|서브쿼리만 실행한 오류 번호|그 오류 메시지|그 결과의 행(JSON)|EXPLAIN의 select_type(줄 순서대로)|EXPLAIN ANALYZE의 서브쿼리 부분');
for (const c of combos(lesson)) {
  const key = [c.kind, c.nul, c.pick].join('|'), p = lesson.plan(c);
  if (!flat(p.query).includes('(' + p.inner + ')')) throw new Error(key + ': 따로 실행할 서브쿼리가 문장 안의 서브쿼리와 다르다');
  const stmts = DROP.concat(p.ddl, p.seed, ['ANALYZE TABLE member, orders', p.query, p.inner, 'EXPLAIN ' + p.query, 'EXPLAIN ANALYZE ' + p.query]);
  const r = mysql(DB, stmts), n = r.length, q = r[n - 4], inner = r[n - 3], ex = r[n - 2], an = r[n - 1];
  r.slice(0, n - 4).forEach(x => { if (x.errno) throw new Error(key + ': 준비 문장 실패 ' + x.errno + ' ' + x.msg); });
  out.push(key + ' => ' + [q.errno, q.msg, JSON.stringify(q.rows), inner.errno, inner.msg, JSON.stringify(inner.rows), types(ex), analyze(an)].join('|'));
}

// 화면의 요약과 설명(assume)에 적은 사실을 따로 실행해 기록한다. 모형의 조합과는 별개다.
const base = lesson.plan({ kind: 'notin', nul: true, pick: 'one' });
let r = mysql(DB, DROP.concat(base.ddl, base.seed, [
  "SELECT name FROM member WHERE id IN (SELECT member_id FROM orders WHERE item = '키보드') ORDER BY id",
  'SELECT m.name, COUNT(o.id) AS cnt FROM member m LEFT JOIN orders o ON o.member_id = m.id GROUP BY m.id, m.name ORDER BY m.id',
  'SELECT name FROM member WHERE id NOT IN (SELECT member_id FROM orders WHERE member_id IS NOT NULL) ORDER BY id']));
out.push("# = 대신 IN (키보드를 주문한 회원): " + JSON.stringify(r[r.length - 3].rows));
out.push('# LEFT JOIN과 GROUP BY로 회원마다 주문 수: ' + JSON.stringify(r[r.length - 2].rows));
out.push('# NULL 주문이 있을 때 서브쿼리에 IS NOT NULL을 넣은 NOT IN: ' + JSON.stringify(r[r.length - 1].rows));
// member_id를 NOT NULL로 선언하면 같은 NOT IN 문장이 조인(안티조인)으로 바뀐다
const plain = lesson.plan({ kind: 'notin', nul: false, pick: 'one' });
r = mysql(DB, DROP.concat([plain.ddl[0], plain.ddl[1].replace('member_id INT,', 'member_id INT NOT NULL,')], plain.seed, ['ANALYZE TABLE member, orders', 'EXPLAIN ' + plain.query, plain.query]));
out.push('# member_id가 NOT NULL인 테이블에서 같은 NOT IN 문장: select_type ' + types(r[r.length - 2]) + ', 결과 ' + JSON.stringify(r[r.length - 1].rows));
// 회원 1,000명, 주문 1,000건으로 늘렸을 때의 select_type (주문의 member_id는 1~900, 하나는 NULL)
const big = DROP.concat(plain.ddl, ['INSERT INTO member (id, name) WITH RECURSIVE n (i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000) SELECT i, CONCAT(\'회원\', i) FROM n',
  'INSERT INTO orders (id, member_id, item) WITH RECURSIVE n (i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000) SELECT i, IF(i = 500, NULL, 1 + (i * 7) % 900), CONCAT(\'상품\', i % 50) FROM n', 'ANALYZE TABLE member, orders']);
const kinds = ['corr', 'in', 'exists', 'notin', 'notexists'];
r = mysql(DB, big.concat(kinds.map(k => 'EXPLAIN ' + lesson.plan({ kind: k, nul: true, pick: 'one' }).query)));
out.push('# 1,000행씩일 때의 select_type: ' + kinds.map((k, i) => k + ' ' + types(r[big.length + i])).join(' / '));
mysql(DB, DROP);
fs.writeFileSync(path.join(__dirname, 'subquery_probe.out.txt'), out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
