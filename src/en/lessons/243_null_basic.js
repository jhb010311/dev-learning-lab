Lab.register({
  id: 'null_basic', nav: 'null', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['optional'],
  title: 'What is null, and why does NullPointerException happen?',
  intro: 'The variable name does not hold an object such as a string itself. It holds a value that refers to that object (a reference). null is a special value that you store in this place to say "refers to no object," and in code you write it like String name = null;. In name.length(), the dot (.) means "ask the object that name refers to," but if name is null there is no object to ask, so an exception called NullPointerException is thrown. if (name != null) is a check that first asks whether name refers to an object. The empty string "", which has no characters at all, is not null. It is a string object with 0 characters. In this lab you change the value stored in name to "kim", null, or "", and you add or remove the if check. The same code is compiled and run, and you see what is printed and whether an exception is thrown.',
  terms: ['null', 'NullPointerException', 'Checking for null', 'Empty string'],
  controls: [
    { id: 'value', label: 'Value stored in name', type: 'select', value: 'kim', options: [['kim', 'String "kim"'], ['null', 'null (refers to no object)'], ['empty', 'Empty string ""']] },
    { id: 'check', label: 'Wrap the length() call in if (name != null)', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'If the variable name refers to the string "kim", what does the name.length() line do?', d: 'The "kim" object that name refers to returns its number of characters, 3.', v: { value: 'kim', check: false } },
    { t: 'Storing null', q: 'What if you store null in name instead of "kim"?', d: 'name refers to no object, so name.length() throws a NullPointerException.', v: { value: 'null', check: false } },
    { t: 'Checking when it is null', q: 'What if name is null and you check with if (name != null) before name.length()?', d: 'The check filters it out, so length() is not called and no exception is thrown.', v: { value: 'null', check: true } },
    { t: 'Checking when it is "kim"', q: 'What if name refers to "kim" and you check with if (name != null)?', d: 'It passes the check, length() runs, and the result is the same.', v: { value: 'kim', check: true } },
    { t: 'Referring to an empty string', q: 'What if name refers to the empty string "" instead of null?', d: 'The empty string is also an object, so length() returns 0 and no exception is thrown.', v: { value: 'empty', check: false } },
    { t: 'Checking an empty string', q: 'What if name refers to the empty string "" and you check with if (name != null)?', d: 'The empty string is not null, so it passes the check.', v: { value: 'empty', check: true } },
  ],
  // Text used on the screen: the text of the stored value, and the description of what name refers to
  vtxt: { kim: '"kim"', null: 'null', empty: '""' },
  pointTxt: { kim: 'The "kim" String object', null: 'Refers to no object (null)', empty: 'A String object with 0 characters ("")' },
  // The line where the exception is thrown (the line the stack trace of the real run pointed to)
  excLine: 'System.out.println(name.length());',
  code: function (c) {
    var o = ['public class Main {', '    public static void main(String[] args) {', '        // Variable: refers to a string object, or to nothing if it is null', '        String name = ' + this.vtxt[c.value] + ';'];
    if (c.check) o.push('        // Check: call length() only when name is not null', '        if (name != null) {', '            System.out.println(name.length());', '        } else {', '            System.out.println("No name");', '        }');
    else o.push('        System.out.println(name.length());');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return 'name = ' + this.vtxt[c.value] + ' · ' + (c.check ? 'with the if (name != null) check' : 'no check'); },
  columns: ['What name refers to', 'if check', 'Times length() ran', 'Output', 'Exception'],
  simulate: function (c) {
    var ev = [], sum = [], isNull = c.value === 'null', v = this.vtxt[c.value], len = c.value === 'kim' ? 3 : 0;
    var st = { val: '', hot: '', phase: '', ifres: '', out: [], exc: '', count: 0, got: '', ended: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. Store a value in the variable
    st.val = c.value; st.hot = 'nm'; st.phase = 'init';
    if (c.value === 'kim') push('The line String name = "kim"; runs. name is a variable, and a variable holds not the object itself but a value that refers to the object (a reference). Here name comes to refer to a String object that holds the characters "kim". That object is the box on the right.', '');
    else if (isNull) push('The line String name = null; runs. name is a variable, and a variable holds a value that refers to an object. The null stored here is a value that means "refers to no object." The name variable has been created and holds null, but there is no String object for it to refer to. The program runs without a problem up to this line.', '');
    else push('The line String name = ""; runs. "" is a string with no characters at all. It has no characters, but it is still a String object, so name comes to refer to this object. The object is in the box on the right, and it has 0 characters.', '');

    // 2. The if check
    var goCall = true;
    if (c.check) {
      st.hot = 'ck'; st.phase = 'if'; st.ifres = isNull ? 'false' : 'true';
      if (isNull) { goCall = false; push('At the line if (name != null), the condition is evaluated. name != null asks "is name not null?", that is, "does name refer to some object?" name is null and refers to no object, so the value of the condition is false, and the else block runs. The name.length() line in the first block does not run.', 'good'); }
      else push('At the line if (name != null), the condition is evaluated. name != null asks "is name not null?", that is, "does name refer to some object?" ' + (c.value === 'kim' ? 'name refers to the "kim" object, so ' : 'The "" that name refers to is an object even though it has no characters, so it is not null, and ') + 'the value of the condition is true, and the first block runs.', '');
    }

    // 3. The call, or else
    if (!goCall) {
      st.hot = 'ck'; st.phase = 'else'; st.out.push('No name');
      push('The line System.out.println("No name"); in the else block runs and prints No name. name is still null, but name.length() was not called, so no exception was thrown.', 'good');
    } else if (isNull) {
      st.hot = 'nm'; st.phase = 'fail'; st.exc = 'NullPointerException';
      push('At the line System.out.println(name.length());, name.length() is evaluated first. The dot (.) means "ask the object that name refers to," and length() is a request to count the characters. But name refers to no object, so there is nothing to receive the request. At this point Java throws an exception called NullPointerException, and length() could not run.', 'bad');
      st.ended = true;
      push('Nothing handles this exception, so main stops here and the program ends with an error (exit code 1). System.out.println did not receive a value, so nothing was printed to the screen.', 'bad');
    } else {
      st.hot = 'nm'; st.phase = 'call'; st.count = 1;
      push((c.check ? 'In the first block, at' : 'At') + ' the line System.out.println(name.length());, name.length() is evaluated first. The dot (.) means "ask the object that name refers to," and length() is a request to count the characters. ' + (c.value === 'kim' ? 'The "kim" object counts its characters and' : 'The request is passed to the "" object, and because it has no characters, it') + ' returns ' + len + '.' + (c.value === 'empty' ? ' 0 is a normal result, not an exception. The request could be received because the object exists.' : ''), 'good');
      st.phase = 'ret'; st.got = String(len);
      push('The returned ' + len + ' is passed to println.', '');
      st.phase = ''; st.out.push(String(len)); st.hot = '';
      push('System.out.println prints ' + len + '.', 'good');
    }
    st.hot = ''; st.phase = ''; st.ended = true;
    if (!st.exc) push('The last line of main runs and the program ends. No exception was thrown.', '');

    // Summary: the first line is the answer to this setting (the question)
    if (c.value === 'kim' && !c.check) {
      sum.push('The name variable refers to the "kim" String object, so name.length() asks that object for its number of characters and gets 3. The variable holds not the object itself but a value that refers to the object, and the dot (.) is the mark that asks that object to do the work.');
      sum.push('This code works because there is an object that name refers to. The next questions look at when there is no such object, and when the object exists but has no characters.');
    } else if (isNull && !c.check) {
      sum.push('When name holds null, there is no object to refer to, so name.length() threw a NullPointerException. The line asks an object to do the work, but there was no object to ask. Nothing handled the exception, so the program ended there and printed nothing.');
      sum.push('The exception was not thrown at the line that stored null. It was thrown at the name.length() line, which puts a dot after a variable that is null. The line String name = null; ran without a problem.');
    } else if (isNull) {
      sum.push('When you first check the null name with if (name != null), the condition is false, so name.length() is not called and the program goes to the else block, and no exception is thrown. It printed No name.');
      sum.push('The check did not remove the null. name is still null, and the check made the line with the dot get skipped when it is null.');
    } else if (c.value === 'kim') {
      sum.push('When name refers to the "kim" object, name != null is true, so the program enters the if block, length() runs, and 3 is printed. Even with the check added, the result when there is a value is the same as without the check.');
      sum.push('The check sends the program a different way only when name is null. When there is an object, it changes nothing.');
    } else if (!c.check) {
      sum.push('The empty string "" is not null. It is a String object with 0 characters. Because there is an object, name.length() returns 0 without an exception.');
      sum.push('null means there is no object, and "" means there is an object that just has no characters. The output 0 and a NullPointerException are completely different results.');
    } else {
      sum.push('The empty string "" is not null, so name != null is true, it passes the check, and length() runs. It printed 0, not No name.');
      sum.push('name != null asks only whether an object exists, not whether it has characters. To filter out the empty string too, you need a separate check.');
    }
    var ifTxt = !c.check ? 'Not used' : isNull ? 'null (false)' : 'Not null (true)';
    return { events: ev, summary: sum, pt: this.pointTxt, excAt: isNull && !c.check ? this.excLine : '', row: [this.pointTxt[c.value], ifTxt, st.count + '', st.out.length ? st.out.join(' / ') : '(no output)', st.exc ? 'NullPointerException' : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to start from the line that stores a value in the name variable.'); return; }
    var rows = [
      ['What name refers to', s.val ? { v: sim.pt[s.val], cls: s.val === 'null' ? 'hot' : 'good' } : 'Not assigned yet'],
      ['if (name != null)', !c.check ? { v: 'Not used', cls: '' } : s.ifres ? { v: s.ifres === 'true' ? 'true (refers to an object)' : 'false (null)', cls: s.ifres === 'true' ? 'good' : 'hot' } : 'Not run yet'],
      ['Output', s.out.length ? s.out.join(' / ') : s.ended ? '(no output)' : 'None yet'],
      ['Exception', s.exc ? { v: s.exc, cls: 'bad' } : s.ended ? { v: 'None', cls: 'good' } : 'None yet'],
    ];
    H.table(v, ['What happened', 'Result'], rows.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Run result');
    H.counters(v, [[s.count, 'Times length() ran'], [s.exc ? 1 : 0, 'Exceptions thrown']]);
  },
  // Diagram: on the left the name variable, on the right the string object. If name refers to the object, an arrow connects them, and when name.length() reaches the object a value comes back. If it is null, there is no arrow that refers to anything, and the length() arrow has nowhere to arrive and breaks off. Below are boxes for the if check, the output, the exception, and the number of times length() ran.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 330);
    var val = s ? s.val : '', ph = s ? s.phase : '', hot = s ? s.hot : '', isNull = val === 'null';
    var nmSub = !val ? 'Not assigned yet' : isNull ? ['null', 'Refers to no object'] : [val === 'kim' ? 'Refers to the "kim" object' : 'Refers to the "" object'];
    P.box('nm', 14, 16, 250, 118, { cls: ph === 'fail' ? 'bad' : hot === 'nm' ? 'hot now' : 'plain', title: 'name (variable)', sub: nmSub });
    var obSub = !val ? 'None yet' : isNull ? (ph === 'fail' ? 'No object to ask' : 'name refers to no object') : val === 'kim' ? ['"kim"', '3 characters'] : ['""', '0 characters'];
    P.box('ob', 416, 16, 250, 118, { cls: !val || isNull ? 'ghost' : ph === 'call' ? 'hot now' : 'plain', title: 'String object', sub: obSub });
    if (val && !isNull) P.arrow('ref', 'nm:r:0.8', 'ob:l:0.8', { cls: 'mut', label: 'refers to' });
    if (ph === 'call') P.arrow('call', 'nm:r:0.2', 'ob:l:0.2', { cls: 'hot', label: 'length()' });
    if (ph === 'fail') { P.arrow('call', 'nm:r:0.2', [404, 40], { cls: 'bad', label: 'length()' }); P.text('callx', 396, 45, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    if (ph === 'ret') P.arrow('ret', 'ob:l:0.5', 'nm:r:0.5', { cls: 'good', label: s.got });
    P.box('ck', 14, 150, 652, 36, { cls: !c.check ? 'ghost' : ph === 'if' || ph === 'else' ? 'hot now' : s && s.ifres ? 'plain' : 'ghost', title: 'if (name != null) check', right: !c.check ? 'Not used' : s && s.ifres ? (s.ifres === 'true' ? 'true: refers to an object' : 'false: null') : '' });
    P.box('o1', 14, 194, 652, 36, { cls: s && s.out.length ? 'good' : 'ghost', title: 'Output', right: s && s.out.length ? s.out.join(' / ') : s && s.ended ? '(no output)' : '' });
    P.box('o2', 14, 238, 652, 36, { cls: s && s.exc ? 'bad' : s && s.ended ? 'good' : 'ghost', title: 'Exception', right: s && s.exc ? s.exc : s && s.ended ? 'None' : '' });
    P.box('o3', 14, 282, 652, 36, { cls: s && s.count ? 'wait' : s && s.exc ? 'bad' : 'ghost', title: 'Times length() ran', right: (s ? s.count : 0) + '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21, java 21). All 6 combinations were checked against real runs: the same source as the code on the screen (identical line by line) was compiled with javax.tools, and the compiled Main was run in a new java process, and the standard output, the first line of the standard error, and the exit code were captured. What was checked is whether compilation succeeded, the output, whether an exception was thrown (whether the first line of the standard error is NullPointerException) and the line where it was thrown (the line the stack trace pointed to is the name.length() line), and the exit code. The "length() runs" column of the table was worked out from the real output by whether a character count appeared in it, and the "if check" column by which block\'s output appeared. The facts that the step sentences rely on were checked with a separate program. For each of the three values: name == null is false for "kim", true for null, and false for ""; length() is 3, (cannot be called because it is null), and 0; and the line String name = null; runs without an exception, the exception is thrown at the next line, name.length(), and the program ends with exit code 1. I opened the documentation myself. That the null type has only one value, the null reference, and that it can be stored in any reference type follows sections 3.10.8 and 4.1 of the Java Language Specification (Java SE 21); that a reference value either refers to an object or is the null reference that refers to no object follows section 4.3.1; the rules for comparing references with == and != follow section 15.21.3; that an if statement runs the first statement when the condition is true and the else statement when it is false follows sections 14.9.1 and 14.9.2; and that a string literal is, at run time, a value that refers to a String object, and that "" is the empty string, follows section 3.10.5. The NullPointerException API documentation says that it is thrown when an instance method of a null object is called (Java SE 21 API), and I also opened the descriptions of String.length() and isEmpty() in the same API documentation. The sentence that a NullPointerException is thrown when the target of an instance method call is null I confirmed in chapter 15 (section 15.6) of the JLS, but I could not open the text of sections 15.12.4.1 and 15.12.4.4, which specify the call handling in detail. In our test run, javac was used with its default options (no -g), so variable names were not put in the class file, and the detail message of the NullPointerException showed <local1> instead of name. This message is not specified by the specification but was observed on this JDK, so it is not used on the screen. The code on the screen is exactly the shape that really compiles, and nothing was shortened. Beyond that, primitive variables such as int and null, arrays or fields that are null at first, comparing two strings with == and equals, and how to handle a value that may be null with Optional are not covered. Optional is covered in the in-depth lab "Optional".',
});
