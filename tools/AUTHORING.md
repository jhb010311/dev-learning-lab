# 실습 작성 안내

이 문서는 "개발 학습 실습실"에 새 실습을 추가하는 사람을 위한 것입니다. 끝까지 읽고 시작하세요.

## 1. 이 사이트가 무엇인가

- 개념 하나를 **설정을 바꾸고 실행을 누르면 단계별로 재현해 보여 주는 모형**(시뮬레이터)으로 익히는 사이트입니다. 실제 코드를 실행하는 곳이 아닙니다.
- 모형이기 때문에 **틀린 내용이 가장 큰 위험**입니다. 그래서 실습마다 모형의 결과를 실제 실행과 대조하고, 무엇과 대조했는지를 화면에 적습니다.
- 읽는 사람은 기초가 약한 학습자입니다. 쉬운 말로 쓰고, 전문 용어는 처음 나올 때 풀어 줍니다.
- 본보기: `src/lessons/78_eqhash.js`(가장 최근 형식), `src/lessons/14_equality.js`. 먼저 이 둘을 읽으세요.

## 2. 실습 하나에 만드는 파일

| 파일 | 내용 |
|---|---|
| `src/lessons/NN_<id>.js` | 실습 본체. NN과 id는 배정받은 것을 씁니다 |
| `kb/kb_<id>.js` | 이 실습에 필요한데 설명(kb)에 아직 없는 용어. 없으면 만들지 않습니다 |
| `src/verify_<id>.js` | 검증 수준 한 줄 |
| `src/quiz_<id>.js` | 테스트 문제 3개 이상 |
| `verify/plain/<Name>Probe.java`, `<Name>Probe.out.txt`, `cmp_<id>.js` | 실제 실행 프로그램, 그 출력, 모형과 대조하는 스크립트 |

**건드리지 않는 것**: `src/framework.html`, `src/curriculum.js`, `src/verify.js`, `src/glossary.js`, `kb/kb1~6.js`, 다른 실습의 파일, `build.js`, `test.js`, `docs/`. `node build.js`와 git 명령은 실행하지 않습니다(다른 사람이 동시에 작업 중입니다). 파일을 지우는 명령(rm 등)도 쓰지 않습니다.

## 3. 실습 파일의 형식

```js
Lab.register({
  id: 'eqhash', nav: 'equals와 hashCode', cat: '자바 언어', mode: 'step',
  title: '질문 형태의 제목',            // 이 실습이 답하는 물음
  intro: '두세 문장 소개',
  terms: ['kb에 있는 용어 이름', ...],  // 글자 그대로 같아야 함. node tools/kb_names.js <검색어>로 확인
  controls: [ ... ], presets: [ ... ],
  code: function (c) { return '이 설정에 해당하는 코드'; },
  label: function (c) { return '실행 비교 표에 적힐 짧은 설정 요약'; },
  columns: ['결과 항목 1', '결과 항목 2', ...],
  simulate: function (c) { return { events: [{ s: '문장', k: ''|'good'|'bad', snap: {...} }], summary: ['...'], row: [...] }; },
  render: function (v, sim, t, H, shown) { ... },   // 오른쪽 실행표
  draw: function (P, sim, shown) { ... },           // 왼쪽 그림 (있으면 좋음)
  assume: '무엇을 단순화했고 무엇과 대조했는지',      // 반드시 마지막 항목
});
```

