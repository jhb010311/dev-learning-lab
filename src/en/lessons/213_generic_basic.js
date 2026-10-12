Lab.register({
  id: 'generic_basic', nav: 'Generics', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['generic'],
  title: 'What does the <String> in List<String> do?',
  intro: 'The <String> in List<String> is a marker that tells the compiler, "this list holds only String." With this marker, the compiler blocks any line that tries to add something that is not a String, and it also knows that what you take out of the list is a String, so it lets you store it straight into a String variable. Without the marker, the list accepts any object, and the compiler does not know what you take out. So you must write (String) yourself every time you take something out, and a wrong item is not found when you compile but only at run time, at the moment you take it out. In this lab you change <String>, the value you add, and (String), then compile and run the same code, and you see what the compiler reports and what is printed.',
  terms: ['Generics', 'Type argument (<String>)', 'Raw type', 'ClassCastException'],
  controls: [
    { id: 'gen', label: 'Write <String> after List', type: 'check', value: true },
    { id: 'put', label: 'Line that adds to the list', type: 'select', value: 'str', options: [['str', 'names.add("Bob")'], ['num', 'names.add(123): adds a number']] },
    { id: 'cast', label: 'Write (String) when taking out', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only body
  presets: [
    { t: 'Default settings', q: 'What does <String> look like, and what does it do?', d: 'With <String>, the compiler handles the type of the value you add and the value you take out. Compilation succeeds and 3 is printed.', v: { gen: true, put: 'str', cast: false } },
    { t: 'Remove <String>', q: 'What if you remove <String>?', d: 'The compiler does not know what you take out, only that it is an Object, so there is a compile-time error on the line that stores it in a String variable.', v: { gen: false, put: 'str', cast: false } },
    { t: 'Remove <String> and write (String)', q: 'What if you remove <String> and write (String) when taking out?', d: 'You write (String) yourself, doing what the compiler used to do. Compilation succeeds and 3 is printed.', v: { gen: false, put: 'str', cast: true } },
    { t: 'Add a number', q: 'What if you add the number 123 to a list that has <String>?', d: 'The compiler blocks it on the line that adds. It is a compile-time error, and nothing runs.', v: { gen: true, put: 'num', cast: false } },
    { t: 'Remove <String> and add a number', q: 'What if you remove <String>, add 123, and then take it out with (String)?', d: 'Compilation succeeds, but at run time the program stops with ClassCastException on the line that takes it out.', v: { gen: false, put: 'num', cast: true } },
  ],
  // What the compiler reports (the real javac diagnostics and note, restated)
  errAdd: '123 (int) cannot be added because it is not a String',
  errGet: 'What was taken out is an Object, so it cannot be stored in a String variable',
  noteText: 'No error, only a note that an unsafe operation (unchecked) was used',
  code: function (c) {
    var o = ['import java.util.ArrayList;', 'import java.util.List;', '', 'public class Main {', '    public static void main(String[] args) {'];
    if (c.gen) o.push('        // <String>: a marker that this list holds only String');
    o.push(c.gen ? '        List<String> names = new ArrayList<>();' : '        List names = new ArrayList();');
    o.push(c.put === 'str' ? '        names.add("Bob");' : '        names.add(123);');
    if (c.cast) o.push('        // (String): you write by hand that what you take out is converted to String');
    o.push(c.cast ? '        String first = (String) names.get(0);' : '        String first = names.get(0);');
    o.push('        System.out.println(first.length());', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.gen ? 'With <String>' : 'No <String>') + ' · ' + (c.put === 'str' ? 'adds "Bob"' : 'adds 123') + ' · ' + (c.cast ? 'With (String)' : 'No (String)'); },
  columns: ['Compilation', 'What the compiler reports', 'Run result'],
  simulate: function (c) {
    var ev = [], sum = [], gen = c.gen, num = c.put === 'num', cast = c.cast;
    var ADD = num ? 'names.add(123);' : 'names.add("Bob");';
    var GET = cast ? 'String first = (String) names.get(0);' : 'String first = names.get(0);';
    var argText = num ? '123 (int)' : '"Bob" (String)';
    var addErr = gen && num, getErr = !gen && !cast;
    var ok = !addErr && !getErr, nerr = ok ? 0 : 1;
    var errAt = addErr ? [ADD] : getErr ? [GET] : [];
    var first = addErr ? this.errAdd : getErr ? this.errGet : '';
    var st = { hot: '', adSub: [argText], lsSub: ['Not run yet'], gtSub: [cast ? 'Has (String)' : 'No (String)'], bad: {}, added: false, got: false, stop: false, compile: '', errs: 0, errText: '', ran: false, out: [], exc: '', size: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }

    // 1. read the List names = ... line
    st.hot = 'ls';
    if (gen) {
      st.lsSub = ['Holds only String', '(the compiler remembers)'];
      st.checks.push(['<String> after List', { v: 'Present: names holds only String', cls: 'good' }]);
      push('The compiler reads the source from the top. On the line List<String> names = new ArrayList<>();, it reads the <String> after List and remembers, "names holds only String." <String> is a marker that tells the compiler the type of what this list holds.', '');
    } else {
      st.lsSub = ['No <String> marker', 'List that holds any object'];
      st.checks.push(['<String> after List', { v: 'Absent: does not know what it holds', cls: 'bad' }]);
      push('The compiler reads the source from the top. The line List names = new ArrayList(); has no <...> after List. The compiler does not know what names holds, and treats it as a list that can hold any object. A List written without <...> like this is called a raw type.', '');
    }

    // 2. check the names.add(...) line
    st.hot = 'ad';
    if (addErr) {
      st.bad.add = true; fail(this.errAdd);
      st.adSub = [argText, 'Compiler blocks it'];
      st.checks.push([ADD + ' line', { v: 'Error: 123 is not a String', cls: 'bad' }]);
      push('The compiler checks this line: ' + ADD + ' The 123 you are adding is a number (int), not a String, but names is a list that holds only String. So this line is an error (javac: incompatible types: int cannot be converted to String). The compiler blocked it before it was added.' + (cast ? ' Writing (String) on the line that takes it out has nothing to do with this error.' : ''), 'bad');
    } else if (gen) {
      st.adSub = [argText, 'Passes'];
      st.checks.push([ADD + ' line', { v: 'Passes: "Bob" is a String', cls: 'good' }]);
      push('The compiler checks this line: ' + ADD + ' The "Bob" you are adding is a String, and names is a list that holds only String, so it passes.', 'good');
    } else {
      st.adSub = [argText, 'Passes unchecked'];
      st.checks.push([ADD + ' line', { v: 'Passes: accepts anything', cls: '' }]);
      push('The compiler checks this line: ' + ADD + ' It does not know what names holds, so it cannot check the value you add, and it lets ' + (num ? 'the number 123' : '"Bob"') + ' through as it is. It does leave a note that an unsafe operation (unchecked) is used. A note is not an error, so compilation continues.', '');
    }

    // 3. check the String first = ... names.get(0) line
    st.hot = 'gt';
    if (gen) {
      st.gtSub = ['Taken out: a String', 'Stored in first'];
      st.checks.push(['names.get(0) line', { v: 'Passes: what is taken out is a String', cls: 'good' }]);
      push('The compiler checks this line: ' + GET + ' names is supposed to hold only String, so the compiler knows that what you take out is a String. So it is fine to store it straight in the String variable first.' + (cast ? ' You wrote (String), but it is an unnecessary piece of text for a compiler that already knows it is a String. It is not an error to write it.' : ' You do not need to write (String).') + (addErr ? ' There is no problem with this line, and the error is only the add line above.' : ''), cast ? '' : 'good');
    } else if (cast) {
      st.gtSub = ['You wrote (String),', 'so it passes'];
      st.checks.push(['names.get(0) line', { v: 'Passes: trusts the (String)', cls: '' }]);
      push('The compiler checks this line: ' + GET + ' The compiler knows what you take out only as an Object, but you wrote (String) to say "convert it to String," so it lets it through. Whether what you take out really is a String cannot be checked when you compile, and it is checked at run time.', '');
    } else {
      st.bad.get = true; fail(this.errGet);
      st.gtSub = ['Only an Object', 'Compiler blocks it'];
      st.checks.push(['names.get(0) line', { v: 'Error: cannot store an Object in a String', cls: 'bad' }]);
      push('The compiler checks this line: ' + GET + ' The compiler does not know what was put in names, so it knows what you take out only as an Object. An Object cannot be stored in the String variable first, so there is an error (javac: incompatible types: Object cannot be converted to String).' + (num ? ' The compiler did not look at whether 123 was added on the previous line, and the error is only this one line.' : ' Even though a String was added on the previous line, the compiler does not follow that.'), 'bad');
    }

    // 4. compilation result
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compilation', { v: 'Success', cls: 'good' }]);
      push(gen ? 'Compilation succeeds and the Main class file to run is created.' : 'Compilation succeeds and the Main class file to run is created. What the compiler reported is not an error, only two lines of notes that an unsafe operation is used.' + (num ? ' The compiler did not know that 123 would be added, and trusted (String) and let it through.' : ''), 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compilation', { v: nerr + (nerr === 1 ? ' error' : ' errors'), cls: 'bad' }]);
      push('Compilation fails. The compiler reported ' + nerr + (nerr === 1 ? ' error' : ' errors') + ', "' + first + '". The Main class file to run was not created, so the program cannot run.', 'bad');
    }

    // 5-8. run
    if (ok) {
      st.hot = 'ls'; st.ran = true; st.lsSub = ['Held: nothing'];
      push('You run it with java Main. main starts, and new ArrayList creates an empty list and makes names refer to it.', '');
      st.hot = 'ad'; st.added = true; st.size = 1;
      st.lsSub = [num ? 'Held: 123 (Integer)' : 'Held: "Bob" (String)'];
      st.adSub = [argText, 'Ran'];
      push('The line ' + ADD + ' runs. ' + (num ? '123 is added to the list as an Integer object. This is a raw type, so nothing is checked when you add, and nothing happens.' : (gen ? '"Bob" is added to the list.' : '"Bob" is added to the list. Nothing is checked when you add.')), '');
      st.hot = 'gt';
      if (num) {
        st.stop = true; st.exc = 'ClassCastException';
        st.gtSub = ['Taken out: Integer', 'Stopped at run time'];
        st.out = [];
        push('The line ' + GET + ' runs. What was taken out of the list is 123, an Integer object. Because (String) is written, the JVM checks whether what was taken out is a String, and an Integer is not a String, so a ClassCastException occurs (JVM: Integer cannot be cast to String). No code handles this exception, so the program stops here, and the println line below does not run. The compiler let this line through, but the wrong item was found only at the moment it was taken out. Nothing happened on the line names.add(123); that added 123.', 'bad');
      } else {
        st.got = true;
        st.gtSub = ['Taken out: "Bob"', 'String'];
        push('The line ' + GET + ' runs. It takes "Bob" out of the list and stores it in first.' + (gen ? '' : ' Because (String) is written, the JVM checks whether what was taken out is a String, and "Bob" is a String, so it passes.'), 'good');
        st.hot = ''; st.out.push('3');
        push('The line System.out.println(first.length()); runs. first is "Bob", and length() returns the number of characters, 3, so it prints 3.', 'good');
      }
    }

    // Summary: the first line is the answer to this setting (question)
    if (gen && !num && !cast) {
      sum.push('<String> is a marker that tells the compiler, "names holds only String." Using this marker, the compiler checked on the add line that the value you add is a String, and on the get line it knew that what you take out is a String, so it let you store it straight in a String variable without (String).');
      sum.push('<String> is not code that the program runs. It is a marker that the compiler checks while it compiles. Because of this marker, a wrong line can be blocked before it runs.');
    } else if (gen && !num) {
      sum.push('When <String> is present, you do not need to write (String), and the code still compiles if you do, with the same result. Compilation succeeded and 3 was printed.');
      sum.push('The compiler already knows that what you take out is a String, so (String) is an unnecessary piece of text (if you turn on javac\'s warning option -Xlint:all, it reports an unnecessary cast).');
    } else if (gen) {
      sum.push('If you try to add the number 123 to a list that has <String>, the compiler blocks it on the line names.add(123);. Compilation failed, so it could not run.' + (cast ? ' Writing (String) on the line that takes it out had nothing to do with this error.' : ''));
      sum.push('The wrong item was found before running, on the very line that tries to add it. There was no problem with the line that takes it out, and the error was in that one place only.');
    } else if (!cast) {
      sum.push('When you remove <String>, the compiler does not know what was put in names, so it knows what you take out only as an Object. An Object cannot be stored in a String variable, so there was a compile-time error on the get line, and it could not run.' + (num ? ' The compiler did not block the line that adds 123.' : ' The add line was not an error.'));
      sum.push('Without <String>, the compiler cannot know what type of thing you actually take out. You must write (String) yourself every time you take something out for the code to compile.');
    } else if (!num) {
      sum.push('Even if you remove <String>, if you write (String) yourself when taking out, compilation succeeds and 3 is printed. You wrote by hand what the compiler did for you when <String> was present.');
      sum.push('The compiler cannot check whether (String) is right, though. It only trusts it. This time, what was added really was a String, so it passed the check at run time. A note that an unsafe operation is used was also left for the add line.');
    } else {
      sum.push('If you remove <String>, add 123, and take it out with (String), compilation succeeds, but at run time the program stops on the line that takes it out, with ClassCastException. Nothing happened when 123 was added, and at the moment you took it out, the JVM said that an Integer cannot be converted to String.');
      sum.push('The line that added the wrong item (add) and the line where it stopped (get) are different. If <String> had been there, the compiler would have blocked the add line, and the mistake could have been found before running.');
    }
    var run = !ok ? 'Cannot run' : st.exc ? 'Stopped by ClassCastException' : st.out.join(' / ');
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? 'Success' : 'Error', ok ? (gen ? 'None' : this.noteText) : first, run] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compilation');
    if (s.out.length || s.exc) H.table(v, ['Run result'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }).concat(s.exc ? [{ cls: '', cells: [{ v: 'Stopped by ' + s.exc, cls: 'bad' }] }] : []), 'Output');
    H.counters(v, [[s.size, 'Items in the list'], [s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: in the middle, the list names (what it holds and its type); on the left, the names.add line that adds; on the right, the names.get line that takes out. The text inside the boxes tells apart where the compiler blocked and where it stopped at run time. Below, the compilation result and the run result.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 264);
    var hot = s ? s.hot : '', bad = s ? s.bad : {};
    var argText = c.put === 'num' ? '123 (int)' : '"Bob" (String)';
    P.box('ad', 14, 20, 170, 96, { cls: bad.add ? 'bad' : hot === 'ad' ? 'hot now' : s && s.added ? 'good' : 'plain', title: 'names.add(...)', sub: s ? s.adSub : [argText] });
    P.box('ls', 234, 20, 212, 96, { cls: hot === 'ls' ? 'hot now' : s && s.size ? 'wait' : 'plain', title: 'names (List)', sub: s ? s.lsSub : ['Not run yet'] });
    P.box('gt', 496, 20, 170, 96, { cls: s && s.stop ? 'bad now' : bad.get ? 'bad' : hot === 'gt' ? 'hot now' : s && s.got ? 'good' : 'plain', title: 'names.get(0)', sub: s ? s.gtSub : [c.cast ? 'Has (String)' : 'No (String)'] });
    if (s && s.added) P.arrow('put', 'ad:r', 'ls:l', { cls: 'good' });
    if (s && (s.got || s.stop)) P.arrow('take', 'ls:r', 'gt:l', { cls: s.stop ? 'bad' : 'good' });
    P.box('r1', 14, 140, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Compilation', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 202, 652, 40, { cls: s && s.exc ? 'bad' : s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Run result', right: s && s.exc ? 'Stopped by ' + s.exc : s && s.ran ? (s.out.length ? s.out.join(' / ') : '(no output yet)') : s && s.compile === 'err' ? 'Cannot run' : '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21), and compilation used the default options, with no warning options turned on. For all eight combinations, the source that is the same as the code on the screen (identical text line by line, including the import lines) was compiled with javax.tools, and for those that compiled, the class file was loaded with a new class loader and Main.main was run, and the results were checked against the standard output and exceptions that were captured. What was checked is whether compilation succeeded, the diagnostic code and English message of the first error (the "int cannot be converted to String" and "Object cannot be converted to String" of compiler.err.prob.found.req were restated as the two error descriptions on the screen), the number of errors and the line where each error occurred, whether the Main class file was created, the notes the compiler left other than errors, the output when run, and the kind, message, and line of the exception at run time. The facts that the step sentences rely on were also run separately and checked. A line that adds 123 to a list without <String> passes without an exception even at run time, 1 item is held in the list, and ClassCastException occurred only on the (String) line that takes it out (message: Integer cannot be cast to String). Even without <String>, a line that stores what you take out in an Object variable compiles, and a line that calls length() on what you take out without a cast does not compile. When <String> is present, you can call length() directly on what you take out. With the default options, the combinations that contain a raw type (both those that compiled and those that had an error) left not an error but two lines of notes (that an unsafe operation is used, and that you should recompile with -Xlint:unchecked), and they did not appear as warnings. When compiled separately with the warning options -Xlint:unchecked and -Xlint:rawtypes turned on, a raw type warning occurred on the declaration line that uses List and ArrayList without <>, an unchecked call warning occurred on the names.add line, and there was no warning on the line that takes out with (String). The combination with <String> and also (String) compiled with the default options without even a note, and with -Xlint:all turned on, a warning about an unnecessary cast occurred. The error of adding 123 to a list with <String> was reported by javac in a shortened form (note: Some messages have been simplified), and when recompiled with -Xdiags:verbose, it was a compiler.err.cant.apply.symbols error saying that no method matches add(int). The documentation was opened with WebFetch and checked. I followed the Java Language Specification (Java SE 21), Section 4.5 and Section 4.5.1 (a generic class with type arguments attached, such as List<String>, is a parameterized type, and a type argument must be a reference type, so List<int> cannot be used), Section 4.8 (a name without <> is a raw type, which is allowed only for compatibility with old code, and some accesses to the members of a raw type give an unchecked warning), Sections 5.5 and 5.1.6 (a conversion between reference types that needs a check examines the class of the object at run time and may throw ClassCastException if it is wrong), and the Java Tutorials "Why Use Generics?" (generics give stronger checks at compile time and remove the casts when taking out). The pages that were opened came back as summarized answers, so I could not read all of the original text directly, and jls-4.html was read only up to the first 100000 characters (Sections 4.5 and 4.8 were within that). That 123 is added to the list as an Integer object was not checked by opening Section 5.1.7 (boxing) of the specification; it was observed in the exception message at run time. The kind of error, the number of errors, the line where it occurs, and whether a note is left are not defined by the specification; they were observed on this javac. The code on the screen has the form of one class with only main. There are ways to get around the compiler\'s check even with <String>, and this lab did not cover writing your own generic classes or methods, wildcards, or the fact that <String> does not remain at run time (type erasure). They are covered in the in-depth lab "Generics".',
});
