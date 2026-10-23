Lab.register({
  id: 'enumtype', nav: 'Enum classes', cat: 'Java language', mode: 'step',
  title: 'Why does an enum saved with @Enumerated(EnumType.ORDINAL) come back as a different constant?',
  why: 'Before enums, values such as the status of an order were represented with int constants or strings. Then the compiler could not stop you from passing a number that was not defined or a misspelled string, and it was hard to notice when constants of another kind that used the same numbers got mixed in. An enum groups the possible values into one type, so code that passes any other value or a constant of another kind is blocked at compile time. But a database column cannot hold an enum object as it is, so JPA lets you decide, with @Enumerated and AttributeConverter, how to turn it into a number or text when saving and turn it back when reading.',
  use: 'It is used to represent values whose kinds are decided in advance, such as order status, payment method, and member grade. For an enum field of a JPA entity, it is usual to write @Enumerated(EnumType.STRING) to save the name of the constant. If you do not write @Enumerated, the value is saved with the default, ORDINAL (the position in the declaration). If you must save a short code such as P or S in the database, you create an AttributeConverter and specify it with @Convert.',
  intro: 'An enum is a type that can have only a fixed set of values, such as the status of an order. When you save an enum field of a JPA entity to a database, you choose how to save it with @Enumerated. EnumType.ORDINAL saves the position of the constant in the declaration, and EnumType.STRING saves the name of the constant. If you save by number and later change the order of the enum declaration, the number in the database stays the same, but the constant that the number refers to changes. This lab follows the results that Hibernate actually saved and read back.',
  terms: ['Enum class', '@Enumerated', 'AttributeConverter', 'ordinal() and name()', 'valueOf method of an enum class'],
  controls: [
    { id: 'store', label: 'How the status field is saved', type: 'select', value: 'ORDINAL', options: [['ORDINAL', '@Enumerated(EnumType.ORDINAL): the position in the declaration'], ['STRING', '@Enumerated(EnumType.STRING): the name of the constant'], ['code', '@Convert + AttributeConverter: a code value you define']] },
    { id: 'change', label: 'How the enum declaration was changed after saving', type: 'select', value: 'insert', options: [['same', 'Not changed'], ['append', 'A new constant CANCELED added at the very end'], ['insert', 'A new constant CANCELED inserted in the middle'], ['swap', 'ORDERED and PAID swapped'], ['rename', 'PAID renamed to PAYMENT_DONE']] },
    { id: 'saved', label: 'Status of the saved order', type: 'select', value: 'PAID', options: [['ORDERED', 'ORDERED (Order received)'], ['PAID', 'PAID (Payment completed)'], ['SHIPPED', 'SHIPPED (Shipping started)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Which constant do you get when you read back a PAID order saved with @Enumerated(EnumType.ORDINAL), after CANCELED is inserted in the middle of the enum and the application is deployed again?', d: 'The number 1 stays in the database, and in the current declaration, position 1 is CANCELED. An order with payment completed is read as a canceled order.', v: { store: 'ORDINAL', change: 'insert', saved: 'PAID' } },
    { t: 'Even changing only the order', q: 'What if ORDERED and PAID are swapped instead of inserting a new constant?', d: 'Even if no constant is added, changing only the order makes the number refer to a different constant.', v: { store: 'ORDINAL', change: 'swap', saved: 'PAID' } },
    { t: 'Adding at the very end', q: 'What if the new constant CANCELED is added at the very end instead of in the middle?', d: 'The numbers of the existing constants stay the same, so the same constant is read.', v: { store: 'ORDINAL', change: 'append', saved: 'PAID' } },
    { t: 'A constant that is safe by luck', q: 'What if the saved order is ORDERED and CANCELED is still inserted in the middle?', d: 'The change is the same, but the number of the first constant does not change.', v: { store: 'ORDINAL', change: 'insert', saved: 'ORDERED' } },
    { t: 'Saving with STRING', q: 'What if you change the way of saving to @Enumerated(EnumType.STRING) and insert CANCELED in the middle?', d: 'The name is saved in the database, so the same constant is read even if the order changes.', v: { store: 'STRING', change: 'insert', saved: 'PAID' } },
    { t: 'STRING, but the name is changed', q: 'What if you save with @Enumerated(EnumType.STRING) and then rename PAID to PAYMENT_DONE?', d: 'No constant matches "PAID" in the database, so em.find throws an exception.', v: { store: 'STRING', change: 'rename', saved: 'PAID' } },
    { t: 'Saving a code with AttributeConverter', q: 'What if you save the code value P with an AttributeConverter instead of @Enumerated, and rename PAID to PAYMENT_DONE?', d: 'What is saved is a code, not a name or a number, so the same constant is read even if the name is changed.', v: { store: 'code', change: 'rename', saved: 'PAID' } },
  ],
  OLD: [['ORDERED', 'O', 'Order received'], ['PAID', 'P', 'Payment completed'], ['SHIPPED', 'S', 'Shipping started']],
  // The status column that Hibernate 7.4.5 created in H2 at the first deployment (checked with EnumTypeProbe)
  DDL: { ORDINAL: 'status tinyint check ((status between 0 and 2))', STRING: "status enum ('ORDERED','PAID','SHIPPED')", code: "status varchar(255) check ((status in ('P','S','O')))" },
  // The exception that em.find throws when it reads a row saved with STRING after a constant was renamed (checked with EnumTypeProbe)
  RENAME_ERR: 'java.lang.IllegalArgumentException: No enum constant OrderStatus.PAID',
  // The declaration after the change: [name, code, label]
  consts: function (change) {
    var o = this.OLD[0], p = this.OLD[1], s = this.OLD[2], x = ['CANCELED', 'C', 'Order canceled'];
    return { same: [o, p, s], append: [o, p, s, x], insert: [o, x, p, s], swap: [p, o, s], rename: [o, ['PAYMENT_DONE', 'P', 'Payment completed'], s] }[change];
  },
  // What was changed after saving, written above the enum declaration in the code on the screen
  CHNOTE: { same: 'it was not changed after saving', append: 'CANCELED was added at the very end after saving', insert: 'CANCELED was inserted between ORDERED and PAID after saving', swap: 'ORDERED and PAID were swapped after saving', rename: 'PAID was renamed to PAYMENT_DONE after saving' },
  // The value saved in the database, the constant read from the current declaration (null if there is none), and the current name of the saved constant
  facts: function (c) {
    var cs = this.consts(c.change), oi = this.OLD.map(function (r) { return r[0]; }).indexOf(c.saved), old = this.OLD[oi];
    var value = c.store === 'ORDINAL' ? String(oi) : c.store === 'STRING' ? old[0] : old[1], read = null;
    if (c.store === 'ORDINAL') read = cs[oi] || null;
    if (c.store === 'STRING') read = cs.filter(function (r) { return r[0] === value; })[0] || null;
    if (c.store === 'code') read = cs.filter(function (r) { return r[1] === value; })[0] || null;
    var now = c.change === 'rename' && c.saved === 'PAID' ? 'PAYMENT_DONE' : c.saved;
    return { cs: cs, oi: oi, old: old, value: value, shown: c.store === 'ORDINAL' ? value : "'" + value + "'", read: read, now: now, eq: !!read && read[0] === now };
  },
  code: function (c) {
    var f = this.facts(c), code = c.store === 'code', s = '// File: OrderStatus.java\n// An enum we made as an example to represent the order status. When it was saved, the declaration was in the order ORDERED, PAID, SHIPPED, and ' + this.CHNOTE[c.change] + '\n';
    if (!code) s += 'public enum OrderStatus { ' + f.cs.map(function (r) { return r[0]; }).join(', ') + ' }\n\n';
    else {
      s += 'public enum OrderStatus {\n';
      f.cs.forEach(function (r, i) { s += '    ' + r[0] + '("' + r[1] + '")' + (i < f.cs.length - 1 ? ',' : ';') + '\n'; });
      s += '\n    private final String code;\n\n    OrderStatus(String code) {\n        this.code = code;\n    }\n\n    public String getCode() {\n        return code;\n    }\n\n' +
        '    public static OrderStatus fromCode(String code) {\n        for (OrderStatus s : values()) {\n            if (s.code.equals(code)) {\n                return s;\n            }\n        }\n        throw new IllegalArgumentException("Unknown code: " + code);\n    }\n}\n\n';
    }
    if (code) {
      s += '// File: OrderStatusConverter.java\n// An example converter we made. AttributeConverter and @Converter are provided by JPA\nimport jakarta.persistence.AttributeConverter;\nimport jakarta.persistence.Converter;\n\n@Converter\npublic class OrderStatusConverter implements AttributeConverter<OrderStatus, String> {\n' +
        '    @Override\n    public String convertToDatabaseColumn(OrderStatus status) {\n        return status == null ? null : status.getCode();\n    }\n\n' +
        '    @Override\n    public OrderStatus convertToEntityAttribute(String code) {\n        return code == null ? null : OrderStatus.fromCode(code);\n    }\n}\n\n';
    }
    s += '// File: Order.java\n// An example entity we made. @Entity, @Table, @Id, ' + (code ? 'and @Convert' : '@Enumerated, and EnumType') + ' are provided by JPA\nimport jakarta.persistence.*;\n\n@Entity\n@Table(name = "orders")\npublic class Order {\n    @Id\n    private Long id;\n\n' +
      (code ? '    @Convert(converter = OrderStatusConverter.class)\n' : '    @Enumerated(EnumType.' + c.store + ')\n') + '    private OrderStatus status;\n\n' +
      '    protected Order() {\n    }\n\n    public Order(Long id, OrderStatus status) {\n        this.id = id;\n        this.status = status;\n    }\n\n    public OrderStatus getStatus() {\n        return status;\n    }\n}\n\n';
    s += '// File: OrderReader.java\n// An example class we made that reads the order after deploying again. EntityManager is provided by JPA\nimport jakarta.persistence.EntityManager;\n\npublic class OrderReader {\n' +
      '    // Read the order that was saved with em.persist(new Order(1L, OrderStatus.' + c.saved + ')) under the old declaration\n    static void print(EntityManager em) {\n        Order order = em.find(Order.class, 1L);\n' +
      '        System.out.println(order.getStatus());\n        System.out.println(order.getStatus() == OrderStatus.' + f.now + ');\n    }\n}\n';
    return s;
  },
  label: function (c) { return { ORDINAL: 'ORDINAL', STRING: 'STRING', code: 'AttributeConverter' }[c.store] + ' · ' + { same: 'declaration unchanged', append: 'added at the end', insert: 'inserted in the middle', swap: 'order swapped', rename: 'renamed' }[c.change] + ' · ' + c.saved; },
  columns: ['status value in the DB', 'Constant read back', '== the saved constant', 'How it ended'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], store = c.store, ch = c.change;
    var st = { built: false, savedOn: false, changed: false, read: '', failed: false, out: [], err: '', eq: '?', end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    // The Korean text needs a particle after the DB value, chosen by its last sound. English does not need it, so bat is not used
    var bat = store === 'ORDINAL' && f.value !== '2';
    var order = function (cs) { return cs.map(function (r, i) { return r[0] + '(' + i + ')'; }).join(', '); };

    st.built = true;
    var DDLWHY = {
      ORDINAL: 'EnumType.ORDINAL saves the position of the constant in the declaration, so the column is a number column. The condition (check) that accepts only 0 to 2 was added by Hibernate for H2.',
      STRING: 'EnumType.STRING saves the name of the constant, so the column accepts text. For H2, Hibernate made it an enum-type column that accepts only the three names.',
      code: 'Because a converter is specified with @Convert, Hibernate treats what is saved as the String that the converter returns, not the enum, and creates a text column. The condition (check) that accepts only the code values of the three constants (O, P, S) was also added by Hibernate for H2.',
    }[store];
    push('First deployment: the enum declaration lists ORDERED, PAID, SHIPPED in that order. Hibernate looked at the Order entity and created the orders table, and the status column is "' + this.DDL[store] + '". ' + DDLWHY);

    st.savedOn = true;
    var HOW = {
      ORDINAL: 'This is the value of ' + c.saved + '.ordinal() that Hibernate wrote. ordinal() is a method that every enum inherits from java.lang.Enum, and it returns the position of the constant in the declaration, counted from 0.',
      STRING: 'This is the value of ' + c.saved + '.name() that Hibernate wrote. name() is a method that every enum inherits from java.lang.Enum, and it returns the name of the constant, as written in the declaration, as a string.',
      code: 'This is the value that Hibernate received by calling convertToDatabaseColumn(' + c.saved + ') of the converter. This converter returns the value of the code field that was defined in the enum.',
    }[store];
    push('em.persist(new Order(1L, OrderStatus.' + c.saved + ')) and commit: an INSERT is sent, and ' + f.shown + ' is saved in the status column. ' + HOW);

    st.changed = true;
    var CH = { append: 'The new constant CANCELED was added at the very end', insert: 'The new constant CANCELED was inserted between ORDERED and PAID', swap: 'The first two constants, ORDERED and PAID, were swapped', rename: 'PAID was renamed to PAYMENT_DONE' }[ch];
    if (ch === 'same') push('After that, the enum declaration was not changed and the application was deployed again: the ordinals are still ' + order(f.cs) + '.');
    else push('After that, the enum declaration was changed and the application was deployed again: ' + CH + '. The ordinals are now ' + order(f.cs) + '. The table was not created again, so ' + f.shown + ' in the status column stays as it was.', ch === 'append' || ch === 'rename' ? '' : 'hot');

    var shifted = (ch === 'insert' || ch === 'swap'), find = 'em.find(Order.class, 1L) runs: the row is read with SELECT, and ' + f.shown + ' in the status column is turned into a constant. ';
    if (store === 'ORDINAL') {
      st.read = f.read[0];
      push(find + 'Because it is ORDINAL, Hibernate picks the constant at index ' + f.value + ' in the current declaration. This is the same result as OrderStatus.values()[' + f.value + '] (values() is a method that is created automatically for every enum, and it returns an array of the constants in the order of the current declaration). The element at index ' + f.value + ' is ' + f.read[0] + '. ' + (f.eq ? (shifted ? 'It is the same as the saved constant. This is because the number of this constant did not change in this edit.' : 'It is the same as the saved constant.') : 'The saved one was ' + c.saved + ', but a different constant came out. There is no exception and no warning.'), f.eq ? 'good' : 'bad');
    } else if (store === 'STRING') {
      if (f.read) { st.read = f.read[0]; push(find + 'Because it is STRING, Hibernate looks for the constant whose name is exactly "' + f.value + '". This is the same result as OrderStatus.valueOf("' + f.value + '") (valueOf is also a method that is created automatically for every enum). It looks up the constant by name, not by number, so a change in the order or the number of constants has no effect.', 'good'); }
      else {
        st.failed = true; st.err = this.RENAME_ERR; st.end = 'Stopped by an exception';
        push(find + 'Because it is STRING, it looks for the constant whose name is exactly "' + f.value + '", but the current declaration has no such name. em.find cannot return the order and throws ' + this.RENAME_ERR + '. This is the same exception as when OrderStatus.valueOf("' + f.value + '") receives a name that does not exist. If nothing catches it, that request fails here.', 'bad');
      }
    } else {
      st.read = f.read[0];
      push(find + 'Hibernate calls convertToEntityAttribute("' + f.value + '") of the converter, and the converter uses fromCode to find the constant whose code is "' + f.value + '". The constant it finds is ' + f.read[0] + '. Changing the order or the names has no effect as long as the code values stay as they are.', 'good');
    }
    if (f.read) {
      st.out.push(f.read[0]);
      push('System.out.println(order.getStatus()) runs: the output is "' + f.read[0] + '". The toString() of an enum returns the same name as name() unless you override it.');
      st.eq = String(f.eq); st.out.push(String(f.eq)); st.end = 'Ended normally';
      push('order.getStatus() == OrderStatus.' + f.now + ' runs: the result is ' + f.eq + '. There is only one object for each enum constant, so whether it was read by Hibernate or written in the code, the same constant is the same object. That is why you can compare with == without equals.' + (f.eq ? '' : ' The result is false not because of how the comparison is done, but because the constant that was read really is a different constant (' + f.read[0] + ').'), f.eq ? 'good' : 'bad');
    }
    var endText = f.read ? 'Ended normally' : 'Stopped by an exception: ' + this.RENAME_ERR;
    var row = [f.shown, f.read ? f.read[0] : '(not read)', f.read ? String(f.eq) : '(not read)', endText];
    if (store === 'ORDINAL' && !f.eq) sum.push('EnumType.ORDINAL only saves the position in the declaration, so when a constant is inserted in the middle or the order is changed, a number that was already saved refers to a different constant. No exception is thrown, so wrong data is used silently: an order that is "' + f.old[2] + '" is shown as an order that is "' + f.read[2] + '". The default when you do not write @Enumerated is also ORDINAL, so write @Enumerated(EnumType.STRING) on enum fields.');
    if (store === 'ORDINAL' && f.eq && shifted) sum.push('This constant was safe because its number did not change. With the same change, orders saved as a different constant go wrong.');
    if (store === 'ORDINAL' && ch === 'append') sum.push('Adding a constant at the very end does not change the numbers of the existing constants. But everyone who edits the enum has to keep the promise "always add only at the end" from then on, so avoid saving with ORDINAL in the first place.');
    if (store === 'ORDINAL' && ch === 'rename') sum.push('Renaming a constant does not affect the numbers. Data saved with ORDINAL goes wrong when the order is touched.');
    if (store === 'ORDINAL' && ch === 'same') sum.push('As long as the declaration is not changed, saving with ORDINAL does not reveal any problem.');
    if (store === 'STRING' && f.read) sum.push('When you save with EnumType.STRING, the same constant is read back even if constants are added or the order is changed.' + (ch === 'rename' ? ' This time only PAID was renamed, so ' + c.saved + ' was not affected.' : ' In return, if you rename a constant, rows that were already saved cannot be read.'));
    if (store === 'STRING' && !f.read) sum.push('If you saved with STRING, renaming a constant amounts to making the saved rows unreadable. If you must rename it, include in the deployment an UPDATE statement that also fixes the value in the database. Even so, an exception that shows the problem right away is better than ORDINAL, which silently gives a different constant.');
    if (store === 'code') sum.push('AttributeConverter is an interface provided by JPA, and it has you fill in two methods that convert between a field value and a database value. If you define the value to save separately as the code field of the enum, you can change both the order and the names of the constants. In return, a code value must not be changed once it is set. The code field and the fromCode method are examples made for this lab, and this approach is possible because an enum can have fields and methods.');
    if (f.read) sum.push('Use == to compare enum constants. There is only one object for each constant, so the result is the same as with equals, and no exception is thrown even when one side is null.');
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, f = this.facts(c), code = c.store === 'code';
    if (!s) { H.text(v, 'Click Run to go one step at a time, from the first deployment and saving to deploying again and reading.'); return; }
    var cs = s.changed ? f.cs : this.OLD;
    H.table(v, ['ordinal()', 'name()'].concat(code ? ['code'] : []), cs.map(function (r, i) {
      var hit = s.read === r[0] && s.changed;
      return { cells: [String(i), { v: r[0], cls: hit ? (f.eq ? 'good' : 'bad') : '' }].concat(code ? [r[1]] : []) };
    }), s.changed ? 'The current enum declaration' : 'The old enum declaration');
    H.table(v, ['id', 'status'], s.savedOn ? [{ cells: ['1', f.shown] }] : [], 'orders table (' + this.DDL[c.store] + ')');
    var ln = H.lanes(v);
    H.lane(ln, 'What Hibernate does when reading', { ORDINAL: 'Same result as OrderStatus.values()[' + f.value + ']', STRING: 'Same result as OrderStatus.valueOf("' + f.value + '")', code: 'converter.convertToEntityAttribute("' + f.value + '")' }[c.store], 'none');
    H.title(v, 'Console output');
    var lines = s.out.slice(); if (s.err) lines.push(s.err + '  (exception thrown by em.find)');
    v.appendChild(H.el('pre', 'code', lines.length ? lines.join('\n') : '(nothing yet)'));
    H.counters(v, [[s.end, 'Read']]);
  },
  // Diagram: the constants of the old declaration in order at the top, the constants of the current declaration in order at the bottom, and the status value in the DB in the middle. One arrow goes from the saved constant to the value, and another from the value to the constant that is read back.
  draw: function (P, sim, shown) {
    var c = sim.c, f = this.facts(c), last = shown[shown.length - 1], s = last ? last.snap : { built: false, savedOn: false, changed: false, read: '', failed: false, out: [], err: '', eq: '?', end: '?' };
    var attr = function (r, i) { return c.store === 'ORDINAL' ? 'ordinal ' + i : c.store === 'STRING' ? 'name ' + r[0] : 'code ' + r[1]; };
    P.size(680, 334);
    P.region('old', 16, 16, 648, 98, 'Old declaration (when saving)');
    this.OLD.forEach(function (r, i) { P.box('o_' + r[0], 30 + i * 156, 46, 152, 56, { cls: s.savedOn && r[0] === c.saved ? 'hot' : 'plain', title: r[0], sub: [attr(r, i), r[2]] }); });
    P.box('saved', 194, 126, 292, 34, { cls: s.savedOn ? (s.failed ? 'bad' : 'hot') : 'ghost', title: 'orders.status column', right: s.savedOn ? f.shown : 'none yet' });
    P.region('new', 16, 172, 648, 98, s.changed ? 'Current declaration (when reading after deploying again)' : 'Current declaration (not changed yet)');
    f.cs.forEach(function (r, i) {
      var hit = s.read === r[0];
      P.box('n_' + r[0], 30 + i * 156, 202, 152, 56, { cls: !s.changed ? 'ghost' : hit ? (f.eq ? 'good now' : 'bad now') : r[0] === 'CANCELED' || r[0] === 'PAYMENT_DONE' ? 'wait' : 'plain', title: r[0], sub: [attr(r, i), r[2]] });
    });
    if (s.savedOn) P.arrow('a_save', 'o_' + c.saved + ':b', 'saved:t', { cls: 'hot', label: 'persist' });
    if (s.read) P.arrow('a_read', 'saved:b', 'n_' + s.read + ':t', { cls: f.eq ? 'good' : 'bad', label: 'find' });
    P.box('r1', 16, 284, 320, 34, { cls: s.failed ? 'bad' : s.read ? (f.eq ? 'good' : 'bad') : 'ghost', title: 'Constant read back', right: s.failed ? 'exception thrown' : s.read || '?' });
    P.box('r2', 344, 284, 320, 34, { cls: s.eq === 'true' ? 'good' : s.eq === 'false' ? 'bad' : s.failed ? 'bad' : 'ghost', title: '== the saved constant', right: s.failed ? 'not compared' : s.eq });
    P.note('Each box is one enum constant (one object). ORDINAL follows the same position straight down from the top row to the bottom row, while STRING and AttributeConverter look up by name or by code, so they follow the constant to whatever position it has moved to.');
  },
  assume: 'All 45 combinations were checked against real execution with Hibernate 7.4.5 and the H2 database (2.4.240). For each combination, the code on the screen was compiled as it is, the table was created with the Order of the old declaration (ORDERED, PAID, SHIPPED), one order was persisted, and then, leaving the table as it was, OrderReader.print from the screen was run with the classes of the current declaration. What was compared is the definition of the status column that Hibernate created, the value saved in the database (read directly with JDBC), the two lines of console output, and the kind and message of the exception. The package name that is attached to the exception message is not in the code on the screen, so it was left out. For every combination we also checked that the constant Hibernate read is the same as the result of calling values()[number] or valueOf(name) directly. The following facts were also checked by running them in the same way: an enum field without @Enumerated becomes exactly the same column as ORDINAL and a number is saved; if you save with ORDINAL and then delete that constant so that the number is out of range, em.find throws an ArrayIndexOutOfBoundsException; if the converter receives a code it does not know, a PersistenceException (caused by the IllegalArgumentException that fromCode threw) occurs; and the same constant is the same object however it is obtained. The column definition differs depending on the kind of database (dialect) and the Hibernate version, and the tinyint, the check conditions, and the enum-type column written here are what Hibernate 7.4.5 made for H2. Because of these conditions, if you keep using the table that Hibernate created, then after CANCELED is inserted, saving SHIPPED (now number 3) with ORDINAL, or saving CANCELED with STRING, also fails (this was also checked by running it). This lab covers only reading rows that were already saved. In real services, the table is often created separately with a tool such as Flyway, so these conditions may not exist, but it is the same that the saved value stays as it is when you deploy again. It was run with Hibernate alone, without Spring Boot, and even if you use Spring Data JPA, the same Hibernate does the saving and reading.',
});
