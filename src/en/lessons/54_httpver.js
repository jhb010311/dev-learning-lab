Lab.register({
  id: 'httpver', nav: 'HTTP/1.1, 2, 3', cat: 'HTTP', mode: 'step',
  title: 'What differs between the versions when you fetch 30 files',
  intro: 'A single web page is made of dozens of files (scripts, styles, images). HTTP/1.1 receives only one file at a time on a connection, so requests have to wait in line, while HTTP/2 mixes several requests on one connection. HTTP/3 changes even the transport layer below it.',
  terms: ['HTTP/1.1, HTTP/2, and HTTP/3', 'TCP and UDP', 'Three-way handshake'], ranks: ['http', 'network'],
  controls: [
    { id: 'ver', label: 'HTTP version', type: 'select', value: '1.1', options: [['1.1', 'HTTP/1.1'], ['2', 'HTTP/2'], ['3', 'HTTP/3']] },
    { id: 'n', label: 'Number of files to fetch', type: 'range', min: 6, max: 60, step: 6, value: 30, fmt: function (v) { return v + ' files'; } },
    { id: 'loss', label: 'One packet is lost in transit', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'How does the transfer proceed when you fetch 30 files over HTTP/1.1?', d: 'HTTP/1.1. Six connections fetch six files at a time in five batches, so the requests wait in line four times.', v: { ver: '1.1', n: 30, loss: false } },
    { t: 'Switch to HTTP/2', q: 'What if you change the HTTP version to HTTP/2?', d: 'One connection fetches all 30 files at the same time.', v: { ver: '2', n: 30, loss: false } },
    { t: 'Packet loss with HTTP/2', q: 'What if you switch to HTTP/2 and one packet is lost in transit?', d: 'When one packet disappears, all the files stop together.', v: { ver: '2', n: 30, loss: true } },
    { t: 'Packet loss with HTTP/3', q: 'What if you switch to HTTP/3 and one packet is lost in transit?', d: 'Only the one file that the packet belongs to waits.', v: { ver: '3', n: 30, loss: true } },
    { t: 'HTTP/1.1, 60 files', q: 'What if you stay on HTTP/1.1 and increase the number of files to fetch to 60?', d: 'The more files there are, the more times the requests wait in line.', v: { ver: '1.1', n: 60, loss: false } },
  ],
  code: function (c) {
    return '# application.yml\nserver.http2.enabled: ' + (c.ver === '1.1' ? 'false' : 'true') + '        # HTTP/2 (needs TLS)\n\n# nginx\nserver {\n    listen 443 ssl' + (c.ver === '2' ? ';\n    http2 on' : c.ver === '3' ? ';\n    listen 443 quic;                 # HTTP/3 is QUIC over UDP\n    http2 on' : '') + ';\n    ...\n}\n\n<!-- Files requested by one page: ' + c.n + ' -->';
  },
  label: function (c) { return 'HTTP/' + c.ver + ' · ' + c.n + ' files' + (c.loss ? ' · packet loss' : ''); },
  columns: ['Total time', 'Connections', 'Times waited in line', 'Files stopped by the loss'],
  simulate: function (c) {
    var n = c.n, T = 100, RT = 200, ev = [], sum = [], conns, waves, total, stalled = 0, setup;
    function push(s, k, snap) { ev.push({ s: s, k: k, snap: snap }); }
    if (c.ver === '1.1') {
      conns = 6; waves = Math.ceil(n / 6); setup = 60; total = setup + waves * T + (c.loss ? RT : 0);
      push('In HTTP/1.1, a connection has to receive the whole response to one request before it can send the next request. To go faster, the browser opens up to 6 connections to the same server. Each connection needs its own TCP and TLS handshakes.', '', { done: 0, wave: 0 });
      for (var w = 1; w <= waves; w++) { var cnt = Math.min(6, n - (w - 1) * 6), lossNow = c.loss && w === 1; push('Batch #' + w + ': ' + cnt + (cnt === 1 ? ' connection receives one file.' : ' connections receive one file each.') + (n > w * 6 ? ' The remaining ' + (n - w * 6) + ' wait until a connection is free.' : w > 1 ? ' No files are waiting now.' : '') + (lossNow ? ' A packet is lost on one connection, so the file on that connection, and the files waiting for that connection, are delayed by the retransmission time. The other 5 connections are not affected.' : ''), lossNow ? 'bad' : '', { done: Math.min(n, w * 6), wave: w, loss: lossNow }); }
      stalled = c.loss ? waves : 0;
      sum.push((waves > 1 ? 'The files were received in ' + waves + ' batches over 6 connections.' : 'The files were received in one batch over 6 connections.') + ' The next request can be sent only after the earlier response is finished, so the more files there are, the longer the time spent waiting in line. That is why people used to use workarounds such as combining files into one or spreading them over several domains.');
    } else {
      conns = 1; waves = 1; setup = c.ver === '3' ? 20 : 30;
      push(c.ver === '2' ? 'HTTP/2 creates several independent flows (streams) inside one connection. Requests and responses are split into small pieces, numbered, and sent mixed together, so nothing has to wait for its turn.' : 'HTTP/3 also carries several streams on one connection. The difference is underneath. It uses QUIC, which runs over UDP instead of TCP, and finishes connection setup and the encryption negotiation in one step.', '', { done: 0, wave: 0 });
      push('The requests for the ' + n + ' files are sent all at once. The response pieces arrive mixed together, and the browser puts them back together by stream number. Headers are compressed as well, so a repeated Cookie or User-Agent header is not sent in full every time.', 'good', { done: c.loss ? 0 : n, wave: 1, partial: c.loss });
      if (c.loss) {
        if (c.ver === '2') { stalled = n; push('One packet is lost. The streams of HTTP/2 are independent of each other, but all of them ride on a single TCP connection. TCP does not pass data that arrived after the missing piece to the application until the missing piece arrives again. So the data of all the other ' + (n - 1) + ' files, which have nothing to do with the loss, stops as well.', 'bad', { done: 0, wave: 1, stall: n }); }
        else { stalled = 1; push('One packet is lost. QUIC keeps the order of each stream separately. Only the 1 file that the lost packet belongs to waits for the retransmission, and the other ' + (n - 1) + ' are received as usual.', 'good', { done: n - 1, wave: 1, stall: 1 }); }
        push('The retransmitted packet arrives, and the remaining files are completed too.', '', { done: n, wave: 1 });
      }
      total = setup + T + (c.loss ? RT : 0);
      sum.push(c.ver === '2' ? 'All the files were received at the same time over one connection. The "waiting in line at the request level" of HTTP/1.1 is gone.' : 'All the files were received at the same time over one connection, and the round trips needed to open the connection were reduced too.');
      if (c.loss) sum.push(c.ver === '2' ? 'Because HTTP/2 runs over TCP, losing a single packet makes all the streams of that connection wait together. On mobile networks, where loss is frequent, it can even end up worse than HTTP/1.1 with its 6 connections.' : 'HTTP/3 left TCP for QUIC to solve this problem. The effect of a loss is limited to that one stream. It also has the advantage that the connection can survive a change of network (from Wi-Fi to a cellular network).');
    }
    if (c.loss && c.ver === '3') sum.push('The total time looks similar to HTTP/2 because it is the moment the last file finishes, but the other ' + (n - 1) + ' files had already been received at about ' + (setup + T) + 'ms. In HTTP/2, all ' + n + ' waited until about ' + (30 + T + RT) + 'ms.');
    push('All the files have been received. About ' + total + 'ms in total.', 'good', { done: n, wave: waves, fin: true });
    return { events: ev, summary: sum, row: [total + 'ms', conns + '', (waves - 1) + '', c.loss ? stalled + '' : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { done: 0, wave: 0 };
    H.counters(v, [[s.done + ' / ' + c.n, 'Files received']]);
  },
  // Diagram: draw the connections between the browser and the server as channels. HTTP/1.1 uses six channels with one file each, and HTTP/2 and 3 mix many files on one channel.
  draw: function (P, sim, shown) {
    var c = sim.c, v1 = c.ver === '1.1', last = shown[shown.length - 1], s = last ? last.snap : { done: 0, wave: 0 }, rows = Math.ceil(c.n / 30), flying = s.wave && s.done < c.n;
    P.size(680, 250 + rows * 22 + 24);
    P.box('br', 16, 50, 96, 150, { cls: 'wait', title: 'Browser', center: true });
    P.box('sv', 568, 50, 96, 150, { cls: 'wait', title: 'Server', center: true });
    if (v1) for (var k = 0; k < 6; k++) { var fno = (Math.max(1, s.wave) - 1) * 6 + k + 1, busy = flying && fno <= c.n, lost = s.loss && k === 0 && s.wave === 1; P.box('cn' + k, 128, 44 + k * 27, 424, 23, { cls: lost ? 'bad' : busy ? 'hot' : 'plain', title: 'TCP connection ' + (k + 1), right: lost ? 'Lost: only this connection resends' : busy ? 'Sending file ' + fno : 'Idle' }); }
    else P.box('cn0', 128, 60, 424, 130, { cls: s.stall ? (c.ver === '2' ? 'bad' : 'hot') : flying ? 'hot' : 'plain', title: c.ver === '2' ? '1 TCP connection (several streams inside)' : '1 QUIC connection (over UDP, independent streams)', sub: [flying ? 'Sending ' + c.n + ' files mixed on one connection at once' : s.done ? 'Transfer finished' : 'Idle', s.stall ? (c.ver === '2' ? 'One packet lost, so all the streams behind it stop' : 'Only the stream whose packet was lost stops') : ' '] });
    P.region('files', 16, 214, 648, 36 + rows * 22 + 6, 'Files: ' + c.n);
    for (var i = 0; i < c.n; i++) {
      var cls = i < s.done ? 'good' : 'ghost';
      if (i >= s.done && v1 && s.wave && i < s.wave * 6) cls = 'hot';
      if (i >= s.done && !v1 && s.wave) cls = s.stall && (c.ver === '2' || i === c.n - 1) ? 'bad' : 'hot';
      if (v1 && s.loss && i % 6 === 0 && i < 6) cls = 'bad';
      P.box('f' + i, 28 + (i % 30) * 20.8, 248 + Math.floor(i / 30) * 22, 18, 18, { cls: cls });
    }
    P.note('The boxes in the middle are the connections. The small squares below are the files: green means received, yellow means being received, red means stopped by the loss, and dotted means waiting for its turn.');
  },
  assume: 'This is a model that assumes it takes 100ms to receive one file, 200ms to retransmit a lost packet, and, to set up the connection, 60ms for HTTP/1.1 (the 6 connections at the same time), 30ms for HTTP/2, and 20ms for HTTP/3. The real numbers depend on the network and the file sizes, and the 6 HTTP/1.1 connections that a browser opens to the same server is the default of the major browsers. The characteristics of each version follow the descriptions in the standards (RFC 9112, 9113, 9114). The part about the number of connections was checked in practice. In a real browser (Chromium-based), 18 requests that each take 0.3s were sent at the same time to an HTTP/1.1 server, and they were handled on 6 connections, at most 6 at a time, which took 931ms; with HTTP/2 (the built-in Node implementation), 30 requests were handled at the same time on 1 TCP connection and finished in 324ms. The difference when a packet is lost, and HTTP/3, could not be reproduced on the PC used to write this lab.',
});
