// 기초개념 "JDBC" 실습의 용어. 근거(직접 열어 확인): Java SE 21 API 문서의 java.sql 패키지 설명, Connection, Statement, ResultSet, SQLException, DriverManager.getConnection
// (https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/package-summary.html 과 같은 위치의 Connection.html, Statement.html, ResultSet.html, SQLException.html, DriverManager.html), H2 문서 features 페이지(https://www.h2database.com/html/features.html).
// 'JDBC'는 이미 있어(kb_ormwhy.js) 새로 쓰지 않는다. Connection.html과 ResultSet.html은 문서가 길어 앞 10만 자까지만 읽었다.
module.exports = [
  ['DB', 'Connection과 DriverManager',
   'Connection은 특정 DB와 맺은 연결(세션)을 나타내는 객체이다. SQL 문장은 이 연결 안에서 실행되고 결과도 이 연결로 돌아온다. 자바 코드는 DriverManager.getConnection(url)로 연결을 얻는데, url은 jdbc:부프로토콜:이름 꼴이고(예: jdbc:h2:mem:shop) DriverManager가 등록된 JDBC 드라이버 가운데 알맞은 것을 골라 연결을 맺는다. close()는 연결이 쥔 DB와 JDBC 자원을 바로 풀어 주고, 닫힌 연결에서 createStatement를 부르면 SQLException이 난다. 연결이 없으면 SQL을 보낼 수 없다.'],
  ['DB', 'Statement와 executeQuery',
   'Statement는 값을 끼워 넣지 않은 SQL 문장을 DB에 보내 실행하는 데 쓰는 객체이고, conn.createStatement()로 만든다. executeQuery(sql)은 SELECT 같은 문장을 보내고 결과를 ResultSet 하나로 돌려주며, 돌려주는 값이 null인 일은 없다. DB 접근 오류가 나거나 닫힌 Statement에서 부르거나 ResultSet 하나를 만들지 않는 SQL을 보내면 SQLException이 난다. SQL은 자바에게 그냥 문자열이어서 글자가 틀려도 컴파일은 되고, DB가 읽는 실행 때에 오류로 알려진다. Statement를 만드는 것만으로는 SQL이 DB에 가지 않고 executeQuery를 부를 때 보내지는 것은 H2에서 실행해 확인했다.'],
  ['DB', 'ResultSet과 SQLException',
   'ResultSet은 쿼리 결과인 행들의 표이고 현재 행을 가리키는 커서를 가진다. 커서는 처음에 첫 행의 앞에 있고, next()가 한 칸 앞으로 옮겨 그 자리에 행이 있으면 true, 더 없으면 false를 돌려준다. getString("name")처럼 현재 행의 열 값을 꺼내는 메서드는 현재 행이 있어야 하므로, next()가 false를 돌려준 뒤에 부르면 SQLException이 난다. 조건에 맞는 행이 없어 결과가 비는 것은 오류가 아니고 next()가 false라는 신호로 알려진다. SQLException은 DB 접근 오류나 그 밖의 오류를 알리는 예외(Exception의 하위 클래스이므로 checked 예외)이고, 설명 문자열과 SQLState, DB 제품마다 다른 오류 코드를 담는다.'],
];
