// Quiz questions for the Redis single-threaded execution lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 2, id: 'redis', q: 'Why is it dangerous to run one long-running command in Redis, such as KEYS *?', a: ['Commands run one at a time in order, so every other request waits until that command finishes', 'Only the connection of the client that ran it becomes slow', 'Redis automatically adds threads to handle it, so memory runs short', 'All the data is deleted'], why: 'Redis runs commands on a single thread. That is why each command must be short.' },
]);
