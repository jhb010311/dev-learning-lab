// Quiz questions for the "Parallel streams and the common pool" lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 3, id: 'parstream', q: 'In code that handles requests, a long-running external call was put inside parallelStream(). What problem can this cause?', a: ['The threads of the common pool, which the whole JVM shares, are occupied, and other parallel streams slow down too', 'A parallel stream cannot make external calls, so a compile-time error occurs', 'A separate pool is created for every request, so memory runs short', 'There is no problem. A parallel stream creates an unlimited number of threads'], why: 'By default, a parallel stream uses the single common ForkJoinPool. That pool has few threads, about as many as the number of cores.' },
]);
