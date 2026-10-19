Lab.register({
  id: 'stack', nav: 'Stack and heap', cat: 'JVM', mode: 'step',
  title: 'What happens in memory each time a method is called',
  intro: 'When a method is called, a frame is pushed onto the stack of that thread, and when the method returns, the frame is removed. An object created with new is placed on the heap, not on the stack, and a local variable in the frame refers to it.',
  terms: ['Run-time data areas', 'Java Virtual Machine stack', 'Heap memory', 'StackOverflowError and OutOfMemoryError'], ranks: ['jvm'],
  controls: [
    { id: 'n', label: 'Value passed to factorial', type: 'range', min: 1, max: 10, value: 4, fmt: function (v) { return 'factorial(' + v + ')'; } },
    { id: 'base', label: 'The recursion has a base case', type: 'check', value: true },
    { id: 'limit', label: 'Number of frames that fit on the stack', type: 'range', min: 4, max: 12, value: 8, fmt: function (v) { return v + ' frames'; }, hint: 'This is set very small so that it is easy to see. A real stack usually holds thousands of frames or more, and you adjust its size with the -Xss option.' },
    { id: 'obj', label: 'Each call creates one object', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens in memory when factorial(4), which has a base case, is called on a stack that holds up to 8 frames?', d: 'factorial(4). The frames pile up to 5 and are then removed in reverse order.', v: { n: 4, base: true, limit: 8, obj: false } },
    { t: 'Without the base case', q: 'What if the recursion has no base case?', d: 'The method keeps calling itself until the stack overflows.', v: { n: 4, base: false, limit: 8, obj: false } },
    { t: 'With a base case, but too deep', q: 'What if you keep the base case and pass factorial(10) instead?', d: 'factorial(10) needs 11 frames. The stack holds only 8.', v: { n: 10, base: true, limit: 8, obj: false } },
    { t: 'With a larger stack', q: 'What if you call factorial(10) and increase the number of frames that fit on the stack to 12?', d: 'The same factorial(10) finishes normally.', v: { n: 10, base: true, limit: 12, obj: false } },
    { t: 'An object created on each call', q: 'What if each call creates one object?', d: 'The objects are created on the heap, and once a frame is removed, nothing refers to its object anymore.', v: { n: 4, base: true, limit: 8, obj: true } },
  ],
  code: function (c) {
    return '// Only the class body is shown (class declaration omitted)\nstatic long factorial(int n) {\n' + (c.obj ? '    byte[] buf = new byte[1024];      // the object is on the heap, the variable buf is on the stack\n' : '') + (c.base ? '    if (n <= 1) return 1;             // base case\n' : '    // no base case\n') + '    return n * factorial(n - 1);\n}\n\npublic static void main(String[] args) {\n    System.out.println(factorial(' + c.n + '));\n}';
  },
  label: function (c) { return 'factorial(' + c.n + ') · base case: ' + (c.base ? 'yes' : 'no') + ' · stack: ' + c.limit + ' frames' + (c.obj ? ' · creates objects' : ''); },
  columns: ['Result', 'Deepest stack', 'Objects created', 'Unreferenced objects at the end'],
  simulate: function (c) {
    var frames = [{ name: 'main()', vars: 'args', st: 'running' }], heap = [], ev = [], maxDepth = 1, result = '', sum = [];
    function snap() { return { frames: frames.map(function (f) { return { name: f.name, vars: f.vars, st: f.st }; }), heap: heap.map(function (h) { return { id: h.id, live: h.live }; }) }; }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    push('The program starts. A frame for main() is placed on the stack of the main thread. A frame holds the local variables of its method and the place to return to.', '');
    var n = c.n, overflow = false;
    for (;;) {
      if (frames.length >= c.limit) { overflow = true; push('The program tries to call factorial(' + n + '), but the stack has no room for another frame (all ' + c.limit + ' places are taken). A StackOverflowError is thrown.', 'bad'); break; }
      frames[frames.length - 1].st = 'waiting for the result of factorial(' + n + ')';
      var f = { name: 'factorial(' + n + ')', vars: 'n = ' + n, st: 'running', n: n }; frames.push(f); maxDepth = Math.max(maxDepth, frames.length);
      if (c.obj) { var id = heap.length + 1; heap.push({ id: id, live: true, owner: f }); f.vars += ', buf → object ' + id; f.obj = id; }
      push('factorial(' + n + ') is called. A new frame is pushed onto the top of the stack. The local variable n (value ' + n + ') exists only inside this frame.' + (c.obj ? ' The array created with new is placed on the heap, and the variable buf in the frame holds only a reference to it.' : ''), '');
      if (c.base && n <= 1) break;
      n--;
    }
    function pop(why) { var f = frames.pop(); if (f.obj) heap[f.obj - 1].live = false; return f; }
    if (overflow) {
      while (frames.length > 1) pop();
      frames[0].st = 'received the exception';
      push('As the exception keeps propagating to the callers, all the frames that had piled up are removed.' + (c.obj ? ' Nothing refers to the heap objects that those frames referred to anymore, so they become eligible for garbage collection.' : ''), 'bad');
      frames.pop(); push('main() does not catch the exception either, so this thread ends. Each thread has its own stack, so the stacks of other threads are not affected.', 'bad');
      result = 'StackOverflowError';
      sum.push(c.base ? 'Even with a base case, a StackOverflowError is thrown when the depth that is needed (' + (c.n + 1) + ' frames) exceeds the stack size (' + c.limit + ' frames). Either make the stack larger (-Xss) or replace the recursion with a loop.' : 'Without a base case, frames pile up without end and the stack always overflows. This is the most common cause of a StackOverflowError.');
      sum.push('A StackOverflowError means that the stack overflowed. An OutOfMemoryError is thrown when no more memory can be allocated in a memory area such as the heap. The two are problems in different areas.');
    } else {
      var val = 1;
      while (frames.length > 1) {
        var top = frames[frames.length - 1], k = top.n; val = k <= 1 ? 1 : k * val; pop();
        frames[frames.length - 1].st = 'running';
        push('The call to factorial(' + k + ') has finished. The return value is ' + (k <= 1 ? '1, because the base case applies' : k + ' × ' + (val / k) + ' = ' + val) + '. The frame is removed from the stack, and the local variables in it go away with it.' + (c.obj ? ' Object ' + top.obj + ', which buf referred to, is still on the heap, but nothing refers to it anymore.' : ''), '');
      }
      push('main() prints the result: ' + val + '. The frame that was pushed last was the first to leave the stack (last-in-first-out).', 'good');
      result = String(val);
      sum.push('A frame is pushed when a method is called and removed when it returns. At the deepest point there were ' + maxDepth + ' frames. A local variable lives exactly as long as its frame, so it needs no separate cleanup.');
    }
    var dead = heap.filter(function (h) { return !h.live; }).length;
    if (c.obj) sum.push('Objects created on the heap: ' + heap.length + '. An object is not deleted as soon as its frame is removed. The garbage collector later reclaims the objects that are no longer referenced (' + dead + ' of them here). The heap is an area that all threads share.');
    return { events: ev, summary: sum, row: [result, maxDepth + ' frames', heap.length + '', dead + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { frames: [], heap: [] };
    H.title(v, 'Stack of the main thread (the top is the method that is running now)'); var ln = H.lanes(v);
    for (var i = c.limit - 1; i >= 0; i--) { var f = s.frames[i]; if (f) H.lane(ln, '#' + (i + 1), f.name + '  |  ' + f.vars + '  |  ' + f.st, i === s.frames.length - 1 ? 'hot' : 'wait'); else H.lane(ln, '#' + (i + 1), 'empty', 'none'); }
  },
  // Diagram: the stack on the left (filled from the bottom up) and the heap on the right. Arrows go from the variables in the frames to the objects on the heap.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { frames: [], heap: [] }, L = c.limit, top = 16, rh = 34 + 30 + L * 30 + 8, bottom = top + rh;
    P.size(680, bottom + 16);
    P.region('stack', 16, top, 330, rh, 'Stack of the main thread (fills from the bottom)');
    P.region('heap', 386, top, 278, rh, 'Heap (shared by all threads)');
    var slotY = function (i) { return bottom - 8 - (i + 1) * 30 + 2; };
    for (var i = 0; i < L; i++) {
      var f = s.frames[i];
      if (f) P.box('f' + i, 28, slotY(i), 306, 26, { cls: i === s.frames.length - 1 ? 'hot now' : 'wait', title: f.name, right: f.vars.replace(/, buf → object \d+/, '') + (/buf/.test(f.vars) ? ', buf' : '') });
      else P.box('e' + i, 28, slotY(i), 306, 26, { cls: 'ghost', sub: 'empty', center: true });
    }
    if (last && last.k === 'bad' && s.frames.length >= L) P.box('over', 28, top + 30, 306, 26, { cls: 'bad', title: 'No room for a new frame', center: true });
    s.heap.forEach(function (h) {
      var y = slotY(h.id);
      P.box('o' + h.id, 430, y, 190, 26, { cls: h.live ? 'good' : 'ghost', title: 'Object ' + h.id, right: h.live ? 'byte[1024]' : 'unreferenced', from: 'f' + h.id });
      if (h.live && s.frames[h.id]) P.arrow('a' + h.id, 'f' + h.id + ':r', 'o' + h.id + ':l');
    });
    if (!s.heap.length) P.text('hempty', 525, top + rh / 2, c.obj ? 'No objects yet' : 'These settings create no objects', { cls: 'mut', anchor: 'middle' });
    P.note('The yellow box is the frame that is running now, and the blue boxes are frames waiting for the result of another call. An arrow shows the variable buf in a frame referring to an object on the heap. An object with a dashed outline is no longer referenced and is eligible for garbage collection.');
  },
  assume: 'This model simplifies the stack size to a number of frames. In reality the size is measured in bytes (-Xss, about 1MB by default on 64-bit Linux), and the size of a frame depends on how many local variables it has, so the number of frames that fit is not fixed. It also depends on whether the code has been JIT-compiled. That each thread has its own stack while the heap is shared, and that a frame is pushed on a call and removed on a return, matches the definitions in the JVM specification. This was checked by actually running code on JDK 21 in our test environment. Recursion without a base case threw a StackOverflowError at a depth of about 17,000. Even with a base case, a depth of 200,000 threw a StackOverflowError with the default stack, and the same code finished normally once the stack was enlarged to 64MB (-Xss64m). After the stack of one thread overflowed, the other threads kept running.',
});
