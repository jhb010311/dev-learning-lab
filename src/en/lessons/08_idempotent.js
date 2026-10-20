Lab.register({
  id: 'idem', nav: 'Retries and idempotency', cat: 'HTTP', mode: 'step',
  title: 'No response came back, so the request was sent again',
  why: 'When no response arrives, the client cannot tell whether the request never reached the server or was processed and only the response was lost, so sending it again risks having the same work done twice. Idempotency identifies requests that leave the server in the same state no matter how many times they run as when they run once, so such requests can be safely sent again. An idempotency key lets the server recognize a request it has already handled even for requests that are not idempotent, such as POST.',
  use: 'For POST APIs where work must not be done twice, such as payment, transfer, and order creation, you receive an idempotency key to prevent duplicates. Automatic retries in HTTP clients and gateways are usually turned on only for idempotent requests such as GET, PUT, and DELETE. A change such as "increase the quantity by 1" is sometimes turned into an idempotent one by changing it to a value assignment such as "set the quantity to 3".',
  intro: 'On a network, a request or a response can be lost, and when no response arrives, the client sends the same request again. Depending on the HTTP method, running a request several times either gives the same result (the method is idempotent) or it does not.',
  terms: ['Safe methods and idempotent methods', 'HTTP methods', 'Idempotency and idempotency keys', 'HTTP status codes'], ranks: ['rest', 'http'],
  controls: [
    { id: 'm', label: 'Request to send', type: 'select', value: 'POST', options: [['GET', 'GET /orders/1 (read)'], ['PUT', 'PUT /orders/1 (replace the order with one whose quantity is 3)'], ['DELETE', 'DELETE /orders/1 (delete)'], ['POST', 'POST /orders (create a new order)'], ['PATCH', 'PATCH /orders/1 (increase the quantity by 1)']] },
    { id: 'lost', label: 'What the network loses', type: 'select', value: 'res', options: [['none', 'Nothing (normal)'], ['req', 'The request (it does not reach the server)'], ['res', 'The response (the server handled the request, but the response is lost)']] },
    { id: 'n', label: 'How many times it is lost', type: 'range', min: 1, max: 3, value: 1, fmt: function (v) { return v + (v === 1 ? ' time' : ' times'); }, show: function (c) { return c.lost !== 'none'; } },
    { id: 'key', label: 'Send an idempotency key (Idempotency-Key) header with it', type: 'check', value: false, show: function (c) { return c.m === 'POST' || c.m === 'PATCH'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when the response to POST /orders (create a new order) is lost once and the request is sent again?', d: 'The response to the POST is lost once. Two orders are created.', v: { m: 'POST', lost: 'res', n: 1, key: false } },
    { t: 'PUT in the same situation', q: 'What if you send PUT /orders/1 (replace the order with one whose quantity is 3) and the response is lost once?', d: 'Even when it runs twice, the result is the same as running it once.', v: { m: 'PUT', lost: 'res', n: 1, key: false } },
    { t: 'Sending DELETE again', q: 'What if you send DELETE /orders/1 (delete) and the response is lost once?', d: 'The response code of the second request is different, but the state of the server is the same.', v: { m: 'DELETE', lost: 'res', n: 1, key: false } },
    { t: 'A PATCH that increases a value', q: 'What if you send PATCH /orders/1 (increase the quantity by 1) and the response is lost 2 times?', d: 'The quantity goes up once for every retry.', v: { m: 'PATCH', lost: 'res', n: 2, key: false } },
    { t: 'Adding an idempotency key to the POST', q: 'What if you send an Idempotency-Key header with POST /orders and the response is lost 2 times?', d: 'The server recognizes the repeated request and handles it only once.', v: { m: 'POST', lost: 'res', n: 2, key: true } },
    { t: 'When the request is lost', q: 'What if the network loses the request instead of the response for POST /orders?', d: 'The server never handled it, so retrying causes no problem.', v: { m: 'POST', lost: 'req', n: 1, key: false } },
  ],
  code: function (c) {
    var k = c.key && (c.m === 'POST' || c.m === 'PATCH') ? 'Idempotency-Key: 7f3a9c12\n' : '';
    var req = { GET: 'GET /orders/1 HTTP/1.1\n', PUT: 'PUT /orders/1 HTTP/1.1\n' + 'Content-Type: application/json\n\n{ "quantity": 3 }\n', DELETE: 'DELETE /orders/1 HTTP/1.1\n', POST: 'POST /orders HTTP/1.1\n' + k + 'Content-Type: application/json\n\n{ "item": "keyboard", "quantity": 2 }\n', PATCH: 'PATCH /orders/1 HTTP/1.1\n' + k + 'Content-Type: application/json\n\n{ "quantityDelta": 1 }\n' }[c.m];
    return req + '\n// Client: if no response arrives within 3 seconds,\n// send the same request again, unchanged' + (k ? '\n\n// Server: if the idempotency key is new, handle the request and store the response with the key;\n// if the key has been seen before, do not handle it and return the stored response' : '');
  },
  label: function (c) { return c.m + ((c.m === 'POST' || c.m === 'PATCH') && c.key ? ' + idempotency key' : '') + ' · ' + (c.lost === 'none' ? 'nothing lost' : (c.lost === 'req' ? 'Request' : 'Response') + ' lost ' + c.n + (c.n === 1 ? ' time' : ' times')); },
  columns: ['Times sent', 'Times the server executed it', 'Server state', 'Same as running it once?'],
  simulate: function (c) {
    var M = c.m, useKey = c.key && (M === 'POST' || M === 'PATCH'), losses = c.lost === 'none' ? 0 : c.n, ev = [], rows = [];
    var orders = [{ id: 1, item: 'mouse', qty: 2 }], nextId = 2, sent = 0, exec = 0, saved = null;
    function state() { return orders.map(function (o) { return { cells: [String(o.id), o.item, String(o.qty)] }; }); }
    function push(s, k) { ev.push({ s: s, k: k, snap: { orders: state(), rows: rows.slice(), sent: sent, exec: exec, saved: saved } }); }
    function apply() {
      exec++;
      if (M === 'GET') return '200 OK (order 1: quantity ' + orders[0].qty + ')';
      if (M === 'PUT') { orders[0].qty = 3; return '200 OK (quantity 3)'; }
      if (M === 'DELETE') { var i = orders.map(function (o) { return o.id; }).indexOf(1); if (i < 0) return '404 Not Found (already gone)'; orders.splice(i, 1); return '204 No Content'; }
      if (M === 'POST') { orders.push({ id: nextId, item: 'keyboard', qty: 2 }); return '201 Created (order ' + nextId++ + ')'; }
      orders[0].qty++; return '200 OK (quantity ' + orders[0].qty + ')';
    }
    function one(expect) { var o = [{ id: 1, item: 'mouse', qty: 2 }]; if (M === 'PUT') o[0].qty = 3; if (M === 'DELETE') o = []; if (M === 'POST') o.push({ id: 2, item: 'keyboard', qty: 2 }); if (M === 'PATCH') o[0].qty = 3; return JSON.stringify(o); }
    push('This is the initial server state. Order 1 (mouse, quantity 2) exists.', '');
    for (var a = 1; a <= losses + 1; a++) {
      sent++; var lose = a <= losses, tag = a === 1 ? 'First request' : 'Retry #' + (a - 1);
      if (lose && c.lost === 'req') { rows.push({ cells: [String(a), 'Did not reach the server', { v: 'No response (timeout)', cls: 'bad' }] }); push(tag + ': The request was lost before it reached the server. The server did nothing. The client gets no response, so it decides to send the request again.', ''); continue; }
      var res, dup = false;
      if (useKey && saved) { res = saved; dup = true; } else { res = apply(); if (useKey) saved = res; }
      var did = dup ? 'Not processed (idempotency key already seen)' : 'Executed';
      if (lose) { rows.push({ cells: [String(a), did, { v: res + ' → response lost', cls: 'bad' }] }); push(tag + ': The server ' + (dup ? 'received the request but did not execute it again, because it had already processed that idempotency key' : 'handled the request (' + res + ')') + '. But the response was lost on its way back. The client cannot tell whether the server handled the request, so it sends the same request again.', exec > 1 && (M === 'POST' || M === 'PATCH') ? 'bad' : ''); }
      else { rows.push({ cells: [String(a), did, { v: res, cls: 'good' }] }); push(tag + ': ' + (dup ? 'The server sees that it has already processed idempotency key 7f3a9c12 and, without executing the request again, returns the stored response (' + res + ').' : 'The server handles the request and returns the response ' + res + '.') + ' This time the response reached the client.', exec > 1 && (M === 'POST' || M === 'PATCH') ? 'bad' : 'good'); }
    }
    var same = JSON.stringify(orders.map(function (o) { return { id: o.id, item: o.item, qty: o.qty }; })) === one(), idem = M !== 'POST' && M !== 'PATCH';
    var st = orders.length ? orders.map(function (o) { return 'order ' + o.id + ' quantity ' + o.qty; }).join(', ') : 'no orders';
    var sum = [];
    if (same && exec > 1) sum.push(M + ' requests are idempotent, so after ' + exec + ' executions the state of the server is the same as after one execution.' + (M === 'DELETE' ? ' From the second request on, the response code changes to 404, but idempotency is judged by the state of the server, not by the response.' : '') + (M === 'GET' ? ' GET is also a safe method: it does not change the state of the server.' : ''));
    if (!same) sum.push(M === 'POST' ? 'POST is not idempotent. Every execution creates a new order, so the same order was created ' + (orders.length - 1) + ' times. This is the typical way duplicate processing happens in payments and orders.' : 'A PATCH that increases the quantity by 1 is not idempotent. The quantity went up once for every execution. If you express the same change as an absolute value, such as "set the quantity to 3", it becomes idempotent.');
    if (useKey && sent > exec && c.lost !== 'req') sum.push('Thanks to the idempotency key, the server recognized the retry as the same request and executed it only once. To retry a request that is not idempotent safely, you need a mechanism like this.');
    if (c.lost === 'req') sum.push('When the request itself is lost, the server never executed it, so any method can be retried. The problem is that the client cannot tell whether the request or the response was lost.');
    if (c.lost === 'none') sum.push('When nothing is lost, every method is executed only once.');
    return { events: ev, summary: sum, row: [sent + '', exec + '', st, same ? 'Same' : 'Different'], idem: idem };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { orders: [], rows: [], sent: 0, exec: 0, saved: null };
    H.table(v, ['Attempt', 'What the server did', 'Response'], s.rows, 'Request log');
    if (s.saved) H.text(v, 'Idempotency key the server remembers: 7f3a9c12 → ' + s.saved);
  },
  // Diagram: what happens when the same request is sent twice and a request or a response is lost on the way. The key point is how many times the server really executed it.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], orders: [], sent: 0, exec: 0 }, msgs = [];
    s.rows.forEach(function (r) {
      var no = P.v(r.cells[0]), exec = P.v(r.cells[1]), res = P.v(r.cells[2]), lostRes = res.indexOf('response lost') >= 0;
      if (exec.indexOf('Did not reach') >= 0) { msgs.push({ f: 'c', lost: true, s: 'Send #' + no }); return; }
      msgs.push({ f: 'c', t: 's', s: 'Send #' + no });
      msgs.push({ f: 's', s: exec, cls: exec.indexOf('Not processed') === 0 ? 'good' : 'hot' });
      if (lostRes) msgs.push({ f: 's', lost: true, s: res.split(' → ')[0] }); else msgs.push({ f: 's', t: 'c', s: res, cls: P.c(r.cells[2]) });
    });
    var end = P.seq([['c', 'Client', 'wait'], ['s', 'Server', 'wait']], msgs, { keep: 7 }), y = end + 14;
    P.box('ex', 16, y, 318, 34, { cls: s.exec > 1 ? 'bad' : 'plain', title: 'Server executions', right: s.exec + '' });
    P.box('sn', 346, y, 318, 34, { cls: 'plain', title: 'Requests sent', right: s.sent + '' });
    (s.orders || []).slice(0, 4).forEach(function (o, i) { P.box('od' + i, 16 + i * 164, y + 44, 156, 34, { cls: 'wait', title: '#' + P.v(o.cells[0]), right: P.v(o.cells[1]) + ' x ' + P.v(o.cells[2]) }); });
    P.size(680, y + 44 + 34 + 16);
    P.note('A red dashed line is a request or a response lost on the way. The boxes at the bottom are the orders left in the database.');
  },
  assume: 'The definition of idempotency follows the HTTP standard (RFC 9110). A method is idempotent if the intended effect on the server of sending the same request several times is the same as that of sending it once, and GET, HEAD, OPTIONS, and TRACE (the safe methods) and PUT and DELETE belong here. The standard does not guarantee that POST and PATCH are idempotent (a PATCH can be designed to be idempotent, depending on its content). The Idempotency-Key header is a convention widely used in payment APIs and similar services, and it has not been finalized as a standard.',
});
