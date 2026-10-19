Lab.register({
  id: 'trace', nav: 'Distributed tracing', cat: 'Monitoring', mode: 'step',
  title: 'One request is slow, but which service is to blame?',
  intro: 'One order request passes through the gateway, the order service, the payment service, and the external payment provider in turn. Logs pile up separately in each service, so without a common ID that ties together the logs of the same request, it is hard to find where the time went.',
  terms: ['Distributed tracing (trace ID, span)', 'Observability (logs, metrics, traces)', 'MDC', 'APM', 'Monolithic architecture and microservice architecture'], ranks: ['monitor', 'msa'],
  controls: [
    { id: 'slow', label: 'Slow span', type: 'select', value: 'pg', options: [['none', 'None'], ['db', 'Database query in the order service'], ['pay', 'Processing inside the payment service'], ['pg', 'External payment provider API']] },
    { id: 'prop', label: 'Pass the trace ID between services', type: 'check', value: true },
  ],
  presets: [
    { t: 'Default settings', q: 'When the slow span is the external payment provider API and the trace ID is passed between services, how do you find the cause?', d: 'The external payment provider is slow. You can see it at a glance on the tracing screen.', v: { slow: 'pg', prop: true } },
    { t: 'Without a trace ID', q: 'What if you do not pass the trace ID between services?', d: 'Each service has logs, but you cannot connect the ones that belong to the same request.', v: { slow: 'pg', prop: false } },
    { t: 'When the database query is slow', q: 'What if the slow span is the database query in the order service?', d: 'The slow span moves inside the order service.', v: { slow: 'db', prop: true } },
    { t: 'When the inside of the payment service is slow', q: 'What if the slow span is the processing inside the payment service?', d: 'The time of the payment service minus the time of its external call is long.', v: { slow: 'pay', prop: true } },
  ],
  code: function (c) {
    return c.prop ? '// build.gradle: Micrometer Tracing\nimplementation \'io.micrometer:micrometer-tracing-bridge-otel\'\n\n# Header added automatically when services call each other (W3C Trace Context)\n# Format: version-trace-id-parent-id-trace-flags\ntraceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01\n#   trace-id (4bf9…4736): the same for the whole request\n#   parent-id (00f0…02b7): the id of the sender\'s span; it becomes the parent of the receiver\'s span\n\n# Put the trace ID into the log pattern (taken from the MDC)\nlogging.pattern.level: "%5p [%X{traceId:-},%X{spanId:-}]"' : '// No tracing configured\n// Each service writes only its own log\n\nlog.info("Order processing started orderId={}", orderId);';
  },
  label: function (c) { return 'Slow span: ' + { none: 'None', db: 'Order DB', pay: 'Inside the payment service', pg: 'External payment provider' }[c.slow] + (c.prop ? '' : ' · No trace ID'); },
  columns: ['Total response time', 'Longest span', 'How to find the cause'],
  simulate: function (c) {
    var d = { gw: 5, order: 20, db: c.slow === 'db' ? 1800 : 30, pay: c.slow === 'pay' ? 1500 : 40, pg: c.slow === 'pg' ? 2000 : 150 }, ev = [], sum = [];
    var payTotal = d.pay + d.pg, orderTotal = d.order + d.db + payTotal, total = d.gw + orderTotal;
    var spans = [['Gateway', 0, total, d.gw], ['Order service', d.gw, orderTotal, d.order], ['Order DB query', d.gw + 10, d.db, d.db], ['Payment service', d.gw + d.order + d.db, payTotal, d.pay], ['Payment provider API', d.gw + d.order + d.db + d.pay, d.pg, d.pg]];
    var own = spans.map(function (s) { return s[3]; }), mi = own.indexOf(Math.max.apply(null, own)), TID = '4bf92f35';
    var ids = c.prop ? [TID, TID, TID, TID, TID] : ['-', '-', '-', '-', '-'];
    var logs = [['Gateway', 'POST /orders received'], ['Order service', 'Order processing started orderId=1024'], ['Order service', 'Order query executed'], ['Payment service', 'Payment requested amount=30000'], ['Payment service', 'External payment provider called']];
    function push(s, k, n) { ev.push({ s: s, k: k, snap: { n: n } }); }
    push(c.prop ? 'The request arrives at the gateway. It has no trace ID, so a new trace ID (' + TID + '…) is created. This ID goes along with the request until it ends. The gateway\'s processing is the first span.' : 'The request arrives at the gateway. The gateway writes its own log and calls the order service.', '', 1);
    push(c.prop ? 'When the gateway calls the order service, it puts the trace ID and its own span ID into the HTTP headers. The order service picks up the same trace ID and records its own processing as a new span (its parent is the gateway\'s span).' : 'The order service receives and handles the request. It has no way to know which request from whom this is part of.', '', 2);
    push('The order service queries the database (' + d.db + 'ms).' + (c.prop ? ' This query is recorded as a span too.' : ''), d.db > 500 ? 'bad' : '', 3);
    push('The order service calls the payment service.' + (c.prop ? ' The trace ID is passed in the headers again. Each time a log is written, the trace ID held in the MDC is printed with it automatically.' : ' The payment service\'s log has no clue that connects it to the order service.'), '', 4);
    push('The payment service calls the external payment provider API (' + d.pg + 'ms). ' + (c.prop ? 'When the response comes back, the spans close in reverse order: the external payment provider API, the payment service, the order service, and the gateway.' : 'The response goes back in reverse order: the payment service, the order service, and the gateway.') + ' Total: ' + total + 'ms.', d.pg > 500 ? 'bad' : '', 5);
    if (c.prop) push('When you look up a single trace ID in the tracing system (Zipkin, Tempo, and so on), the five spans are drawn on a time axis in a staircase shape. ' + (c.slow === 'none' ? 'Every span is short.' : 'The span with the longest self time (its inner calls excluded) is "' + spans[mi][0] + '". You can see right away where it is slow.'), 'good', 6);
    else push('The logs are in the three services separately. Hundreds of requests are mixed together at the same time, so you have to guess which logs belong to this request from the time and the order number. You also have to calculate the time per span yourself.', 'bad', 6);
    sum.push(c.prop ? 'A trace ID is a number attached to a whole request, and a span is one part of it (the processing of one service, one query, or one external call). Each span records its parent span, so the call relationships can be rebuilt as a tree.' : 'When services are split up, the traces of one request are scattered in many places. Passing a common ID in the headers and printing it in every log is the starting point of distributed tracing.');
    sum.push('Logs tell you "what happened", metrics tell you "how much overall", and traces tell you "where and for how long for this request". If you also print the trace ID in the logs, you can find the slow span on the tracing screen and then search the logs by that ID.');
    return { events: ev, summary: sum, spans: spans, total: total, ids: ids, logs: logs, mi: mi, row: [total + 'ms', spans[mi][0] + ' (' + own[mi] + 'ms)', c.prop ? 'Look up by a single trace ID' : 'Match the logs of each service by time'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], n = last ? last.snap.n : 0;
    H.table(v, ['Service', 'Trace ID in the log', 'Log message'], sim.logs.slice(0, Math.min(n, 5)).map(function (l, i) { return { cells: [l[0], { v: sim.ids[i], cls: c.prop ? 'good' : 'bad' }, l[1]] }; }), 'Logs written by each service');  },
  // Diagram: the spans that one request passed through, drawn as bars in time order. The length of a bar is the time that the span took.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], n = last ? last.snap.n : 0, total = sim.spans[0][2], sps = sim.spans;
    // Step at which each span closes: the DB query at step 3, the rest at step 5 when the response comes back. Before it closes, a span is drawn as a dashed bar as long as the time so far
    var ends = [5, 5, 3, 5, 5], now = [0, sps[0][3], sps[2][1], sps[2][1] + sps[2][2], sps[3][1], total][Math.min(n, 5)];
    P.size(680, 260);
    P.region('tr', 16, 16, 648, 228, c.prop ? 'Tracing screen: spans tied together by the same trace ID' : 'Trace IDs differ per service (or are missing), so logs cannot be linked');
    sim.spans.forEach(function (sp, i) {
      var y = 50 + i * 36, on = i < n, closed = n >= ends[i], slow = n >= 6 && i === sim.mi && c.slow !== 'none';
      P.text('nm' + i, 28, y + 17, sp[0], { cls: on ? '' : 'mut' });
      if (c.prop) { if (on) P.box('bar' + i, 170 + 480 * sp[1] / total, y, Math.max(4, 480 * (closed ? sp[2] : now - sp[1]) / total), 24, { cls: slow ? 'bad' : closed ? 'wait' : 'ghost' }); P.text('ms' + i, 652, y + 17, on ? (closed ? sp[2] + 'ms (own ' + sp[3] + 'ms)' : 'In progress') : '', { anchor: 'end', cls: slow ? 'bad' : 'mut' }); }
      else if (on) P.box('id' + i, 170, y, 240, 24, { cls: 'bad', sub: 'Trace ID ' + sim.ids[i], mono: true, center: true });
    });
    P.note(c.prop ? 'The position of a bar is its start time, and its length is the time it took. An inner span is included in the time of the outer span. A dashed bar is a span that has not finished yet, and its time is known only when it finishes. The red bar is the span that actually spent the time, and the span with a large "own" time is the cause.' : 'There is no trace ID, so you cannot tell whether these logs belong to the same request. You cannot line the spans up in one view, so it is also hard to find where it is slow.');
  },
  assume: 'This is a simple structure in which four services are called in turn, and the times are example values. The trace ID, the span, and the way they are propagated in headers follow the explanations in the W3C Trace Context standard and the documentation of OpenTelemetry and Micrometer Tracing. In practice, not every request is recorded in many cases, and only a sample is collected.',
});
