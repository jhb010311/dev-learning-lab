// 기초개념 "행 잠금" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 17.7.1절 InnoDB Locking(Shared and Exclusive Locks, Record Locks), 17.7.3절 Locks Set by Different SQL Statements in InnoDB (https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html, https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html). H2 문서 Advanced 페이지의 Multi-Version Concurrency Control와 Lock Timeout (https://www.h2database.com/html/advanced.html).
// '트랜잭션'(kb5.js), '공유 락과 배타 락'(kb5.js), '락 대기 시간 초과'(kb_dbdeadlock.js)는 이미 있어 새로 쓰지 않는다.
module.exports = [
  ['DB', '행 잠금',
   '행 잠금은 트랜잭션이 행을 고칠 때 DB가 그 행에 거는 잠금이다. MySQL InnoDB에서 UPDATE ... WHERE는 검색에서 만난 인덱스 레코드에 배타 락을 걸고, 기본 키처럼 유일한 인덱스로 한 행을 찾으면 그 레코드 락 하나면 된다. 한 트랜잭션이 행에 배타 락을 쥐고 있으면 다른 트랜잭션이 같은 행에 락을 요청해도 곧바로 얻지 못하고, 앞의 트랜잭션이 락을 풀 때까지 기다려야 한다. InnoDB의 락은 그 트랜잭션이 커밋되거나 중단될 때 풀리므로, 트랜잭션을 끝내지 않고 열어 두면 그 행은 계속 잠겨 있다. 잠금은 고친 행에만 걸리고 코드에 따로 적는 것이 아니라 UPDATE를 받은 DB가 스스로 건다.'],
];
