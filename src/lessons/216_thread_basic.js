Lab.register({
  id: 'thread_basic', nav: '스레드', cat: '기초개념', mode: 'step', basic: true, deep: ['thread'],
  title: '스레드는 무엇이고, start()는 무엇을 하는가',
  why: '실행 흐름이 하나뿐이면 파일 내려받기나 다른 서버의 응답 기다리기처럼 오래 걸리는 일을 하는 동안, 다른 일은 모두 그 일이 끝나기를 기다려야 한다. 스레드는 한 프로그램이 실행 흐름을 여러 개 갖게 해서, 한 흐름이 기다리거나 오래 걸리는 일을 하는 동안 다른 흐름이 다른 일을 하게 한다.',
  use: '스프링 부트가 기본으로 쓰는 톰캣은 들어온 요청 하나를 스레드 하나가 맡아 처리하게 해서 여러 사용자의 요청을 함께 처리하므로, 우리가 Thread를 만들지 않아도 우리가 쓴 코드가 여러 스레드에서 실행된다. 일을 따로 돌리려고 스레드를 직접 다룰 때도 new Thread보다, 만들어 둔 스레드를 다시 쓰는 ExecutorService를 주로 쓴다.',
  intro: '스레드는 코드를 위에서 아래로 실행해 나가는 흐름 하나입니다. 자바 프로그램은 main이라는 이름의 스레드 하나로 시작하고, 이 스레드가 main 메서드를 위에서부터 실행합니다. 코드에서 스레드 객체를 만드는 부분은 new Thread(() -> work())입니다. work()는 이 예제에서 만든 메서드로, 자기를 실행한 스레드의 이름을 출력합니다. 괄호 안의 () -> work()는 "work()를 부르라"는 코드를 적어 새 흐름에게 맡기는 것이고, 이 줄은 Thread 객체를 만들 뿐 새 흐름은 만들지 않습니다. t.start()를 부르면 그때 새 흐름이 하나 생겨, 맡긴 코드를 새 스레드가 실행합니다. t.join()은 그 스레드가 끝날 때까지 main이 기다리게 하고, Thread.currentThread().getName()은 지금 이 줄을 실행하고 있는 스레드의 이름을 알려 줍니다. 이 실습은 start() 줄을 run() 호출로 바꾸거나 지우고 스레드를 하나 더 만들어 가며 같은 코드를 컴파일하고 실행해, work와 마지막 줄을 실행한 스레드의 이름과 새로 시작된 스레드의 수를 봅니다. (두 흐름이 동시에 움직일 때 생기는 일은 다루지 않습니다. join으로 기다리게 해서 출력 순서가 정해지는 모양만 봅니다.)',
  terms: ['프로세스와 스레드', 'main 스레드와 스레드의 이름', 'start()와 run()', 'join()'],
  controls: [
    { id: 'how', label: 'start를 부르는 줄', type: 'select', value: 'start', options: [['start', 't.start()를 부른다'], ['run', 't.run()을 부른다'], ['none', '부르지 않는다']] },
    { id: 'two', label: '스레드를 하나 더 만든다 (t2)', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '스레드는 어떻게 만들고, start()를 부르면 누가 work를 실행하나', d: 'start()를 부르면 새 스레드 Thread-0이 생겨 work를 실행하고, 마지막 줄은 main이 실행합니다.', v: { how: 'start', two: false } },
    { t: 'start() 대신 run()을 부르면', q: 'start() 대신 run()을 부르면', d: '새 스레드는 생기지 않고, main이 work를 직접 실행합니다.', v: { how: 'run', two: false } },
    { t: 'start()를 지우면', q: 'start()를 지우면', d: '스레드 객체만 만들고 시작하지 않으면 work는 실행되지 않습니다.', v: { how: 'none', two: false } },
    { t: '스레드를 하나 더 만들어 start()하면', q: '스레드 t2를 하나 더 만들어 start()를 부르면', d: '새 스레드가 하나 더 생겨 Thread-0과 Thread-1이 차례로 work를 실행합니다.', v: { how: 'start', two: true } },
  ],
  // 그림에서 상자마다의 처음 모양. mt, m2, ml은 main 스레드 쪽, x0, x1은 새 스레드 쪽
  bx0: function (c) {
    return {
      mt: { cls: 'ghost', title: 't를 다루는 줄', sub: ['실행 전'] },
      m2: { cls: 'ghost', title: c.two ? 't2를 다루는 줄' : 't2 없음', sub: [c.two ? '실행 전' : 'Thread 객체를 더 만들지 않음'] },
      ml: { cls: 'ghost', title: '마지막 줄', sub: ['실행 전'] },
      x0: { cls: 'ghost', title: '아직 없음', sub: ['start()를 부를 때 생김'] },
      x1: { cls: 'ghost', title: '아직 없음', sub: ['start()를 부를 때 생김'] },
    };
  },
  code: function (c) {
    var o = ['public class Main {', '    static void work() {', '        String who = Thread.currentThread().getName();', '        System.out.println("work를 실행한 스레드: " + who);', '    }', '', '    public static void main(String[] args) throws Exception {'];
    o.push('        // 스레드 객체를 만든다. 아직 새 흐름은 생기지 않았다', '        Thread t = new Thread(() -> work());');
    if (c.how === 'start') o.push('        // start: 새 흐름이 생겨 work를 실행한다', '        t.start();');
    else if (c.how === 'run') o.push('        t.run();');
    o.push('        // join: 그 스레드가 끝날 때까지 main이 기다린다', '        t.join();');
    if (c.two) {
      o.push('        // 스레드를 하나 더 만든다. t와 같은 방식으로 다룬다', '        Thread t2 = new Thread(() -> work());');
      if (c.how === 'start') o.push('        t2.start();');
      else if (c.how === 'run') o.push('        t2.run();');
      o.push('        t2.join();');
    }
    o.push('        String me = Thread.currentThread().getName();', '        System.out.println("이 줄을 실행한 스레드: " + me);', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { start: 't.start()를 부름', run: 't.run()을 부름', none: 'start를 부르지 않음' }[c.how] + ' · ' + (c.two ? '스레드 객체 2개 (t, t2)' : '스레드 객체 1개 (t)'); },
  columns: ['출력', 'work를 실행한 스레드', '새로 시작된 스레드'],
  simulate: function (c) {
    var ev = [], sum = [], S = c.how === 'start', R = c.how === 'run', objs = c.two ? ['t', 't2'] : ['t'];
    var st = { hot: '', bx: JSON.parse(JSON.stringify(this.bx0(c))), a: { a0: '', j0: '', a1: '', j1: '' }, started: 0, out: [], names: [], checks: [], fin: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function bx(id, cls, title, sub) { var o = st.bx[id]; o.cls = cls; if (title) o.title = title; o.sub = sub; }

    // 1. main 스레드가 시작한다
    st.checks.push(['실행을 시작', { v: 'main 스레드 하나', cls: '' }]);
    push('java Main으로 실행합니다. 스레드는 코드를 위에서 아래로 실행해 나가는 흐름 하나이고, 자바 프로그램은 main이라는 이름의 스레드 하나로 시작합니다. 이 main 스레드가 main 메서드를 위에서부터 실행합니다. 지금 흐름은 main 스레드 하나뿐입니다.', '');

    objs.forEach(function (v, i) {
      var mid = i ? 'm2' : 'mt', xid = i ? 'x1' : 'x0', nm = 'Thread-' + i, ak = 'a' + i, jk = 'j' + i, first = i === 0;
      var who = '새 스레드(' + nm + ')';

      // 2. Thread 객체를 만든다
      st.hot = mid; bx(mid, 'hot now', null, ['new Thread(…): 객체만 생김', '객체의 이름: ' + nm + ' (자동)']);
      st.checks.push(['Thread ' + v + ' = new Thread(…)', { v: '객체만 생김, 이름 ' + nm, cls: '' }]);
      push(first
        ? 'Thread t = new Thread(() -> work()); 줄: new Thread(…)가 Thread 객체를 만듭니다. 괄호 안의 () -> work()는 새 흐름에게 맡길 코드로, "work()를 부르라"는 뜻입니다. 이름을 따로 주지 않았으므로 자바가 Thread-0이라는 이름을 자동으로 붙입니다. 객체가 생겼을 뿐 새 흐름은 아직 없습니다. 흐름은 main 스레드 하나이고, 맡긴 코드는 아직 실행되지 않았습니다.'
        : 'Thread t2 = new Thread(() -> work()); 줄: t와 같은 방식으로 두 번째 Thread 객체를 만듭니다. 자동으로 붙는 이름은 Thread-1입니다. 이번에도 객체만 생겼고, 새 흐름은 아직 없습니다.', '');

      if (S) {
        // 3. start
        st.hot = mid; st.started++; st.a[ak] = 'hot';
        bx(mid, 'hot now', null, [v + '.start() 부름', '새 스레드가 시작됨']); bx(xid, 'hot', nm, ['시작됨']);
        st.checks.push([v + '.start()', { v: '새 스레드 ' + nm + ' 시작', cls: 'good' }]);
        push(first
          ? 't.start(); 줄: start()를 부르면 새 흐름이 하나 생기고, 새 스레드가 맡긴 코드를 실행합니다. 새 스레드의 이름은 아까 붙은 Thread-0입니다. 이 순간 흐름이 둘이 되어 새로 시작된 스레드는 1개입니다. main 스레드는 start()가 돌아오면 다음 줄로 이어 갑니다.'
          : 't2.start(); 줄: 이번에도 start()가 새 흐름을 하나 만들어 Thread-1이 시작됩니다. t를 맡았던 Thread-0은 앞의 join으로 이미 끝났으므로, 새로 시작된 스레드는 모두 2개이고 지금 흐르고 있는 것은 main 스레드와 Thread-1 둘입니다.', 'good');
        // 4. join
        st.hot = mid; bx(mid, 'wait', null, [v + '.join(): ' + nm + '이 끝나기를', '기다리는 중']);
        push(v + '.join(); 줄: main 스레드가 join()을 부르면, ' + who + '가 끝날 때까지 다음 줄로 가지 않고 기다립니다.', '');
        // 5. 새 스레드가 work를 실행한다
        st.hot = xid; st.out.push('work를 실행한 스레드: ' + nm); st.names.push(nm);
        bx(xid, 'hot now', nm, ['work() 실행', '이름: ' + nm]);
        st.checks.push(['work()', { v: nm + '이 실행', cls: 'good' }]);
        push('기다리는 동안 ' + who + '가 맡긴 코드 () -> work()를 실행해 work()를 부릅니다. work 안의 Thread.currentThread().getName()은 지금 이 줄을 실행하는 스레드의 이름이므로 ' + nm + '입니다. 출력: work를 실행한 스레드: ' + nm, 'good');
        // 6. 끝나서 join이 돌아온다
        st.hot = mid; st.a[ak] = ''; st.a[jk] = 'good';
        bx(xid, 'good', nm, ['work를 마치고 끝남']); bx(mid, 'good now', null, [v + '.join()이 돌아옴']);
        push('맡긴 코드가 끝나서 ' + who + '도 끝납니다. 기다리던 main 스레드의 ' + v + '.join()이 돌아오고, main은 다음 줄로 갑니다.', '');
      } else if (R) {
        // 3. run: 부른 스레드(main)가 직접 실행한다
        st.hot = mid;
        bx(mid, 'hot now', null, [v + '.run(): main이 work()를', '직접 실행']); bx(xid, 'ghost', '새 스레드 없음', ['새 흐름이 생기지 않음']);
        st.checks.push([v + '.run()', { v: '새 스레드 없음, 부른 스레드가 실행', cls: 'bad' }]);
        push(v + '.run(); 줄: run()은 평범한 메서드 호출이어서 새 흐름이 생기지 않습니다. 맡긴 코드 () -> work()를 이 줄을 실행하고 있는 main 스레드가 그 자리에서 바로 실행합니다. 새로 시작된 스레드는 ' + st.started + '개이고, 흐름은 main 스레드 하나입니다.', 'bad');
        st.out.push('work를 실행한 스레드: main'); st.names.push('main');
        st.checks.push(['work()', { v: 'main이 실행', cls: '' }]);
        push('main 스레드가 work()를 실행합니다. work 안의 Thread.currentThread().getName()은 지금 이 줄을 실행하는 스레드의 이름이고, 실행하는 것이 main 스레드이므로 이름은 main입니다. 객체 ' + v + '의 이름(' + nm + ')은 나오지 않습니다. 출력: work를 실행한 스레드: main', '');
        // 4. join: 시작한 적이 없으므로 바로 돌아온다
        bx(mid, 'good now', null, [v + '.join(): 바로 돌아옴']);
        st.checks.push([v + '.join()', { v: '시작한 적이 없어 기다리지 않음', cls: '' }]);
        push(v + '.join(); 줄: ' + v + '는 시작된 적이 없는 Thread 객체여서 끝나기를 기다릴 새 흐름이 없습니다. join()은 기다리지 않고 바로 돌아옵니다.', '');
      } else {
        // 3. start를 부르는 줄이 없다
        st.hot = mid;
        bx(mid, 'hot now', null, ['start()를 부르는 줄이 없음']); bx(xid, 'ghost', '새 스레드 없음', ['start()를 부르지 않음']);
        st.checks.push([v + '.start()', { v: '부르는 줄이 없음', cls: 'bad' }]);
        push('start()를 부르는 줄이 없습니다. ' + v + '는 객체만 만들어진 채로 있고, 새 흐름은 생기지 않습니다. 맡긴 코드 () -> work()는 아무도 실행하지 않습니다.', 'bad');
        bx(mid, 'good now', null, [v + '.join(): 바로 돌아옴', 'work는 실행되지 않음']);
        st.checks.push([v + '.join()', { v: '시작한 적이 없어 기다리지 않음', cls: '' }]);
        push(v + '.join(); 줄: ' + v + '는 시작된 적이 없는 Thread 객체여서 끝나기를 기다릴 새 흐름이 없습니다. join()은 기다리지 않고 바로 돌아옵니다.', '');
      }
    });

    // 마지막 줄
    st.hot = 'ml'; st.out.push('이 줄을 실행한 스레드: main'); st.fin = true;
    bx('ml', 'good now', null, ['main 스레드가 실행', '이름: main']);
    st.checks.push(['마지막 줄', { v: 'main이 실행', cls: 'good' }]);
    push('String me = Thread.currentThread().getName(); 줄과 그 아래 println 줄: main 스레드가 이어서 실행합니다. ' + (S ? '맡긴 코드를 실행한 새 스레드와는 이름이 다릅니다. ' : '') + '이 줄을 실행하는 스레드의 이름은 main입니다. 출력: 이 줄을 실행한 스레드: main. main 메서드가 끝나고 프로그램이 끝납니다. 새로 시작된 스레드는 모두 ' + st.started + '개였습니다.', 'good');

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (S && !c.two) {
      sum.push('스레드는 코드를 위에서 아래로 실행해 나가는 흐름 하나입니다. 자바 프로그램은 main이라는 이름의 스레드 하나로 시작하고, t.start()를 부르자 새 흐름이 하나 생겨 Thread-0이라는 새 스레드가 맡긴 코드를 실행했습니다. work를 실행한 스레드는 Thread-0이고, 마지막 줄을 실행한 스레드는 main이었습니다.');
      sum.push('new Thread(…)만으로는 흐름이 생기지 않습니다. 새 흐름이 생기는 것은 start()를 부르는 순간이고, 어느 스레드가 실행했는지는 Thread.currentThread().getName()으로 확인할 수 있습니다.');
    } else if (R && !c.two) {
      sum.push('start() 대신 run()을 부르면 새 스레드는 생기지 않고, main 스레드가 맡긴 코드를 직접 실행합니다. work를 실행한 스레드도 main이었고, 새로 시작된 스레드는 0개였습니다.');
      sum.push('run()은 평범한 메서드 호출입니다. Thread 객체의 run()을 불러도 새 흐름이 생기는 것이 아니라, 부른 스레드가 그 코드를 실행합니다. 새 흐름을 만드는 것은 start()입니다.');
    } else if (!S && !R && !c.two) {
      sum.push('start()를 지우면 맡긴 코드는 실행되지 않습니다. Thread 객체 t는 만들어졌지만 새 스레드가 시작되지 않아 work가 한 번도 실행되지 않았고, 출력은 마지막 줄 하나뿐이었습니다.');
      sum.push('Thread 객체를 만드는 것만으로는 코드가 실행되지 않습니다. 시작한 적 없는 스레드의 join()은 기다리지 않고 바로 돌아오므로, 프로그램은 오류 없이 끝났습니다.');
    } else if (S) {
      sum.push('스레드를 하나 더 만들어 start()하면 새 흐름이 하나 더 생겨, 새로 시작된 스레드는 2개(Thread-0, Thread-1)였습니다. start()를 부를 때마다 새 스레드가 하나씩 생겼고, work를 실행한 스레드의 이름도 Thread-0, Thread-1로 서로 달랐습니다.');
      sum.push('이름을 따로 주지 않은 스레드에는 자바가 Thread-0, Thread-1처럼 번호가 붙은 이름을 자동으로 붙였습니다. 이 코드는 t를 시작하고 join으로 끝나기를 기다린 뒤에 t2를 시작하므로 출력 순서가 정해져 있습니다.');
    } else if (R) {
      sum.push('스레드 객체를 둘 만들고 둘 다 run()을 불러도 새 스레드는 하나도 생기지 않았습니다. work는 두 번 실행됐지만 두 번 모두 main 스레드가 실행했습니다.');
      sum.push('만든 Thread 객체의 수와 새 흐름의 수는 다릅니다. 새 흐름은 start()를 부를 때만 생깁니다.');
    } else {
      sum.push('객체를 둘 만들어도 start()를 부르지 않으면 새 스레드는 0개이고, work는 한 번도 실행되지 않았습니다. 출력은 마지막 줄 하나뿐이었습니다.');
      sum.push('새 스레드의 수를 정하는 것은 만든 Thread 객체의 수가 아니라 start()를 부른 횟수입니다.');
    }
    return { events: ev, summary: sum, bx0: this.bx0(c), row: [st.out.join(' / '), st.names.length ? st.names.join(', ') : '실행되지 않음', st.started + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 main 스레드가 main 메서드를 위에서부터 실행하는 것부터 시작합니다.'); return; }
    H.table(v, ['실행한 줄', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '실행');
    if (s.out.length) H.table(v, ['출력'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), '표준 출력');
    H.counters(v, [[s.started, '새로 시작된 스레드'], [s.out.length, '출력된 줄']]);
  },
  // 그림: 세로 줄 두 개(둘이면 세 개). 왼쪽은 main 스레드, 오른쪽은 새 스레드(Thread-0, Thread-1). main 쪽에는 t를 다루는 줄, t2를 다루는 줄, 마지막 줄을 상자로 쌓고(Thread 객체가 아니라 main이 실행하는 줄이다), 새 스레드 쪽은 start()로 스레드가 시작된 뒤에만 그 이름을 붙이며, 어느 줄에서 어떤 코드가 실행되는지 보인다. start이면 main에서 새 스레드로 화살표가 건너가고, run이나 none이면 새 스레드 줄이 비어 있다. 아래에 work를 실행한 스레드와 새로 시작된 스레드를 세는 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, bx = s ? s.bx : sim.bx0, a = s ? s.a : {};
    P.size(680, 356);
    P.region('lm', 14, 8, 250, 252, 'main 스레드');
    var started = s ? s.started : 0;
    P.region('l0', 280, 8, 190, 252, started >= 1 ? '새 스레드 Thread-0' : '새 스레드 없음');
    if (c.two) P.region('l1', 486, 8, 180, 252, started >= 2 ? '새 스레드 Thread-1' : '새 스레드 없음');
    function B(id, x, y, w) { var o = bx[id]; P.box(id, x, y, w, 64, { cls: o.cls, title: o.title, sub: o.sub }); }
    B('mt', 22, 34, 234); B('m2', 22, 106, 234); B('ml', 22, 178, 234);
    B('x0', 288, 34, 174);
    if (c.two) B('x1', 494, 106, 164);
    if (a.a0) P.arrow('a0', 'mt:r:0.3', 'x0:l:0.3', { cls: a.a0 });
    if (a.j0) P.arrow('j0', 'x0:l:0.8', 'mt:r:0.8', { cls: a.j0 });
    if (c.two && a.a1) P.arrow('a1', 'm2:r:0.3', 'x1:l:0.3', { cls: a.a1 });
    if (c.two && a.j1) P.arrow('j1', 'x1:l:0.8', 'm2:r:0.8', { cls: a.j1 });
    var names = s && s.names.length ? s.names.join(', ') : '';
    P.box('r1', 14, 270, 652, 36, { cls: names ? 'good' : s && s.fin ? 'plain' : 'ghost', title: 'work를 실행한 스레드', right: names || (s && s.fin ? '실행되지 않음' : '') });
    P.box('r2', 14, 312, 652, 36, { cls: s && s.started ? 'wait' : 'ghost', title: '새로 시작된 스레드', right: (s ? s.started : 0) + '개' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 이 JDK의 java를 자식 프로세스로 띄워 조합마다 20번씩 실제로 실행해 대조했습니다. 120번의 실행 모두 종료 코드는 0이고 표준 오류는 비어 있었으며, 조합마다 표준 출력이 20번 모두 같았습니다. 대조한 것은 표준 출력의 줄들(결과 표의 출력 열), 그 줄에 나온 스레드의 이름(work를 실행한 스레드 열), 새로 시작된 스레드의 수입니다. 새로 시작된 스레드의 수는 화면의 소스를 바꾸지 않고, 자식 프로세스의 시작 클래스가 Main.main을 부르기 전과 뒤에 ThreadMXBean.getTotalStartedThreadCount()를 읽어 그 차이로 쟀습니다(start를 부른 조합은 1개와 2개, 나머지는 0개였고 20번 모두 같았습니다). 단계 문장이 기대는 사실은 따로 만든 소스를 같은 방식으로 20번 실행해 확인했습니다. Thread 객체를 만든 직후에는 상태가 NEW이고 isAlive()가 false이며, start() 뒤에는 새 스레드와 main이 함께 살아 있고(새 스레드는 WAITING으로 붙들어 둔 상태), join()이 돌아온 뒤에는 TERMINATED입니다. run()을 부르면 맡긴 코드를 main이 실행하고 부른 뒤에도 그 Thread 객체의 상태는 NEW이며, 시작한 적 없는 스레드의 join()은 기다리지 않고 바로 돌아옵니다. 문서는 Java SE 21 API 문서의 java.lang.Thread를 WebFetch로 열어 확인했습니다(발췌가 돌려준 문장을 따랐고 페이지 전체를 직접 읽지는 않았습니다). 스레드는 실행 흐름이고 시작하면 run 메서드를 실행하도록 예약된다는 것은 클래스 설명을, 이름을 주지 않는 Thread()와 Thread(Runnable)로 만든 스레드에는 "Thread-"에 정수를 붙인 이름이 자동으로 붙는다는 것은 생성자 설명을, start()가 새 스레드의 실행을 예약하고 현재 스레드와 따로 실행된다는 것은 start() 설명을, run()은 직접 부르도록 만든 메서드가 아니며 Runnable로 만든 스레드에서는 그 과제의 run을 부른다는 것은 run() 설명을, join()은 그 스레드가 끝나기를 기다리고 시작하지 않은 스레드에는 기다리지 않고 바로 돌아온다는 것은 join()과 join(long) 설명을 따랐습니다. 스레드는 Thread 객체로 만들고 그 객체의 start()를 부를 때 시작한다는 것은 Java Language Specification(Java SE 21) 17장 서두를, 프로그램이 클래스의 main 메서드를 불러 실행을 시작한다는 것은 12.1절을 따랐습니다. 다만 12.1절은 main을 실행하는 스레드나 그 이름을 정하지 않으므로, 그 스레드의 이름이 main이라는 것과 이름 없이 만든 첫 스레드가 Thread-0, 둘째가 Thread-1이라는 번호 순서는 명세가 정한 것이 아니라 이 JDK에서 실행해 관찰한 것입니다. 새로 시작된 스레드의 수는 JVM이 센 값이며 JVM 안에서 따로 시작되는 스레드가 있으면 달라질 수 있는데, 검증 환경에서는 그런 일이 없었습니다. 화면의 코드는 java.lang 안의 클래스만 쓰므로 import 줄이 없고, java Main으로 실행하는 모양 그대로입니다. 모든 조합이 t를 시작하고 join으로 끝나기를 기다린 뒤에 t2를 시작하므로 출력 순서가 정해져 있고, join이 없을 때나 두 스레드가 동시에 움직일 때의 순서는 이 실습이 다루지 않았고 실행으로 확인하지도 않았습니다. 이 밖에 Runnable을 구현하거나 Thread를 상속하는 방법, 스레드에 이름을 주는 것, start()를 두 번 부르는 것, 스레드의 상태 변화, 가상 스레드와 스레드 풀은 다루지 않았습니다. 상태 변화는 "세부 동작 실습: 스레드의 생성과 상태"에서 다룹니다.',
});
