Lab.register({
  id: 'process_basic', nav: '프로세스', cat: '기초개념', mode: 'step', basic: true, deep: ['process', 'container'],
  title: '프로세스는 무엇이고, 프로그램을 두 번 실행하면 무엇이 따로인가',
  why: '여러 프로그램이 한 컴퓨터의 메모리를 구분 없이 함께 쓰면, 한 프로그램의 실수가 다른 프로그램의 값을 덮어쓰거나 함께 멈추게 할 수 있다. 운영체제는 실행한 프로그램마다 프로세스를 따로 만들고 메모리도 따로 내줘서, 한 프로세스가 고친 값이나 오류가 다른 프로세스로 번지지 않게 한다.',
  use: '스프링 부트 서버를 java -jar 명령으로 띄우면 프로세스 하나가 생긴다. 같은 서버를 여러 개 띄우면 프로세스마다 메모리가 따로라서 한쪽 변수의 값을 다른 쪽이 보지 못하므로, 여러 서버가 함께 봐야 하는 로그인 정보나 개수는 DB처럼 프로세스 바깥에 둔다. 한 프로그램 안에서 일을 나눠 같은 값을 함께 쓰려면 프로세스 대신 스레드를 쓴다.',
  intro: '이 실습에서 예시로 만든 Counter 클래스(Counter.java)를 컴파일해 만든 Counter.class는 디스크에 저장된 파일입니다. 이 파일을 java Counter 명령으로 실행하면, 실행 중인 것이 하나 생깁니다. 이것이 프로세스입니다. 운영체제는 프로세스마다 번호(PID)를 붙이고, 그 프로세스만 쓰는 메모리를 내줍니다. 코드의 static int count는 그 메모리에 있는 변수이고, add()는 count를 3 올린 뒤 이 프로세스의 PID와 count를 출력합니다. 프로세스 안에서 코드를 실행하는 흐름은 스레드라고 부릅니다. 이 실습은 같은 Counter.class를 터미널 두 곳에서 실행하거나, 끝난 뒤 다시 실행하거나, 한 번만 실행하고 그 안에서 스레드가 차례로 add를 실행하게 하며 실제로 실행해, 프로세스가 몇 개 생기는지와 각자 본 count가 얼마인지를 봅니다. (웹 서버 같은 프로그램도 java 명령으로 실행하면 프로세스 하나입니다. static은 이 실습에서 다루지 않습니다.)',
  terms: ['프로그램과 프로세스', 'PID(프로세스 번호)', '프로세스의 메모리', '프로세스와 스레드'],
  controls: [
    { id: 'how', label: 'java Counter를 실행하는 방법', type: 'select', value: 'procs', options: [['procs', '터미널 여러 곳에서, 앞의 실행이 끝나기 전에 따로 실행한다'], ['rerun', '실행하고, 끝난 뒤에 같은 터미널에서 다시 실행한다'], ['threads', '한 번만 실행하고, 그 안에서 스레드가 차례로 add를 실행한다']] },
    { id: 'n', label: '실행하는 횟수(스레드면 스레드의 수)', type: 'select', value: '2', options: [['2', '2'], ['3', '3']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'Counter는 어떻게 생겼고, 터미널 1과 터미널 2에서 java Counter를 실행하면 무슨 일이 일어나나', d: '같은 파일을 두 번 실행하면 프로세스가 둘 생기고, count는 각자 3입니다.', v: { how: 'procs', n: '2' } },
    { t: '스레드 2개가 add를 실행하면', q: 'java Counter를 한 번만 실행하고, 그 안에서 스레드 t1과 t2가 차례로 add를 실행하면', d: '프로세스는 하나이고, 스레드들이 같은 count를 이어서 올립니다.', v: { how: 'threads', n: '2' } },
    { t: '끝난 뒤 다시 실행하면', q: 'java Counter가 끝난 뒤에 같은 터미널에서 java Counter를 다시 실행하면', d: '앞에서 올린 count는 남아 있지 않고, 새 프로세스의 count는 다시 3입니다.', v: { how: 'rerun', n: '2' } },
    { t: '터미널 3곳에서 실행하면', q: '터미널 1, 2, 3에서 java Counter를 실행하면', d: '프로세스가 셋 생기고, 각자 따로 쓰는 메모리의 count가 모두 3입니다.', v: { how: 'procs', n: '3' } },
    { t: '스레드가 3개면', q: 'java Counter를 한 번만 실행하고, 그 안에서 스레드 t1, t2, t3가 차례로 add를 실행하면', d: '프로세스는 여전히 하나이고, count가 3, 6, 9로 이어집니다.', v: { how: 'threads', n: '3' } },
  ],
  pids: [4120, 7352, 9081],
  code: function (c) {
    var n = +c.n, o = ['# Counter.java', 'public class Counter {', '    // 이 프로세스의 메모리에 있는 변수', '    static int count = 0;', '',
      '    // count를 3 올리고, 이 프로세스의 PID와 count를 출력한다', '    static void add() {', '        count++;', '        count++;', '        count++;',
      '        System.out.println("PID " + ProcessHandle.current().pid()', '                + " count " + count);', '    }', '', '    public static void main(String[] args) throws Exception {'];
    if (c.how === 'threads') {
      for (var j = 1; j <= n; j++) {
        if (j === 1) o.push('        // 스레드: 이 프로세스 안에서 add(Counter::add)를 실행하는 흐름');
        o.push('        Thread t' + j + ' = new Thread(Counter::add);', '        t' + j + '.start();');
        if (j === 1) o.push('        // 끝날 때까지 기다린다. 스레드가 차례로 실행된다');
        o.push('        t' + j + '.join();');
      }
    } else o.push('        add();');
    o.push('        // 실행이 2초 이어지게 한다', '        Thread.sleep(2000);', '    }', '}', '', '# 터미널', '# 컴파일: Counter.class 파일이 만들어진다', 'javac Counter.java');
    if (c.how === 'threads') o.push('# 실행한다', 'java Counter');
    else if (c.how === 'rerun') {
      o.push('# 실행한다', 'java Counter');
      for (var i = 2; i <= n; i++) o.push('# 앞의 실행이 끝난 뒤에, 같은 터미널에서 다시 실행한다', 'java Counter');
    } else {
      o.push('# 터미널 1에서 실행한다', 'java Counter');
      for (var k = 2; k <= n; k++) o.push('# 터미널 ' + k + '에서, 앞의 실행이 끝나기 전에 실행한다', 'java Counter');
    }
    return o.join('\n');
  },
  label: function (c) { return { procs: '터미널 ' + c.n + '곳에서 따로 실행', rerun: '끝난 뒤 다시 실행, 모두 ' + c.n + '번', threads: '한 번 실행, 스레드 ' + c.n + '개' }[c.how]; },
  columns: ['프로세스 수', '각자 본 count', '메모리를 같이 씀', '같은 때에 떠 있던 프로세스'],
  simulate: function (c) {
    var n = +c.n, how = c.how, ev = [], sum = [], P = this.pids;
    var st = { hot: '', phase: '', procs: [], made: 0, alive: 0, out: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function born(i, thr) { st.procs.push({ pid: P[i], count: 0, alive: true, thr: thr }); st.made++; st.alive++; st.hot = 'p' + i; st.phase = 'new'; }
    function addTo(i) { st.procs[i].count += 3; st.out.push('PID ' + st.procs[i].pid + ' count ' + st.procs[i].count); st.hot = 'p' + i; st.phase = 'run'; }
    function endAll() { st.procs.forEach(function (p) { p.alive = false; }); st.alive = 0; st.hot = ''; st.phase = 'end'; }
    var main1 = 'main 스레드 1개';
    var seen = [], counts = [];

    st.hot = 'fl';
    push('터미널에서 javac Counter.java 명령을 쓰면 javac가 Counter.java를 읽어 Counter.class 파일을 만듭니다. 이 파일은 디스크에 저장된 파일일 뿐이고, 지금 실행 중인 것은 아무것도 없습니다. 실행 중인 프로그램을 프로세스라고 부르는데, 프로세스는 이 파일을 실행해야 생깁니다.', '');

    if (how === 'procs') {
      for (var i = 0; i < n; i++) {
        born(i, main1);
        push(i === 0 ? '터미널 1에서 java Counter 명령을 쓰면, 운영체제가 java(JVM) 프로세스를 하나 만들고, 그 JVM이 Counter.class를 읽어 실행합니다. 이 프로세스의 번호(PID)는 ' + P[0] + '입니다. 운영체제는 이 프로세스에 메모리를 내주고, 우리가 쓴 count 변수는 그 메모리 안에서 0으로 시작합니다. 프로세스를 만든 것은 우리가 쓴 코드가 아니라 java 명령과 운영체제입니다.'
          : '앞의 프로세스가 아직 실행 중일 때 터미널 ' + (i + 1) + '에서 java Counter 명령을 한 번 더 씁니다. 파일은 같은 Counter.class 하나인데, 운영체제는 프로세스를 하나 더 만들고 새 번호를 붙입니다. 이 프로세스의 PID는 ' + P[i] + '입니다. 운영체제는 이 프로세스에도 메모리를 따로 내주어서, 이 프로세스의 count도 0에서 시작합니다.', '');
        addTo(i);
        push(i === 0 ? 'main이 add()를 부르면 add 안의 count++ 세 줄이 실행되어, 이 프로세스의 메모리에서 count가 3이 됩니다. println이 "PID ' + P[0] + ' count 3"을 출력합니다. 이어서 main은 Thread.sleep(2000)에서 2초 기다리므로, 이 프로세스는 아직 끝나지 않았습니다.'
          : '이 프로세스도 add()를 실행합니다. count++ 세 줄이 올리는 것은 이 프로세스의 메모리에 있는 count이므로 0에서 3이 되고, "PID ' + P[i] + ' count 3"이 출력됩니다. 앞 프로세스의 count는 그대로 3입니다. 한 프로세스가 올린 값은 다른 프로세스에서 보이지 않습니다.', 'good');
      }
      endAll();
      push('2초가 지나면 각 프로세스의 main이 끝나고 프로세스가 모두 끝납니다. 끝난 프로세스의 count는 더는 쓸 수 없습니다. 프로세스는 ' + n + '개 만들어졌지만 Counter.class 파일은 처음 그대로 1개입니다.', 'good');
      sum.push('프로세스는 프로그램 파일을 실행한 것입니다. Counter.class 파일은 1개인데 ' + n + '번 실행하자 프로세스가 ' + n + '개 생겼고, 운영체제가 프로세스마다 번호(PID)와 따로 쓰는 메모리를 내주어서 count가 모두 3이었습니다.');
      sum.push('프로세스 ' + n + '개가 같은 때에 떠 있었고 번호가 서로 달랐습니다. 한 프로세스가 올린 count는 다른 프로세스에서 보이지 않았고, 파일은 실행해도 늘지 않았습니다. 웹 서버 같은 프로그램도 java 명령으로 실행하면 이와 같은 프로세스 하나입니다.');
    } else if (how === 'rerun') {
      for (var r = 0; r < n; r++) {
        born(r, main1);
        push(r === 0 ? '터미널에서 java Counter 명령을 쓰면 운영체제가 프로세스를 하나 만듭니다. 번호(PID)는 ' + P[0] + '이고, 운영체제가 내준 메모리 안에서 count는 0으로 시작합니다. 프로세스를 만든 것은 우리가 쓴 코드가 아니라 java 명령과 운영체제입니다.'
          : '앞의 실행이 끝난 뒤 같은 터미널에서 java Counter 명령을 다시 쓰면, 운영체제가 프로세스를 새로 만듭니다. 이 프로세스의 번호(PID)는 ' + P[r] + '입니다. 앞 프로세스는 이미 끝났고 이 프로세스의 메모리는 새것이어서, count는 앞에서 올린 3이 아니라 0으로 시작합니다.', '');
        addTo(r);
        push('add()가 실행되어 이 프로세스의 count가 3이 되고 "PID ' + P[r] + ' count 3"이 출력됩니다.' + (r === 0 ? ' 이어서 main은 Thread.sleep(2000)에서 2초 기다립니다.' : ' 앞에서 올린 3이 남아 있었다면 6이 출력되었을 것입니다.'), 'good');
        endAll();
        st.procs[r].alive = false;
        push('2초가 지나 main이 끝나고 PID ' + P[r] + ' 프로세스가 끝납니다.' + (r === 0 ? ' 끝난 프로세스의 count는 더는 쓸 수 없습니다.' : ''), 'good');
      }
      sum.push('프로그램이 끝난 뒤 다시 실행하면 앞에서 올린 count는 남아 있지 않았습니다. 프로세스는 실행하는 동안만 있고, 다시 실행하면 새 프로세스가 새 메모리에서 count를 0부터 시작해 이번에도 3이었습니다.');
      sum.push('앞 프로세스가 끝난 뒤에 시작했으므로 같은 때에 떠 있던 프로세스는 늘 1개였습니다. 같은 파일을 실행한 것이어도, 실행할 때마다 별개의 프로세스입니다.');
    } else {
      born(0, 'main');
      push('java Counter 명령을 쓰면 운영체제가 프로세스를 하나 만듭니다. 번호(PID)는 ' + P[0] + '이고, count는 이 프로세스의 메모리에서 0으로 시작합니다. 프로세스에는 처음부터 main 스레드가 하나 있고, main이 코드를 실행합니다.', '');
      for (var j = 1; j <= n; j++) {
        st.procs[0].thr += ', t' + j; st.hot = 'p0'; st.phase = 'thr';
        push(j === 1 ? 'main이 t1 스레드를 만들고 start()로 시작합니다. 스레드는 프로세스를 새로 만드는 것이 아니라, 이 프로세스 안에서 코드를 실행하는 흐름을 하나 더 만드는 것입니다. 그래서 PID는 ' + P[0] + ' 그대로이고 프로세스는 계속 1개입니다. main은 join()으로 t1이 끝나기를 기다립니다.'
          : 'main이 t' + j + ' 스레드를 만들고 시작합니다. 이번에도 새 프로세스는 생기지 않고, PID는 ' + P[0] + ' 그대로입니다.', '');
        addTo(0);
        var cnt = st.procs[0].count;
        push(j === 1 ? 't1이 add를 실행해 이 프로세스의 count가 3이 되고 "PID ' + P[0] + ' count 3"이 출력됩니다. t1이 끝나면 main이 이어서 실행합니다.'
          : 't' + j + '가 add를 실행합니다. t' + j + '가 보는 count는 0이 아니라 앞 스레드가 올린 값에서 이어지고, 올린 뒤의 값은 ' + cnt + '입니다. "PID ' + P[0] + ' count ' + cnt + '"이 출력됩니다. 스레드들은 이 프로세스의 메모리를 같이 쓰기 때문입니다.', 'good');
      }
      endAll();
      push('스레드가 모두 끝난 뒤 main은 Thread.sleep(2000)에서 2초 기다리고, 그 뒤 main이 끝나 프로세스가 끝납니다. 프로세스는 처음부터 끝까지 1개였습니다.', 'good');
      var seq = []; for (var q = 1; q <= n; q++) seq.push(3 * q);
      sum.push('스레드는 새 프로세스를 만들지 않고 한 프로세스 안에서 코드를 실행합니다. 프로세스는 1개(PID 하나)뿐이었고, 스레드들이 같은 메모리의 count를 이어서 올려 ' + seq.join(', ') + ' 순서로 출력되었습니다.');
      sum.push('프로세스끼리는 메모리가 따로이고, 한 프로세스 안의 스레드끼리는 메모리를 같이 씁니다. 결과가 매번 같도록 스레드를 차례로 실행하게 했습니다.');
    }
    var cs = how === 'threads' ? [3, 6, 9].slice(0, n) : Array.apply(null, Array(n)).map(function () { return 3; });
    return { events: ev, summary: sum, row: [(how === 'threads' ? 1 : n) + '개', cs.join(', '), how === 'threads' ? '예' : '아니요', (how === 'procs' ? n : 1) + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 javac Counter.java로 Counter.class 파일을 만드는 것부터 시작합니다.'); return; }
    H.table(v, ['PID', '메모리의 count', '상태'], s.procs.length ? s.procs.map(function (p) { return { cls: p.alive ? '' : 'gone', cells: ['' + p.pid, p.alive ? '' + p.count : '쓸 수 없음', p.alive ? '실행 중 · ' + p.thr : '끝남'] }; }) : [{ cls: 'gone', cells: ['아직 실행하지 않음', '', ''] }], '프로세스');
    H.table(v, ['화면에 출력된 줄'], s.out.length ? s.out.map(function (o) { return { cls: '', cells: [o] }; }) : [{ cls: 'gone', cells: ['아직 없음'] }], '출력');
    H.counters(v, [[s.made, '만들어진 프로세스'], [s.alive, '지금 실행 중인 프로세스']]);
  },
  // 그림: 왼쪽에 디스크의 Counter.class 파일 1개, 오른쪽에 프로세스 상자들. 실행할 때마다 파일에서 화살표가 나가 프로세스가 하나씩 생기고, 상자마다 그 프로세스의 PID와 메모리의 count가 보인다. 아래에 만들어진 프로세스와 지금 실행 중인 프로세스를 세는 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, slots = c.how === 'threads' ? 1 : +c.n;
    P.size(680, 284);
    P.box('fl', 14, 16, 150, 188, { cls: s && s.hot === 'fl' ? 'hot now' : 'plain', title: 'Counter.class', sub: ['디스크에 있는 파일', '실행해도 1개 그대로'] });
    for (var i = 0; i < slots; i++) {
      var p = s && s.procs[i], id = 'p' + i, y = 16 + i * 66;
      if (!p) { P.box(id, 214, y, 452, 56, { cls: 'ghost', title: '프로세스', right: '아직 없음' }); continue; }
      var cls = !p.alive ? 'ghost' : s.hot === id ? 'hot now' : 'good';
      P.box(id, 214, y, 452, 56, { cls: cls, title: 'PID ' + p.pid, right: p.alive ? 'count = ' + p.count : '끝남 · count 쓸 수 없음', sub: p.alive ? '스레드: ' + p.thr : '' });
      P.arrow('a' + i, 'fl:r:' + ((28 + i * 66) / 188).toFixed(3), id + ':l', { cls: s.hot === id && s.phase === 'new' ? 'hot' : 'mut' });
    }
    P.box('n1', 14, 232, 322, 36, { cls: s && s.made ? 'wait' : 'ghost', title: '만들어진 프로세스', right: (s ? s.made : 0) + '개' });
    P.box('n2', 344, 232, 322, 36, { cls: s && s.alive ? 'good' : 'ghost', title: '지금 실행 중인 프로세스', right: (s ? s.alive : 0) + '개' });
  },
  assume: "실행 환경은 JDK 21.0.12.1(javac 21, java 21)이고 운영체제는 Windows입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 글(# Counter.java 구역과 # 터미널 구역)을 조합마다 빈 폴더에 만들고, 그 글에서 소스 파일과 명령을 읽어 실제 javac 프로그램과 java 프로그램을 프로세스로 띄워 실행한 결과와 대조했습니다. 터미널 구역의 java Counter 줄은 바로 윗줄 주석을 읽어, \"끝난 뒤에\"가 있으면 앞의 프로세스가 모두 끝나기를 기다린 뒤, 아니면 기다리지 않고 바로 시작했습니다. 터미널 여러 곳은 터미널을 여러 개 열지 않고 프로세스를 이어서 시작하는 것으로 대신했습니다. 대조한 것은 실제로 시작한 프로세스 수, 프로세스별로 출력된 count, 한 프로세스가 3보다 큰 count를 본 적이 있는지(메모리를 같이 쓰는지), 프로세스를 시작할 때마다 센 살아 있는 프로세스 수의 최댓값, 출력한 PID가 실행한 쪽이 본 프로세스 번호와 같은지, 함께 떠 있던 프로세스의 PID가 서로 다른지, 종료 코드와 표준 오류, 실행해도 Counter.class가 1개 그대로인지입니다. 화면에 나오는 PID 4120, 7352, 9081은 예시 숫자이고 실제 번호는 실행할 때마다 다릅니다. 끝난 뒤 다시 실행한 프로세스의 PID는 검증 실행(JDK 21, Windows)에서는 앞과 모두 달랐지만, 운영체제는 끝난 프로세스의 번호를 다시 쓸 수 있고 언제 다시 쓰는지는 정해져 있지 않다고 Java SE 21 API 문서의 ProcessHandle(pid() 설명)이 밝히고 있어, 화면은 \"다시 실행한 프로세스의 번호는 항상 다르다\"고 말하지 않았습니다. 웹 서버 같은 프로그램도 java 명령으로 실행하면 프로세스 하나라는 것은, 요청을 받는 작은 서버 프로그램(JDK의 com.sun.net.httpserver)을 java 명령으로 실행해 요청을 두 번 보내 확인했습니다. 두 응답의 PID는 같고 실행한 쪽이 본 프로세스 번호와 같았으며 count는 1, 2로 이어졌습니다. 이 서버는 화면에 쓰지 않았고, 톰캣 같은 실제 서버 제품은 실행하지 않았습니다. 문서는 직접 열어 확인했습니다. The Java Tutorials의 \"Processes and Threads\"에서 프로세스가 자기만의 실행 환경과 메모리 공간을 가진다는 것(Processes 절), 스레드가 프로세스 안에 있고 메모리를 포함한 프로세스의 자원을 함께 쓴다는 것(Threads 절), 자바 가상 머신 구현은 대부분 프로세스 하나로 실행된다는 것을 따랐습니다. 프로그램 파일과 프로세스의 구분(파일은 디스크에 있고 프로세스는 그것을 실행한 것)은 이 문서가 정의한 것이 아니라 위의 실행 결과와 일반적인 용어를 따른 설명입니다. 화면의 코드는 프로세스 안의 변수 count가 프로세스의 메모리에 있다는 것을 보이려고 static 변수로 썼고, 스레드 2개 이상이 동시에 count를 올릴 때 생기는 문제(경쟁 상태)를 피하려고 join()으로 스레드를 차례로 실행하게 했습니다. Thread.sleep(2000)은 프로세스가 곧바로 끝나지 않아 같은 때에 떠 있게 하려고 넣은 것이며, 실제 프로그램에는 필요하지 않습니다. 화면의 코드는 import가 필요 없는 모양이어서 줄인 것이 없습니다. 이 실습은 한 컴퓨터에서 운영체제가 프로세스에 메모리를 따로 내준다는 것까지만 다루었고, 프로세스끼리 값을 주고받는 방법, 프로세스를 만드는 비용, 프로세스가 죽었을 때 다른 프로세스에 미치는 영향은 다루지 않았습니다. 이것은 \"세부 동작 실습: 프로세스와 스레드\"에서, 프로세스를 격리해 묶어 실행하는 컨테이너는 \"세부 동작 실습: 컨테이너와 가상 머신\"에서 다룹니다. 문서를 열어 확인하지 못한 것: 프로세스 번호(PID)를 운영체제가 어떻게 정하는지, 프로세스가 끝나면 운영체제가 메모리를 어떻게 거두는지는 문서를 열지 않았고 화면에도 쓰지 않았습니다.",
});
