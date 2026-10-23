// "프록시와 리버스 프록시" 실습의 모형 결과를 실제 실행 결과(revproxy_probe_boot.out.txt, 스프링 부트 + nginx 역할의 Node 프록시)와 대조한다.
// 실행에서는 루프백 주소(클라이언트 127.0.0.10, 프록시 127.0.0.20, 서버 127.0.0.30)를 썼고, 화면의 예시 주소로 바꿔서 다섯 열을 모두 비교한다.
// 옛 실행 결과(revproxy_probe.out.txt, Node로 짠 서버)는 이전 판의 기록으로 남겨 두고 여기서는 쓰지 않는다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('revproxy');
const txt = fs.readFileSync(path.join(__dirname, 'revproxy_probe_boot.out.txt'), 'utf8');
const real = {};
txt.split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v; });
let ok = 0, bad = 0; const seen = new Set();
// 실행 환경 확인: 기본 internal-proxies가 화면의 nginx(10.0.0.5)는 믿고 클라이언트·위조 주소는 믿지 않는가, native만 RemoteIpValve, framework만 ForwardedHeaderFilter
const info = {}; txt.split(/\r?\n/).filter(l => l.startsWith('# info ')).forEach(l => { const m = l.match(/^# info (\w+): (.*)$/); info[m[1]] = JSON.parse(m[2]); });
const env = info.native && info.native.default_10_0_0_5 === true && info.native.default_203_0_113_7 === false && info.native.default_198_51_100_99 === false
  && /RemoteIpValve/.test(info.native.engineValves) && !/RemoteIpValve/.test(info.none.engineValves + info.framework.engineValves + info.unset.engineValves)
  && info.framework.forwardedHeaderFilter === true && !info.none.forwardedHeaderFilter && !info.native.forwardedHeaderFilter && !info.unset.forwardedHeaderFilter;
if (!env) { console.log('실행 환경 확인 실패: ' + JSON.stringify(info)); bad++; }
for (const c of combos(lesson)) {
  const k = [c.path, c.ngx, c.spoof, c.fhs].join('|'); if (seen.has(k)) continue; seen.add(k);
  const row = lesson.simulate(Object.assign({}, c)).row, r = real[k];
  if (!r) { console.log('실행 결과 없음: ' + k); bad++; continue; }
  if (/설정 안 함과 다름/.test(r)) { console.log('none과 설정 안 함이 다름: ' + k); bad++; }
  const [remote, xff, xfp, addr, scheme, host] = r.replace(/\s+\(.*$/, '').split('|');
  const map = a => a.split('client').join(lesson.CL).split('proxy').join(lesson.PX);
  const want = c.path === 'reverse' ? 'https' : 'http';
  const exp = [
    map(remote) + (remote === 'client' ? ' (클라이언트)' : ' (nginx)'),
    xff === '-' ? '없음' : map(xff),
    xfp === '-' ? '없음' : xfp,
    map(addr) + ' (' + (addr === 'client' ? '맞음' : addr === 'proxy' ? 'nginx의 주소' : '위조된 주소에 속음') + ')',
    scheme + (scheme === want ? '' : ' (사용자는 https로 접속)'),
  ];
  const hostOk = c.path === 'reverse' && c.ngx === 'none' ? /^server:\d+$/.test(host) : host === 'shop.example';   // $proxy_host / $host
  if (hostOk && JSON.stringify(row) === JSON.stringify(exp)) ok++;
  else { bad++; console.log('다름: ' + k + '\n  모형 ' + row.join(' / ') + '\n  실제 ' + exp.join(' / ') + (hostOk ? '' : '  (Host: ' + host + ')')); }
}
console.log('일치 ' + ok + ' / ' + seen.size + (bad ? '  (불일치 ' + bad + ')' : ''));
process.exit(bad ? 1 : 0);
