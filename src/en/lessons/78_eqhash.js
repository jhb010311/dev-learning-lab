Lab.register({
  id: 'eqhash', nav: 'equals and hashCode', cat: 'Java language', mode: 'step',
  title: 'Why can HashMap not find the key when you override only equals?',
  intro: 'To treat two objects with the same contents as equal, you override equals. But before HashMap and HashSet call equals, they first use hashCode to decide which bucket to look in. So if you override only one of equals and hashCode, HashMap and HashSet cannot find an object that you meant to be equal.',
  terms: ['equals and hashCode contract', 'Identity and equality', 'Hash table and HashMap', 'Hash collision', 'record'],
  controls: [
    { id: 'how', label: 'Methods that the Order class overrides', type: 'select', value: 'eq', options: [['none', 'Overrides nothing'], ['eq', 'Overrides only equals'], ['hash', 'Overrides only hashCode'], ['both', 'Overrides both equals and hashCode'], ['const', 'Overrides equals + hashCode always returns 42'], ['record', 'Declared as a record (both generated automatically)']] },
    { id: 'same', label: 'id of the two objects', type: 'select', value: 'same', options: [['same', 'Both 1 (same contents)'], ['diff', '1 and 2 (different contents)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Why can HashMap not find the key with an Order class that overrides only equals when both ids are 1?', d: 'Only equals is overridden. equals is true, but getting the value from the map returns null.', v: { how: 'eq', same: 'same' } },
    { t: 'Both overridden', q: 'What if the Order class overrides both equals and hashCode?', d: 'You can get the value with an object that has the same contents.', v: { how: 'both', same: 'same' } },
    { t: 'Nothing overridden', q: 'What if the Order class overrides nothing?', d: 'The two are treated as different objects even though their contents are the same.', v: { how: 'none', same: 'same' } },
    { t: 'Only hashCode overridden', q: 'What if the Order class overrides only hashCode?', d: 'The lookup reaches the same bucket, but equals is false, so the key is not found.', v: { how: 'hash', same: 'same' } },
    { t: 'Declared as a record', q: 'What if you declare Order as a record (both generated automatically)?', d: 'Both methods are generated for you automatically.', v: { how: 'record', same: 'same' } },
    { t: 'hashCode always returns the same value', q: 'What if equals is overridden, hashCode always returns 42, and the ids of the two objects are 1 and 2 (different contents)?', d: 'The contract is kept, but every object ends up in one bucket.', v: { how: 'const', same: 'diff' } },
  ],
  code: function (c) {
    var b = c.same === 'same' ? 1 : 2;
    var use = '\n\n// From here on, the lines inside main (the enclosing class, main declaration, and imports omitted)\nOrder a = new Order(1);\nOrder b = new Order(' + b + ');\n\nSystem.out.println(a.equals(b));\nSystem.out.println(a.hashCode() == b.hashCode());\n\nMap<Order, String> map = new HashMap<>();\nmap.put(a, "order details");\nSystem.out.println(map.get(b));\n\nSet<Order> set = new HashSet<>();\nset.add(a);\nset.add(b);\nSystem.out.println(set.size());';
    if (c.how === 'record') return 'record Order(int id) { }               // equals and hashCode are generated automatically' + use;
    var eq = '\n    @Override\n    public boolean equals(Object o) {\n        return o instanceof Order other && id == other.id;\n    }\n';
    var hc = c.how === 'const' ? '\n    @Override\n    public int hashCode() {\n        return 42;                       // the same value for every object\n    }\n' : '\n    @Override\n    public int hashCode() {\n        return Objects.hash(id);\n    }\n';
    return 'class Order {\n    final int id;\n    Order(int id) { this.id = id; }\n' + (c.how === 'eq' || c.how === 'both' || c.how === 'const' ? eq : '') + (c.how === 'hash' || c.how === 'both' || c.how === 'const' ? hc : '') + '}' + use;
  },
  label: function (c) { return { none: 'No overrides', eq: 'equals only', hash: 'hashCode only', both: 'Both', const: 'equals + hashCode 42', record: 'record' }[c.how] + ' · id ' + (c.same === 'same' ? '1 and 1' : '1 and 2'); },
  columns: ['a.equals(b)', 'Same hashCode?', 'map.get(b)', 'Size of set'],
  // Whether the two objects are equal according to equals, and whether their hashCode values are the same
  facts: function (c) {
    var same = c.same === 'same', eqOver = c.how === 'eq' || c.how === 'both' || c.how === 'const' || c.how === 'record', hashOver = c.how === 'hash' || c.how === 'both' || c.how === 'record';
    return { eq: eqOver && same, hs: c.how === 'const' ? true : hashOver && same, eqOver: eqOver, hashOver: hashOver || c.how === 'const' };
  },
  simulate: function (c) {
    var f = this.facts(c), same = c.same === 'same', bid = same ? 1 : 2, ev = [], sum = [];
    var st = { a: false, b: false, eq: '?', hs: '?', put: false, look: '', got: '?', set: '?' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var found = f.eq && f.hs;
    st.a = true; st.b = true;
    push('Two Order objects are created. The id of a is 1, and the id of b is ' + bid + '. ' + (same ? 'Their contents are the same, but in ' : 'In ') + 'memory they are two different objects.', '');
    st.eq = String(f.eq);
    if (!f.eqOver) push('a.equals(b): equals is not overridden, so the equals of Object is used. It is the same as ==, so it checks "are these the same object?". They are different objects, so the result is false.', same ? 'bad' : '');
    else push('a.equals(b): ' + (c.how === 'record' ? 'The equals generated for the record' : 'The overridden equals') + ' compares the id values. ' + (same ? 'They are 1 and 1, so the result is true.' : 'They are 1 and 2, so the result is false.'), f.eq ? 'good' : '');
    st.hs = String(f.hs);
    if (c.how === 'const') push('Comparing hashCode: This hashCode returns 42 for every object. The two values are the same.', '');
    else if (!f.hashOver) push('Comparing hashCode: hashCode is not overridden, so the hashCode of Object is used. This value is determined separately for each object, so the values of a and b, which are different objects, are (almost always) different.' + (f.eq ? ' Two objects for which equals is true now have different hashCode values. This breaks the contract that "equal objects must have equal hash codes".' : ''), f.eq ? 'bad' : '');
    else push('Comparing hashCode: ' + (c.how === 'record' ? 'The hashCode generated for the record' : 'The overridden hashCode') + ' computes its value from id. ' + (same ? 'The id values are the same, so the hashCode values are the same too.' : 'The id values are different, so the hashCode values are different too.'), f.hs ? 'good' : '');
    st.put = true;
    push('map.put(a, "order details"): HashMap first uses a.hashCode() to decide which bucket (storage location) the entry goes into, and then puts the key a together with the value in that bucket.', '');
    st.look = f.hs ? 'same' : 'other';
    if (f.hs) {
      push('map.get(b): First, b.hashCode() decides which bucket to look in. The hashCode is the same as that of a, so the lookup goes to the very bucket where a was put.', '');
      st.got = found ? 'order details' : 'null';
      push('The key a in that bucket is compared with b using equals. ' + (f.eq ? 'The result is true, so the two are treated as the same key and the value is returned.' : (f.eqOver ? 'The id values differ, so the result is false.' : 'equals is not overridden, so the result is false.') + ' Even in the same bucket, the two are treated as different keys, and null is returned.'), found ? 'good' : same ? 'bad' : '');
    } else {
      st.got = 'null';
      push('map.get(b): First, b.hashCode() decides which bucket to look in. The hashCode is different from that of a, so the lookup usually goes to a different bucket, and even in the same bucket, a key whose hash value is different never reaches equals. equals is never even called, and null is returned.' + (f.eq ? ' The value cannot be retrieved even though the two objects are equal according to equals.' : ''), f.eq ? 'bad' : '');
    }
    st.set = found ? '1' : '2';
    push('set.add(a), set.add(b): HashSet uses a HashMap internally, so it decides in the same order. ' + (found ? 'b is treated as the same element as a, which is already in the set, so b is not added. The size is 1.' : 'b is treated as a different element from a, so both are added. The size is 2.' + (same ? ' Objects with the same contents are now in the set as duplicates.' : '')), found ? 'good' : same ? 'bad' : '');
    if (same && f.eq && !f.hs) sum.push('If you override only equals, two objects that are equal according to equals go to different buckets. In a HashMap, a HashSet, or a cache that uses a HashMap, this becomes a bug in which you "put it in but cannot find it". When you override equals, override hashCode together with it, using the same fields.');
    if (same && !f.eq && f.hs) sum.push('If you override only hashCode, the lookup reaches the same bucket, but equals, which is the final check, is false. The two methods are a pair, so one alone is of no use.');
    if (same && !f.eqOver && !f.hashOver) sum.push('If you override nothing, an object is equal only to itself. For objects that should be treated as "the same thing if the values are the same", such as an order number or a coordinate, override both methods or declare the class as a record.');
    if (found) sum.push(c.how === 'record' ? 'A record automatically provides an equals that compares all the record components and a hashCode that matches it. It is a good fit for objects that hold values.' : c.how === 'const' ? 'Even if every object has the same hashCode, the contract is not broken and the results are correct. But all the keys end up in one bucket, so every lookup has to compare the keys in that bucket one by one with equals. As the number of keys grows, the HashMap gets slower.' : 'Two objects that are equal according to equals return the same hashCode, so HashMap and HashSet treat the two as the same key.');
    if (!same && c.how === 'const') sum.push('Two objects with different contents are allowed to have the same hashCode (a hash collision). They go into the same bucket and are then told apart with equals. However, the more collisions there are, the slower the lookups get, so it is better to write hashCode so that its values are spread evenly.');
    if (!same && c.how !== 'const') sum.push('Two objects with different contents are treated as different keys whichever option you choose.');
    return { events: ev, summary: sum, hs: f.hs, row: [String(f.eq), f.hs ? 'Same' : 'Different', st.got, st.set + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'equals', s.eq === '?' ? 'not compared yet' : 'a.equals(b) = ' + s.eq, s.eq === 'true' ? 'good' : s.eq === 'false' ? 'wait' : 'none');
  },
  // Diagram: the two key objects on the left, and the buckets of the HashMap on the right. hashCode decides the bucket, and equals checks the key in that bucket.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { a: false, b: false, eq: '?', hs: '?', put: false, look: '', got: '?', set: '?' }, hs = sim.hs;
    P.size(680, 300);
    P.region('ob', 16, 16, 236, 196, 'Objects used as keys');
    P.box('a', 30, 52, 208, 54, s.a ? { cls: 'wait', title: 'a = new Order(1)', sub: s.hs === '?' ? 'hashCode ?' : c.how === 'const' ? 'hashCode 42' : hs ? 'hashCode: same as b' : 'hashCode: differs from b' } : { cls: 'ghost', title: 'a', sub: 'not created yet' });
    P.box('b', 30, 130, 208, 54, s.b ? { cls: 'wait', title: 'b = new Order(' + (c.same === 'same' ? 1 : 2) + ')', sub: s.hs === '?' ? 'hashCode ?' : c.how === 'const' ? 'hashCode 42' : hs ? 'hashCode: same as a' : 'hashCode: differs from a' } : { cls: 'ghost', title: 'b', sub: 'not created yet' });
    P.region('mp', 300, 16, 364, 196, 'Buckets of the HashMap');
    P.box('k1', 316, 52, 332, 54, { cls: s.put ? (s.got === 'order details' ? 'good' : 'hot') : 'ghost', title: 'Bucket chosen by the hashCode of a', sub: s.put ? 'key a → "order details"' : 'empty' });
    if (!hs) P.box('k2', 316, 130, 332, 54, { cls: s.look === 'other' ? 'bad' : 'ghost', title: 'Bucket chosen by the hashCode of b', sub: 'empty' });
    if (s.put) P.arrow('pa', 'a:r', 'k1:l', { label: 'put' });
    if (s.look) P.arrow('gb', 'b:r', (s.look === 'same' ? 'k1' : 'k2') + ':l' + (s.look === 'same' ? ':0.75' : ''), { cls: s.got === 'order details' ? 'good' : 'bad', label: 'get' });
    var res = function (x, good) { return x === '?' ? 'ghost' : x === good ? 'good' : 'bad'; };
    P.box('r1', 16, 232, 320, 36, { cls: res(s.got, 'order details'), title: 'map.get(b)', right: s.got });
    P.box('r2', 344, 232, 320, 36, { cls: s.set === '?' ? 'ghost' : s.set === '1' ? 'good' : c.same === 'same' ? 'bad' : 'plain', title: 'Size of set', right: s.set === '?' ? '?' : s.set + '' });
    P.note('A bucket is actually a numbered slot in an array.');
  },
  assume: 'The results of the 12 combinations (equals, whether the hashCode values are the same, map.get, and the size of set) were checked against the results of running the same code on JDK 21 in our test environment. Saying that the values of two objects that do not override hashCode are "different" means that this is almost always the case. The hashCode of Object can also give the same value to different objects (this still does not break the contract), and in that case the key may be found, depending on the result of equals. Even within the same bucket, HashMap skips a key whose hashCode value is different, without calling equals. The specification does not define the exact value that the hashCode of a record returns, but it does guarantee that two records that are equal according to equals have the same hashCode.',
});