- 파일은 `  id: '<id>', nav:` 로 시작하는 줄이 있어야 합니다(도구가 이 줄로 실습을 찾습니다).
- `mode`는 대부분 `'step'`입니다. 사건(events)이 순서대로 한 단계씩 보입니다.
- **controls**: `{ id, label, type: 'select', value, options: [[값, 보이는 글], ...] }`, `{ type: 'check', value: true|false }`, `{ type: 'range', min, max, value, step, fmt: function (v) { return v + '개'; } }`. `show: function (c) { return 조건; }`로 다른 설정에 따라 숨길 수 있고, `hint`로 한 줄 도움말을 붙일 수 있습니다. **select의 값은 브라우저에서 문자열로 옵니다.** 숫자로 쓸 때는 `+c.x`로 바꾸세요. 설정은 2~4개가 적당합니다.
- **presets**: `{ t: '이름', d: '눌렀을 때 무엇을 보게 되는지', v: { 설정 id: 값, ... } }`. 첫 번째는 이름을 `'처음 설정으로'`로 하고 controls의 기본값과 같게 합니다. 4~7개. 기본 설정은 **놀라운 결과가 나오는 경우**로 잡으면 좋습니다.
- **simulate**: 순수 함수여야 합니다(같은 설정이면 항상 같은 결과, 난수 금지). `snap`은 그 단계의 상태를 **복사해서** 넣습니다(`JSON.parse(JSON.stringify(st))`). `row`의 길이는 `columns`와 같아야 하고, 값은 문자열로 둡니다. `summary`에는 결과 한 줄과, 그 설정에서 배울 점을 1~3줄 적습니다. render와 draw가 쓸 값은 반환 객체에 더 넣어도 됩니다(이름이 `_`로 시작하면 안 됩니다). 실습 객체에 도우미 함수를 둘 때는 `explain`이라는 이름을 쓰지 않습니다(틀이 그 이름에 설명을 붙입니다).
- **render**의 도우미 `H`: `H.title(v, '제목')`, `H.counters(v, [[값, 이름], ...])`, `var ln = H.lanes(v); H.lane(ln, '이름', '글', cls)`(cls: `none`, `hot`, `wait`, `good`, `bad`), `H.slots(v, [[글, cls], ...], '비었을 때 글')`(cls: `q` 파랑, `d` 초록, `b` 노랑, `r` 빨강, `now` 테두리), `H.table(v, ['머리', ...], [{ cls: ''|'gone', cells: ['글' 또는 { v: '글', cls: 'hot'|'good'|'bad' }] }], '표 이름')`, `H.text(v, '글')`. `shown`은 지금까지 보인 사건들이고, `shown[shown.length - 1].snap`이 현재 상태입니다. 아직 아무 단계도 없을 때(`shown`이 빔)도 오류 없이 그려야 합니다.

## 4. 그림 (draw)

- 공간이나 흐름이 있는 개념이면 그림을 넣습니다(대부분 넣는 쪽이 좋습니다). 표가 더 잘 맞는 개념이면 빼도 됩니다.
- 가로 680 기준의 좌표입니다. `P.size(680, 높이)`로 시작합니다(높이 260~360).
- `P.region(id, x, y, w, h, '이름')` 점선 영역 · `P.box(id, x, y, w, h, { cls, title, sub, right, center })` 상자(cls: `hot` 노랑, `wait` 파랑, `good` 초록, `bad` 빨강, `plain`, `ghost` 점선, `now` 굵은 테두리. 띄어 써서 조합) · `P.text(id, x, y, '글', { cls: 'mut'|'bad'|'good', anchor: 'start'|'middle'|'end', bold })` · `P.arrow(id, from, to, { cls: 'hot'|'bad'|'good'|'mut'|'dash', label })`. 화살표의 양 끝은 `'상자id'`, `'상자id:r'`(변: l, r, t, b), `'상자id:l:0.75'`(변 위의 위치) 또는 `[x, y]`입니다 · `P.note('그림 아래 설명')`.
- 순서 그림이 필요하면 `P.seq(actors, msgs, { keep })`가 있습니다(`src/lessons`의 `73_httpmsg.js`, `47_tls.js` 참고).
- **같은 것은 단계가 바뀌어도 같은 id**를 쓰세요. 엔진이 id로 앞 장면과 비교해 움직이게 합니다.
- 글자가 상자보다 길면 잘립니다. 검사 도구가 "칸이 좁아 잘리는 글자"로 알려 주니 상자를 넓히거나 글을 줄이세요.
- draw 바로 위에 `// 그림: 무엇을 어떻게 그리는지` 한 줄을 둡니다.

## 5. 정확성: 반드시 실제 실행과 대조

실습마다 다음 네 가지를 스스로 점검합니다.

1. 과한 것은 없는가(한 실습에 개념을 너무 많이 넣지 않았는가)
2. 설정이 충분한가(그 개념에서 사람들이 헷갈리는 경우를 설정으로 만들 수 있는가)
3. 설정이 결과에 반영되는가(설정을 바꿔도 결과가 같은 죽은 설정이 없는가)
4. 실제 개념에 어긋나지 않는가

