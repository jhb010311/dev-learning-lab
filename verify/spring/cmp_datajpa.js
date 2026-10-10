// "스프링 데이터 JPA" 실습의 모형 결과를 실제 실행 결과(datajpa_probe.out.txt)와 대조한다.
// 실제 SQL은 별칭(m1_0.)과 컬럼 목록을 걷어 내고 모형과 같은 모양으로 줄여 비교한다. like 뒤의 escape 절은 뺀다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('datajpa');
const lines = fs.readFileSync(path.join(__dirname, 'datajpa_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {}, extra = [];
for (const ln of lines.slice(1)) {
  const at = ln.indexOf(' => '), k = ln.slice(0, at), v = ln.slice(at + 4), sq = v.indexOf('sql='), f = {};
  if (k.startsWith('extra|')) { extra.push(ln); continue; }
  v.slice(0, sq).split('|').filter(Boolean).forEach(x => { const i = x.indexOf('='); f[x.slice(0, i)] = x.slice(i + 1); });
  f.sqls = v.slice(sq + 4).split(' ;; ').filter(Boolean).map(x => { const m = /^(.*) \[(.*)\]$/.exec(x); return { sql: m[1], params: m[2] ? m[2].split(', ') : [] }; });
  real[k] = f;
}
// 실제 SQL 한 문장을 모형의 표기로 줄인다
function shape(sql) {
  const s = sql.replace(/\b\w+_\d+\./g, '').replace(" escape '\\'", '');
  const m = /^select (.*?) from \w+ \w+(.*)$/.exec(s);
  return ((m[1].startsWith('count(') ? 'select count' : 'select …') + m[2]).replace(/\s*(>=|<=|=|>|<)\s*/g, ' $1 ').trim();
}
// 실제 실행 결과로부터, 모형의 row와 같은 칸을 만든다
function expected(c, f) {
  const n = f.sqls.length + '번', kinds = f.sqls.map(q => q.sql.split(' ')[0].toUpperCase()).join(' → ');
  if (c.sc === 'name') {
    if (f.boot !== '성공') return ['실패 (' + f.error + ')', n, '없음', '메서드를 부를 수 없음'];
    return ['성공', n, f.sqls.map(q => shape(q.sql)).join(' ; '), c.mt.startsWith('count') ? '숫자 ' + f.rows + ' (개수)' : '회원 ' + f.rows + '건'];
  }
  if (c.sc === 'page') {
    const content = f.sqls[0], cnt = f.sqls.slice(1).filter(q => /^select count\(/.test(q.sql)).length, p = content.params.map(Number), off = p.length === 2 ? p[0] : 0, lim = p[p.length - 1];
    return [f.boot, n, '내용 조회 (' + off + '건 건너뛰고 ' + lim + '건 요청)' + (cnt ? ' + 개수 조회' : ''), f.content + '건 · ' + (f.total ? '전체 ' + f.total + '건' : '전체 건수 모름') + ' · 다음 ' + (f.hasNext === 'true' ? '있음' : '없음')];
  }
  const same = f.ret.startsWith('same:true') ? '돌려준 객체는 넘긴 객체와 같음' : '돌려준 객체는 넘긴 객체와 다름';
  const res = f.ret.startsWith('예외:') ? '예외 (' + f.ret.slice(3).split('/')[0] + ') · ' + (f.db === '7' ? 'DB 변화 없음' : 'DB가 바뀜')
    : c.ent === 'new' ? '회원 ' + f.db + '명이 됨 · ' + same : c.ent === 'assigned' ? '쿠폰 ' + f.db + '장이 됨 · ' + same
    : (f.db === '김철수' ? 'DB 변화 없음' : 'DB의 이름이 ' + f.db + '로 바뀜') + ' · ' + same;
  return [f.boot, n, kinds, res];
}
const seen = new Set(), bad = []; let ok = 0, all = 0;
for (const c of combos(lesson)) {
  const key = c.sc === 'name' ? 'name|' + c.mt : c.sc === 'page' ? 'page|' + c.ret + '|' + c.pg : 'save|' + c.ent, f = real[key];
  all++;
  if (!f) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), exp = expected(c, f);
  let same = JSON.stringify(sim.row) === JSON.stringify(exp);
  if (c.sc === 'name' && (sim.msg || '') !== (f.msg || '')) same = false;          // 기동 실패의 오류 메시지
  if (c.sc === 'name' && (sim.order || '') !== (f.order || '')) same = false;      // 정렬된 결과의 순서
  if (!same) bad.push(key + '\n    모형 ' + sim.row.join(' / ') + ' ' + sim.msg + ' ' + sim.order + '\n    실제 ' + exp.join(' / ') + ' ' + (f.msg || '') + ' ' + (f.order || ''));
  else if (!seen.has(key)) { seen.add(key); ok++; }
}
const failedKeys = new Set([...new Set(bad)].map(b => b.split(/\s/)[0]));
const distinct = Object.keys(real).length;
console.log('일치 ' + (ok - [...seen].filter(k => failedKeys.has(k)).length) + ' / ' + distinct + '  (서로 다른 장면 ' + distinct + '가지를 실제로 실행. 보이지 않는 설정까지 곱한 조합 ' + all + '개가 모두 이 장면들과 같은지도 확인)');
[...new Set(bad)].slice(0, 30).forEach(b => console.log('다름: ' + b));
extra.forEach(e => console.log('덧붙임 확인: ' + e));
