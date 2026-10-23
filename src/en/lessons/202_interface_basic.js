Lab.register({
  id: 'interface_basic', nav: 'Interfaces', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['absint'],
  title: 'What does an interface look like in code, and what does it decide?',
  why: 'If the code that uses a feature is tied to one particular class name, then every time you change that feature to work another way, the code on the using side has to be changed too. An interface fixes "these methods exist" as a type, so the using side calls methods by looking only at that type, and it can handle an object of any class that actually arrives with the same code. A class can inherit from only one class with extends, but it can implement several interfaces with implements, so classes that have nothing to do with each other can still be of the same interface type.',
  use: 'Java\'s List and Map are interfaces, so as in List<String> names = new ArrayList<>(); you write the variable with the interface type and choose between ArrayList and LinkedList to create the actual object. If a class you wrote implements Java\'s Comparable, Collections.sort can sort a list of that class, and if it implements Runnable, it becomes the work that a thread runs. In Spring Data JPA, if you only declare an interface that extends JpaRepository, Spring creates the object that implements it for you.',
  intro: 'An interface is a type that you declare with interface, and it fixes "if something is of this type, it has these methods". The interfaces you meet most often are the ones that Java provides. List, which handles lists, is an interface in the java.util package, and ArrayList and LinkedList are classes that implement it with implements List. Comparable, which decides sort order, is also an interface that Java provides, and Collections.sort sorts a list of elements that implement Comparable. In this lab you compile and run short programs that use Java\'s List and Comparable, change the type of a variable and the object that is created, or delete implements, and see what the compiler reports and what is printed. At the end you briefly see what it looks like to declare an interface yourself, and how it differs from inheriting a class with extends.',
  terms: ['Interface', 'List, Set, Map', 'ArrayList', 'LinkedList', 'Comparable and Comparator', 'Collections.sort', 'implements', 'Abstract method', 'extends', 'Type'],
  controls: [
    { id: 'scene', label: 'Code to look at', type: 'select', value: 'list', options: [['list', 'Handle a list with Java\'s List interface'], ['sort', 'Sort with Java\'s Comparable interface'], ['own', 'Declare an interface yourself']] },
    { id: 'vtype', label: 'Type of the variable names', type: 'select', value: 'List', options: [['List', 'List<String> (interface)'], ['ArrayList', 'ArrayList<String> (class)']], show: function (c) { return c.scene === 'list'; } },
    { id: 'make', label: 'What is created on the right of =', type: 'select', value: 'ArrayList', options: [['ArrayList', 'new ArrayList<>()'], ['LinkedList', 'new LinkedList<>()'], ['List', 'new List<>()']], show: function (c) { return c.scene === 'list'; } },
    { id: 'trim', label: 'Call trimToSize(), which only the ArrayList class has, on names', type: 'check', value: false, show: function (c) { return c.scene === 'list'; } },
    { id: 'cmp', label: 'The example class Member that we made', type: 'select', value: 'both', options: [['both', 'It has both implements Comparable<Member> and the compareTo method'], ['noimpl', 'It has the compareTo method but no implements'], ['nomethod', 'It has implements but no compareTo method']], show: function (c) { return c.scene === 'sort'; } },
    { id: 'own', label: 'Greeter, a name chosen for this example', type: 'select', value: 'iface', options: [['iface', 'Declare it as interface Greeter, and Hello implements it'], ['cls', 'Declare it as class Greeter, and Hello extends it']], show: function (c) { return c.scene === 'own'; } },
  ],
  // q is the question shown in the question-style screen; t and d are the name and description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an interface look like in code, and what does it do for you?', d: 'The variable names, of the type List (an interface that Java provides), points to an ArrayList object. add and size are methods that List fixes, so you can call them on names.', v: { scene: 'list', vtype: 'List', make: 'ArrayList', trim: false } },
    { t: 'Swap in LinkedList', q: 'If you change the right side to new LinkedList<>(), do you have to change the code after it too?', d: 'LinkedList is also a class that implements List, so the only place you changed is the right side of new. The code after it compiles as it is and prints the same list.', v: { scene: 'list', vtype: 'List', make: 'LinkedList', trim: false } },
    { t: 'Create it with new List<>()', q: 'Can you create an object directly from the interface List?', d: 'List is an interface, so you cannot create an object from it with new. There is a compile-time error.', v: { scene: 'list', vtype: 'List', make: 'List', trim: false } },
    { t: 'Call trimToSize() on a List variable', q: 'Can you call a method that only ArrayList has through a variable of type List?', d: 'Even if the actual object is an ArrayList, the compiler looks only at the type of the variable, List. List has no trimToSize, so there is a compile-time error.', v: { scene: 'list', vtype: 'List', make: 'ArrayList', trim: true } },
    { t: 'Make an ArrayList variable point to a LinkedList', q: 'If you write the variable type as ArrayList, can you swap in a LinkedList?', d: 'A variable of type ArrayList cannot point to a LinkedList object, so there is a compile-time error. If you write the variable with a class type, you are tied to that class.', v: { scene: 'list', vtype: 'ArrayList', make: 'LinkedList', trim: false } },
    { t: 'Implement Comparable', q: 'Why can Collections.sort sort a list of Member?', d: 'Member, an example class that we made, implements Java\'s Comparable and writes compareTo, so Collections.sort sorts by age.', v: { scene: 'sort', cmp: 'both' } },
    { t: 'compareTo without implements', q: 'If there is only a compareTo method, does Collections.sort sort the list?', d: 'Even if a method with the same name exists, without implements Member is not of type Comparable. There is a compile-time error on the Collections.sort line.', v: { scene: 'sort', cmp: 'noimpl' } },
    { t: 'implements without compareTo', q: 'What if you write only implements Comparable and do not write compareTo?', d: 'An interface does not pass down the body of a method. You did not write compareTo yourself, so there is a compile-time error.', v: { scene: 'sort', cmp: 'nomethod' } },
    { t: 'Declare an interface yourself', q: 'What does it look like when you declare an interface yourself, and how is it different from extends?', d: 'interface Greeter, a name chosen for this example, fixes only the name of greet, and Hello implements it and writes the body. If you inherit a class with extends, you inherit the body too, but you can inherit only one class.', v: { scene: 'own', own: 'iface' } },
  ],
  // The errors that the compiler reports (taken from the real javac diagnostics). The comparison script verify/plain/cmp_interface_basic.js checks this text against the javac diagnostic codes.
  errNew: 'List is an interface, so new cannot create an object from it',
  errTrim: 'The List type has no trimToSize method',
  errFit: 'A variable of type ArrayList cannot point to a LinkedList object',
  errSort: 'Member is not a Comparable, so it cannot be passed to Collections.sort',
  errMiss: 'Member did not write the compareTo method',
  // The code on the screen. The comparison program (verify/plain/InterfaceBasicProbe.java) compiles and runs the text that this function makes, exactly as it is.
  code: function (c) {
    var o = [];
    if (c.scene === 'list') {
      o.push('// Bring in what Java provides (java.util package)', 'import java.util.ArrayList;', 'import java.util.LinkedList;', 'import java.util.List;', '',
        'public class Main {', '    public static void main(String[] args) {',
        '        // List is an interface that Java provides; ArrayList and LinkedList are classes that Java provides',
        '        ' + c.vtype + '<String> names = new ' + c.make + '<>();',
        '        names.add("Alice");', '        names.add("Bob");', '        names.add("Carol");');
      if (c.trim) o.push('        // trimToSize is a method that only the ArrayList class has (the List interface does not have it)', '        names.trimToSize();');
      o.push('        System.out.println(names + ", " + names.size() + " names");',
        '        System.out.println("names points to: " + names.getClass().getSimpleName());', '    }', '}');
    } else if (c.scene === 'sort') {
      o.push('import java.util.ArrayList;', 'import java.util.Collections;', 'import java.util.List;', '',
        '// Member is a class made as an example in this lab; Comparable is an interface that Java provides',
        'class Member' + (c.cmp !== 'noimpl' ? ' implements Comparable<Member>' : '') + ' {',
        '    String name;', '    int age;', '',
        '    Member(String name, int age) {', '        this.name = name;', '        this.age = age;', '    }');
      if (c.cmp !== 'nomethod') o.push('',
        c.cmp === 'both' ? '    // Writes the method that Comparable fixes: the younger one comes first' : '    // A method with the same name and shape as compareTo of Comparable',
        '    public int compareTo(Member other) {', '        return Integer.compare(this.age, other.age);', '    }');
      o.push('}', '',
        'public class Main {', '    public static void main(String[] args) {',
        '        List<Member> members = new ArrayList<>();',
        '        members.add(new Member("Alice", 31));', '        members.add(new Member("Bob", 25));', '        members.add(new Member("Carol", 28));',
        '        // A sort method that Java provides: it takes a list of elements that implement Comparable',
        '        Collections.sort(members);',
        '        for (Member m : members) {', '            System.out.println(m.name + " " + m.age);', '        }', '    }', '}');
    } else if (c.own === 'iface') {
      o.push('// Greeter is an interface made as an example in this lab: it fixes only the name of greet and has no body', 'interface Greeter {', '    String greet(String name);', '}', '',
        '// Hello is a class made as an example: it implements Greeter and writes the body of greet itself', 'class Hello implements Greeter {',
        '    public String greet(String name) {', '        return "Hello, " + name;', '    }', '}', '',
        'public class Main {', '    public static void main(String[] args) {', '        Greeter g = new Hello();', '        System.out.println(g.greet("Alice"));', '    }', '}');
    } else {
      o.push('// Greeter is a class made as an example in this lab: it even has the body of greet', 'class Greeter {',
        '    String greet(String name) {', '        return "Hello, " + name;', '    }', '}', '',
        '// Hello is a class made as an example: it extends Greeter, so it has greet without writing it', 'class Hello extends Greeter {', '}', '',
        'public class Main {', '    public static void main(String[] args) {', '        Greeter g = new Hello();', '        System.out.println(g.greet("Alice"));', '    }', '}');
    }
    return o.join('\n');
  },
  label: function (c) {
    if (c.scene === 'list') return c.vtype + '<String> names = new ' + c.make + '<>()' + (c.trim ? ' · calls trimToSize()' : '');
    if (c.scene === 'sort') return 'Member · ' + { both: 'has implements Comparable and compareTo', noimpl: 'has only compareTo', nomethod: 'has only implements' }[c.cmp];
    return c.own === 'iface' ? 'interface Greeter declared by us · implements' : 'class Greeter declared by us · extends';
  },
  columns: ['Compile', 'What the compiler reports', 'Output when run'],
  simulate: function (c) {
    var ev = [], sum = [], self = this;
    var st = { hot: '', bad: {}, fit: '', obj: '', compile: '', errs: 0, errText: '', ran: false, out: '', checks: [], sorted: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errAt = [], out = '';

    if (c.scene === 'list') {
      var DECL = c.vtype + '<String> names = new ' + c.make + '<>();';
      var mk = c.make, isCls = mk !== 'List', fits = isCls && (c.vtype === 'List' || mk === c.vtype);
      var trimBad = c.trim && c.vtype === 'List';
      // 1. List
      st.hot = 'li';
      st.checks.push(['List', { v: 'Interface (provided by Java)', cls: 'good' }]);
      push('The compiler finds the List that Java provides from the import line. List is declared in the Java standard library as public interface List<E>. It is declared with interface, not class, and it fixes that these methods exist: add (append to the end of the list), get (take out the element at a position), and size (the number of elements). <String> means the elements of this list are strings.', '');
      // 2. new on the right
      st.hot = 'mk';
      if (mk === 'ArrayList') {
        st.checks.push(['new ArrayList<>()', { v: 'Can create an object', cls: 'good' }]);
        push('The compiler checks new ArrayList<>() on the right of =. ArrayList is a class that Java declares as public class ArrayList<E> extends AbstractList<E> implements List<E>, RandomAccess, Cloneable, Serializable. The bodies of add and size (the work they actually do) are written in it, so you can create an object with new. In the declaration, only one class (AbstractList) is written after extends, and four interfaces are written after implements. A class can inherit from only one class, but it can implement several interfaces.', '');
      } else if (mk === 'LinkedList') {
        st.checks.push(['new LinkedList<>()', { v: 'Can create an object', cls: 'good' }]);
        push('The compiler checks new LinkedList<>() on the right of =. LinkedList is a class that Java declares as public class LinkedList<E> extends AbstractSequentialList<E> implements List<E>, Deque<E>, Cloneable, Serializable. It keeps its elements in a different way from ArrayList, but because it has implements List<E>, LinkedList is also of type List, and the bodies of add and size are written.', '');
      } else {
        st.bad.mk = true; fail(self.errNew); errAt.push(DECL);
        st.checks.push(['new List<>()', { v: 'Error: cannot create an object', cls: 'bad' }]);
        push('The compiler checks new List<>() on the right of =. List is an interface declared with interface, so you cannot create an object from it with new, and there is a compile-time error (javac: List is abstract; cannot be instantiated). List only fixes that add and size exist; it is not a class in which their bodies are written. You create the object from a class that implements List, such as ArrayList or LinkedList.', 'bad');
      }
      // 3. The line that makes the variable point to the object
      st.hot = 'nv';
      if (fits) {
        st.fit = 'ok';
        st.checks.push([c.vtype + ' variable names points to a ' + mk + ' object', { v: 'Can point to it', cls: 'good' }]);
        push(c.vtype === 'List'
          ? 'The compiler checks the line List<String> names = new ' + mk + '<>();. ' + mk + ' implements List, so it is fine for the List variable names to point to a ' + mk + ' object. The type of the variable is written as the interface List, and the object that is actually created is written as the class ' + mk + '.'
          : 'The compiler checks the line ArrayList<String> names = new ArrayList<>();. The type of the variable and the class of the object are the same, so it can point to it. But names is now of type ArrayList, so if you later want to switch to another implementation of List, you have to change the type of this variable first.', 'good');
      } else if (c.vtype === 'ArrayList' && mk === 'LinkedList') {
        st.fit = 'bad'; st.bad.nv = true; fail(self.errFit); errAt.push(DECL);
        st.checks.push(['ArrayList variable names points to a LinkedList object', { v: 'Error: cannot point to it', cls: 'bad' }]);
        push('The compiler checks the line ArrayList<String> names = new LinkedList<>();. LinkedList implements List, but it is not a kind of ArrayList. So a variable of type ArrayList cannot point to a LinkedList object (javac: incompatible types: cannot infer type arguments for LinkedList<>). If the variable had been of type List, it could have pointed to either.', 'bad');
      } else if (c.vtype === 'ArrayList') {
        st.bad.nv = true; st.errs++; errAt.push(DECL);
        st.checks.push(['ArrayList variable names', { v: 'One more error on the same line', cls: 'bad' }]);
        push('The compiler reports one more error on the same line. List is not a kind of ArrayList, so it does not fit a variable of type ArrayList (javac: incompatible types: cannot infer type arguments for List<>). On this line alone there are 2 errors.', 'bad');
      } else {
        st.checks.push(['List variable names', { v: 'No problem on the variable side', cls: '' }]);
        push('The compiler checks the variable side of the line List<String> names = new List<>();. Writing the type of the variable as List is not a problem. The one error on this line is new List<>().', '');
      }
      // 4. Calling methods on names
      st.hot = 'call';
      if (trimBad) {
        st.bad.call = true; fail(self.errTrim); errAt.push('names.trimToSize();');
        st.checks.push(['Methods called on names', { v: 'add, size: exist · trimToSize: error', cls: 'bad' }]);
        push('The compiler checks names.add, names.trimToSize(), and names.size(). The compiler decides which methods you may call by looking only at the type of the variable, List, and not at which object names will actually point to. add and size are in List, but trimToSize is a method that only the ArrayList class has, so there is an error (javac: cannot find symbol, symbol: method trimToSize(), location: variable names of type List<String>).' + (mk === 'ArrayList' ? ' It is the same even if the actual object is an ArrayList.' : ''), 'bad');
      } else if (c.trim) {
        st.checks.push(['Methods called on names', { v: 'add, trimToSize, size: all exist', cls: 'good' }]);
        push('The compiler checks names.add, names.trimToSize(), and names.size(). The type of names is ArrayList, so you can also call trimToSize, which only ArrayList has. If you write the type of the variable as a class, you can use methods that only that class has, but in exchange you cannot swap in another implementation of List.', 'good');
      } else {
        st.checks.push(['Methods called on names', { v: 'add, size: both exist', cls: 'good' }]);
        push('The compiler checks names.add(...) and names.size(). The compiler decides which methods you may call by looking only at the type of the variable, ' + c.vtype + '. add and size are methods that List fixes, so ' + (c.vtype === 'List' ? 'you can use the same lines as they are whether the actual object is an ArrayList or a LinkedList.' : 'you can also call them through a variable of type ArrayList.'), 'good');
      }
      st.hot = '';
      if (isCls && fits && !trimBad) {
        st.compile = 'ok'; st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
        push('Compilation succeeds and the Main class file is made.', 'good');
        st.hot = 'ob'; st.obj = mk; st.ran = true;
        out = '[Alice, Bob, Carol], 3 names / names points to: ' + mk; st.out = out;
        st.checks.push(['Output when run', { v: out, cls: 'good' }]);
        push('java Main runs it. new ' + mk + '<>() creates a ' + mk + ' object, and names points to that object. When you call names.add, the add that is written in ' + mk + ' actually runs, and the three names are added to the list one after another. The first line prints [Alice, Bob, Carol], 3 names, and on the second line getClass().getSimpleName() prints ' + mk + '. getClass() is a method that every object has, and it tells you the class of the object that was actually created.', 'good');
      }
    } else if (c.scene === 'sort') {
      var impl = c.cmp !== 'noimpl', hasM = c.cmp !== 'nomethod';
      st.hot = 'cp';
      st.checks.push(['Comparable', { v: 'Interface (provided by Java)', cls: 'good' }]);
      push('Comparable is an interface that Java declares in the java.lang package as public interface Comparable<T> (you use java.lang without an import). It has one method, int compareTo(T o), and no body (an abstract method). It fixes that "an object of this type can be compared with another object and tell which comes first". It returns a negative number if it comes first, 0 if they are equal, and a positive number if it comes later.', '');
      st.hot = 'mb';
      if (impl) {
        st.checks.push(['Member implements Comparable<Member>', { v: 'Yes', cls: 'good' }]);
        push('The compiler reads the line class Member implements Comparable<Member>. It is a declaration that Member, an example class that we made, will implement Java\'s Comparable. So the compareTo method must be written in Member.', '');
      } else {
        st.checks.push(['Member implements Comparable<Member>', { v: 'No', cls: '' }]);
        push('The compiler reads the line class Member. There is no implements, so Member is a class that has nothing to do with Comparable. There is nothing to check on this line, so there is no error.', '');
      }
      if (impl && hasM) {
        st.checks.push(['compareTo method of Member', { v: 'Exists', cls: 'good' }]);
        push('The compiler looks for the compareTo method in Member. There is public int compareTo(Member other), so it has written the method that Comparable fixes. The body Integer.compare(this.age, other.age) puts the younger one first.', 'good');
      } else if (impl) {
        st.bad.mb = true; fail(self.errMiss); errAt.push('class Member implements Comparable<Member> {');
        st.checks.push(['compareTo method of Member', { v: 'Missing: error', cls: 'bad' }]);
        push('The compiler looks for the compareTo method in Member. There is none. It said it would implement the interface with implements Comparable<Member> but did not write the method, so there is an error (javac: Member is not abstract and does not override abstract method compareTo(Member) in Comparable). An interface does not pass down the body of a method. If you inherit a class with extends, you get the methods the parent wrote as they are, but what you receive with implements is only "this method must exist", so Member has to write the body itself.', 'bad');
      } else {
        st.checks.push(['compareTo method of Member', { v: 'Exists (not connected to Comparable)', cls: '' }]);
        push('Member has a compareTo method. But there is no implements, so even though the name and shape are the same, the compiler does not connect this method to compareTo of Comparable.', '');
      }
      st.hot = 'cs';
      if (impl) {
        st.fit = 'ok';
        st.checks.push(['Collections.sort(members)', { v: 'Can be called because Member is a Comparable', cls: 'good' }]);
        push('The compiler checks the line Collections.sort(members). Collections.sort is a sort method that Java provides, declared as public static <T extends Comparable<? super T>> void sort(List<T> list). You read it as "the element type T of the list must be Comparable". Member wrote implements Comparable<Member>, so it meets this condition.' + (hasM ? '' : ' This line itself is not an error (the only error that javac reported is the one above).'), hasM ? 'good' : '');
      } else {
        st.fit = 'bad'; st.bad.cs = true; fail(self.errSort); errAt.push('Collections.sort(members);');
        st.checks.push(['Collections.sort(members)', { v: 'Error: Member is not a Comparable', cls: 'bad' }]);
        push('The compiler checks the line Collections.sort(members). The declaration of Collections.sort is public static <T extends Comparable<? super T>> void sort(List<T> list), so the element type of the list must be Comparable. Even though Member has a compareTo method, it has no implements Comparable, so it is not of type Comparable, and there is an error (javac: no suitable method found for sort(List<Member>)). Having the method does not make it that type.', 'bad');
      }
      st.hot = '';
      if (impl && hasM) {
        st.compile = 'ok'; st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
        push('Compilation succeeds and the Main class file is made. String is also a class that Java declares with implements Comparable<String>, so a List<String> can be sorted with Collections.sort right away, without writing anything extra.', 'good');
        st.hot = 'ls'; st.obj = 'members'; st.sorted = true; st.ran = true;
        out = 'Bob 25 / Carol 28 / Alice 31'; st.out = out;
        st.checks.push(['Output when run', { v: out, cls: 'good' }]);
        push('java Main runs it. Alice 31, Bob 25, and Carol 28 are added to the list in that order. While Collections.sort sorts, it calls the compareTo written in Member for each pair of Member objects to decide which comes first, and Bob 25, Carol 28, and Alice 31 are printed one per line, youngest first. Collections.sort does not know Member, but it can sort as long as it knows the compareTo that Comparable fixes.', 'good');
      }
    } else {
      var iface = c.own === 'iface';
      st.hot = 'gr';
      st.checks.push(['Greeter', { v: iface ? 'Interface (made for this example)' : 'Class (made for this example)', cls: 'good' }]);
      push(iface
        ? 'The compiler reads the declaration interface Greeter. It is an interface made as an example in this lab. String greet(String name); has only the name, the parameter, and the return type, and ends with a semicolon without a body. In an interface this shape is an abstract method, and it fixes only that "if something is of type Greeter, it has greet". It has the same shape as Java\'s Comparable, which fixes the one method compareTo.'
        : 'The compiler reads the declaration class Greeter. It is a class made as an example in this lab, and it is class, not interface. greet even has a body, { return "Hello, " + name; }.', '');
      st.hot = 'he';
      st.checks.push(['Hello', { v: iface ? 'implements Greeter, writes greet itself' : 'extends Greeter, does not write greet', cls: 'good' }]);
      push(iface
        ? 'The compiler reads class Hello implements Greeter. It is a declaration that the example class Hello will implement Greeter, so Hello must have greet. Greeter has no body, so Hello wrote the body itself as public String greet(String name) { ... }. After implements you can write several interfaces separated by commas. Java\'s ArrayList writing the four, implements List<E>, RandomAccess, Cloneable, Serializable, is an example.'
        : 'The compiler reads class Hello extends Greeter. extends means inheriting a class (inheritance), so Hello has the greet written in Greeter as it is, body included, even though Hello does not write greet. In exchange, only one class can be written after extends. Once Hello inherits from Greeter, it cannot inherit from any other class.', 'good');
      st.hot = 'gv'; st.fit = 'ok';
      st.checks.push(['Greeter variable g points to a Hello object', { v: 'Can point to it', cls: 'good' }]);
      push('The compiler checks the line Greeter g = new Hello();. Hello wrote ' + (iface ? 'implements Greeter' : 'extends Greeter') + ', so it is also of type Greeter, and it is fine for the Greeter variable g to point to a Hello object. It has the same shape as a List variable pointing to an ArrayList object.', 'good');
      st.hot = ''; st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Success', cls: 'good' }]);
      push('Compilation succeeds and the Main class file is made.', 'good');
      st.hot = 'ob'; st.obj = 'Hello'; st.ran = true; out = 'Hello, Alice'; st.out = out;
      st.checks.push(['Output when run', { v: out, cls: 'good' }]);
      push('java Main runs it. g.greet("Alice") runs greet of the Hello object that g points to and prints Hello, Alice. ' + (iface ? 'What ran is the body that Hello wrote itself.' : 'What ran is the body that Hello inherited from Greeter.'), 'good');
    }

    var ok = st.compile === 'ok';
    if (!ok) {
      st.hot = ''; st.compile = 'err';
      st.checks.push(['Compile', { v: 'Errors: ' + st.errs, cls: 'bad' }]);
      push('Compilation fails. The number of errors the compiler reported is ' + st.errs + ', and the first error is "' + st.errText + '". The Main class file was not made, so the program cannot be run.', 'bad');
    }

    // Summary: the first line is the answer for this setting (question)
    if (c.scene === 'list') {
      if (ok && c.vtype === 'List' && c.make === 'ArrayList') {
        sum.push('An interface is a type that you declare with interface, and it fixes that certain methods exist. List, which Java provides, is an interface, and ArrayList is a class that implements it with implements List. That is why the List variable names could point to an ArrayList object.');
        sum.push('add and size, which were called on names, are methods that List fixes, so this code does not depend on whether names points to an ArrayList or a LinkedList. What ran was the add and size written in ArrayList.');
      } else if (ok && c.vtype === 'List') {
        sum.push('LinkedList is also a class that implements List, so the only place you changed was the right side of new, and the code after it compiled as it was. The printed list and count were the same, and the only thing that changed was the class name of the actual object (LinkedList).');
        sum.push('If you write the type of a variable as the interface List, you can swap the implementation class without changing the code on the using side. This is why the type of a variable, a parameter, or a returned value is written as an interface such as List.');
      } else if (ok) {
        sum.push('Even if you write the type of the variable as the class ArrayList, it compiles and runs as long as it points to an ArrayList object.' + (c.trim ? ' In this case you could also call trimToSize, which only ArrayList has.' : ''));
        sum.push('But this variable is tied to ArrayList, so to swap in a LinkedList you have to change the type of the variable first. Unless you really need a method that only that class has, write the type of the variable as List.');
      } else if (c.make === 'List') {
        sum.push('List is an interface, so you cannot create an object with new List<>(), and compilation failed. An interface only fixes that methods exist; it is not a class in which the bodies of add and size are written.');
        sum.push('You use an interface as the type of a variable, and you create the object from a class that implements it (ArrayList, LinkedList).');
      } else if (c.vtype === 'ArrayList') {
        sum.push('A variable of type ArrayList cannot point to a LinkedList object, and compilation failed. LinkedList implements List, but it is not a kind of ArrayList.');
        sum.push('If you write the type of the variable as a class, you are tied to that class, and if you write it as the interface List, you can swap in any class that implements List.');
      } else {
        sum.push('You cannot call trimToSize, which only ArrayList has, through a List variable, and compilation failed.' + (c.make === 'ArrayList' ? ' It was the same even though the actual object was an ArrayList.' : '') + ' The compiler lets you call only the methods that the variable type List fixes.');
        sum.push('Through a variable of an interface type, you can call only the methods that the interface fixes. Thanks to that, the line stays correct whichever implementation class you swap in.');
      }
    } else if (c.scene === 'sort') {
      if (ok) {
        sum.push('Member, an example class that we made, implements Java\'s Comparable and writes compareTo, so Java\'s Collections.sort sorted the list of Member by age.');
        sum.push('Collections.sort does not know Member; it knows only the compareTo that Comparable fixes. The code that Java provides takes an interface type, so any class that implements that interface can be passed to that code.');
      } else if (c.cmp === 'noimpl') {
        sum.push('Even though the compareTo method was exactly there, without implements Comparable Member is not of type Comparable, so compilation failed on the line Collections.sort(members).');
        sum.push('Having the method does not make it that type. Only when there is an implements declaration does the compiler accept Member as a Comparable type.');
      } else {
        sum.push('It wrote only implements Comparable<Member> and did not write compareTo, so compilation failed. An interface does not pass down the body of a method, so the implementing class has to write it itself.');
        sum.push('This is different from inheriting a class with extends, where you get the methods the parent wrote as they are. Whether it was implemented is checked at compile time, not at run time, so this program could not even be run.');
      }
    } else if (c.own === 'iface') {
      sum.push('You can also declare an interface yourself like this. interface Greeter, a name chosen for this example, fixes only the name of greet, and Hello implemented it with implements Greeter and wrote the body. Java\'s List and Comparable are declared in the same shape.');
      sum.push('If you inherit a class with extends, you inherit the parent\'s body too, but you can inherit only one class. An interface does not pass down a body, but you can implement several of them, so even a class that already inherits from another class can be of a type such as Comparable or List.');
    } else {
      sum.push('Hello, which extends class Greeter, ran with the parent\'s body without writing greet itself. This is inheritance, and it is the difference from implementing an interface with implements.');
      sum.push('In exchange, only one class can be written after extends. Just as ArrayList extends only AbstractList and implements the four, List, RandomAccess, Cloneable, and Serializable, a type that several classes must follow is made as an interface.');
    }
    var row = ok ? ['Success', 'None', out] : ['Error', st.errText, 'Cannot run'];
    return { events: ev, summary: sum, nerr: st.errs, errAt: errAt, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the compiler reading the source.'); return; }
    H.table(v, ['What the compiler checked', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    H.counters(v, [[s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: at the top, the interfaces (List, Comparable, and Greeter made for this example) and the classes that implement them; in the middle, the variable and the actual object (for sorting, Collections.sort and the list). The place the compiler is checking is shown in yellow, and at the very bottom are the compile result and the output.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 360);
    var hot = s ? s.hot : '', bad = s ? s.bad : {};
    function cls(id) { return bad[id] ? 'bad' : hot === id ? 'hot now' : 'plain'; }
    if (c.scene === 'list') {
      P.box('li', 225, 14, 230, 56, { cls: cls('li'), title: 'List (interface)', sub: 'From Java · add, get, size' });
      P.box('al', 14, 104, 230, 56, { cls: c.make === 'ArrayList' ? cls('mk') : 'plain', title: 'ArrayList (class)', sub: 'From Java · also trimToSize' });
      P.box('ll', 436, 104, 230, 56, { cls: c.make === 'LinkedList' ? cls('mk') : 'plain', title: 'LinkedList (class)', sub: 'From Java' });
      P.arrow('ia', 'al:t', 'li:b:0.25', { cls: 'mut', label: 'implements' });
      P.arrow('il', 'll:t', 'li:b:0.75', { cls: 'mut', label: 'implements' });
      if (c.make === 'List') P.box('mk', 262, 104, 156, 56, { cls: cls('mk'), title: 'new List<>()', sub: bad.mk ? 'Cannot create' : 'Not checked yet' });
      P.box('nv', 14, 186, 230, 56, { cls: bad.nv || bad.call ? 'bad' : hot === 'nv' || hot === 'call' ? 'hot now' : 'plain', title: 'names', sub: c.vtype + '<String> variable' });
      P.box('ob', 436, 186, 230, 56, { cls: s && s.obj ? (hot === 'ob' ? 'good now' : 'good') : 'ghost', title: c.make === 'List' ? 'Object' : c.make + ' object', sub: s && s.obj ? '[Alice, Bob, Carol]' : s && s.compile === 'err' ? 'Not created' : 'Does not exist yet' });
      if (s && s.obj) P.arrow('ref', 'nv:r', 'ob:l', { cls: 'good', label: 'points to' });
      else if (s && s.fit === 'bad') P.arrow('ref', 'nv:r', 'ob:l', { cls: 'bad', label: 'cannot point' });
    } else if (c.scene === 'sort') {
      P.box('cp', 14, 14, 230, 56, { cls: cls('cp'), title: 'Comparable (interface)', sub: 'From Java · one compareTo' });
      P.box('mb', 436, 14, 230, 56, { cls: cls('mb'), title: 'Member (example class)', sub: c.cmp === 'nomethod' ? 'No compareTo' : 'Has compareTo' });
      if (c.cmp !== 'noimpl') P.arrow('imp', 'mb:l', 'cp:r', { cls: bad.mb ? 'bad' : hot === 'mb' ? 'hot' : 'mut', label: 'implements' });
      P.box('cs', 14, 104, 230, 56, { cls: cls('cs'), title: 'Collections.sort', sub: 'From Java · Comparable only' });
      P.arrow('need', 'cs:t', 'cp:b', { cls: 'mut', label: 'requires' });
      P.box('ls', 436, 104, 230, 56, { cls: s && s.sorted ? (hot === 'ls' ? 'good now' : 'good') : s && s.compile === 'err' ? 'ghost' : 'plain', title: 'members list', sub: s && s.sorted ? 'Bob 25, Carol 28, Alice 31' : 'Alice 31, Bob 25, Carol 28' });
      if (s && s.fit) P.arrow('pass', 'cs:r', 'ls:l', { cls: s.fit === 'bad' ? 'bad' : s.sorted ? 'good' : 'mut', label: s.fit === 'bad' ? 'cannot pass' : 'sorts' });
    } else {
      var iface = c.own === 'iface';
      P.box('gr', 14, 14, 230, 56, { cls: cls('gr'), title: 'Greeter (' + (iface ? 'interface' : 'class') + ')', sub: iface ? 'Example · greet name only' : 'Example · greet has body' });
      P.box('he', 436, 14, 230, 56, { cls: cls('he'), title: 'Hello (example class)', sub: iface ? 'Writes greet body itself' : 'Inherits greet' });
      P.arrow('imp', 'he:l', 'gr:r', { cls: hot === 'he' ? 'hot' : 'mut', label: iface ? 'implements' : 'extends' });
      P.box('gv', 14, 104, 230, 56, { cls: cls('gv'), title: 'g', sub: 'Variable of type Greeter' });
      P.box('ob', 436, 104, 230, 56, { cls: s && s.obj ? (hot === 'ob' ? 'good now' : 'good') : 'ghost', title: 'Hello object', sub: s && s.obj ? 'Created by new Hello()' : 'Does not exist yet' });
      if (s && s.obj) P.arrow('ref', 'gv:r', 'ob:l', { cls: 'good', label: 'points to' });
    }
    P.box('r1', 14, 262, 652, 50, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Errors: ' + s.errs) : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 318, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Output', right: s && s.ran ? s.out : s && s.compile === 'err' ? 'Cannot run' : '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all of the combinations of the settings (12 for the list, 3 for sorting, and 2 for declaring an interface yourself), the text that the code function of the screen makes was written to a file exactly as it is and compiled with javax.tools, and the ones that compiled successfully were loaded with a new class loader, Main.main was run, and the results were checked against the standard output that was captured. What was checked is whether compilation succeeded, the diagnostic code and the English message of the first error (abstract.cant.be.instantiated, cant.resolve.location.args, prob.found.req, cant.apply.symbols, and does.not.override.abstract were turned into the five error descriptions on the screen), the number of errors and the lines where they occurred, whether the Main class file was made, and the output when run. In the same program, reflection was used to check that List and Comparable are interfaces, that ArrayList inherits from AbstractList and implements List, RandomAccess, Cloneable, and Serializable, that LinkedList inherits from AbstractSequentialList and implements List, Deque, Cloneable, and Serializable, that String implements Comparable, that trimToSize is in ArrayList but not in List, and that the methods of Comparable are only compareTo. It was also compiled separately that writing two classes after extends is a syntax error (javac says that { is expected where the comma is), and that writing two interfaces after implements compiles. The declarations shown on the screen (public interface List<E>, and <T extends Comparable<? super T>> of Collections.sort) were checked against the JDK 21 API documentation. The documentation followed the Java Language Specification (Java SE 21): Section 9.4 (an interface method that ends with a semicolon and has no body is an abstract method), Section 8.1.4 (one class after extends), Section 8.1.5 (several interfaces after implements), Section 8.1.1.1 (a class that is not abstract must have all the abstract methods of the interfaces it implements), Section 15.9.1 (you cannot create an object from an interface with new), Section 5.2 (a variable of a supertype can point to an object of a subtype), and Section 15.12.1 (the methods you can call are looked up in the type of the variable). The kinds of errors, their number, and the line where each occurs are not fixed by the specification but were observed on this javac, and when there are several errors, only the first is written in the table. List also has default methods that have bodies (sort, replaceAll, and so on), but this lab does not cover them. How interfaces are used, and how they differ from abstract classes, are covered in "In-depth lab: Interfaces and abstract classes".',
});
