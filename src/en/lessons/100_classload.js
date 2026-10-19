Lab.register({
  id: 'classload', nav: 'Class loading and initialization', cat: 'JVM', mode: 'step',
  title: 'When does the static initializer of a class run?',
  intro: 'A static initializer written in a class does not run when the program starts. It runs once, when the class is first "really" used. But not every appearance of the class name in the code counts as that kind of use.',
  terms: ['Class loader', 'Class initialization', 'Static initializer', 'Compile-time constant', 'static'],
  controls: [
    { id: 'cls', label: 'Class to use', type: 'select', value: 'parent', options: [['parent', 'Parent (the superclass)'], ['child', 'Child (a subclass that extends Parent)']] },
    { id: 'use', label: 'What to do with the class', type: 'select', value: 'const', options: [['new', 'Create an object with new'], ['smethod', 'Call a static method'], ['sfield', 'Read a static field (static int count)'], ['const', 'Read a constant (static final int MAX = 10)'], ['finalrt', 'Read a field that is static final but gets its value only at run time'], ['array', 'Create an array (new ClassName[3])'], ['classlit', 'Use ClassName.class']] },
    { id: 'decl', label: 'Where the static member is declared', type: 'select', value: 'own', options: [['own', 'Declared in Child'], ['parent', 'Declared in Parent (Child inherits it)']], show: function (c) { return c.cls === 'child' && ['smethod', 'sfield', 'const', 'finalrt'].indexOf(c.use) >= 0; }, hint: 'Even when you write Child.name, the declaration can be in the superclass.' },
  ],
  // Where the member is declared matters only when a static member of Child is used
  fix: function (c) { return c.decl === 'parent' && !(c.cls === 'child' && ['smethod', 'sfield', 'const', 'finalrt'].indexOf(c.use) >= 0) ? { decl: 'own' } : null; },
  presets: [
    { t: 'Default settings', q: 'What happens to the static initializer and class loading when you read the constant MAX of Parent?', d: 'Reading a constant. The static initializer does not run, and the class is not even loaded.', v: { cls: 'parent', use: 'const', decl: 'own' } },
    { t: 'Creating an object with new', q: 'What if you create an object with new instead of reading the constant?', d: 'The static initializer runs only once, when the first object is created.', v: { cls: 'parent', use: 'new', decl: 'own' } },
    { t: 'A static final field that is not a constant', q: 'What if you read a field that is static final but gets its value only at run time?', d: 'Its value is known only at run time, so initialization happens.', v: { cls: 'parent', use: 'finalrt', decl: 'own' } },
    { t: 'Creating only an array', q: 'What if you create an array with new Parent[3]?', d: 'The class is only loaded and is not initialized.', v: { cls: 'parent', use: 'array', decl: 'own' } },
    { t: 'Creating an object of the subclass', q: 'What if you use Child and create an object with new?', d: 'The superclass is initialized first, and then the subclass.', v: { cls: 'child', use: 'new', decl: 'own' } },
    { t: 'A static field of the superclass through the subclass name', q: 'What if you use Child and read count, which is declared in Parent, through the name Child?', d: 'The code says Child.count, but Child is not initialized.', v: { cls: 'child', use: 'sfield', decl: 'parent' } },
    { t: 'Using ClassName.class', q: 'What if you use Child and use Child.class?', d: 'It only refers to the class information and does not initialize the class.', v: { cls: 'child', use: 'classlit', decl: 'own' } },
  ],
  // The names used with these settings, and what is loaded and what is initialized
  facts: function (c) {
    var member = ['smethod', 'sfield', 'const', 'finalrt'].indexOf(c.use) >= 0, T = c.cls === 'parent' ? 'Parent' : 'Child';
    var owner = member && (c.cls === 'parent' || c.decl === 'parent') ? 'Parent' : T;          // the class that actually declares the member
    var active = ['new', 'smethod', 'sfield', 'finalrt'].indexOf(c.use) >= 0;                  // is this a use that triggers initialization?
    var target = c.use === 'new' ? T : owner;                                                  // the class to initialize
    var st = { new: [T + ' a = new ' + T + '();', T + ' b = new ' + T + '();'], smethod: [T + '.hello();', T + '.hello();'], sfield: ['int a = ' + T + '.count;', 'int b = ' + T + '.count;'], const: ['int a = ' + T + '.MAX;', 'int b = ' + T + '.MAX;'], finalrt: ['int a = ' + T + '.SIZE;', 'int b = ' + T + '.SIZE;'], array: [T + '[] a = new ' + T + '[3];', T + '[] b = new ' + T + '[3];'], classlit: ['Class<?> a = ' + T + '.class;', 'Class<?> b = ' + T + '.class;'] }[c.use];
    return { member: member, T: T, owner: owner, active: active, stmt: st, loads: c.use === 'const' ? [] : T === 'Child' ? ['Parent', 'Child'] : ['Parent'], inits: !active ? [] : target === 'Child' ? ['Parent', 'Child'] : ['Parent'] };
  },
  code: function (c) {
    var f = this.facts(c);
    var member = { smethod: '    static void hello() { }\n', sfield: '    static int count = 0;\n', const: '    static final int MAX = 10;                        // a constant whose value is fixed at compile time\n', finalrt: '    static final int SIZE = Integer.parseInt("10");   // the value is known only at run time\n' }[c.use] || '';
    var note = f.member && f.owner !== f.T ? '                // ' + { smethod: 'hello', sfield: 'count', const: 'MAX', finalrt: 'SIZE' }[c.use] + ' is declared in Parent' : '';
    return 'class Parent {\n' + (f.owner === 'Parent' ? member : '') + '    static { System.out.println("Parent init"); }    // static initializer\n}\n\nclass Child extends Parent {\n' + (f.member && f.owner === 'Child' ? member : '') + '    static { System.out.println("Child init"); }\n}\n\n'
      + 'System.out.println("main starts");\n' + f.stmt[0] + note + '\nSystem.out.println("first use done");\n' + f.stmt[1] + '\nSystem.out.println("second use done");';
  },
  label: function (c) { var f = this.facts(c); return f.T + ' · ' + { new: 'new', smethod: 'static method', sfield: 'static field', const: 'constant', finalrt: 'non-constant static final', array: 'array', classlit: '.class' }[c.use] + (f.member && c.cls === 'child' ? (f.owner === 'Parent' ? ' (declared in Parent)' : ' (declared in Child)') : ''); },
  columns: ['Static initializer of Parent', 'Static initializer of Child', 'Classes loaded', 'Order of the output'],
  simulate: function (c) {
    var f = this.facts(c), T = f.T, U = c.use, ev = [], sum = [], seq = [];
    var st = { P: 'none', C: 'none', pn: 0, cn: 0, out: [], stmt: '', eff: '', to: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function print(x) { st.out.push(x); seq.push(x); }
    var mname = { smethod: 'hello()', sfield: 'count', const: 'MAX', finalrt: 'SIZE' }[U];
    print('main starts'); st.stmt = 'println("main starts");'; st.eff = 'Neither class is used yet';
    push('System.out.println("main starts"): The program has started. It has not yet reached any code that uses Parent or Child, so the JVM has neither loaded the two classes nor run a static initializer.');
    st.stmt = f.stmt[0];
    if (U === 'const') {
      st.eff = 'Uses 10 directly, no class lookup';
      push(f.stmt[0].slice(0, -1) + ': MAX is a constant whose value is fixed at compile time. The compiler has already turned this line into the same thing as int a = 10; so at run time there is no need to look up the ' + f.owner + ' class. The class is not loaded, and its static initializer does not run.', 'bad');
    } else {
      st.P = 'loaded'; seq.push('loaded Parent'); if (T === 'Child') { st.C = 'loaded'; seq.push('loaded Child'); }
      st.eff = T + ' is loaded'; st.to = T;
      push(f.stmt[0].slice(0, -1) + ': This is the first line that uses ' + T + '. The JVM finds the class file of ' + T + ' and loads it (loading).' + (T === 'Child' ? ' A subclass is not complete without its superclass, so Parent is loaded as well.' : '') + ' No static initializer has run yet.');
      if (U === 'array') { st.eff = 'Does not trigger initialization'; push('new ' + T + '[3]: This creates an array of three elements that can refer to ' + T + ' objects. Every element is null, and not a single ' + T + ' object has been created. The class is only loaded and is not initialized, so its static initializer does not run.', 'bad'); }
      if (U === 'classlit') { st.eff = 'Does not trigger initialization'; push(T + '.class: This only refers to the Class object that holds the information about the class. It does not run any code of ' + T + ' or use its static fields. The class is only loaded and is not initialized, so its static initializer does not run.', 'bad'); }
      if (f.active) {
        var why = { new: 'Before an object can be created with new, the initialization of its class must be complete.', smethod: 'Before a static method can run, the initialization of the class that declares the method must be complete.', sfield: 'Before the value of a static field can be read, the initialization of the class that declares the field must be complete.', finalrt: 'SIZE is static final, but its value is not known until Integer.parseInt("10") runs. The value cannot be known at compile time, so SIZE is not a constant, and it gets its value only when the class that declares it is initialized.' }[U];
        if (f.member && f.owner !== T) { st.eff = 'Class to initialize: Parent'; st.to = 'Parent'; push(T + '.' + mname + ': The name is written with Child, but ' + mname + ' is declared in Parent. Using a static member initializes only the class that actually declares it. So the class to initialize is Parent, not Child.', 'bad'); }
        if (f.inits.length === 2) {
          st.P = 'init'; st.pn = 1; print('Parent init'); st.eff = 'Initializes the superclass first';
          push('Before Child is initialized: ' + why + ' In addition, before a subclass can be initialized, its superclass must already be initialized. The static initializer of Parent runs first and prints "Parent init".', 'good');
          st.C = 'init'; st.cn = 1; print('Child init'); st.eff = 'Then initializes Child';
          push('Initialization of Child: The initialization of the superclass is complete, so the static initializer of Child runs and prints "Child init".', 'good');
        } else {
          st.P = 'init'; st.pn = 1; print('Parent init'); st.eff = 'Initializes Parent';
          push('Initialization of Parent: ' + why + ' The static initializer of Parent runs and prints "Parent init".' + (T === 'Child' ? ' Child has only been loaded and is not initialized.' : ''), 'good');
        }
      }
    }
    print('first use done'); st.stmt = 'println("first use done");'; st.eff = 'The first use is done'; st.to = '';
    push('System.out.println("first use done"): Number of times the static initializers have run so far: Parent ' + st.pn + ', Child ' + st.cn + '.');
    st.stmt = f.stmt[1];
    if (f.inits.length) { st.eff = 'Already initialized (not rerun)'; st.to = c.use === 'new' ? T : f.owner; push(f.stmt[1].slice(0, -1) + ': The same thing is done once more. A class is initialized only once, and initialization is already complete for ' + f.inits.join(' and ') + '. The static initializer does not run again.', 'good'); }
    else if (U === 'const') { st.eff = 'Uses the value 10 directly'; push(f.stmt[1].slice(0, -1) + ': Again the value 10 is used directly. No matter how many times the constant is read, the class is not initialized.'); }
    else { st.eff = 'Does not trigger initialization'; st.to = T; push(f.stmt[1].slice(0, -1) + ': This does not trigger initialization this time either. The class is already loaded, so it is not loaded again.'); }
    print('second use done'); st.stmt = 'println("second use done");'; st.eff = 'Done'; st.to = '';
    push('System.out.println("second use done"): The program ends. Number of times the static initializers ran: Parent ' + st.pn + ', Child ' + st.cn + '.');
    var word = function (n) { return n ? 'Ran once' : 'Did not run'; };
    if (U === 'const') sum.push('A field that is static final and whose value is fixed at compile time, as with a number or string literal, is a "compile-time constant". The compiler puts the value directly into the code that uses the constant, so the class is not used at run time. This is why, if you change only the constant and recompile only that class, the old value stays in the code that uses it.');
    if (U === 'finalrt') sum.push('Not every static final field is a constant. A field whose value comes from a method call gets its value at run time, so the class must be initialized before the field can be read.');
    if (U === 'array' || U === 'classlit') sum.push('Loading a class and initializing it are different stages. Creating an array or using .class needs only the information about the class, so the class is only loaded and its static initializer does not run.');
    if (f.active && !(f.member && f.owner !== T)) sum.push('Creating an object, calling a static method, and using a static field that is not a constant are the uses that cause a class to be initialized. The class is initialized only the first time, and after that the static initializer does not run again.');
    if (f.inits.length === 2) sum.push('When a subclass is initialized, its superclass is initialized first. This is why the output order is always "Parent init" and then "Child init".');
    if (f.member && f.owner !== T && f.active) sum.push('Using a static member that is declared in the superclass through the name of the subclass initializes only the superclass. Even if you write Child.' + mname + ', the static initializer of Child does not run.');
    if (c.cls === 'parent' && f.active) sum.push('Using a superclass does not make its subclass ready. Child was not even loaded.');
    return { events: ev, summary: sum, seq: seq, row: [word(st.pn), word(st.cn), f.loads.length ? f.loads.join(', ') : 'None', st.out.join(' → ')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    var word = { none: 'Not loaded yet', loaded: 'Loaded (not initialized yet)', init: 'Initialized' }, cl = { none: '', loaded: 'hot', init: 'good' };
    H.table(v, ['Class', 'State', 'Static initializer runs'], [
      { cls: s.P === 'none' ? 'gone' : '', cells: ['Parent', { v: word[s.P], cls: cl[s.P] }, s.pn + ''] },
      { cls: s.C === 'none' ? 'gone' : '', cells: ['Child', { v: word[s.C], cls: cl[s.C] }, s.cn + ''] },
    ], 'Classes the JVM has prepared');
  },
  // Diagram: on the left, the line of main that just ran; on the right, the state of the two classes the JVM has prepared (not loaded, loaded, initialized); at the bottom, the lines printed.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { P: 'none', C: 'none', pn: 0, cn: 0, out: [], stmt: '', eff: 'Click Run to start', to: '' };
    var word = { none: 'not loaded', loaded: 'loaded only', init: 'initialized' }, cl = { none: 'ghost', loaded: 'hot', init: 'good' };
    P.size(680, 280);
    P.region('rc', 16, 16, 290, 172, 'Line of main that just ran');
    P.box('stmt', 30, 62, 262, 76, { cls: s.stmt ? 'wait' : 'ghost', title: s.stmt ? P.fit(s.stmt, 244, 13) : '(not started yet)', sub: s.eff, mono: true });
    P.region('rj', 334, 16, 330, 172, 'Classes the JVM has prepared');
    P.box('cP', 350, 48, 298, 50, { cls: cl[s.P] + (s.to === 'Parent' ? ' now' : ''), title: 'Parent', right: word[s.P], sub: 'static initializer ran ' + s.pn + '×' });
    P.box('cC', 350, 126, 298, 50, { cls: cl[s.C] + (s.to === 'Child' ? ' now' : ''), title: 'Child', right: word[s.C], sub: 'static initializer ran ' + s.cn + '×' });
    P.arrow('ext', 'cC:t', 'cP:b', { cls: 'mut', label: 'extends' });
    if (s.to) P.arrow('use', 'stmt:r', (s.to === 'Parent' ? 'cP' : 'cC') + ':l', { cls: s[s.to === 'Parent' ? 'P' : 'C'] === 'init' ? 'good' : 'hot', label: 'uses' });
    P.text('ot', 16, 212, 'Lines printed (in order from the left)', { cls: 'mut' });
    ['main starts', 'Parent init', 'Child init', 'first use done', 'second use done'].forEach(function (x, i) {
      var k = s.out.indexOf(x);
      if (k >= 0) P.box('o_' + i, 16 + k * 131, 224, 124, 34, { cls: x.indexOf('init') >= 0 ? 'good' : 'plain', title: x, center: true });
    });
    P.note('The bold outline marks the class that the line that just ran uses.');
  },
  assume: 'For each of the 18 combinations, source code identical to the code on the screen was newly compiled and run on JDK 21 in our test environment, and the order of the printed lines and the classes that were loaded were checked against the model. The point at which each class was loaded was checked against the JVM log obtained with the -Xlog:class+load option. When initialization happens is defined by the Java Language Specification, so it is the same on every JVM. When a class is loaded, in contrast, is left to the JVM implementation, so "a class is loaded when it is first used" and "a class is not even loaded when only a constant is read" are behaviors confirmed on the JVM of our test environment (HotSpot). That reading the constant is compiled into the value 10 was confirmed by looking at the bytecode with javap. The detailed steps that a class goes through after loading and before initialization, such as verification and preparation, and the initialization rules for Class.forName and for interfaces are not covered.',
});
