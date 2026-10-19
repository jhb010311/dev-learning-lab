Lab.register({
  id: 'immut', nav: 'Immutability and defensive copies', cat: 'Java language', mode: 'step',
  title: 'The field is final, but its value changed',
  intro: 'In Order, a class made up for this example, the final field items refers to a list of items. final means only that items cannot be made to refer to a different list. It does not prevent the contents of that list from changing. Making a copy instead of storing the list received from outside, or returning the list the field refers to, as it is, is called a defensive copy. This lab shows whether outside code can change the contents of the order, depending on whether the constructor and the getter make a copy.',
  terms: ['Immutable object', 'Defensive copy', 'final', 'Encapsulation', 'record'], ranks: ['string', 'oop', 'javaver'],
  controls: [
    { id: 'in', label: 'The list passed to the constructor is', type: 'select', value: 'ref', options: [['ref', 'stored in the field as it is'], ['copy', 'copied and then stored']] },
    { id: 'out', label: 'What the getter returns', type: 'select', value: 'none', options: [['none', 'The list items refers to'], ['copy', 'A copy of that list'], ['unmod', 'An unmodifiable view']] },
  ],
  presets: [
    { t: 'Default settings', q: 'If the constructor stores the list as it is and the getter returns the list items refers to as it is, can outside code change the items of the order?', d: 'No defense at all. The items of the order are changed from outside through two paths.', v: { in: 'ref', out: 'none' } },
    { t: 'Copy only in the constructor', q: 'What if the constructor copies the list and then stores it?', d: 'Changing the original list has no effect, but the items of the order can still be changed through the getter.', v: { in: 'copy', out: 'none' } },
    { t: 'Copy on both sides', q: 'What if the constructor stores a copy and the getter also returns a copy of that list?', d: 'There is no way to change the items of the order from outside.', v: { in: 'copy', out: 'copy' } },
    { t: 'The getter returns an unmodifiable view', q: 'What if the constructor stores a copy and the getter returns an unmodifiable view?', d: 'An attempt to change it throws an exception.', v: { in: 'copy', out: 'unmod' } },
    { t: 'A view only, with no copy in the constructor', q: 'What if the constructor stores the list as it is and only the getter returns an unmodifiable view?', d: 'The items of the order can still be changed through the original list.', v: { in: 'ref', out: 'unmod' } },
  ],
  code: function (c) {
    return 'import java.util.*;\n\nclass Order {\n    private final List<String> items;          // final: cannot be replaced with another list\n\n    Order(List<String> items) {\n        this.items = ' + (c.in === 'copy' ? 'new ArrayList<>(items);   // stores a copy' : 'items;                    // stores the list it received as it is') + '\n    }\n\n    List<String> getItems() {\n        return ' + { none: 'items;                            // hands out the list items refers to', copy: 'new ArrayList<>(items);           // returns a copy', unmod: 'Collections.unmodifiableList(items);  // unmodifiable view' }[c.out] + '\n    }\n}\n\nclass Main {\n    public static void main(String[] args) {\n        List<String> src = new ArrayList<>(List.of("keyboard", "mouse"));\n        Order order = new Order(src);\n        src.add("monitor");                // (1) modifies the original list\n        order.getItems().add("chair");     // (2) modifies the list returned by the getter\n    }\n}';
  },
  label: function (c) { return 'Constructor: ' + (c.in === 'copy' ? 'copy' : 'as it is') + ' · getter: ' + { none: 'as it is', copy: 'copy', unmod: 'unmodifiable view' }[c.out]; },
  columns: ['Order items after (1)', 'Result of (2)', 'Order items at the end', 'Could outside code change the items?'],
  // Pure calculation used to check the model against the real run results
  calc: function (c) { var copyIn = c.in === 'copy', a = copyIn ? 2 : 3, via = c.out === 'unmod' ? 'UnsupportedOperationException' : 'ok', fin = a + (c.out === 'none' ? 1 : 0); return { a: a, via: via, fin: fin }; },
  simulate: function (c) {
    var r = this.calc(c), ev = [], sum = [], src = ['keyboard', 'mouse'], inner = c.in === 'copy' ? src.slice() : src, shared = c.in !== 'copy';
    function push(s, k, note) { ev.push({ s: s, k: k, snap: { src: src.slice(), inner: inner.slice(), shared: shared, note: note || '' } }); }
    push('An Order is created from the src list ["keyboard", "mouse"]. ' + (shared ? 'The constructor stored the list it received in the field as it is. The variable src and order.items refer to the same single list object on the heap.' : 'The constructor made a copy of the list it received and stored the copy in the field. src and order.items are different list objects.'), shared ? 'bad' : 'good');
    src.push('monitor');
    push('(1) src.add("monitor"): Outside code adds an element to the original list. ' + (shared ? 'src and order.items refer to the same list, so looking through order.items also shows 3 items now. The state of the Order changed even though not a single method of Order was called. Declaring items as final does not prevent this.' : 'order.items refers to a copy, so it is not affected. The list order.items refers to still has 2 items.'), shared ? 'bad' : 'good');
    if (c.out === 'none') { inner.push('chair'); push('(2) order.getItems().add("chair"): The getter returned the list order.items refers to as it is. Adding to that list is the same as adding to the list order.items refers to. order.items now has ' + inner.length + ' items.', 'bad'); }
    if (c.out === 'copy') push('(2) order.getItems().add("chair"): The getter returned a copy. "chair" was added only to that copy, and the list order.items refers to still has ' + inner.length + ' items.', 'good');
    if (c.out === 'unmod') push('(2) order.getItems().add("chair"): The getter returned an unmodifiable view. The moment add is called, an UnsupportedOperationException is thrown. The list order.items refers to still has ' + inner.length + ' items.', 'good', 'UnsupportedOperationException');
    var leak = r.fin !== 2;
    sum.push('final only prevents a variable from being made to refer to a different object. It does not prevent the contents of that object from changing. To make an object immutable, you must make sure that the mutable objects its fields refer to (lists, arrays, Date, and so on) are not shared with outside code.');
    if (leak) sum.push('The state of the Order was changed from outside. You must copy the list when you receive it (in the constructor), and when you hand it out (in the getter) you must also hand out a copy or an unmodifiable view. Making such copies is called defensive copying.');
    else sum.push('Both the way in and the way out are protected, so the state of the Order cannot be changed from outside. The constructor stored a copy of the list it received (a defensive copy), so changing src from outside does not affect the order. Using List.copyOf(items) in the constructor gives you a copy and an unmodifiable list in one step.');
    if (c.in === 'ref' && c.out === 'unmod') sum.push('An unmodifiable view means that the list cannot be changed "through this view". If the code that holds the original list changes it, the change is visible through the view as well.');
    sum.push('The same is true of a record. Its fields are final, but if a field refers to a mutable object such as a list, the contents of that object can still change.');
    return { events: ev, summary: sum, res: r, row: [r.a + ' items', r.via === 'ok' ? 'Added (no exception)' : r.via, r.fin + ' items', leak ? 'Yes' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    H.title(v, 'The list that the variable src refers to'); H.slots(v, s.src.map(function (x) { return [x, 'q']; }), '');
    H.title(v, 'The list that order.items refers to' + (s.shared ? ' (the same object as above)' : ' (a separate object)')); H.slots(v, s.inner.map(function (x, i) { return [x, i >= 2 ? 'r' : 'd']; }), '');
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
    else { list('L', 46, 'List object that src refers to', s.src, 'wait'); list('M', 138, 'List object order.items refers to (a copy)', s.inner, 'bad'); P.arrow('a_src', 'v_src:r', 'L:l'); P.arrow('a_items', 'v_items:r', 'M:l'); }
    if (s.note) P.box('ex', 296, 232, 352, 34, { cls: 'bad', title: 'Call to add()', right: s.note });
    else if (c.out === 'copy' && shown.length >= 3) P.box('tmp', 296, 232, 352, 34, { cls: 'ghost', title: 'Copy from getter', right: '"chair" is added only here' });
    P.text('cnt', 30, 256, 'order.items has ' + s.inner.length + ' items', { cls: s.inner.length > 2 ? 'bad' : 'good' });
    P.note('A green cell is an item that was there from the start. A red cell is an item that was added from outside the Order but ended up in the list order.items refers to. When both arrows reach the same list, a change made on one side is visible on the other side as well.');
  },
  assume: 'The results of the 6 combinations (the number of items and the exception) were checked against the results of running the same code on JDK 21 in our test environment. In this case the elements of the list (String) are immutable, so a shallow copy is enough. If the elements themselves were mutable objects, the elements would also have to be copied to separate the two completely.',
});
