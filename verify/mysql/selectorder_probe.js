// "SELECT가 처리되는 순서" 실습의 서른두 가지 조합을 실제 MySQL 8.4(컨테이너 lab-mysql, 데이터베이스 lab_selectorder)에서 실행한다.
// 실습 파일의 plan(c)가 돌려주는 SQL(화면에 나오는 것과 같은 문장)을 그대로 실행하고, MySQL이 돌려준 것만 기록한다.
// 사용: node verify/mysql/selectorder_probe.js   → verify/mysql/selectorder_probe.out.txt
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const DB = 'lab_selectorder';

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
mysql('', ['CREATE DATABASE IF NOT EXISTS ' + DB]);
const lesson = load('selectorder'), out = [];
const ver = mysql(DB, ['SELECT VERSION(), @@sql_mode']);
out.push('# mysql ' + ver[0].rows[0][0] + ' | sql_mode ' + ver[0].rows[0][1]);
out.push('# 형식: cond|at|galias|tail => 오류 번호|오류 메시지|결과의 모든 행(JSON, MySQL이 돌려준 순서)|WHERE 조건만으로 센 행 수(그 조회가 오류면 -)');
for (const c of combos(lesson)) {
  const key = [c.cond, c.at, c.galias, c.tail].join('|'), p = lesson.plan(c);
  const stmts = ['DROP TABLE IF EXISTS orders'].concat(p.ddl, p.seed, [p.query, p.count]);
  const r = mysql(DB, stmts), q = r[r.length - 2], n = r[r.length - 1];
  r.slice(0, -2).forEach(x => { if (x.errno) throw new Error(key + ': 준비 문장 실패 ' + x.errno + ' ' + x.msg); });
  out.push(key + ' => ' + [q.errno, q.msg, JSON.stringify(q.rows), n.errno ? '-' : n.rows[0][0]].join('|'));
}
mysql(DB, ['DROP TABLE IF EXISTS orders']);
fs.writeFileSync(path.join(__dirname, 'selectorder_probe.out.txt'), out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
