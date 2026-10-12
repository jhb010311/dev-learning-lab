// 기초개념의 목차: 묶음(분야) → 항목. 공부(src/curriculum.js)와 따로 둔다.
//   { id: '실습 id' }                이미 실습이 있는 항목. 그 실습은 basic: true여야 한다
//   { t: '주제 이름', d: '한 줄 설명' }  아직 실습이 없는 항목 (화면에 "준비 중"으로 보인다)
// 기초개념 실습은 세부 동작이 아니라 "그 개념이 코드에서 어떻게 생긴 것인가"를 다룬다.
// 그 개념을 이루는 것을 하나씩 떼어 보며, 그것인 것과 아닌 것, 없으면 어떻게 되는지를 대조한다. 쓰는 법은 tools/BASICS_GUIDE.md.
// 어떤 주제를 둘지는 공부 쪽 실습의 글에 설명 없이 자주 나오는 낱말(행, 객체, 메서드, 클래스, 테이블, 빈, 예외, 변수, 타입 …)을 세어 정했다.
Lab.basics({
  desc: '개념의 세부 동작을 보기 전에, 그 개념이 코드에서 어떻게 생긴 것인지와 없으면 어떻게 되는지를 봅니다.',
  groups: [
    { name: 'Java', desc: '자바 코드를 읽을 때 먼저 알아야 하는 것들입니다.', items: [
      { id: 'var_basic' },
      { id: 'method_basic' },
      { id: 'class_basic' },
      { id: 'ref_basic' },
      { id: 'ctor_basic' },
      { id: 'static_basic' },
      { id: 'inherit_basic' },
      { id: 'interface_basic' },
      { id: 'exception_basic' },
      { id: 'generic_basic' },
      { id: 'lambda_basic' },
      { id: 'annot_basic' },
      { id: 'thread_basic' },
    ] },
    { name: 'Spring', desc: '스프링으로 웹 요청을 처리할 때 밑에 깔려 있는 것들입니다.', items: [
      { id: 'bean_basic' },
      { id: 'di_basic' },
      { id: 'servlet_basic' },
      { id: 'controller_basic' },
      { id: 'tx_basic' },
      { id: 'boot_basic' },
    ] },
    { name: 'JPA', desc: '자바 객체를 테이블에 저장할 때 나오는 것들입니다.', items: [
      { id: 'entity_basic' },
      { id: 'pc_basic' },
      { id: 'repo_basic' },
      { id: 'relation_basic' },
    ] },
    { name: 'DB', desc: '테이블에 데이터를 넣고 찾을 때의 기본 약속들입니다.', items: [
      { id: 'table_basic' },
      { id: 'pk_basic' },
      { id: 'fk_basic' },
      { id: 'where_basic' },
      { id: 'join_basic' },
      { id: 'index_basic' },
      { id: 'dbtx_basic' },
    ] },
    { name: '네트워크', desc: '브라우저와 서버가 주고받는 것의 생김새입니다.', items: [
      { id: 'port_basic' },
      { id: 'url_basic' },
      { id: 'dns_basic' },
      { id: 'http_basic' },
      { id: 'httpres_basic' },
      { id: 'cookie_basic' },
      { id: 'json_basic' },
      { t: 'HTTPS', d: '주고받는 글을 남이 읽지 못하게 하는 것' },
    ] },
    { name: '보안', desc: '누구인지 확인하고 지키는 일의 기본입니다.', items: [
      { t: '인증과 인가', d: '누구인지 확인하는 것과, 해도 되는지 확인하는 것' },
      { t: '세션', d: '로그인한 상태를 서버가 기억하는 방법' },
      { t: '토큰', d: '로그인한 상태를 들고 다니는 방법' },
      { t: '해시', d: '되돌릴 수 없게 바꾼 값. 비밀번호를 저장하는 방법' },
      { t: '암호화', d: '열쇠가 있어야 읽을 수 있게 바꾸기' },
    ] },
  ],
});
