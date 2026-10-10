// "ER 모델링" 실습의 열네 가지 조합을 실제 MySQL 8.4(컨테이너 lab-mysql, 데이터베이스 lab_ermodel)에서 실행한다.
// 실습 파일의 plan(c)가 돌려주는 SQL(화면에 나오는 것과 같은 문장)을 그대로 실행하고, MySQL이 돌려준 것만 기록한다.
// 사용: node verify/mysql/ermodel_probe.js   → verify/mysql/ermodel_probe.out.txt
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const DB = 'lab_ermodel';

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
}
const DROP = ['post_tag', 'profile', 'tag'].map(t => 'DROP TABLE IF EXISTS ' + t).concat(['SET FOREIGN_KEY_CHECKS = 0', 'DROP TABLE IF EXISTS member', 'DROP TABLE IF EXISTS post', 'SET FOREIGN_KEY_CHECKS = 1']);
const must = (key, list) => list.forEach(x => { if (x.errno) throw new Error(key + ': 준비 문장 실패 ' + x.errno + ' ' + x.msg); });

mysql('', ['CREATE DATABASE IF NOT EXISTS ' + DB]);
const lesson = load('ermodel'), out = [];
out.push('# mysql ' + mysql(DB, ['SELECT VERSION()'])[0].rows[0][0]);
out.push('# 형식: design|task => 마지막 쓰기 문장의 오류 번호|ROW_COUNT|오류 메시지|조회 결과의 모든 행(JSON)|끝난 뒤 각 테이블의 모든 행(JSON). 찾기에는 쓰기 문장이 없어 앞의 두 칸이 -');
for (const c of combos(lesson)) {
  const key = c.design + '|' + c.task, p = lesson.plan(c);
  const dumps = p.tables.map(t => 'SELECT ' + t.head.join(', ') + ' FROM ' + t.name);
  const stmts = DROP.concat(p.ddl, p.seed, p.write, [p.query], dumps);
  const r = mysql(DB, stmts), a = DROP.length + p.ddl.length + p.seed.length, w = r.slice(a, a + p.write.length), q = r[a + p.write.length], d = r.slice(a + p.write.length + 1);
  must(key, r.slice(0, a).concat(w.slice(0, -1), [q], d));
  const lastW = w[w.length - 1], dump = {}; p.tables.forEach((t, i) => { dump[t.name] = d[i].rows; });
  out.push(key + ' => ' + [lastW ? lastW.errno : '-', lastW ? lastW.rc : '-', lastW ? lastW.msg : '', JSON.stringify(q.rows), JSON.stringify(dump)].join('|'));
}

// 화면의 요약과 설명(assume)에 적은 사실을 따로 실행해 기록한다. 모형의 조합과는 별개다.
const csv = lesson.plan({ design: 'm2m_csv', task: 'find' }), link = lesson.plan({ design: 'm2m_link', task: 'find' });
// 1) 쉼표 문자열에서 FIND_IN_SET으로 찾으면 글 1과 2만 나온다
let r = mysql(DB, DROP.concat(csv.ddl, csv.seed, ["SELECT id, title FROM post WHERE FIND_IN_SET('java', tags) ORDER BY id"]));
must('extra1', r); out.push("# 쉼표 문자열에서 FIND_IN_SET('java', tags): " + JSON.stringify(r[r.length - 1].rows));
// 2) 쉼표 문자열에는 이미 있는 태그를 또 붙여도 그대로 들어간다
r = mysql(DB, DROP.concat(csv.ddl, csv.seed, ["UPDATE post SET tags = CONCAT(tags, ',java') WHERE id = 1", 'SELECT tags FROM post WHERE id = 1']));
out.push('# 쉼표 문자열에 이미 있는 java를 또 붙이기: 오류 ' + r[r.length - 2].errno + ' ROW_COUNT ' + r[r.length - 2].rc + ', 저장된 tags ' + r[r.length - 1].rows[0][0]);
// 3) tags에 인덱스를 만들고 2,000행을 넣은 뒤의 실행 계획: FIND_IN_SET은 인덱스로 찾지 못한다(같은 컬럼을 = 로 비교하면 인덱스를 쓴다)
r = mysql(DB, DROP.concat(csv.ddl, ['CREATE INDEX idx_tags ON post (tags)', 'SET SESSION cte_max_recursion_depth = 5000',
  "INSERT INTO post (id, title, tags) WITH RECURSIVE n (i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2000) SELECT i, CONCAT('글 ', i), ELT(1 + i % 5, 'java', 'spring,jpa', 'javascript', 'java,docker', 'jpa') FROM n",
  'ANALYZE TABLE post', "EXPLAIN SELECT id, title FROM post WHERE FIND_IN_SET('java', tags)", "EXPLAIN SELECT id, title FROM post WHERE tags = 'java'"]));
const ex = x => 'type ' + x.rows[0][4] + ', key ' + x.rows[0][6];
out.push('# 인덱스가 있는 tags 컬럼, 2000행의 EXPLAIN: FIND_IN_SET 조건은 ' + ex(r[r.length - 2]) + " / tags = 'java' 조건은 " + ex(r[r.length - 1]));
// 4) 연결 테이블에서는 같은 연결을 또 넣거나 없는 태그를 연결하면 거부된다
r = mysql(DB, DROP.concat(link.ddl, link.seed, ['INSERT INTO post_tag (post_id, tag_id) VALUES (1, 1)', 'INSERT INTO post_tag (post_id, tag_id) VALUES (1, 99)']));
out.push('# 연결 테이블에 이미 있는 연결 (1, 1)을 또 INSERT: 오류 ' + r[r.length - 2].errno + ' / 없는 태그 99를 연결: 오류 ' + r[r.length - 1].errno);
mysql(DB, DROP);
fs.writeFileSync(path.join(__dirname, 'ermodel_probe.out.txt'), out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
