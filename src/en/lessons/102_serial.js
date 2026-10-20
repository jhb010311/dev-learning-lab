Lab.register({
  id: 'serial', nav: 'Serialization', cat: 'Java language', mode: 'step',
  title: 'What comes back when you restore a saved object?',
  why: 'To save an object to a file or send it to another JVM, you would have to write, for every class, code that writes the fields one by one in a fixed order and reads them back to assemble the object. With Java\'s default serialization, you only mark the class as Serializable. ObjectOutputStream then follows the field values and the objects they refer to and converts them into bytes, and ObjectInputStream creates the object again from those bytes.',
  use: 'Requests and responses of web APIs are usually exchanged as JSON created with Jackson, and you meet Java\'s default serialization where Serializable is required. When Tomcat is configured to keep sessions and saves them to a file as it shuts down, or when Spring Session stores sessions in Redis with its default settings, the session attribute objects must be Serializable. You add transient to fields that must not be saved.',
  intro: 'The default serialization mechanism in Java converts an object to bytes and writes them to a file (writeObject), and then creates the object again from those bytes (readObject). But not everything in an object is saved, and not every object can be saved. Set point to 50, save the object, change point to 70, and then restore the object to see what is saved and what is not.',
  terms: ['Serialization and deserialization', 'Serializable', 'transient', 'serialVersionUID', 'static'],
  controls: [
    { id: 'cls', label: 'The User class', type: 'select', value: 'ok', options: [['ok', 'Implements Serializable'], ['no', 'Does not implement Serializable'], ['field', 'Implements Serializable, but Address, which it has as a field, does not']] },
    { id: 'fld', label: 'Declaration of the point field', type: 'select', value: 'transient', options: [['plain', 'int point (an ordinary field)'], ['transient', 'transient int point'], ['static', 'static int point']] },
    { id: 'chg', label: 'Change made to the User class after saving', type: 'select', value: 'same', options: [['same', 'No change'], ['uid', 'serialVersionUID changed from 1L to 2L'], ['auto', 'One field added to a class that does not declare serialVersionUID']], show: function (c) { return c.cls === 'ok'; }, hint: 'This is the case where the class is modified and recompiled, and then a file that was saved earlier is read.' },
  ],
  // For a class that already fails at saving, a change after saving has no meaning
  fix: function (c) { return c.cls !== 'ok' && c.chg !== 'same' ? { chg: 'same' } : null; },
  presets: [
    { t: 'Default settings', q: 'What is the value of point after restoring a Serializable User whose transient int point was set to 50 when saved?', d: 'A transient field. 50 was saved, but the restored value is 0.', v: { cls: 'ok', fld: 'transient', chg: 'same' } },
    { t: 'An ordinary field', q: 'What if you change the point field to an ordinary field, int point?', d: 'The value at the time of saving, 50, comes back as it was.', v: { cls: 'ok', fld: 'plain', chg: 'same' } },
    { t: 'A static field', q: 'What if you change the point field to static int point and set it to 70 after saving?', d: 'What you see is not a saved value but 70, the value the class has now.', v: { cls: 'ok', fld: 'static', chg: 'same' } },
    { t: 'Without implementing Serializable', q: 'What if the User class does not implement Serializable and point is an ordinary field?', d: 'A NotSerializableException is thrown when the object is saved.', v: { cls: 'no', fld: 'plain', chg: 'same' } },
    { t: 'When an object held in a field is the problem', q: 'What if User implements Serializable but Address, which it has as a field, does not?', d: 'Saving fails because of Address, not User.', v: { cls: 'field', fld: 'plain', chg: 'same' } },
    { t: 'Changing serialVersionUID after saving', q: 'What if point is an ordinary field and you change serialVersionUID from 1L to 2L after saving?', d: 'An InvalidClassException is thrown when the object is restored.', v: { cls: 'ok', fld: 'plain', chg: 'uid' } },
    { t: 'Adding a field without a serialVersionUID', q: 'What if point is an ordinary field and you add one field after saving to a class that does not declare serialVersionUID?', d: 'The automatically computed value changes, so again the object cannot be restored.', v: { cls: 'ok', fld: 'plain', chg: 'auto' } },
  ],
  code: function (c) {
    var ser = c.cls !== 'no', P = c.fld === 'static' ? 'User.point' : 'u.point', pad = function (x) { while (x.length < 50) x += ' '; return x; };
    var decl = { plain: pad('    int point;'), transient: pad('    transient int point;') + '// transient: not saved', static: pad('    static int point;') + '// static: belongs to the class, not to an object' }[c.fld];
    var s = c.cls === 'field' ? pad('class Address {') + '// does not implement Serializable\n    String city = "Seoul";\n}\n\n' : '';
    s += 'class User' + (ser ? ' implements Serializable' : '') + ' {\n' + (ser && c.chg !== 'auto' ? '    private static final long serialVersionUID = 1L;\n' : '') + '    String name;\n' + decl.replace(/\s+$/, '') + '\n' + (c.cls === 'field' ? '    Address address = new Address();\n' : '')
      + '    User(String name) {\n        this.name = name;\n        System.out.println("constructor ran");\n    }\n}\n\n';
    s += '// From here on, the lines inside main (Main class, main declaration, and imports omitted)\nUser u = new User("kim");\n' + P + ' = 50;\ntry (ObjectOutputStream out = new ObjectOutputStream(new FileOutputStream("user.ser"))) {\n' + pad('    out.writeObject(u);') + '// convert the object to bytes and write them to the file\n}\n' + pad(P + ' = 70;') + '// change the value after saving\n\n';
    if (c.chg === 'uid') s += '// ── Here the User class is modified and recompiled ──\n//     private static final long serialVersionUID = 2L;\n// Then the code below reads the file that was saved earlier\n\n';
    if (c.chg === 'auto') s += '// ── Here the User class is modified and recompiled ──\n//     String email;          (one field added)\n// Then the code below reads the file that was saved earlier\n\n';
    s += 'try (ObjectInputStream in = new ObjectInputStream(new FileInputStream("user.ser"))) {\n' + pad('    User r = (User) in.readObject();') + '// restore the object from the bytes in the file\n    System.out.println(r.name + " " + ' + (c.fld === 'static' ? 'User.point' : 'r.point') + ');\n}';
    return s;
  },
  label: function (c) { return { ok: 'Serializable', no: 'not Serializable', field: 'field Address not Serializable' }[c.cls] + ' · ' + { plain: 'int point', transient: 'transient point', static: 'static point' }[c.fld] + { same: '', uid: ' · UID 1 → 2', auto: ' · field added with no UID' }[c.chg]; },
  columns: ['Save (writeObject)', 'Restore (readObject)', 'point read after restoring', 'Constructor runs'],
  simulate: function (c) {
    var F = c.fld, ev = [], sum = [], P = F === 'static' ? 'User.point' : 'u.point', auto = c.chg === 'auto', uidText = auto ? 'computed automatically' : '1';
    var st = { ctor: 0, u: null, sp: null, file: null, ver: c.cls === 'no' ? '' : uidText, r: null, save: '?', load: '?', val: '?', ex: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    st.ctor = 1; st.u = { name: 'kim', point: F === 'static' ? null : 0, addr: c.cls === 'field' }; if (F === 'static') st.sp = 0;
    push('new User("kim"): This creates a User object. The constructor runs, and "constructor ran" is printed once.' + (c.cls === 'field' ? ' Through its address field, this object refers to one Address object.' : ''));
    if (F === 'static') st.sp = 50; else st.u.point = 50;
    push(P + ' = 50: ' + (F === 'static' ? 'point is a static field, so it is not inside the object u. There is only one, in the User class. Its value becomes 50.' : 'This puts 50 into the point field of the object u.'));
    if (c.cls === 'no') {
      st.save = 'NotSerializableException (User)'; st.file = 'fail'; st.ex = 'NotSerializableException: User'; st.load = 'Not attempted'; st.val = 'None';
      push('out.writeObject(u): The User class does not implement Serializable. The object is not marked as one that may be saved, so a NotSerializableException: User is thrown and the program stops here. The code below it does not run.', 'bad');
    } else if (c.cls === 'field') {
      st.save = 'NotSerializableException (Address)'; st.file = 'fail'; st.ex = 'NotSerializableException: Address'; st.load = 'Not attempted'; st.val = 'None';
      push('out.writeObject(u): User is Serializable, but writeObject also follows the fields of the object to the objects they refer to and saves those objects with it. The Address that address refers to does not implement Serializable, so a NotSerializableException: Address is thrown and the program stops here.', 'bad');
    } else {
      st.save = 'Succeeded'; st.file = { uid: uidText, point: F === 'plain' ? 50 : null };
      push('out.writeObject(u): This converts the field values of the object u to bytes and writes them to the file. ' + (F === 'plain' ? 'name = "kim" and point = 50 are saved.' : F === 'transient' ? 'Only name = "kim" is saved. point is declared transient, so it is skipped.' : 'Only name = "kim" is saved. point is static, so it is a value that belongs to the class, not to the object, and it is not something that is saved.') + ' So that the class of the object can be identified, the class name User and the serialVersionUID (' + (auto ? 'a value computed automatically from the shape of the class, because none is declared' : '1') + ') are recorded as well.', F === 'plain' ? 'good' : '');
      if (F === 'static') st.sp = 70; else st.u.point = 70;
      push(P + ' = 70: After saving, the value in memory is changed to 70. The contents of the file that was already written do not change.');
      if (c.chg === 'uid') { st.ver = '2'; push('The User class is modified and recompiled: serialVersionUID is changed from 1L to 2L. The file still has 1 recorded in it.'); }
      if (auto) { st.ver = 'computed (now changed)'; push('The User class is modified and recompiled: The field String email is added. No serialVersionUID is declared, so Java computes the value from the shape of the class (its name, fields, methods, and so on), and with one more field that value is now different.'); }
      if (c.chg === 'same') {
        st.load = 'Succeeded'; st.r = { name: 'kim', point: F === 'plain' ? 50 : F === 'transient' ? 0 : null };
        push('in.readObject(): This checks whether the class name and the serialVersionUID recorded in the file are the same as those of the current User class. They are the same, so it creates a new User object and fills in the saved field values. The constructor of User does not run at this point. "constructor ran" is not printed again.', 'good');
        st.val = F === 'plain' ? '50 (the value when saved)' : F === 'transient' ? '0 (default value)' : '70 (the value set after saving)';
        if (F === 'plain') push('r.point: It is 50. The value saved in the file has come back. What was changed to 70 after saving is the original object u, and the restored r is a new object, different from u.', 'good');
        if (F === 'transient') push('r.point: It is 0. The transient field was not saved in the file, so there is no value to fill in. It gets the default value of its type (0 for int, null for a reference type).', 'bad');
        if (F === 'static') push('User.point: It is 70. The static field was not saved in the file, and restoring does not touch this value either. You simply see 70, the value that the User class has in this program right now.', 'bad');
      } else {
        st.load = 'InvalidClassException'; st.val = 'None'; st.ex = 'InvalidClassException';
        push('in.readObject(): This compares the serialVersionUID recorded in the file with the serialVersionUID of the current User class. ' + (auto ? 'The value computed at the time of saving and the value computed from the current class, which has the added field, are different.' : 'The file has 1, and the current class has 2.') + ' It treats the two as versions of the class that do not match and throws an InvalidClassException. The object is not restored.', 'bad');
      }
    }
    if (c.cls === 'no') sum.push('The default serialization mechanism in Java saves only objects of classes that implement Serializable. Serializable has no methods to implement and serves only as a mark that says "objects of this class may be saved".');
    if (c.cls === 'field') sum.push('When an object is saved, the objects that its fields refer to are saved with it. If even one of them is not Serializable, the whole save fails. Either make Address Serializable as well or, if the field does not need to be saved, mark it transient.');
    if (st.load === 'Succeeded') {
      if (F === 'plain') sum.push('An ordinary instance variable comes back with the value it had when it was saved. The restored object is a different object that has the same contents as the original.');
      if (F === 'transient') sum.push('A field marked transient is not saved, and in the restored object it has the default value. Use it for values that must not be left in a file, such as a password, and for values that can simply be computed again.');
      if (F === 'static') sum.push('A static field is not part of an object but belongs to the class, so it is not saved. You see 70 now only because the value is read inside the same program. If you start the program anew and read the file there, you see the value that the static field has in that program (0 if nothing was assigned to it).');
      sum.push('When an object is restored, the constructor of the Serializable class does not run. This means that the value checks and the setup work done in the constructor are skipped, so restoring data that comes from a source you cannot trust is dangerous.');
    }
    if (c.chg === 'uid' && st.save === 'Succeeded') sum.push('serialVersionUID is a number for checking whether the class at the time of saving and the class at the time of reading are matching versions. If the numbers differ, the data is rejected without even a look at its contents.');
    if (auto && st.save === 'Succeeded') sum.push('If you do not declare serialVersionUID, even a small change to the class changes the automatically computed value, and data that was saved earlier can no longer be read. If you declare it yourself, as in private static final long serialVersionUID = 1L;, data saved earlier can still be read after a field is added, and the new field gets its default value.');
    return { events: ev, summary: sum, row: [st.save, st.load, st.val, st.ctor + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'Save', s.save, s.save === 'Succeeded' ? 'good' : s.save === '?' ? 'none' : 'bad');
    H.lane(ln, 'Restore', s.load, s.load === 'Succeeded' ? 'good' : s.load === '?' ? 'none' : s.load === 'Not attempted' ? 'wait' : 'bad');  },
  // Diagram: on the left, the original object (and the static value of the class); in the middle, what is saved in the file; on the right, the restored object. The arrows are saving and restoring.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { ctor: 0, u: null, sp: null, file: null, ver: c.cls === 'no' ? '' : c.chg === 'auto' ? 'computed automatically' : '1', r: null, save: '?', load: '?', val: '?', ex: '' };
    P.size(680, 322);
    P.region('ra', 16, 16, 196, 196, 'Memory: object, statics');
    P.region('rb', 244, 16, 192, 196, 'File user.ser');
    P.region('rc', 468, 16, 196, 196, 'Memory: restored object');
    var usub = s.u ? ['name = "kim"'].concat(s.u.point === null ? [] : ['point = ' + s.u.point], s.u.addr ? ['address → an Address'] : []) : ['not created yet'];
    P.box('u', 24, 52, 180, 84, { cls: s.u ? 'wait' : 'ghost', title: 'u (a User object)', sub: usub });
    if (c.fld === 'static') P.box('sp', 24, 150, 180, 48, { cls: s.sp === null ? 'ghost' : 'hot', title: 'User.point = ' + (s.sp === null ? '?' : s.sp), sub: 'static: one per class' });
    var fsub = !s.file ? ['not written yet'] : s.file === 'fail' ? ['save failed'] : ['class User', 'UID: ' + (s.file.uid === '1' ? '1' : 'computed'), 'name = "kim"', s.file.point === null ? '(point is not here)' : 'point = ' + s.file.point];
    P.box('f', 252, 52, 176, 110, { cls: !s.file ? 'ghost' : s.file === 'fail' ? 'bad' : 'good', title: 'Saved contents', sub: fsub });
    var rsub = s.r ? ['name = "kim"'].concat(s.r.point === null ? [] : ['point = ' + s.r.point]) : [s.load === 'InvalidClassException' ? 'could not be restored' : 'not created yet'];
    P.box('r', 476, 52, 180, 84, { cls: s.r ? 'good' : s.load === 'InvalidClassException' ? 'bad' : 'ghost', title: 'r (restored object)', sub: rsub });
    if (s.save !== '?') P.arrow('aw', 'u:r', 'f:l:0.3', { cls: s.save === 'Succeeded' ? 'good' : 'bad', label: 'save' });
    if (s.load === 'Succeeded' || s.load === 'InvalidClassException') P.arrow('ar', 'f:r:0.3', 'r:l', { cls: s.load === 'Succeeded' ? 'good' : 'bad', label: 'restore' });
    P.box('k1', 16, 226, 320, 36, { cls: 'plain', title: 'Constructor runs', right: s.ctor + '' });
    P.box('k2', 344, 226, 320, 36, { cls: s.ver === '2' || s.ver.indexOf('changed') >= 0 ? 'hot' : 'plain', title: 'UID of User now', right: s.ver ? P.fit(s.ver, 180) : 'none' });
    P.box('k3', 16, 272, 648, 36, { cls: s.ex ? 'bad' : s.val !== '?' ? 'good' : 'ghost', title: s.ex ? 'Exception thrown' : 'point read after restoring', right: s.ex || s.val });
    P.note('The left arrow is writeObject (save), and the right arrow is readObject (restore). What goes into the file is the values of the instance variables of the object, together with the class name and the serialVersionUID (UID in the diagram), which tell which class the object belongs to.');
  },
  assume: 'For each of the 15 combinations, source code identical to the code on the screen was compiled and run on JDK 21 in our test environment, and whether saving and restoring succeeded, the exception that was thrown, the restored value, and the number of times the constructor ran were checked against the model. For the combinations that modify the class after saving, two separate copies of a User class with the same name were compiled, and a file saved with one was read with the other. The following were also confirmed by separate runs: when a field is added to a class that declares serialVersionUID, the file can be read and the new field is null, a transient field of a reference type becomes null, a static field read from a different program is 0, and the object is saved when the Address field is marked transient. The format of the bytes that are actually recorded in the file is simplified in the diagram. That the constructor does not run applies to a class that implements Serializable. The rules for the case where the superclass is not Serializable, how to define writeObject and readObject yourself, and the serialization of records are not covered. Because of security problems, the default serialization mechanism in Java is rarely used in new code, and formats such as JSON are mostly used, but you need to know these rules to understand existing code and libraries.',
});
