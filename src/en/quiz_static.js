// Quiz questions for the "static and instance" lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab's model.
Lab.quiz([
  { lv: 1, id: 'static', q: 'Which is the correct difference between a static field and an instance variable?',
    a: ['A static field exists only once, in the class, and an instance variable exists separately in each object', 'The value of a static field cannot be changed, and the value of an instance variable can be changed', 'A static field exists separately in each object, and an instance variable exists only once, in the class', 'A static field is used only inside the same class, and an instance variable is used anywhere'],
    why: 'A static field belongs to the class, so only one is created, and all objects share that one. An instance variable is created anew inside each object when the object is created. What prevents a value from being changed is final, and what sets where something can be used is an access modifier.' },
  { lv: 2, id: 'static', q: 'Why does using an instance variable by name alone inside a static method cause a compile-time error?',
    a: ['Because a static method is called without an object, so it cannot be determined which object the field belongs to', 'Because a static method runs before the class is made ready, so the field does not exist yet', 'Because accessing private fields is forbidden in a static method', 'Because a static method can only read values and cannot change fields'],
    why: 'An instance variable exists separately in each object, so it can be read only when "which object it belongs to" is settled. A static method is called without an object, as in Counter.report(), so it has no such target (this). Receiving an object as an argument and writing c.count does work.',
    sim: { c: { decl: 'inst', extra: 'sm', nb: '1' }, col: 0, has: 'non-static variable count' } },
  { lv: 3, id: 'static', q: 'Counter has static int count, and the instance method hit() executes count++. You create the objects a and b, call a.hit() twice and b.hit() once, and then print a.count and b.count in that order. What is printed?',
    a: ['3 3', '2 1', '3 1', '2 3'],
    why: 'count is static, so there is only one, in the class, and both a.hit() and b.hit() increment that one. It is incremented three times and becomes 3, and a.count and b.count both read the same count. Without static, the output is 2 1.',
    sim: { c: { decl: 'static', extra: 'none', nb: '1' }, col: 1, has: '3 3' } },
  { lv: 3, id: 'static', q: 'In Counter, count is a static field and hit() is a method without static. What happens if you write Counter.hit() without creating an object?',
    a: ['A compile-time error occurs because hit() is an instance method', 'count is static, so it increases by 1 as usual', 'The code compiles, and an exception is thrown at run time', 'The compiler creates an object and makes the call on it'],
    why: 'Only static methods can be called with the class name. Even if the field that hit() touches is static, there must be a target object as long as hit() itself is not static. This check is made at compile time, so it is caught as an error before the program runs.',
    sim: { c: { decl: 'static', extra: 'clsHit', nb: '1' }, col: 0, has: 'non-static method hit()' } },
]);
