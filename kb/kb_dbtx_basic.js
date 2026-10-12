// 기초개념 "트랜잭션" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 15.3.1절 START TRANSACTION, COMMIT, and ROLLBACK Statements, 17.7.2.2절 autocommit, Commit, and Rollback. H2 문법은 H2 문서 Commands 페이지의 COMMIT, ROLLBACK, SET AUTOCOMMIT.
// '트랜잭션'(kb5.js)과 '커밋과 롤백'(kb_tx_basic.js)은 이미 있어 새로 쓰지 않는다.
module.exports = [
  ['DB', '자동 커밋(autocommit)',
   '자동 커밋은 트랜잭션을 따로 시작하지 않았을 때 DB가 SQL 문장 하나하나를 실행하자마자 커밋하는 방식이다. MySQL은 새 연결을 자동 커밋을 켠 채로 시작하므로, 문장 하나가 곧 트랜잭션 하나이고 그 결과가 바로 확정되어 다른 연결에서도 보인다. 이렇게 확정된 문장은 ROLLBACK으로 되돌릴 수 없다. 트랜잭션을 시작하면 COMMIT이나 ROLLBACK으로 끝낼 때까지 자동 커밋이 꺼지고, 끝나면 이전 상태로 돌아온다. 자동 커밋을 끈 세션이 마지막 트랜잭션을 확정하지 않고 끝나면 MySQL(InnoDB)은 그 트랜잭션을 롤백한다.'],
  ['DB', 'BEGIN, COMMIT, ROLLBACK 문',
   '트랜잭션을 시작하고 끝내는 SQL 문장이다. BEGIN은 트랜잭션을 시작하는 문장이고, MySQL에서는 START TRANSACTION과 같은 뜻이다(START TRANSACTION이 표준 SQL 문법이라 권장된다). COMMIT은 지금까지 트랜잭션 안에서 한 변경을 모두 영구히 확정하고, ROLLBACK은 그 변경을 모두 취소한다. 시작하는 문장이 없으면 자동 커밋이 켜져 있어 COMMIT과 ROLLBACK이 확정하거나 취소할 트랜잭션이 없다. MySQL의 저장 프로그램(프로시저, 트리거 등) 안에서는 BEGIN이 BEGIN ... END 블록의 시작으로 해석되므로 START TRANSACTION을 써야 하고, 시작하는 문장의 문법은 DB마다 조금씩 다르다.'],
];
