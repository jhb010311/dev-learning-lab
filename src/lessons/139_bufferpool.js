Lab.register({
  id: 'bufferpool', nav: '버퍼 풀과 페이지', cat: '데이터베이스', mode: 'step',
  title: '행 하나를 읽는데 왜 16KB를 통째로 읽나',
  intro: 'InnoDB는 디스크의 데이터를 행 단위가 아니라 페이지(기본 16KB)라는 덩어리로 읽고 씁니다. 한 번 읽은 페이지는 메모리의 버퍼 풀에 올려 두고, 그다음부터는 디스크에 가지 않고 메모리에서 읽습니다. 고칠 때도 메모리의 페이지만 고치고 디스크에는 나중에 씁니다.',
  terms: ['버퍼 풀', '페이지(InnoDB)', '더티 페이지와 플러시', '캐시 제거(Eviction) 정책', 'Undo 로그와 Redo 로그'],
  controls: [
    { id: 'seq', label: '조회하는 행의 순서', type: 'select', value: 'same', options: [['same', '1번 → 2번 → 1번 (모두 같은 페이지)'], ['spread', '1번 → 5번 → 9번 → 13번 → 1번 (페이지 넷을 차례로)'], ['hot', '1번 → 5번 → 1번 → 9번 → 13번 → 1번 (1번을 자주)']] },
    { id: 'size', label: '버퍼 풀의 칸 수', type: 'range', min: 2, max: 4, value: 3, step: 1, fmt: function (v) { return v + '칸'; }, show: function (c) { return c.seq !== 'same'; }, hint: '실제 버퍼 풀은 수천 칸이 넘습니다. 가득 찼을 때를 보려고 작게 잡았습니다.' },
    { id: 'upd', label: '첫 조회 뒤에 1번 행을 고치고 커밋한다', type: 'check', value: true },
  ],
  // 같은 페이지만 읽는 순서에서는 칸 수가 결과에 영향을 주지 않으므로 기본값으로 둔다
  fix: function (c) { return c.seq === 'same' && +c.size !== 3 ? { size: 3 } : null; },
  presets: [
    { t: '처음 설정으로', q: '3칸 버퍼 풀에서 1번, 2번, 1번 행을 차례로 조회하는 중 첫 조회 뒤에 1번 행을 고쳐 커밋하면 디스크를 몇 번 읽나', d: '2번 행은 처음 읽는데도 디스크에 가지 않습니다. 커밋해도 데이터 파일에는 바로 쓰지 않습니다.', v: { seq: 'same', size: 3, upd: true } },
    { t: '페이지 넷을 세 칸에', q: '1번 → 5번 → 9번 → 13번 → 1번 순서로 조회하고 1번 행을 고치지 않으면', d: '칸이 모자라 1번 행의 페이지가 밀려나고, 다시 읽을 때 디스크에 또 갑니다.', v: { seq: 'spread', size: 3, upd: false } },
    { t: '칸이 넉넉하면', q: '페이지 넷을 차례로 조회하는데 버퍼 풀을 4칸으로 늘리고 1번 행을 고치지 않으면', d: '한 번 읽은 페이지가 모두 남아, 마지막 조회는 메모리에서 끝납니다.', v: { seq: 'spread', size: 4, upd: false } },
    { t: '자주 읽는 페이지는 남는다', q: '1번 → 5번 → 1번 → 9번 → 13번 → 1번으로 1번 행을 자주 조회하고 고치지 않으면', d: '밀려나는 것은 가장 오래 쓰이지 않은 페이지입니다.', v: { seq: 'hot', size: 3, upd: false } },
    { t: '고친 페이지가 밀려나면', q: '1번 → 5번 → 9번 → 13번 → 1번 순서로 조회하는 중 첫 조회 뒤에 1번 행을 고쳐 커밋하면', d: '디스크에 먼저 쓴 다음에야 내보낼 수 있습니다.', v: { seq: 'spread', size: 3, upd: true } },
    { t: '칸이 둘뿐이면', q: '1번 행을 자주 조회하는데 버퍼 풀을 2칸으로 줄이고 1번 행을 고치지 않으면', d: '거의 모든 조회가 디스크로 갑니다.', v: { seq: 'hot', size: 2, upd: false } },
  ],
  ids: function (c) { return { same: [1, 2, 1], spread: [1, 5, 9, 13, 1], hot: [1, 5, 1, 9, 13, 1] }[c.seq]; },
  code: function (c) {
    var ids = this.ids(c), s = '-- item 테이블: 행 16개. 행 하나가 약 3.5KB라서 16KB 페이지 하나에 4개씩 들어간다\n--   페이지 A: 1~4번 행    페이지 B: 5~8번 행\n--   페이지 C: 9~12번 행   페이지 D: 13~16번 행\n-- 시작할 때 버퍼 풀에는 이 테이블의 페이지가 하나도 없다\n';
    ids.forEach(function (id, i) { s += '\nSELECT name FROM item WHERE id = ' + id + ';'; if (i === 0 && c.upd) s += "\n\nSTART TRANSACTION;\nUPDATE item SET name = 'changed' WHERE id = 1;\nCOMMIT;\n"; });
    return s;
  },
  label: function (c) { return { same: '1 → 2 → 1', spread: '1 → 5 → 9 → 13 → 1', hot: '1 → 5 → 1 → 9 → 13 → 1' }[c.seq] + (c.seq === 'same' ? '' : ' · ' + c.size + '칸') + (c.upd ? ' · 1번 행 수정' : ''); },
  columns: ['디스크에서 읽은 횟수', '디스크에 가지 않은 조회', '밀려난 페이지', '고친 페이지를 데이터 파일에 쓴 때'],
  simulate: function (c) {
    var N = c.seq === 'same' ? 3 : +c.size, ids = this.ids(c), ev = [], sum = [], L = ['A', 'B', 'C', 'D'], tick = 0, trace = '', evicted = [], when = c.upd ? '' : '고치지 않음', seenRow = {}, wasOut = {}, dirtyOut = false;
    var st = { slots: [], reads: 0, hits: 0, writes: 0, cur: '', at: -1, act: '', diskNew: false };
    for (var i = 0; i < N; i++) st.slots.push(null);
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function pageOf(id) { return L[Math.floor((id - 1) / 4)]; }
    function find(p) { for (var j = 0; j < N; j++) if (st.slots[j] && st.slots[j].p === p) return j; return -1; }
    function others(id) { var b = Math.floor((id - 1) / 4) * 4, r = []; for (var x = b + 1; x <= b + 4; x++) if (x !== id) r.push(x); return r.join(', '); }
    st.act = 'start';
    push('item 테이블의 행 16개는 디스크의 데이터 파일에 페이지 네 개(A, B, C, D)로 나뉘어 들어 있습니다. 한 페이지는 16KB이고 행이 4개씩 들어 있습니다. 버퍼 풀(메모리)에는 아직 이 테이블의 페이지가 없습니다.', '');
    ids.forEach(function (id, n) {
      var p = pageOf(id), j = find(p), head = 'SELECT … WHERE id = ' + id + ': ' + id + '번 행은 페이지 ' + p + '에 들어 있습니다. ';
      if (j >= 0) {
        st.hits++; trace += 'H'; st.slots[j].last = ++tick; st.cur = p; st.at = j; st.act = 'hit';
        push(head + '페이지 ' + p + '가 이미 버퍼 풀에 있으므로 디스크에 가지 않고 메모리에서 바로 읽습니다.' + (!seenRow[id] ? ' ' + id + '번 행을 읽는 것은 처음이지만, 같은 페이지의 다른 행을 읽을 때 페이지째로 올라와 있었습니다.' : '') + (st.slots[j].dirty && id === 1 ? ' 고친 값 changed가 읽힙니다. 디스크의 데이터 파일에는 아직 옛 값 item1이 있습니다.' : ''), 'good');
      } else {
        trace += 'M';
        j = st.slots.indexOf(null);
        if (j < 0) {
          for (var k = 0; k < N; k++) if (j < 0 || st.slots[k].last < st.slots[j].last) j = k;
          var out = st.slots[j]; evicted.push(out.p); wasOut[out.p] = true; st.cur = out.p; st.at = j;
          if (out.dirty) { st.writes++; st.diskNew = true; when = '밀려나기 직전에'; dirtyOut = true; st.act = 'evictw'; st.slots[j] = null;
            push(head + '페이지 ' + p + '를 디스크에서 읽어 와야 하는데 버퍼 풀에 빈 칸이 없습니다. 가장 오래 쓰이지 않은 페이지 ' + out.p + '를 내보내야 합니다. 그런데 페이지 ' + out.p + '는 고친 내용이 아직 디스크에 없는 더티 페이지입니다. 그냥 버리면 고친 내용이 사라지므로, 먼저 데이터 파일에 쓴 다음에 내보냅니다.', 'bad');
          } else { st.act = 'evict'; st.slots[j] = null;
            push(head + '페이지 ' + p + '를 디스크에서 읽어 와야 하는데 버퍼 풀에 빈 칸이 없습니다. 가장 오래 쓰이지 않은 페이지 ' + out.p + '를 내보냅니다. 디스크에 있는 내용과 같으므로 메모리에서 지우기만 하면 됩니다.', '');
          }
          head = '';
        }
        st.reads++; st.slots[j] = { p: p, dirty: false, last: ++tick }; st.cur = p; st.at = j; st.act = 'miss';
        push((head || '이어서 ') + (head ? '페이지 ' + p + '가 버퍼 풀에 없으므로 ' : '') + '디스크에서 페이지 ' + p + '를 통째로(16KB) 읽어 빈 칸에 올립니다. 같은 페이지의 ' + others(id) + '번 행도 함께 메모리에 올라옵니다.' + (wasOut[p] ? ' 앞에서 한 번 읽었던 페이지지만 밀려났기 때문에 디스크에서 다시 읽어야 합니다.' : ''), wasOut[p] ? 'bad' : '');
      }
      seenRow[id] = true;
      if (n === 0 && c.upd) {
        j = find('A'); st.slots[j].dirty = true; st.slots[j].last = ++tick; st.cur = 'A'; st.at = j; st.act = 'dirty';
        push("UPDATE item SET name = 'changed' WHERE id = 1: 버퍼 풀에 올라와 있는 페이지 A에서 1번 행을 고칩니다. 디스크는 읽지도 쓰지도 않습니다. 이렇게 메모리의 내용이 디스크와 달라진 페이지를 더티 페이지라고 합니다.", '');
        st.act = 'commit';
        push('COMMIT: 무엇을 바꿨는지 적은 기록(Redo 로그)을 디스크에 쓰고 커밋이 끝납니다(MySQL 8의 기본 설정에서는 복제에 쓰는 바이너리 로그도 이때 함께 씁니다). 페이지 A는 더티 상태 그대로 버퍼 풀에 있고, 데이터 파일에는 아직 쓰지 않았습니다. 데이터 파일에 쓰는 일은 나중으로 미룹니다.', '');
      }
    });
    var dj = -1; for (var m = 0; m < N; m++) if (st.slots[m] && st.slots[m].dirty) dj = m;
    if (dj >= 0) {
      st.slots[dj].dirty = false; st.writes++; st.diskNew = true; when = '커밋 뒤 나중에 (백그라운드)'; st.cur = 'A'; st.at = dj; st.act = 'flush';
      push('얼마 뒤: 백그라운드 스레드가 더티 페이지 A를 데이터 파일에 씁니다. 페이지는 버퍼 풀에 그대로 남고 더티 표시만 없어집니다. 언제 쓸지는 InnoDB가 정하며, 커밋은 이것을 기다리지 않습니다.', 'good');
    }
    if (c.seq === 'same') sum.push('InnoDB가 디스크에서 읽는 단위는 행이 아니라 페이지입니다. 1번 행을 읽으면 같은 페이지의 2, 3, 4번 행도 함께 메모리에 올라오므로, 가까이 저장된 행을 이어서 읽을 때는 디스크에 다시 가지 않습니다.');
    else if (evicted.length) sum.push('버퍼 풀이 가득 차면 가장 오래 쓰이지 않은 페이지부터 내보냅니다. 밀려난 페이지를 다시 읽으려면 디스크에 또 가야 합니다.' + (c.seq === 'hot' && find('A') >= 0 && evicted.indexOf('A') < 0 ? ' 자주 읽은 페이지 A는 끝까지 남아 있었고, 그동안 쓰이지 않은 페이지가 밀려났습니다.' : ' 데이터에 비해 버퍼 풀이 너무 작으면 이런 일이 되풀이되어 느려집니다.'));
    else sum.push('칸이 넉넉하면 한 번 읽은 페이지는 계속 메모리에 남습니다. 그래서 DB 서버는 메모리의 큰 부분을 버퍼 풀에 할당합니다.');
    if (c.upd) sum.push(dirtyOut ? '더티 페이지는 디스크에 쓴 다음에야 내보낼 수 있습니다. 실제로는 이렇게 급하게 쓰는 일이 없도록 백그라운드 스레드가 미리 조금씩 써 둡니다.' : '행을 고쳐도 메모리의 페이지만 바뀌고, 데이터 파일에는 나중에 씁니다. 그 사이에 서버가 꺼져도 커밋한 내용을 잃지 않는 것은 Redo 로그 덕분입니다("Undo와 Redo 로그" 실습).');
    return { events: ev, summary: sum, trace: trace, row: [st.reads + '번', st.hits + '번', evicted.length ? evicted.map(function (x) { return '페이지 ' + x; }).join(', ') : '없음', when] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, R = { A: '1~4번', B: '5~8번', C: '9~12번', D: '13~16번' };
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    var oldest = -1; if (s.slots.indexOf(null) < 0) s.slots.forEach(function (x, j) { if (oldest < 0 || x.last < s.slots[oldest].last) oldest = j; });
    H.table(v, ['칸', '올라와 있는 페이지', '든 행', '상태'], s.slots.map(function (x, j) { return { cells: ['칸 ' + (j + 1), x ? { v: '페이지 ' + x.p, cls: s.at === j && s.act === 'hit' ? 'good' : s.at === j ? 'hot' : '' } : '비어 있음', x ? R[x.p] : '-', x ? { v: (x.dirty ? '더티 (디스크와 다름)' : '디스크와 같음') + (j === oldest ? ' · 가장 오래 안 쓰임' : ''), cls: x.dirty ? 'hot' : '' } : '-'] }; }), '버퍼 풀 (메모리)');
  },
  // 그림: 왼쪽은 버퍼 풀(메모리)의 칸들, 오른쪽은 디스크의 데이터 파일에 있는 페이지 넷. 읽어 올 때와 쓸 때 화살표가 생기고, 더티 페이지는 노랗게 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], N = c.seq === 'same' ? 3 : +c.size, s = last ? last.snap : null, L = ['A', 'B', 'C', 'D'], R = { A: '1~4번 행', B: '5~8번 행', C: '9~12번 행', D: '13~16번 행' }, j;
    if (!s) { s = { slots: [], reads: 0, hits: 0, writes: 0, cur: '', at: -1, act: '', diskNew: false }; for (j = 0; j < N; j++) s.slots.push(null); }
    var oldest = -1; if (s.slots.indexOf(null) < 0) s.slots.forEach(function (x, k) { if (oldest < 0 || x.last < s.slots[oldest].last) oldest = k; });
    P.size(680, 316);
    P.region('bp', 16, 12, 316, 236, '버퍼 풀 (메모리)');
    for (j = 0; j < N; j++) {
      var x = s.slots[j], on = s.at === j;
      P.box('s' + j, 30, 44 + j * 50, 288, 42, x ? { cls: (x.dirty ? 'hot' : on && s.act === 'hit' ? 'good' : 'wait') + (on ? ' now' : ''), title: '페이지 ' + x.p + ' (' + R[x.p] + ')', sub: (x.dirty ? '더티: 디스크와 다름' : '디스크와 같음') + (j === oldest ? ' · 가장 오래 안 쓰임' : '') } : { cls: 'ghost' + (on ? ' now' : ''), title: '빈 칸', sub: on && s.act.indexOf('evict') === 0 ? '페이지 ' + s.cur + '를 내보냄' : ' ' });
    }
    P.region('dk', 380, 12, 284, 236, '디스크의 데이터 파일');
    L.forEach(function (p, k) { P.box('d' + p, 394, 44 + k * 50, 256, 42, { cls: 'plain' + (s.cur === p && (s.act === 'miss' || s.act === 'flush' || s.act === 'evictw') ? ' now' : ''), title: '페이지 ' + p, right: R[p], sub: p === 'A' ? '1번 행의 name = ' + (s.diskNew ? 'changed' : 'item1') : '16KB' }); });
    if (s.act === 'miss') P.arrow('io', 'd' + s.cur + ':l', 's' + s.at + ':r', { cls: 'hot', label: '읽기' });
    if (s.act === 'flush' || s.act === 'evictw') P.arrow('io', 's' + s.at + ':r', 'd' + s.cur + ':l', { cls: 'good', label: '쓰기' });
    P.box('c1', 16, 262, 210, 38, { cls: s.act === 'miss' ? 'hot' : 'plain', title: '디스크에서 읽음', right: s.reads + '번' });
    P.box('c2', 235, 262, 210, 38, { cls: s.act === 'hit' ? 'good' : 'plain', title: '디스크 없이 읽음', right: s.hits + '번' });
    P.box('c3', 454, 262, 210, 38, { cls: s.act === 'flush' || s.act === 'evictw' ? 'good' : 'plain', title: '데이터 파일에 씀', right: s.writes + '번' });
    P.note('왼쪽은 메모리의 버퍼 풀, 오른쪽은 디스크의 데이터 파일입니다. 파란 칸은 디스크와 내용이 같은 페이지, 노란 칸은 고쳤지만 아직 디스크에 쓰지 않은 더티 페이지입니다. 실제 버퍼 풀은 칸이 수천 개가 넘고(대조한 MySQL은 8192칸) 내보낼 페이지를 고르는 방법도 더 정교합니다. 이 그림의 칸 수와 순서는 개념을 보이기 위한 모형입니다.');
  },
  assume: '칸이 2~4개뿐인 버퍼 풀과 "가장 오래 쓰이지 않은 페이지를 내보낸다"는 단순한 규칙으로 만든 개념 모형입니다. 실제 InnoDB는 목록을 새 구간과 오래된 구간으로 나누고 새로 읽은 페이지를 목록의 중간에 넣는 변형된 LRU를 쓰며, 더티 페이지는 백그라운드의 페이지 클리너 스레드가 목록의 끝 쪽을 훑어 미리 써 둡니다(MySQL 8.4 참조 설명서 17.5.1 Buffer Pool, 17.8.3.5 Configuring Buffer Pool Flushing). 또 실제 조회는 행이 든 페이지 말고도 인덱스의 위쪽 페이지를 함께 읽습니다. 화면의 칸 수와 순서는 실제와 같지 않습니다. 실제로 확인한 것은 다음과 같습니다(검증 환경의 MySQL 8.4.11). 페이지 크기는 16384바이트이고, 버퍼 풀 134217728바이트는 8192페이지였습니다. 행 하나가 약 3.5KB인 16행짜리 테이블을 만들어 잎 페이지마다 4행씩 들어간 것을 확인한 뒤, 밀려나는 일이 없는 여섯 조합(같은 페이지 순서 둘, 칸이 4개인 경우 넷)을 화면과 같은 순서로 실행해 조회마다 그 테이블의 데이터 파일을 읽었는지를 대조했습니다. 처음 읽는 페이지에서만 파일 읽기와 Innodb_buffer_pool_reads가 늘었고(첫 조회는 인덱스의 위쪽 페이지까지 3번, 그다음 새 페이지는 1번), 이미 올라온 페이지의 다른 행이나 같은 행을 읽을 때는 0이었습니다. UPDATE와 COMMIT 직후에는 파일 읽기와 쓰기가 0번이고 더티 페이지가 1개였으며, 데이터 파일에는 나중에 쓰였습니다(약 5초 뒤에 저절로 쓰인 경우도 있었고, 20초가 지나도 쓰이지 않아 그 테이블만 강제로 쓰게 한 경우도 있었습니다). 버퍼 풀이 가득 찰 때의 동작은 다른 테이블에 수십 MB를 넣어 확인했습니다. 버퍼 풀의 빈 페이지가 20개 안팎까지 줄었고, 그동안 건드리지 않은 테이블 여섯 개의 페이지 24개는 모두 버퍼 풀에서 사라져 다시 읽을 때 디스크에서 읽혔으며, 계속 읽은 테이블의 페이지 4개는 남아 있었습니다. 칸이 모자라 밀려나는 여덟 조합은 실제 버퍼 풀의 칸 수를 바꿀 수 없어 그대로 실행하지 못했고, 밀려나기 전까지의 읽기만 대조했습니다. 오래 쓰이지 않은 페이지부터 내보낸다는 순서는 문서 17.5.1의 설명을 따랐습니다. 더티 페이지는 디스크에 쓴 다음에야 내보낸다는 것은 InnoDB의 동작으로 알려진 내용이지만, 이번에는 실행으로도 문서의 문장으로도 직접 확인하지 못했습니다. 다른 사람과 함께 쓰는 서버라서 전체 상태 값에는 다른 세션의 활동이 섞일 수 있습니다.',
});
