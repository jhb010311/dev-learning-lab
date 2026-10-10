// "스트림으로 모으기" 실습의 모형 결과를 실제 실행 결과(CollectProbe.out.txt)와 대조한다.
// 모형의 모든 설정 조합에 대해 결과의 타입(실제로 컴파일된 선언), 출력, 예외와 그 메시지를 비교한다.
// Map의 출력은 실제 println 결과와, 키 순서로 정리한 결과 두 가지 모두와 같아야 한다(순서에 기대지 않는지 확인).
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('collect');
const txt = fs.readFileSync(path.join(__dirname, 'CollectProbe.out.txt'), 'utf8'), real = {};
txt.split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = l.slice(i + 4); });
// 실제로 컴파일된 Probe 소스에서 방법마다 선언한 타입을 읽는다
const src = fs.readFileSync(path.join(__dirname, 'CollectProbe.java'), 'utf8'), types = {};
src.replace(/(?:case "(\w+)"|default): \{\s*([^;=]+?) result =/g, (m, how, type) => { types[how || 'toMapMerge'] = type.trim(); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = c.how + '|' + c.data, r = real[key];
  if (!r) { console.log('실제 실행 결과 없음: ' + key); continue; }
  const [print, sorted, ex, msg, vcls, rcls] = r.split('|');
  const isMap = sorted !== '-' || ex !== '없음';
  const want = [types[c.how], ex !== '없음' ? '(출력 전에 멈춤)' : print === '' ? '(빈 문자열)' : print, ex, msg];
  const sim = lesson.simulate(Object.assign({}, c)), got = sim.row.concat([sim.msg]);
  const problems = [];
  if (JSON.stringify(got) !== JSON.stringify(want)) problems.push('모형 ' + got.join(' | ') + '\n  실제 ' + want.join(' | '));
  if (ex === '없음' && sorted !== '-' && sorted !== print) problems.push('실제 출력 순서가 키 순서와 다름: ' + print + ' / ' + sorted);
  if (vcls !== '-' && vcls !== 'List' && !types[c.how].endsWith(', ' + vcls + '>')) problems.push('값의 실제 클래스가 타입과 다름: ' + vcls);
  if (['group', 'count', 'sum', 'toMap', 'toMapMerge'].includes(c.how) && ex === '없음' && rcls !== 'HashMap') problems.push('결과 Map이 HashMap이 아님: ' + rcls);
  if (!problems.length) ok++; else console.log('다름: ' + key + '\n  ' + problems.join('\n  '));
}
const extra = [txt.includes('확인 counting을 Map<String, Long>으로 받으면 컴파일됨: true'), txt.includes('확인 counting을 Map<String, Integer>로 받으면 컴파일됨: false')];
console.log('counting의 결과 타입(Long) 컴파일 확인 ' + extra.filter(Boolean).length + ' / ' + extra.length);
console.log('일치 ' + ok + ' / ' + n);
