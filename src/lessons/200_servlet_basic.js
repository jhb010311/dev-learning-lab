Lab.register({
  id: 'servlet_basic', nav: '서블릿', cat: '기초개념', mode: 'step', basic: true, deep: ['servlet'],
  title: '어떤 클래스를 서블릿이라고 부르는가',
  intro: '서블릿은 class로 선언한 자바 클래스입니다. 일반 클래스와 다른 곳은 두 군데입니다. extends HttpServlet은 웹 요청을 받을 수 있는 클래스라는 자격이고, @WebServlet("/hello")는 브라우저가 /hello라는 주소로 보낸 요청을 이 클래스에 맡긴다는 등록입니다. 이 둘을 하나씩 지워 가며 같은 요청을 보내, 톰캣이 이 클래스의 doGet을 불러 주는지를 봅니다.',
  terms: ['서블릿 클래스', 'HttpServlet', '@WebServlet', '서블릿과 서블릿 컨테이너'],
  controls: [
    { id: 'ext', label: '클래스 선언에 extends HttpServlet을 쓴다', type: 'check', value: true },
    { id: 'map', label: '클래스 위에 @WebServlet("주소")를 적는다', type: 'check', value: true },
    { id: 'many', label: '받을 주소와 클래스', type: 'select', value: 'one', options: [['one', '/hello 하나, 클래스 1개'], ['each', '/login, /join, /members, 클래스 3개'], ['shared', '/login, /join, /members, 클래스 1개']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '서블릿은 어떻게 생겼고, /hello 요청이 오면 무슨 일이 일어나나', d: '두 가지가 다 있는 서블릿. 요청이 오면 톰캣이 doGet을 불러 줍니다.', v: { ext: true, map: true, many: 'one' } },
    { t: '@WebServlet을 지우면', q: '@WebServlet("/hello")를 지우면', d: '서블릿 클래스이지만 맡은 주소가 없어 한 번도 불리지 않습니다.', v: { ext: true, map: false, many: 'one' } },
    { t: 'extends HttpServlet을 지우면', q: 'extends HttpServlet을 지우면', d: '주소는 등록되지만 서블릿이 아니어서 첫 요청에서 실패합니다.', v: { ext: false, map: true, many: 'one' } },
    { t: '둘 다 지우면', q: '둘 다 지우면', d: '같은 메서드가 있는 일반 클래스. 톰캣은 이 클래스를 쓰지 않습니다.', v: { ext: false, map: false, many: 'one' } },
    { t: '주소가 3개면', q: '받을 주소가 /login, /join, /members 세 개면 클래스는 몇 개 필요한가', d: '주소마다 서블릿 클래스를 하나씩 만듭니다.', v: { ext: true, map: true, many: 'each' } },
    { t: '클래스 하나에 주소 3개를 적으면', q: '클래스 하나에 세 주소를 모두 적으면', d: 'doGet이 하나뿐이라 세 주소가 같은 응답을 냅니다.', v: { ext: true, map: true, many: 'shared' } },
  ],
  // 이 설정에서 만드는 클래스들: 이름, 적어 둔 주소, doGet이 응답에 쓰는 글
  plan: function (c) {
    if (c.many === 'one') return [{ name: 'Hello', urls: ['/hello'], body: '안녕하세요' }];
    if (c.many === 'each') return [{ name: 'Login', urls: ['/login'], body: '로그인 화면' }, { name: 'Join', urls: ['/join'], body: '회원가입 화면' }, { name: 'Members', urls: ['/members'], body: '회원 목록' }];
    return [{ name: 'Member', urls: ['/login', '/join', '/members'], body: '회원 화면' }];
  },
  code: function (c) {
    return this.plan(c).map(function (k, i) {
      var out = [];
      if (c.map) { if (i === 0) out.push('// 등록: 이 주소로 온 요청을 이 클래스에 맡긴다'); out.push(k.urls.length === 1 ? '@WebServlet("' + k.urls[0] + '")' : '@WebServlet({"' + k.urls.join('", "') + '"})'); }
      if (c.ext && i === 0) out.push('// 자격: 웹 요청을 받을 수 있는 서블릿 클래스');
      out.push('public class ' + k.name + (c.ext ? ' extends HttpServlet' : '') + ' {');
      out.push('    protected void doGet(HttpServletRequest req, HttpServletResponse resp)', '            throws IOException {', '        resp.setContentType("text/plain; charset=UTF-8");', '        resp.getWriter().write("' + k.body + '");', '    }', '}');
      return out.join('\n');
    }).join('\n\n');
  },
  label: function (c) { return (c.ext ? 'extends 있음' : 'extends 없음') + ' · ' + (c.map ? '@WebServlet 있음' : '@WebServlet 없음') + ' · ' + { one: '주소 1개', each: '주소 3개, 클래스 3개', shared: '주소 3개, 클래스 1개' }[c.many]; },
  columns: ['서블릿 타입인가', '톰캣의 주소 표', '응답', '톰캣이 만든 객체', 'doGet 실행'],
  simulate: function (c) {
    var ks = this.plan(c), ev = [], sum = [], names = ks.map(function (k) { return k.name; });
    var paths = []; ks.forEach(function (k) { k.urls.forEach(function (u) { paths.push(u); }); });
    var st = { up: false, table: [], cls: {}, phase: '', path: '', to: '', resp: null, made: 0, doGet: 0, reqs: [] };
    ks.forEach(function (k) { st.cls[k.name] = { made: false, runs: 0, bad: false }; });
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function owner(p) { for (var i = 0; i < ks.length; i++) if (ks[i].urls.indexOf(p) >= 0) return ks[i]; }
    var list = names.join(', ') + ' 클래스';
    // 서버 시작: @WebServlet을 읽어 주소 표를 만든다
    st.up = true;
    if (c.map) {
      paths.forEach(function (p) { st.table.push([p, owner(p).name]); });
      push('서버가 뜹니다. 톰캣이 웹 애플리케이션의 클래스 파일을 훑어 @WebServlet이 붙은 클래스를 찾습니다. ' + list + '에 붙어 있으므로, 거기 적힌 주소와 클래스를 주소 표에 적습니다. 객체는 아직 만들지 않습니다.' + (c.ext ? '' : ' 이때 톰캣은 @WebServlet만 보고 적습니다. 그 클래스가 서블릿인지는 아직 확인하지 않습니다.'), '');
    } else {
      push('서버가 뜹니다. 톰캣이 웹 애플리케이션의 클래스 파일을 훑어 @WebServlet이 붙은 클래스를 찾습니다. 하나도 없으므로 주소 표는 비어 있습니다. ' + (c.ext ? list + '는 extends HttpServlet이 있어 서블릿 클래스이지만, 맡을 주소를 적지 않아 표에 오르지 못했습니다.' : list + '의 파일은 그 폴더에 있지만, 톰캣에게는 쓸 일이 없는 클래스입니다.'), '');
    }
    paths.forEach(function (p, i) {
      var k = owner(p), o = st.cls[k.name], head = i === 0;
      st.path = p; st.to = ''; st.resp = null; st.phase = 'sent';
      push(head ? '브라우저 주소창에 localhost:8080' + p + ' 주소를 입력하면, 브라우저가 서버에 GET ' + p + ' 요청을 보냅니다.' : '브라우저가 GET ' + p + ' 요청을 보냅니다.', '');
      st.phase = 'lookup';
      if (!c.map) {
        st.resp = { status: '404', body: '' }; st.phase = 'done'; st.reqs.push([p, '404', '톰캣']);
        push('톰캣이 주소 표에서 ' + p + ' 주소를 찾습니다. 맡은 클래스가 없으므로 톰캣이 404 응답을 돌려줍니다.' + (head ? ' ' + k.name + ' 클래스의 객체는 만들어지지 않았고 doGet도 실행되지 않았습니다.' + (c.ext ? '' : ' doGet이라는 이름의 메서드가 있어도, 톰캣이 모르는 클래스의 메서드는 아무도 부르지 않습니다.') : ''), 'bad');
        return;
      }
      st.to = k.name;
      if (o.bad) {
        st.resp = { status: '404', body: '' }; st.phase = 'done'; st.reqs.push([p, '404', '톰캣']);
        push('톰캣이 주소 표에서 ' + p + ' 주소를 찾습니다. ' + k.name + ' 클래스가 적혀 있습니다. 이 클래스로 가는 요청은 앞에서 이미 실패했습니다. 톰캣은 이 등록을 더 쓰지 않고 404 응답을 돌려줍니다.', 'bad');
        return;
      }
      push('톰캣이 주소 표에서 ' + p + ' 주소를 찾습니다. ' + k.name + ' 클래스가 적혀 있습니다.', '');
      if (!o.made) {
        o.made = true; st.made++;
        if (!c.ext) {
          o.bad = true; st.resp = { status: '500', body: '' }; st.phase = 'done'; st.reqs.push([p, '500', '톰캣']);
          push('톰캣이 ' + k.name + ' 클래스의 객체를 만들어 서블릿으로 쓰려고 합니다. 그런데 이 클래스는 extends HttpServlet이 없어 서블릿 타입이 아닙니다. 톰캣은 이 객체에 요청을 넘기지 못하고 500 오류 응답을 돌려줍니다. doGet은 실행되지 않습니다.', 'bad');
          return;
        }
        push('톰캣이 ' + k.name + ' 클래스의 객체를 만듭니다.' + (head ? ' 우리가 쓴 코드에는 new ' + k.name + '()라는 줄이 없습니다. 서블릿 객체는 톰캣이 만듭니다.' : ''), '');
      } else push('이미 만들어 둔 ' + k.name + ' 클래스의 객체가 있습니다. 새로 만들지 않고 그 객체를 씁니다.', '');
      o.runs++; st.doGet++; st.phase = 'call';
      push(head ? '톰캣이 이 객체에 요청을 넘깁니다. HttpServlet에 들어 있는 코드가 GET 요청인 것을 보고 우리가 쓴 doGet을 부릅니다. doGet을 부르는 줄도 우리가 쓰지 않았습니다. doGet이 응답에 쓰는 글은 "' + k.body + '"입니다.' : '톰캣이 이 객체에 요청을 넘기고, ' + k.name + ' 클래스의 doGet이 실행됩니다. 응답에 쓰는 글은 "' + k.body + '"입니다.' + (c.many === 'shared' ? ' 앞의 주소와 같은 doGet이므로 쓰는 글도 같습니다.' : ''), 'good');
      st.resp = { status: '200', body: k.body }; st.phase = 'done'; st.reqs.push([p, '200 ' + k.body, k.name + '.doGet']);
      push('브라우저가 200 응답을 받습니다. 본문은 "' + k.body + '"입니다.', '');
    });
    if (c.ext && c.map) {
      sum.push('서블릿은 class로 선언한 자바 클래스입니다. 일반 클래스와 다른 곳은 extends HttpServlet(자격)과 @WebServlet(주소 등록)이고, 이 둘이 있으면 톰캣이 객체를 만들고 요청이 올 때 doGet을 불러 줍니다.');
      if (c.many === 'one') sum.push('우리가 쓴 코드에는 new도, doGet을 부르는 줄도 없습니다. 일반 클래스의 메서드는 우리 코드가 불러야 실행되지만, 서블릿의 메서드는 요청이 오면 톰캣이 부릅니다.');
      if (c.many === 'each') sum.push('주소가 3개라서 클래스도 3개를 만들었습니다. 서블릿은 주소를 클래스에 적고, GET 요청을 받는 메서드(doGet)가 클래스마다 하나이기 때문입니다. 주소가 늘면 클래스도 그만큼 늡니다.');
      if (c.many === 'shared') sum.push('클래스 하나에 주소 3개를 적을 수는 있습니다. 하지만 객체도 doGet도 하나뿐이라 세 주소가 같은 응답을 냈습니다. 주소마다 다른 응답을 내려면 클래스를 나누거나, doGet 안에서 요청의 주소를 보고 직접 갈라야 합니다.');
    } else if (!c.ext && !c.map) {
      sum.push('이 클래스는 서블릿이 아닌 일반 클래스입니다. doGet이라는 메서드가 있고 내용도 같지만 톰캣은 이 클래스를 쓰지 않았습니다. 객체도 만들어지지 않았고 메서드도 실행되지 않았습니다.');
      sum.push('메서드 이름이 doGet이라서 요청을 받는 것이 아닙니다. 톰캣이 부르는 것은 주소 표에 오른 서블릿의 메서드뿐입니다.');
    } else if (c.ext) {
      sum.push('extends HttpServlet이 있으므로 서블릿 클래스입니다. 하지만 맡을 주소를 등록하지 않아 톰캣이 한 번도 쓰지 않았습니다. 요청을 받으려면 자격과 등록이 둘 다 있어야 합니다.');
    } else {
      sum.push('@WebServlet으로 주소는 등록됐지만, extends HttpServlet이 없어 서블릿이 아닙니다. 톰캣은 서버가 뜰 때는 알아채지 못하고, 첫 요청에서 객체를 만들어 서블릿으로 쓰려는 순간 실패했습니다.');
      sum.push('@WebServlet은 주소를 등록할 뿐, 일반 클래스를 서블릿으로 바꿔 주지 않습니다. 서블릿 명세도 @WebServlet을 붙이는 클래스는 HttpServlet을 상속해야 한다고 정해 두었습니다.');
    }
    var tableText = !c.map ? '비어 있음' : c.many === 'one' ? '/hello → ' + names[0] : '주소 3개 → 클래스 ' + ks.length + '개';
    return { events: ev, summary: sum, ks: ks, row: [c.ext ? '예' : '아니요', tableText, st.reqs.map(function (r) { return r[1]; }).join(' / '), st.made + '개', st.doGet + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 뜨는 것부터 시작합니다.'); return; }
    H.table(v, ['주소', '맡은 클래스'], s.table.length ? s.table.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['비어 있음', ''] }], '톰캣의 주소 표');
    if (s.reqs.length) H.table(v, ['요청', '응답', '응답을 만든 것'], s.reqs.map(function (r) { return { cls: '', cells: ['GET ' + r[0], { v: r[1], cls: r[1].indexOf('200') === 0 ? 'good' : 'bad' }, r[2]] }; }), '요청과 응답');
    H.counters(v, [[s.made, '톰캣이 만든 객체'], [s.doGet, 'doGet 실행']]);
  },
  // 그림: 왼쪽에 브라우저, 가운데에 톰캣과 주소 표, 오른쪽에 우리가 작성한 클래스. 요청이 주소 표를 거쳐 클래스의 doGet에 닿는지를 화살표로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, ks = sim.ks, last = shown[shown.length - 1], s = last ? last.snap : null, n = ks.length;
    P.size(680, 292);
    var busy = s && s.phase && s.phase !== 'done';
    P.box('br', 14, 82, 108, 58, { cls: busy ? 'wait' : 'plain', title: '브라우저', sub: !s || !s.path ? '대기' : s.resp ? s.resp.status + ' 응답' : 'GET ' + s.path });
    P.region('tc', 164, 16, 232, 208, '톰캣' + (s && s.up ? '' : ': 시작 전'));
    var rows = s && s.table.length ? s.table.map(function (r) { return r[0] + ' → ' + r[1]; }) : [s && s.up ? '비어 있음' : ' '];
    P.box('tb', 174, 76, 212, 30 + rows.length * 19, { cls: s && s.phase === 'lookup' ? 'hot now' : s && s.table.length ? 'plain' : 'ghost', title: '주소 표', sub: rows });
    P.region('cl', 436, 16, 230, 208, '우리가 작성한 클래스');
    ks.forEach(function (k, i) {
      var o = s ? s.cls[k.name] : { made: false, runs: 0, bad: false }, on = s && s.phase === 'call' && s.to === k.name;
      var kind = c.ext ? '서블릿 클래스' : '일반 클래스', state = o.bad ? '서블릿이 아니어서 실패' : o.made ? '객체 1개 · doGet ' + o.runs + '번' : '객체 없음';
      var cls = o.bad ? 'bad' : on ? 'hot now' : o.runs ? 'good' : c.ext ? 'plain' : 'ghost';
      if (n === 1) P.box('k' + i, 446, 76, 210, 70, { cls: cls, title: k.name, sub: [kind, state] });
      else P.box('k' + i, 446, 46 + i * 58, 210, 50, { cls: cls, title: k.name, sub: kind + ' · ' + (o.bad ? '실패' : o.made ? 'doGet ' + o.runs + '번' : '객체 없음') });
    });
    if (s && s.path && (s.phase === 'sent' || s.phase === 'lookup' || s.phase === 'call')) P.arrow('rq', 'br:r:0.3', 'tb:l:0.3', {});
    if (s && s.phase === 'call') P.arrow('call', 'tb:r', 'k' + ks.map(function (k) { return k.name; }).indexOf(s.to) + ':l', { cls: 'hot', label: 'doGet' });
    if (s && s.resp) P.arrow('rs', 'tb:l:0.75', 'br:r:0.75', { cls: s.resp.status === '200' ? 'good' : 'bad', label: s.resp.status });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.made ? 'wait' : 'ghost', title: '톰캣이 만든 객체', right: (s ? s.made : 0) + '개' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.doGet ? 'good' : 'ghost', title: 'doGet 실행', right: (s ? s.doGet : 0) + '번' });
  },
  assume: '서블릿 컨테이너는 톰캣 11.0.24(Jakarta Servlet 6.1)이고, 브라우저는 주소마다 GET 요청을 한 번씩 차례로 보낸다고 가정했습니다. 주소의 localhost:8080은 내 컴퓨터에서 톰캣을 기본 포트로 띄웠을 때의 예입니다. 열두 가지 조합을 모두, 화면의 코드와 같은 소스를 컴파일해 웹 애플리케이션 폴더(WEB-INF/classes)에 넣고 실제 톰캣을 띄워 요청을 보낸 결과와 대조했습니다. 대조한 것은 클래스가 Servlet 타입인지, 톰캣의 주소 표, 응답의 상태 코드와 본문, 만들어진 객체 수, doGet 실행 횟수입니다. 모든 서블릿이 Servlet 인터페이스를 구현한다는 것과 HttpServlet이 그 구현이라는 것은 Jakarta Servlet 명세 2장을, @WebServlet을 붙인 클래스는 HttpServlet을 상속해야 하고 주소를 하나 이상 적어야 한다는 것은 명세 8.1.1절을 따랐습니다. 화면은 extends HttpServlet 하나로 자격을 나타냈지만, 정확한 조건은 Servlet 인터페이스의 구현이며 HttpServlet을 상속하는 것이 가장 흔한 방법입니다. 주소 등록도 @WebServlet 말고 web.xml 설정 파일이나 코드로 할 수 있는데, 여기서는 @WebServlet만 다뤘습니다. 화면의 코드는 import 줄과, 재정의한 메서드에 흔히 붙이는 @Override를 줄였습니다. @WebServlet만 붙인 일반 클래스가 첫 요청에 500을, 같은 등록으로 가는 그다음 요청부터 404를 돌려준다는 것은 명세가 정한 것이 아니라 이 톰캣 버전에서 관찰한 동작입니다. 톰캣이 객체를 만든 뒤 doGet에 이르기까지 거치는 init과 service 호출은 줄였고, "세부 동작 실습: 서블릿"에서 다룹니다.',
});
