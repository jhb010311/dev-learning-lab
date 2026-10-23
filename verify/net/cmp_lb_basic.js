// 기초개념 "로드 밸런서" 실습의 모형 결과를 실행 결과(lb_basic_probe_boot.out.txt)와 대조한다.
// 실행: 뒤쪽 서버는 화면의 HelloController를 그대로 컴파일한 실제 스프링 부트, 앞단은 화면의 nginx 설정을 읽어 nginx 문서·소스대로 움직이는 모형(lb_basic_probe_boot.js).
// 대조: 결과 표 세 열(A가 답한 수, B가 답한 수, 실패한 요청), 요청 6번 각각의 결과(어느 서버가 몇 번째로 답했는지, 거부당한 서버, 오류 종류),
//       결과 표의 "클라이언트가 받은 것"이 실제 받은 글과 같은지, "보낸 곳"의 연결 거부·건너뜀이 실행 기록과 같은지,
//       서버의 count, 라운드 로빈 차례, 띄운 구성(java -jar 인자, nginx upstream·listen·proxy_pass·기본값, 클라이언트, 끄는 때)이 화면 코드와 같은지
// (옛 실행: lb_basic_probe.js와 lb_basic_probe.out.txt는 직접 만든 Node 로드 밸런서와 Node 서버로 돌린 것이라 이 대조에 쓰지 않는다)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('lb_basic');
const lines = fs.readFileSync(path.join(__dirname, 'lb_basic_probe_boot.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {};
lines.forEach(l => {
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => '), f = {}, keys = ['a', 'b', 'fail', 'reqs', 'memA', 'memB', 'refused', 'skipped', 'turns', 'bodies', 'setup'];
  // setup 값에도 |가 있으므로 "|키=" 자리로 나눈다
  keys.forEach((key, i) => {
    const s = i ? v.indexOf('|' + key + '=') + 1 : 0, e = i + 1 < keys.length ? v.indexOf('|' + keys[i + 1] + '=') : v.length;
    f[key] = v.slice(s + key.length + 1, e);
  });
  real[k] = f;
});
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.servers, c.down].join('|'), f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const lb = c.servers === 'lb', sim = lesson.simulate(Object.assign({}, c)), code = lesson.code(Object.assign({}, c));
  // 결과 표
  const want = [f.a + '번', lb ? f.b + '번' : '서버 B 없음', f.fail + '번' + (+f.fail ? ' (연결 거부 오류)' : '')];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 요청마다의 결과
  if (sim.trace.join(';') !== f.reqs) probs.push('요청별 결과 모형 ' + sim.trace.join(';') + '\n   실제 ' + f.reqs);
  f.reqs.split(';').filter(x => x.startsWith('오류')).forEach(x => { if (x !== '오류ECONNREFUSED') probs.push('오류 종류가 연결 거부가 아님: ' + x); });
  // 화면 표의 "클라이언트가 받은 것" = 실제 받은 글, "보낸 곳"의 연결 거부·건너뜀 = 실행 기록
  const endSnap = sim.events[sim.events.length - 1].snap, rows = endSnap.rows, bodies = f.bodies.split(' / '), reqs = f.reqs.split(';');
  const at = (list, i) => ((list.split(' / ').find(x => x.startsWith((i + 1) + '번째 요청: ')) || '').replace(/^.*: /, '')).split(',').filter(Boolean).map(x => x.split(':')[0]);
  rows.forEach((r, i) => {
    const got = bodies[i] || '', w = r[2] === '연결 거부 오류' ? '(ECONNREFUSED)' : '200 ' + r[2];
    if (got !== w) probs.push((i + 1) + '번째 받은 글 모형 ' + w + ' 실제 ' + got);
    const ref = at(f.refused, i), skp = at(f.skipped, i), who = (/^([AB])#/.exec(reqs[i] || '') || [])[1];
    const wantWhere = lb ? 'nginx → ' + (ref.length ? '서버 ' + ref.join(', ') + ' 연결 거부 → ' : '') + '서버 ' + who : '서버 A (직접)';
    if (r[1].replace(/서버 [AB] 건너뜀 → /, '') !== wantWhere) probs.push((i + 1) + '번째 보낸 곳 모형 ' + r[1] + ' 실제 ' + wantWhere);
    // 실패 기간이라 후보에서 뺀 서버(skipped): 그 서버의 차례였으면 표에 "건너뜀", 아니었어도 단계 문장에 "쓰지 않는 서버"로 밝혀야 한다
    const ev = sim.events.find(e => e.s.indexOf('요청을 보냅니다(' + (i + 1) + '번째). ') >= 0);
    skp.forEach(x => { if (!ev || ev.s.indexOf('서버 ' + x) < 0 || ev.s.indexOf('쓰지 않는 서버') < 0) probs.push((i + 1) + '번째 요청: 후보에서 뺀 서버 ' + x + '를 단계 문장이 말하지 않음'); });
    if (!skp.length && /건너뜀|쓰지 않는 서버라/.test(r[1] + (ev ? ev.s : ''))) probs.push((i + 1) + '번째 요청: 실제로는 후보에서 뺀 서버가 없는데 모형이 건너뛴다고 함');
  });
  if (rows.length !== bodies.length) probs.push('요청 수 모형 ' + rows.length + ' 실제 ' + bodies.length);
  // 서버의 count = 답한 수 = 모형의 count
  if (+f.memA !== endSnap.cntA || f.memA !== f.a) probs.push('서버 A count 실제 ' + f.memA + ' 모형 ' + endSnap.cntA);
  if (lb && (+f.memB !== endSnap.cntB || f.memB !== f.b)) probs.push('서버 B count 실제 ' + f.memB + ' 모형 ' + endSnap.cntB);
  if (lb && f.turns !== 'ABABAB') probs.push('라운드 로빈이 처음 고른 서버 기대 ABABAB 실제 ' + f.turns);
  // 띄운 구성 = 화면 코드에서 읽은 것
  const wantSetup = (lb ? 'jar A:8081,B:8082|nginx upstream app 127.0.0.1:8081 max_fails=1 fail_timeout=10s, 127.0.0.1:8082 max_fails=1 fail_timeout=10s listen 8080 proxy_pass app next_upstream error timeout' : 'jar A:8080|nginx 없음')
    + '|클라이언트 8080 6번|끄기 ' + (c.down ? '3번 뒤' : '안 함');
  if (f.setup !== wantSetup) probs.push('띄운 구성 ' + f.setup + '\n   기대 ' + wantSetup);
  // 화면 코드의 기본값 설명 줄이 실행에 쓴 기본값과 같은지(nginx를 두고 끄는 조합에서만 보인다)
  if (c.down && lb && !(code.includes('max_fails=1 fail_timeout=10s가 기본값') && code.includes('proxy_next_upstream error timeout;이 기본값'))) probs.push('화면 코드의 기본값 줄이 없음');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);
