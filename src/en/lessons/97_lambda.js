Lab.register({
  id: 'lambda', nav: 'Lambda expressions and functional interfaces', cat: 'Java language', mode: 'step',
  title: 'When does the code written in a lambda run?',
  why: 'Without lambdas, even to pass just one action, such as the rule for sorting or what to do when a button is pressed, you had to write several lines that implement an interface with an anonymous class. A lambda shortens the implementation of an interface that has only one abstract method to the shape (parameters) -> body, so that you write only the action to pass.',
  use: 'You use it when you pass an action to a standard method that takes one, such as filter and map of a stream, forEach, removeIf, and sort of a list, and computeIfAbsent of a Map. You also use it to put off creating a value until it is needed, as with orElseGet of Optional, and to make the Runnable you pass to a thread. When the body gets long, you move it out to a named method and pass it with a method reference.',
  intro: 'A lambda is syntax that turns "an action to run later" into an object. The body is not run on the line where the lambda is written; it runs when the side that received the object calls it. In this lab you pass lambdas to Java standard methods (forEach, removeIf, and sort of ArrayList, filter and map of a stream, Comparator.comparing, and orElseGet of Optional) and see when and how many times a standard method calls the lambda. The type of a lambda is decided by the parameter type of the method that receives it. Here they are all Consumer, Predicate, Function, and Supplier, which Java provides in the java.util.function package.',
  terms: ['Lambda expression', 'Functional interface', 'Standard methods that take a lambda', 'Method reference', 'Stream API', 'Lazy evaluation', 'orElse and orElseGet', 'Comparable and Comparator', 'Differences between anonymous classes and lambda expressions'],
  controls: [
    { id: 'api', label: 'Standard method that takes the lambda', type: 'select', value: 'forEach', options: [
      ['forEach', 'names.forEach(n -> …) : takes a Consumer'],
      ['forEachRef', 'names.forEach(System.out::println) : passes a method reference'],
      ['removeIf', 'names.removeIf(n -> …) : takes a Predicate'],
      ['stream', 'names.stream().filter(n -> …).map(n -> …).toList() : Predicate, Function'],
      ['nostream', 'names.stream().filter(n -> …).map(n -> …) : stops without a terminal operation'],
      ['sort', 'names.sort(Comparator.comparing(n -> …)) : takes a Function'],
      ['orElse', 'saved.orElse(defaultName()) : passes a value, not a lambda'],
      ['orElseGet', 'saved.orElseGet(() -> defaultName()) : takes a Supplier']],
      hint: 'forEach, removeIf, sort, stream, filter, map, toList, Comparator.comparing, orElse, and orElseGet are all Java standard methods. defaultName is a method made for this example.' },
    { id: 'data', label: 'Values on the receiving side', type: 'select', value: 'full', options: [['full', 'Has values: List.of("kiwi", "fig", "banana") / Optional.of("Alice")'], ['empty', 'Empty: an empty ArrayList / Optional.empty()']] },
  ],
  presets: [
    { t: 'Default settings', q: 'When you pass a lambda to names.forEach, when and how many times does the lambda body run?', d: 'On the line that calls forEach, the lambda object is created and passed, and forEach calls accept for each element, so the body runs three times.', v: { api: 'forEach', data: 'full' } },
    { t: 'forEach on an empty list', q: 'When you call forEach on an empty list, how many times does the lambda body run?', d: 'There are no elements, so forEach never calls accept. Even though a lambda was passed, the body does not run.', v: { api: 'forEach', data: 'empty' } },
    { t: 'Pass a method reference', q: 'What if you pass a method reference, as in names.forEach(System.out::println)?', d: 'It is the same Consumer as n -> System.out.println(n). forEach calls it for each element, and three names are printed.', v: { api: 'forEachRef', data: 'full' } },
    { t: 'Pass a condition to removeIf', q: 'When you pass a Predicate lambda to names.removeIf, which elements are removed?', d: 'removeIf calls test for each element and removes only fig, for which true came back. What remains is [kiwi, banana].', v: { api: 'removeIf', data: 'full' } },
    { t: 'filter and map of a stream', q: 'In what order do the lambdas passed to filter and map run?', d: 'When toList is called, the elements pass through filter one at a time, and an element that passes goes to map before the next element does. filter is called 3 times and map 2 times.', v: { api: 'stream', data: 'full' } },
    { t: 'Without a terminal operation', q: 'What if you call only filter and map and do not call a terminal operation such as toList?', d: 'The stream is only built and no elements are sent through it, so the lambdas of filter and map never run.', v: { api: 'nostream', data: 'full' } },
    { t: 'Sort with Comparator.comparing', q: 'How many times is the key lambda passed to Comparator.comparing called?', d: 'Each time sort compares two elements, the Comparator calls the key lambda twice. For these three elements on JDK 21, there were 3 comparisons and 6 calls of the key lambda.', v: { api: 'sort', data: 'full' } },
    { t: 'Pass a method call to orElse', q: 'When the Optional has a value, does defaultName run if you write orElse(defaultName())?', d: 'It does. Java evaluates the argument defaultName() before it calls orElse. The result is Alice, but "Default created" is printed.', v: { api: 'orElse', data: 'full' } },
    { t: 'Pass a lambda to orElseGet', q: 'When the Optional has a value, what happens with orElseGet(() -> defaultName())?', d: 'If there is a value, orElseGet does not call get, so defaultName does not run.', v: { api: 'orElseGet', data: 'full' } },
    { t: 'orElseGet on an empty Optional', q: 'When the Optional is empty, what happens with orElseGet(() -> defaultName())?', d: 'There is no value, so orElseGet calls get once, the lambda runs, and the Guest that defaultName returned becomes the result.', v: { api: 'orElseGet', data: 'empty' } },
  ],
  NAMES: ['kiwi', 'fig', 'banana'],
  // The order of the two elements Comparator.compare received during sorting. The order in which ArrayList.sort (TimSort) of JDK 21 actually called it when sorting [kiwi, fig, banana] (verify/plain/lambda_probe.out.txt)
  SORT_CMP: [['fig', 'kiwi'], ['banana', 'fig'], ['banana', 'kiwi']],
  // For each standard method: the name, the parameter (JDK 21 declaration), the method the lambda implements, and the line in the standard method's code that calls the lambda (copied from the JDK 21 source)
  STD: {
    forEach: [['ArrayList.forEach', 'Consumer<? super E> action', 'accept', 'action.accept(elementAt(es, i));  (for each element)']],
    removeIf: [['ArrayList.removeIf', 'Predicate<? super E> filter', 'test', 'filter.test(elementAt(es, i))  (for each element; if true, the position is marked for removal)']],
    stream: [['Stream.filter', 'Predicate<? super T> predicate', 'test', 'Called when the terminal operation sends elements through one at a time'], ['Stream.map', 'Function<? super T, ? extends R> mapper', 'apply', 'Called for each element that passed filter']],
    sort: [['ArrayList.sort', 'Comparator<? super E> c', 'compare', 'Arrays.sort((E[]) elementData, 0, size, c);'], ['Comparator.comparing', 'Function<? super T, ? extends U> keyExtractor', 'apply', '(c1, c2) -> keyExtractor.apply(c1).compareTo(keyExtractor.apply(c2))']],
    orElse: [['Optional.orElse', 'T other', '(none; it takes a value)', 'return value != null ? value : other;']],
    orElseGet: [['Optional.orElseGet', 'Supplier<? extends T> supplier', 'get', 'return value != null ? value : supplier.get();']],
  },
  std: function (api) { return this.STD[api === 'forEachRef' ? 'forEach' : api === 'nostream' ? 'stream' : api]; },
  isOpt: function (api) { return api === 'orElse' || api === 'orElseGet'; },
  code: function (c) {
    var a = c.api, full = c.data === 'full', opt = this.isOpt(a), L = [];
    var imp = opt ? ['java.util.Optional'] : ['java.util.ArrayList'].concat(a === 'sort' ? ['java.util.Comparator'] : [], ['java.util.List'], a === 'nostream' ? ['java.util.stream.Stream'] : []);
    imp.forEach(function (x) { L.push('import ' + x + ';'); });
    L.push('', 'public class Main {');
    if (opt) L.push('    static String defaultName() {                   // a method made for this example (not standard)', '        System.out.println("Default created");', '        return "Guest";', '    }', '');
    L.push('    public static void main(String[] args) {');
    if (opt) L.push('        Optional<String> saved = ' + (full ? 'Optional.of("Alice");' : 'Optional.empty();'));
    else L.push('        List<String> names = ' + (full ? 'new ArrayList<>(List.of("kiwi", "fig", "banana"));' : 'new ArrayList<>();'));
    var body = {
      forEach: ['System.out.println("Before calling forEach");', 'names.forEach(n -> System.out.println("Lambda ran: " + n));   // Consumer<String>', 'System.out.println("forEach done");'],
      forEachRef: ['System.out.println("Before calling forEach");', 'names.forEach(System.out::println);       // the same Consumer<String> as n -> System.out.println(n)', 'System.out.println("forEach done");'],
      removeIf: ['System.out.println("Before calling removeIf");', 'names.removeIf(n -> {                     // Predicate<String>', '    System.out.println("Lambda ran: " + n);', '    return n.length() <= 3;               // if true, remove this element', '});', 'System.out.println("Remaining " + names);'],
      stream: ['System.out.println("Before creating the stream");', 'List<Integer> lengths = names.stream()', '        .filter(n -> {                    // Predicate<String>', '            System.out.println("filter lambda: " + n);', '            return n.length() > 3;', '        })', '        .map(n -> {                       // Function<String, Integer>', '            System.out.println("map lambda: " + n);', '            return n.length();', '        })', '        .toList();                        // terminal operation: the elements flow here', 'System.out.println("Result " + lengths);'],
      nostream: ['System.out.println("Before creating the stream");', 'Stream<Integer> lengths = names.stream()', '        .filter(n -> {                    // Predicate<String>', '            System.out.println("filter lambda: " + n);', '            return n.length() > 3;', '        })', '        .map(n -> {                       // Function<String, Integer>', '            System.out.println("map lambda: " + n);', '            return n.length();', '        });                               // no terminal operation (such as toList) is called', 'System.out.println("After creating the stream");'],
      sort: ['System.out.println("Before calling sort");', 'names.sort(Comparator.comparing(n -> {   // takes a Function<String, Integer> and makes a Comparator', '    System.out.println("Key taken: " + n);', '    return n.length();                    // compare by the number of characters', '}));', 'System.out.println("Sorted " + names);'],
      orElse: ['System.out.println("Before calling orElse");', 'String name = saved.orElse(defaultName());          // the argument is evaluated first and then passed', 'System.out.println("Name " + name);'],
      orElseGet: ['System.out.println("Before calling orElseGet");', 'String name = saved.orElseGet(() -> defaultName());  // Supplier<String>', 'System.out.println("Name " + name);'],
    }[a];
    body.forEach(function (x) { L.push('        ' + x); });
    L.push('    }', '}');
    return L.join('\n');
  },
  label: function (c) { return { forEach: 'forEach', forEachRef: 'forEach (method reference)', removeIf: 'removeIf', stream: 'filter, map, toList', nostream: 'filter, map (no terminal operation)', sort: 'Comparator.comparing', orElse: 'orElse', orElseGet: 'orElseGet' }[c.api] + ' · ' + (c.data === 'full' ? 'has values' : 'empty'); },
  columns: ['Standard method', 'Functional interface it takes', 'Times the body ran', 'Result'],
  simulate: function (c) {
    var a = c.api, full = c.data === 'full', ev = [], sum = [];
    var st = { out: [], msgs: [], calls: 0 }, list = full ? this.NAMES.slice() : [], row;
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function msg(f, t, s, cls) { st.msgs.push({ f: f, t: t, s: s, cls: cls || '' }); }
    function say(line) { st.out.push(line); msg('main', '', 'Prints: ' + line); }
    function show(xs) { return '[' + xs.join(', ') + ']'; }
    // The step that runs one System.out.println line
    function print(codeText, line, extra) { say(line); push(codeText + ': the line printed is "' + line + '".' + (extra ? ' ' + extra : '')); }
    if (this.isOpt(a)) {
      var v = full ? 'Alice' : 'Guest';
      msg('main', '', full ? 'saved = Optional.of("Alice")' : 'saved = Optional.empty()');
      push(full ? 'Optional<String> saved = Optional.of("Alice"): this uses Java\'s standard Optional to create an Optional that holds the value "Alice".' : 'Optional<String> saved = Optional.empty(): this uses Java\'s standard Optional to create an empty Optional with no value.');
      print('System.out.println("Before calling ' + a + '")', 'Before calling ' + a);
      if (a === 'orElse') {
        st.calls = 1; st.out.push('Default created'); msg('main', 'dn', 'Evaluate defaultName() first', 'hot'); msg('dn', '', 'Prints: Default created', 'hot');
        push('saved.orElse(defaultName()): Java evaluates the argument before it calls the method. So defaultName() runs before orElse is entered, and "Default created" is printed.' + (full ? ' It ran even though the Optional has a value.' : ''), full ? 'bad' : 'good');
        msg('main', 'std', 'orElse("Guest")');
        msg('std', '', full ? 'value is present, returns "Alice"' : 'value is absent, returns other ("Guest")', 'good');
        push('orElse("Guest"): what orElse receives is the value "Guest", which has already been evaluated. The body of the standard Optional.orElse is one line, return value != null ? value : other;, and ' + (full ? 'there is a value, so it returns "Alice". The "Guest" that was prepared is not used.' : 'there is no value, so it returns the "Guest" it received.'));
      } else {
        msg('main', 'std', 'orElseGet(lambda)');
        push('saved.orElseGet(() -> defaultName()): the lambda creates a Supplier<String> object and passes it to orElseGet. Creating and passing the lambda does not run defaultName().');
        if (full) {
          msg('std', '', 'value present: skips get(), returns "Alice"', 'good');
          push('The body of the standard Optional.orElseGet is one line, return value != null ? value : supplier.get();. There is a value, so it does not call supplier.get() and returns "Alice". The lambda body did not run.', 'good');
        } else {
          st.calls = 1; st.out.push('Default created'); msg('std', 'lam', 'get()', 'hot'); msg('lam', '', 'defaultName() runs, prints: Default created', 'hot');
          push('supplier.get(): there is no value, so orElseGet calls get. Only now does the lambda body defaultName() run and print "Default created", and the "Guest" it returns becomes the result.', 'good');
        }
      }
      print('System.out.println("Name " + name)', 'Name ' + v);
      sum.push(a === 'orElse' ? 'The argument of orElse is evaluated before orElse is called, so defaultName() ran ' + (full ? 'even though the Optional has a value' : 'because the Optional has no value') + '. It runs whether or not there is a value. If creating the default takes time, or other things such as saving happen along with it, pass it to orElseGet as a lambda.'
        : full ? 'When there is a value, orElseGet does not call the Supplier it received, so the lambda body never ran. When you pass a lambda, the receiving side decides whether to run it.' : 'orElseGet calls get of the Supplier once, only when there is no value, to create the default.');
      sum.push('The body of the standard orElseGet is one line that calls supplier.get(). A method you write yourself can also take a Supplier<T> parameter and call get() only when needed, and decide when the action runs in the same way.');
      row = [a === 'orElse' ? 'Optional.orElse' : 'Optional.orElseGet', a === 'orElse' ? 'None (takes a String value)' : 'Supplier<String>', a === 'orElse' ? 'defaultName() 1 (no lambda)' : '' + st.calls, v];
      return { events: ev, summary: sum, out: st.out.slice(), row: row };
    }
    msg('main', '', full ? 'names = [kiwi, fig, banana]' : 'names = []');
    push(full ? 'List<String> names = new ArrayList<>(List.of("kiwi", "fig", "banana")): this creates a Java standard ArrayList whose elements are kiwi, fig, and banana in that order.' : 'List<String> names = new ArrayList<>(): this creates a Java standard ArrayList with no elements.');
    var pre = a === 'stream' || a === 'nostream' ? 'Before creating the stream' : 'Before calling ' + (a === 'forEachRef' ? 'forEach' : a);
    print('System.out.println("' + pre + '")', pre);
    if (a === 'forEach' || a === 'forEachRef') {
      var ref = a === 'forEachRef';
      msg('main', 'std', ref ? 'forEach(System.out::println)' : 'forEach(lambda)');
      push(ref ? 'names.forEach(System.out::println): a method reference that points to the println method of the System.out object creates a Consumer<String> object and passes it to forEach. It is the same as the lambda written as n -> System.out.println(n). Nothing has been printed yet.' : 'names.forEach(n -> …): the lambda creates a Consumer<String> object and passes it to forEach. The parameter type of forEach is Consumer<? super E>, so this lambda implements accept of Consumer. The body does not run at the moment it is passed.');
      list.forEach(function (n, i) {
        st.calls++; var line = ref ? n : 'Lambda ran: ' + n; st.out.push(line);
        msg('std', 'lam', 'accept("' + n + '")', 'hot'); msg('lam', '', 'Prints: ' + line, 'hot');
        push('action.accept("' + n + '"): ' + (i === 0 ? 'The standard ArrayList.forEach calls accept for each element, and only here does the body run. ' : 'The same body runs once more with the next element. ') + 'The line printed is "' + line + '".', 'good');
      });
      if (!full) { msg('std', '', 'No elements, so accept is not called', 'bad'); push('The for statement in forEach loops as many times as there are elements. There are no elements, so it ends without calling accept even once.', 'bad'); }
      print('System.out.println("forEach done")', 'forEach done', 'The body ran ' + st.calls + ' times in all.');
      sum.push(full ? 'The body ran not on the line that passed the lambda, but each time the standard forEach called accept. How many times it is called is decided by forEach, from the number of elements.' : 'A lambda was passed, but there were no elements, so forEach never called it. A lambda is only "an action that can be run later", and the receiving side decides whether to run it and how many times.');
      if (ref) sum.push('When a lambda only calls one existing method, you can write it more briefly as a method reference (System.out::println, String::length). The result is the same as the lambda.');
      row = ['ArrayList.forEach', ref ? 'Consumer<String> (method reference)' : 'Consumer<String>', '' + st.calls, full ? 'One line printed per element' : 'No output'];
    } else if (a === 'removeIf') {
      msg('main', 'std', 'removeIf(lambda)');
      push('names.removeIf(n -> { … }): the lambda creates a Predicate<String> object and passes it to removeIf. Predicate is a standard functional interface that has one method, test, which takes a value and returns true or false.');
      var kept = [];
      list.forEach(function (n) {
        st.calls++; st.out.push('Lambda ran: ' + n); var del = n.length <= 3; if (!del) kept.push(n);
        msg('std', 'lam', 'test("' + n + '")', 'hot'); msg('lam', '', 'Prints and returns ' + del, del ? 'bad' : 'good');
        push('filter.test("' + n + '"): removeIf calls test for each element. The line printed is "Lambda ran: ' + n + '". n.length() is ' + n.length + '. ' + (del ? 'It is 3 or less, so it returns true, and this element is marked as a position to remove.' : 'It is greater than 3, so it returns false, and this element stays.'), del ? 'bad' : 'good');
      });
      if (!full) { msg('std', '', 'No elements, so test is not called', 'bad'); push('There are no elements, so removeIf never calls test and returns false.', 'bad'); }
      print('System.out.println("Remaining " + names)', 'Remaining ' + show(kept));
      sum.push(full ? 'The standard removeIf called test for each element and removed the elements for which true came back. The lambda is in charge only of deciding whether to remove, and removeIf does the work of going through the list and removing.' : 'There were no elements, so removeIf never called test.');
      row = ['ArrayList.removeIf', 'Predicate<String>', '' + st.calls, show(kept)];
    } else if (a === 'stream' || a === 'nostream') {
      var term = a === 'stream', fc = 0, mc = 0, res = [];
      msg('main', 'std', 'stream().filter(…).map(…)');
      push('names.stream().filter(n -> { … }).map(n -> { … }): a Predicate<String> lambda is passed to filter and a Function<String, Integer> lambda to map. filter and map are intermediate operations, so when they are called they only build a stream with the actions chained on, and they do not run the lambdas. Nothing is printed.');
      if (term) {
        msg('main', 'std', 'toList()');
        push('.toList(): the terminal operation is called. Now the stream sends the elements through one at a time from the start and calls the lambdas of filter and map.');
        list.forEach(function (n) {
          fc++; st.calls++; st.out.push('filter lambda: ' + n); var pass = n.length > 3;
          msg('std', 'f', 'test("' + n + '"), ' + pass, pass ? 'hot' : 'bad');
          push('test of filter("' + n + '"): the line printed is "filter lambda: ' + n + '". n.length() is ' + n.length + '. ' + (pass ? 'It is greater than 3, so it is true, and this element goes straight to map before moving on to the next element.' : 'It is not greater than 3, so it is false, and this element does not go to map.'), pass ? 'good' : 'bad');
          if (pass) {
            mc++; st.calls++; st.out.push('map lambda: ' + n); res.push(n.length);
            msg('std', 'm', 'apply("' + n + '"), ' + n.length, 'hot');
            push('apply of map("' + n + '"): the line printed is "map lambda: ' + n + '". The value it returned is ' + n.length + '. This value becomes an element of the result list.', 'good');
          }
        });
        if (!full) { msg('std', '', 'No elements, so the lambdas are not called', 'bad'); push('There are no elements, so the lambdas of filter and map are never called, and an empty list is created.', 'bad'); }
        print('System.out.println("Result " + lengths)', 'Result ' + show(res));
        sum.push(full ? 'The lambdas ran not when filter and map were called, but after toList was called. Each element passes through filter and goes straight to map, so the output is mixed in the order filter, map, filter, filter, map.' : 'When there are no elements, the lambdas are not called even if you call the terminal operation.');
      } else {
        msg('std', '', 'No terminal operation, so no elements flow', 'bad');
        push('No terminal operation (toList, forEach, count, and so on) was called. The stream sends no elements through, so the lambdas of filter and map never run.', 'bad');
        print('System.out.println("After creating the stream")', 'After creating the stream', 'Not a single line of "filter lambda" or "map lambda" was printed.');
        sum.push('filter and map only take lambdas and chain on the work; it is the terminal operation that sends elements through and makes the lambdas get called. With no terminal operation, the lambdas do not run.');
      }
      sum.push('The parameter of Stream.filter is Predicate<? super T>, and the parameter of Stream.map is Function<? super T, ? extends R>. So even if both have the same n -> { … } shape, the lambda in filter implements test and the lambda in map implements apply.');
      row = ['Stream.filter, Stream.map' + (term ? ', toList' : ''), 'Predicate<String>, Function<String, Integer>', 'filter ' + fc + ', map ' + mc, term ? show(res) : '(did not run)'];
    } else {
      msg('main', 'std', 'sort(comparing(lambda))');
      push('names.sort(Comparator.comparing(n -> { … })): the lambda creates a Function<String, Integer> object and passes it to the standard Comparator.comparing. comparing returns a Comparator that takes a key from each of two elements and compares the keys, and that Comparator is passed to sort. On this line the key lambda has not been called yet.');
      var cmps = full ? this.SORT_CMP : [];
      cmps.forEach(function (p, i) {
        st.calls += 2; st.out.push('Key taken: ' + p[0], 'Key taken: ' + p[1]);
        msg('std', 'cmp', 'compare(' + p[0] + ', ' + p[1] + ')'); msg('cmp', 'lam', 'apply(' + p[0] + '), apply(' + p[1] + ')', 'hot');
        push('compare("' + p[0] + '", "' + p[1] + '"): ' + (i === 0 ? 'sort calls compare of the Comparator to compare two elements, and ' : 'sort compares again. ') + 'compare takes the keys of the two elements with keyExtractor.apply. The key lambda runs twice, and two lines, "Key taken: ' + p[0] + '" and "Key taken: ' + p[1] + '", are printed. Then it compares the two keys (' + p[0].length + ', ' + p[1].length + ') with compareTo of Integer.', 'good');
      });
      if (!full) { msg('std', '', 'No elements, so compare is not called', 'bad'); push('With fewer than 2 elements there is nothing to compare, so sort does not call compare. The key lambda does not run either.', 'bad'); }
      var sorted = full ? ['fig', 'kiwi', 'banana'] : [];
      print('System.out.println("Sorted " + names)', 'Sorted ' + show(sorted), full ? 'It is the order of 3, 4, and 6 characters.' : '');
      sum.push(full ? 'The key lambda was called twice per comparison, ' + st.calls + ' times in all. How many comparisons to make is decided by the sorting algorithm, so the lambda side cannot know (this count is the value from sorting these three elements on JDK 21).' : 'There were no elements, so no comparison happened and the key lambda was not called.');
      sum.push('A lambda that only calls one method, such as n -> n.length(), can be shortened to Comparator.comparing(String::length).');
      row = ['ArrayList.sort, Comparator.comparing', 'Function<String, Integer> (taken by comparing)', '' + st.calls, show(sorted)];
    }
    return { events: ev, summary: sum, out: st.out.slice(), row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go one line at a time.'); return; }
    H.table(v, ['Standard method', 'Parameter (JDK 21 declaration)', 'Method the lambda implements', 'Where the standard method\'s code calls it'], this.std(c.api).map(function (r) { return { cells: r }; }), 'The side that takes the lambda (Java standard)');
    H.table(v, ['Order', 'Printed line'], s.out.map(function (o, i) { return { cells: [String(i + 1), { v: o, cls: /^(Lambda ran|filter lambda|map lambda|Key taken|Default created)/.test(o) || c.api === 'forEachRef' && /^(kiwi|fig|banana)$/.test(o) ? 'hot' : '' }] }; }), 'Output so far');
  },
  // Diagram: from the left, main (my code), the standard method that takes the lambda, and the lambda (in orElse, the example method) are placed side by side, and who calls whom is drawn from top to bottom. The arrow toward the lambda appears only when the standard method calls it.
  draw: function (P, sim, shown) {
    var c = sim.c, a = c.api, last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], calls: 0 };
    var actors = {
      forEach: [['main', 'main (my code)', 'wait'], ['std', 'ArrayList.forEach', 'plain'], ['lam', 'Lambda n -> …', 'hot']],
      forEachRef: [['main', 'main (my code)', 'wait'], ['std', 'ArrayList.forEach', 'plain'], ['lam', 'System.out::println', 'hot']],
      removeIf: [['main', 'main (my code)', 'wait'], ['std', 'ArrayList.removeIf', 'plain'], ['lam', 'Lambda n -> { … }', 'hot']],
      stream: [['main', 'main', 'wait'], ['std', 'Stream (standard)', 'plain'], ['f', 'filter lambda', 'hot'], ['m', 'map lambda', 'hot']],
      sort: [['main', 'main', 'wait'], ['std', 'ArrayList.sort', 'plain'], ['cmp', 'Comparator', 'plain'], ['lam', 'Key lambda', 'hot']],
      orElse: [['main', 'main (my code)', 'wait'], ['dn', 'defaultName()', 'hot'], ['std', 'Optional.orElse', 'plain']],
      orElseGet: [['main', 'main (my code)', 'wait'], ['std', 'Optional.orElseGet', 'plain'], ['lam', 'Lambda () -> …', 'hot']],
    }[a === 'nostream' ? 'stream' : a];
    var keep = Math.max(1, Math.min(10, sim.events[sim.events.length - 1].snap.msgs.length));
    var end = P.seq(actors, s.msgs.map(function (m) { return m.t ? { f: m.f, t: m.t, s: m.s, cls: m.cls } : { f: m.f, s: m.s, cls: m.cls }; }), { keep: keep });
    P.box('cnt', 16, end + 14, 648, 34, { cls: s.calls ? 'good' : 'ghost', title: a === 'orElse' ? 'Times defaultName() ran' : 'Times the lambda body ran', right: '' + s.calls });
    P.size(680, end + 64);
    P.note('Each arrow is one method call, and time flows from top to bottom. In this lab, every arrow toward the lambda starts from a standard method or from Comparator. main only creates the lambda and passes it, and does not call it directly.' + (a === 'sort' ? ' The Comparator is the object that Comparator.comparing created and returned.' : '') + (a === 'stream' || a === 'nostream' ? ' "Stream (standard)" is the several objects that make up the stream drawn as one.' : '') + (a === 'orElse' ? ' orElse has no lambda, and main calls defaultName() directly before it calls orElse.' : ''));
  },
  assume: 'For each of the sixteen combinations (8 standard methods × has values or empty), the code on the screen was written as is to Main.java, compiled and run with JDK 21 in the verification environment, and the printed lines and their order, the number of times the body ran, and the result were checked (verify/plain/lambda_probe.js, cmp_lambda.js). The parameter types of the standard methods were checked with reflection, and the lines of code copied into "where the standard method\'s code calls it" were checked by whether that text is in the JDK 21 source (src.zip). The order and number of comparisons in sorting are what ArrayList.sort (TimSort) of JDK 21 actually showed with these three elements, and they are not set by the Java specification, so they can differ on another JDK or with other elements. The order in which the elements pass through filter and map one at a time was also seen in this sequential stream, and in a parallel stream the order is not fixed. A lambda, an anonymous class, and a method reference give the same result in what this lab shows, but they differ in how the object is created inside and in what this refers to. When a lambda uses a local variable of the enclosing code, it can use only a variable whose value does not change, and this rule is explained in the lab "Inner classes and anonymous classes".',
});
