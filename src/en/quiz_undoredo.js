// Quiz questions for the undoredo lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 2, id: 'undoredo', q: 'What is used to return the data to its value before the change when a transaction is rolled back?', a: ['The undo log', 'The redo log', 'The slow query log', 'The binary log'], why: 'The undo log keeps the values from before the change. The redo log is used to apply committed changes again after a failure.' },
]);
