// "DB의 교착 상태" 실습의 모형 결과를 실제 MySQL 실행 결과(dbdeadlock_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('dbdeadlock');
const all = fs.readFileSync(path.join(__dirname, 'dbdeadlock_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
all.filter(l => l.startsWith('#')).forEach(l => console.log(l));
const real = {};
for (const ln of all.filter(l => l.includes(' => '))) { const [k, v] = ln.split(' => '); real[k] = v.split('|'); }
// 모형의 모든 설정 조합(보이지 않는 설정은 fix로 기본값이 된다)을 실제 실행 줄과 짝짓는다
const keys = [...new Set(combos(lesson).map(c => c.sit + '|' + c.heavy + '|' + c.after))];
let ok = 0; const bad = [];
for (const k of keys) {
  const r = real[k]; if (!r) { bad.push(k + '  실제 실행 결과가 없음'); continue; }
  const [sit, heavy, after] = k.split('|'), [errA, errB, kept, b1, b2, extra] = r;
  const victim = errA !== '0' ? 'A' : errB !== '0' ? 'B' : '', code = victim === 'A' ? errA : errB;
  // 일의 양이 같은 교착은 어느 쪽이 롤백될지 정해져 있지 않으므로, 실제로 롤백된 쪽을 모형에 알려 주고 나머지 결과를 비교한다
  const model = lesson.plan({ sit, heavy, after }, sit === 'rev' && heavy === 'eq' ? victim : undefined).row;
  const shown = lesson.simulate({ sit, heavy, after }).row;
  const what = code === '1213' ? '교착을 감지함' : code === '1205' ? '락 대기 시간 초과' : '기다렸다가 진행';
  const who = victim ? victim + ': 오류 ' + code + (sit === 'rev' && heavy === 'eq' ? ' (' + (victim === 'B' ? 'A' : 'B') + '일 수도 있음)' : '') : '없음';
  const state = kept === 'rolledback' ? '트랜잭션 전체가 롤백됨' : kept === 'kept' ? '문장만 취소, 트랜잭션은 살아 있음' : '-';
  const realRow = [what, who, state, b1 + ' / ' + b2];
  // 부가 정보로 확인하는 것: 교착 오류는 락 대기 제한보다 훨씬 빨리 오고, 시간 초과는 제한 시간이 지나야 온다. 오류 직후 쥐고 있는 레코드 락 수
  const ms = +(/오류까지 걸린 시간\(ms\)=(\d+)/.exec(extra) || [])[1], limit = +(/락 대기 제한\(초\)=(\d+)/.exec(extra) || [])[1], locks = (/record_locks=(\d+)/.exec(extra) || [])[1];
  const side = code === '1213' ? ms < limit * 1000 / 2 && locks === '0' : code === '1205' ? ms >= limit * 1000 && +locks >= 1 : /대기 중인 트랜잭션 수=1/.test(extra);
  const sameAsShown = JSON.stringify(model) === JSON.stringify(shown) || (sit === 'rev' && heavy === 'eq');
  if (JSON.stringify(model) === JSON.stringify(realRow) && side && sameAsShown) ok++; else bad.push(k + '\n   모형 ' + model.join(' / ') + '\n   실제 ' + realRow.join(' / ') + (side ? '' : '\n   부가 정보가 맞지 않음: ' + extra));
}
console.log('일치 ' + ok + ' / ' + keys.length);
bad.forEach(b => console.log('다름: ' + b));
