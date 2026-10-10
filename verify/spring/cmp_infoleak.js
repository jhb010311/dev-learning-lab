// "정보 누출" 실습의 모형 결과를 실제 스프링 부트 서버의 응답(infoleak_probe.out.txt)과 조합마다 대조한다.
// 응답의 글귀는 버전과 언어 설정에 따라 다르므로, 본문에 어떤 항목이 있는지 / 내부 정보가 보이는지 / 두 로그인 실패 응답이 같은지를 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('infoleak');
const lines = fs.readFileSync(path.join(__dirname, 'infoleak_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
}
const seen = new Set(); let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.topic === 'boot' ? 'boot|' + c.msg + '|' + c.trace + '|' + c.q : c.topic === 'handler' ? 'handler|' + c.body : 'login|' + c.lg + '|' + c.acct;
  if (seen.has(key)) continue; seen.add(key); n++;
  const sim = lesson.simulate(Object.assign({}, c)), f = real[key], diff = [];
  if (!f) { console.log('실행 결과 없음: ' + key); continue; }
  if (sim.row[0] !== f.status) diff.push('상태 코드: 모형 ' + sim.row[0] + ' / 실제 ' + f.status);
  if (c.topic === 'login') {
    if (sim.ex !== f.exception) diff.push('예외: 모형 ' + sim.ex + ' / 실제 ' + f.exception);
    if (String(sim.same) !== f.sameAsOther) diff.push('두 경우의 응답이 같은가: 모형 ' + sim.same + ' / 실제 ' + f.sameAsOther);
    if ((sim.row[2] === '없음') !== (f.sameAsOther === 'true')) diff.push('새어 나간 정보: 모형 ' + sim.row[2] + ' / 실제로 두 응답이 같은가 ' + f.sameAsOther);
    if (String(sim.matches) !== f.matches) diff.push('비밀번호 비교 횟수: 모형 ' + sim.matches + ' / 실제 ' + f.matches);
    if (c.lg !== 'split' && !sim.row[1].startsWith(f.exception)) diff.push('본문: 모형 ' + sim.row[1] + ' / 실제 예외 ' + f.exception);
  } else {
    // 기본 오류 응답은 항목의 순서까지, 직접 만든 응답(Map.of)은 순서가 정해져 있지 않으므로 항목의 집합을 비교한다
    const mk = c.topic === 'boot' ? sim.row[1] : sim.keys.slice().sort().join(', '), rk = c.topic === 'boot' ? f.keys.split(',').join(', ') : f.keys.split(',').sort().join(', ');
    if (mk !== rk) diff.push('본문의 항목: 모형 ' + mk + ' / 실제 ' + rk);
    ['sql', 'frames', 'db'].forEach(x => { if (String(sim.leak[x]) !== f[x]) diff.push(x + ': 모형 ' + sim.leak[x] + ' / 실제 ' + f[x]); });
    if (String(sim.leak.frames) !== f.class) diff.push('예외 클래스 이름이 보이는가: 모형 ' + sim.leak.frames + ' / 실제 ' + f.class);
    if (c.topic === 'handler' && String(sim.logged) !== f.loggedWithSql) diff.push('로그에 예외가 남았는가: 모형 ' + sim.logged + ' / 실제 ' + f.loggedWithSql);
  }
  if (diff.length) console.log('다름: ' + key + '\n   ' + diff.join('\n   ')); else ok++;
}
console.log('일치 ' + ok + ' / ' + n);

// 화면의 글에 적은 사실 가운데 조합 밖의 것을 따로 확인한다
const note = s => lines.find(l => l.startsWith(s)) || '';
const extra = [
  ['설정을 하나도 주지 않으면(기본값) 요청에 trace=true가 있어도 항목은 timestamp, status, error, path', real['defaults'].keys === 'timestamp,status,error,path' && real['defaults'].sql === 'false'],
  ['예전 이름(server.error.*)으로 always를 주면 적용되지 않는다', real['oldname'].keys === 'timestamp,status,error,path' && real['oldname'].sql === 'false'],
  ['HTML을 받는 요청에도 같은 내용이 오류 화면에 실린다', real['html|always|always'].status === '500' && real['html|always|always'].type === 'text/html' && real['html|always|always'].sql === 'true' && real['html|always|always'].frames === 'true'],
  ['화면에 적은 message의 예가 이 PC에서 본 것과 같다', note('# 이 PC에서 본 message의 예').endsWith('PreparedStatementCallback; bad SQL grammar [' + lesson.SQL + ']')],
  ['스택 트레이스의 첫 줄이 예외 클래스 이름과 메시지(SQL 포함)이고, DB 드라이버의 예외(org.h2)가 Caused by로 보인다', /첫 줄 \[org\.springframework\.jdbc\.BadSqlGrammarException: .*pirce from orders/.test(note('# 이 PC에서 본 trace의 예')) && /Caused by: org\.h2\./.test(note('#   DB 드라이버의 예외')) && /InfoLeakProbe\.java:\d+/.test(note('#   내 코드가 보이는 줄'))],
  ['스택 트레이스가 백여 줄이다', (() => { const m = /모두 (\d+)줄/.exec(note('# 이 PC에서 본 trace의 예')); return !!m && +m[1] >= 100 && +m[1] < 200; })()],
  ['화면에 적은 로그인 실패 글귀가 이 PC에서 본 것과 같다', note('# sec:').includes('[자격 증명에 실패하였습니다.]') && note('# unhide:').includes('[user not found]')],
  ['맞는 비밀번호로는 세 방식 모두 200', ['split', 'sec', 'unhide'].every(x => note('# ' + x + ':').endsWith('상태 코드 200'))],
];
extra.forEach(e => { if (!e[1]) console.log('덧붙인 확인 실패: ' + e[0]); });
console.log('덧붙인 확인 ' + extra.filter(e => e[1]).length + ' / ' + extra.length);
