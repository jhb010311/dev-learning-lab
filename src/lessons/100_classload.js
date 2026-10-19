Lab.register({
  id: 'classload', nav: '클래스 로딩과 초기화', cat: 'JVM', mode: 'step',
  title: '클래스의 static 블록은 언제 실행되나',
  intro: '클래스에 적어 둔 static 초기화 블록은 프로그램이 시작될 때 실행되는 것이 아니라, 그 클래스가 처음으로 "제대로" 쓰일 때 한 번 실행됩니다. 그런데 클래스 이름이 코드에 나온다고 해서 모두 그런 사용은 아닙니다.',
  terms: ['클래스 로더', '클래스 초기화', 'static 초기화 블록', '컴파일 시점 상수', 'static'],
  controls: [
    { id: 'cls', label: '사용하는 클래스', type: 'select', value: 'parent', options: [['parent', 'Parent (부모 클래스)'], ['child', 'Child (Parent를 상속한 자식 클래스)']] },
    { id: 'use', label: '그 클래스로 하는 일', type: 'select', value: 'const', options: [['new', 'new로 객체 만들기'], ['smethod', 'static 메서드 호출'], ['sfield', 'static 필드 읽기 (static int count)'], ['const', '상수 읽기 (static final int MAX = 10)'], ['finalrt', 'static final이지만 실행해야 값이 정해지는 필드 읽기'], ['array', '배열 만들기 (new 클래스[3])'], ['classlit', '클래스이름.class 쓰기']] },
    { id: 'decl', label: '그 static 멤버가 선언된 곳', type: 'select', value: 'own', options: [['own', 'Child 안에 선언'], ['parent', 'Parent 안에 선언 (Child가 물려받음)']], show: function (c) { return c.cls === 'child' && ['smethod', 'sfield', 'const', 'finalrt'].indexOf(c.use) >= 0; }, hint: 'Child.이름으로 쓰더라도 선언은 부모에 있을 수 있습니다.' },
  ],
  // 선언 위치는 Child의 static 멤버를 쓸 때만 뜻이 있다
  fix: function (c) { return c.decl === 'parent' && !(c.cls === 'child' && ['smethod', 'sfield', 'const', 'finalrt'].indexOf(c.use) >= 0) ? { decl: 'own' } : null; },
  presets: [
    { t: '처음 설정으로', q: 'Parent 클래스의 상수 MAX를 읽으면 static 블록과 클래스 로딩은 어떻게 되나', d: '상수 읽기. static 블록이 실행되지 않고, 클래스를 읽어 들이지도 않습니다.', v: { cls: 'parent', use: 'const', decl: 'own' } },
    { t: 'new로 객체 만들기', q: '상수를 읽는 대신 new로 객체를 만들면', d: '처음 만들 때 한 번만 static 블록이 실행됩니다.', v: { cls: 'parent', use: 'new', decl: 'own' } },
    { t: 'static final인데 상수가 아닌 필드', q: 'static final이지만 실행해야 값이 정해지는 필드를 읽으면', d: '실행해야 값이 정해지므로 초기화가 일어납니다.', v: { cls: 'parent', use: 'finalrt', decl: 'own' } },
    { t: '배열만 만들면', q: 'Parent 배열을 new로 만들면', d: '클래스를 읽어 들이기만 하고 초기화하지 않습니다.', v: { cls: 'parent', use: 'array', decl: 'own' } },
    { t: '자식 클래스의 객체 만들기', q: '사용하는 클래스를 Child로 바꾸고 new로 객체를 만들면', d: '부모가 먼저, 그다음 자식이 초기화됩니다.', v: { cls: 'child', use: 'new', decl: 'own' } },
    { t: '부모의 static 필드를 자식 이름으로', q: '사용하는 클래스를 Child로 바꾸고 Parent 안에 선언된 static 필드 count를 Child 이름으로 읽으면', d: 'Child.count라고 썼지만 Child는 초기화되지 않습니다.', v: { cls: 'child', use: 'sfield', decl: 'parent' } },
    { t: '클래스이름.class 쓰기', q: '사용하는 클래스를 Child로 바꾸고 Child.class를 쓰면', d: '클래스 정보만 가리킬 뿐 초기화하지 않습니다.', v: { cls: 'child', use: 'classlit', decl: 'own' } },
  ],
  // 이 설정에서 쓰는 이름과, 무엇이 읽히고 무엇이 초기화되는지
  facts: function (c) {
    var member = ['smethod', 'sfield', 'const', 'finalrt'].indexOf(c.use) >= 0, T = c.cls === 'parent' ? 'Parent' : 'Child';
    var owner = member && (c.cls === 'parent' || c.decl === 'parent') ? 'Parent' : T;          // 멤버를 실제로 선언한 클래스
    var active = ['new', 'smethod', 'sfield', 'finalrt'].indexOf(c.use) >= 0;                  // 초기화를 일으키는 사용인가
    var target = c.use === 'new' ? T : owner;                                                  // 초기화할 클래스
    var st = { new: [T + ' a = new ' + T + '();', T + ' b = new ' + T + '();'], smethod: [T + '.hello();', T + '.hello();'], sfield: ['int a = ' + T + '.count;', 'int b = ' + T + '.count;'], const: ['int a = ' + T + '.MAX;', 'int b = ' + T + '.MAX;'], finalrt: ['int a = ' + T + '.SIZE;', 'int b = ' + T + '.SIZE;'], array: [T + '[] a = new ' + T + '[3];', T + '[] b = new ' + T + '[3];'], classlit: ['Class<?> a = ' + T + '.class;', 'Class<?> b = ' + T + '.class;'] }[c.use];
    return { member: member, T: T, owner: owner, active: active, stmt: st, loads: c.use === 'const' ? [] : T === 'Child' ? ['Parent', 'Child'] : ['Parent'], inits: !active ? [] : target === 'Child' ? ['Parent', 'Child'] : ['Parent'] };
  },
  code: function (c) {
    var f = this.facts(c);
    var member = { smethod: '    static void hello() { }\n', sfield: '    static int count = 0;\n', const: '    static final int MAX = 10;                        // 컴파일할 때 값이 정해지는 상수\n', finalrt: '    static final int SIZE = Integer.parseInt("10");   // 실행해 봐야 값이 정해진다\n' }[c.use] || '';
    var note = f.member && f.owner !== f.T ? '                // ' + { smethod: 'hello', sfield: 'count', const: 'MAX', finalrt: 'SIZE' }[c.use] + '의 선언은 Parent에 있다' : '';
    return 'class Parent {\n' + (f.owner === 'Parent' ? member : '') + '    static { System.out.println("Parent 초기화"); }    // static 초기화 블록\n}\n\nclass Child extends Parent {\n' + (f.member && f.owner === 'Child' ? member : '') + '    static { System.out.println("Child 초기화"); }\n}\n\n'
      + 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("main 시작");\n        ' + f.stmt[0] + note + '\n        System.out.println("첫 번째 사용 끝");\n        ' + f.stmt[1] + '\n        System.out.println("두 번째 사용 끝");\n    }\n}';
  },
  label: function (c) { var f = this.facts(c); return f.T + ' · ' + { new: 'new', smethod: 'static 메서드', sfield: 'static 필드', const: '상수', finalrt: '상수가 아닌 static final', array: '배열', classlit: '.class' }[c.use] + (f.member && c.cls === 'child' ? (f.owner === 'Parent' ? ' (Parent에 선언)' : ' (Child에 선언)') : ''); },
  columns: ['Parent의 static 블록', 'Child의 static 블록', '읽어 들인 클래스', '출력된 순서'],
  simulate: function (c) {
    var f = this.facts(c), T = f.T, U = c.use, ev = [], sum = [], seq = [];
    var st = { P: 'none', C: 'none', pn: 0, cn: 0, out: [], stmt: '', eff: '', to: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function print(x) { st.out.push(x); seq.push(x); }
    var mname = { smethod: 'hello()', sfield: 'count', const: 'MAX', finalrt: 'SIZE' }[U];
    print('main 시작'); st.stmt = 'println("main 시작");'; st.eff = '아직 두 클래스를 쓰지 않음';
    push('System.out.println("main 시작"): 프로그램이 시작됐습니다. Parent와 Child를 쓰는 코드를 아직 만나지 않았으므로, JVM은 두 클래스를 읽어 들이지도 않았고 static 블록도 실행하지 않았습니다.');
    st.stmt = f.stmt[0];
    if (U === 'const') {
      st.eff = '값 10을 바로 씀 (클래스를 찾지 않음)';
      push(f.stmt[0].slice(0, -1) + ': MAX는 컴파일할 때 값이 정해지는 상수입니다. 컴파일러가 이 줄을 int a = 10;과 같게 바꿔 놓았기 때문에, 실행할 때는 ' + f.owner + ' 클래스를 찾아갈 일이 없습니다. 클래스를 읽어 들이지 않고 static 블록도 실행되지 않습니다.', 'bad');
    } else {
      st.P = 'loaded'; seq.push('읽음 Parent'); if (T === 'Child') { st.C = 'loaded'; seq.push('읽음 Child'); }
      st.eff = T + ' 클래스를 읽어 들임'; st.to = T;
      push(f.stmt[0].slice(0, -1) + ': ' + T + '를 처음 쓰는 줄입니다. JVM이 ' + T + ' 클래스 파일을 찾아 읽어 들입니다(로딩).' + (T === 'Child' ? ' 자식 클래스는 부모 없이는 완성되지 않으므로 Parent도 함께 읽어 들입니다.' : '') + ' 아직 static 블록은 실행되지 않았습니다.');
      if (U === 'array') { st.eff = '초기화를 일으키지 않는 사용'; push('new ' + T + '[3]: ' + T + ' 객체를 가리킬 수 있는 칸 세 개짜리 배열을 만듭니다. 칸은 모두 null이고 ' + T + ' 객체는 하나도 만들어지지 않았습니다. 클래스를 읽어 들이기만 하고 초기화하지 않으므로 static 블록은 실행되지 않습니다.', 'bad'); }
      if (U === 'classlit') { st.eff = '초기화를 일으키지 않는 사용'; push(T + '.class: 클래스 정보를 담은 Class 객체를 가리킬 뿐이고, ' + T + '의 코드를 실행하거나 static 필드를 쓰는 것이 아닙니다. 클래스를 읽어 들이기만 하고 초기화하지 않으므로 static 블록은 실행되지 않습니다.', 'bad'); }
      if (f.active) {
        var why = { new: 'new로 객체를 만들려면 그 클래스의 초기화가 먼저 끝나 있어야 합니다.', smethod: 'static 메서드를 실행하려면 그 메서드를 선언한 클래스의 초기화가 먼저 끝나 있어야 합니다.', sfield: 'static 필드의 값을 읽으려면 그 필드를 선언한 클래스의 초기화가 먼저 끝나 있어야 합니다.', finalrt: 'SIZE는 static final이지만 Integer.parseInt("10")을 실행해 봐야 값이 정해집니다. 컴파일할 때 값을 알 수 없어 상수가 아니므로, 선언한 클래스를 초기화해야 값이 생깁니다.' }[U];
        if (f.member && f.owner !== T) { st.eff = '초기화할 클래스는 Parent'; st.to = 'Parent'; push(T + '.' + mname + ': 이름은 Child로 썼지만 ' + mname + '의 선언은 Parent에 있습니다. static 멤버를 쓸 때는 그것을 실제로 선언한 클래스만 초기화합니다. 그래서 초기화할 클래스는 Child가 아니라 Parent입니다.', 'bad'); }
        if (f.inits.length === 2) {
          st.P = 'init'; st.pn = 1; print('Parent 초기화'); st.eff = '부모 Parent를 먼저 초기화';
          push('Child를 초기화하기 전에: ' + why + ' 그리고 자식 클래스를 초기화하려면 부모 클래스가 먼저 초기화돼 있어야 합니다. Parent의 static 블록이 먼저 실행되어 "Parent 초기화"가 출력됩니다.', 'good');
          st.C = 'init'; st.cn = 1; print('Child 초기화'); st.eff = '이어서 Child를 초기화';
          push('Child의 초기화: 부모의 초기화가 끝났으므로 Child의 static 블록이 실행되어 "Child 초기화"가 출력됩니다.', 'good');
        } else {
          st.P = 'init'; st.pn = 1; print('Parent 초기화'); st.eff = 'Parent를 초기화';
          push('Parent의 초기화: ' + why + ' Parent의 static 블록이 실행되어 "Parent 초기화"가 출력됩니다.' + (T === 'Child' ? ' Child는 읽어 들이기만 했고 초기화되지 않았습니다.' : ''), 'good');
        }
      }
    }
    print('첫 번째 사용 끝'); st.stmt = 'println("첫 번째 사용 끝");'; st.eff = '첫 번째 사용이 끝남'; st.to = '';
    push('System.out.println("첫 번째 사용 끝"): 여기까지 static 블록은 Parent에서 ' + st.pn + '번, Child에서 ' + st.cn + '번 실행됐습니다.');
    st.stmt = f.stmt[1];
    if (f.inits.length) { st.eff = '이미 초기화됨 (다시 실행하지 않음)'; st.to = c.use === 'new' ? T : f.owner; push(f.stmt[1].slice(0, -1) + ': 같은 일을 한 번 더 합니다. 클래스의 초기화는 한 번뿐이고, ' + f.inits.join('와 ') + '는 이미 초기화돼 있습니다. static 블록은 다시 실행되지 않습니다.', 'good'); }
    else if (U === 'const') { st.eff = '값 10을 바로 씀'; push(f.stmt[1].slice(0, -1) + ': 이번에도 값 10을 바로 씁니다. 몇 번을 읽어도 클래스는 초기화되지 않습니다.'); }
    else { st.eff = '초기화를 일으키지 않는 사용'; st.to = T; push(f.stmt[1].slice(0, -1) + ': 이번에도 초기화를 일으키지 않습니다. 클래스는 이미 읽어 들였으므로 다시 읽지도 않습니다.'); }
    print('두 번째 사용 끝'); st.stmt = 'println("두 번째 사용 끝");'; st.eff = '끝'; st.to = '';
    push('System.out.println("두 번째 사용 끝"): 프로그램이 끝납니다. static 블록이 실행된 횟수는 Parent ' + st.pn + '번, Child ' + st.cn + '번입니다.');
    var word = function (n) { return n ? '1번 실행' : '실행 안 됨'; };
    if (U === 'const') sum.push('static final이고 값이 숫자나 문자열 리터럴처럼 컴파일할 때 정해지는 필드는 "컴파일 시점 상수"입니다. 컴파일러가 쓰는 쪽 코드에 값을 직접 넣어 두므로, 실행할 때 그 클래스는 쓰이지 않습니다. 그래서 상수만 바꾸고 그 클래스만 다시 컴파일하면, 쓰는 쪽에는 옛 값이 남습니다.');
    if (U === 'finalrt') sum.push('static final이라고 모두 상수는 아닙니다. 메서드를 호출해야 값이 나오는 필드는 실행 중에 값이 정해지므로, 읽으려면 클래스가 초기화돼야 합니다.');
    if (U === 'array' || U === 'classlit') sum.push('클래스를 읽어 들이는 것(로딩)과 초기화하는 것은 다른 단계입니다. 배열을 만들거나 .class를 쓰는 것은 클래스 정보만 필요한 일이라서, 읽어 들이기만 하고 static 블록은 실행하지 않습니다.');
    if (f.active && !(f.member && f.owner !== T)) sum.push('객체를 만들거나, static 메서드를 부르거나, 상수가 아닌 static 필드를 쓰는 것이 클래스를 초기화시키는 사용입니다. 처음 한 번만 초기화되고, 그 뒤로는 static 블록이 다시 실행되지 않습니다.');
    if (f.inits.length === 2) sum.push('자식 클래스를 초기화하면 부모 클래스가 먼저 초기화됩니다. 출력 순서가 항상 "Parent 초기화" 다음에 "Child 초기화"인 이유입니다.');
    if (f.member && f.owner !== T && f.active) sum.push('부모에 선언된 static 멤버를 자식 이름으로 쓰면 부모만 초기화됩니다. Child.' + mname + '라고 써도 Child의 static 블록은 실행되지 않습니다.');
    if (c.cls === 'parent' && f.active) sum.push('부모 클래스를 쓴다고 자식 클래스가 준비되지는 않습니다. Child는 읽어 들이지도 않았습니다.');
    return { events: ev, summary: sum, seq: seq, row: [word(st.pn), word(st.cn), f.loads.length ? f.loads.join(', ') : '없음', st.out.join(' → ')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    var word = { none: '아직 읽어 들이지 않음', loaded: '읽어 들임 (초기화 전)', init: '초기화됨' }, cl = { none: '', loaded: 'hot', init: 'good' };
    H.table(v, ['클래스', '상태', 'static 블록 실행'], [
      { cls: s.P === 'none' ? 'gone' : '', cells: ['Parent', { v: word[s.P], cls: cl[s.P] }, s.pn + '번'] },
      { cls: s.C === 'none' ? 'gone' : '', cells: ['Child', { v: word[s.C], cls: cl[s.C] }, s.cn + '번'] },
    ], 'JVM이 준비한 클래스');
  },
  // 그림: 왼쪽에 지금 실행한 main의 한 줄, 오른쪽에 JVM이 준비한 두 클래스의 상태(읽지 않음, 읽어 들임, 초기화됨), 아래에 출력된 줄.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { P: 'none', C: 'none', pn: 0, cn: 0, out: [], stmt: '', eff: '실행을 누르면 시작합니다', to: '' };
    var word = { none: '아직 읽어 들이지 않음', loaded: '읽어 들임, 초기화 전', init: '초기화됨' }, cl = { none: 'ghost', loaded: 'hot', init: 'good' };
    P.size(680, 280);
    P.region('rc', 16, 16, 290, 172, '지금 실행한 main의 줄');
    P.box('stmt', 30, 62, 262, 76, { cls: s.stmt ? 'wait' : 'ghost', title: s.stmt ? P.fit(s.stmt, 244, 13) : '(아직 시작 전)', sub: s.eff, mono: true });
    P.region('rj', 334, 16, 330, 172, 'JVM이 준비한 클래스');
    P.box('cP', 350, 48, 298, 50, { cls: cl[s.P] + (s.to === 'Parent' ? ' now' : ''), title: 'Parent', right: word[s.P], sub: 'static 블록 실행 ' + s.pn + '번' });
    P.box('cC', 350, 126, 298, 50, { cls: cl[s.C] + (s.to === 'Child' ? ' now' : ''), title: 'Child', right: word[s.C], sub: 'static 블록 실행 ' + s.cn + '번' });
    P.arrow('ext', 'cC:t', 'cP:b', { cls: 'mut', label: 'extends' });
    if (s.to) P.arrow('use', 'stmt:r', (s.to === 'Parent' ? 'cP' : 'cC') + ':l', { cls: s[s.to === 'Parent' ? 'P' : 'C'] === 'init' ? 'good' : 'hot', label: '사용' });
    P.text('ot', 16, 212, '출력된 줄 (왼쪽부터 순서대로)', { cls: 'mut' });
    ['main 시작', 'Parent 초기화', 'Child 초기화', '첫 번째 사용 끝', '두 번째 사용 끝'].forEach(function (x, i) {
      var k = s.out.indexOf(x);
      if (k >= 0) P.box('o_' + i, 16 + k * 131, 224, 124, 34, { cls: x.indexOf('초기화') >= 0 ? 'good' : 'plain', title: x, center: true });
    });
    P.note('굵은 테두리는 지금 실행한 줄이 쓰는 클래스입니다.');
  },
  assume: '열여덟 가지 조합마다 화면의 코드와 같은 소스를 검증 환경의 JDK 21에서 새로 컴파일해 실행하고, 출력된 줄의 순서와 읽어 들인 클래스를 대조했습니다. 클래스를 읽어 들인 시점은 -Xlog:class+load 옵션으로 얻은 JVM의 기록과 대조했습니다. 초기화가 언제 일어나는지는 자바 언어 명세가 정해 둔 것이라 어느 JVM에서나 같습니다. 반면 클래스를 언제 읽어 들이는지는 JVM 구현에 맡겨져 있어서, "처음 쓰일 때 읽는다"와 "상수만 읽으면 읽지도 않는다"는 검증 환경의 JVM(HotSpot)에서 확인한 동작입니다. 상수 읽기가 값 10으로 바뀌어 컴파일된다는 것은 javap로 바이트코드를 보고 확인했습니다. 읽어 들인 뒤 초기화 전에 거치는 검증, 준비 같은 세부 단계와, Class.forName이나 인터페이스의 초기화 규칙은 다루지 않았습니다.',
});
