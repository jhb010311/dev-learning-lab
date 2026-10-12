Lab.register({
  id: 'stream', nav: 'Lazy evaluation in streams', cat: 'Java language', mode: 'step',
  title: 'A stream does not run in the order in which it is written',
  intro: 'Intermediate operations such as filter and map do nothing at the moment they are called. They run only when the terminal operation is called. Even then, the stream does not finish one operation for all the elements before it starts the next. It sends the elements through to the end one at a time.',
  terms: ['Stream API', 'Lazy evaluation', 'Lambda expression', 'Optional'], ranks: ['stream', 'javaver'],
  controls: [
    { id: 'term', label: 'Terminal operation', type: 'select', value: 'toList', options: [['none', 'None (intermediate operations only)'], ['toList', 'toList(): collect all the elements'], ['findFirst', 'findFirst(): the first element only']] },
    { id: 'sorted', label: 'Put sorted() between filter and map', type: 'check', value: false },
    { id: 'limit', label: 'Add limit(2) at the end', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'In a stream that collects all the elements with toList(), in what order do filter and map run?', d: 'One element goes through filter and map to the end, and then the stream moves on to the next element.', v: { term: 'toList', sorted: false, limit: false } },
    { t: 'Without a terminal operation', q: 'What if you leave out the terminal operation and keep only the intermediate operations?', d: 'Neither filter nor map runs even once.', v: { term: 'none', sorted: false, limit: false } },
    { t: 'findFirst()', q: 'What if you change the terminal operation to findFirst()?', d: 'The stream stops the moment the first element is found. It does not even look at the rest.', v: { term: 'findFirst', sorted: false, limit: false } },
    { t: 'limit(2)', q: 'What if you add limit(2) at the end?', d: 'Once two elements have been taken, the remaining elements are not handled.', v: { term: 'toList', sorted: false, limit: true } },
    { t: 'Adding sorted()', q: 'What if the terminal operation is findFirst() and you put sorted() between filter and map?', d: 'Sorting requires gathering all the elements, so filter runs to the end first.', v: { term: 'findFirst', sorted: true, limit: false } },
  ],
  DATA: [5, 2, 8, 1, 9, 4],
  code: function (c) {
    return 'List.of(5, 2, 8, 1, 9, 4).stream()\n    .filter(x -> x > 3)          // only values greater than 3\n' + (c.sorted ? '    .sorted()                    // sort in ascending order\n' : '') + '    .map(x -> x * 10)            // multiply by 10\n' + (c.limit ? '    .limit(2)                    // at most 2 elements\n' : '') + (c.term === 'toList' ? '    .toList();' : c.term === 'findFirst' ? '    .findFirst();' : '    ;                            // no terminal operation');
  },
  label: function (c) { return 'filter' + (c.sorted ? ' → sorted' : '') + ' → map' + (c.limit ? ' → limit(2)' : '') + ' → ' + (c.term === 'none' ? '(no terminal operation)' : c.term + '()'); },
  columns: ['Times filter ran', 'Times map ran', 'Result'],
  // Pure calculation that is used to check the model against the result of real execution
  trace: function (c) {
    var log = [], res = [], D = this.DATA, max = c.term === 'findFirst' ? 1 : c.limit ? 2 : Infinity;
    if (c.term === 'none') return { log: log, out: '(not run)', res: res };
    if (c.sorted) { var pass = []; D.forEach(function (x) { log.push('filter(' + x + ')'); if (x > 3) pass.push(x); }); pass.sort(function (a, b) { return a - b; }); for (var i = 0; i < pass.length && res.length < max; i++) { log.push('map(' + pass[i] + ')'); res.push(pass[i] * 10); } }
    else for (var j = 0; j < D.length && res.length < max; j++) { log.push('filter(' + D[j] + ')'); if (D[j] > 3) { log.push('map(' + D[j] + ')'); res.push(D[j] * 10); } }
    return { log: log, res: res, out: c.term === 'findFirst' ? 'Optional[' + res[0] + ']' : '[' + res.join(', ') + ']' };
  },
  simulate: function (c) {
    var tr = this.trace(c), ev = [], D = this.DATA, done = [], out = [], sum = [];
    function push(s, k, cur) { ev.push({ s: s, k: k, snap: { log: done.slice(), out: out.slice(), cur: cur } }); }
    push('stream(), filter(), ' + (c.sorted ? 'sorted(), ' : '') + 'map()' + (c.limit ? ', limit()' : '') + ' were called in order. These calls only link together "what to do". They do not take a single element out. No lambda expression has run yet.', '', -1);
    if (c.term === 'none') { push('There is no terminal operation. The pipeline has been built, but nothing signals it to start running, so filter and map never run.', 'bad', -1); sum.push('Intermediate operations alone make nothing happen. If you build a stream and leave out the terminal operation, you get code that quietly does nothing, without any error.'); return { events: ev, summary: sum, tr: tr, row: ['0 times', '0 times', '(not run)'] }; }
    push(c.term + '() was called. Execution starts now. The terminal operation pulls the elements through one at a time.', '', -1);
    tr.log.forEach(function (l, i) {
      var x = +l.replace(/\D/g, ''), isF = l.indexOf('filter') === 0, next = tr.log[i + 1] || '';
      done.push(l);
      if (isF) { var pass = x > 3; push('filter(' + x + '): ' + (pass ? 'It is greater than 3, so it passes.' + (c.sorted ? ' sorted() receives it and keeps it. sorted() passes nothing to the next stage until all the elements have arrived.' : ' It goes straight on to the next operation, map.') : 'It is not greater than 3, so it is dropped. This element does not go to map.'), '', D.indexOf(x)); }
      else { out.push(x * 10); push('map(' + x + '): The value is changed to ' + x * 10 + ' and ' + (c.term === 'findFirst' ? 'passed to findFirst.' : c.limit ? 'put into the result by way of limit.' : 'put into the result.'), 'good', D.indexOf(x)); }
      if (isF && c.sorted && next.indexOf('map') === 0) push('The elements have run out. sorted() sorts the values that it has kept. Sorting is possible only when all the elements are known, so the filter before it ran on every element first.', '', -1);
    });
    var fN = tr.log.filter(function (l) { return l.indexOf('filter') === 0; }).length, mN = tr.log.length - fN, early = fN < D.length;
    if (early) push((c.term === 'findFirst' ? 'findFirst has received one element,' : 'limit(2) has its two elements,') + ' so nothing more is pulled. The remaining ' + (D.length - fN) + ' elements did not even go through filter.', 'good', -1);
    else if (mN < tr.log.filter(function (l) { return l.indexOf('filter') === 0 && +l.replace(/\D/g, '') > 3; }).length) push((c.term === 'findFirst' ? 'findFirst has received one element,' : 'limit(2) has its two elements,') + ' so the stream stops. The rest of the sorted values did not go through map.', 'good', -1);
    push('Result: ' + tr.out, 'good', -1);
    if (!c.sorted) sum.push('The stream does not "run filter on everything and then map on everything". One element goes all the way through filter → map, and only then does the next element set off. That is why the stream can stop partway.');
    if (early) sum.push('The stream handled only as many elements as were needed and then stopped (short-circuiting). The difference is large when there are many elements or when the operations are expensive.');
    if (c.sorted) sum.push('When an operation that needs to know all the elements, such as sorted(), is in the pipeline, the stages before it run on every element. Even if findFirst or limit comes after it, the work of the earlier stages does not shrink. When possible, put the operations that filter elements out first.');
    return { events: ev, summary: sum, tr: tr, row: [fN + (fN === 1 ? ' time' : ' times'), mN + (mN === 1 ? ' time' : ' times'), tr.out] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { log: [], out: [], cur: -1 }, D = this.DATA;
    H.title(v, 'Source data'); H.slots(v, D.map(function (x, i) { var seen = s.log.indexOf('filter(' + x + ')') >= 0; return [String(x), (i === s.cur ? 'b now' : seen ? (x > 3 ? 'd' : 'r') : '')]; }), null, true);
    H.text(v, 'Green marks an element that passed filter, red marks an element that was filtered out, and a dashed outline marks an element that has not been touched yet.');
    H.title(v, 'Order in which the lambda expressions actually ran'); H.slots(v, s.log.map(function (l, i) { return [l, (l.indexOf('map') === 0 ? 'q' : '') + (i === s.log.length - 1 ? ' now' : '')]; }), 'Nothing has run yet.');
    H.title(v, 'Values in the result'); H.slots(v, s.out.map(function (x) { return [String(x), 'd']; }), 'none yet');
  },
  assume: 'The execution order and the result of all 12 combinations were checked against the result of running the same pipeline on JDK 21 on this PC. This applies to a sequential stream, and in a parallel stream the order in which the elements are handled is different.',
});
