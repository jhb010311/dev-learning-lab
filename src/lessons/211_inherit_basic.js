Lab.register({
  id: 'inherit_basic', nav: '상속', cat: '기초개념', mode: 'step', basic: true, deep: ['inherit'],
  title: 'extends는 무엇을 물려주는가',
  why: '비슷한 클래스를 따로 만들면 같은 코드를 클래스마다 베껴 적어야 하고, 고칠 때도 모든 클래스를 고쳐야 한다. 상속은 공통 코드를 부모 클래스에 한 번만 적고 자식 클래스가 extends로 물려받게 해서, 자식 클래스에는 그 클래스만의 코드를 덧붙이거나 달라지는 메서드만 다시 적게 한다. 자바는 모든 클래스가 Object를 물려받게 정해서, toString이나 equals 같은 기본 메서드를 어느 객체에서나 부를 수 있게 했다.',
  use: '개발자가 가장 자주 하는 상속은 Object에게서 물려받은 toString이나 equals를 @Override로 다시 적는 것과, 프로그램에 맞는 예외 클래스를 extends RuntimeException으로 만드는 것이다. 서블릿을 직접 만들 때는 톰캣 같은 서블릿 컨테이너가 주는 HttpServlet을 extends하고 doGet 같은 메서드를 다시 적는다. 부모를 고치면 모든 자식이 영향을 받으므로, 다른 클래스의 기능을 빌려 쓰기만 하려면 상속 대신 그 객체를 필드로 두고 메서드를 부르기도 한다.',
  intro: '상속은 클래스 이름 뒤에 extends와 다른 클래스 이름을 적어, 그 클래스(부모 클래스)에 적힌 메서드와 필드를 물려받는 문법입니다. 가장 먼저 만나는 상속은 눈에 보이지 않습니다. extends를 적지 않은 클래스도 자바가 주는 Object 클래스를 부모로 가져서, 직접 적지 않은 toString() 같은 메서드를 부를 수 있습니다. 물려받은 메서드를 같은 이름, 같은 매개변수로 다시 적으면 그 클래스의 객체에서는 다시 적은 것이 실행되는데, 이것이 재정의(오버라이딩)이고 @Override는 그것을 컴파일러에게 확인받는 표시입니다. 두 번째로 자주 쓰는 상속은 extends RuntimeException으로 예외 클래스를 만드는 것입니다. 이 실습은 예시로 만든 Member 클래스와 MemberNotFoundException 클래스로, toString()을 다시 적거나 extends를 지우고 변수와 catch의 타입을 바꿔 가며 같은 코드를 컴파일하고 실행해, 컴파일러가 무엇을 알려 주고 무엇이 출력되는지를 봅니다.',
  terms: ['상속', 'extends', 'Object 클래스', 'toString()', '오버라이딩', '@Override', 'RuntimeException', '부모 클래스와 자식 클래스'],
  controls: [
    { id: 'scene', label: '보는 코드', type: 'select', value: 'obj', options: [['obj', '모든 클래스가 물려받는 Object'], ['exc', 'extends RuntimeException으로 만든 예외 클래스']] },
    { id: 'tos', label: 'Member의 toString()', type: 'select', value: 'none', options: [['none', '적지 않는다'], ['ok', '@Override를 붙여 다시 적는다'], ['typo', '@Override를 붙이고 이름을 tostring으로 잘못 적는다'], ['typo_noann', '@Override 없이 이름을 tostring으로 잘못 적는다']], show: function (c) { return c.scene === 'obj'; } },
    { id: 'vt', label: '변수 m의 타입', type: 'select', value: 'Member', options: [['Member', 'Member m (객체의 클래스와 같은 타입)'], ['Object', 'Object m (부모 클래스 타입)'], ['String', 'String m (관계없는 클래스 타입)']], show: function (c) { return c.scene === 'obj'; } },
    { id: 'ext', label: 'MemberNotFoundException에 extends RuntimeException을 쓴다', type: 'check', value: true, show: function (c) { return c.scene === 'exc'; } },
    { id: 'ctor', label: 'MemberNotFoundException의 생성자', type: 'select', value: 'super', options: [['super', '적고, super(message)로 메시지를 넘긴다'], ['none', '적지 않는다']], show: function (c) { return c.scene === 'exc'; } },
    { id: 'ct', label: 'catch가 받는 타입', type: 'select', value: 'own', options: [['own', 'catch (MemberNotFoundException e)'], ['rt', 'catch (RuntimeException e) (부모 클래스 타입)']], show: function (c) { return c.scene === 'exc'; } },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'extends를 적지 않은 Member 클래스의 객체로 toString()을 부를 수 있나', d: 'Member는 extends를 적지 않아도 자바의 Object를 물려받습니다. Object에 적힌 toString()이 실행되어 Member@279f2327처럼 클래스 이름과 해시 코드가 출력됩니다.', v: { scene: 'obj', tos: 'none', vt: 'Member' } },
    { t: 'toString()을 다시 적으면', q: 'Member에 toString()을 @Override로 다시 적으면 println(m)의 출력이 바뀌나', d: 'Member에 다시 적은 toString()이 실행되어 Member(민수)가 출력됩니다. println도 그 toString()을 부릅니다.', v: { scene: 'obj', tos: 'ok', vt: 'Member' } },
    { t: 'Object 타입 변수로 가리키면', q: 'Member 객체를 Object 타입 변수 m이 가리키게 하면', d: 'Member는 Object의 자식이라 Object 타입 변수가 가리킬 수 있습니다. 실행되는 toString()은 여전히 Member에 다시 적은 것입니다.', v: { scene: 'obj', tos: 'ok', vt: 'Object' } },
    { t: 'String 타입 변수로 가리키면', q: 'Member 객체를 String 타입 변수 m이 가리키게 할 수 있나', d: 'Member는 String을 물려받지 않았으므로 String 타입이 아닙니다. 컴파일 오류가 납니다.', v: { scene: 'obj', tos: 'none', vt: 'String' } },
    { t: '이름을 잘못 적고 @Override를 붙이면', q: 'toString()을 tostring()으로 잘못 적고 @Override를 붙이면', d: 'tostring은 부모에 없는 메서드라 재정의가 아닙니다. @Override 때문에 컴파일러가 오류로 알려 줍니다.', v: { scene: 'obj', tos: 'typo', vt: 'Member' } },
    { t: '이름을 잘못 적고 @Override가 없으면', q: 'toString()을 tostring()으로 잘못 적고 @Override를 붙이지 않으면', d: '컴파일은 되지만 tostring은 새 메서드일 뿐이어서, 출력은 Object의 toString()이 만든 Member@279f2327 그대로입니다.', v: { scene: 'obj', tos: 'typo_noann', vt: 'Member' } },
    { t: '예외 클래스를 만들면', q: 'extends RuntimeException으로 만든 MemberNotFoundException을 throw하고 catch할 수 있나', d: 'RuntimeException을 물려받아 예외 객체가 되므로 throw와 catch에 쓸 수 있고, 적지 않은 getMessage()도 부를 수 있습니다.', v: { scene: 'exc', ext: true, ctor: 'super', ct: 'own' } },
    { t: 'RuntimeException 타입으로 받으면', q: 'catch (RuntimeException e)로도 MemberNotFoundException을 받나', d: 'MemberNotFoundException은 RuntimeException의 자식이라, 부모 타입 변수 e가 그 객체를 받습니다.', v: { scene: 'exc', ext: true, ctor: 'super', ct: 'rt' } },
    { t: 'extends RuntimeException을 지우면', q: 'extends RuntimeException을 지우면', d: '부모가 Object인 보통 클래스가 되어 super(message), throw, catch, getMessage()에서 컴파일 오류가 납니다.', v: { scene: 'exc', ext: false, ctor: 'super', ct: 'own' } },
    { t: '생성자를 적지 않으면', q: 'MemberNotFoundException에 생성자를 적지 않으면 RuntimeException의 생성자로 메시지를 넘길 수 있나', d: '생성자는 물려받지 않습니다. 메시지를 받는 생성자가 없어 컴파일 오류가 납니다.', v: { scene: 'exc', ext: true, ctor: 'none', ct: 'own' } },
  ],
  // 컴파일러가 알려 주는 오류(실제 javac의 진단을 옮긴 것). 대조 스크립트 verify/plain/cmp_inherit_basic.js가 이 글을 javac의 진단 코드와 맞춰 본다.
  errOverride: 'tostring은 부모 클래스에 없는 메서드라 재정의가 아님',
  errFit: 'Member 객체를 String 타입 변수가 가리킬 수 없음',
  errSuperObj: '부모 Object에는 메시지를 받는 생성자가 없음',
  errCtor: 'MemberNotFoundException에 메시지를 받는 생성자가 없음',
  errThrow: 'MemberNotFoundException은 Throwable이 아니어서 던질 수 없음',
  errCatch: 'MemberNotFoundException은 Throwable이 아니어서 catch에 적을 수 없음',
  errMsg: 'MemberNotFoundException에는 getMessage 메서드가 없음',
  // Object의 toString()이 만든 글자. 실제로 실행해 나온 값(이 실습의 환경에서 실행마다 같았음)
  hashOut: 'Member@279f2327',
  // 화면의 코드. 대조 프로그램(verify/plain/InheritBasicProbe.java)은 이 함수가 만든 글을 그대로 컴파일하고 실행한다.
  code: function (c) {
    var o = [];
    if (c.scene === 'obj') {
      o.push('// Member는 이 실습에서 예시로 만든 클래스 (extends를 적지 않았다)', 'class Member {', '    String name;', '',
        '    Member(String name) {', '        this.name = name;', '    }');
      if (c.tos === 'ok') o.push('', '    // Object에게서 물려받은 toString()을 같은 모양으로 다시 적는다', '    @Override', '    public String toString() {', '        return "Member(" + name + ")";', '    }');
      else if (c.tos !== 'none') {
        o.push('', '    // toString()을 다시 적으려다 이름을 tostring으로 잘못 적었다');
        if (c.tos === 'typo') o.push('    @Override');
        o.push('    public String tostring() {', '        return "Member(" + name + ")";', '    }');
      }
      o.push('}', '', 'public class Main {', '    public static void main(String[] args) {',
        '        // 변수 m의 타입은 ' + c.vt + ', 오른쪽에서 만드는 것은 Member 객체',
        '        ' + c.vt + ' m = new Member("민수");',
        c.tos === 'ok' ? '        // Member에 다시 적은 toString()을 m으로 부른다' : '        // Member에 적지 않은 toString()을 m으로 부른다',
        '        System.out.println(m.toString());',
        '        // println은 받은 객체의 toString()을 불러 그 결과를 출력한다',
        '        System.out.println(m);', '    }', '}');
    } else {
      o.push('// MemberNotFoundException은 이 실습에서 예시로 만든 예외 클래스',
        '// RuntimeException은 자바가 주는 예외 클래스',
        'class MemberNotFoundException' + (c.ext ? ' extends RuntimeException' : '') + ' {');
      if (c.ctor === 'super') o.push('    // 받은 메시지를 부모 클래스의 생성자에 넘긴다', '    MemberNotFoundException(String message) {', '        super(message);', '    }');
      o.push('}', '', 'public class Main {', '    public static void main(String[] args) {', '        try {',
        '            throw new MemberNotFoundException("회원이 없습니다: 민수");',
        '        } catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e) {',
        '            // getMessage()는 MemberNotFoundException에 적지 않은 메서드',
        '            System.out.println("잡음: " + e.getMessage());', '        }',
        '        System.out.println("끝");', '    }', '}');
    }
    return o.join('\n');
  },
  label: function (c) {
    if (c.scene === 'obj') return 'Member · ' + { none: 'toString() 적지 않음', ok: 'toString() 다시 적음', typo: 'tostring()에 @Override', typo_noann: 'tostring() (@Override 없음)' }[c.tos] + ' · ' + c.vt + ' m';
    return 'MemberNotFoundException · ' + (c.ext ? 'extends RuntimeException' : 'extends 없음') + ' · ' + (c.ctor === 'super' ? '생성자 있음' : '생성자 없음') + ' · catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e)';
  },
  columns: ['컴파일', '컴파일러가 알려 주는 것', '실행했을 때 출력'],
  simulate: function (c) {
    var ev = [], sum = [], self = this, errAt = [], out = [];
    var st = { hot: '', bad: {}, fit: '', obj: false, ran: '', caught: false, compile: '', errs: 0, errText: '', out: [], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function fail(text, line) { st.errs++; if (!st.errText) st.errText = text; errAt.push(line); }
    var DECL = c.vt + ' m = new Member("민수");';
    var THROW = 'throw new MemberNotFoundException("회원이 없습니다: 민수");';
    var CATCH = '} catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e) {';
    var MSG = 'System.out.println("잡음: " + e.getMessage());';

    if (c.scene === 'obj') {
      var own = { none: '필드 name과 생성자', ok: '필드 name, 생성자, toString()', typo: '필드 name, 생성자, tostring()', typo_noann: '필드 name, 생성자, tostring()' }[c.tos];
      // 1. class Member
      st.hot = 'mb';
      st.checks.push(['Member의 부모 클래스', { v: 'Object (extends를 적지 않음)', cls: 'good' }]);
      push('컴파일러가 class Member { 줄을 읽습니다. Member는 이 실습에서 예시로 만든 클래스이고, 클래스 이름 뒤에 extends가 없습니다. extends를 적지 않은 클래스는 자바가 주는 Object 클래스를 부모로 갖는다고 자바 명세가 정해 두었습니다. 그래서 Member는 Object에 적힌 toString(), equals(), hashCode(), getClass() 같은 메서드를 물려받습니다. Member 안에 직접 적은 것은 ' + own + '입니다.', '');
      // 2. toString
      st.hot = 'ts';
      if (c.tos === 'none') {
        st.checks.push(['Member의 toString()', { v: '적지 않음: Object의 것을 물려받음', cls: '' }]);
        push('Member에는 toString()이 적혀 있지 않습니다. 그러면 Member 객체로 부르는 toString()은 Object에 적힌 것입니다. 자바가 적어 둔 그 본문은 return getClass().getName() + "@" + Integer.toHexString(hashCode()); 한 줄로, 클래스 이름, @, 그 객체의 해시 코드를 16진수로 적은 글자를 이어 붙여 돌려줍니다.', '');
      } else if (c.tos === 'ok') {
        st.checks.push(['Member의 toString()', { v: '다시 적음: 재정의(오버라이딩)', cls: 'good' }]);
        push('컴파일러가 @Override와 public String toString() { ... }을 읽습니다. Object에도 public String toString()이 있는데, Member에 같은 이름, 같은 매개변수(없음), 같은 반환 타입으로 다시 적었으므로 물려받은 toString()을 재정의(오버라이딩)한 것입니다. @Override는 자바가 주는 애너테이션으로, "이 메서드는 부모의 메서드를 재정의한다"고 컴파일러에게 확인을 맡기는 표시입니다. 부모 Object에 같은 메서드가 있으므로 통과합니다.', 'good');
      } else if (c.tos === 'typo') {
        st.bad.ts = true; fail(self.errOverride, '@Override');
        st.checks.push(['Member의 tostring()에 붙은 @Override', { v: '오류: 재정의할 메서드가 부모에 없음', cls: 'bad' }]);
        push('컴파일러가 @Override와 public String tostring() { ... }을 읽습니다. @Override는 이 메서드가 부모의 메서드를 재정의한다는 표시인데, Object에 있는 것은 toString(대문자 S)이고 tostring은 부모 어디에도 없습니다. 그래서 @Override가 붙은 줄에서 오류가 납니다(javac: method does not override or implement a method from a supertype). 이름이 한 글자만 달라도 다른 메서드입니다.', 'bad');
      } else {
        st.checks.push(['Member의 tostring()', { v: '새 메서드 (재정의 아님)', cls: '' }]);
        push('컴파일러가 public String tostring() { ... }을 읽습니다. @Override가 없으므로 컴파일러는 이것이 재정의하려던 메서드인지 확인하지 않고, Member에 새로 더한 메서드 tostring으로 받아들입니다. 오류는 나지 않습니다. Object에서 물려받은 toString()은 그대로 남아 있습니다.', '');
      }
      // 3. 변수 m
      st.hot = 'mv';
      if (c.vt === 'Member') {
        st.fit = 'ok';
        st.checks.push(['Member 타입 변수 m이 Member 객체를 가리키기', { v: '가리킬 수 있음', cls: 'good' }]);
        push('컴파일러가 Member m = new Member("민수"); 줄을 확인합니다. 오른쪽의 new Member("민수")는 Member 객체를 만드는 식이고, 왼쪽의 변수 m은 Member 타입입니다. 타입이 같으므로 통과합니다.', 'good');
      } else if (c.vt === 'Object') {
        st.fit = 'ok';
        st.checks.push(['Object 타입 변수 m이 Member 객체를 가리키기', { v: '가리킬 수 있음: 부모 클래스 타입', cls: 'good' }]);
        push('컴파일러가 Object m = new Member("민수"); 줄을 확인합니다. Member는 Object를 물려받은 자식 클래스이므로 Member 객체는 Object 타입이기도 합니다. 그래서 Object 타입 변수 m이 Member 객체를 가리킬 수 있고 통과합니다. 이제 컴파일러는 m으로 부르는 메서드를 Object 타입에서 찾습니다. toString()은 Object에 있으므로 부를 수 있습니다.', 'good');
      } else {
        st.fit = 'bad'; st.bad.mv = true; fail(self.errFit, DECL);
        st.checks.push(['String 타입 변수 m이 Member 객체를 가리키기', { v: '오류: Member는 String 타입이 아님', cls: 'bad' }]);
        push('컴파일러가 String m = new Member("민수"); 줄을 확인합니다. String은 자바가 주는 문자열 클래스이고, Member는 String을 물려받지 않았습니다. Member 객체는 String 타입이 아니므로 String 타입 변수가 가리킬 수 없어 오류가 납니다(javac: incompatible types: Member cannot be converted to String). Member와 String은 둘 다 Object를 물려받았지만, 부모가 같다고 서로의 타입이 되지는 않습니다.', 'bad');
      }
      // 4. 부르는 줄
      st.hot = 'call';
      st.checks.push(['m.toString()과 println(m) 줄', { v: '오류 아님', cls: st.errs ? '' : 'good' }]);
      push('컴파일러가 m.toString()과 System.out.println(m) 줄을 확인합니다. toString()은 ' + (c.vt === 'String' ? 'String에도 있는' : c.tos === 'ok' && c.vt === 'Member' ? 'Member에 다시 적은' : 'Object에서 물려받은') + ' 메서드라 부를 수 있고, println은 어떤 객체든 받습니다. 이 두 줄은 오류가 아닙니다.' + (st.errs ? ' 컴파일러가 알린 오류는 위의 ' + st.errs + '개입니다.' : ''), st.errs ? '' : 'good');
    } else {
      // 1. class MemberNotFoundException
      st.hot = 'own';
      if (c.ext) {
        st.checks.push(['MemberNotFoundException의 부모 클래스', { v: 'RuntimeException (자바가 줌)', cls: 'good' }]);
        push('컴파일러가 class MemberNotFoundException extends RuntimeException 줄을 읽습니다. MemberNotFoundException은 이 실습에서 예시로 만든 예외 클래스이고, extends 뒤의 RuntimeException은 자바가 주는 예외 클래스입니다. 자바가 RuntimeException은 Exception을, Exception은 Throwable을 물려받게 선언해 두었으므로, MemberNotFoundException은 위로 이어진 RuntimeException, Exception, Throwable, Object에 적힌 메서드를 모두 물려받습니다. 예외의 메시지를 돌려주는 getMessage()는 Throwable에 적혀 있습니다.', '');
      } else {
        st.checks.push(['MemberNotFoundException의 부모 클래스', { v: 'Object (extends를 적지 않음)', cls: '' }]);
        push('컴파일러가 class MemberNotFoundException { 줄을 읽습니다. extends가 없으므로 이 클래스의 부모는 Object입니다. 이름이 Exception으로 끝나도 RuntimeException과는 관계없는 보통 클래스이고, Throwable에 적힌 getMessage()도 물려받지 않습니다.', '');
      }
      // 2. 생성자
      st.hot = 'ctor';
      if (c.ctor === 'super' && c.ext) {
        st.checks.push(['생성자의 super(message)', { v: 'RuntimeException(String message)를 부름', cls: 'good' }]);
        push('컴파일러가 생성자 MemberNotFoundException(String message)를 읽습니다. 본문의 super(message)는 부모 클래스의 생성자 가운데 String 하나를 받는 것을 부르는 줄입니다. 부모 RuntimeException에는 자바가 적어 둔 생성자 RuntimeException(String message)가 있으므로 통과합니다. 그 생성자가 받은 메시지를 저장해 두고, 나중에 getMessage()가 그것을 돌려줍니다.', 'good');
      } else if (c.ctor === 'super') {
        st.bad.ctor = true; fail(self.errSuperObj, 'super(message);');
        st.checks.push(['생성자의 super(message)', { v: '오류: Object에는 그런 생성자가 없음', cls: 'bad' }]);
        push('컴파일러가 생성자 MemberNotFoundException(String message)를 읽습니다. 본문의 super(message)는 부모 클래스의 생성자 가운데 String 하나를 받는 것을 부르는데, extends가 없어 부모는 Object입니다. Object의 생성자는 인자 없는 Object() 하나뿐이라 오류가 납니다(javac: constructor Object in class Object cannot be applied to given types).', 'bad');
      } else {
        st.checks.push(['MemberNotFoundException의 생성자', { v: '컴파일러가 넣은 인자 없는 생성자 하나', cls: '' }]);
        push('MemberNotFoundException에는 생성자를 적지 않았습니다. 생성자를 하나도 적지 않은 클래스에는 컴파일러가 인자 없는 생성자 MemberNotFoundException() 하나를 넣습니다(기본 생성자). ' + (c.ext ? '부모 RuntimeException에 메시지를 받는 생성자 RuntimeException(String message)가 있어도, 생성자는 물려받지 않습니다. 메서드와 다른 점입니다.' : '생성자는 부모에게서 물려받지 않습니다.'), '');
      }
      // 3. throw
      st.hot = 'tw';
      if (c.ctor === 'none') {
        st.bad.tw = true; fail(self.errCtor, THROW);
        st.checks.push(['throw new MemberNotFoundException("…")', { v: '오류: 문자열을 받는 생성자가 없음', cls: 'bad' }]);
        push('컴파일러가 throw new MemberNotFoundException("회원이 없습니다: 민수"); 줄을 확인합니다. 문자열 하나를 받는 MemberNotFoundException 생성자를 찾는데, 있는 것은 인자 없는 생성자뿐이어서 오류가 납니다(javac: constructor MemberNotFoundException in class MemberNotFoundException cannot be applied to given types).' + (c.ext ? ' getMessage() 같은 메서드는 물려받지만 생성자는 물려받지 않는다는 것이 여기서 드러납니다. 메시지를 넘기려면 생성자를 적고 super(message)로 RuntimeException의 생성자를 불러야 합니다.' : ''), 'bad');
      } else if (c.ext) {
        st.checks.push(['throw new MemberNotFoundException("…")', { v: '통과: Throwable 타입', cls: 'good' }]);
        push('컴파일러가 throw new MemberNotFoundException("회원이 없습니다: 민수"); 줄을 확인합니다. throw로는 Throwable 타입의 객체만 던질 수 있습니다. MemberNotFoundException은 RuntimeException을 거쳐 Throwable을 물려받았으므로 Throwable 타입이기도 해서 통과합니다.', 'good');
      } else {
        st.bad.tw = true; fail(self.errThrow, THROW);
        st.checks.push(['throw new MemberNotFoundException("…")', { v: '오류: Throwable 타입이 아님', cls: 'bad' }]);
        push('컴파일러가 throw new MemberNotFoundException("회원이 없습니다: 민수"); 줄을 확인합니다. throw로는 Throwable 타입의 객체만 던질 수 있는데, MemberNotFoundException은 Throwable을 물려받지 않아 Throwable 타입이 아니므로 오류가 납니다(javac: incompatible types: MemberNotFoundException cannot be converted to Throwable).', 'bad');
      }
      // 4. catch
      st.hot = 'ca';
      if (c.ct === 'rt') {
        st.checks.push(['catch (RuntimeException e)', { v: '통과', cls: 'good' }]);
        push('컴파일러가 catch (RuntimeException e)와 e.getMessage()를 확인합니다. catch에 적는 타입은 Throwable이거나 그 자식이어야 하는데, 자바가 주는 RuntimeException은 Throwable의 자식이므로 통과합니다. e는 RuntimeException 타입 변수이고, getMessage()는 RuntimeException이 Throwable에서 물려받은 메서드라 부를 수 있습니다.' + (c.ext ? ' MemberNotFoundException은 RuntimeException의 자식이므로, 던져진 MemberNotFoundException 객체를 이 부모 타입 변수 e가 받을 수 있습니다.' : ' 이 두 줄은 오류가 아닙니다.'), 'good');
      } else if (c.ext) {
        st.checks.push(['catch (MemberNotFoundException e)', { v: '통과', cls: 'good' }]);
        push('컴파일러가 catch (MemberNotFoundException e)와 e.getMessage()를 확인합니다. catch에 적는 타입은 Throwable이거나 그 자식이어야 하는데, MemberNotFoundException은 Throwable의 자식이므로 통과합니다. getMessage()는 MemberNotFoundException에 적지 않았지만 Throwable에서 물려받은 메서드라 부를 수 있습니다.', 'good');
      } else {
        st.bad.ca = true; fail(self.errCatch, CATCH); fail(self.errMsg, MSG);
        st.checks.push(['catch (MemberNotFoundException e)', { v: '오류: Throwable 타입이 아님', cls: 'bad' }]);
        st.checks.push(['e.getMessage()', { v: '오류: getMessage가 없음', cls: 'bad' }]);
        push('컴파일러가 catch (MemberNotFoundException e)를 확인합니다. catch에 적는 타입은 Throwable이거나 그 자식이어야 하는데, MemberNotFoundException은 그렇지 않아 오류가 납니다(javac: incompatible types: MemberNotFoundException cannot be converted to Throwable). 다음 줄의 e.getMessage()도 오류입니다. MemberNotFoundException에도, 그 부모 Object에도 getMessage()가 없기 때문입니다(javac: cannot find symbol).', 'bad');
      }
    }

    // 컴파일 결과
    st.hot = '';
    var ok = st.errs === 0;
    if (!ok) {
      st.compile = 'err';
      st.checks.push(['컴파일', { v: '오류 ' + st.errs + '개', cls: 'bad' }]);
      push('컴파일에 실패합니다. 컴파일러가 알린 오류는 ' + st.errs + '개이고, 첫 번째 오류는 "' + st.errText + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없습니다.', 'bad');
    } else {
      st.compile = 'ok';
      st.checks.push(['컴파일', { v: '성공', cls: 'good' }]);
      push('컴파일이 성공해 Main 클래스 파일이 만들어집니다.', 'good');
    }

    // 실행
    if (ok && c.scene === 'obj') {
      var line = c.tos === 'ok' ? 'Member(민수)' : self.hashOut;
      st.hot = 'obj'; st.obj = true;
      push('java Main으로 실행합니다. new Member("민수")가 Member 객체를 만들고, 변수 m이 그 객체를 가리킵니다.', '');
      st.hot = 'run1'; st.ran = c.tos === 'ok' ? 'mb' : 'ob'; st.out.push(line); out.push(line);
      st.checks.push(['m.toString()으로 실행된 것', { v: c.tos === 'ok' ? 'Member에 다시 적은 toString()' : 'Object에 적힌 toString()', cls: 'good' }]);
      if (c.tos === 'ok') push('m.toString()이 실행됩니다. 실행할 toString()은 m이 가리키는 객체의 클래스 Member에서 먼저 찾습니다. Member에 다시 적은 toString()이 있으므로 그것이 실행되어 Member(민수)를 돌려주고, 그 글자가 출력됩니다. Object에 적힌 toString()은 실행되지 않습니다.' + (c.vt === 'Object' ? ' 변수 m의 타입이 Object여도 마찬가지입니다. 컴파일러는 변수의 타입(Object)을 보고 toString()을 부를 수 있는지만 확인했고, 실제로 어느 toString()이 실행될지는 실행할 때 객체의 클래스(Member)를 보고 정해집니다.' : ''), 'good');
      else push('m.toString()이 실행됩니다. 실행할 toString()은 m이 가리키는 객체의 클래스 Member에서 먼저 찾습니다. Member에는 ' + (c.tos === 'typo_noann' ? '이름이 다른 tostring만 있고 toString은 없으므로' : 'toString()이 없으므로') + ' 부모 Object에 적힌 toString()이 실행되어 ' + line + '을 돌려주고, 그 글자가 출력됩니다. 앞의 Member는 클래스 이름이고, @ 뒤의 279f2327은 이 객체의 해시 코드를 16진수로 적은 것입니다. 이 값은 이 실습의 환경에서 실행했을 때 나온 것입니다. 자바는 해시 코드가 실행마다 같다고 정해 두지 않았으므로 다른 값이 나올 수 있습니다.', 'good');
      st.hot = 'run2'; st.out.push(line); out.push(line);
      push('System.out.println(m) 줄이 실행됩니다. println은 자바가 주는 메서드로, 객체를 받으면 String.valueOf(m)을 거쳐 그 객체의 toString()을 불러 돌려받은 글자를 출력합니다. 그래서 m.toString()을 적은 앞 줄과 같은 글자(' + line + ')가 한 번 더 출력됩니다. 객체를 println으로 찍었을 때 무엇이 나오는지는 그 클래스의 toString()이 정합니다.', 'good');
    } else if (ok) {
      st.hot = 'tw'; st.obj = true;
      push('java Main으로 실행합니다. new MemberNotFoundException("회원이 없습니다: 민수")가 예외 객체를 만듭니다. 생성자는 받은 글자를 super(message)로 RuntimeException의 생성자에 넘기고, 그 글자가 이 예외 객체의 메시지가 됩니다. throw가 그 객체를 던지는 순간 try 안의 실행이 멈춥니다.', '');
      st.hot = 'ca'; st.caught = true; st.out.push('잡음: 회원이 없습니다: 민수'); out.push('잡음: 회원이 없습니다: 민수');
      st.checks.push(['던진 예외를 받은 곳', { v: 'catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e)', cls: 'good' }]);
      push('던져진 것은 MemberNotFoundException 객체이고 catch가 받는 타입' + (c.ct === 'own' ? '과 같으므로' : '(RuntimeException)의 자식이므로') + ' 실행이 catch로 옮겨 갑니다.' + (c.ct === 'rt' ? ' 변수 e의 타입은 RuntimeException이지만 e가 가리키는 것은 MemberNotFoundException 객체입니다.' : '') + ' e.getMessage()는 Throwable에 적힌 getMessage()가 실행되어 저장된 메시지를 돌려주고, 잡음: 회원이 없습니다: 민수가 출력됩니다.', 'good');
      st.hot = 'end'; st.out.push('끝'); out.push('끝');
      push('try-catch 다음 줄이 실행되어 끝이 출력됩니다. 던져진 예외를 catch가 받았으므로 프로그램은 멈추지 않고 이어졌습니다.', 'good');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (c.scene === 'obj') {
      if (c.vt === 'String') {
        sum.push('Member는 String을 물려받지 않았으므로 Member 객체는 String 타입이 아니고, String 타입 변수 m이 가리킬 수 없어 컴파일에 실패했습니다.' + (c.tos === 'typo' ? ' 이 설정에서는 tostring()에 붙은 @Override도 오류여서 오류가 2개였습니다.' : ''));
        sum.push('변수가 객체를 가리킬 수 있는 것은 변수의 타입이 그 객체의 클래스이거나 그 클래스가 물려받은 부모 클래스일 때입니다. 부모 Object 타입 변수는 Member 객체를 가리킬 수 있었지만, 관계없는 String은 그럴 수 없습니다.');
      } else if (c.tos === 'none') {
        sum.push('Member는 extends를 적지 않았지만 자바의 Object를 물려받아서, Member에 적지 않은 toString()을 부를 수 있었습니다. 실행된 것은 Object에 적힌 toString()이고, 클래스 이름과 해시 코드를 이은 ' + self.hashOut + '이 출력됐습니다.' + (c.vt === 'Object' ? ' 변수 m의 타입을 부모 클래스 Object로 적어도 같은 Member 객체를 가리켰고 결과도 같았습니다.' : ''));
        sum.push('자바의 모든 클래스는 이렇게 Object를 물려받습니다. 상속은 extends를 직접 적기 전부터 이미 쓰고 있던 것입니다. println(m)도 그 toString()을 불러 같은 글자를 출력했습니다.');
      } else if (c.tos === 'ok') {
        sum.push('Member에 toString()을 같은 모양으로 다시 적자(재정의), m.toString()과 println(m)이 모두 Member(민수)를 출력했습니다. Object에 적힌 toString()은 실행되지 않았습니다.' + (c.vt === 'Object' ? ' 변수 m의 타입이 부모 클래스 Object여도, 실행된 것은 객체의 클래스 Member에 다시 적은 toString()이었습니다.' : ''));
        sum.push(c.vt === 'Object' ? '컴파일러는 변수의 타입을 보고 부를 수 있는지만 확인하고, 실행할 때는 객체의 클래스에서부터 메서드를 찾습니다. 그래서 부모 타입 변수로 다뤄도 자식이 다시 적은 메서드가 실행됩니다.' : '물려받은 메서드는 그대로 쓸 수도 있고, 이렇게 자식 클래스에서 다시 적어 바꿀 수도 있습니다. 로그나 디버거에 객체가 읽기 좋게 찍히도록 toString()을 재정의하는 일이 흔합니다.');
      } else if (c.tos === 'typo') {
        sum.push('tostring은 부모 Object에 없는 메서드라 재정의가 아닌데 @Override를 붙였으므로, 컴파일러가 오류로 알려 주어 컴파일에 실패했습니다.');
        sum.push('@Override는 "부모의 메서드를 다시 적는다"는 뜻을 컴파일러에게 확인받는 표시입니다. 덕분에 이름을 잘못 적은 실수를 실행하기 전에 알 수 있습니다.');
      } else {
        sum.push('@Override가 없으면 이름을 잘못 적은 tostring()은 오류 없이 새 메서드로 더해집니다. 그래서 toString()은 여전히 Object의 것이 실행되어 ' + self.hashOut + '이 출력됐습니다.');
        sum.push('이름이 비슷해도 같은 이름, 같은 매개변수가 아니면 재정의가 아닙니다. @Override를 붙인 앞의 경우와 달리 컴파일러가 알려 주지 않아, 실행해 보기 전까지 실수를 모릅니다.');
      }
    } else if (ok) {
      if (c.ct === 'own') {
        sum.push('extends RuntimeException으로 만든 MemberNotFoundException은 throw로 던지고 catch로 받을 수 있었습니다. MemberNotFoundException에 적지 않은 getMessage()도 물려받아서, 생성자로 넘긴 메시지를 돌려받아 출력했습니다.');
        sum.push('예외 클래스를 처음부터 만들지 않고, 자바가 주는 RuntimeException을 물려받아 이름과 생성자만 적은 것입니다. 던지고 받는 데 필요한 것과 getMessage()는 모두 자바가 적어 둔 부모 쪽에 있습니다.');
      } else {
        sum.push('catch (RuntimeException e)로도 MemberNotFoundException을 받았습니다. MemberNotFoundException이 RuntimeException의 자식이어서, 부모 타입 변수 e가 그 객체를 가리킬 수 있기 때문입니다.');
        sum.push('부모 타입으로 받으면 그 자식 예외들을 한 catch로 함께 받을 수 있습니다. e.getMessage()로 부른 것은 Throwable에 적힌 getMessage()이고, 메시지는 MemberNotFoundException 객체가 저장해 둔 것이었습니다.');
      }
    } else if (c.ctor === 'none') {
      sum.push('생성자를 적지 않으면 MemberNotFoundException에는 컴파일러가 넣은 인자 없는 생성자만 있어서, new MemberNotFoundException("…")처럼 메시지를 넘기는 줄에서 컴파일에 실패했습니다.' + (c.ext ? ' 부모 RuntimeException에 메시지를 받는 생성자가 있어도 쓸 수 없었습니다.' : ''));
      sum.push('메서드는 물려받지만 생성자는 물려받지 않습니다. 그래서 예외 클래스를 만들 때는 MemberNotFoundException(String message) { super(message); }처럼 생성자를 적어 부모의 생성자에 메시지를 넘깁니다.');
    } else {
      sum.push('extends RuntimeException을 지우면 MemberNotFoundException은 부모가 Object인 보통 클래스가 되어, super(message)와 throw' + (c.ct === 'own' ? ', catch, getMessage()' : '') + ' 줄에서 오류 ' + st.errs + '개가 나고 컴파일에 실패했습니다.');
      sum.push('던지고 받을 수 있게 해 주는 것은 이름이 아니라 extends로 이어진 Throwable입니다. 이름이 Exception으로 끝나도 extends가 없으면 예외 클래스가 아닙니다.');
    }
    var row = ok ? ['성공', '없음', out.join(' / ')] : ['오류', st.errText, '실행할 수 없음'];
    return { events: ev, summary: sum, nerr: st.errs, errAt: errAt, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    H.table(v, ['컴파일러가 확인한 것', '결과'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '컴파일과 실행');
    if (s.out.length) H.table(v, ['출력'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), '실행했을 때 출력');
    H.counters(v, [[s.errs, '컴파일러가 알린 오류']]);
  },
  // 그림: Object 장면은 왼쪽에 Object와 그것을 물려받은 Member, 오른쪽에 변수 m과 Member 객체. 실행된 toString()이 적힌 클래스로 가는 화살표.
  //       예외 장면은 왼쪽에 Throwable, Exception, RuntimeException, MemberNotFoundException으로 이어지는 상속, 오른쪽에 throw와 catch.
  //       맨 아래에 컴파일 결과와 출력.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var hot = s ? s.hot : '', bad = s ? s.bad : {}, err = s && s.compile === 'err';
    function cls(id) { return bad[id] ? 'bad' : hot === id ? 'hot now' : 'plain'; }
    if (c.scene === 'obj') {
      P.size(680, 360);
      P.box('ob', 14, 14, 270, 62, { cls: s && s.ran === 'ob' ? 'good' : 'plain', title: 'Object (자바가 주는 클래스)', sub: 'toString(), equals() 등을 적어 둠' });
      var msub = { none: 'name, 생성자', ok: 'name, 생성자, toString() 다시 적음', typo: 'name, 생성자, @Override tostring()', typo_noann: 'name, 생성자, tostring()' }[c.tos];
      P.box('mb', 14, 150, 270, 62, { cls: bad.ts ? 'bad' : hot === 'mb' || hot === 'ts' ? 'hot now' : s && s.ran === 'mb' ? 'good' : 'plain', title: 'Member (예시로 만든 클래스)', sub: msub });
      P.arrow('ex', 'mb:t', 'ob:b', { cls: hot === 'mb' ? 'hot' : 'mut', label: '물려받음 (extends 생략)' });
      P.box('mv', 400, 14, 266, 62, { cls: bad.mv ? 'bad' : hot === 'mv' || hot === 'call' ? 'hot now' : 'plain', title: c.vt + ' m', sub: c.vt + ' 타입 변수' });
      P.box('mo', 400, 150, 266, 62, { cls: s && s.obj ? (hot === 'obj' ? 'good now' : 'good') : 'ghost', title: 'Member 객체', sub: s && s.obj ? 'name = "민수"' : err ? '만들어지지 않음' : '아직 없음' });
      if (s && s.obj) P.arrow('ref', 'mv:b', 'mo:t', { cls: 'good', label: '가리킴' });
      else if (s && s.fit === 'bad') P.arrow('ref', 'mv:b', 'mo:t', { cls: 'bad', label: '가리킬 수 없음' });
      if (s && s.ran) P.arrow('run', 'mo:l', s.ran === 'mb' ? 'mb:r' : 'ob:r', { cls: 'good', label: 'toString() 실행' });
      P.box('r1', 14, 248, 652, 44, { cls: s && s.compile === 'ok' ? 'good' : err ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류 ' + s.errs + '개') : '', sub: s && s.errText ? s.errText : '' });
      P.box('r2', 14, 304, 652, 44, { cls: s && s.out.length ? 'good' : err ? 'bad' : 'ghost', title: '실행했을 때 출력', sub: s && s.out.length ? s.out.join(' / ') : err ? '실행할 수 없음' : '' });
    } else {
      P.size(680, 400);
      P.box('th', 14, 14, 300, 44, { cls: s && s.caught ? 'good' : 'plain', title: 'Throwable (자바가 줌)', sub: 'getMessage()가 적혀 있음' });
      P.box('ex', 14, 84, 300, 44, { cls: 'plain', title: 'Exception (자바가 줌)' });
      P.box('rt', 14, 154, 300, 44, { cls: hot === 'ctor' && c.ext && c.ctor === 'super' ? 'hot now' : 'plain', title: 'RuntimeException (자바가 줌)', sub: '생성자 RuntimeException(String message)' });
      P.box('own', 14, 224, 300, 44, { cls: bad.ctor ? 'bad' : hot === 'own' || hot === 'ctor' ? 'hot now' : 'plain', title: 'MemberNotFoundException (예시)', sub: c.ext ? (c.ctor === 'super' ? '생성자에서 super(message)' : '생성자를 적지 않음') : 'extends 없음: 부모는 Object' });
      P.arrow('e1', 'ex:t', 'th:b', { cls: 'mut' });
      P.arrow('e2', 'rt:t', 'ex:b', { cls: 'mut' });
      if (c.ext) P.arrow('e3', 'own:t', 'rt:b', { cls: hot === 'own' ? 'hot' : 'mut' });
      P.box('tw', 380, 14, 286, 56, { cls: bad.tw ? 'bad' : hot === 'tw' ? (s.obj ? 'good now' : 'hot now') : s && s.obj ? 'good' : 'plain', title: 'throw', sub: 'new MemberNotFoundException("…")' });
      P.box('ca', 380, 154, 286, 56, { cls: bad.ca ? 'bad' : hot === 'ca' ? (s.caught ? 'good now' : 'hot now') : s && s.caught ? 'good' : 'plain', title: 'catch (' + (c.ct === 'own' ? 'MemberNotFoundException' : 'RuntimeException') + ' e)', sub: s && s.caught ? 'e.getMessage() → 저장된 메시지' : 'e.getMessage()를 부름' });
      if (s && s.caught) P.arrow('go', 'tw:b', 'ca:t', { cls: 'good', label: '던진 예외를 받음' });
      P.box('r1', 14, 290, 652, 44, { cls: s && s.compile === 'ok' ? 'good' : err ? 'bad' : 'ghost', title: '컴파일', right: s && s.compile ? (s.compile === 'ok' ? '성공' : '오류 ' + s.errs + '개') : '', sub: s && s.errText ? s.errText : '' });
      P.box('r2', 14, 344, 652, 44, { cls: s && s.out.length ? 'good' : err ? 'bad' : 'ghost', title: '실행했을 때 출력', sub: s && s.out.length ? s.out.join(' / ') : err ? '실행할 수 없음' : '' });
    }
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 스무 가지 조합(Object 장면 12가지, 예외 장면 8가지)을 모두, 화면의 코드와 같은 글(code 함수가 만든 소스를 그대로 파일로 쓴 것)을 javax.tools로 컴파일하고, 컴파일에 성공한 것은 java -cp로 따로 실행해 표준 출력, 표준 오류, 종료 코드를 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 첫 번째 오류의 진단 코드와 영어 메시지(화면의 오류 설명은 이것을 한국어로 옮긴 것입니다), 오류의 개수와 오류가 난 줄, Main 클래스 파일이 만들어졌는지, 실행했을 때의 출력입니다. 오류의 개수와 어느 줄에서 나는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 예를 들어 생성자를 적지 않았을 때는 extends가 없어도 throw 줄의 오류가 생성자 오류 하나로만 나왔습니다. 단계 문장이 기대는 사실도 리플렉션으로 확인했습니다. extends를 적지 않은 Member의 부모가 java.lang.Object이고 toString, equals, hashCode, getClass가 Object에 적힌 것이라는 것, toString을 다시 적으면 Member의 것이 되고 tostring으로 잘못 적으면 toString은 Object의 것 그대로라는 것, MemberNotFoundException이 RuntimeException, Exception, Throwable, Object로 이어지고 getMessage가 Throwable에 적혀 있다는 것, RuntimeException에 RuntimeException(String) 생성자가 있다는 것, 생성자를 적지 않은 예외 클래스에는 인자 없는 생성자 하나만 생긴다는 것입니다. Member@279f2327의 279f2327은 이 환경에서 같은 프로그램을 네 번 실행해 네 번 모두 같게 나온 값입니다. 자바의 Object.hashCode 설명은 이 값이 실행마다 같을 필요가 없다고 하므로, 다른 환경에서는 다른 값이 나올 수 있습니다. 자바 API의 동작은 이 JDK에 딸린 소스(lib/src.zip)를 열어 확인했습니다. Object.toString의 본문이 getClass().getName() + "@" + Integer.toHexString(hashCode())라는 것, PrintStream.println(Object)가 String.valueOf로 글자를 얻고 String.valueOf가 null이 아니면 toString()을 부른다는 것, RuntimeException(String message)가 받은 메시지를 getMessage()로 다시 꺼낼 수 있게 저장한다는 것입니다. 명세는 Java Language Specification(Java SE 21)을 직접 열어 확인했습니다. extends 절이 직접 부모 클래스를 정하고, extends를 적지 않은 보통 클래스의 직접 부모는 Object라는 것은 8.1.4절, 클래스가 직접 부모 클래스의 메서드를 물려받는다는 것은 8.2절과 8.4.8절, 생성자는 멤버가 아니어서 물려받지 않는다는 것은 8.2절과 8.8절, 생성자를 하나도 적지 않으면 인자 없는 기본 생성자가 생긴다는 것은 8.8.9절, @Override를 붙인 메서드가 부모의 메서드를 재정의하지 않으면 컴파일 오류라는 것은 9.6.4.4절, throw의 식은 Throwable에 대입할 수 있는 타입이어야 한다는 것은 14.18절, catch에 적는 타입은 Throwable이나 그 자식이어야 한다는 것은 14.20절, 던져진 객체의 실제 클래스가 catch의 타입에 대입될 수 있으면 그 catch가 고른다는 것은 14.20.1절, 자식 타입의 값을 부모 타입 변수에 대입할 수 있다는 것은 5.1.5절과 5.2절, 실행할 때 메서드를 객체의 실제 클래스에서부터 위로 찾는다는 것은 15.12.4.4절을 따랐습니다. 화면의 코드는 클래스를 한 파일에 둔 모양이고 접근 제어자는 줄였습니다. 예외 클래스를 만들 때 쓰는 생성자의 super(message)는 메시지를 넘기는 데까지만 다루었고, 부모 생성자가 실행되는 순서와 super의 자세한 규칙은 "세부 동작 실습: 상속과 오버라이딩"에서 다룹니다. equals와 hashCode를 함께 재정의하는 규칙, 필드의 상속, private 멤버가 물려지지 않는 것, extends Exception으로 만드는 체크 예외, 서블릿의 extends HttpServlet은 이 실습에서 실행하지 않았습니다. HttpServlet을 물려받는 서블릿은 기초개념 "서블릿"에서 톰캣에 실제로 배치해 봅니다.',
});
