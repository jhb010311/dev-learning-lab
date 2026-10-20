// 기초개념 "트랜잭션" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 15.3.1절 START TRANSACTION, COMMIT, and ROLLBACK Statements, 17.7.2.2절 autocommit, Commit, and Rollback. H2 문법은 H2 문서 Commands 페이지의 COMMIT, ROLLBACK, SET AUTOCOMMIT.
// '트랜잭션'(kb5.js)과 '커밋과 롤백'(kb_tx_basic.js)은 이미 있어 새로 쓰지 않는다.
module.exports = [
  ['DB', '자동 커밋(autocommit)',
   '자동 커밋은 트랜잭션을 따로 시작하지 않았을 때 DB가 SQL 문장 하나하나를 실행하자마자 커밋하는 방식이다. MySQL은 새 연결을 자동 커밋을 켠 채로 시작하므로, 문장 하나가 곧 트랜잭션 하나이고 그 결과가 바로 확정되어 다른 연결에서도 보인다. 이렇게 확정된 문장은 ROLLBACK으로 되돌릴 수 없다. 트랜잭션을 시작하면 COMMIT이나 ROLLBACK으로 끝낼 때까지 자동 커밋이 꺼지고, 끝나면 이전 상태로 돌아온다. 자동 커밋을 끈 세션이 마지막 트랜잭션을 확정하지 않고 끝나면 MySQL(InnoDB)은 그 트랜잭션을 롤백한다.', { why: '문장 하나를 실행할 때마다 시작과 COMMIT을 따로 적어야 한다면 번거롭고, COMMIT을 잊으면 바뀐 내용이 확정되지 않은 채 남는다. 자동 커밋은 묶지 않은 문장을 하나씩 바로 확정해서 이 수고를 덜어 준다.', use: 'DB 도구에서 SQL 한 줄을 실행하면 보통 이 방식으로 바로 반영된다. 자바 프로그램이 DB에 처음 연결할 때도 켜져 있고, 스프링은 여러 문장을 한 트랜잭션으로 묶는 동안 이것을 꺼 둔다.' }],
  ['DB', 'BEGIN, COMMIT, ROLLBACK 문',
   '트랜잭션을 시작하고 끝내는 SQL 문장이다. BEGIN은 트랜잭션을 시작하는 문장이고, MySQL에서는 START TRANSACTION과 같은 뜻이다(START TRANSACTION이 표준 SQL 문법이라 권장된다). COMMIT은 지금까지 트랜잭션 안에서 한 변경을 모두 영구히 확정하고, ROLLBACK은 그 변경을 모두 취소한다. 기본 설정에서는 자동 커밋이 켜져 있어, 시작하는 문장이 없으면 COMMIT과 ROLLBACK이 확정하거나 취소할 트랜잭션이 없다. MySQL의 저장 프로그램(프로시저, 트리거 등) 안에서는 BEGIN이 BEGIN ... END 블록의 시작으로 해석되므로 START TRANSACTION을 써야 하고, 시작하는 문장의 문법은 DB마다 조금씩 다르다.', { why: '자동 커밋만 있으면 문장마다 바로 확정되어 여러 문장을 하나로 묶을 수 없다. BEGIN과 COMMIT은 묶음의 처음과 끝을 DB에 알려서, 그 사이의 문장을 한꺼번에 확정하거나 ROLLBACK으로 한꺼번에 취소하게 한다.', use: 'DB 도구에서 데이터를 손으로 고칠 때 BEGIN으로 시작해 SELECT로 결과를 확인하고, 맞으면 COMMIT, 틀렸으면 ROLLBACK한다.' }],
];
