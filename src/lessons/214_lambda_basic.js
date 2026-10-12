Lab.register({
  id: 'lambda_basic', nav: '람다', cat: '기초개념', mode: 'step', basic: true, deep: ['lambda'],
  title: '람다는 무엇을 줄여 쓴 것인가',
  intro: '람다는 화살표(->)로 적는 짧은 코드입니다. () -> System.out.println("일한다")는 "메서드가 하나뿐인 인터페이스를 구현한 객체"를 짧게 적은 것입니다. 여기서는 run 메서드 하나만 있는 Task 인터페이스를 쓰고, 화살표 뒤의 코드가 run이 할 일입니다. 같은 일을 길게 쓰면 Task를 구현한 클래스를 만들고 new로 객체를 만드는 코드가 됩니다. 이 실습은 람다를 익명 클래스와 이름 있는 클래스로 풀어 적어 결과가 같은지 보고, 람다를 적은 줄에서 화살표 뒤의 코드가 실행되는지, t.run()을 지우거나 두 번 부르면 어떻게 되는지, Task에 메서드가 하나 더 있으면 어떻게 되는지, 같은 코드를 컴파일하고 실행해 봅니다.',
  terms: ['람다 표현식', '함수형 인터페이스', '익명 클래스', '인터페이스'],
  controls: [
    { id: 'form', label: 'run이 할 일을 적는 방법', type: 'select', value: 'lambda', options: [['lambda', '람다로 적는다: () -> …'], ['anon', '익명 클래스로 풀어 적는다: new Task() { … }'], ['named', '이름 있는 클래스로 풀어 적는다: class Work implements Task']] },
    { id: 'call', label: 'main에서 t.run()을 부르는 줄', type: 'select', value: 'once', options: [['once', 't.run()을 한 번 부른다'], ['none', 't.run()을 지운다'], ['twice', 't.run()을 두 번 부른다']] },
    { id: 'two', label: 'Task에 메서드가 하나 더 있다 (void stop();)', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '람다는 어떻게 생겼고, 화살표 뒤의 코드는 언제 실행되나', d: '람다를 적은 줄에서는 실행되지 않고, t.run()을 부를 때 실행됩니다. 준비, 일한다 순서로 출력됩니다.', v: { form: 'lambda', call: 'once', two: false } },
    { t: 't.run()을 지우면', q: 't.run()을 지우면', d: '람다는 할 일을 변수에 담아 둘 뿐이어서 "일한다"가 출력되지 않습니다.', v: { form: 'lambda', call: 'none', two: false } },
    { t: '익명 클래스로 풀어 적으면', q: '람다를 익명 클래스로 풀어 적으면', d: '길게 쓴 같은 코드입니다. 람다와 출력이 같습니다.', v: { form: 'anon', call: 'once', two: false } },
    { t: '이름 있는 클래스로 풀어 적으면', q: '이름 있는 클래스로 풀어 적으면', d: 'Work 클래스를 만들고 new로 객체를 만듭니다. 람다와 출력이 같습니다.', v: { form: 'named', call: 'once', two: false } },
    { t: 'Task에 메서드가 하나 더 있으면', q: 'Task에 메서드가 하나 더 있으면 (void stop();)', d: '람다는 어느 메서드의 할 일인지 알 수 없어 컴파일 오류가 납니다.', v: { form: 'lambda', call: 'once', two: true } },
  ],
  // 컴파일러가 알려 주는 오류의 종류(실제 javac의 진단 코드를 옮긴 것)
  errLam: 'Task는 메서드가 하나가 아니어서 람다로 쓸 수 없음',
  errStop: 'Task의 stop 메서드를 작성하지 않았음',
  code: function (c) {
    var o = ['interface Task {', '    void run();'];
    if (c.two) o.push('    void stop();');
    o.push('}', '');
    if (c.form === 'named') o.push('// Task를 구현한 클래스: run이 할 일을 작성한다', 'class Work implements Task {', '    public void run() {', '        System.out.println("일한다");', '    }', '}', '');
    o.push('public class Main {', '    public static void main(String[] args) {');
    if (c.form === 'lambda') o.push('        // 람다: run의 할 일을 담아 둔다. 이 줄에서는 실행되지 않는다', '        Task t = () -> System.out.println("일한다");');
    else if (c.form === 'anon') o.push('        // 익명 클래스: 이름 없는 클래스를 만들고 바로 new로 객체를 만든다', '        Task t = new Task() {', '            public void run() {', '                System.out.println("일한다");', '            }', '        };');
    else o.push('        // Work 클래스로 new를 해서 객체를 만들어 담는다', '        Task t = new Work();');
    o.push('        System.out.println("준비");');
    if (c.call !== 'none') o.push('        t.run();');
    if (c.call === 'twice') o.push('        t.run();');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { lambda: '람다', anon: '익명 클래스', named: '이름 있는 클래스' }[c.form] + ' · ' + { once: 't.run() 한 번', none: 't.run() 없음', twice: 't.run() 두 번' }[c.call] + ' · ' + (c.two ? 'Task에 메서드 둘' : 'Task에 메서드 하나'); },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력'],
  simulate: function (c) {
    var ev = [], sum = [], n = { once: 1, none: 0, twice: 2 }[c.call], lam = c.form === 'lambda', anon = c.form === 'anon';
    var ok = !c.two;
    var first = ok ? '' : lam ? this.errLam : this.errStop;
    var errAt = ok ? [] : lam ? ['Task t = () -> System.out.println("일한다");'] : anon ? ['Task t = new Task() {'] : ['class Work implements Task {'];
    var st = { hot: '', bad: false, compile: '', errs: 0, errText: '', obj: false, phase: '', ran: false, runs: 0, out: [], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var name = { lambda: '람다', anon: '익명 클래스', named: 'Work 클래스' }[c.form];
    var line = { lambda: 'Task t = () -> System.out.println("일한다"); 줄', anon: 'Task t = new Task() { … }; 줄', named: 'Task t = new Work(); 줄' }[c.form];

    // 1. interface Task 선언을 읽는다
    st.hot = 'tk';
    st.checks.push(['Task에서 구현해야 할 메서드', { v: c.two ? 'run, stop 두 개' : 'run 하나', cls: '' }]);
    push('javac로 컴파일합니다. 컴파일러가 소스를 위에서부터 읽으면서 interface Task 선언을 만납니다. ' + (c.two ? 'Task에는 본문 없이 이름만 적은 메서드가 run과 stop, 두 개 있습니다. Task를 구현하는 쪽은 이 둘을 모두 작성해야 합니다.' : 'Task에는 본문 없이 이름만 적은 메서드가 run 하나뿐입니다. Task를 구현하는 쪽은 run 하나만 작성하면 됩니다.'), '');

    // 2. run이 할 일을 적은 곳을 읽는다
    st.hot = 'sr';
    if (lam) {
      if (ok) {
        st.checks.push(['람다 () -> …', { v: 'run이 할 일로 인정됨', cls: 'good' }]);
        push('컴파일러가 ' + line + '을 읽습니다. 화살표 뒤의 코드는 "Task가 구현해야 할 메서드가 할 일"을 적은 것으로 읽는데, Task에는 구현할 메서드가 run 하나뿐이므로 그 코드는 run이 할 일이라고 정해집니다. 이름을 따로 적지 않아도 됩니다. 컴파일은 실행이 아니므로 화살표 뒤의 코드는 실행되지 않습니다.', 'good');
      } else {
        st.bad = true; st.errs = 1; st.errText = first;
        st.checks.push(['람다 () -> …', { v: '오류: 어느 메서드의 할 일인지 알 수 없음', cls: 'bad' }]);
        push('컴파일러가 ' + line + '을 읽습니다. 화살표 뒤의 코드는 Task가 구현해야 할 메서드가 할 일을 적은 것인데, Task에는 구현할 메서드가 run과 stop 두 개입니다. 람다에는 메서드 이름이 없어서, 이 코드가 run의 할 일인지 stop의 할 일인지 정할 수 없습니다. 그래서 Task는 람다로 쓸 수 없다고 알립니다(javac: incompatible types: Task is not a functional interface). 람다는 구현할 메서드가 하나뿐인 인터페이스에만 쓸 수 있습니다.', 'bad');
      }
    } else if (anon) {
      if (ok) {
        st.checks.push(['익명 클래스의 run', { v: '작성됨', cls: 'good' }]);
        push('컴파일러가 ' + line + '을 읽습니다. new Task() { … }는 Task를 구현하는 이름 없는 클래스(익명 클래스)를 그 자리에서 만들고 바로 객체를 만드는 코드입니다. 클래스 안에 Task가 요구하는 run 메서드가 작성돼 있으므로 통과입니다. 람다에서는 화살표 뒤에 코드만 적었던 것이, 여기서는 run이라는 이름과 public void가 붙은 메서드로 적혀 있습니다.', 'good');
      } else {
        st.bad = true; st.errs = 1; st.errText = first;
        st.checks.push(['익명 클래스의 stop', { v: '없음: 오류', cls: 'bad' }]);
        push('컴파일러가 ' + line + '을 읽습니다. new Task() { … }는 Task를 구현하는 익명 클래스를 만드는 코드이고, 이 클래스는 Task의 메서드를 모두 작성해야 합니다. run은 작성돼 있지만 stop 메서드가 없으므로 오류입니다(javac: <anonymous Main$1> is not abstract and does not override abstract method stop() in Task). 메서드마다 이름을 적어 작성하는 방식이라 메서드가 둘이어도 쓸 수는 있지만, 둘 다 작성해야 합니다.', 'bad');
      }
    } else {
      if (ok) {
        st.checks.push(['Work 클래스의 run', { v: '작성됨', cls: 'good' }]);
        push('컴파일러가 class Work implements Task 줄을 읽습니다. 이 줄은 Work가 Task가 요구하는 메서드를 작성하겠다는 선언입니다. Work 안에 run 메서드가 작성돼 있으므로 통과입니다. 람다에서 화살표 뒤에 적었던 코드가, 여기서는 Work 클래스의 run 메서드 본문에 들어 있습니다.', 'good');
      } else {
        st.bad = true; st.errs = 1; st.errText = first;
        st.checks.push(['Work 클래스의 stop', { v: '없음: 오류', cls: 'bad' }]);
        push('컴파일러가 class Work implements Task 줄을 읽습니다. Work는 Task가 요구하는 메서드를 모두 작성해야 합니다. run은 작성돼 있지만 stop 메서드가 없으므로 오류입니다(javac: Work is not abstract and does not override abstract method stop() in Task).', 'bad');
      }
    }

    // 3. Work를 쓰는 줄 (이름 있는 클래스만 이 줄이 따로 있다)
    if (!lam && !anon) {
      st.hot = 'sr';
      if (ok) {
        st.checks.push(['Task t = new Work();', { v: '담을 수 있음', cls: 'good' }]);
        push('컴파일러가 ' + line + '을 확인합니다. Work는 implements Task로 Task를 구현했으므로 Work 객체를 Task 타입 변수 t에 담아도 됩니다.', 'good');
      } else {
        st.checks.push(['Task t = new Work();', { v: '오류 아님', cls: '' }]);
        push('컴파일러가 ' + line + '을 확인합니다. 이 줄 자체는 오류가 아닙니다(javac가 알린 오류는 위의 1개뿐입니다). 하지만 앞의 오류 때문에 컴파일은 실패합니다.', '');
      }
    }

    // 4. 컴파일 결과
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 1개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 1개이고, 그 오류는 "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없고, ' + (n === 0 ? 't.run() 줄을 지웠어도 결과는 같습니다.' : 't.run() 줄이 있어도 실행되지 못합니다.') + ' 컴파일러는 t.run()을 부르는지와 상관없이 Task를 구현한 코드를 확인합니다.', 'bad');
    }

    // 5~. 실행
    var objText = { lambda: '람다가 만든 객체', anon: '익명 클래스의 객체', named: 'Work 객체' }[c.form];
    if (ok) {
      st.hot = 'ob'; st.ran = true; st.obj = true; st.phase = 'make';
      if (lam) push('java Main으로 실행합니다. main이 시작되고 ' + line + '이 실행됩니다. 이 줄은 "run이 불리면 화살표 뒤의 코드를 실행하는 객체"를 만들어 변수 t에 담습니다. 화살표 뒤의 코드는 이 줄에서 실행되지 않으므로 "일한다"는 출력되지 않았습니다. 람다를 적은 줄이 하는 일은 할 일을 t에 담아 두는 데까지입니다.', '');
      else if (anon) push('java Main으로 실행합니다. main이 시작되고 ' + line + '이 실행됩니다. new Task() { … }가 Task를 구현한 익명 클래스의 객체를 만들어 t에 담습니다. 객체를 만들었을 뿐 클래스 안에 쓴 run의 본문은 실행되지 않으므로 "일한다"는 출력되지 않았습니다. 람다 한 줄이 하던 일을, 클래스를 만들고 run을 작성하고 new로 객체를 만드는 코드로 풀어 적은 것입니다.', '');
      else push('java Main으로 실행합니다. main이 시작되고 ' + line + '이 실행됩니다. new Work()가 Work 클래스의 객체를 만들어 Task 타입 변수 t에 담습니다. 객체를 만들었을 뿐 run의 본문은 실행되지 않으므로 "일한다"는 출력되지 않았습니다. 람다 한 줄이 하던 일을, 이름 있는 클래스 Work를 작성하고 new로 객체를 만드는 코드로 풀어 적은 것입니다.', '');
      st.hot = 't'; st.phase = ''; st.out.push('준비');
      push('System.out.println("준비")가 실행되어 준비를 출력합니다. 지금까지 출력된 것은 이것뿐입니다. 객체는 이미 t에 담겨 있지만, run은 아직 한 번도 불리지 않았습니다.', '');
      if (n === 0) {
        st.hot = '';
        st.checks.push(['실행했을 때 출력', { v: '준비', cls: 'good' }]);
        push('main이 끝납니다. t.run()을 부르는 줄이 없으므로 run은 한 번도 불리지 않았습니다. ' + objText + '는 만들어졌지만 그 안의 "일한다" 코드는 실행된 적이 없고, 출력은 준비뿐입니다.', 'good');
      }
      for (var i = 0; i < n; i++) {
        var head = i === 0;
        st.hot = 'ob'; st.phase = 'call'; st.runs++; st.out.push('일한다');
        if (head) push('t.run()이 실행됩니다. t에 담긴 객체의 run이 불리고, ' + (lam ? '그 순간 화살표 뒤의 코드 System.out.println("일한다")가 실행됩니다.' : 'run 메서드의 본문 System.out.println("일한다")가 실행됩니다.') + ' "일한다"가 출력되고, run이 실행된 횟수는 1번이 됩니다. "일한다"는 "준비"보다 뒤에 나왔습니다. 코드를 적은 자리가 아니라 부른 순간에 실행된 것입니다.', 'good');
        else push('t.run()이 한 번 더 실행됩니다. 같은 객체의 run이 다시 불려 "일한다"를 한 번 더 출력하고, 실행된 횟수는 2번이 됩니다. 객체를 새로 만들지 않았고, 할 일을 적은 곳도 그대로입니다.', 'good');
      }
      if (n > 0) {
        st.hot = ''; st.phase = '';
        st.checks.push(['실행했을 때 출력', { v: st.out.join(' / '), cls: 'good' }]);
        push('main이 끝납니다. 출력은 ' + st.out.join(', ') + ' 순서입니다.', '');
      }
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (ok) {
      if (lam && n === 1) {
        sum.push('람다 () -> System.out.println("일한다")는 메서드가 하나뿐인 인터페이스(Task)를 구현한 객체를 짧게 적은 것입니다. 람다를 적은 줄에서는 화살표 뒤의 코드가 실행되지 않고, 그 줄은 할 일을 변수 t에 담아 둡니다. 화살표 뒤의 코드는 t.run()을 부르는 순간 실행됐습니다.');
        sum.push('그래서 출력이 준비, 일한다 순서였습니다. 길게 쓰면 Task를 구현한 클래스를 만들고 new로 객체를 만드는 코드와 같은 일입니다. 이 실습의 익명 클래스와 이름 있는 클래스 설정으로 확인할 수 있습니다.');
      } else if (lam && n === 0) {
        sum.push('t.run()을 지우면 "일한다"는 출력되지 않습니다. 람다를 적은 줄은 할 일을 t에 담아 둘 뿐이어서, 부르지 않으면 화살표 뒤의 코드는 한 번도 실행되지 않습니다.');
        sum.push('출력이 준비뿐인 것이 그 증거입니다. 람다를 적은 줄은 오류 없이 실행됐지만, 실행되는 것은 객체를 만들어 담는 일까지입니다.');
      } else if (lam) {
        sum.push('t.run()을 두 번 부르면 화살표 뒤의 코드가 부를 때마다 실행되어 "일한다"가 두 번 출력됩니다.');
        sum.push('람다를 적은 줄은 한 번 실행되어 객체를 하나 만들었고, 그 객체의 run을 두 번 불렀습니다. 할 일을 적은 곳은 한 군데여도, 부를 때마다 실행됩니다.');
      } else {
        var by = anon ? '익명 클래스로 풀어 적어도' : '이름 있는 클래스로 풀어 적어도';
        var how = anon ? 'new Task() { … } 줄에서는 객체만 만들어지고, run의 본문은 t.run()을 부를 때 실행됩니다. 이름 없이 그 자리에서 바로 new를 하는 클래스라서 익명 클래스입니다.' : 'new Work() 줄에서는 객체만 만들어지고, run의 본문은 t.run()을 부를 때 실행됩니다. 람다가 만드는 객체도 Task를 구현한 클래스의 객체입니다. Work처럼 클래스를 직접 선언하지 않고 화살표 뒤의 코드만 적은 것이 람다입니다.';
        if (n === 1) sum.push(by + ' 결과는 람다와 같습니다. 출력이 준비, 일한다 순서였습니다. 람다 한 줄은 Task를 구현한 클래스를 만들고 new로 객체를 만드는 코드를 짧게 적은 것입니다.');
        else if (n === 0) sum.push(by + ' t.run()을 지우면 람다와 같이 출력은 준비뿐입니다. 객체를 만드는 줄에서는 run의 본문이 실행되지 않습니다.');
        else sum.push(by + ' t.run()을 두 번 부르면 람다와 같이 "일한다"가 두 번 출력됩니다. run의 본문은 부를 때마다 실행됩니다.');
        sum.push(how);
      }
    } else if (lam) {
      sum.push('Task에 메서드가 하나 더 있으면 컴파일러가 Task는 람다로 쓸 수 없다고 알려 주었고, 컴파일에 실패해 실행할 수 없었습니다. 화살표 뒤의 코드가 run의 할 일인지 stop의 할 일인지 정할 수 없기 때문입니다.');
      sum.push('람다는 구현할 메서드가 하나뿐인 인터페이스(함수형 인터페이스)에만 쓸 수 있습니다. ' + (n === 0 ? 't.run()을 지워도 오류는 같습니다. ' : n === 2 ? 't.run()을 몇 번 부르는지와 상관없이 오류는 같습니다. ' : '') + '같은 일을 익명 클래스나 이름 있는 클래스로 풀어 적으면 어느 메서드인지 이름을 적으므로 쓸 수 있지만, run과 stop을 모두 작성해야 합니다.');
    } else {
      sum.push('Task에 메서드가 하나 더 있는데 ' + (anon ? '익명 클래스' : 'Work 클래스') + '가 stop을 작성하지 않아 컴파일에 실패했습니다. 클래스로 풀어 적으면 Task의 메서드를 모두 작성해야 합니다.');
      sum.push('클래스는 메서드마다 이름을 적어 작성하므로 메서드가 둘이어도 쓸 수는 있습니다. 같은 일을 람다로 적으면 어느 메서드의 할 일인지 알 수 없어 컴파일에 실패합니다. ' + (n === 0 ? 't.run()을 지워도 오류는 같습니다.' : ''));
    }
    var out = st.out.join(' / ');
    return { events: ev, summary: sum, nerr: ok ? 0 : 1, errAt: errAt, row: [ok ? '성공' : '오류', ok ? '없음' : first, ok ? out : '실행할 수 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    H.counters(v, [[s.runs, 'run이 실행된 횟수'], [s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 위에 Task(인터페이스)와 run이 할 일을 적은 곳(람다, 익명 클래스, Work 클래스), 아래에 변수 t와 그것이 가리키는 객체. 객체 상자는 만들어진 뒤에 run이 할 일을 보이고, t.run()을 부르면 노랗게 됩니다. 맨 아래에 컴파일 결과, 출력, run이 실행된 횟수.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 372);
    var hot = s ? s.hot : '', bad = s && s.bad, lam = c.form === 'lambda';
    P.box('tk', 14, 20, 230, 76, { cls: hot === 'tk' ? 'hot now' : 'plain', title: 'Task (인터페이스)', sub: c.two ? 'run() · stop() 이름만' : 'run() 이름만' });
    P.box('sr', 436, 20, 230, 76, { cls: bad ? 'bad' : hot === 'sr' ? 'hot now' : 'plain', title: { lambda: '람다', anon: '익명 클래스', named: 'Work (클래스)' }[c.form], sub: { lambda: '() -> …', anon: 'new Task() { … }', named: 'implements Task' }[c.form] });
    P.arrow('imp', 'sr:l', 'tk:r', { cls: bad ? 'bad' : hot === 'sr' ? 'hot' : 'mut', label: lam ? '구현' : 'implements' });
    P.box('t', 14, 150, 230, 56, { cls: hot === 't' ? 'hot now' : 'plain', title: 'Task t', sub: s && s.obj ? '객체를 가리킴' : 'Task 타입 변수' });
    var obCls = s && s.obj ? (hot === 'ob' ? 'hot now' : 'good') : 'ghost';
    var obName = { lambda: '람다가 만든 객체', anon: '익명 클래스의 객체', named: 'Work 객체' }[c.form];
    P.box('ob', 436, 150, 230, 56, { cls: obCls, title: s && s.obj ? obName : '객체', sub: s && s.obj ? 'run이 할 일: 일한다 출력' : s && s.compile === 'err' ? '만들어지지 않음' : '아직 없음' });
    if (s && s.obj) P.arrow('ref', 't:r', 'ob:l', { cls: s.phase === 'call' ? 'hot' : 'good', label: s.phase === 'call' ? 'run()' : '가리킴' });
    var outText = s && s.ran ? (s.out.length ? s.out.join(' / ') : '(아무것도 출력되지 않음)') : s && s.compile === 'err' ? '실행할 수 없음' : '';
    P.box('r1', 14, 222, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 282, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '실행했을 때 출력', right: outText });
    P.box('r3', 14, 326, 652, 36, { cls: s && s.runs ? 'wait' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'run이 실행된 횟수', right: s && s.compile === 'err' ? '실행할 수 없음' : (s ? s.runs : 0) + '번' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 열여덟 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드(compiler.err.prob.found.req의 "Task is not a functional interface, multiple non-overriding abstract methods found in interface Task"는 "Task는 메서드가 하나가 아니어서 람다로 쓸 수 없음"으로, compiler.err.does.not.override.abstract의 "does not override abstract method stop() in Task"는 "Task의 stop 메서드를 작성하지 않았음"으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력입니다. 단계 문장이 기대는 사실은 별도의 소스를 같은 방식으로 실행해 확인했습니다. 객체를 담는 줄 바로 뒤에서 t는 세 형식 모두 Task를 구현한 클래스의 객체이고, 그 줄에서는 "일한다"가 출력되지 않았습니다(람다는 이 JDK에서 만들어지는 숨은 클래스의 객체이고, 익명 클래스와 이름 있는 클래스 Work는 각각 그 이름 그대로의 클래스의 객체였습니다). 문서는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. 람다 표현식이 대입, 호출, 형 변환 문맥에서 함수형 인터페이스를 목표 타입으로 가진다는 것은 15.27.3절, 실행할 때 람다 표현식을 계산하면 목표 함수형 인터페이스를 구현하는 클래스의 객체에 대한 참조가 만들어지고 이것은 람다 본문의 실행과 다르다는 것과 람다 본문은 그 인터페이스의 메서드가 불릴 때 실행된다는 것은 15.27절 서두와 15.27.4절, 함수형 인터페이스가 (Object의 메서드를 제외하고) 추상 메서드가 하나뿐인 인터페이스라는 것과 그 객체를 람다 표현식으로도 만들 수 있다는 것은 9.8절, 익명 클래스가 클래스 인스턴스 생성 식에서 암시적으로 선언되고 인터페이스를 직접 상위 인터페이스로 가질 수 있다는 것은 15.9.5절을 따랐습니다. 문서의 해당 절은 일부만 요약으로 돌아와 원문 전체를 읽지는 못했습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 이 실습은 "람다는 메서드가 하나뿐인 인터페이스를 구현한 객체를 짧게 적은 것"과 그 실행 시점만 다룹니다. 람다가 만드는 객체가 익명 클래스의 객체와 똑같은 것은 아닙니다. 이 JDK에서는 숨은 클래스로 만들어지고, 그 밖에 this가 가리키는 대상 등이 다르다고 하는데 이 실습에서는 확인하지 않았습니다. 매개변수가 있는 람다, 값을 돌려주는 람다, 메서드 참조, Runnable이나 Comparator 같은 기본 제공 함수형 인터페이스, default 메서드나 static 메서드가 있는 인터페이스는 다루지 않았고, 이것들은 "세부 동작 실습: 람다와 함수형 인터페이스"에서 다룹니다.',
});
