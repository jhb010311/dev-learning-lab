// 기초개념 "기본 키" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 CREATE TABLE 문(Indexes, Foreign Keys, and CHECK Constraints의 PRIMARY KEY 항목), 1.7.3.1절 PRIMARY KEY and UNIQUE Index Constraints, 5.3.4.6절 Working with NULL Values.
// 기본 키, 제약 조건, NULL 관련 용어는 이미 있어(kb5.js, kb_constraints.js, kb_subquery.js) 새로 쓰지 않는다.
module.exports = [
  ['DB', '행과 열',
   '관계형 데이터베이스의 테이블은 표처럼 열과 행으로 이루어진다. 열(컬럼)은 테이블을 만들 때 이름과 타입을 정해 두는 칸의 종류이고, 예를 들어 member 테이블의 id, name이 열이다. 행(레코드)은 그 열들에 값을 채운 한 줄이며, 회원 한 사람의 정보가 행 하나가 된다. INSERT는 행을 하나 추가하고, UPDATE는 WHERE 조건에 맞는 행을 모두 고치며, SELECT는 행을 읽어 온다. 열에 값이 없는 것은 NULL로 나타낸다.'],
];
