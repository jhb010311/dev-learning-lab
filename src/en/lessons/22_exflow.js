Lab.register({
  id: 'exflow', nav: 'Exceptions and finally', cat: 'Java language', mode: 'step',
  title: 'When an exception is thrown, which blocks run, and in what order?',
  intro: 'When an exception is thrown in the try block, control jumps to the catch block, and the finally block runs whether the try block is left normally, by a return, or by an exception. The order is easy to get wrong when a return is involved or when another exception is thrown inside the catch block.',
  terms: ['finally and try-with-resources', 'Exception and Error', 'Checked and unchecked exceptions'], ranks: ['exception'],
  controls: [
    { id: 'ex', label: 'Exception', type: 'select', value: 'match', options: [['none', 'No exception'], ['match', 'Thrown in try, a type that the catch block catches'], ['nomatch', 'Thrown in try, a type that the catch block does not catch'], ['incatch', 'Thrown in try and caught, then another one thrown inside catch']] },
    { id: 'ret', label: 'There is a return at the end of the try block', type: 'check', value: false },
    { id: 'fret', label: 'There is a return in the finally block', type: 'check', value: false },
    { id: 'res', label: 'Open a resource with try-with-resources', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'Which blocks run, and in what order, when an exception is thrown in try and the catch block catches that type?', d: 'The catch block catches the exception thrown in the try block.', v: { ex: 'match', ret: false, fret: false, res: false } },
    { t: 'An exception that the catch block does not catch', q: 'What if the exception is a type that the catch block does not catch?', d: 'The catch block is skipped, but the finally block runs.', v: { ex: 'nomatch', ret: false, fret: false, res: false } },
    { t: 'A return in the try block', q: 'What if there is no exception and the try block ends with a return?', d: 'Even after the return value is set, the finally block runs first.', v: { ex: 'none', ret: true, fret: false, res: false } },
    { t: 'A return in the finally block', q: 'What if the exception is a type that the catch block does not catch, and the finally block has a return?', d: 'The exception that was on its way out disappears.', v: { ex: 'nomatch', ret: false, fret: true, res: false } },
    { t: 'try-with-resources', q: 'What if you open a resource with try-with-resources?', d: 'The resource is closed before the catch and finally blocks run.', v: { ex: 'match', ret: false, fret: false, res: true } },
    { t: 'Another exception inside catch', q: 'What if the catch block catches the exception from try, and another exception is thrown inside catch?', d: 'The new exception leaves the method, and the finally block runs before that.', v: { ex: 'incatch', ret: false, fret: false, res: false } },
  ],
  code: function (c) {
    var t = c.ex === 'none' ? '' : c.ex === 'nomatch' ? '        if (fail) throw new IllegalStateException();     // fail is true. not caught by the catch block\n' : '        if (fail) throw new IllegalArgumentException();  // fail is true\n', tail = !(c.fret || (c.ret && c.ex === 'incatch'));
    return 'int run() {\n    try ' + (c.res ? '(Resource r = new Resource()) ' : '') + '{\n        print("try start");\n' + t + '        print("try end");\n' + (c.ret ? '        return 1;\n' : '') + '    } catch (IllegalArgumentException e) {\n        print("catch");\n' + (c.ex === 'incatch' ? '        throw new RuntimeException();           // another exception inside catch\n' : '') + '    } finally {\n        print("finally");\n' + (c.fret ? '        return 3;\n' : '') + '    }\n' + (tail ? '    print("after the block");\n    return 2;\n}' : '    // No statement can come after this. ' + (c.fret ? 'finally ends with return,' : 'try ends with return and catch ends with throw,') + ' so it would be an unreachable statement (a compile-time error)\n}');
  },
  label: function (c) { return { none: 'No exception', match: 'Caught by catch', nomatch: 'Not caught by catch', incatch: 'Another exception in catch' }[c.ex] + (c.ret ? ' · return in try' : '') + (c.fret ? ' · return in finally' : '') + (c.res ? ' · with a resource' : ''); },
  columns: ['Execution order', 'Final result'],
  // Pure computation used to check the model against the results of real execution
  trace: function (c) {
    var log = [], pending = null, retv = null;
    if (c.res) log.push('open');
    log.push('try-start');
    if (c.ex === 'match' || c.ex === 'incatch') pending = 'IllegalArgumentException'; else if (c.ex === 'nomatch') pending = 'IllegalStateException';
    else { log.push('try-end'); if (c.ret) retv = 1; }
    if (c.res) log.push('close');
    if (pending === 'IllegalArgumentException') { log.push('catch'); pending = c.ex === 'incatch' ? 'RuntimeException' : null; }
    log.push('finally');
    if (c.fret) return { log: log, out: 'return 3' };
    if (pending) return { log: log, out: 'throw ' + pending };
    if (retv !== null) return { log: log, out: 'return ' + retv };
    log.push('after'); return { log: log, out: 'return 2' };
  },
  simulate: function (c) {
    var tr = this.trace(c), ev = [], seen = [], pend = '', sum = [];
    var NAME = { open: 'open the resource', 'try-start': 'try start', 'try-end': 'try end', close: 'close the resource (close)', catch: 'catch', finally: 'finally', after: 'after the block' };
    function push(id, s, k) { if (id) seen.push(NAME[id]); ev.push({ s: s, k: k, snap: { seen: seen.slice(), pend: pend } }); }
    var threw = c.ex !== 'none', caught = c.ex === 'match' || c.ex === 'incatch';
    if (c.res) push('open', 'The resource is opened inside the parentheses of try.', '');
    if (threw) { pend = caught ? 'IllegalArgumentException' : 'IllegalStateException'; push('try-start', '"try start" is printed, and then an ' + pend + ' is thrown. The remaining lines of the try block ("try end"' + (c.ret ? ', return 1' : '') + ') do not run.', 'bad'); }
    else { push('try-start', '"try start" is printed.', ''); if (c.ret) pend = 'return value 1 (pending)'; push('try-end', '"try end" is printed.' + (c.ret ? ' Control reaches return 1, and the return value is set to 1. But control does not leave the method yet. The finally block is still to come.' : ''), ''); }
    if (c.res) push('close', 'As soon as control leaves the try block, close() is called on the resource automatically. This happens before the catch and finally blocks. The resource is closed even when an exception was thrown.', 'good');
    if (threw && caught) { pend = ''; push('catch', 'The type of the exception matches the IllegalArgumentException of the catch block. The catch block runs, and the exception is considered handled.', ''); if (c.ex === 'incatch') { pend = 'RuntimeException'; ev[ev.length - 1].snap.pend = pend; ev[ev.length - 1].s += ' But a new RuntimeException is thrown inside the catch block. The other catch blocks of the same try do not catch it.'; ev[ev.length - 1].k = 'bad'; } }
    else if (threw) push(null, 'The type IllegalStateException does not match the IllegalArgumentException of the catch block. The catch block is skipped. The exception remains unhandled.', 'bad');
    var before = pend;
    if (c.fret) pend = '';
    push('finally', 'The finally block runs.' + (before ? ' Even when something is still unhandled (' + before + '), the finally block always runs first.' : '') + (c.fret ? ' Control reaches return 3 inside the finally block.' + (before ? ' This return ' + (before.indexOf('return value') === 0 ? 'overwrites the return value 1 that was set earlier.' : 'discards the exception that was on its way out.') : '') : ''), c.fret && before ? 'bad' : '');
    if (tr.out === 'return 2') push('after', 'The try-catch-finally ends, and the line after it runs. "after the block" is printed, and 2 is returned.', 'good');
    else if (tr.out.indexOf('throw') === 0) push(null, 'After the finally block finishes, the unhandled ' + tr.out.slice(6) + ' leaves the method.' + (c.ret && c.ex === 'incatch' ? '' : ' The "after the block" line does not run.'), 'bad');
    else push(null, 'The method ends here. The return value is ' + tr.out.slice(7) + '.' + (c.fret ? '' : ' The "after the block" line does not run.'), c.fret && before ? 'bad' : 'good');
    var res = tr.out.indexOf('throw') === 0 ? tr.out.slice(6) + ' thrown' : tr.out.slice(7) + ' returned';
    sum.push('The finally block runs in every case: normal completion, a return, or an exception. That is why releasing locks and cleaning up resources are placed in the finally block.');
    if (c.fret && before) sum.push('A return inside the finally block silently discards the exception or the return value that was in progress. The fact that an exception was thrown disappears, so do not write a return in a finally block.');
    if (c.res) sum.push('A resource of try-with-resources is closed at the point where the try block ends, so it is already closed when the catch and finally blocks run. This is safer than calling close() yourself in the finally block.');
    if (c.ex === 'nomatch' && !c.fret) sum.push('A catch block catches only the type it declares (and its subtypes). An exception that does not match keeps going up to the caller.');
    return { events: ev, summary: sum, row: [seen.join(' → '), res] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], pend: '' };
    H.title(v, 'Blocks that have run so far'); H.slots(v, s.seen.map(function (x, i) { return [x, i === s.seen.length - 1 ? 'b' : 'd']; }), 'None yet');
    H.counters(v, [[s.pend || 'none', 'Still unhandled and pending (an exception or a return value)']]);
    H.title(v, 'Console output'); var out = s.seen.filter(function (x) { return x.indexOf('resource') < 0; });
    v.appendChild(H.el('pre', 'code', out.length ? out.join('\n') : '(none yet)'));
  },
  assume: 'For all 32 combinations, the code exactly as shown (with only a fail field set to true, print, and Resource added) was compiled and run on JDK 21 on this PC, and the output order and the final result were checked (verify/plain/exflow_code_check.js). Only the case with one resource is covered. When there are several resources, they are closed in the opposite order from the order in which they were opened, and an exception thrown by close() is attached to the original exception as a suppressed exception.',
});
