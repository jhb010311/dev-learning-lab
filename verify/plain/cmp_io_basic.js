// 기초개념 "파일 입출력" 실습의 모형 결과를 실제 컴파일·실행 결과(IoBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열(저장된 바이트 = 프로세스가 끝난 뒤 memo.txt를 직접 읽은 값, 읽은 글자 = 프로그램이 출력한 글자의 코드 포인트에서 계산, 예외 = 표준 오류와 종료 코드),
//       모형이 말하는 바이트 값·읽은 글자의 코드 포인트·예외가 난 줄이 실제와 같은지, 출력한 바이트 수가 파일 크기와 같은지,
//       실행 뒤 폴더에 memo.txt가 있고 none.txt가 없는지, 실행 전에 memo.txt가 없었는지,
//       화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/io_basic/<조합>/Main.java, 맨 위의 import 네 줄과 빈 줄만 뺌)와 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄: 글자별 UTF-8 바이트, ISO_8859_1이 256가지 바이트를 하나씩 글자로 바꾸는 것)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('io_basic');
const lines = fs.readFileSync(path.join(__dirname, 'IoBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const IMPORTS = 'import java.io.IOException;\nimport java.nio.charset.StandardCharsets;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\n';
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [text, read] = k.split('|'), f = v.split('|');
  const [res, exit, size, memoHex, printed, cps, errFirst, errLine, files, before] = f;
  const c = { text, read }, probs = [];
  if (res !== 'OK') { console.log('다름: ' + k + ' 컴파일 실패 ' + v); continue; }
  const dir = path.join(__dirname, '..', 'out', 'io_basic', text + '-' + read);
  const raw = fs.readFileSync(path.join(dir, 'Main.java'), 'utf8').replace(/\r\n/g, '\n');
  if (!raw.startsWith(IMPORTS)) probs.push('import 네 줄이 예상과 다름');
  if (raw.slice(IMPORTS.length).trimEnd() !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  // 실제 memo.txt를 Node가 다시 읽어 Probe가 적은 바이트와 같은지 한 번 더 본다
  const mb = fs.readFileSync(path.join(dir, 'memo.txt'));
  const nodeHex = [...mb].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  if (nodeHex !== memoHex || mb.length !== +size) probs.push('memo.txt를 다시 읽은 값이 Probe 출력과 다름: ' + nodeHex);
  // 원래 쓴 글자는 소스의 쓰기 줄에서 읽는다
  const orig = /writeString\(Path\.of\("memo\.txt"\), "([^"]*)"/.exec(raw)[1];
  const origCps = [...orig].map(ch => ch.codePointAt(0).toString(16).toUpperCase());
  // 실제 결과 표
  const real = ['' + size + '바이트: ' + memoHex, null, null];
  if (+exit === 0) {
    const got = cps === '-' ? [] : cps.split(' ');
    if (JSON.stringify(got) === JSON.stringify(origCps)) real[1] = orig;
    else real[1] = '글자 ' + got.length + '자 중 깨진 글자 ' + got.filter(x => parseInt(x, 16) >= 0x80).length + '자';
    real[2] = errFirst === '-' ? '없음' : '(모르는 오류 ' + errFirst + ')';
  } else {
    real[1] = '읽지 못함';
    real[2] = /NoSuchFileException: none\.txt$/.test(errFirst) ? 'NoSuchFileException' : '(모르는 오류 ' + errFirst + ')';
  }
  const sim = lesson.simulate(Object.assign({}, c));
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 모형이 말하는 바이트 값, 읽은 글자의 코드 포인트, 깨진 글자 수
  if (sim.hexAll.join(' ') !== memoHex || sim.nbytes !== +size) probs.push('모형의 바이트 ' + sim.hexAll.join(' ') + ' / 실제 ' + memoHex);
  if (+exit === 0) {
    if (sim.cps.join(' ') !== cps) probs.push('읽은 글자의 코드 포인트 모형 ' + sim.cps.join(' ') + ' / 실제 ' + cps);
    if (+printed !== +size) probs.push('출력한 바이트 수 ' + printed + ' / 파일 크기 ' + size);
    const realBroken = JSON.stringify(cps.split(' ')) === JSON.stringify(origCps) ? 0 : cps.split(' ').filter(x => parseInt(x, 16) >= 0x80).length;
    if (sim.broken !== realBroken) probs.push('깨진 글자 수 모형 ' + sim.broken + ' / 실제 ' + realBroken);
    if (errFirst !== '-' || errLine !== '-') probs.push('성공인데 표준 오류가 있음');
  } else {
    if (+exit !== 1) probs.push('종료 코드 ' + exit + ' (단계 문장은 1)');
    if (printed !== '-' || cps !== '-') probs.push('예외인데 출력이 있음: ' + printed + ' ' + cps);
    const srcLine = raw.split('\n')[+errLine - 1].trim();
    if (srcLine !== sim.exAt) probs.push('예외가 난 줄 모형 ' + sim.exAt + ' / 실제 ' + errLine + '번째 줄 ' + srcLine);
  }
  const fl = files.split(',');
  if (!fl.includes('memo.txt') || fl.includes('none.txt')) probs.push('실행 뒤 폴더의 파일: ' + files);
  if (before !== 'false') probs.push('실행 전에 memo.txt가 있었음');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 단계 문장이 기대는 사실
const f1 = lines.find(l => l.startsWith('FACT utf8len =>')), want = Object.keys(lesson.HEX).map(ch => ch + '=' + lesson.HEX[ch].length + '(' + lesson.HEX[ch].join(' ') + ')');
total++;
if (f1 && want.every(w => f1.includes(w))) ok++; else console.log('다름: FACT utf8len ' + f1 + ' / 모형 ' + want.join(' '));
const f2 = lines.find(l => l.startsWith('FACT iso256 =>'));
total++;
if (f2 && f2.endsWith('true')) ok++; else console.log('다름: FACT iso256 ' + f2);
console.log('일치 ' + ok + ' / ' + total);  // 조합 9개 + 사실 2개
