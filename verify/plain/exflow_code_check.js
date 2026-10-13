// "예외 흐름" 실습이 화면에 보여 주는 코드를 32가지 조합 모두 실제로 컴파일하고 실행해, 실습 모형(trace)의 출력 순서·결과와 대조한다.
// 화면의 코드에 더하는 것: fail 필드(true), print, Resource. 그 밖에는 한 글자도 바꾸지 않는다.
// 실행: JAVA_HOME=<JDK 21 폴더> node verify/plain/exflow_code_check.js <빈 임시 폴더>
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const out = process.argv[2], bin = path.join(process.env.JAVA_HOME || '', 'bin');
if (!out) { console.log('임시 폴더를 넘겨 주세요.'); process.exit(1); }
const { loadLessons } = require('../../build.js'); const l = loadLessons().list.find(x => x.id === 'exflow');
const NAME = { open: 'open', 'try-start': 'try 시작', 'try-end': 'try 끝', close: 'close', catch: 'catch', finally: 'finally', after: '블록 다음' };
const combos = []; ['none', 'match', 'nomatch', 'incatch'].forEach(ex => [false, true].forEach(ret => [false, true].forEach(fret => [false, true].forEach(res => combos.push({ ex, ret, fret, res })))));
combos.forEach((c, i) => fs.writeFileSync(path.join(out, 'T' + i + '.java'), 'public class T' + i + ' {\n static boolean fail = true;\n static void print(String s) { System.out.println(s); }\n static class Resource implements AutoCloseable { Resource() { print("open"); } public void close() { print("close"); } }\n static ' + l.code(c).replace(/\n/g, '\n ') + '\n public static void main(String[] a) { try { System.out.println("=> return " + run()); } catch (RuntimeException e) { System.out.println("=> throw " + e.getClass().getSimpleName()); } }\n}\n'));
execFileSync(path.join(bin, 'javac'), ['-encoding', 'UTF-8', '-d', path.join(out, 'classes')].concat(combos.map((c, i) => path.join(out, 'T' + i + '.java'))), { stdio: 'inherit' });
let bad = 0;
combos.forEach((c, i) => {
  const got = execFileSync(path.join(bin, 'java'), ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', path.join(out, 'classes'), 'T' + i]).toString('utf8').replace(/\r/g, '').trim().split('\n').join('|');
  const tr = l.trace(c), want = tr.log.map(k => NAME[k]).concat(['=> ' + tr.out]).join('|');
  if (got !== want) { bad++; console.log('다름 ' + JSON.stringify(c) + '\n  실행: ' + got + '\n  모형: ' + want); }
});
console.log('조합 ' + combos.length + '개 가운데 불일치 ' + bad + '개');
process.exit(bad ? 1 : 0);
