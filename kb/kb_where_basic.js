// 기초개념 "WHERE" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 UPDATE 문(15.2.17), DELETE 문(15.2.2), SELECT 문(15.2.13)의 WHERE 설명.
// "행과 열"은 kb_pk_basic.js에 이미 있고, GROUP BY와 함께 쓰는 "GROUP BY, WHERE, HAVING"은 kb5.js에 있어 새로 쓰지 않는다.
module.exports = [
  ['DB', 'WHERE 절',
   'WHERE 절은 SELECT, UPDATE, DELETE 문 뒤에 붙여 테이블의 행 가운데 어느 행에 그 문장을 적용할지를 정하는 조건이다. DB는 행마다 조건이 참인지 확인하고, 참인 행에만 UPDATE나 DELETE를 적용하거나 SELECT로 읽어 온다. 조건에 맞는 행이 여럿이면 여럿 모두에 적용되고, 하나도 없으면 아무 행에도 적용되지 않으며 그것은 오류가 아니다. WHERE를 적지 않으면 모든 행이 대상이므로, SELECT는 전체를 읽고 UPDATE는 모든 행을 고치고 DELETE는 모든 행을 지운다.'],
  ['DB', 'UPDATE와 DELETE',
   'UPDATE는 테이블에 이미 있는 행의 열 값을 새 값으로 고치는 문장이고, DELETE는 행을 지우는 문장이다. 둘 다 어느 행에 적용할지를 WHERE 조건으로 정하며, 실행하면 적용된 행의 수를 돌려준다(JDBC에서는 executeUpdate가 그 수를 돌려준다). WHERE를 적지 않으면 UPDATE는 모든 행을 고치고 DELETE는 모든 행을 지운다. 이때도 문장은 오류 없이 끝나므로, 한 사람만 고치거나 지우려던 문장에서 WHERE를 빠뜨리면 DB가 알려 주지 않는다. DELETE로 행을 모두 지워도 테이블 자체는 남는다.', { use: '회원 정보 고치기, 주문 상태 바꾸기, 탈퇴한 회원 지우기처럼 이미 있는 데이터를 바꾸거나 없앨 때 쓴다. 실제 서비스에서는 행을 지우는 대신 deleted 같은 열을 UPDATE로 바꿔 "지운 것"으로 표시해 두는 방법도 흔히 쓴다.' }],
];
