// "테이블, 키, 제약 조건" 실습의 마흔여덟 가지 조합을 실제 MySQL 8.4(컨테이너 lab-mysql, 데이터베이스 lab_constraints)에서 실행한다.
// 실습 파일의 plan(c)가 돌려주는 SQL(화면에 나오는 것과 같은 문장)을 그대로 실행하고, MySQL이 돌려준 것만 기록한다.
// 사용: node verify/mysql/constraints_probe.js   → verify/mysql/constraints_probe.out.txt
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const DB = 'lab_constraints';

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
const dump = rows => rows.map(r => r.join(',')).sort().join(';');

mysql('', ['CREATE DATABASE IF NOT EXISTS ' + DB]);
const lesson = load('constraints'), out = [];
const ver = mysql(DB, ['SELECT VERSION(), @@sql_mode']);
out.push('# mysql ' + ver[0].rows[0][0] + ' | sql_mode ' + ver[0].rows[0][1]);
out.push('# 형식: op|con|act => 오류 번호|ROW_COUNT|member 행 수|orders 행 수|확인 조회|오류 메시지|member의 모든 행|orders의 모든 행');
const seen = new Set();
for (const c of combos(lesson)) {
  const key = [c.op, c.con, c.act].join('|'); if (seen.has(key)) continue; seen.add(key);
  const p = lesson.plan(c);
  const stmts = ['DROP TABLE IF EXISTS orders', 'DROP TABLE IF EXISTS member'].concat(p.ddl, p.seed, [p.stmt, p.check, 'SELECT id, email, name, age FROM member', 'SELECT id, member_id, item FROM orders']);
  const r = mysql(DB, stmts), n = stmts.length, st = r[n - 4], ck = r[n - 3], m = r[n - 2], o = r[n - 1];
  r.slice(0, n - 4).concat([ck, m, o]).forEach((x, i) => { if (x.errno) throw new Error(key + ': 준비 문장 실패 ' + x.errno + ' ' + x.msg); });
  out.push(key + ' => ' + [st.errno, st.rc, m.rows.length, o.rows.length, ck.rows[0][0], st.msg, dump(m.rows), dump(o.rows)].join('|'));
}

// 화면의 설명(assume)에 적은 사실 세 가지를 따로 실행해 기록한다. 모형의 조합과는 별개다.
const base = lesson.plan({ op: 'fkdel', con: 'on', act: 'restrict' });
// 1) 컬럼 정의 뒤에 REFERENCES만 적으면 MySQL은 외래 키를 만들지 않는다
let r = mysql(DB, ['DROP TABLE IF EXISTS orders', 'DROP TABLE IF EXISTS member', base.ddl[0], 'CREATE TABLE orders (id INT PRIMARY KEY, member_id INT REFERENCES member (id), item VARCHAR(30) NOT NULL)', base.seed[0],
  "SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema = '" + DB + "' AND table_name = 'orders'", "INSERT INTO orders (id, member_id, item) VALUES (104, 99, '의자')"]);
out.push('# 컬럼 뒤 REFERENCES만 적은 경우: CREATE TABLE 오류 ' + r[3].errno + ', 만들어진 외래 키 ' + r[5].rows[0][0] + '개, 없는 회원 99의 주문 INSERT 오류 ' + r[6].errno + ' ROW_COUNT ' + r[6].rc);
// 2) ON DELETE를 적지 않은 외래 키는 RESTRICT와 같이 부모 삭제를 거부한다
r = mysql(DB, ['DROP TABLE IF EXISTS orders', 'DROP TABLE IF EXISTS member', base.ddl[0], 'CREATE TABLE orders (id INT PRIMARY KEY, member_id INT, item VARCHAR(30) NOT NULL, FOREIGN KEY (member_id) REFERENCES member (id))', base.seed[0], base.seed[1], 'DELETE FROM member WHERE id = 1']);
out.push('# ON DELETE를 적지 않은 외래 키: 자식이 있는 부모 DELETE 오류 ' + r[6].errno + ' ROW_COUNT ' + r[6].rc);
// 3) 엄격 모드를 끈 세션에서는 NOT NULL 컬럼을 NULL로 바꾸는 UPDATE가 오류로 거부되지 않고 빈 문자열이 저장된다
r = mysql(DB, ['DROP TABLE IF EXISTS orders', 'DROP TABLE IF EXISTS member', base.ddl[0], base.seed[0], "SET SESSION sql_mode = ''", 'UPDATE member SET name = NULL WHERE id = 2', "SELECT CONCAT('[', name, ']') FROM member WHERE id = 2"]);
out.push('# 엄격 모드를 끈 세션에서 name = NULL로 UPDATE: 오류 ' + r[5].errno + ' ROW_COUNT ' + r[5].rc + ', 저장된 name(대괄호 안) ' + r[6].rows[0][0]);
// 4) CHECK (age >= 0)은 age가 NULL인 행을 통과시킨다 (조건의 결과가 거짓일 때만 거부)
r = mysql(DB, ['DROP TABLE IF EXISTS orders', 'DROP TABLE IF EXISTS member', base.ddl[0], base.seed[0], "INSERT INTO member (id, email, name, age) VALUES (4, 'choi@lab.example', '최지우', NULL)"]);
out.push('# CHECK (age >= 0)이 걸린 테이블에 age가 NULL인 회원 INSERT: 오류 ' + r[4].errno + ' ROW_COUNT ' + r[4].rc);
mysql(DB, ['DROP TABLE IF EXISTS orders', 'DROP TABLE IF EXISTS member']);
fs.writeFileSync(path.join(__dirname, 'constraints_probe.out.txt'), out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