4번은 추측이 아니라 실행으로 확인합니다.

- JDK 21: `E:/dev/jdk-21.0.12.1+1/bin/javac`, `.../bin/java` (PATH에 없음). 컴파일 결과는 `verify/out/<id>/`에 둡니다(`-d`). 출력은 `-Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8`로 실행해 `verify/plain/<Name>Probe.out.txt`에 저장합니다.
- Probe는 **모형의 모든 설정 조합**을 실제로 실행해 한 줄에 하나씩 `설정값|설정값 => 결과|결과` 형태로 출력합니다. 컴파일 오류가 결과인 조합은 Probe 안에서 `javax.tools.ToolProvider.getSystemJavaCompiler()`로 소스 문자열을 컴파일해 성공 여부와 오류 메시지를 얻습니다(조합마다 javac를 따로 실행해도 됩니다).
- `cmp_<id>.js`는 `require('../model_rows.js')`의 `load(id)`와 `combos(lesson)`으로 모형의 row를 얻어 Probe 출력과 조합마다 비교하고 `일치 n / n`을 출력합니다. 본보기: `verify/plain/cmp_eqhash.js`, `verify/plain/EqHashProbe.java`.
- **모형과 실제가 다르면 모형을 고칩니다.** Probe를 모형에 맞추지 않습니다. 고친 내용은 보고에 적습니다.
- 실행으로 확인할 수 없는 부분(실행할 때마다 달라지는 값, 이 PC에 없는 환경 등)이 있으면 assume에 그렇게 적고, 검증 수준을 `part`로 합니다. 확인하지 않은 것을 확인했다고 쓰지 않습니다.
- 버전에 따라 다른 동작은 JDK 21 기준으로 쓰고 assume에 버전을 밝힙니다.
- `src/verify_<id>.js`: `Lab.verify({ <id>: ['run', 'JDK 21에서 열두 가지 조합을 실행해 대조'] });` 수준은 `run`(모든 조합을 실행으로 대조), `part`(일부만), `doc`(문서만), `model`(개념 모형).

## 6. 설명 용어 (kb)와 문제

- `terms`에는 이 실습과 직접 관련된 용어 3~5개를 적습니다. `node tools/kb_names.js <검색어>`로 이미 있는 이름을 찾아 그대로 쓰고, 없을 때만 `kb/kb_<id>.js`에 추가합니다.
- `kb/kb_<id>.js`: `module.exports = [ ['분류', '용어 이름', '설명'], ... ];` 분류는 기존 분류 이름을 씁니다(`node tools/kb_names.js`를 검색어 없이 실행하면 나옵니다). 설명은 3~5문장, "~이다" 문체, 그 용어를 처음 보는 사람이 이해할 수 있게 정의 → 동작 → 주의점 순으로 씁니다. 사실만 쓰고, 확실하지 않은 수치는 넣지 않습니다.
- `src/quiz_<id>.js`: `Lab.quiz([{ lv, id, q, a: [정답, 오답, 오답, 오답], why, sim? }])`. `lv`는 1(초급: 핵심 사실), 2(중급: 왜 그런가), 3(응용: 상황을 주고 결과를 묻기)이고 단계마다 하나 이상, 모두 3개 이상. `a`의 첫 번째가 정답이며 보기 4개는 서로 달라야 하고 길이가 비슷해야 합니다(정답만 길면 안 됩니다). 오답은 실제로 사람들이 하는 오해로 만듭니다. `why`는 왜 그것이 답인지 2~3문장.
- 문제 가운데 하나 이상에 `sim: { c: { 설정 }, col: 열 번호, has: '그 열에 들어 있어야 하는 글' }`를 붙여, 정답이 실습 모형의 결과와 맞는지 도구가 확인하게 합니다.

## 7. 글 규칙

- 한국어 "합니다"체. 반말과 유행어를 쓰지 않습니다. 이모지를 쓰지 않습니다.
- "면접"이라는 말을 쓰지 않습니다(학습 사이트입니다).
- `을(를)`, `은(는)`, `이(가)`, `(으)로`처럼 조사를 겹쳐 적지 않습니다. 설정에서 온 값 뒤에 조사가 바로 붙어 어색해질 수 있으면 `값 3은` 대신 `3개가`, `id 2인 객체는`처럼 낱말을 끼워 씁니다.
- 단계 문장(events의 s)은 "무슨 코드가 실행됐는지: 무슨 일이 일어났는지. 왜 그런지." 순서로, 한 단계에 한 가지 일만 적습니다.
- 코드는 실제로 컴파일되는 모양으로 씁니다(화면의 코드와 Probe의 코드가 같은 구조여야 합니다).

