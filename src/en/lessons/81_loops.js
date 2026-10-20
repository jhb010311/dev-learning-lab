Lab.register({
  id: 'loops', nav: 'Conditionals and loops', cat: 'Java language', mode: 'step',
  title: 'How many times does a loop run, and where does it stop?',
  why: 'To do the same thing ten times or a hundred times without a loop, you would have to copy the same line that many times, and a number of repetitions that is known only when the program runs, such as the length of a list or user input, cannot be written down at all. A loop lets you write the code to repeat only once and leaves the number of repetitions to the condition expression, so the same code handles a different amount of data.',
  use: 'It is used to go through the items of a list one by one to compute a total, to stop with break when the first item that matches a condition is found, and to ask again until valid input arrives. When the number of repetitions is fixed, for is mainly used, and when you do not know in advance when it will end, while is mainly used. To go through the elements of a collection in order, the for-each statement (for (String s : list)), which needs no index, or a stream is sometimes used.',
  intro: 'A loop repeats "check the condition → body → change the value" until the condition becomes false. Whether you write < or <= in the condition changes the number of iterations by one, and break and continue cut that flow short or skip part of it. switch is a conditional statement: like if, it chooses what to run based on a value. It jumps to the case whose value matches, and if there is no break, execution continues into the cases below.',
  terms: ['for statement and while statement', 'break and continue', 'switch statement and fall through'],
  controls: [
    { id: 'stmt', label: 'Statement', type: 'select', value: 'for', options: [['for', 'for statement'], ['while', 'while statement'], ['swc', 'switch (a break in every case)'], ['swf', 'switch (no break)'], ['swa', 'switch (arrow ->)']] },
    { id: 'cmp', label: 'Loop condition', type: 'select', value: 'le', options: [['lt', 'i < 3'], ['le', 'i <= 3']], show: function (c) { return c.stmt === 'for' || c.stmt === 'while'; }, hint: 'i starts at 0 and increases by 1 on each iteration.' },
    { id: 'jump', label: 'What the body does when i is 1', type: 'select', value: 'none', options: [['none', 'Nothing special'], ['break', 'break'], ['cont', 'continue']], show: function (c) { return c.stmt === 'for' || c.stmt === 'while'; } },
    { id: 'val', label: 'Value n given to the switch', type: 'select', value: '2', options: [['1', '1'], ['2', '2'], ['3', '3'], ['9', '9 (no matching case)']], show: function (c) { return c.stmt.indexOf('sw') === 0; } },
  ],
  presets: [
    { t: 'Default settings', q: 'How many times does a for statement with the loop condition i <= 3 run, and where does it stop?', d: 'A for statement written with i <= 3. It runs four times, not three.', v: { stmt: 'for', cmp: 'le', jump: 'none', val: '2' } },
    { t: 'Changing to <', q: 'What if you change the loop condition to i < 3?', d: 'i < 3 runs three times, for 0, 1, and 2.', v: { stmt: 'for', cmp: 'lt', jump: 'none', val: '2' } },
    { t: 'Reaching a break', q: 'What if the loop condition is i < 3 and the body reaches a break when i is 1?', d: 'The whole loop ends when i is 1.', v: { stmt: 'for', cmp: 'lt', jump: 'break', val: '2' } },
    { t: 'Reaching a continue', q: 'What if the loop condition is i < 3 and the body reaches a continue when i is 1?', d: 'Only the iteration in which i is 1 is skipped, and the loop goes on.', v: { stmt: 'for', cmp: 'lt', jump: 'cont', val: '2' } },
    { t: 'continue in a while statement', q: 'What if you change to a while statement with i < 3 and the body reaches a continue when i is 1?', d: 'The code is the same, and yet it never ends.', v: { stmt: 'while', cmp: 'lt', jump: 'cont', val: '2' } },
    { t: 'Removing break from a switch', q: 'What if you change the statement to switch (no break)?', d: 'Execution starts at case 2 and goes through every case below it.', v: { stmt: 'swf', cmp: 'le', jump: 'none', val: '2' } },
    { t: 'A switch with arrows', q: 'What if you change the statement to switch (arrow ->)?', d: 'Only the matching case is executed, even though no break is written.', v: { stmt: 'swa', cmp: 'le', jump: 'none', val: '2' } },
  ],
  words: ['one', 'two', 'three', 'other'],
  code: function (c) {
    var H = '// Only the lines inside main are shown (class, main declaration, and imports omitted)\n';
    if (c.stmt === 'for' || c.stmt === 'while') {
      var pad = function (x) { return x + new Array(Math.max(2, 36 - x.length)).join(' ') + '// '; };
      var cond = 'i ' + (c.cmp === 'le' ? '<=' : '<') + ' 3', j = c.jump === 'break' ? pad('    if (i == 1) break;') + 'ends the loop\n' : c.jump === 'cont' ? pad('    if (i == 1) continue;') + 'skips the rest of this iteration\n' : '';
      if (c.stmt === 'for') return H + pad('for (int i = 0; ' + cond + '; i++) {') + 'initialization; condition; increment\n' + j + '    System.out.println(i);\n}\nSystem.out.println("done");';
      return H + 'int i = 0;\n' + pad('while (' + cond + ') {') + 'repeats while the condition is true\n' + j + '    System.out.println(i);\n    i++;\n}\nSystem.out.println("done");';
    }
    var w = this.words, head = 'int n = ' + c.val + ';\nswitch (n) {\n', tail = '}\nSystem.out.println("done");';
    if (c.stmt === 'swa') return H + head + '    case 1 -> System.out.println("' + w[0] + '");\n    case 2 -> System.out.println("' + w[1] + '");\n    case 3 -> System.out.println("' + w[2] + '");\n    default -> System.out.println("' + w[3] + '");\n' + tail;
    var br = c.stmt === 'swc' ? '        break;\n' : '';
    return H + head + '    case 1:\n        System.out.println("' + w[0] + '");\n' + br + '    case 2:\n        System.out.println("' + w[1] + '");\n' + br + '    case 3:\n        System.out.println("' + w[2] + '");\n' + br + '    default:\n        System.out.println("' + w[3] + '");\n' + tail;
  },
  label: function (c) {
    if (c.stmt === 'for' || c.stmt === 'while') return c.stmt + ' · i ' + (c.cmp === 'le' ? '<=' : '<') + ' 3' + (c.jump === 'break' ? ' · break when i is 1' : c.jump === 'cont' ? ' · continue when i is 1' : '');
    return { swc: 'switch (with break)', swf: 'switch (no break)', swa: 'switch (arrow)' }[c.stmt] + ' · n = ' + c.val;
  },
  columns: ['Output', 'Times executed'],
  simulate: function (c) {
    var ev = [], sum = [], st;
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    if (c.stmt === 'for' || c.stmt === 'while') {
      var isFor = c.stmt === 'for', le = c.cmp === 'le', op = le ? '<=' : '<', jump = c.jump, seen = {}, spin = false, broke = false, skipped = false;
      st = { kind: 'loop', i: null, at: '', cond: null, out: [], body: 0, checks: 0, rounds: [], jumped: '', spin: false, done: false };
      st.i = 0; st.at = 'init';
      push(isFor ? 'int i = 0: This is the first part inside the parentheses of the for statement (the initialization). It is executed only once, at the very beginning, and i becomes 0.' : 'int i = 0: Before the loop is entered, the variable i is declared and set to 0.');
      for (;;) {
        var ok = le ? st.i <= 3 : st.i < 3, again = seen[st.i];
        seen[st.i] = true; st.checks++; st.at = 'cond'; st.cond = ok; st.jumped = '';
        push('Checking i ' + op + ' 3: i is ' + st.i + ', and ' + st.i + ' ' + op + ' 3 is ' + ok + '. ' + (ok ? (le && st.i === 3 ? '<= is true when the two are equal as well, so the body is entered one more time.' : 'The body is entered.') : 'The body is not entered, and the loop ends.'), ok ? '' : 'good');
        if (!ok) break;
        if (again) { spin = true; st.spin = true; st.at = 'spin'; push('i is still 1. Control has come back to the condition check in exactly the same state as a moment ago, so the same thing is repeated without end (an infinite loop). The program does not end, and "done" is not printed.', 'bad'); break; }
        st.body++; st.cond = null; st.rounds.push({ i: st.i, did: '' });
        var rd = st.rounds[st.rounds.length - 1];
        if (jump !== 'none') {
          st.at = 'if';
          if (st.i === 1 && jump === 'break') { rd.did = 'ended the loop with break'; st.jumped = 'break'; broke = true; push('Checking if (i == 1): i is 1, so it is true. break is executed, and control leaves the whole loop right there. Neither the println below nor the next condition check is done.', 'bad'); break; }
          if (st.i === 1) {
            rd.did = 'skipped the remaining lines with continue'; st.jumped = 'cont'; skipped = true;
            if (isFor) { push('Checking if (i == 1): i is 1, so it is true. continue is executed and skips the remaining line of this iteration (println). The loop does not end. In a for statement, control goes to the increment (i++) after the skip.', ''); st.at = 'inc'; st.i++; push('i++: Control got here by skipping with continue, but the increment of the for statement is still executed. The value of i is now ' + st.i + '. Control goes back to the condition check.'); }
            else push('Checking if (i == 1): i is 1, so it is true. continue is executed, skips all the remaining lines of the body, and goes straight back to the condition check. The skipped lines include not only println but also i++. i is still 1.', 'bad');
            continue;
          }
          push('Checking if (i == 1): i is ' + st.i + ', so it is false. ' + (jump === 'break' ? 'break' : 'continue') + ' is not executed, and control goes to the next line.');
        }
        st.at = 'print'; st.out.push(String(st.i)); rd.did = 'printed';
        push('System.out.println(i): The value of i is printed. The output is ' + st.i + '.');
        st.at = 'inc'; st.i++; st.jumped = '';
        push(isFor ? 'i++: When the body ends, the third part inside the parentheses of the for statement (the increment) is executed. The value of i is now ' + st.i + '. Control goes back to the condition check.' : 'i++: This is the last line of the body. The value of i is now ' + st.i + '. The body has ended, so control goes back to the condition check.');
      }
      if (!spin) { st.at = 'after'; st.cond = null; st.out.push('done'); st.done = true; push('System.out.println("done"): The line after the loop is executed. The body was entered ' + st.body + ' times in all.', 'good'); }
      var outText = st.out.join(', ') + (spin ? ' (never ends)' : '');
      if (spin) sum.push('In a while statement, continue goes straight back to the condition check. If i++ is below the continue, it is skipped as well, and i never changes. If the same code is written as a for statement, the increment is outside the body, so the loop ends normally. When you use continue in a while statement, change the value before the continue.');
      else {
        if (!broke) sum.push(le ? 'i <= 3 is true when i is 3 as well, so it runs one more time than i < 3. Starting from 0, i < n runs n times and i <= n runs n + 1 times. Mistakes like this, in which the count is off by one, are very common. To loop over an array with n elements, use i < n.' : 'i < 3 is true when i is 0, 1, and 2. Starting from 0 and writing i < n makes the loop run n times.' + (skipped ? ' In one of those iterations, continue skipped the output.' : ''));
        if (broke) sum.push('break immediately ends the one innermost loop (or switch) that encloses it. The loop does not run any more even if the condition is still true. Use it when you have found what you were looking for and there is no need to look further.');
        if (skipped) sum.push('continue does not end the loop. It skips only the remaining lines of the current iteration. In a for statement, the increment (i++) is executed after the skip, and the loop moves on to the next iteration. If you change the statement to while, the result is different.');
        if (jump === 'none') sum.push(isFor ? 'A for statement is a loop that gathers the initialization, the condition, and the increment on one line. The order of execution is initialization (once) → condition → body → increment → condition → ... .' : 'A while statement repeats the body while the condition is true. Its order of execution is the same as that of a for statement that does the same thing, and the only difference is that you write the line that declares the variable and the line that changes the value yourself.');
      }
      return { events: ev, summary: sum, row: [outText, spin ? 'Infinite loop' : 'Body: ' + st.body + ' times'] };
    }
    // switch
    var n = +c.val, w = this.words, arrow = c.stmt === 'swa', hasBreak = c.stmt === 'swc', names = ['case 1', 'case 2', 'case 3', 'default'];
    st = { kind: 'sw', n: null, match: null, cur: null, ran: [], fell: [], exit: null, out: [], done: false };
    st.n = n; push('int n = ' + n + ': The variable n is declared. The value of n is ' + n + '.');
    var m = n >= 1 && n <= 3 ? n - 1 : 3;
    st.match = m; st.cur = m;
    push('switch (n): The switch looks for the case whose value is equal to n. ' + (m < 3 ? 'The one that matches is case ' + n + '. Control jumps straight to it.' + (m > 0 ? ' The code of the cases above it is not executed.' : '') : 'None of case 1, case 2, and case 3 matches, so control goes to default.'));
    for (var k = m; k < 4; k++) {
      st.cur = k; st.ran.push(k); st.out.push(w[k]);
      push('System.out.println("' + w[k] + '"): The code of ' + names[k] + ' is executed. The output is ' + w[k] + '.' + (k > m ? ' It was executed even though n is ' + n + '.' : ''), k > m ? 'bad' : '');
      if (arrow) { st.exit = k; push(names[k] + ' ->: The code to the right of the arrow has finished. A switch with arrows executes only the code of the matching case and then leaves the switch. Execution does not fall through to the cases below even though no break is written.', 'good'); break; }
      if (k === 3) { st.exit = k; push('Execution has reached the closing brace of the switch. Control leaves the switch.'); break; }
      if (hasBreak) { st.exit = k; push('break: Control leaves the switch. The code of the cases below is not executed.', 'good'); break; }
      st.fell.push(k);
      push(names[k] + ' has no break at the end of its code. The switch does not stop here, and execution falls through to the code of ' + names[k + 1] + ' right below it. Whether n is equal to that case is not checked again.', 'bad');
    }
    st.cur = null; st.out.push('done'); st.done = true;
    push('System.out.println("done"): The line after the switch is executed. Number of cases executed: ' + st.ran.length + '.', st.ran.length > 1 ? 'bad' : 'good');
    if (c.stmt === 'swf') {
      if (st.ran.length > 1) { sum.push('A case is only a starting mark that says "start executing from here". It is not a partition that makes execution stop before the next case. If there is no break, everything from the matching case to the end of the switch is executed in order. This is called fall through.'); sum.push('Leaving out a break is a common mistake, and it does not cause a compile-time error. Unless you want execution to fall through on purpose, write a break in every case or use a switch with arrows.'); }
      else sum.push('No case matched, so execution started at default. default is at the very bottom and there is nowhere to fall through to, so the result is the same even without a break.');
    }
    if (c.stmt === 'swc') sum.push('When every case has a break, only the code of the one matching case is executed.');
    if (arrow) sum.push('A switch with arrows (->) executes only the code to the right of the matching case. No break is needed, so the mistake of leaving one out cannot happen. It is available from Java 14.');
    if (m === 3 && c.stmt !== 'swf') sum.push('If no case matches, default is executed. In a switch that has no default, nothing is executed and control moves on.');
    return { events: ev, summary: sum, row: [st.out.join(', '), st.ran.length + (st.ran.length === 1 ? ' case' : ' cases')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, w = this.words;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    if (s.kind === 'loop') {
      H.counters(v, [[s.checks, 'Times the condition was checked']]);
      H.table(v, ['Iteration', 'i on entry', 'What happened'], s.rounds.map(function (r, i) { return { cells: ['#' + (i + 1), String(r.i), { v: r.did || 'in progress', cls: r.did === 'printed' ? '' : r.did ? 'hot' : '' }] }; }), 'Record of entries into the body');
    } else {
      H.table(v, ['case', 'Code', 'Executed?'], ['case 1', 'case 2', 'case 3', 'default'].map(function (nm, i) { var ran = s.ran.indexOf(i) >= 0; return { cls: ran || s.match === null ? '' : 'gone', cells: [nm + (s.match === i ? ' (match)' : ''), 'println("' + w[i] + '")', { v: ran ? (i === s.match ? 'executed' : 'executed by fall through') : s.done || s.exit !== null || (s.match !== null && i < s.match) ? 'not executed' : '', cls: ran ? (i === s.match ? 'good' : 'bad') : '' }] }; }), 'n = ' + s.n);
    }
  },
  // Diagram: for a loop, a flowchart laid out from top to bottom (condition → body → increment → back to the condition), in which the box being executed now is yellow. For a switch, the cases are lined up vertically, showing where control entered and the path along which execution fell through.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, w = this.words;
    P.size(680, 300);
    if (c.stmt === 'for' || c.stmt === 'while') {
      var isFor = c.stmt === 'for', op = c.cmp === 'le' ? '<=' : '<', at = s ? s.at : '', jump = c.jump, X = 250, W = 210;
      var cls = function (name) { return at === name ? 'hot now' : 'plain'; };
      P.box('iv', 16, 16, 150, 32, { cls: s && s.i !== null ? 'wait' : 'ghost', title: 'i', right: s && s.i !== null ? String(s.i) : 'not declared' });
      P.box('cnt', 16, 56, 150, 28, { cls: 'plain', title: 'Body entered', right: (s ? s.body : 0) + '×' });
      P.box('init', X, 16, W, 28, { cls: cls('init'), title: 'int i = 0', right: isFor ? 'once at start' : '' });
      P.box('cond', X, 62, W, 32, { cls: at === 'spin' ? 'bad now' : at === 'cond' ? (s.cond ? 'hot now' : 'good now') : 'plain', title: 'i ' + op + ' 3 ?', right: s && s.cond !== null ? String(s.cond) : '' });
      if (jump !== 'none') P.box('ifb', X, 114, W, 28, { cls: at === 'if' ? (s.jumped ? 'bad now' : 'hot now') : 'plain', title: 'if (i == 1) ' + (jump === 'break' ? 'break;' : 'continue;') });
      P.box('prt', X, 160, W, 28, { cls: cls('print'), title: 'System.out.println(i)' });
      P.box('inc', X, 206, W, 28, { cls: cls('inc'), title: 'i++', right: isFor ? 'increment of the for' : 'last line of the body' });
      P.box('after', 516, 64, 148, 28, { cls: s && s.done ? 'good now' : 'plain', title: 'println("done")' });
      P.arrow('a_ic', 'init:b', 'cond:t');
      P.arrow('a_ca', 'cond:r', 'after:l', { label: 'false', cls: s && s.done && !s.jumped ? 'good' : '' });
      P.arrow('a_cb', 'cond:b', (jump !== 'none' ? 'ifb' : 'prt') + ':t');
      P.text('t_true', X + W / 2 + 8, jump !== 'none' ? 109 : 132, 'true', { cls: 'mut' });
      if (jump !== 'none') P.arrow('a_ip', 'ifb:b', 'prt:t');
      P.arrow('a_pi', 'prt:b', 'inc:t');
      P.arrow('a_back', 'inc:l:0.7', 'cond:l:0.35', { cls: 'mut' });
      P.text('t_back', 170, 196, 'back to the condition', { cls: 'mut', anchor: 'end' });
      if (jump === 'break') P.arrow('a_j', 'ifb:r', 'after:b', { label: 'break', cls: s && s.jumped === 'break' ? 'bad' : 'dash' });
      if (jump === 'cont') {
        P.arrow('a_j', 'ifb:r', isFor ? 'inc:r' : 'cond:r:0.8', { cls: s && (s.jumped === 'cont' || s.spin) ? (isFor ? 'hot' : 'bad') : 'dash' });
        P.text('t_j', 500, isFor ? 176 : 124, isFor ? 'continue: to increment' : 'continue: to condition', { cls: isFor ? 'mut' : 'bad' });
      }
      if (s && s.spin) { P.text('t_spin', 590, 170, 'i does not change,', { cls: 'bad', anchor: 'middle' }); P.text('t_spin2', 590, 188, 'repeats without end', { cls: 'bad', anchor: 'middle' }); }
      P.box('out', 16, 250, 648, 34, { cls: s && s.out.length ? (s.spin ? 'bad' : 'good') : 'ghost', title: 'Output', right: s && s.out.length ? s.out.join(', ') + (s.spin ? ' (never ends)' : '') : 'none yet' });
      P.note(isFor ? 'The moment the condition becomes false, control leaves to the right.' : 'A while statement repeats "condition → body". i++ is just one line inside the body, so when continue skips the remaining lines of the body, i++ is skipped along with them.');
      return;
    }
    var arrow = c.stmt === 'swa', hasBreak = c.stmt === 'swc', names = ['case 1', 'case 2', 'case 3', 'default'];
    P.box('nv', 16, 20, 150, 34, { cls: s ? 'wait' : 'ghost', title: 'n', right: s ? String(s.n) : 'not declared' });
    names.forEach(function (nm, i) {
      var ran = s && s.ran.indexOf(i) >= 0, cur = s && s.cur === i && ran;
      P.box('c' + i, 210, 20 + i * 46, 304, 30, { cls: cur ? (i === s.match ? 'hot now' : 'bad now') : ran ? (i === s.match ? 'good' : 'bad') : 'plain', title: nm + (arrow ? ' ->' : ':'), right: 'println("' + w[i] + '")' + (hasBreak && i < 3 ? '; break;' : '') });
      if (s && s.fell.indexOf(i) >= 0) P.arrow('fa' + i, 'c' + i + ':b', 'c' + (i + 1) + ':t', { cls: 'bad' });
    });
    if (s && s.match !== null) { P.arrow('a_in', 'nv:r', 'c' + s.match + ':l', { cls: 'hot' }); P.text('t_in', 16, 74, s.match === 3 ? 'no match: to default' : 'jump to the matching case', { cls: 'mut' }); }
    if (s && s.exit !== null) P.text('ex', 540, 40 + s.exit * 46, '→ out of switch', { cls: s.ran.length > 1 ? 'bad' : 'good' });
    P.box('after', 210, 214, 304, 28, { cls: s && s.done ? 'good now' : 'plain', title: 'System.out.println("done")' });
    P.box('out', 16, 254, 648, 34, { cls: s && s.out.length ? (s.ran.length > 1 ? 'bad' : 'good') : 'ghost', title: 'Output', right: s && s.out.length ? s.out.join(', ') : 'none yet' });
    P.note(arrow ? 'A switch with arrows enters the one case that matches n, executes only that line, and leaves. If no case matches, control goes to default.' : hasBreak ? 'A switch jumps straight to the case that matches n. When it then reaches a break, control leaves the switch. If no case matches, control goes to default.' : 'If there is no break, execution keeps falling through to the code of the cases below, as the red arrows show.');
  },
  assume: 'The output and the counts of the 24 combinations (12 loops and 12 switch statements) were checked against the result of running code with the same structure on JDK 21 in our test environment. The number of times the body was entered was obtained by putting counting code on the first line of the body in the program used for the check. For the two combinations that use continue in a while statement, it was confirmed that the real program does not end after 2 seconds and keeps repeating only the body. That the program "never ends" cannot itself be proved by execution. It is a conclusion that follows from the structure of the code, in which i does not change. The model decides that there is an infinite loop, and stops, when control comes back to the condition check with the same value of i. It was also confirmed by execution that a switch without a default executes nothing when it is given a value that matches no case. The switch with arrows has been a standard part of the language since Java 14. The do-while statement, the enhanced for statement (for-each), switch expressions that produce a value, and the labeled break are not covered.',
});
