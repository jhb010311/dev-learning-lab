// 기초개념 "지연 로딩" 실습의 용어. 근거(WebFetch로 열어 확인): Jakarta Persistence 3.2 API 문서 FetchType (https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/FetchType.html), ManyToOne의 fetch 요소 (https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/ManyToOne.html). Hibernate User Guide의 Fetching 장은 페이지에서 해당 부분을 열지 못해 근거로 쓰지 않았다.
module.exports = [
  ['JPA', 'FetchType', 'FetchType은 연관된 데이터를 언제 읽어 올지를 나타내는 열거형(enum)으로, 값은 EAGER와 LAZY 두 가지다. @ManyToOne 같은 연관관계 애너테이션의 fetch 속성에 FetchType.LAZY나 FetchType.EAGER를 적는다. EAGER는 데이터를 즉시 읽어 와야 한다는 요구이고, LAZY는 그 데이터를 처음 접근할 때 읽어도 된다는 힌트다. LAZY는 힌트이므로 구현체가 LAZY로 적힌 데이터를 미리 읽어 오는 것도 허용된다. @ManyToOne의 fetch를 적지 않으면 기본값은 EAGER다.'],
];
