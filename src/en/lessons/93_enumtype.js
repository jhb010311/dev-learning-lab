Lab.register({
  id: 'enumtype', nav: 'Enum classes', cat: 'Java language', mode: 'step',
  title: 'Why does an enum saved as a number come back as a different constant?',
  intro: 'An enum is a type that can have only a fixed set of values, such as the status of an order. Each constant is an object of which there is only one in the program, so constants can be compared with ==, and they can also have fields and methods. But if you save a constant to a database by writing down its position in the declaration (its ordinal), the same number refers to a different constant once the enum declaration is changed later.',
  terms: ['Enum class', 'ordinal() and name()', 'valueOf method of an enum class', 'Identity and equality'],
  controls: [
    { id: 'store', label: 'Value written when saving', type: 'select', value: 'ordinal', options: [['ordinal', 'ordinal(): the position in the declaration'], ['name', 'name(): the name of the constant'], ['code', 'The value of code, a field you define yourself']] },
    { id: 'change', label: 'How the enum declaration was changed after saving', type: 'select', value: 'insert', options: [['same', 'Not changed'], ['append', 'A new constant CANCELED added at the very end'], ['insert', 'A new constant CANCELED inserted in the middle'], ['swap', 'ORDERED and PAID swapped'], ['rename', 'PAID renamed to PAYMENT_DONE']] },
    { id: 'saved', label: 'Saved constant', type: 'select', value: 'PAID', options: [['ORDERED', 'ORDERED (Order received)'], ['PAID', 'PAID (Payment completed)'], ['SHIPPED', 'SHIPPED (Shipping started)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Which constant do you get when you read back a PAID saved with ordinal() after CANCELED is inserted in the middle of the enum?', d: 'The ordinal is saved, and then a constant is inserted in the middle. "Payment completed" is read as "Order canceled".', v: { store: 'ordinal', change: 'insert', saved: 'PAID' } },
    { t: 'Changing only the order', q: 'What if ORDERED and PAID are swapped instead of inserting a new constant?', d: 'Even if no constant is added, changing only the order makes the number refer to a different constant.', v: { store: 'ordinal', change: 'swap', saved: 'PAID' } },
    { t: 'Adding at the very end', q: 'What if the new constant CANCELED is added at the very end instead of in the middle?', d: 'The ordinals of the existing constants stay the same, so nothing goes wrong.', v: { store: 'ordinal', change: 'append', saved: 'PAID' } },
    { t: 'A constant that is safe by luck', q: 'What if the saved constant is ORDERED and CANCELED is still inserted in the middle?', d: 'The change is the same, but the ordinal of the first constant does not change.', v: { store: 'ordinal', change: 'insert', saved: 'ORDERED' } },
    { t: 'Saving by name', q: 'What if you save the value of name() instead of ordinal()?', d: 'The same constant comes back even after a constant is inserted in the middle.', v: { store: 'name', change: 'insert', saved: 'PAID' } },
    { t: 'Saved by name, then renamed', q: 'What if you save the value of name() and PAID is renamed to PAYMENT_DONE?', d: 'valueOf receives a name that does not exist and throws an IllegalArgumentException.', v: { store: 'name', change: 'rename', saved: 'PAID' } },
    { t: 'Saving a code you define yourself', q: 'What if you save the value of code, a field you define yourself, and PAID is renamed to PAYMENT_DONE?', d: 'The same constant comes back whether the order is changed or the name is changed.', v: { store: 'code', change: 'rename', saved: 'PAID' } },
  ],
  OLD: [['ORDERED', 'O', 'Order received'], ['PAID', 'P', 'Payment completed'], ['SHIPPED', 'S', 'Shipping started']],
  // The declaration after the change: [name, code, label]
  consts: function (change) {
    var o = this.OLD[0], p = this.OLD[1], s = this.OLD[2], x = ['CANCELED', 'C', 'Order canceled'];
    return { same: [o, p, s], append: [o, p, s, x], insert: [o, x, p, s], swap: [p, o, s], rename: [o, ['PAYMENT_DONE', 'P', 'Payment completed'], s] }[change];
  },
  // The saved value, the constant read from the current declaration (null if there is none), and the current name of the saved constant
  facts: function (c) {
    var cs = this.consts(c.change), oi = this.OLD.map(function (r) { return r[0]; }).indexOf(c.saved), old = this.OLD[oi];
    var value = c.store === 'ordinal' ? String(oi) : c.store === 'name' ? old[0] : old[1], read = null;
    if (c.store === 'ordinal') read = cs[oi];
    if (c.store === 'name') read = cs.filter(function (r) { return r[0] === value; })[0] || null;
    if (c.store === 'code') read = cs.filter(function (r) { return r[1] === value; })[0] || null;
    var now = c.change === 'rename' && c.saved === 'PAID' ? 'PAYMENT_DONE' : c.saved;
    return { cs: cs, oi: oi, old: old, value: value, shown: c.store === 'ordinal' ? value : '"' + value + '"', read: read, now: now, eq: !!read && read[0] === now };
  },
  code: function (c) {
    var f = this.facts(c), code = c.store === 'code', s = 'enum Status {\n';
    f.cs.forEach(function (r, i) { s += '    ' + r[0] + '(' + (code ? '"' + r[1] + '", ' : '') + '"' + r[2] + '")' + (i < f.cs.length - 1 ? ',' : ';') + '\n'; });
    s += '\n';
    if (code) s += '    private final String code;\n';
    s += '    private final String label;\n\n';
    if (code) s += '    Status(String code, String label) {\n        this.code = code;\n        this.label = label;\n    }\n\n';
    else s += '    Status(String label) {\n        this.label = label;\n    }\n\n';
    s += '    String label() {\n        return label;\n    }\n';
    if (code) s += '\n    static Status fromCode(String code) {\n        for (Status s : values()) {\n            if (s.code.equals(code)) return s;\n        }\n        throw new IllegalArgumentException("Unknown code: " + code);\n    }\n';
    s += '}\n\n';
    s += '// The value of ' + c.saved + (c.store === 'ordinal' ? '.ordinal()' : c.store === 'name' ? '.name()' : '.code') + ', saved under the old declaration (order: ORDERED, PAID, SHIPPED)\n';
    if (c.store === 'ordinal') s += 'int saved = ' + f.value + ';\nStatus s = Status.values()[saved];\n';
    if (c.store === 'name') s += 'String saved = "' + f.value + '";\nStatus s = Status.valueOf(saved);\n';
    if (c.store === 'code') s += 'String saved = "' + f.value + '";\nStatus s = Status.fromCode(saved);\n';
    return s + 'System.out.println(s + " (" + s.label() + ")");\nSystem.out.println(s == Status.' + f.now + ');';
  },
  label: function (c) { return { ordinal: 'saved by ordinal()', name: 'saved by name()', code: 'saved by code' }[c.store] + ' · ' + { same: 'declaration unchanged', append: 'added at the end', insert: 'inserted in the middle', swap: 'order swapped', rename: 'renamed' }[c.change] + ' · ' + c.saved; },
  columns: ['Saved value', 'Constant read back', '== the saved constant', 'How it ended'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], store = c.store, ch = c.change;
    var st = { savedOn: false, changed: false, read: '', failed: false, out: [], err: '', eq: '?', end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var order = function (cs) { return cs.map(function (r, i) { return r[0] + '(' + i + ')'; }).join(', '); };
    var ctor = store === 'code' ? 'PAID("P", "Payment completed") is a Status object created by passing "P" and "Payment completed" to the constructor' : 'PAID("Payment completed") is a Status object created by passing "Payment completed" to the constructor';

    push('The old enum declaration listed ORDERED, PAID, SHIPPED in that order: Each enum constant is one object. ' + ctor + ', and it is the only PAID object in the whole program. You cannot create another one with new.');
    st.savedOn = true;
    var HOW = { ordinal: c.saved + '.ordinal(), which is ' + f.value + '. ordinal() returns the position of the constant in the declaration, counted from 0.', name: c.saved + '.name(), which is "' + f.value + '". name() returns the name of the constant as a string.', code: 'the code field of ' + c.saved + ', which is "' + f.value + '". code is a value that you choose for each constant yourself, to be used when saving.' }[store];
    push('An order with the status ' + c.saved + ' was saved to the database: An enum object cannot be stored as it is, so a value that stands for the constant is written instead. Here that value is ' + HOW);
    st.changed = true;
    var CH = { append: 'The new constant CANCELED was added at the very end', insert: 'The new constant CANCELED was inserted between ORDERED and PAID', swap: 'The first two constants, ORDERED and PAID, were swapped', rename: 'PAID was renamed to PAYMENT_DONE' }[ch];
    if (ch === 'same') push('After that, the enum declaration was not changed: The ordinals are still ' + order(f.cs) + '.');
    else push('After that, the enum declaration was changed: ' + CH + '. The ordinals are now ' + order(f.cs) + '. The value written in the database (' + f.shown + ') is not updated and stays as it was.', ch === 'append' || ch === 'rename' ? '' : 'hot');

    var shifted = (ch === 'insert' || ch === 'swap');
    if (store === 'ordinal') {
      st.read = f.read[0];
      push('Status.values()[' + f.value + '] runs: values() returns an array that contains the constants in the order of the current declaration. The element at index ' + f.value + ' is ' + f.read[0] + '. ' + (f.eq ? (shifted ? 'It is the same as the saved constant, because the ordinal of this constant did not change in this edit.' : 'It is the same as the saved constant.') : 'The saved constant was ' + c.saved + ', but a different constant came back. There is no exception and no warning.'), f.eq ? 'good' : 'bad');
    } else if (store === 'name') {
      if (f.read) { st.read = f.read[0]; push('Status.valueOf("' + f.value + '") runs: It finds the constant whose name is exactly "' + f.value + '" and returns it. It looks up the constant by name, not by ordinal, so a change in the order or the number of constants has no effect.', 'good'); }
      else {
        st.failed = true; st.err = 'Exception in thread "main" java.lang.IllegalArgumentException: No enum constant Status.' + f.value; st.end = 'Stopped by an exception';
        push('Status.valueOf("' + f.value + '") runs: It looks for the constant whose name is exactly "' + f.value + '". The current declaration has no such name. In this case valueOf does not return null. It throws an IllegalArgumentException (message: No enum constant Status.' + f.value + '). Nothing catches the exception, so the program stops at this line.', 'bad');
      }
    } else {
      st.read = f.read[0];
      push('Status.fromCode("' + f.value + '") runs: This method, which you write yourself inside the enum, looks at the constants one by one to find the one whose code field is "' + f.value + '". The constant it finds is ' + f.read[0] + '. Changing the order or the names has no effect as long as the code values are left as they are.', 'good');
    }
    if (f.read) {
      var line = f.read[0] + ' (' + f.read[2] + ')';
      st.out.push(line);
      push('System.out.println(s + " (" + s.label() + ")") runs: The output is "' + line + '". label() is a method that you write yourself inside the enum, and it returns the label value that the constant received when it was created. An enum is also a class, so it can have fields and methods like this.');
      st.eq = String(f.eq); st.out.push(String(f.eq)); st.end = 'Ended normally';
      push('s == Status.' + f.now + ' runs: The result is ' + f.eq + '. There is only one object for each enum constant, so the same constant is the same object no matter how it was obtained. That is why you can compare with == instead of equals. ' + (f.eq ? 'The s that was just read and the Status.' + f.now + ' written in the code are the same object.' : 'The result is false not because of how the comparison is done, but because s really is a different constant (' + f.read[0] + ').') + ' The program ends normally.', f.eq ? 'good' : 'bad');
    }
    var endText = f.read ? 'Ended normally' : 'Stopped by an exception: java.lang.IllegalArgumentException: No enum constant Status.' + f.value;
    var row = [f.shown, f.read ? f.read[0] + ' (' + f.read[2] + ')' : '(not read)', f.read ? String(f.eq) : '(not read)', endText];
    if (store === 'ordinal' && !f.eq) sum.push('ordinal() is only the position in the declaration, so when a constant is inserted in the middle or the order is changed, a number that was already saved refers to a different constant. No exception is thrown, so wrong data is used silently: an order that is "' + f.old[2] + '" is shown as "' + f.read[2] + '". Do not save ordinal() values.');
    if (store === 'ordinal' && f.eq && shifted) sum.push('This constant was safe because its ordinal did not change. With the same change, data that saved a different constant goes wrong.');
    if (store === 'ordinal' && ch === 'append') sum.push('Adding a constant at the very end does not change the ordinals of the existing constants. But everyone who edits the enum has to keep the promise "always add only at the end" from then on, so avoid saving ordinal() values in the first place.');
    if (store === 'ordinal' && ch === 'rename') sum.push('Renaming a constant does not affect the ordinals. Data saved by ordinal goes wrong when the order is touched.');
    if (store === 'ordinal' && ch === 'same') sum.push('As long as the declaration is not changed, saving the ordinal does not reveal any problem.');
    if (store === 'name' && f.read) sum.push('When you save with name(), the same constant is read back even if constants are added or the order is changed.' + (ch === 'rename' ? ' This time only PAID was renamed, so ' + c.saved + ' was not affected.' : ' In return, you must not rename the constants.'));
    if (store === 'name' && !f.read) sum.push('valueOf throws an IllegalArgumentException when it receives a name that does not exist. The same happens when only the case differs ("paid"). If you saved by name, renaming a constant amounts to making the saved data unreadable. Even so, an exception that shows the problem right away is better than silently getting a different constant.');
    if (store === 'code') sum.push('If you define the value to save as a separate field of the enum, you can change both the order and the names of the constants freely. In return, a code value must not be changed once it is set. This approach is possible because an enum can have fields and methods.');
    if (f.read) sum.push('Use == to compare enum constants. There is only one object for each constant, so the result is the same as with equals, no exception is thrown even when one side is null, and comparing constants of different enum classes is reported as a compile-time error.');
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, f = this.facts(c);
    if (!s) { H.text(v, 'Click Run to go one step at a time, from saving the value to reading it back.'); return; }
    var cs = s.changed ? f.cs : this.OLD, code = c.store === 'code';
    H.table(v, ['ordinal()', 'name()'].concat(code ? ['code'] : [], ['label()']), cs.map(function (r, i) {
      var hit = s.read === r[0] && s.changed;
      return { cells: [String(i), { v: r[0], cls: hit ? (f.eq ? 'good' : 'bad') : '' }].concat(code ? [r[1]] : [], [r[2]]) };
    }), s.changed ? 'The current enum declaration' : 'The old enum declaration');
    var ln = H.lanes(v);
    H.lane(ln, 'How it is read', { ordinal: 'Status.values()[' + f.value + ']', name: 'Status.valueOf("' + f.value + '")', code: 'Status.fromCode("' + f.value + '")' }[c.store], 'none');
    H.title(v, 'Console output');
    var lines = s.out.slice(); if (s.err) lines.push(s.err + '  (error output)');
    v.appendChild(H.el('pre', 'code', lines.length ? lines.join('\n') : '(nothing yet)'));
    H.counters(v, [[s.end, 'Program']]);
  },
  // Diagram: the constants of the old declaration in order at the top, the constants of the current declaration in order at the bottom, and the saved value in the middle. One arrow goes from the saved constant to the value, and another from the value to the constant that is read back.
  draw: function (P, sim, shown) {
    var c = sim.c, f = this.facts(c), last = shown[shown.length - 1], s = last ? last.snap : { savedOn: false, changed: false, read: '', failed: false, out: [], err: '', eq: '?', end: '?' };
    var attr = function (r, i) { return c.store === 'ordinal' ? 'ordinal ' + i : c.store === 'name' ? 'name ' + r[0] : 'code ' + r[1]; };
    P.size(680, 334);
    P.region('old', 16, 16, 648, 98, 'Old declaration (when saving)');
    this.OLD.forEach(function (r, i) { P.box('o_' + r[0], 30 + i * 156, 46, 152, 56, { cls: s.savedOn && r[0] === c.saved ? 'hot' : 'plain', title: r[0], sub: [attr(r, i), r[2]] }); });
    P.box('saved', 214, 126, 252, 34, { cls: s.savedOn ? (s.failed ? 'bad' : 'hot') : 'ghost', title: 'Value in the DB', right: s.savedOn ? f.shown : 'none yet' });
    P.region('new', 16, 172, 648, 98, s.changed ? 'Current declaration (when reading)' : 'Current declaration (not changed yet)');
    f.cs.forEach(function (r, i) {
      var hit = s.read === r[0];
      P.box('n_' + r[0], 30 + i * 156, 202, 152, 56, { cls: !s.changed ? 'ghost' : hit ? (f.eq ? 'good now' : 'bad now') : r[0] === 'CANCELED' || r[0] === 'PAYMENT_DONE' ? 'wait' : 'plain', title: r[0], sub: [attr(r, i), r[2]] });
    });
    if (s.savedOn) P.arrow('a_save', 'o_' + c.saved + ':b', 'saved:t', { cls: 'hot', label: 'save' });
    if (s.read) P.arrow('a_read', 'saved:b', 'n_' + s.read + ':t', { cls: f.eq ? 'good' : 'bad', label: 'read' });
    P.box('r1', 16, 284, 320, 34, { cls: s.failed ? 'bad' : s.read ? (f.eq ? 'good' : 'bad') : 'ghost', title: 'Constant read back', right: s.failed ? 'exception thrown' : s.read || '?' });
    P.box('r2', 344, 284, 320, 34, { cls: s.eq === 'true' ? 'good' : s.eq === 'false' ? 'bad' : s.failed ? 'bad' : 'ghost', title: '== the saved constant', right: s.failed ? 'not compared' : s.eq });
    P.note('Each box is one enum constant (one object). Looking up by ordinal means going straight down from the top row to the same position in the bottom row. Looking up by name or by code follows the constant to whatever position it has moved to.');
  },
  assume: 'All 45 combinations were checked by actually compiling and running the code shown on the screen (the enum declaration after the change and the code below it) on JDK 21 on this PC, and comparing the saved value, the two lines of output, the exit code, and the exception message. The saved values were obtained by actually getting ordinal(), name(), and code from the enum with the old declaration. In the code on the screen, the five lines below the enum declaration are inside the main method, and the declaration of main is omitted. The following were also checked in the same way: the same constant is the same object no matter how it is obtained, valueOf also throws an exception for a name that differs only in case, == does not throw an exception even when one side is null, and comparing constants of different enum classes with == is a compile-time error. No real database was used. The saved value was written directly in the code to imitate one. A change that removes a constant is not included in the settings. If a constant is removed, reading by ordinal returns a later constant that has moved up or throws an exception because the index is outside the array (ArrayIndexOutOfBoundsException), and reading by name makes valueOf throw an exception (this was also checked by running it separately).',
});
