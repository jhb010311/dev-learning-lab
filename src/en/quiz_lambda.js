// Quiz questions for the "Lambda expressions and functional interfaces" lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab's model.
Lab.quiz([
  { lv: 1, id: 'lambda', q: 'When the line Function<String, Integer> f = s -> length(s); is executed, what happens to the length method?',
    a: ['It does not run. It runs later, when f.apply is called', 'It runs once right on that line, and the result is stored in f', 'It runs once in advance at compile time, and the result is fixed then', 'It runs once automatically when the program ends'],
    why: 'A lambda expression only creates an object that holds "an action to run later". The code to the right of the arrow token runs when some code calls that action (apply). If nothing calls it, it never runs.',
    sim: { c: { fi: 'function', form: 'lambda', calls: '0' }, col: 3, has: '0 times' } },
  { lv: 1, id: 'lambda', q: 'Which option correctly pairs functional interfaces with the shapes of their actions?',
    a: ['Supplier takes nothing and returns a value, and Consumer takes a value and returns nothing', 'Supplier takes a value and returns nothing, and Consumer takes nothing and returns a value', 'Function takes a value and returns only true or false, and Predicate turns a value into another value', 'Predicate takes nothing and returns a value, and Function takes a value and returns nothing'],
    why: 'A Supplier is the side that supplies, so it takes nothing and gives out a value (get). A Consumer is the side that consumes, so it only takes a value (accept). A Function takes a value and returns another value (apply), and a Predicate takes a value and returns true or false (test).',
    sim: { c: { fi: 'supplier', form: 'lambda', calls: '1' }, col: 1, has: 'nothing' } },
  { lv: 2, id: 'lambda', q: 'The same action is written as an anonymous class, as a lambda expression, and as a method reference, and each one is passed to the same method. If that method calls the action twice, what is the result?',
    a: ['In all three cases, the body runs twice and the same values are returned', 'Only with the anonymous class, the body runs one more time at the moment the object is created', 'Only with the method reference, the method is called when it is referred to, so the body runs one more time', 'Only the lambda expression remembers the result of the first call, so the body runs only once'],
    why: 'The three are different syntaxes for creating an object that implements a functional interface. Whichever one you use, the body does not run when the object is created, and it runs once each time it is called. None of them has a feature that remembers the result.',
    sim: { c: { fi: 'function', form: 'ref', calls: '2' }, col: 4, has: '5, 2' } },
  { lv: 3, id: 'lambda', q: 'In main, an action is created with Supplier<String> s = () -> make();, then "after creation" is printed, and then run(s) is called. run calls s.get() twice. When and how many times does the print statement inside make run?',
    a: ['After "after creation" is printed, twice inside run', 'Before "after creation" is printed, once when the lambda expression is created', 'Three times in all: once when the lambda expression is created and twice inside run', 'Only once, on the first call to get, and not on the second call'],
    why: 'make is not called on the line that creates the lambda expression, so "after creation" is printed first. After that, make runs each time get is called inside run, so it runs twice. Passing a Supplier lets you put off the work of creating a value until the moment it is needed.',
    sim: { c: { fi: 'supplier', form: 'lambda', calls: '2' }, col: 3, has: '2 times' } },
]);
