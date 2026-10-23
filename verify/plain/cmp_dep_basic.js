// 기초개념 "라이브러리와 의존성" 실습의 모형 결과를 실제 javac와 java 실행 결과(dep_basic_probe.out.txt)와 대조한다(2026-10-22, 잭슨 jar로 다시 짠 판)
// 대조: 결과 표 세 열, 오류 개수와 진단 코드, 오류가 난 줄, App.class 생성 여부, java 명령의 종료 코드와 출력, 실행 오류의 대상 클래스와 위치,
//       화면의 코드(code 함수)가 Probe가 실제 파일과 실제 명령으로 만든 글(verify/out/dep_basic_v2/<조합>/screen.txt)과 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄)과 컴파일 전 폴더의 파일 목록
// 실행(저장소 루트에서): node verify/plain/cmp_dep_basic.js
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('dep_basic');
const M = lesson.msgs;
const lines = fs.readFileSync(path.join(__dirname, 'dep_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const KO = { 'compiler.err.doesnt.exist': M.pkg, 'compiler.err.cant.resolve.location': M.sym, 'compiler.err.cant.access': M.access };
// 같은 오류가 이어서 여러 번 나오면 "(n곳)"으로 묶는다
function errText(codes) {
  const out = [];
  codes.forEach(x => { const t = KO[x] || '(모르는 코드 ' + x + ')'; if (out.length && out[out.length - 1][0] === t) out[out.length - 1][1]++; else out.push([t, 1]); });
  return out.map(([t, n]) => t + (n > 1 ? '(' + n + '곳)' : '')).join(', ');
}
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [cc, rc] = k.split('|'), f = v.split('|');
  const [res, n, codesS, where, exists, jexit, jout, jerr, appLine, msgs, before] = f;
  const c = { compileCp: cc, runCp: rc };
  const row = lesson.simulate(Object.assign({}, c)).row, probs = [];
  const codes = codesS === '' ? [] : codesS.split(',');
  let real;
  if (res === 'OK') {
    let err = '(모르는 오류 ' + jerr + ')';
    const m = /java\.lang\.NoClassDefFoundError: (\S+)$/.exec(jerr);
    if (jexit === '0') err = '없음'; else if (m) err = 'NoClassDefFoundError(' + m[1] + ')';
    real = ['성공', jexit === '0' ? jout + ' 출력' : (jout === '-' ? '실패: 아무것도 출력되지 않음' : '(실패했는데 출력 ' + jout + ')'), err];
    if (jexit === '0' && jout !== '{"name":"kim"}') probs.push('출력이 {"name":"kim"}이 아님: ' + jout);
    if (jexit !== '0' && appLine !== 'at App.main(App.java:6)') probs.push('오류 위치가 App.java:6이 아님: ' + appLine);
  } else {
    real = ['오류 ' + n + '개', jexit !== '0' && exists === 'false' && /기본 클래스 App/.test(jerr) ? '실행할 수 없음(App.class가 없음)' : '(java가 다르게 실패 ' + jerr + ')', errText(codes)];
    const at = where.split(' ## ').map(x => x.split(':')[0]);
    if (cc === 'none' && JSON.stringify(at) !== JSON.stringify(['2', '6', '6'])) probs.push('오류가 난 줄 ' + where);
    if (cc === 'nocore') {
      if (JSON.stringify(at) !== JSON.stringify(['7'])) probs.push('오류가 난 줄 ' + where);
      if (!/cannot access TreeCodec ## class file for tools\.jackson\.core\.TreeCodec not found/.test(msgs)) probs.push('javac 메시지 ' + msgs);
    }
    if (cc === 'none' && !/package tools\.jackson\.databind does not exist/.test(msgs)) probs.push('javac 메시지 ' + msgs);
  }
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if ((exists === 'true') !== (res === 'OK')) probs.push('App.class 생성 여부가 컴파일 결과와 다름: ' + exists);
  if (before !== 'App.java / jackson-annotations-2.21.jar / jackson-core-3.1.5.jar / jackson-databind-3.1.5.jar') probs.push('컴파일 전 폴더의 파일: ' + before);
  const screen = fs.readFileSync(path.join(__dirname, '..', 'out', 'dep_basic_v2', cc + '-' + rc, 'screen.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (screen !== lesson.code(c)) probs.push('화면의 코드와 Probe가 만든 글이 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 단계 문장이 기대는 사실
function fact(name, want) {
  const l = lines.find(x => x.startsWith('FACT ' + name + ' => ')); total++;
  const got = l ? l.slice(('FACT ' + name + ' => ').length) : null;
  if (got === want) ok++; else console.log('다름: FACT ' + name + ' 실제 ' + got + ' / 기대 ' + want);
}
fact('databind_has_ObjectMapper', 'true');      // jackson-databind jar가 ObjectMapper.class를 가진다
fact('core_has_TreeCodec', 'true');             // jackson-core jar가 TreeCodec.class를 가진다
fact('annotations_has_JsonSerializeAs', 'true'); // jackson-annotations jar가 애너테이션 클래스를 가진다
fact('ObjectMapper_decl', 'public class tools.jackson.databind.ObjectMapper implements tools.jackson.core.TreeCodec<tools.jackson.databind.JsonNode>, tools.jackson.core.Versioned, java.io.Serializable {'); // 선언에 TreeCodec이 적혀 있다
fact('databind_coordinate', 'tools.jackson.core:jackson-databind:3.1.5');  // build.gradle의 좌표
fact('databind_pom_deps', 'com.fasterxml.jackson.core:jackson-annotations / tools.jackson.core:jackson-core'); // pom.xml에 적힌 의존성
fact('classes', 'App.class');                   // 컴파일에 성공한 폴더의 클래스 파일은 App.class 하나뿐
fact('nodot', '1|오류: 기본 클래스 App을(를) 찾거나 로드할 수 없습니다.'); // jar만 적고 .을 빼면 App을 찾지 못한다
fact('noann', '1|Exception in thread "main" java.lang.NoClassDefFoundError: com/fasterxml/jackson/annotation/JsonSerializeAs|at App.main(App.java:6)'); // 애너테이션 클래스도 실행할 때 필요
fact('greet', '0000|META-INF/ / META-INF/MANIFEST.MF / lib/ / lib/Greeter.class|hello, kim'); // 직접 만든 jar도 같은 방법으로 쓴다(요약 끝 문장)
// 화면 문장의 낱말과 모형 값이 Probe와 맞는지(단계 문장에 직접 적은 것)
const all = lesson.simulate({ compileCp: 'all', runCp: 'all' });
const text = all.events.map(e => e.s).join(' ') + all.summary.join(' ');
total++;
if (/App\.java:6/.test(lesson.simulate({ compileCp: 'all', runCp: 'none' }).events.map(e => e.s).join(' ')) && /tools\.jackson\.core:jackson-databind:3\.1\.5/.test(text)) ok++; else console.log('다름: 단계 문장의 위치나 좌표');
console.log('일치 ' + ok + ' / ' + total);  // 조합 9개 + 사실 10개 + 문장 1개
