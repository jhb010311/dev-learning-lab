// "열거형(enum)" 실습의 모형 결과를 실제 Hibernate + H2 실행 결과(enumtype_probe.out.txt)와 대조한다.
// 조합마다: 결과 표의 네 칸, status 컬럼 정의(DDL), 화면의 코드가 실제로 컴파일한 코드와 같은지,
//          Hibernate가 읽은 결과가 순수 자바(values()[번호], valueOf(이름), fromCode)로 바꾼 결과와 같은지 본다.
// 실행 결과 만들기: verify/spring/src/EnumTypeProbe.java 머리 주석 참고. 예전 결과(순수 자바로 흉내 낸 것)는 verify/plain/EnumTypeProbe.out.txt.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('enumtype');
const text = fs.readFileSync(path.join(__dirname, 'enumtype_probe.out.txt'), 'utf8').split(/\r?\n/);
const real = {}, src = {};
const parse = v => Object.fromEntries(v.split('|').map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
for (const ln of text) {
  if (ln.startsWith('# src ')) { const i = ln.indexOf(' :: '); src[ln.slice(6, i)] = ln.slice(i + 4).split('\\n').join('\n'); }
  else if (!ln.startsWith('#') && ln.includes(' => ')) { const i = ln.indexOf(' => '); real[ln.slice(0, i)] = ln.slice(i + 4); }
}
let ok = 0, codeOk = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.store + '|' + c.change + '|' + c.saved, raw = real[key]; n++;
  if (!raw) { console.log('실제 결과 없음: ' + key); continue; }
  const r = parse(raw), lines = r.out === '-' ? [] : r.out.split(' / '), diff = [];
  const firstErr = r.err === '-' ? '' : r.err.split(' <- ')[0];
  const want = [c.store === 'ORDINAL' ? r.db : "'" + r.db + "'",
    lines.length ? lines[0] : '(읽지 못함)', lines.length ? lines[1] : '(읽지 못함)',
    firstErr ? '예외로 중단: ' + firstErr : '정상 종료'];
  const row = lesson.simulate(Object.assign({}, c)).row;
  if (JSON.stringify(row) !== JSON.stringify(want)) diff.push('결과 표 모형 ' + row.join(' | ') + ' / 실제 ' + want.join(' | '));
  if (lines.length !== (firstErr ? 0 : 2)) diff.push('출력 줄 수가 이상함: ' + r.out);
  if (lesson.DDL[c.store] !== r.ddl) diff.push('컬럼 정의 모형 ' + lesson.DDL[c.store] + ' / 실제 ' + r.ddl);
  // Hibernate가 읽은 것과 순수 자바로 바꾼 것이 같은가 (글에서 "values()[번호]와 같은 결과" 등으로 말함)
  const javaSame = firstErr ? r.java === '!' + r.err : r.java === lines[0];
  if (!javaSame) diff.push('순수 자바 결과와 다름: Hibernate ' + (firstErr || lines[0]) + ' / 자바 ' + r.java);
  if (diff.length) console.log('다름: ' + key + '\n  ' + diff.join('\n  ')); else ok++;
  if (lesson.code(c) === src[key]) codeOk++; else console.log('코드 다름: ' + key);
}
// 설정에는 없지만 글에서 말한 사실
const yes = (label, good) => console.log(label + ': ' + (good ? '예 (글과 같음)' : '아니오 (글과 다름)'));
const x = k => real['extra|' + k] || '';
yes('예외 메시지가 RENAME_ERR와 같은가', parse(real['STRING|rename|PAID']).err === lesson.RENAME_ERR);
yes('@Enumerated를 붙이지 않으면 ORDINAL과 같은 컬럼에 숫자가 저장되는가', x('no-enumerated') === 'ddl=' + lesson.DDL.ORDINAL + '|db=1');
yes('ORDINAL로 저장한 상수를 지우면 em.find가 ArrayIndexOutOfBoundsException을 던지는가', parse(x('removed-ordinal')).err.startsWith('java.lang.ArrayIndexOutOfBoundsException'));
yes('변환기가 모르는 코드를 받으면 PersistenceException(원인 IllegalArgumentException)인가', /^!jakarta\.persistence\.PersistenceException: .* <- java\.lang\.IllegalArgumentException: 없는 코드: X$/.test(x('converter-unknown-code')));
yes('Hibernate가 만든 테이블에 ORDINAL로 SHIPPED(번호 3)를 저장하면 실패하는가', x('save-after-insert|ORDINAL|SHIPPED').startsWith('!org.hibernate.exception.ConstraintViolationException'));
yes('Hibernate가 만든 테이블에 STRING으로 CANCELED를 저장하면 실패하는가', x('save-after-insert|STRING|CANCELED').startsWith('!org.hibernate.exception.DataException'));
yes('같은 상수는 어떻게 얻어도 같은 객체인가', x('same-object') === 'true');
yes('valueOf는 대소문자가 다른 이름에 IllegalArgumentException을 던지는가', x('valueOf-lowercase').startsWith('!java.lang.IllegalArgumentException'));
console.log(text[0]);
console.log('코드 일치 ' + codeOk + ' / ' + n);
console.log('일치 ' + ok + ' / ' + n);
