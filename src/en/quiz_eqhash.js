// Quiz questions for the eqhash lab. The first entry of a is the correct answer, and when there is a sim, the answer is checked against the result of the lab model at build time.
Lab.quiz([
  { lv: 1, id: 'eqhash', q: 'Why should you override hashCode as well when you override equals?',
    a: ['Because HashMap and HashSet first use hashCode to decide which bucket to look in and then compare with equals in that bucket', 'Because equals always calls hashCode internally to make the comparison', 'Because a compile-time error occurs if you do not override hashCode', 'Because hashCode is the memory address of the object and is therefore more accurate than equals'],
    why: 'HashMap and HashSet use hashCode to decide the bucket, and they compare with equals only against the keys in that bucket. If two objects that are equal according to equals have different hashCode values, the lookup goes to a different bucket and the key is not found. The compiler does not prevent this.' },
  { lv: 2, id: 'eqhash', q: 'equals is overridden to compare id, and hashCode is written to return 42 for every object. What happens when this class is used as the key of a HashMap?',
    a: ['The results are correct, but every key ends up in one bucket, so the map gets slower as the number of keys grows', 'The contract is broken, so a value cannot be retrieved with a key that has the same contents', 'Only one key is stored, and the others are overwritten', 'HashMap throws an exception at run time'],
    why: 'The contract that objects that are equal according to equals must also have the same hashCode is kept, so the results are correct. But every key has the same hashCode and ends up in one bucket, and every lookup has to compare the keys in that bucket one by one with equals.' },
  { lv: 3, id: 'eqhash', q: 'In the Order class, only equals is overridden, so that it compares id. You call map.put with new Order(1) as the key and then call map.get with another new Order(1). What is returned?',
    a: ['null', 'The value that was put in', 'ClassCastException', 'Sometimes the value and sometimes null, depending on the run, but usually the value'],
    why: 'hashCode is not overridden, so the hashCode values of the two objects are (almost always) different. HashMap looks in a different bucket and returns null without ever calling equals.',
    sim: { c: { how: 'eq', same: 'same' }, col: 2, has: 'null' } },
]);
