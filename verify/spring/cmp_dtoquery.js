// "DTO로 바로 조회하기" 실습의 모형 결과를 실제 실행 결과(dtoquery_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('dtoquery');
const lines = fs.readFileSync(path.join(__dirname, 'dtoquery_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {}, extra = [];
for (const ln of lines.slice(1)) {
  const at = ln.indexOf(' => '), k = ln.slice(0, at), v = ln.slice(at + 4), f = {};
  if (k.startsWith('extra|')) { extra.push(ln); continue; }
  const si = v.indexOf('|sql='); f.sql = v.slice(si + 5);
  v.slice(0, si).split('|').forEach(x => { const i = x.indexOf('='); f[x.slice(0, i)] = x.slice(i + 1); });
  real[k] = f;
}
function expected(c, f) {
  const later = f.later ? f.later.split(',') : [], teamQ = later.filter(t => t === 'team').length;
  const upd = !c.mod ? '0번 (값을 바꾸지 않음)' : +f.updates ? f.updates + '번 (DB의 이름이 ' + f.db + '로 바뀜)' : '0번 (DTO만 바뀌고 DB는 그대로)';
  return [f.selects + '번' + (later.length ? ' (회원 1 + 팀 ' + teamQ + ')' : ''), f.columns + '개', f.managed + '개', upd];
}
let ok = 0, n = 0; const bad = [];
for (const c of combos(lesson)) {
  const key = c.how + '|' + c.team + '|' + c.mod, f = real[key];
  n++;
  if (!f) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), exp = expected(c, f);
  // 값을 바꾸지 않았거나 DTO만 바꾼 경우 DB의 이름이 그대로인지, UPDATE가 커밋 전에는 나가지 않았는지도 본다
  const dbOk = (+f.updates ? f.db === '김영수' : f.db === '김철수') && f.updatesBeforeCommit === '0';
  if (JSON.stringify(sim.row) === JSON.stringify(exp) && dbOk) ok++;
  else bad.push(key + '\n    모형 ' + sim.row.join(' / ') + '\n    실제 ' + exp.join(' / ') + ' db=' + f.db);
}
console.log('일치 ' + ok + ' / ' + n);
bad.forEach(b => console.log('다름: ' + b));
extra.forEach(e => console.log('덧붙임 확인: ' + e));
