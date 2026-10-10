Lab.register({
  id: 'immut', nav: 'Immutability and defensive copies', cat: 'Java language', mode: 'step',
  title: 'The field is final, but its value changed',
  intro: 'An Order object holds its list of items in a final field. final means only that the field cannot be made to refer to a different list. It does not prevent the contents of that list from changing. See whether code outside the object can change its internal state, depending on how the constructor and the getter handle the list.',
  terms: ['Immutable object', 'final', 'Encapsulation', 'record'], ranks: ['string', 'oop', 'javaver'],
  controls: [
    { id: 'in', label: 'The list passed to the constructor is', type: 'select', value: 'ref', options: [['ref', 'stored in the field as it is'], ['copy', 'copied and then stored']] },
    { id: 'out', label: 'What the getter returns', type: 'select', value: 'none', options: [['none', 'The internal list itself'], ['copy', 'A copy of the internal list'], ['unmod', 'An unmodifiable view']] },
  ],
  presets: [
    { t: 'Default settings', d: 'No defense at all. The internal state is changed from outside through two paths.', v: { in: 'ref', out: 'none' } },
    { t: 'Copy only in the constructor', d: 'Changing the original list has no effect, but the internal state can still be changed through the getter.', v: { in: 'copy', out: 'none' } },
    { t: 'Copy on both sides', d: 'There is no way to change the internal state from outside.', v: { in: 'copy', out: 'copy' } },
    { t: 'The getter returns an unmodifiable view', d: 'An attempt to change it throws an exception.', v: { in: 'copy', out: 'unmod' } },
    { t: 'A view only, with no copy in the constructor', d: 'The internal state can still be changed through the original list.', v: { in: 'ref', out: 'unmod' } },
  ],
  code: function (c) {
    return 'class Order {\n    private final List<String> items;          // final: cannot be replaced with another list\n\n    Order(List<String> items) {\n        this.items = ' + (c.in === 'copy' ? 'new ArrayList<>(items);   // stores a copy' : 'items;                    // stores the list it received as it is') + '\n    }\n\n    List<String> getItems() {\n        return ' + { none: 'items;                            // exposes the internal list itself', copy: 'new ArrayList<>(items);           // returns a copy', unmod: 'Collections.unmodifiableList(items);  // unmodifiable view' }[c.out] + '\n    }\n}\n\nList<String> src = new ArrayList<>(List.of("keyboard", "mouse"));\nOrder order = new Order(src);\nsrc.add("monitor");                // (1) modifies the original list\norder.getItems().add("chair");     // (2) modifies the list returned by the getter';
  },
  label: function (c) { return 'Constructor: ' + (c.in === 'copy' ? 'copy' : 'as it is') + ' · getter: ' + { none: 'as it is', copy: 'copy', unmod: 'unmodifiable view' }[c.out]; },
  columns: ['Items inside after (1)', 'Result of (2)', 'Items inside at the end', 'Could outside code change the inside?'],
  // Pure calculation used to check the model against the real run results
  calc: function (c) { var copyIn = c.in === 'copy', a = copyIn ? 2 : 3, via = c.out === 'unmod' ? 'UnsupportedOperationException' : 'ok', fin = a + (c.out === 'none' ? 1 : 0); return { a: a, via: via, fin: fin }; },
  simulate: function (c) {
    var r = this.calc(c), ev = [], sum = [], src = ['keyboard', 'mouse'], inner = c.in === 'copy' ? src.slice() : src, shared = c.in !== 'copy';
    function push(s, k, note) { ev.push({ s: s, k: k, snap: { src: src.slice(), inner: inner.slice(), shared: shared, note: note || '' } }); }
    push('An Order is created from the src list ["keyboard", "mouse"]. ' + (shared ? 'The constructor stored the list it received in the field as it is. The variable src and order.items refer to the same single list object on the heap.' : 'The constructor made a copy of the list it received and stored the copy in the field. src and order.items are different list objects.'), shared ? 'bad' : 'good');
    src.push('monitor');
    push('(1) src.add("monitor"): Outside code adds an element to the original list. ' + (shared ? 'It is the same object, so the order now has 3 items inside as well. The state of the Order changed even though not a single method of Order was called. Declaring items as final does not prevent this.' : 'The order holds a copy, so it is not affected. It still has 2 items inside.'), shared ? 'bad' : 'good');
    if (c.out === 'none') { inner.push('chair'); push('(2) order.getItems().add("chair"): The getter returned the internal list itself. Adding to that list is the same as adding to the inside of the order. The order now has ' + inner.length + ' items inside.', 'bad'); }
    if (c.out === 'copy') push('(2) order.getItems().add("chair"): The getter returned a copy. "chair" was added only to that copy, and the order still has ' + inner.length + ' items inside.', 'good');
    if (c.out === 'unmod') push('(2) order.getItems().add("chair"): The getter returned an unmodifiable view. The moment add is called, an UnsupportedOperationException is thrown. The order still has ' + inner.length + ' items inside.', 'good', 'UnsupportedOperationException');
    var leak = r.fin !== 2;
    sum.push('Items inside after (1): ' + r.a + '. Result of (2): ' + (r.via === 'ok' ? 'no exception' : r.via) + '. Items inside at the end: ' + r.fin + ' (2 at the start).');
    sum.push('final only prevents a variable from being made to refer to a different object. It does not prevent the contents of that object from changing. To make an object immutable, you must make sure that the mutable objects its fields refer to (lists, arrays, Date, and so on) are not shared with outside code.');
    if (leak) sum.push('The internal state was changed from outside. You must copy the list when you receive it (in the constructor), and when you hand it out (in the getter) you must also copy it or wrap it so that it cannot be modified. Making such copies is called defensive copying.');
    else sum.push('Both the way in and the way out are protected, so the internal state cannot be changed from outside. Using List.copyOf(items) in the constructor gives you a copy and an unmodifiable list in one step.');
    if (c.in === 'ref' && c.out === 'unmod') sum.push('An unmodifiable view means that the list cannot be changed "through this view". If the code that holds the original list changes it, the change is visible through the view as well.');
    sum.push('The same is true of a record. Its fields are final, but if a field holds a mutable object such as a list, the contents of that object can still change.');
    return { events: ev, summary: sum, res: r, row: [r.a + ' items', r.via === 'ok' ? 'Added (no exception)' : r.via, r.fin + ' items', leak ? 'Yes' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    H.title(v, 'The list that the variable src refers to'); H.slots(v, s.src.map(function (x) { return [x, 'q']; }), '');
    H.title(v, 'The list that order.items refers to' + (s.shared ? ' (the same object as above)' : ' (a separate object)')); H.slots(v, s.inner.map(function (x, i) { return [x, i >= 2 ? 'r' : 'd']; }), '');
    H.counters(v, [[s.inner.length + ' items', 'Items inside the Order (2 at the start)'], [s.note || 'none', 'Exception thrown']]);
  },
  // Diagram: on the left, the variable src and the field order.items; on the right, the list objects on the heap. The key point is whether the two refer to the same list.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { src: ['keyboard', 'mouse'], inner: ['keyboard', 'mouse'], shared: c.in !== 'copy', note: '' };
    P.size(680, 300);
    P.region('vars', 16, 16, 210, 268, 'Variable and field');
    P.region('heap', 280, 16, 384, 268, 'Heap');
    P.box('v_src', 30, 70, 182, 34, { cls: 'wait', title: 'src', right: 'reference' });
    P.box('v_items', 30, 160, 182, 34, { cls: 'wait', title: 'order.items', right: 'final' });
    function list(id, y, title, arr, extra) {
      P.box(id, 296, y, 352, 74, { cls: 'plain', title: title });
      arr.forEach(function (x, i) { P.box(id + '_' + x, 306 + i * 85, y + 34, 79, 28, { cls: i >= 2 ? extra : 'good', sub: x, center: true }); });
    }
    if (s.shared) { list('L', 92, 'List object (both refer to this one)', s.inner, 'bad'); P.arrow('a_src', 'v_src:r', 'L:l:0.35', { cls: 'bad' }); P.arrow('a_items', 'v_items:r', 'L:l:0.65', { cls: 'bad' }); }
    else { list('L', 46, 'List object that src refers to', s.src, 'wait'); list('M', 138, 'List object held by order (a copy)', s.inner, 'bad'); P.arrow('a_src', 'v_src:r', 'L:l'); P.arrow('a_items', 'v_items:r', 'M:l'); }
    if (s.note) P.box('ex', 296, 232, 352, 34, { cls: 'bad', title: 'Call to add()', right: s.note });
    else if (c.out === 'copy' && shown.length >= 3) P.box('tmp', 296, 232, 352, 34, { cls: 'ghost', title: 'Copy from getter', right: '"chair" is added only here' });
    P.text('cnt', 30, 256, 'The Order has ' + s.inner.length + ' items inside', { cls: s.inner.length > 2 ? 'bad' : 'good' });
    P.note('A green cell is an item that was there from the start. A red cell is an item that was added from outside the Order but ended up inside it. When both arrows reach the same list, a change made on one side is visible on the other side as well.');
  },
  assume: 'The results of the 6 combinations (the number of items inside and the exception) were checked against the results of running the same code on JDK 21 on this PC. In this case the elements of the list (String) are immutable, so a shallow copy is enough. If the elements themselves were mutable objects, the elements would also have to be copied to separate the two completely.',
});
