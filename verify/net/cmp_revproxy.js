// "프록시와 리버스 프록시" 실습의 모형 결과를 실제 실행 결과(revproxy_probe.out.txt)와 대조한다.
// 실행에서는 루프백 주소(클라이언트 127.0.0.10, 프록시 127.0.0.20, 서버 127.0.0.30)를 썼고, 화면의 예시 주소로 바꿔서 다섯 열을 모두 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('revproxy');
const real = {};
fs.readFileSync(path.join(__dirname, 'revproxy_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
let ok = 0; const seen = new Set();
for (const c of combos(lesson)) {
  const k = [c.path, c.xff, c.spoof, c.read].join('|'); if (seen.has(k)) continue; seen.add(k);
  const r = real[k], row = lesson.simulate(Object.assign({}, c)).row;
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const [peer, target, remote, xff, client, scheme, proto, xfp] = r;
  const kind = peer === 'server' ? 'direct' : target === 'absolute' ? 'forward' : 'reverse', px = lesson.PX[kind];
  const addr = a => a.split('client').join(lesson.CL).split('proxy').join(px);
  const want = [
    { direct: '서버 (직접 연결)', forward: '포워드 프록시 (클라이언트가 설정함)', reverse: '리버스 프록시 (서버인 줄 앎)' }[kind],
    addr(remote) + (remote === 'client' ? ' (클라이언트)' : ' (프록시)'),
    xff === '-' ? '없음' : addr(xff),
    addr(client) + ' (' + (client === 'client' ? '맞음' : client === 'proxy' ? '프록시의 주소' : '위조된 주소에 속음') + ')',
    scheme === 'http' ? '-' : xfp === 'https' ? 'https' : '없음 (원래 https였는지 모름)',
  ];
  const sane = kind === c.path && proto === 'http' && (scheme === 'https') === (kind === 'reverse') && (scheme === 'http' ? xfp === '-' : true);
  if (sane && JSON.stringify(row) === JSON.stringify(want)) ok++; else console.log('다름: ' + k + '\n  모형 ' + row.join(' / ') + '\n  실제 ' + want.join(' / ') + (sane ? '' : '  (실행 결과 자체가 이상함: ' + r.join('|') + ')'));
}
console.log('일치 ' + ok + ' / ' + seen.size);
