// "람다와 함수형 인터페이스" 실습(표준 메서드 중심으로 다시 짠 판, 2026-10-22)의 실제 실행.
// 1. 설정 조합마다 화면의 코드(실습의 code 함수)를 그대로 verify/out/lambda_std/<조합>/Main.java로 쓰고, JDK 21의 javac로 컴파일해 java로 실행한다.
// 2. 화면의 "람다를 받는 쪽" 표에 적은 표준 메서드의 매개변수 타입과 JDK 소스 줄을 LambdaStdFacts.java로 확인한다(# fact 줄).
// 결과: verify/plain/lambda_probe.out.txt  (옛 판의 결과 LambdaProbe.out.txt는 그대로 둔다)
// 대조: node verify/plain/cmp_lambda.js
// 사용: node verify/plain/lambda_probe.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const lesson = load('lambda');
const JDK = process.env.JDK_HOME || 'E:/dev/jdk-21.0.12.1+1';
const base = path.join(__dirname, '..', 'out', 'lambda_std');
const lines = ['# ' + cp.spawnSync(JDK + '/bin/java', ['-version'], { encoding: 'utf8' }).stderr.split(/\r?\n/)[0]];
for (const c of combos(lesson)) {
  const key = c.api + '-' + c.data, dir = path.join(base, key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Main.java'), lesson.code(c) + '\n', 'utf8');
  const jc = cp.spawnSync(JDK + '/bin/javac', ['-encoding', 'UTF-8', '-d', dir, path.join(dir, 'Main.java')], { encoding: 'utf8' });
  if (jc.status !== 0) { lines.push(key + ' => COMPILE_FAIL ' + (jc.stderr || '').replace(/\r?\n/g, ' ¶ ')); continue; }
  const r = cp.spawnSync(JDK + '/bin/java', ['-Dstdout.encoding=UTF-8', '-cp', dir, 'Main'], { encoding: 'utf8' });
  if (r.status !== 0) { lines.push(key + ' => RUN_FAIL ' + (r.stderr || '').replace(/\r?\n/g, ' ¶ ')); continue; }
  lines.push(key + ' => ' + r.stdout.split(/\r?\n/).filter(l => l !== '').join(' / '));
}
// 표에 적은 사실: 매개변수 타입(리플렉션)과 JDK 소스의 줄
const facts = [];
for (const api of Object.keys(lesson.STD)) for (const r of lesson.STD[api]) {
  const [cls, m] = r[0].split('.');
  const file = 'java.base/java/util/' + (cls === 'Stream' ? 'stream/' : '') + cls + '.java';
  facts.push(['param', cls, m, r[1]].join('\t'));
  // 부르는 곳 칸에서 괄호 설명을 뺀 코드 부분. 설명만 적은 칸(스트림)은 건너뛴다
  const codePart = r[3].replace(/\s+\(.*\)$/, '');
  if (/[;)]$/.test(codePart) && !/[가-힣]/.test(codePart)) facts.push(['src', file, codePart].join('\t'));
}
const ff = path.join(base, 'facts.tsv');
fs.writeFileSync(ff, facts.join('\n') + '\n', 'utf8');
const fr = cp.spawnSync(JDK + '/bin/java', ['-Dstdout.encoding=UTF-8', path.join(__dirname, 'LambdaStdFacts.java'), ff, JDK + '/lib/src.zip'], { encoding: 'utf8' });
if (fr.status !== 0) lines.push('# fact RUN_FAIL ' + fr.stderr.replace(/\r?\n/g, ' ¶ '));
lines.push(...fr.stdout.split(/\r?\n/).filter(Boolean));
fs.writeFileSync(path.join(__dirname, 'lambda_probe.out.txt'), lines.join('\n') + '\n', 'utf8');
console.log(lines.join('\n'));
