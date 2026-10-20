// 기초개념 "저장과 지속성" 실습의 용어. 근거(직접 열어 확인): MySQL 8.4 Reference Manual의 InnoDB and the ACID Model(https://dev.mysql.com/doc/refman/8.4/en/mysql-acid.html)과 용어집의 ACID, commit, disk-based 항목(https://dev.mysql.com/doc/refman/8.4/en/glossary.html),
// H2 문서의 Durability Problems와 ACID의 Durability(https://www.h2database.com/html/advanced.html), In-Memory Databases와 Database URL Overview(https://www.h2database.com/html/features.html), 명령어의 SET WRITE_DELAY(https://www.h2database.com/html/commands.html).
// '트랜잭션'(kb5.js), 'ACID'(kb5.js), '커밋과 롤백'(kb_tx_basic.js), 'Undo 로그와 Redo 로그'(kb5.js)는 이미 있어 새로 쓰지 않는다.
module.exports = [
  ['DB', '지속성(Durability)',
   '지속성은 COMMIT이 성공한 트랜잭션의 변경이 전원 장애나 시스템 충돌이 나도 사라지지 않는 성질이며, ACID의 D에 해당한다. MySQL 문서는 지속성이 보통 디스크 저장소에 쓰는 일로 이루어지고, 쓰는 도중의 장애에 대비해 여분의 기록을 둔다고 설명한다. MySQL에서는 이것이 소프트웨어 설정(innodb_flush_log_at_trx_commit 등)과 하드웨어(저장 장치의 쓰기 버퍼, 운영체제의 fsync() 지원 등)가 함께 정하는 성질이어서, 설정에 따라 보장 정도가 달라진다. COMMIT하기 전의 변경은 이 약속의 대상이 아니다.'],
  ['DB', '파일 DB와 메모리 DB',
   '파일 DB는 데이터를 디스크의 파일에 저장하는 DB이고, 메모리 DB는 컴퓨터의 메모리에만 두는 DB이다. H2에서는 연결 주소로 고른다. jdbc:h2:file:경로로 시작하면(file: 은 생략할 수 있다) 파일에 저장하고, jdbc:h2:mem:이름으로 시작하면 메모리에 둔다. 파일 DB는 연결을 닫아도 남지만, H2 문서에 따르면 메모리 DB는 마지막 연결을 닫으면 내용이 사라지고, DB_CLOSE_DELAY=-1을 붙여도 프로그램(가상 머신)이 살아 있는 동안만 남는다. MySQL 용어집은 디스크에 저장하는 DB(disk-based)의 반대를 인메모리 DB라고 부른다.', { why: '테스트할 때마다 DB 서버를 따로 켜고 지난번 데이터를 지우는 일은 번거롭다. 메모리 DB는 프로그램과 함께 생겼다가 끝나면 사라져서, 매번 빈 DB로 빠르게 시작하게 한다.', use: 'JPA나 JDBC를 쓰는 스프링 부트 프로젝트에 H2를 의존성으로 넣고 DB 주소를 적지 않으면, 스프링 부트가 H2 메모리 DB를 저절로 만들어 쓴다. 파일 DB 방식은 DB 서버를 따로 두지 않는 작은 프로그램이 데이터를 파일에 남길 때 쓴다.' }],
  ['DB', 'H2의 쓰기 지연(WRITE_DELAY)',
   'WRITE_DELAY는 H2에서 COMMIT과 그 내용을 파일에 쓰는 일 사이에 둘 수 있는 최대 지연이며 밀리초로 정한다. H2 문서에 따르면 기본값은 500이고, SET WRITE_DELAY 숫자 명령이나 연결 주소 끝의 ;WRITE_DELAY=0 꼴로 바꿀 수 있으며 설정은 데이터베이스에 남는다. H2는 기본으로 COMMIT한 내용을 파일에 쓰는 일을 미루기 때문에, H2 문서는 전원이 나가면 1초 남짓 동안 COMMIT한 내용을 잃을 수 있다고 적고 있다. 하드 디스크가 쓰기 명령(fsync)을 지키지 않는 경우도 많아, 어떤 설정이든 완전한 지속성은 장치에 달려 있다.', { why: 'COMMIT할 때마다 파일에 다 쓸 때까지 기다리면, COMMIT이 잦은 프로그램은 그만큼 느려진다. WRITE_DELAY는 파일에 쓰는 일을 잠깐 미뤄 COMMIT을 빨리 끝내는 대신 지속성을 조금 내준 설정이다.', use: 'H2 파일 DB에서 전원이 나갈 때 COMMIT한 기록을 잃는 일을 줄이려면 0으로 낮춰 미루지 않게 하고, 잃어도 다시 만들 수 있는 데이터라면 기본값대로 둔다.' }],
];
