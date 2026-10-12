Lab.register({
  id: 'accessctl', nav: 'Access control', cat: 'Authentication', mode: 'step',
  title: 'If a logged-in user only changes the number in the URL, can they see someone else\'s order?',
  intro: 'Being logged in only means that "who you are has been confirmed" (authentication). It does not mean "you may view this resource" (authorization). What happens if kim logs in and then changes only the order number in the URL to request lee\'s order? Depending on what the server checks, the order is either shown as it is or the request is refused.',
  terms: ['Authentication and authorization', 'Access control and ownership checks', 'Role-based access control (RBAC)', 'HTTP status codes', 'Spring Security and SecurityFilterChain'],
  controls: [
    { id: 'check', label: 'What the server checks', type: 'select', value: 'login', options: [['login', 'Checks only that the user is logged in'], ['role', 'Checks only the role (USER) with a URL rule'], ['owner403', 'Checks that the user owns the order, and answers 403 if not'], ['owner404', 'Looks only among the user\'s own orders, and answers 404 if not found'], ['ownerAdmin', 'Allows the owner or the ADMIN role, otherwise 403']] },
    { id: 'who', label: 'Requesting user (logged in)', type: 'select', value: 'kim', options: [['kim', 'kim · role USER · owner of order 1'], ['admin', 'park · role ADMIN (customer support staff) · has no orders']] },
    { id: 'target', label: 'Requested URL', type: 'select', value: '2', options: [['1', 'GET /orders/1 · kim\'s order'], ['2', 'GET /orders/2 · lee\'s order'], ['99', 'GET /orders/99 · an order that does not exist']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when kim requests GET /orders/2, lee\'s order, on a server that checks only that the user is logged in?', d: 'The server checks only that the user is logged in. Changing just the number shows lee\'s order as it is.', v: { check: 'login', who: 'kim', target: '2' } },
    { t: 'Blocking by role', q: 'What if the server checks only the role (USER) with a URL rule?', d: 'kim is also USER, so the request passes. A role does not know whose order it is.', v: { check: 'role', who: 'kim', target: '2' } },
    { t: 'Checking the owner', q: 'What if the server checks that the user owns the order, and answers 403 if not?', d: 'The owner of the order and the logged-in user differ, so the request is refused with 403.', v: { check: 'owner403', who: 'kim', target: '2' } },
    { t: 'Entering a number that does not exist', q: 'What if the server checks that the user owns the order, and kim requests GET /orders/99, an order that does not exist?', d: 'The response is 404. Order 2 gave 403, so it becomes known that order 2 exists.', v: { check: 'owner403', who: 'kim', target: '99' } },
    { t: 'Answering 404 for other people\'s orders too', q: 'What if the server looks only among the user\'s own orders, and answers 404 if not found?', d: 'It cannot be told apart from an order that does not exist, so you cannot even tell whether the order exists.', v: { check: 'owner404', who: 'kim', target: '2' } },
    { t: 'Customer support staff looks up the order', q: 'What if park, who has the ADMIN role, requests GET /orders/2 on a server that allows the owner or the ADMIN role?', d: 'Even without being the owner, the ADMIN role allows the request.', v: { check: 'ownerAdmin', who: 'admin', target: '2' } },
    { t: 'When the role rule blocks the staff', q: 'What if the server checks only the role (USER) with a URL rule, and park, who has the ADMIN role, requests GET /orders/99?', d: 'The response is 403 before the controller even runs.', v: { check: 'role', who: 'admin', target: '99' } },
  ],
  code: function (c) {
    var rule = (c.check === 'role' ? '            .requestMatchers("/orders/**").hasRole("USER")   // checks only the role\n' : '') + '            .anyRequest().authenticated())                 // checks only that the user is logged in\n';
    var find = '    Order o = orders.findById(id)\n        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));\n';
    var body = {
      login: find + '    return o;                                 // does not check whose order it is\n',
      role: find + '    return o;                                 // does not check whose order it is\n',
      owner403: find + '    if (!o.owner().equals(auth.getName()))    // compare the order\'s owner with the logged-in user\n        throw new ResponseStatusException(HttpStatus.FORBIDDEN);\n    return o;\n',
      owner404: '    return orders.findByIdAndOwner(id, auth.getName())   // look only among my orders\n        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));\n',
      ownerAdmin: find + '    boolean owner = o.owner().equals(auth.getName());\n    boolean admin = auth.getAuthorities().stream()\n        .anyMatch(g -> g.getAuthority().equals("ROLE_ADMIN"));\n    if (!owner && !admin)                     // refuse if the user is neither the owner nor ADMIN\n        throw new ResponseStatusException(HttpStatus.FORBIDDEN);\n    return o;\n',
    }[c.check];
    return '// The owner of order 1 is kim, and the owner of order 2 is lee. Order 99 does not exist.\n// The role of kim and lee is USER, and the role of park is ADMIN.\n\n@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    return http\n        .authorizeHttpRequests(a -> a\n' + rule + '        .httpBasic(Customizer.withDefaults())              // how to log in (the result is the same whichever you use)\n        .build();\n}\n\n@GetMapping("/orders/{id}")\nOrder one(@PathVariable long id, Authentication auth) {     // auth: the user logged in now\n' + body + '}';
  },
  label: function (c) { return { login: 'Login check only', role: 'Role check only', owner403: 'Owner check (403)', owner404: 'Owner check (404)', ownerAdmin: 'Owner or ADMIN' }[c.check] + ' · ' + (c.who === 'kim' ? 'kim(USER)' : 'park(ADMIN)') + ' · /orders/' + c.target; },
  columns: ['Response', 'Order in the response body', 'Where it was decided'],
  // Only the result is calculated (the part checked against a real server). why: filter, nocheck, notfound, owner, notowner, notmine, admin
  judge: function (c) {
    var owner = { '1': 'kim', '2': 'lee' }[c.target] || '', me = c.who === 'admin' ? 'park' : 'kim', role = c.who === 'admin' ? 'ADMIN' : 'USER', mine = owner === me;
    function r(st, why) { return { st: st, why: why, owner: owner, me: me, role: role, body: st === 200 ? owner : '', ctl: why !== 'filter' }; }
    if (c.check === 'role' && role !== 'USER') return r(403, 'filter');
    if (c.check === 'login' || c.check === 'role') return owner ? r(200, 'nocheck') : r(404, 'notfound');
    if (c.check === 'owner404') return mine ? r(200, 'owner') : r(404, 'notmine');
    if (!owner) return r(404, 'notfound');
    if (mine) return r(200, 'owner');
    if (c.check === 'ownerAdmin' && role === 'ADMIN') return r(200, 'admin');
    return r(403, 'notowner');
  },
  simulate: function (c) {
    var J = this.judge(c), me = J.me, id = c.target, ev = [], sum = [];
    var miss = this.judge({ check: c.check, who: c.who, target: '99' }), same99 = J.st === miss.st;
    var st = { req: false, auth: '', url: '', ctl: '', look: '', resp: '', body: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var STATUS = { 200: '200 OK', 403: '403 Forbidden', 404: '404 Not Found' };
    st.req = true;
    push((me === 'kim' ? 'kim, logged in, sends GET /orders/' + id + '. ' + (id === '1' ? 'Order 1 is kim\'s own order.' : id === '2' ? 'kim\'s order is order 1, and order 2 is lee\'s order. This is the URL with only the number changed to 2.' : 'There is no order 99. This is a number entered at random.')
      : 'Customer support staff park, logged in, sends GET /orders/' + id + '. park\'s role is ADMIN, and park has no orders of their own. ' + (id === '99' ? 'There is no order 99.' : 'Order ' + id + ' is ' + J.owner + '\'s order.')), '');
    st.auth = me + ' · role ' + J.role;
    push('Authentication: the server checks the login information carried in the request and finds out that the sender is ' + me + ' with the role ' + J.role + '. So far it has only confirmed "who this is". No one has yet asked whether order ' + id + ' may be viewed.', '');
    if (c.check === 'role') {
      st.url = J.why === 'filter' ? 'deny' : 'pass';
      if (J.why === 'filter') {
        push('.requestMatchers("/orders/**").hasRole("USER"): the URL rule looks at the role. park\'s role is ADMIN, not USER, so the rule refuses the request here. The controller does not run, and no lookup of whether the order exists was made.', 'bad');
        st.resp = STATUS[403];
        push('The response is 403 Forbidden. It is the same response for any order number, even a number that does not exist, because the decision was made only from the shape of the URL and the role.', 'bad');
      } else push('.requestMatchers("/orders/**").hasRole("USER"): the URL rule looks at the role. kim\'s role is USER, so the request passes. A role only says "what kind of user this is". This rule does not know whose order the number ' + id + ' at the end of the URL refers to.', id === '2' ? 'bad' : '');
    } else {
      st.url = 'pass';
      push('.anyRequest().authenticated(): the URL rule looks only at whether the user is logged in. ' + me + ' is logged in, so the request passes. This rule does not know whose order the number ' + id + ' at the end of the URL refers to.', '');
    }
    if (J.ctl) {
      st.look = id;
      if (c.check === 'owner404') {
        st.ctl = J.why;
        if (J.why === 'owner') push('orders.findByIdAndOwner(' + id + ', "' + me + '"): the controller looks for "the order whose number is ' + id + ' and whose owner is ' + me + '". An order that matches the condition exists.', 'good');
        else push('orders.findByIdAndOwner(' + id + ', "' + me + '"): the controller looks for "the order whose number is ' + id + ' and whose owner is ' + me + '". There is no such order. ' + (J.owner ? 'Order ' + id + ' exists, but its owner is ' + J.owner + '. It does not match the condition. ' : 'Order ' + id + ' does not exist at all. ') + 'Either way, the code ends in the same way, with "not found".', J.owner ? 'good' : '');
      } else {
        if (!J.owner) { st.ctl = 'notfound'; push('orders.findById(' + id + '): the controller looks up the order by number. Order ' + id + ' does not exist. It decides to respond with 404.', ''); }
        else {
          push('orders.findById(' + id + '): the controller looks up the order by number. ' + J.owner + '\'s order comes back.', '');
          st.ctl = J.why;
          if (J.why === 'nocheck') push('return o: the controller returns the order it looked up as it is. Nowhere in the code is the owner of the order (' + J.owner + ') compared with the logged-in user (' + me + ').', J.owner === me ? '' : 'bad');
          else if (J.why === 'owner') push('o.owner().equals(auth.getName()): compares the owner of the order (' + J.owner + ') with the logged-in user (' + me + '). They are the same, so the request passes.', 'good');
          else if (J.why === 'admin') push('Owner check and role check: the owner of the order (' + J.owner + ') and the logged-in user (' + me + ') are different. But ' + me + '\'s list of authorities contains ROLE_ADMIN, so the request passes.', 'good');
          else push('o.owner().equals(auth.getName()): compares the owner of the order (' + J.owner + ') with the logged-in user (' + me + '). They are different.' + (c.check === 'ownerAdmin' ? ' ' + me + '\'s list of authorities does not contain ROLE_ADMIN either.' : '') + ' It throws a FORBIDDEN exception.', 'good');
        }
      }
      st.resp = STATUS[J.st]; st.body = J.body;
      if (J.st === 200) push('The response is 200 OK, and the body contains ' + J.owner + '\'s order (the product and the delivery address), which goes to ' + me + '.' + (J.why === 'nocheck' && J.owner !== me ? ' The login was done properly and the request passed every rule on the server, yet someone else\'s order became visible.' : ''), J.why === 'nocheck' && J.owner !== me ? 'bad' : 'good');
      else if (J.st === 403) push('The response is 403 Forbidden. The body has no order contents. However, a number that does not exist gets 404, so from the 403 response you can tell that "order ' + id + ' exists".', 'good');
      else push('The response is 404 Not Found. The body has no order contents.' + (J.why === 'notmine' && J.owner ? ' It is exactly the same response as for a number that does not exist, so the requester cannot even tell whether order ' + id + ' exists.' : ''), J.why === 'notmine' && J.owner ? 'good' : '');
    }
    var WHY = { filter: 'URL rule (before the controller runs)', nocheck: 'Looked up without an owner check', notfound: 'Looked up, and the order does not exist', owner: 'Owner check: is the owner', notowner: 'Owner check: is not the owner', notmine: 'Not among my orders', admin: 'Not the owner, but has the ADMIN role' };
    var bodyText = J.body ? J.body + '\'s order (' + (J.body === me ? 'own' : 'another member') + ')' : 'None';
    if (J.why === 'nocheck' && J.owner !== me && c.check === 'login') sum.push('Authentication (confirming who the user is) and authorization (confirming that the user may view this resource) are different jobs. On a server that checks only for login, you can see someone else\'s resource just by changing the number in the URL. If the numbers run in sequence like 1, 2, 3, simply trying them one after another reveals every other person\'s order. Before returning a resource, the server code must check "is the owner of this resource the user who is logged in now?".');
    if (J.why === 'nocheck' && J.owner !== me && c.check === 'role') sum.push(me === 'kim' ? 'A role only says "is this USER or ADMIN". kim and lee are both USER, so a role rule cannot tell them apart. "Only your own" is enforced not by a role but by comparing the owner.' : 'The request passed the role rule, but nothing checked whose order it is.');
    if (J.why === 'filter') sum.push('The URL rule comes before the controller and decides only from the URL and the role. The order has not been looked up yet, so it cannot know whose order it is, and a number that does not exist gets the same 403. A condition such as "only the owner" can be decided only in the code that runs after the resource is looked up.');
    if (J.why === 'notowner') sum.push('403 reads as "that resource exists, but it is not allowed for you". A number that does not exist gets 404, so by changing the number and comparing the responses, you can find out which order numbers really exist. To hide even that, use the approach of answering 404 for other people\'s resources too.');
    if (J.why === 'notmine' && J.owner) sum.push('If another person\'s order and an order that does not exist both get the same 404, the requester cannot tell them apart. The HTTP standard (RFC 9110) also says that a server that wants to hide the existence of a resource may answer 404 instead of 403. In exchange, even a legitimate user can hardly tell from the response alone whether it is a permission problem or a mistyped URL.');
    if (J.why === 'admin') sum.push('Someone who must see other people\'s orders, such as customer support staff, is allowed by role. The rules of a real service usually combine an owner check and a role check, as in "the owner, or a role in charge of that job".');
    if (me === 'park' && (J.why === 'notowner' || (J.why === 'notmine' && J.owner))) sum.push('Being ADMIN does not mean automatic permission. The server decides only by the rules written in the code, and this code allows only the owner.');
    if (J.st === 200 && J.owner === me) sum.push('Your own order is visible with every approach. The difference between the approaches shows when you request someone else\'s order.');
    if (J.why === 'notfound' || (J.why === 'notmine' && !J.owner)) sum.push('An order that does not exist gets 404. Compare it with the response when the same server is asked for lee\'s order (order 2). If the responses differ, it becomes known that "an order with that number exists".');
    return { events: ev, summary: sum, j: J, same99: same99, row: [STATUS[J.st], bodyText, WHY[J.why]] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, J = sim.j;
    if (!s) { H.text(v, 'Click Run to send the request through the server\'s checks one by one.'); return; }
    H.table(v, ['Order number', 'Owner', 'Contents'], [['1', 'kim', 'keyboard · 1 Sample St, Seoul'], ['2', 'lee', 'laptop · 2 Sample St, Busan']].map(function (r) { return { cells: [{ v: r[0], cls: s.look === r[0] ? 'hot' : '' }, { v: r[1], cls: r[1] === J.me ? 'good' : '' }, r[2]] }; }), 'Orders stored on the server (there is no order 99)');
  },
  // Diagram: the request on the left passes the server's three checks in the middle (authentication, URL rule, controller code) from top to bottom, and the controller looks up an order in the storage on the right.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { req: false, auth: '', url: '', ctl: '', look: '', resp: '', body: '' }, J = sim.j, c = sim.c, n = shown.length;
    P.size(680, 326);
    P.box('req', 16, 44, 172, 78, { cls: s.req ? 'wait' : 'ghost', title: J.me + ' (role ' + J.role + ')', sub: ['GET /orders/' + c.target, J.me === 'kim' ? 'Owner of order 1' : 'Has no orders'] });
    P.region('srv', 204, 12, 258, 250, 'Server');
    P.box('g1', 216, 44, 234, 54, { cls: (s.auth ? 'good' : 'ghost') + (n === 2 ? ' now' : ''), title: '1. Authentication: who', sub: s.auth ? 'Confirmed: ' + s.auth : 'Not checked yet' });
    P.box('g2', 216, 116, 234, 54, { cls: (s.url === 'pass' ? 'good' : s.url === 'deny' ? 'bad' : 'ghost') + (n === 3 ? ' now' : ''), title: '2. URL rule', sub: !s.url ? 'Not checked yet' : (c.check === 'role' ? 'Has USER role: ' : 'Logged in: ') + (s.url === 'pass' ? 'Passed' : 'Refused') });
    P.box('g3', 216, 188, 234, 54, { cls: { '': s.look ? 'hot' : 'ghost', nocheck: J.owner === J.me ? 'plain' : 'bad', notfound: 'plain', owner: 'good', notowner: 'good', notmine: 'good', admin: 'good' }[s.ctl], title: '3. Controller code', sub: { '': s.resp && !J.ctl ? 'Did not run' : s.look ? 'Looked up the order' : 'Not run yet', nocheck: 'Returned, no owner check', notfound: 'No such order: 404', owner: 'Is the owner: allowed', notowner: 'Not the owner: 403', notmine: 'Not among mine: 404', admin: 'Allowed: ADMIN role' }[s.ctl] });
    P.region('db', 478, 12, 186, 250, 'Order storage');
    [['1', 'kim', 'keyboard'], ['2', 'lee', 'laptop'], ['99', '', 'no such order']].forEach(function (o, i) {
      var hit = s.look === o[0], shown200 = hit && s.body;
      P.box('o' + o[0], 490, 44 + i * 72, 162, 54, { cls: (!o[1] ? 'ghost' : shown200 ? (s.body === J.me || s.ctl === 'admin' ? 'good' : 'bad') : o[1] === J.me ? 'wait' : 'plain') + (hit ? ' now' : ''), title: 'Order ' + o[0], sub: (o[1] ? 'owner ' + o[1] + ', ' : '') + o[2] });
    });
    if (s.req) P.arrow('a0', 'req:r', 'g1:l', {});
    if (s.url) P.arrow('a1', 'g1:b', 'g2:t', {});
    if (s.look) P.arrow('a2', 'g2:b', 'g3:t', {});
    if (s.look) P.arrow('a3', 'g3:r', 'o' + s.look + ':l', { cls: s.body ? (s.body === J.me || s.ctl === 'admin' ? 'good' : 'bad') : 'mut', label: 'Lookup' });
    P.box('res', 16, 276, 648, 38, { cls: !s.resp ? 'ghost' : J.st === 200 ? (J.why === 'nocheck' && J.owner !== J.me ? 'bad' : 'good') : 'plain', title: 'Response', right: !s.resp ? 'Processing' : s.resp + (s.body ? ' · ' + s.body + '\'s order shown to ' + J.me : ' · no order contents') });
    P.note('Inside the server, the request passes three checks from top to bottom. A red order box is an order that was shown to someone who is not its owner.');
  },
  assume: 'All 30 combinations were checked against real execution on the PC used to write this lab. A Spring Boot 4.1.1 and Spring Security 7.1.1 server was started on 127.0.0.1 with code of the same structure as on the screen, and the checks were the response code, the owner of the order in the response body, whether the controller ran, and which branch of the code made the decision. The order storage was made as an in-memory table instead of a database, and HTTP Basic was used to log in (the authorization result is the same if you log in with a session or a token). On the same server, a request that is not logged in got 401 with every approach, and that is covered in the "Security filter chain" lab. That a server can answer 404 instead of 403 for another person\'s resource, to hide the fact that the resource exists, is written in RFC 9110 Section 15.5.4 (403) and Section 15.5.5 (404). Which of 403 and 404 is right is not fixed; the service chooses. In a real service, the existence of a resource can also be revealed by a difference in response time, not only by the response code, but this lab does not cover that. The owner check was written in the controller, but it is also placed in the service layer or written with method security (@PreAuthorize, @PostAuthorize), and that continues in the "Method security" lab. Changing order numbers to values that are hard to guess (such as UUIDs) only makes the numbers harder to guess and does not replace an owner check. This sentence follows a general security recommendation (OWASP\'s description of Broken Access Control) and is not something that was checked by execution.',
});
