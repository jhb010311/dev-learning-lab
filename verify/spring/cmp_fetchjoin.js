// "JPQL과 페치 조인" 실습의 모형 결과를 실제 Hibernate 실행 결과(fetchjoin_probe.out.txt)와 대조한다.
// 결과 표의 다섯 칸과 함께, 예외가 난 단계, comments 목록이 처음부터 채워져 있었는지, 첫 게시글의 댓글 수도 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('fetchjoin');
const real = {};
const lines = fs.readFileSync(path.join(__dirname, 'fetchjoin_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => ');
  real[k] = Object.fromEntries(v.split('|').map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));
}
let ok = 0, n = 0; const used = new Set();
for (const c of combos(lesson)) {
  const key = c.q + '|' + c.page, r = real[key]; n++; used.add(key);
  if (!r) { console.log('실제 실행 결과 없음: ' + key); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  let want, facts;
  if (r.ex !== 'none') {
    const [top, cause] = r.ex.split(' <- ');
    want = ['없음 (예외)', '-', '-', '-', top + ' (원인 ' + cause + ')'];
    facts = { exAt: r.exAt, loaded: false, firstN: -1 };
    if (r.mainSql !== '0') want[0] = 'SQL이 나갔음';                 // 모형은 예외인 조합에서 SQL이 나가지 않는다고 말한다
  } else {
    // 행 수 제한: 페이징을 걸지 않았으면 "페이징 안 함", 걸었으면 SQL의 어디에 있는지로 정한다
    const lim = !c.page ? (r.limit === 'none' ? '페이징 안 함' : 'SQL에 제한이 있음') : { outer: 'SQL 끝에 있음', subquery: '서브쿼리 안에 있음', none: 'SQL에 없음 (메모리에서 자름)' }[r.limit] || r.limit;
    want = [r.size + '개 (게시글 ' + r.ids.split(',').join(', ') + ')', (r.commentCols === 'true' ? '게시글 + 댓글 컬럼' : '게시글 컬럼만') + ' · ' + r.rows + '행', lim, r.extraSelects + '번', r.warn === 'none' ? '없음' : r.warn + ' 경고'];
    facts = { exAt: 'none', loaded: r.commentsLoaded === 'true', firstN: +r.firstPostComments };
    if (r.mainSql !== '1') want[0] = '목록 조회 SQL이 ' + r.mainSql + '번';   // 모형은 목록 조회가 SQL 1번이라고 말한다
    if ((c.q === 'join' || c.q === 'fetch' || c.q === 'fetchsort') !== (r.join === 'true')) want[1] = '조인 여부가 다름';
  }
  const same = JSON.stringify(sim.row) === JSON.stringify(want) && JSON.stringify(sim.facts) === JSON.stringify(facts);
  if (same) ok++; else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' ' + JSON.stringify(sim.facts) + '\n  실제 ' + want.join(' / ') + ' ' + JSON.stringify(facts));
}
Object.keys(real).forEach(k => { if (!used.has(k)) console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n);
