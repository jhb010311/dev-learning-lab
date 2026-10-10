// Quiz questions for the "Lazy evaluation in streams" lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 2, id: 'stream', q: 'You write only list.stream().filter(...).map(...) and do not add a terminal operation such as collect. What happens?', a: ['The code passed to filter and map never runs', 'Both filter and map run, and only the result is discarded', 'Only filter runs, and map does not run', 'A compile-time error occurs'], why: 'The intermediate operations of a stream are evaluated lazily. The elements start to flow only when the terminal operation is called.' },
]);
