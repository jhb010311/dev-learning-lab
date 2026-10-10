// Quiz questions for the parallel lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 3, id: 'parallel', q: 'You need to call three external APIs that have nothing to do with each other (1s each). About how long does it take to call them one after another, and to call them at the same time with CompletableFuture on an executor that has enough threads?', a: ['About 3s one after another, about 1s at the same time', 'About 3s in both cases', 'About 1s one after another, about 3s at the same time', 'About 1s in both cases'], why: 'The waiting times overlap, so calling them at the same time takes only as long as the one call that takes the longest.' },
]);
