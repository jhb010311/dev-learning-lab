// 기초개념 "스트림" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(StreamBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열(result, 원래 리스트 nums, 코드에 적은 단계), 컴파일 성공 여부,
//       화면의 코드(code 함수)가 Probe가 실행한 소스(verify/out/stream_basic/<조합>/Main.java)에서 import, class, main 줄을 뺀 글과 같은지,
//       단계 문장이 기대는 사실(FACT trace: 값 하나가 filter와 map을 모두 지난 뒤 다음 값으로 넘어가고, 버려진 값에는 map이 불리지 않는다 /
//       FACT identity: 거르기도 바꾸기도 없는 스트림의 result는 nums와 같은 값이지만 같은 객체가 아니다)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('stream_basic');
// 화면 코드 맨 위의 줄임 표시 머리 줄("// main 메서드 안의 줄만 보임 …")은 Probe 소스에 없으므로 빼고 비교한다
const shownBody = c => lesson.code(c).replace(/^\/\/ main 메서드 안의 줄만 보임[^\n]*\n/, '');
const lines = fs.readFileSync(path.join(__dirname, 'StreamBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
const trace = {};
for (const ln of lines.slice(1)) if (ln.startsWith('FACT trace ')) { const [k, v] = ln.slice('FACT trace '.length).split(' => '); trace[k] = v; }
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [style, filter, map] = k.split('|'), f = v.split('|');
  const c = { style, filter: filter === 'true', map: map === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const probs = [];
  const real = [f[1], f[2], f[3].split('>').join(' → ')];
  if (f[0] !== 'OK') probs.push('컴파일 실패 ' + f[0]);
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면의 코드 == Probe가 컴파일한 소스에서 둘러싼 줄을 뺀 것
  const dir = path.join(__dirname, '..', 'out', 'stream_basic', [style, filter, map].join('-'));
  const src = fs.readFileSync(path.join(dir, 'Main.java'), 'utf8').replace(/\r\n/g, '\n');
  const m = src.match(/^import java\.util\.\*;\n\npublic class Main \{\n    public static void main\(String\[\] args\) \{\n([\s\S]*)    \}\n\}\n$/);
  if (!m) probs.push('Main.java가 예상한 틀이 아님');
  else {
    const inner = m[1].split('\n').map(l => l.startsWith('        ') ? l.slice(8) : l).join('\n').trimEnd();
    if (inner !== shownBody(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  }
  const body = fs.readFileSync(path.join(dir, 'body.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (body !== shownBody(c)) probs.push('화면의 코드와 body.txt가 다름');
  // 호출 순서 (코드에 기록하는 줄을 더해 실행한 것)
  const real_t = trace[k], model_t = '[' + sim.trace.join(', ') + ']';
  if (real_t !== model_t) probs.push('호출 순서 모형 ' + model_t + ' 실제 ' + real_t);
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 사실: result와 nums
const fact = lines.find(l => l.startsWith('FACT identity => '));
total++;
if (fact && fact.slice('FACT identity => '.length) === 'false true') ok++;
else console.log('다름: FACT identity ' + fact);
// 사실: 스트림도 for 문도 값을 하나씩 끝까지 지나고 다음 값으로 가는 순서이고, 버려진 값에 map이 불리지 않는다
const t = trace['stream|true|true'];
total++;
if (t === '[filter(1), filter(2), map(2), filter(3), filter(4), map(4), filter(5), filter(6), map(6)]' && !/map\([135]\)/.test(t)) ok++;
else console.log('다름: FACT trace stream|true|true ' + t);
console.log('일치 ' + ok + ' / ' + total);  // 조합 8개 + 사실 2개
