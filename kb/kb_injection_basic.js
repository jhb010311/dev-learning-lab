// 기초개념 "입력과 인젝션" 실습의 용어. 근거(직접 열어 확인): OWASP SQL Injection Prevention Cheat Sheet(https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)의 What Is a SQL Injection Attack?, Defense Option 1: Prepared Statements, Safe Java Prepared Statement Example,
// Java SE 21 API 문서 PreparedStatement(https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/PreparedStatement.html)와 Statement(https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/Statement.html),
// H2 문서 grammar 페이지(https://www.h2database.com/html/grammar.html)의 문자열 리터럴, MySQL 8.4 Reference Manual의 String Literals(https://dev.mysql.com/doc/refman/8.4/en/string-literals.html).
// 'SQL Injection'(kb4.js)과 'Statement와 executeQuery'(kb_jdbc_basic.js)는 이미 있어 새로 쓰지 않는다. WebFetch는 요약만 돌려주므로 원문 전체를 읽은 것은 아니다.
module.exports = [
  ['DB', 'PreparedStatement와 바인드 파라미터',
   'PreparedStatement는 SQL 문장을 미리 컴파일해 두고 같은 문장을 여러 번 실행하는 데 쓰는 객체이고, conn.prepareStatement(sql)로 만든다. SQL에서 값이 들어갈 자리를 ?로 비워 두고, setString(1, 값)처럼 자리 번호(1부터 시작)와 값을 따로 넘긴다. 이렇게 SQL을 먼저 정하고 값을 나중에 넘기는 값을 바인드 파라미터라고 한다. OWASP는 이 방식에서 DB가 입력이 무엇이든 코드와 데이터를 항상 구별하므로, 공격자가 SQL 명령을 끼워 넣어도 질의의 의도를 바꿀 수 없다고 설명한다. 이 문서의 H2 2.4.240 실행에서도 값을 ?로 넘기면 DB가 기록한 SQL에는 ?가 그대로 남고 입력의 글은 나타나지 않았다.', { use: '로그인할 때 아이디로 회원을 찾거나 검색어로 글을 찾는 것처럼 사용자가 넣은 값이 SQL에 들어가는 곳에는 늘 쓴다. JdbcTemplate과 JPA도 값을 넘길 때 PreparedStatement로 SQL을 보낸다.' }],
  ['DB', 'SQL 문자열 값과 따옴표',
   'SQL에서 글자 값(문자열 리터럴)은 작은따옴표로 시작해서 작은따옴표로 끝낸다. 문자열 안에 작은따옴표 글자를 넣으려면 H2에서는 따옴표를 두 번 써서 \'\'로 적고(예: \'John\'\'s car\'), MySQL은 \'\'와 함께 앞에 \\를 붙이는 방법도 허용한다. 따옴표가 문자열의 끝을 알리는 글자이기도 해서, 입력을 SQL 글자에 그대로 이어 붙이면 입력 안의 따옴표가 문자열을 끝내 버리고 그 뒤의 글자가 SQL 문법으로 읽힌다. 따옴표가 든 평범한 이름(O\'Neil)도 이어 붙이면 문법 오류가 나는 이유가 이것이다. 값으로 넘기는 방식은 따옴표를 SQL 글자에 쓰지 않아 이 문제가 없다.'],
];
