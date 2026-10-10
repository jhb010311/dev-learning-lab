// "실행 계획 읽기" 실습에 필요한 용어
module.exports = [
  ['DB', 'EXPLAIN의 type',
   'MySQL의 EXPLAIN 결과에서 그 테이블을 어떤 방법으로 읽는지를 나타내는 칸이다. 읽는 양이 적은 것부터 대략 const(기본 키나 유니크 인덱스로 한 행), eq_ref(조인에서 앞 테이블의 행마다 한 행), ref(유니크가 아닌 인덱스에서 값이 같은 행들), range(인덱스의 한 구간), index(인덱스 전체), ALL(테이블 전체) 순이다. index는 이름과 달리 인덱스를 처음부터 끝까지 읽는다는 뜻이므로 ALL과 마찬가지로 전부 읽는 접근이다. 어떤 값이 나오는지는 옵티마이저가 통계를 보고 정하므로, 같은 쿼리라도 데이터의 양과 분포에 따라 달라질 수 있다.'],
  ['DB', 'EXPLAIN의 Extra',
   'MySQL의 EXPLAIN 결과에서 읽는 방법 말고 덧붙여 하는 일을 적어 주는 칸이다. Using where는 읽어 온 행을 조건으로 다시 걸러낸다는 뜻이고, Using index는 테이블에 가지 않고 인덱스만 읽어 끝낸다는 뜻이다. Using filesort는 ORDER BY를 위해 따로 정렬한다는 뜻이며, Using temporary는 GROUP BY 등을 위해 임시 테이블을 만든다는 뜻이다. 비어 있으면 덧붙은 작업이 없다는 것이다. Using filesort와 Using temporary는 읽는 행이 많을 때 느려지는 원인이 되므로, rows 칸의 값과 함께 본다.'],
];
