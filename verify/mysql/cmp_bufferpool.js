// "버퍼 풀과 페이지" 실습의 모형 결과를 실제 MySQL 실행 결과(bufferpool_probe.out.txt)와 대조한다.
// 실제 버퍼 풀의 칸 수는 바꿀 수 없으므로, 모형에서 밀려나는 일이 없는 조합만 조합마다 대조한다.
// 밀려나는 조합은 "처음 밀려나기 전까지의 읽기"만 대조하고, 밀려남 자체는 버퍼 풀을 실제로 채운 결과(evict 줄)로 확인한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('bufferpool');
const all = fs.readFileSync(path.join(__dirname, 'bufferpool_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
all.filter(l => l.startsWith('#')).forEach(l => console.log(l));
const real = {};
for (const ln of all.filter(l => l.includes(' => '))) { const [k, v] = ln.split(' => '); real[k] = v.split('|'); }
const head = all[0], layout = (all.find(l => l.includes('잎 페이지마다 든 행 수')) || ': ').split(': ')[1].trim().split(' ');
const pageOk = /innodb_page_size=16384 /.test(head) && /페이지 수 x 페이지 크기=(\d+)/.exec(head)[1] === /innodb_buffer_pool_size=(\d+)/.exec(head)[1] && layout.length === 6 && layout.every(x => x.endsWith('=4,4,4,4'));
console.log('페이지 크기 16KB, 버퍼 풀 크기 = 페이지 수 x 페이지 크기, 잎 페이지마다 4행: ' + (pageOk ? '확인' : '다름'));
const ev = /잎 페이지=(\d+)->(\d+)\|계속 읽은 hot_t의 버퍼 풀 안 잎 페이지=(\d+)/.exec(all.find(l => l.startsWith('evict')) || '');
const evictOk = !!ev && +ev[1] > 0 && +ev[2] === 0 && +ev[3] === 4;
console.log('버퍼 풀을 채우면 건드리지 않은 페이지는 밀려나고 계속 읽은 페이지는 남음: ' + (evictOk ? '확인 (' + ev[1] + '개 -> ' + ev[2] + '개, 계속 읽은 테이블은 ' + ev[3] + '개 그대로)' : '다름'));
// 문장마다 전체 상태 값 Innodb_buffer_pool_reads가 그 테이블의 파일 읽기 횟수만큼 늘었는지 (다른 세션의 활동이 섞이면 더 클 수 있다)
let stOk = 0, stAll = 0;
for (const k in real) if (k !== 'evict') for (const mm of real[k][5].matchAll(/SELECT id=\d+\([a-z0-9]+\):파일 읽기\+(\d+),새 잎 페이지\+\d+,Innodb_buffer_pool_reads\+(\d+)/g)) { stAll++; if (mm[1] === mm[2]) stOk++; }
console.log('조회마다 Innodb_buffer_pool_reads가 늘어난 양 = 그 테이블 파일을 읽은 횟수: ' + stOk + ' / ' + stAll + ' (전체 상태 값이라 다른 세션이 섞이면 다를 수 있음)');
const seen = new Set(); let ok = 0, n = 0, pre = 0, m = 0; const bad = [];
for (const c of combos(lesson)) {
  const key = JSON.stringify(c); if (seen.has(key)) continue; seen.add(key);
  const sim = lesson.simulate(Object.assign({}, c)), r = real[c.seq + '|' + c.upd];
  if (!r) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const [pat, updRead, dirtyNow, writesNow, later] = r;
  if (sim.row[2] === '없음') {
    n++;
    const deferred = updRead === '0' && +dirtyNow >= 1 && writesNow === '0' && /파일 쓰기\+[1-9]/.test(later) && /더티 페이지=0/.test(later);
    const realRow = [(pat.match(/M/g) || []).length + '번', (pat.match(/H/g) || []).length + '번', '없음', c.upd ? (deferred ? '커밋 뒤 나중에 (백그라운드)' : '다름: ' + r.slice(1, 5).join('|')) : '고치지 않음'];
    if (JSON.stringify(sim.row) === JSON.stringify(realRow) && sim.trace === pat) ok++; else bad.push(key + '\n   모형 ' + sim.row.join(' / ') + ' [' + sim.trace + ']\n   실제 ' + realRow.join(' / ') + ' [' + pat + ']');
  } else {
    // 모형에서 처음 밀려나는 조회(버퍼 풀이 가득 찬 뒤의 첫 M)까지는 실제와 같아야 한다
    m++;
    const size = +c.size; let cut = 0, loaded = 0;
    for (; cut < sim.trace.length; cut++) if (sim.trace[cut] === 'M' && ++loaded > size) break;
    if (sim.trace.slice(0, cut + 1) === pat.slice(0, cut + 1)) pre++; else bad.push(key + '\n   밀려나기 전까지 모형 ' + sim.trace.slice(0, cut + 1) + ' 실제 ' + pat.slice(0, cut + 1));
  }
}
console.log('일치 ' + ok + ' / ' + n + '  (밀려남이 없는 조합: 조회마다 디스크에서 읽었는지, 고친 뒤 쓰기가 미뤄지는지)');
console.log('밀려나는 조합 ' + m + '개는 실제 버퍼 풀의 칸 수를 바꿀 수 없어 그대로 실행하지 못함. 처음 밀려나기 전까지의 읽기만 대조: ' + pre + ' / ' + m);
bad.forEach(b => console.log('다름: ' + b));
if (!pageOk || !evictOk || bad.length) process.exitCode = 1;
