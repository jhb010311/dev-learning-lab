Lab.register({
  id: 'inherit_basic', nav: 'Inheritance', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['inherit'],
  title: 'What does a class inherit through extends?',
  intro: 'Inheritance is syntax in which you write extends and another class after the class name, as in class Dog extends Animal. The Animal after extends is the superclass, Dog is the subclass, and Dog inherits the methods and fields written in Animal. So you can call eat(), which is not written in Dog, on a Dog object. If you write an inherited method again in Dog with the same name and the same parameters, the one in Dog runs on a Dog object, and this is overriding. And because you used extends, you can put a Dog object in a variable of type Animal. In this lab you remove extends, write eat() again, and change the type of the variable, and the same code is compiled and run each time. You see what the compiler reports and which eat runs.',
  terms: ['Inheritance', 'extends', 'Superclass and subclass', 'Overriding'],
  controls: [
    { id: 'ext', label: 'Write extends Animal in Dog', type: 'check', value: true },
    { id: 'over', label: 'Write eat() again in Dog', type: 'check', value: false },
    { id: 'var', label: 'What is put in the variable d', type: 'select', value: 'dog', options: [['dog', 'Put it in with Dog d = new Dog();'], ['animal', 'Put it in with Animal d = new Dog();']] },
  ],
  // q is the question shown in the question-style screen; t and d are the name and description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does extends look like, and what happens when you call eat(), which is not written in Dog?', d: 'Dog inherits from Animal. Compilation succeeds and the eat written in Animal runs.', v: { ext: true, over: false, var: 'dog' } },
    { t: 'Remove extends Animal', q: 'What if you remove extends Animal?', d: 'Dog has only what it writes itself, so you cannot call eat(), and there is a compile-time error.', v: { ext: false, over: false, var: 'dog' } },
    { t: 'Write eat() again in Dog', q: 'What if you write eat() again in Dog?', d: 'On a Dog object, the eat written in Dog runs.', v: { ext: true, over: true, var: 'dog' } },
    { t: 'Put it in an Animal-type variable', q: 'What if you put a Dog object in an Animal-type variable?', d: 'You can, because extends is there, and you call the eat written in Animal through this variable.', v: { ext: true, over: false, var: 'animal' } },
    { t: 'Remove extends and use an Animal variable', q: 'What if you remove extends Animal and put the Dog in an Animal variable?', d: 'Dog is not of type Animal, so you cannot put it in, and there is a compile-time error.', v: { ext: false, over: false, var: 'animal' } },
    { t: 'Write it again and use an Animal variable', q: 'What if you write eat() again in Dog and put the Dog in an Animal variable?', d: 'Even if the type of the variable is Animal, the object is a Dog, so the eat written in Dog runs.', v: { ext: true, over: true, var: 'animal' } },
  ],
  // The kinds of error the compiler reports (from the real javac diagnostic codes)
  errNoEat: 'Dog has no eat method',
  errFit: 'Dog is not of type Animal, so it cannot be put in',
  eatName: { animal: 'eat written in Animal', dog: 'eat written in Dog' },
  code: function (c) {
    var o = ['class Animal {', '    void eat() {', '        System.out.println("eats");', '    }', '}', ''];
    if (c.ext) o.push('// Inheritance: Dog inherits what is written in Animal');
    o.push('class Dog' + (c.ext ? ' extends Animal' : '') + ' {', '    void bark() {', '        System.out.println("woof");', '    }');
    if (c.over) o.push('', '    // Write eat(), which Animal also has, again in Dog with the same name', '    void eat() {', '        System.out.println("the dog eats");', '    }');
    o.push('}', '', 'public class Main {', '    public static void main(String[] args) {');
    if (c.var === 'dog') o.push('        Dog d = new Dog();', '        d.eat();', '        d.bark();');
    else o.push('        Animal d = new Dog();', '        d.eat();');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.ext ? 'With extends' : 'Without extends') + ' · ' + (c.over ? 'eat written again in Dog' : 'No eat in Dog') + ' · ' + (c.var === 'dog' ? 'Dog variable' : 'Animal variable'); },
  columns: ['Compile', 'What the compiler reports', 'Output when run', 'eat that ran'],
  simulate: function (c) {
    var ev = [], sum = [], dogVar = c.var === 'dog';
    var ok = c.ext || (dogVar && c.over);
    var first = ok ? '' : dogVar ? this.errNoEat : this.errFit;
    var nerr = ok ? 0 : 1;
    var errAt = ok ? [] : [dogVar ? 'd.eat();' : 'Animal d = new Dog();'];
    var st = { hot: '', bad: {}, obj: false, eat: '', compile: '', errs: 0, errText: '', ran: false, out: [], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errNoEat = this.errNoEat, errFit = this.errFit, eatName = this.eatName;
    var dogOwn = c.over ? 'bark and eat' : 'bark';

    // 1. Read the class Dog line
    st.hot = 'ex';
    if (c.ext) {
      st.checks.push(['Line: class Dog extends Animal', { v: 'Dog inherits from Animal', cls: 'good' }]);
      push('The compiler reads the source from the top. First it reads class Animal and learns that Animal has an eat method. Next it reads the line class Dog extends Animal and remembers that Dog is a subclass of Animal and inherits what is written in Animal. The Animal written after extends is the superclass. Inside Dog, the ' + dogOwn + ' method was written directly.', '');
    } else {
      st.checks.push(['Line: class Dog', { v: 'No extends: unrelated to Animal', cls: '' }]);
      push('The compiler reads the source from the top. First it reads class Animal and learns that Animal has an eat method. Next it reads the line class Dog, and there is no extends, so Dog is a class unrelated to Animal. Inside Dog, the ' + dogOwn + ' method was written directly, and what is written in Animal never comes into Dog. The fact that an eat with the same name is in Animal has nothing to do with Dog.', '');
    }

    // 2. Check the line of the variable d
    st.hot = 'vd';
    if (dogVar) {
      st.checks.push(['Line: Dog d = new Dog();', { v: 'Passes', cls: 'good' }]);
      push('The compiler checks the line Dog d = new Dog();. It puts a Dog object in a variable of type Dog, so there is no problem. The type of the variable d is Dog, so a method called through d is looked up in the Dog type.', 'good');
    } else if (c.ext) {
      st.checks.push(['Line: Animal d = new Dog();', { v: 'Passes: a subclass object goes in a superclass type', cls: 'good' }]);
      push('The compiler checks the line Animal d = new Dog();. Dog is a subclass of Animal through extends Animal, so you can put a Dog object in the variable d of type Animal. The type of the variable d is Animal, so a method called through d is looked up in the Animal type.', 'good');
    } else {
      st.bad.vd = true; fail(errFit);
      st.checks.push(['Line: Animal d = new Dog();', { v: 'Error: Dog is not of type Animal', cls: 'bad' }]);
      push('The compiler checks the line Animal d = new Dog();. Dog has no extends Animal, so Dog is not of type Animal, and you cannot put a Dog object in the variable d of type Animal (javac: incompatible types: Dog cannot be converted to Animal).' + (c.over ? ' It is the same even though Dog has an eat with the same name. Having a method with the same name does not make it that type.' : ''), 'bad');
    }

    // 3. Check the line d.eat();
    if (dogVar) {
      if (c.over) {
        st.hot = 'de';
        st.checks.push(['Line: d.eat();', { v: 'Passes: Dog has eat', cls: 'good' }]);
        push('The compiler checks the line d.eat();. The type of d is Dog, so it looks for the eat method in Dog. eat is written inside Dog, so it passes.' + (c.ext ? ' Animal also has an eat with the same name, but if there is one written in Dog, the one in Dog is used.' : ' Even without extends, this is a method that Dog wrote directly, so you can use it.'), 'good');
      } else if (c.ext) {
        st.hot = 'ae';
        st.checks.push(['Line: d.eat();', { v: 'Passes: eat inherited from Animal', cls: 'good' }]);
        push('The compiler checks the line d.eat();. The type of d is Dog, so it looks for the eat method in Dog, and there is no eat in Dog. Dog inherits from Animal, so it keeps looking in Animal, finds the eat written in Animal, and passes. This is why you can call, on a Dog object, an eat that is not written in Dog.', 'good');
      } else {
        st.hot = 'de'; st.bad.de = true; fail(errNoEat);
        st.checks.push(['Line: d.eat();', { v: 'Error: Dog has no eat', cls: 'bad' }]);
        push('The compiler checks the line d.eat();. The type of d is Dog, so it looks for the eat method in Dog, and there is no eat in Dog. There is no extends, so it cannot keep looking in Animal, and there is an error (javac: cannot find symbol). It does not help that Animal has an eat. This line is the only error reported, and the line d.bark(); is not an error because Dog has bark.', 'bad');
      }
    } else {
      st.hot = 'ae';
      if (c.ext) {
        st.checks.push(['Line: d.eat();', { v: 'Passes: Animal has eat', cls: 'good' }]);
        push('The compiler checks the line d.eat();. The type of d is Animal, so it looks for the eat method in Animal, and eat is written inside Animal, so it passes.' + (c.over ? ' This is as far as the compiler checks. Which class\'s eat runs when the program runs is decided by the object that is held, not by the type of the variable.' : ''), 'good');
      } else {
        st.checks.push(['Line: d.eat();', { v: 'Not an error', cls: '' }]);
        push('The compiler checks the line d.eat();. The type of d is Animal and Animal has eat, so this line by itself is not an error (the only error javac reported is the 1 above). But compilation fails because of the earlier error.', '');
      }
    }

    // 4. Compile result
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compilation succeeds and the Main class file that will run is created. So far the compiler has only checked, line by line, whether things can be used, and eat has not run even once.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: ' + nerr, cls: 'bad' }]);
      push('Compilation fails. The compiler reported ' + nerr + (nerr === 1 ? ' error' : ' errors') + ', and the first one is "' + first + '". The Main class file was not created, so the program cannot run.', 'bad');
    }

    // 5~7. Run
    var eat = '';
    if (ok) {
      st.hot = 'ob'; st.obj = true;
      push('You run it with java Main. main starts, and new Dog() creates a Dog object and puts it in the variable d.' + (dogVar ? '' : ' The type of the variable d is Animal, but the object that was created is a Dog object.'), '');
      eat = c.over ? 'dog' : 'animal';
      st.hot = c.over ? 'de' : 'ae'; st.eat = eat;
      st.out.push(c.over ? 'the dog eats' : 'eats');
      st.checks.push(['What d.eat() ran', { v: eatName[eat], cls: 'good' }]);
      if (c.over) {
        push('The line d.eat(); runs. The object d refers to is a Dog object, so the eat to run is looked up first in the class of that object, Dog. There is an eat written in Dog, so that one runs and prints "the dog eats". The eat written in Animal does not run.' + (dogVar ? '' : ' It is the same even though the type of the variable is Animal. Which eat to run is decided by the class of the object.') + (c.ext ? '' : ' Dog is unrelated to Animal, so this eat was not inherited. Dog wrote it directly.'), 'good');
      } else {
        push('The line d.eat(); runs. The object d refers to is a Dog object, so the eat to run is looked up first in the class of that object, Dog. Dog has no eat, so it looks in Animal, and the eat written in Animal runs and prints "eats".', 'good');
      }
      if (dogVar) {
        st.hot = 'db'; st.out.push('woof');
        push('The line d.bark(); runs. The bark of a Dog object is a method written directly in Dog, so it runs as it is and prints "woof".', 'good');
      }
    }

    // Summary: the first line is the answer to this setting (question)
    if (ok && c.ext && !c.over && dogVar) {
      sum.push('If you write extends Animal, Dog inherits the methods written in Animal. You called eat(), which is not written in Dog, on a Dog object, and compilation succeeded. Dog has none, so the eat written in Animal ran and "eats" was printed.');
      sum.push('You called d.bark() and d.eat() on the same Dog object. bark is a method written directly in Dog and eat is a method inherited from Animal, but the caller cannot tell the difference.');
    } else if (ok && c.ext && c.over && dogVar) {
      sum.push('If you write the inherited eat again in Dog with the same name (overriding), the eat written in Dog runs on a Dog object. "the dog eats" was printed, and the eat written in Animal did not run.');
      sum.push('When you call eat on a Dog object, the search starts from the class of the object, Dog. The eat inside Animal was not changed, so if you call eat on an Animal object, "eats" is still printed.');
    } else if (ok && c.ext && !c.over) {
      sum.push('extends Animal was there, so you could put a Dog object in the variable d of type Animal. Compilation succeeded, and the object is a Dog but Dog has no eat, so the eat written in Animal ran.');
      sum.push('What you can call through an Animal-type variable is only the methods written in Animal, so this code has no d.bark(); line. If you call bark through an Animal variable, the compiler reports that it cannot find bark.');
    } else if (ok && c.ext) {
      sum.push('The type of the variable d is Animal, but the object it holds is a Dog object, so what ran was the eat written in Dog, and "the dog eats" was printed. Animal also has an eat, but it did not run.');
      sum.push('The compiler looks at the type of the variable (Animal) and checks only whether eat can be called. Which eat actually runs is decided at run time by the class of the object (Dog). Dog overrides eat, so the eat of Dog runs.');
    } else if (ok) {
      sum.push('Even without extends Animal, you wrote eat directly in Dog, so compilation succeeded, and the eat written in Dog ran and "the dog eats" was printed. This eat was not inherited. Dog wrote it directly.');
      sum.push('Without extends, Dog has only what it writes itself. Even if the name is the same as the eat of Animal, the two are not connected, so this is not overriding. It is extends that connects them.');
    } else if (dogVar) {
      sum.push('If you remove extends Animal, Dog has only what it writes itself, so you cannot call eat(), which is not written in Dog. The compiler reported that Dog has no eat method, so compilation failed and it could not run.');
      sum.push('Even if Animal has an eat, Dog cannot use it unless it is connected by extends. The error is at one place, the line d.eat();, and bark, which is written directly in Dog, had no problem.');
    } else {
      sum.push('If you remove extends Animal, Dog is not of type Animal, so you cannot put a Dog object in a variable of type Animal. The compiler reported an error on this line, so compilation failed and it could not run.' + (c.over ? ' It was the same even though eat was written again in Dog with the same name.' : ''));
      sum.push('Having a method with the same name does not make it that type. You can put a subclass object in a superclass-type variable because extends declared that Dog is a subclass of Animal.');
    }
    var run = ok ? st.out.join(' / ') : 'Cannot run';
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, eatName: eatName, row: [ok ? 'Success' : 'Error', ok ? 'None' : first, run, ok ? eatName[eat] : 'Cannot run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    if (s.out.length) H.table(v, ['Output'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), 'Output when run');
    H.counters(v, [[s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: Animal (eat) at the top left, Dog (bark and the eat written again) below it, and an extends arrow joining the two. The variable d and the Dog object on the right. An arrow from the object to the eat that actually ran. The compile result, the output, and the eat that ran are at the bottom.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 440);
    var hot = s ? s.hot : '', bad = s ? s.bad : {}, dogVar = c.var === 'dog', err = s && s.compile === 'err';
    P.region('ra', 14, 12, 286, 86, 'Animal');
    P.box('ae', 28, 38, 258, 50, { cls: hot === 'ae' ? 'hot now' : s && s.eat === 'animal' ? 'good' : 'plain', title: 'eat()', sub: 'Prints "eats"' });
    P.region('rd', 14, 160, 286, 126, 'Dog');
    P.box('db', 28, 184, 258, 40, { cls: hot === 'db' ? 'hot now' : 'plain', title: 'bark()', sub: 'Prints "woof"' });
    P.box('de', 28, 234, 258, 44, { cls: bad.de ? 'bad' : hot === 'de' ? 'hot now' : s && s.eat === 'dog' ? 'good' : c.over ? 'plain' : 'ghost', title: 'eat()', sub: c.over ? 'Prints "the dog eats"' : 'Not written in Dog' });
    if (c.ext) P.arrow('ex', [157, 160], [157, 98], { cls: hot === 'ex' ? 'hot' : 'mut', label: 'extends' });
    P.box('vd', 380, 20, 286, 56, { cls: bad.vd ? 'bad' : hot === 'vd' ? 'hot now' : 'plain', title: dogVar ? 'Dog d' : 'Animal d', sub: s && s.obj ? 'Refers to a Dog object' : dogVar ? 'Variable of type Dog' : 'Variable of type Animal' });
    P.box('ob', 380, 130, 286, 70, { cls: s && s.obj ? (hot === 'ob' ? 'good now' : 'good') : 'ghost', title: 'Dog object', sub: s && s.obj ? 'Created by new Dog()' : err ? 'Not created' : 'Does not exist yet' });
    if (s && s.obj) P.arrow('ref', 'vd:b', 'ob:t', { cls: 'good' });
    if (s && s.eat) P.arrow('run', 'ob:l', s.eat === 'dog' ? 'de:r' : 'ae:r', { cls: 'good', label: 'Runs' });
    P.box('r1', 14, 298, 652, 44, { cls: s && s.compile === 'ok' ? 'good' : err ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 350, 652, 36, { cls: s && s.out.length ? 'good' : err ? 'bad' : 'ghost', title: 'Output when run', right: s && s.out.length ? s.out.join(' / ') : err ? 'Cannot run' : '' });
    P.box('r3', 14, 394, 652, 36, { cls: s && s.eat ? 'good' : err ? 'bad' : 'ghost', title: 'eat that ran', right: s && s.eat ? sim.eatName[s.eat] : err ? 'Cannot run' : '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all eight combinations, the same source as the code on the screen (identical line by line) was compiled with javax.tools. The ones that compiled had their class files loaded by a new class loader and Main.main was run, and the results were checked against the standard output that was captured. What was checked is whether compilation succeeded, the diagnostic code of the first error (compiler.err.cant.resolve.location.args and compiler.err.prob.found.req, shown on the screen as the two error descriptions), the number of errors and the lines where they occurred, whether the Main class file was created, and the output when run. The "eat that ran" was decided not by guessing but by the output. The eat of Animal was written to print "eats" and the eat of Dog to print "the dog eats", and the actual output was read to see which one it was. The facts that the step sentences rely on were also checked by separate runs. Calling bark(), which is written only in Dog, through an Animal-type variable is a compile-time error (so the code for the Animal variable has no d.bark() line). Even if eat is written again in Dog, the eat called on an Animal object still prints "eats". Even without extends, the bark written directly in Dog can be used without a problem. The documentation checked was the Java Language Specification (Java SE 21), opened directly. The rule that the extends clause names the direct superclass and that the class is called a subclass follows section 8.1.4. The rule that a class inherits the accessible methods of its superclass that it does not write again with the same signature follows section 8.4.8. The rule that a subclass writing a method of its superclass again with the same signature is overriding follows section 8.4.8.1. The rule that a superclass is a supertype of its subclass (so a subclass object can be put in a superclass-type variable) follows section 4.10.2. The rule that at run time the overriding method is looked up by starting from the actual class of the target object and going upward, not from the type of the variable, follows section 15.12.4.4. Sections 5.1.5 and 5.2 of the specification (the conversion that puts a value of a subclass type in a superclass-type variable in an assignment context) were not opened and checked in this lab. The kind of error, the number of errors, and the line where each occurs are not set by the specification. They were observed with this javac. When a Dog was put in an Animal variable without extends, the same one error occurred on the same line whether or not eat was written again in Dog. The code on the screen has the classes together in one file and shortens the access modifiers, and it does not use @Override. Every class inherits from Object even if it does not use extends, but this lab did not cover that, and the statement that without extends Dog has only what it writes itself is about what is written in Animal. The rule that a class also inherits the accessible fields of its superclass was checked in section 8.3, but this lab showed only methods by running them. Writing a field of the superclass, constructors, the super keyword, the fact that private members are not inherited, and the order in which a subclass calls a superclass constructor were also not covered in this lab. The order in which superclass constructors run and super are covered in "In-depth lab: Inheritance and overriding".',
});
