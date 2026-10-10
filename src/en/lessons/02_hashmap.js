Lab.register({
  id: 'hashmap', nav: 'Inside HashMap', cat: 'Data structures', mode: 'step',
  title: 'Where does a HashMap put a key, and how does it find it?',
  intro: 'A HashMap uses the hashCode of a key to decide the bucket number and puts the key there. When hash codes collide, the keys are chained one after another in a single bucket, and when the entries become many, the number of buckets is doubled. Change the hashCode implementation and whether equals is overridden, and see how the buckets fill up and whether a key that was put can be found again.',
  terms: ['Hash table and HashMap', 'Hash collision', 'Load factor and resizing', 'Red-black tree', 'equals and hashCode contract'], ranks: ['collection', 'equals', 'ds'],
  controls: [
    { id: 'n', label: 'Number of keys to put', type: 'range', min: 1, max: 40, value: 13, fmt: function (v) { return v + ''; } },
    { id: 'eq', label: 'What the key class overrides', type: 'select', value: 'both', options: [['both', 'Both equals and hashCode'], ['eqonly', 'equals only'], ['hconly', 'hashCode only'], ['none', 'Neither']] },
    { id: 'hash', label: 'hashCode() implementation', type: 'select', value: 'good', options: [['good', 'The id itself (spreads evenly)'], ['mod4', 'id % 4 (only 4 values)'], ['same', 'Always 1 (the same value for all)']], show: function (c) { return c.eq === 'both' || c.eq === 'hconly'; } },
    { id: 'lf', label: 'Load factor', type: 'select', value: '0.75', options: [['0.5', '0.5 (resize when half full)'], ['0.75', '0.75 (default)'], ['1', '1.0 (resize only when full)']], hint: 'When the number of entries exceeds the number of buckets × the load factor, the number of buckets is doubled.' },
  ],
  presets: [
    { t: 'Default settings', d: '13 keys are put. At key #13, the buckets grow from 16 to 32.', v: { n: 13, eq: 'both', hash: 'good', lf: '0.75' } },
    { t: 'hashCode always returns the same value', d: 'Every key ends up in one bucket. Watch what happens from key #9 on.', v: { n: 13, eq: 'both', hash: 'same', lf: '0.75' } },
    { t: 'Only 4 hashCode values', d: '40 keys are put. Even when the number of buckets grows, the keys pile up in only 4 of them.', v: { n: 40, eq: 'both', hash: 'mod4', lf: '0.75' } },
    { t: 'Load factor 0.5', d: 'The map resizes earlier. There are fewer collisions, and more memory is used.', v: { n: 13, eq: 'both', hash: 'good', lf: '0.5' } },
    { t: 'Only equals overridden', d: 'A lookup with a key that has the same contents as a key that was put does not find it.', v: { n: 13, eq: 'eqonly', hash: 'good', lf: '0.75' } },
    { t: 'Only hashCode overridden', d: 'The lookup gets as far as the right bucket, but the key is not recognized as the same key.', v: { n: 13, eq: 'hconly', hash: 'good', lf: '0.75' } },
  ],
  code: function (c) {
    var eq = c.eq === 'both' || c.eq === 'eqonly', hc = c.eq === 'both' || c.eq === 'hconly';
    var body = { good: 'return Integer.hashCode(id);   // the id itself', mod4: 'return id % 4;                 // only 4 values', same: 'return 1;                      // the same value for all' }[c.hash];
    return 'class MemberKey {\n    final int id;\n    MemberKey(int id) { this.id = id; }\n' +
      (eq ? '\n    @Override public boolean equals(Object o) {\n        return o instanceof MemberKey k && k.id == id;\n    }\n' : '\n    // equals not overridden: true only for the same object\n') +
      (hc ? '\n    @Override public int hashCode() {\n        ' + body + '\n    }\n' : '\n    // hashCode not overridden: a different value for each object\n') +
      '}\n\nMap<MemberKey, String> map = new HashMap<>(16, ' + c.lf + 'f);\nfor (int id : ids) {                 // number of ids: ' + c.n + '\n    map.put(new MemberKey(id), "member");\n}\n\n// Create a new object with the same id as the first one that was put\nmap.put(new MemberKey(ids[0]), "updated");\nmap.get(new MemberKey(ids[0]));';
  },
  label: function (c) { var hc = c.eq === 'both' || c.eq === 'hconly'; return { both: 'equals+hashCode', eqonly: 'equals only', hconly: 'hashCode only', none: 'no overrides' }[c.eq] + (hc ? ' · hashCode ' + { good: 'id itself', mod4: 'id % 4', same: 'always 1' }[c.hash] : '') + ' · load factor ' + c.lf + ' · keys: ' + c.n + ''; },
  columns: ['Buckets', 'Resizes', 'Longest bucket', 'Tree buckets', 'put again with the same key', 'get with the same key'],
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
      push(why + ' The number of buckets was increased from ' + oc + ' to ' + cap + ', and the bucket of every entry was decided again. Of the ' + size + ' entries, ' + moved + ' moved to a new bucket. The next resize happens when the number of entries exceeds ' + thr + '.', '', -1);
    }
    function where(k) { return 'The hashCode is ' + k.raw + (hcOn ? '' : ' (not overridden, so a different value for each object)') + ', and the bucket number is ' + (k.hash & (cap - 1)) + ' (the remainder of dividing the hash by the number of buckets, ' + cap + ').'; }
    function put(id, again) {
      var k = mk(id), idx = k.hash & (cap - 1), b = B[idx], hit = b.nodes.filter(function (x) { return same(x, k); })[0];
      var head = (again ? 'A new key object is created with the same id, ' + id + ', and put again. ' : 'put(id ' + id + '). ') + where(k) + ' ';
      if (hit) { push(head + 'A key with the same hash for which equals is also true was found in the bucket. No new entry is created, and only the value is replaced. The number of entries stays at ' + size + '.', 'good', idx); return true; }
      var before = b.nodes.length; b.nodes.push(k); size++;
      var why = again ? (!hcOn ? 'The hash is different, so a different bucket was examined and the key that is already there was not found. ' : !eqOn ? 'A key with the same hash was found in the same bucket, but equals is not overridden, so it was judged to be a different key. ' : '') : '';
      var msg = head + why + (before === 0 ? 'The bucket was empty, so the entry was put right away.' : 'Entries already in this bucket: ' + before + ' (a collision). ' + (b.tree ? 'The entry was added to the tree.' : 'The key was compared with each of them from the front, and then the entry was attached at the end.')) + (again ? ' There are now two keys with the same id, and the number of entries has grown to ' + size + '.' : '');
      push(msg, again ? 'bad' : '', idx);
      if (!b.tree && b.nodes.length >= 9) {
        if (cap < 64) resize('Node #' + b.nodes.length + ' was added to a single bucket. This meets the condition for converting the bucket to a tree, but there are fewer than 64 buckets, so the number of buckets is increased instead.');
        else { b.tree = true; push('Bucket ' + idx + ' received node #' + b.nodes.length + '. There are 64 or more buckets, so this bucket is converted from a linked list to a red-black tree.', '', idx); }
      }
      if (size > thr) resize('The number of entries, ' + size + ', exceeded the threshold of ' + thr + ' (' + cap + ' buckets × load factor ' + c.lf + ').');
      return false;
    }
    for (var n = 0; n < c.n; n++) put(IDS[n], false);
    var afterFill = { cap: cap, resizes: resizes, longest: longest(), trees: B.filter(function (b) { return b.tree; }).length, size: size };
    var replaced = put(IDS[0], true);
    var q = mk(IDS[0]), qi = q.hash & (cap - 1), qb = B[qi], pos = -1;
    qb.nodes.forEach(function (x, i) { if (pos < 0 && same(x, q)) pos = i; });
    var found = pos >= 0, gs = 'get: A new key object is created with id ' + IDS[0] + ' and looked up. ' + where(q) + ' ';
    if (found) gs += qb.tree ? 'The key is found in the bucket that was converted to a tree, and the value is returned.' : 'The key was found after comparing up to node #' + (pos + 1) + ' in the bucket. The value is returned.';
    else if (!hcOn) gs += 'The hash differs from that of the object used for the put, so the wrong bucket was examined. ' + (qb.nodes.length ? 'The nodes in that bucket (' + qb.nodes.length + ') differ in hash to begin with, so equals is not even called. ' : 'That bucket is empty. ') + 'null is returned. The value is in the map, but it cannot be retrieved.';
    else gs += 'The right bucket was reached, and the hash is the same too. But equals is not overridden, so it compares only "are these the same object", and the newly created object is a different object, so every comparison is false. All the nodes (' + qb.nodes.length + ') are compared, and null is returned.';
    push(gs, found ? 'good' : 'bad', qi);
    var sum = ['Keys put: ' + c.n + '. Meanwhile the number of buckets went from 16 to ' + afterFill.cap + ' (number of resizes: ' + afterFill.resizes + '), and the number of entries in the longest bucket is ' + afterFill.longest + '.'];
    if (hcOn && c.hash !== 'good' && afterFill.longest > 2) sum.push('When there are only a few distinct hashCode values, the keys pile up in the same buckets no matter how much the number of buckets grows. The longer a bucket gets, the slower put and get become, because they compare the entries in it one by one.');
    if (afterFill.trees) sum.push('Buckets converted to red-black trees: ' + afterFill.trees + '. A tree makes the search faster when the hash values differ from each other or the keys are Comparable. When, as in this example, every hashCode in a bucket is the same and the keys are not Comparable either, converting to a tree does not make the search faster. In the end, the solution is to make hashCode spread evenly.');
    if (c.eq === 'both') sum.push('Both equals and hashCode are overridden, so a new object created with the same id could also be used to replace the value and to find it.');
    if (c.eq === 'eqonly') sum.push('Overriding only equals breaks the contract that "two objects for which equals is true must have the same hashCode". The id is the same but the hash is different, so the key goes to a different bucket, and as a result a duplicate was stored and the lookup failed too.');
    if (c.eq === 'hconly') sum.push('Overriding only hashCode gets the key as far as the same bucket, but equals compares references, so the key is not recognized as the same key. A duplicate was stored and the lookup failed too.');
    if (c.eq === 'none') sum.push('When neither is overridden, keys with the same contents are completely different keys. You can find a value only if you are holding the very object that was used for the put.');
    return { events: ev, summary: sum, row: [afterFill.cap + '', afterFill.resizes + '', afterFill.longest + '', afterFill.trees + '', replaced ? 'Only the value replaced' : 'Duplicate stored', found ? 'Found' : 'null'], trace: ev.map(function (e) { return e.snap; }) };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { cap: 16, thr: Math.floor(16 * +sim.c.lf), size: 0, resizes: 0, touch: -1, longest: 0, B: [] };
    H.counters(v, [[s.cap, 'Buckets'], [s.size, 'Entries stored'], ['> ' + s.thr, 'Resize threshold'], [s.resizes, 'Resizes'], [s.longest, 'Longest bucket']]);
    H.title(v, 'Buckets: ' + s.cap + ' (each number is the number of entries in that bucket)');
    var items = [];
    for (var i = 0; i < s.cap; i++) { var b = s.B[i] || { n: 0 }; items.push([b.n ? String(b.n) + (b.tree ? 'T' : '') : '', (b.n === 0 ? '' : b.n === 1 ? 'd' : b.n < 8 ? 'q' : 'r') + (i === s.touch ? ' now' : '')]); }
    H.slots(v, items, null, true);
    H.text(v, 'Green is 1 entry, blue is 2 to 7 (a collision), red is 8 or more, and T is a bucket that was converted to a tree. A thick border marks the bucket that was just touched.');
    var rows = [];
    s.B.forEach(function (b, i) { if (b.n >= 2 || (i === s.touch && b.n)) rows.push({ cells: [{ v: i + '', cls: i === s.touch ? 'hot' : '' }, b.tree ? 'Red-black tree' : b.n > 1 ? 'Linked list' : '1 node', b.n + '', b.ids.slice(0, 12).join(' → ') + (b.n > 12 ? ' → …' : '')] }); });
    if (rows.length) H.table(v, ['Bucket', 'Structure', 'Entries', 'ids of the keys in it (in the order they were put)'], rows, 'The bucket that was just touched and the buckets with collisions');
    else H.text(v, 'No bucket has a collision yet.');
  },
  // Diagram: the bucket array at the top, and below it the keys chained inside the bucket that was just touched and inside the buckets with collisions.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { cap: 16, touch: -1, B: [] }, cap = s.cap, per = 28, rows = Math.ceil(cap / per), ah = 34 + rows * 20 + 8, top2 = 16 + ah + 12;
    P.size(680, top2 + 232 + 16);
    P.region('arr', 16, 16, 648, ah, 'Bucket array: ' + cap + ' buckets (each number is the number of entries in that bucket)');
    for (var i = 0; i < cap; i++) { var b = s.B[i] || { n: 0 }; P.box('b' + i, 26 + (i % per) * 22.5, 50 + Math.floor(i / per) * 20, 20, 17, { cls: (b.n === 0 ? 'ghost' : b.n === 1 ? 'good' : b.n < 8 ? 'wait' : 'bad') + (i === s.touch ? ' now' : ''), sub: b.n ? String(b.n) : undefined, center: true }); }
    P.region('ch', 16, top2, 648, 232, 'Inside the just-touched and colliding buckets (#N: bucket number, others: key ids)');
    var pick = [], cnt = {};
    if (s.touch >= 0 && s.B[s.touch]) pick.push(s.touch);
    s.B.map(function (b, i) { return [i, b.n]; }).filter(function (x) { return x[1] >= 2 && x[0] !== s.touch; }).sort(function (a, b) { return b[1] - a[1] || a[0] - b[0]; }).slice(0, 5 - pick.length).forEach(function (x) { pick.push(x[0]); });
    pick.forEach(function (bi, r) {
      var b = s.B[bi], y = top2 + 36 + r * 38, prev = 'h' + bi;
      P.box(prev, 28, y, 98, 28, { cls: bi === s.touch ? 'hot now' : 'plain', title: '#' + bi, right: b.tree ? 'tree' : '' });
      if (!b.n) P.text('emp' + bi, 140, y + 18, 'empty', { cls: 'mut' });
      b.ids.slice(0, 8).forEach(function (id, j) { cnt[id] = (cnt[id] || 0) + 1; var nid = 'k' + id + '_' + cnt[id]; P.box(nid, 140 + j * 56, y, 44, 28, { cls: cnt[id] > 1 ? 'bad' : 'good', sub: String(id), center: true }); if (!b.tree) P.arrow('ar' + nid, prev + ':r', nid + ':l'); prev = nid; });
      if (b.n > 8) P.text('more' + bi, 140 + 8 * 56, y + 18, '+ ' + (b.n - 8) + ' more', { cls: 'mut' });
    });
    if (!pick.length) P.text('none', 340, top2 + 120, last ? 'No bucket has a collision yet' : 'Click Run to put the keys one at a time', { cls: 'mut', anchor: 'middle' });
    P.note('In the array at the top, green is a bucket with 1 entry, blue is one with 2 to 7 (a collision), and red is one with 8 or more, and a thick border marks the bucket that was just touched. Below, the keys joined by arrows are the linked list inside one bucket, and a red key is one whose id was stored twice.');
  },
  assume: 'The initial number of buckets is fixed at 16. The calculation of the bucket number (the upper 16 bits of the hash are mixed into the lower bits, and then the remainder of dividing by the number of buckets is taken), the resize threshold (number of entries > number of buckets × load factor), and the rule that when node #9 is added to a single bucket the number of buckets is increased if there are fewer than 64 buckets and the bucket is converted to a tree if there are 64 or more are the same as in the JDK HashMap implementation. The model was checked against the result of taking out the internals of a real HashMap on JDK 21 on this PC, and in all 360 steps of putting 40 keys each with 3 hashCode implementations × 3 load factors, the number of buckets, the number of entries in each bucket, and whether each bucket is a tree matched. The value of hashCode when it is not overridden is in reality a value that the JVM decides for each object, and here an arbitrary number is used in its place.',
});
