// Quiz questions for the "Deadlock" lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 1, id: 'deadlock', q: 'What kind of state is a deadlock?', a: ['A state in which two or more threads are stopped forever, each waiting for a lock that another one holds', 'A state in which the CPU is busy because there are too many threads', 'A state in which one thread runs an infinite loop', 'A state in which the queue of a thread pool is full'], why: 'If A holds lock 1 and waits for lock 2 while B holds lock 2 and waits for lock 1, neither can make progress.' },
  { lv: 2, id: 'deadlock', q: 'In code that uses two or more locks, what is the typical way to prevent a deadlock?', a: ['Make every thread acquire the locks in the same order', 'Increase the number of threads', 'Sleep for a moment after acquiring a lock', 'Declare the variables volatile'], why: 'When every thread acquires the locks in the same order, no cycle can form in which the threads wait for each other.' },
]);
