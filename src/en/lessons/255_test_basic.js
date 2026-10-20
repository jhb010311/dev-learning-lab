Lab.register({
  id: 'test_basic', nav: 'Test code', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['testing', 'cicd'],
  title: 'What is test code, and who decides whether a test passes or fails?',
  why: 'To see whether code works correctly after changing it, you have to start the program, enter values by hand, and check the result by eye, and it is hard to repeat the same check every time you make a change. Test code leaves that check as code, so that a tool such as JUnit reruns many checks at once and reports where something does not match.',
  use: 'When a Spring Boot project is newly created, the src/test/java folder and JUnit are ready from the start, and tests are run with the ./gradlew test command or the run button in the IDE. It is used to check that earlier features have not broken after a code change, or to set tests to run automatically every time code is pushed, so that failing code is blocked from being merged.',
  intro: 'Test code is code that writes down "if you give this method this input, it must give this output." The CalcTest class, written for this lab as an example, is one. Its adds() method calls add(2, 3) of the Calc class, which is also an example written for this lab, and assertEquals(5, ...) compares the value that add returned with the expected value, 5. If the two values differ, an error occurs on that line. The @Test above adds() is a marker that says "this method is a test." It is not we who run this code, but JUnit, a testing tool. JUnit finds the methods that have @Test and calls them. If a method ends without an error, JUnit counts it as passed. If it ends with the error that assertEquals threw, JUnit counts it as failed. In this lab you break add, write the expected value wrongly, or remove @Test, and run the same code with real JUnit each time, and you see how the number of tests found, the verdict of pass or fail, and the failure message change. (The code on the screen leaves out the import lines.)',
  terms: ['Test code', 'JUnit', '@Test', 'assertEquals'],
  controls: [
    { id: 'impl', label: 'Expression that the add method returns', type: 'select', value: 'plus', options: [['plus', 'return a + b;  (adds)'], ['minus', 'return a - b;  (subtracts by mistake)']] },
    { id: 'expect', label: 'Expected value written in assertEquals', type: 'select', value: 'five', options: [['five', '5'], ['six', '6  (written by mistake)']] },
    { id: 'anno', label: 'Write @Test above adds()', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does test code look like, and what does it mean that a test passes?', d: 'adds(), which has @Test, compares the result of add(2, 3) with the expected value 5. They are equal, so the test passes.', v: { impl: 'plus', expect: 'five', anno: true } },
    { t: 'If you break add into a - b', q: 'What if you break add into return a - b; by mistake?', d: 'The result of add(2, 3) becomes -1, which differs from the expected value 5, and JUnit counts the test as failed.', v: { impl: 'minus', expect: 'five', anno: true } },
    { t: 'If you write 6 as the expected value', q: 'What if add is correct but you write 6 as the expected value in assertEquals by mistake?', d: 'Even though the code is correct, it differs from the expectation that was written down, so the test fails.', v: { impl: 'plus', expect: 'six', anno: true } },
    { t: 'If you remove @Test', q: 'What if you remove the @Test above adds()?', d: 'JUnit does not count adds() as a test, so it never runs it.', v: { impl: 'plus', expect: 'five', anno: false } },
    { t: 'If you change it to a - b and also remove @Test', q: 'What if you break add into return a - b; by mistake and also remove @Test?', d: 'Even though the code is wrong, the test is not run, so you get no notice at all.', v: { impl: 'minus', expect: 'five', anno: false } },
    { t: 'If it is a - b and the expected value is also 6', q: 'What if you change add to return a - b; and also write 6 as the expected value?', d: 'Even though both are wrong, JUnit only tells you that the two values differ.', v: { impl: 'minus', expect: 'six', anno: true } },
  ],
  code: function (c) {
    var o = ['// Code under test', 'class Calc {', '    int add(int a, int b) {', '        return ' + (c.impl === 'plus' ? 'a + b' : 'a - b') + ';', '    }', '}', '', '// Test code: code that checks whether Calc works correctly', 'class CalcTest {'];
    if (c.anno) o.push('    // Marker: JUnit finds the methods that have @Test and runs them as tests', '    @Test');
    o.push('    void adds() {', '        // Verdict: if the first value (expected) and the second value (actual) differ, the test fails', '        assertEquals(' + (c.expect === 'five' ? '5' : '6') + ', new Calc().add(2, 3));', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.impl === 'plus' ? 'a + b' : 'a - b') + ' · expected value ' + (c.expect === 'five' ? '5' : '6') + ' · ' + (c.anno ? 'with @Test' : 'without @Test'); },
  columns: ['Tests run', 'Result', 'Failure message'],
  simulate: function (c) {
    var ev = [], sum = [], plus = c.impl === 'plus', A = plus ? 5 : -1, E = c.expect === 'five' ? 5 : 6, eq = A === E;
    var expr = plus ? 'a + b' : 'a - b', calc = plus ? '2 + 3' : '2 - 3', msg = 'expected: <' + E + '> but was: <' + A + '>';
    var wrong = !plus || E !== 5;
    var st = { hot: '', phase: '', found: 0, passed: 0, failed: 0, ran: false, actual: '', verdict: '', msg: '', started: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    st.hot = 'ju'; st.started = true;
    push('JUnit, a testing tool, runs the CalcTest class. JUnit is a program that finds tests, calls them, and judges whether each one passed or failed. The code we wrote has no main method and no line that calls the adds() method. It is JUnit that moves the code.', '');
    st.phase = 'find';
    if (c.anno) {
      st.found = 1;
      push('JUnit looks at the methods of the CalcTest class and finds the ones that have @Test. adds() has @Test, so JUnit counts this method as a test. The number of tests found is 1.', '');
      st.hot = 'ts'; st.phase = 'call'; st.ran = true;
      push('JUnit calls the adds() method. We did not write this line either. It is not our code but JUnit that calls the test method.', '');
      st.hot = 'ca'; st.phase = 'add';
      push('new Calc().add(2, 3) inside adds() runs. It creates a Calc object and passes 2 and 3 to add, and the line return ' + expr + '; calculates the result (' + calc + ').', '');
      st.actual = String(A); st.phase = 'back'; st.hot = 'ts';
      push('The result that add calculated is ' + A + '. add returns this value to adds(), and it is the actual value.', '');
      st.phase = 'cmp';
      if (eq) {
        push('assertEquals(' + E + ', ...) compares the two values. The expected value is ' + E + ' and the actual value is ' + A + '. The two values are equal, so assertEquals finishes without anything happening, and adds() also goes through to the end without an error.', 'good');
        st.hot = 'ju'; st.phase = 'judge'; st.passed = 1; st.verdict = 'pass';
        push('JUnit sees that adds() ended without an error and counts it as passed. It was JUnit that judged the pass, not a person reading the output with their eyes.', 'good');
      } else {
        push('assertEquals(' + E + ', ...) compares the two values. The expected value is ' + E + ' and the actual value is ' + A + '. The two values differ, so assertEquals throws an error called AssertionFailedError, and adds() ends with an error on this line.', 'bad');
        st.hot = 'ju'; st.phase = 'judge'; st.failed = 1; st.verdict = 'fail'; st.msg = msg;
        push('JUnit sees that adds() ended with an error, counts it as failed, and records the message of the error, "' + msg + '". It was JUnit that judged the failure, not a person reading the output.', 'bad');
      }
      st.phase = 'end'; st.verdict = eq ? 'pass' : 'fail';
      push('JUnit finishes. Tests found: 1, passed: ' + st.passed + ', failed: ' + st.failed + '.', eq ? 'good' : 'bad');
    } else {
      push('JUnit looks at the methods of the CalcTest class and finds the ones that have @Test. There is a method called adds(), but it does not have @Test, so JUnit does not count this method as a test. The number of tests found is 0.', '');
      st.hot = 'ts'; st.phase = 'skip';
      push('JUnit does not call adds(), which it did not count as a test. Our code has no line that calls it either, so adds() is never run, and neither is add of Calc.', 'bad');
      st.hot = 'ju'; st.phase = 'end'; st.verdict = 'none';
      push('JUnit finishes. Tests found: 0, passed: 0, failed: 0.' + (wrong ? ' This code has a mistake, but nothing was run, so JUnit tells you nothing.' : ' Having 0 failures does not mean that anything was checked. It is because nothing was run.'), 'bad');
    }

    // Summary: the first line is the answer to this setting (the question)
    if (c.anno && eq) {
      sum.push('Test code is code made of the method adds(), which calls Calc, and a line that compares the result with assertEquals(expected value, actual value). What differs from ordinary code is the @Test above the method (the marker that JUnit looks for) and assertEquals (the line on which JUnit judges). The two values were equal, so adds() ended without an error, and JUnit counted it as passed.');
      sum.push('We did not write the line that calls adds(). Finding the test, calling it, and judging whether it passed is done by JUnit. Passed means "ended without an error."');
    } else if (c.anno && plus) {
      sum.push('add is written correctly, but if you write 6 as the expected value in assertEquals by mistake, the two values differ even though add(2, 3) returns 5, and the test fails. The failure message is "' + msg + '".');
      sum.push('JUnit only knows that the two values differ. It does not know whether add or the expectation that was written down is wrong. A person who reads the failure message decides that.');
    } else if (c.anno && E === 5) {
      sum.push('If you break add into return a - b; the value it returns becomes ' + A + ', which differs from the expected value 5, assertEquals throws an error, and JUnit counts the test as failed. The failure message is "' + msg + '".');
      sum.push('JUnit told us that add had been broken, without a person reading the output. If you run the tests every time you change the code, you can tell right away when you have broken something.');
    } else if (c.anno) {
      sum.push('Even if add is wrong and the expected value is written wrongly too, the result is a failure. The actual value is ' + A + ' and the expected value that was written down is 6, so the message "' + msg + '" was left.');
      sum.push('JUnit only compares the two values. It does not tell you which of the two is wrong. A person has to find the cause by looking at the two values in the failure message.');
    } else {
      sum.push('If you remove @Test, JUnit does not count adds() as a test, so the number of tests found is 0, and adds() and add were never run. The number of failures was 0 too.' + (wrong ? ' Even though there is a mistake, there was no notice at all.' : ''));
      sum.push('A method without @Test is quietly not run, with no error. If you wrote a test but the number of tests run is 0, first check whether @Test is there.');
    }
    var row = c.anno ? ['1 (adds)', eq ? 'Passed' : 'Failed', eq ? 'None' : msg] : ['0', 'No test to judge (neither passed nor failed)', 'None'];
    return { events: ev, summary: sum, A: A, E: E, msg: msg, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from JUnit finding the tests.'); return; }
    var rows = [{ cls: '', cells: ['Tests found', s.phase === 'find' || s.found || s.phase === 'skip' || s.phase === 'end' ? s.found + '' : 'Not looked for yet'] }];
    if (s.ran) rows.push({ cls: '', cells: ['adds() runs', '1'] });
    else if (s.phase === 'skip' || s.verdict === 'none') rows.push({ cls: '', cells: ['adds() runs', { v: '0', cls: 'bad' }] });
    if (s.actual) rows.push({ cls: '', cells: ['Value that add(2, 3) returned', s.actual] });
    if (s.verdict === 'pass') rows.push({ cls: '', cells: ['JUnit verdict', { v: 'Passed', cls: 'good' }] });
    else if (s.verdict === 'fail') rows.push({ cls: '', cells: ['JUnit verdict', { v: 'Failed', cls: 'bad' }] }, { cls: '', cells: ['Failure message', { v: s.msg, cls: 'bad' }] });
    else if (s.verdict === 'none') rows.push({ cls: '', cells: ['JUnit verdict', { v: 'No test to judge', cls: 'bad' }] });
    H.table(v, ['What happened', 'Result'], rows, 'JUnit run');
    H.counters(v, [[s.found, 'Tests found'], [s.passed, 'Passed'], [s.failed, 'Failed']]);
  },
  // Diagram: JUnit on the left, the test method adds() in the middle, the Calc.add under test on the right. The arrow where JUnit calls adds() and adds() calls add does not appear if there is no @Test. Below them, a box for JUnit's verdict and boxes that count tests found, passed, and failed.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '', ph = s ? s.phase : '';
    P.size(680, 268);
    var juSub = !s ? 'Before the run' : ph === 'find' ? 'Looking for @Test' : s.verdict === 'pass' ? 'Judged as passed' : s.verdict === 'fail' ? 'Judged as failed' : s.verdict === 'none' ? 'No test to call' : ph === 'call' ? 'Calling adds()' : 'Running';
    P.box('ju', 14, 16, 180, 118, { cls: s && s.verdict === 'fail' ? 'bad' : s && s.verdict === 'pass' ? 'good' : hot === 'ju' ? 'hot now' : 'plain', title: 'JUnit', sub: juSub });
    var tsSub = !s ? (c.anno ? 'Has @Test' : 'No @Test') : [c.anno ? 'Has @Test' : 'No @Test', s.ran ? 'Run by JUnit' : ph === 'skip' || s.verdict === 'none' ? 'Not called' : 'Not called yet'];
    P.box('ts', 250, 16, 180, 118, { cls: !c.anno && s && (ph === 'skip' || s.verdict === 'none') ? 'bad' : hot === 'ts' ? 'hot now' : c.anno ? 'plain' : 'ghost', title: 'CalcTest.adds()', sub: tsSub });
    var caSub = !s || !s.actual && ph !== 'add' ? (c.impl === 'plus' ? 'return a + b;' : 'return a - b;') : [c.impl === 'plus' ? 'return a + b;' : 'return a - b;', s.actual ? 'Returned ' + s.actual : 'Calculating'];
    P.box('ca', 486, 16, 180, 118, { cls: hot === 'ca' ? 'hot now' : s && s.ran ? 'plain' : 'ghost', title: 'Calc.add', sub: caSub });
    if (s && ph === 'call') P.arrow('c1', 'ju:r:0.3', 'ts:l:0.3', { cls: 'hot' });
    if (s && (ph === 'add')) P.arrow('c2', 'ts:r:0.3', 'ca:l:0.3', { cls: 'hot' });
    if (s && ph === 'back') P.arrow('c3', 'ca:l:0.7', 'ts:r:0.7', { cls: 'good' });
    if (s && ph === 'cmp') P.arrow('c4', 'ts:l:0.7', 'ju:r:0.7', { cls: s.failed || sim.A !== sim.E ? 'bad' : 'good' });
    if (s && ph === 'skip') P.arrow('c5', 'ju:r:0.3', 'ts:l:0.3', { cls: 'bad' });
    var jr = !s || !s.verdict ? '' : s.verdict === 'pass' ? 'Passed' : s.verdict === 'fail' ? 'Failed' : 'No test to judge';
    P.box('jd', 14, 150, 652, 52, { cls: s && s.verdict === 'pass' ? 'good' : s && (s.verdict === 'fail' || s.verdict === 'none') ? 'bad' : 'ghost', title: 'JUnit verdict', right: jr, sub: s && s.msg ? s.msg : '' });
    P.box('n1', 14, 218, 208, 36, { cls: s && s.found ? 'wait' : 'ghost', title: 'Tests found', right: (s ? s.found : 0) + '' });
    P.box('n2', 236, 218, 208, 36, { cls: s && s.passed ? 'good' : 'ghost', title: 'Passed', right: (s ? s.passed : 0) + '' });
    P.box('n3', 458, 218, 208, 36, { cls: s && s.failed ? 'bad' : 'ghost', title: 'Failed', right: (s ? s.failed : 0) + '' });
  },
  assume: 'What was run is JDK 21.0.12.1 (javac 21), JUnit Jupiter 6.0.3, and JUnit Platform Launcher 6.0.3. All 8 combinations were checked against the following: the same source as the code on the screen, with only two import lines added at the top (org.junit.jupiter.api.Test and Assertions.assertEquals), was compiled with javax.tools, and the CalcTest class was run by calling the JUnit Platform Launcher from code to get a summary. The ConsoleLauncher was not used from a terminal; the Launcher API of the same tool was used directly. What was checked is the number of tests found, the number started, the numbers of successes and failures, the kind of exception that failed (org.opentest4j.AssertionFailedError), and the first line of its message. The message text expected: <5> but was: <-1> is exactly what this JUnit actually produced. For the facts that the step sentences rely on, a separate source with fields that count calls was run in the same way, and it was confirmed that with @Test, adds() and add each run once without any line of our code calling them, and that with @Test removed, both run 0 times. For the documentation, I opened the following. In the Definitions section of the JUnit User Guide (docs.junit.org, version 6.1.3), I checked that a test method is an instance method annotated with @Test and so on, and that a test class is a class that has test methods. In the Test Classes and Methods section, I checked that test classes and methods do not have to be public but must not be private, and must not return a value. In the Assertions section, I checked that the assertions of JUnit Jupiter are static methods of org.junit.jupiter.api.Assertions, and that the example writes the expected value first, as in assertEquals(2, calculator.add(1, 1)). In the API documentation, I checked that @Test is the marker that signals that a method is a test method and that it must not be private or static, the description of Assertions (a failed assertion throws AssertionFailedError or a subtype of it unless something else is specified), and the summary of assertEquals(int expected, int actual) (it asserts that expected and actual are equal). The documentation is version 6.1.3, and the JUnit that was run is version 6.0.3. What the documentation defines and what was observed in this run are different things. That a test is counted as passed if it ends without an error and as failed if it ends with an error, and that a method without @Test is not found, so that the number of tests found is 0 and the number of failures is also counted as 0, are behaviors observed in this JUnit (I did not run the exit code of the ConsoleLauncher or how a build tool treats 0 tests). That the first of the two values of assertEquals is the expected value was checked from the method name and the argument names (expected, actual), and the documentation does not state the order separately as a rule. The screen deals with only one test, and it does not cover naming tests, multiple assertions, setup and cleanup methods, tests that start a Spring context, fake objects such as @MockitoBean, or the build process that runs tests automatically. Tests that start a Spring context are covered in the in-depth lab "Testing", and running tests automatically every time you push is covered in the in-depth lab "CI/CD pipelines".',
});
