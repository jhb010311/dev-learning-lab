// Quiz questions for the binary search and B-tree lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'btree', q: 'What state must the data be in to use binary search?', a: ['It must be sorted', 'It must have no duplicates', 'The number of items must be a power of 2', 'All values must be positive'], why: 'To compare with the middle value and discard one half, the values must be in order of size.' },
  { lv: 2, id: 'btree', q: 'About how many comparisons are needed at most to find one value in 1,000,000 sorted rows with binary search?', a: ['About 20', 'About 1,000', 'About 500,000', 'About 1,000,000'], why: 'Each comparison cuts the candidates in half. Multiplying 2 by itself 20 times gives about 1,000,000, so 20 comparisons are enough.', sim: { c: { how: 'binary', target: '230', n: '1000000' }, col: 2, has: 'Checks: 20' } },
]);
