Lab.register({
  id: 'lambda_basic', nav: '람다', cat: '기초개념', mode: 'step', basic: true, deep: ['lambda'],
  title: '람다는 무엇을 줄여 쓴 것인가',
  why: '새 스레드에 맡길 일이나 리스트를 정렬할 기준처럼 할 일 하나를 다른 코드에 넘기려면, 람다가 없던 때(자바 7까지)는 Runnable이나 Comparator를 구현한 익명 클래스를 new와 메서드 선언까지 여러 줄로 적어야 했고, 정작 중요한 한 줄이 그 사이에 묻혔다. 자바 8에서 들어온 람다는 구현할 메서드가 하나뿐인 인터페이스라면 어느 메서드의 할 일인지 컴파일러가 알 수 있다는 점을 이용해, 매개변수와 할 일만 화살표로 적게 한다.',
  use: '새 스레드에 맡길 일을 넘기는 new Thread(() -> ...), 리스트를 정렬할 기준을 넘기는 list.sort((a, b) -> a.compareTo(b)), 조건에 맞는 것을 지우는 list.removeIf(n -> n < 0), 스트림의 filter와 map처럼 자바가 할 일을 받는 자리에 쓴다. 할 일이 여러 줄로 길어지면 이름 있는 메서드로 따로 적고, 그 메서드를 메서드 참조(::)로 넘기기도 한다.',
  intro: '람다는 화살표(->)로 적는 짧은 코드입니다. () -> System.out.println("일한다")는 "구현할 메서드가 하나뿐인 인터페이스를 구현한 객체"를 짧게 적은 것입니다. 이 실습은 자바가 주는 두 인터페이스로 봅니다. Runnable(java.lang 패키지)은 구현할 메서드가 run() 하나이고, new Thread(…)가 받는 것이 이 Runnable입니다. Comparator(java.util 패키지)는 구현할 메서드가 compare(a, b) 하나이고, list.sort(…)가 정렬 기준으로 받는 것이 이 Comparator입니다. 람다를 익명 클래스와 이름 있는 클래스로 풀어 적어 결과가 같은지, 화살표 뒤의 코드가 람다를 적은 줄에서 실행되는지 부를 때 실행되는지, 그 코드를 누가 부르는지(내 코드의 r.run()인지, 새 스레드인지, sort인지) 같은 코드를 컴파일하고 실행해 봅니다. 마지막으로 직접 만든 인터페이스에 메서드가 둘이면 람다를 쓸 수 없는 것을 봅니다.',
  terms: ['람다 표현식', '함수형 인터페이스', 'Runnable', 'start()와 run()', 'Comparable과 Comparator', '익명 클래스'],
  controls: [
    { id: 'to', label: '람다를 넘기는 곳', type: 'select', value: 'runnable', options: [['runnable', 'Runnable 변수: Runnable r = …; r.run();'], ['thread', '새 스레드: new Thread(…); th.start();'], ['sort', '정렬 기준: names.sort(…);'], ['task', '직접 만든 Task (메서드가 run, stop 둘)']] },
    { id: 'form', label: '할 일을 적는 방법', type: 'select', value: 'lambda', options: [['lambda', '람다로 적는다: () -> …'], ['anon', '익명 클래스로 풀어 적는다: new 인터페이스() { … }'], ['named', '이름 있는 클래스로 풀어 적는다: class … implements 인터페이스']] },
    { id: 'drop', label: '부르는 줄(r.run(), th.start(), t.run())을 지운다', type: 'check', value: false },
  ],
  // names.sort(…)는 넘기는 줄이 곧 sort를 부르는 줄이어서 지우는 설정이 없다
  fix: function (c) { return c.to === 'sort' && c.drop ? { drop: false } : null; },
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '람다는 어떻게 생겼고, 화살표 뒤의 코드는 언제 실행되나', d: 'Runnable 변수에 람다를 대입한 줄에서는 실행되지 않고, r.run()을 부를 때 실행됩니다. 준비, 일한다 순서로 출력됩니다.', v: { to: 'runnable', form: 'lambda', drop: false } },
    { t: 'r.run()을 지우면', q: 'r.run()을 지우면', d: '람다를 적은 줄은 할 일을 적은 객체를 만들 뿐이어서 "일한다"가 출력되지 않습니다.', v: { to: 'runnable', form: 'lambda', drop: true } },
    { t: '익명 클래스로 풀어 적으면', q: '람다를 익명 클래스로 풀어 적으면 (new Runnable() { … })', d: '같은 일을 길게 쓴 코드입니다. 람다와 출력이 같습니다.', v: { to: 'runnable', form: 'anon', drop: false } },
    { t: '이름 있는 클래스로 풀어 적으면', q: '이름 있는 클래스로 풀어 적으면 (class Work implements Runnable)', d: '예시로 지은 Work 클래스가 Runnable을 구현하고, new로 객체를 만듭니다. 람다와 출력이 같습니다.', v: { to: 'runnable', form: 'named', drop: false } },
    { t: '새 스레드에 넘기면', q: 'new Thread(() -> …)에 넘기면 run은 누가 부르나', d: '내 코드에는 run을 부르는 줄이 없습니다. th.start()로 새 스레드를 시작하면 그 스레드가 run을 부릅니다.', v: { to: 'thread', form: 'lambda', drop: false } },
    { t: '정렬 기준으로 넘기면', q: 'names.sort((a, b) -> a.compareTo(b))에 넘기면', d: '람다는 Comparator의 compare를 구현한 것이고, sort가 두 이름을 비교할 때마다 부릅니다. [가영, 나래, 다현] 순서로 정렬됩니다.', v: { to: 'sort', form: 'lambda', drop: false } },
    { t: '메서드가 둘인 인터페이스면', q: '직접 만든 인터페이스 Task에 메서드가 둘이면 (run, stop)', d: '람다는 어느 메서드의 할 일인지 정할 수 없어 컴파일 오류가 납니다. 익명 클래스나 이름 있는 클래스는 두 메서드를 모두 작성하면 됩니다.', v: { to: 'task', form: 'lambda', drop: false } },
  ],
  // 컴파일러가 알려 주는 오류(실제 javac의 진단 코드 compiler.err.prob.found.req를 옮긴 것)
  errLam: 'Task는 구현할 메서드가 둘이어서 람다로 쓸 수 없음',
  // 선언 줄 바로 위의 주석
  notes: {
    'runnable-lambda': '// 람다: run이 할 일을 화살표 뒤에 적는다. 이 줄에서는 실행되지 않는다',
    'runnable-anon': '// 익명 클래스: Runnable을 구현한 이름 없는 클래스를 만들고 바로 new로 객체를 만든다',
    'runnable-named': '// Work 객체를 new로 만들고 r이 그 객체를 가리키게 한다',
    'thread-lambda': '// 람다를 Thread에 넘긴다. 이 줄에서는 실행되지 않는다',
    'thread-anon': '// 익명 클래스의 객체를 Thread에 넘긴다',
    'thread-named': '// Work 객체를 Thread에 넘긴다',
    'sort-lambda': '// 람다를 정렬 기준(Comparator)으로 넘긴다',
    'sort-anon': '// 익명 클래스의 객체를 정렬 기준으로 넘긴다',
    'sort-named': '// ByName 객체를 정렬 기준으로 넘긴다',
    'task-lambda': '// 람다: Task에는 구현할 메서드가 run, stop 두 개다',
    'task-anon': '// 익명 클래스: run과 stop을 둘 다 작성한다',
    'task-named': '// Work 객체를 new로 만들고 t가 그 객체를 가리키게 한다',
  },
  // 람다(또는 풀어 쓴 코드)가 시작되는 줄. 오류가 난 줄을 가리킬 때도 쓴다
  declLine: function (c) {
    if (c.to === 'sort') return { lambda: 'names.sort((a, b) -> a.compareTo(b));', anon: 'names.sort(new Comparator<String>() {', named: 'names.sort(new ByName());' }[c.form];
    if (c.to === 'thread') return { lambda: 'Thread th = new Thread(() -> System.out.println("일한다"));', anon: 'Thread th = new Thread(new Runnable() {', named: 'Thread th = new Thread(new Work());' }[c.form];
    var T = c.to === 'task' ? 'Task' : 'Runnable', v = c.to === 'task' ? 't' : 'r';
    return { lambda: T + ' ' + v + ' = () -> System.out.println("일한다");', anon: T + ' ' + v + ' = new ' + T + '() {', named: T + ' ' + v + ' = new Work();' }[c.form];
  },
  code: function (c) {
    var sort = c.to === 'sort', task = c.to === 'task', thread = c.to === 'thread', drop = c.drop && !sort, o = [];
    var run = ['public void run()', 'System.out.println("일한다");'], stop = ['public void stop()', 'System.out.println("멈춘다");'], cmp = ['public int compare(String a, String b)', 'return a.compareTo(b);'];
    function add() { for (var i = 0; i < arguments.length; i++) o = o.concat(arguments[i]); }
    function m(ind, x) { return [ind + x[0] + ' {', ind + '    ' + x[1], ind + '}']; }
    var in2 = '        ', in3 = '            ';
    if (sort) add('import java.util.ArrayList;', c.form === 'lambda' ? [] : 'import java.util.Comparator;', 'import java.util.List;', '');
    if (task) add('// 직접 만든 인터페이스(Task는 예시로 지은 이름): 본문 없는 메서드가 run, stop 두 개', 'interface Task {', '    void run();', '    void stop();', '}', '');
    if (c.form === 'named') {
      if (sort) add('// Comparator<String>을 구현한 클래스(ByName은 예시로 지은 이름)', 'class ByName implements Comparator<String> {', m('    ', cmp), '}', '');
      else add('// ' + (task ? 'Task를' : 'Runnable을') + ' 구현한 클래스(Work는 예시로 지은 이름)', 'class Work implements ' + (task ? 'Task' : 'Runnable') + ' {', m('    ', run), task ? m('    ', stop) : [], '}', '');
    }
    add('public class Main {', '    public static void main(String[] args) {');
    var note = in2 + this.notes[c.to + '-' + c.form];
    if (sort) {
      add(in2 + 'List<String> names = new ArrayList<>(List.of("다현", "가영", "나래"));', in2 + 'System.out.println(names);', note);
      if (c.form === 'anon') add(in2 + 'names.sort(new Comparator<String>() {', m(in3, cmp), in2 + '});');
      else add(in2 + this.declLine(c));
      add(in2 + 'System.out.println(names);');
    } else if (thread) {
      add(note);
      if (c.form === 'anon') add(in2 + 'Thread th = new Thread(new Runnable() {', m(in3, run), in2 + '});');
      else add(in2 + this.declLine(c));
      add(in2 + 'System.out.println("준비");', drop ? [] : in2 + 'th.start();');
    } else {
      add(note);
      if (c.form === 'anon') add(in2 + this.declLine(c), m(in3, run), task ? m(in3, stop) : [], in2 + '};');
      else add(in2 + this.declLine(c));
      add(in2 + 'System.out.println("준비");', drop ? [] : in2 + (task ? 't' : 'r') + '.run();');
    }
    add('    }', '}');
    return o.join('\n');
  },
  label: function (c) {
    return { runnable: 'Runnable 변수', thread: '새 스레드', sort: '정렬 기준', task: '직접 만든 Task' }[c.to] + ' · ' + { lambda: '람다', anon: '익명 클래스', named: '이름 있는 클래스' }[c.form]
      + (c.to === 'sort' ? '' : ' · ' + (c.drop ? { runnable: 'r.run() 없음', thread: 'th.start() 없음', task: 't.run() 없음' }[c.to] : { runnable: 'r.run() 부름', thread: 'th.start() 부름', task: 't.run() 부름' }[c.to]));
  },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력'],
  simulate: function (c) {
    var ev = [], sum = [], sort = c.to === 'sort', task = c.to === 'task', thread = c.to === 'thread', drop = c.drop && !sort;
    var lam = c.form === 'lambda', anon = c.form === 'anon';
    var ok = !(task && lam), first = ok ? '' : this.errLam, decl = this.declLine(c);
    var declText = !anon ? decl : sort ? 'names.sort(new Comparator<String>() { … });' : thread ? 'Thread th = new Thread(new Runnable() { … });' : decl + ' … };';
    var I = sort ? 'Comparator' : task ? 'Task' : 'Runnable', M = sort ? 'compare' : 'run', v = task ? 't' : 'r', vI = task ? 't가' : 'r이';
    var cls = sort ? 'ByName' : 'Work';
    var st = { hot: '', bad: false, compile: '', errs: 0, errText: '', obj: false, phase: '', ran: false, runs: 0, out: [], checks: [], who: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. 인터페이스를 확인한다
    st.hot = 'tk';
    if (sort) {
      st.checks.push(['Comparator<String>에서 구현할 메서드', { v: 'compare 하나', cls: '' }]);
      push('javac로 컴파일합니다. names.sort(…)의 sort는 자바가 주는 List의 메서드이고, 괄호 자리에 정렬 기준으로 Comparator를 받습니다. Comparator는 자바가 java.util 패키지에 미리 만들어 둔 인터페이스로, 구현할 메서드가 compare(a, b) 하나뿐입니다(다른 메서드는 이미 본문이 있거나 Object에도 있는 equals여서 구현하지 않아도 됩니다). compare는 두 값을 받아 a가 앞이면 음수, 순서가 같으면 0, a가 뒤면 양수를 돌려줍니다.', '');
    } else if (task) {
      st.checks.push(['Task에서 구현할 메서드', { v: 'run, stop 두 개', cls: '' }]);
      push('javac로 컴파일합니다. 컴파일러가 소스를 위에서부터 읽으면서 interface Task 선언을 만납니다. Task는 자바가 주는 것이 아니라 이 예제에서 직접 만든 인터페이스이고, 본문 없이 이름만 적은 메서드가 run과 stop, 두 개 있습니다. Task를 구현하는 쪽은 이 둘을 모두 작성해야 합니다.', '');
    } else {
      st.checks.push(['Runnable에서 구현할 메서드', { v: 'run 하나', cls: '' }]);
      push('javac로 컴파일합니다. 이 코드에는 interface 선언이 없습니다. Runnable은 자바가 java.lang 패키지에 미리 만들어 둔 인터페이스여서 import 없이 쓸 수 있고, 본문 없이 이름만 적은 메서드가 run() 하나뿐입니다. Runnable을 구현하는 쪽은 run 하나만 작성하면 됩니다.' + (thread ? ' new Thread(…)의 괄호 자리에 받는 타입이 이 Runnable입니다.' : ''), '');
    }

    // 2. 할 일을 적은 곳을 읽는다
    st.hot = 'sr';
    if (lam && ok) {
      st.checks.push(['람다 ' + (sort ? '(a, b) -> …' : '() -> …'), { v: M + (sort ? '가' : '이') + ' 할 일로 정해짐', cls: 'good' }]);
      if (sort) push('컴파일러가 ' + decl + ' 줄을 읽습니다. sort의 괄호 자리는 Comparator 타입이고 names는 String의 리스트이므로, 람다는 Comparator<String>의 compare를 구현한 것으로 정해집니다. 화살표 앞의 (a, b)는 compare가 받는 두 String이고, 화살표 뒤의 a.compareTo(b)가 compare가 돌려줄 값입니다. a와 b의 타입을 적지 않아도 컴파일러가 String으로 압니다. String이 주는 compareTo는 사전 순서(문자 코드 순서)로 a가 앞이면 음수, 뒤면 양수를 돌려줍니다.', 'good');
      else push('컴파일러가 ' + decl + ' 줄을 읽습니다. ' + (thread ? 'new Thread(…)의 괄호 자리는 Runnable 타입이므로' : '왼쪽 변수의 타입이 Runnable이므로') + ', 화살표 뒤의 코드는 Runnable이 구현할 메서드의 할 일로 읽힙니다. Runnable에는 구현할 메서드가 run 하나뿐이어서 그 코드는 run이 할 일이라고 정해집니다. 메서드 이름을 적지 않아도 되는 이유입니다. 화살표 앞의 ()는 run이 받는 값이 없다는 뜻입니다. 컴파일은 실행이 아니므로 화살표 뒤의 코드는 실행되지 않습니다.', 'good');
    } else if (lam) {
      st.bad = true; st.errs = 1; st.errText = first;
      st.checks.push(['람다 () -> …', { v: '오류: 어느 메서드의 할 일인지 정할 수 없음', cls: 'bad' }]);
      push('컴파일러가 ' + decl + ' 줄을 읽습니다. 화살표 뒤의 코드는 Task가 구현할 메서드의 할 일을 적은 것인데, Task에는 구현할 메서드가 run과 stop 두 개입니다. 람다에는 메서드 이름을 적는 자리가 없어서, 이 코드가 run의 할 일인지 stop의 할 일인지 정할 수 없습니다. 그래서 Task는 람다로 쓸 수 없다고 알립니다(javac: incompatible types: Task is not a functional interface, multiple non-overriding abstract methods found in interface Task). 람다는 Runnable이나 Comparator처럼 구현할 메서드가 하나뿐인 인터페이스(함수형 인터페이스)에만 쓸 수 있습니다.', 'bad');
    } else if (anon) {
      st.checks.push(['익명 클래스의 ' + (task ? 'run, stop' : M), { v: '작성됨', cls: 'good' }]);
      if (sort) push('컴파일러가 ' + declText + ' 줄을 읽습니다. new Comparator<String>() { … }는 Comparator<String>을 구현하는 이름 없는 클래스(익명 클래스)를 그 자리에서 만들고 바로 객체를 만드는 코드입니다. 클래스 안에 compare 메서드가 작성돼 있으므로 통과입니다. 람다의 (a, b) -> a.compareTo(b)가, 여기서는 public int compare(String a, String b)라는 선언과 return이 붙은 메서드로 적혀 있습니다.', 'good');
      else if (task) push('컴파일러가 ' + declText + ' 줄을 읽습니다. new Task() { … }는 Task를 구현하는 이름 없는 클래스(익명 클래스)를 그 자리에서 만들고 바로 객체를 만드는 코드입니다. Task가 요구하는 run과 stop이 둘 다 작성돼 있으므로 통과입니다. 메서드마다 이름을 적어 작성하므로, 메서드가 둘이어도 어느 본문이 어느 메서드의 것인지 정해집니다.', 'good');
      else push('컴파일러가 ' + declText + ' 줄을 읽습니다. new Runnable() { … }는 Runnable을 구현하는 이름 없는 클래스(익명 클래스)를 그 자리에서 만들고 바로 객체를 만드는 코드입니다' + (thread ? '. 그 객체를 new Thread(…)에 넘깁니다' : '') + '. 클래스 안에 Runnable이 요구하는 run 메서드가 작성돼 있으므로 통과입니다. 람다에서는 화살표 뒤에 코드만 적었던 것이, 여기서는 run이라는 이름과 public void가 붙은 메서드로 적혀 있습니다.', 'good');
    } else {
      st.checks.push([cls + ' 클래스의 ' + (task ? 'run, stop' : M), { v: '작성됨', cls: 'good' }]);
      if (sort) push('컴파일러가 class ByName implements Comparator<String> 줄을 읽습니다. ByName은 이 예제에서 지은 클래스 이름이고, implements Comparator<String>은 ByName이 Comparator가 요구하는 메서드를 작성하겠다는 선언입니다. ByName 안에 compare 메서드가 작성돼 있으므로 통과입니다. 람다의 (a, b) -> a.compareTo(b)가, 여기서는 ByName 클래스의 compare 메서드로 적혀 있습니다.', 'good');
      else push('컴파일러가 class Work implements ' + I + ' 줄을 읽습니다. Work는 이 예제에서 지은 클래스 이름이고, implements ' + I + (task ? '는' : '은') + ' Work가 ' + I + (task ? '가' : '이') + ' 요구하는 메서드를 작성하겠다는 선언입니다. Work 안에 ' + (task ? 'run과 stop이 둘 다' : 'run 메서드가') + ' 작성돼 있으므로 통과입니다. ' + (task ? '메서드마다 이름을 적어 작성하므로, 메서드가 둘이어도 어느 본문이 어느 메서드의 것인지 정해집니다.' : '람다에서 화살표 뒤에 적었던 코드가, 여기서는 Work 클래스의 run 메서드 본문으로 적혀 있습니다.'), 'good');
      st.checks.push([decl, { v: '통과', cls: 'good' }]);
      if (sort) push('컴파일러가 ' + decl + ' 줄을 확인합니다. ByName은 Comparator<String>을 구현했으므로 ByName 객체를 sort의 Comparator 자리에 넘길 수 있습니다.', 'good');
      else if (thread) push('컴파일러가 ' + decl + ' 줄을 확인합니다. Work는 Runnable을 구현했으므로 Work 객체를 new Thread(…)의 Runnable 자리에 넘길 수 있습니다.', 'good');
      else push('컴파일러가 ' + decl + ' 줄을 확인합니다. Work는 ' + I + (task ? '를' : '을') + ' 구현했으므로 ' + I + ' 타입 변수 ' + vI + ' Work 객체를 가리킬 수 있습니다.', 'good');
    }

    // 3. 컴파일 결과
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 1개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 1개이고, 그 오류는 "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없고, ' + (drop ? 't.run() 줄을 지웠어도 결과는 같습니다.' : 't.run() 줄이 있어도 실행되지 못합니다.') + ' 컴파일러는 t.run()을 부르는지와 상관없이 람다를 적은 줄을 확인합니다.', 'bad');
    }

    // 4. 실행
    var made = lam ? '람다가 만든 객체' : anon ? '익명 클래스 객체' : cls + ' 객체';
    if (ok && sort) {
      st.ran = true; st.hot = 't'; st.out.push('[다현, 가영, 나래]');
      push('java Main으로 실행합니다. names는 "다현", "가영", "나래"를 이 순서로 가진 ArrayList이고, 첫 번째 System.out.println(names)가 [다현, 가영, 나래]를 출력합니다.', '');
      st.hot = 'ob'; st.obj = true; st.phase = 'call'; st.runs = 4; st.who = 'sort';
      push('names.sort(…) 줄이 실행됩니다. ' + (lam ? '람다는 이 줄에서 Comparator<String>을 구현한 객체가 되어 sort에 넘겨지고' : made + '가 이 줄에서 만들어져 sort에 넘겨지고') + ', 정렬은 sort가 합니다. sort는 두 이름의 순서를 알아야 할 때마다 넘겨받은 객체의 compare를 부릅니다. 이 JDK에서 이 세 이름을 정렬할 때 compare는 4번 불렸고, 첫 번째 호출은 compare("가영", "다현")였습니다. 음수가 나와 가영이 다현보다 앞이라고 정해졌습니다. 몇 번, 어떤 순서로 부를지는 sort가 정하고, compare는 두 이름의 순서만 알려 줍니다.', 'good');
      st.hot = ''; st.phase = ''; st.out.push('[가영, 나래, 다현]');
      st.checks.push(['실행했을 때 출력', { v: st.out.join(' / '), cls: 'good' }]);
      push('두 번째 System.out.println(names)가 [가영, 나래, 다현]을 출력합니다. sort는 새 리스트를 만들지 않고 names의 순서를 바꿨습니다. 내 코드에는 compare를 부르는 줄이 없습니다. compare를 부른 것은 sort입니다.', 'good');
    } else if (ok) {
      st.hot = 'ob'; st.ran = true; st.obj = true; st.phase = 'make';
      if (thread) push('java Main으로 실행합니다. main이 시작되고 ' + declText + ' 줄이 실행됩니다. ' + (lam ? '람다가 Runnable을 구현한 객체를 만들고' : made + '가 만들어지고') + ', new Thread(…)가 Thread 객체를 만들면서 그 객체를 참조로 갖습니다. 스레드는 아직 시작되지 않았고, ' + (lam ? '화살표 뒤의 코드' : 'run의 본문') + '도 실행되지 않으므로 "일한다"는 출력되지 않았습니다.', '');
      else if (lam) push('java Main으로 실행합니다. main이 시작되고 ' + decl + ' 줄이 실행됩니다. 이 줄은 "run이 불리면 화살표 뒤의 코드를 실행하는 객체"를 만들고, 변수 r이 그 객체를 가리키게 합니다. 화살표 뒤의 코드는 이 줄에서 실행되지 않으므로 "일한다"는 출력되지 않았습니다. 람다를 적은 줄이 하는 일은 할 일을 적은 객체를 만드는 데까지입니다.', '');
      else push('java Main으로 실행합니다. main이 시작되고 ' + declText + ' 줄이 실행됩니다. ' + (anon ? 'new ' + I + '() { … }가 익명 클래스의 객체를 만들고' : 'new Work()가 Work 객체를 만들고') + ', 변수 ' + vI + ' 그 객체를 가리킵니다. 객체를 만들었을 뿐 run의 본문은 실행되지 않으므로 "일한다"는 출력되지 않았습니다. 람다 한 줄이 하던 일을, ' + (anon ? '이름 없는 클래스를 만들고 run을 작성하고 new로 객체를 만드는 코드' : '이름 있는 클래스 Work를 작성하고 new로 객체를 만드는 코드') + '로 풀어 적은 것입니다.', '');
      st.hot = 't'; st.phase = ''; st.out.push('준비');
      push('System.out.println("준비")가 실행되어 준비를 출력합니다. 객체는 이미 만들어졌지만, run은 아직 한 번도 불리지 않았습니다.', '');
      if (drop) {
        st.hot = '';
        st.checks.push(['실행했을 때 출력', { v: '준비', cls: 'good' }]);
        if (thread) push('main이 끝납니다. th.start()가 없으므로 새 스레드는 시작되지 않았고, run을 부른 쪽이 아무도 없습니다. Thread 객체를 만든 것만으로는 run이 불리지 않고, 시작하지 않은 스레드는 프로그램이 끝나는 것을 막지 않습니다. 출력은 준비뿐입니다.', 'good');
        else push('main이 끝납니다. ' + v + '.run()을 부르는 줄이 없으므로 run은 한 번도 불리지 않았습니다. ' + made + '는 만들어졌지만 "일한다" 코드는 실행된 적이 없고, 출력은 준비뿐입니다.', 'good');
      } else {
        st.hot = 'ob'; st.phase = 'call'; st.runs = 1; st.out.push('일한다');
        if (thread) {
          st.who = 'Thread-0';
          push('th.start()가 실행됩니다. 이 줄은 run을 직접 부르는 것이 아니라 새 스레드를 시작하는 것입니다. 새 스레드(이름은 자동으로 붙은 Thread-0)가 시작되면, 그 스레드가 Thread 객체가 참조하는 ' + made + '의 run을 부릅니다. 그때 ' + (lam ? '화살표 뒤의 코드' : 'run의 본문') + ' System.out.println("일한다")가 실행되어 "일한다"가 출력됩니다. run을 부른 것은 내 코드가 아니라 새 스레드입니다(준비는 main 스레드가, 일한다는 Thread-0이 출력했습니다).', 'good');
          st.hot = ''; st.phase = '';
          st.checks.push(['실행했을 때 출력', { v: st.out.join(' / '), cls: 'good' }]);
          push('main은 th.start() 뒤에 할 일이 없어 끝나지만, 프로그램은 시작된 새 스레드가 run을 마칠 때까지 끝나지 않습니다. 출력은 준비, 일한다 순서입니다. 준비를 출력한 다음에 스레드를 시작하므로 이 순서는 바뀌지 않습니다.', '');
        } else {
          st.who = 'main';
          push(v + '.run()이 실행됩니다. 내 코드(main)가 run을 직접 부르는 줄입니다. 변수 ' + vI + ' 가리키는 ' + made + '의 run이 불리고, 그 순간 ' + (lam ? '화살표 뒤의 코드' : 'run 메서드의 본문') + ' System.out.println("일한다")가 실행됩니다. "일한다"는 "준비"보다 뒤에 나왔습니다. 코드를 적은 자리가 아니라 부른 순간에 실행된 것입니다. 새 스레드는 없고, main을 실행하던 main 스레드가 그대로 run을 실행합니다.', 'good');
          st.hot = ''; st.phase = '';
          st.checks.push(['실행했을 때 출력', { v: st.out.join(' / '), cls: 'good' }]);
          push('main이 끝납니다. 출력은 준비, 일한다 순서입니다.' + (task ? ' stop은 작성했지만 부르는 줄이 없어 실행되지 않았습니다.' : ''), '');
        }
      }
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    var out = st.out.join(', ');
    if (!ok) {
      sum.push('직접 만든 Task처럼 구현할 메서드가 둘이면, 람다는 어느 메서드의 할 일인지 정할 수 없어 컴파일 오류가 납니다. 람다는 Runnable이나 Comparator처럼 구현할 메서드가 하나뿐인 인터페이스에만 쓸 수 있습니다.');
      sum.push('같은 Task를 익명 클래스나 이름 있는 클래스로 적으면 run과 stop을 이름을 붙여 따로 작성하므로 컴파일됩니다.' + (drop ? ' t.run()을 지워도 오류는 같습니다.' : ''));
    } else if (sort) {
      sum.push('names.sort(…)에 넘긴 것은 Comparator의 compare가 할 일이고, 그 compare는 sort가 두 이름을 비교할 때마다 불렀습니다(이 세 이름에서 4번). 결과는 [가영, 나래, 다현]입니다.');
      sum.push(lam ? '람다 (a, b) -> a.compareTo(b)는 compare(String a, String b)를 구현한 객체를 짧게 적은 것입니다.' : (anon ? '익명 클래스로' : '이름 있는 클래스 ByName으로') + ' 풀어 적어도 결과는 람다와 같습니다. 람다 (a, b) -> a.compareTo(b)는 이 코드를 줄여 쓴 것입니다.');
    } else if (thread) {
      if (drop) sum.push('th.start()를 지우면 새 스레드가 시작되지 않아 run을 부르는 쪽이 없고, "일한다"는 출력되지 않습니다. 출력은 준비뿐입니다.');
      else sum.push('new Thread(…)에 넘긴 할 일은, th.start()로 시작한 새 스레드(Thread-0)가 run을 불러 실행했습니다. 내 코드에는 run을 부르는 줄이 없습니다. 출력은 ' + out + ' 순서입니다.');
      sum.push(lam ? '람다 () -> System.out.println("일한다")는 Thread가 받는 Runnable의 run을 짧게 적은 것입니다.' : (anon ? '익명 클래스' : '이름 있는 클래스 Work') + '로 풀어 적어 넘겨도 결과는 람다와 같습니다.');
    } else if (task) {
      sum.push((anon ? '익명 클래스' : '이름 있는 클래스 Work') + '는 run과 stop을 이름을 붙여 따로 작성하므로, 메서드가 둘인 Task도 구현할 수 있습니다. 출력은 ' + out + '입니다.');
      sum.push('같은 Task를 람다로 적으면 어느 메서드의 할 일인지 정할 수 없어 컴파일 오류가 납니다.');
    } else if (lam) {
      if (drop) sum.push('r.run()을 지우면 "일한다"는 출력되지 않습니다. 람다를 적은 줄은 할 일을 적은 객체를 만들 뿐이고, 화살표 뒤의 코드는 run을 부를 때 실행됩니다.');
      else sum.push('람다 () -> System.out.println("일한다")는 Runnable의 run이 할 일을 적은 것입니다. 적은 줄에서는 실행되지 않고, r.run()을 부를 때 실행되어 준비, 일한다 순서로 출력되었습니다.');
      sum.push('람다는 Runnable을 구현한 객체를 만드는 코드이고, 그 객체의 run을 부르는 쪽이 따로 있어야 실행됩니다.');
    } else {
      sum.push((anon ? '익명 클래스(new Runnable() { … })' : '이름 있는 클래스 Work') + '로 풀어 적어도 출력은 람다와 같은 ' + out + '입니다' + (drop ? '(r.run()을 지워서 "일한다"는 없습니다).' : '.'));
      sum.push('람다 () -> System.out.println("일한다")는 ' + (anon ? '이 코드에서 new Runnable()과 메서드 선언 public void run()을 줄여 쓴 것입니다.' : '이 코드에서 클래스 선언, new, 메서드 선언 public void run()을 줄여 쓴 것입니다.'));
    }
    return { events: ev, summary: sum, nerr: ok ? 0 : 1, errAt: ok ? [] : [decl], row: [ok ? '성공' : '오류', ok ? '없음' : first, ok ? st.out.join(' / ') : '실행할 수 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['일어난 일', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    H.counters(v, [[s.runs, c && c.to === 'sort' ? 'compare가 불린 횟수' : 'run이 실행된 횟수'], [s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 위에 인터페이스(Runnable, Comparator, 직접 만든 Task)와 할 일을 적은 곳(람다, 익명 클래스, Work·ByName 클래스), 아래 왼쪽에 할 일을 받는 쪽(변수 r, Thread th, names.sort, 변수 t)과 그 할 일을 부르는 쪽, 오른쪽에 만들어진 객체. 할 일이 불리면 객체 상자가 노랗게 됩니다. 맨 아래에 컴파일 결과, 출력, 할 일이 실행된 횟수.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 372);
    var hot = s ? s.hot : '', bad = s && s.bad, sort = c.to === 'sort', task = c.to === 'task', thread = c.to === 'thread';
    var I = sort ? 'Comparator<String>' : task ? 'Task' : 'Runnable', M = sort ? 'compare' : 'run';
    P.box('tk', 14, 20, 270, 76, { cls: hot === 'tk' ? 'hot now' : 'plain', title: I, sub: ['인터페이스 · ' + (task ? '직접 만든 것' : '자바가 주는 것'), task ? 'run() · stop() 이름만' : sort ? 'compare(a, b) 이름만' : 'run() 이름만'] });
    P.box('sr', 396, 20, 270, 76, { cls: bad ? 'bad' : hot === 'sr' ? 'hot now' : 'plain', title: { lambda: '람다', anon: '익명 클래스', named: sort ? 'ByName (클래스)' : 'Work (클래스)' }[c.form], sub: { lambda: sort ? '(a, b) -> …' : '() -> …', anon: 'new ' + I + '() { … }', named: 'implements ' + I }[c.form] });
    P.arrow('imp', 'sr:l', 'tk:r', { cls: bad ? 'bad' : hot === 'sr' ? 'hot' : 'mut', label: c.form === 'named' ? 'implements' : '구현' });
    var holder = { runnable: 'Runnable r', thread: 'Thread th', sort: 'names.sort(…)', task: 'Task t' }[c.to];
    var caller = { runnable: 'r.run(): 내 코드가 부름', thread: 'th.start(): 새 스레드가 부름', sort: 'sort가 compare를 부름', task: 't.run(): 내 코드가 부름' }[c.to];
    if (c.drop && !sort) caller = { runnable: 'r.run() 없음', thread: 'th.start() 없음', task: 't.run() 없음' }[c.to];
    P.box('t', 14, 150, 270, 56, { cls: hot === 't' ? 'hot now' : 'plain', title: holder, sub: s && s.who ? '부른 쪽: ' + (s.who === 'main' ? 'main 스레드' : s.who === 'sort' ? 'sort' : '새 스레드 Thread-0') : caller });
    var obCls = s && s.obj ? (hot === 'ob' ? 'hot now' : 'good') : 'ghost';
    var obName = { lambda: '람다가 만든 객체', anon: '익명 클래스의 객체', named: sort ? 'ByName 객체' : 'Work 객체' }[c.form];
    P.box('ob', 396, 150, 270, 56, { cls: obCls, title: s && s.obj ? obName : '객체', sub: s && s.obj ? (sort ? 'compare가 할 일: a.compareTo(b)' : 'run이 할 일: 일한다 출력') : s && s.compile === 'err' ? '만들어지지 않음' : '아직 없음' });
    if (s && s.obj) P.arrow('ref', 't:r', 'ob:l', { cls: s.phase === 'call' ? 'hot' : 'good', label: s.phase === 'call' ? M + '()' : thread ? '참조' : '가리킴' });
    var outText = s && s.ran ? (s.out.length ? s.out.join(' / ') : '(아무것도 출력되지 않음)') : s && s.compile === 'err' ? '실행할 수 없음' : '';
    P.box('r1', 14, 222, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 282, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '실행했을 때 출력', right: outText });
    P.box('r3', 14, 326, 652, 36, { cls: s && s.runs ? 'wait' : s && s.compile === 'err' ? 'bad' : 'ghost', title: sort ? 'compare가 불린 횟수' : 'run이 실행된 횟수', right: s && s.compile === 'err' ? '실행할 수 없음' : (s ? s.runs : 0) + '번' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 스물한 가지 조합(Runnable 변수, 새 스레드, 직접 만든 Task는 각각 적는 방법 3가지와 부르는 줄이 있는지 없는지, 정렬 기준은 적는 방법 3가지)을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 별도 프로세스로 java Main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 오류의 진단 코드(compiler.err.prob.found.req의 "incompatible types: Task is not a functional interface, multiple non-overriding abstract methods found in interface Task"를 "Task는 구현할 메서드가 둘이어서 람다로 쓸 수 없음"으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력입니다. 단계 문장이 기대는 사실은 따로 실행해 확인했습니다. Runnable은 java.lang 패키지, Comparator는 java.util 패키지의 인터페이스이고, Object의 메서드를 빼면 본문 없는 메서드가 각각 run, compare 하나뿐이며 둘 다 @FunctionalInterface가 붙어 있습니다(Comparator에는 본문 없이 다시 선언한 equals도 있습니다). Thread에는 Runnable을 받는 생성자가, List에는 Comparator를 받는 sort가 있습니다. 람다, 익명 클래스, Work를 적은 줄 바로 뒤에서는 아무것도 출력되지 않았고, 세 경우 모두 Runnable을 구현한 객체였습니다(람다는 이 JDK에서 숨은 클래스, 익명 클래스는 Main$1, Work는 Work 클래스의 객체). 할 일을 실행한 스레드의 이름은 r.run()에서는 main, th.start()에서는 Thread-0이었습니다. 이 세 이름을 정렬할 때 sort가 compare를 부른 횟수는 4번이었고 첫 호출은 compare("가영", "다현")였습니다. 횟수와 순서는 명세가 정한 것이 아니라 이 JDK의 정렬 구현에서 관찰한 것입니다. API 문서는 같은 JDK의 소스에 붙은 것을 직접 읽었습니다. Runnable은 run()을 기능 메서드로 갖는 함수형 인터페이스이고, Thread(Runnable task)의 task는 이 스레드가 시작될 때 run 메서드가 불리는 객체이며 이름을 주지 않으면 "Thread-" 뒤에 정수를 붙인 이름이 자동으로 붙고, start()는 이 스레드가 실행을 시작하게 하며 한 스레드는 한 번만 시작할 수 있습니다. 가상 머신은 시작된 데몬이 아닌 스레드가 모두 끝나야 종료를 시작하고, 시작하지 않은 스레드는 종료를 막지 않습니다(Thread 클래스 문서). List.sort는 주어진 Comparator가 정하는 순서로 리스트를 정렬하고, Comparator.compare는 첫 인자가 작으면 음수, 같으면 0, 크면 양수를 돌려줍니다. 언어 규칙은 Java Language Specification(Java SE 21)의 15.27절(람다 표현식), 15.27.3절(람다는 대입·호출 문맥에서 함수형 인터페이스를 목표 타입으로 가짐), 15.27.4절(람다를 계산하면 객체가 만들어지고 본문은 그 메서드가 불릴 때 실행됨), 9.8절(함수형 인터페이스는 Object의 메서드를 빼고 추상 메서드가 하나뿐인 인터페이스), 15.9.5절(익명 클래스)을 따랐습니다. 명세의 해당 절은 일부만 요약으로 읽었고 원문 전체를 읽지는 못했습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 이 실습은 "람다는 구현할 메서드가 하나뿐인 인터페이스를 구현한 객체를 짧게 적은 것"과 그 할 일이 언제, 누구에 의해 실행되는지만 다룹니다. 람다의 this가 익명 클래스와 다른 것, 람다 안에서 바깥 지역 변수를 쓰는 규칙은 다루지 않았습니다. 메서드 참조와 java.util.function의 Supplier, Predicate, Consumer는 "세부 동작 실습: 람다와 함수형 인터페이스"에서, run()을 직접 부르는 것과 start()의 차이는 "스레드의 생성과 상태"에서 다룹니다.',
});
