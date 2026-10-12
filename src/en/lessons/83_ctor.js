Lab.register({
  id: 'ctor', nav: 'Classes, objects, and constructors', cat: 'Java language', mode: 'step',
  title: 'What happens, and in what order, when you use new?',
  intro: 'A class is a blueprint, and new creates one object from that blueprint. When it does, the fields are first set to their default values, then the field initializers and initializer blocks run in the order in which they are written, and finally the constructor body runs. Depending on which constructors you declare, new Order() may not compile at all.',
  terms: ['Classes and objects', 'Constructor', 'Default constructor', 'Default values of fields', 'this'],
  controls: [
    { id: 'ctors', label: 'Constructors declared in the Order class', type: 'select', value: 'chain', options: [['none', 'None'], ['arg', 'Only Order(int extra)'], ['both', 'Order() and Order(int extra)'], ['chain', 'Order() calls Order(int extra) with this(1)']] },
    { id: 'call', label: 'Code that creates the object', type: 'select', value: 'noarg', options: [['noarg', 'new Order()'], ['arg', 'new Order(3)']] },
    { id: 'first', label: 'Written first in the class', type: 'select', value: 'field', options: [['field', 'Field initializer int qty = 10'], ['block', 'Initializer block { qty = 20; }']], hint: 'The two run starting from the one that is written first.' },
  ],
  presets: [
    { t: 'Default settings', q: 'In what order does new Order() run when Order() calls Order(int extra) with this(1)?', d: 'Order() first calls the other constructor with this(1). The output is 21, standard.', v: { ctors: 'chain', call: 'noarg', first: 'field' } },
    { t: 'With no constructors declared', q: 'What if you declare no constructors in the Order class?', d: 'The compiler provides a default constructor. memo stays null.', v: { ctors: 'none', call: 'noarg', first: 'field' } },
    { t: 'Only a constructor with an argument, then new Order()', q: 'What if you declare only Order(int extra) and then call new Order()?', d: 'No default constructor is provided, so this is a compile-time error.', v: { ctors: 'arg', call: 'noarg', first: 'field' } },
    { t: 'With the initializer block written first', q: 'What if you declare Order() and Order(int extra), and write the initializer block { qty = 20; } first in the class?', d: 'The field initializer runs later, so qty becomes 10.', v: { ctors: 'both', call: 'noarg', first: 'block' } },
    { t: 'new Order(3)', q: 'What if you declare Order() and Order(int extra) and create the object with new Order(3)?', d: 'The constructor that matches the argument, Order(int extra), is selected.', v: { ctors: 'both', call: 'arg', first: 'field' } },
    { t: 'No constructors, then new Order(3)', q: 'What if you declare no constructors and create the object with new Order(3)?', d: 'The default constructor takes no arguments, so this is a compile-time error.', v: { ctors: 'none', call: 'arg', first: 'field' } },
  ],
  code: function (c) {
    var field = '    int qty = 10;                  // field initializer\n', memo = '    String memo;                   // field without an initializer\n', block = '    {                              // initializer block\n        qty = 20;\n    }\n';
    var argCtor = '    Order(int extra) {\n        qty = qty + extra;\n        memo = "extra " + extra;\n    }\n';
    var noArg = '    Order() {\n' + (c.ctors === 'chain' ? '        this(1);                   // calls another constructor of the same class first\n' : '') + '        memo = "standard";\n    }\n';
    var body = c.first === 'field' ? field + memo + '\n' + block : block + '\n' + field + memo;
    if (c.ctors === 'none') body += '                                   // no constructor is declared\n';
    if (c.ctors === 'arg') body += '\n' + argCtor;
    if (c.ctors === 'both' || c.ctors === 'chain') body += '\n' + noArg + '\n' + argCtor;
    var bad = this.bad(c);
    return 'class Order {\n' + body + '}\n\nOrder o = new Order(' + (c.call === 'arg' ? '3' : '') + ');' + (bad ? '             // compile-time error: no matching constructor' : '') + '\nSystem.out.println(o.qty + ", " + o.memo);';
  },
  label: function (c) { return { none: 'no constructors', arg: 'Order(int) only', both: 'Order(), Order(int)', chain: 'Order() with this(1)' }[c.ctors] + ' · ' + (c.call === 'arg' ? 'new Order(3)' : 'new Order()') + ' · ' + (c.first === 'field' ? 'initializer first' : 'block first'); },
  columns: ['Compilation', 'Order of execution', 'Output (qty, memo)'],
  // Is this a combination that does not compile because no constructor matches new?
  bad: function (c) { return (c.ctors === 'none' && c.call === 'arg') || (c.ctors === 'arg' && c.call === 'noarg'); },
  simulate: function (c) {
    var ev = [], sum = [], order = [], noarg = c.call === 'noarg', callTxt = noarg ? 'new Order()' : 'new Order(3)';
    var st = { made: false, qty: '', qtyBy: '', memo: '', memoBy: '', cur: '', tgt: '', done: [], stack: [], order: [], o: false, out: '', err: '' };
    function push(s, k) { st.order = order.slice(); ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function did(id, name) { if (st.done.indexOf(id) < 0) st.done.push(id); if (name) order.push(name); }
    var ERR = 'constructor Order in class Order cannot be applied to given types';
    if (c.ctors === 'none') push('Compilation: The Order class declares no constructors. In this case, the compiler automatically provides the default constructor Order() { }, which takes no arguments and does nothing.');
    else if (c.ctors === 'arg') push('Compilation: The Order class declares the constructor Order(int extra). Once you write even one constructor yourself, the compiler does not provide a default constructor. Order(int extra) is the only constructor of this class.');
    else push('Compilation: The Order class declares the constructors Order() and Order(int extra). A class can have several constructors as long as they take different arguments.');
    if (this.bad(c)) {
      st.err = ERR;
      if (noarg) push('Compilation: The compiler looks for a constructor that takes no arguments, to match new Order(). This class has only Order(int extra). There is no matching constructor, so this is a compile-time error. The program does not run.', 'bad');
      else push('Compilation: The compiler looks for a constructor that takes one int, to match new Order(3). This class has only the Order() that the compiler provided. There is no matching constructor, so this is a compile-time error. The program does not run.', 'bad');
      sum.push('This is a compile-time error. The javac message is "' + ERR + '", which means "the constructor of Order cannot be called with these arguments".');
      if (noarg) { sum.push('A default constructor exists only when the class declares no constructors at all. The moment you add a constructor that takes arguments, new Order(), which compiled until then, no longer compiles.'); sum.push('To keep using new Order() as well, write the no-argument constructor Order() { } yourself.'); }
      else sum.push('The default constructor that the compiler provides takes no arguments. To create an object from a value that you pass in, you must write a constructor that takes that argument.');
      return { events: ev, summary: sum, row: ['Error: ' + ERR, 'Not run', 'Not run'] };
    }
    push('Compilation: The compiler looks for a constructor that matches ' + callTxt + '. ' + (noarg ? 'There are no arguments, so ' + (c.ctors === 'none' ? 'the default constructor Order() that the compiler provided' : 'Order()') + ' is selected.' : 'One int value is passed, so Order(int extra) is selected.') + ' Now the program runs.');
    st.made = true; st.qty = '0'; st.qtyBy = 'Default value'; st.memo = 'null'; st.memoBy = 'Default value';
    push(callTxt + ' runs: First of all, memory for an Order object is allocated on the heap, and every field is set to its default value. qty, which is an int, is 0, and memo, which is a reference type, is null. Neither the initializers nor the constructor body has run yet.');
    var chained = noarg && c.ctors === 'chain';
    if (chained) {
      st.stack = ['Order()']; st.cur = 'c0';
      push('this(1), the first line of the constructor Order(): This calls another constructor of the same class, Order(int extra), first. extra receives 1. The rest of the body of Order() runs after that constructor finishes.');
      st.stack.push('Order(int extra)');
    } else st.stack = [noarg ? 'Order()' : 'Order(int extra)'];
    var why = ' Field initializers and initializer blocks run before the constructor body, in the order in which they are written in the class, no matter which constructor is called.';
    function runField(second) {
      var before = st.qty; st.qty = '10'; st.qtyBy = 'Field initializer'; st.cur = 'pf'; st.tgt = 'fq'; did('pf', 'field initializer');
      push('int qty = 10: The field initializer runs, and qty changes from ' + before + ' to 10.' + (second ? ' The initializer is written below the block, so it ran later and overwrote the 20 that the block had assigned.' : why), second ? 'bad' : '');
    }
    function runBlock(second) {
      var before = st.qty; st.qty = '20'; st.qtyBy = 'Initializer block'; st.cur = 'pb'; st.tgt = 'fq'; did('pb', 'initializer block');
      push('qty = 20 in the initializer block: qty changes from ' + before + ' to 20.' + (second ? ' The block is written below the initializer, so it ran later.' : why));
    }
    if (c.first === 'field') { runField(false); runBlock(true); } else { runBlock(false); runField(true); }
    var extra = chained ? 1 : 3;
    if (!noarg || chained) {
      var b = st.qty; st.qty = String(+b + extra); st.qtyBy = 'Order(int extra)'; st.cur = 'c1'; st.tgt = 'fq'; did('c1', 'Order(int) body');
      push('qty = qty + extra in the body of Order(int extra): A constructor body runs only after initialization has finished. The current value of qty is ' + b + ', and adding extra, which is ' + extra + ', makes qty ' + st.qty + '.');
      st.memo = '"extra ' + extra + '"'; st.memoBy = 'Order(int extra)'; st.tgt = 'fm';
      push('memo = "extra " + extra in the body of Order(int extra): memo, which was null, is set to "extra ' + extra + '".');
    }
    if (noarg && c.ctors === 'none') {
      st.cur = 'c0'; st.tgt = ''; did('c0');
      push('The body of the default constructor Order() { }: The constructor that the compiler provided has an empty body, so it changes nothing. Nothing has assigned a value to memo, so it keeps its default value, null.');
    } else if (noarg) {
      if (chained) st.stack.pop();
      var mb = st.memo; st.memo = '"standard"'; st.memoBy = 'Order()'; st.cur = 'c0'; st.tgt = 'fm'; did('c0', 'Order() body');
      push(chained ? 'memo = "standard", the rest of the body of Order(): The constructor called with this(1) has finished, and control is back in Order(). memo changes from ' + mb + ' to "standard". The initializer and the block do not run again.' : 'memo = "standard" in the body of Order(): A constructor body runs only after initialization has finished. memo, which was null, is set to "standard".');
    }
    st.stack = []; st.cur = ''; st.tgt = ''; st.o = true;
    push('Order o = ' + callTxt + ': The constructor has finished. new returns a reference to the completed object, and the variable o holds that reference.');
    var out = st.qty + ', ' + st.memo.replace(/"/g, ''); st.out = out;
    push('System.out.println(o.qty + ", " + o.memo): This reads qty and memo of the object that o refers to and prints them. The output is ' + out + '.', 'good');
    sum.push(c.first === 'field' ? 'The initializer (10) ran first and the block below it (20) ran later, so qty was 20 when the constructor body started.' : 'The block (20) ran first and the initializer below it (10) ran later, so qty was 10 when the constructor body started. Field initializers and initializer blocks run from the top of the class down, so when both of them touch the same field, where you write them changes the result.');
    if (c.ctors === 'none') sum.push('new Order() works even though no constructor is declared, because the compiler provides a default constructor. A field that is never assigned a value keeps its default value (0 for numbers, null for reference types). Unlike a local variable, a field (unless it is final) does not cause a compile-time error when you leave it uninitialized.');
    if (chained) sum.push('this(...) can be used only as the first statement of a constructor, and it runs another constructor of the same class first. Use it to gather the common work in one constructor. The initializer and the block run only once.');
    if (c.ctors === 'both' && noarg) sum.push('Order() and Order(int extra) are different constructors. Only the one that matches the arguments passed to new runs.');
    if (!noarg) sum.push('new Order(3) runs Order(int extra), which matches the argument that is passed. Whether or not an Order() constructor exists, it does not run for this call.');
    return { events: ev, summary: sum, row: ['Success', order.join(' → '), out] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go one step at a time, starting from compilation.'); return; }
    if (s.err) { H.title(v, 'Compile-time error'); H.text(v, 'javac: ' + s.err); return; }
    H.table(v, ['Field', 'Type', 'Current value', 'Set by'], s.made ? [
      { cells: ['qty', 'int', { v: s.qty, cls: s.tgt === 'fq' ? 'hot' : '' }, s.qtyBy] },
      { cells: ['memo', 'String', { v: s.memo, cls: s.tgt === 'fm' ? 'hot' : '' }, s.memoBy] },
    ] : [], 'Order object on the heap');
    if (!s.made) H.text(v, 'No object has been created yet.');
  },
  // Diagram: on the left, the pieces written in the class (in the order written, top to bottom); on the right, the object on the heap and its field values. An arrow goes from the piece that is running now to the field that it changes.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { made: false, done: [], stack: [], order: [], cur: '', tgt: '', o: false, out: '', err: '' };
    var bad = this.bad(c), noarg = c.call === 'noarg';
    P.size(680, 318);
    P.region('cl', 16, 16, 330, 232, 'Written in class Order (top to bottom)');
    var waiting = s.stack.length > 1 && s.cur !== 'c0';   // Order() has called the other constructor with this(1) and is waiting
    function cls(id) { return s.cur === id ? 'hot now' : id === 'c0' && waiting ? 'wait' : s.done.indexOf(id) >= 0 ? 'good' : 'plain'; }
    function rank(id) { var names = { pf: 'field initializer', pb: 'initializer block', c1: 'Order(int) body', c0: 'Order() body' }, i = s.order.indexOf(names[id]); return i >= 0 ? '#' + (i + 1) : ''; }
    var yf = c.first === 'field' ? 50 : 98, yb = c.first === 'field' ? 98 : 50;
    P.box('pf', 30, yf, 302, 40, { cls: cls('pf'), title: 'Field initializer', sub: 'int qty = 10;', right: rank('pf') });
    P.box('pb', 30, yb, 302, 40, { cls: cls('pb'), title: 'Initializer block', sub: '{ qty = 20; }', right: rank('pb') });
    if (c.ctors === 'none') P.box('c0', 30, 146, 302, 40, { cls: s.cur === 'c0' ? 'hot now' : 'ghost', title: 'Default constructor Order() { }', sub: 'Not written, so the compiler adds it' });
    else if (c.ctors === 'arg') P.box('c0', 30, 146, 302, 40, { cls: bad ? (s.err ? 'bad' : 'ghost') : 'ghost', title: 'No Order()', sub: 'Not provided: a constructor is written' });
    else P.box('c0', 30, 146, 302, 40, { cls: cls('c0'), title: 'Constructor Order()', sub: c.ctors === 'chain' ? 'this(1); memo = "standard";' : 'memo = "standard";', right: waiting ? 'waiting' : rank('c0') });
    if (c.ctors === 'none') P.box('c1', 30, 194, 302, 40, { cls: bad && s.err ? 'bad' : 'ghost', title: 'No Order(int)', sub: 'Default constructor takes no arguments' });
    else P.box('c1', 30, 194, 302, 40, { cls: cls('c1'), title: 'Constructor Order(int extra)', sub: 'Adds extra to qty and sets memo', right: rank('c1') });
    P.region('hp', 370, 16, 294, 152, 'Heap: Order object');
    function by(x) { return x === 'Default value' ? 'Still the default value' : x + ' set it'; }
    if (s.made) {
      P.box('fq', 384, 50, 266, 44, { cls: s.tgt === 'fq' ? 'hot' : 'wait', title: 'qty', sub: by(s.qtyBy), right: s.qty });
      P.box('fm', 384, 106, 266, 44, { cls: s.tgt === 'fm' ? 'hot' : 'wait', title: 'memo', sub: by(s.memoBy), right: s.memo });
    } else {
      P.box('fq', 384, 50, 266, 44, { cls: 'ghost', title: 'qty', sub: s.err ? 'not run' : 'no object yet' });
      P.box('fm', 384, 106, 266, 44, { cls: 'ghost', title: 'memo', sub: s.err ? 'not run' : 'no object yet' });
    }
    P.box('vo', 384, 196, 266, 38, { cls: s.o ? 'wait' : 'ghost', title: 'Variable o', right: s.o ? 'refers to the object' : s.err ? 'none' : 'not assigned yet' });
    if (s.o) P.arrow('ao', 'vo:t', 'fm:b', {});
    if (s.cur && s.tgt) P.arrow('wr', s.cur + ':r', s.tgt + ':l', { cls: 'hot' });
    P.box('out', 16, 266, 648, 36, { cls: s.err ? 'bad' : s.out ? 'good' : 'ghost', title: s.err ? 'Compile-time error' : 'Console output', right: s.err ? 'no matching constructor' : s.out || (s.made ? (noarg ? 'new Order()' : 'new Order(3)') + ' in progress' : 'not run yet') });
    P.note('The "#1, #2" marks in the boxes on the left show the order in which the pieces actually ran.');
  },
  assume: 'All 16 combinations were actually compiled and run with the same code on JDK 21 on this PC, and the compilation result, the error message, the order in which the initializer, the block, and the constructor bodies ran, and the output were checked against the results. The order of execution was confirmed by inserting only logging lines into the same code, and it was also confirmed by execution that the fields already hold their default values (0, null) before the initializers run. Simplifications: every constructor calls a constructor of its superclass (here, Object) before its own body, and the diagram leaves this step out (the "Inheritance and overriding" lab covers it). Initializer blocks are not used often in practice, and they are included here to show the order. The error message is the first line of the English message from javac. That this(...) can be used only as the first statement of a constructor is as of JDK 21 and was confirmed by compiling on this PC. In newer JDKs this is said to have changed so that some statements can come before this(...), but this was not verified on this PC.',
});
