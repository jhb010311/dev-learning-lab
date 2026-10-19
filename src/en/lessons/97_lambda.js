Lab.register({
  id: 'lambda', nav: 'Lambda expressions and functional interfaces', cat: 'Java language', mode: 'step',
  title: 'When does the code in a lambda expression run?',
  intro: 'A lambda expression is syntax that lets you store "an action to run later" in a variable like a value and pass it to another method. The code inside a lambda expression does not run on the line where you write it. It runs only when the method that receives it calls it.',
  terms: ['Lambda expression', 'Functional interface', 'Method reference', 'Differences between anonymous classes and lambda expressions'],
  controls: [
    { id: 'fi', label: 'Functional interface (the shape of the action)', type: 'select', value: 'function', options: [['function', 'Function<String, Integer>: takes a value and returns another value'], ['predicate', 'Predicate<String>: takes a value and returns true or false'], ['supplier', 'Supplier<String>: takes nothing and returns a value'], ['consumer', 'Consumer<String>: takes a value and returns nothing']] },
    { id: 'form', label: 'How the action is written', type: 'select', value: 'lambda', options: [['anon', 'Anonymous class'], ['lambda', 'Lambda expression'], ['ref', 'Method reference']], hint: 'All three create an object that does the same job (details such as what this refers to are different).' },
    { id: 'calls', label: 'How many times the receiving method (run) calls the action', type: 'select', value: '2', options: [['0', '0 times (receives it but never calls it)'], ['1', '1 time'], ['2', '2 times']] },
  ],
  presets: [
    { t: 'Default settings', q: 'When does the body run if a Function<String, Integer> lambda expression is passed to run and run calls the action 2 times?', d: 'Nothing happens on the line that creates the lambda expression, and the body runs each time run calls it.', v: { fi: 'function', form: 'lambda', calls: '2' } },
    { t: 'Receiving it without calling it', q: 'What if the receiving method (run) calls the action 0 times?', d: 'The lambda expression is created and passed, but the body never runs.', v: { fi: 'function', form: 'lambda', calls: '0' } },
    { t: 'Writing it as an anonymous class', q: 'What if you write the action as an anonymous class instead of a lambda expression?', d: 'The code gets longer, but the result is the same as with the lambda expression.', v: { fi: 'function', form: 'anon', calls: '2' } },
    { t: 'Writing it as a method reference', q: 'What if you write the action as a method reference instead of a lambda expression?', d: 'It refers to an existing method by name. The result is the same.', v: { fi: 'function', form: 'ref', calls: '2' } },
    { t: 'Passing a Supplier and calling get later', q: 'What if the functional interface is Supplier<String> and run calls the action 1 time?', d: 'The work of creating a value is put off and runs when the value is needed.', v: { fi: 'supplier', form: 'lambda', calls: '1' } },
    { t: 'Predicate', q: 'What if the functional interface is Predicate<String>?', d: 'It passes a condition check. true or false comes back.', v: { fi: 'predicate', form: 'lambda', calls: '2' } },
    { t: 'Consumer', q: 'What if the functional interface is Consumer<String>?', d: 'It takes a value, only uses it, and returns nothing.', v: { fi: 'consumer', form: 'lambda', calls: '2' } },
  ],
  // For each interface: the type, the variable name, the method that is called, the method that serves as the body, what it takes, what it returns, the values passed in the calls, the values that come back
  FI: {
    'function': { type: 'Function<String, Integer>', v: 'f', m: 'apply', body: 'length', sig: 'static int length(String s)', ret: '        return s.length();\n', takes: 'one value', gives: 'one value', args: ['hello', 'hi'], res: ['5', '2'], anon: 'public Integer apply(String s) {\n        return length(s);\n    }', lam: 's -> length(s)', what: 'takes a string and returns its length' },
    predicate: { type: 'Predicate<String>', v: 'p', m: 'test', body: 'isLong', sig: 'static boolean isLong(String s)', ret: '        return s.length() > 3;\n', takes: 'one value', gives: 'true or false', args: ['hello', 'hi'], res: ['true', 'false'], anon: 'public boolean test(String s) {\n        return isLong(s);\n    }', lam: 's -> isLong(s)', what: 'takes a string and checks whether it is longer than 3 characters' },
    supplier: { type: 'Supplier<String>', v: 's', m: 'get', body: 'make', sig: 'static String make()', ret: '        return "hello";\n', takes: 'nothing', gives: 'one value', args: [null, null], res: ['hello', 'hello'], anon: 'public String get() {\n        return make();\n    }', lam: '() -> make()', what: 'takes nothing, creates one string, and returns it' },
    consumer: { type: 'Consumer<String>', v: 'c', m: 'accept', body: 'show', sig: 'static void show(String s)', ret: '', takes: 'one value', gives: 'nothing (void)', args: ['hello', 'hi'], res: [null, null], anon: 'public void accept(String s) {\n        show(s);\n    }', lam: 's -> show(s)', what: 'takes a string, only uses it, and returns nothing' },
  },
  // The code of call #i, and the line that the body prints during that call
  callText: function (F, i) { return F.v + '.' + F.m + '(' + (F.args[i] === null ? '' : '"' + F.args[i] + '"') + ')'; },
  bodyLine: function (F, i) { return 'body runs: ' + F.body + '(' + (F.args[i] === null ? '' : F.args[i]) + ')'; },
  code: function (c) {
    var F = this.FI[c.fi], n = +c.calls, self = this, sup = c.fi === 'supplier';
    var body = F.sig + ' {' + '                    // what the action to pass does\n        System.out.println("body runs: ' + F.body + '(" + ' + (sup ? '' : 's + ') + '")");\n' + F.ret + '    }';
    if (sup) body = F.sig + ' {' + '                    // what the action to pass does\n        System.out.println("body runs: make()");\n' + F.ret + '    }';
    var calls = '';
    for (var i = 0; i < n; i++) calls += c.fi === 'consumer' ? '        ' + self.callText(F, i) + ';' + (i === 0 ? '                       // returns no value' : '') + '\n' : '        System.out.println("result " + ' + self.callText(F, i) + ');\n';
    if (!n) calls = '        // ' + F.v + ' is received but never called\n';
    var run = 'static void run(' + F.type + ' ' + F.v + ') {' + '      // the method that receives the action and calls it\n        System.out.println("run starts");\n' + calls + '        System.out.println("run ends");\n    }';
    var make = c.form === 'anon' ? 'new ' + F.type + '() {    // creates the action (it does not run yet)\n            @Override\n            ' + F.anon.replace(/\n/g, '\n        ') + '\n        };' : c.form === 'lambda' ? F.lam + ';        // creates the action (it does not run yet)' : 'Demo::' + F.body + ';         // creates the action (it does not run yet)';
    return 'class Demo {\n    ' + body + '\n\n    ' + run + '\n\n    public static void main(String[] args) {\n        ' + F.type + ' ' + F.v + ' = ' + make + '\n        System.out.println("after creation");\n        run(' + F.v + ');                                   // passes the action like a value\n    }\n}';
  },
  label: function (c) { return this.FI[c.fi].type.replace(/<.*/, '') + ' · ' + { anon: 'anonymous class', lambda: 'lambda expression', ref: 'method reference' }[c.form] + ' · ' + c.calls + (c.calls === '1' ? ' call' : ' calls'); },
  columns: ['Method called', 'Takes', 'Returns', 'Times the body ran', 'Values returned'],
  simulate: function (c) {
    var F = this.FI[c.fi], n = +c.calls, ev = [], sum = [], self = this, form = c.form;
    var st = { made: false, passed: false, cur: -1, done: 0, count: 0, out: [], end: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var decl = F.type + ' ' + F.v + ' = ';
    st.made = true;
    push(form === 'anon' ? decl + 'new ' + F.type + '() { ... }: This creates an object of a class with no name that implements the ' + F.type.replace(/<.*/, '') + ' interface and stores it in the variable ' + F.v + '. The code written inside ' + F.m + ' does not run yet. Nothing is printed.'
      : form === 'lambda' ? decl + F.lam + ': This creates an object that holds the action written to the right of the arrow token (->) and stores it in the variable ' + F.v + '. The ' + F.body + ' method is not called yet. Nothing is printed.'
      : decl + 'Demo::' + F.body + ': This creates an object that refers to the ' + F.body + ' method and stores it in the variable ' + F.v + '. The method is not called. The code only refers to it, as if to say "use this method". Nothing is printed.', '');
    st.out.push('after creation');
    push('System.out.println("after creation"): "after creation" is printed. Execution has already passed the line that creates the action, but "body runs" has not been printed even once.', '');
    st.passed = true;
    push('run(' + F.v + '): The action held in the variable ' + F.v + ' is passed to the run method. An action is passed in the same way as a number or a string. Passing it does not make it run.', '');
    st.out.push('run starts');
    push('System.out.println("run starts"): Execution enters run, and "run starts" is printed.', '');
    for (var i = 0; i < n; i++) {
      st.cur = i; st.done = i + 1; st.count = i + 1; st.out.push(this.bodyLine(F, i));
      var res = F.res[i];
      if (res !== null) st.out.push('result ' + res);
      push(this.callText(F, i) + ': ' + (i === 0 ? 'This is where the action finally runs. The ' : 'The same action runs one more time. The ') + F.body + ' method is called, and "' + this.bodyLine(F, i) + '" is printed. ' + (res === null ? 'accept returns no value, so there is nothing to receive.' : 'The returned value ' + res + ' is printed as "result ' + res + '".'), 'good');
    }
    st.cur = -1;
    if (!n) push('run contains no call to ' + F.v + '.' + F.m + '(...). It receives the action but moves on without running it.', 'bad');
    st.out.push('run ends'); st.end = true;
    push('System.out.println("run ends"): "run ends" is printed. "body runs" was printed ' + n + (n === 1 ? ' time' : ' times') + ' in all.', '');
    var got = F.res.slice(0, n).filter(function (x) { return x !== null; });
    sum.push(n ? 'Nothing ran on the line that creates the action. The body ran each time the ' + F.m + ' method was called inside run. The code inside a lambda expression runs when it is called, not when it is created.' : 'The action was created and passed, but the receiving method did not call it, so the body never ran. A lambda expression is only "code that can be run later". The receiving method decides whether to run it and how many times.');
    sum.push({ 'function': 'Function<T, R> is an action that takes one value of type T and returns a value of type R, and it is called with apply. It is used to turn a value into another value (conversion).', predicate: 'Predicate<T> is an action that takes one value of type T and returns true or false, and it is called with test. It is used for condition checks.', supplier: 'Supplier<T> is an action that takes nothing and returns a value of type T, and it is called with get. It lets you put off the work of creating a value and run it only when the value is really needed.', consumer: 'Consumer<T> is an action that takes one value of type T and returns nothing, and it is called with accept. It is used for work that takes a value and only uses it, such as printing or saving.' }[c.fi]);
    sum.push(form === 'anon' ? 'An anonymous class is how an action was passed before lambda expressions existed (up to Java 7). If you change the setting to a lambda expression, the same work fits on one line.' : form === 'lambda' ? 'The result is the same whether you write the action as an anonymous class, a lambda expression, or a method reference.' : 'When a lambda expression does nothing but call one existing method, you can write it more briefly as a method reference (ClassName::methodName). The result is the same as with the lambda expression.');
    return { events: ev, summary: sum, out: st.out.slice(), row: [F.m, F.takes, F.gives, n + (n === 1 ? ' time' : ' times'), !n ? '(not called)' : got.length ? got.join(', ') : '(no value returned)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, F = this.FI[c.fi];
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    H.table(v, ['Interface', 'Method called', 'Takes', 'Returns'], [{ cells: [F.type.replace(/<.*/, ''), F.m, F.takes, F.gives] }], 'Shape of this action');
    H.table(v, ['#', 'Line printed'], s.out.map(function (o, i) { return { cells: [String(i + 1), { v: o, cls: o.indexOf('body runs') === 0 ? 'hot' : '' }] }; }), 'Output so far');
  },
  // Diagram: on the left, where the action is created (the variable); in the middle, the run method, which receives the action and calls it; on the right, the method that serves as the body. An arrow goes to the body only during a call.
  draw: function (P, sim, shown) {
    var c = sim.c, F = this.FI[c.fi], n = +c.calls, self = this, last = shown[shown.length - 1];
    var s = last ? last.snap : { made: false, passed: false, cur: -1, done: 0, count: 0, out: [], end: false };
    P.size(680, 300);
    P.region('mk', 16, 16, 232, 200, 'Where the action is created (main)');
    P.box('obj', 28, 52, 208, 66, s.made ? { cls: 'wait', title: 'Variable ' + F.v, sub: [F.type, c.form === 'anon' ? 'new ' + F.type.replace(/<.*/, '') + '<>() { ... }' : c.form === 'lambda' ? F.lam : 'Demo::' + F.body] } : { cls: 'ghost', title: 'Variable ' + F.v, sub: 'none yet' });
    P.text('mkn', 28, 144, s.made ? 'only created, not run' : '', { cls: 'mut' });
    P.region('rn', 260, 16, 196, 200, 'run (receives and calls)');
    P.box('prm', 272, 50, 172, 34, { cls: s.passed ? 'wait' : 'ghost', title: 'Parameter ' + F.v, right: s.passed ? 'received' : '' });
    if (s.passed) P.arrow('pass', 'obj:r', 'prm:l', { label: 'pass' });
    for (var i = 0; i < n; i++) P.box('c' + i, 272, 96 + i * 56, 172, 48, { cls: i >= s.done ? 'ghost' : 'good' + (i === s.cur ? ' now' : ''), title: self.callText(F, i), sub: i >= s.done ? 'not called yet' : F.res[i] === null ? 'no value returned' : 'returned ' + F.res[i] });
    if (!n) P.text('nocall', 358, 140, 'no code calls it', { cls: s.end ? 'bad' : 'mut', anchor: 'middle' });
    P.region('bd', 468, 16, 196, 200, 'Body (the ' + F.body + ' method)');
    P.box('body', 480, 52, 172, 66, { cls: s.cur >= 0 ? 'hot now' : s.count ? 'plain' : 'ghost', title: F.body + '(' + (c.fi === 'supplier' ? '' : 's') + ')', sub: ['prints "body runs"', 'ran ' + s.count + (s.count === 1 ? ' time so far' : ' times so far')] });
    if (s.cur >= 0) P.arrow('call', 'c' + s.cur + ':r', 'body:l', { cls: 'hot', label: 'runs' });
    P.box('r1', 16, 236, 648, 38, { cls: s.count ? 'good' : s.end ? 'bad' : 'ghost', title: 'The body ran', right: s.count + (s.count === 1 ? ' time' : ' times') });
    P.note('No arrow goes to the body on the line that creates the action. The body runs only at the moment the ' + F.m + ' method is called inside run. The body is a separate method here so that the three ways of writing the action can be compared under the same conditions. If you write the code directly inside the lambda expression, it runs at the same point.');
  },
  assume: 'The output order, the number of times the body ran, and the returned values of the 36 combinations were checked against the result of running code with the same structure on JDK 21 in our test environment. The name of the method that each interface calls, the number of values it takes, and the type it returns were also checked against values read from the real interfaces. Saying that an anonymous class, a lambda expression, and a method reference are the same means that the results seen in this lab (the output and the returned values) are the same. How the object is created internally and what this refers to differ among them. When a lambda expression uses a local variable of the enclosing scope, it can use only a variable whose value does not change, and this rule is explained in the "Inner classes and anonymous classes" lab.',
});
