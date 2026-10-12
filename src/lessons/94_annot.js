Lab.register({
  id: 'annot', nav: '애너테이션', cat: '자바 언어', mode: 'step',
  title: '@를 붙이기만 하면 정말 무슨 일이 일어나나',
  intro: '애너테이션(@Override, @Timed처럼 @로 시작하는 표시)은 코드에 붙여 두는 꼬리표입니다. 꼬리표 자체는 아무 일도 하지 않습니다. 그것을 읽는 쪽, 곧 컴파일러나 실행 중에 리플렉션으로 읽는 프레임워크가 있어야 의미가 생깁니다. 그리고 실행 중에 읽으려면 꼬리표가 실행 중까지 남아 있어야 합니다.',
  terms: ['애노테이션', '리플렉션', '@Retention과 @Target', '@Override', '오버라이딩'],
  controls: [
    { id: 'topic', label: '무엇을 볼까', type: 'select', value: 'custom', options: [['custom', '직접 만든 @Timed를 실행 중에 읽기 (리플렉션)'], ['override', '@Override를 컴파일러가 읽기']] },
    { id: 'ret', label: '@Timed의 @Retention (표시를 어디까지 남길지)', type: 'select', value: 'none', options: [['none', '적지 않음'], ['SOURCE', 'SOURCE: 소스 코드까지만'], ['CLASS', 'CLASS: class 파일까지'], ['RUNTIME', 'RUNTIME: 실행 중까지']], show: function (c) { return c.topic === 'custom'; } },
    { id: 'target', label: '@Timed의 @Target (붙일 수 있는 곳)', type: 'select', value: 'METHOD', options: [['none', '적지 않음'], ['METHOD', 'METHOD: 메서드에만'], ['TYPE', 'TYPE: 클래스 같은 타입 선언에만']], hint: '@Timed는 work 메서드에 붙어 있습니다.', show: function (c) { return c.topic === 'custom'; } },
    { id: 'reader', label: '@Timed를 읽어서 처리하는 코드가 있다', type: 'check', value: true, show: function (c) { return c.topic === 'custom'; } },
    { id: 'typo', label: '재정의하려는 메서드의 이름을 잘못 적었다 (sound → sount)', type: 'check', value: true, show: function (c) { return c.topic === 'override'; } },
    { id: 'ov', label: '그 메서드에 @Override를 붙였다', type: 'check', value: false, show: function (c) { return c.topic === 'override'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '@Retention 없이 @Timed를 메서드에 붙이고 리플렉션으로 읽는 코드를 두면 실행 중에 무슨 일이 일어나나', d: '@Timed를 붙였고 읽는 코드도 있는데, 아무 일도 일어나지 않습니다.', v: { topic: 'custom', ret: 'none', target: 'METHOD', reader: true, typo: true, ov: false } },
    { t: 'RUNTIME으로 남기면', q: '@Timed의 @Retention을 RUNTIME으로 바꾸면', d: '읽는 코드가 표시를 찾아 work 앞뒤에 일을 덧붙입니다.', v: { topic: 'custom', ret: 'RUNTIME', target: 'METHOD', reader: true, typo: true, ov: false } },
    { t: '읽는 코드가 없으면', q: '@Retention을 RUNTIME으로 바꾸고 @Timed를 읽어서 처리하는 코드를 없애면', d: '표시가 실행 중까지 남아 있어도 아무 일도 일어나지 않습니다.', v: { topic: 'custom', ret: 'RUNTIME', target: 'METHOD', reader: false, typo: true, ov: false } },
    { t: 'SOURCE로 하면', q: '@Timed의 @Retention을 SOURCE로 바꾸면', d: '표시가 class 파일에도 남지 않습니다.', v: { topic: 'custom', ret: 'SOURCE', target: 'METHOD', reader: true, typo: true, ov: false } },
    { t: '붙일 수 없는 곳에 붙이면', q: '@Timed의 @Retention을 RUNTIME으로, @Target을 TYPE으로 바꾸면', d: '@Target이 TYPE인데 메서드에 붙였습니다. 컴파일 오류입니다.', v: { topic: 'custom', ret: 'RUNTIME', target: 'TYPE', reader: true, typo: true, ov: false } },
    { t: '@Override 없이 이름을 틀리면', q: '@Override를 붙이지 않고 재정의하려는 메서드의 이름을 sound 대신 sount로 적으면', d: '오류 없이 컴파일되고, 부모의 메서드가 대신 실행됩니다.', v: { topic: 'override', ret: 'none', target: 'METHOD', reader: true, typo: true, ov: false } },
    { t: '@Override가 잡아 준다', q: '재정의하려는 메서드의 이름을 sount로 잘못 적은 채 그 메서드에 @Override를 붙이면', d: '같은 실수를 컴파일러가 오류로 알려 줍니다.', v: { topic: 'override', ret: 'none', target: 'METHOD', reader: true, typo: true, ov: true } },
  ],
  // 화면의 코드: [선언 부분, main 안의 부분]
  parts: function (c) {
    if (c.topic === 'override') {
      return ['class Animal {\n    String sound() {\n        return "...";\n    }\n}\n\nclass Dog extends Animal {\n' + (c.ov ? '    @Override\n' : '') + '    String ' + (c.typo ? 'sount' : 'sound') + '() {\n        return "멍멍";\n    }\n}',
        '// 여기부터는 main 안의 코드\nAnimal a = new Dog();\nSystem.out.println(a.sound());'];
    }
    var decl = (c.ret === 'none' ? '' : '@Retention(RetentionPolicy.' + c.ret + ')\n') + (c.target === 'none' ? '' : '@Target(ElementType.' + c.target + ')\n') + '@interface Timed { }\n\nclass Service {\n    @Timed\n    void work() {\n        System.out.println("work 실행");\n    }\n}';
    var body = c.reader
      ? '// 여기부터는 main 안의 코드: 애너테이션을 읽는 쪽\nService service = new Service();\nMethod m = Service.class.getDeclaredMethod("work");\nboolean found = m.isAnnotationPresent(Timed.class);\nSystem.out.println("@Timed가 보이는가: " + found);\nif (found) System.out.println("[시간 측정 시작]");\nm.invoke(service);\nif (found) System.out.println("[시간 측정 끝]");'
      : '// 여기부터는 main 안의 코드: 애너테이션을 읽는 코드가 없음\nService service = new Service();\nservice.work();';
    return [decl, body];
  },
  code: function (c) { var p = this.parts(c); return p[0] + '\n\n' + p[1]; },
  label: function (c) {
    if (c.topic === 'override') return '@Override · ' + (c.typo ? '이름 오타' : '이름 맞음') + ' · ' + (c.ov ? '@Override 붙임' : '@Override 없음');
    return '@Timed · Retention ' + (c.ret === 'none' ? '생략' : c.ret) + ' · Target ' + (c.target === 'none' ? '생략' : c.target) + ' · ' + (c.reader ? '읽는 코드 있음' : '읽는 코드 없음');
  },
  columns: ['컴파일', 'class 파일에 남는가', '실행 중 리플렉션으로 보이는가', '출력'],
  simulate: function (c) {
    var ev = [], sum = [], ov = c.topic === 'override';
    var st = { chk: '아직', comp: '?', cls: '?', vis: '?', rd: '', out: [], end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var NO = ['오류', '(컴파일 안 됨)', '(컴파일 안 됨)', '(실행 못 함)'];

    if (ov) {
      var typo = !!c.typo, has = !!c.ov, name = typo ? 'sount' : 'sound';
      push('Animal에는 sound() 메서드가 있고, Dog는 Animal을 상속합니다: Dog에서 sound()를 다시 정의(오버라이딩)해 "멍멍"을 돌려주게 하려는 코드입니다.' + (typo ? ' 그런데 Dog의 메서드 이름을 sount로 잘못 적었습니다.' : ''), typo ? 'hot' : '');
      var MSG = 'method does not override or implement a method from a supertype';
      if (has && typo) {
        st.chk = '오류'; st.comp = '오류'; st.end = '실행 못 함';
        push('컴파일러가 sount() 위의 @Override를 읽습니다: @Override는 "바로 아래 메서드는 상위 타입의 메서드를 재정의한 것이다"라는 표시이고, 컴파일러는 그 말이 맞는지 확인합니다. Animal에는 sount()가 없습니다. 컴파일 오류이고, 컴파일러는 "' + MSG + '"(상위 타입의 메서드를 재정의하지도 구현하지도 않았다)라고 알립니다.', 'good');
        push('컴파일이 실패했습니다: class 파일이 만들어지지 않으므로 프로그램을 실행할 수 없습니다. 이름을 잘못 적은 실수가 실행 전에 드러났습니다.', 'bad');
        sum.push('@Override를 읽는 쪽은 컴파일러입니다. 재정의하려던 메서드의 이름이나 매개변수를 잘못 적으면 컴파일 오류로 알려 줍니다.');
        return { events: ev, summary: sum, errLine: '@Override', msg: MSG, attr: '', row: NO };
      }
      if (has) { st.chk = '통과'; push('컴파일러가 sound() 위의 @Override를 읽습니다: 바로 아래 메서드가 상위 타입의 메서드를 정말로 재정의하는지 확인합니다. Animal에 sound()가 있으므로 통과합니다.', 'good'); }
      else if (typo) { st.chk = '하지 않음'; push('컴파일러가 Dog의 sount()를 봅니다: @Override가 없으므로 "재정의가 맞는지" 확인하지 않습니다. sount()는 Dog에 새로 추가한, sound()와 상관없는 메서드로 취급되어 그대로 컴파일됩니다. 오류도 경고도 없습니다.', 'bad'); }
      else { st.chk = '하지 않음'; push('컴파일러가 Dog의 sound()를 봅니다: 이름과 매개변수가 Animal의 sound()와 같으므로 재정의가 됩니다. @Override가 없어도 재정의는 되지만, 맞게 적었는지 확인해 준 쪽은 없습니다.', ''); }
      st.comp = '성공'; st.cls = has ? '남지 않음' : '(붙이지 않음)'; st.vis = has ? '보이지 않음' : '(붙이지 않음)';
      push('컴파일에 성공했습니다: Dog.class가 만들어집니다.' + (has ? ' @Override는 소스 코드까지만 남는(Retention이 SOURCE인) 애너테이션이어서, 컴파일러의 확인이 끝나면 class 파일에는 적히지 않습니다. 실행 중에는 흔적이 없습니다.' : ''), 'good');
      var res = typo ? '...' : '멍멍';
      st.out.push(res); st.end = '정상 종료';
      push('a.sound() 실행: a가 가리키는 객체는 Dog입니다. ' + (typo ? 'Dog에는 sound()가 없습니다(sount()만 있습니다). 그래서 Animal에게서 물려받은 sound()가 실행되어 "..."를 출력합니다. 오류 없이 의도와 다른 메서드가 실행됐습니다.' : 'Dog가 재정의한 sound()가 실행되어 "멍멍"을 출력합니다.'), typo ? 'bad' : 'good');
      if (typo) sum.push('@Override가 없으면 이름을 잘못 적은 메서드가 "새 메서드"로 조용히 컴파일되고, 재정의하려던 부모의 메서드가 그대로 실행됩니다. @Override를 붙이면 같은 실수가 컴파일 오류가 됩니다.');
      else if (has) sum.push('@Override는 동작을 바꾸지 않습니다. 붙이든 떼든 출력은 같습니다. 하는 일은 하나, "재정의가 맞는지 컴파일러에게 확인시키는 것"입니다. 그래서 재정의하는 메서드에는 항상 붙입니다.');
      else sum.push('이름을 맞게 적었으므로 @Override가 없어도 재정의가 됩니다. 다만 나중에 부모의 메서드 이름이 바뀌면, 이 메서드는 아무 알림 없이 재정의가 아니게 됩니다. @Override를 붙여 두면 그때 컴파일 오류로 알 수 있습니다.');
      return { events: ev, summary: sum, errLine: '', msg: '', attr: '', row: ['성공', st.cls, st.vis, res] };
    }

    var ret = c.ret === 'none' ? 'CLASS' : c.ret, inClass = ret !== 'SOURCE', visible = ret === 'RUNTIME', reader = !!c.reader;
    push('@interface Timed 선언을 봅니다: Timed라는 애너테이션을 새로 만드는 문법입니다. 중괄호 안에 실행할 코드가 한 줄도 없습니다. 애너테이션은 "여기에 이런 표시를 붙여 둔다"는 정보일 뿐, 스스로 무엇을 하지는 않습니다.');
    push({ none: '@Retention을 적지 않았습니다: @Retention은 표시를 어디까지 남길지 정하는 설정입니다. 적지 않으면 기본값인 CLASS가 적용됩니다. CLASS는 "class 파일까지는 남기되, 실행 중에는 보여 주지 않는다"는 뜻입니다.', SOURCE: '@Retention(RetentionPolicy.SOURCE)를 봅니다: 표시를 소스 코드까지만 남긴다는 설정입니다. 컴파일러가 본 뒤에는 버려져 class 파일에 들어가지 않습니다.', CLASS: '@Retention(RetentionPolicy.CLASS)를 봅니다: 표시를 class 파일까지는 남기되, 실행 중에는 보여 주지 않는다는 설정입니다. 적지 않았을 때의 기본값과 같습니다.', RUNTIME: '@Retention(RetentionPolicy.RUNTIME)을 봅니다: 표시를 class 파일에 남기고, 실행 중에도 리플렉션으로 읽을 수 있게 한다는 설정입니다.' }[c.ret], c.ret === 'none' ? 'hot' : '');
    var TMSG = 'annotation interface not applicable to this kind of declaration';
    if (c.target === 'TYPE') {
      st.chk = '오류'; st.comp = '오류'; st.end = '실행 못 함';
      push('컴파일러가 work 메서드 위의 @Timed를 검사합니다: @Target(ElementType.TYPE)은 "클래스나 인터페이스 같은 타입 선언에만 붙일 수 있다"는 뜻인데, 메서드에 붙였습니다. 컴파일 오류이고, 컴파일러는 "' + TMSG + '"(이 종류의 선언에는 붙일 수 없는 애너테이션)라고 알립니다.', 'bad');
      push('컴파일이 실패했습니다: class 파일이 만들어지지 않으므로 프로그램을 실행할 수 없습니다. @Retention을 무엇으로 했든, 읽는 코드가 있든 없든 결과는 같습니다.', 'bad');
      sum.push('@Target은 애너테이션을 붙일 수 있는 곳을 정합니다. 이것을 읽고 지키게 하는 쪽은 컴파일러입니다. 맞지 않는 곳에 붙이면 컴파일 오류가 나므로, 잘못 붙인 채로 "왜 동작하지 않지" 하고 헤매는 일을 막아 줍니다.');
      return { events: ev, summary: sum, errLine: '@Timed', msg: TMSG, attr: '', row: NO };
    }
    st.chk = '통과';
    push('컴파일러가 work 메서드 위의 @Timed를 검사합니다: ' + (c.target === 'METHOD' ? '@Target(ElementType.METHOD)은 "메서드에만 붙일 수 있다"는 뜻이고, 붙인 곳이 메서드이므로 통과합니다. @Target을 읽고 지키게 하는 쪽은 컴파일러입니다.' : '@Target을 적지 않았으므로 클래스, 메서드, 필드 같은 선언 어디에나 붙일 수 있습니다. 통과합니다.'), 'good');
    st.comp = '성공'; st.cls = inClass ? '남음' : '남지 않음';
    var attr = ret === 'RUNTIME' ? 'RuntimeVisibleAnnotations' : ret === 'CLASS' ? 'RuntimeInvisibleAnnotations' : '';
    push('컴파일해서 Service.class를 만듭니다: ' + (ret === 'SOURCE' ? 'SOURCE이므로 @Timed 표시는 class 파일에 적히지 않습니다. class 파일만 보면 work는 아무 표시도 없는 메서드입니다.' : ret === 'CLASS' ? '@Timed 표시가 class 파일에 적힙니다. 다만 "실행 중에는 보여 주지 않는 칸"(' + attr + ')에 적힙니다.' : '@Timed 표시가 class 파일의 "실행 중에도 보여 주는 칸"(' + attr + ')에 적힙니다.'), inClass ? '' : 'hot');
    st.vis = visible ? '보임' : '보이지 않음';
    if (!reader) {
      st.rd = 'none'; st.out.push('work 실행'); st.end = '정상 종료';
      push('service.work() 실행: "work 실행"을 출력하고 끝납니다. ' + (visible ? '@Timed 표시는 실행 중에도 남아 있지만, ' : '') + '그 표시를 읽어서 무언가를 하는 코드가 어디에도 없으므로, 표시가 없을 때와 똑같이 동작합니다.', visible ? 'hot' : '');
    } else {
      push('Service.class.getDeclaredMethod("work") 실행: 리플렉션으로 work 메서드의 정보를 꺼냅니다. 리플렉션은 실행 중에 클래스가 가진 메서드, 필드, 애너테이션 같은 정보를 조사하는 기능으로, 프레임워크가 애너테이션을 읽을 때 쓰는 방법입니다.');
      st.rd = visible ? 'found' : 'notfound'; st.out.push('@Timed가 보이는가: ' + visible);
      push('m.isAnnotationPresent(Timed.class) 실행: work에 @Timed가 붙어 있는지 묻습니다. 결과는 ' + visible + '입니다. ' + (visible ? 'Retention이 RUNTIME이라 표시가 실행 중까지 남아 있습니다.' : ret === 'SOURCE' ? '표시가 class 파일에조차 없으므로 실행 중에는 알 길이 없습니다.' : '표시가 class 파일에는 있지만, JVM은 CLASS로 남긴 표시를 리플렉션에 보여 주지 않습니다.' + (c.ret === 'none' ? ' @Retention을 적지 않은 것이 원인입니다.' : '')), visible ? 'good' : 'bad');
      if (visible) {
        st.out.push('[시간 측정 시작]', 'work 실행', '[시간 측정 끝]'); st.end = '정상 종료';
        push('found가 true이므로 읽는 쪽이 일을 덧붙입니다: "[시간 측정 시작]"을 출력하고, m.invoke(service)로 work를 실행하고, "[시간 측정 끝]"을 출력합니다. 앞뒤의 일을 한 것은 @Timed가 아니라, 표시를 발견한 이 코드입니다.', 'good');
      } else {
        st.out.push('work 실행'); st.end = '정상 종료';
        push('found가 false이므로 읽는 쪽은 아무것도 덧붙이지 않습니다: m.invoke(service)로 work만 실행합니다. 소스 코드에는 @Timed가 분명히 붙어 있는데도, 읽는 쪽에게는 표시가 없는 메서드와 같습니다. 오류도 나지 않습니다.', 'bad');
      }
    }
    if (reader && visible) sum.push('표시가 실행 중까지 남아 있고(RUNTIME) 그것을 읽는 코드가 있을 때에만 무언가가 일어납니다. 스프링의 @Transactional이나 @Autowired도 같은 원리입니다. 애너테이션이 일을 하는 것이 아니라, 프레임워크가 리플렉션으로 표시를 찾아 그에 맞는 일을 합니다.');
    if (reader && !visible) sum.push('애너테이션을 붙였고 읽는 코드도 있는데 아무 일도 일어나지 않습니다. 표시가 실행 중까지 남지 않았기 때문입니다. 실행 중에 리플렉션으로 읽을 애너테이션을 만들 때는 @Retention(RetentionPolicy.RUNTIME)을 반드시 적습니다.' + (c.ret === 'none' ? ' 적지 않으면 기본값이 CLASS라서 오류 없이 조용히 무시됩니다.' : ''));
    if (!reader) sum.push('애너테이션은 그 자체로는 아무 일도 하지 않습니다. 읽는 쪽이 없으면 붙어 있든 아니든 프로그램의 동작은 같습니다.');
    if (ret === 'SOURCE') sum.push('SOURCE는 컴파일러나, 컴파일할 때 코드를 만들어 내는 도구만 읽으면 되는 애너테이션에 씁니다. @Override가 그렇습니다.');
    if (ret === 'CLASS') sum.push('CLASS는 class 파일을 읽어 처리하는 도구를 위한 것으로, 실행 중인 프로그램이 스스로 읽을 수는 없습니다.');
    return { events: ev, summary: sum, errLine: '', msg: '', attr: attr, row: ['성공', st.cls, st.vis, st.out.join(' / ')] };
  },
  mark: function (c) { return c.topic === 'override' ? '@Override' : '@Timed'; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 소스 코드, class 파일, 실행 중의 순서로 표시가 어디까지 남고 누가 읽는지 보여 줍니다.'); return; }
    H.title(v, '콘솔 출력');
    v.appendChild(H.el('pre', 'code', s.out.length ? s.out.join('\n') : '(아직 없음)'));
    H.counters(v, [[s.end, '프로그램']]);
  },
  // 그림: 소스 코드, class 파일, 실행 중의 세 단계를 왼쪽에서 오른쪽으로 놓고 단계마다 표시가 남아 있는지 적는다. 아래에는 그 표시를 읽는 쪽(컴파일러, 리플렉션 코드)을 놓고 읽는 단계로 화살표를 긋는다.
  draw: function (P, sim, shown) {
    var c = sim.c, ov = c.topic === 'override', mark = this.mark(c), last = shown[shown.length - 1];
    var s = last ? last.snap : { chk: '아직', comp: '?', cls: '?', vis: '?', rd: '', out: [], end: '?' };
    var attached = !ov || c.ov, done = s.comp === '성공';
    P.size(680, 292);
    P.region('life', 16, 16, 648, 96, mark + ' 표시가 남는 곳');
    P.box('src', 30, 46, 196, 54, { cls: attached ? 'wait' : 'ghost', title: '소스 코드 (.java)', sub: mark + ': ' + (attached ? '붙어 있음' : '붙이지 않음') });
    P.box('cls', 242, 46, 196, 54, { cls: s.cls === '남음' ? 'wait' : s.cls === '?' ? 'ghost' : 'plain', title: 'class 파일 (.class)', sub: mark + ': ' + (s.comp === '오류' ? '만들어지지 않음' : s.cls === '?' ? '아직' : s.cls === '(붙이지 않음)' ? '없음' : s.cls) });
    P.box('run', 454, 46, 196, 54, { cls: s.vis === '보임' ? 'wait' : s.vis === '?' ? 'ghost' : 'plain', title: '실행 중 (JVM)', sub: mark + ': ' + (s.comp === '오류' ? '실행 못 함' : s.vis === '?' ? '아직' : s.vis === '(붙이지 않음)' ? '없음' : s.vis) });
    P.arrow('c1', 'src:r', 'cls:l', { cls: done ? (s.cls === '남음' ? 'good' : 'mut dash') : s.comp === '오류' ? 'bad' : 'mut dash' });
    P.arrow('c2', 'cls:r', 'run:l', { cls: done ? (s.vis === '보임' ? 'good' : 'mut dash') : 'mut dash' });
    P.region('readers', 16, 126, 648, 96, '표시를 읽는 쪽');
    P.box('rd1', 30, 156, 196, 54, { cls: s.chk === '오류' ? 'bad now' : s.chk === '통과' ? 'good' : 'plain', title: '컴파일러', sub: (ov ? '재정의 확인: ' : '붙일 곳 확인: ') + s.chk });
    var hasReader = !ov && c.reader;
    P.box('rd2', 454, 156, 196, 54, { cls: !hasReader ? 'ghost' : s.rd === 'found' ? 'good now' : s.rd === 'notfound' ? 'bad now' : 'plain', title: '리플렉션으로 읽는 코드', sub: !hasReader ? '없음' : s.rd === 'found' ? '표시를 찾아 일을 덧붙임' : s.rd === 'notfound' ? '표시를 찾지 못함' : '아직 실행 전' });
    if (s.chk !== '아직' && s.chk !== '하지 않음') P.arrow('r1', 'rd1:t', 'src:b', { cls: s.chk === '오류' ? 'bad' : 'good' });
    if (s.rd === 'found' || s.rd === 'notfound') P.arrow('r2', 'rd2:t', 'run:b', { cls: s.rd === 'found' ? 'good' : 'bad' });
    P.box('o1', 16, 238, 320, 36, { cls: s.comp === '성공' ? 'good' : s.comp === '오류' ? 'bad' : 'ghost', title: '컴파일', right: s.comp });
    var result = s.comp === '오류' ? '실행 못 함' : s.end !== '정상 종료' ? '?' : ov ? (c.typo ? 'Animal의 sound 실행' : 'Dog의 sound 실행') : s.rd === 'found' ? 'work 앞뒤에 일이 덧붙음' : 'work만 실행';
    P.box('o2', 344, 238, 320, 36, { cls: result === '?' ? 'ghost' : s.comp === '오류' ? 'bad' : (ov ? !c.typo : s.rd === 'found') ? 'good' : 'plain', title: '실행 결과', right: result });
    P.note('위 줄은 꼬리표가 어느 단계까지 남는지(@Retention이 정합니다), 아래 줄은 그 꼬리표를 누가 읽는지입니다.');
  },
  assume: '스물여덟 가지 조합(@Timed 쪽 24가지, @Override 쪽 4가지)을 이 PC의 JDK 21에서 화면의 코드로 실제로 컴파일하고 실행해 대조했습니다. 컴파일 여부와 오류가 난 줄, 컴파일러 메시지, 출력뿐 아니라, 만들어진 class 파일의 바이트에 애너테이션이 적혀 있는지(적혀 있다면 RuntimeVisibleAnnotations와 RuntimeInvisibleAnnotations 가운데 어느 칸인지)와 리플렉션의 isAnnotationPresent 결과도 조합마다 직접 확인했습니다. 화면에서 숨겨진 설정은 결과에 영향을 주지 않습니다. 화면의 코드에는 import 문(java.lang.annotation의 것들과 java.lang.reflect.Method)과 main 메서드의 선언이 생략되어 있습니다. @Target(ElementType.TYPE)인 애너테이션을 클래스에 붙이면 컴파일된다는 것도 확인했습니다. 스프링 같은 프레임워크가 애너테이션을 읽는 방식은 이 모형의 "읽는 쪽" 코드와 원리가 같다는 설명이며, 프레임워크를 실제로 실행해 확인한 것은 아닙니다. 컴파일할 때 애너테이션을 읽어 코드를 만들어 내는 도구(애너테이션 프로세서)는 다루지 않았습니다.',
});
