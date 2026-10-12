Lab.register({
  id: 'authn_basic', nav: '인증과 인가', cat: '기초개념', mode: 'step', basic: true, deep: ['security'],
  title: '인증과 인가는 어떻게 다른가',
  intro: '인증과 인가는 서버가 요청을 받았을 때 하는 두 가지 확인입니다. 인증은 요청을 보낸 사람이 누구인지 확인하는 것(아이디와 비밀번호가 맞는지)이고, 인가는 그 사람이 이 일을 해도 되는지 확인하는 것(권한이 있는지)입니다. 순서는 인증이 먼저입니다. 이 확인은 컨트롤러의 코드에 없습니다. 요청이 컨트롤러에 닿기 전에 스프링 시큐리티가 하고, 그 규칙이 화면의 위쪽 설정 부분입니다. .requestMatchers("/admin").hasRole("ADMIN") 줄은 /admin을 ADMIN 권한이 있는 사람에게만 열어 주는 인가 규칙이고, .anyRequest().authenticated() 줄은 그 밖의 주소를 누구인지 확인된 사람에게만 열어 주는 규칙이며, .httpBasic(...) 줄은 요청에 실린 아이디와 비밀번호로 누구인지 확인하는 방법입니다. 이 실습은 인가 규칙을 지우거나 열어 두면서, 관리자 admin, 일반 회원 kim, 틀린 비밀번호, 아이디 없음의 요청을 /admin에 보내 어느 확인에서 막히고 어떤 응답이 나가는지 봅니다.',
  terms: ['인증과 인가', '401과 403', '권한(역할)', 'HTTP Basic 인증', 'Spring Security와 SecurityFilterChain'],
  controls: [
    { id: 'rule', label: '/admin에 적어 둔 규칙', type: 'select', value: 'role', options: [['role', '/admin은 hasRole("ADMIN")'], ['authed', '/admin의 권한 규칙을 지운다 (authenticated()만 남는다)'], ['open', '/admin은 permitAll() (누구에게나 열어 둔다)']] },
    { id: 'who', label: '/admin을 요청하는 사람', type: 'select', value: 'admin', options: [['admin', '관리자 admin이 맞는 비밀번호로 요청한다'], ['kim', '일반 회원 kim이 맞는 비밀번호로 요청한다'], ['wrong', 'kim이 틀린 비밀번호로 요청한다'], ['none', '아이디와 비밀번호 없이 요청한다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '인증과 인가는 어떻게 다르고, 관리자가 /admin을 요청하면 무슨 일이 일어나나', d: '관리자가 인증과 인가를 차례로 통과해 admin() 메서드가 실행됩니다.', v: { rule: 'role', who: 'admin' } },
    { t: '아이디와 비밀번호 없이 요청하면', q: '아이디와 비밀번호 없이 요청하면', d: '누구인지 확인되지 않아 401 응답이 나가고 admin() 메서드는 실행되지 않습니다.', v: { rule: 'role', who: 'none' } },
    { t: '일반 회원 kim이 요청하면', q: '일반 회원 kim이 요청하면', d: '누구인지는 확인되지만 권한이 없어 403 응답이 나갑니다.', v: { rule: 'role', who: 'kim' } },
    { t: 'kim이 틀린 비밀번호로 요청하면', q: 'kim이 틀린 비밀번호로 요청하면', d: '인증에서 막혀 401 응답이 나갑니다. 인가 규칙은 보지도 않습니다.', v: { rule: 'role', who: 'wrong' } },
    { t: 'hasRole("ADMIN") 규칙을 지우면', q: 'hasRole("ADMIN") 규칙을 지우고 kim이 요청하면', d: '확인된 사람이면 통과하므로 일반 회원 kim도 관리자 화면을 봅니다.', v: { rule: 'authed', who: 'kim' } },
    { t: '누구에게나 열어 두면', q: '/admin을 누구에게나 열어 두고(permitAll) 아이디 없이 요청하면', d: '누구인지 확인되지 않은 요청도 통과해 admin() 메서드가 실행됩니다.', v: { rule: 'open', who: 'none' } },
  ],
  // 이 설정에서 응답의 상태 코드
  result: function (c) {
    if (c.who === 'wrong') return 401;
    if (c.who === 'none') return c.rule === 'open' ? 200 : 401;
    if (c.who === 'admin') return 200;
    return c.rule === 'role' ? 403 : 200;
  },
  code: function (c) {
    var out = ['@Configuration', 'public class SecurityConfig {', '    @Bean', '    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {', '        http.authorizeHttpRequests(auth -> auth'];
    if (c.rule === 'role') out.push('                // 인가: /admin은 ADMIN 권한이 있는 사람만', '                .requestMatchers("/admin").hasRole("ADMIN")');
    if (c.rule === 'open') out.push('                // 확인 없음: /admin은 누구에게나 열어 둔다', '                .requestMatchers("/admin").permitAll()');
    out.push('                // 인증: 그 밖의 주소는 누구인지 확인된 사람이면', '                .anyRequest().authenticated())', '            // 요청에 실린 아이디와 비밀번호로 누구인지 확인한다', '            .httpBasic(Customizer.withDefaults());', '        return http.build();', '    }', '}', '',
      '@RestController', 'public class AdminController {', '    @GetMapping("/admin")', '    public String admin() {', '        return "관리자 화면";', '    }', '}');
    return out.join('\n');
  },
  label: function (c) { return { role: '/admin은 hasRole("ADMIN")', authed: '/admin의 권한 규칙 없음', open: '/admin은 permitAll()' }[c.rule] + ' · ' + { admin: 'admin이 요청', kim: 'kim이 요청', wrong: 'kim이 틀린 비밀번호로 요청', none: '아이디 없이 요청' }[c.who]; },
  columns: ['서버가 확인한 사람', '응답', 'admin() 메서드 실행'],
  simulate: function (c) {
    var ev = [], sum = [], st = { phase: '', a1: '', a2: '', resp: null, calls: 0 };
    var who = c.who, rule = c.rule, res = this.result(c), valid = who === 'admin' || who === 'kim';
    var nm = who === 'admin' ? 'admin' : 'kim', lbl = who === 'admin' ? '관리자' : '일반 회원', role = who === 'admin' ? 'ADMIN' : 'USER';
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var carried = { admin: '요청의 Authorization 헤더에 admin의 아이디와 맞는 비밀번호가 실려 있습니다.', kim: '요청의 Authorization 헤더에 kim의 아이디와 맞는 비밀번호가 실려 있습니다.', wrong: '요청의 Authorization 헤더에 kim의 아이디와 틀린 비밀번호가 실려 있습니다.', none: '이 요청에는 Authorization 헤더가 없습니다. 아이디도 비밀번호도 실려 있지 않습니다.' }[who];
    st.phase = 'sent';
    push('GET /admin 요청(서버에 /admin 주소의 화면을 달라는 요청)이 서버로 옵니다. ' + carried + (valid || who === 'wrong' ? ' 아이디와 비밀번호는 이 헤더에 실려서 오고, 확인은 서버가 합니다.' : ''), '');
    st.phase = 'sec';
    push('요청이 컨트롤러에 닿기 전에 스프링 시큐리티가 먼저 받습니다. 스프링 시큐리티는 컨트롤러 앞에 놓인 필터들의 줄이고, 이 요청을 컨트롤러에 보내도 되는지 두 가지를 차례로 확인합니다. 우리가 쓴 admin() 메서드에는 아직 아무것도 오지 않았습니다.', '');
    // 인증
    st.phase = 'authn';
    if (valid) {
      st.a1 = 'ok';
      push('인증(누구인가): 요청에 실린 아이디 ' + nm + '과 비밀번호를 등록된 사용자와 견줍니다. 맞습니다. 서버는 이 요청을 보낸 사람이 ' + nm + ' (' + lbl + ')임을 확인했고, 요청이 처리되는 동안 이 사실을 기억해 둡니다. 이 일은 .httpBasic(...) 줄이 켜 둔 방법으로 합니다.', 'good');
    } else if (who === 'wrong') {
      st.a1 = 'fail';
      push('인증(누구인가): 요청에 실린 아이디 kim과 비밀번호를 등록된 사용자와 견줍니다. 아이디는 있지만 비밀번호가 맞지 않습니다. 누구인지 확인되지 않으므로 시큐리티는 이 요청을 여기서 거절합니다. 인가 단계로 가지 않습니다.' + (rule === 'open' ? ' /admin이 permitAll()이어도 마찬가지입니다. 아이디와 비밀번호를 실어 보낸 요청은 먼저 인증을 거치고, 틀리면 /admin의 규칙을 보기 전에 끝납니다.' : ''), 'bad');
      st.a2 = 'skip'; st.resp = { status: '401', body: '' }; st.phase = 'done';
      push('스프링 시큐리티가 401 응답을 돌려보냅니다. 401은 "누구인지 확인되지 않았다"는 뜻이고, 응답에는 아이디와 비밀번호를 보내라는 안내(WWW-Authenticate 헤더)가 붙어 있습니다. admin() 메서드는 실행되지 않았습니다.', 'bad');
    } else {
      st.a1 = 'anon';
      push('인증(누구인가): 요청에 아이디와 비밀번호가 없습니다. 견줄 것이 없으므로 누구인지 확인되지 않은 채로 다음 단계로 넘어갑니다. 스프링 시큐리티는 이 요청을 이름 없는 "익명 사용자"의 요청으로 다룹니다.', '');
    }
    // 인가
    if (who !== 'wrong') {
      st.phase = 'authz';
      var head = '인가(해도 되는가): ', tail = '';
      if (rule === 'role') {
        head += '/admin의 규칙은 hasRole("ADMIN")이라서 ADMIN 권한이 있는 사람만 통과합니다. ';
        tail = who === 'admin' ? 'admin의 권한은 ADMIN입니다. 통과합니다.' : who === 'kim' ? 'kim의 권한은 USER뿐입니다. ADMIN 권한이 없으므로 거부합니다.' : '누구인지 확인되지 않았으므로, 권한을 따지기 전에 거부합니다.';
      } else if (rule === 'authed') {
        head += '/admin에는 따로 정한 규칙이 없어서, 그 밖의 주소에 쓰는 마지막 규칙 anyRequest().authenticated()가 적용됩니다. 누구인지 확인된 사람이면 통과합니다. ';
        tail = who === 'admin' ? 'admin은 확인된 사람이므로 통과합니다.' : who === 'kim' ? 'kim은 확인된 사람이므로 통과합니다. 권한이 USER뿐이어도 상관없습니다. 권한을 따지는 규칙이 없기 때문입니다.' : '이 요청은 누구인지 확인되지 않았으므로 거부합니다.';
      } else {
        head += '/admin의 규칙은 permitAll()이라서 누구에게나 열려 있습니다. ';
        tail = valid ? '누구인지 따지지 않고 통과시킵니다.' : '아이디가 없는 요청도 통과시킵니다.';
      }
      if (res === 200) {
        st.a2 = 'pass';
        push(head + tail, 'good');
        st.phase = 'ctl'; st.calls = 1;
        push('시큐리티를 통과해 요청이 컨트롤러에 닿고, admin() 메서드가 실행됩니다. 우리가 쓴 admin() 안에는 누구인지 확인하는 코드가 한 줄도 없습니다. 확인은 요청이 여기 닿기 전에 스프링 시큐리티가 끝냈습니다.', 'good');
        st.phase = 'done'; st.resp = { status: '200', body: '관리자 화면' };
        push('브라우저가 200 응답을 받습니다. 본문은 "관리자 화면"입니다.', '');
      } else if (res === 401) {
        st.a2 = 'd401';
        push(head + tail, 'bad');
        st.phase = 'done'; st.resp = { status: '401', body: '' };
        push('스프링 시큐리티가 401 응답을 돌려보냅니다. 누구인지 확인되지 않은 요청이 확인된 사람만 들어올 수 있는 곳에 왔으므로, "누구인지부터 밝혀라"는 뜻의 401입니다. 응답에는 아이디와 비밀번호를 보내라는 안내(WWW-Authenticate 헤더)가 붙어 있습니다. admin() 메서드는 실행되지 않았습니다.', 'bad');
      } else {
        st.a2 = 'd403';
        push(head + tail, 'bad');
        st.phase = 'done'; st.resp = { status: '403', body: '' };
        push('스프링 시큐리티가 403 응답을 돌려보냅니다. 누구인지는 확인됐지만 이 일을 할 권한이 없으므로 "당신은 안 된다"는 뜻의 403입니다. 401과 달리 아이디와 비밀번호를 보내라는 안내(WWW-Authenticate 헤더)는 붙지 않습니다. admin() 메서드는 실행되지 않았습니다.', 'bad');
      }
    }
    // 요약
    var who2 = nm;
    if (rule === 'role' && who === 'admin') {
      sum.push('인증은 요청을 보낸 사람이 누구인지 확인하는 것이고, 인가는 그 사람이 이 일을 해도 되는지 확인하는 것입니다. 인증이 먼저입니다. 관리자 admin은 둘 다 통과해서 admin() 메서드가 실행되고 200 응답을 받았습니다.');
      sum.push('두 확인은 컨트롤러에 없습니다. 요청이 컨트롤러에 닿기 전에 스프링 시큐리티가 했고, 우리가 쓴 admin() 안에는 확인하는 줄이 없습니다. 둘 다 통과해야 컨트롤러의 코드가 실행됩니다.');
    } else if (who === 'wrong') {
      sum.push('아이디가 kim이어도 비밀번호가 틀리면 누구인지 확인되지 않아, 인증 단계에서 401 응답이 나갑니다. 인가 단계까지 가지 못했고 admin() 메서드는 실행되지 않았습니다.');
      sum.push(rule === 'open' ? '/admin이 permitAll()이어도 틀린 비밀번호를 실은 요청은 인증에서 거절됩니다. 누구에게나 열어 둔 주소에도, 아이디와 비밀번호를 실어 보내면 먼저 확인이 따라옵니다.' : '틀린 비밀번호는 아이디를 보내지 않은 것과 같은 401입니다. 아이디만으로 kim이 되는 것이 아니라, 맞는 비밀번호로 확인되어야 kim입니다.');
    } else if (res === 401) {
      sum.push('아이디와 비밀번호가 없으면 누구인지 확인되지 않아 401 응답이 나갑니다. 401은 "누구인지부터 밝혀라"는 뜻이고, admin() 메서드는 실행되지 않습니다.');
      sum.push('권한을 따지는 인가보다 누구인지 확인하는 인증이 먼저입니다. 누구인지 모르는 요청은 권한이 있는지 없는지를 말할 수 없으므로 403이 아니라 401입니다.');
    } else if (res === 403) {
      sum.push('kim은 누구인지 확인됐지만 /admin은 ADMIN 권한이 있어야 하므로 403 응답이 나갑니다. 403은 "당신은 안 된다"는 뜻이고, admin() 메서드는 실행되지 않습니다.');
      sum.push('인증을 통과한 것과 인가를 통과한 것은 다릅니다. 누구인지 확인되고도 막힐 수 있고, 같은 아이디와 비밀번호로 다시 요청해도 결과는 같습니다.');
    } else if (rule === 'authed') {
      sum.push('hasRole("ADMIN") 규칙을 지우면 /admin도 "확인된 사람이면 통과"인 규칙을 받아, ' + (who === 'kim' ? '일반 회원 kim도 통과하고 200 응답을 받습니다. admin() 메서드가 실행됩니다.' : '관리자 admin은 그대로 통과합니다. 하지만 이제 일반 회원도 통과합니다.'));
      sum.push('권한을 가려내는 일은 인가 규칙이 합니다. 그 규칙이 없으면 인증만 통과한 사람은 누구나 관리자 화면을 봅니다.');
    } else {
      sum.push('/admin을 permitAll()로 열어 두면 ' + (valid ? '누구인지 확인된 ' + who2 + '의 요청도 아무 문제 없이 통과해서' : '아이디와 비밀번호가 없는 요청도 통과해서') + ' 200 응답을 받고 admin() 메서드가 실행됩니다.');
      sum.push(valid ? 'permitAll()은 누구인지도 권한도 따지지 않습니다. ' + who2 + '이 누구인지 서버가 알아냈어도 통과 여부에는 쓰이지 않았습니다.' : '누구에게나 열어 둔 주소는 누구나 부를 수 있습니다. 서버가 확인한 사람은 없지만(익명) 메서드는 실행되었고, 관리자 화면이 아무에게나 열렸습니다.');
    }
    return { events: ev, summary: sum, row: [valid ? nm + ' (' + lbl + ')' : '확인되지 않음', res === 200 ? '200 관리자 화면' : String(res), res === 200 ? '실행됨' : '실행되지 않음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 요청이 서버에 오는 것부터 시작합니다.'); return; }
    var s1 = { '': '', ok: (c.who === 'admin' ? 'admin' : 'kim') + ' 확인됨', fail: '비밀번호가 틀려서 확인되지 않음', anon: '아이디가 없어 확인되지 않음 (익명)' }[s.a1];
    var s2 = { '': '', pass: '통과', d401: '거부 (401)', d403: '거부 (403)', skip: '거치지 않음' }[s.a2];
    var rule = { role: 'hasRole("ADMIN")', authed: 'authenticated()', open: 'permitAll()' }[c.rule];
    H.table(v, ['확인', '내용', '결과'], [
      { cls: '', cells: ['인증: 누구인가', '실린 아이디와 비밀번호가 등록된 것과 맞는가', { v: s1, cls: s.a1 === 'ok' ? 'good' : s.a1 === 'fail' ? 'bad' : '' }] },
      { cls: s.a2 === 'skip' ? 'gone' : '', cells: ['인가: 해도 되는가', '/admin의 규칙 ' + rule, { v: s2, cls: s.a2 === 'pass' ? 'good' : s.a2 === 'skip' || !s.a2 ? '' : 'bad' }] },
    ], '서버가 하는 두 가지 확인');
    if (s.resp) H.table(v, ['응답', 'WWW-Authenticate 헤더'], [{ cls: '', cells: [{ v: s.resp.status + (s.resp.body ? ' ' + s.resp.body : ''), cls: s.resp.status === '200' ? 'good' : 'bad' }, s.resp.status === '401' ? '있음 (아이디와 비밀번호를 보내라는 안내)' : '없음'] }], '응답');
    H.counters(v, [[s.calls, 'admin() 실행']]);
  },
  // 그림: 왼쪽에 요청(누가 보냈는지), 가운데 스프링 시큐리티 안에 관문 둘(인증, 인가)을 차례로, 오른쪽에 컨트롤러의 admin(). 막힌 관문은 빨갛게 보이고 그곳에서 응답이 돌아간다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 250);
    var who = { admin: ['admin', '맞는 비밀번호'], kim: ['kim', '맞는 비밀번호'], wrong: ['kim', '틀린 비밀번호'], none: ['아이디 없음', ' '] }[c.who];
    P.box('rq', 14, 56, 100, 70, { cls: s && ph !== 'done' ? 'wait' : 'plain', title: 'GET /admin', sub: who });
    P.region('sc', 144, 16, 376, 138, '스프링 시큐리티');
    var a1 = s ? s.a1 : '', a2 = s ? s.a2 : '';
    var t1 = { '': ' ', ok: (c.who === 'admin' ? 'admin' : 'kim') + ' 확인됨', fail: '비밀번호가 틀림', anon: '아이디가 없음' }[a1];
    P.box('g1', 156, 50, 150, 76, { cls: ph === 'authn' ? 'hot now' : a1 === 'ok' ? 'good' : a1 === 'fail' ? 'bad' : a1 === 'anon' ? 'wait' : 'ghost', title: '인증: 누구인가', sub: ['비밀번호가 맞나', t1] });
    var r2 = { role: 'ADMIN 권한이 있나', authed: '확인된 사람인가', open: '누구나 통과' }[c.rule];
    var t2 = { '': ' ', pass: '통과', d401: '거부 401', d403: '거부 403', skip: '거치지 않음' }[a2];
    P.box('g2', 358, 50, 150, 76, { cls: ph === 'authz' ? 'hot now' : a2 === 'pass' ? 'good' : a2 === 'd401' || a2 === 'd403' ? 'bad' : 'ghost', title: '인가: 해도 되는가', sub: [r2, t2] });
    var on = ph === 'ctl';
    P.box('k', 570, 50, 100, 76, { cls: on ? 'hot now' : s && s.calls ? 'good' : 'ghost', title: '컨트롤러', sub: ['admin()', '실행 ' + (s ? s.calls : 0) + '번'] });
    if (s) P.arrow('a_rq', 'rq:r:0.5', 'g1:l:0.5', ph === 'sent' ? {} : { cls: 'hot' });
    if (s && (a1 === 'ok' || a1 === 'anon') && a2 !== 'skip' && (ph === 'authz' || ph === 'ctl' || ph === 'done')) P.arrow('a_12', 'g1:r:0.5', 'g2:l:0.5', { cls: 'good' });
    if (a2 === 'pass' && (ph === 'ctl' || ph === 'done')) P.arrow('a_2k', 'g2:r:0.5', 'k:l:0.5', { cls: 'good' });
    if (s && s.resp) {
      if (a1 === 'fail') P.arrow('a_rs', 'g1:b:0.5', 'n1:t:0.3', { cls: 'bad' });
      else if (a2 === 'd401' || a2 === 'd403') P.arrow('a_rs', 'g2:b:0.5', 'n1:t:0.7', { cls: 'bad' });
      else P.arrow('a_rs', 'k:b:0.5', 'n1:t:0.9', { cls: 'good' });
    }
    P.box('n1', 14, 192, 322, 36, { cls: s && s.resp ? (s.resp.status === '200' ? 'good' : 'bad') : 'ghost', title: '응답', right: s && s.resp ? s.resp.status : '-' });
    P.box('n2', 344, 192, 322, 36, { cls: s && s.calls ? 'good' : 'ghost', title: 'admin() 메서드 실행', right: (s ? s.calls : 0) + '번' });
  },
  assume: '스프링 부트 4.1.1(스프링 프레임워크 7.0.9, 내장 톰캣 11)과 스프링 시큐리티 7.1.1을 JDK 21에서 실행한 결과입니다. 열두 가지 조합을 모두, 화면의 코드와 같은 소스(보안 설정 SecurityConfig와 컨트롤러 AdminController, 컨트롤러에는 실행 횟수를 세는 줄만 더함)를 패키지 app으로 컴파일하고 자식 자바 프로세스로 실제 서버를 띄운 뒤, 실제 HTTP 요청(GET /admin)을 보내 확인했습니다. 아이디와 비밀번호는 Authorization 헤더에 실어 보냈고, 요청마다 서버를 새로 띄웠습니다. 화면에서 줄인 것은 package와 import 줄, 시작 클래스, 그리고 사용자 등록입니다. 사용자는 메모리 안의 사용자 저장소(InMemoryUserDetailsManager)에 일반 회원 kim(역할 USER)과 관리자 admin(역할 ADMIN)을 둔 것이고, 비밀번호는 {noop} 접두어를 붙여 암호화하지 않은 시험용 값입니다(실제 서비스에서는 비밀번호를 암호화해 저장합니다). 보안 설정은 화면의 줄 말고는 아무것도 더하지 않았습니다. CSRF와 세션 설정은 기본값이고, GET 요청이라 결과에 영향을 주지 않았습니다. "서버가 확인한 사람"은 요청이 처리되는 동안 SecurityContextHolder에 어떤 Authentication이 기록되었는지로 얻었습니다. SecurityContextHolder의 저장 방식을 기본 방식을 감싼 기록용 방식으로 바꿔 읽고 쓰는 때마다 이름과 권한을 적었으므로, 컨트롤러에 가지 못한 요청의 인증 정보도 볼 수 있고 보안 필터 체인에는 아무것도 더하지 않았습니다. 한계는 필터 안에서 일어난 일을 읽고 쓰는 시점으로만 본다는 것입니다(필터의 내부 판단 자체를 본 것은 아닙니다). 대조한 것은 이 기록에서 얻은 확인된 사람(없으면 익명이거나 아무것도 설정되지 않음), 상태 코드와 본문, WWW-Authenticate 헤더 유무, admin() 메서드의 실행 횟수, 인증이 인가보다 먼저 일어나는 순서, 오류 응답이 /error로 한 번 더 넘어가는지입니다. 문서가 정한 것은 RFC 9110의 11절 HTTP Authentication(11.1, 11.6.1)과 15.5.2절(401은 유효한 인증 정보가 없다는 뜻이고 WWW-Authenticate를 보내야 한다), 15.5.4절(403은 서버가 요청을 이해했지만 처리를 거부한다는 뜻), 스프링 시큐리티 문서 Authorize HttpServletRequests(AuthorizationFilter가 규칙을 위에서부터 차례로 보고 첫 번째로 맞는 것만 적용한다는 것, hasRole이 ROLE_ 접두어를 붙인다는 것, 거부되면 AccessDeniedException이 던져진다는 것)와 Authentication의 Architecture, Basic 절(인증되지 않은 요청이 거부되면 AuthenticationEntryPoint가 WWW-Authenticate 헤더를 보낸다는 것, 인증이 실패하면 SecurityContextHolder를 비우고 같은 처리기를 부른다는 것)입니다. 문서 내용은 WebFetch로 열어 요약된 결과로 확인했고 RFC 전문을 직접 읽지는 못했습니다. 아래는 문서가 정한 것이 아니라 이 버전에서 관찰한 동작입니다. 첫째, 이 화면의 코드를 그대로 실행하면 일반 회원 kim의 요청에 403이 그대로 나갑니다. 오류 응답이 /error로 한 번 더 넘어가는데, 그 두 번째 요청에서도 kim이 확인된 사람으로 기록되어 막히지 않았기 때문입니다. 세션을 쓰지 않고 직접 만든 필터로 인증한 "시큐리티 필터 체인" 실습에서는 같은 단계에서 403이 401로 바뀌었으니, 구성에 따라 다를 수 있습니다. 둘째, 틀린 비밀번호는 /admin이 permitAll()이어도 401입니다. 아이디와 비밀번호가 실린 요청은 인가 규칙을 보기 전에 인증에서 거절되었고, 인가 단계의 흔적은 기록에 없었습니다. 셋째, 아이디가 없는 요청은 인증에서 막히지 않고 익명 사용자로 인가 단계까지 가며, 거기서 규칙이 막으면 401, 열려 있으면 컨트롤러까지 갑니다. 넷째, 401 응답에는 WWW-Authenticate 헤더(값은 Basic realm="Realm")가 붙고 403과 200 응답에는 없었습니다. 다섯째, 응답 본문은 401이 비어 있고 403은 스프링 부트의 오류 페이지였는데, 요청의 Accept 헤더에 따라 달라질 수 있어 화면에서는 상태 코드만 다뤘습니다. 여섯째, 스프링 시큐리티 7.1에서는 로그인한 사용자의 권한에 ROLE_ 권한 말고 인증 방식을 나타내는 권한(FACTOR_PASSWORD)이 함께 기록되는데, 이 실습에서는 다루지 않았습니다. 로그인 방식(로그인 화면, 세션, 토큰)은 다루지 않았습니다. 이 실습의 요청은 요청마다 아이디와 비밀번호를 실어 보내는 HTTP Basic 방식이고, 로그인 상태를 이어 가는 세션과 토큰은 기초개념의 "세션", "토큰" 실습과 공부 쪽 "시큐리티 필터 체인" 실습에서 다룹니다. 실제 필터 체인에는 여기 적지 않은 필터가 더 있습니다.',
});
