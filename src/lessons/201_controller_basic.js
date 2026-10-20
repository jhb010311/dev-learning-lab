Lab.register({
  id: 'controller_basic', nav: '컨트롤러', cat: '기초개념', mode: 'step', basic: true, deep: ['mvc'],
  title: '어떤 클래스를 컨트롤러라고 부르는가',
  why: '서블릿으로 웹 요청을 받으려면 보통 주소마다 HttpServlet을 상속한 클래스를 따로 만들고, 요청 값을 꺼내고 응답을 쓰는 코드도 매번 직접 적어야 했다. 컨트롤러는 클래스와 메서드 위에 @RestController, @GetMapping 같은 표시만 붙이면 스프링이 주소에 맞는 메서드를 찾아 불러 주고, 메서드가 return한 값을 응답으로 바꿔 보내 주게 한다.',
  use: '스프링 부트로 만드는 웹 서비스와 REST API에서 요청을 처음 받는 자리로 쓴다. 회원 가입, 상품 목록 조회 같은 기능마다 메서드를 하나씩 두고, JSON 같은 데이터를 돌려줄 때는 @RestController를, HTML 화면을 돌려줄 때는 @Controller를 쓴다. 계산이나 DB 저장 같은 실제 처리는 보통 서비스 클래스에 맡기고, 컨트롤러는 요청과 응답을 다루는 일만 한다.',
  intro: '컨트롤러는 class로 선언한 자바 클래스입니다. 일반 클래스와 다른 곳은 두 군데입니다. 클래스 위의 @RestController는 스프링이 이 클래스의 객체를 만들어 두고 웹 요청을 처리하는 클래스로 다룬다는 표시이고, 메서드 위의 @GetMapping("/hello")는 브라우저가 /hello라는 주소로 보낸 GET 요청을 이 메서드에 맡긴다는 등록입니다. 컨트롤러는 서블릿이 아닙니다. 요청은 스프링 부트가 톰캣에 등록해 둔 서블릿 하나(DispatcherServlet)가 받아서 컨트롤러의 메서드를 불러 줍니다. @RestController와 @GetMapping을 하나씩 지워 가며 같은 요청을 보내, 스프링이 객체를 만들고 메서드를 불러 주는지를 봅니다.',
  terms: ['컨트롤러 클래스', '@RestController', '@GetMapping', 'DispatcherServlet과 프론트 컨트롤러'],
  controls: [
    { id: 'ctl', label: '클래스 위에 @RestController를 적는다', type: 'check', value: true },
    { id: 'map', label: '메서드 위에 @GetMapping("주소")를 적는다', type: 'check', value: true },
    { id: 'many', label: '받을 주소와 메서드', type: 'select', value: 'one', options: [['one', '/hello 하나, 메서드 1개'], ['three', '/login, /join, /members, 메서드 3개']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '컨트롤러는 어떻게 생겼고, /hello 요청이 오면 무슨 일이 일어나나', d: '두 가지가 다 있는 컨트롤러. 요청이 오면 DispatcherServlet이 주소 표를 보고 메서드를 불러 줍니다.', v: { ctl: true, map: true, many: 'one' } },
    { t: '@GetMapping을 지우면', q: '@GetMapping("/hello")를 지우면', d: '스프링이 객체는 만들지만 맡은 주소가 없어 메서드는 한 번도 불리지 않습니다.', v: { ctl: true, map: false, many: 'one' } },
    { t: '@RestController를 지우면', q: '@RestController를 지우면', d: '스프링이 이 클래스를 찾지 못해 객체도 주소 표도 없습니다.', v: { ctl: false, map: true, many: 'one' } },
    { t: '둘 다 지우면', q: '둘 다 지우면', d: '같은 메서드가 있는 일반 클래스. 스프링은 이 클래스를 쓰지 않습니다.', v: { ctl: false, map: false, many: 'one' } },
    { t: '주소가 3개면', q: '받을 주소가 /login, /join, /members 세 개면 클래스는 몇 개 필요한가', d: '클래스 하나에 메서드 세 개를 두고, 주소는 메서드마다 적습니다.', v: { ctl: true, map: true, many: 'three' } },
  ],
  // 이 설정에서 만드는 클래스: 이름과, 메서드(이름, 적어 둔 주소, 돌려주는 글)
  plan: function (c) {
    if (c.many === 'one') return { name: 'HelloController', ms: [{ m: 'hello', url: '/hello', body: '안녕하세요' }] };
    return { name: 'MemberController', ms: [{ m: 'login', url: '/login', body: '로그인 화면' }, { m: 'join', url: '/join', body: '회원가입 화면' }, { m: 'members', url: '/members', body: '회원 목록' }] };
  },
  code: function (c) {
    var p = this.plan(c), out = [];
    if (c.ctl) out.push('// 표시: 웹 요청을 처리하는 클래스. 스프링이 객체를 만들어 둔다', '@RestController');
    out.push('public class ' + p.name + ' {');
    p.ms.forEach(function (k, i) {
      if (i > 0) out.push('');
      if (c.map) {
        if (i === 0) out.push('    // 등록: 이 주소로 온 GET 요청을 이 메서드에 맡긴다');
        out.push('    @GetMapping("' + k.url + '")');
      }
      out.push('    public String ' + k.m + '() {', '        return "' + k.body + '";', '    }');
    });
    out.push('}');
    return out.join('\n');
  },
  label: function (c) { return (c.ctl ? '@RestController 있음' : '@RestController 없음') + ' · ' + (c.map ? '@GetMapping 있음' : '@GetMapping 없음') + ' · ' + { one: '주소 1개, 메서드 1개', three: '주소 3개, 메서드 3개' }[c.many]; },
  columns: ['스프링이 만든 컨트롤러 객체', '스프링의 주소 표', '응답', '메서드 실행'],
  simulate: function (c) {
    var P = this.plan(c), ms = P.ms, ev = [], sum = [], K = P.name + ' 클래스', cn = P.name;
    var st = { up: false, table: [], made: 0, calls: 0, path: '', to: '', phase: '', resp: null, miss: false, reqs: [], run: {} };
    ms.forEach(function (k) { st.run[k.m] = 0; });
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 서버 시작: 톰캣에 DispatcherServlet이 등록되고, 스프링이 @RestController를 찾아 객체를 만들고 @GetMapping으로 주소 표를 만든다
    st.up = true;
    push('서버가 뜹니다. 스프링 부트가 톰캣을 띄우고, 톰캣에 DispatcherServlet이라는 서블릿 하나를 등록합니다. 이 서블릿은 우리가 쓴 것이 아니라 스프링이 제공하는 것이며, 모든 주소("/")의 요청을 맡습니다.', '');
    if (c.ctl) {
      st.made = 1;
      push('스프링이 프로젝트의 클래스를 훑어 @RestController가 붙은 클래스를 찾습니다. ' + K + '에 붙어 있으므로, 스프링이 이 클래스의 객체를 만들어 둡니다. 이 객체는 첫 요청이 오기 전, 서버가 뜰 때 이미 만들어집니다.', '');
      if (c.map) {
        ms.forEach(function (k) { st.table.push([k.url, cn + '.' + k.m]); });
        push('스프링이 ' + K + '의 메서드에서 @GetMapping이 붙은 것을 찾아, 거기 적힌 주소와 메서드를 스프링의 주소 표에 적습니다.', '');
      } else {
        push('스프링이 ' + K + '의 메서드에서 @GetMapping을 찾습니다. 하나도 없으므로 주소 표는 비어 있습니다. 객체는 만들어졌지만 맡은 주소가 없습니다.', '');
      }
    } else {
      push('스프링이 프로젝트의 클래스를 훑어 @RestController가 붙은 클래스를 찾습니다. 하나도 없으므로 객체를 만들지 않고, 스프링의 주소 표도 비어 있습니다. ' + K + '의 파일은 프로젝트에 있지만, 스프링은 이 클래스를 찾지 못했습니다.' + (c.map ? ' 메서드에 @GetMapping이 붙어 있어도 주소 표에는 오르지 못했습니다.' : ''), '');
    }
    ms.forEach(function (k, i) {
      var p = k.url, head = i === 0, hit = st.table.some(function (r) { return r[0] === p; });
      st.path = p; st.to = ''; st.resp = null; st.miss = false; st.phase = 'sent';
      push(head ? '브라우저 주소창에 localhost:8080' + p + ' 주소를 입력하면, 브라우저가 서버에 GET ' + p + ' 요청을 보냅니다.' : '브라우저가 GET ' + p + ' 요청을 보냅니다.', '');
      if (head) {
        st.phase = 'toDs';
        push('톰캣이 요청을 받습니다. 톰캣에 등록된 서블릿은 DispatcherServlet 하나이고 모든 주소를 맡고 있으므로, 톰캣이 요청을 DispatcherServlet에 넘깁니다. 우리가 쓴 클래스에는 아직 아무것도 오지 않았습니다.', '');
      }
      st.phase = 'lookup';
      var find = (head ? '' : '톰캣이 요청을 DispatcherServlet에 넘기고, ') + 'DispatcherServlet이 스프링의 주소 표에서 ' + p + ' 주소를 찾습니다. ';
      if (!hit) {
        st.resp = { status: '404', body: '' }; st.phase = 'done'; st.miss = true; st.reqs.push([p, '404', '스프링']);
        push(find + '적힌 메서드가 없으므로 404 응답이 나갑니다.' + (head ? ' ' + (c.ctl ? K + '의 객체는 만들어져 있지만 메서드는 실행되지 않았습니다.' : K + '의 객체는 만들어진 적이 없고 메서드도 실행되지 않았습니다.') + (!c.ctl && !c.map ? ' ' + k.m + '() 메서드가 있어도, 스프링이 모르는 클래스의 메서드는 아무도 부르지 않습니다.' : '') : ''), 'bad');
        return;
      }
      push(find + cn + '.' + k.m + ' 메서드가 적혀 있습니다.', '');
      st.to = k.m; st.calls++; st.run[k.m]++; st.phase = 'call';
      push(head
        ? 'DispatcherServlet이 찾아낸 메서드를 부릅니다. 이 메서드가 속한 객체는 서버가 뜰 때 스프링이 만들어 둔 것입니다. 우리가 쓴 코드에는 new ' + cn + '()라는 줄도, ' + k.m + '() 메서드를 부르는 줄도 없습니다. 이 메서드가 돌려주는 글은 "' + k.body + '"입니다.'
        : 'DispatcherServlet이 ' + cn + '.' + k.m + '() 메서드를 부릅니다.' + (c.many === 'three' ? ' 객체는 앞에서 쓴 것과 같은 하나이고 메서드만 다릅니다.' : '') + ' 돌려주는 글은 "' + k.body + '"입니다.', 'good');
      st.resp = { status: '200', body: k.body }; st.phase = 'done'; st.reqs.push([p, '200 ' + k.body, cn + '.' + k.m]);
      push('브라우저가 200 응답을 받습니다. 메서드가 돌려준 글이 응답 본문이 되어, 본문은 "' + k.body + '"입니다.', '');
    });
    var meth = c.many === 'three' ? '메서드' : ms[0].m + '() 메서드';
    if (c.ctl && c.map) {
      sum.push('컨트롤러는 class로 선언한 자바 클래스입니다. 일반 클래스와 다른 곳은 클래스 위의 @RestController(표시)와 메서드 위의 @GetMapping(등록)이고, 이 둘이 있으면 스프링이 객체를 만들어 두고 주소 표에 메서드를 올려 둡니다.');
      if (c.many === 'one') sum.push('컨트롤러는 서블릿이 아닙니다. 요청은 스프링이 톰캣에 등록해 둔 DispatcherServlet이 받아서, 주소 표를 보고 컨트롤러의 메서드를 불러 줍니다. 우리가 쓴 코드에는 new도, 메서드를 부르는 줄도 없습니다.');
      else sum.push('주소를 클래스가 아니라 메서드에 적으므로, 클래스 하나에 주소 세 개가 들어갑니다. 앞 실습처럼 주소마다 서블릿 클래스를 따로 만들면 세 개가 필요했습니다. 여기서는 객체 하나가 메서드 세 개로 주소마다 다른 응답을 냈습니다.');
    } else if (c.ctl) {
      sum.push('@RestController가 있으므로 스프링이 객체는 만들었지만, 맡을 주소를 적지 않아 ' + meth + '는 한 번도 불리지 않았습니다. 요청은 주소 표에서 막혀 404 응답이 나갔습니다.');
      sum.push('클래스 위의 표시는 이 클래스를 쓴다는 것이고, 어떤 주소를 맡을지는 메서드 위의 @GetMapping이 정합니다. 요청을 받으려면 둘이 다 있어야 합니다.');
    } else if (c.map) {
      sum.push('@GetMapping이 있어도 클래스 위에 @RestController가 없으면 스프링이 이 클래스를 찾지 못합니다. 객체가 만들어지지 않고 주소 표에도 오르지 못해, 요청은 404 응답을 받았습니다.');
      sum.push('@GetMapping은 스프링이 컨트롤러로 찾아낸 클래스의 메서드에서만 효과가 있습니다. 주소 표에 오르는 것은 @RestController가 붙은 클래스의 메서드뿐입니다.');
    } else {
      sum.push('이 클래스는 컨트롤러가 아닌 일반 클래스입니다. ' + meth + '가 있고 내용도 같지만 스프링은 이 클래스를 쓰지 않았습니다. 객체도 만들어지지 않았고 메서드도 실행되지 않았습니다.');
      sum.push('메서드를 만들어 두었다고 요청을 받는 것이 아닙니다. 스프링이 부르는 것은 주소 표에 오른 컨트롤러의 메서드뿐입니다.');
    }
    var tableText = !st.table.length ? '비어 있음' : c.many === 'one' ? '/hello → ' + cn + '.' + ms[0].m : '주소 ' + st.table.length + '개 → 메서드 ' + st.table.length + '개';
    return { events: ev, summary: sum, plan: P, row: [st.made + '개', tableText, st.reqs.map(function (r) { return r[1]; }).join(' / '), st.calls + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 뜨는 것부터 시작합니다.'); return; }
    H.table(v, ['주소', '맡은 메서드'], s.table.length ? s.table.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['비어 있음', ''] }], '스프링의 주소 표');
    if (s.reqs.length) H.table(v, ['요청', '응답', '응답을 만든 것'], s.reqs.map(function (r) { return { cls: '', cells: ['GET ' + r[0], { v: r[1], cls: r[1].indexOf('200') === 0 ? 'good' : 'bad' }, r[2]] }; }), '요청과 응답');
    H.counters(v, [[s.made, '스프링이 만든 객체'], [s.calls, '메서드 실행']]);
  },
  // 그림: 왼쪽에 브라우저, 가운데 위에 톰캣 안의 DispatcherServlet, 그 아래에 스프링의 주소 표, 오른쪽에 우리가 작성한 컨트롤러. 요청이 DispatcherServlet과 주소 표를 거쳐 메서드에 닿는지를 화살표로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, pl = sim.plan, last = shown[shown.length - 1], s = last ? last.snap : null, n = pl.ms.length;
    P.size(680, 292);
    var busy = s && s.phase && s.phase !== 'done', ph = s ? s.phase : '';
    P.box('br', 14, 44, 108, 52, { cls: busy ? 'wait' : 'plain', title: '브라우저', sub: !s || !s.path ? '대기' : s.resp ? s.resp.status + ' 응답' : 'GET ' + s.path });
    P.region('tc', 164, 16, 232, 100, '톰캣' + (s && s.up ? '' : ': 시작 전'));
    P.box('ds', 174, 44, 212, 52, { cls: ph === 'toDs' || ph === 'lookup' ? 'hot now' : s && s.up ? 'plain' : 'ghost', title: 'DispatcherServlet', sub: s && s.up ? '스프링이 등록한 서블릿' : ' ' });
    var rows = s && s.table.length ? s.table.map(function (r) { return r[0] + ' → ' + r[1].split('.')[1] + '()'; }) : [s && s.up ? '비어 있음' : ' '];
    P.box('tb', 164, 140, 232, 30 + rows.length * 19, { cls: ph === 'lookup' ? 'hot now' : s && s.table.length ? 'plain' : 'ghost', title: '스프링의 주소 표', sub: rows });
    P.region('cl', 436, 16, 230, 208, '우리가 작성한 클래스');
    var made = s ? s.made : 0, on = ph === 'call';
    var sub = [made ? '객체 1개 (스프링이 만듦)' : '객체 없음'].concat(pl.ms.map(function (k) { return k.m + '() · ' + (s ? s.run[k.m] : 0) + '번'; }));
    P.box('k', 446, 104, 210, 30 + sub.length * 19, { cls: on ? 'hot now' : s && s.calls ? 'good' : made ? 'plain' : 'ghost', title: pl.name, sub: sub });
    if (s && s.path && (ph === 'sent' || ph === 'toDs' || ph === 'lookup' || ph === 'call')) P.arrow('rq', 'br:r:0.3', 'ds:l:0.3', {});
    if (s && (ph === 'lookup' || ph === 'call')) P.arrow('dt', 'ds:b:0.5', 'tb:t:0.5', { cls: 'hot' });
    if (s && s.miss) P.arrow('dt', 'ds:b:0.5', 'tb:t:0.5', { cls: 'bad' });
    if (on) P.arrow('call', 'tb:r:0.5', 'k:l:0.7', { cls: 'hot' });
    if (s && s.resp) P.arrow('rs', 'ds:l:0.75', 'br:r:0.75', { cls: s.resp.status === '200' ? 'good' : 'bad' });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.made ? 'wait' : 'ghost', title: '스프링이 만든 객체', right: (s ? s.made : 0) + '개' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.calls ? 'good' : 'ghost', title: '메서드 실행', right: (s ? s.calls : 0) + '번' });
  },
  assume: '스프링 부트 4.1.1(스프링 프레임워크 7.0.9, 내장 톰캣 11)을 JDK 21에서 실행한 결과입니다. 브라우저는 주소마다 GET 요청을 한 번씩 차례로 보낸다고 가정했습니다. 주소의 localhost:8080은 내 컴퓨터에서 스프링 부트를 기본 포트로 띄웠을 때의 예입니다. 여덟 가지 조합을 모두, 화면의 코드와 같은 소스(객체와 실행 횟수를 세는 줄만 더함)를 패키지 app으로 컴파일하고 @SpringBootConfiguration, @EnableAutoConfiguration, @ComponentScan이 붙은 시작 클래스와 함께 자바 프로세스를 새로 띄워 확인했습니다. 컨트롤러를 손으로 등록하지 않고 스프링이 클래스를 훑어 찾게 했으며, 요청은 서버가 뜬 뒤 실제 HTTP로 보냈습니다. 대조한 것은 스프링이 만든 컨트롤러 객체의 수(서버가 뜬 직후와 요청 뒤), 주소 표(RequestMappingHandlerMapping의 getHandlerMethods 가운데 이 클래스의 것), 주소마다의 상태 코드와 본문, 메서드 실행 횟수입니다. 톰캣에 등록된 서블릿이 DispatcherServlet 하나이고 "/" 주소를 맡는다는 것, 컨트롤러 클래스가 Servlet 타입이 아니라는 것, 404 응답에서 메서드가 실행되지 않았다는 것도 실행으로 확인했습니다. 문서가 정한 것은 스프링 프레임워크 문서 Web MVC의 DispatcherServlet 절(DispatcherServlet이 모든 요청을 받는 서블릿 하나이고 실제 일은 위임 구성 요소가 한다는 것, 스프링 부트에서는 서블릿 선언이 스프링 설정에서 찾아져 컨테이너에 등록된다는 것), Annotated Controllers의 Declaration 절(컨트롤러 객체가 클래스 경로 스캔으로 찾아지고 @RestController가 @Controller와 @ResponseBody를 합친 것이라는 것), Mapping Requests 절(@GetMapping 같은 단축 애너테이션)과 @RestController, @Controller, @GetMapping의 API 문서입니다. 객체가 서버가 뜰 때 만들어지고 주소 표도 그때 만들어진다는 것과, 주소가 없을 때 404가 나가는 것은 문서가 정한 것이 아니라 이 버전의 기본 설정에서 관찰한 동작입니다. 화면의 코드는 package와 import 줄을 줄였고, 컨트롤러가 시작 클래스와 같은 패키지(또는 그 아래)에 있다고 가정했습니다. 주소 등록은 @GetMapping만 다뤘고 @RequestMapping, @PostMapping이나 @Controller는 다루지 않았습니다. 스프링 부트의 DispatcherServlet이 서버가 뜰 때가 아니라 첫 요청이 올 때 초기화되는 것은 관찰했지만 이 실습의 단계에는 넣지 않았고, "세부 동작 실습: MVC 요청 흐름"에서 다룹니다.',
});