## 8. 검사와 보고

```bash
node tools/check_lesson.js <id>
```

- "검사 통과"가 나와야 합니다. "주의"는 고치거나, 고치지 않는 이유를 보고에 적습니다.
- 대조 스크립트의 `일치 n / n`도 확인합니다.
- 끝나면 실습마다 다음을 보고합니다: id, 맡은 목차 항목 이름, 만든 파일, 설정 조합 수와 대조 결과(일치 n / n), 검증 수준, 실행으로 확인하지 못한 것, 모형을 실제에 맞게 고친 일, 남은 걱정거리.

## 9. 스프링, JPA, MySQL, 네트워크 실습의 대조 환경

새로 내려받는 것은 없습니다. **이 PC에 이미 있는 것만** 씁니다. 필요한 라이브러리가 없으면 내려받지 말고, 그 부분은 실행으로 확인하지 못했다고 assume과 보고에 적고 검증 수준을 `part`나 `doc`으로 합니다.

### 스프링과 JPA

- 라이브러리(읽기만 합니다): `E:/dev/java-interview-lab/verify/spring/libs/*`. 스프링 부트 4.1.1, 스프링 프레임워크 7.0.9, 스프링 시큐리티 7.1.1(web, config), 스프링 데이터 JPA 4.1.1, Hibernate 7.4.5, HikariCP, H2, MySQL 드라이버, Jackson 3, 내장 톰캣 11, AspectJ weaver, Resilience4j 2.4.0, kafka-clients. **없는 것**: Bean Validation(hibernate-validator), 액추에이터, JUnit과 spring-test, Querydsl, 스프링 클라우드.
- Probe는 `verify/spring/src/<Name>Probe.java`, 출력은 `verify/spring/<name>_probe.out.txt`, 대조 스크립트는 `verify/spring/cmp_<id>.js`(`require('../model_rows.js')`)에 둡니다. 컴파일 결과는 `verify/out/<id>/`.
- 컴파일과 실행(Git Bash): `"$J/javac" -encoding UTF-8 -parameters -cp "E:/dev/java-interview-lab/verify/spring/libs/*" -d verify/out/<id> verify/spring/src/<Name>Probe.java` 그리고 `"$J/java" -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -cp "E:/dev/java-interview-lab/verify/spring/libs/*;verify/out/<id>" <Name>Probe verify/spring/<name>_probe.out.txt`. 출력은 표준 출력의 로그와 섞이지 않게 **파일로 직접 쓰는 것**이 안전합니다(본보기들이 그렇게 합니다).
- 본보기(읽어 보세요): `verify/spring/src/TxProbe.java`(스프링 컨텍스트만), `NPlusOneProbe.java`와 `PcProbe.java`(Hibernate + H2, 나간 SQL을 StatementInspector로 잡음), `MvcProbe.java`와 `SecurityProbe.java`(스프링 부트 서버를 띄우고 HTTP 요청), `DiProbe.java`(SpringApplication으로 기동 성공/실패), `ConfigProbe.java`(조합마다 자바 프로세스를 새로 띄움), 대조 스크립트 `cmp_tx.js`, `cmp_nplus1.js`.
- 이미 겪은 함정:
  - Probe는 기본 패키지에 두므로 `@SpringBootApplication`을 쓰면 클래스패스 전체를 스캔해 실패합니다. `@SpringBootConfiguration` + `@EnableAutoConfiguration`을 쓰고 컴포넌트 스캔은 하지 않습니다.
  - 설정 클래스 **안에** 둔 `@Component`/`@RestController`/`@ControllerAdvice` 클래스는 자동으로 빈이 됩니다(@Bean으로 또 등록하면 중복). 켜고 끌 빈은 설정 클래스 밖의 최상위 클래스로 두고 `@ConditionalOnProperty`가 붙은 @Bean으로 등록합니다.
  - 서버는 `--server.port=0`으로 띄우고 `ctx.getEnvironment().getProperty("local.server.port")`로 포트를 읽습니다. 로그는 `--logging.level.root=OFF`.
  - 클래스패스에 스프링 시큐리티가 있어 웹 서버를 띄우면 모든 요청이 막힙니다. 시큐리티가 주제가 아니면 `SecurityFilterChain` 빈으로 모두 허용하세요(`MvcProbe.java` 참고).
  - 오류 응답은 `/error`로 한 번 더 넘어갑니다(필터, 인터셉터, DispatcherServlet이 두 번 돕니다). 횟수를 셀 때는 `request.getDispatcherType() == DispatcherType.REQUEST`인 것만 셉니다.
  - Hibernate 엔티티를 Probe의 중첩 클래스로 만들 때는 `@Entity(name = "...")`로 이름을 명시합니다. H2 DB 이름은 실습 id를 넣어 겹치지 않게 합니다(`jdbc:h2:mem:<id>...`).
  - Hibernate가 내보내는 SQL의 수와 모양은 버전에 따라 다릅니다. 화면에는 "Hibernate 7.4.5 기준"임을 assume에 밝히고, SQL 문장을 글자 그대로 단정하지 말고 "몇 번, 어느 테이블"을 결과로 삼으세요.

