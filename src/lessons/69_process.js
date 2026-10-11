Lab.register({
  id: 'process', nav: '프로세스와 스레드', cat: '동시성', mode: 'step',
  title: '일꾼을 늘리는 두 가지 방법',
  intro: '프로그램을 실행하면 프로세스가 하나 생기고, 그 안에서 실제로 코드를 실행하는 것이 스레드입니다. 0.3초씩 걸리는 작업 세 개를 스레드 하나로, 한 프로세스 안의 스레드 세 개로, 프로세스 세 개로 나눠 실행해 봅니다. 메모리를 함께 쓰는지와, 하나가 죽었을 때 나머지가 어떻게 되는지가 다릅니다.',
  terms: ['프로세스와 스레드', 'IPC(프로세스 간 통신)', '런타임 데이터 영역', '컨텍스트 스위칭'], ranks: ['os', 'concurrency'],
  controls: [
    { id: 'how', label: '실행 방식', type: 'select', value: 'multi', options: [['single', '프로세스 1개, 스레드 1개 (차례로 실행)'], ['multi', '프로세스 1개, 스레드 3개'], ['proc', '프로세스 3개 (각각 스레드 1개)']] },
    { id: 'fail', label: '작업 2에서 생기는 일', type: 'select', value: 'none', options: [['none', '문제 없음'], ['ex', '잡지 않은 예외가 발생'], ['kill', '프로세스 자체가 종료됨 (System.exit, 운영체제의 강제 종료 등)']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '스레드 3개. 0.3초 만에 끝나고 같은 변수를 함께 올립니다.', v: { how: 'multi', fail: 'none' } },
    { t: '스레드 하나로 차례로', d: '세 작업의 시간이 그대로 더해집니다.', v: { how: 'single', fail: 'none' } },
    { t: '프로세스 3개로', d: '동시에 끝나지만 변수는 각자 따로입니다.', v: { how: 'proc', fail: 'none' } },
    { t: '스레드 하나가 예외로 죽으면', d: '그 스레드만 끝나고 나머지는 계속합니다.', v: { how: 'multi', fail: 'ex' } },
    { t: '프로세스를 죽이는 오류', d: '스레드 3개가 한 프로세스에 있으면 함께 죽습니다.', v: { how: 'multi', fail: 'kill' } },
    { t: '같은 오류, 프로세스가 따로라면', d: '그 프로세스만 죽고 나머지는 무사합니다.', v: { how: 'proc', fail: 'kill' } },
  ],
  code: function (c) {
    var body = 'static int counter = 0;                 // 프로세스의 메모리에 있는 변수\n\nstatic void work(int id) throws Exception {\n    Thread.sleep(300);                  // 0.3초 걸리는 작업\n' + (c.fail === 'ex' ? '    if (id == 2) throw new IllegalStateException();\n' : c.fail === 'kill' ? '    if (id == 2) System.exit(3);        // 프로세스 전체를 끝낸다\n' : '') + '    counter++;\n}\n\n';
    if (c.how === 'single') return body + '// 스레드 하나(main)가 차례로\nfor (int i = 1; i <= 3; i++) work(i);';
    if (c.how === 'multi') return body + '// 같은 프로세스 안에 스레드 3개\nfor (int i = 1; i <= 3; i++) {\n    int id = i;\n    new Thread(() -> work(id)).start();\n}';
    return body + '// 프로세스 3개: 같은 프로그램을 따로따로 실행\nfor (int i = 1; i <= 3; i++) {\n    new ProcessBuilder("java", "Worker", String.valueOf(i)).start();\n}';
  },
  label: function (c) { return { single: '스레드 1개', multi: '스레드 3개', proc: '프로세스 3개' }[c.how] + ' · 작업 2 ' + { none: '정상', ex: '예외', kill: '프로세스 종료 오류' }[c.fail]; },
  columns: ['끝난 작업', '걸린 시간', 'counter 값', '작업 2의 문제가 번진 범위'],
  simulate: function (c) {
    var H = c.how, F = c.fail, ev = [], sum = [], units, done = 0, time, cnt, spread = '없음';
    var P = H === 'proc' ? [1, 2, 3].map(function (i) { return { p: '프로세스 ' + i, mem: 0, th: [{ id: i, st: '대기' }], alive: true }; }) : [{ p: '프로세스 1', mem: 0, th: (H === 'single' ? [{ id: 0, st: '대기', name: 'main 스레드' }] : [1, 2, 3].map(function (i) { return { id: i, st: '대기' }; })), alive: true }];
    function snap() { return JSON.parse(JSON.stringify(P)); }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    push(H === 'proc' ? '같은 프로그램을 세 번 실행해 프로세스 3개를 만듭니다. 운영체제는 프로세스마다 메모리를 따로 내줍니다. counter 변수도 프로세스마다 하나씩, 모두 세 개가 생깁니다.' : '프로그램을 실행해 프로세스 1개를 만듭니다. 운영체제가 이 프로세스에 메모리를 내주고, counter 변수는 그 안에 하나 있습니다.' + (H === 'multi' ? ' 그 안에서 스레드 3개를 만듭니다. 스레드는 실행 흐름(스택)만 각자 가지고, 프로세스의 메모리는 함께 씁니다.' : ' 스레드는 main 하나뿐입니다.'), '');
    if (H === 'single') {
      var th = P[0].th[0], stopped = false;
      for (var i = 1; i <= 3; i++) {
        th.st = '작업 ' + i + ' 실행 중'; push('main 스레드가 ' + i + '번째 작업을 시작합니다. 스레드가 하나라서 앞의 작업이 끝나야 다음 작업을 할 수 있습니다.', '');
        if (i === 2 && F === 'ex') { th.st = '예외로 종료'; P[0].alive = false; stopped = true; spread = '남은 작업 3도 실행되지 않음'; push('작업 2에서 예외가 발생했는데 잡지 않았습니다. 하나뿐인 스레드가 끝나고, 실행할 스레드가 남지 않아 프로그램이 종료됩니다. 작업 3은 시작도 못 했습니다.', 'bad'); break; }
        if (i === 2 && F === 'kill') { th.st = '종료됨'; P[0].alive = false; stopped = true; spread = '프로세스 전체'; push('작업 2가 프로세스를 죽였습니다. 프로세스가 사라지면 그 안의 메모리와 스레드도 모두 사라집니다.', 'bad'); break; }
        P[0].mem++; done++; push('작업 ' + i + ' 완료. counter는 ' + P[0].mem + '입니다.', 'good');
      }
      if (!stopped) th.st = '모두 끝냄';
      time = F === 'none' ? '0.9초' : '0.6초 (중단)'; cnt = F === 'none' ? String(P[0].mem) : '사라짐';
    }
    if (H === 'multi') {
      P[0].th.forEach(function (t) { t.st = '작업 ' + t.id + ' 실행 중'; }); push('스레드 3개가 각자 작업을 하나씩 맡아 동시에 시작합니다. 서로 기다리지 않습니다.', '');
      if (F === 'kill') { P[0].alive = false; P[0].th.forEach(function (t) { t.st = '종료됨'; }); spread = '프로세스 전체 (스레드 3개 모두)'; push('스레드 2의 작업이 프로세스를 죽였습니다. 스레드 1과 3은 아무 잘못이 없지만 같은 프로세스에 있었기 때문에 함께 사라집니다. 하던 일도, 메모리의 counter도 없어집니다.', 'bad'); time = '0.3초 (전부 중단)'; cnt = '사라짐'; }
      else {
        if (F === 'ex') { P[0].th[1].st = '예외로 종료'; spread = '스레드 2 하나'; push('스레드 2에서 잡지 않은 예외가 발생했습니다. 그 스레드만 끝납니다. 프로세스와 다른 스레드는 그대로 살아 있습니다.', 'bad'); }
        P[0].th.forEach(function (t) { if (t.st.indexOf('실행 중') >= 0) { P[0].mem++; done++; t.st = '작업 ' + t.id + ' 완료'; } });
        push('남은 스레드들이 작업을 끝내고 같은 counter를 올립니다. counter는 ' + P[0].mem + '입니다. 변수 하나를 여럿이 함께 쓰는 것이므로, 동시에 건드릴 때의 문제는 따로 막아야 합니다(다음 개념인 경쟁 상태).', 'good'); time = '0.3초'; cnt = String(P[0].mem);
      }
    }
    if (H === 'proc') {
      P.forEach(function (p) { p.th[0].st = '작업 ' + p.th[0].id + ' 실행 중'; }); push('프로세스 3개가 각자 작업을 하나씩 동시에 실행합니다.', '');
      if (F !== 'none') { P[1].alive = false; P[1].th[0].st = F === 'ex' ? '예외로 종료' : '종료됨'; spread = '프로세스 2 하나'; push('프로세스 2가 ' + (F === 'ex' ? '예외로' : '오류로') + ' 죽었습니다. 프로세스 1과 3은 메모리가 완전히 분리돼 있어서 아무 영향도 받지 않습니다.', 'bad'); }
      P.forEach(function (p) { if (p.alive) { p.mem = 1; done++; p.th[0].st = '작업 ' + p.th[0].id + ' 완료'; } });
      push('살아 있는 프로세스들이 작업을 끝내고 각자의 counter를 올립니다. 프로세스마다 counter가 1입니다. 서로의 변수를 볼 수 없으므로 합계를 알려면 파일, 소켓, 메시지 같은 별도의 통로로 주고받아야 합니다.', 'good'); time = '0.3초'; cnt = '프로세스마다 1 (합쳐지지 않음)';
    }
    sum.push('작업 3개 중 ' + done + '개 완료, ' + time + '. counter: ' + cnt + '.');
    if (H === 'single') sum.push('스레드가 하나면 한 번에 한 가지 일만 합니다. 단순하고 안전하지만 시간이 그대로 더해집니다.');
    if (H === 'multi') sum.push('스레드는 같은 프로세스의 메모리를 함께 씁니다. 만들기 가볍고 데이터를 주고받기 쉽지만, 같은 데이터를 동시에 건드리는 문제가 생기고, 프로세스가 죽으면 모든 스레드가 함께 죽습니다. 웹 서버(톰캣)가 요청마다 스레드를 쓰는 것이 이 방식입니다.');
    if (H === 'proc') sum.push('프로세스는 메모리가 분리돼 있어 하나가 죽어도 다른 것에 번지지 않습니다. 대신 만들고 전환하는 비용이 크고 메모리를 각자 쓰며, 데이터를 나누려면 프로세스 간 통신이 필요합니다. 서버를 여러 대(여러 프로세스)로 띄우는 것이 이 방식의 확장입니다.');
    if (F === 'ex' && H !== 'proc') sum.push('잡지 않은 예외는 그 스레드 하나를 끝냅니다. 프로세스는 데몬이 아닌 다른 스레드가 남아 있는 한 계속 실행됩니다.');
    return { events: ev, summary: sum, row: [done + '개', time, cnt, spread] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], P = last ? last.snap : [];
    if (!P.length) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    P.forEach(function (p) {
      H.title(v, p.p + (p.alive ? '' : ' (종료됨)') + ' · 메모리의 counter = ' + (p.alive ? p.mem : '사라짐'));
      var ln = H.lanes(v);
      p.th.forEach(function (th) { H.lane(ln, th.name || '스레드 ' + th.id, th.st, th.st.indexOf('완료') >= 0 || th.st === '모두 끝냄' ? 'good' : th.st.indexOf('종료') >= 0 ? 'bad' : th.st === '대기' ? 'none' : 'hot'); });
    });
    H.text(v, '같은 프로세스 제목 아래에 있는 스레드들은 그 프로세스의 메모리(counter)를 함께 씁니다.');
  },
  // 그림: 프로세스는 메모리를 가진 큰 상자, 스레드는 그 안의 작은 상자. 한 프로세스의 스레드들은 같은 메모리를 가리킨다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], procs = last ? last.snap : [], n = procs.length;
    P.size(680, 300);
    if (!n) { P.region('p0', 16, 16, 648, 268, '프로세스'); P.text('hint', 340, 150, '실행을 누르면 시작합니다', { cls: 'mut', anchor: 'middle' }); return; }
    procs.forEach(function (p, i) {
      var x = n === 1 ? 16 : 16 + i * 222, w = n === 1 ? 648 : 204, tw = n === 1 ? 196 : w - 24, k = p.th.length;
      P.region('p' + i, x, 16, w, 268, p.p + (p.alive ? '' : ' (종료됨)'));
      P.box('m' + i, x + 12, 52, w - 24, 44, { cls: p.alive ? 'good' : 'ghost', title: n === 1 ? '이 프로세스의 메모리 (힙)' : '메모리', right: p.alive ? 'counter = ' + p.mem : '사라짐' });
      p.th.forEach(function (th, j) {
        var tx = n === 1 ? (k === 1 ? 242 : 28 + j * 214) : x + 12, id = 't' + i + '_' + j, st = th.st;
        P.box(id, tx, 160, tw, 60, { cls: st.indexOf('완료') >= 0 || st === '모두 끝냄' ? 'good' : st.indexOf('종료') >= 0 ? 'bad' : st === '대기' ? 'plain' : 'hot', title: th.name || '스레드 ' + th.id, sub: [st, '자기 스택을 따로 가짐'] });
        if (p.alive && st.indexOf('종료') < 0) P.arrow('a' + i + '_' + j, id + ':t', 'm' + i + ':b:' + (k === 1 ? 0.5 : 0.2 + j * 0.3), { cls: 'mut' });
      });
    });
    P.note('점선 상자 하나가 프로세스입니다. 화살표는 스레드가 그 프로세스의 메모리를 쓴다는 뜻이며, 한 프로세스 안의 스레드들은 같은 메모리(counter)를 함께 씁니다. 프로세스가 다르면 메모리도 따로입니다.');
  },
  assume: '아홉 가지 조합을 이 PC의 JDK 21에서 실제로 실행해 확인했습니다. 스레드 3개는 0.3초, 스레드 1개는 0.9초가 걸렸고, 스레드들은 같은 counter를 3까지 올린 반면 프로세스 3개는 각자 1이었습니다. 예외는 해당 스레드만 끝냈고, System.exit는 같은 프로세스의 모든 스레드를 끝냈으며, 프로세스가 따로일 때는 죽은 프로세스 외에는 정상 종료했습니다. 프로세스를 만드는 데 드는 시간과 메모리는 화면에 넣지 않았습니다(실제로는 JVM을 새로 띄우는 만큼 훨씬 큽니다).',
});
