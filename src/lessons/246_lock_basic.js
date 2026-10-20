Lab.register({
  id: 'lock_basic', nav: '락(synchronized)', cat: '기초개념', mode: 'step', basic: true, deep: ['race', 'deadlock'],
  title: '락은 무엇이고, 없으면 무슨 일이 생기는가',
  why: '여러 스레드가 같은 값을 고치는 프로그램에서, 다른 스레드가 언제 끼어들지를 프로그래머가 일일이 따지기는 어렵고, 틀린 결과도 가끔씩만 나와 찾아내기 힘들다. 자바의 synchronized는 "이 구역은 한 번에 한 스레드만"이라는 락을 키워드 하나로 걸게 해서, 여러 스레드가 동시에 돌아도 그 구역만큼은 한 스레드씩 차례로 실행되게 한다.',
  use: '여러 요청이 동시에 오는 서버에서, 같은 객체의 값을 여러 스레드가 함께 고치는 곳을 지킬 때 쓴다. 단순히 수를 세는 일에는 AtomicInteger를, 여러 스레드가 함께 쓰는 Map에는 ConcurrentHashMap을 대신 쓰는 일이 많다. synchronized는 한 프로그램(JVM)의 스레드끼리만 막으므로, 서버가 여러 대이면 DB의 락 같은 다른 방법을 쓴다.',
  intro: '락은 "한 번에 한 스레드만 이 구역을 실행한다"는 표시입니다. 이 코드에서 락을 거는 부분은 add 메서드 선언 앞의 synchronized입니다. add가 하는 일은 count++ 한 줄인데, 이 한 줄은 count의 값을 읽고, 1을 더하고, 더한 값을 count에 쓰는 세 동작입니다. 스레드 두 개가 같은 count를 동시에 고치면, 한 스레드가 값을 읽은 뒤 쓰기 전에 다른 스레드가 count를 바꿔 놓아 한쪽의 증가가 사라질 수 있습니다. synchronized가 붙으면 스레드는 add에 들어가기 전에 락을 잡아야 하고, 락은 한 번에 한 스레드만 잡을 수 있어서 다른 스레드는 앞 스레드가 add를 나올 때까지 기다립니다. 이 실습은 synchronized를 붙였다 떼고 스레드를 2개와 1개로 바꿔 가며 같은 코드를 컴파일하고 실제로 실행해, 마지막에 출력되는 count를 봅니다. (스레드를 만들어 start와 join으로 다루는 것은 "스레드" 실습에서 다룹니다. static은 count와 add가 프로그램에 하나씩만 있다는 뜻으로 보고, 이 실습에서는 자세히 다루지 않습니다.)',
  terms: ['락(lock)과 모니터', 'synchronized', 'count++의 세 동작', '경쟁 상태(Race Condition)'],
  controls: [
    { id: 'sync', label: 'add 메서드에 synchronized 키워드를 붙인다', type: 'check', value: true },
    { id: 'threads', label: 'add()를 100000번씩 부르는 스레드', type: 'select', value: '2', options: [['2', '스레드 2개 (t1, t2)'], ['1', '스레드 1개 (t1)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '락은 어떻게 생겼고, 스레드 2개가 add()를 100000번씩 부르면 count는 얼마가 되나', d: 'add에 synchronized가 붙어 있고 스레드가 2개입니다. 한 번에 한 스레드만 add를 실행해 count가 200000이 됩니다.', v: { sync: true, threads: '2' } },
    { t: 'synchronized를 지우면', q: 'add 선언 앞의 synchronized 키워드를 지우면', d: '두 스레드가 count를 읽고 쓰는 사이에 서로 끼어들어, 대개 200000보다 작은 값이 나옵니다(스레드가 겹치지 않으면 200000이 나올 수도 있습니다). 값은 실행마다 다릅니다.', v: { sync: false, threads: '2' } },
    { t: '스레드를 1개만 쓰면', q: 'synchronized 키워드 없이 스레드를 t1 하나만 쓰면', d: '끼어들 다른 스레드가 없어서 락이 없어도 count는 100000입니다.', v: { sync: false, threads: '1' } },
    { t: '스레드 1개에 synchronized를 붙이면', q: '스레드가 t1 하나인데 synchronized 키워드를 붙여 두면', d: '락을 잡아도 기다리는 스레드가 없어서 결과는 락이 없을 때와 같습니다.', v: { sync: true, threads: '1' } },
  ],
  code: function (c) {
    var two = c.threads === '2', o = ['public class Main {', '    // 두 스레드가 함께 고치는 변수. 프로그램에 하나뿐이다', '    static int count = 0;', ''];
    if (c.sync) o.push('    // 락: synchronized를 붙이면 한 번에 한 스레드만 실행한다');
    o.push('    static ' + (c.sync ? 'synchronized ' : '') + 'void add() {', '        // count++는 읽기, 더하기, 쓰기 세 동작이다', '        count++;', '    }', '',
      '    public static void main(String[] args) throws Exception {', '        // 스레드가 할 일: add()를 100000번 부른다', '        Runnable job = () -> {', '            for (int i = 0; i < 100000; i++) {', '                add();', '            }', '        };', '        Thread t1 = new Thread(job);');
    if (two) o.push('        // 두 번째 스레드: 같은 일을 한다', '        Thread t2 = new Thread(job);');
    o.push('        t1.start();');
    if (two) o.push('        t2.start();');
    o.push('        t1.join();');
    if (two) o.push('        t2.join();');
    o.push('        System.out.println(count);', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.sync ? 'synchronized 있음' : 'synchronized 없음') + ' · 스레드 ' + c.threads + '개'; },
  columns: ['count의 마지막 값', '기대한 값', '사라진 증가'],
  simulate: function (c) {
    var S = c.sync, two = c.threads === '2', expect = two ? 200000 : 100000, ev = [], sum = [];
    var racy = !S && two;
    var last = racy ? '대개 200000보다 작은 값 (실행마다 다름)' : String(expect);
    var st = { hot: '', t: [{ cls: 'ghost', sub: ['시작 전'] }, { cls: 'ghost', sub: [two ? '시작 전' : '만들지 않음'] }], holder: '', inside: [], cnt: null, rd: [null, null], lost: 0, a1: '', a2: '', rw: '', fin: false, res: ['', '', ''], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var lockLine = '이 add는 synchronized가 붙어 있으므로, 부른 스레드는 안에 들어가기 전에 락을 잡아야 합니다. static 메서드의 락은 Main 클래스에 딸린 락 하나이고, 락은 한 번에 한 스레드만 잡을 수 있습니다. 락을 잡은 스레드가 add를 나오면 락이 풀립니다.';

    // 1. 변수
    st.hot = 'cn'; st.checks.push(['static int count = 0;', 'count 변수 하나, 값 0']);
    push('java Main으로 실행합니다. 맨 위의 static int count = 0; 줄로 count라는 변수가 하나 만들어지고 값은 0입니다. 이 변수는 하나뿐이어서, 프로그램의 모든 스레드가 같은 count를 읽고 씁니다. main 스레드가 main 메서드를 위에서부터 실행합니다.', '');

    // 2. 스레드 시작
    st.hot = '';
    st.t[0] = { cls: 'plain', sub: ['add()를 100000번', '부르는 중'] }; st.a1 = 'hot';
    if (two) { st.t[1] = { cls: 'plain', sub: ['add()를 100000번', '부르는 중'] }; st.a2 = 'hot'; }
    st.checks.push([two ? 't1.start(), t2.start()' : 't1.start()', two ? '스레드 2개가 함께 시작' : '스레드 1개가 시작']);
    if (two) push('main이 Runnable job을 만듭니다. job은 "add()를 100000번 부르라"고 적어 둔 일입니다. main은 같은 job을 Thread t1과 t2에 맡기고 t1.start(), t2.start()를 부릅니다. 이제 스레드 두 개가 각자 add()를 100000번 부르기 시작합니다. main은 t1.join(), t2.join()에서 둘이 끝나기를 기다립니다.', '');
    else push('main이 Runnable job을 만듭니다. job은 "add()를 100000번 부르라"고 적어 둔 일입니다. main은 이 job을 Thread t1에 맡기고 t1.start()를 부릅니다. 이제 스레드 t1 하나가 add()를 100000번 부르기 시작합니다. main은 t1.join()에서 t1이 끝나기를 기다릴 뿐 count를 건드리지 않습니다.', '');

    // 3. count++의 세 동작
    st.hot = 'ad'; st.a1 = ''; st.a2 = '';
    st.checks.push(['count++', '읽기, 더하기, 쓰기 세 동작']);
    push('add() 안의 count++ 한 줄은 한 덩어리가 아니라 세 동작입니다. 1) count의 현재 값을 읽는다. 2) 읽은 값에 1을 더한다. 3) 더한 값을 count에 쓴다. ' + (S ? lockLine : 'add에는 synchronized가 붙어 있지 않아서, 스레드가 몇 개든 add 안에 들어가는 데 아무 제한이 없습니다.'), '');
    st.hot = '';

    // 4~. 예시 장면
    st.cnt = 5;
    if (racy) {
      st.inside = ['t1']; st.rd[0] = 5; st.hot = 't1'; st.rw = 'hot'; st.a1 = 'hot';
      st.t[0] = { cls: 'hot', sub: ['count를 읽음: 5'] };
      st.checks.push(['예: t1이 count를 읽음', '5']);
      push('끼어드는 경우의 한 예를 따라가 봅니다(숫자는 예로 든 것입니다). 100000번씩 부르는 도중에 count가 5라고 합시다. t1이 add()에 들어가 count를 읽어 5를 얻습니다. 아직 쓰지 않았습니다.', '');
      st.inside = ['t1', 't2']; st.rd[1] = 5; st.hot = 't2'; st.a2 = 'hot';
      st.t[1] = { cls: 'hot', sub: ['count를 읽음: 5'] };
      st.checks.push(['예: t2도 count를 읽음', '5']);
      push('t1이 쓰기 전에 t2도 add()에 들어옵니다. 락이 없으므로 들어가는 것을 막는 것이 없고, t2도 count를 읽습니다. count는 아직 5이므로 t2도 5를 얻습니다.', '');
      st.cnt = 6; st.hot = 'cn'; st.a2 = '';
      st.t[0] = { cls: 'plain', sub: ['읽은 5에 1을 더해', '6을 씀'] };
      st.inside = ['t2']; st.rd[0] = null;
      st.checks.push(['예: t1이 6을 씀', 'count = 6']);
      push('t1이 읽어 둔 5에 1을 더한 6을 count에 씁니다. count는 6이 됩니다.', '');
      st.hot = 't2'; st.lost = 1; st.inside = []; st.rd[1] = null; st.a1 = ''; st.a2 = 'hot';
      st.t[1] = { cls: 'bad', sub: ['읽어 둔 5에 1을 더해', '6을 씀'] };
      st.checks.push(['예: t2가 6을 씀', { v: 'count = 6, 증가 하나 사라짐', cls: 'bad' }]);
      push('t2가 자기가 읽어 둔 5에 1을 더한 6을 count에 씁니다. t2는 그사이 t1이 count를 6으로 올린 것을 모르고 있어서, count는 7이 아니라 6 그대로입니다. 증가 하나가 사라졌습니다.', 'bad');
    } else if (S && two) {
      st.holder = 't1'; st.inside = ['t1']; st.rd[0] = 5; st.hot = 't1'; st.rw = 'hot'; st.a1 = 'hot';
      st.t[0] = { cls: 'hot', sub: ['락을 잡고 add() 안', 'count를 읽음: 5'] };
      st.checks.push(['예: t1이 락을 잡고 count를 읽음', '5']);
      push('락이 있는 경우의 한 예를 따라가 봅니다(숫자는 예로 든 것입니다). 100000번씩 부르는 도중에 count가 5라고 합시다. t1이 먼저 add()를 부릅니다. 락이 비어 있어 t1이 락을 잡고 안에 들어가, count를 읽어 5를 얻습니다.', '');
      st.hot = 't2'; st.a2 = 'dash'; st.rw = '';
      st.t[1] = { cls: 'wait', sub: ['add()를 불렀지만', '락이 없어 기다리는 중'] };
      st.checks.push(['예: t2가 add()를 부름', { v: '락을 t1이 쥐고 있어 기다림', cls: 'good' }]);
      push('이때 t2도 add()를 부릅니다. 락은 t1이 잡고 있습니다. t2는 add 안으로 들어가지 못하고, 락이 풀릴 때까지 기다립니다. count를 읽지도 않습니다.', 'good');
      st.cnt = 6; st.hot = 'cn'; st.holder = ''; st.inside = []; st.rd[0] = null; st.a1 = ''; st.a2 = ''; st.rw = 'hot';
      st.t[0] = { cls: 'plain', sub: ['6을 쓰고 add()를 나옴', '락을 풂'] };
      st.t[1] = { cls: 'wait', sub: ['락이 풀려', '이제 잡을 수 있음'] };
      st.checks.push(['예: t1이 6을 쓰고 나옴', 'count = 6, 락이 풀림']);
      push('t1이 읽어 둔 5에 1을 더한 6을 count에 쓰고 add()를 나옵니다. 읽기, 더하기, 쓰기 세 동작을 중간에 끼어드는 것 없이 끝냈고, 나오면서 락이 풀립니다. 기다리던 t2는 이제 락을 잡을 수 있습니다.', '');
      st.hot = 't2'; st.holder = 't2'; st.inside = ['t2']; st.rd[1] = 6; st.a2 = 'hot'; st.rw = 'hot';
      st.t[1] = { cls: 'hot', sub: ['락을 잡고 add() 안', 'count를 읽음: 6'] };
      st.checks.push(['예: t2가 락을 잡고 count를 읽음', '6']);
      push('락이 풀리자 t2가 락을 잡고 add 안으로 들어갑니다. 이번에 count를 읽으면 t1이 쓴 6을 얻습니다.', '');
      st.cnt = 7; st.hot = 'cn'; st.holder = ''; st.inside = []; st.rd[1] = null; st.a2 = ''; st.rw = 'hot';
      st.t[1] = { cls: 'good', sub: ['7을 쓰고 add()를 나옴', '락을 풂'] };
      st.checks.push(['예: t2가 7을 쓰고 나옴', { v: 'count = 7, 증가 둘 다 반영', cls: 'good' }]);
      push('t2가 읽어 둔 6에 1을 더한 7을 count에 쓰고 add()를 나오면서 락을 풉니다. 증가 둘이 모두 count에 반영되어 5에서 7이 되었습니다.', 'good');
    } else if (S) {
      st.holder = 't1'; st.inside = ['t1']; st.rd[0] = 5; st.hot = 't1'; st.rw = 'hot'; st.a1 = 'hot';
      st.t[0] = { cls: 'hot', sub: ['락을 잡고 add() 안', 'count를 읽음: 5'] };
      st.checks.push(['예: t1이 락을 잡고 count를 읽음', '5']);
      push('한 번의 add()를 따라가 봅니다(숫자는 예로 든 것입니다). 100000번 부르는 도중에 count가 5라고 합시다. t1이 add()를 부르면 락이 비어 있어 t1이 락을 잡고 들어갑니다. 락을 잡으려는 다른 스레드가 없으므로 기다리는 일은 없습니다. t1이 count를 읽어 5를 얻습니다.', '');
      st.cnt = 6; st.hot = 'cn'; st.holder = ''; st.inside = []; st.rd[0] = null; st.a1 = '';
      st.t[0] = { cls: 'plain', sub: ['6을 쓰고 add()를 나옴', '락을 풂'] };
      st.checks.push(['예: t1이 6을 쓰고 나옴', 'count = 6, 락이 풀림']);
      push('t1이 1을 더한 6을 쓰고 add()를 나오면서 락을 풉니다. 다음 add() 호출에서도 락을 잡았다 풀기를 되풀이하지만, 락을 두고 겨룰 다른 스레드가 없습니다.', '');
    } else {
      st.inside = ['t1']; st.rd[0] = 5; st.hot = 't1'; st.rw = 'hot'; st.a1 = 'hot';
      st.t[0] = { cls: 'hot', sub: ['count를 읽음: 5'] };
      st.checks.push(['예: t1이 count를 읽음', '5']);
      push('한 번의 add()를 따라가 봅니다(숫자는 예로 든 것입니다). 100000번 부르는 도중에 count가 5라고 합시다. t1이 add()에 들어가 count를 읽어 5를 얻습니다. 지금 count를 읽거나 쓰는 스레드는 t1뿐입니다. main은 join에서 기다리고 있습니다.', '');
      st.cnt = 6; st.hot = 'cn'; st.inside = []; st.rd[0] = null; st.a1 = '';
      st.t[0] = { cls: 'plain', sub: ['읽은 5에 1을 더해', '6을 씀'] };
      st.checks.push(['예: t1이 6을 씀', 'count = 6']);
      push('t1이 읽어 둔 5에 1을 더한 6을 count에 씁니다. 읽고 쓰는 사이에 count를 바꿀 다른 스레드가 없으므로, 읽어 둔 5는 쓰는 순간에도 count의 값 그대로입니다. count는 6이 됩니다.', '');
    }

    // 마지막. 끝나고 출력
    st.hot = 'r1'; st.cnt = null; st.lost = 0; st.holder = ''; st.inside = []; st.rd = [null, null]; st.a1 = ''; st.a2 = ''; st.rw = ''; st.fin = true;
    st.t[0] = { cls: 'good', sub: ['add()를 100000번 마침'] };
    if (two) st.t[1] = { cls: 'good', sub: ['add()를 100000번 마침'] };
    st.res = [last, String(expect), racy ? '있음 (실행마다 다름)' : '없음'];
    st.checks.push([two ? 'join 뒤 println(count)' : 'join 뒤 println(count)', { v: last, cls: racy ? 'bad' : 'good' }]);
    if (racy) push('이런 끼어들기가 100000번씩 부르는 동안 여러 번 생깁니다. 어느 순간에 끼어드는지는 실행할 때마다 달라서, ' + (two ? 't1.join()과 t2.join()으로 두 스레드가 끝난 뒤' : '') + ' println(count)가 출력하는 값은 대개 200000보다 작고 실행할 때마다 다릅니다. 사라진 증가의 수도 실행마다 다릅니다.', 'bad');
    else if (S && two) push('이렇게 add()를 부를 때마다 안에는 한 스레드만 있었으므로 증가가 사라지지 않습니다. t1.join()과 t2.join()으로 두 스레드가 끝난 뒤 println(count)가 200000을 출력합니다. 몇 번을 실행해도 같은 값입니다. 대신 락을 잡은 스레드가 나올 때까지 다른 스레드는 기다려야 합니다.', 'good');
    else push('t1이 100000번을 모두 이렇게 마치고 끝납니다. t1.join()이 돌아오고, println(count)가 ' + expect + '을 출력합니다. ' + (S ? '락이 있어도 결과는 락이 없을 때와 같습니다.' : 'synchronized가 없어도 틀리지 않았습니다.') + ' 몇 번을 실행해도 같은 값입니다.', 'good');

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (S && two) {
      sum.push('락을 건 add()는 한 번에 한 스레드만 실행하므로, 스레드 2개가 100000번씩 불러도 count는 200000이 됩니다. 락은 "한 번에 한 스레드만 이 구역을 실행한다"는 표시이고, 자바에서는 메서드 선언 앞에 synchronized를 붙여 겁니다.');
      sum.push('count++의 읽기, 더하기, 쓰기가 한 스레드 안에서 끊기지 않고 끝나므로 증가가 사라지지 않았습니다. 그 대가로 락을 잡은 스레드가 나올 때까지 다른 스레드는 기다립니다.');
    } else if (racy) {
      sum.push('synchronized를 지우면 스레드 2개가 add() 안에서 서로 끼어들어, 마지막 count가 대개 200000보다 작은 값이 되었고 증가가 사라졌습니다. 실행할 때마다 값이 달랐습니다.');
      sum.push('오류도 예외도 나지 않고 틀린 값만 조용히 나옵니다. 읽기, 더하기, 쓰기 사이에 다른 스레드가 count를 바꾸면, 읽어 둔 오래된 값으로 덮어써서 그 증가가 없던 일이 됩니다.');
    } else if (!S) {
      sum.push('synchronized가 없어도 스레드가 하나뿐이면 count는 100000입니다. count를 고치는 스레드가 t1뿐이라, 읽고 쓰는 사이에 끼어들 스레드가 없습니다.');
      sum.push('락이 필요한 때는 같은 변수를 고치는 스레드가 둘 이상일 때입니다. 스레드 하나로 시험해 맞았다고 해서, 스레드가 늘어나도 맞다는 뜻은 아닙니다.');
    } else {
      sum.push('스레드가 하나뿐이면 synchronized를 붙여 두어도 count는 100000이고, 락이 없을 때와 결과가 같습니다. 락을 두고 겨루는 다른 스레드가 없어서 기다리는 스레드도 없습니다.');
      sum.push('락은 맞는 결과를 바꾸지 않고, 여러 스레드가 겹칠 때 틀린 결과를 막습니다. 스레드를 2개로 바꾸면 락이 있을 때와 없을 때의 차이가 드러납니다.');
    }
    return { events: ev, summary: sum, expect: expect, row: [last, String(expect), racy ? '있음 (실행마다 다름)' : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 count 변수가 만들어지는 것부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '실행');
    if (s.cnt !== null) H.counters(v, [[s.cnt, '예시 장면의 count'], [s.lost, '예시 장면에서 사라진 증가']]);
  },
  // 그림: 왼쪽에 스레드 t1, t2, 가운데에 add 메서드(락이 걸리는 구역), 오른쪽에 모두가 함께 쓰는 count. 스레드에서 add로 들어가는 화살표가 점선이면 락 때문에 기다리는 것. 아래에 마지막 count, 기대한 값, 사라진 증가를 적는 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, two = c.threads === '2';
    P.size(680, 336);
    var hot = s ? s.hot : '';
    function cls(id, base) { return hot === id ? (base === 'plain' ? 'hot now' : base + ' now') : base; }
    var t0 = s ? s.t[0] : { cls: 'ghost', sub: ['시작 전'] }, t1 = s ? s.t[1] : { cls: 'ghost', sub: [two ? '시작 전' : '만들지 않음'] };
    P.box('t1', 14, 16, 180, 84, { cls: cls('t1', t0.cls), title: 'Thread t1', sub: t0.sub });
    P.box('t2', 14, 112, 180, 84, { cls: cls('t2', t1.cls), title: 'Thread t2', sub: t1.sub });
    var adSub = c.sync ? ['synchronized 붙음', '락을 잡은 스레드: ' + (s && s.holder ? s.holder : '없음')] : ['synchronized 안 붙음', '안에 있는 스레드: ' + (s && s.inside.length ? s.inside.join(', ') : '없음')];
    P.box('ad', 244, 16, 190, 180, { cls: cls('ad', c.sync ? (s && s.holder ? 'wait' : 'plain') : 'plain'), title: 'add() 메서드', sub: adSub });
    var rd = s ? s.rd : [null, null], rdTxt = [];
    if (rd[0] !== null) rdTxt.push('t1이 읽어 둔 값: ' + rd[0]);
    if (rd[1] !== null) rdTxt.push('t2가 읽어 둔 값: ' + rd[1]);
    P.box('cn', 484, 16, 182, 180, { cls: cls('cn', 'plain'), title: 'count', sub: [s && s.cnt !== null ? '예시 장면의 값: ' + s.cnt : '값: ' + (s && s.fin ? '(끝남)' : 0)].concat(rdTxt) });
    if (s && s.a1) P.arrow('a1', 't1:r:0.5', 'ad:l:0.25', { cls: s.a1 });
    if (s && s.a2) P.arrow('a2', 't2:r:0.5', 'ad:l:0.75', { cls: s.a2 });
    if (s && s.rw) P.arrow('rw', 'ad:r:0.5', 'cn:l:0.5', { cls: s.rw });
    var done = s && s.fin;
    P.box('r1', 14, 208, 652, 36, { cls: done ? (c.sync || !two ? 'good' : 'bad') : 'ghost', title: 'count의 마지막 값 (println이 출력)', right: done ? s.res[0] : '' });
    P.box('r2', 14, 250, 652, 36, { cls: done ? 'plain' : 'ghost', title: '기대한 값', right: done ? s.res[1] : '' });
    P.box('r3', 14, 292, 652, 36, { cls: done ? (s.res[2] === '없음' ? 'good' : 'bad') : 'ghost', title: '사라진 증가', right: done ? s.res[2] : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 네 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 이 JDK의 java를 자식 프로세스로 띄워 조합마다 30번씩 실제로 실행해 마지막에 출력된 count를 모아 대조했습니다. 120번의 실행 모두 종료 코드는 0이고 표준 오류는 비어 있었습니다. synchronized가 있는 두 조합은 스레드 2개일 때 30번 모두 200000, 1개일 때 30번 모두 100000이었습니다. synchronized가 없고 스레드가 1개인 조합도 30번 모두 100000이었습니다. synchronized가 없고 스레드가 2개인 조합은 30번 모두 200000보다 작았고, 서로 다른 값이 30가지(119684에서 155244 사이)였습니다. 그래서 이 조합의 결과 칸은 고정된 숫자가 아니라 "200000보다 작은 값 (실행마다 다름)"으로 적었습니다. 검증 실행(JDK 21, 논리 프로세서 12개)에서 본 결과이고, 얼마나 사라지는지는 컴퓨터와 실행 때마다 달라질 수 있어 사라지는 양을 화면에서 단정하지 않았습니다. 장면에 나오는 5, 6, 7이라는 숫자와 t1, t2가 끼어드는 순서는 원리를 보이려고 고른 한 예이고, 실제 실행에서 그 순서를 관찰한 것은 아닙니다. 실제 실행에서 사라진 증가는 이 예의 한 번보다 훨씬 많았는데(기대한 값보다 44756에서 80316 모자랐습니다), 왜 그만큼 사라지는지는 따로 쪼개 확인하지 않았습니다. 이 실습이 확인한 것은 "사라진다"는 사실과 세 동작으로 나뉜다는 사실이고, 그 두 가지가 사라진 양을 어떻게 만드는지는 확인하지 않았습니다. 단계 문장이 기대는 사실은 따로 만든 소스로 확인했습니다. 첫째, 같은 소스에서 add() 안의 count++를 javap로 보면 getstatic(읽기), iconst_1과 iadd(1을 더하기), putstatic(쓰기)의 순서입니다. 둘째, t1이 static synchronized 메서드 안에서 락을 쥐고 있는 동안 t2가 같은 메서드를 부르면 t2의 상태가 BLOCKED이고, 그 락이 Main 클래스 객체의 것임을 Thread.holdsLock(Main.class)가 true로 보였으며, 둘이 끝난 뒤 count는 2였습니다(30번 모두 같았습니다). 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. 한 번에 한 스레드만 모니터의 락을 쥘 수 있고 다른 스레드는 쥘 수 있을 때까지 멈춘다는 것과 static 메서드는 Class 객체의 모니터를 쓴다는 것은 17.1절을, synchronized 메서드가 실행 전에 모니터를 얻고 static 메서드는 Class 객체의 모니터를, 인스턴스 메서드는 this의 모니터를 쓴다는 것은 8.4.3.6절을, 락을 푸는 것이 메서드가 끝날 때 자동으로 일어난다는 것은 8장 첫머리의 설명을 따랐습니다. 8.4.3.6절 자체에는 풀리는 때가 적혀 있지 않았습니다. 한 스레드가 락을 푼 것은 그 뒤에 같은 락을 잡는 스레드보다 먼저 일어난 것으로 정해진다는 것은 17.4.5절의 내용이며 이 실습에서는 값이 보이는 문제를 따로 다루지 않았습니다. count++가 값을 가져오고, 1을 더하고, 다시 저장하는 세 단계로 나뉘며 두 스레드의 단계가 섞이면 갱신이 사라질 수 있다는 것은 Java Tutorials의 Synchronization 절 중 Thread Interference와 Synchronized Methods를 열어 확인했습니다. 다만 어느 문서도 이 코드에서 몇 번이 사라지는지는 정하지 않으며, 그것은 이 JDK에서 실행해 본 값입니다. 문서는 웹 페이지 요약을 거쳐 읽었고 원문 전체를 직접 읽지는 않았습니다. 화면의 코드는 java.lang 안의 클래스만 쓰므로 import 줄이 없습니다. 이 밖에 synchronized 블록, 객체마다 따로 있는 락(인스턴스 메서드), volatile과 AtomicInteger, 락이 풀리는 순서와 공정성, 락이 서로를 기다려 멈추는 교착 상태는 다루지 않았고, 사라지는 원리와 락의 비교는 "세부 동작 실습: 경쟁 상태", 교착 상태는 "세부 동작 실습: 교착 상태"에서 다룹니다.',
});
