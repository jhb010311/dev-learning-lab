// "정렬과 Comparator" 실습의 문제. a의 첫 번째가 정답이고, sim이 있으면 실습 모형의 결과와 정답을 대조한다.
Lab.quiz([
  { lv: 1, id: 'sorting', q: 'Comparable과 Comparator의 차이로 옳은 것은 무엇입니까?',
    a: ['Comparable은 클래스 안에 정해 둔 기본 순서이고, Comparator는 바깥에서 따로 주는 순서다', 'Comparable은 숫자만 비교할 수 있고, Comparator는 문자열만 비교할 수 있는 도구다', 'Comparable은 오름차순에만 쓸 수 있고, Comparator는 내림차순에만 쓸 수 있다', 'Comparable은 정렬할 때마다 새로 만들고, Comparator는 클래스 안에 한 번만 적는다'],
    why: 'Comparable은 클래스가 compareTo로 스스로 정해 두는 순서 하나입니다. Comparator는 클래스를 고치지 않고 바깥에서 주는 순서라서, 같은 목록을 잔액순이나 이름순처럼 여러 기준으로 정렬할 수 있습니다.',
    sim: { c: { by: 'natural', data: 'normal', rev: false }, col: 0, has: 'choi, han, kim, lee, park' } },
  { lv: 2, id: 'sorting', q: '(a, b) -> a.balance() - b.balance()처럼 두 수를 빼서 비교하는 Comparator가 위험한 이유는 무엇입니까?',
    a: ['두 값의 차이가 int 범위를 넘으면 부호가 뒤집혀, 틀린 순서가 예외 없이 나온다', '빼기는 크기 비교보다 훨씬 느려서, 원소가 많아지면 정렬 시간이 크게 늘어난다', '두 값이 같을 때 0이 아닌 값이 나와서, 같은 원소끼리의 순서가 계속 뒤바뀐다', '람다로 만든 Comparator에는 reversed를 쓸 수 없어서, 거꾸로 정렬하지 못한다'],
    why: '20억에서 -20억을 빼면 40억이어야 하지만 int에 담을 수 없어 음수가 됩니다. 정렬은 부호만 보므로 큰 값을 작다고 판단하고, 예외 없이 틀린 순서가 나올 수 있습니다. Integer.compare나 Comparator.comparingInt는 빼지 않고 크기를 비교합니다.',
    sim: { c: { by: 'sub', data: 'big', rev: false }, col: 3, has: '틀림' } },
  { lv: 2, id: 'sorting', q: '잔액순으로 정렬했더니 잔액이 같은 park와 kim이 정렬하기 전과 같은 순서로 나왔습니다. 그 이유는 무엇입니까?',
    a: ['List.sort는 비교 결과가 0인 원소들의 원래 순서를 지키는 안정 정렬이기 때문이다', '잔액이 같으면 List.sort가 알아서 이름의 사전 순서를 비교해 주기 때문이다', '잔액이 같으면 List.sort가 두 객체의 hashCode를 비교해 순서를 정하기 때문이다', '원래는 실행할 때마다 달라지는데 이번에는 우연히 같은 순서로 나온 것이다'],
    why: '자바에서 객체를 정렬하는 List.sort와 Collections.sort는 안정 정렬입니다. 비교 결과가 0인 원소들은 정렬 전의 앞뒤 순서를 그대로 지킵니다. 이름순까지 원한다면 thenComparing으로 두 번째 기준을 주어야 합니다.',
    sim: { c: { by: 'cmp', data: 'normal', rev: false }, col: 0, has: 'choi, lee, han, park, kim' } },
  { lv: 3, id: 'sorting', q: 'park(300), choi(100), kim(300), lee(100), han(200) 순서로 넣은 목록을 Comparator.comparingInt(Account::balance).reversed()로 정렬하면 어떤 순서가 됩니까?',
    a: ['park, kim, han, choi, lee', 'kim, park, han, lee, choi', 'park, kim, han, lee, choi', 'choi, lee, han, park, kim'],
    why: '잔액이 큰 것부터 놓입니다. 잔액이 같은 park와 kim, choi와 lee는 비교 결과가 0이고, 0은 뒤집어도 0이므로 정렬 전의 순서(park가 kim보다 앞, choi가 lee보다 앞)를 그대로 지킵니다.',
    sim: { c: { by: 'cmp', data: 'normal', rev: true }, col: 0, has: 'park, kim, han, choi, lee' } },
]);
