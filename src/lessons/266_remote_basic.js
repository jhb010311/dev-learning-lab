Lab.register({
  id: 'remote_basic', nav: '다른 서버 부르기', cat: '기초개념', mode: 'step', basic: true, deep: ['restclient', 'circuit', 'saga', 'gateway'],
  title: '서버가 다른 서버를 부르는 것은 메서드를 부르는 것과 무엇이 다른가',
  why: '모든 기능을 한 프로그램에 두면 결제 부분만 고쳐도 프로그램 전체를 다시 켜야 하고, 카드 결제나 문자 보내기처럼 다른 회사가 운영하는 기능은 내 프로그램만으로는 할 수 없다. 서버 간 호출은 그런 기능을 따로 실행되는 서버에 맡기고 네트워크로 요청을 보내 결과를 받게 해서, 서로 다른 프로그램끼리 일을 나눠 맡을 수 있게 한다.',
  use: '쇼핑몰 서버가 결제 회사의 서버에 결제를 요청하거나, 지도나 날씨 같은 정보를 다른 서비스의 서버에 물을 때 쓴다. 기능을 여러 서버로 나눈 서비스에서는 주문 서버가 회원 서버나 재고 서버를 부르는 일이 흔하다. 스프링에서는 스프링이 주는 RestClient로 요청을 보내고, 요청 팩토리에 연결 타임아웃과 읽기 타임아웃을 정해 두며, 연결 실패나 타임아웃으로 오는 ResourceAccessException을 받아 처리한다. 요청을 보낸 스레드가 답을 기다리며 멈춰 있지 않게 하려면 WebClient를 쓰고, 답을 바로 받지 않아도 되는 일은 메시지 큐로 넘기기도 한다.',
  intro: '큰 서비스는 기능을 여러 서버로 나누기도 합니다. 주문 서버와 결제 서버가 따로 실행되는 서로 다른 프로그램이라면, 주문 서버의 코드는 결제를 하려고 메서드를 부르는 대신 결제 서버에 네트워크로 요청(POST /pay)을 보내야 합니다. 스프링에서는 이 요청을 스프링이 주는 RestClient로 보냅니다. 화면의 코드는 두 가지입니다. 결제 기능이 같은 프로그램에 있으면 예시로 만든 PayService 객체의 메서드를 payService.pay()로 부르고, 다른 서버에 있으면 restClient.post().uri(...).retrieve().body(String.class)로 결제 서버를 부릅니다. 둘 다 "결제 완료"라는 String을 돌려받지만, 네트워크 너머의 서버를 부를 때는 상대가 꺼져 있어 연결이 거절될 수 있고, 상대가 느리면 답을 기다려야 합니다. 그래서 RestClient를 만들 때 답을 얼마나 기다릴지(타임아웃)를 정해 두고, 실패하면 오는 ResourceAccessException을 catch로 받습니다. 결과는 화면의 코드를 그대로 컴파일해 실행하고, 결제 서버 역할을 하는 작은 서버를 따로 띄워 맞춘 것입니다.',
  terms: ['서버 간 호출(네트워크 호출)', '메서드 호출', 'RestClient', '연결 타임아웃과 읽기 타임아웃', 'ResourceAccessException'],
  controls: [
    { id: 'where', label: '결제 기능이 있는 곳', type: 'select', value: 'remote', options: [['remote', '다른 서버(결제 서버)에 있다: RestClient로 부른다'], ['local', '같은 프로그램의 PayService에 있다: 메서드로 부른다']] },
    { id: 'pay', label: '결제 쪽의 상태', type: 'select', value: 'ok', options: [['ok', '0.1초 뒤 "결제 완료"를 돌려준다'], ['down', '결제 서버가 꺼져 있다'], ['slow', '3초 뒤 "결제 완료"를 돌려준다']] },
    { id: 'timeout', label: 'RestClient에 타임아웃(연결 1초, 읽기 1초)을 정한다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '다른 서버를 부르는 코드는 어떻게 생겼고, 결제 서버가 0.1초 뒤 답하면 무엇을 돌려받나', d: 'RestClient로 결제 서버에 POST /pay를 보내고, 약 0.1초 뒤 "결제 완료"를 String으로 돌려받습니다.', v: { where: 'remote', pay: 'ok', timeout: true } },
    { t: '같은 프로그램의 메서드라면', q: '결제 기능이 다른 서버가 아니라 같은 프로그램의 PayService에 있으면 코드는 무엇이 다른가', d: 'payService.pay() 한 줄로 부르고, 주소도 연결도 타임아웃도 없습니다. 돌려받는 것은 같은 "결제 완료"입니다.', v: { where: 'local', pay: 'ok', timeout: true } },
    { t: '결제 서버가 꺼져 있으면', q: '결제 서버가 꺼져 있으면', d: '연결이 거절되어 곧바로 ResourceAccessException이 나고, 원인은 ConnectException입니다.', v: { where: 'remote', pay: 'down', timeout: true } },
    { t: '같은 프로그램이면 결제 쪽만 꺼질 수 있나', q: '결제 기능이 같은 프로그램의 메서드라면 "결제 쪽만 꺼져 있다"는 일이 생기나', d: '생기지 않습니다. 주문 코드가 실행되는 동안에는 pay도 부를 수 있어서 처음과 같이 "결제 완료"를 받습니다.', v: { where: 'local', pay: 'down', timeout: true } },
    { t: '결제 서버가 3초 뒤에 답하면', q: '결제 서버가 0.1초 뒤가 아니라 3초 뒤에 답하면', d: '읽기 타임아웃 1초에 걸려 ResourceAccessException이 나지만, 결제 서버는 3초 뒤에 결제를 끝냅니다.', v: { where: 'remote', pay: 'slow', timeout: true } },
    { t: '타임아웃을 정하지 않으면', q: 'RestClient.create()로 타임아웃 없이 만들고 결제 서버가 3초 뒤에 답하면', d: '3초를 모두 기다려 "결제 완료"를 받습니다.', v: { where: 'remote', pay: 'slow', timeout: false } },
    { t: '같은 프로그램의 메서드가 3초 걸리면', q: '같은 프로그램의 pay가 3초 걸리면', d: '메서드 호출도 3초를 기다립니다. 그동안 이 스레드가 pay의 본문을 실행하고 있고, 타임아웃을 정하는 자리는 없습니다.', v: { where: 'local', pay: 'slow', timeout: true } },
  ],
  DELAY: { ok: 100, down: 100, slow: 3000 },
  // 화면의 코드와 대조 프로그램(verify/spring/src/RemoteBasicProbe.java)이 컴파일해 실행한 소스는 같은 글이다(포트 9000만 실제 빈 포트로 바꾼다).
  code: function (c) {
    var o = [];
    if (c.where === 'local') {
      var ms = this.DELAY[c.pay];
      o.push('// 결제도 주문 코드와 같은 프로그램에서 실행된다. OrderApp과 PayService는 예시로 지은 이름이다.',
        'public class OrderApp {',
        '    public static void main(String[] args) throws InterruptedException {',
        '        PayService payService = new PayService();');
      if (c.timeout) o.push('        // 메서드를 부르는 줄에는 기다리는 시간(타임아웃)을 정하는 자리가 없다');
      o.push('        String result = payService.pay();       // 같은 프로그램의 메서드를 부른다',
        '        System.out.println(result);',
        '    }',
        '}',
        '',
        'class PayService {',
        '    String pay() throws InterruptedException {',
        '        Thread.sleep(' + ms + ');' + (ms < 1000 ? ' ' : '') + '                     // 결제 처리에 ' + (ms / 1000) + '초 걸린다고 친다',
        '        return "결제 완료";',
        '    }',
        '}');
      return o.join('\n');
    }
    o.push('// 주문 서버의 코드. 결제는 따로 실행되는 결제 서버가 맡는다. OrderApp은 예시로 지은 이름이다.');
    if (c.timeout) o.push('import java.time.Duration;', '', 'import org.springframework.http.client.SimpleClientHttpRequestFactory;');
    o.push('import org.springframework.web.client.ResourceAccessException;',
      'import org.springframework.web.client.RestClient;',
      '',
      'public class OrderApp {',
      '    public static void main(String[] args) {');
    if (c.timeout) o.push('        // 기다리는 시간(타임아웃)은 실제로 연결을 맺고 요청을 보내는 요청 팩토리에 정한다',
      '        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();',
      '        factory.setConnectTimeout(Duration.ofSeconds(1));  // 연결을 맺기까지 최대 1초',
      '        factory.setReadTimeout(Duration.ofSeconds(1));     // 연결된 뒤 답을 최대 1초 기다린다',
      '        RestClient restClient = RestClient.builder()',
      '                .requestFactory(factory)',
      '                .build();');
    else o.push('        RestClient restClient = RestClient.create();   // 타임아웃을 정하지 않는다');
    o.push('',
      '        try {',
      '            String result = restClient.post()',
      '                    .uri("http://localhost:9000/pay")    // 결제 서버의 주소 (9000은 예시 번호)',
      '                    .retrieve()',
      '                    .body(String.class);                 // 답의 본문을 String으로 받는다',
      '            System.out.println(result);',
      '        } catch (ResourceAccessException e) {           // 연결 실패나 타임아웃',
      '            System.out.println("호출 실패: " + e.getCause());',
      '        }',
      '    }',
      '}');
    return o.join('\n');
  },
  label: function (c) {
    if (c.where === 'local') return '같은 프로그램의 메서드 · pay가 ' + (c.pay === 'slow' ? '3초' : '0.1초') + ' 걸림' + (c.pay === 'down' ? ' (결제 쪽만 꺼질 수 없음)' : '');
    return '다른 서버 · ' + { ok: '0.1초 뒤 답함', down: '꺼져 있음', slow: '3초 뒤 답함' }[c.pay] + ' · ' + (c.timeout ? '타임아웃 1초' : '타임아웃 없음');
  },
  columns: ['호출의 결과', '걸린 시간', '결제가 끝났나'],
  simulate: function (c) {
    var ev = [], sum = [], pay = c.pay, tm = !!c.timeout, local = c.where === 'local', row;
    var st = { at: '0초', od: ['plain', ['대기']], py: [!local && pay === 'down' ? 'ghost' : 'plain', !local && pay === 'down' ? ['꺼져 있음'] : ['대기']], req: null, res: null, got: '아직', took: '아직', payEnd: '아직', payEndCls: '', rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    if (local) {
      var ms = pay === 'slow' ? 3000 : 100, secTxt = pay === 'slow' ? '3초' : '0.1초', lnote = '';
      if (pay === 'down') lnote = ' 결제 쪽의 상태로 "결제 서버가 꺼져 있다"를 골랐지만, 결제 기능이 같은 프로그램의 메서드이면 그런 일은 생기지 않습니다. 프로그램이 멈추면 주문 코드도 함께 멈추므로, 주문 코드가 실행되는 동안 pay만 꺼져 있을 수는 없습니다. 그래서 코드도 처음 설정과 같고, pay는 0.1초 뒤 돌아옵니다.';
      if (tm) lnote += ' 타임아웃을 정하도록 골랐지만, 메서드를 부르는 줄에는 기다리는 시간을 정하는 자리가 없어서 코드에는 주석 한 줄만 보탰습니다.';
      st.od = ['hot', ['main 실행 중']]; st.py = ['plain', ['new PayService()']];
      st.rows.push(['0초', 'new PayService()로 객체를 만듦']);
      push('main이 new PayService()로 PayService 객체를 만듭니다. PayService는 이 실습에서 예시로 만든 클래스이고, OrderApp과 같은 코드에 선언되어 주문 코드와 같은 프로그램(자바 프로세스 하나)에서 실행됩니다.' + lnote, '');
      st.od = ['wait', ['pay()를 부름']]; st.py = ['hot', ['pay 본문 실행 중', 'Thread.sleep(' + ms + ')']]; st.req = ['hot', 'pay() 호출'];
      st.rows.push(['0초', 'payService.pay()를 부름']);
      push('payService.pay()를 부릅니다. 같은 프로그램의 메서드를 부르는 것이라 주소도 연결도 없이, 실행이 곧바로 pay의 본문으로 넘어갑니다. main을 실행하던 스레드가 그대로 pay의 본문을 실행합니다. 본문의 Thread.sleep(' + ms + ')은 결제 처리에 ' + secTxt + '가 걸린다고 치고 넣은 줄입니다.' + (pay === 'slow' ? ' 그동안 이 스레드는 pay의 본문을 실행하는 중이라 다른 일을 하지 않습니다.' : ''), '');
      st.at = secTxt; st.py = ['good', ['return "결제 완료"']]; st.res = ['good', '"결제 완료"']; st.od = ['good', ['result = "결제 완료"']];
      st.got = '"결제 완료"를 돌려받음'; st.took = '약 ' + secTxt; st.payEnd = '예 (' + secTxt + ' 뒤)'; st.payEndCls = 'good';
      st.rows.push([secTxt, 'pay가 "결제 완료"를 돌려주고, println이 결제 완료를 찍음']);
      push(secTxt + '가 지나 pay가 return "결제 완료"로 String을 돌려주고, result에 대입됩니다. System.out.println(result)가 결제 완료를 찍습니다. 걸린 시간은 약 ' + secTxt + '입니다.', 'good');
      if (pay === 'slow') {
        push('메서드 호출도 본문이 오래 걸리면 그만큼 기다립니다. 다만 기다리는 동안 이 스레드가 바로 그 일(pay의 본문)을 하고 있었고, 결과는 본문이 끝나자 돌아왔습니다. 다른 서버를 부를 때는 일은 다른 프로그램이 하고 이 스레드는 답을 기다리기만 하므로, 상대가 늦거나 멈추면 언제 그만 기다릴지를 타임아웃으로 정해 둡니다.', 'good');
        row = ['"결제 완료"를 돌려받음', '약 3초', '예 (3초 뒤)'];
        sum.push('같은 프로그램의 pay가 3초 걸리면 main도 3초 뒤에 "결제 완료"를 돌려받습니다. 그 3초 동안 이 스레드는 pay의 본문을 실행하고 있었습니다.');
        sum.push('메서드를 부르는 줄에는 타임아웃을 정하는 자리가 없습니다. 다른 서버를 부를 때는 이 스레드가 기다리기만 하고 일은 결제 서버가 하므로, RestClient의 요청 팩토리에 기다리는 시간을 정해 둡니다. 결제 서버가 3초 뒤에 답하는 물음과 견주어 볼 수 있습니다.');
      } else {
        push('돌려받은 것은 결제 서버를 부를 때와 같은 "결제 완료"입니다. 다른 점은 그 사이에 네트워크가 없다는 것입니다. 상대가 꺼져 있어 연결이 거절되거나, 답이 늦어 기다림을 끊는 일이 이 호출에는 없고, 그래서 이 코드에는 타임아웃 설정도 ResourceAccessException을 받는 catch도 없습니다.', 'good');
        row = ['"결제 완료"를 돌려받음', '약 0.1초', '예 (0.1초 뒤)'];
        sum.push(pay === 'down' ? '결제 기능이 같은 프로그램의 메서드이면 결제 쪽만 꺼져 있는 일은 없습니다. pay는 처음 설정과 같이 0.1초 뒤 "결제 완료"를 돌려주었습니다.' : '같은 프로그램의 메서드는 payService.pay() 한 줄로 부르고, 실행이 곧바로 pay의 본문으로 넘어가 0.1초 뒤 "결제 완료"를 돌려받습니다.');
        sum.push('다른 서버를 부르는 코드와 견주면, 주소(uri), RestClient와 요청 팩토리, 타임아웃, ResourceAccessException을 받는 catch가 모두 없습니다. 네트워크가 끼지 않아서 연결 실패나 기다림을 끊는 일이 생기지 않기 때문입니다.');
      }
      return { events: ev, summary: sum, row: row };
    }
    // 다른 서버를 부르는 경우
    st.od = ['hot', ['RestClient를 만듦']];
    st.rows.push(['0초', tm ? '요청 팩토리에 타임아웃 1초를 정하고 RestClient를 만듦' : 'RestClient.create()로 만듦 (타임아웃 없음)']);
    push('주문 서버의 main이 RestClient를 만듭니다. RestClient는 스프링(spring-web)이 주는 HTTP 클라이언트로, 다른 서버에 HTTP 요청을 보내고 답을 받는 일을 합니다. OrderApp은 예시로 지은 클래스 이름입니다. ' + (tm ? '먼저 스프링이 주는 SimpleClientHttpRequestFactory(요청 팩토리: 실제로 연결을 맺고 요청을 보내는 부품)를 만들어, setConnectTimeout으로 연결을 맺기까지 최대 1초, setReadTimeout으로 연결된 뒤 답을 최대 1초 기다리도록 정합니다. 그리고 RestClient.builder()에 이 팩토리를 넘겨 RestClient를 만듭니다.' : 'RestClient.create()로 만들었고, 기다리는 시간(타임아웃)은 정하지 않았습니다.') + (pay === 'down' && tm ? ' 코드는 처음 설정과 같고, 결제 서버 프로그램이 꺼져 있다는 것만 다릅니다.' : ''), '');
    st.od = ['wait', ['POST /pay를 보냄']]; st.req = ['hot', 'POST /pay (네트워크)'];
    st.rows.push(['0초', '결제 서버(localhost:9000)에 POST /pay를 보냄']);
    push('restClient.post().uri("http://localhost:9000/pay").retrieve().body(String.class) 문장이 실행됩니다. 겉모양은 메서드를 이어 부르는 것이지만, 이 문장이 하는 일은 결제 서버에 연결을 맺고 POST /pay 요청을 네트워크로 보낸 뒤 답을 받는 것입니다. 결제를 하는 코드는 이 프로그램에 없고, 따로 실행되는 결제 서버 프로그램에 있습니다. post()는 HTTP 메서드를, uri(...)는 보낼 주소를 정하고, body(String.class)는 답의 본문을 String으로 바꿔 돌려줍니다.', '');
    if (pay === 'down') {
      st.od = ['bad', ['연결 거절됨']]; st.req = ['bad', '연결 거절'];
      st.rows.push(['0초', '연결이 거절됨 (결제 서버는 요청을 받지 못함)']);
      push('주문 서버가 결제 서버에 연결을 맺으려 하지만, 결제 서버 프로그램이 꺼져 있어 그 포트에서 연결을 받는 프로그램이 없습니다. 운영체제가 연결을 곧바로 거절하고, 결제 서버는 요청을 받지 못합니다. 메서드 호출에는 연결이라는 단계가 없어서 이런 실패도 없습니다.', 'bad');
      st.od = ['bad', ['catch로 넘어감']]; st.got = 'ResourceAccessException (원인: ConnectException)'; st.took = '바로 (0.1초 안)'; st.payEnd = '아니요 (요청을 받지 못함)'; st.payEndCls = 'bad';
      st.rows.push(['0초', 'ResourceAccessException이 나고, catch가 "호출 실패: java.net.ConnectException…"을 찍음']);
      push('RestClient는 이 실패를 ResourceAccessException(스프링이 주는 예외: 연결 실패나 타임아웃처럼 응답을 얻지 못했을 때 던짐)으로 던지고, 그 원인(getCause())은 자바가 주는 java.net.ConnectException입니다. result에는 아무것도 대입되지 않고 실행이 catch 블록으로 넘어가 "호출 실패: java.net.ConnectException…"을 찍습니다.' + (tm ? ' 정해 둔 타임아웃은 쓰이지 않았습니다. 연결이 곧바로 거절되어 기다릴 일이 없었기 때문입니다.' : ' 타임아웃을 정하지 않았어도 연결이 곧바로 거절되므로 결과가 같습니다.'), 'bad');
      row = ['ResourceAccessException (원인: ConnectException)', '바로 (0.1초 안)', '아니요 (요청을 받지 못함)'];
      sum.push('결제 서버가 꺼져 있으면 연결이 거절되고, body(...)까지 이어진 호출 문장이 곧바로 ResourceAccessException을 던집니다. 원인은 java.net.ConnectException이고, 결제 서버는 요청을 받지 못했습니다.' + (tm ? '' : ' 타임아웃을 정했는지와 상관없이 결과가 같습니다.'));
      sum.push('메서드 호출과 달리 네트워크 너머의 상대는 꺼져 있을 수 있습니다. 그래서 다른 서버를 부르는 코드는 ResourceAccessException을 받아 무엇을 할지(여기서는 "호출 실패"를 찍는 것)를 정해 둡니다.');
      return { events: ev, summary: sum, row: row };
    }
    var dTxt = pay === 'slow' ? '3초' : '0.1초';
    st.py = ['wait', ['POST /pay를 받음', '결제 처리 중 (' + dTxt + ')']]; st.od = ['wait', ['답을 기다림']];
    st.rows.push(['0초', '결제 서버가 POST /pay를 받아 결제를 처리함']);
    push('결제 서버가 POST /pay 요청을 받아 결제를 처리합니다. 이 결제 서버는 처리에 ' + dTxt + '가 걸립니다. 그동안 주문 서버의 main 스레드는 이 문장에서 멈춰 답을 기다리기만 하고, 결제를 하는 일은 결제 서버 프로그램이 합니다.', '');
    if (pay === 'ok') {
      st.at = '0.1초'; st.py = ['good', ['200 "결제 완료"']]; st.res = ['good', '200 결제 완료']; st.od = ['good', ['result = "결제 완료"']];
      st.got = '"결제 완료"를 돌려받음'; st.took = '약 0.1초'; st.payEnd = '예 (0.1초 뒤)'; st.payEndCls = 'good';
      st.rows.push(['0.1초', '결제 서버가 200 "결제 완료"로 답하고, println이 결제 완료를 찍음']);
      push('0.1초 뒤 결제 서버가 200 응답으로 본문 "결제 완료"를 보냅니다. body(String.class)가 이 본문을 String으로 돌려주고, result에 대입됩니다. System.out.println(result)가 결제 완료를 찍습니다.' + (tm ? ' 정해 둔 1초보다 일찍 답이 와서 타임아웃은 쓰이지 않았습니다.' : ' 타임아웃을 정하지 않았지만 답이 곧 와서 결과에 드러나지 않았습니다.'), 'good');
      row = ['"결제 완료"를 돌려받음', '약 0.1초', '예 (0.1초 뒤)'];
      sum.push('다른 서버를 부르는 것은 네트워크로 요청을 보내고 답을 기다리는 일입니다. 주문 서버가 RestClient로 결제 서버에 POST /pay를 보냈고, 약 0.1초 뒤 "결제 완료"를 String으로 돌려받았습니다.');
      sum.push('돌려받는 것은 같은 프로그램의 메서드를 부를 때와 같은 String이지만, 이 결과를 얻으려면 결제 서버가 켜져 있고 제때 답해야 했습니다. ' + (tm ? '꺼져 있거나 늦게 답하는 경우는 다음 물음들에서 봅니다.' : '타임아웃을 정하지 않았다는 것은 상대가 늦게 답할 때 드러납니다.'));
      return { events: ev, summary: sum, row: row };
    }
    if (tm) {
      st.at = '1초'; st.od = ['bad', ['읽기 타임아웃', '기다림을 끊음']]; st.req = ['bad', '끊음'];
      st.got = 'ResourceAccessException (원인: SocketTimeoutException)'; st.took = '약 1초';
      st.rows.push(['1초', '읽기 타임아웃으로 ResourceAccessException이 나고, catch가 "호출 실패: java.net.SocketTimeoutException: Read timed out"을 찍음']);
      push('연결된 뒤 1초가 지나도록 답이 오지 않아 읽기 타임아웃(setReadTimeout의 1초)에 걸립니다. 요청 팩토리가 기다림을 끊고, RestClient는 ResourceAccessException을 던집니다. 그 원인은 자바가 주는 java.net.SocketTimeoutException(Read timed out)입니다. 실행이 catch 블록으로 넘어가 "호출 실패: java.net.SocketTimeoutException: Read timed out"을 찍습니다. 걸린 시간은 약 1초입니다.', 'bad');
      st.at = '3초'; st.py = ['good', ['결제 처리를 끝냄']]; st.payEnd = '예 (3초 뒤, 주문 서버가 포기한 뒤)'; st.payEndCls = 'bad';
      st.rows.push(['3초', '결제 서버가 결제 처리를 끝냄 (주문 서버는 이미 연결을 닫음)']);
      push('그런데 결제 서버는 3초가 되자 결제 처리를 끝냈습니다. 주문 서버는 1초에 이미 기다림을 그만두고 연결을 닫은 뒤였습니다. 주문 서버의 코드는 결제가 됐는지 모른 채 실패로 처리했는데, 결제는 이루어졌습니다. 이 결제 서버는 연결이 닫혔는지 보지 않고 처리를 끝내도록 이 실습에서 쓴 서버입니다.', 'bad');
      row = ['ResourceAccessException (원인: SocketTimeoutException)', '약 1초', '예 (3초 뒤, 주문 서버가 포기한 뒤)'];
      sum.push('결제 서버가 3초 뒤에 답하면, 읽기 타임아웃을 1초로 정한 RestClient는 1초에 기다림을 끊고 ResourceAccessException을 던집니다. 원인은 java.net.SocketTimeoutException입니다.');
      sum.push('기다림을 그만두는 것과 상대의 일이 취소되는 것은 다릅니다. 결제 서버는 3초 뒤 결제를 끝냈으므로, 주문 서버는 실패로 처리했지만 결제는 이루어졌습니다. 그래서 타임아웃 뒤에는 결제가 됐는지 따로 알아내야 합니다. 메서드 호출에는 이렇게 부른 쪽은 그만두었는데 불린 쪽은 하던 일을 계속하는 일이 없습니다.');
    } else {
      st.at = '1초'; st.od = ['wait', ['1초가 지나도', '계속 기다림']];
      st.rows.push(['1초', '답이 없지만 계속 기다림 (타임아웃 없음)']);
      push('1초가 지났지만 결제 서버의 답이 오지 않습니다. 타임아웃을 정하지 않았으므로 RestClient는 포기하지 않고 계속 기다립니다.', 'bad');
      st.at = '3초'; st.py = ['good', ['200 "결제 완료"']]; st.res = ['good', '200 결제 완료']; st.od = ['good', ['result = "결제 완료"']];
      st.got = '"결제 완료"를 돌려받음'; st.took = '약 3초'; st.payEnd = '예 (3초 뒤)'; st.payEndCls = 'good';
      st.rows.push(['3초', '결제 서버가 200 "결제 완료"로 답하고, println이 결제 완료를 찍음']);
      push('3초가 되자 결제 서버가 200 응답으로 "결제 완료"를 보내고, body(String.class)가 그 String을 돌려줍니다. println이 결제 완료를 찍습니다. 결과는 성공이지만, 3초 동안 main 스레드는 답을 기다리기만 했습니다.', 'bad');
      row = ['"결제 완료"를 돌려받음', '약 3초', '예 (3초 뒤)'];
      sum.push('타임아웃을 정하지 않은 RestClient(RestClient.create())는 결제 서버가 3초 뒤에 답할 때까지 기다렸고, 약 3초 뒤 "결제 완료"를 돌려받았습니다.');
      sum.push('화면 밖에서 따로, 결제 서버가 요청을 받고도 끝내 답하지 않게 해 실행해 보았더니, 타임아웃이 없는 이 RestClient는 4초가 지나도록 포기하지 않았습니다(그 이상은 지켜보지 않았습니다). 타임아웃을 정해야 느리거나 멈춘 상대 때문에 내 서버의 스레드까지 멈춰 서지 않습니다.');
    }
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 main이 시작하는 것부터 보입니다.'); return; }
    H.table(v, ['시각', '일어난 일'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '일어난 일');
    H.table(v, ['항목', '값'], [
      { cls: s.got === '아직' ? 'gone' : '', cells: ['호출의 결과', s.got === '아직' ? '아직' : { v: s.got, cls: s.got.indexOf('결제 완료') >= 0 ? 'good' : 'bad' }] },
      { cls: s.took === '아직' ? 'gone' : '', cells: ['걸린 시간', s.took] },
      { cls: s.payEnd === '아직' ? 'gone' : '', cells: ['결제가 끝났나', s.payEnd === '아직' ? '아직' : { v: s.payEnd, cls: s.payEndCls }] },
    ], '결과');
  },
  // 그림: 왼쪽에 부르는 쪽(주문 코드의 main), 오른쪽에 불리는 쪽(같은 프로그램이면 PayService 객체, 다른 서버면 결제 서버). 가운데 위에 둘이 한 프로그램인지 따로 실행되는 두 프로그램인지를 적는다. 부르는 화살표는 위쪽, 돌려주는 화살표는 아래쪽이다. 연결이 거절되거나 기다림을 끊으면 부르는 화살표가 빨강이 된다. 맨 아래에 호출의 결과, 걸린 시간, 결제가 끝났는지를 적는다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, local = sim.c.where === 'local', down = !local && sim.c.pay === 'down';
    P.size(680, 318);
    P.text('clk', 340, 22, '지난 시간 ' + (s ? s.at : '0초'), { anchor: 'middle', bold: true });
    P.text('kind', 340, 48, local ? '프로그램 하나 (자바 프로세스 하나): 메서드 호출' : '프로그램 둘 (따로 실행됨): 네트워크로 부름', { anchor: 'middle' });
    P.box('od', 14, 62, 200, 100, { cls: s ? s.od[0] : 'plain', title: local ? 'main (주문 코드)' : '주문 서버의 main', sub: s ? s.od[1] : ['대기'] });
    P.box('py', 466, 62, 200, 100, { cls: s ? s.py[0] : (down ? 'ghost' : 'plain'), title: local ? 'PayService 객체' : '결제 서버 (다른 프로그램)', sub: s ? s.py[1] : (down ? ['꺼져 있음'] : ['대기']) });
    if (s && s.req) P.arrow('req', 'od:r:0.3', 'py:l:0.3', { cls: s.req[0], label: s.req[1] });
    if (s && s.res) P.arrow('res', 'py:l:0.75', 'od:r:0.75', { cls: s.res[0], label: s.res[1] });
    P.box('n1', 14, 190, 652, 36, { cls: s && s.got !== '아직' ? (s.got.indexOf('결제 완료') >= 0 ? 'good' : 'bad') : 'ghost', title: '호출의 결과', right: s ? s.got : '아직' });
    P.box('n2', 14, 234, 652, 36, { cls: s && s.took !== '아직' ? 'wait' : 'ghost', title: '걸린 시간', right: s ? s.took : '아직' });
    P.box('n3', 14, 278, 652, 36, { cls: s && s.payEnd !== '아직' ? (s.payEndCls || 'plain') : 'ghost', title: '결제가 끝났나', right: s ? s.payEnd : '아직' });
  },
  assume: 'Spring Framework 7.0.9(spring-web)의 RestClient를 JDK 21.0.12.1(Windows 11)에서 실행해 대조했습니다. 열두 가지 조합(결제 기능이 있는 곳 두 가지, 결제 쪽의 상태 세 가지, 타임아웃을 정했는지 두 가지)을 모두, 화면의 코드와 같은 글을 OrderApp.java로 써서 javac로 컴파일하고 실행했습니다. 다른 서버를 부르는 코드는 주소의 9000만 실제로 연 빈 포트로 바꾸었습니다(9000은 예시 번호입니다). 결제 서버 역할은 대조 프로그램(verify/spring/src/RemoteBasicProbe.java)이 자바의 ServerSocket으로 127.0.0.1에 띄운 작은 HTTP 서버로, POST /pay를 받으면 0.1초 또는 3초 뒤 200 응답과 본문 "결제 완료"(text/plain, UTF-8)를 보냅니다. 꺼진 결제 서버는 포트를 열었다가 닫아 아무도 듣지 않는 포트를 만들어 흉내 냈습니다. 이 결제 서버는 주문 쪽이 연결을 닫았는지 보지 않고 처리를 끝내도록 이 실습에서 쓴 것이므로, 모든 서버가 그렇게 동작한다는 뜻은 아닙니다. 조합마다 main이 찍은 글, 걸린 시간, 결제 서버가 받은 요청 줄(POST /pay HTTP/1.1), 결제 서버가 처리를 끝낸 때와 그때 주문 쪽 연결이 이미 닫혀 있었는지를 모형과 대조했고, 화면의 코드가 실행한 소스와 같은 글인지도 확인했습니다(verify/spring/cmp_remote_basic.js). 걸린 시간은 화면에 어림으로 적었고, 실행에서 잰 값은 약 0.1초가 0.10~0.21초, 바로가 0.06초 이하, 약 1초가 1.01초, 약 3초가 3.01~3.08초였습니다. 같은 호출을 대조 프로그램에서 한 번 더 해서, catch에 잡힌 예외가 정확히 org.springframework.web.client.ResourceAccessException이고 원인이 java.net.ConnectException(연결 거절)과 java.net.SocketTimeoutException(Read timed out)임을 확인했습니다. catch가 찍는 글에서 ConnectException 뒤의 설명은 요청 팩토리에 따라 달랐습니다. 타임아웃을 정한 SimpleClientHttpRequestFactory는 "Connection refused: getsockopt"를 붙였고, RestClient.create()로 만든 것은 설명 없이 클래스 이름만 찍었습니다. RestClient.create()는 이 실행의 라이브러리 구성(Apache HttpClient, Jetty, Reactor Netty가 없음)에서 JDK의 HttpClient를 쓰는 JdkClientHttpRequestFactory를 골랐고, 타임아웃은 정하지 않았습니다. 다른 라이브러리가 있으면 다른 요청 팩토리를 고를 수 있습니다. 결제 서버가 요청을 받고도 끝내 답하지 않게 했을 때, RestClient.create()로 만든 RestClient는 4초가 지나도록 기다렸고(그 이상은 보지 않았습니다), 타임아웃 1초를 정한 RestClient는 약 1초에 ResourceAccessException(원인 SocketTimeoutException)으로 끝났습니다. 같은 프로그램의 PayService(예시로 만든 클래스)는 Thread.sleep으로 결제 처리에 걸리는 시간을 흉내 냈고, "결제 쪽만 꺼져 있다"는 일은 메서드에는 생기지 않으므로 처음 설정과 같은 0.1초로 실행했습니다. 메서드 호출에는 연결이라는 단계가 없다는 것과, 메서드를 부른 스레드가 그대로 본문을 실행한다는 것은 자바 언어의 동작을 설명한 것이고 따로 재지 않았습니다. 메서드 호출도 다른 스레드에 맡기고 Future.get에 시간을 주어 기다림에 한도를 둘 수는 있지만, 이 실습은 메서드를 그냥 부르는 줄만 다룹니다. 화면은 한 번 부르는 가장 단순한 경우만 다루었고, 연결 타임아웃이 실제로 걸리는 경우(연결 요청에 아무 답이 없는 상대)와 404·500 응답은 "외부 API 호출과 타임아웃", 실패하는 서버를 막아 주는 장치는 "서킷 브레이커", 여러 서버의 일을 되돌리는 방법은 "Saga와 Outbox", 요청을 한곳에서 받아 나누는 방법은 "게이트웨이와 점진적 전환"에서 다룹니다.',
});
