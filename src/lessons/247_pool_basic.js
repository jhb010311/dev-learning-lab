Lab.register({
  id: 'pool_basic', nav: '스레드 풀', cat: '기초개념', mode: 'step', basic: true, deep: ['threadpool', 'connpool'],
  title: '스레드 풀은 무엇이고, 스레드를 매번 만드는 것과 무엇이 다른가',
  why: '일이 생길 때마다 new Thread로 스레드를 만들면, 스레드를 만들고 끝내는 비용이 일마다 되풀이되고, 일이 한꺼번에 몰리면 스레드 수가 제한 없이 늘어 메모리가 모자랄 수 있다. 스레드 풀은 정해진 수까지만 스레드를 만들고, 일을 마친 스레드를 끝내지 않고 다음 일에 다시 쓰며, 그보다 많이 몰린 일은 줄을 세워 기다리게 한다.',
  use: '메일 보내기처럼 사용자를 기다리게 하지 않고 뒤에서 할 일이나, 여러 곳에 동시에 물어볼 일을 ExecutorService로 만든 풀에 맡긴다. 스프링 부트에서 @EnableAsync를 켜고 @Async를 붙인 메서드는, 따로 정하지 않으면 스프링 부트가 자동으로 설정해 둔 스레드 풀에서 실행된다. 스레드 수가 너무 적으면 일이 줄에서 오래 기다리고 너무 많으면 메모리를 많이 쓰므로, 하는 일에 맞춰 정한다.',
  intro: '일을 스레드에게 시키는 방법은 두 가지입니다. 하나는 일이 생길 때마다 new Thread(() -> work()).start() 줄로 새 스레드를 만드는 것이고, 다른 하나는 스레드 풀에 일을 맡기는 것입니다. 스레드 풀은 코드에서 Executors.newFixedThreadPool(2) 줄로 스레드 수를 정해 만드는 ExecutorService 객체이고, pool.submit(() -> work()) 줄로 일을 맡기면 풀이 가진 스레드가 그 일을 가져가 실행합니다. 풀의 스레드가 모두 일하는 중이면 남은 일은 줄을 서서 기다리고, 일을 마친 스레드는 끝나지 않고 줄의 다음 일을 이어서 합니다. 마지막의 pool.shutdown() 줄은 더 이상 새 일을 받지 않고 맡긴 일을 끝까지 한 뒤 풀을 닫습니다. 이 실습은 맡기는 방법을 바꾸고 풀의 스레드 수를 바꿔 가며 같은 코드를 컴파일하고 20번씩 실행해, work() 메서드를 실행한 스레드의 이름이 몇 가지 나오는지와 같은 이름이 되풀이되는지를 봅니다. (어느 스레드가 어느 일을 하는지는 실행마다 달라질 수 있어서, 이름의 개수와 목록으로만 비교합니다.)',
  terms: ['스레드 풀', 'ExecutorService와 newFixedThreadPool', 'submit()', 'shutdown()'],
  controls: [
    { id: 'how', label: '일을 맡기는 방법', type: 'select', value: 'pool', options: [['pool', '스레드 풀에 pool.submit 메서드로 맡긴다'], ['new', '일마다 new Thread로 새 스레드를 만든다']] },
    { id: 'size', label: '스레드 풀의 스레드 수', type: 'select', value: '2', options: [['2', '2개'], ['1', '1개'], ['6', '6개']], show: function (c) { return c.how === 'pool'; }, hint: '스레드 풀에 맡길 때만 쓰입니다.' },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '스레드 풀은 어떻게 생겼고, 스레드가 2개인 풀에 일 6개를 맡기면 몇 개의 스레드가 일하나', d: '스레드 2개짜리 풀에 일 6개를 맡깁니다. 이름이 서로 다른 스레드는 2개뿐이고 같은 스레드가 여러 일을 합니다.', v: { how: 'pool', size: '2' } },
    { t: '풀 없이 일마다 새 스레드를 만들면', q: '풀을 쓰지 않고 일마다 new Thread(() -> work()).start() 줄로 새 스레드를 만들면', d: '일 6개에 스레드 6개가 새로 만들어지고, 같은 스레드가 두 일을 하는 일은 없습니다.', v: { how: 'new', size: '2' } },
    { t: '풀의 스레드를 1개로 줄이면', q: '스레드 풀의 스레드 수를 1개로 줄이면', d: '일 6개를 스레드 하나가 차례로 합니다. 나머지 일은 줄에서 기다립니다.', v: { how: 'pool', size: '1' } },
    { t: '풀의 스레드를 6개로 늘리면', q: '스레드 풀의 스레드 수를 6개로 늘리면', d: '일 6개를 스레드 6개가 하나씩 맡습니다. 줄에서 기다리는 일이 없습니다.', v: { how: 'pool', size: '6' } },
  ],
  code: function (c) {
    var o = [];
    if (c.how === 'pool') o.push('import java.util.concurrent.*;', '');
    o.push('public class Main {', '    // 일: 이 줄을 실행한 스레드의 이름을 출력하고 0.05초 쉰다', '    static void work() {', '        String who = Thread.currentThread().getName();', '        System.out.println("일한 스레드: " + who);', '        try { Thread.sleep(50); } catch (InterruptedException e) { }', '    }', '', '    public static void main(String[] args) {');
    if (c.how === 'pool') {
      o.push('        // 스레드 풀: 정해진 수의 스레드를 만들어 돌려 쓴다', '        ExecutorService pool = Executors.newFixedThreadPool(' + c.size + ');', '        for (int i = 1; i <= 6; i++) {', '            // 맡기기: 일을 풀에 넘기면 풀의 스레드가 가져가 실행한다', '            pool.submit(() -> work());', '        }', '        // 정리: 맡긴 일은 끝까지 하고, 그다음 풀의 스레드를 끝낸다', '        pool.shutdown();');
    } else {
      o.push('        for (int i = 1; i <= 6; i++) {', '            // 일마다 새 스레드를 만들어 시작한다', '            new Thread(() -> work()).start();', '        }');
    }
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return c.how === 'pool' ? '스레드 풀(스레드 ' + c.size + '개)에 맡김' : '일마다 new Thread'; },
  columns: ['일한 스레드 수', '일한 스레드 이름', '끝난 일', '같은 스레드가 여러 일을 함'],
  simulate: function (c) {
    var isPool = c.how === 'pool', N = 6, s = isPool ? +c.size : N, ev = [], sum = [];
    function nm(k) { return isPool ? 'pool-1-thread-' + (k + 1) : 'Thread-' + k; }   // k는 0부터 센 스레드 자리
    function jobs(a, b) { var r = []; for (var j = a; j <= b; j++) r.push(j); return r; }
    function range(a, b) { return a === b ? a + '번 일' : a + '번 일부터 ' + b + '번 일까지'; }
    var nameList = s === 1 ? nm(0) : s === 2 ? nm(0) + ', ' + nm(1) : nm(0) + ' ~ ' + nm(N - 1);
    var st = { hot: '', pool: isPool, th: [0, 0, 0, 0, 0, 0], q: [], sub: 0, run: [], done: 0, made: 0, mainEnd: false, arrow: '', checks: [] };
    function push(text, k) { ev.push({ s: text, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function create(a, b) { for (var k = a - 1; k <= b - 1; k++) { st.th[k] = 1; st.made++; st.run.push(k + 1); } st.sub = b; }

    // 1. 시작
    st.hot = 'mn';
    push('java Main으로 실행합니다. main 스레드가 main 메서드를 위에서부터 실행합니다. 이 프로그램이 해야 할 일은 work() 호출 6번이고, work() 메서드는 자기를 실행한 스레드의 이름을 출력하고 0.05초 쉽니다. ' + (isPool ? '이 실습은 6개의 일을 스레드 풀에 맡기고, 풀의 스레드가 일을 하게 합니다.' : '이 실습은 일마다 새 스레드를 만들어 일을 시킵니다.') + ' 지금은 main 스레드뿐이고, 일은 하나도 시작되지 않았습니다.', '');

    if (isPool) {
      // 2. 풀을 만든다
      st.checks.push(['newFixedThreadPool(' + s + ')', '풀이 생김, 스레드는 아직 0개']);
      push('ExecutorService pool = Executors.newFixedThreadPool(' + s + '); 줄: 스레드 풀을 만듭니다. 스레드 풀은 스레드를 정해진 수까지만 만들어 돌려 쓰며 일을 받는 장치이고, 이 풀에 정한 수는 ' + s + '개입니다. 풀을 만든 이 순간에는 스레드가 아직 하나도 만들어지지 않았습니다. 풀의 스레드는 일을 맡길 때 하나씩 만들어집니다.', '');
      // 3. 스레드를 만드는 submit들
      st.arrow = 'sub'; create(1, 1);
      push('for의 첫 바퀴(i가 1)입니다. pool.submit(() -> work()); 줄: submit 메서드는 일을 풀에 맡기는 것이고, 괄호 안의 () -> work() 부분이 맡기는 일입니다. 풀에는 아직 스레드가 없으므로 풀이 스레드를 하나 새로 만들어 1번 일을 시킵니다. 풀이 만든 스레드에는 풀 번호와 스레드 번호가 들어간 ' + nm(0) + ' 같은 이름이 붙습니다. 그 스레드가 work() 메서드를 실행해 일한 스레드: ' + nm(0) + ' 라고 출력합니다. main 스레드는 일이 끝나기를 기다리지 않고 다음 줄로 갑니다.', 'good');
      if (s === 2) {
        create(2, 2);
        push('for의 둘째 바퀴(i가 2)입니다. 같은 줄 pool.submit(() -> work());이 다시 실행됩니다. 스레드가 1개뿐이고 풀에 정한 수(2개)에 아직 못 미치므로, 풀이 두 번째 스레드 ' + nm(1) + '를 만들어 2번 일을 시킵니다. 이제 일하는 스레드는 2개입니다.', 'good');
      } else if (s === N) {
        create(2, N);
        push('for의 둘째 바퀴부터 여섯째 바퀴까지(i가 2~6)도 같은 줄이 실행됩니다. 만들어진 스레드의 수가 풀에 정한 수(6개)에 못 미치는 동안은 일을 맡길 때마다 풀이 스레드를 새로 만들어, 2번 일부터 6번 일까지를 ' + nm(1) + '부터 ' + nm(N - 1) + '까지의 스레드가 하나씩 맡습니다. 스레드는 모두 6개가 되었습니다.', 'good');
      }
      // 4. 줄에 세우는 submit들
      if (s < N) {
        st.q.push(s + 1); st.sub = s + 1;
        push('for의 ' + (s + 1) + '번째 바퀴(i가 ' + (s + 1) + ')입니다. 같은 줄이 실행되지만 이번에는 스레드를 만들지 않습니다. 풀에 정한 수(' + s + '개)만큼 스레드가 이미 있고 모두 일하는 중이기 때문입니다. 풀은 ' + (s + 1) + '번 일을 줄에 세웁니다. 줄은 맡긴 일이 스레드가 비기를 기다리는 곳이고, 먼저 선 일부터 꺼냅니다.', '');
        st.q = jobs(s + 1, N); st.sub = N;
        push('for의 나머지 바퀴(i가 ' + (s + 2) + '~6)에서도 같은 줄이 실행됩니다. 스레드가 모두 일하는 중이어서 ' + range(s + 2, N) + '도 줄에 차례로 섭니다. 줄에서 기다리는 일은 ' + (N - s) + '개가 됩니다.', '');
      }
      st.arrow = '';
      st.checks.push(['pool.submit(…) 6번', '스레드 ' + s + '개가 일하고, 줄에서 기다리는 일 ' + (N - s) + '개']);
      push('for가 끝났습니다. 6개의 일을 모두 맡겼습니다. ' + (s < N ? '지금 ' + s + '개의 일은 스레드가 하고 있고, ' + (N - s) + '개의 일은 줄에서 기다립니다.' : '6개의 일을 스레드 6개가 하나씩 맡았고, 줄에서 기다리는 일은 없습니다.') + ' 만들어진 스레드는 ' + s + '개이고, 일이 더 늘어도 풀은 이 수를 넘겨 스레드를 만들지 않습니다.', 'good');
      // 5. shutdown
      st.mainEnd = true; st.hot = 'mn';
      st.checks.push(['pool.shutdown()', '새 일은 받지 않음, 맡긴 일은 끝까지']);
      push('pool.shutdown(); 줄: main 스레드가 풀에 "새 일은 더 받지 않고, 이미 맡긴 일은 끝까지 하라"고 알립니다. shutdown 메서드는 맡긴 일이 끝나기를 기다리지 않고 바로 돌아오므로, main 메서드는 여기서 끝납니다. 프로그램은 풀의 스레드가 남은 일을 마칠 때까지 계속됩니다. (이 줄을 지우고 실행해 보면, 일을 모두 하고도 풀의 스레드가 남아 프로그램이 끝나지 않았습니다.)', '');
      st.hot = '';
      // 6. 줄에서 이어서 하는 일
      if (s < N) {
        var w1 = jobs(s + 1, Math.min(2 * s, N)), rest = jobs(2 * s + 1, N);
        st.arrow = 'take'; st.done = s; st.run = w1; st.q = rest;
        push(s === 1
          ? nm(0) + ' 스레드가 1번 일을 끝내자, 같은 스레드가 줄 맨 앞의 2번 일을 이어서 가져가 실행합니다. 새 스레드는 만들어지지 않았고, 출력에는 같은 이름이 다시 나옵니다. 스레드는 일 하나를 마쳐도 끝나지 않고 다음 일을 기다립니다.'
          : '스레드가 일을 끝내는 대로 줄 맨 앞의 일을 이어서 가져가 실행합니다. 이 그림에서는 1번 일과 2번 일이 끝나고 3번 일과 4번 일이 시작되는 모습으로 그렸습니다. 새 스레드는 만들어지지 않고, 이미 있는 ' + nm(0) + ' 스레드와 ' + nm(1) + ' 스레드 중 하나가 일을 가져갑니다. 어느 스레드가 어느 일을 가져가는지는 실행마다 다를 수 있어서 그림에 정하지 않았습니다. 같은 스레드가 두 번째 일을 하므로 출력에 같은 이름이 다시 나옵니다.', 'good');
        if (rest.length) {
          st.done = 2 * s; st.run = rest.slice(0, s); st.q = rest.slice(s);
          push(s === 1
            ? '남은 ' + range(3, N) + '도 같은 방식으로, 스레드가 일을 끝낼 때마다 줄 맨 앞의 일을 하나씩 이어서 합니다. 스레드가 하나뿐이라 일은 한 번에 하나씩 번호 순서대로 실행됩니다.'
            : '남은 ' + range(5, N) + '도 같은 방식으로, 스레드가 일을 끝내는 대로 줄에서 가져가 실행합니다. 여기서도 새 스레드는 만들어지지 않습니다.', 'good');
        }
      } else {
        st.arrow = '';
        push('6개의 스레드가 각자 맡은 일을 실행합니다. 줄에서 기다리는 일이 없고, 일마다 스레드가 따로 있어서 출력에 같은 이름이 두 번 나오지 않습니다.', 'good');
      }
      // 7. 끝
      st.arrow = ''; st.done = N; st.run = []; st.q = []; st.th = [3, 3, 3, 3, 3, 3].map(function (v, k) { return k < s ? 3 : 0; });
      st.checks.push(['일한 스레드', s + '개: ' + nameList]);
      push(s < N
        ? 'work() 6번이 모두 끝났습니다. 줄이 비었고 shutdown 메서드가 불려 있으므로 풀의 스레드도 끝납니다. 일한 스레드는 ' + s + '개(' + nameList + ')뿐이고, 일 6개 중 ' + (N - s) + '개는 이미 일한 적이 있는 스레드가 다시 했습니다. 새로 만들어진 스레드는 모두 ' + s + '개입니다.'
        : 'work() 6번이 모두 끝났습니다. 줄이 비었고 shutdown 메서드가 불려 있으므로 풀의 스레드도 끝납니다. 일한 스레드는 6개(' + nameList + ')이고, 일마다 스레드가 따로였으므로 다시 일한 스레드는 없습니다. 풀에 정한 스레드 수가 6개이기 때문에 일 6개가 줄을 서지 않았을 뿐입니다.', 'good');
    } else {
      // 풀 없이 일마다 새 스레드
      st.arrow = 'sub'; create(1, 1);
      st.checks.push(['new Thread(…).start() 6번', '스레드 6개를 새로 시작']);
      push('for의 첫 바퀴(i가 1)입니다. new Thread(() -> work()).start(); 줄: new Thread(…) 부분이 스레드 객체를 만들고, start() 메서드가 새 스레드를 시작합니다. 풀이 없으므로 일을 맡길 곳도 줄도 없고, 이 줄이 실행될 때마다 새 스레드가 생깁니다. 새 스레드에는 이름을 따로 주지 않았으므로 자동으로 붙는 이름은 ' + nm(0) + '입니다. 이 스레드가 1번 일을 실행합니다.', 'good');
      create(2, N);
      push('for의 둘째 바퀴부터 여섯째 바퀴까지(i가 2~6)도 같은 줄이 실행되어, 그때마다 스레드가 하나씩 새로 만들어집니다. 새 스레드의 이름은 ' + nm(1) + '부터 ' + nm(N - 1) + '까지 차례로 붙고, 2번 일부터 6번 일까지를 하나씩 맡습니다. 새로 시작된 스레드는 모두 6개입니다.', 'good');
      st.arrow = ''; st.mainEnd = true;
      push('for가 끝나 main 메서드도 끝납니다. 6개의 일은 각자 자기 스레드가 실행하고 있고, 어떤 일도 줄에서 기다리지 않았습니다.', '');
      st.done = N; st.run = []; st.th = [3, 3, 3, 3, 3, 3];
      st.checks.push(['일한 스레드', '6개: ' + nameList]);
      push('work() 6번이 모두 끝났고, 일을 마친 스레드도 하나씩 끝났습니다. 일한 스레드는 6개(' + nameList + ')였고, 한 스레드가 두 번째 일을 한 적은 없습니다. 일 하나마다 스레드가 새로 만들어졌고, 일을 마친 스레드는 다시 쓰이지 않았습니다.', 'good');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (isPool && s === 2) {
      sum.push('스레드 풀은 스레드를 정해진 수까지만 만들어 돌려 쓰는 장치입니다. 코드에서는 Executors.newFixedThreadPool(2) 줄로 만들고 pool.submit(…) 줄로 일을 맡깁니다. 일 6개를 맡겼지만 일한 스레드는 ' + nameList + ' 2개뿐이었고, 나머지 일은 줄에서 기다렸다가 이미 있는 스레드가 이어서 했습니다.');
      sum.push('스레드의 수는 일의 수가 아니라 풀에 정한 수로 정해지고, 같은 스레드가 여러 일을 했다는 것은 출력에 같은 이름이 되풀이된다는 것으로 알 수 있습니다. 어느 스레드가 어느 일을 하는지는 실행마다 다를 수 있습니다.');
    } else if (isPool && s === 1) {
      sum.push('스레드 수를 1개로 줄이면 일 6개를 ' + nameList + ' 스레드 하나가 차례로 했습니다. 일의 수는 그대로 6개이고, 5개는 줄에서 기다렸다가 번호 순서대로 하나씩 이어서 실행됐습니다.');
      sum.push('풀은 일을 동시에 몇 개까지 하는지를 스레드 수로 정합니다. 스레드가 하나이면 일은 한 번에 하나씩만 실행되므로, 일이 많으면 뒤의 일은 그만큼 오래 기다립니다.');
    } else if (isPool) {
      sum.push('스레드 수를 6개로 늘리면 일 6개를 스레드 6개가 하나씩 맡았습니다. 줄에서 기다린 일이 없고, 같은 스레드가 다시 일한 일도 없었습니다. 이름은 ' + nameList + '였습니다.');
      sum.push('이 표는 일마다 new Thread를 만든 것과 개수가 같아 보입니다. 다른 점은 이 스레드들이 풀에 속해 일이 끝나도 다음 일을 기다린다는 것과, 일이 6개를 넘어도 풀은 스레드를 6개까지만 만든다는 것입니다.');
    } else {
      sum.push('풀 없이 일마다 new Thread를 만들면 일 6개에 스레드 6개가 새로 만들어졌고(' + nameList + '), 같은 스레드가 두 일을 한 적이 없었습니다. 일 하나에 스레드 하나가 새로 쓰이고 일이 끝나면 그 스레드도 끝났습니다.');
      sum.push('이 방법은 스레드 수에 상한이 없어서 일이 늘면 스레드도 그만큼 새로 만들어집니다. 스레드 풀은 이렇게 스레드를 만들고 버리는 부담을 줄이려고, 정한 수의 스레드를 돌려 쓰며 남는 일은 줄에서 기다리게 합니다.');
    }
    var nameArr = []; for (var k = 0; k < s; k++) nameArr.push(nm(k));
    return { events: ev, summary: sum, row: [s + '개', nameArr.join(', '), N + '개', s < N ? '예' : '아니오'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 main 스레드가 main 메서드를 위에서부터 실행하는 것부터 시작합니다.'); return; }
    H.table(v, ['실행한 줄', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '실행');
    H.counters(v, [[s.made, '만들어진 스레드'], [s.done, '끝난 일'], [s.q.length, '줄에서 기다리는 일']]);
  },
  // 그림: 왼쪽에 main, 오른쪽에 풀 영역. 풀 영역 안에 줄(기다리는 일의 번호 상자)과 스레드 여섯 자리. 풀이 없으면 줄이 없고 스레드 자리에 Thread-0~5가 생긴다. 아래에 만들어진 스레드, 끝난 일, 줄에서 기다리는 일을 세는 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, isPool = c.how === 'pool', size = isPool ? +c.size : 6, last = shown[shown.length - 1], s = last ? last.snap : null;
    var th = s ? s.th : [0, 0, 0, 0, 0, 0], q = s ? s.q : [], made = s ? s.made : 0, done = s ? s.done : 0, arrow = s ? s.arrow : '';
    P.size(680, 332);
    P.box('mn', 14, 16, 150, 130, { cls: s && s.hot === 'mn' ? 'hot now' : 'plain', title: 'main', sub: !s ? ['실행 전'] : s.mainEnd ? ['일 ' + s.sub + '개를 맡김', 'main 메서드 끝'] : s.sub ? ['일 ' + s.sub + '개를 맡김'] : ['아직 맡긴 일 없음'] });
    P.region('pl', 216, 8, 450, 262, isPool ? '스레드 풀 (스레드 ' + size + '개까지)' : '풀 없음: 일마다 새 스레드');
    P.region('qu', 228, 36, 140, 226, isPool ? '줄(기다리는 일)' : '줄 없음');
    P.region('th', 418, 36, 236, 226, '스레드');
    if (arrow === 'sub') P.arrow('sub', 'mn:r:0.5', [216, 91], { cls: 'hot' });
    if (arrow === 'take') P.arrow('take', [368, 150], [418, 150], { cls: 'hot' });
    if (isPool) {
      q.forEach(function (j, i) { P.box('j' + j, 236 + (i % 2) * 66, 68 + Math.floor(i / 2) * 34, 62, 28, { cls: 'wait', sub: j + '번 일', center: true }); });
      if (!q.length) P.text('noq', 298, 150, '비어 있음', { cls: 'mut', anchor: 'middle' });
    } else {
      P.text('noq', 298, 150, '맡길 풀이 없음', { cls: 'mut', anchor: 'middle' });
    }
    for (var i = 0; i < 6; i++) {
      var name = isPool ? 'pool-1-thread-' + (i + 1) : 'Thread-' + i, y = 66 + i * 32;
      if (isPool && i >= size) P.box('t' + i, 426, y, 220, 26, { cls: 'ghost', title: '(이 풀에는 없음)' });
      else if (th[i] === 1) P.box('t' + i, 426, y, 220, 26, { cls: 'hot', title: name, right: '일하는 중' });
      else if (th[i] === 3) P.box('t' + i, 426, y, 220, 26, { cls: 'plain', title: name, right: '끝남' });
      else P.box('t' + i, 426, y, 220, 26, { cls: 'ghost', title: name, right: '아직 안 만듦' });
    }
    P.box('c1', 14, 284, 208, 36, { cls: made ? 'wait' : 'ghost', title: '만들어진 스레드', right: made + '개' });
    P.box('c2', 236, 284, 208, 36, { cls: done ? 'good' : 'ghost', title: '끝난 일', right: done + '/6' });
    P.box('c3', 458, 284, 208, 36, { cls: q.length ? 'wait' : 'ghost', title: '줄에서 기다리는 일', right: q.length + '개' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 이 JDK의 java를 자식 프로세스로 띄워 조합마다 20번씩 실제로 실행해 대조했습니다. 120번의 실행 모두 종료 코드는 0이고 표준 오류는 비어 있었습니다. 대조한 것은 출력된 "일한 스레드" 줄의 수(끝난 일), 그 줄에 나온 스레드 이름의 서로 다른 것의 수와 정렬한 목록(20번 모두 같았습니다), 그리고 자식 프로세스의 시작 클래스가 Main.main을 부르기 전과 뒤에 ThreadMXBean의 getTotalStartedThreadCount() 메서드로 읽어 잰 새로 시작된 스레드의 수(스레드 풀 2개, 1개, 6개일 때 각각 2, 1, 6이고 new Thread일 때 6)입니다. 어느 스레드가 3번 일부터 6번 일을 하는지는 실행마다 달라서 비교하지 않았고, 화면의 그림은 1번 일과 2번 일이 끝난 뒤 3번 일과 4번 일이 시작되는 식의 한 가지 모습으로 그렸습니다. 단계 문장이 기대는 사실은 따로 만든 소스를 20번씩 실행해 확인했습니다. 풀을 만든 직후에는 시작된 스레드가 0개이고 일을 맡길 때마다 풀의 스레드 수까지 하나씩 만들어지는 것, 일 6개를 맡긴 직후 줄에서 기다리는 일이 스레드 2개일 때 4개, 1개일 때 5개, 6개일 때 0개인 것, 1번 일과 2번 일은 pool-1-thread-1과 pool-1-thread-2가 맡고 풀 스레드가 6개이면 번호 k인 일을 pool-1-thread-k가 맡고 new Thread이면 번호 k인 일을 Thread-(k-1)이 맡는 것, 일이 시작되는 차례가 (스레드 수)개씩 묶음으로 번호 순서를 따르는 것, 동시에 일한 일의 최대 수가 스레드 2개일 때 2, 1개일 때 1, 6개일 때 6, new Thread일 때 6인 것, shutdown 뒤의 "main 끝" 줄이 일의 출력보다 먼저 찍혀 shutdown이 일이 끝나기를 기다리지 않고 돌아오는 것, shutdown 줄을 지우면 일 6개를 다 하고도 5초 안에 프로그램이 끝나지 않아 강제로 끝내야 했던 것입니다. 일이 끝난 뒤 풀의 스레드가 0개가 되는 것도 확인했습니다. 문서는 Java SE 21 API 문서의 Executors(newFixedThreadPool, defaultThreadFactory)와 ExecutorService(shutdown, submit, 클래스 설명), Java Tutorials의 "Thread Pools"를 직접 열어 확인했습니다. 어느 때든 일하는 스레드는 정한 수 이하이고 남는 일은 줄에서 기다린다는 것, 풀의 스레드는 shutdown할 때까지 남는다는 것, 풀이 만드는 스레드의 이름이 pool-N-thread-M 꼴이라는 것, shutdown이 일이 끝나기를 기다리지 않는다는 것은 문서에 있는 내용입니다. 스레드가 풀을 만들 때가 아니라 일을 맡길 때 하나씩 만들어진다는 것은 문서가 아니라 이 JDK에서 관찰한 것이고(Tutorials에는 고정 풀이 항상 정해진 수의 스레드가 실행 중이라고 적혀 있어 표현이 다릅니다), 줄에서 먼저 선 일부터 꺼낸다는 것도 문서가 아니라 관찰입니다. 같은 이유로 일이 6개를 넘어도 풀이 6개를 넘겨 스레드를 만들지 않는다는 것은 문서의 설명이고 7개 이상의 일로 실행해 보지는 않았습니다. 스레드를 만들고 시작하는 비용의 크기는 재지 않았습니다. 일을 마친 스레드가 끝난다는 그림은 코드의 구조에서 오는 것입니다. 이 밖에 풀의 스레드 수와 줄의 크기를 따로 정하는 ThreadPoolExecutor, 일이 끝나기를 기다리는 awaitTermination, 결과를 돌려받는 Future와 Callable, 일이 예외로 끝난 경우는 다루지 않았습니다. 화면의 코드에서 import 줄은 스레드 풀을 쓸 때만 보입니다. 스레드 풀에서 줄을 서는 일의 처리와 풀 크기에 따른 변화는 "세부 동작 실습: 스레드 풀"에서, 같은 생각으로 데이터베이스 연결을 돌려 쓰는 것은 "커넥션 풀과 OSIV"에서 다룹니다(이 실습에서는 커넥션 풀을 실행하지 않았습니다).',
});
