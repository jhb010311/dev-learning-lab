Lab.register({
  id: 'gc', nav: 'GC와 메모리 누수', cat: 'JVM', mode: 'step',
  title: '버려진 객체는 누가 언제 치우나',
  intro: '새 객체는 Eden에 만들어지고, Eden이 차면 Minor GC가 살아 있는 객체만 골라 옮깁니다. 여러 번 살아남은 객체는 Old로 올라가고, Old가 차면 훨씬 오래 걸리는 Full GC가 돕니다. 생성 속도, 오래 사는 객체의 비율, 힙 크기를 바꿔 보고 누수가 있으면 어떻게 끝나는지 보세요.',
  terms: ['가비지 컬렉션(GC)', '도달 가능성과 GC 루트', 'Young 세대와 Old 세대', 'Minor GC와 Full GC', 'Stop-the-world(STW)', '메모리 누수', 'StackOverflowError와 OutOfMemoryError'], ranks: ['gc', 'jvm'],
  controls: [
    { id: 'rate', label: '한 틱에 만드는 객체 수', type: 'range', min: 2, max: 10, value: 5, fmt: function (v) { return v + '개'; } },
    { id: 'live', label: '한동안 계속 쓰이는 객체의 비율', type: 'range', min: 0, max: 50, step: 10, value: 10, fmt: function (v) { return v + '%'; }, hint: '나머지는 만든 직후 버려집니다(요청 처리 중에만 쓰는 객체).' },
    { id: 'heap', label: '힙 크기', type: 'select', value: 'mid', options: [['small', '작게 (Eden 12, Old 24)'], ['mid', '보통 (Eden 20, Old 40)'], ['large', '크게 (Eden 32, Old 64)']] },
    { id: 'leak', label: '메모리 누수가 있다 (static 목록에 담고 지우지 않음)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: '대부분의 객체가 금방 버려집니다. Minor GC만으로 유지됩니다.', v: { rate: 5, live: 10, heap: 'mid', leak: false } },
    { t: '오래 사는 객체가 많으면', d: 'Old로 올라가는 객체가 늘어 Full GC가 돌기 시작합니다.', v: { rate: 5, live: 40, heap: 'mid', leak: false } },
    { t: '객체를 더 빨리 만들면', d: 'Eden이 빨리 차서 Minor GC가 잦아집니다.', v: { rate: 10, live: 10, heap: 'mid', leak: false } },
    { t: '힙을 키우면', d: 'GC 횟수가 줄어듭니다.', v: { rate: 10, live: 10, heap: 'large', leak: false } },
    { t: '메모리 누수', d: 'GC가 돌아도 Old가 비지 않다가 OutOfMemoryError로 끝납니다.', v: { rate: 5, live: 10, heap: 'mid', leak: true } },
    { t: '누수 상태에서 힙만 키우면', d: '죽는 시점이 늦춰질 뿐입니다.', v: { rate: 5, live: 10, heap: 'large', leak: true } },
  ],
  SIZES: { small: [12, 3, 24], mid: [20, 5, 40], large: [32, 8, 64] },
  code: function (c) {
    var z = this.SIZES[c.heap];
    return '// 힙: Eden ' + z[0] + '칸, Survivor ' + z[1] + '칸, Old ' + z[2] + '칸\n' + (c.leak ? 'static List<Event> history = new ArrayList<>();   // 지우는 코드가 없다\n\n' : '\n') + 'while (running) {                       // 한 바퀴 = 한 틱\n    for (int i = 0; i < ' + c.rate + '; i++) {\n        Event e = new Event();           // Eden에 생성\n        if (keepForAWhile(e)) {          // ' + c.live + '%\n            recent.put(e.id(), e);       // 10틱 뒤 제거됨\n        }\n' + (c.leak ? '        if (e.isImportant()) {           // 40%\n            history.add(e);              // 계속 참조됨 -> GC 불가\n        }\n' : '') + '    }                                    // 나머지는 여기서 버려짐\n}';
  },
  label: function (c) { return '틱당 ' + c.rate + '개 · 오래 사는 비율 ' + c.live + '% · 힙 ' + { small: '작게', mid: '보통', large: '크게' }[c.heap] + (c.leak ? ' · 누수' : ''); },
  columns: ['Minor GC', 'Full GC', '멈춘 시간 합계', '끝날 때 Old 사용', '결과'],
  simulate: function (c) {
    var z = this.SIZES[c.heap], EC = z[0], SC = z[1], OC = z[2], TH = 2, TICKS = 40, objs = [], ev = [], minor = 0, full = 0, pause = 0, oom = false, made = 0, t = 0, la = 0, lk = 0;
    function cnt(w) { var n = 0; objs.forEach(function (o) { if (o.w === w) n++; }); return n; }
    function snap() { return { t: t, minor: minor, full: full, pause: pause, E: reg('E'), S: reg('S'), O: reg('O') }; }
    function reg(w) { return objs.filter(function (o) { return o.w === w; }).map(function (o) { return o.die === Infinity ? 'b' : o.die > t ? 'd' : 'r'; }); }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    function fullGC() { full++; pause += 10; var before = cnt('O'); objs = objs.filter(function (o) { return o.die > t; }); var after = cnt('O'); push(t + '틱: 살아남은 객체를 Old로 올리려는데 Old 영역이 가득 찼습니다. Full GC가 힙 전체를 검사합니다. Old의 ' + before + '개 중 더 이상 참조되지 않는 ' + (before - after) + '개를 치웠고 ' + after + '개가 남았습니다. 그동안 애플리케이션의 모든 스레드가 멈춥니다(10만큼 멈춤).', 'bad'); }
    function promote(o) { if (cnt('O') >= OC) { fullGC(); if (cnt('O') >= OC) { oom = true; return false; } } o.w = 'O'; return true; }
    function minorGC() {
      minor++; pause += 1; var young = objs.filter(function (o) { return o.w !== 'O'; }), dead = young.filter(function (o) { return o.die <= t; }).length, toS = 0, toO = 0;
      objs = objs.filter(function (o) { return o.w === 'O' || o.die > t; });
      var alive = objs.filter(function (o) { return o.w !== 'O'; }); alive.forEach(function (o) { o.w = 'X'; });
      for (var i = 0; i < alive.length; i++) { var o = alive[i]; o.age++; if (o.age >= TH || cnt('S') >= SC) { if (!promote(o)) break; toO++; } else { o.w = 'S'; toS++; } }
      if (oom) return;
      push(t + '틱: Eden이 가득 찼습니다. Minor GC가 Young 영역(' + young.length + '개)만 검사해서, 참조되지 않는 ' + dead + '개를 버리고 살아 있는 ' + alive.length + '개를 옮겼습니다(Survivor로 ' + toS + '개, Old로 승격 ' + toO + '개). Eden은 비었습니다. 잠깐 멈춥니다(1만큼 멈춤).', '');
    }
    for (t = 1; t <= TICKS && !oom; t++) {
      for (var i = 0; i < c.rate && !oom; i++) {
        if (cnt('E') >= EC) minorGC();
        if (oom) break;
        made++; var die = t;                                    // 기본: 만든 틱이 끝나면 버려짐
        var a2 = Math.floor(made * c.live / 100); if (a2 > la) { la = a2; die = t + 10; }
        if (c.leak) { var k2 = Math.floor(made * 0.4); if (k2 > lk) { lk = k2; die = Infinity; } }
        objs.push({ w: 'E', die: die, age: 0 });
      }
      if (!oom) push(t + '틱: 객체 ' + c.rate + '개를 만들었습니다. Eden ' + cnt('E') + '/' + EC + '칸 사용 중.', '');
    }
    if (oom) t--;
    if (oom) push(t + '틱: Full GC를 했는데도 Old 영역에 빈자리가 생기지 않았습니다. 살아 있는(참조되는) 객체만으로 힙이 가득 찼기 때문입니다. java.lang.OutOfMemoryError: Java heap space가 발생합니다.', 'bad');
    var oldUse = cnt('O'), leaked = objs.filter(function (o) { return o.die === Infinity; }).length;
    var sum = ['객체 ' + made + '개를 만드는 동안 Minor GC ' + minor + '번, Full GC ' + full + '번이 돌았고 애플리케이션은 합계 ' + pause + '만큼 멈췄습니다.'];
    if (oom) sum.push('OutOfMemoryError로 끝났습니다. ' + (c.leak ? '누수된 객체 ' + leaked + '개는 static 목록이 계속 참조하고 있어서 GC가 치울 수 없습니다. 힙을 키우면 시점이 늦춰질 뿐 결과는 같습니다. 힙 덤프를 떠서 무엇이 쌓이는지 찾아 참조를 끊어야 합니다.' : '오래 사는 객체가 힙보다 많습니다. 누수가 아니라면 힙을 키우거나 객체를 오래 붙잡는 구조(캐시 크기 등)를 줄여야 합니다.'));
    else if (c.leak) sum.push('아직 죽지는 않았지만 누수된 객체 ' + leaked + '개가 Old에 계속 쌓이고 있습니다. Full GC 뒤에도 Old 사용량이 줄지 않고 올라가기만 하는 것이 누수의 신호입니다. 더 오래 돌리면 OutOfMemoryError로 끝납니다.');
    else if (full === 0) sum.push('대부분의 객체가 금방 버려져서 Minor GC만으로 충분했습니다. "대부분의 객체는 일찍 죽는다"는 가정이 맞을 때 세대를 나누는 방식이 효율적입니다.');
    else sum.push('Old로 승격되는 객체가 많아 Full GC가 ' + full + '번 돌았습니다. Full GC는 Minor GC보다 훨씬 오래 멈추므로 응답 지연의 원인이 됩니다. 힙을 키우거나, 오래 붙잡는 객체를 줄이면 빈도가 내려갑니다.');
    return { events: ev, summary: sum, EC: EC, SC: SC, OC: OC, row: [minor + '번', full + '번', String(pause), oldUse + '/' + OC + '칸', oom ? 'OutOfMemoryError' : '정상'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { t: 0, minor: 0, full: 0, pause: 0, E: [], S: [], O: [] };
    H.counters(v, [[s.t, '틱'], [s.minor, 'Minor GC'], [s.full, 'Full GC'], [s.pause, '멈춘 시간 합계']]);
    function region(name, arr, cap) { H.title(v, name + ' (' + arr.length + '/' + cap + ')'); var it = []; for (var i = 0; i < cap; i++) it.push(['', arr[i] || '']); H.slots(v, it, null, true); }
    region('Eden: 새 객체가 만들어지는 곳', s.E, sim.EC); region('Survivor: Minor GC에서 살아남은 객체', s.S, sim.SC); region('Old: 여러 번 살아남아 승격된 객체', s.O, sim.OC);
    H.text(v, '초록은 아직 참조되는 객체, 빨강은 더 이상 참조되지 않지만 아직 치워지지 않은 객체, 노랑은 누수된 객체(계속 참조됨)입니다.');
  },
  // 그림: 힙의 세 영역을 칸으로 그린다. 새 객체는 Eden에, 살아남으면 Survivor를 거쳐 Old로 간다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { E: [], S: [], O: [] }, EC = sim.EC, SC = sim.SC, OC = sim.OC;
    var rows = Math.max(Math.ceil(EC / 8), Math.ceil(SC / 4), Math.ceil(OC / 16)), rh = 34 + rows * 20 + 8;
    P.size(680, rh + 78);
    function cells(pre, x, arr, cap, per) { for (var i = 0; i < cap; i++) P.box(pre + i, x + 10 + (i % per) * 20, 50 + Math.floor(i / per) * 20, 17, 17, { cls: arr[i] === 'd' ? 'good' : arr[i] === 'r' ? 'bad' : arr[i] === 'b' ? 'hot' : 'ghost' }); }
    P.region('E', 16, 16, 180, rh, 'Eden ' + s.E.length + '/' + EC); cells('e', 16, s.E, EC, 8);
    P.region('S', 212, 16, 104, rh, 'Survivor ' + s.S.length + '/' + SC); cells('s', 212, s.S, SC, 4);
    P.region('O', 332, 16, 332, rh, 'Old ' + s.O.length + '/' + OC); cells('o', 332, s.O, OC, 16);
    var txt = last ? last.s : '', kind = txt.indexOf('Full GC를 했는데도') >= 0 ? 'oom' : txt.indexOf('Full GC가') >= 0 ? 'full' : txt.indexOf('Minor GC가') >= 0 ? 'minor' : '';
    P.box('msg', 16, rh + 30, 648, 30, { cls: kind === 'oom' || kind === 'full' ? 'bad' : kind === 'minor' ? 'hot' : 'ghost', center: true, title: { oom: 'OutOfMemoryError: 참조되는 객체만으로 힙이 가득 참', full: 'Full GC: 힙 전체를 검사 (모든 스레드가 오래 멈춤)', minor: 'Minor GC: Eden과 Survivor만 검사 (잠깐 멈춤)', '': last ? 'GC 없이 Eden에 새 객체를 만드는 중' : '실행을 누르면 시작합니다' }[kind] });
    P.note('초록은 아직 참조되는 객체, 빨강은 참조가 끊겼지만 아직 치워지지 않은 객체, 노랑은 누수된 객체(계속 참조됨), 점선은 빈 칸입니다. 새 객체는 Eden에 생기고, Minor GC에서 살아남으면 Survivor를 거쳐 Old로 옮겨집니다.');
  },
  assume: '객체 크기가 모두 같고 힙을 칸 수로 센 단순한 세대별 GC 모형입니다. 승격 기준을 "Minor GC에서 두 번 살아남으면"으로 낮췄습니다(실제 기본 최대치는 15이며 GC가 상황에 따라 조정합니다). 멈춤 시간 1과 10은 Minor GC가 Full GC보다 훨씬 짧다는 관계만 나타내는 값입니다. G1이나 ZGC 같은 실제 수집기는 힙을 더 잘게 나누고 애플리케이션과 동시에 일하는 등 방식이 다르지만, 새 객체 영역과 오래된 객체 영역을 나누어 다루고 참조가 남은 객체는 치우지 못한다는 원리는 같습니다. 칸 수와 횟수는 모형의 값입니다. 다만 같은 상황을 이 PC의 JDK 21에서 64MB 힙으로 실제로 돌려 방향을 확인했습니다. 금방 버려지는 객체만 만들면 Young GC 24번에 Full GC 0번, 오래 붙잡는 객체가 섞이면 Full GC가 7번 돌았고(평균 멈춤 Young 2.1ms, Full 11.5ms), 지우지 않는 목록에 계속 담으면 Full GC를 37번 반복한 끝에 OutOfMemoryError로 끝났습니다. 힙을 128MB로 키우면 같은 누수가 약 두 배의 객체를 만든 뒤에 같은 오류로 끝났습니다.',
});
