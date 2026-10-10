// 실제 SQL 엔진(Node 내장 SQLite)에서 실행해 시뮬레이터의 결과와 대조한다.
const { DatabaseSync } = require('node:sqlite');
const { loadLessons } = require('../simulator/build_lab2.js');
const { list } = loadLessons();
const L = id => list.find(l => l.id === id);
let ok = 0, bad = 0;
function check(name, mine, real) { if (mine === real) ok++; else { bad++; console.log('불일치', name, '\n  모형:', mine, '\n  실제:', real); } }

// 1) JOIN과 GROUP BY: 18가지 조합
{
  const db = new DatabaseSync(':memory:');
  db.exec("create table member(id int primary key, name text); create table orders(id int primary key, member_id int, status text);" +
    "insert into member values (1,'김철수'),(2,'이영희'),(3,'박민수'); insert into orders values (101,1,'PAID'),(102,1,'CANCELED'),(103,2,'PAID'),(104,1,'PAID');");
  const l = L('join');
  for (const join of ['INNER', 'LEFT']) for (const cond of ['none', 'on', 'where']) for (const agg of ['none', 'count', 'having']) {
    const c = { join, cond, agg };
    const sql = l.code(c).replace(/;$/, '') + (agg === 'none' ? ' order by m.id, o.id' : ' order by m.name');
    const real = db.prepare(sql).all().map(r => Object.values(r).map(v => v === null ? 'NULL' : v).join(':')).sort().join(', ');
    const sim = l.simulate(c), last = sim.events[sim.events.length - 1].snap.body;
    const mine = last.map(r => r.cells.map(x => typeof x === 'object' ? x.v : x).join(':')).sort().join(', ');
    check('join ' + join + ' ' + cond + ' ' + agg, mine, real);
  }
  console.log('JOIN·GROUP BY 18조합 대조 끝');
}
// 2) 정규화: 실제로 UPDATE/DELETE를 실행해 이상 현상 확인
{
  const db = new DatabaseSync(':memory:');
  db.exec("create table orders(order_id int primary key not null, member_id int, member_name text, member_addr text, item text, amount int);" +
    "insert into orders values (1,1,'김철수','서울','키보드',30000),(2,1,'김철수','서울','마우스',100000),(3,1,'김철수','서울','모니터',80000),(4,2,'이영희','인천','의자',60000),(5,3,'최민수','광주','책상',40000),(6,3,'최민수','광주','헤드셋',110000);");
  db.exec("update orders set member_addr='부산' where order_id=1");
  const addrs = db.prepare("select distinct member_addr a from orders where member_id=1 order by a").all().map(r => r.a).join(',');
  console.log('갱신 이상: 한 행만 고친 뒤 김철수의 주소 종류 =', addrs); check('갱신 이상', addrs, '부산,서울');
  const n = db.prepare("update orders set member_addr='부산' where member_id=1").run().changes; check('정상 수정 행 수', String(n), '3');
  let err = ''; try { db.exec("insert into orders(order_id, member_id, member_name, member_addr) values (null, 4, '박신규', '대전')"); } catch (e) { err = e.message; }
  console.log('삽입 이상: 주문 번호 없이 회원만 넣기 =', err || '성공'); check('삽입 이상', err ? '거부' : '성공', '거부');
  db.exec("delete from orders where order_id=4");
  const left = db.prepare("select count(*) c from orders where member_name='이영희'").get().c;
  console.log('삭제 이상: 마지막 주문 삭제 후 이영희 정보가 남은 행 수 =', left); check('삭제 이상', String(left), '0');
  const d2 = new DatabaseSync(':memory:');
  d2.exec("pragma foreign_keys=on; create table member(member_id int primary key, name text, addr text); create table orders(order_id int primary key, member_id int references member(member_id), item text, amount int);" +
    "insert into member values (1,'김철수','서울'),(2,'이영희','인천'),(3,'최민수','광주'); insert into orders values (1,1,'키보드',30000),(2,1,'마우스',100000),(3,1,'모니터',80000),(4,2,'의자',60000);");
  check('정규화 후 수정 행 수', String(d2.prepare("update member set addr='부산' where member_id=1").run().changes), '1');
  check('정규화 후 조인 조회', d2.prepare("select distinct m.addr a from orders o join member m on m.member_id=o.member_id where o.member_id=1").all().map(r => r.a).join(','), '부산');
  d2.exec("insert into member values (4,'박신규','대전'); delete from orders where order_id=4");
  check('정규화 후 회원 유지', String(d2.prepare("select count(*) c from member where name in ('이영희','박신규')").get().c), '2');
  console.log('정규화 대조 끝');
}
// 3) 페이징: OFFSET은 새 글이 끼면 중복, 키셋은 안정
{
  const db = new DatabaseSync(':memory:'); db.exec('create table post(id integer primary key, title text)');
  const ins = db.prepare('insert into post(id,title) values (?,?)'); db.exec('begin'); for (let i = 1; i <= 1000; i++) ins.run(i, 't' + i); db.exec('commit');
  const size = 20, page = 10, off = (page - 1) * size;
  const p1 = db.prepare('select id from post order by id desc limit ? offset ?').all(size, off).map(r => r.id);
  const k1 = db.prepare('select id from post where id < ? order by id desc limit ?').all(1000 - off + 1, size).map(r => r.id);
  check('같은 페이지 내용', p1.join(), k1.join());
  ins.run(1001, 'new');
  const p2 = db.prepare('select id from post order by id desc limit ? offset ?').all(size, off + size).map(r => r.id);
  const k2 = db.prepare('select id from post where id < ? order by id desc limit ?').all(p1[p1.length - 1], size).map(r => r.id);
  console.log('OFFSET 다음 페이지 첫 글 =', p2[0], '(앞 페이지 마지막 글 =', p1[p1.length - 1] + ')', '/ 키셋 다음 페이지 첫 글 =', k2[0]);
  check('OFFSET 중복', String(p2[0] === p1[p1.length - 1]), 'true'); check('키셋 안정', String(k2[0] === p1[p1.length - 1] - 1), 'true');
  const sim = L('paging').simulate({ how: 'offset', page: '10', size: '20', ins: true }); check('모형의 첫 글 id', String(1000000 - off), String(sim.firstId));
}
// 4) SQL Injection: 문자열 연결과 바인딩
{
  const db = new DatabaseSync(':memory:'); db.exec("create table member(email text, password text); insert into member values ('admin@shop.com','s3cret!')");
  const email = 'admin@shop.com', pw = "' OR '1'='1";
  const concat = db.prepare("SELECT * FROM member WHERE email = '" + email + "' AND password = '" + pw + "'").all().length;
  const bound = db.prepare('SELECT * FROM member WHERE email = ? AND password = ?').all(email, pw).length;
  console.log('SQL Injection: 문자열 연결 → 조회된 행', concat, '/ 바인딩 → 조회된 행', bound);
  check('연결', String(concat), '1'); check('바인딩', String(bound), '0');
}
console.log('일치', ok, '불일치', bad);
