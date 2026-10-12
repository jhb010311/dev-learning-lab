// 기초개념 "HTTP 응답" 실습의 모형 결과를 실제 실행 결과(httpres_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(읽은 상태, 받은 content-type, 받은 본문), 받은 본문 바이트 수, 단계 문장이 기대는 사실
//       (Content-Length 6일 때 남은 글자에서 오류가 났는가, 상태 줄이 없으면 해석 오류인가, 본문 바이트 수 15/6/3,
//        연결을 닫지 않는 서버에서 Content-Length가 없을 때만 응답이 끝나지 않는가),
//       그리고 화면의 코드(code 함수)가 서버가 실제로 보낸 글과 같은 글인지(줄 끝 CRLF, (빈 줄)은 빈 줄로)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('httpres_basic');
const lines = fs.readFileSync(path.join(__dirname, 'httpres_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, sent = {}, facts = {};
lines.forEach(l => {
  if (l.startsWith('# 보낸 글 ')) { const i = l.indexOf(' = '); sent[l.slice('# 보낸 글 '.length, i)] = JSON.parse(l.slice(i + 3)); return; }
  if (l.startsWith('# 사실 ')) { l.slice('# 사실 '.length).split('|').forEach(p => { const [k, v] = p.split('='); facts[k] = v; }); return; }
  if (l.startsWith('# 근거 ')) { const m = /^# 근거 연결을 (닫는|닫지 않는) 서버, Content-Length (\w+) => (.*)$/.exec(l), f = {}; m[3].split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); facts['wait|' + (m[1] === '닫는' ? 'close' : 'open') + '|' + m[2]] = f; return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
});
const problems = [];
// 단계 문장이 기대는 바이트 수
if (facts['안녕하세요'] !== '15바이트' || facts['안녕'] !== '6바이트' || facts['한 글자'] !== '3바이트' || facts['하세요'] !== '9바이트') problems.push('본문 바이트 수 사실이 문장과 다름: ' + JSON.stringify(facts));
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.status, c.ctype, c.clen].join('|'), f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), unread = f.state === '(응답으로 읽지 못함)';
  const want = [unread ? '응답으로 읽지 못함' : f.state, unread ? '없음 (응답을 읽지 못함)' : f.type === '(헤더 없음)' ? '알 수 없음 (헤더가 없음)' : f.type, unread ? '없음 (응답을 읽지 못함)' : f.body];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  if (sim.bytes !== +f.bytes) probs.push('받은 본문 바이트 모형 ' + sim.bytes + ' 실제 ' + f.bytes);
  // 문장이 기대는 사실
  const expectErr = unread ? 'HPE_INVALID_CONSTANT' : c.clen === 'short' ? 'HPE_INVALID_CONSTANT' : '(없음)';
  if (f.errCode !== expectErr) probs.push('오류 코드 기대 ' + expectErr + ' 실제 ' + f.errCode);
  if (!unread && f.ended !== 'true') probs.push('응답이 끝나지 않음');
  if (f.server !== 'GET /hello HTTP/1.1') probs.push('서버가 받은 요청이 다름: ' + f.server);
  // 화면의 코드 = 서버가 보낸 글
  const want_text = lesson.code(Object.assign({}, c)).split('\n').map(x => x === '(빈 줄)' ? '' : x).join('\r\n');
  if (want_text !== sent[k]) probs.push('화면의 코드와 서버가 보낸 글이 다름\n   화면 ' + JSON.stringify(want_text) + '\n   실제 ' + JSON.stringify(sent[k]));
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 연결을 닫지 않는 서버: Content-Length가 없을 때만 1.5초 안에 응답이 끝나지 않는다 (요약 문장과 assume이 기대는 사실)
for (const clen of ['right', 'short', 'none']) for (const mode of ['close', 'open']) {
  const f = facts['wait|' + mode + '|' + clen], expectEnd = !(mode === 'open' && clen === 'none');
  if (!f) { problems.push('근거 없음: ' + mode + ' ' + clen); continue; }
  const end = f['1500ms 안에 응답이 끝남'] === 'true', body = JSON.parse(f['받은 본문']);
  if (end !== expectEnd) problems.push('연결 ' + mode + ' · Content-Length ' + clen + ': 응답이 끝남 ' + end + ' 기대 ' + expectEnd);
  if (body !== (clen === 'short' ? '안녕' : '안녕하세요')) problems.push('연결 ' + mode + ' · Content-Length ' + clen + ': 받은 본문 ' + body);
}
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실도 모두 일치)'));
