Lab.register({
  id: 'absint', nav: 'Interfaces and abstract classes', cat: 'Java language', mode: 'step',
  title: 'Neither can be created with new, so how do they differ?',
  intro: 'An interface and an abstract class both define a contract that says "these methods must exist", and both leave the actual implementation to the class that implements them. But they differ in whether a class can inherit from several of them at once and in whether they can have state (fields).',
  terms: ['Interface', 'Abstract class', 'Default method', 'Abstraction', 'Inheritance', 'Polymorphism'], ranks: ['absint', 'oop'],
  controls: [
    { id: 'kind', label: 'Kind', type: 'select', value: 'iface', options: [['iface', 'Interface (interface Payable)'], ['abs', 'Abstract class (abstract class Payment)']] },
    { id: 'what', label: 'What to try', type: 'select', value: 'multi', options: [['new', 'Create an object directly with new'], ['impl', 'Write a class that implements (extends) it and use it'], ['missing', 'Leave an abstract method unimplemented'], ['multi', 'Inherit from two at once'], ['state', 'Declare a field (state) and a constructor'], ['default', 'Inherit a method that has a body']] },
  ],
  presets: [
    { t: 'Default settings', q: 'How does inheriting from two at once differ from an abstract class when you try it with an interface (interface Payable)?', d: 'A class can implement several interfaces at once.', v: { kind: 'iface', what: 'multi' } },
    { t: 'Extending two abstract classes', q: 'What if you switch the kind to Abstract class (abstract class Payment) and try to inherit from two at once?', d: 'A class can extend only one class, so this does not compile.', v: { kind: 'abs', what: 'multi' } },
    { t: 'A field and a constructor in an interface', q: 'What if you try to declare a field (state) and a constructor in an interface?', d: 'An interface cannot have the state of an object.', v: { kind: 'iface', what: 'state' } },
    { t: 'A field and a constructor in an abstract class', q: 'What if you switch the kind to Abstract class (abstract class Payment) and try to declare a field (state) and a constructor?', d: 'It can pass shared state and initialization code down to its subclasses.', v: { kind: 'abs', what: 'state' } },
    { t: 'Using new directly', q: 'What if you try to create an object directly with new?', d: 'Neither one can be used by itself to create an object.', v: { kind: 'iface', what: 'new' } },
    { t: 'Not implementing an abstract method', q: 'What if you leave an abstract method unimplemented?', d: 'If a method required by the contract is missing, the compiler rejects the class.', v: { kind: 'iface', what: 'missing' } },
  ],
  SRC: {
    iface: 'interface Payable {\n    void pay();                              // abstract method: no body\n    default String name() { return "default name"; }\n}',
    abs: 'abstract class Payment {\n    protected int amount = 100;              // field (state)\n    Payment() { }                            // constructor\n    abstract void pay();                     // abstract method: no body\n    String name() { return "default name"; }\n}',
  },
  code: function (c) {
    var I = c.kind === 'iface', T = I ? 'Payable' : 'Payment', ext = I ? 'implements Payable' : 'extends Payment', pub = I ? 'public ' : '';
    var use = {
      new: T + ' p = new ' + T + '();',
      impl: 'class Card ' + ext + ' {\n    ' + pub + 'void pay() { System.out.println("Card.pay"); }\n}\n\n' + T + ' p = new Card();     // the type is ' + T + ', the actual object is a Card\np.pay();',
      missing: 'class Card ' + ext + ' {\n    // pay() is not implemented\n}',
      multi: I ? 'interface Refundable { void refund(); }\n\nclass Card implements Payable, Refundable {\n    public void pay() { }\n    public void refund() { }\n}' : 'abstract class Logger { abstract void log(); }\n\nclass Card extends Payment, Logger {     // extends two classes\n    void pay() { }\n    void log() { }\n}',
      state: I ? '// Try putting a field and a constructor in an interface\ninterface Payable {\n    int amount;                              // field with no value\n    Payable() { }                            // constructor\n    void pay();\n}' : 'class Card extends Payment {\n    void pay() {\n        amount += 50;                        // uses the inherited field\n        System.out.println("amount=" + amount);\n    }\n}\n\nnew Card().pay();',
      default: 'class Card ' + ext + ' {\n    ' + pub + 'void pay() { }\n    // name() is not implemented\n}\n\nSystem.out.println(new Card().name());',
    }[c.what];
    return (c.what === 'state' && I ? '' : this.SRC[c.kind] + '\n\n') + use;
  },
  label: function (c) { return (c.kind === 'iface' ? 'Interface' : 'Abstract class') + ' · ' + { new: 'new directly', impl: 'implement and use', missing: 'abstract method not implemented', multi: 'two at once', state: 'field and constructor', default: 'method with a body' }[c.what]; },
  columns: ['Compilation', 'Run result or error', 'With an interface', 'With an abstract class'],
  // Pure calculation used to check the model against the real compilation and run results
  ok: function (kind, what) { if (what === 'new' || what === 'missing') return false; if (what === 'multi') return kind === 'iface'; if (what === 'state') return kind === 'abs'; return true; },
  simulate: function (c) {
    var I = c.kind === 'iface', T = I ? 'Payable' : 'Payment', ok = this.ok(c.kind, c.what), ev = [], sum = [], out;
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage, out: out || '' } }); }
    push(I ? 'Payable is an interface. It defines only the contract "there must be a method named pay()", and the class that implements it decides how to pay.' : 'Payment is an abstract class. Its abstract method pay() has no body, and it has fields, a constructor, and regular methods just like an ordinary class.', '', 1);
    var W = c.what;
    if (W === 'new') { out = 'Compile-time error: ' + T + ' is abstract; cannot be instantiated'; push('The code tries to create an object directly with new ' + T + '(). ' + T + ' has a method with no body, so if an object were created as it is, there would be no code to run when pay() is called. The compiler rejects this.', 'bad', 2); sum.push('An interface or an abstract class cannot be used by itself to create an object. It becomes an object only through a class that fills in the missing parts.'); }
    if (W === 'impl') { push('The Card class ' + (I ? 'implements ' : 'extends ') + T + '. It fills in the body of pay(), which was empty.', '', 2); out = 'Card.pay' + (I ? '' : ' (the inherited amount = 100 is available)'); push('A Card object is assigned to a variable of type ' + T + ', and pay() is called. The type of the variable is ' + T + ', but the method that runs is pay() of Card. The calling code does not need to know the concrete class.', 'good', 3); sum.push('When you separate the contract (the type) from the implementation (the class), you can swap in a different implementation without changing the code that uses it. Dependency injection in Spring and the Strategy pattern both rely on this structure.'); }
    if (W === 'missing') { out = 'Compile-time error: Card is not abstract and does not override abstract method pay() in ' + T; push('Card says that it ' + (I ? 'implements ' : 'extends ') + T + ' but does not fill in pay(). A method required by the contract is missing, so the compiler rejects the class.', 'bad', 2); sum.push('An abstract method is "a blank that the implementing class must fill in". If a class does not fill it in, that class must also be abstract, and then you cannot create an object of that class either.'); }
    if (W === 'multi') {
      if (I) { push('Card implements two interfaces, Payable and Refundable, at once. An interface has only a contract and no state, so nothing conflicts when several of them are combined.', '', 2); out = 'Compiled successfully. A Card is both a Payable and a Refundable'; push('The code compiles. A Card object can be assigned to a variable of type Payable and also to a variable of type Refundable.', 'good', 3); }
      else { out = "Compile-time error: '{' expected (only one class can follow extends)"; push('Card tries to extend two abstract classes, Payment and Logger, at once. In Java, a class can extend only one class. If both superclasses had a field or a method implementation with the same name, there would be no way to decide which one to inherit.', 'bad', 2); }
      sum.push('A class can extend only one class (extends), but it can implement several interfaces (implements). To give a class several abilities of the form "can do something", use interfaces.');
    }
    if (W === 'state') {
      if (I) { out = 'Compile-time error: = expected (a field of an interface must be a constant with a fixed value)'; push('A field with no value and a constructor are placed inside the interface. A field of an interface is automatically public static final, that is, a constant that has the same value everywhere. An interface cannot have a field that holds a different value for each object, or a constructor that initializes such a field.', 'bad', 2); }
      else { push('The abstract class Payment has the field amount and a constructor. Card inherits the field, and the Payment constructor also runs when a Card object is created (constructors themselves are not inherited).', '', 2); out = 'amount=150'; push('pay() in Card adds 50 to the inherited amount (100) and prints the result. State and initialization code that are used in common are written once in the superclass and shared by its subclasses.', 'good', 3); }
      sum.push('An abstract class can have state (fields) and constructors, and an interface can have only constants. When several implementations need to share the same fields and the same code, an abstract class is the right choice.');
    }
    if (W === 'default') { push('Card fills in only pay() and does not implement name(). ' + (I ? 'name() in Payable is a default method, so it has a body.' : 'name() in Payment is a regular method that has a body.'), '', 2); out = 'default name'; push('Calling new Card().name() runs the code written in ' + T + '. ' + (I ? 'Since Java 8, an interface can also provide a default implementation with a default method. This feature was added so that existing classes do not break when a method is added to an interface that many classes already implement.' : 'An abstract class has always been able to have regular methods.'), 'good', 3); sum.push('Both can pass down a method that has a body. The difference is whether that method can use the fields of the object. A default method of an interface has no state, so it can be written only in terms of calls to other methods.'); }
    sum.push('How to choose: use an interface to attach the contract "provides this feature" to classes of different kinds, and use an abstract class when closely related classes need to share fields and code. In practice, interfaces are often the default choice.');
    var a = this.ok('iface', W), b = this.ok('abs', W);
    return { events: ev, summary: sum, row: [ok ? 'Success' : 'Error', out, a ? 'Allowed' : 'Not allowed', b ? 'Allowed' : 'Not allowed'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, out: '' }, W = sim.c.what, me = this;
    H.table(v, ['What to try', 'Interface', 'Abstract class'], [['new', 'Create an object directly with new'], ['impl', 'Use it through a class that implements (extends) it'], ['missing', 'Leave an abstract method unimplemented'], ['multi', 'Inherit from two at once'], ['state', 'Declare a field (state) and a constructor'], ['default', 'Inherit a method that has a body']].map(function (r) {
      var on = r[0] === W, cell = function (kind) { var o = me.ok(kind, r[0]), mine = on && sim.c.kind === kind; return { v: (o ? 'Allowed' : 'Compile-time error') + (mine ? ' ← now' : ''), cls: mine ? (o ? 'good' : 'bad') : '' }; };
      return { cells: [{ v: r[1], cls: on ? 'hot' : '' }, cell('iface'), cell('abs')] };
    }), 'Results of trying the 6 things with each kind');
    H.title(v, 'Compiler and run result'); v.appendChild(H.el('pre', 'code', s.out || '(in progress)'));
  },
  assume: 'For all 12 combinations, source code with the same structure as the code on the screen was actually compiled and run on JDK 21 on this PC, and the model was checked against the results (whether compilation succeeded and the error messages). Features from later versions, such as private methods and static methods in interfaces and sealed types, are not covered.',
});
