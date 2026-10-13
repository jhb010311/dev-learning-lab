Lab.register({
  id: 'optional', nav: 'Optional', cat: 'Java language', mode: 'step',
  title: 'Why does the default-value code in orElse run even when a value is present?',
  intro: 'An Optional is a container that expresses that a value may or may not be present. Depending on how you create it (of, ofNullable, empty) and how you get the value out (get, orElse, orElseGet, map), a missing value leads either to an exception or to a default value being used. orElse and orElseGet look as if they give the same result, but they differ in when the code that creates the default value runs.',
  terms: ['Optional', 'orElse and orElseGet', 'NullPointerException', 'Lazy evaluation', 'Lambda expression'],
  controls: [
    { id: 'val', label: 'Value of name', type: 'select', value: 'kim', options: [['kim', '"kim" (a value is present)'], ['null', 'null (no value)']], show: function (c) { return c.make !== 'empty'; } },
    { id: 'make', label: 'How the Optional is created', type: 'select', value: 'nullable', options: [['of', 'Optional.of(name)'], ['nullable', 'Optional.ofNullable(name)'], ['empty', 'Optional.empty()']] },
    { id: 'take', label: 'How the value is taken out', type: 'select', value: 'orElse', options: [['get', 'get()'], ['orElse', 'orElse(makeDefault())'], ['orElseGet', 'orElseGet(() -> makeDefault())'], ['map', 'Chain map calls, then orElse("no name")']], hint: 'makeDefault() is a method that creates the default value "guest", and it prints one line when it runs.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when name is "kim", opt is created with Optional.ofNullable(name), and the value is taken out with orElse(makeDefault())?', d: 'makeDefault() runs even though a value is present.', v: { val: 'kim', make: 'nullable', take: 'orElse' } },
    { t: 'Switching to orElseGet', q: 'What if you take out the value with orElseGet(() -> makeDefault())?', d: 'When a value is present, makeDefault() does not run.', v: { val: 'kim', make: 'nullable', take: 'orElseGet' } },
    { t: 'Passing null to Optional.of', q: 'What if name is null and you create the Optional with Optional.of(name)?', d: 'A NullPointerException is thrown at the moment the Optional is created.', v: { val: 'null', make: 'of', take: 'orElse' } },
    { t: 'get() on an empty Optional', q: 'What if name is null and you take out the value with get()?', d: 'The result is not null but a NoSuchElementException.', v: { val: 'null', make: 'nullable', take: 'get' } },
    { t: 'orElseGet on an empty Optional', q: 'What if name is null and you take out the value with orElseGet(() -> makeDefault())?', d: 'Only in this case does makeDefault() run.', v: { val: 'null', make: 'nullable', take: 'orElseGet' } },
    { t: 'Chaining map (no value)', q: 'What if name is null and you chain map calls and then call orElse("no name")?', d: 'The code runs to the end without an exception, with no null check.', v: { val: 'null', make: 'nullable', take: 'map' } },
    { t: 'Chaining map (value present)', q: 'What if name is "kim" and you chain map calls and then call orElse("no name")?', d: 'The functions are applied to the value one after another.', v: { val: 'kim', make: 'nullable', take: 'map' } },
  ],
  code: function (c) {
    var useMd = c.take === 'orElse' || c.take === 'orElseGet';
    var md = useMd ? '    static String makeDefault() {                // method that creates the default value\n        System.out.println("makeDefault ran");\n        return "guest";\n    }\n\n' : '';
    var mk = c.make === 'empty' ? '        Optional<String> opt = Optional.empty();\n' : '        String name = ' + (c.val === 'kim' ? '"kim"' : 'null') + ';\n        Optional<String> opt = Optional.' + (c.make === 'of' ? 'of' : 'ofNullable') + '(name);\n';
    var tk = { get: '        String result = opt.get();\n', orElse: '        String result = opt.orElse(makeDefault());\n', orElseGet: '        String result = opt.orElseGet(() -> makeDefault());\n',
      map: '        String result = opt.map(s -> s.toUpperCase())\n                           .map(s -> "Dear " + s)\n                           .orElse("no name");\n' }[c.take];
    return 'import java.util.Optional;\n\npublic class Main {\n' + md + '    public static void main(String[] args) {\n' + mk + '        System.out.println(opt);\n\n' + tk + '        System.out.println(result);\n    }\n}';
  },
  label: function (c) {
    return (c.make === 'empty' ? 'Optional.empty()' : (c.make === 'of' ? 'of(' : 'ofNullable(') + (c.val === 'kim' ? '"kim"' : 'null') + ')') + ' · ' + { get: 'get()', orElse: 'orElse(makeDefault())', orElseGet: 'orElseGet(() -> makeDefault())', map: 'map twice, then orElse' }[c.take];
  },
  columns: ['State of opt', 'Value taken out', 'Did makeDefault() run?'],
  simulate: function (c) {
    var has = c.make !== 'empty' && c.val === 'kim', npe = c.make === 'of' && c.val === 'null', useMd = c.take === 'orElse' || c.take === 'orElseGet';
    var ev = [], sum = [], ex = '';
    // name: value of the variable · opt: '' | 'kim' | 'empty' | 'npe' · md: '' | 'wait' | 'run' | 'skip' · chain: values at the map steps
    var st = { name: '', opt: '', md: '', chain: [], res: '', ex: '', out: [] };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    if (c.make !== 'empty') {
      st.name = c.val === 'kim' ? '"kim"' : 'null';
      push('String name = ' + st.name + ': ' + (c.val === 'kim' ? 'name refers to the string "kim".' : 'name does not refer to any object (null).'));
    }
    if (npe) {
      st.opt = 'npe'; st.ex = ex = 'NullPointerException';
      push('Optional.of(name): of is the method to use when the value is certain to be present. When it receives null, it does not create an Optional and throws a NullPointerException on the spot.', 'bad');
      push('The exception stops the program. No Optional was created, so none of the lines below run.' + (useMd ? ' makeDefault() does not run either.' : ''), 'bad');
      sum.push('Wrapping a value in an Optional does not make null safe by itself. of does not accept null.');
      sum.push('Wrap a value that may be null with Optional.ofNullable.');
      return { events: ev, summary: sum, ex: ex, out: [], row: ['Exception: NullPointerException', '(not run)', useMd ? 'Did not run' : '(not used)'] };
    }
    st.opt = has ? 'kim' : 'empty';
    if (c.make === 'of') push('Optional.of(name): name is not null, so this creates an Optional that contains the value "kim".');
    else if (c.make === 'nullable') push('Optional.ofNullable(name): ' + (has ? 'name is not null, so this creates an Optional that contains the value "kim".' : 'name is null, so this creates an empty Optional. Unlike of, it does not throw an exception.'));
    else push('Optional.empty(): This returns an empty Optional, one that contains no value.');
    var optStr = has ? 'Optional[kim]' : 'Optional.empty';
    st.out.push(optStr);
    push('System.out.println(opt): This prints one line, ' + optStr + '. ' + (has ? 'The value it contains is inside the square brackets.' : 'This shows that there is no value.'));
    var res = '', mdRow = '(not used)';
    if (c.take === 'get') {
      if (has) { res = 'kim'; st.res = res; push('opt.get(): A value is present, so get takes out "kim" and returns it.', 'good'); }
      else {
        st.ex = ex = 'NoSuchElementException: No value present';
        push('opt.get(): The code tries to take a value out of an empty Optional. get does not return null. It throws a NoSuchElementException. The exception message is "No value present".', 'bad');
        push('The exception stops the program. The last output line does not run.', 'bad');
      }
    } else if (c.take === 'orElse') {
      st.md = 'run'; st.out.push('makeDefault ran'); mdRow = 'Ran';
      push('makeDefault(): Before orElse is called, the argument in the parentheses is evaluated first, because Java works out the values to pass before it calls a method. Whether or not opt has a value, makeDefault() runs, "makeDefault ran" is printed, and "guest" is created.', has ? 'bad' : '');
      res = has ? 'kim' : 'guest'; st.res = res;
      push('opt.orElse("guest"): ' + (has ? 'A value is present, so orElse returns "kim". The "guest" that was just created is not used and is discarded.' : 'The Optional is empty, so orElse returns the "guest" that it received as its argument.'), has ? '' : 'good');
    } else if (c.take === 'orElseGet') {
      st.md = 'wait';
      push('opt.orElseGet(() -> makeDefault()): The lambda expression in the parentheses is "code to run if it is needed". This line only passes the lambda expression, and makeDefault() has not run yet.');
      if (has) { st.md = 'skip'; mdRow = 'Did not run'; res = 'kim'; st.res = res; push('Inside orElseGet: A value is present, so orElseGet returns "kim". The lambda expression never runs, and makeDefault() is not called.', 'good'); }
      else { st.md = 'run'; mdRow = 'Ran'; st.out.push('makeDefault ran'); res = 'guest'; st.res = res; push('Inside orElseGet: The Optional is empty, so the lambda expression that was passed in runs. makeDefault() is called and prints "makeDefault ran", and the "guest" that it returns becomes the result.', 'good'); }
    } else {
      if (has) {
        st.chain.push('KIM');
        push('opt.map(s -> s.toUpperCase()): A value is present, so the function is applied to "kim", and map returns a new Optional that contains the result, "KIM".');
        st.chain.push('Dear KIM');
        push('.map(s -> "Dear " + s): The Optional from the previous step contains a value, so the function is applied again. The result is an Optional that contains "Dear KIM".');
        res = 'Dear KIM'; st.res = res;
        push('.orElse("no name"): A value is present, so orElse takes out "Dear KIM" and returns it.', 'good');
      } else {
        st.chain.push('');
        push('opt.map(s -> s.toUpperCase()): The Optional is empty, so map does not run the function and returns an empty Optional. toUpperCase() is never called on a value that does not exist.');
        st.chain.push('');
        push('.map(s -> "Dear " + s): The previous step is empty, so the function is skipped this time too, and an empty Optional is passed along.');
        res = 'no name'; st.res = res;
        push('.orElse("no name"): The Optional is empty all the way to the end, so orElse returns the default value "no name". The code does not contain a single null check, and yet it finished without an exception.', 'good');
      }
    }
    if (!ex) { st.out.push(res); push('System.out.println(result): This prints one line, ' + res + '.'); }
    if (c.take === 'get') {
      sum.push(has ? 'get() is safe only when a value is present.' : 'Calling get() on an Optional without checking is no different from using a value without checking for null. Only the name of the exception changes.');
      sum.push('If the value may be absent, use a method that also states "what to do when there is no value", such as orElse, orElseGet, or map.');
    } else if (c.take === 'orElse') {
      sum.push(has ? 'A value is present, so no default value is needed, and yet makeDefault() ran. What is inside the parentheses of orElse is an ordinary argument, so it is always evaluated before orElse is called.' : 'The Optional is empty, so the default value was used. In this case, both the result and the fact that makeDefault() runs are the same as with orElseGet.');
      sum.push('When the default value is a value that already exists, such as "none", orElse is enough. When creating the default value involves work such as a database query or creating an object, use orElseGet.');
    } else if (c.take === 'orElseGet') {
      sum.push(has ? 'orElseGet takes not a default value but "code that creates the default value" (a lambda expression). When a value is present, it does not run that code.' : 'The lambda expression runs only when the Optional is empty.');
    } else {
      sum.push(has ? 'When a value is present, map applies the function and returns the result in a new Optional. That is why you can chain several map calls.' : 'When the Optional is empty, map does not run the function and passes the empty Optional along. You do not have to write if (x != null) in between.');
      sum.push('You write what to do when there is no value in only one place, the orElse at the end.');
    }
    return { events: ev, summary: sum, ex: ex, out: st.out.slice(), row: [optStr, ex ? 'Exception: NoSuchElementException' : res, mdRow] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, useMd = c.take === 'orElse' || c.take === 'orElseGet';
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var ln = H.lanes(v);
    if (c.make !== 'empty') H.lane(ln, 'name', s.name || 'not declared yet', s.name ? 'wait' : 'none');
    H.lane(ln, 'opt', !s.opt ? 'not declared yet' : s.opt === 'npe' ? 'could not be created (NullPointerException)' : s.opt === 'kim' ? 'contains the value "kim"' : 'empty', !s.opt ? 'none' : s.opt === 'npe' ? 'bad' : s.opt === 'kim' ? 'good' : 'hot');
    if (useMd) H.lane(ln, 'makeDefault()', s.md === 'run' ? 'ran → "guest"' : s.md === 'skip' ? 'did not run' : s.md === 'wait' ? 'passed as a lambda expression (not run yet)' : 'not run yet', s.md === 'run' ? 'hot' : s.md === 'skip' ? 'good' : 'none');
    if (c.take === 'map') s.chain.forEach(function (x, i) { H.lane(ln, 'map (call ' + (i + 1) + ')', x ? 'function ran → "' + x + '"' : 'function skipped (empty)', x ? 'good' : 'wait'); });
    H.lane(ln, 'result', s.res ? '"' + s.res + '"' : s.ex ? 'no value because of the exception' : 'not declared yet', s.res ? 'good' : s.ex ? 'bad' : 'none');
  },
  // Diagram: from left to right, name → the Optional box → the value taken out. Below the Optional, it shows whether makeDefault(), which creates the default value, has run (or the two map steps).
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { name: '', opt: '', md: '', chain: [], res: '', ex: '', out: [] }, useMd = c.take === 'orElse' || c.take === 'orElseGet';
    P.size(680, 300);
    P.box('name', 16, 30, 170, 50, c.make === 'empty' ? { cls: 'ghost', title: 'name', sub: 'not used here' } : s.name ? { cls: s.name === 'null' ? 'plain' : 'wait', title: 'name', sub: s.name === 'null' ? 'null (no value)' : '"kim"' } : { cls: 'ghost', title: 'name', sub: 'not declared yet' });
    P.box('opt', 250, 24, 200, 62, !s.opt ? { cls: 'ghost', title: 'opt : Optional', sub: 'not declared yet' } : s.opt === 'npe' ? { cls: 'bad', title: 'opt : Optional', sub: ['could not be created', 'NullPointerException'] } : s.opt === 'kim' ? { cls: 'good', title: 'opt : Optional', sub: 'contains the value "kim"' } : { cls: 'hot', title: 'opt : Optional', sub: 'empty' });
    if (c.make !== 'empty' && s.opt) P.arrow('mk', 'name:r', 'opt:l', { cls: s.opt === 'npe' ? 'bad' : '', label: c.make === 'of' ? 'of' : 'ofNullable' });
    P.box('res', 500, 30, 164, 50, s.res ? { cls: 'good', title: 'result', sub: '"' + s.res + '"' } : s.ex ? { cls: 'bad', title: 'result', sub: 'no value (exception)' } : { cls: 'ghost', title: 'result', sub: 'not declared yet' });
    var fromDefault = s.res && s.opt === 'empty' && c.take !== 'get';
    if (s.res && !fromDefault) P.arrow('tk', 'opt:r', 'res:l', { cls: 'good', label: c.take === 'map' ? 'result' : 'value' });
    if (useMd) {
      P.box('md', 250, 130, 200, 56, { cls: s.md === 'run' ? 'hot now' : s.md === 'skip' ? 'ghost' : 'plain', title: 'makeDefault()', sub: s.md === 'run' ? 'ran → "guest"' : s.md === 'skip' ? 'did not run' : s.md === 'wait' ? 'lambda passed, not run' : 'not run yet' });
      if (fromDefault) P.arrow('df', 'md:r', 'res:b', { cls: 'hot', label: 'default value' });
    } else if (c.take === 'map') {
      ['s.toUpperCase()', '"Dear " + s'].forEach(function (f, i) {
        var done = s.chain.length > i, x = s.chain[i];
        P.box('m' + i, 140 + i * 210, 130, 196, 56, { cls: !done ? 'plain' : x ? 'good' : 'ghost', title: 'map: ' + f, sub: !done ? 'not run yet' : x ? 'ran → "' + x + '"' : 'skipped (empty)' });
      });
      if (s.chain.length) P.arrow('c0', 'opt:b', 'm0:t', {});
      if (s.chain.length > 1) P.arrow('c1', 'm0:r', 'm1:l', {});
      if (fromDefault) P.arrow('df', 'm1:r', 'res:b', { cls: 'hot', label: '"no name"' });
    } else P.box('md', 250, 130, 200, 56, { cls: 'ghost', title: 'get()', sub: 'no fallback if empty' });
    P.box('out', 16, 216, 648, 34, { cls: s.out.length ? 'plain' : 'ghost', title: 'Output', right: s.out.length ? s.out.join(' / ') : s.ex ? 'none' : 'none yet' });
    if (s.ex) P.text('ex', 16, 276, 'Exception: ' + s.ex, { cls: 'bad' });
    P.note(useMd ? 'orElse creates the default value in advance and passes it, and orElseGet passes the code that creates the default value. That is why they differ in whether makeDefault() runs when a value is present.' : c.take === 'map' ? 'map runs the function only when a value is present and skips it when the Optional is empty. The orElse at the end takes care of the case where there is no value.' : 'get() can be used only when a value is present. When the Optional is empty, it throws an exception.');
  },
  assume: 'For the 24 combinations (Optional.empty() does not use name, so there are 20 distinct cases), the printed lines and the exceptions were checked against the results of running the same code on JDK 21 on this PC. Whether makeDefault() ran was confirmed by whether the line that the method prints appears in the output. That map does not run the function when the Optional is empty is behavior stated in the documentation of Optional, and in execution it was confirmed by "no name" being printed without an exception. The exception message "No value present" is as of JDK 21. The NullPointerException from Optional.of(null) has no message.',
});
