Lab.register({
  id: 'congestion', nav: 'Flow control and congestion control', cat: 'Networking', mode: 'step',
  title: 'How does TCP decide how much to send at a time?',
  intro: 'Even when TCP has a lot of data to send, it does not pour it all out at once. It sends only up to the smaller of two amounts: the amount the receiver can handle (the receive window) and the amount TCP estimates the network can handle (the congestion window). Respecting the first is flow control, and adjusting the second is congestion control. See how the amount sent grows and shrinks over twelve round trips.',
  terms: ['Flow control and congestion control', 'Receive window and congestion window', 'Slow start and congestion avoidance', 'TCP and UDP'],
  controls: [
    { id: 'loss', label: 'What happens on the way', type: 'select', value: 'dup', options: [['none', 'No loss'], ['dup', 'One segment is lost (detected by three duplicate ACKs)'], ['rto', 'Everything sent is lost (detected by a timeout)']] },
    { id: 'at', label: 'Round trip in which the loss happens', type: 'range', min: 3, max: 10, value: 6, step: 1, fmt: function (v) { return '#' + v; }, show: function (c) { return c.loss !== 'none'; } },
    { id: 'ssth', label: 'Initial slow start threshold (ssthresh)', type: 'select', value: '8', options: [['8', '8 segments'], ['16', '16 segments'], ['64', '64 segments (large enough)']] },
    { id: 'rwnd', label: 'Receive window of the receiver', type: 'select', value: '64', options: [['64', '64 segments'], ['12', '12 segments'], ['6', '6 segments (the receiver is slow)']] },
  ],
  fix: function (c) { return c.loss === 'none' && +c.at !== 6 ? { at: 6 } : null; },
  presets: [
    { t: 'Default settings', d: 'The window doubles until it reaches the threshold, then grows by one, and when a loss is detected it is cut in half.', v: { loss: 'dup', at: 6, ssth: '8', rwnd: '64' } },
    { t: 'The same loss, detected by a timeout', d: 'It starts again from 1 segment, not from half.', v: { loss: 'rto', at: 6, ssth: '8', rwnd: '64' } },
    { t: 'With no loss', d: 'It doubles up to the threshold, and after that keeps growing by one.', v: { loss: 'none', at: 6, ssth: '8', rwnd: '64' } },
    { t: 'When the receiver is slow', d: 'Even if the congestion window grows, it sends only up to the receive window of 6 segments.', v: { loss: 'none', at: 6, ssth: '16', rwnd: '6' } },
    { t: 'With a very large threshold', d: 'Slow start keeps doubling until it meets a loss.', v: { loss: 'dup', at: 7, ssth: '64', rwnd: '64' } },
    { t: 'A loss with a receive window of 12 segments', d: 'Half is taken not of the congestion window but of the amount actually sent.', v: { loss: 'dup', at: 8, ssth: '16', rwnd: '12' } },
  ],
  code: function (c) {
    var s = '// The rules of RFC 5681, expressed in units of segments. This is done by TCP in the operating system, not by the program\nlet cwnd = 1;                  // congestion window: the amount the sender estimates the network can handle. It starts at 1 segment\nlet ssthresh = ' + c.ssth + ';' + (String(c.ssth).length < 2 ? ' ' : '') + '             // slow start threshold: grow fast up to here, and carefully beyond it\nlet acked = 0;                 // number of ACKs counted in congestion avoidance\nconst rwnd = ' + c.rwnd + ';' + (String(c.rwnd).length < 2 ? ' ' : '') + '               // receive window: the room the receiver reported in its ACKs\n\nfunction canSend() {           // the amount that can be sent at one time\n  return Math.min(cwnd, rwnd); // the smaller of the two\n}\nfunction onAck() {             // each time one ACK arrives for new data\n  if (cwnd < ssthresh) cwnd += 1;                        // slow start: doubles in one round trip\n  else if (++acked >= cwnd) { acked = 0; cwnd += 1; }    // congestion avoidance: 1 segment per round trip\n}';
    if (c.loss === 'dup') s += '\nfunction onThreeDuplicateAcks(flight) {   // the same ACK three times = one segment was lost\n  ssthresh = Math.max(Math.floor(flight / 2), 2);       // half of the amount sent\n  cwnd = ssthresh;  acked = 0;                           // continue from half\n}';
    if (c.loss === 'rto') s += '\nfunction onTimeout(flight) {              // no ACK before the retransmission timer expired\n  ssthresh = Math.max(Math.floor(flight / 2), 2);       // half of the amount sent\n  cwnd = 1;  acked = 0;                                  // start again from 1 segment (slow start)\n}';
    return s;
  },
  label: function (c) { return (c.loss === 'none' ? 'No loss' : (c.loss === 'dup' ? 'One segment lost' : 'Everything lost (timeout)') + ' in round trip ' + c.at) + ' · ssthresh ' + c.ssth + ' · receive window ' + c.rwnd; },
  columns: ['Amount sent in each round trip', 'Slow start threshold right after the loss', 'Congestion window right after the loss', 'Total sent in 12 round trips', 'Round trips blocked by the receive window'],
  ROUNDS: 12,
  // It is calculated one round trip at a time. It assumes that as many ACKs come back as segments were sent in that round trip, and applies them all at once with a formula.
  rounds: function (c) {
    var loss = c.loss, at = +c.at, rwnd = +c.rwnd, cwnd = 1, ssth = +c.ssth, acked = 0, out = [];
    for (var r = 1; r <= this.ROUNDS; r++) {
      var flight = Math.min(cwnd, rwnd), o = { r: r, cwnd: cwnd, ssth: ssth, rwnd: rwnd, flight: flight, phase: cwnd < ssth ? 'ss' : 'ca', capped: rwnd < cwnd, lost: loss !== 'none' && r === at, need: 0, grew: false };
      if (o.lost) {
        ssth = Math.max(Math.floor(flight / 2), 2); cwnd = loss === 'dup' ? ssth : 1; acked = 0; o.phase = 'loss';
      } else if (cwnd < ssth) {
        var need = ssth - cwnd;
        if (flight <= need) cwnd += flight; else { cwnd = ssth; acked += flight - need; o.need = need; }
        o.grew = true;
      } else {
        acked += flight;
        if (acked >= cwnd) { acked -= cwnd; cwnd += 1; o.grew = true; }
      }
      o.nextCwnd = cwnd; o.nextSsth = ssth; out.push(o);
    }
    return out;
  },
  simulate: function (c) {
    var R = this.rounds(c), ev = [], sum = [], rows = [], st = { rows: rows, cwnd: 1, ssth: +c.ssth }, total = 0, capped = 0, hit = null, firstCap = true, told = {};
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    R.forEach(function (o) {
      total += o.flight; if (o.capped) capped++;
      var head = 'Round trip ' + o.r + ': ' + (o.r === 1 ? 'the congestion window is ' + seg(o.cwnd) + ' and the receive window is ' + seg(o.rwnd) + '. It sends ' + seg(o.flight) + ', the amount of the congestion window, which is the smaller of the two.' : 'the congestion window is ' + seg(o.cwnd) + ' and the receive window is ' + seg(o.rwnd) + (o.cwnd === o.rwnd ? '. The two are the same, so it sends ' : '. The smaller is the ' + (o.capped ? 'receive window, so it sends ' : 'congestion window, so it sends ')) + seg(o.flight) + '.');
      if (o.r === 1) head += ' Right after the connection is established, it does not know how much the network can handle, so it starts from 1 segment.';
      if (o.capped && firstCap) { head += ' Even if the congestion window has room, it does not send more than the receiver can handle. This is flow control.'; firstCap = false; }
      rows.push({ r: o.r, phase: o.phase, cwnd: o.cwnd, rwnd: o.rwnd, flight: o.flight, ssth: o.ssth, capped: o.capped });
      if (o.lost) {
        hit = o; told = {};
        push(head + (c.loss === 'dup' ? ' But the first segment was lost on the way. For every segment that arrives after it, the receiver repeats the same ACK, which says "I am still waiting for the segment before this one."' : ' But the network became so congested that everything that was sent was lost. No ACK comes back, and the retransmission timer expires.'), 'bad');
        st.cwnd = o.nextCwnd; st.ssth = o.nextSsth;
        push(c.loss === 'dup' ? 'Three duplicate ACKs have arrived. The sender does not wait for the timer and sends the lost segment again right away (fast retransmit). It treats the loss as a sign that the network is congested. It lowers the slow start threshold to ' + seg(o.nextSsth) + ', half of the ' + seg(o.flight) + ' it just sent, and it also reduces the congestion window to ' + seg(o.nextCwnd) + '. ACKs are still arriving, so it concludes that the path is not completely blocked and does not lower the window all the way to 1 segment.' : 'A timeout. No ACK came back at all, so it concludes that the network is severely congested. It lowers the slow start threshold to ' + seg(o.nextSsth) + ', half of the ' + seg(o.flight) + ' it just sent, and returns the congestion window to 1 segment, starting over from slow start.', 'hot');
        return;
      }
      var tail;
      if (o.phase === 'ss') tail = (told.ss ? ' Slow start continues. ' : ' The congestion window is smaller than the slow start threshold of ' + seg(o.ssth) + ', so this is slow start. The window grows by 1 segment each time an ACK comes back. ') + (o.need ? 'For the first ' + ack(o.need) + ', the window grows by 1 segment per ACK and reaches the slow start threshold of ' + seg(o.ssth) + ', and from there it moves on to congestion avoidance.' : 'It receives ' + ack(o.flight) + ', and the window becomes ' + seg(o.nextCwnd) + '.' + (o.flight === o.cwnd ? ' That is a doubling in one round trip.' : ' Fewer ACKs came back than the congestion window, so it does not grow all the way to double.'));
      else tail = (told.ca ? ' Congestion avoidance continues. ' : ' The congestion window is at least the slow start threshold of ' + seg(o.ssth) + ', so this is congestion avoidance. Now the window grows by 1 segment only after as many ACKs as the congestion window have arrived. ') + (o.grew ? 'In this round trip it becomes ' + seg(o.nextCwnd) + '.' + (o.capped || told.ca ? '' : ' It grows by 1 segment per round trip, carefully.') : 'Only ' + ack(o.flight) + ' came back in this round trip, so it stays the same for now.');
      st.cwnd = o.nextCwnd; st.ssth = o.nextSsth;
      told[o.phase] = true;
      push(head + tail, o.phase === 'ca' ? 'good' : '');
    });
    var flights = R.map(function (o) { return o.flight; });
    function seg(n) { return n + (n === 1 ? ' segment' : ' segments'); } function ack(n) { return n + (n === 1 ? ' ACK' : ' ACKs'); } sum.push('In twelve round trips, ' + total + ' segments were sent. Amount sent in each round trip: ' + flights.join(', ') + '.');
    if (hit && c.loss === 'dup') sum.push('When the loss is detected by three duplicate ACKs, the slow start threshold and the congestion window are reduced to half of the amount sent (' + seg(hit.nextSsth) + '), and the window grows by one again from there. It grows, and when it meets a loss it is reduced, over and over, so if you draw the amount sent, it forms a sawtooth.');
    if (hit && c.loss === 'rto') sum.push('When the loss is detected by a timeout, the congestion window is returned to 1 segment. It doubles again up to the slow start threshold (' + seg(hit.nextSsth) + '), and after that it grows by one. If the same loss had been detected by three duplicate ACKs, ' + this.rounds({ loss: 'dup', at: c.at, ssth: c.ssth, rwnd: c.rwnd }).reduce(function (a, o) { return a + o.flight; }, 0) + ' segments would have been sent in twelve round trips. The timeout backs off further.');
    if (!hit) sum.push('With no loss, the window climbs quickly to the slow start threshold in slow start, and then keeps growing little by little in congestion avoidance. The sender cannot know the limit of the network in advance, so it finds the limit by growing until a loss happens.');
    if (capped) sum.push('The receive window was smaller than the congestion window in ' + capped + (capped === 1 ? ' round trip' : ' round trips') + '. In those, however large the congestion window was, only as much as the receive window was sent. Flow control protects the receiver and congestion control protects the network in between; they are different mechanisms, and the amount actually sent is decided by the smaller of the two.');
    else sum.push('In this setting, the receive window was always ample, so the congestion window decided the amount sent. If you reduce the receive window to 6 segments, you can see the case in which the receiver is the limit.');
    if (hit && hit.capped) sum.push('The slow start threshold after the loss is not half of the congestion window (' + seg(hit.cwnd) + ') but half of the amount actually sent (' + seg(hit.flight) + '). This is because while the sender was held back by the receive window, it never actually sent as much as the congestion window.');
    return { events: ev, summary: sum, R: R, top: Math.max.apply(null, R.map(function (o) { return o.cwnd; })),
      row: [flights.join(' '), hit ? seg(hit.nextSsth) : 'No loss', hit ? seg(hit.nextCwnd) : 'No loss', seg(total), capped + (capped === 1 ? ' round trip' : ' round trips')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    function seg(n) { return n + (n === 1 ? ' segment' : ' segments'); } if (!s) { H.text(v, 'Click Run to go through one round trip at a time. A segment is one piece of data that TCP sends at a time.'); return; }
    var cur = s.rows[s.rows.length - 1];
    H.counters(v, [[seg(s.cwnd), 'Congestion window (next round trip)'], [seg(s.ssth), 'Slow start threshold'], [seg(cur.rwnd), 'Receive window'], [seg(cur.flight), 'Sent in this round trip']]);
    var name = { ss: 'Slow start', ca: 'Congestion avoidance', loss: 'Loss' };
    H.table(v, ['Round trip', 'Phase', 'Congestion window', 'Receive window', 'Sent', 'Slow start threshold'], s.rows.map(function (r) { return { cells: [String(r.r), { v: name[r.phase], cls: r.phase === 'loss' ? 'bad' : r.phase === 'ca' ? 'good' : '' }, String(r.cwnd), String(r.rwnd), { v: String(r.flight), cls: r.capped ? 'hot' : '' }, String(r.ssth)] }; }), 'Values for each round trip (a yellow cell is an amount blocked by the receive window)');
  },
  // Diagram: a bar chart with the round trip number on the horizontal axis and the number of segments on the vertical axis. A colored bar is the amount sent in that round trip, a dashed bar is the congestion window, and the horizontal lines are the slow start threshold and the receive window.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], cwnd: 1, ssth: +sim.c.ssth }, top = sim.top, base = 252, full = 186, rwnd = +sim.c.rwnd;
    function hOf(x) { return Math.max(3, Math.round(x / top * full)); }
    P.size(680, 284);
    P.text('ya', 16, 24, 'Segments (the top is ' + top + ')', { cls: 'mut' });
    for (var r = 1; r <= 12; r++) P.text('x' + r, 64 + (r - 1) * 52, 272, String(r), { cls: 'mut', anchor: 'middle' });
    P.box('axis', 40, base, 624, 2, { cls: 'plain' });
    if (s.ssth <= top) { P.box('ssl', 40, base - hOf(s.ssth) - 1, 624, 2, { cls: 'hot' }); }
    P.text('sst', 664, 24, 'Slow start threshold ' + s.ssth + (s.ssth > top ? ' (above the chart)' : ' (yellow line)'), { anchor: 'end' });
    if (rwnd <= top) P.box('rwl', 40, base - hOf(rwnd) - 1, 624, 2, { cls: 'wait' });
    P.text('rwt', 664, 44, 'Receive window ' + rwnd + (rwnd > top ? ' (above the chart)' : ' (blue line)'), { cls: 'mut', anchor: 'end' });
    s.rows.forEach(function (o, k) {
      var x = 44 + k * 52, h = hOf(o.flight), cur = k === s.rows.length - 1;
      if (o.capped) P.box('g' + o.r, x, base - hOf(o.cwnd), 40, hOf(o.cwnd), { cls: 'ghost' });
      P.box('b' + o.r, x, base - h, 40, h, { cls: (o.phase === 'loss' ? 'bad' : o.phase === 'ca' ? 'good' : 'wait') + (cur ? ' now' : '') });
      P.text('n' + o.r, x + 20, base - (o.capped ? hOf(o.cwnd) : h) - 5, o.capped ? o.flight + '/' + o.cwnd : String(o.flight), { anchor: 'middle', bold: cur });
    });
    if (!s.rows.length) P.text('hint', 352, 150, 'Click Run to get one bar for each round trip', { cls: 'mut', anchor: 'middle' });
    P.note('Each bar is the amount sent in one round trip. A blue bar is slow start, a green bar is congestion avoidance, and a red bar is the round trip in which the loss happened. A dashed bar is the part of the congestion window that could not be used because of the receive window, and the number then is "sent/congestion window."');
  },
  assume: 'This is a model of the concept that follows the rules of RFC 5681, not the result of running a real TCP. The congestion window inside an operating system cannot be inspected or controlled from a program, so it could not be checked against execution. Instead, the numbers of the model were checked in 153 settings against a separate calculation that applies the same rules one ACK at a time (the model calculates with formulas in units of round trips). The rules that were reproduced are: the amount that can be sent is the smaller of the two windows (RFC 5681 section 3.1); equation (2) for slow start and the recommended method for congestion avoidance (section 3.1); equation (4), which gives the slow start threshold after a loss (section 3.1); 1 segment after a timeout (section 3.1); and the value at the end of fast recovery after three duplicate ACKs (section 3.2). Simplifications: sizes are counted in segments, not in bytes, and halves are rounded down. The initial congestion window is set to 1 segment (the standard allows an upper limit of 2 to 4 segments, and recent operating systems sometimes use 10 segments, RFC 6928). It assumes that one ACK arrives for every segment (in practice, one ACK is sometimes sent for every two segments), it assumes that the receive window does not change (in practice, it changes with every ACK according to how fast the receiving program reads), and it omits the temporary inflation of the window during fast recovery. Setting the initial slow start threshold large enough is the recommendation of the standard, and 8 and 16 are values chosen to make the changes visible. While the sender was blocked by the receive window, the model still grew the congestion window by the formula, but real implementations sometimes do not grow it while they are not using all of it (RFC 7661 sets this rule for the case in which the application has little to send and does not use the whole congestion window). The default algorithm of Linux and Windows is CUBIC (RFC 9438), so its growth curve and its reduction ratio differ from this model.',
});
