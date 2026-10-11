Lab.register({
  id: 'chkex', nav: '체크 예외와 언체크 예외', cat: '자바 언어', mode: 'step',
  title: '어떤 예외는 왜 처리하지 않으면 컴파일조차 안 되나',
  intro: '자바의 예외는 두 갈래입니다. 체크 예외(IOException 등)는 잡거나(try-catch) 던진다고 선언(throws)하지 않으면 컴파일러가 컴파일을 거부합니다. 언체크 예외(대표적으로 RuntimeException 계열)는 그런 강제가 없어서 아무 처리 없이도 컴파일됩니다. 예외의 종류와 처리 방식을 바꿔 가며 컴파일이 되는지, 실행하면 어떻게 끝나는지 확인하세요.',
  terms: ['Checked 예외와 Unchecked 예외', '예외(Exception)와 Error', 'throws 선언', '예외 감싸기'],
  controls: [
    { id: 'ex', label: 'read 메서드가 던지는 예외', type: 'select', value: 'io', options: [['io', 'IOException (체크 예외)'], ['rt', 'IllegalStateException (언체크 예외)']] },
    { id: 'how', label: '예외를 처리하는 방식', type: 'select', value: 'none', options: [['none', '아무것도 하지 않음'], ['catch', 'read 안에서 try-catch로 잡음'], ['throws', 'read에 throws 선언 (main은 그대로)'], ['throws2', 'read와 main 모두 throws 선언'], ['throwscatch', 'read에 throws 선언, main에서 try-catch'], ['wrap', 'read 안에서 잡아 RuntimeException으로 감싸 다시 던짐']] },
    { id: 'occur', label: '실행할 때 예외가 실제로 발생한다 (파일이 없다)', type: 'check', value: true, hint: '끄면 read(false)로 호출해 예외가 나지 않습니다. 컴파일 결과가 달라지는지 보세요.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '체크 예외를 아무 처리 없이 던집니다. 컴파일이 되지 않습니다.', v: { ex: 'io', how: 'none', occur: true } },
    { t: '언체크 예외는 그냥 컴파일된다', d: '같은 코드에서 예외만 바꿉니다. 컴파일은 되고, 실행 중에 프로그램이 멈춥니다.', v: { ex: 'rt', how: 'none', occur: true } },
    { t: '예외가 나지 않는 경우에도', d: '실행하면 예외가 나지 않을 코드인데도 컴파일 오류입니다.', v: { ex: 'io', how: 'none', occur: false } },
    { t: 'throws만 붙이면', d: '오류가 사라지지 않고 read를 부른 main으로 옮겨 갑니다.', v: { ex: 'io', how: 'throws', occur: true } },
    { t: 'main까지 throws', d: '컴파일은 되지만 예외를 잡는 곳이 없어 프로그램이 멈춥니다.', v: { ex: 'io', how: 'throws2', occur: true } },
    { t: '부른 쪽에서 잡기', d: 'read는 던진다고 알리고, main이 잡아서 처리합니다.', v: { ex: 'io', how: 'throwscatch', occur: true } },
    { t: 'RuntimeException으로 감싸기', d: 'throws 없이도 컴파일되지만 예외가 사라진 것은 아닙니다.', v: { ex: 'io', how: 'wrap', occur: true } },
  ],
  typeName: function (c) { return c.ex === 'io' ? 'IOException' : 'IllegalStateException'; },
  code: function (c) {
    var T = this.typeName(c), h = c.how, arg = c.occur ? 'true' : 'false', s = '';
    var readThrows = h === 'throws' || h === 'throws2' || h === 'throwscatch';
    if (c.ex === 'io') s += 'import java.io.IOException;\n\n';
    s += 'public class Main {\n';
    s += '    static String read(boolean missing)' + (readThrows ? ' throws ' + T : '') + ' {\n';
    if (h === 'catch' || h === 'wrap') {
      s += '        try {\n';
      s += '            if (missing) throw new ' + T + '("파일 없음");\n';
      s += '            return "내용";\n';
      s += '        } catch (' + T + ' e) {\n';
      if (h === 'catch') {
        s += '            System.out.println("read에서 잡음: " + e.getMessage());\n';
        s += '            return "기본값";\n';
      } else {
        s += '            throw new RuntimeException(e);\n';
      }
      s += '        }\n';
    } else {
      s += '        if (missing) throw new ' + T + '("파일 없음");\n';
      s += '        return "내용";\n';
    }
    s += '    }\n\n';
    s += '    public static void main(String[] args)' + (h === 'throws2' ? ' throws ' + T : '') + ' {\n';
    if (h === 'throwscatch') {
      s += '        try {\n';
      s += '            String s = read(' + arg + ');\n';
      s += '            System.out.println("읽음: " + s);\n';
      s += '        } catch (' + T + ' e) {\n';
      s += '            System.out.println("main에서 잡음: " + e.getMessage());\n';
      s += '        }\n';
    } else {
      s += '        String s = read(' + arg + ');\n';
      s += '        System.out.println("읽음: " + s);\n';
    }
    s += '        System.out.println("main 끝");\n';
    s += '    }\n';
    s += '}';
    return s;
  },
  label: function (c) { return (c.ex === 'io' ? 'IOException' : 'IllegalStateException') + ' · ' + { none: '처리 없음', catch: 'read에서 catch', throws: 'read만 throws', throws2: 'read와 main 모두 throws', throwscatch: 'read throws, main catch', wrap: '감싸 다시 던짐' }[c.how] + ' · ' + (c.occur ? '예외 발생' : '예외 없음'); },
  columns: ['컴파일', '오류가 난 줄', '출력', '끝난 모습'],
  simulate: function (c) {
    var T = this.typeName(c), io = c.ex === 'io', h = c.how, occur = !!c.occur, arg = occur ? 'true' : 'false', ev = [], sum = [];
    var full = (io ? 'java.io.' : 'java.lang.') + T;
    var HOW_READ = { none: '처리 없음', catch: 'try-catch로 잡음', throws: 'throws로 선언', throws2: 'throws로 선언', throwscatch: 'throws로 선언', wrap: '잡아서 감싸 다시 던짐' };
    var HOW_MAIN = { none: '처리 없음', catch: '처리 없음', throws: '처리 없음', throws2: 'throws로 선언', throwscatch: 'try-catch로 잡음', wrap: '처리 없음' };
    var st = { rh: HOW_READ[h], mh: HOW_MAIN[h], rv: '아직', mv: '아직', comp: '?', at: '', exc: '', caught: '', out: [], err: '', end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var MSG = 'unreported exception ' + T + '; must be caught or declared to be thrown';
    var failAt = io && h === 'none' ? 'read' : io && h === 'throws' ? 'main' : '';
    var errLine = failAt === 'read' ? 'if (missing) throw new ' + T + '("파일 없음");' : failAt === 'main' ? 'String s = read(' + arg + ');' : '';

    // ── 컴파일 단계
    if (io) {
      push('컴파일러가 read 메서드를 검사합니다: 안에 throw new IOException(...)이 있습니다. IOException은 체크 예외입니다. 체크 예외가 나올 수 있는 줄은 try-catch로 감싸거나, 그 메서드의 선언에 throws를 적어야만 컴파일됩니다.');
      if (h === 'none') { st.rv = '오류'; st.comp = '오류'; push('read에는 try-catch도 throws 선언도 없습니다: 컴파일 오류입니다. 컴파일러는 "' + MSG + '"라고 알립니다. "알리지 않은 예외 IOException이 있다. 잡거나, 던진다고 선언해야 한다"는 뜻입니다.', 'bad'); }
      if (h === 'catch') { st.rv = '통과'; push('read 안의 catch (IOException e)가 이 예외를 잡습니다: 예외가 read 밖으로 나갈 길이 없으므로 검사를 통과합니다.', 'good'); }
      if (h === 'wrap') { st.rv = '통과'; push('read 안의 catch (IOException e)가 이 예외를 잡습니다: 검사를 통과합니다. catch 안에서 새로 던지는 RuntimeException은 언체크 예외라서 검사 대상이 아닙니다.', 'good'); }
      if (h === 'throws' || h === 'throws2' || h === 'throwscatch') { st.rv = '통과'; push('read의 선언에 throws IOException이 있습니다: "이 메서드는 IOException을 밖으로 던질 수 있다"고 알렸으므로 read는 검사를 통과합니다. 그 대신 이 예외를 처리할 의무가 read를 부르는 쪽으로 넘어갑니다.', 'good'); }
      if (h === 'throws') { st.mv = '오류'; st.comp = '오류'; push('컴파일러가 main의 read(' + arg + ') 호출 줄을 검사합니다: read가 throws IOException으로 선언했으므로 이 줄에서 IOException이 나올 수 있습니다. main에는 try-catch도 throws도 없습니다. 컴파일 오류이고, 메시지는 같습니다("' + MSG + '"). 오류가 난 곳이 read 안이 아니라 read를 부른 줄로 옮겨 갔습니다.', 'bad'); }
      if (h === 'throws2') { st.mv = '통과'; push('컴파일러가 main의 read(' + arg + ') 호출 줄을 검사합니다: main도 throws IOException으로 선언했으므로 통과합니다. main은 프로그램이 시작하는 메서드라서, 여기서도 넘기면 예외를 받을 곳은 JVM뿐입니다.', ''); }
      if (h === 'throwscatch') { st.mv = '통과'; push('컴파일러가 main의 read(' + arg + ') 호출 줄을 검사합니다: 이 줄을 감싼 try에 catch (IOException e)가 있으므로 통과합니다.', 'good'); }
      if (h === 'catch' || h === 'wrap') { st.mv = '통과'; push('컴파일러가 main의 read(' + arg + ') 호출 줄을 검사합니다: read의 선언에 throws가 없으므로 이 줄에서 나올 수 있는 체크 예외가 없습니다. main은 아무것도 하지 않아도 통과합니다.', ''); }
    } else {
      st.rv = '검사 안 함';
      push('컴파일러가 read 메서드를 검사합니다: 안에 throw new IllegalStateException(...)이 있습니다. IllegalStateException은 RuntimeException의 하위 클래스, 곧 언체크 예외입니다. 컴파일러는 언체크 예외를 잡았는지, 선언했는지 따지지 않습니다.' + { none: ' try-catch도 throws도 없지만 그대로 통과합니다.', catch: ' 여기서는 catch로 잡았는데, 강제여서가 아니라 그렇게 하기로 고른 것입니다.', throws: ' throws IllegalStateException이라고 적는 것도 허용되지만, 읽는 사람에게 알리는 표시일 뿐입니다.', throws2: ' throws IllegalStateException이라고 적는 것도 허용되지만, 읽는 사람에게 알리는 표시일 뿐입니다.', throwscatch: ' throws IllegalStateException이라고 적는 것도 허용되지만, 읽는 사람에게 알리는 표시일 뿐입니다.', wrap: ' 이미 언체크 예외이므로 RuntimeException으로 감쌀 필요는 없지만, 컴파일은 됩니다.' }[h], '');
      st.mv = '검사 안 함';
      push('컴파일러가 main의 read(' + arg + ') 호출 줄을 검사합니다: 언체크 예외는 부르는 쪽에도 의무를 만들지 않습니다. ' + (h === 'throwscatch' ? 'main의 try-catch는 없어도 컴파일되지만, 잡고 싶어서 넣은 것입니다.' : h === 'throws' ? '체크 예외였다면 여기서 컴파일 오류가 났을 자리입니다.' : 'main도 그대로 통과합니다.'), '');
    }
    if (failAt) {
      st.end = '실행 못 함';
      push('컴파일이 실패했습니다: class 파일이 만들어지지 않으므로 프로그램을 실행할 수 없습니다.' + (occur ? ' 실행 중에 생길 문제를 실행 전에 미리 막은 것입니다.' : ' read(false)로 호출하므로 실행했다면 예외가 나지 않았을 코드입니다. 그래도 결과는 같습니다. 컴파일러는 "실제로 나는가"가 아니라 "날 수 있는가"를 보기 때문입니다.'), 'bad');
      sum.push('컴파일 오류입니다. 오류가 난 줄은 ' + (failAt === 'read' ? 'read 안의 throw 줄' : 'main에서 read를 부른 줄') + '이고, 프로그램은 실행되지 않습니다.');
      if (failAt === 'read') sum.push('체크 예외는 "잡거나, 던진다고 선언하거나" 둘 중 하나를 해야 컴파일됩니다. 파일이 없거나 네트워크가 끊기는 일처럼 프로그램 바깥의 사정으로 생기고 대비할 수 있는 문제를 빠뜨리지 않게 하려는 장치입니다.');
      else sum.push('throws는 예외를 처리하는 것이 아니라 "부르는 쪽이 처리하라"고 넘기는 선언입니다. 그래서 부른 쪽(main)이 다시 잡거나 선언해야 합니다. 의무는 누군가 잡을 때까지 호출한 쪽으로 계속 올라갑니다.');
      if (!occur) sum.push('예외가 실제로 나지 않는 경우에도 컴파일 결과는 같습니다. 검사는 실행 전에 코드의 모양만 보고 이루어집니다.');
      return { events: ev, summary: sum, msg: MSG, row: ['오류', errLine, '(실행 못 함)', '(실행 못 함)'] };
    }
    st.comp = '성공';
    push('컴파일에 성공했습니다: class 파일이 만들어졌고, 이제 프로그램을 실행합니다.', 'good');

    // ── 실행 단계
    st.at = 'main';
    push('main이 실행을 시작합니다: read(' + arg + ')를 호출합니다.', '');
    st.at = 'read';
    var crashed = '';
    if (!occur) {
      push('read 실행: missing이 false이므로 throw 줄을 건너뜁니다. 예외는 생기지 않고 "내용"을 돌려줍니다.', '');
      st.at = 'main'; st.out.push('읽음: 내용');
      push('main으로 돌아와 다음 줄을 실행합니다: "읽음: 내용"을 출력합니다.', '');
    } else {
      st.exc = T + '("파일 없음")';
      push('read 실행: missing이 true이므로 throw new ' + T + '("파일 없음")이 실행됩니다. 예외 객체가 만들어져 던져지고, 그 아래 줄(return "내용")은 실행되지 않습니다.', 'bad');
      if (h === 'catch') {
        st.exc = ''; st.caught = 'read'; st.out.push('read에서 잡음: 파일 없음');
        push('read의 catch 블록이 예외를 잡습니다: "read에서 잡음: 파일 없음"을 출력하고 "기본값"을 돌려줍니다. 예외는 여기서 처리가 끝났습니다.', 'good');
        st.at = 'main'; st.out.push('읽음: 기본값');
        push('main으로 돌아와 다음 줄을 실행합니다: "읽음: 기본값"을 출력합니다. main은 예외가 있었다는 것을 알지 못합니다.', '');
      } else {
        if (h === 'wrap') {
          st.exc = 'RuntimeException (원인: ' + T + ')';
          push('read의 catch 블록이 예외를 잡아 throw new RuntimeException(e)를 실행합니다: 원래 예외를 원인(cause)으로 담은 새 언체크 예외가 던져집니다. 예외의 종류만 바뀌었을 뿐, 문제가 해결된 것은 아닙니다.', 'bad');
          crashed = 'java.lang.RuntimeException: ' + full + ': 파일 없음';
        } else crashed = full + ': 파일 없음';
        st.at = 'main';
        if (h === 'throwscatch') {
          st.exc = ''; st.caught = 'main'; st.out.push('main에서 잡음: 파일 없음'); crashed = '';
          push('read에는 잡는 곳이 없어 예외가 read를 호출한 main으로 올라옵니다: 호출 줄을 감싼 try의 catch 블록이 잡아 "main에서 잡음: 파일 없음"을 출력합니다. try 안의 다음 줄("읽음" 출력)은 건너뜁니다.', 'good');
        } else {
          push((h === 'wrap' ? '새 예외가 read 밖으로 나와 main으로 올라옵니다' : 'read에는 잡는 곳이 없어 예외가 read를 호출한 main으로 올라옵니다') + ': main에서 read를 호출한 줄은 try로 감싸여 있지 않아 잡을 곳이 없습니다. main의 나머지 줄("읽음"과 "main 끝" 출력)은 실행되지 않고, 예외는 main 밖으로 나갑니다.', 'bad');
        }
      }
    }
    if (crashed) {
      st.at = 'jvm'; st.err = 'Exception in thread "main" ' + crashed; st.end = '예외로 중단';
      push('아무도 잡지 않은 예외가 JVM까지 올라왔습니다: JVM은 예외의 내용(' + crashed + ')과 지나온 메서드 목록을 오류 출력에 적고 프로그램을 끝냅니다. 종료 코드는 정상이 아님을 뜻하는 1입니다.', 'bad');
    } else {
      st.out.push('main 끝'); st.end = '정상 종료'; st.at = 'main';
      push('main의 마지막 줄을 실행합니다: "main 끝"을 출력하고 프로그램이 정상으로 끝납니다(종료 코드 0).', 'good');
    }
    var outText = st.out.length ? st.out.join(' / ') : '(없음)', endText = crashed ? '예외로 중단 (종료 코드 1): ' + crashed : '정상 종료 (종료 코드 0)';
    sum.push('컴파일 성공. 출력: ' + outText + '. 끝난 모습: ' + endText + '.');
    if (!io && (h === 'none' || h === 'throws' || h === 'throws2')) sum.push('언체크 예외는 처리하지 않아도 컴파일됩니다. 컴파일러가 알려 주지 않으므로' + (occur ? ' 실행 중에 예외가 나서야 문제를 알게 됩니다.' : ', 예외가 나지 않는 동안에는 문제가 있는지 알 수 없습니다.') + ' 언체크 예외는 대개 null을 쓰거나 잘못된 값을 넘기는 것 같은 코드의 실수를 나타내므로, 잡기보다 코드를 고쳐서 없앱니다.');
    if (!io && h === 'throws') sum.push('같은 모양의 코드가 IOException일 때는 main에서 컴파일 오류입니다. 예외의 종류만 바꿔 비교해 보세요.');
    if (!io && (h === 'catch' || h === 'throwscatch')) sum.push('언체크 예외도 잡을 수 있습니다. 강제가 없을 뿐입니다. 어디서 잡을지는 개발자가 정합니다.');
    if (!io && h === 'wrap') sum.push('이미 언체크 예외인 것을 RuntimeException으로 다시 감싸면 얻는 것이 없습니다. 감싸기는 체크 예외를 언체크 예외로 바꿀 때 쓰는 방법입니다.');
    if (!io) sum.push('Error(OutOfMemoryError, StackOverflowError 등)는 메모리 부족처럼 프로그램이 스스로 복구하기 어려운 JVM 수준의 문제를 나타냅니다. 자바 언어 명세는 RuntimeException 계열과 Error 계열을 묶어 언체크 예외라고 부릅니다. 그래서 Error도 컴파일러가 처리를 강제하지 않으며, 보통 잡지 않습니다.');
    if (io && h === 'catch') sum.push('예외가 난 메서드 안에서 잡으면 부르는 쪽은 아무것도 하지 않아도 됩니다. 다만 잡은 자리에서 제대로 대처할 수 있을 때만 이렇게 합니다. 잡아 놓고 아무것도 하지 않으면 문제가 있었다는 사실이 사라집니다.');
    if (io && h === 'throws2') sum.push('모든 메서드가 throws로 넘기면 컴파일은 되지만 잡는 곳이 없습니다.' + (occur ? ' 예외는 JVM까지 올라가 프로그램을 끝냅니다.' : ' 예외가 실제로 나면 JVM까지 올라가 프로그램을 끝냅니다.') + ' 컴파일러가 강제하는 것은 "잡거나 선언하는 것"까지이고, 제대로 대처했는지는 확인해 주지 않습니다.');
    if (io && h === 'throwscatch') sum.push('read는 무엇이 잘못될 수 있는지 throws로 알리고, 어떻게 대처할지 아는 쪽(main)이 잡습니다. 체크 예외가 의도한 쓰임새입니다.');
    if (io && h === 'wrap') sum.push('체크 예외를 RuntimeException으로 감싸면 throws를 줄줄이 적지 않아도 컴파일됩니다. 하지만 예외가 사라진 것이 아니라 컴파일러의 검사에서만 빠진 것입니다.' + (occur ? ' 잡는 곳이 없으면 이렇게 프로그램이 멈춥니다.' : '') + ' 감쌀 때는 원래 예외를 new RuntimeException(e)처럼 넘겨 원인이 남게 합니다.');
    if (!occur) sum.push('예외가 나지 않은 실행에서는 처리 방식이 무엇이든 결과가 같습니다. 차이는 컴파일 단계와, 예외가 실제로 났을 때 드러납니다.');
    return { events: ev, summary: sum, msg: '', row: ['성공', '없음', outText, endText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 먼저 컴파일러의 검사를, 이어서 프로그램의 실행을 한 단계씩 보여 줍니다.'); return; }
    var vc = function (x) { return x === '오류' ? 'bad' : x === '통과' ? 'good' : ''; };
    H.table(v, ['메서드', '예외 처리', '컴파일러의 판단'], [
      { cells: ['read', s.rh, { v: s.rv, cls: vc(s.rv) }] },
      { cells: ['main', s.mh, { v: s.mv, cls: vc(s.mv) }] },
    ], '컴파일러의 검사');
    var ln = H.lanes(v), WHERE = { main: 'main 실행 중', read: 'read 실행 중', jvm: 'JVM (프로그램 밖)' };
    H.lane(ln, '컴파일', s.comp === '?' ? '검사 중' : s.comp, s.comp === '성공' ? 'good' : s.comp === '오류' ? 'bad' : 'hot');
    H.lane(ln, '실행 위치', s.comp === '오류' ? '실행 못 함' : s.at ? (s.end === '정상 종료' ? '끝남' : WHERE[s.at]) : '아직 실행 전', s.at ? 'wait' : 'none');
    H.lane(ln, '예외', s.exc ? '던져진 상태: ' + s.exc : s.caught ? s.caught + '의 catch가 잡음' : '없음', s.exc ? 'bad' : s.caught ? 'good' : 'none');
    H.title(v, '콘솔 출력');
    var lines = s.out.slice(); if (s.err) lines.push(s.err + '  (오류 출력)');
    v.appendChild(H.el('pre', 'code', lines.length ? lines.join('\n') : '(아직 없음)'));
    H.counters(v, [[s.comp, '컴파일'], [s.end, '프로그램']]);
  },
  // 그림: 예외가 올라가는 길을 왼쪽에서 오른쪽으로 read, main, JVM 세 상자로 놓고, 상자마다 처리 방식과 컴파일러의 판단을 적는다. 실행 중에는 예외가 있는 상자와 잡은 상자에 색을 넣는다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], c = sim.c;
    var s = last ? last.snap : { rh: '', mh: '', rv: '아직', mv: '아직', comp: '?', at: '', exc: '', caught: '', out: [], err: '', end: '?' };
    P.size(680, 272);
    P.region('road', 16, 16, 648, 136, '예외가 올라가는 길 (호출한 쪽으로)');
    function cls(name, verdict) { return verdict === '오류' ? 'bad' : s.caught === name ? 'good' : s.at === name ? (s.exc ? 'bad now' : 'hot now') : 'plain'; }
    var HOW_READ = { none: '처리 없음', catch: 'try-catch로 잡음', throws: 'throws로 선언', throws2: 'throws로 선언', throwscatch: 'throws로 선언', wrap: '잡아서 감싸 다시 던짐' };
    var HOW_MAIN = { none: '처리 없음', catch: '처리 없음', throws: '처리 없음', throws2: 'throws로 선언', throwscatch: 'try-catch로 잡음', wrap: '처리 없음' };
    P.box('read', 30, 52, 176, 84, { cls: cls('read', s.rv), title: 'read()', sub: [HOW_READ[c.how], '컴파일러: ' + s.rv] });
    P.box('main', 252, 52, 176, 84, { cls: cls('main', s.mv), title: 'main()', sub: [HOW_MAIN[c.how], '컴파일러: ' + s.mv] });
    P.box('jvm', 474, 52, 176, 84, { cls: s.at === 'jvm' ? 'bad now' : 'ghost', title: 'JVM (프로그램 밖)', sub: s.at === 'jvm' ? ['오류를 출력하고', '프로그램을 끝냄'] : ['여기까지 오면', '프로그램이 끝남'] });
    var up1 = s.comp === '성공' && sim.row[0] === '성공' && (s.caught === 'main' || (s.at === 'main' && s.exc) || s.at === 'jvm');
    P.arrow('a1', 'read:r', 'main:l', { cls: up1 ? (s.caught === 'main' ? 'good' : 'bad') : 'mut dash' });
    P.arrow('a2', 'main:r', 'jvm:l', { cls: s.at === 'jvm' ? 'bad' : 'mut dash' });
    P.text('exc', 30, 176, s.comp === '오류' ? '컴파일 오류: 실행되지 않으므로 예외도 생기지 않습니다' : s.exc ? '던져진 예외: ' + s.exc : s.caught ? s.caught + '의 catch가 예외를 잡았습니다' : s.comp === '성공' ? '던져진 예외: 없음' : '컴파일러가 검사하는 중입니다', { cls: s.exc || s.comp === '오류' ? 'bad' : s.caught ? 'good' : 'mut' });
    P.box('r1', 16, 196, 320, 36, { cls: s.comp === '성공' ? 'good' : s.comp === '오류' ? 'bad' : 'ghost', title: '컴파일', right: s.comp });
    P.box('r2', 344, 196, 320, 36, { cls: s.end === '정상 종료' ? 'good' : s.end === '?' ? 'ghost' : 'bad', title: '프로그램', right: s.end });
    P.note('체크 예외는 길 위의 어느 메서드인가가 잡거나, 지나가는 메서드마다 throws로 선언해야 컴파일됩니다. 언체크 예외, 곧 RuntimeException 계열과 Error 계열(메모리 부족 같은 JVM 수준의 문제)은 컴파일러가 이 검사를 하지 않습니다.');
  },
  assume: '스물네 가지 조합 모두를 이 PC의 JDK 21에서 화면의 코드와 같은 소스로 실제로 컴파일하고, 컴파일된 것은 실행해서 컴파일 여부, 오류가 난 줄, 컴파일러 메시지, 출력, 종료 코드, 오류 출력의 첫 줄을 대조했습니다. 컴파일러 메시지는 명령줄 javac가 보여 주는 모양(클래스 이름만)으로 적었습니다. Error 계열을 아무 처리 없이 던져도 컴파일된다는 것과, Exception 자체를 던지면 체크 예외로 취급된다는 것도 같은 방법으로 확인했습니다. 모형은 메서드가 둘(read, main)인 경우만 다룹니다. 호출이 더 깊어도 규칙은 같아서, 체크 예외가 지나가는 메서드마다 잡거나 선언해야 합니다. 잡히지 않은 예외가 프로그램을 끝내는 것은 스레드가 main 하나뿐인 경우의 이야기입니다.',
});
