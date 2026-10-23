Lab.register({
  id: 'interface_basic', nav: '인터페이스', cat: '기초개념', mode: 'step', basic: true, deep: ['absint'],
  title: '인터페이스는 코드에서 어떻게 생겼고 무엇을 정하는가',
  why: '어떤 기능을 쓰는 코드가 특정 클래스 이름에 묶여 있으면, 그 기능을 다른 방식으로 바꿀 때마다 쓰는 쪽 코드도 함께 고쳐야 한다. 인터페이스는 "이런 메서드가 있다"는 것을 타입으로 정해 두어서, 쓰는 쪽은 그 타입만 보고 메서드를 부르고 실제로 어느 클래스의 객체가 오든 같은 코드로 다룰 수 있게 한다. 클래스는 extends로 하나만 물려받을 수 있지만 인터페이스는 여러 개를 implements할 수 있어서, 서로 관계없는 클래스들도 같은 인터페이스 타입이 될 수 있다.',
  use: '자바의 List와 Map이 인터페이스여서, List<String> names = new ArrayList<>();처럼 변수는 인터페이스 타입으로 적고 실제 객체는 ArrayList나 LinkedList 가운데 골라 만든다. 직접 만든 클래스가 자바의 Comparable을 implements하면 Collections.sort가 그 클래스의 목록을 정렬할 수 있고, Runnable을 implements하면 스레드가 실행할 일이 된다. 스프링 데이터 JPA에서는 JpaRepository를 이어받은 인터페이스만 선언하면 스프링이 그 구현 객체를 만들어 준다.',
  intro: '인터페이스는 interface로 선언하는 타입으로, "이 타입이라면 이런 메서드가 있다"를 정해 둡니다. 가장 자주 만나는 인터페이스는 자바가 주는 것입니다. 목록을 다루는 List는 java.util 패키지의 인터페이스이고, ArrayList와 LinkedList는 implements List로 그것을 구현한 클래스입니다. 정렬 순서를 정하는 Comparable도 자바가 주는 인터페이스이고, Collections.sort는 Comparable을 구현한 원소의 목록을 정렬합니다. 이 실습은 자바가 주는 List와 Comparable을 쓰는 짧은 프로그램을 컴파일하고 실행하면서, 변수의 타입과 만드는 객체를 바꾸거나 implements를 지워 보고 컴파일러가 무엇을 알려 주는지, 무엇이 출력되는지를 봅니다. 마지막에는 인터페이스를 직접 선언하는 모양과, extends로 클래스를 물려받는 것과의 차이를 짧게 봅니다.',
  terms: ['인터페이스', 'List, Set, Map', 'ArrayList', 'LinkedList', 'Comparable과 Comparator', 'Collections.sort', 'implements', '추상 메서드', 'extends', '타입'],
  controls: [
    { id: 'scene', label: '보는 코드', type: 'select', value: 'list', options: [['list', '자바의 List 인터페이스로 목록 다루기'], ['sort', '자바의 Comparable 인터페이스로 정렬하기'], ['own', '인터페이스를 직접 선언하기']] },
    { id: 'vtype', label: '변수 names의 타입', type: 'select', value: 'List', options: [['List', 'List<String> (인터페이스)'], ['ArrayList', 'ArrayList<String> (클래스)']], show: function (c) { return c.scene === 'list'; } },
    { id: 'make', label: '= 오른쪽에서 만드는 것', type: 'select', value: 'ArrayList', options: [['ArrayList', 'new ArrayList<>()'], ['LinkedList', 'new LinkedList<>()'], ['List', 'new List<>()']], show: function (c) { return c.scene === 'list'; } },
    { id: 'trim', label: 'ArrayList 클래스에만 있는 trimToSize()를 names로 부른다', type: 'check', value: false, show: function (c) { return c.scene === 'list'; } },
    { id: 'cmp', label: '예시로 만든 Member 클래스', type: 'select', value: 'both', options: [['both', 'implements Comparable<Member>와 compareTo 메서드가 다 있다'], ['noimpl', 'compareTo 메서드는 있고 implements가 없다'], ['nomethod', 'implements는 있고 compareTo 메서드가 없다']], show: function (c) { return c.scene === 'sort'; } },
    { id: 'own', label: '예시로 지은 Greeter', type: 'select', value: 'iface', options: [['iface', 'interface Greeter로 선언하고 Hello가 implements한다'], ['cls', 'class Greeter로 선언하고 Hello가 extends한다']], show: function (c) { return c.scene === 'own'; } },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '인터페이스는 코드에서 어떻게 생겼고, 무엇을 해 주나', d: '자바가 주는 인터페이스 List 타입의 변수 names가 ArrayList 객체를 가리킵니다. add와 size는 List에 정해진 메서드여서 names로 부를 수 있습니다.', v: { scene: 'list', vtype: 'List', make: 'ArrayList', trim: false } },
    { t: 'LinkedList로 바꿔 끼우면', q: '오른쪽을 new LinkedList<>()로 바꾸면 뒤의 코드도 고쳐야 하나', d: 'LinkedList도 List를 구현한 클래스여서 바꾼 곳은 new 오른쪽 하나뿐입니다. 뒤의 코드는 그대로 컴파일되고 같은 목록을 출력합니다.', v: { scene: 'list', vtype: 'List', make: 'LinkedList', trim: false } },
    { t: 'new List<>()로 만들면', q: '인터페이스 List로 객체를 바로 만들 수 있나', d: 'List는 인터페이스라서 new로 객체를 만들 수 없습니다. 컴파일 오류가 납니다.', v: { scene: 'list', vtype: 'List', make: 'List', trim: false } },
    { t: 'List 변수로 trimToSize()를 부르면', q: 'List 타입 변수로 ArrayList에만 있는 메서드를 부를 수 있나', d: '실제 객체가 ArrayList여도 컴파일러는 변수의 타입 List만 봅니다. List에는 trimToSize가 없어 컴파일 오류가 납니다.', v: { scene: 'list', vtype: 'List', make: 'ArrayList', trim: true } },
    { t: 'ArrayList 변수가 LinkedList를 가리키게 하면', q: '변수 타입을 ArrayList로 적으면 LinkedList로 바꿔 끼울 수 있나', d: 'ArrayList 타입 변수는 LinkedList 객체를 가리킬 수 없어 컴파일 오류가 납니다. 변수를 클래스 타입으로 적으면 그 클래스에 묶입니다.', v: { scene: 'list', vtype: 'ArrayList', make: 'LinkedList', trim: false } },
    { t: 'Comparable을 구현하면', q: 'Collections.sort가 Member 목록을 정렬할 수 있는 까닭은', d: '예시로 만든 Member가 자바의 Comparable을 implements하고 compareTo를 작성해서, Collections.sort가 나이순으로 정렬합니다.', v: { scene: 'sort', cmp: 'both' } },
    { t: 'implements 없이 compareTo만 있으면', q: 'compareTo 메서드만 있으면 Collections.sort가 정렬해 주나', d: '이름이 같은 메서드가 있어도 implements가 없으면 Member는 Comparable 타입이 아닙니다. Collections.sort 줄에서 컴파일 오류가 납니다.', v: { scene: 'sort', cmp: 'noimpl' } },
    { t: 'implements만 있고 compareTo가 없으면', q: 'implements Comparable만 쓰고 compareTo를 작성하지 않으면', d: '인터페이스는 메서드의 본문을 물려주지 않습니다. compareTo를 직접 작성하지 않아 컴파일 오류가 납니다.', v: { scene: 'sort', cmp: 'nomethod' } },
    { t: '인터페이스를 직접 선언하면', q: '인터페이스를 직접 선언하면 어떻게 생기고, extends와 무엇이 다른가', d: '예시로 지은 interface Greeter는 greet의 이름만 정하고, Hello가 implements해서 본문을 작성합니다. extends로 클래스를 물려받으면 본문까지 물려받지만 하나만 물려받을 수 있습니다.', v: { scene: 'own', own: 'iface' } },
  ],
  // 컴파일러가 알려 주는 오류(실제 javac의 진단을 옮긴 것). 대조 스크립트 verify/plain/cmp_interface_basic.js가 이 글을 javac의 진단 코드와 맞춰 본다.
  errNew: 'List는 인터페이스라서 new로 객체를 만들 수 없음',
  errTrim: 'List 타입에는 trimToSize 메서드가 없음',
  errFit: 'ArrayList 타입 변수는 LinkedList 객체를 가리킬 수 없음',
  errSort: 'Member가 Comparable이 아니어서 Collections.sort에 넘길 수 없음',
  errMiss: 'Member가 compareTo 메서드를 작성하지 않았음',
  // 화면의 코드. 대조 프로그램(verify/plain/InterfaceBasicProbe.java)은 이 함수가 만든 글을 그대로 컴파일하고 실행한다.
  code: function (c) {
    var o = [];
    if (c.scene === 'list') {
      o.push('// 자바가 주는 것을 가져온다 (java.util 패키지)', 'import java.util.ArrayList;', 'import java.util.LinkedList;', 'import java.util.List;', '',
        'public class Main {', '    public static void main(String[] args) {',
        '        // List는 자바가 주는 인터페이스, ArrayList와 LinkedList는 자바가 주는 클래스',
        '        ' + c.vtype + '<String> names = new ' + c.make + '<>();',
        '        names.add("민수");', '        names.add("지은");', '        names.add("현우");');
      if (c.trim) o.push('        // trimToSize는 ArrayList 클래스에만 있는 메서드 (List 인터페이스에는 없다)', '        names.trimToSize();');
      o.push('        System.out.println(names + ", " + names.size() + "명");',
        '        System.out.println("names가 가리키는 객체: " + names.getClass().getSimpleName());', '    }', '}');
    } else if (c.scene === 'sort') {
      o.push('import java.util.ArrayList;', 'import java.util.Collections;', 'import java.util.List;', '',
        '// Member는 이 실습에서 예시로 만든 클래스, Comparable은 자바가 주는 인터페이스',
        'class Member' + (c.cmp !== 'noimpl' ? ' implements Comparable<Member>' : '') + ' {',
        '    String name;', '    int age;', '',
        '    Member(String name, int age) {', '        this.name = name;', '        this.age = age;', '    }');
      if (c.cmp !== 'nomethod') o.push('',
        c.cmp === 'both' ? '    // Comparable이 정한 메서드를 작성한 것: 나이가 적은 쪽이 앞' : '    // Comparable의 compareTo와 이름과 모양이 같은 메서드',
        '    public int compareTo(Member other) {', '        return Integer.compare(this.age, other.age);', '    }');
      o.push('}', '',
        'public class Main {', '    public static void main(String[] args) {',
        '        List<Member> members = new ArrayList<>();',
        '        members.add(new Member("민수", 31));', '        members.add(new Member("지은", 25));', '        members.add(new Member("현우", 28));',
        '        // 자바가 주는 정렬 메서드: Comparable을 구현한 원소의 목록을 받는다',
        '        Collections.sort(members);',
        '        for (Member m : members) {', '            System.out.println(m.name + " " + m.age);', '        }', '    }', '}');
    } else if (c.own === 'iface') {
      o.push('// Greeter는 이 실습에서 예시로 지은 인터페이스: greet의 이름만 정하고 본문은 없다', 'interface Greeter {', '    String greet(String name);', '}', '',
        '// Hello는 예시로 지은 클래스: Greeter를 implements하고 greet의 본문을 직접 작성한다', 'class Hello implements Greeter {',
        '    public String greet(String name) {', '        return "안녕하세요, " + name;', '    }', '}', '',
        'public class Main {', '    public static void main(String[] args) {', '        Greeter g = new Hello();', '        System.out.println(g.greet("민수"));', '    }', '}');
    } else {
      o.push('// Greeter는 이 실습에서 예시로 지은 클래스: greet의 본문까지 있다', 'class Greeter {',
        '    String greet(String name) {', '        return "안녕하세요, " + name;', '    }', '}', '',
        '// Hello는 예시로 지은 클래스: Greeter를 extends해서 greet를 작성하지 않아도 갖는다', 'class Hello extends Greeter {', '}', '',
        'public class Main {', '    public static void main(String[] args) {', '        Greeter g = new Hello();', '        System.out.println(g.greet("민수"));', '    }', '}');
    }
    return o.join('\n');
  },
  label: function (c) {
    if (c.scene === 'list') return c.vtype + '<String> names = new ' + c.make + '<>()' + (c.trim ? ' · trimToSize() 부름' : '');
    if (c.scene === 'sort') return 'Member · ' + { both: 'implements Comparable과 compareTo 있음', noimpl: 'compareTo만 있음', nomethod: 'implements만 있음' }[c.cmp];
    return c.own === 'iface' ? '직접 선언한 interface Greeter · implements' : '직접 선언한 class Greeter · extends';
  },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력'],
  simulate: function (c) {
    var ev = [], sum = [], self = this;
    var st = { hot: '', bad: {}, fit: '', obj: '', compile: '', errs: 0, errText: '', ran: false, out: '', checks: [], sorted: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text) { st.errs++; if (!st.errText) st.errText = text; }
    var errAt = [], out = '';

    if (c.scene === 'list') {
      var DECL = c.vtype + '<String> names = new ' + c.make + '<>();';
      var mk = c.make, isCls = mk !== 'List', fits = isCls && (c.vtype === 'List' || mk === c.vtype);
      var trimBad = c.trim && c.vtype === 'List';
      // 1. List
      st.hot = 'li';
      st.checks.push(['List', { v: '인터페이스 (자바가 줌)', cls: 'good' }]);
      push('컴파일러가 import 줄로 자바가 주는 List를 찾습니다. List는 자바 표준 라이브러리에 public interface List<E>로 선언된 인터페이스입니다. class가 아니라 interface로 선언되어 있고, add(목록 끝에 더하기), get(몇 번째 원소 꺼내기), size(개수) 같은 메서드가 있다는 것을 정해 둡니다. <String>은 이 목록의 원소가 문자열이라는 뜻입니다.', '');
      // 2. 오른쪽의 new
      st.hot = 'mk';
      if (mk === 'ArrayList') {
        st.checks.push(['new ArrayList<>()', { v: '객체를 만들 수 있음', cls: 'good' }]);
        push('컴파일러가 = 오른쪽의 new ArrayList<>()를 확인합니다. ArrayList는 자바가 public class ArrayList<E> extends AbstractList<E> implements List<E>, RandomAccess, Cloneable, Serializable로 선언해 둔 클래스입니다. add와 size의 본문(실제로 하는 일)까지 작성된 클래스라서 new로 객체를 만들 수 있습니다. 선언을 보면 extends 뒤에는 클래스 하나(AbstractList)만, implements 뒤에는 인터페이스 넷을 적었습니다. 클래스는 하나만 물려받을 수 있지만 인터페이스는 여러 개를 구현할 수 있습니다.', '');
      } else if (mk === 'LinkedList') {
        st.checks.push(['new LinkedList<>()', { v: '객체를 만들 수 있음', cls: 'good' }]);
        push('컴파일러가 = 오른쪽의 new LinkedList<>()를 확인합니다. LinkedList는 자바가 public class LinkedList<E> extends AbstractSequentialList<E> implements List<E>, Deque<E>, Cloneable, Serializable로 선언해 둔 클래스입니다. 원소를 두는 방식은 ArrayList와 다르지만, implements List<E>가 있으므로 LinkedList도 List 타입이고 add와 size의 본문이 작성되어 있습니다.', '');
      } else {
        st.bad.mk = true; fail(self.errNew); errAt.push(DECL);
        st.checks.push(['new List<>()', { v: '오류: 객체를 만들 수 없음', cls: 'bad' }]);
        push('컴파일러가 = 오른쪽의 new List<>()를 확인합니다. List는 interface로 선언된 인터페이스라서 new로 객체를 만들 수 없고, 컴파일 오류가 납니다(javac: List is abstract; cannot be instantiated). List는 add와 size가 있다고 정해 둘 뿐, 그 본문을 작성한 클래스가 아닙니다. 객체는 ArrayList나 LinkedList처럼 List를 구현한 클래스로 만듭니다.', 'bad');
      }
      // 3. 변수가 객체를 가리키게 하는 줄
      st.hot = 'nv';
      if (fits) {
        st.fit = 'ok';
        st.checks.push([c.vtype + ' 타입 변수 names가 ' + mk + ' 객체를 가리키기', { v: '가리킬 수 있음', cls: 'good' }]);
        push(c.vtype === 'List'
          ? '컴파일러가 List<String> names = new ' + mk + '<>(); 줄을 확인합니다. ' + mk + '가 List를 구현했으므로 List 타입 변수 names가 ' + mk + ' 객체를 가리켜도 됩니다. 변수의 타입은 인터페이스 List로, 실제로 만드는 객체는 클래스 ' + mk + '로 적은 것입니다.'
          : '컴파일러가 ArrayList<String> names = new ArrayList<>(); 줄을 확인합니다. 변수의 타입과 객체의 클래스가 같으므로 가리킬 수 있습니다. 다만 이제 names는 ArrayList 타입이어서, 나중에 다른 List 구현으로 바꾸려면 이 변수의 타입부터 고쳐야 합니다.', 'good');
      } else if (c.vtype === 'ArrayList' && mk === 'LinkedList') {
        st.fit = 'bad'; st.bad.nv = true; fail(self.errFit); errAt.push(DECL);
        st.checks.push(['ArrayList 타입 변수 names가 LinkedList 객체를 가리키기', { v: '오류: 가리킬 수 없음', cls: 'bad' }]);
        push('컴파일러가 ArrayList<String> names = new LinkedList<>(); 줄을 확인합니다. LinkedList는 List를 구현했지만 ArrayList의 한 종류는 아닙니다. 그래서 ArrayList 타입 변수는 LinkedList 객체를 가리킬 수 없습니다(javac: incompatible types: cannot infer type arguments for LinkedList<>). 변수가 List 타입이었다면 둘 다 가리킬 수 있었습니다.', 'bad');
      } else if (c.vtype === 'ArrayList') {
        st.bad.nv = true; st.errs++; errAt.push(DECL);
        st.checks.push(['ArrayList 타입 변수 names', { v: '같은 줄에 오류가 하나 더', cls: 'bad' }]);
        push('컴파일러가 같은 줄에서 오류를 하나 더 알립니다. List는 ArrayList의 한 종류가 아니어서 ArrayList 타입 변수에 맞지 않는다는 것입니다(javac: incompatible types: cannot infer type arguments for List<>). 이 줄에서만 오류가 2개입니다.', 'bad');
      } else {
        st.checks.push(['List 타입 변수 names', { v: '변수 쪽은 문제없음', cls: '' }]);
        push('컴파일러가 List<String> names = new List<>(); 줄의 변수 쪽을 확인합니다. 변수의 타입을 List로 적는 것은 문제가 아닙니다. 이 줄의 오류는 new List<>() 하나입니다.', '');
      }
      // 4. names로 메서드 부르기
      st.hot = 'call';
      if (trimBad) {
        st.bad.call = true; fail(self.errTrim); errAt.push('names.trimToSize();');
        st.checks.push(['names로 부르는 메서드', { v: 'add, size: 있음 · trimToSize: 오류', cls: 'bad' }]);
        push('컴파일러가 names.add, names.trimToSize(), names.size()를 확인합니다. 컴파일러는 names가 실제로 어느 객체를 가리킬지가 아니라 변수의 타입 List만 보고 부를 수 있는 메서드를 정합니다. add와 size는 List에 있지만 trimToSize는 ArrayList 클래스에만 있는 메서드여서 오류가 납니다(javac: cannot find symbol, symbol: method trimToSize(), location: variable names of type List<String>).' + (mk === 'ArrayList' ? ' 실제 객체가 ArrayList여도 마찬가지입니다.' : ''), 'bad');
      } else if (c.trim) {
        st.checks.push(['names로 부르는 메서드', { v: 'add, trimToSize, size: 모두 있음', cls: 'good' }]);
        push('컴파일러가 names.add, names.trimToSize(), names.size()를 확인합니다. names의 타입이 ArrayList이므로 ArrayList에만 있는 trimToSize도 부를 수 있습니다. 변수의 타입을 클래스로 적으면 그 클래스만의 메서드를 쓸 수 있는 대신, 다른 List 구현으로 바꿔 끼울 수 없습니다.', 'good');
      } else {
        st.checks.push(['names로 부르는 메서드', { v: 'add, size: 모두 있음', cls: 'good' }]);
        push('컴파일러가 names.add(...)와 names.size()를 확인합니다. 컴파일러는 변수의 타입 ' + c.vtype + '만 보고 부를 수 있는 메서드를 정합니다. add와 size는 List에 정해진 메서드여서 ' + (c.vtype === 'List' ? '실제 객체가 ArrayList든 LinkedList든 같은 줄을 그대로 쓸 수 있습니다.' : 'ArrayList 타입 변수로도 부를 수 있습니다.'), 'good');
      }
      st.hot = '';
      if (isCls && fits && !trimBad) {
        st.compile = 'ok'; st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
        push('컴파일이 성공해 Main 클래스 파일이 만들어집니다.', 'good');
        st.hot = 'ob'; st.obj = mk; st.ran = true;
        out = '[민수, 지은, 현우], 3명 / names가 가리키는 객체: ' + mk; st.out = out;
        st.checks.push(['실행했을 때 출력', { v: out, cls: 'good' }]);
        push('java Main으로 실행합니다. new ' + mk + '<>()가 ' + mk + ' 객체를 만들고 names가 그 객체를 가리킵니다. names.add를 부르면 실제로는 ' + mk + '에 작성된 add가 실행되어 목록에 세 이름이 차례로 더해집니다. 첫 줄에 [민수, 지은, 현우], 3명이 출력되고, 둘째 줄에는 getClass().getSimpleName()이 ' + mk + '를 출력합니다. getClass()는 모든 객체에 있는 메서드로, 실제로 만든 객체의 클래스를 알려 줍니다.', 'good');
      }
    } else if (c.scene === 'sort') {
      var impl = c.cmp !== 'noimpl', hasM = c.cmp !== 'nomethod';
      st.hot = 'cp';
      st.checks.push(['Comparable', { v: '인터페이스 (자바가 줌)', cls: 'good' }]);
      push('Comparable은 자바가 java.lang 패키지에 public interface Comparable<T>로 선언해 둔 인터페이스입니다(java.lang은 import 없이 씁니다). 메서드는 int compareTo(T o) 하나이고 본문이 없습니다(추상 메서드). "이 타입의 객체는 다른 객체와 비교해 앞뒤를 알려 줄 수 있다"는 것을 정해 둔 것입니다. 앞이면 음수, 같으면 0, 뒤면 양수를 돌려줍니다.', '');
      st.hot = 'mb';
      if (impl) {
        st.checks.push(['Member가 implements Comparable<Member>', { v: '예', cls: 'good' }]);
        push('컴파일러가 class Member implements Comparable<Member> 줄을 읽습니다. 예시로 만든 Member 클래스가 자바의 Comparable을 구현하겠다는 선언입니다. 그러므로 Member에 compareTo 메서드가 작성되어 있어야 합니다.', '');
      } else {
        st.checks.push(['Member가 implements Comparable<Member>', { v: '아니요', cls: '' }]);
        push('컴파일러가 class Member 줄을 읽습니다. implements가 없으므로 Member는 Comparable과 관계없는 클래스입니다. 이 줄에는 확인할 것이 없어 오류가 나지 않습니다.', '');
      }
      if (impl && hasM) {
        st.checks.push(['Member의 compareTo 메서드', { v: '있음', cls: 'good' }]);
        push('컴파일러가 Member에서 compareTo 메서드를 찾습니다. public int compareTo(Member other)가 있으므로 Comparable이 정한 메서드를 작성한 것입니다. 본문 Integer.compare(this.age, other.age)는 나이가 적은 쪽을 앞으로 보냅니다.', 'good');
      } else if (impl) {
        st.bad.mb = true; fail(self.errMiss); errAt.push('class Member implements Comparable<Member> {');
        st.checks.push(['Member의 compareTo 메서드', { v: '없음: 오류', cls: 'bad' }]);
        push('컴파일러가 Member에서 compareTo 메서드를 찾습니다. 없습니다. implements Comparable<Member>로 구현하겠다고 해 놓고 작성하지 않았으므로 오류가 납니다(javac: Member is not abstract and does not override abstract method compareTo(Member) in Comparable). 인터페이스는 메서드의 본문을 물려주지 않습니다. extends로 클래스를 물려받으면 부모가 작성한 메서드를 그대로 갖지만, implements로 받는 것은 "이 메서드가 있어야 한다"는 것뿐이어서 본문은 Member가 직접 작성해야 합니다.', 'bad');
      } else {
        st.checks.push(['Member의 compareTo 메서드', { v: '있음 (Comparable과 이어지지 않음)', cls: '' }]);
        push('Member에 compareTo 메서드가 있습니다. 하지만 implements가 없어서, 이름과 모양이 같아도 컴파일러는 이 메서드를 Comparable의 compareTo와 이어 주지 않습니다.', '');
      }
      st.hot = 'cs';
      if (impl) {
        st.fit = 'ok';
        st.checks.push(['Collections.sort(members)', { v: 'Member가 Comparable이므로 부를 수 있음', cls: 'good' }]);
        push('컴파일러가 Collections.sort(members) 줄을 확인합니다. Collections.sort는 자바가 주는 정렬 메서드로, 선언이 public static <T extends Comparable<? super T>> void sort(List<T> list)입니다. 읽는 법은 "목록 원소의 타입 T가 Comparable이어야 한다"입니다. Member는 implements Comparable<Member>를 썼으므로 이 조건에 맞습니다.' + (hasM ? '' : ' 이 줄 자체는 오류가 아닙니다(javac가 알린 오류는 위의 1개뿐입니다).'), hasM ? 'good' : '');
      } else {
        st.fit = 'bad'; st.bad.cs = true; fail(self.errSort); errAt.push('Collections.sort(members);');
        st.checks.push(['Collections.sort(members)', { v: '오류: Member가 Comparable이 아님', cls: 'bad' }]);
        push('컴파일러가 Collections.sort(members) 줄을 확인합니다. Collections.sort의 선언은 public static <T extends Comparable<? super T>> void sort(List<T> list)로, 목록 원소의 타입이 Comparable이어야 합니다. Member는 compareTo 메서드가 있어도 implements Comparable이 없어서 Comparable 타입이 아니므로 오류가 납니다(javac: no suitable method found for sort(List<Member>)). 메서드가 있다고 그 타입이 되는 것은 아닙니다.', 'bad');
      }
      st.hot = '';
      if (impl && hasM) {
        st.compile = 'ok'; st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
        push('컴파일이 성공해 Main 클래스 파일이 만들어집니다. String도 자바가 implements Comparable<String>으로 선언해 둔 클래스여서, List<String>은 따로 작성하지 않아도 Collections.sort로 바로 정렬됩니다.', 'good');
        st.hot = 'ls'; st.obj = 'members'; st.sorted = true; st.ran = true;
        out = '지은 25 / 현우 28 / 민수 31'; st.out = out;
        st.checks.push(['실행했을 때 출력', { v: out, cls: 'good' }]);
        push('java Main으로 실행합니다. 목록에 민수 31, 지은 25, 현우 28 순서로 더해집니다. Collections.sort가 정렬하면서 두 Member씩 Member에 작성된 compareTo를 불러 앞뒤를 정하고, 나이가 적은 순서로 지은 25, 현우 28, 민수 31이 한 줄씩 출력됩니다. Collections.sort는 Member를 모르지만, Comparable이 정한 compareTo만 알면 정렬할 수 있습니다.', 'good');
      }
    } else {
      var iface = c.own === 'iface';
      st.hot = 'gr';
      st.checks.push(['Greeter', { v: iface ? '인터페이스 (예시로 지음)' : '클래스 (예시로 지음)', cls: 'good' }]);
      push(iface
        ? '컴파일러가 interface Greeter 선언을 읽습니다. 이 실습에서 예시로 지은 인터페이스입니다. String greet(String name);은 이름, 매개변수, 돌려주는 타입만 있고 본문 없이 세미콜론으로 끝납니다. 인터페이스에서 이 모양은 추상 메서드로, "Greeter 타입이라면 greet가 있다"는 것만 정합니다. 자바의 Comparable이 compareTo 하나를 정해 둔 것과 같은 모양입니다.'
        : '컴파일러가 class Greeter 선언을 읽습니다. 이 실습에서 예시로 지은 클래스이고, interface가 아니라 class입니다. greet에는 본문 { return "안녕하세요, " + name; }까지 있습니다.', '');
      st.hot = 'he';
      st.checks.push(['Hello', { v: iface ? 'implements Greeter, greet를 직접 작성' : 'extends Greeter, greet를 작성하지 않음', cls: 'good' }]);
      push(iface
        ? '컴파일러가 class Hello implements Greeter를 읽습니다. 예시로 지은 클래스 Hello가 Greeter를 구현하겠다는 선언이므로, Hello에 greet가 있어야 합니다. Greeter에는 본문이 없으니 Hello가 public String greet(String name) { ... }로 본문을 직접 작성했습니다. implements 뒤에는 인터페이스를 쉼표로 여러 개 적을 수 있습니다. 자바의 ArrayList가 implements List<E>, RandomAccess, Cloneable, Serializable로 넷을 적은 것이 그 예입니다.'
        : '컴파일러가 class Hello extends Greeter를 읽습니다. extends는 클래스를 물려받는 것(상속)이어서, Hello는 greet를 작성하지 않아도 Greeter에 작성된 greet를 본문까지 그대로 갖습니다. 대신 extends 뒤에는 클래스를 하나만 적을 수 있습니다. Hello가 Greeter를 물려받으면 다른 클래스를 더 물려받을 수 없습니다.', 'good');
      st.hot = 'gv'; st.fit = 'ok';
      st.checks.push(['Greeter 타입 변수 g가 Hello 객체를 가리키기', { v: '가리킬 수 있음', cls: 'good' }]);
      push('컴파일러가 Greeter g = new Hello(); 줄을 확인합니다. Hello는 ' + (iface ? 'implements Greeter' : 'extends Greeter') + '를 썼으므로 Greeter 타입이기도 하고, Greeter 타입 변수 g가 Hello 객체를 가리켜도 됩니다. List 타입 변수가 ArrayList 객체를 가리키는 것과 같은 모양입니다.', 'good');
      st.hot = ''; st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 Main 클래스 파일이 만들어집니다.', 'good');
      st.hot = 'ob'; st.obj = 'Hello'; st.ran = true; out = '안녕하세요, 민수'; st.out = out;
      st.checks.push(['실행했을 때 출력', { v: out, cls: 'good' }]);
      push('java Main으로 실행합니다. g.greet("민수")는 g가 가리키는 Hello 객체의 greet를 실행해 안녕하세요, 민수를 출력합니다. ' + (iface ? '실행된 것은 Hello가 직접 작성한 본문입니다.' : '실행된 것은 Hello가 Greeter에게서 물려받은 본문입니다.'), 'good');
    }

    var ok = st.compile === 'ok';
    if (!ok) {
      st.hot = ''; st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + st.errs + '개', cls: 'bad' }]);
      push('컴파일에 실패합니다. 컴파일러가 알린 오류는 ' + st.errs + '개이고, 첫 번째 오류는 "' + st.errText + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없습니다.', 'bad');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (c.scene === 'list') {
      if (ok && c.vtype === 'List' && c.make === 'ArrayList') {
        sum.push('인터페이스는 interface로 선언하는 타입으로, 이런 메서드가 있다는 것을 정해 둡니다. 자바가 주는 List가 인터페이스이고, ArrayList는 implements List로 그것을 구현한 클래스입니다. 그래서 List 타입 변수 names가 ArrayList 객체를 가리킬 수 있었습니다.');
        sum.push('names로 부른 add와 size는 List에 정해진 메서드여서, 이 코드는 names가 ArrayList를 가리키는지 LinkedList를 가리키는지에 기대지 않습니다. 실행된 것은 ArrayList에 작성된 add와 size입니다.');
      } else if (ok && c.vtype === 'List') {
        sum.push('LinkedList도 List를 구현한 클래스여서, 바꾼 곳은 new 오른쪽 하나뿐이고 뒤의 코드는 그대로 컴파일되었습니다. 출력된 목록과 개수도 같았고, 달라진 것은 실제 객체의 클래스 이름(LinkedList)뿐이었습니다.');
        sum.push('변수의 타입을 인터페이스 List로 적어 두면, 쓰는 쪽 코드를 고치지 않고 구현 클래스를 바꿔 끼울 수 있습니다. 변수, 매개변수, 메서드가 돌려주는 값의 타입을 List처럼 인터페이스로 적는 것이 이 때문입니다.');
      } else if (ok) {
        sum.push('변수의 타입을 클래스 ArrayList로 적어도 ArrayList 객체를 가리키면 컴파일되고 실행됩니다.' + (c.trim ? ' 이때는 ArrayList에만 있는 trimToSize도 부를 수 있었습니다.' : ''));
        sum.push('다만 이 변수는 ArrayList에 묶여서, LinkedList로 바꿔 끼우려면 변수의 타입부터 고쳐야 합니다. 그 클래스만의 메서드가 꼭 필요한 것이 아니면 변수의 타입은 List로 적습니다.');
      } else if (c.make === 'List') {
        sum.push('List는 인터페이스라서 new List<>()로 객체를 만들 수 없어 컴파일에 실패했습니다. 인터페이스는 메서드가 있다고 정할 뿐 add와 size의 본문을 작성한 클래스가 아니기 때문입니다.');
        sum.push('인터페이스는 변수의 타입으로 쓰고, 객체는 그것을 구현한 클래스(ArrayList, LinkedList)로 만듭니다.');
      } else if (c.vtype === 'ArrayList') {
        sum.push('ArrayList 타입 변수는 LinkedList 객체를 가리킬 수 없어 컴파일에 실패했습니다. LinkedList는 List를 구현했지만 ArrayList의 한 종류는 아니기 때문입니다.');
        sum.push('변수의 타입을 클래스로 적으면 그 클래스에 묶이고, 인터페이스 List로 적으면 List를 구현한 어느 클래스로든 바꿔 끼울 수 있습니다.');
      } else {
        sum.push('List 타입 변수로는 ArrayList에만 있는 trimToSize를 부를 수 없어 컴파일에 실패했습니다.' + (c.make === 'ArrayList' ? ' 실제 객체가 ArrayList여도 마찬가지였습니다.' : '') + ' 컴파일러는 변수의 타입 List에 정해진 메서드만 부르게 합니다.');
        sum.push('인터페이스 타입 변수로는 인터페이스가 정한 메서드만 부를 수 있습니다. 그 덕분에 어느 구현 클래스로 바꿔 끼워도 그 줄이 그대로 맞습니다.');
      }
    } else if (c.scene === 'sort') {
      if (ok) {
        sum.push('예시로 만든 Member가 자바의 Comparable을 implements하고 compareTo를 작성해서, 자바의 Collections.sort가 Member 목록을 나이순으로 정렬했습니다.');
        sum.push('Collections.sort는 Member를 모르고 Comparable이 정한 compareTo만 압니다. 자바가 주는 코드가 인터페이스 타입으로 받기 때문에, 그 인터페이스를 implements한 클래스는 무엇이든 그 코드에 넘길 수 있습니다.');
      } else if (c.cmp === 'noimpl') {
        sum.push('compareTo 메서드가 똑같이 있어도 implements Comparable이 없으면 Member는 Comparable 타입이 아니어서, Collections.sort(members) 줄에서 컴파일에 실패했습니다.');
        sum.push('메서드를 갖췄다고 그 타입이 되는 것이 아닙니다. implements 선언이 있어야 컴파일러가 Member를 Comparable 타입으로 인정합니다.');
      } else {
        sum.push('implements Comparable<Member>만 쓰고 compareTo를 작성하지 않아 컴파일에 실패했습니다. 인터페이스는 메서드의 본문을 물려주지 않으므로, 구현하는 클래스가 직접 작성해야 합니다.');
        sum.push('extends로 클래스를 물려받으면 부모가 작성한 메서드를 그대로 갖는 것과 다릅니다. 구현했는지는 실행할 때가 아니라 컴파일할 때 확인하므로 이 프로그램은 실행해 볼 수도 없었습니다.');
      }
    } else if (c.own === 'iface') {
      sum.push('인터페이스는 이렇게 직접 선언할 수도 있습니다. 예시로 지은 interface Greeter는 greet의 이름만 정하고, Hello가 implements Greeter로 구현하면서 본문을 작성했습니다. 자바의 List, Comparable도 같은 모양으로 선언되어 있습니다.');
      sum.push('extends로 클래스를 물려받으면 부모의 본문까지 물려받지만 하나만 물려받을 수 있습니다. 인터페이스는 본문을 물려주지 않는 대신 여러 개를 implements할 수 있어서, 이미 다른 클래스를 물려받은 클래스도 Comparable이나 List 같은 타입이 될 수 있습니다.');
    } else {
      sum.push('class Greeter를 extends한 Hello는 greet를 작성하지 않고도 부모의 본문을 물려받아 실행했습니다. 이것이 상속이고, 인터페이스를 implements하는 것과의 차이입니다.');
      sum.push('대신 extends 뒤에는 클래스를 하나만 적을 수 있습니다. ArrayList가 AbstractList 하나만 extends하고 List, RandomAccess, Cloneable, Serializable 넷을 implements하듯, 여러 클래스가 함께 따라야 하는 타입은 인터페이스로 만듭니다.');
    }
    var row = ok ? ['성공', '없음', out] : ['오류', st.errText, '실행할 수 없음'];
    return { events: ev, summary: sum, nerr: st.errs, errAt: errAt, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    H.counters(v, [[s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: 위에 인터페이스(List, Comparable, 예시로 지은 Greeter)와 그것을 구현한 클래스, 가운데에 변수와 실제 객체(정렬에서는 Collections.sort와 목록). 컴파일러가 확인 중인 곳이 노랗게 보이고, 맨 아래에 컴파일 결과와 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 360);
    var hot = s ? s.hot : '', bad = s ? s.bad : {};
    function cls(id) { return bad[id] ? 'bad' : hot === id ? 'hot now' : 'plain'; }
    if (c.scene === 'list') {
      P.box('li', 225, 14, 230, 56, { cls: cls('li'), title: 'List (인터페이스)', sub: '자바가 줌 · add, get, size' });
      P.box('al', 14, 104, 230, 56, { cls: c.make === 'ArrayList' ? cls('mk') : 'plain', title: 'ArrayList (클래스)', sub: '자바가 줌 · trimToSize도 있음' });
      P.box('ll', 436, 104, 230, 56, { cls: c.make === 'LinkedList' ? cls('mk') : 'plain', title: 'LinkedList (클래스)', sub: '자바가 줌' });
      P.arrow('ia', 'al:t', 'li:b:0.25', { cls: 'mut', label: 'implements' });
      P.arrow('il', 'll:t', 'li:b:0.75', { cls: 'mut', label: 'implements' });
      if (c.make === 'List') P.box('mk', 262, 104, 156, 56, { cls: cls('mk'), title: 'new List<>()', sub: bad.mk ? '만들 수 없음' : '확인 전' });
      P.box('nv', 14, 186, 230, 56, { cls: bad.nv || bad.call ? 'bad' : hot === 'nv' || hot === 'call' ? 'hot now' : 'plain', title: 'names', sub: c.vtype + '<String> 타입 변수' });
      P.box('ob', 436, 186, 230, 56, { cls: s && s.obj ? (hot === 'ob' ? 'good now' : 'good') : 'ghost', title: c.make === 'List' ? '객체' : c.make + ' 객체', sub: s && s.obj ? '[민수, 지은, 현우]' : s && s.compile === 'err' ? '만들어지지 않음' : '아직 없음' });
      if (s && s.obj) P.arrow('ref', 'nv:r', 'ob:l', { cls: 'good', label: '가리킴' });
      else if (s && s.fit === 'bad') P.arrow('ref', 'nv:r', 'ob:l', { cls: 'bad', label: '가리킬 수 없음' });
    } else if (c.scene === 'sort') {
      P.box('cp', 14, 14, 230, 56, { cls: cls('cp'), title: 'Comparable (인터페이스)', sub: '자바가 줌 · compareTo 하나' });
      P.box('mb', 436, 14, 230, 56, { cls: cls('mb'), title: 'Member (예시 클래스)', sub: c.cmp === 'nomethod' ? 'compareTo 없음' : 'compareTo 있음' });
      if (c.cmp !== 'noimpl') P.arrow('imp', 'mb:l', 'cp:r', { cls: bad.mb ? 'bad' : hot === 'mb' ? 'hot' : 'mut', label: 'implements' });
      P.box('cs', 14, 104, 230, 56, { cls: cls('cs'), title: 'Collections.sort', sub: '자바가 줌 · Comparable인 원소만' });
      P.arrow('need', 'cs:t', 'cp:b', { cls: 'mut', label: '요구함' });
      P.box('ls', 436, 104, 230, 56, { cls: s && s.sorted ? (hot === 'ls' ? 'good now' : 'good') : s && s.compile === 'err' ? 'ghost' : 'plain', title: 'members 목록', sub: s && s.sorted ? '지은 25, 현우 28, 민수 31' : '민수 31, 지은 25, 현우 28' });
      if (s && s.fit) P.arrow('pass', 'cs:r', 'ls:l', { cls: s.fit === 'bad' ? 'bad' : s.sorted ? 'good' : 'mut', label: s.fit === 'bad' ? '넘길 수 없음' : '정렬' });
    } else {
      var iface = c.own === 'iface';
      P.box('gr', 14, 14, 230, 56, { cls: cls('gr'), title: 'Greeter (' + (iface ? '인터페이스' : '클래스') + ')', sub: iface ? '예시로 지음 · greet 이름만' : '예시로 지음 · greet 본문 있음' });
      P.box('he', 436, 14, 230, 56, { cls: cls('he'), title: 'Hello (예시 클래스)', sub: iface ? 'greet 본문을 직접 작성' : 'greet를 물려받음' });
      P.arrow('imp', 'he:l', 'gr:r', { cls: hot === 'he' ? 'hot' : 'mut', label: iface ? 'implements' : 'extends' });
      P.box('gv', 14, 104, 230, 56, { cls: cls('gv'), title: 'g', sub: 'Greeter 타입 변수' });
      P.box('ob', 436, 104, 230, 56, { cls: s && s.obj ? (hot === 'ob' ? 'good now' : 'good') : 'ghost', title: 'Hello 객체', sub: s && s.obj ? 'new Hello()로 만들어짐' : '아직 없음' });
      if (s && s.obj) P.arrow('ref', 'gv:r', 'ob:l', { cls: 'good', label: '가리킴' });
    }
    P.box('r1', 14, 262, 652, 50, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류 ' + s.errs + '개') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 318, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: '실행했을 때 출력', right: s && s.ran ? s.out : s && s.compile === 'err' ? '실행할 수 없음' : '' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 설정의 조합을 모두(목록 12가지, 정렬 3가지, 직접 선언 2가지), 화면의 코드 함수가 만든 글을 그대로 파일로 써서 javax.tools로 컴파일하고, 컴파일에 성공한 것은 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드와 영어 메시지(abstract.cant.be.instantiated, cant.resolve.location.args, prob.found.req, cant.apply.symbols, does.not.override.abstract를 화면의 다섯 가지 오류 설명으로 옮겼습니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력입니다. 같은 프로그램에서 리플렉션으로 List와 Comparable이 인터페이스인 것, ArrayList가 AbstractList를 물려받고 List, RandomAccess, Cloneable, Serializable을 구현한 것, LinkedList가 AbstractSequentialList를 물려받고 List, Deque, Cloneable, Serializable을 구현한 것, String이 Comparable을 구현한 것, trimToSize가 ArrayList에는 있고 List에는 없는 것, Comparable의 메서드가 compareTo 하나인 것을 확인했고, extends 뒤에 클래스를 둘 적으면 문법 오류(javac가 쉼표 자리에 { 가 와야 한다고 알림)이고 implements 뒤에 인터페이스를 둘 적으면 컴파일되는 것도 따로 컴파일해 확인했습니다. 화면에 옮긴 선언(public interface List<E>, Collections.sort의 <T extends Comparable<? super T>>)은 JDK 21의 API 문서와 대조했습니다. 문서는 Java Language Specification(Java SE 21)의 9.4절(본문 없이 세미콜론으로 끝나는 인터페이스 메서드는 추상 메서드), 8.1.4절(extends 뒤의 클래스는 하나), 8.1.5절(implements 뒤의 인터페이스는 여럿), 8.1.1.1절(추상 클래스가 아니면 구현한 인터페이스의 추상 메서드를 모두 갖춰야 함), 15.9.1절(인터페이스로는 new로 객체를 만들 수 없음), 5.2절(상위 타입 변수가 하위 타입의 객체를 가리킬 수 있음), 15.12.1절(부를 수 있는 메서드는 변수의 타입에서 찾음)을 따랐습니다. 오류의 종류, 개수, 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것이고, 오류가 여럿이면 표에는 첫 번째 것만 적었습니다. List에는 본문이 있는 default 메서드(sort, replaceAll 등)도 있지만 이 실습은 다루지 않았습니다. 인터페이스의 쓰임과 추상 클래스와의 차이는 "세부 동작 실습: 인터페이스와 추상 클래스"에서 다룹니다.',
});
