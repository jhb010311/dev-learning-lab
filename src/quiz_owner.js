// "연관관계의 주인" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'owner', q: '양방향 연관관계에서 "연관관계의 주인"이 맡는 일은 무엇입니까?',
    a: ['외래 키의 값을 DB에 넣고 바꾸는 일을 맡는다', '두 엔티티 가운데 먼저 저장되는 쪽이 된다', '상대 엔티티를 조회할 수 있는 유일한 쪽이 된다', '상대가 지워질 때 함께 지워지는 쪽이 된다'],
    why: '객체에는 참조가 두 개지만 DB의 외래 키는 하나입니다. JPA는 주인으로 정한 쪽의 참조만 보고 외래 키를 씁니다. 주인이 아닌 쪽(mappedBy가 붙은 쪽)은 읽을 때만 쓰입니다.' },
  { lv: 2, id: 'owner', q: 'mappedBy가 붙은 Team.members에만 회원을 넣고 저장했더니, 예외는 없는데 member.team_id가 null입니다. 이유는 무엇입니까?',
    a: ['JPA가 외래 키를 쓸 때 주인인 Member.team의 값만 읽기 때문이다', '팀을 회원보다 먼저 persist해서 순서가 어긋났기 때문이다', '컬렉션에 넣은 값은 커밋이 끝난 뒤에야 반영되기 때문이다', 'IDENTITY 전략은 외래 키를 저장하지 못하는 전략이기 때문이다'],
    why: 'mappedBy는 "외래 키는 반대쪽 필드가 관리한다"는 표시입니다. JPA는 INSERT를 만들 때 Member.team 필드만 읽는데 그 값이 null이므로 team_id도 null이 됩니다. 잘못된 사용으로 보지 않으므로 예외도 나지 않습니다.',
    sim: { c: { set: 'inverse', clear: false, mp: true }, col: 0, has: 'null' } },
  { lv: 3, id: 'owner', q: 'member.setTeam(team)만 하고 저장한 뒤, flush와 clear 없이 같은 트랜잭션에서 team.getMembers().size()를 읽었습니다. 결과는 무엇입니까?',
    a: ['0이다. 외래 키는 저장됐지만 메모리의 목록은 비어 있다', '1이다. 외래 키가 저장됐으므로 목록에도 바로 보인다', '0이다. 주인 쪽에만 넣으면 외래 키도 저장되지 않는다', '예외가 난다. 목록을 채우지 않은 채로 읽었기 때문이다'],
    why: 'clear를 하지 않았으므로 team은 1차 캐시에 있는 처음의 객체 그대로입니다. 그 객체의 목록에는 아무것도 넣지 않았으므로 0입니다. DB의 team_id는 1로 저장돼 있어서 DB와 메모리가 어긋납니다. 그래서 양쪽에 다 넣습니다.',
    sim: { c: { set: 'owner', clear: false, mp: true }, col: 1, has: '0명' } },
  { lv: 3, id: 'owner', q: '양방향으로 만들면서 Team.members의 mappedBy를 빠뜨렸습니다. 양쪽에 다 값을 넣고 저장하면 어떤 테이블이 만들어집니까?',
    a: ['team, member와 연결 테이블 team_member까지 세 개', 'team과 member 두 개이고 team_id가 두 번 저장된다', 'team과 member 두 개이고 시작할 때 경고가 나온다', '매핑 오류로 시작할 때 예외가 나서 만들어지지 않는다'],
    why: 'mappedBy가 없으면 JPA는 Team.members를 Member.team과 상관없는 또 하나의 연관관계로 봅니다. 이 연관관계를 저장할 곳으로 연결 테이블이 따로 만들어지고, 저장할 때 그 테이블에도 INSERT가 나갑니다.',
    sim: { c: { set: 'both', clear: false, mp: false }, col: 3, has: 'team_member' } },
]);
