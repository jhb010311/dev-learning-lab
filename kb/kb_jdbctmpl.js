// "JdbcTemplate과 예외 변환" 실습과 함께 추가한 용어
module.exports = [
  ['Spring', 'JdbcTemplate', '스프링이 제공하는 JDBC 도우미 클래스로, SQL을 실행할 때마다 반복되는 일을 대신 한다. 커넥션을 얻고, PreparedStatement를 만들어 값을 넣고, 실행하고, 결과를 읽고, 예외가 나든 안 나든 자원을 닫는 일을 안에서 처리하므로, 개발자는 SQL과 넣을 값, 결과를 담을 방법만 넘기면 된다. update는 추가·수정·삭제에, queryForObject는 결과가 정확히 1건인 조회에, query는 여러 건을 목록으로 받는 조회에 쓴다. queryForObject는 결과가 0건이면 EmptyResultDataAccessException을, 2건 이상이면 IncorrectResultSizeDataAccessException을 던지므로, 0건이 정상일 수 있는 조회에는 주의해서 쓴다.'],
  ['Spring', '예외 변환과 DataAccessException', '스프링이 데이터 접근 기술이 던지는 예외를 자신의 예외 계층으로 바꿔 주는 것이다. JDBC의 SQLException은 체크 예외이고 무슨 문제인지는 그 안의 코드(SQLState, 오류 번호)로만 알 수 있는데, 스프링은 이것을 DataAccessException의 하위 클래스로 바꿔 던진다. 중복 키는 DuplicateKeyException, 그 밖의 제약 조건 위반은 DataIntegrityViolationException, 잘못된 SQL은 BadSqlGrammarException이 된다. DataAccessException은 언체크 예외라서 throws를 적지 않아도 되고, 원래의 예외는 원인(cause)으로 보관된다. 예외 클래스의 이름으로 문제를 구분하므로, 서비스 코드가 특정 DB 제품의 오류 번호에 묶이지 않는다.'],
];
