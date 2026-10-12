Lab.register({
  id: 'casting', nav: 'Operators and type conversion', cat: 'Java language', mode: 'step',
  title: 'Why is 7 / 2 equal to 3 and not 3.5?',
  intro: 'In Java, the result of a calculation is determined not only by the numbers but also by the types. A calculation between two int values gives an int, so the fractional part, or the part that goes beyond the range, is lost, and when the types are mixed, the narrower type is automatically converted to the wider type before the calculation. With +, if either side is a string, the operation is concatenation, not addition.',
  terms: ['Type conversion', 'Integer division and remainder', 'Integer overflow', 'String concatenation'],
  controls: [
    { id: 'topic', label: 'What to look at', type: 'select', value: 'ints', options: [['ints', 'Calculations between integers (division, remainder, range)'], ['conv', 'When types are mixed or changed (type conversion)'], ['str', 'Strings and +']] },
    { id: 'e1', label: 'Expression', type: 'select', value: 'div', options: [['div', '7 / 2'], ['mod', '7 % 2'], ['ndiv', '-7 / 2'], ['nmod', '-7 % 2'], ['zero', '7 / 0'], ['over', '2147483647 + 1']], show: function (c) { return c.topic === 'ints'; } },
    { id: 'e2', label: 'Code', type: 'select', value: 'late', options: [['late', 'double r = 7 / 2'], ['mix', 'double r = 7 / 2.0'], ['longlate', 'long r = big + 1  (big is 2147483647)'], ['longmix', 'long r = big + 1L'], ['narrow', 'int r = 3.99'], ['trunc', 'int r = (int) 3.99'], ['ntrunc', 'int r = (int) -3.99'], ['byte', 'byte r = (byte) 200']], show: function (c) { return c.topic === 'conv'; } },
    { id: 'e3', label: 'Expression', type: 'select', value: 'ns', options: [['ns', '1 + 2 + "3"'], ['sn', '"1" + 2 + 3'], ['paren', '"1" + (2 + 3)'], ['mixed', '1 + 2 + "3" + 4 + 5']], show: function (c) { return c.topic === 'str'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What value does the expression 7 / 2 produce in a calculation between integers?', d: 'Dividing an int by an int gives 3, not 3.5.', v: { topic: 'ints', e1: 'div', e2: 'late', e3: 'ns' } },
    { t: 'Even with a double variable', q: 'What if you look at "When types are mixed or changed (type conversion)" and store the result with double r = 7 / 2?', d: 'The calculation has already finished as an int, so the result is 3.0.', v: { topic: 'conv', e1: 'div', e2: 'late', e3: 'ns' } },
    { t: 'Writing one side as a double', q: 'What if you change double r = 7 / 2 to double r = 7 / 2.0?', d: 'The types are matched before the calculation, so the result is 3.5.', v: { topic: 'conv', e1: 'div', e2: 'mix', e3: 'ns' } },
    { t: 'Going beyond the range of int', q: 'What if you change the expression to 2147483647 + 1 in a calculation between integers?', d: 'Adding 1 to the largest value gives the smallest value.', v: { topic: 'ints', e1: 'over', e2: 'late', e3: 'ns' } },
    { t: 'Only storing in a long variable', q: 'What if big is 2147483647 and you store the expression 2147483647 + 1 with long r = big + 1?', d: 'The value after the overflow is stored as it is.', v: { topic: 'conv', e1: 'over', e2: 'longlate', e3: 'ns' } },
    { t: 'Casting to byte', q: 'What if you change the code to byte r = (byte) 200 under type conversion?', d: '200 becomes -56.', v: { topic: 'conv', e1: 'div', e2: 'byte', e3: 'ns' } },
    { t: 'Adding a number and a string', q: 'What if you look at "Strings and +" and evaluate the expression 1 + 2 + "3"?', d: '1 + 2 + "3" is neither "6" nor "123".', v: { topic: 'str', e1: 'div', e2: 'late', e3: 'ns' } },
  ],
  // The one line chosen by the settings: the type T of the variable r, the right-hand expression e (an expression tree), and the note written next to the code
  pick: function (c) {
    var L = function (t, v, s) { return { k: 'lit', t: t, v: v, s: s }; }, B = function (op, l, r) { return { k: 'bin', op: op, l: l, r: r }; }, C = function (t, e) { return { k: 'cast', t: t, e: e }; }, Par = function (e) { return { k: 'par', e: e }; };
    var i = function (n) { return L('int', n, String(n)); }, s = function (x) { return L('String', x, '"' + x + '"'); }, d = function (x, sx) { return L('double', x, sx); }, big = function () { return { k: 'var', name: 'big', t: 'int', v: 2147483647 }; };
    var key = c.topic === 'ints' ? c.e1 : c.topic === 'conv' ? c.e2 : c.e3;
    var p = {
      div: ['int', B('/', i(7), i(2)), 'int divided by int'], mod: ['int', B('%', i(7), i(2)), '% is the remainder'], ndiv: ['int', B('/', i(-7), i(2)), 'dividing a negative number'], nmod: ['int', B('%', i(-7), i(2)), 'remainder of a negative number'],
      zero: ['int', B('/', i(7), i(0)), 'dividing by 0'], over: ['int', B('+', big(), i(1)), 'addition beyond the range'],
      late: ['double', B('/', i(7), i(2)), 'int calculation, double variable'], mix: ['double', B('/', i(7), d(2, '2.0')), 'one side is a double'],
      longlate: ['long', B('+', big(), i(1)), 'int calculation, long variable'], longmix: ['long', B('+', big(), L('long', 1, '1L')), '1L is a 1 of type long'],
      narrow: ['int', d(3.99, '3.99'), 'storing it without (int)'], trunc: ['int', C('int', d(3.99, '3.99')), 'cast'], ntrunc: ['int', C('int', d(-3.99, '-3.99')), 'casting a negative number'], byte: ['byte', C('byte', i(200)), 'casting an int to byte'],
      ns: ['String', B('+', B('+', i(1), i(2)), s('3')), 'from the left, in order'], sn: ['String', B('+', B('+', s('1'), i(2)), i(3)), 'the string comes first'], paren: ['String', B('+', s('1'), Par(B('+', i(2), i(3)))), 'the parentheses first'],
      mixed: ['String', B('+', B('+', B('+', B('+', i(1), i(2)), s('3')), i(4)), i(5)), 'numbers and strings mixed'],
    }[key];
    return { key: key, T: p[0], e: p[1], note: p[2], big: key === 'over' || key === 'longlate' || key === 'longmix' };
  },
  // The expression as text. A part that has already been evaluated (val) is written as its value.
  jd: function (x) { return Number.isInteger(x) && Math.abs(x) < 1e7 ? x.toFixed(1) : String(x); },
  disp: function (n) { return n.t === 'String' ? '"' + n.v + '"' : n.t === 'double' ? this.jd(n.v) : String(n.v); },
  txt: function (n) { return n.k === 'lit' ? n.s : n.k === 'var' ? n.name : n.k === 'val' ? this.disp(n) : n.k === 'par' ? '(' + this.txt(n.e) + ')' : n.k === 'cast' ? '(' + n.t + ') ' + this.txt(n.e) : this.txt(n.l) + ' ' + n.op + ' ' + this.txt(n.r); },
  // Finds only the type, without calculating (what the compiler does)
  typeOf: function (n) {
    if (n.k === 'par') return this.typeOf(n.e); if (n.k === 'cast') return n.t; if (n.k !== 'bin') return n.t;
    var a = this.typeOf(n.l), b = this.typeOf(n.r);
    if (n.op === '+' && (a === 'String' || b === 'String')) return 'String';
    return a === 'double' || b === 'double' ? 'double' : a === 'long' || b === 'long' ? 'long' : 'int';
  },
  stmt: function (c) { var p = this.pick(c); return p.T + ' r = ' + this.txt(p.e); },
  code: function (c) {
    var p = this.pick(c), line = p.T + ' r = ' + this.txt(p.e) + ';', pad = function (x) { return x + new Array(Math.max(2, 33 - x.length)).join(' ') + '// '; };
    return (p.big ? pad('int big = 2147483647;') + 'the largest value an int can hold\n' : '') + pad(line) + p.note + '\n\nSystem.out.println(r);';
  },
  label: function (c) { return { ints: 'Integer calculation', conv: 'Type conversion', str: 'Strings and +' }[c.topic] + ' · ' + this.stmt(c); },
  columns: ['Type of the right-hand expression', 'Type of the variable r', 'Output or error'],
  simulate: function (c) {
    var self = this, p = this.pick(c), T = p.T, root = { e: p.e }, ev = [], sum = [], lost = false;
    var wide = ['byte', 'short', 'int', 'long', 'float', 'double'], et = this.typeOf(p.e);
    var st = { forms: [{ x: this.txt(p.e), t: p.e.k === 'lit' ? p.e.t : '' }], r: null, out: null, hi: null, bad: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function form() { st.forms.push({ x: self.txt(root.e), t: root.e.k === 'val' ? root.e.t : '' }); }
    function set(n, t, v) { delete n.l; delete n.r; delete n.e; delete n.op; delete n.s; delete n.name; n.k = 'val'; n.t = t; n.v = v; }
    function widen(x, t) { return x.v; }   // Converts to the wider type. Every value in this lab can be represented exactly as a JavaScript number, so the value stays the same
    var ro = { byte: 'to byte', int: 'to int', long: 'to long', double: 'to double', String: 'to String' };
    function Stop(msg) { this.msg = msg; }
    var parNote = '';
    function run(n) {
      if (n.k === 'par') { parNote = 'This part is in parentheses, so it is calculated before the + outside. '; run(n.e); parNote = ''; set(n, n.e.t, n.e.v); return; }
      if (n.k === 'cast') {
        run(n.e); var before = self.txt(n), from = n.e.t, x = n.e.v, v, s;
        if (n.t === 'int' && from === 'double') {
          v = isNaN(x) ? 0 : Math.max(-2147483648, Math.min(2147483647, Math.trunc(x)));
          s = before + ': The cast converts the double value to int. An int cannot hold a fractional part, so the fractional part is discarded and only ' + v + ' remains. The value is not rounded to the nearest integer.' + (x < 0 && v !== x ? ' The value is truncated toward zero (rounding down to the next lower integer would have given ' + Math.floor(x) + ').' : '');
          if (v !== x) lost = true;
        } else if (n.t === 'byte' && from === 'int') {
          v = ((x & 255) << 24) >> 24;
          var bits = ('00000000' + (x & 255).toString(2)).slice(-8);
          s = before + ': The cast converts the int value to byte. An int has 32 bits and a byte has 8 bits. Only the low-order 8 bits (' + bits + ') are kept, and the higher bits are cut off. ' + (v === x ? 'The value is within the range, so it is still ' + v + '.' : 'A byte represents only -128 through 127, so it cannot hold this value as it is. The remaining bits, read as a byte, give ' + v + '.');
          if (v !== x) lost = true;
        } else { v = widen(n.e, n.t); s = before + ': The ' + from + ' value is converted ' + ro[n.t] + '.'; }
        st.hi = { from: from, to: n.t, kind: wide.indexOf(n.t) < wide.indexOf(from) ? 'narrow' : 'widen' };
        set(n, n.t, v); form(); push(s, lost ? 'bad' : ''); return;
      }
      if (n.k !== 'bin') return;
      run(n.l); run(n.r);
      var a = n.l, b = n.r, op = n.op, text = self.txt(n) + (a.k === 'var' ? ' (the value of ' + a.name + ' is ' + a.v + ')' : ''), res, rt, msg, kind = '';
      if (op === '+' && (a.t === 'String' || b.t === 'String')) {
        var sa = a.t === 'String' ? a.v : self.disp(a), sb = b.t === 'String' ? b.v : self.disp(b);
        st.hi = { rule: 'concat' }; set(n, 'String', sa + sb); form();
        push(text + ': One side is a string, so here + is concatenation, not addition. The numeric side is converted to a string and then joined. The result is the string "' + (sa + sb) + '".', '');
        return;
      }
      rt = a.t === 'double' || b.t === 'double' ? 'double' : a.t === 'long' || b.t === 'long' ? 'long' : 'int';
      var x = widen(a, rt), y = widen(b, rt), verb = { '/': 'division gives', '%': 'remainder is', '+': 'addition gives' }[op];
      if (rt === 'int') {
        st.hi = c.topic === 'str' ? { rule: 'add' } : { from: 'int', to: 'int', kind: 'same' };
        if (op === '/' || op === '%') {
          if (y === 0) { st.bad = true; st.out = 'ArithmeticException: / by zero'; push(text + ': An integer cannot be divided by 0. An ArithmeticException is thrown, and the program stops at this line. The output statement below it is not executed.', 'bad'); throw new Stop('ArithmeticException: / by zero'); }
          var q = Math.trunc(x / y), rem = x % y, pr = function (z) { return z < 0 ? '(' + z + ')' : String(z); };
          if (op === '/') {
            res = q;
            if (rem !== 0) { lost = true; msg = text + ': Both sides are int, so the result is also an int. The mathematical value is ' + (x / y) + '. But an int cannot hold a fractional part, so it is discarded without rounding and only ' + q + ' remains.' + (x / y < 0 ? ' The value is truncated toward zero (rounding down to the next lower integer would have given ' + Math.floor(x / y) + ').' : ''); kind = 'bad'; }
            else msg = text + ': Both sides are int, so the result is also an int. The division is exact, so the result is ' + q + '.';
          } else {
            res = rem;
            msg = text + ': % gives the number that is left over from a division (the remainder). Written as an equation, the division is ' + x + ' = ' + y + ' × ' + pr(q) + ' + ' + pr(rem) + '. The quotient is ' + q + ' and the remainder is ' + rem + '.' + (x < 0 ? ' The sign of the remainder follows the sign of the dividend, the number on the left.' : '');
          }
        } else {
          res = (x + y) | 0;
          if (res !== x + y) { lost = true; kind = 'bad'; msg = text + ': Both sides are int, so the result is also an int. The mathematical value is ' + (x + y) + ', but the largest value an int can hold is 2147483647. When the range is exceeded, the value wraps around, without an error, to the smallest value at the opposite end (overflow). The result is ' + res + '.'; }
          else msg = text + ': ' + parNote + 'Both sides are int, so this is numeric addition. The result is the int value ' + res + '.';
        }
      } else {
        var narrow = a.t === rt ? b : a;
        st.hi = { from: narrow.t, to: rt, kind: 'widen' };
        if (rt === 'double') res = op === '/' ? x / y : op === '%' ? x % y : x + y;
        else res = op === '/' ? Math.trunc(x / y) : op === '%' ? x % y : x + y;   // long: the values in this lab do not go beyond the range of long
        msg = text + ': One side is a ' + rt + ', so before the calculation the ' + narrow.t + ' side is automatically converted ' + ro[rt] + '. The ' + rt + ' ' + verb + ' ' + (rt === 'double' ? self.jd(res) : String(res)) + '. ' + (rt === 'double' ? 'The fractional part is kept.' : 'The value is within the range of long, so it does not overflow.');
        kind = 'good';
      }
      set(n, rt, res); form(); push(msg, kind);
    }
    var okAssign = T === et || (wide.indexOf(T) >= 0 && wide.indexOf(et) >= 0 && wide.indexOf(T) > wide.indexOf(et));
    var result, msgText = '';
    if (!okAssign) {
      // The compiler stops it before the program runs
      st.hi = { from: et, to: T, kind: 'error' };
      push('The compiler checks the types before the program runs. The type of the right-hand expression ' + this.txt(p.e) + ' is ' + et + ', and the type of the variable r is ' + T + '.', '');
      st.bad = true; st.out = 'Compile-time error'; msgText = 'incompatible types: possible lossy conversion from ' + et + ' to ' + T;
      push(this.stmt(c) + ': To store the ' + et + ' value in the ' + T + ' variable, the fractional part would have to be discarded, so information could be lost. A conversion in a direction that can lose information is not done automatically. A compile-time error occurs, and the program does not run. The message that javac shows is "' + msgText + '".', 'bad');
      result = 'Compile-time error';
    } else {
      try {
        if (p.big) push('int big = 2147483647: The largest value an int can hold is stored in the variable big.', '');
        if (p.e.k === 'lit') push('The type of the right-hand expression ' + this.txt(p.e) + ' is ' + et + '.', ''); else run(root.e);
        var val = root.e, rv = val.v;
        if (T !== et) {
          rv = widen(val, T); st.hi = { from: et, to: T, kind: 'widen' };
          st.r = self.disp({ t: T, v: rv });
          push(T + ' r = ' + self.disp(val) + ': The calculation on the right has already finished, and its result is the ' + et + ' value ' + self.disp(val) + '. When this value is stored in the ' + T + ' variable, it is widened ' + ro[T] + ' (an automatic conversion). The value in r is ' + st.r + '.' + (lost ? ' The part that was lost during the calculation does not come back.' : ''), lost ? 'bad' : '');
        } else {
          st.hi = null; st.r = self.disp(val);
          push(T + ' r = ' + self.disp(val) + ': ' + (T === 'String' ? 'The resulting string is stored in the variable r.' : 'The calculated value is stored in the ' + T + ' variable r. The types are the same, so the value stays as it is.'), '');
        }
        result = T === 'String' ? rv : self.disp({ t: T, v: rv }); st.out = result;
        push('System.out.println(r): The value in r is printed. The output is ' + result + '.', lost ? 'bad' : 'good');
      } catch (e) { if (!(e instanceof Stop)) throw e; result = e.msg; }
    }
    var tips = {
      div: ['Dividing an int by an int gives an int. The fractional part is discarded without rounding.', 'To get the fractional part too, you must make one side a double before dividing.'],
      mod: ['% gives the remainder. It is used often, for example to see whether a number is even (n % 2 == 0) or to do something only once in every 10 times (i % 10 == 0).'],
      ndiv: ['Integer division does not round down. It truncates toward zero. For positive numbers the two are the same, so the difference does not show, and it appears only with negative numbers.'],
      nmod: ['The sign of the remainder follows the number on the left (the dividend). So if you write the test for an odd number as n % 2 == 1, it is false for negative odd numbers. Write n % 2 != 0.'],
      zero: ['Dividing an integer by 0 throws an ArithmeticException. If the divisor can be 0, check it before dividing.', 'The floating-point calculation 7 / 0.0 gives Infinity without an exception. Integers and floating-point numbers follow different rules.'],
      over: ['An int holds only values from about -2.1 billion to 2.1 billion. When the range is exceeded, the value wraps around to the opposite end without an exception or a warning, so it is hard to notice.', 'Use long for calculations that can produce large numbers (amounts of money, times in milliseconds, products of counts). If you want to learn of the overflow through an exception at the moment it happens, use Math.addExact.'],
      late: ['The type is determined when the calculation is done, not when the value is stored in a variable. 7 / 2 is a calculation between two int values, so it has already become 3, and storing it in a double variable only makes it 3.0.', 'The same thing happens when you compute an average and write double avg = sum / count;. Convert one side to double before dividing, as in (double) sum / count.'],
      mix: ['In a calculation with mixed types, the narrower type is automatically converted to the wider type before the calculation (long is wider than int, and double is wider than long). The conversion goes in the direction of a wider range of values, so you do not have to write anything for it.'],
      longlate: ['Storing the result in a long variable is not enough to prevent overflow. big + 1 is a calculation between two int values, so it has already overflowed, and that result is merely widened to long.', 'The calculation itself must be done in long.'],
      longmix: ['If even one long is involved in a calculation, the calculation is done in long. Add L after the number, as in 1L, or convert one side first, as in (long) big.'],
      narrow: ['Storing a value of a wider type in a variable of a narrower type can lose information, so it is not done automatically. The compiler stops it before the program runs.', 'If you write (int) yourself, meaning that it is acceptable to lose information, the code compiles. This is called a cast.'],
      trunc: ['(int) discards the fractional part. Even 3.99 becomes 3. If you need rounding to the nearest integer, use Math.round.'],
      ntrunc: ['Truncation is toward zero. -3.99 becomes -3, not -4. This is the same direction as in the integer division -7 / 2, which is -3.'],
      byte: ['When an integer is cast to a narrower integer type, only the low-order bits are kept and the higher bits are cut off. A value within the range stays the same, but a value outside the range becomes a completely different number.', 'A cast tells the compiler that "it is acceptable to lose information". Whether the value is within the range is something you must check yourself.'],
      ns: ['+ is evaluated from the left, in order. Until a string appears, it is numeric addition, and from the moment a string appears, it is concatenation.'],
      sn: ['If the first operand is a string, every + after it is concatenation. This is why "Sum: " + 1 + 2 is "Sum: 12" and not "Sum: 3".'],
      paren: ['To add the numbers first, put them in parentheses. The part in parentheses is calculated first and becomes 5, and only then is it joined to the string.'],
      mixed: ['Once the value has become a string, every + after it is concatenation. The 4 and the 5 at the end are not added to make 9. They are joined on one after the other.'],
    }[p.key];
    tips.forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, T: T, first: st.forms[0], msg: msgText, row: [et, T, result] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the calculation one step at a time.'); return; }
    H.table(v, ['Order', 'Expression', 'Type'], s.forms.map(function (f, i) { return { cells: [i === 0 ? 'At the start' : 'After step ' + i, { v: f.x, cls: i === s.forms.length - 1 ? 'hot' : '' }, f.t || '(not evaluated yet)'] }; }), 'Order in which the right-hand expression is evaluated');
  },
  // Diagram: on the left, the right-hand expression getting shorter one step at a time; on the right, the types in order of width (for the strings topic, the two meanings of +); at the bottom, the variable r and the output.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { forms: [sim.first], r: null, out: null, hi: null, bad: false }, h = s.hi || {};
    P.size(680, 296);
    P.region('ex', 16, 16, 318, 200, 'Evaluation order (top to bottom)');
    s.forms.forEach(function (f, i) {
      var cur = i === s.forms.length - 1;
      P.box('f' + i, 30, 46 + i * 32, 290, 26, { cls: cur ? (s.bad && s.out === 'Compile-time error' ? 'bad now' : 'hot now') : 'plain', title: f.x, right: f.t, mono: true });
    });
    if (c.topic === 'str') {
      P.region('ty', 350, 16, 314, 200, 'The two meanings of +');
      P.box('ru1', 364, 52, 286, 44, { cls: h.rule === 'add' ? 'wait now' : 'plain', title: 'Both sides are numbers', sub: 'Addition: 1 + 2 is 3' });
      P.box('ru2', 364, 112, 286, 44, { cls: h.rule === 'concat' ? 'hot now' : 'plain', title: 'Either side is a string', sub: 'Concatenation: 3 + "3" is "33"' });
      P.text('ru3', 364, 190, 'Each + is evaluated from the left', { cls: 'mut' });
    } else {
      P.region('ty', 350, 16, 314, 200, 'Type width (wider toward the bottom)');
      [['byte', '8 bits', '-128 to 127'], ['short', '16 bits', '-32768 to 32767'], ['int', '32 bits', 'about ±2.1 billion'], ['long', '64 bits', 'about ±9.22 × 10^18'], ['double', '64 bits', 'fractional numbers']].forEach(function (r, i) {
        var cls = h.to === r[0] ? (h.kind === 'error' ? 'bad now' : 'hot now') : h.from === r[0] ? 'wait' : 'plain';
        P.box('t_' + r[0], 364, 46 + i * 28, 286, 23, { cls: cls, title: r[0] + ' · ' + r[1], right: r[2] });
      });
      P.text('tk', 364, 204, !h.kind ? 'Automatic only from narrow to wide' : h.kind === 'same' ? h.from + ' calculation: the result is also ' + h.to : h.kind === 'widen' ? h.from + ' → ' + h.to + ' widening: automatic' : h.kind === 'narrow' ? h.from + ' → ' + h.to + ' narrowing: may lose data' : h.from + ' → ' + h.to + ' narrowing: not automatic', { cls: h.kind === 'narrow' || h.kind === 'error' ? 'bad' : h.kind === 'widen' ? 'good' : 'mut' });
    }
    P.box('rv', 16, 232, 250, 36, { cls: s.r === null ? 'ghost' : 'wait', title: 'Variable r (' + sim.T + ')', right: s.r === null ? '?' : s.r });
    P.box('ro', 274, 232, 390, 36, { cls: s.out === null ? 'ghost' : s.bad ? 'bad' : 'good', title: s.bad ? 'Error' : 'Output', right: s.out === null ? '?' : s.out });
    P.note(c.topic === 'str' ? 'When there are several + operators, they are evaluated one at a time from the left. Each time, the meaning of + is decided by whether both sides are numbers or one side is a string. If there are parentheses, the part in parentheses is evaluated first.' : 'The yellow box is the type of the current result, and the blue box is the type before the conversion. Going down (widening) happens automatically, and going up (narrowing) must be written explicitly, as in (int), and may lose information. char and float are left out of the diagram.');
  },
  assume: 'The results of the 18 pieces of code (the type of the right-hand expression, the type of the variable, and the output or exception) were checked against the result of running the same code on JDK 21 on this PC. That int r = 3.99 is a compile-time error, and the message it gives, were also confirmed by actually giving the code to the compiler of the same JDK (the message is the one from the English version). The behavior of 7 / 0.0, (double) sum / count, "Sum: " + 1 + 2, n % 2 == 1, Math.round, and Math.addExact, which are mentioned in the summary, was also confirmed by running them. Some things are not covered. Calculations with float, char, and short, the rule that lets an integer constant within the range be stored directly in a narrower type, as in byte b = 100, the error that arises with large numbers when a long is converted to a double, and the error in floating-point calculations such as 0.1 + 0.2 are not included. An expression made only of numbers, such as 7 / 2, is actually evaluated in advance by the compiler, but the result is the same.',
});
