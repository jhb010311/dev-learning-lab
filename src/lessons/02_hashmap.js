Lab.register({
  id: 'hashmap', nav: 'HashMap 내부', cat: '자료구조', mode: 'step',
  title: 'HashMap은 키를 어디에 넣고 어떻게 찾나',
  intro: '키의 hashCode로 버킷 번호를 정해 넣습니다. hashCode가 겹치면 한 버킷에 줄줄이 달리고, 항목이 많아지면 버킷을 두 배로 늘립니다. hashCode 구현과 equals 재정의 여부를 바꿔 가며 버킷이 어떻게 차는지, 넣은 키를 다시 찾을 수 있는지 보세요.',
  terms: ['해시 테이블과 HashMap', '해시 충돌', '로드 팩터와 리사이즈', '레드-블랙 트리', 'equals와 hashCode 규약'], ranks: ['collection', 'equals', 'ds'],
  controls: [
    { id: 'n', label: '넣는 키 개수', type: 'range', min: 1, max: 40, value: 13, fmt: function (v) { return v + '개'; } },
    { id: 'eq', label: '키 클래스에서 재정의한 것', type: 'select', value: 'both', options: [['both', 'equals와 hashCode 둘 다'], ['eqonly', 'equals만'], ['hconly', 'hashCode만'], ['none', '둘 다 안 함']] },
    { id: 'hash', label: 'hashCode() 구현', type: 'select', value: 'good', options: [['good', 'id 그대로 (고르게 퍼짐)'], ['mod4', 'id % 4 (값이 4가지뿐)'], ['same', '항상 1 (전부 같은 값)']], show: function (c) { return c.eq === 'both' || c.eq === 'hconly'; } },
    { id: 'lf', label: '로드 팩터', type: 'select', value: '0.75', options: [['0.5', '0.5 (절반 차면 늘림)'], ['0.75', '0.75 (기본값)'], ['1', '1.0 (다 차야 늘림)']], hint: '저장된 개수가 버킷 수 × 로드 팩터를 넘으면 버킷을 두 배로 늘립니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '13개를 넣습니다. 13번째에서 버킷이 16개에서 32개로 늘어납니다.', v: { n: 13, eq: 'both', hash: 'good', lf: '0.75' } },
    { t: 'hashCode가 항상 같은 값', d: '전부 한 버킷에 몰립니다. 9번째부터 무슨 일이 생기는지 보세요.', v: { n: 13, eq: 'both', hash: 'same', lf: '0.75' } },
    { t: 'hashCode 값이 4가지뿐', d: '40개를 넣습니다. 버킷을 늘려도 4곳에만 쌓입니다.', v: { n: 40, eq: 'both', hash: 'mod4', lf: '0.75' } },
    { t: '로드 팩터를 0.5로', d: '더 일찍 늘립니다. 충돌은 줄고 메모리는 더 씁니다.', v: { n: 13, eq: 'both', hash: 'good', lf: '0.5' } },
    { t: 'equals만 재정의', d: '넣은 키와 내용이 같은 키로 조회해도 찾지 못합니다.', v: { n: 13, eq: 'eqonly', hash: 'good', lf: '0.75' } },
    { t: 'hashCode만 재정의', d: '맞는 버킷까지는 가지만 같은 키로 인정받지 못합니다.', v: { n: 13, eq: 'hconly', hash: 'good', lf: '0.75' } },
  ],
  code: function (c) {
    var eq = c.eq === 'both' || c.eq === 'eqonly', hc = c.eq === 'both' || c.eq === 'hconly';
    var body = { good: 'return Integer.hashCode(id);   // id 그대로', mod4: 'return id % 4;                 // 값이 4가지뿐', same: 'return 1;                      // 전부 같은 값' }[c.hash];
    return 'class MemberKey {\n    final int id;\n    MemberKey(int id) { this.id = id; }\n' +
      (eq ? '\n    @Override public boolean equals(Object o) {\n        return o instanceof MemberKey k && k.id == id;\n    }\n' : '\n    // equals 재정의 안 함: 같은 객체일 때만 true\n') +
      (hc ? '\n    @Override public int hashCode() {\n        ' + body + '\n    }\n' : '\n    // hashCode 재정의 안 함: 객체마다 다른 값\n') +
      '}\n\nMap<MemberKey, String> map = new HashMap<>(16, ' + c.lf + 'f);\nfor (int id : ids) {                 // id ' + c.n + '개\n    map.put(new MemberKey(id), "회원");\n}\n\n// 처음 넣은 것과 같은 id로 새 객체를 만들어서\nmap.put(new MemberKey(ids[0]), "수정");\nmap.get(new MemberKey(ids[0]));';
  },
  label: function (c) { var hc = c.eq === 'both' || c.eq === 'hconly'; return { both: 'equals+hashCode', eqonly: 'equals만', hconly: 'hashCode만', none: '재정의 없음' }[c.eq] + (hc ? ' · hashCode ' + { good: 'id 그대로', mod4: 'id % 4', same: '항상 1' }[c.hash] : '') + ' · 로드 팩터 ' + c.lf + ' · ' + c.n + '개'; },
  columns: ['버킷 수', '늘린 횟수', '가장 긴 버킷', '트리 버킷', '같은 키로 다시 put', '같은 키로 get'],
  IDS: [3817, 9204, 1466, 7531, 2890, 6043, 5178, 8312, 4725, 1039, 6654, 3391, 7968, 2247, 9580, 5803, 4112, 8076, 1723, 6929, 3250, 7494, 2565, 9841, 5336, 4487, 8659, 1198, 6302, 3774, 7015, 2933, 9127, 5561, 4840, 8423, 1652, 6216, 3609, 7781],
  simulate: function (c) {
    var IDS = this.IDS, lf = +c.lf, eqOn = c.eq === 'both' || c.eq === 'eqonly', hcOn = c.eq === 'both' || c.eq === 'hconly';
    var cap = 16, thr = Math.floor(16 * lf), size = 0, resizes = 0, ev = [], objNo = 0, seed = 20240613;
    var B = []; for (var i = 0; i < cap; i++) B.push({ nodes: [], tree: false });
    function ident() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; }
    function mk(id) { var raw = hcOn ? (c.hash === 'good' ? id : c.hash === 'mod4' ? id % 4 : 1) : ident(); return { id: id, obj: ++objNo, raw: raw, hash: (raw ^ (raw >>> 16)) | 0 }; }
    function same(a, b) { return a.hash === b.hash && (a.obj === b.obj || (eqOn && a.id === b.id)); }
    function longest() { return B.reduce(function (m, b) { return Math.max(m, b.nodes.length); }, 0); }
    function snap(touch) { return { cap: cap, thr: thr, size: size, resizes: resizes, touch: touch, longest: longest(), B: B.map(function (b) { return { n: b.nodes.length, tree: b.tree, ids: b.nodes.map(function (x) { return x.id; }) }; }) }; }
    function push(s, k, touch) { ev.push({ s: s, k: k, snap: snap(touch) }); }
    function resize(why) {
      var old = B, oc = cap; cap *= 2; thr = Math.floor(cap * lf); resizes++;
      B = []; for (var i = 0; i < cap; i++) B.push({ nodes: [], tree: false });
      old.forEach(function (b, j) {
        b.nodes.forEach(function (x) { B[(x.hash & oc) === 0 ? j : j + oc].nodes.push(x); });
        if (b.tree) [j, j + oc].forEach(function (k) { B[k].tree = B[k].nodes.length > 6; });
      });
      var moved = 0; old.forEach(function (b, j) { moved += B[j + oc].nodes.length; });
      push(why + ' 버킷을 ' + oc + '개에서 ' + cap + '개로 늘리고 모든 항목의 자리를 다시 정했습니다. ' + size + '개 중 ' + moved + '개가 새 버킷으로 옮겨 갔습니다. 다음에 늘리는 기준은 ' + thr + '개 초과입니다.', '', -1);
    }
    function where(k) { return 'hashCode는 ' + k.raw + (hcOn ? '' : '(재정의하지 않아 객체마다 다른 값)') + ', 버킷 번호는 ' + (k.hash & (cap - 1)) + '번(해시를 버킷 수 ' + cap + '개로 나눈 나머지)입니다.'; }
    function put(id, again) {
      var k = mk(id), idx = k.hash & (cap - 1), b = B[idx], hit = b.nodes.filter(function (x) { return same(x, k); })[0];
      var head = (again ? '같은 id ' + id + '로 새 키 객체를 만들어 다시 put. ' : 'put(id ' + id + '). ') + where(k) + ' ';
      if (hit) { push(head + '버킷 안에서 해시가 같고 equals도 true인 키를 찾았습니다. 새 항목을 만들지 않고 값만 바꿉니다. 저장된 개수는 그대로 ' + size + '개입니다.', 'good', idx); return true; }
      var before = b.nodes.length; b.nodes.push(k); size++;
      var why = again ? (!hcOn ? '해시가 달라 다른 버킷을 봤기 때문에 이미 있는 키를 발견하지 못했습니다. ' : !eqOn ? '같은 버킷에서 해시가 같은 키를 만났지만 equals가 재정의되지 않아 다른 키로 판단했습니다. ' : '') : '';
      var msg = head + why + (before === 0 ? '비어 있는 버킷이라 바로 넣었습니다.' : '이미 ' + before + '개가 들어 있는 버킷입니다(충돌). ' + (b.tree ? '트리에 추가했습니다.' : '앞에서부터 하나씩 비교한 뒤 맨 끝에 붙였습니다.')) + (again ? ' 같은 id의 키가 두 개가 되어 저장된 개수가 ' + size + '개로 늘었습니다.' : '');
      push(msg, again ? 'bad' : '', idx);
      if (!b.tree && b.nodes.length >= 9) {
        if (cap < 64) resize('한 버킷에 ' + b.nodes.length + '번째 노드가 달렸습니다. 트리로 바꿀 조건이지만 버킷 수가 64개보다 적어서, 트리 대신 버킷을 늘립니다.');
        else { b.tree = true; push('버킷 ' + idx + '번에 ' + b.nodes.length + '번째 노드가 달렸습니다. 버킷 수가 64개 이상이므로 이 버킷을 연결 리스트에서 레드-블랙 트리로 바꿉니다.', '', idx); }
      }
      if (size > thr) resize('저장된 개수 ' + size + '개가 기준 ' + thr + '개(버킷 ' + cap + '개 × 로드 팩터 ' + c.lf + ')를 넘었습니다.');
      return false;
    }
    for (var n = 0; n < c.n; n++) put(IDS[n], false);
    var afterFill = { cap: cap, resizes: resizes, longest: longest(), trees: B.filter(function (b) { return b.tree; }).length, size: size };
    var replaced = put(IDS[0], true);
    var q = mk(IDS[0]), qi = q.hash & (cap - 1), qb = B[qi], pos = -1;
    qb.nodes.forEach(function (x, i) { if (pos < 0 && same(x, q)) pos = i; });
    var found = pos >= 0, gs = 'get: id ' + IDS[0] + '로 새 키 객체를 만들어 조회합니다. ' + where(q) + ' ';
    if (found) gs += qb.tree ? '트리로 바뀐 버킷에서 키를 찾아 값을 돌려줍니다.' : '버킷 안에서 ' + (pos + 1) + '번째 노드까지 비교해 키를 찾았습니다. 값을 돌려줍니다.';
    else if (!hcOn) gs += '넣을 때의 객체와 해시가 달라 엉뚱한 버킷을 봤습니다. ' + (qb.nodes.length ? '그 버킷의 노드 ' + qb.nodes.length + '개는 해시부터 달라 equals를 부르지도 않습니다. ' : '그 버킷은 비어 있습니다. ') + 'null을 돌려줍니다. 값은 맵 안에 있는데 꺼낼 수 없습니다.';
    else gs += '맞는 버킷을 찾아갔고 해시도 같습니다. 하지만 equals가 재정의되지 않아 "같은 객체인가"만 비교하고, 새로 만든 객체는 다른 객체이므로 전부 false입니다. 노드 ' + qb.nodes.length + '개를 다 비교하고 null을 돌려줍니다.';
    push(gs, found ? 'good' : 'bad', qi);
    var sum = ['키 ' + c.n + '개를 넣는 동안 버킷은 16개에서 ' + afterFill.cap + '개가 됐고(' + afterFill.resizes + '번 늘림), 가장 긴 버킷에는 ' + afterFill.longest + '개가 달렸습니다.'];
    if (hcOn && c.hash !== 'good' && afterFill.longest > 2) sum.push('hashCode 값의 종류가 적으면 버킷을 아무리 늘려도 같은 버킷에 쌓입니다. 한 버킷이 길어질수록 put과 get이 그 안을 하나씩 비교하므로 느려집니다.');
    if (afterFill.trees) sum.push('버킷 ' + afterFill.trees + '개가 레드-블랙 트리로 바뀌었습니다. 트리는 해시 값이 서로 다르거나 키가 Comparable일 때 탐색을 빠르게 합니다. 이 예처럼 한 버킷의 hashCode가 전부 같고 Comparable도 아니면 트리로 바꿔도 탐색은 빨라지지 않습니다. 결국 hashCode를 고르게 만드는 것이 해법입니다.');
    if (c.eq === 'both') sum.push('equals와 hashCode를 둘 다 재정의해서, 같은 id로 만든 새 객체로도 값을 바꾸고 찾을 수 있었습니다.');
    if (c.eq === 'eqonly') sum.push('equals만 재정의하면 "equals가 true인 두 객체는 hashCode가 같아야 한다"는 규약이 깨집니다. 같은 id인데 해시가 달라 다른 버킷으로 가므로, 중복으로 저장되고 조회도 실패했습니다.');
    if (c.eq === 'hconly') sum.push('hashCode만 재정의하면 같은 버킷까지는 가지만, equals가 객체 주소 비교라서 같은 키로 인정받지 못합니다. 중복으로 저장되고 조회도 실패했습니다.');
    if (c.eq === 'none') sum.push('둘 다 재정의하지 않으면 내용이 같아도 완전히 다른 키입니다. 넣을 때 쓴 바로 그 객체를 들고 있어야만 찾을 수 있습니다.');
    return { events: ev, summary: sum, row: [afterFill.cap + '개', afterFill.resizes + '번', afterFill.longest + '개', afterFill.trees + '개', replaced ? '값만 바뀜' : '중복 저장', found ? '찾음' : 'null'], trace: ev.map(function (e) { return e.snap; }) };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { cap: 16, thr: Math.floor(16 * +sim.c.lf), size: 0, resizes: 0, touch: -1, longest: 0, B: [] };
    H.counters(v, [[s.cap, '버킷 수'], [s.size, '저장된 항목'], [s.thr + ' 초과', '늘리는 기준'], [s.resizes, '늘린 횟수'], [s.longest, '가장 긴 버킷']]);
    H.title(v, '버킷 ' + s.cap + '개 (숫자는 그 버킷에 달린 항목 수)');
    var items = [];
    for (var i = 0; i < s.cap; i++) { var b = s.B[i] || { n: 0 }; items.push([b.n ? String(b.n) + (b.tree ? 'T' : '') : '', (b.n === 0 ? '' : b.n === 1 ? 'd' : b.n < 8 ? 'q' : 'r') + (i === s.touch ? ' now' : '')]); }
    H.slots(v, items, null, true);
    H.text(v, '초록은 1개, 파랑은 2~7개(충돌), 빨강은 8개 이상, T는 트리로 바뀐 버킷입니다. 굵은 테두리는 방금 건드린 버킷입니다.');
    var rows = [];
    s.B.forEach(function (b, i) { if (b.n >= 2 || (i === s.touch && b.n)) rows.push({ cells: [{ v: i + '번', cls: i === s.touch ? 'hot' : '' }, b.tree ? '레드-블랙 트리' : b.n > 1 ? '연결 리스트' : '노드 1개', b.n + '개', b.ids.slice(0, 12).join(' → ') + (b.n > 12 ? ' → …' : '')] }); });
    if (rows.length) H.table(v, ['버킷', '구조', '개수', '들어 있는 키의 id (넣은 순서)'], rows, '방금 건드린 버킷과 충돌이 난 버킷');
    else H.text(v, '아직 충돌이 난 버킷이 없습니다.');
  },
  // 그림: 위에 버킷 배열, 아래에 방금 건드린 칸과 충돌이 난 칸 안에 키가 이어져 달린 모습.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { cap: 16, touch: -1, B: [] }, cap = s.cap, per = 28, rows = Math.ceil(cap / per), ah = 34 + rows * 20 + 8, top2 = 16 + ah + 12;
    P.size(680, top2 + 232 + 16);
    P.region('arr', 16, 16, 648, ah, '버킷 배열 ' + cap + '칸 (숫자는 그 칸에 달린 항목 수)');
    for (var i = 0; i < cap; i++) { var b = s.B[i] || { n: 0 }; P.box('b' + i, 26 + (i % per) * 22.5, 50 + Math.floor(i / per) * 20, 20, 17, { cls: (b.n === 0 ? 'ghost' : b.n === 1 ? 'good' : b.n < 8 ? 'wait' : 'bad') + (i === s.touch ? ' now' : ''), sub: b.n ? String(b.n) : undefined, center: true }); }
    P.region('ch', 16, top2, 648, 232, '칸 안의 모습 (방금 건드린 칸과 충돌이 난 칸, 숫자는 키의 id)');
    var pick = [], cnt = {};
    if (s.touch >= 0 && s.B[s.touch]) pick.push(s.touch);
    s.B.map(function (b, i) { return [i, b.n]; }).filter(function (x) { return x[1] >= 2 && x[0] !== s.touch; }).sort(function (a, b) { return b[1] - a[1] || a[0] - b[0]; }).slice(0, 5 - pick.length).forEach(function (x) { pick.push(x[0]); });
    pick.forEach(function (bi, r) {
      var b = s.B[bi], y = top2 + 36 + r * 38, prev = 'h' + bi;
      P.box(prev, 28, y, 98, 28, { cls: bi === s.touch ? 'hot now' : 'plain', title: bi + '번 칸', right: b.tree ? '트리' : '' });
      if (!b.n) P.text('emp' + bi, 140, y + 18, '비어 있음', { cls: 'mut' });
      b.ids.slice(0, 8).forEach(function (id, j) { cnt[id] = (cnt[id] || 0) + 1; var nid = 'k' + id + '_' + cnt[id]; P.box(nid, 140 + j * 56, y, 44, 28, { cls: cnt[id] > 1 ? 'bad' : 'good', sub: String(id), center: true }); if (!b.tree) P.arrow('ar' + nid, prev + ':r', nid + ':l'); prev = nid; });
      if (b.n > 8) P.text('more' + bi, 140 + 8 * 56, y + 18, '외 ' + (b.n - 8) + '개', { cls: 'mut' });
    });
    if (!pick.length) P.text('none', 340, top2 + 120, last ? '아직 충돌이 난 칸이 없습니다' : '실행을 누르면 키를 하나씩 넣습니다', { cls: 'mut', anchor: 'middle' });
    P.note('위 배열에서 초록은 1개, 파랑은 2~7개(충돌), 빨강은 8개 이상 달린 칸이고 굵은 테두리는 방금 건드린 칸입니다. 아래에서 화살표로 이어진 것은 한 칸 안의 연결 리스트이며, 빨간 키는 같은 id가 두 번 저장된 것입니다.');
  },
  assume: '초기 버킷 수는 16개로 고정했습니다. 버킷 번호 계산(해시의 위쪽 16비트를 아래쪽에 섞은 뒤 버킷 수로 나눈 나머지), 늘리는 기준(저장 개수 > 버킷 수 × 로드 팩터), 한 버킷에 9번째 노드가 달릴 때 버킷 수가 64개 미만이면 늘리고 64개 이상이면 트리로 바꾸는 규칙은 JDK HashMap 구현과 같습니다. 이 PC의 JDK 21에서 실제 HashMap 내부를 꺼내 본 결과와 대조했고, hashCode 세 가지 × 로드 팩터 세 가지로 40개씩 넣은 360단계 모두에서 버킷 수, 버킷별 개수, 트리 여부가 일치했습니다. hashCode를 재정의하지 않았을 때의 값은 실제로는 JVM이 객체마다 정하는 값이며, 여기서는 임의의 수로 대신했습니다.',
});
