Lab.register({
  id: 'cme', nav: 'Removing during iteration', cat: 'Data structures', mode: 'step',
  title: 'What happens when you remove elements inside a loop',
  intro: 'The code iterates over the list [1, 2, 2, 3, 4] and tries to remove the elements whose value is 2. Depending on how it removes them, an exception is thrown, or one element is skipped with no exception at all.',
  terms: ['Fail-fast iterator', 'ArrayList', 'ConcurrentHashMap', 'Thread safety'], ranks: ['collection', 'exception'],
  controls: [
    { id: 'how', label: 'How to remove', type: 'select', value: 'foreach', options: [['foreach', 'list.remove() inside an enhanced for statement'], ['indexfwd', 'for statement with an index (front to back)'], ['indexback', 'for statement with an index (back to front)'], ['iterator', 'remove() of the Iterator'], ['removeIf', 'removeIf()']] },
    { id: 'coll', label: 'Collection', type: 'select', value: 'array', options: [['array', 'ArrayList'], ['cow', 'CopyOnWriteArrayList']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you remove the 2s with list.remove() inside an enhanced for statement?', d: 'Removal inside an enhanced for statement. An exception is thrown.', v: { how: 'foreach', coll: 'array' } },
    { t: 'for statement with an index, from the front', q: 'What if you remove the 2s with a for statement with an index, from front to back?', d: 'No exception is thrown, but one 2 is left.', v: { how: 'indexfwd', coll: 'array' } },
    { t: 'Removing from the back', q: 'What if you remove the 2s with a for statement with an index, from back to front?', d: 'The elements that shift are on the side that was already visited, so there is no problem.', v: { how: 'indexback', coll: 'array' } },
    { t: 'Iterator.remove()', q: 'What if you remove the 2s with remove() of the Iterator?', d: 'Removing through the iterator is safe.', v: { how: 'iterator', coll: 'array' } },
    { t: 'removeIf()', q: 'What if you remove the 2s with removeIf(), passing the condition x == 2?', d: 'This is the simplest and safest way.', v: { how: 'removeIf', coll: 'array' } },
    { t: 'Removal in a for statement on a CopyOnWriteArrayList', q: 'What if you change the collection to CopyOnWriteArrayList and remove the 2s with list.remove() inside an enhanced for statement?', d: 'No exception is thrown. The loop iterates over the old array from when it was created.', v: { how: 'foreach', coll: 'cow' } },
  ],
  code: function (c) {
    var decl = 'List<Integer> list = new ' + (c.coll === 'array' ? 'ArrayList' : 'CopyOnWriteArrayList') + '<>(List.of(1, 2, 2, 3, 4));\n\n';
    return '// Only the lines inside main are shown (class, main declaration, and imports omitted)\n' + decl + { foreach: 'for (Integer x : list) {\n    if (x == 2) list.remove(x);          // modifies the list directly during iteration\n}', indexfwd: 'for (int i = 0; i < list.size(); i++) {\n    if (list.get(i) == 2) list.remove(i);\n}', indexback: 'for (int i = list.size() - 1; i >= 0; i--) {\n    if (list.get(i) == 2) list.remove(i);\n}', iterator: 'for (Iterator<Integer> it = list.iterator(); it.hasNext(); ) {\n    if (it.next() == 2) it.remove();     // removes through the iterator\n}', removeIf: 'list.removeIf(x -> x == 2);' }[c.how];
  },
  label: function (c) { return (c.coll === 'array' ? 'ArrayList' : 'CopyOnWriteArrayList') + ' · ' + { foreach: 'enhanced for', indexfwd: 'index front→back', indexback: 'index back→front', iterator: 'Iterator.remove', removeIf: 'removeIf' }[c.how]; },
  columns: ['Resulting list', 'Exception', 'All 2s removed?'],
  simulate: function (c) {
    var list = [1, 2, 2, 3, 4], ev = [], ex = '', cow = c.coll === 'cow', sum = [];
    function push(s, k, cur, note) { ev.push({ s: s, k: k, snap: { list: list.slice(), cur: cur, note: note || '' } }); }
    push('The list is [1, 2, 2, 3, 4]. The code tries to remove the two elements whose value is 2.', '', -1);
    if (c.how === 'foreach' || c.how === 'iterator') {
      var snapArr = list.slice(), cursor = 0, mod = 0, expected = 0;
      push(cow ? 'An iterator is created. The iterator of a CopyOnWriteArrayList holds on to the array as it was at the moment the iterator was created, [1, 2, 2, 3, 4], and iterates over that array. The iterator is not affected even if the list changes afterward.' : 'An iterator is created (an enhanced for statement also uses an iterator internally). The iterator remembers the modification count of the list at this point (' + mod + ').', '', -1);
      for (;;) {
        var src = cow ? snapArr : list;
        if (cursor === src.length) { push('The iterator finds that there are no more elements to read, and the loop ends.', '', -1); break; }
        if (!cow && mod !== expected) { ex = 'ConcurrentModificationException'; push('The iterator is about to read the next element, but the modification count of the list (' + mod + ') differs from the value the iterator remembered (' + expected + '). This means that the list changed without the iterator knowing, so rather than produce a wrong result, the iterator throws a ConcurrentModificationException immediately (fail-fast).', 'bad', cursor); break; }
        var x = src[cursor], at = cursor; cursor++;
        if (x !== 2) { push('Element ' + x + ' is checked: it is not 2, so the loop moves on.', '', cow ? list.indexOf(x) : at); continue; }
        if (c.how === 'foreach') {
          list.splice(list.indexOf(2), 1); mod++;
          push('The element 2 is read. list.remove() removes it directly from the list. The list is now ' + JSON.stringify(list).replace(/,/g, ', ') + '.' + (cow ? ' The list has switched to a new array, but the iterator keeps iterating over the old array.' : ' The modification count of the list has gone up to ' + mod + ', but the iterator does not know that.'), cow ? '' : 'bad', -1);
        } else if (cow) { ex = 'UnsupportedOperationException'; push('The element 2 is read and it.remove() is called. The iterator of a CopyOnWriteArrayList is read-only because it iterates over a copy, and it does not support removal. An UnsupportedOperationException is thrown.', 'bad', at); break; }
        else { list.splice(at, 1); cursor = at; mod++; expected = mod; push('The element 2 is read and removed with it.remove(). Because the iterator did the removal itself, it moves its own position back by one and also updates the modification count it remembers to ' + mod + '. The list is now ' + JSON.stringify(list).replace(/,/g, ', ') + '.', 'good', -1); }
      }
    }
    if (c.how === 'indexfwd') for (var i = 0; i < list.length; i++) {
      if (list[i] === 2) { list.splice(i, 1); push('i = ' + i + ': The value is 2. It is removed. The elements after it each shift one position to the left, and the list is now ' + JSON.stringify(list).replace(/,/g, ', ') + '. The element that has just shifted into index ' + i + ' is ' + list[i] + ', but the loop increases i to ' + (i + 1) + ', so this element is passed over without being checked.', list[i] === 2 ? 'bad' : '', i); }
      else push('i = ' + i + ': The value is ' + list[i] + '. The loop moves on.', '', i);
    }
    if (c.how === 'indexback') for (var j = list.length - 1; j >= 0; j--) {
      if (list[j] === 2) { list.splice(j, 1); push('i = ' + j + ': The value is 2. It is removed. The only elements that shift are the ones after it, which have already been checked, so the positions of the elements still to be visited do not change. The list is now ' + JSON.stringify(list).replace(/,/g, ', ') + '.', 'good', -1); }
      else push('i = ' + j + ': The value is ' + list[j] + '. The loop moves on.', '', j);
    }
    if (c.how === 'removeIf') { list = list.filter(function (x2) { return x2 !== 2; }); push('removeIf filters out the elements that match the condition internally, all at once. You do not run the loop yourself, so the problem of modifying during iteration does not arise. The list is now ' + JSON.stringify(list).replace(/,/g, ', ') + '.', 'good', -1); }
    var res = '[' + list.join(', ') + ']', clean = list.indexOf(2) < 0;
    push('Final list: ' + res + (ex ? ' (stopped by an exception)' : '') + '.', clean && !ex ? 'good' : 'bad', -1);
    if (ex === 'ConcurrentModificationException') sum.push('Despite its name, this exception is thrown even when there is only one thread. It occurs when a collection is modified during iteration without going through the iterator. The iterator detects the change by comparing modification counts and fails immediately.');
    if (c.how === 'indexfwd') sum.push('No exception is thrown, but the result is wrong. The loop skips the element that shifted into the position of the removed one. Being silently wrong is more dangerous than throwing an exception.');
    if (cow && c.how === 'foreach') sum.push('CopyOnWriteArrayList makes a fresh copy of the whole array on every modification, and an iterator goes over the old array. So modifying during iteration is safe, but each modification is costly. It suits cases where reads vastly outnumber modifications (such as a list of listeners). ConcurrentHashMap is also designed not to throw an exception when it is modified during iteration.');
    if (!ex && clean && c.how !== 'foreach') sum.push('To remove elements while iterating, use removeIf() or Iterator.remove().');
    if (!sum.length) sum.push('Result: ' + res + '. Exception: ' + (ex || 'none') + '. ' + (clean ? 'All the 2s were removed.' : 'A 2 is still in the list.'));
    return { events: ev, summary: sum, res: res + (ex ? '|' + ex : ''), row: [res, ex || 'none', clean ? 'Yes' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { list: [1, 2, 2, 3, 4], cur: -1 };
    H.title(v, 'List (position = index)'); H.slots(v, s.list.map(function (x, i) { return [String(x), (x === 2 ? 'r' : 'd') + (i === s.cur ? ' now' : '')]; }), 'empty');
    H.text(v, 'Red marks the value 2, which must be removed, and the thick border marks the element that is being looked at now.');
  },
  assume: 'The final list and the exception were checked for all 10 combinations against the result of running the same code on JDK 21 in our test environment. Removal inside an enhanced for statement sometimes ends without an exception, depending on the position of the element that is removed (when the second-to-last element is removed), but such code relies on luck and must not be used.',
});
