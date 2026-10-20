Lab.register({
  id: 'interface_basic', nav: 'Interfaces', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['absint'],
  title: 'What does an interface look like in code, and what does it decide?',
  why: 'If code that uses some feature is tied to a particular class name, then every time you change that feature to another way, the code on the using side has to be changed too. An interface fixes only "these methods exist" as a type, so the using side calls methods by looking only at that type, and it can handle an object of any class that actually comes, with the same code.',
  use: 'Java\'s List and Map are interfaces, so as in List<String> names = new ArrayList<>(); you write the variable with the interface type and choose between ArrayList and LinkedList to create the actual object. In Spring Data JPA, if you only declare an interface that extends JpaRepository, Spring creates its implementation object. An interface is also used when you make one feature in several ways and choose among them.',
  intro: 'An interface is a contract that you declare with interface. This lab uses the example names Payable (an interface), Card (a class), and pay (a method). It says, for example, "anything of type Payable must have a pay method", and it writes only the name of the method, with no body. A class declares with implements Payable that it will follow the contract, and it actually writes the pay method that the contract names. Then a variable of type Payable can point to an object of that class. In this lab you remove the interface declaration, implements, and the pay method one at a time, and the same code is compiled and run each time. You see what the compiler reports and what is printed.',
  terms: ['Interface', 'implements', 'Abstract method', 'Type'],
  controls: [
    { id: 'decl', label: 'The interface Payable declaration is there', type: 'check', value: true },
    { id: 'impl', label: 'Write implements Payable in the Card class', type: 'check', value: true },
    { id: 'method', label: 'The pay method of the Card class', type: 'select', value: 'body', options: [['body', 'Write the pay method (with a body)'], ['empty', 'Leave the body of the pay method empty { }'], ['none', 'Do not write the pay method']] },
  ],
  // q is the question shown in the question-style screen; t and d are the name and description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an interface look like, and what does it do?', d: 'All three are there. Compilation succeeds and "paid by card" is printed.', v: { decl: true, impl: true, method: 'body' } },
    { t: 'Remove implements', q: 'What if you remove implements Payable from Card?', d: 'Even though the pay method is there, Card is not of type Payable, so there is a compile-time error.', v: { decl: true, impl: false, method: 'body' } },
    { t: 'Remove the pay method', q: 'What if you remove the pay method from Card?', d: 'The method that the contract names was not written, so there is a compile-time error.', v: { decl: true, impl: true, method: 'none' } },
    { t: 'Leave the body of the pay method empty', q: 'What if you leave the body of the pay method empty?', d: 'Even with an empty body, the method is written. Compilation succeeds and nothing is printed.', v: { decl: true, impl: true, method: 'empty' } },
    { t: 'Remove the interface declaration', q: 'What if you remove the interface Payable declaration?', d: 'There is no type named Payable, so there is a compile-time error.', v: { decl: false, impl: true, method: 'body' } },
  ],
  // The kinds of error the compiler reports (from the real javac diagnostic codes)
  errType: 'The type Payable cannot be found',
  errFit: 'Card is not of type Payable, so a Payable variable cannot point to it',
  errMiss: 'Card did not write the pay method',
  code: function (c) {
    var o = [];
    if (c.decl) o.push('// Contract: anything of type Payable must have a pay method (only the name is written)', 'interface Payable {', '    void pay();', '}', '');
    if (c.impl) o.push('// Declaration that Card will follow the contract');
    o.push('class Card' + (c.impl ? ' implements Payable' : '') + ' {');
    if (c.method === 'body') o.push('    // Actually writes the method that the contract names', '    public void pay() {', '        System.out.println("paid by card");', '    }');
    else if (c.method === 'empty') o.push('    // Actually writes the method that the contract names', '    public void pay() { }');
    o.push('}', '', 'public class Main {', '    public static void main(String[] args) {', '        // Make the variable p of type Payable point to a Card object', '        Payable p = new Card();', '        p.pay();', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.decl ? 'Payable declared' : 'No Payable declaration') + ' · ' + (c.impl ? 'With implements' : 'Without implements') + ' · ' + { body: 'pay has a body', empty: 'pay body is empty', none: 'No pay' }[c.method]; },
  columns: ['Compile', 'What the compiler reports', 'Output when run'],
  simulate: function (c) {
    var ev = [], sum = [], IMPL_LINE = 'class Card implements Payable {', FIT_LINE = 'Payable p = new Card();';
    var ok = c.decl && c.impl && c.method !== 'none';
    var first = ok ? '' : !c.decl ? this.errType : !c.impl ? this.errFit : this.errMiss;
    var nerr = ok ? 0 : !c.decl && c.impl ? 2 : 1;
    var errAt = ok ? [] : !c.decl ? (c.impl ? [IMPL_LINE, FIT_LINE] : [FIT_LINE]) : !c.impl ? [FIT_LINE] : [IMPL_LINE];
    var st = { hot: '', bad: {}, fit: '', obj: false, compile: '', errs: 0, errText: '', ran: false, out: '', checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errType = this.errType, errFit = this.errFit, errMiss = this.errMiss;
    var pay = { body: 'public void pay() { ... }', empty: 'public void pay() { }', none: '' }[c.method];

    // 1. Read the interface Payable declaration
    st.hot = 'pa';
    if (c.decl) {
      st.checks.push(['Type Payable', { v: 'Known', cls: 'good' }]);
      push('The compiler reads the source from the top. First it reads the interface Payable declaration, and from this declaration it learns the type named Payable. The Payable type is created by this declaration. The line void pay(); has only a name and no body, and in an interface this shape is a contract: "anything of type Payable must have a pay method" (an abstract method).', '');
    } else {
      st.checks.push(['Type Payable', { v: 'No declaration', cls: 'bad' }]);
      push('The compiler reads the source from the top. There is no interface Payable declaration anywhere in the code, so no type named Payable is known yet. A type is created by a declaration, so it does not exist just because you write the name in the code.', '');
    }

    // 2. Read the class Card line
    st.hot = 'cd';
    if (c.impl) {
      if (c.decl) {
        st.checks.push(['Card implements Payable', { v: 'Yes', cls: 'good' }]);
        push('The compiler reads the line class Card implements Payable. It is a declaration that Card will follow the contract of Payable. So the pay method that the contract names must be written inside Card.', '');
      } else {
        st.bad.impl = true; fail(errType);
        st.checks.push(['Card implements Payable', { v: 'Error: the type Payable cannot be found', cls: 'bad' }]);
        push('The compiler reads the line class Card implements Payable. But it does not know a type named Payable, so there is an error on this line (javac: cannot find symbol). The contract that it says it will follow is not declared anywhere.', 'bad');
      }
    } else {
      st.checks.push(['Card implements Payable', { v: 'No', cls: '' }]);
      push('The compiler reads the line class Card. There is no implements, so Card is a class unrelated to Payable. This line has no contract to check, so there is no error.' + (c.decl && c.method !== 'none' ? ' Even though Card has a pay method, the compiler does not connect it to the contract of Payable just because the name is the same.' : ''), '');
    }

    // 3. Check that the method named in the contract exists (only when there is a contract)
    if (c.decl && c.impl) {
      if (c.method === 'body') {
        st.checks.push(['pay method of Card', { v: 'Exists (with a body)', cls: 'good' }]);
        push('The compiler looks inside Card for the pay method that the contract names. There is a line ' + pay + ' and it has a body, so the contract is followed.', 'good');
      } else if (c.method === 'empty') {
        st.checks.push(['pay method of Card', { v: 'Exists (body is empty)', cls: 'good' }]);
        push('The compiler looks inside Card for the pay method that the contract names. There is a line ' + pay + '. Even if the body is empty, it counts as having written the method. The contract goes only as far as "there must be a method named pay", and what it does inside is not in the contract. So the contract is followed.', 'good');
      } else {
        st.bad.cd = true; fail(errMiss);
        st.checks.push(['pay method of Card', { v: 'None: error', cls: 'bad' }]);
        push('The compiler looks inside Card for the pay method that the contract names. Card has no pay method. It agreed to the contract with implements Payable and did not follow it, so there is an error (javac: Card is not abstract and does not override abstract method pay() in Payable).', 'bad');
      }
    }

    // 4. Check the line Payable p = new Card();
    st.hot = 'pv';
    if (ok) {
      st.fit = 'ok';
      st.checks.push(['Making a Payable variable point to a Card object', { v: 'Allowed', cls: 'good' }]);
      push('The compiler checks the line Payable p = new Card();. Card agreed to the contract with implements Payable, so it is fine for the variable p of type Payable to point to a Card object. This is not running. It is the compiler checking in advance whether it is allowed.', 'good');
    } else if (c.decl && c.impl) {
      st.fit = 'ok';
      st.checks.push(['Making a Payable variable point to a Card object', { v: 'Not an error', cls: '' }]);
      push('The compiler checks the line Payable p = new Card();. Card wrote implements Payable, so this line by itself is not an error (the only error javac reported is the 1 above). But compilation fails because of the earlier error.', '');
    } else if (c.decl) {
      st.fit = 'bad'; st.bad.pv = true; fail(errFit);
      st.checks.push(['Making a Payable variable point to a Card object', { v: 'Not allowed: error', cls: 'bad' }]);
      push('The compiler checks the line Payable p = new Card();. Card has no implements Payable, so it is not of type Payable, and the variable p of type Payable cannot point to a Card object (javac: incompatible types: Card cannot be converted to Payable).' + (c.method !== 'none' ? ' It is the same even though Card has the same pay method. Having a method does not make it that type.' : ' There is no separate error saying that the pay method is missing. Without implements, there is no contract to follow.'), 'bad');
    } else {
      st.bad.pv = true; fail(errType);
      st.checks.push(['Making a Payable variable point to a Card object', { v: 'Error: the type Payable cannot be found', cls: 'bad' }]);
      push('The compiler checks the line Payable p = new Card();. It cannot find the Payable that is written as the type of the variable p, so ' + (c.impl ? 'the same error occurs once more. javac reported 2 errors in all.' : 'there is an error (javac: cannot find symbol). Even if the Card class has no problem, a name that is not declared cannot be used as a type.'), 'bad');
    }

    // 5. Compile result
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compilation succeeds and the Main class file that will run is created. Whether the contract is followed was not checked at run time. The compiler checked it just now, while compiling.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: ' + nerr, cls: 'bad' }]);
      push('Compilation fails. The compiler reported ' + nerr + (nerr === 1 ? ' error' : ' errors') + ', and the first one is "' + first + '". The Main class file was not created, so the program cannot run.', 'bad');
    }

    // 6~7. Run
    var out = '';
    if (ok) {
      st.hot = 'ob'; st.obj = true;
      push('You run it with java Main. main starts, and new Card() creates a Card object, and the variable p of type Payable points to it.', '');
      st.hot = 'ob'; st.ran = true; out = c.method === 'body' ? 'paid by card' : '';
      st.out = out;
      st.checks.push(['Output when run', { v: out || '(nothing printed)', cls: 'good' }]);
      push('p.pay() runs. The object p points to is a Card object, so the pay method written in Card runs.' + (c.method === 'body' ? ' The println in the body prints "paid by card".' : ' The body is empty, so it ends without printing anything. There is no error.'), 'good');
    }

    // Summary: the first line is the answer to this setting (question)
    if (ok && c.method === 'body') {
      sum.push('An interface is a contract that you declare with interface: "anything of this type must have this method". It writes only the name of the method and no body. The interface Payable declaration creates the type named Payable, and Card declares with implements Payable that it will follow the contract and then actually writes the pay method.');
      sum.push('So the variable p of type Payable could point to a Card object, and p.pay() ran the pay of Card. Whether the contract was followed was not checked at run time. The compiler checked it while compiling.');
    } else if (ok) {
      sum.push('Even if the body is empty, the pay method is written, so the contract is followed. Compilation succeeded, and nothing was printed when it ran.');
      sum.push('The contract goes only as far as "a method with this name must exist", and what it does inside is not in the contract. The compiler checked whether the pay method exists, and it did not report an error because the body is empty.');
    } else if (!c.decl) {
      sum.push('Without the interface Payable declaration, there is no type named Payable. The compiler reported that the type named Payable cannot be found, so compilation failed and it could not run.');
      sum.push('The Payable type is created by the interface declaration. The errors were at ' + (c.impl ? 'two places, the implements Payable line and the Payable p line.' : 'one place, the Payable p line. The Card class had no problem.'));
    } else if (!c.impl) {
      sum.push('If you remove implements Payable, Card is not of type Payable, so a variable of type Payable cannot point to a Card object. Compilation failed, so it could not run.' + (c.method !== 'none' ? ' It was the same even though the pay method was still there.' : ''));
      sum.push('Having the methods does not make it that type. The compiler accepts Card as type Payable only when there is an implements declaration that it will follow the contract.');
    } else {
      sum.push('Card did not write the pay method, so compilation failed. If you agree to a contract with implements Payable, you must actually write the method that the contract names.');
      sum.push('Whether the contract is followed is checked when you compile, not when you run the program. So a program that breaks the contract could not even be run.');
    }
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? 'Success' : 'Error', ok ? 'None' : first, ok ? (out || '(nothing printed)') : 'Cannot run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    H.counters(v, [[s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: Payable (interface) on the left, Card (class) on the right, and an implements arrow joining the two. Below, the Payable variable p and the Card object. The place the compiler is checking is shown in yellow, and the compile result and output are at the bottom.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    var hot = s ? s.hot : '', bad = s ? s.bad : {};
    P.box('pa', 14, 20, 230, 76, { cls: !c.decl ? 'ghost' : hot === 'pa' ? 'hot now' : 'plain', title: 'Payable (interface)', sub: c.decl ? 'pay() name only' : 'No declaration' });
    P.box('cd', 436, 20, 230, 76, { cls: bad.cd ? 'bad' : hot === 'cd' ? 'hot now' : 'plain', title: 'Card (class)', sub: { body: 'pay has a body', empty: 'pay body is empty', none: 'No pay' }[c.method] });
    if (c.impl) P.arrow('impl', 'cd:l', 'pa:r', { cls: bad.impl ? 'bad' : hot === 'cd' ? 'hot' : 'mut', label: 'implements' });
    P.box('pv', 14, 150, 230, 56, { cls: bad.pv ? 'bad' : hot === 'pv' ? 'hot now' : 'plain', title: 'Payable p', sub: s && s.obj ? 'Refers to a Card object' : 'Variable of type Payable' });
    P.box('ob', 436, 150, 230, 56, { cls: s && s.obj ? (hot === 'ob' ? 'good now' : 'good') : 'ghost', title: 'Card object', sub: s && s.obj ? 'Created by new Card()' : s && s.compile === 'err' ? 'Not created' : 'Does not exist yet' });
    if (s && s.fit) P.arrow('fit', 'cd:b:0.25', 'pv:t:0.75', { cls: s.fit === 'bad' ? 'bad' : hot === 'pv' ? 'hot' : 'good' });
    if (s && s.obj) P.arrow('ref', 'pv:r', 'ob:l', { cls: 'good', label: 'Refers to' });
    P.box('r1', 14, 232, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 292, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Output when run', right: s && s.ran ? (s.out || '(nothing printed)') : s && s.compile === 'err' ? 'Cannot run' : '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all twelve combinations, the same source as the code on the screen (identical line by line) was compiled with javax.tools. The ones that compiled had their class files loaded by a new class loader and Main.main was run, and the results were checked against the standard output that was captured. What was checked is whether compilation succeeded, the diagnostic code of the first error (compiler.err.cant.resolve, cant.resolve.location, prob.found.req, and does.not.override.abstract, shown on the screen as the three error descriptions), the number of errors and the lines where they occurred, whether the Main class file was created, and the output when run. The documentation checked was the Java Language Specification (Java SE 21), opened directly. The rule that an interface method that ends with a semicolon and has no body is an abstract method and is public follows section 9.4. The rule that a class that is not abstract must implement all the abstract methods of the interfaces it implements follows sections 8.1.5 and 8.1.1.1. The rule that if the method body is a block and not a semicolon the method is an implementation, and that the block may be empty, follows section 8.4.7 and the example (alert() { }) in section 8.1.1.1. The rule that interfaces and classes are both reference types and that an interface a class implements is a supertype of the class follows sections 4.3 and 4.10.2. The rule that a variable of a supertype can refer to an object of its subtype follows sections 5.1.5 and 5.2. The kind of error, the number of errors, and the line where each occurs are not set by the specification. They were observed with this javac. When there are several errors, javac reports all of them, but the table shows only the first. Even when compilation failed, some class files such as Card were created, but the Main class file was never created, so the table says it cannot run. An interface can also have default methods, static methods, and constants, and one class can implement several interfaces, but this lab did not cover them. How interfaces are used and how they differ from abstract classes are covered in "In-depth lab: Interfaces and abstract classes".',
});
