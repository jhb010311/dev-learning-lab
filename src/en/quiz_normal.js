// Quiz questions for the normal lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 1, id: 'normal', q: 'What is the main purpose of normalization?', a: ['To reduce the same data being stored in several places, which prevents the values from getting out of step when you change them', 'To make queries as fast as possible', 'To reduce the number of tables', 'To encrypt the stored data'], why: 'Duplicated data goes out of step if only one copy is changed. The cost is that reading the data needs more joins.' },
]);
