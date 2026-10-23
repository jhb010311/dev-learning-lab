Lab.register({
  id: 'queue_basic', nav: '메시지 큐', cat: '기초개념', mode: 'step', basic: true, deep: ['mq', 'kafka', 'saga'],
  title: '메시지 큐는 무엇이고, 직접 부르는 것과 무엇이 다른가',
  why: '한 서버가 다른 서버에 일을 직접 시키면, 상대가 일을 마칠 때까지 기다려야 하고, 상대가 꺼져 있으면 그 일은 실패해서 누군가 다시 보내 주지 않는 한 처리되지 않는다. 메시지 큐는 두 서버 사이에서 시킬 일을 메시지로 맡아 두어서, 일을 받는 쪽이 지금 켜져 있는지, 얼마나 바쁜지와 상관없이 시키는 쪽이 일을 넘길 수 있게 한다.',
  use: '주문이 끝난 뒤 보내는 알림 메일이나 문자, 올린 동영상의 변환처럼 시간이 걸리지만 바로 답하지 않아도 되는 일을 넘길 때 쓴다. 실제 서비스에서는 RabbitMQ나 Kafka 같은 메시지 브로커가 큐를 맡고, 스프링에서는 RabbitMQ라면 RabbitTemplate으로 보내고 @RabbitListener로 받으며, Kafka라면 KafkaTemplate과 @KafkaListener를 쓴다. 일을 하는 서버를 여러 대 두어 같은 큐에서 나눠 받게 하기도 한다. 결제 승인처럼 결과를 바로 받아야 다음으로 갈 수 있는 일은 큐 대신 요청을 직접 보낸다.',
  intro: '메시지 큐는 일을 시키는 서버와 일을 하는 서버 사이에 놓인, 시킬 일을 적어 두는 줄입니다. 실제로는 RabbitMQ나 Kafka 같은 메시지 브로커(메시지를 받아 두었다가 넘겨 주는 서버)가 큐를 맡고, 스프링에서는 스프링 AMQP가 주는 RabbitTemplate과 @RabbitListener로 RabbitMQ의 큐를 씁니다. 화면의 코드는 두 서버의 코드입니다. 주문 서버의 QueueConfig는 RabbitMQ에 이름이 order-created인 큐를 만듭니다(Queue는 스프링 AMQP가 주는 클래스입니다). 예시로 만든 OrderService의 order 메서드는 주문이 들어올 때마다 주문 번호를 rabbitTemplate.convertAndSend로 큐 order-created에 넣고 바로 돌아옵니다. 이렇게 큐에 넣는 짧은 데이터를 메시지라고 하고, order는 메시지를 보내는 쪽입니다. 알림 서버의 예시로 만든 Notifier 클래스에서 @RabbitListener(queues = "order-created")가 붙은 handle 메서드는, 큐에 메시지가 오면 스프링이 불러 줍니다(메시지를 받는 쪽). 이 실습은 큐를 지우고 주문 서버가 스프링이 주는 RestClient로 알림 서버에 요청을 직접 보내게 하거나(이때 알림 서버는 @PostMapping("/notify") 메서드로 받습니다), 알림 서버가 주문 3건을 보내는 동안 꺼져 있다가 나중에 켜지게 해 가며, 주문 서버가 받는 결과와 알림이 처리되는 모습을 봅니다. 이 컴퓨터에는 RabbitMQ가 없어서, 큐를 쓰는 쪽의 실행은 RabbitMQ 역할을 대신하는 작은 실행용 모형으로 했습니다. 직접 부르는 쪽은 스프링 부트에서 실제로 실행했습니다.',
  terms: ['메시지 큐', '메시지 브로커', 'RabbitTemplate', '@RabbitListener', '생산자와 소비자', 'ResourceAccessException'],
  controls: [
    { id: 'via', label: '주문 서버가 알림을 시키는 방법', type: 'select', value: 'queue', options: [['queue', 'rabbitTemplate.convertAndSend로 큐 order-created에 넣는다'], ['direct', '큐를 지우고 RestClient로 알림 서버에 직접 보낸다']] },
    { id: 'consumer', label: '알림 서버의 상태', type: 'select', value: 'up', options: [['up', '켜져 있다'], ['late', '주문 3건을 보내는 동안 꺼져 있다가 나중에 켜진다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '메시지 큐는 어떻게 생겼고, 주문 서버와 알림 서버 사이에 RabbitMQ의 큐를 두면 주문 3건의 알림은 어떻게 처리되나', d: '주문 서버의 convertAndSend는 메시지를 큐에 넣고 바로 돌아옵니다. 알림 서버의 @RabbitListener 메서드가 그 뒤에 넣은 차례대로 받아 처리합니다.', v: { via: 'queue', consumer: 'up' } },
    { t: '큐 없이 직접 부르면', q: '큐를 지우고 주문 서버가 RestClient로 알림 서버에 요청을 직접 보내면', d: '주문 서버는 알림 서버가 처리를 마치고 답할 때까지 기다린 뒤에야 결과를 받습니다.', v: { via: 'direct', consumer: 'up' } },
    { t: '직접 부르는데 알림 서버가 꺼져 있으면', q: 'RestClient로 직접 보내는데 알림 서버가 주문 3건을 보내는 동안 꺼져 있다가 나중에 켜지면', d: '요청 3건이 모두 ResourceAccessException으로 실패하고, 알림 서버가 켜져도 처리할 알림이 없습니다.', v: { via: 'direct', consumer: 'late' } },
    { t: '큐에 넣는데 알림 서버가 꺼져 있으면', q: 'convertAndSend로 큐에 넣는데 알림 서버가 주문 3건을 보내는 동안 꺼져 있다가 나중에 켜지면', d: '주문 3건은 성공하고, 메시지는 큐에 남아 있다가 알림 서버가 켜진 뒤 처리됩니다.', v: { via: 'queue', consumer: 'late' } },
  ],
  msg: function (i) { return '주문 ' + i + ' 알림'; },
  code: function (c) {
    var q = c.via === 'queue', L = [];
    L.push('// 주문 서버의 코드 (import 줄과 실행 클래스는 생략)');
    if (q) L.push(
      '// 큐를 만든다: Queue는 스프링 AMQP가 주는 클래스',
      '@Configuration',
      'class QueueConfig {',
      '    @Bean',
      '    Queue orderCreatedQueue() {',
      '        // RabbitMQ에 이름이 order-created인 큐를 만든다',
      '        return new Queue("order-created");',
      '    }',
      '}');
    L.push('',
      '// 예시로 만든 주문 서비스',
      '@Service',
      'class OrderService {');
    if (q) L.push(
      '    // 메시지를 보내는 도구: 스프링 AMQP가 주는 RabbitTemplate',
      '    @Autowired',
      '    RabbitTemplate rabbitTemplate;');
    else L.push(
      '    // 요청을 보내는 도구: 스프링이 주는 RestClient',
      '    RestClient restClient = RestClient.create();');
    L.push('',
      '    // 주문이 들어올 때마다 불린다(이 실습은 주문 1, 2, 3을 차례로)',
      '    void order(int no) {');
    if (q) L.push(
      '        // 큐 order-created에 주문 번호를 메시지로 넣고 바로 돌아온다',
      '        rabbitTemplate.convertAndSend("order-created", no);');
    else L.push(
      '        // 알림 서버에 주문 번호를 보내고 답을 기다린다(8081은 예시 번호)',
      '        restClient.post().uri("http://localhost:8081/notify")',
      '                .body(no).retrieve().toBodilessEntity();');
    L.push('    }', '}', '',
      '// 알림 서버의 코드 (import 줄과 실행 클래스는 생략)');
    if (c.consumer === 'late') L.push('// 알림 서버는 주문 3건을 보내는 동안 꺼져 있다가 나중에 켜진다');
    L.push('// 예시로 만든 알림 담당 클래스');
    L.push(q ? '@Component' : '@RestController');
    L.push('class Notifier {');
    if (q) L.push(
      '    // 받기: 큐 order-created에 메시지가 오면 스프링이 이 메서드를 부른다',
      '    @RabbitListener(queues = "order-created")',
      '    void handle(int no) {');
    else L.push(
      '    // 받기: POST /notify 요청이 오면 스프링이 이 메서드를 부른다',
      '    @PostMapping("/notify")',
      '    void handle(@RequestBody int no) {');
    L.push(
      '        // 알림을 보낸다(메일·문자를 보내는 일 대신 화면에 찍는다)',
      '        System.out.println("주문 " + no + " 알림 보냄");',
      '    }',
      '}');
    return L.join('\n');
  },
  label: function (c) { return (c.via === 'queue' ? '큐에 메시지를 넣음' : '알림 서버에 직접 요청') + ' · ' + (c.consumer === 'up' ? '알림 서버 켜져 있음' : '알림 서버 나중에 켜짐'); },
  columns: ['주문 서버가 받은 결과', '처리된 알림', '알림 서버가 켜질 때 큐에 있던 메시지'],
  simulate: function (c) {
    var ev = [], sum = [], q = c.via === 'queue', late = c.consumer === 'late', N = 3, i;
    var st = { os: 'plain', ost: ['대기'], ns: late ? 'ghost' : 'plain', nst: late ? ['꺼져 있음'] : ['켜져 있음'], qn: [], cur: '', a1: '', a2: '', a3: '', res: [], done: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function mq(n) { return '주문 번호 ' + n; }
    function ig(n) { return [0, 1, 3, 6, 7, 8].indexOf(n % 10) >= 0 ? '이' : '가'; }
    var devs = [];
    if (!q) devs.push('QueueConfig가 없어지고, OrderService가 RabbitTemplate 대신 RestClient로 알림 서버에 직접 보내며, Notifier가 @RabbitListener 대신 @PostMapping("/notify")로 받게 바뀐 것');
    if (late) devs.push('알림 서버가 꺼져 있다가 나중에 켜진다는 주석 줄이 늘어난 것');
    var note = devs.length ? ' 코드에서 처음 설정과 달라진 곳은 ' + devs.join(', ') + '입니다.' : '';
    // 1단계: 시작
    if (q) {
      push('주문 서버가 주문 ' + N + '건을 차례로 받습니다. 주문이 들어올 때마다 OrderService의 order 메서드가 불리고, order는 알림 서버에 시킬 일을 rabbitTemplate.convertAndSend("order-created", no)로 보냅니다. 보내는 것은 주문 번호 하나이고, 이렇게 보내는 짧은 데이터를 메시지라고 합니다. 메시지가 가는 곳은 알림 서버가 아니라 RabbitMQ의 큐 order-created입니다. 큐는 메시지를 넣은 차례대로 보관하고, 알림 서버에서는 @RabbitListener(queues = "order-created")가 붙은 handle 메서드가 큐의 메시지를 하나씩 받습니다. handle을 부르는 것은 우리 코드가 아니라 스프링입니다. ' + (late ? '알림 서버는 지금 꺼져 있고, 주문 ' + N + '건을 다 보낸 뒤에 켜집니다. 큐 order-created는 주문 서버의 QueueConfig가 만들었으므로 알림 서버가 꺼져 있어도 있습니다.' : '알림 서버는 지금 켜져 있고, 켜질 때 큐는 비어 있었습니다. 알림 하나를 보내는 데는 이 실행에서 0.3초가 걸리게 했습니다.') + note, '');
    } else {
      push('주문 서버가 주문 ' + N + '건을 차례로 받습니다. 이 코드에는 큐가 없습니다. 주문이 들어올 때마다 order 메서드가 RestClient로 알림 서버의 /notify 주소에 POST 요청을 직접 보내고, 요청의 본문은 주문 번호입니다. 알림 서버에서는 @PostMapping("/notify")가 붙은 handle 메서드가 그 요청을 받습니다. ' + (late ? '알림 서버는 지금 꺼져 있고, 주문 ' + N + '건을 다 보낸 뒤에 켜집니다.' : '알림 서버는 지금 켜져 있습니다. 알림 하나를 보내는 데는 이 실행에서 0.3초가 걸리게 했습니다.') + ' 다음 주문은 앞 주문의 order가 끝난 뒤에 들어옵니다.' + note, '');
    }
    // 주문 보내기
    for (i = 1; i <= N; i++) {
      var m = mq(i), al = this.msg(i), head = i === 1;
      if (q) {
        st.qn.push(m); st.res.push(['주문 ' + i, '성공']); st.os = 'wait'; st.ost = ['주문 ' + i + ' 결과', '성공']; st.a1 = 'good'; st.a2 = 'good';
        if (!late && head) { st.cur = m; st.ns = 'hot'; st.nst = ['"' + al + '"', '처리 중']; st.a3 = 'hot'; } else st.a3 = '';
        push(head
          ? 'order(1)이 convertAndSend로 주문 번호 1을 큐 order-created에 보내고, 큐가 이 메시지를 맨 뒤에 보관합니다. convertAndSend는 메시지를 보내고 바로 돌아오므로, order는 알림이 처리되기를 기다리지 않고 끝나고 이 주문의 결과는 성공입니다. 이 결과는 메시지를 큐에 보냈다는 뜻이고, 알림이 처리됐다는 뜻이 아닙니다.' + (late ? ' 알림 서버가 꺼져 있어도 메시지를 보낸 곳은 큐라서 상관이 없습니다. 큐에 쌓인 메시지는 1건입니다.' : ' 큐는 기다리고 있던 알림 서버의 handle에 이 메시지를 바로 넘겨 주고, handle이 "' + al + '" 처리를 시작합니다. 메시지는 처리를 마쳤다는 확인을 받을 때까지 큐에서 지워지지 않으므로, 큐에 있는 메시지는 1건입니다.')
          : 'order(' + i + ')' + ig(i) + ' 주문 번호 ' + i + '번을 큐에 보내고 바로 끝나, 이 주문의 결과(성공)를 받습니다. 큐에 있는 메시지는 ' + i + '건입니다.', 'good');
      } else if (late) {
        st.res.push(['주문 ' + i, '실패']); st.os = 'bad'; st.ost = ['주문 ' + i + ' 결과', '실패']; st.a1 = 'bad'; st.a2 = '';
        push(head
          ? 'order(1)이 RestClient로 주문 번호 1을 알림 서버에 직접 보냅니다. 알림 서버가 꺼져 있어 그 번호(포트)에서 기다리는 프로그램이 없으므로 연결이 거부되고, RestClient가 ResourceAccessException을 던집니다. order는 이 예외로 끝나고, 이 주문의 결과는 실패입니다. 화면의 코드에는 다시 보내는 줄이 없고, 이 요청을 받아 둔 곳은 어디에도 없습니다.'
          : 'order(' + i + ')도 알림 서버에 직접 보내지만 이번에도 연결이 거부되어 ResourceAccessException으로 끝나고, 결과는 실패입니다. 받아 둔 곳은 없습니다.', 'bad');
      } else {
        st.os = 'hot'; st.ost = ['주문 ' + i, '답을 기다림']; st.ns = 'hot'; st.nst = ['"' + al + '"', '처리 중']; st.a1 = 'hot'; st.a2 = '';
        push(head
          ? 'order(1)이 RestClient로 주문 번호 1을 알림 서버에 직접 보내고, 알림 서버의 답을 기다립니다. 알림 서버에서 스프링이 handle을 불러 "' + al + '" 처리를 시작합니다.'
          : 'order(' + i + ')' + ig(i) + ' 주문 번호 ' + i + '번을 직접 보내고 답을 기다립니다. 알림 서버의 handle이 처리를 시작합니다.', '');
        st.done.push(al); st.res.push(['주문 ' + i, '성공']); st.os = 'wait'; st.ost = ['주문 ' + i + ' 결과', '성공']; st.ns = 'plain'; st.nst = ['켜져 있음', '처리한 알림 ' + i + '건']; st.a1 = ''; st.a2 = 'good';
        push(head
          ? 'handle이 "' + al + '" 처리를 끝내고(0.3초가 걸렸습니다), 알림 서버가 답을 보냅니다. RestClient의 호출은 이 답을 받은 뒤에야 끝나고, 그제야 order가 끝나 이 주문의 결과(성공)를 받습니다. 그다음에야 다음 주문으로 넘어갑니다.'
          : 'handle이 "' + al + '" 처리를 끝내고 답한 뒤에야 order가 끝나 결과(성공)를 받습니다. 이번에도 0.3초를 기다렸습니다.', 'good');
      }
    }
    // 주문을 다 보낸 뒤
    if (q) {
      st.a1 = ''; st.a2 = ''; st.a3 = ''; st.os = 'good'; st.ost = ['주문 ' + N + '건', '모두 성공'];
      if (late) {
        push('주문 서버는 주문 ' + N + '건의 결과를 모두 받았습니다. 알림 서버가 꺼져 있어서 큐에서 메시지를 받아 가는 쪽이 없고, 메시지 ' + N + '건(주문 번호 1, 2, 3)이 큐에 그대로 남아 있습니다. 알림은 아직 하나도 처리되지 않았습니다.', '');
        st.cur = st.qn[0]; st.ns = 'hot'; st.nst = ['"' + this.msg(1) + '"', '처리 중']; st.a3 = 'hot';
        push('알림 서버가 켜집니다. 켜질 때 큐에는 메시지 ' + N + '건이 쌓여 있었습니다. @RabbitListener가 큐 order-created에서 받기 시작하고, 큐는 맨 앞의 주문 번호 1부터 handle에 넘겨 줍니다. handle이 "' + this.msg(1) + '" 처리를 시작합니다.', '');
      } else {
        push('주문 서버는 주문 ' + N + '건의 결과를 모두 받았습니다. 그때 알림은 아직 하나도 처리되지 않았습니다. "' + this.msg(1) + '"은 handle이 처리하는 중이고(0.3초), 주문 번호 2와 3은 큐에서 차례를 기다립니다. 주문 서버는 이 알림들이 언제 끝나는지 알 수 없습니다.', '');
      }
      for (i = 1; i <= N; i++) {
        var aa = this.msg(i);
        st.qn.shift(); st.done.push(aa); st.cur = st.qn.length ? st.qn[0] : '';
        st.ns = i === N ? 'good' : 'hot'; st.nst = i === N ? ['알림 ' + N + '건', '모두 처리함'] : ['"' + this.msg(i + 1) + '"', '처리 중']; st.a3 = i === N ? '' : 'hot';
        push(i === 1
          ? 'handle이 "' + aa + '" 처리를 끝냅니다(0.3초). handle이 예외 없이 끝나면 스프링이 RabbitMQ에 처리를 마쳤다고 알리고(확인), 그때 주문 번호 1 메시지가 큐에서 지워집니다. 큐는 다음 메시지인 주문 번호 2를 넘겨 주고, 큐에는 ' + st.qn.length + '건이 남습니다. 메시지는 넣은 차례대로 넘어옵니다.'
          : 'handle이 "' + aa + '" 처리를 끝내고, 주문 번호 ' + i + ' 메시지가 큐에서 지워집니다.' + (i === N ? ' 큐가 비었습니다.' : ' 큐에는 ' + st.qn.length + '건이 남습니다.') + (i === N ? ' 알림 ' + N + '건이 모두 처리되었습니다. 처리된 차례는 주문 1, 주문 2, 주문 3으로 넣은 차례와 같습니다.' : ' 큐는 다음 메시지인 주문 번호 ' + (i + 1) + '번 메시지를 넘겨 줍니다.'), i === N ? 'good' : '');
      }
    } else if (late) {
      st.os = 'bad'; st.ost = ['주문 ' + N + '건', '모두 실패']; st.a1 = '';
      push('주문 서버는 요청 ' + N + '건이 모두 실패한 결과를 받았습니다. 알림 서버가 꺼져 있는 동안 보낸 요청은 어디에도 남지 않았습니다.', 'bad');
      st.ns = 'plain'; st.nst = ['켜짐', '처리할 것 없음'];
      push('알림 서버가 켜집니다. 그러나 처리할 알림이 하나도 없습니다. 앞의 요청 ' + N + '건은 받은 곳이 없어 사라졌고, 이 실행에서 켜진 뒤 1초를 지켜보는 동안에도 handle은 한 번도 불리지 않았습니다. 주문 서버는 다시 보내지 않기 때문입니다.', 'bad');
    } else {
      st.os = 'good'; st.ost = ['주문 ' + N + '건', '모두 성공']; st.ns = 'good'; st.nst = ['알림 ' + N + '건', '모두 처리함']; st.a2 = '';
      push('주문 ' + N + '건의 결과를 모두 받았습니다. 알림 서버가 처리한 알림은 ' + N + '건입니다. 주문 서버는 알림이 하나 끝날 때마다 0.3초씩 기다렸습니다.', 'good');
    }
    // 요약
    if (q && !late) {
      sum.push('메시지 큐는 주문 서버와 알림 서버 사이에 놓인, 시킬 일을 적어 두는 줄입니다. 코드에서는 보내는 쪽의 rabbitTemplate.convertAndSend("order-created", no)와 받는 쪽의 @RabbitListener(queues = "order-created")가 같은 큐 이름으로 이어져 있고, 주문 서버의 코드에는 알림 서버의 주소가 없습니다. 주문 서버는 메시지를 큐에 보내기만 하고 바로 결과를 받았고, 알림 서버는 자기 속도로 넣은 차례대로 받아 처리했습니다.');
      sum.push('대신 주문 서버가 결과를 받은 때 알림은 아직 하나도 처리되지 않았습니다. 성공은 큐에 보냈다는 뜻일 뿐이어서, 주문 서버는 알림이 언제 끝나는지 바로 알 수 없습니다.');
    } else if (q) {
      sum.push('메시지를 큐에 넣으면 알림 서버가 꺼져 있어도 주문 ' + N + '건은 모두 성공하고, 메시지 ' + N + '건은 큐에 남아 있다가 알림 서버가 켜진 뒤 넣은 차례대로 처리됩니다. 같은 상황에서 직접 보낸 요청은 ' + N + '건이 모두 실패했습니다(앞의 물음).');
      sum.push('알림 서버가 꺼져 있는 동안 메시지를 맡아 둔 것은 RabbitMQ의 큐입니다. 이 실습을 실행할 때 RabbitMQ 대신 쓴 큐는 Node.js로 짠 작은 서버로, 메시지를 넣은 차례대로 보관했다가 앞에서부터 넘겨 주고 처리를 마쳤다는 확인을 받으면 지우는 일만 합니다. 큐가 하는 일을 가장 작게 줄이면 이 정도이고, RabbitMQ 같은 브로커는 여기에 메시지를 디스크에 보관하는 일, 받는 쪽 여럿에 나눠 주는 일 같은 것을 더합니다.');
    } else if (!late) {
      sum.push('큐 없이 RestClient로 알림 서버를 직접 부르면 주문 서버는 알림 서버가 처리를 마치고 답할 때까지 기다린 뒤에야 결과를 받습니다. 알림 ' + N + '건이 모두 처리되었습니다.');
      sum.push('알림이 끝난 것을 결과로 바로 알 수 있는 대신, 알림 서버가 느리면 주문 서버도 그만큼 기다립니다. 큐에 넣었을 때는 이 기다림이 없었습니다(앞의 물음).');
    } else {
      sum.push('직접 보내는데 알림 서버가 꺼져 있으면 요청 ' + N + '건이 모두 ResourceAccessException으로 실패하고, 알림 서버가 나중에 켜져도 처리된 알림은 하나도 없습니다.');
      sum.push('요청을 받는 쪽이 없으면 직접 보낸 요청은 어디에도 남지 않습니다. 화면의 코드는 실패한 요청을 다시 보내지 않으므로 그 알림은 사라졌습니다.');
    }
    var qNote = !q ? '큐 없음' : late ? N + '건 (주문 번호 1, 2, 3)' : '0건 (알림 서버가 먼저 켜져 있었음)';
    return { events: ev, summary: sum, row: [q ? N + '건 모두 성공 (알림 처리를 기다리지 않고 바로 받음)' : late ? N + '건 모두 실패 (ResourceAccessException: 알림 서버에 연결하지 못함)' : N + '건 모두 성공 (알림 서버가 처리를 마친 뒤에 받음)', (!q && late) ? '0건 (알림 서버가 켜진 뒤에도 처리된 알림이 없음)' : N + '건: 주문 1 → 주문 2 → 주문 3', qNote] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, q = sim.c.via === 'queue';
    if (!s) { H.text(v, '실행을 누르면 주문 서버가 주문을 받는 것부터 시작합니다.'); return; }
    H.table(v, ['주문', '주문 서버가 받은 결과'], s.res.length ? s.res.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[1] === '성공' ? 'good' : 'bad' }] }; }) : [{ cls: 'gone', cells: ['아직', ''] }], '주문 서버가 받은 결과');
    H.table(v, ['처리 차례', '알림 서버가 처리한 알림'], s.done.length ? s.done.map(function (m, j) { return { cls: '', cells: [(j + 1) + '번째', m] }; }) : [{ cls: 'gone', cells: ['아직', ''] }], '처리된 알림');
    if (q) H.counters(v, [[s.qn.length + '건', '큐에 있는 메시지']]);
  },
  // 그림: 왼쪽에 주문 서버, 가운데에 RabbitMQ의 큐 order-created(메시지가 쌓이는 칸), 오른쪽에 알림 서버. 큐가 있으면 주문 서버 -> 큐 -> 알림 서버로, 큐를 지우면 주문 서버 -> 알림 서버로 곧바로 간다.
  // 처리 중인 메시지는 처리를 마쳤다는 확인 전까지 큐의 맨 앞 칸에 "처리 중"으로 남고, 확인을 받으면 사라진다. 꺼진 알림 서버는 점선, 실패한 곳은 빨강. 아래에 결과 세 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, q = c.via === 'queue', last = shown[shown.length - 1], s = last ? last.snap : null, late = c.consumer === 'late';
    function ac(x) { return x === 'plain' ? '' : x; }
    P.size(680, 336);
    P.box('os', 14, 82, 140, 84, { cls: s ? s.os : 'plain', title: '주문 서버', sub: s ? s.ost : ['대기'] });
    P.region('qu', 254, 16, 172, 214, q ? '큐 order-created' : '큐 (지움)');
    if (q) {
      var qn = s ? s.qn : [];
      qn.forEach(function (m, j) { var busy = s && j === 0 && s.cur === m; P.box('m_' + m, 264, 52 + j * 44, 152, 36, { cls: busy ? 'hot' : 'wait', sub: busy ? m.replace('주문 ', '') + ' · 처리 중' : m, center: true }); });
      if (!qn.length) P.text('qe', 340, 128, '비어 있음', { cls: 'mut', anchor: 'middle' });
    }
    P.box('ns', 526, 82, 140, 84, { cls: s ? s.ns : (late ? 'ghost' : 'plain'), title: '알림 서버', sub: s ? s.nst : (late ? ['꺼져 있음'] : ['켜져 있음']) });
    if (q) {
      if (s && s.a1) P.arrow('a1', [154, 108], [254, 108], { cls: ac(s.a1) });
      if (s && s.a2) P.arrow('a2', [254, 140], [154, 140], { cls: ac(s.a2) });
      if (s && s.a3) P.arrow('a3', [426, 124], [526, 124], { cls: ac(s.a3) });
    } else {
      if (s && s.a1) P.arrow('a1', [154, 104], [526, 104], { cls: ac(s.a1), label: '직접 요청' });
      if (s && s.a2) P.arrow('a2', [526, 146], [154, 146], { cls: ac(s.a2), label: '처리했다는 답' });
    }
    var okc = s ? s.res.filter(function (r) { return r[1] === '성공'; }).length : 0, bad = s ? s.res.length - okc : 0;
    P.box('n1', 14, 246, 322, 36, { cls: s && s.res.length ? (bad ? 'bad' : 'good') : 'ghost', title: '주문 서버가 받은 결과', right: s && s.res.length ? (bad ? bad + '건 실패' : okc + '건 성공') : '아직' });
    P.box('n2', 344, 246, 322, 36, { cls: s && s.done.length ? 'good' : 'ghost', title: '처리된 알림', right: (s ? s.done.length : 0) + '건' });
    P.box('n3', 14, 290, 652, 36, { cls: q && s && s.qn.length ? 'wait' : 'ghost', title: '큐에 있는 메시지', right: q ? (s ? s.qn.length : 0) + '건' : '큐 없음' });
  },
  assume: '검증은 두 갈래로 했습니다. 첫째, 큐를 지우고 직접 부르는 두 조합은 Spring Boot 4.1.1(내장 톰캣)과 Spring Framework 7.0.9를 JDK 21.0.12.1에서 실제로 실행했습니다. 화면의 코드와 같은 소스(package와 import 줄만 더하고, localhost:8081의 8081만 빈 포트 번호로 바꿈)를 javac로 컴파일한 뒤, 알림 서버는 Notifier를 스프링 부트로 127.0.0.1에 띄우고, 주문 서버는 OrderService 빈의 order(1), order(2), order(3)을 차례로 불렀습니다. 켜져 있는 조합에서는 매번 handle이 "주문 N 알림 보냄"을 찍은 뒤에야 order가 끝났고, 꺼져 있는 조합에서는 order가 세 번 모두 ResourceAccessException(원인 java.net.ConnectException)으로 끝났으며, 같은 번호에 알림 서버를 띄운 뒤 1초를 지켜봐도 handle은 한 번도 불리지 않았습니다. 이 실행의 handle은 기다리지 않고 바로 끝나므로, 직접 부를 때의 0.3초는 아래 실행용 모형에서 잰 값입니다. 둘째, 큐를 쓰는 두 조합은 RabbitMQ를 실행하지 않았습니다. 이 컴퓨터에는 RabbitMQ와 스프링 AMQP 라이브러리가 없고, 내려받지 않았습니다. 화면의 Queue, RabbitTemplate.convertAndSend(String, Object), @RabbitListener(queues = …)는 Spring AMQP 4.1.2의 API 문서와 공식 소스에서 이름·인자·타입만 옮긴 대역과 함께 javac로 컴파일만 해 보았습니다. 동작은 RabbitMQ 역할을 대신하는 실행용 모형(Node.js 24.18.0의 작은 http 서버)으로 127.0.0.1 안에서 돌렸습니다. 모형은 문서가 정한 동작만 따르게 만들었습니다. 주문 서버가 처음 연결할 때 QueueConfig의 큐를 만들고, convertAndSend("order-created", no)는 기본 교환기를 거쳐 이름이 같은 큐에 들어가며, 보내는 쪽은 처리를 기다리지 않고 돌아옵니다. 큐는 기다리고 있는 받는 쪽에 넣은 차례대로 메시지를 넘겨 주고(받는 쪽이 들여다보는 것이 아니라 큐 쪽이 넘겨 주는 방식), handle이 예외 없이 끝나 처리를 마쳤다는 확인이 와야 그 메시지를 지웁니다. 모형의 받는 쪽은 한 번에 하나만 받는데, 스프링 AMQP의 기본 설정(prefetch 250)은 여러 건을 미리 받아 두고 하나씩 처리합니다. 처리 차례와, 확인 전까지 큐의 메시지 수에 드는 것은 같습니다. 알림 하나에 0.3초는 이 실습에서 정한 값입니다. 모형에서 대조한 것은 결과 표 세 열, 넣은 차례·넘겨준 차례·지운 차례가 같았다는 것, 주문 서버가 결과를 모두 받은 때 큐에 메시지 3건(처리 중인 1건 포함)이 있었다는 것, 알림 서버가 켜지기 전에는 아무것도 넘겨주지 않았다는 것입니다. handle(int no)가 Integer로 온 주문 번호를 int로 받는 것은 실행해 보지 않았고, 스프링 AMQP 소스에서 기본 변환기가 숫자와 문자열은 따로 허용 목록 없이 되살린다는 것까지만 확인했습니다. 문서로 확인한 것: RabbitMQ의 AMQP 0-9-1 Model Explained(https://www.rabbitmq.com/tutorials/amqp-concepts. 기본 교환기는 모든 큐를 큐 이름과 같은 routing key로 묶는다, 받는 쪽에 넘겨 주는 방식을 권한다, 브로커는 확인을 받아야 메시지를 큐에서 완전히 지운다, 어느 큐로도 가지 못한 메시지는 버려지거나 보낸 쪽에 돌려보내진다), RabbitMQ 튜토리얼 1의 Spring AMQP판(convertAndSend로 보내고 @RabbitListener(queues = "hello")로 받는 예), Spring AMQP 4.1.2 API(convertAndSend(String routingKey, Object message)는 기본 교환기로 그 routing key를 붙여 보낸다, Queue(String name)은 durable·non-exclusive·non auto-delete, @RabbitListener의 queues)와 참조 문서의 Message Listener Container Configuration(acknowledgeMode는 AUTO가 기본이고 리스너가 예외를 던지지 않으면 컨테이너가 확인을 보낸다, prefetchCount 기본 250), Spring Boot 참조 문서 Messaging의 AMQP 절(Queue 빈은 RabbitMQ에 그 큐를 만드는 데 쓰인다, @RabbitListener를 단 빈이 리스너가 된다)과 RabbitAutoConfiguration API(RabbitTemplate을 빈으로 등록한다)입니다. 2026-10-23에 WebFetch가 돌려준 내용으로 확인했고, 페이지 전체를 직접 읽지는 않았습니다. KafkaTemplate과 @KafkaListener는 이 실습에서 다루지 않았습니다. 화면에서 줄인 것: 두 서버의 import 줄과 실행 클래스(@SpringBootApplication이 붙은 main 클래스), RabbitMQ에 연결하는 설정(spring.rabbitmq.host 등)은 보이지 않습니다. 이 실습이 보지 않은 것: 큐를 디스크에 보관하는 것과 RabbitMQ 자체가 꺼지는 경우, 확인 전에 받는 쪽이 꺼졌을 때 다시 넘겨주는 것, 메시지가 두 번 전달되는 경우, 받는 쪽을 여럿 두었을 때의 순서와 분배, 실패한 처리를 다시 하는 것, RestClient의 타임아웃입니다. 이런 세부는 "세부 동작 실습: 메시지 큐 기본", "세부 동작 실습: Kafka 파티션과 컨슈머", "세부 동작 실습: Saga와 Outbox"에서 다룹니다. 큐가 어울리는 일과 직접 부르는 것이 어울리는 일을 가르는 기준(결과가 바로 필요한가)도 이 실습은 판단하지 않았습니다.',
});
