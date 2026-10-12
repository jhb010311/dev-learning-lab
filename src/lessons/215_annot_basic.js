Lab.register({
  id: 'annot_basic', nav: '애너테이션', cat: '기초개념', mode: 'step', basic: true, deep: ['annot'],
  title: '애너테이션은 무엇이고, 붙이면 무슨 일이 생기는가',
  intro: '애너테이션은 @Run, @Override처럼 @로 시작하는, 코드에 붙이는 표시입니다. 이 실습에서는 @interface Run으로 표시를 직접 만들고 work 메서드 위에 @Run을 붙입니다. 그런데 표시는 그 자체로는 아무것도 실행하지 않습니다. 효과가 생기려면 그 표시를 읽고 무언가를 해 주는 쪽이 있어야 하고, 컴파일러나 스프링 같은 프레임워크, 또는 우리가 쓴 코드가 그 역할을 합니다. 여기서는 "Run이 붙은 메서드를 찾아 부르는" for 문을 우리가 직접 써서 그 관계를 보입니다. @Run을 지우고, 읽는 쪽을 지우고, @Retention을 지워 가며 같은 코드를 컴파일해 실행하고, 어느 메서드가 불리는지를 봅니다.',
  terms: ['애너테이션', '@interface', '리플렉션', '@Retention과 @Target'],
  controls: [
    { id: 'mark', label: '@Run을 붙이는 메서드', type: 'select', value: 'work', options: [['work', 'work에 @Run을 붙인다'], ['none', '어디에도 붙이지 않는다'], ['both', 'work와 rest 둘 다에 붙인다']] },
    { id: 'reader', label: 'Run이 붙은 메서드를 찾아 부르는 코드가 있다', type: 'check', value: true },
    { id: 'keep', label: '@Retention(RetentionPolicy.RUNTIME)을 적는다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '애너테이션은 어떻게 생겼고, 붙이면 무슨 일이 일어나나', d: '@Run이 붙은 work만 불립니다. 부른 것은 표시가 아니라, 표시를 읽은 우리 코드입니다.', v: { mark: 'work', reader: true, keep: true } },
    { t: 'work의 @Run을 지우면', q: 'work의 @Run을 지우면', d: '읽는 코드는 그대로인데 work가 불리지 않습니다.', v: { mark: 'none', reader: true, keep: true } },
    { t: 'rest에도 @Run을 붙이면', q: 'rest에도 @Run을 붙이면', d: '읽는 코드는 그대로인데 rest도 불립니다.', v: { mark: 'both', reader: true, keep: true } },
    { t: '읽는 코드를 지우면', q: 'Run이 붙은 메서드를 찾아 부르는 코드를 지우면', d: '@Run이 붙어 있어도 아무 일도 일어나지 않습니다.', v: { mark: 'work', reader: false, keep: true } },
    { t: '@Retention을 지우면', q: '@Retention(RetentionPolicy.RUNTIME)을 지우면', d: '@Run이 붙어 있어도 실행 중에는 보이지 않아 아무 메서드도 불리지 않습니다.', v: { mark: 'work', reader: true, keep: false } },
  ],
  code: function (c) {
    var o = [], imp = [];
    if (c.keep) imp.push('import java.lang.annotation.Retention;', 'import java.lang.annotation.RetentionPolicy;');
    if (c.reader) imp.push('import java.lang.reflect.Method;');
    if (imp.length) o = imp.concat(['']);
    o.push(c.keep ? '// 표시를 만든다. 실행 중에도 읽을 수 있게 남겨 두라고 적는다' : '// 표시를 만든다');
    if (c.keep) o.push('@Retention(RetentionPolicy.RUNTIME)');
    o.push('@interface Run { }', '', 'class Job {');
    if (c.mark !== 'none') o.push('    // 표시: work 메서드에 Run을 붙인다', '    @Run');
    o.push('    public void work() {', '        System.out.println("work 실행");', '    }');
    if (c.mark === 'both') o.push('    @Run');
    o.push('    public void rest() {', '        System.out.println("rest 실행");', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) throws Exception {', '        Job job = new Job();');
    if (c.reader) o.push('        // 읽는 쪽: Run이 붙은 메서드만 찾아 부른다', '        for (String name : new String[] { "work", "rest" }) {', '            Method m = Job.class.getMethod(name);', '            if (m.isAnnotationPresent(Run.class)) {', '                m.invoke(job);', '            }', '        }');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { work: 'work에 @Run', none: '@Run 없음', both: 'work와 rest에 @Run' }[c.mark] + ' · ' + (c.reader ? '읽는 코드 있음' : '읽는 코드 없음') + ' · ' + (c.keep ? '@Retention 있음' : '@Retention 없음'); },
  columns: ['출력', '불린 메서드', '실행 중에 읽힌 표시'],
  simulate: function (c) {
    var ev = [], sum = [], N = ['work', 'rest'];
    var marks = { work: c.mark !== 'none', rest: c.mark === 'both' };
    var vis = { work: c.keep && marks.work, rest: c.keep && marks.rest };
    var anyMark = marks.work || marks.rest, anyVis = vis.work || vis.rest;
    var st = { hot: '', compile: '', ran: false, marks: marks, vis: { work: '', rest: '' }, visN: 0, cur: '', phase: '', calls: { work: 0, rest: 0 }, called: 0, out: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var visList = N.filter(function (n) { return vis[n]; });
    var markText = c.mark === 'both' ? 'work와 rest 메서드 위' : 'work 메서드 위';

    // 1~3. 컴파일
    st.hot = 'rn';
    push('컴파일러가 소스를 위에서부터 읽습니다. 먼저 @interface Run 선언을 읽고, Run이라는 표시를 새로 만듭니다. @로 시작하는 표시를 애너테이션이라고 부르고, @interface 뒤에 적은 Run이 그 표시의 이름이 됩니다. Run의 { } 안은 비어 있어서, 아무 값도 담지 않는 표시입니다. ' + (c.keep ? '그 위의 @Retention(RetentionPolicy.RUNTIME)은 이 표시를 어디까지 남길지 컴파일러에게 알립니다. RUNTIME은 class 파일에 기록하고 실행 중에도 리플렉션(실행 중에 클래스와 메서드를 조사하는 기능)으로 읽을 수 있게 남기라는 뜻입니다.' : '@Retention을 적지 않았으므로 기본값인 CLASS가 됩니다. CLASS는 class 파일에는 기록하지만 실행 중에는 남겨 두지 않아도 되는 방식입니다.'), '');
    st.hot = 'jobs';
    push(anyMark
      ? '컴파일러가 Job 클래스를 읽습니다. ' + markText + '에 @Run이 붙어 있습니다. 컴파일러는 ' + (c.mark === 'both' ? '이 표시들을' : '이 표시를') + ' class 파일에 ' + (c.keep ? '실행 중에 읽을 수 있는 표시로' : '실행 중에는 읽을 수 없는 표시로') + ' 적어 둘 뿐, 메서드를 실행하거나 부르지는 않습니다.'
      : '컴파일러가 Job 클래스를 읽습니다. work와 rest 어느 메서드에도 @Run이 붙어 있지 않습니다. class 파일에 적을 표시가 없습니다.', '');
    st.hot = ''; st.compile = 'ok';
    push('컴파일에 성공합니다. 컴파일러가 한 일은 소스를 확인하고 class 파일을 만드는 것까지입니다. work도 rest도 아직 한 번도 실행되지 않았습니다.', 'good');

    // 4. 실행: new Job()
    st.ran = true; st.hot = 'jobs'; st.visN = visList.length;
    push('java Main으로 실행합니다. main이 시작되고, new Job()이 Job 객체를 만듭니다. 이 줄에서 work와 rest는 실행되지 않았습니다. 메서드는 그것을 부르는 코드가 있어야 실행됩니다. 메서드 위에 붙은 @Run은 부르는 코드가 아니라 표시일 뿐입니다.', '');

    var called = [];
    if (c.reader) {
      N.forEach(function (n, i) {
        var head = i === 0;
        st.cur = n; st.phase = 'ask'; st.hot = 'rd';
        var ask = (head ? 'for 문이 처음 돌면서 name은 "work"입니다. ' : 'for 문이 다시 돌면서 name은 "rest"입니다. ')
          + 'Job.class.getMethod("' + n + '")로 ' + n + ' 메서드를 꺼내고, m.isAnnotationPresent(Run.class)로 이 메서드에 Run이 붙어 있는지 실행 중에 묻습니다.' + (head ? ' 이렇게 묻는 것은 @Run이 아니라 우리가 쓴 이 코드입니다.' : '');
        st.vis[n] = vis[n] ? 'yes' : 'no';
        push(ask + (vis[n] ? ' 답은 true입니다. 소스에 붙인 @Run이 실행 중에 읽을 수 있는 상태로 남아 있기 때문입니다.'
          : marks[n] ? ' 답은 false입니다. 소스에는 @Run이 붙어 있지만 @Retention이 없어 실행 중에는 남아 있지 않으므로, 리플렉션으로 물어도 보이지 않습니다.'
          : ' 답은 false입니다. 이 메서드에는 @Run이 붙어 있지 않습니다.'), '');
        if (vis[n]) {
          st.phase = 'call'; st.calls[n]++; st.called++; st.out.push(n + ' 실행'); called.push(n);
          push(head
            ? 'true이므로 if 안으로 들어가 m.invoke(job)이 실행됩니다. invoke가 job 객체의 ' + n + ' 메서드를 부르고, ' + n + ' 메서드가 "' + n + ' 실행"을 출력합니다. 이것을 출력하게 만든 것은 @Run 자체가 아니라, @Run을 보고 m.invoke(job)을 실행한 우리 코드입니다.'
            : 'true이므로 m.invoke(job)이 실행되어 rest 메서드가 불리고, "rest 실행"이 출력됩니다. 이번에도 부른 것은 표시가 아니라 우리 코드입니다.', 'good');
        } else {
          st.phase = 'skip';
          push('false이므로 if 안으로 들어가지 않아 m.invoke(job)은 실행되지 않습니다. ' + n + ' 메서드는 불리지 않았고, 아무것도 출력되지 않았습니다.', '');
        }
      });
      st.cur = ''; st.phase = ''; st.hot = '';
      push('for 문이 끝나고 main이 끝납니다. 불린 메서드는 ' + called.length + '개이고, ' + (called.length ? '출력은 "' + st.out.join(' / ') + '"입니다.' : '출력된 것이 없습니다.'), called.length ? 'good' : '');
    } else {
      st.hot = ''; st.vis.work = vis.work ? 'yes' : 'no'; st.vis.rest = vis.rest ? 'yes' : 'no';
      push('main에는 Job 객체를 만드는 줄뿐이고, Run이 붙었는지 묻거나 메서드를 꺼내 부르는 코드가 없습니다. 그러므로 work도 rest도 불리지 않고 아무것도 출력되지 않은 채 main이 끝납니다. ' + (anyVis ? 'Run은 실행 중에 읽을 수 있는 상태로 남아 있었지만, 읽는 쪽이 없으니 붙어 있다는 것을 아무도 알아채지 못했습니다.' : anyMark ? '@Run이 붙어 있고 @Retention도 없지만, 어느 쪽이든 읽는 쪽이 없으면 아무 일도 일어나지 않습니다.' : '@Run이 어디에도 없고 읽는 쪽도 없으니 평범한 코드와 같습니다.'), '');
    }

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (c.reader && c.keep && c.mark === 'work') {
      sum.push('애너테이션은 @로 시작하는, 코드에 붙이는 표시입니다. @interface Run으로 표시를 만들고 work 메서드 위에 @Run을 붙였습니다. 그런데 표시는 그 자체로는 아무것도 실행하지 않습니다. work가 불린 것은 Run이 붙은 메서드를 찾아 m.invoke(job)으로 부르는 코드를 우리가 썼기 때문입니다.');
      sum.push('스프링의 @RestController나 @GetMapping도 마찬가지로, 스프링이 그 표시를 읽어 주기 때문에 효과가 있는 것입니다. 스프링이 읽는 모습은 "컨트롤러" 기초 실습에서 봅니다.');
    } else if (c.reader && c.keep && c.mark === 'both') {
      sum.push('rest에도 @Run을 붙였더니 rest도 불렸습니다. 읽는 코드는 한 줄도 바꾸지 않았고, 읽는 쪽이 표시가 붙은 메서드를 모두 찾아 불렀습니다.');
      sum.push('어느 메서드를 부를지는 부르는 코드가 아니라 메서드에 붙은 표시가 정했습니다. 표시를 읽는 쪽을 한 번 써 두면, 표시만 붙여서 대상을 늘릴 수 있습니다.');
    } else if (c.reader && c.keep) {
      sum.push('work의 @Run을 지웠더니 work가 불리지 않았습니다. 읽는 코드는 그대로이고 work 메서드의 코드도 그대로인데, Run이 붙어 있지 않다는 답을 받아 if 안을 건너뛰었습니다.');
      sum.push('메서드가 불릴지는 메서드 안의 코드가 아니라 표시가 정했습니다. 읽는 쪽은 표시를 보고 일하는 코드이므로, 표시가 없으면 아무것도 하지 않습니다.');
    } else if (!c.reader && anyVis) {
      sum.push('Run이 붙은 메서드를 찾아 부르는 코드를 지우면, @Run이 붙어 있어도 아무 일도 일어나지 않았습니다. 표시는 실행 중에 읽을 수 있게 남아 있었지만, 읽는 쪽이 없었습니다.');
      sum.push('표시는 그 자체로는 아무것도 실행하지 않습니다. 컴파일러가 한 일도 표시를 class 파일에 적어 두는 것까지였고, 효과는 표시를 읽는 쪽이 있어야 생깁니다.');
    } else if (!c.reader && anyMark) {
      sum.push('읽는 코드도 없고 @Retention도 없어서, @Run이 붙어 있어도 아무 일도 일어나지 않았습니다. 둘 중 하나만 없어도 같은 결과입니다.');
      sum.push('표시는 읽는 쪽이 있고, 읽을 수 있게 남아 있어야 효과가 생깁니다. 이 조합에서는 둘 다 없으므로 표시를 붙이는 일이 아무 의미가 없습니다.');
    } else if (!c.reader) {
      sum.push('@Run도 읽는 코드도 없는 평범한 코드입니다. Job의 두 메서드를 부르는 줄이 없으므로 work도 rest도 실행되지 않았습니다.');
      sum.push('메서드는 부르는 코드가 있어야 실행됩니다. 애너테이션이 없는 것과 읽는 쪽이 없는 것은 이 코드에서 같은 결과를 냈습니다.');
    } else if (anyMark) {
      sum.push('@Retention(RetentionPolicy.RUNTIME)을 지우면, @Run이 붙어 있어도 불리는 메서드가 없었습니다. 기본값 CLASS여서 표시가 class 파일에는 있지만 실행 중에는 남지 않아, isAnnotationPresent가 false를 돌려주었기 때문입니다.');
      sum.push('실행 중에 표시를 읽으려면 표시가 실행 중에도 남아 있어야 합니다. 이것은 표시를 만들 때 @Retention으로 정합니다. 읽는 코드가 있어도, 읽을 표시가 남아 있지 않으면 찾을 수 없습니다.');
    } else {
      sum.push('@Run을 어디에도 붙이지 않았으므로, @Retention이 있든 없든 불리는 메서드는 없었습니다. 이 조합에서는 @Retention을 지운 것이 결과에 드러나지 않습니다.');
      sum.push('@Retention은 붙여 놓은 표시를 어디까지 남길지 정하는 것이므로, 붙인 곳이 없으면 정할 것도 없습니다. @Retention의 효과는 @Run이 붙은 조합에서 보입니다.');
    }
    var out = st.out.length ? st.out.join(' / ') : '(아무것도 출력되지 않음)';
    return { events: ev, summary: sum, row: [out, called.length ? called.join(', ') : '없음', visList.length ? visList.join(', ') : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 소스를 읽는 것부터 시작합니다.'); return; }
    var yn = { yes: '보임', no: '안 보임', '': '' };
    H.table(v, ['메서드', '소스의 @Run', '실행 중에 보임', '불린 횟수'], ['work', 'rest'].map(function (n) {
      return { cls: '', cells: [n + '()', s.marks[n] ? '붙어 있음' : '없음', { v: yn[s.vis[n]], cls: s.vis[n] === 'yes' ? 'good' : s.vis[n] === 'no' ? 'bad' : '' }, s.ran ? s.calls[n] + '번' : ''] };
    }), 'Job의 메서드');
    H.table(v, ['출력'], s.out.length ? s.out.map(function (o) { return { cls: '', cells: [o] }; }) : [{ cls: 'gone', cells: [s.ran ? '(아직 출력된 것 없음)' : ''] }], '출력');
    H.counters(v, [[s.called, '불린 메서드']]);
  },
  // 그림: 왼쪽에 Job의 메서드 두 개(@Run이 붙었는지 표시), 가운데 아래에 읽는 쪽 상자(없으면 점선), 오른쪽 위에 Run 표시의 보존 방식. 읽는 쪽에서 메서드로 묻는 화살표와 부르는 화살표. 맨 아래에 불린 메서드 수와 실행 중에 보이는 @Run 수.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    var hot = s ? s.hot : '', cur = s ? s.cur : '', ph = s ? s.phase : '';
    var marks = s ? s.marks : { work: c.mark !== 'none', rest: c.mark === 'both' };
    P.region('jb', 14, 16, 250, 208, 'Job 클래스');
    ['work', 'rest'].forEach(function (n, i) {
      var runs = s ? s.calls[n] : 0, on = (hot === 'jobs') || (cur === n && (ph === 'ask' || ph === 'call'));
      var cls = runs ? 'good' : on ? 'hot now' : 'plain';
      P.box('m' + n, 24, 44 + i * 92, 230, 76, { cls: cls, title: n + '()', sub: [marks[n] ? '@Run이 붙어 있음' : '@Run 없음', s && s.ran ? '불린 횟수 ' + runs + '번' : '아직 실행 전'] });
    });
    P.box('rn', 330, 16, 336, 64, { cls: hot === 'rn' ? 'hot now' : 'plain', title: 'Run (표시)', sub: c.keep ? '@Retention(RUNTIME): 실행 중에도 남음' : '@Retention 없음: 실행 중에는 남지 않음' });
    if (c.reader) {
      P.box('rd', 330, 96, 336, 116, { cls: hot === 'rd' ? 'hot now' : 'plain', title: '읽는 쪽 (우리가 쓴 for 문)', sub: [cur ? cur + ' 메서드에 Run이 붙었는지 묻는 중' : 'Run이 붙은 메서드만 찾아 부른다', ph === 'call' ? 'm.invoke(job)으로 부르는 중' : ph === 'skip' ? (sim.c.keep ? '붙어 있지 않으므로 부르지 않음' : '실행 중에는 표시가 보이지 않으므로 부르지 않음') : ' '] });
    } else {
      P.box('rd', 330, 96, 336, 116, { cls: 'ghost', title: '읽는 쪽 (없음)', sub: 'Run을 찾아 부르는 코드가 없음' });
    }
    if (cur && ph) {
      var to = 'm' + cur + ':r:0.5';
      P.arrow('ask', 'rd:l:' + (cur === 'work' ? '0.3' : '0.7'), to, { cls: ph === 'ask' ? 'hot' : 'dash' });
      if (ph === 'call') P.arrow('call', 'rd:l:' + (cur === 'work' ? '0.4' : '0.8'), 'm' + cur + ':r:0.7', { cls: 'good' });
    }
    P.box('n1', 14, 242, 322, 36, { cls: s && s.called ? 'good' : 'ghost', title: '불린 메서드', right: (s ? s.called : 0) + '개' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.visN ? 'wait' : 'ghost', title: '실행 중에 보이는 @Run', right: (s ? s.visN : 0) + '개' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21)입니다. 열두 가지 조합을 모두, 화면의 코드와 같은 소스를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 클래스 파일을 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡은 결과와 대조했습니다. 열두 조합 모두 컴파일에 성공했습니다. 대조한 것은 컴파일 성공 여부, 실행했을 때의 출력, 출력에서 읽은 불린 메서드, 그리고 "실행 중에 읽힌 표시"입니다. 마지막 것은 Main과 따로, 대조 프로그램이 같은 클래스 로더에서 Job 클래스의 work와 rest 메서드에 isAnnotationPresent(Run.class)를 직접 물어 잰 값이며, 읽는 코드가 없는 조합에서도 잽니다. 또 Job의 class 파일에 표시가 어떤 형태로 적혔는지(RuntimeVisibleAnnotations인지 RuntimeInvisibleAnnotations인지)도 확인했고, 화면의 단계 문장이 이 결과에 기댑니다. 문서는 직접 열어 확인했습니다. Java Language Specification(Java SE 21)의 9.6절(@interface로 애너테이션을 선언하고, 요소가 없으면 마커 애너테이션 인터페이스라는 것), 9.6.4.2절(@Retention이 없으면 CLASS로 보고, SOURCE는 class 파일에 남기지 않고, CLASS와 RUNTIME은 class 파일에 기록하며, RUNTIME은 리플렉션이 실행 중에 읽을 수 있게 해야 한다는 것), 9.7절(애너테이션은 프로그램 요소에 정보를 붙이는 표시이고 실행 중의 동작에는 영향을 주지 않는다는 것)과 9.7.2절(마커 애너테이션)을 따랐습니다. java.lang.annotation.Retention과 RetentionPolicy의 API 문서(기본값이 CLASS이고 RUNTIME만 리플렉션으로 읽을 수 있다는 것), java.lang.reflect.AnnotatedElement의 API 문서(isAnnotationPresent)도 확인했습니다. 컴파일러가 표시를 어떤 형태로 class 파일에 적는지는 명세가 정한 것이 아니라 이 javac에서 관찰한 것입니다. 화면의 코드는 이 실습의 설명을 위해 for 문으로 두 메서드를 차례로 보도록 했고, 실제 프레임워크가 표시를 읽는 방식과는 다릅니다. 스프링의 @RestController와 @GetMapping이 스프링이 읽어 주기 때문에 효과가 있다는 문장은 이 실습에서 실행하지 않았고, "컨트롤러" 기초 실습에서 확인한 내용을 가리킵니다. 애너테이션의 값을 담는 요소, @Target, @Override처럼 컴파일러가 읽는 표시, 실행 중에 읽는 프레임워크의 실제 구현은 다루지 않았습니다. 이 밖의 동작은 "세부 동작 실습: 애너테이션"에서 다룹니다.',
});
