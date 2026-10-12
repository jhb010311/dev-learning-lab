// 기초개념 "인덱스" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 15.1.15절 CREATE INDEX Statement(기존 테이블에 색인을 더하는 문장), 10.3.1절 How MySQL Uses Indexes(색인이 없으면 첫 행부터 테이블 전체를 읽는다), 10.3.2절 Primary Key Optimization(기본 키에는 색인이 딸려 있다). H2 문서 performance 페이지의 Statement Execution Plans (EXPLAIN).
// 인덱스, 풀 테이블 스캔, 실행 계획(EXPLAIN)은 이미 있어(kb5.js) 새로 쓰지 않는다.
module.exports = [
  ['DB', 'CREATE INDEX',
   'CREATE INDEX 색인이름 ON 테이블(열) 형태로, 이미 만든 테이블의 열에 색인(인덱스)을 더하는 SQL 문이다. 예를 들어 CREATE INDEX idx_name ON member(name)은 member 테이블의 name 열 값을 정리한 색인을 만든다. 색인은 테이블과 따로 저장되며 테이블의 행 자체는 바꾸지 않는다. 색인은 주로 만든 열을 조건으로 찾을 때 쓰이므로 다른 열로 찾으려면 그 열의 색인이 따로 있어야 한다. 기본 키(PRIMARY KEY)를 적은 열에는 DB가 색인을 자동으로 만들어 두므로 CREATE INDEX를 쓰지 않아도 된다(MySQL에서 기본 키 자체는 CREATE INDEX가 아니라 CREATE TABLE이나 ALTER TABLE로 만든다).'],
];
