// Quiz questions for the sqh lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 1, id: 'sqh', q: 'In which data structure does the element that was inserted first come out first (FIFO)?', a: ['Queue', 'Stack', 'Priority queue', 'Hash table'], why: 'A queue returns elements in the order they were inserted. A stack returns the most recently inserted element first, and a priority queue returns elements in priority order.' },
  { lv: 2, id: 'sqh', q: 'You insert 5, 1, and 3 in that order into a PriorityQueue<Integer> and call poll() once. What comes out?', a: ['1. The smallest value comes out, regardless of the insertion order', '5. The value inserted first comes out', '3. The value inserted last comes out', 'It is not defined'], why: 'A priority queue removes the element with the highest priority. In Java, the default is the smallest value.' },
]);
