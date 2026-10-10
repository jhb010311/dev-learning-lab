// Quiz questions for the cme lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 3, id: 'cme', q: 'What can happen when for (String s : list) { if (s.isEmpty()) list.remove(s); } runs?', a: ['A ConcurrentModificationException can be thrown', 'All the empty strings are always removed without any problem', 'A compile-time error occurs', 'Nothing is removed and the loop ends silently'], why: 'When a collection is modified directly during iteration, the iterator detects the change and throws an exception. Use Iterator.remove() or removeIf.' },
]);
