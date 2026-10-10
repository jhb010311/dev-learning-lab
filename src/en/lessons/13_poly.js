Lab.register({
  id: 'poly', nav: 'Polymorphism and method selection', cat: 'Java language', mode: 'step',
  title: 'Who decides which method runs, and when?',
  intro: 'The declared type of a variable and the type of the object that it actually holds can be different. An overridden method is chosen at run time by looking at the actual object, but overloading, static methods, and fields are decided at compile time from the declared type alone. Change the combination and try to predict the result.',
  terms: ['Polymorphism', 'Overriding', 'Overloading', 'static', 'Inheritance'], ranks: ['oop', 'absint'],
  controls: [
    { id: 'v', label: 'Declared type of the variable', type: 'select', value: 'Animal', options: [['Animal', 'Animal a'], ['Dog', 'Dog a']] },
    { id: 'o', label: 'Object actually assigned', type: 'select', value: 'Dog', options: [['Animal', 'new Animal()'], ['Dog', 'new Dog()']] },
    { id: 'w', label: 'What is done with the variable', type: 'select', value: 'override', options: [['override', 'Call an overridden method: a.sound()'], ['overload', 'Pass it as an argument to an overloaded method: printer.print(a)'], ['static', 'Call a static method: a.info()'], ['field', 'Read a field: a.name']] },
  ],
  presets: [
    { t: 'Default settings', d: 'A Dog object in an Animal variable. For the overridden method, the one in Dog runs.', v: { v: 'Animal', o: 'Dog', w: 'override' } },
    { t: 'Passing the same variable to an overloaded method', d: 'print(Animal) is selected even though the actual object is a Dog.', v: { v: 'Animal', o: 'Dog', w: 'overload' } },
    { t: 'A static method', d: 'It is not overridden. The one in the declared type is called.', v: { v: 'Animal', o: 'Dog', w: 'static' } },
    { t: 'A field', d: 'Polymorphism does not apply to fields either.', v: { v: 'Animal', o: 'Dog', w: 'field' } },
    { t: 'Changing the declared type to Dog', d: 'With overloading, print(Dog) is selected.', v: { v: 'Dog', o: 'Dog', w: 'overload' } },
    { t: 'An Animal object in a Dog variable', d: 'This does not compile.', v: { v: 'Dog', o: 'Animal', w: 'override' } },
  ],
  code: function (c) {
    var use = { override: 'a.sound();', overload: 'new Printer().print(a);', static: 'a.info();          // not a recommended way to call it', field: 'System.out.println(a.name);' }[c.w];
    return 'class Animal {\n    String name = "animal";\n    void sound()       { System.out.println("Animal.sound"); }\n    static void info() { System.out.println("Animal.info"); }\n}\nclass Dog extends Animal {\n    String name = "dog";                // a field with the same name\n    @Override\n    void sound()       { System.out.println("Dog.sound"); }\n    static void info() { System.out.println("Dog.info"); }\n}\nclass Printer {\n    void print(Animal x) { System.out.println("print(Animal)"); }\n    void print(Dog x)    { System.out.println("print(Dog)"); }\n}\n\n' + c.v + ' a = new ' + c.o + '();\n' + use;
  },
  label: function (c) { return c.v + ' a = new ' + c.o + '() · ' + { override: 'a.sound()', overload: 'print(a)', static: 'a.info()', field: 'a.name' }[c.w]; },
  columns: ['Output', 'When it was decided', 'Type it was based on'],
  out: function (c) {
    if (c.v === 'Dog' && c.o === 'Animal') return 'Compile-time error';
    if (c.w === 'override') return c.o + '.sound';
    if (c.w === 'overload') return 'print(' + c.v + ')';
    if (c.w === 'static') return c.v + '.info';
    return c.v === 'Animal' ? 'animal' : 'dog';
  },
  simulate: function (c) {
    var ev = [], out = this.out(c), sum = [], when, basis;
    function push(s, k, snap) { ev.push({ s: s, k: k, snap: snap }); }
    var base = { decl: c.v, obj: c.o, stage: 'Compile', pick: '', out: '' };
    if (out === 'Compile-time error') {
      push('Compile time: The code tries to assign an Animal object to a variable of type Dog. Every Dog is an Animal, but not every Animal is a Dog, so the compiler does not allow the assignment.', 'bad', { decl: c.v, obj: '(cannot be assigned)', stage: 'Compile', pick: 'Compile-time error: incompatible types', out: '' });
      sum.push('Assigning a subclass object to a variable of the superclass type (implicit casting) is allowed, but the reverse is not. The program does not even run.');
      return { events: ev, summary: sum, row: ['Compile-time error', 'At compile time', 'declared type'] };
    }
    push('Compile time: ' + c.v + ' a = new ' + c.o + '(). The declared type of the variable a is ' + c.v + ', and when the code runs, an object of class ' + c.o + ' is created on the heap.' + (c.v !== c.o ? ' The two are different.' : ''), '', base);
    if (c.w === 'override') {
      when = 'At run time'; basis = 'actual object (' + c.o + ')';
      push('Compile time: The compiler checks only whether the declared type ' + c.v + ' has sound(). It does not decide which class\'s sound() will run, and it leaves only the instruction "call sound()".', '', { decl: c.v, obj: c.o, stage: 'Compile', pick: c.v + ' has sound() → OK', out: '' });
      push('Run time: The JVM checks the class of the actual object that a refers to (' + c.o + '), and it finds and runs the sound() of that class (dynamic method lookup).', 'good', { decl: c.v, obj: c.o, stage: 'Run', pick: c.o + '.sound()', out: out });
      sum.push('An overridden instance method is selected by the type of the actual object, not by the declared type of the variable. This is polymorphism, and it is the principle that lets Spring run an implementation that was injected as an interface type.');
    } else {
      when = 'At compile time'; basis = 'declared type (' + c.v + ')';
      if (c.w === 'overload') { push('Compile time: There are two print methods. The compiler looks only at the declared type of the argument a, which is ' + c.v + ', and chooses print(' + c.v + '). This choice is fixed in the bytecode (static binding).', '', { decl: c.v, obj: c.o, stage: 'Compile', pick: 'print(' + c.v + ')', out: '' }); push('Run time: The print(' + c.v + ') that was already chosen runs. The fact that the object actually held in a is of class ' + c.o + ' is not used to select the method.', c.v !== c.o ? 'bad' : 'good', { decl: c.v, obj: c.o, stage: 'Run', pick: 'print(' + c.v + ')', out: out }); sum.push('Overloaded methods are different methods that only share a name, and which one is called is decided at compile time by the declared type of the argument. The type of the actual object has no effect.'); }
      if (c.w === 'static') { push('Compile time: info() is a static method. A static method belongs to the class, not to an object, so the compiler turns a.info() into ' + c.v + '.info(), according to the declared type.', '', { decl: c.v, obj: c.o, stage: 'Compile', pick: c.v + '.info()', out: '' }); push('Run time: ' + c.v + '.info() runs. Dog also has info(), but this is not overriding. It is a separate method with the same name that hides the one in the superclass (hiding).', c.v !== c.o ? 'bad' : 'good', { decl: c.v, obj: c.o, stage: 'Run', pick: c.v + '.info()', out: out }); sum.push('Static methods are not overridden. Calling a static method through a variable is therefore confusing, and the rule is to call it with the class name.'); }
      if (c.w === 'field') { push('Compile time: Unlike a method call, a field access is decided by the declared type. The compiler resolves a.name to the name field of the ' + c.v + ' class.', '', { decl: c.v, obj: c.o, stage: 'Compile', pick: c.v + '\'s name field', out: '' }); push('Run time: The value of name in ' + c.v + ', "' + out + '", is read.' + (c.o === 'Dog' ? ' A Dog object contains both the name of Animal and the name of Dog, and the declared type determines which one is read.' : ''), c.v !== c.o ? 'bad' : 'good', { decl: c.v, obj: c.o, stage: 'Run', pick: c.v + '\'s name field', out: out }); sum.push('Polymorphism does not apply to fields. This is one of the reasons to access a field through a method (a getter) instead of exposing it directly.'); }
    }
    sum.unshift('Output: ' + out + '. ' + when + ', this was decided based on the ' + basis + '.');
    return { events: ev, summary: sum, row: [out, when, basis] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from compilation.'); return; }
    H.title(v, 'Variable and object'); var ln = H.lanes(v);
    H.lane(ln, 'Declared type', s.decl + ' (what the compiler knows)', 'wait');
    H.lane(ln, 'Actual object', s.obj + (s.obj.indexOf('(') < 0 ? ' (known only when the code runs)' : ''), s.obj.indexOf('(') === 0 ? 'bad' : 'good');
    H.table(v, ['Stage', 'Selected target'], [{ cells: [s.stage + ' time', { v: s.pick || 'not decided yet', cls: s.pick.indexOf('error') >= 0 ? 'bad' : s.pick ? 'hot' : '' }] }], 'Current stage');
    H.counters(v, [[s.out || '(not run yet)', 'Console output']]);
  },
  // Diagram: the variable (declared type) and the object (actual type) at the top, and two candidates at the bottom. The key point is which side the arrow that selects a candidate starts from.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { decl: c.v, obj: c.o, stage: '', pick: '', out: '' }, err = s.obj.charAt(0) === '(';
    P.size(680, 300);
    P.region('st', 16, 16, 250, 92, 'Stack');
    P.region('hp', 414, 16, 250, 92, 'Heap');
    P.box('var', 30, 50, 222, 44, { cls: 'wait', title: 'a', sub: 'Declared type: ' + s.decl });
    P.box('obj', 428, 50, 222, 44, err ? { cls: 'bad', title: 'Animal object', sub: 'Cannot be assigned to Dog' } : { cls: 'good', title: s.obj + ' object', sub: 'Actual type: ' + s.obj });
    if (!err) P.arrow('pt', 'var:r', 'obj:l', { label: 'refers to' });
    var names = { override: ['sound() in Animal', 'sound() in Dog (overrides)'], overload: ['print(Animal a)', 'print(Dog d)'], static: ['Animal.info() (static)', 'Dog.info() (static)'], field: ['Animal\'s name field', 'Dog\'s name field'] }[c.w];
    P.region('cand', 16, 132, 648, 100, { override: 'Methods that can run', overload: 'The two methods of Printer', static: 'The static methods of the two classes', field: 'The two fields inside the object' }[c.w]);
    var pick = err || !s.pick ? '' : /Dog/.test(s.pick) ? 'D' : /Animal/.test(s.pick) ? 'A' : '', late = c.w === 'override' && s.stage === 'Run', chosen = late || c.w !== 'override';
    [['A', 30], ['D', 344]].forEach(function (m, i) { var on = pick === m[0]; P.box('m' + m[0], m[1], 168, 306, 48, { cls: on ? (chosen ? 'hot now' : 'wait') : 'plain', title: names[i], sub: on ? (chosen ? 'This one is selected' : 'Only checked that it exists') : ' ' }); });
    if (pick) P.arrow('sel', (late ? 'obj' : 'var') + ':b', 'm' + pick + ':t', { cls: late ? 'good' : chosen ? 'hot' : 'dash mut', label: late ? 'by actual object type (at run time)' : chosen ? 'by declared type (at compile time)' : 'checks that the declared type has it' });
    P.box('out', 16, 248, 648, 34, { cls: s.out ? 'plain' : 'ghost', title: 'Console output', right: s.out || (err ? 'not run because of the compile-time error' : 'not run yet') });
    P.note('When the arrow that selects a candidate below starts from the variable on the left (the declared type), the choice was made at compile time, and when it starts from the object on the right (the actual type), the choice was made at run time. Only for an overridden method does the arrow start from the object.');
  },
  assume: 'The output of every combination was checked against the result of actually compiling and running the same code on JDK 21 on this PC. Calling a static method through a variable, as in a.info(), is allowed by the syntax but is not a recommended practice, and it is included here to show that the call is decided by the declared type.',
});
