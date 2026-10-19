Lab.register({
  id: 'annot', nav: 'Annotations', cat: 'Java language', mode: 'step',
  title: 'What really happens when you just add an annotation with @?',
  intro: 'An annotation (a mark that starts with @, such as @Override or @Timed) is a label that you attach to code. The label itself does nothing. It takes on meaning only when something reads it, namely the compiler or a framework that reads it with reflection at run time. And to be read at run time, the label must still be there at run time.',
  terms: ['Annotation', 'Reflection', '@Retention and @Target', '@Override', 'Overriding'],
  controls: [
    { id: 'topic', label: 'What to look at', type: 'select', value: 'custom', options: [['custom', 'Reading your own @Timed at run time (reflection)'], ['override', 'The compiler reading @Override']] },
    { id: 'ret', label: '@Retention of @Timed (how far the annotation is retained)', type: 'select', value: 'none', options: [['none', 'Not written'], ['SOURCE', 'SOURCE: only in the source code'], ['CLASS', 'CLASS: up to the class file'], ['RUNTIME', 'RUNTIME: until run time']], show: function (c) { return c.topic === 'custom'; } },
    { id: 'target', label: '@Target of @Timed (where it can be applied)', type: 'select', value: 'METHOD', options: [['none', 'Not written'], ['METHOD', 'METHOD: only to methods'], ['TYPE', 'TYPE: only to type declarations such as classes']], hint: '@Timed is applied to the work method.', show: function (c) { return c.topic === 'custom'; } },
    { id: 'reader', label: 'There is code that reads @Timed and acts on it', type: 'check', value: true, show: function (c) { return c.topic === 'custom'; } },
    { id: 'typo', label: 'The name of the method that is meant to override is misspelled (sound → sount)', type: 'check', value: true, show: function (c) { return c.topic === 'override'; } },
    { id: 'ov', label: '@Override is applied to that method', type: 'check', value: false, show: function (c) { return c.topic === 'override'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens at run time when @Timed is applied to a method with no @Retention and code reads it with reflection?', d: '@Timed is applied and there is code that reads it, but nothing happens.', v: { topic: 'custom', ret: 'none', target: 'METHOD', reader: true, typo: true, ov: false } },
    { t: 'Retaining it with RUNTIME', q: 'What if you set @Retention of @Timed to RUNTIME?', d: 'The reading code finds the annotation and adds extra steps before and after work.', v: { topic: 'custom', ret: 'RUNTIME', target: 'METHOD', reader: true, typo: true, ov: false } },
    { t: 'With no code that reads it', q: 'What if @Retention is RUNTIME and you remove the code that reads @Timed?', d: 'Nothing happens even though the annotation is retained until run time.', v: { topic: 'custom', ret: 'RUNTIME', target: 'METHOD', reader: false, typo: true, ov: false } },
    { t: 'With SOURCE', q: 'What if you set @Retention of @Timed to SOURCE?', d: 'The annotation is not retained even in the class file.', v: { topic: 'custom', ret: 'SOURCE', target: 'METHOD', reader: true, typo: true, ov: false } },
    { t: 'Applied where it is not allowed', q: 'What if @Retention stays RUNTIME and you change @Target of @Timed to TYPE?', d: '@Target is TYPE, but the annotation is applied to a method. This is a compile-time error.', v: { topic: 'custom', ret: 'RUNTIME', target: 'TYPE', reader: true, typo: true, ov: false } },
    { t: 'A misspelled name without @Override', q: 'What if the method name is misspelled (sound → sount) and @Override is not applied?', d: 'The code compiles without an error, and the superclass method runs instead.', v: { topic: 'override', ret: 'none', target: 'METHOD', reader: true, typo: true, ov: false } },
    { t: '@Override catches it', q: 'What if the same misspelling (sound → sount) is made and @Override is applied to that method?', d: 'The compiler reports the same mistake as an error.', v: { topic: 'override', ret: 'none', target: 'METHOD', reader: true, typo: true, ov: true } },
  ],
  // The code on the screen: [the declarations, the part inside main]
  parts: function (c) {
    if (c.topic === 'override') {
      return ['class Animal {\n    String sound() {\n        return "...";\n    }\n}\n\nclass Dog extends Animal {\n' + (c.ov ? '    @Override\n' : '') + '    String ' + (c.typo ? 'sount' : 'sound') + '() {\n        return "Woof";\n    }\n}',
        '// From here on, the code is inside main\nAnimal a = new Dog();\nSystem.out.println(a.sound());'];
    }
    var decl = (c.ret === 'none' ? '' : '@Retention(RetentionPolicy.' + c.ret + ')\n') + (c.target === 'none' ? '' : '@Target(ElementType.' + c.target + ')\n') + '@interface Timed { }\n\nclass Service {\n    @Timed\n    void work() {\n        System.out.println("work runs");\n    }\n}';
    var body = c.reader
      ? '// From here on, the code is inside main: the code that reads the annotation\nService service = new Service();\nMethod m = Service.class.getDeclaredMethod("work");\nboolean found = m.isAnnotationPresent(Timed.class);\nSystem.out.println("@Timed visible: " + found);\nif (found) System.out.println("[timing started]");\nm.invoke(service);\nif (found) System.out.println("[timing finished]");'
      : '// From here on, the code is inside main: no code reads the annotation\nService service = new Service();\nservice.work();';
    return [decl, body];
  },
  code: function (c) { var p = this.parts(c); return p[0] + '\n\n' + p[1]; },
  label: function (c) {
    if (c.topic === 'override') return '@Override · ' + (c.typo ? 'name misspelled' : 'name correct') + ' · ' + (c.ov ? 'with @Override' : 'without @Override');
    return '@Timed · Retention ' + (c.ret === 'none' ? 'omitted' : c.ret) + ' · Target ' + (c.target === 'none' ? 'omitted' : c.target) + ' · ' + (c.reader ? 'with reading code' : 'no reading code');
  },
  columns: ['Compilation', 'Retained in the class file?', 'Visible to reflection at run time?', 'Output'],
  simulate: function (c) {
    var ev = [], sum = [], ov = c.topic === 'override';
    var st = { chk: 'not yet', comp: '?', cls: '?', vis: '?', rd: '', out: [], end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var NO = ['Error', '(not compiled)', '(not compiled)', '(not run)'];

    if (ov) {
      var typo = !!c.typo, has = !!c.ov, name = typo ? 'sount' : 'sound';
      push('Animal has a sound() method, and Dog extends Animal: This code is meant to define sound() again in Dog (overriding) so that it returns "Woof".' + (typo ? ' But the name of the method in Dog is misspelled as sount.' : ''), typo ? 'hot' : '');
      var MSG = 'method does not override or implement a method from a supertype';
      if (has && typo) {
        st.chk = 'error'; st.comp = 'Error'; st.end = 'Not run';
        push('The compiler reads the @Override above sount(): @Override is a mark that says "the method right below overrides a method of a supertype", and the compiler checks whether that is true. Animal has no sount(). This is a compile-time error, and the compiler reports "' + MSG + '".', 'good');
        push('Compilation failed: No class file is produced, so the program cannot run. The mistake of misspelling the name was revealed before the program ran.', 'bad');
        sum.push('It is the compiler that reads @Override. If you get the name or the parameters of the method you meant to override wrong, the compiler tells you with a compile-time error.');
        return { events: ev, summary: sum, errLine: '@Override', msg: MSG, attr: '', row: NO };
      }
      if (has) { st.chk = 'passed'; push('The compiler reads the @Override above sound(): It checks whether the method right below really overrides a method of a supertype. Animal has sound(), so the check passes.', 'good'); }
      else if (typo) { st.chk = 'not done'; push('The compiler looks at sount() in Dog: There is no @Override, so the compiler does not check whether this is really an override. sount() is treated as a new method added to Dog that has nothing to do with sound(), and it is compiled as it is. There is no error and no warning.', 'bad'); }
      else { st.chk = 'not done'; push('The compiler looks at sound() in Dog: Its name and parameters are the same as those of sound() in Animal, so it overrides that method. The method overrides even without @Override, but nothing checked that it was written correctly.', ''); }
      st.comp = 'Success'; st.cls = has ? 'not retained' : '(not applied)'; st.vis = has ? 'not visible' : '(not applied)';
      push('Compilation succeeded: Dog.class is produced.' + (has ? ' @Override is an annotation that is retained only in the source code (its retention policy is SOURCE), so once the compiler has finished its check, it is not recorded in the class file. No trace of it remains at run time.' : ''), 'good');
      var res = typo ? '...' : 'Woof';
      st.out.push(res); st.end = 'Ended normally';
      push('a.sound() runs: The object that a refers to is a Dog. ' + (typo ? 'Dog has no sound() (it has only sount()). So the sound() inherited from Animal runs and prints "...". A method other than the intended one ran, with no error.' : 'The sound() that Dog overrides runs and prints "Woof".'), typo ? 'bad' : 'good');
      if (typo) sum.push('Without @Override, a method with a misspelled name is silently compiled as a "new method", and the superclass method that you meant to override runs unchanged. With @Override, the same mistake becomes a compile-time error.');
      else if (has) sum.push('@Override does not change how the program behaves. The output is the same with or without it. It does one thing: it has the compiler check that the method really overrides. That is why you always put it on a method that overrides.');
      else sum.push('The name is written correctly, so the method overrides even without @Override. However, if the name of the superclass method is changed later, this method stops being an override without any notice. With @Override in place, a compile-time error tells you when that happens.');
      return { events: ev, summary: sum, errLine: '', msg: '', attr: '', row: ['Success', st.cls, st.vis, res] };
    }

    var ret = c.ret === 'none' ? 'CLASS' : c.ret, inClass = ret !== 'SOURCE', visible = ret === 'RUNTIME', reader = !!c.reader;
    push('Look at the declaration @interface Timed: This is the syntax for creating a new annotation named Timed. Inside the braces there is not a single line of code to run. An annotation is only information that says "this mark is attached here". It does nothing by itself.');
    push({ none: 'No @Retention is written: @Retention is the setting that decides how far the annotation is retained. When it is not written, the default, CLASS, applies. CLASS means "record the annotation in the class file, but do not make it visible at run time".', SOURCE: 'Look at @Retention(RetentionPolicy.SOURCE): This setting retains the annotation only in the source code. After the compiler has seen it, it is discarded and does not go into the class file.', CLASS: 'Look at @Retention(RetentionPolicy.CLASS): This setting records the annotation in the class file but does not make it visible at run time. It is the same as the default that applies when nothing is written.', RUNTIME: 'Look at @Retention(RetentionPolicy.RUNTIME): This setting records the annotation in the class file and also lets it be read with reflection at run time.' }[c.ret], c.ret === 'none' ? 'hot' : '');
    var TMSG = 'annotation interface not applicable to this kind of declaration';
    if (c.target === 'TYPE') {
      st.chk = 'error'; st.comp = 'Error'; st.end = 'Not run';
      push('The compiler checks the @Timed above the work method: @Target(ElementType.TYPE) means "can be applied only to type declarations such as classes and interfaces", but the annotation is applied to a method. This is a compile-time error, and the compiler reports "' + TMSG + '".', 'bad');
      push('Compilation failed: No class file is produced, so the program cannot run. The result is the same whatever @Retention is, and whether or not there is code that reads the annotation.', 'bad');
      sum.push('@Target decides where an annotation can be applied. It is the compiler that reads @Target and enforces it. Applying the annotation in a place that does not match is a compile-time error, which keeps you from leaving it in the wrong place and wondering "why does it not work".');
      return { events: ev, summary: sum, errLine: '@Timed', msg: TMSG, attr: '', row: NO };
    }
    st.chk = 'passed';
    push('The compiler checks the @Timed above the work method: ' + (c.target === 'METHOD' ? '@Target(ElementType.METHOD) means "can be applied only to methods", and the annotation is applied to a method, so the check passes. It is the compiler that reads @Target and enforces it.' : 'No @Target is written, so the annotation can be applied to any declaration, such as a class, a method, or a field. The check passes.'), 'good');
    st.comp = 'Success'; st.cls = inClass ? 'retained' : 'not retained';
    var attr = ret === 'RUNTIME' ? 'RuntimeVisibleAnnotations' : ret === 'CLASS' ? 'RuntimeInvisibleAnnotations' : '';
    push('The code is compiled and Service.class is produced: ' + (ret === 'SOURCE' ? 'The retention policy is SOURCE, so the @Timed annotation is not recorded in the class file. Judging from the class file alone, work is a method with no annotation.' : ret === 'CLASS' ? 'The @Timed annotation is recorded in the class file. However, it is recorded in the attribute that is "not visible at run time" (' + attr + ').' : 'The @Timed annotation is recorded in the class file, in the attribute that is "visible at run time too" (' + attr + ').'), inClass ? '' : 'hot');
    st.vis = visible ? 'visible' : 'not visible';
    if (!reader) {
      st.rd = 'none'; st.out.push('work runs'); st.end = 'Ended normally';
      push('service.work() runs: It prints "work runs" and finishes. ' + (visible ? 'The @Timed annotation is still there at run time. However, no ' : 'No ') + 'code anywhere reads the annotation and does something with it, so the program behaves exactly as it would without the annotation.', visible ? 'hot' : '');
    } else {
      push('Service.class.getDeclaredMethod("work") runs: It gets the information about the work method with reflection. Reflection is a feature for examining, at run time, information such as the methods, fields, and annotations that a class has, and it is how frameworks read annotations.');
      st.rd = visible ? 'found' : 'notfound'; st.out.push('@Timed visible: ' + visible);
      push('m.isAnnotationPresent(Timed.class) runs: It asks whether @Timed is present on work. The result is ' + visible + '. ' + (visible ? 'The retention policy is RUNTIME, so the annotation is still there at run time.' : ret === 'SOURCE' ? 'The annotation is not even in the class file, so there is no way to know about it at run time.' : 'The annotation is in the class file, but the JVM does not make an annotation retained with CLASS visible to reflection.' + (c.ret === 'none' ? ' The cause is that @Retention was not written.' : '')), visible ? 'good' : 'bad');
      if (visible) {
        st.out.push('[timing started]', 'work runs', '[timing finished]'); st.end = 'Ended normally';
        push('found is true, so the reading code adds extra steps: It prints "[timing started]", runs work with m.invoke(service), and prints "[timing finished]". What did the steps before and after was not @Timed but this code, which found the annotation.', 'good');
      } else {
        st.out.push('work runs'); st.end = 'Ended normally';
        push('found is false, so the reading code adds nothing: It only runs work with m.invoke(service). @Timed is clearly there in the source code, and yet to the reading code this is the same as a method with no annotation. No error occurs either.', 'bad');
      }
    }
    if (reader && visible) sum.push('Something happens only when the annotation is retained until run time (RUNTIME) and there is code that reads it. @Transactional and @Autowired in Spring work on the same principle. The annotation does not do the work. The framework finds the annotation with reflection and does the work that goes with it.');
    if (reader && !visible) sum.push('The annotation is applied and there is code that reads it, and yet nothing happens. The reason is that the annotation was not retained until run time. When you create an annotation that will be read with reflection at run time, always write @Retention(RetentionPolicy.RUNTIME).' + (c.ret === 'none' ? ' If you do not write it, the default is CLASS, so the annotation is silently ignored without an error.' : ''));
    if (!reader) sum.push('An annotation does nothing by itself. If nothing reads it, the program behaves the same whether the annotation is there or not.');
    if (ret === 'SOURCE') sum.push('SOURCE is used for annotations that only the compiler, or a tool that generates code at compile time, needs to read. @Override is one of them.');
    if (ret === 'CLASS') sum.push('CLASS is for tools that read and process class files. A running program cannot read such an annotation itself.');
    return { events: ev, summary: sum, errLine: '', msg: '', attr: attr, row: ['Success', st.cls, st.vis, st.out.join(' / ')] };
  },
  mark: function (c) { return c.topic === 'override' ? '@Override' : '@Timed'; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to see, in the order of source code, class file, and run time, how far the annotation is retained and what reads it.'); return; }
    H.title(v, 'Console output');
    v.appendChild(H.el('pre', 'code', s.out.length ? s.out.join('\n') : '(nothing yet)'));
    H.counters(v, [[s.end, 'Program']]);
  },
  // Diagram: the three stages (source code, class file, run time) are placed from left to right, and each one says whether the annotation is still there. Below them are the things that read the annotation (the compiler and the reflection code), with an arrow from each to the stage it reads.
  draw: function (P, sim, shown) {
    var c = sim.c, ov = c.topic === 'override', mark = this.mark(c), last = shown[shown.length - 1];
    var s = last ? last.snap : { chk: 'not yet', comp: '?', cls: '?', vis: '?', rd: '', out: [], end: '?' };
    var attached = !ov || c.ov, done = s.comp === 'Success';
    P.size(680, 292);
    P.region('life', 16, 16, 648, 96, mark + ': where the annotation is retained');
    P.box('src', 30, 46, 196, 54, { cls: attached ? 'wait' : 'ghost', title: 'Source code (.java)', sub: mark + ': ' + (attached ? 'applied' : 'not applied') });
    P.box('cls', 242, 46, 196, 54, { cls: s.cls === 'retained' ? 'wait' : s.cls === '?' ? 'ghost' : 'plain', title: 'Class file (.class)', sub: mark + ': ' + (s.comp === 'Error' ? 'not produced' : s.cls === '?' ? 'not yet' : s.cls === '(not applied)' ? 'none' : s.cls) });
    P.box('run', 454, 46, 196, 54, { cls: s.vis === 'visible' ? 'wait' : s.vis === '?' ? 'ghost' : 'plain', title: 'Run time (JVM)', sub: mark + ': ' + (s.comp === 'Error' ? 'not run' : s.vis === '?' ? 'not yet' : s.vis === '(not applied)' ? 'none' : s.vis) });
    P.arrow('c1', 'src:r', 'cls:l', { cls: done ? (s.cls === 'retained' ? 'good' : 'mut dash') : s.comp === 'Error' ? 'bad' : 'mut dash' });
    P.arrow('c2', 'cls:r', 'run:l', { cls: done ? (s.vis === 'visible' ? 'good' : 'mut dash') : 'mut dash' });
    P.region('readers', 16, 126, 648, 96, 'What reads the annotation');
    P.box('rd1', 30, 156, 196, 54, { cls: s.chk === 'error' ? 'bad now' : s.chk === 'passed' ? 'good' : 'plain', title: 'Compiler', sub: (ov ? 'Override check: ' : 'Target check: ') + s.chk });
    var hasReader = !ov && c.reader;
    P.box('rd2', 454, 156, 196, 54, { cls: !hasReader ? 'ghost' : s.rd === 'found' ? 'good now' : s.rd === 'notfound' ? 'bad now' : 'plain', title: 'Code using reflection', sub: !hasReader ? 'none' : s.rd === 'found' ? 'found it, added steps' : s.rd === 'notfound' ? 'annotation not found' : 'not run yet' });
    if (s.chk !== 'not yet' && s.chk !== 'not done') P.arrow('r1', 'rd1:t', 'src:b', { cls: s.chk === 'error' ? 'bad' : 'good' });
    if (s.rd === 'found' || s.rd === 'notfound') P.arrow('r2', 'rd2:t', 'run:b', { cls: s.rd === 'found' ? 'good' : 'bad' });
    P.box('o1', 16, 238, 320, 36, { cls: s.comp === 'Success' ? 'good' : s.comp === 'Error' ? 'bad' : 'ghost', title: 'Compilation', right: s.comp });
    var result = s.comp === 'Error' ? 'not run' : s.end !== 'Ended normally' ? '?' : ov ? (c.typo ? 'sound of Animal runs' : 'sound of Dog runs') : s.rd === 'found' ? 'steps added around work' : 'only work runs';
    P.box('o2', 344, 238, 320, 36, { cls: result === '?' ? 'ghost' : s.comp === 'Error' ? 'bad' : (ov ? !c.typo : s.rd === 'found') ? 'good' : 'plain', title: 'Run result', right: result });
    P.note('The top row shows up to which stage the label is retained (@Retention decides this), and the bottom row shows what reads the label.');
  },
  assume: 'The 28 combinations (24 on the @Timed side and 4 on the @Override side) were checked by actually compiling and running the code shown on the screen on JDK 21 in our test environment. For each combination, the following were checked directly: whether the code compiles, the line with the error, the compiler message, and the output, and also whether the annotation is recorded in the bytes of the generated class file (and if so, in which of the two attributes, RuntimeVisibleAnnotations or RuntimeInvisibleAnnotations) and the result of isAnnotationPresent in reflection. Settings that are hidden on the screen do not affect the result. The code on the screen omits the import statements (those from java.lang.annotation, and java.lang.reflect.Method) and the declaration of the main method. It was also checked that an annotation with @Target(ElementType.TYPE) compiles when it is applied to a class. The statement that a framework such as Spring reads annotations on the same principle as the "reading" code in this model is an explanation, and it was not verified by actually running a framework. Tools that read annotations at compile time and generate code (annotation processors) are not covered.',
});
