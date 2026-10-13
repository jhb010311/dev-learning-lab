Lab.register({
  id: 'inherit', nav: 'Inheritance and overriding', cat: 'Java language', mode: 'step',
  title: 'When does the superclass constructor run when a subclass object is created?',
  intro: 'A single object of a subclass contains both the fields inherited from the superclass and the fields that the subclass declares. When you use new, the superclass constructor finishes first, and only then do the field initializers and the constructor body of the subclass run. Because of this order, there are cases in which you must write super(...), and when the superclass constructor calls an overridden method, that method sees subclass fields that are still empty.',
  terms: ['Inheritance', 'Overriding', 'Constructor', 'super', 'Default values of fields'],
  controls: [
    { id: 'pctor', label: 'Constructors declared in the superclass Animal', type: 'select', value: 'arg', options: [['noarg', 'Only Animal()'], ['arg', 'Only Animal(String name)'], ['both', 'Animal() and Animal(String name)']] },
    { id: 'sup', label: 'First line of the subclass constructor Dog()', type: 'select', value: 'arg', options: [['omit', 'super is not written'], ['noarg', 'super();'], ['arg', 'super("Buddy");']] },
    { id: 'pcall', label: 'The Animal constructor calls describe()', type: 'check', value: true, hint: 'describe() is a method that Dog overrides.' },
    { id: 'sm', label: 'describe() in Dog calls super.describe()', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'In what order does new Dog() run when the Animal constructor calls describe() and the first line of Dog() is super("Buddy");?', d: 'The superclass constructor calls describe(). sound is assigned "Woof", yet sound=null is printed.', v: { pctor: 'arg', sup: 'arg', pcall: true, sm: false } },
    { t: 'Only the order of execution', q: 'What if you turn off the call to describe() in the Animal constructor?', d: 'The order is the superclass constructor, the field initializer of the subclass, and then the body of the subclass constructor.', v: { pctor: 'arg', sup: 'arg', pcall: false, sm: false } },
    { t: 'Without super', q: 'What if Animal declares only Animal(), Dog() does not write super, and the Animal constructor does not call describe()?', d: 'The compiler inserts super(), which calls Animal() of the superclass.', v: { pctor: 'noarg', sup: 'omit', pcall: false, sm: false } },
    { t: 'Without super when the superclass has no Animal()', q: 'What if Animal declares only Animal(String name), Dog() does not write super, and the Animal constructor does not call describe()?', d: 'The automatically inserted super() has no constructor to call, so this is a compile-time error.', v: { pctor: 'arg', sup: 'omit', pcall: false, sm: false } },
    { t: 'Calling the superclass method too, with super.describe()', q: 'What if describe() in Dog calls super.describe() and the Animal constructor does not call describe()?', d: 'Inside the overriding method, the original behavior of the superclass runs first.', v: { pctor: 'arg', sup: 'arg', pcall: false, sm: true } },
    { t: 'When the superclass has two constructors', q: 'What if Animal declares both Animal() and Animal(String name), and the first line of Dog() is super("Buddy");?', d: 'The superclass constructor that matches the arguments passed to super is selected.', v: { pctor: 'both', sup: 'arg', pcall: false, sm: false } },
  ],
  code: function (c) {
    var bad = this.bad(c), call = c.pcall ? '        describe();                // calls an overridden method from the constructor\n' : '';
    var noArg = '    Animal() {\n        name = "unnamed";\n        System.out.println("Animal() runs");\n' + call + '    }\n';
    var withArg = '    Animal(String name) {\n        this.name = name;\n        System.out.println("Animal(String) runs");\n' + call + '    }\n';
    var animal = 'class Animal {\n    String name;\n\n' + (c.pctor === 'noarg' ? noArg : c.pctor === 'arg' ? withArg : noArg + '\n' + withArg) + '\n    void describe() {\n        System.out.println("name=" + name);\n    }\n}\n';
    var first = c.sup === 'noarg' ? '        super();' + (bad ? '                   // compile-time error: there is no Animal()' : '                   // calls Animal() of the superclass') + '\n' : c.sup === 'arg' ? '        super("Buddy");' + (bad ? '            // compile-time error: there is no Animal(String)' : '            // calls Animal(String) of the superclass') + '\n' : '';
    var dog = 'class Dog extends Animal {\n    String sound = "Woof";\n\n    Dog() {' + (c.sup === 'omit' ? (bad ? '                        // compile-time error: the automatically inserted super() has no Animal() to call' : '                        // super() is inserted automatically as the first line') : '') + '\n' + first + '        System.out.println("Dog() runs");\n    }\n\n    @Override\n    void describe() {\n' + (c.sm ? '        super.describe();          // runs describe() of the superclass first\n' : '') + '        System.out.println("sound=" + sound);\n    }\n}\n';
    return animal + '\n' + dog + '\nDog d = new Dog();\nd.describe();';
  },
  label: function (c) { return { noarg: 'Animal()', arg: 'Animal(String)', both: 'two constructors' }[c.pctor] + ' · ' + { omit: 'no super', noarg: 'super()', arg: 'super("Buddy")' }[c.sup] + (c.pcall ? ' · superclass constructor calls describe()' : '') + (c.sm ? ' · super.describe()' : ''); },
  columns: ['Compilation', 'Output during new Dog()', 'Output of d.describe()'],
  // Is this a combination that does not compile because Animal does not have the superclass constructor that Dog() tries to call?
  bad: function (c) { return c.sup === 'arg' ? c.pctor === 'noarg' : c.pctor === 'arg'; },
  simulate: function (c) {
    var ev = [], sum = [], wantArg = c.sup === 'arg', pName = wantArg ? 'Animal(String name)' : 'Animal()', pShort = wantArg ? 'Animal(String)' : 'Animal()', nameVal = wantArg ? 'Buddy' : 'unnamed';
    var st = { made: false, name: '', sound: '', stack: [], cur: '', done: [], out1: [], out2: [], phase: '', err: '', d: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function out(line) { (st.phase === 'call' ? st.out2 : st.out1).push(line); }
    function did(id) { if (st.done.indexOf(id) < 0) st.done.push(id); }
    var ERR = 'constructor Animal in class Animal cannot be applied to given types', supTxt = c.sup === 'arg' ? 'super("Buddy")' : 'super()';
    var e1 = 'Compilation: The compiler looks at the first line of the constructor Dog(). ' + (c.sup === 'omit' ? 'super(...) is not written, so the compiler inserts super() at the very beginning. This means that the no-argument superclass constructor Animal() will be called.' : c.sup === 'noarg' ? 'super() means that the no-argument superclass constructor Animal() will be called. It is the same code that the compiler inserts when you do not write it.' : 'super("Buddy") means that the superclass constructor Animal(String name), which takes one string, will be called.');
    if (this.bad(c)) {
      push(e1);
      st.err = ERR;
      push('Compilation: The compiler looks for the constructor ' + pName + ' in the Animal class. Animal has only ' + (c.pctor === 'arg' ? 'Animal(String name)' : 'Animal()') + '. ' + (c.pctor === 'arg' ? 'This is because a class that declares a constructor itself does not get a default constructor. ' : '') + 'There is no superclass constructor to call, so this is a compile-time error. The program does not run.', 'bad');
      sum.push('This is a compile-time error. The javac message is "' + ERR + '", which means "the constructor of Animal cannot be called with these arguments".');
      if (c.pctor === 'arg') { sum.push('A subclass constructor always calls one superclass constructor first. ' + (c.sup === 'omit' ? 'If you do not write super(...), super() is inserted automatically' : 'super() looks for the no-argument constructor') + ', and if the superclass has no no-argument constructor, there is nothing to call.'); sum.push('When the superclass has only Animal(String name), you must call it yourself by passing an argument on the first line of the subclass constructor, as in super("Buddy"). The same error occurs even if Dog declares no constructors at all, because the default constructor that is created automatically also calls super().'); }
      else sum.push('The superclass must have a constructor that matches the arguments passed to super(...). Animal has no constructor that takes a string.');
      return { events: ev, summary: sum, row: ['Error: ' + ERR, 'Not run', 'Not run'] };
    }
    push(e1 + ' Animal has this constructor, so the code compiles.');
    st.made = true; st.name = 'null'; st.sound = 'null'; st.phase = 'new';
    push('new Dog() runs: Memory for one Dog object is allocated on the heap. This object contains both name, inherited from Animal, and sound, declared by Dog, and both are set to their default value, null.');
    st.stack = ['Dog()']; st.cur = 'cc';
    push('The first line of the constructor Dog(), ' + supTxt + (c.sup === 'omit' ? ' (inserted by the compiler)' : '') + ': Before the field initializer and the constructor body of Dog run, control first passes to the superclass constructor, ' + pName + '. This is because the inherited part must be ready first for the subclass to be able to use it.');
    st.stack.push(pShort); st.cur = 'pc'; st.name = '"' + nameVal + '"';
    push(wantArg ? 'this.name = name in the body of Animal(String name): The "Buddy" that was passed in is assigned to name. sound is still null.' : 'name = "unnamed" in the body of Animal(): name is set to "unnamed". sound is still null.');
    out(pShort + ' runs');
    push('System.out.println("' + pShort + ' runs"): The body of the superclass constructor is running. Not a single line of the body of the Dog() constructor has run yet.');
    function describe() {
      var pre = st.phase === 'call' ? 'Called through d.describe(), ' : '';
      st.stack.push('Dog.describe()'); st.cur = 'cd';
      if (c.sm) {
        st.stack.push('Animal.describe()'); st.cur = 'pd'; out('name=' + nameVal);
        push(pre + 'super.describe() on the first line of describe() in Dog: Writing super. calls the overridden method of the superclass. describe() of Animal runs and prints the line name=' + nameVal + '.');
        st.stack.pop(); st.cur = 'cd'; pre = '';
      }
      var isNull = st.sound === 'null';
      out('sound=' + st.sound.replace(/"/g, ''));
      push(isNull ? 'println("sound=" + sound) inside describe() in Dog: The field initializer of Dog, sound = "Woof", runs only after the superclass constructor finishes. Right now sound has its default value, null, so the output is sound=null.' : pre + 'println("sound=" + sound) inside describe() in Dog: The object has been fully created by now, so sound holds "Woof". The output is sound=Woof.', isNull ? 'bad' : 'good');
      st.stack.pop();
    }
    if (c.pcall) {
      st.stack.push('Dog.describe()'); st.cur = 'cd';
      push(pName + ' calls describe() in its body: Which describe() runs is determined by the type of the actual object that is being created now. The actual object is a Dog, so the describe() that Dog overrides runs, even though the call is made inside the superclass constructor.');
      st.stack.pop();
      describe(); st.cur = 'pc';
    }
    st.stack.pop(); did('pc'); st.cur = 'cf'; st.sound = '"Woof"';
    push('The field initializer of Dog, String sound = "Woof": The superclass constructor has finished, and control is back in Dog(). Only now does the field initializer of Dog run, and sound is set to "Woof".');
    did('cf'); st.cur = 'cc'; out('Dog() runs');
    push('System.out.println("Dog() runs"): The body of the Dog() constructor runs. The body of the subclass constructor comes last of all.');
    st.stack = []; did('cc'); st.cur = ''; st.d = true; st.phase = 'call';
    push('Dog d = new Dog(): All the constructors have finished. The reference to the completed object is stored in the variable d.');
    describe(); st.cur = ''; st.stack = [];
    var o1 = st.out1.join(' / '), o2 = st.out2.join(' / ');
    sum.push('The order of execution is: the superclass constructor ' + pName + ' → the field initializer of Dog → the body of the Dog() constructor. The subclass constructor starts first, but on its first line it passes control to the superclass constructor, so the superclass side finishes first.');
    if (c.sup === 'omit') sum.push('The superclass constructor runs even if you do not write super(...), because the compiler inserts super() on the first line of Dog().' + (c.pctor === 'both' ? ' Animal has two constructors, but the one that matches super() is the no-argument Animal().' : ''));
    if (c.sup !== 'omit' && c.pctor === 'both') sum.push('When the superclass has several constructors, the one that matches the arguments passed to super(...) is selected. The call is ' + supTxt + ', so the constructor ' + pName + ' ran.');
    if (c.pcall) { sum.push('Pitfall: The describe() that the superclass constructor called is the one that Dog overrides, and at that point sound in Dog is not initialized yet, so it is null. Even though the code says sound = "Woof", sound=null was printed. If a method had been called on the field that is null, a NullPointerException would have been thrown.'); sum.push('For this reason, the rule is that a constructor does not call methods that a subclass can override. The output of d.describe(), called after the object was fully created, is sound=Woof, as it should be.'); }
    if (c.sm) sum.push('super.describe() runs the original behavior of the superclass as it is. Overriding replaces the superclass method completely, but calling the superclass method first like this has the effect of adding the behavior of the subclass on top of it.');
    else sum.push('Dog overrides describe(), so describe() of Animal does not run. name was not printed. To run the superclass method as well, call super.describe() inside describe() of Dog.');
    return { events: ev, summary: sum, row: ['Success', o1, o2] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go one step at a time, starting from compilation.'); return; }
    if (s.err) { H.title(v, 'Compile-time error'); H.text(v, 'javac: ' + s.err); return; }
    H.table(v, ['Field', 'Declared in', 'Current value'], s.made ? [
      { cells: ['name', 'Animal (inherited)', { v: s.name, cls: s.name === 'null' ? '' : 'good' }] },
      { cells: ['sound', 'Dog', { v: s.sound, cls: s.sound === 'null' ? (String(s.stack[s.stack.length - 1]).indexOf('describe') >= 0 ? 'bad' : '') : 'good' }] },
    ] : [], 'Dog object on the heap (one)');
    if (!s.made) H.text(v, 'No object has been created yet.');
  },
  // Diagram: pieces of code of the subclass Dog on the left, pieces of code of the superclass Animal in the middle, and one object on the heap on the right (the inherited name and its own sound). Arrows show the call passing from Dog to Animal and then back to describe() in Dog.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { made: false, name: '', sound: '', stack: [], cur: '', done: [], out1: [], out2: [], phase: '', err: '', d: false };
    var bad = this.bad(c), wantArg = c.sup === 'arg', top = s.stack[s.stack.length - 1] || '';
    P.size(680, 314);
    P.region('rd', 16, 16, 190, 190, 'Subclass Dog');
    P.region('ra', 250, 16, 190, 190, 'Superclass Animal');
    P.region('hp', 462, 16, 202, 136, 'Heap: one Dog object');
    function cls(id) { return s.cur === id ? 'hot now' : (id === 'cc' && s.stack[0] === 'Dog()') || (id === 'pc' && s.stack.length > 1 && /^Animal\(/.test(s.stack[1])) ? 'wait' : s.done.indexOf(id) >= 0 ? 'good' : 'plain'; }
    P.box('cc', 24, 50, 174, 40, { cls: cls('cc'), title: 'Constructor Dog()', sub: c.sup === 'omit' ? 'super() is inserted' : c.sup === 'noarg' ? 'super();' : 'super("Buddy");' });
    P.box('cf', 24, 100, 174, 40, { cls: cls('cf'), title: 'Field initializer', sub: 'sound = "Woof"' });
    P.box('cd', 24, 150, 174, 40, { cls: s.cur === 'cd' ? 'hot now' : 'plain', title: 'Overrides describe()', sub: c.sm ? 'Runs super.describe()' : 'Prints only sound' });
    var have = c.pctor === 'both' ? (wantArg ? 'arg' : 'noarg') : c.pctor, tA = 'Animal(String name)', t0 = 'Animal()';
    P.box('pc', 258, 50, 174, 40, { cls: s.err ? 'plain' : cls('pc'), title: have === 'arg' ? tA : t0, sub: c.pcall ? 'Also calls describe()' : 'Sets name' });
    if (bad) P.box('p2', 258, 100, 174, 40, { cls: s.err ? 'bad' : 'ghost', title: 'No ' + (wantArg ? 'Animal(String)' : t0), sub: 'Called from Dog()' });
    else if (c.pctor === 'both') P.box('p2', 258, 100, 174, 40, { cls: 'ghost', title: wantArg ? t0 : tA, sub: 'Not called this time' });
    P.box('pd', 258, 150, 174, 40, { cls: s.cur === 'pd' ? 'hot now' : 'plain', title: 'describe()', sub: 'Prints name' });
    if (s.made) {
      P.box('fn', 470, 50, 186, 40, { cls: s.name === 'null' ? 'wait' : 'good', title: 'name', sub: 'Animal part', right: s.name });
      P.box('fs', 470, 100, 186, 40, { cls: s.sound === 'null' ? (top.indexOf('describe') >= 0 ? 'bad' : 'wait') : 'good', title: 'sound', sub: 'Dog part', right: s.sound });
    } else {
      P.box('fn', 470, 50, 186, 40, { cls: 'ghost', title: 'name', sub: s.err ? 'not run' : 'no object yet' });
      P.box('fs', 470, 100, 186, 40, { cls: 'ghost', title: 'sound', sub: s.err ? 'not run' : 'no object yet' });
    }
    P.box('vd', 470, 174, 186, 32, { cls: s.d ? 'wait' : 'ghost', title: 'Variable d', right: s.d ? '→ object' : s.err ? 'none' : 'not set yet' }); if (s.d) P.arrow('ad', 'vd:t', 'hp:b', {});
    if (s.stack.length > 1 && /^Animal\(/.test(s.stack[1])) P.arrow('a1', 'cc:r:0.35', 'pc:l:0.35', { cls: 'hot', label: 'super' });
    if (s.phase === 'new' && s.stack.indexOf('Dog.describe()') >= 0) P.arrow('a2', 'pc:l:0.8', 'cd:r:0.3', { cls: 'bad' });
    if (top === 'Animal.describe()') P.arrow('a3', 'cd:r:0.7', 'pd:l:0.7', { cls: 'hot', label: 'super.' });
    var o1 = s.out1.join(' / '), o2 = s.out2.join(' / ');
    P.box('o1', 16, 222, 648, 34, { cls: s.err ? 'bad' : !o1 ? 'ghost' : s.out1.indexOf('sound=null') >= 0 ? 'bad' : 'plain', title: s.err ? 'Compile-time error' : 'Output during new Dog()', right: s.err ? 'no superclass constructor to call' : o1 || 'none yet' });
    P.box('o2', 16, 264, 648, 34, { cls: s.err ? 'ghost' : o2 ? 'good' : 'ghost', title: 'Output of d.describe()', right: s.err ? 'not run' : o2 || 'none yet' });
    P.note('There is one object, and it contains both name, inherited from the superclass, and sound, which belongs to the subclass. A yellow box is the code that is running now, and a blue box is code that made a call and is waiting. The red arrow shows the describe() call made by the superclass constructor going to the one in the subclass Dog.');
  },
  assume: 'All 36 combinations were actually compiled and run with the same code on JDK 21 on this PC, and the compilation result, the error message, the output while the object is being created, and the output of d.describe() were checked against the results. It was also confirmed by compiling that the same error occurs when the subclass declares no constructor and the superclass has no no-argument constructor, and that super(...) must be the first statement of a constructor (as of JDK 21). In newer JDKs this is said to have changed so that some statements can come before super(...), but this was not verified on this PC. Simplifications: the constructor of Animal also calls the constructor of its own superclass, Object, before anything else, and this step is left out. The detailed rules for which method is selected are covered in the "Polymorphism and method selection" lab. The error message is the first line of the English message from javac.',
});
