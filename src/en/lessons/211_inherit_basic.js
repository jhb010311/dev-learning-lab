Lab.register({
  id: 'inherit_basic', nav: 'Inheritance', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['inherit'],
  title: 'What does extends pass down?',
  why: 'If you make similar classes separately, you have to copy the same code into every class, and when you fix it, you have to fix every class. With inheritance you write the common code once in a parent class, and a child class gets it with extends, so a child class only adds its own code or rewrites only the methods that differ. Java makes every class inherit from Object, so you can call basic methods such as toString and equals on any object.',
  use: 'The inheritance that developers do most often is rewriting toString or equals, which they inherited from Object, with @Override, and making an exception class that fits the program with extends RuntimeException. When you write a servlet yourself, you extend HttpServlet, which a servlet container such as Tomcat provides, and rewrite methods such as doGet. If you change a parent, every child is affected, so when you only want to borrow the features of another class, you sometimes keep that object in a field and call its methods instead of inheriting.',
  intro: 'Inheritance is the syntax where you write extends and another class name after a class name, so that the class inherits the methods and fields written in that class (the parent class). The first inheritance you meet is invisible. A class that does not write extends still has the Object class, which Java provides, as its parent, so you can call methods such as toString() even though you did not write them. If you write an inherited method again with the same name and the same parameters, the one you wrote again runs on objects of that class. This is overriding, and @Override is a mark that asks the compiler to check it. The second most common inheritance is making an exception class with extends RuntimeException. In this lab, with the example class Member and the example class MemberNotFoundException that we made, you rewrite toString(), or delete extends and change the type of a variable and of the catch, and you compile and run the same code to see what the compiler reports and what is printed.',
  terms: ['Inheritance', 'extends', 'Object class', 'toString()', 'Overriding', '@Override', 'RuntimeException', 'Superclass and subclass'],
  controls: [
    { id: 'scene', label: 'Code to look at', type: 'select', value: 'obj', options: [['obj', 'Object, which every class inherits from'], ['exc', 'An exception class made with extends RuntimeException']] },
    { id: 'tos', label: 'toString() of Member', type: 'select', value: 'none', options: [['none', 'Do not write it'], ['ok', 'Write it again with @Override'], ['typo', 'Add @Override and mistakenly write the name as tostring'], ['typo_noann', 'Mistakenly write the name as tostring without @Override']], show: function (c) { return c.scene === 'obj'; } },
    { id: 'vt', label: 'Type of the variable m', type: 'select', value: 'Member', options: [['Member', 'Member m (the same type as the class of the object)'], ['Object', 'Object m (the type of the parent class)'], ['String', 'String m (the type of an unrelated class)']], show: function (c) { return c.scene === 'obj'; } },
    { id: 'ext', label: 'Use extends RuntimeException on MemberNotFoundException', type: 'check', value: true, show: function (c) { return c.scene === 'exc'; } },
    { id: 'ctor', label: 'Constructor of MemberNotFoundException', type: 'select', value: 'super', options: [['super', 'Write it, and pass the message with super(message)'], ['none', 'Do not write it']], show: function (c) { return c.scene === 'exc'; } },
    { id: 'ct', label: 'Type that catch receives', type: 'select', value: 'own', options: [['own', 'catch (MemberNotFoundException e)'], ['rt', 'catch (RuntimeException e) (the type of the parent class)']], show: function (c) { return c.scene === 'exc'; } },
  ],
  // q is the question shown in the question-style screen; t and d are the name and description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'Can you call toString() on an object of the class Member, which does not write extends?', d: 'Member inherits Java\'s Object even though it does not write extends. The toString() written in Object runs, and the class name and the hash code are printed, as in Member@279f2327.', v: { scene: 'obj', tos: 'none', vt: 'Member' } },
    { t: 'Write toString() again', q: 'If you write toString() again in Member with @Override, does the output of println(m) change?', d: 'The toString() that you wrote again in Member runs, and Member(Alice) is printed. println also calls that toString().', v: { scene: 'obj', tos: 'ok', vt: 'Member' } },
    { t: 'Point to it with a variable of type Object', q: 'What if a variable m of type Object points to a Member object?', d: 'Member is a child of Object, so a variable of type Object can point to it. The toString() that runs is still the one written again in Member.', v: { scene: 'obj', tos: 'ok', vt: 'Object' } },
    { t: 'Point to it with a variable of type String', q: 'Can a variable m of type String point to a Member object?', d: 'Member does not inherit from String, so it is not of type String. There is a compile-time error.', v: { scene: 'obj', tos: 'none', vt: 'String' } },
    { t: 'Misspell the name and add @Override', q: 'What if you mistakenly write toString() as tostring() and add @Override?', d: 'tostring is a method that the parent does not have, so it is not overriding. Because of @Override, the compiler reports it as an error.', v: { scene: 'obj', tos: 'typo', vt: 'Member' } },
    { t: 'Misspell the name without @Override', q: 'What if you mistakenly write toString() as tostring() and do not add @Override?', d: 'It compiles, but tostring is just a new method, so the output is Member@279f2327, exactly what the toString() of Object makes.', v: { scene: 'obj', tos: 'typo_noann', vt: 'Member' } },
    { t: 'Make an exception class', q: 'Can you throw and catch MemberNotFoundException, which is made with extends RuntimeException?', d: 'It inherits RuntimeException and becomes an exception object, so you can use it with throw and catch, and you can also call getMessage(), which you did not write.', v: { scene: 'exc', ext: true, ctor: 'super', ct: 'own' } },
    { t: 'Receive it with the type RuntimeException', q: 'Does catch (RuntimeException e) also receive MemberNotFoundException?', d: 'MemberNotFoundException is a child of RuntimeException, so the variable e of the parent type receives that object.', v: { scene: 'exc', ext: true, ctor: 'super', ct: 'rt' } },
    { t: 'Delete extends RuntimeException', q: 'What if you delete extends RuntimeException?', d: 'It becomes an ordinary class whose parent is Object, and there are compile-time errors at super(message), throw, catch, and getMessage().', v: { scene: 'exc', ext: false, ctor: 'super', ct: 'own' } },
    { t: 'Do not write the constructor', q: 'If you do not write a constructor in MemberNotFoundException, can you pass the message to the constructor of RuntimeException?', d: 'Constructors are not inherited. There is no constructor that takes a message, so there is a compile-time error.', v: { scene: 'exc', ext: true, ctor: 'none', ct: 'own' } },
  ],
  // The errors that the compiler reports (taken from the real javac diagnostics). The comparison script verify/plain/cmp_inherit_basic.js checks this text against the javac diagnostic codes.
  errOverride: 'The parent has no tostring method, so this is not overriding',
  errFit: 'A variable of type String cannot point to a Member object',
  errSuperObj: 'The parent Object has no constructor that takes a message',
  errCtor: 'MemberNotFoundException has no constructor that takes a message',
  errThrow: 'MemberNotFoundException is not a Throwable, so it cannot be thrown',
  errCatch: 'MemberNotFoundException is not a Throwable, so it cannot be written in catch',
  errMsg: 'MemberNotFoundException has no getMessage method',
  // The text that toString() of Object makes. This is the value that came out when it was actually run (it was the same on every run in the environment of this lab)
  hashOut: 'Member@279f2327',
  // The code on the screen. The comparison program (verify/plain/InheritBasicProbe.java) compiles and runs the text that this function makes, exactly as it is.
  code: function (c) {
    var o = [];
    if (c.scene === 'obj') {
      o.push('// Member is a class made as an example in this lab (it does not write extends)', 'class Member {', '    String name;', '',
        '    Member(String name) {', '        this.name = name;', '    }');
      if (c.tos === 'ok') o.push('', '    // Writes again, in the same shape, the toString() inherited from Object', '    @Override', '    public String toString() {', '        return "Member(" + name + ")";', '    }');
      else if (c.tos !== 'none') {
        o.push('', '    // Tried to write toString() again, but mistakenly wrote the name as tostring');
        if (c.tos === 'typo') o.push('    @Override');
        o.push('    public String tostring() {', '        return "Member(" + name + ")";', '    }');
      }
      o.push('}', '', 'public class Main {', '    public static void main(String[] args) {',
        '        // The type of the variable m is ' + c.vt + ', and what is created on the right is a Member object',
        '        ' + c.vt + ' m = new Member("Alice");',
        c.tos === 'ok' ? '        // Calls, through m, the toString() written again in Member' : '        // Calls, through m, the toString() that Member did not write',
        '        System.out.println(m.toString());',
        '        // println calls toString() of the object it receives and prints the result',
        '        System.out.println(m);', '    }', '}');
    } else {
      o.push('// MemberNotFoundException is an exception class made as an example in this lab',
        '// RuntimeException is an exception class that Java provides',
        'class MemberNotFoundException' + (c.ext ? ' extends RuntimeException' : '') + ' {');
      if (c.ctor === 'super') o.push('    // Passes the message it received to the constructor of the parent class', '    MemberNotFoundException(String message) {', '        super(message);', '    }');
      o.push('}', '', 'public class Main {', '    public static void main(String[] args) {', '        try {',
        '            throw new MemberNotFoundException("Member not found: Alice");',
        '        } catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e) {',
        '            // getMessage() is a method that MemberNotFoundException did not write',
        '            System.out.println("Caught: " + e.getMessage());', '        }',
        '        System.out.println("End");', '    }', '}');
    }
    return o.join('\n');
  },
  label: function (c) {
    if (c.scene === 'obj') return 'Member · ' + { none: 'toString() not written', ok: 'toString() written again', typo: '@Override on tostring()', typo_noann: 'tostring() (no @Override)' }[c.tos] + ' · ' + c.vt + ' m';
    return 'MemberNotFoundException · ' + (c.ext ? 'extends RuntimeException' : 'no extends') + ' · ' + (c.ctor === 'super' ? 'has constructor' : 'no constructor') + ' · catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e)';
  },
  columns: ['Compile', 'What the compiler reports', 'Output when run'],
  simulate: function (c) {
    var ev = [], sum = [], self = this, errAt = [], out = [];
    var st = { hot: '', bad: {}, fit: '', obj: false, ran: '', caught: false, compile: '', errs: 0, errText: '', out: [], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text, line) { st.errs++; if (!st.errText) st.errText = text; errAt.push(line); }
    var DECL = c.vt + ' m = new Member("Alice");';
    var THROW = 'throw new MemberNotFoundException("Member not found: Alice");';
    var CATCH = '} catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e) {';
    var MSG = 'System.out.println("Caught: " + e.getMessage());';

    if (c.scene === 'obj') {
      var own = { none: 'the field name and the constructor', ok: 'the field name, the constructor, and toString()', typo: 'the field name, the constructor, and tostring()', typo_noann: 'the field name, the constructor, and tostring()' }[c.tos];
      // 1. class Member
      st.hot = 'mb';
      st.checks.push(['Parent class of Member', { v: 'Object (extends not written)', cls: 'good' }]);
      push('The compiler reads the line class Member {. Member is a class made as an example in this lab, and there is no extends after the class name. The Java specification says that a class that does not write extends has the Object class, which Java provides, as its parent. So Member inherits methods written in Object, such as toString(), equals(), hashCode(), and getClass(). What is written directly inside Member is ' + own + '.', '');
      // 2. toString
      st.hot = 'ts';
      if (c.tos === 'none') {
        st.checks.push(['toString() of Member', { v: 'Not written: inherits the one from Object', cls: '' }]);
        push('toString() is not written in Member. Then the toString() you call on a Member object is the one written in Object. The body that Java wrote there is the single line return getClass().getName() + "@" + Integer.toHexString(hashCode());, which joins the class name, @, and the hash code of that object written in hexadecimal, and returns the result.', '');
      } else if (c.tos === 'ok') {
        st.checks.push(['toString() of Member', { v: 'Written again: overriding', cls: 'good' }]);
        push('The compiler reads @Override and public String toString() { ... }. Object also has public String toString(), and you wrote it again in Member with the same name, the same parameters (none), and the same return type, so it overrides the inherited toString(). @Override is an annotation that Java provides, and it is a mark that leaves it to the compiler to check that "this method overrides a method of the parent". The parent Object has the same method, so it passes.', 'good');
      } else if (c.tos === 'typo') {
        st.bad.ts = true; fail(self.errOverride, '@Override');
        st.checks.push(['@Override on tostring() of Member', { v: 'Error: the parent has no method to override', cls: 'bad' }]);
        push('The compiler reads @Override and public String tostring() { ... }. @Override is a mark that this method overrides a method of the parent, but what Object has is toString (with a capital S), and tostring is nowhere in the parent. So there is an error on the line with @Override (javac: method does not override or implement a method from a supertype). Even if the name differs by one letter, it is a different method.', 'bad');
      } else {
        st.checks.push(['tostring() of Member', { v: 'A new method (not overriding)', cls: '' }]);
        push('The compiler reads public String tostring() { ... }. There is no @Override, so the compiler does not check whether this is a method you meant to override, and accepts it as a new method tostring added to Member. There is no error. The toString() inherited from Object is still there as it was.', '');
      }
      // 3. variable m
      st.hot = 'mv';
      if (c.vt === 'Member') {
        st.fit = 'ok';
        st.checks.push(['Member variable m points to a Member object', { v: 'Can point to it', cls: 'good' }]);
        push('The compiler checks the line Member m = new Member("Alice");. The new Member("Alice") on the right is an expression that creates a Member object, and the variable m on the left is of type Member. The types are the same, so it passes.', 'good');
      } else if (c.vt === 'Object') {
        st.fit = 'ok';
        st.checks.push(['Object variable m points to a Member object', { v: 'Can point to it: the type of the parent class', cls: 'good' }]);
        push('The compiler checks the line Object m = new Member("Alice");. Member is a child class that inherits Object, so a Member object is also of type Object. So the Object variable m can point to a Member object, and it passes. From now on the compiler looks up the methods called through m in the type Object. toString() is in Object, so you can call it.', 'good');
      } else {
        st.fit = 'bad'; st.bad.mv = true; fail(self.errFit, DECL);
        st.checks.push(['String variable m points to a Member object', { v: 'Error: Member is not of type String', cls: 'bad' }]);
        push('The compiler checks the line String m = new Member("Alice");. String is the string class that Java provides, and Member does not inherit String. A Member object is not of type String, so a variable of type String cannot point to it, and there is an error (javac: incompatible types: Member cannot be converted to String). Member and String both inherit Object, but having the same parent does not make them each other\'s type.', 'bad');
      }
      // 4. the calling lines
      st.hot = 'call';
      st.checks.push(['Lines m.toString() and println(m)', { v: 'Not an error', cls: st.errs ? '' : 'good' }]);
      push('The compiler checks the lines m.toString() and System.out.println(m). toString() is a method ' + (c.vt === 'String' ? 'that String also has' : c.tos === 'ok' && c.vt === 'Member' ? 'that was written again in Member' : 'inherited from Object') + ', so you can call it, and println takes any object. These two lines are not errors.' + (st.errs ? ' The errors the compiler reported are the ' + st.errs + ' above.' : ''), st.errs ? '' : 'good');
    } else {
      // 1. class MemberNotFoundException
      st.hot = 'own';
      if (c.ext) {
        st.checks.push(['Parent class of MemberNotFoundException', { v: 'RuntimeException (from Java)', cls: 'good' }]);
        push('The compiler reads the line class MemberNotFoundException extends RuntimeException. MemberNotFoundException is an exception class made as an example in this lab, and RuntimeException after extends is an exception class that Java provides. Java declares that RuntimeException inherits Exception and Exception inherits Throwable, so MemberNotFoundException inherits all the methods written in RuntimeException, Exception, Throwable, and Object, which are linked above it. getMessage(), which returns the message of an exception, is written in Throwable.', '');
      } else {
        st.checks.push(['Parent class of MemberNotFoundException', { v: 'Object (extends not written)', cls: '' }]);
        push('The compiler reads the line class MemberNotFoundException {. There is no extends, so the parent of this class is Object. Even if the name ends with Exception, it is an ordinary class that has nothing to do with RuntimeException, and it does not inherit getMessage(), which is written in Throwable.', '');
      }
      // 2. constructor
      st.hot = 'ctor';
      if (c.ctor === 'super' && c.ext) {
        st.checks.push(['super(message) in the constructor', { v: 'Calls RuntimeException(String message)', cls: 'good' }]);
        push('The compiler reads the constructor MemberNotFoundException(String message). super(message) in the body calls the constructor of the parent class that takes one String. The parent RuntimeException has the constructor RuntimeException(String message) that Java wrote, so it passes. That constructor saves the message it received, and getMessage() returns it later.', 'good');
      } else if (c.ctor === 'super') {
        st.bad.ctor = true; fail(self.errSuperObj, 'super(message);');
        st.checks.push(['super(message) in the constructor', { v: 'Error: Object has no such constructor', cls: 'bad' }]);
        push('The compiler reads the constructor MemberNotFoundException(String message). super(message) in the body calls the constructor of the parent class that takes one String, but there is no extends, so the parent is Object. The only constructor of Object is Object(), which takes no arguments, so there is an error (javac: constructor Object in class Object cannot be applied to given types).', 'bad');
      } else {
        st.checks.push(['Constructor of MemberNotFoundException', { v: 'One no-argument constructor that the compiler added', cls: '' }]);
        push('No constructor is written in MemberNotFoundException. The compiler adds one no-argument constructor MemberNotFoundException() to a class that writes no constructor at all (the default constructor). ' + (c.ext ? 'Even though the parent RuntimeException has the constructor RuntimeException(String message), which takes a message, constructors are not inherited. This is different from methods.' : 'Constructors are not inherited from the parent.'), '');
      }
      // 3. throw
      st.hot = 'tw';
      if (c.ctor === 'none') {
        st.bad.tw = true; fail(self.errCtor, THROW);
        st.checks.push(['throw new MemberNotFoundException("…")', { v: 'Error: no constructor takes a string', cls: 'bad' }]);
        push('The compiler checks the line throw new MemberNotFoundException("Member not found: Alice");. It looks for a MemberNotFoundException constructor that takes one string, but there is only the no-argument constructor, so there is an error (javac: constructor MemberNotFoundException in class MemberNotFoundException cannot be applied to given types).' + (c.ext ? ' This shows that you inherit methods such as getMessage() but do not inherit constructors. To pass a message, you have to write a constructor and call the constructor of RuntimeException with super(message).' : ''), 'bad');
      } else if (c.ext) {
        st.checks.push(['throw new MemberNotFoundException("…")', { v: 'Passes: it is of type Throwable', cls: 'good' }]);
        push('The compiler checks the line throw new MemberNotFoundException("Member not found: Alice");. With throw you can throw only an object of type Throwable. MemberNotFoundException inherits Throwable through RuntimeException, so it is also of type Throwable, and it passes.', 'good');
      } else {
        st.bad.tw = true; fail(self.errThrow, THROW);
        st.checks.push(['throw new MemberNotFoundException("…")', { v: 'Error: not of type Throwable', cls: 'bad' }]);
        push('The compiler checks the line throw new MemberNotFoundException("Member not found: Alice");. With throw you can throw only an object of type Throwable, but MemberNotFoundException does not inherit Throwable, so it is not of type Throwable, and there is an error (javac: incompatible types: MemberNotFoundException cannot be converted to Throwable).', 'bad');
      }
      // 4. catch
      st.hot = 'ca';
      if (c.ct === 'rt') {
        st.checks.push(['catch (RuntimeException e)', { v: 'Passes', cls: 'good' }]);
        push('The compiler checks catch (RuntimeException e) and e.getMessage(). The type written in catch must be Throwable or a child of it, and RuntimeException, which Java provides, is a child of Throwable, so it passes. e is a variable of type RuntimeException, and getMessage() is a method that RuntimeException inherited from Throwable, so you can call it.' + (c.ext ? ' MemberNotFoundException is a child of RuntimeException, so this variable e of the parent type can receive the thrown MemberNotFoundException object.' : ' These two lines are not errors.'), 'good');
      } else if (c.ext) {
        st.checks.push(['catch (MemberNotFoundException e)', { v: 'Passes', cls: 'good' }]);
        push('The compiler checks catch (MemberNotFoundException e) and e.getMessage(). The type written in catch must be Throwable or a child of it, and MemberNotFoundException is a child of Throwable, so it passes. MemberNotFoundException did not write getMessage(), but it is a method inherited from Throwable, so you can call it.', 'good');
      } else {
        st.bad.ca = true; fail(self.errCatch, CATCH); fail(self.errMsg, MSG);
        st.checks.push(['catch (MemberNotFoundException e)', { v: 'Error: not of type Throwable', cls: 'bad' }]);
        st.checks.push(['e.getMessage()', { v: 'Error: there is no getMessage', cls: 'bad' }]);
        push('The compiler checks catch (MemberNotFoundException e). The type written in catch must be Throwable or a child of it, and MemberNotFoundException is not, so there is an error (javac: incompatible types: MemberNotFoundException cannot be converted to Throwable). The e.getMessage() on the next line is also an error. This is because neither MemberNotFoundException nor its parent Object has getMessage() (javac: cannot find symbol).', 'bad');
      }
    }

    // Compile result
    st.hot = '';
    var ok = st.errs === 0;
    if (!ok) {
      st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: ' + st.errs, cls: 'bad' }]);
      push('Compilation fails. The number of errors the compiler reported is ' + st.errs + ', and the first error is "' + st.errText + '". The Main class file was not made, so the program cannot be run.', 'bad');
    } else {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compilation succeeds and the Main class file is made.', 'good');
    }

    // Run
    if (ok && c.scene === 'obj') {
      var line = c.tos === 'ok' ? 'Member(Alice)' : self.hashOut;
      st.hot = 'obj'; st.obj = true;
      push('java Main runs it. new Member("Alice") creates a Member object, and the variable m points to that object.', '');
      st.hot = 'run1'; st.ran = c.tos === 'ok' ? 'mb' : 'ob'; st.out.push(line); out.push(line);
      st.checks.push(['What ran for m.toString()', { v: c.tos === 'ok' ? 'The toString() written again in Member' : 'The toString() written in Object', cls: 'good' }]);
      if (c.tos === 'ok') push('m.toString() runs. The toString() to run is looked up first in the class of the object that m points to, Member. The toString() written again in Member is there, so it runs and returns Member(Alice), and that text is printed. The toString() written in Object does not run.' + (c.vt === 'Object' ? ' It is the same even if the type of the variable m is Object. The compiler looked at the type of the variable (Object) only to check that toString() can be called, and which toString() actually runs is decided at run time by looking at the class of the object (Member).' : ''), 'good');
      else push('m.toString() runs. The toString() to run is looked up first in the class of the object that m points to, Member. Member ' + (c.tos === 'typo_noann' ? 'has only tostring, which has a different name, and no toString,' : 'has no toString(),') + ' so the toString() written in the parent Object runs and returns ' + line + ', and that text is printed. Member at the front is the class name, and 279f2327 after @ is the hash code of this object written in hexadecimal. This value came out when it was run in the environment of this lab. Java does not say that the hash code is the same on every run, so a different value may come out.', 'good');
      st.hot = 'run2'; st.out.push(line); out.push(line);
      push('The line System.out.println(m) runs. println is a method that Java provides, and when it receives an object, it goes through String.valueOf, calls toString() of that object, and prints the text it gets back. So the same text as the previous line, which wrote m.toString() (' + line + '), is printed once more. What is printed when you print an object with println is decided by the toString() of its class.', 'good');
    } else if (ok) {
      st.hot = 'tw'; st.obj = true;
      push('java Main runs it. new MemberNotFoundException("Member not found: Alice") creates an exception object. The constructor passes the text it received to the constructor of RuntimeException with super(message), and that text becomes the message of this exception object. The moment throw throws that object, the run inside try stops.', '');
      st.hot = 'ca'; st.caught = true; st.out.push('Caught: Member not found: Alice'); out.push('Caught: Member not found: Alice');
      st.checks.push(['Where the thrown exception was received', { v: 'catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e)', cls: 'good' }]);
      push('What was thrown is a MemberNotFoundException object, and because it ' + (c.ct === 'own' ? 'is the same as the type that catch receives' : 'is a child of the type that catch receives (RuntimeException)') + ', the run moves to catch.' + (c.ct === 'rt' ? ' The type of the variable e is RuntimeException, but what e points to is a MemberNotFoundException object.' : '') + ' For e.getMessage(), the getMessage() written in Throwable runs and returns the saved message, and Caught: Member not found: Alice is printed.', 'good');
      st.hot = 'end'; st.out.push('End'); out.push('End');
      push('The line after try-catch runs and End is printed. The catch received the thrown exception, so the program did not stop and went on.', 'good');
    }

    // Summary: the first line is the answer for this setting (question)
    if (c.scene === 'obj') {
      if (c.vt === 'String') {
        sum.push('Member does not inherit String, so a Member object is not of type String, and a variable m of type String cannot point to it. Compilation failed.' + (c.tos === 'typo' ? ' In this setting the @Override on tostring() is also an error, so there were 2 errors.' : ''));
        sum.push('A variable can point to an object only when the type of the variable is the class of that object or a parent class that the class inherited. A variable of the parent type Object could point to a Member object, but an unrelated String cannot.');
      } else if (c.tos === 'none') {
        sum.push('Member did not write extends, but it inherits Java\'s Object, so it could call toString(), which Member did not write. What ran is the toString() written in Object, and ' + self.hashOut + ', which joins the class name and the hash code, was printed.' + (c.vt === 'Object' ? ' Even when the type of the variable m was written as the parent class Object, it pointed to the same Member object and the result was the same.' : ''));
        sum.push('Every class in Java inherits Object like this. You were already using inheritance before you wrote extends yourself. println(m) also called that toString() and printed the same text.');
      } else if (c.tos === 'ok') {
        sum.push('When toString() was written again in Member in the same shape (overriding), both m.toString() and println(m) printed Member(Alice). The toString() written in Object did not run.' + (c.vt === 'Object' ? ' Even though the type of the variable m is the parent class Object, what ran was the toString() written again in Member, the class of the object.' : ''));
        sum.push(c.vt === 'Object' ? 'The compiler looks at the type of the variable only to check that the call is possible, and at run time it looks up the method starting from the class of the object. So even if you handle the object through a variable of the parent type, the method that the child wrote again runs.' : 'You can use an inherited method as it is, or you can change it by writing it again in the child class like this. It is common to override toString() so that an object is printed in a readable way in logs and in the debugger.');
      } else if (c.tos === 'typo') {
        sum.push('tostring is a method that the parent Object does not have, so it is not overriding, but @Override was added to it, so the compiler reported it as an error and compilation failed.');
        sum.push('@Override is a mark that asks the compiler to check that "this rewrites a method of the parent". Thanks to it, you can find a mistake in a name before you run the program.');
      } else {
        sum.push('Without @Override, tostring(), whose name was written wrong, is added as a new method without any error. So the toString() that ran was still the one from Object, and ' + self.hashOut + ' was printed.');
        sum.push('Even if the names look alike, it is not overriding unless the name and the parameters are the same. Unlike the earlier case with @Override, the compiler does not tell you, so you do not find the mistake until you run it.');
      }
    } else if (ok) {
      if (c.ct === 'own') {
        sum.push('MemberNotFoundException, made with extends RuntimeException, could be thrown with throw and received with catch. It also inherited getMessage(), which MemberNotFoundException did not write, so it got back the message passed through the constructor and printed it.');
        sum.push('We did not make the exception class from scratch. We inherited RuntimeException, which Java provides, and wrote only the name and the constructor. What you need to throw and catch, and getMessage(), are all on the parent side that Java wrote.');
      } else {
        sum.push('catch (RuntimeException e) also received MemberNotFoundException. MemberNotFoundException is a child of RuntimeException, so the variable e of the parent type can point to that object.');
        sum.push('If you receive with the parent type, one catch can receive all of its child exceptions together. What was called with e.getMessage() was the getMessage() written in Throwable, and the message was what the MemberNotFoundException object had saved.');
      }
    } else if (c.ctor === 'none') {
      sum.push('If you do not write a constructor, MemberNotFoundException has only the no-argument constructor that the compiler added, so compilation failed on the line that passes a message, such as new MemberNotFoundException("…").' + (c.ext ? ' Even though the parent RuntimeException has a constructor that takes a message, you could not use it.' : ''));
      sum.push('Methods are inherited, but constructors are not. So when you make an exception class, you write a constructor like MemberNotFoundException(String message) { super(message); } and pass the message to the constructor of the parent.');
    } else {
      sum.push('If you delete extends RuntimeException, MemberNotFoundException becomes an ordinary class whose parent is Object, and there were ' + st.errs + ' errors at the super(message) and throw' + (c.ct === 'own' ? ', catch, and getMessage()' : '') + ' lines, so compilation failed.');
      sum.push('What lets you throw and catch is not the name but Throwable, which you reach through extends. Even if the name ends with Exception, a class without extends is not an exception class.');
    }
    var row = ok ? ['Success', 'None', out.join(' / ')] : ['Error', st.errText, 'Cannot run'];
    return { events: ev, summary: sum, nerr: st.errs, errAt: errAt, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    if (s.out.length) H.table(v, ['Output'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), 'Output when run');
    H.counters(v, [[s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: the Object scene has Object on the left with Member, which inherits it, and the variable m and the Member object on the right. An arrow goes to the class where the toString() that ran is written.
  //       The exception scene has the inheritance chain on the left, Throwable, Exception, RuntimeException, and MemberNotFoundException, and throw and catch on the right.
  //       At the very bottom are the compile result and the output.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var hot = s ? s.hot : '', bad = s ? s.bad : {}, err = s && s.compile === 'err';
    function cls(id) { return bad[id] ? 'bad' : hot === id ? 'hot now' : 'plain'; }
    if (c.scene === 'obj') {
      P.size(680, 360);
      P.box('ob', 14, 14, 270, 62, { cls: s && s.ran === 'ob' ? 'good' : 'plain', title: 'Object (class from Java)', sub: 'Has toString(), equals()' });
      var msub = { none: 'name, constructor', ok: 'name, constructor, own toString()', typo: 'name, @Override tostring()', typo_noann: 'name, constructor, tostring()' }[c.tos];
      P.box('mb', 14, 150, 270, 62, { cls: bad.ts ? 'bad' : hot === 'mb' || hot === 'ts' ? 'hot now' : s && s.ran === 'mb' ? 'good' : 'plain', title: 'Member (example class)', sub: msub });
      P.arrow('ex', 'mb:t', 'ob:b', { cls: hot === 'mb' ? 'hot' : 'mut', label: 'inherits (extends omitted)' });
      P.box('mv', 400, 14, 266, 62, { cls: bad.mv ? 'bad' : hot === 'mv' || hot === 'call' ? 'hot now' : 'plain', title: c.vt + ' m', sub: 'Variable of type ' + c.vt });
      P.box('mo', 400, 150, 266, 62, { cls: s && s.obj ? (hot === 'obj' ? 'good now' : 'good') : 'ghost', title: 'Member object', sub: s && s.obj ? 'name = "Alice"' : err ? 'Not created' : 'Does not exist yet' });
      if (s && s.obj) P.arrow('ref', 'mv:b', 'mo:t', { cls: 'good', label: 'points to' });
      else if (s && s.fit === 'bad') P.arrow('ref', 'mv:b', 'mo:t', { cls: 'bad', label: 'cannot point' });
      if (s && s.ran) P.arrow('run', 'mo:l', s.ran === 'mb' ? 'mb:r' : 'ob:r', { cls: 'good', label: 'runs toString()' });
      P.box('r1', 14, 248, 652, 44, { cls: s && s.compile === 'ok' ? 'good' : err ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Errors: ' + s.errs) : '', sub: s && s.errText ? s.errText : '' });
      P.box('r2', 14, 304, 652, 44, { cls: s && s.out.length ? 'good' : err ? 'bad' : 'ghost', title: 'Output', sub: s && s.out.length ? s.out.join(' / ') : err ? 'Cannot run' : '' });
    } else {
      P.size(680, 400);
      P.box('th', 14, 14, 300, 44, { cls: s && s.caught ? 'good' : 'plain', title: 'Throwable (from Java)', sub: 'Has getMessage()' });
      P.box('ex', 14, 84, 300, 44, { cls: 'plain', title: 'Exception (from Java)' });
      P.box('rt', 14, 154, 300, 44, { cls: hot === 'ctor' && c.ext && c.ctor === 'super' ? 'hot now' : 'plain', title: 'RuntimeException (from Java)', sub: 'RuntimeException(String message)' });
      P.box('own', 14, 224, 300, 44, { cls: bad.ctor ? 'bad' : hot === 'own' || hot === 'ctor' ? 'hot now' : 'plain', title: 'MemberNotFoundException (example)', sub: c.ext ? (c.ctor === 'super' ? 'super(message) in the constructor' : 'Constructor not written') : 'No extends: parent is Object' });
      P.arrow('e1', 'ex:t', 'th:b', { cls: 'mut' });
      P.arrow('e2', 'rt:t', 'ex:b', { cls: 'mut' });
      if (c.ext) P.arrow('e3', 'own:t', 'rt:b', { cls: hot === 'own' ? 'hot' : 'mut' });
      P.box('tw', 380, 14, 286, 56, { cls: bad.tw ? 'bad' : hot === 'tw' ? (s.obj ? 'good now' : 'hot now') : s && s.obj ? 'good' : 'plain', title: 'throw', sub: 'new MemberNotFoundException("…")' });
      P.box('ca', 380, 154, 286, 56, { cls: bad.ca ? 'bad' : hot === 'ca' ? (s.caught ? 'good now' : 'hot now') : s && s.caught ? 'good' : 'plain', title: 'catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e)', sub: s && s.caught ? 'e.getMessage() → saved message' : 'Calls e.getMessage()' });
      if (s && s.caught) P.arrow('go', 'tw:b', 'ca:t', { cls: 'good', label: 'receives the thrown exception' });
      P.box('r1', 14, 290, 652, 44, { cls: s && s.compile === 'ok' ? 'good' : err ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Errors: ' + s.errs) : '', sub: s && s.errText ? s.errText : '' });
      P.box('r2', 14, 344, 652, 44, { cls: s && s.out.length ? 'good' : err ? 'bad' : 'ghost', title: 'Output', sub: s && s.out.length ? s.out.join(' / ') : err ? 'Cannot run' : '' });
    }
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all twenty combinations (12 for the Object scene and 8 for the exception scene), the same text as the code on the screen (the source that the code function makes, written to a file exactly as it is) was compiled with javax.tools, and the ones that compiled successfully were run separately with java -cp, and the results were checked against the standard output, standard error, and exit code that were captured. What was checked is whether compilation succeeded, the diagnostic code and the English message of the first error (the error descriptions on the screen restate these in plain words), the number of errors and the lines where they occurred, whether the Main class file was made, and the output when run. The number of errors and the line where each occurs are not fixed by the specification but were observed on this javac. For example, when the constructor was not written, even without extends, the error on the throw line came out as just the one constructor error. The facts that the step sentences rely on were also checked by reflection: that the parent of Member, which does not write extends, is java.lang.Object, and that toString, equals, hashCode, and getClass are written in Object; that if you write toString again it becomes the one in Member, and if you mistakenly write it as tostring, toString is still the one in Object; that MemberNotFoundException links to RuntimeException, Exception, Throwable, and Object, and getMessage is written in Throwable; that RuntimeException has a RuntimeException(String) constructor; and that an exception class that writes no constructor gets just one no-argument constructor. The 279f2327 in Member@279f2327 is a value that came out the same all four times that the same program was run in this environment. The description of Object.hashCode in Java says that this value does not have to be the same on every run, so a different value may come out in another environment. The behavior of the Java API was checked by opening the source that comes with this JDK (lib/src.zip). It was confirmed that the body of Object.toString is getClass().getName() + "@" + Integer.toHexString(hashCode()), that PrintStream.println(Object) gets the text with String.valueOf and String.valueOf calls toString() if the object is not null, and that RuntimeException(String message) saves the message it received so that getMessage() can take it out again. The specification was checked by opening the Java Language Specification (Java SE 21) directly. That the extends clause decides the direct superclass, and that the direct superclass of an ordinary class that does not write extends is Object, is from Section 8.1.4; that a class inherits the methods of its direct superclass is from Sections 8.2 and 8.4.8; that constructors are not members and so are not inherited is from Sections 8.2 and 8.8; that if you write no constructor at all, a default constructor with no arguments is made is from Section 8.8.9; that it is a compile-time error if a method with @Override does not override a method of its superclass is from Section 9.6.4.4; that the expression of throw must have a type that can be assigned to Throwable is from Section 14.18; that the type written in catch must be Throwable or a subclass of it is from Section 14.20; that if the actual class of the thrown object can be assigned to the type of catch, that catch is chosen is from Section 14.20.1; that a value of a child type can be assigned to a variable of the parent type is from Sections 5.1.5 and 5.2; and that at run time a method is looked up from the actual class of the object upward is from Section 15.12.4.4. The code on the screen has all the classes in one file, and the access modifiers are cut down. For the super(message) of the constructor used when making an exception class, only passing the message was covered, and the order in which the parent constructor runs and the detailed rules of super are covered in the "In-depth lab: Inheritance and overriding". The rule of overriding equals and hashCode together, the inheritance of fields, the fact that private members are not inherited, checked exceptions made with extends Exception, and extends HttpServlet for a servlet were not run in this lab. A servlet that inherits HttpServlet is actually deployed on Tomcat in the "Servlets" lab (Fundamentals).',
});
