// "갭 락과 넥스트 키 락" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'gaplock', q: 'MySQL InnoDB의 REPEATABLE READ에서 트랜잭션 A가 id BETWEEN 20 AND 30 조건으로 SELECT ... FOR UPDATE를 실행했습니다(id가 20, 30인 행이 있습니다). 트랜잭션 B가 id = 25인 행을 INSERT하면 어떻게 됩니까?',
    a: ['A가 끝날 때까지 기다린다', '기다리지 않고 바로 실행된다', '곧바로 오류가 나며 롤백된다', 'A의 조회 결과에 바로 추가된다'],
    why: 'REPEATABLE READ에서 범위를 잠그는 조회는 행뿐 아니라 행과 행 사이의 빈 구간(갭)도 잠급니다. 그 구간에 끼어드는 INSERT는 A가 커밋하거나 롤백할 때까지 기다립니다.',
    sim: { c: { q: 'range', lv: 'RR', ins: '25' }, col: 2, has: '대기' } },
  { lv: 2, id: 'gaplock', q: 'REPEATABLE READ에서 트랜잭션 A가 없는 행(id = 25)을 SELECT ... FOR UPDATE로 조회했습니다. 잠글 행이 없는데, 트랜잭션 B가 id = 25인 행을 INSERT하면 어떻게 됩니까?',
    a: ['기다린다. 행은 없어도 20과 30 사이의 빈 구간이 잠겼다', '바로 실행된다. 잠긴 행이 하나도 없으므로 막을 것이 없다', '바로 실행된다. 빈 구간은 범위 조건으로 조회할 때만 잠긴다', '오류가 난다. 없는 행을 FOR UPDATE로 조회할 수는 없다'],
    why: '조건에 맞는 행이 없으면 InnoDB는 그 값이 들어갈 자리의 빈 구간에 갭 락을 겁니다. 그래서 같은 자리에 넣으려는 INSERT가 기다립니다. "없으면 넣는다"는 코드에서 두 트랜잭션이 서로를 기다리는 교착 상태가 생기는 까닭이기도 합니다.',
    sim: { c: { q: 'miss', lv: 'RR', ins: '25' }, col: 2, has: '대기' } },
  { lv: 2, id: 'gaplock', q: '격리 수준을 READ COMMITTED로 바꾸고 트랜잭션 A가 같은 범위 조회(id BETWEEN 20 AND 30 ... FOR UPDATE)를 했습니다. 트랜잭션 B가 id = 25인 행을 INSERT하면 어떻게 됩니까?',
    a: ['바로 실행된다. 빈 구간은 잠기지 않아 새 행이 끼어들 수 있다', '기다린다. 빈 구간은 격리 수준과 관계없이 언제나 잠긴다', '기다린다. READ COMMITTED가 더 넓은 구간을 잠그기 때문이다', '오류가 난다. READ COMMITTED에서는 FOR UPDATE를 쓸 수 없다'],
    why: 'READ COMMITTED에서는 조회와 인덱스 스캔에 갭 락을 쓰지 않습니다. 있는 행만 잠기므로 그 사이에 새 행이 들어갈 수 있고, A가 같은 조회를 다시 하면 전에 없던 행이 보입니다(Phantom Read).',
    sim: { c: { q: 'range', lv: 'RC', ins: '25' }, col: 2, has: '바로 실행' } },
  { lv: 3, id: 'gaplock', q: 'REPEATABLE READ에서 트랜잭션 A가 기본 키 조건 id = 20(있는 행)으로 SELECT ... FOR UPDATE를 했습니다. 이때 트랜잭션 B의 id = 25 INSERT가 기다리지 않고 바로 실행되는 이유는 무엇입니까?',
    a: ['유일 인덱스로 한 행을 정확히 찾는 조회는 그 행만 잠그고 빈 구간은 잠그지 않기 때문이다', 'FOR UPDATE는 읽기만 막는 락이어서 다른 트랜잭션의 INSERT는 막지 못하기 때문이다', 'INSERT는 처음부터 어떤 락과도 충돌하지 않고 실행되도록 만들어져 있기 때문이다', 'REPEATABLE READ에서는 갭 락을 쓰지 않고 READ COMMITTED에서만 쓰기 때문이다'],
    why: '유일 인덱스로 유일한 행 하나를 찾는 조회에는 갭 락이 필요 없습니다. 그 조건에 맞는 행이 새로 생길 수 없기 때문입니다. 그래서 id = 20인 행에 레코드 락만 걸리고 옆의 빈 구간은 자유롭습니다.',
    sim: { c: { q: 'hit', lv: 'RR', ins: '25' }, col: 2, has: '바로 실행' } },
]);
