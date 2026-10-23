Lab.register({
  id: 'lambda', nav: '람다와 함수형 인터페이스', cat: '자바 언어', mode: 'step',
  title: '람다에 적은 코드는 언제 실행되나',
  why: '람다가 없을 때는 정렬 기준이나 버튼을 눌렀을 때 할 일처럼 동작 하나를 넘기려 해도, 익명 클래스로 인터페이스를 구현하는 여러 줄을 적어야 했다. 람다는 추상 메서드가 하나뿐인 인터페이스의 구현을 (매개변수) -> 본문 모양으로 줄여서, 넘길 동작 자체만 적게 했다.',
  use: '스트림의 filter와 map, 리스트의 forEach와 removeIf와 sort, Map의 computeIfAbsent처럼 동작을 받는 표준 메서드에 넘길 때 쓴다. Optional의 orElseGet처럼 필요할 때만 값을 만들게 미뤄 둘 때나, 스레드에 넘길 Runnable을 만들 때도 쓴다. 본문이 길어지면 이름 있는 메서드로 빼고 메서드 참조로 넘긴다.',
  intro: '람다는 "나중에 실행할 동작"을 객체로 만드는 문법입니다. 람다를 적은 줄에서는 본문이 실행되지 않고, 그 객체를 넘겨받은 쪽이 부를 때 실행됩니다. 이 실습에서는 람다를 자바 표준 메서드(ArrayList의 forEach·removeIf·sort, 스트림의 filter·map, Comparator.comparing, Optional의 orElseGet)에 넘기고, 표준 메서드가 그 람다를 언제 몇 번 부르는지 봅니다. 람다의 타입은 받는 메서드의 매개변수 타입이 정합니다. 여기서는 모두 자바가 java.util.function 패키지에 마련해 둔 Consumer, Predicate, Function, Supplier입니다.',
  terms: ['람다 표현식', '함수형 인터페이스', '람다를 받는 표준 메서드', '메서드 참조', 'Stream API', '지연 평가(Lazy Evaluation)', 'orElse와 orElseGet', 'Comparable과 Comparator', '익명 클래스와 람다의 차이'],
  controls: [
    { id: 'api', label: '람다를 넘기는 표준 메서드', type: 'select', value: 'forEach', options: [
      ['forEach', 'names.forEach(n -> …) : Consumer를 받는다'],
      ['forEachRef', 'names.forEach(System.out::println) : 메서드 참조로 넘긴다'],
      ['removeIf', 'names.removeIf(n -> …) : Predicate를 받는다'],
      ['stream', 'names.stream().filter(n -> …).map(n -> …).toList() : Predicate, Function'],
      ['nostream', 'names.stream().filter(n -> …).map(n -> …) : 최종 연산 없이 끝낸다'],
      ['sort', 'names.sort(Comparator.comparing(n -> …)) : Function을 받는다'],
      ['orElse', 'saved.orElse(defaultName()) : 람다가 아니라 값을 넘긴다'],
      ['orElseGet', 'saved.orElseGet(() -> defaultName()) : Supplier를 받는다']],
      hint: 'forEach, removeIf, sort, stream, filter, map, toList, Comparator.comparing, orElse, orElseGet은 모두 자바 표준 메서드입니다. defaultName은 이 예제에서 지은 메서드입니다.' },
    { id: 'data', label: '넘겨받는 쪽의 값', type: 'select', value: 'full', options: [['full', '값이 있다: List.of("kiwi", "fig", "banana") / Optional.of("민수")'], ['empty', '비어 있다: 빈 ArrayList / Optional.empty()']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'names.forEach에 람다를 넘기면 람다 본문은 언제, 몇 번 실행되나', d: 'forEach를 부르는 줄에서 람다 객체가 만들어져 넘어가고, forEach가 요소마다 accept를 불러 본문이 세 번 실행됩니다.', v: { api: 'forEach', data: 'full' } },
    { t: '빈 리스트에 forEach', q: '빈 리스트에 forEach를 부르면 람다 본문은 몇 번 실행되나', d: '요소가 없어서 forEach가 accept를 한 번도 부르지 않습니다. 람다를 넘겼어도 본문은 실행되지 않습니다.', v: { api: 'forEach', data: 'empty' } },
    { t: '메서드 참조로 넘기면', q: 'names.forEach(System.out::println)처럼 메서드 참조로 넘기면', d: 'n -> System.out.println(n)과 같은 Consumer입니다. forEach가 요소마다 불러 이름이 세 줄 출력됩니다.', v: { api: 'forEachRef', data: 'full' } },
    { t: 'removeIf에 조건을 넘기면', q: 'names.removeIf에 Predicate 람다를 넘기면 어떤 요소가 지워지나', d: 'removeIf가 요소마다 test를 불러 true가 나온 fig만 지웁니다. 남는 것은 [kiwi, banana]입니다.', v: { api: 'removeIf', data: 'full' } },
    { t: '스트림 filter와 map', q: 'filter와 map에 넘긴 람다는 어떤 순서로 실행되나', d: 'toList를 부르면 요소가 하나씩 filter를 지나고, 통과한 요소는 다음 요소보다 먼저 map으로 갑니다. filter는 3번, map은 2번 불립니다.', v: { api: 'stream', data: 'full' } },
    { t: '최종 연산이 없으면', q: 'filter와 map까지만 부르고 toList 같은 최종 연산을 부르지 않으면', d: '스트림을 만들기만 하고 요소를 흘려보내지 않으므로 filter와 map의 람다는 한 번도 실행되지 않습니다.', v: { api: 'nostream', data: 'full' } },
    { t: 'Comparator.comparing으로 정렬하면', q: 'Comparator.comparing에 넘긴 키 람다는 몇 번 불리나', d: 'sort가 두 요소를 비교할 때마다 Comparator가 키 람다를 두 번 부릅니다. 이 세 요소는 JDK 21에서 비교 3번, 키 람다 6번이었습니다.', v: { api: 'sort', data: 'full' } },
    { t: 'orElse에 메서드 호출을 넘기면', q: 'Optional에 값이 있는데 orElse(defaultName())이라고 쓰면 defaultName이 실행되나', d: '실행됩니다. 자바는 orElse를 부르기 전에 인자 defaultName()을 먼저 계산합니다. 결과는 민수이지만 "기본값 만듦"이 출력됩니다.', v: { api: 'orElse', data: 'full' } },
    { t: 'orElseGet에 람다를 넘기면', q: 'Optional에 값이 있을 때 orElseGet(() -> defaultName())은', d: 'orElseGet은 값이 있으면 get을 부르지 않으므로 defaultName이 실행되지 않습니다.', v: { api: 'orElseGet', data: 'full' } },
    { t: 'orElseGet인데 비어 있으면', q: 'Optional이 비어 있을 때 orElseGet(() -> defaultName())은', d: '값이 없으니 orElseGet이 get을 한 번 불러 람다가 실행되고, defaultName이 돌려준 손님이 결과가 됩니다.', v: { api: 'orElseGet', data: 'empty' } },
  ],
  NAMES: ['kiwi', 'fig', 'banana'],
  // 정렬에서 Comparator.compare가 받은 두 요소의 순서. JDK 21의 ArrayList.sort(TimSort)가 [kiwi, fig, banana]를 정렬할 때 실제로 부른 순서(verify/plain/lambda_probe.out.txt)
  SORT_CMP: [['fig', 'kiwi'], ['banana', 'fig'], ['banana', 'kiwi']],
  // 표준 메서드마다: 이름, 매개변수(JDK 21 선언), 람다가 구현하는 메서드, 표준 메서드의 코드에서 람다를 부르는 줄(JDK 21 소스에서 옮김)
  STD: {
    forEach: [['ArrayList.forEach', 'Consumer<? super E> action', 'accept', 'action.accept(elementAt(es, i));  (요소마다)']],
    removeIf: [['ArrayList.removeIf', 'Predicate<? super E> filter', 'test', 'filter.test(elementAt(es, i))  (요소마다. true면 지울 자리로 표시)']],
    stream: [['Stream.filter', 'Predicate<? super T> predicate', 'test', '최종 연산이 요소를 하나씩 흘려보낼 때 부른다'], ['Stream.map', 'Function<? super T, ? extends R> mapper', 'apply', 'filter를 통과한 요소마다 부른다']],
    sort: [['ArrayList.sort', 'Comparator<? super E> c', 'compare', 'Arrays.sort((E[]) elementData, 0, size, c);'], ['Comparator.comparing', 'Function<? super T, ? extends U> keyExtractor', 'apply', '(c1, c2) -> keyExtractor.apply(c1).compareTo(keyExtractor.apply(c2))']],
    orElse: [['Optional.orElse', 'T other', '(없음. 값을 받는다)', 'return value != null ? value : other;']],
    orElseGet: [['Optional.orElseGet', 'Supplier<? extends T> supplier', 'get', 'return value != null ? value : supplier.get();']],
  },
  std: function (api) { return this.STD[api === 'forEachRef' ? 'forEach' : api === 'nostream' ? 'stream' : api]; },
  isOpt: function (api) { return api === 'orElse' || api === 'orElseGet'; },
  code: function (c) {
    var a = c.api, full = c.data === 'full', opt = this.isOpt(a), L = [];
    var imp = opt ? ['java.util.Optional'] : ['java.util.ArrayList'].concat(a === 'sort' ? ['java.util.Comparator'] : [], ['java.util.List'], a === 'nostream' ? ['java.util.stream.Stream'] : []);
    imp.forEach(function (x) { L.push('import ' + x + ';'); });
    L.push('', 'public class Main {');
    if (opt) L.push('    static String defaultName() {                   // 예시로 만든 메서드 (표준 아님)', '        System.out.println("기본값 만듦");', '        return "손님";', '    }', '');
    L.push('    public static void main(String[] args) {');
    if (opt) L.push('        Optional<String> saved = ' + (full ? 'Optional.of("민수");' : 'Optional.empty();'));
    else L.push('        List<String> names = ' + (full ? 'new ArrayList<>(List.of("kiwi", "fig", "banana"));' : 'new ArrayList<>();'));
    var body = {
      forEach: ['System.out.println("forEach 부르기 전");', 'names.forEach(n -> System.out.println("람다 실행: " + n));   // Consumer<String>', 'System.out.println("forEach 끝");'],
      forEachRef: ['System.out.println("forEach 부르기 전");', 'names.forEach(System.out::println);       // n -> System.out.println(n)과 같은 Consumer<String>', 'System.out.println("forEach 끝");'],
      removeIf: ['System.out.println("removeIf 부르기 전");', 'names.removeIf(n -> {                     // Predicate<String>', '    System.out.println("람다 실행: " + n);', '    return n.length() <= 3;               // true면 이 요소를 지운다', '});', 'System.out.println("남은 것 " + names);'],
      stream: ['System.out.println("스트림 만들기 전");', 'List<Integer> lengths = names.stream()', '        .filter(n -> {                    // Predicate<String>', '            System.out.println("filter 람다: " + n);', '            return n.length() > 3;', '        })', '        .map(n -> {                       // Function<String, Integer>', '            System.out.println("map 람다: " + n);', '            return n.length();', '        })', '        .toList();                        // 최종 연산: 여기서 요소가 흘러간다', 'System.out.println("결과 " + lengths);'],
      nostream: ['System.out.println("스트림 만들기 전");', 'Stream<Integer> lengths = names.stream()', '        .filter(n -> {                    // Predicate<String>', '            System.out.println("filter 람다: " + n);', '            return n.length() > 3;', '        })', '        .map(n -> {                       // Function<String, Integer>', '            System.out.println("map 람다: " + n);', '            return n.length();', '        });                               // 최종 연산(toList 등)을 부르지 않는다', 'System.out.println("스트림을 만든 뒤");'],
      sort: ['System.out.println("sort 부르기 전");', 'names.sort(Comparator.comparing(n -> {   // Function<String, Integer>를 받아 Comparator를 만든다', '    System.out.println("키 꺼냄: " + n);', '    return n.length();                    // 글자 수로 비교한다', '}));', 'System.out.println("정렬 " + names);'],
      orElse: ['System.out.println("orElse 부르기 전");', 'String name = saved.orElse(defaultName());          // 인자를 먼저 계산해서 넘긴다', 'System.out.println("이름 " + name);'],
      orElseGet: ['System.out.println("orElseGet 부르기 전");', 'String name = saved.orElseGet(() -> defaultName());  // Supplier<String>', 'System.out.println("이름 " + name);'],
    }[a];
    body.forEach(function (x) { L.push('        ' + x); });
    L.push('    }', '}');
    return L.join('\n');
  },
  label: function (c) { return { forEach: 'forEach', forEachRef: 'forEach(메서드 참조)', removeIf: 'removeIf', stream: 'filter·map·toList', nostream: 'filter·map (최종 연산 없음)', sort: 'Comparator.comparing', orElse: 'orElse', orElseGet: 'orElseGet' }[c.api] + ' · ' + (c.data === 'full' ? '값이 있다' : '비어 있다'); },
  columns: ['표준 메서드', '받는 함수형 인터페이스', '본문이 실행된 횟수', '결과'],
  simulate: function (c) {
    var a = c.api, full = c.data === 'full', ev = [], sum = [];
    var st = { out: [], msgs: [], calls: 0 }, list = full ? this.NAMES.slice() : [], row;
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function msg(f, t, s, cls) { st.msgs.push({ f: f, t: t, s: s, cls: cls || '' }); }
    function say(line) { st.out.push(line); msg('main', '', '출력: ' + line); }
    function show(xs) { return '[' + xs.join(', ') + ']'; }
    // System.out.println 한 줄을 실행하는 단계
    function print(codeText, line, extra) { say(line); push(codeText + ': 출력되는 줄은 "' + line + '"입니다.' + (extra ? ' ' + extra : '')); }
    if (this.isOpt(a)) {
      var v = full ? '민수' : '손님';
      msg('main', '', full ? 'saved = Optional.of("민수")' : 'saved = Optional.empty()');
      push(full ? 'Optional<String> saved = Optional.of("민수"): 자바 표준 Optional로, 값 "민수"가 있는 Optional을 만듭니다.' : 'Optional<String> saved = Optional.empty(): 자바 표준 Optional로, 값이 없는 빈 Optional을 만듭니다.');
      print('System.out.println("' + a + ' 부르기 전")', a + ' 부르기 전');
      if (a === 'orElse') {
        st.calls = 1; st.out.push('기본값 만듦'); msg('main', 'dn', 'defaultName() 먼저 계산', 'hot'); msg('dn', '', '출력: 기본값 만듦', 'hot');
        push('saved.orElse(defaultName()): 자바는 메서드를 부르기 전에 인자를 먼저 계산합니다. 그래서 orElse로 들어가기 전에 defaultName()이 실행되어 "기본값 만듦"이 출력됩니다.' + (full ? ' Optional에 값이 있는데도 실행된 것입니다.' : ''), full ? 'bad' : 'good');
        msg('main', 'std', 'orElse("손님")');
        msg('std', '', full ? 'value가 있어 "민수"를 돌려줌' : 'value가 없어 other("손님")를 돌려줌', 'good');
        push('orElse("손님"): orElse가 받는 것은 이미 계산된 값 "손님"입니다. 표준 Optional.orElse의 본문은 return value != null ? value : other; 한 줄이고, ' + (full ? '값이 있으므로 "민수"를 돌려줍니다. 계산해 둔 "손님"은 쓰이지 않습니다.' : '값이 없으므로 받은 "손님"을 돌려줍니다.'));
      } else {
        msg('main', 'std', 'orElseGet(람다)');
        push('saved.orElseGet(() -> defaultName()): 람다로 Supplier<String> 객체를 만들어 orElseGet에 넘깁니다. 람다를 만들고 넘기는 것만으로는 defaultName()이 실행되지 않습니다.');
        if (full) {
          msg('std', '', 'value가 있어 get()을 부르지 않고 "민수"를 돌려줌', 'good');
          push('표준 Optional.orElseGet의 본문은 return value != null ? value : supplier.get(); 한 줄입니다. 값이 있으므로 supplier.get()을 부르지 않고 "민수"를 돌려줍니다. 람다 본문은 실행되지 않았습니다.', 'good');
        } else {
          st.calls = 1; st.out.push('기본값 만듦'); msg('std', 'lam', 'get()', 'hot'); msg('lam', '', 'defaultName() 실행, 출력: 기본값 만듦', 'hot');
          push('supplier.get(): 값이 없으므로 orElseGet이 get을 부릅니다. 여기서 비로소 람다 본문 defaultName()이 실행되어 "기본값 만듦"이 출력되고, 돌아온 "손님"이 결과가 됩니다.', 'good');
        }
      }
      print('System.out.println("이름 " + name)', '이름 ' + v);
      sum.push(a === 'orElse' ? 'orElse의 인자는 orElse를 부르기 전에 계산되므로, Optional에 값이 ' + (full ? '있는데도' : '없어서') + ' defaultName()이 실행되었습니다. 값이 있든 없든 실행됩니다. 기본값을 만드는 데 시간이 걸리거나 저장 같은 다른 일이 함께 일어난다면 orElseGet에 람다로 넘깁니다.'
        : full ? 'orElseGet은 값이 있으면 넘겨받은 Supplier를 부르지 않으므로 람다 본문이 한 번도 실행되지 않았습니다. 람다로 넘기면 실행할지 말지를 받는 쪽이 정합니다.' : 'orElseGet은 값이 없을 때만 Supplier의 get을 한 번 불러 기본값을 만듭니다.');
      sum.push('표준 orElseGet의 본문은 supplier.get()을 부르는 한 줄입니다. 직접 만든 메서드도 Supplier<T> 매개변수를 받아 필요할 때 get()을 부르면 같은 방식으로 실행 시점을 정할 수 있습니다.');
      row = [a === 'orElse' ? 'Optional.orElse' : 'Optional.orElseGet', a === 'orElse' ? '없음 (값 String을 받는다)' : 'Supplier<String>', a === 'orElse' ? 'defaultName() 1번 (람다 없음)' : st.calls + '번', v];
      return { events: ev, summary: sum, out: st.out.slice(), row: row };
    }
    msg('main', '', full ? 'names = [kiwi, fig, banana]' : 'names = []');
    push(full ? 'List<String> names = new ArrayList<>(List.of("kiwi", "fig", "banana")): 요소가 kiwi, fig, banana 순서인 자바 표준 ArrayList를 만듭니다.' : 'List<String> names = new ArrayList<>(): 요소가 없는 자바 표준 ArrayList를 만듭니다.');
    var pre = a === 'stream' || a === 'nostream' ? '스트림 만들기 전' : (a === 'forEachRef' ? 'forEach' : a) + ' 부르기 전';
    print('System.out.println("' + pre + '")', pre);
    if (a === 'forEach' || a === 'forEachRef') {
      var ref = a === 'forEachRef';
      msg('main', 'std', ref ? 'forEach(System.out::println)' : 'forEach(람다)');
      push(ref ? 'names.forEach(System.out::println): System.out 객체의 println 메서드를 가리키는 메서드 참조로 Consumer<String> 객체를 만들어 forEach에 넘깁니다. n -> System.out.println(n)이라고 쓴 람다와 같습니다. 아직 아무것도 출력되지 않았습니다.' : 'names.forEach(n -> …): 람다로 Consumer<String> 객체를 만들어 forEach에 넘깁니다. forEach의 매개변수 타입이 Consumer<? super E>라서 이 람다는 Consumer의 accept를 구현한 것이 됩니다. 넘기는 순간에는 본문이 실행되지 않습니다.');
      list.forEach(function (n, i) {
        st.calls++; var line = ref ? n : '람다 실행: ' + n; st.out.push(line);
        msg('std', 'lam', 'accept("' + n + '")', 'hot'); msg('lam', '', '출력: ' + line, 'hot');
        push('action.accept("' + n + '"): ' + (i === 0 ? '표준 ArrayList.forEach가 요소마다 accept를 부르고, 여기서 비로소 본문이 실행됩니다. ' : '다음 요소로 같은 본문이 한 번 더 실행됩니다. ') + '출력되는 줄은 "' + line + '"입니다.', 'good');
      });
      if (!full) { msg('std', '', '요소가 없어 accept를 부르지 않음', 'bad'); push('forEach의 for 문은 요소 수만큼 돕니다. 요소가 없으므로 accept를 한 번도 부르지 않고 끝납니다.', 'bad'); }
      print('System.out.println("forEach 끝")', 'forEach 끝', '본문은 모두 ' + st.calls + '번 실행되었습니다.');
      sum.push(full ? '람다를 넘긴 줄이 아니라, 표준 forEach가 accept를 부를 때마다 본문이 실행되었습니다. 몇 번 부를지는 forEach가 요소 수로 정합니다.' : '람다를 넘겼지만 요소가 없어 forEach가 한 번도 부르지 않았습니다. 람다는 "나중에 실행할 수 있는 동작"일 뿐이고, 실행할지와 몇 번 실행할지는 받는 쪽이 정합니다.');
      if (ref) sum.push('람다가 이미 있는 메서드 하나를 부르기만 할 때는 메서드 참조(System.out::println, String::length)로 더 짧게 쓸 수 있습니다. 결과는 람다와 같습니다.');
      row = ['ArrayList.forEach', ref ? 'Consumer<String> (메서드 참조)' : 'Consumer<String>', st.calls + '번', full ? '요소마다 한 줄 출력' : '출력 없음'];
    } else if (a === 'removeIf') {
      msg('main', 'std', 'removeIf(람다)');
      push('names.removeIf(n -> { … }): 람다로 Predicate<String> 객체를 만들어 removeIf에 넘깁니다. Predicate는 값을 받아 true 또는 false를 돌려주는 test 메서드 하나를 가진 표준 함수형 인터페이스입니다.');
      var kept = [];
      list.forEach(function (n) {
        st.calls++; st.out.push('람다 실행: ' + n); var del = n.length <= 3; if (!del) kept.push(n);
        msg('std', 'lam', 'test("' + n + '")', 'hot'); msg('lam', '', '출력하고 ' + del + ' 돌려줌', del ? 'bad' : 'good');
        push('filter.test("' + n + '"): removeIf가 요소마다 test를 부릅니다. 출력되는 줄은 "람다 실행: ' + n + '"입니다. n.length()는 ' + n.length + '입니다. ' + (del ? '3 이하이므로 true를 돌려주고, 이 요소는 지울 자리로 표시됩니다.' : '3보다 크므로 false를 돌려주고, 이 요소는 남습니다.'), del ? 'bad' : 'good');
      });
      if (!full) { msg('std', '', '요소가 없어 test를 부르지 않음', 'bad'); push('요소가 없으므로 removeIf는 test를 한 번도 부르지 않고 false를 돌려줍니다.', 'bad'); }
      print('System.out.println("남은 것 " + names)', '남은 것 ' + show(kept));
      sum.push(full ? '표준 removeIf가 요소마다 test를 불러, true가 나온 요소를 지웠습니다. 람다는 "지울지 말지" 판단만 맡고, 리스트를 돌며 지우는 일은 removeIf가 합니다.' : '요소가 없어 removeIf가 test를 한 번도 부르지 않았습니다.');
      row = ['ArrayList.removeIf', 'Predicate<String>', st.calls + '번', show(kept)];
    } else if (a === 'stream' || a === 'nostream') {
      var term = a === 'stream', fc = 0, mc = 0, res = [];
      msg('main', 'std', 'stream().filter(…).map(…)');
      push('names.stream().filter(n -> { … }).map(n -> { … }): filter에는 Predicate<String>, map에는 Function<String, Integer> 람다를 넘깁니다. filter와 map은 중간 연산이라, 부르는 순간에는 할 일을 이어 붙인 스트림만 만들고 람다를 실행하지 않습니다. 아무것도 출력되지 않습니다.');
      if (term) {
        msg('main', 'std', 'toList()');
        push('.toList(): 최종 연산을 부릅니다. 이제 스트림이 요소를 처음부터 하나씩 흘려보내며 filter와 map의 람다를 부릅니다.');
        list.forEach(function (n) {
          fc++; st.calls++; st.out.push('filter 람다: ' + n); var pass = n.length > 3;
          msg('std', 'f', 'test("' + n + '"), ' + pass, pass ? 'hot' : 'bad');
          push('filter의 test("' + n + '"): 출력되는 줄은 "filter 람다: ' + n + '"입니다. n.length()는 ' + n.length + '입니다. ' + (pass ? '3보다 크므로 true이고, 이 요소는 다음 요소로 넘어가기 전에 곧바로 map으로 갑니다.' : '3보다 크지 않으므로 false이고, 이 요소는 map으로 가지 않습니다.'), pass ? 'good' : 'bad');
          if (pass) {
            mc++; st.calls++; st.out.push('map 람다: ' + n); res.push(n.length);
            msg('std', 'm', 'apply("' + n + '"), ' + n.length, 'hot');
            push('map의 apply("' + n + '"): 출력되는 줄은 "map 람다: ' + n + '"입니다. 돌려준 값은 ' + n.length + '입니다. 이 값이 결과 리스트의 요소가 됩니다.', 'good');
          }
        });
        if (!full) { msg('std', '', '요소가 없어 람다를 부르지 않음', 'bad'); push('요소가 없으므로 filter와 map의 람다는 한 번도 불리지 않고, 빈 리스트가 만들어집니다.', 'bad'); }
        print('System.out.println("결과 " + lengths)', '결과 ' + show(res));
        sum.push(full ? '람다는 filter와 map을 부른 때가 아니라 toList를 부른 뒤에 실행되었습니다. 요소가 하나씩 filter를 지나 바로 map으로 가므로, 출력이 filter, map, filter, filter, map 순서로 섞입니다.' : '요소가 없으면 최종 연산을 불러도 람다가 불리지 않습니다.');
      } else {
        msg('std', '', '최종 연산이 없어 요소가 흐르지 않음', 'bad');
        push('최종 연산(toList, forEach, count 등)을 부르지 않았습니다. 스트림은 요소를 흘려보내지 않으므로 filter와 map의 람다는 한 번도 실행되지 않습니다.', 'bad');
        print('System.out.println("스트림을 만든 뒤")', '스트림을 만든 뒤', '"filter 람다"와 "map 람다"는 한 줄도 출력되지 않았습니다.');
        sum.push('filter와 map은 람다를 받아 할 일을 이어 붙이기만 하고, 요소를 흘려보내며 람다를 부르게 하는 것은 최종 연산입니다. 최종 연산이 없으면 람다는 실행되지 않습니다.');
      }
      sum.push('Stream.filter의 매개변수는 Predicate<? super T>, Stream.map의 매개변수는 Function<? super T, ? extends R>입니다. 그래서 같은 n -> { … } 모양이어도 filter에서는 test를, map에서는 apply를 구현한 람다가 됩니다.');
      row = ['Stream.filter, Stream.map' + (term ? ', toList' : ''), 'Predicate<String>, Function<String, Integer>', 'filter ' + fc + '번, map ' + mc + '번', term ? show(res) : '(실행되지 않음)'];
    } else {
      msg('main', 'std', 'sort(comparing(람다))');
      push('names.sort(Comparator.comparing(n -> { … })): 람다로 Function<String, Integer> 객체를 만들어 표준 Comparator.comparing에 넘깁니다. comparing은 두 요소에서 키를 꺼내 키끼리 비교하는 Comparator를 만들어 돌려주고, 그 Comparator가 sort에 넘어갑니다. 이 줄에서 키 람다는 아직 불리지 않았습니다.');
      var cmps = full ? this.SORT_CMP : [];
      cmps.forEach(function (p, i) {
        st.calls += 2; st.out.push('키 꺼냄: ' + p[0], '키 꺼냄: ' + p[1]);
        msg('std', 'cmp', 'compare(' + p[0] + ', ' + p[1] + ')'); msg('cmp', 'lam', 'apply(' + p[0] + '), apply(' + p[1] + ')', 'hot');
        push('compare("' + p[0] + '", "' + p[1] + '"): ' + (i === 0 ? 'sort가 두 요소를 비교하려고 Comparator의 compare를 부르고, ' : 'sort가 다시 비교합니다. ') + 'compare는 keyExtractor.apply로 두 요소의 키를 꺼냅니다. 키 람다가 두 번 실행되어 "키 꺼냄: ' + p[0] + '", "키 꺼냄: ' + p[1] + '" 두 줄이 출력됩니다. 그다음 두 키(' + p[0].length + ', ' + p[1].length + ')를 Integer의 compareTo로 비교합니다.', 'good');
      });
      if (!full) { msg('std', '', '요소가 없어 compare를 부르지 않음', 'bad'); push('요소가 2개보다 적으면 비교할 것이 없으므로 sort는 compare를 부르지 않습니다. 키 람다도 실행되지 않습니다.', 'bad'); }
      var sorted = full ? ['fig', 'kiwi', 'banana'] : [];
      print('System.out.println("정렬 " + names)', '정렬 ' + show(sorted), full ? '글자 수가 3, 4, 6인 순서입니다.' : '');
      sum.push(full ? '키 람다는 비교 한 번에 두 번씩, 모두 ' + st.calls + '번 불렸습니다. 몇 번 비교할지는 정렬 알고리즘이 정하므로 람다 쪽에서는 알 수 없습니다(이 횟수는 JDK 21에서 이 세 요소를 정렬했을 때의 값입니다).' : '요소가 없어 비교가 한 번도 일어나지 않았고, 키 람다도 불리지 않았습니다.');
      sum.push('n -> n.length()처럼 메서드 하나를 부르기만 하는 람다는 Comparator.comparing(String::length)로 줄여 쓸 수 있습니다.');
      row = ['ArrayList.sort, Comparator.comparing', 'Function<String, Integer> (comparing이 받음)', st.calls + '번', show(sorted)];
    }
    return { events: ev, summary: sum, out: st.out.slice(), row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    H.table(v, ['표준 메서드', '매개변수 (JDK 21 선언)', '람다가 구현하는 메서드', '표준 메서드의 코드에서 부르는 곳'], this.std(c.api).map(function (r) { return { cells: r }; }), '람다를 받는 쪽 (자바 표준)');
    H.table(v, ['순서', '출력된 줄'], s.out.map(function (o, i) { return { cells: [String(i + 1), { v: o, cls: /^(람다 실행|filter 람다|map 람다|키 꺼냄|기본값 만듦)/.test(o) || c.api === 'forEachRef' && /^(kiwi|fig|banana)$/.test(o) ? 'hot' : '' }] }; }), '지금까지의 출력');
  },
  // 그림: 왼쪽부터 main(내 코드), 람다를 받는 표준 메서드, 람다(orElse에서는 예시 메서드)를 나란히 놓고, 누가 누구를 부르는지 위에서 아래로 그린다. 람다로 가는 화살표는 표준 메서드가 부를 때에만 생긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, a = c.api, last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], calls: 0 };
    var actors = {
      forEach: [['main', 'main (내 코드)', 'wait'], ['std', 'ArrayList.forEach', 'plain'], ['lam', '람다 n -> …', 'hot']],
      forEachRef: [['main', 'main (내 코드)', 'wait'], ['std', 'ArrayList.forEach', 'plain'], ['lam', 'System.out::println', 'hot']],
      removeIf: [['main', 'main (내 코드)', 'wait'], ['std', 'ArrayList.removeIf', 'plain'], ['lam', '람다 n -> { … }', 'hot']],
      stream: [['main', 'main', 'wait'], ['std', '스트림 (표준)', 'plain'], ['f', 'filter 람다', 'hot'], ['m', 'map 람다', 'hot']],
      sort: [['main', 'main', 'wait'], ['std', 'ArrayList.sort', 'plain'], ['cmp', 'Comparator', 'plain'], ['lam', '키 람다', 'hot']],
      orElse: [['main', 'main (내 코드)', 'wait'], ['dn', 'defaultName() (예시)', 'hot'], ['std', 'Optional.orElse', 'plain']],
      orElseGet: [['main', 'main (내 코드)', 'wait'], ['std', 'Optional.orElseGet', 'plain'], ['lam', '람다 () -> …', 'hot']],
    }[a === 'nostream' ? 'stream' : a];
    var keep = Math.max(1, Math.min(10, sim.events[sim.events.length - 1].snap.msgs.length));
    var end = P.seq(actors, s.msgs.map(function (m) { return m.t ? { f: m.f, t: m.t, s: m.s, cls: m.cls } : { f: m.f, s: m.s, cls: m.cls }; }), { keep: keep });
    P.box('cnt', 16, end + 14, 648, 34, { cls: s.calls ? 'good' : 'ghost', title: a === 'orElse' ? 'defaultName()이 실행된 횟수' : '람다 본문이 실행된 횟수', right: s.calls + '번' });
    P.size(680, end + 64);
    P.note('화살표 하나가 메서드 호출 하나이고, 위에서 아래로 시간이 흐릅니다. 이 실습에서 람다 쪽으로 가는 화살표는 모두 표준 메서드나 Comparator에서 출발합니다. main은 람다를 만들어 넘기기만 하고 직접 부르지 않습니다.' + (a === 'sort' ? ' Comparator는 Comparator.comparing이 만들어 돌려준 객체입니다.' : '') + (a === 'stream' || a === 'nostream' ? ' "스트림 (표준)"은 스트림을 이루는 여러 객체를 하나로 줄여 그린 것입니다.' : '') + (a === 'orElse' ? ' orElse에는 람다가 없고, main이 orElse를 부르기 전에 defaultName()을 직접 부릅니다.' : ''));
  },
  assume: '열여섯 가지 조합(표준 메서드 8 × 값이 있다/없다 2)마다 화면의 코드를 그대로 Main.java로 써서 검증 환경의 JDK 21로 컴파일하고 실행해, 출력된 줄과 그 순서, 본문이 실행된 횟수, 결과를 대조했습니다(verify/plain/lambda_probe.js, cmp_lambda.js). 표준 메서드의 매개변수 타입은 리플렉션으로, "표준 메서드의 코드에서 부르는 곳"에 옮긴 코드 줄은 JDK 21 소스(src.zip)에 그 글자가 있는지로 확인했습니다. 정렬에서 비교하는 순서와 횟수는 JDK 21의 ArrayList.sort(TimSort)가 이 세 요소에서 실제로 보인 것이고, 자바 명세가 정한 것이 아니어서 다른 JDK나 다른 요소에서는 달라질 수 있습니다. 스트림에서 요소가 하나씩 filter와 map을 지나는 순서도 이 순차 스트림에서 본 것이며, 병렬 스트림에서는 순서가 정해져 있지 않습니다. 람다, 익명 클래스, 메서드 참조는 이 실습에서 보는 결과가 같지만, 내부에서 객체가 만들어지는 방법과 this가 가리키는 대상은 서로 다릅니다. 람다 안에서 바깥의 지역 변수를 쓸 때는 값이 바뀌지 않는 변수만 쓸 수 있는데, 이 규칙은 "내부 클래스와 익명 클래스" 실습에서 설명합니다.',
});
