// "동적 쿼리: Specification과 Querydsl" 실습의 모형 결과를 실제 실행 결과(dynquery_probe_std.out.txt)와 대조한다.
// 방식 네 가지(Specification, Criteria API, Querydsl, 문자열 직접 잇기) × 이름 칸 세 가지 × 나이 칸 두 가지 = 스물네 조합을 모두 대조한다.
// 옛 결과(dynquery_probe.out.txt, 문자열 방식 세 가지 + Criteria)는 지난 판의 실습을 대조하던 것이라 여기서는 읽지 않는다.
// 프로브 실행(Git Bash, 저장소 위치에서): 컴파일할 때 querydsl-apt로 QMember를 만든다.
//   X=E:/dev/java-interview-lab/verify/spring/libs-extra
//   javac -encoding UTF-8 -parameters -cp "E:/dev/java-interview-lab/verify/spring/libs/*;$X/querydsl-core-5.1.0.jar;$X/querydsl-jpa-5.1.0-jakarta.jar;$X/querydsl-apt-5.1.0-jakarta.jar;$X/querydsl-codegen-5.1.0.jar;$X/codegen-utils-5.1.0.jar;$X/mysema-commons-lang-0.2.4.jar;$X/javax.inject-1.jar;$X/classgraph-4.8.146.jar;$X/ecj-3.26.0.jar" -processor com.querydsl.apt.jpa.JPAAnnotationProcessor -s <임시>/gen -d <임시>/out verify/spring/src/DynQueryProbe.java
//   java -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -cp "E:/dev/java-interview-lab/verify/spring/libs/*;$X/querydsl-core-5.1.0.jar;$X/querydsl-jpa-5.1.0-jakarta.jar;$X/mysema-commons-lang-0.2.4.jar;<임시>/out" dynquery.DynQueryProbe verify/spring/dynquery_probe_std.out.txt
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('dynquery');
const lines = fs.readFileSync(path.join(__dirname, 'dynquery_probe_std.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {}, extra = [];
for (const ln of lines.slice(1)) {
  const at = ln.indexOf(' => '), k = ln.slice(0, at), v = ln.slice(at + 4);
  if (k.startsWith('extra|')) { extra.push(ln); continue; }
  // 앞쪽: jpql=…|nconds=…|nsql=…|sql=… [값]|result=OK|rows=n  또는  result=ERR|ex=…|cause=…|msg=…
  const ri = v.indexOf('|result='), head = v.slice(0, ri), res = v.slice(ri + 8), f = {};
  const si = head.indexOf('|sql='); f.sqlp = head.slice(si + 5);
  head.slice(0, si).split('|').forEach(x => { const i = x.indexOf('='); f[x.slice(0, i)] = x.slice(i + 1); });
  if (res.startsWith('OK')) { f.ok = true; f.rows = res.split('rows=')[1]; }
  else { f.ok = false; const mi = res.indexOf('|msg='); f.msg = res.slice(mi + 5); res.slice(0, mi).split('|').slice(1).forEach(x => { const i = x.indexOf('='); f[x.slice(0, i)] = x.slice(i + 1); }); }
  real[k] = f;
}
// 실제 SQL에서 where 부분만 모형의 표기로 줄인다(테이블 별칭을 걷어 내고 비교 기호 앞뒤에 빈칸)
function whereOf(sql) {
  const s = sql.replace(/\b\w+_\d+\./g, ''), i = s.indexOf(' where ');
  return i < 0 ? 'where 없음' : s.slice(i + 1).replace(/\s*(>=|<=|=|>|<)\s*/g, ' $1 ').trim();
}
function expected(c, f) {
  if (!f.ok) {
    const m = /At (\d+:\d+) and token '([^']*)'/.exec(f.msg);
    return [f.jpql, '실패: ' + f.cause.split('.').pop() + ' (위치 ' + m[1] + ', 낱말 ' + m[2] + ')', +f.nsql === 0 ? 'SQL이 나가지 않음' : 'SQL이 나감', '없음', '없음'];
  }
  // "select … where … [값, 값]" → SQL과 바인딩된 값
  const b = f.sqlp.lastIndexOf(' ['), sql = f.sqlp.slice(0, b), vals = f.sqlp.slice(b + 2, -1);
  const nb = vals === '' ? 0 : vals.split(', ').length;
  const made = c.how === 'spec' ? 'Specification: 남은 조건 ' + nb + '개' : c.how === 'criteria' ? 'Predicate ' + f.nconds + '개 (문자열 없음)' : c.how === 'querydsl' ? 'null이 아닌 조건 ' + nb + '개' : f.jpql;
  return [made, '성공', whereOf(sql), vals === '' ? '없음' : vals, f.rows + '명'];
}
let ok = 0, n = 0; const bad = [];
for (const c of combos(lesson)) {
  const sim = lesson.simulate(Object.assign({}, c));
  const key = c.how + '|' + c.name + '|' + c.age, f = real[key];
  n++;
  if (!f) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const exp = expected(c, f), exEx = f.ok ? '' : f.ex;
  if (+f.nsql !== (f.ok ? 1 : 0)) bad.push(key + '  나간 SQL 수가 ' + f.nsql + '개');
  if (JSON.stringify(sim.row) === JSON.stringify(exp) && sim.ex === exEx) ok++;
  else bad.push(key + '\n    모형 ' + sim.row.join(' / ') + ' ' + sim.ex + '\n    실제 ' + exp.join(' / ') + ' ' + exEx);
}
// 같은 조건이면 Specification, Criteria API, Querydsl의 SQL과 바인딩된 값이 글자까지 같은지
let same = 0, sn = 0;
for (const nm of ['none', 'kim', 'quote']) for (const age of [false, true]) {
  sn++; const k = '|' + nm + '|' + age, a = real['spec' + k], b = real['criteria' + k], q = real['querydsl' + k];
  if (a && b && q && a.sqlp === b.sqlp && b.sqlp === q.sqlp && a.rows === b.rows && b.rows === q.rows) same++; else bad.push('세 방식의 SQL이 다름' + k);
}
console.log('일치 ' + ok + ' / ' + n);
console.log('Specification·Criteria API·Querydsl의 SQL과 바인딩 값이 같은 조건 ' + same + ' / ' + sn);
bad.forEach(b => console.log('다름: ' + b));
extra.forEach(e => console.log('덧붙임 확인: ' + e));
