Lab.register({
  id: 'generic_basic', nav: '제네릭', cat: '기초개념', mode: 'step', basic: true, deep: ['generic'],
  title: 'List<String>의 <String>은 무엇을 해 주는가',
  why: '같은 리스트 클래스를 String에도 Integer에도 쓰려면 아무 객체나 받게 만들어야 하는데, 그러면 무엇을 넣기로 했는지 컴파일러가 확인해 줄 수 없다. 종류마다 리스트를 따로 만들면 같은 코드를 되풀이해야 한다. 제네릭은 ArrayList 같은 클래스를 한 번만 만들고 쓰는 쪽이 <String>처럼 종류를 적게 해서, 코드 하나로 여러 종류를 다루면서도 컴파일러가 검사하게 한다.',
  use: 'List<String>, Map<String, Integer>처럼 자바의 컬렉션을 쓸 때 거의 언제나 본다. 스프링에서도 응답을 돌려줄 때 쓰는 ResponseEntity<String> 같은 꼴로 나온다. <>를 빼고 쓰는 로 타입은 제네릭이 없던 예전 코드와 함께 쓰려고 남겨 둔 것이라, 새 코드에서는 쓰지 않는다.',
  intro: 'List<String>의 <String>은 "이 리스트에는 String만 넣는다"고 컴파일러에게 알려 주는 표시입니다. 이 표시가 있으면 컴파일러는 String이 아닌 것을 넣으려는 줄을 막고, 리스트에서 꺼낸 것이 String이라는 것도 알아서 바로 String 변수에 대입하게 해 줍니다. 표시를 지우면 리스트는 아무 객체나 받고, 컴파일러는 꺼낸 것이 무엇인지 알지 못합니다. 그래서 꺼낼 때마다 (String)이라고 직접 적어야 하고, 잘못 넣은 것은 컴파일할 때가 아니라 실행 중에 꺼내는 순간에야 드러납니다. 이 실습은 <String>, 넣는 값, (String)을 바꿔 가며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주고 무엇이 출력되는지를 봅니다.',
  terms: ['제네릭', '타입 인자(<String>)', '로 타입(raw type)', 'ClassCastException'],
  controls: [
    { id: 'gen', label: 'List 뒤에 <String>을 적는다', type: 'check', value: true },
    { id: 'put', label: '리스트에 넣는 줄', type: 'select', value: 'str', options: [['str', 'names.add("김철수")'], ['num', 'names.add(123): 숫자를 넣는다']] },
    { id: 'cast', label: '꺼낼 때 (String)을 적는다', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '<String>은 어떻게 생겼고, 무엇을 해 주나', d: '<String>이 있으면 컴파일러가 넣는 값과 꺼낸 값의 타입을 알아서 처리합니다. 컴파일에 성공하고 3이 출력됩니다.', v: { gen: true, put: 'str', cast: false } },
    { t: '<String>을 지우면', q: '<String>을 지우면', d: '컴파일러가 꺼낸 것이 무엇인지 몰라 Object라고만 알고, String 변수에 대입하는 줄에서 컴파일 오류가 납니다.', v: { gen: false, put: 'str', cast: false } },
    { t: '<String>을 지우고 (String)을 적으면', q: '<String>을 지우고, 꺼낼 때 (String)을 적으면', d: '컴파일러가 하던 일을 사람이 (String)으로 직접 적은 것입니다. 컴파일에 성공하고 3이 출력됩니다.', v: { gen: false, put: 'str', cast: true } },
    { t: '숫자를 넣으면', q: '<String>이 있는 리스트에 숫자 123을 넣으면', d: '컴파일러가 넣는 줄에서 막습니다. 컴파일 오류이고, 실행되지 않습니다.', v: { gen: true, put: 'num', cast: false } },
    { t: '<String>을 지우고 숫자를 넣으면', q: '<String>을 지우고 123을 넣은 뒤 (String)으로 꺼내면', d: '컴파일은 성공하지만 실행 중 꺼내는 줄에서 ClassCastException으로 멈춥니다.', v: { gen: false, put: 'num', cast: true } },
  ],
  // 컴파일러가 알려 주는 것(실제 javac의 진단과 노트를 옮긴 것)
  errAdd: '123(int)은 String이 아니어서 넣을 수 없음',
  errGet: '꺼낸 것은 Object라서 String 변수에 대입할 수 없음',
  noteText: '오류는 없고, 안전하지 않은 작업(unchecked)을 썼다는 노트만 나옴',
  code: function (c) {
    var o = ['import java.util.ArrayList;', 'import java.util.List;', '', 'public class Main {', '    public static void main(String[] args) {'];
    if (c.gen) o.push('        // <String>: 이 리스트에는 String만 넣는다는 표시');
    o.push(c.gen ? '        List<String> names = new ArrayList<>();' : '        List names = new ArrayList();');
    o.push(c.put === 'str' ? '        names.add("김철수");' : '        names.add(123);');
    if (c.cast) o.push('        // (String): 꺼낸 것을 String으로 다루겠다고 직접 적는다');
    o.push(c.cast ? '        String first = (String) names.get(0);' : '        String first = names.get(0);');
    o.push('        System.out.println(first.length());', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.gen ? '<String> 있음' : '<String> 없음') + ' · ' + (c.put === 'str' ? '"김철수"를 넣음' : '123을 넣음') + ' · ' + (c.cast ? '(String) 있음' : '(String) 없음'); },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행 결과'],
  simulate: function (c) {
    var ev = [], sum = [], gen = c.gen, num = c.put === 'num', cast = c.cast;
    var ADD = num ? 'names.add(123);' : 'names.add("김철수");';
    var GET = cast ? 'String first = (String) names.get(0);' : 'String first = names.get(0);';
    var argText = num ? '123 (int)' : '"김철수" (String)';
    var addErr = gen && num, getErr = !gen && !cast;
    var ok = !addErr && !getErr, nerr = ok ? 0 : 1;
    var errAt = addErr ? [ADD] : getErr ? [GET] : [];
    var first = addErr ? this.errAdd : getErr ? this.errGet : '';
    var st = { hot: '', adSub: [argText], lsSub: ['실행 전'], gtSub: [cast ? '(String)을 적음' : '(String) 없음'], bad: {}, added: false, got: false, stop: false, compile: '', errs: 0, errText: '', ran: false, out: [], exc: '', size: 0, checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }

    // 1. List names = ... 줄을 읽는다
    st.hot = 'ls';
    if (gen) {
      st.lsSub = ['String만 넣는 리스트', '(컴파일러가 기억함)'];
      st.checks.push(['List 뒤의 <String>', { v: '있음: names에는 String만', cls: 'good' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. List<String> names = new ArrayList<>(); 줄에서 List 뒤의 <String>을 읽고, "names가 가리킬 리스트에는 String만 넣는다"고 기억합니다. <String>은 이 리스트에 넣을 것의 타입을 컴파일러에게 알려 주는 표시입니다.', '');
    } else {
      st.lsSub = ['<String> 표시 없음', '아무 객체나 넣는 리스트'];
      st.checks.push(['List 뒤의 <String>', { v: '없음: 무엇을 넣는지 모름', cls: 'bad' }]);
      push('컴파일러가 소스를 위에서부터 읽습니다. List names = new ArrayList(); 줄에는 List 뒤에 <...>가 없습니다. 컴파일러는 names가 가리킬 리스트에 무엇을 넣는지 알지 못하고, 아무 객체나 넣을 수 있는 리스트로 다룹니다. 이렇게 <...> 없이 쓴 List를 로 타입(raw type)이라고 합니다.', '');
    }

    // 2. names.add(...) 줄을 확인한다
    st.hot = 'ad';
    if (addErr) {
      st.bad.add = true; fail(this.errAdd);
      st.adSub = [argText, '컴파일러가 막음'];
      st.checks.push([ADD + ' 줄', { v: '오류: 123은 String이 아님', cls: 'bad' }]);
      push('컴파일러가 ' + ADD + ' 줄을 확인합니다. 넣으려는 123은 숫자(int)이고 String이 아닌데, names의 타입은 String만 넣는 리스트입니다. 그래서 이 줄에서 오류가 납니다(javac: incompatible types: int cannot be converted to String). 넣기 전에 컴파일러가 미리 막은 것입니다.' + (cast ? ' 꺼내는 줄에 (String)을 적은 것은 이 오류와 상관이 없습니다.' : ''), 'bad');
    } else if (gen) {
      st.adSub = [argText, '통과'];
      st.checks.push([ADD + ' 줄', { v: '통과: "김철수"는 String', cls: 'good' }]);
      push('컴파일러가 ' + ADD + ' 줄을 확인합니다. 넣으려는 "김철수"는 String이고, names의 타입은 String만 넣는 리스트이므로 통과합니다.', 'good');
    } else {
      st.adSub = [argText, '검사 없이 통과'];
      st.checks.push([ADD + ' 줄', { v: '통과: 무엇이든 받음', cls: '' }]);
      push('컴파일러가 ' + ADD + ' 줄을 확인합니다. names가 가리키는 리스트에 무엇을 넣는지 모르므로 넣는 값을 검사하지 못하고, ' + (num ? '숫자 123도' : '"김철수"도') + ' 그대로 통과시킵니다. 다만 안전하지 않은 작업(unchecked)을 쓴다는 노트를 남깁니다. 노트는 오류가 아니어서 컴파일은 계속됩니다.', '');
    }

    // 3. String first = ... names.get(0) 줄을 확인한다
    st.hot = 'gt';
    if (gen) {
      st.gtSub = ['꺼낸 것은 String', 'first에 바로 대입함'];
      st.checks.push(['names.get(0) 줄', { v: '통과: 꺼낸 것은 String', cls: 'good' }]);
      push('컴파일러가 ' + GET + ' 줄을 확인합니다. names에는 String만 넣기로 했으므로, 꺼낸 것이 String이라는 것을 컴파일러가 알고 있습니다. 그래서 String 변수 first에 바로 대입해도 됩니다.' + (cast ? ' (String)을 적었지만 이미 String인 줄 아는 컴파일러에게는 필요 없는 글자입니다. 적어도 오류는 아닙니다.' : ' (String)을 적지 않아도 됩니다.') + (addErr ? ' 이 줄에는 문제가 없고, 오류는 위의 add 줄 하나뿐입니다.' : ''), cast ? '' : 'good');
    } else if (cast) {
      st.gtSub = ['(String)으로 바꾼다고', '적었으므로 통과'];
      st.checks.push(['names.get(0) 줄', { v: '통과: (String)을 믿음', cls: '' }]);
      push('컴파일러가 ' + GET + ' 줄을 확인합니다. 컴파일러는 꺼낸 것을 Object라고만 알지만, 사람이 (String)을 적어 "String으로 바꿔라"고 했으므로 통과시킵니다. 꺼낸 것이 정말 String인지는 컴파일할 때 확인하지 못하고, 실행 중에 확인됩니다.', '');
    } else {
      st.bad.get = true; fail(this.errGet);
      st.gtSub = ['Object라고만 앎', '컴파일러가 막음'];
      st.checks.push(['names.get(0) 줄', { v: '오류: Object를 String 변수에 대입할 수 없음', cls: 'bad' }]);
      push('컴파일러가 ' + GET + ' 줄을 확인합니다. 컴파일러는 names가 가리키는 리스트에 무엇을 넣었는지 모르므로 꺼낸 것을 Object라고만 압니다. Object는 String 변수 first에 대입할 수 없어 오류가 납니다(javac: incompatible types: Object cannot be converted to String).' + (num ? ' 앞 줄에서 123을 넣었는지는 컴파일러가 따지지 않았고, 오류는 이 줄 하나뿐입니다.' : ' 앞 줄에서 String을 넣었어도 컴파일러는 그것을 따라가지 않습니다.'), 'bad');
    }

    // 4. 컴파일 결과
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push(gen ? '컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다.' : '컴파일이 성공해 실행할 Main 클래스 파일이 만들어집니다. 컴파일러가 알려 준 것은 오류가 아니라, 안전하지 않은 작업을 쓴다는 노트 두 줄뿐입니다.' + (num ? ' 컴파일러는 123을 넣는다는 것을 모른 채 (String)을 믿고 통과시켰습니다.' : ''), 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + nerr + '개', cls: 'bad' }]);
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 ' + nerr + '개이고, "' + first + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없습니다.', 'bad');
    }

    // 5~8. 실행
    if (ok) {
      st.hot = 'ls'; st.ran = true; st.lsSub = ['넣은 값: 없음'];
      push('java Main으로 실행합니다. main이 시작되고, new ArrayList가 빈 리스트를 만들어 names가 가리키게 합니다.', '');
      st.hot = 'ad'; st.added = true; st.size = 1;
      st.lsSub = [num ? '넣은 값: 123 (Integer)' : '넣은 값: "김철수" (String)'];
      st.adSub = [argText, '실행됨'];
      push(ADD + ' 줄이 실행됩니다. ' + (num ? '123은 Integer 객체로 바뀌어 리스트에 추가됩니다. 로 타입이라 넣을 때 확인하는 것이 없어서, 아무 일도 일어나지 않습니다.' : (gen ? '"김철수"가 리스트에 추가됩니다.' : '"김철수"가 리스트에 추가됩니다. 넣을 때 확인하는 것은 없습니다.')), '');
      st.hot = 'gt';
      if (num) {
        st.stop = true; st.exc = 'ClassCastException';
        st.gtSub = ['꺼낸 것: Integer', '실행 중 멈춤'];
        st.out = [];
        push(GET + ' 줄이 실행됩니다. 리스트에서 꺼낸 것은 123, 즉 Integer 객체입니다. (String)이 적혀 있으므로 JVM이 꺼낸 것이 String인지 확인하는데, Integer는 String이 아니어서 ClassCastException이 일어납니다(JVM: Integer cannot be cast to String). 이 예외를 처리하는 코드가 없으므로 프로그램은 여기서 멈추고, 그 아래 println 줄은 실행되지 않습니다. 컴파일러는 이 줄을 통과시켰지만, 잘못 넣은 것은 꺼내는 순간에야 드러났습니다. 123을 넣은 names.add(123); 줄에서는 아무 일도 없었습니다.', 'bad');
      } else {
        st.got = true;
        st.gtSub = ['꺼낸 것: "김철수"', 'String'];
        push(GET + ' 줄이 실행됩니다. 리스트에서 "김철수"를 꺼내 first에 대입합니다.' + (gen ? '' : ' (String)이 적혀 있으므로 JVM이 꺼낸 것이 String인지 확인하고, "김철수"는 String이어서 통과합니다.'), 'good');
        st.hot = ''; st.out.push('3');
        push('System.out.println(first.length()); 줄이 실행됩니다. first는 "김철수"이고, length()가 글자 수 3을 돌려주므로 3을 출력합니다.', 'good');
      }
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (gen && !num && !cast) {
      sum.push('<String>은 "names가 가리키는 리스트에는 String만 넣는다"고 컴파일러에게 알려 주는 표시입니다. 컴파일러는 이 표시를 보고 add 줄에서 넣는 값이 String인지 확인했고, get 줄에서 꺼낸 것이 String이라는 것도 알아서 (String) 없이 바로 String 변수에 대입하게 해 주었습니다.');
      sum.push('<String>은 프로그램이 실행할 코드가 아니라 컴파일러가 컴파일하면서 확인하는 표시입니다. 이 표시가 있어서 잘못된 줄을 실행하기 전에 막을 수 있습니다.');
    } else if (gen && !num) {
      sum.push('<String>이 있으면 (String)을 적지 않아도 되고, 적어도 컴파일되며 결과는 같습니다. 컴파일에 성공했고 3이 출력되었습니다.');
      sum.push('컴파일러는 꺼낸 것이 String인 줄 이미 알기 때문에 (String)은 필요 없는 글자입니다(javac의 경고 옵션 -Xlint:all을 켜면 불필요한 캐스트라고 알려 줍니다).');
    } else if (gen) {
      sum.push('<String>이 있는 리스트에 숫자 123을 넣으려 하면 컴파일러가 names.add(123); 줄에서 막습니다. 컴파일에 실패해 실행할 수 없었습니다.' + (cast ? ' 꺼내는 줄에 (String)을 적은 것은 이 오류와 상관이 없었습니다.' : ''));
      sum.push('잘못 넣은 것이 실행하기 전에, 넣으려는 그 줄에서 드러났습니다. 꺼내는 줄에는 문제가 없었고 오류는 그 한 군데뿐이었습니다.');
    } else if (!cast) {
      sum.push('<String>을 지우면 컴파일러는 names가 가리키는 리스트에 무엇을 넣었는지 몰라서, 꺼낸 것을 Object라고만 압니다. Object는 String 변수에 대입할 수 없어 get 줄에서 컴파일 오류가 났고, 실행할 수 없었습니다.' + (num ? ' 123을 넣은 줄은 컴파일러가 막지 않았습니다.' : ' add 줄은 오류가 아니었습니다.'));
      sum.push('<String> 없이는 꺼낸 것이 실제로 어떤 타입인지 컴파일러가 알 수 없습니다. 꺼낼 때마다 (String)이라고 직접 적어야 컴파일됩니다.');
    } else if (!num) {
      sum.push('<String>을 지워도 꺼낼 때 (String)을 직접 적으면 컴파일에 성공하고 3이 출력됩니다. <String>이 있을 때 컴파일러가 알아서 하던 일을 사람이 직접 적은 것입니다.');
      sum.push('다만 컴파일러는 (String)이 맞는지 확인하지 못하고 믿을 뿐입니다. 이번에는 넣은 것이 정말 String이어서 실행 중 확인을 통과했습니다. 넣는 줄에는 안전하지 않은 작업이라는 노트도 남았습니다.');
    } else {
      sum.push('<String>을 지우고 123을 넣은 뒤 (String)으로 꺼내면 컴파일은 성공하지만, 실행 중 꺼내는 줄에서 ClassCastException으로 멈춥니다. 123을 넣을 때는 아무 일도 없었고, 꺼내는 순간 JVM이 Integer를 String으로 바꿀 수 없다고 알려 주었습니다.');
      sum.push('잘못 넣은 줄(add)과 멈춘 줄(get)이 다릅니다. <String>이 있었다면 컴파일러가 넣는 줄에서 막아, 실행하기 전에 알 수 있었던 잘못입니다.');
    }
    var run = !ok ? '실행할 수 없음' : st.exc ? 'ClassCastException으로 멈춤' : st.out.join(' / ');
    return { events: ev, summary: sum, nerr: nerr, errAt: errAt, row: [ok ? '성공' : '오류', ok ? (gen ? '없음' : this.noteText) : first, run] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일');
    if (s.out.length || s.exc) H.table(v, ['실행 결과'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }).concat(s.exc ? [{ cls: '', cells: [{ v: s.exc + '으로 멈춤', cls: 'bad' }] }] : []), '출력');
    H.counters(v, [[s.size, '리스트에 넣은 값'], [s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 가운데에 리스트 names(넣은 값과 그 타입), 왼쪽에 넣는 줄 names.add, 오른쪽에 꺼내는 줄 names.get. 컴파일러가 막은 곳과 실행 중 멈춘 곳이 상자 안 글로 구분된다. 아래에 컴파일 결과와 실행 결과.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 264);
    var hot = s ? s.hot : '', bad = s ? s.bad : {};
    var argText = c.put === 'num' ? '123 (int)' : '"김철수" (String)';
    P.box('ad', 14, 20, 170, 96, { cls: bad.add ? 'bad' : hot === 'ad' ? 'hot now' : s && s.added ? 'good' : 'plain', title: 'names.add(...)', sub: s ? s.adSub : [argText] });
    P.box('ls', 234, 20, 212, 96, { cls: hot === 'ls' ? 'hot now' : s && s.size ? 'wait' : 'plain', title: 'names (List)', sub: s ? s.lsSub : ['실행 전'] });
    P.box('gt', 496, 20, 170, 96, { cls: s && s.stop ? 'bad now' : bad.get ? 'bad' : hot === 'gt' ? 'hot now' : s && s.got ? 'good' : 'plain', title: 'names.get(0)', sub: s ? s.gtSub : [c.cast ? '(String)을 적음' : '(String) 없음'] });
    if (s && s.added) P.arrow('put', 'ad:r', 'ls:l', { cls: 'good' });
    if (s && (s.got || s.stop)) P.arrow('take', 'ls:r', 'gt:l', { cls: s.stop ? 'bad' : 'good' });
    P.box('r1', 14, 140, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 202, 652, 40, { cls: s && s.exc ? 'bad' : s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '실행 결과', right: s && s.exc ? s.exc + '으로 멈춤' : s && s.ran ? (s.out.length ? s.out.join(' / ') : '(아직 출력 없음)') : s && s.compile === 'err' ? '실행할 수 없음' : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)이고, 컴파일은 경고 옵션을 켜지 않은 기본 옵션으로 했습니다. 여덟 가지 조합을 모두, 화면의 코드와 같은 소스(import 줄까지 줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력과 예외를 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드와 영어 메시지(compiler.err.prob.found.req의 "int cannot be converted to String"과 "Object cannot be converted to String"을 화면의 두 가지 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 컴파일러가 오류 말고 남긴 노트, 실행했을 때의 출력, 실행 중 예외의 종류와 메시지와 예외가 난 줄입니다. 단계 문장이 기대는 사실도 따로 실행해 확인했습니다. <String>이 없는 리스트에 123을 넣는 줄은 실행 중에도 예외 없이 지나가고 리스트의 개수가 1이 되며, 꺼내는 (String) 줄에서야 ClassCastException이 났습니다(메시지: Integer를 String으로 바꿀 수 없음). <String>이 없어도 꺼낸 것을 Object 변수에 대입하는 줄은 컴파일되고, 꺼낸 것에 캐스팅 없이 length()를 부르는 줄은 컴파일되지 않습니다. <String>이 있으면 꺼낸 것에 length()를 바로 부를 수 있습니다. 기본 옵션에서 로 타입이 든 조합(컴파일에 성공한 것은 물론 오류가 난 것도)은 오류가 아니라 노트 두 줄(안전하지 않은 작업을 쓴다는 것과 -Xlint:unchecked로 다시 컴파일하라는 것)만 남겼고, 경고(warning)로는 나오지 않았습니다. 경고 옵션 -Xlint:unchecked와 -Xlint:rawtypes를 켜서 따로 컴파일하면 List와 ArrayList를 <> 없이 쓴 선언 줄에 로 타입 경고가, names.add 줄에 unchecked 호출 경고가 났고, (String)으로 꺼내는 줄에는 경고가 없었습니다. <String>이 있고 (String)도 적은 조합은 기본 옵션에서 노트도 없이 컴파일되고, -Xlint:all을 켜면 불필요한 캐스트라는 경고가 났습니다. <String>이 있는 리스트에 123을 넣는 오류는 javac가 줄여 알린 것으로(노트: Some messages have been simplified), -Xdiags:verbose로 다시 컴파일하면 add(int)에 맞는 메서드가 없다는 compiler.err.cant.apply.symbols 오류였습니다. 문서는 WebFetch로 열어 확인했습니다. Java Language Specification(Java SE 21)의 4.5절과 4.5.1절(List<String>처럼 제네릭 클래스에 타입 인자를 붙인 것이 매개변수화된 타입이고, 타입 인자는 참조 타입이어야 해서 List<int>는 쓸 수 없음), 4.8절(<>를 붙이지 않은 이름이 로 타입이고 옛 코드와의 호환을 위해서만 허용되며, 로 타입 멤버의 일부 접근이 unchecked 경고를 낸다는 것), 5.5절과 5.1.6절(검사가 필요한 참조 타입 변환은 실행 중에 객체의 클래스를 확인하고 틀리면 ClassCastException이 날 수 있다는 것), 그리고 자바 튜토리얼 "Why Use Generics?"(제네릭은 컴파일할 때 더 강하게 검사하고, 꺼낼 때의 캐스팅을 없애 준다는 것)를 따랐습니다. 열린 문서는 요약된 답으로 돌아와 원문을 모두 직접 읽지는 못했고, jls-4.html은 앞쪽 100000자까지만 읽었습니다(4.5절과 4.8절은 그 안에 있었습니다). 123이 Integer 객체로 바뀌어 리스트에 추가된다는 것은 명세 5.1.7절(박싱)을 열어 확인한 것이 아니라, 실행 중 예외 메시지에서 관찰한 것입니다. 오류의 종류, 개수, 어느 줄에서 나는지, 노트가 남는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 화면의 코드는 클래스 하나에 main만 둔 모양입니다. <String>이 있어도 컴파일러의 검사를 피하는 방법이 있고, 제네릭 클래스나 메서드를 직접 만드는 것, 와일드카드, 실행 중에는 <String>이 남지 않는다는 것(타입 소거)도 이 실습은 다루지 않았습니다. 이것들은 "세부 동작 실습: 제네릭"에서 다룹니다.',
});
