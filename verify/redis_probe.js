// "Redis의 한 줄 처리" 실습의 원리를 실제 Redis에서 확인한다.
//  1) 오래 걸리는 명령(KEYS, 큰 LRANGE)이 도는 동안 다른 클라이언트의 빠른 명령이 얼마나 기다리는가
//  2) SCAN으로 나눠 훑으면 다른 클라이언트가 기다리지 않는가
//  3) 두 클라이언트가 같은 키에 동시에 INCR을 보내도 값이 정확한가
// 화면의 시간 값은 예시이므로, 여기서는 크기의 차이와 방향만 본다. 실제 값은 이 PC와 컨테이너에서 잰 것이다.
// 오래 걸리는 명령은 컨테이너 안의 redis-cli(별도 프로세스)로 보내고, 이 프로그램은 "다른 클라이언트"의 대기 시간만 잰다.
// (같은 프로그램에서 큰 응답을 받으면 그 처리 때문에 측정이 섞이기 때문이다.)
const net = require('net'), { spawn, execSync } = require('child_process');
function client() {
  const s = net.connect(6380, '127.0.0.1'); s.setNoDelay(true);
  let buf = ''; const waiters = [];
  s.on('data', d => { buf += d.toString('latin1'); for (;;) { if (!waiters.length) break; const m = /^([+\-:][^\r]*\r\n|\$-1\r\n|\$(\d+)\r\n)/.exec(buf); if (!m) break; let end = m[0].length; if (m[2] !== undefined) { end += +m[2] + 2; if (buf.length < end) break; } const r = buf.slice(0, end); buf = buf.slice(end); waiters.shift()(r); } });
  return { cmd(...a) { return new Promise(res => { waiters.push(res); s.write('*' + a.length + '\r\n' + a.map(x => '$' + Buffer.byteLength(String(x)) + '\r\n' + x + '\r\n').join('')); }); }, close() { s.destroy(); } };
}
const ms = t => Number(process.hrtime.bigint() - t) / 1e6;
const cli = (...a) => require('child_process').execFileSync('docker', ['exec', 'lab-redis', 'redis-cli', ...a], { encoding: 'utf8' });   // 따옴표가 든 인자는 셸을 거치지 않고 넘긴다
const sh = cmd => execSync('docker exec lab-redis sh -c "' + cmd + '"', { encoding: 'utf8', maxBuffer: 1 << 26 });
(async () => {
  const b = client(), out = [];
  out.push('# redis ' + sh('redis-cli INFO server | grep redis_version').trim().split(':')[1]);
  sh('redis-cli FLUSHALL');
  cli('EVAL', "for i=1,1000000 do redis.call('SET','user:'..i,'v') end return 1", '0');   // 키 100만 개
  cli('EVAL', "for i=1,500000 do redis.call('RPUSH','biglist','item'..i) end return 1", '0');   // 원소 50만 개짜리 리스트
  await b.cmd('SET', 'k', 'v');
  out.push('준비: 키 ' + sh('redis-cli DBSIZE').trim() + '개, 리스트 원소 ' + sh('redis-cli LLEN biglist').trim() + '개');
  // 별도 프로세스가 slow 명령을 실행하는 동안, 이 클라이언트는 GET을 쉬지 않고 보내며 가장 오래 기다린 시간을 잰다
  async function during(label, slowCmd) {
    let done = false, worst = 0, n = 0; const t0 = process.hrtime.bigint();
    const p = spawn('docker', ['exec', 'lab-redis', 'sh', '-c', slowCmd], { stdio: 'ignore' });
    const finished = new Promise(r => p.on('exit', () => { done = true; r(ms(t0)); }));
    while (!done) { const t = process.hrtime.bigint(); await b.cmd('GET', 'k'); worst = Math.max(worst, ms(t)); n++; await new Promise(r => setImmediate(r)); }
    out.push(label + ' => 명령을 보낸 프로세스 전체 ' + (await finished).toFixed(0) + 'ms | 그동안 다른 클라이언트의 GET ' + n + '번 중 가장 오래 기다린 것 ' + worst.toFixed(1) + 'ms');
  }
  await during('none (빠른 명령 PING만)', 'redis-cli PING > /dev/null');
  await during('keys (KEYS user:*)', "redis-cli KEYS 'user:*' > /dev/null");
  await during('big (LRANGE biglist 0 -1)', 'redis-cli LRANGE biglist 0 -1 > /dev/null');
  await during('scan (SCAN, 한 번에 1,000개씩)', "redis-cli --scan --pattern 'user:*' --count 1000 > /dev/null");
  // 서버가 기록한 명령별 평균 실행 시간 (마이크로초)
  out.push('서버가 기록한 명령 실행 시간: ' + sh('redis-cli INFO commandstats').split('\n').filter(l => /cmdstat_(keys|lrange|scan|get):/.test(l)).map(l => l.trim().replace(/cmdstat_(\w+):calls=(\d+),usec=\d+,usec_per_call=([\d.]+).*/, '$1 평균 $3마이크로초 ($2번)')).join(' · '));
  // 두 클라이언트가 같은 키에 동시에 INCR
  const a = client(); await b.cmd('SET', 'counter', '0');
  const N = 20000; await Promise.all([a, b].map(c => (async () => { const ps = []; for (let i = 0; i < N; i++) ps.push(c.cmd('INCR', 'counter')); await Promise.all(ps); })()));
  out.push('incr => 두 클라이언트가 각각 ' + N + '번씩 INCR, 최종 값 ' + (await b.cmd('GET', 'counter')).split('\r\n')[1] + ' (기대 ' + 2 * N + ')');
  sh('redis-cli FLUSHALL');
  a.close(); b.close();
  require('fs').writeFileSync(require('path').join(__dirname, 'redis_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})();