### MySQL

- 시험용 컨테이너 `lab-mysql`(MySQL 8.4)이 `127.0.0.1:3307`에 떠 있습니다. 계정은 기존 Probe(`verify/spring/src/IsoProbe.java`)에 있는 시험용 값을 그대로 씁니다. **컨테이너를 멈추거나 다시 만들지 않습니다.** 다른 사람도 같이 쓰고 있으므로 실습마다 `lab_<id>`라는 데이터베이스를 따로 만들어 그 안에서만 작업합니다(`create database if not exists lab_<id>`).
- Probe는 자바(JDBC, 위의 libs에 드라이버가 있음)로 쓰거나, `docker exec lab-mysql mysql -uroot -p<시험용 값> lab_<id> -N -e "..."`를 Node에서 호출해도 됩니다. 두 세션이 필요한 실습은 자바에서 커넥션 두 개를 엽니다(`IsoProbe.java`, `GapProbe.java` 참고).
- 이미 겪은 함정:
  - 행을 지워도 한동안 "삭제 표시만 된 레코드"가 남아 락 목록에 섞입니다. 조합마다 테이블을 새로 만드세요.
  - `performance_schema.data_lock_waits`는 대기 "관계"의 수입니다. 기다리는 세션 수는 `count(distinct requesting_engine_transaction_id)`.
  - 행이 몇 개뿐인 테이블에서는 옵티마이저가 인덱스 전체를 훑는 계획을 고릅니다. 실행 계획이나 락 범위를 보이는 실습은 행을 충분히 넣고(`analyze table`) `EXPLAIN` 결과를 함께 기록하세요.
  - 실행 계획의 rows, cost 같은 추정값은 통계에 따라 달라집니다. 화면의 결과는 type, key, Extra처럼 안정적인 것으로 삼고, 수치는 "이 PC에서 본 값"이라고 밝히세요.

### 네트워크와 그 밖

- Node.js 24가 있습니다(`net`, `dgram`, `http`, `http2`, `dns`, `tls`, `zlib`, `crypto`). `curl`, `openssl`, `git`도 있습니다. 로컬 주소(127.0.0.1)에 시험 서버를 띄워 확인하고, 끝나면 반드시 닫습니다. 외부 사이트에 의존하는 대조는 피하세요(결과가 바뀝니다). DNS처럼 외부가 꼭 필요한 것은 "이 PC에서 본 예"로만 쓰고 결과 표의 값으로 단정하지 않습니다.
- Probe는 `verify/net/<id>_probe.js`, 출력은 `verify/net/<id>_probe.out.txt`, 대조는 `verify/net/cmp_<id>.js`(`require('../model_rows.js')`)에 둡니다. 보안 실습 가운데 스프링을 쓰는 것은 스프링 쪽 규칙을 따릅니다.
- 표준(RFC)이나 공식 문서가 근거인 내용은 문서 번호와 절을 assume에 적습니다. 실행으로 확인한 부분과 문서만 따른 부분을 구분해 적으세요.
