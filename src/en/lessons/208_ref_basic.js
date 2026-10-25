Lab.register({
  id: 'ref_basic', nav: 'References', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['eq'],
  title: 'What does it mean for a variable to refer to an object?',
  why: 'An object can be large because it has many fields, so if you copy the whole object every time you assign it to a variable or pass it to a method, it costs time and memory, and a change made on one side is not reflected in the other copy. A reference makes a variable hold a value that points to the object instead of the object itself, so that when you assign or pass it, only this value is copied and several variables share one same object.',
  use: 'When you pass an object to a method, the reference is copied and passed, so if that method changes a field of the object, the caller sees the changed value too. So where the received object must not be changed, you create a new object and move the values into it, or you use an object like String whose contents do not change once it is made. == only checks whether two variables point to the same object, so to compare whether two Strings have the same characters, you use equals.',
  intro: 'Card is a class made as an example for this lab. In Card a = new Card();, what is inside variable a is not the Card object itself but a value that refers to that object. This value is called a reference. So when you assign a to another variable, as in Card b = a;, the object is not copied. Only the reference is copied, and a and b come to refer to the same object. If you change the contents of the object through one of them, it is changed when you look through the other too. A variable of a primitive type such as int is different. The value itself is inside it, so int b = a; copies the value. In this lab you run the same lines while changing what is assigned to b: a reference copied from a, a reference to an object newly created with new, a reference to an object newly created and then given only the owner copied over, and an int value. You can see what happens to a after b is changed, and how many Card objects were created.',
  terms: ['Reference', 'Classes and objects', 'Primitive types and reference types', 'Identity and equality'],
  controls: [
    { id: 'how', label: 'Code that assigns to b', type: 'select', value: 'same', options: [['same', 'Card b = a;'], ['fresh', 'Card b = new Card();'], ['copy', 'Card b = new Card(); b.owner = a.owner;'], ['prim', 'int instead of Card: int a = 1; int b = a; b = 2;']] },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only version
  presets: [
    { t: 'Default settings', q: 'After Card b = a;, what happens to a when you change the value through b?', d: 'b refers to the same object that a refers to. If you change it through b, it is changed when you look through a too, and there is only 1 object.', v: { how: 'same' } },
    { t: 'Assign new Card() to b', q: 'What if you assign new Card() to b instead of a?', d: 'One more new object is created, and a and b refer to different objects. Changing b leaves a unchanged.', v: { how: 'fresh' } },
    { t: 'Create, then only copy the value', q: 'What if you create a new object and then only copy the value over?', d: 'Even if you copy the value of owner over, there are 2 objects. The contents were the same at first, but they are different objects.', v: { how: 'copy' } },
    { t: 'Use int', q: 'What if it is int instead of Card?', d: 'A variable of a primitive type holds the value itself, so assigning copies the value. Changing b leaves a unchanged.', v: { how: 'prim' } },
  ],
  code: function (c) {
    var o = [];
    if (c.how === 'prim') {
      o.push('public class Main {', '    public static void main(String[] args) {', '        int a = 1;', '        int b = a;', '        b = 2;', '        System.out.println(a);', '        System.out.println(a == b);', '    }', '}');
      return o.join('\n');
    }
    o.push('class Card {', '    String owner;', '}', '', 'public class Main {', '    public static void main(String[] args) {', '        Card a = new Card();', '        a.owner = "Alice";');
    if (c.how === 'same') o.push('        // the reference in a is copied to b, so b refers to that same object. No new object is created', '        Card b = a;');
    else {
      o.push('        Card b = new Card();');
      if (c.how === 'copy') o.push('        b.owner = a.owner;');
    }
    o.push('        b.owner = "Bob";', '        System.out.println(a.owner);', '        System.out.println(a == b);', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { same: 'Card b = a;', fresh: 'Card b = new Card();', copy: 'owner copied after new Card()', prim: 'int variables' }[c.how]; },
  columns: ['Value of a after changing b', 'a == b', 'Card objects created'],
  simulate: function (c) {
    var how = c.how, prim = how === 'prim', ev = [], sum = [], after = null, NM = ['A', 'B'];
    var st = { prim: prim, vars: { a: null, b: null }, objs: [{ made: false, owner: null }, { made: false, owner: null }], out: [], hot: '', made: 0, done: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function mk(i) { st.objs[i].made = true; st.made++; }
    function sameThing() { var a = st.vars.a, b = st.vars.b; return prim ? a.val === b.val : a.ref === b.ref; }
    function ownerOf(nm) { return st.objs[st.vars[nm].ref].owner; }
    function show(nm) { var o = ownerOf(nm); return o === null ? 'empty' : o; }

    if (prim) {
      st.hot = 'va'; st.vars.a = { val: 1 };
      push('The line int a = 1; runs. The int variable a has the value 1 itself inside it. It is not a value that refers to an object. The 1 is right there inside it.');
      st.hot = 'va vb'; st.vars.b = { val: st.vars.a.val };
      after = { eq: sameThing() };
      push('The line int b = a; runs. The value 1 inside a is copied to b. Now a and b each have their own value 1. The two values are equal, so a == b is true for now.');
      st.hot = 'vb'; st.vars.b = { val: 2 };
      push('The line b = 2; runs. It changes the value inside b to 2. The 1 inside a is a value separate from b, so it stays the same.');
      st.hot = 'va'; st.out.push('1');
      push('The line System.out.println(a); runs. It prints the value 1 inside a. b was changed, but a was not changed.');
      st.hot = 'va vb'; st.out.push('false');
      push('The line System.out.println(a == b); runs. For int variables, == looks at whether the values inside the two variables are equal. a is 1 and b is 2, so it prints false.');
      st.hot = ''; st.done = true;
      push('main ends. No Card object appears in this code, so not a single object was created.');
      sum.push('A variable of a primitive type such as int has the value itself inside it, so int b = a; copies the value. That is why a stayed 1 even after b was changed to 2, and a == b was false.');
      sum.push('With Card variables, the line Card b = a;, which has the same form, made both variables refer to the same object, but int variables each have their own value. Whether a changes when b is changed depends on whether what is inside the variable is the value itself or a value that refers to an object (a reference).');
    } else {
      st.hot = 'va o0'; mk(0); st.vars.a = { ref: 0 };
      push('The line Card a = new Card(); runs. new Card() creates one Card object (object A in the diagram), and a value that refers to that object is stored in variable a. This value is called a reference. The object is not inside a. a refers to object A.');
      st.hot = 'va o0'; st.objs[0].owner = 'Alice';
      push('The line a.owner = "Alice"; runs. It goes to the object A that a refers to and assigns Alice to the owner of that object.');
      if (how === 'same') {
        st.hot = 'vb'; st.vars.b = { ref: 0 };
        after = { made: st.made, eq: sameThing(), owner: String(ownerOf('b')), ownerSame: ownerOf('a') === ownerOf('b') };
        push('The line Card b = a; runs. What is inside a is "a reference to object A," and this reference is copied to b. Object A is not copied. No new object was created, and there is still 1 object. a and b refer to the same object A.');
      } else {
        st.hot = 'vb o1'; mk(1); st.vars.b = { ref: 1 };
        if (how === 'fresh') after = { made: st.made, eq: sameThing(), owner: String(ownerOf('b')), ownerSame: ownerOf('a') === ownerOf('b') };
        push('The line Card b = new Card(); runs. new Card() creates one more Card object (object B), and a reference to that object is stored in b. Now a refers to object A and b refers to object B. Nothing has been assigned to the owner of the newly created object B yet (null).');
        if (how === 'copy') {
          st.hot = 'va vb o1'; st.objs[1].owner = ownerOf('a');
          after = { made: st.made, eq: sameThing(), owner: String(ownerOf('b')), ownerSame: ownerOf('a') === ownerOf('b') };
          push('The line b.owner = a.owner; runs. Reading the owner of the object A that a refers to gives Alice, and this value is assigned to the owner of the object B that b refers to. The owners of the two objects are now the same Alice, but there are still two objects, A and B. Having the same owner value does not make them the same object.');
        }
      }
      var tgt = st.vars.b.ref;
      st.hot = 'vb o' + tgt; st.objs[tgt].owner = 'Bob';
      if (how === 'same') push('The line b.owner = "Bob"; runs. It goes to the object that b refers to and assigns Bob to its owner. The object that b refers to is object A, and the object that a refers to is also object A. So the owner of object A changes from Alice to Bob.');
      else push('The line b.owner = "Bob"; runs. It assigns Bob to the owner of the object B that b refers to. Only object B changed. The owner of the object A that a refers to stays Alice.');
      st.hot = 'va o0'; st.out.push(String(ownerOf('a')));
      if (how === 'same') push('The line System.out.println(a.owner); runs. It reads the owner of the object A that a refers to and prints Bob. Nothing was changed through a, yet it has changed, because the object changed through b is the very object that a refers to.');
      else push('The line System.out.println(a.owner); runs. It reads the owner of the object A that a refers to and prints Alice. What was changed through b was object B, so object A did not change.');
      st.hot = 'va vb'; st.out.push(String(sameThing()));
      if (how === 'same') push('The line System.out.println(a == b); runs. When you use == on two variables, it compares whether the values inside them refer to the same object. a and b both refer to object A, so it prints true. It does not compare the text in owner.');
      else if (how === 'fresh') push('The line System.out.println(a == b); runs. When you use == on two variables, it compares whether the values inside them refer to the same object. a refers to object A and b refers to object B, so it prints false.');
      else push('The line System.out.println(a == b); runs. Before b.owner was changed, the owners of the two objects were the same text, but == does not compare the text in owner. It compares whether they refer to the same object. a refers to object A and b refers to object B, so it prints false.');
      st.hot = ''; st.done = true;
      push('main ends. In this run, new Card() ran ' + st.made + (st.made === 1 ? ' time and 1 Card object was created.' : ' times and ' + st.made + ' Card objects were created.') + ' A line that assigns a value to a variable did not increase the number of objects. In this code, objects were created only by new Card().');
      if (how === 'same') {
        sum.push('A Card variable has inside it not the Card object itself but a value (a reference) that refers to that object. So Card b = a; does not copy the object. It makes one more variable that refers to the same object.');
        sum.push('The owner was changed through b yet a read Bob too, a == b was true, and there was only 1 Card object. All of these have the same reason. If you want a separate object, you have to create it anew with new Card().');
      } else if (how === 'fresh') {
        sum.push('With Card b = new Card();, a new object is created and b refers to it, so a and b refer to different objects. Even after Bob was assigned through b, the object of a was still Alice, and a == b was false.');
        sum.push('Each time new Card() ran, one more object was created (2 this time). If you want a separate object, you create it anew with new like this.');
      } else {
        sum.push('If you assign the value of a.owner to the owner of a newly created object, the contents of the two objects become the same, but there are two objects. Even after b was changed, the object of a was still Alice, and a == b was false.');
        sum.push('a == b asks not whether the text of owner is the same but whether they refer to the same object. The a == b on the last line ran after b.owner was changed to Bob, so the contents were different by then too, but right after b.owner = a.owner;, when the owner of both objects was Alice, a == b was also false (our test run checked a == b at that point too).');
      }
    }
    return { events: ev, summary: sum, after: after, row: [st.out[0], st.out[1], prim ? 'None (primitive type)' : String(st.made)] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    function inVar(nm) { var x = s.vars[nm]; return !x ? 'not yet' : s.prim ? 'value ' + x.val : 'reference to object ' + (x.ref === 0 ? 'A' : 'B'); }
    H.table(v, ['Variable', 'What it holds'], [{ cls: '', cells: [(s.prim ? 'int ' : 'Card ') + 'a', inVar('a')] }, { cls: '', cells: [(s.prim ? 'int ' : 'Card ') + 'b', inVar('b')] }], 'Variables');
    if (!s.prim) {
      var rows = [];
      s.objs.forEach(function (o, i) { if (o.made) rows.push({ cls: '', cells: ['Card object ' + 'AB'[i], o.owner === null ? 'empty' : o.owner] }); });
      H.table(v, ['Object', 'owner'], rows.length ? rows : [{ cls: 'gone', cells: ['not yet', ''] }], 'Card objects created');
    }
    if (s.out.length) H.table(v, ['Output'], s.out.map(function (x) { return { cls: '', cells: [x] }; }), 'Printed on the screen');
    if (!s.prim) H.counters(v, [[s.made, 'Card objects created']]);
  },
  // Diagram: the variables a and b on the left, and the Card object boxes (with the value of owner) on the right. What matters is whether the arrows gather on the same object or go to different objects. For int, the value is directly inside the variable box and there is no object. Below are the number of objects created and the output.
  draw: function (P, sim, shown) {
    var prim = sim.c.how === 'prim', last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    function on(k) { return hot.split(' ').indexOf(k) >= 0; }
    P.size(680, 336);
    P.region('rv', 4, 8, 220, 226, 'Variables');
    P.region('ro', 426, 8, 250, 226, 'Objects');
    ['a', 'b'].forEach(function (nm, i) {
      var x = s ? s.vars[nm] : null, sub = !x ? 'not yet' : prim ? 'value ' + x.val : 'reference to ' + (x.ref === 0 ? 'A' : 'B');
      P.box('v' + nm, 14, 46 + i * 94, 200, 72, { cls: on('v' + nm) ? 'hot now' : x ? 'plain' : 'ghost', title: (prim ? 'int ' : 'Card ') + nm, sub: sub });
    });
    if (prim) {
      P.box('o0', 436, 46, 230, 72, { cls: 'ghost', title: 'Card object', sub: 'not in this code' });
    } else {
      [0, 1].forEach(function (i) {
        var o = s ? s.objs[i] : { made: false, owner: null };
        P.box('o' + i, 436, 46 + i * 94, 230, 72, { cls: o.made ? (on('o' + i) ? 'hot now' : 'plain') : 'ghost', title: 'Card object ' + 'AB'[i], sub: o.made ? 'owner: ' + (o.owner === null ? 'empty' : o.owner) : (s && s.done ? 'not created' : 'not yet') });
      });
      ['a', 'b'].forEach(function (nm, i) {
        var x = s ? s.vars[nm] : null;
        if (!x) return;
        var to = 'o' + x.ref + ':l' + (i === 1 && x.ref === 0 ? ':0.85' : '');
        P.arrow('r' + nm, 'v' + nm + ':r', to, { cls: on('v' + nm) ? 'hot' : 'good' });
      });
    }
    P.box('n1', 14, 244, 652, 36, { cls: s && s.made ? 'wait' : 'ghost', title: 'Card objects created', right: prim ? 'None (primitive type)' : String(s ? s.made : 0) });
    P.box('n2', 14, 288, 652, 36, { cls: s && s.out.length ? 'good' : 'ghost', title: 'Output', right: s ? s.out.join(' / ') : '' });
  },
  assume: 'The runtime environment is JDK 21.0.12.1 (javac 21). All four combinations were compiled with javax.tools from the same source as the code on the screen, loaded with a new class loader, and Main.main was run, and the results were checked against the captured standard output. In the source of the Probe (the checking program), only lines that count Card objects (an increment of a static variable and in the constructor, and a few output lines) were added, and for every combination it was confirmed that, with those lines removed, the text is identical to the code on the screen line by line. What was checked is the two output lines, the number of Card objects created, and the facts that the step sentences rely on. The facts are the number of objects right after the line Card b = ...; ran (for the combination that assigns new Card() and then copies the owner, right after b.owner = a.owner; ran), the value of a == b, the values of the owner of the objects that the two variables refer to, and whether those two values are the same. The documentation was checked by opening the Java Language Specification (Java SE 21) directly. That there are reference values that refer to objects, that when two variables refer to the same object a state changed through one variable can be read through the other, and that an int value is copied on assignment so that the two are separate follow sections 4.2 and 4.3.1 (example 4.3.1-2); that a variable of a primitive type holds a value of that primitive type, and a variable of a class type holds null or a reference to an object of that class, follows sections 4.12.1 and 4.12.2; and that == on references is true when both are null or refer to the same object follows section 15.21.3. That == on int variables compares values (section 15.21.1) was not confirmed by opening the documentation, and was confirmed only by the result of this run. The screen draws the texts of owner, Alice and Bob, as if they were values inside the object, but owner is also a reference that refers to a String object. This lab does not cover that difference, and it does not cover how string constants come to refer to the same object. equals, which asks whether the contents of objects are the same, is covered in "In-depth lab: == and equals". Where variables and objects are placed in memory is not something this lab covers or checked. What this lab showed is the behavior that the value stored in a variable refers to an object, and that assigning copies that value.',
});
