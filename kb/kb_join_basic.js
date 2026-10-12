// 기초개념 "조인" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 15.2.13.2절 JOIN Clause(ON 조건, 테이블 별칭, JOIN과 CROSS JOIN)와 15.2.13절 SELECT Statement의 FROM 절 설명.
// 'JOIN (INNER, OUTER)'(kb5.js)와 '카테시안 곱'(kb4.js)은 이미 있어 새로 쓰지 않는다.
module.exports = [
  ['DB', 'ON 조건',
   'JOIN으로 두 테이블을 이을 때, 어떤 행끼리 짝인지를 정하는 조건이다. JOIN member m ON o.member_id = m.id처럼 JOIN 뒤에 ON을 쓰고 조건식을 적으면, DB는 이 조건이 참이 되는 두 행을 짝으로 보고 한 줄로 붙인다. 조건식은 WHERE에 쓸 수 있는 것과 같은 모양이며, 보통 ON은 테이블을 어떻게 이을지를, WHERE는 결과에 넣을 행을 고르는 데 쓴다. ON에는 그 JOIN이 잇는 두 테이블의 열만 쓸 수 있다. 표준 SQL에서 ON이 없는 JOIN은 CROSS JOIN이라 하고, 이때는 짝을 가리지 않고 모든 행을 모든 행과 붙인다.'],
  ['DB', '테이블 별칭',
   'FROM 절에서 테이블에 붙이는 짧은 다른 이름이다. FROM orders o처럼 테이블 이름 뒤에 적거나 FROM orders AS o처럼 AS를 넣어 적으며, 두 방식은 같은 뜻이다. 별칭을 붙이면 SELECT나 ON에서 o.item, m.name처럼 "어느 테이블의 열인지"를 짧게 밝힐 수 있다. 두 테이블이 같은 이름의 열(예: id)을 가질 때는 별칭으로 어느 쪽인지 밝혀야 하는 경우가 많다. 컬럼 별칭(AS)은 열에 붙이는 이름이고, 테이블 별칭은 테이블에 붙이는 이름이다.'],
];
