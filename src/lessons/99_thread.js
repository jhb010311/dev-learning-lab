Lab.register({
  id: 'thread', nav: '스레드의 생성과 상태', cat: '동시성', mode: 'step',
  title: 'run()을 직접 부르면 왜 새 스레드가 생기지 않나',
  intro: 'Thread 객체를 만드는 것과 스레드가 실제로 실행되는 것은 다른 일입니다. 스레드 하나가 만들어져서 끝날 때까지 어떤 상태를 거치는지를 t.getState()로 따라가 봅니다.',
  terms: ['프로세스와 스레드', '스레드의 상태', 'start()와 run()', 'join()', '인터럽트(interrupt)'],
  controls: [
    { id: 'call', label: '스레드를 실행시키는 방법', type: 'select', value: 'run', options: [['start', 't.start()'], ['run', 't.run()을 직접 호출'], ['twice', 't.start() 뒤, 끝나고 나서 한 번 더 t.start()']] },
    { id: 'work', label: '작업(task)이 하는 일', type: 'select', value: 'sleep', options: [['quick', '이름만 출력하고 바로 끝남'], ['sleep', 'Thread.sleep(1000)으로 1초 쉬기'], ['join', 'helper.join()으로 다른 스레드가 끝나기를 기다리기'], ['lock', 'main이 쥐고 있는 lock 얻기']] },
    { id: 'intr', label: '중간에 main이 t.interrupt()를 호출', type: 'check', value: false, hint: 'interrupt는 기다리고 있는 스레드에게 그만 기다리라고 보내는 신호입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'Thread.sleep(1000) 작업을 t.run() 직접 호출로 실행하면 어느 스레드가 실행하고 t는 어떤 상태가 되나', d: 'run()을 직접 호출합니다. 작업은 실행되지만 실행한 스레드는 main이고, t는 끝까지 NEW입니다.', v: { call: 'run', work: 'sleep', intr: false } },
    { t: 'start()로 시작', q: 't.run() 직접 호출 대신 t.start()를 호출하면', d: '새 스레드 worker가 작업을 실행하고, 쉬는 동안 TIMED_WAITING입니다.', v: { call: 'start', work: 'sleep', intr: false } },
    { t: 'join으로 기다리는 스레드', q: 't.start()로 시작했는데 작업이 helper.join()으로 다른 스레드가 끝나기를 기다리면', d: '다른 스레드가 끝나기를 기한 없이 기다리면 WAITING입니다.', v: { call: 'start', work: 'join', intr: false } },
    { t: 'lock을 기다리는 스레드', q: 't.start()로 시작했는데 작업이 main이 쥐고 있는 lock을 얻으려 하면', d: '다른 스레드가 쥔 lock 앞에서 막히면 BLOCKED입니다.', v: { call: 'start', work: 'lock', intr: false } },
    { t: '쉬는 스레드에 interrupt', q: 't.start()로 시작했는데 쉬는 동안 main이 t.interrupt()를 호출하면', d: 'sleep이 InterruptedException을 던지며 바로 깨어납니다.', v: { call: 'start', work: 'sleep', intr: true } },
    { t: 'lock을 기다리는 스레드에 interrupt', q: 't.start()로 시작한 작업이 main이 쥐고 있는 lock을 얻으려는데 main이 t.interrupt()를 호출하면', d: '깨어나지 않습니다. 표시만 남습니다.', v: { call: 'start', work: 'lock', intr: true } },
    { t: '끝난 스레드를 다시 start()', q: '이름만 출력하고 바로 끝나는 작업을 t.start()로 실행한 뒤, 끝나고 나서 한 번 더 t.start()를 호출하면', d: 'IllegalThreadStateException이 발생합니다.', v: { call: 'twice', work: 'quick', intr: false } },
  ],
  code: function (c) {
    var W = c.work, s = '';
    if (W === 'lock') s += 'Object lock = new Object();\n';
    if (W === 'join') s += 'Thread helper = new Thread(() -> {             // 0.5초 뒤에 끝나는 다른 스레드\n    try { Thread.sleep(500); } catch (InterruptedException e) { }\n}, "helper");\n';
    if (s) s += '\n';
    s += 'Runnable task = () -> {\n    System.out.println(Thread.currentThread().getName());   // 이 줄을 실행하는 스레드의 이름\n';
    if (W === 'sleep' || W === 'join') s += '    try {\n        ' + (W === 'sleep' ? 'Thread.sleep(1000);                 // 1초 동안 쉰다' : 'helper.join();                      // helper가 끝날 때까지 기다린다') + '\n    } catch (InterruptedException e) {\n        System.out.println("InterruptedException");\n    }\n';
    if (W === 'lock') s += '    synchronized (lock) { }                 // lock을 얻어야 지나갈 수 있다\n';
    s += '};\n\nThread t = new Thread(task, "worker");\nSystem.out.println(t.getState());\n\n';
    if (W === 'join') s += 'helper.start();\n';
    var in_ = W === 'lock' ? '    ' : '';
    if (W === 'lock') s += 'synchronized (lock) {                       // main이 먼저 lock을 쥔다\n';
    function cm(code, note) { code = in_ + code; while (code.length < 44) code += ' '; return code + '// ' + note + '\n'; }
    s += c.call === 'run' ? cm('t.run();', '메서드를 직접 호출') : cm('t.start();', '새 스레드에서 실행');
    s += cm('Thread.sleep(100);', '작업이 진행되도록 잠깐 기다린다');
    s += in_ + 'System.out.println(t.getState());\n';
    if (c.intr) s += in_ + 't.interrupt();\n';
    if (W === 'lock') s += '}                                           // 여기서 lock을 놓는다\n';
    s += 't.join();                                   // t가 끝날 때까지 기다린다\nSystem.out.println(t.getState());';
    if (c.call === 'twice') s += '\n\nt.start();                                  // 끝난 스레드를 다시 시작해 본다';
    return s;
  },
  label: function (c) { return { start: 'start()', run: 'run() 직접 호출', twice: 'start() 두 번' }[c.call] + ' · ' + { quick: '바로 끝나는 작업', sleep: 'sleep', join: 'join', lock: 'lock 기다림' }[c.work] + (c.intr ? ' · interrupt' : ''); },
  columns: ['작업을 실행한 스레드', '중간에 본 t의 상태', 'interrupt의 결과', 'join 뒤 t의 상태', '다시 start()'],
  simulate: function (c) {
    var W = c.work, started = c.call !== 'run', intr = !!c.intr, ev = [], sum = [];
    var waitSt = { quick: '', sleep: 'TIMED_WAITING', join: 'WAITING', lock: 'BLOCKED' }[W];
    var doing = { sleep: '쉬고', join: 'helper를 기다리고', lock: 'lock을 기다리고' }[W];
    var st = { t: '', main: '시작', worker: '', helper: '', lockBy: '', ran: '?', mid: '?', ir: '?', after: '?', again: '?', ex: [] };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    st.t = 'NEW'; st.main = 'Thread 객체 t를 만듦';
    push('new Thread(task, "worker"): Thread 객체 t를 만듭니다. 아직 객체만 있을 뿐이고, 새 실행 흐름(스레드)은 시작되지 않았습니다. 그래서 t.getState()는 NEW입니다.');
    if (W === 'join') { st.helper = '실행 중 (0.5초 뒤에 끝남)'; st.main = 'helper를 시작함'; push('helper.start(): 0.5초 뒤에 끝나는 다른 스레드 helper를 먼저 시작해 둡니다. 작업이 "끝나기를 기다릴 상대"입니다.'); }
    if (W === 'lock') { st.lockBy = 'main'; st.main = 'lock을 쥠'; push('synchronized (lock) {: main 스레드가 lock을 쥡니다. main이 이 블록을 나갈 때까지 다른 스레드는 이 lock을 얻지 못합니다.'); }
    if (started) {
      st.t = 'RUNNABLE'; st.worker = 'task를 실행하기 시작'; st.main = '기다리지 않고 다음 줄로';
      push('t.start(): 새 스레드를 만들어 달라고 요청합니다. 새 스레드 worker가 생겨 task를 실행하기 시작하고, t의 상태는 RUNNABLE(실행할 수 있음)이 됩니다. main은 작업이 끝나기를 기다리지 않고 바로 다음 줄로 갑니다.', 'good');
      st.ran = 'worker'; st.worker = 'task의 첫 줄 실행';
      push('Thread.currentThread().getName(): task의 첫 줄을 실행하는 스레드의 이름은 worker입니다. start()가 만든 새 스레드가 task를 실행하고 있습니다.', 'good');
      if (W === 'quick') { st.t = 'TERMINATED'; st.worker = '끝남'; push('task의 끝: 실행할 코드가 더 없으므로 worker 스레드가 끝납니다. t의 상태는 TERMINATED가 됩니다.'); }
      if (W === 'sleep') { st.t = 'TIMED_WAITING'; st.worker = 'sleep(1000)으로 쉬는 중'; push('Thread.sleep(1000): worker가 1초 동안 쉽니다. 정해 둔 시간이 지나면 저절로 깨어나는 기다림이라서 상태는 TIMED_WAITING입니다.'); }
      if (W === 'join') { st.t = 'WAITING'; st.worker = 'helper가 끝나기를 기다리는 중'; push('helper.join(): worker가 helper 스레드가 끝날 때까지 기다립니다. 기한을 정하지 않은 기다림이라서 상태는 WAITING입니다.'); }
      if (W === 'lock') { st.t = 'BLOCKED'; st.worker = 'lock 앞에서 막혀 있음'; push('synchronized (lock): worker가 lock을 얻으려 하지만 main이 쥐고 있습니다. lock이 풀릴 때까지 들어가지 못하고 막혀 있는 이 상태가 BLOCKED입니다.'); }
    } else {
      st.main = 'task를 직접 실행하는 중';
      push('t.run(): run()은 보통의 메서드 호출입니다. 새 스레드는 만들어지지 않고, main 스레드가 task의 코드를 직접 실행합니다. t의 상태는 NEW 그대로입니다.', 'bad');
      st.ran = 'main';
      push('Thread.currentThread().getName(): task의 첫 줄을 실행하는 스레드의 이름은 main입니다. worker라는 이름의 스레드는 생긴 적이 없습니다.', 'bad');
      if (W === 'quick') { st.main = 't.run()에서 돌아옴'; push('task의 끝: 실행할 코드가 더 없으므로 t.run()이 돌아옵니다. 메서드 하나를 부르고 돌아온 것과 같습니다.'); }
      if (W === 'sleep') { st.main = '직접 1초 쉬고 돌아옴'; push('Thread.sleep(1000): main 스레드가 직접 1초 동안 쉽니다. 그동안 main은 t.run() 안에 머물러 다음 줄로 가지 못합니다. 1초 뒤에 task가 끝나고 t.run()이 돌아옵니다.'); }
      if (W === 'join') { st.main = '직접 helper를 기다리고 돌아옴'; st.helper = '끝남'; push('helper.join(): main 스레드가 직접 helper가 끝나기를 기다립니다. helper가 끝나면 task도 끝나고 t.run()이 돌아옵니다.'); }
      if (W === 'lock') { st.main = 'lock을 쥔 채 task를 끝냄'; push('synchronized (lock): 이 lock은 지금 task를 실행하는 main 스레드가 이미 쥐고 있습니다. 같은 스레드는 자기가 쥔 lock에 다시 들어갈 수 있으므로 막히지 않고 지나갑니다. task가 끝나고 t.run()이 돌아옵니다.'); }
    }
    st.mid = started ? (waitSt || 'TERMINATED') : 'NEW'; st.main = 't.getState()로 상태를 확인';
    if (started) push('Thread.sleep(100) 뒤 t.getState(): main이 잠깐 기다렸다가 t의 상태를 봅니다. ' + (W === 'quick' ? '작업이 이미 끝났으므로 TERMINATED입니다.' : 'worker가 ' + doing + ' 있으므로 ' + waitSt + '입니다.'));
    else push('Thread.sleep(100) 뒤 t.getState(): t는 start()가 불린 적이 없으므로 여전히 NEW입니다. 작업은 실행됐지만 t라는 스레드가 실행한 것이 아닙니다.', 'bad');
    var ie = started && intr && (W === 'sleep' || W === 'join');
    if (!intr) st.ir = '부르지 않음';
    else if (ie) {
      st.ir = 'InterruptedException'; st.ex.push('InterruptedException'); st.t = 'RUNNABLE'; st.worker = '깨어나서 catch 블록 실행'; st.main = 't.interrupt()를 호출';
      push('t.interrupt(): main이 worker에게 그만 기다리라는 신호를 보냅니다. ' + (W === 'sleep' ? 'sleep으로 쉬던' : 'join으로 기다리던') + ' worker는 곧바로 깨어나고, ' + (W === 'sleep' ? 'Thread.sleep' : 'helper.join') + '이 InterruptedException을 던집니다. worker는 RUNNABLE로 돌아와 catch 블록을 실행합니다.', 'bad');
      st.t = 'TERMINATED'; st.worker = '끝남';
      push('task의 끝: catch 블록까지 실행한 worker가 끝납니다. ' + (W === 'sleep' ? '1초를 다 채우지 않고' : 'helper가 끝나기를 기다리지 않고') + ' 끝났습니다. t의 상태는 TERMINATED가 됩니다.');
    } else if (started && W === 'lock') {
      st.ir = '예외 없음 (표시만 남음)'; st.worker = 'lock 앞에서 막혀 있음 (interrupt 표시 켜짐)'; st.main = 't.interrupt()를 호출';
      push('t.interrupt(): main이 신호를 보내지만, lock을 기다리는 BLOCKED 상태의 스레드는 interrupt로 깨어나지 않습니다. 예외도 생기지 않습니다. "interrupt를 받았다"는 표시만 켜진 채 계속 lock을 기다립니다.', 'bad');
    } else {
      st.ir = '아무 일 없음'; st.main = 't.interrupt()를 호출';
      push(started ? 't.interrupt(): 이미 끝난 스레드에 보낸 신호입니다. 깨울 대상이 없으므로 예외가 생기지 않고, 달라지는 것이 없습니다.' : 't.interrupt(): t는 시작된 적이 없고, 작업은 main이 이미 끝까지 실행했습니다. 기다리던 스레드가 없으므로 InterruptedException은 생기지 않습니다.');
    }
    if (W === 'lock') {
      st.lockBy = ''; st.main = 'lock을 놓음';
      if (started) { st.t = 'RUNNABLE'; st.worker = 'lock을 얻어 다시 실행'; }
      push('}: main이 synchronized 블록을 나가며 lock을 놓습니다.' + (started ? ' 기다리던 worker가 lock을 얻어 BLOCKED에서 RUNNABLE로 돌아옵니다.' : ''));
    }
    if (!started) { st.main = 'join()에서 바로 돌아옴'; push('t.join(): 시작된 적이 없는 스레드는 기다릴 것이 없으므로 join()은 바로 돌아옵니다.'); }
    else if (st.t === 'TERMINATED') { st.main = 'join()에서 바로 돌아옴'; push('t.join(): t가 이미 끝났으므로 기다리지 않고 바로 돌아옵니다.'); }
    else {
      st.t = 'TERMINATED'; st.worker = '끝남'; st.main = 'join()에서 기다렸다가 돌아옴'; if (W === 'join') st.helper = '끝남';
      push('t.join(): main이 t가 끝날 때까지 여기서 기다립니다. ' + (W === 'sleep' ? '1초가 지나 worker가 깨어나 RUNNABLE로 돌아오고, 남은 코드를 실행한 뒤 끝납니다.' : W === 'join' ? 'helper가 끝나자 worker가 깨어나 RUNNABLE로 돌아오고, 남은 코드를 실행한 뒤 끝납니다.' : 'worker가 남은 코드를 실행하고 끝납니다.') + ' t의 상태가 TERMINATED가 되고, 그제야 join()이 돌아옵니다.', 'good');
    }
    st.after = started ? 'TERMINATED' : 'NEW'; st.main = 't.getState()로 상태를 확인';
    push(started ? 't.getState(): TERMINATED입니다. 한 번 끝난 스레드는 다른 상태로 돌아가지 않습니다.' : 't.getState(): 마지막까지 NEW입니다. task는 실행됐지만 t는 한 번도 시작되지 않았습니다.', started ? 'good' : 'bad');
    if (c.call === 'twice') {
      st.again = 'IllegalThreadStateException'; st.ex.push('IllegalThreadStateException'); st.main = '두 번째 t.start()에서 예외';
      push('t.start() (두 번째): 스레드는 한 번만 시작할 수 있습니다. 끝난 뒤에도 다시 시작할 수 없어서 IllegalThreadStateException이 발생합니다. 같은 작업을 다시 실행하려면 Thread 객체를 새로 만들어야 합니다.', 'bad');
    } else st.again = '부르지 않음';
    if (!started) sum.push('run()을 직접 부르면 스레드가 늘어나지 않습니다. 부른 스레드가 그 코드를 순서대로 실행할 뿐이라서 동시에 실행되는 것이 없습니다. 새 스레드에서 실행하려면 start()를 부릅니다. start()가 새 스레드를 만들고, 그 스레드가 run()을 실행합니다.');
    else {
      if (W === 'quick') sum.push('스레드는 NEW에서 시작해 start()로 RUNNABLE이 되고, run()의 코드가 끝나면 TERMINATED가 됩니다.');
      if (W === 'sleep') sum.push('시간을 정해 두고 기다리는 스레드는 TIMED_WAITING입니다. Thread.sleep(시간)이 대표적입니다. 시간이 지나면 RUNNABLE로 돌아옵니다.');
      if (W === 'join') sum.push('기한 없이 다른 쪽의 일이 끝나기를 기다리는 스레드는 WAITING입니다. join()은 상대 스레드가 끝날 때까지 부른 쪽을 멈춰 세웁니다. main이 t.join()으로 기다리는 동안에는 main의 상태도 WAITING입니다.');
      if (W === 'lock') sum.push('다른 스레드가 쥔 lock을 얻으려고 synchronized 앞에서 막힌 스레드는 BLOCKED입니다. lock을 쥔 쪽이 놓아야 RUNNABLE로 돌아옵니다.');
      if (ie) sum.push('sleep이나 join으로 기다리던 스레드는 interrupt를 받으면 InterruptedException과 함께 바로 깨어납니다. 오래 기다리는 작업을 중간에 멈추게 하는 방법이며, 그래서 이런 메서드를 쓸 때는 InterruptedException을 처리하는 코드를 적어야 합니다.');
      else if (intr && W === 'lock') sum.push('interrupt는 스레드를 강제로 멈추는 것이 아니라 신호를 보내는 것입니다. sleep, join처럼 InterruptedException을 던지는 기다림은 그 신호로 깨어나지만, synchronized의 lock을 기다리는 스레드는 깨어나지 않습니다.');
      else if (intr) sum.push('이미 끝난 스레드에 보낸 interrupt는 아무 일도 일으키지 않습니다.');
    }
    if (c.call === 'twice') sum.push('Thread 객체는 한 번만 시작할 수 있습니다. 실행 중일 때 다시 불러도, 끝난 뒤에 불러도 IllegalThreadStateException입니다.');
    return { events: ev, summary: sum, row: [st.ran, st.mid, st.ir, st.after, st.again] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    var ln = c.work === 'join' || c.work === 'lock' ? H.lanes(v) : null;
    if (c.work === 'join') H.lane(ln, 'helper', s.helper || '아직 시작 전', !s.helper ? 'none' : s.helper === '끝남' ? 'good' : 'hot');
    if (c.work === 'lock') H.lane(ln, 'lock', s.lockBy ? s.lockBy + ' 스레드가 쥐고 있음' : '아무도 쥐고 있지 않음', s.lockBy ? 'wait' : 'none');
    H.table(v, ['확인한 것', '결과'], [
      { cells: ['중간에 본 t.getState()', { v: s.mid, cls: s.mid === '?' ? '' : s.mid === 'NEW' ? 'bad' : 'hot' }] },
      { cells: ['t.interrupt()의 결과', { v: s.ir, cls: s.ir === 'InterruptedException' ? 'bad' : '' }] },
      { cells: ['다시 start()', { v: s.again, cls: s.again === 'IllegalThreadStateException' ? 'bad' : '' }] },
    ], '지금까지의 결과');
  },
  // 그림: 위에는 스레드가 가질 수 있는 여섯 상태와 지금 t가 있는 자리, 아래에는 main과 worker가 각각 하고 있는 일.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { t: '', main: '아직 시작 전', worker: '', ran: '?', mid: '?', ir: '?', after: '?', again: '?', ex: [] };
    var wname = { quick: '', sleep: 'TIMED_WAITING', join: 'WAITING', lock: 'BLOCKED' }[c.work];
    function cls(name) { return s.t === name ? 'hot now' : 'plain'; }
    P.size(680, 344);
    P.region('sr', 16, 16, 648, 148, 't의 상태 (t.getState()가 돌려주는 값)');
    P.box('s_new', 34, 62, 104, 34, { cls: cls('NEW'), title: 'NEW', center: true });
    P.box('s_run', 220, 62, 124, 34, { cls: cls('RUNNABLE'), title: 'RUNNABLE', center: true });
    P.box('s_term', 220, 120, 124, 32, { cls: s.t === 'TERMINATED' ? 'good now' : 'plain', title: 'TERMINATED', center: true });
    P.box('s_tw', 456, 44, 190, 30, { cls: cls('TIMED_WAITING'), title: 'TIMED_WAITING', right: 'sleep' });
    P.box('s_w', 456, 82, 190, 30, { cls: cls('WAITING'), title: 'WAITING', right: 'join' });
    P.box('s_b', 456, 120, 190, 30, { cls: cls('BLOCKED'), title: 'BLOCKED', right: 'lock' });
    P.arrow('a_start', 's_new:r', 's_run:l', { label: 'start()', cls: s.t && s.t !== 'NEW' ? 'good' : 'mut' });
    P.arrow('a_end', 's_run:b', 's_term:t', { cls: s.t === 'TERMINATED' ? 'good' : 'mut' }); P.text('t_end', 290, 113, 'run() 끝', { cls: s.t === 'TERMINATED' ? '' : 'mut' });
    if (wname) P.arrow('a_wait', 's_run:r', { TIMED_WAITING: 's_tw', WAITING: 's_w', BLOCKED: 's_b' }[wname] + ':l', { label: '기다림', cls: s.t === wname ? 'hot' : 'mut' });
    P.box('m', 16, 180, 320, 56, { cls: 'hot', title: 'main 스레드', sub: s.main });
    P.box('w', 344, 180, 320, 56, s.worker ? { cls: s.worker === '끝남' ? 'good' : s.t === 'RUNNABLE' ? 'hot' : 'wait', title: 'worker 스레드', sub: s.worker } : { cls: 'ghost', title: 'worker 스레드', sub: c.call === 'run' && s.ran === 'main' ? '만들어지지 않음' : '아직 없음' });
    P.box('r1', 16, 250, 320, 34, { cls: s.ran === '?' ? 'ghost' : s.ran === 'worker' ? 'good' : 'bad', title: '작업을 실행한 스레드', right: s.ran });
    P.box('r2', 344, 250, 320, 34, { cls: s.after === '?' ? 'ghost' : s.after === 'TERMINATED' ? 'good' : 'bad', title: 'join 뒤 t의 상태', right: s.after });
    P.box('r3', 16, 294, 648, 34, { cls: s.ex.length ? 'bad' : 'ghost', title: '발생한 예외', right: s.ex.length ? s.ex.join(', ') : '없음' });
    P.note('굵은 테두리가 지금 t의 상태입니다.');
  },
  assume: '스물네 가지 조합의 결과(작업을 실행한 스레드 이름, 중간과 마지막의 t.getState(), 발생한 예외, 작업이 끝날 때의 interrupt 표시)를 검증 환경의 JDK 21에서 실행한 결과와 대조했습니다. 화면의 코드는 main이 Thread.sleep(100)으로 잠깐 기다린 뒤 상태를 보지만, 이 100밀리초는 "대개 충분한" 시간일 뿐 보장된 것이 아닙니다. 대조할 때는 시간에 기대지 않도록 t의 상태가 RUNNABLE을 벗어나 그대로 머무를 때까지 되풀이해 확인했습니다. start() 바로 뒤에 t.getState()를 부르면 RUNNABLE일 수도, 이미 다른 상태일 수도 있어서 결과로 삼지 않았습니다. RUNNABLE은 "실행 중"과 "CPU 차례를 기다리는 중"을 구분하지 않으며, 자바는 이 둘을 따로 알려 주지 않습니다. WAITING은 join 말고도 Object.wait()나 LockSupport.park()로도 생기지만 여기서는 join만 다뤘습니다. 여러 스레드가 함께 쓰는 데이터의 문제는 "경쟁 상태" 실습에서, 스레드를 미리 만들어 두고 다시 쓰는 방법은 "스레드 풀" 실습에서 다룹니다.',
});
