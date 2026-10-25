Lab.register({
  id: 'null_basic', nav: 'null', cat: '기초개념', mode: 'step', basic: true, deep: ['optional'],
  title: 'null은 무엇이고, 왜 NullPointerException이 나는가',
  why: '"아직 가리킬 객체가 없다"를 나타낼 방법이 따로 없다면, 빈 문자열 같은 값을 "없음"의 뜻으로 정해 써야 하고, 그러면 정말로 글자가 0개인 값과 구별되지 않는다. null은 String이든 직접 만든 클래스든 객체를 가리키는 변수라면 모두 쓸 수 있는 "없음" 표시여서, 찾는 회원이 없을 때나 아직 정하지 않은 값을 진짜 값과 섞이지 않게 나타낸다.',
  use: 'Map의 get이 없는 키에 null을 돌려주는 것처럼, 자바의 여러 메서드는 "찾는 것이 없음"을 null로 알린다. 그래서 받은 값을 쓰기 전에 if (x != null)로 먼저 확인하는 코드를 자주 본다. 스프링 데이터 JPA의 findById처럼, 없을 수도 있는 값을 null 대신 Optional로 돌려주어 부르는 쪽이 확인을 빠뜨리지 않게 하는 방법도 쓴다.',
  intro: '변수 name에는 문자열 같은 객체 자체가 아니라, 그 객체를 가리키는 값(참조)이 담깁니다. null은 이 자리에 "아무 객체도 가리키지 않는다"를 담는 특별한 값이고, 코드에서는 String name = null;처럼 씁니다. name.length()에서 점(.)은 name이 가리키는 객체에게 일을 시킨다는 표시인데, null이면 시킬 객체가 없어서 NullPointerException이라는 예외가 납니다. if (name != null)은 name이 객체를 가리키는지 먼저 묻는 확인입니다. 글자가 하나도 없는 빈 문자열 ""는 null이 아니라 글자가 0개인 문자열 객체입니다. 이 실습은 name에 대입하는 값을 "kim", null, ""로 바꾸고 if 확인을 붙였다 떼며 같은 코드를 컴파일하고 실행해, 무엇이 출력되고 예외가 나는지를 봅니다.',
  terms: ['null', 'NullPointerException', 'null 검사', '빈 문자열'],
  controls: [
    { id: 'value', label: 'name에 대입하는 값', type: 'select', value: 'kim', options: [['kim', '문자열 "kim"'], ['null', 'null (아무 객체도 가리키지 않음)'], ['empty', '빈 문자열 ""']] },
    { id: 'check', label: 'if (name != null)로 length() 호출을 감싼다', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'name 변수가 문자열 "kim"을 가리키면, name.length() 줄은 무슨 일을 하나', d: 'name이 가리키는 "kim" 객체가 글자 수 3을 돌려줍니다.', v: { value: 'kim', check: false } },
    { t: 'null을 대입하면', q: 'name에 "kim" 대신 null을 대입하면', d: 'name이 가리키는 객체가 없어 name.length()에서 NullPointerException이 납니다.', v: { value: 'null', check: false } },
    { t: 'null인데 확인하면', q: 'null인데 name.length() 앞에 if (name != null)로 먼저 확인하면', d: '확인에서 걸러져 length()를 부르지 않고, 예외도 나지 않습니다.', v: { value: 'null', check: true } },
    { t: '"kim"인데 확인하면', q: 'name이 "kim"을 가리키는데 if (name != null)로 확인하면', d: '확인을 통과해 length()가 실행되고 결과는 같습니다.', v: { value: 'kim', check: true } },
    { t: '빈 문자열을 가리키면', q: 'null이 아니라 빈 문자열 ""을 가리키게 하면', d: '빈 문자열도 객체여서 length()가 0을 돌려주고 예외는 나지 않습니다.', v: { value: 'empty', check: false } },
    { t: '빈 문자열인데 확인하면', q: 'name이 빈 문자열 ""을 가리키는데 if (name != null)로 확인하면', d: '빈 문자열은 null이 아니어서 확인을 통과합니다.', v: { value: 'empty', check: true } },
  ],
  // 화면에 쓰는 말: 담는 값의 글, name이 가리키는 것의 설명
  vtxt: { kim: '"kim"', null: 'null', empty: '""' },
  pointTxt: { kim: '"kim" 문자열 객체', null: '아무 객체도 가리키지 않음 (null)', empty: '글자가 0개인 문자열 객체 ("")' },
  // 예외가 나는 줄(실제 실행의 스택 추적이 가리킨 줄)
  excLine: 'System.out.println(name.length());',
  code: function (c) {
    var o = ['public class Main {', '    public static void main(String[] args) {', '        // 변수: 문자열 객체를 가리키거나, null이면 아무것도 가리키지 않는다', '        String name = ' + this.vtxt[c.value] + ';'];
    if (c.check) o.push('        // 확인: name이 null이 아닐 때만 length()를 부른다', '        if (name != null) {', '            System.out.println(name.length());', '        } else {', '            System.out.println("이름 없음");', '        }');
    else o.push('        System.out.println(name.length());');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return 'name = ' + this.vtxt[c.value] + ' · ' + (c.check ? 'if (name != null) 확인 있음' : '확인 없음'); },
  columns: ['name이 가리키는 것', 'if 확인', 'length() 실행', '출력', '예외'],
  simulate: function (c) {
    var ev = [], sum = [], isNull = c.value === 'null', v = this.vtxt[c.value], len = c.value === 'kim' ? 3 : 0;
    var st = { val: '', hot: '', phase: '', ifres: '', out: [], exc: '', count: 0, got: '', ended: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. 변수에 값을 담는다
    st.val = c.value; st.hot = 'nm'; st.phase = 'init';
    if (c.value === 'kim') push('String name = "kim"; 줄이 실행됩니다. name은 변수이고, 변수에는 객체 자체가 아니라 객체를 가리키는 값(참조)이 담깁니다. 여기서는 name이 "kim"이라는 글자를 담은 문자열 객체를 가리키게 됩니다. 그 객체가 오른쪽 상자입니다.', '');
    else if (isNull) push('String name = null; 줄이 실행됩니다. name은 변수이고, 변수에는 객체를 가리키는 값이 담깁니다. 여기서 담은 null은 "아무 객체도 가리키지 않는다"는 값입니다. name 변수는 만들어졌고 null이 담겨 있지만, 가리키는 문자열 객체는 없습니다. 이 줄까지는 문제없이 실행됩니다.', '');
    else push('String name = ""; 줄이 실행됩니다. ""는 글자가 하나도 없는 문자열입니다. 글자가 없을 뿐 문자열 객체이므로, name은 이 객체를 가리키게 됩니다. 오른쪽 상자에 객체가 있고, 그 객체의 글자는 0개입니다.', '');

    // 2. if 확인
    var goCall = true;
    if (c.check) {
      st.hot = 'ck'; st.phase = 'if'; st.ifres = isNull ? 'false' : 'true';
      if (isNull) { goCall = false; push('if (name != null) 줄에서 조건을 계산합니다. name != null은 "name이 null이 아닌가", 곧 "name이 어떤 객체를 가리키고 있는가"를 묻는 조건입니다. name은 null이어서 가리키는 객체가 없으므로 조건의 값은 false이고, else 쪽 블록이 실행됩니다. 첫 번째 블록의 name.length() 줄은 실행되지 않습니다.', 'good'); }
      else push('if (name != null) 줄에서 조건을 계산합니다. name != null은 "name이 null이 아닌가", 곧 "name이 어떤 객체를 가리키고 있는가"를 묻는 조건입니다. ' + (c.value === 'kim' ? 'name은 "kim" 객체를 가리키고 있으므로' : 'name이 가리키는 ""는 글자가 없어도 객체이므로 null이 아니고,') + ' 조건의 값은 true이고, 첫 번째 블록이 실행됩니다.', '');
    }

    // 3. 호출 또는 else
    if (!goCall) {
      st.hot = 'ck'; st.phase = 'else'; st.out.push('이름 없음');
      push('else 블록의 System.out.println("이름 없음"); 줄이 실행되어 이름 없음을 출력합니다. name은 여전히 null이지만 name.length()를 부르지 않았으므로 예외가 나지 않았습니다.', 'good');
    } else if (isNull) {
      st.hot = 'nm'; st.phase = 'fail'; st.exc = 'NullPointerException';
      push('System.out.println(name.length()); 줄에서 name.length()를 먼저 계산합니다. 점(.)은 "name이 가리키는 객체에게 시킨다"는 표시이고, length()는 글자가 몇 개인지 세어 달라는 요청입니다. 그런데 name은 아무 객체도 가리키지 않아 요청을 받을 객체가 없습니다. 자바는 이때 NullPointerException이라는 예외를 던지고, length()는 실행되지 못했습니다.', 'bad');
      st.ended = true;
      push('이 예외를 처리하는 코드가 없으므로 main이 여기서 멈추고 프로그램이 오류와 함께 끝납니다(종료 코드 1). System.out.println이 값을 받지 못했으므로 화면에 출력된 것은 없습니다.', 'bad');
    } else {
      st.hot = 'nm'; st.phase = 'call'; st.count = 1;
      push((c.check ? '첫 번째 블록의 ' : '') + 'System.out.println(name.length()); 줄에서 name.length()를 먼저 계산합니다. 점(.)은 "name이 가리키는 객체에게 시킨다"는 표시이고, length()는 글자가 몇 개인지 세어 달라는 요청입니다. name이 가리키는 ' + (c.value === 'kim' ? '"kim" 객체가 글자를 세어' : '"" 객체에게 요청이 전달되고, 글자가 하나도 없는 객체이므로') + ' ' + len + '을 돌려줍니다.' + (c.value === 'empty' ? ' 0은 정상적인 결과이고 예외가 아닙니다. 객체가 있기 때문에 요청을 받을 수 있었습니다.' : ''), 'good');
      st.phase = 'ret'; st.got = String(len);
      push('돌려받은 ' + len + '이 println에 넘어갑니다.', '');
      st.phase = ''; st.out.push(String(len)); st.hot = '';
      push('System.out.println이 ' + len + '을 출력합니다.', 'good');
    }
    st.hot = ''; st.phase = ''; st.ended = true;
    if (!st.exc) push('main의 마지막 줄까지 실행되어 프로그램이 끝납니다. 예외는 나지 않았습니다.', '');

    // 요약: 첫 줄은 이 설정(물음)의 답
    if (c.value === 'kim' && !c.check) {
      sum.push('name 변수가 "kim" 문자열 객체를 가리키고 있으므로, name.length()는 그 객체에게 글자 수를 물어 3을 돌려받습니다. 변수에는 객체 자체가 아니라 객체를 가리키는 값이 담겨 있고, 점(.)은 그 객체에게 일을 시키는 표시입니다.');
      sum.push('이 코드가 되는 것은 name이 가리키는 객체가 있기 때문입니다. 다음 물음들은 그 객체가 없을 때와, 객체는 있는데 글자가 없을 때를 가려 봅니다.');
    } else if (isNull && !c.check) {
      sum.push('name에 null이 담겨 있으면 가리키는 객체가 없어서, name.length()에서 NullPointerException이 났습니다. 객체에게 시키는 줄인데 시킬 객체가 없기 때문입니다. 예외를 처리하는 코드가 없어 프로그램이 거기서 끝났고 출력은 없었습니다.');
      sum.push('예외가 난 곳은 null을 담은 줄이 아니라 null인 변수에 점을 찍은 name.length() 줄입니다. String name = null; 줄은 문제없이 실행됐습니다.');
    } else if (isNull) {
      sum.push('null인 name에 if (name != null)로 먼저 확인하면, 조건이 false여서 name.length()를 부르지 않고 else 블록으로 가므로 예외가 나지 않았습니다. 이름 없음이 출력됐습니다.');
      sum.push('확인이 null을 없앤 것은 아닙니다. name은 그대로 null이고, 점을 찍는 줄을 null일 때는 지나가게 한 것입니다.');
    } else if (c.value === 'kim') {
      sum.push('name이 "kim" 객체를 가리키고 있으면 name != null이 true여서 if 안으로 들어가 length()가 실행되고 3이 출력됩니다. 확인을 붙여도 값이 있을 때의 결과는 확인이 없을 때와 같습니다.');
      sum.push('확인은 null일 때만 다른 길로 보냅니다. 객체가 있을 때는 아무것도 바꾸지 않습니다.');
    } else if (!c.check) {
      sum.push('빈 문자열 ""은 null이 아니라 글자가 0개인 문자열 객체입니다. 객체가 있으므로 name.length()는 예외 없이 0을 돌려줍니다.');
      sum.push('null은 객체가 없는 것, ""는 객체는 있고 글자만 없는 것입니다. 출력 0과 NullPointerException은 전혀 다른 결과입니다.');
    } else {
      sum.push('빈 문자열 ""은 null이 아니므로 name != null이 true이고, 확인을 통과해 length()가 실행됩니다. 이름 없음이 아니라 0이 출력됐습니다.');
      sum.push('name != null은 객체가 있는지만 묻고, 글자가 있는지는 묻지 않습니다. 빈 문자열까지 걸러 내려면 다른 확인이 따로 필요합니다.');
    }
    var ifTxt = !c.check ? '쓰지 않음' : isNull ? 'null임 (false)' : 'null이 아님 (true)';
    return { events: ev, summary: sum, pt: this.pointTxt, excAt: isNull && !c.check ? this.excLine : '', row: [this.pointTxt[c.value], ifTxt, st.count + '번', st.out.length ? st.out.join(' / ') : '(출력 없음)', st.exc ? 'NullPointerException' : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 name 변수에 값을 대입하는 줄부터 시작합니다.'); return; }
    var rows = [
      ['name이 가리키는 것', s.val ? { v: sim.pt[s.val], cls: s.val === 'null' ? 'hot' : 'good' } : '아직 담기 전'],
      ['if (name != null)', !c.check ? { v: '쓰지 않음', cls: '' } : s.ifres ? { v: s.ifres === 'true' ? 'true (객체를 가리킴)' : 'false (null)', cls: s.ifres === 'true' ? 'good' : 'hot' } : '아직 실행 전'],
      ['출력', s.out.length ? s.out.join(' / ') : s.ended ? '(출력 없음)' : '아직 없음'],
      ['예외', s.exc ? { v: s.exc, cls: 'bad' } : s.ended ? { v: '없음', cls: 'good' } : '아직 없음'],
    ];
    H.table(v, ['일어난 일', '결과'], rows.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '실행 결과');
    H.counters(v, [[s.count, 'length()가 실행된 횟수'], [s.exc ? 1 : 0, '난 예외']]);
  },
  // 그림: 왼쪽에 name 변수, 오른쪽에 문자열 객체. name이 객체를 가리키면 화살표가 이어지고, name.length()가 객체에 닿으면 값이 돌아온다. null이면 가리키는 화살표가 없고 length() 화살표가 닿을 곳이 없어 끊긴다. 아래에 if 확인, 출력, 예외, length() 실행 횟수 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 330);
    var val = s ? s.val : '', ph = s ? s.phase : '', hot = s ? s.hot : '', isNull = val === 'null';
    var nmSub = !val ? '아직 담기 전' : isNull ? ['null', '아무 객체도 가리키지 않음'] : [val === 'kim' ? '"kim" 객체를 가리킴' : '"" 객체를 가리킴'];
    P.box('nm', 14, 16, 250, 118, { cls: ph === 'fail' ? 'bad' : hot === 'nm' ? 'hot now' : 'plain', title: 'name (변수)', sub: nmSub });
    var obSub = !val ? '아직 없음' : isNull ? (ph === 'fail' ? '시킬 객체가 없음' : '이 변수가 가리키는 객체 없음') : val === 'kim' ? ['"kim"', '글자 3개'] : ['""', '글자 0개'];
    P.box('ob', 416, 16, 250, 118, { cls: !val || isNull ? 'ghost' : ph === 'call' ? 'hot now' : 'plain', title: 'String 객체', sub: obSub });
    if (val && !isNull) P.arrow('ref', 'nm:r:0.8', 'ob:l:0.8', { cls: 'mut', label: '가리킴' });
    if (ph === 'call') P.arrow('call', 'nm:r:0.2', 'ob:l:0.2', { cls: 'hot', label: 'length()' });
    if (ph === 'fail') { P.arrow('call', 'nm:r:0.2', [404, 40], { cls: 'bad', label: 'length()' }); P.text('callx', 396, 45, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    if (ph === 'ret') P.arrow('ret', 'ob:l:0.5', 'nm:r:0.5', { cls: 'good', label: s.got });
    P.box('ck', 14, 150, 652, 36, { cls: !c.check ? 'ghost' : ph === 'if' || ph === 'else' ? 'hot now' : s && s.ifres ? 'plain' : 'ghost', title: 'if (name != null) 확인', right: !c.check ? '쓰지 않음' : s && s.ifres ? (s.ifres === 'true' ? 'true: 객체를 가리킴' : 'false: null') : '' });
    P.box('o1', 14, 194, 652, 36, { cls: s && s.out.length ? 'good' : 'ghost', title: '출력', right: s && s.out.length ? s.out.join(' / ') : s && s.ended ? '(출력 없음)' : '' });
    P.box('o2', 14, 238, 652, 36, { cls: s && s.exc ? 'bad' : s && s.ended ? 'good' : 'ghost', title: '예외', right: s && s.exc ? s.exc : s && s.ended ? '없음' : '' });
    P.box('o3', 14, 282, 652, 36, { cls: s && s.count ? 'wait' : s && s.exc ? 'bad' : 'ghost', title: 'length()가 실행된 횟수', right: (s ? s.count : 0) + '번' });
  },
  assume: '컴파일러와 실행 환경은 JDK 21.0.12.1(javac 21, java 21)입니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 소스(줄 단위로 같은 글)를 javax.tools로 컴파일하고, 컴파일된 Main을 새 java 프로세스로 실행해 표준 출력, 표준 오류의 첫 줄, 종료 코드를 잡은 결과와 대조했습니다. 대조한 것은 컴파일 성공 여부, 출력, 예외가 났는지(표준 오류의 첫 줄이 NullPointerException인지)와 예외가 난 줄(스택 추적이 가리킨 줄이 name.length() 줄), 종료 코드입니다. 표의 "length() 실행"은 출력에 글자 수가 나왔는지로, "if 확인"은 어느 블록의 출력이 나왔는지로 실제 출력에서 가려냈습니다. 단계 문장이 기대는 사실은 별도 프로그램으로 확인했습니다. 값 세 개 각각에 대해 name == null이 "kim"은 false, null은 true, ""는 false이고 length()는 3, (null이라 부를 수 없음), 0인 것, 그리고 String name = null; 줄은 예외 없이 실행되고 예외는 그다음 name.length() 줄에서 나며 프로그램이 종료 코드 1로 끝나는 것입니다. 문서는 직접 열어 확인했습니다. null 타입의 값은 null 참조 하나뿐이고 어떤 참조 타입에도 담을 수 있다는 것은 Java Language Specification(Java SE 21) 3.10.8절과 4.1절, 참조 값은 객체를 가리키거나 아무 객체도 가리키지 않는 null 참조라는 것은 4.3.1절, 참조를 ==와 !=로 비교하는 규칙은 15.21.3절, if문이 조건이 true이면 첫 번째 문장을, false이면 else의 문장을 실행한다는 것은 14.9.1절과 14.9.2절, 문자열 리터럴이 실행할 때 String 객체를 가리키는 값이고 ""가 빈 문자열이라는 것은 3.10.5절을 따랐습니다. NullPointerException API 문서는 null인 객체의 인스턴스 메서드를 부를 때 던져진다고 적고 있고(Java SE 21 API), String.length()와 isEmpty()의 설명도 같은 API 문서에서 열어 확인했습니다. 인스턴스 메서드 호출에서 대상이 null이면 NullPointerException이 난다는 문장은 JLS 15장(15.6절)의 것을 확인했고, 호출 처리를 자세히 정한 15.12.4.1절과 15.12.4.4절은 본문을 열지 못했습니다. 검증 실행에서는 javac를 기본 옵션(-g 없음)으로 써서 변수 이름이 클래스 파일에 들어가지 않았고, 그래서 NullPointerException의 상세 메시지에 name 대신 <local1>이 찍혔는데, 이 메시지는 명세가 정한 것이 아니라 이 JDK에서 관찰한 것이어서 화면에는 쓰지 않았습니다. 화면의 코드는 실제로 컴파일되는 모양 그대로이고 줄인 것이 없습니다. 이 밖에 int 같은 기본형 변수와 null, 배열이나 필드가 처음에 null인 것, 두 문자열을 ==와 equals로 견주는 것, null일 수 있는 값을 Optional로 다루는 방법은 다루지 않았고, Optional은 "세부 동작 실습: Optional"에서 다룹니다.',
});
