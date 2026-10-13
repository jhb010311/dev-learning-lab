// 기초개념 "테이블, 행, 열" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 튜토리얼 Creating a Table(https://dev.mysql.com/doc/refman/8.4/en/creating-tables.html), Loading Data into a Table(loading-tables.html), Selecting All Data(selecting-all.html), Selecting Particular Columns(selecting-columns.html), Chapter 13 Data Types의 서두(data-types.html).
// 행과 열은 kb_pk_basic.js에 이미 있어 새로 쓰지 않는다.
module.exports = [
  ['DB', '테이블',
   '관계형 데이터베이스에서 데이터를 담는 표이다. 테이블에는 member처럼 이름이 있고, 어떤 열(칸의 종류)을 둘지는 CREATE TABLE로 정한다. 데이터는 그 열에 맞춘 행(한 줄)으로 쌓이며, 행은 INSERT로 넣고 SELECT로 읽는다. 테이블을 만들기 전에는 그 이름으로 INSERT도 SELECT도 할 수 없다. 한 데이터베이스에는 테이블을 여러 개 둘 수 있다.'],
  ['DB', 'CREATE TABLE, INSERT, SELECT',
   '이 셋은 SQL 문이다. SQL은 관계형 데이터베이스에 일을 시키는 언어이고, 시키는 한 문장 한 문장을 SQL 문이라고 한다. CREATE TABLE은 테이블을 만들면서 열의 이름과 타입을 정하는 문이다(예: CREATE TABLE member (id INT, name VARCHAR(20))). INSERT는 행을 하나 넣는 문이고, 열 이름을 따로 적지 않으면 VALUES 뒤의 값이 CREATE TABLE에서 열을 적은 순서대로 열에 들어간다. SELECT는 행을 읽어 오는 문으로, SELECT name FROM member처럼 열 이름을 적으면 그 열의 값만, *를 적으면 모든 열의 값을 읽는다. 문장은 보통 세미콜론(;)으로 끝낸다.'],
  ['DB', '열의 데이터 타입',
   '열의 데이터 타입은 그 열에 담을 수 있는 값의 종류이다. CREATE TABLE에서 열마다 이름과 함께 적는다. 예를 들어 id INT는 정수 칸이고, name VARCHAR(20)은 길이가 달라지는 글자를 20자까지 담는 칸이다. MySQL 8.4 문서는 타입을 숫자, 날짜와 시간, 문자열, 공간, JSON의 다섯 종류로 나눈다. 타입에 맞지 않는 값을 넣으려 하면 DB가 그 INSERT를 거부하는 것이 보통이지만, 얼마나 엄격한지는 DB와 설정에 따라 다르다.'],
];
