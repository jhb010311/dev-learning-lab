Lab.register({
  id: 'paging', nav: 'OFFSET과 키셋 페이징', cat: '데이터베이스', mode: 'step',
  title: '뒤쪽 페이지일수록 느려지는 이유',
  intro: '게시글 목록을 최신순으로 페이지마다 나눠 보여 줍니다. OFFSET 방식은 앞 페이지의 행을 전부 읽고 버린 뒤에야 원하는 페이지에 도착합니다. 키셋(커서) 방식은 "마지막으로 본 글 다음부터"를 인덱스로 바로 찾아갑니다. 페이지 번호를 키워 가며 읽는 행 수를 비교하세요.',
  terms: ['OFFSET 페이징과 키셋(커서) 페이징', '인덱스', 'B-트리 인덱스'], ranks: ['tuning', 'index'],
  controls: [
    { id: 'how', label: '페이징 방식', type: 'select', value: 'offset', options: [['offset', 'OFFSET (페이지 번호)'], ['keyset', '키셋 (마지막으로 본 글의 id 기준)']] },
    { id: 'page', label: '보려는 페이지', type: 'select', value: '1000', options: [['1', '1페이지'], ['10', '10페이지'], ['100', '100페이지'], ['1000', '1,000페이지'], ['10000', '10,000페이지']] },
    { id: 'size', label: '한 페이지의 글 수', type: 'select', value: '20', options: [['10', '10개'], ['20', '20개'], ['50', '50개']] },
    { id: 'ins', label: '다음 페이지로 넘어가는 사이에 새 글 1개가 등록된다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: 'OFFSET으로 1,000페이지. 2만 행을 읽어 20행만 씁니다.', v: { how: 'offset', page: '1000', size: '20', ins: false } },
    { t: '같은 위치를 키셋으로', d: '필요한 20행만 읽습니다.', v: { how: 'keyset', page: '1000', size: '20', ins: false } },
    { t: 'OFFSET 1페이지', d: '앞쪽 페이지는 OFFSET도 빠릅니다.', v: { how: 'offset', page: '1', size: '20', ins: false } },
    { t: 'OFFSET 10,000페이지', d: '버리는 행이 20만 개가 됩니다.', v: { how: 'offset', page: '10000', size: '20', ins: false } },
    { t: '넘기는 사이 새 글 등록 (OFFSET)', d: '방금 본 글이 다음 페이지에 또 나옵니다.', v: { how: 'offset', page: '10', size: '20', ins: true } },
    { t: '넘기는 사이 새 글 등록 (키셋)', d: '기준이 글의 id라서 밀리지 않습니다.', v: { how: 'keyset', page: '10', size: '20', ins: true } },
  ],
  num: function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  code: function (c) {
    var p = +c.page, s = +c.size, last = 1000000 - (p - 1) * s + 1;
    if (c.how === 'offset') return '-- ' + this.num(p) + '페이지 (id 내림차순 = 최신순)\nSELECT id, title, created_at\n  FROM post\n ORDER BY id DESC\n LIMIT ' + s + ' OFFSET ' + (p - 1) * s + ';';
    return '-- 앞 페이지에서 마지막으로 본 글의 id = ' + last + '\nSELECT id, title, created_at\n  FROM post\n' + (p > 1 ? ' WHERE id < ' + last + '             -- 그 글보다 오래된 것부터\n' : '') + ' ORDER BY id DESC\n LIMIT ' + s + ';';
  },
  label: function (c) { return (c.how === 'offset' ? 'OFFSET' : '키셋') + ' · ' + this.num(+c.page) + '페이지 · ' + c.size + '개씩' + (c.ins ? ' · 새 글 등록' : ''); },
  columns: ['읽은 행', '버린 행', '돌려준 행', '새 글이 끼어들 때'],
  simulate: function (c) {
    var p = +c.page, s = +c.size, off = (p - 1) * s, num = this.num, ev = [], sum = [], N = 1000000, firstId = N - off, effect = '해당 없음';
    function push(x, k, snap) { ev.push({ s: x, k: k, snap: snap }); }
    var read, skip;
    if (c.how === 'offset') {
      read = off + s; skip = off;
      push('post 테이블에는 글이 100만 개 있고 id가 클수록 최신입니다. ' + num(p) + '페이지를 OFFSET ' + num(off) + '으로 요청합니다.', '', { read: 0, skip: 0, out: 0 });
      push('DB는 "' + num(off) + '번째 다음"이 어디인지 미리 알 수 없습니다. 가장 최신 글부터 인덱스를 따라 하나씩 세면서 읽습니다. ' + num(off) + '행을 읽고 그대로 버립니다.', off > 1000 ? 'bad' : '', { read: off, skip: off, out: 0 });
      push('그다음 ' + s + '행을 읽어 결과로 돌려줍니다. id ' + num(firstId) + '부터 ' + num(firstId - s + 1) + '까지입니다.', '', { read: read, skip: skip, out: s });
      sum.push(s + '행을 돌려주려고 ' + num(read) + '행을 읽고 ' + num(skip) + '행을 버렸습니다. 버리는 양은 페이지 번호에 비례해서 늘어납니다. 뒤쪽 페이지를 열 때마다 앞의 모든 행을 다시 읽는 셈입니다.');
    } else {
      read = s; skip = 0;
      push('post 테이블에는 글이 100만 개 있고 id가 클수록 최신입니다. 앞 페이지에서 마지막으로 본 글의 id를 기억해 두었다가 그것을 조건으로 요청합니다.', '', { read: 0, skip: 0, out: 0 });
      push(p > 1 ? 'DB는 id 인덱스(B-트리)에서 id < ' + num(firstId + 1) + '인 첫 위치를 몇 단계 만에 바로 찾아갑니다. 앞쪽 행은 한 건도 읽지 않습니다.' : '첫 페이지는 조건 없이 가장 최신 글부터 읽습니다.', 'good', { read: 0, skip: 0, out: 0 });
      push('그 위치부터 ' + s + '행을 읽어 돌려줍니다. id ' + num(firstId) + '부터 ' + num(firstId - s + 1) + '까지입니다.', 'good', { read: s, skip: 0, out: s });
      sum.push('몇 번째 페이지든 ' + s + '행만 읽습니다. 다만 "1,000페이지로 바로 가기"처럼 임의의 페이지로 건너뛸 수는 없고, 다음·이전으로만 이동할 수 있습니다. 무한 스크롤이나 "더 보기"에 맞는 방식입니다.');
    }
    if (c.ins) {
      if (c.how === 'offset') { effect = '중복 노출 1건'; push('사용자가 다음 페이지를 누르기 전에 새 글이 하나 등록됐습니다. 최신순 목록의 맨 앞에 새 글이 끼어들어 기존 글들이 전부 한 칸씩 뒤로 밀립니다.', '', { read: read, skip: skip, out: s, shift: 1 }); push('다음 페이지를 OFFSET ' + num(off + s) + '으로 요청합니다. 한 칸씩 밀렸으므로, 방금 본 페이지의 마지막 글(id ' + num(firstId - s + 1) + ')이 다음 페이지의 첫 줄에 다시 나옵니다. 반대로 글이 삭제되면 한 건을 건너뛰게 됩니다.', 'bad', { read: read, skip: skip, out: s, dup: firstId - s + 1 }); sum.push('OFFSET은 "앞에서 몇 번째"라는 위치 기준이라서, 그 사이 데이터가 추가되거나 삭제되면 같은 글이 두 번 보이거나 빠집니다.'); }
      else { effect = '영향 없음'; push('사용자가 다음 페이지를 누르기 전에 새 글이 하나 등록됐습니다.', '', { read: read, skip: 0, out: s, shift: 1 }); push('다음 페이지를 "id < ' + num(firstId - s + 1) + '" 조건으로 요청합니다. 기준이 위치가 아니라 글의 id이므로, 새 글이 앞에 끼어들어도 이어서 볼 글은 그대로입니다. 중복도 누락도 없습니다.', 'good', { read: read, skip: 0, out: s }); sum.push('키셋은 "이 글 다음부터"라는 값 기준이라서 중간에 데이터가 바뀌어도 목록이 밀리지 않습니다.'); }
    }
    return { events: ev, summary: sum, firstId: firstId, row: [num(read) + '행', num(skip) + '행', s + '행', effect] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, num = this.num, last = shown[shown.length - 1], s = last ? last.snap : { read: 0, skip: 0, out: 0 }, size = +c.size, mx = Math.max(1, (+c.page - 1) * size + size);
    H.counters(v, [[num(s.read), '읽은 행'], [num(s.skip), '읽고 버린 행'], [num(s.out), '돌려준 행']]);
    var ln = H.lanes(v);
    H.lane(ln, '버린 행', num(s.skip) + '행', s.skip ? 'bad' : 'none', s.skip ? s.skip / mx : undefined);
    H.lane(ln, '쓴 행', num(s.out) + '행', s.out ? 'good' : 'none', s.out ? Math.max(0.01, s.out / mx) : undefined);
    if (s.out) H.text(v, '이 페이지에 나온 글: id ' + num(sim.firstId) + ' ~ ' + num(sim.firstId - size + 1) + (s.dup ? ' · 다음 페이지 첫 줄에 id ' + num(s.dup) + '번 글이 다시 나옴' : ''));
    if (s.shift) H.text(v, '새 글(id 1,000,001)이 목록 맨 앞에 추가됨');
  },
  assume: '글 100만 개가 id 순으로 정렬돼 있고 id에 인덱스(기본 키)가 있다고 가정했습니다. OFFSET으로 건너뛰는 행도 서버 안에서는 계산해야 하므로 OFFSET이 크면 비효율적일 수 있다는 것은 PostgreSQL 공식 문서(LIMIT and OFFSET)의 설명입니다. MySQL 문서에서는 같은 문장을 확인하지 못했습니다. 정렬 기준이 id가 아니라 등록 시각처럼 값이 겹칠 수 있는 컬럼이면, 키셋 조건에 (등록 시각, id)처럼 겹치지 않는 컬럼을 함께 써야 합니다. 행 수는 계산값이며 실제 DB에서 측정한 것은 아닙니다. 결과의 내용은 실제 SQL 엔진(SQLite)에서 확인했습니다. 두 방식이 같은 페이지에서 같은 글을 돌려줬고, 새 글이 하나 끼어든 뒤 OFFSET의 다음 페이지 첫 줄에는 앞 페이지의 마지막 글이 다시 나왔으며 키셋에서는 그다음 글이 나왔습니다.',
});
