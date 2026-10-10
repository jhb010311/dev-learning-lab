// Quiz questions for the ctx lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 2, id: 'ctx', q: 'What happens when you split tasks that do nothing but CPU computation across far more threads than there are cores?', a: ['Overall throughput hardly increases, and the time for one task to finish gets longer', 'Throughput keeps increasing in proportion to the number of threads', 'Threads beyond the number of cores do not run', 'The time for one task to finish gets shorter in proportion to the number of threads'], why: 'Only as many threads as there are cores can actually compute at the same time. The rest take turns running and wait.' },
]);
