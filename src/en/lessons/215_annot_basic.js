Lab.register({
  id: 'annot_basic', nav: 'Annotations', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['annot'],
  title: 'What is an annotation, and what happens when you add one?',
  intro: 'An annotation is a marker that you put on code and that starts with @, such as @Run or @Override. In this lab you create a marker yourself with @interface Run and put @Run above the work method. But a marker does not run anything by itself. For it to have an effect, something has to read the marker and act on it, and that is done by the compiler, by a framework such as Spring, or by code we write. Here we write a for loop ourselves that "finds the methods that have Run and calls them" to show that relationship. You remove @Run, remove the reader, and remove @Retention, compile and run the same code each time, and you see which methods are called.',
  terms: ['Annotation', '@interface', 'Reflection', '@Retention and @Target'],
  controls: [
    { id: 'mark', label: 'Method that gets @Run', type: 'select', value: 'work', options: [['work', 'Put @Run on work'], ['none', 'Put it on neither'], ['both', 'Put @Run on both work and rest']] },
    { id: 'reader', label: 'There is code that finds and calls the methods that have Run', type: 'check', value: true },
    { id: 'keep', label: 'Write @Retention(RetentionPolicy.RUNTIME)', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only body
  presets: [
    { t: 'Default settings', q: 'What does an annotation look like, and what happens when you add one?', d: 'Only work, which has @Run, is called. What called it is not the marker but our code that read the marker.', v: { mark: 'work', reader: true, keep: true } },
    { t: 'Remove @Run from work', q: 'What if you remove @Run from work?', d: 'The reader code is unchanged, but work is not called.', v: { mark: 'none', reader: true, keep: true } },
    { t: 'Put @Run on rest too', q: 'What if you put @Run on rest too?', d: 'The reader code is unchanged, but rest is called too.', v: { mark: 'both', reader: true, keep: true } },
    { t: 'Remove the reader code', q: 'What if you remove the code that finds and calls the methods that have Run?', d: 'Even with @Run on the methods, nothing happens.', v: { mark: 'work', reader: false, keep: true } },
    { t: 'Remove @Retention', q: 'What if you remove @Retention(RetentionPolicy.RUNTIME)?', d: 'Even with @Run on the method, it cannot be seen while the program runs, so no method is called.', v: { mark: 'work', reader: true, keep: false } },
  ],
  code: function (c) {
    var o = [], imp = [];
    if (c.keep) imp.push('import java.lang.annotation.Retention;', 'import java.lang.annotation.RetentionPolicy;');
    if (c.reader) imp.push('import java.lang.reflect.Method;');
    if (imp.length) o = imp.concat(['']);
    o.push(c.keep ? '// Create the marker. Write that it should be kept so it can be read at run time' : '// Create the marker');
    if (c.keep) o.push('@Retention(RetentionPolicy.RUNTIME)');
    o.push('@interface Run { }', '', 'class Job {');
    if (c.mark !== 'none') o.push('    // Marker: put Run on the work method', '    @Run');
    o.push('    public void work() {', '        System.out.println("work ran");', '    }');
    if (c.mark === 'both') o.push('    @Run');
    o.push('    public void rest() {', '        System.out.println("rest ran");', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) throws Exception {', '        Job job = new Job();');
    if (c.reader) o.push('        // Reader: find only the methods that have Run and call them', '        for (String name : new String[] { "work", "rest" }) {', '            Method m = Job.class.getMethod(name);', '            if (m.isAnnotationPresent(Run.class)) {', '                m.invoke(job);', '            }', '        }');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { work: '@Run on work', none: 'No @Run', both: '@Run on work and rest' }[c.mark] + ' · ' + (c.reader ? 'Reader code present' : 'No reader code') + ' · ' + (c.keep ? 'With @Retention' : 'No @Retention'); },
  columns: ['Output', 'Methods called', 'Marker read at run time'],
  simulate: function (c) {
    var ev = [], sum = [], N = ['work', 'rest'];
    var marks = { work: c.mark !== 'none', rest: c.mark === 'both' };
    var vis = { work: c.keep && marks.work, rest: c.keep && marks.rest };
    var anyMark = marks.work || marks.rest, anyVis = vis.work || vis.rest;
    var st = { hot: '', compile: '', ran: false, marks: marks, vis: { work: '', rest: '' }, visN: 0, cur: '', phase: '', calls: { work: 0, rest: 0 }, called: 0, out: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var visList = N.filter(function (n) { return vis[n]; });
    var markText = c.mark === 'both' ? 'above the work and rest methods' : 'above the work method';

    // 1-3. compile
    st.hot = 'rn';
    push('The compiler reads the source from the top. First it reads the @interface Run declaration and creates a new marker called Run. A marker that starts with @ is called an annotation, and what you declare with @interface becomes its name. The inside of the { } of Run is empty, so it is a marker that holds no values. ' + (c.keep ? 'The @Retention(RetentionPolicy.RUNTIME) above it tells the compiler how long to keep this marker. RUNTIME means to record it in the class file and keep it so it can be read while the program runs, through reflection (a feature that examines classes and methods while the program is running).' : '@Retention is not written, so it takes the default value, CLASS. CLASS records the marker in the class file but does not require it to be kept while the program runs.'), '');
    st.hot = 'jobs';
    push(anyMark
      ? 'The compiler reads the Job class. @Run is put ' + markText + '. The compiler only writes ' + (c.mark === 'both' ? 'these markers' : 'this marker') + ' into the class file ' + (c.keep ? 'as markers that can be read while the program runs' : 'as markers that cannot be read while the program runs') + ', and it does not run or call the methods.'
      : 'The compiler reads the Job class. Neither the work method nor the rest method has @Run. There is no marker to write into the class file.', '');
    st.hot = ''; st.compile = 'ok';
    push('Compilation succeeds. All the compiler did was check the source and create the class file. Neither work nor rest has run even once.', 'good');

    // 4. run: new Job()
    st.ran = true; st.hot = 'jobs'; st.visN = visList.length;
    push('You run it with java Main. main starts, and new Job() creates a Job object. work and rest did not run on this line. A method runs only when there is code that calls it. The @Run above a method is not code that calls it, only a marker.', '');

    var called = [];
    if (c.reader) {
      N.forEach(function (n, i) {
        var head = i === 0;
        st.cur = n; st.phase = 'ask'; st.hot = 'rd';
        var ask = (head ? 'The for loop runs for the first time, and name is "work". ' : 'The for loop runs again, and name is "rest". ')
          + 'Job.class.getMethod("' + n + '") gets the ' + n + ' method, and m.isAnnotationPresent(Run.class) asks, while the program runs, whether this method has Run.' + (head ? ' What asks this is not @Run but this code that we wrote.' : '');
        st.vis[n] = vis[n] ? 'yes' : 'no';
        push(ask + (vis[n] ? ' The answer is true. This is because the @Run put in the source is still kept in a state that can be read while the program runs.'
          : marks[n] ? ' The answer is false. The source has @Run, but there is no @Retention, so it is not kept while the program runs, and it cannot be seen even if you ask through reflection.'
          : ' The answer is false. This method does not have @Run.'), '');
        if (vis[n]) {
          st.phase = 'call'; st.calls[n]++; st.called++; st.out.push(n + ' ran'); called.push(n);
          push(head
            ? 'The answer is true, so execution goes inside the if and m.invoke(job) runs. invoke calls the ' + n + ' method of the job object, and the ' + n + ' method prints "' + n + ' ran". What made it print is not @Run itself but our code that saw @Run and ran m.invoke(job).'
            : 'The answer is true, so m.invoke(job) runs, the rest method is called, and "rest ran" is printed. Again, what called it is not the marker but our code.', 'good');
        } else {
          st.phase = 'skip';
          push('The answer is false, so execution does not go inside the if and m.invoke(job) does not run. The ' + n + ' method was not called, and nothing was printed.', '');
        }
      });
      st.cur = ''; st.phase = ''; st.hot = '';
      push('The for loop ends and main ends. The number of methods called is ' + called.length + ', and ' + (called.length ? 'the output is "' + st.out.join(' / ') + '".' : 'nothing was printed.'), called.length ? 'good' : '');
    } else {
      st.hot = ''; st.vis.work = vis.work ? 'yes' : 'no'; st.vis.rest = vis.rest ? 'yes' : 'no';
      push('main has only the line that creates the Job object, and no code that asks whether Run is present or gets a method and calls it. So neither work nor rest is called, and main ends without printing anything. ' + (anyVis ? 'Run was kept in a state that can be read while the program runs, but with no reader, nobody noticed it was there.' : anyMark ? '@Run is present and @Retention is absent, but either way, if there is no reader, nothing happens.' : 'There is no @Run anywhere and no reader, so it is the same as ordinary code.'), '');
    }

    // Summary: the first line is the answer to this setting (question)
    if (c.reader && c.keep && c.mark === 'work') {
      sum.push('An annotation is a marker that starts with @ and that you put on code. We created the marker with @interface Run and put @Run above the work method. But a marker does not run anything by itself. work was called because we wrote code that finds the methods that have Run and calls them with m.invoke(job).');
      sum.push('The same is true of Spring\'s @RestController and @GetMapping: they have an effect because Spring reads those markers. You see how Spring reads them in the Fundamentals lab "Controllers".');
    } else if (c.reader && c.keep && c.mark === 'both') {
      sum.push('When you put @Run on rest too, rest was called too. We did not change a single line of the reader code, and the reader found and called every method that had the marker.');
      sum.push('Which methods get called was decided not by the calling code but by the marker on the methods. Once you write the reader, you can add targets just by adding the marker.');
    } else if (c.reader && c.keep) {
      sum.push('When we removed @Run from work, work was not called. The reader code is unchanged and the code of the work method is unchanged, but the answer came back that Run is not present, so it skipped the inside of the if.');
      sum.push('Whether a method gets called was decided not by the code inside the method but by the marker. The reader is code that works by looking at the marker, so with no marker it does nothing.');
    } else if (!c.reader && anyVis) {
      sum.push('When you remove the code that finds and calls the methods that have Run, nothing happened even though @Run was present. The marker was kept so it could be read while the program ran, but there was no reader.');
      sum.push('A marker does not run anything by itself. All the compiler did was write the marker into the class file, and an effect comes only when there is a reader.');
    } else if (!c.reader && anyMark) {
      sum.push('There is no reader code and no @Retention, so nothing happened even though @Run was present. The result is the same if just one of the two is missing.');
      sum.push('A marker has an effect only if there is a reader and it is kept so it can be read. In this combination both are missing, so putting on the marker means nothing.');
    } else if (!c.reader) {
      sum.push('This is ordinary code with no @Run and no reader. There is no line that calls the two methods of Job, so neither work nor rest ran.');
      sum.push('A method runs only when there is code that calls it. Having no annotation and having no reader gave the same result in this code.');
    } else if (anyMark) {
      sum.push('When you remove @Retention(RetentionPolicy.RUNTIME), no method was called even though @Run was present. The default is CLASS, so the marker is in the class file but is not kept while the program runs, and isAnnotationPresent returned false.');
      sum.push('To read a marker while the program runs, the marker must be kept while the program runs. You decide this with @Retention when you create the marker. Even if there is reader code, it cannot find a marker that is not kept.');
    } else {
      sum.push('@Run was not put anywhere, so no method was called whether or not @Retention was there. In this combination, removing @Retention does not show up in the result.');
      sum.push('@Retention decides how long to keep a marker that has been put on, so if it was not put anywhere, there is nothing to decide. The effect of @Retention shows in the combinations where @Run is present.');
    }
    var out = st.out.length ? st.out.join(' / ') : '(nothing printed)';
    return { events: ev, summary: sum, row: [out, called.length ? called.join(', ') : 'None', visList.length ? visList.join(', ') : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the compiler reading the source.'); return; }
    var yn = { yes: 'Visible', no: 'Not visible', '': '' };
    H.table(v, ['Method', '@Run in source', 'Visible at run time', 'Times called'], ['work', 'rest'].map(function (n) {
      return { cls: '', cells: [n + '()', s.marks[n] ? 'Present' : 'None', { v: yn[s.vis[n]], cls: s.vis[n] === 'yes' ? 'good' : s.vis[n] === 'no' ? 'bad' : '' }, s.ran ? '' + s.calls[n] : ''] };
    }), 'Methods of Job');
    H.table(v, ['Output'], s.out.length ? s.out.map(function (o) { return { cls: '', cells: [o] }; }) : [{ cls: 'gone', cells: [s.ran ? '(nothing printed yet)' : ''] }], 'Output');
    H.counters(v, [[s.called, 'Methods called']]);
  },
  // Diagram: on the left, the two methods of Job (showing whether @Run is on them); below in the middle, the reader box (dashed if there is none); on the upper right, how the Run marker is kept. Arrows from the reader to a method for asking and for calling. At the bottom, the number of methods called and the number of @Run visible at run time.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    var hot = s ? s.hot : '', cur = s ? s.cur : '', ph = s ? s.phase : '';
    var marks = s ? s.marks : { work: c.mark !== 'none', rest: c.mark === 'both' };
    P.region('jb', 14, 16, 250, 208, 'Job class');
    ['work', 'rest'].forEach(function (n, i) {
      var runs = s ? s.calls[n] : 0, on = (hot === 'jobs') || (cur === n && (ph === 'ask' || ph === 'call'));
      var cls = runs ? 'good' : on ? 'hot now' : 'plain';
      P.box('m' + n, 24, 44 + i * 92, 230, 76, { cls: cls, title: n + '()', sub: [marks[n] ? '@Run is present' : 'No @Run', s && s.ran ? 'Times called: ' + runs : 'Not run yet'] });
    });
    P.box('rn', 330, 16, 336, 64, { cls: hot === 'rn' ? 'hot now' : 'plain', title: 'Run (marker)', sub: c.keep ? '@Retention(RUNTIME): kept at run time' : 'No @Retention: not kept at run time' });
    if (c.reader) {
      P.box('rd', 330, 96, 336, 116, { cls: hot === 'rd' ? 'hot now' : 'plain', title: 'Reader (the for loop we wrote)', sub: [cur ? 'Asking whether ' + cur + ' has Run' : 'Finds and calls only methods with Run', ph === 'call' ? 'Calling with m.invoke(job)' : ph === 'skip' ? 'Not marked, so not called' : ' '] });
    } else {
      P.box('rd', 330, 96, 336, 116, { cls: 'ghost', title: 'Reader (none)', sub: 'No code that finds and calls Run' });
    }
    if (cur && ph) {
      var to = 'm' + cur + ':r:0.5';
      P.arrow('ask', 'rd:l:' + (cur === 'work' ? '0.3' : '0.7'), to, { cls: ph === 'ask' ? 'hot' : 'dash' });
      if (ph === 'call') P.arrow('call', 'rd:l:' + (cur === 'work' ? '0.4' : '0.8'), 'm' + cur + ':r:0.7', { cls: 'good' });
    }
    P.box('n1', 14, 242, 322, 36, { cls: s && s.called ? 'good' : 'ghost', title: 'Methods called', right: '' + (s ? s.called : 0) });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.visN ? 'wait' : 'ghost', title: '@Run visible at run time', right: '' + (s ? s.visN : 0) });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all twelve combinations, the source that is the same as the code on the screen was compiled with javax.tools, and for those that compiled, the class file was loaded with a new class loader and Main.main was run, and the results were checked against the standard output that was captured. All twelve combinations compiled. What was checked is whether compilation succeeded, the output when run, the methods called as read from the output, and the "marker read at run time." The last one is a value measured separately from Main, by a checking program that asks isAnnotationPresent(Run.class) directly about the work and rest methods of the Job class from the same class loader, and it is measured even for combinations that have no reader code. I also checked in what form the marker was written in the class file of Job (RuntimeVisibleAnnotations or RuntimeInvisibleAnnotations), and the step sentences on the screen rely on this result. The documentation was opened and checked directly. I followed the Java Language Specification (Java SE 21), Section 9.6 (an annotation interface is declared with @interface, and one with no elements is a marker annotation interface), Section 9.6.4.2 (if @Retention is absent, it is treated as CLASS; SOURCE is not kept in the class file; CLASS and RUNTIME are recorded in the class file; and RUNTIME must be made readable by reflection at run time), Section 9.7 (an annotation is a marker that associates information with a program element and has no effect at run time) and Section 9.7.2 (marker annotations). I also checked the API documentation of java.lang.annotation.Retention and RetentionPolicy (the default is CLASS, and only RUNTIME can be read by reflection) and of java.lang.reflect.AnnotatedElement (isAnnotationPresent). In what form the compiler writes the marker into the class file is not defined by the specification; it was observed on this javac. The code on the screen uses a for loop to look at the two methods in turn, to explain this lab, and it is different from the way a real framework reads markers. The sentence that Spring\'s @RestController and @GetMapping have an effect because Spring reads them was not run in this lab, and it points to what was checked in the Fundamentals lab "Controllers". Elements that hold annotation values, @Target, markers that the compiler reads such as @Override, and the actual implementation of frameworks that read markers at run time are not covered. Other behavior is covered in the in-depth lab "Annotations".',
});
