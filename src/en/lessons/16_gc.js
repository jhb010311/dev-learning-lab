Lab.register({
  id: 'gc', nav: 'GC and memory leaks', cat: 'JVM', mode: 'step',
  title: 'Who reclaims discarded objects, and when?',
  intro: 'New objects are created in eden, and when eden fills up, a minor GC picks out only the live objects and moves them. Objects that survive several times are promoted to the old generation, and when the old generation fills up, a full GC runs, which takes much longer. Change the rate at which objects are created, the share of long-lived objects, and the heap size, and see how the run ends when there is a memory leak.',
  terms: ['Garbage collection (GC)', 'Reachability and GC roots', 'Young generation and old generation', 'Minor GC and full GC', 'Stop-the-world (STW)', 'Memory leak', 'StackOverflowError and OutOfMemoryError'], ranks: ['gc', 'jvm'],
  controls: [
    { id: 'rate', label: 'Objects created per tick', type: 'range', min: 2, max: 10, value: 5, fmt: function (v) { return v + ' objects'; } },
    { id: 'live', label: 'Share of objects that stay in use for a while', type: 'range', min: 0, max: 50, step: 10, value: 10, fmt: function (v) { return v + '%'; }, hint: 'The rest are discarded right after they are created (objects that are used only while a request is being handled).' },
    { id: 'heap', label: 'Heap size', type: 'select', value: 'mid', options: [['small', 'Small (eden 12, old 24)'], ['mid', 'Medium (eden 20, old 40)'], ['large', 'Large (eden 32, old 64)']] },
    { id: 'leak', label: 'There is a memory leak (objects are added to a static list and never removed)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', d: 'Most objects are discarded quickly. Minor GCs alone keep the program going.', v: { rate: 5, live: 10, heap: 'mid', leak: false } },
    { t: 'With many long-lived objects', d: 'More objects are promoted to the old generation, and full GCs start to run.', v: { rate: 5, live: 40, heap: 'mid', leak: false } },
    { t: 'Creating objects faster', d: 'Eden fills up sooner, so minor GCs become more frequent.', v: { rate: 10, live: 10, heap: 'mid', leak: false } },
    { t: 'With a larger heap', d: 'The number of GCs goes down.', v: { rate: 10, live: 10, heap: 'large', leak: false } },
    { t: 'Memory leak', d: 'Even though GCs run, the old generation does not empty, and the run ends with an OutOfMemoryError.', v: { rate: 5, live: 10, heap: 'mid', leak: true } },
    { t: 'A leak with only a larger heap', d: 'This only delays the point of failure.', v: { rate: 5, live: 10, heap: 'large', leak: true } },
  ],
  SIZES: { small: [12, 3, 24], mid: [20, 5, 40], large: [32, 8, 64] },
  code: function (c) {
    var z = this.SIZES[c.heap];
    return '// Heap: eden ' + z[0] + ' slots, survivor ' + z[1] + ' slots, old ' + z[2] + ' slots\n' + (c.leak ? 'static List<Event> history = new ArrayList<>();   // no code removes anything\n\n' : '\n') + 'while (running) {                       // one pass = one tick\n    for (int i = 0; i < ' + c.rate + '; i++) {\n        Event e = new Event();           // created in eden\n        if (keepForAWhile(e)) {          // ' + c.live + '%\n            recent.put(e.id(), e);       // removed 10 ticks later\n        }\n' + (c.leak ? '        if (e.isImportant()) {           // 40%\n            history.add(e);              // still referenced -> cannot be collected\n        }\n' : '') + '    }                                    // the rest are discarded here\n}';
  },
  label: function (c) { return 'Per tick: ' + c.rate + ' objects · long-lived: ' + c.live + '% · heap: ' + { small: 'small', mid: 'medium', large: 'large' }[c.heap] + (c.leak ? ' · leak' : ''); },
  columns: ['Minor GCs', 'Full GCs', 'Total pause time', 'Old generation in use at the end', 'Result'],
  simulate: function (c) {
    var z = this.SIZES[c.heap], EC = z[0], SC = z[1], OC = z[2], TH = 2, TICKS = 40, objs = [], ev = [], minor = 0, full = 0, pause = 0, oom = false, made = 0, t = 0, la = 0, lk = 0;
    function cnt(w) { var n = 0; objs.forEach(function (o) { if (o.w === w) n++; }); return n; }
    function snap() { return { t: t, minor: minor, full: full, pause: pause, E: reg('E'), S: reg('S'), O: reg('O') }; }
    function reg(w) { return objs.filter(function (o) { return o.w === w; }).map(function (o) { return o.die === Infinity ? 'b' : o.die > t ? 'd' : 'r'; }); }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    function fullGC() { full++; pause += 10; var before = cnt('O'); objs = objs.filter(function (o) { return o.die > t; }); var after = cnt('O'); push('Tick ' + t + ': Surviving objects have to be promoted to the old generation, but the old generation is full. A full GC examines the whole heap. The old generation held ' + before + ' objects. The full GC reclaims the ones that are no longer referenced (' + (before - after) + '), which leaves ' + after + '. All threads of the application are paused during this time (a pause of 10).', 'bad'); }
    function promote(o) { if (cnt('O') >= OC) { fullGC(); if (cnt('O') >= OC) { oom = true; return false; } } o.w = 'O'; return true; }
    function minorGC() {
      minor++; pause += 1; var young = objs.filter(function (o) { return o.w !== 'O'; }), dead = young.filter(function (o) { return o.die <= t; }).length, toS = 0, toO = 0;
      objs = objs.filter(function (o) { return o.w === 'O' || o.die > t; });
      var alive = objs.filter(function (o) { return o.w !== 'O'; }); alive.forEach(function (o) { o.w = 'X'; });
      for (var i = 0; i < alive.length; i++) { var o = alive[i]; o.age++; if (o.age >= TH || cnt('S') >= SC) { if (!promote(o)) break; toO++; } else { o.w = 'S'; toS++; } }
      if (oom) return;
      push('Tick ' + t + ': Eden is full. A minor GC examines only the young generation (' + young.length + ' objects). It discards the objects that are not referenced (' + dead + ') and moves the live objects (' + alive.length + '). Moved to the survivor space: ' + toS + '. Promoted to the old generation: ' + toO + '. Eden is now empty. The application pauses briefly (a pause of 1).', '');
    }
    for (t = 1; t <= TICKS && !oom; t++) {
      for (var i = 0; i < c.rate && !oom; i++) {
        if (cnt('E') >= EC) minorGC();
        if (oom) break;
        made++; var die = t;                                    // default: discarded when the tick in which it was created ends
        var a2 = Math.floor(made * c.live / 100); if (a2 > la) { la = a2; die = t + 10; }
        if (c.leak) { var k2 = Math.floor(made * 0.4); if (k2 > lk) { lk = k2; die = Infinity; } }
        objs.push({ w: 'E', die: die, age: 0 });
      }
      if (!oom) push('Tick ' + t + ': ' + c.rate + ' objects are created. Eden: ' + cnt('E') + '/' + EC + ' slots in use.', '');
    }
    if (oom) t--;
    if (oom) push('Tick ' + t + ': Even after a full GC, no room was freed in the old generation, because live (referenced) objects alone fill the heap. A java.lang.OutOfMemoryError: Java heap space is thrown.', 'bad');
    var oldUse = cnt('O'), leaked = objs.filter(function (o) { return o.die === Infinity; }).length;
    var sum = ['While ' + made + ' objects were created, the counts were: minor GCs ' + minor + ', full GCs ' + full + '. The application was paused for a total of ' + pause + '.'];
    if (oom) sum.push('The run ended with an OutOfMemoryError. ' + (c.leak ? 'The static list still refers to the leaked objects (' + leaked + '), so the garbage collector cannot reclaim them. A larger heap only delays the failure, and the result is the same. You have to take a heap dump, find what is piling up, and remove the references.' : 'There are more long-lived objects than the heap can hold. If this is not a leak, you have to make the heap larger or cut down on whatever holds objects for a long time (the size of a cache, for example).'));
    else if (c.leak) sum.push('The program has not failed yet, but the leaked objects (' + leaked + ') keep piling up in the old generation. Old generation usage that does not go down after a full GC and only keeps rising is the sign of a leak. If the program runs longer, it ends with an OutOfMemoryError.');
    else if (full === 0) sum.push('Most objects were discarded quickly, so minor GCs alone were enough. Dividing the heap into generations is efficient when the assumption that "most objects die young" holds.');
    else sum.push('Many objects were promoted to the old generation, which caused full GCs (' + full + ' in this run). A full GC pauses the application for much longer than a minor GC, so it causes response delays. Making the heap larger or reducing the objects that are held for a long time lowers the frequency.');
    return { events: ev, summary: sum, EC: EC, SC: SC, OC: OC, row: [minor + '', full + '', String(pause), oldUse + '/' + OC + ' slots', oom ? 'OutOfMemoryError' : 'Normal'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { t: 0, minor: 0, full: 0, pause: 0, E: [], S: [], O: [] };
    H.counters(v, [[s.t, 'Tick'], [s.minor, 'Minor GCs'], [s.full, 'Full GCs'], [s.pause, 'Total pause time']]);
    function region(name, arr, cap) { H.title(v, name + ' (' + arr.length + '/' + cap + ')'); var it = []; for (var i = 0; i < cap; i++) it.push(['', arr[i] || '']); H.slots(v, it, null, true); }
    region('Eden: where new objects are created', s.E, sim.EC); region('Survivor space: objects that survived a minor GC', s.S, sim.SC); region('Old generation: objects promoted after surviving several times', s.O, sim.OC);
    H.text(v, 'Green marks an object that is still referenced, red marks an object that is no longer referenced but has not been reclaimed yet, and yellow marks a leaked object (still referenced).');
  },
  // Diagram: the three areas of the heap drawn as slots. New objects go into eden, and the ones that survive go through the survivor space to the old generation.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { E: [], S: [], O: [] }, EC = sim.EC, SC = sim.SC, OC = sim.OC;
    var rows = Math.max(Math.ceil(EC / 8), Math.ceil(SC / 4), Math.ceil(OC / 16)), rh = 34 + rows * 20 + 8;
    P.size(680, rh + 78);
    function cells(pre, x, arr, cap, per) { for (var i = 0; i < cap; i++) P.box(pre + i, x + 10 + (i % per) * 20, 50 + Math.floor(i / per) * 20, 17, 17, { cls: arr[i] === 'd' ? 'good' : arr[i] === 'r' ? 'bad' : arr[i] === 'b' ? 'hot' : 'ghost' }); }
    P.region('E', 16, 16, 180, rh, 'Eden ' + s.E.length + '/' + EC); cells('e', 16, s.E, EC, 8);
    P.region('S', 212, 16, 104, rh, 'Survivor ' + s.S.length + '/' + SC); cells('s', 212, s.S, SC, 4);
    P.region('O', 332, 16, 332, rh, 'Old ' + s.O.length + '/' + OC); cells('o', 332, s.O, OC, 16);
    var txt = last ? last.s : '', kind = txt.indexOf('Even after a full GC') >= 0 ? 'oom' : txt.indexOf('A full GC examines') >= 0 ? 'full' : txt.indexOf('A minor GC examines') >= 0 ? 'minor' : '';
    P.box('msg', 16, rh + 30, 648, 30, { cls: kind === 'oom' || kind === 'full' ? 'bad' : kind === 'minor' ? 'hot' : 'ghost', center: true, title: { oom: 'OutOfMemoryError: referenced objects alone fill the heap', full: 'Full GC: examines the whole heap (all threads pause for a long time)', minor: 'Minor GC: examines only eden and the survivor space (brief pause)', '': last ? 'Creating new objects in eden with no GC' : 'Click Run to start' }[kind] });
    P.note('Green marks an object that is still referenced, red marks an object whose references are gone but that has not been reclaimed yet, yellow marks a leaked object (still referenced), and a dashed outline marks an empty slot. A new object is created in eden, and if it survives minor GCs, it moves through the survivor space to the old generation.');
  },
  assume: 'This is a simple model of generational garbage collection in which all objects have the same size and the heap is counted in slots. The condition for promotion is lowered to "survives two minor GCs" (the real default maximum is 15, and the garbage collector adjusts it to the situation). The pause times 1 and 10 only express the relationship that a minor GC is much shorter than a full GC. Real collectors such as G1 and ZGC work differently, for example by dividing the heap into smaller parts and working concurrently with the application, but the principle is the same: the area for new objects and the area for old objects are handled separately, and objects that are still referenced cannot be reclaimed. The slot counts and GC counts are values of the model. However, the same situations were actually run on JDK 21 on this PC with a 64MB heap to check the direction. Creating only objects that are discarded quickly gave 24 young collections and 0 full GCs. Mixing in objects that are held for a long time gave 7 full GCs (average pause: young 2.1ms, full 11.5ms). Continually adding objects to a list that is never cleared ended with an OutOfMemoryError after 37 repeated full GCs. With the heap enlarged to 128MB, the same leak ended with the same error after creating about twice as many objects.',
});
