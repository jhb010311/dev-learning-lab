// Quiz questions for the join lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 1, id: 'join', q: 'Which statement correctly describes the difference between INNER JOIN and LEFT JOIN?', a: ['LEFT JOIN keeps every row of the left table even when it has no match, and fills the missing side with NULL', 'LEFT JOIN shows only the columns of the left table', 'INNER JOIN shows rows without a match too', 'The two always give the same result'], why: 'INNER JOIN keeps only the rows that have a match on both sides.' },
]);
