Lab.register({
  id: 'gateway', nav: 'Gateway and gradual migration', cat: 'Microservices', mode: 'step',
  title: 'Breaking up a huge server piece by piece without stopping it',
  intro: 'You put a gateway in front of an existing server (a monolith) that holds every feature in one lump, and hand requests over to new services one route at a time. The address that users see does not change.',
  terms: ['API gateway', 'Strangler fig pattern', 'Monolithic architecture and microservice architecture', 'Reverse proxy', 'Rolling, blue-green, and canary deployments'], ranks: ['msa', 'design', 'deploy'],
  controls: [
    { id: 'stage', label: 'Migration stage', type: 'select', value: '1', options: [['0', 'Stage 0: everything on the existing server'], ['1', 'Stage 1: only orders on the new service'], ['2', 'Stage 2: orders and payments on new services'], ['3', 'Stage 3: everything on new services (existing server shut down)']] },
    { id: 'ratio', label: 'Share of order requests sent to the new service', type: 'select', value: '100', options: [['10', '10% (the rest go to the existing server)'], ['50', '50%'], ['100', '100%']], show: function (c) { return c.stage === '1'; } },
    { id: 'auth', label: 'Some requests have no login token', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'At Stage 1 (only orders on the new service) with 100% of order requests sent to the new service, where does each request go?', d: 'Only the order route is handed over to the new service.', v: { stage: '1', ratio: '100', auth: false } },
    { t: 'Only 10% of orders first', q: 'What if you send only 10% of order requests to the new service (the rest go to the existing server)?', d: 'Verifies the new service with a small share of real requests.', v: { stage: '1', ratio: '10', auth: false } },
    { t: 'Before migration', q: 'What if you set the migration stage to Stage 0: everything on the existing server?', d: 'Every request goes to the existing server.', v: { stage: '0', ratio: '100', auth: false } },
    { t: 'Migration complete', q: 'What if you set the migration stage to Stage 3: everything on new services (existing server shut down)?', d: 'No requests go to the existing server, so it can be shut down.', v: { stage: '3', ratio: '100', auth: false } },
    { t: 'Requests with no token', q: 'What if you set Stage 2 (orders and payments on new services) and some requests have no login token?', d: 'The gateway filters them out at the entrance.', v: { stage: '2', ratio: '100', auth: true } },
  ],
  code: function (c) {
    var r = [];
    if (+c.stage >= 1) r.push('        - id: order\n          uri: http://order-service\n          predicates:\n            - Path=/orders/**' + (c.stage === '1' && c.ratio !== '100' ? '\n            - Weight=order-group, ' + c.ratio + '        # ' + c.ratio + '% to the new service\n        - id: order-legacy\n          uri: http://legacy-monolith\n          predicates:\n            - Path=/orders/**\n            - Weight=order-group, ' + (100 - c.ratio) + '        # the rest goes to the existing server' : ''));
    if (+c.stage >= 2) r.push('        - id: payment\n          uri: http://payment-service\n          predicates:\n            - Path=/payments/**');
    if (+c.stage >= 3) r.push('        - id: member\n          uri: http://member-service\n          predicates:\n            - Path=/members/**');
    if (+c.stage < 3) r.push('        - id: legacy                   # ' + (c.stage === '0' ? 'everything goes to the existing server' : 'everything else goes to the existing server') + '\n          uri: http://legacy-monolith\n          predicates:\n            - Path=/**');
    return '# Property names of Spring Cloud Gateway 4.3 (Spring Cloud 2025.0) and later (earlier versions use spring.cloud.gateway.routes)\nspring.cloud.gateway.server.webflux:\n  routes:\n' + r.join('\n') + '\n\n# Common filters: token validation, request logging, rate limiting';
  },
  label: function (c) { return ['Before migration', 'Orders migrated' + (c.ratio !== '100' ? ' (' + c.ratio + '%)' : ''), 'Orders and payments migrated', 'Everything migrated'][+c.stage] + (c.auth ? ' · includes requests with no token' : ''); },
  columns: ['Requests to the existing server', 'Requests to the new service', 'Rejected at the gateway', 'Existing server can be shut down'],
  simulate: function (c) {
    var st = +c.stage, ratio = +c.ratio, ev = [], rows = [], sum = [], old = 0, neu = 0, rej = 0;
    var reqs = [['GET /orders/1', 'orders'], ['POST /payments', 'payments'], ['GET /members/me', 'members'], ['POST /orders', 'orders'], ['GET /orders/2', 'orders'], ['GET /members/7', 'members'], ['POST /orders', 'orders'], ['GET /payments/9', 'payments'], ['GET /orders/3', 'orders'], ['GET /orders/4', 'orders']];
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice(), old: old, neu: neu, rej: rej } }); }
    push('All of the user\'s requests come in through one place, the gateway. After doing the common work (token validation, logging, rate limiting), the gateway looks at the path and decides which server behind it to pass the request to. The user does not know how many servers are behind it.', '');
    var orderSeen = 0;
    reqs.forEach(function (r, i) {
      var noAuth = c.auth && (i === 2 || i === 6), to, why;
      if (noAuth) { rej++; rows.push({ cells: [r[0], '(no token)', { v: 'Rejected by the gateway with 401', cls: 'bad' }] }); push(r[0] + ': There is no token. The gateway does not pass the request on, and responds with 401 Unauthorized right away. The services behind it need less duplicated code of their own for rejecting requests that have no token.', 'bad'); return; }
      var moved = (r[1] === 'orders' && st >= 1) || (r[1] === 'payments' && st >= 2) || (r[1] === 'members' && st >= 3);
      if (moved && r[1] === 'orders' && st === 1 && ratio < 100) { orderSeen++; moved = ratio === 50 ? orderSeen % 2 === 0 : orderSeen === 5; why = moved ? 'Based on the ratio setting, this request goes to the new service.' : 'Based on the ratio setting, this request still goes to the existing server.'; }
      to = moved ? { orders: 'Order service (new)', payments: 'Payment service (new)', members: 'Member service (new)' }[r[1]] : 'Existing server (monolith)';
      if (moved) neu++; else old++;
      rows.push({ cells: [r[0], moved ? '/' + r[1] + '/**' : r[1] === 'orders' && st === 1 && ratio < 100 ? '/orders/** (order-legacy)' : '/**', { v: to, cls: moved ? 'good' : '' }] });
      push(r[0] + ': The path starts with /' + r[1] + '. ' + (why || (moved ? 'This path is configured to be passed to the new service.' : 'It is not a path with its own rule, so it goes to the existing server.')) + ' → ' + to, moved ? 'good' : '');
    });
    if (st === 0) sum.push('Nothing has been moved yet. Putting the gateway in place first is the first step of the migration. After that, you can hand routes over one at a time just by changing the configuration.');
    if (st === 1 || st === 2) sum.push('You do not move every feature at once; you split them off one route at a time. If something goes wrong with a new service, you can change the configuration back and send the requests to the existing server again (the data the new service has written has to be handled separately). Because the new system gradually wraps around the existing one and replaces it, this approach is called the strangler fig pattern.');
    if (st === 1 && ratio < 100) sum.push('Even when you hand a route over, you first send only a share of the requests and verify the new service with real requests. During this time two servers work with the same data, so how to split the database is the hardest problem.');
    if (st === 3) sum.push('The number of requests going to the existing server is now 0. You can shut the existing server down.');
    if (c.auth) sum.push('The gateway handles cross-cutting concerns such as authentication, logging, and rate limiting at the entrance. In return, everything stops if the gateway goes down, so run several instances of it, and do not put business logic in it.');
    return { events: ev, summary: sum, row: [old + '', neu + '', rej + '', old === 0 ? 'Yes' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], old: 0, neu: 0, rej: 0 };
    if (s.rows.length) H.table(v, ['Request', 'Matching route rule', 'Sent to'], s.rows, 'Routing at the gateway'); else H.text(v, 'No requests have arrived yet.');
  },
  // Diagram: every request passes through the gateway and goes to the existing server or a new service.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], old: 0, neu: 0, rej: 0 };
    var msgs = s.rows.map(function (r) { var req = P.v(r.cells[0]), to = P.v(r.cells[2]); return to.indexOf('Rejected') >= 0 ? { f: 'c', t: 'g', s: req + ': rejected, 401', cls: 'bad' } : { f: 'c', t: to.indexOf('(new)') >= 0 ? 'n' : 'o', s: req, cls: to.indexOf('(new)') >= 0 ? 'good' : '' }; });
    var end = P.seq([['c', 'Client', 'wait'], ['g', 'API gateway', 'hot'], ['o', 'Existing server'], ['n', 'New services', 'good']], msgs, { keep: 8 });
    P.box('co', 16, end + 14, 208, 34, { cls: 'plain', title: 'To existing server', right: s.old + '' });
    P.box('cn', 236, end + 14, 208, 34, { cls: 'good', title: 'To new service', right: s.neu + '' });
    P.box('cr', 456, end + 14, 208, 34, { cls: s.rej ? 'bad' : 'ghost', title: 'Rejected at entrance', right: s.rej + '' });
    P.size(680, end + 64);
    P.note('The arrows are drawn across the line of the gateway, but in reality the gateway receives the request and sends it on again to the server behind it.');
  },
  assume: 'This is a fixed example of 10 requests. The ratio setting is assigned in a simple way so that the difference shows within the 10 requests (for 50%, order requests alternate; for 10%, only the fifth order request goes to the new service). The configuration example follows the path and weight predicates of Spring Cloud Gateway. Separating the data and synchronizing the two systems, which are the hardest parts of moving a feature, are not covered.',
});
