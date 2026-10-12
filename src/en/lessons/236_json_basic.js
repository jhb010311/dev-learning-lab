Lab.register({
  id: 'json_basic', nav: 'JSON', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['msgconv'],
  title: 'What does JSON look like, and what mistakes make it unreadable?',
  intro: 'When programs exchange data (for example, when a server sends member information to a browser), they cannot send an object in memory as it is. So they write it out as text by an agreed set of rules, and the receiving side reads that text and builds an object in its own language again. JSON is the most widely used set of rules. What you see in the code box is the JSON text itself. Inside { }, write "name": value pairs joined by commas. Wrap names and string values in double quotes, and write numbers without quotes. [ ] is an array of several values. Whether there are quotes decides the kind of the value, so 30 is a number and "30" is a string. In this lab you change the quotes around the name, the value of age, and the commas one at a time, and feed the same text to two parsers (programs that read text and build an object): JSON.parse in Node.js and Jackson in Java. You see whether the text can be read and what kind of value the age that was read is. JSON has no syntax for comments, so the code box shows the text only, with no explanations.',
  terms: ['JSON', 'JSON values', 'Parsing', 'Serialization and deserialization'],
  controls: [
    { id: 'key', label: 'Quotes around the first name, name', type: 'select', value: 'dq', options: [['dq', 'Wrap the name in double quotes: "name"'], ['none', 'Remove the quotes around the name: name'], ['sq', "Wrap the name in single quotes: 'name'"]] },
    { id: 'age', label: 'Value of age', type: 'select', value: 'num', options: [['num', 'Write the value of age as a number: 30'], ['str', 'Put double quotes around the value of age: "30"']] },
    { id: 'comma', label: 'Commas', type: 'select', value: 'ok', options: [['ok', 'Commas only between values'], ['trail', 'Add a comma after the last value too'], ['miss', 'Leave out the comma at the end of the "age" line']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does JSON look like, and how does the receiving side read it?', d: 'JSON text that follows the rules. The parser reads it and creates an object whose age is a number.', v: { key: 'dq', age: 'num', comma: 'ok' } },
    { t: 'Putting double quotes around 30', q: 'What if you put double quotes around 30, as "30"?', d: 'It is read, but age becomes a string, so adding 1 gives 301.', v: { key: 'dq', age: 'str', comma: 'ok' } },
    { t: 'Removing the double quotes around the name', q: 'What if you remove the double quotes around the name?', d: 'The name has no quotes, so the whole text cannot be read.', v: { key: 'none', age: 'num', comma: 'ok' } },
    { t: 'Using single quotes', q: 'What if you use single quotes instead of double quotes?', d: 'A single quote is not a JSON quote, so the whole text cannot be read.', v: { key: 'sq', age: 'num', comma: 'ok' } },
    { t: 'Adding a comma after the last value', q: 'What if you add one more comma after the last value?', d: 'A name must follow the comma, but the end (}) comes, so the whole text cannot be read.', v: { key: 'dq', age: 'num', comma: 'trail' } },
    { t: 'Leaving out a comma', q: 'What if you leave out the comma between values?', d: 'There is no comma between the values, so the whole text cannot be read.', v: { key: 'dq', age: 'num', comma: 'miss' } },
  ],
  NAMES: { dq: '"name"', none: 'name', sq: "'name'" },
  // The JSON text shown on the screen (it must be the same text the Probe fed to the two parsers)
  lines: function (c) {
    return [
      '{',
      '  ' + this.NAMES[c.key] + ': "Alice",',
      '  "age": ' + (c.age === 'num' ? '30' : '"30"') + (c.comma === 'miss' ? '' : ','),
      '  "tags": ["vip", "new"]' + (c.comma === 'trail' ? ',' : ''),
      '}',
    ];
  },
  code: function (c) { return this.lines(c).join('\n'); },
  label: function (c) { return 'Name ' + this.NAMES[c.key] + ' · age ' + (c.age === 'num' ? '30' : '"30"') + ' · ' + { ok: 'commas correct', trail: 'comma after last value', miss: 'no comma on "age" line' }[c.comma]; },
  // The first rule violation the parser meets in this setting (null if none): line, column, and the character at that spot (the same items the Probe measured in the two parsers)
  facts: function (c) {
    var fail = null;
    if (c.key !== 'dq') fail = { kind: c.key, line: 2, col: 3, ch: c.key === 'none' ? 'n' : "'" };
    else if (c.comma === 'miss') fail = { kind: 'miss', line: 4, col: 3, ch: '"' };
    else if (c.comma === 'trail') fail = { kind: 'trail', line: 5, col: 1, ch: '}' };
    return { text: this.code(c), fail: fail, ageKind: c.age === 'num' ? 'number' : 'string', plus: c.age === 'num' ? '31' : '301' };
  },
  WHY: { none: 'The name has no double quotes', sq: 'The name is wrapped in single quotes, not double quotes', trail: 'A name must follow the last comma, but } comes', miss: 'The next name comes right where a comma is required' },
  columns: ['Parse result', 'Kind of age that was read', 'age + 1 on the object that was read (JavaScript)'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], fail = f.fail, num = c.age === 'num', agev = num ? '30' : '"30"';
    var st = { ln: ['plain', 'plain', 'plain', 'plain', 'plain'], o: { name: '', age: '', tags: '' }, arr: [], dead: false, done: false, rows: [], read: '', kind: '', plus: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // Step 1: the sender writes it as text
    var diff = [];
    if (c.key === 'none') diff.push('the double quotes around the name are removed');
    if (c.key === 'sq') diff.push('the name is wrapped in single quotes');
    if (!num) diff.push('double quotes are put around the age value 30');
    if (c.comma === 'trail') diff.push('a comma is added after the last value');
    if (c.comma === 'miss') diff.push('the comma at the end of the "age" line is removed');
    push('The server wants to send member information to the browser. The object in the server\'s memory (the one with a name, an age, and tags) cannot be sent as it is. So it is written out as text by an agreed set of rules, and those rules are JSON. The sender wrote the object as the text below.' + (diff.length ? ' What differs from the default text in this lab is: ' + diff.join(', ') + '.' : '') + ' The parser on the receiving side reads this text and turns it back into an object. This lab fed the same text to two parsers, JSON.parse in Node.js and Jackson in Java, and in every combination both parsers made the same decision.', '');
    // Step 2: {
    st.ln[0] = 'hot'; st.rows.push(['{', 'An object (names and values) starts']);
    push('The parser on the receiving side reads the text from the start, one character after another. The first character is {. A { means "an object of names and values starts here," so the parser now expects "name": value pairs joined by commas and ending with }.', '');

    // Steps that report a failure: the parser throws away everything it read and stops
    function stop(partial) {
      var where = 'line ' + fail.line + ', column ' + fail.col;
      st.dead = true; st.o = { name: '', age: '', tags: '' }; st.arr = []; st.read = 'Failed: ' + WHYS[fail.kind]; st.kind = 'Could not read'; st.plus = 'Could not read'; st.done = true;
      var more = (c.key !== 'dq' && c.comma !== 'ok') ? ' The text also breaks the rules further on (' + (c.comma === 'miss' ? 'the "age" line has no comma at its end' : 'the comma after the last value') + '), but the parser stops at the first problem it meets, so this is the only error it reports.' : '';
      push('The parser stops reading here and reports an error. The error is at ' + where + ', and JSON.parse and Jackson reported the same position.' + (partial ? ' It does not return what it read before this (' + partial + ') as an object either.' : '') + ' It never returns just the part it could read: either the whole text is read or the whole read fails.' + more, 'bad');
      push('The receiving side did not get an object. With no object, it cannot take out age, so there is no kind of age and no result for adding 1.', 'bad');
    }
    var WHYS = this.WHY;
    function summaryFail(a, b) { sum.push(a); sum.push(b); }
    var firstFail = function () {
      var m = { none: 'Removing the double quotes around the name breaks the rules, so the parser stops at name on line 2 and reports an error. The text could not be read, so no object was created.', sq: 'Using single quotes instead of double quotes breaks the rules, so the parser stops at \'name\' on line 2 and reports an error. The text could not be read, so no object was created.' };
      return m[c.key];
    };

    // Step 3: the first name and value
    st.ln[0] = 'good'; st.ln[1] = 'hot';
    if (c.key !== 'dq') {
      st.ln[1] = 'bad'; st.rows.push([c.key === 'none' ? 'name' : "'name'", 'This is where a name belongs, but the character is not a double quote']);
      push(c.key === 'none' ? 'Next comes name. This is where a name belongs, but the character is n, not a double quote. In JSON a name must be wrapped in double quotes, so the parser cannot read this as the start of a name.' : "Next comes 'name'. This is where a name belongs, but the character is a single quote ('), not a double quote. In JSON, the only quote that wraps a string is the double quote, so the parser cannot read a single quote as the start of a name.", 'bad');
      stop('');
      summaryFail(firstFail(), c.key === 'none' ? 'In JSON a name must always be wrapped in double quotes. It is not like a variable name in a programming language, which can be written without quotes. Even if the other lines are right, nothing was read.' : 'A single quote is not a JSON quote. In JSON text, both names and string values must be written in double quotes.');
      return { events: ev, summary: sum, f: f, row: ['Failed: ' + this.WHY[fail.kind], 'Could not read', 'Could not read'] };
    }
    st.rows.push(['"name":', 'Name in double quotes: name. The value comes after the :']);
    push('Next comes "name". Inside the object, a string wrapped in double quotes is a name. The : after it marks "what follows is the value of this name."', '');
    st.o.name = 'string "Alice"'; st.arr.push('name'); st.rows.push(['"Alice",', 'In double quotes, so a string value. A comma means the next pair follows']);
    push('The "Alice" after the : is wrapped in double quotes, so it is a string value. A comma follows, so another "name": value pair comes next.', '');

    // Step 4: age
    st.ln[1] = 'good'; st.ln[2] = 'hot';
    st.o.age = num ? 'number 30' : 'string "30"'; st.arr.push('age');
    st.rows.push(['"age": ' + agev, num ? 'No quotes, so a number' : 'In double quotes, so a string (even if what is inside looks like a number)']);
    push('This is the line after the comma. "age" is a name wrapped in double quotes, and the value after the : is ' + agev + '. ' + (num ? 'It has no double quotes and looks like a number, so it is a number value.' : 'It is wrapped in double quotes, so it is a string value even though what is inside looks like a number.') + (c.comma === 'miss' ? ' But no comma comes after this value.' : ' A comma follows, so the next pair comes next.'), '');
    if (c.comma === 'miss') {
      st.ln[2] = 'good'; st.ln[3] = 'bad'; st.rows.push(['"tags"', 'A name comes right away with no comma']);
      push('After the value of age there must be a comma before the next "name": value pair can follow. But the "tags" on the next line comes right away, with no comma. A line break is not a separator (line breaks and spaces are skipped without meaning), so the parser cannot find the comma that must come between values and treats this spot as a rule violation.', 'bad');
      stop('name and the value of age');
      summaryFail('Leaving out the comma between values breaks the rules, so the parser stops at the "tags" after the "age" line and reports an error. Even though name and age are written correctly, nothing was read, and the whole text fails to read.', 'A comma means "the next pair follows." A line break alone is not read as the start of the next name.');
      return { events: ev, summary: sum, f: f, row: ['Failed: ' + this.WHY.miss, 'Could not read', 'Could not read'] };
    }

    // Step 5: tags
    st.ln[2] = 'good'; st.ln[3] = 'hot';
    st.o.tags = 'array of 2'; st.arr.push('tags'); st.rows.push(['"tags": ["vip", "new"]', '[ ] is an array of values. Two strings']);
    push('This is the line after the comma. "tags" is a name wrapped in double quotes, and its value starts with [. [ ] is an array of several values. The "vip" and "new" inside are both wrapped in double quotes, so they are two strings, separated by the comma between them. The array ends at ].' + (c.comma === 'trail' ? ' But there is one more comma after the ].' : ''), '');
    if (c.comma === 'trail') {
      st.ln[3] = 'good'; st.ln[4] = 'bad'; st.rows.push(['}', 'A name must follow the comma, but the end comes']);
      push('After a comma, the parser expects a new "name": value pair. But what comes next is }. The } that marks the end appears where a name belongs, which breaks the rules. In JSON grammar, a comma goes only between values, and a name and a value must always follow a comma.', 'bad');
      stop('name, age, tags');
      summaryFail('Adding a comma after the last value breaks the rules: a name must follow the comma, but } comes. The parser stops at the } on the last line and reports an error. Even though everything before it is correct, the whole text fails to read.', 'In JSON, a comma goes only between values. If you add one at the very end, the whole text is not read; the parser does not read as far as it can.');
      return { events: ev, summary: sum, f: f, row: ['Failed: ' + this.WHY.trail, 'Could not read', 'Could not read'] };
    }

    // Step 6: it ends with } and the object is created
    st.ln[3] = 'good'; st.ln[4] = 'hot'; st.rows.push(['}', 'End of the object']);
    push('Finally the parser meets }. It comes with no comma before it, so the object that started with { ends here. The parser read all the way to the end without a single rule violation.', 'good');
    st.ln[4] = 'good'; st.done = true; st.read = 'Success'; st.kind = f.ageKind;
    push('The read succeeded, and the receiving side created an object in its own language. name is the string "Alice", age is ' + (num ? 'the number 30' : 'the string "30"') + ', and tags is an array of two strings. The text that was sent as characters became an object again.', 'good');
    st.plus = f.plus;
    push('The receiving program takes age from the object it read and adds 1 (this is the result of running age + 1 in JavaScript on the object that was read). ' + (num ? 'age is the number 30, so this adds numbers, and the result is 31.' : 'age is the string "30", so + attaches 1 after the string. The result is the string "301".'), num ? 'good' : 'bad');
    if (num) {
      sum.push('JSON is an agreed way to write an object as text so it can be sent. Inside { }, write "name": value pairs joined by commas, wrap names and string values in double quotes, and write numbers without quotes. The parser on the receiving side read this text from the start and made an object.');
      sum.push('The 30 in age has no quotes, so it is a number, and adding 1 gives 31. The text was read because it did not break the rules anywhere.');
    } else {
      sum.push('Even if you write 30 as "30" with double quotes, the text still follows the rules and is read, but age becomes a string instead of a number.');
      sum.push('Whether there are quotes decides the kind of the value. In JavaScript, adding 1 to age puts 1 after the string "30" and gives "301". Being readable and being the kind of value you expected are separate things.');
    }
    return { events: ev, summary: sum, f: f, row: ['Success', f.ageKind, f.plus] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the parser reading the text that was sent, from the beginning.'); return; }
    if (s.rows.length) H.table(v, ['Text the parser read', 'Meaning'], s.rows.map(function (r, i) { return { cls: '', cells: [r[0], i === s.rows.length - 1 && s.dead ? { v: r[1], cls: 'bad' } : r[1]] }; }), 'Text read');
    H.table(v, ['Item', 'Value'], [
      { cls: s.read ? '' : 'gone', cells: ['Parse result', s.read ? { v: s.read, cls: s.read === 'Success' ? 'good' : 'bad' } : 'Not yet'] },
      { cls: s.kind ? '' : 'gone', cells: ['Kind of age that was read', s.kind ? { v: s.kind, cls: s.kind === 'Could not read' ? 'bad' : '' } : 'Not yet'] },
      { cls: s.plus ? '' : 'gone', cells: ['age + 1 on the object that was read (JavaScript)', s.plus ? { v: s.plus, cls: s.plus === 'Could not read' ? 'bad' : '' } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: on the left, the received text as one box per line (the line being read is yellow, lines already read are green, a line that breaks the rules is red). On the right, the name, age, and tags slots of the object created by reading. Arrows go from the lines that were read to the slots, and if the read fails all slots are empty and say "Not created". At the bottom, the result boxes.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, i;
    var texts = this.lines(c).map(function (l) { return l.replace(/^ +/, ''); });
    P.size(680, 338);
    P.region('tx', 14, 8, 312, 228, 'Received text');
    for (i = 0; i < 5; i++) P.box('l' + i, 24, 34 + i * 40, 292, 34, { cls: s ? s.ln[i] + (s.ln[i] === 'hot' ? ' now' : '') : 'plain', sub: texts[i], mono: true });
    P.region('ob', 376, 8, 290, 228, 'Object created by reading');
    var ks = [['name', 'name', 44], ['age', 'age', 104], ['tags', 'tags', 164]];
    ks.forEach(function (k) {
      var val = s ? s.o[k[0]] : '', right = val || (s && s.dead ? 'Not created' : 'Not yet');
      var cls = s && s.dead ? 'ghost' : !val ? 'ghost' : s.done ? 'good' : 'plain';
      P.box('o_' + k[0], 386, k[2], 270, 44, { cls: cls, title: k[1], right: right });
    });
    if (s) s.arr.forEach(function (a) { P.arrow('a_' + a, 'l' + { name: 1, age: 2, tags: 3 }[a] + ':r', 'o_' + a + ':l', { cls: s.done ? 'good' : 'hot' }); });
    var rd = s ? s.read : '', kd = s ? s.kind : '', pl = s ? s.plus : '';
    P.box('r1', 14, 248, 652, 36, { cls: rd === 'Success' ? 'good' : rd ? 'bad' : 'ghost', title: 'Parse result', right: rd || 'Not yet' });
    P.box('r2', 14, 292, 322, 36, { cls: kd === 'Could not read' ? 'bad' : kd === 'string' ? 'hot' : kd ? 'good' : 'ghost', title: 'Kind of age read', right: kd || 'Not yet' });
    P.box('r3', 344, 292, 322, 36, { cls: pl === 'Could not read' ? 'bad' : pl === '301' ? 'hot' : pl ? 'good' : 'ghost', title: 'JavaScript age + 1', right: pl || 'Not yet' });
  },
  assume: 'We used two parsers. One is JSON.parse in Node.js 24.18.0 (the standard JavaScript parser). The other is Jackson 3.1.5 (jackson-databind and jackson-core) run on Java 21.0.12.1 with the default settings, that is, readTree of the parser made with JsonMapper.builder().build(). For all eighteen combinations, we fed the same characters as the code box (lines end with \\n, with no line break at the end) to both parsers as they are, and checked against the model: success or failure, the line, column, and character at the position of the error, the kind of age that was read (typeof for JSON.parse, the node kind for Jackson), and the names and values that were read. The two parsers made the same success or failure decision in all eighteen combinations, and when it failed, the error position was the same too. When it failed, both parsers only raised an error and did not return the part they had read, and when the text had more than one error, they reported only the first one they met. The original error messages differ between the two (for example, JSON.parse says "Expected property name or \'}\' in JSON at position 4" and Jackson says "was expecting double-quote to start property name"), and the screen shows only the kind of error, written in English. The original messages are in the Probe output. The "age + 1 on the object that was read (JavaScript)" on the screen is JavaScript behavior. It is the value of adding 1 to age of the object read with JSON.parse (we also checked typeof: the number 30 gives the number 31, and the string "30" gives the string "301"), and it is not Java behavior. When the same text is read with Jackson, age is a string node, and the intValue() of that node raised an error (JsonNodeException), while asInt() and reading into a record with an integer field both gave 30. That is Jackson\'s conversion behavior, so it is not used on the screen. Some parsers have options to accept text that breaks the rules, depending on the settings. What we checked is only this: turning on three Jackson JsonReadFeature options (ALLOW_SINGLE_QUOTES, ALLOW_UNQUOTED_PROPERTY_NAMES, ALLOW_TRAILING_COMMA) makes a name wrapped in single quotes, a name without quotes, and a comma after the last value readable (text with a missing comma was still not readable). All the checks on the screen were made with the default settings. We did not look at other parsers or at the settings of JSON.parse. Text with a comment in it was also not readable by either parser with the default settings. What we checked against the documentation is RFC 8259 section 1 (JSON is a text format for the serialization of structured data), section 2 (grammar; whitespace around the structural characters has no meaning), section 3 (a value is an object, array, number, or string, or false, null, or true, and these words are lowercase), section 4 (grammar of objects: members joined by commas, and a name is a string), section 5 (grammar of arrays), section 6 (numbers are written as decimal digits), section 7 (a string begins and ends with quotation marks, and the only quotation mark is the double quote, %x22), and section 9 (a parser must accept all texts that conform to the grammar, and may accept forms other than JSON). The documents were opened only as summaries, so we could not check them against the full original text. The statement that a trailing comma and single quotes are not allowed is not written directly in the document. We based it on the fact that the grammar in sections 4 and 5 has no shape with nothing after a comma and no single-quote shape, together with the run results above. The JSON on the screen covers only the object, array, string, and number among the kinds of values, and does not cover true, false, null, nested objects, or escapes inside strings (such as \\n). The in-depth lab on the same subject (how a server converts between objects and JSON) is "REST APIs and message converters".',
});
