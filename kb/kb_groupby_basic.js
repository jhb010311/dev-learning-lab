// 기초개념 "GROUP BY와 집계" 실습의 용어. 근거: MySQL 8.4 Reference Manual의 14.19.1 Aggregate Function Descriptions(https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html), 14.19.3 MySQL Handling of GROUP BY(https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html), 15.2.13 SELECT Statement(https://dev.mysql.com/doc/refman/8.4/en/select.html), H2 Commands의 SELECT(https://h2database.com/html/commands.html). 네 문서 모두 요약 도구로 열었고 원문을 한 글자씩 확인한 것은 아니다.
// "집계 함수"는 kb_selectorder.js에, "GROUP BY, WHERE, HAVING"은 kb5.js에 이미 있어 새로 쓰지 않는다.
module.exports = [
  ['DB', 'GROUP BY 절',
   'SELECT 문 뒤에 GROUP BY 열 이름으로 적어, 그 열의 값이 같은 행끼리 한 묶음(그룹)으로 만드는 절이다. 집계 함수는 묶음마다 한 번씩 계산되고, 묶음 하나가 결과의 한 줄이 된다. 그래서 결과의 행 수는 원래 행의 수가 아니라 묶음의 수이다. GROUP BY를 적지 않고 집계 함수를 쓰면 조건에 맞는 모든 행이 한 묶음이 되어 결과가 한 행이다. WHERE로 행을 거르는 일은 묶기 전에 일어나므로, WHERE는 어느 행을 묶을지를 정한다.'],
  ['DB', 'COUNT와 SUM',
   'COUNT(*)와 SUM(열)은 대표적인 집계 함수이다. COUNT(*)는 묶음 안의 행이 몇 개인지를 돌려주며, 값이 NULL인 열이 있어도 행으로 센다. COUNT(열)은 그 열이 NULL이 아닌 행만 센다. SUM(열)은 묶음 안에서 그 열의 값을 모두 더한 값을 돌려준다. GROUP BY가 있으면 묶음마다, 없으면 모든 행에 대해 한 번 계산한다.'],
  ['DB', '묶지 않은 열과 ONLY_FULL_GROUP_BY',
   '집계를 하는 SELECT에서 GROUP BY에 적지도 않았고 집계 함수 안에 있지도 않은 열을 묶지 않은 열이라고 부른다. 묶음 하나가 결과의 한 줄이 되는데 묶음 안에는 그 열의 값이 여럿일 수 있어서, 한 줄에 무엇을 적을지 정할 수 없다. MySQL은 SQL 모드 ONLY_FULL_GROUP_BY가 켜져 있으면(8.4에서 기본으로 켜져 있다) 묶지 않은 열을 SELECT, HAVING, ORDER BY에 쓴 문장을 거부한다. GROUP BY 없이 집계 함수를 쓴 문장에서도 같다. 다만 GROUP BY에 적은 열이 그 열의 값을 하나로 정해 주는 경우(예: 기본 키)는 허용하고, 값을 하나로 줄이려면 MAX 같은 집계 함수 안에 넣거나 ANY_VALUE를 쓴다. 데이터베이스마다 이 규칙을 검사하는 방식이 다르다.'],
];
